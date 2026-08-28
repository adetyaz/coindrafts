<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Toast from '$lib/components/Toast.svelte';
	import { toast } from '$lib/toast';

	type OpenTournament = {
		id: string;
		name: string;
		contestType: string;
		payoutStructure: string;
		sectorRestriction: string | null;
		groupSize: number;
		status: string;
		createdBy: string;
		creatorName: string | null;
		participantCount: number;
	};

	type Group = {
		id: string;
		status: string;
		tournamentStage: number;
		size: number | null;
		winnerId: string | null;
		headcount: number;
	};

	type TournamentDetail = {
		id: string;
		name: string;
		contestType: string;
		payoutStructure: string;
		sectorRestriction: string | null;
		groupSize: number;
		status: string;
		createdBy: string;
		groups: Group[];
		myLobbyId: string | null;
	};

	const SECTORS = [
		{ id: '', label: 'No restriction' },
		{ id: 'l1', label: 'L1 only' },
		{ id: 'l2', label: 'L2 only' },
		{ id: 'defi', label: 'DeFi only' },
		{ id: 'meme', label: 'Meme only' },
		{ id: 'wildcard', label: 'Wildcard only' }
	];

	let view = $state<'menu' | 'create' | 'browse' | 'status'>('menu');
	let open = $state<OpenTournament[]>([]);
	let detail = $state<TournamentDetail | null>(null);
	let myUserId = $state('');
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	// Create form
	let name = $state('');
	let contestType = $state<'daily' | 'weekly'>('daily');
	let payoutStructure = $state<'winner_take_all' | 'top3_weighted'>('winner_take_all');
	let sectorRestriction = $state('');
	let groupSize = $state(4);
	let creating = $state(false);

	onMount(() => {
		loadMe();
	});

	onDestroy(() => stopPolling());

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	}

	async function loadMe() {
		const res = await fetch('/api/me');
		if (res.ok) myUserId = (await res.json()).id;
	}

	async function showBrowse() {
		view = 'browse';
		const res = await fetch('/api/tournaments?status=open');
		if (res.ok) open = await res.json();
	}

	async function createTournament() {
		if (!name.trim()) {
			toast('Give your tournament a name', 'error');
			return;
		}
		creating = true;
		try {
			const res = await fetch('/api/tournaments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					contestType,
					payoutStructure,
					sectorRestriction: sectorRestriction || undefined,
					groupSize
				})
			});
			if (res.status === 401) {
				window.location.href = '/?auth=required';
				return;
			}
			if (!res.ok) throw new Error('Failed to create tournament');
			const t = await res.json();
			await joinAndWatch(t.id);
		} catch {
			toast('Failed to create tournament', 'error');
		} finally {
			creating = false;
		}
	}

	async function joinAndWatch(tournamentId: string) {
		const res = await fetch(`/api/tournament/${tournamentId}/join`, { method: 'POST' });
		if (res.status === 401) {
			window.location.href = '/?auth=required';
			return;
		}
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			toast(err.error === 'closed' ? 'Registration for this tournament is closed' : 'Failed to join', 'error');
			return;
		}
		if (!myUserId) await loadMe();
		watchTournament(tournamentId);
	}

	function watchTournament(tournamentId: string) {
		view = 'status';
		stopPolling();
		pollDetail(tournamentId);
		pollTimer = setInterval(() => pollDetail(tournamentId), 3000);
	}

	async function pollDetail(tournamentId: string) {
		const res = await fetch(`/api/tournament/${tournamentId}`);
		if (!res.ok) return;
		const d: TournamentDetail = await res.json();
		detail = d;

		if (d.myLobbyId) {
			const mine = d.groups.find((g) => g.id === d.myLobbyId);
			if (mine && mine.status !== 'waiting') {
				stopPolling();
				toast('Bracket underway — heading to draft!', 'success');
				goto(resolve(`/draft?lobbyId=${d.myLobbyId}`));
			}
		}
	}

	async function closeRegistration() {
		if (!detail) return;
		const res = await fetch(`/api/tournament/${detail.id}/close-registration`, { method: 'POST' });
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			toast(err.error ?? 'Failed to close registration', 'error');
			return;
		}
		toast('Registration closed — bracket starting', 'success');
	}

	function backToMenu() {
		stopPolling();
		detail = null;
		view = 'menu';
	}
</script>

