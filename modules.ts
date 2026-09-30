// Where the OPUS modules answer, for the header's way across.
//
// Addresses differ between dev and production and the modules sit on different
// hosts, so each module reads them from its build environment and hands them
// here. A module whose address is unset is absent from the header, rather than
// a link that leads nowhere.

import type { ModuleLink } from './Shell.svelte';

const ALL = [
	{ key: 'downloads', label: 'Downloads' },
	{ key: 'library', label: 'Library' },
	{ key: 'player', label: 'Player' }
] as const;

export type ModuleKey = (typeof ALL)[number]['key'];

export function modulesFor(
	here: ModuleKey,
	addresses: Partial<Record<ModuleKey, string | undefined>>
): ModuleLink[] {
	return ALL.filter((m) => m.key === here || addresses[m.key]).map((m) => ({
		key: m.key,
		label: m.label,
		href: m.key === here ? '/' : addresses[m.key]!
	}));
}

export function moduleName(key: ModuleKey): string {
	return ALL.find((m) => m.key === key)!.label;
}

export function moduleKey(name: string): ModuleKey {
	const found = ALL.find((m) => m.label === name);
	if (!found) throw new Error(`no OPUS module is called ${name}`);
	return found.key;
}
