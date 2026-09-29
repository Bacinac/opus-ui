<script lang="ts">
	// The machines that call this module, each with a token of its own, for an
	// admin to carry to each by hand. A new token ends only its own consumer's:
	// the others keep working.

	import { json, request } from '../kit/http';
	import { t } from '../kit/i18n.svelte';
	import type { Word } from './i18n';
	import ArmedButton from '../kit/ArmedButton.svelte';
	import Button from '../kit/Button.svelte';

	type Held = { consumer: string; token: string };

	const NAMES: Record<string, Word> = {
		player: 'account.tokenFor.player',
		downloads: 'account.tokenFor.downloads',
		cameras: 'account.tokenFor.cameras',
		library: 'account.tokenFor.library',
		house: 'account.tokenFor.house'
	};

	let held = $state<Held[] | null>(null);
	let renewed = $state('');

	async function show() {
		const said = await request<{ tokens: Held[] }>('/api/auth/token');
		if (said) held = said.tokens;
	}

	async function issue(consumer: string) {
		const said = await request<Held>('/api/auth/token', json({ consumer }));
		if (!said) return;
		held = (held ?? []).map((row) => (row.consumer === consumer ? said : row));
		renewed = consumer;
	}
</script>

{#if held === null}
	<Button onclick={show}>{t('account.tokenShow')}</Button>
{:else}
	<div class="tokens">
		{#each held as row (row.consumer)}
			<div class="row">
				<span class="for">{NAMES[row.consumer] ? t(NAMES[row.consumer]) : row.consumer}</span>
				<div class="choices">
					{#if row.token}
						<code>{row.token}</code>
					{:else}
						<span class="none">{t('account.tokenNone')}</span>
					{/if}
					<ArmedButton tone="quiet" onconfirm={() => issue(row.consumer)}>
						{t('account.tokenNew')}
					</ArmedButton>
				</div>
				{#if renewed === row.consumer}<p class="done">{t('account.tokenIssued')}</p>{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.tokens {
		display: grid;
		gap: 0.9rem;
	}
	.row {
		display: grid;
		gap: 0.35rem;
	}
	.for {
		font-size: var(--fs-m);
		font-weight: 600;
	}
	.choices {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
	code {
		padding: 0.45rem 0.7rem;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--surface);
		font-size: var(--fs-s);
		word-break: break-all;
	}
	.none {
		color: var(--muted);
		font-size: var(--fs-m);
	}
	.done {
		margin: 0;
		color: var(--ok);
		font-size: var(--fs-m);
	}
</style>
