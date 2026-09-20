/* Arch Attack — Ragdoll-Bogenschießen mit Matter.js-Physik
   (c) maxdittes.com */
'use strict';
// --- Kompatibilität für ältere Browser (Safari < 16.4 kennt roundRect nicht)
(function () {
  const rr = function (x, y, w, h, r) {
    if (Array.isArray(r)) r = r[0];
    r = Math.min(Math.abs(r || 0), Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y); this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r); this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h); this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r); this.quadraticCurveTo(x, y, x + r, y);
    return this;
  };
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = rr;
  if (typeof Path2D !== 'undefined' && !Path2D.prototype.roundRect) Path2D.prototype.roundRect = rr;
})();
// --- Fehler sichtbar machen statt schwarzem Bildschirm
window.addEventListener('error', e => showFatal(e.message));
window.addEventListener('unhandledrejection', e => showFatal(e.reason && e.reason.message));
let fatalShown = false;
function showFatal(msg) {
  if (fatalShown) return; fatalShown = true;
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:auto 10px 10px 10px;z-index:99;background:rgba(200,30,50,.95);color:#fff;padding:12px 14px;border-radius:14px;font:14px system-ui;line-height:1.4';
  d.textContent = 'Fehler: ' + (msg || 'unbekannt') + ' — bitte Seite neu laden (Strg/Cmd + Shift + R).';
  d.onclick = () => d.remove();
  (document.body || document.documentElement).appendChild(d);
}
if (typeof Matter === 'undefined') showFatal('matter.min.js wurde nicht geladen');
const { Engine, Bodies, Body, Composite, Constraint } = Matter;

// ---------------------------------------------------------------- Konstanten
const G = 1000;            // Schwerkraft px/s² (entspricht Matter gravity 1)
const DT = 1 / 60;
const LEVELS_PER_WORLD = 30;
const WORLDS = 10;
const MAX_LEVEL = LEVELS_PER_WORLD * WORLDS; // 300

// ---------------------------------------------------------------- Helfer
const rnd = Math.random;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(r = rnd) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function pick(arr, r = rnd) { return arr[Math.floor(r() * arr.length)]; }
function fmt(n) { return Math.floor(n).toLocaleString('de-DE'); }

// Segment gegen Kreis -> t in [0,1] oder null
function segCircle(ax, ay, bx, by, cx, cy, r) {
  const dx = bx - ax, dy = by - ay, fx = ax - cx, fy = ay - cy;
  const a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 0;
  if (a === 0) return null;
  let disc = b * b - 4 * a * c; if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
// Kürzester Abstand zweier Segmente, liefert {d, s} (s = Parameter auf Segment 1)
function segSeg(p1x, p1y, q1x, q1y, p2x, p2y, q2x, q2y) {
  const d1x = q1x - p1x, d1y = q1y - p1y, d2x = q2x - p2x, d2y = q2y - p2y;
  const rx = p1x - p2x, ry = p1y - p2y;
  const a = d1x * d1x + d1y * d1y, e = d2x * d2x + d2y * d2y, f = d2x * rx + d2y * ry;
  let s, t;
  if (a < 1e-9 && e < 1e-9) { s = t = 0; }
  else if (a < 1e-9) { s = 0; t = clamp(f / e, 0, 1); }
  else {
    const c = d1x * rx + d1y * ry;
    if (e < 1e-9) { t = 0; s = clamp(-c / a, 0, 1); }
    else {
      const b = d1x * d2x + d1y * d2y, den = a * e - b * b;
      s = den !== 0 ? clamp((b * f - c * e) / den, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); }
      else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
    }
  }
  const cx = p1x + d1x * s - (p2x + d2x * t), cy = p1y + d1y * s - (p2y + d2y * t);
  return { d: Math.hypot(cx, cy), s };
}
// Segment gegen konvexes Polygon (Cyrus-Beck) -> t oder null
function segPoly(ax, ay, bx, by, verts) {
  let cx = 0, cy = 0; const n = verts.length;
  for (const v of verts) { cx += v.x; cy += v.y; } cx /= n; cy /= n;
  let tE = 0, tL = 1; const dx = bx - ax, dy = by - ay;
  for (let i = 0; i < n; i++) {
    const v1 = verts[i], v2 = verts[(i + 1) % n];
    let nx = v2.y - v1.y, ny = -(v2.x - v1.x);
    if (nx * (v1.x - cx) + ny * (v1.y - cy) < 0) { nx = -nx; ny = -ny; }
    const num = nx * (ax - v1.x) + ny * (ay - v1.y);
    const den = nx * dx + ny * dy;
    if (Math.abs(den) < 1e-9) { if (num > 0) return null; continue; }
    const t = -num / den;
    if (den < 0) { if (t > tE) tE = t; } else { if (t < tL) tL = t; }
    if (tE > tL) return null;
  }
  return tE;
}
// Impuls (px/s * Masse) auf Matter-Körper an Punkt
function applyImpulse(body, px, py, ix, iy) {
  if (body.isStatic) return;
  const dvx = ix / body.mass / 60, dvy = iy / body.mass / 60;
  Body.setVelocity(body, { x: body.velocity.x + dvx, y: body.velocity.y + dvy });
  const rx = px - body.position.x, ry = py - body.position.y;
  const dw = (rx * iy - ry * ix) / body.inertia / 60;
  Body.setAngularVelocity(body, clamp(body.angularVelocity + dw * 40, -0.6, 0.6));
}

// ---------------------------------------------------------------- Audio (WebAudio-Synth)
const Sfx = {
  ctx: null, master: null, on: true, noiseBuf: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  ok() { return this.ctx && this.on; },
  tone(f, dur, type = 'sine', vol = 0.25, slide = null, delay = 0) {
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol = 0.3, freq = 1200, ftype = 'lowpass', delay = 0, freqEnd = null) {
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.05);
  },
  brass(f, start, dur, vol = 0.16) {
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime + start;
    const flt = c.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 2;
    flt.frequency.setValueAtTime(500, t); flt.frequency.linearRampToValueAtTime(3200, t + 0.05); flt.frequency.linearRampToValueAtTime(1600, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    for (const det of [-6, 6, 0]) { const o = c.createOscillator(); o.type = det ? 'sawtooth' : 'square'; o.frequency.value = f; o.detune.value = det; o.connect(flt); o.start(t); o.stop(t + dur + 0.2); }
    flt.connect(g); g.connect(this.master);
  },
  twang(p = 1) { this.tone(180 * p, 0.18, 'triangle', 0.25, 90 * p); this.noise(0.12, 0.12, 2500, 'bandpass', 0, 600); },
  whoosh() { this.noise(0.25, 0.08, 800, 'bandpass', 0, 2400); },
  hit() { this.tone(140, 0.12, 'sine', 0.35, 60); this.noise(0.08, 0.2, 900); },
  head() { this.tone(900, 0.12, 'square', 0.12, 1400); this.tone(140, 0.15, 'sine', 0.35, 50); },
  wood() { this.tone(420, 0.06, 'square', 0.1, 200); this.noise(0.05, 0.15, 3000, 'highpass'); },
  block() { this.tone(1200, 0.15, 'triangle', 0.15, 700); this.tone(1800, 0.1, 'sine', 0.08); },
  pop() { this.tone(500, 0.08, 'sine', 0.25, 1400); },
  heal() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.18, null, i * 0.07)); },
  coin() { this.tone(988, 0.08, 'square', 0.08); this.tone(1318, 0.18, 'square', 0.08, null, 0.07); },
  jump() { this.tone(260, 0.15, 'sine', 0.15, 520); },
  explode() { this.noise(0.7, 0.5, 900, 'lowpass', 0, 80); this.tone(90, 0.5, 'sine', 0.4, 30); },
  zap() { this.noise(0.25, 0.25, 4000, 'bandpass'); this.tone(1400, 0.2, 'sawtooth', 0.08, 200); },
  splash() { this.noise(0.4, 0.2, 1500, 'lowpass', 0, 300); },
  hurt() { this.tone(300, 0.2, 'sawtooth', 0.15, 120); },
  roar() { this.tone(110, 0.9, 'sawtooth', 0.2, 55); this.noise(0.9, 0.2, 400, 'lowpass'); },
  click() { this.tone(700, 0.05, 'square', 0.06); },
  buy() { [659, 784, 988, 1318].forEach((f, i) => this.tone(f, 0.12, 'square', 0.07, null, i * 0.06)); },
  fanfare() {
    const n = [[392, 0, .13], [392, .15, .13], [392, .3, .13], [523, .45, .5], [466, 1.0, .15], [523, 1.17, .15], [659, 1.34, .9]];
    n.forEach(([f, s, d]) => this.brass(f, s, d));
    this.brass(523, 1.34, .9, 0.1); this.brass(784, 1.34, .9, 0.09);
    for (let i = 0; i < 10; i++) this.noise(0.05, 0.12, 5000, 'highpass', 0.95 + i * 0.035);
    this.noise(1.2, 0.18, 6000, 'highpass', 1.34, 3000);
  },
  lose() { [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.2, f * 0.97, i * 0.28)); },
};

// ---------------------------------------------------------------- Speicherstand
const SAVE_KEY = 'archattack_v1';
const defaultSave = () => ({ coins: 0, stars: {}, best: 0, bow: 'holz', bows: ['holz'], armor: 0, armors: [0], helm: 0, helms: [0], up: { hp: 0, sta: 0, reg: 0, rel: 0, pull: 0, dmg: 0, aim: 0 }, sound: true, tut: false });
let save = defaultSave();
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) save = Object.assign(defaultSave(), s, { up: Object.assign(defaultSave().up, s.up || {}) }); } catch (e) { }
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }
Sfx.on = save.sound;

// ---------------------------------------------------------------- Ausrüstung
const BOWS = [
  { id: 'holz', name: 'Holzbogen', dmg: 30, pow: 1350, draw: 1.0, cost: 0, color: '#c98b4a', string: '#fff', desc: 'Dein treuer Anfängerbogen.' },
  { id: 'jagd', name: 'Jagdbogen', dmg: 38, pow: 1420, draw: 1.05, cost: 150, color: '#8fbf3f', string: '#fff', desc: 'Etwas mehr Wumms.' },
  { id: 'lang', name: 'Langbogen', dmg: 46, pow: 1560, draw: 0.95, cost: 450, color: '#5a8dee', string: '#fff', desc: 'Große Reichweite.' },
  { id: 'komp', name: 'Kompositbogen', dmg: 55, pow: 1520, draw: 1.3, cost: 1000, color: '#e05dad', string: '#fff', desc: 'Spannt blitzschnell.' },
  { id: 'feuer', name: 'Feuerbogen', dmg: 62, pow: 1560, draw: 1.15, cost: 2000, color: '#ff5a1f', string: '#ffd166', fx: 'fire', desc: 'Setzt Gegner in Brand 🔥' },
  { id: 'eis', name: 'Eisbogen', dmg: 68, pow: 1580, draw: 1.15, cost: 3500, color: '#48cae4', string: '#e0fbff', fx: 'ice', desc: 'Friert Gegner ein ❄️ (schießen langsamer)' },
  { id: 'drei', name: 'Dreifachbogen', dmg: 58, pow: 1600, draw: 1.2, cost: 6000, color: '#ffbe0b', string: '#fff', multi: 3, desc: 'Schießt 3 Pfeile auf einmal!' },
  { id: 'donner', name: 'Donnerbogen', dmg: 88, pow: 1650, draw: 1.25, cost: 10000, color: '#9b5de5', string: '#f9f871', fx: 'zap', desc: 'Blitz springt auf Nachbarn über ⚡' },
  { id: 'bumm', name: 'Explosionsbogen', dmg: 105, pow: 1650, draw: 1.2, cost: 16000, color: '#f15bb5', string: '#fff', fx: 'bomb', desc: 'Explodiert beim Einschlag 💥' },
  { id: 'drache', name: 'Drachenbogen', dmg: 135, pow: 1720, draw: 1.35, cost: 26000, color: '#d00000', string: '#ffba08', fx: 'fire', multi: 2, desc: 'Doppelte Feuerpfeile 🐉' },
  { id: 'regen', name: 'Regenbogen-Bogen', dmg: 175, pow: 1800, draw: 1.5, cost: 45000, color: 'rainbow', string: '#fff', fx: 'homing', multi: 3, desc: 'Zielsuchende Regenbogenpfeile 🌈' },
];
const ARMORS = [
  { name: 'Stoffhemd', red: 0, cost: 0, color: '#6ec6ff', plate: null },
  { name: 'Lederweste', red: 0.1, cost: 120, color: '#a0522d', plate: '#7a3b17' },
  { name: 'Kettenhemd', red: 0.2, cost: 550, color: '#9aa5b1', plate: '#6b7785' },
  { name: 'Plattenrüstung', red: 0.3, cost: 1600, color: '#c0c7d0', plate: '#8894a3' },
  { name: 'Ritterrüstung', red: 0.4, cost: 4200, color: '#4d7cff', plate: '#ffd23f' },
  { name: 'Drachenschuppen', red: 0.5, cost: 11000, color: '#2dc653', plate: '#0b6e2d' },
  { name: 'Diamantrüstung', red: 0.6, cost: 26000, color: '#7df9ff', plate: '#ffffff' },
];
const HELMS = [
  { name: 'Kein Helm', red: 0, cost: 0, color: null },
  { name: 'Lederkappe', red: 0.15, cost: 100, color: '#a0522d' },
  { name: 'Eisenhelm', red: 0.3, cost: 650, color: '#9aa5b1' },
  { name: 'Ritterhelm', red: 0.45, cost: 2600, color: '#d9dee5' },
  { name: 'Drachenhelm', red: 0.6, cost: 9000, color: '#2dc653' },
  { name: 'Diamanthelm', red: 0.75, cost: 22000, color: '#7df9ff' },
];
const UPGRADES = [
  { id: 'hp', name: 'Leben', icon: '❤️', max: 30, base: 30, desc: l => `${100 + l * 15} max. Leben` },
  { id: 'sta', name: 'Ausdauer', icon: '⚡', max: 30, base: 30, desc: l => `${100 + l * 12} max. Ausdauer` },
  { id: 'reg', name: 'Ausdauer-Erholung', icon: '🔋', max: 30, base: 35, desc: l => `+${Math.round(l * 12)}% Erholung` },
  { id: 'rel', name: 'Nachladen', icon: '⏱️', max: 25, base: 40, desc: l => `${(reloadTime(l)).toFixed(2)} s pro Pfeil` },
  { id: 'pull', name: 'Spannkraft', icon: '💪', max: 25, base: 35, desc: l => `+${l * 10}% Spanngeschwindigkeit` },
  { id: 'dmg', name: 'Schaden', icon: '🗡️', max: 30, base: 45, desc: l => `+${l * 10}% Schaden` },
  { id: 'aim', name: 'Zielhilfe', icon: '🎯', max: 10, base: 60, desc: l => `Ziellinie ${100 + l * 25}%` },
];
function reloadTime(l) { return 0.85 * Math.pow(0.93, l); }
function upCost(u, l) { return Math.round(u.base * Math.pow(1.17, l)); }

// ---------------------------------------------------------------- Welten
const THEMES = [
  { name: 'Blumenwiese', emoji: '🌼', sky: ['#5ec8ff', '#d9f6ff'], far: '#8fd694', near: '#4caf50', tower: '#9c8f86', towerTop: '#57c84d', brick: '#857871', hazard: '#2f9bff', hazard2: '#83d0ff', sun: 'sun', part: 'petal', deco: 'flowers' },
  { name: 'Wüste', emoji: '🏜️', sky: ['#ff9f43', '#ffe3a3'], far: '#f5b971', near: '#e89a4b', tower: '#d9a55b', towerTop: '#f2cf8c', brick: '#bf8b45', hazard: '#c98a3d', hazard2: '#e8b060', sun: 'sun', part: 'dust', deco: 'cactus' },
  { name: 'Schneeland', emoji: '❄️', sky: ['#7aa2ff', '#e8efff'], far: '#c9d8ff', near: '#ffffff', tower: '#a9c7e8', towerTop: '#ffffff', brick: '#8fb0d4', hazard: '#3d7bd9', hazard2: '#a8d4ff', sun: 'sun', part: 'snow', deco: 'pines' },
  { name: 'Vulkan', emoji: '🌋', sky: ['#2b0a0a', '#ff6b35'], far: '#5c1a1a', near: '#3a1010', tower: '#4a4040', towerTop: '#ff7b00', brick: '#383030', hazard: '#ff4800', hazard2: '#ffb700', sun: 'none', part: 'ember', deco: 'volcano' },
  { name: 'Süßigkeitenland', emoji: '🍭', sky: ['#ff8fcf', '#ffe4f5'], far: '#ffc2e2', near: '#ff9ecb', tower: '#fff0f7', towerTop: '#ff5da2', brick: '#ffd0e6', hazard: '#7b3f00', hazard2: '#a0522d', sun: 'sun', part: 'sparkle', deco: 'lollis' },
  { name: 'Piratenmeer', emoji: '🏴‍☠️', sky: ['#29b6f6', '#b3ecff'], far: '#4fc3f7', near: '#0288d1', tower: '#a1703f', towerTop: '#d7a15e', brick: '#855a30', hazard: '#0077b6', hazard2: '#48cae4', sun: 'sun', part: 'bubble', deco: 'ships' },
  { name: 'Dschungel', emoji: '🌴', sky: ['#43c77e', '#d7ffe0'], far: '#2e9e5b', near: '#1b7a43', tower: '#6b8e5a', towerTop: '#8bd346', brick: '#557546', hazard: '#4e6b2f', hazard2: '#7a9a3a', sun: 'sun', part: 'firefly', deco: 'palms' },
  { name: 'Geisternacht', emoji: '👻', sky: ['#140f3a', '#5b3fa0'], far: '#2d2266', near: '#1c1545', tower: '#5a4b8a', towerTop: '#b388ff', brick: '#4a3d75', hazard: '#29124f', hazard2: '#6a3fb5', sun: 'moon', part: 'firefly', deco: 'ghosts' },
  { name: 'Weltall', emoji: '🚀', sky: ['#05021a', '#2a1668'], far: '#3a2a8a', near: '#1b1150', tower: '#8d99ae', towerTop: '#00f5d4', brick: '#6c778c', hazard: '#0b0620', hazard2: '#3d2b99', sun: 'planet', part: 'star', deco: 'planets' },
  { name: 'Regenbogenland', emoji: '🌈', sky: ['#a18cff', '#ffe8fb'], far: '#ffd6ff', near: '#c8b6ff', tower: '#ffffff', towerTop: '#ff8fab', brick: '#e7e0ff', hazard: '#ffffff', hazard2: '#dcd3ff', sun: 'rainbow', part: 'sparkle', deco: 'rainbow' },
];

