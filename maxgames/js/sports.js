/* MAX GAMES — swimming, cycling and rowing.  They run on the tap-to-race engine (RaceEvent) with their own physics (MG.SPORTS),
   their own scenes (pool, wooden track, rowing course) and small procedural sprites (swimmer, cyclist, single scull). */
'use strict';
MG.SportSprites = (() => {
  const cache = new Map(), TAU = Math.PI * 2;
  function px(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function line(g, x0, y0, x1, y1, col, th = 1) { MG.Sprites.thick(g, x0, y0, x1, y1, th, col); }
  function make(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); MG.Sprites.outline(c); return c; }
  /* swimmer facing right, water surface at row 9 */
  function swimmer(pal, ph) {
    return make(30, 16, g => {
      const a = ph * TAU, s = Math.sin(a), c = Math.cos(a);
      px(g, 5, 8, 12, 2, pal.skin); px(g, 5, 9, 12, 1, pal.skinD);
      px(g, 17, 6, 4, 4, pal.skin); px(g, 17, 5, 4, 2, pal.shirt); px(g, 20, 8, 1, 1, '#1a1220');
      const sx = 16, sy = 8;
      if (s > -.15) line(g, sx, sy, sx + c * 7 + 2, sy - Math.max(.3, s) * 7, pal.skin, 2); else px(g, sx + 1, sy, 3, 1, pal.skinD);
      const a2 = a + Math.PI, s2 = Math.sin(a2), c2 = Math.cos(a2);
      if (s2 > -.15) line(g, sx - 1, sy, sx - 1 + c2 * 7 + 2, sy - Math.max(.3, s2) * 7, pal.skinD, 2);
      for (let i = 0; i < 4; i++) px(g, 2 + ((i * 2 + Math.floor(ph * 8)) % 6), 7 + (i % 2) * 2, 1, 1, '#ffffff');
      if (s > .1 && s < .7) { px(g, sx + c * 7 + 3, sy + 1, 2, 1, '#fff'); px(g, sx + c * 7 + 5, sy - 1, 1, 1, '#fff'); }
    });
  }
  /* cyclist facing right, wheels touch row 21 */
  function cyclist(pal, ph) {
    return make(30, 24, g => {
      const a = ph * TAU, wheel = (cx, cy) => { for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = x * x + y * y; if (d <= 20 && d >= 11) px(g, cx + x, cy + y, 1, 1, '#2a2a36'); } for (let k = 0; k < 2; k++) { const aa = a * 1.4 + k * Math.PI / 2; line(g, cx - Math.cos(aa) * 3, cy - Math.sin(aa) * 3, cx + Math.cos(aa) * 3, cy + Math.sin(aa) * 3, '#c8c8d8'); } };
      wheel(6, 17); wheel(23, 17);
      const fr = pal.shirt, bb = [14, 17], seat = [11, 10], head = [20, 10], bar = [21, 9];
      line(g, 6, 17, bb[0], bb[1], fr); line(g, bb[0], bb[1], seat[0], seat[1], fr); line(g, seat[0], seat[1], 6, 17, fr); line(g, seat[0], seat[1], head[0], head[1], fr); line(g, bb[0], bb[1], head[0], head[1], fr); line(g, head[0], head[1], 23, 17, '#c8c8d8'); px(g, 9, 9, 4, 1, '#222');
      const foot = k => [bb[0] + Math.cos(a + k * Math.PI) * 3, bb[1] + Math.sin(a + k * Math.PI) * 3], hip = [11, 8];
      for (const k of [1, 0]) { const f = foot(k), kn = [(hip[0] + f[0]) / 2 + 2, (hip[1] + f[1]) / 2 - 1]; line(g, hip[0], hip[1], kn[0], kn[1], k ? pal.shortsD : pal.shorts, 2); line(g, kn[0], kn[1], f[0], f[1], k ? pal.skinD : pal.skin); px(g, f[0], f[1], 2, 1, '#222'); }
      line(g, hip[0], hip[1], 18, 5, pal.shirt, 3); line(g, 18, 5, bar[0], bar[1], pal.skin);
      px(g, 18, 1, 4, 4, pal.skin); px(g, 17, 0, 5, 2, pal.shorts); px(g, 21, 2, 1, 1, '#1a1220');
    });
  }
  /* single scull facing right; the rower sits facing the stern */
  function scull(pal, ph) {
    return make(46, 20, g => {
      const a = ph * TAU, lean = Math.cos(a), hull = '#f4f1e8';
      px(g, 3, 13, 40, 2, hull); px(g, 1, 14, 4, 1, hull); px(g, 41, 14, 4, 1, hull); px(g, 6, 15, 33, 1, '#c9c4b4'); px(g, 3, 13, 40, 1, pal.shirt);
      const hip = [23, 12], sh = [hip[0] + lean * 4, 5 + (1 - Math.abs(lean)) * 0], hd = [sh[0] - 1, sh[1] - 4];
      line(g, hip[0], hip[1], sh[0], sh[1], pal.shirt, 3);
      const kn = [hip[0] - 5 + lean * 2, 10 - (lean < 0 ? 1 : 0)]; line(g, hip[0], hip[1], kn[0], kn[1], pal.shorts, 2); line(g, kn[0], kn[1], 15, 13, pal.skin);
      px(g, hd[0] - 1, hd[1], 3, 3, pal.skin); px(g, hd[0] - 1, hd[1] - 1, 3, 1, pal.hair || '#222');
      const hand = [sh[0] - 6 - lean * 3, 9]; line(g, sh[0], sh[1] + 1, hand[0], hand[1], pal.skin);
      const th = .9 * lean, blade = [23 + Math.sin(th) * 12 - 8, 14 + Math.cos(th) * 3 + 3]; line(g, hand[0], hand[1], blade[0], blade[1], '#5a3a1a');
      const inWater = lean > -.2; px(g, blade[0] - 1, blade[1], 4, 2, inWater ? pal.shirt : '#fff'); if (inWater && lean > .3) { px(g, blade[0] - 3, blade[1] + 1, 1, 1, '#fff'); px(g, blade[0] + 4, blade[1], 1, 1, '#fff'); }
    });
  }
  const gens = { swimming: [swimmer, 16], cycling: [cyclist, 22], rowing: [scull, 14] };
  /* draw the athlete of a sport; feet = baseline y (surface / wheel contact), 2x pixel size */
  function draw(ctx, sport, a, x, y, sc) {
    if (!sc) sc = sport === 'swimming' ? 1 : 2; const [fn, base] = gens[sport], q = Math.round(((a.poseT % 1 + 1) % 1) * 16) % 16, key = sport + a.pal.id + q; let c = cache.get(key);
    if (!c) { if (cache.size > 900) cache.clear(); c = fn(a.pal, q / 16); cache.set(key, c); }
    const cx = c.width / 2, by = sport === 'swimming' ? 9 : sport === 'cycling' ? 21 : 15;
    ctx.drawImage(c, Math.round(x - cx * sc), Math.round(y - by * sc), c.width * sc, c.height * sc);
  }
  return { draw };
})();

