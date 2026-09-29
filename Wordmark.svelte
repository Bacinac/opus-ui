<script lang="ts">
	import downloads from './marks/opus-downloads.svg';
	import library from './marks/opus-library.svg';
	import player from './marks/opus-player.svg';

	let { module, large = false }: { module: string; large?: boolean } = $props();

	const lockups: Record<string, string> = { D: downloads, L: library, P: player };
	const src = $derived(lockups[module.slice(0, 1).toUpperCase()] ?? player);
</script>

<img class="brandmark" class:large {src} alt="OPUS {module}" />

<style>
	.brandmark {
		display: block;
		height: 1.35rem;
		width: auto;
	}
	.large {
		height: 3rem;
	}
</style>
