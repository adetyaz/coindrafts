<script lang="ts">
	import { page } from '$app/state';
	import { appKit } from '$lib/appkit';
	import { sectorTheme } from '$lib/sectorTheme';

	const appkitReady = Boolean(appKit);

	const HERO_SLOTS = [
		{ ticker: 'SOL', sector: 'l1', change: '+6.2%', filled: true },
		{ ticker: 'ARB', sector: 'l2', change: '-1.4%', filled: true },
		{ ticker: 'UNI', sector: 'defi', change: '+9.8%', filled: true },
		{ ticker: '', sector: 'meme', change: '', filled: false },
		{ ticker: '', sector: 'wildcard', change: '', filled: false }
	];

	const PROOF_FEED = [
		'@sushilong took DEFI +9.8% — 742 pts',
		'@degen_ana swept 4 of 5 sectors',
		'@0xmarrow climbed to rank 03',
		'@blockpilot unlocked STREAK 10',
		'@tapeworm won on WILDCARD by 2 pts',
		'@vaultrat joined league DEGEN DESK'
	];

	const STEPS = [
		{
			num: '01',
			title: 'Draft five',
			desc: 'One token per sector. Picks are locked for the full window — no swaps once the clock starts.'
		},
		{
			num: '02',
			title: 'Get matched',
			desc: 'Paired with a player inside your rating band, or bring your own crowd into a private league.'
		},
		{
			num: '03',
			title: 'Score for 24h',
			desc: 'Each sector is scored on relative return. Win the sector, take the points, climb the ladder.'
		}
	];

	const SECTOR_PAGES = [
		{
			id: 'l1',
			count: '14',
			swing: '4.1%',
			blurb:
				'Base-layer chains. The slowest sector on the board and the hardest to fake — conviction usually beats reaction here.',
			tokens: [
				['SOL', '$182.40'],
				['AVAX', '$28.10'],
				['SUI', '$3.44'],
				['NEAR', '$5.02']
			]
		},
		{
			id: 'l2',
			count: '7',
			swing: '5.8%',
			blurb: 'Rollups trade on fee news and little else. A timing sector: the right pick on the wrong day still loses.',
			tokens: [
				['ARB', '$0.82'],
				['OP', '$1.94'],
				['ZK', '$0.11'],
				['STRK', '$0.38']
			]
		},
		{
			id: 'defi',
			count: '18',
			swing: '6.4%',
			blurb:
				"Governance tokens follow deposits with a lag. The sector that rewards reading flows before they show up in price.",
			tokens: [
				['UNI', '$9.85'],
				['AAVE', '$142.60'],
				['CRV', '$0.61'],
				['MKR', '$1,204']
			]
		},
		{
			id: 'meme',
			count: '12',
			swing: '14.2%',
			blurb:
				'Highest variance on the board. One slot holds all the noise, which is exactly why it decides close contests.',
			tokens: [
				['DOGE', '$0.14'],
				['PEPE', '$0.000009'],
				['WIF', '$2.08'],
				['BONK', '$0.00002']
			]
		},
		{
			id: 'wildcard',
			count: '9',
			swing: '8.7%',
			blurb: 'Everything that fits nowhere else — infra, compute, oracles. Thin liquidity, sharp moves, frequent upsets.',
			tokens: [
				['LINK', '$13.20'],
				['RNDR', '$5.61'],
				['TAO', '$412.00'],
				['GRT', '$0.19']
			]
		}
	];

	let activeSector = $state(0);
	const curSector = $derived(SECTOR_PAGES[activeSector]);
	const curTheme = $derived(sectorTheme(curSector.id));

	const STATS = [
		{ value: '30,811', label: 'Players' },
		{ value: '1,204', label: 'Live contests' },
		{ value: '24H', label: 'Contest length' },
		{ value: '12D 04H', label: 'Season 01 left' }
	];

	const VOICES = [
		{
			quote: 'The five-sector rule is the whole game. You cannot hide behind one lucky pick.',
			name: '@degen_ana',
			meta: 'RANK 02 · 44W 15L'
		},
		{
			quote: 'I read research all day anyway. Now there is a scoreboard attached to it.',
			name: '@blockpilot',
			meta: 'RANK 04 · 38W 20L'
		},
		{
			quote: 'Lost a contest by two points on the wildcard slot. Still thinking about it.',
			name: '@tapeworm',
			meta: 'RANK 05 · 36W 21L'
		}
	];

	const FOOTER_COLS = [
		{ title: 'Product', links: ['Draft', 'Contests', 'Leagues', 'Knowledge Base'] },
		{ title: 'Season', links: ['Leaderboard', 'Badges', 'Scoring rules', 'Past seasons'] },
		{ title: 'Company', links: ['About', 'Careers', 'Press kit', 'Contact'] }
	];
