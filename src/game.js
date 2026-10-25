// Palermo game engine. Pure state transitions; the Durable Object (worker.js)
// stores the state, runs the sockets and sends everyone their view of it.
import { line } from './story.js';

export const ROLES = {
  hidden:    { name: 'Hidden Killer', gr: 'Κρυφός Δολοφόνος', art: 'ο Κρυφός Δολοφόνος', team: 'killers', night: 'kill',
               blurb: 'Kill at night with the other killers. On the first night the Snitch will see who you are.' },
  shown:     { name: 'Shown Killer', gr: 'Φανερός Δολοφόνος', art: 'ο Φανερός Δολοφόνος', team: 'killers', night: 'kill',
               blurb: 'Kill at night with the other killers. On the first night the Detective will see who you are.' },
  butcher:   { name: 'Butcher', gr: 'Χασάπης', art: 'ο Χασάπης', team: 'killers', night: 'silence',
               blurb: 'Each night pick someone to silence: tomorrow they can\'t speak or vote.' },
  detective: { name: 'Detective', gr: 'Αστυνόμος', art: 'ο Αστυνόμος', team: 'town',
               blurb: 'On the first night you\'ll see who the Shown Killer is. Steer the town without getting killed.' },
  snitch:    { name: 'Snitch', gr: 'Ρουφιάνος', art: 'ο Ρουφιάνος', team: 'killers',
               blurb: 'You secretly work for the killers. On the first night you\'ll see who the Hidden Killer is; they don\'t know you.' },
  doctor:    { name: 'Doctor', gr: 'Γιατρός', art: 'ο Γιατρός', team: 'town', night: 'save',
               blurb: 'Each night protect one person. Never the same person two nights running.' },
  mayor:     { name: 'Mayor', gr: 'Δήμαρχος', art: 'ο Δήμαρχος', team: 'town',
               blurb: 'Reveal yourself during the day and your vote counts double.' },
  trela:     { name: 'Trela', gr: 'Τρελή', art: 'η Τρελή', team: 'trela',
               blurb: 'You win alone if the town votes you out. Act suspicious.' },
  citizen:   { name: 'Citizen', gr: 'Πολίτης', art: 'ένας απλός Πολίτης', team: 'town',
               blurb: 'Find the killers and vote them out.' },
};
export const SPECIALS = ['hidden', 'shown', 'butcher', 'detective', 'snitch', 'doctor', 'mayor', 'trela'];

export const JOKERS = {
  graves:  { name: 'Open Graves', text: 'Night victims show their role card. The executed keep their secret.' },
  lovers:  { name: 'Lovers', text: 'Two players are secretly in love. If one dies, so does the other.' },
  fog:     { name: 'Fog', text: 'Votes stay hidden until the vote closes.' },
  words:   { name: 'Last Words', text: 'The executed get 30 seconds to speak.' },
  second:  { name: 'Second Chance', text: 'A tied vote is re-run between the tied players once.' },
  iron:    { name: 'Iron Mayor', text: 'A revealed Mayor breaks tied votes.' },
};

export const MIN_PLAYERS = 4, MAX_PLAYERS = 16;

const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const token = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');

/* Suggested deck for n players; the host can change it. */
export function defaultDeck(n) {
  const d = {};
  if (n >= 6) { d.hidden = 1; d.snitch = 1; }
  d.shown = 1; d.detective = 1;
  if (n >= 5) d.doctor = 1;
  if (n >= 7) d.mayor = 1;
  if (n >= 8) d.trela = 1;
  // the Snitch already joins the killers, so the Butcher only comes in for big tables
  if (n >= 11) d.butcher = 1;
  return d;
}

export function newGame(code, hostKey) {
  return {
    code, hostKey, phase: 'lobby', round: 0, players: [], story: [], seq: 0,
    settings: { deck: null, jokers: { graves: true, lovers: false, fog: false, words: true, second: true, iron: false }, discussSec: 180, butcherTeam: 'killers' },
    night: null, votes: {}, voteRestrict: null, revoted: false, endsAt: 0, winner: null, lastSave: null, lastSilence: null,
  };
}

