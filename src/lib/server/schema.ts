import {
	pgTable,
	uuid,
	text,
	integer,
	numeric,
	boolean,
	timestamp,
	jsonb,
	date
} from 'drizzle-orm/pg-core';

// ─── Users (Wallet-based) ────────────────────────────────────────────────────

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	walletAddress: text('wallet_address').unique().notNull(), // primary identity
	chainType: text('chain_type').notNull(), // 'evm' | 'solana'
	username: text('username').unique().notNull(), // auto-generated, user can update
	xpTotal: integer('xp_total').default(0),
	paperXpTotal: integer('paper_xp_total').default(0), // practice-mode XP, tracked separately from real XP
	streak: integer('streak').default(0),
	matchmakingStatus: text('matchmaking_status').default('idle'), // 'idle' | 'queued' | 'in_contest'
	activeBoosts: jsonb('active_boosts').default('[]'), // [{ sector, expiresAt }]
	createdAt: timestamp('created_at').defaultNow(),
	// Learning/visiting streak — separate from `streak` above (which is
	// win-only, see F-08). Increments once per day on a research-article read
	// or a Term of the Day attempt, whichever comes first that day.
	researchStreak: integer('research_streak').default(0),
	lastResearchDate: date('last_research_date'),
	// AI Draft Agent (G-06) / Free Hit (X-11) — waiver mechanic only; nothing
	// grants one yet, X-11's earn-path is still an open, separate question.
	freeHitsAvailable: integer('free_hits_available').default(0)
});

// ─── Contests ─────────────────────────────────────────────────────────────────
// One contest = one head-to-head match between two users
// user_a = the human, user_b = bot (Wave 1) or real opponent (Wave 2)

export const contests = pgTable('contests', {
	id: uuid('id').primaryKey().defaultRandom(),
	userAId: uuid('user_a_id').references(() => users.id),
	userBId: uuid('user_b_id').references(() => users.id),
	type: text('type').default('daily'), // 'daily' | 'weekly'
	status: text('status').default('open'), // 'open' | 'live' | 'resolved'
	isPaper: boolean('is_paper').default(false), // practice mode — bot-only, no real XP/streak/badges/league impact
	startAt: timestamp('start_at'),
	endAt: timestamp('end_at'),
	winnerId: uuid('winner_id').references(() => users.id)
});

// ─── Lineups ──────────────────────────────────────────────────────────────────
// Each contest has two lineups — one per player

export const lineups = pgTable('lineups', {
	id: uuid('id').primaryKey().defaultRandom(),
	contestId: uuid('contest_id').references(() => contests.id),
	lobbyId: uuid('lobby_id').references(() => lobbies.id), // exactly one of contestId/lobbyId is set
	userId: uuid('user_id').references(() => users.id),
	locked: boolean('locked').default(false),
	finalScore: numeric('final_score').default('0'),
	breakdown: text('breakdown') // pre-generated AI text (for seeded contests)
});

// ─── Lineup Picks ─────────────────────────────────────────────────────────────
// 5 rows per lineup — one per draft slot

export const lineupPicks = pgTable('lineup_picks', {
	id: uuid('id').primaryKey().defaultRandom(),
	lineupId: uuid('lineup_id').references(() => lineups.id),
	tokenSymbol: text('token_symbol').notNull(), // 'SOL', 'PEPE'
	tokenName: text('token_name').notNull(), // 'Solana', 'Pepe'
	sector: text('sector').notNull(), // 'L1' | 'L2' | 'Meme' | 'DeFi' | 'Wildcard'
	currencyId: text('currency_id').notNull(), // SoSoValue currency_id (string of long int)
	entryPrice: numeric('entry_price'), // price at lineup lock time
	exitPrice: numeric('exit_price'), // price at contest resolution
	pctChange: numeric('pct_change'), // ((exit - entry) / entry) * 100
	score: numeric('score').default('0') // weighted score for this pick
});

