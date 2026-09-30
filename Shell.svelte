<script lang="ts">
	// The frame every OPUS module renders inside: the kit's frame, with the
	// wordmark, the module's own pages, and the way across to the other modules.
	//
	// The module switcher is what makes three deployments read as one product —
	// more than any colour does. It is fed rather than hardcoded because the
	// modules sit on different hosts and answer at different addresses in dev and
	// in production, and because a module that does not exist yet simply is not
	// in the list.

	import { theme } from '../kit/theme.svelte';
	import { i18n } from '../kit/i18n.svelte';
	import Frame, { type AccountItem, type Section } from '../kit/Frame.svelte';
	import Toasts from '../kit/Toasts.svelte';
	import NewVersion from '../kit/NewVersion.svelte';
	import Wordmark from './Wordmark.svelte';
	import { version } from './version.svelte';
	import { helpFor } from './help';
	import { moduleKey } from './modules';
	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';

	export type NavItem = Section;
	/** something wrong with the install, not with the page you are on — or,
	 * quiet, something true of it that is not wrong, like being the demo */
	export type Alert = { key: string; message: string; href?: string; tone?: 'quiet' };
	export type ModuleLink = { key: string; label: string; href: string };

	// The owner's tools. The household lives in the Player: it carries the films,
	// the records, the family shelf and each person's own vault, so neither the
	// machine room nor the catalogue behind it holds anything a member came for.
	// Which module a person may enter is the door's answer — this only keeps the
	// header from pointing at one that would turn them away. Where you are
	// standing stays listed whoever you are, or a bookmark would be a dead end
	// with no way back.
	const OWNER_ONLY = ['downloads', 'library'];

	let {
		module,
		nav = [],
		pathname = '',
		modules = [],
		alerts = [],
		heading = true,
		back,
		backLabel = '',
		owner = true,
		account,
		children
	}: {
		/** Downloads | Library | Player — its initial joins the wordmark, and the
		 * switcher marks it as where you are */
		module: string;
		/** this module's own pages, already translated by the caller */
		nav?: NavItem[];
		/** the current path, for marking the active page */
		pathname?: string;
		/** every module of the install, including this one */
		modules?: ModuleLink[];
		/** conditions that are true wherever you are standing. A page can say
		 * what is wrong with itself; only the frame can say it on every page,
		 * which is what something like a VPN carrying nothing needs. */
		alerts?: Alert[];
		/** the way out of wherever the module currently is, or nothing when there
		 * is nowhere to go. It sits in the top bar rather than on the page: a way
		 * out that takes a line of the page takes it on every page, and one that
		 * appears and disappears in the middle of the layout moves what is under
		 * it. Only the module knows whether there is anywhere to go back to. */
		back?: () => void;
		backLabel?: string;
		/** a module that draws its own way around — the Player does, down the side
		 * of a television. It keeps the alerts and the page, and none of the
		 * frame. */
		heading?: boolean;
		/** whether the person signed in maintains the install. A module that does
		 * not know says nothing and every way stays open: the door refuses, not
		 * the frame, and a first-run install has no roster to be a member of. */
		owner?: boolean;
		/** a module that knows who is using it. A module with no door passes
		 * nothing and gets no menu. */
		account?: {
			username: string;
			href: string;
			/** a way out of the account, for a module that has nowhere better for
			 * it */
			onlogout?: () => void;
			/** what this module lets a person do wherever they are standing: a
			 * doing that belongs to one page belongs on that page, and one that
			 * follows the person around belongs beside their name */
			does?: { label: string; onpick: () => void }[];
		};
		children?: import('svelte').Snippet;
	} = $props();

	const help = $derived(helpFor(moduleKey(module)));

	const ways = $derived(
		modules.filter((m) => owner || m.label === module || !OWNER_ONLY.includes(m.key))
	);

	// A module is its own application: its own address, its own door, its own
	// installed window. Walking to another one inside this window leaves the
	// browser drawing its own bar over the page to say where you have ended up.
	// So a way that leads out of this application opens the one it leads to and
	// leaves this window where it was. A module's own way is always "/"; an
	// absolute address is somewhere else. Read off the address rather than off
	// location, which the server rendering this has none of.
	const ELSEWHERE = /^[a-z][a-z0-9+.-]*:\/\//i;

	// A phone has no room for the switcher in the top bar; leaving for another
	// module is the same kind of act as leaving altogether, so it goes into the
	// menu that already holds that.
	const items = $derived<AccountItem[]>([
		...(account?.does ?? []).map((d) => ({ label: d.label, onpick: d.onpick })),
		...(ways.length > 1 ? ways : [])
			.filter((m) => m.label !== module)
			.map((m) => ({ label: m.label, href: m.href, external: ELSEWHERE.test(m.href), narrow: true }))
	]);

	onMount(() => {
		theme.sync();
		i18n.init();
		version.watch();
		// a lazy chunk the server no longer has proves the build stale, whatever
		// /api/version has said so far
		const gone = (e: Event) => {
			if (version.held) return;
			e.preventDefault();
			version.reload();
		};
		window.addEventListener('vite:preloadError', gone);
		return () => window.removeEventListener('vite:preloadError', gone);
	});

	// A deploy under an open tab takes away the lazy chunks the old build would
	// ask for next. Once a newer build is known, a way to another page is taken
	// as a whole load of the new build rather than a transition that would fail
	// on a missing import — unless the module says the tab is in use.
	beforeNavigate(({ to, cancel }) => {
		if (version.available && !version.held && to?.url) {
			cancel();
			location.href = to.url.href;
		}
	});
