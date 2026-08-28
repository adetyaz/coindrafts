<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from '$lib/toast';

	type DailyTerm = {
		id: string;
		term: string;
		definition: string;
		quizOptions: Array<{ label: string; value: string }>;
		xpReward: number;
		alreadyAnswered: boolean;
		previousAnswer: string | null;
		wasCorrect: boolean | null;
	};

	let dailyTerm = $state<DailyTerm | null>(null);
	let researchStreak = $state(0);
	let loading = $state(true);
	let submitting = $state(false);
	let selected = $state('');
	let result = $state<{ correct: boolean; xpEarned: number; correctOption: string } | null>(null);

	onMount(() => {
		loadTerm();
		loadStreak();
	});

	async function loadTerm() {
		loading = true;
		try {
			const res = await fetch('/api/term/today');
			dailyTerm = res.ok ? await res.json() : null;
		} catch {
			dailyTerm = null;
		} finally {
			loading = false;
		}
	}

	async function loadStreak() {
		try {
			const res = await fetch('/api/me');
			if (res.ok) researchStreak = (await res.json()).researchStreak ?? 0;
		} catch {
			// non-critical — streak just won't show this load
		}
	}

	async function submitAnswer() {
		if (!dailyTerm || !selected) return;
		submitting = true;
		try {
			const res = await fetch('/api/term/answer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ termId: dailyTerm.id, answer: selected })
			});
			const data = await res.json();
			if (res.ok) {
				result = data;
				toast(data.correct ? `+${data.xpEarned} XP!` : 'Not quite — see you tomorrow!', data.correct ? 'success' : 'error');
				loadStreak();
			} else {
				toast(data.error || 'Failed to submit', 'error');
			}
		} catch {
			toast('Submit failed', 'error');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="rounded-[20px] border border-border bg-surface p-[22px]">
	<div class="mb-4.5 flex items-center justify-between">
		<span class="text-[11px] font-extrabold tracking-[0.12em] text-text-muted uppercase">Term of the day</span>
		{#if researchStreak > 0}
			<span class="font-mono text-xs font-bold text-text-muted" title="Learning streak — reading an article or a term counts">
				{researchStreak} day streak
			</span>
		{/if}
	</div>

	{#if loading}
		<div class="h-24 animate-pulse rounded-2xl bg-surface-alt"></div>
	{:else if !dailyTerm}
		<p class="text-sm text-text-muted">No term available today. Check back tomorrow!</p>
	{:else if result}
		<div
			class="rounded-2xl p-4"
			style={result.correct ? 'background:rgba(104,194,168,0.12)' : 'background:rgba(232,112,112,0.1)'}
		>
			<p class="mb-1 text-sm font-extrabold" style="color:{result.correct ? 'var(--color-mint-ink)' : 'var(--color-red-ink)'}">
				{result.correct ? 'Correct!' : 'Not quite!'}
			</p>
			<p class="text-xs text-text-muted">
				{result.correct ? `+${result.xpEarned} XP earned` : `The right definition was: ${result.correctOption}`}
			</p>
		</div>
	{:else if dailyTerm.alreadyAnswered}
		<div class="rounded-2xl bg-surface-alt p-4">
			<p class="text-sm text-text-muted">
				You already learned today's term{dailyTerm.wasCorrect ? ' — and got the quiz right!' : ''}
			</p>
		</div>
	{:else}
		<div class="mb-3.5 rounded-2xl bg-surface-alt p-4">
			<p class="mb-1 font-mono text-sm font-extrabold text-primary-ink">{dailyTerm.term}</p>
			<p class="text-sm text-text-secondary">{dailyTerm.definition}</p>
		</div>
		<p class="mb-2 text-xs font-bold text-text-muted">Which one was it?</p>
		<div class="flex flex-col gap-2">
			{#each dailyTerm.quizOptions as opt (opt.value)}
				<button
					type="button"
					onclick={() => (selected = opt.value)}
					class="cursor-pointer rounded-xl border px-4 py-3 text-left text-sm font-bold transition-colors"
					style={selected === opt.value
						? 'border-color:var(--color-primary);background:var(--color-primary-muted);color:var(--color-primary-ink)'
						: 'border-color:var(--color-border);background:var(--color-surface);color:var(--color-text)'}
				>
					{opt.label}
				</button>
			{/each}
		</div>
		<button
			onclick={submitAnswer}
			disabled={!selected || submitting}
			class="mt-3.5 w-full rounded-full py-3 text-sm font-extrabold transition-colors {selected && !submitting
				? 'cursor-pointer bg-primary text-text hover:bg-primary-hover'
				: 'cursor-not-allowed bg-surface-alt text-text-muted'}"
		>
			{submitting ? 'Submitting…' : 'Submit answer'}
		</button>
		<div class="mt-3.5 font-mono text-xs font-bold text-primary-ink">+{dailyTerm.xpReward} XP</div>
	{/if}
</div>
