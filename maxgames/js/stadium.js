/* MAX GAMES — Stadiums: six distinct pixel-art venues. One grandstand with a live crowd (idle / cheering / Mexican wave), ad boards, track, ground. */
'use strict';
MG.Stadium = (() => {
  const SW = 320;
  const CROWD_STD = ['#e03a3a', '#f2c230', '#3a8ae0', '#f4f4f4', '#3aa84a', '#e87ac0', '#f08a2a', '#8a5ad0', '#2a2a30', '#58d0d0'];
  const CROWD_WIN = ['#d83030', '#f4f4f4', '#2a5fc0', '#f4f4f4', '#1e3a6a', '#e87a20', '#f4f4f4', '#2a8a4a'];
  const CROWD_NEO = ['#ff3ea5', '#19e0f0', '#ffe14a', '#a86bff', '#f4f4ff', '#ff7a3a'];
  const SKINS = ['#f1c39b', '#c98c5a', '#8d5a34', '#e2ab7a'], HAIR = ['#2a1a10', '#5a3a1a', '#d8b050', '#111', '#8a3a1c'];
  const TH = {
    city:   { sky: ['#3f9be8', '#6cb8f2', '#9fd4f8', '#cdeaff'], cloud: '#ffffff', far: '#7c9fc0', far2: '#5f84a8', horizon: 'city', roof: 'flat', roofC: ['#2f3550', '#454c6e'], stand: ['#5d6286', '#7a80a6'], crowd: CROWD_STD, dim: 1, track: ['#cf5b36', '#b04828', '#e07848'], ground: 'grass', g: ['#3f9f40', '#348f37'], pylons: 1, flags: 1 },
    sunset: { sky: ['#5b3a8c', '#cc4f7e', '#f2955a', '#ffd68a'], cloud: '#ffc4a0', far: '#6a3f78', far2: '#4e3068', horizon: 'hills', sun: 1, roof: 'striped', roofC: ['#3a2238', '#e0583a'], stand: ['#54395f', '#73537f'], crowd: CROWD_STD, dim: .9, track: ['#bc4c36', '#9e3d2e', '#d16a46'], ground: 'grass', g: ['#37893c', '#2c7633'], pylons: 1, flags: 1 },
    night:  { sky: ['#05051a', '#0d1136', '#18245a', '#27397d'], cloud: '#25346e', far: '#161e4a', far2: '#0e1438', horizon: 'cityNight', stars: 1, roof: 'flat', roofC: ['#10102a', '#1c1c40'], stand: ['#23233f', '#33335a'], crowd: CROWD_STD, dim: .78, track: ['#8a4538', '#703830', '#a05848'], ground: 'grass', g: ['#216630', '#1a5a28'], pylons: 1, lights: 1 },
    beach:  { sky: ['#27b4e8', '#5fd0f2', '#9fe6f8', '#d8f6fb'], cloud: '#ffffff', far: '#2bb0c8', far2: '#1c93b0', horizon: 'sea', sun: 2, roof: 'parasol', roofC: ['#f5e6c0', '#ff6a4a'], stand: ['#e6c98a', '#f3dba5'], crowd: CROWD_STD, dim: 1, track: ['#e6a24c', '#cc8a3a', '#f4bc66'], ground: 'sand', g: ['#f0d890', '#e6cb80'], palms: 1 },
    alpine: { sky: ['#7fb4e8', '#a8cdf2', '#cfe4f8', '#eef6fd'], cloud: '#ffffff', far: '#9db6d4', far2: '#7d98ba', horizon: 'peaks', roof: 'wood', roofC: ['#5a3a24', '#7a5232'], stand: ['#8a6a48', '#a98760'], crowd: CROWD_WIN, dim: 1, track: ['#3c78c4', '#2e62a6', '#5594dc'], ground: 'snow', g: ['#eaf3f9', '#d8e8f1'], pines: 1, snow: 1 },
    neon:   { sky: ['#0b0626', '#2a0c5a', '#6a1a8c', '#d03a96'], cloud: '#7a2aa0', far: '#2a1060', far2: '#1c0a48', horizon: 'synth', sun: 3, roof: 'neon', roofC: ['#0e0828', '#19e0f0'], stand: ['#1f1348', '#322068'], crowd: CROWD_NEO, dim: .9, track: ['#a82a86', '#8c1e6e', '#d848b0'], ground: 'grid', g: ['#120a30', '#1a0e44'], pylons: 1, lights: 1, grid: 1 },
  };
  const ADS = [['MAXCOLA', '#d83030', '#fff'], ['SPRINTO', '#2a5fc8', '#ffd84a'], ['ZAPP', '#f0a020', '#202030'], ['HYPERJET', '#30a060', '#fff'], ['PIXLY', '#8a3ab0', '#fff'], ['GOLDEN', '#f4f0e0', '#c02828']];
  const TIER_Y = [8, 23, 38], PEOPLE_N = 512, COL_W = 5, STAND_Y = 10;
  function rngMaker(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  class Stadium {
    constructor(id) { this.id = TH[id] ? id : 'city'; this.th = TH[this.id]; this.mood = { lvl: .1, target: .1, wave: 0, waveT: 0, hold: 0, last: performance.now() }; this.build(); }
    /* crowd control: level 0..1 (jumping / arms up), waveSecs = Mexican wave duration, holdSecs = how long the level stays before calming */
    cheer(level, waveSecs = 0, holdSecs = 5) { const m = this.mood; m.target = Math.max(m.target, level); m.hold = holdSecs; if (waveSecs > 0) m.waveT = Math.max(m.waveT, waveSecs); }
    calm() { const m = this.mood; m.target = .1; m.hold = 0; m.waveT = 0; m.wave = 0; m.lvl = Math.min(m.lvl, .2); }
    tickMood() {
      const m = this.mood, now = performance.now(), dt = Math.min(.1, (now - m.last) / 1000); m.last = now;
      if (m.hold > 0) { m.hold -= dt; if (m.hold <= 0) m.target = .1; }
      if (m.waveT > 0) { m.waveT -= dt; m.wave = Math.min(1, m.wave + dt * 2.5); } else m.wave = Math.max(0, m.wave - dt * 1.5);
      m.lvl += (m.target - m.lvl) * Math.min(1, dt * (m.target > m.lvl ? 5 : 1.2));
    }
    build() {
      const th = this.th, R = rngMaker(77 + this.id.charCodeAt(0) * 13 + this.id.length);
      // sky: dithered colour bands + celestial bodies
      const sky = this.sky = cv(SW, 82), g = sky.getContext('2d'), bands = th.sky.length, bh = 82 / bands;
      for (let i = 0; i < bands; i++) { g.fillStyle = th.sky[i]; g.fillRect(0, Math.round(i * bh), SW, Math.ceil(bh) + 1); if (i > 0) { g.fillStyle = th.sky[i - 1]; const y0 = Math.round(i * bh); for (let x = 0; x < SW; x += 2) { g.fillRect(x + (y0 % 2), y0, 1, 1); g.fillRect(x, y0 + 2, 1, 1); } } }
      if (th.stars) { g.fillStyle = '#e8ecff'; for (let i = 0; i < 70; i++) g.fillRect(Math.floor(R() * SW), Math.floor(R() * 44), 1, 1); g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(250, 20, 7, 0, 6.3); g.fill(); g.fillStyle = '#0d1136'; g.beginPath(); g.arc(253, 18, 6, 0, 6.3); g.fill(); }
      if (th.sun === 1) { g.fillStyle = '#ffd47a'; g.beginPath(); g.arc(70, 56, 14, 0, 6.3); g.fill(); g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(70, 56, 9, 0, 6.3); g.fill(); }
      if (th.sun === 2) { g.fillStyle = '#fff6b8'; g.beginPath(); g.arc(262, 22, 10, 0, 6.3); g.fill(); g.fillStyle = 'rgba(255,246,184,.35)'; for (let a = 0; a < 8; a++) { const an = a * .785; g.fillRect(Math.round(262 + Math.cos(an) * 16), Math.round(22 + Math.sin(an) * 16), 3, 3); } }
      if (th.sun === 3) { for (let y = -16; y <= 16; y++) { const w = Math.sqrt(256 - y * y); if ((y + 16) % 5 < 2 && y > -4) continue; g.fillStyle = y < 0 ? '#ffe14a' : '#ff3ea5'; g.fillRect(Math.round(240 - w), 50 + y, Math.round(w * 2), 1); } g.fillStyle = '#ff6ac8'; for (let i = 0; i < 40; i++) g.fillRect(Math.floor(R() * SW), Math.floor(R() * 30), 1, 1); }
      // clouds (parallax)
      const cl = this.clouds = cv(420, 40), c = cl.getContext('2d'); c.fillStyle = th.cloud;
      if (this.id === 'neon') { for (let i = 0; i < 9; i++) c.fillRect(i * 48 + R() * 20, 10 + R() * 20, 30 + R() * 16, 1); }
      else for (let i = 0; i < 6; i++) { const x = i * 70 + R() * 30, y = 6 + R() * 22, w = 22 + R() * 20; c.fillRect(x, y, w, 5); c.fillRect(x + 4, y - 3, w - 10, 4); c.fillRect(x - 3, y + 3, w + 6, 3); }
      // far horizon layer (parallax .2)
      const fr = this.far = cv(480, 40), f = fr.getContext('2d'); this.paintHorizon(f, R);
      this.stand = this.makeStand(R); this.ppl = this.makePeople(R);
      const ad = this.ads = cv(ADS.length * 64, 12), a = ad.getContext('2d');
      ADS.forEach((s, i) => { a.fillStyle = s[1]; a.fillRect(i * 64, 0, 63, 12); a.fillStyle = 'rgba(255,255,255,.28)'; a.fillRect(i * 64, 0, 63, 1); a.fillStyle = 'rgba(0,0,0,.3)'; a.fillRect(i * 64, 11, 63, 1); MG.Font.text(a, s[0], i * 64 + 32, 3, s[2], 1, { align: 'center' }); a.fillStyle = '#12121c'; a.fillRect(i * 64 + 63, 0, 1, 12); });
      const tr = this.trackTex = cv(48, 64), t = tr.getContext('2d'); t.fillStyle = th.track[0]; t.fillRect(0, 0, 48, 64);
      for (let i = 0; i < 170; i++) { t.fillStyle = R() < .5 ? th.track[1] : th.track[2]; t.fillRect(Math.floor(R() * 48), Math.floor(R() * 64), 1 + (R() < .3), 1); }
      this.trackPat = null;
      const gt = this.groundTex = cv(40, 40), q = gt.getContext('2d'); q.fillStyle = th.g[0]; q.fillRect(0, 0, 40, 40); q.fillStyle = th.g[1]; q.fillRect(0, 0, 20, 40);
      if (th.ground === 'sand') { q.fillStyle = 'rgba(160,110,50,.35)'; for (let i = 0; i < 70; i++) q.fillRect(Math.floor(R() * 40), Math.floor(R() * 40), 1, 1); }
      else if (th.ground === 'snow') { q.fillStyle = 'rgba(120,160,200,.35)'; for (let i = 0; i < 40; i++) q.fillRect(Math.floor(R() * 40), Math.floor(R() * 40), 2, 1); q.fillStyle = '#fff'; for (let i = 0; i < 30; i++) q.fillRect(Math.floor(R() * 40), Math.floor(R() * 40), 1, 1); }
      else if (th.ground === 'grass') { q.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 40; i++) q.fillRect(Math.floor(R() * 40), Math.floor(R() * 40), 1, 2); }
      this.groundPat = null;
    }
    paintHorizon(f, R) {
      const th = this.th, kind = th.horizon, H = 40;
      const rect = (x, y, w, h, col) => { f.fillStyle = col; f.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
      if (kind === 'city' || kind === 'cityNight' || kind === 'synth') {
        for (const [col, hMin, hMax, step] of [[th.far2, 8, 22, 12], [th.far, 12, 34, 20]]) for (let x = 0; x < 480; x += step + Math.floor(R() * 8)) {
          const w = 8 + R() * 10, h = hMin + R() * (hMax - hMin); rect(x, H - h, w, h, col);
          if (kind === 'synth') { rect(x, H - h, w, 1, R() < .5 ? '#19e0f0' : '#ff3ea5'); rect(x, H - h, 1, h, 'rgba(25,224,240,.35)'); }
          else if (R() < .35) rect(x + w / 2, H - h - 5, 1, 5, th.far);
          if (kind === 'cityNight') { f.fillStyle = '#f0e090'; for (let k = 0; k < 5; k++) f.fillRect(Math.round(x + 1 + R() * (w - 3)), Math.round(H - h + 2 + R() * (h - 4)), 1, 1); }
          else if (kind === 'city') { f.fillStyle = 'rgba(255,255,255,.22)'; for (let yy = H - h + 3; yy < H - 2; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) f.fillRect(xx, yy, 1, 1); }
        }
      } else if (kind === 'hills') {
        for (const [col, base, amp] of [[th.far2, 14, 6], [th.far, 9, 5]]) { f.fillStyle = col; for (let x = 0; x < 480; x += 2) { const h = base + Math.sin(x * .03 + base) * amp + Math.sin(x * .09) * 2; f.fillRect(x, H - h, 2, h); } }
        f.fillStyle = '#2e1c3c'; for (let x = 6; x < 480; x += 13 + Math.floor(R() * 10)) { f.fillRect(x, H - 14, 1, 14); f.fillRect(x - 2, H - 15, 5, 2); f.fillRect(x - 1, H - 17, 3, 2); }
      } else if (kind === 'sea') {
        rect(0, 22, 480, 18, th.far); rect(0, 22, 480, 1, '#e8fbff');
        for (let y = 24; y < 40; y += 3) { f.fillStyle = y % 6 ? th.far2 : th.far; f.fillRect(0, y, 480, 1); }
        f.fillStyle = '#e8fbff'; for (let i = 0; i < 90; i++) f.fillRect(Math.floor(R() * 480), 24 + Math.floor(R() * 15), 2 + Math.floor(R() * 3), 1);
        f.fillStyle = '#2e8a5a'; f.beginPath(); f.ellipse(120, 22, 22, 7, 0, Math.PI, 0); f.fill(); f.beginPath(); f.ellipse(355, 22, 30, 9, 0, Math.PI, 0); f.fill(); f.fillStyle = '#3aa86c'; f.beginPath(); f.ellipse(355, 22, 18, 5, 0, Math.PI, 0); f.fill();
        for (const bx of [200, 430]) { f.fillStyle = '#fff'; f.beginPath(); f.moveTo(bx, 10); f.lineTo(bx, 21); f.lineTo(bx + 8, 21); f.fill(); f.fillStyle = '#e04a3a'; f.fillRect(bx - 2, 22, 11, 2); }
      } else if (kind === 'peaks') {
        for (const [col, sc, ofs] of [[th.far2, .75, 20], [th.far, 1, 0]]) for (let cx = ofs; cx < 500; cx += 58 + Math.floor(R() * 30)) {
          const h = (16 + R() * 20) * sc, hw = h * 1.05;
          for (let y = 0; y < h; y++) { const w = (y / h) * hw; f.fillStyle = col; f.fillRect(Math.round(cx - w), H - h + y, Math.round(w * 2), 1); if (y < h * .38) { f.fillStyle = '#f6fbff'; f.fillRect(Math.round(cx - w + (y % 3 === 0 ? 2 : 0)), H - h + y, Math.round(w * 2 - (y % 3 === 0 ? 4 : 0)), 1); } else { f.fillStyle = 'rgba(0,0,0,.14)'; f.fillRect(Math.round(cx), H - h + y, Math.round(w), 1); } }
        }
        f.fillStyle = '#2a5a3e'; for (let x = 0; x < 480; x += 7 + Math.floor(R() * 5)) { const h = 6 + R() * 6; for (let y = 0; y < h; y++) f.fillRect(Math.round(x - y * .35), H - h + y, Math.round(1 + y * .7), 1); }
      }
    }
    makeStand(R) {
      const th = this.th, w = 256, h = 56, c = cv(w, h), g = c.getContext('2d');
      g.fillStyle = th.stand[0]; g.fillRect(0, 7, w, h - 7);
      for (let tier = 0; tier < 3; tier++) {
        const y = TIER_Y[tier]; g.fillStyle = tier & 1 ? th.stand[0] : th.stand[1]; g.fillRect(0, y, w, 15);
        g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, y + 13, w, 2); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, y, w, 1);
        g.fillStyle = 'rgba(0,0,0,.14)'; for (let x = 4; x < w; x += 10) g.fillRect(x, y + 14 - 7, 1, 7);
      }
      g.fillStyle = 'rgba(255,255,255,.14)'; for (let x = 0; x < w; x += 64) g.fillRect(x, 8, 1, 46);
      g.fillStyle = '#d8d8e6'; g.fillRect(0, 53, w, 2); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 55, w, 1);
      // roof
      const rc = th.roofC; g.fillStyle = rc[0]; g.fillRect(0, 0, w, 7);
      if (th.roof === 'flat') { g.fillStyle = rc[1]; g.fillRect(0, 0, w, 2); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 6, w, 1); if (this.id === 'night') { g.fillStyle = 'rgba(255,236,150,.95)'; for (let x = 8; x < w; x += 32) g.fillRect(x, 3, 6, 2); } }
      else if (th.roof === 'striped') { for (let x = 0; x < w; x += 8) { g.fillStyle = (x / 8) & 1 ? '#fff' : rc[1]; g.fillRect(x, 0, 8, 5); g.fillRect(x + 1, 5, 6, 1); g.fillRect(x + 2, 6, 4, 1); } g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 4, w, 1); }
      else if (th.roof === 'parasol') { g.fillStyle = '#f5e6c0'; g.fillRect(0, 0, w, 7); for (let x = 6; x < w; x += 32) { const col = [rc[1], '#ffffff', '#17b3a3', '#ffc933'][(x / 32) & 3]; g.fillStyle = '#7a5a3a'; g.fillRect(x + 6, 3, 1, 5); g.fillStyle = col; g.fillRect(x, 3, 14, 1); g.fillRect(x + 1, 2, 12, 1); g.fillRect(x + 3, 1, 8, 1); g.fillRect(x + 5, 0, 4, 1); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x, 3, 14, 1); } }
      else if (th.roof === 'wood') { g.fillStyle = rc[1]; for (let y = 0; y < 7; y += 2) g.fillRect(0, y, w, 1); g.fillStyle = '#f6fbff'; g.fillRect(0, 0, w, 2); for (let x = 0; x < w; x += 6) g.fillRect(x, 2, 3, 1); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 6, w, 1); }
      else if (th.roof === 'neon') { g.fillStyle = 'rgba(25,224,240,.25)'; g.fillRect(0, 3, w, 4); g.fillStyle = rc[1]; g.fillRect(0, 5, w, 1); g.fillStyle = '#ff3ea5'; for (let x = 0; x < w; x += 16) g.fillRect(x, 1, 8, 1); }
      return c;
    }
    makePeople(R) {
      const th = this.th, out = [];
      for (let tier = 0; tier < 3; tier++) { const a = []; for (let i = 0; i < PEOPLE_N; i++) a.push({ on: R() > .1, c: th.crowd[Math.floor(R() * th.crowd.length)], s: SKINS[Math.floor(R() * SKINS.length)], h: HAIR[Math.floor(R() * HAIR.length)], ph: R(), hat: this.th.winter && R() < .5, fl: R() < .04 }); out.push(a); }
      return out;
    }
    tile(ctx, img, scroll, y, w) { const iw = img.width, x0 = -(((scroll % iw) + iw) % iw); for (let x = x0; x < w; x += iw) ctx.drawImage(img, Math.round(x), y); }
    drawCrowd(ctx, scroll, t, W) {
      const m = this.mood, c0 = Math.floor(scroll / COL_W) - 1, n = Math.ceil(W / COL_W) + 3, L = m.lvl, wv = m.wave, dim = this.th.dim;
      ctx.globalAlpha = dim;
      for (let tier = 0; tier < 3; tier++) {
        const feet = STAND_Y + TIER_Y[tier] + 13, row = this.ppl[tier];
        for (let i = 0; i < n; i++) {
          const col = c0 + i, p = row[((col % PEOPLE_N) + PEOPLE_N) % PEOPLE_N]; if (!p.on) continue;
          const x = Math.round(col * COL_W - scroll) + 1; let up = 0, arms = 0;
          if (wv > 0) { const u = (((col + tier * 4 - t * 24) % 72) + 72) % 72; if (u < 15) { const r = Math.sin(Math.PI * u / 15) * wv; if (r > .12) { up = Math.round(r * 5); arms = 1; } } }
          if (L > .22 && !up) { const jump = Math.max(0, Math.sin(t * (6 + p.ph * 4) + p.ph * 20)); up = Math.round(jump * (1 + L * 2)); if (p.ph < L * 1.1) arms = 1 + (Math.floor(t * 4 + p.ph * 8) & 1); }
          else if (!up && Math.sin(t * 1.5 + p.ph * 40) > .985) up = 1;
          const y = feet - up;
          ctx.fillStyle = p.c; ctx.fillRect(x, y - 5, 4, 5);
          ctx.fillStyle = p.s; ctx.fillRect(x + 1, y - 8, 3, 3);
          ctx.fillStyle = p.hat ? p.c : p.h; ctx.fillRect(x + 1, y - 9, 3, 1);
          if (p.hat) ctx.fillRect(x, y - 8, 1, 1);
          if (arms) { ctx.fillStyle = p.s; if (arms === 2) { ctx.fillRect(x - 1, y - 9, 1, 4); ctx.fillRect(x + 4, y - 7, 1, 3); } else { ctx.fillRect(x - 1, y - 7, 1, 3); ctx.fillRect(x + 4, y - 9, 1, 4); } }
          if (p.fl && L > .3) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, y - 12, 3, 2); ctx.fillStyle = '#d83030'; ctx.fillRect(x + 4, y - 12, 1, 2); }
        }
      }
      ctx.globalAlpha = 1;
    }
    /* sky, far horizon, grandstand with crowd, ad boards — everything above the track.  W = visible width */
    drawBack(ctx, camX, t, W = MG.W) {
      const th = this.th; this.tickMood();
      ctx.drawImage(this.sky, 0, 0, SW, 82); if (W > SW) { ctx.fillStyle = th.sky[0]; for (let x = SW; x < W; x += SW) ctx.drawImage(this.sky, x, 0, SW, 82); }
      if (th.stars && Math.floor(t * 2) % 2) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.floor((t * 7919) % W), 10 + Math.floor((t * 31) % 30), 1, 1); }
      this.tile(ctx, this.clouds, camX * .08 + t * 2, 6, W);
      this.tile(ctx, this.far, camX * .2, 26, W);
      if (th.horizon === 'sea') { ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 12; i++) ctx.fillRect(Math.round(((i * 53 + t * 9 * (1 + i % 3 * .3)) % (W + 20))), 29 + (i * 7) % 12, 3, 1); }
      if (th.pylons) { const pl = 360; for (let i = -1; i < 3; i++) { const x = Math.round(i * pl - ((camX * .3) % pl)) + 40; ctx.fillStyle = '#50506a'; ctx.fillRect(x, 4, 3, 60); ctx.fillStyle = '#70708c'; ctx.fillRect(x - 6, 2, 15, 6); ctx.fillStyle = th.lights ? '#fff8c0' : '#9090a8'; for (let k = 0; k < 5; k++) ctx.fillRect(x - 5 + k * 3, 3, 2, 4); if (th.lights) { ctx.fillStyle = this.id === 'neon' ? 'rgba(25,224,240,.14)' : 'rgba(255,240,170,.12)'; ctx.fillRect(x - 14, 8, 33, 30); } } }
      const scroll = camX * .45;
      this.tile(ctx, this.stand, scroll, STAND_Y, W);
      this.drawCrowd(ctx, scroll, t, W);
      if (th.flags) { const fp = 150; for (let i = -1; i < 4; i++) { const x = Math.round(i * fp - (scroll % fp)) + 14, fl = MG.flag(MG.COUNTRIES[(i + 9 + MG.COUNTRIES.length * 4) % MG.COUNTRIES.length].code); ctx.fillStyle = '#d8d8e4'; ctx.fillRect(x, 0, 1, 14); for (let s = 0; s < 16; s += 2) ctx.drawImage(fl, s, 0, 2, 10, x + 1 + s, 1 + Math.round(Math.sin(t * 4 + s * .45 + i) * 1.2), 2, 10); } }
      if (th.palms) for (let i = -1; i < 4; i++) { const x = Math.round(i * 150 - ((camX * .6) % 150)) + 30; ctx.fillStyle = '#7a5a3a'; for (let k = 0; k < 22; k++) ctx.fillRect(x + Math.round(Math.sin(k * .12) * 2), 66 - k, 2, 1); ctx.fillStyle = '#2aa04a'; for (let k = 0; k < 5; k++) { const a = -2.6 + k * .55, sw = Math.sin(t * 2 + i) * 1; for (let r = 1; r < 11; r++) ctx.fillRect(Math.round(x + 1 + Math.cos(a) * r + sw), Math.round(44 + Math.sin(a) * r * .6 + r * r * .035), 2, 1); } }
      if (th.pines) for (let i = -1; i < 6; i++) { const x = Math.round(i * 90 - ((camX * .7) % 90)) + 20; ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x + 4, 62, 2, 4); ctx.fillStyle = '#1e5a3c'; for (let k = 0; k < 4; k++) { const w = 4 + k * 3; ctx.fillRect(x + 5 - Math.floor(w / 2), 50 + k * 4, w, 4); } ctx.fillStyle = '#f6fbff'; ctx.fillRect(x + 3, 50, 4, 1); ctx.fillRect(x + 1, 54, 2, 1); }
      this.tile(ctx, this.ads, camX * .8, 66, W);
      if (th.snow) { ctx.fillStyle = '#fff'; for (let i = 0; i < 46; i++) { const x = ((i * 67 + t * (8 + i % 5) + Math.sin(t + i) * 6) % (W + 10)), y = (i * 37 + t * (16 + i % 7 * 4)) % 140; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); } }
      if (this.id === 'night') { ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 3; i++) { if (Math.random() < .5) ctx.fillRect(Math.floor(Math.random() * W), 14 + Math.floor(Math.random() * 40), 2, 2); } }
    }
    /* running surface between y0..y1 plus the ground below it (to y = bottom) */
    drawGround(ctx, camX, y0 = 78, y1 = 142, W = MG.W, bottom = MG.H) {
      const th = this.th;
      if (!this.trackPat) this.trackPat = ctx.createPattern(this.trackTex, 'repeat');
      ctx.save(); ctx.translate(-(((camX % 48) + 48) % 48), 0); ctx.fillStyle = this.trackPat; ctx.fillRect(0, y0, W + 48, y1 - y0); ctx.restore();
      ctx.fillStyle = th.track[1]; ctx.fillRect(0, y0, W, 1); ctx.fillStyle = this.id === 'neon' ? '#19e0f0' : '#f0ece0'; ctx.fillRect(0, y0 + 1, W, 1); ctx.fillRect(0, y1 - 1, W, 1); ctx.fillStyle = th.track[1]; ctx.fillRect(0, y1, W, 1);
      const gh = Math.max(0, bottom - y1 - 1);
      const gx0 = -(((camX % 40) + 40) % 40) - 40; for (let y = y1 + 1; y < bottom; y += 40) { const hh = Math.min(40, bottom - y); for (let x = gx0; x < W; x += 40) ctx.drawImage(this.groundTex, 0, 0, 40, hh, x, y, 40, hh); }
      if (th.grid) { ctx.fillStyle = 'rgba(25,224,240,.45)'; for (let x = -(((camX % 20) + 20) % 20); x < W; x += 20) ctx.fillRect(x, y1 + 1, 1, gh); for (let y = y1 + 6; y < bottom; y += 12) ctx.fillRect(0, y, W, 1); }
    }
  }
  return Stadium;
})();
