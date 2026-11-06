// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import PhotoViewer from './PhotoViewer.svelte';
import { registerModule } from './i18n';
import { dismissLayer } from '#lib/kit/layers.js';

registerModule({ hr: {}, en: {} });
let viewer: ReturnType<typeof mount> | null = null;
afterEach(async () => {
	if (viewer) await unmount(viewer);
	viewer = null;
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

test('closing the viewer gives the page its scroll back', async () => {
	document.body.innerHTML = '<main></main>';
	document.body.style.overflow = '';
	flushSync(() => {
		viewer = mount(PhotoViewer, { target: document.querySelector('main')!, props: {
			photo: { id: '1', kind: 'image', taken_at: null, dated: '', w: 100, h: 100,
				hash: null, ready: true, undecodable: false, turn: 0 },
			about: false, onclose: vi.fn()
		} });
	});
	expect(document.body.style.overflow).toBe('hidden');
	await unmount(viewer!);
	viewer = null;
	expect(document.body.style.overflow).toBe('');
});

test('focus stays in the viewer, every D-pad action is reachable, and closing restores the grid', async () => {
	document.body.innerHTML = '<button id="behind">Grid tile</button><main></main>';
	const behind = document.querySelector<HTMLButtonElement>('#behind')!;
	behind.focus();
	const prev = vi.fn(), next = vi.fn(), close = vi.fn(), turn = vi.fn();
	const underlying = vi.fn();
	const pageBack = vi.fn();
	window.addEventListener('keydown', pageBack);
	const removeBack = () => window.removeEventListener('keydown', pageBack);
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
	pageBack.mockClear();
	key('Escape');
	expect(close).toHaveBeenCalledOnce();
	expect(pageBack).not.toHaveBeenCalled();
	close.mockClear();
	expect(dismissLayer()).toBe(true);
	expect(close).toHaveBeenCalledOnce();
	removeBack();
	await unmount(viewer!);
	viewer = null;
	expect(document.activeElement).toBe(behind);
});

test('an unnamed face is given to somebody from the viewer, and the next one is asked about', async () => {
	document.body.innerHTML = '<main></main>';
	const onfaces = vi.fn();
	const box = { x: 0.1, y: 0.1, w: 0.1, h: 0.1 };
	const sent: unknown[] = [];
	vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
		const path = String(url);
		if (path.includes('/faces/person')) {
			sent.push(JSON.parse(String(init?.body)));
			return Response.json({ faces: 1, person: { id: 7, name: 'Jana' } });
		}
		if (path.includes('/people')) return Response.json([{ name: 'Eva' }]);
		return Response.json({ id: '1', faces: [
			{ id: 1, ...box, person: null },
			{ id: 2, ...box, person: null }
		] });
	});
	flushSync(() => {
		viewer = mount(PhotoViewer, { target: document.querySelector('main')!, props: {
			photo: { id: '1', kind: 'image', taken_at: null, dated: '', w: 100, h: 100,
				hash: null, ready: true, undecodable: false, turn: 0 },
			canEdit: true, onfaces, onclose: vi.fn()
		} });
	});
	const add = await vi.waitFor(() => {
		const found = [...document.querySelectorAll<HTMLElement>('.who button')].at(-1);
		expect(found?.textContent).toContain('2');
		return found!;
	});
	add.click();
	flushSync();
	const input = () => document.querySelector<HTMLInputElement>('input[list="viewer-people"]')!;
	input().value = 'Jana';
	input().dispatchEvent(new Event('input', { bubbles: true }));
	input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	await vi.waitFor(() => expect(onfaces).toHaveBeenCalledOnce());
	flushSync();
	expect(sent).toEqual([{ name: 'Jana', faces: [1], ignore_dates: false }]);
	expect(document.querySelector('.who')?.textContent).toContain('Jana');
	expect(input().value).toBe('');
	window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	flushSync();
	expect(input()).toBeNull();
});
