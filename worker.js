/**
 * PAKET//TRACKER – Cloudflare Worker (API-Proxy für GitHub Pages)
 *
 * Hält den Ship24-API-Key geheim und erlaubt nur Anfragen von deiner GitHub-Pages-Seite.
 *
 * Benötigte Einstellungen im Worker (Settings > Variables and Secrets):
 *   SHIP24_API_KEY  (Typ: Secret)  -> apik_...
 *   ALLOWED_ORIGIN  (Typ: Text)    -> https://DEINNAME.github.io
 */
export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
    const okOrigin = allowed.length === 0 || allowed.includes(origin);

    const cors = {
      "Access-Control-Allow-Origin": okOrigin ? origin || "*" : "null",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!okOrigin) return json({ error: "Origin nicht erlaubt" }, 403);

    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/config") {
        return json({ mode: env.SHIP24_API_KEY ? "live" : "demo" });
      }

      if (url.pathname === "/api/track" && request.method === "POST") {
        if (!env.SHIP24_API_KEY) return json({ error: "SHIP24_API_KEY fehlt im Worker." }, 400);
        const { trackingNumber } = await request.json().catch(() => ({}));
        if (!trackingNumber) return json({ error: "Sendungsnummer fehlt." }, 400);
        return json(await trackShip24(String(trackingNumber).trim(), env.SHIP24_API_KEY));
      }

      if (url.pathname === "/api/geocode") {
        const q = url.searchParams.get("q");
        if (!q) return json({ error: "q fehlt" }, 400);
        // Ergebnis 30 Tage im Cloudflare-Cache halten (schont Nominatim)
        const cacheKey = new Request("https://geo.cache/" + encodeURIComponent(q.toLowerCase()));
        const cache = caches.default;
        const hit = await cache.match(cacheKey);
        if (hit) return json(await hit.json());
        const r = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(q), {
          headers: { "User-Agent": "PaketTracker-Privat/1.0" },
        });
        const arr = await r.json().catch(() => []);
        const val = arr[0] ? { lat: +arr[0].lat, lon: +arr[0].lon } : null;
        ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(val), { headers: { "Cache-Control": "max-age=2592000" } })));
        return json(val);
      }

      return json({ error: "Nicht gefunden" }, 404);
    } catch (e) {
      return json({ error: e.message }, e.status || 500);
    }
  },
};

async function trackShip24(trackingNumber, apiKey) {
  const r = await fetch("https://api.ship24.com/public/v1/trackers/track", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ trackingNumber }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw Object.assign(new Error(j?.errors?.[0]?.message || "Ship24-Fehler (HTTP " + r.status + ")"), { status: r.status });
  }
  const t = j?.data?.trackings?.[0] || {};
  const s = t.shipment || {};
  const events = (t.events || [])
    .map((e) => ({
      time: e.occurrenceDatetime || e.datetime || null,
      status: e.status || "",
      location: e.location || "",
      milestone: e.statusMilestone || "",
      courier: e.courierCode || "",
    }))
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  return {
    trackingNumber,
    courier: t.tracker?.courierCode?.[0] || events[0]?.courier || "",
    milestone: s.statusMilestone || events[0]?.milestone || "pending",
    statusText: events[0]?.status || "",
    eta: s.delivery?.estimatedDeliveryDate || null,
    service: s.delivery?.service || null,
    signedBy: s.delivery?.signedBy || null,
    origin: s.originCountryCode || null,
    destination: s.destinationCountryCode || null,
    lastUpdate: events[0]?.time || null,
    events,
    raw: t,
  };
}
