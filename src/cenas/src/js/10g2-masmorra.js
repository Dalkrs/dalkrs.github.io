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
   --------------------------------------------------------------- */
const Masmorra = (() => {
  const TIPOS = [['pedra', 'Masmorra de pedra'], ['caverna', 'Caverna'], ['cripta', 'Cripta'], ['mina', 'Mina abandonada']];
  const NOME = { pedra: 'Masmorra', caverna: 'Caverna', cripta: 'Cripta', mina: 'Mina' };
  const TAMANHOS = {
    pequeno: { n: 'Pequeno', W: 34, H: 26 },
    medio: { n: 'Médio', W: 46, H: 34 },
    grande: { n: 'Grande', W: 58, H: 42 },
  };
  const sub = (seed, k) => (((Math.imul(seed ^ 0x5bd1e995, 0x01000193 + k * 0x9e3779b1) >>> 0) ^ (k * 0x85ebca6b)) >>> 0) || (k + 1);
  // as casas da grade: a rocha, o chão das salas, o dos corredores, a água, o abismo, o nicho, a ponte
  const ROCHA = 0, SALA = 1, CORREDOR = 2, AGUA = 3, ABISMO = 4, NICHO = 5, PONTE = 6;
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
    const fs = folhas(r, W, H, op.min);
    const salas = [];
    for (const f of fs) {
      const w = Math.min(f.w - 2, ri(op.salaMin, op.salaMax)), h = Math.min(f.h - 2, ri(op.salaMin, Math.max(op.salaMin, op.salaMax - 1)));
      if (w < op.salaMin - 1 || h < op.salaMin - 1) continue;
      const x = f.x + 1 + Math.floor(r() * (f.w - 2 - w + 1)), y = f.y + 1 + Math.floor(r() * (f.h - 2 - h + 1));
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
      const proibido = (i, j) => { const k = j * W + i; return salaDe[k] >= 0 || (anel[k] && !portaLivre[k]); };
      const pts = caminho(G, [pa.fx, pa.fy], [pb.fx, pb.fy], proibido);
      if (!pts || (laco && pts.length > 26)) {
        // (sem corredor: a porta que ninguém usa sai, e a casa dela volta a ser proibida)
        for (const pt of [pa, pb]) if (!pt.usada) portaLivre[pt.fy * W + pt.fx] = 0;
        return false;
      }
      for (const [i, j] of pts) if (at(i, j) === ROCHA) pos(i, j, CORREDOR);
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

  /* A masmorra de pedra e a cripta. */
  function nivelDeSalas(C) {
    const { G, r, p, W, H } = C, cripta = p.tipo === 'cripta';
    const T = TAMANHOS[p.tamanho];
    const op = cripta ? { min: T.W > 50 ? 9 : 8, salaMin: 3, salaMax: 7, lacos: T.W > 50 ? 3 : 2 } : { min: T.W > 50 ? 11 : 10, salaMin: 4, salaMax: 9, lacos: T.W > 50 ? 3 : 2 };
    const { salas, ligacoes } = salasECorredores(G, r, op);
    // a entrada: a sala mais perto de um lado sorteado; a descida: a mais longe dela (em passos de sala)
    const lado0 = C.pick(['n', 's', 'o', 'l']), daBorda = q => (lado0 === 'n' ? q.y : lado0 === 's' ? H - q.y - q.h : lado0 === 'o' ? q.x : W - q.x - q.w);
    const entrada = salas.slice().sort((a, b) => daBorda(a) - daBorda(b))[0];
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
    // a sala principal: a maior (o trono ou o salão das colunas; na cripta, o jazigo do senhor)
    const principal = resto.filter(q => !q.papel && q.w >= 5 && q.h >= 5).sort((a, b) => area(b) - area(a))[0] || null;
    if (principal) principal.papel = cripta ? 'jazigo' : r() < 0.6 ? 'trono' : 'salao';
    if (cripta) {
      const capela = resto.filter(q => !q.papel && q.w >= 4 && q.h >= 4).sort((a, b) => area(b) - area(a))[0];
      if (capela) capela.papel = 'capela';
      const fila = C.embaralha(['ossario', 'sarcofagos', 'sarcofagos', 'nichos', 'ossario', 'nichos']);
      for (const q of resto) if (!q.papel) q.papel = q.w >= 4 && q.h >= 4 && fila.length ? fila.shift() : 'nichos';
    } else {
      // as celas: uma sala com as portas todas de um lado comprido (o corredor das grades corre por ele)
      const celas = resto.filter(q => !q.papel && Math.min(q.w, q.h) >= 5 && (q.celas = ladoDasCelas(q))).sort((a, b) => area(b) - area(a))[0];
      if (celas && r() < 0.85) celas.papel = 'celas';
      // a guarda: perto da entrada ou da sala principal
      const perto = resto.filter(q => !q.papel && (q.liga.includes(entrada.i) || (principal && q.liga.includes(principal.i))));
      if (perto.length) perto[0].papel = 'guarda';
      const fila = C.embaralha(['deposito', 'arsenal', 'biblioteca', 'altar', 'poco', 'deposito', 'vazia', 'biblioteca', 'vazia']);
      for (const q of resto) if (!q.papel) q.papel = fila.length ? fila.shift() : 'vazia';
    }
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
      if (r() < (cripta ? 0.12 : 0.22)) { pt.arco = true; continue; }
      if (r() < 0.12) pt.trancada = true;
    }
    if (p.segredos && tesouro) { const pt = tesouro.portas[0]; pt.arco = false; pt.secreta = true; pt.trancada = false; }
    // (uma porta secreta a mais num laço, quando há: um atalho que ninguém conhece)
    if (p.segredos) {
      const lacos = ligacoes.filter(lg => lg.laco && !salas[lg.a].fora && !salas[lg.b].fora && lg.pts.length > 3);
      if (lacos.length && r() < 0.7) { const lg = C.pick(lacos), pt = r() < 0.5 ? lg.pa : lg.pb; pt.arco = false; pt.secreta = true; pt.trancada = false; }
    }
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
    if (cripta) nichosDosCorredores(C);
    // as runas-armadilha (escondidas): na frente do tesouro, num cruzamento de corredores, na frente do trono/jazigo
    if (p.segredos) runas(C, tesouro, principal);
    // as tochas dos corredores (poucas: a masmorra é escura)
    tochasDosCorredores(C);
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
    },
    poco(C, q) { C.poe('poco', Math.floor(q.x + q.w / 2), Math.floor(q.y + q.h / 2)); noCanto(C, q, 'barril'); if (C.r() < 0.5) noCanto(C, q, 'jarro'); },
    vazia(C, q) {
      for (let k = 0, n = 1 + Math.floor(C.r() * 2); k < n; k++) C.pinta('entulho', { x: q.x + C.ent(0.8, q.w - 0.8), y: q.y + C.ent(0.8, q.h - 0.8), r: C.ent(0.6, 1.2) });
      if (C.r() < 0.6) C.pinta('ossos', { x: q.x + C.ent(0.8, q.w - 0.8), y: q.y + C.ent(0.8, q.h - 0.8), n: 3 });
      if (C.r() < 0.5) noCanto(C, q, 'caixote');
    },
    tesouro(C, q) {
      let n = 0;
      for (let t = 0; t < 8 && n < 3; t++) { const lado = C.pick(['n', 's', 'o', 'l']), e = naBeira(C, q, lado, 1); if (e && C.poe('bau', e[0], e[1], 1, ROT_FRENTE[OPOSTO[lado]])) n++; }
      noCanto(C, q, 'jarro'); noCanto(C, q, 'jarro');
      if (C.r() < 0.6) noCanto(C, q, 'estatua');
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
        if (e) { if (C.r() < 0.55) C.poe('pele', e[0], e[1]); else C.pinta('ossos', { x: e[0] + 0.5, y: e[1] + 0.5, n: 2 }); }
        C.pinta('correntes', { x: horiz ? (a + b) / 2 : fundo, y: horiz ? fundo : (a + b) / 2, lado: S });
        for (const [i, j] of dentro) C.ocupa(i, j, 1, 1);
        // (a frente da portinhola, do lado do corredor, fica livre)
        const fi = horiz ? pc : S === 'o' ? linha : linha - 1, fj = horiz ? (S === 'n' ? linha : linha - 1) : pc;
        if (C.livre(fi, fj)) C.ocupa(fi, fj, 1, 2);
      }
      encosta(C, q, 'tocha', 1);
      if (C.r() < 0.6) noCanto(C, q, 'mesa') || noCanto(C, q, 'banco');
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
      noCanto(C, q, 'vela');
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
    nichos(C, q) { nichosDaSala(C, q, 0.7); if (C.r() < 0.5) C.pinta('ossos', { x: q.x + q.w / 2, y: q.y + q.h / 2, n: 3 }); },
  };

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
      const larg = C.ent(0.75, 1.25);
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
    const trilho = [];
    for (let k = 1; k < pts.length; k++) {
      const [a0, b0] = XY(pts[k - 1]), [a1, b1] = XY(pts[k]);
      caixa(Math.min(a0, a1), Math.min(b0, b1), Math.abs(a1 - a0) + 2, Math.abs(b1 - b0) + 2, CORREDOR);
      trilho.push([a0 + 1, b0 + 1]);
    }
    { const [a1, b1] = XY(pts[pts.length - 1]); trilho.push([a1 + 1, b1 + 1]); }
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
    const ramos = [];
    for (const [i0, j0] of origens) {
      if (ramos.length >= nT * 1.6) break;
      for (const [dx, dy] of C.embaralha(DIRS)) {
        if (G.at(i0 + dx, j0 + dy) !== ROCHA) continue;
        const t = tunelLado(i0, j0, dx, dy, T.W > 40 ? 4 + Math.floor(r() * 10) : 3 + Math.floor(r() * 5));
        if (!t) continue;
        for (const [i, j] of t.cel) G.pos(i, j, CORREDOR);
        const [ei, ej] = t.cel[t.cel.length - 1];
        const fim = r() < 0.85 ? galeriaEm(ei + t.dx, ej + t.dy, t.dx, t.dy) : null;
        if (!fim) C.pinta('desabamento', { x: ei + 0.5, y: ej + 0.5, r: 1.1 });
        ramos.push(t);
        // (um ramo do ramo, às vezes)
        if (r() < 0.5 && t.cel.length > 4) {
          const [bi, bj] = t.cel[Math.floor(t.cel.length / 2)], pd = C.pick([[t.dy, t.dx], [-t.dy, -t.dx]]);
          const t2 = tunelLado(bi, bj, pd[0], pd[1], 3 + Math.floor(r() * 5));
          if (t2) { for (const [i, j] of t2.cel) G.pos(i, j, CORREDOR); const [fi, fj] = t2.cel[t2.cel.length - 1]; if (!(r() < 0.75 && galeriaEm(fi + t2.dx, fj + t2.dy, t2.dx, t2.dy))) C.pinta('desabamento', { x: fi + 0.5, y: fj + 0.5, r: 1 }); }
        }
        break;
      }
    }
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
  /* ================= o plano de um nível ================= */
  /* o: { tipo, tamanho, nivel, estilo, seed, segredos (portas secretas e runas), descida (a escada para o nível de
     baixo) }. Devolve o plano: a grade (em texto: 0 rocha, 1 sala, 2 corredor, 3 água, 4 abismo, 5 nicho, 6 ponte), as
     salas, as paredes (com as portas), os objetos, as luzes, o relevo, as zonas (as runas), os desenhos do fundo e as
     escadas (a de subida e a de descida). */
  function gerar(o) {
    o = o || {};
    const tipo = TIPOS.some(t => t[0] === o.tipo) ? o.tipo : 'pedra';
    const tamanho = TAMANHOS[o.tamanho] ? o.tamanho : 'medio', T = TAMANHOS[tamanho];
    const nivel = clamp(Math.round(Number(o.nivel)) || 1, 1, 99), estilo = typeof Estilos !== 'undefined' ? Estilos.valido(o.estilo) : 'comum';
    const seed = (Math.round(Number(o.seed)) >>> 0) || 1, segredos = o.segredos !== false, descida = o.descida !== false;
    let p = null;
    // (se o sorteio sair ruim — poucas salas, sem lugar para as escadas —, tenta outra vez, com outra semente derivada)
    for (let t = 0; t < 8; t++) {
      const W = T.W, H = T.H, G = nova(W, H), r = mulberry((sub(seed, 1 + t * 17) % 2147483000) + 1);
      p = { v: 1, lugar: 'masmorra', tipo, tamanho, nivel, estilo, seed, segredos, descida, W, H,
        salas: [], paredes: [], visao: [], objetos: [], luzes: [], relevo: [], formas: [], zonas: [], pintados: [], sobe: null, desce: null };
      const C = contexto(p, G, r);
      if (tipo === 'caverna') nivelDeCaverna(C); else if (tipo === 'mina') nivelDeMina(C); else nivelDeSalas(C);
      p.grade = Array.from(G.g).join('');
      p.tentativa = t;
      if (p.sobe && (!descida || p.desce) && p.salas.length >= (tipo === 'mina' && tamanho === 'pequeno' ? 2 : 3)) break;
    }
    // o relevo da água, do abismo e do poço (o contorno das casas deles)
    const { W, H } = p, g = p.grade, at = (i, j) => (i >= 0 && j >= 0 && i < W && j < H ? +g[j * W + i] : ROCHA);
    const cav = tipo === 'caverna', borda = (dentro, k) => (cav ? contornoTremido(W, H, dentro, (seed + k) % 9973) : contornos(W, H, dentro).map(l => simplifica(l, 0.12))).filter(l => l.length > 3);
    p.aguas = borda((i, j) => at(i, j) === AGUA, 5);
    p.abismos = borda((i, j) => at(i, j) === ABISMO, 9);
    for (const l of p.aguas) p.relevo.unshift({ t: 'agua', alt: -1.5, k: 'poly', pts: l });
    for (const l of p.abismos) p.relevo.unshift({ t: 'fosso', alt: -10, k: 'poly', pts: l });
    return p;
  }
  const nomePadrao = p => NOME[p.tipo] + ' — nível ' + p.nivel;
  function resumo(p) {
    const portas = p.paredes.filter(w => w.k === 'door' && !w.secret).length, secretas = p.paredes.filter(w => w.secret).length;
    const partes = [(TIPOS.find(t => t[0] === p.tipo) || TIPOS[0])[1] + ' · nível ' + p.nivel, p.W + ' × ' + p.H + ' quadrados'];
    const salas = p.salas.length;
    partes.push(p.tipo === 'caverna' ? (salas === 1 ? 'uma câmara' : salas + ' câmaras') : p.tipo === 'mina' ? (salas === 1 ? 'uma galeria' : salas + ' galerias') : salas === 1 ? 'uma sala' : salas + ' salas');
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
  };
  const tomM = (hex, f) => (typeof Estilos !== 'undefined' ? Estilos.tom(hex, f) : hex);
  function pintar(p, c) {
    const W = p.W, H = p.H, cv = document.createElement('canvas');
    cv.width = Math.round(W * c); cv.height = Math.round(H * c);
    const g = cv.getContext('2d'), rnd = mulberry((p.seed ^ 0x2f6b13a7) >>> 0 || 7), P = PAL_M[p.tipo] || PAL_M.pedra;
    const grade = p.grade, at = (i, j) => (i >= 0 && j >= 0 && i < W && j < H ? +grade[j * W + i] : ROCHA), aberto = (i, j) => at(i, j) !== ROCHA;
    const reto = p.tipo !== 'caverna';
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
    if (p.tipo === 'pedra' || p.tipo === 'cripta') {
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
      // a sujeira nos cantos e o musgo (na cripta, mais escuro)
      for (let k = 0, n = Math.round(W * H * 0.6); k < n; k++) { const x = rnd() * W, y = rnd() * H, rr = (0.3 + rnd() * 0.9) * c; g.globalAlpha = 0.06 + rnd() * 0.08; g.fillStyle = rnd() < 0.7 ? '#1a1612' : '#3f4a2c'; g.beginPath(); g.arc(x * c, y * c, rr, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
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
    if (reto && (p.tipo === 'pedra' || p.tipo === 'cripta')) {
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

  /* Os desenhos (z: 0 por baixo de tudo, dentro do chão; 1 no chão; 2 as coisas; 3 o que fica por cima). */
  const DESENHO = {
    tapete: { z: 0, f(g, o, c, rnd) { g.save(); g.fillStyle = '#6a1f22'; g.fillRect(o.x * c, o.y * c, o.w * c, o.h * c); g.strokeStyle = '#c9a24a'; g.lineWidth = Math.max(1, c * 0.06); g.strokeRect((o.x + 0.08) * c, (o.y + 0.08) * c, (o.w - 0.16) * c, (o.h - 0.16) * c); g.globalAlpha = 0.25; g.fillStyle = '#000'; for (let k = 0; k < 6; k++) g.fillRect((o.x + rnd() * o.w) * c, (o.y + rnd() * o.h) * c, c * 0.3, c * 0.2); g.restore(); } },
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
        gr.addColorStop(0, '#b3a894'); gr.addColorStop(0.5, '#7a6f60'); gr.addColorStop(1, '#3e372f');
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
    for (const z of p.zonas) sc.effects.push({ id: uid('fx'), fx: z.fx, k: 'circ', x: z.x * c, y: z.y * c, r: z.r || 1, w: 1, rw: 2, rh: 2, ang: 0, dir: 0, pow: 0.8, token: null, gm: z.gm !== false, by: null, seed: 1 + (Math.floor(Math.abs(z.x * 7.3 + z.y * 13.1) * 97) % 997), dur: 0, dur0: 0, at: null, apply: null });
    // a Saída (a escada de subida leva de volta) e a Entrada da escada de descida (o nível de baixo, quando o mestre quiser)
    if (fora && p.sobe) { const s = Props.novo(sc, 'saida', p.sobe.mi * c, p.sobe.mj * c, 1, true); s.cena = fora.id; sc.tokens.push(s); }
    if (p.desce) {
      const t = Props.novo(sc, 'entrada', p.desce.mi * c, p.desce.mj * c, 1, true);
      t.size = 0.75; t.x += c * 0.125; t.y += c * 0.125;
      t.gera = { t: 'masmorra', m: p.tipo, n: Math.min(99, p.nivel + 1), tam: p.tamanho, e: p.estilo, s: (sub(p.seed, 77) % 2147483000) + 1 };
      sc.tokens.push(t);
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
    cripta: 'Os corredores estreitos com os nichos dos mortos, as salas dos sarcófagos, o ossário, a capela e o jazigo do senhor no estrado, entre os braseiros.',
    mina: 'O túnel dos trilhos com os vagonetes, as escoras, as galerias com os veios, os túneis desabados, o acampamento abandonado e o poço de descida.',
  };
  /* Abre a janela pelo marcador: a Entrada da escada que desce (já sabe o tipo, o nível e o tamanho) ou uma Entrada
     posta à mão (o nível 1, com as últimas escolhas). */
  function abrir(t) {
    const fora = Store.scene();
    if (!isGM() || !t || !fora) return;
    const K = UI.kit, { field, seg, btn, note } = K, g0 = t.gera && t.gera.t === 'masmorra' ? t.gera : null, o = App.opt;
    const st = {
      tipo: g0 && TIPOS.some(x => x[0] === g0.m) ? g0.m : TIPOS.some(x => x[0] === o.masTipo) ? o.masTipo : 'pedra',
      tamanho: g0 && TAMANHOS[g0.tam] ? g0.tam : TAMANHOS[o.masTam] ? o.masTam : 'medio',
      nivel: g0 ? g0.n : 1, estilo: Estilos.valido(g0 ? g0.e : o.genEstilo), seed: g0 ? g0.s : novaSemente(),
      segredos: o.masSeg !== false, descida: o.masDesce !== false, relevo: o.genRelevo !== false,
    };
    let plano = null, nomeMexido = false;
    const cv = h('canvas', { class: 'ger-cv', id: 'mas-prev', width: 460, height: 330, 'aria-label': 'Prévia do nível' });
    const resumoEl = h('p', { class: 'note', id: 'mas-resumo', role: 'status' }), ctl = h('div', { class: 'ger-op' }), nota = note('');
    const inNome = h('input', { id: 'mas-nome', class: 'in', type: 'text', maxlength: 60, autocomplete: 'off', 'aria-label': 'Nome da cena', oninput: () => { nomeMexido = true; } });
    const refazer = () => {
      plano = gerar({ tipo: st.tipo, tamanho: st.tamanho, nivel: st.nivel, estilo: st.estilo, seed: st.seed, segredos: st.segredos, descida: st.descida });
      try { previa(cv, plano, 460, 330, { relevo: st.relevo }); } catch (e) { console.error(e); }
      resumoEl.textContent = resumo(plano);
      if (!nomeMexido) inNome.value = nomePadrao(plano);
      nota.textContent = NOTA[st.tipo] + ' Sai uma cena nova, dentro desta, no breu (só o fogo e os cogumelos iluminam), com a Saída na escada de subida levando de volta' + (st.descida ? ' e, na escada de descida, a Entrada do nível ' + (st.nivel + 1) + ' (dois cliques nela geram o nível de baixo quando você quiser)' : '') + (st.segredos ? '. As portas secretas e as runas-armadilha ficam escondidas dos jogadores até você revelar' : '') + '. O marcador fica ligado à cena nova. Nada sai escrito.';
    };
    const lembrar = () => { o.masTipo = st.tipo; o.masTam = st.tamanho; o.masSeg = st.segredos; o.masDesce = st.descida; };
    const pintarC = () => ctl.replaceChildren(
      field('Tipo', seg('mas-tipo', st.tipo, TIPOS.map(([k, n]) => [k, n]), v => { st.tipo = v; lembrar(); pintarC(); refazer(); }), 'stack'),
      field('Tamanho', seg('mas-tam', st.tamanho, Object.keys(TAMANHOS).map(k => [k, TAMANHOS[k].n, null, `${TAMANHOS[k].W} × ${TAMANHOS[k].H} quadrados`]), v => { st.tamanho = v; lembrar(); pintarC(); refazer(); }), 'stack'),
      K.toggle('mas-seg', st.segredos, v => { st.segredos = v; lembrar(); pintarC(); refazer(); }, 'Com segredos (as portas secretas e as runas-armadilha, escondidas dos jogadores)'),
      K.toggle('mas-desce', st.descida, v => { st.descida = v; lembrar(); pintarC(); refazer(); }, 'Com a escada para o nível de baixo'),
      K.toggle('mas-relevo', st.relevo, v => { st.relevo = v; o.genRelevo = v; pintarC(); refazer(); }, 'Com relevo (os estrados, os sarcófagos, a água, o abismo)'));
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
            UI.closeModal();
            if (Store.S.current === fora.id && Store.get('tokens', t.id)) UI.ligarObjeto(t, sc.id);
            UI.switchScene(sc.id);
            UI.toast(`"${sc.name}" criada, dentro de "${fora.name}". A Saída, na escada de subida, leva de volta` + (p.desce ? `; a Entrada da escada de descida gera o nível ${p.nivel + 1}.` : '.'), { long: true });
          }, err => { console.error(err); if (b) { b.disabled = false; b.textContent = 'Criar a cena'; } UI.toast('Não deu para criar a cena: ' + ((err && err.message) || 'falha ao guardar o fundo') + '.'); });
          return false;
        },
      }],
    });
  }
  const vivo = () => (aberta && document.getElementById('mas-prev') ? aberta : null);
  return { TIPOS, TAMANHOS, NOME, PAL_M, DESENHO, gerar, resumo, nomePadrao, pintar, previa, criar, abrir, vivo, contornos, simplifica, paredesDaGrade, ROCHA, SALA, CORREDOR, AGUA, ABISMO, NICHO, PONTE };
})();
