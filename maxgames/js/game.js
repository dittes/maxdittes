/* MAX GAMES — GameManager: main loop, screen/flow control, pause, replay, championship and multiplayer orchestration. */
'use strict';
/* Full-screen adaptive view: logical canvas of W x H pixels that always fills the window. Menus live in a 320x180 design box,
   the track scene fills the canvas (scaled by k on portrait phones) and touch controls use the free strip underneath. */
MG.view = { W: 320, H: 180, k: 1, top: 0, touch: false, portrait: false, stripY: 180, stripH: 0, s: 1, dashH: 0 };
MG.layoutView = function (canvas) {
  const V = MG.view, vw = innerWidth, vh = innerHeight, touch = matchMedia('(pointer:coarse)').matches, portrait = vh > vw * 1.15; let W, H, s, k = 1, top;
  if (portrait) { W = 224; s = vw / W; H = Math.ceil(vh / s); top = Math.ceil(28 / s); k = MG.clamp((H - top - 36 - 150) / 180, 1, 1.3); }
  else {
    const strip = touch ? 48 : 0; top = 8; let total;
    for (let i = 0; i < 3; i++) { total = 180 + top + strip; s = vh / total; top = Math.ceil(26 / s); } total = 180 + top + strip; s = vh / total; W = vw / s; H = total;
    if (W < 320) { W = 320; s = vw / W; H = Math.ceil(vh / s); } else W = Math.ceil(W);
  }
  Object.assign(V, { W, H, k, top, touch, portrait, s, stripY: top + Math.round(180 * k), stripH: H - (top + Math.round(180 * k)) });
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; }
};
/* toast message (drawn by the game loop) */
MG.toast = (txt, secs = 2.6) => { if (MG.game) { MG.game.toastTxt = txt; MG.game.toastT = secs; } };
MG.GameManager = class GameManager {
  constructor(canvas) {
    this.canvas = canvas; MG.layoutView(canvas); this.ctx = canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false; addEventListener('resize', () => { MG.layoutView(canvas); this.ctx.imageSmoothingEnabled = false; }); this.last = performance.now(); this.screen = null; this.fade = 0; this.stadiums = {}; this.toastT = 0;
    this.backdrop = new MG.UI.Backdrop(); this.champ = null; this.mp = null; this.swallowSrc = null; this.swallowT = 0; this.curSrc = null; this.paused = null;
    MG.Input.on(ev => this.handleInput(ev));
    document.addEventListener('visibilitychange', () => { if (document.hidden && !MG.noAutoPause && this.screen && this.screen.pausable && !this.paused) this.pause(); });
  }
  start() { this.go(new MG.Screens.Title(this)); requestAnimationFrame(t => { this.last = t; requestAnimationFrame(n => this.frame(n)); }); }
  stadiumFor(cfg) {
    let id = (cfg && cfg.stadium) || MG.Storage.data.settings.stadium; if (!MG.Storage.stadiumUnlocked(id)) id = 'city';
    return this.stadiums[id] || (this.stadiums[id] = new MG.Stadium(id));
  }
  menuStadium() { return this.stadiumFor({ stadium: MG.Storage.data.settings.stadium }); }
  /* ---------------------------------------------------------- screens */
  go(screen, reuse) {
    if (this.screen && this.screen.exit) this.screen.exit(); this.screen = screen; this.paused = null; this.fade = .9; this.swallowSrc = this.curSrc; this.swallowT = performance.now();
    if (!reuse && screen.enter) screen.enter(); 
  }
  toMenu() { this.champ = null; this.mp = null; this.go(new MG.Screens.MainMenu(this)); }
  handleInput(ev) {
    this.curSrc = ev.src; if (ev.type === 'down' && ['up', 'down', 'left', 'right', 'ok'].includes(ev.act) && !(this.screen && this.screen.isEvent)) MG.UI.kb.on = true;
    if (this.swallowSrc && ev.src === this.swallowSrc && ev.type === 'down' && performance.now() - this.swallowT < 70) return true;
    const s = this.screen; if (!s) return false;
    if (ev.act === 'pointer') {
      const mode = s.isEvent && !s.replay && !this.paused ? s.padMode : null;
      if (MG.Controls.handle(ev, mode)) return true;
    }
    if (s.replay && ev.type !== 'up' && ev.type !== 'pmove' && ev.type !== 'pup') { s.replay.f = 1e9; return true; }
    if (s.pausable && !s.replay && ev.type === 'down' && (ev.act === 'pause' || ev.act === 'back')) { this.pause(); return true; }
    return s.onInput ? s.onInput(ev) : false;
  }
  frame(now) {
    const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; const s = this.screen;
    this.backdrop.update(dt);
    try {
      s.update(dt);
      if (s.pausable && s.done && !s.replay && !s.shown) { s.shown = true; this.showResults(s); }
      
      const V = MG.view, c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0);
      document.body.classList.toggle('play', !!s.isEvent); MG.view.dashH = 0; s.render(c);
      MG.Controls.draw(c, s.isEvent && !s.replay ? s.padMode : null);
      if (this.toastT > 0) { this.toastT -= dt; const w = MG.Font.width(this.toastTxt) + 16, x = Math.round((V.W - w) / 2), y = V.H - Math.ceil(70 / V.s) - 14; MG.UI.panel(c, x, y, w, 18, { fill: MG.UI.C.ink, hi: 'rgba(255,255,255,.2)' }); MG.Font.text(c, this.toastTxt, V.W / 2, y + 6, '#fff', 1, { align: 'center' }); }
    } catch (e) { console.error(e); MG.W = 320; MG.H = 180; }
    if (this.fade > 0) { this.ctx.fillStyle = `rgba(8,6,28,${this.fade})`; this.ctx.fillRect(0, 0, MG.view.W, MG.view.H); this.fade = Math.max(0, this.fade - dt * 3.5); }
    requestAnimationFrame(n => this.frame(n));
  }
  /* ---------------------------------------------------------- events */
  makeEvent(cfg) { return MG.SPORTS[cfg.id] ? new MG.SportRace(this, cfg) : cfg.id === 'longjump' ? new MG.LongJumpEvent(this, cfg) : cfg.id === 'javelin' ? new MG.JavelinEvent(this, cfg) : cfg.id === 'discus' ? new MG.DiscusEvent(this, cfg) : new MG.RaceEvent(this, cfg); }
  launchEvent(cfg) {
    MG.Audio.stopMusic(); const ev = this.makeEvent(cfg); ev.cfgRef = cfg; this.go(ev);
  }
  showResults(ev) { this.go(new MG.Screens.Results(this, { event: ev, result: ev.result, cfg: ev.cfg })); }
  replayEvent(ev, back) { if (!ev.rec || ev.rec.length < 5) return; MG.Audio.sfx.whistle(); this.screen = ev; ev.startReplay(1, () => { this.go(back, true); }); this.fade = .5; }
  retry(cfg) { this.launchEvent(Object.assign({}, cfg, { field: undefined })); }
  pause() { if (this.paused || !this.screen.pausable) return; const under = this.screen; this.paused = under; MG.Audio.sfx.select(); const p = new MG.Screens.Pause(this, { under }); this.screen = p; p.enter(); MG.Controls.release(); }
  resume() { if (!this.paused) return; this.screen = this.paused; this.paused = null; this.last = performance.now(); this.screen.realFrame = performance.now() / 1000; this.swallowSrc = this.curSrc; this.swallowT = performance.now(); }
  restartEvent() { const ev = this.paused; this.paused = null; this.launchEvent(Object.assign({}, ev.cfg)); }
  quitEvent() { this.paused = null; this.toMenu(); MG.Audio.music('menu'); }
  /* ---------------------------------------------------------- flows */
  humanCfg() { const pr = MG.Storage.data.profile; return { name: 'YOU', country: pr.country, look: pr.look }; }
  baseCfg(mode, id, challenge) { const s = MG.Storage.data.settings; return { id, mode, diff: s.difficulty, stadium: s.stadium, tier: 0, opponents: mode !== 'practice', humans: [this.humanCfg()], challenge: challenge || null }; }
  flowSingle(mode, id, challenge) {
    const cfg = this.baseCfg(mode, id, challenge);
    this.go(new MG.Screens.Instructions(this, { cfg, index: 0, onStart: () => this.launchEvent(cfg), parent: () => challenge ? this.toMenu() : this.go(new MG.Screens.EventSelect(this, { mode })) }));
  }
  champStart() { this.champ = new MG.ChampionshipManager(); this.champEvent(); }
  champEvent() {
    const c = this.champ, id = c.eventId, st = MG.Storage.data.settings;
    const cfg = { id, mode: 'champ', diff: c.diff, stadium: st.stadium, tier: c.tier, opponents: true, field: c.field, humans: [this.humanCfg()] };
    this.go(new MG.Screens.Instructions(this, { cfg, index: c.i, onStart: () => this.launchEvent(cfg), parent: () => this.toMenu() }));
  }
  champContinue(result) { this.champ.add(result); this.go(new MG.Screens.ChampTable(this, { champ: this.champ, cfg: { stadium: MG.Storage.data.settings.stadium } })); }
  champNext() { if (this.champ.done) { this.champ.finish(); this.go(new MG.Screens.Ceremony(this, { champ: this.champ })); } else this.champEvent(); }
};
