Downloads je mehanizam, a ne prosudba. Library i Player traže, a Downloads nabavlja i predaje datoteku u zonu za preuzimanje zajedno s njezinom putanjom. Koje izdanje vrijedi uzeti, odlučuje onaj tko traži. Downloads vidi samo administrator.

## Pogoni

- **Prowlarr**: indekseri, a uz njega FlareSolverr za indeksere iza Cloudflarea.
- **SABnzbd**: Usenet.
- **qBittorrent**: torrent.
- **slskd**: Soulseek.
- **yt-dlp**: web-videozapisi, izravno po adresi, unutar samog Downloadsa.

Svaki pogon je **ugrađen**, kontejner koji Downloads sam pokreće i povezuje, ili **vanjski**, postojeća instanca čija se adresa upiše u postavke. Za svaki pogon može se uključiti izlaz kroz VPN. Ako pogon koji bi trebao ići kroz VPN izlazi na vašu adresu, upozorenje stoji na vrhu svake stranice dok se to ne popravi.

## Stranice

- **Servisi**: sučelja pogona koji ga imaju, svaki u svojoj kartici. Pogoni koji rade unutar OPUS-a nemaju što otvoriti, pa su zajedno u jednoj kartici.
- **Poslovi**: svako preuzimanje s pogonom, napretkom i stanjem. **Prekini** zaustavlja posao, a **Obriši** briše posao i njegove datoteke. Ako pogon više od pet minuta ne potvrdi stanje posla, to piše uz posao.
- **Pretraga**: ručna pretraga svih pogona odjednom, po vrsti. Pogon koji nije odgovorio navodi se uz rezultate ostalih. **Imenski prostor** postaje kategorija pogona, pa preuzete datoteke dolaze u vlastitu podmapu zone za preuzimanje.
- **Postavke**: jedna kartica po pogonu, s dostupnošću, načinom rada (ugrađeni ili vanjski), vjerodajnicama, VPN-om i mapama.

---

Vidi i: [Red i ono što nedostaje](/help/queue), [Što je OPUS](/help/opus).
