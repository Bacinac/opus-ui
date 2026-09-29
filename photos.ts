import { thumbHashToDataURL } from 'thumbhash';
import { cssUrl } from '../kit/css';
import { t } from '../kit/i18n.svelte';
import { toasts } from '../kit/toasts.svelte';

// Where a photograph and what was cut from it are fetched. Typed by hand at
// every picture, the address was written seventeen times in three modules.

// The turn is part of the address: a derivative is served as immutable, so a
// picture turned by hand is a different picture to every cache on the way.
const turned = (turn: number) => (turn ? `?turn=${turn}` : '');
export const tileOf = (id: string, turn = 0) => `/api/photos/${id}/tile${turned(turn)}`;
export const previewOf = (id: string, turn = 0) => `/api/photos/${id}/preview${turned(turn)}`;
export const playOf = (id: string) => `/api/photos/${id}/play`;
export const aboutOf = (id: string) => `/api/photos/${id}`;

/** The picture drawn from the few bytes the catalogue keeps of it, to stand in
 *  its place until the file arrives. */
export function placeholderOf(hash: string | null): string | undefined {
	if (!hash) return undefined;
	const bytes = new Uint8Array(hash.length / 2);
	for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hash.slice(i * 2, i * 2 + 2), 16);
	try {
		return thumbHashToDataURL(bytes);
	} catch {
		return undefined;
	}
}

export function groundOf(hash: string | null): string | undefined {
	const url = placeholderOf(hash);
	return url ? cssUrl(url) : undefined;
}

/** A rectangle around the face box. Plain, and always there — where the
 *  eye-aligned portrait needs a mesh the library computes lazily, and refuses
 *  with a 422 for the faces that have not been asked for one yet. */
export const cropOf = (faceId: number) => `/api/photos/faces/${faceId}/crop`;
export const portraitOf = (faceId: number) => `/api/photos/faces/${faceId}/portrait`;

/** A person's face carried through the years, drawn at a size the library
 *  keeps a file for. */
export const morphOf = (personId: number, size = 448, steps?: number) =>
	`/api/photos/people/${personId}/morph?size=${size}` +
	(steps === undefined ? '' : `&steps=${steps}`);

/** Whether a 409 was the library refusing a change because it is regrouping the
 *  faces — said to the person if so. */
export function regrouping(body: Record<string, unknown>): boolean {
	if ((body.detail as { reason?: string } | null)?.reason !== 'regrouping') return false;
	toasts.error(t('photos.regrouping'));
	return true;
}

/** For a change to who is in a photograph that has no refusal of its own to say. */
export const unlessRegrouping = {
	on: {
		409: (body: Record<string, unknown>) => {
			if (!regrouping(body)) toasts.error(t('common.requestFailed', { detail: String(body.detail) }));
		}
	}
};