export const teamOf = (g, p) => p.role === 'butcher' ? g.settings.butcherTeam : (ROLES[p.role] || {}).team;
// the killers who know each other (the Snitch is on their side but works in secret)
export const isCore = (g, p) => p.role === 'hidden' || p.role === 'shown' || (p.role === 'butcher' && g.settings.butcherTeam === 'killers');
const alive = g => g.players.filter(p => p.alive);
const byId = (g, id) => g.players.find(p => p.id === id);
const say = (g, kind, key, vars) => {
  g.story.push({ id: ++g.seq, kind, text: line(key, vars), at: Date.now() });
  if (g.story.length > 250) g.story.splice(0, g.story.length - 250);
};

// how long the narrator takes to read some lines (a Greek voice reads roughly 14 characters a second)
const readMs = lines => lines.reduce((t, l) => t + 900 + l.text.length * 70, 1500);
const linesSince = (g, seq) => g.story.filter(l => l.id > seq);

/* ---------- lobby ---------- */
export function join(g, name, bot) {
  name = String(name || '').trim().slice(0, 24);
  if (!name) return { error: 'Pick a name.' };
  const ex = g.players.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (ex) return { error: `${ex.name} is already in. If that's you, rejoin from the same phone.` };
  if (g.phase !== 'lobby') return { error: 'The game already started. Wait for the next round.' };
  if (g.players.length >= MAX_PLAYERS) return { error: 'The table is full.' };
  const p = { id: token(4), token: token(), name, alive: true, role: null, ready: false, silenced: false, mayorRevealed: false, lover: null, bot: !!bot };
  g.players.push(p);
  return { player: p };
}

export function deckFor(g) {
  const n = g.players.length, d = Object.assign({}, g.settings.deck || defaultDeck(n));
  for (const k of Object.keys(d)) if (!SPECIALS.includes(k) || !d[k]) delete d[k];
  const specials = Object.keys(d).length;
  return { deck: d, citizens: n - specials, ok: n >= MIN_PLAYERS && n - specials >= 0 && (d.hidden || d.shown) };
}

export function start(g) {
  const { deck, citizens, ok } = deckFor(g);
  if (!ok) return { error: g.players.length < MIN_PLAYERS ? `Need at least ${MIN_PLAYERS} players.` : 'Too many special roles for this many players, or no killers.' };
  const roles = shuffle([...Object.keys(deck), ...Array(citizens).fill('citizen')]);
  g.players.forEach((p, i) => Object.assign(p, { role: roles[i], alive: true, ready: false, silenced: false, mayorRevealed: false, lover: null, revealed: false }));
  if (g.settings.jokers.lovers && g.players.length >= 4) {
    const [a, b] = shuffle(g.players);
    a.lover = b.id; b.lover = a.id;
  }
  Object.assign(g, { phase: 'reveal', round: 0, night: null, votes: {}, voteRestrict: null, revoted: false, winner: null, lastSave: null, lastSilence: null, endsAt: 0 });
  g.story = [];
  say(g, 'title', 'intro', { n: g.players.length });
  return {};
}

export function ready(g, p) {
  if (g.phase !== 'reveal') return;
  p.ready = true;
  if (g.players.every(x => x.ready)) startRitual(g);
}

/* ---------- the first night: the narrator calls roles to open their eyes and raise hands ----------
   The app never tells anyone who is who; people see it at the table, like the real game. */
