/* ---------------------------------------------------------------
   10f2. ENCONTRO — os encontros de viagem (lote 7, parte 4b)
   A aba Encontro da janela "Gerar um lugar…": o terreno (doze: Estrada, Floresta, Deserto, Montanha, Pântano, Neve,
   Campo, Selva, Terra corrompida, Lava, Cristais e Água) e, embaixo, as situações de cada um (quatro, e a Surpresa,
   que sorteia uma delas). O caminho (sem caminho, trilha ou estrada) passa por onde a situação pede: pela ponte, pelo
   desfiladeiro, pela beira do penhasco. Sai uma cena de batalha, com o fundo pintado e, por cima, tudo editável: o
   relevo (a água, os penhascos, os abismos, os morros, as pontes e as plataformas, com a altura), as zonas de efeito
   onde a natureza pede (a lama, o chão congelado, a lava, a correnteza, a névoa), as luzes (a lava, os cristais), as
   paredes de visão só no que é grande (as pedras grandes, os troncos grossos, os paredões, as construções), os
   objetos de cenário, as construções (a cabana aberta, com os móveis; o moinho e o celeiro fechados, com o marcador
   de Entrada) e o navio (o convés; dois cliques na escotilha geram o porão). Dois marcadores ocultos, só do mestre,
   dizem por onde o grupo chega e onde fica uma boa emboscada.
   O plano é uma conta pura, sorteada pela semente: o traçado (a água, o caminho, os penhascos e a peça do meio) tem
   o sorteio dele, e travá-lo deixa "Gerar outro" trocar só o resto (as árvores, as pedras, os objetos). Nada muda nas
   cenas que já existem.
   --------------------------------------------------------------- */
