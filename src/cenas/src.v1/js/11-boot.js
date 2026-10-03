/* ---------------------------------------------------------------
   11. BOOT — cena de exemplo e inicialização
   --------------------------------------------------------------- */

// Paredes da guarita da cena de exemplo, em quadrados: [x1, y1, x2, y2, tipo]
const SAMPLE_WALLS = [
  [17, 3, 25, 3], [25, 3, 25, 9], [17, 9, 20, 9], [20, 9, 21, 9, 'door'], [21, 9, 25, 9],
  [17, 3, 17, 6], [17, 7, 17, 9], [22, 3, 22, 6],
];

// Fundo desenhado na hora (grama, estrada, guarita), para a cena de exemplo não depender de arquivo.
function makeSampleBg(cols, rows, cell) {
  const w = cols * cell, hh = rows * cell;
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const g = c.getContext('2d'), rnd = mulberry(11);
  g.fillStyle = '#4b5b40'; g.fillRect(0, 0, w, hh);
  const greens = ['#3d4c35', '#56693f', '#445637', '#5e6c46', '#39472f'];
  for (let i = 0; i < 520; i++) {
    const r = 30 + rnd() * 110;
    g.globalAlpha = 0.1 + rnd() * 0.12; g.fillStyle = greens[i % 5];
    g.beginPath(); g.ellipse(rnd() * w, rnd() * hh, r, r * (0.5 + rnd() * 0.6), rnd() * Math.PI, 0, TAU); g.fill();
  }
  g.globalAlpha = 0.32; g.lineWidth = 1.5; g.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * w, y = rnd() * hh, a = -Math.PI / 2 + (rnd() - 0.5) * 0.9, l = 4 + rnd() * 6;
    g.strokeStyle = i % 2 ? '#6c7f4e' : '#33412b';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  // Estrada de terra
  const road = () => { g.beginPath(); g.moveTo(-80, 14.6 * cell); g.bezierCurveTo(8 * cell, 15.6 * cell, 15 * cell, 8.6 * cell, w + 80, 10.2 * cell); };
  g.globalAlpha = 1;
  road(); g.strokeStyle = '#5c5140'; g.lineWidth = cell * 2.9; g.stroke();
  road(); g.strokeStyle = '#7a6950'; g.lineWidth = cell * 2.3; g.stroke();
  road(); g.globalAlpha = 0.45; g.strokeStyle = '#8c7a5d'; g.lineWidth = cell * 1.1; g.stroke();
  // Piso de pedra da guarita
  g.globalAlpha = 1; g.fillStyle = '#48443c'; g.fillRect(17 * cell, 3 * cell, 8 * cell, 6 * cell);
  for (let cy = 3; cy < 9; cy++) for (let cx = 17; cx < 25; cx++) {
    const s = 96 + Math.floor(rnd() * 28);
    g.fillStyle = `rgb(${s + 8},${s + 3},${s - 8})`;
    g.fillRect(cx * cell + 2, cy * cell + 2, cell - 4, cell - 4);
  }
  for (let i = 0; i < 14; i++) {
    g.globalAlpha = 0.2; g.fillStyle = '#4a5c3a';
    g.beginPath(); g.arc((17 + rnd() * 8) * cell, (3 + rnd() * 6) * cell, 14 + rnd() * 30, 0, TAU); g.fill();
  }
  // Muros
  g.globalAlpha = 1; g.lineCap = 'square';
  for (const [x1, y1, x2, y2, k] of SAMPLE_WALLS) {
    g.strokeStyle = k ? '#6d4b2a' : '#2b2824'; g.lineWidth = k ? 9 : 15;
    g.beginPath(); g.moveTo(x1 * cell, y1 * cell); g.lineTo(x2 * cell, y2 * cell); g.stroke();
    if (!k) { g.strokeStyle = '#5b554b'; g.lineWidth = 5; g.stroke(); }
  }
  // Árvores
  const trees = [[2.5, 3, 1.5], [5.2, 17.2, 1.3], [27.5, 4.2, 1.6], [27.2, 13.2, 1.4], [28.4, 16.6, 1.2], [1.6, 9.4, 1.1], [12.5, 2.2, 1.2], [13.6, 17.6, 1.5], [23, 16.4, 1.1], [8.4, 5.6, 1]];
  for (const [tx, ty, tr] of trees) {
    const x = tx * cell, y = ty * cell, r = tr * cell;
    g.globalAlpha = 0.28; g.fillStyle = '#000'; g.beginPath(); g.arc(x + r * 0.16, y + r * 0.2, r, 0, TAU); g.fill();
    for (let i = 0; i < 9; i++) {
      const a = rnd() * TAU, d = rnd() * r * 0.55;
      g.globalAlpha = 0.9; g.fillStyle = ['#2c4629', '#355432', '#3f6239'][i % 3];
      g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.42 + rnd() * 0.25), 0, TAU); g.fill();
    }
    g.globalAlpha = 0.5; g.fillStyle = '#56794a';
    g.beginPath(); g.arc(x - r * 0.2, y - r * 0.25, r * 0.3, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  return c;
}

