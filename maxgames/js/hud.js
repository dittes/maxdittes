/* MAX GAMES — HUD widgets: digital stopwatch, segmented speed meter, rhythm/power meter, progress tracker, banners. */
'use strict';
MG.HUD = (() => {
  const F = MG.Font, clamp = MG.clamp;
  function panel(ctx, x, y, w, h, a = .62) { ctx.fillStyle = `rgba(14,24,56,${Math.min(.92, a + .12)})`; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#fff3d6'; ctx.fillRect(x + 1, y, w - 2, 1); ctx.fillRect(x + 1, y + h - 1, w - 2, 1); ctx.fillRect(x, y + 1, 1, h - 2); ctx.fillRect(x + w - 1, y + 1, 1, h - 2); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 2, y + 1, w - 4, 1); }
  function timer(ctx, t, cx, y, label = '') {
    const s = MG.fmtTime(Math.max(0, t)), w = 62; panel(ctx, cx - w / 2, y, w, 17, .78);
    F.text(ctx, s, cx, y + 3, '#7dff8a', 2, { align: 'center', shadow: '#0a3a14' });
    if (label) F.text(ctx, label, cx, y + 19, '#fff', 1, { align: 'center', shadow: '#000' });
  }
  function speed(ctx, x, y, v, w = 96) {
    const kmh = v * 3.6, n = Math.floor((w - 8) / 4), fill = Math.round(clamp(kmh / 48, 0, 1) * n);
    panel(ctx, x - 3, y - 11, w, 31, .6); F.text(ctx, 'SPEED', x, y - 8, '#bfe6fb', 1);
    F.text(ctx, kmh.toFixed(1), x + w - 8, y - 8, '#fff', 1, { align: 'right' }); F.text(ctx, 'KM/H', x + w - 8, y + 10, '#8aa0c8', 1, { align: 'right' });
    for (let i = 0; i < n; i++) { ctx.fillStyle = i < fill ? (i < n * .5 ? '#40d860' : i < n * .77 ? '#f0d030' : '#f05030') : '#25305a'; ctx.fillRect(x + i * 4, y + 1, 3, 7); if (i < fill) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + i * 4, y + 1, 3, 1); } }
  }
  /* rhythm meter: bar fill = drive, marker = raw cadence, green zone = optimum; L/R lamps show the next expected key */
  function rhythm(ctx, x, y, m, now, pw = 98, label = 'RHYTHM') {
    const w = pw - 6; panel(ctx, x - 3, y - 11, w + 6, 31, .6); F.text(ctx, label, x, y - 8, '#bfe6fb', 1);
    const f = clamp(m.drive / 1.15, 0, 1);
    ctx.fillStyle = '#25305a'; ctx.fillRect(x, y + 1, w, 7);
    ctx.fillStyle = '#5a1a1a'; ctx.fillRect(x, y + 1, Math.round(w * .4), 7); ctx.fillStyle = '#6a5a1a'; ctx.fillRect(x + Math.round(w * .4), y + 1, Math.round(w * .35), 7); ctx.fillStyle = '#1a5a2a'; ctx.fillRect(x + Math.round(w * .75), y + 1, w - Math.round(w * .75), 7);
    ctx.fillStyle = f < .4 ? '#f05030' : f < .75 ? '#f0d030' : '#40ff70'; ctx.fillRect(x, y + 2, Math.round(w * f), 5);
    ctx.fillStyle = '#fff'; const mk = x + Math.round(clamp(m.cad / (m.copt * 1.15), 0, 1) * w); ctx.fillRect(mk, y, 1, 9);
    F.text(ctx, 'TAPS/S', x + w - 2, y + 10, '#8aa0c8', 1, { align: 'right' }); F.text(ctx, m.cad.toFixed(1), x + w - 2, y - 8, '#fff', 1, { align: 'right' });
  }
  /* distance panel: same look as speed / rhythm; track bar with every athlete's position */
  function distance(ctx, x, y, w, aths, L, pos, dist) {
    panel(ctx, x - 3, y - 11, w, 31, .6); F.text(ctx, 'DISTANCE', x, y - 8, '#bfe6fb', 1); F.text(ctx, dist.toFixed(1) + 'M', x + w - 8, y - 8, '#fff', 1, { align: 'right' });
    if (pos) F.text(ctx, pos, x + w - 8, y + 10, aths.length > 1 && pos === '1ST' ? '#ffe040' : '#8aa0c8', 1, { align: 'right' });
    const bw = w - 14; ctx.fillStyle = '#25305a'; ctx.fillRect(x, y + 4, bw, 3); ctx.fillStyle = '#fff3d6'; ctx.fillRect(x, y + 2, 1, 7); ctx.fillRect(x + bw, y + 2, 2, 7);
    const hum = aths.find(a => a.isHuman); for (const a of aths) { if (a === hum) continue; const px = x + clamp(a.x / L, 0, 1) * bw; ctx.fillStyle = a.pal.shirt; ctx.fillRect(Math.round(px) - 1, y + 3, 3, 5); }
    if (hum) { const px = Math.round(x + clamp(hum.x / L, 0, 1) * bw); ctx.fillStyle = '#16213a'; ctx.fillRect(px - 2, y + 1, 5, 9); ctx.fillStyle = '#ffc933'; ctx.fillRect(px - 1, y + 2, 3, 7); }
  }
  /* discus release meter: needle sweeps across the bar and wraps around; green = release zone, red = cage */
  function releaseBar(ctx, x, y, pw, off, half) {
    const w = pw - 6, PI = Math.PI, X = a => x + Math.round((a + PI) / (2 * PI) * w);
    panel(ctx, x - 3, y - 11, pw, 31, .6); F.text(ctx, 'RELEASE', x, y - 8, '#bfe6fb', 1);
    ctx.fillStyle = '#7a2a2a'; ctx.fillRect(x, y + 1, w, 7); ctx.fillStyle = '#6a5a1a'; ctx.fillRect(X(-1.25), y + 1, X(1.25) - X(-1.25), 7); ctx.fillStyle = '#2fbf5a'; ctx.fillRect(X(-half), y + 1, X(half) - X(-half), 7); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(X(-half), y + 1, X(half) - X(-half), 1);
    const px = X(off); ctx.fillStyle = '#16213a'; ctx.fillRect(px - 2, y - 1, 5, 11); ctx.fillStyle = '#ffc933'; ctx.fillRect(px - 1, y, 3, 9);
    F.text(ctx, 'THROW IN GREEN', x + w / 2, y + 12, '#8aa0c8', 1, { align: 'center' });
  }
  function banner(ctx, text, y = 52, col = '#ffe040', scale = 3) {
    const bob = Math.sin(performance.now() / 120) * 1; F.text(ctx, text, MG.W / 2, y + bob, col, scale, { align: 'center', shadow: '#000', outline: '#16213a' });
  }
  function nameTag(ctx, a, x, y) { const f = MG.flag(a.country); ctx.drawImage(f, Math.round(x - 8), Math.round(y)); }
  return { panel, timer, speed, rhythm, distance, releaseBar, banner, nameTag };
})();