MG.SportRace = class SportRace extends MG.RaceEvent {
  constructor(game, cfg) { super(game, cfg); this.sportId = cfg.id; this.dashH = 72; }
  poseFor(a, h) { a.animateRun(h); a.sp = MG.clamp(a.model.v / a.model.Vm, 0, 1); if (!a.started && !a.finished) a.poseT = this.simT * .3; }
  laneY(l) { const T = MG.TRACK; return Math.round(T.y0 + T.laneH * l + T.laneH / 2) + 3; }
  /* ------------------------------------------------ scenes */
  drawScene(ctx, v) {
    const st = this.stadium, T = MG.TRACK, cam = v.cam, PPM = MG.PPM, sx = x => Math.round(x * PPM - cam), W = MG.W, sp = this.sportId, t = v.simT;
    st.drawBack(ctx, cam, t); st.drawGround(ctx, cam, T.y0, T.y1);
    const y0 = T.y0, y1 = T.y1;
    if (sp === 'swimming' || sp === 'rowing') {
      const sw = sp === 'swimming'; ctx.fillStyle = sw ? '#e9e2cf' : '#6a8a4a'; ctx.fillRect(0, y0 - 1, W, 1); ctx.fillRect(0, y1, W, MG.H - y1);
      if (sw) { ctx.fillStyle = '#d4ccb4'; for (let x = -(((cam % 24) + 24) % 24); x < W; x += 24) { ctx.fillRect(x + 12, y1, 1, MG.H - y1); } for (let y = y1 + 12; y < MG.H; y += 12) ctx.fillRect(0, y, W, 1); }
      else { ctx.fillStyle = '#58783a'; for (let x = -(((cam % 30) + 30) % 30); x < W; x += 30) ctx.fillRect(x, y1 + 2, 14, MG.H - y1); }
      const gr = ctx.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, sw ? '#35b8ea' : '#2f86a8'); gr.addColorStop(1, sw ? '#1f8fd0' : '#206a88'); ctx.fillStyle = gr; ctx.fillRect(0, y0, W, y1 - y0);
      ctx.fillStyle = sw ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.2)'; for (let i = 0; i < 60; i++) { const x = ((i * 53 - cam * (.9 + (i % 3) * .06) + Math.sin(t * 2 + i) * 3) % (W + 20) + W + 20) % (W + 20), y = y0 + 2 + (i * 29) % (y1 - y0 - 3); ctx.fillRect(Math.round(x), Math.round(y), 3 + (i % 3), 1); }
      if (sw) { ctx.fillStyle = 'rgba(10,40,90,.35)'; for (let l = 0; l < T.lanes; l++) ctx.fillRect(0, Math.round(y0 + T.laneH * (l + .5)), W, 1); }
      for (let i = 1; i < T.lanes; i++) { const yy = Math.round(y0 + T.laneH * i); for (let x = -(((cam % 8) + 8) % 8); x < W; x += 4) { ctx.fillStyle = ((x + Math.round(cam)) >> 2) & 1 ? '#e8403a' : '#f4f4f4'; ctx.fillRect(x, yy, 4, 2); } }
      for (let m = 10; m < this.L; m += 10) { const x = sx(m); if (x < -20 || x > W + 20) continue; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x, y1 - 3, 1, 3); MG.Font.text(ctx, m, x, y1 + 4, 'rgba(60,70,90,.9)', 1, { align: 'center' }); }
      const x0 = sx(0); if (x0 > -30 && x0 < W + 30) for (let l = 0; l < T.lanes; l++) { ctx.fillStyle = '#4a4a5a'; ctx.fillRect(x0 - 5, Math.round(y0 + T.laneH * l) + 3, 6, 8); ctx.fillStyle = '#7a7a8c'; ctx.fillRect(x0 - 5, Math.round(y0 + T.laneH * l) + 3, 6, 2); }
      const fl = sx(this.L); if (fl > -40 && fl < W + 40) { ctx.fillStyle = sw ? '#f4f4f4' : '#fff'; ctx.fillRect(fl, y0 - 1, 5, y1 - y0 + 1); for (let l = 0; l < T.lanes; l++) { ctx.fillStyle = '#ffd23a'; ctx.fillRect(fl - 2, Math.round(y0 + T.laneH * l) + 3, 3, 8); } ctx.fillStyle = '#16213a'; for (let y = y0 - 6; y < y1; y += 4) ctx.fillRect(fl + 4, y, 1, 2); MG.Font.text(ctx, 'FINISH', fl + 2, y0 - 16, '#fff', 1, { align: 'center', shadow: '#16213a' }); }
    } else {
      ctx.fillStyle = '#d9a066'; ctx.fillRect(0, y0, W, y1 - y0); ctx.fillStyle = 'rgba(120,70,30,.35)'; for (let x = -(((cam % 14) + 14) % 14); x < W; x += 14) ctx.fillRect(x, y0, 1, y1 - y0); ctx.fillStyle = '#4a7fd0'; ctx.fillRect(0, y1 - 5, W, 3); ctx.fillStyle = '#e8403a'; ctx.fillRect(0, y0 + 2, W, 2);
      for (let i = 1; i < T.lanes; i++) { ctx.fillStyle = '#f4efe0'; ctx.fillRect(0, Math.round(y0 + T.laneH * i), W, 1); }
      for (let m = 20; m < this.L; m += 20) { const x = sx(m); if (x < -20 || x > W + 20) continue; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x, y1 - 4, 1, 4); MG.Font.text(ctx, m, x, y1 + 4, 'rgba(255,255,255,.85)', 1, { align: 'center' }); }
      const sl = sx(0); ctx.fillStyle = '#f4f0e4'; ctx.fillRect(sl, y0 + 1, 2, y1 - y0 - 1);
      const fl = sx(this.L); if (fl > -40 && fl < W + 40) { for (let y = y0 + 1; y < y1 - 1; y += 3) { ctx.fillStyle = ((y - y0) / 3 | 0) & 1 ? '#fff' : '#1a1a1a'; ctx.fillRect(fl, y, 3, 3); ctx.fillStyle = ((y - y0) / 3 | 0) & 1 ? '#1a1a1a' : '#fff'; ctx.fillRect(fl + 3, y, 3, 3); } ctx.fillStyle = '#1c1c2c'; ctx.fillRect(fl - 14, 48, 36, 11); ctx.fillStyle = '#ffd84a'; ctx.fillRect(fl - 13, 49, 34, 9); MG.Font.text(ctx, 'FINISH', fl + 4, 50, '#c02020', 1, { align: 'center' }); }
    }
    const lanes = v.ath.map((a, i) => ({ a, i })).sort((p, q) => p.a.lane - q.a.lane);
    for (const { a } of lanes) {
      const x = sx(a.x); if (x < -50 || x > W + 50) continue; const y = sp === 'cycling' ? MG.TRACK.feet(a.lane) + 2 : this.laneY(a.lane) + (sp === 'rowing' ? 4 : 0);
      if (sp === 'cycling') MG.Sprites.shadow(ctx, x, y, 12); MG.SportSprites.draw(ctx, sp, a, x, y);
      if (sp === 'swimming' && a.sp > .15) { ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 5; i++) ctx.fillRect(x - 24 - i * 3 - ((t * 20 + i * 5) % 6 | 0), y + (i % 2) * 2, 2, 1); }
      if (sp === 'rowing' && a.sp > .15) { ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 40 - i * 4, y + 1 + (i % 2), 3, 1); }
      const fy = y - (sp === 'cycling' ? 50 : sp === 'swimming' ? 17 : 34);
      ctx.globalAlpha = .95; ctx.drawImage(MG.flag(a.country), x - 8, fy); ctx.globalAlpha = 1;
    }
  }
};
