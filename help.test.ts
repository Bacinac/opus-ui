import { describe, expect, it } from 'vitest';
import { helpFor } from './help';

describe('helpFor', () => {
	it('answers each module with the article of its own page at a shared address', () => {
		expect(helpFor('library').forPage('/settings')?.slug).toBe('library-settings');
		expect(helpFor('downloads').forPage('/settings')?.slug).toBe('engines');
		expect(helpFor('player').forPage('/settings')?.slug).toBe('house');
		expect(helpFor('player').forPage('/settings/house')?.slug).toBe('house');
		expect(helpFor('downloads').forPage('/music')).toBeUndefined();
	});

	it('holds every article whole in both languages', () => {
		for (const a of helpFor('library').articles) {
			expect(a.body.hr.trim(), a.slug).not.toBe('');
			expect(a.body.en.trim(), a.slug).not.toBe('');
		}
	});
});
