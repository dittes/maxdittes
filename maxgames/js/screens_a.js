/* MAX GAMES — menu screens: title, main menu, event select, instructions, athlete (country) select, settings, records. */
'use strict';
MG.Screens = MG.Screens || {};
MG.Screen = class Screen {
  constructor(game, p = {}) { this.game = game; this.p = p; this.t = 0; this.padMode = 'menu'; this.pausable = false; }
  enter() {} exit() {}
  update(dt) { this.t += dt; }
  render(ctx) {} onInput(ev) { return false; }
  back() { if (this.p.parent) this.p.parent(); else this.game.toMenu(); }
  common(ev) { if (ev.type === 'down' && ev.act === 'back') { MG.Audio.sfx.back(); this.back(); return true; } return false; }
};
const S = MG.Screens, F = MG.Font, UI = MG.UI, C = UI.C, inR = UI.inR;
const pbText = (id, v) => v == null ? '--' : MG.EVENTS[id].unit === 'time' ? MG.fmtTime(v) + 'S' : MG.fmtDist(v) + 'M';
MG.pbText = pbText;
/* small helper: header block (title + optional sub line); returns y below it */
function head(ctx, text, sub) { const l = UI.L(); let y = UI.title(ctx, text, l.y0 + 2, { scale: l.P ? 2 : 2 }); if (sub) { F.text(ctx, sub, MG.view.W / 2, y, '#fff', 1, { align: 'center', shadow: C.ink }); y += 11; } return y + 2; }

/* ============================== TITLE ============================== */
S.Title = class extends MG.Screen {
  enter() { MG.Audio.music('title'); this.game.backdrop.demo = true; this.game.backdrop.next = this.game.backdrop.t + 3; }
  exit() { this.game.backdrop.demo = false; }
  render(ctx) {
    const g = this.game, t = this.t, V = MG.view, cx = V.W / 2; g.backdrop.draw(ctx, g.menuStadium(), .08);
    const drop = Math.min(1, t / .7), by = drop < 1 ? -Math.round((1 - drop) * (1 - drop) * 140) : Math.round(Math.sin(t * 2) * 1.5), P = V.portrait;
    const ly = Math.round(V.top + (P ? 40 : 10)) + by;
    if (P) { F.text(ctx, 'MAX', cx, ly, C.sun, 6, { align: 'center', shadow: C.coral, outline: C.ink, ext: 1 }); F.text(ctx, 'GAMES', cx, ly + 58, '#fff', 4, { align: 'center', shadow: C.teal, outline: C.ink, ext: 1 }); UI.chip(ctx, 'PIXEL ATHLETICS', cx, ly + 98, C.navy, '#fff'); }
    else { const w1 = F.width('MAX', 5), w2 = F.width('GAMES', 5), tot = w1 + w2 + 14, x0 = cx - tot / 2; F.text(ctx, 'MAX', x0, ly, C.sun, 5, { shadow: C.coral, outline: C.ink, ext: 1 }); F.text(ctx, 'GAMES', x0 + w1 + 14, ly, '#fff', 5, { shadow: C.teal, outline: C.ink, ext: 1 }); UI.chip(ctx, 'PIXEL ATHLETICS', cx, ly + 52, C.navy, '#fff'); }
    const pr = MG.Storage.data.profile, pal = MG.Sprites.palette(pr.country, pr.look);
    if (P) { const fr = MG.Sprites.frame(pal, 'celebrate', t, 0); ctx.drawImage(fr, Math.round(cx - 56), Math.round(V.H * .46), 112, 100); MG.Sprites.shadow(ctx, cx, Math.round(V.H * .46) + 98, 22, .3); }
    else { for (const sx of [.14, .86]) { const fr = MG.Sprites.frame(pal, 'celebrate', t + sx, 0); ctx.drawImage(fr, Math.round(V.W * sx - 28), V.H - 100, 56, 50); } }
    const ch = MG.challenge; if (ch) { const y = P ? Math.round(V.H * .5 - 36) : V.H - 66; UI.panel(ctx, Math.round(cx - 100), y, 200, 26, { fill: C.sun }); F.text(ctx, 'FRIEND CHALLENGE!', cx, y + 4, C.ink, 1, { align: 'center' }); F.text(ctx, 'BEAT ' + (MG.EVENTS[ch.id].unit === 'time' ? MG.fmtTime(ch.val) + 'S' : MG.fmtDist(ch.val) + 'M') + ' IN ' + MG.EVENTS[ch.id].short, cx, y + 14, C.coralD, 1, { align: 'center' }); }
    const blink = Math.floor(t * 2) % 2 === 0, r = { x: Math.round(cx - 70), y: V.H - (P ? 70 : 38), w: 140, h: 24 }; UI.button(ctx, r, 'TAP TO START', { kind: 'coral', scale: 1, sel: blink });
  }
  onInput(ev) { if (ev.type === 'down' || ev.type === 'pdown') { if (ev.act === 'back' || ev.act === 'pause') return false; MG.Audio.init(); MG.Audio.sfx.select(); MG.Audio.music('menu'); this.game.toMenu(); return true; } return false; }
};

