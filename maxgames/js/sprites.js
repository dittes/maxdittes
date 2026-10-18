/* MAX GAMES — SpriteRenderer: animated 16-bit style pixel-art athletes, generated from a tiny skeleton.
   Every frame is rasterised without anti-aliasing, outlined, cached and blitted. */
'use strict';
MG.Sprites = (() => {
  const D = Math.PI / 180, OUT = '#1c1428', cache = new Map();
  const clamp = MG.clamp;
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const r = clamp(Math.round((n >> 16) * k), 0, 255), g = clamp(Math.round(((n >> 8) & 255) * k), 0, 255), b = clamp(Math.round((n & 255) * k), 0, 255); return `rgb(${r},${g},${b})`; }
  function palette(code, look) {
    const c = MG.country(code), l = MG.LOOKS[look % MG.LOOKS.length];
    return { id: code + look, shirt: c.c1, shirtD: shade(c.c1, .78), shorts: c.c2, shortsD: shade(c.c2, .78), skin: l.skin, skinD: shade(l.skin, .8), hair: l.hair, style: l.style, shoe: '#f4f0e8', sole: '#c03a2a', trim: c.c2 };
  }
  /* thick Bresenham line with a square brush */
  function thick(g, x0, y0, x1, y1, th, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); g.fillStyle = col;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, o = Math.floor(th / 2);
    for (let i = 0; i < 200; i++) { g.fillRect(x0 - o, y0 - o, th, th); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  function disc(g, cx, cy, r, col) { g.fillStyle = col; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + .4) g.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1); }
  function outline(c) {
    const g = c.getContext('2d'), w = c.width, h = c.height, id = g.getImageData(0, 0, w, h), d = id.data, o = new Uint8ClampedArray(d.length);
    const oc = [0x1c, 0x14, 0x28];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (d[i + 3] > 0) continue;
      const nb = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && d[(yy * w + xx) * 4 + 3] > 0;
      if (nb(x - 1, y) || nb(x + 1, y) || nb(x, y - 1) || nb(x, y + 1)) { o[i] = oc[0]; o[i + 1] = oc[1]; o[i + 2] = oc[2]; o[i + 3] = 255; }
    }
    for (let i = 0; i < d.length; i += 4) if (o[i + 3]) { d[i] = o[i]; d[i + 1] = o[i + 1]; d[i + 2] = o[i + 2]; d[i + 3] = 255; }
    g.putImageData(id, 0, 0);
  }
  /* ---------------- skeleton rasteriser ---------------- */
  function rasterise(pal, p) {
    const c = document.createElement('canvas'); c.width = 56; c.height = 50; const g = c.getContext('2d'), ox = 26, oy = 44;
    const P = (x, y) => [ox + x, oy - y];
    const lean = (p.lean || 0) * D, hip = { x: p.hx || 0, y: p.hy };
    const TL = 9, sho = { x: hip.x + Math.sin(lean) * TL, y: hip.y + Math.cos(lean) * TL };
    const neck = { x: hip.x + Math.sin(lean) * (TL + 1.6), y: hip.y + Math.cos(lean) * (TL + 1.6) };
    const ha = (p.lean + (p.headTilt || 0)) * D, head = { x: neck.x + Math.sin(ha) * 2.6, y: neck.y + Math.cos(ha) * 2.6 };
    const leg = l => { const a = l[0] * D, f = l[1] * D, knee = { x: hip.x + Math.sin(a) * 8, y: hip.y - Math.cos(a) * 8 }, b = a - f, ank = { x: knee.x + Math.sin(b) * 8, y: knee.y - Math.cos(b) * 8 }; return { knee, ank, b }; };
    const arm = a_ => { const a = a_[0] * D, f = a_[1] * D, s = { x: sho.x, y: sho.y - 1.6 }, el = { x: s.x + Math.sin(a) * 5.5, y: s.y - Math.cos(a) * 5.5 }, b = a + f, hand = { x: el.x + Math.sin(b) * 5.5, y: el.y - Math.cos(b) * 5.5 }; return { s, el, hand }; };
    const L = { n: leg(p.nearLeg), f: leg(p.farLeg) }, A = { n: arm(p.nearArm), f: arm(p.farArm) };
    const line = (a, b, th, col) => { const [x0, y0] = P(a.x, a.y), [x1, y1] = P(b.x, b.y); thick(g, x0, y0, x1, y1, th, col); };
    const drawLeg = (l, far) => {
      const skin = far ? pal.skinD : pal.skin, shorts = far ? pal.shortsD : pal.shorts, t = { x: hip.x + (l.knee.x - hip.x) * .42, y: hip.y + (l.knee.y - hip.y) * .42 };
      line(hip, l.knee, 3, skin); line(l.knee, l.ank, 2, skin); line(hip, t, 4, shorts);
      const [ax, ay] = P(l.ank.x, l.ank.y), fx = Math.cos(l.b) * 4, fy = Math.sin(l.b) * 4; thick(g, ax, ay - 1, ax + fx, ay - 1 - fy, 2, far ? shade(pal.shoe, .8) : pal.shoe);
      g.fillStyle = pal.sole; g.fillRect(Math.round(ax + fx - 1), Math.round(ay - 1 - fy + 1), 2, 1);
    };
    const drawArm = (a, far) => { const skin = far ? pal.skinD : pal.skin; line(a.s, a.el, 2, far ? pal.shirtD : pal.shirt); line(a.el, a.hand, 2, skin); const [hx, hy] = P(a.hand.x, a.hand.y); g.fillStyle = skin; g.fillRect(Math.round(hx), Math.round(hy), 2, 2); };
    drawArm(A.f, true); drawLeg(L.f, true);
    // torso: shirt, shorts band and a trim stripe
    line(hip, sho, 5, pal.shirt);
    { const [tx, ty] = P(hip.x, hip.y); thick(g, tx, ty, tx + Math.sin(lean) * 2.5, ty - Math.cos(lean) * 2.5, 5, pal.shorts); const [sx, sy] = P(sho.x, sho.y); g.fillStyle = pal.trim; g.fillRect(Math.round(sx - 2), Math.round(sy), 5, 1); g.fillStyle = shade(pal.shirt, 1.18); g.fillRect(Math.round(sx - 1), Math.round(sy + 1), 2, 1); }
    drawLeg(L.n, false);
    // head
    { const [hx, hy] = P(head.x, head.y); disc(g, hx, hy, 3, pal.skin); g.fillStyle = pal.skinD; g.fillRect(Math.round(hx + 1), Math.round(hy + 2), 2, 1);
      g.fillStyle = pal.hair; const st = pal.style;
      for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { if (x * x + y * y > 9.4) continue; const back = x < 0 || y < -1; if ((st === 3 && (y < -1)) || (st === 0 && (y < -1 || x < -1)) || (st === 1 && (y < -1 || x < 0)) || (st === 2 && (y < -1 || x < 0))) g.fillRect(Math.round(hx + x), Math.round(hy + y), 1, 1); }
      if (st === 1) { for (const [x, y] of [[-3, -3], [-2, -4], [0, -4], [2, -3], [-4, -1], [-4, 1], [-3, -2]]) g.fillRect(Math.round(hx + x), Math.round(hy + y), 1, 1); }
      if (st === 2) { for (let i = 0; i < 6; i++) g.fillRect(Math.round(hx - 3 - i * .6), Math.round(hy - 1 + i * .8), 2, 1); }
      g.fillStyle = '#1a1220'; g.fillRect(Math.round(hx + 1), Math.round(hy - 0), 1, 1); g.fillStyle = '#c0605a'; g.fillRect(Math.round(hx + 2), Math.round(hy + 1.5), 1, 1); }
    drawArm(A.n, false);
    if (p.prop === 'jav') { const hd = A.n.hand, dx = Math.cos(.44), dy = Math.sin(.44), L0 = 9, L1 = 18; const [x0, y0] = P(hd.x - L0 * dx, hd.y - L0 * dy), [x1, y1] = P(hd.x + L1 * dx, hd.y + L1 * dy); thick(g, x0, y0, x1, y1, 1, '#f6f2e6'); const [x2, y2] = P(hd.x + (L1 - 3) * dx, hd.y + (L1 - 3) * dy); thick(g, x2, y2, x1, y1, 1, '#ff5d4a'); }
    outline(c); return c;
  }
  /* ---------------- poses (angles in degrees; legs/arms measured from straight-down, positive = forward) ---------------- */
  const legAt = (th, sp) => [8 * sp + (28 + 34 * sp) * Math.sin(th), 14 + (46 + 44 * sp) * Math.max(0, Math.cos(th - .2))];
  const POSES = {
    run(ph, sp) { const th = ph * 2 * Math.PI, sw = (28 + 30 * sp), bob = Math.abs(Math.cos(th)) * 1.4 * sp; return { hy: 15 - 1.4 * sp + bob, lean: 4 + 18 * sp, nearLeg: legAt(th, sp), farLeg: legAt(th + Math.PI, sp), nearArm: [-sw * Math.sin(th), 85], farArm: [sw * Math.sin(th), 85], headTilt: -(4 + 12 * sp) * .6 }; },
    walk(ph) { const th = ph * 2 * Math.PI; return { hy: 15.8, lean: 3, nearLeg: [20 * Math.sin(th), 6 + 18 * Math.max(0, Math.cos(th))], farLeg: [-20 * Math.sin(th), 6 + 18 * Math.max(0, -Math.cos(th))], nearArm: [-16 * Math.sin(th), 18], farArm: [16 * Math.sin(th), 18] }; },
    stand(t) { const b = Math.sin(t * 3) * .4; return { hy: 16 + b * .3, lean: 0, nearLeg: [2, 4], farLeg: [-3, 2], nearArm: [5 + b, 10], farArm: [-4, 10] }; },
    marks() { return { hx: -1, hy: 8, lean: 70, nearLeg: [62, 118], farLeg: [8, 96], nearArm: [1, 0], farArm: [6, 0], headTilt: -40 }; },
    set(t) { const b = Math.sin(t * 9) * .15; return { hx: 0, hy: 11 + b, lean: 66, nearLeg: [48, 92], farLeg: [-8, 36], nearArm: [0, 0], farArm: [4, 0], headTilt: -42 }; },
    celebrate(t) { const s = Math.sin(t * 9); return { hy: 16 + Math.abs(Math.sin(t * 6)) * 3.5, lean: -3, nearLeg: [12 + 6 * s, 6], farLeg: [-12 - 6 * s, 6], nearArm: [168 + 12 * s, 8], farArm: [168 - 12 * s, 8], headTilt: -8 }; },
    dejected(t) { return { hy: 15, lean: 24, nearLeg: [4, 6], farLeg: [-4, 4], nearArm: [8, 10], farArm: [-2, 12], headTilt: 34 }; },
    slump(t) { return { hy: 14, lean: 42, nearLeg: [24, 30], farLeg: [10, 24], nearArm: [32, 18], farArm: [26, 22], headTilt: 24 + Math.sin(t * 5) * 3 }; },
    stumble(t) { const s = Math.sin(t * 22); return { hy: 14, lean: 36 + 6 * s, nearLeg: [14 + 22 * s, 40], farLeg: [-14 - 22 * s, 38], nearArm: [70 * s, 40], farArm: [-70 * s, 40], headTilt: -15 }; },
    hurdle(ph) { const s = Math.sin(Math.PI * clamp(ph, 0, 1)); return { hy: 16 + 6 * s, lean: 12 + 26 * s, nearLeg: [24 + 66 * s, 78 * (1 - s) + 4], farLeg: [-20 + 8 * s, 98], nearArm: [-34 * s - 10, 40], farArm: [40 + 34 * s, 58], headTilt: -14 * s }; },
    takeoff() { return { hy: 19, lean: 8, nearLeg: [78, 95], farLeg: [-28, 6], nearArm: [-40, 80], farArm: [70, 60] }; },
    hang(t) { const w = Math.sin(t * 14) * 6; return { hy: 22, lean: -8, nearLeg: [-22 + w, 52], farLeg: [-32 - w, 62], nearArm: [165 + w, 10], farArm: [152 - w, 15], headTilt: -10 }; },
    kick() { return { hy: 20, lean: 32, nearLeg: [80, 8], farLeg: [74, 14], nearArm: [68, 10], farArm: [58, 10], headTilt: -22 }; },
    sit() { return { hx: -3, hy: 5, lean: 22, nearLeg: [84, 6], farLeg: [80, 10], nearArm: [-24, 30], farArm: [-14, 30], headTilt: 5 }; },
    discus(ph) { const th = ph * 2 * Math.PI, c = Math.cos(th), sn = Math.sin(th); return { hy: 12.5 + Math.abs(sn) * .8, lean: 12 * sn, nearLeg: [26 * c, 48], farLeg: [-26 * c, 52], nearArm: [112 * sn, 8], farArm: [-96 * sn, 22], headTilt: 5 * sn }; },
    discusrel() { return { hy: 15, lean: 24, nearLeg: [34, 36], farLeg: [-22, 70], nearArm: [104, 6], farArm: [-62, 30], headTilt: -10 }; },
    wave(t) { return { hy: 16, lean: 0, nearLeg: [2, 4], farLeg: [-3, 2], nearArm: [150 + 25 * Math.sin(t * 11), 40], farArm: [-4, 10], headTilt: -4 }; },
  };
  const mix = (a, b, k) => { const o = {}; for (const key in a) { if (Array.isArray(a[key])) o[key] = a[key].map((v, i) => MG.lerp(v, b[key][i], k)); else o[key] = MG.lerp(a[key] || 0, b[key] || 0, k); } return o; };
  const JT = [{ hy: 15, lean: -14, nearLeg: [30, 40], farLeg: [-34, 30], nearArm: [-95, 10], farArm: [70, 30], headTilt: 4 }, { hy: 17, lean: 26, nearLeg: [40, 20], farLeg: [-10, 60], nearArm: [150, 20], farArm: [-40, 60], headTilt: -6 }, { hy: 13, lean: 44, nearLeg: [50, 40], farLeg: [-30, 70], nearArm: [40, 10], farArm: [-20, 20], headTilt: -12 }];
  function poseParams(name, t, sp, extra) {
    if (name === 'jthrow') { t = clamp(t, 0, 1); return t < .5 ? mix(JT[0], JT[1], t / .5) : mix(JT[1], JT[2], (t - .5) / .5); }
    if (name === 'jumpair') { // long-jump flight: takeoff → hang → kick, t = flight progress 0..1
      const A = POSES.takeoff(), B = POSES.hang(t * 3), C = POSES.kick();
      if (t < .28) return mix(A, B, t / .28); if (t < .68) return B; return mix(B, C, (t - .68) / .32);
    }
    return POSES[name](t, sp, extra);
  }
  function frame(pal, name, t, sp, extra) {
    const q = name === 'run' || name === 'discus' ? Math.round((t % 1) * 20) % 20 : Math.round(t * 18); const sq = Math.round(clamp(sp || 0, 0, 1) * 4);
    const key = pal.id + '|' + name + '|' + q + '|' + sq + (extra || ''); let c = cache.get(key);
    if (!c) { if (cache.size > 2500) cache.clear(); const tt = name === 'run' || name === 'walk' || name === 'discus' ? q / 20 : q / 18; const pp = poseParams(name, name === 'jumpair' ? clamp(t, 0, 1) : tt, sq / 4, extra); if (extra === 'jav') { pp.prop = 'jav'; if (name !== 'jthrow') pp.nearArm = [60, 120]; } c = rasterise(pal, pp); cache.set(key, c); }
    return c;
  }
  /* draw athlete with ground contact at (sx, sy) */
  function athlete(ctx, a, sx, sy) { const f = frame(a.pal, a.pose, a.poseT, a.sp, a.poseExtra); ctx.drawImage(f, Math.round(sx - 26), Math.round(sy - 44)); }
  function shadow(ctx, sx, sy, w = 9, a = .28) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(Math.round(sx - w), Math.round(sy), w * 2, 2); ctx.fillRect(Math.round(sx - w + 2), Math.round(sy + 2), w * 2 - 4, 1); }

  /* ---------------- misc icons ---------------- */
  function medal(ctx, type, x, y, s = 1) {
    const col = { gold: ['#f6d24a', '#c89a1a'], silver: ['#dfe3ea', '#9aa0ae'], bronze: ['#d68a4a', '#9a5a22'] }[type]; if (!col) return;
    ctx.fillStyle = '#d83a3a'; ctx.fillRect(x - 3 * s, y - 7 * s, 2 * s, 5 * s); ctx.fillStyle = '#2a4fc0'; ctx.fillRect(x + 1 * s, y - 7 * s, 2 * s, 5 * s);
    ctx.fillStyle = col[1]; ctx.beginPath(); ctx.arc(x, y + 1 * s, 5 * s, 0, 6.3); ctx.fill(); ctx.fillStyle = col[0]; ctx.beginPath(); ctx.arc(x - .5 * s, y + .5 * s, 4 * s, 0, 6.3); ctx.fill();
    ctx.fillStyle = col[1]; ctx.fillRect(x - 1 * s, y - 1 * s, 2 * s, 4 * s);
  }
  function trophy(ctx, x, y) { ctx.fillStyle = '#c89a1a'; ctx.fillRect(x - 5, y, 10, 2); ctx.fillRect(x - 1, y - 5, 2, 5); ctx.fillStyle = '#f6d24a'; ctx.fillRect(x - 6, y - 14, 12, 9); ctx.fillRect(x - 8, y - 12, 2, 4); ctx.fillRect(x + 6, y - 12, 2, 4); ctx.fillStyle = '#fff6b0'; ctx.fillRect(x - 4, y - 13, 2, 6); }
  return { palette, frame, athlete, shadow, medal, trophy, disc, shade, outline, thick };
})();
