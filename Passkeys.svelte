<script lang="ts">
	// The keys a person's own devices hold for OPUS. They are kept where the
	// roster is, so they are added and taken back only there; every door takes
	// them.

	import { json, request } from '../kit/http';
	import { t, formatDateTime } from '../kit/i18n.svelte';
	import type { Word } from './i18n';
	import ArmedButton from '../kit/ArmedButton.svelte';
	import Button from '../kit/Button.svelte';
	import Field from '../kit/Field.svelte';
	import { balked, makeKey, passkeyHere } from './passkey';

	type Key = { id: number; name: string; created_at: string; used_at: string | null };

	let keys = $state<Key[]>([]);
	let asking = $state(false);
	let current = $state('');
	let working = $state(false);
	let problem = $state<Word | ''>('');
	let added = $state(false);

	load();

	async function load() {
		const said = await request<{ passkeys: Key[] }>('/api/auth/passkeys');
		if (said) keys = said.passkeys;
	}

	async function add(event: SubmitEvent) {
		event.preventDefault();
		added = false;
		if (!current) {
			problem = 'account.passkeyConfirm';
			return;
		}
		working = true;
		problem = '';
		const refused = (word: Word) => () => (problem = word);
		const options = await request<PublicKeyCredentialCreationOptionsJSON>(
			'/api/auth/passkeys/options',
			json({ current }),
			{ on: { 401: refused('account.err.rejected'), 429: refused('login.tooMany') } }
		);
		let credential;
		try {
			credential = options && (await makeKey(options));
		} catch (why) {
			const said = balked(why);
			if (said !== 'cancelled')
				problem = said === 'exists' ? 'account.passkeyExists' : 'account.passkeyFailed';
		}
		const made =
			credential &&
			(await request('/api/auth/passkeys', json({ credential }), {
				on: { 400: refused('account.passkeyFailed') }
			}));
		working = false;
		if (!made) return;
		current = '';
		asking = false;
		added = true;
		await load();
	}

	async function remove(key: Key) {
		working = true;
		const gone = await request(`/api/auth/passkeys/${key.id}`, { method: 'DELETE' });
		working = false;
		if (gone) await load();
	}
</script>

<section>
	<h3>{t('account.passkeys')}</h3>
	<p class="quiet">{t('account.passkeyHint')}</p>
	{#if keys.length}
		<ul>
			{#each keys as key (key.id)}
				<li>
					<div class="what">
						<span class="named">{key.name || t('account.passkeys')}</span>
						<span class="quiet">
							{key.used_at
								? t('account.passkeyUsed', { when: formatDateTime(key.used_at) })
								: t('account.passkeyMade', { when: formatDateTime(key.created_at) })}
						</span>
					</div>
					<ArmedButton onconfirm={() => remove(key)} disabled={working}>
						{t('account.passkeyRemove')}
					</ArmedButton>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="quiet">{t('account.passkeyNone')}</p>
	{/if}
	{#if added}<p class="done">{t('account.passkeyAdded')}</p>{/if}
	{#if asking}
		<form onsubmit={add} novalidate>
			<Field id="pk" type="password" label={t('account.current')} bind:value={current}
				autocomplete="current-password" />
			{#if problem}<p class="problem">{t(problem)}</p>{/if}
			<Button type="submit" tone="primary" disabled={working}>{t('account.passkeyContinue')}</Button>
		</form>
	{:else if passkeyHere()}
		<Button onclick={() => ((asking = true), (added = false))}>{t('account.passkeyAdd')}</Button>
	{/if}
</section>

<style>
	section {
		border-top: 1px solid var(--border);
		padding-top: 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		align-items: flex-start;
	}
	h3 {
		margin: 0;
		font-size: var(--fs-l);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		width: 100%;
	}
	li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 0.55rem 0.75rem;
	}
	.what {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}
	.named {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.quiet {
		margin: 0;
		color: var(--muted);
		font-size: var(--fs-m);
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		align-items: flex-start;
		width: 100%;
	}
	.problem {
		margin: 0;
		color: var(--warn);
		font-size: var(--fs-m);
	}
	.done {
		margin: 0;
		color: var(--ok);
		font-size: var(--fs-m);
	}
</style>
