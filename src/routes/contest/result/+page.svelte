<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { toast } from '$lib/toast';
	import Toast from '$lib/components/Toast.svelte';
	import { BADGE_MAP } from '$lib/badges';

	let result = $state({
		status: 'YOU WON',
		xp: 250,
		yourScore: 1482,
		opponentScore: 1215,
		isPaper: false
	});

	let breakdown = $state([
		{ sector: 'L1', pick: 'SOL', pct: 8.4, opponent: 'ETH (+1.2%)', points: 420 },
		{ sector: 'Meme', pick: 'PEPE', pct: 15.2, opponent: 'DOGE (-2.1%)', points: 612 },
		{ sector: 'DeFi', pick: 'AAVE', pct: 3.1, opponent: 'UNI (+4.5%)', points: 180 },
		{ sector: 'L2', pick: 'ARB', pct: -1.4, opponent: 'OP (-0.8%)', points: 85 },
		{ sector: 'Wild', pick: 'RNDR', pct: 5.7, opponent: 'TAO (+2.2%)', points: 185 }
	]);
	let loading = $state(true);
	let error = $state('');
	let aiBreakdown = $state('');
	let aiLoading = $state(false);
	let contestId = $state('');
	let newBadges = $state<{ code: string; emoji: string; name: string }[]>([]);

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		contestId = params.get('contestId') ?? '';

		if (!contestId) {
			loading = false;
			return;
		}

		try {
			const res = await fetch(`/api/contest/${contestId}/result`);
			if (!res.ok) throw new Error('Failed to load contest result');
			const data = await res.json();
			result = {
				status: data.status,
				xp: data.xp,
				yourScore: data.yourScore,
				opponentScore: data.opponentScore,
				isPaper: Boolean(data.isPaper)
			};
			if (Array.isArray(data.breakdown) && data.breakdown.length > 0) {
				breakdown = data.breakdown;
			}
			// Fetch AI breakdown after picks are loaded
			fetchAiBreakdown(data.breakdown ?? breakdown, data.status ?? result.status);

			if (Array.isArray(data.newBadges)) {
				for (const code of data.newBadges) {
					const badge = BADGE_MAP.get(code);
					if (badge) {
						toast(`${badge.emoji} Badge unlocked: ${badge.name}`, 'success');
						newBadges = [...newBadges, { code, emoji: badge.emoji, name: badge.name }];
					}
				}
			}
		} catch (e: any) {
			error = e.message ?? 'Could not load result';
		} finally {
			loading = false;
		}
	});

	async function fetchAiBreakdown(picks: typeof breakdown, status: string) {
		aiLoading = true;
		try {
			const res = await fetch('/api/breakdown', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ picks, status })
			});
			if (res.ok) {
				const data = await res.json();
				aiBreakdown = data.breakdown ?? '';
			} else {
				const err = await res.json().catch(() => ({}));
				console.error('[breakdown] failed:', res.status, err.error, err.detail);
			}
		} catch (e) {
			console.error('[breakdown] fetch threw:', e);
			// Non-fatal — fall back to static text below
		} finally {
			aiLoading = false;
		}
	}

	const won = $derived(result.status === 'YOU WON');
</script>

