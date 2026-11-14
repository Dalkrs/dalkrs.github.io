/* ---------------------------------------------------------------
   10gs. OS OBJETOS DO TEMA (lote 158) — as 15 categorias novas de objetos (06cc, 06cd, 06ce) espalhadas na cena, em
   grupinhos: um objeto grande no meio (o "núcleo": a chopeira, o ringue, o portal) e os menores em volta.
   · No gerador: o bloco "Objetos do tema". "Combina com o lugar" escolhe sozinho (a vila ganha a fazenda, o porto o
     convés, a masmorra de esgoto o esgoto, o encontro na neve o inverno…); ou o mestre escolhe um dos 15, ou Nenhum.
     Poucos, Alguns ou Muitos. Os objetos entram quando a cena é criada (antes de Povoar: os inimigos ficam fora deles).
   · Numa cena pronta: menu das cenas › "Pôr objetos de um tema…" (o Desfazer tira tudo de uma vez).
   As regras: não tampa porta (nem o quadrado na frente dela), não fica na água nem em cima de outro token, não cruza
   parede; os temas de dentro (a taverna, a escola, a prisão, o esgoto) ficam dentro das salas, os de fora (a fazenda, o
   inverno, o deserto, o pântano, o acampamento, a natureza fantástica) no quintal ou no campo; na masmorra, nas
   catacumbas e no interior, sempre dentro; na vila, na cidade, no porto e no campo (os prédios com o telhado pintado),
   sempre fora, longe dos prédios, das ruas, do rio e da praça. Os objetos de encostar (o quadro de avisos, a chopeira, a comporta) procuram
   uma parede para as costas. Entre um objeto e outro fica um quadrado livre, para dar passagem.
   --------------------------------------------------------------- */
