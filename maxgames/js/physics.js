/* MAX GAMES — PhysicsEngine: sprint model driven by alternating key presses, plus jump / projectile helpers.
   All maths runs on elapsed simulation time (seconds), never on frame counts. */
'use strict';
MG.Physics = (() => {
  const clamp = MG.clamp;
  /* Tap-driven runner.  Every valid alternating press feeds a cadence estimate (taps/s); acceleration depends on
     cadence relative to an optimum, on rhythm regularity and on fatigue, and is opposed by drag.  */
  class SprintModel {
    constructor(cfg = {}) {
      this.A = (cfg.A || 9.5) * (cfg.assist || 1); this.Vm = cfg.Vm || 12.6; this.drag = cfg.drag || .12; this.copt = cfg.copt || 7.5;
      this.v = 0; this.x = 0; this.cad = 0; this.drive = 0; this.fatigue = 0; this.reg = 1; this.lastTap = -1; this.lastSide = null; this.iv = []; this.taps = 0; this.stumble = 0; this.coast = false; this.air = false; this.lastWrong = -9;
    }
    reset() { this.v = 0; this.x = 0; this.cad = 0; this.drive = 0; this.fatigue = 0; this.lastTap = -1; this.lastSide = null; this.iv = []; this.taps = 0; this.stumble = 0; this.coast = false; this.air = false; }
    /* side: 'left' | 'right'; now: simulation time of the key-down. returns 'ok' | 'same' | 'bounce' */
    tap(side, now) {
      if (this.coast) return 'ok';
      if (side === this.lastSide) { this.lastWrong = now; return 'same'; }
      if (this.lastTap >= 0 && now - this.lastTap < .035) return 'bounce';
      if (this.lastTap >= 0) { const iv = Math.max(.035, now - this.lastTap); this.cad = this.cad * .55 + Math.min(1 / iv, 16) * .45; this.iv.push(iv); if (this.iv.length > 6) this.iv.shift(); }
      else this.cad = Math.max(this.cad, 4);
      this.lastTap = now; this.lastSide = side; this.taps++;
      this.v += .05 * Math.max(0, 1 - this.v / this.Vm);
      return 'ok';
    }
    update(dt, now) {
      const since = this.lastTap < 0 ? 99 : now - this.lastTap, expect = this.cad > .5 ? 1 / this.cad : .3;
      if (this.coast || since > expect * 1.6 + .05) this.cad *= Math.exp(-dt * (this.coast ? 4 : 3.2));
      if (this.iv.length >= 4) { const m = this.iv.reduce((a, b) => a + b, 0) / this.iv.length, sd = Math.sqrt(this.iv.reduce((a, b) => a + (b - m) * (b - m), 0) / this.iv.length); this.reg = clamp(1.12 - (sd / m) * 1.6, .72, 1); } else this.reg = 1;
      this.drive = this.coast ? 0 : clamp(this.cad / this.copt, 0, 1.15) * this.reg;
      if (this.drive > .5) this.fatigue = Math.min(1, this.fatigue + dt * .045 * this.drive * this.drive); else this.fatigue = Math.max(0, this.fatigue - dt * .02);
      this.stumble = Math.max(0, this.stumble - dt);
      const Vm = this.Vm * (1 - .10 * this.fatigue) * (this.stumble > 0 ? .85 : 1), A = this.A * (1 - .12 * this.fatigue);
      let a = A * this.drive * (1 - this.v / Vm) - this.drag * this.v - (this.air ? 0 : .5 * this.v * (1 - Math.min(1, this.drive)));
      if (this.air) a = -.05 * this.v;
      this.v = Math.max(0, this.v + a * dt); this.x += this.v * dt;
    }
    get speedFactor() { return clamp(this.v / 11, 0, 1); }
  }
  /* long-jump take-off: approach speed (m/s) + angle (deg) → launch velocity components */
  function longJumpLaunch(v, angle) {
    const f = 1 - .012 * Math.max(0, angle - 18), v0 = (.97 * v + 1.2) * f, a = angle * Math.PI / 180;
    return { vx: v0 * Math.cos(a), vy: v0 * Math.sin(a) };
  }
  const G_LJ = 10.5;
  function flightRange(vx, vy) { const T = 2 * vy / G_LJ; return { T, range: vx * T }; }
  /* hurdle jump: foot height over time */
  const HURDLE = { vy: 6.2, g: 20, clear: .78 };
  return { SprintModel, longJumpLaunch, flightRange, G_LJ, HURDLE };
})();
