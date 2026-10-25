// Cloudflare Worker: serves the app from ./public and runs each game room in a
// Durable Object, so roles stay on the server and every phone only gets its own.
import { DurableObject } from 'cloudflare:workers';
import * as G from './game.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O, easy to read out loud
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json' } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/api/new' && req.method === 'POST') {
      for (let i = 0; i < 8; i++) {
        const code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
        const res = await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch('https://room/init', { method: 'POST', body: code });
        if (res.status === 200) return json(Object.assign({ code }, await res.json()));
      }
      return json({ error: 'Could not find a free room code, try again.' }, 503);
    }
    const info = url.pathname.match(/^\/api\/room\/([A-Z]{4})$/);
    if (info) return env.ROOMS.get(env.ROOMS.idFromName(info[1])).fetch('https://room/info');
    const m = url.pathname.match(/^\/api\/room\/([A-Z]{4})\/ws$/);
    if (m) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.g = null;
    ctx.blockConcurrencyWhile(async () => { this.g = (await ctx.storage.get('g')) || null; });
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/init') {
      if (this.g && Date.now() - (this.g.touched || 0) < 12 * 3600e3) return json({ error: 'taken' }, 409);
      this.g = G.newGame(await req.text(), G.token());
      await this.save();
      return json({ hostKey: this.g.hostKey });
    }
    if (url.pathname === '/info') return json({ exists: !!this.g, phase: this.g ? this.g.phase : null });
    if (!this.g) return new Response('No such room', { status: 404 });
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ pid: null, host: false });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async save() {
    this.g.touched = Date.now();
    await this.ctx.storage.put('g', this.g);
  }

  me(ws) { return ws.deserializeAttachment() || {}; }
  player(ws) { const a = this.me(ws); return a.pid ? this.g.players.find(p => p.id === a.pid) : null; }

  async webSocketMessage(ws, raw) {
    let d; try { d = JSON.parse(raw); } catch { return; }
    const g = this.g; if (!g) return;
    const a = this.me(ws), p = this.player(ws), host = a.host;
    const err = e => ws.send(JSON.stringify({ t: 'error', text: e }));
    let r = {};
    switch (d.t) {
      case 'hello': {
        const isHost = !!d.hostKey && d.hostKey === g.hostKey;
        let pl = d.token ? g.players.find(x => x.token === d.token) : null;
        if (!pl && d.name) { r = G.join(g, d.name); if (r.error) { ws.serializeAttachment({ pid: null, host: isHost }); err(r.error); break; } pl = r.player; }
        ws.serializeAttachment({ pid: pl ? pl.id : null, host: isHost });
        if (pl) ws.send(JSON.stringify({ t: 'welcome', pid: pl.id, token: pl.token }));
        break;
      }
      case 'ready': if (p) G.ready(g, p); break;
      case 'act': if (p) r = G.act(g, p, d.target); break;
      case 'vote': if (p) r = G.vote(g, p, d.target); break;
      case 'mayor': if (p) G.revealMayor(g, p); break;
      case 'leave':
        if (p && g.phase === 'lobby') { g.players = g.players.filter(x => x !== p); ws.serializeAttachment({ pid: null, host }); }
        break;
      // host only
      case 'settings':
        if (!host || g.phase !== 'lobby') break;
        if (d.deck) g.settings.deck = Object.fromEntries(Object.entries(d.deck).filter(([k]) => G.SPECIALS.includes(k)).map(([k, v]) => [k, v ? 1 : 0]));
        if (d.jokers) for (const k of Object.keys(G.JOKERS)) if (k in d.jokers) g.settings.jokers[k] = !!d.jokers[k];
        if (d.discussSec) g.settings.discussSec = Math.max(30, Math.min(900, +d.discussSec || 180));
        if (d.butcherTeam) g.settings.butcherTeam = d.butcherTeam === 'town' ? 'town' : 'killers';
        break;
      case 'kick': if (host && g.phase === 'lobby') g.players = g.players.filter(x => x.id !== d.pid); break;
      case 'addBot': if (host && g.phase === 'lobby') r = G.addBot(g); break;
      case 'removeBots': if (host && g.phase === 'lobby') g.players = g.players.filter(x => !x.bot); break;
      case 'start': if (host && g.phase === 'lobby') r = G.start(g); break;
      case 'advance': if (host) r = G.advance(g) || {}; break;
      case 'lobby': if (host) G.backToLobby(g); break;
      default: return;
    }
    if (r && r.error && d.t !== 'hello') err(r.error);
    this.broadcast();
    await this.schedule();
    await this.save();
  }

  // one alarm drives both bots (test mode) and closing a full vote after a short grace period
  async schedule() {
    const g = this.g, now = Date.now();
    if (g.phase === 'vote' && G.allVoted(g)) g.allVotedAt = g.allVotedAt || now; else g.allVotedAt = 0;
    const times = [];
    if (G.botsPending(g)) times.push(now + 1200 + Math.random() * 1500);
    if (g.allVotedAt) times.push(g.allVotedAt + 4000);
    if (times.length) await this.ctx.storage.setAlarm(Math.min(...times));
  }

  async alarm() {
    const g = this.g; if (!g) return;
    if (G.botsPending(g)) G.botStep(g);
    if (g.phase === 'vote' && G.allVoted(g) && g.allVotedAt && Date.now() - g.allVotedAt >= 3500) { G.closeVote(g); g.allVotedAt = 0; }
    this.broadcast();
    await this.schedule();
    await this.save();
  }

  async webSocketClose(ws) { this.broadcast(); }
  async webSocketError(ws) { this.broadcast(); }

  broadcast() {
    const g = this.g, sockets = this.ctx.getWebSockets();
    const online = new Set(sockets.filter(s => s.readyState === 1).map(s => (s.deserializeAttachment() || {}).pid).filter(Boolean));
    for (const p of g.players) p.connected = online.has(p.id);
    const pub = G.publicView(g);
    for (const ws of sockets) {
      const a = ws.deserializeAttachment() || {};
      const p = a.pid ? g.players.find(x => x.id === a.pid) : null;
      const bots = a.host ? g.players.filter(x => x.bot).map(x => ({ name: x.name, token: x.token })) : undefined;
      try { ws.send(JSON.stringify({ t: 'state', pub, me: p ? G.privateView(g, p) : null, host: !!a.host, bots, roles: G.ROLES, jokers: G.JOKERS })); } catch {}
    }
  }
}
