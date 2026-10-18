/* MAX GAMES — shared constants, countries, flags and athlete looks.
   Everything is drawn procedurally; no external assets are used. */
'use strict';
window.MG = window.MG || {};
MG.W = 320; MG.H = 180;   // design size of the track scene; the real canvas size lives in MG.view
MG.PPM = 14;                       // pixels per metre in the side-scrolling views
MG.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
MG.lerp = (a, b, t) => a + (b - a) * t;
MG.rnd = (a, b) => a + Math.random() * (b - a);
MG.pick = a => a[Math.floor(Math.random() * a.length)];
MG.fmtTime = t => { if (t == null || !isFinite(t)) return '--.--'; const s = Math.floor(t), h = Math.floor((t - s) * 100 + 1e-6); return (s < 10 ? '0' : '') + s + '.' + (h < 10 ? '0' : '') + h; };
MG.fmtDist = d => (d == null || !isFinite(d)) ? '-.--' : d.toFixed(2);

/* shirt / shorts colours double as the national kit */
MG.COUNTRIES = [
  { code: 'GER', name: 'GERMANY', c1: '#f4f4f4', c2: '#20202a', last: ['MUELLER', 'SCHMIDT', 'KRAUSE', 'WEBER'] },
  { code: 'FRA', name: 'FRANCE', c1: '#2e5fd0', c2: '#f4f4f4', last: ['MARTIN', 'DUBOIS', 'LEROY', 'MOREAU'] },
  { code: 'ITA', name: 'ITALY', c1: '#2f7fe0', c2: '#2f7fe0', last: ['ROSSI', 'FERRARI', 'BIANCHI', 'COSTA'] },
  { code: 'ESP', name: 'SPAIN', c1: '#d93030', c2: '#f2c830', last: ['GARCIA', 'LOPEZ', 'RUIZ', 'MORENO'] },
  { code: 'NED', name: 'NETHERLANDS', c1: '#f08a20', c2: '#f08a20', last: ['DEJONG', 'BAKKER', 'VISSER', 'SMIT'] },
  { code: 'SWE', name: 'SWEDEN', c1: '#f2c830', c2: '#2a60c0', last: ['LINDQVIST', 'NILSSON', 'BERG', 'HOLM'] },
  { code: 'JPN', name: 'JAPAN', c1: '#f4f4f4', c2: '#d83030', last: ['SATO', 'TANAKA', 'KOBAYASHI', 'ITO'] },
  { code: 'USA', name: 'USA', c1: '#d83030', c2: '#2a3f9a', last: ['JOHNSON', 'WILLIAMS', 'CARTER', 'BROOKS'] },
  { code: 'GBR', name: 'GREAT BRITAIN', c1: '#2a3f9a', c2: '#f4f4f4', last: ['SMITH', 'TAYLOR', 'HUGHES', 'WALKER'] },
  { code: 'BRA', name: 'BRAZIL', c1: '#f2d020', c2: '#2a8a3a', last: ['SILVA', 'SANTOS', 'OLIVEIRA', 'LIMA'] },
  { code: 'JAM', name: 'JAMAICA', c1: '#f2c820', c2: '#1a1a1a', last: ['BOLTON', 'CAMPBELL', 'FRASER', 'THOMAS'] },
  { code: 'NGA', name: 'NIGERIA', c1: '#2a9a45', c2: '#f4f4f4', last: ['OKAFOR', 'ADEBAYO', 'EZE', 'BELLO'] },
  { code: 'CHN', name: 'CHINA', c1: '#d62828', c2: '#f2c830', last: ['WANG', 'LI', 'ZHANG', 'CHEN'] },
  { code: 'CZE', name: 'CZECHIA', c1: '#d62828', c2: '#2a4fc0', last: ['NOVAK', 'SVOBODA', 'DVORAK', 'CERNY'] },
  { code: 'RUS', name: 'RUSSIA', c1: '#f4f4f4', c2: '#2a4fc0', last: ['IVANOV', 'SMIRNOV', 'VOLKOV', 'POPOV'] },
  { code: 'UKR', name: 'UKRAINE', c1: '#f2d020', c2: '#2a60c0', last: ['SHEVCHUK', 'BONDAR', 'KOVAL', 'MELNYK'] },
];
MG.country = code => MG.COUNTRIES.find(c => c.code === code) || MG.COUNTRIES[0];

/* athlete looks: skin, hair, hair style (0 short, 1 curly, 2 long/blond, 3 cap-less buzz) */
MG.LOOKS = [
  { skin: '#f1c39b', hair: '#4a2f1c', style: 0 },
  { skin: '#c98c5a', hair: '#1b1210', style: 1 },
  { skin: '#8d5a34', hair: '#0e0a08', style: 3 },
  { skin: '#f1c39b', hair: '#e0b84a', style: 2 },
  { skin: '#e2ab7a', hair: '#8a3a1c', style: 0 },
  { skin: '#6a4024', hair: '#0e0a08', style: 1 },
];