const STEP_MS = 8000;
export function startRitual(g) {
  const has = r => g.players.some(p => p.role === r);
  const steps = ['ritClose'];
  if (g.players.some(p => isCore(g, p))) steps.push('ritKillersOpen', 'ritKillersClose');
  if (has('snitch') && has('hidden')) steps.push('ritSnitchOpen', 'ritSnitchClose');
  if (has('detective') && has('shown')) steps.push('ritDetOpen', 'ritDetClose');
  if (g.players.some(p => p.lover)) steps.push('ritLoversOpen', 'ritLoversClose');
  g.phase = 'ritual';
  g.ritual = { steps, i: 0, next: Date.now() + STEP_MS };
  say(g, 'ritual', steps[0], {});
}
export function ritualStep(g) {
  if (g.phase !== 'ritual') return;
  const r = g.ritual;
  r.i++;
  if (r.i >= r.steps.length) { g.ritual = null; startNight(g); return; }
  // the "raise your hand" moments get a little longer
  r.next = Date.now() + (/Open$/.test(r.steps[r.i]) ? STEP_MS + 3000 : STEP_MS);
  say(g, 'ritual', r.steps[r.i], {});
}

/* ---------- night ---------- */
export function nightAction(g, p) {
  if (!p.alive) return null;
  const a = (ROLES[p.role] || {}).night;
  return a || 'suspect';
}
export function startNight(g) {
  g.round++;
  g.phase = 'night';
  g.night = { acts: {} };
  g.endsAt = 0; g.nightAt = 0;
  for (const p of g.players) p.silenced = false;
  say(g, 'night', g.round === 1 ? 'firstActions' : 'night', { round: g.round });
}
const killers = g => alive(g).filter(p => nightAction(g, p) === 'kill');
function killersAgree(g) {
  const ks = killers(g);
  if (!ks.length) return true;
  const picks = ks.map(k => (g.night.acts[k.id] || {}).target);
  return picks.every(t => t && t === picks[0]);
}
export function act(g, p, target) {
  if (g.phase !== 'night' || !p.alive) return { error: 'Not now.' };
  const kind = nightAction(g, p), t = byId(g, target);
  if (!t || !t.alive) return { error: 'Pick someone alive.' };
  if (kind === 'kill' && isCore(g, t)) return { error: 'That\'s one of you.' };
  if (kind === 'save' && g.lastSave === t.id) return { error: 'You saved them last night. Pick someone else.' };
  if (kind === 'silence' && (t.id === p.id || g.lastSilence === t.id)) return { error: t.id === p.id ? 'You can\'t silence yourself.' : 'They were silenced last night. Pick someone else.' };
  g.night.acts[p.id] = { target: t.id };
  if (alive(g).every(x => g.night.acts[x.id]) && killersAgree(g)) resolveNight(g);
  return {};
}
export const killersChose = g => g.phase === 'night' && killers(g).length > 0 && killersAgree(g);
export function resolveNight(g) {
  const acts = g.night.acts, ks = killers(g);
  // the night never ends without the killers agreeing, so their picks are all the same
  const victimId = ks.length ? (acts[ks[0].id] || {}).target || null : null;
  const doc = alive(g).find(p => p.role === 'doctor'), saveId = doc && acts[doc.id] ? acts[doc.id].target : null;
  const bu = alive(g).find(p => p.role === 'butcher'), silId = bu && acts[bu.id] ? acts[bu.id].target : null;
  g.lastSave = saveId; g.lastSilence = silId;
  // the town's whispers: who citizens suspected most
  const sus = {};
  for (const p of alive(g)) if (nightAction(g, p) === 'suspect' && acts[p.id]) sus[acts[p.id].target] = (sus[acts[p.id].target] || 0) + 1;
  const rumour = Object.entries(sus).sort((a, b) => b[1] - a[1])[0];

  g.phase = 'day';
  const mark = g.seq;
  say(g, 'dawn', 'dawn', { round: g.round });
  const dead = [];
  if (victimId && victimId === saveId) say(g, 'saved', 'saved', { name: byId(g, victimId).name });
  else if (victimId) dead.push(byId(g, victimId));
  else say(g, 'quiet', 'quietNight', {});
  for (const v of dead) kill(g, v, 'night');
  if (silId) { const s = byId(g, silId); if (s.alive) { s.silenced = true; say(g, 'silence', 'silenced', { name: s.name }); } }
  if (rumour && rumour[1] >= 2 && byId(g, rumour[0]).alive) say(g, 'rumour', 'rumour', { name: byId(g, rumour[0]).name });
  g.night = null;
  if (checkWin(g)) return;
  // voting opens by itself once the narrator has told the morning's story
  g.voteAt = g.endsAt = Date.now() + readMs(linesSince(g, mark));
}

