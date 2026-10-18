/* MAX GAMES — event base class and the 100m / 110m hurdles race (RaceEvent). */
'use strict';
MG.TRACK = { y0: 79, y1: 142, laneH: 12.6, lanes: 5, feet: l => Math.round(79 + 12.6 * l + 11.5), CX: 100 };

/* scene helpers: the track scene is drawn with its own (scaled) coordinate system that fills the whole canvas */
MG.sceneBegin = function (ctx, st) { const V = MG.view; ctx.save(); ctx.fillStyle = st.th.sky[0]; ctx.fillRect(0, 0, V.W, V.H); ctx.translate(0, V.top); ctx.scale(V.k, V.k); MG._W = MG.W; MG._H = MG.H; MG.W = V.W / V.k; MG.H = (V.H - V.top) / V.k; };
MG.sceneEnd = function (ctx) { MG.W = MG._W; MG.H = MG._H; ctx.restore(); };
MG.EventBase = class EventBase {
  constructor(game, cfg) {
    this.game = game; this.cfg = cfg; this.simT = 0; this.realFrame = performance.now() / 1000; this.stadium = game.stadiumFor(cfg);
    this.rec = []; this.replay = null; this.pausable = true; this.isEvent = true; this.padMode = 'run'; this.done = false; this.result = null; this.dashH = 0; this.stadium.calm();
  }
  enter() {} exit() {}
  cx() { return Math.round((MG.view.W / MG.view.k) * .31); }
  /* convert an input event's real timestamp into simulation time (sub-frame precision for cadence) */
  tapTime(ev) { return this.simT + Math.max(0, ev.t - this.realFrame); }
  startReplay(speed = 1, onEnd) { this.replay = { i: 0, f: 0, speed, onEnd }; }
  stepReplay(dt) { const r = this.replay; r.f += dt * 60 * r.speed; r.i = Math.floor(r.f); if (r.i >= this.rec.length - 1) { r.i = this.rec.length - 1; const e = r.onEnd; this.replay = null; if (e) e(); } }
};

