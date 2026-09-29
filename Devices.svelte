<script lang="ts">
	// The boxes somebody let in. Drawn beside the roster and only by the module
	// that keeps it, because they are the same question asked about a different
	// kind of thing: who is in this house, and what is.
	//
	// A television is not signed in, it is let in. It shows a code, somebody
	// standing here types what they read off it, and from then on it holds a
	// credential of its own. Which is why the code is NOT shown in this list
	// even though the server knows it: having to read it off the screen in the
	// other room is the whole of what stops somebody else's television being let
	// in by a distracted yes.

	import { json, request } from '../kit/http';
	import { t, formatDateTime } from '../kit/i18n.svelte';
	import type { Word } from './i18n';
	import ArmedButton from '../kit/ArmedButton.svelte';
	import Button from '../kit/Button.svelte';
	import Card from '../kit/Card.svelte';
	import Field from '../kit/Field.svelte';

	type Device = {
		id: number;
		name: string;
		module: string;
		collected: boolean;
		let_in_by: string;
		let_in_at: string | null;
		seen_at: string | null;
	};

	let devices = $state<Device[]>([]);
	let code = $state('');
	let name = $state('');
	let working = $state(false);
	let problem = $state<Word | ''>('');
	let done = $state('');
	let opened = $state(0);
	let renaming = $state('');

	load();

	async function load() {
		const said = await request<{ devices: Device[] }>('/api/auth/devices');
		if (said) devices = said.devices;
	}

	async function letIn(event: SubmitEvent) {
		event.preventDefault();
		problem = done = '';
		if (!code.trim()) {
			problem = 'devices.err.blank';
			return;
		}
		working = true;
		const said = await request<{ name: string }>('/api/auth/devices', json({ code, name }), {
			on: { 404: () => (problem = 'devices.err.noCode') }
		});
		working = false;
		if (!said) return;
		done = t('devices.wasLetIn', { name: said.name });
		code = name = '';
		await load();
	}

	function toggle(device: Device) {
		opened = opened === device.id ? 0 : device.id;
		renaming = device.name;
	}

	async function rename(device: Device) {
		working = true;
		const said = await request(`/api/auth/devices/${device.id}`, json({ name: renaming }, 'PATCH'));
		working = false;
		if (!said) return;
		opened = 0;
		await load();
	}

	async function takeBack(device: Device) {
		working = true;
		const taken = await request(`/api/auth/devices/${device.id}`, { method: 'DELETE' });
		working = false;
		if (taken) await load();
	}
</script>

<Card title={t('devices.title')}>
	{#if devices.length}
		<ul class="boxes">
			{#each devices as box (box.id)}
				<li class:waiting={!box.let_in_at} class:open={opened === box.id}>
					{#if box.let_in_at}
						<button class="who" onclick={() => toggle(box)} aria-expanded={opened === box.id}>
							<span class="what">
								<span class="named">{box.name}</span>
								<span class="note">
									{#if box.seen_at}
										{t('devices.lastSeen', { when: formatDateTime(box.seen_at) })}
									{:else if !box.collected}
										{t('devices.notCollected')}
									{:else}
										{t('devices.letInBy', { who: box.let_in_by })}
									{/if}
								</span>
							</span>
							<span class="arrow" class:down={opened === box.id}>›</span>
						</button>
						{#if opened === box.id}
							<div class="panel">
								<div class="pair">
									<Field
										id="n-{box.id}"
										label={t('devices.name')}
										bind:value={renaming}
										autocomplete="off"
									/>
									<Button
										onclick={() => rename(box)}
										disabled={working || !renaming.trim() || renaming.trim() === box.name}
									>
										{t('common.save')}
									</Button>
								</div>
								<div>
									<ArmedButton onconfirm={() => takeBack(box)} disabled={working}>
										{t('devices.takeBack')}
									</ArmedButton>
								</div>
							</div>
						{/if}
					{:else}
						<div class="what asking">
							<span class="named">{t('devices.asking')}</span>
							<span class="note">{t('devices.askingNow')}</span>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="quiet">{t('devices.none')}</p>
	{/if}

	<form onsubmit={letIn} novalidate>
		<h3>{t('devices.letIn')}</h3>
		<p class="quiet">{t('devices.hint')}</p>
		<div class="two">
			<Field id="d-code" label={t('devices.code')} bind:value={code} autocomplete="off" />
			<Field id="d-name" label={t('devices.name')} bind:value={name} autocomplete="off" />
		</div>
		{#if problem}<p class="problem">{t(problem)}</p>{/if}
		{#if done}<p class="done">{done}</p>{/if}
		<Button type="submit" tone="primary" disabled={working}>{t('devices.letIn')}</Button>
	</form>
</Card>

<style>
	.boxes {
		list-style: none;
		margin: 0 0 1.3rem;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	li {
		border: 1px solid var(--border);
		border-radius: 10px;
		overflow: hidden;
	}
	li.open {
		border-color: var(--accent);
	}
	/* a box still holding a code up on a screen somewhere: something is
	   happening in another room and this row is the only sign of it */
	li.waiting {
		border-style: dashed;
	}
	.who {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.55rem 0.75rem;
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
	.what {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}
	.asking {
		padding: 0.55rem 0.75rem;
	}
	.named {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
	.note,
	.quiet {
		color: var(--muted);
		font-size: var(--fs-m);
	}
	.quiet {
		margin: 0 0 0.6rem;
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
	.pair :global(.field),
	.two :global(.field) {
		flex: 1 1 12rem;
		width: auto;
	}
	h3 {
		margin: 0 0 0.15rem;
		font-size: var(--fs-l);
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