/* a death, with heartbreak for lovers and role reveal under Open Graves */
function kill(g, p, how) {
  if (!p.alive) return;
  p.alive = false;
  // only night victims show their card (Open Graves); the executed take their secret to the grave
  const show = how === 'night' && g.settings.jokers.graves;
  say(g, 'death', how === 'night' ? 'killed' : 'executed', { name: p.name });
  if (show) { p.revealed = true; say(g, 'reveal', 'revealRole', { name: p.name, role: ROLES[p.role].art }); }
  if (p.lover) {
    const l = byId(g, p.lover);
    if (l && l.alive) {
      l.alive = false;
      say(g, 'death', 'heartbreak', { name: l.name, other: p.name });
      if (show) { l.revealed = true; say(g, 'reveal', 'revealRole', { name: l.name, role: ROLES[l.role].art }); }
    }
  }
}

/* ---------- day & vote ---------- */
export function revealMayor(g, p) {
  if (p.role !== 'mayor' || !p.alive || p.mayorRevealed || !['day', 'vote'].includes(g.phase)) return;
  p.mayorRevealed = true;
  say(g, 'mayor', 'mayor', { name: p.name });
}
export function openVote(g) {
  if (g.phase !== 'day') return;
  g.phase = 'vote'; g.votes = {}; g.voteRestrict = null; g.revoted = false; g.endsAt = 0; g.voteAt = 0;
  say(g, 'vote', 'voteOpen', {});
}
export const canVote = (g, p) => p.alive && !p.silenced;
export function vote(g, p, target) {
  if (g.phase !== 'vote') return { error: 'Voting is closed.' };
  if (!canVote(g, p)) return { error: p.silenced ? 'The Butcher took your vote today.' : 'The dead don\'t vote.' };
  if (target === null) { delete g.votes[p.id]; return {}; }
  const t = byId(g, target);
  if (!t || !t.alive) return { error: 'Pick someone alive.' };
  if (g.voteRestrict && !g.voteRestrict.includes(t.id)) return { error: 'This round is only between the tied players.' };
  g.votes[p.id] = t.id;
  return {};
}
export const weight = p => (p.role === 'mayor' && p.mayorRevealed ? 2 : 1);
export function tally(g) {
  const t = {};
  for (const [v, target] of Object.entries(g.votes)) { const p = byId(g, v); if (p && canVote(g, p)) t[target] = (t[target] || 0) + weight(p); }
  return t;
}
export const allVoted = g => alive(g).filter(p => canVote(g, p)).every(p => g.votes[p.id]);
export function closeVote(g) {
  if (g.phase !== 'vote') return;
  const mark = g.seq;
  const t = tally(g), entries = Object.entries(t).sort((a, b) => b[1] - a[1]);
  if (!entries.length) { say(g, 'quiet', 'noVotes', {}); return toDusk(g, null, mark); }
  const best = entries[0][1], tied = entries.filter(e => e[1] === best).map(e => e[0]);
  let chosen = tied.length === 1 ? tied[0] : null;
  if (!chosen && g.settings.jokers.iron) {
    const m = alive(g).find(p => p.role === 'mayor' && p.mayorRevealed && canVote(g, p));
    if (m && tied.includes(g.votes[m.id])) { chosen = g.votes[m.id]; say(g, 'mayor', 'mayorBreaks', { name: m.name }); }
  }
  if (!chosen && g.settings.jokers.second && !g.revoted) {
    g.revoted = true; g.votes = {}; g.voteRestrict = tied;
    say(g, 'vote', 'tieRevote', { names: tied.map(id => byId(g, id).name).join(' και ') });
    return;
  }
  if (!chosen) { say(g, 'quiet', 'tieNobody', {}); return toDusk(g, null, mark); }
  const p = byId(g, chosen);
  if (p.role === 'trela') {
    kill(g, p, 'vote');
    g.phase = 'over'; g.winner = 'trela'; g.endsAt = 0;
    say(g, 'win', 'trelaWins', { name: p.name });
    return;
  }
  kill(g, p, 'vote');
  if (checkWin(g)) return;
  toDusk(g, p, mark);
}
// after the vote: the narrator tells what happened, last words if that joker is on, then night falls by itself
function toDusk(g, executed, mark) {
  g.phase = 'dusk'; g.voteRestrict = null;
  const words = executed && g.settings.jokers.words;
  if (words) say(g, 'words', 'lastWords', { name: executed.name });
  g.nightAt = g.endsAt = Date.now() + readMs(linesSince(g, mark)) + (words ? 30000 : 0);
}

