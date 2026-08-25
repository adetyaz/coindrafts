<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import Toast from '$lib/components/Toast.svelte';
	import { toast } from '$lib/toast';
	import { resolve } from '$app/paths';

	let status = $state<'idle' | 'searching' | 'matched' | 'error'>('idle');
	let errorMessage = $state('');
	let contestId = $state('');
	let _opponentId = $state('');
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let searchStartTime = $state(0);
	let elapsed = $state(0);

	const elapsedStr = $derived.by(() => {
		const s = Math.floor(elapsed / 1000);
		const m = Math.floor(s / 60);
		return `${m}:${(s % 60).toString().padStart(2, '0')}`;
	});

	onMount(() => {
		startSearch();
	});

	onDestroy(() => {
		if (pollTimer) clearInterval(pollTimer);
	});

	async function startSearch() {
		status = 'searching';
		searchStartTime = Date.now();
		elapsed = 0;

		// Poll elapsed time
		const elapsedTimer = setInterval(() => {
			elapsed = Date.now() - searchStartTime;
		}, 1000);

		// Join queue
		const res = await fetch('/api/matchmaking/join', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ type: 'daily' })
		});

		if (res.status === 401) {
			window.location.href = '/?auth=required';
			return;
		}
		if (!res.ok) {
			clearInterval(elapsedTimer);
			status = 'error';
			errorMessage = 'Could not join matchmaking. Please try again.';
			return;
		}

		const data = await res.json();
		if (data.status === 'matched') {
			clearInterval(elapsedTimer);
			contestId = data.contestId;
			_opponentId = data.opponentId;
			status = 'matched';
			toast('Opponent found!', 'success');
			setTimeout(() => goto(resolve(`/draft?contestId=${contestId}`)), 1500);
			return;
		}

		// Poll for match every 3s, with bot fallback after 30s
		pollTimer = setInterval(async () => {
			const elapsedMs = Date.now() - searchStartTime;

			// Bot fallback after 30 seconds
			if (elapsedMs > 30_000) {
				clearInterval(elapsedTimer);
				if (pollTimer) clearInterval(pollTimer);
				pollTimer = null;

				// Create a contest with bot opponent
				const botRes = await fetch('/api/contests', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ type: 'daily' })
				});
				if (botRes.status === 401) {
					window.location.href = '/?auth=required';
					return;
				}
				if (!botRes.ok) {
					status = 'error';
					errorMessage = 'Could not create a bot match. Please try again.';
					return;
				}
				const botData = await botRes.json();
				if (botData.id) {
					contestId = botData.id;
					status = 'matched';
					toast('No opponents online. Matched with bot.', 'success');
					setTimeout(() => goto(resolve(`/draft?contestId=${contestId}`)), 1500);
				} else {
					status = 'error';
					errorMessage = 'Could not create a bot match. Please try again.';
				}
				return;
			}

			const pollRes = await fetch('/api/matchmaking/status');
			if (pollRes.status === 401) {
				clearInterval(elapsedTimer);
				if (pollTimer) clearInterval(pollTimer);
				pollTimer = null;
				window.location.href = '/?auth=required';
				return;
			}
			if (!pollRes.ok) return; // transient — let the next 3s tick retry
			const pollData = await pollRes.json();
			if (pollData.status === 'matched') {
				clearInterval(elapsedTimer);
				if (pollTimer) clearInterval(pollTimer);
				pollTimer = null;
				contestId = pollData.contestId;
				_opponentId = pollData.opponentId;
				status = 'matched';
				toast('Opponent found!', 'success');
				setTimeout(() => goto(resolve(`/draft?contestId=${contestId}`)), 1500);
			}
		}, 3000);
	}

	async function cancelSearch() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
		await fetch('/api/matchmaking/leave', { method: 'POST' });
		goto(resolve('/dashboard'));
	}
</script>

<div class="mx-auto max-w-[720px] px-7 py-14">
	{#if status === 'searching'}
		<div
			class="hero-coral dot-grid relative flex min-h-[440px] flex-col justify-between overflow-hidden rounded-[24px] p-11"
		>
			<div
				class="pointer-events-none absolute top-[70px] right-[-70px] flex h-80 w-80 items-center justify-center"
			>
				<div
					class="anim-pulse absolute h-52 w-52 rounded-full border-2 border-[rgba(26,36,33,0.28)]"
				></div>
				<div
					class="anim-pulse absolute h-52 w-52 rounded-full border-2 border-[rgba(26,36,33,0.28)]"
					style="animation-delay:0.85s"
				></div>
				<div
					class="anim-pulse absolute h-52 w-52 rounded-full border-2 border-[rgba(26,36,33,0.28)]"
					style="animation-delay:1.7s"
				></div>
				<div class="h-[74px] w-[74px] rounded-full bg-text"></div>
			</div>
			<div class="relative flex items-start justify-between">
				<span
					class="flex items-center gap-2 rounded-full bg-text px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.14em] text-primary uppercase"
				>
					<span class="anim-blink h-1.5 w-1.5 rounded-full bg-primary"></span>Searching
				</span>
			</div>
			<div class="relative">
				<div class="text-[54px] leading-[0.94] font-black tracking-[-0.045em]">
					Finding your rival
				</div>
				<p class="mt-4 max-w-[40ch] text-[15px] opacity-80">
					Scanning live contests for a player at your skill level. After 30 seconds you'll be
					matched with a bot opponent instead.
				</p>
			</div>
			<div class="relative flex items-end justify-between gap-6">
				<div class="font-mono text-[42px] leading-none font-bold tracking-[-0.03em]">
					{elapsedStr}
				</div>
				<button
					onclick={cancelSearch}
					class="cursor-pointer rounded-full border-[1.5px] border-text bg-transparent px-[26px] py-3.5 text-sm font-bold text-text"
				>
					Cancel search
				</button>
			</div>
		</div>
	{:else if status === 'matched'}
		<div
			class="hero-coral dot-grid flex min-h-[300px] flex-col justify-between rounded-[24px] p-11"
		>
			<span
				class="w-fit rounded-full bg-text px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.14em] text-primary uppercase"
				>Matched</span
			>
			<div>
				<div class="text-[44px] leading-none font-black tracking-[-0.045em]">Opponent found</div>
				<p class="mt-3 text-[15px] opacity-80">Redirecting to the draft…</p>
			</div>
		</div>
	{:else if status === 'error'}
		<div class="rounded-[24px] border border-border bg-surface p-11 text-center">
			<div class="text-[28px] font-black tracking-[-0.03em]">Something went wrong</div>
			<p class="mt-3 text-[15px] text-text-muted">{errorMessage}</p>
			<button
				onclick={startSearch}
				class="mt-6 cursor-pointer rounded-full bg-primary px-9 py-3.5 text-sm font-extrabold text-text"
			>
				Try again
			</button>
		</div>
	{/if}
</div>

<Toast />
