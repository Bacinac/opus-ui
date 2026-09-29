<script lang="ts">
	// The roster: who may sign in, to any of the three modules. It is drawn only
	// by whichever module owns the list — the others hold no names at all — and
	// only for an admin, which the account page decides.
	//
	// Standing is one word per person, chosen the same way in the row as in the
	// form that makes one: an admin keeps the place, a user lives here and keeps
	// a vault, a guest was handed the address for an evening.
	//
	// A row is a person and opens into what can be changed about them. One row at
	// a time, because these are not settings to be swept through: each is a small
	// decision about somebody, and the one that is open is the one being made.

	import { json, request } from '../kit/http';
	import { t } from '../kit/i18n.svelte';
	import type { Word } from './i18n';
	import { me } from './me.svelte';
	import ArmedButton from '../kit/ArmedButton.svelte';
	import Button from '../kit/Button.svelte';
	import Card from '../kit/Card.svelte';
	import Field from '../kit/Field.svelte';
	import Picks from '../kit/Picks.svelte';
	import Tag from '../kit/Tag.svelte';

	type Person = {
		name: string;
		display: string;
		role: string;
		disabled: boolean;
	};

	let people = $state<Person[]>([]);
	let working = $state('');
	let problem = $state<Word | ''>('');

	let handle = $state('');
	let display = $state('');
	let password = $state('');
	let again = $state('');
	let asRole = $state(['user']);
	let added = $state('');

	// the middle one first, because it is what almost everybody added is
	const ROLES = $derived([
		{ key: 'user', label: t('people.role.user') },
		{ key: 'admin', label: t('people.role.admin') },
		{ key: 'guest', label: t('people.role.guest') }
	]);

	// the same floor the server keeps, said before the round trip rather than
	// after it. The server is still the one that decides.
	const SHORTEST = 8;

	let opened = $state('');
	let renaming = $state('');
	let secret = $state('');
	let secretAgain = $state('');

	load();

	async function load() {
		const roster = await request<{ people: Person[] }>('/api/auth/people');
		if (roster) people = roster.people;
	}

	/** Every change goes through here so one place reports what went wrong. The
	 * server refuses the moves that would leave the install without an admin;
	 * repeating that judgement in the browser would be a second copy of it. */
	async function ask(url: string, method: string, body?: unknown) {
		problem = '';
		working = url;
		const done = await request(url, body ? json(body, method) : { method }, {
			on: {
				409: () => (problem = 'people.err.refused'),
				400: () => (problem = 'people.err.blank'),
				403: () => (problem = 'people.err.notAdmin')
			}
		});
		working = '';
		if (!done) return false;
		await load();
		return true;
	}

	async function add(event: SubmitEvent) {
		event.preventDefault();
		added = '';
		if (!handle || !password) {
			problem = 'people.err.blank';
			return;
		}
		if (password !== again) {
			problem = 'people.err.mismatch';
			return;
		}
		if (password.length < SHORTEST) {
			problem = 'people.err.short';
			return;
		}
		const name = handle;
		if (await ask('/api/auth/people', 'POST', { name, display, password, role: asRole[0] })) {
			added = t('people.wasAdded', { name: display || name });
			handle = display = password = again = '';
			asRole = ['user'];
		}
	}

	function toggle(person: Person) {
		opened = opened === person.name ? '' : person.name;
		renaming = person.display === person.name ? '' : person.display;
		secret = secretAgain = '';
		problem = '';
		added = '';
	}

	const amend = (person: Person, change: Record<string, unknown>) =>
		ask(`/api/auth/people/${encodeURIComponent(person.name)}`, 'PATCH', change);

	async function rename(person: Person) {
		if (await amend(person, { display: renaming })) opened = '';
	}

	async function reset(person: Person) {
		if (!secret) return;
		if (secret !== secretAgain) {
			problem = 'people.err.mismatch';
			return;
		}
		if (secret.length < SHORTEST) {
			problem = 'people.err.short';
			return;
		}
		if (await amend(person, { password: secret })) {
			secret = secretAgain = '';
			opened = '';
		}
	}
</script>

