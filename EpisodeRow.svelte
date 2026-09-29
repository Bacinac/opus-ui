<script lang="ts">
	// One line of a list of numbered things: its number, its name, what it is
	// about if there is room to say, and whatever the module wants to put on the
	// right — a size, a state, a chip, a button.
	//
	// The row is not itself a button. One module plays what it lists and the other
	// operates on it, and a button holding buttons is invalid where it is not
	// unreachable, so the name is the target when there is one and the actions sit
	// beside it either way.

	import type { Snippet } from 'svelte';
	import Icon from '../kit/Icon.svelte';
	import { hold } from '../kit/hold';
	import { formatRuntime } from '../kit/i18n.svelte';

	let {
		number,
		title,
		description = '',
		image,
		runtime = null,
		seen = '',
		part = 0,
		dim = false,
		onpick,
		onhold,
		meta,
		actions
	}: {
		number: number | string;
		title: string;
		/** shown under the title where a module asks for it; clamped to two lines */
		description?: string;
		/** a still beside the title; null draws the empty frame, so a list where
		    some lines have one keeps its column */
		image?: string | null;
		/** minutes */
		runtime?: number | null;
		/** the words for "this profile has seen it"; empty when it has not */
		seen?: string;
		/** how far into it this profile got, 0 to 1 */
		part?: number;
		/** nothing can be done with this one — it is here but not available */
		dim?: boolean;
		onpick?: () => void;
		/** what the line offers besides its obvious use, for a hold or a right click */
		onhold?: () => void;
		meta?: Snippet;
		actions?: Snippet;
	} = $props();

	let pictured = $derived(image !== undefined);
	let filled = $derived(seen ? 1 : Math.min(Math.max(part, 0), 1));
	let length = $derived(formatRuntime(runtime));
</script>

{#snippet what()}
	{#if pictured}
		<span class="thumb">
			{#if image}<img src={image} alt="" loading="lazy" />{/if}
			{#if onpick && !dim}<span class="go"><Icon name="play" size={22} /></span>{/if}
			{#if filled > 0}<span class="bar"><span style:width="{filled * 100}%"></span></span>{/if}
		</span>
	{/if}
	<span class="text">
		<span class="line">
			<span class="title">{title}</span>
			{#if length}<span class="runtime">{length}</span>{/if}
		</span>
		{#if description}<span class="description">{description}</span>{/if}
		{#if !pictured && part > 0 && !seen}<span class="bar"><span style:width="{filled * 100}%"></span></span>{/if}
	</span>
{/snippet}

<div class="row" class:dim class:pictured class:holds={!!onhold} use:hold={onhold}>
	{#if seen}
		<span class="num seen" title={seen} aria-label={seen}><Icon name="check" size={20} /></span>
	{:else}
		<span class="num">{number}</span>
	{/if}
	{#if onpick}
		<button class="what" onclick={onpick}>{@render what()}</button>
	{:else}
		<div class="what still">{@render what()}</div>
	{/if}
	{#if meta}<span class="meta">{@render meta()}</span>{/if}
	{#if actions}<span class="actions">{@render actions()}</span>{/if}
</div>

<style>
	.row {
		display: grid;
		grid-template-columns: 2.2rem 1fr auto auto;
		align-items: baseline;
		gap: 0.7rem;
		border-radius: var(--radius-s);
	}
	.row.holds {
		-webkit-touch-callout: none;
		user-select: none;
	}
	.row.pictured {
		align-items: center;
	}
	.row.dim .what,
	.row.dim .num {
		opacity: 0.55;
	}
	.num {
		padding: 0.55rem 0;
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}
	.pictured .num {
		font-size: var(--fs-xl);
	}
	.num.seen {
		display: flex;
		justify-content: flex-end;
		color: var(--accent);
	}
	.what {
		display: grid;
		gap: 0.15rem;
		min-width: 0;
		padding: 0.55rem 0.4rem;
		border: 1px solid transparent;
		border-radius: var(--radius-s);
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
	}
	.pictured .what {
		grid-template-columns: 10rem 1fr;
		align-items: center;
		gap: 0.9rem;
	}
	button.what {
		cursor: pointer;
	}
	button.what:hover,
	button.what:focus-visible {
		background: color-mix(in srgb, var(--accent) 14%, transparent);
		border-color: var(--border);
	}
	.thumb {
		position: relative;
		aspect-ratio: 16 / 9;
		border-radius: var(--radius-s);
		overflow: hidden;
		background: var(--surface-2);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.go {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: var(--on-picture);
		background: var(--veil-thin);
		opacity: 0;
		transition: opacity 120ms ease;
	}
	button.what:hover .go,
	button.what:focus-visible .go {
		opacity: 1;
	}
	.bar {
		display: block;
		height: 3px;
		background: color-mix(in srgb, var(--muted) 45%, transparent);
	}
	.thumb .bar {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 4px;
	}
	.text .bar {
		margin-top: 0.3rem;
		max-width: 12rem;
		border-radius: 2px;
		overflow: hidden;
	}
	.bar > span {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.text {
		display: grid;
		gap: 0.2rem;
		min-width: 0;
	}
	.line {
		display: flex;
		align-items: baseline;
		gap: 0.8rem;
		min-width: 0;
	}
	.title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pictured .title {
		font-weight: 600;
	}
	.runtime {
		margin-left: auto;
		flex: none;
		font-size: 0.85em;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.description {
		font-size: 0.85em;
		line-height: 1.4;
		color: var(--muted);
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		white-space: normal;
	}
	/* A line of a list is dense by nature: what is on the right of it is a size,
	   a language, a state — furniture beside the name, not statements of their
	   own. A pill sized for the top of a screen is a pill that crowds twenty-two
	   of these off the bottom of one. */
	.meta,
	.actions {
		--tag-font: 0.78em;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85em;
		color: var(--muted);
		white-space: nowrap;
	}
	@media (max-width: 640px) {
		.row.pictured {
			grid-template-columns: 1.6rem 1fr auto;
		}
		.pictured .what {
			grid-template-columns: 7rem 1fr;
			gap: 0.6rem;
		}
		.pictured .title {
			white-space: normal;
		}
		.pictured .meta {
			grid-column: 2;
			flex-wrap: wrap;
		}
		.pictured .actions {
			grid-column: 3;
		}
	}
</style>
