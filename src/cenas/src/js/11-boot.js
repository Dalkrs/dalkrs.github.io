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

// Monta a cena de exemplo. Na primeira visita (fora de uma mesa) ela é a cena inicial; depois, o mestre pode pedir
// outra pelo menu de cenas. Numa mesa, o fundo dela sobe para o banco como qualquer imagem — por isso é uma promessa.
async function buildSample() {
  const S = Store.S;
  // fora de uma mesa, o primeiro jogador de exemplo; numa mesa, os jogadores são os participantes dela
  if (!S.players.length && !Nuvem.on()) S.players.push({ id: 'jg_dalmo', name: 'Dalmo', color: PLAYER_COLORS[0] });
  const taken = S.order.map(id => S.scenes[id].name);
  let name = 'Cena de exemplo';
  for (let k = 2; taken.includes(name); k++) name = `Cena de exemplo ${k}`;
  const sc = newScene(name);
  sc.sample = true;
  const c = sc.cell;
  try {
    const cv = makeSampleBg(sc.cols, sc.rows, c);
    const a = await Assets.fromCanvas(cv, 'bg', 'Estrada e guarita (exemplo)');
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
  ].map(cleanBar);
  // Dain X mostra os dois estilos: três barras e um recurso em pontos.
  const dainBars = bars(62, 80, 24, 40, 20, 100, 'Fé').concat(cleanBar({ n: 'Poder divino', c: '#b07ad9', v: 3, m: 5, k: 'pts', on: true }));
  const dain = tok('Dain X', 9, 12, { owner: S.players.length ? S.players[0].id : null, color: '#b9892f', barVis: 'num', bars: dainBars, auras: [{ id: uid('au'), k: 'circ', r: 1.5, c: '#f0cf6a', a: 0.16, ang: 60, dir: 0, pub: true }] });
  const astie = tok('Astie', 8, 13, { color: '#5f8fb8', bars: bars(38, 45, 30, 30) });
  const kairo = tok('Kairo', 10, 13, { color: '#6f9a62', bars: bars(51, 60, 12, 25), light: { on: true, bright: 4, dim: 8, c: '#ffc477' } });
  // Bandido: sangrando e com um contador de queimadura; Capitão: proteção que dura três rodadas.
  const b1 = tok('Bandido', 14, 10, { color: '#9c4a45', bars: bars(14, 22), conds: ['sangue', 'fogo'], cinfo: { fogo: { n: 2 } } });
  const b2 = tok('Bandida', 15, 12, { color: '#9c4a45', bars: bars(22, 22) });
  const chefe = tok('Capitão', 22, 6, { size: 2, color: '#7a3550', bars: bars(70, 70, 20, 20), conds: ['escudo'], cinfo: { escudo: { d: 3, d0: 3 } } });
  tok('Arqueira', 26, 11, { color: '#75606e', hidden: true, bars: bars(18, 18), notes: 'Só ataca quando alguém passar da porta.' });

  sc.effects.push({ id: uid('fx'), fx: 'gelo', k: 'cone', x: 0, y: 0, r: 5, w: 1, ang: 50, dir: 335, pow: 0.9, token: astie.id, gm: false, by: null, seed: 21 });
  sc.shapes.push({ id: uid('sh'), k: 'text', x: 17.1 * c, y: 1.9 * c, txt: 'Guarita em ruínas', fs: 34, s: '#f3ead2', sw: 0, f: null, a: 1, top: false, gm: false, lock: false, by: null });
  sc.shapes.push({ id: uid('sh'), k: 'line', pts: [12.2 * c, 11.6 * c, 19.9 * c, 9.9 * c], s: '#f2c14e', sw: 5, f: null, a: 0.85, arrow: true, top: false, gm: true, lock: false, by: null });

  const order = [[dain, 18], [chefe, 15], [astie, 14], [b1, 11], [kairo, 9], [b2, 7]];
  sc.turn = { on: true, round: 2, cur: null, list: order.map(([t, init]) => ({ id: uid('tn'), token: t.id, name: t.name, init })) };
  sc.turn.cur = sc.turn.list[0].id;
  normalizeScene(sc);                     // a cena de exemplo nasce com todos os campos do modelo atual

  Store.addScene(sc);
  S.current = sc.id;
  Persist.scene(sc.id);
  Persist.meta();
  App.sel = [{ c: 'tokens', id: dain.id }];
  return sc;
}

// Números de dano e cura: compara as barras de antes e de depois de cada alteração feita na mesa.
function barFloats(op, inv) {
  if (!inv || op.t !== 'upd' || op.c !== 'tokens' || !op.p.bars || !inv.p || !inv.p.bars) return;
  const t = Store.get('tokens', op.id), was = inv.p.bars, now = op.p.bars;
  if (!t || was.length !== now.length) return;
  now.forEach((b, i) => {
    const a = was[i];
    if (!a.on || !b.on || a.n !== b.n || a.m !== b.m) return;                    // só conta quando foi o valor que mudou
    if (barMode(t, b) !== 'num') return;                                         // quem não vê os números não vê o quanto mudou
    if (barX(a) !== barX(b)) floatDelta(t, Math.round((barX(b) - barX(a)) * 10) / 10, 'Sobrevida', SOBRE_COR);
    if (a.v !== b.v) floatDelta(t, Math.round((b.v - a.v) * 10) / 10, b.n);
  });
}

