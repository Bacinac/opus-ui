// The policy every module's pages are served under. SvelteKit writes it on each
// rendered page, with a fresh nonce on its own scripts and on the theme script
// in app.html; it replaces the header server.mjs puts on everything, so it has
// to carry frame-ancestors itself.
export const csp = {
	mode: 'nonce',
	directives: {
		'script-src': ['self'],
		'object-src': ['none'],
		'base-uri': ['self'],
		'frame-ancestors': ['self']
	}
};
