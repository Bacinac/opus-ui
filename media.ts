// How a film or an episode is named and coloured wherever it is listed. The
// library operates on these and the player plays them, and both say the same
// episode the same way or the product speaks with two voices about one thing.

import type { Tone } from '../kit/Tag.svelte';

/** S01E02: the number an episode is known by, whatever it is called. */
export function episodeCode(season: number, episode: number): string {
	return `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
}

/** How a film's or an episode's state is marked, wherever it is listed. Only
 *  what is not simply on the shelf and done has a mark; `upcoming` is not a
 *  library state but what anything not broadcast yet is, whatever its state.
 *  Anything the table does not name has nothing on the shelf yet. */
export function videoStateMark(state: string | null | undefined): { icon: string; tone: Tone } | null {
	if (state === 'complete') return null;
	return (
		(
			{
				upcoming: { icon: 'clock', tone: 'quiet' },
				waiting_subtitles: { icon: 'text', tone: 'warn' },
				downloading: { icon: 'fetching', tone: 'busy' },
				ignored: { icon: 'ignored', tone: 'quiet' }
			} as Record<string, { icon: string; tone: Tone }>
		)[state ?? ''] ?? { icon: 'missing', tone: 'warn' }
	);
}
