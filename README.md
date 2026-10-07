# PAKET//TRACKER

Sendungsverfolgung für DHL, Deutsche Post, Hermes, DPD, Amazon, FedEx, UPS und GLS im Matrix-Look:
Kacheln pro Sendung, Karte mit letztem Standort, Verlauf, ungefähre Ankunft und Links zu den Tracking-Seiten.

**Alles kostenlos, private Registrierung genügt – keine Kreditkarte, keine Firma nötig.**

## Verwendete Dienste (alle 0 €)

| Dienst | Wofür | Registrierung | Kostenloser Umfang |
|---|---|---|---|
| GitHub + GitHub Pages | Website hosten | privat, E-Mail | unbegrenzt (Repository muss **öffentlich** sein) |
| Cloudflare Workers | API-Key geheim halten | privat, E-Mail | 100.000 Anfragen/Tag |
| Ship24 Tracking API | Sendungsdaten aller Versender | privat, E-Mail | 10 Sendungen/Monat (+100 im 1. Monat) |
| OpenStreetMap / CARTO / Nominatim | Karte + Ortssuche | keine | frei für private Nutzung |
| Leaflet | Kartenbibliothek | keine | Open Source |

Ohne Ship24/Cloudflare läuft die Seite im **Demo-Modus**. Die Links zu DHL, Hermes usw. funktionieren immer –
auch wenn das Ship24-Kontingent aufgebraucht ist.

## Aufbau

| Datei | Zweck |
|---|---|
| `index.html` | Die komplette Website |
| `config.js` | URL des Cloudflare-Workers (kein Key!) |
| `worker/worker.js` | Cloudflare Worker – hält den Ship24-Key geheim |
| `server.js` | Optional: lokaler Betrieb auf dem eigenen PC (Node.js) |

## 1. GitHub Pages (Website)

1. Auf github.com kostenlos registrieren (Free-Plan).
2. **New repository** → Name z. B. `paket-tracker` → **Public** → Create.
3. **Add file → Upload files** → alle Dateien inkl. Ordner `worker` hochladen → **Commit changes**.
4. **Settings → Pages** → *Deploy from a branch* → `main` / `(root)` → **Save**.
5. Nach 1–2 Minuten: `https://DEINNAME.github.io/paket-tracker/`

> Öffentliches Repository ist unbedenklich: Es enthält keinen Key und keine Sendungen.
> Deine Sendungen liegen nur im Browser (localStorage).

## 2. Ship24 (Sendungsdaten)

1. Auf ship24.com kostenlos registrieren (keine Kreditkarte).
2. Im Dashboard den **kostenlosen Tracking-API-Plan (pro Sendung)** wählen.
3. **Integrations → API keys** → Key kopieren (beginnt mit `apik_`).

## 3. Cloudflare Worker (Verbindung)

1. Auf dash.cloudflare.com kostenlos registrieren (Free-Plan, keine Kreditkarte).
2. **Workers & Pages → Create → Worker** → Name `paket-tracker` → **Deploy**.
3. **Edit code** → Inhalt durch `worker/worker.js` ersetzen → **Deploy**.
4. **Settings → Variables and Secrets**:
   - `SHIP24_API_KEY` → Typ **Secret** → `apik_...`
   - `ALLOWED_ORIGIN` → Typ **Text** → `https://DEINNAME.github.io`
5. Worker-URL (z. B. `https://paket-tracker.DEINNAME.workers.dev`) in `config.js` bei `API_BASE` eintragen
   oder auf der Website über **[ ⚙ API ]** eingeben.

Oben rechts erscheint dann **● LIVE (Ship24)**.

## Kontingent sparen

- Jede **neue** Sendungsnummer verbraucht 1 von 10 Freisendungen. Aktualisieren derselben Nummer kostet nichts.
- Zugestellte Sendungen werden automatisch nicht mehr abgefragt.
- Wenn das Kontingent aufgebraucht ist: Kachel bleibt, der Link zum Versender funktioniert weiterhin.

## Hinweise

- `ALLOWED_ORIGIN` verhindert, dass Fremde dein Ship24-Kontingent verbrauchen.
- Die Karte zeigt den letzten Scan-Ort (z. B. Paketzentrum), keine GPS-Position des Fahrzeugs.
- Kartendaten © OpenStreetMap-Mitwirkende, © CARTO. Geocoding: Nominatim.