function buildSample() {
  const S = Store.S;
  const me = { id: 'jg_dalmo', name: 'Dalmo', color: PLAYER_COLORS[0] };
  if (!S.players.length) S.players.push(me);
  const sc = newScene('Cena de exemplo');
  sc.sample = true;
  const c = sc.cell;
  try {
    const cv = makeSampleBg(sc.cols, sc.rows, c);
    const a = Assets.register(Assets.encode(cv, 'bg'), cv.width, cv.height, 'bg', 'Estrada e guarita (exemplo)');
    sc.bg.asset = a.id;
  } catch (e) { sc.bgColor = '#4b5b40'; }
  sc.light = 'penumbra';
  sc.fog.dynamic = true;

  for (const [x1, y1, x2, y2, k] of SAMPLE_WALLS) sc.walls.push({ id: uid('wl'), k: k || 'wall', x1: x1 * c, y1: y1 * c, x2: x2 * c, y2: y2 * c, open: false, locked: false });
  sc.lights.push({ id: uid('lz'), name: 'Fogueira', x: 19.5 * c, y: 5.5 * c, bright: 3, dim: 6, c: '#ff9d4d', on: true });
  sc.effects.push({ id: uid('fx'), fx: 'fogo', k: 'circ', x: 19.5 * c, y: 5.5 * c, r: 0.5, w: 1, ang: 60, dir: 0, pow: 1, token: null, gm: false, by: null, seed: 7 });

  const tok = (name, cx, cy, extra) => { const t = newToken(sc, cx * c, cy * c, Object.assign({ name }, extra)); sc.tokens.push(t); return t; };
  const bars = (v1, m1, v2, m2, v3, m3, n3) => [
    { n: 'Vida', c: BAR_DEFAULTS[0].c, v: v1, m: m1, on: true },
    { n: 'SP', c: BAR_DEFAULTS[1].c, v: v2 || 0, m: m2 || 10, on: !!m2 },
    { n: n3 || 'Energia', c: BAR_DEFAULTS[2].c, v: v3 || 0, m: m3 || 10, on: !!m3 },
  ];
  const dain = tok('Dain X', 9, 12, { owner: S.players[0].id, color: '#b9892f', barVis: 'num', bars: bars(62, 80, 24, 40, 3, 5, 'Fé'), auras: [{ id: uid('au'), k: 'circ', r: 1.5, c: '#f0cf6a', a: 0.16, ang: 60, dir: 0, pub: true }] });
  const astie = tok('Astie', 8, 13, { color: '#5f8fb8', bars: bars(38, 45, 30, 30) });
  const kairo = tok('Kairo', 10, 13, { color: '#6f9a62', bars: bars(51, 60, 12, 25), light: { on: true, bright: 4, dim: 8, c: '#ffc477' } });
  const b1 = tok('Bandido', 14, 10, { color: '#9c4a45', bars: bars(14, 22), conds: ['sangue'] });
  const b2 = tok('Bandida', 15, 12, { color: '#9c4a45', bars: bars(22, 22) });
  const chefe = tok('Capitão', 22, 6, { size: 2, color: '#7a3550', bars: bars(70, 70, 20, 20), conds: ['escudo'] });
  tok('Arqueira', 26, 11, { color: '#75606e', hidden: true, bars: bars(18, 18), notes: 'Só ataca quando alguém passar da porta.' });

  sc.effects.push({ id: uid('fx'), fx: 'gelo', k: 'cone', x: 0, y: 0, r: 5, w: 1, ang: 50, dir: 335, pow: 0.9, token: astie.id, gm: false, by: null, seed: 21 });
  sc.shapes.push({ id: uid('sh'), k: 'text', x: 17.1 * c, y: 1.9 * c, txt: 'Guarita em ruínas', fs: 34, s: '#f3ead2', sw: 0, f: null, a: 1, top: false, gm: false, lock: false, by: null });
  sc.shapes.push({ id: uid('sh'), k: 'line', pts: [12.2 * c, 11.6 * c, 19.9 * c, 9.9 * c], s: '#f2c14e', sw: 5, f: null, a: 0.85, arrow: true, top: false, gm: true, lock: false, by: null });

  const order = [[dain, 18], [chefe, 15], [astie, 14], [b1, 11], [kairo, 9], [b2, 7]];
  sc.turn = { on: true, round: 2, cur: null, list: order.map(([t, init]) => ({ id: uid('tn'), token: t.id, name: t.name, init })) };
  sc.turn.cur = sc.turn.list[0].id;

  Store.addScene(sc);
  S.current = sc.id;
  Persist.scene(sc.id);
  Persist.meta();
  App.sel = [{ c: 'tokens', id: dain.id }];
}

