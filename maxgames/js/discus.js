/* MAX GAMES — Discus Throw.  Tap LEFT / RIGHT alternately to spin up (cadence = power), the dial needle turns faster the
   harder you tap.  Press THROW when the needle crosses the green sector.  Three attempts, best counts. */
'use strict';
MG.DiscusEvent = class DiscusEvent extends MG.FieldBase {
  constructor(game, cfg) {
    super(game, cfg, 'discus'); this.G = 9.81; this.ANG = 34; this.H0 = 1.5; this.X0 = .8; this.dashH = 36; this.theta = 0; this.px = 0; this.camTarget = 0; this.cam = 0; this.hint = 0; this.title = 'DISCUS THROW';
    MG.jumpLabel = 'THROW'; this.beginAttempt();
  }
  aiAttempt(f, mult) { return Math.random() < .08 ? 0 : Math.max(0, +(this.D.dcBase * mult + (f.skill - this.aiMid()) * 12 + MG.rnd(-1, 1) * this.D.thSpread).toFixed(2)); }
  half() { return .5 * this.D.window; }
  beginAttempt() {
    const a = this.cur; MG.jumpLabel = 'THROW'; a.reset(); a.model.reset(); a.x = 0; a.model.x = 0; a.pose = 'stand'; a.poseT = 0; a.y = 0; a.sp = 0; this.phase = 'intro'; this.phaseT = 0; this.banner = ''; this.landX = null; this.dist = 0; this.flag = null; this.flight = null; this.theta = 0; this.release = null; this.fouled = false;
    this.padMode = 'run+jump'; this.rec = []; this.replay = null; this.hint = 0; this.cam = this.camTarget = -this.vw() * .24; this.stadium.calm();
  }
  power() { return MG.clamp(this.cur.model.drive, 0, 1.12); }
  update(rawDt) {
    if (this.replay) { this.stepReplay(Math.min(rawDt, .05)); return; }
    this.realFrame = performance.now() / 1000; let rem = Math.min(rawDt, .05); while (rem > 1e-6) { const h = Math.min(rem, 1 / 120); this.step(h); rem -= h; }
    const vw = this.vw();
    if (this.phase === 'flight') this.camTarget = Math.max(-vw * .24, this.px * MG.PPM - vw * .3);
    else if (this.phase === 'land') this.camTarget = Math.max(-vw * .24, this.landX * MG.PPM - vw * .5);
    else if (this.phase !== 'foul') this.camTarget = -vw * .24;
    this.cam += (this.camTarget - this.cam) * Math.min(1, rawDt * (this.phase === 'land' ? 3 : 8)); this.shake = Math.max(0, this.shake - rawDt);
    if (this.rec.length < 4000 && this.phase !== 'scoreboard') this.rec.push(this.frame());
  }
  step(h) {
    this.simT += h; this.phaseT += h; const a = this.cur, m = a.model;
    switch (this.phase) {
      case 'intro': if (this.phaseT > 1.3) { this.phase = 'ready'; this.phaseT = 0; MG.Audio.sfx.whistle(); } break;
      case 'ready': a.pose = 'stand'; a.poseT = this.simT; break;
      case 'spin': {
        m.update(h, this.simT); m.x = 0; const p = this.power(), w = Math.PI * 2 * (.3 + .95 * p); this.theta += w * h; a.pose = 'discus'; a.poseT = (this.theta / (Math.PI * 2) + .25) % 1; a.sp = p;
        if (this.phaseT > 14) this.release0();
        break;
      }
      case 'flight': {
        const f = this.flight; f.t += h; this.px = f.x0 + f.vx * f.t; if (f.t > .5) { a.pose = 'stand'; a.poseT = this.simT; }
        if (f.t >= f.T) this.land();
        break;
      }
      case 'land': case 'foul': if (this.phaseT > 2.4) this.afterAttempt(); break;
    }
    if (this.phase === 'ready' || this.phase === 'spin') this.hint += h;
  }
  /* wrap the needle angle into -PI..PI (0 = straight ahead) */
  off() { let o = this.theta % (Math.PI * 2); if (o > Math.PI) o -= Math.PI * 2; return o; }
  release0() {
    const a = this.cur, p = this.power(), ad = Math.abs(this.off()), half = this.half(); this.phase = 'flight'; this.phaseT = 0;
    if (ad > 1.25 || p < .12) { this.foulThrow(ad > 1.25 ? 'WILD THROW!' : 'TOO WEAK!'); return; }
    const q = ad < half ? 1 - .25 * (ad / half) : .75 - (ad - half) / (1.25 - half) * .7;
    const u = 12 + 15 * Math.min(p, 1.08), a0 = this.ANG * Math.PI / 180, vy = u * Math.sin(a0), T = (vy + Math.sqrt(vy * vy + 2 * this.G * this.H0)) / this.G;
    const R = u * u * .0945 * .87 * (.35 + .65 * q) * (1 + MG.rnd(-.015, .015)), vx = R / T;
    this.flight = { t: 0, x0: this.X0, vx, vy: vy * (.5 + .5 * q), T, q, u, p }; this.px = this.X0; a.pose = 'discusrel'; a.poseT = 0; a.sp = 0; MG.Audio.sfx.jump(); a.model.coast = true;
    this.banner = q > .9 ? 'PERFECT!' : q < .5 ? 'SLICED!' : ''; this.bannerCol = q > .9 ? '#60ff70' : '#ff9a30';
  }
  foulThrow(msg) { const a = this.cur; this.phase = 'foul'; this.phaseT = 0; this.fouled = true; this.dist = 0; this.landX = 0; this.banner = msg; this.bannerCol = '#ff4040'; this.flag = 'red'; a.pose = 'dejected'; MG.Audio.sfx.foul(); MG.Audio.sfx.hit(); this.curComp().att.push(0); this.stadium.cheer(.05, 0, 3); }
  land() {
    const f = this.flight; this.landX = f.x0 + f.vx * f.T; this.dist = this.landX; this.phase = 'land'; this.phaseT = 0; this.banner = MG.fmtDist(this.dist) + ' M'; this.bannerCol = '#60ff70';
    MG.Audio.sfx.land(); MG.Audio.sfx.cheer(1.6, Math.min(.5, this.dist / 100)); this.shake = .15; this.flag = 'white'; const c = this.curComp(); c.att.push(+this.dist.toFixed(2)); MG.Storage.data.stats.throws++;
    if (this.dist >= (MG.Storage.data.bests.discus || 999)) this.flash = .2; this.crowdReact(this.dist >= this.D.dcBase * .98);
  }
  onInput(ev) {
    const a = this.cur, m = a.model;
    if (this.phase === 'scoreboard') return this.boardInput(ev);
    if (ev.type !== 'down') return false;
    if (ev.act === 'left' || ev.act === 'right') {
      if (this.phase === 'ready' || this.phase === 'spin') {
        const r = m.tap(ev.act, this.tapTime(ev));
        if (r === 'ok') { if (this.phase === 'ready') { this.phase = 'spin'; this.phaseT = 0; this.banner = ''; this.theta = -1.6; } MG.Audio.sfx.step(m.taps & 1); } else if (r === 'same') MG.Audio.sfx.blip(180);
        return true;
      }
    }
    if (ev.act === 'jump' && this.phase === 'spin') { this.release0(); return true; }
    return false;
  }
  frame() {
    const a = this.cur, m = a.model;
    return { cam: this.cam, simT: this.simT, ath: [a.snap()], banner: this.banner, bannerCol: this.bannerCol, landX: this.landX, flag: this.flag, phase: this.phase, theta: this.theta, px: this.px, hm: { v: 0, drive: m.drive, cad: m.cad, copt: m.copt, fatigue: m.fatigue, lastSide: m.lastSide, lastWrong: m.lastWrong }, fl: this.flight ? { t: this.flight.t, T: this.flight.T, x0: this.flight.x0, vx: this.flight.vx, vy: this.flight.vy } : null };
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
  drawScene(ctx, v) {
    const st = this.stadium, T = MG.TRACK, cam = v.cam, PPM = MG.PPM, sx = x => Math.round(x * PPM - cam), fy = T.feet(2), W = MG.W;
    st.drawBack(ctx, cam, v.simT); st.drawGround(ctx, cam, T.y0, T.y1);
    // grass throwing sector
    const g0 = Math.max(0, sx(-4)); ctx.fillStyle = '#3f9f40'; ctx.fillRect(g0, fy - 24, W - g0 + 2, 46);
    ctx.fillStyle = '#348f37'; for (let m = -4; m < 120; m += 6) { const x = sx(m); if (x < -30 || x > W + 30) continue; ctx.fillRect(x, fy - 24, 24, 46); }
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(g0, fy - 24, W, 1); ctx.fillRect(g0, fy + 21, W, 1);
    for (let d = 10; d <= 90; d += 10) { const x = sx(d); if (x < -10 || x > W + 10) continue; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x, fy - 24, 1, 46); MG.Font.text(ctx, d, x, fy - 33, '#fff', 1, { align: 'center', shadow: '#000' }); }
    // circle + cage
    const cx = sx(0); ctx.fillStyle = '#d8d4c8'; ctx.fillRect(cx - 20, fy + 1, 40, 4); ctx.fillStyle = '#fff'; ctx.fillRect(cx - 20, fy + 1, 40, 1); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(cx - 20, fy + 4, 40, 1);
    if (v.landX != null && v.phase !== 'foul') { const lx = sx(v.landX); ctx.fillStyle = '#ffe040'; ctx.fillRect(Math.min(cx, lx), fy + 18, Math.abs(lx - cx), 1); ctx.fillStyle = '#d83030'; ctx.fillRect(lx, fy - 24, 1, 8); ctx.fillRect(lx, fy - 24, 4, 3); ctx.fillStyle = '#16213a'; ctx.fillRect(lx - 2, fy + 1, 5, 3); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(lx - 1, fy + 1, 3, 2); }
    { const jx = sx(Math.max(8, (v.landX || 0) + 4)), jy = fy + 20; if (jx > -10 && jx < W + 10) { ctx.fillStyle = '#f4f4f4'; ctx.fillRect(jx - 2, jy - 8, 5, 8); ctx.fillStyle = '#f1c39b'; ctx.fillRect(jx - 1, jy - 12, 3, 4); ctx.fillStyle = '#222'; ctx.fillRect(jx - 1, jy - 12, 3, 1); if (v.flag) { ctx.fillStyle = '#aaa'; ctx.fillRect(jx + 3, jy - 17, 1, 10); ctx.fillStyle = v.flag === 'red' ? '#e03030' : '#f4f4f4'; ctx.fillRect(jx + 4, jy - 17, 6, 4); } } }
    const a = v.ath[0], x = sx(0), y = fy + 4; MG.Sprites.shadow(ctx, x, y - 1, 8); MG.Sprites.athlete(ctx, a, x, y); ctx.drawImage(MG.flag(a.country), x - 8, y - 42);
    // the disc
    if (v.phase === 'spin' || v.phase === 'ready' || v.phase === 'intro') { const ph = v.theta; const dx = Math.round(x + 7 + Math.sin(ph) * 8), dy = y - 26 + Math.round(Math.cos(ph * 2) * 1); ctx.fillStyle = '#16213a'; ctx.fillRect(dx - 3, dy - 1, 7, 3); ctx.fillStyle = '#ffc933'; ctx.fillRect(dx - 2, dy, 5, 1); }
    else if (v.phase === 'flight' && v.fl) { const f = v.fl, t = f.t, wx = (f.x0 + f.vx * t) * PPM - cam, wy = Math.max(0, this.H0 + f.vy * t - .5 * this.G * t * t), dy = fy + 2 - Math.round(wy * PPM * .42) - 18; ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let k = 1; k < 7; k++) { const tt = Math.max(0, t - k * .04), hh = Math.max(0, this.H0 + f.vy * tt - .5 * this.G * tt * tt); ctx.fillRect(Math.round((f.x0 + f.vx * tt) * PPM - cam), fy + 2 - Math.round(hh * PPM * .42) - 18, 1, 1); } const sp = Math.floor(t * 16) % 2; ctx.fillStyle = '#16213a'; ctx.fillRect(Math.round(wx) - 4, dy - 1, 9, 3); ctx.fillStyle = sp ? '#ffc933' : '#fff3d6'; ctx.fillRect(Math.round(wx) - 3, dy, 7, 1); }
  }
  drawHud(ctx, v) {
    const H = MG.HUD, F = MG.Font, W = MG.W, narrow = W < 316, cxm = W / 2, lx = Math.max(8, Math.round((W - 320) / 2) + 8);
    this.drawTopBar(ctx, v, 'ATTEMPT ' + (this.round + 1) + '/' + this.ATT);
    if (!narrow) { H.rhythm(ctx, lx, 160, v.hm, this.simT, 150, 'POWER'); H.releaseBar(ctx, lx + 156, 160, 150, this.offOf(v.theta), this.half()); }
    if (v.banner) H.banner(ctx, v.banner, 40, v.bannerCol, narrow ? 2 : 3);
    if (this.phase === 'intro') { H.banner(ctx, this.title, 28, '#fff', 2); F.text(ctx, 'ATTEMPT ' + (this.round + 1), cxm, 48, '#ffe040', 1, { align: 'center', shadow: '#000' }); }
    if (this.phase === 'ready' && Math.floor(performance.now() / 300) % 2) F.text(ctx, narrow ? 'TAP L / R TO SPIN UP' : 'TAP LEFT / RIGHT TO SPIN UP', cxm - (narrow ? 12 : 0), narrow ? 34 : 26, '#fff', 1, { align: 'center', shadow: '#000' });
    if (this.phase === 'spin') { const ad = Math.abs(this.off()); if (this.hint > 2 && this.hint < 9 || this.power() > .5) F.text(ctx, narrow ? 'GREEN = THROW!' : 'PRESS THROW IN THE GREEN!', cxm - (narrow ? 14 : 0), narrow ? 34 : 26, ad < this.half() ? '#7dff9a' : '#ffe040', 1, { align: 'center', shadow: '#000' }); }
  }
  offOf(th) { let o = (th || 0) % (Math.PI * 2); if (o > Math.PI) o -= Math.PI * 2; if (o < -Math.PI) o += Math.PI * 2; return o; }
  drawDash(ctx, v) {
    const V = MG.view, H = MG.HUD, pw = Math.floor((V.W - 12) / 2), y = V.stripY + 14; H.rhythm(ctx, 8, y, v.hm, this.simT, pw, 'POWER'); H.releaseBar(ctx, 8 + pw + 3, y, pw, this.offOf(v.phase === 'ready' ? -1.6 : v.theta), this.half());
  }
};
