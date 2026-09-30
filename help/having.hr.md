Datoteka na disku još nije „imati”. Za svaku vrstu Library ima provjeru, i tek ono što je prođe smatra se imanjem. Sve ostalo je na putu ili nedostaje.

## Album: cijeli i u traženoj kvaliteti

Album je u biblioteci kad su tu sve njegove pjesme i kad je u kvaliteti koju traže postavke. Djelomičan album nikad nije zelen: prikazuje se kao „U biblioteci (8/12)” i broji pod **Nepotpuno**.

Provjerava se i ono što je stiglo:

- **izdanje**: datoteke se sparuju s popisom pjesama izdanja, a preimenovanu pjesmu prepoznaju njezin položaj i trajanje;
- **kvaliteta**: zadani profil „Lossless kad postoji” uzima FLAC prije MP3-a, a „Samo lossless” odbija sve ostalo; album u gubitnom formatu nudi **Zamijeni FLAC-om**;
- **lažni FLAC**: FLAC napravljen iz MP3-a odbija se jer iznad 20 kHz gotovo nema signala;
- **miks**: višekanalno, mono, DSD ili SACD izdanje zaseban je zapis albuma i stoji uz stereo izdanje, a ne umjesto njega.

Album složen iz više preuzimanja ili nejednake kvalitete označen je kao **miješano**. Najbolje ga je zamijeniti jednim cjelovitim ripom.

## Film i epizoda: titlovi

Film se može gledati čim stigne, ali nije zelen dok titlovi ne zadovolje pravilo. Zadano pravilo je `any:en,hr`: barem jedan od jezika engleski ili hrvatski. Pravilo može tražiti i sve navedene jezike (`all`) ili nijedan (`none`), a pojedini film ili serija može imati svoje.

Titlovi se ne zaključuju iz naziva izdanja. Što datoteka stvarno nosi, čita **ffprobe** iz samih traka, a uz to se broje titl-datoteke pokraj videozapisa. Što nedostaje, Library potraži na OpenSubtitlesu. Dok pravilo nije zadovoljeno, film stoji kao **Čeka titlove**, a provjera se ponavlja svakih 30 minuta.

## Film i serija: slika

Filmovi se zadano traže u 2160p (4K), a serije u 1080p. Film se gleda jednom, na najboljoj slici koju kuća može prikazati, a serija traje četrdeset sati, pa bi 4K za isti kauč trošio višestruko više diska. Izdanje s premalo megabita u sekundi za svoju rezoluciju odbacuje se kao napuhana ili loša slika, a izdanje s previše troši disk na ono što televizor ne može pokazati.

## Naslov i identitet

Naslov pjesme ostaje onaj koji nosi tag datoteke i katalog ga ne prepisuje. Identitet izvođača potvrđuje Wikidata: isto ime i visoka ocjena pretrage nisu dovoljni da dva izvođača postanu jedan.

---

Vidi i: [Red i ono što nedostaje](/help/queue), [Postavke Libraryja](/help/library-settings).
