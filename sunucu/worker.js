// Savaşçılar Arenası sunucusu (Cloudflare Workers + Durable Objects)
// 1) /room/KOD  -> oda (WebSocket aktarıcı)   2) /club/KOD/eylem -> kalıcı multiplayer klüpler (HTTP)
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST,OPTIONS", "access-control-allow-headers": "content-type" };
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    const cm = u.pathname.match(/^\/club\/([A-Za-z0-9]{4,8})\/(create|join|poll|msg|kick|leave)$/);
    if (cm) {
      if (req.method == "OPTIONS") return new Response(null, { headers: CORS });
      if (req.method != "POST") return new Response("POST gerekli", { status: 405, headers: CORS });
      const r = await env.ROOM.get(env.ROOM.idFromName("CLUB-" + cm[1].toUpperCase())).fetch(req);
      const h = new Headers(r.headers); for (const k in CORS) h.set(k, CORS[k]);
      return new Response(r.body, { status: r.status, headers: h });
    }
    const m = u.pathname.match(/^\/room\/([A-Za-z0-9]{4,8})$/);
    if (!m || req.headers.get("Upgrade") != "websocket")
      return new Response("Savaşçılar Arenası sunucusu çalışıyor", { headers: { "content-type": "text/plain; charset=utf-8" } });
    return env.ROOM.get(env.ROOM.idFromName(m[1].toUpperCase())).fetch(req);
  },
};
export class Room {
  constructor(state) { this.state = state; this.host = null; this.g = new Map(); this.n = 0; }
  async club(req) {
    const act = new URL(req.url).pathname.split("/")[3]; let b = {};
    try { b = await req.json(); } catch (e) {}
    const J = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { "content-type": "application/json" } });
    const T = (v, n) => String(v == null ? "" : v).replace(/[<>]/g, "").slice(0, n);
    const uid = T(b.uid, 24); if (uid.length < 8) return J({ err: "bad" }, 400);
