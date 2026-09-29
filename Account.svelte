<script lang="ts">
	// What belongs to the person rather than to the module: the login that opens
	// OPUS, what they read it in, and the tokens other modules call with. Every
	// module answers the same three endpoints and drew its own version of this
	// page — or, in one of them, did not draw it at all and left the password
	// among the settings. One page, rendered by each module's /account route.

	import { json, request } from '../kit/http';
	import { t } from '../kit/i18n.svelte';
	import type { Word } from './i18n';
	import { me } from './me.svelte';
	import Button from '../kit/Button.svelte';
	import Card from '../kit/Card.svelte';
	import Field from '../kit/Field.svelte';
	import Preferences from './Preferences.svelte';
	import People from './People.svelte';
	import Devices from './Devices.svelte';
	import Tokens from './Tokens.svelte';
	import Passkeys from './Passkeys.svelte';

	// Only the module that owns the roster draws it; the others hold no names.
	// The same flag draws the boxes that were let in, because they are the same
	// question asked about a different kind of thing — who is in this house, and
	// what is. Whether this particular person may see either is theirs to ask.
	let { roster = false }: { roster?: boolean } = $props();

	let current = $state('');
	let next = $state('');
	let repeat = $state('');
	let working = $state(false);
	let problem = $state<Word | ''>('');
	let changed = $state(false);

	async function changePassword(event: SubmitEvent) {
		event.preventDefault();
		changed = false;
		if (!current || !next) {
			problem = 'account.err.blank';
			return;
		}
		if (next !== repeat) {
			problem = 'account.err.mismatch';
			return;
		}
		working = true;
		problem = '';
		const refused = (word: Word) => () => (problem = word);
		const done = await request('/api/auth/password', json({ current, password: next }), {
			on: {
				400: refused('people.err.short'),
				401: refused('account.err.rejected'),
				429: refused('login.tooMany'),
				500: refused('login.unavailable'),
				502: refused('login.unavailable'),
				503: refused('login.unavailable'),
				504: refused('login.unavailable')
			}
		});
		working = false;
		if (!done) return;
		current = next = repeat = '';
		changed = true;
	}
</script>

<div class="page" class:alone={!roster || !me.admin}>
	<div class="mine">
		<Card title={t('account.yours')}>
			<form onsubmit={changePassword} novalidate>
				<h3>{t('account.password')}</h3>
				<Field id="c" type="password" label={t('account.current')} bind:value={current}
					autocomplete="current-password" />
				<Field id="n" type="password" label={t('account.new')} bind:value={next}
					autocomplete="new-password" />
				<Field id="r" type="password" label={t('account.repeat')} bind:value={repeat}
					autocomplete="new-password" />
				{#if problem}<p class="problem">{t(problem)}</p>{/if}
				{#if changed}<p class="done">{t('account.changed')}</p>{/if}
				<Button type="submit" tone="primary" disabled={working}>
					{working ? t('common.saving') : t('common.save')}
				</Button>
			</form>

			{#if roster && me.passkey}<Passkeys />{/if}

			<Preferences />

			{#if me.admin}
				<section>
					<h3>{t('account.token')}</h3>
					<Tokens />
				</section>
			{/if}
		</Card>
	</div>

	{#if roster && me.admin}
		<div class="house"><People /><Devices /></div>
	{/if}
</div>

<style>
	/* Two things, and they are not alike: what belongs to the person reading
	   this, and who is allowed in at all. Six panels adrift in an auto-fitting
	   grid was neither — it read as debris, which is what it was. */
	.page {
		display: grid;
		gap: 1.25rem;
		align-items: start;
	}
	@media (min-width: 62rem) {
		.page {
			grid-template-columns: 23rem minmax(0, 1fr);
		}
		/* nothing to sit beside it, so it does not stretch to fill a screen it
		   has no use for */
		.page.alone {
			grid-template-columns: 30rem;
		}
	}
	.mine,
	.house {
		display: grid;
		gap: 1.25rem;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		align-items: flex-start;
		padding-bottom: 1rem;
	}
	h3 {
		margin: 0 0 0.35rem;
		font-size: var(--fs-l);
	}
	section {
		border-top: 1px solid var(--border);
		padding-top: 0.9rem;
	}
	section h3 {
		margin-bottom: 0.55rem;
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