/* A casca do site abre as Cenas do mestre também em segundo plano (ele está em outra aba): a página roda, mas não
   tem tamanho. O que só faz sentido à vista — o passeio de primeiro uso, a oferta de trazer cenas, fechar o painel
   numa tela estreita — espera o mestre vir para cá. */
const naTela = () => !(window.innerWidth === 0 || window.innerHeight === 0);
function aoAparecer(fn) {
  if (naTela()) { fn(); return; }
  const ver = () => { if (!naTela()) return; window.removeEventListener('resize', ver); fn(); };
  window.addEventListener('resize', ver);
}

async function start(snap) {
  Render.readTheme();
  await Nuvem.iniciar();                 // dentro do site, com uma mesa aberta, as cenas são as da mesa
  const had = await Persist.load();
  if (!had && !Nuvem.on()) await buildSample();
  // (numa mesa que ainda não tem cenas, o mestre começa com uma cena vazia; a de exemplo fica no menu de cenas)
  if (!Store.scene()) {
    const criar = () => { const sc = newScene('Nova cena'); Store.addScene(sc); Store.S.current = sc.id; Persist.scene(sc.id); Persist.meta(); return sc.id; };
    /* Numa mesa com campanhas, a que está em vista pode ainda não ter cena (as da mesa são de outras campanhas). Com a
       página aberta em segundo plano, nada é criado sem o mestre ver: ela fica numa cena qualquer da mesa e, quando
       ele vem para cá, abre uma cena da campanha — ou cria a primeira dela. */
    const emprestada = Nuvem.mestre() && !naTela() ? Store.S.order[0] : null;
    if (emprestada) {
      Store.S.current = emprestada;
      aoAparecer(() => { if (Nuvem.naVista(Store.S.current)) return; const v = Store.S.order.find(id => Nuvem.naVista(id)); UI.switchScene(v || criar()); });
    } else criar();
  }
  App.anim = Store.S.prefs.anim !== false;
  App.showVision = !!Store.S.prefs.showVision;
  const nasceuEscondida = !naTela();
  if (!nasceuEscondida && window.innerWidth < 900) App.sideOpen = false;

  Store.on('live', (op, inv) => { Vision.onOp(op); barFloats(op, inv); Render.request(); });
  Store.on('commit', e => { Persist.scene(e.sceneId); UI.refresh(); Render.request(); });
  Store.on('sel', () => { Vision.selChanged(); UI.refresh(); Render.request(); });
  Store.on('tool', () => UI.refresh());
  Store.on('viewer', () => UI.refresh());
  Store.on('meta', () => UI.refresh());
  Store.on('scene', () => { UI.refresh(); Render.request(); });
  Persist.onStatus(s => UI.setSave(s));
  UI.setSave(Persist.status());

  // Estado de tela de antes de uma atualização da página (quando o visualizador oferece).
  if (snap && typeof snap === 'object') {
    if (snap.scene && Store.S.scenes[snap.scene]) Store.S.current = snap.scene;
    if (snap.viewer && (snap.viewer === 'gm' || playerById(snap.viewer)) && !Nuvem.jogador()) App.viewer = snap.viewer;
    if (snap.tab) App.tab = snap.tab;
    if (snap.tour) Store.S.prefs.tour = 1;      // já viu o tutorial antes desta atualização da página
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

  const flush = () => { try { Vision.flushExplored(); Fichas.flush(); Persist.flush(); } catch (e) { /* nada a fazer */ } };
  window.addEventListener('pagehide', flush);
  if (window.TC && TC.ponte && TC.ponte.aoFechar) TC.ponte.aoFechar(flush);       // dentro do site: a casca avisa antes de fechar
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  // Tutorial de primeiro uso: abre sozinho uma vez, quando quem entra é o mestre.
  // (Nos testes automáticos, com ?debug, só abre se o endereço também trouxer ?tour.)
  // Aberta pela casca do site (que já mostra a marca na barra de cima): a marca daqui some.
  if (/[?&]casca\b/.test(location.search)) document.documentElement.classList.add('na-casca');
  // Dentro do site, com uma mesa aberta: as rolagens daqui (iniciativa) também vão para a mesa ao vivo.
  // Token que os jogadores não veem, ou de nome escondido, sai marcado como oculto: a rolagem dele fica só com o mestre.
  Fichas.start(() => { try { UI.renderAll(); } catch (e) { /* ainda abrindo */ } });
  // A lista das cenas, para os outros sistemas do site (o Acampamento e o Mapa-múndi abrem uma cena pelo nome).
  // (numa mesa, eles leem a lista direto dos documentos da mesa; esta aqui é a das cenas deste navegador)
  const listar = () => { if (Nuvem.on()) return; try { localStorage.setItem('tinycats:cenas:lista', JSON.stringify(Store.S.order.filter(id => Store.S.scenes[id]).map(id => ({ id, nome: Store.S.scenes[id].name })))); } catch (e) { /* sem armazenamento: os atalhos só não mostram a lista */ } };
  Store.on('meta', listar);
  Store.on('commit', e => { if (e.ops.some(op => op.t === 'scn' && op.p && 'name' in op.p)) listar(); });
  listar();
  // Outro sistema pediu uma cena: { cena: id } abre a que existe; { criar: { id, nome } } cria (uma vez) e abre.
  if (window.TC && window.TC.ponte && window.TC.ponte.aoIr) window.TC.ponte.aoIr(alvo => {
    if (!alvo || !isGM()) return;
    const pedido = alvo.criar && typeof alvo.criar.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(alvo.criar.id) ? alvo.criar : null;
    const id = pedido ? pedido.id : alvo.cena;
    if (pedido && !Store.S.scenes[id]) {
      const sc = newScene(String(pedido.nome || 'Acampamento').slice(0, 60));
      sc.id = id; sc.tone = 'noite'; sc.light = 'penumbra';
      Store.addScene(sc); Persist.scene(sc.id);
      UI.toast(`Cena "${sc.name}" criada. Monte o mapa do acampamento aqui.`);
    }
    if (typeof id === 'string' && Store.S.scenes[id] && !Nuvem.naVista(id)) { UI.toast('Essa cena é de outra campanha. Para abri-la, escolha a campanha dela no menu da mesa.'); return; }
    if (typeof id === 'string' && Store.S.scenes[id] && Store.S.current !== id) UI.switchScene(id);
  });
  if (window.TC && window.TC.ponte && !Ext.roll) Ext.roll = r => {
    if (!window.TC.ponte.estado.mesa) return;
    const t = r.tokenId ? Store.get('tokens', r.tokenId) : null;
    // char: a ficha ligada ao token (a mesa ao vivo mostra a imagem do personagem ao lado de quem rolou)
    // (numa disputa, basta um dos dois lados estar oculto — quem publica já marca: r.oculto)
    window.TC.ponte.publicar('cena', Object.assign({}, r, { oculto: !!r.oculto || !!(t && (t.hidden || t.showName === false)), char: (t && t.char) || null }));
  };
  // A iniciativa que alguém rolou pela telinha de dados da mesa ao vivo: o mestre pode anotá-la na ordem de turnos.
  // …e a defesa que um jogador rolou a pedido entra na janela do ataque que o mestre tem aberta.
  if (window.TC && window.TC.ponte && window.TC.ponte.registro) window.TC.ponte.registro.aoChegar(l => { try { UI.iniFromTable(l); } catch (e) { console.error(e); } try { Luta.daMesa(l); } catch (e) { console.error(e); } });
  const dbg = /[?&]debug\b/.test(location.search);
  // (o tutorial que abre sozinho espera o menu ou a janela da casca fechar: não aparece no meio do que o mestre faz)
  const abrirTour = () => { if (UI.modalOpen() || Tour.seen() || Tour.active()) return; if (cascaOcupada()) { setTimeout(abrirTour, 1200); return; } Tour.start(); };
  if (isGM() && !Tour.seen() && (!dbg || /[?&]tour\b/.test(location.search))) aoAparecer(() => setTimeout(abrirTour, 700));
  // O mestre numa mesa: se este navegador guarda cenas de antes, a mesa oferece trazê-las (a janela, uma vez só,
  // quando a mesa ainda não tem cenas; depois disso, fica o lembrete no painel e o item no menu ⋯).
  if (Nuvem.mestre()) setTimeout(() => { if (!had) aoAparecer(() => UI.offerLocal()); else Nuvem.cenasDoNavegador().then(() => UI.refresh()); }, 900);
  // Aberta em segundo plano: quando o mestre vier para cá, a página se ajeita (e passa a transmitir a cena no ar).
  if (nasceuEscondida) aoAparecer(() => {
    if (window.innerWidth < 900) App.sideOpen = false;
    try { Render.resize(); UI.renderAll(); } catch (e) { console.error(e); }
    Nuvem.apareceu();
  });
}

(function boot() {
  // Acesso para testes automáticos (só com ?debug no endereço). __tc é o nome de agora; __urgm, o que os testes antigos usam.
  if (/[?&]debug\b/.test(location.search)) window.__tc = window.__urgm = { Combate, Luta, Fichas, Store, App, Tools, Vision, Render, UI, Act, FX, Persist, Assets, Tour, Walls, Ext, Nuvem, Proj, can, tokShown, setSel, barsShown, tokensIn, auraShape, fxVisible, doorSpots, rollDie, applyLabel, newToken, newScene, barAfter, barX, cleanBar, normalizeScene, cleanFixas, cleanTer, isTer, TERRENOS, selOf };
  const hot = window.claude && window.claude.hot;
  try {
    if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => ({ view: Object.assign({}, App.view), viewer: App.viewer, tab: App.tab, scene: Store.S.current, tour: Tour.seen() }));
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
