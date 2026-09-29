<script lang="ts">
	// The top of a page about one thing — a film, a series, a record, a person:
	// its picture behind it, its poster beside it, its name, when it is from and
	// what it is about. Every page about one thing opens with exactly this, and
	// what may be *done* about the thing is a snippet, since that is the half
	// where the pages genuinely differ.

	import type { Snippet } from 'svelte';
	import { t } from '../kit/i18n.svelte';

	let {
		title,
		subtitle = '',
		overview = '',
		poster = null,
		backdrop = null,
		count = '',
		amount = '',
		round = false,
		square = false,
		posterTitle = '',
		onposter,
		back,
		under,
		actions
	}: {
		title: string;
		subtitle?: string;
		overview?: string;
		poster?: string | null;
		backdrop?: string | null;
		/** a standing fact worth carrying beside the year — 94/179, 12 records */
		count?: string;
		/** how many of what the page holds — an artist's records, a series'
		 *  seasons — said in brackets after the name, where a ten-foot head that
		 *  keeps one line of facts has no room for a pill */
		amount?: string;
		/** a person rather than a work: their picture is a portrait, not a poster */
		round?: boolean;
		/** a record rather than a film: a sleeve is square, and a head that keeps
		 *  the height of a poster for one is a head with a hole in it */
		square?: boolean;
		/** the picture is also where it is changed: pressing it opens the choice */
		onposter?: () => void;
		posterTitle?: string;
		back?: Snippet;
		/** a line of the module's own under the facts — who directed it, who is in
		 *  the band — where the module needs the words to lead somewhere */
		under?: Snippet;
		actions?: Snippet;
	} = $props();

	// The head is the top of a page, not the page, so a long description is
	// clamped. But clamping without a way out is just text nobody can read:
	// whether there IS more is a question about the rendered box, not about the
	// string — the clamp moves with the height of the screen — so it is measured
	// rather than guessed from a character count.
	/** A picture that does not arrive is a picture the head must not keep room
	 *  for. The address can be the playing device's own artwork endpoint, which
	 *  answers for the device and not for us. */
	let lost = $state(false);
	$effect(() => {
		void poster;
		lost = false;
	});

	let paragraph = $state<HTMLParagraphElement | null>(null);
	let opened = $state(false);
	let over = $state(false);

	$effect(() => {
		// re-measure when the text changes or the box is resized
		void overview;
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

<header>
	{#if backdrop}<img class="backdrop" src={backdrop} alt="" />{/if}
	<div class="head" class:flat={round || square} class:bare={!poster || lost}>
		{#if poster && !lost}
			{#if onposter}
				<button class="picture" type="button" title={posterTitle} aria-label={posterTitle} onclick={onposter}>
					<img class="poster" class:round src={poster} alt="" onerror={() => (lost = true)} />
				</button>
			{:else}
				<img class="poster" class:round src={poster} alt="" onerror={() => (lost = true)} />
			{/if}
		{:else if onposter}
			<button class="picture blank" class:round type="button" title={posterTitle} aria-label={posterTitle} onclick={onposter}
			></button>
		{/if}
		<div class="what">
			{#if back}{@render back()}{/if}
			<h1>{title}{#if amount}<span class="amount">({amount})</span>{/if}</h1>
			{#if subtitle || count}
				<p class="line">
					{subtitle}
					{#if count}<span class="count">{count}</span>{/if}
				</p>
			{/if}
			{#if under}{@render under()}{/if}
			{#if overview}
				<p class="overview" class:opened bind:this={paragraph}>{overview}</p>
				{#if over}
					<button class="more" type="button" onclick={() => (opened = !opened)}>
						{opened ? t('head.less') : t('head.more')}
					</button>
				{/if}
			{/if}
			{#if actions}<div class="actions">{@render actions()}</div>{/if}
		</div>
	</div>
</header>

<style>
	/* The head is a card, and a surface may say what a card looks like: its
	   corners, its hairline, its ground. Where nothing says, it is what it has
	   always been — a picture behind the words with rounded corners of its own. */
	header {
		position: relative;
		margin-bottom: 0.9rem;
		padding: var(--card-air, 0);
		border: var(--card-line, none);
		border-radius: var(--card-radius, 14px);
		background: var(--card-ground, transparent);
		overflow: hidden;
	}
	.backdrop {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		/* the picture is the ground the words stand on, never their competition */
		opacity: 0.28;
		mask-image: linear-gradient(to bottom, black, transparent);
	}
	/* One height whatever stands in it. A poster is two by three, a portrait is a
	   circle and a page with no picture at all has neither — and letting each set
	   its own height meant what came next began on a different line on every
	   kind of page. */
	.head {
		/* A share of the screen rather than a measure taken off a desk. Ten feet
		   away it is the screen that varies — a head sized in rem alone takes
		   half of a short one, and everything under it goes over the edge. */
		--poster: var(--head-poster, clamp(7rem, 24vh, 11rem));
		position: relative;
		display: flex;
		gap: 1.5rem;
		/* the picture's own height, and the air above and below it: a poster is
		   two by three, a sleeve and a face are square */
		min-height: calc(var(--poster) * var(--tall, 1.5) + 2.6rem);
		padding: 1.2rem 0 0.9rem;
	}
	/* Nothing to hold the height for. A record with no sleeve kept the whole of
	   one anyway, so its title sat alone above three hundred empty pixels and
	   the first song began a third of the way down the screen. */
	.head.bare {
		min-height: 0;
	}
	.head.flat {
		--tall: 1;
	}
	.poster {
		width: var(--poster);
		border-radius: 12px;
		align-self: start;
	}
	.picture {
		flex: none;
		align-self: start;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
	}
	.picture .poster {
		display: block;
	}
	.picture.blank {
		width: var(--poster);
		aspect-ratio: 1;
		border-radius: 12px;
		background: var(--surface-2);
	}
	.picture.blank.round {
		border-radius: 50%;
	}
	.poster.round {
		aspect-ratio: 1;
		border-radius: 50%;
		object-fit: cover;
	}
	/* The words stand as tall as the picture beside them, and what may be done
	   about the thing sits on the poster's own bottom edge rather than floating
	   under it. The same head a record has: cover on the left, what it is on the
	   right, one height. */
	.what {
		min-width: 0;
		align-self: stretch;
		display: flex;
		flex-direction: column;
	}
	/* A name, not a headline. Left to the browser an h1 is two ems, which on a
	   screen read from a sofa is a title taller than the facts under it and a
	   card that no longer fits the screen it is drawn on. The surface may set
	   its own measure. */
	h1 {
		margin: 0.2rem 0 0.3rem;
		font-size: var(--head-title, var(--fs-2xl));
		line-height: 1.15;
		text-wrap: balance;
	}
	/* a margin and not a space: Svelte trims the space at the start of an element */
	.amount {
		margin-left: 0.35em;
		font-size: 0.55em;
		font-weight: 600;
		color: var(--accent);
	}
	.line {
		margin: 0 0 0.6rem;
		color: var(--muted);
	}
	.count {
		margin-left: 0.6rem;
		padding: 0.05rem 0.5rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		font-size: 0.85em;
	}
	/* However much there is to say, the head is the top of a page and not the
	   page: what does not fit is one press away on every screen that has one. */
	.overview {
		margin-bottom: 0;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		overflow: hidden;
		/* wide enough to use the room a desktop window gives, short of the line
		   length at which the eye loses its place coming back */
		max-width: 100ch;
		line-height: 1.55;
		white-space: pre-line;
	}
	.overview.opened {
		-webkit-line-clamp: none;
		line-clamp: none;
		display: block;
		overflow: visible;
	}
	/* A line of its own for four words is a line spent on the way OUT of the
	   text rather than on the text. It sits tight under the last line it is
	   about, and what follows the head comes up to meet it. */
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
	.actions {
		/* on the poster's bottom edge, whatever there was room to say above it */
		margin-top: auto;
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-top: 0.9rem;
	}
	/* a screen this short is one where four lines of description is a third of it */
	@media (max-height: 700px) {
		.overview:not(.opened) {
			-webkit-line-clamp: 3;
			line-clamp: 3;
		}
	}
	@media (max-height: 620px) {
		.overview:not(.opened) {
			-webkit-line-clamp: 2;
			line-clamp: 2;
		}
	}
	@media (max-width: 40rem) {
		.head {
			--poster: 7rem;
			flex-direction: column;
			min-height: 0;
		}
	}
</style>