MG.EVENTS = {
  sprint:   { id: 'sprint', name: '100M SPRINT', short: '100M', unit: 'time', dist: 100, desc: 'TAP LEFT AND RIGHT AS FAST AS YOU CAN', jump: null },
  longjump: { id: 'longjump', name: 'LONG JUMP', short: 'LJ', unit: 'dist', desc: 'SPRINT UP, THEN JUMP AT THE BOARD', jump: 'JUMP' },
  discus:   { id: 'discus', name: 'DISCUS THROW', short: 'DT', unit: 'dist', desc: 'SPIN UP, THEN RELEASE IN THE GREEN', jump: 'THROW' },
  hurdles:  { id: 'hurdles', name: '110M HURDLES', short: '110H', unit: 'time', dist: 110, desc: 'SPRINT AND CLEAR TEN HURDLES', jump: 'JUMP' },
  swimming: { id: 'swimming', name: '50M SWIMMING', short: '50M', unit: 'time', dist: 50, desc: 'TAP IN STROKE RHYTHM', jump: null },
  cycling:  { id: 'cycling', name: '200M CYCLING', short: '200M', unit: 'time', dist: 200, desc: 'PEDAL AS FAST AS YOU CAN', jump: null },
  rowing:   { id: 'rowing', name: '200M ROWING', short: '200M', unit: 'time', dist: 200, desc: 'PULL IN SMOOTH STROKES', jump: null },
  javelin:  { id: 'javelin', name: 'JAVELIN', short: 'JT', unit: 'dist', desc: 'RUN UP AND LAUNCH AT THE LINE', jump: 'THROW' },
};
MG.EVENT_ORDER = ['sprint', 'swimming', 'longjump', 'cycling', 'discus', 'rowing', 'hurdles', 'javelin'];
/* water / wheel sports reuse the tap-to-race engine with their own physics (arcade-scaled distances) */
MG.SPORTS = {
  swimming: { L: 50, Vm: 3.3, A: 2.8, drag: .1, copt: 5.5, walkT: .5 },
  cycling: { L: 200, Vm: 19, A: 10, drag: .08, copt: 8, walkT: .5 },
  rowing: { L: 200, Vm: 12, A: 6, drag: .08, copt: 4, walkT: .5 },
};
MG.DIFFICULTY = {
  easy:   { name: 'EASY',   ai: [0.80, 0.91], jitter: 0.20, assist: 1.07, hurdleErr: 0.55, ljBase: 6.6,  ljSpread: 0.55, dcBase: 43, jvBase: 56, thSpread: 4.0, window: 1.3 },
  normal: { name: 'NORMAL', ai: [0.86, 0.97], jitter: 0.14, assist: 1.00, hurdleErr: 0.38, ljBase: 7.25, ljSpread: 0.50, dcBase: 50, jvBase: 64, thSpread: 4.5, window: 1.0 },
  hard:   { name: 'HARD',   ai: [0.95, 1.06], jitter: 0.08, assist: 0.97, hurdleErr: 0.22, ljBase: 7.8,  ljSpread: 0.45, dcBase: 56, jvBase: 72, thSpread: 5.0, window: 0.8 },
};
/* wins = event victories needed, tier = championship tier that must be cleared */
MG.STADIUMS = [
  { id: 'city',   name: 'CITY STADIUM',  how: 'AVAILABLE FROM THE START' },
  { id: 'sunset', name: 'SUNSET ARENA',  wins: 2, how: 'WIN 2 EVENTS' },
  { id: 'beach',  name: 'BEACH ARENA',   wins: 5, how: 'WIN 5 EVENTS' },
  { id: 'alpine', name: 'ALPINE PARK',   tier: 0, how: 'WIN REGIONAL' },
  { id: 'night',  name: 'NIGHT STADIUM', tier: 1, how: 'WIN WORLDS' },
  { id: 'neon',   name: 'NEON DOME',     tier: 2, how: 'WIN OLYMPICS' },
];
MG.TIERS = ['REGIONAL', 'WORLD', 'OLYMPIC'];
MG.TIER_AI = [0.97, 1.0, 1.035];

