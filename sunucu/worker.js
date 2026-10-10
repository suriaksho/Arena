// Savaşçılar Arenası oda sunucusu (Cloudflare Workers + Durable Objects)
export default {
  async fetch(req, env) {
    const m = new URL(req.url).pathname.match(/^\/room\/([A-Za-z0-9]{4,8})$/);
    if (!m || req.headers.get("Upgrade") != "websocket")
      return new Response("Savaşçılar Arenası sunucusu çalışıyor", { headers: { "content-type": "text/plain; charset=utf-8" } });
    return env.ROOM.get(env.ROOM.idFromName(m[1].toUpperCase())).fetch(req);
  },
};
export class Room {
  constructor() { this.host = null; this.g = new Map(); this.n = 0; }
  async fetch(req) {
    const role = new URL(req.url).searchParams.get("role");
    const [client, s] = Object.values(new WebSocketPair());
    s.accept();
    const send = (w, o) => { try { w.send(JSON.stringify(o)); } catch (e) {} };
    const res = () => new Response(null, { status: 101, webSocket: client });
    if (role == "host") {
      if (this.host) {
        if (new URL(req.url).searchParams.get("resume") != "1") { send(s, { t: "err", e: "unavailable-id" }); s.close(); return res(); }
        const old = this.host; this.host = null;
        this.g.forEach(x => { try { x.close(); } catch (e) {} }); this.g.clear();
        try { old.close(); } catch (e) {}
      }
      this.host = s; send(s, { t: "ok" });
      s.addEventListener("message", e => { try { const m = JSON.parse(e.data), t = this.g.get(m.to); if (t) send(t, { t: "d", d: m.d }); } catch (x) {} });
      s.addEventListener("close", () => { if (this.host !== s) return; this.host = null; this.g.forEach(w => { try { w.close(); } catch (x) {} }); this.g.clear(); });
    } else {
      if (!this.host) { send(s, { t: "err", e: "peer-unavailable" }); s.close(); return res(); }
      const gid = "g" + (++this.n); this.g.set(gid, s);
      send(s, { t: "ok" }); send(this.host, { t: "join", g: gid });
      s.addEventListener("message", e => { try { const m = JSON.parse(e.data); if (m.p) return; if (this.host) send(this.host, { t: "d", g: gid, d: m.d }); } catch (x) {} });
      s.addEventListener("close", () => { this.g.delete(gid); if (this.host) send(this.host, { t: "left", g: gid }); });
    }
    return res();
   }
        }
