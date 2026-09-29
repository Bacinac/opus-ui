<script lang="ts">
	// How a search of the photographs was read, said under it: which Kata, which
	// place Beč turned out to be, and the words that named nothing. A shelf that
	// comes back empty or too full is otherwise a guess about why.
	import { request } from '../kit/http';
	import { i18n, t } from '../kit/i18n.svelte';

	type Term =
		| { kind: 'person'; said: string; people: { id: number; name: string }[] }
		| { kind: 'place'; said: string; places: { place: string; country: string }[] }
		| { kind: 'country'; said: string; countries: string[] }
		| { kind: 'years' | 'months'; said: string };

	let { search }: { search: string } = $props();

	let terms = $state<Term[]>([]);
	let unread = $state<string[]>([]);

	$effect(() => {
		const asked = search;
		request<{ terms: Term[]; unread: string[] }>(
			`/api/photos/search?q=${encodeURIComponent(asked)}`
		).then((d) => {
			if (!d || asked !== search) return;
			terms = d.terms;
			unread = d.unread;
		});
	});

	const regions = $derived(new Intl.DisplayNames([i18n.locale], { type: 'region' }));

	function shown(term: Term): string {
		switch (term.kind) {
			case 'person':
				return term.people.map((p) => p.name).join(' / ');
			case 'place':
				return term.places.map((p) => p.place).join(' / ');
			case 'country':
				return term.countries.map((c) => regions.of(c) ?? c).join(' / ');
			default:
				return term.said;
		}
	}
</script>

{#if terms.length || unread.length}
	<p class="read">
		{terms.map(shown).join(' · ')}
		{#if unread.length}
			<span class="unread">{t('photos.search.unread', { words: unread.join(', ') })}</span>
		{/if}
	</p>
{/if}

<style>
	.read {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 1rem;
		margin: 0 0 0.8rem;
		font-size: var(--fs-s);
	}
	.unread {
		color: var(--muted);
	}
</style>
