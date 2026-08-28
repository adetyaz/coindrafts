import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { parseSessionToken } from '$lib/server/auth';
import { pickForSectors } from '$lib/server/draftAgent';

const XP_COST_PER_SLOT = 15;

export async function POST({ request, cookies }) {
	const token = cookies.get('session');
	const parsed = token ? parseSessionToken(token) : null;
	if (!parsed) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const sectors = Array.isArray(body?.sectors) ? body.sectors.filter((s: unknown) => typeof s === 'string') : [];
	if (sectors.length === 0 || sectors.length > 5) {
		return json({ error: '1-5 sectors required' }, { status: 400 });
	}
	// Scrimmage contests carry no real stakes by design (H-03/G-01) — the
	// agent's XP toll would contradict that if it hit real xpTotal here.
	const isPaper = body?.isPaper === true;

	const user = await db
		.select()
		.from(users)
		.where(eq(users.id, parsed.userId))
		.limit(1)
		.then((rows) => rows[0] ?? null);
	if (!user) return json({ error: 'User not found' }, { status: 404 });

	let picks;
	try {
		picks = await pickForSectors(sectors);
	} catch (e) {
		console.error('[/api/draft/agent-pick]', e);
		return json({ error: 'Draft agent unavailable' }, { status: 502 });
	}

	const freeHitUsed = !isPaper && (user.freeHitsAvailable ?? 0) > 0;
	const xpCharged = isPaper || freeHitUsed ? 0 : XP_COST_PER_SLOT * sectors.length;

	if (xpCharged > 0 || freeHitUsed) {
		await db
			.update(users)
			.set({
				xpTotal: Math.max(0, (user.xpTotal ?? 0) - xpCharged),
				freeHitsAvailable: freeHitUsed ? (user.freeHitsAvailable ?? 0) - 1 : user.freeHitsAvailable
			})
			.where(eq(users.id, parsed.userId));
	}

	return json({ picks, xpCharged, freeHitUsed, isPaper });
}
