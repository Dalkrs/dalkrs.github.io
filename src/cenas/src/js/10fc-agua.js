/* ---------------------------------------------------------------
   10fc. ÁGUA E PENHASCO — o Lago, a Praia, o Penhasco e o Desfiladeiro (lote 58)
   Quatro abas da janela "Gerar um lugar…", feitas com o motor do Encontro (Encontro.motor): cada uma é um "terreno"
   escondido do Encontro (Encontro.TERRENOS_LUGARES), com as situações dela e o chão do terreno de base (o lago na
   floresta, a praia na costa, o penhasco e o desfiladeiro na montanha). As situações novas ficam aqui; as que já
   existiam (a enseada, o naufrágio, as piscinas de maré, a falésia, a encosta, o desfiladeiro, o cânion, o lago
   congelado) são as mesmas do Encontro.
   · O Lago: a margem com o junco, a praia pequena e o píer com o barco; a ilha no meio (com o santuário ou a árvore
     antiga e as pedras de atravessar); a cabana do pescador na beira; o lago congelado.
   · A Praia: a enseada, a vila de pescadores (as cabanas, o píer, os barcos puxados, as redes), o naufrágio, as
     piscinas de maré.
   · O Penhasco: a beira do precipício (o paredão, o chão lá embaixo, a escada cavada, as grutas no pé), a falésia no
     mar, a trilha na encosta.
   · O Desfiladeiro: a garganta de pedra, o rio no fundo, a ponte suspensa sobre o abismo, o cânion de arenito.
   No hexágono do Mapa-múndi, o desfiladeiro segue a fenda do mapa (a direção dela, o rio no fundo, a ponte onde a
   estrada passa).
   --------------------------------------------------------------- */