/* ============================== MAIN MENU ============================== */
function athleteCard(ctx, x, y, w, h, t, o = {}) {
  const D = MG.Storage.data, pr = D.profile, c = MG.country(pr.country), pal = MG.Sprites.palette(pr.country, pr.look);
  UI.panel(ctx, x, y, w, h, { head: 'MY ATHLETE' }); ctx.drawImage(MG.flag(pr.country), x + 8, y + 20, 32, 20); F.text(ctx, c.name.slice(0, 11), x + 8, y + 45, C.ink, 1);
  F.text(ctx, MG.DIFFICULTY[D.settings.difficulty].name, x + 8, y + 57, C.tealD, 1); F.text(ctx, MG.STADIUMS.find(s => s.id === D.settings.stadium).name.slice(0, 12), x + 8, y + 67, C.mute, 1);
  const fr = MG.Sprites.frame(pal, 'run', (t * 2.4) % 1, .8); ctx.drawImage(fr, Math.round(x + w - 64), y + h - 52, 56, 50);
}
S.MainMenu = class extends MG.Screen {
  enter() {
    const g = this.game, D = MG.Storage.data; MG.Audio.music('menu');
    const need = next => () => { if (!D.profile.chosen) g.go(new S.Country(g, { first: true, done: next })); else next(); };
    const items = [];
    if (MG.challenge) items.push({ label: 'ACCEPT CHALLENGE', kind: 'sun', ok: need(() => g.flowSingle('quick', MG.challenge.id, MG.challenge)) });
    items.push({ label: 'QUICK PLAY', ok: need(() => g.go(new S.EventSelect(g, { mode: 'quick' }))) }, { label: 'CHAMPIONSHIP', kind: 'teal', ok: need(() => g.go(new S.ChampIntro(g))) }, { label: 'PRACTICE', kind: 'teal', ok: need(() => g.go(new S.EventSelect(g, { mode: 'practice' }))) },
      { label: 'MY ATHLETE', kind: 'navy', ok: () => g.go(new S.Country(g, {})) }, { label: 'RECORDS', kind: 'navy', ok: () => g.go(new S.Records(g)) }, { label: 'SETTINGS', kind: 'navy', ok: () => g.go(new S.Settings(g)) });
    this.menu = new UI.Menu(items); this.footer = new UI.Footer(() => g.go(new S.Title(g)));
  }
  render(ctx) {
    const g = this.game, l = UI.L(), V = l.V; g.backdrop.draw(ctx, g.menuStadium(), .42); const n = this.menu.items.length;
    if (l.P) {
      let y = UI.title(ctx, 'MAX GAMES', l.y0 + 2, { scale: 3, col: C.sun }) + 2; const ch = 88; athleteCard(ctx, l.x, y, l.cw, ch, this.t); y += ch + 8;
      const bh = Math.min(30, Math.floor((l.cy1 - y - (n - 1) * 6) / n)); this.menu.layout(l.x, y, l.cw, bh, 6);
    } else {
      const y = UI.title(ctx, 'MAX GAMES', l.y0, { scale: 2, col: C.sun }) + 2, bw = 150, bh = Math.min(22, Math.floor((l.cy1 - y - (n - 1) * 3) / n));
      this.menu.layout(l.x, y, bw, bh, 3); athleteCard(ctx, l.x + bw + 10, y, l.cw - bw - 10, Math.min(this.menu.bottom - y, 126), this.t);
    }
    this.menu.render(ctx, this.t); this.footer.render(ctx);
  }
  onInput(ev) { return this.footer.onInput(ev) || this.menu.onInput(ev) || this.common(ev); }
  back() { this.game.go(new S.Title(this.game)); }
};