const Temas = (() => {
  // [id, nome, onde, os núcleos (o primeiro que couber), os outros objetos (sorteados nesta ordem, com repetição)]
  const LISTA = [
    ['taverna', 'Taverna e estalagem', 'dentro', ['chopeira', 'lareiraEspeto', 'palcoBardo'], ['mesaJogo', 'canecas', 'quadroAvisos', 'mesaJogo', 'cachorro', 'barril', 'beliche', 'banco', 'mesaJogo']],
    ['escola', 'Escola de magia', 'dentro', ['quadroRunas', 'globoCeleste', 'cristalVidencia'], ['carteira', 'pilhaLivros', 'carteira', 'telescopio', 'pergaminhosVoando', 'suporteVarinhas', 'estante', 'carteira']],
    ['prisao', 'Prisão e interrogatório', 'dentro', ['mesaInterrogatorio', 'rodaTortura', 'troncoCastigo'], ['catre', 'balde', 'cepo', 'gaiolaSuspensa', 'molhoChaves', 'grilhoes', 'catre', 'balde']],
    ['fazenda', 'Fazenda e celeiro', 'fora', ['galinheiro', 'chiqueiro', 'arado'], ['espantalho', 'colmeia', 'aboboras', 'ferramentasFazenda', 'moinhoMao', 'feno', 'sacos', 'aboboras', 'carroca']],
    ['treino', 'Treino e arena', 'tanto', ['ringue', 'tapeteLuta', 'arquibancada'], ['cavaleteArmas', 'pesos', 'posteEscudos', 'boneco', 'alvo', 'podio', 'pesos']],
    ['ruinas', 'Ruínas antigas', 'tanto', ['portalPedra', 'mosaico', 'escadariaPartida'], ['colunaQuebrada', 'estatuaSemCabeca', 'obelisco', 'altarMusgo', 'escombros', 'colunaQuebrada', 'estatuaSemCabeca']],
    ['inverno', 'Inverno e montanha', 'fora', ['iglu', 'lagoCongelado', 'pinheiroNevado'], ['bonecoNeve', 'pinheiroNevado', 'treno', 'pegadas', 'estalactitesGelo', 'pinheiroNevado', 'pegadas']],
    ['deserto', 'Deserto e oásis', 'fora', ['tendaDeserto', 'tapeteAlmofadas', 'duna'], ['camelo', 'palmeira', 'jarrosAgua', 'caveiraBoi', 'palmeira', 'duna', 'jarrosAgua']],
    ['pantano', 'Pântano e brejo', 'fora', ['palafita', 'caldeiraoBruxa', 'sapoGigante'], ['juncos', 'troncoPodre', 'barcoJunco', 'juncos', 'ponteTabuas', 'cogumelos', 'juncos']],
    ['esgoto', 'Esgoto e subterrâneo', 'dentro', ['comporta', 'passarela', 'canos'], ['gradeEsgoto', 'ninhoRatos', 'lixo', 'escadaFerro', 'canos', 'lixo', 'ninhoRatos']],
    ['militar', 'Acampamento militar e cerco', 'fora', ['tendaComando', 'torreVigiaMadeira', 'mesaGuerra'], ['palicada', 'barrisPolvora', 'bandeiras', 'cavalosFrisa', 'tamborGuerra', 'barraca', 'fogueira', 'cavaleteArmas']],
    ['portais', 'Portais e magia', 'tanto', ['portalArcano', 'circuloTeleporte', 'runasChao'], ['pilarEnergia', 'pedraFlutuante', 'orbe', 'runasChao', 'cristaisChao', 'pilarEnergia', 'orbe']],
    ['teatro', 'Teatro e música', 'tanto', ['palcoCortina', 'palcoBardo'], ['cadeirasPlateia', 'cadeirasPlateia', 'araraFigurinos', 'cadeirasPlateia', 'mascaras', 'alaude', 'tambor', 'harpa']],
    ['conves', 'Convés e porto', 'tanto', ['mastro', 'cargaAmarrada', 'leme'], ['canhao', 'cordasEnroladas', 'ancora', 'redesPesca', 'barril', 'canhao', 'cordasEnroladas', 'prancha']],
    ['fantastica', 'Natureza fantástica', 'fora', ['arvoreOca', 'cogumeloGigante', 'ninhoGigante'], ['cristaisChao', 'florCarnivora', 'teiaGigante', 'toca', 'cogumeloGigante', 'cristaisChao', 'florCarnivora']],
  ].map(([id, n, onde, nucleo, itens]) => ({ id, n, onde, nucleo, itens }));
  const tema = id => LISTA.find(x => x.id === id) || null;
  const QTDS = [['poucos', 'Poucos'], ['alguns', 'Alguns'], ['muitos', 'Muitos']];
  const GRUPOS = { poucos: 1, alguns: 2, muitos: 3 }, POR_GRUPO = { poucos: 4, alguns: 6, muitos: 8 };
  // os lugares fechados: os objetos ficam sempre dentro (fora, ali, é a rocha ou o vazio)
  const FECHADOS = new Set(['masmorra', 'catacumbas', 'interior']);
  // os lugares de casa com quintal (a casa por dentro se vê): o tema escolhe dentro ou fora; nos outros lugares de fora
  // (a vila, o porto, a cidade, o campo), os prédios têm o telhado pintado, e os objetos ficam sempre do lado de fora
  const casa = id => Furtividade.IDS.includes(id) || id === 'sobmedida' || id === 'exemplo';
  const MOLHADO = new Set(['agua', 'fosso', 'lava', 'abismo']);      // o chão onde não se põe nada

  /* ---- "Combina com o lugar": o tema que o lugar pede (ou nenhum) ---- */
  function auto(lugarId, op) {
    op = op || {};
    const M = { vila: 'fazenda', cidade: 'teatro', cidadeGrande: 'teatro', porto: 'conves', castelo: 'treino', ruinas: 'ruinas', catacumbas: 'ruinas', arena: 'treino', acampamento: 'militar', fortaleza: 'prisao', torre: 'militar' };
    if (M[lugarId]) return M[lugarId];
    if (lugarId === 'interior') return op.tipo === 'taverna' ? 'taverna' : op.tipo === 'quartel' ? 'treino' : '';
    if (lugarId === 'masmorra') return { esgoto: 'esgoto', cisterna: 'esgoto', torre: 'portais', laboratorio: 'escola', ruinas: 'ruinas', templo: 'ruinas', cripta: 'ruinas', tumba: 'ruinas', caverna: 'fantastica', covil: 'fantastica', colmeia: 'fantastica', gelo: 'inverno', navio: 'conves', fortaleza: 'treino', pedra: 'prisao' }[op.tipo] || '';
    if (lugarId === 'encontro') {
      if (op.situacao === 'ruinas') return 'ruinas';
      if (op.situacao === 'acampamento') return 'militar';
      return { neve: 'inverno', tundra: 'inverno', deserto: 'deserto', pantano: 'pantano', floresta: 'fantastica', selva: 'fantastica', cristais: 'fantastica', corrompida: 'fantastica', savana: 'deserto' }[op.terreno] || '';
    }
    if (lugarId === 'regiao') { const b = String(op.bioma || ''); return /neve|gelo|tundra|glaci/.test(b) ? 'inverno' : /deserto|areia|savana/.test(b) ? 'deserto' : /pantano|mangue|brejo/.test(b) ? 'pantano' : /floresta|selva|fung|cristal|corromp/.test(b) ? 'fantastica' : ''; }
    return '';
  }
  // o que vale agora (a escolha guardada): 'auto', '' (nenhum) ou o id de um tema
  const prefs = () => { const o = App.opt; return { id: o.temaId === '' || tema(o.temaId) ? o.temaId : 'auto', qtd: GRUPOS[o.temaQtd] ? o.temaQtd : 'alguns' }; };
  const escolhido = (L, op) => { const p = prefs(); return p.id === 'auto' ? auto(L.id, op) : p.id; };

  /* ---- a grade da cena: o que está livre, as paredes (as arestas), as salas (os pedaços) e o que é dentro ---- */
  function grade(sc, formas) {
    const c = sc.cell, W = sc.cols, H = sc.rows, V = Vigia.novo(W, H);
    for (const w of sc.walls || []) if (w.k !== 'veil') Vigia.parede(V, w.x1 / c, w.y1 / c, w.x2 / c, w.y2 / c, false, true);
    const livre = new Uint8Array(W * H).fill(1);
    const tira = (x0, y0, w, h) => { for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y0 + h)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x0 + w)); x++) livre[y * W + x] = 0; };
    for (const t of sc.tokens || []) { const [w, h] = tokWH(t); tira(t.x / c + 0.05, t.y / c + 0.05, w - 0.1, h - 0.1); }
    // a água (as áreas de terreno de água, de fosso, de lava e o abismo; o rio, pela linha)
    for (const s of sc.shapes || []) {
      if (!s.ter || !MOLHADO.has(s.ter.t)) continue;
      if (s.k === 'free' && Array.isArray(s.pts)) {      // o rio (a linha grossa)
        const P = s.pts, m = (s.sw || c) / 2 / c + 0.45;
        for (let i = 0; i + 3 < P.length; i += 2) {
          const ax = P[i] / c, ay = P[i + 1] / c, bx = P[i + 2] / c, by = P[i + 3] / c;
          for (let y = Math.max(0, Math.floor(Math.min(ay, by) - m)); y <= Math.min(H - 1, Math.ceil(Math.max(ay, by) + m)); y++) for (let x = Math.max(0, Math.floor(Math.min(ax, bx) - m)); x <= Math.min(W - 1, Math.ceil(Math.max(ax, bx) + m)); x++) if (Geo.distSeg(x + 0.5, y + 0.5, ax, ay, bx, by) < m) livre[y * W + x] = 0;
        }
        continue;
      }
      if (s.k === 'rect' || s.k === 'ell') tira(Math.min(s.x, s.x + s.w) / c, Math.min(s.y, s.y + s.h) / c, Math.abs(s.w) / c, Math.abs(s.h) / c);
      else if (s.k === 'poly' && Array.isArray(s.pts)) {
        const P = s.pts; let xa = Infinity, ya = Infinity, xb = -Infinity, yb = -Infinity; for (let i = 0; i < P.length; i += 2) { xa = Math.min(xa, P[i]); xb = Math.max(xb, P[i]); ya = Math.min(ya, P[i + 1]); yb = Math.max(yb, P[i + 1]); }
        for (let y = Math.max(0, Math.floor(ya / c)); y < Math.min(H, Math.ceil(yb / c)); y++) for (let x = Math.max(0, Math.floor(xa / c)); x < Math.min(W, Math.ceil(xb / c)); x++) {
          const px = (x + 0.5) * c, py = (y + 0.5) * c; let d = false; for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) { const xi = P[i], yi = P[i + 1], xj = P[j], yj = P[j + 1]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) d = !d; }
          if (d) livre[y * W + x] = 0;
        }
      }
    }
    // as partes do plano do gerador (em quadrados): os prédios (com o telhado pintado), as ruas, o rio e a praça
    for (const f of Array.isArray(formas) ? formas : []) {
      if (!f || !f.k) continue;
      const pts = f.k === 'circ' ? [[f.x - f.r, f.y - f.r], [f.x + f.r, f.y + f.r]] : Array.isArray(f.pts) ? f.pts : [];
      if (!pts.length) continue;
      const m = f.k === 'linha' ? (f.hw || 0.5) + 0.5 : 0.5;
      const xa = Math.max(0, Math.floor(Math.min(...pts.map(q => q[0])) - m)), xb = Math.min(W - 1, Math.ceil(Math.max(...pts.map(q => q[0])) + m));
      const ya = Math.max(0, Math.floor(Math.min(...pts.map(q => q[1])) - m)), yb = Math.min(H - 1, Math.ceil(Math.max(...pts.map(q => q[1])) + m));
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
        const px = x + 0.5, py = y + 0.5;
        let dentroF = false;
        if (f.k === 'circ') dentroF = Math.hypot(px - f.x, py - f.y) < f.r + 0.5;
        else if (f.k === 'linha') { for (let i = 0; i + 1 < pts.length && !dentroF; i++) if (Geo.distSeg(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < m) dentroF = true; }
        else { for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) dentroF = !dentroF; } if (!dentroF) for (let i = 0, j = pts.length - 1; i < pts.length && !dentroF; j = i++) if (Geo.distSeg(px, py, pts[j][0], pts[j][1], pts[i][0], pts[i][1]) < 0.5) dentroF = true; }
        if (dentroF) livre[y * W + x] = 0;
      }
    }
    // as portas: o quadrado de cada lado fica livre (ninguém tampa a passagem)
    for (const w of sc.walls || []) if (w.k === 'door') {
      const x1 = w.x1 / c, y1 = w.y1 / c, x2 = w.x2 / c, y2 = w.y2 / c;
      for (let y = Math.max(0, Math.floor(Math.min(y1, y2)) - 2); y <= Math.min(H - 1, Math.ceil(Math.max(y1, y2)) + 1); y++) for (let x = Math.max(0, Math.floor(Math.min(x1, x2)) - 2); x <= Math.min(W - 1, Math.ceil(Math.max(x1, x2)) + 1); x++) if (Geo.distSeg(x + 0.5, y + 0.5, x1, y1, x2, y2) < 1.2) livre[y * W + x] = 0;
    }
    // os pedaços (sem cruzar parede) e os que tocam a borda (o "fora")
    const passa = (x, y, dx, dy) => (dx ? !V.pV[y * (W + 1) + x + (dx > 0 ? 1 : 0)] : !V.pH[(y + (dy > 0 ? 1 : 0)) * W + x]);
    const comp = new Int32Array(W * H).fill(-1), tam = [], borda = [];
    for (let q = 0; q < W * H; q++) {
      if (comp[q] >= 0) continue;
      const id = tam.length, fila = [q]; comp[q] = id; let n = 0, b = false;
      for (let i = 0; i < fila.length; i++) {
        const u = fila[i], x = u % W, y = (u - x) / W; n++; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) b = true;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const vx = x + dx, vy = y + dy; if (vx < 0 || vy < 0 || vx >= W || vy >= H) continue; const v = vy * W + vx; if (comp[v] < 0 && passa(x, y, dx, dy)) { comp[v] = id; fila.push(v); } }
      }
      tam.push(n); borda.push(b);
    }
    const nDentro = tam.reduce((s, n, i) => s + (borda[i] ? 0 : n), 0);
    // o espaço em volta de cada quadrado (na janela 5 × 5, do mesmo pedaço): o corredor estreito tem pouco, e lá não se põe nada
    const aberto = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const q = y * W + x; let n = 0;
      for (let j = Math.max(0, y - 2); j <= Math.min(H - 1, y + 2); j++) for (let i = Math.max(0, x - 2); i <= Math.min(W - 1, x + 2); i++) if (comp[j * W + i] === comp[q] && livre[j * W + i]) n++;
      aberto[q] = n;
    }
    return { W, H, V, livre, comp, tam, borda, passa, aberto, temDentro: nDentro >= 6, dentro: q => !borda[comp[q]] };
  }

  /* ---- espalhar: os grupinhos, cada um com o núcleo e os objetos em volta → os tokens novos (fora da cena) ---- */
  function espalhar(sc, temaId, qtd, seed, o) {
    const T = tema(temaId);
    if (!T || !sc || !sc.cols || !sc.rows) return [];
    o = o || {};
    const G = grade(sc, o.formas), { W, H, livre, comp } = G, c = sc.cell, r = mulberry(((seed >>> 0) || 1) ^ 0x7e3a5);
    const usado = new Uint8Array(W * H);      // 1: um objeto; 2: o quadrado de folga em volta
    const onde = o.dentro || (o.lugar && FECHADOS.has(o.lugar)) ? 'dentro' : o.lugar && !casa(o.lugar) ? 'fora' : T.onde;
    const serve = q => {
      if (!livre[q] || usado[q]) return false;
      if (G.tam[comp[q]] < 6 || G.aberto[q] < 13) return false;      // (o corredor e o canto apertado ficam livres)
      if (onde === 'dentro' && G.temDentro) return G.dentro(q);
      if (onde === 'fora') return !G.temDentro || !G.dentro(q) || G.tam[comp[q]] > W * H * 0.5;
      return true;
    };
    const quantos = { grupos: GRUPOS[qtd] || 2, por: POR_GRUPO[qtd] || 6 };
    let lugaresAncora = []; for (let q = 0; q < W * H; q++) if (serve(q)) lugaresAncora.push(q);
    if (!lugaresAncora.length) return [];
    const largos = lugaresAncora.filter(q => G.aberto[q] >= 22);      // a âncora, de preferência no meio de um chão largo
    const nLivres = lugaresAncora.length;
    if (largos.length >= 4) lugaresAncora = largos;
    quantos.grupos = Math.max(1, Math.min(quantos.grupos, Math.floor(nLivres / 30) + 1));
    // o retângulo w × h com o canto em (x, y) cabe? (tudo livre, no mesmo pedaço, sem parede no meio)
    const cabe = (x, y, w, h) => {
      if (x < 0 || y < 0 || x + w > W || y + h > H) return false;
      const k0 = comp[y * W + x];
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
        const q = j * W + i; if (!serve(q) || comp[q] !== k0) return false;
        if (i + 1 < x + w && !G.passa(i, j, 1, 0)) return false;
        if (j + 1 < y + h && !G.passa(i, j, 0, 1)) return false;
      }
      return true;
    };
    // as costas na parede: quantos quadrados do lado pedido têm parede (n, l, s, o)
    const naParede = (x, y, w, h, lado) => {
      let n = 0, tot = 0;
      if (lado === 'n' || lado === 's') for (let i = x; i < x + w; i++) { tot++; const yy = lado === 'n' ? y : y + h; if (yy === 0 || yy === H || G.V.pH[yy * W + i]) n++; }
      else for (let j = y; j < y + h; j++) { tot++; const xx = lado === 'o' ? x : x + w; if (xx === 0 || xx === W || G.V.pV[j * (W + 1) + xx]) n++; }
      return tot ? n / tot : 0;
    };
    const LADOS = ['n', 'l', 's', 'o'];
    const medidas = (id, rot) => { const d = Props.P[id]; if (d.fw) return (rot / 90) % 2 ? [d.fh, d.fw] : [d.fw, d.fh]; const s = d.size || 1; return [s, s]; };
    const marcar = (x, y, w, h) => {
      for (let j = y - 1; j <= y + h; j++) for (let i = x - 1; i <= x + w; i++) { if (i < 0 || j < 0 || i >= W || j >= H) continue; const q = j * W + i; usado[q] = i >= x && i < x + w && j >= y && j < y + h ? 1 : Math.max(usado[q], 2); }
    };
    const novos = [];
    // põe o objeto id num dos quadrados da lista (na ordem); com costas, prefere encostar
    const por = (id, lista) => {
      const d = Props.P[id];
      if (!d) return false;
      const rots = d.fw || d.costas ? [0, 90, 180, 270] : [0];
      let melhor = null;
      for (let k = 0; k < lista.length && k < 140; k++) {
        const q = lista[k], cx = q % W, cy = (q - cx) / W;
        for (const rot of rots) {
          const [w, h] = medidas(id, rot), x = cx - Math.floor((w - 1) / 2), y = cy - Math.floor((h - 1) / 2);
          if (!cabe(x, y, w, h)) continue;
          const enc = d.costas ? naParede(x, y, w, h, LADOS[(LADOS.indexOf(d.costas) + rot / 90) % 4]) : 0;
          const nota = enc - k * 0.02 + (rot === 0 ? 0.05 : 0);
          if (!melhor || nota > melhor.nota) melhor = { x, y, w, h, rot, nota };
          if (!d.costas && melhor) break;
        }
        if (melhor && (!d.costas || melhor.nota > 0.6)) break;
      }
      if (!melhor) return false;
      const t = Props.novo(sc, id, melhor.x * c, melhor.y * c, d.fw ? Math.max(d.fw, d.fh) : d.size || 1, false);
      if (d.fw) { t.fw = d.fw; t.fh = d.fh; t.size = Math.max(d.fw, d.fh); t.x = melhor.x * c; t.y = melhor.y * c; delete t.q0; }
      else { t.x = melhor.x * c; t.y = melhor.y * c; }
      if (melhor.rot) t.rot = melhor.rot;
      else if (!d.fw && !d.costas && r() < 0.5) t.rot = [0, 90, 180, 270][Math.floor(r() * 4)];      // os soltos, virados de qualquer jeito
      marcar(melhor.x, melhor.y, melhor.w, melhor.h);
      novos.push(t);
      return true;
    };
    const ancoras = [];
    for (let g = 0; g < quantos.grupos; g++) {
      // a âncora: o lugar livre mais longe das outras (de 40 sorteados)
      let a = -1, md = -1;
      for (let k = 0; k < 40; k++) {
        const q = lugaresAncora[Math.floor(r() * lugaresAncora.length)];
        if (!serve(q)) continue;
        const x = q % W, y = (q - x) / W, d = (ancoras.length ? Math.min(...ancoras.map(([ax, ay]) => Math.hypot(ax - x, ay - y))) : 1 + r()) * (0.4 + G.aberto[q] / 40);
        if (d > md) { md = d; a = q; }
      }
      if (a < 0) break;
      const ax = a % W, ay = (a - ax) / W; ancoras.push([ax, ay]);
      // os quadrados em volta, por distância (sem cruzar parede), até uns 5 a 7 passos
      const raio = 4 + Math.ceil(quantos.por / 3), dist = new Map([[a, 0]]), fila = [a];
      for (let i = 0; i < fila.length; i++) {
        const u = fila[i], x = u % W, y = (u - x) / W, du = dist.get(u);
        if (du >= raio) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const vx = x + dx, vy = y + dy; if (vx < 0 || vy < 0 || vx >= W || vy >= H) continue; const v = vy * W + vx; if (dist.has(v) || !livre[v] || !G.passa(x, y, dx, dy)) continue; dist.set(v, du + 1); fila.push(v); }
      }
      const perto = fila.slice().sort((p, q) => dist.get(p) - dist.get(q));
      const solta = () => perto.map(q => [q, dist.get(q) + r() * 2.5]).sort((p, q) => p[1] - q[1]).map(x => x[0]);
      // o núcleo (o primeiro que couber, começando por um diferente em cada grupo)
      let feitos = 0;
      for (let k = 0; k < T.nucleo.length; k++) if (por(T.nucleo[(g + k) % T.nucleo.length], perto)) { feitos++; break; }
      // os outros
      const ini = Math.floor(r() * T.itens.length);
      for (let k = 0; k < T.itens.length * 2 && feitos < quantos.por; k++) if (por(T.itens[(ini + k) % T.itens.length], solta())) feitos++;
      if (feitos) novos.grupos = (novos.grupos || 0) + 1;
    }
    return novos;
  }
  const textoFeito = (T, n, grupos) => (n ? `Objetos do tema ${T.n.toLowerCase()}: ${n}${grupos > 1 ? `, em ${grupos} grupos` : ''}.` : `Os objetos do tema ${T.n.toLowerCase()} não couberam (falta chão livre).`);
  // no gerador: na cena recém-criada (os tokens entram direto; a cena é guardada por quem chama)
  // formas: as partes do plano (os prédios, as ruas, o rio, a praça), em quadrados — ali não se põe nada
  function aplicar(sc, lugarId, op, seed, formas) {
    const p = prefs(), id = p.id === 'auto' ? auto(lugarId, op) : p.id, T = tema(id);
    if (!T) return '';
    const ts = espalhar(sc, id, p.qtd, seed, { lugar: lugarId, formas });
    for (const t of ts) sc.tokens.push(t);
    return textoFeito(T, ts.length, ts.grupos || 0);
  }

  /* ---- a escolha: o bloco do gerador e a janelinha da cena pronta ---- */
  function miniaturas(T) {
    const ids = [...new Set(T.nucleo.concat(T.itens))].filter(id => Props.P[id]).slice(0, 10);
    return h('div', { class: 'tema-mini', 'aria-hidden': 'true' }, ids.map(id => { const cv = h('canvas', { width: 40, height: 40, title: Props.P[id].n }); try { Props.thumb(cv, id, 1.3); } catch (e) { /* desenho que precisa do token */ } return cv; }));
  }
  const opcoes = (autoTxt) => [['auto', autoTxt], ['', 'Nenhum']].concat(LISTA.map(x => [x.id, x.n]));
  function controles(K, L, op, mudou) {
    const p = prefs(), au = tema(auto(L.id, op)), T = tema(p.id === 'auto' ? auto(L.id, op) : p.id);
    return [
      K.field('O tema', K.inSelect('ger-tema', p.id, opcoes('Combina com o lugar' + (au ? ` (${au.n.toLowerCase()})` : ' (nenhum aqui)')), v => { App.opt.temaId = v; mudou(); }), 'stack'),
      T ? K.field('Quantos', K.seg('ger-tema-qtd', p.qtd, QTDS, v => { App.opt.temaQtd = v; mudou(); }), 'stack') : null,
      T ? miniaturas(T) : null,
      K.note(T ? `Os objetos entram quando a cena é criada, em ${GRUPOS[p.qtd] === 1 ? 'um grupinho' : GRUPOS[p.qtd] + ' grupinhos'} (um objeto grande e os menores em volta), sem tampar portas. ${T.onde === 'dentro' ? 'Ficam dentro das salas.' : T.onde === 'fora' ? 'Ficam do lado de fora (no quintal, no campo).' : 'Ficam onde houver espaço.'}`
        : p.id === 'auto' ? 'Este lugar não pede nenhum tema. Escolha um na lista para pôr os objetos dele.' : 'Sem objetos de tema.'),
    ].filter(Boolean);
  }
  function resumoBloco(L, op) { const p = prefs(), T = tema(p.id === 'auto' ? auto(L.id, op) : p.id); return T ? T.n.toLowerCase() + (p.id === 'auto' ? ' (automático)' : '') : 'nenhum'; }
  // menu das cenas › "Pôr objetos de um tema…": na cena aberta, com Desfazer
  function abrirNaCena() {
    if (!isGM()) return;
    const sc = Store.scene();
    if (!sc) return;
    const o = { id: tema(App.opt.temaUlt) ? App.opt.temaUlt : 'taverna', qtd: prefs().qtd, onde: 'tema' };
    const K = UI.kit, corpo = h('div', { class: 'tema-cena' });
    const pintarC = () => { const T = tema(o.id); corpo.replaceChildren(
      K.note('Os objetos entram em grupinhos, no chão livre (sem tampar portas nem cruzar paredes). O Desfazer tira todos de uma vez.'),
      K.field('O tema', K.inSelect('tema-cena-id', o.id, LISTA.map(x => [x.id, x.n]), v => { o.id = v; pintarC(); }), 'stack'),
      miniaturas(T),
      K.field('Quantos', K.seg('tema-cena-qtd', o.qtd, QTDS, v => { o.qtd = v; pintarC(); }), 'stack'),
      K.field('Onde', K.seg('tema-cena-onde', o.onde, [['tema', T.onde === 'dentro' ? 'Dentro (o normal deste tema)' : T.onde === 'fora' ? 'Fora (o normal deste tema)' : 'Onde couber'], ['dentro', 'Só dentro das salas']], v => { o.onde = v; pintarC(); }), 'stack')); };
    pintarC();
    UI.modal({ title: 'Pôr objetos de um tema', body: corpo, actions: [{ label: 'Cancelar' }, { label: 'Pôr os objetos', kind: 'primary', run: () => {
      const sc2 = Store.scene(), T = tema(o.id);
      if (!sc2 || !T) return;
      App.opt.temaUlt = o.id;
      const ts = espalhar(sc2, o.id, o.qtd, 1 + Math.floor(Math.random() * 2147483000), { dentro: o.onde === 'dentro' });
      if (ts.length) Store.tx('Objetos do tema', () => { for (const t of ts) Store.add('tokens', t); });
      UI.toast(textoFeito(T, ts.length, ts.grupos || 0), ts.length ? { long: true, action: 'Desfazer', run: Tools.undo } : {});
    } }] });
  }
  return { LISTA, QTDS, tema, auto, prefs, escolhido, grade, espalhar, aplicar, controles, resumoBloco, abrirNaCena };
})();
