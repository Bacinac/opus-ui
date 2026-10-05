<script lang="ts">
	// One photograph, filling the screen.
	//
	// The preview is 2048 px of AVIF — one file, fetched once, decoded once,
	// which is the whole reason the previews are AVIF while the tiles are JPEG.
	// It arrives over the thumbhash the grid already had, so the frame is never
	// empty and never flashes white on the way in.
	//
	// Neighbours are preloaded, because the arrow keys are how a person actually
	// goes through an evening's photographs and a wait between each one turns
	// that into work.

	import { onMount, type Snippet } from 'svelte';
	import ArmedButton from '../kit/ArmedButton.svelte';
	import Button from '../kit/Button.svelte';
	import { cssUrl } from '../kit/css';
	import { json, Latest, request } from '../kit/http';
	import { formatDateTime, formatNumber, plural, t } from '../kit/i18n.svelte';
	import { layer } from '../kit/layers';
	import { aboutOf, playOf, previewOf, unlessRegrouping } from './photos';
	import Tag from '../kit/Tag.svelte';

	type Photo = {
		id: string;
		kind: string;
		/** absent where the picture is handed on without when it was taken */
		taken_at: string | null;
		dated: string;
		/** the picture's own shape, so a box at a fraction of it lands on the face */
		w: number | null;
		h: number | null;
		hash: string | null;
		ready: boolean;
		undecodable: boolean;
		/** clockwise degrees a person turned it by */
		turn: number;
	};

	let {
		photo,
		placeholder,
		hasPrev = false,
		hasNext = false,
		onclose,
		onprev,
		onnext,
		// Given only where somebody may actually destroy something. The package
		// offers the control; who is allowed to see it is the caller's judgement,
		// and deliberately not folded into canEdit — that one is upkeep, this one
		// does not come back.
		ondelete,
		onturn,
		neighbours = [],
		plays = playOf,
		shows = previewOf,
		about = true,
		download,
		actions,
		// Taking a face off a person and naming where a picture was taken are the
		// library's upkeep. Off by default so a surface that only shows
		// photographs gets no control it would be refused for pressing, and so a
		// new caller has to ask for it.
		canEdit = false
	}: {
		photo: Photo;
		placeholder?: string;
		hasPrev?: boolean;
		hasNext?: boolean;
		canEdit?: boolean;
		onclose: () => void;
		/** absent where the photograph stands alone, with nothing either side of it */
		onprev?: () => void;
		onnext?: () => void;
		ondelete?: () => void;
		/** a quarter turn clockwise; given only where somebody may redraw the picture */
		onturn?: () => void;
		/** pictures to warm the cache with, so the next press is instant */
		neighbours?: { id: string; turn: number }[];
		/** where a recording plays from: a player names what its screen decodes */
		plays?: (id: string) => string;
		/** where the picture itself is fetched from */
		shows?: (id: string, turn: number) => string;
		/** Whether to ask the library who is in the picture and where it was
		 *  taken. Off for a picture handed outside the household, which gets
		 *  the picture and nothing about it. */
		about?: boolean;
		/** where the file itself is taken from, for a surface that hands it over */
		download?: string;
		/** what the surface itself does with the picture shown, beside the
		 *  package's own controls */
		actions?: Snippet<[Photo]>;
	} = $props();

	/** A place is typed for the day, not for the photograph: a trip is not entered
	 * one picture at a time. */
	async function callIt(whole: boolean) {
		const name = said.trim();
		if (!name) return;
		const d = await request<{ place: string; photographs: number }>(
			`${aboutOf(photo.id)}/place`,
			json({ name, day: whole }, 'PUT')
		);
		if (!d) return;
		place = d.place;
		naming = false;
		spread = d.photographs;
	}

	const here = layer(() => {
		if (naming) naming = false;
		else onclose();
	});
	$effect(() => here.drop);
	let panel = $state<HTMLElement | null>(null);
	const stops = () => [...(panel?.querySelectorAll<HTMLElement>(
		'button:not([disabled]), a[href], input:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])'
	) ?? [])].filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);
	onMount(() => {
		const before = document.activeElement as HTMLElement | null;
		const overflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		panel?.focus();
		const contain = () => {
			if (here.top() && !panel?.contains(document.activeElement)) panel?.focus();
		};
		document.addEventListener('focusin', contain, true);
		return () => {
			document.removeEventListener('focusin', contain, true);
			document.body.style.overflow = overflow;
			if (before?.isConnected) before.focus();
		};
	});

	function walk(e: KeyboardEvent) {
		if (!here.top() || !panel) return;
		const active = document.activeElement;
		const offered = stops();
		if (e.key === 'Escape') {
			if (naming) return;
			onclose();
		} else if (e.key === 'Tab') {
			if (!offered.length) panel.focus();
			else if (!panel.contains(active) || active === panel ||
				(e.shiftKey ? active === offered[0] : active === offered.at(-1))) {
				(e.shiftKey ? offered.at(-1)! : offered[0]).focus();
			} else return;
		} else if (!naming && e.key.startsWith('Arrow')) {
			const controls = offered.filter((el) => !el.classList.contains('step'));
			const at = controls.indexOf(active as HTMLElement);
			if (at < 0) {
				if (e.key === 'ArrowLeft' && hasPrev) onprev?.();
				else if (e.key === 'ArrowRight' && hasNext) onnext?.();
				else if (e.key === 'ArrowUp') controls[0]?.focus();
				else if (e.key === 'ArrowDown') (controls[1] ?? controls[0])?.focus();
			} else if (e.key === 'ArrowUp') panel.focus();
			else {
				const direction = e.key === 'ArrowLeft' ? -1 : 1;
				controls[(at + direction + controls.length) % controls.length]?.focus();
			}
		} else if (e.key !== 'Enter' || active !== panel) return;
		e.preventDefault();
		e.stopImmediatePropagation();
	}

	$effect(() => {
		window.addEventListener('keydown', walk, true);
		return () => window.removeEventListener('keydown', walk, true);
	});

	// Warmed by asking for the image, not by a <link rel=prefetch>: the link
	// hint means "for a future navigation", browsers weight it accordingly, and
	// in the body it is honoured unevenly. This is the same request the next
	// press will make, so the cache holds the answer before it is asked.
	$effect(() => {
		for (const n of neighbours) new Image().src = shows(n.id, n.turn);
	});

	// the page behind must not scroll under the overlay — on a phone that is how
	// a swipe meant for the next photograph moves the grid instead
	$effect(() => {
		const had = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = had;
		};
	});

	// Who is in the picture. Asked per photograph rather than carried in the grid
	// row: the grid holds thousands of rows and almost none of them are looked at
	// closely, so this is the one place the answer is actually wanted.
	type Face = {
		id: number;
		x: number;
		y: number;
		w: number;
		h: number;
		person: { id: number; name: string } | null;
	};
	let faces = $state<Face[]>([]);
	let place = $state<string | null>(null);
	let where = $state<{ lat: number; lon: number } | null>(null);
	let naming = $state(false);
	let said = $state('');
	let spread = $state(0);
	const asking = new Latest();
	$effect(() => {
		const id = photo.id;
		// turning drops the faces and finds them again in the new frame
		photo.turn;
		faces = [];
		if (!about) return;
		request<{
			id: string;
			faces?: Face[];
			place?: string | null;
			where?: { lat: number; lon: number } | null;
		}>(aboutOf(id), {}, { latest: asking }).then((d) => {
			if (!d || d.id !== id) return;
			faces = d.faces ?? [];
			place = d.place ?? null;
			where = d.where ?? null;
			naming = false;
			said = '';
			spread = 0;
		});
	});
	let named = $derived(
		[...new Map(faces.filter((f) => f.person).map((f) => [f.person!.id, f.person!])).values()]
	);
	let unnamed = $derived(faces.filter((f) => !f.person).length);
	// which face is being pointed at, in the picture or in the list under it
	let onto = $state<number | null>(null);

	/** Take one face off whoever it was given to. It keeps existing — this is for
	 * a real face of a real person who simply is not this one. */
	async function detach(id: number) {
		if (!(await request('/api/photos/faces/detach', json({ faces: [id] }), unlessRegrouping))) return;
		faces = faces.map((f) => (f.id === id ? { ...f, person: null } : f));
	}

	function takeFocus(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	// a swipe is how this is used on a phone, and the threshold is in pixels
	// rather than a fraction so it does not change meaning with the screen
	let startX = 0;
	function down(e: PointerEvent) {
		startX = e.clientX;
	}
	function up(e: PointerEvent) {
		const dx = e.clientX - startX;
		if (Math.abs(dx) < 60) return;
		if (dx > 0 && hasPrev) onprev?.();
		else if (dx < 0 && hasNext) onnext?.();
	}
</script>

<div
	class="shade"
	role="dialog"
	aria-modal="true"
	aria-label={photo.taken_at ? formatDateTime(photo.taken_at) : t('photos.photo')}
	tabindex="-1"
	bind:this={panel}
	onpointerdown={down}
	onpointerup={up}
>
	<button class="close" onclick={onclose} aria-label={t('common.close')}>×</button>

	{#if actions || ondelete || download || (onturn && photo.ready && photo.kind !== 'video')}
		<div class="discard">
			{@render actions?.(photo)}
			{#if download}
				<Button href={download} download>{t('photos.download')}</Button>
			{/if}
			{#if onturn && photo.ready && photo.kind !== 'video'}
				<Button onclick={onturn}>{t('photos.turn')}</Button>
			{/if}
			{#if ondelete}
				<ArmedButton onconfirm={ondelete}>{t('photos.discard')}</ArmedButton>
			{/if}
		</div>
	{/if}

	{#if hasPrev}
		<button class="step left" onclick={onprev} aria-label={t('photos.prev')}>‹</button>
	{/if}
	{#if hasNext}
		<button class="step right" onclick={onnext} aria-label={t('photos.next')}>›</button>
	{/if}

	<div class="stage">
		{#if photo.undecodable}
			<p class="note">{t('photos.unreadable')}</p>
		{:else if photo.kind === 'video'}
			<!-- It plays, and it plays at once: opening a recording IS the
			     press that asks for it, and a second press to start what you
			     just chose is a press for nothing. Browsers that refuse sound
			     without their own gesture simply leave the poster up with the
			     controls on it, which is exactly where this used to start.

			     The library serves the household's own file off the household's
			     own disk, untranscoded, and answers ranges — so this can be
			     scrubbed rather than waited for. A player hands over its own
			     address instead, and rebuilds what its screen cannot open. The still it opens on is the
			     frame the shelf shows, a second into the recording: a phone
			     spends the first moment opening its lens. -->
			{#key photo.id}
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					src={plays(photo.id)}
					poster={shows(photo.id, photo.turn)}
					controls
					playsinline
					autoplay
					preload="metadata"
				></video>
			{/key}
		{:else if photo.ready}
			{#key `${photo.id}:${photo.turn}`}
				<!-- The frame is given the picture's own shape, so a box drawn at a
				     fraction of it lands where the face is. Letterboxing inside an
				     img would put every box in the wrong place by however much of
				     the element the picture does not fill. -->
				<div class="frame" style:aspect-ratio={photo.w && photo.h ? `${photo.w}/${photo.h}` : undefined}>
					<img
						src={shows(photo.id, photo.turn)}
						alt=""
						decoding="async"
						style:background-image={placeholder ? cssUrl(placeholder) : undefined}
					/>
					{#each faces as f (f.id)}
						<button
							class="box"
							class:named={!!f.person}
							class:onto={onto === f.id}
							style:left="{f.x * 100}%"
							style:top="{f.y * 100}%"
							style:width="{f.w * 100}%"
							style:height="{f.h * 100}%"
							onmouseenter={() => (onto = f.id)}
							onmouseleave={() => (onto = null)}
							onclick={() => (onto = onto === f.id ? null : f.id)}
							aria-label={f.person?.name ?? t('photos.unknownFace')}
						>
							{#if f.person}<span class="label">{f.person.name}</span>{/if}
						</button>
					{/each}
				</div>
			{/key}
		{:else}
			<p class="note">{t('common.loading')}</p>
		{/if}
	</div>

	<div class="foot">
		{#if photo.taken_at}
			<p class="when">{formatDateTime(photo.taken_at)}</p>
		{/if}
		<p class="place">
			{#if naming}
				<input
					use:takeFocus
					bind:value={said}
					placeholder={t('photos.whereAsk')}
					onkeydown={(e) => {
						if (e.key === 'Enter') callIt(true);
						else if (e.key === 'Escape') naming = false;
					}}
				/>
				<Tag onpicture onclick={() => callIt(true)}>{t('photos.wholeDay')}</Tag>
				<Tag onpicture onclick={() => callIt(false)}>{t('photos.thisOne')}</Tag>
			{:else if canEdit}
				<Tag
					onpicture
					tone={place ? 'fact' : 'quiet'}
					onclick={() => {
						naming = true;
						said = place ?? '';
					}}
				>
					{place ?? (where ? t('photos.unnamedPlace') : t('photos.whereUnknown'))}
				</Tag>
			{:else if place}
				<Tag onpicture>{place}</Tag>
			{/if}
			{#if spread > 1}
				<Tag onpicture tone="quiet">
					{plural(spread, 'photos.placeSpread.one', 'photos.placeSpread.few', 'photos.placeSpread.many')}
				</Tag>
			{/if}
		</p>
		{#if faces.length}
			<p class="who">
				{#each faces.filter((f) => f.person) as f (f.id)}
					<Tag
						onpicture
						tone={onto === f.id ? 'busy' : 'fact'}
						onmouseenter={() => (onto = f.id)}
						onmouseleave={() => (onto = null)}
					>
						{f.person!.name}
						{#if canEdit}
							<ArmedButton size="small" label={t('photos.notThisPerson')} title={t('photos.notThisPerson')}
								onconfirm={() => detach(f.id)}>×</ArmedButton>
						{/if}
					</Tag>
				{/each}
				{#if unnamed}
					<Tag onpicture tone="quiet">{t('photos.unknownFaces', { n: formatNumber(unnamed) })}</Tag>
				{/if}
			</p>
		{/if}
	</div>
</div>

<style>
	/* in the flow, not over the picture: the stage is a flex row that gives the
	   image whatever is left, and anything laid on top of it would take that
	   room back invisibly */
	.foot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding-bottom: 0.7rem;
	}
	.who {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.35rem;
		max-width: min(92vw, 60rem);
	}
	.frame {
		position: relative;
		max-width: 100%;
		max-height: 100%;
		display: flex;
	}
	.frame img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
	}
	/* drawn only when somebody is pointing at it: a photograph is not a diagram,
	   and boxes over every face all the time is what a surveillance screen looks
	   like rather than a family album */
	.box {
		position: absolute;
		padding: 0;
		border: 2px solid transparent;
		border-radius: 4px;
		background: none;
		cursor: pointer;
	}
	.box:hover,
	.box.onto {
		border-color: var(--on-picture);
		box-shadow: 0 0 0 9999px var(--veil-thin);
	}
	.box.named:hover,
	.box.named.onto {
		border-color: var(--accent);
	}
	.label {
		position: absolute;
		left: 0;
		top: 100%;
		margin-top: 2px;
		padding: 0.1rem 0.35rem;
		font-size: var(--fs-xs);
		white-space: nowrap;
		background: var(--veil-thick);
		color: var(--on-picture);
		border-radius: 3px;
		opacity: 0;
	}
	.box:hover .label,
	.box.onto .label {
		opacity: 1;
	}
	.place {
		margin: 0;
		display: flex;
		gap: 0.35rem;
		align-items: center;
		flex-wrap: wrap;
		justify-content: center;
	}
	.place input {
		font: inherit;
		font-size: var(--fs-s);
		padding: 0.2rem 0.5rem;
		border-radius: 999px;
		border: 1px solid var(--on-picture-line);
		background: var(--veil);
		color: var(--on-picture);
		min-width: 12rem;
	}
	.shade {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: grid;
		/* minmax(0, 1fr) and not 1fr: a 1fr track keeps an automatic minimum of
		   its content, so a tall photograph pushes the row past the viewport
		   instead of being asked to fit inside it */
		grid-template-rows: minmax(0, 1fr) auto;
		background: var(--picture-ground);
		touch-action: pan-y;
	}
	/* Flex and not grid, and this is the whole bug that cut portraits off: a
	   grid row with no template sizes itself to its content, so `max-height:
	   100%` on the image resolved against a row 5712 px tall — its own height —
	   and constrained nothing. A flex container has a definite height here, so
	   the percentage means the screen. */
	.stage {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 0;
		overflow: hidden;
		/* the sides make room for the arrows. On a phone there are no arrows —
		   the gesture is a swipe — and 3.5rem either side is 29 % of a 390 px
		   screen spent on nothing, which measured as a portrait drawn 278 px
		   wide where 390 were available. */
		padding: 2.5rem 3.5rem 0.5rem;
	}
	@media (max-width: 640px) {
		.stage {
			padding: 2.5rem 0.25rem 0.25rem;
		}
		.step {
			display: none;
		}
	}
	.stage img {
		max-width: 100%;
		max-height: 100%;
		min-width: 0;
		min-height: 0;
		object-fit: contain;
		background-size: cover;
		background-position: center;
	}
	.stage video {
		max-width: 100%;
		max-height: 82vh;
		background: var(--picture-ground);
		border-radius: 8px;
	}
	.note {
		color: var(--on-picture-muted);
		font-size: var(--fs-l);
	}
	.when {
		margin: 0;
		padding: 0.5rem 1rem 0;
		text-align: center;
		color: var(--on-picture-muted);
		font-size: var(--fs-m);
		font-variant-numeric: tabular-nums;
	}
	.close,
	.step {
		position: absolute;
		background: none;
		border: 0;
		color: var(--on-picture-muted);
		cursor: pointer;
		line-height: 1;
		padding: 0.4rem 0.7rem;
		border-radius: 4px;
	}
	.close {
		top: 0.5rem;
		right: 0.8rem;
		font-size: 2rem;
	}

	.discard {
		position: absolute;
		top: 0.9rem;
		left: 0.9rem;
		z-index: 2;
		display: flex;
		gap: 0.5rem;
	}
	.step {
		top: 50%;
		transform: translateY(-50%);
		font-size: 3rem;
	}
	.left {
		left: 0.3rem;
	}
	.right {
		right: 0.3rem;
	}
	.close:hover,
	.step:hover,
	.close:focus-visible,
	.step:focus-visible {
		color: var(--on-picture);
		background: var(--on-picture-faint);
	}
</style>
