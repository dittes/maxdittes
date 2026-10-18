/* MAX GAMES — InputManager: keyboard, canvas pointers (multi-touch) and toolbar buttons unified into actions.
   Key-repeat is ignored so that holding a key never counts as repeated presses. */
'use strict';
MG.Input = (() => {
  const handlers = []; const held = {}; let canvas = null;
  const KEYS = {
    ArrowLeft: ['left'], a: ['left'], A: ['left'], z: ['left'], ArrowRight: ['right'], d: ['right'], D: ['right'], x: ['right'], '.': ['right'],
    ArrowUp: ['up'], w: ['up'], W: ['up'], ArrowDown: ['down'], s: ['down'], S: ['down'],
    ' ': ['jump', 'ok'], Enter: ['ok', 'jump'], Escape: ['back'], Backspace: ['back'], p: ['pause'], P: ['pause'],
  };
  function emit(ev) { ev.t = performance.now() / 1000; for (const h of handlers.slice()) { if (h(ev) === true) break; } }
  function press(act, src) { if (held[act]) return; held[act] = true; emit({ type: 'down', act, src }); }
  function release(act, src) { if (!held[act]) return; held[act] = false; emit({ type: 'up', act, src }); }
  function pointer(e, type) {
    if (!canvas) return; const r = canvas.getBoundingClientRect(), V = MG.view;
    emit({ type, act: 'pointer', x: (e.clientX - r.left) / r.width * V.W, y: (e.clientY - r.top) / r.height * V.H, id: e.pointerId, src: 'pointer' + e.pointerId });
  }
  function init(cv) {
    canvas = cv;
    addEventListener('keydown', e => { const acts = KEYS[e.key]; if (!acts) return; e.preventDefault(); if (e.repeat) return; for (const a of acts) press(a, 'key' + e.key); });
    addEventListener('keyup', e => { const acts = KEYS[e.key]; if (!acts) return; e.preventDefault(); for (const a of acts) release(a, 'key' + e.key); });
    addEventListener('blur', () => { for (const a in held) if (held[a]) release(a); });
    cv.addEventListener('pointerdown', e => { e.preventDefault(); MG.Audio.init(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} pointer(e, 'pdown'); });
    cv.addEventListener('pointermove', e => pointer(e, 'pmove'));
    cv.addEventListener('pointerup', e => pointer(e, 'pup'));
    cv.addEventListener('pointercancel', e => pointer(e, 'pup'));
    cv.addEventListener('contextmenu', e => e.preventDefault());
    // toolbar buttons (pause / back)
    document.querySelectorAll('[data-act]').forEach(btn => {
      const act = btn.dataset.act;
      btn.addEventListener('pointerdown', e => { e.preventDefault(); MG.Audio.init(); press(act, 'tb' + act); });
      const up = () => release(act, 'tb' + act); btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up); btn.addEventListener('pointerleave', up);
    });
  }
  function on(h) { handlers.push(h); return () => { const i = handlers.indexOf(h); if (i >= 0) handlers.splice(i, 1); }; }
  return { init, on, held, press, release };
})();
