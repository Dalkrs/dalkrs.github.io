/* ---------------------------------------------------------------
   10f6c. LUGARES DO MUNDO — a aba "Lugares do mundo" (lote 126)
   Uma aba da janela "Gerar um lugar…", feita com o motor dos encontros (Encontro.motor) e as ferramentas das Ruínas:
   · o templo de um deus: o salão inteiro sobre o estilóbato, a escadaria, as colunas, o altar, a estátua do deus e o
     culto (da Luz, da Lua, da guerra, da natureza ou das sombras: as luzes, os objetos e a zona mudam);
   · o ninho de dragão: a bacia de rocha com a entrada, o ninho de ossos com os ovos, o tesouro, o chão queimado e a
     boca da toca (a Entrada: o covil embaixo);
   · a fossa das almas: o poço sem fundo, a ponte de pedra estreita até a plataforma do altar, as correntes, os
     obeliscos em volta, os espíritos sobre o abismo e a escada da cripta;
   · a cratera: a bacia com a borda alta, o fundo (um lago, os cristais ou seco) e as pedras do impacto;
   · o posto de fronteira (com o pedágio): a estrada que atravessa, a paliçada de lado a lado, a cancela (uma porta: abre
     e fecha), a torre de vigia, a guarita, a casa da cobrança, o estábulo e o estandarte.
   Os pontos que importam ficam num marcador oculto, com o nome (só o mestre vê). Nada sai escrito no mapa.
   --------------------------------------------------------------- */