// ---------------------------------------------------------------- Gegnertypen
const ETYPES = {
  rekrut: { name: 'Rekrut', min: 1, hp: 40, dmg: 10, acc: 0.11, rate: 3.6, color: '#ff5a5f', coins: 6 },
  schuetze: { name: 'Schütze', min: 4, hp: 55, dmg: 12, acc: 0.08, rate: 3.1, color: '#2ec27e', coins: 8, hat: 'cap' },
  ritter: { name: 'Ritter', min: 8, hp: 80, dmg: 14, acc: 0.08, rate: 3.3, color: '#4d8dff', coins: 11, armor: 0.25, headArmor: 0.35, hat: 'helm' },
  sniper: { name: 'Scharfschütze', min: 13, hp: 55, dmg: 20, acc: 0.035, rate: 3.9, color: '#9b5de5', coins: 12, hat: 'hood' },
  triple: { name: 'Dreifachschütze', min: 18, hp: 65, dmg: 10, acc: 0.09, rate: 3.7, color: '#ff9f1c', coins: 13, multi: 3, hat: 'band' },
  schild: { name: 'Schildträger', min: 22, hp: 80, dmg: 12, acc: 0.08, rate: 3.4, color: '#17c3b2', coins: 14, shield: true, hat: 'helm' },
  feuer: { name: 'Feuerschütze', min: 28, hp: 70, dmg: 12, acc: 0.07, rate: 3.2, color: '#e63946', coins: 15, arrow: 'fire', hat: 'flame' },
  eis: { name: 'Eisschütze', min: 35, hp: 70, dmg: 11, acc: 0.07, rate: 3.2, color: '#48cae4', coins: 15, arrow: 'ice', hat: 'beanie' },
  riese: { name: 'Riese', min: 42, hp: 200, dmg: 26, acc: 0.09, rate: 4.3, color: '#b5835a', coins: 25, scale: 1.5 },
  ninja: { name: 'Ninja', min: 50, hp: 60, dmg: 14, acc: 0.05, rate: 2.3, color: '#3a3a55', coins: 18, dodge: 0.55, hat: 'ninja' },
  bomber: { name: 'Bombenschütze', min: 60, hp: 75, dmg: 18, acc: 0.08, rate: 3.9, color: '#ffd23f', coins: 20, arrow: 'bomb', hat: 'goggles' },
  magier: { name: 'Magier', min: 75, hp: 70, dmg: 15, acc: 0.1, rate: 3.0, color: '#ff5ecd', coins: 22, arrow: 'magic', hat: 'wizard' },
};
const BOSSES = [
  { name: 'König Wurzelbart', mini: 'Wurzelwächter', color: '#8d5a2b', hat: 'crown', attacks: ['volley', 'triple', 'single'] },
  { name: 'Sandpharao', mini: 'Mumienwächter', color: '#e9c46a', hat: 'pharaoh', attacks: ['triple', 'summon', 'single'] },
  { name: 'Frostriese', mini: 'Eiswächter', color: '#90e0ef', hat: 'beanie', arrow: 'ice', attacks: ['volley', 'rain', 'single'] },
  { name: 'Lavalord', mini: 'Glutwächter', color: '#ff4d00', hat: 'horns', arrow: 'fire', attacks: ['rain', 'triple', 'single'] },
  { name: 'Zuckerkönigin', mini: 'Zuckerwächter', color: '#ff70a6', hat: 'crown', attacks: ['volley', 'summon', 'triple'] },
  { name: 'Kapitän Krake', mini: 'Deckwächter', color: '#5e60ce', hat: 'pirate', attacks: ['triple', 'bomb', 'volley'] },
  { name: 'Dschungel-Häuptling', mini: 'Lianenwächter', color: '#2d6a4f', hat: 'feather', attacks: ['rain', 'summon', 'triple'] },
  { name: 'Schattenkönig', mini: 'Schattenwächter', color: '#3c096c', hat: 'crown', arrow: 'magic', attacks: ['volley', 'rain', 'summon'] },
  { name: 'Sternenritter', mini: 'Sternwächter', color: '#adb5bd', hat: 'helm', attacks: ['bomb', 'triple', 'rain'] },
  { name: 'Regenbogendrache', mini: 'Regenbogenwächter', color: 'rainbow', hat: 'horns', attacks: ['rain', 'volley', 'bomb', 'summon'] },
];
const RAINBOW = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
function colorOf(c, t = 0) { return c === 'rainbow' ? RAINBOW[Math.floor(t * 2) % 6] : c; }

// ---------------------------------------------------------------- Levelgenerator
function levelInfo(n) {
  const wi = Math.floor((n - 1) / LEVELS_PER_WORLD), inW = (n - 1) % LEVELS_PER_WORLD + 1;
  return { wi, inW, theme: THEMES[wi], boss: inW % 10 === 0, bigBoss: inW === LEVELS_PER_WORLD };
}
function genLevel(n) {
  const r = mulberry32(n * 7919 + 13);
  const info = levelInfo(n);
  const W = Math.round(1750 + Math.min(700, (n - 1) * 3.2) + r() * 120);
  const H = Math.round(W * 9 / 16);
  const L = Object.assign({ n, W, H }, info);
  L.hpMul = 1 + (n - 1) * 0.035; L.dmgMul = 1 + (n - 1) * 0.025;
  L.accMul = Math.max(0.35, 1 - (n - 1) / 220); L.rateMul = Math.max(0.62, 1 - (n - 1) / 480);
  L.wind = n >= 12 ? Math.round((r() * 2 - 1) * Math.min(150, 15 + n * 0.7)) : 0;
  if (Math.abs(L.wind) < 12) L.wind = 0;
  L.hazardY = H * 0.9;
  L.player = { x: W * 0.11, top: Math.round(H * (0.5 + r() * 0.12)), w: 200 };

  // Gegnerplattformen
  const pool = Object.keys(ETYPES).filter(k => ETYPES[k].min <= n);
  let count = Math.min(5, 1 + Math.floor(Math.sqrt(n / 3)));
  if (count > 1 && r() < 0.3) count--;
  let waves = n < 8 ? 1 : n < 40 ? (r() < 0.5 ? 2 : 1) : n < 120 ? (r() < 0.35 ? 3 : 2) : 3;
  const x0 = W * 0.5, x1 = info.boss ? W * 0.7 : W * 0.93;
  const slotsN = info.boss ? Math.min(2, count) : count;
  L.slots = [];
  for (let i = 0; i < slotsN; i++) {
    const x = Math.round(lerp(x0, x1, (i + 0.5) / slotsN) + (r() - 0.5) * 50);
    const top = Math.round(H * (0.3 + r() * 0.42));
    const floating = n >= 6 && r() < 0.3;
    const moving = n >= 25 && r() < 0.22 + n / 900 ? { amp: 40 + r() * 70, spd: 0.5 + r() * 0.7, ph: r() * 6 } : null;
    L.slots.push({ x, top, w: Math.round(130 + r() * 40), floating: floating || !!moving, moving });
  }
  if (info.boss) L.bossSlot = { x: Math.round(W * 0.85), top: Math.round(H * 0.6), w: 300, floating: false, moving: null, boss: true };

  const pickType = () => {
    const w = pool.map((k, i) => 1 + (i >= pool.length - 3 ? 2 : 0));
    let s = w.reduce((a, b) => a + b, 0) * r();
    for (let i = 0; i < pool.length; i++) { s -= w[i]; if (s <= 0) return pool[i]; }
    return pool[pool.length - 1];
  };
  L.waves = [];
  const normalWaves = info.boss ? 1 : waves;
  for (let w = 0; w < normalWaves; w++) {
    const c = Math.max(1, Math.min(slotsN, count - (w === 0 && waves > 1 && r() < 0.5 ? 1 : 0)));
    const idx = [...Array(slotsN).keys()].sort(() => r() - 0.5).slice(0, c);
    L.waves.push(idx.map(i => ({ type: pickType(), slot: i })));
  }
  if (info.boss) {
    const minions = Math.min(slotsN, Math.floor(n / 45));
    const wave = [{ boss: true, slot: 'boss' }];
    for (let i = 0; i < minions; i++) wave.push({ type: pickType(), slot: i });
    L.waves.push(wave);
  }

  // Hindernisse
  L.crates = []; L.pillars = [];
  if (n >= 5) for (let i = 0; i < slotsN; i++) {
    if (r() < 0.45) { const s = L.slots[i]; const hgt = 1 + Math.floor(r() * Math.min(2, 1 + n / 60)); for (let k = 0; k < hgt; k++) L.crates.push({ slot: i, x: s.x - s.w / 2 + 24, k, metal: n > 60 && r() < 0.4 }); }
  }
  if (n >= 20 && r() < 0.55) {
    const px = Math.round(W * (0.3 + r() * 0.12)), top = Math.round(H * (0.35 + r() * 0.25));
    L.pillars.push({ x: px, top, w: 60 + Math.round(r() * 40), h: null });
    if (r() < 0.5) { const hgt = 1 + Math.floor(r() * 3); for (let k = 0; k < hgt; k++) L.crates.push({ pillar: 0, x: px, k, metal: false }); }
  }
  if (n >= 30 && r() < 0.4) {
    L.pillars.push({ x: Math.round(W * (0.36 + r() * 0.1)), top: Math.round(H * (0.18 + r() * 0.15)), w: 180, h: 34, floatMove: r() < 0.5 ? { amp: 60 + r() * 60, spd: 0.4 + r() * 0.5, ph: r() * 6 } : null });
  }
  // Sichtlinie: nähere Türme dürfen weiter hinten stehende Gegner nicht komplett verdecken
  {
    const sx = L.player.x + 10, sy = L.player.top - 84, strict = n < 60;
    const targets = L.slots.map(sl => ({ sl, x: sl.x + 18, y: () => sl.top - 75 }));
    if (L.bossSlot) targets.push({ sl: L.bossSlot, x: L.bossSlot.x + 30, y: () => L.bossSlot.top - 150 });
    targets.sort((a, b) => b.x - a.x);
    for (const t of targets) L.slots.forEach((b, i) => {
      if (b === t.sl || b.x >= t.sl.x) return;
      if (!strict && (i + n) % 2) return;
      const ty = t.y(), ly = x => sy + (ty - sy) * (x - sx) / (t.x - sx);
      const x0 = b.x - b.w / 2 - 12, x1 = b.x + b.w / 2 + 12;
      const low = Math.max(ly(x0), ly(x1)), high = Math.min(ly(x0), ly(x1)), clear = 34;
      const crateH = 44 * L.crates.filter(c => c.slot === i).length;
      if (b.floating && b.top + 34 < high - clear) return;
      if (b.top - crateH < low + clear) b.top = Math.round(Math.min(H * 0.84, low + clear + crateH));
    });
  }
  // Dekoration
  const hill = (base, amp, step) => { const pts = []; for (let x = -800; x <= W + 800; x += step) pts.push([x, base - Math.abs(Math.sin(x * 0.0023 + r() * 0.4)) * amp - r() * amp * 0.3]); return pts; };
  L.farHill = hill(H * 0.72, H * 0.22, 90);
  L.nearHill = hill(H * 0.86, H * 0.12, 70);
  L.clouds = Array.from({ length: 6 }, () => ({ x: r() * W, y: H * (0.06 + r() * 0.3), s: 0.6 + r() * 0.9, v: 6 + r() * 14 }));
  L.decoSeed = Math.floor(r() * 1e6);
  L.stars = Array.from({ length: 90 }, () => ({ x: r() * 1, y: r() * 0.8, s: 0.5 + r() * 1.8, p: r() * 6 }));
  return L;
}

// ---------------------------------------------------------------- Bogenschütze
const OUT = '#26263a';
class Archer {
  constructor(o) {
    Object.assign(this, { s: 1, facing: 1, armor: 0, headArmor: 0, hat: null, alive: true, draw: 0, vy: 0, air: false, stuck: [], burn: 0, burnDps: 0, freeze: 0, flash: 0, t: rnd() * 10, dancing: false, danceT: 0, state: 'idle', cool: 1.5, dropping: false, skin: '#ffdcb5', limb: null, bowColor: '#8b5a2b', stringColor: '#fff' }, o);
    this.aim = this.facing > 0 ? -0.3 : Math.PI + 0.3;
    this.hp = this.maxHp;
    this._pose = this.pose();
  }
  pose() {
    const s = this.s, f = this.facing, x = this.x;
    let y = this.y;
    const P = {};
    let hop = 0;
    if (this.dancing) { hop = Math.abs(Math.sin(this.danceT * 7)) * 18 * s; y -= hop; }
    const br = this.alive ? Math.sin(this.t * 2.2) * 1.2 * s : 0;
    P.hip = { x, y: y - 48 * s };
    P.neck = { x: x + f * 2 * s, y: y - 90 * s + br };
    P.head = { x: x + f * 3 * s, y: y - 108 * s + br };
    P.sh = { x: x + f * 1 * s, y: y - 84 * s + br };
    const air = this.air || hop > 4 * s;
    const sp = air ? 0.6 : 1;
    let liftL = 0, liftR = 0;
    if (this.dancing) { const k = Math.sin(this.danceT * 7); if (k > 0) liftL = k * 14 * s; else liftR = -k * 14 * s; }
    P.kneeL = { x: x - 8 * s * sp - (air ? f * 6 * s : 0), y: y - 25 * s - (air ? 6 * s : 0) - liftL };
    P.footL = { x: x - 13 * s * sp, y: y - (air ? 4 * s : 0) - liftL * 0.6 };
    P.kneeR = { x: x + 10 * s * sp + (air ? f * 8 * s : 0), y: y - 25 * s - (air ? 8 * s : 0) - liftR };
    P.footR = { x: x + 15 * s * sp, y: y - (air ? 6 * s : 0) - liftR * 0.6 };
    if (this.dancing) {
      const d = this.danceT, w = Math.sin(d * 9);
      P.hand = { x: P.sh.x + f * (18 + w * 8) * s, y: P.sh.y - 42 * s };
      P.elbow = { x: P.sh.x + f * 18 * s, y: P.sh.y - 18 * s };
      P.hand2 = { x: P.sh.x - f * (18 + w * 8) * s, y: P.sh.y - 40 * s };
      P.elbow2 = { x: P.sh.x - f * 17 * s, y: P.sh.y - 16 * s };
      const a = -Math.PI / 2 + Math.sin(d * 5) * 0.5;
      P.dir = { x: Math.cos(a), y: Math.sin(a) }; P.n = { x: P.dir.y * f, y: -P.dir.x * f };
      P.dance = true;
    } else {
      const dx = Math.cos(this.aim), dy = Math.sin(this.aim);
      const nx = dy * f, ny = -dx * f;
      P.hand = { x: P.sh.x + dx * 38 * s, y: P.sh.y + dy * 38 * s };
      P.elbow = { x: P.sh.x + dx * 19 * s - nx * 3 * s, y: P.sh.y + dy * 19 * s - ny * 3 * s };
      const pull = 10 + this.draw * 30;
      P.hand2 = { x: P.hand.x - dx * pull * s, y: P.hand.y - dy * pull * s };
      const mx = (P.sh.x + P.hand2.x) / 2, my = (P.sh.y + P.hand2.y) / 2;
      P.elbow2 = { x: mx + nx * 7 * s - dx * this.draw * 14 * s, y: my + ny * 7 * s - dy * this.draw * 14 * s };
      P.dir = { x: dx, y: dy }; P.n = { x: nx, y: ny };
    }
    return P;
  }
  hitTest(ax, ay, bx, by) {
    const P = this._pose, s = this.s, f = this.facing;
    let best = null;
    const consider = (t, part) => { if (t !== null && (!best || t < best.t)) best = { t, part }; };
    if (this.shield) { const sx = this.x + f * 26 * s; const r = segSeg(ax, ay, bx, by, sx, this.y - 102 * s, sx, this.y - 34 * s); if (r.d <= 10 * s) consider(r.s, 'shield'); }
    consider(segCircle(ax, ay, bx, by, P.head.x, P.head.y, 17 * s), 'head');
    let r = segSeg(ax, ay, bx, by, P.neck.x, P.neck.y, P.hip.x, P.hip.y); if (r.d <= 13 * s) consider(r.s, 'body');
    r = segSeg(ax, ay, bx, by, P.hip.x, P.hip.y, this.x, this.y); if (r.d <= 12 * s) consider(r.s, 'legs');
    r = segSeg(ax, ay, bx, by, P.sh.x, P.sh.y, P.hand.x, P.hand.y); if (r.d <= 7 * s) consider(r.s, 'arm');
    return best;
  }
  center() { return { x: this.x, y: this.y - 70 * this.s }; }
}

