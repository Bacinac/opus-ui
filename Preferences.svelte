<script lang="ts">
	// What the person reads the product in, rather than what the product does:
	// language and theme. Both are stored once for the whole of OPUS, so they
	// are set once, in the same place in every module — the account page.
	//
	// Two rows of choices are not two panels. They are sections of the card
	// about you, and the caller supplies the card.

	import { i18n, t, type Locale } from '../kit/i18n.svelte';
	import { theme, type Theme } from '../kit/theme.svelte';
	import Picks from '../kit/Picks.svelte';

	const LOCALES = [
		{ key: 'hr', label: 'Hrvatski' },
		{ key: 'en', label: 'English' }
	];
	const THEMES = $derived(
		(['light', 'dark', 'system'] as const).map((key) => ({ key, label: t(`theme.pick.${key}`) }))
	);
</script>

<section>
	<h3>{t('prefs.language')}</h3>
	<Picks picks={LOCALES} chosen={[i18n.locale]} onpick={(key) => i18n.set(key as Locale)} />
</section>

<section>
	<h3>{t('prefs.theme')}</h3>
	<Picks picks={THEMES} chosen={[theme.theme]} onpick={(key) => theme.setTheme(key as Theme)} />
</section>

<style>
	section {
		border-top: 1px solid var(--border);
		padding-top: 0.9rem;
	}
	h3 {
		margin: 0 0 0.55rem;
		font-size: var(--fs-l);
	}
</style>