/* ============================== EVENT SELECT ============================== */
S.EventSelect = class extends MG.Screen {
  enter() { this.sel = 0; this.ids = MG.EVENT_ORDER; this.rects = []; this.diffRect = null; this.footer = new UI.Footer(() => this.game.toMenu()); }
  start(i) { MG.Audio.sfx.select(); this.game.flowSingle(this.p.mode, this.ids[i]); }
  cycleDiff(d) { const keys = Object.keys(MG.DIFFICULTY), s = MG.Storage.data.settings; s.difficulty = keys[(keys.indexOf(s.difficulty) + d + keys.length) % keys.length]; MG.Storage.save(); MG.Audio.sfx.move(); }
  render(ctx) {
    const g = this.game, D = MG.Storage.data, l = UI.L(); g.backdrop.draw(ctx, g.menuStadium(), .5);
    const y0 = head(ctx, this.p.mode === 'practice' ? 'PRACTICE' : 'CHOOSE EVENT', this.p.mode === 'practice' ? 'JUST YOU ON THE TRACK' : 'TAP AN EVENT TO PLAY');
    const n = this.ids.length, cols = l.P ? 1 : 3, rows = Math.ceil(n / cols), gap = 4, dh = 20, area = l.cy1 - y0 - dh - 6, ch = Math.min(l.P ? 70 : 62, Math.floor((area - (rows - 1) * gap) / rows)), cw = Math.floor((l.cw - (cols - 1) * gap) / cols);
    this.rects = []; this.cols = cols;
    this.ids.forEach((id, i) => {
      const col = i % cols, row = Math.floor(i / cols), x = l.x + col * (cw + gap), y = y0 + row * (ch + gap), sel = UI.kb.on && this.sel === i, ev = MG.EVENTS[id], r = { x, y, w: cw, h: ch }; this.rects.push(r);
      if (sel) UI.rr(ctx, C.sun, x - 2, y - 2, cw + 4, ch + 4); UI.panel(ctx, x, y, cw, ch, { fill: sel ? '#fff8e0' : C.cream });
      const pb = D.bests[id];
      if (l.P && ch < 46) {
        const ph = ch - 8, pw = Math.floor(ph * 1.7); UI.preview(ctx, id, x + 4, y + 4, pw, ph, this.t); if (ch < 34) { const ty = y + Math.floor((ch - 7) / 2) - 1; F.text(ctx, ev.name, x + pw + 10, ty, C.ink, 1); F.text(ctx, pbText(id, pb), x + cw - 8, ty, C.tealD, 1, { align: 'right' }); } else { F.text(ctx, ev.name, x + pw + 10, y + Math.floor(ch / 2) - 9, C.ink, 1); F.text(ctx, 'BEST ' + pbText(id, pb), x + pw + 10, y + Math.floor(ch / 2) + 1, C.tealD, 1); }
      } else if (l.P) {
        const pw = 70, ph = ch - 10; UI.preview(ctx, id, x + 5, y + 5, pw, ph, this.t); F.text(ctx, ev.name, x + pw + 12, y + 7, C.ink, 1);
        UI.wrap(ev.desc, cw - pw - 20).slice(0, ch < 56 ? 1 : 3).forEach((s, k) => F.text(ctx, s, x + pw + 12, y + 18 + k * 9, C.mute, 1)); F.text(ctx, 'BEST ' + pbText(id, pb), x + pw + 12, y + ch - 13, C.tealD, 1);
      } else {
        const pw = cw - 8, ph = Math.max(20, ch - 30); UI.preview(ctx, id, x + 4, y + 4, pw, ph, this.t); F.text(ctx, ev.name, x + cw / 2, y + ph + 8, C.ink, 1, { align: 'center' }); F.text(ctx, 'BEST ' + pbText(id, pb), x + cw / 2, y + ph + 18, C.tealD, 1, { align: 'center' });
      }
    });
    const dy = l.cy1 - dh, dr = { x: l.x, y: dy, w: l.cw, h: dh }; this.diffRect = dr; const sel = UI.kb.on && this.sel === n;
    UI.button(ctx, dr, null, { kind: 'neutral', sel: false }); if (sel) { ctx.fillStyle = C.sun; ctx.fillRect(dr.x - 1, dr.y + 3, 1, dr.h - 7); ctx.fillRect(dr.x + dr.w, dr.y + 3, 1, dr.h - 7); ctx.fillRect(dr.x + 2, dr.y - 1, dr.w - 4, 1); }
    F.text(ctx, 'LEVEL', dr.x + 8, dy + 6, C.ink, 1); F.text(ctx, '{', dr.x + dr.w - 80, dy + 6, C.coralD, 1); F.text(ctx, MG.DIFFICULTY[D.settings.difficulty].name, dr.x + dr.w - 44, dy + 6, C.tealD, 1, { align: 'center' }); F.text(ctx, '}', dr.x + dr.w - 14, dy + 6, C.coralD, 1);
    this.footer.render(ctx);
  }
  onInput(ev) {
    if (this.footer.onInput(ev)) return true; const n = this.ids.length;
    if (ev.type === 'down') {
      UI.kb.on = true; const c = this.cols || 1;
      if (this.sel === n) { if (ev.act === 'left') { this.cycleDiff(-1); return true; } if (ev.act === 'right' || ev.act === 'ok') { this.cycleDiff(1); return true; } if (ev.act === 'up') { this.sel = n - 1; MG.Audio.sfx.move(); return true; } }
      else {
        if (ev.act === 'left') { this.sel = Math.max(0, this.sel - 1); MG.Audio.sfx.move(); return true; } if (ev.act === 'right') { this.sel = Math.min(n - 1, this.sel + 1); MG.Audio.sfx.move(); return true; }
        if (ev.act === 'up') { this.sel = Math.max(0, this.sel - c); MG.Audio.sfx.move(); return true; } if (ev.act === 'down') { this.sel = this.sel + c >= n ? n : this.sel + c; MG.Audio.sfx.move(); return true; }
        if (ev.act === 'ok') { this.start(this.sel); return true; }
      }
    }
    if (ev.type === 'pdown') {
      const i = this.rects.findIndex(r => inR(r, ev.x, ev.y)); if (i >= 0) { this.sel = i; this.start(i); return true; }
      const d = this.diffRect; if (d && inR(d, ev.x, ev.y)) { this.cycleDiff(ev.x < d.x + d.w * .55 ? -1 : 1); return true; }
    }
    if (ev.type === 'pmove' && UI.kb.on) { const i = this.rects.findIndex(r => inR(r, ev.x, ev.y)); if (i >= 0) this.sel = i; }
    return this.common(ev);
  }
};

