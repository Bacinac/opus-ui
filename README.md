# opus-ui

What makes an OPUS module look and behave like OPUS — **Downloads**, **Library**
and **Player** — on top of the shared, brand-neutral kit
([`ui-kit`](https://github.com/Bacinac/ui-kit), at `src/lib/kit`).

## Why this exists

Each module's application is its own: separate services, deployed to different
hosts on different cadences, and their domain code has no business being
coupled. What a person touches is the opposite case. The primitives every
product shares — buttons, dialogs, fields, tags, the request helper, the
formatters — are the kit's. What only OPUS has lives here once: its palette, its
marks, its frame, its door, and the screens of its own kinds of thing.

## What is in it

Ground
- `tokens.css` — the OPUS palette, light and dark: the colours the kit asks a
  product for, and one `--kind-*` per kind of thing kept (`--kind-film`,
  `--kind-series`, `--kind-music`, `--kind-photos`). opus-core's check refuses a
  `font-size` below 2rem that is not one of the kit's steps, and a hex, `rgb()`
  or `hsl()` colour anywhere but a `tokens.css` and a module's `colours.ts`
  palette. A mask names `black`, since only its opacity counts
- `kinds.ts` — `Kind`, the names a `Tag` or a counted fact is painted by
- `app.html` — the page template; a module links `src/app.html` to it
- `csp.js` — the page policy (`kit.csp` in every module's `svelte.config.js`):
  scripts only from the module itself or under the per-request nonce
- `server.mjs` — the production server: the built app, `/api` proxied to
  `OPUS_API_URL` (required), websocket upgrades, and upstream streams dropped
  when the reader leaves, and the client address the backend is told: from a
  proxy in `OPUS_TRUSTED_PROXIES` its `cf-connecting-ip` or first
  `x-forwarded-for`, from anybody else the socket. A module's Dockerfile copies
  it beside the build; `node --test server.test.mjs` checks the address rule

Frame
- `Shell` — the kit's `Frame` with the wordmark, the module's pages (each with
  one of `icons` for the phone's bottom bar), the way across to the other
  modules and the alerts; a television gets the page and none of the frame.
  The frame's "?" opens this module's article of the page you are on
- `About` — a module's `/about`: the kit's `About` under the module's lockup,
  with what the suite is said here and what the module does said by the module.
  `version` is the module's build, read from its `/api/version`
- `Wordmark`, `Login`, `Account` (password, preferences, the tokens of the machines that call the module and
  — for an admin of the module that keeps the roster — `People` and `Devices`),
  `Preferences`
- `MediaHead` — the top of a page about one thing: a film, a series, a record, a
  person; `amount` puts how many it holds in brackets after the name. `SeriesPage` and `EpisodeRow` build a series on it: one season at a
  time behind a picker, each line with its still, running time and how far the
  profile got. `StateMark` says a state as one tinted icon, its words on the
  pointer; `Tally` says a season as icon-and-number counts

Photographs (imported by path — they need `thumbhash`)
- `PhotoTimeline`, `PhotoViewer`

Behaviour
- `me.svelte.ts` — who is signed in and at what standing: `me.check()`,
  `me.logout()`, `me.admin`, `me.guest`
- `i18n.ts` — `registerModule()`, the kit's, with the OPUS words laid between
  the kit's and the module's; `Word` is both
- `help.ts` (`helpFor`) and `help/` — the help of the whole suite: one
  `index.json` whose articles name their pages per module (`{"library":
  ["/tags"], "player": ["/music"]}`, since `/settings` is three pages), and a
  body per language. A module adds only `routes/help` and `routes/help/[slug]`
  over the kit's `HelpIndex` and `HelpPage`; opus-core's check holds the
  articles to the module's routes
- `modules.ts` (`modulesFor`, `moduleName`, `moduleKey`), `media.ts` (`episodeCode`,
  `videoStateMark`), `photos.ts` (`tileOf`, `previewOf`, `playOf`, `aboutOf`,
  `cropOf`, `portraitOf`, `morphOf`, `placeholderOf`, `groundOf`)
- `words/` — the words these components say, in Croatian and English
- `marks/` — every OPUS mark, derived by `marks/build.sh` from the accepted
  family sheet: one cut O for the tab (`favicon.*`) and the home screen
  (`icons/`), shared by all three modules; the full lockups
  `opus-{downloads,library,player}.svg`, which `Wordmark` shows; and the
  Android vectors (`android/`) the Player's TV app copies in. A module's
  `static/` links into it; bump `?v=` in `app.html` and the manifest when the
  marks change

## How a module consumes it

Checked out as a git submodule at `frontend/src/lib/opus`, so Vite compiles it as
ordinary source: no registry, no network at build time, and the deploy carries
it like any other file. The pinned submodule commit is the version.

```bash
git submodule add git@github.com:Bacinac/ui-kit.git frontend/src/lib/kit
git submodule add git@github.com:Bacinac/opus-ui.git frontend/src/lib/opus
ln -s lib/opus/app.html frontend/src/app.html
```

`src/app.css`:

```css
@import './lib/kit/tokens.css';
@import './lib/opus/tokens.css';
@import './lib/kit/base.css';
```

`src/lib/i18n/index.ts`:

```ts
import { hr } from './hr';
import { en } from './en';
import { registerModule, type Word } from '$lib/opus';

export type MessageKey = keyof typeof hr | Word;
export const t = registerModule({ hr, en });
```

`src/routes/+layout.svelte`:

```svelte
<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { Toasts, onUnauthorized } from '$lib/kit';
	import { Login, Shell, me } from '$lib/opus';
	import { MODULE, MODULES } from '$lib/core/modules';

	let { children } = $props();
	onUnauthorized(() => (me.open = false));
	$effect(() => {
		me.check();
	});
</script>

{#if me.open === false}
	<Login module={MODULE} onin={() => me.check()} />
	<Toasts />
{:else if me.open}
	<Shell module={MODULE} nav={[]} pathname={page.url.pathname} modules={MODULES}
		account={me.name ? { username: me.name, href: '/account', onlogout: () => me.logout() } : undefined}>
		{@render children()}
	</Shell>
{:else}
	<Toasts />
{/if}
```

## The contract with a module's words

The words a component says belong to the package it lives in: the kit's to the
kit, the OPUS frame's here (`words/hr.ts`, `words/en.ts`). A module that says
one of them again fails at boot. A module carries only what it alone knows: its
domain, and the `field.*`, `settings.opt.*` and `settings.err.*` words for its
own settings, which `SettingField` and `SettingsDraft` build keys for. Its
catalogues are one word per line, Croatian first, English in the same order,
and the kit's `words/check.mjs` — run with the module's own families and both
packages — holds them to that.

## Updating

Change something here or in the kit, commit and push there, then in each module
bump the submodule and commit the new pointer, and run that module's check and
build. A change here that needs a newer kit bumps both pointers together.
