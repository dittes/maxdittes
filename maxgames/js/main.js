/* MAX GAMES — bootstrap */
'use strict';
window.addEventListener('DOMContentLoaded', () => {
  MG.Storage.load();
  try { const q = new URLSearchParams(location.search).get('c'); if (q) { const [id, v, from] = q.split('~'); if (MG.EVENTS[id] && isFinite(+v) && +v > 0) MG.challenge = { id, val: +v, from }; } } catch (e) {}
  const cv = document.getElementById('screen'); MG.Input.init(cv);
  MG.game = new MG.GameManager(cv);
  const wake = () => MG.Audio.init(); addEventListener('keydown', wake); addEventListener('pointerdown', wake);
  MG.game.start();
});