/* ------------------------------------------------------------------------------------------------ */
MG.RaceEvent = class RaceEvent extends MG.EventBase {
  constructor(game, cfg) {
    super(game, cfg);
    this.id = cfg.id; this.sport = MG.SPORTS[cfg.id] || null; this.L = this.sport ? this.sport.L : this.id === 'hurdles' ? 110 : 100; this.D = MG.DIFFICULTY[cfg.diff]; this.hurdlesOn = this.id === 'hurdles';
    this.hurdles = this.hurdlesOn ? Array.from({ length: 10 }, (_, i) => ({ x: 13.72 + 9.14 * i, fallen: false, rot: 0, vx: 0 })) : [];
    const h = cfg.humans[0]; this.aths = [];
    this.human = new MG.Athlete({ name: h.name || 'YOU', country: h.country, look: h.look, lane: 2, human: true, assist: this.D.assist });
    this.aths.push(this.human);
    if (cfg.opponents !== false) {
      const field = cfg.field || MG.makeField(4, [h.country], cfg.diff, cfg.tier || 0), lanes = [0, 1, 3, 4];
      field.forEach((f, i) => this.aths.push(new MG.AICompetitor({ name: f.name, country: f.country, look: f.look, lane: lanes[i], skill: f.skill, jitter: f.jitter, hurdleErr: f.hurdleErr, assist: 1 })));
    }
    if (this.hurdlesOn) for (const a of this.aths) a.model.Vm = 11.0;
    this.vmul = 1; if (this.sport) { const P = this.sport; this.vmul = 11 / P.Vm; for (const a of this.aths) { a.model.Vm = P.Vm; a.model.A = P.A * (a.isHuman ? this.D.assist : 1); a.model.drag = P.drag; a.model.copt = P.copt; } }
    this.phase = 'walk'; this.phaseT = 0; this.goTime = null; this.falseStarts = 0; this.setDelay = 1.4; this.banner = ''; this.bannerCol = '#ffe040'; this.order = []; this.humanDoneAt = null; this.cam = -114;
    this.hint = 0; this.flash = 0; this.shake = 0; this.cheered = false; this.preCheer = false; this.dashH = 72;
    this.enterPhase('walk');
  }
  enterPhase(p) {
    this.phase = p; this.phaseT = 0; const A = MG.Audio.sfx;
    if (p === 'walk') { this.banner = ''; this.walkFrom = this.sport ? -.3 : -4.4; for (const a of this.aths) { a.x = this.walkFrom; a.model.x = this.walkFrom; a.pose = 'walk'; } }
    if (p === 'ready') { this.banner = 'READY'; this.bannerCol = '#ffe040'; A.count(false); for (const a of this.aths) { a.x = -.3; a.model.x = -.3; a.pose = 'marks'; a.poseT = 0; } }
    if (p === 'set') { this.banner = 'SET'; this.bannerCol = '#ff9a30'; this.setDelay = MG.rnd(1.0, 2.1); A.count(false); for (const a of this.aths) a.pose = 'set'; }
    if (p === 'run') {
      this.banner = 'GO!'; this.bannerCol = '#60ff70'; this.goTime = this.simT; A.pistol(); this.shake = .25;
      for (const a of this.aths) { a.model.x = -.3; a.started = false; if (a.prepare) a.prepare(this.goTime); }
      MG.Audio.sfx.cheer(1.2, .3);
    }
    if (p === 'false') { this.banner = 'FALSE START!'; this.bannerCol = '#ff4040'; A.error(); A.pistol(); this.falseStarts++; MG.Storage.data.stats.falseStarts++; }
  }
  gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / .5; }
  /* -------------------------------------------------- simulation */
  update(rawDt) {
    if (this.replay) { this.stepReplay(Math.min(rawDt, .05)); return; }
    this.realFrame = performance.now() / 1000;
    let rem = Math.min(rawDt, .05); while (rem > 1e-6) { const h = Math.min(rem, 1 / 120); this.step(h); rem -= h; }
    this.cam = Math.max(-(this.cx() + 14), Math.round(this.human.x * MG.PPM - this.cx())); this.shake = Math.max(0, this.shake - rawDt);
    if (this.rec.length < 9000) this.rec.push(this.frame());
  }
  step(h) {
    this.simT += h; this.phaseT += h;
    switch (this.phase) {
      case 'walk': { const wt = this.sport ? this.sport.walkT : 1.5, k = Math.min(1, this.phaseT / wt); for (const a of this.aths) { a.x = MG.lerp(this.walkFrom, -.3, k); a.model.x = a.x; a.pose = 'walk'; a.poseT = (this.phaseT * 1.7) % 1; } if (this.phaseT >= wt) this.enterPhase('ready'); break; }
      case 'ready': if (this.phaseT >= 1.1) this.enterPhase('set'); break;
      case 'set': if (this.phaseT >= this.setDelay) this.enterPhase('run'); break;
      case 'false': if (this.phaseT >= 1.8) { if (this.falseStarts >= 2) this.disqualify(); else this.enterPhase('walk'); } break;
      case 'run': case 'end': this.runStep(h); break;
    }
  }
  runStep(h) {
    const t = this.simT;
    if (this.phase === 'run' && this.phaseT > .8 && this.banner === 'GO!') this.banner = '';
    for (const a of this.aths) {
      if (a.dq) { a.pose = 'dejected'; continue; }
      if (a.think) a.think(t);
      a.model.update(h, t); a.x = a.model.x;
      this.hurdleLogic(a, h);
      this.finishCheck(a);
      this.poseFor(a, h);
    }
    for (const hd of this.hurdles) if (hd.fallen) { hd.rot = Math.min(1.5, hd.rot + h * 5); }
    if (this.phase === 'run' && this.human.finished) { this.phase = 'end'; this.phaseT = 0; }
    if (this.phase === 'end') {
      const all = this.aths.every(a => a.finished || a.dq);
      if (this.phaseT > 3.4 || (all && this.phaseT > 2.6)) this.complete();
    }
    if (this.hint < 4 && !this.human.started) this.hint += h;
    if (this.phase === 'run' && !this.preCheer && this.human.x > this.L - 32) { this.preCheer = true; this.stadium.cheer(.55, 0, 14); }
  }
  poseFor(a, h) {
    if (a.finished) {
      a.animateRun(h); if (a.model.v < 1.6) { a.pose = a.rank <= 3 ? 'celebrate' : a.rank === this.aths.length ? 'dejected' : 'slump'; a.poseT = this.simT; } return;
    }
    if (!a.started) { a.pose = 'set'; a.poseT = this.simT; return; }
    a.animateRun(h);
    if (a.jump) { a.pose = 'hurdle'; a.poseT = Math.min(1, a.jump.t / (2 * MG.Physics.HURDLE.vy / MG.Physics.HURDLE.g)); a.y = Math.max(0, a.jump.y); }
    else if (a.model.stumble > 0) { a.pose = 'stumble'; a.poseT = this.simT; }
  }
  tryJump(a) {
    if (!this.hurdlesOn || a.jump || a.finished || a.model.stumble > .25 || !a.started) return false;
    a.jump = { t: 0, y: 0 }; a.model.air = true; if (a.isHuman) MG.Audio.sfx.jump(); return true;
  }
  hurdleLogic(a, h) {
    if (!this.hurdlesOn) return; const H = MG.Physics.HURDLE;
    if (a.jump) {
      a.jump.t += h; a.jump.y = H.vy * a.jump.t - .5 * H.g * a.jump.t * a.jump.t;
      if (a.jump.y <= 0 && a.jump.t > .08) { a.jump = null; a.y = 0; a.model.air = false; a.model.v *= .985; if (a.isHuman) MG.Audio.sfx.land(); }
    } else if (a.ai !== false && a.think && a.started) { // computer athletes decide when to take off
      const idx = this.hurdles.findIndex(x => x.x > a.x - .2); if (idx >= 0) {
        if (a.hErr[idx] === undefined) a.hErr[idx] = this.gauss() * a.hurdleErr;
        const want = a.model.v * .31 + a.hErr[idx]; if (this.hurdles[idx].x - a.x <= want) this.tryJump(a);
      }
    }
    for (const hd of this.hurdles) {
      if (hd.fallen) continue; const dx = Math.abs(a.x - hd.x);
      if (dx < .3 && (a.y || 0) < H.clear && !a.finished) {
        hd.fallen = true; hd.vx = a.model.v * .25; a.model.v *= .62; a.model.stumble = .55; a.model.cad *= .55; a.hurdlesHit++;
        if (a.isHuman) { MG.Audio.sfx.hit(); this.shake = .3; this.flash = .25; MG.Audio.sfx.gasp(); }
      }
    }
  }
  finishCheck(a) {
    if (a.finished || a.x < this.L) return;
    a.finished = true; a.finishTime = this.simT - this.goTime - (a.x - this.L) / Math.max(a.model.v, .5); a.model.coast = true; this.order.push(a); a.rank = this.order.length; a.jump = null; a.y = 0; a.model.air = false;
    if (a.isHuman) { this.humanDoneAt = this.simT; this.banner = 'FINISH!'; this.bannerCol = '#ffe040'; MG.Audio.sfx.cheer(2.8, .6); MG.Audio.sfx.whistle(); this.flash = .3; this.stadium.cheer(1, 7, 12); setTimeout(() => MG.Audio.sfx.wave(), 500); }
  }
  /* run the rest of the race without rendering so every opponent gets an exact time */
  complete() {
    if (this.done) return; let g = 0;
    while (!this.aths.every(a => a.finished || a.dq) && g++ < 4000) { this.simT += 1 / 60; for (const a of this.aths) { if (a.finished || a.dq) continue; if (a.think) a.think(this.simT); a.model.update(1 / 60, this.simT); a.x = a.model.x; this.hurdleLogic(a, 1 / 60); this.finishCheck(a); } }
    for (const a of this.aths) { a.model.coast = true; }
    const rows = this.aths.map(a => ({ name: a.name, country: a.country, time: a.dq ? null : a.finishTime, human: a.isHuman, dq: a.dq, hits: a.hurdlesHit, look: a.look }));
    rows.sort((x, y) => (x.dq - y.dq) || ((x.time ?? 1e9) - (y.time ?? 1e9))); rows.forEach((r, i) => r.rank = i + 1);
    this.result = { id: this.id, kind: 'time', rows, human: rows.find(r => r.human), mode: this.cfg.mode, hits: this.human.hurdlesHit, reaction: this.human.reaction };
    this.done = true; if (!this.cheered) { this.cheered = true; }
  }
  disqualify() { this.human.dq = true; this.human.started = false; this.banner = ''; this.enterPhase('run'); this.phase = 'end'; this.phaseT = 0; for (const a of this.aths) if (a.prepare) a.prepare(this.goTime); this.complete(); }
  /* -------------------------------------------------- input */
  onInput(ev) {
    if (ev.type !== 'down') return false;
    const m = this.human.model;
    if (ev.act === 'left' || ev.act === 'right') {
      if (this.phase === 'ready' || this.phase === 'set') { this.enterPhase('false'); return true; }
      if (this.phase === 'run' && !this.human.finished && !this.human.dq) {
        const r = m.tap(ev.act, this.tapTime(ev)); const first = !this.human.started;
        if (r === 'ok') { if (first) { this.human.started = true; this.human.reaction = this.tapTime(ev) - this.goTime; } MG.Storage.data.stats.tapsTotal++; MG.Audio.sfx.step(m.taps & 1); }
        else if (r === 'same') MG.Audio.sfx.blip(180);
        return true;
      }
    }
    if (ev.act === 'jump' && this.hurdlesOn && this.phase === 'run') { this.tryJump(this.human); return true; }
    return false;
  }
  /* -------------------------------------------------- rendering */
  frame() { return { cam: this.cam, simT: this.simT, ath: this.aths.map(a => a.snap()), hurdles: this.hurdles.map(h => ({ x: h.x, fallen: h.fallen, rot: h.rot })), banner: this.banner, bannerCol: this.bannerCol, t: this.goTime == null ? 0 : (this.human.finished ? this.human.finishTime : this.simT - this.goTime), hm: (m => ({ v: m.v * this.vmul, drive: m.drive, cad: m.cad, copt: m.copt, fatigue: m.fatigue, lastSide: m.lastSide, lastWrong: m.lastWrong }))(this.human.model) }; }
  render(ctx) {
    const v = this.replay ? this.rec[this.replay.i] : this.frame(); if (!v) return;
    const ox = this.shake > 0 ? Math.round((Math.random() - .5) * 3) : 0, oy = this.shake > 0 ? Math.round((Math.random() - .5) * 2) : 0;
    MG.sceneBegin(ctx, this.stadium);
    ctx.save(); ctx.translate(ox, oy);
    this.drawScene(ctx, v); ctx.restore();
    this.drawHud(ctx, v);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash})`; ctx.fillRect(0, 0, MG.W, MG.H); this.flash = Math.max(0, this.flash - .02); }
    if (this.replay) { MG.Font.text(ctx, 'REPLAY', MG.W - 6, 20, '#ff5050', 2, { align: 'right', shadow: '#000' }); MG.Font.text(ctx, 'TAP OR PRESS A KEY TO SKIP', MG.W / 2, 168, '#fff', 1, { align: 'center', shadow: '#000' }); }
    MG.sceneEnd(ctx);
    MG.view.dashH = MG.view.portrait ? this.dashH : 0; if (MG.view.portrait) this.drawDash(ctx, v);
  }
  drawScene(ctx, v) {
    const st = this.stadium, T = MG.TRACK, cam = v.cam, PPM = MG.PPM, sx = x => Math.round(x * PPM - cam);
    st.drawBack(ctx, cam, v.simT); st.drawGround(ctx, cam, T.y0, T.y1);
    ctx.fillStyle = 'rgba(240,236,224,.9)'; for (let i = 1; i < T.lanes; i++) ctx.fillRect(0, Math.round(T.y0 + T.laneH * i), MG.W, 1);
    // start line, finish line, distance marks
    const sl = sx(0); ctx.fillStyle = '#f4f0e4'; ctx.fillRect(sl, T.y0 + 1, 2, T.y1 - T.y0 - 1);
    for (let m = 10; m < this.L; m += 10) { const x = sx(m); if (x < -20 || x > MG.W + 20) continue; ctx.fillStyle = 'rgba(240,236,224,.55)'; ctx.fillRect(x, T.y1 - 4, 1, 4); MG.Font.text(ctx, m, x, T.y1 + 4, 'rgba(255,255,255,.75)', 1, { align: 'center' }); }
    const fl = sx(this.L); if (fl > -40 && fl < MG.W + 40) {
      for (let y = T.y0 + 1; y < T.y1 - 1; y += 3) { ctx.fillStyle = ((y - T.y0) / 3 | 0) & 1 ? '#fff' : '#1a1a1a'; ctx.fillRect(fl, y, 3, 3); ctx.fillStyle = ((y - T.y0) / 3 | 0) & 1 ? '#1a1a1a' : '#fff'; ctx.fillRect(fl + 3, y, 3, 3); }
      ctx.fillStyle = '#5a5a74'; ctx.fillRect(fl - 12, 52, 2, 28); ctx.fillRect(fl + 18, 52, 2, 28); ctx.fillStyle = '#1c1c2c'; ctx.fillRect(fl - 14, 48, 36, 11); ctx.fillStyle = '#ffd84a'; ctx.fillRect(fl - 13, 49, 34, 9); MG.Font.text(ctx, 'FINISH', fl + 4, 50, '#c02020', 1, { align: 'center' });
    }
    // starting blocks
    for (const a of v.ath) { const x = sx(-.6), y = T.feet(a.lane); if (x > -10 && x < MG.W + 10) { ctx.fillStyle = '#2a2a38'; ctx.fillRect(x - 2, y - 2, 5, 2); ctx.fillRect(x + 1, y - 4, 2, 2); } }
    // hurdles + athletes, back to front
    const lanes = v.ath.map((a, i) => ({ a, i })).sort((p, q) => p.a.lane - q.a.lane);
    for (const { a } of lanes) {
      const y = T.feet(a.lane);
      v.hurdles.forEach(h => this.drawHurdle(ctx, sx(h.x), y, h));
      const x = sx(a.x); if (x < -40 || x > MG.W + 40) continue;
      MG.Sprites.shadow(ctx, x, y - 1, 8); MG.Sprites.athlete(ctx, a, x, y - Math.round((a.y || 0) * PPM));
      ctx.globalAlpha = .95; ctx.drawImage(MG.flag(a.country), x - 8, y - 40 + (a.isHuman ? 0 : 3) - 0); ctx.globalAlpha = 1;
    }
  }
  drawHurdle(ctx, x, y, h) {
    if (x < -20 || x > MG.W + 20) return;
    if (!h.fallen) { ctx.fillStyle = '#1c1428'; ctx.fillRect(x - 1, y - 12, 12, 4); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x, y - 11, 10, 2); ctx.fillStyle = '#d83030'; ctx.fillRect(x + 2, y - 11, 2, 2); ctx.fillRect(x + 6, y - 11, 2, 2); ctx.fillStyle = '#c8c8d8'; ctx.fillRect(x, y - 9, 1, 9); ctx.fillRect(x + 9, y - 9, 1, 9); ctx.fillStyle = '#2a2a38'; ctx.fillRect(x - 1, y - 1, 3, 2); ctx.fillRect(x + 8, y - 1, 3, 2); }
    else { const r = h.rot; ctx.fillStyle = '#1c1428'; ctx.fillRect(x + 2, y - 3, 14, 4); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x + 3, y - 2, 12, 2); ctx.fillStyle = '#d83030'; ctx.fillRect(x + 5, y - 2, 2, 2); ctx.fillRect(x + 10, y - 2, 2, 2); ctx.fillStyle = '#c8c8d8'; ctx.fillRect(x + 16, y - 1, 5, 1); }
  }
  drawHud(ctx, v) {
    const H = MG.HUD, F = MG.Font, h = this.human, hv = v.ath[0], m = v.hm, now = this.simT, W = MG.W, narrow = W < 316, cxm = W / 2;
    ctx.fillStyle = 'rgba(14,24,56,.66)'; ctx.fillRect(0, 0, W, 14); ctx.fillStyle = '#fff3d6'; ctx.fillRect(0, 14, W, 1);
    ctx.drawImage(MG.flag(hv.country), 4, 2); F.text(ctx, narrow ? h.country : h.country + ' ' + h.name, 24, 4, '#fff', 1, { shadow: '#000' });
    H.timer(ctx, v.t, cxm, 0);
    const dist = Math.max(0, Math.min(this.L, hv.x)), order = v.ath.slice().sort((a, b) => b.x - a.x), pos = order.indexOf(hv) + 1, ptxt = ['1ST', '2ND', '3RD', '4TH', '5TH'][pos - 1];
    F.text(ctx, dist.toFixed(narrow ? 0 : 1) + 'M', W - 4, 4, '#fff', 1, { align: 'right', shadow: '#000' });
    if (v.ath.length > 1 && !narrow) F.text(ctx, ptxt, W - 50, 4, pos === 1 ? '#ffe040' : '#c8c4e8', 1, { align: 'right', shadow: '#000' });
    if (!narrow) { const by = 160, lx = Math.max(8, Math.round((W - 320) / 2) + 8); H.speed(ctx, lx, by, m.v); H.rhythm(ctx, lx + 104, by, m, now); H.distance(ctx, lx + 209, by, 100, v.ath, this.L, v.ath.length > 1 ? ptxt : '', dist); }
    if (v.banner) H.banner(ctx, v.banner, narrow ? 40 : 40, v.bannerCol, narrow ? 2 : 3);
    if (this.phase === 'run' && !h.started && !this.replay) { if (Math.floor(performance.now() / 280) % 2) F.text(ctx, narrow ? 'TAP L / R FAST!' : 'TAP LEFT / RIGHT FAST!', cxm, narrow ? 36 : 24, '#fff', 1, { align: 'center', shadow: '#000' }); }
    if (this.hurdlesOn && this.phase === 'run' && h.started && !this.replay && this.cfg.diff !== 'hard') {
      const nx = this.hurdles.find(x => x.x > h.x - .1 && !x.fallen); if (nx) { const d = nx.x - h.x, want = m.v * .31; if (Math.abs(d - want) < .8 && !h.jump && Math.floor(performance.now() / 120) % 2) F.text(ctx, 'JUMP!', Math.round(h.x * MG.PPM - v.cam), narrow ? 40 : 36, '#ff7040', 1, { align: 'center', shadow: '#000' }); }
    }
    if (this.phase === 'walk') { F.text(ctx, MG.EVENTS[this.id].name, cxm, narrow ? 36 : 24, '#fff', 1, { align: 'center', shadow: '#000' }); }
  }
  /* portrait: speed + rhythm panels live right under the scene, above the touch buttons */
  drawDash(ctx, v) {
    const V = MG.view, H = MG.HUD, m = v.hm, pw = Math.floor((V.W - 12) / 2), y = V.stripY + 14;
    H.speed(ctx, 8, y, m.v, pw); H.rhythm(ctx, 8 + pw + 3, y, m, this.simT, pw);
    const hv = v.ath[0], order = v.ath.slice().sort((a, b) => b.x - a.x), pos = order.indexOf(hv) + 1;
    H.distance(ctx, 8, V.stripY + 47, V.W - 10, v.ath, this.L, v.ath.length > 1 ? ['1ST', '2ND', '3RD', '4TH', '5TH'][pos - 1] : '', Math.max(0, Math.min(this.L, hv.x)));
  }
};
