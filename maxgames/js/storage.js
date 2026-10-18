/* MAX GAMES — StorageManager: records, progress and settings in localStorage. */
'use strict';
MG.Storage = (() => {
  const KEY = 'maxgames.v2';
  const defaults = () => ({
    settings: { sfx: true, music: true, difficulty: 'normal', stadium: 'city' },
    profile: { country: 'GER', look: 0, chosen: false },
    bests: { sprint: null, longjump: null, discus: null, hurdles: null, javelin: null, swimming: null, cycling: null, rowing: null },
    champ: { best: 0, played: 0, gold: 0, silver: 0, bronze: 0, tier: 0, cleared: [false, false, false] },
    stats: { races: 0, jumps: 0, throws: 0, falseStarts: 0, tapsTotal: 0, wins: 0, shares: 0 },
  });
  let data = defaults();
  function merge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) { a[k] = merge(a[k] || {}, b[k]); } else a[k] = b[k]; } return a; }
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) data = merge(defaults(), s); } catch (e) { data = defaults(); } if (!MG.STADIUMS.some(s => s.id === data.settings.stadium)) data.settings.stadium = 'city'; return data; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function reset() { data = defaults(); save(); }
  /* value: seconds (lower is better) or metres (higher is better). returns true on a new personal best */
  function record(eventId, value) {
    if (value == null || !isFinite(value)) return false;
    const cur = data.bests[eventId], isTime = MG.EVENTS[eventId].unit === 'time';
    if (cur == null || (isTime ? value < cur : value > cur)) { data.bests[eventId] = value; save(); return true; }
    return false;
  }
  function medal(type) { data.champ[type]++; save(); }
  function stadiumUnlocked(id) { const s = MG.STADIUMS.find(x => x.id === id); if (!s) return false; if (s.wins != null) return data.stats.wins >= s.wins; if (s.tier != null) return !!data.champ.cleared[s.tier]; return true; }
  return { get data() { return data; }, load, save, reset, record, medal, stadiumUnlocked };
})();
