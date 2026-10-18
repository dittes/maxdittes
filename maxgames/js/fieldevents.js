/* MAX GAMES — field events with a run-up: Long Jump and Javelin.  Sprint with alternating taps, press JUMP/THROW to plant
   (hold = steeper angle), launch happens a moment later.  Early take-offs lose the gap to the board / line, crossing it is a foul.
   FieldBase holds what every field event shares: three attempts, AI scores, scoreboard between rounds, ranking. */
'use strict';
MG.FieldBase = class FieldBase extends MG.EventBase {
  constructor(game, cfg, id) {
    super(game, cfg); this.id = id; this.D = MG.DIFFICULTY[cfg.diff]; this.ATT = 3;
    const h = cfg.humans[0]; this.human = new MG.Athlete({ name: h.name || 'YOU', country: h.country, look: h.look, lane: 2, human: true, assist: this.D.assist });
    this.comp = [{ a: this.human, name: this.human.name, country: h.country, look: h.look, human: true, att: [], best: 0 }];
    if (cfg.opponents !== false) {
      const field = cfg.field || MG.makeField(3, [h.country], cfg.diff, cfg.tier || 0), mult = MG.TIER_AI[cfg.tier || 0];
      field.forEach(f => { const att = []; for (let k = 0; k < this.ATT; k++) att.push(this.aiAttempt(f, mult)); this.comp.push({ a: null, name: f.name, country: f.country, look: f.look, human: false, att, best: 0 }); });
    }
    this.round = 0; this.phase = 'intro'; this.phaseT = 0; this.banner = ''; this.bannerCol = '#ffe040'; this.shake = 0; this.flash = 0; this.dist = 0; this.landX = null; this.flag = null; this.revealed = 0;
  }
  get cur() { return this.human; }
  curComp() { return this.comp[0]; }
  aiMid() { return (this.D.ai[0] + this.D.ai[1]) / 2; }
  afterAttempt() { const c = this.curComp(); c.best = Math.max(0, ...c.att); this.round++; this.scoreboard(); }
  scoreboard() {
    for (const c of this.comp) if (!c.human) c.best = Math.max(0, ...c.att.slice(0, this.round));
    this.phase = 'scoreboard'; this.phaseT = 0; this.banner = ''; this.padMode = 'menu'; this.revealed = this.round - 1;
  }
  nextAfterBoard() { if (this.round >= this.ATT) { this.complete(); return; } this.beginAttempt(); }
  ranking() {
    const rows = this.comp.map(c => ({ name: c.name, country: c.country, look: c.look, human: c.human, att: c.att.slice(), best: c.human ? Math.max(0, ...c.att, 0) : Math.max(0, ...c.att.slice(0, Math.max(1, this.round))) }));
    rows.sort((x, y) => (y.best - x.best) || ((y.att.slice().sort((a, b) => b - a)[1] || 0) - (x.att.slice().sort((a, b) => b - a)[1] || 0)));
    rows.forEach((r, i) => r.rank = i + 1); return rows;
  }
  complete() {
    for (const c of this.comp) if (!c.human) c.best = Math.max(0, ...c.att);
    const rows = this.ranking(); this.result = { id: this.id, kind: 'dist', rows, human: rows.find(r => r.human), mode: this.cfg.mode }; this.done = true;
    const r = this.result.human; if (r && r.rank === 1) this.stadium.cheer(1, 6, 10);
  }
  /* what the crowd does after a mark: big distance = cheer + wave */
  crowdReact(good) { this.stadium.cheer(good ? 1 : .45, good ? 5 : 0, good ? 8 : 5); }
  vw() { return MG.view.W / MG.view.k; }
  drawTopBar(ctx, v, mid) {
    const F = MG.Font, a = this.cur, W = MG.W, narrow = W < 316;
    ctx.fillStyle = 'rgba(14,24,56,.66)'; ctx.fillRect(0, 0, W, 14); ctx.fillStyle = '#fff3d6'; ctx.fillRect(0, 14, W, 1);
    ctx.drawImage(MG.flag(a.country), 4, 2); F.text(ctx, narrow ? a.country : a.country + ' ' + a.name, 24, 4, '#fff', 1, { shadow: '#000' });
    MG.HUD.panel(ctx, W / 2 - 40, 0, 80, 16, .78); F.text(ctx, mid, W / 2, 4, '#ffe040', 1, { align: 'center', shadow: '#000' });
    const best = Math.max(0, ...this.curComp().att, 0); F.text(ctx, (narrow ? '' : 'BEST ') + MG.fmtDist(best) + 'M', W - 4, 4, '#fff', 1, { align: 'right', shadow: '#000' });
  }
  drawBoard(ctx) {
    const F = MG.Font, UI = MG.UI, C = UI.C, W = MG.W, H = MG.H, narrow = W < 316, ox = Math.max(0, Math.round((W - 320) / 2));
    ctx.fillStyle = 'rgba(10,18,44,.94)'; ctx.fillRect(0, 0, W, H);
    UI.title(ctx, 'ROUND ' + this.round, 8, { cx: W / 2, scale: 2 });
    const rows = this.ranking(), y0 = 40, rh = narrow ? 19 : 17, x1 = narrow ? 5 : ox + 8, x2 = narrow ? W - 5 : ox + 312;
    F.text(ctx, 'NAME', x1 + 36, y0 - 10, '#8aa0c8', 1); if (!narrow) for (let k = 0; k < this.ATT; k++) F.text(ctx, 'A' + (k + 1), ox + 170 + k * 30, y0 - 10, '#8aa0c8', 1); F.text(ctx, 'BEST', x2 - 4, y0 - 10, '#8aa0c8', 1, { align: 'right' });
    rows.slice(0, 7).forEach((r, i) => {
      const y = y0 + i * rh; ctx.fillStyle = r.human ? 'rgba(255,201,51,.28)' : 'rgba(255,255,255,.08)'; ctx.fillRect(x1, y - 2, x2 - x1, rh - 2);
      F.text(ctx, r.rank + '', x1 + 5, y + 3, i === 0 ? '#ffc933' : '#bfe6fb', 1); ctx.drawImage(MG.flag(r.country), x1 + 17, y + 1); F.text(ctx, r.name.slice(0, narrow ? 9 : 11), x1 + 37, y + 3, r.human ? '#ffc933' : '#fff', 1);
      if (!narrow) for (let k = 0; k < this.ATT; k++) { const v = r.att[k], shown = k < this.round || (r.human && v != null), txt = !shown || v === undefined ? '-' : v === 0 ? 'X' : v.toFixed(2); F.text(ctx, txt, ox + 170 + k * 30, y + 3, v === 0 ? '#ff7a6a' : '#bfe6fb', 1); }
      F.text(ctx, r.best ? r.best.toFixed(2) : '-', x2 - 4, y + 3, '#7dff9a', 1, { align: 'right' });
    });
    const by = Math.min(H - 24, y0 + 7 * rh + 6), r = { x: Math.round(W / 2 - 56), y: by, w: 112, h: 20 };
    this.boardBtn = r; UI.button(ctx, r, this.round >= this.ATT ? 'FINISH' : 'NEXT ROUND', { kind: 'coral', sel: Math.floor(performance.now() / 500) % 2 === 0 && UI.kb.on });
  }
  boardInput(ev) {
    if (this.phaseT < .4) return false;
    if (ev.type === 'down' && (ev.act === 'ok' || ev.act === 'jump')) { this.nextAfterBoard(); return true; }
    if (ev.type === 'pdown') { this.nextAfterBoard(); return true; }
    return false;
  }
};

