// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import PhotoViewer from './PhotoViewer.svelte';
import { registerModule } from './i18n';

registerModule({ hr: {}, en: {} });
let viewer: ReturnType<typeof mount> | null = null;
afterEach(async () => {
	if (viewer) await unmount(viewer);
	viewer = null;
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

test('focus stays in the viewer, every D-pad action is reachable, and closing restores the grid', async () => {
	document.body.innerHTML = '<button id="behind">Grid tile</button><main></main>';
	const behind = document.querySelector<HTMLButtonElement>('#behind')!;
	behind.focus();
	const prev = vi.fn(), next = vi.fn(), close = vi.fn(), turn = vi.fn();
	const underlying = vi.fn();
	behind.onclick = underlying;
	flushSync(() => {
		viewer = mount(PhotoViewer, { target: document.querySelector('main')!, props: {
			photo: { id: '1', kind: 'image', taken_at: null, dated: '', w: 100, h: 100,
				hash: null, ready: true, undecodable: false, turn: 0 },
			about: false, hasPrev: true, hasNext: true, onprev: prev, onnext: next,
			onclose: close, onturn: turn, download: '/original'
		} });
	});
	const panel = document.querySelector<HTMLElement>('[role="dialog"]')!;
	expect(document.activeElement).toBe(panel);
	const key = (value: string, shiftKey = false) => {
		(document.activeElement ?? window).dispatchEvent(new KeyboardEvent('keydown',
			{ key: value, shiftKey, bubbles: true, cancelable: true }));
	};
	key('Enter');
	expect(underlying).not.toHaveBeenCalled();
	key('ArrowRight');
	key('ArrowLeft');
	expect(next).toHaveBeenCalledOnce();
	expect(prev).toHaveBeenCalledOnce();
	key('ArrowDown');
	expect((document.activeElement as HTMLElement).tagName).toBe('A');
	key('ArrowRight');
	(document.activeElement as HTMLElement).click();
	expect(turn).toHaveBeenCalledOnce();
	key('ArrowUp');
	expect(document.activeElement).toBe(panel);
	key('ArrowUp');
	expect(document.activeElement?.classList.contains('close')).toBe(true);
	key('Tab', true);
	expect(panel.contains(document.activeElement)).toBe(true);
	key('Tab');
	expect(document.activeElement?.classList.contains('close')).toBe(true);
	behind.focus();
	expect(document.activeElement).toBe(panel);
	await unmount(viewer!);
	viewer = null;
	expect(document.activeElement).toBe(behind);
});
