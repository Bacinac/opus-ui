// Which build of this module the tab runs, from the module's own /api/version,
// and whether a newer one is served. The frame starts it; the signature and the
// about page say what it found.

import { VersionWatch, type Revision } from '../kit/version.svelte';

export const version = new VersionWatch<Revision>(async () => {
	const answer = await fetch('/api/version');
	return answer.ok ? ((await answer.json()) as Revision) : null;
});
