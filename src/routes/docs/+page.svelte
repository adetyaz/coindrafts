<script lang="ts">
	const SECTORS_LEGEND = [
		{ label: 'L1', desc: 'blue-chip base layers', color: 'var(--color-sector-l1)' },
		{ label: 'L2', desc: 'scaling networks', color: 'var(--color-sector-l2)' },
		{ label: 'DeFi', desc: 'protocols & yield', color: 'var(--color-sector-defi)' },
		{ label: 'Meme', desc: 'high-volatility culture coins', color: 'var(--color-sector-meme)' },
		{ label: 'Wildcard', desc: 'any token allowed', color: 'var(--color-sector-wildcard)' }
	];

	const WAVES = [
		{
			id: 'wave1',
			title: 'Wave 1 — Core Loop',
			sub: 'Connect, draft, resolve, learn why.',
			features: [
				{
					name: 'Wallet-only auth',
					desc: 'Reown AppKit — SIWE for EVM, ed25519 signature verification for Solana. Session cookie, no password anywhere.',
					status: 'done'
				},
				{
					name: 'Live market context',
					desc: 'Sector performance and ETF whale-flow alerts on the dashboard, server-cached from SoSoValue.',
					status: 'done'
				},
				{
					name: '5-token draft',
					desc: 'Entry prices captured at the moment a lineup locks.',
					status: 'done'
				},
				{
					name: 'Contest resolution',
					desc: 'Scores computed against real price movement between entry and resolution.',
					status: 'done'
				},
				{
					name: 'AI result breakdown',
					desc: 'A short Groq-generated explanation of what actually drove the outcome.',
					status: 'done'
				}
			]
		},
		{
			id: 'wave2',
			title: 'Wave 2 — Multiplayer',
			sub: 'Real opponents, real formats, help while you draft.',
			features: [
				{
					name: 'Matchmaking',
					desc: 'Queued 1v1 matching, real opponents only — no bot fallback. Queue is durable across server restarts.',
					status: 'done'
				},
				{
					name: 'Multiplayer lobbies',
					desc: '3+ players per contest — fixed-size (starts on fill) or open (resolves on a timer) formats.',
					status: 'done'
				},
				{
					name: 'Weekly contests',
					desc: 'A 7-day format alongside daily, paying 2× XP, selectable at contest creation.',
					status: 'done'
				},
				{
					name: 'Private leagues',
					desc: 'Create a league, share a 6-character invite code, standings update automatically.',
					status: 'done'
				},
				{
					name: 'Daily Gauntlet',
					desc: 'One quiz question a day, generated from live market data, correct answers earn XP + a sector boost.',
					status: 'done'
				},
				{
					name: 'AI Mentor',
					desc: 'Live chat grounded in real-time sector/token/news data — draft help before the fact, not just explanation after.',
					status: 'done'
				},
				{
					name: 'Global leaderboard',
					desc: 'Top-ranked players by total XP, medals for the top 3.',
					status: 'done'
				}
			]
		},
		{
			id: 'wave3',
			title: 'Wave 3 — Engagement',
			sub: 'Everything on top of the core loop.',
			features: [
				{
					name: 'Knowledge Base',
					desc: 'Sector-tagged live news feed — reading one article a day earns XP and a boost, same mechanic as the Gauntlet.',
					status: 'done'
				},
				{
					name: 'Achievement badges',
					desc: 'First Blood, On Fire / Unstoppable (streaks), Veteran / Champion (win milestones), League Founder.',
					status: 'done'
				},
				{
					name: 'Scrimmage',
					desc: 'No-stakes contests against bots, separate XP tracking, clearly labeled throughout so it’s never confused with a real result.',
					status: 'done'
				},
				{
					name: 'Shareable result cards',
					desc: 'Auto-generated cards for X/Twitter after a real (non-Scrimmage) win or loss.',
					status: 'done'
				},
				{
					name: 'Self-generating Gauntlet',
					desc: 'Daily questions built from live token/sector data, not a static bank — no manual seeding required.',
					status: 'done'
				},
				{
					name: 'Real-money prize pools',
					desc: 'League entry fees with a 70/20/10 payout split.',
					status: 'deferred'
				},
				{
					name: 'Responsible-play controls',
					desc: 'Daily contest caps, loss-streak cooldowns, risk disclaimers — planned alongside real-money pools.',
					status: 'deferred'
				}
			]
		}
	];

	const ARCH_ROWS = [
		{
			concern: 'Session auth',
			approach:
				'Signed cookie token (userId + timestamp), verified against a server-side secret — no session table lookup needed.'
		},
		{
			concern: 'Contest resolution',
			approach:
				'Lazy — resolves the instant anyone loads a result page — plus a daily cron sweep as a catch-all for contests nobody ever checks.'
		},
		{
			concern: 'Matchmaking queue',
			approach: 'Persisted in Postgres, not in-memory — survives serverless cold starts and redeploys.'
		},
		{
			concern: 'Price data',
			approach: 'Live snapshots at draft-lock and resolution time; sector/token feeds cached server-side on short TTLs.'
		},
		{
			concern: 'Theming',
			approach:
				'CSS custom-property tokens defined once in layout.css — a single light-only palette, no dark variant.'
		}
	];

	const STACK_ROWS = [
		{ layer: 'Framework', choice: 'SvelteKit, client-rendered' },
		{ layer: 'Styling', choice: 'Tailwind v4, CSS-first @theme token system' },
		{ layer: 'Database', choice: 'Postgres (Neon), Drizzle ORM' },
		{ layer: 'Auth', choice: 'Reown AppKit — SIWE (EVM), ed25519 (Solana)' },
		{ layer: 'Market data', choice: 'SoSoValue API' },
		{ layer: 'AI', choice: 'Groq (Llama 3.3 70B) — result breakdowns, Mentor chat' },
		{ layer: 'Hosting', choice: 'Vercel, with scheduled cron sweeps' }
	];

	const LIMITATIONS = [
		{
			name: 'On-chain pricing (SoDEX)',
			desc: "Price feed currently resolves through SoSoValue's shared data backend. SoDEX's separate on-chain trading API needs its own wallet-signed authentication that isn't wired up yet."
		},
		{
			name: 'League championship badges',
			desc: 'Not yet built — there’s no season-end resolution mechanic to determine a champion.'
		},
		{
			name: 'Mobile',
			desc: 'Responsive down to 375px, code-audited; not yet verified against every physical device.'
		}
	];

	const NAV = [
		{ label: 'Overview', href: '#overview' },
		{ label: 'Sectors', href: '#sectors' },
		{ label: 'Core Loop', href: '#wave1' },
		{ label: 'Multiplayer', href: '#wave2' },
		{ label: 'Engagement', href: '#wave3' },
		{ label: 'Architecture', href: '#architecture' },
		{ label: 'Tech Stack', href: '#stack' },
		{ label: 'Known Limitations', href: '#limitations' }
	];