<div class="mx-auto max-w-[900px] px-7 py-14">
	{#if view === 'menu'}
		<div class="mb-2.5 font-mono text-[11px] font-bold tracking-[0.14em] text-primary-ink uppercase">
			Tournament
		</div>
		<h1 class="text-[40px] leading-none font-black tracking-[-0.04em]">Public tournaments</h1>
		<p class="mt-2 max-w-[52ch] text-sm text-text-muted">
			Free to play — winner-take-all or a top-3 XP split, brackets of qualifier groups feeding into a
			final. Private and sponsor-funded tournaments are coming once real-money staking exists.
		</p>
		<div class="mt-6 flex flex-wrap gap-2.5">
			<button
				class="cursor-pointer rounded-full bg-primary px-6 py-3.5 text-sm font-extrabold text-text"
				onclick={() => (view = 'create')}
			>
				Create a tournament
			</button>
			<button
				class="cursor-pointer rounded-full border-[1.5px] border-text bg-transparent px-6 py-3.5 text-sm font-bold text-text"
				onclick={showBrowse}
			>
				Browse open tournaments
			</button>
		</div>
	{:else if view === 'create'}
		<button class="mb-4 cursor-pointer text-xs font-bold text-text-muted" onclick={backToMenu}>&larr; Back</button>
		<h1 class="text-[32px] leading-none font-black tracking-[-0.03em]">Create a tournament</h1>
		<div class="mt-6 flex flex-col gap-4 rounded-[20px] border border-border bg-surface p-6">
			<label class="flex flex-col gap-1.5 text-sm font-bold">
				Name
				<input
					bind:value={name}
					maxlength="80"
					placeholder="Friday Night Draft-Off"
					class="rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm font-normal"
				/>
			</label>
			<label class="flex flex-col gap-1.5 text-sm font-bold">
				Duration
				<select bind:value={contestType} class="rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm font-normal">
					<option value="daily">Daily · 24h</option>
					<option value="weekly">Weekly · 7d, 2x XP</option>
				</select>
			</label>
			<label class="flex flex-col gap-1.5 text-sm font-bold">
				Payout structure (XP)
				<select bind:value={payoutStructure} class="rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm font-normal">
					<option value="winner_take_all">Winner takes all</option>
					<option value="top3_weighted">Top-3 split (30 / 25 / 23)</option>
				</select>
			</label>
			<label class="flex flex-col gap-1.5 text-sm font-bold">
				Sector restriction
				<select bind:value={sectorRestriction} class="rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm font-normal">
					{#each SECTORS as s (s.id)}
						<option value={s.id}>{s.label}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1.5 text-sm font-bold">
				Players per qualifier group
				<input
					type="number"
					min="2"
					bind:value={groupSize}
					class="rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 text-sm font-normal"
				/>
			</label>
			<button
				disabled={creating}
				onclick={createTournament}
				class="mt-2 cursor-pointer rounded-full bg-primary px-6 py-3.5 text-sm font-extrabold text-text disabled:opacity-60"
			>
				{creating ? 'Creating…' : 'Create & join'}
			</button>
		</div>
	{:else if view === 'browse'}
		<button class="mb-4 cursor-pointer text-xs font-bold text-text-muted" onclick={backToMenu}>&larr; Back</button>
		<h1 class="text-[32px] leading-none font-black tracking-[-0.03em]">Open tournaments</h1>
		{#if open.length === 0}
			<p class="mt-4 text-sm text-text-muted">
				Nothing open right now.
				<button class="cursor-pointer font-bold text-primary-ink underline" onclick={() => (view = 'create')}>Create one</button>
			</p>
		{:else}
			<div class="mt-4 flex flex-col gap-2.5">
				{#each open as t (t.id)}
					<div class="flex items-center justify-between gap-3 rounded-[16px] border border-border bg-surface p-4">
						<div>
							<div class="text-sm font-extrabold">{t.name}</div>
							<div class="mt-1 text-xs text-text-muted">
								{t.contestType === 'weekly' ? 'Weekly' : 'Daily'} &middot;
								{t.payoutStructure === 'winner_take_all' ? 'Winner takes all' : 'Top-3 split'}
								{#if t.sectorRestriction}&middot; {t.sectorRestriction.toUpperCase()}-only{/if}
								&middot; {t.participantCount} joined
							</div>
						</div>
						<button
							class="cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-text"
							onclick={() => joinAndWatch(t.id)}
						>
							Join
						</button>
					</div>
				{/each}
			</div>
		{/if}
	{:else if view === 'status' && detail}
		<div class="mb-2.5 font-mono text-[11px] font-bold tracking-[0.14em] text-primary-ink uppercase">
			{detail.status === 'open' ? 'Registration open' : detail.status === 'active' ? 'Bracket underway' : 'Resolved'}
		</div>
		<h1 class="text-[32px] leading-none font-black tracking-[-0.03em]">{detail.name}</h1>
		<p class="mt-2 text-sm text-text-muted">
			{detail.groups.filter((g) => g.tournamentStage === 0).length} qualifier group(s) &middot;
			{detail.groups.reduce((n, g) => n + g.headcount, 0)} player(s) joined so far
		</p>
		<div class="mt-5 flex flex-col gap-2.5">
			{#each detail.groups as g (g.id)}
				<div class="flex items-center justify-between rounded-[16px] border border-border bg-surface p-4">
					<span class="text-sm font-bold">
						{g.tournamentStage === 1 ? 'Final' : 'Qualifier group'}
						{g.id === detail.myLobbyId ? ' (you)' : ''}
					</span>
					<span class="font-mono text-xs text-text-muted">
						{g.headcount}{g.size ? `/${g.size}` : ''} &middot; {g.status}
					</span>
				</div>
			{/each}
		</div>
		{#if detail.status === 'open' && detail.createdBy === myUserId}
			<button
				class="mt-6 cursor-pointer rounded-full bg-primary px-6 py-3.5 text-sm font-extrabold text-text"
				onclick={closeRegistration}
			>
				Close registration & start bracket
			</button>
			<p class="mt-2 text-xs text-text-muted">
				Groups with 2+ players start; anything smaller is dropped, no penalty.
			</p>
		{/if}
	{/if}
</div>

<Toast />
