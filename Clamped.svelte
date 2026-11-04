<script lang="ts">
	// Text kept to a few lines, with the way to the rest of it right under the
	// last one. The clamp is CSS (`--lines`, 4 unless the place says otherwise),
	// so whether there IS more is a question about the rendered box, not about
	// the string: it moves with the width and height of the screen, and is
	// measured rather than guessed from a character count.

	import { t } from '../kit/i18n.svelte';

	let {
		text = '',
		opened = $bindable(false),
		beyond = false,
		class: name = '',
		...marks
	}: {
		text?: string;
		opened?: boolean;
		/** something besides the text opens with it, so the way in is there even
		 *  when the text itself fits */
		beyond?: boolean;
		/** the place's own typography for the paragraph */
		class?: string;
		/** attributes for the button — the hook a remote finds it by */
		[mark: string]: unknown;
	} = $props();

	let paragraph = $state<HTMLParagraphElement | null>(null);
	let over = $state(false);

	$effect(() => {
		void text;
		const box = paragraph;
		if (!box) return;
		const measure = () => {
			if (opened) return;
			over = box.scrollHeight > box.clientHeight + 1;
		};
		measure();
		const watch = new ResizeObserver(measure);
		watch.observe(box);
		return () => watch.disconnect();
	});
</script>

{#if text}
	<p class="clamped {name}" class:opened bind:this={paragraph}>{text}</p>
{/if}
{#if over || beyond}
	<button {...marks} class="more" type="button" onclick={() => (opened = !opened)}>
		{opened ? t('head.less') : t('head.more')}
	</button>
{/if}

<style>
	.clamped {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: var(--lines, 4);
		line-clamp: var(--lines, 4);
		overflow: hidden;
		white-space: pre-line;
	}
	.clamped.opened {
		-webkit-line-clamp: none;
		line-clamp: none;
		display: block;
		overflow: visible;
	}
	/* A line of its own for four words is a line spent on the way OUT of the
	   text rather than on the text. It sits tight under the last line it is
	   about, and what follows comes up to meet it. */
	.more {
		align-self: start;
		margin-top: 0.1rem;
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent);
		font: inherit;
		font-size: 0.9em;
		cursor: pointer;
		text-decoration: underline;
	}
	/* a remote's every move is a programmatic focus, which a WebView does not
	   always count as visible */
	:global(html.tv) .more:focus {
		outline: var(--focus-ring);
		outline-offset: var(--focus-offset, 3px);
	}
</style>
