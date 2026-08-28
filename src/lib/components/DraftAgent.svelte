<script lang="ts">
	import { toast } from '$lib/toast';

	type AgentPick = { sector: string; symbol: string; name: string; currencyId: string };

	let {
		emptySectors,
		isPaper = false,
		onPicks
	}: { emptySectors: string[]; isPaper?: boolean; onPicks: (picks: AgentPick[]) => void } = $props();

	const XP_COST_PER_SLOT = 15;

	let pos = $state({ x: 0, y: 0 });
	let open = $state(false);
	let confirming = $state<'one' | 'all' | null>(null);
	let submitting = $state(false);
	let freeHitsAvailable = $state(0);

	function handleMove(e: MouseEvent) {
		// Follows loosely, offset from the cursor rather than glued to it —
		// Clippy-style, playful, not a serious cursor replacement.
		pos = { x: e.clientX + 18, y: e.clientY + 18 };
	}

	$effect(() => {
		fetch('/api/me')
			.then((r) => (r.ok ? r.json() : null))
			.then((me) => {
				if (me) freeHitsAvailable = me.freeHitsAvailable ?? 0;
			})
			.catch(() => {});
	});

	function costFor(count: number) {
		if (isPaper) return 0;
		return freeHitsAvailable > 0 ? 0 : XP_COST_PER_SLOT * count;
	}

	async function confirmHelp(mode: 'one' | 'all') {
		const sectors = mode === 'one' ? emptySectors.slice(0, 1) : emptySectors;
		if (sectors.length === 0) return;
		submitting = true;
		try {
			const res = await fetch('/api/draft/agent-pick', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sectors, isPaper })
			});
			const data = await res.json();
			if (!res.ok) {
				toast(data.error ?? 'Draft agent unavailable', 'error');
				return;
			}
			onPicks(data.picks);
			toast(
				data.freeHitUsed
					? `Free Hit used — ${data.picks.length} pick(s) added, no XP cost`
					: `${data.picks.length} pick(s) added — ${data.xpCharged} XP spent`,
				'success'
			);
			if (data.freeHitUsed) freeHitsAvailable = Math.max(0, freeHitsAvailable - 1);
		} catch {
			toast('Draft agent unavailable', 'error');
		} finally {
			submitting = false;
			confirming = null;
			open = false;
		}
	}
</script>

<svelte:window onmousemove={handleMove} />

{#if emptySectors.length > 0}
	<div
		class="pointer-events-none fixed z-40 transition-transform duration-300 ease-out"
		style="left:0;top:0;transform:translate({pos.x}px,{pos.y}px)"
	>
		<div class="pointer-events-auto relative">
			<button
				type="button"
				onclick={() => (open = !open)}
				aria-label="AI Draft Agent"
				class="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-text text-lg shadow-[0_8px_24px_rgba(26,36,33,0.28)] transition hover:-translate-y-0.5"
			>
				🪄
			</button>

			{#if open}
				<div
					class="absolute top-13 left-0 w-72 rounded-2xl border border-border bg-surface p-4 shadow-[0_16px_40px_rgba(26,36,33,0.2)]"
				>
					{#if !confirming}
						<p class="mb-3 text-[13px] font-bold text-text">Need a hand?</p>
						<div class="flex flex-col gap-2">
							<button
								type="button"
								onclick={() => (confirming = 'one')}
								class="cursor-pointer rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-left text-xs font-bold text-text"
							>
								Fill the next empty slot
								<span class="block font-mono text-[11px] font-normal text-text-muted">
									{isPaper ? 'Free — Scrimmage mode' : freeHitsAvailable > 0 ? 'Free Hit available' : `-${costFor(1)} XP`}
								</span>
							</button>
							<button
								type="button"
								onclick={() => (confirming = 'all')}
								class="cursor-pointer rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-left text-xs font-bold text-text"
							>
								Auto-draft everything left ({emptySectors.length})
								<span class="block font-mono text-[11px] font-normal text-text-muted">
									{isPaper ? 'Free — Scrimmage mode' : freeHitsAvailable > 0 ? 'Free Hit available' : `-${costFor(emptySectors.length)} XP`}
								</span>
							</button>
						</div>
					{:else}
						<p class="mb-2 text-[13px] font-bold text-text">Before you do —</p>
						<p class="mb-3 text-xs text-text-muted">
							The agent isn't guaranteed to be right, and using it
							{isPaper
								? " won't cost anything — Scrimmage has no real stakes."
								: freeHitsAvailable > 0
									? ' will use your Free Hit (no XP cost this time).'
									: ` costs ${costFor(confirming === 'one' ? 1 : emptySectors.length)} XP, charged right away.`}
						</p>
						<div class="flex gap-2">
							<button
								type="button"
								onclick={() => (confirming = null)}
								class="flex-1 cursor-pointer rounded-full border border-border bg-transparent py-2 text-xs font-bold text-text-muted"
							>
								Back
							</button>
							<button
								type="button"
								disabled={submitting}
								onclick={() => confirmHelp(confirming!)}
								class="flex-1 cursor-pointer rounded-full bg-primary py-2 text-xs font-extrabold text-text disabled:opacity-60"
							>
								{submitting ? 'Thinking…' : 'Go ahead'}
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}
