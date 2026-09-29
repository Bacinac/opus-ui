<script lang="ts">
	// A state said as a mark rather than a pill: a row with twenty-two of them
	// reads its states at a glance, and the words are on the pointer and for the
	// screen reader. Tinted by the same tones a Tag uses.

	import Icon from '../kit/Icon.svelte';
	import type { Tone } from '../kit/Tag.svelte';

	let {
		icon,
		text,
		tone = 'quiet',
		size = 18
	}: { icon: string; text: string; tone?: Tone; size?: number } = $props();
</script>

<span class="mark {tone}" title={text} role="img" aria-label={text}><Icon name={icon} {size} /></span>

<style>
	.mark {
		display: inline-flex;
		color: var(--muted);
	}
	.ok {
		color: var(--ok);
	}
	.warn {
		color: var(--warn);
	}
	.err {
		color: var(--danger);
	}
	.busy {
		color: var(--accent);
	}
</style>
