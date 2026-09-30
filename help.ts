// The help of OPUS: one set of articles for all three modules, because a person
// meets OPUS as one product. Each module is its own origin, so an article names
// its pages per module, and each module's frame reads the articles as its own
// pages name them.

import { Help, type HelpEntry } from '../kit/help';
import type { ModuleKey } from './modules';
import index from './help/index.json';

const files = import.meta.glob<string>('./help/*.md', { query: '?raw', import: 'default', eager: true });

const built = new Map<ModuleKey, Help>();

export function helpFor(module: ModuleKey): Help {
	let help = built.get(module);
	if (!help) {
		help = new Help(index as HelpEntry[], files, module);
		built.set(module, help);
	}
	return help;
}
