/* MAX GAMES — AudioManager: Web Audio API synthesised sound effects, crowd and chiptune music. */
'use strict';
MG.Audio = (() => {
  let ctx = null, master = null, sfxGain = null, musGain = null, noiseBuf = null, timer = 0, track = null, nextT = 0, step = 0, curName = '';
  const S = () => MG.Storage.data.settings;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = .9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp); comp.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.connect(master); musGain = ctx.createGain(); musGain.connect(master); musGain.gain.value = .38;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const ok = () => ctx && S().sfx;
  function env(g, t, a, d, v) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, v), t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
  function osc(type, f, t, d, v, f2, dest) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d); env(g, t, .004, d, v); o.connect(g); g.connect(dest || sfxGain); o.start(t); o.stop(t + d + .05); }
  function noise(t, d, v, type, f, f2, dest) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d); const g = ctx.createGain(); env(g, t, .004, d, v); s.connect(fl); fl.connect(g); g.connect(dest || sfxGain); s.start(t, Math.random()); s.stop(t + d + .05); }
  const sfx = {
    pistol() { if (!ok()) return; const t = ctx.currentTime; noise(t, .16, .9, 'bandpass', 1800, 400); noise(t, .35, .35, 'lowpass', 900, 120); osc('sine', 140, t, .2, .6, 40); },
    step(side) { if (!ok()) return; const t = ctx.currentTime; noise(t, .04, .16, 'highpass', side ? 2400 : 1800); osc('sine', side ? 95 : 80, t, .05, .1, 55); },
    blip(f = 660) { if (!ok()) return; osc('square', f, ctx.currentTime, .06, .12); },
    select() { if (!ok()) return; const t = ctx.currentTime; osc('square', 880, t, .05, .1); osc('square', 1320, t + .05, .07, .09); },
    move() { if (!ok()) return; osc('square', 520, ctx.currentTime, .04, .07); },
    back() { if (!ok()) return; osc('square', 330, ctx.currentTime, .08, .1, 220); },
    count(go) { if (!ok()) return; osc('square', go ? 1046 : 523, ctx.currentTime, go ? .3 : .12, .15); },
    error() { if (!ok()) return; const t = ctx.currentTime; osc('sawtooth', 150, t, .22, .2, 90); osc('square', 110, t + .05, .2, .1, 70); },
    jump() { if (!ok()) return; const t = ctx.currentTime; osc('triangle', 260, t, .16, .22, 640); noise(t, .08, .1, 'highpass', 1800); },
    land() { if (!ok()) return; const t = ctx.currentTime; noise(t, .22, .5, 'lowpass', 900, 200); osc('sine', 110, t, .15, .35, 50); },
    sand() { if (!ok()) return; const t = ctx.currentTime; noise(t, .4, .45, 'lowpass', 1400, 250); osc('sine', 80, t, .2, .35, 40); },
    hit() { if (!ok()) return; const t = ctx.currentTime; noise(t, .2, .55, 'bandpass', 700, 200); osc('square', 180, t, .15, .2, 70); },
    foul() { if (!ok()) return; const t = ctx.currentTime; osc('square', 220, t, .18, .18); osc('square', 175, t + .2, .3, .18); },
    whistle() { if (!ok()) return; const t = ctx.currentTime; osc('sine', 2100, t, .25, .12, 2300); osc('sine', 2300, t + .26, .3, .12, 2000); },
    cheer(dur = 1.6, vol = .5) {
      if (!ok()) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.setValueAtTime(700, t); fl.frequency.linearRampToValueAtTime(1300, t + dur * .4); fl.Q.value = .5;
      const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol * .5, t + .25); g.gain.setValueAtTime(vol * .5, t + dur * .6); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(fl); fl.connect(g); g.connect(sfxGain); s.start(t, Math.random()); s.stop(t + dur + .1);
      for (let i = 0; i < dur * 9; i++) noise(t + Math.random() * dur * .9, .05, vol * .25, 'highpass', 2500);
    },
    gasp() { if (!ok()) return; noise(ctx.currentTime, .5, .3, 'bandpass', 1000, 500); },
    fanfare() { if (!ok()) return; const t = ctx.currentTime, n = [60, 64, 67, 72, 67, 72, 76, 79]; n.forEach((m, i) => { const f = 440 * Math.pow(2, (m - 69) / 12); osc('square', f, t + i * .12, i === 7 ? .8 : .14, .12); osc('square', f * 1.005, t + i * .12, i === 7 ? .8 : .14, .06); osc('triangle', f / 2, t + i * .12, i === 7 ? .8 : .14, .14); }); },
    medal() { if (!ok()) return; const t = ctx.currentTime; [76, 79, 84].forEach((m, i) => osc('square', 440 * Math.pow(2, (m - 69) / 12), t + i * .09, .25, .12)); },
    wave() { if (!ok()) return; const t = ctx.currentTime; for (let i = 0; i < 7; i++) noise(t + i * .32, .5, .16 + i * .02, 'bandpass', 600 + i * 160, 900 + i * 160); },
    record() { if (!ok()) return; const t = ctx.currentTime; [72, 76, 79, 84, 88].forEach((m, i) => osc('square', 440 * Math.pow(2, (m - 69) / 12), t + i * .07, .2, .1)); },
  };
  /* ---------- generative music: chords, bass, arpeggio, lead, pad and drums from a seeded composer ---------- */
  const Q = { M: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11] };
  const PENT = [0, 2, 4, 7, 9];
  const RH = [[0, 3, 6, 8, 10, 12, 14], [0, 2, 4, 8, 11, 14], [0, 4, 6, 8, 12, 14], [0, 3, 8, 10, 12, 15], [2, 4, 8, 10, 14], [0, 6, 8, 12, 14]];
  const BASSP = { drive: [1, 0, 0, 1, 0, 0, 3, 0, 1, 0, 0, 1, 0, 2, 0, 3], funk: [1, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 3, 0, 0, 2, 0], sway: [1, 0, 0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 3, 0, 2, 0], pomp: [1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0] };
  const DEFS = {
    title:    { bpm: 126, key: 60, bars: 16, seed: 11, prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']], bass: 'drive', drums: 'drive', lead: 'square', leadV: .15, arp: .07, pad: .05 },
    menu:     { bpm: 98, key: 65, bars: 16, seed: 29, swing: .2, prog: [[2, 'm7'], [7, '7'], [0, 'M7'], [9, 'm7']], bass: 'funk', drums: 'chill', lead: 'triangle', leadV: .2, arp: .05, pad: .06 },
    victory:  { bpm: 136, key: 62, bars: 8, seed: 5, prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']], bass: 'drive', drums: 'drive', lead: 'square', leadV: .15, arp: .08, pad: .05 },
    ceremony: { bpm: 90, key: 58, bars: 8, seed: 41, prog: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']], bass: 'pomp', drums: 'march', lead: 'sawtooth', leadV: .09, arp: 0, pad: .1 },
  };
  const rng = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  const N = m => 440 * Math.pow(2, (m - 69) / 12);
  function compose(d) {
    const R = rng(d.seed), len = d.bars * 16, T = { d, len, lead: new Array(len).fill(null), bass: new Array(len).fill(0), chord: [], spb: 60 / d.bpm / 4 };
    for (let b = 0; b < d.bars; b++) { const [off, q] = d.prog[b % d.prog.length]; T.chord.push({ root: d.key + off, iv: Q[q] }); }
    const motif = () => { const rh = RH[Math.floor(R() * RH.length)], mv = []; let idx = 5 + Math.floor(R() * 4); for (const st of rh) { idx += Math.floor(R() * 5) - 2; idx = MG.clamp(idx, 3, 11); mv.push({ st, idx, len: 2 + Math.floor(R() * 3) }); } return mv; };
    const A = [motif(), motif()], B = [motif(), motif()];
    for (let b = 0; b < d.bars; b++) {
      const ch = T.chord[b], phrase = (b >> 2) & 1 ? B : A, m = phrase[b & 1], rest = (b & 3) === 3 && R() < .4;
      if (!rest) for (const n of m) {
        let idx = n.idx + ((b & 3) >= 2 && R() < .35 ? (R() < .5 ? 1 : -1) : 0), midi = d.key + 12 + PENT[((idx % 5) + 5) % 5] + 12 * Math.floor(idx / 5);
        if (n.st % 4 === 0) { let best = midi, bd = 99; for (const iv of ch.iv) for (let o = -24; o <= 24; o += 12) { const c = ch.root + iv + o + 12; const dd = Math.abs(c - midi); if (dd < bd) { bd = dd; best = c; } } midi = best; }
        T.lead[b * 16 + n.st] = { m: midi, len: n.len };
      }
      const bp = BASSP[d.bass]; for (let i = 0; i < 16; i++) if (bp[i]) T.bass[b * 16 + i] = ch.root - 24 + (bp[i] === 2 ? 7 : bp[i] === 3 ? 12 : 0);
    }
    return T;
  }
  const SONGS = {};
  function drums(T, i, t, g) {
    const k = i & 15, d = T.d.drums, v = T.d.drums === 'chill' ? .8 : 1;
    const kick = () => osc('sine', 150, t, .16, .55 * v, 42, g), snare = () => { noise(t, .13, .3 * v, 'bandpass', 1900, 0, g); osc('triangle', 190, t, .07, .12, 120, g); }, hat = a => noise(t, .03, a, 'highpass', 7500, 0, g);
    if (d === 'drive') { if (k % 4 === 0) kick(); if (k === 4 || k === 12) snare(); if (k % 2 === 0) hat(k % 4 === 2 ? .09 : .045); if (k === 14) noise(t, .12, .06, 'highpass', 6500, 0, g); }
    else if (d === 'chill') { if (k === 0 || k === 7 || k === 10) kick(); if (k === 4 || k === 12) snare(); if (k % 2 === 0) hat(.04); else if (k % 4 === 3) hat(.02); }
    else { if (k === 0 || k === 8) kick(); if (k === 4 || k === 12) { noise(t, .1, .22, 'bandpass', 2400, 0, g); } if (k % 4 === 2) hat(.03); }
  }
  let echo = null;
  function tick() {
    if (!ctx || !track) return; const T = track, spb = T.spb, d = T.d;
    if (!echo) { echo = ctx.createDelay(1); echo.delayTime.value = spb * 3; const fb = ctx.createGain(), flt = ctx.createBiquadFilter(); fb.gain.value = .32; flt.type = 'lowpass'; flt.frequency.value = 2600; echo.connect(flt); flt.connect(fb); fb.connect(echo); flt.connect(musGain); }
    while (nextT < ctx.currentTime + .16) {
      const i = step % T.len, bar = i >> 4, k = i & 15, t = nextT + (k & 1 ? (d.swing || 0) * spb : 0), ch = T.chord[bar];
      drums(T, i, t, musGain);
      const b = T.bass[i]; if (b) { osc('triangle', N(b), t, spb * 2.4, .34, 0, musGain); osc('sine', N(b), t, spb * 2.4, .18, 0, musGain); }
      const l = T.lead[i]; if (l) { const f = N(l.m), dur = spb * l.len * .95; for (const dt of [-1.006, 1.006]) { const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter(); o.type = d.lead; o.frequency.value = f * dt; fl.type = 'lowpass'; fl.frequency.value = 3200; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(d.leadV / 2, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .08); o.connect(fl); fl.connect(g); g.connect(musGain); g.connect(echo); o.start(t); o.stop(t + dur + .12); } }
      if (d.arp && k % 2 === 0) { const iv = ch.iv, m = ch.root + 12 + iv[(k >> 1) % iv.length] + ((k >> 1) % 7 > 3 ? 12 : 0); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = N(m); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(d.arp, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + spb * 1.7); o.connect(g); g.connect(musGain); g.connect(echo); o.start(t); o.stop(t + spb * 2); }
      if (d.pad && k === 0) for (const iv of ch.iv) for (const dt of [-1.004, 1.004]) { const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = N(ch.root + iv) * dt; fl.type = 'lowpass'; fl.frequency.value = 900; const dur = spb * 16; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(d.pad / 3, t + dur * .25); g.gain.linearRampToValueAtTime(.0001, t + dur); o.connect(fl); fl.connect(g); g.connect(musGain); o.start(t); o.stop(t + dur + .05); }
      nextT += spb; step++;
    }
  }
  function music(name) {
    if (!ctx) return; if (!S().music) { stopMusic(); curName = name; return; }
    if (curName === name && timer) return; stopMusic(); curName = name; if (!DEFS[name]) return;
    track = SONGS[name] || (SONGS[name] = compose(DEFS[name])); step = 0; nextT = ctx.currentTime + .08; echo = null; timer = setInterval(tick, 30);
  }
  function stopMusic() { clearInterval(timer); timer = 0; }
  function refresh() { if (!S().music) stopMusic(); else if (curName && !timer && ctx) { const n = curName; curName = ''; music(n); } }
  return { init, sfx, music, stopMusic, refresh, get ctx() { return ctx; } };
})();
