The **Downloads** page is one list of everything on its way, of every kind. The list is shared only for display: each row keeps its own kind's states and is cancelled through that kind.

## How a release travels

1. Library decides which release is worth taking and asks Downloads for it.
2. Downloads fetches it and reports where it is in the landing zone.
3. Library checks what arrived, names the files by the template and moves them into the library.
4. What fails the check is rejected. A film or an episode that failed once is remembered and never taken again.

## States

Music goes through **Queued**, **Searching…**, **Downloading…** and **Importing…** to **In library**, and can also end as **Rejected** or **Failed**. Films and series go through **Queued**, **Downloading** and **Downloaded** to **In library**.

**Waiting for subtitles** means the film is already in the library and can be watched, but its subtitles do not yet meet the rule; see [What having means](/help/having).

**Cancel** stops a single job. **Clear history** takes finished music downloads off the list.

## Incomplete albums

The **Incomplete** number says how many albums are not whole, and the page it opens says which, whose, and how much each is missing: "tracks: 9 of 12". An album stitched from several downloads says so. **Delete and fetch** deletes that album's files and fetches it again from the start, whole.

The decision is made album by album on purpose. "Incomplete" joins two different faults, and a compilation from the catalogue can look incomplete when it is not, so fetching them all at once would eat the good albums too.

## The landing zone

What Downloads fetches stays in the landing zone until Library imports it. After an import the zone is cleaned, and what nobody imported, because it was rejected or interrupted, is deleted after 14 days. Library's settings have a preview of what the cleanup would delete, and the preview itself deletes nothing.

---

See also: [Following and search](/help/following), [The Downloads engines](/help/engines).