const LugaresMundo = (() => {
  const TAU = Math.PI * 2, MO = Encontro.motor, F = Ruinas.ferr;
  const TIPOS = [['templo', 'Templo de um deus'], ['ninho', 'Ninho de dragão'], ['fossa', 'Fossa das almas'], ['cratera', 'Cratera'], ['posto', 'Posto de fronteira']];
  const NOME = { templo: 'Templo', ninho: 'Ninho de dragão', fossa: 'Fossa das almas', cratera: 'Cratera', posto: 'Posto de fronteira' };
  const DICA = {
    templo: 'O salão inteiro sobre o estilóbato: a escadaria, as colunas, o altar, a estátua do deus e o culto — um lugar de descanso para quem é bem-vindo',
    ninho: 'A bacia de rocha, o ninho de ossos com os ovos, o tesouro, o chão queimado e a boca da toca',
    fossa: 'O poço sem fundo, a ponte estreita até o altar, as correntes, os obeliscos e os espíritos que o Vazio não recolheu',
    cratera: 'A bacia com a borda alta e o fundo (um lago, os cristais ou seco), com as pedras do impacto em volta',
    posto: 'A estrada que atravessa a paliçada, a cancela, a torre de vigia, a guarita e (com o pedágio) a casa da cobrança',
  };
  const CULTOS = [['luz', 'Da Luz'], ['lua', 'Da Lua'], ['guerra', 'Da guerra'], ['natureza', 'Da natureza'], ['sombra', 'Das sombras']];
  const FUNDOS = [['lago', 'Um lago'], ['cristais', 'Cristais'], ['seco', 'Seco']];
  const TAMANHOS = { pequeno: { n: 'Pequeno', W: 36, H: 28 }, medio: { n: 'Médio', W: 44, H: 34 }, grande: { n: 'Grande', W: 52, H: 40 } };
  const TERRENOS_R = [['campo', 'Campo'], ['floresta', 'Floresta'], ['areia', 'Deserto'], ['neve', 'Neve']];
  const MASMORRA = { templo: 'templo', ninho: 'covil', fossa: 'cripta', cratera: 'caverna', posto: null };
  const DIR = { s: [0, 1], n: [0, -1], o: [-1, 0], l: [1, 0] };
  const caminhoPts = (g, pts, c, fechar) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); if (fechar) g.closePath(); };
  const borda = (C, fr, x, y) => (fr === 's' ? [x, C.H + 1] : fr === 'n' ? [x, -1] : fr === 'o' ? [-1, y] : [C.W + 1, y]);
  // uma volta irregular (a bacia, a fossa): n pontos em volta de (x, y), com raio rr e a sorte de cada ponto
  const volta = (K, x, y, rr, n, var_) => { const out = []; for (let k = 0; k < n; k++) { const a = (k / n) * TAU, d = rr * (1 - (var_ || 0.12) + K.rT() * (var_ || 0.12) * 2); out.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9]); } return out; };

  /* ---- o templo de um deus ---- */
  const CULTO = {
    luz: { luz: '#ffe3a0', fx: 'sagrado', obj: ['braseiro', 'braseiro', 'vela', 'vela'], tapete: true, cor: '#e9c24a' },
    lua: { luz: '#9fc4ff', fx: 'santuario', obj: ['lanterna', 'lanterna', 'cristal', 'flores'], tapete: true, cor: '#9fb3d6' },
    guerra: { luz: '#ff9a5a', fx: null, obj: ['braseiro', 'armas', 'estandarte', 'trofeu'], tapete: false, cor: '#b5402a' },
    natureza: { luz: '#b8f0a0', fx: 'cura', obj: ['flores', 'flores', 'cogumelos', 'arbusto'], tapete: false, cor: '#6f9a48' },
    sombra: { luz: '#b06cf0', fx: 'sombra', obj: ['vela', 'vela', 'cranios', 'candelabro'], tapete: true, cor: '#5a3a7a' },
  };
  function templo(C) {
    const { K, P, W, H, tamanho } = C, r = K.r, cu = CULTO[C.culto] || CULTO.luz;
    const fr = K.pick(['s', 'n', 'o', 'l']), deitado = fr === 'n' || fr === 's';
    const [larg, prof] = { pequeno: [9, 13], medio: [11, 16], grande: [13, 19] }[tamanho];
    const w = deitado ? larg : prof, h = deitado ? prof : larg;
    const x0 = Math.round(W / 2 - w / 2), y0 = Math.round(H / 2 - h / 2);
    const E = F.eixo(fr, x0 + w / 2, y0 + h / 2), mL = larg / 2, mP = prof / 2;
    // o estilóbato inteiro e a escadaria
    const base = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
    K.marcaPoli(base, 5, true);
    K.pinta(1, 'lajes', { x: x0, y: y0, w, h, cores: C.pedra });
    P.relevo.push({ t: 'plataforma', alt: 1, k: 'rect', x: x0, y: y0, w, h });
    const esc = [E.pt(-mL + 1, -mP - 2), E.pt(mL - 1, -mP - 2), E.pt(mL - 1, -mP), E.pt(-mL + 1, -mP)];
    const ex0 = Math.min(...esc.map(p => p[0])), ey0 = Math.min(...esc.map(p => p[1])), ex1 = Math.max(...esc.map(p => p[0])), ey1 = Math.max(...esc.map(p => p[1]));
    K.marcaPoli(esc, 1, true);
    K.pinta(1, 'degraus', { x: ex0, y: ey0, w: ex1 - ex0, h: ey1 - ey0, lado: fr, n: 4, cores: C.pedra });
    P.relevo.push({ t: 'plataforma', alt: 0.5, k: 'rect', x: ex0, y: ey0, w: ex1 - ex0, h: ey1 - ey0 });
    // as colunas em volta, todas de pé
    for (let u = -mL + 1; u <= mL - 1 + 1e-6; u += 2) for (const v of [-mP + 1, mP - 1]) { const [x, y] = E.pt(u, v); F.coluna(C, x, y, 0.45, 'pe', 0); }
    for (let v = -mP + 3; v <= mP - 3 + 1e-6; v += 2) for (const u of [-mL + 1, mL - 1]) { const [x, y] = E.pt(u, v); F.coluna(C, x, y, 0.45, 'pe', 0); }
    // a cela: as paredes inteiras, com a porta de dois no meio da frente
    const cu0 = mL - 2.6, cv0 = -mP + 3.6, cv1 = mP - 2.4;
    const cela = [E.pt(-cu0, cv0), E.pt(-cu0, cv1), E.pt(cu0, cv1), E.pt(cu0, cv0)];
    K.pinta(1, 'lajes', { pts: cela, cores: C.pedra, escuro: true });
    const pA = E.pt(-1, cv0), pB = E.pt(1, cv0);
    for (const [a, b] of [[cela[3], pB], [pA, cela[0]], [cela[0], cela[1]], [cela[1], cela[2]], [cela[2], cela[3]]]) {
      P.paredes.push({ k: 'wall', x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
      K.pinta(2, 'paredeRuina', { a, b, esp: 0.55, alta: true, cores: C.pedra });
      K.marcaLinha([a, b], 0.35, 3, true);
    }
    P.paredes.push({ k: 'door', x1: pA[0], y1: pA[1], x2: pB[0], y2: pB[1] });
    // o altar e a estátua do deus no fundo; o tapete; os objetos do culto
    const giro = { s: 0, n: 180, o: 90, l: 270 }[fr];
    const [sx, sy] = E.pt(0, cv1 - 1.1); K.objeto('estatua', Math.floor(sx), Math.floor(sy), giro, v => v === 5 || v === 0 || v === 1);
    const [ax, ay] = E.pt(0, cv1 - 2.6); K.objeto('altar', Math.floor(ax), Math.floor(ay), giro, v => v === 5 || v === 0 || v === 1);
    if (cu.tapete) for (let v = cv0 + 0.6; v < cv1 - 3.2; v += 1) { const [tx, ty] = E.pt(0, v); K.objeto('tapete', Math.floor(tx), Math.floor(ty), giro, q => q === 5 || q === 0 || q === 1); }
    cu.obj.forEach((id, i) => { const [x, y] = E.pt(i % 2 ? cu0 - 1.2 : -cu0 + 1.2, cv1 - 1.4 - Math.floor(i / 2) * 2.4); K.objeto(id, Math.floor(x), Math.floor(y), giro, v => v === 5 || v === 0 || v === 1); });
    for (let v = cv0 + 1.4; v < cv1 - 4; v += 1.6) for (const u of [-cu0 + 1.6, cu0 - 1.6]) { const [x, y] = E.pt(u, v); K.objeto('banco', Math.floor(x), Math.floor(y), giro + 90, q => q === 5 || q === 0); }
    K.luz(ax, ay, 6, cu.luz, 2);
    if (cu.fx) K.zona(cu.fx, ax, ay, { r: 2.5 });
    if (C.culto === 'natureza') { const [nx, ny] = E.pt(0, (cv0 + cv1) / 2); K.arvore(nx, ny, 1.4, 'folhosa'); }
    // a cripta embaixo (a escada no canto da cela) e o jardim em volta
    { const [qx, qy] = E.pt(cu0 - 1.4, cv0 + 1.3); F.escadaQueDesce(C, Math.round(qx - 1), Math.round(qy - 1), null); }
    for (let k = 0; k < 6; k++) { const [x, y] = E.pt(r(-mL - 4, mL + 4), r(-mP - 4, mP + 4)); if (K.dentro(x, y, 2) && !(Math.abs(x - E.cx) < w / 2 + 1 && Math.abs(y - E.cy) < h / 2 + 1)) K.objetoPerto(K.pick(['flores', 'estatua', 'lanterna', 'arbusto']), x, y, 1.5); }
    const [tx, ty] = E.pt(0, -mP - 2.4), b = borda(C, fr, tx, ty);
    K.poeCaminho([b, [(b[0] + tx) / 2 + r(-2, 2), (b[1] + ty) / 2 + r(-2, 2)], [tx, ty]], 'estrada');
    P.pontos.push({ x: ax, y: ay, n: 'O altar (descanso seguro para quem é bem-vindo)' });
    P.tracado.push({ k: 'poli', pts: base });
    K.foco(E.cx, E.cy);
  }

  /* ---- o ninho de dragão ---- */
  function ninho(C) {
    const { K, P, W, H, tamanho } = C, r = K.r;
    const cx = W / 2 + r(-2, 2), cy = H / 2 + r(-1, 1), R = { pequeno: 10, medio: 13, grande: 16 }[tamanho];
    // a bacia: o paredão em volta (em quatro pedaços, com a entrada de um lado), o chão queimado dentro
    const aE = K.pick([Math.PI / 2, -Math.PI / 2, 0, Math.PI]) + r(-0.3, 0.3), gap = 0.42;
    const n = 30, anel = [];
    for (let k = 0; k <= n; k++) { const a = aE + gap + (k / n) * (TAU - 2 * gap), d = R * (0.92 + K.rT() * 0.16); anel.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85]); }
    const fora = anel.map(([x, y]) => [cx + (x - cx) * 1.35, cy + (y - cy) * 1.35]).reverse();
    K.poePenhasco(anel.concat(fora), 7, C.rocha);
    K.pinta(1, 'queimado', { x: cx, y: cy, r: R * 0.85 });
    // o ninho de ossos com os ovos, o tesouro do outro lado, as pedras grandes
    const nx = cx - Math.cos(aE) * R * 0.35, ny = cy - Math.sin(aE) * R * 0.3;
    K.pinta(2, 'ninhoOssos', { x: nx, y: ny, r: 2.6 }); K.marcaCirc(nx, ny, 2.2, 5, true);
    P.relevo.push({ t: 'plataforma', alt: 1, k: 'ell', x: nx - 2.6, y: ny - 2.6, w: 5.2, h: 5.2 });
    const tx = cx + Math.sin(aE) * R * 0.45, ty = cy - Math.cos(aE) * R * 0.4;
    K.pinta(2, 'tesouro', { x: tx, y: ty, r: 1.8 }); K.marcaCirc(tx, ty, 1.5, 5, true);
    for (let k = 0; k < 3; k++) K.objetoPerto(K.pick(['bau', 'calice', 'cranios']), tx, ty, 2.5);
    for (let k = 0; k < 5; k++) K.objetoPerto(K.pick(['ossada', 'cranios']), cx, cy, R * 0.7);
    for (let k = 0; k < 3; k++) K.pedraGrandeLivre(r(0.9, 1.5), C.rocha, (x, y) => Math.hypot(x - cx, y - cy) < R * 0.75);
    // a boca da toca, no fundo (do lado oposto da entrada): a Entrada leva ao covil
    const bx = cx - Math.cos(aE) * R * 0.86, by = cy - Math.sin(aE) * R * 0.75;
    K.pinta(3, 'bocaCaverna', { x: bx, y: by, ang: aE + Math.PI, larg: 3.4, cores: C.rocha });
    C.entrada = [Math.floor(bx + Math.cos(aE) * 0.8), Math.floor(by + Math.sin(aE) * 0.8)]; K.pos(C.entrada[0], C.entrada[1], 1);
    if (C.terreno !== 'neve') { K.luz(nx, ny, 3, '#ff8a3a', 0.5); K.pinta(2, 'brasas', { x: nx + 2.5, y: ny }); }
    // a trilha que entra pela abertura
    const ex = cx + Math.cos(aE) * R * 1.2, ey = cy + Math.sin(aE) * R * 1.05, lado = Math.abs(Math.cos(aE)) > 0.7 ? (Math.cos(aE) > 0 ? 'l' : 'o') : Math.sin(aE) > 0 ? 's' : 'n', b = borda(C, lado, ex, ey);
    K.poeCaminho([b, [ex, ey], [cx + Math.cos(aE) * R * 0.5, cy + Math.sin(aE) * R * 0.45]], 'trilha');
    P.pontos.push({ x: nx, y: ny, n: 'O ninho (os ovos)' }, { x: tx, y: ty, n: 'O tesouro do dragão' });
    P.tracado.push({ k: 'circ', x: cx, y: cy, r: R * 1.2 });
    K.foco(cx, cy);
  }

  /* ---- a fossa das almas ---- */
  function fossa(C) {
    const { K, P, W, H, tamanho } = C, r = K.r;
    const cx = W / 2, cy = H / 2, R = { pequeno: 7, medio: 9, grande: 11 }[tamanho];
    const poco = volta(K, cx, cy, R, 22, 0.1);
    K.poeAbismo(poco, -30, C.rocha);
    // a plataforma do altar no meio, a ponte estreita até a beira
    const pR = 2.2;
    K.marcaCirc(cx, cy, pR, 1, true);
    K.pinta(2, 'chaoRedondo', { x: cx, y: cy, r: pR, cores: C.pedra });
    P.relevo.push({ t: 'plataforma', alt: 0, k: 'ell', x: cx - pR, y: cy - pR, w: pR * 2, h: pR * 2 });
    const aP = K.pick([Math.PI / 2, -Math.PI / 2, 0, Math.PI]) + r(-0.2, 0.2), comp = R + 1.5 - pR;
    K.ponte(cx + Math.cos(aP) * (pR + comp / 2), cy + Math.sin(aP) * (pR + comp / 2), comp + 0.6, 1.4, aP, 'pedra', 0);
    K.objeto('altar', Math.floor(cx - 0.5), Math.floor(cy - 0.5), 0, v => v !== 7 && v !== 3);
    K.objetoPerto('grilhoes', cx, cy, 1.5, v => v !== 7 && v !== 3);
    // as correntes que somem no fundo, os obeliscos em volta, os ossos
    for (let k = 0; k < 4; k++) { const a = aP + Math.PI / 4 + (k / 4) * TAU; K.pinta(2, 'corrente', { a: [cx + Math.cos(a) * pR, cy + Math.sin(a) * pR], b: [cx + Math.cos(a) * (R + 1.5), cy + Math.sin(a) * (R + 1.5)] }); }
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + r(-0.2, 0.2), d = R + r(2.5, 4); const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.9; if (Math.abs(Math.atan2(Math.sin(a - aP), Math.cos(a - aP))) < 0.5 || !K.dentro(x, y, 2)) continue; const ret = Estilos.retangulo(x, y, 1, 1.6, r(0, TAU)); K.pinta(2, 'menir', { pts: ret, x, y, cores: C.rocha }); K.marcaPoli(ret, 3, true); K.visaoPoli(ret); }
    for (let k = 0; k < 6; k++) { const a = r(0, TAU), d = R + r(1, 5); K.pinta(2, 'ossosChao', { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: 0.8 }); }
    // os espíritos sobre o abismo e a luz roxa do fundo
    K.zona('espiritos', cx, cy, { r: R * 0.85 });
    K.luz(cx, cy, Math.round(R * 1.2), '#8a6cf0', 1);
    // a escada da cripta, na beira, do outro lado da ponte
    { const a = aP + Math.PI, x = cx + Math.cos(a) * (R + 2.5), y = cy + Math.sin(a) * (R + 2.3); if (K.dentro(x, y, 3)) F.escadaQueDesce(C, Math.round(x - 1), Math.round(y - 1), null); }
    const ex = cx + Math.cos(aP) * (R + 2), ey = cy + Math.sin(aP) * (R + 2), lado = Math.abs(Math.cos(aP)) > 0.7 ? (Math.cos(aP) > 0 ? 'l' : 'o') : Math.sin(aP) > 0 ? 's' : 'n', b = borda(C, lado, ex, ey);
    K.poeCaminho([b, [ex, ey]], 'trilha');
    P.pontos.push({ x: cx, y: cy, n: 'O altar sobre a fossa (as almas que o Vazio não recolheu)' });
    P.tracado.push({ k: 'circ', x: cx, y: cy, r: R + 1 });
    K.foco(cx, cy);
  }

  /* ---- a cratera ---- */
  function cratera(C) {
    const { K, P, W, H, tamanho } = C, r = K.r;
    const cx = W / 2 + r(-2, 2), cy = H / 2 + r(-1, 1), R = { pequeno: 9, medio: 12, grande: 15 }[tamanho];
    // a borda alta (um anel de rocha baixo, com duas passagens) e a bacia funda
    const n = 34, aG = r(0, TAU), passa = a => [aG, aG + Math.PI * r(0.8, 1.2)].some(x => Math.abs(Math.atan2(Math.sin(a - x), Math.cos(a - x))) < 0.18);
    let seg = [];
    const fechar = () => { if (seg.length > 1) { const fora = seg.map(([x, y]) => [cx + (x - cx) * 1.18, cy + (y - cy) * 1.18]).reverse(); K.poePenhasco(seg.concat(fora), 2.5, C.rocha, false); } seg = []; };
    for (let k = 0; k <= n; k++) { const a = (k / n) * TAU; if (passa(a)) { fechar(); continue; } const d = R * (0.95 + K.rT() * 0.1); seg.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85]); }
    fechar();
    K.pinta(1, 'bacia', { x: cx, y: cy, r: R * 0.95, ry: R * 0.8 });
    P.relevo.push({ t: 'fosso', alt: -3, k: 'ell', x: cx - R * 0.85, y: cy - R * 0.72, w: R * 1.7, h: R * 1.44 });
    // o fundo
    if (C.fundo === 'lago') K.poeLago(volta(K, cx, cy, R * 0.42, 16, 0.15), 'agua', -3.5);
    else if (C.fundo === 'cristais') { for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + r(-0.3, 0.3), d = r(0, R * 0.45); K.cristalGrande(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, r(0.8, 1.4), K.rT() < 0.3 ? 'negro' : 'azul'); } K.zona('cristais', cx, cy, { r: R * 0.4 }); }
    else for (let k = 0; k < 6; k++) K.pinta(1, 'craterinha', { x: cx + r(-R * 0.4, R * 0.4), y: cy + r(-R * 0.3, R * 0.3), r: r(0.8, 1.6) });
    // as pedras do impacto, espalhadas para fora
    for (let k = 0; k < 10; k++) { const a = r(0, TAU), d = R * r(1.25, 1.7), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.85; if (K.dentro(x, y, 2) && K.livreCirc(x, y, 1)) K.pedraGrande(x, y, r(0.6, 1.2), C.rocha); }
    for (let k = 0; k < 3; k++) { const a = r(0, TAU), d = r(R * 0.2, R * 0.6); K.pinta(2, 'placasMetal', { pts: F.roda(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r(0.6, 1), 5, r(0, 3)), cores: F.METAL, escuro: true }); }
    // a caverna no paredão de dentro (a Entrada)
    { const a = aG + Math.PI / 2, x = cx + Math.cos(a) * R * 0.8, y = cy + Math.sin(a) * R * 0.68; K.pinta(3, 'bocaCaverna', { x, y, ang: a, larg: 2.6, cores: C.rocha }); C.entrada = [Math.floor(x - Math.cos(a) * 0.8), Math.floor(y - Math.sin(a) * 0.8)]; K.pos(C.entrada[0], C.entrada[1], 1); }
    const ex = cx + Math.cos(aG) * R * 1.3, ey = cy + Math.sin(aG) * R * 1.1, lado = Math.abs(Math.cos(aG)) > 0.7 ? (Math.cos(aG) > 0 ? 'l' : 'o') : Math.sin(aG) > 0 ? 's' : 'n', b = borda(C, lado, ex, ey);
    K.poeCaminho([b, [ex, ey], [cx + Math.cos(aG) * R * 0.6, cy + Math.sin(aG) * R * 0.5]], 'trilha');
    P.pontos.push({ x: cx, y: cy, n: 'O fundo da cratera (o que caiu aqui?)' });
    P.tracado.push({ k: 'circ', x: cx, y: cy, r: R * 1.2 });
    K.foco(cx, cy);
  }

  /* ---- o posto de fronteira ---- */
  function posto(C) {
    const { K, P, W, H } = C, r = K.r;
    const vert = K.rT() < 0.5;                       // a estrada vai de cima para baixo (a paliçada atravessa de lado)
    const L = vert ? H : W, A = vert ? W : H, m = A / 2 + r(-2, 2), pal = L / 2 + r(-2, 2);
    const pt = (t, d) => (vert ? [m + d, t] : [t, m + d]);        // t: ao longo da estrada; d: de lado
    K.poeCaminho([pt(-1, r(-1, 1)), pt(L * 0.3, r(-0.8, 0.8)), pt(L * 0.7, r(-0.8, 0.8)), pt(L + 1, r(-1, 1))], 'estrada');
    // a paliçada de lado a lado, com o vão da estrada; a cancela é uma porta (abre e fecha)
    const vao = 2;
    const tramo = (d0, d1) => { const a = pt(pal, d0), b = pt(pal, d1); P.paredes.push({ k: 'wall', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }); K.pinta(2, 'palicadaPosto', { a, b }); K.marcaLinha([a, b], 0.3, 3, true); };
    tramo(-m - 1, -vao); tramo(vao, A - m + 1);
    const ca = pt(pal, -vao), cb = pt(pal, vao);
    P.paredes.push({ k: 'door', x1: ca[0], y1: ca[1], x2: cb[0], y2: cb[1] });
    K.pinta(2, 'cancela', { a: ca, b: cb });
    // a torre de vigia e a guarita, uma de cada lado da cancela; a casa da cobrança (o pedágio) e o estábulo
    const lado = K.rT() < 0.5 ? 1 : -1, [gx, gy] = pt(pal + 1.5, lado * (vao + 2.5)), [tx, ty] = pt(pal - 3.5, -lado * (vao + 3));
    K.predio({ tipo: 'torre', x: Math.round(tx - 1.5), y: Math.round(ty - 1.5), w: 3, h: 3, lado: vert ? (lado > 0 ? 'o' : 'l') : (lado > 0 ? 'n' : 's'), aberto: true });
    K.predio({ tipo: 'guarita', x: Math.round(gx - 1.5), y: Math.round(gy - 1.5), w: 3, h: 3, lado: vert ? (lado > 0 ? 'o' : 'l') : (lado > 0 ? 'n' : 's'), aberto: true });
    if (C.pedagio) {
      const [hx, hy] = pt(pal + 5, lado * (vao + 4));
      K.predio({ tipo: 'casa', x: Math.round(hx - 2.5), y: Math.round(hy - 2), w: vert ? 4 : 5, h: vert ? 5 : 4, lado: vert ? (lado > 0 ? 'o' : 'l') : (lado > 0 ? 'n' : 's'), aberto: true });
      const [mx, my] = pt(pal + 1.6, -lado * (vao + 0.6)); K.objeto('mesa', Math.floor(mx), Math.floor(my), 0); K.objeto('cofre', Math.floor(mx) + (vert ? 0 : 1), Math.floor(my) + (vert ? 1 : 0), 0);
      P.pontos.push({ x: mx, y: my, n: 'A mesa da cobrança (o pedágio)' });
    }
    { const [ex, ey] = pt(pal - 6, lado * (vao + 4)); K.predio({ tipo: 'estabulo', x: Math.round(ex - 3), y: Math.round(ey - 2), w: vert ? 4 : 6, h: vert ? 6 : 4, lado: vert ? (lado > 0 ? 'o' : 'l') : (lado > 0 ? 'n' : 's'), aberto: true }); }
    // o estandarte, a fogueira dos guardas, as barricadas e os barris
    { const [x, y] = pt(pal - 1.2, vao + 0.4); K.objeto('estandarte', Math.floor(x), Math.floor(y), 0); }
    { const [x, y] = pt(pal - 2.5, -lado * (vao + 6)); K.objeto('fogueira', Math.floor(x), Math.floor(y), 0); K.luz(x, y, 5, '#ffb35c', 1.5); for (let k = 0; k < 2; k++) K.objetoPerto('banco', x, y, 2); }
    for (let k = 0; k < 4; k++) { const [x, y] = pt(pal + r(-6, 6), r(-A / 3, A / 3)); K.objetoPerto(K.pick(['barril', 'caixote', 'barricada']), x, y, 1.5); }
    P.pontos.push({ x: (ca[0] + cb[0]) / 2, y: (ca[1] + cb[1]) / 2, n: 'A cancela (a fronteira)' });
    P.tracado.push({ k: 'linha', pts: [pt(pal, -m), pt(pal, A - m)], hw: 1 });
    K.foco(...pt(pal, 0));
  }

  const FAZER = { templo, ninho, fossa, cratera, posto };
  function gerar(o) {
    o = o || {};
    const tipo = TIPOS.some(t => t[0] === o.tipo) ? o.tipo : 'templo';
    const tamanho = TAMANHOS[o.tamanho] ? o.tamanho : 'medio', T = TAMANHOS[tamanho], W = T.W, H = T.H;
    const terreno = TERRENOS_R.some(t => t[0] === o.terreno) ? o.terreno : o.terreno === 'deserto' ? 'areia' : 'campo';
    const estilo = Estilos.valido(o.estilo), seed = (Math.round(Number(o.seed)) >>> 0) || 1;
    const culto = CULTOS.some(c => c[0] === o.culto) ? o.culto : 'luz', fundo = FUNDOS.some(f => f[0] === o.fundo) ? o.fundo : 'lago', pedagio = o.pedagio !== false;
    const com = { masmorra: o.masmorra !== false, mato: false };
    const sT = (MO.sub(seed, 1) % 2147483000) + 1;
    const K = MO.contexto(W, H, F.TER_DE[terreno], 'ruinas', estilo, 'trilha', sT, terreno), P = K.P;
    const C = { K, P, W, H, tipo, tamanho, terreno, estilo, seed, com, culto, fundo, pedagio, pedra: estilo === 'silk' ? F.BRANCA : F.PEDRA[terreno], rocha: F.ROCHA[terreno], entrada: null };
    P.paredes = []; P.pontos = [];
    FAZER[tipo](C);
    const entradas = [];
    if (com.masmorra && C.entrada && MASMORRA[tipo]) entradas.push({ x: C.entrada[0], y: C.entrada[1], gera: { t: 'masmorra', m: MASMORRA[tipo], n: 1, tam: tamanho, e: estilo, s: (MO.sub(sT, 70) % 2147483000) + 1 } });
    const rV = mulberry((MO.sub(seed, 2) % 2147483000) + 1);
    // (o lugar fica limpo em volta do que importa; as árvores e as pedras, mais longe)
    P.dens = (x, y) => (Math.hypot(x - P.foco[0], y - P.foco[1]) < Math.min(W, H) * 0.4 ? 0.2 : 1);
    if (terreno === 'areia') P.densBase = 0.02;
    MO.vegetacao(K, rV);
    MO.enfeites(K, rV);
    P.marcas = {};
    delete P.dens; delete P.esp;
    Estacoes.noPlano(K, o.estacao);
    return Object.assign(P, { v: 1, lugar: 'mundo116', tipo, seed, sT, tamanho, com, culto, fundo, pedagio, entradas, comMarcas: true, sitPedida: null, occ: Array.from(K.occ) });
  }

  /* ================= os desenhos ================= */
  const PR = {
    // o chão queimado (o fogo do dragão)
    queimado(g, o, c, rnd) {
      const gr = g.createRadialGradient(o.x * c, o.y * c, 0, o.x * c, o.y * c, o.r * c);
      gr.addColorStop(0, 'rgba(30,22,16,0.7)'); gr.addColorStop(0.7, 'rgba(60,42,28,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c, 0, TAU); g.fill();
      for (let k = 0; k < 30; k++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * o.r; g.globalAlpha = 0.3; g.fillStyle = rnd() < 0.5 ? '#141010' : '#4a3020'; g.beginPath(); g.ellipse((o.x + Math.cos(a) * d) * c, (o.y + Math.sin(a) * d) * c, c * (0.3 + rnd() * 0.6), c * 0.2, a, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    },
    // o ninho: o anel de ossos e galhos, os ovos no meio
    ninhoOssos(g, o, c, rnd) {
      const x = o.x * c, y = o.y * c, R = o.r * c;
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x + c * 0.2, y + c * 0.25, R, 0, TAU); g.fill();
      g.fillStyle = '#4a3a2a'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
      g.lineCap = 'round';
      for (let k = 0; k < 70; k++) { const a = rnd() * TAU, d = R * (0.55 + rnd() * 0.45), l = c * (0.4 + rnd() * 0.6), b = a + Math.PI / 2 + (rnd() - 0.5); g.strokeStyle = rnd() < 0.5 ? '#e4dcc4' : '#6a5038'; g.lineWidth = Math.max(1, c * (0.06 + rnd() * 0.06)); const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; g.beginPath(); g.moveTo(px - Math.cos(b) * l / 2, py - Math.sin(b) * l / 2); g.lineTo(px + Math.cos(b) * l / 2, py + Math.sin(b) * l / 2); g.stroke(); }
      g.fillStyle = '#2a2018'; g.beginPath(); g.arc(x, y, R * 0.5, 0, TAU); g.fill();
      const cores = ['#7a3a8a', '#3a6a8a', '#8a5a2a'];
      for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.4, d = R * 0.22, ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d; const gr = g.createRadialGradient(ex - c * 0.15, ey - c * 0.2, c * 0.05, ex, ey, c * 0.5); gr.addColorStop(0, '#f4ecd8'); gr.addColorStop(0.5, cores[k]); gr.addColorStop(1, '#1a1410'); g.fillStyle = gr; g.beginPath(); g.ellipse(ex, ey, c * 0.38, c * 0.5, a, 0, TAU); g.fill(); }
    },
    // o tesouro: o monte de moedas, as gemas e as taças
    tesouro(g, o, c, rnd) {
      const x = o.x * c, y = o.y * c, R = o.r * c;
      const gr = g.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R); gr.addColorStop(0, '#fff2a8'); gr.addColorStop(0.5, '#e0b040'); gr.addColorStop(1, '#8a6018');
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + c * 0.2, y + c * 0.25, R, R * 0.85, 0, 0, TAU); g.fill();
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, R, R * 0.85, 0, 0, TAU); g.fill();
      for (let k = 0; k < 60; k++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * R * 0.95; g.fillStyle = rnd() < 0.5 ? '#ffe680' : '#b8862a'; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, c * 0.09, 0, TAU); g.fill(); }
      for (let k = 0; k < 8; k++) { const a = rnd() * TAU, d = rnd() * R * 0.8; g.fillStyle = ['#d0302a', '#2a8ad0', '#3ac060', '#a040d0'][k % 4]; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, c * 0.1, 0, TAU); g.fill(); }
    },
    // as brasas (o fogo que ainda queima)
    brasas(g, o, c, rnd) { for (let k = 0; k < 14; k++) { const a = rnd() * TAU, d = rnd() * 0.9; g.fillStyle = rnd() < 0.5 ? '#ff8a3a' : '#c0401a'; g.beginPath(); g.arc((o.x + Math.cos(a) * d) * c, (o.y + Math.sin(a) * d) * c, c * 0.07, 0, TAU); g.fill(); } },
    // a corrente: os elos, de a até b
    corrente(g, o, c) {
      const L = Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]), n = Math.max(2, Math.round(L / 0.35)), ang = Math.atan2(o.b[1] - o.a[1], o.b[0] - o.a[0]);
      g.save(); g.strokeStyle = '#5a5e66'; g.lineWidth = Math.max(1, c * 0.05);
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, x = (o.a[0] + (o.b[0] - o.a[0]) * t) * c, y = (o.a[1] + (o.b[1] - o.a[1]) * t) * c + Math.sin(t * Math.PI) * c * 0.6; g.save(); g.translate(x, y); g.rotate(ang + (k % 2 ? Math.PI / 2 : 0) * 0.3); g.beginPath(); g.ellipse(0, 0, c * 0.17, c * 0.09, 0, 0, TAU); g.stroke(); g.restore(); }
      g.restore();
    },
    // a bacia da cratera: o anel claro da borda e o fundo escuro
    bacia(g, o, c) {
      const x = o.x * c, y = o.y * c;
      const gr = g.createRadialGradient(x, y, 0, x, y, o.r * c);
      gr.addColorStop(0, 'rgba(40,32,26,0.6)'); gr.addColorStop(0.7, 'rgba(70,58,44,0.4)'); gr.addColorStop(0.92, 'rgba(150,135,110,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.translate(x, y); g.scale(1, o.ry / o.r); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, o.r * c, 0, TAU); g.fill(); g.restore();
    },
    // a paliçada: os troncos pontudos, de a até b
    'palicadaPosto'(g, o, c) {
      const L = Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]), n = Math.max(1, Math.round(L / 0.42));
      g.save();
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, x = (o.a[0] + (o.b[0] - o.a[0]) * t) * c, y = (o.a[1] + (o.b[1] - o.a[1]) * t) * c; g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(x + c * 0.08, y + c * 0.1, c * 0.22, 0, TAU); g.fill(); g.fillStyle = k % 2 ? '#7a5532' : '#6b4a2b'; g.beginPath(); g.arc(x, y, c * 0.22, 0, TAU); g.fill(); g.fillStyle = '#c9a26b'; g.beginPath(); g.arc(x, y, c * 0.1, 0, TAU); g.fill(); }
      g.restore();
    },
    // a cancela: a trave listrada de vermelho e branco, com o contrapeso
    cancela(g, o, c) {
      const L = Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]), ang = Math.atan2(o.b[1] - o.a[1], o.b[0] - o.a[0]);
      g.save(); g.translate(o.a[0] * c, o.a[1] * c); g.rotate(ang);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(c * 0.08, -c * 0.06, L * c, c * 0.26);
      const n = Math.max(2, Math.round(L / 0.5)); for (let k = 0; k < n; k++) { g.fillStyle = k % 2 ? '#f1e2c2' : '#b5402a'; g.fillRect((k * L / n) * c, -c * 0.12, (L / n) * c + 0.5, c * 0.24); }
      g.fillStyle = '#3a2a1a'; g.beginPath(); g.arc(0, 0, c * 0.3, 0, TAU); g.fill();
      g.restore();
    },
  };
  Object.assign(MO.PINTORES, PR);

  /* ================= a cena, a prévia e o lugar ================= */
  const nomePadrao = p => (p.tipo === 'templo' ? 'Templo ' + ({ luz: 'da Luz', lua: 'da Lua', guerra: 'da guerra', natureza: 'da natureza', sombra: 'das sombras' }[p.culto] || '') : NOME[p.tipo] || 'Lugar');
  const criar = (p, nome, ex) => MO.criarPlano(p, nome, ex, nomePadrao);
  function resumo(p) {
    const partes = [(TIPOS.find(t => t[0] === p.tipo) || TIPOS[0])[1], p.W + ' × ' + p.H + ' quadrados'];
    if (p.tipo === 'templo') partes.push('culto ' + (CULTOS.find(c => c[0] === p.culto) || CULTOS[0])[1].toLowerCase());
    if (p.tipo === 'cratera') partes.push('fundo: ' + (FUNDOS.find(f => f[0] === p.fundo) || FUNDOS[0])[1].toLowerCase());
    if (p.tipo === 'posto') partes.push(p.pedagio ? 'com o pedágio' : 'sem pedágio');
    if (p.entradas && p.entradas.length) partes.push('com a entrada de baixo');
    if (p.estacao) partes.push(Estacoes.texto(p));
    return partes.join(' · ') + '.';
  }
  const lembrar = st => { const o = App.opt; o.lmTipo = st.tipo; o.lmTam = st.tamanho; o.lmTer = st.terreno; o.lmCulto = st.culto; o.lmFundo = st.fundo; o.lmPed = st.pedagio; o.lmMas = st.masmorra; };
  function padrao() {
    const o = App.opt;
    return { tipo: TIPOS.some(t => t[0] === o.lmTipo) ? o.lmTipo : 'templo', tamanho: TAMANHOS[o.lmTam] ? o.lmTam : 'medio', terreno: TERRENOS_R.some(t => t[0] === o.lmTer) ? o.lmTer : 'campo',
      culto: CULTOS.some(c => c[0] === o.lmCulto) ? o.lmCulto : 'luz', fundo: FUNDOS.some(f => f[0] === o.lmFundo) ? o.lmFundo : 'lago', pedagio: o.lmPed !== false, masmorra: o.lmMas !== false };
  }
  function controles(st, K, mudou) {
    const { field, seg, toggle } = K;
    const muda = (campo, v) => { st[campo] = v; lembrar(st); mudou(true); };
    return h('div', { class: 'ger-c' },
      field('Lugar', seg('lm-tipo', st.tipo, TIPOS.map(([k, n]) => [k, n, null, DICA[k]]), v => muda('tipo', v)), 'stack'),
      st.tipo === 'templo' ? field('O culto', seg('lm-culto', st.culto, CULTOS.map(([k, n]) => [k, n]), v => muda('culto', v)), 'stack') : null,
      st.tipo === 'cratera' ? field('O fundo', seg('lm-fundo', st.fundo, FUNDOS.map(([k, n]) => [k, n]), v => muda('fundo', v)), 'stack') : null,
      h('div', { class: 'ger-l' },
        field('Tamanho', seg('lm-tam', st.tamanho, Object.keys(TAMANHOS).map(k => [k, TAMANHOS[k].n, null, TAMANHOS[k].W + ' × ' + TAMANHOS[k].H + ' quadrados']), v => muda('tamanho', v)), 'stack'),
        field('Terreno', seg('lm-ter', st.terreno, TERRENOS_R.map(([k, n]) => [k, n]), v => muda('terreno', v)), 'stack')),
      st.tipo === 'posto' ? toggle('lm-ped', st.pedagio, v => muda('pedagio', v), 'Com o pedágio (a casa da cobrança e a mesa)') : null,
      MASMORRA[st.tipo] ? toggle('lm-mas', st.masmorra, v => muda('masmorra', v), 'A entrada de baixo (dois cliques nela geram o nível 1)') : null);
  }
  const opcoesDe = st => ({ tipo: st.tipo, tamanho: st.tamanho, terreno: st.terreno, culto: st.culto, fundo: st.fundo, pedagio: !!st.pedagio, masmorra: !!st.masmorra });
  function aplicarOpcoes(st, o) {
    if (TIPOS.some(t => t[0] === o.tipo)) st.tipo = o.tipo;
    if (TAMANHOS[o.tamanho]) st.tamanho = o.tamanho;
    if (TERRENOS_R.some(t => t[0] === o.terreno)) st.terreno = o.terreno; else if (o.terreno === 'deserto') st.terreno = 'areia';
    if (CULTOS.some(c => c[0] === o.culto)) st.culto = o.culto;
    if (FUNDOS.some(f => f[0] === o.fundo)) st.fundo = o.fundo;
    for (const k of ['pedagio', 'masmorra']) if (typeof o[k] === 'boolean') st[k] = o[k];
    lembrar(st);
  }
  const LUGAR = { aceitaEstacao: true, id: 'mundo116', n: 'Lugares do mundo', padrao, controles, opcoesDe, aplicarOpcoes, gerar: (st, comum) => gerar(Object.assign({}, st, comum)), previa: MO.previa, resumo,
    partes: () => [], parteEm: () => null, nomeDaParte: () => '', formaDaParte: () => [], travada: () => false, alternar: (p, parte, trava) => trava, quantasTravadas: () => 0, baseDe: () => null, travaDe: () => null,
    nomePadrao, criar,
    relevoTxt: 'Com relevo e formas (o estilóbato, a bacia, o abismo, o paredão)',
    dica: '"Gerar outro" sorteia outro lugar do mesmo tipo.',
    nota: 'Sai uma cena nova, com as paredes (as do templo e da paliçada; a cancela é uma porta que abre), o relevo, as luzes e as zonas. Os pontos que importam (o altar, o tesouro, a cobrança) ficam num marcador oculto, com o nome: só você vê. A entrada de baixo é um marcador de Entrada: dois cliques nele geram o nível 1.',
    feito: (sc, p) => `"${sc.name}" criada: ${resumo(p).replace(/\.$/, '')}. Tudo é editável.` };
  return { TIPOS, CULTOS, FUNDOS, gerar, resumo, criar, nomePadrao, LUGAR };
})();