/* ============================== INSTRUCTIONS ============================== */
S.Instructions = class extends MG.Screen {
  enter() {
    MG.Audio.music('menu'); const p = this.p; this.footer = new UI.Footer(() => this.back(), [{ label: 'START', kind: 'coral', ok: () => p.onStart() }]);
  }
  render(ctx) {
    const g = this.game, cfg = this.p.cfg, ev = MG.EVENTS[cfg.id], l = UI.L(), touch = matchMedia('(pointer:coarse)').matches; g.backdrop.draw(ctx, g.stadiumFor(cfg), .55);
    const sub = cfg.mode === 'champ' ? MG.TIERS[cfg.tier] + ' - EVENT ' + (this.p.index + 1) + '/' + MG.EVENT_ORDER.length : cfg.mode === 'practice' ? 'PRACTICE' : cfg.challenge ? 'FRIEND CHALLENGE' : 'QUICK PLAY';
    let y = head(ctx, ev.name, sub);
    const L = {
      sprint: ['TAP LEFT AND RIGHT ALTERNATELY - FAST AND STEADY.', 'THE SAME SIDE TWICE GIVES NO SPEED.', 'KEEP THE RHYTHM BAR IN THE GREEN.', 'MOVING BEFORE THE GUN IS A FALSE START.'],
      longjump: ['TAP LEFT AND RIGHT TO RUN UP.', 'PRESS JUMP ABOUT 3 METRES BEFORE THE BOARD.', 'HOLD JUMP FOR A STEEPER ANGLE (BEST ABOUT 27).', 'CROSSING THE BOARD IS A FOUL. 3 ATTEMPTS.'],
      discus: ['TAP LEFT AND RIGHT TO SPIN UP - FASTER TAPS GIVE MORE POWER.', 'THE NEEDLE TURNS FASTER AS YOU SPIN.', 'PRESS THROW WHEN THE NEEDLE IS IN THE GREEN.', 'TOO FAR OFF AND THE DISC HITS THE CAGE. 3 ATTEMPTS.'],
      hurdles: ['TAP LEFT AND RIGHT TO SPRINT.', 'PRESS JUMP ABOUT 3 METRES BEFORE EACH HURDLE.', 'A HIT COSTS SPEED - KEEP TAPPING TO RECOVER.', 'TEN HURDLES, FINISH AT 110 METRES.'],
      swimming: ['TAP LEFT AND RIGHT IN STROKE RHYTHM.', 'STEADY TAPS BEAT PANICKY BUTTON MASHING.', 'KEEP THE RHYTHM BAR IN THE GREEN.', 'MOVING BEFORE THE HORN IS A FALSE START.'],
      cycling: ['TAP LEFT AND RIGHT TO PEDAL.', 'BUILD UP SPEED - THE FASTER YOU TAP, THE FASTER YOU ROLL.', 'KEEP THE RHYTHM BAR IN THE GREEN.', 'MOVING BEFORE THE GUN IS A FALSE START.'],
      rowing: ['TAP LEFT AND RIGHT FOR EVERY STROKE.', 'SMOOTH, EVEN STROKES KEEP THE BOAT GLIDING.', 'KEEP THE RHYTHM BAR IN THE GREEN.', 'MOVING BEFORE THE HORN IS A FALSE START.'],
      javelin: ['TAP LEFT AND RIGHT TO RUN UP.', 'PRESS THROW A LITTLE BEFORE THE LINE.', 'HOLD THROW FOR A HIGHER ANGLE (BEST ABOUT 36).', 'CROSSING THE LINE IS A FOUL. 3 ATTEMPTS.'],
    }[cfg.id];
    const lines = []; for (const t of L) { const w = UI.wrap(t, l.cw - 22); w.forEach((s, i) => lines.push({ s, first: i === 0 })); }
    const ph = lines.length * 10 + 16; UI.panel(ctx, l.x, y, l.cw, ph); let ly = y + 8; for (const ln of lines) { if (ln.first) { ctx.fillStyle = C.coral; ctx.fillRect(l.x + 7, ly + 2, 3, 3); } F.text(ctx, ln.s, l.x + 14, ly, C.ink, 1); ly += 10; }
    y += ph + 8;
    // key caps / buttons demo
    const ph2 = Math.floor(this.t * 4) % 2, jump = ev.jump, ky = y; UI.panel(ctx, l.x, ky, l.cw, 40, { fill: C.cream2 });
    const kc = (lab, x, w, down) => UI.button(ctx, { x, y: ky + 8, w, h: 18 }, lab, { kind: down ? 'sun' : 'neutral', press: down });
    if (!touch) { kc('{', l.x + 10, 24, ph2 === 0); kc('}', l.x + 38, 24, ph2 === 1); F.text(ctx, 'ARROWS / A D', l.x + 10, ky + 30, C.mute, 1); if (jump) { kc('SPACE', l.x + l.cw - 64, 54, Math.floor(this.t * 1.5) % 2 === 0); F.text(ctx, jump, l.x + l.cw - 37, ky + 30, C.mute, 1, { align: 'center' }); } }
    else { kc('L', l.x + 10, 24, ph2 === 0); kc('R', l.x + 38, 24, ph2 === 1); F.text(ctx, 'BIG BUTTONS', l.x + 10, ky + 30, C.mute, 1); if (jump) { kc(jump, l.x + l.cw - 62, 52, Math.floor(this.t * 1.5) % 2 === 0); } }
    y += 48;
    F.text(ctx, 'LEVEL: ' + MG.DIFFICULTY[cfg.diff].name, l.x + l.cw / 2, y, '#fff', 1, { align: 'center', shadow: C.ink });
    if (cfg.challenge) { const ch = cfg.challenge; UI.chip(ctx, 'BEAT ' + (MG.EVENTS[ch.id].unit === 'time' ? MG.fmtTime(ch.val) + 'S' : MG.fmtDist(ch.val) + 'M'), l.V.W / 2, y + 12, C.coral); }
    const pal = MG.Sprites.palette(cfg.humans[0].country, cfg.humans[0].look); if (l.cy1 - y > 100) { MG.Sprites.shadow(ctx, l.V.W / 2, Math.round((y + l.cy1) / 2) + 40, 12); MG.Sprites.athlete(ctx, { pal, pose: 'celebrate', poseT: this.t, sp: 0 }, l.V.W / 2, Math.round((y + l.cy1) / 2) + 40); }
    this.footer.render(ctx);
  }
  onInput(ev) { if (this.footer.onInput(ev)) return true; if (ev.type === 'down' && ev.act === 'ok') { MG.Audio.sfx.select(); this.p.onStart(); return true; } return this.common(ev); }
};

