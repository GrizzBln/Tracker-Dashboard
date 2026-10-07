/**
 * PAKET//TRACKER – optionaler lokaler Server (Node.js >= 18), Alternative zum Cloudflare Worker.
 * Start: $env:SHIP24_API_KEY="apik_xxx"; node server.js   ->  http://localhost:3000
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SHIP24_API_KEY || "";
const GEO_CACHE_FILE = path.join(__dirname, "geocache.json");
let geoCache = {};
try { geoCache = JSON.parse(fs.readFileSync(GEO_CACHE_FILE, "utf8")); } catch {}

const TYPES = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
function send(res, code, data, type = "application/json") {
  res.writeHead(code, { "Content-Type": type + "; charset=utf-8", "Cache-Control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(data) : data);
}
const readBody = (req) => new Promise((ok) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { try { ok(JSON.parse(b || "{}")); } catch { ok({}); } }); });

async function trackShip24(trackingNumber) {
  const r = await fetch("https://api.ship24.com/public/v1/trackers/track", {
    method: "POST",
    headers: { Authorization: "Bearer " + API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ trackingNumber }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j?.errors?.[0]?.message || "Ship24-Fehler (HTTP " + r.status + ")"), { status: r.status });
  const t = j?.data?.trackings?.[0] || {}, s = t.shipment || {};
  const events = (t.events || []).map((e) => ({
    time: e.occurrenceDatetime || e.datetime || null, status: e.status || "", location: e.location || "",
    milestone: e.statusMilestone || "", courier: e.courierCode || "",
  })).sort((a, b) => new Date(b.time) - new Date(a.time));
  return {
    trackingNumber, courier: t.tracker?.courierCode?.[0] || events[0]?.courier || "",
    milestone: s.statusMilestone || events[0]?.milestone || "pending", statusText: events[0]?.status || "",
    eta: s.delivery?.estimatedDeliveryDate || null, service: s.delivery?.service || null, signedBy: s.delivery?.signedBy || null,
    origin: s.originCountryCode || null, destination: s.destinationCountryCode || null,
    lastUpdate: events[0]?.time || null, events, raw: t,
  };
}

let lastGeo = 0;
async function geocode(q) {
  const key = q.trim().toLowerCase();
  if (key in geoCache) return geoCache[key];
  await new Promise((r) => setTimeout(r, Math.max(0, 1100 - (Date.now() - lastGeo))));
  lastGeo = Date.now();
  const r = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(q), { headers: { "User-Agent": "PaketTracker-Privat/1.0" } });
  const arr = await r.json().catch(() => []);
  geoCache[key] = arr[0] ? { lat: +arr[0].lat, lon: +arr[0].lon } : null;
  fs.writeFile(GEO_CACHE_FILE, JSON.stringify(geoCache), () => {});
  return geoCache[key];
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname === "/api/config") return send(res, 200, { mode: API_KEY ? "live" : "demo" });
    if (url.pathname === "/api/track" && req.method === "POST") {
      if (!API_KEY) return send(res, 400, { error: "Kein SHIP24_API_KEY gesetzt (Demo-Modus)." });
      const { trackingNumber } = await readBody(req);
      if (!trackingNumber) return send(res, 400, { error: "Sendungsnummer fehlt." });
      return send(res, 200, await trackShip24(String(trackingNumber).trim()));
    }
    if (url.pathname === "/api/geocode") {
      const q = url.searchParams.get("q");
      return q ? send(res, 200, await geocode(q)) : send(res, 400, { error: "q fehlt" });
    }
    const file = url.pathname === "/" ? "index.html" : path.basename(url.pathname);
    if (TYPES[path.extname(file)] && fs.existsSync(path.join(__dirname, file))) {
      return send(res, 200, fs.readFileSync(path.join(__dirname, file), "utf8"), TYPES[path.extname(file)]);
    }
    send(res, 404, { error: "Nicht gefunden" });
  } catch (e) { send(res, e.status || 500, { error: e.message }); }
}).listen(PORT, () => console.log(`PAKET//TRACKER: http://localhost:${PORT}  [${API_KEY ? "LIVE" : "DEMO"}]`));
