/* A passkey is asked of the browser, which asks the device, which asks its
 * owner's finger, face or PIN. The door speaks the JSON form of the standard
 * both ways, so nothing here converts a byte by hand. */

/** Whether this browser can answer at all: only on https, and only one that
 *  reads the standard's JSON form. */
export function passkeyHere(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.isSecureContext &&
		typeof PublicKeyCredential !== 'undefined' &&
		'parseRequestOptionsFromJSON' in PublicKeyCredential
	);
}

/** What went wrong, in the words a person can act on. Turning the device's own
 *  prompt away is not a failure and says nothing. */
export type Balked = 'cancelled' | 'exists' | 'failed';

export function balked(why: unknown): Balked {
	if (why instanceof DOMException && why.name === 'NotAllowedError') return 'cancelled';
	if (why instanceof DOMException && why.name === 'InvalidStateError') return 'exists';
	console.error('passkey:', why);
	return 'failed';
}

export async function signWith(options: PublicKeyCredentialRequestOptionsJSON) {
	const answer = await navigator.credentials.get({
		publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options)
	});
	return (answer as PublicKeyCredential).toJSON();
}

export async function makeKey(options: PublicKeyCredentialCreationOptionsJSON) {
	const made = await navigator.credentials.create({
		publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options)
	});
	return (made as PublicKeyCredential).toJSON();
}