/* ======================================================================================================= */
MG.LongJumpEvent = class LongJumpEvent extends MG.FieldBase {
  constructor(game, cfg, id = 'longjump') {
    super(game, cfg, id); this.setup(); this.cam = 0; this.camTarget = 0; this.flight = null; this.holdStart = null; this.holdEnd = null; this.angle = 0; this.padMode = 'run+jump'; this.fouled = false; this.dashH = 72; this.hint = 0;
    MG.jumpLabel = MG.EVENTS[id].jump; this.beginAttempt();
  }
  setup() { this.BOARD = 38; this.PIT0 = 39.2; this.PIT1 = 53; this.PLANT = .30; this.A0 = 14; this.A1 = 30; this.G = MG.Physics.G_LJ; this.H0 = 0; this.title = 'LONG JUMP'; }
  aiAttempt(f, mult) { return Math.random() < .09 ? 0 : Math.max(0, +(this.D.ljBase * mult + (f.skill - this.aiMid()) * 3.2 + MG.rnd(-1, 1) * this.D.ljSpread + (Math.random() - .5) * .3).toFixed(2)); }
  launchSpec(v, ang) { const L = MG.Physics.longJumpLaunch(v, ang); return { vx: L.vx, vy: L.vy }; }
  beginAttempt() {
    const a = this.cur; MG.jumpLabel = MG.EVENTS[this.id].jump; a.reset(); a.model.reset(); a.x = 0; a.model.x = 0; a.pose = this.id === 'javelin' ? 'stand' : 'set'; a.poseT = 0; a.y = 0; this.phase = 'intro'; this.phaseT = 0; this.banner = ''; this.landX = null; this.dist = 0; this.fouled = false; this.flag = null; this.flight = null; this.holdStart = null; this.angle = 0; this.padMode = 'run+jump';
    this.rec = []; this.cam = this.camTarget = -(this.vw() * .31 + 14); this.replay = null; this.hint = 0; this.stadium.calm();
  }
  /* ----------------------------------------------------------- simulation */
  update(rawDt) {
    if (this.replay) { this.stepReplay(Math.min(rawDt, .05)); return; }
    this.realFrame = performance.now() / 1000; let rem = Math.min(rawDt, .05); while (rem > 1e-6) { const h = Math.min(rem, 1 / 120); this.step(h); rem -= h; }
    const a = this.cur, vw = this.vw();
    if (['intro', 'ready', 'approach', 'plant'].includes(this.phase)) this.camTarget = Math.max(-(this.cx() + 14), a.x * MG.PPM - this.cx());
    else if (this.phase === 'flight') this.camTarget = Math.max(-(this.cx() + 14), this.px * MG.PPM - vw * .3);
    else if (this.phase === 'land' || this.phase === 'foul') this.camTarget = this.landX != null && !this.fouled ? Math.max(-(this.cx() + 14), this.landCam(vw)) : a.x * MG.PPM - this.cx();
    if (!isFinite(this.camTarget)) this.camTarget = 0; if (!isFinite(this.cam)) this.cam = this.camTarget;
    this.cam += (this.camTarget - this.cam) * Math.min(1, rawDt * (this.phase === 'land' ? 3 : this.phase === 'flight' ? 6 : 14)); this.shake = Math.max(0, this.shake - rawDt);
    if (this.rec.length < 4000 && this.phase !== 'scoreboard') this.rec.push(this.frame());
  }
  edge() { return this.BOARD; }
  landCam(vw) { return ((this.edge() + this.landX) / 2) * MG.PPM - vw / 2; }
  step(h) {
    this.simT += h; this.phaseT += h; const a = this.cur, m = a.model;
    a.poseExtra = this.id === 'javelin' && !['flight', 'land', 'foul'].includes(this.phase) ? 'jav' : '';
    switch (this.phase) {
      case 'intro': if (this.phaseT > 1.3) { this.phase = 'ready'; this.phaseT = 0; MG.Audio.sfx.whistle(); } break;
      case 'ready': a.pose = this.id === 'javelin' ? 'stand' : 'set'; a.poseT = this.simT; break;
      case 'approach': {
        m.update(h, this.simT); a.x = m.x; a.animateRun(h); a.pose = 'run'; a.poseT = a.phase;
        if (a.x + .2 > this.BOARD + .32) this.foul('RAN THROUGH');
        break;
      }
      case 'plant': {
        m.update(h, this.simT); a.x = m.x; a.animateRun(h); a.pose = this.id === 'javelin' ? 'jthrow' : 'run'; a.poseT = this.id === 'javelin' ? Math.min(.5, this.phaseT / this.PLANT * .5) : a.phase;
        if (this.holdStart != null && this.holdEnd == null) this.angle = this.A0 + this.A1 * MG.clamp((this.simT - this.holdStart) / this.PLANT, 0, 1);
        if (this.phaseT >= this.PLANT) this.launch();
        break;
      }
      case 'flight': {
        const f = this.flight; f.t += h; this.flightMove(a, f, h);
        if (f.t >= f.T) this.land();
        break;
      }
      case 'land': case 'foul': if (this.phaseT > 2.4) this.afterAttempt(); break;
    }
    if (this.phase === 'ready' || this.phase === 'approach') this.hint += h;
  }
  flightMove(a, f) { a.x = f.x0 - .2 + f.vx * f.t; a.y = Math.max(0, this.H0 + f.vy * f.t - .5 * this.G * f.t * f.t); a.pose = 'jumpair'; a.poseT = MG.clamp(f.t / f.T, 0, 1); this.px = a.x; }
  afterLand(a) { a.x = this.landX - .2; a.y = 0; a.pose = 'sit'; a.poseT = 0; }
  launch() {
    const a = this.cur, toe = a.x + .2, gap = this.BOARD - toe;
    if (toe > this.BOARD + .3) { this.foul('FOUL!'); return; }
    const v = a.model.v, ang = this.angle || this.A0, L = this.launchSpec(v, ang), T = (L.vy + Math.sqrt(L.vy * L.vy + 2 * this.G * this.H0)) / this.G;
    this.flight = { t: 0, x0: toe, vx: L.vx, vy: L.vy, T, gap, angle: ang, speed: v }; this.px = toe; this.phase = 'flight'; this.phaseT = 0; a.model.air = true; MG.Audio.sfx.jump();
  }
  land() {
    const f = this.flight, a = this.cur; this.landX = f.x0 + f.vx * f.T + .2; this.dist = Math.max(0, this.landX - Math.max(this.BOARD, f.x0)); this.afterLand(a); this.phase = 'land'; this.phaseT = 0;
    this.banner = MG.fmtDist(this.dist) + ' M'; this.bannerCol = '#60ff70'; this.onLand(); this.shake = .2; this.flag = 'white';
    const c = this.curComp(); c.att.push(+this.dist.toFixed(2)); MG.Storage.data.stats.jumps++;
    if (this.dist >= (MG.Storage.data.bests[this.id] || 999)) this.flash = .2;
    const ref = this.id === 'javelin' ? this.D.jvBase : this.D.ljBase; this.crowdReact(this.dist >= ref * .98);
  }
  onLand() { MG.Audio.sfx.sand(); MG.Audio.sfx.cheer(1.6, Math.min(.5, this.dist / 18)); }
  foul(msg) {
    const a = this.cur; this.phase = 'foul'; this.phaseT = 0; this.fouled = true; this.dist = 0; this.landX = a.x; this.banner = msg; this.bannerCol = '#ff4040'; this.flag = 'red'; a.pose = 'dejected'; a.model.coast = true; MG.Audio.sfx.foul(); MG.Audio.sfx.gasp(); this.curComp().att.push(0); this.stadium.cheer(.05, 0, 3);
  }
  /* ----------------------------------------------------------- input */
  onInput(ev) {
    const a = this.cur, m = a.model;
    if (this.phase === 'scoreboard') return this.boardInput(ev);
    if (ev.type === 'up' && ev.act === 'jump' && this.phase === 'plant' && this.holdStart != null && this.holdEnd == null) { this.holdEnd = this.simT; this.angle = this.A0 + this.A1 * MG.clamp((this.holdEnd - this.holdStart) / this.PLANT, 0, 1); return true; }
    if (ev.type !== 'down') return false;
    if (ev.act === 'left' || ev.act === 'right') {
      if (this.phase === 'ready' || this.phase === 'approach') {
        const r = m.tap(ev.act, this.tapTime(ev));
        if (r === 'ok') { if (this.phase === 'ready') { this.phase = 'approach'; this.phaseT = 0; a.started = true; this.banner = ''; } MG.Audio.sfx.step(m.taps & 1); } else if (r === 'same') MG.Audio.sfx.blip(180);
        return true;
      }
    }
    if (ev.act === 'jump' && this.phase === 'approach' && a.x > 1.5) { this.phase = 'plant'; this.phaseT = 0; this.holdStart = this.simT; this.holdEnd = null; this.angle = this.A0; MG.Audio.sfx.blip(520); return true; }
    return false;
  }
  /* ----------------------------------------------------------- rendering */
  frame() {
    const a = this.cur, m = a.model;
    return { cam: this.cam, simT: this.simT, ath: [a.snap()], banner: this.banner, bannerCol: this.bannerCol, landX: this.landX, flag: this.flag, phase: this.phase, hm: { v: m.v, drive: m.drive, cad: m.cad, copt: m.copt, fatigue: m.fatigue, lastSide: m.lastSide, lastWrong: m.lastWrong }, angle: this.angle, dist: this.dist, fl: this.flight ? { t: this.flight.t, T: this.flight.T, x0: this.flight.x0, vx: this.flight.vx, vy: this.flight.vy, angle: this.flight.angle } : null };
  }
  render(ctx) {
    const v = this.replay ? this.rec[this.replay.i] : this.frame(); if (!v) return;
    MG.sceneBegin(ctx, this.stadium);
    ctx.save(); if (this.shake > 0) ctx.translate(Math.round((Math.random() - .5) * 3), Math.round((Math.random() - .5) * 2));
    this.drawScene(ctx, v); ctx.restore();
    if (this.phase === 'scoreboard' && !this.replay) this.drawBoard(ctx); else this.drawHud(ctx, v);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash})`; ctx.fillRect(0, 0, MG.W, MG.H); this.flash = Math.max(0, this.flash - .02); }
    if (this.replay) { MG.Font.text(ctx, 'REPLAY', MG.W - 6, 20, '#ff5050', 2, { align: 'right', shadow: '#000' }); }
    MG.sceneEnd(ctx);
    MG.view.dashH = MG.view.portrait ? this.dashH : 0; if (MG.view.portrait && this.phase !== 'scoreboard') this.drawDash(ctx, v);
  }
  drawField(ctx, v, fy, sx) {
    // sand pit
    const b = sx(this.BOARD), p0 = sx(this.PIT0), p1 = sx(this.PIT1); ctx.fillStyle = '#5a3a22'; ctx.fillRect(p0 - 2, fy - 20, p1 - p0 + 4, 36);
    ctx.fillStyle = '#ecd49c'; ctx.fillRect(p0, fy - 18, p1 - p0, 32); ctx.fillStyle = '#d8ba80'; for (let x = p0; x < p1; x += 4) ctx.fillRect(x, fy - 18 + ((x / 4) & 1) * 2, 1, 32);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 40; i++) { const x = p0 + (i * 37 % Math.max(1, p1 - p0)), y = fy - 17 + (i * 17 % 30); ctx.fillRect(x, y, 1, 1); }
    for (let m = 3; m <= 9; m++) { const x = sx(this.BOARD + m); if (x < -10 || x > MG.W + 10) continue; ctx.fillStyle = '#fff'; ctx.fillRect(x, fy - 22, 1, 4); MG.Font.text(ctx, m, x, fy - 30, '#fff', 1, { align: 'center', shadow: '#000' }); }
    ctx.fillStyle = '#f4f2ea'; ctx.fillRect(b - 1, fy - 12, 4, 20); ctx.fillStyle = '#e07a90'; ctx.fillRect(b + 3, fy - 12, 4, 20);
    for (let m = 0; m <= 40; m += 5) { const x = sx(m); if (x < -10 || x > MG.W + 10) continue; ctx.fillStyle = 'rgba(244,240,228,.6)'; ctx.fillRect(x, fy + 8, 1, 3); MG.Font.text(ctx, this.BOARD - m, x, fy + 12, 'rgba(255,255,255,.7)', 1, { align: 'center' }); }
  }
  drawMark(ctx, v, fy, sx) {
    const b = sx(this.BOARD);
    if (v.landX != null && v.phase !== 'foul') { const lx = sx(v.landX); ctx.fillStyle = '#b09460'; ctx.fillRect(lx - 4, fy + 1, 9, 2); ctx.fillStyle = '#ffe040'; ctx.fillRect(Math.min(b + 4, lx), fy - 20, Math.abs(lx - b - 4), 1); ctx.fillStyle = '#d83030'; ctx.fillRect(lx, fy - 24, 1, 8); ctx.fillRect(lx, fy - 24, 4, 3); }
  }
  drawScene(ctx, v) {
    const st = this.stadium, T = MG.TRACK, cam = v.cam, PPM = MG.PPM, sx = x => Math.round(x * PPM - cam), fy = T.feet(2);
    st.drawBack(ctx, cam, v.simT); st.drawGround(ctx, cam, T.y0, T.y1);
    ctx.fillStyle = 'rgba(244,240,228,.9)'; ctx.fillRect(0, fy - 12, MG.W, 1); ctx.fillRect(0, fy + 7, MG.W, 1);
    this.drawField(ctx, v, fy, sx);
    { const jx = sx(this.BOARD + 2), jy = fy + 14; ctx.fillStyle = '#f4f4f4'; ctx.fillRect(jx - 2, jy - 8, 5, 8); ctx.fillStyle = '#f1c39b'; ctx.fillRect(jx - 1, jy - 12, 3, 4); ctx.fillStyle = '#222'; ctx.fillRect(jx - 1, jy - 12, 3, 1); ctx.fillStyle = '#16213a'; ctx.fillRect(jx - 2, jy, 2, 1); ctx.fillRect(jx + 1, jy, 2, 1);
      if (v.flag) { ctx.fillStyle = '#aaa'; ctx.fillRect(jx + 3, jy - 17, 1, 10); ctx.fillStyle = v.flag === 'red' ? '#e03030' : '#f4f4f4'; ctx.fillRect(jx + 4, jy - 17, 6, 4); } }
    const a0 = v.ath[0]; if ((v.phase === 'approach' || v.phase === 'plant') && this.cfgHelp()) { const px = sx(a0.x + .2 + v.hm.v * this.PLANT * .96); if (px > 0 && px < MG.W) { ctx.fillStyle = Math.floor(performance.now() / 150) % 2 ? '#ffe040' : '#ff9030'; ctx.fillRect(px, fy - 14, 1, 3); ctx.fillRect(px - 1, fy - 15, 3, 1); ctx.fillRect(px - 2, fy - 16, 5, 1); ctx.fillRect(px, fy + 8, 1, 3); } }
    this.drawMark(ctx, v, fy, sx);
    const a = a0, x = sx(a.x), y = fy, lift = Math.round((a.y || 0) * PPM * 1.7); MG.Sprites.shadow(ctx, x, y + 3, 8);
    MG.Sprites.athlete(ctx, a, x, y + 4 - lift); ctx.drawImage(MG.flag(a.country), x - 8, y - 38 - lift);
    this.drawImplement(ctx, v, x, y + 4 - lift, fy, sx, PPM);
  }
  drawImplement() {}
  cfgHelp() { return this.cfg.diff !== 'hard'; }
  drawHud(ctx, v) {
    const H = MG.HUD, F = MG.Font, m = v.hm, W = MG.W, narrow = W < 316, cxm = W / 2, lx = Math.max(8, Math.round((W - 320) / 2) + 8);
    this.drawTopBar(ctx, v, 'ATTEMPT ' + (this.round + 1) + '/' + this.ATT);
    if (!narrow) {
      H.speed(ctx, lx, 160, m.v); H.rhythm(ctx, lx + 104, 160, m, this.simT);
      this.drawInfo(ctx, v, lx + 206, 148, 100);
    }
    if (v.banner) H.banner(ctx, v.banner, 40, v.bannerCol, narrow ? 2 : 3);
    if (this.phase === 'intro') { H.banner(ctx, this.title, 28, '#fff', 2); F.text(ctx, 'ATTEMPT ' + (this.round + 1), cxm, 48, '#ffe040', 1, { align: 'center', shadow: '#000' }); }
    if (this.phase === 'ready' && Math.floor(performance.now() / 300) % 2) F.text(ctx, narrow ? 'TAP L / R TO RUN' : 'TAP LEFT / RIGHT TO RUN', cxm, narrow ? 36 : 28, '#fff', 1, { align: 'center', shadow: '#000' });
    if (this.phase === 'approach' && this.toEdge(v) < 9 && Math.floor(performance.now() / 160) % 2) F.text(ctx, MG.EVENTS[this.id].jump + '!', cxm, narrow ? 34 : 28, '#ff7040', 2, { align: 'center', shadow: '#000' });
  }
  toEdge(v) { return Math.max(0, this.BOARD - (v.ath[0].x + .2)); }
  /* distance-to-board + angle panel */
  drawInfo(ctx, v, px, py, pw) {
    const H = MG.HUD, F = MG.Font, toB = this.toEdge(v);
    H.panel(ctx, px, py, pw, 31, .6); F.text(ctx, this.id === 'javelin' ? 'TO LINE' : 'TO BOARD', px + 6, py + 4, '#bfe6fb', 1); F.text(ctx, toB.toFixed(1) + 'M', px + pw - 6, py + 4, toB < 3 ? '#ff9a30' : '#fff', 1, { align: 'right' });
    F.text(ctx, 'ANGLE', px + 6, py + 16, '#bfe6fb', 1); const ang = v.phase === 'plant' || v.phase === 'flight' || v.phase === 'land' ? (v.angle || (v.fl && v.fl.angle) || 0) : 0, bx = px + 44, bw = pw - 70;
    const g0 = this.goodA ? this.goodA[0] : 22, g1 = this.goodA ? this.goodA[1] : 32, span = this.A1;
    ctx.fillStyle = '#25305a'; ctx.fillRect(bx, py + 16, bw, 6); ctx.fillStyle = '#1e7a3a'; ctx.fillRect(bx + Math.round(bw * (g0 - this.A0) / span), py + 16, Math.round(bw * (g1 - g0) / span), 6);
    if (ang) { ctx.fillStyle = '#ffc933'; ctx.fillRect(bx, py + 17, Math.round(bw * (ang - this.A0) / span) + 1, 4); F.text(ctx, Math.round(ang) + '', px + pw - 6, py + 22, '#fff', 1, { align: 'right' }); }
  }
  drawDash(ctx, v) {
    const V = MG.view, H = MG.HUD, m = v.hm, pw = Math.floor((V.W - 12) / 2), y = V.stripY + 14;
    H.speed(ctx, 8, y, m.v, pw); H.rhythm(ctx, 8 + pw + 3, y, m, this.simT, pw);
    this.drawInfo(ctx, v, 5, V.stripY + 36, V.W - 10);
  }
};

/* ======================================================================================================= */
MG.JavelinEvent = class JavelinEvent extends MG.LongJumpEvent {
  constructor(game, cfg) { super(game, cfg, 'javelin'); }
  setup() { this.BOARD = 32; this.PLANT = .22; this.A0 = 22; this.A1 = 26; this.goodA = [32, 40]; this.G = 9.81; this.H0 = 1.7; this.title = 'JAVELIN'; }
  aiAttempt(f, mult) { return Math.random() < .08 ? 0 : Math.max(0, +(this.D.jvBase * mult + (f.skill - this.aiMid()) * 14 + MG.rnd(-1, 1) * this.D.thSpread).toFixed(2)); }
  launchSpec(v, ang) { const eff = 1 - .0016 * (ang - 36) * (ang - 36), u = (10 + 2.1 * v) * Math.max(.6, eff) * .97, a = ang * Math.PI / 180; return { vx: u * Math.cos(a), vy: u * Math.sin(a) }; }
  flightMove(a, f, h) { a.x += Math.max(0, f.speed * (1 - f.t / .45)) * h * .5; a.y = 0; a.pose = 'jthrow'; a.poseT = .5 + .5 * MG.clamp(f.t / .45, 0, 1); this.px = f.x0 + f.vx * f.t; }
  afterLand(a) { a.y = 0; a.pose = 'jthrow'; a.poseT = 1; }
  landCam(vw) { return this.landX * MG.PPM - vw * .55; }
  onLand() { MG.Audio.sfx.hit(); MG.Audio.sfx.cheer(1.6, Math.min(.5, this.dist / 90)); this.landAng = Math.atan2(-this.flight.vy + this.G * this.flight.T, this.flight.vx); }
  drawField(ctx, v, fy, sx) {
    const b = sx(this.BOARD); ctx.fillStyle = '#3f9f40'; const gx = Math.max(0, b); ctx.fillRect(gx, fy - 24, MG.W - gx + 2, 44);
    ctx.fillStyle = '#348f37'; for (let m = 32; m < 140; m += 6) { const x = sx(m); if (x < -20 || x > MG.W + 20) continue; ctx.fillRect(x, fy - 24, 24, 44); }
    ctx.fillStyle = '#f4f2ea'; ctx.fillRect(b, fy - 24, 2, 44); ctx.fillRect(b - 1, fy - 24, 1, 44);
    for (let d = 10; d <= 110; d += 10) { const x = sx(this.BOARD + d); if (x < -10 || x > MG.W + 10) continue; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x, fy - 24, 1, 44); MG.Font.text(ctx, d, x, fy - 33, '#fff', 1, { align: 'center', shadow: '#000' }); }
    for (let m = 0; m <= 30; m += 5) { const x = sx(m); if (x < -10 || x > MG.W + 10) continue; ctx.fillStyle = 'rgba(244,240,228,.6)'; ctx.fillRect(x, fy + 8, 1, 3); MG.Font.text(ctx, this.BOARD - m, x, fy + 12, 'rgba(255,255,255,.7)', 1, { align: 'center' }); }
  }
  drawMark(ctx, v, fy, sx) {
    if (v.landX == null || v.phase === 'foul') return; const lx = sx(v.landX), b = sx(this.BOARD);
    ctx.fillStyle = '#ffe040'; ctx.fillRect(Math.min(b + 2, lx), fy + 18, Math.abs(lx - b - 2), 1); ctx.fillStyle = '#d83030'; ctx.fillRect(lx, fy - 24, 1, 8); ctx.fillRect(lx, fy - 24, 4, 3);
    const a = this.landAng || 1; ctx.fillStyle = '#16213a'; for (let i = 0; i < 12; i++) ctx.fillRect(Math.round(lx - Math.cos(a) * i) - 1, Math.round(fy + 2 - Math.sin(a) * i) - 1, 3, 3); ctx.fillStyle = '#f4f0e8'; for (let i = 0; i < 12; i++) ctx.fillRect(Math.round(lx - Math.cos(a) * i), Math.round(fy + 2 - Math.sin(a) * i), 1, 1);
  }
  drawImplement(ctx, v, x, y, fy, sx, PPM) {
    const ph = v.phase, a = v.ath[0];
    const spear = (x0, y0, ang, len) => { const dx = Math.cos(ang), dy = Math.sin(ang); ctx.fillStyle = '#16213a'; for (let i = 0; i < len; i++) ctx.fillRect(Math.round(x0 + dx * i) - 1, Math.round(y0 + dy * i) - 1, 3, 3); ctx.fillStyle = '#f4f0e8'; for (let i = 0; i < len; i++) ctx.fillRect(Math.round(x0 + dx * i), Math.round(y0 + dy * i), 1, 1); ctx.fillStyle = '#ff5d4a'; for (let i = len - 3; i < len; i++) ctx.fillRect(Math.round(x0 + dx * i), Math.round(y0 + dy * i), 1, 1); };
    if (ph === 'flight' && v.fl) { const f = v.fl, t = f.t, px = (f.x0 + f.vx * t) * PPM - v.cam, hy = Math.max(0, this.H0 + f.vy * t - .5 * this.G * t * t), vyN = f.vy - this.G * t, ang = Math.atan2(-vyN * .42, f.vx); spear(px - Math.cos(ang) * 13, fy + 3 - Math.round(hy * PPM * .42), ang, 26); }
  }
};
