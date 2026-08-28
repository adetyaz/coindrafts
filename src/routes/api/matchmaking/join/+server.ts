import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users, contests } from '$lib/server/schema';
import { eq, and, or } from 'drizzle-orm';
import { parseSessionToken } from '$lib/server/auth';

import { findOpponent, enqueue } from '$lib/server/matchmaking';

export async function POST({ request, cookies }) {
	const token = cookies.get('session');
	const parsed = token ? parseSessionToken(token) : null;
	if (!parsed) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const contestType = body.type === 'weekly' ? 'weekly' : 'daily';

	// Check if user already in a live contest of this type
	const existing = await db
		.select()
		.from(contests)
		.where(
			and(
				eq(contests.status, 'live'),
				eq(contests.type, contestType),
				or(eq(contests.userAId, parsed.userId), eq(contests.userBId, parsed.userId)),
				eq(contests.isPaper, false)
			)
		)
		.then((rows) => rows[0] ?? null);

	if (existing) {
		return json({
			status: 'matched',
			contestId: existing.id,
			opponentId: existing.userAId === parsed.userId ? existing.userBId : existing.userAId
		});
	}

	// Try to find an opponent in the queue
	const opponentId = await findOpponent(parsed.userId, contestType);

	if (opponentId) {
		const [newContest] = await db
			.insert(contests)
			.values({
				userAId: parsed.userId,
				userBId: opponentId,
				type: contestType,
				status: 'open'
			})
			.returning();

		await db
			.update(users)
			.set({ matchmakingStatus: 'in_contest' })
			.where(eq(users.id, parsed.userId));
		await db.update(users).set({ matchmakingStatus: 'in_contest' }).where(eq(users.id, opponentId));

		return json({ status: 'matched', contestId: newContest.id, opponentId });
	}

	await enqueue(parsed.userId, contestType);
	await db.update(users).set({ matchmakingStatus: 'queued' }).where(eq(users.id, parsed.userId));

	return json({ status: 'waiting', message: 'Looking for an opponent...' });
}
