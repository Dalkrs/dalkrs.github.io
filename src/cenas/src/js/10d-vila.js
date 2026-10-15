/* ---------------------------------------------------------------
   10d. VILA — o gerador de vilarejo (lote 6)
   O mestre escolhe o tamanho (aldeia ou vila), o terreno, se tem rio e muralha e quantas casas; a janela mostra a
   prévia e "Gerar outro" sorteia de novo. Sai uma cena nova: o fundo pintado (o chão, as ruas, a praça, o rio e a
   ponte, o piso das casas, a paliçada e as árvores) e, por cima, tudo editável — as paredes de cada casa (que
   bloqueiam a visão), uma porta, alguns móveis (objetos de cenário) e o nome em cima; o poço e os lampiões da
   praça; a paliçada, com os portões abertos. O plano (gerar) é uma conta pura, sorteada por uma semente: a mesma
   escolha com a mesma semente dá o mesmo vilarejo. Nada muda nas cenas que já existem.
   --------------------------------------------------------------- */
const Vila = (() => {
  const TAMANHOS = {
    aldeia: { n: 'Aldeia', W: 28, H: 20, rua: 2, praca: 2.5, casas: [3, 8], padrao: 5, lamp: 2 },
    vila: { n: 'Vila', W: 40, H: 28, rua: 3, praca: 3.5, casas: [6, 16], padrao: 10, lamp: 4 },
  };
  const TERRENOS_V = [['campo', 'Campo'], ['floresta', 'Floresta'], ['areia', 'Deserto'], ['neve', 'Neve']];
  // o que cada tipo de casa pode ter: os tamanhos (largura × altura, em quadrados), o piso e os móveis (na ordem em
  // que entram: os primeiros são os que mais importam)
  const TIPOS = {
    taverna: { n: 'Taverna', tam: [[6, 5], [5, 6], [7, 5]], piso: 'madeira', moveis: ['mesa', 'barril', 'mesa', 'cadeira', 'cadeira', 'barril', 'lampiao'], max: 6 },
    capela: { n: 'Capela', tam: [[5, 6], [6, 5]], piso: 'pedra', moveis: ['altar', 'estatua', 'vela', 'vela'], max: 4 },
    ferraria: { n: 'Ferraria', tam: [[5, 4], [4, 5]], piso: 'pedra', moveis: ['braseiro', 'caixote', 'barril'], max: 3 },
    armazem: { n: 'Armazém', tam: [[5, 4], [6, 4], [4, 5]], piso: 'madeira', moveis: ['estante', 'caixote', 'barril', 'caixote', 'barril'], max: 4 },
    casa: { n: 'Casa', tam: [[4, 3], [3, 4], [4, 4], [5, 4], [4, 5]], piso: 'madeira', moveis: ['cama', 'mesa', 'barril', 'bau', 'cadeira'], max: 3 },
  };
  const PESSOAS = ['Brunilda', 'Osvaldo', 'Teodora', 'Anselmo', 'Mirela', 'Gaspar', 'Lúcia', 'Benedito', 'Ilsa', 'Tomé', 'Aurora', 'Vicente', 'Rosalva', 'Joaquim', 'Hilda', 'Aldo', 'Marta', 'Rufino', 'Elvira', 'Bento', 'Cecília', 'Dário', 'Inês', 'Leandro', 'Odete', 'Severino'];
  const TAVERNAS = ['Taverna do Javali Dourado', 'Taverna do Corvo Bêbado', 'Taverna do Caneco Cheio', 'Taverna do Gato Preto', 'Taverna do Lobo Manco', 'Taverna do Barril Furado', 'Taverna da Lua Torta', 'Taverna do Bode Risonho'];
  const CAPELAS = ['Capela da Aurora', 'Capela de Santa Inês', 'Templo do Sol Velho', 'Capela da Colheita', 'Santuário da Geada'];
  const LUGARES = ['Pedravale', 'Fontebranca', 'Monte Sereno', 'Pinheiral', 'Trigal', 'Lagoa Funda', 'Brejo Alto', 'Rio Manso', 'Valverde', 'Penedo', 'Carvalhal', 'Ventania', 'Areia Rubra', 'Bruma Fria'];

  /* ================= o plano (conta pura) ================= */
  const distSeg = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };
  const distLinha = (pts, x, y) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, distSeg(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return d; };
  function gerar(o) {
    const tam = TAMANHOS[o.tamanho] ? o.tamanho : 'aldeia', T = TAMANHOS[tam];
    const terreno = TERRENOS_V.some(x => x[0] === o.terreno) ? o.terreno : 'campo';
    const W = T.W, H = T.H, seed = (Math.round(Number(o.seed)) >>> 0) || 1, rnd = mulberry(seed);
    const r = (a, b) => a + rnd() * (b - a), ri = (a, b) => Math.floor(r(a, b + 1)), pick = a => a[Math.floor(rnd() * a.length) % a.length];
    const rio = !!o.rio, muralha = !!o.muralha;
    const want = clamp(Math.round(Number(o.casas) || T.padrao), T.casas[0], T.casas[1]);
    const occ = new Uint8Array(W * H);                     // 0 livre · 1 rua ou praça · 2 rio · 3 casa · 4 árvore ou enfeite
    const at = (i, j) => (i >= 0 && j >= 0 && i < W && j < H ? occ[j * W + i] : 9);
    const pos = (i, j, v) => { if (i >= 0 && j >= 0 && i < W && j < H) occ[j * W + i] = v; };

    // as ruas: a principal atravessa de um lado ao outro; na vila, uma segunda cruza de cima a baixo
    const hw = T.rua / 2;
    const y0 = H / 2 + r(-1.2, 1.2), A = r(0.4, 1.1), L = r(W * 0.7, W * 1.3), F = r(0, Math.PI * 2);
    const ruaY = x => y0 + A * Math.sin(2 * Math.PI * x / L + F);
    const amostrar = (f, de, ate, eixoX) => { const out = []; for (let t = de; t <= ate + 1e-9; t += 0.5) out.push(eixoX ? [t, f(t)] : [f(t), t]); return out; };
    const ruas = [{ pts: amostrar(ruaY, -1, W + 1, true), hw }];
    let ruaX = null;
    if (tam === 'vila') {
      const x0 = W / 2 + r(-2, 2), B = r(0.3, 0.9), M = r(H * 0.8, H * 1.4), G = r(0, Math.PI * 2);
      ruaX = y => x0 + B * Math.sin(2 * Math.PI * y / M + G);
      ruas.push({ pts: amostrar(ruaX, -1, H + 1, false), hw: hw * 0.85 });
    }
    // a praça: no cruzamento (vila) ou no meio da rua (aldeia)
    let px = ruaX ? ruaX(y0) : W / 2 + r(-2, 2);
    if (ruaX) for (let k = 0; k < 6; k++) px = ruaX(ruaY(px));
    const praca = { x: px, y: ruaY(px), r: T.praca };
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const cx = i + 0.5, cy = j + 0.5;
      if (ruas.some(ru => distLinha(ru.pts, cx, cy) <= ru.hw + 0.25) || Math.hypot(cx - praca.x, cy - praca.y) <= praca.r + 0.3) pos(i, j, 1);
    }
    // o rio: de cima a baixo, longe da praça (atravessa a rua principal por uma ponte)
    let rioP = null, ponte = null;
    if (rio) {
      const rw = tam === 'vila' ? 1.6 : 1.3, C = r(0.6, 1.6), N = r(H * 0.7, H * 1.3), Hh = r(0, Math.PI * 2);
      const lados = [W * 0.17, W * 0.83].filter(x => Math.abs(x - praca.x) >= praca.r + rw + 3);
      const xr0 = (lados.length ? pick(lados) : W * 0.83) + r(-1, 1);
      const rioX = y => xr0 + C * Math.sin(2 * Math.PI * y / N + Hh);
      rioP = { pts: amostrar(rioX, -1, H + 1, false), hw: rw };
      let xb = xr0;
      for (let k = 0; k < 6; k++) xb = rioX(ruaY(xb));
      const yb = ruaY(xb), inc = Math.atan2(ruaY(xb + 0.5) - ruaY(xb - 0.5), 1);
      ponte = { x: xb, y: yb, comp: 2 * rw + 1.6, larg: 2 * hw + 0.5, ang: inc };
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (at(i, j) !== 1 && distLinha(rioP.pts, i + 0.5, j + 0.5) <= rw + 0.6) pos(i, j, 2);
    }
    // a muralha (paliçada): um retângulo a dois quadrados da borda, com portões onde as ruas saem e a água passa por baixo
    let muro = null;
    if (muralha) {
      const x1 = 2, y1 = 2, x2 = W - 2, y2 = H - 2;
      const vaos = { n: [], s: [], o: [], l: [] }, portoes = [];
      const vao = (lado, c, meia, portao) => {
        const a = Math.floor(c - meia - 0.5), b = Math.ceil(c + meia + 0.5);
        vaos[lado].push([a, b]);
        if (portao) portoes.push(lado === 'o' || lado === 'l' ? { x1: lado === 'o' ? x1 : x2, y1: a, x2: lado === 'o' ? x1 : x2, y2: b } : { x1: a, y1: lado === 'n' ? y1 : y2, x2: b, y2: lado === 'n' ? y1 : y2 });
      };
      vao('o', ruaY(x1), hw, true); vao('l', ruaY(x2), hw, true);
      if (ruaX) { vao('n', ruaX(y1), hw * 0.85, true); vao('s', ruaX(y2), hw * 0.85, true); }
      if (rioP) { const rx = y => rioP.pts.reduce((m, p) => (Math.abs(p[1] - y) < Math.abs(m[1] - y) ? p : m))[0]; vao('n', rx(y1), rioP.hw, false); vao('s', rx(y2), rioP.hw, false); }
      // os trechos de cada lado: o lado inteiro menos os vãos
      const trechos = (de, ate, vs) => {
        const out = []; let a = de;
        for (const [va, vb] of vs.slice().sort((p, q) => p[0] - q[0])) { if (va > a) out.push([a, Math.min(va, ate)]); a = Math.max(a, vb); }
        if (a < ate) out.push([a, ate]);
        return out.filter(([p, q]) => q - p >= 1);
      };
      muro = { x1, y1, x2, y2, portoes, lados: { n: trechos(x1, x2, vaos.n), s: trechos(x1, x2, vaos.s), o: trechos(y1, y2, vaos.o), l: trechos(y1, y2, vaos.l) } };
    }
    const reg = muralha ? { x0: 3, y0: 3, x1: W - 3, y1: H - 3 } : { x0: 1, y0: 1, x1: W - 1, y1: H - 1 };

    // as casas: primeiro as que dão para a rua; se faltar lugar, as de trás (com a porta virada para a rua)
    const cabe = (x, y, w, h) => {
      if (x < reg.x0 || y < reg.y0 || x + w > reg.x1 || y + h > reg.y1) return false;
      for (let j = y - 1; j <= y + h; j++) for (let i = x - 1; i <= x + w; i++) {
        const v = at(i, j), dentro = i >= x && i < x + w && j >= y && j < y + h;
        if (dentro ? v !== 0 : v === 3 || v === 2) return false;
      }
      return true;
    };
    const tipos = [];
    if (want >= 4) tipos.push('taverna');
    if (tam === 'vila' && want >= 7) tipos.push('capela', 'armazem');
    if (want >= 6) tipos.push('ferraria');
    while (tipos.length < want) tipos.push('casa');
    const casas = [];
    const porta = (x, y, w, h, lado) => {
      const len = lado === 'n' || lado === 's' ? w : h, d = clamp(Math.floor(len / 2) + ri(-1, 1) * (len >= 5 ? 1 : 0), 1, Math.max(1, len - 2));
      if (lado === 'n') return { lado, x1: x + d, y1: y, x2: x + d + 1, y2: y };
      if (lado === 's') return { lado, x1: x + d, y1: y + h, x2: x + d + 1, y2: y + h };
      if (lado === 'o') return { lado, x1: x, y1: y + d, x2: x, y2: y + d + 1 };
      return { lado, x1: x + w, y1: y + d, x2: x + w, y2: y + d + 1 };
    };
    const tentarNaRua = tipo => {
      const def = TIPOS[tipo];
      for (let k = 0; k < 300; k++) {
        let [w, h] = pick(def.tam);
        const naVertical = ruaX && rnd() < 0.4;
        let x, y, lado;
        if (!naVertical) {
          x = ri(reg.x0, reg.x1 - w);
          let ymin = Infinity, ymax = -Infinity;
          for (let t = x; t <= x + w; t += 0.5) { const v = ruaY(t); ymin = Math.min(ymin, v); ymax = Math.max(ymax, v); }
          const gap = ri(0, 1);
          if (rnd() < 0.5) { y = Math.floor(ymin - hw - 0.25) - gap - h; lado = 's'; } else { y = Math.ceil(ymax + hw + 0.25) + gap; lado = 'n'; }
        } else {
          const hw2 = hw * 0.85;
          y = ri(reg.y0, reg.y1 - h);
          let xmin = Infinity, xmax = -Infinity;
          for (let t = y; t <= y + h; t += 0.5) { const v = ruaX(t); xmin = Math.min(xmin, v); xmax = Math.max(xmax, v); }
          const gap = ri(0, 1);
          if (rnd() < 0.5) { x = Math.floor(xmin - hw2 - 0.25) - gap - w; lado = 'l'; } else { x = Math.ceil(xmax + hw2 + 0.25) + gap; lado = 'o'; }
        }
        if (cabe(x, y, w, h)) return { x, y, w, h, porta: porta(x, y, w, h, lado) };
      }
      return null;
    };
    const tentarAtras = tipo => {
      const def = TIPOS[tipo];
      for (let k = 0; k < 300; k++) {
        const [w, h] = pick(def.tam), x = ri(reg.x0, reg.x1 - w), y = ri(reg.y0, reg.y1 - h);
        if (!cabe(x, y, w, h)) continue;
        // a porta vira para a rua mais perto
        const cx = x + w / 2, cy = y + h / 2, dy = cy - ruaY(cx), dx = ruaX ? cx - ruaX(cy) : Infinity;
        const lado = Math.abs(dx) < Math.abs(dy) ? (dx < 0 ? 'l' : 'o') : (dy < 0 ? 's' : 'n');
        return { x, y, w, h, porta: porta(x, y, w, h, lado) };
      }
      return null;
    };
    const usados = new Set();
    const nomeDe = tipo => {
      const pessoa = () => { let n = pick(PESSOAS); for (let k = 0; k < 8 && usados.has(n); k++) n = pick(PESSOAS); usados.add(n); return n; };
      if (tipo === 'taverna') return pick(TAVERNAS);
      if (tipo === 'capela') return pick(CAPELAS);
      if (tipo === 'ferraria') return 'Ferraria de ' + pessoa();
      if (tipo === 'armazem') return 'Armazém de ' + pessoa();
      return 'Casa de ' + pessoa();
    };
    for (const tipo of tipos) {
      const lugar = tentarNaRua(tipo) || tentarAtras(tipo);
      if (!lugar) continue;
      for (let j = lugar.y; j < lugar.y + lugar.h; j++) for (let i = lugar.x; i < lugar.x + lugar.w; i++) pos(i, j, 3);
      casas.push(Object.assign({ tipo, nome: nomeDe(tipo), moveis: [] }, lugar));
    }
    // os móveis de cada casa: longe da porta (a passagem fica livre), sem um em cima do outro
    for (const c of casas) {
      const def = TIPOS[c.tipo], dentro = new Uint8Array(c.w * c.h);
      const livre = (i, j) => i >= 0 && j >= 0 && i < c.w && j < c.h && !dentro[j * c.w + i];
      // a passagem: a casa do lado de dentro da porta e a seguinte
      const p = c.porta, pi = p.lado === 'l' ? c.w - 1 : p.lado === 'o' ? 0 : p.x1 - c.x, pj = p.lado === 's' ? c.h - 1 : p.lado === 'n' ? 0 : p.y1 - c.y;
      const di = p.lado === 'l' ? -1 : p.lado === 'o' ? 1 : 0, dj = p.lado === 's' ? -1 : p.lado === 'n' ? 1 : 0;
      for (let k = 0; k < 2; k++) { const i = pi + di * k, j = pj + dj * k; if (i >= 0 && j >= 0 && i < c.w && j < c.h) dentro[j * c.w + i] = 2; }
      for (const id of def.moveis) {
        if (c.moveis.length >= def.max) break;
        const s = Props.P[id] ? Props.P[id].size || 1 : 1, lugares = [];
        for (let j = 0; j + s <= c.h; j++) for (let i = 0; i + s <= c.w; i++) {
          let ok = true;
          for (let b = 0; b < s && ok; b++) for (let a = 0; a < s && ok; a++) if (!livre(i + a, j + b)) ok = false;
          if (ok) lugares.push([i, j]);
        }
        if (!lugares.length) continue;
        // perto das paredes fica mais natural (cama e estante encostadas); o meio, para a mesa
        lugares.sort((u, v) => (id === 'mesa' ? 0 : Math.min(u[0], u[1], c.w - s - u[0], c.h - s - u[1]) - Math.min(v[0], v[1], c.w - s - v[0], c.h - s - v[1])) || 0);
        const n = id === 'mesa' ? lugares.length : Math.max(1, Math.ceil(lugares.length / 3));
        const [i, j] = lugares[Math.floor(rnd() * n) % lugares.length];
        for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) dentro[(j + b) * c.w + i + a] = 1;
        c.moveis.push({ id, x: c.x + i, y: c.y + j, s });
      }
    }
    // a praça: o poço no meio e os lampiões em volta
    const poco = { x: Math.round(praca.x - 0.5), y: Math.round(praca.y - 0.5) };
    const lampioes = [];
    for (let k = 0; k < T.lamp; k++) {
      const a = (k / T.lamp) * Math.PI * 2 + Math.PI / 4, lx = Math.round(praca.x + Math.cos(a) * (praca.r - 0.6) - 0.5), ly = Math.round(praca.y + Math.sin(a) * (praca.r - 0.6) - 0.5);
      if ((lx !== poco.x || ly !== poco.y) && !lampioes.some(q => q.x === lx && q.y === ly)) lampioes.push({ x: lx, y: ly });
    }
    // as árvores (pintadas no fundo) e alguns enfeites que dá para mover (pedras, arbustos, tocos)
    const densidade = { campo: 0.05, floresta: 0.2, areia: 0.025, neve: 0.06 }[terreno];
    const arvores = [], enfeites = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (at(i, j) !== 0) continue;
      let perto = false;
      for (let b = -1; b <= 1 && !perto; b++) for (let a = -1; a <= 1 && !perto; a++) if (at(i + a, j + b) === 3) perto = true;
      if (perto) continue;
      const borda = Math.min(i, j, W - 1 - i, H - 1 - j), fora = muralha && (i < 2 || j < 2 || i >= W - 2 || j >= H - 2);
      const pr = densidade * (fora ? 2.2 : borda < 3 ? 1.5 : terreno === 'floresta' ? 0.35 : 0.6);
      if (rnd() < pr) { arvores.push({ x: i + 0.5 + r(-0.25, 0.25), y: j + 0.5 + r(-0.25, 0.25), r: r(0.55, terreno === 'floresta' ? 1.25 : 1.05) }); pos(i, j, 4); }
    }
    const tiposEnfeite = terreno === 'areia' ? ['pedra', 'pedra', 'caixote'] : terreno === 'neve' ? ['pedra', 'toco', 'tronco'] : ['arbusto', 'pedra', 'toco', 'arbusto'];
    for (let k = 0, tent = 0; k < (tam === 'vila' ? 6 : 4) && tent < 200; tent++) {
      const i = ri(reg.x0, reg.x1 - 1), j = ri(reg.y0, reg.y1 - 1), id = pick(tiposEnfeite), s = Props.P[id] ? Props.P[id].size || 1 : 1;
      let ok = true;
      for (let b = -1; b <= s && ok; b++) for (let a = -1; a <= s && ok; a++) { const v = at(i + a, j + b); if (v === 3 || v === 2 || ((a >= 0 && a < s && b >= 0 && b < s) && v !== 0)) ok = false; }
      if (!ok) continue;
      for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) pos(i + a, j + b, 4);
      enfeites.push({ id, x: i, y: j, s }); k++;
    }
    const nome = (tam === 'vila' ? 'Vila de ' : 'Aldeia de ') + pick(LUGARES);
    return { v: 1, seed, tamanho: tam, terreno, rio, muralha, W, H, nome, pedidas: want, ruas, praca, rio: rioP, ponte, muro, casas, poco, lampioes, arvores, enfeites };
  }

  /* ================= o fundo pintado ================= */
  const PAL = {
    campo: { base: '#4b5b40', manchas: ['#3d4c35', '#56693f', '#445637', '#5e6c46', '#39472f'], fios: ['#6c7f4e', '#33412b'], rua: ['#5c5140', '#7a6950', '#8c7a5d'], copa: ['#2c4629', '#355432', '#3f6239'], luz: '#56794a', agua: ['#2f5e7d', '#3f7396', '#5d8fb0'], margem: '#4a4232' },
    floresta: { base: '#3a4a32', manchas: ['#2f3d29', '#465a38', '#36472e', '#4f5f3c', '#2b3826'], fios: ['#5b6e42', '#2a3524'], rua: ['#4f4536', '#6b5c45', '#7d6c52'], copa: ['#23391f', '#2c4527', '#365230'], luz: '#4b6c3f', agua: ['#2a5470', '#386886', '#5684a3'], margem: '#3f3829' },
    areia: { base: '#c9a86a', manchas: ['#bf9c5e', '#d4b57a', '#b8935a', '#cfae72', '#b48c52'], fios: ['#d8bd85', '#a8844c'], rua: ['#a88a5a', '#bfa274', '#cdb388'], copa: ['#5e7a3a', '#6f8c45', '#4f6a30'], luz: '#87a457', agua: ['#356f8c', '#4683a0', '#69a2bc'], margem: '#9a7d4c' },
    neve: { base: '#dfe6ec', manchas: ['#cfd8e0', '#e9eef2', '#c4ced8', '#f2f5f8', '#bcc7d2'], fios: ['#f4f7fa', '#b9c4ce'], rua: ['#8e8273', '#a99d8d', '#bdb3a6'], copa: ['#2f4a3c', '#3a5a49', '#456a56'], luz: '#e8f0f2', agua: ['#5d8aa6', '#7aa3bc', '#a9c8da'], margem: '#9aa6b0' },
  };
  function pintar(p, cell) {
    const W = p.W * cell, H = p.H * cell, pal = PAL[p.terreno] || PAL.campo;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), rnd = mulberry((p.seed ^ 0x5bd1e995) >>> 0 || 7), c = cell;
    const TAU2 = Math.PI * 2;
    // o chão
    g.fillStyle = pal.base; g.fillRect(0, 0, W, H);
    for (let i = 0, n = Math.round(p.W * p.H * 0.9); i < n; i++) {
      const rr = (0.45 + rnd() * 1.4) * c;
      g.globalAlpha = 0.1 + rnd() * 0.14; g.fillStyle = pal.manchas[i % pal.manchas.length];
      g.beginPath(); g.ellipse(rnd() * W, rnd() * H, rr, rr * (0.5 + rnd() * 0.6), rnd() * Math.PI, 0, TAU2); g.fill();
    }
    g.lineCap = 'round';
    if (p.terreno === 'areia') {
      // ondas de vento na areia
      g.globalAlpha = 0.25; g.lineWidth = Math.max(1, c * 0.03);
      for (let i = 0, n = Math.round(p.W * p.H * 0.35); i < n; i++) {
        const x = rnd() * W, y = rnd() * H, l = c * (0.4 + rnd() * 0.9);
        g.strokeStyle = pal.fios[i % 2]; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - c * 0.12, x + l, y); g.stroke();
      }
    } else {
      g.globalAlpha = p.terreno === 'neve' ? 0.22 : 0.3; g.lineWidth = Math.max(1, c * 0.024);
      for (let i = 0, n = Math.round(p.W * p.H * (p.terreno === 'neve' ? 1.2 : 4)); i < n; i++) {
        const x = rnd() * W, y = rnd() * H, a = -Math.PI / 2 + (rnd() - 0.5) * 0.9, l = c * (0.06 + rnd() * 0.1);
        g.strokeStyle = pal.fios[i % 2]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
    }
    g.globalAlpha = 1;
    const linha = pts => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); };
    // o rio (por baixo das ruas: a ponte passa por cima)
    if (p.rio) {
      const pts = p.rio.pts, hw = p.rio.hw;
      g.lineJoin = 'round'; g.lineCap = 'butt';
      linha(pts); g.strokeStyle = pal.margem; g.lineWidth = (hw * 2 + 0.7) * c; g.stroke();
      linha(pts); g.strokeStyle = pal.agua[0]; g.lineWidth = hw * 2 * c; g.stroke();
      linha(pts); g.strokeStyle = pal.agua[1]; g.lineWidth = hw * 1.3 * c; g.stroke();
      g.globalAlpha = 0.5; linha(pts); g.strokeStyle = pal.agua[2]; g.lineWidth = hw * 0.5 * c; g.stroke();
      g.globalAlpha = 0.35; g.strokeStyle = '#e8f3f8'; g.lineWidth = Math.max(1, c * 0.03); g.lineCap = 'round';
      for (let i = 0; i < p.H * 4; i++) {
        const k = Math.floor(rnd() * (pts.length - 1)), [x, y] = pts[k], dx = (rnd() - 0.5) * hw * 1.4;
        g.beginPath(); g.moveTo((x + dx) * c, y * c); g.lineTo((x + dx) * c, (y + 0.25 + rnd() * 0.4) * c); g.stroke();
      }
      g.globalAlpha = 1;
    }
    // as ruas e a praça
    g.lineJoin = 'round'; g.lineCap = 'butt';
    for (const ru of p.ruas) {
      linha(ru.pts); g.strokeStyle = pal.rua[0]; g.lineWidth = (ru.hw * 2 + 0.35) * c; g.stroke();
      linha(ru.pts); g.strokeStyle = pal.rua[1]; g.lineWidth = ru.hw * 2 * c; g.stroke();
      g.globalAlpha = 0.45; linha(ru.pts); g.strokeStyle = pal.rua[2]; g.lineWidth = ru.hw * 0.9 * c; g.stroke(); g.globalAlpha = 1;
      // marcas de roda
      g.globalAlpha = 0.18; g.strokeStyle = '#2a2116'; g.lineWidth = Math.max(1, c * 0.04);
      for (const off of [-0.35, 0.35]) { g.save(); g.translate(0, off * ru.hw * c); linha(ru.pts); g.stroke(); g.restore(); }
      g.globalAlpha = 1;
    }
    {
      const pr = p.praca, x = pr.x * c, y = pr.y * c, R = pr.r * c;
      g.fillStyle = '#6f685c'; g.beginPath(); g.arc(x, y, R + c * 0.15, 0, TAU2); g.fill();
      g.save(); g.beginPath(); g.arc(x, y, R, 0, TAU2); g.clip();
      for (let j = Math.floor(pr.y - pr.r - 1); j <= pr.y + pr.r + 1; j++) for (let i = Math.floor(pr.x - pr.r - 1); i <= pr.x + pr.r + 1; i++) {
        for (const [ox, oy] of [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]]) {
          const s = 104 + Math.floor(rnd() * 34);
          g.fillStyle = `rgb(${s + 6},${s + 2},${s - 8})`;
          g.fillRect((i + ox) * c + 1.5, (j + oy) * c + 1.5, c / 2 - 3, c / 2 - 3);
        }
      }
      g.restore();
      g.strokeStyle = 'rgba(30,26,20,.55)'; g.lineWidth = Math.max(1.5, c * 0.06); g.beginPath(); g.arc(x, y, R, 0, TAU2); g.stroke();
    }
    // a ponte
    if (p.ponte) {
      const b = p.ponte;
      g.save(); g.translate(b.x * c, b.y * c); g.rotate(b.ang);
      const L = b.comp * c, Wd = b.larg * c;
      g.fillStyle = '#5b3f22'; g.fillRect(-L / 2 - c * 0.1, -Wd / 2 - c * 0.1, L + c * 0.2, Wd + c * 0.2);
      for (let x = -L / 2; x < L / 2; x += c * 0.33) {
        const s = rnd();
        g.fillStyle = s < 0.33 ? '#8a6238' : s < 0.66 ? '#7c5631' : '#946b3f';
        g.fillRect(x + 1, -Wd / 2, c * 0.33 - 2, Wd);
      }
      g.fillStyle = '#3d2914'; g.fillRect(-L / 2, -Wd / 2 - c * 0.12, L, c * 0.14); g.fillRect(-L / 2, Wd / 2 - c * 0.02, L, c * 0.14);
      g.restore();
    }
    // o piso de cada casa
    for (const k of p.casas) {
      const x = k.x * c, y = k.y * c, w = k.w * c, hh = k.h * c, pedra = TIPOS[k.tipo].piso === 'pedra';
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - c * 0.08, y - c * 0.08, w + c * 0.22, hh + c * 0.22);
      if (pedra) {
        g.fillStyle = '#5a564e'; g.fillRect(x, y, w, hh);
        for (let j = 0; j < k.h * 2; j++) for (let i = 0; i < k.w * 2; i++) {
          const s = 92 + Math.floor(rnd() * 30);
          g.fillStyle = `rgb(${s + 6},${s + 3},${s - 4})`;
          g.fillRect(x + i * c / 2 + 1.5, y + j * c / 2 + 1.5, c / 2 - 3, c / 2 - 3);
        }
      } else {
        g.fillStyle = '#5e4128'; g.fillRect(x, y, w, hh);
        for (let j = 0; j < k.h * 3; j++) {
          let xx = x - rnd() * c;
          while (xx < x + w) {
            const l = c * (0.9 + rnd() * 1.4), s = rnd();
            g.fillStyle = s < 0.33 ? '#8d6740' : s < 0.66 ? '#83603b' : '#97704a';
            const a = Math.max(x, xx), b = Math.min(x + w, xx + l);
            if (b > a) g.fillRect(a + 1, y + j * c / 3 + 1, b - a - 2, c / 3 - 2);
            xx += l;
          }
        }
      }
      // a sombra das paredes do lado de dentro
      const gr = g.createLinearGradient(0, y, 0, y + c * 0.35); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x, y, w, c * 0.35);
    }
    // a paliçada: troncos lado a lado (os portões e a água ficam de fora)
    if (p.muro) {
      const m = p.muro, tronco = (x, y) => {
        g.fillStyle = '#3b2814'; g.beginPath(); g.arc(x, y, c * 0.24, 0, TAU2); g.fill();
        g.fillStyle = rnd() < 0.5 ? '#7a5532' : '#6b4a2b'; g.beginPath(); g.arc(x, y, c * 0.18, 0, TAU2); g.fill();
        g.fillStyle = 'rgba(255,230,180,.18)'; g.beginPath(); g.arc(x - c * 0.05, y - c * 0.05, c * 0.07, 0, TAU2); g.fill();
      };
      const passo = 0.42;
      for (const [a, b] of m.lados.n) for (let t = a + 0.21; t < b; t += passo) tronco(t * c, m.y1 * c);
      for (const [a, b] of m.lados.s) for (let t = a + 0.21; t < b; t += passo) tronco(t * c, m.y2 * c);
      for (const [a, b] of m.lados.o) for (let t = a + 0.21; t < b; t += passo) tronco(m.x1 * c, t * c);
      for (const [a, b] of m.lados.l) for (let t = a + 0.21; t < b; t += passo) tronco(m.x2 * c, t * c);
    }
    // as árvores
    for (const a of p.arvores) {
      const x = a.x * c, y = a.y * c, R = a.r * c;
      g.globalAlpha = 0.28; g.fillStyle = '#000'; g.beginPath(); g.arc(x + R * 0.16, y + R * 0.2, R, 0, TAU2); g.fill();
      if (p.terreno === 'neve') {
        // pinheiro visto de cima: uma estrela escura com neve na ponta dos galhos
        for (let camada = 0; camada < 3; camada++) {
          const rr = R * (1 - camada * 0.28);
          g.globalAlpha = 0.95; g.fillStyle = pal.copa[camada];
          g.beginPath();
          for (let i = 0; i <= 16; i++) { const an = (i / 16) * TAU2 + camada * 0.2, d = i % 2 ? rr * 0.55 : rr; const px = x + Math.cos(an) * d, py = y + Math.sin(an) * d; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
          g.fill();
        }
        g.globalAlpha = 0.85; g.fillStyle = '#f4f8fb';
        for (let i = 0; i < 6; i++) { const an = rnd() * TAU2, d = R * (0.3 + rnd() * 0.6); g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, R * 0.1, 0, TAU2); g.fill(); }
      } else if (p.terreno === 'areia') {
        // palmeira: folhas compridas a partir do meio
        g.globalAlpha = 0.95; g.strokeStyle = pal.copa[1]; g.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
          const an = (i / 7) * TAU2 + rnd() * 0.4;
          g.lineWidth = R * 0.32; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(an + 0.3) * R * 0.6, y + Math.sin(an + 0.3) * R * 0.6, x + Math.cos(an) * R, y + Math.sin(an) * R); g.stroke();
        }
        g.fillStyle = '#6b4a2b'; g.beginPath(); g.arc(x, y, R * 0.16, 0, TAU2); g.fill();
      } else {
        for (let i = 0; i < 9; i++) {
          const an = rnd() * TAU2, d = rnd() * R * 0.55;
          g.globalAlpha = 0.92; g.fillStyle = pal.copa[i % 3];
          g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, R * (0.42 + rnd() * 0.25), 0, TAU2); g.fill();
        }
        g.globalAlpha = 0.5; g.fillStyle = pal.luz; g.beginPath(); g.arc(x - R * 0.2, y - R * 0.25, R * 0.3, 0, TAU2); g.fill();
      }
    }
    g.globalAlpha = 1;
    // um escurecido de leve nas bordas
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.22)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    return cv;
  }

  /* ================= a cena ================= */
  // Monta a cena do plano: o fundo, as paredes e a porta de cada casa, os móveis, o nome em cima, a praça e a muralha.
  async function criar(p, nome) {
    const sc = newScene(String(nome || p.nome).trim().slice(0, 60) || p.nome);
    sc.cols = p.W; sc.rows = p.H;
    const c = sc.cell;
    sc.fog.dynamic = true; sc.fog.explored = true;      // as paredes das casas escondem o que está lá dentro
    sc.light = 'claro'; sc.tone = 'dia';
    sc.bgColor = (PAL[p.terreno] || PAL.campo).base;
    try { const cv = pintar(p, c); const a = await Assets.fromCanvas(cv, 'bg', sc.name); sc.bg.asset = a.id; } catch (e) { console.error(e); }
    const parede = (x1, y1, x2, y2, k, extra) => sc.walls.push(Object.assign({ id: uid('wl'), k: k || 'wall', x1: x1 * c, y1: y1 * c, x2: x2 * c, y2: y2 * c, open: false, locked: false }, extra || null));
    const medir = document.createElement('canvas').getContext('2d');
    const FS = 20;
    medir.font = `600 ${FS}px ${FONT_UI}`;
    for (const k of p.casas) {
      const x1 = k.x, y1 = k.y, x2 = k.x + k.w, y2 = k.y + k.h, pt = k.porta;
      // cada lado é uma parede; o da porta vira parede · porta · parede
      const lado = (lid, ax, ay, bx, by) => {
        if (pt.lado !== lid) { parede(ax, ay, bx, by); return; }
        if (ax === bx) { if (pt.y1 > ay) parede(ax, ay, ax, pt.y1); parede(ax, pt.y1, ax, pt.y2, 'door'); if (pt.y2 < by) parede(ax, pt.y2, ax, by); }
        else { if (pt.x1 > ax) parede(ax, ay, pt.x1, ay); parede(pt.x1, ay, pt.x2, ay, 'door'); if (pt.x2 < bx) parede(pt.x2, ay, bx, ay); }
      };
      lado('n', x1, y1, x2, y1); lado('s', x1, y2, x2, y2); lado('o', x1, y1, x1, y2); lado('l', x2, y1, x2, y2);
      for (const mv of k.moveis) if (Props.P[mv.id]) sc.tokens.push(Props.novo(sc, mv.id, mv.x * c, mv.y * c, mv.s, false));
      // o nome vai em cima da casa (embaixo, quando a porta é em cima: a porta não cobre o nome)
      const tw = medir.measureText(k.nome).width, emCima = pt.lado !== 'n';
      sc.shapes.push({ id: uid('sh'), k: 'text', x: Math.max(4, (x1 + k.w / 2) * c - tw / 2), y: emCima ? y1 * c - FS * 1.5 : y2 * c + FS * 0.35, txt: k.nome, fs: FS, s: '#f3ead2', sw: 0, f: null, a: 1, top: false, gm: false, lock: false, by: null });
    }
    if (p.muro) {
      const m = p.muro;
      for (const [a, b] of m.lados.n) parede(a, m.y1, b, m.y1);
      for (const [a, b] of m.lados.s) parede(a, m.y2, b, m.y2);
      for (const [a, b] of m.lados.o) parede(m.x1, a, m.x1, b);
      for (const [a, b] of m.lados.l) parede(m.x2, a, m.x2, b);
      for (const g of m.portoes) parede(g.x1, g.y1, g.x2, g.y2, 'door', { open: true });
    }
    if (Props.P.poco) sc.tokens.push(Props.novo(sc, 'poco', p.poco.x * c, p.poco.y * c, 1, false));
    if (Props.P.lampiao) for (const l of p.lampioes) sc.tokens.push(Props.novo(sc, 'lampiao', l.x * c, l.y * c, 1, false));
    for (const e of p.enfeites) if (Props.P[e.id]) sc.tokens.push(Props.novo(sc, e.id, e.x * c, e.y * c, e.s, false));
    normalizeScene(sc);
    Store.addScene(sc); Persist.scene(sc.id); Persist.meta();
    return sc;
  }

  /* ================= a janela ================= */
  const novaSemente = () => 1 + Math.floor(Math.random() * 2147483000);
  function previa(cv, p) {
    const cell = Math.max(6, Math.floor(Math.min(420 / p.W, 300 / p.H)));
    const fundo = pintar(p, cell);
    cv.width = fundo.width; cv.height = fundo.height;
    const g = cv.getContext('2d');
    g.drawImage(fundo, 0, 0);
    // as paredes e as portas, como no mapa; os móveis, como pontinhos
    g.lineCap = 'round';
    const seg = (x1, y1, x2, y2, cor, w) => { g.strokeStyle = cor; g.lineWidth = w; g.beginPath(); g.moveTo(x1 * cell, y1 * cell); g.lineTo(x2 * cell, y2 * cell); g.stroke(); };
    for (const k of p.casas) {
      for (const [a, b, cc, d] of [[k.x, k.y, k.x + k.w, k.y], [k.x, k.y + k.h, k.x + k.w, k.y + k.h], [k.x, k.y, k.x, k.y + k.h], [k.x + k.w, k.y, k.x + k.w, k.y + k.h]]) seg(a, b, cc, d, '#1b1612', Math.max(2, cell * 0.22));
      const pt = k.porta;
      seg(pt.x1, pt.y1, pt.x2, pt.y2, '#7fd1ff', Math.max(2, cell * 0.24));
      g.fillStyle = '#f3ead2';
      for (const mv of k.moveis) { g.beginPath(); g.arc((mv.x + mv.s / 2) * cell, (mv.y + mv.s / 2) * cell, Math.max(1.5, cell * 0.18 * mv.s), 0, Math.PI * 2); g.fill(); }
    }
    if (p.muro) for (const gt of p.muro.portoes) seg(gt.x1, gt.y1, gt.x2, gt.y2, '#7fd1ff', Math.max(2, cell * 0.2));
  }
  function abrir() {
    if (!isGM()) return;
    const K = UI.kit, { field, seg, toggle, btn, note, stepper } = K;
    const st = { tamanho: TAMANHOS[App.opt.vilaTam] ? App.opt.vilaTam : 'aldeia', terreno: TERRENOS_V.some(x => x[0] === App.opt.vilaTer) ? App.opt.vilaTer : 'campo',
      rio: App.opt.vilaRio != null ? !!App.opt.vilaRio : true, muralha: !!App.opt.vilaMuro, casas: 0, seed: novaSemente() };
    st.casas = TAMANHOS[st.tamanho].padrao;
    let plano = null, nomeMexido = false;
    const cv = h('canvas', { class: 'vila-prev', id: 'vila-prev', width: 420, height: 300, 'aria-label': 'Prévia do vilarejo' });
    const inNome = h('input', { id: 'vila-nome', class: 'in', type: 'text', maxlength: 60, autocomplete: 'off', 'aria-label': 'Nome da cena', oninput: () => { nomeMexido = true; } });
    const controles = h('div', { class: 'vila-c' }), resumo = h('p', { class: 'note', id: 'vila-resumo', role: 'status' });
    const salvarOpcoes = () => { App.opt.vilaTam = st.tamanho; App.opt.vilaTer = st.terreno; App.opt.vilaRio = st.rio; App.opt.vilaMuro = st.muralha; };
    const refazer = () => {
      plano = gerar(st);
      try { previa(cv, plano); } catch (e) { console.error(e); }
      if (!nomeMexido) inNome.value = plano.nome;
      const n = plano.casas.length, moveis = plano.casas.reduce((s, k) => s + k.moveis.length, 0);
      resumo.textContent = `${n} ${n === 1 ? 'casa' : 'casas'}` + (n < plano.pedidas ? ` (couberam ${n} das ${plano.pedidas})` : '') + ` · ${moveis} móveis · ${plano.W} × ${plano.H} quadrados` + (plano.rio ? ' · rio com ponte' : '') + (plano.muro ? ' · paliçada com ' + plano.muro.portoes.length + ' portões' : '') + '.';
    };
    const paint = () => {
      const T = TAMANHOS[st.tamanho];
      controles.replaceChildren(
        h('div', { class: 'vila-l' },
          field('Tamanho', seg('vila-tam', st.tamanho, Object.keys(TAMANHOS).map(k => [k, TAMANHOS[k].n, null, k === 'aldeia' ? 'Uma rua, ' + TAMANHOS.aldeia.W + ' × ' + TAMANHOS.aldeia.H + ' quadrados' : 'Duas ruas que se cruzam na praça, ' + TAMANHOS.vila.W + ' × ' + TAMANHOS.vila.H + ' quadrados']),
            v => { st.tamanho = v; st.casas = TAMANHOS[v].padrao; salvarOpcoes(); paint(); refazer(); }), 'stack'),
          field('Terreno', seg('vila-ter', st.terreno, TERRENOS_V.map(([k, n]) => [k, n]), v => { st.terreno = v; salvarOpcoes(); paint(); refazer(); }), 'stack')),
        h('div', { class: 'vila-l' },
          field('Casas', stepper('vila-casas', st.casas, T.casas[0], T.casas[1], v => { st.casas = v; paint(); refazer(); }, 'Quantas casas'), 'stack'),
          toggle('vila-rio', st.rio, v => { st.rio = v; salvarOpcoes(); refazer(); }, 'Com rio (e uma ponte)'),
          toggle('vila-muro', st.muralha, v => { st.muralha = v; salvarOpcoes(); refazer(); }, 'Com paliçada (portões abertos)')));
    };
    paint(); refazer();
    UI.modal({
      title: 'Gerar um vilarejo', wide: true,
      body: h('div', { class: 'vila' }, controles,
        h('div', { class: 'vila-p' }, cv, h('div', { class: 'row' }, btn('Gerar outro', () => { st.seed = novaSemente(); refazer(); }, { icon: 'reset', id: 'vila-outro', title: 'Sorteia outro vilarejo com as mesmas escolhas' }), resumo)),
        field('Nome da cena', inNome, 'stack'),
        note('Sai uma cena nova, com as paredes de cada casa, uma porta, alguns móveis e o nome em cima. A névoa dinâmica vem ligada: as paredes bloqueiam a visão, e os jogadores enxergam a partir dos tokens deles. Tudo continua editável; as cenas que já existem não mudam.')),
      actions: [{ label: 'Cancelar' }, {
        label: 'Criar a cena', kind: 'primary', keep: true, run: () => {
          const b = UI.kit.card() && UI.kit.card().querySelector('.modal-a .btn.primary');
          if (b) { b.disabled = true; b.textContent = 'Criando…'; }
          const p = plano;
          criar(p, inNome.value).then(sc => {
            UI.closeModal();
            UI.switchScene(sc.id);
            const n = p.casas.length;
            UI.toast(`"${sc.name}" criada: ${n} ${n === 1 ? 'casa' : 'casas'}, com paredes, portas, móveis e nomes. Tudo é editável.`, { long: true });
          }, err => { console.error(err); if (b) { b.disabled = false; b.textContent = 'Criar a cena'; } UI.toast('Não deu para criar a cena: ' + ((err && err.message) || 'falha ao guardar o fundo') + '.'); });
          return false;
        },
      }],
    });
  }
  return { TAMANHOS, TIPOS, gerar, pintar, criar, abrir };
})();