<Card title={t('people.title')}>
	<ul class="roster">
		{#each people as person (person.name)}
			<li class:open={opened === person.name} class:off={person.disabled}>
				<button class="who" onclick={() => toggle(person)} aria-expanded={opened === person.name}>
					<span class="named">{person.display}</span>
					{#if person.display !== person.name}<span class="handle">{person.name}</span>{/if}
					<span class="marks">
						{#if person.name === me.name}<Tag tone="busy">{t('people.you')}</Tag>{/if}
						<!-- the middle standing is the one almost everybody has, so it is
						     said by not being said: a roster where every row carries a
						     word is a roster nobody reads -->
						{#if person.role !== 'user'}
							<Tag tone="quiet">{t(`people.role.${person.role}` as Word)}</Tag>
						{/if}
						{#if person.disabled}<Tag tone="warn">{t('people.disabled')}</Tag>{/if}
					</span>
					<span class="arrow" class:down={opened === person.name}>›</span>
				</button>

				{#if opened === person.name}
					<div class="panel">
						<div class="pair">
							<Field
								id="d-{person.name}"
								label={t('people.display')}
								bind:value={renaming}
								autocomplete="off"
							/>
							<Button onclick={() => rename(person)} disabled={!!working}>
								{t('common.save')}
							</Button>
						</div>

						<div class="pair">
							<Field
								id="s-{person.name}"
								type="password"
								label={t('people.newPassword')}
								bind:value={secret}
								autocomplete="new-password"
							/>
							<Field
								id="s2-{person.name}"
								type="password"
								label={t('people.repeat')}
								bind:value={secretAgain}
								autocomplete="new-password"
							/>
							<Button onclick={() => reset(person)} disabled={!secret || !!working}>
								{t('people.reset')}
							</Button>
						</div>

						<div class="pair">
							<span class="what">{t('people.role')}</span>
							<Picks
								picks={ROLES}
								chosen={[person.role]}
								onpick={(role) => amend(person, { role })}
							/>
						</div>

						<div class="row">
							<Button
								onclick={() => amend(person, { disabled: !person.disabled })}
								disabled={!!working}
							>
								{person.disabled ? t('people.enable') : t('people.disable')}
							</Button>
							{#if person.name !== me.name}
								<ArmedButton
									onconfirm={() =>
										ask(`/api/auth/people/${encodeURIComponent(person.name)}`, 'DELETE')}
									disabled={!!working}
								>
									{t('people.remove')}
								</ArmedButton>
							{/if}
						</div>

						{#if problem}<p class="problem">{t(problem)}</p>{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	<form onsubmit={add} novalidate>
		<h3>{t('people.add')}</h3>
		<div class="two">
			<Field id="p-name" label={t('people.name')} bind:value={handle} autocomplete="off" />
			<Field id="p-display" label={t('people.display')} bind:value={display} autocomplete="off" />
		</div>
		<div class="two">
			<Field
				id="p-pass"
				type="password"
				label={t('people.password')}
				bind:value={password}
				autocomplete="new-password"
			/>
			<Field
				id="p-pass2"
				type="password"
				label={t('people.repeat')}
				bind:value={again}
				autocomplete="new-password"
			/>
		</div>
		<div class="pair">
			<span class="what">{t('people.role')}</span>
			<Picks picks={ROLES} bind:chosen={asRole} />
		</div>
		{#if !opened && problem}<p class="problem">{t(problem)}</p>{/if}
		{#if added}<p class="done">{added}</p>{/if}
		<Button type="submit" tone="primary" disabled={!!working}>{t('people.add')}</Button>
	</form>
</Card>

<style>
	/* Six people in a single file is six lines of mostly empty row. They flow
	   into as many columns as fit, and the one that is open takes the whole
	   width back — what it holds is three forms, not a name. */
	.roster {
		list-style: none;
		margin: 0 0 1.3rem;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
		gap: 0.35rem;
	}
	li.open {
		grid-column: 1 / -1;
	}
	li {
		border: 1px solid var(--border);
		border-radius: 10px;
		overflow: hidden;
	}
	li.open {
		border-color: var(--accent);
	}
	li.off .named {
		color: var(--muted);
	}
	.who {
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
		width: 100%;
		padding: 0.6rem 0.75rem;
		border: 0;
		background: none;
		font: inherit;
		text-align: left;
		cursor: pointer;
		color: var(--text);
	}
	.who:hover {
		background: var(--surface);
	}
	.named {
		font-weight: 600;
	}
	.handle {
		color: var(--muted);
		font-size: var(--fs-s);
	}
	.marks {
		margin-left: auto;
		display: flex;
		gap: 0.35rem;
		align-items: center;
	}
	.arrow {
		color: var(--muted);
		font-size: var(--fs-xl);
		line-height: 1;
		transition: transform 0.15s ease;
	}
	.arrow.down {
		transform: rotate(90deg);
	}
	.panel {
		display: grid;
		gap: 0.75rem;
		padding: 0.3rem 0.75rem 0.85rem;
		border-top: 1px solid var(--border);
		margin-top: -1px;
	}
	.pair {
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;
		flex-wrap: wrap;
	}
	/* a field fills what it is given, which in a row means it fills the row and
	   pushes everything else onto the next one. Here it shares. */
	.pair :global(.field),
	.two :global(.field) {
		flex: 1 1 12rem;
		width: auto;
	}
	.row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		align-items: flex-start;
		border-top: 1px solid var(--border);
		padding-top: 1rem;
	}
	.two {
		display: flex;
		gap: 0.6rem;
		width: 100%;
		flex-wrap: wrap;
	}
	h3 {
		margin: 0 0 0.15rem;
		font-size: var(--fs-l);
	}
	/* the word the row of pills answers, sitting on the same baseline as them */
	.what {
		font-size: var(--fs-m);
		color: var(--muted);
		align-self: center;
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