<div class="mx-auto max-w-[1360px] px-7 pt-7 pb-18">
	{#if loading}
		<p class="mb-4 text-sm text-text-muted">Resolving contest and computing scores…</p>
	{:else if error}
		<p class="mb-4 text-sm text-negative-ink">{error}</p>
	{/if}

	<div
		class="rounded-[24px] p-11 max-sm:p-6"
		style={won
			? 'background:var(--color-primary);color:var(--color-ink);box-shadow:0 0 90px rgba(247,142,121,0.3)'
			: 'background:var(--color-surface);color:var(--color-ink);border:1px solid var(--color-border)'}
	>
		<div class="flex flex-wrap items-start justify-between gap-6">
			<div>
				<div class="mb-3.5 flex items-center gap-2.5">
					<span class="font-mono text-[11px] font-bold tracking-[0.14em] opacity-70 uppercase"
						>Contest &middot; final</span
					>
					{#if result.isPaper}
						<span class="rounded-full bg-black/10 px-2.5 py-1 text-[10px] font-bold uppercase">Practice</span>
					{/if}
				</div>
				<div class="text-[64px] leading-[0.9] font-black tracking-[-0.05em] max-sm:text-[40px]">
					{result.status}
				</div>
				<div class="mt-3 w-fit rounded-full px-3.5 py-1.5 text-sm font-bold" style="background:rgba(26,36,33,0.1)">
					+{result.xp} {result.isPaper ? 'practice XP (not counted)' : 'XP earned'}
				</div>
			</div>
			<div class="flex items-center gap-6">
				<div>
					<div class="mb-1.5 text-[11px] font-extrabold tracking-[0.1em] opacity-70 uppercase">You</div>
					<div class="font-mono text-[44px] leading-none font-bold tracking-[-0.03em] max-sm:text-[32px]">
						{result.yourScore.toLocaleString()}
					</div>
				</div>
				<div class="text-xl font-extrabold opacity-40">/</div>
				<div>
					<div class="mb-1.5 text-[11px] font-extrabold tracking-[0.1em] opacity-70 uppercase">Opponent</div>
					<div
						class="font-mono text-[44px] leading-none font-bold tracking-[-0.03em] opacity-65 max-sm:text-[32px]"
					>
						{result.opponentScore.toLocaleString()}
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mt-4.5 flex flex-wrap gap-4.5">
		<div class="min-w-0 flex-[1_1_520px]">
			<div class="mb-3 text-[11px] font-extrabold tracking-[0.12em] text-text-muted uppercase">
				Pick breakdown
			</div>
			<div class="overflow-x-auto rounded-[18px] border border-border">
				<div
					class="grid min-w-[620px] grid-cols-[90px_minmax(100px,1fr)_70px_minmax(100px,1fr)_60px] gap-2.5 bg-surface px-4.5 py-2.5 text-[10px] font-extrabold tracking-[0.1em] text-text-muted uppercase"
				>
					<div>Sector</div>
					<div>Your pick</div>
					<div class="text-right">Ret</div>
					<div>Opponent</div>
					<div class="text-right">Pts</div>
				</div>
				{#each breakdown as row, i (`${row.sector}-${row.pick}-${i}`)}
					<div
						class="grid min-w-[620px] grid-cols-[90px_minmax(100px,1fr)_70px_minmax(100px,1fr)_60px] items-center gap-2.5 border-t border-border px-4.5 py-3.5"
					>
						<span class="text-[11px] font-extrabold tracking-[0.08em] uppercase text-text-muted">{row.sector}</span>
						<span class="text-sm font-bold">{row.pick}</span>
						<span
							class="text-right font-mono text-[13px] font-bold"
							style="color:{row.pct >= 0 ? 'var(--color-mint-ink)' : 'var(--color-red-ink)'}"
							>{row.pct >= 0 ? '+' : ''}{row.pct}%</span
						>
						<span class="truncate text-sm text-text-muted">{row.opponent}</span>
						<span class="text-right text-sm font-bold">+{row.points}</span>
					</div>
				{/each}
			</div>

			<div class="frost-panel mt-3.5 flex gap-3.5 rounded-[18px] p-[22px]">
				<div class="h-9 w-9 shrink-0 rounded-[9px] bg-surface-alt"></div>
				<div>
					<div class="mb-2 text-[11px] font-extrabold tracking-[0.12em] text-text-muted uppercase">
						Mentor take
					</div>
					{#if aiLoading}
						<div class="flex flex-col gap-2">
							<div class="h-3.5 w-3/4 animate-pulse rounded bg-surface-alt"></div>
							<div class="h-3.5 w-full animate-pulse rounded bg-surface-alt"></div>
							<div class="h-3.5 w-2/3 animate-pulse rounded bg-surface-alt"></div>
						</div>
					{:else}
						<p class="text-sm leading-[1.65] text-text-body">
							{aiBreakdown ||
								'Sector momentum and price performance drove your result. Review your picks above to refine your next draft strategy.'}
						</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex min-w-0 flex-[1_1_280px] flex-col gap-3.5">
			{#each newBadges as badge (badge.code)}
				<div class="rounded-[20px] border border-primary bg-surface p-[22px] shadow-[0_0_46px_rgba(247,142,121,0.2)]">
					<div class="mb-3.5 text-[11px] font-extrabold tracking-[0.12em] text-primary-ink uppercase">
						Badge unlocked
					</div>
					<div class="flex items-center gap-3">
						<div class="grid h-11 w-11 place-items-center rounded-xl border border-primary bg-primary-muted text-xl">
							{badge.emoji}
						</div>
						<div class="text-[15px] font-extrabold">{badge.name}</div>
					</div>
				</div>
			{/each}

			<div class="frost-panel rounded-[20px] p-[22px]">
				<div class="mb-3 text-[11px] font-extrabold tracking-[0.12em] text-text-muted uppercase">XP gained</div>
				<div class="font-mono text-[40px] leading-none font-bold text-primary-ink">+{result.xp}</div>
			</div>

			{#if !result.isPaper && contestId && page.data.user?.id}
				<a
					href={`/share/${contestId}?u=${page.data.user.id}`}
					target="_blank"
					rel="noopener noreferrer"
					class="w-full rounded-full bg-primary py-4 text-center text-[15px] font-extrabold text-text no-underline"
					>Share result</a
				>
			{/if}
			<a
				href="/matchmaking"
				class="w-full rounded-full border border-border bg-transparent py-4 text-center text-[15px] font-bold text-text no-underline"
				>Play again</a
			>
		</div>
	</div>
</div>

<Toast />
