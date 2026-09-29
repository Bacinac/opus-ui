<script lang="ts">
	// A module's about page: the OPUS mark with the module's initial, what the
	// suite is, and what this module alone does, in the module's own words.

	import { onMount } from 'svelte';
	import Page from '../kit/About.svelte';
	import { t } from '../kit/i18n.svelte';
	import Wordmark from './Wordmark.svelte';
	import { version } from './version.svelte';

	let {
		module,
		tagline,
		what,
		why,
		stack
	}: { module: string; tagline: string; what: string; why: string; stack: string } = $props();

	onMount(() => void version.boot());
</script>

<Page {tagline} intro={t('about.suite')} {what} {why} {stack} build={version.booted}>
	{#snippet brand()}<Wordmark {module} large />{/snippet}
</Page>
