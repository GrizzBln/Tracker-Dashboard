# PAKET//TRACKER

Sendungsverfolgung (DHL, Dt. Post, Hermes, DPD, Amazon, FedEx, UPS, GLS) im Matrix-Look –
Kacheln, Karte, Verlauf, ungefähre Ankunft, Links zu den Versendern. Alles mit kostenlosen Diensten.

| Dienst | Wofür | Kosten |
|---|---|---|
| GitHub Pages | Website | 0 € (Repository öffentlich) |
| Cloudflare Workers | hält den Ship24-Key geheim | 0 € |
| Ship24 Tracking API | Sendungsdaten | 0 € (10 Sendungen/Monat) |
| OpenStreetMap + Leaflet | Karte (ohne API-Key) | 0 € |

## Dateien
- `index.html` – Website
- `config.js` – Adresse des Workers (kein Key!)
- `worker/worker.js` – Code für Cloudflare (wird NICHT von GitHub ausgeführt, nur hineinkopieren)

## Einrichtung kurz
1. Dateien ins öffentliche Repository hochladen → Settings → Pages → `main` / `(root)`.
2. Ship24: kostenlosen Plan „Tracking API – pro Sendung“ wählen → API-Key kopieren.
3. Cloudflare → Workers & Pages → Worker erstellen → Edit code → `worker/worker.js` einfügen → Deploy.
4. Worker → Settings → Variables and Secrets:
   `SHIP24_API_KEY` (Secret) und `ALLOWED_ORIGIN` = `https://DEINNAME.github.io` (Text) → Deploy.
5. Test: `https://DEIN-WORKER.workers.dev/api/config` im Browser öffnen → `"mode":"live"`.
6. Worker-Adresse in `config.js` eintragen oder auf der Seite über **[ ⚙ API ]**.

Klick auf die Modus-Anzeige oben rechts zeigt die genaue Fehlerursache.