</script>

<div class="grid grid-cols-[200px_1fr] gap-10 max-[860px]:grid-cols-1">
	<aside class="max-[860px]:hidden">
		<div class="sticky top-16 flex flex-col gap-1">
			{#each NAV as item (item.href)}
				<a
					href={item.href}
					class="rounded px-2 py-1.5 text-sm font-medium text-text-secondary no-underline transition hover:bg-hover hover:text-text"
					>{item.label}</a
				>
			{/each}
		</div>
	</aside>

	<main class="flex min-w-0 flex-col gap-10 pb-16">
		<div class="border-b border-border pb-7">
			<span class="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest text-primary uppercase">
				<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>Documentation
			</span>
			<h1 class="mt-3 text-[34px] leading-tight font-black tracking-tight text-text max-sm:text-[28px]">
				CoinDraft, end to end
			</h1>
			<p class="mt-2 max-w-xl text-[15px] text-text-secondary">
				A Solana-native fantasy-sports game for crypto: draft a 5-token lineup, compete against real price
				movement, climb XP and league rankings. This is the full reference — for a walkthrough of the app
				itself, see the <a href="/guide" class="text-primary hover:underline">How to Use Guide</a>.
			</p>
		</div>

		<section id="overview" class="scroll-mt-16">
			<h2 class="text-xl font-black text-text">Overview</h2>
			<p class="mt-1 mb-4 text-sm text-text-muted">Wallet-only identity. No email, no password, ever.</p>

			<div class="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
				<div class="rounded-[20px] border border-border bg-surface p-4">
					<span class="block font-mono text-2xl font-bold text-text">5</span>
					<span class="text-[11px] font-bold tracking-wide text-text-muted uppercase">Draft slots</span>
				</div>
				<div class="rounded-[20px] border border-border bg-surface p-4">
					<span class="block font-mono text-2xl font-bold text-text">3</span>
					<span class="text-[11px] font-bold tracking-wide text-text-muted uppercase">Waves shipped</span>
				</div>
				<div class="rounded-[20px] border border-border bg-surface p-4">
					<span class="block font-mono text-2xl font-bold text-text">3+</span>
					<span class="text-[11px] font-bold tracking-wide text-text-muted uppercase">Players/lobby</span>
				</div>
				<div class="rounded-[20px] border border-border bg-surface p-4">
					<span class="block font-mono text-2xl font-bold text-text">6</span>
					<span class="text-[11px] font-bold tracking-wide text-text-muted uppercase">Badges</span>
				</div>
			</div>

			<p class="mt-4 max-w-2xl text-sm text-text-secondary">
				Users connect a Solana or EVM wallet, sign a nonce to prove ownership, and land on a dashboard fed by
				live market data. From there: draft a lineup, get matched (1v1, or a 3+ player lobby), and let the
				contest resolve itself against real price movement — no manual intervention required anywhere in the
				loop.
			</p>
		</section>

		<section id="sectors" class="scroll-mt-16">
			<h2 class="text-xl font-black text-text">Draft sectors</h2>
			<p class="mt-1 mb-4 text-sm text-text-muted">Every lineup fills exactly one slot per sector.</p>
			<div class="flex flex-wrap gap-2">
				{#each SECTORS_LEGEND as s (s.label)}
					<span
						class="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold text-text"
					>
						<span class="h-2 w-2 rounded-full" style="background: {s.color}"></span>
						{s.label} — {s.desc}
					</span>
				{/each}
			</div>
		</section>

		{#each WAVES as wave (wave.id)}
			<section id={wave.id} class="scroll-mt-16">
				<h2 class="text-xl font-black text-text">{wave.title}</h2>
				<p class="mt-1 mb-4 text-sm text-text-muted">{wave.sub}</p>
				<div class="flex flex-col gap-2.5">
					{#each wave.features as f (f.name)}
						<div
							class="flex items-start justify-between gap-3 rounded-[20px] border border-border bg-surface px-4 py-3.5"
						>
							<div>
								<h4 class="text-[15px] font-bold text-text">{f.name}</h4>
								<p class="mt-1 text-[13.5px] text-text-secondary">{f.desc}</p>
							</div>
							<span
								class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase {f.status ===
								'done'
									? 'bg-positive/15 text-positive'
									: 'bg-warning/15 text-warning'}"
								>{f.status === 'done' ? 'Shipped' : 'Deferred'}</span
							>
						</div>
					{/each}
				</div>
				{#if wave.id === 'wave3'}
					<div class="mt-3.5 rounded-r-lg border-l-[3px] border-primary bg-surface px-4 py-3 text-[13.5px] text-text-secondary">
						<strong class="text-text">Why those two are deferred:</strong> both depend on real wallet-based
						payment infrastructure that hasn't been built yet — they're intentionally scoped for after prize
						pools have actual money moving through them, not left unfinished by oversight.
					</div>
				{/if}
			</section>
		{/each}

		<section id="architecture" class="scroll-mt-16">
			<h2 class="text-xl font-black text-text">Architecture notes</h2>
			<p class="mt-1 mb-4 text-sm text-text-muted">How the "resolves itself" part actually works.</p>
			<div class="overflow-x-auto rounded-[20px] border border-border">
				<table class="w-full min-w-[480px] border-collapse text-[13.5px]">
					<thead>
						<tr class="bg-surface-raised">
							<th class="px-3.5 py-2.5 text-left text-[10.5px] font-bold tracking-wide text-text-muted uppercase"
								>Concern</th
							>
							<th class="px-3.5 py-2.5 text-left text-[10.5px] font-bold tracking-wide text-text-muted uppercase"
								>Approach</th
							>
						</tr>
					</thead>
					<tbody>
						{#each ARCH_ROWS as row (row.concern)}
							<tr class="border-t border-border">
								<td class="px-3.5 py-3 font-semibold whitespace-nowrap text-text">{row.concern}</td>
								<td class="px-3.5 py-3 text-text-secondary">{row.approach}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section id="stack" class="scroll-mt-16">
			<h2 class="text-xl font-black text-text">Tech stack</h2>
			<div class="mt-4 overflow-x-auto rounded-[20px] border border-border">
				<table class="w-full min-w-[380px] border-collapse text-[13.5px]">
					<thead>
						<tr class="bg-surface-raised">
							<th class="px-3.5 py-2.5 text-left text-[10.5px] font-bold tracking-wide text-text-muted uppercase"
								>Layer</th
							>
							<th class="px-3.5 py-2.5 text-left text-[10.5px] font-bold tracking-wide text-text-muted uppercase"
								>Choice</th
							>
						</tr>
					</thead>
					<tbody>
						{#each STACK_ROWS as row (row.layer)}
							<tr class="border-t border-border">
								<td class="px-3.5 py-3 font-semibold whitespace-nowrap text-text">{row.layer}</td>
								<td class="px-3.5 py-3 text-text-secondary">{row.choice}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section id="limitations" class="scroll-mt-16">
			<h2 class="text-xl font-black text-text">Known limitations</h2>
			<div class="mt-4 flex flex-col gap-2.5">
				{#each LIMITATIONS as l (l.name)}
					<div class="rounded-[20px] border border-border bg-surface px-4 py-3.5">
						<h4 class="text-[15px] font-bold text-text">{l.name}</h4>
						<p class="mt-1 text-[13.5px] text-text-secondary">{l.desc}</p>
					</div>
				{/each}
			</div>
		</section>

		<footer class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5 text-xs text-text-muted">
			<span>CoinDraft Documentation</span>
			<a href="/guide" class="text-text-muted no-underline hover:text-primary">How to Use Guide →</a>
		</footer>
	</main>
</div>