/* the game moves itself along on timers; the worker's alarm calls this */
export const nextTick = g => g.phase === 'day' ? g.voteAt || 0 : g.phase === 'dusk' ? g.nightAt || 0 : 0;
export function tick(g) {
  const due = nextTick(g);
  if (!due || Date.now() < due - 100) return false;
  if (g.phase === 'day') openVote(g); else startNight(g);
  return true;
}

/* ---------- winning ---------- */
export function checkWin(g) {
  // the town wins once both murderers are gone; the killers' side (Snitch included) wins on numbers
  const live = alive(g), k = live.filter(p => teamOf(g, p) === 'killers').length, o = live.length - k;
  let w = null;
  if (!live.some(p => p.role === 'hidden' || p.role === 'shown')) w = 'town';
  else if (k >= o) w = 'killers';
  if (!w) return false;
  g.phase = 'over'; g.winner = w; g.endsAt = 0; g.night = null;
  say(g, 'win', w === 'town' ? 'townWins' : 'killersWin', {});
  return true;
}

/* the host's "next" button: moves whatever phase we're in along */
export function advance(g) {
  if (g.phase === 'reveal') startRitual(g);
  else if (g.phase === 'ritual') ritualStep(g);
  else if (g.phase === 'night') { if (killersChose(g)) resolveNight(g); else return { error: 'The night goes on until the killers agree on a victim.' }; }
  else if (g.phase === 'day') openVote(g);
  else if (g.phase === 'vote') closeVote(g);
  else if (g.phase === 'dusk') startNight(g);
}

export function backToLobby(g) {
  for (const p of g.players) Object.assign(p, { role: null, alive: true, ready: false, silenced: false, mayorRevealed: false, lover: null, revealed: false });
  Object.assign(g, { ritual: null, phase: 'lobby', round: 0, night: null, votes: {}, voteRestrict: null, revoted: false, winner: null, endsAt: 0 });
  g.story = [];
}