// ─── Lobbies ──────────────────────────────────────────────────────────────────
// A lobby is a multiplayer (3+) contest, parallel to the 2-player `contests`
// table above rather than a generalization of it — see plan doc for why.

export const lobbies = pgTable('lobbies', {
	id: uuid('id').primaryKey().defaultRandom(),
	createdBy: uuid('created_by').references(() => users.id),
	contestType: text('contest_type').default('daily'), // 'daily' | 'weekly'
	format: text('format').notNull(), // 'fixed' | 'open'
	size: integer('size'), // required for 'fixed', optional cap for 'open'
	status: text('status').default('waiting'), // 'waiting' | 'drafting' | 'live' | 'resolved'
	startAt: timestamp('start_at'),
	endAt: timestamp('end_at'),
	winnerId: uuid('winner_id').references(() => users.id), // 1st place
	createdAt: timestamp('created_at').defaultNow(),
	// Set when this lobby is one bracket stage of a Tournament rather than a
	// standalone lobby — null for every ordinary lobby.
	tournamentId: uuid('tournament_id').references(() => tournaments.id),
	tournamentStage: integer('tournament_stage') // 0 = qualifier group, 1 = final
});

// ─── Tournaments ──────────────────────────────────────────────────────────────
// The umbrella over a bracket of lobbies (see tournamentId/tournamentStage
// above). Public + free-to-play only for now — private/sponsor access and
// real-money funding share the same escrow mechanic Wager Mode is blocked
// on, deliberately not built here yet (see mode5-tournament-checklist.md).

export const tournaments = pgTable('tournaments', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	createdBy: uuid('created_by').references(() => users.id),
	contestType: text('contest_type').default('daily'), // 'daily' | 'weekly'
	accessType: text('access_type').default('public'), // 'public' only, for now
	fundingMode: text('funding_mode').default('free'), // 'free' only, for now
	payoutStructure: text('payout_structure').default('winner_take_all'), // 'winner_take_all' | 'top3_weighted'
	sectorRestriction: text('sector_restriction'), // 'l1'|'l2'|'defi'|'meme'|'wildcard', null = unrestricted
	groupSize: integer('group_size').default(4), // min participants per qualifier group
	status: text('status').default('open'), // 'open' | 'active' | 'resolved'
	createdAt: timestamp('created_at').defaultNow()
});

// ─── Lobby Participants ───────────────────────────────────────────────────────

export const lobbyParticipants = pgTable('lobby_participants', {
	id: uuid('id').primaryKey().defaultRandom(),
	lobbyId: uuid('lobby_id').references(() => lobbies.id),
	userId: uuid('user_id').references(() => users.id),
	rank: integer('rank'), // set at resolution: 1 = winner, 2 = 2nd, etc.
	xpEarned: integer('xp_earned'),
	joinedAt: timestamp('joined_at').defaultNow()
});

// ─── Lobby Queue ──────────────────────────────────────────────────────────────
// Fixed-size auto-match queue, mirrors matchmakingQueue's shape

export const lobbyQueue = pgTable('lobby_queue', {
	userId: uuid('user_id')
		.primaryKey()
		.references(() => users.id),
	size: integer('size').notNull(),
	contestType: text('contest_type').notNull(),
	queuedAt: timestamp('queued_at').defaultNow().notNull()
});

// ─── Leagues ──────────────────────────────────────────────────────────────────

export const leagues = pgTable('leagues', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	type: text('type').notNull(), // 'public' | 'private'
	inviteCode: text('invite_code').unique(),
	createdBy: uuid('created_by').references(() => users.id),
	seasonStart: timestamp('season_start'),
	seasonEnd: timestamp('season_end'),
	createdAt: timestamp('created_at').defaultNow()
});

// ─── League Members ───────────────────────────────────────────────────────────

