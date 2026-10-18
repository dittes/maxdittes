/* MAX GAMES — ChampionshipManager: points table, medals, tier progression. */
'use strict';
MG.POINTS = [10, 8, 6, 4, 2];

MG.ChampionshipManager = class ChampionshipManager {
  constructor() {
    const S = MG.Storage.data, pr = S.profile; this.tier = S.champ.tier; this.diff = S.settings.difficulty;
    this.field = MG.makeField(4, [pr.country], this.diff, this.tier);
    this.comps = [{ key: 'YOU', name: 'YOU', country: pr.country, look: pr.look, human: true, points: 0, per: [] }].concat(this.field.map(f => ({ key: f.country, name: f.name, country: f.country, look: f.look, human: false, points: 0, per: [] })));
    this.order = MG.EVENT_ORDER.slice(); this.i = 0; this.done = false; this.final = null;
  }
  get eventId() { return this.order[this.i]; }
  add(result) {
    for (const r of result.rows) {
      const c = this.comps.find(c => r.human ? c.human : c.country === r.country); if (!c) continue;
      const p = r.dq ? 0 : (MG.POINTS[r.rank - 1] || 0); c.points += p; c.per.push({ id: result.id, rank: r.rank, pts: p, dq: !!r.dq });
    }
    this.i++; if (this.i >= this.order.length) this.done = true;
  }
  standings() {
    const rows = this.comps.slice().sort((a, b) => (b.points - a.points) || (a.per.reduce((s, x) => s + x.rank, 0) - b.per.reduce((s, x) => s + x.rank, 0)));
    rows.forEach((r, i) => r.rank = i + 1); return rows;
  }
  /* called once after the last event: updates medals, records and tier unlocks */
  finish() {
    const st = this.standings(), me = st.find(c => c.human), S = MG.Storage.data, out = { rank: me.rank, points: me.points, medal: null, unlocked: null, tier: this.tier };
    S.champ.played++; if (me.points > S.champ.best) S.champ.best = me.points;
    if (me.rank <= 3) { out.medal = ['gold', 'silver', 'bronze'][me.rank - 1]; S.champ[out.medal]++; }
    if (me.rank === 1 && !S.champ.cleared[this.tier]) { S.champ.cleared[this.tier] = true; const next = MG.STADIUMS.find(s => s.tier === this.tier); if (next) out.unlocked = next.name; }
    if (me.rank === 1) S.champ.tier = Math.min(2, this.tier + 1);
    MG.Storage.save(); this.final = out; return out;
  }
};
