import { db } from '$lib/server/db';
import { dailyTerms, users } from '$lib/server/schema';
import { eq, sql } from 'drizzle-orm';

// Seeded term bank — a vocabulary term + definition, paired with a quick
// multiple-choice check. Deliberately not live-data-derived (unlike Gauntlet's
// market questions): a vocabulary term doesn't change day to day, so there's
// no need for an LLM call or a fresh-data dependency here.
const TERM_BANK: {
	term: string;
	definition: string;
	distractors: string[];
	xpReward: number;
}[] = [
	{
		term: 'TVL',
		definition: 'Total Value Locked — the total value of assets deposited in a protocol.',
		distractors: [
			'Total Volume Leveraged — the sum of all leveraged positions open on an exchange.',
			'Token Vesting Ledger — a record of when locked team tokens unlock.',
			'Transaction Verification Latency — how long a network takes to confirm a transaction.'
		],
		xpReward: 20
	},
	{
		term: 'Blockchain',
		definition: 'A distributed, append-only ledger replicated across many computers.',
		distractors: [
			'A single company\'s private database for tracking crypto balances.',
			'A type of cryptocurrency wallet that stores private keys offline.',
			'The exchange where crypto assets are bought and sold.'
		],
		xpReward: 20
	},
	{
		term: 'Slippage',
		definition: 'The difference between a trade\'s expected price and its actual executed price.',
		distractors: [
			'The fee an exchange charges for executing a trade.',
			'The delay between placing an order and it appearing on-chain.',
			'The percentage of a token supply held by its top 10 wallets.'
		],
		xpReward: 20
	},
	{
		term: 'Market cap',
		definition: 'Circulating supply multiplied by the current price of a token.',
		distractors: [
			'The maximum number of tokens that will ever exist.',
			'The total dollar volume traded across all exchanges in 24 hours.',
			'The highest price a token has ever reached.'
		],
		xpReward: 20
	},
	{
		term: 'Gas fee',
		definition: 'The cost paid to have a transaction processed and included on a blockchain.',
		distractors: [
			'A recurring subscription fee charged by a crypto exchange.',
			'The spread between a token\'s buy and sell price.',
			'A penalty charged for withdrawing staked tokens early.'
		],
		xpReward: 20
	},
	{
		term: 'Liquidity pool',
		definition: 'A pool of tokens locked in a smart contract that other users trade against.',
		distractors: [
			'A wallet that holds a project\'s unsold token supply.',
			'A list of an exchange\'s most-traded pairs.',
			'A fund that insures depositors against a protocol hack.'
		],
		xpReward: 20
	},
	{
		term: 'Staking',
		definition: 'Locking up tokens to help secure or operate a network in exchange for rewards.',
		distractors: [
			'Buying a token and immediately selling it for a quick profit.',
			'Borrowing tokens against collateral you already hold.',
			'Voting on a governance proposal with your token balance.'
		],
		xpReward: 20
	},
	{
		term: 'DEX',
		definition: 'Decentralized Exchange — a trading venue with no central custodian, run by smart contracts.',
		distractors: [
			'A type of hardware wallet used to store private keys offline.',
			'An index that tracks the average price of the top 10 tokens.',
			'A protocol that lets you borrow against your crypto holdings.'
		],
		xpReward: 20
	},
	{
		term: 'Volatility',
		definition: 'How much and how quickly a token\'s price moves over a given period.',
		distractors: [
			'The number of holders a token has.',
			'The percentage of a token\'s supply that is currently staked.',
			'How often a blockchain\'s validators change.'
		],
		xpReward: 20
	},
	{
		term: 'Wallet',
		definition: 'Software or hardware that stores the private keys controlling your on-chain assets.',
		distractors: [
			'An account held directly with a crypto exchange.',
			'A smart contract that automatically rebalances a portfolio.',
			'A ledger of every transaction a blockchain has ever processed.'
		],
		xpReward: 20
	}
];

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

// Deterministic per-day pick, same approach as gauntlet.ts's pickForDate —
// every instance seeds the same term for a given date.
function pickForDate(dateStr: string) {
	let hash = 0;
	for (let i = 0; i < dateStr.length; i++) {
		hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
	}
	return TERM_BANK[hash % TERM_BANK.length];
}

/** Ensures today's term exists. Safe to call repeatedly (idempotent per day). */
export async function ensureTodayTermSeeded(today = new Date().toISOString().split('T')[0]) {
	const existing = await db
		.select()
		.from(dailyTerms)
		.where(eq(dailyTerms.activeDate, sql`${today}::date`))
		.limit(1);

	if (existing.length > 0) return existing[0];

	const t = pickForDate(today);
	const options = shuffle([
		{ label: t.definition, value: t.definition },
		...t.distractors.map((d) => ({ label: d, value: d }))
	]);

	const [inserted] = await db
		.insert(dailyTerms)
		.values({
			term: t.term,
			definition: t.definition,
			quizOptions: JSON.stringify(options),
			correctOption: t.definition,
			xpReward: t.xpReward,
			activeDate: sql`${today}::date`
		})
		.returning();

	return inserted;
}

/**
 * Shared by Term of the Day and Research Hub reads — a single "research
 * streak" tracked across both engagement paths (G-10's design), separate
 * from the win-only `users.streak` (F-08). Counts once per calendar day
 * regardless of which of the two the user did first that day.
 */
export async function bumpResearchStreak(userId: string) {
	const today = new Date().toISOString().split('T')[0];
	const user = await db
		.select()
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)
		.then((rows) => rows[0] ?? null);
	if (!user) return;

	const last = user.lastResearchDate ? String(user.lastResearchDate).slice(0, 10) : null;
	if (last === today) return; // already counted today

	const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
	const continuing = last === yesterday;

	await db
		.update(users)
		.set({
			researchStreak: continuing ? (user.researchStreak ?? 0) + 1 : 1,
			lastResearchDate: sql`${today}::date`
		})
		.where(eq(users.id, userId));
}