const Encontro = (() => {
  const TAU = Math.PI * 2;
  const TAMANHOS = { pequeno: { n: 'Pequeno', W: 24, H: 18 }, medio: { n: 'Médio', W: 32, H: 24 }, grande: { n: 'Grande', W: 40, H: 30 } };
  // os terrenos: o chão (a paleta), quantas árvores (por quadrado livre) e as situações
  const TERRENOS = [
    { id: 'estrada', n: 'Estrada', em: 'na estrada', pal: 'campo', dens: 0.06, sit: [['curva', 'Curva na mata'], ['carroca', 'Carroça tombada'], ['ponte', 'Ponte sobre o rio'], ['encruzilhada', 'Encruzilhada']] },
    { id: 'floresta', n: 'Floresta', em: 'na floresta', pal: 'floresta', dens: 0.15, sit: [['clareira', 'Clareira'], ['riacho', 'Riacho'], ['arvore', 'Árvore gigante caída'], ['acampamento', 'Acampamento abandonado']] },
    { id: 'deserto', n: 'Deserto', em: 'no deserto', pal: 'areia', dens: 0.015, sit: [['dunas', 'Dunas'], ['oasis', 'Oásis'], ['ossada', 'Ossada gigante'], ['canion', 'Cânion']] },
    { id: 'montanha', n: 'Montanha', em: 'na montanha', pal: 'rocha', dens: 0.03, sit: [['desfiladeiro', 'Desfiladeiro'], ['cordas', 'Ponte de corda'], ['encosta', 'Trilha na encosta'], ['plato', 'Platô de pedras']] },
    { id: 'pantano', n: 'Pântano', em: 'no pântano', pal: 'pantano', dens: 0.12, sit: [['ilhas', 'Ilhas e água rasa'], ['passarela', 'Passarela de tábuas'], ['palafita', 'Cabana na palafita'], ['raizes', 'Raízes e névoa']] },
    { id: 'neve', n: 'Neve', em: 'na neve', pal: 'neve', dens: 0.08, sit: [['lago', 'Lago congelado'], ['pinheiros', 'Pinheiros'], ['cabana', 'Cabana do caçador'], ['fenda', 'Fenda no gelo']] },
    { id: 'campo', n: 'Campo', em: 'no campo', pal: 'campo', dens: 0.025, sit: [['plantacao', 'Plantação'], ['moinho', 'Moinho e celeiro'], ['capim', 'Capim alto'], ['morro', 'Morro de pedras']] },
    { id: 'selva', n: 'Selva', em: 'na selva', pal: 'selva', dens: 0.2, sit: [['mata', 'Mata fechada'], ['cachoeira', 'Rio e cachoeira'], ['colossal', 'Árvore colossal'], ['flores', 'Flores gigantes']] },
    { id: 'corrompida', n: 'Terra corrompida', em: 'na terra corrompida', pal: 'corrompida', dens: 0.07, sit: [['mortas', 'Árvores mortas'], ['negros', 'Cristais negros'], ['lodo', 'Poças de lodo'], ['fenda', 'Fenda que brilha']] },
    { id: 'lava', n: 'Lava', em: 'na terra de lava', pal: 'basalto', dens: 0.012, sit: [['rio', 'Rio de lava'], ['ponte', 'Ponte de pedra'], ['basalto', 'Campo de basalto'], ['vulcao', 'Boca do vulcão']] },
    { id: 'cristais', n: 'Cristais', em: 'entre os cristais', pal: 'cristal', dens: 0.03, sit: [['gruta', 'Gruta de cristais'], ['campo', 'Campo de cristais'], ['geodo', 'Geodo gigante'], ['lago', 'Lago espelhado']] },
    { id: 'agua', n: 'Água', em: 'na água', pal: 'mar', dens: 0, sit: [['navio', 'Um navio'], ['abordagem', 'Abordagem'], ['barco', 'Barco no rio'], ['naufragio', 'Naufrágio']] },
  ];
  const TER = Object.fromEntries(TERRENOS.map(t => [t.id, t]));
  const CAMINHOS = [['nenhum', 'Sem caminho'], ['trilha', 'Trilha'], ['estrada', 'Estrada']];
  // o caminho que vale para o terreno: a estrada nunca fica sem; na água não há
  const camValido = (terreno, c) => (terreno === 'agua' ? 'nenhum' : terreno === 'estrada' ? (c === 'trilha' ? 'trilha' : 'estrada') : CAMINHOS.some(x => x[0] === c) ? c : 'nenhum');
  const hwDe = tipo => (tipo === 'estrada' ? 1.35 : 0.75);
  // os enfeites (objetos que dá para mover) de cada terreno
  const ENFEITES = { estrada: ['arbusto', 'pedra', 'toco', 'arbusto'], floresta: ['arbusto', 'toco', 'cogumelos', 'pedra', 'arbusto'], deserto: ['pedra', 'arbusto', 'pedra'], montanha: ['pedra', 'pedra', 'arbusto'],
    pantano: ['toco', 'cogumelos', 'arbusto'], neve: ['pedra', 'toco', 'pedra'], campo: ['arbusto', 'pedra', 'flores'], selva: ['arbusto', 'flores', 'cogumelos', 'arbusto'], corrompida: ['pedra', 'cogumelos'],
    lava: ['pedra'], cristais: ['pedra'], agua: [] };
  // o tamanho das árvores de cada espécie (o raio, em quadrados)
  const RAIO = { folhosa: [0.6, 1.15], pinheiro: [0.55, 1.0], palmeira: [0.6, 1.0], oriental: [0.6, 1.1], elfica: [0.7, 1.25], rocha: [0.5, 0.9], selva: [0.9, 1.6], acacia: [1.0, 1.6], cacto: [0.4, 0.6],
    morta: [0.8, 1.4], carbonizada: [0.6, 1.0], mangue: [0.7, 1.1], juncos: [0.35, 0.55], cristal: [0.35, 0.6], cristalNegro: [0.35, 0.6], flor: [1.2, 2.0], cogumelo: [0.5, 0.9] };
  // o sorteio de cada parte, separado (travar o traçado não muda o resto do sorteio)
  // a opacidade (leve) de cada tipo de relevo dos encontros
  const LEVE = { agua: 0.2, morro: 0.2, montanha: 0.18, fosso: 0.22, plataforma: 0.26, mata: 0.24 };
  /* a semente de cada parte do sorteio (k: qual parte), bem embaralhada: até os bits de baixo mudam de uma semente para
     outra (a Surpresa sorteia entre as quatro situações com o resto da divisão) */
  const sub = (seed, k) => { let h = ((seed >>> 0) ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) || (k + 1); };

  /* ================= a geometria (em quadrados) ================= */
  const distSeg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0; return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
  const distLinha = (pts, x, y) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, distSeg(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return pts.length === 1 ? Math.hypot(x - pts[0][0], y - pts[0][1]) : d; };
  const dentroPoli = (poli, x, y) => { let d = false; for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) { const [xi, yi] = poli[i], [xj, yj] = poli[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; };
  // uma linha macia pelos pontos (Catmull-Rom), um ponto a cada meio quadrado
  function curva(pts, passo) {
    passo = passo || 0.5;
    if (pts.length < 2) return pts.map(p => p.slice());
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / passo));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }
  // um contorno torto em volta de (cx, cy): rx × ry, n pontos, jit (o quanto entorta), girado em rot
  function blob(rnd, cx, cy, rx, ry, n, jit, rot) {
    n = n || 14; jit = jit == null ? 0.22 : jit; rot = rot || 0;
    const out = [], cs = Math.cos(rot), sn = Math.sin(rot);
    for (let k = 0; k < n; k++) { const an = (k / n) * TAU, rr = 1 - jit / 2 + rnd() * jit, x = Math.cos(an) * rx * rr, y = Math.sin(an) * ry * rr; out.push([cx + x * cs - y * sn, cy + x * sn + y * cs]); }
    return out;
  }
  const elipse = (cx, cy, rx, ry, n, rot) => blob(() => 0.5, cx, cy, rx, ry, n || 24, 0, rot || 0);
  // a faixa em volta de uma linha (meia largura hw, que pode variar por um sorteio): o polígono dos dois lados
  function faixa(pts, hw, rnd, var_) {
    const esq = [], dir = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = -Math.sin(ang), ny = Math.cos(ang);
      const h1 = hw + (rnd && var_ ? (rnd() - 0.5) * var_ : 0), h2 = hw + (rnd && var_ ? (rnd() - 0.5) * var_ : 0);
      esq.push([pts[i][0] + nx * h1, pts[i][1] + ny * h1]); dir.push([pts[i][0] - nx * h2, pts[i][1] - ny * h2]);
    }
    return esq.concat(dir.reverse());
  }
  // os lados da faixa, separados (para os paredões: o de cima e o de baixo de um cânion)
  function ladosDaFaixa(pts, hw, rnd, var_) {
    const esq = [], dir = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = -Math.sin(ang), ny = Math.cos(ang);
      const h1 = hw + (rnd && var_ ? (rnd() - 0.5) * var_ : 0), h2 = hw + (rnd && var_ ? (rnd() - 0.5) * var_ : 0);
      esq.push([pts[i][0] + nx * h1, pts[i][1] + ny * h1]); dir.push([pts[i][0] - nx * h2, pts[i][1] - ny * h2]);
    }
    return { esq, dir };
  }
  // onde duas linhas se cruzam (a primeira vez): o ponto e o sentido da primeira ali
  function cruzamento(a, b) {
    for (let i = 1; i < a.length; i++) for (let j = 1; j < b.length; j++) {
      const [x1, y1] = a[i - 1], [x2, y2] = a[i], [x3, y3] = b[j - 1], [x4, y4] = b[j];
      const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(d) < 1e-9) continue;
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d, u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1), ang: Math.atan2(y2 - y1, x2 - x1), angB: Math.atan2(y4 - y3, x4 - x3) };
    }
    return null;
  }
  const perto = (pts, x, y) => { let m = null; for (const p of pts) { const d = Math.hypot(p[0] - x, p[1] - y); if (!m || d < m.d) m = { x: p[0], y: p[1], d }; } return m; };
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  /* ================= o contexto de quem monta a situação ================= */
  /* ocupação de cada quadrado: 0 livre · 1 caminho, ponte ou passarela · 2 água · 3 obstáculo (construção, penhasco,
     pedra grande, tronco) · 4 árvore, enfeite ou objeto · 5 área da situação (clareira, plantação, gelo: sem árvores)
     · 6 relevo baixo (duna, morro, capim alto) · 7 abismo ou fenda · 8 convés de navio ou barco · 10 pedra de atravessar */
  function contexto(W, H, terreno, sit, estilo, caminho, sT, pal) {
    const rT = mulberry(sT);
    const r = (a, b) => a + rT() * (b - a), ri = (a, b) => Math.floor(r(a, b + 1)), pick = a => a[Math.floor(rT() * a.length) % a.length], sorte = p => rT() < p;
    const occ = new Uint8Array(W * H);
    const at = (i, j) => (i >= 0 && j >= 0 && i < W && j < H ? occ[j * W + i] : 9);
    const pos = (i, j, v) => { if (i >= 0 && j >= 0 && i < W && j < H) occ[j * W + i] = v; };
    const P = { W, H, terreno, sit, estilo, caminho, pal, chao: [], aguas: [], caminhos: [], massas: [], abismos: [], pintados: [], predios: [], navios: [], relevo: [], formas: [], zonas: [], luzes: [], visao: [], objetos: [],
      arvores: [], rochas: [], cobertura: [], tracado: [], marcas: {}, foco: [W / 2, H / 2], dens: null, densBase: null, esp: null, semVeg: false, aguaToda: null, juncos: 0, aguaRasa: false, cavernas: [] };
    const K = { W, H, terreno, sit, estilo, caminho, pal, P, rT, r, ri, pick, sorte, occ, at, pos, rota: null, curva };
    const pode = (v, forca) => forca || v === 0 || v === 4 || v === 6 || v === 5;
    const cx0 = (x0, x1) => [Math.max(0, Math.floor(x0)), Math.min(W - 1, Math.ceil(x1))];
    const caixa = (pts, m) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0 - m, y0 - m, x1 + m, y1 + m]; };
    K.marcaLinha = (pts, hw, v, forca) => { const [x0, y0, x1, y1] = caixa(pts, hw + 1), [i0, i1] = cx0(x0, x1), [j0, j1] = cx0(y0, y1); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (distLinha(pts, i + 0.5, j + 0.5) <= hw && pode(at(i, j), forca)) pos(i, j, v); };
    K.marcaPoli = (pts, v, forca) => { const [x0, y0, x1, y1] = caixa(pts, 1), [i0, i1] = cx0(x0, x1), [j0, j1] = cx0(y0, y1); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (dentroPoli(pts, i + 0.5, j + 0.5) && pode(at(i, j), forca)) pos(i, j, v); };
    K.marcaCirc = (x, y, rr, v, forca) => { const [i0, i1] = cx0(x - rr - 1, x + rr + 1), [j0, j1] = cx0(y - rr - 1, y + rr + 1); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(i + 0.5 - x, j + 0.5 - y) <= rr && pode(at(i, j), forca)) pos(i, j, v); };
    K.encher = v => occ.fill(v);
    K.livreCirc = (x, y, rr, ok) => { ok = ok || (v => v === 0); for (let j = Math.floor(y - rr); j <= Math.floor(y + rr); j++) for (let i = Math.floor(x - rr); i <= Math.floor(x + rr); i++) if (Math.hypot(i + 0.5 - x, j + 0.5 - y) <= rr && !ok(at(i, j))) return false; return true; };
    K.dentro = (x, y, m) => x >= (m || 0) && y >= (m || 0) && x <= W - (m || 0) && y <= H - (m || 0);
    // um lugar livre (centro de um círculo de raio rr) sorteado, longe do que já existe; ou null
    K.lugar = (rr, ok, tent, filtro) => { for (let k = 0; k < (tent || 80); k++) { const x = r(rr + 1, W - rr - 1), y = r(rr + 1, H - rr - 1); if ((!filtro || filtro(x, y)) && K.livreCirc(x, y, rr, ok)) return [x, y]; } return null; };
    K.borda = (lado, t) => (lado === 'o' ? [-1, t * H] : lado === 'l' ? [W + 1, t * H] : lado === 'n' ? [t * W, -1] : [t * W, H + 1]);
    K.foco = (x, y) => { P.foco = [x, y]; };
    K.camOuTrilha = () => (caminho === 'nenhum' ? 'trilha' : caminho);
    K.hwDe = hwDe;
    /* o caminho: a linha macia pelos pontos; o desenho para na água, no abismo e nos obstáculos (a ponte já marcada
       vira caminho, e o caminho passa por cima dela) */
    K.poeCaminho = (ctrl, tipo) => {
      tipo = tipo || caminho;
      if (tipo === 'nenhum') return null;
      const hw = hwDe(tipo), pts = curva(ctrl), pecas = [];
      let atual = [];
      for (const p of pts) {
        const v = at(Math.floor(p[0]), Math.floor(p[1]));
        if (v === 2 || v === 3 || v === 7 || v === 8 || v === 10) { if (atual.length > 1) pecas.push(atual); atual = []; } else atual.push(p);
      }
      if (atual.length > 1) pecas.push(atual);
      for (const pc of pecas) { P.caminhos.push({ pts: pc, hw, tipo }); K.marcaLinha(pc, hw + 0.25, 1); }
      P.tracado.push({ k: 'linha', pts, hw });
      if (!K.rota) { K.rota = pts; K.hwRota = hw; }
      return pts;
    };
    K.poeRio = (ctrl, hw, tipo, alt) => {
      const pts = curva(ctrl);
      P.aguas.push({ k: 'rio', pts, hw, tipo: tipo || 'agua' });
      K.marcaLinha(pts, hw + 0.3, 2, true);
      if (alt != null) P.relevo.push({ t: tipo === 'lava' ? 'fosso' : 'agua', alt, k: 'free', pts: pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1), sw: hw * 2 });
      P.tracado.push({ k: 'linha', pts, hw });
      return pts;
    };
    K.poeLago = (pts, tipo, alt, v) => {
      P.aguas.push({ k: 'lago', pts, tipo: tipo || 'agua' });
      K.marcaPoli(pts, v == null ? 2 : v, true);
      if (alt != null) P.relevo.push({ t: tipo === 'lava' ? 'fosso' : 'agua', alt, k: 'poly', pts });
      P.tracado.push({ k: 'poli', pts });
    };
    // as paredes de visão de um contorno (os lados que ficam na borda do mapa não contam)
    K.visaoPoli = pts => {
      const naBorda = ([x, y]) => x <= 0.05 || y <= 0.05 || x >= W - 0.05 || y >= H - 0.05;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((naBorda(a) && naBorda(b)) || Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05) continue;
        const ca = [clamp(a[0], 0, W), clamp(a[1], 0, H)], cb = [clamp(b[0], 0, W), clamp(b[1], 0, H)];
        if (Math.hypot(cb[0] - ca[0], cb[1] - ca[1]) > 0.05) P.visao.push([ca[0], ca[1], cb[0], cb[1]]);
      }
    };
    K.poePenhasco = (pts, alt, cores, comVisao) => {
      P.massas.push({ pts, alt: alt || 6, cores: cores || null });
      K.marcaPoli(pts, 3, true);
      P.relevo.push({ t: 'montanha', alt: alt || 6, k: 'poly', pts });
      if (comVisao !== false) K.visaoPoli(pts);
      P.tracado.push({ k: 'poli', pts });
    };
    K.poeAbismo = (pts, alt, cores) => {
      P.abismos.push({ pts, cores: cores || null });
      K.marcaPoli(pts, 7, true);
      P.relevo.push({ t: 'fosso', alt: alt || -10, k: 'poly', pts });
      P.tracado.push({ k: 'poli', pts });
    };
    // uma pedra grande: o desenho, o obstáculo, as paredes de visão em volta e o lugar de esconder (cobertura)
    K.pedraGrande = (x, y, rr, cores) => {
      P.rochas.push({ x, y, r: rr, grande: true, cores: cores || null });
      K.marcaCirc(x, y, rr * 0.85, 3, true);
      K.visaoPoli(elipse(x, y, rr * 0.78, rr * 0.68, 8));
      P.cobertura.push({ x, y, r: rr });
    };
    K.pedraGrandeLivre = (rr, cores, filtro) => { const l = K.lugar(rr + 0.6, null, 80, filtro); if (l) K.pedraGrande(l[0], l[1], rr, cores); return l; };
    // um cacho de cristais grande (com a parede de visão, o brilho e a luz)
    K.cristalGrande = (x, y, rr, cor, luz) => {
      P.pintados.push({ z: 2, k: 'cristais', x, y, r: rr, cor });
      K.marcaCirc(x, y, rr * 0.7, 3, true);
      K.visaoPoli(elipse(x, y, rr * 0.62, rr * 0.55, 6));
      P.cobertura.push({ x, y, r: rr * 0.8 });
      if (luz !== false) P.luzes.push({ x, y, bright: 1, dim: Math.round(3 + rr * 1.5), c: cor === 'negro' ? '#b06cf0' : '#8fd8ff' });
    };
    K.mancha = (pts, cores, op) => { P.chao.push({ pts, cores, op: op || null }); };
    K.pinta = (z, k, props) => { const o = Object.assign({ z, k }, props); P.pintados.push(o); return o; };
    K.zona = (fx, x, y, op) => { P.zonas.push(Object.assign({ fx, k: 'circ', x, y, r: 2 }, op || null)); };
    K.luz = (x, y, dim, cor, bright) => { P.luzes.push({ x, y, bright: bright == null ? 1 : bright, dim: dim || 4, c: cor || '#ffb35c' }); };
    K.arvore = (x, y, rr, esp, marca) => { P.arvores.push({ x, y, r: rr, esp }); if (marca !== false) K.marcaCirc(x, y, Math.max(0.5, rr * 0.5), 4); };
    // um objeto de cenário (um token): só onde cabe (nada de água, obstáculo, abismo)
    K.objeto = (id, i, j, rot, ok) => {
      const def = Props.P[id];
      if (!def) return false;
      const s = def.size || 1;
      ok = ok || (v => v === 0 || v === 5 || v === 6 || v === 1);
      for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) if (!ok(at(i + a, j + b))) return false;
      for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) if (at(i + a, j + b) !== 1) pos(i + a, j + b, 4);
      P.objetos.push({ id, x: i, y: j, s, rot: rot || 0 });
      return true;
    };
    // um objeto perto de (x, y), no raio rr
    K.objetoPerto = (id, x, y, rr, ok) => { for (let k = 0; k < 30; k++) { const an = rT() * TAU, d = rT() * rr; if (K.objeto(id, Math.floor(x + Math.cos(an) * d), Math.floor(y + Math.sin(an) * d), Math.floor(rT() * 4) * 90, ok)) return true; } return false; };
    K.ponte = (x, y, comp, larg, ang, mat, alt) => {
      const pts = Estilos.retangulo(x, y, comp, larg, ang);
      K.marcaPoli(pts, 1, true);
      K.pinta(1, 'ponte', { x, y, comp, larg, ang, mat: mat || null });
      if (alt != null) P.relevo.push({ t: 'plataforma', alt, k: 'poly', pts });
      P.tracado.push({ k: 'poli', pts });
    };
    // a passarela de tábuas (com os estrados nas curvas)
    K.poePassarela = (ctrl, larg, alt, estrados) => {
      const pts = ctrl.map(p => p.slice());
      K.pinta(1, 'passarela', { pts, larg });
      K.marcaLinha(pts, larg / 2 + 0.2, 1, true);
      // (o relevo vai num traço livre, que a tela arredonda entre os pontos: com os pontos bem juntos ao longo de cada
      // trecho reto, ele fica em cima das tábuas, sem cortar os cantos)
      const densos = [pts[0]];
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.6)); for (let k = 1; k <= n; k++) densos.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
      P.relevo.push({ t: 'plataforma', alt: alt == null ? 0.5 : alt, k: 'free', pts: densos, sw: larg });
      for (const e of estrados || []) { K.pinta(1, 'pier', { x: e[0] - 1, y: e[1] - 1, w: 2, h: 2 }); K.marcaPoli([[e[0] - 1, e[1] - 1], [e[0] + 1, e[1] - 1], [e[0] + 1, e[1] + 1], [e[0] - 1, e[1] + 1]], 1, true); P.relevo.push({ t: 'plataforma', alt: alt == null ? 0.5 : alt, k: 'rect', x: e[0] - 1, y: e[1] - 1, w: 2, h: 2 }); }
      P.tracado.push({ k: 'linha', pts, hw: larg / 2 });
      if (!K.rota) { K.rota = curva(pts); K.hwRota = larg / 2; }
      return pts;
    };
    /* uma construção: aberta (a cabana: o piso, as paredes com a porta e a janela, os móveis) ou fechada (o moinho e o
       celeiro: o telhado, as paredes sem porta e o marcador de Entrada, que gera o interior) */
    K.predio = (o) => {
      const TP = Estilos.tipos(estilo), def = TP[o.tipo] || TP.casa, forma = o.forma || Estilos.formaDe(def, o.w, o.h);
      const k = { tipo: o.tipo, x: o.x, y: o.y, w: o.w, h: o.h, forma, porta: portaNoLado(o.x, o.y, o.w, o.h, o.lado || 's'), aberto: !!o.aberto, interior: o.interior || null };
      if (k.aberto) { k.janelas = Vila.janelasDe(k, def, rT); k.moveis = Vila.mobiliar(k, def, rT); } else k.janelas = [];
      for (let j = k.y; j < k.y + k.h; j++) for (let i = k.x; i < k.x + k.w; i++) pos(i, j, 3);
      // a frente da porta fica livre
      const [fx, fy] = foraDaPorta(k.porta);
      if (at(fx, fy) !== 2 && at(fx, fy) !== 7) pos(fx, fy, 1);
      P.predios.push(k);
      P.cobertura.push({ x: k.x + k.w / 2, y: k.y + k.h / 2, r: Math.max(k.w, k.h) / 2 });
      P.tracado.push({ k: 'poli', pts: Estilos.contorno(k) });
      return k;
    };
    K.navio = (o) => {
      const n = Navio.conves(Object.assign({ estilo }, o));
      P.navios.push(n);
      K.marcaPoli(n.casco, 8, true);
      P.tracado.push({ k: 'poli', pts: n.casco });
      for (const rv of n.relevo) P.relevo.push(rv);
      return n;
    };
    return K;
  }
  // a porta no meio de um lado (como no vilarejo) e a casa de fora, logo diante dela
  function portaNoLado(x, y, w, h, lado) {
    const len = lado === 'n' || lado === 's' ? w : h, d = clamp(Math.floor(len / 2), 1, Math.max(1, len - 2));
    if (lado === 'n') return { lado, x1: x + d, y1: y, x2: x + d + 1, y2: y };
    if (lado === 's') return { lado, x1: x + d, y1: y + h, x2: x + d + 1, y2: y + h };
    if (lado === 'o') return { lado, x1: x, y1: y + d, x2: x, y2: y + d + 1 };
    return { lado, x1: x + w, y1: y + d, x2: x + w, y2: y + d + 1 };
  }
  const foraDaPorta = pt => [pt.lado === 'o' ? pt.x1 - 1 : pt.x1, pt.lado === 'n' ? pt.y1 - 1 : pt.y1];

  /* ================= as situações ================= */
  // (as cores de chão das manchas que se repetem)
  const CH = {
    clareira: ['#5e7a46', '#6f8a52', '#55703f', '#7a955a'], terra: ['#6b5a40', '#7a6a4c', '#5e4f38', '#857455'], areia: ['#d4b37a', '#c9a86a', '#dcc08a', '#bf9c5e'], capimAlto: ['#b8a650', '#c9b860', '#9a8a40', '#d4c470'],
    lama: ['#4a3f2c', '#3e3424', '#56492f'], neveFunda: ['#eef3f7', '#dfe8ef', '#f7fafc'], ilha: ['#4a5a3a', '#55663f', '#3f4e32', '#5f7046'], grama: ['#6f8a46', '#5f7a3c', '#7f9a52', '#56703a'],
    mataEscura: ['#2c4426', '#36522e', '#253b20'], rachado: ['#352c3d', '#2c2433', '#3f3448'], cinza: ['#3a3330', '#46403b', '#2e2826'], cristalClaro: ['#6a7a8e', '#7c8ca0', '#5e6e82'], gruta: ['#4a4f5a', '#555b66', '#40454f', '#5e6470'],
  };
  const FLORES = ['#f2c94c', '#e85d75', '#ffffff', '#9b7bd8'];
  const GELO = ['#e3f1f8', '#9fc3d8', '#5f8aa6'];
  const SIT = {};

  /* ---------- Estrada ---------- */
  SIT['estrada.curva'] = K => {
    const { W, H, r, sorte, P } = K;
    const daEsq = sorte(0.5), praCima = sorte(0.5), Y = y => (praCima ? y : H - y), X = x => (daEsq ? x : W - x);
    const y0 = H * r(0.58, 0.78), xb = W * r(0.6, 0.78);
    const E = [X(-1), Y(y0)], B = [X(xb * r(0.78, 0.9)), Y(y0 * r(0.82, 0.95))], S = [X(xb), Y(-1)];
    const canto = [X(0), Y(0)];
    K.poeCaminho([E, lerp(E, B, 0.55), B, lerp(B, S, 0.45), S]);
    // o lado de dentro da curva: mata fechada, pedras grandes e um capão de mato (o relevo)
    const dc = Math.hypot(B[0] - canto[0], B[1] - canto[1]);
    P.dens = (x, y) => { const d = Math.hypot(x - canto[0], y - canto[1]); return d < dc * 0.92 ? 3.2 : 1; };
    for (const t of [r(0.22, 0.3), r(0.36, 0.46)]) { const p = lerp(B, canto, t); if (K.livreCirc(p[0], p[1], 1.4)) K.pedraGrande(p[0], p[1], r(0.95, 1.3)); }
    const m = lerp(B, canto, r(0.55, 0.7)), mt = blob(K.rT, m[0], m[1], r(2.2, 3.2), r(1.6, 2.4), 12, 0.3, r(0, 3));
    K.mancha(mt, CH.mataEscura, { capim: ['#4f7a3f', '#203a1d'] }); P.relevo.push({ t: 'mata', alt: 0, k: 'poly', pts: mt }); P.cobertura.push({ x: m[0], y: m[1], r: 2.2 });
    K.foco(B[0], B[1]);
  };
  SIT['estrada.carroca'] = K => {
    const { W, H, r, P } = K, y0 = H * r(0.4, 0.6), A = r(0.8, 2.2) * (K.sorte(0.5) ? 1 : -1);
    const ctrl = [[-1, y0], [W * 0.3, y0 + A * 0.6], [W * 0.62, y0 - A * 0.4], [W + 1, y0 + A * 0.3]];
    const pts = curva(ctrl), p = Paisagem.aoLongo(pts, r(0.42, 0.58)), lado = K.sorte(0.5) ? 1 : -1;
    const nx = Math.cos(p.ang + Math.PI / 2) * lado, ny = Math.sin(p.ang + Math.PI / 2) * lado, off = hwDe(K.caminho) * 0.55 + 0.5;
    const cx = p.x + nx * off, cy = p.y + ny * off, ang = p.ang + r(-0.35, 0.35);
    K.poeCaminho(ctrl);
    const ret = Estilos.retangulo(cx, cy, 3.4, 1.7, ang);
    K.marcaPoli(ret, 3, true); K.visaoPoli(ret); P.cobertura.push({ x: cx, y: cy, r: 1.8 });
    K.pinta(2, 'carroca', { x: cx, y: cy, ang });
    P.tracado.push({ k: 'poli', pts: ret });
    for (const id of ['caixote', 'barril', 'caixote', 'barril', 'bau']) K.objetoPerto(id, cx + nx * 2.2, cy + ny * 2.2, 2.4);
    K.foco(cx, cy);
  };
  SIT['estrada.ponte'] = K => {
    const { W, H, r, P } = K, x0 = W * r(0.4, 0.6), hw = r(1.2, 1.7);
    const rio = K.poeRio([[x0 + r(-3, 3), -1], [x0 + r(-2, 2), H * 0.35], [x0 + r(-2, 2), H * 0.65], [x0 + r(-3, 3), H + 1]], hw, 'agua', -1.5);
    const y0 = H * r(0.4, 0.6), ctrl = [[-1, y0 + r(-2, 2)], [W * 0.3, y0 + r(-1, 1)], [W * 0.7, y0 + r(-1, 1)], [W + 1, y0 + r(-2, 2)]];
    const x = cruzamento(curva(ctrl), rio), tipo = K.camOuTrilha();
    if (x) K.ponte(x.x, x.y, hw * 2 + 1.8, hwDe(tipo) * 2 + 0.5, x.ang, null, 1.5);
    K.poeCaminho(ctrl, tipo);
    P.juncos = 0.35;
    K.foco(x ? x.x : x0, x ? x.y : y0);
  };
  SIT['estrada.encruzilhada'] = K => {
    const { W, H, r, sorte, P } = K, cx = W * r(0.4, 0.6), cy = H * r(0.4, 0.6), T = sorte(0.35);
    K.poeCaminho([[-1, cy + r(-2, 2)], [cx * 0.55, cy + r(-1, 1)], [cx, cy], [cx + (W - cx) * 0.5, cy + r(-1, 1)], [W + 1, cy + r(-2, 2)]]);
    const cima = [[cx + r(-2, 2), -1], [cx + r(-1, 1), cy * 0.5], [cx, cy]], baixo = [[cx, cy], [cx + r(-1, 1), cy + (H - cy) * 0.5], [cx + r(-2, 2), H + 1]];
    K.poeCaminho(T ? (sorte(0.5) ? cima : baixo) : cima.concat(baixo.slice(1)));
    const off = hwDe(K.caminho) + 1.4, cantos = [[-1, -1], [1, -1], [1, 1], [-1, 1]].sort(() => K.rT() - 0.5).map(([sx, sy]) => [cx + sx * off, cy + sy * off, sx, sy]);
    K.objeto('placa', Math.floor(cantos[0][0]), Math.floor(cantos[0][1]));
    // o santuário de beira de estrada (a base pintada; a estátua e as velas, objetos)
    const [sx, sy] = [cantos[1][0] + cantos[1][2] * 1.2, cantos[1][1] + cantos[1][3] * 1.2];
    K.pinta(1, 'santuario', { x: sx, y: sy });
    K.objeto('estatua', Math.floor(sx - 0.5), Math.floor(sy - 0.5), 0, v => v !== 2 && v !== 3);
    K.objeto('vela', Math.floor(sx - 0.5) + 1, Math.floor(sy - 0.5), 0, v => v !== 2 && v !== 3);
    K.marcaCirc(sx, sy, 1.1, 3, true); P.cobertura.push({ x: sx, y: sy, r: 1 });
    // a árvore velha e grande de um canto; o poço do outro
    const [ax, ay] = [cantos[2][0] + cantos[2][2] * 1.8, cantos[2][1] + cantos[2][3] * 1.8];
    K.arvore(ax, ay, r(1.9, 2.3), Estilos.de(K.estilo).arvore.campo); P.cobertura.push({ x: ax, y: ay, r: 1.6 });
    if (sorte(0.55)) K.objeto('poco', Math.floor(cantos[3][0] + cantos[3][2] * 0.6), Math.floor(cantos[3][1] + cantos[3][3] * 0.6));
    K.foco(cx, cy);
  };

  /* ---------- Floresta ---------- */
  SIT['floresta.clareira'] = K => {
    const { W, H, r, sorte, P } = K, cx = W * r(0.4, 0.6), cy = H * r(0.4, 0.6), rx = W * r(0.17, 0.23), ry = H * r(0.2, 0.27);
    const pts = blob(K.rT, cx, cy, rx, ry, 16, 0.25);
    K.mancha(pts, CH.clareira, { flores: FLORES, capim: ['#86a85a', '#4f6e3a'] }); K.marcaPoli(pts, 5);
    P.dens = (x, y) => { const d = Math.hypot((x - cx) / rx, (y - cy) / ry); return d < 1 ? 0 : d < 1.35 ? 2.4 : 1.6; };
    if (K.caminho !== 'nenhum') K.poeCaminho([[-1, cy + r(-3, 3)], [cx - rx * 0.8, cy + r(-1, 1)], [cx, cy], [cx + rx * 0.8, cy + r(-1, 1)], [W + 1, cy + r(-3, 3)]]);
    // o círculo de cogumelos (a roda das fadas) ou o toco velho, e os troncos caídos na beira
    if (sorte(0.55)) { const fx = cx + r(-rx * 0.3, rx * 0.3), fy = cy + r(-ry * 0.3, ry * 0.3); for (let k = 0; k < 7; k++) { const an = (k / 7) * TAU; K.objeto('cogumelos', Math.floor(fx + Math.cos(an) * 1.7), Math.floor(fy + Math.sin(an) * 1.7)); } }
    else K.objetoPerto('toco', cx, cy, 1.5);
    for (let k = 0; k < 2; k++) { const an = r(0, TAU); K.objeto('tronco', Math.floor(cx + Math.cos(an) * rx * 0.85), Math.floor(cy + Math.sin(an) * ry * 0.85), Math.floor(r(0, 4)) * 90); }
    P.cobertura.push({ x: cx + rx * 1.15, y: cy, r: 1.2 }, { x: cx - rx * 1.15, y: cy, r: 1.2 });
    K.foco(cx, cy);
  };
  SIT['floresta.riacho'] = K => {
    const { W, H, r, sorte, P } = K, vertical = sorte(0.5), hw = r(0.55, 0.85);
    const c0 = vertical ? W * r(0.35, 0.65) : H * r(0.35, 0.65), L = vertical ? H : W, Q = (a, b) => (vertical ? [a, b] : [b, a]);
    const rio = K.poeRio([Q(c0 + r(-3, 3), -1), Q(c0 + r(-4, 4), L * 0.33), Q(c0 + r(-4, 4), L * 0.66), Q(c0 + r(-3, 3), L + 1)], hw, 'agua', -0.5);
    // a travessia: pedras de atravessar ou um tronco, onde o caminho cruza (ou no meio)
    const ctrl = vertical ? [[-1, H * r(0.35, 0.65)], [W * 0.5, H * r(0.4, 0.6)], [W + 1, H * r(0.35, 0.65)]] : [[W * r(0.35, 0.65), -1], [W * r(0.4, 0.6), H * 0.5], [W * r(0.35, 0.65), H + 1]];
    const x = (K.caminho !== 'nenhum' && cruzamento(curva(ctrl), rio)) || Object.assign(Paisagem.aoLongo(rio, r(0.4, 0.6)), {});
    const angRio = x.angB != null ? x.angB : x.ang, travessia = angRio + Math.PI / 2;
    if (sorte(0.5)) {
      const pedras = [];
      for (let t = -hw - 0.1; t <= hw + 0.15; t += 0.62) pedras.push([x.x + Math.cos(travessia) * t, x.y + Math.sin(travessia) * t]);
      K.pinta(1, 'pedras', { pts: pedras });
      for (const [px, py] of pedras) { K.marcaCirc(px, py, 0.45, 10, true); P.relevo.push({ t: 'plataforma', alt: 0.3, k: 'ell', x: px - 0.32, y: py - 0.25, w: 0.64, h: 0.5 }); }
      P.tracado.push({ k: 'linha', pts: pedras, hw: 0.4 });
    } else K.ponte(x.x, x.y, hw * 2 + 1.6, 0.85, travessia, 'tronco', 0.5);
    if (K.caminho !== 'nenhum') K.poeCaminho(ctrl);
    for (let k = 0; k < 6; k++) { const p = Paisagem.aoLongo(rio, K.rT()), lado = sorte(0.5) ? 1 : -1, d = hw + 0.6 + K.rT() * 0.6; P.rochas.push({ x: p.x + Math.cos(p.ang + Math.PI / 2) * d * lado, y: p.y + Math.sin(p.ang + Math.PI / 2) * d * lado, r: r(0.3, 0.5) }); }
    P.juncos = 0.18;
    K.foco(x.x, x.y);
  };
  SIT['floresta.arvore'] = K => {
    const { W, H, r, P } = K, ang = r(0, TAU), L = Math.min(W, H) * r(0.55, 0.7), cx = W * r(0.42, 0.58), cy = H * r(0.42, 0.58), rr = r(0.8, 1.0);
    const a = [cx - Math.cos(ang) * L / 2, cy - Math.sin(ang) * L / 2], b = [cx + Math.cos(ang) * L / 2, cy + Math.sin(ang) * L / 2];
    const tm = [(a[0] + b[0] - Math.cos(ang) * rr * 0.6) / 2, (a[1] + b[1] - Math.sin(ang) * rr * 0.6) / 2], tronco = Estilos.retangulo(tm[0], tm[1], L - rr * 0.6, rr * 2, ang);
    // (a copa primeiro: o tronco continua por baixo dela, barrando a passagem até a ponta)
    K.marcaCirc(b[0], b[1], rr * 2.8, 4, true); K.marcaPoli(tronco, 3, true); K.marcaCirc(a[0], a[1], rr * 1.5, 3, true);
    K.visaoPoli(tronco); K.visaoPoli(elipse(a[0], a[1], rr * 0.75, rr * 1.5, 8, ang));
    P.relevo.push({ t: 'morro', alt: 1.8, k: 'poly', pts: tronco, a: 0.12 }, { t: 'mata', alt: 0, k: 'ell', x: b[0] - rr * 2.6, y: b[1] - rr * 2.6, w: rr * 5.2, h: rr * 5.2, a: 0.16 });
    K.pinta(2, 'troncoGigante', { a, b, r: rr });
    P.cobertura.push({ x: tm[0], y: tm[1], r: rr * 1.4 }, { x: a[0], y: a[1], r: rr * 1.5 });
    P.tracado.push({ k: 'poli', pts: tronco });
    if (K.caminho !== 'nenhum') { const pa = ang + Math.PI / 2, d = Math.max(W, H); K.poeCaminho([[cx - Math.cos(pa) * d, cy - Math.sin(pa) * d], [cx - Math.cos(pa) * 3 + r(-1, 1), cy - Math.sin(pa) * 3], [cx, cy], [cx + Math.cos(pa) * 3, cy + Math.sin(pa) * 3 + r(-1, 1)], [cx + Math.cos(pa) * d, cy + Math.sin(pa) * d]]); }
    K.foco(cx, cy);
  };
  SIT['floresta.acampamento'] = K => {
    const { W, H, r, ri, sorte, P } = K, cx = W * r(0.35, 0.65), cy = H * r(0.35, 0.65);
    const area = blob(K.rT, cx, cy, r(4, 5), r(3.2, 4), 14, 0.25);
    K.mancha(area, CH.terra, { pedrisco: ['#8a7a5a', '#4e4330'] }); K.marcaPoli(area, 5);
    K.pinta(2, 'fogueiraApagada', { x: cx, y: cy }); K.marcaCirc(cx, cy, 0.7, 3, true);
    const n = ri(2, 4), a0 = r(0, TAU), cores = ['#b8a27a', '#8a9a6a', '#a87a5a', '#9a8a70'];
    for (let k = 0; k < n; k++) {
      const an = a0 + (k / n) * TAU + r(-0.3, 0.3), d = r(2.7, 3.2), tx = cx + Math.cos(an) * d, ty = cy + Math.sin(an) * d * 0.85;
      K.pinta(2, 'tenda', { x: tx, y: ty, w: 1.8, l: 2.4, ang: an + Math.PI / 2, cor: cores[k % 4], rasgada: sorte(0.75) });
      K.marcaPoli(Estilos.retangulo(tx, ty, 2.4, 1.8, an + Math.PI / 2), 4, true);
    }
    for (const id of ['bau', 'caixote', 'caixote', 'barril', 'jarro']) K.objetoPerto(id, cx, cy, 4.2);
    for (let k = 0; k < 2; k++) { const an = r(0, TAU); K.objeto('tronco', Math.floor(cx + Math.cos(an) * 1.6 - 1), Math.floor(cy + Math.sin(an) * 1.6 - 1), Math.floor(r(0, 4)) * 90); }
    P.dens = (x, y) => (Math.hypot(x - cx, y - cy) < 6 ? 0.2 : 1.2);
    if (K.caminho !== 'nenhum') K.poeCaminho([[-1, cy + r(-4, 4)], [cx - 5, cy + (sorte(0.5) ? 4.5 : -4.5)], [cx + 5, cy + (sorte(0.5) ? 4.5 : -4.5)], [W + 1, cy + r(-4, 4)]]);
    K.foco(cx, cy);
  };

  /* ---------- Deserto ---------- */
  SIT['deserto.dunas'] = K => {
    const { W, H, r, ri, P } = K, vento = r(0, TAU), dunas = [];
    for (let k = 0, tent = 0; k < ri(4, 6) && tent < 60; tent++) {
      const cx = r(2, W - 2), cy = r(2, H - 2), rx = r(3.5, 6.5), ry = r(1.3, 2.4);
      if (dunas.some(d => Math.hypot(d[0] - cx, d[1] - cy) < (d[2] + rx) * 0.7)) continue;
      dunas.push([cx, cy, rx]);
      const pts = blob(K.rT, cx, cy, rx, ry, 14, 0.2, vento + Math.PI / 2 + r(-0.3, 0.3));
      K.pinta(0, 'duna', { pts, ang: vento }); K.marcaPoli(pts, 6); P.relevo.push({ t: 'morro', alt: Math.round(r(1.5, 3) * 2) / 2, k: 'poly', pts }); P.tracado.push({ k: 'poli', pts }); P.cobertura.push({ x: cx, y: cy, r: ry + 0.5 });
      k++;
    }
    // a areia movediça, entre as dunas
    const q = K.lugar(1.8, v => v === 0);
    if (q) { K.mancha(blob(K.rT, q[0], q[1], 1.9, 1.6, 10, 0.2), ['#c29a5a', '#b48a4c', '#cfa868']); K.zona('areia', q[0], q[1], { r: 1.7 }); K.marcaCirc(q[0], q[1], 1.7, 5, true); }
    if (K.caminho !== 'nenhum') { const y0 = H * r(0.35, 0.65); K.poeCaminho([[-1, y0], [W * 0.25, y0 + r(-3, 3)], [W * 0.5, y0 + r(-3, 3)], [W * 0.75, y0 + r(-3, 3)], [W + 1, y0 + r(-2, 2)]]); }
    for (let k = 0; k < 3; k++) { const l = K.lugar(0.5); if (l) P.rochas.push({ x: l[0], y: l[1], r: r(0.35, 0.6) }); }
    K.foco(W / 2, H / 2);
  };
  SIT['deserto.oasis'] = K => {
    const { W, H, r, ri, sorte, P } = K, cx = W * r(0.38, 0.62), cy = H * r(0.38, 0.62), rx = r(3, 4.5), ry = r(2.2, 3.2);
    const anel = blob(K.rT, cx, cy, rx + r(2.4, 3.2), ry + r(2, 2.6), 16, 0.25);
    K.mancha(anel, CH.grama, { capim: ['#8aa85a', '#4f6e3a'], flores: ['#f2c94c', '#ffffff'] }); K.marcaPoli(anel, 5);
    const lago = blob(K.rT, cx, cy, rx, ry, 14, 0.22);
    K.poeLago(lago, 'agua', -1);
    for (let k = 0, n = ri(8, 12); k < n; k++) { const an = (k / n) * TAU + r(-0.2, 0.2), d = r(1.05, 1.4); const px = cx + Math.cos(an) * (rx + 1) * d, py = cy + Math.sin(an) * (ry + 1) * d; if (K.at(Math.floor(px), Math.floor(py)) === 5) K.arvore(px, py, r(0.75, 1.1), 'palmeira'); }
    if (sorte(0.5)) { const an = r(0, TAU), tx = cx + Math.cos(an) * (rx + 3.4), ty = cy + Math.sin(an) * (ry + 2.8); if (K.dentro(tx, ty, 2)) { K.pinta(2, 'tenda', { x: tx, y: ty, w: 1.8, l: 2.4, ang: an, cor: ['#c8452f', '#2f6f8c', '#d9a23a'][ri(0, 2)], rasgada: false }); K.marcaCirc(tx, ty, 1.3, 4, true); K.objetoPerto('jarro', tx, ty, 2); K.objetoPerto('jarro', tx, ty, 2); } }
    P.juncos = 0.5; P.densBase = 0.008;
    if (K.caminho !== 'nenhum') { const lado = sorte(0.5) ? -1 : 1; K.poeCaminho([[lado < 0 ? -1 : W + 1, cy + r(-4, 4)], [cx + lado * (rx + 5), cy + r(-2, 2)], [cx + lado * (rx + 2.2), cy + r(-1, 1)]]); }
    K.foco(cx + rx * 0.8, cy);
  };
  SIT['deserto.ossada'] = K => {
    const { W, H, r, sorte, P } = K, L = Math.min(W * 0.5, 16), esq = sorte(0.5), sx = esq ? W * r(0.18, 0.28) : W * r(0.72, 0.82), sy = H * r(0.35, 0.65);
    const ang = (esq ? 0 : Math.PI) + r(-0.4, 0.4), ux = Math.cos(ang), uy = Math.sin(ang);
    K.pinta(2, 'ossada', { x: sx, y: sy, ang, L, chao: '#c9a86a' });
    const cranio = elipse(sx - ux * 0.5, sy - uy * 0.5, 2.1, 1.05, 10, ang);
    K.marcaPoli(cranio, 3, true); K.visaoPoli(cranio);
    const costelas = Estilos.retangulo(sx + ux * L * 0.47, sy + uy * L * 0.47, L * 0.72, 5.2, ang);
    K.marcaPoli(costelas, 4, true);
    P.cobertura.push({ x: sx, y: sy, r: 1.5 }, { x: sx + ux * L * 0.4, y: sy + uy * L * 0.4, r: 2.4 });
    P.tracado.push({ k: 'poli', pts: cranio }, { k: 'poli', pts: costelas });
    if (K.caminho !== 'nenhum') { const ny = sy + (sorte(0.5) ? 4.5 : -4.5); K.poeCaminho([[-1, ny + r(-2, 2)], [W * 0.5, ny + r(-1, 1)], [W + 1, ny + r(-2, 2)]]); }
    for (let k = 0; k < 4; k++) { const l = K.lugar(0.5); if (l) P.rochas.push({ x: l[0], y: l[1], r: r(0.35, 0.6) }); }
    K.foco(sx + ux * L * 0.4, sy + uy * L * 0.4);
  };
  // o cânion e o desfiladeiro: o chão no meio, os paredões dos dois lados (com as paredes de visão)
  function corredor(K, hf, var_, cores, alt) {
    const { W, H, r, sorte, P } = K, horizontal = W >= H ? sorte(0.75) : sorte(0.25), L = horizontal ? W : H, M = horizontal ? H : W;
    const Q = (a, b) => (horizontal ? [a, b] : [b, a]), c0 = M * r(0.42, 0.58);
    const meio = curva([Q(-2, c0 + r(-2, 2)), Q(L * 0.33, c0 + r(-3, 3)), Q(L * 0.66, c0 + r(-3, 3)), Q(L + 2, c0 + r(-2, 2))], 1.2);
    const { esq, dir } = ladosDaFaixa(meio, hf, K.rT, var_);
    // (os paredões vão até a borda do mapa, do lado de cada um)
    const fecha = (lado, sinal) => (sinal < 0 ? lado.concat([Q(L + 3, -3), Q(-3, -3)]) : lado.concat([Q(L + 3, M + 3), Q(-3, M + 3)]));
    const sinalEsq = horizontal ? (esq[0][1] < meio[0][1] ? -1 : 1) : (esq[0][0] < meio[0][0] ? -1 : 1);
    K.poePenhasco(fecha(esq, sinalEsq), alt, cores);
    K.poePenhasco(fecha(dir, -sinalEsq), alt, cores);
    K.eixo = meio;                                                // (sem caminho, a chegada fica no chão do corredor)
    return { meio, horizontal, esq, dir };
  }
  SIT['deserto.canion'] = K => {
    const { r, P } = K, c = corredor(K, r(3.5, 4.8), 1.6, Paisagem.PEDRA.canion, 7);
    K.mancha(faixa(c.meio, 5.2, K.rT, 1.2), CH.areia);
    for (let k = 0; k < 3; k++) { const p = Paisagem.aoLongo(c.meio, 0.2 + k * 0.3 + r(-0.05, 0.05)), off = r(-2.2, 2.2); if (Math.abs(off) > 0.8) K.pedraGrande(p.x - Math.sin(p.ang) * off, p.y + Math.cos(p.ang) * off, r(0.85, 1.2), Paisagem.PEDRA.canion); }
    if (K.caminho !== 'nenhum') K.poeCaminho(c.meio.filter((_, i) => i % 3 === 0).concat([c.meio[c.meio.length - 1]]));
    const f = Paisagem.aoLongo(c.meio, 0.5); K.foco(f.x, f.y);
  };

  /* ---------- Montanha ---------- */
  SIT['montanha.desfiladeiro'] = K => {
    const { r, ri, P } = K, c = corredor(K, r(2.6, 3.4), 1.2, Paisagem.PEDRA.rocha, 8);
    // as plataformas de pedra junto de um paredão (boas para os arqueiros)
    for (let k = 0, n = ri(1, 2); k < n; k++) {
      const t = 0.25 + k * 0.4 + r(-0.08, 0.08), p = Paisagem.aoLongo(c.meio, t), lado = K.sorte(0.5) ? 1 : -1, nx = -Math.sin(p.ang) * lado, ny = Math.cos(p.ang) * lado;
      const pc = [p.x + nx * (2.6 - 0.9), p.y + ny * (2.6 - 0.9)], pts = Estilos.retangulo(pc[0], pc[1], r(2.6, 3.4), 1.5, p.ang);
      K.pinta(1, 'plataformaPedra', { pts }); K.marcaPoli(pts, 6, true); P.relevo.push({ t: 'montanha', alt: 3, k: 'poly', pts, a: 0.16 }); P.cobertura.push({ x: pc[0], y: pc[1], r: 1.2 });
    }
    for (let k = 0; k < 2; k++) { const p = Paisagem.aoLongo(c.meio, 0.15 + k * 0.55 + r(0, 0.15)), off = r(-1.4, 1.4); if (Math.abs(off) > 0.6) K.pedraGrande(p.x - Math.sin(p.ang) * off, p.y + Math.cos(p.ang) * off, r(0.8, 1.05)); }
    if (K.caminho !== 'nenhum') K.poeCaminho(c.meio.filter((_, i) => i % 3 === 0).concat([c.meio[c.meio.length - 1]]));
    const f = Paisagem.aoLongo(c.meio, 0.5); K.foco(f.x, f.y);
  };
  SIT['montanha.cordas'] = K => {
    const { W, H, r, P } = K, x0 = W * r(0.42, 0.58), meio = curva([[x0 + r(-2, 2), -2], [x0 + r(-2, 2), H * 0.35], [x0 + r(-2, 2), H * 0.65], [x0 + r(-2, 2), H + 2]], 1);
    const hw = r(2, 2.8), abismo = faixa(meio, hw, K.rT, 0.9);
    K.poeAbismo(abismo, -20);
    const p = Paisagem.aoLongo(meio, r(0.38, 0.62));
    let atrav = p.ang + Math.PI / 2;
    if (Math.cos(atrav) < 0) atrav += Math.PI;                    // (a ponte vai da esquerda para a direita)
    K.ponte(p.x, p.y, hw * 2 + 2.2, 1.2, atrav, 'corda', 0);
    const ca = Math.cos(atrav), sa = Math.sin(atrav), d = hw + 4;
    K.poeCaminho([[-1, p.y + r(-3, 3)], [p.x - ca * d, p.y - sa * d], [p.x, p.y], [p.x + ca * d, p.y + sa * d], [W + 1, p.y + r(-3, 3)]], K.camOuTrilha());
    for (let k = 0; k < 4; k++) K.pedraGrandeLivre(r(0.8, 1.2));
    K.foco(p.x, p.y);
  };
  SIT['montanha.encosta'] = K => {
    const { W, H, r, sorte, P } = K, y0 = H * r(0.42, 0.58), meio = curva([[-2, y0 + r(-2, 2)], [W * 0.33, y0 + r(-2, 2)], [W * 0.66, y0 + r(-2, 2)], [W + 2, y0 + r(-2, 2)]], 1);
    const { esq, dir } = ladosDaFaixa(meio, 1.7, K.rT, 0.7), montanhaEmCima = sorte(0.5);
    const cima = esq[0][1] < dir[0][1] ? esq : dir, baixo = cima === esq ? dir : esq;
    const poliCima = cima.concat([[W + 3, -3], [-3, -3]]), poliBaixo = baixo.concat([[W + 3, H + 3], [-3, H + 3]]);
    if (montanhaEmCima) { K.poePenhasco(poliCima, 8); K.poeAbismo(poliBaixo, -12); } else { K.poeAbismo(poliCima, -12); K.poePenhasco(poliBaixo, 8); }
    K.poeCaminho(meio.filter((_, i) => i % 3 === 0).concat([meio[meio.length - 1]]), K.camOuTrilha());
    // as pedras que rolaram e ficaram na trilha
    for (const t of [r(0.3, 0.42), r(0.6, 0.72)]) { const p = Paisagem.aoLongo(meio, t), lado = montanhaEmCima ? -1 : 1; K.pedraGrande(p.x, p.y + lado * 0.9, r(0.75, 0.95)); }
    K.foco(W / 2, y0);
  };
  SIT['montanha.plato'] = K => {
    const { W, H, r, P } = K, cx = W * r(0.4, 0.6), cy = H * r(0.4, 0.6), pts = blob(K.rT, cx, cy, W * r(0.22, 0.28), H * r(0.24, 0.3), 18, 0.28);
    K.pinta(0, 'planalto', { pts, alt: 3, cores: ['#9a9a7a', '#7d7c62', '#3e3d32'] }); K.marcaPoli(pts, 6); P.relevo.push({ t: 'morro', alt: 3, k: 'poly', pts }); P.tracado.push({ k: 'poli', pts });
    for (let k = 0; k < 3; k++) { const l = K.lugar(1.4, v => v === 6, 60, (x, y) => dentroPoli(pts, x, y)); if (l) K.pedraGrande(l[0], l[1], r(0.85, 1.25)); }
    for (let k = 0; k < 3; k++) K.pedraGrandeLivre(r(0.8, 1.1));
    if (K.caminho !== 'nenhum') K.poeCaminho([[-1, cy + r(-4, 4)], [cx - W * 0.2, cy + r(-2, 2)], [cx, cy], [cx + W * 0.2, cy + r(-2, 2)], [W + 1, cy + r(-4, 4)]]);
    K.foco(cx, cy);
  };

  /* ---------- Pântano ---------- */
  // as ilhas (de terra, meio metro acima da água rasa); devolve os centros
  function ilhas(K, n, rx0, rx1) {
    const { W, H, r, P } = K, out = [];
    for (let k = 0, tent = 0; out.length < n && tent < 80; tent++) {
      const cx = r(2, W - 2), cy = r(2, H - 2), rx = r(rx0, rx1), ry = rx * r(0.65, 0.9);
      if (out.some(q => Math.hypot(q[0] - cx, q[1] - cy) < q[2] + rx + 1.2)) continue;
      const pts = blob(K.rT, cx, cy, rx, ry, 12, 0.3);
      K.mancha(pts, CH.ilha, { capim: ['#6f8a4a', '#2f3a24'] }); K.marcaPoli(pts, 0, true); P.relevo.push({ t: 'morro', alt: 0.5, k: 'poly', pts });
      out.push([cx, cy, rx]);
    }
    return out;
  }
  function pantanoBase(K) { K.encher(2); K.P.aguaToda = { tipo: 'agua' }; K.P.aguaRasa = true; K.P.juncos = 0.4; K.P.esp = (x, y, rnd) => (rnd() < 0.6 ? 'mangue' : 'morta'); }
  SIT['pantano.ilhas'] = K => {
    const { W, H, r, ri, P } = K;
    pantanoBase(K);
    const ils = ilhas(K, ri(5, 7), 1.8, 3.6);
    // um canal mais fundo, entre as ilhas
    const y0 = H * r(0.3, 0.7); K.poeRio([[-1, y0], [W * 0.33, y0 + r(-4, 4)], [W * 0.66, y0 + r(-4, 4)], [W + 1, y0 + r(-3, 3)]], r(0.9, 1.3), 'agua', -1.5);
    for (let k = 0; k < ri(2, 3); k++) { const l = K.lugar(1.8, v => v === 2); if (l) K.zona('lama', l[0], l[1], { r: r(1.6, 2.4) }); }
    if (K.caminho !== 'nenhum') { const cs = ils.slice().sort((a, b) => a[0] - b[0]); K.poePassarela([[-1, cs[0][1]]].concat(cs.slice(0, 4).map(q => [q[0], q[1]])).concat([[W + 1, cs[Math.min(3, cs.length - 1)][1]]]), 1.2, 0.5); }
    const c = ils.slice().sort((a, b) => Math.hypot(a[0] - W / 2, a[1] - H / 2) - Math.hypot(b[0] - W / 2, b[1] - H / 2))[0] || [W / 2, H / 2];
    K.foco(c[0], c[1]);
  };
  SIT['pantano.passarela'] = K => {
    const { W, H, r, ri, P } = K;
    pantanoBase(K);
    ilhas(K, ri(2, 3), 1.2, 2.2);
    const n = ri(3, 4), pts = [[-1, H * r(0.25, 0.75)]], estrados = [];
    for (let k = 1; k <= n; k++) { const p = [W * (k / (n + 1)) + r(-1.5, 1.5), k % 2 ? H * r(0.2, 0.38) : H * r(0.62, 0.8)]; pts.push(p); estrados.push(p); }
    pts.push([W + 1, H * r(0.25, 0.75)]);
    K.poePassarela(pts, 1.2, 0.5, estrados);
    for (let k = 0; k < ri(2, 3); k++) { const l = K.lugar(1.8, v => v === 2); if (l) K.zona('lama', l[0], l[1], { r: r(1.6, 2.2) }); }
    { const l = K.lugar(3, v => v === 2 || v === 0); if (l) K.zona('nevoa', l[0], l[1], { r: r(3, 4) }); }
    const m = estrados[Math.floor(estrados.length / 2)]; P.cobertura.push({ x: m[0], y: m[1], r: 1 });
    K.foco(m[0], m[1]);
  };
  SIT['pantano.palafita'] = K => {
    const { W, H, r, ri, sorte, P } = K;
    pantanoBase(K);
    // a margem (terra) de um lado
    const lado = K.pick(['n', 's', 'o', 'l']), fundo = r(3.5, 5), horiz = lado === 'n' || lado === 's', L = horiz ? W : H;
    const linha = []; for (let t = -1; t <= L + 1; t += 2) linha.push(horiz ? [t, lado === 'n' ? fundo + r(-1, 1) : H - fundo + r(-1, 1)] : [lado === 'o' ? fundo + r(-1, 1) : W - fundo + r(-1, 1), t]);
    const margem = lado === 'n' ? linha.concat([[W + 2, -2], [-2, -2]]) : lado === 's' ? linha.concat([[W + 2, H + 2], [-2, H + 2]]) : lado === 'o' ? linha.concat([[-2, H + 2], [-2, -2]]) : linha.concat([[W + 2, H + 2], [W + 2, -2]]);
    K.mancha(margem, CH.ilha, { capim: ['#6f8a4a', '#2f3a24'] }); K.marcaPoli(margem, 0, true); P.relevo.push({ t: 'morro', alt: 0.5, k: 'poly', pts: margem });
    // a cabana sobre as estacas, no meio da água, com a porta virada para a margem
    const w = ri(4, 5), h = 4, x = Math.round(W / 2 - w / 2 + r(-2, 2)), y = Math.round(H / 2 - h / 2 + r(-1.5, 1.5));
    const porta = lado, deck = { x: x - 1, y: y - 1, w: w + 2, h: h + 2 };
    if (porta === 'n') { deck.y -= 1; deck.h += 1; } else if (porta === 's') deck.h += 1; else if (porta === 'o') { deck.x -= 1; deck.w += 1; } else deck.w += 1;
    K.pinta(1, 'pier', deck); K.marcaPoli([[deck.x, deck.y], [deck.x + deck.w, deck.y], [deck.x + deck.w, deck.y + deck.h], [deck.x, deck.y + deck.h]], 1, true);
    P.relevo.push({ t: 'plataforma', alt: 1.5, k: 'rect', x: deck.x, y: deck.y, w: deck.w, h: deck.h });
    const k = K.predio({ tipo: 'casa', x, y, w, h, lado: porta, aberto: true });
    // a passarela da varanda até a margem
    const [fx, fy] = foraDaPorta(k.porta), alvo = horiz ? [fx + 0.5, lado === 'n' ? fundo - 1 : H - fundo + 1] : [lado === 'o' ? fundo - 1 : W - fundo + 1, fy + 0.5];
    K.poePassarela([[fx + 0.5, fy + 0.5], alvo], 1.1, 1);
    P.marcas.chegada = [alvo[0] - 0.5, alvo[1] - 0.5];                 // o grupo chega pela margem, na ponta da passarela
    K.pinta(2, 'barco', { x: deck.x + (porta === 'l' || porta === 'o' ? deck.w / 2 : -1.2), y: deck.y + (porta === 'n' || porta === 's' ? deck.h / 2 : -1.2), ang: horiz ? Math.PI / 2 : 0, L: 2.6 });
    K.objeto('barril', foraDaPorta(k.porta)[0] + (horiz ? 1 : 0), foraDaPorta(k.porta)[1] + (horiz ? 0 : 1), 0, v => v === 1);
    for (let n2 = 0; n2 < 2; n2++) { const l = K.lugar(1.6, v => v === 2); if (l) K.zona('lama', l[0], l[1], { r: r(1.4, 2) }); }
    K.foco(fx + 0.5, fy + 0.5);
  };
  SIT['pantano.raizes'] = K => {
    const { W, H, r, ri, P } = K;
    pantanoBase(K);
    ilhas(K, ri(3, 5), 1, 2.4);
    P.densBase = 0.2;
    // os mangues com as raízes em arco saindo do pé, em cacho (as raízes por baixo, a copa por cima)
    for (let k = 0, n = ri(5, 7), tent = 0; k < n && tent < 60; tent++) {
      const l0 = K.lugar(2.4, v => v === 2 || v === 0);
      if (!l0) continue;
      const [x, y] = l0, m = ri(5, 7);
      for (let i = 0; i < m; i++) { const an = (i / m) * TAU + r(-0.3, 0.3), l = r(1.6, 2.6), pts = [[x + Math.cos(an) * 0.4, y + Math.sin(an) * 0.4], [x + Math.cos(an + 0.25) * l * 0.6, y + Math.sin(an + 0.25) * l * 0.6], [x + Math.cos(an) * l, y + Math.sin(an) * l]]; K.pinta(2, 'raiz', { pts: curva(pts, 0.35), larg: r(0.26, 0.4) }); K.marcaLinha(pts, 0.3, 4, true); }
      K.arvore(x, y, r(1.25, 1.6), 'mangue'); P.cobertura.push({ x, y, r: 1.6 });
      k++;
    }
    for (let k = 0; k < ri(2, 3); k++) { const l = K.lugar(3); K.zona('nevoa', l ? l[0] : r(4, W - 4), l ? l[1] : r(4, H - 4), { r: r(3, 4.5) }); }
    { const l = K.lugar(1.6, v => v === 2); if (l) K.zona('lama', l[0], l[1], { r: 1.8 }); }
    if (K.caminho !== 'nenhum') { const y0 = H * r(0.3, 0.7); K.poePassarela([[-1, y0], [W * 0.35, y0 + r(-3, 3)], [W * 0.65, y0 + r(-3, 3)], [W + 1, y0 + r(-2, 2)]], 1.1, 0.5); }
    K.foco(W / 2, H / 2);
  };

  /* ---------- Neve ---------- */
  SIT['neve.lago'] = K => {
    const { W, H, r, ri, P } = K, cx = W * r(0.42, 0.58), cy = H * r(0.42, 0.58), rx = W * r(0.24, 0.3), ry = H * r(0.24, 0.29);
    const pts = blob(K.rT, cx, cy, rx, ry, 18, 0.2);
    K.poeLago(pts, 'gelo', null, 5);
    // o chão congelado (a zona) cobrindo o lago, em círculos
    for (let k = 0; k < 4; k++) { const an = (k / 4) * TAU + 0.4; K.zona('gelado', cx + Math.cos(an) * rx * 0.42, cy + Math.sin(an) * ry * 0.42, { r: Math.min(rx, ry) * 0.62 }); }
    // o buraco de pescar no gelo
    const bx = cx + r(-rx * 0.3, rx * 0.3), by = cy + r(-ry * 0.3, ry * 0.3);
    K.pinta(1, 'buracoGelo', { x: bx, y: by }); P.relevo.push({ t: 'agua', alt: -2, k: 'ell', x: bx - 0.5, y: by - 0.4, w: 1, h: 0.8 });
    for (let k = 0; k < ri(2, 3); k++) { const l = K.lugar(1.6); if (l) { const d = blob(K.rT, l[0], l[1], r(1.4, 2.2), r(0.9, 1.4), 10, 0.3); K.mancha(d, CH.neveFunda); K.marcaPoli(d, 6); } }
    P.dens = (x, y) => { const d = Math.hypot((x - cx) / rx, (y - cy) / ry); return d < 1.05 ? 0 : d < 1.5 ? 2.2 : 1; };
    if (K.caminho !== 'nenhum') { const s = K.sorte(0.5) ? -1 : 1; K.poeCaminho([[-1, cy + s * ry * 0.5], [cx - rx * 1.05, cy + s * ry * 0.9], [cx, cy + s * (ry + 2.2)], [cx + rx * 1.05, cy + s * ry * 0.9], [W + 1, cy + s * ry * 0.5]]); }
    K.foco(cx, cy);
  };
  SIT['neve.pinheiros'] = K => {
    const { W, H, r, ri, P } = K, cx = W * r(0.4, 0.6), cy = H * r(0.4, 0.6), R = r(2.5, 3.5);
    P.densBase = 0.17; P.dens = (x, y) => (Math.hypot(x - cx, y - cy) < R ? 0 : 1);
    for (let k = 0; k < ri(3, 4); k++) { const l = K.lugar(1.6); if (l) { const d = blob(K.rT, l[0], l[1], r(1.4, 2.2), r(0.9, 1.4), 10, 0.3); K.mancha(d, CH.neveFunda); K.marcaPoli(d, 6); } }
    for (let k = 0; k < ri(2, 3); k++) { const l = K.lugar(1.2); if (l) K.objeto('tronco', Math.floor(l[0]), Math.floor(l[1]), Math.floor(r(0, 4)) * 90); }
    for (let k = 0; k < 2; k++) K.pedraGrandeLivre(r(0.85, 1.2), Paisagem.PEDRA.neve);
    if (K.caminho !== 'nenhum') K.poeCaminho([[-1, cy + r(-4, 4)], [cx - R, cy + r(-1, 1)], [cx + R, cy + r(-1, 1)], [W + 1, cy + r(-4, 4)]]);
    K.foco(cx, cy);
  };
  SIT['neve.cabana'] = K => {
    const { W, H, r, ri, P } = K, w = ri(5, 6), h = 4, x = Math.round(W / 2 - w / 2 + r(-3, 3)), y = Math.round(H / 2 - h / 2 + r(-2, 2)), lado = K.pick(['n', 's', 'o', 'l']);
    const cx = x + w / 2, cy = y + h / 2, cl = blob(K.rT, cx, cy, w / 2 + 4, h / 2 + 3.5, 14, 0.25);
    K.mancha(cl, CH.neveFunda); K.marcaPoli(cl, 5);
    const k = K.predio({ tipo: 'casa', x, y, w, h, lado, aberto: true });
    // a lenha empilhada encostada na parede de trás, o varal das peles e o toco de rachar
    const atras = { n: 's', s: 'n', o: 'l', l: 'o' }[lado];
    const lx = atras === 'o' ? x - 1.1 : atras === 'l' ? x + w + 0.2 : x + 0.5, ly = atras === 'n' ? y - 1.1 : atras === 's' ? y + h + 0.2 : y + 0.5;
    const lw = atras === 'n' || atras === 's' ? 2.2 : 0.9, lh = atras === 'n' || atras === 's' ? 0.9 : 2.2;
    K.pinta(2, 'lenha', { x: lx, y: ly, w: lw, h: lh }); K.marcaPoli([[lx, ly], [lx + lw, ly], [lx + lw, ly + lh], [lx, ly + lh]], 4, true);
    const [fx, fy] = foraDaPorta(k.porta), vx = fx + (lado === 'n' || lado === 's' ? 3 : lado === 'o' ? -2 : 2), vy = fy + (lado === 'o' || lado === 'l' ? 3 : lado === 'n' ? -2 : 2);
    if (K.dentro(vx, vy, 1.5)) { K.pinta(2, 'varal', { x: vx, y: vy, ang: lado === 'n' || lado === 's' ? 0 : Math.PI / 2 }); K.marcaCirc(vx, vy, 1.1, 4, true); }
    K.objetoPerto('toco', fx, fy, 2.5); K.objetoPerto('barril', fx, fy, 2.5);
    P.densBase = 0.13;
    if (K.caminho !== 'nenhum') { const ladoE = fx < W / 2 ? -1 : W + 1; K.poeCaminho([[ladoE, fy + r(-4, 4)], [(ladoE < 0 ? fx - 5 : fx + 5), fy + r(-2, 2)], [fx + 0.5, fy + 0.5]]); }
    K.foco(fx + 0.5, fy + 0.5);
  };
  SIT['neve.fenda'] = K => {
    const { W, H, r, ri, P } = K, horizontal = K.sorte(0.5), L = horizontal ? W : H, M = horizontal ? H : W, Q = (a, b) => (horizontal ? [a, b] : [b, a]);
    const pts = []; for (let t = -2; t <= L + 2; t += r(2.2, 3.4)) pts.push(Q(t, M / 2 + r(-M * 0.15, M * 0.15)));
    const hw = r(0.8, 1.3), meio = curva(pts, 0.8), poli = faixa(meio, hw, K.rT, 0.5);
    K.poeAbismo(poli, -8, ['#dbe8f0', '#7fa6c0', '#0b1620']);
    const p = Paisagem.aoLongo(meio, r(0.38, 0.62));
    K.ponte(p.x, p.y, hw * 2 + 1.8, 1.4, p.ang + Math.PI / 2, 'neve', 0);
    for (let k = 0; k < ri(3, 5); k++) { const l = K.lugar(1.8); if (l) K.poePenhasco(blob(K.rT, l[0], l[1], r(1, 1.7), r(0.9, 1.4), 9, 0.35), 3, GELO); }
    if (K.caminho !== 'nenhum') { const a = p.ang + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), d = Math.max(W, H); K.poeCaminho([[p.x - ca * d, p.y - sa * d], [p.x - ca * 3, p.y - sa * 3], [p.x, p.y], [p.x + ca * 3, p.y + sa * 3], [p.x + ca * d, p.y + sa * d]]); }
    P.densBase = 0.04;
    K.foco(p.x, p.y);
  };

  /* ---------- Campo ---------- */
  SIT['campo.plantacao'] = K => {
    const { W, H, r, ri, sorte, P } = K, comRua = K.caminho !== 'nenhum', yr = Math.round(H * r(0.42, 0.58));
    if (comRua) K.poeCaminho([[-1, yr + 0.5], [W * 0.5, yr + 0.5 + r(-0.5, 0.5)], [W + 1, yr + 0.5]]);
    const meia = comRua ? hwDe(K.caminho) + 0.8 : 0.5, faixas = [[2, Math.floor(yr - meia) - 1], [Math.ceil(yr + meia) + 1, H - 2]];
    const cortes = [2].concat(ri(1, 2) === 1 ? [Math.round(W * r(0.4, 0.6))] : [Math.round(W * r(0.28, 0.38)), Math.round(W * r(0.62, 0.72))]).concat([W - 2]);
    const culturas = ['trigo', 'milho', 'horta'].sort(() => K.rT() - 0.5).concat(['trigo', 'horta', 'milho']);
    let n = 0, cercou = 0, espantou = false;
    for (const [y0, y1] of faixas) for (let i = 0; i < cortes.length - 1; i++) {
      const x0 = cortes[i] + (i ? 1 : 0), x1 = cortes[i + 1] - 1, h = y1 - y0;
      if (x1 - x0 < 3 || h < 3) continue;
      const cultura = culturas[n++ % culturas.length], q = { x: x0, y: y0, w: x1 - x0, h };
      K.pinta(0, 'plantacao', Object.assign({ cultura }, q)); K.marcaPoli([[q.x, q.y], [q.x + q.w, q.y], [q.x + q.w, q.y + q.h], [q.x, q.y + q.h]], 5, true);
      if (cultura === 'milho') { P.relevo.push({ t: 'mata', alt: 0, k: 'rect', x: q.x, y: q.y, w: q.w, h: q.h }); P.cobertura.push({ x: q.x + q.w / 2, y: q.y + q.h / 2, r: Math.min(q.w, q.h) / 2 }); }
      if (cercou < 2 && sorte(0.5)) { cercou++; const m = 0.35; K.pinta(1, 'cerca', { pts: [[q.x - m + 1.5, q.y - m], [q.x - m, q.y - m], [q.x - m, q.y + q.h + m], [q.x + q.w + m, q.y + q.h + m], [q.x + q.w + m, q.y - m], [q.x + 3, q.y - m]] }); }
      if (!espantou && cultura !== 'milho' && sorte(0.6)) { espantou = true; K.pinta(2, 'espantalho', { x: q.x + q.w / 2 + r(-1, 1), y: q.y + q.h / 2 + r(-0.5, 0.5), ang: r(-0.3, 0.3) }); }
    }
    for (let k = 0; k < ri(2, 4); k++) { const l = K.lugar(0.6); if (l) { K.pinta(2, 'feno', { x: l[0], y: l[1], r: 0.45 }); K.marcaCirc(l[0], l[1], 0.5, 4, true); } }
    P.dens = (x, y) => (Math.min(x, y, W - x, H - y) < 2.5 ? 3 : 0.2);
    K.foco(W / 2, yr);
  };
  SIT['campo.moinho'] = K => {
    const { W, H, r, ri, sorte, P } = K, esq = sorte(0.5), cima = sorte(0.5);
    // o moinho (redondo, fechado, com as pás por cima) e o celeiro (comprido, fechado)
    const mx = esq ? Math.round(W * r(0.18, 0.28)) : Math.round(W * r(0.62, 0.7)), my = cima ? Math.round(H * r(0.15, 0.25)) : Math.round(H * r(0.55, 0.65));
    const moinho = K.predio({ tipo: 'armazem', x: mx, y: my, w: 5, h: 5, forma: 'oct', lado: cima ? 's' : 'n', interior: 'armazem' });
    K.pinta(3, 'pas', { x: mx + 2.5, y: my + 2.5, r: 3.4, ang: r(0, Math.PI / 2) });
    const cw = ri(6, 7), ch = 5, cxp = esq ? Math.round(W * r(0.55, 0.62)) : Math.round(W * r(0.15, 0.22)), cyp = cima ? Math.round(H * r(0.55, 0.62)) : Math.round(H * r(0.14, 0.2));
    K.predio({ tipo: 'armazem', x: cxp, y: cyp, w: cw, h: ch, forma: 'ret', lado: cima ? 'n' : 's', interior: 'armazem' });
    // o curral com o feno entre os dois, e uma plantação pequena
    const kx = (mx + cxp + cw) / 2, ky = (my + cyp + ch) / 2;
    for (let k = 0; k < ri(2, 3); k++) { const l = [kx + r(-3, 3), ky + r(-2, 2)]; if (K.livreCirc(l[0], l[1], 0.6)) { K.pinta(2, 'feno', { x: l[0], y: l[1], r: 0.45 }); K.marcaCirc(l[0], l[1], 0.5, 4, true); } }
    const cq = { x: Math.round(kx - 4), y: Math.round(ky - 2.5), w: 8, h: 5 };
    if (cq.x > 1 && cq.y > 1 && cq.x + cq.w < W - 1 && cq.y + cq.h < H - 1 && K.livreCirc(kx, ky, 2.2, v => v === 0 || v === 4)) K.pinta(1, 'cerca', { pts: [[cq.x + 2, cq.y], [cq.x, cq.y], [cq.x, cq.y + cq.h], [cq.x + cq.w, cq.y + cq.h], [cq.x + cq.w, cq.y], [cq.x + 4, cq.y]] });
    const lugarP = K.lugar(3.4, v => v === 0);
    if (lugarP) { const q = { x: Math.round(lugarP[0] - 3), y: Math.round(lugarP[1] - 2), w: 6, h: 4, cultura: K.pick(['trigo', 'horta']) }; K.pinta(0, 'plantacao', q); K.marcaPoli([[q.x, q.y], [q.x + q.w, q.y], [q.x + q.w, q.y + q.h], [q.x, q.y + q.h]], 5, true); }
    if (sorte(0.4)) { const l = K.lugar(2.6); if (l) K.poeLago(blob(K.rT, l[0], l[1], r(1.8, 2.4), r(1.3, 1.8), 12, 0.2), 'agua', -1); }
    if (K.caminho !== 'nenhum') K.poeCaminho([[esq ? W + 1 : -1, ky + r(-3, 3)], [kx + (esq ? 6 : -6), ky + r(-1, 1)], [kx, ky]]);
    P.dens = (x, y) => (Math.min(x, y, W - x, H - y) < 3 ? 2.5 : 0.4);
    K.foco(kx, ky);
  };
  SIT['campo.capim'] = K => {
    const { W, H, r, ri, P } = K;
    for (let k = 0; k < ri(3, 5); k++) { const l = K.lugar(2.4); if (!l) continue; const pts = blob(K.rT, l[0], l[1], r(3, 6), r(2, 4), 14, 0.3, r(0, 3)); K.mancha(pts, CH.capimAlto, { capim: ['#ecd88a', '#6e6230', '#d8c070'] }); K.marcaPoli(pts, 6); P.relevo.push({ t: 'mata', alt: 0, k: 'poly', pts }); P.cobertura.push({ x: l[0], y: l[1], r: 2.4 }); }
    for (let k = 0; k < ri(2, 3); k++) { const l = K.lugar(1.8, v => v === 0 || v === 6); if (l) K.arvore(l[0], l[1], r(1.4, 1.8), 'acacia'); }
    for (let k = 0; k < ri(2, 3); k++) { const l = K.lugar(0.9); if (l) { P.rochas.push({ x: l[0], y: l[1], r: r(0.55, 0.7), cores: ['#b58a5a', '#8a6038', '#5a3e22'] }); K.marcaCirc(l[0], l[1], 0.6, 3, true); P.relevo.push({ t: 'morro', alt: 1.5, k: 'ell', x: l[0] - 0.6, y: l[1] - 0.55, w: 1.2, h: 1.1 }); } }
    if (K.caminho !== 'nenhum') { const y0 = H * r(0.3, 0.7); K.poeCaminho([[-1, y0], [W * 0.4, y0 + r(-3, 3)], [W * 0.7, y0 + r(-3, 3)], [W + 1, y0 + r(-2, 2)]]); }
    P.densBase = 0.012;
    K.foco(W / 2, H / 2);
  };
  SIT['campo.morro'] = K => {
    const { W, H, r, ri, P } = K, cx = W * r(0.4, 0.6), cy = H * r(0.4, 0.6), pts = blob(K.rT, cx, cy, W * r(0.21, 0.26), H * r(0.23, 0.28), 18, 0.25);
    K.pinta(0, 'planalto', { pts, alt: 4, cores: ['#8aa05a', '#6f8a46', '#33402a'] }); K.marcaPoli(pts, 6); P.relevo.push({ t: 'morro', alt: 4, k: 'poly', pts }); P.tracado.push({ k: 'poli', pts });
    for (let k = 0; k < ri(2, 3); k++) { const l = K.lugar(1.3, v => v === 6, 60, (x, y) => Math.hypot(x - cx, y - cy) < 4); if (l) K.pedraGrande(l[0], l[1], r(0.85, 1.2)); }
    { const l = K.lugar(1.4, v => v === 6, 60, (x, y) => Math.hypot(x - cx, y - cy) < 5); if (l) { K.arvore(l[0], l[1], r(1.3, 1.6), Estilos.de(K.estilo).arvore.campo); P.cobertura.push({ x: l[0], y: l[1], r: 1.2 }); } }
    for (let k = 0; k < 5; k++) { const l = K.lugar(0.5, v => v === 6 || v === 0); if (l) P.rochas.push({ x: l[0], y: l[1], r: r(0.3, 0.55) }); }
    if (K.caminho !== 'nenhum') { const s = K.sorte(0.5) ? 1 : -1, ry = H * 0.28; K.poeCaminho([[-1, cy + s * ry * 0.7], [cx - W * 0.25, cy + s * ry * 1.1], [cx, cy + s * (ry + 2.4)], [cx + W * 0.25, cy + s * ry * 1.1], [W + 1, cy + s * ry * 0.7]]); }
    K.foco(cx, cy);
  };

  /* ---------- Selva ---------- */
  SIT['selva.mata'] = K => {
    const { W, H, r, ri, P } = K, cx = W * r(0.4, 0.6), cy = H * r(0.4, 0.6), R = r(2.4, 3.2);
    P.densBase = 0.24; P.dens = (x, y) => (Math.hypot(x - cx, y - cy) < R ? 0 : 1);
    for (let k = 0; k < ri(3, 5); k++) { const l = K.lugar(2.2, null, 60, (x, y) => Math.hypot(x - cx, y - cy) > R + 3); if (!l) continue; const pts = blob(K.rT, l[0], l[1], r(2.4, 3.6), r(1.6, 2.6), 12, 0.3, r(0, 3)); K.mancha(pts, CH.mataEscura, { capim: ['#4f7a3f', '#203a1d'] }); P.relevo.push({ t: 'mata', alt: 0, k: 'poly', pts }); P.cobertura.push({ x: l[0], y: l[1], r: 2 }); }
    for (let k = 0; k < ri(1, 2); k++) { const l = K.lugar(1.8); if (l) K.zona('espinhos', l[0], l[1], { r: r(1.4, 2) }); }
    if (K.caminho !== 'nenhum') K.poeCaminho([[-1, cy + r(-4, 4)], [cx - R - 2, cy + r(-2, 2)], [cx, cy], [cx + R + 2, cy + r(-2, 2)], [W + 1, cy + r(-4, 4)]]);
    K.foco(cx, cy);
  };
  SIT['selva.cachoeira'] = K => {
    const { W, H, r, P } = K, yb = H * r(0.36, 0.46);
    // a beira do penhasco (de um lado ao outro) e o rio que cai dela
    const beira = []; for (let x = -2; x <= W + 2; x += 2) beira.push([x, yb + r(-0.8, 0.8)]);
    const xr = W * r(0.35, 0.65), yr = beira.reduce((m, p) => (Math.abs(p[0] - xr) < Math.abs(m[0] - xr) ? p : m))[1];
    const hwR = r(1, 1.3);
    // a parede do penhasco: uma faixa de rocha, com o vão da queda d'água
    const pedacoE = beira.filter(([x]) => x < xr - hwR - 0.3), pedacoD = beira.filter(([x]) => x > xr + hwR + 0.3);
    if (pedacoE.length > 1) K.poePenhasco(faixa(pedacoE.concat([[xr - hwR - 0.3, yr]]), 0.75, K.rT, 0.2), 6);
    if (pedacoD.length > 1) K.poePenhasco(faixa([[xr + hwR + 0.3, yr]].concat(pedacoD), 0.75, K.rT, 0.2), 6);
    // o rio: de cima até a beira, a queda, o poço embaixo e o rio de novo até a borda de baixo
    K.poeRio([[xr + r(-3, 3), -1], [xr + r(-2, 2), yr * 0.5], [xr, yr - 0.6]], hwR, 'agua', -1);
    const poco = blob(K.rT, xr, yr + 3.2, r(2.4, 3), r(1.9, 2.4), 14, 0.2);
    K.poeLago(poco, 'agua', -2);
    K.pinta(2, 'cachoeira', { x: xr, y: yr + 0.1, larg: hwR * 2 + 0.6, ang: Math.PI / 2 });
    const desce = K.poeRio([[xr, yr + 4.5], [xr + r(-3, 3), (yr + H) * 0.55 + 2], [xr + r(-4, 4), H + 1]], hwR * 0.9, 'agua', -1);
    const p = Paisagem.aoLongo(desce, 0.35); K.zona('correnteza', p.x, p.y, { k: 'rect', rw: 3.2, rh: hwR * 1.8, dir: Math.round(p.ang * 180 / Math.PI) });
    for (let k = 0; k < 2; k++) { const an = r(0, Math.PI), q = [xr + Math.cos(an) * 3.6, yr + 3.2 + Math.sin(an) * 3]; if (K.livreCirc(q[0], q[1], 1)) K.pedraGrande(q[0], q[1], r(0.8, 1.05), Paisagem.PEDRA.selva); }
    P.juncos = 0.15; P.densBase = 0.16;
    if (K.caminho !== 'nenhum') { const yc = (yr + H) / 2 + 2; K.poeCaminho([[-1, yc + r(-2, 2)], [W * 0.3, yc + r(-1, 1)], [W * 0.7, yc + r(-1, 1)], [W + 1, yc + r(-2, 2)]]); }
    K.foco(xr, yr + 3);
  };
  SIT['selva.colossal'] = K => {
    const { W, H, r, P } = K, cx = W * r(0.42, 0.58), cy = H * r(0.42, 0.58), R = r(2.6, 3.3);
    const raizes = [];
    for (let i = 0; i < 9; i++) { const an = (i / 9) * TAU + r(-0.2, 0.2), l = R * r(1.8, 3); raizes.push([[cx, cy], [cx + Math.cos(an + 0.2) * l * 0.55, cy + Math.sin(an + 0.2) * l * 0.55], [cx + Math.cos(an) * l, cy + Math.sin(an) * l]]); }
    K.pinta(2, 'troncoColossal', { x: cx, y: cy, r: R, raizes });
    K.marcaCirc(cx, cy, R, 3, true); K.visaoPoli(elipse(cx, cy, R * 0.95, R * 0.95, 12));
    for (const rz of raizes) { const pts = curva(rz, 0.6); K.marcaLinha(pts, 0.5, 6, true); P.relevo.push({ t: 'morro', alt: 1, k: 'free', pts: pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1), sw: 0.9 }); }
    P.cobertura.push({ x: cx, y: cy, r: R });
    P.tracado.push({ k: 'circ', x: cx, y: cy, r: R });
    K.pinta(3, 'luzSalpicada', {});
    P.densBase = 0.11; P.dens = (x, y) => (Math.hypot(x - cx, y - cy) < R * 2.2 ? 0 : 1);
    if (K.caminho !== 'nenhum') { const s = K.sorte(0.5) ? 1 : -1; K.poeCaminho([[-1, cy + s * 3], [cx - R * 2, cy + s * (R + 2.5)], [cx, cy + s * (R * 2.4)], [cx + R * 2, cy + s * (R + 2.5)], [W + 1, cy + s * 3]]); }
    K.foco(cx + R + 1.5, cy);
  };
  SIT['selva.flores'] = K => {
    const { W, H, r, ri, P } = K, flores = [];
    for (let k = 0, n = ri(6, 10), tent = 0; flores.length < n && tent < 120; tent++) {
      const rr = r(1.2, 2), l = K.lugar(rr + 0.3);
      if (!l || flores.some(f => Math.hypot(f[0] - l[0], f[1] - l[1]) < f[2] + rr + 0.8)) continue;
      flores.push([l[0], l[1], rr]);
      P.arvores.push({ x: l[0], y: l[1], r: rr, esp: 'flor', cor: K.pick(['#e85d75', '#f2c94c', '#9b7bd8', '#ff8a3a', '#f4f0ff', '#5fc0e8']) });
      K.marcaCirc(l[0], l[1], rr * 0.8, 4, true); P.cobertura.push({ x: l[0], y: l[1], r: rr * 0.8 });
    }
    const maior = flores.slice().sort((a, b) => b[2] - a[2])[0] || [W / 2, H / 2, 1];
    K.zona('esporos', maior[0], maior[1], { r: maior[2] + 1.2 });
    P.densBase = 0.1;
    if (K.caminho !== 'nenhum') { const y0 = H * r(0.3, 0.7); K.poeCaminho([[-1, y0], [W * 0.35, y0 + r(-3, 3)], [W * 0.65, y0 + r(-3, 3)], [W + 1, y0 + r(-2, 2)]]); }
    K.foco(maior[0], maior[1]);
  };

  /* ---------- Terra corrompida ---------- */
  SIT['corrompida.mortas'] = K => {
    const { W, H, r, ri, P } = K;
    for (let k = 0; k < ri(3, 5); k++) { const l = K.lugar(1.8); if (l) K.mancha(blob(K.rT, l[0], l[1], r(2, 3.5), r(1.4, 2.4), 12, 0.35), CH.rachado, { pedrisco: ['#6a5a73', '#1e1824'] }); }
    for (let k = 0; k < ri(1, 2); k++) { const l = K.lugar(2); if (l) K.zona('esporos', l[0], l[1], { r: r(2, 2.8) }); }
    { const l = K.lugar(2); if (l) K.zona('maldicao', l[0], l[1], { r: r(1.6, 2.2) }); }
    for (let k = 0; k < 4; k++) { const l = K.lugar(0.6); if (l) P.rochas.push({ x: l[0], y: l[1], r: r(0.35, 0.6) }); }
    P.densBase = 0.1;
    if (K.caminho !== 'nenhum') { const y0 = H * r(0.3, 0.7); K.poeCaminho([[-1, y0], [W * 0.35, y0 + r(-3, 3)], [W * 0.65, y0 + r(-3, 3)], [W + 1, y0 + r(-2, 2)]]); }
    K.foco(W / 2, H / 2);
  };
  SIT['corrompida.negros'] = K => {
    const { W, H, r, ri, P } = K, cs = [];
    for (let k = 0, n = ri(5, 8), tent = 0; cs.length < n && tent < 100; tent++) { const rr = r(1.2, 2), l = K.lugar(rr + 0.4); if (!l) continue; cs.push([l[0], l[1], rr]); K.cristalGrande(l[0], l[1], rr, 'negro'); }
    const maior = cs.slice().sort((a, b) => b[2] - a[2])[0] || [W / 2, H / 2, 1];
    K.zona('maldicao', maior[0] + maior[2] + 1, maior[1], { r: 2.2 });
    P.esp = 'cristalNegro'; P.densBase = 0.03;
    if (K.caminho !== 'nenhum') { const y0 = H * r(0.3, 0.7); K.poeCaminho([[-1, y0], [W * 0.35, y0 + r(-3, 3)], [W * 0.65, y0 + r(-3, 3)], [W + 1, y0 + r(-2, 2)]]); }
    K.foco(maior[0], maior[1]);
  };
  SIT['corrompida.lodo'] = K => {
    const { W, H, r, ri, P } = K, pocas = [];
    for (let k = 0, n = ri(3, 5), tent = 0; pocas.length < n && tent < 80; tent++) { const rx = r(2, 3.6), l = K.lugar(rx + 0.6); if (!l) continue; const pts = blob(K.rT, l[0], l[1], rx, rx * r(0.6, 0.85), 14, 0.25); K.poeLago(pts, 'lodo', -0.5); pocas.push([l[0], l[1], rx]); }
    for (const q of pocas.slice(0, ri(1, 2))) K.zona('toxica', q[0], q[1], { r: q[2] * 0.9 });
    P.densBase = 0.06;
    if (K.caminho !== 'nenhum') { const y0 = H * r(0.3, 0.7); K.poeCaminho([[-1, y0], [W * 0.3, y0 + r(-4, 4)], [W * 0.6, y0 + r(-4, 4)], [W + 1, y0 + r(-2, 2)]]); }
    const m = pocas[0] || [W / 2, H / 2, 1];
    K.foco(m[0] + m[2], m[1]);
  };
  SIT['corrompida.fenda'] = K => {
    const { W, H, r, P } = K, horizontal = K.sorte(0.5), L = horizontal ? W : H, M = horizontal ? H : W, Q = (a, b) => (horizontal ? [a, b] : [b, a]);
    const pts = []; for (let t = -2; t <= L + 2; t += r(2.4, 3.6)) pts.push(Q(t, M / 2 + r(-M * 0.18, M * 0.18)));
    const larg = r(1.1, 1.6), meio = curva(pts, 0.8);
    K.pinta(0, 'fenda', { pts: meio, larg, brilho: K.pick(['#c06cff', '#6cff9a']) });
    K.marcaLinha(meio, larg / 2 + 0.2, 7, true);
    P.relevo.push({ t: 'fosso', alt: -6, k: 'free', pts: meio.filter((_, i) => i % 2 === 0 || i === meio.length - 1), sw: larg });
    P.tracado.push({ k: 'linha', pts: meio, hw: larg / 2 });
    const p = Paisagem.aoLongo(meio, r(0.38, 0.62));
    K.ponte(p.x, p.y, larg + 2.2, 1.6, p.ang + Math.PI / 2, 'pedra', 0.5);
    for (let t = 0.1; t < 1; t += 0.18) { const q = Paisagem.aoLongo(meio, t); K.luz(q.x, q.y, 3, '#b06cf0'); }
    K.zona('maldicao', p.x + Math.cos(p.ang) * 4, p.y + Math.sin(p.ang) * 4, { r: 2 });
    P.densBase = 0.06;
    if (K.caminho !== 'nenhum') { const a = p.ang + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), d = Math.max(W, H); K.poeCaminho([[p.x - ca * d, p.y - sa * d], [p.x - ca * 3, p.y - sa * 3], [p.x, p.y], [p.x + ca * 3, p.y + sa * 3], [p.x + ca * d, p.y + sa * d]]); }
    K.foco(p.x, p.y);
  };

  /* ---------- Lava ---------- */
  function rioDeLava(K, hw) {
    const { W, H, r, sorte } = K, vertical = sorte(0.5), L = vertical ? H : W, M = vertical ? W : H, Q = (a, b) => (vertical ? [a, b] : [b, a]), c0 = M * r(0.4, 0.6);
    const rio = K.poeRio([Q(c0 + r(-3, 3), -1), Q(c0 + r(-4, 4), L * 0.33), Q(c0 + r(-4, 4), L * 0.66), Q(c0 + r(-3, 3), L + 1)], hw, 'lava', -1);
    const n = Math.max(3, Math.round(Paisagem.compr(rio) / 5));
    // a zona da lava acompanha o rio: um retângulo girado em cada trecho (encostados, sem buracos)
    for (let k = 0; k < n; k++) { const a = Paisagem.aoLongo(rio, k / n), b = Paisagem.aoLongo(rio, (k + 1) / n); K.zona('lava', (a.x + b.x) / 2, (a.y + b.y) / 2, { k: 'rect', rw: Math.hypot(b.x - a.x, b.y - a.y) + 0.5, rh: hw * 2, dir: Math.round(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI) }); }
    for (let t = 0.1; t < 1; t += 0.2) { const p = Paisagem.aoLongo(rio, t); K.luz(p.x, p.y, 6, '#ff8a3a'); }
    return { rio, vertical };
  }
  SIT['lava.rio'] = K => {
    const { W, H, r, P } = K, hw = r(1.1, 1.5), { rio, vertical } = rioDeLava(K, hw);
    const ctrl = vertical ? [[-1, H * r(0.35, 0.65)], [W * 0.5, H * r(0.4, 0.6)], [W + 1, H * r(0.35, 0.65)]] : [[W * r(0.35, 0.65), -1], [W * r(0.4, 0.6), H * 0.5], [W * r(0.35, 0.65), H + 1]];
    const x = (K.caminho !== 'nenhum' && cruzamento(curva(ctrl), rio)) || Paisagem.aoLongo(rio, r(0.4, 0.6));
    const atrav = (x.angB != null ? x.angB : x.ang) + Math.PI / 2, pedras = [];
    for (let t = -hw - 0.15; t <= hw + 0.2; t += 0.62) pedras.push([x.x + Math.cos(atrav) * t, x.y + Math.sin(atrav) * t]);
    K.pinta(1, 'pedras', { pts: pedras, cores: ['#4a423c', '#3a332e'] });
    for (const [px, py] of pedras) { K.marcaCirc(px, py, 0.45, 10, true); P.relevo.push({ t: 'plataforma', alt: 0.5, k: 'ell', x: px - 0.34, y: py - 0.27, w: 0.68, h: 0.54, a: 0.3 }); }
    P.tracado.push({ k: 'linha', pts: pedras, hw: 0.4 });
    if (K.caminho !== 'nenhum') K.poeCaminho(ctrl);
    for (let k = 0; k < 3; k++) K.pedraGrandeLivre(r(0.8, 1.1), Paisagem.PEDRA.basalto);
    K.foco(x.x, x.y);
  };
  SIT['lava.ponte'] = K => {
    const { W, H, r } = K, hw = r(1.4, 1.9), { rio, vertical } = rioDeLava(K, hw), tipo = K.camOuTrilha();
    const ctrl = vertical ? [[-1, H * r(0.35, 0.65)], [W * 0.5, H * r(0.4, 0.6)], [W + 1, H * r(0.35, 0.65)]] : [[W * r(0.35, 0.65), -1], [W * r(0.4, 0.6), H * 0.5], [W * r(0.35, 0.65), H + 1]];
    const x = cruzamento(curva(ctrl), rio) || Paisagem.aoLongo(rio, 0.5);
    K.ponte(x.x, x.y, hw * 2 + 2.2, hwDe(tipo) * 2 + 0.6, x.angB != null ? x.ang : x.ang + Math.PI / 2, 'pedra', 1);
    K.poeCaminho(ctrl, tipo);
    for (let k = 0; k < 3; k++) K.pedraGrandeLivre(r(0.8, 1.1), Paisagem.PEDRA.basalto);
    K.foco(x.x, x.y);
  };
  SIT['lava.basalto'] = K => {
    const { W, H, r, ri, P } = K, R0 = 0.62, centros = [];
    for (let k = 0, tent = 0; centros.length < ri(3, 4) && tent < 60; tent++) { const l = K.lugar(3.2); if (l && !centros.some(q => Math.hypot(q[0] - l[0], q[1] - l[1]) < 7)) centros.push(l); }
    let n = 0;
    for (const [cx, cy] of centros) {
      const raio = r(2.4, 3.6), hx = R0 * Math.sqrt(3);
      for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) {
        const x = cx + i * hx + (j % 2 ? hx / 2 : 0), y = cy + j * R0 * 1.5, d = Math.hypot(x - cx, y - cy);
        if (d > raio || n >= 48 || !K.livreCirc(x, y, R0 * 0.9, v => v === 0 || v === 6) || !K.dentro(x, y, 1)) continue;
        if (K.rT() < 0.15) continue;
        const alt = Math.round(clamp(3.2 - d * 0.7 + r(-0.5, 0.5), 0.5, 3) * 2) / 2;
        const hex = []; for (let k = 0; k < 6; k++) { const an = Math.PI / 6 + (k * Math.PI) / 3; hex.push([x + Math.cos(an) * R0, y + Math.sin(an) * R0]); }
        K.pinta(1, 'basalto', { x, y, r: R0, alt }); K.marcaPoli(hex, 6, true); P.relevo.push({ t: 'montanha', alt, k: 'poly', pts: hex, a: 0.16 }); n++;
      }
      P.cobertura.push({ x: cx, y: cy, r: 2 });
      P.tracado.push({ k: 'circ', x: cx, y: cy, r: raio });
    }
    // as rachaduras com a lava brilhando entre os grupos de colunas, e as brasas
    for (let k = 0; k < ri(2, 3); k++) { const a = [r(1, W - 1), r(1, H - 1)], an = r(0, TAU), l = r(5, 9), pts = curva([a, [a[0] + Math.cos(an + 0.4) * l * 0.5, a[1] + Math.sin(an + 0.4) * l * 0.5], [a[0] + Math.cos(an) * l, a[1] + Math.sin(an) * l]], 0.6); K.pinta(0, 'fenda', { pts, larg: 0.35, brilho: '#ff8a2a', cores: ['#1c1714', '#3a1206'] }); const m = Paisagem.aoLongo(pts, 0.5); K.luz(m.x, m.y, 3, '#ff8a3a'); K.zona('brasas', m.x, m.y, { r: r(1.2, 1.8) }); }
    if (K.caminho !== 'nenhum') { const y0 = H * r(0.3, 0.7); K.poeCaminho([[-1, y0], [W * 0.35, y0 + r(-3, 3)], [W * 0.65, y0 + r(-3, 3)], [W + 1, y0 + r(-2, 2)]]); }
    const c = centros[0] || [W / 2, H / 2]; K.foco(c[0], c[1]);
  };
  SIT['lava.vulcao'] = K => {
    const { W, H, r, ri, P } = K, cx = W * r(0.35, 0.65), cy = H * r(0.35, 0.65), rx = W * r(0.2, 0.26), ry = H * r(0.2, 0.26);
    const lago = blob(K.rT, cx, cy, rx, ry, 18, 0.12);
    K.poeLago(lago, 'lava', -2);
    K.pinta(1, 'cratera', { x: cx, y: cy, rx, ry });
    const borda = elipse(cx, cy, rx * 1.12, ry * 1.12, 28); borda.push(borda[0].slice());
    K.marcaLinha(borda, 0.8, 6, true); P.relevo.push({ t: 'morro', alt: 2, k: 'free', pts: borda, sw: 1.6 });
    for (let k = 0; k < ri(3, 4); k++) { const an = (k / 4) * TAU + r(-0.3, 0.3); K.zona('lava', cx + Math.cos(an) * rx * 0.45, cy + Math.sin(an) * ry * 0.45, { r: Math.min(rx, ry) * 0.55 }); }
    for (let k = 0; k < ri(2, 3); k++) { const an = r(0, TAU); K.zona('brasas', cx + Math.cos(an) * rx * 1.35, cy + Math.sin(an) * ry * 1.35, { r: r(1.2, 1.8) }); }
    for (let k = 0; k < 5; k++) { const an = (k / 5) * TAU; K.luz(cx + Math.cos(an) * rx * 0.7, cy + Math.sin(an) * ry * 0.7, 7, '#ff8a3a'); }
    P.cobertura.push({ x: cx + rx * 1.3, y: cy, r: 1.2 }, { x: cx - rx * 1.3, y: cy, r: 1.2 });
    if (K.caminho !== 'nenhum') { const s = K.sorte(0.5) ? 1 : -1; K.poeCaminho([[-1, cy + s * ry * 0.8], [cx - rx * 1.2, cy + s * ry * 1.2], [cx, cy + s * (ry + 2.6)], [cx + rx * 1.2, cy + s * ry * 1.2], [W + 1, cy + s * ry * 0.8]]); }
    for (let k = 0; k < 2; k++) K.pedraGrandeLivre(r(0.8, 1.1), Paisagem.PEDRA.basalto);
    K.foco(cx, cy + ry * 1.3);
  };

  /* ---------- Cristais ---------- */
  SIT['cristais.gruta'] = K => {
    const { W, H, r, ri, P } = K, lado = K.pick(['o', 'l', 'n', 's']);
    // o chão da gruta (um contorno grande e torto); a entrada encosta numa borda; o resto é rocha
    const chao = blob(K.rT, W / 2, H / 2, W * 0.43, H * 0.41, 24, 0.22).map(([x, y]) => {
      if (lado === 'o' && x < W * 0.25 && Math.abs(y - H / 2) < H * 0.16) return [-1, y];
      if (lado === 'l' && x > W * 0.75 && Math.abs(y - H / 2) < H * 0.16) return [W + 1, y];
      if (lado === 'n' && y < H * 0.25 && Math.abs(x - W / 2) < W * 0.12) return [x, -1];
      if (lado === 's' && y > H * 0.75 && Math.abs(x - W / 2) < W * 0.12) return [x, H + 1];
      return [x, y];
    });
    K.encher(3);
    K.marcaPoli(chao, 0, true);
    P.cavernas.push({ chao });
    K.visaoPoli(chao);
    for (let k = 0, n = ri(6, 9); k < n; k++) { const rr = r(1.1, 1.7), l = K.lugar(rr + 0.3); if (l) K.cristalGrande(l[0], l[1], rr, 'azul'); }
    { const l = K.lugar(2.2); if (l) K.poeLago(blob(K.rT, l[0], l[1], r(1.6, 2.2), r(1.2, 1.6), 12, 0.2), 'espelho', -1); }
    P.esp = 'cristal'; P.densBase = 0.035;
    P.marcas.chegada = lado === 'o' ? [0.6, H / 2 - 0.5] : lado === 'l' ? [W - 1.6, H / 2 - 0.5] : lado === 'n' ? [W / 2 - 0.5, 0.6] : [W / 2 - 0.5, H - 1.6];
    K.foco(W / 2, H / 2);
  };
  SIT['cristais.campo'] = K => {
    const { W, H, r, ri, P } = K;
    for (let k = 0; k < ri(3, 4); k++) { const l = K.lugar(2); if (l) K.mancha(blob(K.rT, l[0], l[1], r(2.4, 4), r(1.8, 3), 12, 0.3), CH.cristalClaro, { pedrisco: ['#a8c8e6', '#3f4855'] }); }
    for (let k = 0, n = ri(6, 9); k < n; k++) { const rr = r(1.1, 1.8), l = K.lugar(rr + 0.4); if (l) K.cristalGrande(l[0], l[1], rr, 'azul', K.rT() < 0.6); }
    P.esp = 'cristal'; P.densBase = 0.035;
    if (K.caminho !== 'nenhum') { const y0 = H * r(0.3, 0.7); K.poeCaminho([[-1, y0], [W * 0.35, y0 + r(-3, 3)], [W * 0.65, y0 + r(-3, 3)], [W + 1, y0 + r(-2, 2)]]); }
    K.foco(W / 2, H / 2);
  };
  SIT['cristais.geodo'] = K => {
    const { W, H, r, ri, P } = K, cx = W * r(0.44, 0.56), cy = H * r(0.44, 0.56), R = Math.min(W, H) * r(0.28, 0.32), n = ri(13, 16), vao = r(0, TAU);
    const chao = elipse(cx, cy, R * 0.92, R * 0.92, 24);
    K.mancha(chao, ['#5e5a7a', '#6e6a8e', '#524e6a', '#7a76a0'], { pedrisco: ['#d6d0ff', '#3a3650'] }); K.marcaPoli(chao, 5);
    for (let k = 0; k < n; k++) {
      const an = (k / n) * TAU, d = Math.abs(((an - vao + Math.PI * 3) % TAU) - Math.PI);
      if (d < 0.42) continue;
      K.cristalGrande(cx + Math.cos(an) * R, cy + Math.sin(an) * R, r(1.1, 1.5), 'azul', k % 3 === 0);
    }
    K.cristalGrande(cx, cy, 2, 'azul', true);
    P.tracado.push({ k: 'circ', x: cx, y: cy, r: R + 1.2 });
    P.dens = (x, y) => (Math.hypot(x - cx, y - cy) < R + 1.6 ? 0 : 1);
    P.esp = 'cristal'; P.densBase = 0.03;
    const gx = cx + Math.cos(vao) * (R + 3), gy = cy + Math.sin(vao) * (R + 3);
    if (K.caminho !== 'nenhum') { const d = Math.max(W, H); K.poeCaminho([[cx + Math.cos(vao) * d, cy + Math.sin(vao) * d], [gx, gy], [cx + Math.cos(vao) * R * 0.5, cy + Math.sin(vao) * R * 0.5]]); }
    K.foco(cx + Math.cos(vao) * R * 0.5, cy + Math.sin(vao) * R * 0.5);
  };
  SIT['cristais.lago'] = K => {
    const { W, H, r, ri, P } = K, cx = W * r(0.42, 0.58), cy = H * r(0.42, 0.58), rx = W * r(0.2, 0.25), ry = H * r(0.22, 0.26);
    const lago = blob(K.rT, cx, cy, rx, ry, 18, 0.2);
    K.poeLago(lago, 'espelho', -1);
    // a ilhota com um cristal no meio do lago
    const il = blob(K.rT, cx + r(-1, 1), cy + r(-1, 1), 1.4, 1.1, 10, 0.25);
    K.pinta(1, 'mancha', { pts: il, cores: CH.gruta }); K.marcaPoli(il, 5, true); P.relevo.push({ t: 'morro', alt: 0.5, k: 'poly', pts: il });
    K.cristalGrande(cx, cy, 1, 'azul', true);
    for (let k = 0, n = ri(6, 8); k < n; k++) { const an = (k / n) * TAU + r(-0.2, 0.2), q = [cx + Math.cos(an) * (rx + 2), cy + Math.sin(an) * (ry + 1.8)]; if (K.dentro(q[0], q[1], 1.5) && K.livreCirc(q[0], q[1], 1.1)) K.cristalGrande(q[0], q[1], r(1, 1.5), 'azul', k % 2 === 0); }
    P.esp = 'cristal'; P.densBase = 0.03;
    if (K.caminho !== 'nenhum') { const s = K.sorte(0.5) ? 1 : -1; K.poeCaminho([[-1, cy + s * ry], [cx - rx * 1.3, cy + s * ry * 1.2], [cx, cy + s * (ry + 3.2)], [cx + rx * 1.3, cy + s * ry * 1.2], [W + 1, cy + s * ry]]); }
    K.foco(cx, cy + ry + 1.5);
  };

  /* ---------- Água ---------- */
  const tamanhoDoNavio = (W, H) => { const L = clamp(Math.round(W * 0.6), 14, 24); return { L, B: clamp(Math.round(L * 0.3), 5, 8) }; };
  SIT['agua.navio'] = K => {
    const { W, H, r, ri, sorte, P } = K, { L, B } = tamanhoDoNavio(W, H), proa = sorte(0.5) ? 'l' : 'o';
    P.semVeg = true;
    const n = K.navio({ x: Math.round((W - L) / 2) + ri(-1, 1), y: Math.round((H - B) / 2) + ri(-1, 1), L, B, proa, seed: (K.rT() * 2147483000 | 0) + 1 });
    if (sorte(0.4)) { const cx = sorte(0.5) ? r(2, 5) : r(W - 5, W - 2), cy = sorte(0.5) ? r(2, 4) : r(H - 4, H - 2); for (let k = 0; k < ri(2, 3); k++) K.pedraGrande(cx + r(-1.5, 1.5), cy + r(-1, 1), r(0.8, 1.2), Paisagem.PEDRA.mar); K.pinta(1, 'espumaRoda', { x: cx, y: cy, r: 2.8 }); }
    for (let k = 0; k < ri(1, 2); k++) K.pinta(2, 'destrocos', { x: r(2, W - 2), y: sorte(0.5) ? r(1.5, n.y - 1.5) : r(n.y + B + 1.5, H - 1.5), r: 1.4, n: 7 });
    let emb = null;
    if (sorte(0.6)) { const ladoV = sorte(0.5) ? -1 : 1, bx = n.uX(L * 0.62), by = ladoV < 0 ? n.y - 1.3 : n.y + B + 1.3; if (by > 1 && by < H - 1) { K.pinta(2, 'barco', { x: bx, y: by, ang: 0, L: 3 }); K.marcaCirc(bx, by, 0.8, 8, true); emb = [bx - 0.5, by - 0.5]; } }
    // (sem o barco, a emboscada fica na proa, sempre a uns passos da chegada, mesmo num navio pequeno)
    const uCh = n.castelo ? n.castelo.w + 1.2 : 2;
    P.marcas.chegada = [n.uX(uCh) - 0.5, n.y + B / 2 - 0.5];
    P.marcas.emboscada = emb || [n.uX(Math.min(L - 1.2, Math.max(L - n.p - 1.2, uCh + 4.6))) - 0.5, n.y + B / 2 - 0.5];
    K.foco(n.x + L / 2, n.y + B / 2);
  };
  SIT['agua.abordagem'] = K => {
    const { W, H, r, ri, sorte, P } = K, { L, B } = tamanhoDoNavio(W, H), gap = 2, y0 = Math.round((H - (2 * B + gap)) / 2), x0 = Math.round((W - L) / 2);
    P.semVeg = true;
    const a = K.navio({ x: x0 + ri(-1, 1), y: y0, L, B, proa: 'l', seed: (K.rT() * 2147483000 | 0) + 1 });
    const b = K.navio({ x: x0 + ri(-2, 2), y: y0 + B + gap, L, B, proa: sorte(0.5) ? 'l' : 'o', seed: (K.rT() * 2147483000 | 0) + 1 });
    // a prancha entre as aberturas das duas amuradas e os ganchos de abordagem (formas: as cordas)
    const xa = a.abertura.x, xb = b.abertura.x, ya = y0 + B, yb = y0 + B + gap, mx = (xa + xb) / 2, my = (ya + yb) / 2, comp = Math.hypot(xb - xa, yb - ya) + 0.8;
    K.ponte(mx, my, comp, 1, Math.atan2(yb - ya, xb - xa), null, null);
    for (let k = 0; k < ri(3, 4); k++) { const xg = x0 + 2 + r(0, L - 4); if (Math.abs(xg - mx) < 2) continue; P.formas.push({ k: 'free', pts: [[xg, ya - 0.1], [xg + r(-0.6, 0.6), my + r(-0.2, 0.2)], [xg + r(-0.8, 0.8), yb + 0.1]], s: '#c9a86a', sw: 0.07, a: 0.95 }); }
    P.marcas.chegada = [a.uX(a.castelo ? a.castelo.w + 1.2 : 2) - 0.5, a.y + B / 2 - 0.5];
    P.marcas.emboscada = [b.uX(L * 0.55) - 0.5, b.y + B / 2 - 0.5];
    K.foco(mx, my);
  };
  SIT['agua.barco'] = K => {
    const { W, H, r, sorte, P } = K, horizontal = W >= H, hw = r(2.6, 3.4), Q = (a, b) => (horizontal ? [a, b] : [b, a]), L = horizontal ? W : H, M = horizontal ? H : W, c0 = M * r(0.42, 0.58);
    const rio = K.poeRio([Q(-1, c0 + r(-2, 2)), Q(L * 0.33, c0 + r(-2, 2)), Q(L * 0.66, c0 + r(-2, 2)), Q(L + 1, c0 + r(-2, 2))], hw, 'agua', -2);
    const p = Paisagem.aoLongo(rio, r(0.38, 0.55));
    K.pinta(2, 'barco', { x: p.x, y: p.y, ang: p.ang, L: 3 }); K.marcaCirc(p.x, p.y, 0.9, 8, true);
    // o píer numa das margens, perto do barco
    const lado = sorte(0.5) ? 1 : -1, nx = -Math.sin(p.ang) * lado, ny = Math.cos(p.ang) * lado, q = Paisagem.aoLongo(rio, r(0.6, 0.72));
    const pc = [q.x + nx * (hw - 0.4), q.y + ny * (hw - 0.4)], pts = Estilos.retangulo(pc[0], pc[1], 3, 1.1, q.ang + Math.PI / 2);
    const bx = Paisagem.caixa(pts);
    K.pinta(1, 'pier', { x: bx[0], y: bx[1], w: bx[2] - bx[0], h: bx[3] - bx[1] }); K.marcaPoli(pts, 1, true); P.relevo.push({ t: 'plataforma', alt: 0.5, k: 'poly', pts });
    for (const t of [0.22, 0.8]) { const c = Paisagem.aoLongo(rio, t); K.zona('correnteza', c.x, c.y, { k: 'rect', rw: 4, rh: hw * 1.5, dir: Math.round(c.ang * 180 / Math.PI) }); }
    P.juncos = 0.5; P.densBase = 0.08;
    if (K.caminho !== 'nenhum') { const d = hw + 2.4; K.poeCaminho(rio.filter((_, i) => i % 4 === 0).map(([x, y], i, arr) => { const a = arr[Math.min(arr.length - 1, i + 1)], b = arr[Math.max(0, i - 1)], an = Math.atan2(a[1] - b[1], a[0] - b[0]); return [x - Math.sin(an) * d * lado, y + Math.cos(an) * d * lado]; })); }
    P.marcas.chegada = [p.x - 0.5, p.y - 0.5];
    K.foco(p.x, p.y);
  };
  SIT['agua.naufragio'] = K => {
    const { W, H, r, ri, P } = K, { L, B } = tamanhoDoNavio(W, H), terraEmBaixo = K.sorte(0.5);
    K.encher(2);
    // a terra (um lado), a praia e a espuma na beira
    const yb = terraEmBaixo ? H * r(0.55, 0.62) : H * r(0.38, 0.45), beira = []; for (let x = -2; x <= W + 2; x += 2) beira.push([x, yb + r(-1, 1)]);
    const terra = beira.concat(terraEmBaixo ? [[W + 2, H + 2], [-2, H + 2]] : [[W + 2, -2], [-2, -2]]);
    const praia = faixa(beira, 1.4, K.rT, 0.6);
    K.mancha(terra, CH.grama, { capim: ['#8aa85a', '#4f6e3a'] }); K.marcaPoli(terra, 0, true);
    K.pinta(1, 'praia', { pts: praia }); K.pinta(1, 'espuma', { pts: beira.map(([x, y]) => [x, y + (terraEmBaixo ? -1.4 : 1.4)]) });
    // o navio encalhado, metade na água: a amurada quebrada, o mastro caído
    const n = K.navio({ x: Math.round((W - L) / 2) + ri(-2, 2), y: Math.round(terraEmBaixo ? yb - B - 0.5 : yb + 0.5), L, B, proa: K.sorte(0.5) ? 'l' : 'o', seed: (K.rT() * 2147483000 | 0) + 1 });
    n.danificado = { mar: terraEmBaixo ? 'n' : 's', quebra: [] };
    const tira = new Set(); for (let k = 0; k < 3; k++) tira.add(ri(0, n.amurada.length - 1));
    n.amurada = n.amurada.filter((_, i) => !tira.has(i));
    for (let k = 0; k < ri(3, 5); k++) { const x = r(2, W - 2), y = terraEmBaixo ? r(1.5, n.y - 0.5) : r(n.y + B + 0.5, H - 1.5); if (K.livreCirc(x, y, 1, v => v === 2)) { K.pedraGrande(x, y, r(0.75, 1.1), Paisagem.PEDRA.mar); K.pinta(1, 'espumaRoda', { x, y, r: 1.4 }); } }
    for (let k = 0; k < 2; k++) K.pinta(2, 'destrocos', { x: r(3, W - 3), y: terraEmBaixo ? yb + r(1.5, 3) : yb - r(1.5, 3), r: 1.6, n: 8 });
    for (const id of ['barril', 'caixote', 'barril', 'caixote']) { const l = K.lugar(0.6, v => v === 0, 60, (x, y) => (terraEmBaixo ? y > yb + 1 : y < yb - 1)); if (l) K.objeto(id, Math.floor(l[0]), Math.floor(l[1]), Math.floor(r(0, 4)) * 90); }
    P.esp = 'palmeira'; P.densBase = 0.03; P.dens = (x, y) => (terraEmBaixo ? (y > yb + 2 ? 1 : 0) : (y < yb - 2 ? 1 : 0));
    const ch = K.lugar(0.6, v => v === 0, 80, (x, y) => (terraEmBaixo ? y > yb + 2 : y < yb - 2) && (x < 4 || x > W - 4));
    P.marcas.chegada = ch ? [ch[0] - 0.5, ch[1] - 0.5] : [1, terraEmBaixo ? H - 2 : 1];
    P.marcas.emboscada = [n.uX(n.castelo ? n.castelo.w + 1 : 2) - 0.5, n.y + B / 2 - 0.5];
    K.foco(n.x + L / 2, n.y + B / 2);
  };

  /* ================= o resto: a vegetação, os enfeites e os marcadores ================= */
  function especieDe(K, rnd) {
    const E = Estilos.de(K.estilo);
    switch (K.terreno) {
      case 'estrada': return E.arvore.campo;
      case 'floresta': return E.arvore.floresta;
      case 'deserto': return 'cacto';
      case 'montanha': return K.estilo === 'anao' ? 'rocha' : 'pinheiro';
      case 'pantano': return rnd() < 0.6 ? 'mangue' : 'morta';
      case 'neve': return E.arvore.neve === 'rocha' ? 'rocha' : 'pinheiro';
      case 'campo': return K.sit === 'capim' ? 'acacia' : E.arvore.campo;
      case 'selva': return rnd() < 0.82 ? 'selva' : 'palmeira';
      case 'corrompida': return 'morta';
      case 'lava': return 'carbonizada';
      case 'cristais': return 'cristal';
      default: return E.arvore.floresta;
    }
  }
  function vegetacao(K, rV) {
    const P = K.P, { W, H, at, pos } = K, E = Estilos.de(K.estilo);
    if (!P.semVeg) {
      const base = (P.densBase != null ? P.densBase : TER[K.terreno].dens) * (E.dens || 1);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        if (at(i, j) !== 0) continue;
        let colado = false;
        for (let b = -1; b <= 1 && !colado; b++) for (let a = -1; a <= 1 && !colado; a++) { const v = at(i + a, j + b); if (v === 1 || v === 3 || v === 8) colado = true; }
        if (colado) continue;
        const x = i + 0.5, y = j + 0.5, borda = Math.min(i, j, W - 1 - i, H - 1 - j), m = P.dens ? P.dens(x, y) : 1;
        const pr = base * m * (borda < 2 ? 1.5 : 1);
        if (rV() >= pr) continue;
        const esp = typeof P.esp === 'function' ? P.esp(x, y, rV) : P.esp || especieDe(K, rV), R = RAIO[esp] || [0.6, 1.1];
        P.arvores.push({ x: x + (rV() - 0.5) * 0.5, y: y + (rV() - 0.5) * 0.5, r: R[0] + rV() * (R[1] - R[0]), esp });
        pos(i, j, 4);
      }
    }
    // os juncos na beira da água
    if (P.juncos) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (at(i, j) !== 0) continue;
      let agua = false;
      for (let b = -1; b <= 1 && !agua; b++) for (let a = -1; a <= 1 && !agua; a++) if (at(i + a, j + b) === 2) agua = true;
      if (agua && rV() < P.juncos) { P.arvores.push({ x: i + 0.5 + (rV() - 0.5) * 0.4, y: j + 0.5 + (rV() - 0.5) * 0.4, r: 0.4 + rV() * 0.2, esp: 'juncos' }); pos(i, j, 4); }
    }
  }
  function enfeites(K, rV) {
    const P = K.P, { W, H } = K, ids = ENFEITES[K.terreno] || [], n = Math.round(W * H / 150);
    for (let k = 0, tent = 0; k < n && tent < 120 && ids.length; tent++) {
      const id = ids[Math.floor(rV() * ids.length) % ids.length], i = 1 + Math.floor(rV() * (W - 2)), j = 1 + Math.floor(rV() * (H - 2));
      if (K.objeto(id, i, j, Math.floor(rV() * 4) * 90, v => v === 0)) k++;
    }
    // as pedrinhas pintadas (só desenho)
    const pedras = { montanha: 10, deserto: 5, estrada: 3, floresta: 3, neve: 4, campo: 3, corrompida: 4, lava: 6, cristais: 3, pantano: 0, selva: 2, agua: 0 }[K.terreno] || 0;
    for (let k = 0, tent = 0; k < pedras && tent < 60; tent++) { const x = 0.5 + rV() * (W - 1), y = 0.5 + rV() * (H - 1); if (K.at(Math.floor(x), Math.floor(y)) !== 0) continue; P.rochas.push({ x, y, r: 0.25 + rV() * 0.3 }); K.pos(Math.floor(x), Math.floor(y), 4); k++; }
  }
  // um quadrado onde dá para ficar (a passagem do marcador), perto de (x, y)
  function lugarDePe(K, x, y, aguaVale) {
    const ok = v => v === 0 || v === 1 || v === 4 || v === 5 || v === 6 || v === 8 || v === 10 || (aguaVale && v === 2);
    for (let raio = 0; raio <= 9; raio++) for (let b = -raio; b <= raio; b++) for (let a = -raio; a <= raio; a++) {
      if (Math.max(Math.abs(a), Math.abs(b)) !== raio) continue;
      const i = Math.floor(x) + a, j = Math.floor(y) + b;
      if (i >= 0 && j >= 0 && i < K.W && j < K.H && ok(K.at(i, j))) return [i, j];
    }
    return [clamp(Math.floor(x), 0, K.W - 1), clamp(Math.floor(y), 0, K.H - 1)];
  }
  /* A chegada (na ponta do caminho que entra no mapa; sem caminho, numa borda) e a emboscada (atrás de uma cobertura —
     uma pedra grande, um tronco, a carroça, a mata — do lado oposto ao do caminho, nem perto nem longe demais). */
  function marcadores(K) {
    const P = K.P, { W, H } = K, agua = P.aguaRasa;
    let ch = P.marcas.chegada;
    if (!ch) {
      const rota = K.rota || K.eixo;
      if (rota) { const p = rota.find(([x, y]) => x >= 0.6 && y >= 0.6 && x <= W - 0.6 && y <= H - 0.6) || rota[0]; ch = [clamp(p[0], 0.6, W - 0.6), clamp(p[1], 0.6, H - 0.6)]; }
      else { const lado = K.pick(['o', 'l', 'n', 's']), f = P.foco; ch = lado === 'o' ? [0.8, f[1]] : lado === 'l' ? [W - 0.8, f[1]] : lado === 'n' ? [f[0], 0.8] : [f[0], H - 0.8]; }
      ch = lugarDePe(K, ch[0], ch[1], agua);
    } else ch = [Math.floor(ch[0] + 0.5), Math.floor(ch[1] + 0.5)];
    let em = P.marcas.emboscada;
    if (!em) {
      const diag = Math.hypot(W, H), cands = P.cobertura.length ? P.cobertura : P.arvores.filter(a => a.r >= 0.8).map(a => ({ x: a.x, y: a.y, r: a.r }));
      let melhor = null;
      for (const c of cands) {
        const d = Math.hypot(c.x - ch[0], c.y - ch[1]) / diag;
        if (d < 0.18) continue;
        const nota = Math.abs(d - 0.45) + (K.rota ? distLinha(K.rota, c.x, c.y) / diag * 0.6 : 0) + (Math.min(c.x, c.y, W - c.x, H - c.y) < 2.5 ? 0.6 : 0);
        if (!melhor || nota < melhor.nota) melhor = { c, nota };
      }
      if (melhor) {
        const c = melhor.c, ref = K.rota ? perto(K.rota, c.x, c.y) : { x: ch[0], y: ch[1] };
        let dx = c.x - ref.x, dy = c.y - ref.y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
        em = [clamp(c.x + dx * (c.r + 0.8), 0.6, W - 0.6), clamp(c.y + dy * (c.r + 0.8), 0.6, H - 0.6)];
      } else em = [W - ch[0], H - ch[1]];
      em = lugarDePe(K, em[0], em[1], agua);
    } else em = [Math.floor(em[0] + 0.5), Math.floor(em[1] + 0.5)];
    if (em[0] === ch[0] && em[1] === ch[1]) em = lugarDePe(K, W - ch[0] - 1, H - ch[1] - 1, agua);
    P.marcas = { chegada: ch, emboscada: em };
  }

  /* ================= o plano (conta pura) ================= */
  function limparTrava(t, o) {
    if (!t || typeof t !== 'object') return null;
    const T = TER[o.terreno];
    if (t.terreno !== o.terreno || t.tamanho !== o.tamanho || t.caminho !== o.caminho || !T.sit.some(s => s[0] === t.sit) || (o.sitPedida !== 'surpresa' && t.sit !== o.sitPedida)) return null;
    const s = Math.round(Number(t.s));
    return Number.isFinite(s) && s >= 1 && s <= 2147483647 ? { sit: t.sit, s } : null;
  }
  const SECO = { campo: 'savana', floresta: 'savana', selva: 'savana', pantano: 'savana' };
  function gerar(o) {
    o = o || {};
    const tam = TAMANHOS[o.tamanho] ? o.tamanho : 'medio', W = TAMANHOS[tam].W, H = TAMANHOS[tam].H;
    const T = TER[o.terreno] || TERRENOS[0], terreno = T.id, estilo = Estilos.valido(o.estilo), seed = (Math.round(Number(o.seed)) >>> 0) || 1;
    const caminho = camValido(terreno, o.caminho), sitPedida = T.sit.some(s => s[0] === o.situacao) ? o.situacao : 'surpresa';
    const trava = limparTrava(o.trava, { terreno, tamanho: tam, caminho, sitPedida });
    const sit = trava ? trava.sit : sitPedida !== 'surpresa' ? sitPedida : T.sit[sub(seed, 9) % T.sit.length][0];
    const sT = trava ? trava.s : (sub(seed, 1) % 2147483000) + 1;
    const pal0 = terreno === 'deserto' && sit === 'canion' ? 'canion' : terreno === 'campo' && sit === 'capim' ? 'savana' : terreno === 'agua' && sit === 'barco' ? (estilo === 'desertico' ? 'savana' : 'campo') : T.pal;
    // (lote 7, parte 5a) a seca do Mapa-múndi: o chão verde vira o capim seco (o resto do sorteio é o mesmo)
    const pal = o.seco && SECO[pal0] ? SECO[pal0] : pal0;
    const K = contexto(W, H, terreno, sit, estilo, caminho, sT, pal);
    SIT[terreno + '.' + sit](K);
    const rV = mulberry((sub(seed, 2) % 2147483000) + 1);
    vegetacao(K, rV);
    enfeites(K, rV);
    if (o.marcas !== false) marcadores(K);
    else K.P.marcas = {};
    const P = K.P;
    if (!P.tracado.length) P.tracado.push({ k: 'circ', x: P.foco[0], y: P.foco[1], r: 3 });
    delete P.dens; delete P.esp;
    return Object.assign(P, { v: 1, lugar: 'encontro', seed, sT, tamanho: tam, sitPedida, travaTracado: !!trava, comMarcas: o.marcas !== false, seco: pal !== pal0, occ: Array.from(K.occ) });
  }

  /* ================= o fundo pintado ================= */
  /* (lote 7, parte 4b) os pintores que os outros lugares feitos com este motor registram (a tribo, o porto): o nome do
     objeto pintado → (g, o, c, rnd, p). "moradia" pinta as construções com desenho próprio (a tenda, a iurte, o iglu…) */
  const PINTORES = {};
  function pintaObjeto(g, o, c, rnd, p) {
    const P = Paisagem;
    switch (o.k) {
      case 'carroca': P.carroca(g, o, c, rnd); break;
      case 'tenda': P.tenda(g, o, c, rnd); break;
      case 'fogueiraApagada': P.fogueiraApagada(g, o, c, rnd); break;
      case 'ossada': P.ossada(g, o, c, rnd); break;
      case 'pas': P.pasDoMoinho(g, o, c, rnd); break;
      case 'plantacao': P.plantacao(g, o, c, rnd); break;
      case 'cerca': P.cerca(g, o.pts, c, rnd); break;
      case 'feno': P.feno(g, o, c); break;
      case 'espantalho': P.espantalho(g, o, c, rnd); break;
      case 'ponte': P.ponte(g, o, c, rnd, p.estilo); break;
      case 'passarela': P.passarela(g, o.pts, o.larg, c, rnd); break;
      case 'pedras': P.pedrasDePassar(g, o.pts, c, rnd, o.cores); break;
      case 'fenda': P.fenda(g, o.pts, o.larg, c, rnd, o.brilho, o.cores); break;
      case 'basalto': P.basalto(g, o, c, rnd); break;
      case 'raiz': P.raiz(g, o.pts, o.larg, c); break;
      case 'troncoGigante': P.troncoGigante(g, o, c, rnd, p.pal); break;
      case 'troncoColossal': P.troncoColossal(g, o, c, rnd); break;
      case 'luzSalpicada': P.luzSalpicada(g, p.W, p.H, c, rnd); break;
      case 'cratera': P.cratera(g, o, c, rnd); break;
      case 'barco': P.barco(g, o, c, rnd); break;
      case 'pier': P.pier(g, o, c, rnd); break;
      case 'destrocos': P.destrocos(g, o, c, rnd); break;
      case 'santuario': P.santuario(g, o, c, rnd, p.estilo); break;
      case 'duna': P.duna(g, o.pts, c, rnd, o.ang); break;
      case 'planalto': P.planalto(g, o.pts, c, rnd, o.cores, o.alt); break;
      case 'lenha': P.lenha(g, o, c, rnd); break;
      case 'varal': P.varal(g, o, c, rnd); break;
      case 'cachoeira': P.cachoeira(g, o.x, o.y, o.larg, o.ang, c, rnd); break;
      case 'cristais': P.cristais(g, o.x, o.y, o.r, c, rnd, o.cor); break;
      case 'mancha': P.mancha(g, o.pts, c, rnd, o.cores, o.op); break;
      case 'praia': P.praia(g, o.pts, c, rnd); break;
      case 'espuma': P.espuma(g, o.pts, c, rnd); break;
      case 'espumaRoda': { const pts = elipse(o.x, o.y, o.r, o.r * 0.75, 14); pts.push(pts[0]); P.espuma(g, pts, c, rnd); break; }
      case 'buracoGelo': { g.save(); g.fillStyle = '#e8f4fa'; g.beginPath(); g.ellipse(o.x * c, o.y * c, c * 0.75, c * 0.6, 0, 0, TAU); g.fill(); g.fillStyle = '#1f4a66'; g.beginPath(); g.ellipse(o.x * c, o.y * c, c * 0.5, c * 0.4, 0, 0, TAU); g.fill(); g.restore(); break; }
      case 'plataformaPedra': P.penhasco(g, o.pts, c, rnd, ['#b8b3a8', '#8d887e', '#5d5a52'], 3); break;
      default: if (PINTORES[o.k]) PINTORES[o.k](g, o, c, rnd, p);
    }
  }
  function pintar(p, c) {
    const W = p.W * c, H = p.H * c, est = p.estilo, P = Paisagem;
    const cv = document.createElement('canvas'); cv.width = Math.round(W); cv.height = Math.round(H);
    const g = cv.getContext('2d'), rnd = mulberry((p.seed ^ 0x6c8e9cf5) >>> 0 || 9);
    P.chao(g, p.W, p.H, c, rnd, p.pal);
    // a gruta: tudo rocha, e o chão por cima
    for (const cav of p.cavernas || []) { P.penhasco(g, [[-1, -1], [p.W + 1, -1], [p.W + 1, p.H + 1], [-1, p.H + 1]], c, rnd, ['#4a4f5a', '#2e323a', '#15171c'], 6); P.mancha(g, cav.chao, c, rnd, CH.gruta, { pedrisco: ['#7a8090', '#2a2e36'] }); g.save(); P.suave(g, cav.chao, c); g.globalAlpha = 0.55; g.strokeStyle = '#0e1014'; g.lineWidth = c * 0.9; g.stroke(); g.restore(); }
    // a água rasa por todo o mapa (o pântano) ou o mar
    if (p.aguaToda) P.aguaRasa(g, p.W, p.H, c, rnd, p.pal);
    for (const m of p.chao) P.mancha(g, m.pts, c, rnd, m.cores, m.op || {});
    for (const o of p.pintados) if (o.z === 0) pintaObjeto(g, o, c, rnd, p);
    for (const a of p.abismos) P.abismo(g, a.pts, c, rnd, a.cores || [P.pedraDe(p.pal)[1], P.pedraDe(p.pal)[2], '#070606']);
    for (const a of p.aguas) if (a.k === 'lago') P.lago(g, a.pts, c, rnd, p.pal, a.tipo);
    for (const a of p.aguas) if (a.k === 'rio') P.rio(g, a.pts, a.hw, c, rnd, p.pal, a.tipo);
    const cores = Estilos.corDaRua(est, P.PAL[p.pal] || P.PAL.campo);
    for (const cm of p.caminhos) P.caminho(g, cm.pts, cm.hw, c, rnd, cores, cm.tipo);
    for (const o of p.pintados) if (o.z === 1) pintaObjeto(g, o, c, rnd, p);
    for (const m of p.massas) P.penhasco(g, m.pts, c, rnd, m.cores || P.pedraDe(p.pal), m.alt);
    for (const o of p.pintados) if (o.z === 2) pintaObjeto(g, o, c, rnd, p);
    // as construções: a aberta (piso, paredes, enfeite do estilo) e a fechada (o telhado)
    const TP = Estilos.tipos(est);
    p.predios.forEach((k, i) => {
      const def = TP[k.tipo] || TP.casa, cont = Estilos.contorno(k), caminho2 = () => { g.beginPath(); cont.forEach(([x, y], n) => (n ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); g.closePath(); };
      if (k.desenho && PINTORES.moradia) { PINTORES.moradia(g, k, c, rnd, est, p); return; }
      if (!k.aberto) { Estilos.telhado(g, k, c, rnd, est, (sub(p.seed, 30 + i) % 997)); return; }
      g.save(); g.translate(c * 0.1, c * 0.12); g.fillStyle = 'rgba(0,0,0,.32)'; caminho2(); g.fill(); g.restore();
      g.save(); caminho2(); g.clip(); Estilos.piso(g, k, c, rnd, def.piso); g.restore();
      Estilos.paredesPintadas(g, k, c, rnd, est);
      Estilos.enfeiteDaCasa(g, k, c, rnd, est, def);
    });
    for (const n of p.navios) Navio.pintar(g, n, c, rnd, { danificado: n.danificado });
    for (const r of p.rochas) P.pedra(g, r.x, r.y, r.r, c, rnd, r.cores || P.pedraDe(p.pal));
    const neve = p.terreno === 'neve';
    for (const a of p.arvores) P.arvore(g, a, c, rnd, a.esp, p.pal, neve);
    for (const o of p.pintados) if (o.z === 3) pintaObjeto(g, o, c, rnd, p);
    P.vinheta(g, p.W, p.H, c, p.terreno === 'cristais' && p.sit === 'gruta' ? 0.4 : 0.22);
    return cv;
  }

  /* ================= a cena ================= */
  const nomePadrao = p => {
    if (p.terreno === 'agua') return { navio: 'Encontro no navio', abordagem: 'Abordagem', barco: 'Encontro no rio', naufragio: 'O naufrágio' }[p.sit] || 'Encontro na água';
    return 'Encontro ' + (TER[p.terreno] || TERRENOS[0]).em;
  };
  const resolucao = (W, H) => Math.max(16, Math.min(64, Math.floor(Math.sqrt(9e6 / (W * H)))));
  // o marcador de Entrada (oculto) de uma construção fechada ou do navio, com o que ele sabe para gerar o interior
  function entrada(sc, x, y, gera, c) {
    const t = Props.novo(sc, 'entrada', x * c, y * c, 1, true);
    t.size = 0.75; t.x += c * 0.125; t.y += c * 0.125; t.gera = gera;
    return t;
  }
  /* Monta a cena do plano: as paredes (as das construções, a amurada do navio e as de visão), os objetos, os marcadores,
     o relevo, as formas, as zonas e as luzes. */
  function montar(sc, p, c, op) {
    op = op || {};
    const parede = (x1, y1, x2, y2, k, extra) => { if (Math.hypot(x2 - x1, y2 - y1) < 0.05) return; sc.walls.push(Object.assign({ id: uid('wl'), k: k || 'wall', x1: x1 * c, y1: y1 * c, x2: x2 * c, y2: y2 * c, open: false, locked: false }, extra || null)); };
    const noite = sc.tone === 'noite' || sc.tone === 'breu';
    p.predios.forEach((k, i) => {
      if (k.aberto) {
        for (const s of Estilos.paredesDaCasa(k)) parede(s.x1, s.y1, s.x2, s.y2, s.k);
        const ms = k.moveis.slice().sort((a, b) => (a.id === 'tapete' ? 0 : 1) - (b.id === 'tapete' ? 0 : 1));
        for (const mv of ms) if (Props.P[mv.id]) sc.tokens.push(Props.novo(sc, mv.id, mv.x * c, mv.y * c, mv.s, false));
        if (noite) sc.lights.push({ id: uid('lz'), name: 'Luz da casa', x: (k.x + k.w / 2) * c, y: (k.y + k.h / 2) * c, bright: 1.5, dim: Math.max(3, Math.round(Math.max(k.w, k.h) * 0.9)), c: '#ffc77a', on: true, fl: true });
      } else {
        for (const s of Estilos.paredesDaCasa(Object.assign({}, k, { porta: null, janelas: [] }))) parede(s.x1, s.y1, s.x2, s.y2);
        const pt = k.porta, mx = (pt.x1 + pt.x2) / 2, my = (pt.y1 + pt.y2) / 2, dx = pt.lado === 'o' ? -1 : pt.lado === 'l' ? 1 : 0, dy = pt.lado === 'n' ? -1 : pt.lado === 's' ? 1 : 0;
        sc.tokens.push(entrada(sc, mx + dx * 0.55 - 0.5, my + dy * 0.55 - 0.5, Object.assign({ t: k.interior || k.tipo, w: k.w, h: k.h, p: pt.lado, e: p.estilo, s: (sub(p.seed, 60 + i) % 2147483000) + 1, f: k.forma === 'oct' ? 'oct' : 'ret' }, k.chefe ? { c: true } : null), c));
      }
    });
    for (const n of p.navios) {
      for (const s of Navio.paredes(n)) parede(s.x1, s.y1, s.x2, s.y2, s.k);
      for (const o of n.objetos) if (Props.P[o.id]) { const t = Props.novo(sc, o.id, o.x * c, o.y * c, o.s || 1, false); if (o.rot) t.rot = o.rot; sc.tokens.push(t); }
      sc.tokens.push(entrada(sc, n.entrada.x, n.entrada.y, n.entrada.gera, c));
    }
    // (lote 7, parte 4b-3) as Entradas que o lugar pede sozinhas (a da masmorra, nas ruínas: gera o nível 1)
    for (const e of p.entradas || []) sc.tokens.push(entrada(sc, e.x, e.y, e.gera, c));
    for (const v of p.visao) parede(v[0], v[1], v[2], v[3]);
    // (lote 7, parte 4b) as paredes de outro tipo que o lugar pede: o portão da paliçada (abre e fecha), a cerca do
    // cercado (mureta: deixa ver, não deixa passar)
    for (const w of p.paredes || []) parede(w.x1, w.y1, w.x2, w.y2, w.k);
    for (const o of p.objetos) if (Props.P[o.id]) { const t = Props.novo(sc, o.id, o.x * c, o.y * c, o.s || 1, false); if (o.rot) t.rot = o.rot; sc.tokens.push(t); }
    // os marcadores ocultos: por onde o grupo chega e a boa emboscada
    if (p.marcas && p.marcas.chegada && Props.P.chegada) sc.tokens.push(Props.novo(sc, 'chegada', p.marcas.chegada[0] * c, p.marcas.chegada[1] * c, 1, true));
    if (p.marcas && p.marcas.emboscada && Props.P.emboscada) sc.tokens.push(Props.novo(sc, 'emboscada', p.marcas.emboscada[0] * c, p.marcas.emboscada[1] * c, 1, true));
    // as luzes (a lava, os cristais, a fenda)
    for (const l of p.luzes) sc.lights.push({ id: uid('lz'), name: 'Luz do lugar', x: l.x * c, y: l.y * c, bright: l.bright, dim: l.dim, c: l.c, on: true, fl: true });
    if (op.relevo !== false) {
      // (o relevo dos encontros é leve: o fundo já desenha o morro, a água, o penhasco)
      for (const r of p.relevo) sc.shapes.push(Object.assign(Estilos.terrenoNaCena(r, c, 0, 0), { a: r.a || LEVE[r.t] || 0.22 }));
      for (const f of p.formas) sc.shapes.push(Estilos.formaNaCena(f, c, 0, 0));
      for (const z of p.zonas) sc.effects.push(zonaNaCena(z, c));
    }
  }
  // uma zona do plano vira um efeito da cena (solto no mapa, sem duração)
  function zonaNaCena(z, c) {
    const e = { id: uid('fx'), fx: z.fx, k: z.k === 'rect' ? 'rect' : 'circ', x: z.x * c, y: z.y * c, r: z.r || 1, w: 1, rw: z.rw || 2, rh: z.rh || 2, ang: 0, dir: z.dir || 0, pow: 0.75, leve: true, token: null, gm: false, by: null, seed: 1 + (Math.floor(Math.abs(z.x * 7.3 + z.y * 13.1) * 97) % 997), dur: 0, dur0: 0, at: null, apply: null };
    if (FX.P[z.fx] && FX.P[z.fx].cond) e.apply = { bar: '', amt: '', cond: { id: FX.P[z.fx].cond, n: 0, d: 0 }, skip: [] };
    return e;
  }
  // a cena de um plano deste motor (o encontro, a tribo, o porto); nomeDe: o nome quando o mestre deixa o campo vazio
  async function criarPlano(p, nome, ex, nomeDe) {
    ex = ex || {};
    const sc = newScene(String(nome || '').trim().slice(0, 60) || nomeDe(p));
    if (typeof ex.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(ex.id) && !Store.S.scenes[ex.id]) sc.id = ex.id;
    sc.cols = p.W; sc.rows = p.H;
    sc.fog.dynamic = true; sc.fog.explored = true;
    const tom = TONES.find(t => t.id === ex.hora) || TONES[0];
    sc.tone = tom.id; sc.light = tom.light;
    sc.weather = { k: WEATHERS.some(w => w[0] === ex.clima) ? ex.clima : '', pow: 0.6 };
    sc.bgColor = (Paisagem.PAL[p.pal] || Paisagem.PAL.campo).base; sc.bg.stretch = true;
    try { const cv = pintar(p, resolucao(p.W, p.H)); const a = await Assets.fromCanvas(cv, 'bg', sc.name); sc.bg.asset = a.id; } catch (e) { console.error(e); }
    montar(sc, p, sc.cell, { relevo: ex.relevo !== false });
    normalizeScene(sc);
    Store.addScene(sc); Persist.scene(sc.id); Persist.meta();
    return sc;
  }
  const criar = (p, nome, ex) => criarPlano(p, nome, ex, nomePadrao);

  /* ================= a prévia ================= */
  function resumo(p) {
    const T = TER[p.terreno] || TERRENOS[0], sitN = (T.sit.find(s => s[0] === p.sit) || [0, ''])[1];
    const partes = [T.n + ' · ' + sitN + (p.sitPedida === 'surpresa' ? ' (sorteada)' : ''), p.W + ' × ' + p.H + ' quadrados'];
    if (p.caminhos.length) partes.push(p.caminhos.some(c => c.tipo === 'estrada') ? 'estrada' : 'trilha');
    if (p.seco) partes.push('o chão seco');
    if (p.predios.length) partes.push(p.predios.length === 1 ? '1 construção' : p.predios.length + ' construções');
    if (p.navios.length) partes.push(p.navios.length === 1 ? 'um navio' : p.navios.length + ' navios');
    if (p.visao.length) partes.push(p.visao.length + ' paredes de visão');
    if (p.zonas.length) partes.push(p.zonas.length === 1 ? '1 zona' : p.zonas.length + ' zonas');
    return partes.join(' · ') + '.';
  }
  function previa(cv, p, maxW, maxH, op) {
    const cell = Math.max(6, Math.floor(Math.min((maxW || 460) / p.W, (maxH || 330) / p.H)));
    const fundo = pintar(p, cell);
    cv.width = fundo.width; cv.height = fundo.height;
    const g = cv.getContext('2d');
    g.drawImage(fundo, 0, 0);
    if (!op || op.relevo !== false) Estilos.relevoNaPrevia(g, p.relevo.map(r => Object.assign({ a: LEVE[r.t] || 0.22 }, r)), p.formas, cell, 1.5);
    g.lineCap = 'round';
    const seg = (x1, y1, x2, y2, cor, w, tr) => { g.strokeStyle = cor; g.lineWidth = w; g.setLineDash(tr || []); g.beginPath(); g.moveTo(x1 * cell, y1 * cell); g.lineTo(x2 * cell, y2 * cell); g.stroke(); g.setLineDash([]); };
    // as paredes de visão (tracejadas, claras), as construções e a amurada (ciano: deixa ver)
    for (const v of p.visao) seg(v[0], v[1], v[2], v[3], 'rgba(255,236,200,0.75)', Math.max(1.5, cell * 0.1), [Math.max(2, cell * 0.25), Math.max(2, cell * 0.18)]);
    // (as moradias com desenho próprio — a tenda, a iurte, o iglu — já se mostram no fundo: as paredes delas não aparecem)
    for (const k of p.predios) if (!k.desenho) for (const s of Estilos.paredesDaCasa(k.aberto ? k : Object.assign({}, k, { porta: null, janelas: [] }))) seg(s.x1, s.y1, s.x2, s.y2, s.k === 'door' ? '#7fd1ff' : s.k === 'window' ? '#bff3ff' : '#1b1612', Math.max(2, cell * 0.2));
    for (const n of p.navios) for (const s of Navio.paredes(n)) seg(s.x1, s.y1, s.x2, s.y2, '#9fe9ff', Math.max(1.5, cell * 0.12));
    for (const w of p.paredes || []) seg(w.x1, w.y1, w.x2, w.y2, w.k === 'door' ? '#7fd1ff' : w.k === 'mureta' ? '#9fe9ff' : 'rgba(255,236,200,0.75)', Math.max(1.5, cell * (w.k === 'door' ? 0.2 : 0.12)), w.k === 'wall' ? [Math.max(2, cell * 0.25), Math.max(2, cell * 0.18)] : null);
    // os marcadores: a bandeira verde (chegada) e o xis vermelho (emboscada)
    const m = p.marcas || {};
    if (m.chegada) { const [x, y] = m.chegada; g.fillStyle = '#3fbf6a'; g.strokeStyle = '#0e2a18'; g.lineWidth = Math.max(1.5, cell * 0.08); g.beginPath(); g.arc((x + 0.5) * cell, (y + 0.5) * cell, cell * 0.42, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo((x + 0.38) * cell, (y + 0.22) * cell); g.lineTo((x + 0.75) * cell, (y + 0.36) * cell); g.lineTo((x + 0.38) * cell, (y + 0.5) * cell); g.closePath(); g.fill(); g.fillRect((x + 0.33) * cell, (y + 0.2) * cell, Math.max(1, cell * 0.07), cell * 0.6); }
    if (m.emboscada) { const [x, y] = m.emboscada; g.fillStyle = '#d0453a'; g.strokeStyle = '#2a0e0a'; g.lineWidth = Math.max(1.5, cell * 0.08); g.beginPath(); g.arc((x + 0.5) * cell, (y + 0.5) * cell, cell * 0.42, 0, TAU); g.fill(); g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1.5, cell * 0.1); g.beginPath(); g.moveTo((x + 0.3) * cell, (y + 0.3) * cell); g.lineTo((x + 0.7) * cell, (y + 0.7) * cell); g.moveTo((x + 0.7) * cell, (y + 0.3) * cell); g.lineTo((x + 0.3) * cell, (y + 0.7) * cell); g.stroke(); }
    g.fillStyle = '#f3ead2';
    for (const o of p.objetos) { g.beginPath(); g.arc((o.x + o.s / 2) * cell, (o.y + o.s / 2) * cell, Math.max(1.5, cell * 0.16 * o.s), 0, TAU); g.fill(); }
    return { cell };
  }

  /* ================= o lugar, para a janela do gerador ================= */
  function padrao() {
    const o = App.opt, terreno = TER[o.encTer] ? o.encTer : 'estrada';
    const T = TER[terreno];
    return { terreno, situacao: T.sit.some(s => s[0] === o.encSit) ? o.encSit : 'surpresa', caminho: camValido(terreno, o.encCam || 'trilha'), tamanho: TAMANHOS[o.encTam] ? o.encTam : 'medio', marcas: o.encMarcas !== false };
  }
  const lembrar = st => { App.opt.encTer = st.terreno; App.opt.encSit = st.situacao; App.opt.encCam = st.caminho; App.opt.encTam = st.tamanho; App.opt.encMarcas = st.marcas; };
  function controles(st, K, mudou) {
    const { field, seg, toggle } = K, T = TER[st.terreno];
    const camOps = st.terreno === 'agua' ? null : st.terreno === 'estrada' ? CAMINHOS.filter(c => c[0] !== 'nenhum') : CAMINHOS;
    return h('div', { class: 'ger-c' },
      field('Terreno', seg('enc-ter', st.terreno, TERRENOS.map(t => [t.id, t.n]), v => { st.terreno = v; st.situacao = 'surpresa'; st.caminho = camValido(v, st.caminho === 'nenhum' && v === 'estrada' ? 'estrada' : st.caminho); lembrar(st); mudou(true, { soltar: true }); }), 'stack'),
      field('Situação', seg('enc-sit', st.situacao, T.sit.map(([k, n]) => [k, n]).concat([['surpresa', 'Surpresa', null, 'Sorteia uma das situações deste terreno']]), v => { st.situacao = v; lembrar(st); mudou(true, { soltar: true }); }), 'stack'),
      h('div', { class: 'ger-l' },
        camOps ? field('Caminho', seg('enc-cam', st.caminho, camOps.map(([k, n]) => [k, n]), v => { st.caminho = v; lembrar(st); mudou(true, { soltar: true }); }), 'stack') : null,
        field('Tamanho', seg('enc-tam', st.tamanho, Object.keys(TAMANHOS).map(k => [k, TAMANHOS[k].n, null, TAMANHOS[k].W + ' × ' + TAMANHOS[k].H + ' quadrados']), v => { st.tamanho = v; lembrar(st); mudou(true, { soltar: true }); }), 'stack')),
      toggle('enc-marcas', st.marcas, v => { st.marcas = v; lembrar(st); mudou(true); }, 'Marcar a chegada e a emboscada (só você vê)'));
  }
  const opcoesDe = st => ({ terreno: st.terreno, situacao: st.situacao, caminho: st.caminho, tamanho: st.tamanho, marcas: !!st.marcas });
  function aplicarOpcoes(st, o) {
    if (TER[o.terreno]) st.terreno = o.terreno;
    const T = TER[st.terreno];
    st.situacao = T.sit.some(s => s[0] === o.situacao) ? o.situacao : 'surpresa';
    st.caminho = camValido(st.terreno, typeof o.caminho === 'string' ? o.caminho : st.caminho);
    if (TAMANHOS[o.tamanho]) st.tamanho = o.tamanho;
    if (typeof o.marcas === 'boolean') st.marcas = o.marcas;
    lembrar(st);
  }
  // as partes que travam: o traçado inteiro (a água, o caminho, os penhascos, a peça do meio)
  const partes = p => (p.tracado.length ? ['tracado'] : []);
  function parteEm(p, x, y) {
    for (const f of p.tracado) {
      if (f.k === 'linha' && distLinha(f.pts, x, y) <= f.hw + 0.5) return 'tracado';
      if (f.k === 'poli' && dentroPoli(f.pts, x, y)) return 'tracado';
      if (f.k === 'circ' && Math.hypot(x - f.x, y - f.y) <= f.r) return 'tracado';
    }
    return null;
  }
  const nomeDaParte = () => 'o traçado (o caminho, a água, os penhascos e a peça do meio)';
  const formaDaParte = (p, parte) => (parte === 'tracado' ? p.tracado.map(f => (f.k === 'linha' ? { k: 'linha', pts: f.pts, hw: f.hw } : f.k === 'circ' ? { k: 'circ', x: f.x, y: f.y, r: f.r } : { k: 'poli', pts: f.pts })) : []);
  const travada = (p, parte) => parte === 'tracado' && !!p.travaTracado;
  const travaDe = p => (p.travaTracado ? { terreno: p.terreno, tamanho: p.tamanho, caminho: p.caminho, sit: p.sit, s: p.sT } : null);
  function alternar(p, parte, trava) {
    if (parte !== 'tracado') return trava;
    p.travaTracado = !p.travaTracado;
    return travaDe(p);
  }
  const quantasTravadas = p => (p.travaTracado ? 1 : 0);
  const baseDe = () => null;
  const LUGAR = { id: 'encontro', n: 'Encontro', padrao, controles, opcoesDe, aplicarOpcoes, gerar: (st, comum) => gerar(Object.assign({}, st, comum)), previa, resumo, partes, parteEm, nomeDaParte, formaDaParte, travada, alternar, quantasTravadas, baseDe, travaDe, nomePadrao, criar,
    relevoTxt: 'Com relevo, formas e zonas (água, penhascos, abismos, lama, gelo, lava)',
    aceitaSeco: true,                              // (lote 7, parte 5a) a seca do Mapa-múndi seca o chão
    dica: 'Clique no traçado da prévia (o caminho, a água, os penhascos, a peça do meio) para travar: "Gerar outro" troca só as árvores, as pedras e os objetos.',
    nota: 'Sai uma cena de batalha nova, com o relevo, as zonas de efeito e as luzes onde a natureza pede, e paredes de visão só no que é grande (as pedras grandes, os troncos grossos, os paredões e as construções). Os marcadores de chegada e de emboscada nascem ocultos (só você vê; dá para apagar). Nada sai escrito; tudo continua editável; as cenas que já existem não mudam.',
    feito: (sc, p) => `"${sc.name}" criada: ${resumo(p).replace(/\.$/, '')}. Tudo é editável.` };
  /* (lote 7, parte 4b) o motor, para os outros lugares de fora (a tribo, o porto): o contexto com a grade de ocupação e
     as peças (contexto), a vegetação e os enfeites do terreno, o desenho, a montagem da cena, a prévia, a cena e o
     registro de pintores */
  const motor = { contexto, vegetacao, enfeites, marcadores, lugarDePe, pintar, montar, previa, criarPlano, resolucao, sub, portaNoLado, foraDaPorta, CH, LEVE, blob, elipse, faixa, ladosDaFaixa, curva, perto, lerp, distLinha, dentroPoli, PINTORES };
  return { TAMANHOS, TERRENOS, TER, CAMINHOS, SIT, camValido, gerar, pintar, montar, criar, previa, resumo, parteEm, travaDe, limparTrava, nomePadrao, curva, blob, faixa, cruzamento, LUGAR, motor };
})();
