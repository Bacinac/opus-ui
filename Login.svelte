<script lang="ts">
	// The one door, the same in every module. Shown instead of the app, not over
	// it — an install that requires a login has nothing to show behind the form
	// anyway, since every route the app would call answers 401 until this
	// succeeds.

	import { json, request } from '../kit/http';
	import { t } from '../kit/i18n.svelte';
	import type { Word } from './i18n';
	import Button from '../kit/Button.svelte';
	import Card from '../kit/Card.svelte';
	import Field from '../kit/Field.svelte';
	import Wordmark from './Wordmark.svelte';
	import { me } from './me.svelte';
	import { balked, passkeyHere, signWith } from './passkey';

	let {
		module,
		onin,
		also
	}: {
		module: string;
		onin: () => void;
		/** what else this module's door wants to know at the moment somebody
		 *  arrives. The package has no opinion about it: a player cares which
		 *  surface is asking, because what it hands back differs, and a library
		 *  has no surfaces at all. */
		also?: Record<string, string>;
	} = $props();

	let username = $state('');
	let password = $state('');
	let working = $state(false);
	let problem = $state<Word | ''>('');

	const said = (word: Word) => () => (problem = word);
	const unavailable = said('login.unavailable');
	const down = { 500: unavailable, 502: unavailable, 503: unavailable, 504: unavailable };
	const offered = $derived(me.passkey && passkeyHere());

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!username || !password) {
			problem = 'login.missing';
			return;
		}
		working = true;
		problem = '';
		const inside = await request('/api/auth/login', json({ username, password, ...also }), {
			on: { 401: said('login.failed'), 429: said('login.tooMany'), ...down }
		});
		working = false;
		if (!inside) return;
		password = '';
		onin();
	}

	async function withPasskey() {
		working = true;
		problem = '';
		const options = await request<PublicKeyCredentialRequestOptionsJSON>(
			'/api/auth/passkey/options',
			{ method: 'POST' },
			{ on: down }
		);
		let credential;
		try {
			credential = options && (await signWith(options));
		} catch (why) {
			if (balked(why) !== 'cancelled') problem = 'login.passkeyFailed';
		}
		const inside =
			credential &&
			(await request('/api/auth/passkey/login', json({ credential, ...also }), {
				on: { 401: said('login.passkeyFailed'), ...down }
			}));
		working = false;
		if (inside) onin();
	}
</script>

<main>
	<Card>
		<form onsubmit={submit} novalidate>
			<div class="mark"><Wordmark {module} /></div>
			<Field id="u" label={t('login.username')} bind:value={username} autocomplete="username" />
			<Field
				id="p"
				type="password"
				label={t('login.password')}
				bind:value={password}
				autocomplete="current-password"
			/>
			{#if problem}<p class="problem">{t(problem)}</p>{/if}
			<Button type="submit" tone="primary" disabled={working}>
				{working ? t('login.working') : t('login.submit')}
			</Button>
			{#if offered}
				<Button onclick={withPasskey} disabled={working}>{t('login.passkey')}</Button>
			{/if}
		</form>
	</Card>
</main>

<style>
	main {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background: var(--bg);
	}
	main :global(.card) {
		width: min(22rem, 100%);
		padding: 2rem;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	.mark {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
	}
	.problem {
		margin: 0.2rem 0 0;
		color: var(--warn);
		font-size: var(--fs-m);
	}
</style>