/* ---------------- flags (16x10 pixel art, cached) ---------------- */
MG._flags = {};
MG.flag = function (code) {
  if (MG._flags[code]) return MG._flags[code];
  const c = document.createElement('canvas'); c.width = 16; c.height = 10; const g = c.getContext('2d');
  const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  switch (code) {
    case 'GER': r('#1b1b1b', 0, 0, 16, 4); r('#d62828', 0, 3, 16, 3); r('#f2c82a', 0, 6, 16, 4); break;
    case 'FRA': r('#2a4fc0', 0, 0, 5, 10); r('#f4f4f4', 5, 0, 6, 10); r('#d62828', 11, 0, 5, 10); break;
    case 'ITA': r('#2a9a45', 0, 0, 5, 10); r('#f4f4f4', 5, 0, 6, 10); r('#d62828', 11, 0, 5, 10); break;
    case 'ESP': r('#c8282d', 0, 0, 16, 10); r('#f2c82a', 0, 3, 16, 4); r('#9a3a2a', 3, 4, 2, 2); break;
    case 'NED': r('#c8282d', 0, 0, 16, 4); r('#f4f4f4', 0, 3, 16, 4); r('#2a4fa0', 0, 6, 16, 4); break;
    case 'SWE': r('#2a5fb0', 0, 0, 16, 10); r('#f2c82a', 5, 0, 3, 10); r('#f2c82a', 0, 4, 16, 2); break;
    case 'JPN': r('#f4f4f4', 0, 0, 16, 10); g.fillStyle = '#d62828'; g.beginPath(); g.arc(8, 5, 3, 0, 6.3); g.fill(); break;
    case 'USA': for (let i = 0; i < 10; i++) r(i % 2 ? '#f4f4f4' : '#c8282d', 0, i, 16, 1); r('#2a3f8a', 0, 0, 7, 5); g.fillStyle = '#f4f4f4'; for (let y = 1; y < 5; y += 2) for (let x = 1; x < 7; x += 2) g.fillRect(x, y, 1, 1); break;
    case 'GBR': r('#2a3f8a', 0, 0, 16, 10); g.strokeStyle = '#f4f4f4'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(16, 10); g.moveTo(16, 0); g.lineTo(0, 10); g.stroke(); g.strokeStyle = '#c8282d'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(16, 10); g.moveTo(16, 0); g.lineTo(0, 10); g.stroke(); r('#f4f4f4', 6, 0, 4, 10); r('#f4f4f4', 0, 3, 16, 4); r('#c8282d', 7, 0, 2, 10); r('#c8282d', 0, 4, 16, 2); break;
    case 'BRA': r('#2a9a45', 0, 0, 16, 10); g.fillStyle = '#f2d020'; g.beginPath(); g.moveTo(8, 1); g.lineTo(14, 5); g.lineTo(8, 9); g.lineTo(2, 5); g.fill(); g.fillStyle = '#2a4fa0'; g.beginPath(); g.arc(8, 5, 2.4, 0, 6.3); g.fill(); break;
    case 'JAM': r('#2a9a45', 0, 0, 16, 10); g.fillStyle = '#1a1a1a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 10); g.lineTo(6, 5); g.fill(); g.beginPath(); g.moveTo(16, 0); g.lineTo(16, 10); g.lineTo(10, 5); g.fill(); g.strokeStyle = '#f2c82a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(16, 10); g.moveTo(16, 0); g.lineTo(0, 10); g.stroke(); g.fillStyle = '#1a1a1a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 10); g.lineTo(5, 5); g.fill(); g.beginPath(); g.moveTo(16, 0); g.lineTo(16, 10); g.lineTo(11, 5); g.fill(); break;
    case 'NGA': r('#2a9a45', 0, 0, 5, 10); r('#f4f4f4', 5, 0, 6, 10); r('#2a9a45', 11, 0, 5, 10); break;
    case 'CHN': r('#d62828', 0, 0, 16, 10); r('#f6d030', 2, 1, 3, 3); r('#f6d030', 1, 2, 5, 1); r('#f6d030', 3, 0, 1, 5); r('#f6d030', 7, 1, 1, 1); r('#f6d030', 8, 3, 1, 1); r('#f6d030', 8, 5, 1, 1); r('#f6d030', 7, 6, 1, 1); break;
    case 'CZE': r('#f4f4f4', 0, 0, 16, 5); r('#d62828', 0, 5, 16, 5); g.fillStyle = '#2a4fa0'; g.beginPath(); g.moveTo(0, 0); g.lineTo(8, 5); g.lineTo(0, 10); g.fill(); break;
    case 'RUS': r('#f4f4f4', 0, 0, 16, 3); r('#2a4fc0', 0, 3, 16, 4); r('#d62828', 0, 7, 16, 3); break;
    case 'UKR': r('#2a62d0', 0, 0, 16, 5); r('#f4d020', 0, 5, 16, 5); break;
    default: r('#888', 0, 0, 16, 10);
  }
  r('rgba(0,0,0,.35)', 0, 9, 16, 1);
  return MG._flags[code] = c;
};