/* ============================== ATHLETE / COUNTRY ============================== */
S.Country = class extends MG.Screen {
  enter() {
    const pr = MG.Storage.data.profile; this.cur = Math.max(0, MG.COUNTRIES.findIndex(c => c.code === pr.country)); this.look = pr.look; this.focus = 'flags'; this.rects = []; this.lookRects = [];
    this.footer = new UI.Footer(() => this.p.first ? this.game.toMenu() : this.back(), [{ label: this.p.first ? 'CONTINUE' : 'CONFIRM', kind: 'coral', ok: () => this.commit() }]);
  }
  commit() { const pr = MG.Storage.data.profile; pr.country = MG.COUNTRIES[this.cur].code; pr.look = this.look; pr.chosen = true; MG.Storage.save(); MG.Audio.sfx.select(); if (this.p.done) this.p.done(); else this.game.toMenu(); }
  preview(ctx, x, y, w, h) {
    const c = MG.COUNTRIES[this.cur], pal = MG.Sprites.palette(c.code, this.look); UI.panel(ctx, x, y, w, h, { head: c.name.slice(0, 16) });
    ctx.drawImage(MG.flag(c.code), x + 6, y + 19, 32, 20); F.text(ctx, c.code, x + 44, y + 25, C.coralD, 1);
    const fr = MG.Sprites.frame(pal, 'run', (this.t * 2.4) % 1, .85); ctx.drawImage(fr, Math.round(x + w - 62), y + h - 54, 56, 50);
  }
  render(ctx) {
    const g = this.game, l = UI.L(), n = MG.COUNTRIES.length; g.backdrop.draw(ctx, g.menuStadium(), .55); let y = head(ctx, this.p.first ? 'PICK YOUR TEAM' : 'MY ATHLETE');
    const cols = 4, gap = 3; this.rects = []; this.lookRects = [];
    if (l.P) {
      this.preview(ctx, l.x, y, l.cw, 66); y += 72;
      const tw = Math.floor((l.cw - gap * 3) / 4), th = Math.min(40, Math.floor((l.cy1 - y - 44 - 3 * gap) / 4));
      MG.COUNTRIES.forEach((c, i) => this.tile(ctx, c, i, l.x + (i % cols) * (tw + gap), y + Math.floor(i / cols) * (th + gap), tw, th)); y += 4 * (th + gap) + 4;
      this.looks(ctx, l.x, y, l.cw);
    } else {
      const gw = 188, tw = Math.floor((gw - gap * 3) / 4), th = Math.min(28, Math.floor((l.cy1 - y - 24 - 3 * gap) / 4));
      MG.COUNTRIES.forEach((c, i) => this.tile(ctx, c, i, l.x + (i % cols) * (tw + gap), y + Math.floor(i / cols) * (th + gap), tw, th)); const ly = y + 4 * (th + gap) + 2;
      this.looks(ctx, l.x, ly, gw); this.preview(ctx, l.x + gw + 8, y, l.cw - gw - 8, Math.min(120, l.cy1 - y));
    }
    this.footer.render(ctx);
  }
  tile(ctx, c, i, x, y, w, h) {
    const sel = i === this.cur; this.rects.push({ x, y, w, h }); UI.button(ctx, { x, y, w, h }, null, { kind: sel ? 'sun' : 'neutral', sel: sel && this.focus === 'flags' && UI.kb.on });
    const fh = h - 3, small = fh < 34; ctx.drawImage(MG.flag(c.code), Math.round(x + (w - (small ? 16 : 32)) / 2), y + 4, small ? 16 : 32, small ? 10 : 20); F.text(ctx, c.code, x + w / 2, y + 4 + (small ? 12 : 23), C.ink, 1, { align: 'center' });
  }
  looks(ctx, x, y, w) {
    F.text(ctx, 'LOOK', x + 2, y + 7, '#fff', 1, { shadow: C.ink }); const n = MG.LOOKS.length, sw = Math.floor((w - 38) / n), h = 22;
    MG.LOOKS.forEach((lk, i) => { const bx = x + 36 + i * sw, sel = i === this.look, r = { x: bx, y, w: sw - 2, h }; this.lookRects.push(r); UI.button(ctx, r, null, { kind: sel ? 'sun' : 'neutral', sel: sel && this.focus === 'looks' && UI.kb.on }); const cx = bx + (sw - 2) / 2; ctx.fillStyle = lk.skin; ctx.fillRect(cx - 4, y + 7, 8, 8); ctx.fillStyle = lk.hair; ctx.fillRect(cx - 5, y + 4, 10, 4); if (lk.style === 1) ctx.fillRect(cx - 6, y + 5, 12, 5); if (lk.style === 2) ctx.fillRect(cx - 5, y + 7, 2, 9); ctx.fillStyle = C.ink; ctx.fillRect(cx + 1, y + 10, 1, 1); });
  }
  onInput(ev) {
    if (this.footer.onInput(ev)) return true;
    if (ev.type === 'down') {
      const n = MG.COUNTRIES.length; UI.kb.on = true;
      if (this.focus === 'flags') {
        if (ev.act === 'left') { this.cur = (this.cur + n - 1) % n; MG.Audio.sfx.move(); return true; } if (ev.act === 'right') { this.cur = (this.cur + 1) % n; MG.Audio.sfx.move(); return true; }
        if (ev.act === 'up') { this.cur = (this.cur + n - 4) % n; MG.Audio.sfx.move(); return true; }
        if (ev.act === 'down') { if (this.cur >= n - 4) { this.focus = 'looks'; MG.Audio.sfx.move(); } else { this.cur += 4; MG.Audio.sfx.move(); } return true; }
      } else {
        if (ev.act === 'left') { this.look = (this.look + MG.LOOKS.length - 1) % MG.LOOKS.length; MG.Audio.sfx.move(); return true; } if (ev.act === 'right') { this.look = (this.look + 1) % MG.LOOKS.length; MG.Audio.sfx.move(); return true; }
        if (ev.act === 'up') { this.focus = 'flags'; MG.Audio.sfx.move(); return true; }
      }
      if (ev.act === 'ok') { this.commit(); return true; }
    }
    if (ev.type === 'pdown') {
      const i = this.rects.findIndex(r => inR(r, ev.x, ev.y)); if (i >= 0) { this.cur = i; this.focus = 'flags'; MG.Audio.sfx.move(); return true; }
      const j = this.lookRects.findIndex(r => inR(r, ev.x, ev.y)); if (j >= 0) { this.look = j; this.focus = 'looks'; MG.Audio.sfx.move(); return true; }
    }
    return this.common(ev);
  }
};

