/* MAX GAMES — UI kit: sunny arcade look (cream cards, chunky coloured buttons, ink outlines), menu widgets, backdrop, event previews.
   Everything is laid out in full-canvas coordinates from MG.view, so it fits every screen shape. */
'use strict';
MG.UI = (() => {
  const F = MG.Font;
  const C = { ink: '#16213a', cream: '#fff3d6', cream2: '#f0d9a2', coral: '#ff5d4a', coralD: '#c23a2c', teal: '#17b3a3', tealD: '#0d7c72', sun: '#ffc933', sunD: '#d38f12', navy: '#22356b', navyD: '#142349', sky: '#4fb0f0', green: '#2fbf5a', red: '#e0443a', mute: '#6f7aa0' };
  const KINDS = {
    neutral: { f: C.cream, d: C.cream2, h: '#ffffff', t: C.ink },
    coral: { f: C.coral, d: C.coralD, h: '#ff9a8a', t: '#fff', sh: C.coralD },
    teal: { f: C.teal, d: C.tealD, h: '#6fe3d4', t: '#fff', sh: C.tealD },
    sun: { f: C.sun, d: C.sunD, h: '#ffe48a', t: C.ink },
    navy: { f: '#3a55a8', d: C.navy, h: '#6f8be0', t: '#fff', sh: C.navyD },
    dis: { f: '#8f98b2', d: '#727b96', h: '#a9b1c8', t: '#d8dcea' },
  };
  const fine = !matchMedia('(pointer:coarse)').matches, kb = { on: fine };
  const rr = (ctx, col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2); };
  const inR = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

  /* cream card with ink outline and drop shadow */
  function panel(ctx, x, y, w, h, o = {}) {
    ctx.fillStyle = 'rgba(6,10,28,.38)'; rr(ctx, 'rgba(6,10,28,.38)', x, y + 3, w, h);
    rr(ctx, C.ink, x, y, w, h); rr(ctx, o.fill || C.cream, x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = o.hi || 'rgba(255,255,255,.55)'; ctx.fillRect(x + 2, y + 1, w - 4, 1);
    if (o.head) { rr(ctx, o.headCol || C.navy, x + 1, y + 1, w - 2, 13); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(x + 2, y + 1, w - 4, 1); F.text(ctx, o.head, x + w / 2, y + 4, '#fff', 1, { align: 'center' }); }
  }
  function button(ctx, r, label, o = {}) {
    const k = KINDS[o.dis ? 'dis' : (o.kind || 'neutral')], p = o.press ? 2 : 0, x = r.x, y = r.y, w = r.w, h = r.h, fh = h - 3, sc = o.scale || 1;
    if (o.sel) rr(ctx, C.sun, x - 1, y + p - 1, w + 2, fh + 2);
    rr(ctx, C.ink, x, y + 3, w, fh);
    rr(ctx, C.ink, x, y + p, w, fh); rr(ctx, k.f, x + 1, y + p + 1, w - 2, fh - 2);
    ctx.fillStyle = k.d; ctx.fillRect(x + 1, y + p + Math.round(fh * .58), w - 2, fh - 1 - Math.round(fh * .58)); ctx.fillStyle = k.h; ctx.fillRect(x + 2, y + p + 1, w - 4, 1);
    const ty = y + p + Math.round((fh - 7 * sc) / 2);
    if (label != null) F.text(ctx, label, Math.round(x + w / 2), ty, k.t, sc, { align: 'center', shadow: k.sh });
    if (o.sel) { const b = Math.round(Math.sin(performance.now() / 120) * 1.4); F.text(ctx, '}', x + 3 + b, ty, k.t, sc); F.text(ctx, '{', x + w - 3 - 5 * sc - b, ty, k.t, sc); }
  }
  /* big stroked headline, e.g. a screen title */
  function title(ctx, str, y, o = {}) {
    const sc = o.scale || 2, V = MG.view, cx = o.cx != null ? o.cx : V.W / 2;
    F.text(ctx, str, cx, y, o.col || '#fff', sc, { align: 'center', shadow: o.shadow || C.coral, outline: C.ink, ext: sc >= 3 ? 2 : 1 });
    return y + 7 * sc + sc * 2 + 2;
  }
  function label(ctx, str, x, y, col = C.ink, o = {}) { F.text(ctx, str, x, y, col, o.scale || 1, o); }
  function wrap(str, maxW, sc = 1) { const words = str.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (F.width(t, sc) > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
  function chip(ctx, str, cx, y, bg, fg = '#fff', sc = 1) { const w = F.width(str, sc) + 8; rr(ctx, C.ink, Math.round(cx - w / 2) - 1, y - 1, w + 2, 7 * sc + 6); rr(ctx, bg, Math.round(cx - w / 2), y, w, 7 * sc + 4); F.text(ctx, str, cx, y + 2, fg, sc, { align: 'center' }); }

  /* shared screen layout: content column, footer row for BACK / actions */
  function L() {
    const V = MG.view, P = V.portrait, cw = Math.min(V.W - 12, P ? 208 : 300), bottom = V.H - (P ? Math.ceil(12 / V.s) : 4), fh = P ? 21 : 19;
    return { V, P, cw, x: Math.round((V.W - cw) / 2), y0: V.top + 4, fy: bottom - fh, fh, bottom, cy1: bottom - fh - 5 };
  }

  /* vertical stack of buttons / value rows with keyboard, mouse and touch support */
  class Menu {
    constructor(items) { this.items = items; this.sel = 0; this.rects = []; this.press = -1; }
    dis(i) { const d = this.items[i].disabled; return typeof d === 'function' ? d() : !!d; }
    layout(x, y, w, h, gap = 4) { this.rects = this.items.map((_, i) => ({ x, y: y + i * (h + gap), w, h })); this.bottom = y + this.items.length * (h + gap) - gap; return this; }
    move(dir) { let n = this.sel; for (let k = 0; k < this.items.length; k++) { n = (n + dir + this.items.length) % this.items.length; if (!this.dis(n)) break; } if (n !== this.sel) { this.sel = n; MG.Audio.sfx.move(); } }
    render(ctx, t) {
      this.items.forEach((it, i) => {
        const r = this.rects[i]; if (!r) return; const dis = this.dis(i), sel = kb.on && i === this.sel && !dis, lab = typeof it.label === 'function' ? it.label() : it.label, o = { kind: it.kind || (it.value ? 'neutral' : 'coral'), sel: sel && !it.value, dis, scale: it.scale || 1, press: this.press === i };
        if (it.value) {
          button(ctx, r, null, Object.assign(o, { sel: false })); if (sel) { ctx.fillStyle = C.sun; ctx.fillRect(r.x - 1, r.y + 3, 1, r.h - 7); ctx.fillRect(r.x + r.w, r.y + 3, 1, r.h - 7); ctx.fillRect(r.x + 2, r.y - 1, r.w - 4, 1); }
          const ty = r.y + Math.round((r.h - 3 - 7) / 2), v = it.value(), vw = F.width(v) + 12;
          F.text(ctx, lab, r.x + 6, ty, dis ? '#d8dcea' : C.ink, 1);
          const vx = r.x + r.w - vw - 4; rr(ctx, C.ink, vx - 1, r.y + 2, vw + 2, r.h - 7); rr(ctx, it.good === false ? C.coral : C.teal, vx, r.y + 3, vw, r.h - 9); F.text(ctx, v, vx + vw / 2, ty, '#fff', 1, { align: 'center' });
          if (it.left) { F.text(ctx, '{', vx - 8, ty, C.ink, 1); }
        } else button(ctx, r, lab, o);
        if (it.sub) F.text(ctx, it.sub, r.x + r.w - 5, r.y + 4, 'rgba(255,255,255,.8)', 1, { align: 'right' });
      });
    }
    fire(i, x) {
      const it = this.items[i], r = this.rects[i]; this.sel = i;
      if (it.value && (it.left || it.right)) { if (x != null && x < r.x + r.w * .4 && it.left) it.left(); else if (it.right) it.right(); else if (it.left) it.left(); MG.Audio.sfx.move(); return true; }
      if (it.ok) { MG.Audio.sfx.select(); it.ok(); return true; } return false;
    }
    onInput(ev) {
      if (ev.type === 'down') {
        const it = this.items[this.sel];
        if (ev.act === 'up') { kb.on = true; this.move(-1); return true; } if (ev.act === 'down') { kb.on = true; this.move(1); return true; }
        if (ev.act === 'left' && it.left) { kb.on = true; it.left(); MG.Audio.sfx.move(); return true; } if (ev.act === 'right' && it.right) { kb.on = true; it.right(); MG.Audio.sfx.move(); return true; }
        if (ev.act === 'ok' && !this.dis(this.sel)) { kb.on = true; return this.fire(this.sel, null); }
      }
      if (ev.type === 'pdown' || ev.type === 'pmove') {
        const i = this.rects.findIndex(q => inR(q, ev.x, ev.y)); if (i < 0 || this.dis(i)) return false;
        if (ev.type === 'pmove') { this.sel = i; if (fine) kb.on = true; return false; }
        if (!fine) kb.on = false; this.press = i; setTimeout(() => { if (this.press === i) this.press = -1; }, 120); return this.fire(i, ev.x);
      }
      return false;
    }
  }
  /* bottom bar: BACK on the left, optional actions on the right */
  class Footer {
    constructor(back, actions = []) { this.back = back; this.actions = actions; this.rects = []; this.press = -1; }
    layout() {
      const l = L(), n = this.actions.length, aw = n ? Math.min(Math.floor((l.cw - 66 - 4 * n) / n), 110) : 0; this.rects = [];
      if (this.back) this.rects.push({ x: l.x, y: l.fy, w: 58, h: l.fh, act: this.back, label: '{ BACK', kind: 'navy' });
      this.actions.forEach((a, i) => this.rects.push({ x: l.x + l.cw - (n - i) * aw - (n - 1 - i) * 4, y: l.fy, w: aw, h: l.fh, act: a.ok, label: a.label, kind: a.kind || 'coral', dis: a.disabled }));
    }
    render(ctx) { this.layout(); for (const r of this.rects) button(ctx, r, r.label, { kind: r.kind, dis: r.dis && r.dis(), press: this.press === r }); }
    onInput(ev) {
      if (ev.type === 'pdown') { this.layout(); const r = this.rects.find(q => inR(q, ev.x, ev.y)); if (r && !(r.dis && r.dis())) { if (!fine) kb.on = false; this.press = r; setTimeout(() => { if (this.press === r) this.press = null; }, 120); if (r.act === this.back) MG.Audio.sfx.back(); else MG.Audio.sfx.select(); r.act(); return true; } }
      return false;
    }
  }

  /* ---------------- animated backdrop: the stadium with runners passing by (menu scenes) ---------------- */
  class Backdrop {
    constructor() { this.t = 0; this.runners = [0, 1, 2, 3].map(i => ({ pal: MG.Sprites.palette(MG.COUNTRIES[(i * 4 + 1) % 16].code, i), lane: [1, 2, 3, 0][i], x0: i * 90, sp: .85 })); this.demo = false; this.next = 4; }
    update(dt) { this.t += dt; }
    draw(ctx, st, dim = .35, noRunners = false) {
      const V = MG.view, T = MG.TRACK, cam = this.t * 22, oy = V.top; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = st.th.sky[0]; ctx.fillRect(0, 0, V.W, V.H);
      if (this.demo) { if (this.t > this.next) { this.next = this.t + 15; st.cheer(.5, 5, 6); } }
      ctx.translate(0, oy); st.drawBack(ctx, cam, this.t, V.W); st.drawGround(ctx, cam, T.y0, T.y1, V.W, V.H - oy);
      ctx.fillStyle = st.id === 'neon' ? 'rgba(25,224,240,.8)' : 'rgba(240,236,224,.9)'; for (let i = 1; i < T.lanes; i++) ctx.fillRect(0, Math.round(T.y0 + T.laneH * i), V.W, 1);
      if (!noRunners) for (const r of this.runners) { const x = ((r.x0 + this.t * 62) % (V.W + 140)) - 70, y = T.feet(r.lane), ph = (this.t * 2.6 + r.x0) % 1; MG.Sprites.shadow(ctx, x, y - 1, 8); MG.Sprites.athlete(ctx, { pal: r.pal, pose: 'run', poseT: ph, sp: r.sp }, x, y); }
      ctx.translate(0, -oy);
      if (dim) { ctx.fillStyle = `rgba(10,18,44,${dim})`; ctx.fillRect(0, 0, V.W, V.H); }
      ctx.restore();
    }
  }

  /* ---------------- small animated event previews (half-size athletes) ---------------- */
  const prePal = [MG.Sprites.palette('GER', 0), MG.Sprites.palette('BRA', 1), MG.Sprites.palette('USA', 5)];
  function mini(ctx, pal, pose, pt, sp, fx, fy) { const fr = MG.Sprites.frame(pal, pose, pt, sp); ctx.drawImage(fr, Math.round(fx - 13), Math.round(fy - 22), 28, 25); }
  function preview(ctx, id, x, y, w, h, t) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const gy = y + Math.round(h * .42), ty = y + Math.round(h * .5), fy = y + h - 5;
    const g = ctx.createLinearGradient(0, y, 0, gy); g.addColorStop(0, '#4fb0f0'); g.addColorStop(1, '#bfe6fb'); ctx.fillStyle = g; ctx.fillRect(x, y, w, gy - y);
    ctx.fillStyle = '#5d6286'; ctx.fillRect(x, gy - 8, w, 8); for (let i = 0; i < w; i += 3) { ctx.fillStyle = ['#e03a3a', '#f2c230', '#3a8ae0', '#f4f4f4'][(i / 3 | 0) % 4]; ctx.fillRect(x + i, gy - 7 + ((i / 3 | 0) * 7 % 5), 2, 2); }
    ctx.fillStyle = id === 'discus' || id === 'javelin' ? '#3f9f40' : '#cf5b36'; ctx.fillRect(x, gy, w, h - (gy - y));
    if (id === 'discus' || id === 'javelin') { ctx.fillStyle = '#348f37'; for (let i = 0; i < w; i += 14) ctx.fillRect(x + i, gy, 7, h - (gy - y)); }
    else { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x, ty + 6, w, 1); ctx.fillRect(x, ty + 16, w, 1); }
    if (id === 'swimming' || id === 'rowing' || id === 'cycling') {
      const sw = id === 'swimming', ro = id === 'rowing'; ctx.fillStyle = sw ? '#35b8ea' : ro ? '#2f86a8' : '#d9a066'; ctx.fillRect(x, gy, w, h - (gy - y)); ctx.fillStyle = sw || ro ? 'rgba(255,255,255,.4)' : 'rgba(120,70,30,.4)';
      for (let i = 0; i < 14; i++) ctx.fillRect(Math.round(x + ((i * 11 + t * (sw || ro ? 8 : 40)) % w)), gy + 3 + (i * 5) % (h - (gy - y) - 4), 3, 1);
      const pal = prePal[id === 'swimming' ? 1 : id === 'rowing' ? 0 : 2], ph = (t * (sw ? 1.6 : ro ? .9 : 2.4)) % 1;
      MG.SportSprites.draw(ctx, id, { pal, poseT: ph }, x + w * .5 + Math.sin(t) * 6, fy - (sw ? 2 : ro ? 0 : 1), 1);
    } else if (id === 'sprint') {
      ctx.fillStyle = '#fff'; ctx.fillRect(x + w - 8, gy, 2, h); prePal.forEach((p, i) => mini(ctx, p, 'run', (t * 2.8 + i * .3) % 1, .9, x + 12 + ((t * 30 + i * 12) % (w - 22)), fy - 8 + i * 4));
    } else if (id === 'longjump') {
      ctx.fillStyle = '#ecd49c'; ctx.fillRect(x + w * .55, ty + 2, w, 18); ctx.fillStyle = '#f4f2ea'; ctx.fillRect(x + w * .55 - 2, ty + 2, 2, 18);
      const k = (t * .5) % 1; if (k < .75) { const q = k / .75; mini(ctx, prePal[1], q < .08 ? 'run' : 'jumpair', q < .08 ? (t * 3) % 1 : q, 1, x + 8 + q * w * .6, fy - 3 - Math.sin(q * Math.PI) * 12); } else mini(ctx, prePal[1], 'sit', 0, 0, x + w * .66, fy - 3);
    } else if (id === 'discus') {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 18, fy - 1, 7, 0, 6.3); ctx.stroke(); const k = (t * .6) % 1;
      mini(ctx, prePal[2], k < .6 ? 'discus' : 'discusrel', (t * 1.6) % 1, 0, x + 18, fy - 1);
      if (k > .6) { const q = (k - .6) / .4; ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x + 24 + q * (w - 30)), Math.round(fy - 14 - Math.sin(q * Math.PI) * 14 + q * 6), 3, 1); ctx.fillStyle = '#ffd23a'; ctx.fillRect(Math.round(x + 24 + q * (w - 30)), Math.round(fy - 13 - Math.sin(q * Math.PI) * 14 + q * 6), 3, 1); }
    } else if (id === 'javelin') {
      const k = (t * .55) % 1; mini(ctx, prePal[0], k < .55 ? 'run' : 'jthrow', k < .55 ? (t * 3) % 1 : (k - .55) / .2, .9, x + 12 + Math.min(k, .55) * 28, fy);
      if (k > .6) { const q = Math.min(1, (k - .6) / .4), jx = x + 26 + q * (w - 32), jy = fy - 14 - Math.sin(q * Math.PI) * 12 + q * 8, a = Math.atan2(-Math.cos(q * Math.PI) * 12 + 8, w - 32); ctx.fillStyle = '#f4f0e8'; for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(jx - Math.cos(a) * i), Math.round(jy - Math.sin(a) * i), 1, 1); }
      else { ctx.fillStyle = '#f4f0e8'; ctx.fillRect(Math.round(x + 14 + Math.min(k, .55) * 28), Math.round(fy - 18), 8, 1); }
    } else {
      for (let i = 0; i < 3; i++) { const hx = x + ((i * 26 - t * 26) % (w + 26) + (w + 26)) % (w + 26) - 10; ctx.fillStyle = '#f4f4f4'; ctx.fillRect(hx, fy - 9, 7, 2); ctx.fillStyle = '#d83030'; ctx.fillRect(hx + 2, fy - 9, 2, 2); ctx.fillStyle = '#c8c8d8'; ctx.fillRect(hx, fy - 7, 1, 7); ctx.fillRect(hx + 6, fy - 7, 1, 7); }
      const k = (t * 1.1) % 1; mini(ctx, prePal[2], k < .5 ? 'hurdle' : 'run', k < .5 ? k * 2 : (t * 3) % 1, .9, x + 22, fy - (k < .5 ? Math.sin(k * 2 * Math.PI) * 4 : 0));
    }
    ctx.restore();
  }
  return { C, KINDS, kb, rr, inR, panel, button, title, label, wrap, chip, L, Menu, Footer, Backdrop, preview, mini };
})();