const AguaPenhasco = (() => {
  const E = Encontro, MO = E.motor, SIT = E.SIT, TAU = Math.PI * 2, CH = MO.CH;
  const { blob, curva, faixa, ladosDaFaixa } = MO;
  const PED = () => Paisagem.PEDRA;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ================= o Lago ================= */
  // o lago grande no meio (o contorno macio), com a água rasa e as pedras da beira; → { pts, cx, cy, rx, ry, beira(an, d) }
  function lagoGrande(K, fx, fy) {
    const { W, H, r, P } = K, cx = W * r(0.42, 0.58), cy = H * r(0.42, 0.58), rx = W * (fx || r(0.26, 0.32)), ry = H * (fy || r(0.26, 0.32));
    const pts = blob(K.rT, cx, cy, rx, ry, 22, 0.22, r(0, TAU));
    K.poeLago(pts, 'agua', -1.4, 2);
    // o ponto da beira no ângulo an, d quadrados para fora (d < 0: para dentro)
    const beira = (an, d) => {
      let lo = 0, hi = Math.max(rx, ry) * 2;
      for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (MO.dentroPoli(pts, cx + Math.cos(an) * m, cy + Math.sin(an) * m)) lo = m; else hi = m; }
      return [cx + Math.cos(an) * (lo + (d || 0)), cy + Math.sin(an) * (lo + (d || 0))];
    };
    for (let k = 0; k < 8; k++) { const an = r(0, TAU), [x, y] = beira(an, r(0.2, 0.9)); P.rochas.push({ x, y, r: r(0.25, 0.45) }); }
    P.juncos = 0.4;
    P.dens = (x, y) => (MO.dentroPoli(pts, x, y) ? 0 : 1);
    return { pts, cx, cy, rx, ry, beira };
  }
  // o píer de tábuas: da terra (an, fora da beira) para dentro da água, com o barco amarrado na ponta
  function pier(K, L, an, comBarco) {
    const { r, P } = K, a = L.beira(an, 1.6), b = L.beira(an, -r(2.6, 3.6));
    K.poePassarela([a, b], 1.2, 0.5, [b]);
    if (comBarco !== false) {
      const s = K.sorte(0.5) ? 1 : -1, bx = b[0] + Math.cos(an + s * Math.PI / 2) * 1.9, by = b[1] + Math.sin(an + s * Math.PI / 2) * 1.9;
      K.pinta(2, 'barco', { x: bx, y: by, ang: an + Math.PI + r(-0.2, 0.2), L: 2.8 }); K.marcaCirc(bx, by, 0.9, 8, true); P.cobertura.push({ x: bx, y: by, r: 0.9 });
    }
    return { a, b };
  }
  // a trilha que contorna o lago (de um lado a outro do mapa, passando pela beira)
  function trilhaDoLago(K, L, an) {
    if (K.caminho === 'nenhum') return;
    const { W, H } = K, p = L.beira(an, 2.4), ca = Math.cos(an), sa = Math.sin(an), horiz = Math.abs(sa) > Math.abs(ca);
    const ctrl = horiz ? [[-1, p[1] + K.r(-3, 3)], [L.cx - L.rx * 0.8, L.beira(an + (ca >= 0 ? 0.6 : -0.6), 2.4)[1]], p, [L.cx + L.rx * 0.8, L.beira(an - (ca >= 0 ? 0.6 : -0.6), 2.4)[1]], [W + 1, p[1] + K.r(-3, 3)]]
      : [[p[0] + K.r(-3, 3), -1], [L.beira(an + 0.6, 2.4)[0], L.cy - L.ry * 0.8], p, [L.beira(an - 0.6, 2.4)[0], L.cy + L.ry * 0.8], [p[0] + K.r(-3, 3), H + 1]];
    K.poeCaminho(ctrl.map(q => [clamp(q[0], -1, W + 1), clamp(q[1], -1, H + 1)]));
  }
  SIT['lago.margem'] = K => {
    const { r, P } = K, L = lagoGrande(K), anP = r(0, TAU);
    // a praia pequena de areia (onde o barco fica puxado) e o píer do outro lado
    const anA = anP + Math.PI + r(-0.6, 0.6), pa = L.beira(anA, 0.6), areia = blob(K.rT, pa[0], pa[1], r(2.4, 3.2), r(1.4, 1.9), 12, 0.25, anA + Math.PI / 2);
    K.mancha(areia, CH.areia, { pedrisco: ['#f4ead0', '#a8946a'] }); K.marcaPoli(areia, 5);
    const pb = L.beira(anA, 0.4);
    K.pinta(2, 'barco', { x: pb[0], y: pb[1], ang: anA + Math.PI + r(-0.5, 0.5), L: 2.6 }); K.marcaCirc(pb[0], pb[1], 0.9, 8, true);
    pier(K, L, anP, false);
    // as touceiras de junco na água rasa da beira
    for (let k = 0; k < 4; k++) { const [x, y] = L.beira(r(0, TAU), -r(0.4, 1)); K.zona('lama', x, y, { r: r(0.9, 1.4), leve: true }); }
    trilhaDoLago(K, L, anP);
    const f = L.beira(anP, 1); K.foco(f[0], f[1]);
  };
  SIT['lago.ilha'] = K => {
    const { r, ri, P } = K, L = lagoGrande(K, r(0.32, 0.37), r(0.32, 0.37));
    // a ilha no meio (o chão um pouco mais alto), com o que há nela
    const ix = L.cx + r(-1.5, 1.5), iy = L.cy + r(-1.5, 1.5), irx = Math.min(L.rx, L.ry) * r(0.32, 0.4), ilha = blob(K.rT, ix, iy, irx, irx * r(0.75, 0.95), 14, 0.25);
    K.mancha(ilha, CH.ilha, { capim: ['#6f8a4a', '#2f3a24'] }); K.marcaPoli(ilha, 0, true);
    P.relevo.push({ t: 'morro', alt: 0.6, k: 'poly', pts: ilha }); P.tracado.push({ k: 'poli', pts: ilha });
    if (K.sorte(0.5)) { K.pinta(1, 'santuario', { x: ix, y: iy }); K.marcaCirc(ix, iy, 0.9, 3, true); K.objetoPerto('vela', ix, iy, 1.6, v => v === 0); K.objetoPerto('estatua', ix, iy, 1.8, v => v === 0); }
    else { K.arvore(ix, iy, r(1.5, 1.9), 'folhosa'); P.cobertura.push({ x: ix, y: iy, r: 1.6 }); K.objetoPerto('tumulo', ix, iy, 2, v => v === 0); }
    // as pedras de atravessar da beira até a ilha (ou o barco, quando não dá)
    const an = r(0, TAU), a = L.beira(an, -0.3), b = [ix + Math.cos(an) * irx * 0.9, iy + Math.sin(an) * irx * 0.9], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d < 9) {
      const pedras = [], n = Math.max(2, Math.round(d / 0.85));
      for (let k = 0; k <= n; k++) pedras.push([a[0] + (b[0] - a[0]) * k / n + r(-0.15, 0.15), a[1] + (b[1] - a[1]) * k / n + r(-0.15, 0.15)]);
      K.pinta(1, 'pedras', { pts: pedras });
      for (const [px, py] of pedras) { K.marcaCirc(px, py, 0.45, 10, true); P.relevo.push({ t: 'plataforma', alt: 0.3, k: 'ell', x: px - 0.32, y: py - 0.25, w: 0.64, h: 0.5 }); }
      P.tracado.push({ k: 'linha', pts: pedras, hw: 0.4 });
    }
    const pb = L.beira(an + Math.PI * r(0.6, 1.4), 0.5);
    K.pinta(2, 'barco', { x: pb[0], y: pb[1], ang: r(0, TAU), L: 2.6 }); K.marcaCirc(pb[0], pb[1], 0.9, 8, true);
    for (let k = 0; k < ri(1, 2); k++) K.pedraGrandeLivre(r(0.8, 1.1));
    trilhaDoLago(K, L, an);
    K.foco(ix, iy);
  };
  SIT['lago.cabana'] = K => {
    const { r, ri, P } = K, L = lagoGrande(K), an = r(0, TAU), ca = Math.cos(an), sa = Math.sin(an);
    // a cabana na beira, com a porta para o lago, o píer saindo dela, o varal das redes, a lenha e o barco
    const lado = Math.abs(ca) > Math.abs(sa) ? (ca > 0 ? 'o' : 'l') : (sa > 0 ? 'n' : 's');
    const w = ri(4, 5), h = 4, c0 = L.beira(an, 2.2 + Math.max(w, h) / 2), x = Math.round(c0[0] - w / 2), y = Math.round(c0[1] - h / 2);
    const xx = clamp(x, 1, K.W - w - 1), yy = clamp(y, 1, K.H - h - 1);
    const k = K.predio({ tipo: 'casa', x: xx, y: yy, w, h, lado, aberto: true });
    pier(K, L, an, true);
    const [fx, fy] = MO.foraDaPorta(k.porta), lx = fx + 0.5 - sa * 2.2, ly = fy + 0.5 + ca * 2.2;
    if (K.dentro(lx, ly, 1.5) && K.livreCirc(lx, ly, 1, v => v === 0 || v === 5)) { K.pinta(2, 'varal', { x: lx, y: ly, ang: an + Math.PI / 2 }); K.marcaCirc(lx, ly, 1.1, 4, true); }
    for (const id of ['barril', 'caixote', 'lenha']) K.objetoPerto(id, fx + 0.5, fy + 0.5, 2.6, v => v === 0 || v === 5);
    K.objetoPerto('fogueira', fx + 0.5 + ca * 0.5, fy + 0.5 + sa * 0.5, 3.2, v => v === 0 || v === 5);
    trilhaDoLago(K, L, an + Math.PI * 0.5);
    K.foco(fx + 0.5, fy + 0.5);
  };
  SIT['lago.congelado'] = K => SIT['neve.lago'](K);

  /* ================= a Praia ================= */
  SIT['praia.enseada'] = K => SIT['costa.enseada'](K);
  SIT['praia.naufragio'] = K => SIT['costa.naufragio'](K);
  SIT['praia.mare'] = K => SIT['costa.mare'](K);
  SIT['praia.pescadores'] = K => {
    const { W, H, r, ri, P } = K, M = E.costaBase(K), L = M.L, rumo = E.RUMO_TERRA[M.lado], daB = (t, d) => E.daBeira(M, t, d);
    const deitado = M.lado === 'n' || M.lado === 's';
    // as cabanas em fileira, de frente para o mar, longe da areia
    const n = ri(3, 4), passo = L / (n + 1), feitas = [];
    for (let i = 0; i < n; i++) {
      const t = passo * (i + 1) + r(-1, 1), w = ri(4, 5), h = ri(3, 4), d = M.larg ? M.larg(t) + r(3.2, 4.8) : r(5, 7), c0 = daB(t, d + h / 2);
      const x = Math.round(c0[0] - (deitado ? w : h) / 2), y = Math.round(c0[1] - (deitado ? h : w) / 2), ww = deitado ? w : h, hh = deitado ? h : w;
      if (x < 1 || y < 1 || x + ww > W - 1 || y + hh > H - 1) continue;
      let livre = true; for (let j = y - 1; j <= y + hh; j++) for (let ii = x - 1; ii <= x + ww; ii++) { const v = K.at(ii, j); if (v !== 0 && v !== 5 && v !== 6) livre = false; }
      if (!livre) continue;
      const k = K.predio({ tipo: 'casa', x, y, w: ww, h: hh, lado: M.lado, aberto: i % 2 === 0 });
      feitas.push(k);
      const [fx, fy] = MO.foraDaPorta(k.porta);
      if (K.sorte(0.6)) K.objetoPerto(K.pick(['barril', 'caixote', 'lenha']), fx + 0.5, fy + 0.5, 1.8, v => v === 0 || v === 5 || v === 6);
    }
    // o píer entrando no mar, os barcos puxados na areia, as redes secando e a fogueira dos pescadores
    const tP = L * r(0.35, 0.65), a = daB(tP, 1.2), b = daB(tP, -r(4, 5.5));
    K.poePassarela([a, b], 1.3, 0.5, [b]);
    K.pinta(2, 'barco', { x: b[0] + Math.cos(rumo + Math.PI / 2) * 1.8, y: b[1] + Math.sin(rumo + Math.PI / 2) * 1.8, ang: rumo + Math.PI, L: 3 });
    for (let i = 0; i < ri(2, 3); i++) { const t = r(2, L - 2); if (Math.abs(t - tP) < 3) continue; const q = daB(t, 0.9); K.pinta(2, 'barco', { x: q[0], y: q[1], ang: rumo + Math.PI + r(-0.5, 0.5), L: r(2.4, 3) }); K.marcaCirc(q[0], q[1], 0.9, 8, true); P.cobertura.push({ x: q[0], y: q[1], r: 0.9 }); }
    for (let i = 0; i < 2; i++) { const t = r(2, L - 2), q = daB(t, r(2.2, 3)); if (K.livreCirc(q[0], q[1], 1, v => v === 5 || v === 0)) { K.pinta(2, 'varal', { x: q[0], y: q[1], ang: rumo + Math.PI / 2 }); K.marcaCirc(q[0], q[1], 1.1, 4, true); } }
    { const q = daB(tP + (K.sorte(0.5) ? 3 : -3), 2.6); K.pinta(2, 'fogueiraApagada', { x: q[0], y: q[1] }); K.marcaCirc(q[0], q[1], 0.7, 3, true); }
    // o caminho por trás das cabanas, ao longo da costa, e o pedaço até o píer
    if (K.caminho !== 'nenhum') {
      const d = t => (M.larg ? M.larg(t) : 2) + 10;
      K.poeCaminho([daB(-1, d(0)), daB(L * 0.33, d(L * 0.33)), daB(L * 0.66, d(L * 0.66)), daB(L + 1, d(L))]);
      K.poeCaminho([daB(tP, d(tP)), daB(tP, 2.5)]);
    }
    const f = daB(tP, 2); K.foco(f[0], f[1]);
  };

  /* ================= o Penhasco ================= */
  SIT['penhasco.falesia'] = K => SIT['costa.falesia'](K);
  SIT['penhasco.encosta'] = K => SIT['montanha.encosta'](K);
  /* A beira do precipício: de um lado o chão de cima, do outro, lá embaixo, o chão do pé do paredão; a face do paredão
     (impassável), a escada cavada que desce, as grutas no pé e as pedras que caíram lá embaixo. */
  SIT['penhasco.precipicio'] = K => {
    const { W, H, r, ri, P } = K, lado = K.pick(['n', 's', 'o', 'l']), deitado = lado === 'n' || lado === 's', L = deitado ? W : H, D = deitado ? H : W;
    // o ponto a d quadrados da borda do lado de baixo, em t ao longo dela
    const ponto = (t, d) => (lado === 'n' ? [t, d] : lado === 's' ? [t, H - d] : lado === 'o' ? [d, t] : [W - d, t]);
    const rumo = { n: Math.PI / 2, s: -Math.PI / 2, o: 0, l: Math.PI }[lado];            // (de baixo para cima)
    const f1 = r(0, TAU), f2 = r(0, TAU), base = D * r(0.32, 0.4);
    const pe = t => base + 1.6 * Math.sin(t * 0.21 + f1) + 0.9 * Math.sin(t * 0.47 + f2), larg = t => 1.7 + 0.4 * Math.sin(t * 0.6 + f2), topo = t => pe(t) + larg(t);
    const baixo = [], alto = [], borda = [];
    for (let t = -2; t <= L + 2.001; t += 0.5) { baixo.push(ponto(t, pe(t))); alto.push(ponto(t, topo(t))); borda.push(ponto(t, -2)); }
    const face = baixo.concat(alto.slice().reverse()), chaoBaixo = borda.concat(baixo.slice().reverse());
    const pedra = Biomas.BIO.montanha.pedra ? PED()[Biomas.BIO.montanha.pedra] || PED().rocha : PED().rocha;
    K.pinta(1, 'falesia', { alto, baixo, cores: pedra });
    K.marcaPoli(face, 7, true);
    P.relevo.push({ t: 'fosso', alt: -8, k: 'poly', pts: chaoBaixo }, { t: 'fosso', alt: -4, k: 'poly', pts: face, a: 0.16 });
    K.mancha(chaoBaixo, CH.terra, { pedrisco: ['#8a7a5a', '#4e4232'] });
    P.tracado.push({ k: 'poli', pts: face });
    // a escada cavada na pedra
    const tE = L * r(0.3, 0.7), sE = K.sorte(0.5) ? 1 : -1, t1 = ponto(tE + sE * 1.6, topo(tE + sE * 1.6) + 0.4), t0 = ponto(tE - sE * 0.4, pe(tE - sE * 0.4) - 0.3);
    K.pinta(1, 'escadaPedra', { pts: [t1, t0], larg: 1.1, cores: pedra });
    K.marcaLinha([t1, t0], 0.85, 1, true);
    P.relevo.push({ t: 'plataforma', alt: -4, k: 'free', pts: [t1, t0], sw: 1.1 });
    P.tracado.push({ k: 'linha', pts: [t1, t0], hw: 0.6 });
    // as grutas no pé do paredão (a boca para baixo) e as pedras caídas lá embaixo
    for (let k = 0, n = ri(1, 2); k < n; k++) {
      let tG = tE + (k ? -1 : 1) * sE * L * r(0.22, 0.32);
      if (tG < 2 || tG > L - 2) tG = 2 * tE - tG;
      const g0 = ponto(tG, pe(tG) - 0.25);
      if (K.dentro(g0[0], g0[1], 1)) { K.pinta(2, 'bocaGruta', { x: g0[0], y: g0[1], ang: rumo + Math.PI, r: r(0.8, 1.05), cores: pedra }); P.cavernasBoca = (P.cavernasBoca || 0) + 1; }
    }
    for (let k = 0; k < ri(3, 5); k++) { const t = r(2, L - 2), q = ponto(t, r(1.2, Math.max(1.4, pe(t) - 1.8))); if (K.dentro(q[0], q[1], 1) && K.livreCirc(q[0], q[1], 1)) K.pedraGrande(q[0], q[1], r(0.6, 1.1), pedra); }
    // os ninhos na beira de cima e as pedras de esconder no alto
    for (let k = 0; k < 2; k++) { const t = r(2, L - 2), q = ponto(t, topo(t) + 1.1); if (K.livreCirc(q[0], q[1], 0.9)) { K.pinta(2, 'ninho', { x: q[0], y: q[1], r: r(0.6, 0.8) }); K.marcaCirc(q[0], q[1], 0.8, 4, true); } }
    for (let k = 0; k < ri(2, 3); k++) K.pedraGrandeLivre(r(0.8, 1.2), pedra, (x, y) => { const d = lado === 'n' ? y : lado === 's' ? H - y : lado === 'o' ? x : W - x; return d > base + 4; });
    // a trilha pelo alto, ao longo da beira, e o pedaço até a escada
    if (K.caminho !== 'nenhum') {
      const d = t => topo(t) + 3.2;
      K.poeCaminho([ponto(-1, d(-1)), ponto(L * 0.33, d(L * 0.33) + r(-1, 1)), ponto(tE + sE * 1.6, d(tE + sE * 1.6)), ponto(L * 0.7, d(L * 0.7) + r(-1, 1)), ponto(L + 1, d(L + 1))]);
      K.poeCaminho([ponto(tE + sE * 1.6, d(tE + sE * 1.6)), t1]);
    }
    K.foco(t1[0], t1[1]);
  };

  /* ================= o Desfiladeiro ================= */
  // a linha do meio: a da fenda do Mapa-múndi (a peça mais comprida, levada até as bordas) ou uma sorteada
  function meioDaFenda(K) {
    const { W, H, r } = K, f = K.hex && K.hex.fenda;
    if (f && f.pecas.length) {
      const pc = f.pecas.slice().sort((a, b) => b.pts.length - a.pts.length)[0];
      let pts = pc.pts.map(([u, v]) => [u * W, v * H]);
      // (as pontas que estão na borda saem um pouco para fora, para os paredões irem até lá)
      const sai = (p, q) => { const dx = p[0] - q[0], dy = p[1] - q[1], l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 3, p[1] + dy / l * 3]; };
      if (pts.length >= 2) { if (pc.ini) pts.unshift(sai(pts[0], pts[1])); if (pc.fim) pts.push(sai(pts[pts.length - 1], pts[pts.length - 2])); }
      return { meio: curva(pts, 1.2), doMapa: true };
    }
    const horizontal = W >= H ? K.sorte(0.75) : K.sorte(0.25), Lm = horizontal ? W : H, M = horizontal ? H : W, Q = (a, b) => (horizontal ? [a, b] : [b, a]), c0 = M * r(0.42, 0.58);
    return { meio: curva([Q(-2, c0 + r(-2, 2)), Q(Lm * 0.33, c0 + r(-3, 3)), Q(Lm * 0.66, c0 + r(-3, 3)), Q(Lm + 2, c0 + r(-2, 2))], 1.2), doMapa: false };
  }
  // os dois paredões ao longo da linha do meio (cada um vai longe para o seu lado: o mapa corta)
  function paredoes(K, meio, hf, cores, alt) {
    const { esq, dir } = ladosDaFaixa(meio, hf, K.rT, 1.2), longe = ladosDaFaixa(meio, hf + 60, null, 0);
    K.poePenhasco(esq.concat(longe.esq.slice().reverse()), alt, cores);
    K.poePenhasco(dir.concat(longe.dir.slice().reverse()), alt, cores);
    K.eixo = meio;
    return { esq, dir };
  }
  const ptsDoCaminho = meio => meio.filter((_, i) => i % 3 === 0).concat([meio[meio.length - 1]]);
  SIT['desfiladeiro.garganta'] = K => {
    const { r, P } = K, { meio } = meioDaFenda(K), hf = r(2.6, 3.4);
    paredoes(K, meio, hf, PED().rocha, 8);
    for (let k = 0; k < 3; k++) { const p = Paisagem.aoLongo(meio, 0.15 + k * 0.32 + r(0, 0.1)), off = r(-1.4, 1.4); if (Math.abs(off) > 0.6) K.pedraGrande(p.x - Math.sin(p.ang) * off, p.y + Math.cos(p.ang) * off, r(0.7, 1)); }
    if (K.caminho !== 'nenhum') K.poeCaminho(ptsDoCaminho(meio));
    const f = Paisagem.aoLongo(meio, 0.5); K.foco(f.x, f.y);
  };
  SIT['desfiladeiro.rio'] = K => {
    const { r, P } = K, { meio } = meioDaFenda(K), hf = r(3.2, 4), hw = r(1, 1.3);
    paredoes(K, meio, hf, PED().rocha, 8);
    // o rio corre colado num paredão; na outra margem, a passagem estreita (o do Mapa-múndi vem pelo traçado)
    const temRioDoMapa = !!(K.hex && K.hex.rios && K.hex.rios.length), lado = K.sorte(0.5) ? 1 : -1;
    const lin = (off) => meio.map((p, i) => { const a = meio[Math.max(0, i - 1)], b = meio[Math.min(meio.length - 1, i + 1)], an = Math.atan2(b[1] - a[1], b[0] - a[0]); return [p[0] - Math.sin(an) * off, p[1] + Math.cos(an) * off]; });
    if (!temRioDoMapa) K.poeRio(lin(lado * (hf - hw - 0.4)).filter((_, i) => i % 3 === 0), hw, 'agua', -1.2);
    for (let k = 0; k < 4; k++) { const p = Paisagem.aoLongo(meio, r(0.1, 0.9)), off = -lado * r(0.6, hf - 1); P.rochas.push({ x: p.x - Math.sin(p.ang) * off, y: p.y + Math.cos(p.ang) * off, r: r(0.3, 0.5) }); }
    if (K.caminho !== 'nenhum') K.poeCaminho(ptsDoCaminho(lin(-lado * (hf - 1.6))));
    P.juncos = 0.2;
    const f = Paisagem.aoLongo(meio, 0.5); K.foco(f.x, f.y);
  };
  /* A ponte suspensa: o abismo ao longo da linha do meio, o chão dos dois lados e a ponte de corda onde o caminho passa
     (no hexágono, onde a estrada do mapa cruza a fenda). */
  SIT['desfiladeiro.ponte'] = K => {
    const { W, H, r, P } = K, { meio } = meioDaFenda(K), hw = r(2, 2.8), abismo = faixa(meio, hw, K.rT, 0.9);
    K.poeAbismo(abismo, -20);
    // onde atravessar: o cruzamento com um caminho do hexágono, ou o meio
    let p = null;
    for (const c of (K.hex && K.hex.caminhos) || []) { const x = E.cruzamento(curva(c.pts.map(([u, v]) => [u * W, v * H]), 1), meio); if (x) { p = { x: x.x, y: x.y, ang: x.angB != null ? x.angB : Math.atan2(meio[1][1] - meio[0][1], meio[1][0] - meio[0][0]) }; break; } }
    if (!p) p = Paisagem.aoLongo(meio, r(0.38, 0.62));
    let atrav = p.ang + Math.PI / 2;
    if (Math.cos(atrav) < 0) atrav += Math.PI;
    K.ponte(p.x, p.y, hw * 2 + 2.2, 1.2, atrav, 'corda', 0);
    const ca = Math.cos(atrav), sa = Math.sin(atrav), d = hw + 4;
    if (!(K.hex && K.hex.caminhos && K.hex.caminhos.length)) K.poeCaminho([[clamp(p.x - ca * 40, -1, W + 1), clamp(p.y - sa * 40, -1, H + 1)], [p.x - ca * d, p.y - sa * d], [p.x, p.y], [p.x + ca * d, p.y + sa * d], [clamp(p.x + ca * 40, -1, W + 1), clamp(p.y + sa * 40, -1, H + 1)]], K.camOuTrilha());
    for (let k = 0; k < 4; k++) K.pedraGrandeLivre(r(0.8, 1.2));
    K.foco(p.x, p.y);
  };
  SIT['desfiladeiro.canion'] = K => SIT['deserto.canion'](K);

  /* ================= (lote 58) mais variedade na floresta ================= */
  // as ruínas no mato: a fundação de pedra quebrada (os pedaços de muro, baixos: dá para subir), as colunas caídas, a
  // estátua, a mata fechada em volta e as raízes por cima
  SIT['floresta.ruinas'] = K => {
    const { W, H, r, ri, P } = K, cx = W * r(0.4, 0.6), cy = H * r(0.4, 0.6), w = r(7, 9), h = r(5.5, 7), ang = r(-0.35, 0.35);
    const ca = Math.cos(ang), sa = Math.sin(ang), em = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];
    const lados = [[[-w / 2, -h / 2], [w / 2, -h / 2]], [[w / 2, -h / 2], [w / 2, h / 2]], [[w / 2, h / 2], [-w / 2, h / 2]], [[-w / 2, h / 2], [-w / 2, -h / 2]]];
    const porta = ri(0, 3);
    lados.forEach(([a, b], i) => {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(L / 2.4));
      for (let k = 0; k < n; k++) {
        if (i === porta && k === Math.floor(n / 2)) continue;                     // (a entrada)
        if (K.sorte(0.28)) continue;                                              // (o pedaço que caiu)
        const t0 = k / n + 0.04, t1 = (k + 1) / n - 0.04, p0 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], p1 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
        const m = em((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2), comp = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), an2 = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + ang;
        K.poePenhasco(Estilos.retangulo(m[0], m[1], comp, r(0.7, 0.95), an2), r(1, 1.8), PED().floresta, false);       // (baixos: sem parede de visão)
      }
    });
    // o chão de lajes do meio, as colunas caídas, a estátua e o que sobrou
    const piso = [em(-w / 2 + 0.6, -h / 2 + 0.6), em(w / 2 - 0.6, -h / 2 + 0.6), em(w / 2 - 0.6, h / 2 - 0.6), em(-w / 2 + 0.6, h / 2 - 0.6)];
    K.mancha(piso, ['#7d7a6c', '#6e6b5e', '#8a8778', '#625f53'], { pedrisco: ['#9a978a', '#4e4c42'] });
    for (let k = 0; k < ri(2, 3); k++) K.objetoPerto('coluna', cx, cy, Math.min(w, h) * 0.35, v => v === 0);
    K.objetoPerto(K.sorte(0.5) ? 'estatua' : 'altar', cx, cy, 1.2, v => v === 0);
    for (let k = 0; k < ri(1, 2); k++) K.objetoPerto(K.pick(['bau', 'tumulo', 'cranios']), cx, cy, Math.min(w, h) * 0.4, v => v === 0);
    // a mata fechada em volta (as manchas escuras) e mais árvores
    for (let k = 0; k < ri(2, 3); k++) { const an = r(0, TAU), d = Math.max(w, h) * r(0.75, 0.95), x = cx + Math.cos(an) * d, y = cy + Math.sin(an) * d; if (!K.dentro(x, y, 2)) continue; const mt = blob(K.rT, x, y, r(2.2, 3), r(1.6, 2.4), 12, 0.3); K.mancha(mt, CH.mataEscura, { capim: ['#4f7a3f', '#203a1d'] }); P.relevo.push({ t: 'mata', alt: 0, k: 'poly', pts: mt }); }
    P.densBase = 0.19; P.dens = (x, y) => (Math.abs((x - cx) * ca + (y - cy) * sa) < w / 2 + 0.6 && Math.abs(-(x - cx) * sa + (y - cy) * ca) < h / 2 + 0.6 ? 0 : 1);
    if (K.caminho !== 'nenhum') { const pe = em(...[[0, -h / 2 - 2], [w / 2 + 2, 0], [0, h / 2 + 2], [-w / 2 - 2, 0]][porta]); K.poeCaminho([[-1, pe[1] + r(-4, 4)], pe, [cx, cy]]); }
    K.foco(cx, cy);
  };
  // a lagoa na clareira: a água parada pequena, o junco, as pedras da beira e o tronco caído entrando nela
  SIT['floresta.lagoa'] = K => {
    const { r, P } = K, L = lagoGrande(K, r(0.16, 0.2), r(0.17, 0.22)), an = r(0, TAU);
    const clareira = blob(K.rT, L.cx, L.cy, L.rx + 3.2, L.ry + 3, 16, 0.25);
    K.mancha(clareira, CH.clareira, { capim: ['#6f8a4a', '#2f3a24'] });
    P.dens = (x, y) => (MO.dentroPoli(L.pts, x, y) ? 0 : MO.dentroPoli(clareira, x, y) ? 0.15 : 1.3);
    const a = L.beira(an, 1.4), b = L.beira(an, -1.6);
    K.objeto('tronco', Math.floor((a[0] + b[0]) / 2), Math.floor((a[1] + b[1]) / 2), Math.round(an * 180 / Math.PI / 90) * 90, v => v === 0 || v === 2 || v === 5);
    for (let k = 0; k < 2; k++) K.objetoPerto('cogumelos', L.cx, L.cy, Math.max(L.rx, L.ry) + 2.5, v => v === 0 || v === 5);
    if (K.caminho !== 'nenhum') { const p0 = L.beira(an + Math.PI, 2.2); K.poeCaminho([[p0[0] < K.W / 2 ? -1 : K.W + 1, p0[1] + r(-3, 3)], p0]); }
    K.foco(L.cx, L.cy);
  };

  /* ================= as abas ================= */
  const NOTAS = {
    lago: 'Sai um lago no meio da cena: a margem com o junco e as pedras, a água rasa da beira, o píer ou a ilha, o barco. Os marcadores da chegada e da emboscada nascem ocultos (só você vê).',
    praia: 'Sai a costa: a areia com a espuma, o mar com a correnteza, os barcos, o píer ou o naufrágio. Os marcadores nascem ocultos (só você vê).',
    penhasco: 'Sai o paredão: o chão de cima, o de baixo (mais fundo, no relevo), a escada cavada e as grutas no pé — ou a falésia no mar. Os marcadores nascem ocultos (só você vê).',
    desfiladeiro: 'Sai a fenda entre os paredões: a garganta, o rio no fundo, a ponte suspensa sobre o abismo ou o cânion. No hexágono do Mapa-múndi, ela segue a fenda do mapa. Os marcadores nascem ocultos (só você vê).',
  };
  function lugarDe(id) {
    const T = E.TER[id], base = E.LUGAR, chave = 'ag' + id.charAt(0).toUpperCase() + id.slice(1);
    const ler = () => (App.opt[chave] && typeof App.opt[chave] === 'object' ? App.opt[chave] : {});
    const lembrar = st => { App.opt[chave] = { sit: st.situacao, cam: st.caminho, tam: st.tamanho, mis: st.mistura, marcas: st.marcas, achados: st.achados !== false, t: Tracado.soMudadas(st.t || Tracado.padrao()) }; };
    const sitDe = st => (st.situacao === 'surpresa' ? T.sit[0][0] : st.situacao);
    function padrao() {
      const o = ler();
      return { terreno: id, situacao: T.sit.some(s => s[0] === o.sit) ? o.sit : 'surpresa', caminho: E.CAMINHOS.some(c => c[0] === o.cam) ? o.cam : 'trilha', tamanho: E.TAMANHOS[o.tam] ? o.tam : 'medio',
        marcas: o.marcas !== false, t: Tracado.limpar(o.t), chao: 2, mistura: Biomas.mistura(o.mis), historia: [], achados: o.achados !== false };
    }
    function controles(st, K, mudou, ctx) {
      const { field, seg, toggle } = K, muda = (campo, v) => { st[campo] = v; lembrar(st); mudou(true, { soltar: true }); };
      const hx = ctx && ctx.hex ? ctx.hex : null, rioHex = hx && hx.rios.length ? HexCena.rioTxt(hx) : '', camHex = hx && hx.caminhos.length ? HexCena.caminhosTxt(hx) : '';
      return h('div', { class: 'ger-c' },
        field('Situação', seg('ag-' + id + '-sit', st.situacao, T.sit.map(([k, n]) => [k, n]).concat([['surpresa', 'Surpresa', null, 'Sorteia uma das situações']]), v => muda('situacao', v)), 'stack'),
        h('div', { class: 'ger-l' },
          field('Caminho', seg('ag-' + id + '-cam', st.caminho, E.CAMINHOS.map(([k, n]) => [k, n]), v => muda('caminho', v)), 'stack'),
          field('Tamanho', seg('ag-' + id + '-tam', st.tamanho, Object.keys(E.TAMANHOS).map(k => [k, E.TAMANHOS[k].n, null, E.TAMANHOS[k].W + ' × ' + E.TAMANHOS[k].H + ' quadrados']), v => muda('tamanho', v)), 'stack')),
        field('Mistura', seg('ag-' + id + '-mis', Biomas.mistura(st.mistura), Biomas.MISTURAS, v => muda('mistura', v)), 'stack'),
        toggle('ag-' + id + '-achados', st.achados !== false, v => { st.achados = v; lembrar(st); mudou(true); }, 'Achados raros: a semente decide, um em cada quatro lugares (só você vê o marcador)'),
        toggle('ag-' + id + '-marcas', st.marcas, v => { st.marcas = v; lembrar(st); mudou(true); }, 'Marcar a chegada e a emboscada (só você vê)'),
        Tracado.secao(st.t || (st.t = Tracado.padrao()), K, () => { lembrar(st); mudou(true); }, { pre: 'ag-' + id, portoes: 'Caminhos',
          portoesNota: 'De onde chegam os caminhos: de cada direção ligada, um caminho até o da situação.',
          rio: true, mar: id === 'praia', rioDica: 'O rio desce pelo relevo: de onde ele vem, o chão é mais alto.', pontes: true, relevo: false,
          rioHex: rioHex ? 'O rio vem do hexágono do Mapa-múndi: ' + rioHex + '.' : null, portoesHex: camHex ? 'Os caminhos vêm do hexágono do Mapa-múndi: ' + camHex + '.' : null }));
    }
    function aplicarOpcoes(st, o, op) {
      if (T.sit.some(s => s[0] === o.situacao) || o.situacao === 'surpresa') st.situacao = o.situacao;
      if (E.CAMINHOS.some(c => c[0] === o.caminho)) st.caminho = o.caminho;
      if (E.TAMANHOS[o.tamanho]) st.tamanho = o.tamanho;
      if (typeof o.marcas === 'boolean') st.marcas = o.marcas;
      if (typeof o.mistura === 'string' && Biomas.FRACAO[o.mistura] != null) st.mistura = o.mistura;
      if (typeof o.achados === 'boolean') st.achados = o.achados;
      st.t = Tracado.limpar(o);
      st.terreno = id; st.chao = 2;
      if (!(op && op.semLembrar)) lembrar(st);
    }
    return Object.assign({}, base, {
      id, n: T.n, padrao, controles, aplicarOpcoes,
      opcoesDe: st => Object.assign(base.opcoesDe(Object.assign({}, st, { terreno: id, chao: 2 }))),
      gerar: (st, comum) => base.gerar(Object.assign({}, st, { terreno: id, chao: 2 }), comum),
      aceitaHex: (st, hex) => HexCena.aceita(hex),
      biomaDe: st => E.BIOMA[E.baseDoLugar(T, sitDe(st))] || null,
      nota: NOTAS[id],
    });
  }
  const LUGARES = { lago: lugarDe('lago'), praia: lugarDe('praia'), penhasco: lugarDe('penhasco'), desfiladeiro: lugarDe('desfiladeiro') };
  return { LUGARES, lagoGrande, meioDaFenda };
})();