</script>

{#if heading}
	<Frame
		{pathname}
		sections={[nav]}
		version={version.label}
		{help}
		account={account
			? { name: account.username, href: account.href, onlogout: account.onlogout, items }
			: undefined}
	>
		{#snippet brand()}<Wordmark {module} />{/snippet}
		{#snippet bar()}
			{#if back}
				<button type="button" class="back" onclick={back}>← {backLabel}</button>
			{/if}
			{#if ways.length > 1}
				<div class="modules">
					{#each ways as m (m.key)}
						<a
							href={m.href}
							class:here={m.label === module}
							title={m.label}
							target={ELSEWHERE.test(m.href) ? '_blank' : undefined}
							rel={ELSEWHERE.test(m.href) ? 'noopener' : undefined}
							aria-current={m.label === module ? 'page' : undefined}>{m.label}</a
						>
					{/each}
				</div>
			{/if}
		{/snippet}
		{@render notices()}
		{@render children?.()}
	</Frame>
{:else}
	<div class="bare">
		<main>
			{@render notices()}
			{@render children?.()}
		</main>
	</div>
{/if}

{#snippet notices()}
	{#if alerts.length}
		<div class="notices">
			{#each alerts as alert (alert.key)}
				<div class="alert" class:quiet={alert.tone === 'quiet'}>
					{#if alert.href}
						<a href={alert.href}>{alert.message}</a>
					{:else}
						<span>{alert.message}</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
{/snippet}

<Toasts />
<NewVersion watch={version} />

<style>
	/* With the rest of the chrome rather than against the wordmark, which is an
	   identity and not a control. */
	.back {
		padding: 0.3rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: none;
		color: var(--text);
		font: inherit;
		font-size: var(--fs-m);
		cursor: pointer;
		white-space: nowrap;
	}
	.back:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.modules {
		display: flex;
		gap: 0.15rem;
		margin-left: auto;
		padding: 0.15rem;
		border: 1px solid var(--border);
		border-radius: 8px;
	}
	.modules a {
		padding: 0.25rem 0.55rem;
		border-radius: 6px;
		color: var(--muted);
		font-size: var(--fs-s);
		font-weight: 600;
		text-decoration: none;
	}
	.modules a:hover {
		color: var(--text);
	}
	.modules a.here {
		color: var(--text);
		background: var(--surface-2);
	}
	/* The page under them starts as it would at the top of the frame, so a
	   pinned page head that takes the frame's top padding off takes it from
	   here rather than from the last notice. */
	.notices {
		display: grid;
		gap: 0.5rem;
		padding-bottom: var(--shell-main-top);
	}
	.alert {
		padding: 0.65rem 1rem;
		border: 1px solid var(--warn);
		border-radius: 8px;
		color: var(--warn);
		font-weight: 600;
		font-size: var(--fs-m);
	}
	.alert a {
		text-decoration: none;
	}
	.alert.quiet {
		padding: 0.55rem 0.8rem;
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
		background: color-mix(in srgb, var(--accent) 10%, var(--surface));
		color: var(--muted);
		font-weight: 400;
	}
	/* A television draws its own way around and is never narrow. */
	.bare {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem;
		overflow-x: clip;
		--shell-header: 0px;
		--shell-main-top: 1.5rem;
		--shell-bar-h: 0px;
	}
	.bare main {
		padding: var(--shell-main-top) 0 3rem;
	}
	.bare .notices {
		padding-bottom: 1rem;
	}
	.bare .alert {
		margin: 0 2rem;
		font-size: var(--fs-l);
	}
	@media (max-width: 767.98px) {
		.modules {
			display: none;
		}
	}
</style>
