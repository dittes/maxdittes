/* MAX GAMES — sharing: result card (pixel-art image), challenge link (?c=event~value~country) and Web Share / clipboard fallback. */
'use strict';
MG.Share = (() => {
  const F = MG.Font, C = () => MG.UI.C;
  const VERB = { sprint: 'RAN THE 100M IN', hurdles: 'RAN THE 110M HURDLES IN', swimming: 'SWAM 50M IN', cycling: 'CYCLED 200M IN', rowing: 'ROWED 200M IN', longjump: 'LONG JUMPED', discus: 'THREW THE DISCUS', javelin: 'THREW THE JAVELIN' };
  /* result → {id, value, text, shortValue, rank, country, name, url} */
  function info(result, cfg) {
    const ev = MG.EVENTS[result.id], h = result.human, isTime = ev.unit === 'time', value = isTime ? h.time : h.best;
    const val = isTime ? MG.fmtTime(value) + 'S' : MG.fmtDist(value) + 'M', country = cfg && cfg.humans ? cfg.humans[0].country : MG.Storage.data.profile.country;
    const url = location.origin + location.pathname + '?c=' + result.id + '~' + (+value).toFixed(2) + '~' + country;
    const text = `I ${VERB[result.id]} ${val} for ${MG.country(country).name} in MAX GAMES! Can you beat that?`;
    return { id: result.id, ev, value, val, isTime, rank: h.rank, country, text, url, dq: !!h.dq, n: result.rows.length };
  }
  function card(inf, size = 200) {
    const c = document.createElement('canvas'); c.width = size; c.height = size; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const st = MG.game ? MG.game.menuStadium() : null, th = st ? st.th : { sky: ['#3f9be8', '#6cb8f2', '#9fd4f8', '#cdeaff'], track: ['#cf5b36', '#b04828', '#e07848'], g: ['#3f9f40', '#348f37'] }, UI = MG.UI, Cc = UI.C;
    for (let i = 0; i < 4; i++) { g.fillStyle = th.sky[i]; g.fillRect(0, Math.round(i * size * .72 / 4), size, Math.ceil(size * .72 / 4) + 1); }
    g.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 5; i++) g.fillRect((i * 47 + 8) % size, 36 + (i * 23) % 70, 26 + i * 4, 5);
    g.fillStyle = th.g[0]; g.fillRect(0, size - 44, size, 44); g.fillStyle = th.g[1]; for (let x = 0; x < size; x += 40) g.fillRect(x, size - 44, 20, 44);
    g.fillStyle = th.track[0]; g.fillRect(0, size - 62, size, 20); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, size - 52, size, 1); g.fillRect(0, size - 62, size, 1);
    F.text(g, 'MAX GAMES', size / 2, 8, '#ffc933', 3, { align: 'center', shadow: Cc.coral, outline: Cc.ink, ext: 1 });
    UI.panel(g, 14, 38, size - 28, 112, { fill: Cc.cream });
    g.drawImage(MG.flag(inf.country), 22, 48, 32, 20); F.text(g, MG.country(inf.country).name.slice(0, 12), 62, 53, Cc.ink, 1);
    F.text(g, inf.ev.name, size - 22, 53, Cc.mute, 1, { align: 'right' });
    const big = inf.isTime ? MG.fmtTime(inf.value) : MG.fmtDist(inf.value), unit = inf.isTime ? 'SEC' : 'METRES';
    F.text(g, inf.dq ? 'DQ' : big, size / 2, 76, Cc.coral, big.length > 5 ? 4 : 5, { align: 'center', shadow: Cc.ink, ext: 1 });
    F.text(g, unit, size / 2, 120, Cc.navy, 1, { align: 'center' });
    const rtxt = inf.n < 2 ? 'PRACTICE' : inf.rank === 1 ? 'GOLD MEDAL' : inf.rank === 2 ? 'SILVER MEDAL' : inf.rank === 3 ? 'BRONZE MEDAL' : inf.rank + 'TH PLACE';
    if (inf.n > 1 && inf.rank <= 3) MG.Sprites.medal(g, ['gold', 'silver', 'bronze'][inf.rank - 1], 36, 139, .8);
    F.text(g, rtxt, inf.n > 1 && inf.rank <= 3 ? 50 : size / 2, 134, Cc.ink, 1, inf.n > 1 && inf.rank <= 3 ? {} : { align: 'center' });
    const pal = MG.Sprites.palette(inf.country, MG.Storage.data.profile.look); MG.Sprites.athlete(g, { pal, pose: 'celebrate', poseT: .3, sp: 0 }, size - 40, size - 22);
    F.text(g, 'CAN YOU BEAT ME?', 10, size - 30, '#fff', 1, { shadow: Cc.ink });
    F.text(g, 'MAXDITTES.COM', 10, size - 17, Cc.sun, 1, { shadow: Cc.ink });
    return c;
  }
  async function send(inf) {
    const out = { ok: false, how: '' };
    try {
      const big = document.createElement('canvas'); big.width = big.height = 800; const bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(card(inf), 0, 0, 800, 800);
      const blob = await new Promise(r => big.toBlob(r, 'image/png')), file = blob ? new File([blob], 'max-games.png', { type: 'image/png' }) : null;
      const data = { title: 'MAX GAMES', text: inf.text, url: inf.url };
      if (navigator.share) {
        try { if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share(Object.assign({ files: [file] }, data)); else await navigator.share(data); out.ok = true; out.how = 'shared'; MG.Storage.data.stats.shares++; MG.Storage.save(); return out; }
        catch (e) { if (e && e.name === 'AbortError') return out; }
      }
    } catch (e) {}
    return Object.assign(out, await copy(inf));
  }
  async function copy(inf) {
    const txt = inf.text + ' ' + inf.url;
    try { await navigator.clipboard.writeText(txt); MG.Storage.data.stats.shares++; MG.Storage.save(); return { ok: true, how: 'copied' }; } catch (e) {}
    try { const t = document.createElement('textarea'); t.value = txt; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); if (ok) return { ok: true, how: 'copied' }; } catch (e) {}
    return { ok: false, how: 'failed' };
  }
  return { info, card, send, copy };
})();
