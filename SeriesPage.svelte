<script lang="ts" module>
	import type { Tone } from '../kit/Tag.svelte';
	import type { Count } from './Tally.svelte';

	/** With an icon it is said as a mark, its words on the pointer. */
	export type PageTag = { text: string; tone?: Tone; title?: string; icon?: string };

	/** One line of a season, already in the words the module wants shown. The
	    module maps its own payload onto this — the page does not know what a
	    status, a subtitle language or a file is. */
	export type PageEpisode = {
		key: string | number;
		number: number | string;
		title: string;
		description?: string;
		/** a still of it; null where the series has stills and this one has none */
		image?: string | null;
		/** minutes */
		runtime?: number | null;
		/** the words for "seen", when this profile has seen it */
		seen?: string;
		/** how far into it this profile got, 0 to 1 */
		part?: number;
		/** here but not available: unaired, unfetched, unplayable */
		dim?: boolean;
		onpick?: () => void;
		onhold?: () => void;
		/** a date, or anything else read before the tags */
		note?: string;
		/** the note is the reason there is nothing here yet, so it is worth reading */
		noteWarns?: boolean;
		tags?: PageTag[];
	};

	export type PageSeason = {
		key: string | number;
		title: string;
		counts?: Count[];
		episodes: PageEpisode[];
	};
</script>

<script lang="ts">
	// A series, whole: the head, one season at a time, the lines inside it. Both
	// modules that show a series show exactly this page — one operates on it and
	// one plays it, which is a difference in the buttons and in what each line
	// says, not in what the page is. Sharing the parts was not enough: the
	// assembling was still written twice and could still drift apart a spacing
	// at a time.
	//
	// Everything variable arrives as a snippet or as already-worded data, so the
	// package holds no vocabulary of the thing itself: no status names, no
	// opinion about what an episode is.

	import type { Snippet } from 'svelte';
	import EpisodeRow from './EpisodeRow.svelte';
	import MediaHead from './MediaHead.svelte';
	import StateMark from './StateMark.svelte';
	import Tally from './Tally.svelte';
	import Tag from '../kit/Tag.svelte';

	let {
		title,
		subtitle = '',
		overview = '',
		poster = null,
		backdrop = null,
		count = '',
		seasons,
		season = $bindable(null),
		back,
		under,
		before,
		controls,
		actions,
		seasonActions,
		episodeActions
	}: {
		title: string;
		subtitle?: string;
		overview?: string;
		poster?: string | null;
		backdrop?: string | null;
		count?: string;
		seasons: PageSeason[];
		/** the key of the season on the page; the caller owns it so that
		    arriving at a series can open on the one worth watching. Unset, it is
		    the first. */
		season?: string | number | null;
		back?: Snippet;
		/** a line of the module's own under the facts — who made it */
		under?: Snippet;
		/** what the module knows about the whole of it, between the head and the
		 *  seasons: what this copy is, who is in it. A series is a thing before
		 *  it is a list of episodes. */
		before?: Snippet;
		/** what may be done to the whole series, on the line the season opens with */
		controls?: Snippet;
		actions?: Snippet;
		seasonActions?: Snippet<[PageSeason]>;
		/** what may be done to one line — grabbing it by hand, forgetting it. The
		    module decides per episode whether anything may be. */
		episodeActions?: Snippet<[PageEpisode]>;
	} = $props();

	let current = $derived(seasons.find((one) => one.key === season) ?? seasons[0] ?? null);
	// one line with a still makes every line keep the column for one
	let pictured = $derived(seasons.some((one) => one.episodes.some((e) => e.image)));

	function choose(event: Event) {
		const picked = seasons[Number((event.currentTarget as HTMLSelectElement).value)];
		if (picked) season = picked.key;
	}
</script>

<MediaHead {title} {subtitle} {overview} {poster} {backdrop} {count} {back} {under} {actions} />

{#if before}{@render before()}{/if}

{#if current}
	<div class="season">
		<div class="which">
			{#if seasons.length > 1}
				<select value={seasons.indexOf(current)} onchange={choose}>
					{#each seasons as one, i (one.key)}
						<option value={i}>{one.title}</option>
					{/each}
				</select>
			{:else}
				<span class="alone">{current.title}</span>
			{/if}
			{#if current.counts?.length}<Tally counts={current.counts} />{/if}
		</div>
		<div class="do">
			{#if seasonActions}{@render seasonActions(current)}{/if}
			{#if controls}{@render controls()}{/if}
		</div>
	</div>

	<div class="episodes" class:pictured>
		{#each current.episodes as episode (episode.key)}
			<EpisodeRow
				number={episode.number}
				title={episode.title}
				description={episode.description ?? ''}
				image={pictured ? (episode.image ?? null) : undefined}
				runtime={episode.runtime ?? null}
				seen={episode.seen ?? ''}
				part={episode.part ?? 0}
				dim={episode.dim ?? false}
				onpick={episode.onpick}
				onhold={episode.onhold}
			>
				{#snippet actions()}
					{#if episodeActions}{@render episodeActions(episode)}{/if}
				{/snippet}
				{#snippet meta()}
					{#if episode.note}
						<span class="note" class:warns={episode.noteWarns}>{episode.note}</span>
					{/if}
					{#each episode.tags ?? [] as tag (tag.text)}
						{#if tag.icon}
							<StateMark icon={tag.icon} tone={tag.tone} text={tag.title ? `${tag.text} · ${tag.title}` : tag.text} />
						{:else}
							<Tag tone={tag.tone ?? 'fact'} title={tag.title ?? ''}>{tag.text}</Tag>
						{/if}
					{/each}
				{/snippet}
			</EpisodeRow>
		{/each}
	</div>
{:else if controls}
	<div class="season"><span></span><div class="do">{@render controls()}</div></div>
{/if}

<style>
	/* the line a season opens with: which season and how much of it, on the
	   left; what may be done to it and to the whole series, on the right */
	.season {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		margin-bottom: 0.8rem;
	}
	.which,
	.do {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}
	.which select,
	.alone {
		font-weight: 600;
		font-size: var(--fs-l);
	}
	.which select {
		cursor: pointer;
	}
	.episodes {
		display: grid;
		gap: 0.15rem;
		padding: 0.4rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-m);
		background: var(--surface);
	}
	.episodes.pictured {
		gap: 0.3rem;
	}
	.note {
		font-size: var(--fs-s);
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.note.warns {
		color: var(--warn);
		font-weight: 600;
	}
</style>
