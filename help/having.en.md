A file on the disk is not yet "having" it. Library has a check for each kind, and only what passes it counts as had. Everything else is on its way or missing.

## An album: whole and at the quality asked for

An album is in the library when all of its tracks are there and it is at the quality the settings ask for. A partial album is never green: it shows as "In library (8/12)" and is counted under **Incomplete**.

What arrived is checked as well:

- **the edition**: the files are matched to the release's track list, and a renamed track is recognised by its position and length;
- **the quality**: the default profile, lossless when it exists, takes FLAC before MP3, and lossless only refuses everything else; an album in a lossy format offers **Replace with FLAC**;
- **a fake FLAC**: a FLAC made from an MP3 is refused, because there is almost no signal above 20 kHz;
- **the mix**: a multichannel, mono, DSD or SACD edition is a separate recording of the album and stands beside the stereo edition, not in its place.

An album put together from several downloads or of uneven quality is marked **mixed**. It is best replaced with one whole rip.

## A film and an episode: subtitles

A film can be watched as soon as it arrives, but it is not green until its subtitles meet the rule. The default rule is `any:en,hr`: at least one of English or Croatian. The rule can also ask for every language listed (`all`) or none (`none`), and a single film or series can have its own.

Subtitles are not inferred from the release name. What the file really carries is read by **ffprobe** from the tracks themselves, and the subtitle files beside the video are counted too. What is missing, Library looks for on OpenSubtitles. Until the rule is met the film stands as **Waiting for subtitles**, and the check is repeated every 30 minutes.

## A film and a series: the picture

Films are looked for in 2160p (4K) by default and series in 1080p. A film is watched once, on the best picture the house can show, while a series lasts forty hours, and 4K would spend many times the disk for the same sofa. A release with too few megabits per second for its resolution is set aside as an upscale or a poor picture, and one with too many spends disk on what the television cannot show.

## Title and identity

A track's title stays the one the file's tag carries, and the catalogue does not write over it. An artist's identity is settled by Wikidata: the same name and a high search score are not enough to make two artists one.

---

See also: [The queue and what is missing](/help/queue), [Library settings](/help/library-settings).
