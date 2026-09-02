import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lobbies, lobbyParticipants, lineups, tournaments } from '$lib/server/schema';
import { and, eq, ne } from 'drizzle-orm';
import { parseSessionToken } from '$lib/server/auth';

// GET /api/lobby/mine — active (not resolved) lobbies I'm in, multiplayer
// or a tournament bracket stage. Same purpose as /api/contests already
// serves for 1v1/wager matches: without this there is no way to find your
// way back to an in-progress lobby once you've navigated away.
export async function GET({ cookies }) {
	const token = cookies.get('session');
	const parsed = token ? parseSessionToken(token) : null;
	if (!parsed) return json([]);

	const rows = await db
		.select({
			id: lobbies.id,
			status: lobbies.status,
			contestType: lobbies.contestType,
			tournamentId: lobbies.tournamentId,
			tournamentStage: lobbies.tournamentStage,
			tournamentName: tournaments.name
		})
		.from(lobbyParticipants)
		.innerJoin(lobbies, eq(lobbies.id, lobbyParticipants.lobbyId))
		.leftJoin(tournaments, eq(tournaments.id, lobbies.tournamentId))
		.where(and(eq(lobbyParticipants.userId, parsed.userId), ne(lobbies.status, 'resolved')));

	const myLockedLineups = await db
		.select({ lobbyId: lineups.lobbyId })
		.from(lineups)
		.where(and(eq(lineups.userId, parsed.userId), eq(lineups.locked, true)));
	const lockedLobbyIds = new Set(myLockedLineups.map((l) => l.lobbyId));

	return json(rows.map((r) => ({ ...r, myLineupLocked: lockedLobbyIds.has(r.id) })));
}
