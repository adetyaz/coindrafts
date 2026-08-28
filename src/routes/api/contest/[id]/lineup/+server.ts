import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { contests, lineups, lineupPicks } from '$lib/server/schema';
import { parseSessionToken } from '$lib/server/auth';
import { getSnapshot, extractPrice } from '$lib/server/sosovalue';
import { pickScrimmageBot, draftBotLineup } from '$lib/server/botDraft';

export async function POST({ params, request, cookies }) {
	const token = cookies.get('session');
	const parsed = token ? parseSessionToken(token) : null;
	if (!parsed) return json({ error: 'Unauthorized' }, { status: 401 });

	const contestId = params.id;
	if (!contestId) return json({ error: 'Contest id is required' }, { status: 400 });

	const body = await request.json();
	const picks = Array.isArray(body?.picks) ? body.picks : [];
	if (picks.length !== 5) {
		return json({ error: 'Exactly 5 picks are required' }, { status: 400 });
	}

	const existingContest = await db
		.select()
		.from(contests)
		.where(eq(contests.id, contestId))
		.limit(1)
		.then((rows) => rows[0] ?? null);

	if (!existingContest) return json({ error: 'Contest not found' }, { status: 404 });
	if (existingContest.userAId !== parsed.userId && existingContest.userBId !== parsed.userId) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const existingLineup = await db
		.select()
		.from(lineups)
		.where(and(eq(lineups.contestId, contestId), eq(lineups.userId, parsed.userId)))
		.limit(1)
		.then((rows) => rows[0] ?? null);

	let lineupId = existingLineup?.id;
	if (!lineupId) {
		const inserted = await db
			.insert(lineups)
			.values({
				contestId,
				userId: parsed.userId,
				locked: true,
				finalScore: '0'
			})
			.returning({ id: lineups.id });
		lineupId = inserted[0].id;
	} else {
		await db.update(lineups).set({ locked: true }).where(eq(lineups.id, lineupId));
		await db.delete(lineupPicks).where(eq(lineupPicks.lineupId, lineupId));
	}

	// Fetch all snapshots in parallel to avoid sequential rate-limit hammering
	const snapshots = await Promise.all(
		picks.map((p: { currencyId: unknown }) => getSnapshot(String(p.currencyId)).catch(() => null))
	);

	for (let i = 0; i < picks.length; i++) {
		const pick = picks[i];
		const entryPrice = extractPrice(snapshots[i]);
		await db.insert(lineupPicks).values({
			lineupId,
			tokenSymbol: String(pick.symbol ?? '').toUpperCase(),
			tokenName: String(pick.name ?? pick.symbol ?? ''),
			sector: String(pick.sector ?? 'wildcard'),
			currencyId: String(pick.currencyId),
			entryPrice: String(entryPrice),
			exitPrice: String(entryPrice),
			pctChange: '0',
			score: '0'
		});
	}

	// Only set contest live when userA (the creator) submits
	// userB submits into an already-live contest
	if (existingContest.userAId === parsed.userId) {
		const windowDays = existingContest.type === 'weekly' ? 7 : 1;
		const startAt = new Date();
		const endAt = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000);

		// Scrimmage contests are created directly (never via matchmaking_queue),
		// so bots-service never sees them. Assign a real bot opponent right
		// here — same moment the human's entry prices are captured, so both
		// sides reflect the same market moment. A failure here shouldn't block
		// the human's own submission; the existing synthetic-score fallback at
		// resolution time still covers it if this doesn't complete.
		if (existingContest.isPaper && !existingContest.userBId) {
			try {
				const bot = pickScrimmageBot();
				const botPicks = await draftBotLineup();
				const [botLineup] = await db
					.insert(lineups)
					.values({ contestId, userId: bot.id, locked: true, finalScore: '0' })
					.returning({ id: lineups.id });

				const botSnapshots = await Promise.all(
					botPicks.map((p) => getSnapshot(p.currencyId).catch(() => null))
				);
				for (let i = 0; i < botPicks.length; i++) {
					const entryPrice = extractPrice(botSnapshots[i]);
					await db.insert(lineupPicks).values({
						lineupId: botLineup.id,
						tokenSymbol: botPicks[i].symbol.toUpperCase(),
						tokenName: botPicks[i].name,
						sector: botPicks[i].sector,
						currencyId: botPicks[i].currencyId,
						entryPrice: String(entryPrice),
						exitPrice: String(entryPrice),
						pctChange: '0',
						score: '0'
					});
				}

				await db.update(contests).set({ userBId: bot.id }).where(eq(contests.id, contestId));
			} catch (e) {
				console.error('[contest/lineup] Scrimmage bot draft failed, falling back to synthetic score:', e);
			}
		}

		await db
			.update(contests)
			.set({ status: 'live', startAt, endAt })
			.where(eq(contests.id, contestId));
	}

	return json({ ok: true, contestId, lineupId });
}
