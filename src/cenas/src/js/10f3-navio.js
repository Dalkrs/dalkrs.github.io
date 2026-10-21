/* ---------------------------------------------------------------
   10f3. NAVIO — o navio como lugar (lote 7, parte 4b)
   O convés visto de cima, numa caixa de L × B quadrados: o casco (a popa reta e a proa em ponta, para a direita ou
   para a esquerda), a amurada em volta (uma mureta: deixa ver, mas não deixa passar), com as duas aberturas do
   meio, por onde se embarca; o castelo de popa (2 m acima do convés, com as escadas), o castelo de proa, os mastros
   com as velas recolhidas, o timão, a escotilha (com o marcador de Entrada oculto: dois cliques geram o porão e as
   cabines) e a carga no convés. Cada estilo tem o seu barco: a nau comum, o junco oriental, o drácar nórdico (com os
   escudos e a cabeça de dragão), o dhow desértico, o barco-cisne élfico e o couraçado anão.
   A planta de dentro (o porão, as cabines, o alojamento e a cabine do capitão) é do mesmo tamanho do convés (não
   dobra, como a das casas): o Interior usa a de cá quando o marcador é de um navio.
   --------------------------------------------------------------- */
const Navio = (() => {
  const TAU = Math.PI * 2;
  // as cores de cada estilo: o casco, o convés (três tábuas), a amurada, a vela recolhida e os enfeites
  const COR = {
    comum: { casco: '#3e2a1a', conves: ['#9a7048', '#8a6238', '#a87c52'], amurada: '#5b3f22', vela: '#e8dcc0', velaSombra: '#bfae8a', enfeite: '#c9a24a' },
    oriental: { casco: '#5a1e16', conves: ['#8a5a3a', '#7a4e32', '#966644'], amurada: '#8a2a20', vela: '#c8642a', velaSombra: '#8a3e18', enfeite: '#e0b040' },
    nordico: { casco: '#3b2716', conves: ['#8a6a44', '#7a5c3a', '#94744c'], amurada: '#4e3420', vela: '#d8ccb0', velaSombra: '#a8302a', enfeite: '#c9a24a' },
    desertico: { casco: '#6e4a2a', conves: ['#c9a46a', '#b8935a', '#d4b07a'], amurada: '#8a6238', vela: '#f1e2c2', velaSombra: '#c9b48a', enfeite: '#2f8c8c' },
    elfico: { casco: '#d8dccf', conves: ['#e3dcc6', '#d6ceb4', '#ece6d2'], amurada: '#b8c0b0', vela: '#e6efe2', velaSombra: '#9fb89a', enfeite: '#7fa860' },
    anao: { casco: '#2e3036', conves: ['#6b5a46', '#5e4e3c', '#776550'], amurada: '#4b4f57', vela: '#a8a090', velaSombra: '#6b6f78', enfeite: '#b58f4f' },
  };
  const cor = est => COR[Estilos.valido(est)] || COR.comum;

  /* ================= o convés (conta pura) ================= */
  /* O navio inteiro, já no lugar (x, y: o canto de cima, à esquerda, da caixa; L × B; proa: 'l' ou 'o'; est; seed).
     Tudo em quadrados da cena. */
  function conves(o) {
    const L = clamp(Math.round(o.L || 18), 10, 32), B = clamp(Math.round(o.B || 6), 4, 10), x0 = o.x || 0, y0 = o.y || 0, proa = o.proa === 'o' ? 'o' : 'l';
    const est = Estilos.valido(o.estilo), rnd = mulberry((Math.round(Number(o.seed)) >>> 0) || 7);
    const k = { x: x0, y: y0, w: L, h: B, forma: 'navio', proa };
    const p = Estilos.proaDe(k), esp = proa === 'o';
    // ao longo do navio: u vai da popa (0) até a ponta da proa (L); v, de um lado ao outro (0 a B)
    const X = u => (esp ? x0 + L - u : x0 + u), Y = v => y0 + v;
    const ret = (u0, u1, v0, v1) => ({ x: Math.min(X(u0), X(u1)), y: Y(v0), w: Math.abs(u1 - u0), h: v1 - v0 });
    const drakar = est === 'nordico';
    // o castelo de popa (no drácar não tem: o convés é um só, com os bancos dos remos)
    const cp = drakar ? 0 : clamp(Math.round(L * 0.2), 3, 6);
    const castelo = cp ? ret(0, cp, 0, B) : null;
    // as escadas do castelo (dos dois lados, junto da amurada) e a borda dele (parede de janela, com os vãos das escadas)
    const escadas = cp ? [{ u: cp, v0: 0.6, v1: 1.6 }, { u: cp, v0: B - 1.6, v1: B - 0.6 }] : [];
    // o castelo de proa: um estrado baixo na ponta
    const pp = drakar ? 0 : Math.min(p + 1, Math.round(L * 0.18));
    // os mastros (dois, ou três no navio comprido; um no drácar e no dhow)
    const us = drakar || est === 'desertico' ? [L * 0.48] : L >= 18 ? [L * 0.3, L * 0.52, L * 0.72] : [L * 0.36, L * 0.64];
    const mastros = us.map((u, i) => ({ x: X(u), y: Y(B / 2), r: i === Math.floor(us.length / 2) ? 0.42 : 0.34, u }));
    // a escotilha: entre os mastros do meio (2 × 2), longe deles
    const uEsc = us.length >= 2 ? (us[0] + us[1]) / 2 : us[0] - 2.4;
    const escotilha = ret(Math.round(uEsc) - 1, Math.round(uEsc) + 1, Math.round(B / 2) - 1, Math.round(B / 2) + 1);
    // as duas aberturas da amurada, no meio do navio (por onde se embarca: a prancha, a escada de corda)
    const uAb = Math.round(L * 0.44), abertura = { u0: uAb - 0.5, u1: uAb + 0.5 };
    // a amurada: os lados do casco, como mureta, menos as aberturas do meio
    const amurada = [];
    for (const s of Estilos.lados(k)) {
      if ((s.lado === 'n' || s.lado === 's')) {
        const a = Math.min(s.x1, s.x2), b = Math.max(s.x1, s.x2), ga = Math.min(X(abertura.u0), X(abertura.u1)), gb = Math.max(X(abertura.u0), X(abertura.u1));
        if (ga > a) amurada.push({ x1: a, y1: s.y1, x2: Math.min(ga, b), y2: s.y1 });
        if (gb < b) amurada.push({ x1: Math.max(gb, a), y1: s.y1, x2: b, y2: s.y1 });
      } else amurada.push({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 });
    }
    // a borda do castelo de popa (2 m acima do convés): mureta, com os vãos das escadas
    const bordas = [];
    if (cp) {
      let v = 0;
      for (const e of escadas) { if (e.v0 > v) bordas.push({ x1: X(cp), y1: Y(v), x2: X(cp), y2: Y(e.v0) }); v = e.v1; }
      if (v < B) bordas.push({ x1: X(cp), y1: Y(v), x2: X(cp), y2: Y(B) });
    }
    // o relevo: o castelo de popa (2 m) e o de proa (1 m) acima do convés
    const relevo = [];
    if (castelo) relevo.push({ t: 'plataforma', alt: 2, k: 'rect', x: castelo.x + 0.1, y: castelo.y + 0.1, w: castelo.w - 0.2, h: castelo.h - 0.2 });
    if (pp) { const u0 = L - pp; relevo.push({ t: 'plataforma', alt: 1, k: 'poly', pts: [[X(u0), Y(0.35)], [X(L - p), Y(0.35)], [X(L - 0.4), Y(B / 2)], [X(L - p), Y(B - 0.35)], [X(u0), Y(B - 0.35)]] }); }
    // a carga no convés (objetos): barris e caixotes junto dos mastros, as lanternas da popa
    const objetos = [], cheio = new Set();
    const livre = (i, j) => !cheio.has(i + ',' + j);
    const poe = (id, u, v, rot) => { const i = Math.floor(X(u)), j = Math.floor(Y(v)); if (!livre(i, j)) return; cheio.add(i + ',' + j); objetos.push({ id, x: i, y: j, s: 1, rot: rot || 0 }); };
    for (let jj = Math.floor(escotilha.y); jj < escotilha.y + escotilha.h; jj++) for (let ii = Math.floor(escotilha.x); ii < escotilha.x + escotilha.w; ii++) cheio.add(ii + ',' + jj);
    for (const m of mastros) cheio.add(Math.floor(m.x) + ',' + Math.floor(m.y));
    const carga = ['barril', 'caixote', 'barril', 'caixote', 'barril'];
    for (let i = 0; i < carga.length; i++) {
      const m = mastros[i % mastros.length], lado = i % 2 ? 1 : -1;
      poe(carga[i], m.u + (rnd() < 0.5 ? -1.2 : 1.2), B / 2 + lado * (1.2 + rnd() * 0.8));
    }
    if (cp) { poe(est === 'oriental' ? 'lanterna' : 'lampiao', 1.5, 0.6); poe(est === 'oriental' ? 'lanterna' : 'lampiao', 1.5, B - 0.6); }
    // o marcador de Entrada, na escotilha (dois cliques geram o porão e as cabines)
    const entrada = { x: escotilha.x + escotilha.w / 2 - 0.5, y: escotilha.y + escotilha.h / 2 - 0.5, gera: { t: 'navio', w: L, h: B, p: proa, e: est, s: (Math.round(Number(o.seed)) >>> 0) || 7, f: 'navio' } };
    // o timão: no castelo, junto da borda
    const timao = cp ? { x: X(cp - 0.9), y: Y(B / 2) } : { x: X(0.9), y: Y(B / 2) };
    return { L, B, x: x0, y: y0, proa, estilo: est, p, k, casco: Estilos.contorno(k), castelo, escadas: escadas.map(e => ({ x: X(e.u), y0: Y(e.v0), y1: Y(e.v1) })), pp, mastros, escotilha, abertura: { x: X(uAb), u: uAb },
      amurada, bordas, relevo, objetos, entrada, timao, uX: X, vY: Y };
  }
  // o navio vira paredes (de mureta: a amurada não tapa a visão, mas não deixa passar) — [{ k, x1, y1, x2, y2 }], em quadrados
  const paredes = n => n.amurada.map(s => Object.assign({ k: 'mureta' }, s)).concat(n.bordas.map(s => Object.assign({ k: 'mureta' }, s)));

  /* ================= o desenho do convés ================= */
  function pintar(g, n, c, rnd, op) {
    op = op || {};
    const C = cor(n.estilo), est = n.estilo, X = n.uX, Y = n.vY, L = n.L, B = n.B;
    const caminho = (pts, dx, dy) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo((x + (dx || 0)) * c, (y + (dy || 0)) * c) : g.moveTo((x + (dx || 0)) * c, (y + (dy || 0)) * c))); g.closePath(); };
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    // a sombra do casco na água e a espuma em volta
    if (!op.semAgua) {
      g.globalAlpha = 0.35; g.fillStyle = '#05121c'; caminho(n.casco, 0.35, 0.5); g.fill();
      g.globalAlpha = 0.45; g.strokeStyle = '#eaf6fb'; g.lineWidth = c * 0.25; caminho(n.casco); g.stroke();
      g.globalAlpha = 1;
    }
    // o casco (a borda escura) e o convés por dentro
    caminho(n.casco); g.fillStyle = C.casco; g.fill();
    const dentro = Paisagem.encolher(n.casco, 1 - 0.55 / Math.min(L, B * 2));
    g.save(); caminho(dentro); g.clip();
    // as tábuas do convés, no sentido do comprimento
    for (let j = 0; j < B * 3; j++) {
      let u = -rnd() * 2;
      while (u < L) { const l = 1.4 + rnd() * 2.4; g.fillStyle = C.conves[Math.floor(rnd() * 3)]; const x1 = Math.min(X(u), X(u + l)), w = Math.abs(X(u + l) - X(u)); g.fillRect(x1 * c + 1, (n.y + j / 3) * c + 1, w * c - 2, c / 3 - 2); u += l; }
    }
    // a sombra da amurada por dentro
    g.globalAlpha = 0.35; g.strokeStyle = '#000'; g.lineWidth = c * 0.5; caminho(dentro); g.stroke(); g.globalAlpha = 1;
    if (est === 'anao') {
      // as chapas de ferro rebitadas
      g.globalAlpha = 0.55; g.strokeStyle = '#3a3d44'; g.lineWidth = Math.max(1, c * 0.06);
      for (let u = 2; u < L - n.p; u += 2.5) { g.beginPath(); g.moveTo(X(u) * c, n.y * c); g.lineTo(X(u) * c, (n.y + B) * c); g.stroke(); }
      g.globalAlpha = 0.8; g.fillStyle = '#8a8f99'; for (let u = 1; u < L - n.p; u += 0.6) for (const v of [0.45, B - 0.45]) { g.beginPath(); g.arc(X(u) * c, Y(v) * c, Math.max(0.8, c * 0.04), 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    }
    // o castelo de popa: mais claro, com a borda e as escadas
    if (n.castelo) {
      const k = n.castelo;
      g.globalAlpha = 0.4; g.fillStyle = '#000'; g.fillRect((esp(n) ? k.x - 0.35 : k.x + k.w) * c, k.y * c, 0.35 * c, k.h * c); g.globalAlpha = 1;
      for (let j = 0; j < B * 3; j++) { g.fillStyle = Estilos.tom(C.conves[j % 3], 0.1); g.fillRect(k.x * c + 1, (k.y + j / 3) * c + 1, k.w * c - 2, c / 3 - 2); }
      for (const e of n.escadas) { const x1 = esp(n) ? e.x - 0.9 : e.x; for (let s = 0; s < 3; s++) { g.fillStyle = s % 2 ? C.conves[1] : C.conves[2]; g.fillRect((x1 + s * 0.3) * c, e.y0 * c, 0.28 * c, (e.y1 - e.y0) * c); } }
      g.strokeStyle = C.amurada; g.lineWidth = c * 0.14;
      for (const b of n.bordas) { g.beginPath(); g.moveTo(b.x1 * c, b.y1 * c); g.lineTo(b.x2 * c, b.y2 * c); g.stroke(); }
      // o timão
      const t = n.timao, R = c * 0.42;
      g.strokeStyle = '#3b2716'; g.lineWidth = c * 0.08; g.beginPath(); g.arc(t.x * c, t.y * c, R, 0, TAU); g.stroke();
      g.lineWidth = c * 0.05; for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU; g.beginPath(); g.moveTo(t.x * c, t.y * c); g.lineTo(t.x * c + Math.cos(an) * R * 1.25, t.y * c + Math.sin(an) * R * 1.25); g.stroke(); }
      g.fillStyle = C.enfeite; g.beginPath(); g.arc(t.x * c, t.y * c, R * 0.25, 0, TAU); g.fill();
    }
    // o castelo de proa
    if (n.pp) {
      const u0 = L - n.pp;
      g.fillStyle = Estilos.tom(C.conves[0], 0.08); g.beginPath(); g.moveTo(X(u0) * c, Y(0.35) * c); g.lineTo(X(L - n.p) * c, Y(0.35) * c); g.lineTo(X(L - 0.4) * c, Y(B / 2) * c); g.lineTo(X(L - n.p) * c, Y(B - 0.35) * c); g.lineTo(X(u0) * c, Y(B - 0.35) * c); g.closePath(); g.fill();
      g.strokeStyle = C.amurada; g.lineWidth = c * 0.1; g.beginPath(); g.moveTo(X(u0) * c, Y(0.35) * c); g.lineTo(X(u0) * c, Y(B - 0.35) * c); g.stroke();
    }
    // a escotilha: a grade
    { const k = n.escotilha; g.fillStyle = '#2a1e12'; g.fillRect(k.x * c, k.y * c, k.w * c, k.h * c); g.strokeStyle = C.conves[2]; g.lineWidth = Math.max(1, c * 0.08); for (let t = 0.25; t < 1; t += 0.25) { g.beginPath(); g.moveTo((k.x + k.w * t) * c, k.y * c); g.lineTo((k.x + k.w * t) * c, (k.y + k.h) * c); g.stroke(); g.beginPath(); g.moveTo(k.x * c, (k.y + k.h * t) * c); g.lineTo((k.x + k.w) * c, (k.y + k.h * t) * c); g.stroke(); } g.strokeStyle = C.amurada; g.lineWidth = c * 0.1; g.strokeRect(k.x * c, k.y * c, k.w * c, k.h * c); }
    // os bancos dos remos do drácar
    if (est === 'nordico') { g.fillStyle = C.conves[1]; for (let u = 2.2; u < L - n.p - 0.5; u += 1.6) g.fillRect(X(u) * c - c * 0.12, Y(0.5) * c, c * 0.24, (B - 1) * c); }
    g.restore();
    // a amurada: a borda clara por cima do casco (menos as aberturas)
    g.strokeStyle = C.amurada; g.lineWidth = c * 0.16;
    for (const s of n.amurada) { g.beginPath(); g.moveTo(s.x1 * c, s.y1 * c); g.lineTo(s.x2 * c, s.y2 * c); g.stroke(); }
    g.strokeStyle = Estilos.tom(C.amurada, 0.3); g.lineWidth = c * 0.05;
    for (const s of n.amurada) { g.beginPath(); g.moveTo(s.x1 * c, s.y1 * c); g.lineTo(s.x2 * c, s.y2 * c); g.stroke(); }
    // os enfeites do estilo, por fora: os escudos e os remos do drácar, os olhos do junco, o pescoço do cisne
    if (est === 'nordico') {
      const cores = ['#a8302a', '#f1e2c2', '#2f5a8c', '#c9a24a'];
      for (let u = 2; u < L - n.p; u += 1.1) for (const v of [0, B]) { g.fillStyle = cores[Math.floor(u * 7 + v) % cores.length]; g.beginPath(); g.arc(X(u) * c, Y(v) * c, c * 0.32, 0, TAU); g.fill(); g.strokeStyle = '#2e1f10'; g.lineWidth = Math.max(1, c * 0.05); g.stroke(); g.fillStyle = '#8a8f99'; g.beginPath(); g.arc(X(u) * c, Y(v) * c, c * 0.08, 0, TAU); g.fill(); }
      if (!op.semRemos) { g.strokeStyle = '#7a5532'; g.lineWidth = c * 0.09; for (let u = 2.2; u < L - n.p - 0.5; u += 1.6) for (const s of [-1, 1]) { const v = s < 0 ? 0 : B; g.beginPath(); g.moveTo(X(u) * c, Y(v) * c); g.lineTo(X(u - 0.6) * c, Y(v + s * 1.6) * c); g.stroke(); } }
      // a cabeça de dragão na proa e a cauda na popa
      const tip = [X(L), Y(B / 2)], dir = esp(n) ? -1 : 1;
      g.fillStyle = '#4e3420'; g.beginPath(); g.moveTo(tip[0] * c, (tip[1] - 0.35) * c); g.quadraticCurveTo((tip[0] + dir * 0.9) * c, (tip[1] - 0.9) * c, (tip[0] + dir * 1.4) * c, (tip[1] - 0.2) * c); g.lineTo((tip[0] + dir * 1.0) * c, (tip[1] + 0.05) * c); g.quadraticCurveTo((tip[0] + dir * 0.6) * c, (tip[1] + 0.4) * c, tip[0] * c, (tip[1] + 0.3) * c); g.closePath(); g.fill();
      g.fillStyle = '#e0b040'; g.beginPath(); g.arc((tip[0] + dir * 1.05) * c, (tip[1] - 0.35) * c, c * 0.08, 0, TAU); g.fill();
    } else if (est === 'oriental') {
      for (const s of [-1, 1]) { const ex = X(L - n.p * 0.55), ey = Y(B / 2 + s * B * 0.22); g.fillStyle = '#f4efe3'; g.beginPath(); g.arc(ex * c, ey * c, c * 0.28, 0, TAU); g.fill(); g.fillStyle = '#1d1715'; g.beginPath(); g.arc(ex * c, ey * c, c * 0.14, 0, TAU); g.fill(); }
    } else if (est === 'elfico') {
      const tip = [X(L), Y(B / 2)], dir = esp(n) ? -1 : 1;
      g.strokeStyle = '#e8ece2'; g.lineWidth = c * 0.32; g.beginPath(); g.moveTo(tip[0] * c, tip[1] * c); g.quadraticCurveTo((tip[0] + dir * 1.4) * c, (tip[1] - 0.2) * c, (tip[0] + dir * 1.0) * c, (tip[1] - 1.0) * c); g.stroke();
      g.fillStyle = '#e8ece2'; g.beginPath(); g.ellipse((tip[0] + dir * 0.85) * c, (tip[1] - 1.1) * c, c * 0.3, c * 0.2, 0, 0, TAU); g.fill();
      g.fillStyle = '#d9a23a'; g.beginPath(); g.arc((tip[0] + dir * 0.55) * c, (tip[1] - 1.12) * c, c * 0.08, 0, TAU); g.fill();
    }
    // o gurupés (o mastro deitado da proa), fora do drácar e do cisne
    if (est !== 'nordico' && est !== 'elfico') { const tip = [X(L), Y(B / 2)], dir = esp(n) ? -1 : 1; g.strokeStyle = '#4e3420'; g.lineWidth = c * 0.14; g.beginPath(); g.moveTo(X(L - n.p * 0.6) * c, tip[1] * c); g.lineTo((tip[0] + dir * 2.2) * c, tip[1] * c); g.stroke(); }
    // os mastros, as vergas e as velas recolhidas (nas vergas)
    for (const m of n.mastros) {
      const larg = est === 'nordico' ? B * 1.25 : B * 1.15;
      if (est === 'desertico') {
        // a verga do dhow vai em diagonal, com a vela latina recolhida
        g.strokeStyle = '#4e3420'; g.lineWidth = c * 0.14; const a = esp(n) ? -0.5 : 0.5, l = L * 0.42;
        g.beginPath(); g.moveTo(m.x * c - Math.cos(a) * l * c / 2, m.y * c - Math.sin(a) * l * c / 2); g.lineTo(m.x * c + Math.cos(a) * l * c / 2, m.y * c + Math.sin(a) * l * c / 2); g.stroke();
        g.strokeStyle = C.vela; g.lineWidth = c * 0.3; g.beginPath(); g.moveTo(m.x * c - Math.cos(a) * l * c * 0.4, m.y * c - Math.sin(a) * l * c * 0.4); g.lineTo(m.x * c + Math.cos(a) * l * c * 0.45, m.y * c + Math.sin(a) * l * c * 0.45); g.stroke();
      } else {
        g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect((m.x - 0.15) * c + c * 0.25, (m.y - larg / 2) * c + c * 0.3, c * 0.5, larg * c); g.globalAlpha = 1;
        g.fillStyle = '#4e3420'; g.fillRect((m.x - 0.09) * c, (m.y - larg / 2) * c, c * 0.18, larg * c);
        // a vela enrolada (no junco, as ripas; no drácar, listrada)
        const vw = est === 'oriental' ? 0.55 : 0.4;
        g.fillStyle = C.vela; g.fillRect((m.x - vw / 2) * c, (m.y - larg * 0.42) * c, vw * c, larg * 0.84 * c);
        g.fillStyle = C.velaSombra;
        if (est === 'nordico') for (let t = 0; t < 8; t += 2) g.fillRect((m.x - vw / 2) * c, (m.y - larg * 0.42 + (t / 8) * larg * 0.84) * c, vw * c, larg * 0.84 / 8 * c);
        else if (est === 'oriental') for (let t = 1; t < 7; t++) g.fillRect((m.x - vw / 2) * c, (m.y - larg * 0.42 + (t / 7) * larg * 0.84) * c - 1, vw * c, Math.max(1, c * 0.05));
        else g.fillRect((m.x - vw / 2) * c, (m.y - larg * 0.42) * c, vw * 0.35 * c, larg * 0.84 * c);
        g.strokeStyle = '#2e1f10'; g.lineWidth = Math.max(1, c * 0.03); for (let t = 1; t < 5; t++) { const yy = (m.y - larg * 0.42 + (t / 5) * larg * 0.84) * c; g.beginPath(); g.moveTo((m.x - vw / 2) * c, yy); g.lineTo((m.x + vw / 2) * c, yy); g.stroke(); }
      }
      // o mastro (o círculo) e os cabos até a amurada
      g.strokeStyle = 'rgba(40,28,16,0.6)'; g.lineWidth = Math.max(1, c * 0.025);
      for (const v of [0.1, B - 0.1]) for (const du of [-0.9, 0.9]) { g.beginPath(); g.moveTo(m.x * c, m.y * c); g.lineTo(X(m.u + du) * c, Y(v) * c); g.stroke(); }
      g.fillStyle = '#3b2716'; g.beginPath(); g.arc(m.x * c, m.y * c, m.r * c, 0, TAU); g.fill();
      g.fillStyle = '#6b4a2b'; g.beginPath(); g.arc(m.x * c - m.r * c * 0.25, m.y * c - m.r * c * 0.25, m.r * c * 0.45, 0, TAU); g.fill();
    }
    // a borda do casco por fora
    g.strokeStyle = 'rgba(15,10,6,0.85)'; g.lineWidth = Math.max(1.5, c * 0.06); caminho(n.casco); g.stroke();
    // o naufrágio: os rombos no convés, o mastro caído por cima da amurada e o mar entrando pelo lado de fora
    if (op.danificado) {
      const d = op.danificado;
      g.save(); caminho(n.casco); g.clip();
      for (let i = 0; i < 4; i++) { const hx = X(L * (0.2 + rnd() * 0.6)), hy = Y(B * (0.25 + rnd() * 0.5)); g.fillStyle = 'rgba(12,16,20,0.85)'; g.beginPath(); for (let k = 0; k < 7; k++) { const an = (k / 7) * TAU, rr = c * (0.35 + rnd() * 0.45); const px = hx * c + Math.cos(an) * rr, py = hy * c + Math.sin(an) * rr * 0.7; if (k) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); g.fill(); }
      // (lote 13, parte 13b: no encalhado na areia, d.chao — [a cor de fora, a mesma sem nada] — é a areia que entra)
      const mar = g.createLinearGradient(0, (d.mar === 'n' ? n.y : n.y + B) * c, 0, (n.y + B / 2) * c), cm = d.chao || ['rgba(29,74,107,0.85)', 'rgba(29,74,107,0)'];
      mar.addColorStop(0, cm[0]); mar.addColorStop(1, cm[1]);
      g.fillStyle = mar; g.fillRect(n.x * c, n.y * c, L * c, B * c);
      g.restore();
      const m = n.mastros[Math.floor(n.mastros.length / 2)] || n.mastros[0];
      if (m) { const ang = d.mar === 'n' ? -0.9 : 0.9, l = B * 1.6; g.globalAlpha = 0.35; g.strokeStyle = '#000'; g.lineWidth = c * 0.5; g.beginPath(); g.moveTo(m.x * c + c * 0.2, m.y * c + c * 0.3); g.lineTo((m.x + Math.cos(ang) * l) * c + c * 0.2, (m.y + Math.sin(ang) * l) * c + c * 0.3); g.stroke(); g.globalAlpha = 1; g.strokeStyle = '#4e3420'; g.lineWidth = c * 0.36; g.beginPath(); g.moveTo(m.x * c, m.y * c); g.lineTo((m.x + Math.cos(ang) * l) * c, (m.y + Math.sin(ang) * l) * c); g.stroke(); g.fillStyle = 'rgba(232,220,192,0.8)'; g.beginPath(); g.ellipse((m.x + Math.cos(ang) * l * 0.7) * c, (m.y + Math.sin(ang) * l * 0.7) * c, c * 1.1, c * 0.5, ang, 0, TAU); g.fill(); }
    }
    g.restore();
  }
  const esp = n => n.proa === 'o';

  /* ================= a planta de dentro ================= */
  /* O porão e as cabines, do tamanho do convés (o: { w: L, h: B, p: o lado da proa, estilo, seed }): da popa para a
     proa, a cabine do capitão (com as janelas da popa), as duas cabines pequenas, o porão de carga (com a escada da
     escotilha: a Saída fica nela), o alojamento da tripulação e o paiol da proa. Uma porta em cada divisão; vigias
     nos lados das cabines e do alojamento; a carga e os móveis de cada sala. O formato é o mesmo da planta das casas. */
  function planta(o) {
    o = o || {};
    const W = clamp(Math.round(Number(o.w) || 18), 10, 32), H = clamp(Math.round(Number(o.h) || 6), 4, 10), est = Estilos.valido(o.estilo), proa = o.p === 'o' ? 'o' : 'l';
    const seed = (Math.round(Number(o.seed)) >>> 0) || 1, rnd = mulberry(seed ^ 0x2545f491);
    const k = { x: 0, y: 0, w: W, h: H, forma: 'navio', proa }, p = Estilos.proaDe(k), esp2 = proa === 'o';
    // tudo é feito com a proa à direita e espelhado no fim, se ela for à esquerda
    const Lr = W - p;                                              // a parte reta do casco
    const cap = clamp(Math.round(Lr * 0.22), 3, 6), cab = clamp(Math.round(Lr * 0.18), 2, 4), alo = clamp(Math.round(Lr * 0.22), 2, 6);
    const por = Math.max(3, Lr - cap - cab - alo);
    const xs = [0, cap, cap + cab, cap + cab + por, Lr];          // as divisões (o paiol é a ponta, depois de Lr)
    const meio = Math.floor(H / 2);
    const salas = [
      { x: xs[0], y: 0, w: cap, h: H, papel: 'capitao' },
      { x: xs[1], y: 0, w: cab, h: meio, papel: 'cabine' },
      { x: xs[1], y: meio, w: cab, h: H - meio, papel: 'cabine' },
      { x: xs[2], y: 0, w: por, h: H, papel: 'porao' },
      { x: xs[3], y: 0, w: Lr - xs[3], h: H, papel: 'alojamento' },
      { x: Lr, y: 0, w: p, h: H, papel: 'paiol' },
    ].filter(q => q.w > 0 && q.h > 0);
    // as paredes de dentro, com a porta (no meio do casco, salvo nas cabines, cada uma com a sua)
    const paredes = [];
    const parede = (x1, y1, x2, y2, pd) => paredes.push({ x1, y1, x2, y2, porta: pd });
    const pv = clamp(meio - 1 + Math.floor(rnd() * 2), 1, H - 2);
    parede(xs[1], 0, xs[1], meio, { x1: xs[1], y1: Math.max(0, meio - 1), x2: xs[1], y2: meio });          // capitão → a cabine de cima
    parede(xs[1], meio, xs[1], H, { x1: xs[1], y1: meio, x2: xs[1], y2: meio + 1 });                        // capitão → a de baixo
    parede(xs[1], meio, xs[2], meio, { x1: xs[1] + Math.floor(cab / 2), y1: meio, x2: xs[1] + Math.floor(cab / 2) + 1, y2: meio });  // (entre as duas cabines, a porta do meio)
    parede(xs[2], 0, xs[2], meio, { x1: xs[2], y1: Math.max(0, meio - 1), x2: xs[2], y2: meio });
    parede(xs[2], meio, xs[2], H, { x1: xs[2], y1: meio, x2: xs[2], y2: meio + 1 });
    parede(xs[3], 0, xs[3], H, { x1: xs[3], y1: pv, x2: xs[3], y2: pv + 1 });
    parede(Lr, 0, Lr, H, { x1: Lr, y1: pv, x2: Lr, y2: pv + 1 });
    // as janelas: as da popa (na cabine do capitão) e as vigias das cabines e do alojamento
    const janelas = [];
    if (H >= 5) { janelas.push({ lado: 'o', x1: 0, y1: 1, x2: 0, y2: 2 }, { lado: 'o', x1: 0, y1: H - 2, x2: 0, y2: H - 1 }); }
    for (const q of salas) if ((q.papel === 'cabine' || q.papel === 'alojamento') && q.w >= 2) {
      const xm = q.x + Math.floor(q.w / 2), lado = q.y === 0 ? 'n' : 's', yy = lado === 'n' ? 0 : H;
      if (xm > 1 && xm + 1 < Lr) janelas.push({ lado, x1: xm, y1: yy, x2: xm + 1, y2: yy });
      if (q.papel === 'alojamento' && xm + 1 < Lr) janelas.push({ lado: 's', x1: xm, y1: H, x2: xm + 1, y2: H });
    }
    // o que fica fora do casco (a ponta da proa e os cantos da popa) e as passagens das portas
    const dentro = (i, j) => { if (i < 0 || j < 0 || i >= W || j >= H) return false; if (i === 0 && (j === 0 || j === H - 1)) return false; if (i < Lr) return true; const t = (W - (i + 0.5)) / p; return Math.abs(j + 0.5 - H / 2) <= (H / 2) * t - 0.35; };
    const passa = new Set();
    for (const pw of paredes) { const d = pw.porta; if (d.x1 === d.x2) { passa.add((d.x1 - 1) + ',' + d.y1); passa.add(d.x1 + ',' + d.y1); } else { passa.add(d.x1 + ',' + (d.y1 - 1)); passa.add(d.x1 + ',' + d.y1); } }
    // a escada da escotilha: no meio do porão (a Saída fica nela)
    const entra = [xs[2] + Math.floor(por / 2), meio];
    passa.add(entra.join(',')); passa.add((entra[0] + 1) + ',' + entra[1]); passa.add(entra[0] + ',' + (entra[1] - 1));
    const MOV = {
      capitao: ['tapete', 'mesa', 'cadeira', 'cadeira', 'cama', 'estante', 'bau', 'lampiao'],
      cabine: ['cama', 'bau'],
      porao: ['caixote', 'barril', 'caixote', 'barril', 'caixote', 'jarro', 'barril', 'caixote', 'lampiao', 'caixote', 'barril'],
      alojamento: ['cama', 'cama', 'cama', 'cama', 'bau', 'bau', 'lampiao'],
      paiol: ['barril', 'caixote', 'barril'],
    };
    const TROCA = { oriental: { lampiao: 'lanterna', cadeira: 'almofada' }, desertico: { cadeira: 'almofada' } }[est] || {};
    const ocup = new Set(), sob = new Set();
    for (const q of salas) {
      q.moveis = [];
      const livre = (i, j, tap) => i >= q.x && j >= q.y && i < q.x + q.w && j < q.y + q.h && dentro(i, j) && !passa.has(i + ',' + j) && !ocup.has(i + ',' + j) && !(tap && sob.has(i + ',' + j));
      const livreS = (i, j, s, tap) => { for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) if (!livre(i + a, j + b, tap)) return false; return true; };
      const beira = (i, j, s) => Math.min(i - q.x, j - q.y, q.x + q.w - s - i, q.y + q.h - s - j);
      const cx = q.x + q.w / 2, cy = q.y + q.h / 2;
      for (const id0 of MOV[q.papel] || []) {
        const id = TROCA[id0] || id0;
        if (!Props.P[id]) continue;
        const s = Props.P[id].size || 1, tap = id === 'tapete', l = [];
        for (let j = q.y; j + s <= q.y + q.h; j++) for (let i = q.x; i + s <= q.x + q.w; i++) if (livreS(i, j, s, tap)) l.push([i, j]);
        if (!l.length) continue;
        let esc;
        if (id === 'mesa' || tap) esc = l.slice().sort((a, b) => Math.hypot(a[0] + s / 2 - cx, a[1] + s / 2 - cy) - Math.hypot(b[0] + s / 2 - cx, b[1] + s / 2 - cy))[0];
        else if (id === 'cadeira' || id === 'almofada') {
          const m = q.moveis.find(x => x.id === 'mesa');
          const junto = m ? l.filter(([i, j]) => (i + 1 === m.x || i === m.x + m.s) && j >= m.y && j < m.y + m.s || (j + 1 === m.y || j === m.y + m.s) && i >= m.x && i < m.x + m.s) : [];
          esc = junto.length ? junto[Math.floor(rnd() * junto.length) % junto.length] : l[0];
        } else { const rente = l.filter(([i, j]) => beira(i, j, s) === 0), pool = rente.length ? rente : l; esc = pool[Math.floor(rnd() * pool.length) % pool.length]; }
        for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) (tap ? sob : ocup).add((esc[0] + a) + ',' + (esc[1] + b));
        const m = { id, x: esc[0], y: esc[1], s };
        if (id === 'cama' || id === 'estante') { const b = [esc[1] - q.y, q.y + q.h - s - esc[1], esc[0] - q.x, q.x + q.w - s - esc[0]], k2 = b.indexOf(Math.min(...b)); m.rot = [0, 180, 270, 90][k2]; }
        if (id === 'cadeira' || id === 'almofada') { const mm = q.moveis.find(x => x.id === 'mesa'); if (mm) { const dx = esc[0] + 0.5 - (mm.x + mm.s / 2), dy = esc[1] + 0.5 - (mm.y + mm.s / 2); m.rot = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 270 : 90) : (dy < 0 ? 0 : 180); } }
        q.moveis.push(m);
      }
    }
    // os feixes de luz que entram pelas janelas da popa e pelas vigias
    const luzes = [];
    for (const jn of janelas) {
      const di = jn.lado === 'o' ? 1 : jn.lado === 'l' ? -1 : 0, dj = jn.lado === 'n' ? 1 : jn.lado === 's' ? -1 : 0, Lz = 2.4, A = [jn.x1, jn.y1], Bq = [jn.x2, jn.y2], lx = Bq[0] - A[0], ly = Bq[1] - A[1];
      luzes.push({ pts: [A, Bq, [Bq[0] + di * Lz + lx * 0.5, Bq[1] + dj * Lz + ly * 0.5], [A[0] + di * Lz - lx * 0.5, A[1] + dj * Lz - ly * 0.5]] });
    }
    // as cordas enroladas no porão (formas) e a escada de mão da escotilha
    const formas = [{ k: 'rect', x: entra[0] + 0.15, y: entra[1] + 0.05, w: 0.7, h: 0.9, f: null, s: '#3b2716', sw: 0.08 }, { k: 'free', pts: [[entra[0] + 0.15, entra[1] + 0.35], [entra[0] + 0.85, entra[1] + 0.35]], s: '#3b2716', sw: 0.06 }, { k: 'free', pts: [[entra[0] + 0.15, entra[1] + 0.65], [entra[0] + 0.85, entra[1] + 0.65]], s: '#3b2716', sw: 0.06 }];
    const plano = { v: 1, lugar: 'interior', tipo: 'navio', estilo: est, W, H, forma: 'navio', proa: 'l', seed, porta: null, entra, salas, paredes, janelas, relevo: [], formas, luzes };
    return esp2 ? espelhar(plano) : plano;
  }
  // a planta espelhada (a proa do outro lado): x vira W − x
  function espelhar(p) {
    const W = p.W, mx = x => W - x;
    const seg = s => { const a = mx(s.x1), b = mx(s.x2); return Object.assign({}, s, { x1: Math.min(a, b), x2: Math.max(a, b), lado: s.lado === 'o' ? 'l' : s.lado === 'l' ? 'o' : s.lado }); };
    const out = Object.assign({}, p, { proa: 'o' });
    out.salas = p.salas.map(q => Object.assign({}, q, { x: W - q.x - q.w, moveis: q.moveis.map(m => Object.assign({}, m, { x: W - m.x - (m.s || 1), rot: m.rot === 90 ? 270 : m.rot === 270 ? 90 : m.rot })) }));
    out.paredes = p.paredes.map(pw => Object.assign(seg(pw), { porta: seg(pw.porta) }));
    out.janelas = p.janelas.map(seg);
    out.entra = [W - 1 - p.entra[0], p.entra[1]];
    out.luzes = p.luzes.map(l => ({ pts: l.pts.map(([x, y]) => [mx(x), y]) }));
    out.formas = p.formas.map(f => (f.k === 'rect' ? Object.assign({}, f, { x: W - f.x - f.w }) : Object.assign({}, f, { pts: f.pts.map(([x, y]) => [mx(x), y]) })));
    return out;
  }
  return { COR, conves, paredes, pintar, planta, espelhar };
})();