/* ============================== SETTINGS ============================== */
S.Settings = class extends MG.Screen {
  enter() {
    const g = this.game, st = MG.Storage.data.settings, keys = Object.keys(MG.DIFFICULTY); this.confirm = 0;
    const save = () => { MG.Storage.save(); MG.Audio.refresh(); }, tog = k => () => { st[k] = !st[k]; save(); if (k === 'sfx' && st.sfx) MG.Audio.sfx.select(); };
    const stad = d => { const un = MG.STADIUMS.filter(s => MG.Storage.stadiumUnlocked(s.id)); const i = un.findIndex(s => s.id === st.stadium); st.stadium = un[(i + d + un.length) % un.length].id; save(); };
    const dif = d => () => { st.difficulty = keys[(keys.indexOf(st.difficulty) + d + keys.length) % keys.length]; save(); };
    this.menu = new UI.Menu([
      { label: 'SOUND FX', value: () => st.sfx ? 'ON' : 'OFF', good: st.sfx, left: tog('sfx'), right: tog('sfx'), ok: tog('sfx') },
      { label: 'MUSIC', value: () => st.music ? 'ON' : 'OFF', left: tog('music'), right: tog('music'), ok: tog('music') },
      { label: 'LEVEL', value: () => MG.DIFFICULTY[st.difficulty].name, left: dif(-1), right: dif(1), ok: dif(1) },
      { label: 'STADIUM', value: () => MG.STADIUMS.find(s => s.id === st.stadium).name.slice(0, 12), left: () => stad(-1), right: () => stad(1), ok: () => stad(1) },
      { label: () => this.confirm > 0 ? 'SURE? TAP AGAIN' : 'RESET ALL DATA', kind: 'coral', ok: () => { if (this.confirm > 0) { MG.Storage.reset(); this.confirm = 0; MG.Audio.refresh(); this.enter(); } else this.confirm = 3; } },
    ]);
    this.footer = new UI.Footer(() => g.toMenu());
  }
  update(dt) { this.t += dt; if (this.confirm > 0) this.confirm = Math.max(0, this.confirm - dt); }
  render(ctx) {
    const g = this.game, l = UI.L(), D = MG.Storage.data; g.backdrop.draw(ctx, g.menuStadium(), .5); let y = head(ctx, 'SETTINGS');
    const ph = MG.STADIUMS.length * 11 + 18;
    if (l.P) { this.menu.layout(l.x, y, l.cw, 24, 4); this.menu.render(ctx, this.t); this.stadiumList(ctx, l.x, this.menu.bottom + 10, l.cw, ph); }
    else { const mw = 170; this.menu.layout(l.x, y, mw, 22, 4); this.menu.render(ctx, this.t); this.stadiumList(ctx, l.x + mw + 8, y, l.cw - mw - 8, Math.min(ph, l.cy1 - y)); }
    this.footer.render(ctx);
  }
  stadiumList(ctx, x, y, w, h) {
    UI.panel(ctx, x, y, w, h, { head: 'STADIUMS' }); const cur = MG.Storage.data.settings.stadium;
    MG.STADIUMS.forEach((s, i) => { const un = MG.Storage.stadiumUnlocked(s.id), yy = y + 18 + i * 11; ctx.fillStyle = un ? (s.id === cur ? C.coral : C.teal) : C.mute; ctx.fillRect(x + 7, yy + 1, 5, 5); F.text(ctx, s.name.slice(0, w < 130 ? 10 : 14), x + 16, yy, un ? C.ink : C.mute, 1); if (!un && w > 150) F.text(ctx, s.how, x + w - 6, yy, C.coralD, 1, { align: 'right' }); else if (!un) F.text(ctx, 'LOCKED', x + w - 6, yy, C.coralD, 1, { align: 'right' }); });
  }
  onInput(ev) { return this.footer.onInput(ev) || this.menu.onInput(ev) || this.common(ev); }
};

