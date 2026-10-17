/* ---------------------------------------------------------------
   10f4. TRIBO — a aldeia da tribo (lote 7, parte 4b)
   Uma aba da janela "Gerar um lugar…", feita com o motor dos encontros (Encontro.motor: a grade de ocupação, as
   peças, a vegetação, o desenho e a cena). As moradias (uma escolha própria: tendas, cabanas, iurtes, palafitas ou
   iglus) em volta da praça, com a fogueira (e os troncos de sentar) e o totem no meio e a do chefe, maior, do outro
   lado da praça, de frente para o portão; uma trilha de cada porta até a praça. A paliçada de estacas com o portão
   (abre e fecha), as torres de vigia (4 m) e o fosso com estacas por fora (a ponte de troncos diante do portão); os
   lugares sagrados (o círculo de pedras com a fogueira dos ancestrais, o mastro com crânios e os totens menores); a
   vida do dia a dia (o cercado com os bichos pintados, os secadores de peles e de carne, o forno de barro, o tear, a
   lenha e as canoas na beira do riacho). Nas palafitas, a aldeia fica na beira de um lago: o píer sai da praça até a
   passarela comprida, e as moradias ficam dos dois lados dela, sobre as estacas, cada uma com o seu deque. Cada
   moradia é fechada e tem um marcador de Entrada na porta (oculto): dois cliques geram o interior (Tribo.planta: a
   fogueira no meio, as peles para dormir, os baús e os jarros; na do chefe, o assento, as armas e o totem).
   --------------------------------------------------------------- */