// ---------------------------------------------------------------- Zeichnen: Figuren
let ctx, gameTime = 0;
function shade(hex, amt) {
  if (!hex || hex[0] !== '#') return hex;
  let c = hex.slice(1); if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  let r = (num >> 16) + amt, g = ((num >> 8) & 255) + amt, b = (num & 255) + amt;
  return `rgb(${clamp(r, 0, 255)},${clamp(g, 0, 255)},${clamp(b, 0, 255)})`;
}
function seg(p, q, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
function path3(a, b, c, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }

function drawBow(P, s, bowColor, stringColor, draw, nocked, arrowColor) {
  const d = P.dir, n = P.n, h = P.hand;
  const A = { x: h.x + n.x * 34 * s - d.x * 14 * s, y: h.y + n.y * 34 * s - d.y * 14 * s };
  const B = { x: h.x - n.x * 34 * s - d.x * 14 * s, y: h.y - n.y * 34 * s - d.y * 14 * s };
  const C = { x: h.x + d.x * 22 * s, y: h.y + d.y * 22 * s };
  const sp = P.dance ? { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 } : P.hand2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = stringColor; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(sp.x, sp.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  ctx.strokeStyle = OUT; ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(C.x, C.y, B.x, B.y); ctx.stroke();
  ctx.strokeStyle = colorOf(bowColor, gameTime); ctx.lineWidth = 5.5 * s; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(C.x, C.y, B.x, B.y); ctx.stroke();
  if (nocked && !P.dance) drawArrowShape(sp.x + d.x * 62 * s, sp.y + d.y * 62 * s, Math.atan2(d.y, d.x), 62 * s, arrowColor, 1);
}
function drawArrowShape(tx, ty, ang, len, col, alpha, noTip) {
  const c = Math.cos(ang), sn = Math.sin(ang);
  const bx = tx - c * len, by = ty - sn * len;
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(noTip ? tx - c * 10 : tx - c * 6, noTip ? ty - sn * 10 : ty - sn * 6); ctx.lineTo(bx, by); ctx.stroke();
  if (!noTip) { ctx.fillStyle = '#e8eef5'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tx + c * 4, ty + sn * 4); ctx.lineTo(tx - c * 9 - sn * 5, ty - sn * 9 + c * 5); ctx.lineTo(tx - c * 9 + sn * 5, ty - sn * 9 - c * 5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = colorOf(col, gameTime * 2);
  for (const side of [1, -1]) { ctx.beginPath(); ctx.moveTo(bx + c * 14, by + sn * 14); ctx.lineTo(bx + c * 2 - sn * 7 * side, by + sn * 2 + c * 7 * side); ctx.lineTo(bx - c * 2, by - sn * 2); ctx.closePath(); ctx.fill(); }
  ctx.globalAlpha = 1;
}

function drawHat(hat, hx, hy, s, f, col) {
  const r = 15 * s;
  ctx.lineWidth = 2.5 * s; ctx.strokeStyle = OUT;
  const fillStroke = () => { ctx.fill(); ctx.stroke(); };
  switch (hat) {
    case 'cap': ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx, hy - 2 * s, r + 1 * s, Math.PI, 0); ctx.closePath(); fillStroke(); ctx.beginPath(); ctx.ellipse(hx + f * 14 * s, hy - 3 * s, 10 * s, 3 * s, 0, 0, Math.PI * 2); fillStroke(); break;
    case 'helm': ctx.fillStyle = col || '#b8c2cc'; ctx.beginPath(); ctx.arc(hx, hy, r + 2.5 * s, Math.PI * 1.02, -0.02); ctx.lineTo(hx + r + 2 * s, hy + 2 * s); ctx.lineTo(hx - r - 2 * s, hy + 2 * s); ctx.closePath(); fillStroke();
      ctx.fillStyle = OUT; ctx.fillRect(hx + f * 2 * s - (f < 0 ? 12 * s : 0), hy - 4 * s, 12 * s, 3 * s); break;
    case 'hood': ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx - f * 2 * s, hy - 1 * s, r + 4 * s, Math.PI * (f > 0 ? 0.65 : -0.35), Math.PI * (f > 0 ? 2.1 : 1.1)); ctx.closePath(); fillStroke(); break;
    case 'band': ctx.strokeStyle = col; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(hx - r, hy - 7 * s); ctx.lineTo(hx + r, hy - 7 * s); ctx.stroke(); ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(hx - f * r, hy - 7 * s); ctx.quadraticCurveTo(hx - f * (r + 10 * s), hy - 4 * s + Math.sin(gameTime * 8) * 3 * s, hx - f * (r + 18 * s), hy + 2 * s); ctx.stroke(); break;
    case 'flame': for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#ff4d00', '#ff9f1c', '#ffd23f'][i]; const k = (3 - i) * 0.33; ctx.beginPath(); ctx.moveTo(hx - 12 * s * k, hy - 10 * s); ctx.quadraticCurveTo(hx - 4 * s, hy - 28 * s * k - Math.sin(gameTime * 12 + i) * 3 * s, hx + 2 * s, hy - 34 * s * k); ctx.quadraticCurveTo(hx + 6 * s, hy - 20 * s * k, hx + 12 * s * k, hy - 10 * s); ctx.fill(); } break;
    case 'beanie': ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx, hy - 3 * s, r + 1 * s, Math.PI, 0); ctx.closePath(); fillStroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy - r - 4 * s, 5 * s, 0, 7); fillStroke(); ctx.fillRect(hx - r - 1 * s, hy - 6 * s, 2 * r + 2 * s, 4 * s); break;
    case 'ninja': ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.arc(hx, hy, r + 1 * s, 0, 7); ctx.fill(); ctx.fillStyle = '#ffdcb5'; ctx.fillRect(hx + (f > 0 ? 0 : -r), hy - 7 * s, r, 7 * s); ctx.strokeStyle = '#e63946'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(hx - f * r, hy - 9 * s); ctx.lineTo(hx - f * (r + 14 * s), hy - 4 * s + Math.sin(gameTime * 9) * 4 * s); ctx.stroke(); break;
    case 'goggles': ctx.strokeStyle = '#333'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(hx - r, hy - 8 * s); ctx.lineTo(hx + r, hy - 8 * s); ctx.stroke(); ctx.fillStyle = '#7ad3ff'; ctx.strokeStyle = OUT; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(hx + f * 6 * s, hy - 8 * s, 5 * s, 0, 7); fillStroke(); break;
    case 'wizard': ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(hx - r - 6 * s, hy - 6 * s); ctx.lineTo(hx - f * 10 * s, hy - 46 * s); ctx.lineTo(hx + r + 6 * s, hy - 6 * s); ctx.closePath(); fillStroke(); ctx.fillStyle = '#ffd23f'; ctx.font = `${12 * s}px sans-serif`; ctx.fillText('★', hx - 5 * s, hy - 16 * s); break;
    case 'crown': ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(hx - 13 * s, hy - 10 * s); ctx.lineTo(hx - 15 * s, hy - 30 * s); ctx.lineTo(hx - 7 * s, hy - 20 * s); ctx.lineTo(hx, hy - 33 * s); ctx.lineTo(hx + 7 * s, hy - 20 * s); ctx.lineTo(hx + 15 * s, hy - 30 * s); ctx.lineTo(hx + 13 * s, hy - 10 * s); ctx.closePath(); fillStroke(); ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(hx, hy - 16 * s, 3 * s, 0, 7); ctx.fill(); break;
    case 'pharaoh': for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#1d4e89' : '#ffd23f'; ctx.beginPath(); ctx.arc(hx - f * 3 * s, hy + 2 * s, r + 6 * s - i * 2.4 * s, Math.PI * 0.9, Math.PI * 2.1); ctx.closePath(); ctx.fill(); } ctx.strokeStyle = OUT; ctx.beginPath(); ctx.arc(hx - f * 3 * s, hy + 2 * s, r + 6 * s, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke(); break;
    case 'horns': ctx.fillStyle = '#fff1d6'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + sd * 8 * s, hy - 11 * s); ctx.quadraticCurveTo(hx + sd * 22 * s, hy - 18 * s, hx + sd * 20 * s, hy - 36 * s); ctx.quadraticCurveTo(hx + sd * 14 * s, hy - 20 * s, hx + sd * 2 * s, hy - 14 * s); ctx.closePath(); fillStroke(); } break;
    case 'pirate': ctx.fillStyle = '#1b1b2f'; ctx.beginPath(); ctx.moveTo(hx - 24 * s, hy - 8 * s); ctx.quadraticCurveTo(hx, hy - 38 * s, hx + 24 * s, hy - 8 * s); ctx.quadraticCurveTo(hx, hy - 14 * s, hx - 24 * s, hy - 8 * s); fillStroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy - 20 * s, 3.5 * s, 0, 7); ctx.fill(); break;
    case 'feather': ctx.strokeStyle = '#e63946'; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(hx - r, hy - 7 * s); ctx.lineTo(hx + r, hy - 7 * s); ctx.stroke(); ['#ffd23f', '#2ec27e', '#4d8dff'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(hx - f * (4 + i * 6) * s, hy - 22 * s, 4 * s, 13 * s, -f * (0.2 + i * 0.25), 0, 7); fillStroke(); }); break;
  }
}
function drawPlayerHelm(tier, hx, hy, s, f) {
  const h = HELMS[tier]; if (!h || !h.color) return;
  const r = 15 * s; ctx.lineWidth = 2.5 * s; ctx.strokeStyle = OUT; ctx.fillStyle = h.color;
  ctx.beginPath(); ctx.arc(hx, hy, r + 3 * s, Math.PI * 1.02, -0.02); ctx.lineTo(hx + r + 3 * s, hy + (tier >= 3 ? 6 : 1) * s); ctx.lineTo(hx - r - 3 * s, hy + (tier >= 3 ? 6 : 1) * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (tier >= 2) { ctx.fillStyle = OUT; ctx.fillRect(f > 0 ? hx + 1 * s : hx - 14 * s, hy - 4 * s, 13 * s, 3 * s); }
  if (tier >= 3) { ctx.fillStyle = tier >= 4 ? '#ffd23f' : '#e63946'; ctx.beginPath(); ctx.ellipse(hx - f * 4 * s, hy - r - 8 * s, 5 * s, 10 * s, -f * 0.5, 0, 7); ctx.fill(); ctx.stroke(); }
  if (tier === 5) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(hx - 5 * s, hy - 9 * s, 3 * s, 0, 7); ctx.fill(); }
}

