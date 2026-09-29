// The words OPUS itself says, laid over the kit's and under each module's.

import { registerModule as registerOnKit, t, type Word as KitWord } from '../kit/i18n.svelte';
import { hr } from './words/hr';
import { en } from './words/en';

export type Word = KitWord | keyof typeof hr;

export function registerModule<K extends string>(catalogs: {
	hr: Record<K, string>;
	en: Record<K, string>;
}) {
	registerOnKit(catalogs, [{ hr, en }]);
	return t as (key: K | Word, params?: Record<string, string | number>) => string;
}
