// Matchmaking queue — backed by Postgres so it survives serverless cold starts
import { db } from '$lib/server/db';
import { matchmakingQueue } from '$lib/server/schema';
import { eq, and, lt, ne } from 'drizzle-orm';

const QUEUE_TIMEOUT_MS = 30_000; // drop stale queue entries so an abandoned search never gets matched

export async function findOpponent(userId: string, contestType: string) {
	const cutoff = new Date(Date.now() - QUEUE_TIMEOUT_MS);

	// Drop stale entries so they don't get matched
	await db.delete(matchmakingQueue).where(lt(matchmakingQueue.queuedAt, cutoff));

	const candidate = await db
		.select()
		.from(matchmakingQueue)
		.where(and(eq(matchmakingQueue.contestType, contestType), ne(matchmakingQueue.userId, userId)))
		.limit(1)
		.then((rows) => rows[0] ?? null);

	if (!candidate) return null;

	const deleted = await db
		.delete(matchmakingQueue)
		.where(eq(matchmakingQueue.userId, candidate.userId))
		.returning();

	// Someone else grabbed this candidate between our select and delete
	if (deleted.length === 0) return null;

	return candidate.userId;
}

export async function enqueue(userId: string, contestType: string) {
	await db
		.insert(matchmakingQueue)
		.values({ userId, contestType, queuedAt: new Date() })
		.onConflictDoUpdate({
			target: matchmakingQueue.userId,
			set: { contestType, queuedAt: new Date() }
		});
}

export async function dequeue(userId: string) {
	await db.delete(matchmakingQueue).where(eq(matchmakingQueue.userId, userId));
}