/* ---------- what each screen gets to see ---------- */
export function publicView(g) {
  const over = g.phase === 'over';
  const fogged = g.phase === 'vote' && g.settings.jokers.fog;
  const night = g.night ? Object.keys(g.night.acts).length : 0;
  return {
    code: g.code, phase: g.phase, round: g.round, endsAt: g.endsAt, winner: g.winner,
    settings: Object.assign({}, g.settings, { deck: deckFor(g).deck }), citizens: deckFor(g).citizens,
    players: g.players.map(p => ({
      id: p.id, name: p.name, alive: p.alive, connected: !!p.connected, bot: !!p.bot, silenced: p.silenced, ready: p.ready,
      mayor: p.mayorRevealed, role: (over || p.revealed) ? p.role : null, lover: over ? p.lover : null,
    })),
    votes: fogged ? null : g.votes, voted: Object.keys(g.votes), tally: fogged ? null : tally(g), voteRestrict: g.voteRestrict,
    acted: night, aliveCount: alive(g).length, killersChose: killersChose(g),
    // everyone acts at night, so naming who's still deciding gives nothing away
    waiting: g.phase === 'night' && g.night ? alive(g).filter(p => !g.night.acts[p.id]).map(p => p.name) : [],
    story: g.story.slice(-80),
  };
}
export function privateView(g, p) {
  if (!p.role) return { id: p.id, name: p.name };
  // who's who is learned at the table during the first night, never from the app
  const myTeam = teamOf(g, p);
  const me = { id: p.id, name: p.name, role: p.role, team: myTeam, alive: p.alive, silenced: p.silenced, mayorRevealed: p.mayorRevealed, lover: !!p.lover, ready: p.ready };
  if (g.phase === 'night' && g.night && p.alive) {
    const kind = nightAction(g, p), mine = g.night.acts[p.id];
    me.night = { kind, target: mine ? mine.target : null, blocked: [] };
    if (kind === 'kill') {
      me.night.partners = killers(g).filter(k => k.id !== p.id).map(k => ({ name: k.name, target: (g.night.acts[k.id] || {}).target || null }));
      me.night.blocked = g.players.filter(o => isCore(g, o)).map(o => o.id);
    }
    if (kind === 'save' && g.lastSave) me.night.blocked = [g.lastSave];
    if (kind === 'silence') me.night.blocked = [p.id, g.lastSilence].filter(Boolean);
  }
  if (g.phase === 'vote') { me.vote = g.votes[p.id] || null; me.canVote = canVote(g, p); }
  return me;
}

/* ---------- test mode: bots play themselves unless someone opens their phone ---------- */
const BOT_NAMES = ['Γιώργος', 'Μαρία', 'Κώστας', 'Ελένη', 'Νίκος', 'Κατερίνα', 'Δημήτρης', 'Σοφία', 'Γιάννης', 'Άννα', 'Πέτρος', 'Δέσποινα', 'Στέλιος', 'Βάσω', 'Μανώλης'];
export function addBot(g) {
  const name = BOT_NAMES.map(n => 'Bot ' + n).find(n => !g.players.some(p => p.name === n));
  return name ? join(g, name, true) : { error: 'No more bot names.' };
}
function needsBot(g, p) {
  if (!p.bot || p.connected) return false;
  if (g.phase === 'reveal') return !p.ready;
  if (g.phase === 'night' && g.night && p.alive) {
    const a = g.night.acts[p.id];
    if (!a) return true;
    // a bot killer follows a human partner's pick, so the night can end
    return nightAction(g, p) === 'kill' && killers(g).some(k => k.id !== p.id && !k.bot && g.night.acts[k.id] && g.night.acts[k.id].target !== a.target);
  }
  if (g.phase === 'vote') return canVote(g, p) && !g.votes[p.id];
  return false;
}
export const botsPending = g => g.players.some(p => needsBot(g, p));
export function botStep(g) {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  for (const p of g.players) {
    if (!needsBot(g, p)) continue;
    if (g.phase === 'reveal') { ready(g, p); continue; }
    if (g.phase === 'night') {
      const kind = nightAction(g, p), live = alive(g);
      let t = null;
      if (kind === 'kill') {
        const partner = killers(g).filter(k => k.id !== p.id && g.night.acts[k.id]).sort((a, b) => a.bot - b.bot)[0];
        t = partner ? g.night.acts[partner.id].target : (pick(live.filter(o => !isCore(g, o))) || {}).id;
      } else if (kind === 'save') t = (pick(live.filter(o => o.id !== g.lastSave)) || {}).id;
      else if (kind === 'silence') t = (pick(live.filter(o => o.id !== p.id && o.id !== g.lastSilence)) || {}).id;
      else t = (pick(live.filter(o => o.id !== p.id)) || {}).id;
      if (t) act(g, p, t);
      if (g.phase !== 'night') return;
    } else if (g.phase === 'vote') {
      const opts = alive(g).filter(o => o.id !== p.id && (!g.voteRestrict || g.voteRestrict.includes(o.id)));
      if (opts.length) vote(g, p, pick(opts).id);
    }
  }
}
