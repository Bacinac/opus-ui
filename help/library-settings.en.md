Only infrastructure lives in the `.env` file. Everything else, from the address of Downloads to the face thresholds, is edited on the **Settings** page and kept in the database. Settings are grouped by kind. The **Acquisition** group belongs to the whole install, and every other group to one kind.

## Groups

- **Acquisition**: the address and token of OPUS · Downloads and the landing zone, as Downloads sees it and as Library sees it, with how many days whatever nobody imported is kept. **Preview cleanup** shows what the cleanup would delete, without deleting.
- **Music — library**: the music folder, the file naming template (by default `{artist}/{album} ({year})/{nn} - {title}`) and which releases are shown (by default without EPs and singles).
- **Music — acquisition**: the quality profile, the highest quality, the lowest candidate score and the order of channels.
- **Music — metadata**: access to Spotify and Discogs.
- **Film and series**: folders, naming, the quality profile for films (2160p by default) and for series (1080p by default), the lowest and highest bitrate per resolution, preference for HDR and for surround sound, protocol preference (Usenet first by default), the streaming services the household subscribes to, and the TMDB key.
- **Subtitles**: the languages wanted, the subtitle rule and the OpenSubtitles account.
- **Photos**: the folders of the photographs, the vaults and the thumbnails, the time zone for photographs that carry none, the thresholds by which faces are gathered into groups, and the address book the names and birth dates come from.

There is no point guessing the face thresholds: the right values depend on the family, how many children there are and how close they are in age, and they are found by looking at the result.

The streaming services are for Player: beside a film you do not have, it says which of them already has it.

An install's plugins can add settings of their own and the linked accounts of their services; those are edited here too.

## Tags

The **Tags** page, reached from a button on the music shelf, shows the tags of every music file as they were read from the disk, a hundred rows at a time, with a search by artist, album, song or path and a choice of columns. It is there to see what the files say about themselves. The title in the tag stays the track's title.

---

See also: [What having means](/help/having), [Photographs](/help/photos).
