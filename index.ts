// Everything a module imports from the package, in one place, so an import line
// never has to know which file something lives in.
//
// CSS is deliberately NOT re-exported here: a module imports `tokens.css` and
// `base.css` from its own app.css, which is where a stylesheet belongs.
//
// Neither are PhotoTimeline and PhotoViewer, for a related reason: they need
// `thumbhash`, and a barrel is resolved whole by whoever imports from it. Listed
// here, a module that will never draw a photograph fails to build for want of a
// package it has no use for. They are imported by path —
// `$lib/opus/PhotoTimeline.svelte` — by the modules that draw them.

export { me, type Role, type Session } from './me.svelte';
export { modulesFor, moduleName, moduleKey, type ModuleKey } from './modules';
export { helpFor } from './help';
export { episodeCode, videoStateMark } from './media';
export { tileOf, previewOf, playOf, aboutOf, cropOf, portraitOf, morphOf, placeholderOf, groundOf, regrouping, unlessRegrouping } from './photos';
export { default as EpisodeRow } from './EpisodeRow.svelte';
export { default as MediaHead } from './MediaHead.svelte';
export { default as SeriesPage } from './SeriesPage.svelte';
export type { PageEpisode, PageSeason, PageTag } from './SeriesPage.svelte';
export { default as StateMark } from './StateMark.svelte';
export { default as Tally } from './Tally.svelte';
export type { Count } from './Tally.svelte';
export { default as Account } from './Account.svelte';
export { default as Tokens } from './Tokens.svelte';
export { default as Login } from './Login.svelte';
export { default as People } from './People.svelte';
export { default as Devices } from './Devices.svelte';
export { default as Preferences } from './Preferences.svelte';
export { default as Shell } from './Shell.svelte';
export type { Alert, NavItem, ModuleLink } from './Shell.svelte';
export { default as Wordmark } from './Wordmark.svelte';
export { icons } from './icons';
export { default as About } from './About.svelte';
export { version } from './version.svelte';
export { registerModule, type Word } from './i18n';
export type { Kind } from './kinds';
