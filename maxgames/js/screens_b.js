/* MAX GAMES — results, sharing, championship, medal ceremony and pause screens. */
'use strict';
(() => {
  const S = MG.Screens, F = MG.Font, UI = MG.UI, C = UI.C, inR = UI.inR;
  const ordinal = n => n + (['TH', 'ST', 'ND', 'RD'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]);
  const medalOf = r => ['gold', 'silver', 'bronze'][r - 1];
  function head(ctx, text, sub) { const l = UI.L(); let y = UI.title(ctx, text, l.y0 + 2, { scale: 2 }); if (sub) { F.text(ctx, sub, MG.view.W / 2, y, '#fff', 1, { align: 'center', shadow: C.ink }); y += 11; } return y + 2; }
  /* lay out the buttons of a Menu as a grid (cols) inside the content column */
  function grid(menu, x, y, w, cols, h, gap = 4) { const bw = Math.floor((w - gap * (cols - 1)) / cols); menu.rects = menu.items.map((_, i) => ({ x: x + (i % cols) * (bw + gap), y: y + Math.floor(i / cols) * (h + gap), w: bw, h })); menu.bottom = y + Math.ceil(menu.items.length / cols) * (h + gap) - gap; }

  /* pixel medal with ribbon; sx = horizontal squash (spin), u = pixel size */
  const MCOL = { gold: ['#ffd84a', '#c8901a', '#fff3a8'], silver: ['#dfe4ee', '#8d96aa', '#ffffff'], bronze: ['#e09a5a', '#94561f', '#ffd0a0'] };
  function bigMedal(ctx, type, cx, cy, u, sx, swing) {
    const c = MCOL[type], R = 9;
    for (let k = 0; k < 8; k++) { const o = Math.round(swing * (k / 8) * 3 * u); ctx.fillStyle = k % 2 ? '#e0443a' : '#c93a2c'; ctx.fillRect(cx - 5 * u + o - (k > 3 ? 0 : 0), cy - (R + 8 - k) * u, 4 * u, u); ctx.fillStyle = k % 2 ? '#3a55a8' : '#2d4690'; ctx.fillRect(cx + 1 * u + o, cy - (R + 8 - k) * u, 4 * u, u); }
    for (let y = -R; y <= R; y++) { const w = Math.round(Math.sqrt(R * R + .5 - y * y) * sx * u); if (w <= 0) continue; const hw = Math.round(Math.sqrt(R * R - y * y) * sx * u); ctx.fillStyle = '#16213a'; ctx.fillRect(cx - hw - u, cy + y * u, hw * 2 + 2 * u, u); ctx.fillStyle = y < -3 ? c[2] : y > 3 ? c[1] : c[0]; ctx.fillRect(cx - hw, cy + y * u, hw * 2, u); }
    ctx.fillStyle = '#16213a'; ctx.fillRect(cx - 9 * u * sx, cy - R * u - u, 18 * u * sx, u); for (let y = -6; y <= 6; y++) { const hw = Math.round(Math.sqrt(36.5 - y * y) * sx * u); ctx.fillStyle = y < 0 ? c[1] : c[2]; ctx.fillRect(cx - hw, cy + y * u, 1 * Math.max(1, u * sx * .6), u); ctx.fillRect(cx + hw - Math.max(1, u * sx * .6), cy + y * u, Math.max(1, u * sx * .6), u); }
    if (sx > .45) F.text(ctx, { gold: '1', silver: '2', bronze: '3' }[type], cx + (sx < 1 ? 0 : 0), cy - 5 * u / 2 * 1.0, '#16213a', Math.max(2, Math.round(u * 1.3)), { align: 'center' });
  }
  function sparkle(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.fillRect(x - 1, y - r, 2, r * 2); ctx.fillRect(x - r, y - 1, r * 2, 2); ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2); }
  S.bigMedal = bigMedal;

  /* ============================== RESULTS ============================== */
  S.Results = class extends MG.Screen {
    enter() {
      const { event, result, cfg } = this.p, D = MG.Storage.data, h = result.human, g = this.game; this.newPB = false; this.padMode = 'menu'; this.newStad = null; this.verdict = null;
      const before = new Set(MG.STADIUMS.filter(s => MG.Storage.stadiumUnlocked(s.id)).map(s => s.id));
      if (result.kind === 'time') { D.stats.races++; if (h && !h.dq) this.newPB = MG.Storage.record(result.id, h.time); }
      else if (h && h.best > 0) this.newPB = MG.Storage.record(result.id, h.best);
      const rank = h ? h.rank : 9, real = cfg.mode !== 'practice' && result.rows.length > 1;
      if (rank === 1 && real && !h.dq) { D.stats.wins++; const now = MG.STADIUMS.find(s => !before.has(s.id) && MG.Storage.stadiumUnlocked(s.id)); if (now) this.newStad = now.name; }
      if (cfg.challenge && h && cfg.challenge.id === result.id) { const val = result.kind === 'time' ? h.time : h.best, ch = cfg.challenge; this.verdict = !h.dq && val > 0 && (result.kind === 'time' ? val < ch.val : val > ch.val) ? 'win' : 'lose'; }
      MG.Storage.save();
      if (rank === 1 && real) { MG.Audio.sfx.fanfare(); MG.Audio.sfx.cheer(2.8, .6); } else if (rank <= 3 && real) { MG.Audio.sfx.medal(); MG.Audio.sfx.cheer(1.8, .4); } else MG.Audio.sfx.cheer(1.2, .25);
      if (this.newPB) setTimeout(() => MG.Audio.sfx.record(), 700);
      if (rank <= 3 && real) this.game.menuStadium().cheer(.8, 4, 8);
      const m = cfg.mode, items = [{ label: 'SHARE', kind: 'coral', ok: () => g.go(new S.Share(g, { result, cfg, parent: () => g.go(this, true) })) }];
      if (m === 'champ') items.unshift({ label: 'CONTINUE', kind: 'coral', ok: () => g.champContinue(result) }), items[1].kind = 'sun';
      items.push({ label: 'REPLAY', kind: 'teal', ok: () => g.replayEvent(event, this) });
      if (m !== 'champ') { items.push({ label: 'RETRY', kind: 'teal', ok: () => g.retry(cfg) }); items.push({ label: 'MENU', kind: 'navy', ok: () => g.toMenu() }); }
      this.menu = new UI.Menu(items); this.medal = rank <= 3 && real && !(h && h.dq) ? rank : 0; this.skip = false;
    }
    medalOn() { return this.medal && !this.skip && this.t > .5 && this.t < 4.6; }
    drawMedal(ctx) {
      const V = MG.view, t = this.t - .5, cx = Math.round(V.W / 2), cy = Math.round(V.H * .36), u = V.portrait ? 4 : 3, type = ['gold', 'silver', 'bronze'][this.medal - 1], fade = Math.min(1, t * 4, (4.1 - t) * 3);
      ctx.fillStyle = `rgba(10,18,44,${.93 * fade})`; ctx.fillRect(0, 0, V.W, V.H);
      const drop = Math.min(1, t / .7), yy = cy - Math.round((1 - drop) * (1 - drop) * V.H * .6) + (drop >= 1 ? Math.round(Math.abs(Math.sin((t - .7) * 5)) * Math.max(0, 1 - (t - .7)) * -14) : 0);
      const sx = t < 2.2 ? Math.max(.12, Math.abs(Math.cos(t * 5.2 * (1 - Math.min(1, t / 2.2) * .8)))) : 1, swing = Math.sin(t * 6) * Math.max(0, 1 - t / 3);
      if (t > .6) for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + t * .8, r = (24 + (i % 3) * 8) * u / 3 + Math.sin(t * 4 + i) * 3; if (Math.sin(t * 7 + i * 2) > .1) sparkle(ctx, cx + Math.round(Math.cos(a) * r * 1.5), yy + Math.round(Math.sin(a) * r), 2 + (i % 2), ['#ffe48a', '#fff', '#7de8ff'][i % 3]); }
      ctx.globalAlpha = fade; bigMedal(ctx, type, cx, yy, u, sx, swing); ctx.globalAlpha = 1;
      if (t > .9) { const txt = ['GOLD MEDAL!', 'SILVER MEDAL!', 'BRONZE MEDAL!'][this.medal - 1]; F.text(ctx, txt, cx, yy + 13 * u + 6, C.sun, 2, { align: 'center', shadow: C.coral, outline: C.ink, ext: 1 }); F.text(ctx, 'CONGRATULATIONS!', cx, yy + 13 * u + 28, '#fff', 1, { align: 'center', shadow: C.ink }); }
    }
    render(ctx) {
      this.renderMain(ctx); if (this.medalOn()) this.drawMedal(ctx);
    }
    renderMain(ctx) {
      const g = this.game, { result, cfg } = this.p, ev = MG.EVENTS[result.id], rows = result.rows, h = result.human, l = UI.L(); g.backdrop.draw(ctx, g.stadiumFor(cfg), .62);
      let y = head(ctx, 'RESULTS', ev.name + (cfg.mode === 'practice' ? ' - PRACTICE' : ''));
      const lj = result.kind === 'dist', rh = l.P ? (rows.length > 5 ? 17 : 19) : (rows.length > 5 ? 12 : 14), ph = rows.length * rh + 8; UI.panel(ctx, l.x, y, l.cw, ph);
      rows.forEach((r, i) => {
        const yy = y + 5 + i * rh; if (r.human) { ctx.fillStyle = 'rgba(255,201,51,.5)'; ctx.fillRect(l.x + 3, yy - 2, l.cw - 6, rh - 1); }
        const ty = yy + Math.floor((rh - 9) / 2) - 1; F.text(ctx, ordinal(r.rank), l.x + 6, ty + 1, r.rank === 1 ? C.coralD : C.mute, 1); ctx.drawImage(MG.flag(r.country), l.x + 26, ty); F.text(ctx, r.name.slice(0, l.P ? 8 : 11), l.x + 46, ty + 1, r.human ? C.ink : '#3a4468', 1);
        if (lj) { if (!l.P) for (let k = 0; k < 3; k++) { const v = r.att[k]; F.text(ctx, v == null ? '-' : v === 0 ? 'X' : v.toFixed(2), l.x + 138 + k * 36, ty + 1, v === 0 ? C.red : C.mute, 1); } F.text(ctx, r.best ? r.best.toFixed(2) + 'M' : '-', l.x + l.cw - (rows.length > 1 && cfg.mode !== 'practice' ? 22 : 8), ty + 1, C.tealD, 1, { align: 'right' }); }
        else { F.text(ctx, r.dq ? 'DQ' : MG.fmtTime(r.time) + 'S', l.x + l.cw - (rows.length > 1 && cfg.mode !== 'practice' ? 22 : 8), ty + 1, r.dq ? C.red : C.tealD, 1, { align: 'right' }); if (!r.dq && i > 0 && !rows[0].dq && !l.P) F.text(ctx, '+' + (r.time - rows[0].time).toFixed(2), l.x + l.cw - 80, ty + 1, C.mute, 1, { align: 'right' }); if (r.hits && !l.P) F.text(ctx, r.hits + ' HIT', l.x + l.cw - 128, ty + 1, '#d9732a', 1, { align: 'right' }); }
        if (r.rank <= 3 && cfg.mode !== 'practice' && rows.length > 1) MG.Sprites.medal(ctx, medalOf(r.rank), l.x + l.cw - 11, ty + 4, .6);
      });
      y += ph + 7;
      if (h) {
        const pb = MG.Storage.data.bests[result.id];
        if (this.newPB && Math.floor(this.t * 3) % 2) F.text(ctx, '* NEW PERSONAL BEST! *', l.V.W / 2, y, C.sun, 1, { align: 'center', shadow: C.ink }); else F.text(ctx, 'BEST: ' + pbText(result.id, pb), l.V.W / 2, y, '#fff', 1, { align: 'center', shadow: C.ink });
        y += 12;
        if (!lj && h.dq) { F.text(ctx, 'DISQUALIFIED - 2 FALSE STARTS', l.V.W / 2, y, '#ff8a7a', 1, { align: 'center', shadow: C.ink }); y += 11; }
        else if (!lj && result.reaction != null) { F.text(ctx, 'REACTION ' + result.reaction.toFixed(2) + 'S', l.V.W / 2, y, '#bfe6fb', 1, { align: 'center', shadow: C.ink }); y += 11; }
        if (cfg.mode !== 'practice' && rows.length > 1) { const rk = h.rank, txt = rk === 1 ? 'GOLD MEDAL!' : rk === 2 ? 'SILVER MEDAL!' : rk === 3 ? 'BRONZE MEDAL!' : 'YOU: ' + ordinal(rk); F.text(ctx, txt, l.V.W / 2, y + 2, rk <= 3 ? C.sun : '#fff', 2, { align: 'center', shadow: C.coral, outline: C.ink, ext: 1 }); y += 24; }
        if (this.verdict) { UI.chip(ctx, this.verdict === 'win' ? 'CHALLENGE WON!' : 'CHALLENGE LOST', l.V.W / 2, y, this.verdict === 'win' ? C.green : C.coral); y += 16; }
        if (this.newStad) { UI.chip(ctx, 'NEW STADIUM: ' + this.newStad, l.V.W / 2, y, C.navy, '#fff'); y += 16; }
      }
      const n = this.menu.items.length, cols = l.P ? 2 : n, bh = l.P ? 24 : 20, brows = Math.ceil(n / cols), by = y + (l.P ? 14 : 6);
      grid(this.menu, l.x, Math.min(by, l.bottom - brows * (bh + 4) + 4), l.cw, cols, bh); this.menu.render(ctx, this.t);
    }
    onInput(ev) { if (this.medalOn() && this.t > 1.2 && (ev.type === 'pdown' || (ev.type === 'down' && (ev.act === 'ok' || ev.act === 'back')))) { this.skip = true; return true; } if (this.medalOn()) return false; return this.menu.onInput(ev) || (ev.type === 'down' && ev.act === 'back' ? (MG.Audio.sfx.back(), this.game.toMenu(), true) : false); }
  };

  /* ============================== SHARE / CHALLENGE ============================== */
  S.Share = class extends MG.Screen {
    enter() {
      const g = this.game; this.info = MG.Share.info(this.p.result, this.p.cfg); this.card = MG.Share.card(this.info); this.busy = false;
      this.menu = new UI.Menu([
        { label: 'SHARE CHALLENGE', kind: 'coral', ok: async () => { if (this.busy) return; this.busy = true; const r = await MG.Share.send(this.info); this.busy = false; if (r.ok) MG.toast(r.how === 'copied' ? 'LINK COPIED - SEND IT TO A FRIEND!' : 'CHALLENGE SENT!'); else MG.toast('SHARING NOT AVAILABLE'); } },
        { label: 'COPY LINK', kind: 'teal', ok: async () => { const r = await MG.Share.copy(this.info); MG.toast(r.ok ? 'LINK COPIED!' : 'COPY FAILED'); } },
      ]);
      this.footer = new UI.Footer(() => this.back());
    }
    render(ctx) {
      const g = this.game, l = UI.L(), inf = this.info; g.backdrop.draw(ctx, g.menuStadium(), .62); let y = head(ctx, 'CHALLENGE!', 'DARE YOUR FRIENDS TO BEAT YOU');
      if (l.P) {
        const cs = 200, cx = Math.round(l.V.W / 2 - cs / 2); ctx.fillStyle = 'rgba(6,10,28,.4)'; ctx.fillRect(cx + 3, y + 5, cs, cs); ctx.drawImage(this.card, cx, y, cs, cs); ctx.fillStyle = C.ink; ctx.fillRect(cx - 1, y - 1, cs + 2, 1); ctx.fillRect(cx - 1, y + cs, cs + 2, 1); ctx.fillRect(cx - 1, y, 1, cs); ctx.fillRect(cx + cs, y, 1, cs); y += cs + 12;
        this.menu.layout(l.x, y, l.cw, 26, 5);
      } else {
        const cs = 100; ctx.fillStyle = 'rgba(6,10,28,.4)'; ctx.fillRect(l.x + 3, y + 3, cs, cs); ctx.drawImage(this.card, l.x, y, cs, cs); ctx.fillStyle = C.ink; ctx.fillRect(l.x - 1, y - 1, cs + 2, 1); ctx.fillRect(l.x - 1, y + cs, cs + 2, 1); ctx.fillRect(l.x - 1, y, 1, cs); ctx.fillRect(l.x + cs, y, 1, cs);
        const tx = l.x + cs + 10, tw = l.cw - cs - 10; UI.panel(ctx, tx, y, tw, 40); UI.wrap(inf.text.replace(/MAX GAMES/, 'MAX GAMES'), tw - 12).slice(0, 4).forEach((s, i) => F.text(ctx, s, tx + 6, y + 6 + i * 9, C.ink, 1));
        this.menu.layout(tx, y + 48, tw, 22, 4);
      }
      this.menu.render(ctx, this.t); this.footer.render(ctx);
    }
    onInput(ev) { return this.footer.onInput(ev) || this.menu.onInput(ev) || this.common(ev); }
  };

  /* ============================== CHAMPIONSHIP ============================== */
  S.ChampIntro = class extends MG.Screen {
    enter() { const D = MG.Storage.data, g = this.game; this.tier = D.champ.tier; this.footer = new UI.Footer(() => g.toMenu(), [{ label: 'START', kind: 'coral', ok: () => g.champStart() }]); }
    render(ctx) {
      const g = this.game, D = MG.Storage.data, l = UI.L(); g.backdrop.draw(ctx, g.menuStadium(), .55); let y = head(ctx, 'CHAMPIONSHIP', MG.TIERS[this.tier] + ' LEVEL');
      const n = MG.EVENT_ORDER.length, rh = l.P ? 15 : 11, ph = n * rh + 24; UI.panel(ctx, l.x, y, l.cw, ph, { head: n + ' EVENTS' });
      MG.EVENT_ORDER.forEach((id, i) => { const yy = y + 19 + i * rh; F.text(ctx, (i + 1) + '. ' + MG.EVENTS[id].name, l.x + 8, yy, C.ink, 1); F.text(ctx, 'BEST ' + MG.pbText(id, D.bests[id]), l.x + l.cw - 8, yy, C.tealD, 1, { align: 'right' }); }); y += ph + 6;
      if (l.cy1 - y > 36) { F.text(ctx, 'POINTS 10 / 8 / 6 / 4 / 2', l.V.W / 2, y, '#fff', 1, { align: 'center', shadow: C.ink }); y += 12;
      F.text(ctx, 'OPPONENTS: ' + ['WEAKER', 'EVEN', 'STRONGER'][this.tier], l.V.W / 2, y, '#bfe6fb', 1, { align: 'center', shadow: C.ink }); y += 12; }
      UI.wrap(this.tier === 0 ? 'WIN GOLD TO REACH THE WORLD CHAMPIONSHIP AND UNLOCK ALPINE PARK' : this.tier === 1 ? 'WIN GOLD TO REACH THE OLYMPIC GAMES' : 'DEFEND YOUR OLYMPIC TITLE', l.cw).forEach((s, i) => F.text(ctx, s, l.V.W / 2, y + i * 10, C.sun, 1, { align: 'center', shadow: C.ink }));
      this.footer.render(ctx);
    }
    onInput(ev) { return this.footer.onInput(ev) || (ev.type === 'down' && ev.act === 'ok' ? (this.game.champStart(), true) : false) || this.common(ev); }
  };

  S.ChampTable = class extends MG.Screen {
    enter() { const g = this.game, c = this.p.champ; this.footer = new UI.Footer(null, [{ label: c.done ? 'FINISH' : 'NEXT EVENT', kind: 'coral', ok: () => g.champNext() }]); MG.Audio.music('menu'); }
    render(ctx) {
      const g = this.game, c = this.p.champ, st = c.standings(), l = UI.L(); g.backdrop.draw(ctx, g.stadiumFor(this.p.cfg), .62);
      let y = head(ctx, c.done ? 'FINAL TABLE' : 'STANDINGS', MG.TIERS[c.tier] + ' CHAMPIONSHIP'); const rh = l.P ? 22 : 17, ph = st.length * rh + 24; UI.panel(ctx, l.x, y, l.cw, ph);
      const n8 = MG.EVENT_ORDER.length, cw = Math.floor((l.cw - 94 - 26) / n8);
      F.text(ctx, 'NAME', l.x + 36, y + 6, C.mute, 1); MG.EVENT_ORDER.forEach((id, i) => F.text(ctx, { sprint: '10', swimming: 'SW', cycling: 'CY', rowing: 'RO', longjump: 'LJ', discus: 'DT', hurdles: 'HU', javelin: 'JT' }[id], l.x + 66 + i * cw + cw / 2, y + 6, C.mute, 1, { align: 'center' })); F.text(ctx, 'PTS', l.x + l.cw - 8, y + 6, C.mute, 1, { align: 'right' });
      st.forEach((r, i) => {
        const yy = y + 17 + i * rh; if (r.human) { ctx.fillStyle = 'rgba(255,201,51,.5)'; ctx.fillRect(l.x + 3, yy - 2, l.cw - 6, rh - 2); } const ty = yy + Math.floor((rh - 9) / 2) - 1;
        F.text(ctx, ordinal(r.rank), l.x + 6, ty + 1, r.rank === 1 ? C.coralD : C.mute, 1); ctx.drawImage(MG.flag(r.country), l.x + 26, ty); F.text(ctx, r.name.slice(0, 3), l.x + 44, ty + 1, r.human ? C.ink : '#3a4468', 1);
        MG.EVENT_ORDER.forEach((id, k) => { const p = r.per[k]; F.text(ctx, p ? '' + p.pts : '-', l.x + 66 + k * cw + cw / 2, ty + 1, p ? C.ink : '#b9b2a0', 1, { align: 'center' }); });
        F.text(ctx, String(r.points), l.x + l.cw - 8, ty + 1, C.tealD, 1, { align: 'right' });
      });
      this.footer.render(ctx);
    }
    onInput(ev) { return this.footer.onInput(ev) || (ev.type === 'down' && ev.act === 'ok' ? (this.game.champNext(), true) : false); }
  };

  /* ============================== MEDAL CEREMONY ============================== */
  S.Ceremony = class extends MG.Screen {
    enter() {
      const c = this.p.champ, st = c.standings(); this.st = st; this.final = c.final; this.bursts = []; this.nb = 0;
      this.conf = Array.from({ length: 70 }, () => ({ x: MG.rnd(0, 400), y: MG.rnd(-200, 0), c: MG.pick(['#ff5050', '#ffe040', '#50c0ff', '#60ff70', '#ff70d0', '#fff']), v: MG.rnd(30, 70), p: MG.rnd(0, 6) }));
      MG.Audio.music('ceremony'); MG.Audio.sfx.fanfare(); MG.Audio.sfx.cheer(3.5, .6); this.game.menuStadium().cheer(1, 20, 30); const g = this.game; this.menu = new UI.Menu([{ label: 'CONTINUE', kind: 'coral', ok: () => g.toMenu() }]);
    }
    update(dt) {
      this.t += dt; this.nb -= dt; const V = MG.view; if (this.nb <= 0) { this.nb = MG.rnd(.35, .8); this.bursts.push({ x: MG.rnd(30, V.W - 30), y: V.top + MG.rnd(24, 80), t: 0, col: MG.pick(['#ff5050', '#ffe040', '#50c0ff', '#60ff70', '#ff70d0']), p: Array.from({ length: 22 }, (_, i) => ({ a: i / 22 * 6.283, s: MG.rnd(18, 42) })) }); if (Math.random() < .5) MG.Audio.sfx.blip(300 + Math.random() * 200); }
      for (const b of this.bursts) b.t += dt; this.bursts = this.bursts.filter(b => b.t < 1.4); for (const c of this.conf) { c.y += c.v * dt; if (c.y > V.H + 4) { c.y = -4; c.x = MG.rnd(0, V.W); } }
    }
    render(ctx) {
      const g = this.game, V = MG.view, l = UI.L(), st = g.menuStadium(), cx = V.W / 2; g.backdrop.draw(ctx, st, .3, true);
      for (const b of this.bursts) for (const p of b.p) { const r = p.s * b.t, x = b.x + Math.cos(p.a) * r, y = b.y + Math.sin(p.a) * r + 18 * b.t * b.t; ctx.globalAlpha = Math.max(0, 1 - b.t / 1.4); ctx.fillStyle = b.col; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); } ctx.globalAlpha = 1;
      const f = this.final, rk = f.rank, base = V.top + (l.P ? 168 : 150);
      const slots = [{ r: 2, x: cx - 52, h: 20, c: '#c8ccd8' }, { r: 1, x: cx, h: 32, c: '#f6d24a' }, { r: 3, x: cx + 52, h: 12, c: '#d68a4a' }];
      for (const s of slots) { const a = this.st[s.r - 1]; if (!a) continue; const rise = Math.min(1, Math.max(0, (this.t - s.r * .35) * 2)), hh = Math.round(s.h * rise);
        ctx.fillStyle = C.ink; ctx.fillRect(s.x - 23, base - hh - 1, 46, hh + 2); ctx.fillStyle = s.c; ctx.fillRect(s.x - 22, base - hh, 44, hh); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(s.x - 22, base - hh, 44, 2); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(s.x + 14, base - hh, 8, hh); if (hh > 8) F.text(ctx, String(s.r), s.x, base - hh + 5, C.ink, 2, { align: 'center' });
        if (rise > .9) { const pal = MG.Sprites.palette(a.country, a.look); MG.Sprites.shadow(ctx, s.x, base - hh - 1, 9); MG.Sprites.athlete(ctx, { pal, pose: s.r === 1 ? 'celebrate' : s.r === 2 ? 'wave' : 'stand', poseT: this.t, sp: 0 }, s.x, base - hh); ctx.drawImage(MG.flag(a.country), s.x - 8, base - hh - 52); MG.Sprites.medal(ctx, medalOf(s.r), s.x, base - hh - 22, .6); F.text(ctx, a.name.slice(0, 7), s.x, base + 5, a.human ? C.sun : '#fff', 1, { align: 'center', shadow: C.ink }); }
      }
      for (const c of this.conf) { ctx.fillStyle = c.c; ctx.fillRect(Math.round(c.x + Math.sin(this.t * 3 + c.p) * 4), Math.round(c.y), 2, 3); }
      UI.title(ctx, rk === 1 ? 'CHAMPION!' : rk <= 3 ? 'ON THE PODIUM!' : 'PLACE ' + ordinal(rk), V.top + 4, { scale: 3, col: rk === 1 ? C.sun : '#fff' });
      F.text(ctx, f.points + ' POINTS - ' + MG.TIERS[f.tier], cx, V.top + 34, '#fff', 1, { align: 'center', shadow: C.ink });
      if (f.unlocked && Math.floor(this.t * 2) % 2) UI.chip(ctx, 'UNLOCKED: ' + f.unlocked, cx, base + 22, C.green);
      if (this.t > 1.5) { this.menu.layout(Math.round(cx - 60), l.fy - 2, 120, l.fh, 4); this.menu.render(ctx, this.t); }
    }
    onInput(ev) { return this.t > 1.5 && this.menu.onInput(ev); }
  };

  /* ============================== PAUSE ============================== */
  S.Pause = class extends MG.Screen {
    enter() { const g = this.game; this.menu = new UI.Menu([{ label: 'RESUME', ok: () => g.resume() }, { label: 'RESTART', kind: 'teal', ok: () => g.restartEvent() }, { label: 'QUIT TO MENU', kind: 'navy', ok: () => g.quitEvent() }]); this.padMode = 'menu'; }
    render(ctx) {
      const V = MG.view, l = UI.L(); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); this.p.under.render(ctx); ctx.fillStyle = 'rgba(10,18,44,.78)'; ctx.fillRect(0, 0, V.W, V.H); ctx.restore();
      const w = Math.min(160, V.W - 24), x = Math.round((V.W - w) / 2), y = Math.round(V.H * (l.P ? .3 : .22)); UI.title(ctx, 'PAUSED', y - 30, { scale: 3, col: '#fff' }); this.menu.layout(x, y, w, 24, 5); this.menu.render(ctx, this.t);
    }
    onInput(ev) { if (ev.type === 'down' && (ev.act === 'back' || ev.act === 'pause')) { this.game.resume(); return true; } return this.menu.onInput(ev); }
  };
})();
