import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { dailyTerms, termAttempts, users } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { parseSessionToken } from '$lib/server/auth';
import { bumpResearchStreak } from '$lib/server/term-of-day';

export async function POST({ request, cookies }) {
	const token = cookies.get('session');
	const parsed = token ? parseSessionToken(token) : null;
	if (!parsed) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const { termId, answer } = body;
	if (!termId || !answer) return json({ error: 'termId and answer required' }, { status: 400 });

	const dailyTerm = await db
		.select()
		.from(dailyTerms)
		.where(eq(dailyTerms.id, termId))
		.limit(1)
		.then((rows) => rows[0] ?? null);
	if (!dailyTerm) return json({ error: 'Term not found' }, { status: 404 });

	const existing = await db
		.select()
		.from(termAttempts)
		.where(and(eq(termAttempts.userId, parsed.userId), eq(termAttempts.termId, termId)))
		.limit(1)
		.then((rows) => rows[0] ?? null);
	if (existing) return json({ error: 'Already answered' }, { status: 409 });

	const correct = answer === dailyTerm.correctOption;
	const xpEarned = correct ? (dailyTerm.xpReward ?? 0) : 0;

	await db.insert(termAttempts).values({ userId: parsed.userId, termId, answer, correct, xpEarned });

	if (xpEarned > 0) {
		const user = await db
			.select()
			.from(users)
			.where(eq(users.id, parsed.userId))
			.limit(1)
			.then((rows) => rows[0] ?? null);
		if (user) {
			await db
				.update(users)
				.set({ xpTotal: (user.xpTotal ?? 0) + xpEarned })
				.where(eq(users.id, parsed.userId));
		}
	}

	// Attempting counts toward the research streak regardless of correctness —
	// this is an engagement/retention streak, not a knowledge-mastery one.
	await bumpResearchStreak(parsed.userId);

	return json({ correct, xpEarned, correctOption: dailyTerm.correctOption });
}
