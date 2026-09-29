<script lang="ts">
	// Twenty-four years of photographs in one scroll.
	//
	// The grid knows how tall it is before it knows what is in it: the month
	// counts arrive in one small query and that is enough to lay out 44,701
	// tiles, so the scrollbar is the right size and the scrubber is honest from
	// the first frame. Rows are fetched as they are reached.
	//
	// Nothing here loads a month at a time. The timeline is one continuous
	// ordered stream — a page that starts at a month boundary runs straight on
	// past it — so what is tracked is a cursor per global index, and a month is
	// only ever a place to start.

	import { json, request } from '../kit/http';
	import { formatDate, formatNumber, plural, t } from '../kit/i18n.svelte';
	import { aboutOf, groundOf, placeholderOf, tileOf, unlessRegrouping } from './photos';
	import PhotoViewer from './PhotoViewer.svelte';
	import type { ComponentProps } from 'svelte';
	import type { SvelteSet } from 'svelte/reactivity';

	// The same shelf, sometimes narrowed to one place. Narrowing rather than a
	// second kind of grid: a place is a timeline of itself, and everything the
	// timeline already does — the months, the scrubber, the viewer — should keep
	// working inside it.
	let {
		place,
		person,
		search,
		canEdit = false,
		canDelete = false,
		tile = 156,
		rail: side = 'end',
		plays,
		chosen,
		choosable = () => true,
		actions,
		open = $bindable(null)
	}: {
		/** narrow the shelf to one place */
		place?: string;
		/** narrow it to every photograph one person is in */
		person?: number;
		/** narrow it to what a search names: who is in it, where, when */
		search?: string;
		/** whether a face may be taken off a person from the viewer — the
		 *  library's upkeep, and off wherever the shelf is only being read */
		canEdit?: boolean;
		canDelete?: boolean;
		/** How wide a photograph wants to be, which decides how many fit. It is
		 *  arithmetic and not styling — the virtual shelf computes rows from it —
		 *  so it cannot be a CSS custom property. A desk reads a shelf leaning
		 *  in; a television is read across a room and wants more of it at once,
		 *  and asks for a smaller number. The default is the desk's, so nothing
		 *  that does not ask moves. */
		tile?: number;
		/** Which edge the years stand on. A desk keeps them at the end, beside
		 *  the scrollbar they stand in for; a television keeps them at the start,
		 *  where a remote coming in from the menu meets them before the grid, and
		 *  the page reads as every other list-and-what-it-holds on that screen. */
		rail?: 'start' | 'end';
		/** where a recording plays from, handed on to the viewer */
		plays?: (id: string) => string;
		/** Given while photographs are being picked out of the shelf: a press
		 *  then adds a photograph to this set or takes it out, instead of
		 *  opening it. */
		chosen?: SvelteSet<string>;
		/** which photographs may be picked; the rest stay on the shelf, dimmed */
		choosable?: (photo: { kind: string; ready: boolean }) => boolean;
		/** Which photograph is open, as an index into the same space the grid
		 *  uses, so stepping through it walks the timeline rather than a copied
		 *  list. Bound, because closing it is the host's back step: the viewer
		 *  leaves going back to the one ladder of the application it is in. */
		open?: number | null;
		/** handed on to the viewer: what the surface does with the picture shown */
		actions?: ComponentProps<typeof PhotoViewer>['actions'];
	} = $props();

	type Photo = {
		id: string;
		kind: string;
		taken_at: string;
		dated: string;
		w: number | null;
		h: number | null;
		hash: string | null;
		ready: boolean;
		undecodable: boolean;
		turn: number;
	};
	type Bucket = { month: string; count: number };
	type Cursor = { month: string } | { before: string; before_id: number };

	const PAGE = 500;
	const GAP = 4;
	const HEAD = 34;
	// how far past the viewport to build and fetch: enough that a flick lands on
	// pictures rather than on placeholders, not so much that a drag of the
	// scrubber queues a hundred requests it will never look at
	const OVER = 3;

	let months = $state<Bucket[]>([]);
	let total = $state(0);

	let undated = $state(0);
	let ready = $state(false);

	// index-addressed and sparse: a slot is undefined until its page arrives
	let photos = $state<(Photo | undefined)[]>([]);

	/** Take the open photograph out of the library, and out of this shelf.
	 *
	 * The shelf is rebuilt rather than patched: it is a sparse run of slots that
	 * cursors index into, and removing one photograph shifts every slot after it
	 * — a list spliced in place would keep pointing a month at the wrong picture.
	 * The index is kept, so what opens next is what has moved into the gap, which
	 * is what somebody clearing a run of pictures is already looking at. */
	async function discard() {
		const one = shown;
		if (!one) return;
		if (!(await request(aboutOf(one.id), { method: 'DELETE' }, unlessRegrouping))) return;
		const at = open;
		await buckets();
		open = total ? Math.min(at ?? 0, total - 1) : null;
	}

	/** A quarter turn clockwise, for a picture the camera saved on its side. The
	 * answer is the photograph as it now stands, in the same slot. */
	async function turn() {
		const at = open;
		const one = shown;
		if (at === null || !one) return;
		const d = await request<Photo>(`${aboutOf(one.id)}/turn`, json({ by: 90 }), unlessRegrouping);
		if (d && photos[at]?.id === d.id) photos[at] = d;
	}
	function pick(i: number) {
		const photo = photos[i];
		if (!chosen) open = i;
		else if (photo && chosen.has(photo.id)) chosen.delete(photo.id);
		else if (photo) chosen.add(photo.id);
	}

	// where to resume from, keyed by the global index the next page begins at
	const cursors = new Map<number, Cursor>();
	const asked = new Set<number>();

	let box = $state<HTMLElement | null>(null);
	let width = $state(0);
	let scrollTop = $state(0);
	let viewport = $state(600);

	const cols = $derived(Math.max(2, Math.floor((width + GAP) / (tile + GAP))));
	const wide = $derived(cols ? (width - GAP * (cols - 1)) / cols : tile);
	const row = $derived(wide + GAP);

	/** Every month's place in the scroll and in the index space, computed once
	 * from the counts. This is the whole reason the counts are a separate
	 * endpoint: it is the layout, and it costs one query. */
	const laid = $derived.by(() => {
		let y = 0;
		let index = 0;
		const out = months.map((m, i) => {
			const rows = Math.ceil(m.count / cols);
			// the space a month keeps above itself is for the rule between it and
			// the one before. The first month has nothing before it, so it keeps
			// none — otherwise the shelf begins lower here than on every other
			// page, for a line that is never drawn.
			const head = i ? HEAD : 0;
			const at = { ...m, y, index, rows, top: y + head };
			y += head + rows * row;
			index += m.count;
			return at;
		});
		return { blocks: out, height: y };
	});

	/** The blocks the reader can see, each already narrowed to the rows they can
	 * see. Narrowed here and not in the markup because May 2025 holds 3,329
	 * photographs — 832 rows — and walking all of them to draw five is work
	 * repeated on every frame of a scroll. */
	const visible = $derived.by(() => {
		const from = scrollTop - OVER * row;
		const to = scrollTop + viewport + OVER * row;
		return laid.blocks
			.filter((b) => b.top + b.rows * row >= from && b.y <= to)
			.map((b) => {
				const first = Math.max(0, Math.floor((from - b.top) / row));
				const last = Math.min(b.rows - 1, Math.ceil((to - b.top) / row));
				const rows = [];
				for (let r = first; r <= last; r++) rows.push(r);
				return { ...b, rows, from: b.index + first * cols };
			});
	});

	/** What the whole shelf is narrowed to, said once so the rail and the pages
	 *  cannot disagree about which library they are counting. */
	function narrowing() {
		const q = new URLSearchParams();
		if (place) q.set('place', place);
		if (person !== undefined) q.set('person', String(person));
		if (search) q.set('q', search);
		return q;
	}

	async function buckets() {
		const narrowed = narrowing();
		const d = await request<{ months: Bucket[]; total: number; undated: number }>(
			'/api/photos/timeline/buckets' + (narrowed.size ? `?${narrowed}` : '')
		);
		if (!d) return;
		months = d.months;
		total = d.total;
		undated = d.undated;
		photos = new Array(total);
		cursors.clear();
		asked.clear();
		let index = 0;
		for (const m of d.months) {
			cursors.set(index, { month: m.month });
			index += m.count;
		}
		ready = true;
	}

	/** Fill a run of slots, following cursors forward from the nearest one we
	 * have. A month boundary is always a cursor, so the walk is never long. */
	async function fill(from: number, to: number) {
		let at = from;
		let guard = 0;
		while (at < to && guard++ < 8) {
			if (photos[at] !== undefined) {
				at += 1;
				continue;
			}
			let start = at;
			while (start >= 0 && !cursors.has(start)) start -= 1;
			if (start < 0 || asked.has(start)) return;
			asked.add(start);
			const cursor = cursors.get(start)!;
			const q = narrowing();
			q.set('limit', String(PAGE));
			if ('month' in cursor) q.set('month', cursor.month);
			else {
				q.set('before', cursor.before);
				q.set('before_id', String(cursor.before_id));
			}
			const d = await request<{ photos: Photo[]; next: Cursor | null }>(`/api/photos/timeline?${q}`);
			if (!d) return;
			const next = photos.slice();
			d.photos.forEach((p: Photo, i: number) => {
				next[start + i] = p;
			});
			photos = next;
			if (d.next) cursors.set(start + d.photos.length, d.next);
			at = start + d.photos.length;
		}
	}

	$effect(() => {
		// said out loud rather than left to be noticed inside an async call: what
		// this shelf is narrowed to is the only reason to ask again, and a
		// dependency read past the first await is a dependency nothing tracked
		void person;
		void place;
		void search;
		buckets();
	});

	$effect(() => {
		if (box) measure();
	});

	/** What is asked for is where the scroll STOPS.
	 *
	 *  A walk down the years crosses the whole library in a second, and every
	 *  year it passes through is a page of five hundred rows asked for and a
	 *  shelf of forty thousand slots copied to hold them — for a year nobody
	 *  looked at. A tenth of a second is under the notice of somebody scrolling
	 *  and far longer than the gap between two presses of a held arrow. */
	const SETTLE = 100;
	$effect(() => {
		if (!ready || !visible.length) return;
		const first = visible[0];
		const last = visible[visible.length - 1];
		const upto = last.index + Math.min(last.count, (last.rows.at(-1)! + 1) * cols);
		const soon = setTimeout(() => fill(first.from, Math.min(total, upto)), SETTLE);
		return () => clearTimeout(soon);
	});

	function measure() {
		if (!box) return;
		width = box.clientWidth;
		viewport = pane ? pane.clientHeight : window.innerHeight;
	}

	/** Whatever actually scrolls this: the window on a page that scrolls itself,
	 *  and the box around it on a surface that keeps its head still and lets only
	 *  the shelf move. Found rather than declared — a caller that had to say
	 *  would be a caller that can be wrong about its own page. */
	let pane = $state<HTMLElement | null>(null);

	$effect(() => {
		let at: HTMLElement | null = box?.parentElement ?? null;
		while (at) {
			const how = getComputedStyle(at).overflowY;
			if (how === 'auto' || how === 'scroll') break;
			at = at.parentElement;
		}
		pane = at;
		measure();
		onscroll();
	});

	$effect(() => {
		if (!pane) return;
		const here = pane;
		here.addEventListener('scroll', onscroll, { passive: true });
		return () => here.removeEventListener('scroll', onscroll);
	});

	function onscroll() {
		// How far down the grid we are looking, which is the distance its top has
		// travelled above the top of whatever is showing it. One measurement for
		// both: the window's top is zero, and a box's is wherever the box is.
		const grid = box?.getBoundingClientRect().top ?? 0;
		const showing = pane ? pane.getBoundingClientRect().top : 0;
		scrollTop = showing - grid;
	}




	/** The years, evenly spaced, each with how much it holds.
	 *
	 * They used to be placed where the year actually sat in the scroll, so the
	 * gaps showed which years were busy. That is real information and it cost
	 * more than it gave: a year of forty photographs got three pixels, its label
	 * collided with its neighbour's, and it could not be hit at all. Every year
	 * gets the same room now and the busy-ness is drawn as a bar beside it —
	 * which says the same thing and can be read. Nothing overlaps at any number
	 * of years, and the rail scrolls when it outgrows the window. */
	const years = $derived.by(() => {
		const held = new Map<string, number>();
		for (const m of months) {
			const y = m.month.slice(0, 4);
			held.set(y, (held.get(y) ?? 0) + m.count);
		}
		const most = Math.max(1, ...held.values());
		const firstBlock = new Map<string, number>();
		for (const b of laid.blocks) {
			const y = b.month.slice(0, 4);
			if (!firstBlock.has(y)) firstBlock.set(y, b.y);
		}
		return [...held.entries()].map(([year, count]) => ({
			year,
			count,
			share: count / most,
			at: laid.height ? (firstBlock.get(year) ?? 0) / laid.height : 0
		}));
	});

	let rail = $state<HTMLElement | null>(null);

	/** The year that has been asked to show its months.
	 *
	 * A year unfolds because it was pressed, never because it is being looked
	 * at. Unfolding whatever the wall happens to be showing puts twelve months
	 * in the way of a walk down the ruler — the step under a year is then
	 * January, not the next year — and makes the ruler shuffle under the hand of
	 * anybody merely scrolling. */
	let unfolded = $state<string | null>(null);

	/** The months of the unfolded year, which are the ones it actually holds —
	 * the ones with photographs in them and no others. */
	const monthsHere = $derived.by(() =>
		laid.blocks
			.filter((b) => b.month.slice(0, 4) === unfolded)
			.map((b) => ({
				month: b.month,
				name: monthName(b.month),
				count: b.count,
				at: laid.height ? b.y / laid.height : 0
			}))
	);

	// The number, not the name. In a column under a four-digit year a padded
	// month reads as a scale and lines up with the one above it; a word does
	// neither, and twelve words of different lengths make a ragged edge out of
	// what is really a ruler.
	function monthName(month: string) {
		return month.slice(5);
	}

	/** The month the grid is looking at, so the rail can mark it among the
	 * months of the open year. */
	const atMonth = $derived.by(() => {
		let here = '';
		for (const b of laid.blocks) {
			if (b.y <= scrollTop + 8) here = b.month;
			else break;
		}
		return here;
	});

	/** Which year the grid is looking at, so the rail can say where you are
	 * without the labels having to carry that too. */
	const atYear = $derived.by(() => {
		let here = years[0]?.year ?? '';
		for (const y of years) {
			if (y.at * laid.height <= scrollTop + 8) here = y.year;
			else break;
		}
		return here;
	});

	$effect(() => {
		const here = atYear;
		if (!rail || !here) return;
		const mark = rail.querySelector<HTMLElement>('.year.here');
		if (!mark) return;
		const above = mark.offsetTop - rail.scrollTop;
		if (above < 24 || above > rail.clientHeight - 40)
			rail.scrollTo({ top: Math.max(0, mark.offsetTop - rail.clientHeight / 2) });
	});

	/** An unfolded year keeps its months where they can be seen. Opened low in
	 * the rail, twelve months fall out of the bottom of the box that holds them:
	 * the year answers and what it said is off the screen. */
	const AIR = 28;
	$effect(() => {
		if (!rail || !unfolded) return;
		const mark = rail.querySelector<HTMLElement>('.year[aria-expanded="true"]');
		if (!mark) return;
		// only one year is ever unfolded, so these are its months
		const mons = rail.querySelectorAll<HTMLElement>('.mon');
		const last = mons[mons.length - 1] ?? mark;
		const foot = last.offsetTop + last.offsetHeight;
		if (foot - rail.scrollTop > rail.clientHeight - 8)
			rail.scrollTo({ top: Math.max(0, mark.offsetTop - AIR) });
	});

	const shown = $derived(open === null ? null : photos[open]);

	$effect(() => {
		if (open === null) return;
		fill(open, Math.min(total, open + 2));
	});

	function step(by: number) {
		if (open === null) return;
		const to = open + by;
		if (to >= 0 && to < total) open = to;
	}

	const nearby = $derived.by(() => {
		if (open === null) return [];
		return [photos[open - 1], photos[open + 1]]
			.filter((p) => p && p.ready && p.kind !== 'video')
			.map((p) => ({ id: p!.id, turn: p!.turn }));
	});

	function jump(fraction: number) {
		const grid = box?.getBoundingClientRect().top ?? 0;
		const showing = pane ? pane.getBoundingClientRect().top : 0;
		const now = pane ? pane.scrollTop : window.scrollY;
		// where that fraction of the grid would have to sit for the top of what is
		// showing to be looking at it
		const to = now + (grid - showing) + fraction * laid.height;
		// Instant, whatever the surface's stylesheet says about scrolling. A ruler
		// is a jump, not a journey: twenty-four years is four hundred thousand
		// pixels, and smoothed that is two seconds of everything you own flying
		// past before the year you asked for arrives.
		(pane ?? window).scrollTo({ top: to, behavior: 'instant' });
	}

	/** The wall goes where the ring comes to REST, not where it passes.
	 *
	 * A held arrow crosses fifteen years in a second; fifteen jumps is the whole
	 * library flying past, which is the scrolling a ruler exists to spare
	 * somebody. So the years are walked at the speed of the remote and the wall
	 * arrives once, a quarter of a second after the walking stops. A press is
	 * not a walk and goes at once. */
	const REST = 250;
	let resting: ReturnType<typeof setTimeout> | null = null;
	let awaited: number | null = null;

	function look(at: number) {
		awaited = at;
		if (resting) clearTimeout(resting);
		resting = setTimeout(() => go(at), REST);
	}

	function go(at: number) {
		if (resting) clearTimeout(resting);
		resting = null;
		awaited = null;
		jump(at);
	}

	/** The ring is leaving the ruler: whatever it was about to look at happens
	 * now, so nothing is chosen on a wall that is still about to move. */
	function leaving(event: FocusEvent) {
		const to = event.relatedTarget as Node | null;
		if (to && rail?.contains(to)) return;
		if (awaited !== null) go(awaited);
	}