const Tribo = (() => {
  const TAU = Math.PI * 2, MO = Encontro.motor;
  const MORADIAS = [['tenda', 'Tendas'], ['cabana', 'Cabanas'], ['iurte', 'Iurtes'], ['palafita', 'Palafitas'], ['iglu', 'Iglus']];
  const NOME = { tenda: 'Tenda', cabana: 'Cabana', iurte: 'Iurte', palafita: 'Palafita', iglu: 'Iglu' };
  const NOME_ALDEIA = { tenda: 'Aldeia das tendas', cabana: 'Aldeia das cabanas', iurte: 'Aldeia das iurtes', palafita: 'Aldeia das palafitas', iglu: 'Aldeia dos iglus' };
  const REDONDA = { tenda: true, iurte: true, iglu: true };
  // as medidas (em quadrados) da moradia comum e da do chefe (a cabana e a palafita: o lado comprido de frente para a praça
  // ou para a passarela)
  const MEDIDA = { tenda: [[3, 3], [5, 5]], iurte: [[4, 4], [5, 5]], iglu: [[3, 3], [5, 5]], cabana: [[4, 3], [6, 4]], palafita: [[4, 3], [5, 4]] };
  const TAMANHOS = { pequena: { n: 'Pequena', W: 36, H: 30, mor: 5, praca: 3.1 }, media: { n: 'Média', W: 44, H: 36, mor: 8, praca: 4 }, grande: { n: 'Grande', W: 52, H: 42, mor: 12, praca: 4.6 } };
  const TERRENOS_T = [['campo', 'Campo'], ['floresta', 'Floresta'], ['selva', 'Selva'], ['deserto', 'Deserto'], ['neve', 'Neve'], ['pantano', 'Pântano']];
  const PAL_DE = { campo: 'campo', floresta: 'floresta', selva: 'selva', deserto: 'areia', neve: 'neve', pantano: 'pantano' };
  const ANG = { l: 0, s: Math.PI / 2, o: Math.PI, n: -Math.PI / 2 };
  const DIR = { s: [0, 1], n: [0, -1], o: [-1, 0], l: [1, 0] };
  const OPOSTO = { s: 'n', n: 's', o: 'l', l: 'o' };
  // as cores de cada estilo: o couro das tendas (três tons), as faixas pintadas, o feltro das iurtes e a palha dos telhados
  const COR = {
    comum: { couro: ['#b48d5e', '#9a764a', '#cfab78'], faixa: '#8a2e1e', faixa2: '#2a2018', feltro: ['#e6dcc4', '#cbbd9c'], palha: ['#c9a85a', '#a8873e', '#dcc07a'] },
    oriental: { couro: ['#c9a676', '#b08c5c', '#ddbd8e'], faixa: '#b0281c', faixa2: '#e0b040', feltro: ['#ece2c8', '#d4c49e'], palha: ['#c9a85a', '#a8873e', '#dcc07a'] },
    nordico: { couro: ['#8e6c48', '#76583a', '#a8845a'], faixa: '#2f4a6e', faixa2: '#d8ccb0', feltro: ['#d8d0bc', '#b8ad94'], palha: ['#a8925e', '#8a7444', '#c0aa74'] },
    desertico: { couro: ['#d8b98a', '#c4a272', '#e8cfa4'], faixa: '#a8401e', faixa2: '#2f8c8c', feltro: ['#f0e6cc', '#dccca8'], palha: ['#d8bc7a', '#bfa060', '#e8d29a'] },
    elfico: { couro: ['#a8b48a', '#8c9a70', '#c0cca2'], faixa: '#4f7a3a', faixa2: '#e8e0c0', feltro: ['#e4ead4', '#c8d2b4'], palha: ['#b8b06a', '#9a9250', '#d0c888'] },
    anao: { couro: ['#8a7a66', '#72644f', '#a39480'], faixa: '#5a5e66', faixa2: '#c9a24a', feltro: ['#cfc8b8', '#b2a998'], palha: ['#a8925e', '#8a7444', '#c0aa74'] },
  };
  const cor = est => COR[Estilos.valido(est)] || COR.comum;
  const MAD = Object.assign({ luz: '#bf9462' }, Paisagem.MAD);
  // o chão batido da aldeia e da praça, em cada terreno
  const CHAO = {
    neve: { aldeia: ['#d4dbe0', '#c4ccd2', '#e2e7ea'], praca: ['#c9c2b6', '#b8b0a2', '#d8d2c6', '#aaa294'] },
    deserto: { aldeia: ['#c9a66e', '#bd9a62', '#d4b27c'], praca: ['#b8935c', '#a8844e', '#c7a26a', '#9c7a46'] },
    pantano: { aldeia: ['#5e5236', '#52482e', '#6a5e40'], praca: ['#6b5a40', '#5e4f38', '#7a6a4c', '#54462f'] },
    outro: { aldeia: ['#7a7048', '#6e6440', '#867a52'], praca: ['#6b5a40', '#7a6a4c', '#5e4f38', '#857455'] },
  };

  /* ================= o plano (conta pura) ================= */
  // a trava do traçado só vale para as mesmas escolhas (o tamanho, as moradias, o terreno e as três chaves)
  function limparTrava(t, o) {
    if (!t || typeof t !== 'object') return null;
    if (t.tamanho !== o.tamanho || t.moradias !== o.moradias || t.terreno !== o.terreno || !!t.palicada !== o.palicada || !!t.sagrados !== o.sagrados || !!t.vida !== o.vida) return null;
    const s = Math.round(Number(t.s));
    return Number.isFinite(s) && s >= 1 && s <= 2147483647 ? { s } : null;
  }
  // os pontos de uma elipse (em quadrados), um a cada 0,7 quadrado, mais ou menos
  const elipsePts = (cx, cy, rx, ry) => { const n = Math.max(24, Math.round((rx + ry) * Math.PI / 0.7)), out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return out; };
  // os pedaços seguidos (numa volta fechada) dos pontos que ficam: [[p, p, …], …]
  function trechos(pts, fica) {
    const n = pts.length, ok = pts.map(fica);
    if (ok.every(Boolean)) return [pts.concat([pts[0]])];
    const ini = ok.findIndex(v => !v), out = [];
    let atual = [];
    for (let k = 1; k <= n; k++) {
      const i = (ini + k) % n;
      if (ok[i]) atual.push(pts[i]);
      else { if (atual.length >= 2) out.push(atual); atual = []; }
    }
    if (atual.length >= 2) out.push(atual);
    return out;
  }
  const dentroElipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  // um ponto sim, outro não (as pontas sempre): as paredes da paliçada, com menos pedaços
  const rala = t => t.filter((_, i) => i % 2 === 0 || i === t.length - 1);

  function gerar(o) {
    o = o || {};
    const tamanho = TAMANHOS[o.tamanho] ? o.tamanho : 'media', T = TAMANHOS[tamanho], W = T.W, H = T.H;
    const moradias = MEDIDA[o.moradias] ? o.moradias : 'tenda';
    const terreno = TERRENOS_T.some(t => t[0] === o.terreno) ? o.terreno : 'floresta', pal = PAL_DE[terreno];
    const estilo = Estilos.valido(o.estilo), seed = (Math.round(Number(o.seed)) >>> 0) || 1;
    const com = { palicada: o.palicada !== false, sagrados: o.sagrados !== false, vida: o.vida !== false };
    const trava = limparTrava(o.trava, Object.assign({ tamanho, moradias, terreno }, com));
    const sT = trava ? trava.s : (MO.sub(seed, 1) % 2147483000) + 1;
    const K = MO.contexto(W, H, terreno, 'tribo', estilo, 'trilha', sT, pal), P = K.P, { r } = K;
    // (os detalhes têm outro sorteio: com o traçado travado, "Gerar outro" troca só eles)
    const rV = mulberry((MO.sub(seed, 2) % 2147483000) + 1), rv = (a, b) => a + rV() * (b - a);
    const palafita = moradias === 'palafita', Rp = T.praca, CHT = CHAO[terreno] || CHAO.outro;
    P.paredes = [];
    // o lado do portão (por onde a trilha chega): u aponta para ele
    const ladoG = K.pick(['s', 'n', 'o', 'l']), aG = ANG[ladoG], [ux, uy] = DIR[ladoG];
    // o riacho (com a vida do dia a dia, fora das palafitas), num dos lados curtos que não é o do portão; a aldeia fica
    // fora dele
    const ladoR = !palafita && com.vida ? K.pick(['o', 'l'].filter(l => l !== ladoG)) : null;
    const fx0 = ladoR === 'o' ? 5.5 : 0, fx1 = ladoR === 'l' ? W - 5.5 : W, fy0 = 0, fy1 = H;
    // o meio da aldeia (nas palafitas, mais para o lado do portão: o lago fica do outro lado)
    const cx = palafita ? Math.round(W / 2 + ux * W * 0.16) : (fx0 + fx1) / 2 + r(-1, 1), cy = palafita ? Math.round(H / 2 + uy * H * 0.16) : (fy0 + fy1) / 2 + r(-0.6, 0.6);
    const d0 = Rp + 0.8;                                         // (palafitas) do meio da praça até a beira do lago
    // os raios da paliçada: cabem no mapa, com o fosso por fora (nas palafitas, o lado do lago não conta)
    const M0 = 2.8;
    let rx = Math.min(W * 0.36, cx - fx0 - M0, fx1 - cx - M0), ry = Math.min(H * 0.36, cy - fy0 - M0, fy1 - cy - M0);
    if (palafita) { if (ux) rx = Math.min(W * 0.36, ux > 0 ? W - cx - M0 : cx - M0); else ry = Math.min(H * 0.36, uy > 0 ? H - cy - M0 : cy - M0); }
    rx = Math.max(rx, Rp + 2); ry = Math.max(ry, Rp + 2);
    let lago = null;                                             // (o contorno do lago das palafitas)
    const naAgua = (x, y) => !!lago && (MO.dentroPoli(lago, x, y) || ((x - cx) * -ux + (y - cy) * -uy) > d0 + 1.6);
    const gx = cx + ux * rx, gy = cy + uy * ry;                 // o portão (ou, sem paliçada, por onde a trilha sai)

    // ---- a água: o lago das palafitas ou o riacho
    if (palafita) {
      const vx = -uy, vy = ux, L = Math.max(W, H) + 4, beira = [], fase = r(0, TAU), onda = r(0.7, 1.1);
      for (let t = -L; t <= L; t += 2) { const d = d0 + Math.sin(t * 0.22 + fase) * onda * (Math.abs(t) > 3 ? 1 : 0.4) + r(-0.35, 0.35); beira.push([cx - ux * d + vx * t, cy - uy * d + vy * t]); }
      const fim = beira[beira.length - 1], ini = beira[0];
      lago = beira.concat([[fim[0] - ux * L, fim[1] - uy * L], [ini[0] - ux * L, ini[1] - uy * L]]);
      K.poeLago(lago, 'agua', -1.5);
      P.juncos = 0.12;
    } else if (ladoR) {
      const vert = ladoR === 'o' || ladoR === 'l', fundo = r(2.2, 3), base = ladoR === 'o' || ladoR === 'n' ? fundo : (vert ? W : H) - fundo, L = vert ? H : W;
      const ctrl = [0, 0.33, 0.66, 1].map(t => (vert ? [base + r(-0.8, 0.8), -1 + t * (L + 2)] : [-1 + t * (L + 2), base + r(-0.8, 0.8)]));
      P.riacho = { lado: ladoR, pts: K.poeRio(ctrl, r(0.8, 1.05), 'agua', -1.2) };
      P.juncos = 0.1;
    }
    // ---- o chão batido da aldeia e a praça, com a fogueira no meio e os troncos de sentar em volta
    K.mancha(MO.blob(K.rT, cx, cy, rx * 0.97, ry * 0.97, 28, 0.08), CHT.aldeia, { a: 0.42 });
    const praca = MO.blob(K.rT, cx, cy, Rp, Rp * 0.9, 16, 0.18);
    K.mancha(praca, CHT.praca, { pedrisco: ['#8a7a5a', '#4e4330'] });
    K.marcaPoli(praca, 5, true);
    P.tracado.push({ k: 'poli', pts: praca });
    const fgx = Math.floor(cx), fgy = Math.floor(cy);
    P.objetos.push({ id: 'fogueira', x: fgx, y: fgy, s: 1, rot: 0 }); K.pos(fgx, fgy, 4);
    K.pinta(1, 'assentos', { x: fgx + 0.5, y: fgy + 0.5, r: 1.7, angs: [1, 3, 5, 7].map(k => aG + k * Math.PI / 4) });

    // ---- a paliçada, o portão, as torres de vigia e o fosso com estacas
    let portao = null;
    if (com.palicada) {
      const largP = 1.6, tr = trechos(elipsePts(cx, cy, rx, ry), ([x, y]) => Math.hypot(x - gx, y - gy) > largP && !naAgua(x, y));
      P.palicada = tr;
      for (const t of tr) {
        K.marcaLinha(t, 0.45, 3, true);
        const q = rala(t);
        for (let i = 1; i < q.length; i++) P.visao.push([q[i - 1][0], q[i - 1][1], q[i][0], q[i][1]]);
        P.tracado.push({ k: 'linha', pts: t, hw: 0.5 });
      }
      // o portão: entre as pontas dos dois trechos que encostam nele (uma porta: abre e fecha)
      const pontas = [];
      for (const t of tr) for (const q of [t[0], t[t.length - 1]]) if (Math.hypot(q[0] - gx, q[1] - gy) < largP + 1) pontas.push(q);
      pontas.sort((a, b) => Math.hypot(a[0] - gx, a[1] - gy) - Math.hypot(b[0] - gx, b[1] - gy));
      if (pontas.length >= 2) {
        const [a, b] = pontas;
        portao = { a, b, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 };
        P.paredes.push({ k: 'door', x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
        K.marcaLinha([a, b], 0.7, 1, true);
      }
      K.pinta(2, 'palicada', { trechos: tr, portao });
      // as torres de vigia (2 × 2, a 4 m), logo para dentro da paliçada: dos dois lados do portão (um pouco para fora
      // dele, sem fechar a passagem) e, na aldeia média e na grande, mais duas lá atrás
      const torres = [];
      // (px, py: um ponto da paliçada; a torre fica um quadrado e meio para dentro, um pouco para o lado em "fora")
      const torreEm = (px, py, fora) => {
        if (naAgua(px, py)) return;
        // (no portão, "para dentro" é reto, de costas para ele; lá atrás, para o meio da aldeia)
        const d0 = Math.hypot(cx - px, cy - py) || 1, [dx, dy] = fora ? [-ux, -uy] : [(cx - px) / d0, (cy - py) / d0], [ex, ey] = fora || [0, 0];
        const x = Math.round(px + dx * 1.5 + ex * 1.6 - 1), y = Math.round(py + dy * 1.5 + ey * 1.6 - 1);
        if (torres.some(q => Math.abs(q.x - x) < 3 && Math.abs(q.y - y) < 3)) return;
        for (let j = y; j < y + 2; j++) for (let i = x; i < x + 2; i++) { const v = K.at(i, j); if (v === 1 || v === 2 || v === 9) return; }
        torres.push({ x, y, s: 2, esc: Math.atan2(dy, dx) });
      };
      // as do portão: além das pontas da paliçada (a passagem fica livre)
      if (portao) for (const q of [portao.a, portao.b]) { const ex = q[0] - portao.x, ey = q[1] - portao.y, e = Math.hypot(ex, ey) || 1; torreEm(q[0], q[1], [ex / e, ey / e]); }
      if (tamanho !== 'pequena') for (const da of [2.05, -2.05]) torreEm(cx + Math.cos(aG + da) * rx, cy + Math.sin(aG + da) * ry);
      for (const q of torres) {
        for (let j = q.y; j < q.y + 2; j++) for (let i = q.x; i < q.x + 2; i++) K.pos(i, j, 3);
        P.relevo.push({ t: 'plataforma', alt: 4, k: 'rect', x: q.x, y: q.y, w: 2, h: 2 });
        K.pinta(3, 'torreVigia', q);
        P.tracado.push({ k: 'poli', pts: [[q.x, q.y], [q.x + 2, q.y], [q.x + 2, q.y + 2], [q.x, q.y + 2]] });
      }
      P.torres = torres;
      // o fosso, a um quadrado e meio da paliçada, por fora (inteiro: a ponte de troncos passa por cima, no portão)
      for (const t of trechos(elipsePts(cx, cy, rx + 1.6, ry + 1.6), ([x, y]) => !naAgua(x, y))) {
        K.pinta(0, 'fossoEstacas', { pts: t, larg: 1, fora: -1 });
        K.marcaLinha(t, 0.55, 6, true);
        P.relevo.push({ t: 'fosso', alt: -1.5, k: 'free', pts: t, sw: 1 });
      }
      // a ponte de troncos amarrados, por cima do fosso, diante do portão
      if (portao) {
        const bx = cx + ux * (rx + 1.6), by = cy + uy * (ry + 1.6), pts = Estilos.retangulo(bx, by, 2.8, 2.4, aG);
        K.marcaPoli(pts, 1, true);
        K.pinta(1, 'ponteTroncos', { x: bx, y: by, comp: 2.8, larg: 2.4, ang: aG });
        P.relevo.push({ t: 'plataforma', alt: 0.3, k: 'poly', pts });
        P.tracado.push({ k: 'poli', pts });
      }
    }
    // ---- a trilha: da praça, pelo portão, até a borda do mapa
    {
      const fora = K.borda(ladoG, 0.5), meio = portao ? [portao.x, portao.y] : [gx, gy], j1 = r(-1.5, 1.5), j2 = r(-3, 3);
      K.poeCaminho([[cx + ux * Rp * 0.6, cy + uy * Rp * 0.6], meio, [meio[0] + ux * 4 - uy * j1, meio[1] + uy * 4 + ux * j1], [fora[0] - uy * j2, fora[1] + ux * j2]], 'trilha');
    }

    // ---- as moradias, o círculo de pedras e o cercado
    const casas = [];
    // o lado de (x, y, w, h) que fica de frente para a praça
    const ladoPara = (x, y, w, h) => { const dx = cx - (x + w / 2), dy = cy - (y + h / 2); return Math.abs(dx) / w > Math.abs(dy) / h ? (dx < 0 ? 'o' : 'l') : (dy < 0 ? 'n' : 's'); };
    // cabe ali: dentro do mapa, sobre o chão livre (ou a água, nas palafitas), com um quadrado de folga em volta
    const cabe = (x, y, w, h, agua) => {
      if (x < 1 || y < 1 || x + w > W - 1 || y + h > H - 1) return false;
      for (let j = y - 1; j < y + h + 1; j++) for (let i = x - 1; i < x + w + 1; i++) {
        const v = K.at(i, j), dentro = i >= x && i < x + w && j >= y && j < y + h;
        if (dentro ? !(v === 0 || (agua && v === 2)) : v === 3 || v === 1 || v === 9) return false;
      }
      return true;
    };
    function casaEm(x, y, w, h, lado, chefe, deque) {
      if (deque) {
        K.pinta(1, 'pier', deque);
        K.marcaPoli([[deque.x, deque.y], [deque.x + deque.w, deque.y], [deque.x + deque.w, deque.y + deque.h], [deque.x, deque.y + deque.h]], 1, true);
        P.relevo.push({ t: 'plataforma', alt: 1, k: 'rect', x: deque.x, y: deque.y, w: deque.w, h: deque.h });
      }
      const k = K.predio({ tipo: moradias, x, y, w, h, forma: REDONDA[moradias] ? 'oct' : 'ret', lado, aberto: false, interior: moradias });
      k.desenho = moradias; k.chefe = !!chefe;
      if (REDONDA[moradias]) { k.corte = Math.max(1, Math.round(Math.min(w, h) * 0.293)); P.tracado[P.tracado.length - 1].pts = Estilos.contorno(k); }
      if (deque) k.deque = deque;
      casas.push(k);
      return k;
    }
    const dentroPal = (x, y, m) => dentroElipse(x, y, cx, cy, rx - (m || 0), ry - (m || 0));
    const dentroPalRet = (x, y, w, h) => dentroPal(x - 0.3, y - 0.3, 1) && dentroPal(x + w + 0.3, y + h + 0.3, 1) && dentroPal(x - 0.3, y + h + 0.3, 1) && dentroPal(x + w + 0.3, y - 0.3, 1);
    // o raio da paliçada no ângulo a (a partir do meio) e o lugar de uma coisa de raio rr no anel entre a praça e a
    // paliçada (f: 0 = junto da praça, 1 = junto da paliçada)
    const rP = a => 1 / Math.sqrt((Math.cos(a) / rx) ** 2 + (Math.sin(a) / ry) ** 2);
    const noAnel = (a, rr, f) => { const d0b = Rp + 0.6 + rr, d1b = rP(a) - 1.1 - rr, d = d1b < d0b ? (d0b + d1b) / 2 : d0b + (d1b - d0b) * f; return [cx + Math.cos(a) * d, cy + Math.sin(a) * d]; };
    const longeDaTrilha = (x, y, m) => !P.caminhos.length || MO.distLinha(P.caminhos[0].pts, x, y) > m;
    // uma moradia no anel entre a praça e a paliçada (com a paliçada ou sem ela, a aldeia fica do mesmo tamanho)
    const poeCasa = (a, chefe, f0) => {
      const base = MEDIDA[moradias][chefe ? 1 : 0];
      for (const df of [0, -0.2, 0.2, -0.4, 0.4]) for (const da of [0, 0.07, -0.07, 0.14, -0.14, 0.21, -0.21]) {
        const aa = a + da;
        let [w, h] = base;
        // (a cabana: o lado comprido de frente para a praça)
        if (!REDONDA[moradias] && Math.abs(Math.cos(aa)) > Math.abs(Math.sin(aa))) [w, h] = [h, w];
        const q = noAnel(aa, Math.hypot(w, h) / 2 * 0.8, clamp(f0 + df, 0, 1)), x = Math.round(q[0] - w / 2), y = Math.round(q[1] - h / 2);
        if (!cabe(x, y, w, h, false) || !dentroPalRet(x, y, w, h)) continue;
        return casaEm(x, y, w, h, ladoPara(x, y, w, h), chefe, null);
      }
      return null;
    };
    // a do chefe, do outro lado da praça (de frente para o portão), antes de tudo
    let chefe = null;
    if (!palafita) {
      chefe = poeCasa(aG + Math.PI, true, 0.5);
      for (let k = 1; !chefe && k < 12; k++) chefe = poeCasa(aG + Math.PI + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.28, true, 0.5);
    }
    // ---- o círculo de pedras com a fogueira dos ancestrais: fora da paliçada, num lugar livre longe da trilha; se não
    //      couber, lá atrás, dentro dela (fica reservado antes das moradias)
    if (com.sagrados) {
      const R0 = 2.9;
      // (com uma folga em volta: nada fica encostado nas pedras)
      let c0 = K.lugar(R0 + 0.9, v => v === 0 || v === 4, 300, (x, y) => !dentroElipse(x, y, cx, cy, rx + 1.5, ry + 1.5) && longeDaTrilha(x, y, 4));
      for (const a of (palafita ? [1.2, -1.2, 0.8, -0.8, 1.6, -1.6] : [Math.PI + 0.95, Math.PI - 0.95, Math.PI + 1.35, Math.PI - 1.35, Math.PI + 0.6, Math.PI - 0.6, Math.PI + 1.75, Math.PI - 1.75]).map(x => aG + x)) for (const f of [0.8, 0.5]) {
        if (c0) break;
        const q = noAnel(a, R0, f);
        if (q && dentroPal(q[0], q[1], R0 + 1) && K.livreCirc(q[0], q[1], R0 + 0.9, v => v === 0) && longeDaTrilha(q[0], q[1], R0 + 0.5)) c0 = q;
      }
      if (c0) {
        const [sx, sy] = c0, chao = MO.blob(K.rT, sx, sy, R0, R0 * 0.93, 14, 0.12);
        K.mancha(chao, terreno === 'neve' ? ['#e6ecf0', '#d8e0e6', '#f0f4f6'] : terreno === 'deserto' ? MO.CH.areia : MO.CH.clareira, {});
        K.marcaPoli(chao, 5, true); K.marcaCirc(sx, sy, R0 + 0.9, 5);
        const a0 = r(0, TAU);
        for (let i = 0; i < 7; i++) { const a = a0 + i / 7 * TAU, x = sx + Math.cos(a) * 2.15, y = sy + Math.sin(a) * 2.15; P.rochas.push({ x, y, r: 0.52, cores: ['#a8a59c', '#7d7a72', '#55534d'] }); K.marcaCirc(x, y, 0.42, 3, true); }
        K.pinta(0, 'anelAncestral', { x: sx, y: sy, r: 1.1 });
        const fx = Math.round(sx - 1), fy = Math.round(sy - 1);
        P.objetos.push({ id: 'fogueira', x: fx, y: fy, s: 2, rot: 0 });
        for (let j = fy; j < fy + 2; j++) for (let i = fx; i < fx + 2; i++) K.pos(i, j, 4);
        P.sagrado = { x: sx, y: sy, r: R0 };
        P.tracado.push({ k: 'circ', x: sx, y: sy, r: R0 });
      }
      // o mastro com crânios, junto da trilha, logo fora do portão
      const lado = r() < 0.5 ? 1 : -1;
      for (const [fu, fv] of [[3.2, 2.2], [3.2, -2.2], [-3.4, 1.9], [-3.4, -1.9], [-4.4, 2.2], [-4.4, -2.2]]) {
        const mx = gx + ux * fu - uy * fv * lado, my = gy + uy * fu + ux * fv * lado;
        if (K.dentro(mx, my, 1) && K.livreCirc(mx, my, 0.7, v => v === 0 || v === 4 || v === 6)) { K.pinta(3, 'mastroCranios', { x: mx, y: my }); K.marcaCirc(mx, my, 0.6, 3, true); P.mastro = [mx, my]; break; }
      }
    }
    // ---- o cercado (a cerca baixa, com a porteira aberta do lado da praça): de um lado da praça, junto da paliçada; se
    //      não couber, por fora (também fica reservado antes das moradias)
    let cerc = null;
    if (com.vida) {
      const c1 = tamanho === 'pequena' ? 5 : 6, c2 = tamanho === 'pequena' ? 4 : 5;
      const livreRet = (x, y, w, h) => { for (let j = y - 1; j <= y + h; j++) for (let i = x - 1; i <= x + w; i++) { const v = K.at(i, j), dentro = i >= x && i < x + w && j >= y && j < y + h; if (dentro ? v !== 0 : !(v === 0 || v === 4 || v === 5)) return false; } return true; };
      const lados = r() < 0.5 ? [1, -1] : [-1, 1];
      for (const s of lados) for (const da of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.2, -1.2]) for (const f of [0.85, 0.55, 0.3]) {
        if (cerc) break;
        const a = aG + s * Math.PI / 2 + da, deitado = Math.abs(Math.sin(a)) > Math.abs(Math.cos(a)), w = deitado ? c1 : c2, h = deitado ? c2 : c1;
        const q = noAnel(a, Math.hypot(w, h) / 2 * 0.8, f), x = Math.round(q[0] - w / 2), y = Math.round(q[1] - h / 2);
        if (dentroPalRet(x, y, w, h) && livreRet(x, y, w, h)) cerc = { x, y, w, h };
      }
      for (let t = 0; t < 200 && !cerc; t++) {
        const x = Math.floor(r(2, W - c1 - 2)), y = Math.floor(r(2, H - c2 - 2));
        if (!dentroElipse(x + c1 / 2, y + c2 / 2, cx, cy, rx + 1, ry + 1) && livreRet(x, y, c1, c2) && longeDaTrilha(x + c1 / 2, y + c2 / 2, 3)) cerc = { x, y, w: c1, h: c2 };
      }
      if (cerc) {
        const { x, y, w, h } = cerc, lado = ladoPara(x, y, w, h), meio = lado === 'n' || lado === 's' ? x + Math.floor(w / 2) : y + Math.floor(h / 2);
        Object.assign(cerc, { lado, meio });
        const C4 = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], lados4 = { n: [C4[0], C4[1]], l: [C4[1], C4[2]], s: [C4[3], C4[2]], o: [C4[0], C4[3]] };
        // a cerca é mureta: deixa ver, não deixa passar
        for (const [l, [a, b]] of Object.entries(lados4)) {
          if (l !== lado) { P.paredes.push({ k: 'mureta', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }); continue; }
          if (l === 'n' || l === 's') P.paredes.push({ k: 'mureta', x1: a[0], y1: a[1], x2: meio, y2: a[1] }, { k: 'mureta', x1: meio + 1, y1: a[1], x2: b[0], y2: b[1] });
          else P.paredes.push({ k: 'mureta', x1: a[0], y1: a[1], x2: a[0], y2: meio }, { k: 'mureta', x1: a[0], y1: meio + 1, x2: b[0], y2: b[1] });
        }
        for (let j = y - 1; j <= y + h; j++) for (let i = x - 1; i <= x + w; i++) if (K.at(i, j) === 0 || (i >= x && i < x + w && j >= y && j < y + h)) K.pos(i, j, 5);
        P.cercado = { x, y, w, h };
        P.tracado.push({ k: 'poli', pts: C4 });
      }
    }
    const noCercado = (x, y) => cerc && x >= cerc.x - 0.5 && x <= cerc.x + cerc.w + 0.5 && y >= cerc.y - 0.5 && y <= cerc.y + cerc.h + 0.5;
    if (palafita) {
      /* sobre o lago: o píer sai da praça até a passarela comprida (paralela à beira); a do chefe do lado de lá, bem na
         frente do píer, e as outras dos dois lados da passarela (do lado de cá só quando o lago é fundo o bastante) */
      const ax = -ux, ay = -uy, vx = -uy, vy = ux;
      const ptP = (sv, sa) => [cx + vx * sv + ax * sa, cy + vy * sv + ay * sa];
      const ret = (v0, v1, a0, a1) => { const p = ptP(v0, a0), q = ptP(v1, a1); return { x: Math.min(p[0], q[0]), y: Math.min(p[1], q[1]), w: Math.abs(q[0] - p[0]), h: Math.abs(q[1] - p[1]) }; };
      const borda = ax < 0 ? cx : ax > 0 ? W - cx : ay < 0 ? cy : H - cy;
      const [L0, D0] = MEDIDA.palafita[0], [L1, D1] = MEDIDA.palafita[1];
      const perto = Math.ceil(d0 + D0 + 4.5), J = perto + D1 + 4 <= borda ? perto : Math.ceil(d0 + 2.6), doisLados = J === perto;
      const lugares = [{ s0: -Math.floor(L1 / 2), L: L1, D: D1, longe: true, chefe: true }];
      for (let i = 0, fim = -Math.floor(L1 / 2) + L1, ini = -Math.floor(L1 / 2); i < 8; i++) {
        lugares.push({ s0: fim + 3, L: L0, D: D0, longe: true }, { s0: ini - 3 - L0, L: L0, D: D0, longe: true });
        fim += 3 + L0; ini -= 3 + L0;
        if (doisLados) lugares.push({ s0: 3 + i * (L0 + 3), L: L0, D: D0, longe: false }, { s0: -3 - L0 - i * (L0 + 3), L: L0, D: D0, longe: false });
      }
      // (a do chefe primeiro; depois as mais perto do píer)
      lugares.sort((a, b) => (b.chefe ? 1 : 0) - (a.chefe ? 1 : 0) || Math.abs(a.s0 + a.L / 2) - Math.abs(b.s0 + b.L / 2));
      let vMin = -1, vMax = 1;
      for (const q of lugares) {
        if (casas.length >= T.mor + 1) break;
        const a0 = q.longe ? J + 2 : J - 2 - q.D, rr = ret(q.s0, q.s0 + q.L, a0, a0 + q.D);
        if (!cabe(rr.x, rr.y, rr.w, rr.h, true)) continue;
        casaEm(rr.x, rr.y, rr.w, rr.h, q.longe ? ladoG : OPOSTO[ladoG], !!q.chefe, ret(q.s0 - 1, q.s0 + q.L + 1, a0 - 1, a0 + q.D + 1));
        vMin = Math.min(vMin, q.s0 - 1); vMax = Math.max(vMax, q.s0 + q.L + 1);
      }
      K.poePassarela([ptP(0, d0 - 1.6), ptP(0, J)], 2, 1);
      K.poePassarela([ptP(vMin, J), ptP(vMax, J)], 2, 1);
    } else {
      // as outras, em dois arcos (um de cada lado da do chefe), fora do caminho do portão; nas grandes, alternando mais
      // perto e mais longe da praça
      const g0 = 0.62, cS = chefe ? 0.5 : 0.1, n1 = Math.ceil(T.mor / 2), duas = T.mor >= 8;
      // (o ângulo da do chefe, de aG até aG + 2π: os arcos ficam dos dois lados dela)
      const aC = chefe ? aG + ((Math.atan2(chefe.y + chefe.h / 2 - cy, chefe.x + chefe.w / 2 - cx) - aG) % TAU + TAU) % TAU : aG + Math.PI;
      for (const [a0, a1, n] of [[aG + g0, aC - cS, n1], [aC + cS, aG + TAU - g0, T.mor - n1]]) for (let k = 0; k < n; k++) poeCasa(a0 + (a1 - a0) * (k + 0.5) / n + r(-0.05, 0.05), false, duas ? (k % 2 ? 0.85 : 0.2) : 0.5);
      for (let t = 0; casas.length < T.mor + 1 && t < 40; t++) poeCasa(r(aG + g0, aG + TAU - g0), false, r(0.1, 0.9));
      // uma trilha de cada porta até a praça (só quando não passa por outra moradia nem pelo cercado)
      for (const k of casas) {
        const pt = k.porta, [dx, dy] = DIR[pt.lado], a = [(pt.x1 + pt.x2) / 2 + dx * 0.7, (pt.y1 + pt.y2) / 2 + dy * 0.7];
        const vx = cx - a[0], vy = cy - a[1], d = Math.hypot(vx, vy);
        if (d < Rp + 1) continue;
        const b = [cx - vx / d * Rp * 0.8, cy - vy / d * Rp * 0.8];
        // (reta, com uma curvinha; se passa por outra moradia, pelo cercado ou pelo círculo, contorna por um lado)
        const livre = q => { for (let t = 0.06; t < 1; t += 0.04) { const [x, y] = MO.lerp(q[Math.floor(t * (q.length - 1))], q[Math.min(q.length - 1, Math.floor(t * (q.length - 1)) + 1)], (t * (q.length - 1)) % 1); if (K.at(Math.floor(x), Math.floor(y)) === 3 || noCercado(x, y) || (P.sagrado && Math.hypot(x - P.sagrado.x, y - P.sagrado.y) < P.sagrado.r + 0.4)) return false; } return true; };
        const nx = -(b[1] - a[1]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1), ny = (b[0] - a[0]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1), j0 = r(-0.4, 0.4);
        let pts = null;
        for (const off of [j0, 1.7, -1.7, 2.8, -2.8]) { const q = MO.curva([a, [(a[0] + b[0]) / 2 + nx * off, (a[1] + b[1]) / 2 + ny * off], b]); if (livre(q)) { pts = q; break; } }
        if (!pts) continue;
        P.caminhos.push({ pts, hw: 0.36, tipo: 'trilha' });
        K.marcaLinha(pts, 0.45, 1);
      }
    }
    // o totem: entre a fogueira e a moradia do chefe (nas palafitas, do lado da fogueira que dá para o píer)
    {
      const ch = casas.find(k => k.chefe);
      let tx, ty;
      if (palafita) { tx = cx - ux * Rp * 0.5 - uy * 1.8; ty = cy - uy * Rp * 0.5 + ux * 1.8; }
      else if (ch) { tx = cx + (ch.x + ch.w / 2 - cx) * 0.4; ty = cy + (ch.y + ch.h / 2 - cy) * 0.4; }
      else { tx = cx - ux * 2.2; ty = cy - uy * 2.2; }
      if (!K.objeto('totem', Math.floor(tx), Math.floor(ty), 0, v => v === 5 || v === 0 || v === 1)) K.objetoPerto('totem', tx, ty, 1.6, v => v === 5 || v === 0);
    }

    /* ---- o resto (o sorteio dos detalhes) ---- */
    if (com.sagrados) {
      // os totens menores: dos dois lados do portão, por fora, e junto do círculo de pedras
      if (portao) for (const q of [portao.a, portao.b]) { const dx = q[0] - cx, dy = q[1] - cy, d = Math.hypot(dx, dy) || 1; K.objeto('totem', Math.floor(q[0] + dx / d * 1.2), Math.floor(q[1] + dy / d * 1.2), 0, v => v === 0 || v === 6 || v === 4); }
      if (P.sagrado) for (let t = 0; t < 30; t++) { const a = rV() * TAU, d = P.sagrado.r + 0.6 + rV() * 0.5; if (K.objeto('totem', Math.floor(P.sagrado.x + Math.cos(a) * d), Math.floor(P.sagrado.y + Math.sin(a) * d), 0, v => v === 0 || v === 4 || v === 5)) break; }
    }
    if (com.vida) {
      // os bichos do cercado (pintados no fundo)
      if (cerc) {
        const tipos = terreno === 'neve' ? ['rena'] : terreno === 'deserto' ? ['cabra', 'cabra', 'boi'] : terreno === 'selva' || terreno === 'pantano' ? ['porco', 'porco', 'cabra'] : ['cabra', 'ovelha', 'porco', 'boi', 'ovelha'];
        const bichos = [];
        for (let i = 0, n = Math.round(cerc.w * cerc.h / 3.4); i < n; i++) bichos.push({ x: cerc.x + 0.7 + rV() * (cerc.w - 1.4), y: cerc.y + 0.7 + rV() * (cerc.h - 1.4), ang: rV() * TAU, t: tipos[Math.floor(rV() * tipos.length) % tipos.length] });
        K.pinta(2, 'cercado', Object.assign({ bichos }, cerc));
      }
      // os secadores (de peles e de carne), o forno de barro, o tear e a lenha: entre as moradias
      const lugarV = rr => { for (let t = 0; t < 200; t++) { const x = rv(2, W - 2), y = rv(2, H - 2); if (dentroPal(x, y, 1.2) && K.livreCirc(x, y, rr, v => v === 0)) return [x, y]; } return null; };
      for (let i = 0; i < (tamanho === 'grande' ? 4 : 3); i++) { const l = lugarV(1); if (l) { K.pinta(2, 'secador', { x: l[0], y: l[1], ang: Math.floor(rV() * 4) * Math.PI / 2, tipo: i % 2 ? 'carne' : 'pele' }); K.marcaCirc(l[0], l[1], 0.95, 4, true); } }
      { const l = lugarV(0.9); if (l) { K.pinta(2, 'fornoBarro', { x: l[0], y: l[1], ang: Math.atan2(cy - l[1], cx - l[0]) }); K.marcaCirc(l[0], l[1], 0.75, 3, true); } }
      { const l = lugarV(1); if (l) { K.pinta(2, 'tear', { x: l[0], y: l[1], ang: Math.floor(rV() * 4) * Math.PI / 2 }); K.marcaCirc(l[0], l[1], 0.85, 4, true); } }
      for (let i = 0; i < 2; i++) { const l = lugarV(1.1); if (l) { K.pinta(2, 'lenha', { x: l[0] - 1, y: l[1] - 0.4 }); K.marcaCirc(l[0], l[1], 1, 4, true); } }
      // as canoas: junto dos deques das palafitas (do lado de fora) ou na beira do riacho (e uma na água)
      if (palafita) {
        let feitas = 0;
        for (const k of casas) {
          if (feitas >= 3 || rV() < 0.4) continue;
          const d = k.deque, [dx, dy] = DIR[OPOSTO[k.porta.lado]], x = d.x + d.w / 2 + dx * (d.w / 2 + 0.75), y = d.y + d.h / 2 + dy * (d.h / 2 + 0.75);
          if (!K.livreCirc(x, y, 0.5, v => v === 2)) continue;
          K.pinta(2, 'canoa', { x, y, ang: dx ? Math.PI / 2 : 0, L: 2.8, naAgua: true }); feitas++;
        }
      } else if (P.riacho) {
        const rio = P.riacho.pts;
        for (let i = 0, feitas = 0; i < 40 && feitas < 2; i++) {
          const p = Paisagem.aoLongo(rio, 0.15 + rV() * 0.7), lado = rV() < 0.5 ? -1 : 1, nx = Math.cos(p.ang + Math.PI / 2), ny = Math.sin(p.ang + Math.PI / 2), x = p.x + nx * lado * 2.2, y = p.y + ny * lado * 2.2;
          if (!K.dentro(x, y, 1) || !K.livreCirc(x, y, 0.8, v => v === 0 || v === 4)) continue;
          K.pinta(2, 'canoa', { x, y, ang: p.ang + rv(-0.25, 0.25), L: 2.8 }); K.marcaCirc(x, y, 0.7, 4, true); feitas++;
        }
        if (rV() < 0.7) { const p = Paisagem.aoLongo(rio, 0.3 + rV() * 0.4); K.pinta(2, 'canoa', { x: p.x, y: p.y, ang: p.ang, L: 2.8, naAgua: true }); }
      }
    }
    // as tochas do portão, por dentro
    if (portao) for (const q of [portao.a, portao.b]) {
      // (logo para dentro, entre a ponta da paliçada e a trilha: a torre de vigia fica do outro lado)
      const dx = cx - q[0], dy = cy - q[1], d = Math.hypot(dx, dy) || 1, lx = portao.x - q[0], ly = portao.y - q[1], dl = Math.hypot(lx, ly) || 1;
      for (const [fi, fl] of [[0.9, 0.4], [0.9, 0.9], [1.4, 0.6], [1.4, 1.1], [0.6, 1.2]]) if (K.objeto('tocha', Math.floor(q[0] + dx / d * fi + lx / dl * fl), Math.floor(q[1] + dy / d * fi + ly / dl * fl), 0, v => v === 0 || v === 1 || v === 5)) break;
    }
    // dentro da aldeia não nasce árvore; em volta da paliçada, o mato foi aberto (poucas árvores)
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (K.at(i, j) === 0 && dentroElipse(i + 0.5, j + 0.5, cx, cy, rx * (com.palicada ? 1 : 0.92), ry * (com.palicada ? 1 : 0.92))) K.pos(i, j, 5);
    P.dens = (x, y) => (dentroElipse(x, y, cx, cy, rx + 2.6, ry + 2.6) ? 0.12 : 1);
    MO.vegetacao(K, rV);
    MO.enfeites(K, rV);
    P.marcas = {};
    K.foco(cx, cy);
    delete P.dens; delete P.esp;
    return Object.assign(P, { v: 1, lugar: 'tribo', seed, sT, tamanho, moradias, terreno, com, centro: [cx, cy], raios: [rx, ry], ladoPortao: ladoG, travaTracado: !!trava, comMarcas: false, sitPedida: null, occ: Array.from(K.occ) });
  }

  /* ================= os desenhos (pintores registrados no motor) ================= */
  const sombra = (g, f, dx, dy, a) => { g.save(); g.translate(dx, dy); g.globalAlpha = a == null ? 0.32 : a; g.fillStyle = '#000'; f(); g.fill(); g.restore(); };
  // a moradia vista de cima: a tenda, a iurte, o iglu, a cabana e a palafita (k: x, y, w, h em quadrados; k.porta.lado; k.chefe)
  function moradia(g, k, c, rnd, est) {
    const C = cor(est), x0 = k.x * c, y0 = k.y * c, w = k.w * c, h = k.h * c, mx = x0 + w / 2, my = y0 + h / 2, R = Math.min(w, h) / 2 * 0.97;
    const lado = k.porta ? k.porta.lado : 's', da = ANG[lado], ddx = Math.cos(da), ddy = Math.sin(da);
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    const circ = rr => { g.beginPath(); g.arc(mx, my, rr, 0, TAU); };
    if (k.desenho === 'tenda') {
      sombra(g, () => circ(R), c * 0.16, c * 0.2);
      const gr = g.createRadialGradient(mx - R * 0.3, my - R * 0.35, R * 0.1, mx, my, R); gr.addColorStop(0, C.couro[2]); gr.addColorStop(0.6, C.couro[0]); gr.addColorStop(1, C.couro[1]);
      circ(R); g.fillStyle = gr; g.fill();
      // as costuras do couro, do topo até a beira
      g.strokeStyle = 'rgba(60,40,20,0.45)'; g.lineWidth = Math.max(1, c * 0.03);
      const nc = k.chefe ? 14 : 10;
      for (let i = 0; i < nc; i++) { const a = i / nc * TAU + 0.2; g.beginPath(); g.moveTo(mx + Math.cos(a) * R * 0.16, my + Math.sin(a) * R * 0.16); g.lineTo(mx + Math.cos(a) * R, my + Math.sin(a) * R); g.stroke(); }
      // a faixa pintada (com os triângulos) e, na do chefe, o sol
      g.strokeStyle = C.faixa; g.lineWidth = R * 0.14; circ(R * 0.7); g.stroke();
      g.fillStyle = C.faixa2;
      const nt = k.chefe ? 18 : 12;
      for (let i = 0; i < nt; i++) { const a = i / nt * TAU, a2 = a + TAU / nt / 2; g.beginPath(); g.moveTo(mx + Math.cos(a) * R * 0.63, my + Math.sin(a) * R * 0.63); g.lineTo(mx + Math.cos(a2) * R * 0.77, my + Math.sin(a2) * R * 0.77); g.lineTo(mx + Math.cos(a + TAU / nt) * R * 0.63, my + Math.sin(a + TAU / nt) * R * 0.63); g.closePath(); g.fill(); }
      if (k.chefe) { g.fillStyle = '#e8b04a'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(mx + Math.cos(a) * R * 0.3, my + Math.sin(a) * R * 0.3); g.lineTo(mx + Math.cos(a + 0.2) * R * 0.44, my + Math.sin(a + 0.2) * R * 0.44); g.lineTo(mx + Math.cos(a - 0.2) * R * 0.44, my + Math.sin(a - 0.2) * R * 0.44); g.closePath(); g.fill(); } }
      // a aba da porta, aberta (o escuro de dentro)
      g.fillStyle = 'rgba(30,18,10,0.85)'; g.beginPath(); g.moveTo(mx + ddx * R * 0.35, my + ddy * R * 0.35); g.lineTo(mx + ddx * R - ddy * R * 0.22, my + ddy * R + ddx * R * 0.22); g.lineTo(mx + ddx * R + ddy * R * 0.22, my + ddy * R - ddx * R * 0.22); g.closePath(); g.fill();
      // o buraco da fumaça e as varas cruzadas saindo dele
      g.fillStyle = '#2a1c10'; circ(R * 0.13); g.fill();
      g.strokeStyle = MAD.esc; g.lineWidth = Math.max(1.2, c * 0.07);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.5; g.beginPath(); g.moveTo(mx - Math.cos(a) * R * 0.08, my - Math.sin(a) * R * 0.08); g.lineTo(mx + Math.cos(a) * R * 0.32, my + Math.sin(a) * R * 0.32); g.stroke(); }
      circ(R); g.strokeStyle = 'rgba(30,20,10,0.8)'; g.lineWidth = Math.max(1.5, c * 0.05); g.stroke();
      if (k.chefe) chifres(g, mx - ddx * R * 0.98, my - ddy * R * 0.98, da + Math.PI, c);
    } else if (k.desenho === 'iurte') {
      sombra(g, () => circ(R), c * 0.14, c * 0.18);
      const gr = g.createRadialGradient(mx - R * 0.3, my - R * 0.35, R * 0.1, mx, my, R); gr.addColorStop(0, '#fbf7ee'); gr.addColorStop(0.55, C.feltro[0]); gr.addColorStop(1, C.feltro[1]);
      circ(R); g.fillStyle = gr; g.fill();
      // as cordas que prendem o feltro (dois anéis e as cruzadas)
      g.strokeStyle = 'rgba(90,70,40,0.55)'; g.lineWidth = Math.max(1, c * 0.035);
      for (const rr of [0.82, 0.58]) { circ(R * rr); g.stroke(); }
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.beginPath(); g.moveTo(mx + Math.cos(a) * R * 0.58, my + Math.sin(a) * R * 0.58); g.lineTo(mx + Math.cos(a + TAU / 32) * R * 0.82, my + Math.sin(a + TAU / 32) * R * 0.82); g.stroke(); }
      // a faixa colorida e, na do chefe, os desenhos
      g.strokeStyle = C.faixa; g.lineWidth = R * 0.07; circ(R * 0.92); g.stroke();
      if (k.chefe) { g.strokeStyle = C.faixa2; g.lineWidth = R * 0.03; circ(R * 0.92); g.stroke(); g.fillStyle = C.faixa2; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.arc(mx + Math.cos(a) * R * 0.7, my + Math.sin(a) * R * 0.7, R * 0.04, 0, TAU); g.fill(); } }
      // a coroa de madeira no topo, com os raios
      g.fillStyle = '#d06a2a'; circ(R * 0.22); g.fill();
      g.fillStyle = '#4a2c16'; circ(R * 0.16); g.fill();
      g.strokeStyle = '#e8a050'; g.lineWidth = Math.max(1, c * 0.04);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + Math.cos(a) * R * 0.16, my + Math.sin(a) * R * 0.16); g.stroke(); }
      // a porta de madeira pintada
      g.save(); g.translate(mx + ddx * R * 0.97, my + ddy * R * 0.97); g.rotate(da);
      g.fillStyle = '#b8401e'; g.fillRect(-c * 0.12, -c * 0.3, c * 0.24, c * 0.6); g.strokeStyle = '#e0b040'; g.lineWidth = Math.max(1, c * 0.03); g.strokeRect(-c * 0.12, -c * 0.3, c * 0.24, c * 0.6);
      g.restore();
      circ(R); g.strokeStyle = 'rgba(60,50,30,0.75)'; g.lineWidth = Math.max(1.5, c * 0.05); g.stroke();
      if (k.chefe) chifres(g, mx - ddx * R * 0.98, my - ddy * R * 0.98, da + Math.PI, c);
    } else if (k.desenho === 'iglu') {
      // o túnel da entrada, para fora da porta
      g.save(); g.translate(mx + ddx * R * 0.9, my + ddy * R * 0.9); g.rotate(da);
      const tl = c * 0.95, tw = c * 0.62;
      g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(c * 0.1, -tw / 2 + c * 0.12, tl, tw); g.globalAlpha = 1;
      const gt = g.createLinearGradient(0, -tw / 2, 0, tw / 2); gt.addColorStop(0, '#ffffff'); gt.addColorStop(1, '#c9d6df');
      g.fillStyle = gt; g.beginPath(); g.moveTo(0, -tw / 2); g.lineTo(tl - tw * 0.2, -tw / 2); g.quadraticCurveTo(tl, -tw / 2, tl, 0); g.quadraticCurveTo(tl, tw / 2, tl - tw * 0.2, tw / 2); g.lineTo(0, tw / 2); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(120,150,170,0.6)'; g.lineWidth = Math.max(1, c * 0.025);
      for (let t = tl * 0.33; t < tl; t += tl * 0.33) { g.beginPath(); g.moveTo(t, -tw / 2); g.lineTo(t, tw / 2); g.stroke(); }
      g.fillStyle = '#2c3a46'; g.beginPath(); g.ellipse(tl - c * 0.02, 0, c * 0.08, tw * 0.3, 0, 0, TAU); g.fill();
      g.restore();
      sombra(g, () => circ(R), c * 0.12, c * 0.16, 0.28);
      const gr = g.createRadialGradient(mx - R * 0.35, my - R * 0.4, R * 0.05, mx, my, R); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#e6eef3'); gr.addColorStop(1, '#bccbd6');
      circ(R); g.fillStyle = gr; g.fill();
      // os blocos de neve: os anéis e as juntas desencontradas
      g.strokeStyle = 'rgba(110,140,160,0.5)'; g.lineWidth = Math.max(1, c * 0.025);
      const na = k.chefe ? 5 : 4;
      for (let i = 1; i <= na; i++) {
        const rr = R * i / (na + 0.6), rr0 = R * (i - 1) / (na + 0.6); circ(rr); g.stroke();
        const nb = Math.max(5, Math.round(rr / c * 5)), d0 = (i % 2) * 0.5;
        for (let b = 0; b < nb; b++) { const a = (b + d0) / nb * TAU; g.beginPath(); g.moveTo(mx + Math.cos(a) * rr0, my + Math.sin(a) * rr0); g.lineTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr); g.stroke(); }
      }
      g.fillStyle = '#7f98aa'; circ(R * 0.07); g.fill();
      circ(R); g.strokeStyle = 'rgba(90,120,140,0.7)'; g.lineWidth = Math.max(1.2, c * 0.04); g.stroke();
      // na do chefe, a pele branca estendida em cima
      if (k.chefe) { g.fillStyle = '#efe9dc'; g.beginPath(); g.ellipse(mx - ddx * R * 0.55, my - ddy * R * 0.55, c * 0.32, c * 0.22, da, 0, TAU); g.fill(); g.strokeStyle = 'rgba(90,80,60,0.6)'; g.lineWidth = Math.max(1, c * 0.025); g.stroke(); }
    } else {
      // a cabana (o telhado de duas águas, de palha) e a palafita (o telhado de palha de quatro águas)
      const deitada = w >= h, pal = C.palha, quatro = k.desenho === 'palafita';
      sombra(g, () => g.rect(x0, y0, w, h), c * 0.14, c * 0.18);
      const ridge = deitada ? [[x0 + (quatro ? h * 0.45 : 0), my], [x0 + w - (quatro ? h * 0.45 : 0), my]] : [[mx, y0 + (quatro ? w * 0.45 : 0)], [mx, y0 + h - (quatro ? w * 0.45 : 0)]];
      const aguas = deitada
        ? [[[x0, y0], [x0 + w, y0], ridge[1], ridge[0]], [[x0, y0 + h], [x0 + w, y0 + h], ridge[1], ridge[0]], [[x0, y0], ridge[0], [x0, y0 + h]], [[x0 + w, y0], ridge[1], [x0 + w, y0 + h]]]
        : [[[x0, y0], [x0, y0 + h], ridge[1], ridge[0]], [[x0 + w, y0], [x0 + w, y0 + h], ridge[1], ridge[0]], [[x0, y0], ridge[0], [x0 + w, y0]], [[x0, y0 + h], ridge[1], [x0 + w, y0 + h]]];
      aguas.forEach((poly, i) => {
        g.beginPath(); poly.forEach(([px, py], n) => (n ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath();
        g.fillStyle = [pal[2], pal[1], pal[0], pal[1]][i]; g.fill();
        g.save(); g.clip();
        // os fios de palha (do beiral para a cumeeira)
        g.strokeStyle = 'rgba(90,64,24,0.38)'; g.lineWidth = Math.max(1, c * 0.025);
        const [ax, ay] = poly[0], [bx, by] = poly[1];
        for (let t = 0; t < 1; t += 0.035) { const px = ax + (bx - ax) * t, py = ay + (by - ay) * t, qx = px + (mx - px) * 0.55, qy = py + (my - py) * 0.55; g.beginPath(); g.moveTo(px, py); g.lineTo(qx + (rnd() - 0.5) * c * 0.1, qy + (rnd() - 0.5) * c * 0.1); g.stroke(); }
        g.restore();
      });
      g.strokeStyle = 'rgba(70,48,18,0.85)'; g.lineWidth = Math.max(2, c * 0.08); g.beginPath(); g.moveTo(ridge[0][0], ridge[0][1]); g.lineTo(ridge[1][0], ridge[1][1]); g.stroke();
      if (quatro) { g.lineWidth = Math.max(1, c * 0.04); for (const [px, py] of [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h]]) { const rg = Math.hypot(px - ridge[0][0], py - ridge[0][1]) < Math.hypot(px - ridge[1][0], py - ridge[1][1]) ? ridge[0] : ridge[1]; g.beginPath(); g.moveTo(px, py); g.lineTo(rg[0], rg[1]); g.stroke(); } }
      g.strokeStyle = 'rgba(40,26,10,0.85)'; g.lineWidth = Math.max(1.5, c * 0.05); g.strokeRect(x0, y0, w, h);
      // as pontas dos troncos nos cantos (a cabana) e o buraco da fumaça
      if (!quatro) { g.fillStyle = MAD.cla; g.strokeStyle = MAD.esc; g.lineWidth = Math.max(1, c * 0.03); for (const [px, py] of [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h]]) { g.beginPath(); g.arc(px, py, c * 0.12, 0, TAU); g.fill(); g.stroke(); } }
      g.fillStyle = '#2a1c10'; g.beginPath(); g.ellipse((ridge[0][0] + ridge[1][0]) / 2, (ridge[0][1] + ridge[1][1]) / 2, c * 0.16, c * 0.1, deitada ? 0 : Math.PI / 2, 0, TAU); g.fill();
      if (k.chefe) { const e = ridge[0], f = ridge[1]; chifres(g, e[0], e[1], Math.atan2(e[1] - f[1], e[0] - f[0]), c); chifres(g, f[0], f[1], Math.atan2(f[1] - e[1], f[0] - e[0]), c); }
    }
    g.restore();
  }
  // o crânio com os chifres que enfeita a moradia do chefe
  function chifres(g, x, y, a, c) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.strokeStyle = '#efe6d2'; g.lineWidth = Math.max(1.5, c * 0.07); g.lineCap = 'round';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(c * 0.3, s * c * 0.12, c * 0.42, s * c * 0.38); g.stroke(); }
    g.fillStyle = '#f4ecdc'; g.beginPath(); g.ellipse(c * 0.05, 0, c * 0.16, c * 0.12, 0, 0, TAU); g.fill();
    g.fillStyle = '#2a2018'; for (const s of [-1, 1]) { g.beginPath(); g.arc(c * 0.09, s * c * 0.05, c * 0.03, 0, TAU); g.fill(); }
    g.restore();
  }
  // os troncos de sentar em volta da fogueira da praça
  function assentos(g, o, c, rnd) {
    for (const a of o.angs || []) {
      g.save(); g.translate((o.x + Math.cos(a) * o.r) * c, (o.y + Math.sin(a) * o.r) * c); g.rotate(a + Math.PI / 2);
      const L = c * 1.15, Wd = c * 0.34;
      g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(-L / 2 + c * 0.08, -Wd / 2 + c * 0.1, L, Wd); g.globalAlpha = 1;
      const gr = g.createLinearGradient(0, -Wd / 2, 0, Wd / 2); gr.addColorStop(0, MAD.luz); gr.addColorStop(0.5, MAD.med); gr.addColorStop(1, MAD.esc);
      g.fillStyle = gr; g.fillRect(-L / 2, -Wd / 2, L, Wd);
      g.strokeStyle = 'rgba(30,20,10,0.45)'; g.lineWidth = Math.max(1, c * 0.025); g.beginPath(); g.moveTo(-L / 2, (rnd() - 0.5) * Wd * 0.3); g.lineTo(L / 2, (rnd() - 0.5) * Wd * 0.3); g.stroke();
      g.fillStyle = '#c9a26b'; for (const px of [-L / 2, L / 2]) { g.beginPath(); g.ellipse(px, 0, c * 0.07, Wd / 2, 0, 0, TAU); g.fill(); }
      g.restore();
    }
  }
  // a paliçada: as estacas (troncos apontados), uma colada na outra, ao longo de cada trecho, e os dois esteios grossos
  // do portão
  function palicada(g, o, c, rnd) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    for (const t of o.trechos || []) {
      g.save(); g.translate(c * 0.18, c * 0.24); g.globalAlpha = 0.38; g.strokeStyle = '#000'; g.lineWidth = c * 0.62; Paisagem.poli(g, t, c); g.stroke(); g.restore();
      g.strokeStyle = MAD.borda; g.lineWidth = c * 0.6; Paisagem.poli(g, t, c); g.stroke();
      const L = Paisagem.compr(t), n = Math.max(2, Math.round(L / 0.36));
      for (let i = 0; i <= n; i++) {
        const p = Paisagem.aoLongo(t, i / n), rr = c * (0.22 + rnd() * 0.05), x = p.x * c, y = p.y * c;
        const gr = g.createRadialGradient(x - rr * 0.35, y - rr * 0.35, rr * 0.1, x, y, rr); gr.addColorStop(0, MAD.luz); gr.addColorStop(0.55, MAD.cla); gr.addColorStop(1, MAD.med);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(46,31,16,0.75)'; g.lineWidth = Math.max(0.8, c * 0.025); g.stroke();
        // a ponta lavrada (o centro escuro) e um anel do lenho
        g.fillStyle = 'rgba(46,31,16,0.7)'; g.beginPath(); g.arc(x + rr * 0.08, y + rr * 0.08, rr * 0.24, 0, TAU); g.fill();
      }
    }
    if (o.portao) for (const q of [o.portao.a, o.portao.b]) {
      const x = q[0] * c, y = q[1] * c, rr = c * 0.36;
      g.globalAlpha = 0.38; g.fillStyle = '#000'; g.beginPath(); g.arc(x + c * 0.18, y + c * 0.24, rr, 0, TAU); g.fill(); g.globalAlpha = 1;
      const gr = g.createRadialGradient(x - rr * 0.3, y - rr * 0.3, rr * 0.1, x, y, rr); gr.addColorStop(0, MAD.luz); gr.addColorStop(0.6, MAD.med); gr.addColorStop(1, MAD.esc);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); g.strokeStyle = MAD.borda; g.lineWidth = Math.max(1, c * 0.05); g.stroke();
      g.strokeStyle = 'rgba(40,24,10,0.6)'; g.lineWidth = Math.max(1, c * 0.025); for (const f of [0.35, 0.65]) { g.beginPath(); g.arc(x, y, rr * f, 0, TAU); g.stroke(); }
    }
    g.restore();
  }
  // a ponte de troncos (lado a lado, ao comprido, com as amarras de corda nas pontas)
  function ponteTroncos(g, o, c, rnd) {
    const L = o.comp * c, Wd = o.larg * c, n = Math.max(3, Math.round(o.larg / 0.44)), lw = Wd / n;
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    g.globalAlpha = 0.35; g.fillStyle = '#000'; g.fillRect(-L / 2 + c * 0.12, -Wd / 2 + c * 0.2, L, Wd); g.globalAlpha = 1;
    for (let i = 0; i < n; i++) {
      const y = -Wd / 2 + i * lw, d = (rnd() - 0.5) * c * 0.16, gr = g.createLinearGradient(0, y, 0, y + lw);
      gr.addColorStop(0, MAD.luz); gr.addColorStop(0.5, MAD.med); gr.addColorStop(1, MAD.esc);
      g.fillStyle = gr; g.beginPath(); g.moveTo(-L / 2 + d, y + lw * 0.06); g.lineTo(L / 2 + d, y + lw * 0.06); g.lineTo(L / 2 + d, y + lw * 0.94); g.lineTo(-L / 2 + d, y + lw * 0.94); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(40,24,10,0.5)'; g.lineWidth = Math.max(0.8, c * 0.02); g.beginPath(); g.moveTo(-L / 2 + d, y + lw * (0.4 + rnd() * 0.2)); g.lineTo(L / 2 + d, y + lw * (0.4 + rnd() * 0.2)); g.stroke();
      g.fillStyle = '#c9a26b'; for (const px of [-L / 2 + d, L / 2 + d]) { g.beginPath(); g.ellipse(px, y + lw / 2, c * 0.06, lw * 0.44, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(90,60,30,0.6)'; g.stroke(); }
    }
    g.strokeStyle = '#d8c08a'; g.lineWidth = Math.max(1.2, c * 0.05);
    for (const px of [-L * 0.36, L * 0.36]) { g.beginPath(); g.moveTo(px, -Wd / 2); g.lineTo(px, Wd / 2); g.stroke(); }
    g.restore();
  }
  // a torre de vigia (2 × 2, a 4 m): o piso de tábuas, os quatro esteios, o parapeito e a escada para o lado da aldeia
  function torreVigia(g, o, c) {
    const x = o.x * c, y = o.y * c, s = o.s * c;
    g.save(); g.lineCap = 'round';
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(x + c * 0.45, y + c * 0.55, s, s); g.globalAlpha = 1;
    // a escada, descendo para dentro da aldeia
    g.save(); g.translate(x + s / 2, y + s / 2); g.rotate(o.esc || 0);
    g.strokeStyle = MAD.med; g.lineWidth = Math.max(1.5, c * 0.06);
    for (const sy of [-0.22, 0.22]) { g.beginPath(); g.moveTo(s * 0.45, sy * c); g.lineTo(s * 0.45 + c * 1.1, sy * c); g.stroke(); }
    g.lineWidth = Math.max(1, c * 0.045); for (let t = 0.15; t < 1.1; t += 0.25) { g.beginPath(); g.moveTo(s * 0.45 + c * t, -0.22 * c); g.lineTo(s * 0.45 + c * t, 0.22 * c); g.stroke(); }
    g.restore();
    g.fillStyle = MAD.borda; g.fillRect(x, y, s, s);
    const tb = s / 5;
    for (let i = 0; i < 5; i++) { g.fillStyle = [MAD.cla, MAD.med, MAD.luz, MAD.med, MAD.cla][i]; g.fillRect(x + 1, y + i * tb + 1, s - 2, tb - 1.5); }
    g.strokeStyle = MAD.esc; g.lineWidth = Math.max(2, c * 0.12); g.strokeRect(x + c * 0.06, y + c * 0.06, s - c * 0.12, s - c * 0.12);
    g.fillStyle = MAD.borda; for (const [px, py] of [[x, y], [x + s, y], [x, y + s], [x + s, y + s]]) { g.beginPath(); g.arc(px, py, c * 0.16, 0, TAU); g.fill(); }
    g.restore();
  }
  // o fosso com estacas: a valeta (a terra revirada nas beiras, o fundo escuro e úmido) e as estacas na beira de fora,
  // apontadas para fora (o.fora: o lado de fora, ±1)
  function fossoEstacas(g, o, c, rnd) {
    const t = o.pts, L = o.larg || 1, s = o.fora || 1;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.globalAlpha = 0.45; g.strokeStyle = '#8a7350'; g.lineWidth = L * c * 1.5; Paisagem.poli(g, t, c); g.stroke();
    g.globalAlpha = 1; g.strokeStyle = '#5e4a32'; g.lineWidth = L * c; Paisagem.poli(g, t, c); g.stroke();
    g.strokeStyle = '#3e3022'; g.lineWidth = L * c * 0.5; Paisagem.poli(g, t, c); g.stroke();
    g.globalAlpha = 0.35; g.strokeStyle = '#2a2016'; g.lineWidth = L * c * 0.18; Paisagem.poli(g, t, c); g.stroke(); g.globalAlpha = 1;
    // os torrões de terra nas beiras
    const Lt = Paisagem.compr(t);
    g.fillStyle = 'rgba(120,98,66,0.55)';
    for (let i = 0, n = Math.round(Lt * 1.2); i < n; i++) { const p = Paisagem.aoLongo(t, rnd()), lado = rnd() < 0.5 ? -1 : 1, nx = Math.cos(p.ang + Math.PI / 2) * lado, ny = Math.sin(p.ang + Math.PI / 2) * lado; g.beginPath(); g.ellipse((p.x + nx * L * 0.62) * c, (p.y + ny * L * 0.62) * c, c * 0.09, c * 0.06, rnd() * 3, 0, TAU); g.fill(); }
    // as estacas
    const n = Math.max(2, Math.round(Lt / 0.6));
    for (let i = 0; i <= n; i++) {
      const p = Paisagem.aoLongo(t, i / n), nx = Math.cos(p.ang + Math.PI / 2) * s, ny = Math.sin(p.ang + Math.PI / 2) * s;
      const bx = (p.x + nx * L * 0.3) * c, by = (p.y + ny * L * 0.3) * c, tx = bx + nx * c * 0.48, ty = by + ny * c * 0.48;
      g.strokeStyle = MAD.esc; g.lineWidth = Math.max(1.5, c * 0.09); g.beginPath(); g.moveTo(bx, by); g.lineTo(tx, ty); g.stroke();
      g.strokeStyle = MAD.cla; g.lineWidth = Math.max(1, c * 0.045); g.beginPath(); g.moveTo(bx, by); g.lineTo(tx, ty); g.stroke();
      g.fillStyle = '#e2c9a0'; g.beginPath(); g.arc(tx, ty, Math.max(1, c * 0.035), 0, TAU); g.fill();
    }
    g.restore();
  }
  // o mastro com crânios (na travessa) e as fitas vermelhas
  function mastroCranios(g, o, c) {
    const x = o.x * c, y = o.y * c;
    g.save(); g.lineCap = 'round';
    g.globalAlpha = 0.3; g.strokeStyle = '#000'; g.lineWidth = c * 0.16; g.beginPath(); g.moveTo(x, y); g.lineTo(x + c * 0.9, y + c * 0.9); g.stroke(); g.globalAlpha = 1;
    g.strokeStyle = MAD.esc; g.lineWidth = c * 0.1; g.beginPath(); g.moveTo(x - c * 0.5, y - c * 0.2); g.lineTo(x + c * 0.5, y + c * 0.2); g.stroke();
    g.fillStyle = MAD.med; g.beginPath(); g.arc(x, y, c * 0.17, 0, TAU); g.fill(); g.strokeStyle = MAD.esc; g.lineWidth = Math.max(1, c * 0.04); g.stroke();
    const cranio = (px, py, k) => { g.fillStyle = '#efe6d2'; g.beginPath(); g.ellipse(px, py, c * 0.15 * k, c * 0.13 * k, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(60,50,40,0.7)'; g.lineWidth = Math.max(0.8, c * 0.02); g.stroke(); g.fillStyle = '#2a2018'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(px + sx * c * 0.05 * k, py - c * 0.01, c * 0.035 * k, 0, TAU); g.fill(); } };
    cranio(x - c * 0.48, y - c * 0.12, 1); cranio(x + c * 0.48, y + c * 0.28, 1); cranio(x, y - c * 0.04, 1.15);
    g.strokeStyle = '#a8321e'; g.lineWidth = Math.max(1, c * 0.035);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * c * 0.3, y + s * c * 0.12); g.lineTo(x + s * c * 0.34, y + s * c * 0.12 + c * 0.32); g.stroke(); }
    g.restore();
  }
  // o chão da fogueira dos ancestrais: a cinza e as pedras em volta (a fogueira, grande, é um objeto por cima)
  function anelAncestral(g, o, c, rnd) {
    const x = o.x * c, y = o.y * c, R = o.r * c;
    g.save();
    const gr = g.createRadialGradient(x, y, R * 0.2, x, y, R * 1.3); gr.addColorStop(0, '#3a3430'); gr.addColorStop(0.7, '#6b625a'); gr.addColorStop(1, 'rgba(107,98,90,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, R * 1.3, 0, TAU); g.fill();
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, rr = c * (0.14 + rnd() * 0.06); g.fillStyle = ['#8a8680', '#a29e96', '#6e6a64'][i % 3]; g.beginPath(); g.ellipse(x + Math.cos(a) * R * 1.15, y + Math.sin(a) * R * 1.15, rr, rr * 0.8, a, 0, TAU); g.fill(); g.strokeStyle = 'rgba(30,28,26,0.6)'; g.lineWidth = Math.max(0.8, c * 0.02); g.stroke(); }
    g.restore();
  }
  // um bicho do cercado, visto de cima (a cabra, a ovelha, o porco, o boi, a rena)
  function bicho(g, b, c) {
    g.save(); g.translate(b.x * c, b.y * c); g.rotate(b.ang);
    const t = b.t, S = t === 'boi' || t === 'rena' ? 1.35 : 1, L = c * 0.3 * S, Wd = c * 0.16 * S;
    g.globalAlpha = 0.28; g.fillStyle = '#000'; g.beginPath(); g.ellipse(c * 0.05, c * 0.06, L, Wd, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
    const corpo = { cabra: ['#d8d2c4', '#a39a8a'], ovelha: ['#f2eee4', '#c9c2b2'], porco: ['#d89a8a', '#a86a5a'], boi: ['#8a5a36', '#5e3a1e'], rena: ['#8a6a4a', '#5e442a'] }[t] || ['#c9c2b4', '#8a8478'];
    if (t === 'ovelha') { g.fillStyle = corpo[0]; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc((i % 3 - 1) * L * 0.55, (i < 3 ? -1 : 1) * Wd * 0.45, Wd * 0.65, 0, TAU); g.fill(); } }
    else { const gr = g.createLinearGradient(0, -Wd, 0, Wd); gr.addColorStop(0, corpo[0]); gr.addColorStop(1, corpo[1]); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, L, Wd, 0, 0, TAU); g.fill(); }
    // a cabeça (para a frente) e os chifres, as galhadas ou o focinho
    const hx = L * 1.05;
    g.fillStyle = t === 'ovelha' ? '#2a2420' : corpo[1]; g.beginPath(); g.ellipse(hx, 0, Wd * 0.62, Wd * 0.48, 0, 0, TAU); g.fill();
    g.strokeStyle = t === 'rena' ? '#c9b48a' : '#e8dcc0'; g.lineWidth = Math.max(1, c * 0.03); g.lineCap = 'round';
    if (t === 'cabra' || t === 'boi') for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx, s * Wd * 0.3); g.quadraticCurveTo(hx - Wd * 0.2, s * Wd * 0.9, hx - Wd * 0.5, s * Wd * 1.0); g.stroke(); }
    if (t === 'rena') for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx, s * Wd * 0.3); g.lineTo(hx - Wd * 0.3, s * Wd * 1.2); g.moveTo(hx - Wd * 0.15, s * Wd * 0.75); g.lineTo(hx + Wd * 0.25, s * Wd * 1.1); g.moveTo(hx - Wd * 0.25, s * Wd * 1.05); g.lineTo(hx - Wd * 0.65, s * Wd * 1.35); g.stroke(); }
    if (t === 'porco') { g.fillStyle = '#e8b0a0'; g.beginPath(); g.ellipse(hx + Wd * 0.5, 0, Wd * 0.22, Wd * 0.2, 0, 0, TAU); g.fill(); }
    g.restore();
  }
  // o cercado: o chão pisado, o feno, o cocho, os bichos e a cerca (com a porteira aberta do lado da praça)
  function cercado(g, o, c, rnd) {
    const x = o.x * c, y = o.y * c, w = o.w * c, h = o.h * c;
    g.save();
    g.globalAlpha = 0.55; g.fillStyle = '#6b5a3c'; g.fillRect(x, y, w, h);
    for (let i = 0; i < o.w * o.h * 1.6; i++) { g.globalAlpha = 0.3; g.fillStyle = rnd() < 0.5 ? '#7a6a48' : '#5a4a30'; g.beginPath(); g.ellipse(x + rnd() * w, y + rnd() * h, c * 0.18, c * 0.1, rnd() * 3, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    g.fillStyle = '#d8bc6a'; g.beginPath(); g.ellipse(x + c * 0.8, y + c * 0.7, c * 0.5, c * 0.38, 0.3, 0, TAU); g.fill(); g.strokeStyle = 'rgba(120,90,30,0.6)'; g.lineWidth = Math.max(1, c * 0.02); g.stroke();
    g.fillStyle = MAD.med; g.fillRect(x + w - c * 1.5, y + h - c * 0.75, c * 1.1, c * 0.42); g.fillStyle = '#4f86b0'; g.fillRect(x + w - c * 1.42, y + h - c * 0.68, c * 0.94, c * 0.28);
    for (const b of o.bichos || []) bicho(g, b, c);
    const C4 = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]], lados = { n: [C4[0], C4[1]], l: [C4[1], C4[2]], s: [C4[3], C4[2]], o: [C4[0], C4[3]] };
    for (const [l, [a, b]] of Object.entries(lados)) {
      if (l !== o.lado) { Paisagem.cerca(g, [a, b], c, rnd); continue; }
      if (l === 'n' || l === 's') { Paisagem.cerca(g, [a, [o.meio, a[1]]], c, rnd); Paisagem.cerca(g, [[o.meio + 1, a[1]], b], c, rnd); }
      else { Paisagem.cerca(g, [a, [a[0], o.meio]], c, rnd); Paisagem.cerca(g, [[a[0], o.meio + 1], b], c, rnd); }
    }
    g.restore();
  }
  // o secador (de peles esticadas na moldura ou de tiras de carne na vara), entre dois esteios
  function secador(g, o, c, rnd) {
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0); g.lineCap = 'round';
    g.globalAlpha = 0.28; g.fillStyle = '#000'; g.fillRect(-c * 0.65, -c * 0.2, c * 1.5, c * 0.64); g.globalAlpha = 1;
    if (o.tipo === 'pele') {
      g.strokeStyle = MAD.esc; g.lineWidth = Math.max(1.5, c * 0.06); g.strokeRect(-c * 0.7, -c * 0.42, c * 1.4, c * 0.84);
      g.fillStyle = '#9a6c44'; g.beginPath(); g.moveTo(-c * 0.55, -c * 0.3); g.lineTo(c * 0.55, -c * 0.32); g.lineTo(c * 0.5, c * 0.3); g.lineTo(-c * 0.52, c * 0.32); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(230,210,170,0.7)'; g.lineWidth = Math.max(0.8, c * 0.02);
      for (let i = 0; i < 6; i++) { const t = -0.55 + i * 0.22; g.beginPath(); g.moveTo(t * c, -c * 0.42); g.lineTo(t * c + c * 0.02, -c * 0.31); g.stroke(); g.beginPath(); g.moveTo(t * c, c * 0.42); g.lineTo(t * c + c * 0.02, c * 0.31); g.stroke(); }
    } else {
      g.strokeStyle = MAD.esc; g.lineWidth = Math.max(1.5, c * 0.07); g.beginPath(); g.moveTo(-c * 0.75, 0); g.lineTo(c * 0.75, 0); g.stroke();
      for (let i = 0; i < 7; i++) { const t = -0.6 + i * 0.2; g.fillStyle = i % 2 ? '#8a2e22' : '#a8402e'; g.fillRect(t * c - c * 0.05, -c * 0.05, c * 0.1, c * (0.3 + rnd() * 0.12)); g.fillStyle = 'rgba(240,220,200,0.5)'; g.fillRect(t * c - c * 0.02, c * 0.05, c * 0.03, c * 0.15); }
    }
    g.fillStyle = MAD.med; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * c * 0.75, 0, c * 0.1, 0, TAU); g.fill(); }
    g.restore();
  }
  // o forno de barro: a cúpula, as rachaduras e a boca (com as brasas) virada para a praça
  function fornoBarro(g, o, c, rnd) {
    const x = o.x * c, y = o.y * c, R = c * 0.5, a = o.ang || 0;
    g.save();
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.beginPath(); g.arc(x + c * 0.1, y + c * 0.12, R, 0, TAU); g.fill(); g.globalAlpha = 1;
    const gr = g.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R); gr.addColorStop(0, '#d8945a'); gr.addColorStop(0.6, '#b46a3a'); gr.addColorStop(1, '#7a3e1e');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(70,30,10,0.55)'; g.lineWidth = Math.max(1, c * 0.025);
    for (let i = 0; i < 4; i++) { const b = rnd() * TAU; g.beginPath(); g.moveTo(x + Math.cos(b) * R * 0.2, y + Math.sin(b) * R * 0.2); g.lineTo(x + Math.cos(b + 0.3) * R * 0.7, y + Math.sin(b + 0.3) * R * 0.7); g.stroke(); }
    g.fillStyle = '#2a140a'; g.beginPath(); g.ellipse(x + Math.cos(a) * R * 0.78, y + Math.sin(a) * R * 0.78, R * 0.32, R * 0.22, a + Math.PI / 2, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,140,60,0.5)'; g.beginPath(); g.ellipse(x + Math.cos(a) * R * 0.8, y + Math.sin(a) * R * 0.8, R * 0.16, R * 0.1, a + Math.PI / 2, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(60,24,8,0.8)'; g.lineWidth = Math.max(1.2, c * 0.04); g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
    g.restore();
  }
  // o tear: a moldura de madeira, os fios esticados e a faixa colorida já tecida
  function tear(g, o, c) {
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    const w = c * 1.3, h = c * 0.85;
    g.globalAlpha = 0.28; g.fillStyle = '#000'; g.fillRect(-w / 2 + c * 0.1, -h / 2 + c * 0.12, w, h); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(240,230,210,0.85)'; g.lineWidth = Math.max(0.8, c * 0.015);
    for (let i = 0; i <= 12; i++) { const t = -w / 2 + c * 0.1 + i * (w - c * 0.2) / 12; g.beginPath(); g.moveTo(t, -h / 2); g.lineTo(t, h / 2); g.stroke(); }
    ['#a8321e', '#e0b040', '#2f6a8a', '#e8dcc0', '#a8321e'].forEach((cr, i) => { g.fillStyle = cr; g.fillRect(-w / 2 + c * 0.1, h / 2 - c * 0.08 - (i + 1) * c * 0.08, w - c * 0.2, c * 0.08); });
    g.strokeStyle = MAD.esc; g.lineWidth = Math.max(2, c * 0.08); g.beginPath(); g.moveTo(-w / 2, -h / 2); g.lineTo(w / 2, -h / 2); g.moveTo(-w / 2, h / 2); g.lineTo(w / 2, h / 2); g.stroke();
    g.lineWidth = Math.max(1.5, c * 0.06); g.beginPath(); g.moveTo(-w / 2, -h / 2); g.lineTo(-w / 2, h / 2); g.moveTo(w / 2, -h / 2); g.lineTo(w / 2, h / 2); g.stroke();
    g.restore();
  }
  // a canoa escavada no tronco (com o remo deitado dentro)
  function canoa(g, o, c) {
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    const L = (o.L || 2.8) * c, Wd = L * 0.2;
    const casco = k => { g.beginPath(); g.moveTo(-L / 2 * k, 0); g.quadraticCurveTo(-L * 0.3 * k, -Wd / 2 * k, 0, -Wd / 2 * k); g.quadraticCurveTo(L * 0.3 * k, -Wd / 2 * k, L / 2 * k, 0); g.quadraticCurveTo(L * 0.3 * k, Wd / 2 * k, 0, Wd / 2 * k); g.quadraticCurveTo(-L * 0.3 * k, Wd / 2 * k, -L / 2 * k, 0); g.closePath(); };
    g.save(); g.translate(c * 0.08, c * 0.1); g.globalAlpha = o.naAgua ? 0.18 : 0.3; casco(1); g.fillStyle = '#000'; g.fill(); g.restore();
    const gr = g.createLinearGradient(0, -Wd / 2, 0, Wd / 2); gr.addColorStop(0, MAD.luz); gr.addColorStop(1, MAD.med);
    casco(1); g.fillStyle = gr; g.fill(); g.strokeStyle = MAD.esc; g.lineWidth = Math.max(1, c * 0.04); g.stroke();
    casco(0.78); g.fillStyle = '#3a2412'; g.fill();
    g.strokeStyle = MAD.cla; g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.moveTo(-L * 0.28, Wd * 0.08); g.lineTo(L * 0.16, -Wd * 0.04); g.stroke();
    g.fillStyle = MAD.cla; g.beginPath(); g.ellipse(L * 0.22, -Wd * 0.06, c * 0.14, c * 0.07, -0.1, 0, TAU); g.fill();
    if (o.naAgua) { g.globalAlpha = 0.5; g.strokeStyle = '#e8f3f8'; g.lineWidth = Math.max(1, c * 0.03); casco(1.08); g.stroke(); }
    g.restore();
  }
  Object.assign(MO.PINTORES, { moradia, assentos, palicada, ponteTroncos, torreVigia, fossoEstacas, mastroCranios, anelAncestral, cercado, secador, fornoBarro, tear, canoa });

  /* ================= a planta de dentro de uma moradia ================= */
  const PISO = { tenda: 'terra', iurte: 'terra', iglu: 'neve', cabana: 'esteira', palafita: 'esteira' };
  const PAREDE = {
    tenda: { cor: '#7a5636', luz: '#b48d5e', larg: 0.2, tipo: 'couro' }, iurte: { cor: '#d4c8aa', luz: '#8e7c5a', larg: 0.3, tipo: 'feltro' },
    iglu: { cor: '#e6eef4', luz: '#a3b6c6', larg: 0.45, tipo: 'gelo' }, cabana: { cor: '#5e4126', luz: '#8e6a44', larg: 0.3, tipo: 'troncos' }, palafita: { cor: '#5e4126', luz: '#8e6a44', larg: 0.28, tipo: 'troncos' },
  };
  /* A moradia por dentro, no dobro das medidas (o: { tipo, w, h, p: o lado da porta, estilo, seed, c: a do chefe }):
     uma sala só (redonda nas tendas, nas iurtes e nos iglus), com a fogueira bem no meio (no iglu, o braseiro), as
     peles para dormir encostadas na parede, os baús e os jarros; na do chefe, mais peles, a pele grande diante do
     assento, o assento no fundo (de frente para a porta), as armas e um totem. No iglu, o estrado de dormir no fundo
     (meio metro). A cabana e a palafita têm uma janela. O formato é o das plantas das casas (o Interior desenha e monta). */
  function planta(o) {
    o = o || {};
    const tipo = MEDIDA[o.tipo] ? o.tipo : 'tenda', est = Estilos.valido(o.estilo), chefe = !!o.c;
    const W = clamp(Math.round(Number(o.w) || 3) * 2, 6, 16), H = clamp(Math.round(Number(o.h) || 3) * 2, 6, 16);
    const redonda = !!REDONDA[tipo], forma = redonda ? 'oct' : 'ret', corte = redonda ? clamp(Math.round(Math.min(W, H) * 0.293), 1, Math.floor(Math.min(W, H) / 2) - 1) : 0;
    const seed = (Math.round(Number(o.seed)) >>> 0) || 1, rnd = mulberry((seed ^ 0x7f4a7c15) >>> 0 || 3);
    const lado = typeof o.p === 'string' && o.p.length === 1 && 'nsol'.includes(o.p) ? o.p : 's';
    const len = lado === 'n' || lado === 's' ? W : H, d = clamp(Math.floor(len / 2) - 1, corte, len - corte - 1);
    const porta = lado === 'n' ? { lado, x1: d, y1: 0, x2: d + 1, y2: 0 } : lado === 's' ? { lado, x1: d, y1: H, x2: d + 1, y2: H } : lado === 'o' ? { lado, x1: 0, y1: d, x2: 0, y2: d + 1 } : { lado, x1: W, y1: d, x2: W, y2: d + 1 };
    const entra = lado === 'n' ? [d, 0] : lado === 's' ? [d, H - 1] : lado === 'o' ? [0, d] : [W - 1, d];
    const dentro = (i, j) => i >= 0 && j >= 0 && i < W && j < H && (!corte || (i + j >= corte && (W - 1 - i) + j >= corte && i + (H - 1 - j) >= corte && (W - 1 - i) + (H - 1 - j) >= corte));
    const chave = (i, j) => i + ',' + j, ocup = new Set(), passa = new Set();
    // diante da porta, a passagem livre
    { const [di, dj] = DIR[OPOSTO[lado]]; for (let k = 0; k < 3; k++) passa.add(chave(entra[0] + di * k, entra[1] + dj * k)); }
    const livre = (i, j, s) => { for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) { const x = i + a, y = j + b; if (!dentro(x, y) || ocup.has(chave(x, y)) || passa.has(chave(x, y))) return false; } return true; };
    const ocupa = (i, j, s) => { for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) ocup.add(chave(i + a, j + b)); };
    const moveis = [], cx = W / 2, cy = H / 2, relevo = [], formas = [];
    // o fundo (o lado de frente para a porta)
    const fundo = OPOSTO[lado], dF = ANG[fundo];
    // a fogueira bem no meio, e as quatro casas dela
    moveis.push({ id: tipo === 'iglu' ? 'braseiro' : 'fogueira', x: cx - 0.5, y: cy - 0.5, s: 1 });
    ocupa(Math.floor(cx - 1), Math.floor(cy - 1), 2);
    // no iglu, o estrado de dormir: a parte do fundo, meio metro acima
    if (tipo === 'iglu') {
      const m = Math.round((fundo === 'n' || fundo === 's' ? H : W) * 0.42), c2 = corte;
      const pts = fundo === 'n' ? [[c2, 0], [W - c2, 0], [W, c2], [W, m], [0, m], [0, c2]]
        : fundo === 's' ? [[0, H - m], [W, H - m], [W, H - c2], [W - c2, H], [c2, H], [0, H - c2]]
          : fundo === 'o' ? [[0, c2], [c2, 0], [m, 0], [m, H], [c2, H], [0, H - c2]]
            : [[W - m, 0], [W - c2, 0], [W, c2], [W, H - c2], [W - c2, H], [W - m, H]];
      relevo.push({ t: 'plataforma', alt: 0.5, k: 'poly', pts });
      // (o estrado é de neve socada: uma forma clara, com a beira azulada, por cima da área de terreno)
      formas.push({ k: 'poly', pts, f: '#eef4f8', a: 0.9, s: '#9fb6c8', sw: 0.1 });
    }
    // as casas encostadas na parede (a volta da sala), pelo ângulo a partir do meio
    const rente = (i, j) => { for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (!dentro(i + a, j + b)) return true; return false; };
    const candidatos = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (dentro(i, j) && rente(i, j)) candidatos.push([i, j, Math.atan2(j + 0.5 - cy, i + 0.5 - cx)]);
    const giroPara = (i, j) => { const a = Math.atan2(cy - (j + 0.5), cx - (i + 0.5)); return ((Math.round((a * 180 / Math.PI + 90) / 90) * 90) % 360 + 360) % 360; };
    if (chefe) {
      // o assento no fundo, de frente para a porta; a pele grande entre ele e a fogueira; o totem e as armas dos lados
      const R0 = Math.min(W, H) / 2;
      const ax = Math.round(cx - 0.5 + Math.cos(dF) * (R0 - 1.6)), ay = Math.round(cy - 0.5 + Math.sin(dF) * (R0 - 1.6));
      if (livre(ax, ay, 1)) { ocupa(ax, ay, 1); moveis.push({ id: 'almofada', x: ax, y: ay, s: 1, rot: giroPara(ax, ay) }); }
      const px = Math.round(cx - 1 + Math.cos(dF) * 1.9), py = Math.round(cy - 1 + Math.sin(dF) * 1.9);
      if (livre(px, py, 2)) { ocupa(px, py, 2); moveis.splice(1, 0, { id: 'pele', x: px, y: py, s: 2, rot: giroPara(px + 0.5, py + 0.5) }); }
      for (const [id, dd] of [['totem', 0.85], ['armas', -0.85]]) {
        const tx = Math.round(cx - 0.5 + Math.cos(dF + dd) * (R0 - 1.3)), ty = Math.round(cy - 0.5 + Math.sin(dF + dd) * (R0 - 1.3));
        if (livre(tx, ty, 1)) { ocupa(tx, ty, 1); moveis.push({ id, x: tx, y: ty, s: 1, rot: giroPara(tx, ty) }); }
      }
    }
    // as peles, espalhadas pela volta (virando a cabeça para a fogueira)
    const nPeles = chefe ? Math.min(8, Math.round(W * H / 14)) : clamp(Math.round(W * H / 16), 2, 5);
    const lista = candidatos.slice().sort((a, b) => a[2] - b[2]), passo = Math.max(1, Math.floor(lista.length / nPeles)), ini = Math.floor(rnd() * passo);
    for (let k = 0, feitas = 0; k < lista.length && feitas < nPeles; k++) {
      const [i, j] = lista[(ini + k * passo) % lista.length];
      if (!livre(i, j, 1)) continue;
      ocupa(i, j, 1); moveis.push({ id: 'pele', x: i, y: j, s: 1, rot: giroPara(i, j) }); feitas++;
    }
    // os baús e os jarros, nos lugares da volta que sobraram
    const poeRente = (id, n) => { for (let t = 0, f = 0; t < 200 && f < n; t++) { const [i, j] = candidatos[Math.floor(rnd() * candidatos.length) % candidatos.length]; if (!livre(i, j, 1)) continue; ocupa(i, j, 1); moveis.push({ id, x: i, y: j, s: 1, rot: giroPara(i, j) }); f++; } };
    poeRente('bau', chefe ? 2 : 1);
    poeRente('jarro', chefe ? 2 : 1 + Math.floor(rnd() * 2));
    // a janela da cabana e da palafita: num lado que não é o da porta
    const janelas = [];
    if (!redonda) {
      const l = ['n', 's', 'o', 'l'].filter(q => q !== lado)[Math.floor(rnd() * 3) % 3], horiz = l === 'n' || l === 's', L = horiz ? W : H, p0 = Math.floor(L / 2) - 1 + Math.floor(rnd() * 2);
      janelas.push(horiz ? { lado: l, x1: p0, y1: l === 'n' ? 0 : H, x2: p0 + 1, y2: l === 'n' ? 0 : H } : { lado: l, x1: l === 'o' ? 0 : W, y1: p0, x2: l === 'o' ? 0 : W, y2: p0 + 1 });
    }
    const sala = { x: 0, y: 0, w: W, h: H, papel: tipo, moveis };
    return { v: 1, lugar: 'interior', tipo, estilo: est, W, H, forma, corte: corte || null, seed, porta, entra, salas: [sala], paredes: [], janelas, relevo, formas, luzes: [], piso: PISO[tipo], parede: PAREDE[tipo], nome: NOME[tipo] + (chefe ? ' do chefe' : ''), chefe };
  }

  /* ================= a cena, a prévia e o lugar (a janela do gerador) ================= */
  const nomePadrao = p => NOME_ALDEIA[p.moradias] || 'Aldeia';
  const criar = (p, nome, ex) => MO.criarPlano(p, nome, ex, nomePadrao);
  function resumo(p) {
    const n = p.predios.length, M = MORADIAS.find(m => m[0] === p.moradias) || MORADIAS[0];
    const partes = [M[1] + ' · ' + n + (n === 1 ? ' moradia' : ' moradias') + ' (com a do chefe)', p.W + ' × ' + p.H + ' quadrados'];
    if (p.palicada) partes.push('paliçada' + (p.torres && p.torres.length ? ', ' + p.torres.length + ' torres' : '') + ' e fosso');
    if (p.sagrado) partes.push('o círculo de pedras');
    if (p.cercado) partes.push('o cercado');
    return partes.join(' · ') + '.';
  }
  const lembrar = st => { App.opt.triMor = st.moradias; App.opt.triTam = st.tamanho; App.opt.triTer = st.terreno; App.opt.triPal = st.palicada; App.opt.triSag = st.sagrados; App.opt.triVida = st.vida; };
  function padrao() {
    const o = App.opt;
    return { moradias: MEDIDA[o.triMor] ? o.triMor : 'tenda', tamanho: TAMANHOS[o.triTam] ? o.triTam : 'media', terreno: TERRENOS_T.some(t => t[0] === o.triTer) ? o.triTer : 'floresta', palicada: o.triPal !== false, sagrados: o.triSag !== false, vida: o.triVida !== false };
  }
  function controles(st, K, mudou) {
    const { field, seg, toggle } = K;
    const muda = (campo, v) => { st[campo] = v; lembrar(st); mudou(true, { soltar: true }); };
    return h('div', { class: 'ger-c' },
      field('Moradias', seg('tri-mor', st.moradias, MORADIAS.map(([k, n]) => [k, n]), v => muda('moradias', v)), 'stack'),
      h('div', { class: 'ger-l' },
        field('Tamanho', seg('tri-tam', st.tamanho, Object.keys(TAMANHOS).map(k => [k, TAMANHOS[k].n, null, 'Até ' + (TAMANHOS[k].mor + 1) + ' moradias · ' + TAMANHOS[k].W + ' × ' + TAMANHOS[k].H + ' quadrados']), v => muda('tamanho', v)), 'stack')),
      field('Terreno', seg('tri-ter', st.terreno, TERRENOS_T.map(([k, n]) => [k, n]), v => muda('terreno', v)), 'stack'),
      toggle('tri-pal', st.palicada, v => muda('palicada', v), 'Paliçada com o portão, as torres de vigia e o fosso com estacas'),
      toggle('tri-sag', st.sagrados, v => muda('sagrados', v), 'Lugares sagrados (o círculo de pedras com a fogueira dos ancestrais, o mastro com crânios, os totens)'),
      toggle('tri-vida', st.vida, v => muda('vida', v), 'O dia a dia (o cercado com os bichos, os secadores, o forno, o tear, a lenha, o riacho e as canoas)'));
  }
  const opcoesDe = st => ({ moradias: st.moradias, tamanho: st.tamanho, terreno: st.terreno, palicada: !!st.palicada, sagrados: !!st.sagrados, vida: !!st.vida });
  function aplicarOpcoes(st, o) {
    if (MEDIDA[o.moradias]) st.moradias = o.moradias;
    if (TAMANHOS[o.tamanho]) st.tamanho = o.tamanho;
    if (TERRENOS_T.some(t => t[0] === o.terreno)) st.terreno = o.terreno;
    for (const k of ['palicada', 'sagrados', 'vida']) if (typeof o[k] === 'boolean') st[k] = o[k];
    lembrar(st);
  }
  // a parte que trava: o traçado inteiro (a água, a praça, a paliçada, as torres, as moradias, a trilha, o círculo de pedras)
  const partes = p => (p.tracado.length ? ['tracado'] : []);
  function parteEm(p, x, y) {
    for (const f of p.tracado) {
      if (f.k === 'linha' && MO.distLinha(f.pts, x, y) <= f.hw + 0.5) return 'tracado';
      if (f.k === 'poli' && MO.dentroPoli(f.pts, x, y)) return 'tracado';
      if (f.k === 'circ' && Math.hypot(x - f.x, y - f.y) <= f.r) return 'tracado';
    }
    return null;
  }
  const nomeDaParte = () => 'o traçado (a praça, as moradias, a paliçada, a água e a trilha)';
  const formaDaParte = (p, parte) => (parte === 'tracado' ? p.tracado.map(f => (f.k === 'linha' ? { k: 'linha', pts: f.pts, hw: f.hw } : f.k === 'circ' ? { k: 'circ', x: f.x, y: f.y, r: f.r } : { k: 'poli', pts: f.pts })) : []);
  const travada = (p, parte) => parte === 'tracado' && !!p.travaTracado;
  const travaDe = p => (p.travaTracado ? Object.assign({ tamanho: p.tamanho, moradias: p.moradias, terreno: p.terreno, s: p.sT }, p.com) : null);
  function alternar(p, parte, trava) {
    if (parte !== 'tracado') return trava;
    p.travaTracado = !p.travaTracado;
    return travaDe(p);
  }
  const quantasTravadas = p => (p.travaTracado ? 1 : 0);
  const baseDe = () => null;
  const LUGAR = { id: 'tribo', n: 'Tribo', padrao, controles, opcoesDe, aplicarOpcoes, gerar: (st, comum) => gerar(Object.assign({}, st, comum)), previa: MO.previa, resumo, partes, parteEm, nomeDaParte, formaDaParte, travada, alternar, quantasTravadas, baseDe, travaDe, nomePadrao, criar,
    relevoTxt: 'Com relevo e formas (as torres de vigia, o fosso, a água, os deques e as passarelas)',
    dica: 'Clique no traçado da prévia (a praça, as moradias, a paliçada, a água) para travar: "Gerar outro" troca só as árvores, os enfeites e as coisas do dia a dia.',
    nota: 'Sai uma cena nova: as moradias fechadas, cada uma com um marcador de Entrada na porta (só você vê) — dois cliques geram o interior (a fogueira no meio, as peles, os baús); a fogueira e o totem na praça; a paliçada com o portão (abre e fecha), as torres de vigia de 4 m e o fosso; o cercado com a cerca baixa (deixa ver, não deixa passar). Nada sai escrito; tudo continua editável; as cenas que já existem não mudam.',
    feito: (sc, p) => `"${sc.name}" criada: ${resumo(p).replace(/\.$/, '')}. Tudo é editável.` };
  return { MORADIAS, MEDIDA, TAMANHOS, TERRENOS_T, gerar, planta, resumo, criar, nomePadrao, limparTrava, travaDe, LUGAR };
})();
