/* MAX GAMES — Athlete (human or computer) and AICompetitor. */
'use strict';
MG.Athlete = class Athlete {
  constructor(o) {
    this.name = o.name || 'PLAYER'; this.country = o.country || 'GER'; this.look = o.look || 0; this.lane = o.lane || 0; this.isHuman = !!o.human; this.id = o.id || 0;
    this.pal = MG.Sprites.palette(this.country, this.look);
    this.model = new MG.Physics.SprintModel({ assist: o.assist || 1, copt: o.copt || 7.5 });
    this.reset();
  }
  reset() {
    this.model.reset(); this.x = 0; this.y = 0; this.pose = 'stand'; this.poseT = 0; this.sp = 0; this.phase = Math.random(); this.poseExtra = '';
    this.finished = false; this.finishTime = null; this.dq = false; this.rank = 0; this.jump = null; this.hurdlesHit = 0; this.started = false;
  }
  /* render-relevant state (used for replays) */
  snap() { return { x: this.x, y: this.y, pose: this.pose, poseT: this.poseT, sp: this.sp, pal: this.pal, lane: this.lane, isHuman: this.isHuman, country: this.country, poseExtra: this.poseExtra }; }
  /* advance the running animation: stride rate follows the tapping cadence (or ground speed when coasting) */
  animateRun(dt) {
    const m = this.model, rate = Math.max(m.cad / 2, m.v / 3.3);
    this.phase = (this.phase + dt * rate) % 1; this.sp = MG.clamp(m.v / 11, 0, 1);
    if (m.v < .4 && !this.started) return;
    this.pose = m.v < 1.3 ? 'walk' : 'run'; this.poseT = this.phase;
  }
};

/* Computer opponent: taps with a scheduled rhythm that has a skill-dependent jitter. */
MG.AICompetitor = class AICompetitor extends MG.Athlete {
  constructor(o) { super(o); this.skill = o.skill || .9; this.jitter = o.jitter || .12; this.react = MG.rnd(.13, .30); this.nextTap = 0; this.side = 'left'; this.hurdleErr = o.hurdleErr || .3; this.hErr = []; this.hIndex = 0; }
  prepare(goTime) { this.nextTap = goTime + this.react; this.side = Math.random() < .5 ? 'left' : 'right'; this.hIndex = 0; this.hErr = []; }
  /* called every sim step; fires taps whose time has come */
  think(now) {
    while (now >= this.nextTap && !this.finished) {
      this.model.tap(this.side, this.nextTap); this.side = this.side === 'left' ? 'right' : 'left'; this.started = true;
      const base = 1 / (this.model.copt * this.skill), j = 1 + (Math.random() * 2 - 1) * this.jitter; this.nextTap += Math.max(.06, base * j);
    }
  }
};

/* factory for a field of opponents with spread-out strengths */
MG.makeField = function (n, playerCountries, diffKey, tier) {
  const d = MG.DIFFICULTY[diffKey], mult = MG.TIER_AI[tier || 0], taken = new Set(playerCountries), pool = MG.COUNTRIES.filter(c => !taken.has(c.code)).sort(() => Math.random() - .5), out = [];
  const skills = []; for (let i = 0; i < n; i++) skills.push(MG.lerp(d.ai[0], d.ai[1], n === 1 ? .5 : i / (n - 1))); skills.sort(() => Math.random() - .5);
  for (let i = 0; i < n; i++) {
    const c = pool[i % pool.length], nm = MG.pick(c.last);
    out.push({ name: nm, country: c.code, look: Math.floor(Math.random() * MG.LOOKS.length), skill: skills[i] * mult, jitter: d.jitter * MG.rnd(.8, 1.25), hurdleErr: d.hurdleErr * MG.rnd(.7, 1.3) / mult });
  }
  return out;
};
