<script lang="ts" module>
	import type { Tone } from '../kit/Tag.svelte';

	/** A count with what it counts: the icon says which, the words are on the
	    pointer. */
	export type Count = { icon: string; n: string; text: string; tone?: Tone };
</script>

<script lang="ts">
	import Icon from '../kit/Icon.svelte';

	let { counts }: { counts: Count[] } = $props();
</script>

<span class="tally">
	{#each counts as count (count.icon)}
		{@const said = count.n ? `${count.n} ${count.text}` : count.text}
		<span class="count {count.tone ?? 'quiet'}" title={said} aria-label={said}>
			<Icon name={count.icon} size={15} />{count.n}
		</span>
	{/each}
</span>

<style>
	.tally {
		display: inline-flex;
		align-items: center;
		gap: 0.9rem;
		font-variant-numeric: tabular-nums;
	}
	.count {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--muted);
	}
	.ok {
		color: var(--ok);
	}
	.warn {
		color: var(--warn);
	}
	.busy {
		color: var(--accent);
	}
</style>