</script>

<div>
	<section class="dot-grid relative overflow-hidden bg-bg px-6 pt-16 pb-10 max-md:pt-10">
		<div
			class="pointer-events-none absolute top-[-260px] left-1/2 h-[560px] w-[1100px] -translate-x-1/2 rounded-full bg-primary opacity-20 blur-3xl"
		></div>

		<div class="relative mx-auto flex max-w-6xl flex-wrap items-center gap-12">
			<div class="min-w-0 flex-[1_1_420px]">
				<div
					class="mb-6.5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 font-mono text-[11px] font-bold tracking-[0.1em] text-text-muted uppercase"
				>
					<span class="anim-blink h-1.5 w-1.5 rounded-full bg-positive"></span>Season 01 &middot; 1,204 contests
					live
				</div>

				<h1 class="text-[72px] leading-[0.9] font-black tracking-[-0.05em] max-lg:text-[52px] max-md:text-[38px]">
					Draft coins.
				</h1>
				<h1
					class="text-[72px] leading-[0.9] font-black tracking-[-0.05em] text-primary-ink max-lg:text-[52px] max-md:text-[38px]"
				>
					Beat people.
				</h1>
				<p class="mt-6.5 max-w-[46ch] text-lg leading-relaxed text-text-muted max-md:text-base">
					One token per sector, five sectors, twenty-four hours. No leverage, no liquidations — your
					read against theirs, scored on relative return.
				</p>

				<div class="mt-8 flex flex-wrap items-center gap-3">
					{#if page.data.user}
						<a
							href="/dashboard"
							class="inline-flex h-13 cursor-pointer items-center gap-2 rounded-full bg-primary px-8 text-sm font-extrabold text-text no-underline shadow-[0_14px_44px_rgba(247,142,121,0.34)] transition hover:-translate-y-0.5 hover:bg-primary-hover"
						>
							Go to dashboard &rarr;
						</a>
					{:else if appkitReady}
						<div class="*:h-13 *:rounded-full *:px-8">
							<appkit-button></appkit-button>
						</div>
						<a
							href="/dashboard"
							class="inline-flex h-13 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-8 text-sm font-bold text-text-muted no-underline transition hover:border-primary"
						>
							Watch a live contest
						</a>
					{:else}
						<button
							class="inline-flex h-13 cursor-not-allowed items-center rounded-full bg-primary/50 px-8 text-sm font-extrabold text-text/50"
							disabled>Loading wallet…</button
						>
					{/if}
				</div>

				{#if page.url.searchParams.get('auth') === 'required'}
					<p class="mt-4 text-xs text-negative-ink">
						Sign in with your wallet to access draft and contest routes.
					</p>
				{/if}

				<div class="mt-8.5 flex items-center gap-3.5">
					<div class="flex">
						<div class="h-7.5 w-7.5 rounded-full border-2 border-bg bg-surface-alt"></div>
						<div class="-ml-2.5 h-7.5 w-7.5 rounded-full border-2 border-bg bg-border"></div>
						<div class="-ml-2.5 h-7.5 w-7.5 rounded-full border-2 border-bg bg-border"></div>
						<div class="-ml-2.5 h-7.5 w-7.5 rounded-full border-2 border-bg bg-primary"></div>
					</div>
					<span class="text-[13px] text-text-muted">30,811 players drafting this season</span>
				</div>
			</div>

			<div class="relative min-w-0 flex-[1_1_400px]">
				<div class="anim-float relative overflow-hidden rounded-3xl border border-border bg-surface-alt shadow-[0_40px_90px_rgba(26,36,33,0.18)]">
					<div class="flex items-center gap-1.5 border-b border-border px-4 py-3.5">
						<div class="h-2.5 w-2.5 rounded-full bg-border"></div>
						<div class="h-2.5 w-2.5 rounded-full bg-border"></div>
						<div class="h-2.5 w-2.5 rounded-full bg-border"></div>
						<span class="ml-2.5 font-mono text-[10px] text-text-muted">coindraft.app/draft</span>
					</div>
					<div class="p-5.5">
						<div class="mb-4 text-[11px] font-extrabold tracking-[0.12em] text-text-muted uppercase">
							Your lineup &middot; locks in 00:42
						</div>
						<div class="flex flex-col gap-2.5">
							{#each HERO_SLOTS as slot (slot.sector)}
								{@const theme = sectorTheme(slot.sector)}
								<div
									class="flex items-center gap-3 rounded-2xl p-3.5"
									style={slot.filled
										? `background:var(--color-surface);border:1px solid ${theme.color}66`
										: 'background:var(--color-surface);border:1px dashed var(--color-border)'}
								>
									<div
										class="grid h-8.5 w-8.5 shrink-0 place-items-center rounded-full text-sm font-black"
										style={slot.filled
											? `background:${theme.color};color:var(--color-ink);box-shadow:0 0 20px ${theme.color}55`
											: 'border:1px dashed var(--color-border-strong);color:var(--color-text-muted)'}
									>
										{slot.filled ? slot.ticker.charAt(0) : '+'}
									</div>
									<div class="min-w-0 flex-1">
										<div class="text-[15px] font-extrabold" style={slot.filled ? '' : 'color:var(--color-text-muted)'}>
											{slot.filled ? slot.ticker : 'Empty'}
										</div>
										<div class="text-[10px] font-extrabold tracking-[0.1em] uppercase" style="color:{theme.ink}">
											{theme.label}
										</div>
									</div>
									{#if slot.filled}
										<span
											class="font-mono text-xs"
											style="color:{slot.change.startsWith('-') ? 'var(--color-red-ink)' : 'var(--color-mint-ink)'}"
											>{slot.change}</span
										>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>
				<div
					class="anim-float2 absolute -right-1.5 bottom-1.5 rounded-2xl bg-primary p-5 text-text shadow-[0_24px_60px_rgba(247,142,121,0.4)]"
				>
					<div class="text-[10px] font-extrabold tracking-[0.12em] opacity-75">Contest #4821</div>
					<div class="text-[28px] leading-tight font-black tracking-[-0.03em]">You won</div>
					<div class="font-mono text-[13px] font-bold">742 / 689 &middot; +140 XP</div>
				</div>
			</div>
		</div>

		<div class="relative mt-16 overflow-hidden border-y border-border py-4">
			<div class="anim-marquee flex w-max gap-10">
				{#each [...PROOF_FEED, ...PROOF_FEED] as line, i (i)}
					<span class="font-mono text-xs whitespace-nowrap text-text-muted">{line}</span>
				{/each}
			</div>
		</div>
	</section>

	<section class="bg-bg px-6 py-20 max-md:py-14">
		<div class="mx-auto max-w-5xl">
			<div class="mb-10 flex flex-wrap items-end justify-between gap-6">
				<div>
					<p class="mb-3.5 font-mono text-[11px] font-bold tracking-[0.14em] text-primary-ink uppercase">
						01 &mdash; The format
					</p>
					<h2 class="max-w-[16ch] text-[46px] leading-[0.95] font-black tracking-[-0.045em] max-md:text-[30px]">
						Three minutes to enter. A day to find out.
					</h2>
				</div>
				<p class="max-w-[34ch] text-[15px] leading-relaxed text-text-muted">
					Contests settle on relative sector return, so a flat market still produces a winner.
				</p>
			</div>

			<div class="grid grid-cols-3 gap-0 border-t border-border max-md:grid-cols-1">
				{#each STEPS as step (step.num)}
					<div class="border-r border-border py-8.5 pr-7 last:border-r-0">
						<div class="mb-6.5 font-mono text-sm font-bold text-primary-ink">{step.num}</div>
						<h3 class="mb-3 text-2xl font-extrabold tracking-[-0.03em]">{step.title}</h3>
						<p class="max-w-[32ch] text-sm leading-relaxed text-text-muted">{step.desc}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="bg-bg px-6 py-20 max-md:py-14">
		<div class="mx-auto max-w-5xl">
			<p class="mb-3.5 font-mono text-[11px] font-bold tracking-[0.14em] text-primary-ink uppercase">
				02 &mdash; The board
			</p>
			<h2 class="mb-7 max-w-[18ch] text-[46px] leading-[0.95] font-black tracking-[-0.045em] max-md:text-[30px]">
				Five sectors. Five very different games.
			</h2>

			<div class="mb-5.5 flex flex-wrap gap-2.5">
				{#each SECTOR_PAGES as s, i (s.id)}
					{@const theme = sectorTheme(s.id)}
					<button
						type="button"
						onclick={() => (activeSector = i)}
						class="cursor-pointer rounded-full px-5.5 py-2.5 text-[13px] font-extrabold whitespace-nowrap transition-all"
						style={i === activeSector
							? `background:${theme.color};color:var(--color-ink)`
							: 'background:var(--color-surface-alt);color:var(--color-text-muted)'}
					>
						{theme.label}
					</button>
				{/each}
			</div>

			<div
				class="rounded-[24px] p-11 transition-colors max-md:p-6"
				style="background:{curTheme.color};color:var(--color-ink)"
			>
				<div class="flex flex-wrap items-center gap-10">
					<div class="min-w-0 flex-[1_1_300px]">
						<div class="mb-3.5 text-4xl leading-tight font-black tracking-[-0.04em]">{curTheme.label}</div>
						<p class="max-w-[38ch] text-[15px] leading-relaxed opacity-75">{curSector.blurb}</p>
						<div class="mt-7 flex gap-6.5">
							<div>
								<div class="font-mono text-[26px] font-bold">{curSector.count}</div>
								<div class="text-[10px] font-extrabold tracking-[0.1em] opacity-60 uppercase">Tokens</div>
							</div>
							<div>
								<div class="font-mono text-[26px] font-bold">{curSector.swing}</div>
								<div class="text-[10px] font-extrabold tracking-[0.1em] opacity-60 uppercase">Avg daily swing</div>
							</div>
						</div>
					</div>
					<div class="grid min-w-0 flex-[1_1_340px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
						{#each curSector.tokens as [ticker, price] (ticker)}
							<div class="flex items-center justify-between gap-2.5 rounded-2xl bg-black/5 p-4">
								<span class="text-base font-black tracking-[-0.02em]">{ticker}</span>
								<span class="font-mono text-xs opacity-70">{price}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="bg-bg px-6 py-20 max-md:py-14">
		<div class="mx-auto max-w-5xl">
			<div class="grid grid-cols-4 gap-0 overflow-hidden rounded-[20px] border border-border max-sm:grid-cols-2">
				{#each STATS as s (s.label)}
					<div class="border-r border-border bg-surface p-6.5 last:border-r-0 max-sm:[&:nth-child(2)]:border-r-0">
						<div class="font-mono text-[34px] font-bold tracking-[-0.03em]">{s.value}</div>
						<div class="mt-2 text-[11px] font-extrabold tracking-[0.1em] text-text-muted uppercase">{s.label}</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="bg-bg px-6 py-20 max-md:py-14">
		<div class="mx-auto max-w-5xl">
			<p class="mb-4 font-mono text-[11px] font-bold tracking-[0.14em] text-primary-ink uppercase">
				03 &mdash; The players
			</p>
			<div class="grid grid-cols-3 gap-3.5 max-md:grid-cols-1">
				{#each VOICES as v (v.name)}
					<div class="flex flex-col justify-between gap-6 rounded-[20px] border border-border bg-surface p-6.5">
						<p class="text-[17px] leading-relaxed text-text-body">{v.quote}</p>
						<div class="flex items-center gap-2.5">
							<div class="h-8 w-8 rounded-full bg-surface-alt"></div>
							<div>
								<div class="text-[13px] font-bold">{v.name}</div>
								<div class="font-mono text-[11px] text-text-muted">{v.meta}</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="bg-surface px-6 py-20 text-center max-md:py-14">
		<div class="mx-auto max-w-2xl">
			<h2 class="mb-3 text-[38px] font-black tracking-[-0.03em] max-md:text-[28px]">Season 01 is still open</h2>
			<p class="mb-8 text-[15px] text-text-muted">Free to play. Your first contest takes about two minutes.</p>
			<div class="flex flex-wrap justify-center gap-3">
				<a
					href="/dashboard"
					class="inline-flex h-13 items-center rounded-full bg-primary px-8 text-sm font-extrabold text-text no-underline transition hover:-translate-y-0.5 hover:bg-primary-hover"
					>Start drafting</a
				>
				<a
					href="/leaderboard"
					class="inline-flex h-13 items-center rounded-full border border-border bg-transparent px-8 text-sm font-bold text-text-muted no-underline transition hover:bg-hover"
					>View leaderboard</a
				>
			</div>
		</div>
	</section>

	<footer class="bg-bg px-6 pt-16 pb-8">
		<div class="mx-auto max-w-5xl">
			<div class="flex flex-wrap gap-8 border-b border-border pb-9">
				<div class="min-w-0 flex-[1_1_280px]">
					<div class="mb-3.5 flex items-center gap-2.5">
						<span class="relative h-6 w-6 shrink-0">
							<span class="absolute inset-0 rounded-md bg-primary" style="transform:rotate(45deg)"></span>
							<span class="absolute top-2 left-2 h-2 w-2 rounded-[2px] bg-text" style="transform:rotate(45deg)"
							></span>
						</span>
						<span class="text-lg font-black tracking-[-0.03em]">CoinDraft</span>
					</div>
					<p class="max-w-[32ch] text-[13px] text-text-muted">
						Fantasy drafting for crypto markets. Play money, real reads.
					</p>
				</div>
				{#each FOOTER_COLS as col (col.title)}
					<div class="min-w-0 flex-[1_1_140px]">
						<div class="mb-3.5 text-[11px] font-extrabold tracking-[0.1em] text-text-muted uppercase">{col.title}</div>
						<div class="flex flex-col gap-2.5">
							{#each col.links as link (link)}
								<span class="text-[13px] text-text-muted">{link}</span>
							{/each}
						</div>
					</div>
				{/each}
			</div>
			<div class="flex flex-wrap justify-between gap-3 pt-6">
				<span class="font-mono text-[11px] text-text-muted">&copy; 2026 COINDRAFT &middot; NOT INVESTMENT ADVICE</span>
				<span class="font-mono text-[11px] text-text-muted">SEASON 01 &middot; 12D 04H REMAINING</span>
			</div>
		</div>
	</footer>
</div>
