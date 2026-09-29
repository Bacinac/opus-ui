/* Who is looking at this, and what they may do with it.
 *
 * One answer, asked once by the layout and read everywhere, because the
 * alternative is every screen asking again and the app briefly disagreeing with
 * itself about whose it is.
 *
 * An **admin** maintains the install. A **user** reads it and keeps their own
 * vault. A **guest** was handed the address for an evening. The server enforces
 * all of it on every route; this is how a screen stops offering what the server
 * would refuse. A control that is not allowed is absent, not present and then
 * apologetic. */

import { request } from '../kit/http';
import { i18n, type Catalogs } from '../kit/i18n.svelte';
import { toasts } from '../kit/toasts.svelte';

export type Role = 'admin' | 'user' | 'guest' | '';

export type Session = {
	required: boolean;
	authenticated: boolean;
	username?: string;
	role?: string;
	passkey?: boolean;
	[more: string]: unknown;
};

class Me {
	/** null while the answer is on its way: drawing the app and then replacing
	 *  it with the door reads as a glitch */
	open = $state<boolean | null>(null);
	name = $state('');
	role = $state<Role>('');
	/** the door did not answer, and is being asked again: a server still coming
	 *  up after a deploy is not a session that ended */
	unreachable = $state(false);
	/** whether this door takes a passkey: only on the shared domain, reached
	 *  through the module's own web server */
	passkey = $state(false);
	#asking: Promise<Session> = Promise.resolve({ required: true, authenticated: false });
	#worded = false;

	get admin(): boolean {
		return this.role === 'admin';
	}

	get guest(): boolean {
		return this.role === 'guest';
	}

	/** Ask the door who this is, and go on asking until it answers. `query`
	 *  carries what a module's door wants to know besides; the whole answer
	 *  comes back for what only that module reads. A question asked while
	 *  another is on its way is asked after it, so its answer is never older
	 *  than the question. */
	check(query = ''): Promise<Session> {
		this.#asking = this.#asking.then(() => this.#ask(query));
		return this.#asking;
	}

	async #ask(query: string): Promise<Session> {
		for (;;) {
			const said = await request<Session>(`/api/auth/session${query}`, {}, {
				failed: (detail) => {
					// said once, not on every attempt during the same outage
					if (!this.unreachable) toasts.error(detail);
					this.unreachable = true;
				}
			});
			if (said) {
				this.unreachable = false;
				this.open = !said.required || said.authenticated;
				this.name = said.username ?? '';
				this.passkey = said.passkey === true;
				// an install with no door at all has nobody to be, and everybody
				// may do everything — which is what first-run means
				const role = said.required ? said.role : 'admin';
				this.role = role === 'admin' || role === 'user' || role === 'guest' ? role : '';
				if (this.open) this.#words();
				return said;
			}
			await new Promise((again) => setTimeout(again, 5000));
		}
	}

	/** What the installation's plugins say, which no build of the module
	 *  carries; asked once whoever is looking may see the module at all. */
	async #words() {
		if (this.#worded) return;
		this.#worded = true;
		const said = await request<Catalogs>('/api/words');
		if (said) i18n.extend(said);
		else this.#worded = false;
	}

	async logout() {
		if ((await request('/api/auth/logout', { method: 'POST' })) === null) return;
		this.open = false;
		this.name = '';
		this.role = '';
	}
}

export const me = new Me();
