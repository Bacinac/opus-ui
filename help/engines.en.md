Downloads is mechanism, not judgement. Library and Player ask, and Downloads acquires and hands the file over in the landing zone together with its path. Which release is worth taking is decided by whoever asks. Only the admin sees Downloads.

## Engines

- **Prowlarr**: the indexers, with FlareSolverr beside it for indexers behind Cloudflare.
- **SABnzbd**: Usenet.
- **qBittorrent**: torrent.
- **slskd**: Soulseek.
- **yt-dlp**: web video, fetched directly by address inside Downloads itself.

Each engine is either **bundled**, a container Downloads starts and wires itself, or **external**, an existing instance whose address is entered in the settings. A VPN can be switched on for each engine. If an engine that should go through the VPN is leaving from your own address, a warning stands at the top of every page until it is fixed.

## Pages

- **Services**: the interfaces of the engines that have one, each in its own tab. Engines running inside OPUS have nothing to open, so they share one tab.
- **Jobs**: every download with its engine, progress and state. **Cancel** stops a job, and **Delete** deletes the job and its files. If an engine has not confirmed a job's state for more than five minutes, the job says so.
- **Search**: a search by hand over all engines at once, by type. An engine that did not answer is named beside the others' results. The **namespace** becomes the engine's category, so the downloaded files land in a subfolder of the landing zone of their own.
- **Settings**: one card per engine, with its availability, its mode (bundled or external), its credentials, the VPN and its folders.

---

See also: [The queue and what is missing](/help/queue), [What OPUS is](/help/opus).