function drawArcher(a) {
  const P = a._pose, s = a.s, f = a.facing;
  const flash = a.flash > 0;
  let body = colorOf(a.color, gameTime);
  if (a.freeze > 0) body = '#a8e8ff';
  const limb = flash ? '#ffffff' : (a.freeze > 0 ? '#c8f3ff' : (a.limb || shade(body, 40)));
  const torso = flash ? '#ffffff' : body;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const LW = 10 * s, TW = 19 * s, O = 5 * s;
  // Schild hinten? nein – vorn
  // Umriss-Pass
  path3(P.hip, P.kneeL, P.footL, LW + O, OUT); path3(P.hip, P.kneeR, P.footR, LW + O, OUT);
  seg(P.neck, P.hip, TW + O, OUT);
  path3(P.sh, P.elbow, P.hand, 8 * s + O, OUT);
  // Füll-Pass
  path3(P.hip, P.kneeL, P.footL, LW, shade(limb, -20)); path3(P.hip, P.kneeR, P.footR, LW, limb);
  seg(P.neck, P.hip, TW, torso);
  if (a.plate && !flash) { ctx.strokeStyle = a.plate; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(P.neck.x - 7 * s, P.neck.y + 10 * s); ctx.lineTo(P.hip.x + 7 * s, P.hip.y - 6 * s); ctx.moveTo(P.neck.x + 7 * s, P.neck.y + 10 * s); ctx.lineTo(P.hip.x - 7 * s, P.hip.y - 6 * s); ctx.stroke(); }
  // Gürtel
  ctx.strokeStyle = OUT; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(P.hip.x - 9 * s, P.hip.y - 4 * s); ctx.lineTo(P.hip.x + 9 * s, P.hip.y - 4 * s); ctx.stroke();
  path3(P.sh, P.elbow, P.hand, 8 * s, limb);
  // Bogen
  drawBow(P, s, a.bowColor, a.stringColor, a.draw, a.nocked, a.arrowColor || '#ff5a5f');
  // Kopf
  const hat = a.hat;
  if (hat === 'hood') drawHat(hat, P.head.x, P.head.y, s, f, shade(body, -30));
  ctx.fillStyle = flash ? '#fff' : (a.freeze > 0 ? '#d7f6ff' : a.skin); ctx.strokeStyle = OUT; ctx.lineWidth = 3 * s;
  ctx.beginPath(); ctx.arc(P.head.x, P.head.y, 15 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Gesicht
  const ex = P.head.x + f * 7 * s, ey = P.head.y - 2 * s;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 4.2 * s, 0, 7); ctx.fill();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(ex + f * 1.5 * s, ey + (a.alive ? 0 : 1) * s, 2.2 * s, 0, 7); ctx.fill();
  if (a.side === 'e') { ctx.strokeStyle = OUT; ctx.lineWidth = 2.4 * s; ctx.beginPath(); ctx.moveTo(ex - f * 5 * s, ey - 8 * s); ctx.lineTo(ex + f * 5 * s, ey - 4.5 * s); ctx.stroke(); }
  ctx.strokeStyle = OUT; ctx.lineWidth = 2 * s; ctx.beginPath();
  if (a.dancing) { ctx.fillStyle = '#c1121f'; ctx.arc(P.head.x + f * 8 * s, P.head.y + 6 * s, 4 * s, 0, Math.PI); ctx.fill(); }
  else if (a.side === 'p') { ctx.arc(P.head.x + f * 8 * s, P.head.y + 5 * s, 3.5 * s, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else { ctx.moveTo(P.head.x + f * 4 * s, P.head.y + 8 * s); ctx.lineTo(P.head.x + f * 11 * s, P.head.y + 7 * s); ctx.stroke(); }
  if (hat && hat !== 'hood') drawHat(hat, P.head.x, P.head.y, s, f, a.hatColor || shade(body, -25));
  if (a.side === 'p') drawPlayerHelm(a.helmTier || 0, P.head.x, P.head.y, s, f);
  // Zugarm vorn
  path3(P.sh, P.elbow2, P.hand2, 8 * s + O, OUT);
  path3(P.sh, P.elbow2, P.hand2, 8 * s, limb);
  // Schild
  if (a.shield) {
    const sx = a.x + f * 26 * s, top = a.y - 104 * s, bot = a.y - 32 * s;
    ctx.fillStyle = '#c0c7d0'; ctx.strokeStyle = OUT; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.roundRect(sx - 8 * s, top, 16 * s, bot - top, 7 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = body; ctx.fillRect(sx - 3 * s, top + 10 * s, 6 * s, bot - top - 20 * s);
  }
  // Brennen
  if (a.burn > 0) { for (let i = 0; i < 2; i++) { ctx.fillStyle = `rgba(255,${120 + rnd() * 100 | 0},0,${0.5 + rnd() * 0.4})`; ctx.beginPath(); ctx.arc(a.x + (rnd() - 0.5) * 26 * s, a.y - rnd() * 110 * s, (4 + rnd() * 7) * s, 0, 7); ctx.fill(); } }
}

// ---------------------------------------------------------------- Spielzustand
const Game = {
  state: 'menu', L: null, engine: null, player: null, enemies: [], arrows: [], parts: [], texts: [], ragdolls: [], packs: [], crates: [], platforms: [],
  waveIdx: 0, waveTimer: 0, time: 0, packTimer: 8, shake: 0, sta: 100, staMax: 100, reload: 0, input: null, confetti: [], ambient: [],
  earned: 0, endTimer: 0, banner: null, pending: [], bossRef: null, hpStart: 1, shots: 0, hits: 0,
};
function curBow() { return BOWS.find(b => b.id === save.bow) || BOWS[0]; }
function playerStats() {
  const u = save.up;
  return {
    maxHp: 100 + u.hp * 15, staMax: 100 + u.sta * 12, regen: 10 * (1 + u.reg * 0.12), reload: reloadTime(u.rel),
    pull: 1.6 * (1 + u.pull * 0.1) * curBow().draw, dmgMul: 1 + u.dmg * 0.1, aim: 0.38 * (1 + u.aim * 0.25),
    armor: ARMORS[save.armor].red, helm: HELMS[save.helm].red,
  };
}
const SHOT_COST = 16, JUMP_COST = 6;

function makePlatform(sl, L, theme) {
  const isFloat = sl.floating;
  const h = isFloat ? 34 : (L.H + 400 - sl.top);
  const body = Bodies.rectangle(sl.x, sl.top + h / 2, sl.w, h, { isStatic: true, friction: 0.9, label: 'plat' });
  const p = { body, x: sl.x, top: sl.top, baseTop: sl.top, w: sl.w, h, floating: isFloat, moving: sl.moving, kind: 'plat' };
  body.plugin.plat = p;
  Composite.add(Game.engine.world, body); Game.platforms.push(p);
  return p;
}
function startLevel(n, preview = false) {
  n = clamp(n, 1, MAX_LEVEL);
  const L = genLevel(n);
  L.deco = buildDeco(L);
  Game.L = L; Game.state = 'playing';
  Game.engine = Engine.create({ gravity: { x: 0, y: 1 } });
  Game.enemies = []; Game.arrows = []; Game.parts = []; Game.texts = []; Game.ragdolls = []; Game.packs = []; Game.crates = []; Game.platforms = []; Game.confetti = []; Game.ambient = [];
  Game.pending = []; Game.waveIdx = -1; Game.waveTimer = 1.2; Game.time = 0; Game.packTimer = 7 + rnd() * 5; Game.shake = 0; Game.earned = 0; Game.endTimer = 0; Game.bossRef = null; Game.input = null; Game.shots = 0; Game.hits = 0;
  const ps = playerStats();
  // Spielerturm
  makePlatform({ x: L.player.x, top: L.player.top, w: L.player.w, floating: false }, L).isPlayer = true;
  L.slots.forEach(sl => { sl.plat = makePlatform(sl, L); });
  if (L.bossSlot) L.bossSlot.plat = makePlatform(L.bossSlot, L);
  L.pillars.forEach(pl => {
    const p = makePlatform({ x: pl.x, top: pl.top, w: pl.w, floating: !!pl.h, moving: null }, L);
    p.pillar = true; p.floatMove = pl.floatMove; p.baseX = pl.x; pl.plat = p;
  });
  // Kisten
  L.crates.forEach(c => {
    const base = c.pillar !== undefined ? L.pillars[c.pillar].plat : L.slots[c.slot].plat;
    const size = 44;
    const b = Bodies.rectangle(c.x + (rnd() - 0.5) * 4, base.top - size / 2 - c.k * size - 1, size, size, { density: c.metal ? 0.004 : 0.0018, friction: 0.8, restitution: 0.05, label: 'crate' });
    b.plugin.crate = { metal: c.metal, size };
    Composite.add(Game.engine.world, b); Game.crates.push(b);
  });
  // Spieler
  const p = new Archer({ side: 'p', x: L.player.x + 10, y: L.player.top, facing: 1, s: 1, maxHp: ps.maxHp, armor: ps.armor, headArmor: ps.helm, color: ARMORS[save.armor].color, plate: ARMORS[save.armor].plate, limb: '#fff4e0', helmTier: save.helm, bowColor: curBow().color, stringColor: curBow().string, arrowColor: '#4d8dff' });
  p.baseY = L.player.top; p.plat = Game.platforms[0];
  Game.player = p; Game.hpStart = p.maxHp;
  Game.staMax = ps.staMax; Game.sta = ps.staMax; Game.reload = 0.4;
  // Ambient-Partikel
  for (let i = 0; i < 45; i++) Game.ambient.push(newAmbient(L, true));
  const bossTxt = L.bigBoss ? '⚠️ ENDBOSS-LEVEL' : L.boss ? '⚠️ BOSS-LEVEL' : `${L.waves.length} ${L.waves.length > 1 ? 'Wellen' : 'Welle'}`;
  resize();
  if (preview) {
    Game.state = 'menu'; spawnWave(0); Game.banner = null;
    for (const e of Game.enemies) { e.dropping = false; e.dropDelay = 0; e.y = e.baseY; }
    UI.hud(false); return;
  }
  showBanner(`Level ${n}`, `${L.theme.emoji} ${L.theme.name} · ${bossTxt}`);
  UI.hud(true); UI.updateHud();
}
function showBanner(title, sub, dur = 2.2) { Game.banner = { title, sub, t: 0, dur }; }

function spawnWave(i) {
  const L = Game.L; Game.waveIdx = i;
  const wave = L.waves[i];
  if (L.waves.length > 1 && i > 0) showBanner(`Welle ${i + 1}/${L.waves.length}`, i === L.waves.length - 1 && L.boss ? 'Der Boss kommt!' : 'Mach dich bereit!', 1.6);
  wave.forEach((w, k) => {
    if (w.boss) spawnBoss(k); else spawnEnemy(w.type, L.slots[w.slot], k * 0.35);
  });
}
function spawnEnemy(type, slot, delay = 0, extra = {}) {
  const L = Game.L, d = ETYPES[type];
  const s = (d.scale || 1);
  const e = new Archer(Object.assign({
    side: 'e', type, def: d, x: slot.x + 18, y: -200 - rnd() * 100, facing: -1, s, maxHp: Math.round(d.hp * L.hpMul), armor: d.armor || 0, headArmor: d.headArmor || 0,
    color: d.color, hat: d.hat, shield: !!d.shield, bowColor: shade(d.color, -60), arrowColor: d.color, dmg: d.dmg * L.dmgMul, acc: d.acc, rate: d.rate, multi: d.multi || 1, arrowFx: d.arrow || null,
    dodge: d.dodge || 0, coins: d.coins, slot, plat: slot.plat, dropping: true, dropDelay: delay, cool: 1.6 + rnd() * 1.4 + delay,
  }, extra));
  if (type === 'ninja') e.skin = '#ffdcb5';
  if (L.theme.name === 'Geisternacht' && rnd() < 0.3) e.skin = '#e0e0ff';
  if (L.theme.name === 'Weltall' && rnd() < 0.4) e.skin = '#b9f5a8';
  e.baseY = slot.plat.top; slot.occupied = e;
  Game.enemies.push(e);
  return e;
}
function spawnBoss() {
  const L = Game.L, B = BOSSES[L.wi];
  const big = L.bigBoss, s = big ? 2.3 : 1.7;
  const e = spawnEnemy('rekrut', L.bossSlot, 0.2, {
    boss: true, name: big ? B.name : B.mini, s, maxHp: Math.round((big ? 400 : 200) * L.hpMul), color: B.color, hat: B.hat, armor: big ? 0.15 : 0.1, headArmor: 0.2,
    bowColor: '#3b2a1a', arrowColor: colorOf(B.color, 0.3), dmg: (big ? 20 : 16) * L.dmgMul, acc: 0.06, rate: big ? 2.4 : 2.8, arrowFx: B.arrow || null, attacks: B.attacks, coins: big ? 120 : 60,
  });
  e.hp = e.maxHp; e.x = L.bossSlot.x + 30;
  Game.bossRef = e;
  setTimeout(() => Sfx.roar(), 500);
}

// ---------------------------------------------------------------- Zielen (Ballistik mit Wind)
function yAtX(sx, sy, v, phi, dirX, tx, wind) {
  const vx = dirX * v * Math.cos(phi), vy = -v * Math.sin(phi), dx = tx - sx;
  let t;
  if (Math.abs(wind) < 1e-6) { if (vx * dx <= 0) return Infinity; t = dx / vx; }
  else {
    const disc = vx * vx + 2 * wind * dx; if (disc < 0) return Infinity;
    const sq = Math.sqrt(disc); const c = [(-vx + sq) / wind, (-vx - sq) / wind].filter(x => x > 0);
    if (!c.length) return Infinity; t = Math.min(...c);
  }
  return sy + vy * t + 0.5 * G * t * t;
}
function solveAim(sx, sy, tx, ty, v, wind, high) {
  const dirX = tx >= sx ? 1 : -1;
  const g = p => yAtX(sx, sy, v, p, dirX, tx, wind) - ty;
  let lo, hi, phi;
  if (!high) {
    lo = -1.2; hi = 0.8;
    if (g(hi) > 0) phi = hi;
    else { for (let i = 0; i < 36; i++) { const m = (lo + hi) / 2; if (g(m) > 0) lo = m; else hi = m; } phi = (lo + hi) / 2; }
  } else {
    lo = 0.8; hi = 1.45;
    if (g(lo) > 0) phi = lo;
    else { for (let i = 0; i < 36; i++) { const m = (lo + hi) / 2; if (g(m) < 0) lo = m; else hi = m; } phi = (lo + hi) / 2; }
  }
  return dirX > 0 ? -phi : Math.PI + phi;
}

// ---------------------------------------------------------------- Pfeile
function spawnArrow(x, y, ang, v, o) {
  const a = Object.assign({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, life: 0, dead: false, stuck: null, trail: [], len: 58 }, o);
  Game.arrows.push(a);
  if (a.side === 'p') {
    for (const e of Game.enemies) if (e.alive && e.dodge && !e.air && !e.dropping && rnd() < e.dodge) {
      const eta = Math.abs(e.x - x) / Math.max(200, Math.abs(a.vx));
      e.dodgeAt = Game.time + Math.max(0.05, eta - 0.32);
    }
  }
  return a;
}
function nearestEnemy(x, y) {
  let best = null, bd = 1e9;
  for (const e of Game.enemies) if (e.alive && !e.dropping) { const c = e.center(); const d = dist(x, y, c.x, c.y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function playerShoot() {
  const p = Game.player, bow = curBow(), ps = playerStats();
  const ch = p.draw;
  const v = bow.pow * (0.35 + 0.65 * ch);
  const dmg = bow.dmg * ps.dmgMul * (0.4 + 0.6 * ch);
  const multi = bow.multi || 1;
  const P = p._pose;
  for (let i = 0; i < multi; i++) {
    const ang = p.aim + (i - (multi - 1) / 2) * 0.055;
    spawnArrow(P.hand.x + Math.cos(p.aim) * 10, P.hand.y + Math.sin(p.aim) * 10, ang, v, { side: 'p', dmg, fx: bow.fx, color: bow.color === 'rainbow' ? 'rainbow' : '#4d8dff', homing: bow.fx === 'homing' ? 1.6 : 0 });
  }
  Game.sta -= SHOT_COST; Game.reload = ps.reload; Game.shots++;
  p.draw = 0; Sfx.twang(1 + (1 - ch) * 0.3); Sfx.whoosh();
  if (!save.tut) { save.tut = true; persist(); }
}
function enemyShoot(e, kind) {
  const p = Game.player, L = Game.L, P = e._pose;
  const sx = P.sh.x, sy = P.sh.y;
  let tgt = p.center();
  if ((e.type === 'sniper' || e.boss) && rnd() < 0.35) tgt = { x: p._pose.head.x, y: p._pose.head.y };
  const acc = e.acc * L.accMul * (e.freeze > 0 ? 1.7 : 1);
  const mk = (tx, ty, high) => {
    const dx = Math.abs(tx - sx), h = sy - ty;
    const vmin = Math.sqrt(G * Math.max(1, h + Math.sqrt(dx * dx + h * h)));
    let v = high ? vmin * 1.3 : Math.max(1050, vmin * 1.12 + 60 + Math.abs(L.wind) * 1.3);
    let ang = solveAim(sx, sy, tx, ty, v, L.wind, high) + gauss() * acc;
    v *= 1 + gauss() * 0.015 * L.accMul;
    return { ang, v };
  };
  const fx = e.arrowFx;
  const push = (s, delay, fxo) => Game.pending.push({ t: delay, e, ang: s.ang, v: s.v, fx: fxo || fx });
  switch (kind) {
    case 'triple': { const b = mk(tgt.x, tgt.y); [-0.06, 0, 0.06].forEach(o => push({ ang: b.ang + o, v: b.v }, 0)); break; }
    case 'volley': for (let i = 0; i < 5; i++) push(mk(tgt.x, tgt.y), i * 0.14); break;
    case 'rain': for (let i = 0; i < 7; i++) push(mk(tgt.x + (i - 3) * 38, tgt.y, true), i * 0.07); break;
    case 'bomb': push(mk(tgt.x, tgt.y), 0, 'bomb'); break;
    case 'summon': {
      const free = L.slots.filter(sl => !sl.occupied || !sl.occupied.alive);
      const alive = Game.enemies.filter(x => x.alive && !x.boss).length;
      if (free.length && alive < 3) { const sl = pick(free); spawnEnemy(pick(['rekrut', 'schuetze', 'ritter']), sl, 0.1); addText(e.x, e.y - 150 * e.s, 'Hilfe! 📣', '#fff'); }
      push(mk(tgt.x, tgt.y), 0); break;
    }
    default:
      if (e.multi > 1) { const b = mk(tgt.x, tgt.y); for (let i = 0; i < e.multi; i++) push({ ang: b.ang + (i - (e.multi - 1) / 2) * 0.06, v: b.v }, 0); }
      else push(mk(tgt.x, tgt.y), 0);
  }
}
function firePending(dt) {
  for (const s of Game.pending) {
    s.t -= dt;
    if (s.t <= 0) {
      s.done = true; const e = s.e; if (!e.alive || Game.state !== 'playing') continue;
      e.aim = s.ang; e._pose = e.pose(); const P = e._pose;
      spawnArrow(P.hand.x, P.hand.y, s.ang, s.v, { side: 'e', dmg: e.dmg, fx: s.fx, color: e.arrowColor, homing: s.fx === 'magic' ? 0.9 : 0, len: e.boss ? 70 : 58 });
      Sfx.twang(e.boss ? 0.7 : 1.1);
    }
  }
  Game.pending = Game.pending.filter(s => !s.done);
}

function updateArrows(dt) {
  const L = Game.L, bodies = Composite.allBodies(Game.engine.world);
  for (const a of Game.arrows) {
    a.life += dt;
    if (a.stuck) {
      if (a.stuck.kind === 'body' && a.stuck.body.removed) a.dead = true;
      if (a.life > 10 && a.stuck.kind !== 'archer') { a.fade = (a.fade ?? 1) - dt; if (a.fade <= 0) a.dead = true; }
      continue;
    }
    if (a.homing && a.life > 0.2) {
      const tgt = a.side === 'p' ? nearestEnemy(a.x, a.y) : (Game.player.alive ? Game.player : null);
      if (tgt) {
        const c = tgt.center(), cur = Math.atan2(a.vy, a.vx), want = Math.atan2(c.y - a.y, c.x - a.x);
        let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        const turn = clamp(d, -a.homing * dt, a.homing * dt), sp = Math.hypot(a.vx, a.vy);
        a.vx = Math.cos(cur + turn) * sp; a.vy = Math.sin(cur + turn) * sp;
      }
    }
    a.vx += L.wind * dt; a.vy += G * dt;
    const nx = a.x + a.vx * dt, ny = a.y + a.vy * dt;
    let best = null;
    const targets = a.side === 'p' ? Game.enemies : [Game.player];
    for (const t of targets) {
      if (!t.alive || (t.dropping && t.y < 0)) continue;
      const h = t.hitTest(a.x, a.y, nx, ny); if (h && (!best || h.t < best.t)) best = { t: h.t, archer: t, part: h.part };
    }
    const minx = Math.min(a.x, nx) - 2, maxx = Math.max(a.x, nx) + 2, miny = Math.min(a.y, ny) - 2, maxy = Math.max(a.y, ny) + 2;
    for (const b of bodies) {
      if (b.plugin.pack && (a.side !== 'p' || !b.plugin.pack.chute && b.plugin.pack.alpha < 1)) continue;
      if (b.plugin.bow) continue;
      if (b.bounds.max.x < minx || b.bounds.min.x > maxx || b.bounds.max.y < miny || b.bounds.min.y > maxy) continue;
      const parts = b.parts.length > 1 ? b.parts.slice(1) : [b];
      for (const pt of parts) { const t = segPoly(a.x, a.y, nx, ny, pt.vertices); if (t !== null && (!best || t < best.t)) best = { t, body: b }; }
    }
    if (a.fx === 'fire' || a.fx === 'ice' || a.fx === 'magic' || a.fx === 'homing' || a.fx === 'zap' || a.fx === 'bomb') { a.trail.push({ x: a.x, y: a.y }); if (a.trail.length > 10) a.trail.shift(); }
    if (best) {
      const hx = a.x + (nx - a.x) * best.t, hy = a.y + (ny - a.y) * best.t;
      if (best.archer) onArcherHit(a, best.archer, best.part, hx, hy); else onBodyHit(a, best.body, hx, hy);
    } else { a.x = nx; a.y = ny; }
    if (!a.stuck && a.y > L.hazardY + 8 && !a.splashed) { a.splashed = true; burst(a.x, L.hazardY + 6, 6, [L.theme.hazard2, '#fff'], 180, 4, true, 0.5); }
    if (a.x < -700 || a.x > L.W + 700 || a.y > L.H + 300) a.dead = true;
  }
  Game.arrows = Game.arrows.filter(a => !a.dead);
}
function onArcherHit(a, t, part, hx, hy) {
  const ang = Math.atan2(a.vy, a.vx);
  a.x = hx + Math.cos(ang) * 12; a.y = hy + Math.sin(ang) * 12; a.trail = [];
  a.stuck = { kind: 'archer', archer: t, dx: a.x - t.x, dy: a.y - t.y, ang };
  t.stuck.push(a); if (t.stuck.length > 12) t.stuck.shift().dead = true;
  if (part === 'shield') { addText(hx, hy - 20, 'Geblockt!', '#cfe8ff'); Sfx.block(); burst(hx, hy, 8, ['#fff', '#ffd23f'], 260, 3, true, 0.4); return; }
  let dmg = a.dmg, head = false;
  if (part === 'head') { dmg *= 2 * (1 - t.headArmor); head = true; }
  else dmg *= (part === 'legs' || part === 'arm' ? 0.7 : 1) * (1 - t.armor);
  dmg = Math.max(1, Math.round(dmg));
  if (a.side === 'p') Game.hits++;
  damageArcher(t, dmg, { head, vx: a.vx, vy: a.vy, part, x: hx, y: hy });
  applyArrowFx(a, hx, hy, t);
}
function applyArrowFx(a, x, y, t) {
  if (a.fx === 'fire') { if (t) { t.burn = 3; t.burnDps = a.dmg * 0.12; } burst(x, y, 10, ['#ff4d00', '#ffd23f', '#ff9f1c'], 220, 5, false, 0.6); }
  else if (a.fx === 'ice') { if (t) t.freeze = 3.5; burst(x, y, 10, ['#bdf3ff', '#48cae4', '#fff'], 220, 4, true, 0.6); }
  else if (a.fx === 'zap' && t) {
    const others = Game.enemies.filter(e => e.alive && e !== t && dist(e.x, e.y, t.x, t.y) < 480);
    let from = { x, y };
    others.slice(0, 2).forEach(o => { const c = o.center(); Game.parts.push({ type: 'bolt', x1: from.x, y1: from.y, x2: c.x, y2: c.y, life: 0.3, max: 0.3 }); damageArcher(o, Math.round(a.dmg * 0.5 * (1 - o.armor)), { vx: 0, vy: -300, part: 'body', x: c.x, y: c.y }); from = c; });
    Sfx.zap();
  }
  else if (a.fx === 'bomb') { explode(x, y, a.dmg * 0.8, a.side); a.dead = true; }
  else if (a.fx === 'magic' || a.fx === 'homing') burst(x, y, 12, RAINBOW, 240, 4, false, 0.6);
}
function damageArcher(t, dmg, info) {
  if (!t.alive) return;
  if (t.side === 'p' && Game.state !== 'playing') return;
  t.hp -= dmg; t.flash = 0.1;
  const col = t.side === 'p' ? '#ff4d4d' : '#ffffff';
  addText(info.x, info.y - 30, (info.head ? 'KOPFTREFFER! ' : '') + '-' + dmg, info.head ? '#ffd23f' : col, info.head ? 30 : 24);
  burst(info.x, info.y, info.head ? 16 : 9, [colorOf(t.color, gameTime), '#fff', '#ffd23f'], 260, 4, true, 0.6, 'star');
  if (info.head) Sfx.head(); else Sfx.hit();
  if (t.side === 'p') { Sfx.hurt(); Game.shake = Math.max(Game.shake, 8); }
  if (t.boss) Game.shake = Math.max(Game.shake, 4);
  if (t.hp <= 0) killArcher(t, info);
}
function killArcher(t, info) {
  t.alive = false; t.hp = 0; t.state = 'dead';
  const R = makeRagdoll(t, info.vx || 0, info.vy || 0, info.part);
  for (const a of t.stuck) {
    if (a.dead) continue;
    let nb = null, nd = 1e9; for (const b of R.bodies) { const d = dist(a.x, a.y, b.position.x, b.position.y); if (d < nd) { nd = d; nb = b; } }
    const rx = a.x - nb.position.x, ry = a.y - nb.position.y, c = Math.cos(-nb.angle), s = Math.sin(-nb.angle);
    a.stuck = { kind: 'body', body: nb, lx: rx * c - ry * s, ly: rx * s + ry * c, la: a.stuck.ang - nb.angle }; a.life = 0;
  }
  t.stuck = [];
  if (t.side === 'e') {
    const L = Game.L; const c = Math.round(t.coins * (1 + L.n * 0.05));
    Game.earned += c; save.coins += c;
    addText(t.x, t.y - 150 * t.s, `+${c} 🪙`, '#ffd23f', 28);
    setTimeout(() => Sfx.coin(), 120);
    if (t.slot && t.slot.occupied === t) t.slot.occupied = null;
    if (t.boss) { Game.shake = 16; Sfx.explode(); burst(t.x, t.y - 100 * t.s, 60, RAINBOW, 600, 7, true, 1.4, 'star'); Game.bossRef = null; }
    UI.updateHud();
  } else {
    Game.state = 'lost'; Game.endTimer = 0; Game.input = null; setTimeout(() => Sfx.lose(), 300);
  }
}
function explode(x, y, dmg, side) {
  const R = 160;
  Sfx.explode(); Game.shake = Math.max(Game.shake, 12);
  burst(x, y, 30, ['#ff4d00', '#ffd23f', '#ff9f1c', '#fff'], 520, 8, false, 0.7);
  burst(x, y, 14, ['#555', '#777', '#999'], 200, 12, false, 1.1, 'smoke');
  Game.parts.push({ type: 'ring', x, y, life: 0.35, max: 0.35, r: R });
  const targets = side === 'p' ? Game.enemies : [Game.player];
  for (const t of targets) { if (!t.alive) continue; const c = t.center(); const d = dist(x, y, c.x, c.y); if (d < R) damageArcher(t, Math.max(1, Math.round(dmg * (1 - d / R * 0.6) * (1 - t.armor))), { vx: (c.x - x) * 6, vy: -500, part: 'body', x: c.x, y: c.y }); }
  for (const b of Composite.allBodies(Game.engine.world)) {
    if (b.isStatic) continue; const d = dist(x, y, b.position.x, b.position.y); if (d > R * 1.3) continue;
    const k = (1 - d / (R * 1.3)) * 900 * b.mass; const ang = Math.atan2(b.position.y - y, b.position.x - x);
    applyImpulse(b, b.position.x, b.position.y, Math.cos(ang) * k, Math.sin(ang) * k - 200 * b.mass);
  }
}
function onBodyHit(a, b, hx, hy) {
  if (b.plugin.pack) { collectPack(b); a.dead = true; return; }
  const ang = Math.atan2(a.vy, a.vx), emb = b.isStatic ? 14 : 10;
  const tx = hx + Math.cos(ang) * emb, ty = hy + Math.sin(ang) * emb;
  const rx = tx - b.position.x, ry = ty - b.position.y, c = Math.cos(-b.angle), s = Math.sin(-b.angle);
  a.stuck = { kind: 'body', body: b, lx: rx * c - ry * s, ly: rx * s + ry * c, la: ang - b.angle }; a.x = tx; a.y = ty; a.life = 0; a.trail = [];
  if (!b.isStatic) {
    const k = b.plugin.rag ? 0.28 : 0.45;
    applyImpulse(b, hx, hy, a.vx * k, a.vy * k);
  }
  if (b.plugin.rag) { Sfx.hit(); burst(hx, hy, 6, ['#fff', '#ffd23f'], 200, 3, true, 0.4, 'star'); }
  else { Sfx.wood(); burst(hx, hy, 5, ['#e0c097', '#fff'], 160, 3, true, 0.35); }
  if (a.fx === 'bomb') { explode(hx, hy, a.dmg * 0.8, a.side); a.dead = true; }
  else if (a.fx === 'fire' || a.fx === 'ice' || a.fx === 'magic' || a.fx === 'homing') applyArrowFx(a, hx, hy, null);
}

// ---------------------------------------------------------------- Ragdolls
function makeRagdoll(a, ivx, ivy, part) {
  const P = a._pose, s = a.s, group = Body.nextGroup(true);
  const col = a.freeze > 0 ? '#a8e8ff' : colorOf(a.color, gameTime);
  const limbC = a.limb || shade(col, 40);
  const opt = extra => Object.assign({ collisionFilter: { group }, frictionAir: 0.012, friction: 0.8, restitution: 0.1, density: 0.0016, label: 'rag' }, extra);
  const R = { bodies: [], cons: [], a, t: 0, hat: a.hat, skin: a.skin, side: a.side, s, plate: a.plate, helmTier: a.helmTier, splashed: false };
  const limb = (p, q, w, kind, color) => {
    const len = Math.max(dist(p.x, p.y, q.x, q.y), w * 0.8) + w * 0.4;
    const b = Bodies.rectangle((p.x + q.x) / 2, (p.y + q.y) / 2, len, w, opt({ angle: Math.atan2(q.y - p.y, q.x - p.x), chamfer: { radius: w * 0.45 } }));
    b.plugin.rag = { kind, len, w, color, R }; R.bodies.push(b); return b;
  };
  const torso = limb(P.neck, P.hip, 19 * s, 'torso', col);
  const head = Bodies.circle(P.head.x, P.head.y, 15 * s, opt({ density: 0.002 })); head.plugin.rag = { kind: 'head', R, r: 15 * s }; R.bodies.push(head);
  const ua = limb(P.sh, P.elbow, 8 * s, 'limb', limbC), la = limb(P.elbow, P.hand, 8 * s, 'limb', limbC);
  const ub = limb(P.sh, P.elbow2, 8 * s, 'limb', limbC), lb = limb(P.elbow2, P.hand2, 8 * s, 'limb', limbC);
  const tl = limb(P.hip, P.kneeL, 10 * s, 'limb', shade(limbC, -20)), sl = limb(P.kneeL, P.footL, 10 * s, 'limb', shade(limbC, -20));
  const tr = limb(P.hip, P.kneeR, 10 * s, 'limb', limbC), sr = limb(P.kneeR, P.footR, 10 * s, 'limb', limbC);
  const J = (A, B, pt) => R.cons.push(Constraint.create({ bodyA: A, bodyB: B, pointA: { x: pt.x - A.position.x, y: pt.y - A.position.y }, pointB: { x: pt.x - B.position.x, y: pt.y - B.position.y }, stiffness: 0.95, length: 0, damping: 0.05 }));
  J(torso, head, P.neck); J(torso, ua, P.sh); J(ua, la, P.elbow); J(torso, ub, P.sh); J(ub, lb, P.elbow2);
  J(torso, tl, P.hip); J(tl, sl, P.kneeL); J(torso, tr, P.hip); J(tr, sr, P.kneeR);
  // Bogen fällt separat
  const bow = Bodies.rectangle(P.hand.x, P.hand.y, 8 * s, 64 * s, opt({ angle: Math.atan2(P.dir.y, P.dir.x), density: 0.001 }));
  bow.plugin.bow = { color: a.bowColor, s }; bow.plugin.rag = { kind: 'bow', R }; R.bodies.push(bow);
  Composite.add(Game.engine.world, [...R.bodies, ...R.cons]);
  const k = 0.25 / Math.sqrt(s);
  for (const b of R.bodies) Body.setVelocity(b, { x: ivx / 60 * k + (rnd() - 0.5) * 0.6, y: ivy / 60 * k + a.vy / 60 - 1 });
  const hitB = part === 'head' ? head : part === 'legs' ? tl : part === 'arm' ? ua : torso;
  Body.setVelocity(hitB, { x: hitB.velocity.x + ivx / 60 * 0.45 * k * 4, y: hitB.velocity.y + ivy / 60 * 0.45 * k * 4 });
  Body.setAngularVelocity(torso, (ivx >= 0 ? 1 : -1) * 0.06);
  Game.ragdolls.push(R);
  return R;
}
function removeBody(b) { b.removed = true; Composite.remove(Game.engine.world, b); }

// ---------------------------------------------------------------- Pakete am Fallschirm
const PACKS = {
  hp: { color: '#ff4d6d', icon: '❤', label: 'Leben' },
  sta: { color: '#4d8dff', icon: '⚡', label: 'Ausdauer' },
  gold: { color: '#ffc300', icon: '★', label: 'Super' },
  coin: { color: '#2ec27e', icon: '🪙', label: 'Münzen' },
  bomb: { color: '#ff4d00', icon: '💣', label: 'Bombe' },
  weapon: { color: '#9b5de5', icon: '🏹', label: 'Neue Waffe' },
  upgrade: { color: '#ff9f1c', icon: '⬆', label: 'Upgrade' },
};
function spawnPack(forceType, forceX) {
  const L = Game.L, r = rnd();
  let type = forceType || (r < 0.42 ? 'hp' : r < 0.6 ? 'sta' : r < 0.69 ? 'gold' : r < 0.76 ? 'coin' : r < 0.94 ? 'bomb' : r < 0.975 ? 'upgrade' : 'weapon');
  if (type === "bomb" && L.n < 3 && !forceType) type = "hp";
  let x = lerp(L.player.x + 320, L.W * 0.86, rnd());
  if (type === 'bomb' && rnd() < 0.35) x = L.player.x + (rnd() - 0.5) * 80; // Bombe direkt über dir!
  if (forceX !== undefined) x = forceX;
  const b = type === 'bomb'
    ? Bodies.circle(x, -70, 20, { density: 0.0015, frictionAir: 0.01, friction: 0.8, restitution: 0.2, label: 'pack' })
    : Bodies.rectangle(x, -70, 46, 40, { density: 0.0012, frictionAir: 0.01, friction: 0.8, label: 'pack' });
  b.plugin.pack = { type, chute: true, t: rnd() * 5, landT: 0, alpha: 1, fuse: null };
  if (type === 'weapon' || type === 'upgrade') addText(x, 40, type === 'weapon' ? 'Waffenkiste! 🏹' : 'Upgrade-Kiste! ⬆', '#fff', 30);
  Composite.add(Game.engine.world, b); Game.packs.push(b);
}
function explodeBomb(b) {
  const x = b.position.x, y = b.position.y, R = 190, L = Game.L;
  Sfx.explode(); Game.shake = Math.max(Game.shake, 16);
  burst(x, y, 40, ['#ff4d00', '#ffd23f', '#ff9f1c', '#fff'], 620, 9, false, 0.8);
  burst(x, y, 18, ['#555', '#777', '#999'], 240, 14, false, 1.2, 'smoke');
  Game.parts.push({ type: 'ring', x, y, life: 0.4, max: 0.4, r: R });
  addText(x, y - 50, 'BUMM! 💥', '#ffd23f', 40);
  for (const t of [Game.player, ...Game.enemies]) {
    if (!t || !t.alive || t.dropping) continue;
    const c = t.center(), d = dist(x, y, c.x, c.y); if (d > R) continue;
    const k = 1 - d / R * 0.5;
    const base = t.side === 'p' ? t.maxHp * 0.3 : t.boss ? t.maxHp * 0.12 : t.maxHp * 0.65;
    damageArcher(t, Math.max(1, Math.round(base * k * (1 - t.armor * 0.5))), { vx: (c.x - x) * 8, vy: -600, part: 'body', x: c.x, y: c.y });
  }
  for (const o of Composite.allBodies(Game.engine.world)) {
    if (o.isStatic || o === b) continue; const d = dist(x, y, o.position.x, o.position.y); if (d > R * 1.4) continue;
    const k = (1 - d / (R * 1.4)) * 1100 * o.mass, ang = Math.atan2(o.position.y - y, o.position.x - x);
    applyImpulse(o, o.position.x, o.position.y, Math.cos(ang) * k, Math.sin(ang) * k - 250 * o.mass);
  }
  removeBody(b); b.plugin.pack.gone = true;
}
function givePackReward(type, x, y) {
  const p = Game.player;
  if (type === 'weapon') {
    const missing = BOWS.filter(bw => !save.bows.includes(bw.id));
    if (missing.length) {
      const bw = rnd() < 0.65 ? missing[0] : pick(missing);
      save.bows.push(bw.id); save.bow = bw.id; p.bowColor = bw.color; p.stringColor = bw.string;
      showBanner('Neue Waffe!', `🏹 ${bw.name} – sofort ausgerüstet!`, 2.2); addText(x, y - 30, bw.name + '!', '#e0c3ff', 32);
      Sfx.buy(); persist(); return;
    }
    type = 'upgrade';
  }
  if (type === 'upgrade') {
    const open = UPGRADES.filter(u => save.up[u.id] < u.max);
    if (!open.length) { const c = 200 + Game.L.n * 10; save.coins += c; Game.earned += c; addText(x, y - 30, `+${c} 🪙`, '#ffd23f', 32); UI.updateHud(); return; }
    const u = pick(open); save.up[u.id]++;
    if (u.id === 'hp') { p.maxHp += 15; p.hp += 15; }
    if (u.id === 'sta') Game.staMax += 12;
    showBanner('Gratis-Upgrade!', `${u.icon} ${u.name} → Stufe ${save.up[u.id]}`, 2.2); addText(x, y - 30, `${u.icon} ${u.name} +1`, '#ffd166', 30);
    Sfx.buy(); persist();
  }
}
function collectPack(b) {
  const pk = b.plugin.pack, p = Game.player, ps = playerStats();
  const x = b.position.x, y = b.position.y;
  if (pk.type === 'bomb') { explodeBomb(b); Game.packs = Game.packs.filter(q => q !== b); return; }
  if (pk.type === 'weapon' || pk.type === 'upgrade') givePackReward(pk.type, x, y);
  if (pk.type === 'hp' || pk.type === 'gold') { const h = Math.round(p.maxHp * (pk.type === 'gold' ? 0.3 : 0.4)); p.hp = Math.min(p.maxHp, p.hp + h); addText(x, y - 30, `+${h} ❤`, '#ff4d6d', 30); addText(p.x, p.y - 150, `+${h} ❤`, '#ff4d6d', 26); }
  if (pk.type === 'sta' || pk.type === 'gold') { Game.sta = Game.staMax; addText(x, y - 60, 'Ausdauer voll! ⚡', '#6fb1ff', 26); p.freeze = 0; }
  if (pk.type === 'coin') { const c = Math.round(20 + Game.L.n * 3); save.coins += c; Game.earned += c; addText(x, y - 30, `+${c} 🪙`, '#ffd23f', 30); Sfx.coin(); UI.updateHud(); }
  if (pk.type === 'gold') p.burn = 0;
  Sfx.heal(); burst(x, y, 26, [PACKS[pk.type].color, '#fff', '#ffd23f'], 380, 6, false, 0.9, 'star');
  removeBody(b); Game.packs = Game.packs.filter(q => q !== b);
}
function updatePacks(dt) {
  const L = Game.L;
  for (const b of Game.packs) {
    const pk = b.plugin.pack; pk.t += dt;
    if (pk.chute) {
      if (b.velocity.y > 1.4) {
        const vx = L.wind * 0.004 + Math.sin(pk.t * 1.3) * 0.35;
        Body.setVelocity(b, { x: lerp(b.velocity.x, vx, 0.1), y: 1.4 });
        Body.setAngle(b, Math.sin(pk.t * 1.3) * 0.12); Body.setAngularVelocity(b, 0);
      }
      if (pk.t > 1.5 && b.position.y > 0 && Math.abs(b.velocity.y) < 0.15) { pk.chute = false; Sfx.pop(); if (pk.type === 'bomb') { pk.fuse = 1.6; addText(b.position.x, b.position.y - 50, 'Achtung! 💣', '#ff4d4d', 28); } }
    } else if (pk.type === 'bomb') {
      pk.fuse -= dt; if (Math.floor(pk.fuse * 8) % 2 === 0 && rnd() < 0.5) Sfx.tone(1200, 0.04, 'square', 0.04);
      if (pk.fuse <= 0 && Game.state === 'playing') { explodeBomb(b); continue; }
    } else { pk.landT += dt; if (pk.landT > 9) pk.alpha -= dt; }
    if (pk.type === 'bomb' && b.position.y > L.hazardY + 10 && !pk.gone) { burst(b.position.x, L.hazardY, 10, [L.theme.hazard2, '#fff'], 250, 5, true, 0.6); Sfx.splash(); removeBody(b); pk.gone = true; continue; }
    if (pk.alpha <= 0 || b.position.y > L.H + 200) { removeBody(b); pk.gone = true; }
  }
  Game.packs = Game.packs.filter(b => !b.plugin.pack.gone);
}

// ---------------------------------------------------------------- Partikel
function burst(x, y, n, colors, spd = 300, size = 5, grav = true, life = 0.8, type = 'dot') {
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, v = spd * (0.3 + rnd() * 0.7);
    Game.parts.push({ type, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (grav ? spd * 0.3 : 0), life: life * (0.6 + rnd() * 0.6), max: life, color: pick(colors), size: size * (0.6 + rnd() * 0.8), grav, rot: rnd() * 6, vr: (rnd() - 0.5) * 10 });
  }
}
function addText(x, y, txt, color, size = 24) { Game.texts.push({ x, y, txt, color, size, t: 0, life: 1.2 }); }
function newAmbient(L, init) {
  const t = L.theme.part, W = L.W, H = L.H;
  const a = { type: t, x: rnd() * W, y: init ? rnd() * H : -20, s: 1 + rnd() * 2.5, ph: rnd() * 6, life: 4 + rnd() * 6, t: 0 };
  if (t === 'ember' || t === 'bubble') a.y = init ? rnd() * H : L.hazardY + rnd() * 30;
  if (t === 'dust') a.x = init ? rnd() * W : -20;
  return a;
}
function updateAmbient(dt) {
  const L = Game.L;
  for (let i = 0; i < Game.ambient.length; i++) {
    const a = Game.ambient[i]; a.t += dt;
    switch (a.type) {
      case 'snow': a.y += (30 + a.s * 20) * dt; a.x += Math.sin(a.t + a.ph) * 20 * dt + L.wind * 0.2 * dt; break;
      case 'petal': a.y += (25 + a.s * 10) * dt; a.x += (Math.sin(a.t * 2 + a.ph) * 30 + 20 + L.wind * 0.2) * dt; break;
      case 'ember': a.y -= (40 + a.s * 25) * dt; a.x += Math.sin(a.t * 3 + a.ph) * 25 * dt; break;
      case 'bubble': a.y -= (30 + a.s * 12) * dt; a.x += Math.sin(a.t * 2 + a.ph) * 15 * dt; break;
      case 'dust': a.x += (60 + a.s * 30 + L.wind * 0.4) * dt; a.y += Math.sin(a.t + a.ph) * 10 * dt; break;
      case 'firefly': a.x += Math.sin(a.t * 0.9 + a.ph) * 30 * dt; a.y += Math.cos(a.t * 1.1 + a.ph) * 25 * dt; break;
      default: break;
    }
    const out = a.y > L.H + 30 || a.y < -40 || a.x > L.W + 40 || a.x < -60 || ((a.type === 'firefly' || a.type === 'sparkle' || a.type === 'star') && a.t > a.life);
    if (out) Game.ambient[i] = newAmbient(L, a.type === 'firefly' || a.type === 'sparkle' || a.type === 'star');
  }
}
function updateParticles(dt) {
  for (const p of Game.parts) {
    p.life -= dt;
    if (p.type === 'bolt' || p.type === 'ring') continue;
    if (p.grav) p.vy += 900 * dt;
    if (p.type === 'smoke') { p.vx *= 0.95; p.vy = p.vy * 0.95 - 20 * dt; p.size += 12 * dt; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  }
  Game.parts = Game.parts.filter(p => p.life > 0);
  for (const t of Game.texts) { t.t += dt; t.y -= 45 * dt; }
  Game.texts = Game.texts.filter(t => t.t < t.life);
  for (const c of Game.confetti) {
    c.vy += 260 * dt; c.vx *= 0.99; c.vy = Math.min(c.vy, 170 + c.w * 6);
    c.x += (c.vx + Math.sin(c.t * 4 + c.ph) * 40) * dt; c.y += c.vy * dt; c.rot += c.vr * dt; c.t += dt;
  }
  Game.confetti = Game.confetti.filter(c => c.y < view.h + 40 && c.t < 7);
}
function confettiBurst() {
  const cols = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff70a6', '#00f5d4', '#ffffff'];
  const mk = (x, y, vx, vy) => Game.confetti.push({ x, y, vx, vy, rot: rnd() * 6, vr: (rnd() - 0.5) * 14, w: 6 + rnd() * 8, h: 4 + rnd() * 6, color: pick(cols), t: 0, ph: rnd() * 6 });
  for (let i = 0; i < 140; i++) mk(rnd() * view.w, -20 - rnd() * view.h * 0.6, (rnd() - 0.5) * 80, rnd() * 100);
  for (let i = 0; i < 70; i++) { mk(0, view.h, 150 + rnd() * 400, -(500 + rnd() * 600)); mk(view.w, view.h, -(150 + rnd() * 400), -(500 + rnd() * 600)); }
}

// ---------------------------------------------------------------- Update
function lerpAngle(a, b, t) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; }
function playerJump() {
  const p = Game.player;
  if (Game.state !== 'playing' || !p || !p.alive || p.air) return;
  if (Game.sta < JUMP_COST) { addText(p.x, p.y - 160, 'Keine Ausdauer!', '#6fb1ff', 22); return; }
  Game.sta -= JUMP_COST; p.vy = -560; p.air = true; Sfx.jump();
}
function win() {
  const L = Game.L, p = Game.player;
  Game.state = 'won'; Game.endTimer = 0; Game.shown = false; Game.input = null;
  for (const a of Game.arrows) if (!a.stuck && a.side === 'e') { a.dead = true; burst(a.x, a.y, 5, ['#fff'], 120, 3, false, 0.4); }
  p.dancing = true; p.danceT = 0; p.draw = 0; p.air = false; p.y = p.baseY; p.vy = 0; p.burn = 0; p.freeze = 0;
  const ratio = p.hp / p.maxHp;
  const stars = ratio >= 0.7 ? 3 : ratio >= 0.35 ? 2 : 1;
  const bonus = Math.round(15 + L.n * 4 + (L.boss ? (L.bigBoss ? 150 + L.n * 6 : 60 + L.n * 3) : 0));
  const prev = save.stars[L.n] || 0;
  save.coins += bonus; Game.earned += bonus;
  save.stars[L.n] = Math.max(prev, stars); save.best = Math.max(save.best, L.n); persist();
  Game.result = { stars, bonus, prev, acc: Game.shots ? Math.round(Game.hits / Game.shots * 100) : 0, hp: Math.round(ratio * 100) };
  Sfx.fanfare(); confettiBurst(); setTimeout(() => { if (Game.state === 'won') confettiBurst(); }, 1100);
  addText(p.x, p.y - 190, 'SIEG! 🎉', '#ffd23f', 44);
  UI.updateHud();
}
function update(dt) {
  const L = Game.L; if (!L || Game.state === 'paused') return;
  gameTime += dt; Game.time += dt;
  Game.shake = Math.max(0, Game.shake - 40 * dt);
  // bewegliche Plattformen
  for (const p of Game.platforms) {
    if (p.moving || p.floatMove) {
      const m = p.moving || p.floatMove; const nt = p.baseTop + Math.sin(Game.time * m.spd + m.ph) * m.amp;
      const oy = p.top; p.top = nt;
      Body.setPosition(p.body, { x: p.x, y: nt + p.h / 2 }); Body.setVelocity(p.body, { x: 0, y: nt - oy });
    }
  }
  Engine.update(Game.engine, 1000 / 60);
  const p = Game.player, ps = playerStats();
  p.t += dt; p.flash -= dt;
  if (p.alive) {
    if (p.burn > 0) { p.burn -= dt; p.hp -= p.burnDps * dt; if (rnd() < 0.3) burst(p.x, p.y - 60, 1, ['#ff9f1c', '#ff4d00'], 60, 5, false, 0.5); if (p.hp <= 0 && Game.state === 'playing') killArcher(p, { vx: -100, vy: -300, part: 'body', x: p.x, y: p.y - 60 }); }
    if (p.freeze > 0) p.freeze -= dt;
    const slow = p.freeze > 0 ? 0.5 : 1;
    Game.sta = Math.min(Game.staMax, Game.sta + ps.regen * dt * slow);
    Game.reload -= dt;
    if (Game.input && Game.reload <= 0 && Game.state === 'playing') p.draw = Math.min(1, p.draw + dt * ps.pull * slow);
    p.nocked = Game.reload <= 0 && Game.state === 'playing';
    if (p.air) { p.vy += G * dt; p.y += p.vy * dt; if (p.y >= p.baseY) { p.y = p.baseY; p.vy = 0; p.air = false; } }
    if (Game.state === 'won') p.danceT += dt;
    p._pose = p.pose();
  }
  // Gegner
  for (const e of Game.enemies) {
    e.t += dt; e.flash -= dt;
    if (!e.alive) continue;
    if (e.plat) e.baseY = e.plat.top;
    if (e.dropping) {
      if (e.dropDelay > 0) { e.dropDelay -= dt; e.y = -300; }
      else { e.vy += G * 1.4 * dt; e.y += e.vy * dt; if (e.y >= e.baseY) { e.y = e.baseY; e.vy = 0; e.dropping = false; burst(e.x, e.y, 12, ['#fff', L.theme.towerTop], 220, 6, true, 0.6, 'smoke'); Sfx.wood(); if (e.boss) Game.shake = 12; } }
    } else if (e.air) { e.vy += G * dt; e.y += e.vy * dt; if (e.y >= e.baseY) { e.y = e.baseY; e.vy = 0; e.air = false; } }
    else e.y = e.baseY;
    if (e.burn > 0) { e.burn -= dt; e.hp -= e.burnDps * dt; if (e.hp <= 0) killArcher(e, { vx: 100, vy: -300, part: 'body', x: e.x, y: e.y - 60 }); }
    if (!e.alive) continue;
    if (e.freeze > 0) e.freeze -= dt;
    if (e.dodgeAt && Game.time >= e.dodgeAt) { e.dodgeAt = null; if (!e.air && !e.dropping) { e.vy = -600; e.air = true; } }
    if (Game.state === 'playing' && p.alive && !e.dropping) {
      e.cool -= dt * (e.freeze > 0 ? 0.55 : 1);
      if (e.state === 'idle') {
        e.aim = lerpAngle(e.aim, Math.PI + 0.35, 0.03);
        if (e.cool <= 0) {
          e.kind = e.boss ? pick(e.attacks) : 'single';
          const c = p.center(), P = e._pose;
          e.targetAim = solveAim(P.sh.x, P.sh.y, c.x, c.y, 1250, L.wind, e.kind === 'rain');
          e.state = 'drawing'; e.drawT = 0;
        }
      } else if (e.state === 'drawing') {
        e.drawT += dt; const dur = e.boss ? 0.8 : 0.6;
        e.draw = Math.min(1, e.drawT / dur); e.aim = lerpAngle(e.aim, e.targetAim, 0.15);
        if (e.drawT >= dur + 0.05) { enemyShoot(e, e.kind); e.state = 'idle'; e.draw = 0; e.cool = e.rate * L.rateMul * (0.75 + rnd() * 0.5) + (e.kind === 'volley' ? 0.6 : 0); }
      }
    }
    if (Game.state === 'lost' && !e.dancing) { e.dancing = true; e.danceT = rnd(); e.draw = 0; e.state = 'idle'; }
    if (e.dancing) e.danceT += dt;
    e.nocked = e.state === 'drawing';
    e._pose = e.pose();
  }
  firePending(dt);
  updateArrows(dt);
  updatePacks(dt);
  // Ragdolls & Kisten aufräumen
  for (const R of Game.ragdolls) {
    R.t += dt;
    const torso = R.bodies[0];
    if (!R.splashed && torso.position.y > L.hazardY) { R.splashed = true; burst(torso.position.x, L.hazardY, 18, [L.theme.hazard2, '#fff', L.theme.hazard], 380, 6, true, 0.8); Sfx.splash(); }
    if (R.bodies.every(b => b.position.y > L.H + 250)) { R.gone = true; R.bodies.forEach(removeBody); R.cons.forEach(c => Composite.remove(Game.engine.world, c)); }
  }
  Game.ragdolls = Game.ragdolls.filter(R => !R.gone);
  for (const c of Game.crates) {
    if (!c.plugin.splashed && c.position.y > L.hazardY) { c.plugin.splashed = true; burst(c.position.x, L.hazardY, 10, [L.theme.hazard2, '#fff'], 300, 5, true, 0.7); Sfx.splash(); }
    if (c.position.y > L.H + 250 && !c.removed) removeBody(c);
  }
  Game.crates = Game.crates.filter(c => !c.removed);
  updateParticles(dt); updateAmbient(dt);
  for (const c of L.clouds) { c.x += c.v * dt; if (c.x > L.W + 300) c.x = -300; }
  if (Game.banner) { Game.banner.t += dt; if (Game.banner.t > Game.banner.dur) Game.banner = null; }
  if (Game.state === 'playing') {
    Game.packTimer -= dt;
    if (Game.packTimer <= 0) { spawnPack(); Game.packTimer = 9 + rnd() * 8; }
    const alive = Game.enemies.filter(e => e.alive).length;
    if (alive === 0) {
      Game.waveTimer -= dt;
      if (Game.waveTimer <= 0) { if (Game.waveIdx < L.waves.length - 1) { if (Game.waveIdx >= 0 && p.alive) { const h = Math.round(p.maxHp * 0.15); p.hp = Math.min(p.maxHp, p.hp + h); addText(p.x, p.y - 170, `+${h} ❤`, '#ff4d6d', 26); } spawnWave(Game.waveIdx + 1); Game.waveTimer = 1.5; UI.updateHud(); } else win(); }
    }
  } else if (Game.state === 'won' || Game.state === 'lost') {
    Game.endTimer += dt;
    if (!Game.shown && Game.state === 'won' && Game.endTimer > 2.8) { Game.shown = true; UI.showWin(); }
    if (!Game.shown && Game.state === 'lost' && Game.endTimer > 1.5) { Game.shown = true; persist(); UI.showLose(); }
  }
}

// ---------------------------------------------------------------- Rendern
const canvas = document.getElementById('game');
ctx = canvas.getContext('2d');
const view = { w: 800, h: 450, dpr: 1, sc: 1, ox: 0, oy: 0 };
function resize() {
  view.dpr = Math.min(2, window.devicePixelRatio || 1);
  view.w = window.innerWidth; view.h = window.innerHeight;
  canvas.width = Math.round(view.w * view.dpr); canvas.height = Math.round(view.h * view.dpr);
  const L = Game.L; if (!L) return;
  const sc = Math.min(view.w / L.W, view.h / L.H);
  view.sc = sc; view.ox = (view.w - L.W * sc) / 2; view.oy = (view.h - L.H * sc);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 150));
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
const FONT = '"Lilita One", "Arial Rounded MT Bold", system-ui, sans-serif';

function hillY(pts, x) {
  for (let i = 0; i < pts.length - 1; i++) if (x >= pts[i][0] && x <= pts[i + 1][0]) { const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return lerp(pts[i][1], pts[i + 1][1], t); }
  return pts[pts.length - 1][1];
}
function buildDeco(L) {
  const r = mulberry32(L.decoSeed), d = [], T = L.theme, W = L.W, H = L.H;
  const on = (pts, x) => hillY(pts, x);
  switch (T.deco) {
    case 'flowers': for (let i = 0; i < 46; i++) { const x = -200 + r() * (W + 400); d.push({ k: 'flower', layer: 'near', x, y: on(L.nearHill, x) + 6 + r() * 30, s: 0.7 + r() * 0.8, c: pick(['#ff595e', '#ffca3a', '#ff70a6', '#ffffff', '#9b5de5'], r) }); } for (let i = 0; i < 7; i++) { const x = r() * W; d.push({ k: 'tree', layer: 'far', x, y: on(L.farHill, x) + 10, s: 0.8 + r() * 0.7, c: pick(['#2e9e5b', '#43aa8b', '#6bbf59'], r) }); } break;
    case 'cactus': for (let i = 0; i < 8; i++) { const x = r() * W; d.push({ k: 'cactus', layer: 'far', x, y: on(L.farHill, x) + 8, s: 0.7 + r() * 0.8 }); } d.push({ k: 'pyramid', layer: 'sky', x: W * (0.25 + r() * 0.5), y: H * 0.72, s: 1.4 }); break;
    case 'pines': for (let i = 0; i < 18; i++) { const x = -100 + r() * (W + 200); d.push({ k: 'pine', layer: 'far', x, y: on(L.farHill, x) + 12, s: 0.6 + r() * 0.8 }); } break;
    case 'volcano': d.push({ k: 'volcano', layer: 'sky', x: W * (0.45 + r() * 0.15), y: H * 0.75, s: 1.6 }); break;
    case 'lollis': for (let i = 0; i < 12; i++) { const x = r() * W; d.push({ k: 'lolli', layer: 'far', x, y: on(L.farHill, x) + 6, s: 0.6 + r() * 0.9, c: pick(['#ff595e', '#8ac926', '#1982c4', '#ffca3a', '#9b5de5'], r) }); } break;
    case 'ships': for (let i = 0; i < 3; i++) d.push({ k: 'ship', layer: 'far', x: W * (0.15 + i * 0.3 + r() * 0.1), y: H * 0.68, s: 0.7 + r() * 0.5 }); break;
    case 'palms': for (let i = 0; i < 9; i++) { const x = r() * W; d.push({ k: 'palm', layer: 'far', x, y: on(L.farHill, x) + 10, s: 0.7 + r() * 0.7 }); } break;
    case 'ghosts': for (let i = 0; i < 5; i++) d.push({ k: 'ghost', layer: 'sky', x: r() * W, y: H * (0.15 + r() * 0.35), s: 0.6 + r() * 0.7, ph: r() * 6 }); for (let i = 0; i < 6; i++) { const x = r() * W; d.push({ k: 'deadtree', layer: 'far', x, y: on(L.farHill, x) + 10, s: 0.7 + r() * 0.6 }); } break;
    case 'planets': for (let i = 0; i < 4; i++) d.push({ k: 'planet', layer: 'sky', x: r() * W, y: H * (0.1 + r() * 0.4), s: 0.4 + r() * 0.8, c: pick(['#ff9e6d', '#7bdff2', '#b388ff', '#f7d6e0', '#caffbf'], r), ring: r() < 0.5 }); break;
    case 'rainbow': for (let i = 0; i < 2; i++) d.push({ k: 'rainbow', layer: 'sky', x: W * (0.2 + i * 0.55), y: H * 0.8, s: 0.6 + r() * 0.4 }); for (let i = 0; i < 20; i++) { const x = r() * W; d.push({ k: 'flower', layer: 'near', x, y: on(L.nearHill, x) + 10 + r() * 20, s: 0.8 + r() * 0.6, c: pick(RAINBOW, r) }); } break;
  }
  return d;
}
function drawDeco(o) {
  const s = o.s; ctx.save(); ctx.translate(o.x, o.y); ctx.lineCap = 'round';
  switch (o.k) {
    case 'flower': ctx.strokeStyle = '#2d8a3e'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -16 * s); ctx.stroke(); ctx.fillStyle = o.c; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 6 * s, -16 * s + Math.sin(a) * 6 * s, 4.5 * s, 0, 7); ctx.fill(); } ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, -16 * s, 3.5 * s, 0, 7); ctx.fill(); break;
    case 'tree': ctx.fillStyle = '#7a4a24'; ctx.fillRect(-6 * s, -60 * s, 12 * s, 60 * s); ctx.fillStyle = o.c; [[0, -80, 38], [-26, -62, 26], [26, -62, 26]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x * s, y * s, r * s, 0, 7); ctx.fill(); }); break;
    case 'cactus': ctx.strokeStyle = '#3a9d4a'; ctx.lineWidth = 16 * s; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -80 * s); ctx.moveTo(0, -40 * s); ctx.lineTo(-22 * s, -40 * s); ctx.lineTo(-22 * s, -62 * s); ctx.moveTo(0, -30 * s); ctx.lineTo(20 * s, -30 * s); ctx.lineTo(20 * s, -54 * s); ctx.stroke(); break;
    case 'pyramid': ctx.fillStyle = '#f0b86e'; ctx.beginPath(); ctx.moveTo(-220 * s, 0); ctx.lineTo(0, -190 * s); ctx.lineTo(220 * s, 0); ctx.fill(); ctx.fillStyle = '#d99a4e'; ctx.beginPath(); ctx.moveTo(0, -190 * s); ctx.lineTo(220 * s, 0); ctx.lineTo(40 * s, 0); ctx.fill(); break;
    case 'pine': ctx.fillStyle = '#2d6a4f'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-28 * s + i * 5 * s, -i * 26 * s); ctx.lineTo(0, -(i * 26 + 44) * s); ctx.lineTo(28 * s - i * 5 * s, -i * 26 * s); ctx.fill(); } ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-9 * s, -86 * s); ctx.lineTo(0, -96 * s); ctx.lineTo(9 * s, -86 * s); ctx.fill(); break;
    case 'volcano': { ctx.fillStyle = '#4a1c1c'; ctx.beginPath(); ctx.moveTo(-420 * s, 0); ctx.lineTo(-70 * s, -300 * s); ctx.lineTo(70 * s, -300 * s); ctx.lineTo(420 * s, 0); ctx.fill(); ctx.fillStyle = '#ff4800'; ctx.beginPath(); ctx.moveTo(-70 * s, -300 * s); ctx.lineTo(70 * s, -300 * s); ctx.lineTo(40 * s, -250 * s); ctx.lineTo(10 * s, -200 * s); ctx.lineTo(-20 * s, -260 * s); ctx.closePath(); ctx.fill(); for (let i = 0; i < 5; i++) { const t = (gameTime * 0.15 + i / 5) % 1; ctx.fillStyle = `rgba(70,50,50,${0.5 * (1 - t)})`; ctx.beginPath(); ctx.arc(Math.sin(i * 3 + t * 3) * 40 * s, (-320 - t * 300) * s, (30 + t * 70) * s, 0, 7); ctx.fill(); } break; }
    case 'lolli': ctx.strokeStyle = '#fff'; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -70 * s); ctx.stroke(); ctx.fillStyle = o.c; ctx.beginPath(); ctx.arc(0, -90 * s, 26 * s, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 5 * s; ctx.beginPath(); for (let a = 0; a < 12; a += 0.2) ctx.lineTo(Math.cos(a) * a * 2 * s, -90 * s + Math.sin(a) * a * 2 * s); ctx.stroke(); break;
    case 'ship': { const b = Math.sin(gameTime + o.x) * 4; ctx.translate(0, b); ctx.fillStyle = '#6d4c2f'; ctx.beginPath(); ctx.moveTo(-70 * s, -20 * s); ctx.lineTo(70 * s, -20 * s); ctx.lineTo(50 * s, 10 * s); ctx.lineTo(-50 * s, 10 * s); ctx.fill(); ctx.fillStyle = '#5a3d25'; ctx.fillRect(-3 * s, -120 * s, 6 * s, 100 * s); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(4 * s, -115 * s); ctx.quadraticCurveTo(50 * s, -80 * s, 4 * s, -30 * s); ctx.fill(); ctx.fillStyle = '#1b1b2f'; ctx.fillRect(-3 * s, -135 * s, 26 * s, 16 * s); break; }
    case 'palm': ctx.strokeStyle = '#8d5a2b'; ctx.lineWidth = 10 * s; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(14 * s, -60 * s, 6 * s, -120 * s); ctx.stroke(); ctx.strokeStyle = '#2d9d4a'; ctx.lineWidth = 9 * s; for (let i = 0; i < 6; i++) { const a = -Math.PI + i * 0.6 + Math.sin(gameTime + i) * 0.05; ctx.beginPath(); ctx.moveTo(6 * s, -120 * s); ctx.quadraticCurveTo(6 * s + Math.cos(a) * 30 * s, -140 * s + Math.sin(a) * 20 * s, 6 * s + Math.cos(a) * 60 * s, -110 * s + Math.sin(a) * 10 * s); ctx.stroke(); } break;
    case 'ghost': { const y = Math.sin(gameTime * 1.5 + o.ph) * 14; ctx.translate(Math.sin(gameTime * 0.5 + o.ph) * 30, y); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(0, 0, 26 * s, Math.PI, 0); ctx.lineTo(26 * s, 34 * s); for (let i = 0; i < 4; i++) ctx.lineTo((26 - (i + 0.5) * 13) * s, (i % 2 ? 34 : 26) * s); ctx.lineTo(-26 * s, 34 * s); ctx.fill(); ctx.fillStyle = '#1b1646'; ctx.beginPath(); ctx.arc(-8 * s, -4 * s, 4 * s, 0, 7); ctx.arc(8 * s, -4 * s, 4 * s, 0, 7); ctx.fill(); break; }
    case 'deadtree': ctx.strokeStyle = '#2a1f4a'; ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -80 * s); ctx.moveTo(0, -50 * s); ctx.lineTo(-26 * s, -76 * s); ctx.moveTo(0, -62 * s); ctx.lineTo(24 * s, -92 * s); ctx.stroke(); break;
    case 'planet': ctx.fillStyle = o.c; ctx.beginPath(); ctx.arc(0, 0, 50 * s, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.arc(14 * s, 10 * s, 44 * s, 0, 7); ctx.fill(); if (o.ring) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.ellipse(0, 0, 85 * s, 18 * s, -0.3, 0, 7); ctx.stroke(); } break;
    case 'rainbow': ctx.lineWidth = 26 * s; RAINBOW.forEach((c, i) => { ctx.strokeStyle = c; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(0, 0, (320 - i * 26) * s, Math.PI, 0); ctx.stroke(); }); ctx.globalAlpha = 1; break;
  }
  ctx.restore();
}
function fillHill(pts, color, bottom) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(pts[0][0], bottom);
  for (const p of pts) ctx.lineTo(p[0], p[1]);
  ctx.lineTo(pts[pts.length - 1][0], bottom); ctx.closePath(); ctx.fill();
}
function drawCloud(x, y, s, col) {
  ctx.fillStyle = col; ctx.beginPath();
  [[0, 0, 40], [38, -12, 34], [72, 4, 30], [-34, 8, 28], [30, 14, 34]].forEach(([dx, dy, r]) => { ctx.moveTo(x + dx * s + r * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7); });
  ctx.fill();
}
function drawBackground(L, bottom) {
  const T = L.theme, W = L.W, H = L.H;
  // Sterne
  if (T.name === 'Geisternacht' || T.name === 'Weltall') { for (const st of L.stars) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(gameTime * 2 + st.p); ctx.fillStyle = '#fff'; ctx.fillRect(st.x * (W + 800) - 400, st.y * H - 300, st.s * 1.6, st.s * 1.6); } ctx.globalAlpha = 1; }
  // Sonne / Mond
  const sx = W * 0.8, sy = H * 0.17;
  if (T.sun === 'sun' || T.sun === 'rainbow') {
    const g = ctx.createRadialGradient(sx, sy, 20, sx, sy, 180); g.addColorStop(0, 'rgba(255,245,170,.9)'); g.addColorStop(1, 'rgba(255,245,170,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 180, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(gameTime * 0.2); ctx.fillStyle = 'rgba(255,236,120,.5)';
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(-10, -70); ctx.lineTo(0, -110); ctx.lineTo(10, -70); ctx.fill(); }
    ctx.restore(); ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(sx, sy, 58, 0, 7); ctx.fill();
  } else if (T.sun === 'moon') {
    const g = ctx.createRadialGradient(sx, sy, 20, sx, sy, 200); g.addColorStop(0, 'rgba(230,220,255,.6)'); g.addColorStop(1, 'rgba(230,220,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 200, 0, 7); ctx.fill();
    ctx.fillStyle = '#fdf6d8'; ctx.beginPath(); ctx.arc(sx, sy, 62, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.08)'; [[-18, -12, 12], [16, 14, 9], [20, -20, 6]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(sx + x, sy + y, r, 0, 7); ctx.fill(); });
  } else if (T.sun === 'planet') {
    ctx.fillStyle = '#ff7eb6'; ctx.beginPath(); ctx.arc(sx, sy, 90, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(sx - 90, sy - 20, 180, 14); ctx.fillRect(sx - 85, sy + 20, 170, 10);
    ctx.strokeStyle = 'rgba(255,230,160,.8)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.ellipse(sx, sy, 150, 32, -0.25, 0, 7); ctx.stroke();
  }
  const deco = L.deco;
  for (const o of deco) if (o.layer === 'sky') drawDeco(o);
  if (T.name !== 'Weltall') for (const c of L.clouds) drawCloud(c.x, c.y, c.s, T.name === 'Vulkan' ? 'rgba(60,40,40,.55)' : T.name === 'Geisternacht' ? 'rgba(160,140,220,.25)' : 'rgba(255,255,255,.85)');
  fillHill(L.farHill, T.far, bottom);
  for (const o of deco) if (o.layer === 'far') drawDeco(o);
  fillHill(L.nearHill, T.near, bottom);
  for (const o of deco) if (o.layer === 'near') drawDeco(o);
}
function drawPlatform(p, T, L) {
  const x = p.x - p.w / 2, y = p.top, w = p.w, h = p.floating ? p.h : (L.H * 1.5 - y);
  ctx.fillStyle = T.tower; ctx.beginPath(); ctx.roundRect(x, y, w, h, p.floating ? 10 : 4); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, p.floating ? 10 : 4); ctx.clip();
  ctx.strokeStyle = T.brick; ctx.lineWidth = 3;
  for (let i = 0, yy = y + 30; yy < Math.min(y + h, L.H + 200); yy += 30, i++) {
    ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
    for (let xx = x + (i % 2 ? 28 : 0) + 28; xx < x + w; xx += 56) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy - 30); ctx.stroke(); }
  }
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(x, y, 10, h);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(x + w - 14, y, 14, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(38,38,58,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x, y, w, h, p.floating ? 10 : 4); ctx.stroke();
  ctx.fillStyle = T.towerTop; ctx.beginPath(); ctx.roundRect(x - 8, y - 10, w + 16, 18, 9); ctx.fill();
  for (let xx = x; xx < x + w; xx += 22) { ctx.beginPath(); ctx.arc(xx + 11, y + 7, 7, 0, Math.PI); ctx.fill(); }
  ctx.strokeStyle = 'rgba(38,38,58,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - 8, y - 10, w + 16, 18, 9); ctx.stroke();
}
function drawBodyThing(b) {
  ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
  if (b.plugin.crate) {
    const s = b.plugin.crate.size / 2, m = b.plugin.crate.metal;
    ctx.fillStyle = m ? '#9aa5b1' : '#d08c45'; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-s, -s, s * 2, s * 2, 4); ctx.fill(); ctx.stroke();
    if (m) { ctx.fillStyle = '#5c6773'; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => { ctx.beginPath(); ctx.arc(a * (s - 7), c * (s - 7), 3, 0, 7); ctx.fill(); }); }
    else { ctx.strokeStyle = '#8a5424'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-s + 5, -s + 5); ctx.lineTo(s - 5, s - 5); ctx.moveTo(s - 5, -s + 5); ctx.lineTo(-s + 5, s - 5); ctx.stroke(); ctx.strokeRect(-s + 5, -s + 5, s * 2 - 10, s * 2 - 10); }
  } else if (b.plugin.pack) {
    const pk = b.plugin.pack, P = PACKS[pk.type];
    ctx.globalAlpha = clamp(pk.alpha, 0, 1);
    if (pk.chute) {
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-22, -18); ctx.lineTo(-52, -78); ctx.moveTo(22, -18); ctx.lineTo(52, -78); ctx.moveTo(-10, -20); ctx.lineTo(-18, -88); ctx.moveTo(10, -20); ctx.lineTo(18, -88); ctx.stroke();
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#fff' : P.color; ctx.beginPath(); ctx.moveTo(0, -80); ctx.arc(0, -80, 58, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -80, 58, Math.PI, 0); ctx.closePath(); ctx.stroke();
    }
    if (pk.type === 'bomb') {
      const hot = pk.fuse !== null, blink = hot && Math.floor(pk.fuse * (pk.fuse < 0.6 ? 16 : 8)) % 2 === 0;
      const sc = hot ? 1 + (1.6 - pk.fuse) * 0.12 : 1; ctx.scale(sc, sc);
      ctx.fillStyle = blink ? '#ff3b3b' : '#2b2b3a'; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-7, -7, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#6b7280'; ctx.fillRect(-6, -26, 12, 8);
      ctx.strokeStyle = '#c8a26b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -26); ctx.quadraticCurveTo(8, -36, 4, -42); ctx.stroke();
      ctx.fillStyle = pick(['#ffd23f', '#ff9f1c', '#fff']); ctx.beginPath(); ctx.arc(4, -43, 3 + rnd() * 3, 0, 7); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1; return;
    }
    const pulse = 1 + Math.sin(gameTime * 6) * (pk.type === 'weapon' || pk.type === 'upgrade' ? 0.12 : 0.05);
    ctx.scale(pulse, pulse);
    if (pk.type === 'weapon' || pk.type === 'upgrade') { ctx.fillStyle = 'rgba(255,230,120,.45)'; ctx.beginPath(); ctx.arc(0, 0, 36 + Math.sin(gameTime * 8) * 4, 0, 7); ctx.fill(); }
    ctx.fillStyle = P.color; ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-23, -20, 46, 40, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `26px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(P.icon, 0, 2);
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawRagdoll(R) {
  const s = R.s, f = R.a.facing;
  ctx.lineCap = 'round';
  const ends = b => { const r = b.plugin.rag, c = Math.cos(b.angle), sn = Math.sin(b.angle), h = r.len / 2 - r.w / 2; return [{ x: b.position.x - c * h, y: b.position.y - sn * h }, { x: b.position.x + c * h, y: b.position.y + sn * h }]; };
  for (const b of R.bodies) { const r = b.plugin.rag; if (r.kind === 'limb' || r.kind === 'torso') { const [p, q] = ends(b); seg(p, q, r.w + 5 * s, OUT); } else if (r.kind === 'head') { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(b.position.x, b.position.y, r.r + 2.5 * s, 0, 7); ctx.fill(); } }
  for (const b of R.bodies) {
    const r = b.plugin.rag;
    if (r.kind === 'limb' || r.kind === 'torso') { const [p, q] = ends(b); seg(p, q, r.w, r.color); if (r.kind === 'torso' && R.plate) { ctx.strokeStyle = R.plate; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); } }
    else if (r.kind === 'bow') {
      ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle); ctx.strokeStyle = OUT; ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.moveTo(-2 * s, -32 * s); ctx.quadraticCurveTo(16 * s, 0, -2 * s, 32 * s); ctx.stroke();
      ctx.strokeStyle = colorOf(b.plugin.bow.color, gameTime); ctx.lineWidth = 5.5 * s; ctx.stroke(); ctx.restore();
    }
  }
  const head = R.bodies[1];
  ctx.save(); ctx.translate(head.position.x, head.position.y); ctx.rotate(head.angle);
  ctx.fillStyle = R.skin; ctx.beginPath(); ctx.arc(0, 0, 15 * s, 0, 7); ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.4 * s; const ex = f * 7 * s, ey = -2 * s, k = 3 * s;
  ctx.beginPath(); ctx.moveTo(ex - k, ey - k); ctx.lineTo(ex + k, ey + k); ctx.moveTo(ex + k, ey - k); ctx.lineTo(ex - k, ey + k); ctx.stroke();
  ctx.beginPath(); ctx.arc(f * 8 * s, 8 * s, 3 * s, Math.PI + 0.3, -0.3); ctx.stroke();
  if (R.hat) drawHat(R.hat, 0, 0, s, f, shade(colorOf(R.a.color, 0), -25));
  if (R.side === 'p') drawPlayerHelm(R.helmTier || 0, 0, 0, s, f);
  ctx.restore();
}
function arrowPos(a) {
  const st = a.stuck;
  if (!st) return { x: a.x, y: a.y, ang: Math.atan2(a.vy, a.vx) };
  if (st.kind === 'archer') return { x: st.archer.x + st.dx, y: st.archer.y + st.dy, ang: st.ang };
  const b = st.body, c = Math.cos(b.angle), s = Math.sin(b.angle);
  return { x: b.position.x + st.lx * c - st.ly * s, y: b.position.y + st.lx * s + st.ly * c, ang: st.la + b.angle };
}
const FX_TRAIL = { fire: ['#ff4d00', '#ffd23f'], ice: ['#bdf3ff', '#48cae4'], magic: RAINBOW, homing: RAINBOW, zap: ['#f9f871', '#fff'], bomb: ['#888', '#bbb'] };
function drawArrows() {
  for (const a of Game.arrows) {
    const p = arrowPos(a);
    if (!a.stuck && a.trail.length) { const cols = FX_TRAIL[a.fx] || ['#fff']; a.trail.forEach((t, i) => { ctx.globalAlpha = i / a.trail.length * 0.8; ctx.fillStyle = cols[(i + Math.floor(gameTime * 20)) % cols.length]; ctx.beginPath(); ctx.arc(t.x - Math.cos(p.ang) * 30, t.y - Math.sin(p.ang) * 30, 2 + i * 0.7, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1; }
    drawArrowShape(p.x, p.y, p.ang, a.len, a.color, a.fade !== undefined ? clamp(a.fade, 0, 1) : 1, !!a.stuck);
    if (a.fx === 'bomb' && !a.stuck) { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(p.x - Math.cos(p.ang) * 14, p.y - Math.sin(p.ang) * 14, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(p.x - Math.cos(p.ang) * 14, p.y - Math.sin(p.ang) * 14 - 8, 2.5 + rnd() * 2, 0, 7); ctx.fill(); }
  }
}
function drawHazard(L, bottom) {
  const T = L.theme, y0 = L.hazardY;
  const wave = (off, amp, col, alpha) => {
    ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-900, bottom);
    for (let x = -900; x <= L.W + 900; x += 30) ctx.lineTo(x, y0 + off + Math.sin(x * 0.012 + gameTime * 2 + off) * amp);
    ctx.lineTo(L.W + 900, bottom); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  };
  wave(-6, 7, T.hazard2, 0.7); wave(4, 6, T.hazard, 1); wave(26, 5, shade(T.hazard, -25), 0.6);
  if (T.name === 'Vulkan') for (let i = 0; i < 6; i++) { const x = (i * 397 + gameTime * 40) % (L.W + 200); ctx.fillStyle = '#ffd000'; ctx.beginPath(); ctx.arc(x, y0 + 16 + Math.sin(gameTime * 3 + i) * 5, 5, 0, 7); ctx.fill(); }
}
function drawAmbient() {
  for (const a of Game.ambient) {
    switch (a.type) {
      case 'snow': ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(a.x, a.y, a.s * 1.5, 0, 7); ctx.fill(); break;
      case 'petal': ctx.fillStyle = a.ph > 3 ? '#ffb3d9' : '#fff59d'; ctx.beginPath(); ctx.ellipse(a.x, a.y, a.s * 2.4, a.s * 1.3, a.t * 2, 0, 7); ctx.fill(); break;
      case 'ember': ctx.fillStyle = `rgba(255,${150 + (a.ph * 15 | 0)},0,.85)`; ctx.beginPath(); ctx.arc(a.x, a.y, a.s * 1.3, 0, 7); ctx.fill(); break;
      case 'bubble': ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(a.x, a.y, a.s * 3, 0, 7); ctx.stroke(); break;
      case 'dust': ctx.fillStyle = 'rgba(255,230,180,.6)'; ctx.fillRect(a.x, a.y, a.s * 2, a.s * 1.2); break;
      case 'firefly': ctx.fillStyle = `rgba(220,255,120,${0.4 + 0.6 * Math.abs(Math.sin(a.t * 3 + a.ph))})`; ctx.beginPath(); ctx.arc(a.x, a.y, a.s * 1.6, 0, 7); ctx.fill(); break;
      case 'sparkle': case 'star': { const al = Math.sin(a.t / a.life * Math.PI); ctx.globalAlpha = al; ctx.fillStyle = a.type === 'star' ? '#fff' : pick(['#fff', '#ffe066', '#ff99cc']); star4(a.x, a.y, a.s * 3, a.t); ctx.globalAlpha = 1; break; }
    }
  }
}
function star4(x, y, r, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.35 : r; const a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.restore(); }
function drawParticles() {
  for (const p of Game.parts) {
    const al = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = al;
    if (p.type === 'bolt') {
      ctx.strokeStyle = '#f9f871'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x1, p.y1);
      for (let i = 1; i < 8; i++) { const t = i / 8; ctx.lineTo(lerp(p.x1, p.x2, t) + (rnd() - 0.5) * 30, lerp(p.y1, p.y2, t) + (rnd() - 0.5) * 30); }
      ctx.lineTo(p.x2, p.y2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    } else if (p.type === 'ring') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 6 * al; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - al), 0, 7); ctx.stroke(); }
    else if (p.type === 'star') { ctx.fillStyle = p.color; star4(p.x, p.y, p.size * 1.4, p.rot); }
    else if (p.type === 'smoke') { ctx.globalAlpha = al * 0.5; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const t of Game.texts) {
    const k = t.t < 0.15 ? t.t / 0.15 * 1.2 : 1;
    ctx.globalAlpha = clamp((t.life - t.t) / 0.35, 0, 1);
    ctx.font = `${Math.round(t.size * k)}px ${FONT}`; ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.strokeText(t.txt, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
function bar(x, y, w, h, frac, col, txt) {
  ctx.fillStyle = 'rgba(20,20,40,.55)'; ctx.beginPath(); ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 6); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, Math.max(0, w * clamp(frac, 0, 1)), h, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 3, y + 2, Math.max(0, w * clamp(frac, 0, 1) - 6), h * 0.3);
  if (txt !== undefined) { ctx.font = `${Math.round(h * 0.9)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.strokeText(txt, x + w / 2, y + h / 2 + 1); ctx.fillText(txt, x + w / 2, y + h / 2 + 1); }
}
function drawTrajectory() {
  const p = Game.player; if (!Game.input || !p.alive || Game.state !== 'playing') return;
  const bow = curBow(), ps = playerStats(), L = Game.L;
  const v = bow.pow * (0.35 + 0.65 * Math.max(p.draw, 0.05));
  let x = p._pose.hand.x, y = p._pose.hand.y, vx = Math.cos(p.aim) * v, vy = Math.sin(p.aim) * v;
  const steps = Math.round(ps.aim / (1 / 60));
  for (let i = 0; i < steps; i++) {
    vx += L.wind / 60; vy += G / 60; x += vx / 60; y += vy / 60;
    if (i % 3 === 0) { const r = (6 - 3 * i / steps) / Math.max(view.sc, 0.45); ctx.globalAlpha = (1 - i / steps * 0.8) * (Game.reload > 0 ? 0.35 : 0.95); ctx.fillStyle = 'rgba(38,38,58,.35)'; ctx.beginPath(); ctx.arc(x, y + r * 0.25, r * 1.25, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
function drawWorldHud() {
  const p = Game.player, L = Game.L;
  if (p) {
    if (p.alive && Game.reload > 0 && Game.state === 'playing') { const f = 1 - Game.reload / playerStats().reload; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x, p.y - 150, 13, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke(); }
  }
  for (const e of Game.enemies) {
    if (!e.alive || e.boss || e.dropping) continue;
    const w = 64 * e.s; bar(e.x - w / 2, e.y - 150 * e.s, w, 9, e.hp / e.maxHp, e.hp / e.maxHp > 0.5 ? '#2ec27e' : e.hp / e.maxHp > 0.25 ? '#ffbe0b' : '#ef476f');
  }
  if (L.n === 1 && !save.tut && Game.state === 'playing' && p.alive) {
    const k = (gameTime % 1.6) / 1.6; const hx = p.x + 160 - k * 90, hy = p.y - 60 + k * 50;
    ctx.font = `44px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('👆', hx, hy);
    ctx.font = `26px ${FONT}`; ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.fillStyle = '#fff';
    const txt = 'Halten, nach hinten ziehen, loslassen!'; ctx.strokeText(txt, p.x + 150, p.y - 230); ctx.fillText(txt, p.x + 150, p.y - 230);
  }
}
function drawScreenHud() {
  const L = Game.L, W = view.w;
  if (Game.state === 'menu') return;
  // Leben & Ausdauer oben in der Mitte
  const p = Game.player;
  let y = 72;
  if (p) {
    const hud = $('hud'); let side = 0;
    if (!hud.classList.contains('hidden')) { const l = hud.firstElementChild.getBoundingClientRect(), r = hud.lastElementChild.getBoundingClientRect(); side = Math.max(l.right, W - r.left) + 12; }
    let bw = Math.min(360, W - side * 2), by = 10;
    if (bw < 170) { bw = Math.min(360, W - 24); by = 62; }
    const bx = W / 2 - bw / 2, hp = Math.ceil(Math.max(0, p.hp)), low = Game.sta < SHOT_COST;
    bar(bx, by, bw, 22, p.hp / p.maxHp, p.hp / p.maxHp < 0.3 && Math.floor(gameTime * 4) % 2 ? '#ff8fa3' : '#ef476f', `❤ ${hp} / ${p.maxHp}`);
    bar(bx, by + 30, bw, 16, Game.sta / Game.staMax, low ? (Math.floor(gameTime * 6) % 2 ? '#6c7a96' : '#9aa5c7') : '#4d8dff', `⚡ ${Math.floor(Game.sta)} / ${Game.staMax}`);
    y = by + 30 + 16 + 26;
  }
  if (L.wind) {
    const txt = `Wind ${Math.abs(L.wind)}`; ctx.font = `18px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(20,20,50,.45)'; ctx.beginPath(); ctx.roundRect(W / 2 - 80, y - 16, 160, 32, 16); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, W / 2 - 18, y + 1);
    const dir = Math.sign(L.wind), len = 10 + Math.abs(L.wind) / 150 * 26, ax = W / 2 + 42;
    ctx.strokeStyle = '#9ef0ff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax - dir * len / 2, y); ctx.lineTo(ax + dir * len / 2, y); ctx.lineTo(ax + dir * len / 2 - dir * 7, y - 6); ctx.moveTo(ax + dir * len / 2, y); ctx.lineTo(ax + dir * len / 2 - dir * 7, y + 6); ctx.stroke();
    y += 40;
  }
  const b = Game.bossRef;
  if (b && b.alive && !b.dropping) {
    const w = Math.min(520, W * 0.6); ctx.font = `20px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeStyle = OUT;
    ctx.strokeText('👑 ' + b.name, W / 2, y); ctx.fillText('👑 ' + b.name, W / 2, y);
    bar(W / 2 - w / 2, y + 14, w, 18, b.hp / b.maxHp, '#ef476f', `${Math.ceil(b.hp)} / ${b.maxHp}`);
  }
  if (Game.banner) {
    const bn = Game.banner, t = bn.t, a = t < 0.3 ? t / 0.3 : t > bn.dur - 0.4 ? (bn.dur - t) / 0.4 : 1;
    const sc = t < 0.3 ? 0.6 + 0.4 * (t / 0.3) + Math.sin(t / 0.3 * Math.PI) * 0.15 : 1;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(W / 2, view.h * 0.38); ctx.scale(sc, sc);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const big = Math.min(72, W * 0.1);
    ctx.font = `${big}px ${FONT}`; ctx.lineWidth = 10; ctx.strokeStyle = OUT; ctx.strokeText(bn.title, 0, 0);
    const g = ctx.createLinearGradient(0, -big / 2, 0, big / 2); g.addColorStop(0, '#fff176'); g.addColorStop(1, '#ff9f1c'); ctx.fillStyle = g; ctx.fillText(bn.title, 0, 0);
    ctx.font = `${Math.round(big * 0.38)}px ${FONT}`; ctx.lineWidth = 6; ctx.strokeText(bn.sub, 0, big * 0.75); ctx.fillStyle = '#fff'; ctx.fillText(bn.sub, 0, big * 0.75);
    ctx.restore();
  }
  if (Game.input) {
    const i = Game.input; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(i.sx, i.sy); ctx.lineTo(i.cx, i.cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(i.sx, i.sy, 16, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(i.cx, i.cy, 10, 0, 7); ctx.fill();
  }
  for (const c of Game.confetti) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.scale(1, Math.abs(Math.cos(c.t * 6 + c.ph)) * 0.8 + 0.2); ctx.fillStyle = c.color; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore(); }
}
function render() {
  const L = Game.L; if (!L) return;
  const d = view.dpr;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  const T = L.theme;
  const g = ctx.createLinearGradient(0, 0, 0, view.h); g.addColorStop(0, T.sky[0]); g.addColorStop(1, T.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
  const sh = Game.shake, shx = (rnd() - 0.5) * sh, shy = (rnd() - 0.5) * sh;
  ctx.setTransform(d * view.sc, 0, 0, d * view.sc, d * (view.ox + shx), d * (view.oy + shy));
  const bottom = (view.h - view.oy) / view.sc + 60;
  drawBackground(L, bottom);
  drawAmbient();
  for (const p of Game.platforms) drawPlatform(p, T, L);
  for (const c of Game.crates) drawBodyThing(c);
  for (const b of Game.packs) drawBodyThing(b);
  for (const R of Game.ragdolls) drawRagdoll(R);
  for (const e of Game.enemies) if (e.alive) drawArcher(e);
  if (Game.player && Game.player.alive) drawArcher(Game.player);
  drawArrows();
  drawHazard(L, bottom);
  drawTrajectory();
  drawParticles();
  drawWorldHud();
  ctx.setTransform(d, 0, 0, d, 0, 0);
  drawScreenHud();
}

// ---------------------------------------------------------------- Eingabe
canvas.addEventListener('pointerdown', e => {
  Sfx.init();
  if (Game.state !== 'playing') return;
  const p = Game.player; if (!p || !p.alive) return;
  e.preventDefault();
  Game.input = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY };
  p.draw = 0;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) { }
});
canvas.addEventListener('pointermove', e => {
  const i = Game.input; if (!i || i.id !== e.pointerId) return;
  i.cx = e.clientX; i.cy = e.clientY;
  const dx = i.sx - i.cx, dy = i.sy - i.cy;
  if (Math.hypot(dx, dy) > 12) Game.player.aim = clamp(Math.atan2(dy, dx), -1.48, 1.3);
});
function release(e) {
  const i = Game.input; if (!i || (e && i.id !== e.pointerId)) return;
  Game.input = null;
  const p = Game.player;
  if (Game.state !== 'playing' || !p.alive) { p.draw = 0; return; }
  if (p.draw < 0.12) { p.draw = 0; return; }
  if (Game.sta < SHOT_COST) { addText(p.x, p.y - 170, 'Keine Ausdauer! ⚡', '#6fb1ff', 24); p.draw = 0; return; }
  playerShoot();
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') { e.preventDefault(); Sfx.init(); playerJump(); }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (Game.state === 'playing') UI.pause(); else if (Game.state === 'paused') UI.resume(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && Game.state === 'playing') UI.pause(); });

// ---------------------------------------------------------------- Oberfläche
const $ = id => document.getElementById(id);
const UI = {
  cur: 'scrMenu', prev: null, world: 0, shopTab: 'bows',
  show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const el = id && $(id);
    if (el) { el.classList.remove('hidden'); el.scrollTop = 0; }
    this.cur = id;
    this.hud(!id && Game.state !== 'menu');
  },
  hud(on) { const h = $('hud'); if (h) h.classList.toggle('hidden', !on); },
  updateHud() {
    document.querySelectorAll('.coinVal').forEach(el => el.textContent = fmt(save.coins));
    const L = Game.L; if (!L) return;
    $('hudLevel').textContent = `Level ${L.n}`;
    $('hudWave').textContent = `Welle ${Math.max(1, Game.waveIdx + 1)}/${L.waves.length}`;
    const sb = $('btnSound'); if (sb) sb.textContent = save.sound ? '🔊' : '🔇';
  },
  nextLevel() { for (let n = 1; n <= MAX_LEVEL; n++) if (!save.stars[n]) return n; return MAX_LEVEL; },
  menu() {
    const n = this.nextLevel();
    startLevel(Math.max(1, n), true);
    $('btnContinue').innerHTML = `▶ ${n === 1 && !save.stars[1] ? 'Spielen' : 'Weiter'} <small>Level ${n}</small>`;
    const total = Object.values(save.stars).reduce((a, b) => a + b, 0);
    $('menuStars').textContent = `⭐ ${total} / ${MAX_LEVEL * 3}`;
    this.updateHud(); this.show('scrMenu');
  },
  play(n) { Sfx.init(); Sfx.click(); if (matchMedia('(pointer: coarse)').matches) enterFullscreen(); this.show(null); startLevel(n); },
  unlocked(n) { return n === 1 || !!save.stars[n - 1]; },
  levels(world) {
    Sfx.click();
    if (world === undefined) world = Math.floor((this.nextLevel() - 1) / LEVELS_PER_WORLD);
    this.world = world;
    const tabs = $('worldTabs'); tabs.innerHTML = '';
    THEMES.forEach((t, i) => {
      const first = i * LEVELS_PER_WORLD + 1, open = this.unlocked(first);
      const b = document.createElement('button'); b.className = 'wtab' + (i === world ? ' on' : '') + (open ? '' : ' locked');
      b.style.setProperty('--c1', t.sky[0]); b.style.setProperty('--c2', t.near);
      let st = 0; for (let n = first; n < first + LEVELS_PER_WORLD; n++) st += save.stars[n] || 0;
      b.innerHTML = `<span class="we">${open ? t.emoji : '🔒'}</span><span class="wn">${i + 1}. ${t.name}</span><span class="ws">⭐ ${st}/${LEVELS_PER_WORLD * 3}</span>`;
      b.onclick = () => { if (open) this.levels(i); else { Sfx.hurt(); b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); } };
      tabs.appendChild(b);
    });
    const grid = $('levelGrid'); grid.innerHTML = '';
    grid.style.setProperty('--wc', THEMES[world].near); grid.style.setProperty('--wc2', THEMES[world].sky[0]);
    for (let k = 1; k <= LEVELS_PER_WORLD; k++) {
      const n = world * LEVELS_PER_WORLD + k, st = save.stars[n] || 0, open = this.unlocked(n);
      const b = document.createElement('button');
      const boss = k % 10 === 0;
      b.className = 'lvl' + (open ? '' : ' locked') + (boss ? ' boss' : '') + (k === 30 ? ' endboss' : '') + (open && !st ? ' fresh' : '');
      b.innerHTML = open ? `${boss ? `<span class="bi">${k === 30 ? '👑' : '💀'}</span>` : ''}<span class="ln">${n}</span><span class="st">${'★'.repeat(st)}<i>${'★'.repeat(3 - st)}</i></span>` : `<span class="ln">🔒</span><span class="st small">${n}</span>`;
      if (open) b.onclick = () => this.play(n);
      grid.appendChild(b);
    }
    $('worldInfo').textContent = `${THEMES[world].emoji} ${THEMES[world].name} – Boss: ${BOSSES[world].name}`;
    this.show('scrLevels');
  },
  openShop(from) { Sfx.click(); this.prev = from || this.cur; this.shop(this.shopTab); },
  closeShop() { Sfx.click(); const p = this.prev; if (p === 'scrLevels') this.levels(this.world); else if (p === 'scrWin' || p === 'scrLose') { this.show(p); } else this.menu(); },
  shop(tab) {
    this.shopTab = tab;
    document.querySelectorAll('.stab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const list = $('shopList'); list.innerHTML = '';
    const card = (html, btn, cls = '') => { const d = document.createElement('div'); d.className = 'card ' + cls; d.innerHTML = html; d.appendChild(btn); list.appendChild(d); };
    const mkBtn = (label, enabled, fn, cls = '') => { const b = document.createElement('button'); b.className = 'buy ' + cls; b.innerHTML = label; b.disabled = !enabled; b.onclick = fn; return b; };
    const bowSvg = c => { const grad = c === 'rainbow'; return `<svg viewBox="0 0 60 60" class="ico">${grad ? '<defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">' + RAINBOW.map((r, i) => `<stop offset="${i / 5}" stop-color="${r}"/>`).join('') + '</linearGradient></defs>' : ''}<path d="M20 6 Q52 30 20 54" fill="none" stroke="#26263a" stroke-width="9" stroke-linecap="round"/><path d="M20 6 Q52 30 20 54" fill="none" stroke="${grad ? 'url(#rg)' : c}" stroke-width="5" stroke-linecap="round"/><line x1="20" y1="6" x2="20" y2="54" stroke="#fff" stroke-width="1.5"/><line x1="8" y1="30" x2="54" y2="30" stroke="#5b3a1e" stroke-width="3"/><path d="M54 30 L46 25 L46 35Z" fill="#dfe6ee" stroke="#26263a"/></svg>`; };
    if (tab === 'bows') BOWS.forEach(b => {
      const own = save.bows.includes(b.id), eq = save.bow === b.id;
      const html = `${bowSvg(b.color)}<div class="ci"><b>${b.name}</b><p>${b.desc}</p><div class="stats"><span>🗡️ ${b.dmg}</span><span>🚀 ${b.pow}</span><span>💪 ${Math.round(b.draw * 100)}%</span>${b.multi ? `<span>🏹×${b.multi}</span>` : ''}</div></div>`;
      const btn = eq ? mkBtn('✓ Ausgerüstet', false, null, 'eq') : own ? mkBtn('Ausrüsten', true, () => { save.bow = b.id; persist(); Sfx.click(); this.shop(tab); }) :
        mkBtn(`🪙 ${fmt(b.cost)}`, save.coins >= b.cost, () => { if (save.coins < b.cost) return; save.coins -= b.cost; save.bows.push(b.id); save.bow = b.id; persist(); Sfx.buy(); this.updateHud(); this.shop(tab); });
      card(html, btn, eq ? 'sel' : '');
    });
    const gear = (arr, key, keys, label) => arr.forEach((g, i) => {
      const own = save[keys].includes(i), eq = save[key] === i;
      const html = `<div class="ico sw" style="background:${g.color || '#ddd'}">${key === 'armor' ? '🛡️' : '⛑️'}</div><div class="ci"><b>${g.name}</b><p>${label(g)}</p></div>`;
      const btn = eq ? mkBtn('✓ Ausgerüstet', false, null, 'eq') : own ? mkBtn('Ausrüsten', true, () => { save[key] = i; persist(); Sfx.click(); this.shop(tab); }) :
        mkBtn(`🪙 ${fmt(g.cost)}`, save.coins >= g.cost, () => { if (save.coins < g.cost) return; save.coins -= g.cost; save[keys].push(i); save[key] = i; persist(); Sfx.buy(); this.updateHud(); this.shop(tab); });
      card(html, btn, eq ? 'sel' : '');
    });
    if (tab === 'armor') gear(ARMORS, 'armor', 'armors', g => g.red ? `−${Math.round(g.red * 100)}% Schaden am Körper` : 'Kein Schutz');
    if (tab === 'helms') gear(HELMS, 'helm', 'helms', g => g.red ? `−${Math.round(g.red * 100)}% Schaden am Kopf` : 'Kein Schutz');
    if (tab === 'train') UPGRADES.forEach(u => {
      const l = save.up[u.id], max = l >= u.max, cost = upCost(u, l);
      const html = `<div class="ico sw">${u.icon}</div><div class="ci"><b>${u.name} <small>Stufe ${l}/${u.max}</small></b><p>${u.desc(l)}${max ? '' : ` → <em>${u.desc(l + 1)}</em>`}</p><div class="lvbar"><i style="width:${l / u.max * 100}%"></i></div></div>`;
      const btn = max ? mkBtn('MAX', false, null, 'eq') : mkBtn(`🪙 ${fmt(cost)}`, save.coins >= cost, () => { if (save.coins < cost) return; save.coins -= cost; save.up[u.id]++; persist(); Sfx.buy(); this.updateHud(); this.shop(tab); });
      card(html, btn);
    });
    this.updateHud(); this.show('scrShop');
  },
  showWin() {
    const r = Game.result, L = Game.L;
    $('winTitle').textContent = L.bigBoss ? 'ENDBOSS BESIEGT!' : L.boss ? 'BOSS BESIEGT!' : 'SIEG!';
    const st = $('winStars'); st.innerHTML = '';
    for (let i = 0; i < 3; i++) { const s = document.createElement('span'); s.textContent = '★'; s.className = i < r.stars ? 'on' : ''; s.style.animationDelay = (0.25 + i * 0.25) + 's'; st.appendChild(s); if (i < r.stars) setTimeout(() => Sfx.tone(660 + i * 220, 0.2, 'square', 0.08), 250 + i * 250); }
    $('winStats').innerHTML = `<div><span>🪙 Beute</span><b>+${fmt(Game.earned)}</b></div><div><span>❤️ Leben übrig</span><b>${r.hp}%</b></div><div><span>🎯 Trefferquote</span><b>${r.acc}%</b></div>`;
    $('btnNext').style.display = L.n < MAX_LEVEL ? '' : 'none';
    if (L.n === MAX_LEVEL) $('winTitle').textContent = 'DU HAST ALLES GESCHAFFT! 🏆';
    this.updateHud(); this.show('scrWin');
  },
  showLose() {
    const tips = ['Tipp: Kauf im Shop bessere Rüstung und einen Helm!', 'Tipp: Kopftreffer machen doppelten Schaden.', 'Tipp: Triff die Fallschirm-Pakete – sie heilen dich!', 'Tipp: Schieß Bomben ab, bevor sie bei dir landen!', 'Tipp: Achte auf den Wind oben in der Mitte!', 'Tipp: Trainiere „Leben“ und „Nachladen“ im Shop.', 'Tipp: Ziehe länger – volle Spannung = mehr Schaden.'];
    $('loseTip').textContent = pick(tips);
    $('loseStats').innerHTML = Game.earned ? `Du behältst <b>🪙 ${fmt(Game.earned)}</b> Münzen.` : '';
    this.updateHud(); this.show('scrLose');
  },
  pause() { if (Game.state !== 'playing') return; Game.state = 'paused'; Game.input = null; if (Game.player) Game.player.draw = 0; this.show('scrPause'); },
  resume() { if (Game.state !== 'paused') return; Game.state = 'playing'; this.show(null); Sfx.click(); },
};

// ---------------------------------------------------------------- Vollbild
function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
function fsSupported() { const d = document.documentElement; return !!(d.requestFullscreen || d.webkitRequestFullscreen); }
function enterFullscreen() {
  if (!fsSupported() || fsEl()) return;
  const d = document.documentElement;
  try { const r = (d.requestFullscreen || d.webkitRequestFullscreen).call(d); if (r && r.catch) r.catch(() => { }); } catch (e) { }
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); } catch (e) { }
}
function exitFullscreen() {
  try { const f = document.exitFullscreen || document.webkitExitFullscreen; if (f) { const r = f.call(document); if (r && r.catch) r.catch(() => { }); } } catch (e) { }
}
function toggleFullscreen() { if (fsEl()) exitFullscreen(); else enterFullscreen(); }
function updateFsButtons() {
  const on = !!fsEl();
  ['btnFull', 'btnMenuFull'].forEach(id => {
    const b = $(id); if (!b) return;
    if (!fsSupported()) { b.style.display = 'none'; return; }
    b.textContent = id === 'btnMenuFull' ? (on ? '⛶ Vollbild aus' : '⛶ Vollbild') : (on ? '🗗' : '⛶');
  });
}
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => { updateFsButtons(); setTimeout(resize, 60); setTimeout(resize, 400); }));

function bindUI() {
  const on = (id, fn) => { const el = $(id); if (!el) return; el.addEventListener('click', e => { Sfx.init(); e.currentTarget.blur(); fn(e); }); };
  on('btnContinue', () => UI.play(UI.nextLevel()));
  on('btnLevels', () => UI.levels());
  on('btnShop', () => UI.openShop('scrMenu'));
  on('btnLevelsBack', () => { Sfx.click(); UI.menu(); });
  on('btnShopBack', () => UI.closeShop());
  document.querySelectorAll('.stab').forEach(b => b.addEventListener('click', () => { Sfx.click(); UI.shop(b.dataset.tab); }));
  on('btnNext', () => UI.play(Game.L.n + 1));
  on('btnWinRetry', () => UI.play(Game.L.n));
  on('btnWinShop', () => UI.openShop('scrWin'));
  on('btnWinLevels', () => UI.levels(Game.L.wi));
  on('btnRetry', () => UI.play(Game.L.n));
  on('btnLoseMenu', () => { persist(); UI.menu(); });
  on('btnPause', () => UI.pause());
  on('btnResume', () => UI.resume());
  on('btnRestart', () => UI.play(Game.L.n));
  on('btnQuit', () => { persist(); UI.menu(); });
  on('btnSound', () => { save.sound = !save.sound; Sfx.on = save.sound; persist(); UI.updateHud(); });
  const soundLabel = () => { const b = $('btnMenuSound'); if (b) b.textContent = save.sound ? '🔊 Ton an' : '🔇 Ton aus'; };
  on('btnMenuSound', () => { save.sound = !save.sound; Sfx.on = save.sound; persist(); soundLabel(); });
  soundLabel();
  on('btnFull', () => toggleFullscreen());
  on('btnMenuFull', () => toggleFullscreen());
  updateFsButtons();
}

// ---------------------------------------------------------------- Hauptschleife
let lastT = performance.now(), accT = 0;
function frame(now) {
  let d = (now - lastT) / 1000; lastT = now; if (d > 0.1) d = 0.1;
  accT += d; let steps = 0;
  while (accT >= DT && steps < 4) { update(DT); accT -= DT; steps++; }
  if (steps === 4) accT = 0;
  render();
  requestAnimationFrame(frame);
}
bindUI();
resize();
UI.menu();
requestAnimationFrame(frame);
