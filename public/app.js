// Palermo client: home, joining, the phone (your secret card) and the table (narrator screen).
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CREW = ['Theodora', 'Giannis', 'Nick', 'Irene', 'Evelynn', 'Eva', 'Sotiria', 'Athanasia', 'oddfishgirl'];
  const COLORS = ['#fe5f55', '#009dff', '#f5b244', '#35bd86', '#8a6ac9', '#ff8fb1', '#00b8bd', '#ff9a3c', '#6cc24a', '#c96ad6', '#5a8dff', '#d9c23d', '#ff6f91', '#49c6e5', '#b0884f', '#9ad1a6'];
  const spr = (name, size, cls) => window.TAROT.svg(name, size || 20, cls);
  const PHASE = {
    lobby: ['Lobby', 'Waiting for everyone to join'], reveal: ['Your role', 'Look at your card. Don\'t let anyone see.'],
    night: ['Night', 'Eyes closed. Act in secret.'], day: ['Day', 'Talk. Accuse. Lie.'], vote: ['The Vote', 'Who goes to the fountain?'],
    dusk: ['Dusk', 'The town goes home.'], over: ['Game over', ''],
  };

  const params = new URLSearchParams(location.search);
  const code = (params.get('r') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  const tableMode = params.get('table') === '1';
  const asToken = params.get('as') || '';   // test mode: this tab plays as a bot
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('palermo:' + code)) || {}; } catch (e) { return {}; } },
    set(o) { try { localStorage.setItem('palermo:' + code, JSON.stringify(Object.assign(store.get(), o))); } catch (e) { } },
  };
  let S = { pub: null, me: null, host: false, bots: [], roles: {}, jokers: {}, conn: 'idle' };
  let ws = null, retry = 0, pendingName = null, layout = '';
  const ui = { flipped: false, peek: false, tts: false, lastStory: 0, nameErr: '', missing: false };
  try { ui.tts = localStorage.getItem('palermo:tts') === '1'; } catch (e) { }

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 3200);
  }
  function send(d) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(d)); else toast('Reconnecting…'); }

  /* ---------------- connection ---------------- */
  async function connect() {
    if (retry === 0) {
      try {
        const info = await (await fetch('/api/room/' + code)).json();
        if (!info.exists) { ui.missing = true; render(); return; }
      } catch (e) { }
    }
    ws = new WebSocket((location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/api/room/' + code + '/ws');
    S.conn = 'connecting'; renderTop();
    ws.onopen = () => {
      retry = 0; S.conn = 'open';
      const st = store.get();
      send({ t: 'hello', token: asToken || st.token, hostKey: asToken ? undefined : st.hostKey, name: pendingName || undefined });
      pendingName = null; renderTop();
    };
    ws.onmessage = e => {
      const d = JSON.parse(e.data);
      if (d.t === 'welcome') { if (!asToken) store.set({ token: d.token }); }
      else if (d.t === 'error') { toast(d.text); if (!S.me) { ui.nameErr = d.text; render(); } }
      else if (d.t === 'state') { Object.assign(S, { pub: d.pub, me: d.me, host: d.host, bots: d.bots || [], roles: d.roles, jokers: d.jokers }); onState(); }
    };
    ws.onclose = () => { S.conn = 'closed'; renderTop(); setTimeout(connect, Math.min(8000, 400 * 2 ** retry++)); };
  }
  function join(name) {
    ui.nameErr = '';
    pendingName = name;
    if (ws && ws.readyState === 1) { send({ t: 'hello', token: store.get().token, hostKey: store.get().hostKey, name }); pendingName = null; }
  }

  /* ---------------- rendering ---------------- */
  let lastPhase = '';
  function onState() {
    const p = S.pub;
    if (p.phase !== lastPhase) { ui.flipped = false; ui.peek = false; lastPhase = p.phase; }
    window.bgMood = p.phase === 'night' ? 1 : p.phase === 'over' ? 0.4 : 0;
    render();
    pushStory();
  }
  function render() {
    const app = $('#app');
    if (!code) { layout = 'home'; app.innerHTML = homeHTML(); return; }
    if (ui.missing) { layout = 'missing'; app.innerHTML = `<div class="logo" style="font-size:60px">PALERMO</div><div class="panel" style="text-align:center"><h2>No room ${esc(code)}</h2><p class="muted">It may have expired. Ask the host for a new code.</p><a class="btn" href="/">Back</a></div>`; return; }
    if (!S.pub) { layout = 'loading'; app.innerHTML = `<div class="logo" style="font-size:60px">PALERMO</div><p class="tag">Connecting to room ${esc(code)}…</p>`; return; }
    const mode = tableMode ? 'table' : S.me ? 'phone' : 'name';
    if (mode === 'name') { layout = 'name'; app.innerHTML = nameHTML(); return; }
    if (layout !== mode) {
      layout = mode; ui.lastStory = 0;
      app.innerHTML = mode === 'table'
        ? `<div id="top"></div><div class="table"><div class="panel"><div class="story" id="story"></div></div><div id="main"></div></div><div id="hostbox"></div>`
        : `<div id="top"></div><div id="main"></div><div id="hostbox"></div><div class="panel"><div class="label" style="margin-bottom:8px">The story</div><div class="story" id="story"></div></div>`;
    }
    renderTop();
    $('#main').innerHTML = mode === 'table' ? tableHTML() : phoneHTML();
    $('#hostbox').innerHTML = S.host ? hostHTML() : '';
    if (S.pub.phase === 'lobby' && (mode === 'table' || S.host)) drawQR();
    tick();
  }
  function renderTop() {
    const el = $('#top'); if (!el || !S.pub) return;
    const p = S.pub, ph = PHASE[p.phase] || [p.phase];
    el.innerHTML = `<div class="top"><span class="brand">PALERMO</span><span class="chip code" title="Room code">${esc(p.code)}</span>
      ${asToken && S.me ? `<span class="chip" style="background:var(--purple);box-shadow:0 4px 0 var(--purple-d)">Test: playing as ${esc(S.me.name)}</span>` : ''}
      <span class="chip">${ph[0]}${['night', 'day', 'vote'].includes(p.phase) ? ' ' + p.round : ''}</span>
      <span class="chip timer hidden" data-timer></span><span class="grow"></span>
      ${S.conn !== 'open' ? '<span class="chip" style="background:var(--red)">offline…</span>' : ''}
      ${tableMode || S.host ? `<button class="btn small ${ui.tts ? 'gold' : 'grey'}" data-a="tts" title="Read the story out loud in Greek">Narrator ${ui.tts ? 'on' : 'off'}</button>` : ''}
      ${S.me && S.me.role && p.phase !== 'over' ? `<button class="btn small blue" data-a="peek">${spr('card', 18)} My card</button>` : ''}</div>
      ${ui.peek && S.me && S.me.role ? `<div class="panel" style="text-align:center">${roleCard(S.me.role, 'big')}${knowsHTML()}</div>` : ''}`;
    tick();
  }

  /* timers update on their own so typing isn't interrupted by re-renders */
  function tick() {
    const p = S.pub; if (!p) return;
    const left = Math.max(0, Math.round((p.endsAt - Date.now()) / 1000));
    document.querySelectorAll('[data-timer]').forEach(el => {
      el.classList.toggle('hidden', !p.endsAt || p.phase === 'over');
      el.classList.toggle('low', left <= 10);
      el.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
    });
  }
  setInterval(tick, 250);

  /* ---------------- story: append new lines, type the newest, optionally read it aloud ---------------- */
  function pushStory() {
    const box = $('#story'); if (!box) return;
    const lines = S.pub.story;
    if (!lines.length) { box.innerHTML = '<div class="faint">The story starts when the game does.</div>'; return; }
    if (!box.querySelector('.ln')) box.innerHTML = '';
    const fresh = lines.filter(l => l.id > ui.lastStory);
    if (!fresh.length) return;
    const backlog = ui.lastStory === 0 && fresh.length > 1;
    box.querySelectorAll('.ln.new').forEach(el => el.classList.remove('new'));
    fresh.forEach((l, i) => {
      const el = document.createElement('div');
      el.className = 'ln ' + l.kind + (i === fresh.length - 1 ? ' new' : '');
      el.innerHTML = `<span class="ic">${spr(l.kind, 22)}</span><span class="tx"></span>`;
      box.appendChild(el);
      const tx = el.querySelector('.tx');
      if (backlog || i < fresh.length - 1) tx.textContent = l.text;
      else typeOut(tx, l.text);
      if (ui.tts && !backlog) speak(l.text);
    });
    const all = box.querySelectorAll('.ln');
    all.forEach((el, i) => el.classList.toggle('old', i < all.length - 6));
    ui.lastStory = lines[lines.length - 1].id;
    box.scrollTop = box.scrollHeight;
  }
  function typeOut(el, text) {
    let i = 0; el.classList.add('caret');
    const step = () => { el.textContent = text.slice(0, ++i); $('#story') && ($('#story').scrollTop = 1e9); if (i < text.length) setTimeout(step, 24); else el.classList.remove('caret'); };
    step();
  }
  // the story is Greek, so it's read by the device's Greek voice (iPhone, Android, Mac and Windows all have one)
  function greekVoice() { return speechSynthesis.getVoices().find(v => /^el/i.test(v.lang)); }
  function speak(text) {
    if (!('speechSynthesis' in window)) return toast('This browser can\'t speak. Try Chrome or Safari.');
    const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?;'’:()-]/gu, ''));
    u.lang = 'el-GR'; u.rate = 0.95; u.pitch = 0.9;
    const v = greekVoice(); if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  /* ---------------- pieces ---------------- */
  const color = id => COLORS[Math.max(0, S.pub.players.findIndex(p => p.id === id)) % COLORS.length];
  const pname = id => (S.pub.players.find(p => p.id === id) || {}).name || '?';
  function roleCard(role, size, extra) {
    const r = S.roles[role]; if (!r) return '';
    const team = role === 'butcher' ? S.pub.settings.butcherTeam : r.team;
    return `<div class="card tarot tilt ${team} ${size || ''} ${extra || ''}"><div class="face"><div class="num">${TAROT.NUM[role] || ''}</div>
      <div class="art">${spr(role, 72)}</div><div class="nm">${esc(r.gr)}</div><div class="gr">${esc(r.name)}</div><div class="tx">${esc(r.blurb)}</div></div></div>`;
  }
  function knowsHTML() {
    const k = S.me.knows || [];
    const team = S.me.role === 'snitch' ? 'You secretly play for the <b>killers</b>. They don\'t know who you are.'
      : S.me.team === 'killers' ? 'You play for the <b>killers</b>.' : S.me.team === 'trela' ? 'You play <b>alone</b>.' : 'You play for the <b>town</b>.';
    return `<div class="knows"><div class="k">${team}</div>${k.map(x => `<div class="k"><b>${esc(x.name)}</b> is ${esc(x.as)}</div>`).join('')}</div>`;
  }
  function seatsHTML(o) {
    o = o || {};
    const p = S.pub, votes = p.votes || {};
    const voters = {}; for (const [v, t] of Object.entries(votes)) (voters[t] = voters[t] || []).push(v);
    return `<div class="seats">${p.players.map(pl => {
      const r = pl.role ? S.roles[pl.role] : null;
      const blocked = o.pick && (!pl.alive || (o.blocked || []).includes(pl.id) || (o.only && !o.only.includes(pl.id)));
      const st = pl.bot && pl.alive && !pl.silenced && !pl.mayor && p.phase === 'lobby' ? 'bot' : !pl.alive ? (r ? r.name : 'dead') : pl.silenced ? 'silenced' : pl.mayor ? 'Mayor' : p.phase === 'reveal' ? (pl.ready ? 'ready' : '…') : p.phase === 'vote' && p.voted.includes(pl.id) ? 'voted' : '';
      const sti = !pl.alive ? (r ? spr(pl.role, 14) : '') : pl.silenced ? spr('butcher', 14) : pl.mayor ? spr('mayor', 14) : '';
      const vs = o.votes && voters[pl.id] ? voters[pl.id] : [];
      return `<div class="seat ${pl.alive ? '' : 'dead'} ${pl.connected || pl.bot ? '' : 'off'} ${o.pick && !blocked ? 'pick' : ''} ${blocked ? 'blocked' : ''} ${o.sel === pl.id ? 'sel' : ''}" ${o.pick && !blocked ? `data-pick="${pl.id}"` : ''}>
        ${o.kick && S.me && pl.id !== S.me.id || o.kick && !S.me ? `<span class="badge" data-kick="${pl.id}" title="Remove" style="cursor:pointer">✕</span>` : ''}
        ${vs.length ? `<span class="badge blue">${vs.length}</span>` : ''}
        ${pl.alive ? '' : spr('skull', 26, 'skull')}<div class="av" style="background:${color(pl.id)}">${esc(pl.name.replace(/^Bot /, '').slice(0, 1).toUpperCase())}</div>
        <div class="nm">${esc(pl.name)}${S.me && pl.id === S.me.id ? ' (you)' : ''}</div><div class="st">${sti} ${esc(st)}</div>
        ${vs.length ? `<div class="vstack">${vs.map(v => `<i style="background:${color(v)}" title="${esc(pname(v))}"></i>`).join('')}</div>` : ''}
      </div>`;
    }).join('')}</div>`;
  }
  function boardHTML() {
    const p = S.pub;
    if (!p.tally) return `<div class="panel in" style="text-align:center">${spr('fog', 24)} The fog hides the votes. ${p.voted.length} of ${p.players.filter(x => x.alive && !x.silenced).length} have voted.</div>`;
    const rows = Object.entries(p.tally).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return '<div class="faint">No votes yet.</div>';
    const top = rows[0][1];
    return `<div class="board">${rows.map(([id, score]) => {
      const vs = Object.entries(p.votes || {}).filter(([, t]) => t === id).map(([v]) => v);
      const mayor = vs.some(v => (p.players.find(x => x.id === v) || {}).mayor);
      return `<div class="score ${score === top ? 'lead' : ''}"><span class="who">${esc(pname(id))}</span>
        <span class="chips pop">${vs.length}</span>${mayor ? `<span class="x">+</span><span class="mult pop" title="The Mayor counts twice">${spr('mayor', 18)}1</span>` : ''}<span class="x">=</span><span class="chips" style="background:var(--gold);box-shadow:0 4px 0 var(--gold-d);color:#3b2600;text-shadow:none">${score}</span></div>`;
    }).join('')}</div>`;
  }
  function banner() {
    const p = S.pub, ph = PHASE[p.phase] || [p.phase, ''];
    let title = ph[0], sub = ph[1];
    if (['night', 'day', 'vote'].includes(p.phase)) title += ' ' + p.round;
    if (p.phase === 'over') {
      title = p.winner === 'town' ? 'The town wins' : p.winner === 'killers' ? 'The killers win' : 'The Trela wins';
      const mine = S.me && S.me.team && (S.me.team === p.winner);
      sub = S.me && S.me.role ? (mine ? 'You won!' : 'You lost.') : '';
    }
    if (p.phase === 'vote' && p.voteRestrict) sub = 'Tie-break: only ' + p.voteRestrict.map(pname).join(' or ');
    return `<div class="banner"><h2>${esc(title)}</h2>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}<div style="margin-top:8px"><span class="chip timer hidden" data-timer style="font-size:26px"></span></div></div>`;
  }

  /* ---------------- phone ---------------- */
  function phoneHTML() {
    const p = S.pub, me = S.me;
    let body = '';
    if (p.phase === 'lobby') {
      body = `<div class="panel" style="text-align:center"><p>You're in as <b>${esc(me.name)}</b>. ${S.host ? 'Set up the game below, then start.' : 'Waiting for the host to start.'}</p>
        ${!S.host ? '<button class="btn small grey" data-a="leave">Leave</button>' : ''}</div>
        <div class="panel"><div class="label" style="margin-bottom:10px">${p.players.length} at the table</div>${seatsHTML({ kick: S.host })}</div>`;
    } else if (p.phase === 'reveal') {
      const ready = p.players.filter(x => x.ready).length;
      body = `<div class="panel" style="text-align:center">
        <div class="cards" data-a="flip" style="cursor:pointer">${ui.flipped ? roleCard(me.role, 'big', 'flip') : `<div class="card big back"><div class="face"><b>?</b>Tap to flip<br><span style="font-size:14px">Hide your screen</span></div></div>`}</div>
        ${ui.flipped ? knowsHTML() : ''}
        <div style="margin-top:14px">${me.ready ? `<p class="muted">Waiting for the others… ${ready}/${p.players.length}</p>` : `<button class="btn green" data-a="ready" ${ui.flipped ? '' : 'disabled'}>I've seen it</button>`}</div></div>`;
    } else if (p.phase === 'night') {
      body = nightHTML();
    } else if (p.phase === 'day') {
      body = `<div class="panel">
        ${me.alive && me.silenced ? `<p>${spr('butcher', 22)} <b>The Butcher got you.</b> No talking and no vote this round. Mime if you must.</p>` : ''}
        ${!me.alive ? `<p>${spr('skull', 22)} You're dead. No talking, just watch.</p>` : ''}
        ${me.role === 'mayor' && me.alive && !me.mayorRevealed ? `<button class="btn gold" data-a="mayor">${spr('mayor', 20)} Reveal I'm the Mayor (double vote)</button>` : ''}
        ${seatsHTML()}</div>`;
    } else if (p.phase === 'vote') {
      const can = me.canVote;
      body = `<div class="panel">${can ? `<p>${me.vote ? `You're voting for <b>${esc(pname(me.vote))}</b>. Tap someone else to change.` : 'Tap who you vote for.'}</p>` : `<p>${me.alive ? spr('butcher', 22) + ' The Butcher took your vote this round.' : spr('skull', 22) + ' The dead don\'t vote.'}</p>`}
        ${seatsHTML({ pick: can, sel: me.vote, only: p.voteRestrict, votes: true })}
        ${can && me.vote ? '<div style="margin-top:12px"><button class="btn small grey" data-a="unvote">Take back my vote</button></div>' : ''}</div>
        <div class="panel">${boardHTML()}</div>
        ${me.role === 'mayor' && me.alive && !me.mayorRevealed ? `<div class="panel"><button class="btn gold" data-a="mayor">${spr('mayor', 20)} Reveal I'm the Mayor (double vote)</button></div>` : ''}`;
    } else if (p.phase === 'dusk') {
      body = `<div class="panel" style="text-align:center"><p class="muted">The town goes home. Night is coming.</p></div>`;
    } else if (p.phase === 'over') {
      body = overHTML();
    }
    return banner() + body;
  }
  function nightHTML() {
    const p = S.pub, me = S.me, n = me.night;
    if (!me.alive) return `<div class="panel" style="text-align:center"><p style="margin:6px">${spr('skull', 64)}</p><p>You're dead. Keep your eyes closed and your mouth shut.</p></div>`;
    if (!n) return '';
    const prompt = {
      kill: spr('shown', 24) + ' Choose tonight\'s victim. The night doesn\'t end until all killers pick the same person.',
      save: spr('doctor', 24) + ' Who do you protect tonight?',
      silence: spr('butcher', 24) + ' Who loses their voice and vote for the next round?',
      suspect: spr('snitch', 24) + ' Who looks suspicious to you? (Everyone taps someone at night, so nobody can tell who has a power.)',
    }[n.kind];
    const partners = n.partners && n.partners.length ? `<div class="knows">${n.partners.map(x => `<div class="k"><b>${esc(x.name)}</b> ${x.target ? 'wants ' + esc(pname(x.target)) + (n.target && n.target !== x.target ? ' · pick the same person!' : n.target === x.target ? ' · agreed' : '') : 'hasn\'t picked yet'}</div>`).join('')}</div>` : '';
    return `<div class="panel"><p>${prompt}</p>${partners}
      <div style="margin-top:12px">${seatsHTML({ pick: true, sel: n.target, blocked: n.blocked })}</div>
      <p class="faint" style="margin-top:12px">${n.target ? `Picked <b>${esc(pname(n.target))}</b>. You can change until everyone's done.` : ''} ${p.acted}/${p.aliveCount} done.</p></div>`;
  }
  function overHTML() {
    const p = S.pub;
    return `<div class="panel"><div class="cards">${p.players.map(pl => `<div style="text-align:center">${roleCard(pl.role, '', pl.alive ? '' : 'off')}<div style="margin-top:10px;font-weight:700">${esc(pl.name)}${pl.lover ? ' ' + spr('lovers', 16) : ''}</div></div>`).join('')}</div>
      <p class="faint" style="text-align:center;margin-top:12px">${S.host ? 'Start another round below.' : 'Waiting for the host to start another round.'}</p></div>`;
  }

  /* ---------------- table (shared screen) ---------------- */
  function tableHTML() {
    const p = S.pub;
    if (p.phase === 'lobby') {
      const url = location.origin + '/?r=' + p.code;
      return `<div class="panel" style="text-align:center"><div class="label">Join on your phone</div>
        <div style="font-size:64px;letter-spacing:10px;font-weight:700;color:var(--gold);margin:6px 0">${esc(p.code)}</div>
        <div class="qr" id="qr"></div><p class="muted" style="word-break:break-all">${esc(url)}</p></div>
        <div class="panel"><div class="label" style="margin-bottom:10px">${p.players.length} at the table</div>${seatsHTML({ kick: S.host })}</div>`;
    }
    if (p.phase === 'over') return banner() + overHTML();
    return banner() + (p.phase === 'vote' ? `<div class="panel">${boardHTML()}</div>` : '') + `<div class="panel">${seatsHTML({ votes: p.phase === 'vote' })}</div>`;
  }
  function drawQR() {
    const el = $('#qr'); if (!el || !window.QRCode || el.dataset.done) return;
    el.dataset.done = 1;
    new QRCode(el, { text: location.origin + '/?r=' + S.pub.code, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M });
  }

  /* ---------------- host controls ---------------- */
  function hostHTML() {
    const p = S.pub, st = p.settings;
    if (p.phase === 'lobby') {
      const specials = Object.keys(S.roles).filter(k => k !== 'citizen');
      const deck = st.deck || {}, n = p.players.length, cit = p.citizens;
      const ok = n >= 4 && cit >= 0 && (deck.hidden || deck.shown);
      return `<div class="panel host"><div class="label">Host · roles in the deck (tap to add or remove)</div>
        <div class="cards" style="margin:14px 0">${specials.map(k => `<div data-role="${k}" class="toggle">${roleCard(k, '', deck[k] ? 'toggle' : 'off toggle')}</div>`).join('')}
          <div>${roleCard('citizen', '', cit > 0 ? '' : 'off')}<div style="text-align:center;margin-top:8px" class="muted">× ${Math.max(0, cit)} citizens</div></div></div>
        <div class="label">Jokers · house rules</div>
        <div class="cards" style="margin:14px 0">${Object.entries(S.jokers).map(([k, j]) => `<div class="jk"><div class="card tarot joker tilt toggle ${st.jokers[k] ? '' : 'off'}" data-joker="${k}"><div class="face"><div class="num">${TAROT.NUM[k] || ''}</div><div class="art">${spr(k, 60)}</div><div class="nm">${esc(j.name)}</div></div></div><div class="jt">${esc(j.text)}</div></div>`).join('')}</div>
        <div class="toggle-row" style="margin-bottom:12px"><span class="label">Talk time</span>
          <div class="seg">${[60, 120, 180, 300, 480].map(s => `<button data-talk="${s}" class="${st.discussSec === s ? 'on' : ''}">${s / 60}m</button>`).join('')}</div>
          <span class="label" style="margin-left:8px">Butcher plays for</span>
          <div class="seg"><button data-bt="killers" class="${st.butcherTeam === 'killers' ? 'on' : ''}">killers</button><button data-bt="town" class="${st.butcherTeam === 'town' ? 'on' : ''}">town</button></div></div>
        <div class="toggle-row"><span class="label">Test mode</span>
          <button class="btn small purple" data-a="bot">+ Bot</button>
          <button class="btn small purple" data-a="fill" ${n >= 10 ? 'disabled' : ''}>Fill to 10 with bots</button>
          ${S.bots.length ? '<button class="btn small grey" data-a="nobots">Remove bots</button>' : ''}
          <span class="faint" style="font-size:14px">Bots play by themselves. Open one's phone to play as them.</span></div>
        ${botLinks()}
        <div class="row" style="margin-top:22px"><button class="btn green" data-a="start" ${ok ? '' : 'disabled'}>Start with ${n}</button>
          <span class="faint">${n < 4 ? 'Need at least 4 players.' : cit < 0 ? `Too many roles: remove ${-cit}.` : !(deck.hidden || deck.shown) ? 'Add at least one killer.' : ''}</span>
          <span class="grow"></span>${tableMode ? '' : `<a class="btn small blue" href="/?r=${p.code}&table=1" target="_blank">Open table screen</a>`}</div>
        ${tableMode ? '' : `<div style="margin-top:14px" class="row"><div class="qr" id="qr"></div><div class="muted">Friends scan this or open<br><b>${esc(location.host)}</b> and type <b style="color:var(--gold)">${esc(p.code)}</b></div></div>`}</div>`;
    }
    const next = { reveal: 'Start the night now', night: 'End the night', day: 'Start the vote', vote: 'Close the vote', dusk: 'Next night' }[p.phase];
    const nightLocked = p.phase === 'night' && !p.killersChose;
    return `<div class="panel host"><div class="label" style="margin-bottom:10px">Host</div><div class="row">
      ${next ? `<button class="btn ${p.phase === 'day' ? 'gold' : 'blue'}" data-a="advance" ${nightLocked ? 'disabled' : ''}>${next}</button>` : ''}
      ${p.phase === 'over' ? '<button class="btn green" data-a="lobby">New round, same people</button>' : '<button class="btn small grey" data-a="lobby">End game</button>'}
      ${botLinks()}
      ${p.phase === 'night' ? `<span class="faint">${p.acted}/${p.aliveCount} acted. ${p.killersChose ? 'The killers have chosen; you can end the night if someone is stuck.' : 'The night only ends once the killers agree on a victim.'}</span>` : ''}</div></div>`;
  }

  function botLinks() {
    if (!S.bots.length) return '';
    return `<div class="toggle-row" style="margin-top:4px"><span class="label">Open a bot's phone</span>${S.bots.map(b =>
      `<a class="btn small grey" target="_blank" href="/?r=${esc(S.pub.code)}&as=${esc(b.token)}">${esc(b.name.replace(/^Bot /, ''))}</a>`).join('')}</div>`;
  }

  /* ---------------- home & name ---------------- */
  function homeHTML() {
    return `<div style="padding-top:6vh"><div class="logo">${[...'PALERMO'].map((c, i) => `<span style="animation-delay:${i * 0.12}s">${c}</span>`).join('')}</div>
      <p class="tag">Killers, a Detective, a Snitch, and one very long night.</p>
      <div style="max-width:460px;margin:0 auto">
        <div class="panel"><button class="btn wide" data-a="host">Host a game</button>
          <p class="faint" style="margin:10px 0 0;font-size:15px">Open it on a laptop or TV to be the table screen, or on your phone if you're playing too.</p></div>
        <div class="panel"><form class="row" data-form="join"><input class="input grow" name="code" maxlength="4" placeholder="ROOM CODE" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:4px"><button class="btn blue">Join</button></form></div>
        <div class="panel in"><div class="label" style="margin-bottom:6px">How it works</div>
          <p class="muted" style="margin:0;font-size:15px">Everyone joins on their phone and gets a secret role card. At night you act in secret on your phone; by day the table screen tells the story and you argue, then vote someone to the fountain. The Detective knows the Shown Killer, the Snitch knows the Hidden Killer.</p></div>
      </div></div>`;
  }
  function nameHTML() {
    const p = S.pub, taken = new Set(p.players.map(x => x.name.toLowerCase()));
    if (p.phase !== 'lobby') return `<div class="logo" style="font-size:56px">PALERMO</div><div class="panel" style="text-align:center"><h2>A game is already running</h2>
      <p class="muted">You can watch the story on this screen and join the next round.</p><a class="btn blue" href="/?r=${esc(code)}&table=1">Watch</a></div>`;
    return `<div class="logo" style="font-size:56px">PALERMO</div><p class="tag">Room <b>${esc(code)}</b> · who are you?</p>
      <div class="panel"><div class="names">${CREW.map(n => `<button class="btn ${taken.has(n.toLowerCase()) ? 'grey' : 'blue'}" data-name="${esc(n)}" ${taken.has(n.toLowerCase()) ? 'disabled' : ''}>${esc(n)}</button>`).join('')}</div>
        <form class="row" data-form="name" style="margin-top:14px"><input class="input grow" name="name" maxlength="24" placeholder="Someone else? Type a name"><button class="btn">Join</button></form>
        ${ui.nameErr ? `<p style="color:#ffb4ae">${esc(ui.nameErr)}</p>` : ''}</div>
      ${store.get().hostKey ? `<div class="panel in"><p style="margin:0 0 10px">You're the host. Not playing yourself?</p><a class="btn small gold" href="/?r=${esc(code)}&table=1">Use this screen as the table only</a></div>` : ''}`;
  }

  /* ---------------- events ---------------- */
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-a],[data-pick],[data-name],[data-role],[data-joker],[data-talk],[data-bt],[data-kick]');
    if (!t) return;
    const d = t.dataset, p = S.pub;
    if (d.kick) { send({ t: 'kick', pid: d.kick }); return; }
    if (d.name) return join(d.name);
    if (d.pick) {
      if (p.phase === 'night') send({ t: 'act', target: d.pick });
      else if (p.phase === 'vote') send({ t: 'vote', target: d.pick });
      return;
    }
    if (d.role) { const deck = Object.assign({}, p.settings.deck); deck[d.role] = deck[d.role] ? 0 : 1; send({ t: 'settings', deck }); return; }
    if (d.joker) { send({ t: 'settings', jokers: { [d.joker]: !p.settings.jokers[d.joker] } }); return; }
    if (d.talk) { send({ t: 'settings', discussSec: +d.talk }); return; }
    if (d.bt) { send({ t: 'settings', butcherTeam: d.bt }); return; }
    switch (d.a) {
      case 'host': {
        t.disabled = true;
        try {
          const r = await (await fetch('/api/new', { method: 'POST' })).json();
          if (!r.code) throw new Error(r.error || 'failed');
          localStorage.setItem('palermo:' + r.code, JSON.stringify({ hostKey: r.hostKey }));
          location.href = '/?r=' + r.code;
        } catch (x) { toast('Couldn\'t create a room: ' + x.message); t.disabled = false; }
        break;
      }
      case 'flip': if (S.pub.phase === 'reveal' && !ui.flipped) { ui.flipped = true; render(); } break;
      case 'ready': send({ t: 'ready' }); break;
      case 'peek': ui.peek = !ui.peek; renderTop(); break;
      case 'mayor': if (confirm('Reveal to everyone that you\'re the Mayor? The killers will know too.')) send({ t: 'mayor' }); break;
      case 'unvote': send({ t: 'vote', target: null }); break;
      case 'leave': send({ t: 'leave' }); store.set({ token: null }); break;
      case 'start': send({ t: 'start' }); break;
      case 'bot': send({ t: 'addBot' }); break;
      case 'fill': for (let i = p.players.length; i < 10; i++) setTimeout(() => send({ t: 'addBot' }), (i - p.players.length) * 120); break;
      case 'nobots': send({ t: 'removeBots' }); break;
      case 'advance': send({ t: 'advance' }); break;
      case 'lobby': if (p.phase === 'over' || confirm('End this game for everyone?')) send({ t: 'lobby' }); break;
      case 'tts':
        ui.tts = !ui.tts;
        try { localStorage.setItem('palermo:tts', ui.tts ? '1' : '0'); } catch (x) { }
        if (ui.tts) { speak('Ο αφηγητής είναι εδώ.'); setTimeout(() => { if (!greekVoice()) toast('No Greek voice found on this device. Add one in its speech settings.'); }, 600); }
        else speechSynthesis.cancel();
        renderTop(); break;
    }
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-form]'); if (!f) return;
    e.preventDefault();
    if (f.dataset.form === 'join') {
      const c = f.code.value.toUpperCase().replace(/[^A-Z]/g, '');
      if (c.length === 4) location.href = '/?r=' + c; else toast('Room codes have 4 letters.');
    } else if (f.dataset.form === 'name') { const n = f.name.value.trim(); if (n) join(n); }
  });
  // card tilt + foil shine follow the pointer
  document.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('.tilt');
    document.querySelectorAll('.tilt.tilting').forEach(x => { if (x !== c) { x.classList.remove('tilting'); x.style.removeProperty('--rx'); x.style.removeProperty('--ry'); x.style.removeProperty('--sx'); } });
    if (!c) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.classList.add('tilting');
    c.style.setProperty('--ry', ((x - 0.5) * 18).toFixed(1) + 'deg');
    c.style.setProperty('--rx', ((0.5 - y) * 18).toFixed(1) + 'deg');
    c.style.setProperty('--sx', (100 - x * 100).toFixed(0) + '%');
  });

  render();
  if (code) connect();
})();
