/* MAX GAMES — on-canvas touch controls (big pixel-art LEFT / RIGHT / JUMP buttons in the free area under the track). */
'use strict';
MG.Controls = (() => {
  const F = MG.Font, active = {}; let lastMode = null;
  function visible(mode) { const V = MG.view; return (mode === 'run' || mode === 'run+jump') && (V.touch || V.portrait); }
  MG.jumpLabel = 'JUMP';
  function rects(mode) {
    const V = MG.view, jump = mode === 'run+jump', out = [], pad = 4;
    if (V.portrait) {
      const y0 = V.stripY + (V.dashH || 0) + 4, y1 = V.H - pad - Math.ceil(8 / V.s), h = Math.min(y1 - y0, 230), top = y1 - h, jh = jump ? 54 : 0, gap = 5;
      if (jump) out.push({ act: 'jump', label: MG.jumpLabel, x: pad, y: top, w: V.W - pad * 2, h: jh });
      const ry = top + (jump ? jh + gap : 0), rh = y1 - ry, hw = (V.W - pad * 2 - gap) / 2;
      out.push({ act: 'left', label: 'LEFT', x: pad, y: ry, w: hw, h: rh }, { act: 'right', label: 'RIGHT', x: pad + hw + gap, y: ry, w: hw, h: rh });
    } else {
      const h = Math.max(30, V.H - V.stripY - 2 * pad), y = V.H - pad - h, W = V.W;
      if (jump) { const lw = Math.round(W * .36); out.push({ act: 'left', label: 'LEFT', x: pad, y, w: lw, h }, { act: 'jump', label: MG.jumpLabel, x: pad + lw + 6, y, w: W - pad * 2 - lw * 2 - 12, h }, { act: 'right', label: 'RIGHT', x: W - pad - lw, y, w: lw, h }); }
      else out.push({ act: 'left', label: 'LEFT', x: pad, y, w: W / 2 - pad - 3, h }, { act: 'right', label: 'RIGHT', x: W / 2 + 3, y, w: W / 2 - pad - 3, h });
    }
    return out;
  }
  /* chunky pixel arrow, 10u wide, centred on cx/cy */
  function arrow(ctx, cx, cy, size, dir, col, sh) {
    const u = Math.max(2, Math.floor(size / 10));
    const paint = (c, ox, oy) => {
      ctx.fillStyle = c;
      for (let j = 0; j < 5; j++) { const h = (j + 1) * 2 - 1, x = dir < 0 ? cx - 5 * u + j * u : cx + 5 * u - (j + 1) * u; ctx.fillRect(x + ox, cy - Math.floor(h / 2) * u + oy, u, h * u); }
      ctx.fillRect((dir < 0 ? cx : cx - 5 * u) + ox, cy - Math.floor(3 / 2) * u + oy, 5 * u, 3 * u);
    };
    if (sh) paint(sh, u, u); paint(col, 0, 0);
  }
  function draw(ctx, mode) {
    if (!visible(mode)) return; const down = new Set(Object.values(active)), UI = MG.UI;
    for (const r of rects(mode)) {
      const p = down.has(r.act); UI.button(ctx, r, null, { kind: p ? 'sun' : 'teal', press: p });
      const fh = r.h - 3, y = r.y + (p ? 2 : 0), c = p ? UI.C.ink : '#fff', sym = r.act === 'left' ? '{' : r.act === 'right' ? '}' : null;
      if (sym) { arrow(ctx, r.x + r.w / 2, y + fh / 2 - (r.h > 70 ? 8 : 0), Math.min(r.h * .6, r.w * .5), sym === '{' ? -1 : 1, c, p ? null : UI.C.tealD); if (r.h > 70) F.text(ctx, r.label, r.x + r.w / 2, y + fh - 17, c, 1, { align: 'center' }); }
      else { const sc = r.h > 40 ? 3 : 2; F.text(ctx, r.label, r.x + r.w / 2, y + Math.round((fh - 7 * sc) / 2), c, sc, { align: 'center', shadow: p ? null : UI.C.tealD }); }
    }
  }
  function release() { for (const id in active) MG.Input.release(active[id], 'btn' + id); for (const id in active) delete active[id]; }
  /* returns true if the pointer event was consumed by a button */
  function handle(ev, mode) {
    if (lastMode !== mode) { release(); lastMode = mode; }
    if (ev.type === 'pup') { if (active[ev.id]) { const a = active[ev.id]; delete active[ev.id]; MG.Input.release(a, 'btn' + ev.id); return true; } return false; }
    if (!visible(mode)) return false;
    if (ev.type === 'pdown') { for (const r of rects(mode)) if (ev.x >= r.x && ev.x < r.x + r.w && ev.y >= r.y && ev.y < r.y + r.h) { active[ev.id] = r.act; MG.Input.press(r.act, 'btn' + ev.id); return true; } }
    return false;
  }
  return { draw, handle, release, visible };
})();
