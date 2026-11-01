/* ---------------------------------------------------------------
   10g9. O CASTELO E O CEMITÉRIO (lote 49) — dois lugares de fora para "Gerar um lugar…".
   · o castelo por fora: as muralhas com as torres dos cantos, o portão com a grade levadiça (e, com fosso, a ponte
     levadiça que abre e fecha), o pátio, a torre de menagem (com a escada que desce ao calabouço: uma Entrada oculta), o
     estábulo, a capela e o quartel com a forja. Inteiro, sitiado (o acampamento de fora, as catapultas, o aríete, a
     muralha rompida) ou em ruínas (as muralhas caídas, o mato, o entulho, o fogo antigo);
   · o cemitério e a igreja: o muro baixo com o portão, o caminho, os túmulos em fileiras, os mausoléus (com o portão de
     ferro e o sarcófago), a igreja com os bancos, o altar e a luz do vitral, a casa do coveiro. A entrada da cripta
     (oculta: atrás do altar, ou num mausoléu) gera as catacumbas embaixo.
   O plano é como o dos outros lugares (as paredes, os objetos, as luzes, o relevo e o que se pinta no fundo); as salas
   de dentro vão em p.salas, para o "Povoar" saber onde é dentro.
   --------------------------------------------------------------- */
const LugaresFora = (() => {
  const sub = (seed, k) => (((Math.imul(seed ^ 0x5bd1e995, 0x01000193 + k * 0x9e3779b1) >>> 0) ^ (k * 0x85ebca6b)) >>> 0) || (k + 1);
  const res = (W, H) => Math.max(16, Math.min(64, Math.floor(Math.sqrt(9e6 / (W * H)))));
  const PAL = {
    campo: { base: '#5d7a3e', manchas: ['#557236', '#66843f', '#4f6a33', '#6f8c48', '#4a6230'], terra: ['#7a6446', '#8a7352', '#6a563a'], pedra: ['#8d8a82', '#9b978e', '#7d7a73'], junta: '#5a5852' },
    seco: { base: '#8a7d4e', manchas: ['#807246', '#958857', '#776a41', '#a09260', '#6d6140'], terra: ['#8a7050', '#9a805e', '#7a6244'], pedra: ['#9a958a', '#a8a397', '#8a857a'], junta: '#615d55' },
    neve: { base: '#d8dde4', manchas: ['#cfd5dd', '#e3e7ec', '#c6ccd5', '#eceff3', '#bec5cf'], terra: ['#9a8d7a', '#aa9d8a', '#8a7d6a'], pedra: ['#8d8f94', '#9a9ca1', '#7d7f84'], junta: '#5a5c60' },
  };
  const palDe = (estilo, estacao) => (estacao === 'inverno' ? PAL.neve : estilo === 'desertico' ? PAL.seco : PAL.campo);

  /* ---------------- o plano: as peças ---------------- */
  function novoPlano(lugar, W, H, seed, extra) {
    const r = mulberry(seed);
    const p = Object.assign({ v: 1, lugar, W, H, seed, paredes: [], objetos: [], luzes: [], relevo: [], formas: [], zonas: [], pintados: [], salas: [], entradas: [] }, extra || {});
    const ent = (a, b) => a + r() * (b - a), ri = (a, b) => a + Math.floor(r() * (b - a + 1)), pick = a => a[Math.floor(r() * a.length) % a.length];
    const oc = new Uint8Array(W * H);
    const livre = (x, y, s) => { s = s || 1; for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const a = Math.floor(x) + i, b = Math.floor(y) + j; if (a < 0 || b < 0 || a >= W || b >= H || oc[b * W + a]) return false; } return true; };
    const ocupa = (x, y, w, h) => { for (let j = Math.floor(y); j < Math.ceil(y + h); j++) for (let i = Math.floor(x); i < Math.ceil(x + w); i++) if (i >= 0 && j >= 0 && i < W && j < H) oc[j * W + i] = 1; };
    const poe = (id, x, y, s, rot, o) => { s = s || 1; if (!livre(x, y, s)) return false; ocupa(x, y, s, s); p.objetos.push(Object.assign({ id, x: Math.floor(x), y: Math.floor(y), s }, rot ? { rot } : null, o || null)); return true; };
    const parede = (x1, y1, x2, y2, k, o) => p.paredes.push(Object.assign({ x1, y1, x2, y2, k: k || 'wall' }, o || null));
    const pinta = (k, o) => p.pintados.push(Object.assign({ k }, o));
    return { p, r, ent, ri, pick, livre, ocupa, poe, parede, pinta, oc };
  }
  /* Uma construção: o piso, as quatro paredes (com a porta num lado, no meio — ou em pos) e o desenho da parede no fundo.
     ruina: a chance de cada trecho de parede ter caído (vira entulho). → a sala { x, y, w, h, papel } */
  function construcao(K, x, y, w, h, porta, piso, papel, o) {
    o = o || {};
    const { p, r } = K;
    K.pinta('piso', { x, y, w, h, tipo: piso || 'laje' });
    const lados = { n: [x, y, x + w, y], s: [x, y + h, x + w, y + h], o: [x, y, x, y + h], l: [x + w, y, x + w, y + h] };
    for (const lado of ['n', 's', 'o', 'l']) {
      const [ax, ay, bx, by] = lados[lado], horiz = ay === by, L = horiz ? bx - ax : by - ay;
      const pp = porta && porta.lado === lado ? (porta.pos != null ? porta.pos : Math.floor(L / 2) - (porta.larg === 2 ? 1 : 0)) : -1, pl = porta && porta.larg ? porta.larg : 1;
      // em trechos de um quadrado (as ruínas derrubam trechos; a porta é um deles)
      for (let k = 0; k < L; k++) {
        const s = horiz ? [ax + k, ay, ax + k + 1, ay] : [ax, ay + k, ax, ay + k + 1];
        if (k >= pp && k < pp + pl && pp >= 0) { if (porta.k !== 'nada') { if (porta.k === 'portao') { if (k === pp) K.p.objetos.push(horiz ? { id: 'portao', x: ax + pp, y: ay - 0.5, s: 1 } : { id: 'portao', x: ax - 0.5, y: ay + pp, s: 1, rot: 90 }); } else K.parede(s[0], s[1], s[2], s[3], 'door'); } continue; }
        if (o.ruina && r() < o.ruina) { K.pinta('entulho', { x: (s[0] + s[2]) / 2, y: (s[1] + s[3]) / 2, r: 0.7 }); continue; }
        K.parede(s[0], s[1], s[2], s[3], o.k || 'wall');
        K.pinta('paredeFina', { x1: s[0], y1: s[1], x2: s[2], y2: s[3] });
      }
    }
    K.ocupa(x, y, w, h);
    const sala = { x, y, w, h, papel: papel || 'sala' };
    p.salas.push(sala);
    return sala;
  }
  // os objetos de dentro: livres só dentro da sala (a sala inteira foi ocupada; aqui ela se libera aos poucos)
  function dentro(K, q, fn) {
    for (let j = q.y; j < q.y + q.h; j++) for (let i = q.x; i < q.x + q.w; i++) K.oc[j * K.p.W + i] = 0;
    fn();
    // a frente da porta fica como estava (livre); o resto que sobrou fica livre para o Povoar
  }

  /* ---------------- o castelo ---------------- */
  const TAM_C = { pequeno: { n: 'Pequeno', W: 40, H: 36 }, medio: { n: 'Médio', W: 50, H: 44 }, grande: { n: 'Grande', W: 62, H: 52 } };
  const ESTADOS_C = [['inteiro', 'Inteiro'], ['sitiado', 'Sitiado'], ['ruinas', 'Em ruínas']];
  function gerarCastelo(o) {
    o = o || {};
    const tam = TAM_C[o.tamanho] ? o.tamanho : 'medio', T = TAM_C[tam], estado = ESTADOS_C.some(x => x[0] === o.estado) ? o.estado : 'inteiro', fosso = !!o.fosso;
    const seed = (Math.round(Number(o.seed)) >>> 0) || 1, W = T.W, H = T.H + (estado === 'sitiado' ? 10 : 0);
    const K = novoPlano('castelo', W, H, seed, { tamanho: tam, estado, fosso, estilo: o.estilo || 'comum', estacao: o.estacao || 'verao' });
    const { p, r } = K, ru = estado === 'ruinas' ? 0.35 : 0;
    const mg = fosso ? 6 : 4, x0 = mg, y0 = mg, x1 = W - mg, y1 = mg + T.H - 2 * mg, gx = Math.round((x0 + x1) / 2);
    // o fosso: um anel de água em volta da muralha (um quadrado para fora até três)
    if (fosso) {
      const a = 1, b = 3;
      const anel = [[x0 - b, y0 - b, x1 - x0 + 2 * b, b - a], [x0 - b, y1 + a, x1 - x0 + 2 * b, b - a], [x0 - b, y0 - a, b - a, y1 - y0 + 2 * a], [x1 + a, y0 - a, b - a, y1 - y0 + 2 * a]];
      for (const [x, y, w, h] of anel) { p.relevo.push({ t: 'agua', alt: -1.5, k: 'rect', x, y, w, h }); K.pinta('agua', { x, y, w, h }); K.ocupa(x, y, w, h); }
    }
    // o caminho até o portão
    K.pinta('caminho', { pts: [[gx, H - 0.5], [gx, y1 + 0.5]], w: 2.2, tipo: 'terra' });
    // o pátio
    K.pinta('piso', { x: x0, y: y0, w: x1 - x0, h: y1 - y0, tipo: 'calcada' });
    // a muralha: em trechos de um quadrado (o portão no meio do lado de baixo; as ruínas e o cerco derrubam trechos)
    const rompe = estado === 'sitiado' ? new Set([Math.round(x0 + (x1 - x0) * 0.25), Math.round(x0 + (x1 - x0) * 0.75)]) : new Set();
    const muralha = (ax, ay, bx, by) => {
      const horiz = ay === by, L = horiz ? bx - ax : by - ay;
      for (let k = 0; k < L; k++) {
        const s = horiz ? [ax + k, ay, ax + k + 1, ay] : [ax, ay + k, ax, ay + k + 1];
        if (horiz && ay === y1 && ax + k >= gx - 1 && ax + k < gx + 1) continue;            // (o portão)
        const caiu = (ru && r() < ru) || (horiz && ay === y1 && (rompe.has(ax + k) || rompe.has(ax + k - 1)));
        if (caiu) { K.pinta('entulho', { x: (s[0] + s[2]) / 2, y: (s[1] + s[3]) / 2, r: 0.9 }); continue; }
        K.parede(s[0], s[1], s[2], s[3]); K.pinta('muralha', { x1: s[0], y1: s[1], x2: s[2], y2: s[3] });
      }
    };
    muralha(x0, y0, x1, y0); muralha(x0, y1, x1, y1); muralha(x0, y0, x0, y1); muralha(x1, y0, x1, y1);
    // as torres dos cantos (e as duas do portão): o círculo de pedra, cercado de parede
    const torre = (cx, cy, rr) => {
      K.pinta('torre', { x: cx, y: cy, r: rr });
      const n = 8;
      for (let i = 0; i < n; i++) { if (ru && r() < ru * 0.6) continue; const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; K.parede(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cx + Math.cos(b) * rr, cy + Math.sin(b) * rr); }
      K.ocupa(cx - rr, cy - rr, rr * 2, rr * 2);
    };
    for (const [cx, cy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) torre(cx, cy, 2.2);
    torre(gx - 2.6, y1, 1.5); torre(gx + 2.6, y1, 1.5);
    // o portão: a grade levadiça; com fosso, a ponte levadiça na frente
    if (estado !== 'ruinas') p.objetos.push({ id: 'grade', x: gx - 1, y: y1 - 1, s: 2 });
    if (fosso) p.objetos.push({ id: 'ponteLevadica', x: gx - 1, y: y1 + 1, s: 2 });
    K.ocupa(gx - 1, y1 - 1, 2, 2);
    // a torre de menagem: no fundo, no meio; a escada do calabouço (a Entrada oculta) num canto dela
    const iw = x1 - x0, ih = y1 - y0;
    const kw = Math.max(8, Math.min(14, Math.round(iw * 0.32))), kh = Math.max(7, Math.min(10, Math.round(ih * 0.3))), kx = Math.round(gx - kw / 2), ky = y0 + 3;
    const keep = construcao(K, kx, ky, kw, kh, { lado: 's', larg: 2 }, 'laje', 'menagem', { ruina: ru });
    dentro(K, keep, () => {
      K.pinta('tapete', { x: gx - 0.6, y: ky + 1, w: 1.2, h: kh - 1 });
      K.poe('cadeira', gx, ky + 1, 1, 0); K.poe('braseiro', gx - 2, ky + 1); K.poe('braseiro', gx + 2, ky + 1);
      if (estado !== 'ruinas') { K.poe('mesaGuerra', kx + 1, ky + kh - 3, 2); K.poe('estandarte', kx + 1, ky); K.poe('estandarte', kx + kw - 2, ky); K.poe('lareira', kx + kw - 3, ky + Math.floor(kh / 2), 2, 270); }
      else { K.pinta('entulho', { x: kx + kw / 2, y: ky + kh / 2, r: 1.4 }); K.pinta('queimado', { x: kx + 2, y: ky + 2, r: 1.5 }); }
      p.entradas.push({ x: kx + kw - 2, y: ky + 1, n: 'A escada do calabouço', gera: { t: 'masmorra', m: 'calabouco', n: 1, tam: 'pequeno', e: o.estilo || 'comum', s: (sub(seed, 41) % 2147483000) + 1 } });
      K.ocupa(kx + kw - 2, ky + 1, 1, 1);
    });
    // o estábulo (à esquerda), a capela (à direita) e o quartel com a forja (embaixo, à direita)
    const ew = Math.min(8, Math.max(6, Math.round(iw * 0.18))), eh = 5;
    const est = construcao(K, x0 + 2, y0 + Math.round(ih * 0.48), ew, eh, { lado: 'l', larg: 2 }, 'madeira', 'estabulo', { ruina: ru });
    dentro(K, est, () => { K.poe('feno', est.x + 1, est.y + 1); K.poe('feno', est.x + 1, est.y + 3); K.poe('cocho', est.x + 3, est.y + 1, 2); K.poe('barril', est.x + ew - 2, est.y + eh - 1); K.poe('carroca', est.x + 3, est.y + 3, 2); });
    const cap = construcao(K, x1 - ew - 2, y0 + Math.round(ih * 0.4), ew, 6, { lado: 'o' }, 'laje', 'capela', { ruina: ru });
    dentro(K, cap, () => { K.poe('altar', cap.x + cap.w - 1, cap.y + 2, 1, 90); K.poe('vela', cap.x + cap.w - 1, cap.y + 1); K.poe('vela', cap.x + cap.w - 1, cap.y + 4); K.poe('bancoIgreja', cap.x + 2, cap.y + 1, 2, 90); K.poe('bancoIgreja', cap.x + 2, cap.y + 3, 2, 90); if (estado !== 'ruinas') K.poe('vitral', cap.x + 4, cap.y + 2, 2); });
    const qw = Math.min(9, Math.max(6, Math.round(iw * 0.2)));
    const qt = construcao(K, x1 - qw - 2, y1 - 7, qw, 5, { lado: 'n' }, 'madeira', 'quartel', { ruina: ru });
    dentro(K, qt, () => { K.poe('bigorna', qt.x + 1, qt.y + 1); K.poe('fole', qt.x + 2, qt.y + 1); K.poe('carvao', qt.x + 1, qt.y + 3); K.poe('armas', qt.x + qw - 2, qt.y + 1); K.poe('cama', qt.x + qw - 3, qt.y + 3, 2); K.poe('tina', qt.x + 3, qt.y + 3); });
    // o pátio: o poço, os barris, as tochas do portão e da menagem
    K.poe('poco', gx + 4, Math.round(y0 + ih * 0.62));
    for (let k = 0; k < 6; k++) K.poe(K.pick(['barril', 'caixote', 'caixote', 'feno']), K.ri(x0 + 2, x1 - 3), K.ri(Math.round(y0 + ih * 0.55), y1 - 2));
    if (estado !== 'ruinas') { for (const x of [gx - 2, gx + 1]) K.poe('tocha', x, y1 - 2); K.poe('tocha', gx - 2, ky + kh + 1); K.poe('tocha', gx + 1, ky + kh + 1); }
    // em ruínas: o mato, as árvores, o fogo antigo
    if (estado === 'ruinas') {
      for (let k = 0; k < 14; k++) K.poe(K.pick(['arbusto', 'arbusto', 'flores', 'toco', 'pedra']), K.ri(x0 + 1, x1 - 2), K.ri(y0 + 1, y1 - 2));
      for (let k = 0; k < 3; k++) K.poe('arvore', K.ri(x0 + 2, x1 - 4), K.ri(y0 + 2, y1 - 4), 2);
      for (let k = 0; k < 4; k++) K.pinta('queimado', { x: K.ent(x0 + 2, x1 - 2), y: K.ent(y0 + 2, y1 - 2), r: K.ent(1, 2.2) });
      for (let k = 0; k < 6; k++) K.pinta('entulho', { x: K.ent(x0 + 1, x1 - 1), y: K.ent(y0 + 1, y1 - 1), r: K.ent(0.6, 1.4) });
    }
    // sitiado: o acampamento de fora (embaixo), as catapultas, o aríete no portão, o fogo dentro
    if (estado === 'sitiado') {
      const cy0 = y1 + (fosso ? 4 : 2), cy1 = H - 1;
      for (let k = 0; k < 6; k++) K.poe('barraca', K.ri(2, W - 4), K.ri(cy0 + 2, cy1 - 2), 2);
      for (let k = 0; k < 3; k++) K.poe('fogueira', K.ri(2, W - 3), K.ri(cy0 + 1, cy1 - 1));
      K.poe('catapulta', Math.round(x0 + iw * 0.2), cy0 + 1, 2); K.poe('catapulta', Math.round(x0 + iw * 0.7), cy0 + 1, 2);
      K.poe('ariete', gx - 1, cy0, 2);
      for (let k = 0; k < 2; k++) K.poe('carroca', K.ri(2, W - 4), K.ri(cy0 + 2, cy1 - 2), 2);
      K.poe('estandarte', K.ri(3, W - 4), cy0 + 2);
      for (let k = 0; k < 3; k++) K.pinta('queimado', { x: K.ent(x0 + 2, x1 - 2), y: K.ent(y0 + 2, y1 - 2), r: K.ent(0.8, 1.6) });
    }
    // fora da muralha: as árvores e as pedras (onde couber)
    for (let k = 0; k < 10; k++) { const x = K.ri(0, W - 2), y = K.ri(0, H - 2); if (x > x0 - 4 && x < x1 + 3 && y > y0 - 4 && y < y1 + 3) continue; K.poe(r() < 0.5 ? 'arvore' : 'arbusto', x, y, r() < 0.5 ? 2 : 1); }
    p.chegada = [gx, H - 1];
    return p;
  }
  const nomeCastelo = p => (p.estado === 'ruinas' ? 'Castelo em ruínas' : p.estado === 'sitiado' ? 'Castelo sitiado' : 'Castelo');
  function resumoCastelo(p) {
    const q = [(ESTADOS_C.find(x => x[0] === p.estado) || ESTADOS_C[0])[1] + (p.fosso ? ', com fosso' : ''), p.W + ' × ' + p.H + ' quadrados', 'a menagem, o estábulo, a capela e o quartel', 'a escada do calabouço (oculta)'];
    if (p.estado === 'sitiado') q.push('o acampamento de fora, as catapultas e o aríete');
    return q.join(' · ') + '.';
  }

  /* ---------------- o cemitério e a igreja ---------------- */
  const TAM_M = { pequeno: { n: 'Pequeno', W: 34, H: 30 }, medio: { n: 'Médio', W: 44, H: 38 }, grande: { n: 'Grande', W: 56, H: 46 } };
  function gerarCemiterio(o) {
    o = o || {};
    const tam = TAM_M[o.tamanho] ? o.tamanho : 'medio', T = TAM_M[tam], igreja = o.igreja !== false, nm = Math.max(0, Math.min(3, Math.round(Number(o.mausoleus) || 2)));
    const cat = Masmorra.CATACUMBAS.includes(o.cat) ? o.cat : 'ossuario';
    const seed = (Math.round(Number(o.seed)) >>> 0) || 1, W = T.W, H = T.H;
    const K = novoPlano('cemiterio', W, H, seed, { tamanho: tam, igreja, mausoleus: nm, cat, estilo: o.estilo || 'comum', estacao: o.estacao || 'verao' });
    const { p, r } = K;
    const x0 = 3, y0 = 3, x1 = W - 3, y1 = H - 3, gx = Math.round(W / 2);
    const geraCat = k => ({ t: 'masmorra', m: cat, n: 1, tam: 'medio', e: o.estilo || 'comum', s: (sub(seed, 60 + k) % 2147483000) + 1 });
    // o muro baixo (mureta: barra o passo, deixa ver) com o portão de ferro no meio de baixo
    const muro = (ax, ay, bx, by) => { const horiz = ay === by, L = horiz ? bx - ax : by - ay; for (let k = 0; k < L; k++) { const s = horiz ? [ax + k, ay, ax + k + 1, ay] : [ax, ay + k, ax, ay + k + 1]; if (horiz && ay === y1 && ax + k >= gx - 1 && ax + k < gx + 1) continue; K.parede(s[0], s[1], s[2], s[3], 'mureta'); K.pinta('muro', { x1: s[0], y1: s[1], x2: s[2], y2: s[3] }); } };
    muro(x0, y0, x1, y0); muro(x0, y1, x1, y1); muro(x0, y0, x0, y1); muro(x1, y0, x1, y1);
    p.objetos.push({ id: 'portao', x: gx - 1, y: y1 - 1, s: 2 }); K.ocupa(gx - 1, y1 - 1, 2, 2);
    // a igreja (no fundo, no meio) e o caminho do portão até ela
    let topo = y0 + 1;
    if (igreja) {
      const iw = Math.min(14, Math.max(10, Math.round((x1 - x0) * 0.32))), ih = Math.min(11, Math.max(8, Math.round((y1 - y0) * 0.3))), ix = Math.round(gx - iw / 2), iy = y0 + 1;
      const ig = construcao(K, ix, iy, iw, ih, { lado: 's', larg: 2 }, 'laje', 'igreja');
      dentro(K, ig, () => {
        K.poe('altar', gx, iy + 1, 1, 0); K.poe('vela', gx - 1, iy + 1); K.poe('vela', gx + 1, iy + 1); K.poe('incensario', ix + 1, iy + 1);
        K.pinta('tapete', { x: gx - 0.6, y: iy + 2, w: 1.2, h: ih - 2 });
        for (let j = iy + 3; j < iy + ih - 2; j += 2) { K.poe('bancoIgreja', ix + 1, j, 2); K.poe('bancoIgreja', ix + iw - 3, j, 2); }
        K.poe('vitral', gx - 1, iy + 2, 2); K.poe('pia', gx + 2, iy + ih - 2);
        p.entradas.push({ x: gx + 2, y: iy + 1, n: 'A escada da cripta', gera: geraCat(1) }); K.ocupa(gx + 2, iy + 1, 1, 1);
      });
      K.poe('lampiao', gx - 2, iy + ih); K.poe('lampiao', gx + 1, iy + ih);
      topo = iy + ih + 2;
      K.pinta('caminho', { pts: [[gx, y1 + 0.5], [gx, iy + ih]], w: 2, tipo: 'terra' });
    } else K.pinta('caminho', { pts: [[gx, y1 + 0.5], [gx, y0 + 4]], w: 2, tipo: 'terra' });
    K.ocupa(gx - 1, topo, 2, y1 - topo);            // (o caminho fica livre)
    // os mausoléus (perto do muro, dos lados): o portão de ferro e o sarcófago; o primeiro, sem igreja, tem a cripta
    const lugaresM = [[x0 + 2, topo], [x1 - 6, topo], [x0 + 2, Math.round((topo + y1) / 2)], [x1 - 6, Math.round((topo + y1) / 2)]];
    for (let k = 0; k < nm; k++) {
      const [mx, my] = lugaresM[k];
      const m = construcao(K, mx, my, 4, 4, { lado: 's', k: 'portao' }, 'laje', 'mausoleu');
      dentro(K, m, () => { K.poe('sarcofago', mx + 1, my, 2, 90); K.poe('vela', mx, my); K.poe('vela', mx + 3, my); if (k === 0 && !igreja) { p.entradas.push({ x: mx + 3, y: my + 2, n: 'A entrada da cripta', gera: geraCat(2) }); K.ocupa(mx + 3, my + 2, 1, 1); } });
    }
    // os túmulos em fileiras, dos dois lados do caminho (com flores, estátuas e um crânio aqui e ali)
    for (let j = topo + 1; j < y1 - 2; j += 2) for (let i = x0 + 2; i < x1 - 1; i += 2) {
      if (Math.abs(i - gx) < 2) continue;
      if (r() < 0.12) continue;
      const id = r() < 0.08 ? 'estatua' : 'tumulo';
      if (K.poe(id, i, j) && r() < 0.25) K.poe('flores', i + (r() < 0.5 ? 1 : -1), j);
    }
    // as árvores dos cantos, as velas soltas, a casa do coveiro (embaixo, à esquerda)
    for (const [x, y] of [[x0 + 1, y0 + 1], [x1 - 3, y0 + 1], [x0 + 1, y1 - 3], [x1 - 3, y1 - 3]]) K.poe('arvore', x, y, 2);
    const cv = construcao(K, x0 + 1, y1 - 6, 4, 4, { lado: 'l' }, 'madeira', 'coveiro');
    dentro(K, cv, () => { K.poe('cama', cv.x, cv.y, 2); K.poe('mesa', cv.x + 2, cv.y + 2, 1); K.poe('lampiao', cv.x + 3, cv.y); });
    for (let k = 0; k < 4; k++) K.poe('vela', K.ri(x0 + 2, x1 - 2), K.ri(topo + 1, y1 - 2));
    // fora do muro: o mato
    for (let k = 0; k < 8; k++) { const x = K.ri(0, W - 2), y = K.ri(0, H - 2); if (x >= x0 - 1 && x <= x1 && y >= y0 - 1 && y <= y1) continue; K.poe(r() < 0.6 ? 'arbusto' : 'arvore', x, y, 1); }
    p.chegada = [gx, H - 1];
    return p;
  }
  const nomeCemiterio = p => (p.igreja ? 'Cemitério e igreja' : 'Cemitério');
  function resumoCemiterio(p) {
    const tumulos = p.objetos.filter(x => x.id === 'tumulo').length;
    return [p.W + ' × ' + p.H + ' quadrados', p.igreja ? 'a igreja com a escada da cripta (oculta)' : 'sem igreja', p.mausoleus ? (p.mausoleus === 1 ? '1 mausoléu' : p.mausoleus + ' mausoléus') : 'sem mausoléus', tumulos + ' túmulos', 'as catacumbas embaixo: ' + (Masmorra.TODOS.find(x => x[0] === p.cat) || ['', ''])[1].toLowerCase()].join(' · ') + '.';
  }

  /* ---------------- (lote 53) a cena do crime ----------------
     Cinco lugares feitos para um mistério: a mansão (o salão, o escritório, a biblioteca, o quarto, a cozinha e o
     jardim), a taverna (o salão com o balcão, a cozinha, a adega e os quartos de cima), o beco (os fundos das casas,
     os caixotes, o portão de um quintal), a cripta (as câmaras de pedra com os sarcófagos) e a clareira da lua cheia (a
     floresta, a clareira com as pedras e a cabana do lenhador). p.cena é onde aconteceu (o corpo, ou o vestígio); o
     bloco "Mistério" do gerador põe ali o corpo e as marcas de pista. */
  const CENARIOS = [['mansao', 'Mansão'], ['taverna', 'Taverna'], ['beco', 'Beco'], ['cripta', 'Cripta'], ['clareira', 'Clareira da lua cheia']];
  function gerarCrime(o) {
    o = o || {};
    const cen = CENARIOS.some(x => x[0] === o.cenario) ? o.cenario : 'mansao';
    const seed = (Math.round(Number(o.seed)) >>> 0) || 1;
    const DIM = { mansao: [40, 32], taverna: [34, 28], beco: [30, 24], cripta: [32, 28], clareira: [40, 32] }[cen];
    const W = DIM[0], H = DIM[1];
    const K = novoPlano('crime', W, H, seed, { cenario: cen, estilo: o.estilo || 'comum', estacao: o.estacao || 'verao' });
    const { p, r } = K;
    if (cen === 'mansao') {
      const x0 = 5, y0 = 3, w = W - 10, hh = H - 11;
      K.pinta('caminho', { pts: [[W / 2, H - 0.5], [W / 2, y0 + hh]], w: 2, tipo: 'calcada' });
      const metade = Math.round(w / 2);
      const salao = construcao(K, x0, y0 + 7, w, hh - 7, { lado: 's', larg: 2 }, 'madeira', 'salao');
      const escr = construcao(K, x0, y0, metade, 7, { lado: 's' }, 'madeira', 'escritorio');
      const biblio = construcao(K, x0 + metade, y0, w - metade, 7, { lado: 's' }, 'madeira', 'biblioteca');
      dentro(K, salao, () => { K.pinta('tapete', { x: salao.x + 3, y: salao.y + 2, w: salao.w - 6, h: salao.h - 4 }); K.poe('mesa', salao.x + Math.floor(salao.w / 2) - 1, salao.y + 3, 2); for (const dx of [-2, 2]) K.poe('cadeira', salao.x + Math.floor(salao.w / 2) + dx, salao.y + 3); K.poe('lareira', salao.x + 1, salao.y + 2, 2, 90); K.poe('candelabro', salao.x + salao.w - 2, salao.y + 1); K.poe('escada', salao.x + salao.w - 3, salao.y + salao.h - 3, 2); });
      dentro(K, escr, () => { K.poe('mesa', escr.x + 2, escr.y + 2, 1); K.poe('cadeira', escr.x + 2, escr.y + 3); K.poe('estante', escr.x + 1, escr.y + 1); K.poe('cofre', escr.x + escr.w - 2, escr.y + 1); K.poe('vela', escr.x + 3, escr.y + 2); });
      dentro(K, biblio, () => { for (let i = biblio.x + 1; i < biblio.x + biblio.w - 1; i += 2) K.poe('estante', i, biblio.y + 1); K.poe('mesa', biblio.x + 3, biblio.y + 4, 1); K.poe('lampiao', biblio.x + biblio.w - 2, biblio.y + 4); });
      // o quarto e a cozinha, dos lados de fora do salão (anexos)
      const q = construcao(K, 1, y0 + 8, 4, 6, { lado: 's' }, 'madeira', 'quarto');
      dentro(K, q, () => { K.poe('cama', q.x, q.y + 1, 2); K.poe('bau', q.x + 2, q.y + 4); });
      const coz = construcao(K, W - 5, y0 + 8, 4, 6, { lado: 's' }, 'laje', 'cozinha');
      dentro(K, coz, () => { K.poe('lareira', coz.x + 1, coz.y, 2); K.poe('barril', coz.x + 3, coz.y + 4); K.poe('jarro', coz.x, coz.y + 4); });
      // o jardim: as árvores, as flores e o poço
      for (let k = 0; k < 10; k++) K.poe(K.pick(['arbusto', 'flores', 'flores', 'arvore']), K.ri(1, W - 2), K.ri(H - 7, H - 2));
      K.poe('poco', W - 6, H - 5);
      p.cena = [escr.x + 3, escr.y + 4];
    } else if (cen === 'taverna') {
      const x0 = 3, y0 = 3, w = W - 6, hh = H - 9;
      K.pinta('caminho', { pts: [[W / 2, H - 0.5], [W / 2, y0 + hh]], w: 2, tipo: 'terra' });
      const sal = construcao(K, x0, y0 + 6, w, hh - 6, { lado: 's', larg: 2 }, 'madeira', 'salao');
      const coz = construcao(K, x0, y0, 8, 6, { lado: 's' }, 'laje', 'cozinha');
      const adega = construcao(K, x0 + 8, y0, 7, 6, { lado: 's' }, 'laje', 'adega');
      const qt = construcao(K, x0 + 15, y0, w - 15, 6, { lado: 's' }, 'madeira', 'quarto');
      dentro(K, sal, () => { K.poe('balcao', sal.x + 1, sal.y + 1, 2); K.poe('barril', sal.x + 1, sal.y + 3); K.poe('lareira', sal.x + sal.w - 3, sal.y, 2); for (let i = 0; i < 4; i++) { const mx = sal.x + 4 + (i % 2) * 6, my = sal.y + 3 + Math.floor(i / 2) * 4; K.poe('mesa', mx, my, 1); K.poe('banco', mx - 1, my); K.poe('banco', mx + 1, my); } K.poe('lampiao', sal.x + 4, sal.y + 1); });
      dentro(K, coz, () => { K.poe('lareira', coz.x + 1, coz.y, 2); K.poe('mesa', coz.x + 4, coz.y + 2, 1); K.poe('jarro', coz.x + 6, coz.y + 1); });
      dentro(K, adega, () => { for (let i = 0; i < 4; i++) K.poe('barril', adega.x + 1 + i, adega.y + 1); K.poe('caixote', adega.x + 1, adega.y + 3); p.entradas.push({ x: adega.x + adega.w - 2, y: adega.y + adega.h - 2, n: 'O alçapão da adega', gera: { t: 'masmorra', m: 'porao', n: 1, tam: 'pequeno', e: o.estilo || 'comum', s: (sub(seed, 70) % 2147483000) + 1 } }); K.ocupa(adega.x + adega.w - 2, adega.y + adega.h - 2, 1, 1); });
      dentro(K, qt, () => { K.poe('cama', qt.x + 1, qt.y + 1, 2); K.poe('bau', qt.x + 3, qt.y + 1); K.poe('vela', qt.x + 4, qt.y + 3); });
      K.poe('carroca', 2, H - 5, 2); K.poe('placa', W / 2 + 2, y0 + hh + 1);
      p.cena = [qt.x + 2, qt.y + 4];
    } else if (cen === 'beco') {
      // as paredes dos fundos das casas, dos dois lados; o beco no meio, com uma curva
      const mid = Math.round(W / 2);
      K.pinta('piso', { x: 0, y: 0, w: W, h: H, tipo: 'calcada' });
      const casa = (x, y, w, hh, lado) => { const q = construcao(K, x, y, w, hh, { lado }, 'madeira', 'casa'); dentro(K, q, () => { K.poe(K.pick(['mesa', 'cama', 'barril']), q.x + 1, q.y + 1, 1); K.poe('vela', q.x + q.w - 2, q.y + 1); }); return q; };
      casa(1, 1, mid - 4, 7, 's'); casa(mid + 3, 1, W - mid - 4, 7, 's');
      casa(1, H - 8, mid - 6, 7, 'n'); casa(mid + 5, H - 8, W - mid - 6, 7, 'n');
      for (let k = 0; k < 12; k++) K.poe(K.pick(['caixote', 'caixote', 'barril', 'lenha']), K.ri(mid - 3, mid + 3), K.ri(8, H - 9));
      K.poe('lampiao', mid - 3, 9); K.poe('placa', mid + 3, H - 10);
      p.cena = [mid, Math.round(H / 2)];
    } else if (cen === 'cripta') {
      K.pinta('piso', { x: 0, y: 0, w: W, h: H, tipo: 'laje' });
      const cam = [];
      const lw = Math.floor((W - 4) / 3);
      for (let i = 0; i < 3; i++) cam.push(construcao(K, 2 + i * lw, 2, lw, 9, { lado: 's' }, 'laje', 'camara'));
      const nave = construcao(K, 2, 11, W - 4, H - 15, { lado: 's', larg: 2 }, 'laje', 'nave');
      for (const q of cam) dentro(K, q, () => { K.poe('sarcofago', q.x + Math.floor(q.w / 2) - 1, q.y + 2, 2, 90); K.poe('vela', q.x + 1, q.y + 1); K.poe('vela', q.x + q.w - 2, q.y + 1); });
      dentro(K, nave, () => { K.poe('altar', Math.round(W / 2), nave.y + 1); for (let i = 0; i < 4; i++) K.poe('caixao', nave.x + 2 + i * 5, nave.y + nave.h - 3, 2); K.poe('candelabro', nave.x + 1, nave.y + 1); K.poe('candelabro', nave.x + nave.w - 2, nave.y + 1); });
      p.cena = [Math.round(W / 2), nave.y + 3];
    } else {
      // a clareira: a floresta em volta, a clareira com as pedras, a cabana do lenhador
      const cx = Math.round(W / 2), cy = Math.round(H / 2);
      for (let k = 0; k < 70; k++) { const x = K.ri(0, W - 2), y = K.ri(0, H - 2); if (Math.hypot(x - cx, y - cy) < 9) continue; K.poe(r() < 0.7 ? 'arvore' : 'arbusto', x, y, r() < 0.6 ? 2 : 1); }
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; K.poe('pedra', Math.round(cx + Math.cos(a) * 5), Math.round(cy + Math.sin(a) * 4)); }
      K.poe('fogueira', cx, cy);
      const cab = construcao(K, 3, 3, 6, 5, { lado: 'l' }, 'madeira', 'cabana');
      dentro(K, cab, () => { K.poe('cama', cab.x, cab.y + 1, 2); K.poe('mesa', cab.x + 3, cab.y + 2, 1); K.poe('lenha', cab.x + 4, cab.y); });
      for (let k = 0; k < 6; k++) K.poe(K.pick(['toco', 'cogumelos', 'flores']), K.ri(cx - 6, cx + 6), K.ri(cy - 5, cy + 5));
      K.pinta('caminho', { pts: [[cx, H - 0.5], [cx, cy + 4]], w: 1.6, tipo: 'terra' });
      p.cena = [cx + 2, cy + 1];
    }
    p.chegada = [Math.round(W / 2), H - 1];
    return p;
  }
  const nomeCrime = p => (CENARIOS.find(x => x[0] === p.cenario) || CENARIOS[0])[1];
  const resumoCrime = p => [nomeCrime(p), p.W + ' × ' + p.H + ' quadrados', p.salas.length ? p.salas.length + ' cômodos' : 'ao ar livre', 'o lugar do crime marcado (o bloco Mistério põe ali o corpo e as pistas)'].join(' · ') + '.';

  /* ---------------- o fundo ---------------- */
  function pintar(p, c) {
    const cv = document.createElement('canvas'); cv.width = p.W * c; cv.height = p.H * c;
    const g = cv.getContext('2d'), P = palDe(p.estilo, p.estacao), r = mulberry((p.seed ^ 0x9e3779b9) >>> 0 || 3);
    g.fillStyle = P.base; g.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0, n = Math.min(4000, p.W * p.H * 2); i < n; i++) { g.globalAlpha = 0.25 + r() * 0.3; g.fillStyle = P.manchas[Math.floor(r() * P.manchas.length)]; g.beginPath(); g.arc(r() * cv.width, r() * cv.height, c * (0.15 + r() * 0.6), 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    const blocos = (x, y, w, h, cores, junta, tam) => {
      g.save(); g.beginPath(); g.rect(x * c, y * c, w * c, h * c); g.clip();
      const s = c * tam;
      for (let j = 0, yy = y * c; yy < (y + h) * c; j++, yy += s) for (let xx = x * c - (j % 2 ? s / 2 : 0); xx < (x + w) * c; xx += s) { g.fillStyle = cores[Math.floor(r() * cores.length)]; g.fillRect(xx + 1, yy + 1, s - 2, s - 2); }
      g.strokeStyle = junta; g.lineWidth = Math.max(1, c * 0.03); g.restore();
    };
    for (const o of p.pintados) {
      if (o.k === 'piso') {
        if (o.tipo === 'madeira') { g.fillStyle = '#6e4e32'; g.fillRect(o.x * c, o.y * c, o.w * c, o.h * c); g.strokeStyle = 'rgba(40,24,12,0.5)'; g.lineWidth = Math.max(1, c * 0.03); for (let y = o.y; y < o.y + o.h; y += 0.33) { g.beginPath(); g.moveTo(o.x * c, y * c); g.lineTo((o.x + o.w) * c, y * c); g.stroke(); } }
        else if (o.tipo === 'calcada') blocos(o.x, o.y, o.w, o.h, P.pedra.map(x => x), P.junta, 0.5);
        else blocos(o.x, o.y, o.w, o.h, ['#8f8a80', '#9a958a', '#857f76', '#a29c90'], '#5a5650', 1);
      } else if (o.k === 'caminho') {
        g.strokeStyle = P.terra[0]; g.lineWidth = o.w * c; g.lineCap = 'round'; g.beginPath(); o.pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); g.stroke();
        g.strokeStyle = P.terra[1]; g.lineWidth = o.w * c * 0.6; g.stroke();
      } else if (o.k === 'agua') {
        const gr = g.createLinearGradient(o.x * c, o.y * c, (o.x + o.w) * c, (o.y + o.h) * c); gr.addColorStop(0, '#2f5e7d'); gr.addColorStop(1, '#3f7396');
        g.fillStyle = gr; g.fillRect(o.x * c, o.y * c, o.w * c, o.h * c);
      } else if (o.k === 'muralha' || o.k === 'muro' || o.k === 'paredeFina') {
        const larg = o.k === 'muralha' ? 0.9 : o.k === 'muro' ? 0.35 : 0.22;
        g.strokeStyle = o.k === 'muralha' ? '#6f6b64' : o.k === 'muro' ? '#7d786f' : '#4a4038'; g.lineWidth = larg * c; g.lineCap = 'square';
        g.beginPath(); g.moveTo(o.x1 * c, o.y1 * c); g.lineTo(o.x2 * c, o.y2 * c); g.stroke();
        if (o.k === 'muralha') { g.strokeStyle = '#8e8a82'; g.lineWidth = larg * c * 0.45; g.stroke(); g.fillStyle = '#5d5953'; const mx = (o.x1 + o.x2) / 2, my = (o.y1 + o.y2) / 2; g.fillRect(mx * c - c * 0.15, my * c - c * 0.15, c * 0.3, c * 0.3); }
      } else if (o.k === 'torre') {
        g.fillStyle = '#5f5b55'; g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#8a857c'; g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c * 0.82, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(40,38,34,0.6)'; g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c * 0.55, 0, Math.PI * 2); g.stroke();
      } else if (o.k === 'entulho') {
        for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = r() * o.r; g.fillStyle = ['#77736b', '#8a857c', '#5f5b55'][i % 3]; g.beginPath(); g.arc((o.x + Math.cos(a) * d) * c, (o.y + Math.sin(a) * d) * c, c * (0.12 + r() * 0.18), 0, Math.PI * 2); g.fill(); }
      } else if (o.k === 'queimado') {
        const gr = g.createRadialGradient(o.x * c, o.y * c, 0, o.x * c, o.y * c, o.r * c); gr.addColorStop(0, 'rgba(20,16,12,0.75)'); gr.addColorStop(1, 'rgba(20,16,12,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c, 0, Math.PI * 2); g.fill();
      } else if (o.k === 'tapete') { g.fillStyle = '#7a1e24'; g.fillRect(o.x * c, o.y * c, o.w * c, o.h * c); g.strokeStyle = '#c9a24a'; g.lineWidth = Math.max(1, c * 0.05); g.strokeRect(o.x * c + c * 0.08, o.y * c + c * 0.08, o.w * c - c * 0.16, o.h * c - c * 0.16); }
    }
    return cv;
  }
  function previa(cv, p, maxW, maxH) {
    const cell = Math.max(5, Math.floor(Math.min((maxW || 460) / p.W, (maxH || 330) / p.H)));
    const f = pintar(p, cell);
    cv.width = f.width; cv.height = f.height;
    const g = cv.getContext('2d'); g.drawImage(f, 0, 0);
    g.lineCap = 'round';
    for (const w of p.paredes) { g.strokeStyle = w.k === 'door' ? '#7fd1ff' : w.k === 'mureta' ? '#cfe9ff' : 'rgba(255,236,200,0.85)'; g.lineWidth = Math.max(1.5, cell * (w.k === 'door' ? 0.22 : 0.12)); g.beginPath(); g.moveTo(w.x1 * cell, w.y1 * cell); g.lineTo(w.x2 * cell, w.y2 * cell); g.stroke(); }
    for (const o of p.objetos) { const s = o.s || 1; if (Props.P[o.id]) { g.save(); g.translate((o.x + s / 2) * cell, (o.y + s / 2) * cell); g.rotate((o.rot || 0) * Math.PI / 180); try { Props.P[o.id].draw(g, s * cell / 2, 1.3, 7, 0, null); } catch (e) { /* desenho sem token */ } g.restore(); } }
    for (const e of p.entradas) { g.fillStyle = '#e6ab4f'; g.strokeStyle = '#3a2508'; g.lineWidth = 2; g.beginPath(); g.arc((e.x + 0.5) * cell, (e.y + 0.5) * cell, cell * 0.45, 0, Math.PI * 2); g.fill(); g.stroke(); }
    return { cell };
  }

  /* ---------------- a cena ---------------- */
  async function criar(p, nome, ex, nomeDe) {
    ex = ex || {};
    const sc = newScene(String(nome || '').trim().slice(0, 60) || nomeDe(p));
    if (typeof ex.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(ex.id) && !Store.S.scenes[ex.id]) sc.id = ex.id;
    sc.cols = p.W; sc.rows = p.H;
    const c = sc.cell;
    sc.fog.dynamic = true; sc.fog.explored = true;
    const tom = TONES.find(t => t.id === ex.hora) || TONES[0];
    sc.tone = tom.id; sc.light = tom.light;
    sc.weather = { k: WEATHERS.some(w => w[0] === ex.clima) ? ex.clima : '', pow: 0.6 };
    sc.bgColor = palDe(p.estilo, p.estacao).base; sc.bg.stretch = true;
    try { const cv = pintar(p, res(p.W, p.H)); const a = await Assets.fromCanvas(cv, 'bg', sc.name); sc.bg.asset = a.id; } catch (e) { console.error(e); }
    for (const w of p.paredes) { if (Math.hypot(w.x2 - w.x1, w.y2 - w.y1) < 0.05) continue; sc.walls.push({ id: uid('wl'), k: w.k || 'wall', x1: w.x1 * c, y1: w.y1 * c, x2: w.x2 * c, y2: w.y2 * c, open: false, locked: false, secret: false }); }
    for (const o of p.objetos) if (Props.P[o.id]) { const t = Props.novo(sc, o.id, o.x * c, o.y * c, o.s || 1, false); if (o.rot) t.rot = o.rot; sc.tokens.push(t); }
    if (ex.relevo !== false) for (const rr of p.relevo) sc.shapes.push(Object.assign(Estilos.terrenoNaCena(rr, c, 0, 0), { a: 0.3 }));
    // as entradas (ocultas): dois cliques geram o nível de baixo (o calabouço, as catacumbas)
    for (const e of p.entradas) { const t = Props.novo(sc, 'entrada', e.x * c, e.y * c, 1, true); t.name = e.n; t.gera = Object.assign({}, e.gera); sc.tokens.push(t); }
    if (p.chegada && Props.P.chegada) { const t = Props.novo(sc, 'chegada', p.chegada[0] * c, (p.chegada[1] - 1) * c, 1, true); sc.tokens.push(t); }
    normalizeScene(sc);
    Store.addScene(sc); Persist.scene(sc.id); Persist.meta();
    return sc;
  }

  /* ---------------- as abas da janela ---------------- */
  const semPartes = { partes: () => [], parteEm: () => null, nomeDaParte: () => '', formaDaParte: () => [], travada: () => false, alternar: (p, parte, trava) => trava, quantasTravadas: () => 0, baseDe: () => null, travaDe: () => null };
  const CASTELO = Object.assign({ id: 'castelo', n: 'Castelo', aceitaEstacao: true,
    padrao: () => { const o = App.opt; return { tamanho: TAM_C[o.casTam] ? o.casTam : 'medio', estado: ESTADOS_C.some(x => x[0] === o.casEst) ? o.casEst : 'inteiro', fosso: !!o.casFosso }; },
    controles(st, K, mudou) {
      const muda = (k, v) => { st[k] = v; App.opt.casTam = st.tamanho; App.opt.casEst = st.estado; App.opt.casFosso = st.fosso; mudou(true); };
      return h('div', { class: 'ger-c' },
        K.field('Como está', K.seg('cas-est', st.estado, ESTADOS_C, v => muda('estado', v)), 'stack'),
        K.field('Tamanho', K.seg('cas-tam', st.tamanho, Object.keys(TAM_C).map(k => [k, TAM_C[k].n, null, `${TAM_C[k].W} × ${TAM_C[k].H} quadrados`]), v => muda('tamanho', v)), 'stack'),
        K.toggle('cas-fosso', st.fosso, v => muda('fosso', v), 'Com fosso (e a ponte levadiça, que abre e fecha)'));
    },
    opcoesDe: st => ({ tamanho: st.tamanho, estado: st.estado, fosso: !!st.fosso }),
    aplicarOpcoes(st, o) { if (TAM_C[o.tamanho]) st.tamanho = o.tamanho; if (ESTADOS_C.some(x => x[0] === o.estado)) st.estado = o.estado; if (typeof o.fosso === 'boolean') st.fosso = o.fosso; },
    gerar: (st, comum) => gerarCastelo(Object.assign({}, st, { seed: comum && comum.seed, estilo: comum && comum.estilo, estacao: comum && comum.estacao })),
    previa, resumo: resumoCastelo, nomePadrao: nomeCastelo,
    criar: (p, nome, ex) => criar(p, nome, ex, nomeCastelo),
    relevoTxt: 'Com relevo (a água do fosso)',
    dica: '"Gerar outro" sorteia outro castelo, com as mesmas escolhas.',
    nota: 'Sai uma cena nova: as muralhas e as torres barram como paredes, a grade levadiça e a ponte (com fosso) abrem e fecham com dois cliques. Na torre de menagem, a escada do calabouço (uma Entrada oculta) gera o nível de baixo.',
    feito: (sc) => `"${sc.name}" criada: dois cliques na grade (ou na ponte) abrem e fecham; a escada do calabouço está oculta na torre de menagem.` }, semPartes);
  const CEMITERIO = Object.assign({ id: 'cemiterio', n: 'Cemitério', aceitaEstacao: true,
    padrao: () => { const o = App.opt; return { tamanho: TAM_M[o.cemTam] ? o.cemTam : 'medio', igreja: o.cemIgreja !== false, mausoleus: o.cemMau == null ? 2 : o.cemMau, cat: Masmorra.CATACUMBAS.includes(o.cemCat) ? o.cemCat : 'ossuario' }; },
    controles(st, K, mudou) {
      const muda = (k, v) => { st[k] = v; App.opt.cemTam = st.tamanho; App.opt.cemIgreja = st.igreja; App.opt.cemMau = st.mausoleus; App.opt.cemCat = st.cat; mudou(true); };
      return h('div', { class: 'ger-c' },
        K.field('Tamanho', K.seg('cem-tam', st.tamanho, Object.keys(TAM_M).map(k => [k, TAM_M[k].n, null, `${TAM_M[k].W} × ${TAM_M[k].H} quadrados`]), v => muda('tamanho', v)), 'stack'),
        K.toggle('cem-igreja', st.igreja, v => muda('igreja', v), 'Com a igreja'),
        K.field('Mausoléus', K.seg('cem-mau', st.mausoleus, [[0, 'Nenhum'], [1, '1'], [2, '2'], [3, '3']], v => muda('mausoleus', v)), 'stack'),
        K.field('As catacumbas embaixo', K.seg('cem-cat', st.cat, Masmorra.TODOS.filter(x => Masmorra.CATACUMBAS.includes(x[0])), v => muda('cat', v)), 'stack'));
    },
    opcoesDe: st => ({ tamanho: st.tamanho, igreja: !!st.igreja, mausoleus: st.mausoleus, cat: st.cat }),
    aplicarOpcoes(st, o) { if (TAM_M[o.tamanho]) st.tamanho = o.tamanho; if (typeof o.igreja === 'boolean') st.igreja = o.igreja; if (o.mausoleus != null) st.mausoleus = Math.max(0, Math.min(3, Math.round(Number(o.mausoleus)) || 0)); if (Masmorra.CATACUMBAS.includes(o.cat)) st.cat = o.cat; },
    gerar: (st, comum) => gerarCemiterio(Object.assign({}, st, { seed: comum && comum.seed, estilo: comum && comum.estilo, estacao: comum && comum.estacao })),
    previa, resumo: resumoCemiterio, nomePadrao: nomeCemiterio,
    criar: (p, nome, ex) => criar(p, nome, ex, nomeCemiterio),
    relevoTxt: 'Com relevo',
    dica: '"Gerar outro" sorteia outro cemitério, com as mesmas escolhas.',
    nota: 'Sai uma cena nova: o muro baixo barra o passo e deixa ver; o portão e os portões dos mausoléus abrem com dois cliques. A escada da cripta (uma Entrada oculta, atrás do altar ou num mausoléu) gera as catacumbas embaixo.',
    feito: (sc) => `"${sc.name}" criada: a escada da cripta está oculta (atrás do altar ou num mausoléu); dois cliques nela geram as catacumbas.` }, semPartes);

  // (lote 53) a cena do crime
  const CRIME = Object.assign({ id: 'crime', n: 'Cena do crime', aceitaEstacao: true,
    padrao: () => ({ cenario: CENARIOS.some(x => x[0] === App.opt.crimeCen) ? App.opt.crimeCen : 'mansao' }),
    controles(st, K, mudou) {
      return h('div', { class: 'ger-c' },
        K.field('O lugar', K.seg('crime-cen', st.cenario, CENARIOS, v => { st.cenario = v; App.opt.crimeCen = v; mudou(true); }), 'stack'));
    },
    opcoesDe: st => ({ cenario: st.cenario }),
    aplicarOpcoes(st, o) { if (CENARIOS.some(x => x[0] === o.cenario)) st.cenario = o.cenario; },
    gerar: (st, comum) => gerarCrime(Object.assign({}, st, { seed: comum && comum.seed, estilo: comum && comum.estilo, estacao: comum && comum.estacao })),
    previa, resumo: resumoCrime, nomePadrao: nomeCrime,
    criar: (p, nome, ex) => criar(p, nome, ex, nomeCrime),
    relevoTxt: 'Com relevo',
    dica: '"Gerar outro" sorteia outro lugar do mesmo tipo. Ligue o bloco "Mistério" para o corpo e as pistas entrarem escondidos.',
    nota: 'Sai uma cena nova, com o lugar do crime marcado. Com o bloco "Mistério", o corpo (ou o vestígio) e as marcas de pista entram ocultos dos jogadores: dois cliques numa marca revelam a pista e a entregam à mesa.',
    feito: sc => `"${sc.name}" criada.` }, semPartes);

  return { CASTELO, CEMITERIO, CRIME, CENARIOS, gerarCastelo, gerarCemiterio, gerarCrime, pintar, TAM_C, TAM_M, ESTADOS_C };
})();
