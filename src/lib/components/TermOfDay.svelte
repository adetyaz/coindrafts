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
	let selected = $state('');
	let loading = $state(true);
	let submitting = $state(false);
	let result = $state<{ correct: boolean; xpEarned: number; correctOption: string } | null>(null);

	onMount(loadTerm);

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
				toast(data.correct ? `+${data.xpEarned} XP!` : 'Not quite — come back tomorrow!', data.correct ? 'success' : 'error');
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
	<div class="mb-4.5 text-[11px] font-extrabold tracking-[0.12em] text-text-muted uppercase">Word of the day</div>

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
				{result.correct ? `+${result.xpEarned} XP earned` : `The correct answer was: ${result.correctOption}`}
			</p>
		</div>
	{:else if dailyTerm.alreadyAnswered}
		<div class="rounded-2xl bg-surface-alt p-4">
			<p class="text-sm text-text-muted">
				You already answered today{dailyTerm.wasCorrect ? ' — and got it right!' : ''}
			</p>
		</div>
	{:else}
		<div class="mb-3.5 rounded-2xl bg-surface-alt p-4">
			<p class="font-mono text-sm font-extrabold text-primary-ink">{dailyTerm.term}</p>
		</div>
		<p class="mb-4 text-[15px] leading-snug font-bold">What does "{dailyTerm.term}" mean?</p>
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
