// AI Draft Agent (G-06) pick logic. The LLM never names a token freely — it
// chooses from the real, live candidate list per sector (same classifySector
// bucketing botDraft.ts uses for bots), and the answer is validated against
// that list. An invalid/unparseable response falls back to the best 24h
// performer in-sector, so a bad model response degrades gracefully instead
// of ever returning a token that doesn't actually exist in the live pool.
import { classifySector } from '$lib/sectors';
import { getTokensWithPrices, type TokenWithPrice } from '$lib/server/sosovalue';
import {
	createChatCompletion,
	extractTrace,
	activeBackend,
	type ComputeTrace
} from '$lib/server/aiCompute';

export type AgentPick = { sector: string; symbol: string; name: string; currencyId: string };

/** Picks plus the inference receipt that produced them (see ComputeTrace). */
export type AgentResult = { picks: AgentPick[]; trace: ComputeTrace | null };

function bestPerformer(tokens: TokenWithPrice[]): TokenWithPrice | undefined {
	if (tokens.length === 0) return undefined;
	return tokens.reduce((a, b) => ((a.change24h ?? -Infinity) >= (b.change24h ?? -Infinity) ? a : b));
}

/** Picks one token per requested sector, reasoning over live data via 0G Compute/Groq. */
export async function pickForSectors(sectors: string[]): Promise<AgentResult> {
	const tokens = await getTokensWithPrices();
	const priced = tokens.filter((t) => t.symbol && t.price != null);
	const bySector = new Map<string, TokenWithPrice[]>();
	for (const t of priced) {
		const s = classifySector([t.symbol as string]);
		if (!bySector.has(s)) bySector.set(s, []);
		bySector.get(s)!.push(t);
	}

	const wanted = sectors.filter((s, i) => sectors.indexOf(s) === i);
	const candidatesBySector = new Map<string, TokenWithPrice[]>();
	for (const sector of wanted) {
		const pool = bySector.get(sector);
		candidatesBySector.set(sector, pool && pool.length > 0 ? pool : priced);
	}

	const { chosen, trace } = await askAgent(candidatesBySector);

	// Resolved sequentially with a shared `used` set — multiple slots often
	// share the same fallback candidate pool (when a sector's own bucket is
	// empty in the live snapshot), and nothing stops the model from picking
	// the same "best" token for more than one of them without this. Found
	// live: 4 of 5 slots came back as the same token before this existed.
	const used = new Set<string>();
	const picks: AgentPick[] = [];
	for (const sector of wanted) {
		const candidates = candidatesBySector.get(sector)!;
		const pickedSymbol = chosen.get(sector);
		const match =
			pickedSymbol && !used.has(pickedSymbol.toUpperCase())
				? candidates.find((t) => (t.symbol ?? '').toUpperCase() === pickedSymbol.toUpperCase())
				: null;
		const fallbackPool = candidates.filter((t) => !used.has((t.symbol ?? '').toUpperCase()));
		const token =
			match ??
			bestPerformer(fallbackPool) ??
			bestPerformer(priced.filter((t) => !used.has((t.symbol ?? '').toUpperCase())));
		if (!token) continue; // genuinely out of unique candidates — skip rather than duplicate

		used.add((token.symbol ?? '').toUpperCase());
		picks.push({
			sector,
			symbol: (token.symbol ?? '').toUpperCase(),
			name: token.name ?? (token.symbol ?? '').toUpperCase(),
			currencyId: token.currency_id
		});
	}
	return { picks, trace };
}

async function askAgent(
	candidatesBySector: Map<string, TokenWithPrice[]>
): Promise<{ chosen: Map<string, string>; trace: ComputeTrace | null }> {
	const lines: string[] = [];
	for (const [sector, candidates] of candidatesBySector) {
		lines.push(`${sector.toUpperCase()} slot — pick one:`);
		for (const t of candidates.slice(0, 12)) {
			const chg = t.change24h ?? 0;
			lines.push(`  ${(t.symbol ?? '').toUpperCase()}: $${t.price} (${chg >= 0 ? '+' : ''}${chg.toFixed(2)}% 24h)`);
		}
	}

	const systemPrompt = `You are the CoinDraft AI Draft Agent, helping a player fill their lineup. For each sector slot listed, choose exactly one token symbol from that slot's own candidate list — never invent a symbol that isn't listed. Every slot must get a DIFFERENT token — never reuse the same symbol across two slots, even if their candidate lists overlap. Favor tokens with strong or improving 24h momentum, but use your judgment. Respond with ONLY a JSON object mapping each sector id to your chosen symbol, e.g. {"l1":"ETH","meme":"DOGE"}. No other text.`;

	try {
		const res = await createChatCompletion({
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: lines.join('\n') }
			],
			// gpt-oss is a reasoning model — it burns part of this budget on an
			// internal reasoning trace before real content, same footgun already
			// found and fixed in /api/breakdown. 200 risked truncating before any
			// JSON came through; matching the value proven to leave headroom there.
			max_tokens: 400,
			temperature: 0.4
		});
		const backend = activeBackend();
		const trace = extractTrace(res, backend.model, backend.via);
		const raw = res.choices[0]?.message?.content ?? '';
		const jsonMatch = raw.match(/\{[\s\S]*\}/);
		if (!jsonMatch) return { chosen: new Map(), trace };
		const parsed = JSON.parse(jsonMatch[0]);
		const out = new Map<string, string>();
		for (const [sector, symbol] of Object.entries(parsed)) {
			if (typeof symbol === 'string') out.set(sector, symbol);
		}
		return { chosen: out, trace };
	} catch (e) {
		console.error('[draftAgent] LLM pick failed, falling back to best-performer per sector:', e);
		// No trace on failure — the picks that follow are procedural, not AI, and
		// must not be recorded as AI-assisted.
		return { chosen: new Map(), trace: null };
	}
}