/* ============================== RECORDS ============================== */
S.Records = class extends MG.Screen {
  enter() { this.footer = new UI.Footer(() => this.game.toMenu()); }
  render(ctx) {
    let l = UI.L(); const g = this.game, D = MG.Storage.data; g.backdrop.draw(ctx, g.menuStadium(), .55); let y = head(ctx, 'RECORDS');
    const two = !l.P, cwL = two ? Math.floor((l.cw - 8) / 2) : l.cw, rx = two ? l.x + cwL + 8 : l.x, y00 = y, pbH = MG.EVENT_ORDER.length * (two ? 11 : 13) + 22; UI.panel(ctx, l.x, y, cwL, pbH, { head: 'PERSONAL BESTS' });
    MG.EVENT_ORDER.forEach((id, i) => { const yy = y + 19 + i * (two ? 11 : 13); F.text(ctx, MG.EVENTS[id].name, l.x + 8, yy, C.ink, 1); F.text(ctx, pbText(id, D.bests[id]), l.x + cwL - 8, yy, D.bests[id] == null ? C.mute : C.tealD, 1, { align: 'right' }); }); if (two) y = y00; else y += pbH + 6;
    const l0 = l; l = Object.assign({}, l, { x: rx, cw: two ? l.cw - cwL - 8 : l.cw });
    const mh = 58; UI.panel(ctx, l.x, y, l.cw, mh, { head: 'CHAMPIONSHIP' });
    ['gold', 'silver', 'bronze'].forEach((m, i) => { const mx = l.x + l.cw * (.2 + i * .3); MG.Sprites.medal(ctx, m, mx - 8, y + 31, 1.1); F.text(ctx, 'x' + D.champ[m], mx + 6, y + 27, C.ink, 1); });
    F.text(ctx, 'BEST ' + D.champ.best + ' PTS', l.x + 8, y + 46, C.mute, 1); F.text(ctx, 'PLAYED ' + D.champ.played, l.x + l.cw - 8, y + 46, C.mute, 1, { align: 'right' }); y += mh + 6;
    const tw = Math.floor((l.cw - 8) / 3); MG.TIERS.forEach((t, i) => { const ok = D.champ.cleared[i], x = l.x + i * (tw + 4); UI.panel(ctx, x, y, tw, 34, { fill: ok ? '#d6f6df' : C.cream }); F.text(ctx, t.slice(0, 8), x + tw / 2, y + 7, ok ? C.tealD : C.mute, 1, { align: 'center' }); F.text(ctx, ok ? 'CLEARED' : 'WIN GOLD', x + tw / 2, y + 20, ok ? C.green : C.coralD, 1, { align: 'center' }); }); y += 42;
    F.text(ctx, 'WINS ' + D.stats.wins + '  SHARES ' + D.stats.shares, l.x + l.cw / 2, y, '#fff', 1, { align: 'center', shadow: C.ink });
    if (l.cy1 - y > 24) F.text(ctx, 'TAPS ' + D.stats.tapsTotal + '  FALSE ' + D.stats.falseStarts, l.x + l.cw / 2, y + 11, '#fff', 1, { align: 'center', shadow: C.ink });
    this.footer.render(ctx);
  }
  onInput(ev) { return this.footer.onInput(ev) || this.common(ev); }
};