</script>

<svelte:window {onscroll} onresize={measure} />

{#if ready && !total}
	<p class="empty">{t(search ? 'photos.search.none' : 'photos.empty')}</p>
{:else}
	<div class="wrap" class:lead={side === 'start'}>
		<div class="grid" bind:this={box} style:height="{laid.height}px">
			{#each visible as block (block.month)}
				{#if block.y > 0}
					<!-- a rule and nothing else. Which month this is belongs to the
					     rail, which can say it without spending a line of the grid
					     on every one of three hundred months -->
					<div class="between" style:top="{block.y + HEAD / 2}px"></div>
				{/if}
				{#each block.rows as r (r)}
					{@const y = block.top + r * row}
					{#each Array(Math.min(cols, block.count - r * cols)) as _, c (c)}
						{@const i = block.index + r * cols + c}
						{@const photo = photos[i]}
						{@const may = !chosen || (photo !== undefined && choosable(photo))}
						<button
							class="cell"
							class:chosen={photo !== undefined && chosen?.has(photo.id)}
							class:barred={!may}
							type="button"
							disabled={!may}
							aria-pressed={chosen && photo ? chosen.has(photo.id) : undefined}
							onclick={() => pick(i)}
							aria-label={photo ? formatDate(photo.taken_at) : ''}
							style:top="{y}px"
							style:left="{c * (wide + GAP)}px"
							style:width="{wide}px"
							style:height="{wide}px"
						>
							{#if photo?.undecodable}
								<div class="broken" title={t('photos.unreadable')}>?</div>
							{:else if photo && !photo.ready}
								<!-- no tile on disk: a clip, or an image the pass has not
								     reached. Asking for one anyway is a 404, and a 404 in an
								     <img> is the browser's torn-page icon — which says
								     "broken" about a photograph that is perfectly fine. -->
								<div class="pending" class:clip={photo.kind === 'video'}></div>
							{:else if photo}
								<img
									src={tileOf(photo.id, photo.turn)}
									alt=""
									loading="lazy"
									decoding="async"
									style:background-image={groundOf(photo.hash)}
								/>
								{#if photo.kind === 'video'}
									<!-- A recording whose poster has been made looks exactly
									     like a photograph, and a shelf you have to click to
									     find out which of its tiles will move is a shelf
									     that is hiding something it knows. -->
									<span class="mark" aria-hidden="true"></span>
								{/if}
								{#if chosen?.has(photo.id)}
									<span class="tick" aria-hidden="true"></span>
								{/if}
							{:else}
								<div class="wait"></div>
							{/if}
						</button>
					{/each}
				{/each}
			{/each}
		</div>

		<!-- The rail follows the grid, and the grid follows the rail: standing on a
		     year IS looking at it, so the photographs behind the ruler are the
		     ones of the year the ring has come to rest on. It used to move only
		     when a year was pressed, and pressing also left the rail for the wall
		     — so a year cost a press and a way back, and walking the years showed
		     the same photographs the whole way down. Moving with every step of the
		     walk was no better: the wall then scrolled through everything on the
		     way, which is what a ruler is for avoiding.

		     Pressing a year is therefore left to mean the one thing looking at it
		     does not: unfold it into its months. `data-stay` says so to the
		     remote, which otherwise hands the ring to the wall on any press in a
		     ruler — here that would open the months and then leave them.

		     With forty years the rail is taller than the window, and a rail that
		     has to be scrolled to find where you are is a rail that has stopped
		     saying where you are. -->
		<div
			class="scrub"
			class:framed={Boolean(pane)}
			bind:this={rail}
			onfocusout={leaving}
			aria-label={t('photos.jump')}
		>
			{#each years as y (y.year)}
				<button
					class="year"
					class:here={y.year === atYear}
					class:decade={y.year.endsWith('0')}
					data-stay
					aria-expanded={y.year === unfolded}
					onclick={() => {
						go(y.at);
						unfolded = unfolded === y.year ? null : y.year;
					}}
					onfocus={() => {
						look(y.at);
						if (unfolded !== y.year) unfolded = null;
					}}
					title={plural(y.count, 'photos.count.one', 'photos.count.few', 'photos.count.many')}
				>
					<span class="tally"><span class="bar" style:width="{6 + y.share * 94}%"></span></span>
					<span class="n">{y.year}</span>
				</button>
				{#if y.year === unfolded}
					{#each monthsHere as m (m.month)}
						<button
							class="mon"
							class:here={m.month === atMonth}
							onclick={() => go(m.at)}
							onfocus={() => look(m.at)}
							title={plural(m.count, 'photos.count.one', 'photos.count.few', 'photos.count.many')}
						>
							{m.name}
						</button>
					{/each}
				{/if}
			{/each}
		</div>
	</div>

	{#if shown}
		<PhotoViewer
			{canEdit}
			ondelete={canDelete ? discard : undefined}
			onturn={canEdit ? turn : undefined}
			photo={shown}
			placeholder={placeholderOf(shown.hash)}
			hasPrev={open !== null && open > 0}
			hasNext={open !== null && open + 1 < total}
			neighbours={nearby}
			{plays}
			{actions}
			onclose={() => (open = null)}
			onprev={() => step(-1)}
			onnext={() => step(1)}
		/>
	{/if}

	{#if undated}
		<p class="undated">{t('photos.undated.n', { n: formatNumber(undated) })}</p>
	{/if}
{/if}

<style>
	.wrap {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}
	.lead .scrub {
		order: -1;
	}
	.lead .year {
		grid-template-columns: auto 1fr;
	}
	.lead .year .n {
		order: -1;
	}
	.lead .tally {
		justify-content: flex-start;
	}
	.lead .mon {
		text-align: left;
		padding: 0.12rem 0.6rem 0.12rem 0.35rem;
	}
	.grid {
		position: relative;
		flex: 1;
		min-width: 0;
	}
	.n {
		font-size: var(--fs-s);
		font-weight: 400;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.cell {
		position: absolute;
		overflow: hidden;
		padding: 0;
		border: 0;
		cursor: pointer;
		border-radius: 3px;
		background: var(--surface-2);
	}
	.cell.chosen {
		outline: 3px solid var(--accent);
		outline-offset: -3px;
	}
	.cell.barred {
		cursor: default;
		opacity: 0.35;
	}
	.tick {
		position: absolute;
		left: 4px;
		top: 4px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--accent);
		pointer-events: none;
	}
	.tick::after {
		content: '';
		position: absolute;
		left: 7px;
		top: 3px;
		width: 5px;
		height: 10px;
		border: solid var(--bg);
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
	}
	.cell img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		background-size: cover;
		background-position: center;
	}
	.wait {
		width: 100%;
		height: 100%;
	}
	.pending {
		width: 100%;
		height: 100%;
	}
	.clip::after {
		content: '';
		position: absolute;
		inset: 0;
		margin: auto;
		width: 0;
		height: 0;
		border-left: 0.9rem solid var(--muted);
		border-top: 0.55rem solid transparent;
		border-bottom: 0.55rem solid transparent;
	}
	/* over the corner of the picture rather than its middle: the picture is what
	   the grid is for, and the mark only has to be found, not looked at */
	.mark {
		position: absolute;
		right: 4px;
		bottom: 4px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--veil);
		display: grid;
		place-items: center;
		pointer-events: none;
	}
	.mark::after {
		content: '';
		width: 0;
		height: 0;
		border-left: 7px solid var(--on-picture);
		border-top: 4px solid transparent;
		border-bottom: 4px solid transparent;
		/* a triangle's weight sits left of its box, so it is nudged back */
		margin-left: 2px;
	}
	.broken {
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
		color: var(--muted);
		font-size: var(--fs-xl);
		border: 1px dashed var(--border);
		border-radius: 3px;
	}
	/* Inside a box that scrolls, what the page keeps at the top is above the box
	   rather than above the ruler: it starts where the box starts and is as tall
	   as the box is. */
	.scrub.framed {
		top: 0;
		max-height: 100%;
	}
	.scrub {
		position: sticky;
		/* under everything the page keeps at the top — the shell's header and the
		   page's own head — not under the top of the window. Pinned any higher,
		   the first year slides behind the head and is gone exactly when
		   somebody scrolls up to reach it. */
		top: calc(var(--shell-header, 0px) + var(--page-head, 0px) + 0.75rem);
		width: 5.4rem;
		max-height: calc(
			100vh - var(--shell-header, 0px) - var(--page-head, 0px) - 1.5rem
		);
		flex: none;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 0.3rem 0.15rem;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
	}
	.scrub::-webkit-scrollbar {
		display: none;
	}
	/* A small chart with its labels, rather than numbers with a highlight behind
	   them: the bar sits in its own column and ends flush against the year, so
	   the eye reads one row as "this much, that year" and the column of numbers
	   stays a clean edge. */
	.year {
		flex: none;
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 0.4rem;
		padding: 0.2rem 0.35rem;
		border: 0;
		background: none;
		font: inherit;
		font-size: var(--fs-m);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.01em;
		color: var(--muted);
		cursor: pointer;
		border-radius: 5px;
		transition: background 0.12s ease, color 0.12s ease;
	}
	/* the open year unfolds into the months it holds. The grid no longer spends a
	   line on each of three hundred months, so this is where a month is named */
	.mon {
		flex: none;
		text-align: right;
		padding: 0.12rem 0.35rem 0.12rem 0.6rem;
		border: 0;
		background: none;
		font: inherit;
		font-size: var(--fs-s);
		font-variant-numeric: tabular-nums;
		color: var(--muted);
		opacity: 0.75;
		cursor: pointer;
		border-radius: 5px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.mon:hover,
	.mon:focus-visible {
		color: var(--text);
		opacity: 1;
		background: var(--surface-2);
	}
	.mon.here {
		color: var(--kind-photos);
		opacity: 1;
		font-weight: 600;
	}
	.tally {
		display: flex;
		justify-content: flex-end;
		min-width: 0;
	}
	.bar {
		height: 5px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--kind-photos) 34%, transparent);
		transition: background 0.12s ease, height 0.12s ease;
	}
	/* every tenth year carries a little more weight, so a rail of forty has a
	   shape the eye can hold rather than forty identical rows */
	.year.decade {
		color: var(--text);
	}
	.year:hover,
	.year:focus-visible {
		color: var(--text);
		background: var(--surface-2);
	}
	.year:hover .bar,
	.year:focus-visible .bar {
		background: color-mix(in srgb, var(--kind-photos) 60%, transparent);
	}
	.year.here {
		color: var(--text);
		font-weight: 600;
		background: color-mix(in srgb, var(--kind-photos) 12%, transparent);
	}
	.year.here .bar {
		height: 7px;
		background: var(--kind-photos);
	}
	.empty,
	.undated {
		color: var(--muted);
		font-size: var(--fs-m);
	}
</style>