async function start(snap) {
  Render.readTheme();
  const had = await Persist.load();
  if (!had) buildSample();
  if (!Store.scene()) { const sc = newScene('Nova cena'); Store.addScene(sc); Store.S.current = sc.id; }
  App.anim = Store.S.prefs.anim !== false;
  if (window.innerWidth < 900) App.sideOpen = false;

  Store.on('live', op => { Vision.onOp(op); Render.request(); });
  Store.on('commit', e => { Persist.scene(e.sceneId); UI.refresh(); Render.request(); });
  Store.on('sel', () => { UI.refresh(); Render.request(); });
  Store.on('tool', () => UI.refresh());
  Store.on('viewer', () => UI.refresh());
  Store.on('meta', () => UI.refresh());
  Store.on('scene', () => { UI.refresh(); Render.request(); });
  Persist.onStatus(s => UI.setSave(s));
  UI.setSave(Persist.status());

  // Estado de tela de antes de uma atualização da página (quando o visualizador oferece).
  if (snap && typeof snap === 'object') {
    if (snap.scene && Store.S.scenes[snap.scene]) Store.S.current = snap.scene;
    if (snap.viewer && (snap.viewer === 'gm' || playerById(snap.viewer))) App.viewer = snap.viewer;
    if (snap.tab) App.tab = snap.tab;
  }

  const stage = $('#stage');
  Render.resize();
  Render.fit();
  if (snap && snap.view && isFinite(snap.view.z)) Object.assign(App.view, snap.view);
  UI.renderAll();
  UI.initCaps();
  let first = true;
  if (window.ResizeObserver) new ResizeObserver(() => { Render.resize(); if (first) { first = false; Render.fit(); UI.status(); } }).observe(stage);
  else window.addEventListener('resize', Render.resize);

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', Render.readTheme);
  new MutationObserver(Render.readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { Render.request(); UI.refresh(); });

  const flush = () => { try { Vision.flushExplored(); Persist.flush(); } catch (e) { /* nada a fazer */ } };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
}

(function boot() {
  // Acesso para testes automáticos (só com ?debug no endereço).
  if (/[?&]debug\b/.test(location.search)) window.__urgm = { Store, App, Tools, Vision, Render, UI, Act, FX, Persist, Assets, can, tokShown, setSel };
  const hot = window.claude && window.claude.hot;
  try {
    if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => ({ view: Object.assign({}, App.view), viewer: App.viewer, tab: App.tab, scene: Store.S.current }));
  } catch (e) { /* sem esse recurso, segue normal */ }
  let started = false;
  const go = snap => {
    if (started) return;
    started = true;
    start(snap || {}).catch(err => {
      // Algo impediu a mesa de abrir: mostra o motivo em vez de uma tela vazia.
      console.error(err);
      const box = document.createElement('div');
      box.className = 'fatal';
      box.textContent = 'Não consegui abrir a mesa: ' + (err && err.message ? err.message : 'erro desconhecido') + '. Recarregue a página; se continuar, me mande esta mensagem.';
      $('#stage').append(box);
    });
  };
  if (hot && typeof hot.ready === 'function') {
    try { hot.ready(go); } catch (e) { /* cai no início normal abaixo */ }
    setTimeout(() => go({}), 1500);
  } else go((hot && hot.data) || {});
})();