export const leagueMembers = pgTable('league_members', {
	id: uuid('id').primaryKey().defaultRandom(),
	leagueId: uuid('league_id').references(() => leagues.id),
	userId: uuid('user_id').references(() => users.id),
	wins: integer('wins').default(0),
	losses: integer('losses').default(0),
	points: integer('points').default(0),
	joinedAt: timestamp('joined_at').defaultNow()
});

// ─── Gauntlet Questions ───────────────────────────────────────────────────────

export const gauntletQuestions = pgTable('gauntlet_questions', {
	id: uuid('id').primaryKey().defaultRandom(),
	question: text('question').notNull(),
	options: jsonb('options').notNull(), // [{ label, value }]
	correctAnswer: text('correct_answer').notNull(),
	sector: text('sector'), // which sector this relates to
	currencyId: text('currency_id'), // SoSoValue currency_id if token-specific
	xpReward: integer('xp_reward').default(50),
	boostSector: text('boost_sector'), // which draft slot gets boosted on correct answer
	activeDate: date('active_date').notNull(),
	createdAt: timestamp('created_at').defaultNow()
});

// ─── Gauntlet Attempts ────────────────────────────────────────────────────────

export const gauntletAttempts = pgTable('gauntlet_attempts', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').references(() => users.id),
	questionId: uuid('question_id').references(() => gauntletQuestions.id),
	answer: text('answer').notNull(),
	correct: boolean('correct').notNull(),
	xpEarned: integer('xp_earned').default(0),
	attemptedAt: timestamp('attempted_at').defaultNow()
});

// ─── Daily Terms (Term of the Day, G-10) ───────────────────────────────────────
// A separate daily ritual from the Gauntlet — a vocabulary term + a quick
// multiple-choice check, not a market question. Mirrors gauntletQuestions'
// shape deliberately, same self-seeding pattern.

export const dailyTerms = pgTable('daily_terms', {
	id: uuid('id').primaryKey().defaultRandom(),
	term: text('term').notNull(), // e.g. "TVL"
	definition: text('definition').notNull(), // shown alongside the term
	quizOptions: jsonb('quiz_options').notNull(), // [{ label, value }]
	correctOption: text('correct_option').notNull(),
	xpReward: integer('xp_reward').default(20),
	activeDate: date('active_date').notNull(),
	createdAt: timestamp('created_at').defaultNow()
});

// ─── Term Attempts ──────────────────────────────────────────────────────────

export const termAttempts = pgTable('term_attempts', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').references(() => users.id),
	termId: uuid('term_id').references(() => dailyTerms.id),
	answer: text('answer').notNull(),
	correct: boolean('correct').notNull(),
	xpEarned: integer('xp_earned').default(0),
	attemptedAt: timestamp('attempted_at').defaultNow()
});

// ─── Matchmaking Queue ────────────────────────────────────────────────────────
// Backed by Postgres (not in-memory) so it survives serverless cold starts

export const matchmakingQueue = pgTable('matchmaking_queue', {
	userId: uuid('user_id')
		.primaryKey()
		.references(() => users.id),
	contestType: text('contest_type').notNull(),
	queuedAt: timestamp('queued_at').defaultNow().notNull()
});

// ─── User Badges ──────────────────────────────────────────────────────────────
// badgeCode references the static catalog in $lib/badges.ts

export const userBadges = pgTable('user_badges', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').references(() => users.id),
	badgeCode: text('badge_code').notNull(),
	earnedAt: timestamp('earned_at').defaultNow()
});

// ─── Research Reads ───────────────────────────────────────────────────────────
// One boost-earning read per user per day (articleId is SoSoValue's news id)

export const researchReads = pgTable('research_reads', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').references(() => users.id),
	articleId: text('article_id').notNull(),
	sector: text('sector').notNull(),
	xpEarned: integer('xp_earned').default(0),
	readDate: date('read_date').notNull(),
	readAt: timestamp('read_at').defaultNow()
});
