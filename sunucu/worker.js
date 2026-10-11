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
