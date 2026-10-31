/* ---------------------------------------------------------------
   10g2. MASMORRA — os níveis de baixo (lote 7, parte 4b-3)
   Dois cliques no marcador de Entrada da masmorra (a escada que desce, a boca da caverna, o poço da mina) abrem
   "Gerar o nível": o tipo (a masmorra de pedra, a caverna, a cripta, a mina abandonada), o tamanho e os segredos. O
   nível sai numa cena nova, dentro da de cima (na família de cenas), com a Saída na escada de subida levando de volta
   e, na escada de descida, outra Entrada (oculta) que gera o nível seguinte quando o mestre quiser.
   · a masmorra de pedra: salas e corredores retos, as portas, as celas com as grades, a sala do trono, a guarda, o
     arsenal, o depósito, a biblioteca, o altar e o tesouro;
   · a caverna: os túneis tortos, o lago de baixo da terra, os cogumelos que brilham, as estalagmites (as grandes tapam a
     visão) e o abismo (com a ponte de pedra);
   · a cripta: os corredores estreitos com os nichos dos mortos, os sarcófagos, o ossário, a capela e o jazigo do
     senhor;
   · a mina abandonada: o túnel dos trilhos com os vagonetes, as escoras, as galerias com os veios, o desabamento e o
     poço de descida.
   Com os segredos, as portas secretas (para quem joga, parede; o mestre revela) e as runas-armadilha (escondidas até o
   mestre revelar). Escuro como deve ser: só as tochas, os braseiros, as velas e os cogumelos iluminam. Nada sai escrito.
   (lote 7, parte 4b-3c) A janela "Gerar um lugar…" tem a aba Masmorra: o mesmo nível, sem precisar de uma Entrada — o
   nível escolhido e a cena de cima ("Embaixo de"; sem ela, a cena sai solta, com a Saída ainda sem destino).
   (lote 28) A largura dos corredores (1, 2 ou 3 quadrados, escolhida antes de gerar) e oito estilos novos: o templo,
   o esgoto, a torre de mago, o laboratório, a fortaleza anã, as ruínas élficas, o covil e o navio naufragado.
   --------------------------------------------------------------- */
const Masmorra = (() => {
  const TIPOS = [['pedra', 'Masmorra de pedra'], ['caverna', 'Caverna'], ['cripta', 'Cripta'], ['mina', 'Mina abandonada'],
    // (lote 28) os estilos novos
    ['templo', 'Templo'], ['esgoto', 'Esgoto'], ['torre', 'Torre de mago'], ['laboratorio', 'Laboratório'],
    ['fortaleza', 'Fortaleza anã'], ['ruinas', 'Ruínas élficas'], ['covil', 'Covil'], ['navio', 'Navio naufragado']];
  /* (lote 49) os tipos que não aparecem na lista da aba Masmorra: as catacumbas (a aba Catacumbas), o porão, a cisterna e
     o calabouço (as entradas dos lugares: o alçapão, o poço, a escada do castelo). Valem em tudo o mais. */
  const TIPOS_MAIS = [['ossuario', 'Ossuário antigo'], ['culto', 'Catacumba de culto'], ['inundada', 'Catacumba inundada'], ['nobre', 'Cripta nobre'],
    ['porao', 'Porão'], ['cisterna', 'Cisterna'], ['calabouco', 'Calabouço']];
  const TODOS = TIPOS.concat(TIPOS_MAIS);
  const CATACUMBAS = ['ossuario', 'culto', 'inundada', 'nobre'];
  const NOME = { ossuario: 'Catacumbas', culto: 'Catacumbas do culto', inundada: 'Catacumbas inundadas', nobre: 'Cripta nobre', porao: 'Porão', cisterna: 'Cisterna', calabouco: 'Calabouço', pedra: 'Masmorra', caverna: 'Caverna', cripta: 'Cripta', mina: 'Mina', subsolo: 'Subsolo', arena: 'Arena',
    templo: 'Templo', esgoto: 'Esgoto', torre: 'Torre', laboratorio: 'Laboratório', fortaleza: 'Fortaleza', ruinas: 'Ruínas', covil: 'Covil', navio: 'Navio naufragado' };
  // (lote 28) a largura dos corredores, em quadrados
  const LARGURAS = [[1, '1 quadrado'], [2, '2 quadrados'], [3, '3 quadrados']];
  const largDe = v => (v === 2 || v === 3 || v === '2' || v === '3' ? Number(v) : 1);
  // (sem escolha: a caverna e o covil com os túneis de sempre, uns dois quadrados; o resto, de um)
  const largPadrao = tipo => (tipo === 'caverna' || tipo === 'covil' ? 2 : 1);
  const largEscolhida = v => (v === 1 || v === 2 || v === 3 || v === '1' || v === '2' || v === '3' ? Number(v) : null);
  // os que são de cavar (contorno alisado, sem salas retas)
  const CAVADO = new Set(['caverna', 'subsolo', 'covil']);
  const TAMANHOS = {
    pequeno: { n: 'Pequeno', W: 34, H: 26 },
    medio: { n: 'Médio', W: 46, H: 34 },
    grande: { n: 'Grande', W: 58, H: 42 },
  };
  const sub = (seed, k) => (((Math.imul(seed ^ 0x5bd1e995, 0x01000193 + k * 0x9e3779b1) >>> 0) ^ (k * 0x85ebca6b)) >>> 0) || (k + 1);
  // as casas da grade: a rocha, o chão das salas, o dos corredores, a água, o abismo, o nicho, a ponte
  const ROCHA = 0, SALA = 1, CORREDOR = 2, AGUA = 3, ABISMO = 4, NICHO = 5, PONTE = 6, LAVA = 7, GELO = 8;     // (lote 18: a lava e o gelo do subsolo)
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  /* ================= a grade ================= */
  function nova(W, H) {
    const g = new Uint8Array(W * H);
    const at = (i, j) => (i >= 0 && j >= 0 && i < W && j < H ? g[j * W + i] : ROCHA);
    const pos = (i, j, v) => { if (i >= 0 && j >= 0 && i < W && j < H) g[j * W + i] = v; };
    return { W, H, g, at, pos };
  }

  /* As paredes: a beira entre a rocha e o resto, em trechos retos (as casas são quadrados inteiros). */
  function paredesDaGrade(G, aberto) {
    const { W, H, at } = G, ab = aberto || (v => v !== ROCHA), segs = [];
    for (let j = 0; j <= H; j++) {
      let ini = -1;
      for (let i = 0; i <= W; i++) {
        const b = i < W && ab(at(i, j - 1)) !== ab(at(i, j));
        if (b && ini < 0) ini = i;
        if (!b && ini >= 0) { segs.push({ x1: ini, y1: j, x2: i, y2: j }); ini = -1; }
      }
    }
    for (let i = 0; i <= W; i++) {
      let ini = -1;
      for (let j = 0; j <= H; j++) {
        const b = j < H && ab(at(i - 1, j)) !== ab(at(i, j));
        if (b && ini < 0) ini = j;
        if (!b && ini >= 0) { segs.push({ x1: i, y1: ini, x2: i, y2: j }); ini = -1; }
      }
    }
    return segs;
  }

  /* ================= as salas (a masmorra e a cripta) ================= */
  // a partição do mapa em folhas (cada folha ganha uma sala)
  function folhas(r, W, H, min) {
    const out = [];
    const parte = (x, y, w, h, d) => {
      const podeV = w >= min * 2, podeH = h >= min * 2;
      if (d > 5 || (!podeV && !podeH) || (d >= 3 && r() < 0.12)) { out.push({ x, y, w, h }); return; }
      const vert = podeV && (!podeH || (w > h * 1.2 ? true : h > w * 1.2 ? false : r() < 0.5));
      if (vert) { const c = min + Math.floor(r() * (w - 2 * min + 1)); parte(x, y, c, h, d + 1); parte(x + c, y, w - c, h, d + 1); }
      else { const c = min + Math.floor(r() * (h - 2 * min + 1)); parte(x, y, w, c, d + 1); parte(x, y + c, w, h - c, d + 1); }
    };
    parte(1, 1, W - 2, H - 2, 0);
    return out;
  }

  /* O caminho de um corredor (A*, quatro direções, com custo nas curvas): não atravessa salas nem encosta nelas
     (só nas duas portas das pontas); os corredores que já existem saem mais baratos (os novos se juntam a eles). */
  function caminho(G, de, para, proibido, op) {
    const { W, H, at } = G, N = W * H, curva = (op && op.curva) || 2.5;
    const custo = new Float64Array(N * 4).fill(Infinity), veio = new Int32Array(N * 4).fill(-1);
    const fila = [];   // (um heap simples)
    const empurra = (k, f) => { fila.push([f, k]); let i = fila.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (fila[p][0] <= fila[i][0]) break; [fila[p], fila[i]] = [fila[i], fila[p]]; i = p; } };
    const tira = () => { const top = fila[0], last = fila.pop(); if (fila.length) { fila[0] = last; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < fila.length && fila[a][0] < fila[m][0]) m = a; if (b < fila.length && fila[b][0] < fila[m][0]) m = b; if (m === i) break; [fila[m], fila[i]] = [fila[i], fila[m]]; i = m; } } return top; };
    const hx = (i, j) => Math.abs(i - para[0]) + Math.abs(j - para[1]);
    for (let d = 0; d < 4; d++) { const k = (de[1] * W + de[0]) * 4 + d; custo[k] = 0; empurra(k, hx(de[0], de[1])); }
    let fim = -1;
    while (fila.length) {
      const [f, k] = tira(), c = (k / 4) | 0, d = k % 4, i = c % W, j = (c / W) | 0;
      if (f - hx(i, j) > custo[k] + 1e-9) continue;
      if (i === para[0] && j === para[1]) { fim = k; break; }
      for (let nd = 0; nd < 4; nd++) {
        if ((nd + 2) % 4 === d && !(i === de[0] && j === de[1])) continue;
        const ni = i + DIRS[nd][0], nj = j + DIRS[nd][1];
        if (ni < 1 || nj < 1 || ni >= W - 1 || nj >= H - 1) continue;
        const alvo = ni === para[0] && nj === para[1];
        if (!alvo && proibido(ni, nj)) continue;
        const v = at(ni, nj), passo = v === CORREDOR ? 0.45 : 1;
        const nk = (nj * W + ni) * 4 + nd, nc = custo[k] + passo + (nd !== d && !(i === de[0] && j === de[1]) ? curva : 0);
        if (nc < custo[nk] - 1e-9) { custo[nk] = nc; veio[nk] = k; empurra(nk, nc + hx(ni, nj)); }
      }
    }
    if (fim < 0) return null;
    const pts = [];
    for (let k = fim; k >= 0; k = veio[k]) { const c = (k / 4) | 0; pts.push([c % W, (c / W) | 0]); }
    return pts.reverse();
  }

  /* As salas, os corredores e as portas, numa grade. op: { min (a folha mínima), salaMin, salaMax, laco (a chance de um
     corredor a mais entre salas vizinhas) }. Devolve as salas (com as portas de cada uma) e as ligações. */
  function salasECorredores(G, r, op) {
    const { W, H, at, pos } = G, ri = (a, b) => a + Math.floor(r() * (b - a + 1));
    // (lote 28) dentro: a forma do lugar (a torre é redonda: a sala inteira dentro, o corredor também); larg: os
    // corredores com 1, 2 ou 3 quadrados de largura (a boca, junto da porta, fica de um)
    const dentro = op.dentro || null, larg = largDe(op.larg);
    const fs = folhas(r, W, H, op.min);
    const salas = [];
    for (const f of fs) {
      const w = Math.min(f.w - 2, ri(op.salaMin, op.salaMax)), h = Math.min(f.h - 2, ri(op.salaMin, Math.max(op.salaMin, op.salaMax - 1)));
      if (w < op.salaMin - 1 || h < op.salaMin - 1) continue;
      const x = f.x + 1 + Math.floor(r() * (f.w - 2 - w + 1)), y = f.y + 1 + Math.floor(r() * (f.h - 2 - h + 1));
      if (dentro && !(dentro(x - 1, y - 1) && dentro(x + w, y - 1) && dentro(x - 1, y + h) && dentro(x + w, y + h))) continue;
      salas.push({ i: salas.length, x, y, w, h, portas: [], liga: [] });
    }
    for (const s of salas) for (let j = s.y; j < s.y + s.h; j++) for (let i = s.x; i < s.x + s.w; i++) pos(i, j, SALA);
    // o anel em volta das salas é proibido aos corredores (menos nas portas)
    const salaDe = new Int16Array(W * H).fill(-1);
    for (const s of salas) for (let j = s.y; j < s.y + s.h; j++) for (let i = s.x; i < s.x + s.w; i++) salaDe[j * W + i] = s.i;
    const anel = new Uint8Array(W * H);
    for (const s of salas) for (let j = s.y - 1; j <= s.y + s.h; j++) for (let i = s.x - 1; i <= s.x + s.w; i++) if (i >= 0 && j >= 0 && i < W && j < H && salaDe[j * W + i] < 0) anel[j * W + i] = 1;
    const portaLivre = new Uint8Array(W * H);     // as casas de fora das portas (a ponta do corredor)
    const centro = s => [s.x + s.w / 2, s.y + s.h / 2];
    // a porta de uma sala do lado que dá para a outra: a casa de fora (no anel) e a beira entre ela e a sala
    const portaPara = (s, o) => {
      const [ax, ay] = centro(s), [bx, by] = centro(o), dx = bx - ax, dy = by - ay;
      const lado = Math.abs(dx) * s.h > Math.abs(dy) * s.w ? (dx > 0 ? 'l' : 'o') : dy > 0 ? 's' : 'n';
      const ja = s.portas.filter(p => p.lado === lado);
      if (ja.length && r() < 0.6) return ja[0];
      const ao = lado === 'n' || lado === 's' ? s.w : s.h;
      if (ao < 3) return null;
      for (let t = 0; t < 6; t++) {
        const d = 1 + Math.floor(r() * (ao - 2));
        let fx, fy, b;
        if (lado === 'n') { fx = s.x + d; fy = s.y - 1; b = { x1: fx, y1: s.y, x2: fx + 1, y2: s.y }; }
        else if (lado === 's') { fx = s.x + d; fy = s.y + s.h; b = { x1: fx, y1: fy, x2: fx + 1, y2: fy }; }
        else if (lado === 'o') { fx = s.x - 1; fy = s.y + d; b = { x1: s.x, y1: fy, x2: s.x, y2: fy + 1 }; }
        else { fx = s.x + s.w; fy = s.y + d; b = { x1: fx, y1: fy, x2: fx, y2: fy + 1 }; }
        if (fx < 1 || fy < 1 || fx >= W - 1 || fy >= H - 1) continue;
        // (a casa de fora não pode encostar noutra sala)
        let outra = false;
        for (const [a, c] of DIRS) { const k = salaDe[(fy + c) * W + fx + a]; if (k >= 0 && k !== s.i) outra = true; }
        if (outra) continue;
        if (ja.some(p => Math.abs(p.fx - fx) + Math.abs(p.fy - fy) < 2)) return ja.find(p => Math.abs(p.fx - fx) + Math.abs(p.fy - fy) < 2);
        const p = Object.assign({ lado, fx, fy, sala: s.i }, b);
        s.portas.push(p);
        return p;
      }
      return null;
    };
    // as ligações: a árvore mínima (pela distância dos centros) e alguns laços entre vizinhas
    const pares = [];
    for (let a = 0; a < salas.length; a++) for (let b = a + 1; b < salas.length; b++) { const [ax, ay] = centro(salas[a]), [bx, by] = centro(salas[b]); pares.push([Math.hypot(ax - bx, ay - by), a, b]); }
    pares.sort((p, q) => p[0] - q[0]);
    const pai = salas.map((_, i) => i), raiz = i => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
    const ligacoes = [];
    const ligar = (a, b, laco) => {
      const A = salas[a], B = salas[b], pa = portaPara(A, B), pb = portaPara(B, A);
      if (!pa || !pb) return false;
      portaLivre[pa.fy * W + pa.fx] = 1; portaLivre[pb.fy * W + pb.fx] = 1;
      const proibido = (i, j) => { const k = j * W + i; return salaDe[k] >= 0 || (anel[k] && !portaLivre[k]) || (dentro && !dentro(i, j)); };
      const pts = caminho(G, [pa.fx, pa.fy], [pb.fx, pb.fy], proibido, op.curva ? { curva: op.curva } : null);
      if (!pts || (laco && pts.length > 26)) {
        // (sem corredor: a porta que ninguém usa sai, e a casa dela volta a ser proibida)
        for (const pt of [pa, pb]) if (!pt.usada) portaLivre[pt.fy * W + pt.fx] = 0;
        return false;
      }
      for (const [i, j] of pts) if (at(i, j) === ROCHA) pos(i, j, CORREDOR);
      if (larg > 1) {
        // (o corredor largo: a casa do caminho e as do lado, sem encostar nas salas — o anel delas continua rocha)
        const o0 = Math.floor((larg - 1) / 2);
        for (const [i, j] of pts) for (let b = 0; b < larg; b++) for (let a = 0; a < larg; a++) {
          const x = i + a - o0, y = j + b - o0, k = y * W + x;
          if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || salaDe[k] >= 0 || anel[k] || at(x, y) !== ROCHA || (dentro && !dentro(x, y))) continue;
          pos(x, y, CORREDOR);
        }
      }
      pa.usada = true; pb.usada = true;
      A.liga.push(b); B.liga.push(a);
      ligacoes.push({ a, b, pts, laco: !!laco, pa, pb });
      return true;
    };
    for (const [, a, b] of pares) if (raiz(a) !== raiz(b) && ligar(a, b, false)) pai[raiz(a)] = raiz(b);
    let lacos = 0;
    for (const [d, a, b] of pares) {
      if (lacos >= op.lacos || d > op.min * 2.2) continue;
      if (salas[a].liga.includes(b)) continue;
      if (r() < 0.5 && ligar(a, b, true)) lacos++;
    }
    // as portas que não ganharam corredor saem
    for (const s of salas) s.portas = s.portas.filter(p => p.usada);
    return { salas, ligacoes, salaDe };
  }

  /* A sala mais longe (em passos de sala) de uma; e o grafo das salas. */
  function distancias(salas, de) {
    const d = salas.map(() => Infinity);
    d[de] = 0;
    const fila = [de];
    while (fila.length) { const a = fila.shift(); for (const b of salas[a].liga) if (d[b] === Infinity) { d[b] = d[a] + 1; fila.push(b); } }
    return d;
  }

  /* ================= a masmorra de pedra e a cripta: as salas ================= */
  // o contexto de um nível: a grade, os sorteios, o plano e o que já está ocupado (os móveis, a frente das portas)
  function contexto(p, G, r) {
    const { W, H } = G, oc = new Uint8Array(W * H);
    const ri = (a, b) => a + Math.floor(r() * (b - a + 1)), ent = (a, b) => a + r() * (b - a);
    const pick = a => a[Math.floor(r() * a.length) % a.length];
    const embaralha = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [b[i], b[k]] = [b[k], b[i]]; } return b; };
    const chao = v => v === SALA || v === CORREDOR || v === NICHO || v === PONTE;
    const livre = (i, j) => chao(G.at(i, j)) && !oc[j * W + i];
    const livreS = (i, j, s) => { for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) if (!livre(i + a, j + b)) return false; return true; };
    const ocupaRet = (i, j, w, h, v) => { for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < W && y < H) oc[y * W + x] = v || 1; } };
    const ocupa = (i, j, s, v) => ocupaRet(i, j, s, s, v);
    // um objeto (o canto de cima, à esquerda, em quadrados; s: o tamanho; rot: para onde a frente olha, em graus)
    const poe = (id, i, j, s, rot) => { s = s || 1; if (!livreS(i, j, s)) return false; ocupa(i, j, s); p.objetos.push(Object.assign({ id, x: i, y: j, s }, rot ? { rot } : null)); return true; };
    const pinta = (k, props) => p.pintados.push(Object.assign({ k }, props));
    return { G, W, H, r, ri, ent, pick, embaralha, oc, chao, livre, livreS, ocupa, ocupaRet, poe, pinta, p };
  }
  const ROT_FRENTE = { s: 0, n: 180, o: 90, l: 270 };            // a frente do objeto olha para esse lado
  const OPOSTO = { n: 's', s: 'n', o: 'l', l: 'o' };
  // as casas de dentro de uma sala encostadas num lado (sem os cantos quando pedido)
  function beira(q, lado, cantos) {
    const out = [], a = cantos ? 0 : 1;
    if (lado === 'n') for (let i = q.x + a; i < q.x + q.w - a; i++) out.push([i, q.y]);
    else if (lado === 's') for (let i = q.x + a; i < q.x + q.w - a; i++) out.push([i, q.y + q.h - 1]);
    else if (lado === 'o') for (let j = q.y + a; j < q.y + q.h - a; j++) out.push([q.x, j]);
    else for (let j = q.y + a; j < q.y + q.h - a; j++) out.push([q.x + q.w - 1, j]);
    return out;
  }
  // a casa de dentro, logo depois da porta
  const dentroDaPorta = pt => (pt.lado === 'n' ? [pt.fx, pt.fy + 1] : pt.lado === 's' ? [pt.fx, pt.fy - 1] : pt.lado === 'o' ? [pt.fx + 1, pt.fy] : [pt.fx - 1, pt.fy]);

  /* A escada (dois por dois, encostada num lado sem porta): a de subida leva de volta (a Saída); a de descida, ao nível
     de baixo (a Entrada). */
  function escada(C, q, sobe) {
    const { p, r } = C;
    const ladosComPorta = new Set(q.portas.map(pt => pt.lado));
    const lados = ['n', 's', 'o', 'l'].filter(l => !ladosComPorta.has(l));
    const ordem = C.embaralha(lados.length ? lados : ['n', 's', 'o', 'l']);
    for (const lado of ordem) {
      const horiz = lado === 'n' || lado === 's', ao = horiz ? q.w : q.h;
      if (ao < 3) continue;
      const opcoes = [];
      for (let d = 0; d + 2 <= ao; d++) {
        const x = horiz ? q.x + d : lado === 'o' ? q.x : q.x + q.w - 2, y = horiz ? (lado === 'n' ? q.y : q.y + q.h - 2) : q.y + d;
        if (C.livreS(x, y, 2)) opcoes.push([x, y, Math.abs(d + 1 - ao / 2)]);
      }
      if (!opcoes.length) continue;
      opcoes.sort((a, b) => a[2] - b[2]);
      const [x, y] = opcoes[Math.floor(r() * Math.min(2, opcoes.length))];
      C.ocupa(x, y, 2, 2);
      // a frente da escada (por onde se chega a ela) fica livre
      const fx = lado === 'o' ? x + 2 : lado === 'l' ? x - 1 : x, fy = lado === 'n' ? y + 2 : lado === 's' ? y - 1 : y;
      for (let k = 0; k < 2; k++) { const i = horiz ? fx + k : fx, j = horiz ? fy : fy + k; if (C.livre(i, j)) C.ocupa(i, j, 1, 2); }
      const e = { x, y, w: 2, h: 2, lado, sobe: !!sobe };
      C.pinta('escada', e);
      // o marcador: na casa da escada do lado de onde se chega a ela
      return Object.assign(e, { mi: lado === 'o' ? x + 1 : x, mj: lado === 'n' ? y + 1 : y });
    }
    return null;
  }

  /* (lote 28) Os estilos de salas e corredores: o tamanho das salas, o que cada uma vira, a chance de arco (a passagem
     sem porta) e de porta trancada, e o que vem depois dos móveis. A masmorra de pedra e a cripta são as de sempre. */
  const BIG = T => T.W > 50;
  const ESTILOS_SALAS = {
    pedra: { op: T => ({ min: BIG(T) ? 11 : 10, salaMin: 4, salaMax: 9, lacos: BIG(T) ? 3 : 2 }), principal: C => (C.r() < 0.6 ? 'trono' : 'salao'), resto: restoDaPedra, arco: 0.22, tranca: 0.12 },
    cripta: { op: T => ({ min: BIG(T) ? 9 : 8, salaMin: 3, salaMax: 7, lacos: BIG(T) ? 3 : 2 }), principal: () => 'jazigo', resto: restoDaCripta, arco: 0.12, tranca: 0.12, depois: C => nichosDosCorredores(C) },
    templo: { op: T => ({ min: BIG(T) ? 12 : 11, salaMin: 5, salaMax: 10, lacos: 2 }), principal: () => 'nave',
      resto: (C, resto) => fila(C, resto, ['claustro', 'capela', 'sacristia', 'dormitorio', 'biblioteca', 'capela', 'dormitorio', 'vazia'], { claustro: q => q.w >= 5 && q.h >= 5 }), arco: 0.45, tranca: 0.06 },
    esgoto: { op: T => ({ min: BIG(T) ? 10 : 9, salaMin: 3, salaMax: 7, lacos: BIG(T) ? 4 : 3, curva: 1.2 }), principal: () => 'cisterna',
      resto: (C, resto) => fila(C, resto, ['juncao', 'ratos', 'esconderijo', 'juncao', 'deposito', 'ratos', 'vazia']), arco: 0.6, tranca: 0.05, depois: canaisDoEsgoto, semTochas: true },
    torre: { op: (T, W, H) => (T.W < 40 ? { min: 6, salaMin: 3, salaMax: 5, lacos: 1, dentro: dentroDaTorre(W, H) } : { min: 7, salaMin: 3, salaMax: 6, lacos: 2, dentro: dentroDaTorre(W, H) }), principal: () => 'circulo',
      resto: (C, resto) => fila(C, resto, ['biblioteca', 'alquimia', 'observatorio', 'quarto', 'deposito', 'biblioteca']), arco: 0.15, tranca: 0.2, depois: anelDaTorre },
    laboratorio: { op: T => ({ min: BIG(T) ? 11 : 10, salaMin: 4, salaMax: 8, lacos: 2 }), principal: () => 'bancada',
      resto: (C, resto) => { const j = resto.filter(q => !q.papel && Math.min(q.w, q.h) >= 5 && (q.celas = ladoDasCelas(q))).sort((a, b) => b.w * b.h - a.w * a.h)[0]; if (j) j.papel = 'jaulas'; fila(C, resto, ['tanques', 'caldeirao', 'biblioteca', 'deposito', 'tanques', 'incinerador', 'vazia']); }, arco: 0.1, tranca: 0.25 },
    fortaleza: { op: T => ({ min: BIG(T) ? 13 : 12, salaMin: 5, salaMax: 11, lacos: BIG(T) ? 3 : 2, curva: 5 }), principal: () => 'trono',
      resto: (C, resto, x) => { const perto = resto.filter(q => !q.papel && (q.liga.includes(x.entrada.i) || (x.principal && q.liga.includes(x.principal.i)))); if (perto.length) perto[0].papel = 'guarda'; fila(C, resto, ['forja', 'quartel', 'salao', 'cervejaria', 'arsenal', 'deposito', 'quartel', 'forja']); }, arco: 0.2, tranca: 0.18 },
    ruinas: { op: T => ({ min: BIG(T) ? 11 : 10, salaMin: 4, salaMax: 9, lacos: 3 }), principal: () => 'salaoRuido',
      resto: (C, resto) => fila(C, resto, ['jardim', 'fonte', 'biblioteca', 'altar', 'jardim', 'vazia', 'vazia']), arco: 0.55, tranca: 0, antesDasParedes: ruirAsParedes },
  };
  // (lote 49) as catacumbas, o porão, a cisterna e o calabouço
  Object.assign(ESTILOS_SALAS, {
    ossuario: { op: T => ({ min: BIG(T) ? 11 : 9, salaMin: 3, salaMax: 6, lacos: BIG(T) ? 4 : 3, curva: 1.5 }), principal: () => 'ossario',
      resto: (C, resto) => fila(C, resto, ['ossario', 'nichos', 'familia', 'desabado', 'nichos', 'ossario', 'familia', 'vazia'], { familia: q => q.w >= 4 && q.h >= 4 }), arco: 0.6, tranca: 0.04, depois: C => { nichosDosCorredores(C); desabamentos(C); } },
    culto: { op: T => ({ min: BIG(T) ? 10 : 9, salaMin: 3, salaMax: 8, lacos: 2 }), principal: () => 'santuario',
      resto: (C, resto) => fila(C, resto, ['ossario', 'nichos', 'sacrificio', 'celas', 'biblioteca', 'nichos', 'vazia'], { celas: q => Math.min(q.w, q.h) >= 5 && (q.celas = ladoDasCelas(q)), sacrificio: q => q.w >= 4 && q.h >= 4 }), arco: 0.35, tranca: 0.15, depois: C => nichosDosCorredores(C) },
    inundada: { op: T => ({ min: BIG(T) ? 10 : 9, salaMin: 3, salaMax: 7, lacos: BIG(T) ? 3 : 2 }), principal: () => 'cisternaVelha',
      resto: (C, resto) => fila(C, resto, ['alagada', 'nichos', 'ossario', 'alagada', 'familia', 'vazia'], { familia: q => q.w >= 4 && q.h >= 4 }), arco: 0.5, tranca: 0.05, depois: C => nichosDosCorredores(C), semTochas: true },
    nobre: { op: T => ({ min: BIG(T) ? 10 : 9, salaMin: 4, salaMax: 8, lacos: 2 }), principal: () => 'jazigo',
      resto: (C, resto) => fila(C, resto, ['familia', 'familia', 'capela', 'galeria', 'sarcofagos', 'familia', 'vazia'], { familia: q => q.w >= 4 && q.h >= 4 }), arco: 0.1, tranca: 0.25, depois: portoesNasPortas },
    porao: { op: () => ({ min: 4, salaMin: 3, salaMax: 6, lacos: 1 }), principal: () => 'adega',
      resto: (C, resto) => fila(C, resto, ['deposito', 'porao', 'escondPorao', 'deposito']), arco: 0.4, tranca: 0.2 },
    cisterna: { op: () => ({ min: 5, salaMin: 3, salaMax: 7, lacos: 2, curva: 1.2 }), principal: () => 'cisterna',
      resto: (C, resto) => fila(C, resto, ['juncao', 'alagada', 'ratos', 'vazia']), arco: 0.7, tranca: 0.05, depois: canaisDoEsgoto, semTochas: true },
    calabouco: { op: T => ({ min: BIG(T) ? 9 : 7, salaMin: 4, salaMax: 8, lacos: 2 }), principal: C => 'celas',
      resto: (C, resto, x) => { const perto = resto.filter(q => !q.papel && q.liga.includes(x.entrada.i)); if (perto.length) perto[0].papel = 'guarda';
        fila(C, resto, ['celas', 'tortura', 'deposito', 'arsenal', 'celas', 'vazia'], { celas: q => Math.min(q.w, q.h) >= 5 && (q.celas = ladoDasCelas(q)) }); }, arco: 0.1, tranca: 0.35 },
  });
  // (o calabouço precisa do lado das celas na sala principal)
  const principalCelas = ESTILOS_SALAS.calabouco;
  principalCelas.principal = C => 'celasP';
  // as portas de ferro da cripta nobre: algumas portas viram portões (o objeto, que abre e fecha e barra)
  function portoesNasPortas(C) {
    const p = C.p, novas = [];
    for (const w of p.paredes) {
      if (w.k !== 'door' || w.secret || C.r() > 0.55) { novas.push(w); continue; }
      const horiz = Math.abs(w.y1 - w.y2) < 0.01;
      p.objetos.push(horiz ? { id: 'portao', x: Math.min(w.x1, w.x2), y: w.y1 - 0.5, s: 1 } : { id: 'portao', x: w.x1 - 0.5, y: Math.min(w.y1, w.y2), s: 1, rot: 90 });
    }
    p.paredes = novas;
  }
  // os túneis desabados do ossuário: o entulho que fecha o fim de alguns corredores
  function desabamentos(C) {
    const { G, W, H } = C;
    for (let j = 1, n = 0; j < H - 1 && n < 4; j++) for (let i = 1; i < W - 1 && n < 4; i++) {
      if (G.at(i, j) !== CORREDOR || !C.livre(i, j) || C.r() > 0.012) continue;
      C.pinta('entulho', { x: i + 0.5, y: j + 0.5, r: 1.1 }); C.ocupa(i, j, 1, 1); n++;
    }
  }
  // os papéis das salas que sobraram, na ordem embaralhada; o que pede tamanho (cond) só vai para quem cabe
  function fila(C, resto, lista, cond) {
    const f = C.embaralha(lista);
    for (const q of resto) {
      if (q.papel) continue;
      const k = f.findIndex(papel => !(cond && cond[papel]) || cond[papel](q));
      q.papel = k >= 0 ? f.splice(k, 1)[0] : 'vazia';
    }
  }
  function restoDaCripta(C, resto) {
    const area = q => q.w * q.h;
    const capela = resto.filter(q => !q.papel && q.w >= 4 && q.h >= 4).sort((a, b) => area(b) - area(a))[0];
    if (capela) capela.papel = 'capela';
    const fila = C.embaralha(['ossario', 'sarcofagos', 'sarcofagos', 'nichos', 'ossario', 'nichos']);
    for (const q of resto) if (!q.papel) q.papel = q.w >= 4 && q.h >= 4 && fila.length ? fila.shift() : 'nichos';
  }
  function restoDaPedra(C, resto, x) {
    const { r } = C, area = q => q.w * q.h;
    // as celas: uma sala com as portas todas de um lado comprido (o corredor das grades corre por ele)
    const celas = resto.filter(q => !q.papel && Math.min(q.w, q.h) >= 5 && (q.celas = ladoDasCelas(q))).sort((a, b) => area(b) - area(a))[0];
    if (celas && r() < 0.85) celas.papel = 'celas';
    // a guarda: perto da entrada ou da sala principal
    const perto = resto.filter(q => !q.papel && (q.liga.includes(x.entrada.i) || (x.principal && q.liga.includes(x.principal.i))));
    if (perto.length) perto[0].papel = 'guarda';
    const fila = C.embaralha(['deposito', 'arsenal', 'biblioteca', 'altar', 'poco', 'deposito', 'vazia', 'biblioteca', 'vazia']);
    for (const q of resto) if (!q.papel) q.papel = fila.length ? fila.shift() : 'vazia';
  }

  /* A masmorra de pedra, a cripta e os estilos de salas (lote 28). */
  function nivelDeSalas(C) {
    const { G, r, p, W, H } = C, E = ESTILOS_SALAS[p.tipo] || ESTILOS_SALAS.pedra;
    const T = TAMANHOS[p.tamanho];
    const op = Object.assign(E.op(T, W, H), { larg: p.larg });
    const { salas, ligacoes } = salasECorredores(G, r, op);
    // a entrada: a sala mais perto de um lado sorteado; a descida: a mais longe dela (em passos de sala)
    const lado0 = C.pick(['n', 's', 'o', 'l']), daBorda = q => (lado0 === 'n' ? q.y : lado0 === 's' ? H - q.y - q.h : lado0 === 'o' ? q.x : W - q.x - q.w);
    const entrada = salas.slice().sort((a, b) => daBorda(a) - daBorda(b))[0];
    if (!entrada) return;                                  // (nenhuma sala coube: o sorteio tenta de novo)
    const dist = distancias(salas, entrada.i);
    // (as salas que ficaram fora da rede voltam a ser rocha)
    for (const q of salas) if (dist[q.i] === Infinity) { for (let j = q.y; j < q.y + q.h; j++) for (let i = q.x; i < q.x + q.w; i++) G.pos(i, j, ROCHA); q.fora = true; }
    const vivas = salas.filter(q => !q.fora);
    const descida = vivas.filter(q => q !== entrada).sort((a, b) => dist[b.i] - dist[a.i] || b.w * b.h - a.w * a.h)[0] || null;
    entrada.papel = 'entrada';
    if (descida) descida.papel = 'descida';
    const resto = vivas.filter(q => !q.papel);
    const grau = q => q.liga.filter(k => !salas[k].fora).length;
    const area = q => q.w * q.h;
    // o tesouro: uma sala sem saída (uma porta só), a menor; atrás de porta secreta quando há segredos
    const tesouro = resto.filter(q => grau(q) === 1 && q.portas.length === 1).sort((a, b) => area(a) - area(b))[0] || null;
    if (tesouro) tesouro.papel = 'tesouro';
    // a sala principal: a maior (o trono ou o salão das colunas; na cripta, o jazigo do senhor; nos estilos do lote 28,
    // a nave do templo, a cisterna, o círculo da torre, a bancada, o trono anão, o salão em ruínas)
    const principal = resto.filter(q => !q.papel && q.w >= 5 && q.h >= 5).sort((a, b) => area(b) - area(a))[0] || null;
    if (principal) principal.papel = E.principal(C);
    E.resto(C, resto, { entrada, principal });
    p.salas = vivas.map(q => ({ x: q.x, y: q.y, w: q.w, h: q.h, papel: q.papel }));
    // as escadas (antes dos móveis: a frente delas fica livre)
    p.sobe = escada(C, entrada, true);
    p.desce = p.descida && descida ? escada(C, descida, false) : null;
    // as portas: a frente de dentro de cada uma fica livre; o tipo (de madeira, arco aberto, trancada, secreta)
    const portas = [];
    for (const q of vivas) for (const pt of q.portas) {
      const [i, j] = dentroDaPorta(pt);
      if (C.livre(i, j)) C.ocupa(i, j, 1, 2);
      portas.push(Object.assign(pt, { q }));
    }
    for (const lg of ligacoes) {
      if (salas[lg.a].fora || salas[lg.b].fora) continue;
      // (o corredor curtinho, de uma casa ou duas: uma porta só, a outra fica em arco)
      if (lg.pts.length <= 2) { const outra = r() < 0.5 ? lg.pa : lg.pb; outra.arco = true; }
    }
    for (const pt of portas) {
      if (pt.arco) continue;
      if (r() < E.arco) { pt.arco = true; continue; }
      if (r() < E.tranca) pt.trancada = true;
    }
    if (p.segredos && tesouro) { const pt = tesouro.portas[0]; pt.arco = false; pt.secreta = true; pt.trancada = false; }
    // (uma porta secreta a mais num laço, quando há: um atalho que ninguém conhece)
    if (p.segredos) {
      const lacos = ligacoes.filter(lg => lg.laco && !salas[lg.a].fora && !salas[lg.b].fora && lg.pts.length > 3);
      if (lacos.length && r() < 0.7) { const lg = C.pick(lacos), pt = r() < 0.5 ? lg.pa : lg.pb; pt.arco = false; pt.secreta = true; pt.trancada = false; }
    }
    // (lote 28) as ruínas: as paredes que caíram, antes de as paredes saírem da grade
    if (E.antesDasParedes) E.antesDasParedes(C);
    // as paredes: a beira da rocha; as portas por cima das bocas dos corredores
    p.paredes = paredesDaGrade(G).map(s => Object.assign(s, { k: 'wall' }));
    const vistas = new Set();
    for (const pt of portas) {
      const key = [pt.x1, pt.y1, pt.x2, pt.y2].join(',');
      if (vistas.has(key) || pt.arco) continue;
      vistas.add(key);
      p.paredes.push(Object.assign({ x1: pt.x1, y1: pt.y1, x2: pt.x2, y2: pt.y2, k: 'door' }, pt.secreta ? { secret: true } : null, pt.trancada ? { locked: true } : null));
    }
    // o que tem em cada sala
    for (const q of vivas) MOBILIA[q.papel] && MOBILIA[q.papel](C, q);
    if (E.depois) E.depois(C, { ligacoes: ligacoes.filter(lg => !salas[lg.a].fora && !salas[lg.b].fora), vivas });
    // as runas-armadilha (escondidas): na frente do tesouro, num cruzamento de corredores, na frente do trono/jazigo
    if (p.segredos) runas(C, tesouro, principal);
    // as tochas dos corredores (poucas: a masmorra é escura)
    if (!E.semTochas) tochasDosCorredores(C);
    // enfeites: as teias nos cantos, o entulho e os ossos espalhados
    enfeites(C);
  }

  // o lado da sala de onde vêm as portas (o mais usado) e o do fundo (o oposto)
  const ladoDasPortas = q => { const n = {}; for (const pt of q.portas) n[pt.lado] = (n[pt.lado] || 0) + 1; return Object.keys(n).sort((a, b) => n[b] - n[a])[0] || 's'; };
  // uma casa livre encostada num lado (sorteada entre as do meio)
  function naBeira(C, q, lado, s, meio) {
    s = s || 1;
    const opcoes = beira(q, lado, false).filter(([i, j]) => {
      const x = lado === 'l' ? i - s + 1 : i, y = lado === 's' ? j - s + 1 : j;
      return C.livreS(x, y, s);
    }).map(([i, j]) => [lado === 'l' ? i - s + 1 : i, lado === 's' ? j - s + 1 : j]);
    if (!opcoes.length) return null;
    if (meio) { const c = lado === 'n' || lado === 's' ? q.x + q.w / 2 - s / 2 : q.y + q.h / 2 - s / 2; opcoes.sort((a, b) => Math.abs((lado === 'n' || lado === 's' ? a[0] : a[1]) - c) - Math.abs((lado === 'n' || lado === 's' ? b[0] : b[1]) - c)); return opcoes[0]; }
    return opcoes[Math.floor(C.r() * opcoes.length) % opcoes.length];
  }
  // encosta n objetos nas paredes (de costas para elas)
  function encosta(C, q, id, n, s) {
    let k = 0;
    for (let t = 0; t < n * 4 && k < n; t++) {
      const lado = C.pick(['n', 's', 'o', 'l']), e = naBeira(C, q, lado, s);
      if (e && C.poe(id, e[0], e[1], s, ROT_FRENTE[OPOSTO[lado]])) k++;
    }
    return k;
  }
  // um objeto num canto livre (ou perto dele)
  function noCanto(C, q, id, s) {
    s = s || 1;
    const cantos = C.embaralha([[q.x, q.y], [q.x + q.w - s, q.y], [q.x, q.y + q.h - s], [q.x + q.w - s, q.y + q.h - s]]);
    for (const [i, j] of cantos) if (C.poe(id, i, j, s)) return [i, j];
    return null;
  }
  // a coluna: pintada, com as paredes de visão em volta (tapa a visão)
  function coluna(C, x, y, rr) {
    C.pinta('coluna', { x, y, r: rr });
    C.ocupa(Math.floor(x), Math.floor(y), 1, 1);
    const n = 8, pts = [];
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU; pts.push([x + Math.cos(a) * rr * 0.92, y + Math.sin(a) * rr * 0.92]); }
    for (let k = 0; k < n; k++) { const a = pts[k], b = pts[(k + 1) % n]; C.p.visao.push([a[0], a[1], b[0], b[1]]); }
  }
  // a luz de um objeto de fogo vem dele; a dos cogumelos e a do fundo, daqui
  const luz = (C, x, y, dim, cor, bright) => C.p.luzes.push({ x, y, dim, bright: bright || Math.max(1, dim * 0.4), c: cor });

  // as celas: ao longo de um lado sem porta, com d casas de fundo; as portas dos lados vizinhos não caem nelas
  function ladoDasCelas(q) {
    const opc = [];
    for (const S of ['n', 's', 'o', 'l']) {
      if (q.portas.some(pt => pt.lado === S)) continue;
      const horiz = S === 'n' || S === 's', perp = horiz ? q.h : q.w, ao = horiz ? q.w : q.h;
      if (ao < 4) continue;
      const d = perp >= 7 ? 3 : 2;
      if (perp - d < 2) continue;
      const ruim = q.portas.some(pt => {
        if (horiz && (pt.lado === 'o' || pt.lado === 'l')) { const v = pt.fy - q.y; return S === 'n' ? v < d : v >= q.h - d; }
        if (!horiz && (pt.lado === 'n' || pt.lado === 's')) { const u = pt.fx - q.x; return S === 'o' ? u < d : u >= q.w - d; }
        return false;
      });
      if (!ruim) opc.push([S, d, ao]);
    }
    opc.sort((a, b) => b[2] - a[2]);
    return opc.length ? opc[0] : null;
  }
  const MOBILIA = {
    entrada(C, q) { if (C.r() < 0.7) noCanto(C, q, 'barril'); encosta(C, q, 'tocha', 1); if (C.r() < 0.5) noCanto(C, q, 'caixote'); },
    descida(C, q) { if (C.r() < 0.5) noCanto(C, q, 'caixote'); if (C.r() < 0.6) C.pinta('entulho', { x: q.x + C.ent(0.5, q.w - 0.5), y: q.y + C.ent(0.5, q.h - 0.5), r: 0.8 }); },
    trono(C, q) {
      // o estrado no fundo (o lado oposto ao das portas), o trono no meio dele, de frente para a porta; os braseiros dos
      // lados; as colunas em duas fileiras; o tapete da porta ao estrado; as estátuas nos cantos de trás
      const lp = ladoDasPortas(q), fundo = OPOSTO[lp], horiz = fundo === 'n' || fundo === 's';
      const ew = Math.min(horiz ? q.w - 2 : q.h - 2, 4), x = horiz ? Math.round(q.x + q.w / 2 - ew / 2) : fundo === 'o' ? q.x : q.x + q.w - 2, y = horiz ? (fundo === 'n' ? q.y : q.y + q.h - 2) : Math.round(q.y + q.h / 2 - ew / 2);
      const est = horiz ? { x, y, w: ew, h: 2 } : { x, y, w: 2, h: ew };
      C.p.relevo.push({ t: 'plataforma', alt: 0.5, k: 'rect', x: est.x + 0.05, y: est.y + 0.05, w: est.w - 0.1, h: est.h - 0.1 });
      C.pinta('estrado', est);
      const tx = horiz ? Math.floor(est.x + est.w / 2 - 0.5) : fundo === 'o' ? est.x : est.x + 1, ty = horiz ? (fundo === 'n' ? est.y : est.y + 1) : Math.floor(est.y + est.h / 2 - 0.5);
      C.poe('cadeira', tx, ty, 1, ROT_FRENTE[lp]);
      C.pinta('trono', { x: tx + 0.5, y: ty + 0.5, rot: ROT_FRENTE[lp] });
      C.ocupaRet(est.x, est.y, est.w, est.h, 1);
      const lad = horiz ? [[est.x - 1, ty], [est.x + est.w, ty]] : [[tx, est.y - 1], [tx, est.y + est.h]];
      for (const [i, j] of lad) C.poe('braseiro', i, j);
      if (q.w >= 7 && q.h >= 6) {
        // as colunas: duas fileiras ao longo da sala (da porta ao estrado)
        const passo = 2;
        if (horiz) { for (let j = q.y + (fundo === 'n' ? 3 : 1); j < q.y + q.h - (fundo === 's' ? 3 : 1); j += passo) for (const i of [q.x + 1, q.x + q.w - 2]) if (C.livre(i, j)) coluna(C, i + 0.5, j + 0.5, 0.42); }
        else { for (let i = q.x + (fundo === 'o' ? 3 : 1); i < q.x + q.w - (fundo === 'l' ? 3 : 1); i += passo) for (const j of [q.y + 1, q.y + q.h - 2]) if (C.livre(i, j)) coluna(C, i + 0.5, j + 0.5, 0.42); }
      }
      // o tapete: do estrado até a porta (pintado, por baixo de tudo)
      const pt = q.portas.find(k => k.lado === lp) || q.portas[0];
      if (pt) C.pinta('tapete', horiz ? { x: tx - 0.1, y: Math.min(ty, pt.fy) + 0.5, w: 1.2, h: Math.abs(ty - pt.fy) } : { x: Math.min(tx, pt.fx) + 0.5, y: ty - 0.1, w: Math.abs(tx - pt.fx), h: 1.2 });
      noCanto(C, q, 'estatua'); noCanto(C, q, 'estatua');
    },
    salao(C, q) {
      // o salão das colunas: a grade de colunas (de duas em duas casas, longe das paredes) e os braseiros
      for (let j = q.y + 1; j < q.y + q.h - 1; j += 2) for (let i = q.x + 1; i < q.x + q.w - 1; i += 2) if (C.livre(i, j) && (i - q.x) % 2 === 1) coluna(C, i + 0.5, j + 0.5, 0.4);
      noCanto(C, q, 'braseiro'); noCanto(C, q, 'braseiro');
      if (C.r() < 0.5) C.pinta('entulho', { x: q.x + C.ent(1, q.w - 1), y: q.y + C.ent(1, q.h - 1), r: 1 });
    },
    guarda(C, q) {
      const mx = Math.floor(q.x + q.w / 2 - 1), my = Math.floor(q.y + q.h / 2 - 1);
      if (C.poe('mesa', mx, my, 2)) {
        const lugares = C.embaralha([[mx - 1, my, 270], [mx + 2, my + 1, 90], [mx, my - 1, 0], [mx + 1, my + 2, 180]]);
        let n = 0;
        for (const [i, j, rot] of lugares) if (n < 3 && C.poe('cadeira', i, j, 1, rot)) n++;
      }
      encosta(C, q, 'armas', 2); noCanto(C, q, 'barril'); encosta(C, q, 'tocha', 1);
      if (C.r() < 0.5) noCanto(C, q, 'bau');
      if (C.r() < 0.4) noCanto(C, q, 'jaula');          // (lote 39)
    },
    arsenal(C, q) { encosta(C, q, 'armas', Math.min(5, 2 + Math.floor(q.w * q.h / 12))); encosta(C, q, 'estante', 1, 2); noCanto(C, q, 'caixote'); noCanto(C, q, 'caixote'); },
    deposito(C, q) {
      const n = Math.min(8, 3 + Math.floor(q.w * q.h / 8));
      for (let k = 0; k < n; k++) { const id = C.r() < 0.5 ? 'barril' : C.r() < 0.7 ? 'caixote' : 'jarro'; if (!noCanto(C, q, id)) encosta(C, q, id, 1); }
      if (C.r() < 0.4) C.pinta('teia', { x: q.x, y: q.y, canto: 'no' });
    },
    biblioteca(C, q) {
      encosta(C, q, 'estante', Math.min(4, 1 + Math.floor((q.w + q.h) / 5)), 2);
      const mx = Math.floor(q.x + q.w / 2 - 1), my = Math.floor(q.y + q.h / 2 - 1);
      if (C.poe('mesa', mx, my, 2)) { C.poe('cadeira', mx - 1, my, 1, 270) || C.poe('cadeira', mx + 2, my, 1, 90); C.poe('vela', mx + 2, my + 1) || C.poe('vela', mx - 1, my + 1); }
    },
    altar(C, q) {
      const lp = ladoDasPortas(q), fundo = OPOSTO[lp], e = naBeira(C, q, fundo, 1, true);
      if (e) {
        C.poe('altar', e[0], e[1], 1, ROT_FRENTE[lp]);
        const horiz = fundo === 'n' || fundo === 's', lados = horiz ? [[e[0] - 1, e[1]], [e[0] + 1, e[1]]] : [[e[0], e[1] - 1], [e[0], e[1] + 1]];
        for (const [i, j] of lados) C.poe('vela', i, j);
        // os bancos, em fileiras, de frente para o altar
        for (let k = 2; k < 6; k += 2) for (const d of [-2, 2]) {
          const i = horiz ? e[0] + d : fundo === 'o' ? e[0] + k : e[0] - k, j = horiz ? (fundo === 'n' ? e[1] + k : e[1] - k) : e[1] + d;
          if (i > q.x && j > q.y && i < q.x + q.w - 1 && j < q.y + q.h - 1) C.poe('banco', i, j, 1, ROT_FRENTE[fundo]);
        }
      }
      if (C.r() < 0.6) noCanto(C, q, 'estatua');
      if (C.r() < 0.3) noCanto(C, q, 'caldeirao');          // (lote 39)
    },
    poco(C, q) { C.poe('poco', Math.floor(q.x + q.w / 2), Math.floor(q.y + q.h / 2)); noCanto(C, q, 'barril'); if (C.r() < 0.5) noCanto(C, q, 'jarro'); },
    vazia(C, q) {
      for (let k = 0, n = 1 + Math.floor(C.r() * 2); k < n; k++) C.pinta('entulho', { x: q.x + C.ent(0.8, q.w - 0.8), y: q.y + C.ent(0.8, q.h - 0.8), r: C.ent(0.6, 1.2) });
      if (C.r() < 0.6) C.pinta('ossos', { x: q.x + C.ent(0.8, q.w - 0.8), y: q.y + C.ent(0.8, q.h - 0.8), n: 3 });
      if (C.r() < 0.5) noCanto(C, q, 'caixote');
      if (C.r() < 0.2) noCanto(C, q, 'cranios');          // (lote 39)
    },
    tesouro(C, q) {
      let n = 0;
      for (let t = 0; t < 8 && n < 3; t++) { const lado = C.pick(['n', 's', 'o', 'l']), e = naBeira(C, q, lado, 1); if (e && C.poe('bau', e[0], e[1], 1, ROT_FRENTE[OPOSTO[lado]])) n++; }
      noCanto(C, q, 'jarro'); noCanto(C, q, 'jarro');
      if (C.r() < 0.6) noCanto(C, q, 'estatua');
      if (C.r() < 0.4) noCanto(C, q, 'cofre');          // (lote 39)
      C.pinta('moedas', { x: q.x + q.w / 2, y: q.y + q.h / 2, r: Math.min(q.w, q.h) * 0.3 });
    },
    celas(C, q) {
      // as celas ao longo de um lado sem porta (o fundo delas): de duas ou três casas de largura, separadas por paredes,
      // com a frente de grades (mureta) e a portinhola de grade (janela: abre e deixa ver); o resto da sala é o corredor
      // da guarda
      const [S, d] = q.celas, horiz = S === 'n' || S === 's', ao = horiz ? q.w : q.h, larg = ao >= 9 ? 3 : 2, n = Math.floor(ao / larg);
      const linha = S === 'n' ? q.y + d : S === 's' ? q.y + q.h - d : S === 'o' ? q.x + d : q.x + q.w - d;   // a frente das celas
      const fundo = S === 'n' ? q.y : S === 's' ? q.y + q.h : S === 'o' ? q.x : q.x + q.w;                 // a parede do fundo
      const ini = horiz ? q.x : q.y;
      const seg = (u1, u2, kk) => C.p.paredes.push(horiz ? { x1: u1, y1: linha, x2: u2, y2: linha, k: kk } : { x1: linha, y1: u1, x2: linha, y2: u2, k: kk });
      for (let k = 0; k < n; k++) {
        const a = ini + k * larg, b = k === n - 1 ? ini + ao : a + larg, pc = a + Math.floor((b - a) / 2);
        if (pc > a) seg(a, pc, 'mureta');
        seg(pc, pc + 1, 'window');
        if (b > pc + 1) seg(pc + 1, b, 'mureta');
        if (k < n - 1) C.p.paredes.push(horiz ? { x1: b, y1: linha, x2: b, y2: fundo, k: 'wall' } : { x1: linha, y1: b, x2: fundo, y2: b, k: 'wall' });
        // dentro: a palha (pele) ou os ossos; as correntes na parede do fundo
        const dentro = [];
        for (let u = a; u < b; u++) for (let v = 0; v < d; v++) { const dd = S === 'n' || S === 'o' ? fundo + v : fundo - 1 - v; dentro.push(horiz ? [u, dd] : [dd, u]); }
        const noFundo = dentro.filter(([i, j]) => (horiz ? Math.abs(j - fundo) : Math.abs(i - fundo)) <= 1 && (S === 'n' || S === 'o' ? true : (horiz ? j === fundo - 1 : i === fundo - 1)));
        const e = noFundo[Math.floor(C.r() * noFundo.length) % Math.max(1, noFundo.length)];
        // (lote 39) às vezes, os grilhões na parede do fundo
        if (e) { const r0 = C.r(); if (r0 < 0.3) C.poe('grilhoes', e[0], e[1], 1, ROT_FRENTE[OPOSTO[S]]); else if (r0 < 0.65) C.poe('pele', e[0], e[1]); else C.pinta('ossos', { x: e[0] + 0.5, y: e[1] + 0.5, n: 2 }); }
        C.pinta('correntes', { x: horiz ? (a + b) / 2 : fundo, y: horiz ? fundo : (a + b) / 2, lado: S });
        for (const [i, j] of dentro) C.ocupa(i, j, 1, 1);
        // (a frente da portinhola, do lado do corredor, fica livre)
        const fi = horiz ? pc : S === 'o' ? linha : linha - 1, fj = horiz ? (S === 'n' ? linha : linha - 1) : pc;
        if (C.livre(fi, fj)) C.ocupa(fi, fj, 1, 2);
      }
      encosta(C, q, 'tocha', 1);
      if (C.r() < 0.6) noCanto(C, q, 'mesa') || noCanto(C, q, 'banco');
      if (C.r() < 0.5) encosta(C, q, 'alavanca', 1);          // (lote 39: a alavanca que abre as celas)
    },
    // ---- a cripta ----
    jazigo(C, q) {
      // o estrado do senhor no fundo, o sarcófago grande em cima, os braseiros e as estátuas dos lados, o tapete
      const lp = ladoDasPortas(q), fundo = OPOSTO[lp], horiz = fundo === 'n' || fundo === 's';
      const ew = Math.min((horiz ? q.w : q.h) - 2, 4), ed = Math.min((horiz ? q.h : q.w) - 2, 3);
      const est = horiz ? { x: Math.round(q.x + q.w / 2 - ew / 2), y: fundo === 'n' ? q.y : q.y + q.h - ed, w: ew, h: ed } : { x: fundo === 'o' ? q.x : q.x + q.w - ed, y: Math.round(q.y + q.h / 2 - ew / 2), w: ed, h: ew };
      C.p.relevo.push({ t: 'plataforma', alt: 0.5, k: 'rect', x: est.x + 0.05, y: est.y + 0.05, w: est.w - 0.1, h: est.h - 0.1 });
      C.pinta('estrado', est);
      const sx = est.x + est.w / 2, sy = est.y + est.h / 2, sw = horiz ? 1.3 : 2.4, sh = horiz ? 2.4 : 1.3;
      C.pinta('sarcofago', { x: sx - sw / 2, y: sy - sh / 2, w: sw, h: sh, grande: true });
      C.p.relevo.push({ t: 'plataforma', alt: 1.3, k: 'rect', x: sx - sw / 2, y: sy - sh / 2, w: sw, h: sh });
      C.ocupaRet(est.x, est.y, est.w, est.h, 1);
      const lad = horiz ? [[est.x - 1, est.y + (fundo === 'n' ? 0 : est.h - 1)], [est.x + est.w, est.y + (fundo === 'n' ? 0 : est.h - 1)]] : [[est.x + (fundo === 'o' ? 0 : est.w - 1), est.y - 1], [est.x + (fundo === 'o' ? 0 : est.w - 1), est.y + est.h]];
      for (const [i, j] of lad) C.poe('braseiro', i, j);
      noCanto(C, q, 'estatua'); noCanto(C, q, 'estatua');
      nichosDaSala(C, q, 0.5);
    },
    capela(C, q) { MOBILIA.altar(C, q); C.poe('vela', Math.floor(q.x + q.w / 2), q.y + 1) || noCanto(C, q, 'vela'); },
    ossario(C, q) {
      // os ossos empilhados ao longo das paredes, as caveiras arrumadas; uma vela
      for (const lado of ['n', 's', 'o', 'l']) for (const [i, j] of beira(q, lado, true)) if (C.livre(i, j) && C.r() < 0.6) { C.pinta('ossos', { x: i + 0.5, y: j + 0.5, n: 4, pilha: true }); C.ocupa(i, j, 1, 1); }
      if (q.w >= 5 && q.h >= 5) C.pinta('ossos', { x: q.x + q.w / 2, y: q.y + q.h / 2, n: 7, pilha: true });
      noCanto(C, q, 'vela'); noCanto(C, q, 'cranios');          // (lote 39: a pilha de crânios)
    },
    sarcofagos(C, q) {
      // em fileiras, de uma casa por duas, com o corredor do meio livre
      const lp = ladoDasPortas(q), horiz = lp === 'n' || lp === 's';
      const u0 = horiz ? q.x : q.y, U = horiz ? q.w : q.h, v0 = horiz ? q.y : q.x, V = horiz ? q.h : q.w;
      const meio = u0 + Math.floor(U / 2);
      for (let v = v0 + 1; v + 2 <= v0 + V - 1; v += 3) for (let u = u0 + 1; u < u0 + U - 1; u += 2) {
        if (Math.abs(u - meio) < 1) continue;
        const x = horiz ? u : v, y = horiz ? v : u, w = horiz ? 1 : 2, h = horiz ? 2 : 1;
        let ok = true;
        for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) if (!C.livre(x + a, y + b)) ok = false;
        if (!ok) continue;
        for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) C.ocupa(x + a, y + b, 1, 1);
        C.pinta('sarcofago', { x: x + 0.1, y: y + 0.1, w: w - 0.2, h: h - 0.2 });
        C.p.relevo.push({ t: 'plataforma', alt: 1, k: 'rect', x: x + 0.1, y: y + 0.1, w: w - 0.2, h: h - 0.2 });
      }
      noCanto(C, q, 'vela');
    },
    nichos(C, q) { nichosDaSala(C, q, 0.7); if (C.r() < 0.5) C.pinta('ossos', { x: q.x + q.w / 2, y: q.y + q.h / 2, n: 3 }); if (C.r() < 0.5) encosta(C, q, 'caixao', 1, 2); },          // (lote 39: o caixão)
    // ---- (lote 28) o templo ----
    nave(C, q) {
      // o altar no estrado do fundo, entre os braseiros; as duas fileiras de colunas; os bancos de frente para o altar,
      // dos dois lados do corredor do meio; o tapete do altar até a porta
      const lp = ladoDasPortas(q), fundo = OPOSTO[lp], horiz = fundo === 'n' || fundo === 's';
      const ew = Math.min((horiz ? q.w : q.h) - 2, 4);
      const est = horiz ? { x: Math.round(q.x + q.w / 2 - ew / 2), y: fundo === 'n' ? q.y : q.y + q.h - 2, w: ew, h: 2 } : { x: fundo === 'o' ? q.x : q.x + q.w - 2, y: Math.round(q.y + q.h / 2 - ew / 2), w: 2, h: ew };
      C.p.relevo.push({ t: 'plataforma', alt: 0.5, k: 'rect', x: est.x + 0.05, y: est.y + 0.05, w: est.w - 0.1, h: est.h - 0.1 });
      C.pinta('estrado', est);
      const ax = horiz ? Math.floor(est.x + est.w / 2 - 0.5) : fundo === 'o' ? est.x : est.x + 1, ay = horiz ? (fundo === 'n' ? est.y : est.y + 1) : Math.floor(est.y + est.h / 2 - 0.5);
      C.poe('altar', ax, ay, 1, ROT_FRENTE[lp]);
      C.ocupaRet(est.x, est.y, est.w, est.h, 1);
      for (const [i, j] of horiz ? [[est.x - 1, ay], [est.x + est.w, ay]] : [[ax, est.y - 1], [ax, est.y + est.h]]) C.poe('braseiro', i, j);
      if (q.w >= 7 && q.h >= 6) {
        if (horiz) { for (let j = q.y + (fundo === 'n' ? 3 : 1); j < q.y + q.h - (fundo === 's' ? 3 : 1); j += 2) for (const i of [q.x + 1, q.x + q.w - 2]) if (C.livre(i, j)) coluna(C, i + 0.5, j + 0.5, 0.4); }
        else { for (let i = q.x + (fundo === 'o' ? 3 : 1); i < q.x + q.w - (fundo === 'l' ? 3 : 1); i += 2) for (const j of [q.y + 1, q.y + q.h - 2]) if (C.livre(i, j)) coluna(C, i + 0.5, j + 0.5, 0.4); }
      }
      const meio = horiz ? ax : ay, fundoU = horiz ? q.h : q.w;
      for (let k = 3; k < fundoU - 1; k += 2) for (const d of [-2, -1, 1, 2]) {
        const i = horiz ? meio + d : fundo === 'o' ? q.x + k : q.x + q.w - 1 - k, j = horiz ? (fundo === 'n' ? q.y + k : q.y + q.h - 1 - k) : meio + d;
        if (i > q.x && j > q.y && i < q.x + q.w - 1 && j < q.y + q.h - 1) C.poe('banco', i, j, 1, ROT_FRENTE[fundo]);
      }
      const pt = q.portas.find(k => k.lado === lp) || q.portas[0];
      if (pt) C.pinta('tapete', horiz ? { x: ax - 0.1, y: Math.min(ay, pt.fy) + 0.5, w: 1.2, h: Math.abs(ay - pt.fy) } : { x: Math.min(ax, pt.fx) + 0.5, y: ay - 0.1, w: Math.abs(ax - pt.fx), h: 1.2 });
      noCanto(C, q, 'estatua'); noCanto(C, q, 'estatua');
    },
    claustro(C, q) {
      // o pátio: o poço no meio, a grama, as colunas em volta e as plantas nos cantos
      C.pinta('grama', { x: q.x + 1, y: q.y + 1, w: q.w - 2, h: q.h - 2 });
      C.poe('poco', Math.floor(q.x + q.w / 2), Math.floor(q.y + q.h / 2));
      for (let i = q.x + 1; i < q.x + q.w - 1; i += 2) for (const j of [q.y + 1, q.y + q.h - 2]) if (C.livre(i, j)) coluna(C, i + 0.5, j + 0.5, 0.33);
      noCanto(C, q, 'arbusto'); noCanto(C, q, 'flores'); if (C.r() < 0.6) noCanto(C, q, 'arbusto');
    },
    sacristia(C, q) { encosta(C, q, 'estante', 1, 2); noCanto(C, q, 'bau'); noCanto(C, q, 'jarro'); encosta(C, q, 'vela', 1); if (C.r() < 0.5) noCanto(C, q, 'caixote'); },
    dormitorio(C, q) { encosta(C, q, 'cama', Math.min(4, 1 + Math.floor(q.w * q.h / 14)), 2); noCanto(C, q, 'bau'); encosta(C, q, 'vela', 1); },
    // ---- (lote 28) o esgoto ----
    cisterna(C, q) {
      // o tanque no meio (água funda), com a beirada para andar em volta; a grade do escoamento; os ossos de quem caiu
      const m = Math.min(q.w, q.h) >= 7 ? 2 : 1;
      for (let j = q.y + m; j < q.y + q.h - m; j++) for (let i = q.x + m; i < q.x + q.w - m; i++) if (C.livre(i, j)) { C.G.pos(i, j, AGUA); C.ocupa(i, j, 1, 1); }
      C.pinta('grade', { x: q.x + 0.5, y: q.y + 0.5 });
      if (C.r() < 0.6) C.pinta('ossos', { x: q.x + q.w - 0.8, y: q.y + q.h - 0.8, n: 3 });
    },
    juncao(C, q) { C.pinta('grade', { x: q.x + q.w / 2, y: q.y + q.h / 2 }); C.pinta('poca', { x: q.x + C.ent(1, q.w - 1), y: q.y + C.ent(1, q.h - 1), r: 1 }); if (C.r() < 0.5) noCanto(C, q, 'barril'); },
    ratos(C, q) {
      // o ninho dos ratos: o monte de trapos e ossos, os restos em volta
      C.pinta('ninho', { x: q.x + q.w / 2, y: q.y + q.h / 2, r: Math.min(1.4, Math.min(q.w, q.h) * 0.3), ratos: true });
      C.ocupa(Math.floor(q.x + q.w / 2 - 1), Math.floor(q.y + q.h / 2 - 1), 2, 1);
      for (let k = 0; k < 3; k++) C.pinta('ossos', { x: q.x + C.ent(0.6, q.w - 0.6), y: q.y + C.ent(0.6, q.h - 0.6), n: 2 });
      C.pinta('entulho', { x: q.x + C.ent(0.8, q.w - 0.8), y: q.y + C.ent(0.8, q.h - 0.8), r: 0.8 });
    },
    esconderijo(C, q) {
      // o esconderijo dos ladrões: a fogueira apagada, as peles, os caixotes, o baú
      C.pinta('fogueiraApagada', { x: q.x + q.w / 2, y: q.y + q.h / 2 });
      C.ocupa(Math.floor(q.x + q.w / 2), Math.floor(q.y + q.h / 2), 1, 1);
      encosta(C, q, 'pele', 2); noCanto(C, q, 'caixote'); noCanto(C, q, 'bau'); encosta(C, q, 'lampiao', 1);
      encosta(C, q, 'sacoDormir', 1); if (C.r() < 0.6) noCanto(C, q, 'mochila');          // (lote 39)
    },
    // ---- (lote 28) a torre de mago ----
    circulo(C, q) {
      // o círculo de invocação no meio, com as velas em volta; as estantes; o cristal que brilha
      const cx = q.x + q.w / 2, cy = q.y + q.h / 2, rr = Math.min(q.w, q.h) / 2 - 1.1;
      C.pinta('circuloRunico', { x: cx, y: cy, r: rr, cor: '#7d5fd6' });
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * TAU / 5, i = Math.floor(cx + Math.cos(a) * (rr + 0.4)), j = Math.floor(cy + Math.sin(a) * (rr + 0.4)); C.poe('vela', i, j); }
      luz(C, cx, cy, 4, '#b48cff', 1.5);
      encosta(C, q, 'estante', 1, 2);
    },
    alquimia(C, q) {
      const mx = Math.floor(q.x + q.w / 2 - 1), my = Math.floor(q.y + q.h / 2 - 1);
      C.poe('mesa', mx, my, 2);
      C.pinta('frascos', { x: mx + 1, y: my + 1, cor: C.pick(['#7fe0a0', '#b48cff', '#ff9a6a']) });
      encosta(C, q, 'balcao', 2); noCanto(C, q, 'jarro'); noCanto(C, q, 'braseiro'); encosta(C, q, 'estante', 1, 2);
    },
    observatorio(C, q) {
      // o mapa das estrelas no chão, a mesa com os pergaminhos, a luneta (o lampião) na janela
      C.pinta('estrelas', { x: q.x + q.w / 2, y: q.y + q.h / 2, r: Math.min(q.w, q.h) / 2 - 0.8 });
      encosta(C, q, 'mesa', 1, 2); encosta(C, q, 'lampiao', 1); noCanto(C, q, 'cadeira');
    },
    quarto(C, q) { encosta(C, q, 'cama', 1, 2); noCanto(C, q, 'bau'); encosta(C, q, 'estante', 1, 2); noCanto(C, q, 'vela'); if (C.r() < 0.6) C.pinta('tapete', { x: q.x + 1, y: q.y + 1, w: Math.min(2, q.w - 2), h: Math.min(2, q.h - 2) }); },
    // ---- (lote 28) o laboratório ----
    bancada(C, q) {
      // as bancadas em fileiras (balcões), os frascos que borbulham, as velas
      const horiz = q.w >= q.h;
      for (let k = 1; k < (horiz ? q.h : q.w) - 1; k += 3) for (let u = 1; u < (horiz ? q.w : q.h) - 1; u++) {
        const i = horiz ? q.x + u : q.x + k, j = horiz ? q.y + k : q.y + u;
        if ((u % 4) !== 0) C.poe('balcao', i, j, 1, horiz ? 0 : 90);
      }
      for (let k = 0; k < 3; k++) C.pinta('frascos', { x: q.x + C.ent(1, q.w - 1), y: q.y + C.ent(1, q.h - 1), cor: C.pick(['#7fe0a0', '#9fd4ff', '#ff9a6a', '#e3ff7a']) });
      noCanto(C, q, 'vela'); noCanto(C, q, 'jarro');
    },
    jaulas(C, q) { MOBILIA.celas(C, q); },
    tanques(C, q) {
      // os tanques de vidro com o líquido que brilha (um ou dois), os canos no chão
      const n = q.w * q.h >= 30 ? 2 : 1, cor = C.pick(['#58e0a0', '#7fd1ff', '#d9ff7a']);
      for (let k = 0; k < n; k++) {
        const e = naBeira(C, q, C.pick(['n', 's', 'o', 'l']), 2);
        if (!e) continue;
        C.ocupa(e[0], e[1], 2, 1);
        C.pinta('tanque', { x: e[0] + 0.1, y: e[1] + 0.1, w: 1.8, h: 1.8, cor });
        C.p.relevo.push({ t: 'plataforma', alt: 1.5, k: 'rect', x: e[0] + 0.1, y: e[1] + 0.1, w: 1.8, h: 1.8 });
        luz(C, e[0] + 1, e[1] + 1, 3, cor, 1);
      }
      noCanto(C, q, 'balcao');
    },
    caldeirao(C, q) { C.poe('braseiro', Math.floor(q.x + q.w / 2), Math.floor(q.y + q.h / 2)); C.pinta('frascos', { x: q.x + q.w / 2 + 1, y: q.y + q.h / 2, cor: '#7fe0a0' }); noCanto(C, q, 'jarro'); noCanto(C, q, 'barril'); encosta(C, q, 'estante', 1, 2); },
    incinerador(C, q) { C.poe('braseiro', Math.floor(q.x + q.w / 2), Math.floor(q.y + q.h / 2)); C.pinta('brasa', { x: q.x + q.w / 2, y: q.y + q.h / 2, r: 1.2 }); for (let k = 0; k < 2; k++) C.pinta('ossos', { x: q.x + C.ent(0.6, q.w - 0.6), y: q.y + C.ent(0.6, q.h - 0.6), n: 2 }); noCanto(C, q, 'caixote'); },
    // ---- (lote 28) a fortaleza anã ----
    forja(C, q) {
      // a fornalha (o braseiro grande) no fundo, as bigornas na frente, o barril de água, as armas na parede
      const lp = ladoDasPortas(q), fundo = OPOSTO[lp], e = naBeira(C, q, fundo, 1, true);
      if (e) { C.poe('braseiro', e[0], e[1]); C.pinta('brasa', { x: e[0] + 0.5, y: e[1] + 0.5, r: 1.1 }); }
      let n = 0;
      for (let t = 0; t < 12 && n < 2; t++) { const i = q.x + 1 + Math.floor(C.r() * Math.max(1, q.w - 2)), j = q.y + 1 + Math.floor(C.r() * Math.max(1, q.h - 2)); if (C.poe('bigorna', i, j)) n++; }
      noCanto(C, q, 'barril'); encosta(C, q, 'armas', 2); C.pinta('ferramentas', { x: q.x + q.w / 2, y: q.y + q.h / 2 + 0.6 });
    },
    quartel(C, q) { encosta(C, q, 'cama', Math.min(5, 1 + Math.floor(q.w * q.h / 12)), 2); noCanto(C, q, 'bau'); noCanto(C, q, 'bau'); encosta(C, q, 'armas', 1); },
    cervejaria(C, q) {
      const n = Math.min(7, 3 + Math.floor(q.w * q.h / 10));
      for (let k = 0; k < n; k++) if (!noCanto(C, q, 'barril')) encosta(C, q, 'barril', 1);
      const mx = Math.floor(q.x + q.w / 2 - 1), my = Math.floor(q.y + q.h / 2 - 1);
      if (C.poe('mesa', mx, my, 2)) { C.poe('banco', mx - 1, my, 1, 270); C.poe('banco', mx + 2, my + 1, 1, 90); }
      encosta(C, q, 'lampiao', 1);
    },
    // ---- (lote 28) as ruínas élficas ----
    salaoRuido(C, q) {
      // o salão das colunas, com metade delas no chão (os pedaços espalhados); as raízes entrando pelas frestas
      for (let j = q.y + 1; j < q.y + q.h - 1; j += 2) for (let i = q.x + 1; i < q.x + q.w - 1; i += 2) {
        if (!C.livre(i, j) || (i - q.x) % 2 !== 1) continue;
        if (C.r() < 0.55) coluna(C, i + 0.5, j + 0.5, 0.4);
        else { C.pinta('colunaCaida', { x: i + 0.5, y: j + 0.5, ang: C.ent(0, TAU) }); C.ocupa(i, j, 1, 1); }
      }
      C.pinta('raizes', { x: q.x + C.ent(0.8, q.w - 0.8), y: q.y + 0.6, n: 3, ang: Math.PI / 2 });
      noCanto(C, q, 'estatua');
    },
    jardim(C, q) {
      // o jardim que tomou a sala: a árvore no meio, os arbustos, as flores, a grama
      C.pinta('grama', { x: q.x, y: q.y, w: q.w, h: q.h });
      if (!C.poe('arvore', Math.floor(q.x + q.w / 2 - 1), Math.floor(q.y + q.h / 2 - 1), 2)) noCanto(C, q, 'arbusto');
      noCanto(C, q, 'arbusto'); noCanto(C, q, 'flores'); noCanto(C, q, 'flores');
      if (C.r() < 0.5) noCanto(C, q, 'cogumelos');
    },
    fonte(C, q) {
      // a fonte seca (o poço) no meio, as poças, os bancos de pedra
      C.poe('poco', Math.floor(q.x + q.w / 2), Math.floor(q.y + q.h / 2));
      C.pinta('poca', { x: q.x + q.w / 2 + 1, y: q.y + q.h / 2 + 1, r: 0.9 });
      encosta(C, q, 'banco', 2); noCanto(C, q, 'flores');
    },
  };
  /* (lote 28) O esgoto: o canal raso de água suja correndo pelo meio de cada corredor (pintado; dá para andar). */
  function canaisDoEsgoto(C, x) {
    for (const lg of x.ligacoes) {
      const pts = lg.pts.filter(([i, j]) => C.G.at(i, j) === CORREDOR).map(([i, j]) => [i + 0.5, j + 0.5]);
      if (pts.length >= 2) C.pinta('canal', { pts });
    }
    // os ratos e o lodo nos corredores
    const { G, W, H } = C;
    for (let k = 0, n = Math.round(W * H / 220); k < n; k++) {
      const i = 1 + Math.floor(C.r() * (W - 2)), j = 1 + Math.floor(C.r() * (H - 2));
      if (G.at(i, j) === CORREDOR && C.livre(i, j)) C.pinta(C.r() < 0.6 ? 'poca' : 'ossos', { x: i + 0.5, y: j + 0.5, r: 0.6, n: 2 });
    }
    // as grades de luz que vêm da rua (as poucas luzes do esgoto)
    for (let k = 0, n = 0; k < 400 && n < Math.max(2, Math.round(W * H / 500)); k++) {
      const i = 1 + Math.floor(C.r() * (W - 2)), j = 1 + Math.floor(C.r() * (H - 2));
      if (G.at(i, j) !== CORREDOR || !C.livre(i, j)) continue;
      C.pinta('grade', { x: i + 0.5, y: j + 0.5, luz: true }); luz(C, i + 0.5, j + 0.5, 3, '#c9d8e8', 1); C.ocupa(i, j, 1, 1); n++;
    }
  }
  /* (lote 28) A torre: redonda (as salas e os corredores ficam dentro da parede), e por fora o céu da noite. */
  function dentroDaTorre(W, H) {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 1.5;
    return (i, j) => Math.hypot(i + 0.5 - cx, j + 0.5 - cy) <= R;
  }
  function anelDaTorre(C) { const { W, H } = C; C.pinta('anelTorre', { x: W / 2, y: H / 2, r: Math.min(W, H) / 2 - 1.5 }); }
  /* (lote 28) As ruínas: paredes que caíram (a rocha fina entre uma sala e um corredor, ou entre duas salas, vira passagem
     cheia de pedra) e o mato tomando conta. */
  function ruirAsParedes(C) {
    const { G, W, H } = C;
    const cands = [];
    for (let j = 2; j < H - 2; j++) for (let i = 2; i < W - 2; i++) {
      if (G.at(i, j) !== ROCHA) continue;
      const lr = G.at(i - 1, j) !== ROCHA && G.at(i + 1, j) !== ROCHA && G.at(i, j - 1) === ROCHA && G.at(i, j + 1) === ROCHA;
      const ns = G.at(i, j - 1) !== ROCHA && G.at(i, j + 1) !== ROCHA && G.at(i - 1, j) === ROCHA && G.at(i + 1, j) === ROCHA;
      if (lr || ns) cands.push([i, j]);
    }
    const n = Math.min(cands.length, Math.max(2, Math.round(W * H / 260)));
    for (const [i, j] of C.embaralha(cands).slice(0, n)) {
      if (G.at(i, j) !== ROCHA) continue;
      G.pos(i, j, CORREDOR);
      C.pinta('entulho', { x: i + 0.5, y: j + 0.5, r: 0.9 });
    }
    // o musgo e as raízes pelos cantos; os cristais que ainda brilham (a luz das ruínas)
    for (const q of C.p.salas) if (C.r() < 0.5) C.pinta('raizes', { x: q.x + C.ent(0.5, q.w - 0.5), y: q.y + C.ent(0.5, q.h - 0.5), n: 2 + Math.floor(C.r() * 2), ang: C.ent(0, TAU) });
    for (let k = 0, m = 0; k < 300 && m < Math.max(2, Math.round(W * H / 450)); k++) {
      const i = 1 + Math.floor(C.r() * (W - 2)), j = 1 + Math.floor(C.r() * (H - 2));
      if (!C.livre(i, j)) continue;
      C.pinta('cristal', { x: i + 0.5, y: j + 0.5, r: 0.5, cor: '#9fffd8' }); luz(C, i + 0.5, j + 0.5, 3, '#9fffd8', 1); C.ocupa(i, j, 1, 1); m++;
    }
  }

  /* Os nichos: as covas na rocha, de uma casa, ao longo das paredes (de duas em duas casas), cada uma com o seu morto. */
  function nichoEm(C, i, j, de) {
    const { G } = C;
    if (G.at(i, j) !== ROCHA || i < 1 || j < 1 || i >= C.W - 1 || j >= C.H - 1) return false;
    // (a rocha em volta do nicho continua rocha: nada de nicho encostado noutro chão)
    for (const [a, b] of DIRS) { const ni = i + a, nj = j + b; if (ni === de[0] && nj === de[1]) continue; if (G.at(ni, nj) !== ROCHA) return false; }
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) if (G.at(i + a, j + b) === NICHO) return false;
    G.pos(i, j, NICHO);
    const dx = i - de[0], dy = j - de[1];
    C.pinta('nicho', { x: i, y: j, lado: dx > 0 ? 'l' : dx < 0 ? 'o' : dy > 0 ? 's' : 'n' });
    C.ocupa(i, j, 1, 1);
    return true;
  }
  function nichosDaSala(C, q, chance) {
    for (const lado of ['n', 's', 'o', 'l']) for (const [i, j] of beira(q, lado, false)) {
      if (C.oc[j * C.W + i] === 2) continue;      // (não na frente de porta nem de escada)
      const ni = lado === 'n' ? i : lado === 's' ? i : lado === 'o' ? i - 1 : i + 1, nj = lado === 'n' ? j - 1 : lado === 's' ? j + 1 : j;
      if ((lado === 'n' || lado === 's' ? i - q.x : j - q.y) % 2 === 0 && C.r() < chance) nichoEm(C, ni, nj, [i, j]);
    }
  }
  function nichosDosCorredores(C) {
    const { G, W, H } = C;
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      if (G.at(i, j) !== CORREDOR || (i + j) % 2 !== 0 || C.r() > 0.55) continue;
      for (const [a, b] of C.embaralha(DIRS)) if (nichoEm(C, i + a, j + b, [i, j])) break;
    }
  }

  /* As runas-armadilha (escondidas dos jogadores): onde elas fazem sentido. */
  function runas(C, tesouro, principal) {
    const { p, G, W, H } = C, lugares = [];
    if (tesouro && tesouro.portas[0]) { const pt = tesouro.portas[0]; lugares.push([pt.fx + 0.5, pt.fy + 0.5, 1]); }
    if (principal) lugares.push([principal.x + principal.w / 2, principal.y + principal.h / 2, 1.5]);
    // um cruzamento de corredores (uma casa de corredor com três ou quatro vizinhas de corredor)
    const cruz = [];
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) if (G.at(i, j) === CORREDOR && DIRS.filter(([a, b]) => G.at(i + a, j + b) === CORREDOR).length >= 3) cruz.push([i + 0.5, j + 0.5, 1]);
    if (cruz.length) lugares.push(C.pick(cruz));
    for (const [x, y, rr] of lugares.slice(0, 3)) p.zonas.push({ fx: 'runas', k: 'circ', x, y, r: rr, gm: true });
  }
  // umas poucas tochas de parede nos corredores compridos (de longe em longe)
  function tochasDosCorredores(C) {
    const { G, W, H } = C, ja = [];
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      if (G.at(i, j) !== CORREDOR || !C.livre(i, j) || C.r() > 0.04) continue;
      if (ja.some(([a, b]) => Math.abs(a - i) + Math.abs(b - j) < 12)) continue;
      // (encostada numa parede: a casa do lado é rocha; a placa da tocha fica desse lado)
      const lado = DIRS.map(([a, b]) => (G.at(i + a, j + b) === ROCHA ? (a > 0 ? 'l' : a < 0 ? 'o' : b > 0 ? 's' : 'n') : null)).find(Boolean);
      if (!lado) continue;
      if (C.poe('tocha', i, j, 1, ROT_FRENTE[OPOSTO[lado]])) ja.push([i, j]);
    }
  }
  function enfeites(C) {
    const { G, W, H, p } = C;
    // as teias nos cantos das salas e dos corredores (uns poucos)
    for (const q of p.salas) if (C.r() < 0.35) { const c = C.pick([['no', q.x, q.y], ['ne', q.x + q.w, q.y], ['so', q.x, q.y + q.h], ['se', q.x + q.w, q.y + q.h]]); C.pinta('teia', { x: c[1], y: c[2], canto: c[0] }); }
    // o entulho e os ossos soltos nos corredores
    for (let k = 0, n = Math.round(W * H / 260); k < n; k++) {
      const i = 1 + Math.floor(C.r() * (W - 2)), j = 1 + Math.floor(C.r() * (H - 2));
      if (G.at(i, j) === CORREDOR && C.livre(i, j)) C.pinta(C.r() < 0.5 ? 'entulho' : 'ossos', { x: i + 0.5, y: j + 0.5, r: 0.5, n: 2 });
    }
  }
  /* ================= os contornos (a caverna, a água, o abismo) ================= */
  /* O contorno das casas de dentro (dentro(i, j)), alisado nos cantos: as linhas passam no meio das beiradas entre o
     centro de uma casa de dentro e o de uma de fora (nos cantos, em diagonal). Devolve as linhas fechadas (ou
     abertas na borda), em quadrados. */
  function contornos(W, H, dentro) {
    const v = (i, j) => (i >= 0 && j >= 0 && i < W && j < H && dentro(i, j) ? 1 : 0);
    const segs = [];
    // (os cantos da grade dual são os centros das casas: (i + 0.5, j + 0.5); cada quadradinho tem quatro centros)
    for (let j = -1; j < H; j++) for (let i = -1; i < W; i++) {
      const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1), caso = a * 8 + b * 4 + c * 2 + d;
      if (caso === 0 || caso === 15) continue;
      const x = i + 0.5, y = j + 0.5;
      const N = [x + 0.5, y], L = [x + 1, y + 0.5], S = [x + 0.5, y + 1], O = [x, y + 0.5];
      const add = (p, q) => segs.push([p, q]);
      switch (caso) {
        case 1: case 14: add(O, S); break;
        case 2: case 13: add(S, L); break;
        case 3: case 12: add(O, L); break;
        case 4: case 11: add(N, L); break;
        case 5: add(O, N); add(S, L); break;          // (as duas diagonais: dentro ligado pelo meio)
        case 10: add(N, L); add(O, S); break;
        case 6: case 9: add(N, S); break;
        case 7: case 8: add(O, N); break;
      }
    }
    // emendar os pedacinhos em linhas
    const chave = p => Math.round(p[0] * 2) + ',' + Math.round(p[1] * 2);
    const ponta = new Map();
    segs.forEach((s, k) => { for (const p of s) { const c = chave(p); if (!ponta.has(c)) ponta.set(c, []); ponta.get(c).push(k); } });
    const usado = new Uint8Array(segs.length), linhas = [];
    for (let k = 0; k < segs.length; k++) {
      if (usado[k]) continue;
      usado[k] = 1;
      const linha = [segs[k][0], segs[k][1]];
      for (const lado of [1, 0]) {
        for (;;) {
          const fim = lado ? linha[linha.length - 1] : linha[0], c = chave(fim), l = (ponta.get(c) || []).find(n => !usado[n]);
          if (l == null) break;
          usado[l] = 1;
          const s = segs[l], prox = chave(s[0]) === c ? s[1] : s[0];
          if (lado) linha.push(prox); else linha.unshift(prox);
        }
      }
      linhas.push(linha);
    }
    return linhas;
  }
  // tira os pontos que quase não mudam a linha (Douglas–Peucker)
  function simplifica(pts, tol) {
    if (pts.length < 3) return pts.slice();
    const fechada = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-6;
    const dp = (a, b, out) => {
      let m = -1, dm = 0;
      const [x1, y1] = pts[a], [x2, y2] = pts[b], L = Math.hypot(x2 - x1, y2 - y1) || 1e-9;
      for (let k = a + 1; k < b; k++) { const d = Math.abs((x2 - x1) * (y1 - pts[k][1]) - (x1 - pts[k][0]) * (y2 - y1)) / L; if (d > dm) { dm = d; m = k; } }
      if (dm > tol && m > 0) { dp(a, m, out); dp(m, b, out); } else out.push(pts[b]);
    };
    if (fechada) {
      // (na linha fechada, parte no ponto mais longe do começo)
      let far = 1, dmax = 0;
      for (let k = 1; k < pts.length - 1; k++) { const d = Math.hypot(pts[k][0] - pts[0][0], pts[k][1] - pts[0][1]); if (d > dmax) { dmax = d; far = k; } }
      const out = [pts[0]]; dp(0, far, out); dp(far, pts.length - 1, out);
      return out;
    }
    const out = [pts[0]]; dp(0, pts.length - 1, out);
    return out;
  }
  const linhasEmSegmentos = (linhas, tol) => {
    const out = [];
    for (const l of linhas) { const s = simplifica(l, tol); for (let k = 1; k < s.length; k++) out.push({ x1: s[k - 1][0], y1: s[k - 1][1], x2: s[k][0], y2: s[k][1], k: 'wall' }); }
    return out;
  };
  /* (a caverna) a beira: o contorno alisado, simplificado e com um tremido (a rocha cavada pela água não é reta); o
     mesmo tremido serve às paredes e ao desenho. */
  function contornoTremido(W, H, dentro, semente) {
    const hs = (x, y, k) => { let v = (Math.imul(Math.round(x * 2) * 73856093 ^ Math.round(y * 2) * 19349663 ^ (k + semente) * 83492791, 0x9e3779b1) >>> 0); v ^= v >>> 15; v = Math.imul(v, 0x85ebca6b) >>> 0; v ^= v >>> 13; return (v % 10007) / 10007; };
    return contornos(W, H, dentro).map(l => {
      const s = simplifica(l, 0.22), out = [];
      for (let k = 0; k < s.length; k++) {
        const [x, y] = s[k];
        if (k > 0) {
          const [px, py] = s[k - 1], L = Math.hypot(x - px, y - py), n = Math.floor(L / 1.1);
          for (let m = 1; m <= n; m++) { const t = m / (n + 1), mx = px + (x - px) * t, my = py + (y - py) * t, d = (hs(mx, my, 3) - 0.5) * 0.5; out.push([mx - (y - py) / L * d, my + (x - px) / L * d]); }
        }
        const a = hs(x, y, 1) * TAU, d = 0.14 * hs(x, y, 2);
        out.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
      }
      return out;
    });
  }
  const segmentosDe = linhas => { const out = []; for (const l of linhas) for (let k = 1; k < l.length; k++) out.push({ x1: l[k - 1][0], y1: l[k - 1][1], x2: l[k][0], y2: l[k][1], k: 'wall' }); return out; };
  // as regiões ligadas (quatro vizinhas) das casas que valem
  function regioes(W, H, vale) {
    const id = new Int32Array(W * H).fill(-1), lista = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (id[j * W + i] >= 0 || !vale(i, j)) continue;
      const n = lista.length, cel = [[i, j]];
      id[j * W + i] = n;
      for (let k = 0; k < cel.length; k++) {
        const [a, b] = cel[k];
        for (const [dx, dy] of DIRS) { const x = a + dx, y = b + dy; if (x >= 0 && y >= 0 && x < W && y < H && id[y * W + x] < 0 && vale(x, y)) { id[y * W + x] = n; cel.push([x, y]); } }
      }
      lista.push(cel);
    }
    return { id, lista };
  }

  /* ================= a caverna ================= */
  function nivelDeCaverna(C) {
    const { G, r, p, W, H } = C, T = TAMANHOS[p.tamanho];
    // 1) as câmaras (manchas espalhadas pelo mapa todo): uma em cada casa de uma grade grossa, mexida; umas casas ficam
    //    sem câmara
    const nx = T.W > 50 ? 5 : T.W > 40 ? 4 : 3, ny = T.W > 50 ? 3 : T.W > 40 ? 3 : 2, cw = (W - 4) / nx, chh = (H - 4) / ny;
    const cam = [];
    for (let b = 0; b < ny; b++) for (let a = 0; a < nx; a++) {
      if (r() < 0.18) continue;
      const rr = C.ent(2.4, Math.min(cw, chh) * 0.36), x = 2 + cw * (a + 0.5) + C.ent(-cw * 0.22, cw * 0.22), y = 2 + chh * (b + 0.5) + C.ent(-chh * 0.22, chh * 0.22);
      cam.push({ i: cam.length, x: clamp(x, rr + 3, W - rr - 3), y: clamp(y, rr + 3, H - rr - 3), r: rr, rx: rr * C.ent(0.85, 1.3), ry: rr * C.ent(0.75, 1.15), liga: [] });
    }
    const aberto = new Uint8Array(W * H);
    const cava = (x, y, rr) => { for (let j = Math.floor(y - rr); j <= Math.ceil(y + rr); j++) for (let i = Math.floor(x - rr); i <= Math.ceil(x + rr); i++) if (i >= 2 && j >= 2 && i < W - 2 && j < H - 2 && Math.hypot(i + 0.5 - x, j + 0.5 - y) <= rr) aberto[j * W + i] = 1; };
    for (const q of cam) {
      // (a mancha: o contorno com sobe-e-desce)
      const ond = [C.ent(0, TAU), C.ent(0, TAU), C.ent(0.08, 0.2)];
      for (let j = Math.floor(q.y - q.ry - 2); j <= q.y + q.ry + 2; j++) for (let i = Math.floor(q.x - q.rx - 2); i <= q.x + q.rx + 2; i++) {
        if (i < 2 || j < 2 || i >= W - 2 || j >= H - 2) continue;
        const dx = (i + 0.5 - q.x) / q.rx, dy = (j + 0.5 - q.y) / q.ry, a = Math.atan2(dy, dx), lim = 1 + ond[2] * Math.sin(3 * a + ond[0]) + ond[2] * 0.7 * Math.sin(5 * a + ond[1]);
        if (Math.hypot(dx, dy) <= lim) aberto[j * W + i] = 1;
      }
    }
    // 2) os túneis tortos entre as câmaras (a árvore mínima e uns laços): uma andança que puxa para o alvo
    const pares = [];
    for (let a = 0; a < cam.length; a++) for (let b = a + 1; b < cam.length; b++) pares.push([Math.hypot(cam[a].x - cam[b].x, cam[a].y - cam[b].y), a, b]);
    pares.sort((u, v) => u[0] - v[0]);
    const pai = cam.map((_, i) => i), raiz = i => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
    const tunel = (A, B) => {
      let x = A.x, y = A.y, ang = Math.atan2(B.y - y, B.x - x);
      // (lote 28) o raio do túnel pela largura escolhida (1, 2 ou 3 quadrados); sem escolha, o de antes
      const lc = p.larg, larg = lc === 3 ? C.ent(1.45, 1.7) : lc === 2 ? C.ent(0.95, 1.2) : lc === 1 ? C.ent(0.72, 0.9) : C.ent(0.75, 1.25);
      for (let k = 0; k < 400 && Math.hypot(B.x - x, B.y - y) > 1; k++) {
        const alvo = Math.atan2(B.y - y, B.x - x);
        let d = alvo - ang; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        ang += d * 0.35 + C.ent(-0.55, 0.55);
        x = clamp(x + Math.cos(ang) * 0.7, 2.5, W - 2.5); y = clamp(y + Math.sin(ang) * 0.7, 2.5, H - 2.5);
        cava(x, y, larg + C.ent(-0.15, 0.3));
      }
      A.liga.push(B.i); B.liga.push(A.i);
    };
    for (const [, a, b] of pares) if (raiz(a) !== raiz(b)) { tunel(cam[a], cam[b]); pai[raiz(a)] = raiz(b); }
    let lacos = 0;
    for (const [d, a, b] of pares) { if (lacos >= (T.W > 50 ? 3 : 1)) break; if (!cam[a].liga.includes(b) && d < 18 && r() < 0.5) { tunel(cam[a], cam[b]); lacos++; } }
    // 3) alisar (a rocha que sobra sozinha cai; a casa aberta cercada de rocha fecha)
    for (let it = 0; it < 2; it++) {
      const n = aberto.slice();
      for (let j = 2; j < H - 2; j++) for (let i = 2; i < W - 2; i++) {
        let ab = 0;
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (a || b) ab += aberto[(j + b) * W + i + a];
        if (aberto[j * W + i] && ab <= 2) n[j * W + i] = 0; else if (!aberto[j * W + i] && ab >= 6) n[j * W + i] = 1;
      }
      aberto.set(n);
    }
    // (só a maior região aberta fica)
    const reg = regioes(W, H, (i, j) => aberto[j * W + i] === 1), maior = reg.lista.reduce((m, l, k) => (l.length > reg.lista[m].length ? k : m), 0);
    for (let k = 0; k < W * H; k++) G.g[k] = reg.id[k] === maior ? SALA : ROCHA;
    const vivas = cam.filter(q => G.at(Math.floor(q.x), Math.floor(q.y)) === SALA);
    // 4) a entrada (a câmara mais perto de um lado) e a descida (a mais longe dela pelos túneis)
    const lado0 = C.pick(['n', 's', 'o', 'l']), daBorda = q => (lado0 === 'n' ? q.y : lado0 === 's' ? H - q.y : lado0 === 'o' ? q.x : W - q.x);
    const ent0 = vivas.slice().sort((a, b) => daBorda(a) - daBorda(b))[0];
    const dist = distancias(cam, ent0.i);
    const desc0 = vivas.filter(q => q !== ent0).sort((a, b) => dist[b.i] - dist[a.i] || Math.hypot(b.x - ent0.x, b.y - ent0.y) - Math.hypot(a.x - ent0.x, a.y - ent0.y))[0];
    const usadas = new Set([ent0, desc0]);
    // 5) o lago: na maior câmara que sobrou, puxado para um lado (a água rasa na beira, a funda no meio)
    const lagoQ = vivas.filter(q => !usadas.has(q)).sort((a, b) => b.r - a.r)[0];
    if (lagoQ && lagoQ.r >= 3) {
      usadas.add(lagoQ);
      const a0 = C.ent(0, TAU), cx = lagoQ.x + Math.cos(a0) * lagoQ.r * 0.3, cy = lagoQ.y + Math.sin(a0) * lagoQ.r * 0.3, rx = lagoQ.rx * 0.75, ry = lagoQ.ry * 0.7;
      for (let j = Math.floor(cy - ry - 1); j <= cy + ry + 1; j++) for (let i = Math.floor(cx - rx - 1); i <= cx + rx + 1; i++) {
        const dd = Math.hypot((i + 0.5 - cx) / rx, (j + 0.5 - cy) / ry);
        if (dd <= 1 + 0.12 * Math.sin(Math.atan2(j - cy, i - cx) * 4 + a0) && G.at(i, j) === SALA) G.pos(i, j, AGUA);
      }
      p.lago = { x: cx, y: cy, rx, ry };
    }
    // 6) o abismo: uma fenda atravessando uma câmara grande, com a ponte de pedra (e só se tudo continuar ligado)
    const abQ = vivas.filter(q => !usadas.has(q) && q.r >= 3).sort((a, b) => b.rx * b.ry - a.rx * a.ry)[0];
    if (abQ) {
      const ang = C.ent(0, Math.PI), ux = Math.cos(ang), uy = Math.sin(ang), L = abQ.r + 6, larg = C.ent(1.0, 1.35);
      const linha = [];
      for (let t = -L; t <= L; t += 0.5) linha.push([abQ.x + ux * t - uy * Math.sin(t * 0.7) * 0.8, abQ.y + uy * t + ux * Math.sin(t * 0.7) * 0.8]);
      const antes = G.g.slice(), ponteC = [Math.floor(abQ.x + uy * 0.6 * 0), Math.floor(abQ.y)];
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        if (G.at(i, j) !== SALA) continue;
        let dm = 9;
        for (const [x, y] of linha) dm = Math.min(dm, Math.hypot(i + 0.5 - x, j + 0.5 - y));
        if (dm <= larg) G.pos(i, j, ABISMO);
      }
      // a ponte: a faixa de uma casa e meia, atravessando a fenda pelo meio da câmara
      const bx = abQ.x, by = abQ.y, px = -uy, py = ux;
      for (let t = -4; t <= 4; t += 0.25) for (const o of [-0.5, 0, 0.5]) { const i = Math.floor(bx + px * t + ux * o), j = Math.floor(by + py * t + uy * o); if (G.at(i, j) === ABISMO) G.pos(i, j, PONTE); }
      void ponteC;
      // (tudo continua ligado sem passar pelo abismo? senão, desfaz)
      const rg = regioes(W, H, (i, j) => { const v = G.at(i, j); return v !== ROCHA && v !== ABISMO; }), ok = rg.lista.filter(l => l.length > 3).length === 1;
      if (!ok) G.g.set(antes);
      else {
        // (as lasquinhas de chão que o abismo isolou caem nele)
        const mai = rg.lista.reduce((m, l, k) => (l.length > rg.lista[m].length ? k : m), 0);
        rg.lista.forEach((l, k) => { if (k !== mai) for (const [i, j] of l) G.pos(i, j, ABISMO); });
        usadas.add(abQ); p.abismo = { x: abQ.x, y: abQ.y };
      }
    }
    p.salas = vivas.map(q => ({ x: Math.round(q.x - q.r), y: Math.round(q.y - q.r), w: Math.round(q.r * 2), h: Math.round(q.r * 2), papel: q === ent0 ? 'entrada' : q === desc0 ? 'descida' : q === lagoQ ? 'lago' : q === abQ ? 'abismo' : 'camara', cx: q.x, cy: q.y, r: q.r }));
    // 7) as escadas de pedra (a subida perto da borda; a descida, a fenda com degraus, na câmara mais funda)
    p.sobe = escadaNatural(C, ent0, lado0, true);
    p.desce = p.descida && desc0 ? escadaNatural(C, desc0, null, false) : null;
    // 8) a passagem escondida: um túnel reto e estreito saindo de uma câmara até uma gruta pequena, com a porta secreta
    if (p.segredos) grutaEscondida(C, vivas.filter(q => !usadas.has(q)).concat(vivas.filter(q => usadas.has(q) && q !== ent0)));
    // 9) as estalagmites (as grandes tapam a visão), os cogumelos que brilham, as poças, os ossos
    detalhesDaCaverna(C);
    // (lote 28) o covil: o ninho da fera na maior câmara que sobrou, o tesouro dela, os ossos de quem entrou
    if (p.tipo === 'covil') detalhesDoCovil(C, vivas, usadas, ent0, desc0);
    // 10) as paredes: o contorno alisado do que não é rocha; a porta secreta da gruta por cima
    p.contorno = contornoTremido(W, H, (i, j) => G.at(i, j) !== ROCHA, p.seed % 9973);
    p.paredes = segmentosDe(p.contorno).concat(p.paredes);
    // as runas antigas (escondidas): na boca da gruta, na beira do lago, no meio do caminho
    if (p.segredos) {
      if (p.gruta) p.zonas.push({ fx: 'runas', k: 'circ', x: p.gruta.bx, y: p.gruta.by, r: 1, gm: true });
      const meio = vivas.filter(q => !usadas.has(q))[0];
      // (no chão da câmara: a casa mais perto do meio dela que é chão de verdade)
      let melhor = null;
      if (meio) for (let j = Math.floor(meio.y - 3); j <= meio.y + 3; j++) for (let i = Math.floor(meio.x - 3); i <= meio.x + 3; i++) { if (G.at(i, j) !== SALA) continue; const d = Math.hypot(i + 0.5 - meio.x, j + 0.5 - meio.y); if (!melhor || d < melhor[2]) melhor = [i + 0.5, j + 0.5, d]; }
      if (melhor) p.zonas.push({ fx: 'runas', k: 'circ', x: melhor[0], y: melhor[1], r: 1.2, gm: true });
    }
  }
  // a escada de pedra natural da caverna: dois por dois, na beira da câmara (do lado pedido, ou onde der)
  function escadaNatural(C, q, lado, sobe) {
    const { G } = C, cands = [];
    for (let j = Math.floor(q.y - q.r - 2); j <= q.y + q.r + 2; j++) for (let i = Math.floor(q.x - q.r - 2); i <= q.x + q.r + 2; i++) {
      if (!C.livreS(i, j, 2)) continue;
      // (encostada na rocha de um lado)
      let enc = null;
      if (G.at(i, j - 1) === ROCHA && G.at(i + 1, j - 1) === ROCHA) enc = 'n';
      else if (G.at(i, j + 2) === ROCHA && G.at(i + 1, j + 2) === ROCHA) enc = 's';
      else if (G.at(i - 1, j) === ROCHA && G.at(i - 1, j + 1) === ROCHA) enc = 'o';
      else if (G.at(i + 2, j) === ROCHA && G.at(i + 2, j + 1) === ROCHA) enc = 'l';
      if (!enc) continue;
      const d = Math.hypot(i + 1 - q.x, j + 1 - q.y), bom = lado && enc === lado ? -4 : 0;
      cands.push([i, j, enc, d + bom]);
    }
    if (!cands.length) return null;
    cands.sort((a, b) => a[3] - b[3]);
    const [x, y, enc] = cands[0];
    C.ocupa(x, y, 2, 2);
    const e = { x, y, w: 2, h: 2, lado: enc, sobe: !!sobe, natural: true };
    C.pinta('escada', e);
    const mi = enc === 'o' ? x + 1 : x, mj = enc === 'n' ? y + 1 : y;
    return Object.assign(e, { mi, mj });
  }
  function grutaEscondida(C, cams) {
    const { G, W, H, p } = C;
    for (const q of cams) for (const [dx, dy] of C.embaralha(DIRS)) {
      // a beira da câmara nessa direção
      let i = Math.floor(q.x), j = Math.floor(q.y), k = 0;
      while (G.at(i + dx, j + dy) !== ROCHA && k++ < 30) { i += dx; j += dy; }
      if (G.at(i, j) !== SALA) continue;
      const L = 3 + Math.floor(C.r() * 3), cx = i + dx * (L + 2) + 0.5, cy = j + dy * (L + 2) + 0.5, rr = 1.7;
      // (tudo rocha no caminho e em volta da gruta)
      let ok = cx > 3 && cy > 3 && cx < W - 3 && cy < H - 3;
      for (let t = 1; t <= L + 4 && ok; t++) for (const o of [-2, -1, 0, 1, 2]) { const a = i + dx * t + (dy ? o : 0), b = j + dy * t + (dx ? o : 0); if (G.at(a, b) !== ROCHA) ok = false; }
      if (!ok) continue;
      for (let t = 1; t <= L; t++) G.pos(i + dx * t, j + dy * t, CORREDOR);
      for (let b = Math.floor(cy - rr - 1); b <= cy + rr + 1; b++) for (let a = Math.floor(cx - rr - 1); a <= cx + rr + 1; a++) if (Math.hypot(a + 0.5 - cx, b + 0.5 - cy) <= rr) G.pos(a, b, SALA);
      // a porta secreta: na boca do túnel (um pouco mais comprida, para encostar nas paredes)
      const bi = i + dx, bj = j + dy;
      const d = dx ? { x1: dx > 0 ? bi : bi + 1, y1: bj - 0.3, x2: dx > 0 ? bi : bi + 1, y2: bj + 1.3 } : { x1: bi - 0.3, y1: dy > 0 ? bj : bj + 1, x2: bi + 1.3, y2: dy > 0 ? bj : bj + 1 };
      p.paredes.push(Object.assign(d, { k: 'door', secret: true }));
      p.gruta = { x: cx, y: cy, r: rr, bx: bi + 0.5, by: bj + 0.5 };
      C.ocupa(bi, bj, 1, 2);
      // o que tem lá: o baú, os ossos de quem achou primeiro, as moedas
      const bx = Math.floor(cx), by = Math.floor(cy);
      C.poe('bau', bx, by) || C.poe('bau', bx - 1, by);
      C.pinta('ossos', { x: cx + 0.8, y: cy + 0.6, n: 3 });
      C.pinta('moedas', { x: cx - 0.4, y: cy - 0.5, r: 0.8 });
      return true;
    }
    return false;
  }
  /* (lote 28) O covil: a câmara do ninho (o ninho grande, os ovos, o monte de moedas e ossos), os ninhos menores pelas
     câmaras, as carcaças, as marcas de garra; a luz é pouca (só os cogumelos). */
  function detalhesDoCovil(C, vivas, usadas, ent0, desc0) {
    const { G, p } = C;
    const livres = vivas.filter(q => q !== ent0 && q !== desc0);
    const q = vivas.filter(x => x !== ent0 && x !== desc0).sort((a, b) => b.r - a.r)[0] || vivas[0];
    if (!q) return;
    // (o chão de verdade mais perto do meio da câmara)
    let c0 = null;
    for (let j = Math.floor(q.y - 3); j <= q.y + 3; j++) for (let i = Math.floor(q.x - 3); i <= q.x + 3; i++) if (C.livreS(i - 1, j - 1, 3)) { const d = Math.hypot(i + 0.5 - q.x, j + 0.5 - q.y); if (!c0 || d < c0[2]) c0 = [i, j, d]; }
    if (c0) {
      const [i, j] = c0;
      C.pinta('ninho', { x: i + 0.5, y: j + 0.5, r: 1.4 });
      C.ocupa(i - 1, j - 1, 3, 1);
      C.pinta('moedas', { x: i + 2, y: j + 1.5, r: 1.1 });
      for (let k = 0; k < 3; k++) C.pinta('ossos', { x: i + 0.5 + C.ent(-2.5, 2.5), y: j + 0.5 + C.ent(-2.5, 2.5), n: 4, pilha: k === 0 });
      const ps = p.salas.find(s2 => s2.cx === q.x && s2.cy === q.y);
      if (ps) ps.papel = 'ninho';
    }
    // os ninhos pequenos e as carcaças pelas outras câmaras
    for (const o of livres) {
      if (o === q || C.r() > 0.55) continue;
      const i = Math.floor(o.x), j = Math.floor(o.y);
      if (!C.livre(i, j) || G.at(i, j) !== SALA) continue;
      C.pinta(C.r() < 0.5 ? 'ninho' : 'ossos', { x: i + 0.5, y: j + 0.5, r: 0.8, n: 5, pilha: true }); C.ocupa(i, j, 1, 1);
    }
    // as marcas de garra nas paredes (perto das bocas dos túneis)
    for (let k = 0, n = 0; k < 300 && n < 6; k++) {
      const i = 2 + Math.floor(C.r() * (C.W - 4)), j = 2 + Math.floor(C.r() * (C.H - 4));
      if (G.at(i, j) !== SALA || !C.livre(i, j)) continue;
      const rocha = DIRS.find(([a, b]) => G.at(i + a, j + b) === ROCHA);
      if (!rocha) continue;
      C.pinta('garras', { x: i + 0.5 + rocha[0] * 0.42, y: j + 0.5 + rocha[1] * 0.42, ang: Math.atan2(rocha[1], rocha[0]) }); n++;
    }
  }
  function detalhesDaCaverna(C) {
    const { G, W, H, p } = C;
    const longeDaRocha = (i, j, d) => { for (let b = -d; b <= d; b++) for (let a = -d; a <= d; a++) if (G.at(i + a, j + b) === ROCHA) return false; return true; };
    // as estalagmites: as grandes no meio do chão (tapam a visão), os grupinhos pequenos encostados nas paredes
    const nG = Math.round(W * H / 170);
    for (let t = 0, n = 0; t < 600 && n < nG; t++) {
      const i = 2 + Math.floor(C.r() * (W - 4)), j = 2 + Math.floor(C.r() * (H - 4));
      if (G.at(i, j) !== SALA || !C.livre(i, j) || !longeDaRocha(i, j, 1)) continue;
      if (p.lago && Math.hypot(i + 0.5 - p.lago.x, j + 0.5 - p.lago.y) < Math.max(p.lago.rx, p.lago.ry) + 1.5) continue;
      const x = i + 0.5 + C.ent(-0.1, 0.1), y = j + 0.5 + C.ent(-0.1, 0.1), rr = C.ent(0.45, 0.62);
      C.pinta('estalagmite', { x, y, r: rr, grande: true });
      C.ocupa(i, j, 1, 1);
      const pts = [];
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.3; pts.push([x + Math.cos(a) * rr * 0.85, y + Math.sin(a) * rr * 0.85]); }
      for (let k = 0; k < 6; k++) { const a = pts[k], b = pts[(k + 1) % 6]; p.visao.push([a[0], a[1], b[0], b[1]]); }
      n++;
    }
    for (let t = 0, n = 0; t < 600 && n < nG * 2; t++) {
      const i = 2 + Math.floor(C.r() * (W - 4)), j = 2 + Math.floor(C.r() * (H - 4));
      if (G.at(i, j) !== SALA || !C.livre(i, j) || longeDaRocha(i, j, 1)) continue;
      C.pinta('estalagmite', { x: i + 0.5, y: j + 0.5, r: C.ent(0.18, 0.3), n: 2 + Math.floor(C.r() * 3) });
      n++;
    }
    // os cogumelos que brilham: grupos encostados nas paredes, com a luz azulada
    const nCog = Math.max(2, Math.round(W * H / 420));
    for (let t = 0, n = 0; t < 500 && n < nCog; t++) {
      const i = 2 + Math.floor(C.r() * (W - 4)), j = 2 + Math.floor(C.r() * (H - 4));
      if (G.at(i, j) !== SALA || !C.livre(i, j) || longeDaRocha(i, j, 1)) continue;
      if (!C.poe('cogumelos', i, j)) continue;
      const cor = C.r() < 0.6 ? '#7fe9ff' : '#a8ff9a';
      C.pinta('cogumelos', { x: i + 0.5, y: j + 0.5, r: 1.1, cor });
      luz(C, i + 0.5, j + 0.5, 3, cor, 1);
      n++;
    }
    // as poças e os ossos
    for (let t = 0, n = 0; t < 300 && n < Math.round(W * H / 400); t++) {
      const i = 2 + Math.floor(C.r() * (W - 4)), j = 2 + Math.floor(C.r() * (H - 4));
      if (G.at(i, j) !== SALA || !C.livre(i, j)) continue;
      C.pinta(C.r() < 0.6 ? 'poca' : 'ossos', { x: i + 0.5, y: j + 0.5, r: C.ent(0.5, 1), n: 2 });
      n++;
    }
  }


  /* ================= (lote 18) o subsolo: a caverna embaixo da cena =================
     Do tamanho da cena de cima e alinhada com ela: a subida (a Saída) fica embaixo da entrada da gruta; o rio de cima
     (quando a gruta veio de uma Região livre com rio) vira o rio de baixo, pelo mesmo traçado, numa galeria; o bioma de
     baixo vem do terreno de cima (os fungos que brilham, os cristais, a lava, o gelo, as raízes); os achados e os ninhos
     (marcadores ocultos, com o nome do que é); e, querendo, a passagem escondida para o nível de baixo. */
  const BIOMAS_SUB = [['fungos', 'Fungos que brilham'], ['cristais', 'Cristais'], ['lava', 'Lava'], ['gelo', 'Gelo'], ['raizes', 'Raízes']];
  const NOTA_SUB = {
    fungos: 'Os cogumelos que brilham encostados nas paredes, as poças e o lago escuro.',
    cristais: 'Os cristais que brilham em azul e lilás (os grandes tapam a visão), o veio de pedra clara.',
    lava: 'O lago de lava (a zona de fogo, para o mestre aplicar), as rachaduras em brasa e o calor.',
    gelo: 'O lago congelado (escorregadio), as estalagmites de gelo e a geada nas paredes.',
    raizes: 'As raízes das árvores de cima descendo pelas paredes, os fungos e a terra úmida.',
  };
  // o bioma de baixo sugerido pelo de cima
  function biomaDeBaixo(bio) {
    const b = String(bio || '');
    if (/lava|vulc/.test(b)) return 'lava';
    if (/neve|tundra|gelo|geleira/.test(b)) return 'gelo';
    if (/cristal|montanha|colina|pedra/.test(b)) return 'cristais';
    if (/floresta|selva|mata|bosque|mangue/.test(b)) return 'raizes';
    return 'fungos';
  }
  // a distância de um ponto a uma linha quebrada [[x, y], …]
  function distLinha(pts, x, y) {
    let d = Infinity;
    for (let k = 1; k < pts.length; k++) { const [x1, y1] = pts[k - 1], [x2, y2] = pts[k], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1e-9, t = clamp(((x - x1) * dx + (y - y1) * dy) / L, 0, 1); d = Math.min(d, Math.hypot(x - x1 - dx * t, y - y1 - dy * t)); }
    return d;
  }
  function nivelDeSubsolo(C) {
    const { G, r, p, W, H } = C;
    const e0 = { x: clamp(p.entradaEm.x, 4, W - 4), y: clamp(p.entradaEm.y, 4, H - 4) };
    // 1) as câmaras: a da entrada (embaixo da gruta) e as outras numa grade grossa, mexida, longe dela
    const nx = W > 50 ? 5 : W > 38 ? 4 : 3, ny = H > 38 ? 4 : H > 26 ? 3 : 2, cw = (W - 4) / nx, chh = (H - 4) / ny;
    const cam = [{ i: 0, x: e0.x, y: e0.y, r: 2.8, rx: 3.1, ry: 2.6, liga: [], entrada: true }];
    for (let b = 0; b < ny; b++) for (let a = 0; a < nx; a++) {
      if (r() < 0.2) continue;
      const rr = C.ent(2.3, Math.min(cw, chh) * 0.36), x = 2 + cw * (a + 0.5) + C.ent(-cw * 0.22, cw * 0.22), y = 2 + chh * (b + 0.5) + C.ent(-chh * 0.22, chh * 0.22);
      if (Math.hypot(x - e0.x, y - e0.y) < rr + 4) continue;
      cam.push({ i: cam.length, x: clamp(x, rr + 3, W - rr - 3), y: clamp(y, rr + 3, H - rr - 3), r: rr, rx: rr * C.ent(0.85, 1.3), ry: rr * C.ent(0.75, 1.15), liga: [] });
    }
    const aberto = new Uint8Array(W * H);
    const cava = (x, y, rr) => { for (let j = Math.floor(y - rr); j <= Math.ceil(y + rr); j++) for (let i = Math.floor(x - rr); i <= Math.ceil(x + rr); i++) if (i >= 2 && j >= 2 && i < W - 2 && j < H - 2 && Math.hypot(i + 0.5 - x, j + 0.5 - y) <= rr) aberto[j * W + i] = 1; };
    for (const q of cam) {
      const ond = [C.ent(0, TAU), C.ent(0, TAU), C.ent(0.08, 0.2)];
      for (let j = Math.floor(q.y - q.ry - 2); j <= q.y + q.ry + 2; j++) for (let i = Math.floor(q.x - q.rx - 2); i <= q.x + q.rx + 2; i++) {
        if (i < 2 || j < 2 || i >= W - 2 || j >= H - 2) continue;
        const dx = (i + 0.5 - q.x) / q.rx, dy = (j + 0.5 - q.y) / q.ry, a = Math.atan2(dy, dx), lim = 1 + ond[2] * Math.sin(3 * a + ond[0]) + ond[2] * 0.7 * Math.sin(5 * a + ond[1]);
        if (Math.hypot(dx, dy) <= lim) aberto[j * W + i] = 1;
      }
    }
    // 2) os túneis tortos (a árvore mínima e um laço)
    const pares = [];
    for (let a = 0; a < cam.length; a++) for (let b = a + 1; b < cam.length; b++) pares.push([Math.hypot(cam[a].x - cam[b].x, cam[a].y - cam[b].y), a, b]);
    pares.sort((u, v) => u[0] - v[0]);
    const pai = cam.map((_, i) => i), raiz = i => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
    const andar = (A, B, larg) => {
      let x = A.x, y = A.y, ang = Math.atan2(B.y - y, B.x - x);
      for (let k = 0; k < 500 && Math.hypot(B.x - x, B.y - y) > 1; k++) {
        const alvo = Math.atan2(B.y - y, B.x - x);
        let d = alvo - ang; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        ang += d * 0.35 + C.ent(-0.55, 0.55);
        x = clamp(x + Math.cos(ang) * 0.7, 2.5, W - 2.5); y = clamp(y + Math.sin(ang) * 0.7, 2.5, H - 2.5);
        cava(x, y, larg + C.ent(-0.15, 0.3));
      }
    };
    for (const [, a, b] of pares) if (raiz(a) !== raiz(b)) { andar(cam[a], cam[b], C.ent(0.75, 1.25)); cam[a].liga.push(b); cam[b].liga.push(a); pai[raiz(a)] = raiz(b); }
    for (const [d, a, b] of pares) if (!cam[a].liga.includes(b) && d < 16 && r() < 0.4) { andar(cam[a], cam[b], C.ent(0.75, 1.1)); cam[a].liga.push(b); cam[b].liga.push(a); break; }
    // 3) o rio de baixo: a galeria pelo traçado do rio de cima (e um túnel da câmara mais perto até ele)
    const rio = Array.isArray(p.rioPts) && p.rioPts.length >= 2 ? p.rioPts.map(([x, y]) => [clamp(x, 0, W), clamp(y, 0, H)]) : null;
    if (rio) {
      for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) if (distLinha(rio, i + 0.5, j + 0.5) <= 2.1) aberto[j * W + i] = 1;
      let melhor = null;
      for (const q of cam) { const d = distLinha(rio, q.x, q.y); if (!melhor || d < melhor[0]) melhor = [d, q]; }
      if (melhor && melhor[0] > 2) {
        // (o ponto do rio mais perto da câmara)
        let alvo = null;
        for (let k = 1; k < rio.length; k++) for (let t = 0; t <= 1; t += 0.1) { const x = rio[k - 1][0] + (rio[k][0] - rio[k - 1][0]) * t, y = rio[k - 1][1] + (rio[k][1] - rio[k - 1][1]) * t, d = Math.hypot(x - melhor[1].x, y - melhor[1].y); if (!alvo || d < alvo[0]) alvo = [d, x, y]; }
        if (alvo) andar(melhor[1], { x: alvo[1], y: alvo[2] }, 1);
      }
    }
    // 4) alisar e ficar só com a maior região aberta
    for (let it = 0; it < 2; it++) {
      const n = aberto.slice();
      for (let j = 2; j < H - 2; j++) for (let i = 2; i < W - 2; i++) {
        let ab = 0;
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (a || b) ab += aberto[(j + b) * W + i + a];
        if (aberto[j * W + i] && ab <= 2) n[j * W + i] = 0; else if (!aberto[j * W + i] && ab >= 6) n[j * W + i] = 1;
      }
      aberto.set(n);
    }
    if (rio) for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) if (distLinha(rio, i + 0.5, j + 0.5) <= 1.6) aberto[j * W + i] = 1;     // (a galeria do rio vai até a borda)
    const reg = regioes(W, H, (i, j) => aberto[j * W + i] === 1);
    const ide = reg.id[Math.floor(e0.y) * W + Math.floor(e0.x)], maior = ide >= 0 ? ide : reg.lista.reduce((m, l, k) => (l.length > reg.lista[m].length ? k : m), 0);
    for (let k = 0; k < W * H; k++) G.g[k] = reg.id[k] === maior ? SALA : ROCHA;
    const vivas = cam.filter(q => G.at(Math.floor(q.x), Math.floor(q.y)) === SALA);
    const ent0 = vivas.find(q => q.entrada) || vivas[0];
    const dist = distancias(cam, ent0.i);
    const desc0 = vivas.filter(q => q !== ent0).sort((a, b) => (dist[b.i] || 0) - (dist[a.i] || 0) || Math.hypot(b.x - ent0.x, b.y - ent0.y) - Math.hypot(a.x - ent0.x, a.y - ent0.y))[0];
    const usadas = new Set([ent0, desc0]);
    // a água do rio (o fio do meio da galeria)
    if (rio) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (G.at(i, j) === SALA && distLinha(rio, i + 0.5, j + 0.5) <= 0.9) G.pos(i, j, AGUA);
    // 5) o lago (de água, de lava ou congelado): na maior câmara que sobrou
    const lagoQ = vivas.filter(q => !usadas.has(q)).sort((a, b) => b.r - a.r)[0];
    if (lagoQ && lagoQ.r >= 2.6) {
      usadas.add(lagoQ);
      const v = p.bioma === 'lava' ? LAVA : p.bioma === 'gelo' ? GELO : AGUA;
      const a0 = C.ent(0, TAU), cx = lagoQ.x + Math.cos(a0) * lagoQ.r * 0.3, cy = lagoQ.y + Math.sin(a0) * lagoQ.r * 0.3, rx = lagoQ.rx * 0.75, ry = lagoQ.ry * 0.7;
      for (let j = Math.floor(cy - ry - 1); j <= cy + ry + 1; j++) for (let i = Math.floor(cx - rx - 1); i <= cx + rx + 1; i++) {
        const dd = Math.hypot((i + 0.5 - cx) / rx, (j + 0.5 - cy) / ry);
        if (dd <= 1 + 0.12 * Math.sin(Math.atan2(j - cy, i - cx) * 4 + a0) && G.at(i, j) === SALA) G.pos(i, j, v);
      }
      p.lago = { x: cx, y: cy, rx, ry, k: v === LAVA ? 'lava' : v === GELO ? 'gelo' : 'agua' };
      if (v === LAVA) { p.zonas.push({ fx: 'lava', k: 'circ', x: cx, y: cy, r: Math.max(1, Math.min(rx, ry) * 0.9), gm: false, leve: true }); luz(C, cx, cy, Math.round(Math.max(rx, ry) + 4), '#ff7a2a', 2); }
      if (v === GELO) p.zonas.push({ fx: 'gelado', k: 'circ', x: cx, y: cy, r: Math.max(1, Math.min(rx, ry) * 0.9), gm: false, leve: true });
    }
    p.salas = vivas.map(q => ({ x: Math.round(q.x - q.r), y: Math.round(q.y - q.r), w: Math.round(q.r * 2), h: Math.round(q.r * 2), papel: q === ent0 ? 'entrada' : q === desc0 ? 'descida' : q === lagoQ ? 'lago' : 'camara' }));
    // 6) a subida: a escada natural da câmara da entrada, o mais perto possível de embaixo da gruta
    p.sobe = escadaPerto(C, ent0, e0.x, e0.y);
    p.desce = p.descida && desc0 ? escadaNatural(C, desc0, null, false) : null;
    // 7) o bioma: os detalhes de cada um (e os da caverna de sempre, menos ou mais)
    detalhesDoSubsolo(C);
    // 8) os achados e os ninhos (marcadores ocultos, com o nome do que é)
    if (p.achados) achadosDoSubsolo(C, vivas.filter(q => !usadas.has(q)).concat(vivas.filter(q => q === desc0)));
    // 9) as paredes: o contorno alisado do que não é rocha
    p.contorno = contornoTremido(W, H, (i, j) => G.at(i, j) !== ROCHA, p.seed % 9973);
    p.paredes = segmentosDe(p.contorno).concat(p.paredes);
  }
  // a escada natural (dois por dois, encostada na rocha) da câmara, a mais perto do ponto (x, y)
  function escadaPerto(C, q, x0, y0) {
    const { G } = C, cands = [];
    for (let j = Math.floor(q.y - q.r - 3); j <= q.y + q.r + 3; j++) for (let i = Math.floor(q.x - q.r - 3); i <= q.x + q.r + 3; i++) {
      if (!C.livreS(i, j, 2)) continue;
      let enc = null;
      if (G.at(i, j - 1) === ROCHA && G.at(i + 1, j - 1) === ROCHA) enc = 'n';
      else if (G.at(i, j + 2) === ROCHA && G.at(i + 1, j + 2) === ROCHA) enc = 's';
      else if (G.at(i - 1, j) === ROCHA && G.at(i - 1, j + 1) === ROCHA) enc = 'o';
      else if (G.at(i + 2, j) === ROCHA && G.at(i + 2, j + 1) === ROCHA) enc = 'l';
      cands.push([i, j, enc || 'n', Math.hypot(i + 1 - x0, j + 1 - y0) + (enc ? 0 : 2)]);
    }
    if (!cands.length) return escadaNatural(C, q, null, true);
    cands.sort((a, b) => a[3] - b[3]);
    const [x, y, enc] = cands[0];
    C.ocupa(x, y, 2, 2);
    const e = { x, y, w: 2, h: 2, lado: enc, sobe: true, natural: true };
    C.pinta('escada', e);
    return Object.assign(e, { mi: enc === 'o' ? x + 1 : x, mj: enc === 'n' ? y + 1 : y });
  }
  function detalhesDoSubsolo(C) {
    const { G, W, H, p } = C, bio = p.bioma;
    const longeDaRocha = (i, j, d) => { for (let b = -d; b <= d; b++) for (let a = -d; a <= d; a++) if (G.at(i + a, j + b) === ROCHA) return false; return true; };
    const sorteia = (n, ok, fn) => { for (let t = 0, k = 0; t < n * 60 && k < n; t++) { const i = 2 + Math.floor(C.r() * (W - 4)), j = 2 + Math.floor(C.r() * (H - 4)); if (G.at(i, j) !== SALA || !C.livre(i, j) || !ok(i, j)) continue; if (fn(i, j) !== false) k++; } };
    const longeDoLago = (i, j) => !p.lago || Math.hypot(i + 0.5 - p.lago.x, j + 0.5 - p.lago.y) > Math.max(p.lago.rx, p.lago.ry) + 1.5;
    // as estalagmites (as de gelo no gelo; as grandes tapam a visão)
    const nG = Math.round(W * H / 190);
    sorteia(nG, (i, j) => longeDaRocha(i, j, 1) && longeDoLago(i, j), (i, j) => {
      const x = i + 0.5 + C.ent(-0.1, 0.1), y = j + 0.5 + C.ent(-0.1, 0.1), rr = C.ent(0.45, 0.62);
      C.pinta('estalagmite', { x, y, r: rr, grande: true, gelo: bio === 'gelo' });
      C.ocupa(i, j, 1, 1);
      const pts = [];
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.3; pts.push([x + Math.cos(a) * rr * 0.85, y + Math.sin(a) * rr * 0.85]); }
      for (let k = 0; k < 6; k++) { const a = pts[k], b = pts[(k + 1) % 6]; p.visao.push([a[0], a[1], b[0], b[1]]); }
    });
    sorteia(nG * 2, (i, j) => !longeDaRocha(i, j, 1), (i, j) => { C.pinta('estalagmite', { x: i + 0.5, y: j + 0.5, r: C.ent(0.18, 0.3), n: 2 + Math.floor(C.r() * 3), gelo: bio === 'gelo' }); });
    // os fungos (em todos, menos no gelo; muitos nos Fungos, alguns nas Raízes)
    const nCog = bio === 'fungos' ? Math.max(4, Math.round(W * H / 220)) : bio === 'raizes' ? Math.max(2, Math.round(W * H / 500)) : bio === 'cristais' ? 1 : 0;
    sorteia(nCog, (i, j) => !longeDaRocha(i, j, 1), (i, j) => {
      if (!C.poe('cogumelos', i, j)) return false;
      const cor = C.r() < 0.6 ? '#7fe9ff' : '#a8ff9a';
      C.pinta('cogumelos', { x: i + 0.5, y: j + 0.5, r: 1.1, cor }); luz(C, i + 0.5, j + 0.5, 3, cor, 1);
    });
    if (bio === 'cristais') {
      // os cristais: grupos encostados nas paredes (com a luz) e alguns grandes no meio (tapam a visão)
      sorteia(Math.max(4, Math.round(W * H / 200)), (i, j) => !longeDaRocha(i, j, 1), (i, j) => {
        const cor = C.r() < 0.55 ? '#8fd6ff' : '#c79bff';
        C.pinta('cristal', { x: i + 0.5, y: j + 0.5, r: C.ent(0.5, 0.85), cor, n: 3 + Math.floor(C.r() * 3) }); C.ocupa(i, j, 1, 1);
        luz(C, i + 0.5, j + 0.5, 3, cor, 1);
      });
      sorteia(Math.max(2, Math.round(W * H / 500)), (i, j) => longeDaRocha(i, j, 1) && longeDoLago(i, j), (i, j) => {
        const cor = C.r() < 0.5 ? '#8fd6ff' : '#c79bff', x = i + 0.5, y = j + 0.5, rr = C.ent(0.55, 0.75);
        C.pinta('cristal', { x, y, r: rr, cor, n: 5, grande: true }); C.ocupa(i, j, 1, 1); luz(C, x, y, 4, cor, 1.5);
        for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU, b = ((k + 1) / 5) * TAU; p.visao.push([x + Math.cos(a) * rr * 0.8, y + Math.sin(a) * rr * 0.8, x + Math.cos(b) * rr * 0.8, y + Math.sin(b) * rr * 0.8]); }
      });
    } else if (bio === 'lava') {
      // as rachaduras em brasa no chão (com a luz fraca)
      sorteia(Math.max(3, Math.round(W * H / 260)), (i, j) => longeDoLago(i, j), (i, j) => { C.pinta('brasa', { x: i + 0.5, y: j + 0.5, r: C.ent(0.6, 1.1) }); luz(C, i + 0.5, j + 0.5, 2, '#ff8a3a', 0.8); });
    } else if (bio === 'gelo') {
      // a geada: manchas claras no chão, perto das paredes
      sorteia(Math.max(4, Math.round(W * H / 180)), (i, j) => !longeDaRocha(i, j, 1), (i, j) => { C.pinta('geada', { x: i + 0.5, y: j + 0.5, r: C.ent(0.7, 1.3) }); });
      sorteia(2, (i, j) => true, (i, j) => { luz(C, i + 0.5, j + 0.5, 3, '#bfe6ff', 1); });
    } else if (bio === 'raizes') {
      // as raízes descendo pelas paredes
      sorteia(Math.max(5, Math.round(W * H / 150)), (i, j) => !longeDaRocha(i, j, 1), (i, j) => {
        let a = null;
        for (const [dx, dy] of DIRS) if (G.at(i + dx, j + dy) === ROCHA) { a = Math.atan2(-dy, -dx); break; }
        C.pinta('raizes', { x: i + 0.5, y: j + 0.5, ang: a == null ? C.ent(0, TAU) : a, n: 3 + Math.floor(C.r() * 3) });
      });
    }
    // as poças e os ossos
    sorteia(Math.round(W * H / 420), () => true, (i, j) => { C.pinta(C.r() < 0.6 && bio !== 'lava' ? 'poca' : 'ossos', { x: i + 0.5, y: j + 0.5, r: C.ent(0.5, 1), n: 2 }); });
  }
  const ACHADOS_SUB = {
    fungos: ['Esqueleto com uma bolsa', 'Baú esquecido', 'Cogumelo raro (alquimia)'],
    cristais: ['Cristal de mana', 'Geodo aberto', 'Esqueleto de minerador com a picareta'],
    lava: ['Obsidiana', 'Ovo de salamandra', 'Armadura derretida'],
    gelo: ['Criatura presa no gelo', 'Mochila congelada', 'Cristal de gelo eterno'],
    raizes: ['Raiz que sangra seiva dourada', 'Ídolo enterrado', 'Baú entre as raízes'],
  };
  const NINHOS_SUB = { fungos: 'Ninho de aranhas', cristais: 'Toca de basilisco', lava: 'Ninho de salamandras', gelo: 'Toca do urso das cavernas', raizes: 'Ninho de vermes gigantes' };
  function achadosDoSubsolo(C, cams) {
    const { G, p } = C, bio = p.bioma;
    const chaoPerto = q => { for (let d = 0; d < 4; d++) for (let t = 0; t < 30; t++) { const i = Math.floor(q.x + C.ent(-d - 1, d + 1)), j = Math.floor(q.y + C.ent(-d - 1, d + 1)); if (G.at(i, j) === SALA && C.livre(i, j)) return [i, j]; } return null; };
    const [qa, qn] = cams;
    const a = qa ? chaoPerto(qa) : null;
    if (a) {
      const n = C.pick(ACHADOS_SUB[bio] || ACHADOS_SUB.fungos);
      p.marcadores.push({ id: 'achado', x: a[0], y: a[1], n: 'Achado: ' + n.toLowerCase() });
      if (/baú/i.test(n)) C.poe('bau', a[0], a[1]); else C.pinta('ossos', { x: a[0] + 0.5, y: a[1] + 0.5, n: 3 });
      C.ocupa(a[0], a[1], 1, 1);
    }
    const b = qn ? chaoPerto(qn) : null;
    if (b) {
      p.marcadores.push({ id: 'interesse', x: b[0], y: b[1], n: NINHOS_SUB[bio] || 'Ninho' });
      C.pinta('ninho', { x: b[0] + 0.5, y: b[1] + 0.5, r: 1.1 });
      C.ocupa(b[0], b[1], 1, 1);
    }
  }


  /* ================= (lote 18) as arenas de boss =================
     Um salão só, feito para a luta com o chefe: a entrada embaixo, o lugar do chefe no alto, de frente para ela (elevado,
     com a altura do relevo), a cobertura e os obstáculos (as colunas, as estátuas, as pedras: tapam a visão), os perigos
     no chão (as zonas com o efeito escrito: o mestre aplica), o chefe e os pontos de reforço (escondidos dos jogadores) e
     as fases prontas (arena.fases), que o mestre aciona na cena. Tudo com as casas da masmorra (o desenho é o dela). */
  const ARENAS = [
    ['coliseu', 'Arena (coliseu)'], ['trono', 'Sala do trono'], ['mausoleu', 'Mausoléu'], ['covil', 'Covil do dragão'],
    ['altar', 'Altar do ritual'], ['ponte', 'Ponte sobre o abismo'], ['topo', 'Topo da torre'], ['circulo', 'Círculo de pedras'],
    // (lote 38) as onze novas
    ['vampiro', 'Cripta do vampiro'], ['clareira', 'Clareira da lua cheia'], ['fosso', 'Fosso infernal'], ['ratos', 'Toca do Rei Rato'],
    ['lago', 'Lago congelado'], ['forja', 'Forja anã em ruínas'], ['fantasma', 'Navio fantasma na tempestade'], ['biblioteca', 'Biblioteca proibida'],
    ['pantano', 'Pântano da bruxa'], ['espelhos', 'Salão dos espelhos'], ['mina', 'Mina abandonada'],
  ];
  // (lote 38) os tipos agrupados por tema, para a escolha na janela
  const GRUPOS_ARENA = [
    ['mortos', 'Mortos e sombras', ['mausoleu', 'vampiro', 'fantasma']], ['feras', 'Feras', ['covil', 'clareira', 'ratos']],
    ['fogo', 'Fogo e gelo', ['fosso', 'forja', 'lago']], ['pedra', 'Pedra e metal', ['coliseu', 'trono', 'ponte', 'topo', 'mina']],
    ['magia', 'Magia', ['altar', 'circulo', 'biblioteca', 'pantano', 'espelhos']],
  ];
  const TAM_ARENA = { pequeno: { n: 'Pequena', W: 24, H: 18 }, medio: { n: 'Média', W: 30, H: 22 }, grande: { n: 'Grande', W: 36, H: 26 } };
  const NOME_ARENA = { coliseu: 'A arena', trono: 'A sala do trono', mausoleu: 'O mausoléu', covil: 'O covil do dragão', altar: 'O altar do ritual', ponte: 'A ponte sobre o abismo', topo: 'O topo da torre', circulo: 'O círculo de pedras',
    vampiro: 'A cripta do vampiro', clareira: 'A clareira da lua cheia', fosso: 'O fosso infernal', ratos: 'A toca do Rei Rato', lago: 'O lago congelado', forja: 'A forja anã em ruínas',
    fantasma: 'O navio fantasma', biblioteca: 'A biblioteca proibida', pantano: 'O pântano da bruxa', espelhos: 'O salão dos espelhos', mina: 'A mina abandonada' };
  const CHEFE_ARENA = { coliseu: 'O campeão', trono: 'O rei', mausoleu: 'O senhor dos mortos', covil: 'O dragão', altar: 'O sumo-sacerdote', ponte: 'O guardião da ponte', topo: 'O feiticeiro da torre', circulo: 'O espírito antigo',
    vampiro: 'O conde vampiro', clareira: 'O lobisomem alfa', fosso: 'O senhor do fosso', ratos: 'O Rei Rato', lago: 'A rainha do inverno', forja: 'O golem da forja',
    fantasma: 'O capitão fantasma', biblioteca: 'O bibliotecário lich', pantano: 'A bruxa do pântano', espelhos: 'O reflexo sem dono', mina: 'O golem de cristal' };
  const LACAIO_ARENA = { coliseu: 'Gladiador', trono: 'Guarda real', mausoleu: 'Morto-vivo', covil: 'Filhote', altar: 'Cultista', ponte: 'Sentinela', topo: 'Gárgula', circulo: 'Espírito',
    vampiro: 'Cria vampírica', clareira: 'Lobo', fosso: 'Diabrete', ratos: 'Rato gigante', lago: 'Lobo do gelo', forja: 'Autômato',
    fantasma: 'Marujo afogado', biblioteca: 'Livro vivo', pantano: 'Afogado', espelhos: 'Reflexo', mina: 'Cristal vivo' };
  // (lote 38) as arenas de paredes retas (o salão em quadrados; as outras têm o contorno alisado)
  const ARENA_RETA = new Set(['trono', 'mausoleu', 'vampiro', 'biblioteca', 'espelhos', 'forja']);
  const ARENAS_NOVAS = new Set(['vampiro', 'clareira', 'fosso', 'ratos', 'lago', 'forja', 'fantasma', 'biblioteca', 'pantano', 'espelhos', 'mina']);
  // (as que têm a grade na entrada, que a fase pode fechar)
  const COM_GRADE = new Set(['coliseu', 'trono', 'mausoleu', 'vampiro', 'forja', 'biblioteca', 'espelhos']);
  // as mudanças que uma fase pode ter (para trocar uma pela outra, na janela)
  const MUDANCAS = [
    ['reforcos', 'Reforços chegam'], ['desaba', 'O chão desaba'], ['luz', 'As luzes se apagam'], ['grade', 'A grade da entrada fecha'],
    ['zona:lava', 'A lava sobe'], ['zona:espinhos', 'Espinhos saem do chão'], ['zona:toxica', 'Névoa venenosa'], ['zona:gelado', 'O chão congela'],
    ['zona:runas', 'As runas se acendem'], ['zona:escuridao', 'A escuridão'], ['zona:tempestade', 'A tempestade'], ['zona:vento', 'Vento forte'], ['zona:chamasNegras', 'Chamas negras'],
    ['zona:arcano', 'A magia antiga desperta'], ['zona:luaSangue', 'A lua de sangue'], ['zona:fumaca', 'A fumaça toma o salão'], ['zona:oleo', 'O óleo se espalha'],
    // (lote 38) as mudanças de cada arena nova (só aparecem na arena delas: ver ESPECIAIS)
    ['caixoes', 'Os caixões se abrem'], ['morcegos', 'A nuvem de morcegos'], ['uivo', 'O uivo da alcateia'], ['lua', 'A lua cheia aparece'], ['arvores', 'As árvores caem'],
    ['portal', 'O portal do fosso se abre'], ['enxame', 'O enxame sai dos túneis'], ['transborda', 'O esgoto transborda'], ['racha', 'O gelo racha'], ['nevasca', 'A nevasca'],
    ['fole', 'O fole sopra brasas'], ['metal', 'O metal derretido transborda'], ['onda', 'A onda varre o convés'], ['mastro', 'O mastro cai'],
    ['livros', 'Os livros ganham vida'], ['estantes', 'As estantes desabam'], ['agua', 'A água do pântano sobe'], ['raizes', 'As raízes prendem'],
    ['reflexos', 'Os reflexos ganham vida'], ['estilhacos', 'Os espelhos se quebram'], ['desmorona', 'O teto desmorona'], ['gas', 'O gás da mina'], ['cristais', 'Os cristais pulsam'],
  ];
  // as fases prontas de cada arena: a 2 e a 3, cada uma com as mudanças dela (o mestre liga, desliga ou troca na janela)
  const FASES_ARENA = {
    coliseu: [['reforcos', 'zona:espinhos'], ['desaba', 'grade']],
    trono: [['reforcos', 'luz'], ['zona:chamasNegras', 'grade']],
    mausoleu: [['reforcos', 'zona:toxica'], ['luz', 'grade']],
    covil: [['reforcos', 'zona:lava'], ['desaba', 'zona:fumaca']],
    altar: [['reforcos', 'zona:runas'], ['zona:escuridao', 'desaba']],
    ponte: [['reforcos', 'desaba'], ['zona:vento', 'zona:tempestade']],
    topo: [['reforcos', 'zona:tempestade'], ['desaba', 'luz']],
    circulo: [['reforcos', 'zona:arcano'], ['zona:luaSangue', 'desaba']],
    vampiro: [['caixoes', 'morcegos'], ['luz', 'zona:luaSangue']],
    clareira: [['uivo', 'lua'], ['arvores', 'zona:escuridao']],
    fosso: [['portal', 'zona:lava'], ['zona:chamasNegras', 'desaba']],
    ratos: [['enxame', 'transborda'], ['desaba', 'luz']],
    lago: [['racha', 'nevasca'], ['reforcos', 'zona:gelado']],
    forja: [['fole', 'reforcos'], ['metal', 'desaba']],
    fantasma: [['onda', 'reforcos'], ['mastro', 'zona:tempestade']],
    biblioteca: [['livros', 'zona:runas'], ['estantes', 'zona:escuridao']],
    pantano: [['agua', 'reforcos'], ['zona:toxica', 'raizes']],
    espelhos: [['reflexos', 'luz'], ['estilhacos', 'zona:arcano']],
    mina: [['desmorona', 'gas'], ['cristais', 'reforcos']],
  };
  /* (lote 38) As mudanças próprias das arenas novas: de qual arena é cada uma (de) e o que ela faz — uma das mudanças de
     sempre (os reforços, uma zona, o chão que muda: desaba, com o terreno; ou as paredes que caem: muro), com os pontos
     que o desenho da arena marcou (a.pt) e o texto da prévia (txt). */
  const ESPECIAIS = {
    caixoes: { de: ['vampiro'], faz: a => ({ k: 'reforcos', pts: (a.pt.caixoes || a.reforcos).slice(0, 4), nome: 'Cria vampírica', txt: 'os caixões se abrem: ' + Math.min(4, (a.pt.caixoes || a.reforcos).length) + ' crias vampíricas se levantam' }) },
    morcegos: { de: ['vampiro'], faz: a => ({ k: 'zona', fx: 'sombra', x: a.chefe.x + 1, y: a.chefe.y + 4, r: 3, txt: 'a nuvem de morcegos cobre o meio da cripta (medo; tapa a visão)' }) },
    uivo: { de: ['clareira'], faz: a => ({ k: 'reforcos', pts: (a.pt.mata || a.reforcos).slice(0, 4), nome: 'Lobo', txt: 'o uivo: ' + Math.min(4, (a.pt.mata || a.reforcos).length) + ' lobos saem da mata' }) },
    lua: { de: ['clareira'], faz: a => ({ k: 'zona', fx: 'luaSangue', x: a.pt.centro[0], y: a.pt.centro[1], r: a.pt.raio || 4, txt: 'a lua cheia aparece sobre a clareira (as feras ficam mais fortes)' }) },
    arvores: { de: ['clareira'], faz: a => ({ k: 'muro', tipo: 'mureta', linhas: a.pt.arvores || [], txt: 'as árvores velhas caem atravessadas (meia cobertura; fecham passagens)' }) },
    portal: { de: ['fosso'], faz: a => ({ k: 'reforcos', pts: (a.pt.portal || a.reforcos).slice(0, 3), nome: 'Diabrete', txt: 'o portal do fosso se abre: 3 diabretes saem dele', mais: [{ k: 'zona', fx: 'portal', x: a.pt.centro[0], y: a.pt.centro[1], r: 1.5 }] }) },
    enxame: { de: ['ratos'], faz: a => ({ k: 'reforcos', pts: (a.pt.tuneis || a.reforcos).slice(0, 4), nome: 'Rato gigante', txt: 'o enxame sai dos túneis: ' + Math.min(4, (a.pt.tuneis || a.reforcos).length) + ' ratos gigantes' }) },
    transborda: { de: ['ratos'], faz: a => ({ k: 'zona', fx: 'toxica', x: a.pt.centro[0], y: a.pt.centro[1] + 2, r: 3.5, txt: 'o esgoto transborda: a água podre toma o chão (veneno)' }) },
    racha: { de: ['lago'], faz: a => Object.assign({ k: 'desaba', ter: 'agua', alt: -1.5, txt: 'o gelo racha no meio do lago: um buraco de água gelada (quem cai, afunda e congela)' }, a.pt.racha || a.desaba) },
    nevasca: { de: ['lago'], faz: a => ({ k: 'zona', fx: 'nevasca', x: a.pt.centro[0], y: a.pt.centro[1], r: a.pt.raio || 5, txt: 'a nevasca: o vento gelado e a neve tapam a visão' }) },
    fole: { de: ['forja'], faz: a => ({ k: 'zona', fx: 'brasas', x: a.pt.centro[0], y: a.pt.centro[1], r: 3, txt: 'o fole gigante sopra brasas pelo salão (fogo)' }) },
    metal: { de: ['forja'], faz: a => ({ k: 'zona', fx: 'lava', x: (a.pt.metal || a.pt.centro)[0], y: (a.pt.metal || a.pt.centro)[1], r: 2.2, txt: 'o metal derretido transborda dos canais' }) },
    onda: { de: ['fantasma'], faz: a => ({ k: 'zona', fx: 'correnteza', x: a.pt.centro[0], y: a.pt.centro[1], r: 4, txt: 'a onda varre o convés (empurra 2 quadrados para a borda)' }) },
    mastro: { de: ['fantasma'], faz: a => ({ k: 'muro', tipo: 'mureta', linhas: a.pt.mastro || [], txt: 'o mastro quebra e cai atravessado no convés (meia cobertura; fecha a passagem)' }) },
    livros: { de: ['biblioteca'], faz: a => ({ k: 'reforcos', pts: (a.pt.estantes || a.reforcos).slice(0, 4), nome: 'Livro vivo', txt: 'os livros saltam das estantes: ' + Math.min(4, (a.pt.estantes || a.reforcos).length) + ' livros vivos' }) },
    estantes: { de: ['biblioteca'], faz: a => ({ k: 'muro', tipo: 'wall', linhas: a.pt.queda || [], txt: 'as estantes desabam e fecham corredores' }) },
    agua: { de: ['pantano'], faz: a => Object.assign({ k: 'desaba', ter: 'agua', alt: -0.5, txt: 'a água do pântano sobe e cobre a trilha do meio (terreno difícil)' }, a.pt.agua || a.desaba) },
    raizes: { de: ['pantano'], faz: a => ({ k: 'zona', fx: 'teia', x: a.pt.centro[0], y: a.pt.centro[1], r: 3, txt: 'as raízes saem da lama e prendem quem está em volta da cabana' }) },
    reflexos: { de: ['espelhos'], faz: a => ({ k: 'reforcos', pts: (a.pt.espelhos || a.reforcos).slice(0, 4), nome: 'Reflexo', txt: 'os reflexos saem dos espelhos: ' + Math.min(4, (a.pt.espelhos || a.reforcos).length) + ' cópias de quem está no salão' }) },
    estilhacos: { de: ['espelhos'], faz: a => ({ k: 'zona', fx: 'espinhos', x: a.pt.centro[0], y: a.pt.centro[1], r: 3.5, txt: 'os espelhos se quebram: os estilhaços cobrem o chão (corta)' }) },
    desmorona: { de: ['mina'], faz: a => Object.assign({ k: 'desaba', ter: 'morro', alt: 1.5, txt: 'o teto desmorona: um monte de entulho no meio da galeria (cobertura; terreno difícil)' }, a.desaba) },
    gas: { de: ['mina'], faz: a => ({ k: 'zona', fx: 'toxica', x: a.pt.centro[0], y: a.pt.centro[1] + 2, r: 3.5, txt: 'o gás da mina se espalha pelo fundo (veneno)' }) },
    cristais: { de: ['mina'], faz: a => ({ k: 'zona', fx: 'cristais', x: a.chefe.x + 1, y: a.chefe.y + 1, r: 3, txt: 'os cristais do veio pulsam em volta do golem' }) },
  };
  const mudancasDe = tipo => MUDANCAS.filter(([k]) => !ESPECIAIS[k] || ESPECIAIS[k].de.includes(tipo));
  // (a sala do chefe do último nível da masmorra: a arena que combina com o tipo)
  const ARENA_DO_TIPO = { pedra: 'trono', cripta: 'mausoleu', caverna: 'covil', mina: 'mina', subsolo: 'covil',
    templo: 'altar', esgoto: 'ratos', torre: 'topo', laboratorio: 'biblioteca', fortaleza: 'trono', ruinas: 'circulo', covil: 'covil', navio: 'fantasma' };          // (lote 38: a mina, o esgoto, o laboratório e o navio ganharam as deles)
  const nomeMud = k => (MUDANCAS.find(x => x[0] === k) || [k, k])[1];
  /* (lote 38) As onze arenas novas. h: o que o nivelDeArena já tem (as casas, o estrado do chefe, a entrada de baixo, os
     perigos, as estátuas). Cada uma deixa em a.pt os pontos das mudanças próprias dela (ver ESPECIAIS): a.pt.centro (o
     meio da luta), e os da arena (os caixões, a mata, o portal, os túneis, a rachadura, o metal, o mastro, as estantes, a
     água, os espelhos). */
  function arenaNova(h) {
    const { C, G, p, a, W, H, cx, enche, ret, perigo, estatua, estradoChefe, entradaEmbaixo } = h;
    const t = a.tipo, pt = a.pt, cy = H / 2 - 0.5;
    const luz = (x, y, c, dim, bright) => p.luzes.push({ x, y, dim: dim || 6, bright: bright || 2, c });
    const caixa = (x0, y0, x1, y1, v) => enche(ret(x0, y0, x1 + 1, y1 + 1), v);           // as casas de x0..x1, y0..y1
    const salaReta = () => {
      const x0 = 2, y0 = 2, x1 = W - 3, y1 = H - 4;
      caixa(x0, y0, x1, y1, SALA);
      const { x0: e0, x1: e1 } = entradaEmbaixo(y1 + 1, 2);
      p.paredes.push({ x1: e0, y1: y1 + 1, x2: e1 + 1, y2: y1 + 1, k: 'door', grade: true });
      a.grade = { x: cx, y: y1 + 1 };
      return { x0, y0, x1, y1, my: (y0 + y1) / 2 };
    };
    if (t === 'vampiro') {
      // a cripta: o sarcófago do conde no estrado, o tapete vinho, os caixões em fileiras, a poça de sangue no meio
      const s = salaReta(), est = estradoChefe(cx - 2, s.y0, 4, 2, 1.5);
      C.pinta('sarcofago', { x: cx - 1, y: est.y + 0.2, w: 2, h: 1.6, grande: true, sangue: true });
      for (const i of [est.x - 1, est.x + est.w]) C.poe('candelabro', i, est.y);          // (lote 39: os candelabros e o cálice)
      C.poe('calice', est.x - 1, est.y + 1);
      C.pinta('tapete', { x: cx - 1, y: est.y + est.h, w: 2, h: s.y1 - est.y - est.h + 1, cor: '#5a0f1c' });
      pt.caixoes = [];
      for (let j = s.y0 + 3; j <= s.y1 - 2; j += 3) for (const i of [s.x0 + 1, s.x1 - 2]) {
        if (!C.livre(i, j) || !C.livre(i + 1, j)) continue;
        C.pinta('caixao', { x: i, y: j, w: 2, h: 1 }); C.ocupaRet(i, j, 2, 1, 1);
        pt.caixoes.push([i + (i < cx ? 0.5 : 1.5), j + 1.5]);
      }
      for (let j = s.y0 + 4; j <= s.y1 - 2; j += 4) for (const i of [Math.floor(cx) - 4, Math.floor(cx) + 3]) if (C.livre(i, j)) coluna(C, i + 0.5, j + 0.5, 0.42);
      C.pinta('sangue', { x: cx, y: s.my + 1.5, r: 1.5 });
      perigo('maldicao', cx, s.my + 1.5, 1.3);
      estatua(s.x0 + 0.5, s.y0 + 0.5); estatua(s.x1 + 0.5, s.y0 + 0.5);
      luz(cx, est.y + 1, '#b3122e', 7, 2);
      a.reforcos.push(...(pt.caixoes.length >= 2 ? pt.caixoes.slice(0, 4) : [[s.x0 + 2.5, s.my], [s.x1 - 1.5, s.my]]));          // (os pontos de reforço são os caixões)
      a.zonas = [['zona:luaSangue', cx, s.my + 1, 3.5]];
      a.desaba = { x: cx - 2, y: est.y + est.h + 2, w: 4, h: 2 };
      pt.centro = [cx, s.my + 1];
    } else if (t === 'clareira') {
      // a clareira da mata, a lua sobre o meio, o rochedo do alfa no alto, as árvores e as pedras como cobertura
      const yc = H / 2, R = Math.min(W, H) / 2 - 1.2, ond = C.ent(0, TAU);
      enche((i, j) => Math.hypot(i - cx, j - yc) <= R + 0.35 * Math.sin(Math.atan2(j - yc, i - cx) * 5 + ond), SALA);
      entradaEmbaixo(Math.ceil(yc + R) - 1, 3);
      const est = estradoChefe(cx - 2, yc - R + 1.4, 4, 2, 2);
      C.pinta('entulho', { x: cx - 2.5, y: est.y + 1, r: 0.9 }); C.pinta('entulho', { x: cx + 2.5, y: est.y + 1.2, r: 0.8 });
      C.poe('totemLobo', est.x + est.w, est.y + 1);          // (lote 39: o totem do lobo, as ossadas e as marcas de garra)
      for (let k = 0, n = 0; k < 60 && n < 4; k++) { const an = C.ent(0, TAU), d = C.ent(R * 0.3, R * 0.7), i = Math.floor(cx + Math.cos(an) * d), j = Math.floor(yc + Math.sin(an) * d); if (j > yc + R * 0.5) continue; if (C.poe(n < 2 ? 'ossada' : 'garras', i, j, 1, Math.floor(C.ent(0, 4)) * 90)) n++; }
      C.pinta('luar', { x: cx, y: yc + 0.5, r: R * 0.55 });
      C.pinta('floresta', { cx, cy: yc, r: R });
      for (let k = 0; k < 9; k++) {
        const an = -Math.PI / 2 + (k + 0.5) / 9 * TAU;
        if (Math.sin(an) > 0.75) continue;                                         // (a trilha da entrada fica livre)
        const x = cx + Math.cos(an) * R * 0.74, y = yc + Math.sin(an) * R * 0.74;
        C.poe(k % 3 === 0 ? 'pedra' : 'arvore', Math.floor(x), Math.floor(y));
      }
      for (const [x, y] of [[cx - R * 0.38, yc + R * 0.32], [cx + R * 0.38, yc + R * 0.32]]) C.poe('tronco', Math.floor(x), Math.floor(y));
      perigo('espinhos', cx - R * 0.58, yc + R * 0.42, 1); perigo('espinhos', cx + R * 0.58, yc + R * 0.42, 1);
      pt.mata = [[cx - R * 0.9, yc - R * 0.15], [cx + R * 0.9, yc - R * 0.15], [cx - R * 0.62, yc - R * 0.62], [cx + R * 0.62, yc - R * 0.62]];
      pt.arvores = [[cx - R * 0.62, yc - 0.6, cx - R * 0.2, yc + 1.1], [cx + R * 0.2, yc - 1.2, cx + R * 0.6, yc + 0.6]];
      a.reforcos.push(...pt.mata);          // (os lobos saem da mata)
      a.zonas = [['zona:escuridao', cx, yc, R * 0.7]];
      a.desaba = { x: cx - 1.5, y: yc + 1, w: 3, h: 2 };
      pt.centro = [cx, yc]; pt.raio = R * 0.6;
      luz(cx, yc, '#c8d6ff', 11, 4);
    } else if (t === 'fosso') {
      // o fosso de lava: a plataforma da entrada, a do portal no meio, a do senhor no alto e as dos lados, ligadas por pontes
      enche(() => true, LAVA);
      const fx = Math.floor(cx), my = Math.floor(cy);
      const pb = [fx - 4, H - 5, fx + 3, H - 1], pm = [fx - 3, my - 2, fx + 2, my + 2], pc = [fx - 3, 1, fx + 2, 4], pl = [2, my - 2, 5, my + 1], pr = [W - 6, my - 2, W - 3, my + 1];
      for (const q of [pb, pm, pc, pl, pr]) caixa(q[0], q[1], q[2], q[3], SALA);
      for (let j = pc[3] + 1; j < pm[1]; j++) for (let i = fx - 1; i <= fx; i++) G.pos(i, j, PONTE);
      for (let j = pm[3] + 1; j < pb[1]; j++) for (let i = fx - 1; i <= fx; i++) G.pos(i, j, PONTE);
      for (let i = pl[2] + 1; i < pm[0]; i++) G.pos(i, my, PONTE);
      for (let i = pm[2] + 1; i < pr[0]; i++) G.pos(i, my, PONTE);
      a.entrada = { x: cx, y: H - 1.5 };
      estradoChefe(cx - 2, pc[1] + 0.5, 4, 2, 1.5);
      C.pinta('portalInferno', { x: fx + 0.5 - 0.5, y: my + 0.5, r: 1.6 });
      p.zonas.push({ fx: 'portal', k: 'circ', x: fx, y: my + 0.5, r: 1.5, gm: true }); a.perigos.push('o portal (escondido)');
      pt.portal = [[fx - 2, my + 0.5], [fx + 2, my + 0.5], [fx, my + 2.5]];
      for (const q of [pl, pr]) { C.poe('braseiro', Math.floor((q[0] + q[2]) / 2), q[1]); C.poe('idolo', q === pl ? q[0] : q[2], q[3]); }          // (lote 39: os ídolos)
      perigo('chamasNegras', (pl[0] + pl[2]) / 2 + 0.5, my + 0.5, 1); perigo('chamasNegras', (pr[0] + pr[2]) / 2 + 0.5, my + 0.5, 1);
      for (const [x, y] of [[cx - 7, cy + 4], [cx + 7, cy - 4], [cx - 7, cy - 5], [cx + 7, cy + 5]]) luz(x, y, '#ff7a2a', 8, 3);
      a.reforcos.push(...pt.portal);          // (os diabretes saem do portal)
      a.zonas = [['zona:lava', cx, cy + 4, 2.5], ['zona:chamasNegras', cx, pc[3] + 3, 2]];
      a.desaba = { x: fx - 1, y: pm[3] + 1, w: 2, h: 2, ponte: true };
      pt.centro = [fx, my + 0.5];
    } else if (t === 'ratos') {
      // a toca: a câmara torta do esgoto, o canal de água podre, o trono de lixo do Rei Rato e os túneis dos lados
      const rx = W / 2 - 3.2, ry = H / 2 - 2.6, ond = C.ent(0, TAU);
      enche((i, j) => { const dx = (i - cx) / rx, dy = (j - cy) / ry, an = Math.atan2(dy, dx); return Math.hypot(dx, dy) <= 1 + 0.1 * Math.sin(4 * an + ond) + 0.06 * Math.sin(7 * an); }, SALA);
      entradaEmbaixo(Math.ceil(cy + ry) - 1, 2);
      const yc = cy + ry * 0.35;
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (G.at(i, j) === SALA && Math.abs(j + 0.5 - yc) < 0.9 && Math.abs(i + 0.5 - cx) > 1.6) G.pos(i, j, AGUA);
      pt.tuneis = [];
      for (const an of [Math.PI, 0, -Math.PI * 0.78, -Math.PI * 0.22]) {
        let x = cx, y = cy, ult = null;
        for (let k = 0; k < 60; k++) {
          x += Math.cos(an) * 0.5; y += Math.sin(an) * 0.5;
          const i = Math.floor(x), j = Math.floor(y);
          if (i < 1 || j < 1 || i >= W - 1 || j >= H - 1) break;
          if (G.at(i, j) === ROCHA) { for (let q = 0; q < 3; q++) { const ii = Math.floor(x + Math.cos(an) * q), jj = Math.floor(y + Math.sin(an) * q); if (ii >= 0 && jj >= 0 && ii < W && jj < H) G.pos(ii, jj, CORREDOR); } break; }
          if (G.at(i, j) === SALA) ult = [i + 0.5, j + 0.5];
        }
        if (ult) { pt.tuneis.push(ult); C.pinta('grade', { x: ult[0], y: ult[1] }); }
      }
      const est = estradoChefe(cx - 2, cy - ry + 1, 4, 2, 1.5);
      C.pinta('ninho', { x: cx, y: est.y + 1, r: 2, ratos: true });
      C.pinta('ossos', { x: cx - 1.4, y: est.y + 0.7, n: 4, pilha: true }); C.pinta('moedas', { x: cx + 1.2, y: est.y + 1.2, r: 0.7 });
      for (const i of [est.x - 1, est.x + est.w]) C.poe('tocha', i, est.y);
      C.poe('cranios', est.x - 1, est.y + 1);          // (lote 39)
      for (let k = 0, n = 0; k < 200 && n < 6; k++) {
        const i = Math.floor(cx + C.ent(-rx * 0.85, rx * 0.85)), j = Math.floor(cy + C.ent(-ry * 0.5, ry * 0.15));
        if (!C.livre(i, j)) continue;
        if (n % 3 === 2) { C.pinta('entulho', { x: i + 0.5, y: j + 0.5, r: 0.7 }); C.ocupa(i, j, 1); } else C.poe(n % 2 ? 'barril' : 'caixote', i, j);
        n++;
      }
      C.pinta('ossos', { x: cx - rx * 0.4, y: cy - ry * 0.1, n: 4 }); C.pinta('ossos', { x: cx + rx * 0.45, y: cy + ry * 0.05, n: 3 });
      perigo('toxica', cx - rx * 0.55, yc, 1.2); perigo('toxica', cx + rx * 0.55, yc, 1.2);
      a.reforcos.push(...(pt.tuneis.length >= 2 ? pt.tuneis : [[cx - rx * 0.7, cy], [cx + rx * 0.7, cy]]));          // (o enxame sai dos túneis)
      a.zonas = [['zona:toxica', cx, yc, 3]];
      a.desaba = { x: cx - 2, y: cy - 1, w: 4, h: 2 };
      pt.centro = [cx, cy];
    } else if (t === 'lago') {
      // o lago congelado no meio da gruta, a margem de neve, o trono de gelo da rainha no alto, os espinhos de gelo
      const rx = W / 2 - 1.5, ry = H / 2 - 1.5, lx = W * 0.3, ly = H * 0.24;
      enche((i, j) => Math.hypot((i - cx) / rx, (j - cy) / ry) <= 1, SALA);
      enche((i, j) => Math.hypot((i - cx) / lx, (j - cy - 0.5) / ly) <= 1, GELO);
      entradaEmbaixo(Math.ceil(cy + ry) - 1, 3);
      const est = estradoChefe(cx - 2, cy - ry + 1.2, 4, 2, 2);
      for (const sx of [-1, 1]) C.pinta('cristal', { x: cx + sx * 2.7, y: est.y + 1, r: 0.7, n: 4, cor: '#bfe3ff', grande: true });
      for (let k = 0; k < 8; k++) {
        const an = (k / 8) * TAU + 0.35, x = cx + Math.cos(an) * (rx - 1.8), y = cy + Math.sin(an) * (ry - 1.6);
        C.pinta('geada', { x, y, r: 1.8 });
        if (k % 2 === 0 && Math.sin(an) < 0.7 && C.livre(Math.floor(x), Math.floor(y))) { C.pinta('cristal', { x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5, r: 0.45, n: 3, cor: '#d6efff' }); C.ocupa(Math.floor(x), Math.floor(y), 1); }
      }
      p.zonas.push({ fx: 'gelado', k: 'circ', x: cx, y: cy + 0.5, r: Math.min(lx, ly), gm: false, leve: true }); a.perigos.push('gelado');
      pt.racha = { x: Math.floor(cx) - 2, y: Math.floor(cy), w: 4, h: 2 };
      a.reforcos.push([cx - rx + 1.5, cy], [cx + rx - 1.5, cy], [cx - lx, cy - ly - 1]);
      a.zonas = [['zona:gelado', cx, cy, Math.min(lx, ly)]];
      a.desaba = pt.racha;
      pt.centro = [cx, cy]; pt.raio = Math.min(lx, ly) + 1.5;
      luz(cx, cy, '#cfe8ff', 10, 3);
    } else if (t === 'forja') {
      // a forja anã: os dois canais de metal derretido (com a passagem no meio), as bigornas, as fornalhas, o fole
      const s = salaReta(), meio = Math.floor(s.my);
      for (const c0 of [s.x0 + 4, s.x1 - 5]) for (let j = s.y0 + 3; j <= s.y1 - 3; j++) for (let i = c0; i < c0 + 2; i++) G.pos(i, j, j === meio || j === meio + 1 ? PONTE : LAVA);
      const est = estradoChefe(cx - 2, s.y0, 4, 2, 1.5);
      C.poe('bigorna', Math.floor(cx) - 1, est.y + est.h);
      for (const [i, j] of [[cx - 3, s.y0 + 5], [cx + 2, s.y0 + 5], [cx - 3, s.y1 - 3], [cx + 2, s.y1 - 3]]) C.poe('bigorna', Math.floor(i), Math.floor(j));
      for (const i of [s.x0 + 1, s.x1 - 1]) for (let j = s.y0 + 4; j <= s.y1 - 2; j += 4) C.poe('fornalha', i, j);
      C.pinta('fole', { x: s.x0 + 1.7, y: s.y0 + 1.6, ang: 0.55 }); C.ocupaRet(s.x0, s.y0, 3, 3, 1);
      C.pinta('colunaCaida', { x: cx - 2.5, y: s.my + 2.2, ang: 0.4 }); C.pinta('entulho', { x: cx + 3, y: s.my + 1, r: 1 });
      for (const [i, j] of [[s.x0 + 2, s.y1 - 1], [s.x1 - 2, s.y1 - 1], [s.x0 + 2, s.y1 - 2]]) C.poe('barril', Math.floor(i), Math.floor(j));
      perigo('brasas', cx, s.my + 2.5, 1.2);
      for (const c0 of [s.x0 + 5, s.x1 - 4]) for (const yy of [s.y0 + 4, s.y1 - 4]) luz(c0, yy, '#ff8a3a', 7, 2);
      pt.metal = [s.x0 + 5, s.my - 3];
      a.reforcos.push([s.x0 + 1.5, s.y1 - 0.5], [s.x1 - 0.5, s.y1 - 0.5]);
      a.zonas = [['zona:fumaca', cx, s.my, 3]];
      a.desaba = { x: cx - 2, y: est.y + est.h + 2, w: 4, h: 2 };
      pt.centro = [cx, s.my];
    } else if (t === 'fantasma') {
      // o navio na tempestade: o casco no meio do mar (a proa no alto, com o capitão), os mastros, a prancha embaixo
      enche(() => true, AGUA);
      const hw = Math.min(W * 0.22, 6), topo = 1.5, fundo = H - 3.5;
      const larg = j => { const tt = (j - topo) / (fundo - topo); return tt < 0 || tt > 1 ? -1 : tt < 0.3 ? hw * Math.sin((tt / 0.3) * Math.PI / 2) : tt > 0.86 ? hw * (0.55 + 0.45 * Math.cos(((tt - 0.86) / 0.14) * Math.PI / 2)) : hw; };
      enche((i, j) => Math.abs(i - cx) <= larg(j), SALA);
      for (let j = Math.floor(fundo); j < H; j++) for (let i = Math.floor(cx) - 1; i <= Math.floor(cx); i++) if (G.at(i, j) === AGUA) G.pos(i, j, PONTE);
      a.entrada = { x: cx, y: H - 1.5 };
      estradoChefe(cx - 2, topo + 3, 4, 2, 1.5);
      const mastros = [topo + (fundo - topo) * 0.42, topo + (fundo - topo) * 0.7];
      for (const my of mastros) { C.pinta('mastro', { x: cx, y: my, larg: hw * 2 - 0.6 }); C.ocupa(Math.floor(cx - 0.5), Math.floor(my), 1); }
      pt.mastro = [[cx - hw + 0.4, mastros[0] + 1.3, cx + hw - 0.4, mastros[0] + 1.8]];
      for (let k = 0, n = 0; k < 200 && n < 6; k++) {
        const sx = k % 2 ? -1 : 1, i = Math.floor(cx + sx * (hw - 1.2)), j = Math.floor(C.ent(topo + 6, fundo - 1));
        if (!C.livre(i, j)) continue;
        C.poe(n % 2 ? 'barril' : 'caixote', i, j); n++;
      }
      C.pinta('corda', { x: cx - hw + 1.5, y: fundo - 2, r: 0.5 }); C.pinta('corda', { x: cx + hw - 1.5, y: topo + 7, r: 0.45 });
      for (const [x, y] of [[cx - hw + 0.8, mastros[0]], [cx + hw - 0.8, mastros[1]], [cx, topo + 2]]) luz(x, y, '#7fe9d0', 6, 2);
      perigo('tempestade', cx, mastros[1] + 2.5, 1.3);
      // a amurada: a mureta na beira do convés e da prancha (meia cobertura); a ponta da prancha fica na beira do mapa
      const deck = (i, j) => { const v = G.at(i, j); return v === SALA || v === PONTE; };
      const bordas = contornos(W, H, deck).map(l => simplifica(l, 0.3)).filter(l => l.length > 3);
      for (const w of segmentosDe(bordas)) { if (w.y1 >= H - 0.01 && w.y2 >= H - 0.01) continue; p.paredes.push(Object.assign(w, { k: 'mureta' })); }
      a.reforcos.push([cx - hw + 1, fundo - 2.5], [cx + hw - 1, fundo - 2.5], [cx - hw + 1, mastros[0] - 2], [cx + hw - 1, mastros[0] - 2]);
      a.zonas = [['zona:tempestade', cx, (topo + fundo) / 2, hw + 3]];
      a.desaba = { x: Math.floor(cx) - 1, y: Math.floor(mastros[1]) + 2, w: 2, h: 2 };
      pt.centro = [cx, (topo + fundo) / 2];
    } else if (t === 'biblioteca') {
      // a biblioteca proibida: as fileiras de estantes (tapam a visão), o círculo das runas no meio (escondidas), a mesa
      // de leitura do lich no estrado, as velas
      const s = salaReta(), est = estradoChefe(cx - 2, s.y0, 4, 2, 1.5);
      C.pinta('livrosAbertos', { x: cx, y: est.y + 0.9, grande: true });
      for (const i of [est.x - 1, est.x + est.w]) C.poe('vela', i, est.y);
      pt.estantes = []; pt.queda = [];
      for (let j = s.y0 + 3; j <= s.y1 - 3; j += 3) for (const lado of [-1, 1]) {
        const i0 = lado < 0 ? s.x0 + 1 : Math.floor(cx) + 3, i1 = lado < 0 ? Math.floor(cx) - 4 : s.x1 - 1;
        if (i1 - i0 < 2) continue;
        let n = 0;
        for (let i = i0; i <= i1; i++) if (C.livre(i, j)) { C.poe('estante', i, j, 1, ROT_FRENTE.s); n++; }
        if (n) { p.visao.push([i0, j + 0.5, i1 + 1, j + 0.5]); pt.estantes.push([(i0 + i1 + 1) / 2, j + 1.5]); }
        if (j === s.y0 + 6) pt.queda.push([lado < 0 ? i1 + 1 : i0, j + 0.2, lado < 0 ? i1 + 2.6 : i0 - 1.6, j + 1.6]);
      }
      const ry0 = s.my + 1.5;
      C.pinta('circuloRunico', { x: cx, y: ry0, r: 2.2, cor: '#6a3fb5' });
      p.zonas.push({ fx: 'runas', k: 'circ', x: cx, y: ry0, r: 2.2, gm: true }); a.perigos.push('runas (escondidas)');
      C.pinta('livrosAbertos', { x: cx - 1.8, y: s.y1 - 1.2 }); C.pinta('livrosAbertos', { x: cx + 2.2, y: s.y0 + 4.5 });
      for (const [x, y] of [[s.x0 + 1, s.y1 - 1], [s.x1 - 1, s.y1 - 1]]) C.poe('vela', x, y);
      luz(cx, est.y + 1.5, '#b39cf0', 7, 2); luz(cx, ry0, '#8a5cf0', 5, 1);
      a.reforcos.push(...(pt.estantes.length >= 2 ? pt.estantes.slice(0, 4) : [[s.x0 + 1.5, s.my], [s.x1 - 0.5, s.my]]));          // (os livros saltam das estantes)
      a.zonas = [['zona:runas', cx, ry0, 2.2], ['zona:escuridao', cx, s.my, 4]];
      a.desaba = { x: cx - 2, y: ry0 + 2.5, w: 4, h: 2 };
      pt.centro = [cx, ry0];
    } else if (t === 'pantano') {
      // o pântano: as ilhas de lama entre a água parada, a cabana da bruxa no alto (com o caldeirão), as raízes
      const rx = W / 2 - 1.6, ry = H / 2 - 1.6;
      enche((i, j) => Math.hypot((i - cx) / rx, (j - cy) / ry) <= 1, AGUA);
      const ilhas = [[cx, cy - ry + 3.2, 4.2, 2.6], [cx, cy + ry - 2.6, 3.4, 2], [cx - rx * 0.5, cy, 2.8, 2.2], [cx + rx * 0.5, cy + 0.5, 2.8, 2.2], [cx, cy + 0.5, 2.6, 2]];
      for (const [x, y, rrx, rry] of ilhas) enche((i, j) => Math.hypot((i - x) / rrx, (j - y) / rry) <= 1 + 0.12 * Math.sin(i * 1.7 + j), SALA);
      // as trilhas (a lama firme) entre as ilhas
      const trilha = (a0, b0) => { const n = Math.ceil(Math.hypot(b0[0] - a0[0], b0[1] - a0[1]) * 2); for (let k = 0; k <= n; k++) { const x = a0[0] + (b0[0] - a0[0]) * k / n, y = a0[1] + (b0[1] - a0[1]) * k / n; for (const [di, dj] of [[0, 0], [1, 0], [0, 1]]) { const i = Math.floor(x) + di - 0, j = Math.floor(y) + dj; if (G.at(i, j) === AGUA) G.pos(i, j, CORREDOR); } } };
      const c = ilhas.map(q => [q[0], q[1]]);
      trilha(c[1], c[4]); trilha(c[4], c[0]); trilha(c[4], c[2]); trilha(c[4], c[3]);
      entradaEmbaixo(Math.ceil(cy + ry) - 1, 2);
      const est = estradoChefe(cx - 1.5, c[0][1] - 1.5, 3, 2, 1);
      C.pinta('cabana', { x: cx, y: est.y + 0.9, w: 3.2, h: 2.2 });
      C.poe('caldeirao', Math.floor(cx + 2.6), Math.floor(c[0][1] + 0.6)) || C.pinta('caldeirao', { x: cx + 2.6, y: c[0][1] + 0.6, r: 0.6 });          // (lote 39: o caldeirão de verdade, que borbulha)
      for (const [x, y] of [[c[2][0] - 1, c[2][1] - 1], [c[3][0] + 1, c[3][1] - 1], [cx - 3, c[0][1] + 1]]) C.pinta('raizes', { x, y, n: 5, ang: C.ent(0, TAU) });
      C.pinta('cogumelos', { x: c[2][0] + 0.8, y: c[2][1] + 0.6, r: 0.8, cor: '#9fdc6a' }); C.pinta('cogumelos', { x: c[3][0] - 0.6, y: c[3][1] + 0.8, r: 0.7, cor: '#c08af0' });
      perigo('pantano', c[2][0], c[2][1] + 1.4, 1.1); perigo('pantano', c[3][0], c[3][1] + 1.4, 1.1);
      luz(cx + 2.6, c[0][1] + 0.6, '#7fe07f', 6, 2);
      pt.agua = { x: Math.floor(cx) - 2, y: Math.floor(c[4][1]) - 1, w: 4, h: 3 };
      a.reforcos.push([c[2][0] - 1.5, c[2][1]], [c[3][0] + 1.5, c[3][1]], [cx - 3, c[1][1] - 1]);
      a.zonas = [['zona:toxica', cx, cy + 1, 3]];
      a.desaba = pt.agua;
      pt.centro = [cx, c[0][1] + 1];
    } else if (t === 'espelhos') {
      // o salão dos espelhos: os espelhos nas paredes e os de pé em volta do meio (tapam a visão), o chão em xadrez
      const s = salaReta(), est = estradoChefe(cx - 2, s.y0, 4, 2, 1.5);
      C.pinta('espelho', { x: cx, y: est.y + 0.25, w: 2, rot: 0, grande: true });
      pt.espelhos = [];
      for (let j = s.y0 + 3; j <= s.y1 - 2; j += 3) for (const [i, rot] of [[s.x0 + 0.15, Math.PI / 2], [s.x1 + 0.85, -Math.PI / 2]]) {
        C.pinta('espelho', { x: i + (i < cx ? 0.12 : -0.12), y: j + 0.5, w: 1.7, rot });
        pt.espelhos.push([i < cx ? s.x0 + 1.5 : s.x1 - 0.5, j + 0.5]);
      }
      const rr = Math.min(s.x1 - s.x0, s.y1 - s.y0) * 0.28;
      for (let k = 0; k < 6; k++) {
        const an = (k + 0.5) / 6 * TAU, x = cx + Math.cos(an) * rr, y = s.my + 1 + Math.sin(an) * rr * 0.8;
        if (Math.sin(an) > 0.85) continue;
        const i = Math.floor(x), j = Math.floor(y);
        if (!C.livre(i, j)) continue;
        C.pinta('espelho', { x: i + 0.5, y: j + 0.5, w: 1.3, rot: an + Math.PI / 2, pe: true }); C.ocupa(i, j, 1);
        const ux = Math.cos(an + Math.PI / 2) * 0.5, uy = Math.sin(an + Math.PI / 2) * 0.5;
        p.visao.push([i + 0.5 - ux, j + 0.5 - uy, i + 0.5 + ux, j + 0.5 + uy]);
      }
      for (const [x, y] of [[s.x0 + 0.5, s.y0 + 0.5], [s.x1 + 0.5, s.y0 + 0.5]]) estatua(x, y);
      luz(cx, s.my, '#e6f0ff', 9, 3);
      a.reforcos.push(...pt.espelhos.slice(0, 4));          // (os reflexos saem dos espelhos)
      a.zonas = [['zona:arcano', cx, s.my + 1, rr]];
      a.desaba = { x: cx - 2, y: s.my + 1, w: 4, h: 2 };
      pt.centro = [cx, s.my + 1];
    } else if (t === 'mina') {
      // a galeria da mina: os trilhos e os vagonetes, as escoras, os veios de cristal, o golem no alto, sobre o cristal
      const rx = W / 2 - 2.4, ry = H / 2 - 2.2, ond = [C.ent(0, TAU), C.ent(0, TAU)];
      enche((i, j) => { const dx = (i - cx) / rx, dy = (j - cy) / ry, an = Math.atan2(dy, dx); return Math.hypot(dx, dy) <= 1 + 0.1 * Math.sin(3 * an + ond[0]) + 0.07 * Math.sin(6 * an + ond[1]); }, SALA);
      entradaEmbaixo(Math.ceil(cy + ry) - 1, 3);
      const est = estradoChefe(cx - 2.5, cy - ry + 1, 5, 3, 3);
      C.pinta('cristal', { x: cx - 2.6, y: est.y + 1.5, r: 1.1, n: 6, cor: '#8fd8ff', grande: true }); C.pinta('cristal', { x: cx + 2.7, y: est.y + 1.2, r: 1, n: 5, cor: '#c08af0', grande: true });
      // os trilhos: da entrada até o pé do estrado, com uma curva para um lado
      const tr = [[cx, H - 1], [cx, cy + 2], [cx - rx * 0.5, cy - 0.5], [cx - rx * 0.75, cy - ry * 0.4]];
      C.pinta('trilho', { pts: tr });
      C.pinta('vagonete', { x: cx + 0.5, y: cy + 3.5, ang: Math.PI / 2, cheio: true }); C.ocupa(Math.floor(cx), Math.floor(cy + 3.5), 1);
      C.pinta('vagonete', { x: cx - rx * 0.62, y: cy - ry * 0.18, ang: 0.6, cheio: false });
      for (const [x, y] of [[cx - rx * 0.6, cy + ry * 0.4], [cx + rx * 0.6, cy + ry * 0.4], [cx + rx * 0.7, cy - ry * 0.2], [cx - rx * 0.3, cy - ry * 0.55]]) { const i = Math.floor(x), j = Math.floor(y); if (C.livre(i, j)) { C.pinta('escora', { x: i + 0.5, y: j + 0.5, ang: 0 }); C.ocupa(i, j, 1); } }
      for (const [x, y, w0, h0, cor] of [[cx + rx * 0.45, cy + ry * 0.05, 2.5, 1, '#9fd4ff'], [cx - rx * 0.85, cy + ry * 0.2, 1, 2.2, '#c08af0']]) C.pinta('veio', { x, y, w: w0, h: h0, cor });
      for (const [x, y] of [[cx - rx * 0.4, cy + ry * 0.55], [cx + rx * 0.4, cy + ry * 0.55]]) C.poe('lampiao', Math.floor(x), Math.floor(y));
      C.pinta('entulho', { x: cx + rx * 0.3, y: cy - ry * 0.4, r: 0.9 }); C.pinta('ferramentas', { x: cx - rx * 0.2, y: cy + ry * 0.3 });
      perigo('toxica', cx - rx * 0.6, cy + ry * 0.45, 1.1);
      for (const [x, y, c0] of [[cx - 2.6, est.y + 1.5, '#8fd8ff'], [cx + 2.7, est.y + 1.2, '#c08af0']]) luz(x, y, c0, 7, 2);
      a.reforcos.push([cx - rx * 0.8, cy], [cx + rx * 0.8, cy], [cx + rx * 0.5, cy - ry * 0.5]);
      a.zonas = [['zona:toxica', cx, cy + 2, 3]];
      a.desaba = { x: cx - 2, y: cy, w: 4, h: 2 };
      pt.centro = [cx, cy];
    }
    pt.centro = pt.centro || [cx, cy];
  }
  function nivelDeArena(C) {
    const { G, p, W, H } = C, a = p.arena, cx = W / 2;
    const enche = (dentro, v) => { for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (dentro(i + 0.5, j + 0.5)) G.pos(i, j, v); };
    const elipse = (x, y, rx, ry) => (i, j) => Math.hypot((i - x) / rx, (j - y) / ry) <= 1;
    const ret = (x0, y0, x1, y1) => (i, j) => i >= x0 && i <= x1 && j >= y0 && j <= y1;
    a.reforcos = []; a.perigos = []; a.zonas = []; a.pt = {};
    const perigo = (fx, x, y, r, gm) => { p.zonas.push({ fx, k: 'circ', x, y, r, gm: !!gm, leve: true }); a.perigos.push(fx); };
    const estatua = (x, y) => { if (C.poe('estatua', Math.floor(x), Math.floor(y))) { const pts = []; for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU; pts.push([Math.floor(x) + 0.5 + Math.cos(an) * 0.38, Math.floor(y) + 0.5 + Math.sin(an) * 0.38]); } for (let k = 0; k < 6; k++) { const u = pts[k], v = pts[(k + 1) % 6]; p.visao.push([u[0], u[1], v[0], v[1]]); } } };
    const estradoChefe = (x, y, w, h, alt) => {
      const est = { x: Math.round(x), y: Math.round(y), w, h };
      p.relevo.push({ t: 'plataforma', alt, k: 'rect', x: est.x + 0.05, y: est.y + 0.05, w: est.w - 0.1, h: est.h - 0.1 });
      C.pinta('estrado', est); C.ocupaRet(est.x, est.y, est.w, est.h, 1);
      a.chefe = { x: est.x + est.w / 2 - 1, y: est.y + est.h / 2 - 1 };
      return est;
    };
    const entradaEmbaixo = (yTopo, larg) => {
      const x0 = Math.floor(cx - larg / 2), x1 = x0 + larg - 1;
      for (let j = Math.floor(yTopo); j < H; j++) for (let i = x0; i <= x1; i++) if (G.at(i, j) === ROCHA) G.pos(i, j, CORREDOR);
      a.entrada = { x: cx, y: H - 1.5 };
      return { x0, x1 };
    };
    if (ARENAS_NOVAS.has(a.tipo)) arenaNova({ C, G, p, a, W, H, cx, enche, ret, perigo, estatua, estradoChefe, entradaEmbaixo });          // (lote 38)
    else if (a.tipo === 'coliseu') {
      const cy = H / 2 - 0.5, rx = W / 2 - 2.5, ry = H / 2 - 2.2;
      enche(elipse(cx, cy, rx, ry), SALA);
      const yb = Math.ceil(cy + ry) - 0.5, { x0, x1 } = entradaEmbaixo(yb - 1, 3);
      p.paredes.push({ x1: x0, y1: Math.floor(yb) + 1, x2: x1 + 1, y2: Math.floor(yb) + 1, k: 'door', grade: true });
      a.grade = { x: cx, y: Math.floor(yb) + 1 };
      estradoChefe(cx - 3, cy - ry + 0.6, 6, 2, 3);
      for (const [dx, dy] of [[-0.55, -0.1], [0.55, -0.1], [-0.3, 0.35], [0.3, 0.35]]) estatua(cx + dx * rx, cy + dy * ry);
      for (const [dx, dy] of [[-0.25, -0.05], [0.25, -0.05], [0, 0.2]]) { const i = Math.floor(cx + dx * rx), j = Math.floor(cy + dy * ry); C.poe(C.r() < 0.5 ? 'caixote' : 'barril', i, j); }
      perigo('espinhos', cx - rx * 0.62, cy + ry * 0.2, 1.2); perigo('espinhos', cx + rx * 0.62, cy + ry * 0.2, 1.2);
      a.reforcos.push([cx - rx * 0.85, cy], [cx + rx * 0.85, cy]);
      C.pinta('arquibancada', { cx, cy, rx, ry });
      a.zonas = [['zona:espinhos', cx, cy + ry * 0.1, Math.min(rx, ry) * 0.45]];
      a.desaba = { x: cx - 2, y: cy - 1, w: 4, h: 3 };
    } else if (a.tipo === 'trono' || a.tipo === 'mausoleu') {
      const x0 = 2, y0 = 2, x1 = W - 3, y1 = H - 4;
      enche(ret(x0, y0, x1 + 1, y1 + 1), SALA);
      const { x0: e0, x1: e1 } = entradaEmbaixo(y1 + 1, 2);
      p.paredes.push({ x1: e0, y1: y1 + 1, x2: e1 + 1, y2: y1 + 1, k: 'door', grade: true });
      a.grade = { x: cx, y: y1 + 1 };
      // as portas dos lados (por onde chegam os reforços)
      const my = Math.round((y0 + y1) / 2);
      for (const lx of [x0 - 1, x1 + 1]) { G.pos(lx, my, CORREDOR); G.pos(lx + (lx < cx ? -1 : 1), my, CORREDOR); p.paredes.push({ x1: lx < cx ? x0 : x1 + 1, y1: my, x2: lx < cx ? x0 : x1 + 1, y2: my + 1, k: 'door' }); a.reforcos.push([lx < cx ? x0 + 0.5 : x1 + 0.5, my + 0.5]); }
      const est = estradoChefe(cx - 2, y0, 4, 2, 1.5);
      if (a.tipo === 'trono') {
        const tx = Math.floor(cx - 0.5), ty = est.y;
        C.poe('cadeira', tx, ty, 1, ROT_FRENTE.s); C.pinta('trono', { x: tx + 0.5, y: ty + 0.5, rot: ROT_FRENTE.s });
        for (const i of [est.x - 1, est.x + est.w]) C.poe('braseiro', i, est.y);
        C.pinta('tapete', { x: cx - 1, y: est.y + est.h, w: 2, h: y1 - est.y - est.h + 1 });
        for (let j = y0 + 3; j <= y1 - 1; j += 2) for (const i of [x0 + 2, x1 - 2]) if (C.livre(i, j)) coluna(C, i + 0.5, j + 0.5, 0.45);
        estatua(x0 + 0.5, y0 + 0.5); estatua(x1 + 0.5, y0 + 0.5);
        perigo('oleo', cx - 3.5, (y0 + y1) / 2 + 1, 1); perigo('oleo', cx + 3.5, (y0 + y1) / 2 + 1, 1);
        a.zonas = [['luz'], ['zona:chamasNegras', cx, est.y + 3.5, 2]];
      } else {
        C.pinta('sarcofago', { x: cx - 1, y: est.y + 0.2, w: 2, h: 1.6 }); C.ocupaRet(Math.floor(cx - 1), est.y, 2, 2, 1);
        for (const i of [est.x - 1, est.x + est.w]) C.poe('vela', i, est.y);
        for (let j = y0 + 3; j <= y1 - 2; j += 3) for (const i of [x0 + 2, x1 - 2, x0 + 5, x1 - 5]) if (C.livre(i, j) && C.livre(i, j + 1)) { C.poe('tumulo', i, j); }
        for (let j = y0 + 2; j <= y1 - 1; j += 3) for (const i of [x0, x1]) nichoEm(C, i, j, i === x0 ? 'o' : 'l');
        for (let j = y0 + 4; j <= y1 - 2; j += 4) for (const i of [Math.floor(cx) - 3, Math.floor(cx) + 2]) if (C.livre(i, j)) coluna(C, i + 0.5, j + 0.5, 0.42);
        perigo('toxica', cx - 4, (y0 + y1) / 2 + 2, 1.3); perigo('toxica', cx + 4, (y0 + y1) / 2 + 2, 1.3);
        for (let j = y0 + 3; j <= y1 - 2; j += 3) a.reforcos.push([x0 + 2.5, j + 0.5], [x1 - 1.5, j + 0.5]);
        a.reforcos = a.reforcos.slice(0, 4);
        a.zonas = [['zona:toxica', cx, (y0 + y1) / 2 + 1, 3.2], ['luz']];
      }
      a.desaba = { x: cx - 2, y: est.y + est.h + 1, w: 4, h: 3 };
    } else if (a.tipo === 'covil' || a.tipo === 'altar') {
      // a câmara grande e torta (a do altar mais redonda)
      const cy = H / 2 - 0.5, rx = W / 2 - 2.5, ry = H / 2 - 2.2, ond = [C.ent(0, TAU), C.ent(0, TAU)];
      enche((i, j) => { const dx = (i - cx) / rx, dy = (j - cy) / ry, an = Math.atan2(dy, dx), lim = 1 + (a.tipo === 'covil' ? 0.12 : 0.04) * Math.sin(3 * an + ond[0]) + (a.tipo === 'covil' ? 0.08 : 0.02) * Math.sin(5 * an + ond[1]); return Math.hypot(dx, dy) <= lim; }, SALA);
      entradaEmbaixo(Math.ceil(cy + ry) - 1, 3);
      if (a.tipo === 'covil') {
        // o rochedo do dragão no alto, por cima do tesouro; a lava pelos lados; as estalagmites como cobertura
        estradoChefe(cx - 2.5, cy - ry + 1, 5, 3, 4.5);
        C.pinta('moedas', { x: cx, y: cy - ry + 4.6, r: 2.2 }); C.pinta('moedas', { x: cx - 2.6, y: cy - ry + 3.6, r: 1.2 });
        C.poe('bau', Math.floor(cx + 2.6), Math.floor(cy - ry + 3.5));
        for (const sx of [-1, 1]) {
          const lx = cx + sx * rx * 0.55, ly = cy + ry * 0.05;
          for (let j = Math.floor(ly - 2); j <= ly + 2; j++) for (let i = Math.floor(lx - 2.4); i <= lx + 2.4; i++) if (Math.hypot((i + 0.5 - lx) / 2.3, (j + 0.5 - ly) / 1.8) <= 1 && G.at(i, j) === SALA) G.pos(i, j, LAVA);
          p.zonas.push({ fx: 'lava', k: 'circ', x: lx, y: ly, r: 1.8, gm: false, leve: true }); a.perigos.push('lava');
          p.luzes.push({ x: lx, y: ly, dim: 6, bright: 2, c: '#ff7a2a' });
        }
        for (let t = 0, n = 0; t < 300 && n < 6; t++) { const i = Math.floor(cx + C.ent(-rx * 0.8, rx * 0.8)), j = Math.floor(cy + C.ent(-ry * 0.3, ry * 0.7)); if (G.at(i, j) !== SALA || !C.livre(i, j)) continue; const x = i + 0.5, y = j + 0.5, rr = 0.55; C.pinta('estalagmite', { x, y, r: rr, grande: true }); C.ocupa(i, j, 1, 1); for (let k = 0; k < 6; k++) { const u = (k / 6) * TAU, v = ((k + 1) / 6) * TAU; p.visao.push([x + Math.cos(u) * rr * 0.85, y + Math.sin(u) * rr * 0.85, x + Math.cos(v) * rr * 0.85, y + Math.sin(v) * rr * 0.85]); } n++; }
        C.pinta('ossos', { x: cx - rx * 0.3, y: cy + ry * 0.4, n: 4 }); C.pinta('ossos', { x: cx + rx * 0.35, y: cy - ry * 0.1, n: 3 });
        a.reforcos.push([cx - rx * 0.6, cy - ry * 0.45], [cx + rx * 0.6, cy - ry * 0.45], [cx, cy + ry * 0.5]);
        a.zonas = [['zona:lava', cx, cy + ry * 0.15, Math.min(rx, ry) * 0.4], ['desaba']];
        a.desaba = { x: cx - 3, y: cy + 1, w: 6, h: 2 };
      } else {
        // o altar no estrado do alto; o círculo das runas no meio; as colunas com os braseiros em volta
        const est = estradoChefe(cx - 2, cy - ry + 1, 4, 2, 1.5);
        C.poe('altar', Math.floor(cx - 0.5), est.y);
        C.pinta('circuloRunico', { x: cx, y: cy + 0.5, r: Math.min(rx, ry) * 0.42 });
        for (let k = 0; k < 6; k++) { const an = -Math.PI / 2 + (k + 0.5) / 6 * TAU, x = cx + Math.cos(an) * rx * 0.7, y = cy + Math.sin(an) * ry * 0.7; if (Math.abs(x - cx) < 1.5 && y > cy) continue; coluna(C, Math.floor(x) + 0.5, Math.floor(y) + 0.5, 0.45); C.poe('braseiro', Math.floor(x) + (x < cx ? 1 : -1), Math.floor(y)); }
        p.zonas.push({ fx: 'runas', k: 'circ', x: cx, y: cy + 0.5, r: Math.min(rx, ry) * 0.42, gm: true }); a.perigos.push('runas (escondidas)');
        a.reforcos.push([cx - rx * 0.8, cy + ry * 0.2], [cx + rx * 0.8, cy + ry * 0.2]);
        a.zonas = [['zona:runas', cx, cy + 0.5, Math.min(rx, ry) * 0.42], ['zona:escuridao', cx, cy, Math.min(rx, ry) * 0.7]];
        a.desaba = { x: cx - 2, y: cy - 0.5, w: 4, h: 2 };
      }
    } else if (a.tipo === 'ponte') {
      // o abismo inteiro; a beira da entrada embaixo, a do chefe no alto; a ponte (três de largura) com a plataforma no meio
      enche(() => true, ABISMO);
      enche(ret(2, H - 4, W - 3, H - 1), SALA); enche(ret(3, 0, W - 4, 3), SALA);
      const px0 = Math.floor(cx - 1.5);
      for (let j = 4; j < H - 4; j++) for (let i = px0; i < px0 + 3; i++) G.pos(i, j, PONTE);
      const pm = Math.round(H / 2);
      enche(ret(cx - 3.5, pm - 2, cx + 2.5, pm + 1), SALA);
      a.entrada = { x: cx, y: H - 1.5 };
      estradoChefe(cx - 2, 0, 4, 2, 1.5);
      for (const [x, y] of [[cx - 3, pm - 1.5], [cx + 2, pm + 0.5]]) estatua(x, y);
      C.pinta('entulho', { x: cx + 1.8, y: pm - 1.4, r: 0.8 });
      perigo('vento', cx, pm - 0.5, 2.5);
      a.reforcos.push([3.5, H - 2.5], [W - 3.5, H - 2.5]);
      a.zonas = [['desaba'], ['zona:vento', cx, H / 2, Math.min(W, H) * 0.35]];
      a.desaba = { x: px0, y: Math.round(H * 0.62), w: 3, h: 2, ponte: true };
    } else if (a.tipo === 'topo') {
      // o alto da torre: o disco de pedra cercado pelo vazio, com a mureta na beira (aberta na escada)
      const cy = H / 2, R = Math.min(W, H) / 2 - 1.5;
      enche(() => true, ABISMO);
      enche((i, j) => Math.hypot(i - cx, j - cy) <= R, SALA);
      const n = 28, abertura = [Math.PI / 2 - 0.18, Math.PI / 2 + 0.18];
      for (let k = 0; k < n; k++) { const u = (k / n) * TAU, v = ((k + 1) / n) * TAU; if (u > abertura[0] - 0.12 && u < abertura[1]) continue; p.paredes.push({ x1: cx + Math.cos(u) * (R - 0.15), y1: cy + Math.sin(u) * (R - 0.15), x2: cx + Math.cos(v) * (R - 0.15), y2: cy + Math.sin(v) * (R - 0.15), k: 'mureta' }); }
      C.pinta('ameias', { cx, cy, r: R - 0.15, ab: abertura });
      a.entrada = { x: cx, y: cy + R - 1 };
      // a escada que sobe pelo meio da beira de baixo
      C.pinta('escada', { x: Math.floor(cx) - 1, y: Math.floor(cy + R) - 2, w: 2, h: 2, lado: 's', sobe: true, natural: false });
      estradoChefe(cx - 2, cy - R + 1.2, 4, 2, 1.5);
      C.poe('braseiro', Math.floor(cx - 0.5), Math.floor(cy - R + 1.2));
      for (const an of [Math.PI * 0.85, Math.PI * 0.15, Math.PI * 1.25, Math.PI * 1.75]) estatua(cx + Math.cos(an) * R * 0.55, cy + Math.sin(an) * R * 0.55);
      perigo('raio', cx + R * 0.35, cy + R * 0.1, 1.2);
      a.reforcos.push([cx - R * 0.75, cy], [cx + R * 0.75, cy]);
      a.zonas = [['zona:tempestade', cx, cy, R * 0.8], ['desaba']];
      a.desaba = { x: cx + R * 0.35, y: cy - 2, w: 3, h: 4 };
    } else {
      // o círculo de pedras: a clareira, o anel das pedras de pé (com as passagens), a pedra do altar no meio
      const cy = H / 2, R = Math.min(W, H) / 2 - 1.2, Rp = R * 0.68;
      enche((i, j) => Math.hypot(i - cx, j - cy) <= R, SALA);
      entradaEmbaixo(Math.ceil(cy + R) - 1, 4);
      const n = 9;
      for (let k = 0; k < n; k++) {
        const an = -Math.PI / 2 + (k / n) * TAU;
        if (Math.abs(Math.cos(an)) < 0.2 && Math.sin(an) > 0) continue;              // (a passagem da entrada)
        const x = cx + Math.cos(an) * Rp, y = cy + Math.sin(an) * Rp;
        C.pinta('menir', { x, y, r: 0.55, ang: an }); C.ocupa(Math.floor(x), Math.floor(y), 1, 1);
        for (let q = 0; q < 6; q++) { const u = (q / 6) * TAU, v = ((q + 1) / 6) * TAU; p.visao.push([x + Math.cos(u) * 0.45, y + Math.sin(u) * 0.45, x + Math.cos(v) * 0.45, y + Math.sin(v) * 0.45]); }
      }
      const est = estradoChefe(cx - 1.5, cy - 1.5, 3, 3, 1.5);
      C.pinta('menir', { x: cx, y: cy, r: 0.8, ang: 0, altar: true }); void est;
      p.zonas.push({ fx: 'runas', k: 'circ', x: cx, y: cy, r: Rp * 0.8, gm: true }); a.perigos.push('runas (escondidas)');
      perigo('nevoa', cx, cy + R * 0.55, 1.6);
      C.pinta('floresta', { cx, cy, r: R });
      a.reforcos.push([cx - R * 0.85, cy - R * 0.25], [cx + R * 0.85, cy - R * 0.25], [cx, cy - R * 0.85]);
      a.zonas = [['zona:arcano', cx, cy, Rp * 0.9], ['zona:luaSangue', cx, cy, R * 0.9]];
      a.desaba = { x: cx - 1.5, y: cy + 2, w: 3, h: 2 };
    }
    // o chefe (um token de dois quadrados no lugar dele) e os reforços
    a.chefe = a.chefe || { x: cx - 1, y: 3 };
    // (o ponto que caiu na rocha, no abismo ou na lava vai para a casa boa mais perto; sem nenhuma por perto, sai)
    const pisavel = (i, j) => { const v = G.at(i, j); return v !== ROCHA && v !== ABISMO && v !== LAVA && v != null; };
    const perto = ([x, y]) => {
      if (pisavel(Math.floor(x), Math.floor(y))) return [x, y];
      for (let r = 1; r <= 3; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (Math.max(Math.abs(di), Math.abs(dj)) === r && pisavel(Math.floor(x) + di, Math.floor(y) + dj)) return [Math.floor(x) + di + 0.5, Math.floor(y) + dj + 0.5];
      return null;
    };
    a.reforcos = a.reforcos.map(perto).filter(Boolean).slice(0, 4);
    // (lote 38) os pontos das mudanças próprias, do mesmo jeito
    for (const k of ['caixoes', 'mata', 'portal', 'tuneis', 'estantes', 'espelhos']) if (Array.isArray(a.pt[k])) a.pt[k] = a.pt[k].map(perto).filter(Boolean);
    // as fases prontas: duas (a 2 e a 3), cada uma com duas mudanças
    a.fases = fasesDaArena(a);
    p.salas = [{ x: 0, y: 0, w: W, h: H, papel: 'arena' }];
    // as paredes: no salão reto, a beira das casas; nos outros, o contorno alisado do que não é rocha
    if (ARENA_RETA.has(a.tipo)) p.paredes = paredesDaGrade(G, v => v !== ROCHA).map(w => Object.assign(w, { k: 'wall' })).concat(p.paredes);
    else {
      p.contorno = contornos(W, H, (i, j) => G.at(i, j) !== ROCHA).map(l => simplifica(l, 0.3)).filter(l => l.length > 3);
      p.paredes = segmentosDe(p.contorno).concat(p.paredes);
    }
  }
  /* as duas fases de cada arena (a tabela de cima), com o que o mestre mudou na janela: a.fk = [[{ k, on }, …], …] */
  function fasesDaArena(a) {
    const z = a.zonas || [];
    a.pt = a.pt || {}; a.pt.centro = a.pt.centro || [a.chefe.x + 1, a.chefe.y + 4];
    const mud = k => {
      if (ESPECIAIS[k]) return Object.assign(ESPECIAIS[k].faz(a), { on: true, esp: k });          // (lote 38)
      if (k === 'reforcos') return { k, on: true, pts: a.reforcos.slice(), nome: LACAIO_ARENA[a.tipo] || 'Lacaio' };
      if (k === 'desaba') return Object.assign({ k, on: true }, a.desaba);
      if (k === 'luz' || k === 'grade') return Object.assign({ k, on: true }, k === 'grade' && a.grade ? { x: a.grade.x, y: a.grade.y } : {});
      const e = z.find(x => x[0] === k) || [k, a.chefe.x + 1, a.chefe.y + 3, 2.5];
      return { k: 'zona', fx: k.slice(5), on: true, x: e[1], y: e[2], r: e[3] };
    };
    const base = FASES_ARENA[a.tipo] || FASES_ARENA.coliseu, fk = Array.isArray(a.fk) ? a.fk : null, ok = k => mudancasDe(a.tipo).some(x => x[0] === k) && (k !== 'grade' || !!a.grade);
    return base.map((ks, i) => ({ n: i + 2, nome: 'Fase ' + (i + 2), m: ks.map((k0, j) => {
      const o = fk && fk[i] && fk[i][j] ? fk[i][j] : null, k = o && ok(o.k) ? o.k : ok(k0) ? k0 : 'reforcos';
      return Object.assign(mud(k), { on: !o || o.on !== false });
    }) }));
  }

  /* ================= a mina abandonada ================= */
  function nivelDeMina(C) {
    const { G, r, p, W, H } = C, T = TAMANHOS[p.tamanho];
    const lado0 = C.pick(['n', 's', 'o', 'l']), horiz = lado0 === 'o' || lado0 === 'l';   // o túnel principal atravessa
    const ab = (i, j) => G.at(i, j) !== ROCHA;
    const caixa = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 1 && j >= 1 && i < W - 1 && j < H - 1) G.pos(i, j, v); };
    // 1) o túnel principal (dois de largura): da entrada, do lado sorteado, até a câmara do poço do outro lado, com
    //    duas ou três curvas
    const U = horiz ? W : H, V = horiz ? H : W, pts = [];
    const u0 = lado0 === 'o' || lado0 === 'n' ? 2 : U - 4, u1 = lado0 === 'o' || lado0 === 'n' ? U - 10 : 8;
    let v = Math.round(V / 2 + C.ent(-V * 0.2, V * 0.2));
    const nCur = 2 + Math.floor(r() * 2);
    pts.push([u0, v]);
    for (let k = 1; k <= nCur; k++) { const u = Math.round(u0 + (u1 - u0) * k / (nCur + 1)); pts.push([u, v]); v = clamp(Math.round(v + C.ent(-V * 0.28, V * 0.28)), 4, V - 6); pts.push([u, v]); }
    pts.push([u1, v]);
    const XY = ([u, vv]) => (horiz ? [u, vv] : [vv, u]);
    const trilho = [], lp = Math.max(2, largDe(p.larg));          // (lote 28: o principal tem 2 de largura; com 3, fica com 3)
    for (let k = 1; k < pts.length; k++) {
      const [a0, b0] = XY(pts[k - 1]), [a1, b1] = XY(pts[k]);
      caixa(Math.min(a0, a1), Math.min(b0, b1), Math.abs(a1 - a0) + lp, Math.abs(b1 - b0) + lp, CORREDOR);
      trilho.push([a0 + lp / 2, b0 + lp / 2]);
    }
    { const [a1, b1] = XY(pts[pts.length - 1]); trilho.push([a1 + lp / 2, b1 + lp / 2]); }
    // a câmara do poço, no fim (seis por seis), com o poço de descida no meio (dois por dois)
    const [fx, fy] = XY(pts[pts.length - 1]);
    const cam = { x: clamp(fx - 2, 2, W - 8), y: clamp(fy - 2, 2, H - 8), w: 6, h: 6 };
    caixa(cam.x, cam.y, cam.w, cam.h, SALA);
    const poco = { x: cam.x + 2, y: cam.y + 2, w: 2, h: 2 };
    p.salas.push(Object.assign({ papel: 'poco' }, cam));
    // 2) os túneis do lado (um de largura, às vezes dois), saindo do principal de tantas em tantas casas, dos dois lados;
    //    cada um com uma curva ou não, terminando numa galeria, num desabamento — e às vezes com um ramo
    const principal = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (G.at(i, j) === CORREDOR) principal.push([i, j]);
    const galerias = [];
    // (a casa (i, j) está livre para cavar: rocha, dentro do mapa, sem encostar em nada aberto — menos nas casas
    //  permitidas, que são as do começo do túnel)
    const podeCavar = (i, j, perm) => {
      if (i < 2 || j < 2 || i >= W - 2 || j >= H - 2 || G.at(i, j) !== ROCHA) return false;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const x = i + a, y = j + b; if (ab(x, y) && !perm.has(x + ',' + y)) return false; }
      return true;
    };
    const galeriaEm = (ex, ey, dx, dy) => {
      const gw = 5 + Math.floor(r() * 3), gh = 4 + Math.floor(r() * 3);
      const gx = dx ? (dx > 0 ? ex : ex - gw + 1) : ex - Math.floor(gw / 2), gy = dy ? (dy > 0 ? ey : ey - gh + 1) : ey - Math.floor(gh / 2);
      if (gx < 2 || gy < 2 || gx + gw > W - 2 || gy + gh > H - 2) return null;
      for (let j = gy - 1; j <= gy + gh; j++) for (let i = gx - 1; i <= gx + gw; i++) { if (Math.abs(i - (ex - dx)) + Math.abs(j - (ey - dy)) === 0) continue; if (ab(i, j) && !(i === ex - dx && j === ey - dy)) return null; }
      caixa(gx, gy, gw, gh, SALA);
      for (const [a, b] of [[gx, gy], [gx + gw - 1, gy], [gx, gy + gh - 1], [gx + gw - 1, gy + gh - 1]]) if (r() < 0.6) G.pos(a, b, ROCHA);
      const gal = { x: gx, y: gy, w: gw, h: gh, papel: 'galeria' };
      galerias.push(gal); p.salas.push(gal);
      return gal;
    };
    // cava um túnel de um de largura a partir de (i0, j0) (a casa aberta de onde sai), na direção (dx, dy): L casas, uma
    // curva no meio às vezes; devolve as casas cavadas (ou nada, se não coube)
    const tunelLado = (i0, j0, dx, dy, L) => {
      const cel = [], perm = new Set([i0 + ',' + j0]);
      for (const [a, b] of DIRS) perm.add((i0 + a) + ',' + (j0 + b));
      let i = i0, j = j0, ddx = dx, ddy = dy;
      const curva = r() < 0.5 ? 2 + Math.floor(r() * (L - 3)) : -1;
      for (let k = 0; k < L; k++) {
        if (k === curva) { const s2 = r() < 0.5 ? 1 : -1; [ddx, ddy] = [ddy * s2, ddx * s2]; }
        i += ddx; j += ddy;
        if (!podeCavar(i, j, perm)) return null;
        cel.push([i, j]); perm.add(i + ',' + j);
        for (const [a, b] of DIRS) perm.add((i + a) + ',' + (j + b));
      }
      return { cel, dx: ddx, dy: ddy };
    };
    const nT = T.W > 50 ? 10 : T.W > 40 ? 7 : 5;
    const passo = Math.max(3, Math.floor(principal.length / (nT * 2.2)));
    const origens = C.embaralha(principal.filter((_, k) => k % passo === 0));
    const ramos = [], largos = [];                          // (lote 28: os túneis do lado alargam depois de cavados todos)
    for (const [i0, j0] of origens) {
      if (ramos.length >= nT * 1.6) break;
      for (const [dx, dy] of C.embaralha(DIRS)) {
        if (G.at(i0 + dx, j0 + dy) !== ROCHA) continue;
        const t = tunelLado(i0, j0, dx, dy, T.W > 40 ? 4 + Math.floor(r() * 10) : 3 + Math.floor(r() * 5));
        if (!t) continue;
        for (const [i, j] of t.cel) G.pos(i, j, CORREDOR);
        largos.push(t.cel);
        const [ei, ej] = t.cel[t.cel.length - 1];
        const fim = r() < 0.85 ? galeriaEm(ei + t.dx, ej + t.dy, t.dx, t.dy) : null;
        if (!fim) C.pinta('desabamento', { x: ei + 0.5, y: ej + 0.5, r: 1.1 });
        ramos.push(t);
        // (um ramo do ramo, às vezes)
        if (r() < 0.5 && t.cel.length > 4) {
          const [bi, bj] = t.cel[Math.floor(t.cel.length / 2)], pd = C.pick([[t.dy, t.dx], [-t.dy, -t.dx]]);
          const t2 = tunelLado(bi, bj, pd[0], pd[1], 3 + Math.floor(r() * 5));
          if (t2) { for (const [i, j] of t2.cel) G.pos(i, j, CORREDOR); largos.push(t2.cel); const [fi, fj] = t2.cel[t2.cel.length - 1]; if (!(r() < 0.75 && galeriaEm(fi + t2.dx, fj + t2.dy, t2.dx, t2.dy))) C.pinta('desabamento', { x: fi + 0.5, y: fj + 0.5, r: 1 }); }
        }
        break;
      }
    }
    for (const cel of largos) alargarTunel(C, cel);
    // 3) as escadas: a de subida (a escada de madeira) no começo do túnel; a de descida é o poço
    const [sx, sy] = XY(pts[0]);
    const sobeLado = lado0;
    p.sobe = { x: sx, y: sy, w: 2, h: 2, lado: sobeLado, sobe: true, madeira: true, mi: sx, mj: sy };
    C.pinta('escada', p.sobe);
    C.ocupa(sx, sy, 2, 2);
    if (p.descida) {
      for (let j = poco.y; j < poco.y + 2; j++) for (let i = poco.x; i < poco.x + 2; i++) G.pos(i, j, ABISMO);
      p.poco = poco;
      C.pinta('poco', poco);
      C.ocupa(poco.x - 1, poco.y - 1, 4, 2);
      p.desce = { x: poco.x, y: poco.y, w: 2, h: 2, lado: null, sobe: false, poco: true, mi: poco.x + 2, mj: poco.y + 2 };
      C.ocupa(poco.x + 2, poco.y + 2, 1, 2);
    }
    // 4) a galeria escondida (com segredos): atrás de uma porta secreta, num túnel que sai do principal
    if (p.segredos) galeriaEscondida(C, principal);
    // 5) os trilhos, os vagonetes, as escoras, os lampiões, os veios, as ferramentas
    p.trilho = trilho;
    C.pinta('trilho', { pts: trilho });
    let vag = 0;
    for (let t = 0; t < 60 && vag < (T.W > 40 ? 3 : 2); t++) {
      const k = 1 + Math.floor(r() * (principal.length - 2)), [i, j] = principal[k];
      if (!C.livre(i, j)) continue;
      // (em cima do trilho: o meio do túnel)
      const noTrilho = trilho.some((q, n) => n > 0 && distSeg(i + 0.5, j + 0.5, trilho[n - 1][0], trilho[n - 1][1], q[0], q[1]) < 0.6);
      if (!noTrilho) continue;
      C.pinta('vagonete', { x: i + 0.5, y: j + 0.5, ang: horiz ? 0 : Math.PI / 2, cheio: r() < 0.6 });
      C.ocupa(i, j, 1, 1);
      vag++;
    }
    // as escoras: de três em três casas, atravessando os túneis (pintadas)
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      if (G.at(i, j) !== CORREDOR || (horiz ? i : j) % 3 !== 0) continue;
      const vert = G.at(i, j - 1) === ROCHA || G.at(i, j + 1) === ROCHA, hor = G.at(i - 1, j) === ROCHA || G.at(i + 1, j) === ROCHA;
      if (vert && !hor) C.pinta('escora', { x: i + 0.5, y: j + 0.5, ang: 0 });
      else if (hor && !vert) C.pinta('escora', { x: i + 0.5, y: j + 0.5, ang: Math.PI / 2 });
    }
    // os lampiões: no começo, na câmara do poço, e um ou outro aceso no caminho
    C.poe('lampiao', sx + (lado0 === 'l' ? -1 : 2), sy) || C.poe('lampiao', sx, sy + 2);
    C.poe('lampiao', cam.x, cam.y) || C.poe('lampiao', cam.x + cam.w - 1, cam.y);
    // os veios nas galerias, as ferramentas, a carga
    for (const gl of galerias) {
      C.pinta('veio', { x: gl.x, y: gl.y, w: gl.w, h: gl.h, cor: C.pick(['#e8c25a', '#9fd4ff', '#d0d4dc', '#7fe0a0']) });
      if (r() < 0.7) noCanto(C, gl, 'caixote');
      if (r() < 0.5) noCanto(C, gl, 'barril');
      if (r() < 0.6) C.pinta('ferramentas', { x: gl.x + gl.w / 2, y: gl.y + gl.h / 2 });
      if (r() < 0.4) C.pinta('entulho', { x: gl.x + C.ent(0.5, gl.w - 0.5), y: gl.y + C.ent(0.5, gl.h - 0.5), r: 0.8 });
    }
    // o acampamento abandonado (a mesa, a fogueira apagada) numa galeria, quando há
    if (galerias.length) { const gl = galerias[0]; C.poe('mesa', gl.x + 1, gl.y + 1, 2); C.pinta('fogueiraApagada', { x: gl.x + gl.w - 1.2, y: gl.y + gl.h - 1.2 }); }
    // as poças
    for (let t = 0, n = 0; t < 200 && n < 4; t++) { const [i, j] = C.pick(principal); if (C.livre(i, j)) { C.pinta('poca', { x: i + 0.5, y: j + 0.5, r: C.ent(0.5, 0.9) }); n++; } }
    // as paredes: retas (a mina é cavada em túneis); a porta secreta da galeria escondida por cima
    p.paredes = paredesDaGrade(G).map(s => Object.assign(s, { k: 'wall' })).concat(p.paredes);
    // as runas dos anões (escondidas): na boca da galeria escondida e na beira do poço
    if (p.segredos) {
      if (p.escondida) p.zonas.push({ fx: 'runas', k: 'circ', x: p.escondida.bx, y: p.escondida.by, r: 1, gm: true });
      if (p.poco) p.zonas.push({ fx: 'runas', k: 'circ', x: p.poco.x + 1, y: p.poco.y - 0.5, r: 1, gm: true });
    }
  }
  // (lote 28) o túnel do lado da mina com a largura escolhida (o de um continua de um)
  function alargarTunel(C, cel) {
    const L = largDe(C.p.larg);
    if (L < 2) return;
    const o0 = Math.floor((L - 1) / 2);
    for (const [i, j] of cel) for (let b = 0; b < L; b++) for (let a = 0; a < L; a++) {
      const x = i + a - o0, y = j + b - o0;
      if (x >= 2 && y >= 2 && x < C.W - 2 && y < C.H - 2 && C.G.at(x, y) === ROCHA) C.G.pos(x, y, CORREDOR);
    }
  }
  const distSeg = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1e-9, t = clamp(((px - x1) * dx + (py - y1) * dy) / L, 0, 1); return Math.hypot(px - x1 - t * dx, py - y1 - t * dy); };
  function galeriaEscondida(C, principal) {
    const { G, W, H, p } = C;
    for (let t = 0; t < 200; t++) {
      const [i0, j0] = C.pick(principal), [dx, dy] = C.pick(DIRS);
      if (G.at(i0, j0) !== CORREDOR || G.at(i0 + dx, j0 + dy) !== ROCHA) continue;
      const L = 3, gw = 4, gh = 4;
      const x0 = i0 + dx, y0 = j0 + dy;
      const cx = x0 + dx * (L + 1), cy = y0 + dy * (L + 1);
      const gx = dx ? (dx > 0 ? cx : cx - gw + 1) : cx - 1, gy = dy ? (dy > 0 ? cy : cy - gh + 1) : cy - 1;
      let ok = gx >= 2 && gy >= 2 && gx + gw <= W - 2 && gy + gh <= H - 2;
      for (let j = gy - 1; j <= gy + gh && ok; j++) for (let i = gx - 1; i <= gx + gw && ok; i++) if (G.at(i, j) !== ROCHA) ok = false;
      for (let k = 0; k <= L && ok; k++) for (const o of [-1, 0, 1]) { const i = x0 + dx * k + (dy ? o : 0), j = y0 + dy * k + (dx ? o : 0); if (G.at(i, j) !== ROCHA) ok = false; }
      if (!ok) continue;
      for (let k = 0; k <= L; k++) G.pos(x0 + dx * k, y0 + dy * k, CORREDOR);
      for (let j = gy; j < gy + gh; j++) for (let i = gx; i < gx + gw; i++) G.pos(i, j, SALA);
      // a porta secreta: na boca do túnel (entre o principal e a primeira casa do túnel)
      const d = dx ? { x1: dx > 0 ? x0 : x0 + 1, y1: y0, x2: dx > 0 ? x0 : x0 + 1, y2: y0 + 1 } : { x1: x0, y1: dy > 0 ? y0 : y0 + 1, x2: x0 + 1, y2: dy > 0 ? y0 : y0 + 1 };
      p.paredes.push(Object.assign(d, { k: 'door', secret: true }));
      p.escondida = { x: gx, y: gy, w: gw, h: gh, bx: x0 + 0.5, by: y0 + 0.5 };
      p.salas.push({ x: gx, y: gy, w: gw, h: gh, papel: 'escondida' });
      C.ocupa(x0, y0, 1, 2);
      C.pinta('veio', { x: gx, y: gy, w: gw, h: gh, cor: '#e8c25a', rico: true });
      C.poe('bau', gx + 1, gy + 1) || C.poe('bau', gx + 2, gy + 2);
      C.pinta('ossos', { x: gx + gw - 1, y: gy + gh - 1, n: 3 });
      return true;
    }
    return false;
  }
  /* ================= (lote 28) o navio naufragado =================
     O casco deitado no fundo, com a proa de um lado e a popa do outro: o corredor do meio, de ponta a ponta (da largura
     escolhida), e os compartimentos dos dois lados, separados pelas anteparas — o porão, os beliches, a cozinha, o
     paiol, o arsenal, a enfermaria —, a cabine do capitão na popa e o porão da proa, afinando com o casco. A água
     entrou: poças fundas espalhadas, com as algas que brilham. A escotilha para o convés (a subida) num compartimento do
     meio; a descida, no porão de baixo, longe dela. */
  function nivelDeNavio(C) {
    const { G, r, p, W, H } = C, larg = largDe(p.larg);
    const proaDir = r() < 0.5, x0 = 3, x1 = W - 4, L = x1 - x0 + 1, cy = H / 2;
    const B = Math.min(H - 6, Math.max(11, Math.round(L * 0.38)));
    const colDe = u => (proaDir ? x0 + u : x1 - u);                          // a coluna, contando da popa
    const meia = u => { const t = u / (L - 1); let f = 1; if (t > 0.7) f = Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.7) / 0.32, 2))); else if (t < 0.05) f = 0.88 + (t / 0.05) * 0.12; return (B / 2) * f; };
    const noCasco = (u, j) => u >= 0 && u < L && Math.abs(j + 0.5 - cy) <= meia(u) - 0.25;
    const c0 = Math.round(cy - larg / 2), c1 = c0 + larg - 1;              // as linhas do corredor
    const sL = TAMANHOS[p.tamanho].W > 50 ? 7 : 6, bL = Math.max(6, Math.round(L * 0.27));
    const salas = [], portas = [];
    const nova = (papel, us, js) => { const xs = us.map(colDe); return { i: salas.length, x: Math.min(...xs), y: js[0], w: Math.max(...xs) - Math.min(...xs) + 1, h: js[js.length - 1] - js[0] + 1, papel, portas: [], liga: [] }; };
    const cavaSala = (q, u0, u1, ok) => { for (let u = u0; u <= u1; u++) for (let j = 0; j < H; j++) if (noCasco(u, j) && ok(j)) G.pos(colDe(u), j, SALA); };
    // a popa (a cabine do capitão) e a proa: o casco inteiro naquelas colunas
    const popa = nova('capitao', [0, sL - 1], (() => { const a = []; for (let j = 0; j < H; j++) if (noCasco(1, j)) a.push(j); return a; })());
    cavaSala(popa, 0, sL - 1, () => true); salas.push(popa);
    const uProa = L - bL;
    const proa = nova('proa', [uProa, L - 1], (() => { const a = []; for (let j = 0; j < H; j++) if (noCasco(uProa, j)) a.push(j); return a; })());
    cavaSala(proa, uProa, L - 1, () => true); salas.push(proa);
    // o corredor do meio, da antepara da popa à da proa
    for (let u = sL; u <= uProa - 1; u++) for (let j = c0; j <= c1; j++) G.pos(colDe(u), j, CORREDOR);
    // as portas das pontas (da largura do corredor): na beira da popa e na da proa
    const bordaX = (uA, uB) => Math.max(colDe(uA), colDe(uB));               // a linha entre duas colunas vizinhas
    for (const [q, uA, uB] of [[popa, sL - 1, sL], [proa, uProa, uProa - 1]]) {
      const x = bordaX(uA, uB);
      const d = { x1: x, y1: c0, x2: x, y2: c1 + 1, k: 'door' };
      portas.push(d);
      q.portas.push({ lado: colDe(uB) > colDe(uA) ? 'l' : 'o', fx: colDe(uB), fy: c0 });
    }
    // os compartimentos do meio: de 4 a 7 colunas, com uma antepara entre eles; uma sala em cima e outra embaixo
    let u = sL + 1;
    const meio = [];
    while (u + 3 <= uProa - 2) {
      let n = 4 + Math.floor(r() * 4);
      if (u + n > uProa - 2) n = uProa - 2 - u + 1;
      if (n < 3) break;
      for (const lado of ['n', 's']) {
        const ok = lado === 'n' ? j => j <= c0 - 2 : j => j >= c1 + 2;
        const js = []; for (let j = 0; j < H; j++) if (ok(j) && noCasco(u, j) && noCasco(u + n - 1, j)) js.push(j);
        if (js.length < 2) continue;
        const q = nova('', [u, u + n - 1], js);
        for (let uu = u; uu < u + n; uu++) for (const j of js) G.pos(colDe(uu), j, SALA);
        // a porta: a casa da parede entre a sala e o corredor vira passagem; a porta fica na beira da sala
        const ud = u + 1 + Math.floor(r() * Math.max(1, n - 2)), fx = colDe(ud), fy = lado === 'n' ? c0 - 1 : c1 + 1;
        G.pos(fx, fy, CORREDOR);
        const y = lado === 'n' ? fy : fy;
        portas.push({ x1: fx, y1: lado === 'n' ? fy : fy, x2: fx + 1, y2: y, k: 'door', yb: lado === 'n' ? fy : fy + 1 });
        q.portas.push({ lado: lado === 'n' ? 's' : 'n', fx, fy });
        salas.push(q); meio.push(q);
      }
      u += n + 1;
    }
    // (a porta de cima fica na beira de baixo da sala: y = a linha da parede; a de baixo, na beira de cima da sala)
    for (const d of portas) if (d.yb != null) { d.y1 = d.y2 = d.yb; delete d.yb; }
    // os papéis do meio
    const fila = C.embaralha(['porao', 'beliches', 'cozinha', 'paiol', 'arsenal', 'enfermaria', 'porao', 'beliches', 'porao', 'vazia']);
    for (const q of meio) q.papel = fila.length ? fila.shift() : 'porao';
    p.salas = salas.map(q => ({ x: q.x, y: q.y, w: q.w, h: q.h, papel: q.papel }));
    // a escotilha (a subida) num compartimento do meio; a descida, no porão de baixo — o mais longe dela
    const sobeQ = meio.length ? meio[Math.floor(meio.length / 2)] : popa;
    p.sobe = escada(C, sobeQ, true) || escada(C, popa, true);
    if (p.descida) {
      const longe = salas.filter(q => q !== sobeQ).sort((a, b) => Math.abs(b.x - sobeQ.x) - Math.abs(a.x - sobeQ.x));
      for (const q of longe) { p.desce = escada(C, q, false); if (p.desce) break; }
    }
    // a frente das portas fica livre
    for (const q of salas) for (const pt of q.portas) { const [i, j] = dentroDaPorta(pt); if (C.livre(i, j)) C.ocupa(i, j, 1, 2); if (C.livre(pt.fx, pt.fy)) C.ocupa(pt.fx, pt.fy, 1, 2); }
    // a água que entrou: poças fundas pelo casco (fora das escadas e da frente das portas), com as algas que brilham
    const nAg = 2 + Math.floor(r() * 3);
    for (let k = 0, feitas = 0; k < 60 && feitas < nAg; k++) {
      const i = 2 + Math.floor(r() * (W - 4)), j = 2 + Math.floor(r() * (H - 4));
      if (G.at(i, j) === ROCHA || !C.livre(i, j)) continue;
      const rr = C.ent(1.2, 2.4);
      for (let b = Math.floor(j - rr); b <= j + rr; b++) for (let a = Math.floor(i - rr); a <= i + rr; a++) {
        const v = G.at(a, b);
        if ((v === SALA || v === CORREDOR) && C.livre(a, b) && Math.hypot(a - i, b - j) <= rr) { G.pos(a, b, AGUA); C.ocupa(a, b, 1, 1); }
      }
      C.pinta('alga', { x: i + 0.5, y: j + 0.5, r: rr + 0.6 });
      luz(C, i + 0.5, j + 0.5, 3, '#7fe9d0', 1);
      feitas++;
    }
    // as paredes (as do casco e as anteparas) e as portas
    p.paredes = paredesDaGrade(G).map(s2 => Object.assign(s2, { k: 'wall' }));
    for (const d of portas) p.paredes.push({ x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2, k: 'door' });
    // o casco furado: os rombos na beira (o mar escuro aparece pelas tábuas quebradas)
    for (let k = 0, n = 0; k < 80 && n < 3; k++) {
      const uu = 2 + Math.floor(r() * (L - 4)), lado = r() < 0.5 ? -1 : 1, i = colDe(uu);
      let j = Math.round(cy);
      while (G.at(i, j + lado) !== ROCHA && Math.abs(j - cy) < H) j += lado;
      if (!C.livre(i, j)) continue;
      C.pinta('rombo', { x: i + 0.5, y: j + 0.5 + lado * 0.5, lado }); n++;
    }
    // o que tem em cada compartimento
    for (const q of salas) MOBILIA[q.papel] && MOBILIA[q.papel](C, q);
    // os lampiões no corredor (poucos)
    for (let uu = sL + 2, n = 0; uu < uProa - 1 && n < 2; uu += Math.max(5, Math.floor((uProa - sL) / 2))) { if (C.poe('lampiao', colDe(uu), c0)) n++; }
    if (p.segredos) {
      // o baú escondido do capitão (uma runa na frente) e uma runa na proa
      p.zonas.push({ fx: 'runas', k: 'circ', x: popa.x + popa.w / 2, y: cy, r: 1, gm: true });
      p.zonas.push({ fx: 'runas', k: 'circ', x: proa.x + proa.w / 2, y: cy, r: 1.2, gm: true });
    }
    enfeites(C);
  }
  Object.assign(MOBILIA, {
    capitao(C, q) {
      const mx = Math.floor(q.x + q.w / 2 - 1), my = Math.floor(q.y + q.h / 2 - 1);
      if (C.poe('mesa', mx, my, 2)) { C.poe('cadeira', mx - 1, my, 1, 270) || C.poe('cadeira', mx + 2, my, 1, 90); C.pinta('mapa', { x: mx + 1, y: my + 1 }); }
      encosta(C, q, 'cama', 1, 2); noCanto(C, q, 'bau'); noCanto(C, q, 'bau'); encosta(C, q, 'estante', 1, 2); encosta(C, q, 'lampiao', 1);
      C.pinta('moedas', { x: q.x + q.w / 2, y: q.y + 1.2, r: 0.6 });
    },
    proa(C, q) {
      for (let k = 0, n = Math.min(8, 3 + Math.floor(q.w * q.h / 14)); k < n; k++) { const id = C.r() < 0.5 ? 'barril' : 'caixote'; if (!noCanto(C, q, id)) encosta(C, q, id, 1); }
      C.pinta('corda', { x: q.x + q.w / 2, y: q.y + q.h / 2, r: 0.9 });
      if (C.r() < 0.6) C.pinta('entulho', { x: q.x + C.ent(1, q.w - 1), y: q.y + C.ent(1, q.h - 1), r: 0.9 });
    },
    porao(C, q) { MOBILIA.deposito(C, q); if (C.r() < 0.5) C.pinta('corda', { x: q.x + C.ent(1, q.w - 1), y: q.y + C.ent(1, q.h - 1), r: 0.6 }); },
    beliches(C, q) { encosta(C, q, 'cama', Math.min(3, 1 + Math.floor(q.w * q.h / 10)), 2); noCanto(C, q, 'bau'); if (C.r() < 0.6) noCanto(C, q, 'pele'); },
    cozinha(C, q) { noCanto(C, q, 'braseiro'); noCanto(C, q, 'barril'); noCanto(C, q, 'jarro'); encosta(C, q, 'balcao', 2); if (C.r() < 0.5) noCanto(C, q, 'jarro'); },
    paiol(C, q) { const n = Math.min(7, 3 + Math.floor(q.w * q.h / 8)); for (let k = 0; k < n; k++) if (!noCanto(C, q, 'barril')) encosta(C, q, 'barril', 1); noCanto(C, q, 'caixote'); },
    enfermaria(C, q) { encosta(C, q, 'cama', 2, 2); noCanto(C, q, 'jarro'); noCanto(C, q, 'balcao'); encosta(C, q, 'vela', 1); },
  });

  // (lote 49) as salas das catacumbas, do porão, da cisterna e do calabouço
  Object.assign(MOBILIA, {
    familia(C, q) {
      // a câmara de uma família: os sarcófagos em fila, os nichos de ossos na parede, as velas
      const lp = ladoDasPortas(q), fundo = OPOSTO[lp], horiz = fundo === 'n' || fundo === 's';
      let n = 0;
      for (let t = 0; t < 10 && n < Math.min(3, Math.floor((horiz ? q.w : q.h) / 2)); t++) { const e = naBeira(C, q, fundo, 2); if (e && C.poe('sarcofago', e[0], e[1], 2, horiz ? 0 : 90)) n++; }
      encosta(C, q, 'nichoOssos', 2); encosta(C, q, 'vela', 2);
      if (C.r() < 0.5) noCanto(C, q, 'estatua');
    },
    desabado(C, q) {
      for (let k = 0; k < 3; k++) C.pinta('entulho', { x: q.x + C.ent(0.8, q.w - 0.8), y: q.y + C.ent(0.8, q.h - 0.8), r: C.ent(0.9, 1.6) });
      C.pinta('ossos', { x: q.x + q.w / 2, y: q.y + q.h / 2, n: 5 });
      if (C.r() < 0.5) noCanto(C, q, 'cranios');
    },
    santuario(C, q) {
      // o templo escondido: o círculo de invocação no meio, o ídolo no fundo, as velas em volta, os braseiros
      const cx = Math.floor(q.x + q.w / 2 - 1), cy = Math.floor(q.y + q.h / 2 - 1);
      C.poe('circulo', cx, cy, 2);
      const lp = ladoDasPortas(q), e = naBeira(C, q, OPOSTO[lp], 1, true);
      if (e) C.poe('idolo', e[0], e[1], 1, ROT_FRENTE[lp]);
      for (const [i, j] of [[cx - 1, cy - 1], [cx + 2, cy - 1], [cx - 1, cy + 2], [cx + 2, cy + 2]]) C.poe('vela', i, j);
      noCanto(C, q, 'braseiro'); noCanto(C, q, 'braseiro'); encosta(C, q, 'incensario', 1);
      C.pinta('tapete', { x: q.x + 1, y: q.y + q.h / 2 - 0.6, w: q.w - 2, h: 1.2 });
    },
    sacrificio(C, q) { MOBILIA.altar(C, q); noCanto(C, q, 'calice'); noCanto(C, q, 'grilhoes'); C.pinta('ossos', { x: q.x + q.w / 2, y: q.y + q.h / 2, n: 4 }); },
    cisternaVelha(C, q) { alagar(C, q, 0.15); encosta(C, q, 'nichoOssos', 2); noCanto(C, q, 'cranios'); },
    alagada(C, q) { alagar(C, q, 0.35); if (C.r() < 0.6) encosta(C, q, 'nichoOssos', 1); },
    galeria(C, q) { encosta(C, q, 'estatua', Math.min(6, 2 + Math.floor((q.w + q.h) / 4))); noCanto(C, q, 'candelabro'); C.pinta('tapete', { x: q.x + 1, y: q.y + q.h / 2 - 0.6, w: q.w - 2, h: 1.2 }); },
    adega(C, q) { const n = Math.min(10, 4 + Math.floor(q.w * q.h / 6)); for (let k = 0; k < n; k++) if (!encosta(C, q, 'barril', 1)) noCanto(C, q, 'barril'); encosta(C, q, 'estante', 1, 2); noCanto(C, q, 'jarro'); encosta(C, q, 'vela', 1); },
    escondPorao(C, q) { noCanto(C, q, 'bau'); noCanto(C, q, 'caixote'); encosta(C, q, 'cama', 1, 2); if (C.r() < 0.6) noCanto(C, q, 'mesa', 2); encosta(C, q, 'lampiao', 1); },
    celasP(C, q) { if (!q.celas) q.celas = ladoDasCelas(q); if (q.celas) MOBILIA.celas(C, q); else MOBILIA.guarda(C, q); },
    tortura(C, q) { C.poe('mesaTortura', Math.floor(q.x + q.w / 2 - 1), Math.floor(q.y + q.h / 2 - 1), 2); encosta(C, q, 'grilhoes', 2); noCanto(C, q, 'braseiro'); noCanto(C, q, 'jaula'); encosta(C, q, 'tocha', 1); },
  });
  // a sala alagada: a água no chão (o relevo da água, que corre), menos uma beirada de cada lado
  function alagar(C, q, beira) {
    const b = Math.max(0.6, Math.min(q.w, q.h) * beira);
    C.p.relevo.push({ t: 'agua', alt: -0.5, k: 'rect', x: q.x + b, y: q.y + b, w: Math.max(0.8, q.w - 2 * b), h: Math.max(0.8, q.h - 2 * b) });
  }

  /* ================= o plano de um nível ================= */
  /* o: { tipo, tamanho, nivel, estilo, seed, segredos (portas secretas e runas), descida (a escada para o nível de
     baixo) }. Devolve o plano: a grade (em texto: 0 rocha, 1 sala, 2 corredor, 3 água, 4 abismo, 5 nicho, 6 ponte), as
     salas, as paredes (com as portas), os objetos, as luzes, o relevo, as zonas (as runas), os desenhos do fundo e as
     escadas (a de subida e a de descida). */
  function gerar(o) {
    o = o || {};
    // (lote 18) o subsolo: do tamanho da cena de cima, com a entrada, o rio e o bioma de lá
    const sob = o.tipo === 'subsolo', are = o.tipo === 'arena', tipo = sob ? 'subsolo' : are ? 'arena' : TODOS.some(t => t[0] === o.tipo) ? o.tipo : 'pedra';
    const tamanho = TAMANHOS[o.tamanho] ? o.tamanho : 'medio', T = are ? TAM_ARENA[tamanho] : sob ? { W: clamp(Math.round(Number(o.W)) || 40, 20, 80), H: clamp(Math.round(Number(o.H)) || 30, 16, 60) } : TAMANHOS[tamanho];
    const ex = sob ? { entradaEm: { x: clamp(Number(o.x) || T.W / 2, 0, T.W), y: clamp(Number(o.y) || T.H / 2, 0, T.H) }, rioPts: Array.isArray(o.rio) && o.rio.length >= 2 ? o.rio.filter(q => Array.isArray(q) && isFinite(q[0]) && isFinite(q[1])).slice(0, 80).map(q => [Number(q[0]), Number(q[1])]) : null,
      bioma: BIOMAS_SUB.some(b => b[0] === o.bioma) ? o.bioma : 'fungos', achados: o.achados !== false, marcadores: [] }
      : are ? { arena: Object.assign({ tipo: ARENAS.some(x => x[0] === o.arena) ? o.arena : 'coliseu' }, Array.isArray(o.fases) ? { fk: o.fases } : {}), marcadores: [] } : null;
    const nivel = clamp(Math.round(Number(o.nivel)) || 1, 1, 99), estilo = typeof Estilos !== 'undefined' ? Estilos.valido(o.estilo) : 'comum';
    const seed = (Math.round(Number(o.seed)) >>> 0) || 1, segredos = o.segredos !== false, descida = o.descida !== false;
    let p = null;
    // (se o sorteio sair ruim — poucas salas, sem lugar para as escadas —, tenta outra vez, com outra semente derivada)
    for (let t = 0; t < 8; t++) {
      const W = T.W, H = T.H, G = nova(W, H), r = mulberry((sub(seed, 1 + t * 17) % 2147483000) + 1);
      p = { v: 1, lugar: 'masmorra', tipo, tamanho, nivel, estilo, seed, segredos, descida, W, H, larg: largEscolhida(o.larg),
        salas: [], paredes: [], visao: [], objetos: [], luzes: [], relevo: [], formas: [], zonas: [], pintados: [], sobe: null, desce: null };
      if (ex) Object.assign(p, JSON.parse(JSON.stringify(ex)));
      const C = contexto(p, G, r);
      if (tipo === 'arena') nivelDeArena(C); else if (tipo === 'subsolo') nivelDeSubsolo(C); else if (tipo === 'caverna' || tipo === 'covil') nivelDeCaverna(C); else if (tipo === 'mina') nivelDeMina(C); else if (tipo === 'navio') nivelDeNavio(C); else nivelDeSalas(C);
      p.grade = Array.from(G.g).join('');
      p.tentativa = t;
      if (tipo === 'arena') break;
      if (p.sobe && (!descida || p.desce) && p.salas.length >= (tipo === 'subsolo' || (tipo === 'mina' && tamanho === 'pequeno') ? 2 : 3)) break;
    }
    // o relevo da água, do abismo e do poço (o contorno das casas deles)
    const { W, H } = p, g = p.grade, at = (i, j) => (i >= 0 && j >= 0 && i < W && j < H ? +g[j * W + i] : ROCHA);
    const cav = CAVADO.has(tipo), borda = (dentro, k) => (cav ? contornoTremido(W, H, dentro, (seed + k) % 9973) : contornos(W, H, dentro).map(l => simplifica(l, 0.12))).filter(l => l.length > 3);
    p.aguas = borda((i, j) => at(i, j) === AGUA, 5);
    p.abismos = borda((i, j) => at(i, j) === ABISMO, 9);
    if (tipo === 'subsolo' || tipo === 'arena') { p.lavas = borda((i, j) => at(i, j) === LAVA, 11); p.gelos = borda((i, j) => at(i, j) === GELO, 13); }
    for (const l of p.aguas) p.relevo.unshift({ t: 'agua', alt: -1.5, k: 'poly', pts: l });
    for (const l of p.abismos) p.relevo.unshift({ t: 'fosso', alt: -10, k: 'poly', pts: l });
    return p;
  }
  const nomePadrao = p => NOME[p.tipo] + ' — nível ' + p.nivel;
  function resumo(p) {
    const portas = p.paredes.filter(w => w.k === 'door' && !w.secret).length, secretas = p.paredes.filter(w => w.secret).length;
    const partes = [(TODOS.find(t => t[0] === p.tipo) || TIPOS[0])[1] + ' · nível ' + p.nivel, p.W + ' × ' + p.H + ' quadrados'];
    const salas = p.salas.length;
    if (p.tipo === 'arena') {
      const a = p.arena, q = [(ARENAS.find(x => x[0] === a.tipo) || ARENAS[0])[1], p.W + ' × ' + p.H + ' quadrados', 'o chefe e ' + (a.reforcos.length === 1 ? '1 ponto' : a.reforcos.length + ' pontos') + ' de reforço'];
      const pg = Array.from(new Set(a.perigos.map(x => (FX.P[x] ? FX.P[x].n.toLowerCase() : x))));
      if (pg.length) q.push('perigos: ' + pg.join(', '));
      q.push(a.fases.length + ' fases prontas');
      return q.join(' · ') + '.';
    }
    if (p.tipo === 'subsolo') {
      const b = (BIOMAS_SUB.find(x => x[0] === p.bioma) || BIOMAS_SUB[0])[1].toLowerCase(), q = [ 'Subsolo · ' + b, p.W + ' × ' + p.H + ' quadrados', salas === 1 ? 'uma câmara' : salas + ' câmaras'];
      if (p.rioPts) q.push('o rio de baixo');
      if (p.lago) q.push(p.lago.k === 'lava' ? 'o lago de lava' : p.lago.k === 'gelo' ? 'o lago congelado' : 'o lago escuro');
      const mk = (p.marcadores || []).length;
      if (mk) q.push(mk === 1 ? 'um achado' : 'um achado e um ninho');
      if (p.desce) q.push('a passagem escondida para o nível ' + (p.nivel + 1));
      return q.join(' · ') + '.';
    }
    partes.push(CAVADO.has(p.tipo) ? (salas === 1 ? 'uma câmara' : salas + ' câmaras') : p.tipo === 'mina' ? (salas === 1 ? 'uma galeria' : salas + ' galerias') : p.tipo === 'navio' ? salas + ' compartimentos' : salas === 1 ? 'uma sala' : salas + ' salas');
    if (p.larg > 1 && p.tipo !== 'arena') partes.push((CAVADO.has(p.tipo) ? 'túneis de ' : 'corredores de ') + p.larg + ' quadrados');
    if (portas) partes.push(portas === 1 ? 'uma porta' : portas + ' portas');
    if (secretas) partes.push(secretas === 1 ? 'uma porta secreta' : secretas + ' portas secretas');
    const runas = p.zonas.filter(z => z.fx === 'runas').length;
    if (runas) partes.push(runas === 1 ? 'uma runa-armadilha' : runas + ' runas-armadilha');
    if (p.desce) partes.push('a escada para o nível ' + (p.nivel + 1));
    return partes.join(' · ') + '.';
  }
  /* ================= o desenho do fundo ================= */
  const PAL_M = {
    pedra: { rocha: ['#262529', '#323136', '#18171b'], chao: ['#6a6762', '#77736d', '#5c5955'], junta: '#3b3936', bloco: ['#5b5852', '#4c4a45', '#67635c'] },
    cripta: { rocha: ['#221f1c', '#2e2a26', '#151311'], chao: ['#5c574f', '#686259', '#4f4a43'], junta: '#35312b', bloco: ['#57524a', '#48443d', '#625c53'] },
    caverna: { rocha: ['#2b2621', '#38312a', '#1b1714'], chao: ['#564c43', '#62574c', '#4a4139'], junta: '#3a332c', bloco: ['#4e453c', '#433b33', '#5a5045'] },
    mina: { rocha: ['#2c241f', '#3a2f28', '#1c1612'], chao: ['#5a4a3c', '#665443', '#4c3e32'], junta: '#3b3027', bloco: ['#4d3f33', '#43372d', '#58483a'] },
    // (lote 28) os estilos novos
    templo: { rocha: ['#28262a', '#343137', '#19181b'], chao: ['#8d877c', '#9a948a', '#807a70'], junta: '#55504a', bloco: ['#8a8378', '#7a746a', '#968f84'] },
    esgoto: { rocha: ['#1d211c', '#262c25', '#131612'], chao: ['#4f4a3c', '#5a5444', '#454034'], junta: '#2e2b22', bloco: ['#5a3f32', '#4e372b', '#664838'] },
    torre: { rocha: ['#1d1c26', '#272533', '#121119'], chao: ['#5f5a6e', '#6b657b', '#545063'], junta: '#3a3646', bloco: ['#57526a', '#4a465c', '#635d77'] },
    laboratorio: { rocha: ['#1c1f22', '#25292d', '#121416'], chao: ['#6f7d7b', '#7c8b88', '#64716f'], junta: '#3d4644', bloco: ['#5d6866', '#525c5a', '#697573'] },
    fortaleza: { rocha: ['#2a2420', '#36302a', '#1a1613'], chao: ['#6e6256', '#7a6d60', '#62574c'], junta: '#3e352d', bloco: ['#6a5d50', '#5c5045', '#776a5c'] },
    ruinas: { rocha: ['#1c241c', '#253025', '#121812'], chao: ['#7a8070', '#868c7b', '#6d7364'], junta: '#454a3e', bloco: ['#767c6c', '#686e5f', '#838a78'] },
    covil: { rocha: ['#271c18', '#33241f', '#17100e'], chao: ['#4f3d33', '#5b473b', '#43342b'], junta: '#3a2a22', bloco: ['#4a382e', '#3f3027', '#56423a'] },
    navio: { rocha: ['#0f1a1e', '#152429', '#0a1214'], chao: ['#5a4330', '#664c37', '#4e3a2a'], junta: '#2e2218', bloco: ['#4a3524', '#3f2d1f', '#56402b'] },
    // (lote 49) as catacumbas, o porão, a cisterna e o calabouço
    ossuario: { rocha: ['#201d1a', '#2b2723', '#13110f'], chao: ['#5a554c', '#655f55', '#4d4840'], junta: '#332f29', bloco: ['#56514a', '#47433c', '#615b52'] },
    culto: { rocha: ['#1f1a1c', '#2a2326', '#120f11'], chao: ['#55494b', '#605356', '#493e40'], junta: '#352b2d', bloco: ['#514546', '#443a3b', '#5c4f51'] },
    inundada: { rocha: ['#1a1f1f', '#232a2a', '#101414'], chao: ['#4e5552', '#59615d', '#434a47'], junta: '#2c3230', bloco: ['#4b524f', '#3f4643', '#565e5a'] },
    nobre: { rocha: ['#211e1d', '#2c2827', '#141211'], chao: ['#7a746c', '#878078', '#6d675f'], junta: '#45403a', bloco: ['#736d65', '#655f58', '#807970'] },
    porao: { rocha: ['#241d18', '#30271f', '#16110d'], chao: ['#5e4a38', '#6a5440', '#523f30'], junta: '#3a2d22', bloco: ['#56432f', '#4a3a29', '#614b36'] },
    cisterna: { rocha: ['#1b201c', '#242a25', '#111412'], chao: ['#545246', '#5f5d50', '#48463c'], junta: '#2f2e26', bloco: ['#5a4a3c', '#4e4034', '#665444'] },
    calabouco: { rocha: ['#222124', '#2d2b30', '#151417'], chao: ['#5f5c58', '#6b6863', '#53504c'], junta: '#38363a', bloco: ['#57544f', '#4a4844', '#625f59'] },
  };
  // (lote 28) o chão de cada estilo novo e os que têm parede de cantaria (os blocos do lado da rocha)
  const PISO_M = { nobre: 'marmore', porao: 'madeira', cisterna: 'tijolo', calabouco: 'lajes', ossuario: 'lajes', culto: 'lajes', inundada: 'lajes', templo: 'marmore', esgoto: 'tijolo', torre: 'lajes', laboratorio: 'ladrilho', fortaleza: 'lajes', ruinas: 'lajes', navio: 'madeira' };
  const CANTARIA = new Set(['ossuario', 'culto', 'inundada', 'nobre', 'cisterna', 'calabouco', 'pedra', 'cripta', 'templo', 'esgoto', 'torre', 'laboratorio', 'fortaleza', 'ruinas']);
  // (lote 18) a pedra do subsolo, pelo bioma de baixo
  const PAL_SUB = {
    fungos: PAL_M.caverna,
    cristais: { rocha: ['#26232f', '#322d3d', '#17151d'], chao: ['#55506a', '#615b77', '#48435c'], junta: '#3a3548', bloco: ['#4a4560', '#403b54', '#56506e'] },
    lava: { rocha: ['#241716', '#33201d', '#140c0b'], chao: ['#4a3530', '#563d36', '#3e2c28'], junta: '#3a2420', bloco: ['#44302a', '#3a2823', '#503831'] },
    gelo: { rocha: ['#1f2630', '#2a3340', '#141a22'], chao: ['#6b7c8c', '#7a8c9d', '#5e6e7d'], junta: '#3d4a58', bloco: ['#56687a', '#4b5c6d', '#627589'] },
    raizes: { rocha: ['#2a2219', '#372d21', '#1a140e'], chao: ['#55452f', '#615038', '#4a3c29'], junta: '#3a2f20', bloco: ['#4d3f2c', '#433726', '#594932'] },
  };
  // (lote 18) a pedra e o chão de cada arena
  const PAL_ARENA = {
    coliseu: { rocha: ['#5a5046', '#665b4f', '#463e36'], chao: ['#c2a36b', '#b39360', '#d0b47c'], junta: '#4a4038', bloco: ['#7a6e60', '#6c6154', '#887b6b'] },
    trono: { rocha: ['#232127', '#2e2b33', '#16151a'], chao: ['#8a8590', '#99939f', '#7b7681'], junta: '#4a4650', bloco: ['#6e6974', '#615c67', '#7b7681'] },
    mausoleu: PAL_M.cripta, covil: PAL_SUB.lava, altar: { rocha: ['#221a1c', '#2e2326', '#151012'], chao: ['#5a4c4e', '#66575a', '#4c4042'], junta: '#3a2e30', bloco: ['#54464a', '#483c40', '#615256'] },
    ponte: PAL_M.caverna, topo: { rocha: ['#2a2d33', '#353941', '#1b1d22'], chao: ['#76736e', '#83807a', '#68655f'], junta: '#45433f', bloco: ['#6a6762', '#5d5a55', '#77746e'] },
    circulo: { rocha: ['#14200f', '#1b2a14', '#0d160a'], chao: ['#3f5a2e', '#4a6a35', '#34502a'], junta: '#2a3a20', bloco: ['#253620', '#1e2e19', '#2c4026'] },
    // (lote 38) as onze novas
    vampiro: { rocha: ['#1c1416', '#271b1e', '#100b0c'], chao: ['#4f4446', '#5b4f51', '#433a3c'], junta: '#2e2426', bloco: ['#4a3d40', '#3f3336', '#56484b'] },
    clareira: { rocha: ['#0f1a10', '#162416', '#0a120a'], chao: ['#344a2c', '#3e5734', '#2c4025'], junta: '#233220', bloco: ['#1e2e1b', '#182616', '#243820'] },
    fosso: { rocha: ['#1f1110', '#2b1714', '#120909'], chao: ['#3d2a26', '#48322d', '#33231f'], junta: '#2a1714', bloco: ['#3a2622', '#30201c', '#45302a'] },
    ratos: PAL_M.esgoto, lago: PAL_SUB.gelo,
    forja: { rocha: ['#231a15', '#30241d', '#15100c'], chao: ['#5e5148', '#6a5c52', '#52463e'], junta: '#3a2e26', bloco: ['#57493e', '#4b3f35', '#635447'] },
    fantasma: PAL_M.navio,
    biblioteca: { rocha: ['#1b1824', '#252131', '#110f17'], chao: ['#4a3628', '#56402f', '#3e2d21'], junta: '#2a1e16', bloco: ['#4a3f5c', '#3f3550', '#564a6a'] },
    pantano: { rocha: ['#141a0e', '#1c2414', '#0c1008'], chao: ['#4a4630', '#555138', '#3f3c29'], junta: '#2a281a', bloco: ['#363b24', '#2d321e', '#40462b'] },
    espelhos: { rocha: ['#18171c', '#222027', '#0e0d11'], chao: ['#5a5662', '#d6d2dc', '#2c2a32'], junta: '#3a3842', bloco: ['#5e5a68', '#524e5c', '#6a6676'] },
    mina: PAL_M.mina,
  };
  const PISO_ARENA = { coliseu: 'areia', trono: 'marmore', mausoleu: 'lajes', covil: 'bruto', altar: 'lajes', ponte: 'bruto', topo: 'lajes', circulo: 'grama',
    vampiro: 'lajes', clareira: 'grama', fosso: 'bruto', ratos: 'tijolo', lago: 'bruto', forja: 'lajes', fantasma: 'madeira', biblioteca: 'madeira', pantano: 'bruto', espelhos: 'ladrilho', mina: 'bruto' };
  const tomM = (hex, f) => (typeof Estilos !== 'undefined' ? Estilos.tom(hex, f) : hex);
  function pintar(p, c) {
    const W = p.W, H = p.H, cv = document.createElement('canvas');
    cv.width = Math.round(W * c); cv.height = Math.round(H * c);
    const g = cv.getContext('2d'), rnd = mulberry((p.seed ^ 0x2f6b13a7) >>> 0 || 7), P = (p.tipo === 'subsolo' && PAL_SUB[p.bioma]) || (p.tipo === 'arena' && PAL_ARENA[p.arena.tipo]) || PAL_M[p.tipo] || PAL_M.pedra;
    const grade = p.grade, at = (i, j) => (i >= 0 && j >= 0 && i < W && j < H ? +grade[j * W + i] : ROCHA), aberto = (i, j) => at(i, j) !== ROCHA;
    const reto = p.tipo === 'arena' ? ARENA_RETA.has(p.arena.tipo) : !CAVADO.has(p.tipo);
    const piso = p.tipo === 'arena' ? PISO_ARENA[p.arena.tipo] : PISO_M[p.tipo] || null;          // (lote 18: o chão da arena; lote 28: o dos estilos novos)
    // 1) a rocha: o fundo escuro com manchas e rachaduras
    g.fillStyle = P.rocha[0]; g.fillRect(0, 0, cv.width, cv.height);
    for (let k = 0, n = Math.round(W * H * 1.3); k < n; k++) {
      const x = rnd() * W, y = rnd() * H, rr = (0.15 + rnd() * 0.6) * c;
      g.globalAlpha = 0.18 + rnd() * 0.25; g.fillStyle = rnd() < 0.5 ? P.rocha[1] : P.rocha[2];
      g.beginPath(); g.ellipse(x * c, y * c, rr, rr * (0.5 + rnd() * 0.5), rnd() * 3, 0, TAU); g.fill();
    }
    g.globalAlpha = 0.35; g.strokeStyle = P.rocha[2]; g.lineWidth = Math.max(1, c * 0.04);
    for (let k = 0, n = Math.round(W * H / 14); k < n; k++) { let x = rnd() * W, y = rnd() * H, a = rnd() * TAU; g.beginPath(); g.moveTo(x * c, y * c); for (let s = 0; s < 4; s++) { a += rnd() - 0.5; x += Math.cos(a) * 0.6; y += Math.sin(a) * 0.6; g.lineTo(x * c, y * c); } g.stroke(); }
    g.globalAlpha = 1;
    // 2) o chão: o contorno do que não é rocha (reto nas casas; alisado na caverna)
    const linhas = reto ? null : p.contorno || contornos(W, H, aberto);
    const caminhoDoChao = () => {
      g.beginPath();
      if (reto) {
        for (let j = 0; j < H; j++) { let i = 0; while (i < W) { if (!aberto(i, j)) { i++; continue; } let f = i; while (f < W && aberto(f, j)) f++; g.rect(i * c, j * c, (f - i) * c, c); i = f; } }
      } else for (const l of linhas) { l.forEach(([x, y], k) => (k ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); g.closePath(); }
    };
    g.save(); caminhoDoChao(); g.fillStyle = P.chao[0]; g.fill('evenodd'); g.clip('evenodd');
    if (piso === 'areia' || piso === 'grama') {
      // (lote 18) a areia da arena (com as marcas do rastelo) e a grama do círculo de pedras
      const cor = piso === 'areia' ? ['#c2a36b', '#b39360', '#d0b47c'] : ['#3f5a2e', '#4a6a35', '#34502a'];
      g.fillStyle = cor[0]; g.fillRect(0, 0, W * c, H * c);
      for (let k = 0, n = Math.round(W * H * 1.2); k < n; k++) { const x = rnd() * W, y = rnd() * H, rr = (0.3 + rnd() * 1.2) * c; g.globalAlpha = 0.18 + rnd() * 0.2; g.fillStyle = rnd() < 0.5 ? cor[1] : cor[2]; g.beginPath(); g.ellipse(x * c, y * c, rr, rr * 0.7, rnd() * 3, 0, TAU); g.fill(); }
      g.globalAlpha = piso === 'areia' ? 0.18 : 0.5; g.strokeStyle = piso === 'areia' ? '#8f7448' : '#6e8f4a'; g.lineWidth = Math.max(1, c * 0.03);
      if (piso === 'areia') for (let j = 0; j < H * 3; j++) { g.beginPath(); g.moveTo(0, (j / 3) * c); for (let x = 0; x <= W; x += 0.5) g.lineTo(x * c, (j / 3 + Math.sin(x * 0.7 + j) * 0.04) * c); g.stroke(); }
      else for (let k = 0, n = Math.round(W * H * 2); k < n; k++) { const x = rnd() * W, y = rnd() * H; g.beginPath(); g.moveTo(x * c, y * c); g.lineTo((x + (rnd() - 0.5) * 0.15) * c, (y - 0.18) * c); g.stroke(); }
      g.globalAlpha = 1;
    } else if (p.tipo === 'pedra' || p.tipo === 'cripta' || piso === 'lajes' || piso === 'marmore') {
      // as lajes: duas por casa, em fileiras desencontradas, cada uma de um tom
      for (let j = 0; j < H * 2; j++) {
        const des = (j % 2) * 0.5;
        for (let i = -1; i < W * 2; i++) {
          const ci = Math.floor((i + des) / 2), cj = Math.floor(j / 2);
          if (!aberto(ci, cj) && !aberto(ci + 1, cj)) continue;
          const s = Math.floor(rnd() * 26) - 13, b = P.chao[1];
          g.fillStyle = tomM(b, s / 160);
          const q = c / 2, x = (i + des) * q, y = j * q;
          g.fillRect(x + q * 0.05, y + q * 0.05, q * 0.9, q * 0.9);
          if (rnd() < 0.12) { g.strokeStyle = 'rgba(20,18,16,0.45)'; g.lineWidth = Math.max(1, c * 0.02); g.beginPath(); g.moveTo(x + q * rnd(), y + q * 0.1); g.lineTo(x + q * rnd(), y + q * 0.9); g.stroke(); }
        }
      }
      // a sujeira nos cantos e o musgo (na cripta, mais escuro; nas ruínas, o musgo toma conta)
      const musgo = p.tipo === 'ruinas' ? 0.45 : 0.3;
      for (let k = 0, n = Math.round(W * H * (p.tipo === 'ruinas' ? 1.1 : 0.6)); k < n; k++) { const x = rnd() * W, y = rnd() * H, rr = (0.3 + rnd() * 0.9) * c; g.globalAlpha = 0.06 + rnd() * 0.08; g.fillStyle = rnd() < 1 - musgo ? '#1a1612' : '#3f4a2c'; g.beginPath(); g.arc(x * c, y * c, rr, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    } else if (piso === 'tijolo' || piso === 'ladrilho' || piso === 'madeira') {
      // (lote 28) os tijolos do esgoto, os ladrilhos do laboratório e as tábuas do navio
      if (piso === 'tijolo') {
        for (let j = 0; j < H * 3; j++) for (let i = -1; i < W * 2; i++) {
          const q = c / 2, h3 = c / 3, x = (i + (j % 2) * 0.5) * q, y = j * h3;
          if (!aberto(Math.floor(x / c), Math.floor(y / c))) continue;
          g.fillStyle = tomM(P.chao[1], (Math.floor(rnd() * 24) - 12) / 160); g.fillRect(x + 1, y + 1, q - 2, h3 - 2);
        }
        for (let k = 0, n = Math.round(W * H * 0.5); k < n; k++) { const x = rnd() * W, y = rnd() * H, rr = (0.3 + rnd() * 1) * c; g.globalAlpha = 0.08 + rnd() * 0.1; g.fillStyle = rnd() < 0.6 ? '#2a3a22' : '#15130f'; g.beginPath(); g.arc(x * c, y * c, rr, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      } else if (piso === 'ladrilho') {
        for (let j = 0; j < H * 2; j++) for (let i = 0; i < W * 2; i++) {
          if (!aberto(Math.floor(i / 2), Math.floor(j / 2))) continue;
          const q = c / 2; g.fillStyle = (i + j) % 2 ? tomM(P.chao[1], 0.06) : tomM(P.chao[2], -0.04); g.fillRect(i * q + 0.5, j * q + 0.5, q - 1, q - 1);
          if (rnd() < 0.05) { g.strokeStyle = 'rgba(20,24,24,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(i * q + q * rnd(), j * q); g.lineTo(i * q + q * rnd(), j * q + q); g.stroke(); }
        }
        for (let k = 0, n = Math.round(W * H * 0.25); k < n; k++) { const x = rnd() * W, y = rnd() * H, rr = (0.2 + rnd() * 0.6) * c; g.globalAlpha = 0.07 + rnd() * 0.08; g.fillStyle = rnd() < 0.5 ? '#1a2620' : '#2f4a3a'; g.beginPath(); g.arc(x * c, y * c, rr, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      } else {
        // as tábuas, no comprimento do casco, de tamanhos sortidos, com as emendas e os pregos
        for (let j = 0; j < H * 3; j++) {
          let x = -rnd() * 2;
          while (x < W) {
            const l = 1.5 + rnd() * 2.5, y = j / 3;
            if (aberto(Math.floor(Math.max(0, x + l / 2)), Math.floor(y))) {
              g.fillStyle = tomM(P.chao[1], (Math.floor(rnd() * 30) - 15) / 140); g.fillRect(x * c, y * c + 0.5, l * c - 1, c / 3 - 1);
              g.fillStyle = 'rgba(30,20,12,0.6)'; g.fillRect((x + 0.12) * c, y * c + c / 6 - 1, 1.5, 1.5); g.fillRect((x + l - 0.15) * c, y * c + c / 6 - 1, 1.5, 1.5);
            }
            x += l;
          }
        }
        for (let k = 0, n = Math.round(W * H * 0.35); k < n; k++) { const x = rnd() * W, y = rnd() * H, rr = (0.3 + rnd() * 1.1) * c; g.globalAlpha = 0.1 + rnd() * 0.12; g.fillStyle = rnd() < 0.5 ? '#1f2a28' : '#3a4a3a'; g.beginPath(); g.arc(x * c, y * c, rr, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }
    } else {
      // a terra e a pedra do chão da caverna e da mina: manchas grandes, cascalho, as marcas
      for (let k = 0, n = Math.round(W * H * 0.9); k < n; k++) { const x = rnd() * W, y = rnd() * H, rr = (0.3 + rnd() * 1.4) * c; g.globalAlpha = 0.12 + rnd() * 0.18; g.fillStyle = rnd() < 0.5 ? P.chao[1] : P.chao[2]; g.beginPath(); g.ellipse(x * c, y * c, rr, rr * (0.5 + rnd() * 0.5), rnd() * 3, 0, TAU); g.fill(); }
      for (let k = 0, n = Math.round(W * H * 2.2); k < n; k++) { const x = rnd() * W, y = rnd() * H, rr = (0.03 + rnd() * 0.08) * c; g.globalAlpha = 0.5 + rnd() * 0.4; g.fillStyle = rnd() < 0.5 ? tomM(P.chao[1], 0.25) : P.rocha[2]; g.beginPath(); g.arc(x * c, y * c, rr, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    }
    // (por baixo de tudo) o tapete, os trilhos, as poças
    for (const o of p.pintados) if (DESENHO[o.k] && DESENHO[o.k].z === 0) DESENHO[o.k].f(g, o, c, rnd, p);
    g.restore();
    // 3) a água e o abismo (com a ponte de pedra)
    for (const l of p.aguas || []) lagoEscuro(g, l, c, rnd);
    for (const l of p.lavas || []) lagoDeLava(g, l, c, rnd);          // (lote 18: o subsolo)
    for (const l of p.gelos || []) lagoDeGelo(g, l, c, rnd);
    if (typeof Paisagem !== 'undefined') for (const l of p.abismos || []) Paisagem.abismo(g, l, c, rnd, [tomM(P.chao[0], 0.1), P.rocha[1], '#050404']);
    // a ponte de pedra: a faixa de rocha clara atravessando o abismo, com a beira escura dos dois lados
    const ponte = contornos(W, H, (i, j) => at(i, j) === PONTE).filter(l => l.length > 3);
    if (ponte.length) {
      g.save(); g.beginPath(); for (const l of ponte) { simplifica(l, 0.1).forEach(([x, y], k) => (k ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); g.closePath(); }
      g.fillStyle = tomM(P.chao[0], 0.06); g.fill('evenodd');
      g.clip('evenodd');
      for (let k = 0, n = 40; k < n; k++) { g.globalAlpha = 0.3; g.fillStyle = rnd() < 0.5 ? P.chao[1] : P.rocha[2]; g.beginPath(); g.arc(rnd() * W * c, rnd() * H * c, c * (0.1 + rnd() * 0.25), 0, TAU); g.fill(); }
      g.restore();
    }
    // 4) a sombra das paredes no chão (para dentro), e a beira das paredes
    const bordas = reto ? paredesDaGrade({ W, H, at }, v => v !== ROCHA) : null;
    g.save(); caminhoDoChao(); g.clip('evenodd');
    g.lineCap = 'round'; g.lineJoin = 'round';
    const tracaBordas = () => { g.beginPath(); if (reto) for (const s of bordas) { g.moveTo(s.x1 * c, s.y1 * c); g.lineTo(s.x2 * c, s.y2 * c); } else for (const l of linhas) l.forEach(([x, y], k) => (k ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); };
    for (const [lw, a] of [[0.9, 0.18], [0.55, 0.22], [0.25, 0.3]]) { g.globalAlpha = a; g.strokeStyle = '#000'; g.lineWidth = c * lw; tracaBordas(); g.stroke(); }
    g.restore();
    // a parede: na pedra e na cripta, os blocos de cantaria do lado da rocha; na caverna e na mina, a rocha bruta
    g.save(); g.globalAlpha = 1;
    if (reto && CANTARIA.has(p.tipo)) {
      for (const s of bordas) {
        const horiz = s.y1 === s.y2, L = horiz ? s.x2 - s.x1 : s.y2 - s.y1;
        // (de que lado fica a rocha: a casa de cima/da esquerda é rocha?)
        const rochaAntes = horiz ? !aberto(s.x1, s.y1 - 1) : !aberto(s.x1 - 1, s.y1);
        const esp = 0.32, sinal = rochaAntes ? -1 : 1;
        let u = 0;
        while (u < L) {
          const l = Math.min(L - u, 0.45 + rnd() * 0.5);
          const x = horiz ? (s.x1 + u) * c : (s.x1 + (sinal < 0 ? -esp : 0)) * c, y = horiz ? (s.y1 + (sinal < 0 ? -esp : 0)) * c : (s.y1 + u) * c;
          const w = horiz ? l * c : esp * c, h2 = horiz ? esp * c : l * c;
          g.fillStyle = P.bloco[Math.floor(rnd() * P.bloco.length)]; g.fillRect(x, y, w, h2);
          g.strokeStyle = P.junta; g.lineWidth = Math.max(1, c * 0.035); g.strokeRect(x, y, w, h2);
          u += l;
        }
      }
    } else {
      g.lineCap = 'round'; g.lineJoin = 'round';
      const tr = () => { g.beginPath(); if (reto) for (const s of bordas) { g.moveTo(s.x1 * c, s.y1 * c); g.lineTo(s.x2 * c, s.y2 * c); } else for (const l of linhas) l.forEach(([x, y], k) => (k ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); };
      g.strokeStyle = P.bloco[1]; g.lineWidth = c * 0.42; tr(); g.stroke();
      g.strokeStyle = P.bloco[0]; g.lineWidth = c * 0.22; tr(); g.stroke();
      // as lascas de rocha soltas na beira
      if (!reto) for (const l of linhas) for (let k = 1; k < l.length; k += 2) if (rnd() < 0.35) { const [x, y] = l[k]; g.fillStyle = P.bloco[2]; g.beginPath(); g.arc(x * c + (rnd() - 0.5) * c * 0.3, y * c + (rnd() - 0.5) * c * 0.3, c * (0.08 + rnd() * 0.12), 0, TAU); g.fill(); }
    }
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = Math.max(1, c * 0.06);
    g.beginPath(); if (reto) for (const s of bordas) { g.moveTo(s.x1 * c, s.y1 * c); g.lineTo(s.x2 * c, s.y2 * c); } else for (const l of linhas) l.forEach(([x, y], k) => (k ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c)));
    g.stroke();
    g.restore();
    // 5) as portas: a soleira e os batentes (a porta mesmo é da cena: abre e fecha); as grades das celas
    for (const w of p.paredes) {
      if (w.k === 'door' && !w.secret) soleira(g, w, c);
      else if (w.k === 'door' && w.secret) costura(g, w, c, P);
      else if (w.k === 'mureta' || w.k === 'window') grade_(g, w, c);
    }
    // as paredes de dentro das celas (entre uma cela e outra)
    for (const w of p.paredes) if (w.k === 'wall' && dentroDoChao(w, aberto)) parede_(g, w, c, P);
    // 6) o resto dos desenhos, de baixo para cima
    for (const z of [1, 2, 3]) for (const o of p.pintados) if (DESENHO[o.k] && DESENHO[o.k].z === z) DESENHO[o.k].f(g, o, c, rnd, p);
    if (typeof Paisagem !== 'undefined') Paisagem.vinheta(g, W, H, c, 0.35);
    return cv;
  }
  // (a parede de dentro de uma sala: as duas casas dos lados dela são chão)
  const dentroDoChao = (w, aberto) => {
    const horiz = w.y1 === w.y2;
    const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
    return horiz ? aberto(Math.floor(mx), Math.round(my) - 1) && aberto(Math.floor(mx), Math.round(my)) : aberto(Math.round(mx) - 1, Math.floor(my)) && aberto(Math.round(mx), Math.floor(my));
  };
  function soleira(g, w, c) {
    const horiz = Math.abs(w.y1 - w.y2) < 1e-6;
    g.save();
    g.fillStyle = 'rgba(30,24,18,0.55)';
    if (horiz) g.fillRect(Math.min(w.x1, w.x2) * c, (w.y1 - 0.12) * c, Math.abs(w.x2 - w.x1) * c, 0.24 * c); else g.fillRect((w.x1 - 0.12) * c, Math.min(w.y1, w.y2) * c, 0.24 * c, Math.abs(w.y2 - w.y1) * c);
    // os batentes de madeira nas duas pontas
    g.fillStyle = '#5a3f26'; g.strokeStyle = '#2a1c10'; g.lineWidth = Math.max(1, c * 0.03);
    for (const [x, y] of [[w.x1, w.y1], [w.x2, w.y2]]) { g.fillRect(x * c - c * 0.13, y * c - c * 0.13, c * 0.26, c * 0.26); g.strokeRect(x * c - c * 0.13, y * c - c * 0.13, c * 0.26, c * 0.26); }
    g.restore();
  }
  // a porta secreta: a parede continua (só uma linha fininha, para quem sabe olhar)
  function costura(g, w, c, P) {
    const horiz = Math.abs(w.y1 - w.y2) < 1e-6, esp = 0.32;
    g.save();
    g.fillStyle = P.bloco[0];
    if (horiz) g.fillRect(Math.min(w.x1, w.x2) * c, (w.y1 - esp / 2) * c, Math.abs(w.x2 - w.x1) * c, esp * c); else g.fillRect((w.x1 - esp / 2) * c, Math.min(w.y1, w.y2) * c, esp * c, Math.abs(w.y2 - w.y1) * c);
    g.strokeStyle = P.junta; g.lineWidth = Math.max(1, c * 0.035);
    if (horiz) g.strokeRect(Math.min(w.x1, w.x2) * c, (w.y1 - esp / 2) * c, Math.abs(w.x2 - w.x1) * c, esp * c); else g.strokeRect((w.x1 - esp / 2) * c, Math.min(w.y1, w.y2) * c, esp * c, Math.abs(w.y2 - w.y1) * c);
    g.restore();
  }
  // as grades de ferro (a frente das celas; a portinhola é igual, com a dobradiça)
  function grade_(g, w, c) {
    const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1), ux = (w.x2 - w.x1) / L, uy = (w.y2 - w.y1) / L;
    g.save(); g.lineCap = 'round';
    g.strokeStyle = '#141416'; g.lineWidth = Math.max(2, c * 0.13); g.beginPath(); g.moveTo(w.x1 * c, w.y1 * c); g.lineTo(w.x2 * c, w.y2 * c); g.stroke();
    g.strokeStyle = '#7d8086'; g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.moveTo(w.x1 * c, w.y1 * c); g.lineTo(w.x2 * c, w.y2 * c); g.stroke();
    for (let t = 0.12; t < L; t += 0.24) { const x = (w.x1 + ux * t) * c, y = (w.y1 + uy * t) * c; g.fillStyle = '#1a1a1c'; g.beginPath(); g.arc(x, y, Math.max(1.5, c * 0.085), 0, TAU); g.fill(); g.fillStyle = '#b4b7bd'; g.beginPath(); g.arc(x - c * 0.015, y - c * 0.015, Math.max(1, c * 0.055), 0, TAU); g.fill(); }
    if (w.k === 'window') { g.fillStyle = '#3a3a3e'; g.fillRect(w.x1 * c - c * 0.08, w.y1 * c - c * 0.08, c * 0.16, c * 0.16); }
    g.restore();
  }
  function parede_(g, w, c, P) {
    g.save(); g.lineCap = 'square';
    g.strokeStyle = P.junta; g.lineWidth = c * 0.26; g.beginPath(); g.moveTo(w.x1 * c, w.y1 * c); g.lineTo(w.x2 * c, w.y2 * c); g.stroke();
    g.strokeStyle = P.bloco[0]; g.lineWidth = c * 0.18; g.beginPath(); g.moveTo(w.x1 * c, w.y1 * c); g.lineTo(w.x2 * c, w.y2 * c); g.stroke();
    g.restore();
  }
  // o lago de baixo da terra: escuro, verde-azulado, com a beira clara e as ondinhas
  function lagoEscuro(g, l, c, rnd) {
    const pts = simplifica(l, 0.1);
    const caminho = () => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); g.closePath(); };
    g.save();
    caminho(); g.fillStyle = '#163038'; g.fill();
    g.save(); caminho(); g.clip();
    for (const [lw, cor, a] of [[1.6, '#0c1d23', 0.8], [0.9, '#1f4450', 0.6], [0.35, '#3b7480', 0.55]]) { g.globalAlpha = a; caminho(); g.strokeStyle = cor; g.lineWidth = c * lw; g.stroke(); }
    // o fundo mais escuro no meio
    const [x0, y0, x1, y1] = pts.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [1e9, 1e9, -1e9, -1e9]);
    const gr = g.createRadialGradient((x0 + x1) / 2 * c, (y0 + y1) / 2 * c, 0, (x0 + x1) / 2 * c, (y0 + y1) / 2 * c, Math.max(x1 - x0, y1 - y0) / 2 * c);
    gr.addColorStop(0, 'rgba(4,10,14,0.65)'); gr.addColorStop(1, 'rgba(4,10,14,0)');
    g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(x0 * c, y0 * c, (x1 - x0) * c, (y1 - y0) * c);
    g.strokeStyle = 'rgba(160,220,230,0.18)'; g.lineWidth = Math.max(1, c * 0.03);
    for (let k = 0, n = Math.round((x1 - x0) * (y1 - y0) * 0.25) + 2; k < n; k++) { const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0); g.beginPath(); g.arc(x * c, y * c, c * (0.2 + rnd() * 0.4), Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.restore();
    caminho(); g.strokeStyle = 'rgba(120,110,95,0.6)'; g.lineWidth = Math.max(1, c * 0.07); g.stroke();
    g.restore();
  }

  // (lote 18) o lago de lava: o laranja que brilha, as crostas escuras e a beira em brasa
  function lagoDeLava(g, l, c, rnd) {
    const pts = simplifica(l, 0.1);
    const caminho = () => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); g.closePath(); };
    const [x0, y0, x1, y1] = pts.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [1e9, 1e9, -1e9, -1e9]);
    g.save();
    caminho(); const gr = g.createRadialGradient((x0 + x1) / 2 * c, (y0 + y1) / 2 * c, 0, (x0 + x1) / 2 * c, (y0 + y1) / 2 * c, Math.max(x1 - x0, y1 - y0) / 2 * c);
    gr.addColorStop(0, '#ffd35a'); gr.addColorStop(0.5, '#ff8a2a'); gr.addColorStop(1, '#c2361a');
    g.fillStyle = gr; g.fill();
    g.save(); caminho(); g.clip();
    for (let k = 0, n = Math.round((x1 - x0) * (y1 - y0) * 0.5) + 3; k < n; k++) { const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0); g.globalAlpha = 0.55; g.fillStyle = '#3a1a12'; g.beginPath(); g.ellipse(x * c, y * c, c * (0.2 + rnd() * 0.5), c * (0.12 + rnd() * 0.25), rnd() * 3, 0, TAU); g.fill(); }
    g.restore();
    g.globalAlpha = 0.85; caminho(); g.strokeStyle = '#ff6a1f'; g.lineWidth = Math.max(1, c * 0.12); g.stroke();
    g.restore();
  }
  // (lote 18) o lago congelado: o gelo claro, as rachaduras e a neve na beira
  function lagoDeGelo(g, l, c, rnd) {
    const pts = simplifica(l, 0.1);
    const caminho = () => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); g.closePath(); };
    const [x0, y0, x1, y1] = pts.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [1e9, 1e9, -1e9, -1e9]);
    g.save();
    caminho(); g.fillStyle = '#a9cbe0'; g.fill();
    g.save(); caminho(); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = Math.max(1, c * 0.03);
    for (let k = 0, n = Math.round((x1 - x0) * (y1 - y0) * 0.3) + 3; k < n; k++) { let x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), a = rnd() * TAU; g.beginPath(); g.moveTo(x * c, y * c); for (let t = 0; t < 3; t++) { a += rnd() - 0.5; x += Math.cos(a) * 0.5; y += Math.sin(a) * 0.5; g.lineTo(x * c, y * c); } g.stroke(); }
    g.restore();
    caminho(); g.strokeStyle = '#eef6fb'; g.lineWidth = Math.max(1, c * 0.1); g.stroke();
    g.restore();
  }

  /* Os desenhos (z: 0 por baixo de tudo, dentro do chão; 1 no chão; 2 as coisas; 3 o que fica por cima). */
  const DESENHO = {
    tapete: { z: 0, f(g, o, c, rnd) { g.save(); g.fillStyle = o.cor || '#6a1f22'; g.fillRect(o.x * c, o.y * c, o.w * c, o.h * c); g.strokeStyle = '#c9a24a'; g.lineWidth = Math.max(1, c * 0.06); g.strokeRect((o.x + 0.08) * c, (o.y + 0.08) * c, (o.w - 0.16) * c, (o.h - 0.16) * c); g.globalAlpha = 0.25; g.fillStyle = '#000'; for (let k = 0; k < 6; k++) g.fillRect((o.x + rnd() * o.w) * c, (o.y + rnd() * o.h) * c, c * 0.3, c * 0.2); g.restore(); } },
    trilho: { z: 0, f(g, o, c) {
      const pts = o.pts; if (!pts || pts.length < 2) return;
      g.save(); g.lineCap = 'butt';
      // os dormentes (de madeira) atravessados, e os dois trilhos de ferro
      for (let k = 1; k < pts.length; k++) {
        const [x1, y1] = pts[k - 1], [x2, y2] = pts[k], L = Math.hypot(x2 - x1, y2 - y1); if (L < 0.01) continue;
        const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
        g.strokeStyle = '#4a3522'; g.lineWidth = c * 0.14;
        for (let t = 0; t <= L; t += 0.45) { const x = x1 + ux * t, y = y1 + uy * t; g.beginPath(); g.moveTo((x - uy * 0.42) * c, (y + ux * 0.42) * c); g.lineTo((x + uy * 0.42) * c, (y - ux * 0.42) * c); g.stroke(); }
      }
      for (const off of [-0.27, 0.27]) {
        g.strokeStyle = '#2a2a2c'; g.lineWidth = Math.max(1.5, c * 0.08); g.beginPath();
        for (let k = 0; k < pts.length; k++) {
          const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
          const x = pts[k][0] + nx * off, y = pts[k][1] + ny * off; k ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c);
        }
        g.stroke(); g.strokeStyle = '#8a8c90'; g.lineWidth = Math.max(1, c * 0.03); g.stroke();
      }
      g.restore();
    } },
    poca: { z: 0, f(g, o, c, rnd) { g.save(); g.globalAlpha = 0.7; g.fillStyle = '#1d2a2e'; g.beginPath(); g.ellipse(o.x * c, o.y * c, o.r * c, o.r * 0.6 * c, rnd() * 3, 0, TAU); g.fill(); g.globalAlpha = 0.3; g.strokeStyle = '#9fc4cc'; g.lineWidth = Math.max(1, c * 0.03); g.stroke(); g.restore(); } },
    estrado: { z: 1, f(g, o, c) {
      g.save();
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect((o.x + 0.1) * c, (o.y + 0.12) * c, o.w * c, o.h * c);
      g.fillStyle = '#7d776d'; g.fillRect(o.x * c, o.y * c, o.w * c, o.h * c);
      g.fillStyle = '#8b857a'; g.fillRect((o.x + 0.12) * c, (o.y + 0.12) * c, (o.w - 0.24) * c, (o.h - 0.24) * c);
      g.strokeStyle = '#3f3b35'; g.lineWidth = Math.max(1, c * 0.05); g.strokeRect(o.x * c, o.y * c, o.w * c, o.h * c);
      g.restore();
    } },
    nicho: { z: 1, f(g, o, c, rnd) {
      // a cova na rocha (mais escura no fundo) e o morto deitado nela (ou a urna)
      const x = o.x * c, y = o.y * c;
      g.save();
      g.fillStyle = '#1a1714'; g.fillRect(x + c * 0.04, y + c * 0.04, c * 0.92, c * 0.92);
      const fundo = { n: [0, -1], s: [0, 1], o: [-1, 0], l: [1, 0] }[o.lado] || [0, 0];
      const gr = g.createLinearGradient(x + c / 2 - fundo[0] * c / 2, y + c / 2 - fundo[1] * c / 2, x + c / 2 + fundo[0] * c / 2, y + c / 2 + fundo[1] * c / 2);
      gr.addColorStop(0, 'rgba(70,62,52,0.9)'); gr.addColorStop(1, 'rgba(10,8,6,0.95)');
      g.fillStyle = gr; g.fillRect(x + c * 0.1, y + c * 0.1, c * 0.8, c * 0.8);
      if (rnd() < 0.75) {
        // o esqueleto: o crânio e os ossos compridos
        const vert = o.lado === 'n' || o.lado === 's';
        g.strokeStyle = '#d8ccb0'; g.lineWidth = Math.max(1, c * 0.06); g.lineCap = 'round';
        g.beginPath(); if (vert) { g.moveTo(x + c * 0.5, y + c * 0.3); g.lineTo(x + c * 0.5, y + c * 0.82); } else { g.moveTo(x + c * 0.3, y + c * 0.5); g.lineTo(x + c * 0.82, y + c * 0.5); } g.stroke();
        g.fillStyle = '#e6dcc2'; g.beginPath(); g.arc(vert ? x + c * 0.5 : x + c * 0.24, vert ? y + c * 0.24 : y + c * 0.5, c * 0.12, 0, TAU); g.fill();
        g.fillStyle = '#2a2420'; g.beginPath(); g.arc((vert ? x + c * 0.46 : x + c * 0.22), (vert ? y + c * 0.23 : y + c * 0.46), c * 0.025, 0, TAU); g.arc((vert ? x + c * 0.54 : x + c * 0.22), (vert ? y + c * 0.23 : y + c * 0.54), c * 0.025, 0, TAU); g.fill();
      } else { g.fillStyle = '#7a5a3a'; g.beginPath(); g.ellipse(x + c * 0.5, y + c * 0.5, c * 0.2, c * 0.26, 0, 0, TAU); g.fill(); g.strokeStyle = '#3a2a1a'; g.lineWidth = Math.max(1, c * 0.03); g.stroke(); }
      g.restore();
    } },
    sarcofago: { z: 2, f(g, o, c) {
      const x = o.x * c, y = o.y * c, w = o.w * c, h = o.h * c, deitado = o.w > o.h;
      g.save();
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x + c * 0.08, y + c * 0.1, w, h);
      g.fillStyle = o.grande ? '#8d8679' : '#77716a'; g.fillRect(x, y, w, h);
      g.fillStyle = o.grande ? '#a39b8c' : '#8a837a'; g.fillRect(x + c * 0.08, y + c * 0.08, w - c * 0.16, h - c * 0.16);
      g.strokeStyle = '#3c3832'; g.lineWidth = Math.max(1, c * 0.04); g.strokeRect(x, y, w, h);
      // a figura deitada na tampa (a cabeça, os braços cruzados)
      g.strokeStyle = 'rgba(60,55,48,0.8)'; g.lineWidth = Math.max(1, c * 0.035);
      const cx = x + w / 2, cy = y + h / 2;
      g.beginPath();
      if (deitado) { g.arc(x + w * 0.2, cy, Math.min(w, h) * 0.18, 0, TAU); g.moveTo(x + w * 0.35, cy - h * 0.25); g.lineTo(x + w * 0.85, cy - h * 0.15); g.moveTo(x + w * 0.35, cy + h * 0.25); g.lineTo(x + w * 0.85, cy + h * 0.15); }
      else { g.arc(cx, y + h * 0.2, Math.min(w, h) * 0.18, 0, TAU); g.moveTo(cx - w * 0.25, y + h * 0.35); g.lineTo(cx - w * 0.15, y + h * 0.85); g.moveTo(cx + w * 0.25, y + h * 0.35); g.lineTo(cx + w * 0.15, y + h * 0.85); }
      g.stroke();
      if (o.grande) { g.strokeStyle = '#c9a24a'; g.lineWidth = Math.max(1, c * 0.04); g.strokeRect(x + c * 0.14, y + c * 0.14, w - c * 0.28, h - c * 0.28); }
      g.restore();
    } },
    coluna: { z: 2, f(g, o, c) {
      g.save();
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc((o.x + 0.1) * c, (o.y + 0.12) * c, o.r * c * 1.05, 0, TAU); g.fill();
      const gr = g.createRadialGradient((o.x - o.r * 0.35) * c, (o.y - o.r * 0.35) * c, o.r * c * 0.1, o.x * c, o.y * c, o.r * c * 1.1);
      gr.addColorStop(0, '#a49e93'); gr.addColorStop(1, '#55514b');
      g.fillStyle = gr; g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c, 0, TAU); g.fill();
      g.strokeStyle = '#2f2c28'; g.lineWidth = Math.max(1, c * 0.04); g.stroke();
      g.strokeStyle = 'rgba(40,36,32,0.5)'; g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c * 0.65, 0, TAU); g.stroke();
      g.restore();
    } },
    estalagmite: { z: 2, f(g, o, c, rnd) {
      const n = o.grande ? 1 : (o.n || 2);
      g.save();
      for (let k = 0; k < n; k++) {
        const x = (o.x + (n > 1 ? (rnd() - 0.5) * 0.7 : 0)) * c, y = (o.y + (n > 1 ? (rnd() - 0.5) * 0.7 : 0)) * c, rr = (o.grande ? o.r : o.r * (0.6 + rnd() * 0.6)) * c;
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(x + rr * 0.3, y + rr * 0.35, rr, rr * 0.85, 0, 0, TAU); g.fill();
        const gr = g.createRadialGradient(x - rr * 0.3, y - rr * 0.3, rr * 0.05, x, y, rr);
        if (o.gelo) { gr.addColorStop(0, '#f2fbff'); gr.addColorStop(0.5, '#a8cde3'); gr.addColorStop(1, '#4a6a82'); }       // (lote 18: a de gelo)
        else { gr.addColorStop(0, '#b3a894'); gr.addColorStop(0.5, '#7a6f60'); gr.addColorStop(1, '#3e372f'); }
        g.fillStyle = gr; g.beginPath();
        for (let a = 0; a < 7; a++) { const an = (a / 7) * TAU, d = rr * (0.8 + rnd() * 0.25); a ? g.lineTo(x + Math.cos(an) * d, y + Math.sin(an) * d) : g.moveTo(x + Math.cos(an) * d, y + Math.sin(an) * d); }
        g.closePath(); g.fill();
        g.fillStyle = '#d6ccb8'; g.beginPath(); g.arc(x - rr * 0.15, y - rr * 0.15, rr * 0.18, 0, TAU); g.fill();
      }
      g.restore();
    } },
    escada: { z: 2, f(g, o, c, rnd, p) {
      // os degraus entrando na parede (para cima clareiam; para baixo escurecem); na mina, a escada de madeira; na
      // caverna, os degraus brutos
      const { x, y, w, h, lado } = o, n = 6, vert = lado === 'n' || lado === 's';
      g.save();
      for (let k = 0; k < n; k++) {
        const t = k / n, f = o.sobe ? 0.12 + t * 0.35 : -0.05 - t * 0.55;
        const base = o.madeira ? '#7a5a3a' : o.natural ? '#6e6458' : '#7d786f';
        g.fillStyle = tomM(base, f);
        let rx, ry, rw, rh;
        if (lado === 'n') { rx = x; ry = y + (n - 1 - k) * (h / n); rw = w; rh = h / n; }
        else if (lado === 's') { rx = x; ry = y + k * (h / n); rw = w; rh = h / n; }
        else if (lado === 'o') { rx = x + (n - 1 - k) * (w / n); ry = y; rw = w / n; rh = h; }
        else { rx = x + k * (w / n); ry = y; rw = w / n; rh = h; }
        if (o.natural) {
          // (os degraus brutos: lajes tortas, com a quina escura)
          const jit = () => (rnd() - 0.5) * 0.12 * c, cantos = [[rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]].map(([a, b]) => [a * c + jit(), b * c + jit()]);
          g.beginPath(); cantos.forEach(([a, b], m) => (m ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(15,12,10,0.6)'; g.lineWidth = Math.max(1, c * 0.04); g.stroke();
        }
        else { g.fillRect(rx * c, ry * c, rw * c + 0.5, rh * c + 0.5); g.strokeStyle = 'rgba(20,16,12,0.55)'; g.lineWidth = Math.max(1, c * 0.03); g.beginPath(); if (vert) { g.moveTo(rx * c, (lado === 'n' ? ry + rh : ry) * c); g.lineTo((rx + rw) * c, (lado === 'n' ? ry + rh : ry) * c); } else { g.moveTo((lado === 'o' ? rx + rw : rx) * c, ry * c); g.lineTo((lado === 'o' ? rx + rw : rx) * c, (ry + rh) * c); } g.stroke(); }
      }
      if (o.madeira) { g.strokeStyle = '#3a2614'; g.lineWidth = Math.max(1.5, c * 0.08); g.beginPath(); if (vert) { g.moveTo((x + 0.15) * c, y * c); g.lineTo((x + 0.15) * c, (y + h) * c); g.moveTo((x + w - 0.15) * c, y * c); g.lineTo((x + w - 0.15) * c, (y + h) * c); } else { g.moveTo(x * c, (y + 0.15) * c); g.lineTo((x + w) * c, (y + 0.15) * c); g.moveTo(x * c, (y + h - 0.15) * c); g.lineTo((x + w) * c, (y + h - 0.15) * c); } g.stroke(); }
      // a seta discreta (para cima ou para baixo) só no lado da parede: a sombra do fundo
      const gr = lado === 'n' ? g.createLinearGradient(0, y * c, 0, (y + h) * c) : lado === 's' ? g.createLinearGradient(0, (y + h) * c, 0, y * c) : lado === 'o' ? g.createLinearGradient(x * c, 0, (x + w) * c, 0) : g.createLinearGradient((x + w) * c, 0, x * c, 0);
      gr.addColorStop(0, o.sobe ? 'rgba(255,240,200,0.18)' : 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x * c, y * c, w * c, h * c);
      g.restore();
    } },
    poco: { z: 2, f(g, o, c) {
      // o poço de descida da mina: o buraco (já pintado como abismo), a armação de madeira e o sarilho com a corda
      const { x, y, w, h } = o;
      g.save();
      g.strokeStyle = '#5a3f26'; g.lineWidth = c * 0.22; g.strokeRect(x * c, y * c, w * c, h * c);
      g.strokeStyle = '#3a2614'; g.lineWidth = Math.max(1, c * 0.05); g.strokeRect(x * c, y * c, w * c, h * c);
      g.strokeStyle = '#6b4a2c'; g.lineWidth = c * 0.18; g.beginPath(); g.moveTo((x - 0.2) * c, (y + h / 2) * c); g.lineTo((x + w + 0.2) * c, (y + h / 2) * c); g.stroke();
      g.fillStyle = '#8a6a44'; g.beginPath(); g.arc((x + w / 2) * c, (y + h / 2) * c, c * 0.22, 0, TAU); g.fill();
      g.strokeStyle = '#c8b08a'; g.lineWidth = Math.max(1, c * 0.04); g.beginPath(); g.moveTo((x + w / 2) * c, (y + h / 2) * c); g.lineTo((x + w / 2 + 0.3) * c, (y + h / 2 + 0.6) * c); g.stroke();
      g.restore();
    } },
    trono: { z: 3, f() { /* (o trono é a cadeira da cena, por cima do estrado) */ } },
    entulho: { z: 2, f(g, o, c, rnd) { g.save(); for (let k = 0, n = Math.round(6 + (o.r || 1) * 8); k < n; k++) { const a = rnd() * TAU, d = rnd() * (o.r || 1), x = (o.x + Math.cos(a) * d) * c, y = (o.y + Math.sin(a) * d) * c, s = c * (0.1 + rnd() * 0.22); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - s / 2 + 2, y - s / 2 + 2, s, s * 0.8); g.fillStyle = ['#6b665d', '#7d776c', '#58534b'][Math.floor(rnd() * 3)]; g.save(); g.translate(x, y); g.rotate(rnd() * 3); g.fillRect(-s / 2, -s / 2, s, s * 0.8); g.restore(); } g.restore(); } },
    desabamento: { z: 3, f(g, o, c, rnd) {
      // as pedras caídas tapando o túnel e as escoras quebradas
      g.save();
      for (let k = 0; k < 22; k++) { const a = rnd() * TAU, d = rnd() * o.r, x = (o.x + Math.cos(a) * d) * c, y = (o.y + Math.sin(a) * d) * c, s = c * (0.18 + rnd() * 0.35); g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(x + 2, y + 3, s, 0, TAU); g.fill(); g.fillStyle = ['#5d5045', '#6e6052', '#4c4138'][Math.floor(rnd() * 3)]; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
      g.strokeStyle = '#5a3f26'; g.lineWidth = c * 0.12; g.beginPath(); g.moveTo((o.x - 0.6) * c, (o.y - 0.3) * c); g.lineTo((o.x + 0.5) * c, (o.y + 0.4) * c); g.stroke();
      g.restore();
    } },
    ossos: { z: 2, f(g, o, c, rnd) {
      g.save(); g.lineCap = 'round';
      const n = o.n || 3;
      for (let k = 0; k < n; k++) {
        const x = (o.x + (rnd() - 0.5) * (o.pilha ? 0.6 : 1)) * c, y = (o.y + (rnd() - 0.5) * (o.pilha ? 0.6 : 1)) * c, a = rnd() * 3, l = c * (0.25 + rnd() * 0.25);
        g.strokeStyle = '#cfc3a6'; g.lineWidth = Math.max(1, c * 0.06); g.beginPath(); g.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
        g.fillStyle = '#e2d7bd'; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * Math.cos(a) * l, y + s * Math.sin(a) * l, c * 0.05, 0, TAU); g.fill(); }
      }
      if (o.pilha || rnd() < 0.5) { const x = o.x * c, y = o.y * c; g.fillStyle = '#e6dcc2'; g.beginPath(); g.arc(x, y, c * 0.13, 0, TAU); g.fill(); g.fillStyle = '#2a2420'; g.beginPath(); g.arc(x - c * 0.045, y - c * 0.01, c * 0.03, 0, TAU); g.arc(x + c * 0.045, y - c * 0.01, c * 0.03, 0, TAU); g.fill(); }
      g.restore();
    } },
    moedas: { z: 1, f(g, o, c, rnd) { g.save(); for (let k = 0, n = Math.round(10 + (o.r || 1) * 12); k < n; k++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * (o.r || 1), x = (o.x + Math.cos(a) * d) * c, y = (o.y + Math.sin(a) * d) * c; g.fillStyle = rnd() < 0.8 ? '#e6b84a' : '#cfd4dc'; g.beginPath(); g.ellipse(x, y, c * 0.06, c * 0.045, rnd() * 3, 0, TAU); g.fill(); g.strokeStyle = 'rgba(80,50,10,0.6)'; g.lineWidth = 1; g.stroke(); } g.restore(); } },
    teia: { z: 3, f(g, o, c) {
      const sx = o.canto === 'ne' || o.canto === 'se' ? -1 : 1, sy = o.canto === 'so' || o.canto === 'se' ? -1 : 1, x = o.x * c, y = o.y * c, R = c * 1.1;
      g.save(); g.strokeStyle = 'rgba(225,225,230,0.35)'; g.lineWidth = Math.max(1, c * 0.015);
      for (let k = 0; k <= 4; k++) { const a = (k / 4) * Math.PI / 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + sx * Math.cos(a) * R, y + sy * Math.sin(a) * R); g.stroke(); }
      for (const f of [0.3, 0.55, 0.8]) { g.beginPath(); for (let k = 0; k <= 4; k++) { const a = (k / 4) * Math.PI / 2, px = x + sx * Math.cos(a) * R * f, py = y + sy * Math.sin(a) * R * f; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
      g.restore();
    } },
    correntes: { z: 2, f(g, o, c) {
      g.save(); g.strokeStyle = '#55575c'; g.lineWidth = Math.max(1, c * 0.04);
      const ux = o.lado === 'n' || o.lado === 's' ? 1 : 0, uy = 1 - ux, dx = o.lado === 'o' ? 1 : o.lado === 'l' ? -1 : 0, dy = o.lado === 'n' ? 1 : o.lado === 's' ? -1 : 0;
      for (const s of [-0.35, 0.35]) { const x0 = o.x + ux * s, y0 = o.y + uy * s; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse((x0 + dx * (0.1 + k * 0.12)) * c, (y0 + dy * (0.1 + k * 0.12)) * c, c * 0.05, c * 0.035, k % 2 ? 0 : Math.PI / 2, 0, TAU); g.stroke(); } }
      g.restore();
    } },
    cogumelos: { z: 3, f(g, o, c, rnd) {
      // o brilho em volta e os chapeuzinhos que brilham
      g.save();
      const gr = g.createRadialGradient(o.x * c, o.y * c, 0, o.x * c, o.y * c, o.r * c);
      gr.addColorStop(0, o.cor + '55'); gr.addColorStop(1, o.cor + '00');
      g.fillStyle = gr; g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c, 0, TAU); g.fill();
      for (let k = 0; k < 7; k++) { const a = rnd() * TAU, d = rnd() * 0.7, x = (o.x + Math.cos(a) * d) * c, y = (o.y + Math.sin(a) * d) * c, s = c * (0.06 + rnd() * 0.08); g.fillStyle = o.cor; g.globalAlpha = 0.85; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); g.globalAlpha = 1; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x - s * 0.3, y - s * 0.3, s * 0.3, 0, TAU); g.fill(); }
      g.restore();
    } },
    // (lote 18) o subsolo: os cristais, a brasa nas rachaduras, a geada, as raízes e o ninho
    cristal: { z: 3, f(g, o, c, rnd) {
      g.save();
      const gr = g.createRadialGradient(o.x * c, o.y * c, 0, o.x * c, o.y * c, o.r * 2.2 * c);
      gr.addColorStop(0, o.cor + '66'); gr.addColorStop(1, o.cor + '00');
      g.fillStyle = gr; g.beginPath(); g.arc(o.x * c, o.y * c, o.r * 2.2 * c, 0, TAU); g.fill();
      for (let k = 0; k < o.n; k++) {
        const a = -Math.PI / 2 + (rnd() - 0.5) * 1.6, L = o.r * (o.grande ? 1.3 : 0.9) * (0.6 + rnd() * 0.6), w = o.r * 0.28 * (0.7 + rnd() * 0.5), bx = o.x + (rnd() - 0.5) * o.r * 0.8, by = o.y + (rnd() - 0.2) * o.r * 0.5;
        const tx = bx + Math.cos(a) * L, ty = by + Math.sin(a) * L, px = -Math.sin(a) * w, py = Math.cos(a) * w;
        g.beginPath(); g.moveTo((bx + px) * c, (by + py) * c); g.lineTo((tx + px * 0.4) * c, (ty + py * 0.4) * c); g.lineTo(tx * c, (ty - 0.08) * c); g.lineTo((tx - px * 0.4) * c, (ty - py * 0.4) * c); g.lineTo((bx - px) * c, (by - py) * c); g.closePath();
        g.fillStyle = o.cor; g.globalAlpha = 0.85; g.fill();
        g.strokeStyle = '#ffffff'; g.globalAlpha = 0.5; g.lineWidth = Math.max(1, c * 0.025); g.stroke();
      }
      g.restore();
    } },
    brasa: { z: 1, f(g, o, c, rnd) {
      g.save(); g.lineCap = 'round';
      for (let k = 0; k < 3; k++) { let x = o.x, y = o.y, a = rnd() * TAU; g.beginPath(); g.moveTo(x * c, y * c); for (let t = 0; t < 4; t++) { a += rnd() - 0.5; x += Math.cos(a) * o.r * 0.35; y += Math.sin(a) * o.r * 0.35; g.lineTo(x * c, y * c); }
        g.strokeStyle = '#ff7a2a'; g.globalAlpha = 0.85; g.lineWidth = c * 0.09; g.stroke(); g.strokeStyle = '#ffd35a'; g.lineWidth = c * 0.035; g.stroke(); }
      g.restore();
    } },
    geada: { z: 1, f(g, o, c) {
      g.save(); const gr = g.createRadialGradient(o.x * c, o.y * c, 0, o.x * c, o.y * c, o.r * c);
      gr.addColorStop(0, 'rgba(235,246,255,0.55)'); gr.addColorStop(1, 'rgba(235,246,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c, 0, TAU); g.fill(); g.restore();
    } },
    raizes: { z: 3, f(g, o, c, rnd) {
      g.save(); g.lineCap = 'round';
      for (let k = 0; k < o.n; k++) {
        let x = o.x - Math.cos(o.ang) * 0.5 + (rnd() - 0.5) * 0.8, y = o.y - Math.sin(o.ang) * 0.5 + (rnd() - 0.5) * 0.8, a = o.ang + (rnd() - 0.5) * 0.9;
        g.beginPath(); g.moveTo(x * c, y * c);
        for (let t = 0; t < 4; t++) { a += (rnd() - 0.5) * 0.8; x += Math.cos(a) * 0.35; y += Math.sin(a) * 0.35; g.lineTo(x * c, y * c); }
        g.strokeStyle = '#3a2a1a'; g.globalAlpha = 0.9; g.lineWidth = c * (0.08 + rnd() * 0.06); g.stroke();
        g.strokeStyle = '#6b5236'; g.globalAlpha = 0.6; g.lineWidth = c * 0.03; g.stroke();
      }
      g.restore();
    } },
    ninho: { z: 2, f(g, o, c, rnd) { if (typeof Paisagem !== 'undefined' && Paisagem.ninho) Paisagem.ninho(g, o, c, rnd); } },
    // ---- (lote 28) ----
    grama: { z: 0, f(g, o, c, rnd) {
      g.save(); g.globalAlpha = 0.8; g.fillStyle = '#3f5a2e'; g.fillRect(o.x * c, o.y * c, o.w * c, o.h * c);
      g.strokeStyle = '#6e8f4a'; g.globalAlpha = 0.5; g.lineWidth = Math.max(1, c * 0.03);
      for (let k = 0, n = Math.round(o.w * o.h * 6); k < n; k++) { const x = o.x + rnd() * o.w, y = o.y + rnd() * o.h; g.beginPath(); g.moveTo(x * c, y * c); g.lineTo((x + (rnd() - 0.5) * 0.15) * c, (y - 0.18) * c); g.stroke(); }
      g.restore();
    } },
    canal: { z: 0, f(g, o, c) {
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      const tr = () => { g.beginPath(); o.pts.forEach(([x, y], k) => (k ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); };
      g.strokeStyle = '#1d2a22'; g.lineWidth = c * 0.62; tr(); g.stroke();
      g.strokeStyle = '#33473a'; g.lineWidth = c * 0.42; tr(); g.stroke();
      g.strokeStyle = 'rgba(160,190,150,0.25)'; g.lineWidth = Math.max(1, c * 0.05); g.setLineDash([c * 0.3, c * 0.5]); tr(); g.stroke();
      g.restore();
    } },
    grade: { z: 1, f(g, o, c) {
      const X = o.x * c, Y = o.y * c, R = c * 0.36;
      g.save();
      if (o.luz) { const gr = g.createRadialGradient(X, Y, 0, X, Y, c * 1.4); gr.addColorStop(0, 'rgba(200,215,230,0.35)'); gr.addColorStop(1, 'rgba(200,215,230,0)'); g.fillStyle = gr; g.beginPath(); g.arc(X, Y, c * 1.4, 0, TAU); g.fill(); }
      g.fillStyle = '#0d0f0e'; g.fillRect(X - R, Y - R, R * 2, R * 2);
      g.strokeStyle = '#5a5e5c'; g.lineWidth = Math.max(1, c * 0.06); g.strokeRect(X - R, Y - R, R * 2, R * 2);
      g.lineWidth = Math.max(1, c * 0.04); g.beginPath(); for (let k = 1; k < 4; k++) { g.moveTo(X - R + (k * R) / 2, Y - R); g.lineTo(X - R + (k * R) / 2, Y + R); } g.stroke();
      g.restore();
    } },
    frascos: { z: 2, f(g, o, c, rnd) {
      g.save();
      for (let k = 0; k < 4; k++) {
        const x = (o.x + (rnd() - 0.5) * 0.8) * c, y = (o.y + (rnd() - 0.5) * 0.6) * c, rr = c * (0.08 + rnd() * 0.06);
        const gr = g.createRadialGradient(x, y, 0, x, y, rr * 3); gr.addColorStop(0, o.cor + '55'); gr.addColorStop(1, o.cor + '00'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr * 3, 0, TAU); g.fill();
        g.fillStyle = o.cor; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); g.strokeStyle = 'rgba(230,240,255,0.7)'; g.lineWidth = Math.max(1, c * 0.02); g.stroke();
      }
      g.restore();
    } },
    estrelas: { z: 1, f(g, o, c, rnd) {
      g.save(); g.strokeStyle = 'rgba(170,190,255,0.55)'; g.fillStyle = 'rgba(220,230,255,0.9)'; g.lineWidth = Math.max(1, c * 0.04);
      g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c, 0, TAU); g.stroke();
      const pts = [];
      for (let k = 0; k < 14; k++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * o.r * 0.9; pts.push([o.x + Math.cos(a) * d, o.y + Math.sin(a) * d]); }
      g.globalAlpha = 0.5; g.beginPath(); for (let k = 1; k < pts.length; k += 2) { g.moveTo(pts[k - 1][0] * c, pts[k - 1][1] * c); g.lineTo(pts[k][0] * c, pts[k][1] * c); } g.stroke();
      g.globalAlpha = 1; for (const [x, y] of pts) { g.beginPath(); g.arc(x * c, y * c, Math.max(1, c * 0.05), 0, TAU); g.fill(); }
      g.restore();
    } },
    tanque: { z: 2, f(g, o, c, rnd) {
      g.save();
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect((o.x + 0.1) * c, (o.y + 0.12) * c, o.w * c, o.h * c);
      g.fillStyle = o.cor + '99'; g.fillRect(o.x * c, o.y * c, o.w * c, o.h * c);
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc((o.x + 0.2 + rnd() * (o.w - 0.4)) * c, (o.y + 0.2 + rnd() * (o.h - 0.4)) * c, Math.max(1, c * (0.03 + rnd() * 0.04)), 0, TAU); g.fill(); }
      g.strokeStyle = '#cfe6f0'; g.lineWidth = Math.max(1.5, c * 0.07); g.strokeRect(o.x * c, o.y * c, o.w * c, o.h * c);
      g.strokeStyle = '#4a5658'; g.lineWidth = Math.max(1, c * 0.03); g.strokeRect((o.x + 0.06) * c, (o.y + 0.06) * c, (o.w - 0.12) * c, (o.h - 0.12) * c);
      g.restore();
    } },
    anelTorre: { z: 3, f(g, o, c, rnd, p) {
      // por fora da torre, o céu da noite; a parede redonda de pedra
      const X = o.x * c, Y = o.y * c, R = (o.r + 0.55) * c;
      g.save();
      g.beginPath(); g.rect(0, 0, p.W * c, p.H * c); g.arc(X, Y, R, 0, TAU, true);
      g.fillStyle = '#0a0d18'; g.fill('evenodd');
      g.clip('evenodd');
      for (let k = 0, n = Math.round(p.W * p.H * 0.25); k < n; k++) { g.fillStyle = rnd() < 0.8 ? 'rgba(220,230,255,0.75)' : 'rgba(255,230,180,0.8)'; g.beginPath(); g.arc(rnd() * p.W * c, rnd() * p.H * c, Math.max(0.6, c * 0.03 * rnd() + 0.4), 0, TAU); g.fill(); }
      g.restore();
      g.save();
      g.strokeStyle = '#57526a'; g.lineWidth = c * 0.9; g.beginPath(); g.arc(X, Y, R, 0, TAU); g.stroke();
      g.strokeStyle = '#3a3646'; g.lineWidth = Math.max(1, c * 0.05); g.setLineDash([c * 0.5, c * 0.08]);
      g.beginPath(); g.arc(X, Y, R, 0, TAU); g.stroke(); g.setLineDash([]);
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = Math.max(1, c * 0.06); for (const d of [-0.45, 0.45]) { g.beginPath(); g.arc(X, Y, R + d * c, 0, TAU); g.stroke(); }
      g.restore();
    } },
    colunaCaida: { z: 2, f(g, o, c, rnd) {
      g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(-c * 0.75 + 3, -c * 0.2 + 3, c * 1.5, c * 0.4);
      const gr = g.createLinearGradient(0, -c * 0.2, 0, c * 0.2); gr.addColorStop(0, '#a49e93'); gr.addColorStop(1, '#55514b');
      g.fillStyle = gr; g.fillRect(-c * 0.75, -c * 0.2, c * 1.5, c * 0.4);
      g.strokeStyle = '#2f2c28'; g.lineWidth = Math.max(1, c * 0.03); g.strokeRect(-c * 0.75, -c * 0.2, c * 1.5, c * 0.4);
      g.beginPath(); g.moveTo(-c * 0.1, -c * 0.2); g.lineTo(c * 0.05, c * 0.2); g.moveTo(c * 0.35, -c * 0.2); g.lineTo(c * 0.28, c * 0.2); g.stroke();
      g.restore();
    } },
    garras: { z: 2, f(g, o, c) {
      g.save(); g.translate(o.x * c, o.y * c); g.rotate((o.ang || 0) + Math.PI / 2);
      g.strokeStyle = 'rgba(15,10,8,0.8)'; g.lineWidth = Math.max(1, c * 0.05); g.lineCap = 'round';
      for (const d of [-0.16, 0, 0.16]) { g.beginPath(); g.moveTo((d - 0.06) * c, -c * 0.3); g.lineTo((d + 0.06) * c, c * 0.3); g.stroke(); }
      g.restore();
    } },
    alga: { z: 1, f(g, o, c, rnd) {
      g.save();
      for (let k = 0; k < 8; k++) { const a = rnd() * TAU, d = o.r * (0.7 + rnd() * 0.35), x = (o.x + Math.cos(a) * d) * c, y = (o.y + Math.sin(a) * d) * c, rr = c * (0.12 + rnd() * 0.14); const gr = g.createRadialGradient(x, y, 0, x, y, rr * 2.2); gr.addColorStop(0, 'rgba(127,233,208,0.5)'); gr.addColorStop(1, 'rgba(127,233,208,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr * 2.2, 0, TAU); g.fill(); g.fillStyle = '#2f6a5a'; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
      g.restore();
    } },
    rombo: { z: 3, f(g, o, c, rnd) {
      // as tábuas quebradas do casco, com o mar escuro aparecendo
      const X = o.x * c, Y = o.y * c;
      g.save(); g.fillStyle = '#071014'; g.beginPath();
      for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU, d = c * (0.35 + rnd() * 0.25); k ? g.lineTo(X + Math.cos(a) * d, Y + Math.sin(a) * d * 0.7) : g.moveTo(X + Math.cos(a) * d, Y + Math.sin(a) * d * 0.7); }
      g.closePath(); g.fill();
      g.strokeStyle = '#6b4c32'; g.lineWidth = Math.max(1, c * 0.06); g.lineCap = 'round';
      for (let k = 0; k < 4; k++) { const a = rnd() * TAU; g.beginPath(); g.moveTo(X + Math.cos(a) * c * 0.2, Y + Math.sin(a) * c * 0.2); g.lineTo(X + Math.cos(a) * c * 0.6, Y + Math.sin(a) * c * 0.5); g.stroke(); }
      g.restore();
    } },
    corda: { z: 2, f(g, o, c) {
      g.save(); g.strokeStyle = '#a08a5c'; g.lineWidth = Math.max(1, c * 0.07);
      for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(o.x * c, o.y * c, (o.r - k * 0.18) * c, 0, TAU); g.stroke(); }
      g.restore();
    } },
    mapa: { z: 3, f(g, o, c) {
      g.save(); g.translate(o.x * c, o.y * c); g.rotate(0.15);
      g.fillStyle = '#d9c9a0'; g.fillRect(-c * 0.45, -c * 0.32, c * 0.9, c * 0.64);
      g.strokeStyle = '#8a6a3a'; g.lineWidth = Math.max(1, c * 0.03); g.strokeRect(-c * 0.45, -c * 0.32, c * 0.9, c * 0.64);
      g.beginPath(); g.moveTo(-c * 0.3, c * 0.1); g.bezierCurveTo(-c * 0.1, -c * 0.2, c * 0.1, c * 0.2, c * 0.3, -c * 0.1); g.stroke();
      g.restore();
    } },
    // (lote 18) as arenas: a arquibancada em volta da arena, o círculo das runas, as ameias da torre, as pedras de pé e a
    // mata em volta do círculo
    arquibancada: { z: 1, f(g, o, c, rnd) {
      g.save();
      for (let k = 0; k < 6; k++) {
        const rx = (o.rx + 0.6 + k * 0.75) * c, ry = (o.ry + 0.6 + k * 0.75) * c;
        g.strokeStyle = k % 2 ? '#7a6e60' : '#6a5f52'; g.lineWidth = c * 0.62; g.beginPath(); g.ellipse(o.cx * c, o.cy * c, rx, ry, 0, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.ellipse(o.cx * c, o.cy * c, rx + c * 0.3, ry + c * 0.3, 0, 0, TAU); g.stroke();
        // o público (pontinhos de cor)
        const n = Math.round((rx + ry) / c * 2.2);
        for (let q = 0; q < n; q++) { if (rnd() < 0.35) continue; const an = rnd() * TAU; g.fillStyle = ['#8f3d4a', '#3d6a8f', '#c7955a', '#6f8f3a', '#d6ccb8'][Math.floor(rnd() * 5)]; g.globalAlpha = 0.8; g.beginPath(); g.arc(o.cx * c + Math.cos(an) * rx, o.cy * c + Math.sin(an) * ry, c * 0.12, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }
      g.restore();
    } },
    circuloRunico: { z: 1, f(g, o, c) {
      g.save(); g.strokeStyle = o.cor || '#8a1f2a'; g.globalAlpha = 0.75; g.lineWidth = c * 0.12;
      g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c, 0, TAU); g.stroke();
      g.lineWidth = c * 0.06; g.beginPath(); g.arc(o.x * c, o.y * c, o.r * 0.82 * c, 0, TAU); g.stroke();
      g.beginPath(); for (let k = 0; k <= 5; k++) { const an = -Math.PI / 2 + (k * 2 / 5) * TAU, x = o.x + Math.cos(an) * o.r * 0.82, y = o.y + Math.sin(an) * o.r * 0.82; k ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c); } g.stroke();
      g.restore();
    } },
    ameias: { z: 3, f(g, o, c) {
      g.save();
      const n = 32;
      for (let k = 0; k < n; k++) {
        const an = (k + 0.5) / n * TAU; if (an > o.ab[0] - 0.15 && an < o.ab[1] + 0.05) continue;
        const x = o.cx + Math.cos(an) * o.r, y = o.cy + Math.sin(an) * o.r;
        g.save(); g.translate(x * c, y * c); g.rotate(an);
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(-c * 0.2 + c * 0.06, -c * 0.32 + c * 0.06, c * 0.4, c * 0.64);
        g.fillStyle = k % 2 ? '#8b8780' : '#77736d'; g.fillRect(-c * 0.2, -c * 0.32, c * 0.4, c * 0.64);
        g.strokeStyle = '#3f3c38'; g.lineWidth = Math.max(1, c * 0.04); g.strokeRect(-c * 0.2, -c * 0.32, c * 0.4, c * 0.64);
        g.restore();
      }
      g.restore();
    } },
    menir: { z: 2, f(g, o, c, rnd) {
      g.save();
      const x = o.x * c, y = o.y * c, rr = o.r * c;
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(x + rr * 0.3, y + rr * 0.35, rr * 1.05, rr * 0.8, 0, 0, TAU); g.fill();
      const gr = g.createRadialGradient(x - rr * 0.3, y - rr * 0.3, rr * 0.1, x, y, rr * 1.1);
      gr.addColorStop(0, o.altar ? '#b8b2a6' : '#a7a196'); gr.addColorStop(1, '#4e4a44');
      g.fillStyle = gr; g.beginPath();
      for (let k = 0; k < 7; k++) { const an = (k / 7) * TAU + (o.ang || 0), d = rr * (0.78 + rnd() * 0.3); k ? g.lineTo(x + Math.cos(an) * d, y + Math.sin(an) * d * 0.8) : g.moveTo(x + Math.cos(an) * d, y + Math.sin(an) * d * 0.8); }
      g.closePath(); g.fill();
      g.strokeStyle = '#2f2c28'; g.lineWidth = Math.max(1, c * 0.04); g.stroke();
      // as runas gastas (verde-musgo)
      g.strokeStyle = 'rgba(120,170,110,0.55)'; g.lineWidth = Math.max(1, c * 0.035);
      g.beginPath(); g.moveTo(x - rr * 0.25, y - rr * 0.2); g.lineTo(x, y + rr * 0.25); g.lineTo(x + rr * 0.25, y - rr * 0.2); g.stroke();
      g.restore();
    } },
    floresta: { z: 3, f(g, o, c, rnd, p) {
      g.save();
      for (let k = 0, n = Math.round(p.W * p.H * 0.35); k < n; k++) {
        const x = rnd() * p.W, y = rnd() * p.H;
        if (Math.hypot(x - o.cx, y - o.cy) < o.r + 0.8) continue;
        const rr = (0.9 + rnd() * 0.9) * c;
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x * c + rr * 0.2, y * c + rr * 0.25, rr, 0, TAU); g.fill();
        g.fillStyle = ['#1f3a1a', '#28461f', '#173014'][Math.floor(rnd() * 3)]; g.beginPath(); g.arc(x * c, y * c, rr, 0, TAU); g.fill();
        g.fillStyle = 'rgba(120,170,90,0.18)'; g.beginPath(); g.arc(x * c - rr * 0.3, y * c - rr * 0.3, rr * 0.45, 0, TAU); g.fill();
      }
      g.restore();
    } },
    escora: { z: 3, f(g, o, c) {
      // a escora de madeira: os dois esteios nas paredes e a viga atravessada
      g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-c * 0.1 + 2, -c * 0.62 + 3, c * 0.2, c * 1.24);
      g.fillStyle = '#6b4a2c'; g.fillRect(-c * 0.09, -c * 0.6, c * 0.18, c * 1.2);
      g.strokeStyle = '#3a2614'; g.lineWidth = Math.max(1, c * 0.03); g.strokeRect(-c * 0.09, -c * 0.6, c * 0.18, c * 1.2);
      g.fillStyle = '#4e3520'; for (const s of [-1, 1]) g.fillRect(-c * 0.12, s * c * 0.5 - c * 0.08, c * 0.24, c * 0.16);
      g.restore();
    } },
    veio: { z: 3, f(g, o, c, rnd) {
      // o minério brilhando na rocha em volta da galeria
      g.save();
      const n = o.rico ? 40 : 18;
      for (let k = 0; k < n; k++) {
        const lado = Math.floor(rnd() * 4), t = rnd();
        const x = lado < 2 ? o.x + t * o.w : lado === 2 ? o.x - 0.15 : o.x + o.w + 0.15, y = lado >= 2 ? o.y + t * o.h : lado === 0 ? o.y - 0.15 : o.y + o.h + 0.15;
        g.fillStyle = o.cor; g.globalAlpha = 0.55 + rnd() * 0.45; g.beginPath(); g.arc(x * c, y * c, c * (0.04 + rnd() * 0.07), 0, TAU); g.fill();
      }
      g.restore();
    } },
    ferramentas: { z: 2, f(g, o, c, rnd) {
      g.save(); g.lineCap = 'round';
      for (let k = 0; k < 2; k++) {
        const x = (o.x + (rnd() - 0.5)) * c, y = (o.y + (rnd() - 0.5)) * c, a = rnd() * TAU;
        g.strokeStyle = '#6b4a2c'; g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * c * 0.55, y + Math.sin(a) * c * 0.55); g.stroke();
        g.strokeStyle = '#8a8c90'; g.lineWidth = Math.max(1, c * 0.06); g.beginPath(); const hx = x + Math.cos(a) * c * 0.55, hy = y + Math.sin(a) * c * 0.55; g.moveTo(hx - Math.sin(a) * c * 0.18, hy + Math.cos(a) * c * 0.18); g.quadraticCurveTo(hx + Math.cos(a) * c * 0.08, hy + Math.sin(a) * c * 0.08, hx + Math.sin(a) * c * 0.18, hy - Math.cos(a) * c * 0.18); g.stroke();
      }
      g.restore();
    } },
    vagonete: { z: 2, f(g, o, c, rnd) {
      g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(-c * 0.45 + 2, -c * 0.32 + 3, c * 0.9, c * 0.64);
      g.fillStyle = '#4a4c50'; g.fillRect(-c * 0.45, -c * 0.32, c * 0.9, c * 0.64);
      g.fillStyle = '#6a4a2e'; g.fillRect(-c * 0.38, -c * 0.25, c * 0.76, c * 0.5);
      if (o.cheio) for (let k = 0; k < 9; k++) { g.fillStyle = ['#5e5348', '#77695a', '#e8c25a'][k % 7 === 0 ? 2 : Math.floor(rnd() * 2)]; g.beginPath(); g.arc((rnd() - 0.5) * c * 0.6, (rnd() - 0.5) * c * 0.36, c * 0.08, 0, TAU); g.fill(); }
      g.strokeStyle = '#1c1c1e'; g.lineWidth = Math.max(1, c * 0.04); g.strokeRect(-c * 0.45, -c * 0.32, c * 0.9, c * 0.64);
      g.restore();
    } },
    fogueiraApagada: { z: 1, f(g, o, c, rnd) {
      if (typeof Paisagem !== 'undefined' && Paisagem.fogueiraApagada) { Paisagem.fogueiraApagada(g, o, c, rnd); return; }
      g.save(); g.fillStyle = '#2a2420'; g.beginPath(); g.arc(o.x * c, o.y * c, c * 0.4, 0, TAU); g.fill(); g.restore();
    } },
    // ---- (lote 38) as arenas novas ----
    caixao: { z: 2, f(g, o, c) {
      // o caixão de madeira escura (mais largo nos ombros), a tampa e a placa de prata
      const deitado = o.w >= o.h, L = (deitado ? o.w : o.h) * c, E = (deitado ? o.h : o.w) * c;
      g.save(); g.translate((o.x + o.w / 2) * c, (o.y + o.h / 2) * c); if (!deitado) g.rotate(Math.PI / 2);
      const forma = (k) => { const l = L / 2 * k, e = E / 2 * k; g.beginPath(); g.moveTo(-l, -e * 0.55); g.lineTo(-l * 0.55, -e); g.lineTo(l, -e * 0.62); g.lineTo(l, e * 0.62); g.lineTo(-l * 0.55, e); g.lineTo(-l, e * 0.55); g.closePath(); };
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.save(); g.translate(c * 0.08, c * 0.1); forma(0.94); g.fill(); g.restore();
      forma(0.94); g.fillStyle = '#3a2418'; g.fill(); g.strokeStyle = '#1a0f0a'; g.lineWidth = Math.max(1, c * 0.04); g.stroke();
      forma(0.78); g.fillStyle = '#4e3222'; g.fill(); g.strokeStyle = 'rgba(120,80,50,0.5)'; g.lineWidth = Math.max(1, c * 0.025); g.stroke();
      g.strokeStyle = '#b8bcc4'; g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.moveTo(-L * 0.18, 0); g.lineTo(L * 0.18, 0); g.moveTo(-L * 0.06, -E * 0.22); g.lineTo(-L * 0.06, E * 0.22); g.stroke();
      g.restore();
    } },
    sangue: { z: 1, f(g, o, c, rnd) {
      // a poça de sangue: o vermelho escuro, as gotas em volta e o brilho
      g.save();
      g.fillStyle = '#4a0a12'; g.globalAlpha = 0.85; g.beginPath();
      for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU, d = o.r * (0.7 + rnd() * 0.35); k ? g.lineTo((o.x + Math.cos(a) * d) * c, (o.y + Math.sin(a) * d * 0.75) * c) : g.moveTo((o.x + Math.cos(a) * d) * c, (o.y + Math.sin(a) * d * 0.75) * c); }
      g.closePath(); g.fill();
      g.fillStyle = '#6e0f1c'; g.globalAlpha = 0.7; g.beginPath(); g.ellipse((o.x - o.r * 0.1) * c, (o.y - o.r * 0.08) * c, o.r * 0.55 * c, o.r * 0.38 * c, 0.2, 0, TAU); g.fill();
      for (let k = 0; k < 9; k++) { const a = rnd() * TAU, d = o.r * (1 + rnd() * 0.6); g.globalAlpha = 0.75; g.fillStyle = '#5a0b16'; g.beginPath(); g.arc((o.x + Math.cos(a) * d) * c, (o.y + Math.sin(a) * d * 0.75) * c, c * (0.04 + rnd() * 0.07), 0, TAU); g.fill(); }
      g.globalAlpha = 0.35; g.fillStyle = '#ff9aa6'; g.beginPath(); g.ellipse((o.x - o.r * 0.3) * c, (o.y - o.r * 0.25) * c, o.r * 0.18 * c, o.r * 0.06 * c, 0.3, 0, TAU); g.fill();
      g.restore();
    } },
    luar: { z: 1, f(g, o, c) {
      // a luz da lua cheia no chão da clareira
      g.save(); const gr = g.createRadialGradient(o.x * c, o.y * c, 0, o.x * c, o.y * c, o.r * c);
      gr.addColorStop(0, 'rgba(214,226,255,0.38)'); gr.addColorStop(0.65, 'rgba(190,206,255,0.16)'); gr.addColorStop(1, 'rgba(190,206,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c, 0, TAU); g.fill(); g.restore();
    } },
    portalInferno: { z: 1, f(g, o, c, rnd) {
      // o portal no chão do fosso: o poço escuro no meio, os anéis de fogo em espiral e as runas em volta
      const X = o.x * c, Y = o.y * c, R = o.r * c;
      g.save();
      const gr = g.createRadialGradient(X, Y, 0, X, Y, R * 1.25); gr.addColorStop(0, '#0a0204'); gr.addColorStop(0.55, '#3a0806'); gr.addColorStop(0.8, 'rgba(255,90,30,0.55)'); gr.addColorStop(1, 'rgba(255,90,30,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(X, Y, R * 1.25, 0, TAU); g.fill();
      g.lineCap = 'round';
      for (let k = 0; k < 3; k++) { g.strokeStyle = k % 2 ? '#ffb347' : '#ff5a1f'; g.globalAlpha = 0.75; g.lineWidth = Math.max(1, c * (0.07 - k * 0.015)); g.beginPath(); for (let t = 0; t <= 1.001; t += 0.04) { const a = t * TAU * 1.4 + k * 2.1, d = R * (0.25 + t * 0.6); t ? g.lineTo(X + Math.cos(a) * d, Y + Math.sin(a) * d) : g.moveTo(X + Math.cos(a) * d, Y + Math.sin(a) * d); } g.stroke(); }
      g.globalAlpha = 0.85; g.strokeStyle = '#c2361a'; g.lineWidth = Math.max(1, c * 0.06); g.beginPath(); g.arc(X, Y, R, 0, TAU); g.stroke();
      g.fillStyle = '#ffcf7a';
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU, x = X + Math.cos(a) * R * 1.12, y = Y + Math.sin(a) * R * 1.12; g.save(); g.translate(x, y); g.rotate(a); g.fillRect(-c * 0.05, -c * 0.11, c * 0.1, c * 0.22); g.fillRect(-c * 0.1, -c * 0.03, c * 0.2, c * 0.06); g.restore(); }
      g.restore();
    } },
    livrosAbertos: { z: 2, f(g, o, c, rnd) {
      // o livro aberto (as duas páginas e a lombada) e os outros espalhados em volta
      const X = o.x * c, Y = o.y * c, s = o.grande ? 1.4 : 1;
      g.save();
      for (let k = 0; k < (o.grande ? 2 : 3); k++) { const a = rnd() * TAU, d = c * (0.45 + rnd() * 0.35) * s; g.save(); g.translate(X + Math.cos(a) * d, Y + Math.sin(a) * d * 0.7); g.rotate(rnd() * 3); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-c * 0.16 + 2, -c * 0.11 + 2, c * 0.32, c * 0.22); g.fillStyle = ['#5a2a3a', '#2a3a5a', '#3a4a2a', '#5a4a2a'][Math.floor(rnd() * 4)]; g.fillRect(-c * 0.16, -c * 0.11, c * 0.32, c * 0.22); g.fillStyle = '#d8c9a0'; g.fillRect(-c * 0.16, c * 0.07, c * 0.32, c * 0.03); g.restore(); }
      g.translate(X, Y); g.rotate(-0.12); g.scale(s, s);
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(-c * 0.36 + 3, -c * 0.24 + 3, c * 0.72, c * 0.48);
      g.fillStyle = '#4a2418'; g.fillRect(-c * 0.38, -c * 0.26, c * 0.76, c * 0.52);
      for (const sx of [-1, 1]) { g.fillStyle = '#e8dcbc'; g.beginPath(); g.moveTo(0, -c * 0.22); g.quadraticCurveTo(sx * c * 0.18, -c * 0.26, sx * c * 0.34, -c * 0.21); g.lineTo(sx * c * 0.34, c * 0.21); g.quadraticCurveTo(sx * c * 0.18, c * 0.17, 0, c * 0.22); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(60,40,30,0.55)'; g.lineWidth = Math.max(1, c * 0.012); for (let l = 0; l < 5; l++) { const y = -c * 0.13 + l * c * 0.065; g.beginPath(); g.moveTo(sx * c * 0.05, y); g.lineTo(sx * c * 0.29, y); g.stroke(); } }
      g.strokeStyle = '#2a140c'; g.lineWidth = Math.max(1, c * 0.03); g.beginPath(); g.moveTo(0, -c * 0.22); g.lineTo(0, c * 0.22); g.stroke();
      if (o.grande) { g.strokeStyle = '#8a5cf0'; g.globalAlpha = 0.7; g.lineWidth = Math.max(1, c * 0.025); g.beginPath(); g.arc(c * 0.17, 0, c * 0.08, 0, TAU); g.stroke(); }
      g.restore();
    } },
    fole: { z: 2, f(g, o, c) {
      // o fole gigante da forja: o couro em gota, as tábuas e o bico de ferro apontando para o meio
      g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0.5);
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(c * 0.1, c * 0.12, c * 0.8, c * 0.5, 0, 0, TAU); g.fill();
      g.fillStyle = '#6a4a2c'; g.beginPath(); g.moveTo(-c * 0.8, -c * 0.45); g.quadraticCurveTo(c * 0.3, -c * 0.6, c * 0.65, 0); g.quadraticCurveTo(c * 0.3, c * 0.6, -c * 0.8, c * 0.45); g.closePath(); g.fill();
      g.strokeStyle = '#3a2614'; g.lineWidth = Math.max(1, c * 0.04); g.stroke();
      g.strokeStyle = 'rgba(30,18,10,0.55)'; g.lineWidth = Math.max(1, c * 0.03); for (const k of [-0.45, -0.1, 0.25]) { g.beginPath(); g.moveTo(k * c, -c * 0.48); g.quadraticCurveTo((k + 0.12) * c, 0, k * c, c * 0.48); g.stroke(); }
      g.fillStyle = '#4a4c50'; g.fillRect(c * 0.6, -c * 0.08, c * 0.45, c * 0.16); g.strokeStyle = '#1c1c1e'; g.strokeRect(c * 0.6, -c * 0.08, c * 0.45, c * 0.16);
      g.fillStyle = '#4e3520'; g.fillRect(-c * 1.05, -c * 0.32, c * 0.3, c * 0.12); g.fillRect(-c * 1.05, c * 0.2, c * 0.3, c * 0.12);
      g.restore();
    } },
    mastro: { z: 3, f(g, o, c) {
      // o mastro visto de cima: a base, a verga atravessada no convés com a vela enrolada, os cabos até a amurada
      const X = o.x * c, Y = o.y * c, L = (o.larg || 6) * c;
      g.save(); g.lineCap = 'round';
      g.strokeStyle = 'rgba(200,190,160,0.45)'; g.lineWidth = Math.max(1, c * 0.025);
      for (const s of [-1, 1]) for (const d of [0.35, 0.5]) { g.beginPath(); g.moveTo(X, Y); g.lineTo(X + s * L * d, Y + c * 1.2); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(X - L / 2 + 3, Y - c * 0.16 + 4, L, c * 0.32);
      g.fillStyle = '#5a4030'; g.fillRect(X - L / 2, Y - c * 0.1, L, c * 0.2);
      g.fillStyle = '#cfc2a0'; g.globalAlpha = 0.9; g.fillRect(X - L * 0.45, Y - c * 0.2, L * 0.9, c * 0.16);
      g.globalAlpha = 1; g.strokeStyle = 'rgba(90,70,50,0.6)'; g.lineWidth = Math.max(1, c * 0.02); for (let k = 1; k < 8; k++) { const x = X - L * 0.45 + (k / 8) * L * 0.9; g.beginPath(); g.moveTo(x, Y - c * 0.2); g.lineTo(x, Y - c * 0.04); g.stroke(); }
      const gr = g.createRadialGradient(X - c * 0.1, Y - c * 0.1, 0, X, Y, c * 0.34); gr.addColorStop(0, '#8a6a48'); gr.addColorStop(1, '#3a2818');
      g.fillStyle = gr; g.beginPath(); g.arc(X, Y, c * 0.32, 0, TAU); g.fill(); g.strokeStyle = '#1e140c'; g.lineWidth = Math.max(1, c * 0.04); g.stroke();
      g.restore();
    } },
    cabana: { z: 3, f(g, o, c, rnd) {
      // a cabana da bruxa vista de cima: o telhado de palha (com o musgo e a cumeeira), o buraco da fumaça e a porta
      const x = (o.x - o.w / 2) * c, y = (o.y - o.h / 2) * c, w = o.w * c, hh = o.h * c;
      g.save();
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x + c * 0.12, y + c * 0.15, w, hh);
      g.fillStyle = '#7a6a3a'; g.fillRect(x - c * 0.1, y - c * 0.05, w + c * 0.2, hh / 2 + c * 0.05);
      g.fillStyle = '#655730'; g.fillRect(x - c * 0.1, y + hh / 2, w + c * 0.2, hh / 2 + c * 0.05);
      g.strokeStyle = 'rgba(50,40,20,0.6)'; g.lineWidth = Math.max(1, c * 0.025);
      for (let k = 0; k < Math.round(o.w * 9); k++) { const px = x + rnd() * w, py = y + rnd() * hh; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (rnd() - 0.5) * c * 0.1, py + (py < y + hh / 2 ? -1 : 1) * c * 0.22); g.stroke(); }
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(80,110,50,0.45)'; g.beginPath(); g.arc(x + rnd() * w, y + rnd() * hh, c * (0.12 + rnd() * 0.18), 0, TAU); g.fill(); }
      g.strokeStyle = '#3a2e18'; g.lineWidth = Math.max(1.5, c * 0.07); g.beginPath(); g.moveTo(x, y + hh / 2); g.lineTo(x + w, y + hh / 2); g.stroke();
      g.fillStyle = '#1a140c'; g.beginPath(); g.arc(x + w * 0.68, y + hh * 0.5, c * 0.16, 0, TAU); g.fill();
      g.fillStyle = 'rgba(160,220,140,0.35)'; g.beginPath(); g.arc(x + w * 0.68, y + hh * 0.5, c * 0.1, 0, TAU); g.fill();
      g.fillStyle = '#3a2614'; g.fillRect(x + w / 2 - c * 0.25, y + hh - c * 0.02, c * 0.5, c * 0.14);
      g.restore();
    } },
    caldeirao: { z: 2, f(g, o, c, rnd) {
      // o caldeirão de ferro com a poção verde borbulhando
      const X = o.x * c, Y = o.y * c, R = (o.r || 0.6) * c;
      g.save();
      const gl = g.createRadialGradient(X, Y, 0, X, Y, R * 2.4); gl.addColorStop(0, 'rgba(127,224,127,0.35)'); gl.addColorStop(1, 'rgba(127,224,127,0)'); g.fillStyle = gl; g.beginPath(); g.arc(X, Y, R * 2.4, 0, TAU); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(X + c * 0.08, Y + c * 0.1, R, 0, TAU); g.fill();
      g.fillStyle = '#1e1e22'; g.beginPath(); g.arc(X, Y, R, 0, TAU); g.fill(); g.strokeStyle = '#4a4c52'; g.lineWidth = Math.max(1.5, c * 0.07); g.stroke();
      g.fillStyle = '#5fc45a'; g.beginPath(); g.arc(X, Y, R * 0.74, 0, TAU); g.fill();
      for (let k = 0; k < 6; k++) { const a = rnd() * TAU, d = rnd() * R * 0.55; g.fillStyle = 'rgba(210,255,190,0.75)'; g.beginPath(); g.arc(X + Math.cos(a) * d, Y + Math.sin(a) * d, c * (0.03 + rnd() * 0.05), 0, TAU); g.fill(); }
      g.restore();
    } },
    espelho: { z: 2, f(g, o, c) {
      // o espelho: a moldura dourada e o vidro com o reflexo (no chão, de pé, com os pezinhos; na parede, colado nela)
      const L = (o.w || 1.4) * c, E = c * (o.grande ? 0.36 : o.pe ? 0.28 : 0.3);
      g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.rot || 0);
      // (o brilho frio em volta: o espelho se vê de longe no chão escuro)
      const gl = g.createRadialGradient(0, 0, 0, 0, 0, L * 0.9); gl.addColorStop(0, 'rgba(200,225,255,0.32)'); gl.addColorStop(1, 'rgba(200,225,255,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(0, 0, L * 0.9, 0, TAU); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(-L / 2 + 2, -E / 2 + 3, L, E);
      g.fillStyle = o.grande ? '#c9a24a' : '#a8873c'; g.fillRect(-L / 2, -E / 2, L, E);
      const vg = g.createLinearGradient(-L / 2, 0, L / 2, 0); vg.addColorStop(0, '#9fb8cc'); vg.addColorStop(0.45, '#e8f2fb'); vg.addColorStop(0.55, '#b9cfe0'); vg.addColorStop(1, '#7f98ad');
      g.fillStyle = vg; g.fillRect(-L / 2 + c * 0.06, -E / 2 + c * 0.05, L - c * 0.12, E - c * 0.1);
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = Math.max(1, c * 0.025); g.beginPath(); g.moveTo(-L * 0.25, -E * 0.25); g.lineTo(-L * 0.08, E * 0.25); g.stroke();
      if (o.grande) { g.fillStyle = '#e0bf6a'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * L / 2, 0, c * 0.1, 0, TAU); g.fill(); } }
      if (o.pe) { g.fillStyle = '#6a5426'; for (const sx of [-0.35, 0.35]) g.fillRect(sx * L - c * 0.05, E / 2, c * 0.1, c * 0.12); }
      g.restore();
    } },
  };

  /* A prévia: o fundo, as paredes por cima (as portas em azul, as secretas em roxo, as grades em verde), as runas
     (laranja), as escadas (a de subida, verde; a de descida, vermelha) e os objetos (pontinhos). */
  function previa(cv, p, maxW, maxH, op) {
    const cell = Math.max(5, Math.floor(Math.min((maxW || 460) / p.W, (maxH || 330) / p.H)));
    const fundo = pintar(p, cell);
    cv.width = fundo.width; cv.height = fundo.height;
    const g = cv.getContext('2d');
    g.drawImage(fundo, 0, 0);
    if ((!op || op.relevo !== false) && typeof Estilos !== 'undefined') Estilos.relevoNaPrevia(g, p.relevo.map(r => Object.assign({ a: 0.3 }, r)), p.formas, cell, 1.5);
    g.lineCap = 'round';
    for (const w of p.paredes) {
      if (w.k === 'wall') continue;
      g.strokeStyle = w.secret ? '#e39bff' : w.k === 'door' ? '#7fd1ff' : '#a8e08a'; g.lineWidth = Math.max(2, cell * (w.k === 'door' ? 0.24 : 0.14));
      g.beginPath(); g.moveTo(w.x1 * cell, w.y1 * cell); g.lineTo(w.x2 * cell, w.y2 * cell); g.stroke();
    }
    for (const z of p.zonas) { g.strokeStyle = '#ffb347'; g.lineWidth = Math.max(1.5, cell * 0.1); g.setLineDash([Math.max(2, cell * 0.3), Math.max(2, cell * 0.2)]); g.beginPath(); g.arc(z.x * cell, z.y * cell, z.r * cell, 0, TAU); g.stroke(); g.setLineDash([]); }
    const marca = (e, cor) => { if (!e) return; const x = (e.mi + 0.5) * cell, y = (e.mj + 0.5) * cell; g.fillStyle = cor; g.strokeStyle = '#0b0b0b'; g.lineWidth = Math.max(1.5, cell * 0.08); g.beginPath(); g.arc(x, y, cell * 0.42, 0, TAU); g.fill(); g.stroke(); };
    marca(p.sobe, '#3fbf6a'); marca(p.desce, '#d0453a');
    g.fillStyle = '#f3ead2';
    for (const o of p.objetos) { g.beginPath(); g.arc((o.x + o.s / 2) * cell, (o.y + o.s / 2) * cell, Math.max(1.5, cell * 0.15 * o.s), 0, TAU); g.fill(); }
    return { cell };
  }
  /* ================= a cena ================= */
  /* Monta a cena do nível, dentro da de cima (fora): o fundo pintado, as paredes (as portas, as secretas, as grades
     das celas), as paredes de visão (as colunas e as estalagmites grandes), os objetos, as luzes, o relevo, as runas
     (escondidas), a Saída na escada de subida (de volta para cima) e a Entrada na escada de descida (o nível de baixo).
     No breu: só o fogo das tochas, dos braseiros e das velas e o brilho dos cogumelos iluminam. */
  async function criar(p, nome, fora, op) {
    op = op || {};
    const sc = newScene(String(nome || '').trim().slice(0, 60) || nomePadrao(p));
    if (typeof op.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(op.id) && !Store.S.scenes[op.id]) sc.id = op.id;
    sc.cols = p.W; sc.rows = p.H;
    const c = sc.cell;
    sc.fog.dynamic = true; sc.fog.explored = true;
    const breu = TONES.find(t => t.id === 'breu') || TONES[0];
    sc.tone = breu.id; sc.light = breu.light;
    sc.weather = { k: '', pow: 0.6 };
    sc.bgColor = (PAL_M[p.tipo] || PAL_M.pedra).rocha[0]; sc.bg.stretch = true;
    try { const cv = pintar(p, Encontro.motor.resolucao(p.W, p.H)); const a = await Assets.fromCanvas(cv, 'bg', sc.name); sc.bg.asset = a.id; } catch (e) { console.error(e); }
    const parede = (x1, y1, x2, y2, k, extra) => { if (Math.hypot(x2 - x1, y2 - y1) < 0.05) return; sc.walls.push(Object.assign({ id: uid('wl'), k: k || 'wall', x1: x1 * c, y1: y1 * c, x2: x2 * c, y2: y2 * c, open: false, locked: false }, extra || null)); };
    for (const w of p.paredes) parede(w.x1, w.y1, w.x2, w.y2, w.k, Object.assign({}, w.secret ? { secret: true } : null, w.locked ? { locked: true } : null));
    for (const v of p.visao) parede(v[0], v[1], v[2], v[3], 'wall');
    for (const o of p.objetos) if (Props.P[o.id]) { const t = Props.novo(sc, o.id, o.x * c, o.y * c, o.s || 1, false); if (o.rot) t.rot = o.rot; sc.tokens.push(t); }
    for (const l of p.luzes) sc.lights.push({ id: uid('lz'), name: 'Luz do lugar', x: l.x * c, y: l.y * c, bright: l.bright, dim: l.dim, c: l.c, on: true, fl: false });
    if (op.relevo !== false) {
      for (const r of p.relevo) sc.shapes.push(Object.assign(Estilos.terrenoNaCena(r, c, 0, 0), { a: r.t === 'plataforma' ? 0.22 : 0.3 }));
      for (const f of p.formas) sc.shapes.push(Estilos.formaNaCena(f, c, 0, 0));
    }
    // as runas-armadilha: escondidas dos jogadores até o mestre revelar
    for (const z of p.zonas) sc.effects.push({ id: uid('fx'), fx: z.fx, k: 'circ', x: z.x * c, y: z.y * c, r: z.r || 1, w: 1, rw: 2, rh: 2, ang: 0, dir: 0, pow: 0.8, token: null, leve: !!z.leve, gm: z.gm !== false, by: null, seed: 1 + (Math.floor(Math.abs(z.x * 7.3 + z.y * 13.1) * 97) % 997), dur: 0, dur0: 0, at: null, apply: null });
    // a Saída (a escada de subida leva de volta) e a Entrada da escada de descida (o nível de baixo, quando o mestre quiser)
    if (p.sobe) { const s = Props.novo(sc, 'saida', p.sobe.mi * c, p.sobe.mj * c, 1, true); if (fora) s.cena = fora.id; sc.tokens.push(s); }
    if (p.desce) {
      const t = Props.novo(sc, 'entrada', p.desce.mi * c, p.desce.mj * c, 1, true);
      t.size = 0.75; t.x += c * 0.125; t.y += c * 0.125;
      // (lote 18: do subsolo, o nível de baixo é a masmorra — a caverna, para começar; a janela deixa escolher)
      t.gera = { t: 'masmorra', m: p.tipo === 'subsolo' ? 'caverna' : p.tipo, n: Math.min(99, p.nivel + 1), tam: p.tamanho, e: p.estilo, s: (sub(p.seed, 77) % 2147483000) + 1 };
      if (p.larg) t.gera.lc = p.larg;
      sc.tokens.push(t);
    }
    // (lote 18) os achados e os ninhos do subsolo: marcadores ocultos, com o nome do que é
    for (const m of p.marcadores || []) if (Props.P[m.id]) { const t = Props.novo(sc, m.id, m.x * c, m.y * c, 1, true); t.name = m.n; sc.tokens.push(t); }
    // (lote 18) a arena: o chefe no lugar dele (dois quadrados, dois turnos por rodada), os pontos de reforço (ocultos), a
    // entrada (a Saída, quando a arena é a sala do chefe de uma masmorra) e as fases prontas, guardadas na cena
    if (p.tipo === 'arena') {
      const a = p.arena, ch = newToken(sc, a.chefe.x * c, a.chefe.y * c, { name: CHEFE_ARENA[a.tipo] || 'O chefe', size: 2, turns: 2, color: '#8f3d4a' });
      sc.tokens.push(ch);
      // (lote 22) os pontos de reforço: cada um guarda o lacaio da fase que tem "Reforços chegam" (nasce dele ao acionar)
      const fasesOn = a.fases.map(f => Object.assign({}, f, { m: f.m.filter(x => x.on !== false) })).filter(f => f.m.length);
      const fi = fasesOn.findIndex(f => f.m.some(x => x.k === 'reforcos')), mr = fi >= 0 ? fasesOn[fi].m.find(x => x.k === 'reforcos') : null;
      a.reforcos.forEach((r, i) => {
        const id = Props.P.reforco ? 'reforco' : 'emboscada';
        if (!Props.P[id]) return;
        const t = Props.novo(sc, id, (r[0] - 0.5) * c, (r[1] - 0.5) * c, 1, true);
        t.name = 'Reforços (' + (fi >= 0 ? fasesOn[fi].nome.toLowerCase() : 'fase 2') + ') ' + (i + 1);
        if (id === 'reforco' && mr) t.ref = [{ id: uid('rg'), tok: { name: (mr.nome || 'Lacaio') + ' ' + (i + 1), color: '#b87c7c', size: 1, shape: 'circ', bars: barDefaults(), barVis: 'bar', conds: [], cinfo: {}, auras: [], showName: true }, n: 1, quando: { k: 'fase', v: fi } }];
        sc.tokens.push(t);
      });
      if (a.entrada) {
        const id = fora ? 'saida' : 'chegada';
        if (Props.P[id]) { const t = Props.novo(sc, id, (a.entrada.x - 0.5) * c, (a.entrada.y - 0.5) * c, 1, true); if (fora) t.cena = fora.id; sc.tokens.push(t); }
      }
      sc.fases = JSON.parse(JSON.stringify(a.fases.map(f => Object.assign({}, f, { m: f.m.filter(x => x.on !== false) })).filter(f => f.m.length)));
      sc.light = 'penumbra'; sc.tone = 'noite';
      if (a.tipo === 'coliseu' || a.tipo === 'circulo' || a.tipo === 'topo') { sc.light = 'claro'; sc.tone = 'entardecer'; }
    }
    normalizeScene(sc);
    Store.addScene(sc); Persist.scene(sc.id); Persist.meta();
    if (fora) { UI.porNaFamilia(sc.id, fora.id); UI.herdarCampanha(sc.id, fora.id); }
    return sc;
  }

  /* ================= a janela ================= */
  const novaSemente = () => 1 + Math.floor(Math.random() * 2147483000);
  let aberta = null;                                       // (a janela aberta, para os testes: as escolhas e o plano)
  const NOTA = {
    pedra: 'Salas e corredores retos, com as portas (algumas trancadas), as celas com as grades, a sala do trono ou o salão das colunas, a guarda, o arsenal, o depósito, a biblioteca, o altar, o poço e o tesouro.',
    caverna: 'Os túneis tortos ligando as câmaras, o lago de baixo da terra, os cogumelos que brilham, as estalagmites (as grandes tapam a visão) e o abismo, com a ponte de pedra.',
    ossuario: 'As galerias estreitas cheias de nichos com ossos, as câmaras das famílias com os sarcófagos, os ossários e os túneis desabados.',
    culto: 'Um templo escondido no meio dos mortos: o círculo de invocação, o ídolo, as velas, a sala dos sacrifícios e as celas dos prisioneiros.',
    inundada: 'A água tomou as partes de baixo: salas alagadas (a água corre), a cisterna velha, os nichos acima da água.',
    nobre: 'O jazigo do senhor no estrado, as câmaras das famílias com os sarcófagos, a galeria das estátuas e os portões de ferro entre as câmaras.',
    porao: 'A adega com os barris, o depósito, o esconderijo (a cama, o baú, o lampião) e os cantos com as caixas.',
    cisterna: 'A cisterna funda, os canais de água, as junções com as grades e o ninho dos ratos.',
    calabouco: 'As celas com as grades, a guarda perto da escada, a sala de tortura, o arsenal e o depósito.',
    cripta: 'Os corredores estreitos com os nichos dos mortos, as salas dos sarcófagos, o ossário, a capela e o jazigo do senhor no estrado, entre os braseiros.',
    mina: 'O túnel dos trilhos com os vagonetes, as escoras, as galerias com os veios, os túneis desabados, o acampamento abandonado e o poço de descida.',
    templo: 'A nave com o altar no estrado, as colunas e os bancos; o claustro com o poço, as capelas, a sacristia, os dormitórios e a biblioteca. Muitos arcos, poucas portas trancadas.',
    esgoto: 'Os corredores com o canal de água suja no meio, a cisterna funda, as junções com as grades, o ninho dos ratos e o esconderijo dos ladrões. A luz é a das grades da rua.',
    torre: 'A torre redonda, por dentro: o círculo de invocação com as velas, a biblioteca, a sala de alquimia, o observatório com o mapa das estrelas e o quarto do mago. Por fora, o céu.',
    laboratorio: 'As bancadas com os frascos, as jaulas, os tanques de vidro com o líquido que brilha, o caldeirão, o incinerador, a biblioteca e o depósito. Muitas portas trancadas.',
    fortaleza: 'Salas grandes e corredores retos: o trono anão entre as colunas, as forjas com as bigornas, os quartéis, a cervejaria, o arsenal, a guarda e o tesouro.',
    ruinas: 'As paredes caídas abrindo passagens, as colunas tombadas, o jardim que tomou as salas, a fonte seca, o musgo e as raízes, e os cristais que ainda brilham.',
    covil: 'Os túneis tortos da caverna até a câmara do ninho, com os ovos, as moedas e os ossos; os ninhos menores, as carcaças e as marcas de garra.',
    navio: 'O casco deitado no fundo: o corredor do meio, os compartimentos dos dois lados (porão, beliches, cozinha, paiol, arsenal, enfermaria), a cabine do capitão na popa, a água que entrou e os rombos.',
  };
  /* Abre a janela pelo marcador: a Entrada da escada que desce (já sabe o tipo, o nível e o tamanho) ou uma Entrada
     posta à mão (o nível 1, com as últimas escolhas). */
  function abrir(t) {
    const fora = Store.scene();
    if (!isGM() || !t || !fora) return;
    const K = UI.kit, { field, seg, btn, note } = K, g0 = t.gera && t.gera.t === 'masmorra' ? t.gera : null, o = App.opt;
    const st = {
      tipo: g0 && TODOS.some(x => x[0] === g0.m) ? g0.m : TIPOS.some(x => x[0] === o.masTipo) ? o.masTipo : 'pedra',
      larg: g0 && g0.lc ? largDe(g0.lc) : largEscolhida(o.masLarg),
      tamanho: g0 && TAMANHOS[g0.tam] ? g0.tam : TAMANHOS[o.masTam] ? o.masTam : 'medio',
      nivel: g0 ? g0.n : 1, estilo: Estilos.valido(g0 ? g0.e : o.genEstilo), seed: g0 ? g0.s : novaSemente(),
      segredos: o.masSeg !== false, descida: o.masDesce !== false, relevo: o.genRelevo !== false, chefe: false,
    };
    let plano = null, nomeMexido = false;
    const cv = h('canvas', { class: 'ger-cv', id: 'mas-prev', width: 460, height: 330, 'aria-label': 'Prévia do nível' });
    const resumoEl = h('p', { class: 'note', id: 'mas-resumo', role: 'status' }), ctl = h('div', { class: 'ger-op' }), nota = note('');
    const inNome = h('input', { id: 'mas-nome', class: 'in', type: 'text', maxlength: 60, autocomplete: 'off', 'aria-label': 'Nome da cena', oninput: () => { nomeMexido = true; } });
    const refazer = () => {
      // (lote 18) o último nível: a sala do chefe (a arena que combina com o tipo), com a Saída de volta na entrada
      plano = st.chefe ? gerar({ tipo: 'arena', arena: ARENA_DO_TIPO[st.tipo] || 'trono', tamanho: st.tamanho === 'grande' ? 'grande' : st.tamanho === 'pequeno' ? 'pequeno' : 'medio', estilo: st.estilo, seed: st.seed })
        : gerar({ tipo: st.tipo, tamanho: st.tamanho, nivel: st.nivel, estilo: st.estilo, seed: st.seed, segredos: st.segredos, descida: st.descida, larg: st.larg || largPadrao(st.tipo) });
      try { previa(cv, plano, 460, 330, { relevo: st.relevo }); } catch (e) { console.error(e); }
      resumoEl.textContent = resumo(plano);
      if (!nomeMexido) inNome.value = st.chefe ? NOME_ARENA[plano.arena.tipo] : nomePadrao(plano);
      if (st.chefe) { nota.textContent = 'A sala do chefe: ' + (NOME_ARENA[plano.arena.tipo] || '').toLowerCase() + ', com o chefe no lugar dele, os pontos de reforço escondidos e as fases prontas (você aciona na aba Cena, com prévia e Desfazer). A Saída, na entrada, leva de volta. Nada sai escrito.'; return; }
      nota.textContent = NOTA[st.tipo] + ' Sai uma cena nova, dentro desta, no breu (só o fogo e os cogumelos iluminam), com a Saída na escada de subida levando de volta' + (st.descida ? ' e, na escada de descida, a Entrada do nível ' + (st.nivel + 1) + ' (dois cliques nela geram o nível de baixo quando você quiser)' : '') + (st.segredos ? '. As portas secretas e as runas-armadilha ficam escondidas dos jogadores até você revelar' : '') + '. O marcador fica ligado à cena nova. Nada sai escrito.';
    };
    const lembrar = () => { o.masTipo = st.tipo; o.masTam = st.tamanho; o.masSeg = st.segredos; o.masDesce = st.descida; o.masLarg = st.larg; };
    const pintarC = () => ctl.replaceChildren(...[
      field('Tipo', seg('mas-tipo', st.tipo, TODOS.map(([k, n]) => [k, n, null, NOTA[k]]), v => { st.tipo = v; lembrar(); pintarC(); refazer(); }), 'stack'),
      st.chefe ? null : field('Largura dos corredores', seg('mas-larg', st.larg || largPadrao(st.tipo), LARGURAS.map(([k, n]) => [k, n]), v => { st.larg = v; lembrar(); pintarC(); refazer(); }), 'stack'),
      field('Tamanho', seg('mas-tam', st.tamanho, Object.keys(TAMANHOS).map(k => [k, TAMANHOS[k].n, null, `${TAMANHOS[k].W} × ${TAMANHOS[k].H} quadrados`]), v => { st.tamanho = v; lembrar(); pintarC(); refazer(); }), 'stack'),
      K.toggle('mas-chefe', st.chefe, v => { st.chefe = v; nomeMexido = false; pintarC(); refazer(); }, 'O último nível: a sala do chefe (uma arena com as fases)'),
      st.chefe ? null : K.toggle('mas-seg', st.segredos, v => { st.segredos = v; lembrar(); pintarC(); refazer(); }, 'Com segredos (as portas secretas e as runas-armadilha, escondidas dos jogadores)'),
      st.chefe ? null : K.toggle('mas-desce', st.descida, v => { st.descida = v; lembrar(); pintarC(); refazer(); }, 'Com a escada para o nível de baixo'),
      K.toggle('mas-relevo', st.relevo, v => { st.relevo = v; o.genRelevo = v; pintarC(); refazer(); }, 'Com relevo (os estrados, os sarcófagos, a água, o abismo)'),
      typeof Povoar !== 'undefined' ? Povoar.controles(K, () => pintarC()) : null].filter(Boolean));
    pintarC(); refazer();
    aberta = { st, get plano() { return plano; }, refazer };
    UI.modal({
      title: 'Gerar o nível ' + st.nivel, xl: true,
      body: h('div', { class: 'ger' },
        h('div', { class: 'ger-g' }, ctl, h('div', { class: 'ger-pv' }, cv, h('div', { class: 'row' }, btn('Gerar outro', () => { st.seed = novaSemente(); refazer(); }, { icon: 'reset', id: 'mas-outro', title: 'Sorteia outro nível, com as mesmas escolhas' })), resumoEl)),
        field('Nome da cena', inNome, 'stack'),
        nota),
      actions: [{ label: 'Cancelar' }, {
        label: 'Criar a cena', kind: 'primary', keep: true, run: () => {
          const b = UI.kit.card() && UI.kit.card().querySelector('.modal-a .btn.primary');
          if (b) { b.disabled = true; b.textContent = 'Criando…'; }
          const p = plano;
          criar(p, inNome.value, fora, { relevo: st.relevo }).then(sc => {
            // (lote 49) o nível povoado, com as escolhas da janela do gerador
            const pv = typeof Povoar !== 'undefined' ? Povoar.prefs() : null, txtPov = pv && pv.on ? Povoar.aplicar(sc, 'masmorra', p, pv) : '';
            UI.closeModal();
            if (Store.S.current === fora.id && Store.get('tokens', t.id)) UI.ligarObjeto(t, sc.id);
            UI.switchScene(sc.id);
            if (p.arena) { UI.toast(`"${sc.name}" criada, dentro de "${fora.name}": a sala do chefe. A Saída, na entrada, leva de volta; as fases ficam na aba Cena.`, { long: true }); return; }
            UI.toast(`"${sc.name}" criada, dentro de "${fora.name}". A Saída, na escada de subida, leva de volta` + (p.desce ? `; a Entrada da escada de descida gera o nível ${p.nivel + 1}.` : '.') + (txtPov ? ' ' + txtPov : ''), { long: true });
          }, err => { console.error(err); if (b) { b.disabled = false; b.textContent = 'Criar a cena'; } UI.toast('Não deu para criar a cena: ' + ((err && err.message) || 'falha ao guardar o fundo') + '.'); });
          return false;
        },
      }],
    });
  }
  const vivo = () => (aberta && document.getElementById(aberta.subsolo ? 'sub-prev' : 'mas-prev') ? aberta : null);

  /* (lote 18) "Gerar a caverna embaixo…": pela entrada de gruta (a da Região livre já sabe o rio e o bioma de cima) ou
     por uma Entrada posta à mão. A caverna tem o tamanho desta cena e a subida embaixo da entrada; sai uma cena nova,
     dentro desta, no breu, com a Saída levando de volta. */
  function abrirSubsolo(t) {
    const fora = Store.scene();
    if (!isGM() || !t || !fora) return;
    const K = UI.kit, { field, seg, btn, note } = K, g0 = t.gera && t.gera.t === 'subsolo' ? t.gera : {}, o = App.opt, c = fora.cell;
    const x = isFinite(g0.x) ? g0.x : (t.x + t.size * c / 2) / c, y = isFinite(g0.y) ? g0.y : (t.y + t.size * c / 2) / c;
    const rio = Array.isArray(g0.rio) && g0.rio.length >= 2 ? g0.rio : null;
    const st = {
      bioma: BIOMAS_SUB.some(b => b[0] === g0.bio) ? g0.bio : BIOMAS_SUB.some(b => b[0] === o.subBio) ? o.subBio : 'fungos',
      rio: !!rio && o.subRio !== false, achados: o.subAch !== false, descida: o.subDesce !== false, relevo: o.genRelevo !== false,
      seed: Number(g0.s) > 0 ? g0.s : novaSemente(), estilo: Estilos.valido(o.genEstilo),
    };
    const sugerido = BIOMAS_SUB.some(b => b[0] === g0.bio) ? g0.bio : null;
    let plano = null, nomeMexido = false;
    const cv = h('canvas', { class: 'ger-cv', id: 'sub-prev', width: 460, height: 330, 'aria-label': 'Prévia da caverna' });
    const resumoEl = h('p', { class: 'note', id: 'sub-resumo', role: 'status' }), ctl = h('div', { class: 'ger-op' }), nota = note('');
    const inNome = h('input', { id: 'sub-nome', class: 'in', type: 'text', maxlength: 60, autocomplete: 'off', 'aria-label': 'Nome da cena', oninput: () => { nomeMexido = true; } });
    const refazer = () => {
      plano = gerar({ tipo: 'subsolo', W: fora.cols, H: fora.rows, x, y, rio: st.rio ? rio : null, bioma: st.bioma, achados: st.achados, descida: st.descida, nivel: 1, estilo: st.estilo, seed: st.seed });
      try { previa(cv, plano, 460, 330, { relevo: st.relevo }); } catch (e) { console.error(e); }
      resumoEl.textContent = resumo(plano);
      if (!nomeMexido) inNome.value = ('Subsolo de ' + fora.name).slice(0, 60);
      nota.textContent = NOTA_SUB[st.bioma] + ' Do tamanho desta cena (' + fora.cols + ' × ' + fora.rows + '), com a subida embaixo da entrada: sai uma cena nova, dentro desta, no breu, com a Saída levando de volta' + (st.descida ? ' e a passagem escondida para o nível de baixo.' : '.');
    };
    const lembrar = () => { o.subBio = st.bioma; o.subRio = st.rio; o.subAch = st.achados; o.subDesce = st.descida; };
    const pintarC = () => ctl.replaceChildren(
      field('O bioma de baixo', seg('sub-bio', st.bioma, BIOMAS_SUB.map(([k, n]) => [k, n + (k === sugerido ? ' (de cima)' : ''), null, NOTA_SUB[k]]), v => { st.bioma = v; lembrar(); pintarC(); refazer(); }), 'stack'),
      rio ? K.toggle('sub-rio', st.rio, v => { st.rio = v; lembrar(); pintarC(); refazer(); }, 'O rio de cima vira o rio de baixo (pelo mesmo traçado)') : note('Sem rio na cena de cima (ou a entrada foi posta à mão): a caverna não tem o rio de baixo.'),
      K.toggle('sub-ach', st.achados, v => { st.achados = v; lembrar(); pintarC(); refazer(); }, 'Com um achado e um ninho (marcadores ocultos, com o nome do que é)'),
      K.toggle('sub-desce', st.descida, v => { st.descida = v; lembrar(); pintarC(); refazer(); }, 'Descer mais (uma passagem escondida para o nível de baixo)'),
      K.toggle('sub-relevo', st.relevo, v => { st.relevo = v; o.genRelevo = v; pintarC(); refazer(); }, 'Com relevo (a água e o lago)'));
    pintarC(); refazer();
    aberta = { st, get plano() { return plano; }, refazer, subsolo: true };
    UI.modal({
      title: 'Gerar a caverna embaixo', xl: true,
      body: h('div', { class: 'ger' },
        h('div', { class: 'ger-g' }, ctl, h('div', { class: 'ger-pv' }, cv, h('div', { class: 'row' }, btn('Gerar outra', () => { st.seed = novaSemente(); refazer(); }, { icon: 'reset', id: 'sub-outro', title: 'Sorteia outra caverna, com as mesmas escolhas' })), resumoEl)),
        field('Nome da cena', inNome, 'stack'),
        nota),
      actions: [{ label: 'Cancelar' }, {
        label: 'Criar a cena', kind: 'primary', keep: true, run: () => {
          const b = UI.kit.card() && UI.kit.card().querySelector('.modal-a .btn.primary');
          if (b) { b.disabled = true; b.textContent = 'Criando…'; }
          const p = plano;
          criar(p, inNome.value, fora, { relevo: st.relevo }).then(sc => {
            UI.closeModal();
            if (Store.S.current === fora.id && Store.get('tokens', t.id)) UI.ligarObjeto(t, sc.id);
            UI.switchScene(sc.id);
            UI.toast(`"${sc.name}" criada, dentro de "${fora.name}". A Saída, embaixo da entrada, leva de volta` + (p.desce ? '; a passagem escondida gera o nível de baixo.' : '.'), { long: true });
          }, err => { console.error(err); if (b) { b.disabled = false; b.textContent = 'Criar a cena'; } UI.toast('Não deu para criar a cena: ' + ((err && err.message) || 'falha ao guardar o fundo') + '.'); });
          return false;
        },
      }],
    });
  }

  /* ================= a aba Masmorra do "Gerar um lugar…" (lote 7, parte 4b-3c) =================
     O mesmo nível da janela da Entrada, sem precisar de uma Entrada: o tipo, o tamanho, o nível (o nome acompanha), a
     cena de cima ("Embaixo de": o nível nasce dentro dela, com a Saída levando de volta; com "Nenhuma", a cena sai
     solta e a Saída fica sem destino até o mestre escolher) e os segredos e a escada de descida. A masmorra não tem
     partes para travar; a hora e o clima não valem lá embaixo (sai no breu). */
  // a cena de cima escolhida, se ainda existe e o mestre a vê na lista ('' = nenhuma)
  const cenaDeCima = id => (typeof id === 'string' && id && Store.S.scenes[id] && (!Nuvem.comCampanhas() || Nuvem.naVista(id)) ? id : '');
  function padraoL() {
    const o = App.opt;
    return { tipo: TIPOS.some(x => x[0] === o.masTipo) ? o.masTipo : 'pedra', tamanho: TAMANHOS[o.masTam] ? o.masTam : 'medio', nivel: 1, segredos: o.masSeg !== false, descida: o.masDesce !== false, sob: '', larg: largEscolhida(o.masLarg) };
  }
  const lembrarL = st => { if (TIPOS.some(x => x[0] === st.tipo)) App.opt.masTipo = st.tipo; if (CATACUMBAS.includes(st.tipo)) App.opt.catTipo = st.tipo; App.opt.masTam = st.tamanho; App.opt.masSeg = st.segredos; App.opt.masDesce = st.descida; App.opt.masLarg = largEscolhida(st.larg); };
  // as cenas na ordem das famílias (as de dentro recuadas), como na lista "Leva para outra cena"
  function cenasEmFamilia() {
    const comCamp = Nuvem.comCampanhas(), vis = Store.S.order.filter(id => Store.S.scenes[id] && (!comCamp || Nuvem.naVista(id))), F = UI.familiasVistas(vis), arv = [];
    const desce = (k, n) => { if (arv.length > 2000 || n > 16) return; arv.push([k, n]); for (const f of F.filhas(k)) desce(f, n + 1); };
    F.raizes.forEach(k => desce(k, 0));
    return arv;
  }
  function controlesL(st, K, mudou, lista) {
    if (!Array.isArray(lista)) lista = null;          // (a janela do gerador passa { hex } aqui: só a aba Catacumbas passa a lista)
    const { field, seg, inNum, toggle } = K;
    const muda = (campo, v) => { st[campo] = v; lembrarL(st); mudou(true); };
    const sel = h('select', { id: 'mas-sob', class: 'in', 'aria-label': 'A cena de cima: o nível nasce dentro dela', onchange: e => { st.sob = cenaDeCima(e.target.value); e.target.blur(); mudou(false); } },
      h('option', { value: '', text: 'Nenhuma (uma cena solta)' }), ...cenasEmFamilia().map(([k, n]) => h('option', { value: k, text: '\u00a0\u00a0\u00a0'.repeat(n) + Store.S.scenes[k].name })));
    sel.value = cenaDeCima(st.sob);
    return h('div', { class: 'ger-c' },
      field(lista ? 'Jeito' : 'Tipo', seg('mas-tipo', st.tipo, (lista ? TODOS.filter(x => lista.includes(x[0])) : TIPOS.concat(TIPOS_MAIS.filter(x => x[0] === st.tipo))).map(([k, n]) => [k, n, null, NOTA[k]]), v => muda('tipo', v)), 'stack'),
      field('Largura dos corredores', seg('mas-larg', st.larg || largPadrao(st.tipo), LARGURAS.map(([k, n]) => [k, n]), v => muda('larg', v)), 'stack'),
      h('div', { class: 'ger-l' },
        field('Tamanho', seg('mas-tam', st.tamanho, Object.keys(TAMANHOS).map(k => [k, TAMANHOS[k].n, null, `${TAMANHOS[k].W} × ${TAMANHOS[k].H} quadrados`]), v => muda('tamanho', v)), 'stack'),
        field('Nível', inNum('mas-nivel', st.nivel, v => muda('nivel', clamp(Math.round(v) || 1, 1, 99)), { min: 1, max: 99, step: 1, label: 'O nível: 1 é o primeiro embaixo da superfície', title: 'O nível: 1 é o primeiro embaixo da superfície' }), 'stack')),
      field('Embaixo de', sel, 'stack'),
      toggle('mas-seg', st.segredos, v => muda('segredos', v), 'Com segredos (as portas secretas e as runas-armadilha, escondidas dos jogadores)'),
      toggle('mas-desce', st.descida, v => muda('descida', v), 'Com a escada para o nível de baixo'));
  }
  const opcoesDeL = st => ({ tipo: st.tipo, tamanho: st.tamanho, nivel: st.nivel, segredos: !!st.segredos, descida: !!st.descida, larg: st.larg || largPadrao(st.tipo) });
  function aplicarOpcoesL(st, o) {
    if (TODOS.some(x => x[0] === o.tipo)) st.tipo = o.tipo;
    if (TAMANHOS[o.tamanho]) st.tamanho = o.tamanho;
    if (o.nivel != null && Number.isFinite(Number(o.nivel))) st.nivel = clamp(Math.round(Number(o.nivel)) || 1, 1, 99);
    for (const k of ['segredos', 'descida']) if (typeof o[k] === 'boolean') st[k] = o[k];
    if (typeof o.sob === 'string') st.sob = cenaDeCima(o.sob);
    if (o.larg != null) st.larg = largEscolhida(o.larg);
    lembrarL(st);
  }
  function feitoL(sc, p) {
    const mae = UI.maeDaCena(sc.id), m = mae && Store.S.scenes[mae];
    return `"${sc.name}" criada` + (m ? `, dentro de "${m.name}": a Saída, na escada de subida, leva de volta` : ': uma cena solta — a Saída, na escada de subida, ainda não leva a lugar nenhum (escolha a cena no painel dela)') + (p.desce ? `; a Entrada da escada de descida gera o nível ${p.nivel + 1}.` : '.');
  }
  const LUGAR = { id: 'masmorra', n: 'Masmorra', padrao: padraoL, controles: controlesL, opcoesDe: opcoesDeL, aplicarOpcoes: aplicarOpcoesL,
    gerar: (st, comum) => gerar({ tipo: st.tipo, tamanho: st.tamanho, nivel: st.nivel, estilo: comum && comum.estilo, seed: comum && comum.seed, segredos: st.segredos, descida: st.descida, larg: st.larg || largPadrao(st.tipo) }),
    previa, resumo, partes: () => [], parteEm: () => null, nomeDaParte: () => '', formaDaParte: () => [], travada: () => false, alternar: (p, parte, trava) => trava,
    quantasTravadas: () => 0, baseDe: () => null, travaDe: () => null, nomePadrao,
    criar: (p, nome, ex) => { ex = ex || {}; const sob = cenaDeCima(ex.op && ex.op.sob); return criar(p, nome, sob ? Store.S.scenes[sob] : null, { relevo: ex.relevo !== false, id: ex.id }); },
    semHora: true,
    relevoTxt: 'Com relevo (os estrados, os sarcófagos, a água, o abismo)',
    dica: '"Gerar outro" sorteia outro nível, com as mesmas escolhas (a masmorra não tem partes para travar).',
    nota: 'Sai uma cena nova, no breu (só o fogo e os cogumelos iluminam): dentro da cena escolhida em "Embaixo de", com a Saída na escada de subida levando de volta — ou solta, com a Saída ainda sem destino (você escolhe a cena no painel dela). Na escada de descida, a Entrada do nível de baixo (dois cliques nela geram o próximo quando você quiser). As portas secretas e as runas-armadilha ficam escondidas dos jogadores até você revelar. Nada sai escrito.',
    feito: feitoL };
  /* (lote 49) A aba Catacumbas: o mesmo nível, com os quatro jeitos (o ossuário antigo, a catacumba de culto, a
     inundada e a cripta nobre). Embaixo de um cemitério ou de uma igreja, a Saída leva de volta. */
  const LUGAR_CAT = Object.assign({}, LUGAR, { id: 'catacumbas', n: 'Catacumbas',
    padrao: () => Object.assign(padraoL(), { tipo: CATACUMBAS.includes(App.opt.catTipo) ? App.opt.catTipo : 'ossuario' }),
    controles: (st, K, mudou) => controlesL(st, K, mudou, CATACUMBAS),
    aplicarOpcoes: (st, o) => { aplicarOpcoesL(st, o); if (!CATACUMBAS.includes(st.tipo)) st.tipo = 'ossuario'; },
    relevoTxt: 'Com relevo (os estrados, os sarcófagos, a água)',
    dica: '"Gerar outro" sorteia outras catacumbas, com as mesmas escolhas.',
    nota: 'Sai uma cena nova, no breu: dentro da cena escolhida em "Embaixo de" (o cemitério, a igreja), com a Saída na escada de subida levando de volta — ou solta. Na escada de descida, a Entrada do nível de baixo.' });
  return { LUGAR_CAT, TIPOS_MAIS, TODOS, CATACUMBAS, TIPOS, TAMANHOS, NOME, LARGURAS, PAL_M, DESENHO, BIOMAS_SUB, biomaDeBaixo, ARENAS, TAM_ARENA, NOME_ARENA, MUDANCAS, FASES_ARENA, nomeMud, CHEFE_ARENA, LACAIO_ARENA, GRUPOS_ARENA, ESPECIAIS, mudancasDe, ARENA_RETA, ARENAS_NOVAS, COM_GRADE, gerar, resumo, nomePadrao, pintar, previa, criar, abrir, abrirSubsolo, vivo, contornos, simplifica, paredesDaGrade, ROCHA, SALA, CORREDOR, AGUA, ABISMO, NICHO, PONTE, LAVA, GELO, LUGAR };
})();
