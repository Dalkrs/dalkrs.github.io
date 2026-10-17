/* ---------------------------------------------------------------
   10f1. PAISAGEM — o desenho do mundo lá fora (lote 7, parte 4b)
   As paletas de cada chão (campo, floresta, areia, neve, rocha, cânion, pântano, selva, terra corrompida, basalto,
   cristal, mar, savana) e o desenho do que os geradores de fora (o Encontro; depois a Tribo, as Ruínas e o Porto) põem
   no fundo: o chão com as manchas e o capim, as manchas de outro chão (a clareira, o lodo, a neve funda), a água (o
   rio, o lago, o gelo, a lava, o lodo), os caminhos, os penhascos e as pedras grandes, as árvores de cada lugar e os
   objetos pintados (a carroça tombada, as tendas, a ossada, o moinho, a plantação, as pontes…). Aqui só há desenho, em
   quadrados (c pixels por quadrado); quem sorteia é o gerador.
   --------------------------------------------------------------- */
const Paisagem = (() => {
  const TAU = Math.PI * 2;
  /* As paletas: base (o chão), manchas, fios (o capim, a areia, as rachaduras), rua (as cores do caminho), copa (as
     árvores), luz, agua (três tons, do fundo para a beira) e margem (a beira da água). */
  const PAL = Object.assign({}, Vila.PAL, {
    rocha: { base: '#6b675e', manchas: ['#5f5b53', '#78736a', '#625d55', '#7f7a70', '#55524b'], fios: ['#8a857a', '#4a4741'], rua: ['#5a5246', '#73695a', '#857a69'], copa: ['#2f4a3c', '#3a5a49', '#456a56'], luz: '#7d8a6a', agua: ['#2f5e7d', '#3f7396', '#5d8fb0'], margem: '#4f4a42' },
    canion: { base: '#a8673f', manchas: ['#9a5c37', '#b8754a', '#8f5332', '#c08055', '#87492b'], fios: ['#c98e62', '#7a4227'], rua: ['#b98a5a', '#c99c6c', '#d6ad80'], copa: ['#5e7a3a', '#6f8c45', '#4f6a30'], luz: '#87a457', agua: ['#356f8c', '#4683a0', '#69a2bc'], margem: '#8a5a36' },
    pantano: { base: '#3e4a33', manchas: ['#36412c', '#4a5638', '#2f3a28', '#55603f', '#3a3a2a'], fios: ['#5f6e45', '#2c3324'], rua: ['#4a4232', '#5e5440', '#6e634c'], copa: ['#2b3d26', '#34492d', '#3d5535'], luz: '#56704a', agua: ['#2e4a40', '#3b5a4c', '#567564'], margem: '#3a3426' },
    selva: { base: '#2f4f2a', manchas: ['#28452a', '#3a5f33', '#2d4a2a', '#45693a', '#23401f'], fios: ['#4f7a3f', '#203a1d'], rua: ['#5a4630', '#6e5840', '#7d6850'], copa: ['#1f4a24', '#2a5e2c', '#357236'], luz: '#5a8f4a', agua: ['#2a5a5a', '#367070', '#4f8a86'], margem: '#3a3222' },
    corrompida: { base: '#463c4e', manchas: ['#3c3344', '#524659', '#372f3e', '#5c4f63', '#30293a'], fios: ['#6a5a73', '#2a2430'], rua: ['#4a4048', '#5c5058', '#6a5e66'], copa: ['#3a2f40', '#4a3d52', '#5a4b62'], luz: '#7a5a8a', agua: ['#3e2f4a', '#4f3b5c', '#6a5078'], margem: '#2e2634' },
    basalto: { base: '#2c2624', manchas: ['#241f1d', '#37302c', '#2f2826', '#403632', '#1e1a19'], fios: ['#4d423c', '#161312'], rua: ['#3a332e', '#4a423c', '#5a514a'], copa: ['#2d2a28', '#383330', '#433d39'], luz: '#5a4a40', agua: ['#5a1a08', '#c2410c', '#ff8a2a'], margem: '#1a1514' },
    cristal: { base: '#555f6c', manchas: ['#4b5462', '#606b79', '#46505e', '#6a7585', '#3f4855'], fios: ['#7c8a9c', '#383f4a'], rua: ['#5a6270', '#6c7482', '#7e8694'], copa: ['#3f5a6a', '#4a6a7c', '#557a8e'], luz: '#8ab4d6', agua: ['#2f5e8a', '#4a7fb0', '#7fb2dc'], margem: '#3e4654' },
    mar: { base: '#1d4a6b', manchas: ['#1a4361', '#215276', '#183d58', '#265a80', '#163a54'], fios: ['#4a86ad', '#12324a'], rua: ['#8a7a5a', '#a08e6a', '#b2a07c'], copa: ['#2c4629', '#355432', '#3f6239'], luz: '#5aa0c8', agua: ['#1d4a6b', '#2a6690', '#5a9cc6'], margem: '#cdb98e' },
    savana: { base: '#8a8648', manchas: ['#7f7b40', '#959150', '#76723a', '#a09a58', '#6c6834'], fios: ['#aca464', '#5e5a2e'], rua: ['#8a7550', '#a08a62', '#b09a72'], copa: ['#4f6a2e', '#5a7a34', '#66883c'], luz: '#9ab05a', agua: ['#356f8c', '#4683a0', '#69a2bc'], margem: '#7a6a40' },
  });
  // o desenho miúdo de cada chão: o capim, as ondinhas da areia, o brilho da neve, as rachaduras da rocha, as ondas
  const FIOS = { campo: 'capim', floresta: 'capim', pantano: 'capim', selva: 'capim', savana: 'capim', areia: 'areia', canion: 'areia', neve: 'neve', rocha: 'racha', basalto: 'racha', corrompida: 'racha', cristal: 'racha', mar: 'onda' };
  // as cores das pedras e dos penhascos de cada chão: [clara, média, escura]
  const PEDRA = { campo: ['#a3a7ae', '#757a83', '#4e535b'], floresta: ['#9aa09a', '#6f766f', '#474d47'], areia: ['#d9b98a', '#b08a5c', '#7a5a38'], neve: ['#e8eef2', '#aab6c0', '#6f7c88'],
    rocha: ['#a8a39a', '#7d786f', '#4d4a44'], canion: ['#d08a5a', '#a8633a', '#6e3a20'], pantano: ['#8a8f7a', '#62675a', '#3e4238'], selva: ['#8e9a86', '#66725e', '#3f4a3a'],
    corrompida: ['#7a6a86', '#53465e', '#2e2636'], basalto: ['#5a524c', '#3a3430', '#1c1918'], cristal: ['#a8b6c8', '#7a889a', '#4c5666'], mar: ['#8a8f96', '#61666d', '#3c4046'], savana: ['#b8a888', '#8e8062', '#5e533e'] };
  const pedraDe = pal => PEDRA[pal] || PEDRA.campo;
  const tom = Estilos.tom;

  /* ---- os caminhos de desenho, em quadrados ---- */
  function poli(g, pts, c, fechar) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); if (fechar) g.closePath(); }
  // um contorno fechado e macio (curvas pelos pontos do meio): as manchas, os lagos, os penhascos
  function suave(g, pts, c) {
    const n = pts.length;
    g.beginPath();
    const ini = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
    g.moveTo(ini[0] * c, ini[1] * c);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; g.quadraticCurveTo(p[0] * c, p[1] * c, (p[0] + q[0]) / 2 * c, (p[1] + q[1]) / 2 * c); }
    g.closePath();
  }
  const caixa = pts => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };
  const centro = pts => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  const encolher = (pts, k) => { const [cx, cy] = centro(pts); return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]); };
  // um ponto ao longo de uma linha (t de 0 a 1, pelo comprimento) e a direção dela ali
  function aoLongo(pts, t) {
    let L = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    let alvo = clamp(t, 0, 1) * L;
    for (let i = 0; i < seg.length; i++) {
      if (alvo <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, alvo / seg[i]) : 0, a = pts[i], b = pts[i + 1]; return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
      alvo -= seg[i];
    }
    return { x: pts[0][0], y: pts[0][1], ang: 0 };
  }
  const compr = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };

  /* ================= o chão ================= */
  function chao(g, W, H, c, rnd, pal) {
    const P = PAL[pal] || PAL.campo, w = W * c, h = H * c, fio = FIOS[pal] || 'capim';
    g.fillStyle = P.base; g.fillRect(0, 0, w, h);
    for (let i = 0, n = Math.round(W * H * 0.9); i < n; i++) {
      const rr = (0.45 + rnd() * 1.4) * c;
      g.globalAlpha = 0.1 + rnd() * 0.14; g.fillStyle = P.manchas[i % P.manchas.length];
      g.beginPath(); g.ellipse(rnd() * w, rnd() * h, rr, rr * (0.5 + rnd() * 0.6), rnd() * Math.PI, 0, TAU); g.fill();
    }
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (fio === 'areia') {
      g.globalAlpha = 0.25; g.lineWidth = Math.max(1, c * 0.03);
      for (let i = 0, n = Math.round(W * H * 0.35); i < n; i++) {
        const x = rnd() * w, y = rnd() * h, l = c * (0.4 + rnd() * 0.9);
        g.strokeStyle = P.fios[i % 2]; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - c * 0.12, x + l, y); g.stroke();
      }
    } else if (fio === 'neve') {
      // as sombras azuladas dos montinhos de neve e o brilho
      for (let i = 0, n = Math.round(W * H * 0.12); i < n; i++) { g.globalAlpha = 0.12; g.fillStyle = '#9fb3c6'; const rr = c * (0.4 + rnd() * 0.9); g.beginPath(); g.ellipse(rnd() * w, rnd() * h, rr, rr * 0.45, rnd() * 0.6 - 0.3, 0, TAU); g.fill(); }
      g.globalAlpha = 0.6; g.fillStyle = '#ffffff';
      for (let i = 0, n = Math.round(W * H * 1.5); i < n; i++) { g.beginPath(); g.arc(rnd() * w, rnd() * h, Math.max(0.6, c * 0.018), 0, TAU); g.fill(); }
    } else if (fio === 'racha') {
      // as rachaduras (em zigue-zague) e os pedregulhos
      g.lineWidth = Math.max(1, c * 0.025);
      for (let i = 0, n = Math.round(W * H * 0.45); i < n; i++) {
        let x = rnd() * w, y = rnd() * h, a = rnd() * TAU;
        g.globalAlpha = 0.28; g.strokeStyle = P.fios[1]; g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 3; k++) { a += (rnd() - 0.5) * 1.4; x += Math.cos(a) * c * (0.15 + rnd() * 0.3); y += Math.sin(a) * c * (0.15 + rnd() * 0.3); g.lineTo(x, y); }
        g.stroke();
      }
      for (let i = 0, n = Math.round(W * H * 0.9); i < n; i++) { g.globalAlpha = 0.3; g.fillStyle = P.fios[i % 2]; g.beginPath(); g.arc(rnd() * w, rnd() * h, c * (0.03 + rnd() * 0.05), 0, TAU); g.fill(); }
    } else if (fio === 'onda') {
      // as ondas: arcos claros em fileiras desencontradas e as cristas de espuma
      g.lineWidth = Math.max(1, c * 0.035);
      for (let j = 0; j < H * 1.6; j++) for (let i = 0; i < W * 0.9; i++) {
        const x = (i + (j % 2) * 0.5 + rnd() * 0.4) * c * 1.1, y = (j + rnd() * 0.3) * c * 0.62, l = c * (0.35 + rnd() * 0.5);
        g.globalAlpha = 0.18 + rnd() * 0.12; g.strokeStyle = rnd() < 0.7 ? P.fios[0] : '#cfe6f2';
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - c * 0.14, x + l, y); g.stroke();
      }
    } else {
      g.globalAlpha = 0.3; g.lineWidth = Math.max(1, c * 0.024);
      for (let i = 0, n = Math.round(W * H * 4); i < n; i++) {
        const x = rnd() * w, y = rnd() * h, a = -Math.PI / 2 + (rnd() - 0.5) * 0.9, l = c * (0.06 + rnd() * 0.1);
        g.strokeStyle = P.fios[i % 2]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
    }
    g.globalAlpha = 1;
  }
  /* Uma mancha de outro chão (pts, em quadrados), de beira macia: cores [base, manchas…]. op: flores (pontinhos
     coloridos), capim (fios de capim), pedrisco (pedrinhas), bolhas (o lodo). */
  function mancha(g, pts, c, rnd, cores, op) {
    op = op || {};
    g.save(); g.lineJoin = 'round';
    g.strokeStyle = cores[0];
    for (const [lw, a] of [[1.2, 0.12], [0.75, 0.18], [0.35, 0.26]]) { g.globalAlpha = a; g.lineWidth = lw * c; suave(g, pts, c); g.stroke(); }
    g.globalAlpha = op.a == null ? 1 : op.a; suave(g, pts, c); g.fillStyle = cores[0]; g.fill();
    g.clip();
    const [x0, y0, x1, y1] = caixa(pts), area = (x1 - x0) * (y1 - y0);
    for (let i = 0, n = Math.round(area * 1.2); i < n && cores.length > 1; i++) {
      g.globalAlpha = 0.14 + rnd() * 0.16; g.fillStyle = cores[1 + (i % (cores.length - 1))];
      const rr = (0.3 + rnd() * 0.9) * c; g.beginPath(); g.ellipse((x0 + rnd() * (x1 - x0)) * c, (y0 + rnd() * (y1 - y0)) * c, rr, rr * 0.6, rnd() * 3, 0, TAU); g.fill();
    }
    if (op.capim) { g.globalAlpha = 0.35; g.lineWidth = Math.max(1, c * 0.024); g.lineCap = 'round'; for (let i = 0, n = Math.round(area * 5); i < n; i++) { const x = (x0 + rnd() * (x1 - x0)) * c, y = (y0 + rnd() * (y1 - y0)) * c, a = -Math.PI / 2 + (rnd() - 0.5), l = c * (0.07 + rnd() * 0.1); g.strokeStyle = op.capim[i % op.capim.length]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } }
    if (op.pedrisco) { for (let i = 0, n = Math.round(area * 2); i < n; i++) { g.globalAlpha = 0.45; g.fillStyle = op.pedrisco[i % op.pedrisco.length]; g.beginPath(); g.arc((x0 + rnd() * (x1 - x0)) * c, (y0 + rnd() * (y1 - y0)) * c, c * (0.04 + rnd() * 0.07), 0, TAU); g.fill(); } }
    if (op.flores) { g.globalAlpha = 0.9; for (let i = 0, n = Math.round(area * 1.1); i < n; i++) { g.fillStyle = op.flores[i % op.flores.length]; g.beginPath(); g.arc((x0 + rnd() * (x1 - x0)) * c, (y0 + rnd() * (y1 - y0)) * c, c * 0.06, 0, TAU); g.fill(); } }
    if (op.bolhas) { g.lineWidth = Math.max(1, c * 0.03); for (let i = 0, n = Math.round(area * 0.8); i < n; i++) { g.globalAlpha = 0.5; g.strokeStyle = op.bolhas; g.beginPath(); g.arc((x0 + rnd() * (x1 - x0)) * c, (y0 + rnd() * (y1 - y0)) * c, c * (0.06 + rnd() * 0.12), 0, TAU); g.stroke(); } }
    g.restore();
  }

  /* ================= a água (e o que corre como ela) ================= */
  // o rio: uma linha grossa (hw: a meia largura). tipo: 'agua' | 'lava' | 'lodo'
  function rio(g, pts, hw, c, rnd, pal, tipo) {
    const P = PAL[pal] || PAL.campo;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    const traco = (cor, larg, a) => { g.globalAlpha = a == null ? 1 : a; poli(g, pts, c); g.strokeStyle = cor; g.lineWidth = larg * c; g.stroke(); };
    if (tipo === 'lava') {
      traco('#ff6a1a', hw * 2 + 2.4, 0.1); traco('#ff6a1a', hw * 2 + 1.4, 0.14);
      traco('#1a0f0a', hw * 2 + 0.8); traco('#4a1206', hw * 2); traco('#c2410c', hw * 1.45); traco('#ff8a2a', hw * 0.85, 0.95); traco('#ffd27a', hw * 0.28, 0.85);
      // as placas de crosta que boiam e as fagulhas
      for (let i = 0, n = Math.round(compr(pts) * 1.6); i < n; i++) {
        const p = aoLongo(pts, rnd()), off = (rnd() - 0.5) * hw * 1.5, x = p.x + Math.cos(p.ang + Math.PI / 2) * off, y = p.y + Math.sin(p.ang + Math.PI / 2) * off;
        g.globalAlpha = 0.55 + rnd() * 0.3; g.fillStyle = rnd() < 0.5 ? '#2a1208' : '#3b1a0c';
        g.beginPath(); g.ellipse(x * c, y * c, c * (0.12 + rnd() * 0.22), c * (0.08 + rnd() * 0.12), p.ang + rnd(), 0, TAU); g.fill();
      }
      for (let i = 0, n = Math.round(compr(pts) * 2); i < n; i++) { const p = aoLongo(pts, rnd()); g.globalAlpha = 0.8; g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc((p.x + (rnd() - 0.5) * hw) * c, (p.y + (rnd() - 0.5) * hw) * c, Math.max(0.8, c * 0.03), 0, TAU); g.fill(); }
    } else if (tipo === 'lodo') {
      const lodo = pal === 'corrompida' ? ['#2a1f33', '#4a2f5a', '#6f4a86'] : ['#2f3a22', '#46532c', '#62703c'];
      traco(P.margem, hw * 2 + 0.6); traco(lodo[0], hw * 2); traco(lodo[1], hw * 1.3); traco(lodo[2], hw * 0.5, 0.5);
      g.lineWidth = Math.max(1, c * 0.03);
      for (let i = 0, n = Math.round(compr(pts) * 2.5); i < n; i++) { const p = aoLongo(pts, rnd()); g.globalAlpha = 0.5; g.strokeStyle = lodo[2]; g.beginPath(); g.arc((p.x + (rnd() - 0.5) * hw * 1.4) * c, (p.y + (rnd() - 0.5) * hw * 1.4) * c, c * (0.05 + rnd() * 0.1), 0, TAU); g.stroke(); }
    } else {
      traco(P.margem, hw * 2 + 0.7); traco(P.agua[0], hw * 2); traco(P.agua[1], hw * 1.3); traco(P.agua[2], hw * 0.5, 0.5);
      // os reflexos e a espuma da correnteza, no sentido do rio
      g.lineWidth = Math.max(1, c * 0.03); g.strokeStyle = '#e8f3f8';
      for (let i = 0, n = Math.round(compr(pts) * 2.2); i < n; i++) {
        const p = aoLongo(pts, rnd()), off = (rnd() - 0.5) * hw * 1.4, x = p.x + Math.cos(p.ang + Math.PI / 2) * off, y = p.y + Math.sin(p.ang + Math.PI / 2) * off, l = 0.25 + rnd() * 0.4;
        g.globalAlpha = 0.3; g.beginPath(); g.moveTo(x * c, y * c); g.lineTo((x + Math.cos(p.ang) * l) * c, (y + Math.sin(p.ang) * l) * c); g.stroke();
      }
    }
    g.restore();
  }
  // o lago (pts: o contorno, em quadrados). tipo: 'agua' | 'gelo' | 'lava' | 'lodo' | 'espelho'
  function lago(g, pts, c, rnd, pal, tipo) {
    const P = PAL[pal] || PAL.campo, [x0, y0, x1, y1] = caixa(pts), area = (x1 - x0) * (y1 - y0);
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    if (tipo === 'gelo') {
      suave(g, pts, c); g.strokeStyle = '#c9d6df'; g.lineWidth = c * 0.9; g.stroke();
      const gr = g.createLinearGradient(x0 * c, y0 * c, x1 * c, y1 * c); gr.addColorStop(0, '#e8f6fc'); gr.addColorStop(0.5, '#bfe0f0'); gr.addColorStop(1, '#9cc8e0');
      suave(g, pts, c); g.fillStyle = gr; g.fill();
      g.clip();
      // o gelo mais escuro (fundo) em placas, as rachaduras e a geada
      for (let i = 0, n = Math.round(area * 0.25); i < n; i++) { g.globalAlpha = 0.18; g.fillStyle = '#7fb0cc'; const rr = c * (0.6 + rnd() * 1.4); g.beginPath(); g.ellipse((x0 + rnd() * (x1 - x0)) * c, (y0 + rnd() * (y1 - y0)) * c, rr, rr * 0.6, rnd() * 3, 0, TAU); g.fill(); }
      for (let i = 0, n = Math.round(area * 0.12) + 3; i < n; i++) {
        let x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), a = rnd() * TAU;
        g.globalAlpha = 0.55; g.strokeStyle = '#6d98b4'; g.lineWidth = Math.max(1, c * 0.035); g.beginPath(); g.moveTo(x * c, y * c);
        for (let k = 0; k < 5; k++) { a += (rnd() - 0.5) * 1.2; x += Math.cos(a) * (0.4 + rnd() * 0.8); y += Math.sin(a) * (0.4 + rnd() * 0.8); g.lineTo(x * c, y * c); }
        g.stroke(); g.globalAlpha = 0.5; g.strokeStyle = '#f4fbff'; g.lineWidth = Math.max(0.6, c * 0.015); g.stroke();
      }
      g.globalAlpha = 0.5; g.fillStyle = '#ffffff'; for (let i = 0, n = Math.round(area * 0.8); i < n; i++) { g.beginPath(); g.arc((x0 + rnd() * (x1 - x0)) * c, (y0 + rnd() * (y1 - y0)) * c, Math.max(0.6, c * 0.02), 0, TAU); g.fill(); }
      g.restore(); g.save();
      suave(g, pts, c); g.globalAlpha = 0.7; g.strokeStyle = '#f2f7fa'; g.lineWidth = c * 0.22; g.stroke();
    } else if (tipo === 'lava') {
      suave(g, pts, c); g.globalAlpha = 0.14; g.strokeStyle = '#ff6a1a'; g.lineWidth = c * 2.2; g.stroke(); g.lineWidth = c * 1.2; g.stroke();
      g.globalAlpha = 1; suave(g, pts, c); g.strokeStyle = '#1a0f0a'; g.lineWidth = c * 0.7; g.stroke();
      suave(g, pts, c); g.fillStyle = '#7a1e08'; g.fill();
      g.clip();
      suave(g, encolher(pts, 0.8), c); g.fillStyle = '#d4520f'; g.fill();
      suave(g, encolher(pts, 0.5), c); g.fillStyle = '#ff9a3a'; g.fill();
      suave(g, encolher(pts, 0.22), c); g.globalAlpha = 0.85; g.fillStyle = '#ffd98a'; g.fill();
      for (let i = 0, n = Math.round(area * 0.5); i < n; i++) { g.globalAlpha = 0.6 + rnd() * 0.3; g.fillStyle = rnd() < 0.5 ? '#2a1208' : '#4a1d0a'; const rr = c * (0.15 + rnd() * 0.4); g.beginPath(); g.ellipse((x0 + rnd() * (x1 - x0)) * c, (y0 + rnd() * (y1 - y0)) * c, rr, rr * 0.6, rnd() * 3, 0, TAU); g.fill(); }
      g.globalAlpha = 0.6; g.strokeStyle = '#ffcf6a'; g.lineWidth = Math.max(1, c * 0.04);
      for (let i = 0, n = Math.round(area * 0.15) + 2; i < n; i++) { const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0); g.beginPath(); g.arc(x * c, y * c, c * (0.2 + rnd() * 0.5), rnd() * 3, rnd() * 3 + 2); g.stroke(); }
    } else if (tipo === 'lodo') {
      const lodo = pal === 'corrompida' ? ['#2a1f33', '#4a2f5a', '#7a4f96', '#b07ad0'] : ['#2f3a22', '#46532c', '#62703c', '#9aaa5a'];
      suave(g, pts, c); g.strokeStyle = P.margem; g.lineWidth = c * 0.6; g.stroke();
      suave(g, pts, c); g.fillStyle = lodo[0]; g.fill();
      g.clip();
      suave(g, encolher(pts, 0.7), c); g.globalAlpha = 0.8; g.fillStyle = lodo[1]; g.fill();
      g.lineWidth = Math.max(1, c * 0.035);
      for (let i = 0, n = Math.round(area * 0.9); i < n; i++) { g.globalAlpha = 0.6; g.strokeStyle = rnd() < 0.5 ? lodo[2] : lodo[3]; g.beginPath(); g.arc((x0 + rnd() * (x1 - x0)) * c, (y0 + rnd() * (y1 - y0)) * c, c * (0.05 + rnd() * 0.14), 0, TAU); g.stroke(); }
    } else if (tipo === 'espelho') {
      // o lago espelhado: claro, liso, refletindo o céu; os cristais da beira brilham nele
      suave(g, pts, c); g.strokeStyle = P.margem; g.lineWidth = c * 0.5; g.stroke();
      const gr = g.createLinearGradient(x0 * c, y0 * c, x1 * c, y1 * c); gr.addColorStop(0, '#dff3ff'); gr.addColorStop(0.45, '#9fd0ee'); gr.addColorStop(1, '#5f9cc8');
      suave(g, pts, c); g.fillStyle = gr; g.fill();
      g.clip();
      g.globalAlpha = 0.35; g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, c * 0.05);
      for (let i = 0, n = Math.round(area * 0.06) + 3; i < n; i++) { const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), l = 0.6 + rnd() * 1.6; g.beginPath(); g.moveTo(x * c, y * c); g.lineTo((x + l) * c, (y - l * 0.35) * c); g.stroke(); }
      g.globalAlpha = 0.9; g.fillStyle = '#ffffff';
      for (let i = 0, n = Math.round(area * 0.2) + 4; i < n; i++) { const x = (x0 + rnd() * (x1 - x0)) * c, y = (y0 + rnd() * (y1 - y0)) * c, s = c * (0.05 + rnd() * 0.08); g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s * 0.5, y); g.lineTo(x, y + s * 2); g.lineTo(x - s * 0.5, y); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x - s * 2, y); g.lineTo(x, y + s * 0.5); g.lineTo(x + s * 2, y); g.lineTo(x, y - s * 0.5); g.closePath(); g.fill(); }
    } else {
      suave(g, pts, c); g.strokeStyle = P.margem; g.lineWidth = c * 0.7; g.stroke();
      suave(g, pts, c); g.fillStyle = P.agua[0]; g.fill();
      g.clip();
      suave(g, encolher(pts, 0.78), c); g.globalAlpha = 0.85; g.fillStyle = P.agua[1]; g.fill();
      suave(g, encolher(pts, 0.45), c); g.globalAlpha = 0.45; g.fillStyle = P.agua[2]; g.fill();
      g.globalAlpha = 0.35; g.strokeStyle = '#e8f3f8'; g.lineWidth = Math.max(1, c * 0.03);
      for (let i = 0, n = Math.round(area * 0.35) + 3; i < n; i++) { const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0); g.beginPath(); g.arc(x * c, y * c, c * (0.15 + rnd() * 0.3), Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    }
    g.restore();
  }
  // a água rasa do pântano por todo o mapa (W × H): o fundo turvo, as manchas de alga, as folhas de lírio e as ondinhas
  function aguaRasa(g, W, H, c, rnd, pal) {
    const P = PAL[pal] || PAL.pantano;
    g.save();
    g.fillStyle = P.agua[0]; g.fillRect(0, 0, W * c, H * c);
    for (let i = 0, n = Math.round(W * H * 0.5); i < n; i++) { g.globalAlpha = 0.12 + rnd() * 0.14; g.fillStyle = [P.agua[1], P.agua[2], '#3a4a2a', '#2a3a30'][i % 4]; const rr = c * (0.5 + rnd() * 1.6); g.beginPath(); g.ellipse(rnd() * W * c, rnd() * H * c, rr, rr * (0.5 + rnd() * 0.4), rnd() * 3, 0, TAU); g.fill(); }
    // as algas (verde vivo, em fiapos) e as folhas de lírio d'água (com o cortezinho)
    for (let i = 0, n = Math.round(W * H * 0.12); i < n; i++) { g.globalAlpha = 0.35; g.fillStyle = '#6f8a3a'; const x = rnd() * W * c, y = rnd() * H * c; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + (rnd() - 0.5) * c * 0.8, y + (rnd() - 0.5) * c * 0.6, c * 0.18, c * 0.07, rnd() * 3, 0, TAU); g.fill(); } }
    for (let i = 0, n = Math.round(W * H * 0.06); i < n; i++) { const x = rnd() * W * c, y = rnd() * H * c, rr = c * (0.12 + rnd() * 0.1), a0 = rnd() * TAU; g.globalAlpha = 0.85; g.fillStyle = rnd() < 0.5 ? '#5f8a3a' : '#4f7a32'; g.beginPath(); g.moveTo(x, y); g.arc(x, y, rr, a0 + 0.4, a0 + TAU - 0.1); g.closePath(); g.fill(); if (rnd() < 0.2) { g.fillStyle = '#f0e8f4'; g.beginPath(); g.arc(x + rr * 0.3, y - rr * 0.2, rr * 0.35, 0, TAU); g.fill(); } }
    g.globalAlpha = 0.22; g.strokeStyle = '#cfe0d4'; g.lineWidth = Math.max(1, c * 0.025);
    for (let i = 0, n = Math.round(W * H * 0.15); i < n; i++) { const x = rnd() * W * c, y = rnd() * H * c; g.beginPath(); g.arc(x, y, c * (0.15 + rnd() * 0.3), Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.restore();
  }
  // a praia (a areia onde o mar encosta na terra): a areia molhada, a espuma e as conchas
  function praia(g, pts, c, rnd) {
    mancha(g, pts, c, rnd, ['#cdb98e', '#d9c79e', '#bfa97a', '#e3d3ac'], { pedrisco: ['#f4ead0', '#a8946a'] });
  }
  // a espuma na beira do mar (uma linha, em quadrados)
  function espuma(g, pts, c, rnd) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [lw, a] of [[0.9, 0.18], [0.45, 0.35], [0.16, 0.8]]) { g.globalAlpha = a; poli(g, pts, c); g.strokeStyle = '#eef8fc'; g.lineWidth = lw * c; g.stroke(); }
    g.globalAlpha = 0.6; g.fillStyle = '#ffffff';
    for (let i = 0, n = Math.round(compr(pts) * 3); i < n; i++) { const p = aoLongo(pts, rnd()); g.beginPath(); g.arc((p.x + (rnd() - 0.5) * 0.6) * c, (p.y + (rnd() - 0.5) * 0.6) * c, c * (0.03 + rnd() * 0.05), 0, TAU); g.fill(); }
    g.restore();
  }
  /* A cachoeira: a água caindo da beira do penhasco (x, y: o meio da beira; larg: a largura; ang: o sentido em que a
     água corre, do alto para baixo), a espuma embaixo e a névoa. */
  function cachoeira(g, x, y, larg, ang, c, rnd) {
    g.save(); g.translate(x * c, y * c); g.rotate(ang);
    const L = larg * c;
    // a água caindo (faixas brancas e azuis, no sentido da queda)
    for (let i = 0; i < 14; i++) { const t = -L / 2 + (i + rnd() * 0.6) * L / 14; g.globalAlpha = 0.55 + rnd() * 0.35; g.fillStyle = i % 3 ? '#cfe8f4' : '#ffffff'; g.fillRect(-c * 0.1, t, c * (0.9 + rnd() * 0.5), L / 18); }
    // a espuma e a névoa embaixo
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.25 + rnd() * 0.3; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(c * (0.8 + rnd() * 1.6), (rnd() - 0.5) * L * 1.15, c * (0.12 + rnd() * 0.3), 0, TAU); g.fill(); }
    g.restore();
  }

  /* ================= os caminhos ================= */
  // tipo: 'estrada' (larga, com sulcos de roda) ou 'trilha' (estreita, de terra batida, com o capim avançando)
  function caminho(g, pts, hw, c, rnd, cores, tipo) {
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    const traco = (cor, larg, a) => { g.globalAlpha = a == null ? 1 : a; poli(g, pts, c); g.strokeStyle = cor; g.lineWidth = larg * c; g.stroke(); };
    if (tipo === 'trilha') {
      traco(cores[0], hw * 2 + 0.45, 0.45); traco(cores[1], hw * 2, 0.9); traco(cores[2], hw * 0.7, 0.35);
      // as pegadas e as pedrinhas; o capim avançando nas beiras
      g.fillStyle = cores[0];
      for (let i = 0, n = Math.round(compr(pts) * 2.5); i < n; i++) { const p = aoLongo(pts, rnd()), off = (rnd() - 0.5) * hw * 1.4; g.globalAlpha = 0.4; g.beginPath(); g.ellipse((p.x + Math.cos(p.ang + Math.PI / 2) * off) * c, (p.y + Math.sin(p.ang + Math.PI / 2) * off) * c, c * 0.06, c * 0.035, p.ang, 0, TAU); g.fill(); }
    } else {
      traco(cores[0], hw * 2 + 0.35); traco(cores[1], hw * 2); traco(cores[2], hw * 0.9, 0.45);
      // os sulcos das rodas
      g.globalAlpha = 0.2; g.strokeStyle = '#2a2116'; g.lineWidth = Math.max(1, c * 0.045);
      for (const off of [-0.38, 0.38]) {
        g.beginPath();
        pts.forEach(([x, y], i) => { const a = i < pts.length - 1 ? Math.atan2(pts[i + 1][1] - y, pts[i + 1][0] - x) : Math.atan2(y - pts[i - 1][1], x - pts[i - 1][0]), px = (x + Math.cos(a + Math.PI / 2) * off * hw) * c, py = (y + Math.sin(a + Math.PI / 2) * off * hw) * c; if (i) g.lineTo(px, py); else g.moveTo(px, py); });
        g.stroke();
      }
    }
    g.restore();
  }

  /* ================= as pedras e os penhascos ================= */
  /* Um penhasco (ou um paredão, um bloco de gelo, uma massa de cristal): o contorno (pts), as cores [clara, média,
     escura] e a altura (a sombra que ele faz cai para baixo e à direita, mais longe quanto mais alto). */
  function penhasco(g, pts, c, rnd, cores, alto) {
    const d = (0.2 + Math.min(1, Math.abs(alto || 4) / 8) * 0.6) * c, [x0, y0, x1, y1] = caixa(pts), area = (x1 - x0) * (y1 - y0);
    g.save(); g.lineJoin = 'round';
    g.save(); g.translate(d, d * 1.2); poli(g, pts, c, true); g.fillStyle = 'rgba(0,0,0,0.42)'; g.fill(); g.restore();
    const gr = g.createLinearGradient(x0 * c, y0 * c, x1 * c, y1 * c); gr.addColorStop(0, cores[0]); gr.addColorStop(0.55, cores[1]); gr.addColorStop(1, cores[2]);
    poli(g, pts, c, true); g.fillStyle = gr; g.fill();
    g.save(); poli(g, pts, c, true); g.clip();
    // as faces da rocha (triângulos claros e escuros), as rachaduras e o pedrisco
    for (let i = 0, n = Math.round(area * 0.7) + 4; i < n; i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), s = 0.4 + rnd() * 1.2;
      g.globalAlpha = 0.16; g.fillStyle = rnd() < 0.5 ? cores[0] : cores[2];
      g.beginPath(); g.moveTo(x * c, y * c); g.lineTo((x + s) * c, (y + s * (rnd() - 0.3)) * c); g.lineTo((x + s * (rnd() - 0.2)) * c, (y + s) * c); g.closePath(); g.fill();
    }
    g.lineCap = 'round'; g.lineWidth = Math.max(1, c * 0.035);
    for (let i = 0, n = Math.round(area * 0.18) + 3; i < n; i++) {
      let x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), a = rnd() * TAU;
      g.globalAlpha = 0.45; g.strokeStyle = tom(cores[2], -0.35); g.beginPath(); g.moveTo(x * c, y * c);
      for (let k = 0; k < 4; k++) { a += (rnd() - 0.5) * 1.3; x += Math.cos(a) * (0.25 + rnd() * 0.5); y += Math.sin(a) * (0.25 + rnd() * 0.5); g.lineTo(x * c, y * c); }
      g.stroke();
    }
    for (let i = 0, n = Math.round(area * 1.4); i < n; i++) { g.globalAlpha = 0.25; g.fillStyle = rnd() < 0.5 ? cores[0] : tom(cores[2], -0.2); g.beginPath(); g.arc((x0 + rnd() * (x1 - x0)) * c, (y0 + rnd() * (y1 - y0)) * c, c * (0.03 + rnd() * 0.05), 0, TAU); g.fill(); }
    // a face da rocha: uma faixa escura e quebrada logo por dentro da beira (o paredão visto de cima) e, mais para dentro,
    // o alto, mais claro; nas massas grandes, os blocos e as manchas de mato lá em cima
    g.lineJoin = 'round';
    for (const [lw, a, cor] of [[1.5, 0.22, cores[2]], [0.9, 0.3, tom(cores[2], -0.2)], [0.35, 0.45, tom(cores[2], -0.4)]]) { g.globalAlpha = a; poli(g, pts, c, true); g.strokeStyle = cor; g.lineWidth = lw * c; g.stroke(); }
    if (area > 60) {
      for (let i = 0, n = Math.round(area * 0.08); i < n; i++) {
        const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), s2 = 0.8 + rnd() * 1.8;
        g.globalAlpha = 0.22; g.fillStyle = tom(cores[0], 0.1);
        g.beginPath(); for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU + rnd() * 0.5, d = s2 * (0.6 + rnd() * 0.4); const px = (x + Math.cos(an) * d) * c, py = (y + Math.sin(an) * d * 0.8) * c; if (k) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); g.fill();
        g.globalAlpha = 0.35; g.strokeStyle = tom(cores[2], -0.3); g.lineWidth = Math.max(1, c * 0.03); g.stroke();
      }
    }
    // a luz no alto da beira (de cima, à esquerda)
    g.globalAlpha = 0.55; g.strokeStyle = tom(cores[0], 0.25); g.lineWidth = c * 0.12; g.save(); g.translate(c * 0.05, c * 0.05); poli(g, pts, c, true); g.stroke(); g.restore();
    g.restore();
    g.globalAlpha = 0.8; poli(g, pts, c, true); g.strokeStyle = tom(cores[2], -0.45); g.lineWidth = Math.max(1.5, c * 0.07); g.stroke();
    g.restore();
  }
  // uma pedra grande (x, y: o meio; r: o raio, em quadrados), nas cores do chão
  function pedra(g, x, y, r, c, rnd, cores) {
    const X = x * c, Y = y * c, R = r * c, n = 8 + Math.floor(rnd() * 4), pts = [];
    for (let i = 0; i < n; i++) { const an = (i / n) * TAU + rnd() * 0.3, d = R * (0.72 + rnd() * 0.28); pts.push([X + Math.cos(an) * d, Y + Math.sin(an) * d * 0.86]); }
    const caminho2 = (dx, dy) => { g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px + dx, py + dy) : g.moveTo(px + dx, py + dy))); g.closePath(); };
    g.save();
    g.globalAlpha = 0.35; g.fillStyle = '#000'; caminho2(R * 0.16, R * 0.22); g.fill();
    g.globalAlpha = 1;
    const gr = g.createRadialGradient(X - R * 0.3, Y - R * 0.35, R * 0.1, X, Y, R * 1.1); gr.addColorStop(0, cores[0]); gr.addColorStop(0.6, cores[1]); gr.addColorStop(1, cores[2]);
    caminho2(0, 0); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(25,25,30,0.7)'; g.lineWidth = Math.max(1, R * 0.07); g.stroke();
    g.strokeStyle = 'rgba(30,28,26,0.4)'; g.lineWidth = Math.max(1, R * 0.05); g.beginPath(); g.moveTo(X - R * 0.25, Y - R * 0.3); g.lineTo(X + R * 0.05, Y + R * 0.05); g.lineTo(X + R * 0.3, Y + R * 0.1); g.stroke();
    g.restore();
    return pts.map(([px, py]) => [px / c, py / c]);
  }

  /* ================= as árvores (e o que faz as vezes delas) ================= */
  /* As espécies novas (morta, selva, acácia, cacto, mangue, juncos, cristal, cristal negro, cogumelo, flor gigante,
     carbonizada); as outras vêm do desenho dos estilos (folhosa, pinheiro, palmeira, oriental, élfica, rocha). */
  function arvore(g, a, c, rnd, esp, pal, neve) {
    const x = a.x * c, y = a.y * c, R = a.r * c;
    const sombra = (k, dx, dy) => { g.globalAlpha = 0.28; g.fillStyle = '#000'; g.beginPath(); g.arc(x + R * (dx == null ? 0.16 : dx), y + R * (dy == null ? 0.2 : dy), R * (k || 1), 0, TAU); g.fill(); g.globalAlpha = 1; };
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    if (esp === 'morta' || esp === 'carbonizada') {
      const corT = esp === 'carbonizada' ? '#1c1714' : pal === 'corrompida' ? '#2a2230' : '#3b3029', corL = esp === 'carbonizada' ? '#3a2a20' : pal === 'corrompida' ? '#4a3a56' : '#5a4a3c';
      sombra(0.55, 0.25, 0.3);
      // os galhos tortos: poucos e compridos, para um lado mais que para o outro, cada um se abrindo em forquilha
      const n = 3 + Math.floor(rnd() * 2), a0 = rnd() * TAU, abre = 2.2 + rnd() * 1.6;
      const galho = (px, py, an, larg, l, nivel) => {
        const nx = px + Math.cos(an) * l, ny = py + Math.sin(an) * l, mx = (px + nx) / 2 + Math.cos(an + 1.57) * l * (rnd() - 0.5) * 0.4, my = (py + ny) / 2 + Math.sin(an + 1.57) * l * (rnd() - 0.5) * 0.4;
        g.strokeStyle = corT; g.lineWidth = Math.max(1, larg); g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(mx, my, nx, ny); g.stroke();
        if (nivel < 2) for (const d of [-0.5 - rnd() * 0.3, 0.4 + rnd() * 0.3]) galho(nx, ny, an + d, larg * 0.6, l * (0.55 + rnd() * 0.2), nivel + 1);
      };
      for (let i = 0; i < n; i++) galho(x, y, a0 + (i / Math.max(1, n - 1) - 0.5) * abre + (rnd() - 0.5) * 0.4, R * 0.2, R * (0.45 + rnd() * 0.2), 0);
      g.fillStyle = corT; g.beginPath(); g.arc(x, y, R * 0.2, 0, TAU); g.fill();
      g.fillStyle = corL; g.beginPath(); g.arc(x - R * 0.04, y - R * 0.04, R * 0.1, 0, TAU); g.fill();
      if (esp === 'carbonizada') { g.fillStyle = '#ff8a3a'; for (let i = 0; i < 5; i++) { g.globalAlpha = 0.8; g.beginPath(); g.arc(x + (rnd() - 0.5) * R, y + (rnd() - 0.5) * R, Math.max(0.8, R * 0.04), 0, TAU); g.fill(); } }
    } else if (esp === 'selva') {
      sombra(1.05);
      const cores = ['#1f4a24', '#2a5e2c', '#357236', '#3f8540'];
      for (let i = 0; i < 13; i++) { const an = rnd() * TAU, d = rnd() * R * 0.55; g.globalAlpha = 0.93; g.fillStyle = cores[i % 4]; g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, R * (0.38 + rnd() * 0.28), 0, TAU); g.fill(); }
      g.globalAlpha = 0.45; g.fillStyle = '#6fae55'; g.beginPath(); g.arc(x - R * 0.22, y - R * 0.25, R * 0.3, 0, TAU); g.fill();
      // os cipós e algumas flores
      g.globalAlpha = 0.7; g.strokeStyle = '#173a1a'; g.lineWidth = Math.max(1, R * 0.05);
      for (let i = 0; i < 3; i++) { const an = rnd() * TAU; g.beginPath(); g.moveTo(x + Math.cos(an) * R * 0.2, y + Math.sin(an) * R * 0.2); g.quadraticCurveTo(x + Math.cos(an + 0.8) * R * 0.9, y + Math.sin(an + 0.8) * R * 0.9, x + Math.cos(an + 0.3) * R * 1.15, y + Math.sin(an + 0.3) * R * 1.15); g.stroke(); }
      g.globalAlpha = 0.95; for (let i = 0; i < 5; i++) { const an = rnd() * TAU, d = rnd() * R * 0.8; g.fillStyle = ['#e85d75', '#f2c94c', '#ff8a3a'][i % 3]; g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, Math.max(1, R * 0.06), 0, TAU); g.fill(); }
    } else if (esp === 'acacia') {
      sombra(1.1, 0.25, 0.3);
      const cores = ['#4f6a2e', '#5f7a34', '#72903e', '#86a24a'];
      // a copa achatada, larga, em camadas (a de baixo mais escura)
      for (let camada = 0; camada < 4; camada++) {
        const k = 1 - camada * 0.18; g.globalAlpha = 0.95; g.fillStyle = cores[camada];
        g.beginPath();
        for (let i = 0; i <= 18; i++) { const an = (i / 18) * TAU, d = R * k * (0.85 + rnd() * 0.15); const px = x + Math.cos(an) * d - camada * R * 0.04, py = y + Math.sin(an) * d * 0.78 - camada * R * 0.05; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
        g.closePath(); g.fill();
      }
    } else if (esp === 'cacto') {
      // o cacto visto de cima: o corpo com as costelas, dois braços e os espinhos
      sombra(0.5, 0.3, 0.35);
      const corpo = (cx, cy, rr) => {
        g.globalAlpha = 1; g.fillStyle = '#4f7a3a'; g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill();
        g.strokeStyle = '#3a5f2a'; g.lineWidth = Math.max(1, rr * 0.12);
        for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); g.stroke(); }
        g.fillStyle = '#7aa85a'; g.beginPath(); g.arc(cx - rr * 0.25, cy - rr * 0.25, rr * 0.35, 0, TAU); g.fill();
        g.fillStyle = '#f4ead0'; for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU + 0.2; g.beginPath(); g.arc(cx + Math.cos(an) * rr * 0.92, cy + Math.sin(an) * rr * 0.92, Math.max(0.6, rr * 0.06), 0, TAU); g.fill(); }
      };
      const an = rnd() * TAU;
      corpo(x + Math.cos(an) * R * 0.55, y + Math.sin(an) * R * 0.55, R * 0.22);
      corpo(x + Math.cos(an + 2.6) * R * 0.5, y + Math.sin(an + 2.6) * R * 0.5, R * 0.2);
      corpo(x, y, R * 0.34);
    } else if (esp === 'mangue') {
      sombra(1);
      // as raízes em arco, aparecendo em volta, e a copa
      g.strokeStyle = '#4a3a26'; g.lineWidth = Math.max(1, R * 0.07);
      for (let i = 0; i < 9; i++) { const an = (i / 9) * TAU + rnd() * 0.3; g.beginPath(); g.moveTo(x + Math.cos(an) * R * 0.3, y + Math.sin(an) * R * 0.3); g.quadraticCurveTo(x + Math.cos(an + 0.25) * R * 1.0, y + Math.sin(an + 0.25) * R * 1.0, x + Math.cos(an) * R * 1.18, y + Math.sin(an) * R * 1.18); g.stroke(); }
      const cores = ['#2b3d26', '#34492d', '#3d5535'];
      for (let i = 0; i < 8; i++) { const an2 = rnd() * TAU, d = rnd() * R * 0.4; g.globalAlpha = 0.92; g.fillStyle = cores[i % 3]; g.beginPath(); g.arc(x + Math.cos(an2) * d, y + Math.sin(an2) * d, R * (0.35 + rnd() * 0.2), 0, TAU); g.fill(); }
    } else if (esp === 'juncos') {
      // uma moita de juncos: hastes finas e as taboas
      for (let i = 0; i < 16; i++) {
        const an = rnd() * TAU, d = rnd() * R * 0.55, px = x + Math.cos(an) * d, py = y + Math.sin(an) * d, b = -Math.PI / 2 + (rnd() - 0.5) * 1.6, l = R * (0.35 + rnd() * 0.4);
        g.globalAlpha = 0.85; g.strokeStyle = rnd() < 0.5 ? '#7a8a4a' : '#9aa060'; g.lineWidth = Math.max(1, R * 0.05);
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(b) * l, py + Math.sin(b) * l); g.stroke();
        if (i % 4 === 0) { g.fillStyle = '#6b4a2b'; g.beginPath(); g.ellipse(px + Math.cos(b) * l, py + Math.sin(b) * l, R * 0.05, R * 0.12, b + Math.PI / 2, 0, TAU); g.fill(); }
      }
    } else if (esp === 'cristal' || esp === 'cristalNegro') {
      cristais(g, a.x, a.y, a.r, c, rnd, esp === 'cristalNegro' ? 'negro' : pal === 'corrompida' ? 'negro' : 'azul');
    } else if (esp === 'cogumelo') {
      sombra(0.9);
      const roxo = pal === 'corrompida', cor = roxo ? ['#5a2f7a', '#7a44a0', '#c08ae0'] : ['#8a3a2a', '#b04a32', '#f4ead0'];
      g.globalAlpha = 1; const gr = g.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R); gr.addColorStop(0, cor[1]); gr.addColorStop(1, cor[0]);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, R * 0.85, 0, TAU); g.fill();
      g.fillStyle = cor[2]; for (let i = 0; i < 7; i++) { const an = rnd() * TAU, d = rnd() * R * 0.6; g.globalAlpha = roxo ? 0.8 : 0.95; g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, R * (0.07 + rnd() * 0.08), 0, TAU); g.fill(); }
      if (roxo) { g.globalAlpha = 0.25; g.fillStyle = '#d6a8ff'; g.beginPath(); g.arc(x, y, R * 1.1, 0, TAU); g.fill(); }
    } else if (esp === 'flor') {
      // a flor gigante: as folhas, as pétalas em volta e o miolo
      sombra(0.95);
      const cor = a.cor || ['#e85d75', '#f2c94c', '#9b7bd8', '#ff8a3a', '#f4f0ff'][Math.floor(rnd() * 5)];
      g.globalAlpha = 0.95; g.fillStyle = '#3f7a3a';
      for (let i = 0; i < 3; i++) { const an = rnd() * TAU; g.beginPath(); g.ellipse(x + Math.cos(an) * R * 0.75, y + Math.sin(an) * R * 0.75, R * 0.5, R * 0.22, an, 0, TAU); g.fill(); }
      const n = 6 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) { const an = (i / n) * TAU; g.fillStyle = i % 2 ? cor : tom(cor.length === 7 ? cor : '#e85d75', 0.15); g.beginPath(); g.ellipse(x + Math.cos(an) * R * 0.5, y + Math.sin(an) * R * 0.5, R * 0.48, R * 0.24, an, 0, TAU); g.fill(); }
      g.fillStyle = '#f2b02a'; g.beginPath(); g.arc(x, y, R * 0.24, 0, TAU); g.fill();
      g.fillStyle = '#8a5a1a'; for (let i = 0; i < 9; i++) { const an = rnd() * TAU, d = rnd() * R * 0.18; g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, Math.max(0.6, R * 0.03), 0, TAU); g.fill(); }
    } else {
      g.restore();
      Estilos.arvore(g, a, c, rnd, esp || 'folhosa', PAL[pal] || PAL.campo, neve);
      return;
    }
    g.restore();
  }
  /* Um punhado de cristais (x, y: a base; r: o tamanho): prismas saindo da base, com as faces clara e escura e o
     brilho em volta. cor: 'azul' (os cristais de gelo e de mana) ou 'negro' (a terra corrompida). */
  function cristais(g, x, y, r, c, rnd, cor) {
    const X = x * c, Y = y * c, R = r * c, negro = cor === 'negro';
    const C = negro ? ['#a070d0', '#4a2a66', '#1c0e2a', '#e0a8ff'] : ['#e4f6ff', '#9fd3f2', '#4f8fc0', '#bfe8ff'];
    g.save();
    const halo = g.createRadialGradient(X, Y, R * 0.1, X, Y, R * 1.5); halo.addColorStop(0, negro ? 'rgba(190,120,255,0.5)' : 'rgba(170,225,255,0.4)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(X, Y, R * 1.5, 0, TAU); g.fill();
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.beginPath(); g.ellipse(X + R * 0.2, Y + R * 0.25, R * 0.7, R * 0.45, 0, 0, TAU); g.fill();
    const n = 4 + Math.floor(rnd() * 4), lista = [];
    for (let i = 0; i < n; i++) lista.push({ an: -Math.PI / 2 + (rnd() - 0.5) * 2.6 + (i % 2 ? Math.PI : 0) * 0.5, l: R * (0.7 + rnd() * 0.55), w: R * (0.18 + rnd() * 0.12) });
    lista.sort((p, q) => Math.sin(p.an) - Math.sin(q.an));
    for (const k of lista) {
      const ux = Math.cos(k.an), uy = Math.sin(k.an), vx = -uy, vy = ux, tx = X + ux * k.l, ty = Y + uy * k.l;
      const a1 = [X + vx * k.w, Y + vy * k.w], a2 = [X - vx * k.w, Y - vy * k.w], b1 = [tx - ux * k.w * 1.2 + vx * k.w, ty - uy * k.w * 1.2 + vy * k.w], b2 = [tx - ux * k.w * 1.2 - vx * k.w, ty - uy * k.w * 1.2 - vy * k.w];
      g.globalAlpha = 0.95;
      g.fillStyle = C[1]; g.beginPath(); g.moveTo(a1[0], a1[1]); g.lineTo(b1[0], b1[1]); g.lineTo(tx, ty); g.lineTo(X, Y); g.closePath(); g.fill();
      g.fillStyle = C[2]; g.beginPath(); g.moveTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]); g.lineTo(tx, ty); g.lineTo(X, Y); g.closePath(); g.fill();
      g.strokeStyle = C[0]; g.lineWidth = Math.max(1, R * 0.03); g.globalAlpha = 0.8; g.beginPath(); g.moveTo(X, Y); g.lineTo(tx, ty); g.stroke();
    }
    g.globalAlpha = 0.9; g.fillStyle = C[3]; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(X + (rnd() - 0.5) * R, Y + (rnd() - 0.7) * R, Math.max(0.8, R * 0.04), 0, TAU); g.fill(); }
    g.restore();
  }

  /* ================= os objetos pintados ================= */
  const MAD = { cla: '#9a7048', med: '#7a5532', esc: '#4e3420', borda: '#2e1f10' };
  // tábuas de madeira num retângulo girado (cx, cy: o meio; L × Wd; ang), em pixels
  function tabuas(g, cx, cy, L, Wd, ang, rnd, cores) {
    cores = cores || [MAD.cla, MAD.med, '#8a6238'];
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = MAD.borda; g.fillRect(-L / 2 - 1, -Wd / 2 - 1, L + 2, Wd + 2);
    const n = Math.max(2, Math.round(Wd / (L > Wd ? Wd / 3 : 6)));
    for (let i = 0; i < n; i++) { g.fillStyle = cores[Math.floor(rnd() * cores.length) % cores.length]; g.fillRect(-L / 2, -Wd / 2 + (i * Wd) / n + 0.6, L, Wd / n - 1.2); }
    g.restore();
  }
  /* A carroça tombada (x, y: o meio; ang: o sentido da carroça; em quadrados): a caixa de lado, uma roda para cima,
     a outra solta, o varal quebrado e a carga espalhada (os sacos pintados; as caixas e os barris são objetos). */
  function carroca(g, o, c, rnd) {
    const L = 3.4 * c, Wd = 1.7 * c;
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    g.globalAlpha = 0.4; g.fillStyle = '#000'; g.fillRect(-L / 2 + c * 0.25, -Wd / 2 + c * 0.3, L, Wd); g.globalAlpha = 1;
    // o fundo da carroça (as tábuas de baixo, vistas de lado: ela está tombada)
    g.fillStyle = MAD.borda; g.fillRect(-L / 2 - 2, -Wd / 2 - 2, L + 4, Wd + 4);
    for (let i = 0; i < 6; i++) { g.fillStyle = [MAD.cla, MAD.med, '#8a6238'][i % 3]; g.fillRect(-L / 2, -Wd / 2 + i * Wd / 6 + 1, L, Wd / 6 - 2); }
    // as travessas de ferro
    g.fillStyle = '#3a3a3e'; for (const t of [-0.32, 0, 0.32]) g.fillRect(t * L - c * 0.05, -Wd / 2, c * 0.1, Wd);
    // a roda de cima (inteira) e o eixo
    const roda = (rx, ry, rr) => {
      g.strokeStyle = '#2e1f10'; g.lineWidth = rr * 0.22; g.beginPath(); g.arc(rx, ry, rr, 0, TAU); g.stroke();
      g.strokeStyle = MAD.med; g.lineWidth = rr * 0.14; g.beginPath(); g.arc(rx, ry, rr, 0, TAU); g.stroke();
      g.lineWidth = rr * 0.09; for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx + Math.cos(an) * rr, ry + Math.sin(an) * rr); g.stroke(); }
      g.fillStyle = '#3a3a3e'; g.beginPath(); g.arc(rx, ry, rr * 0.2, 0, TAU); g.fill();
    };
    roda(-L * 0.3, -Wd * 0.55, c * 0.55); roda(L * 0.3, -Wd * 0.55, c * 0.55);
    g.restore();
    // a roda solta, caída mais adiante, e o varal quebrado
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    g.translate(L * 0.35, Wd * 1.05); g.rotate(0.6);
    g.strokeStyle = '#2e1f10'; g.lineWidth = c * 0.11; g.beginPath(); g.arc(0, 0, c * 0.5, 0, TAU); g.stroke();
    g.strokeStyle = MAD.med; g.lineWidth = c * 0.06; for (let i = 0; i < 5; i++) { const an = (i / 8) * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an) * c * 0.5, Math.sin(an) * c * 0.5); g.stroke(); }
    g.restore();
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    g.strokeStyle = MAD.esc; g.lineWidth = c * 0.12; g.beginPath(); g.moveTo(-L / 2, -Wd * 0.1); g.lineTo(-L / 2 - c * 1.3, -Wd * 0.3); g.stroke();
    g.beginPath(); g.moveTo(-L / 2, Wd * 0.2); g.lineTo(-L / 2 - c * 0.7, Wd * 0.45); g.stroke();
    // os sacos espalhados (um rasgado, com o grão no chão)
    for (let i = 0; i < 4; i++) {
      const sx = (-0.2 + rnd() * 0.9) * L, sy = Wd * (0.75 + rnd() * 0.6);
      g.fillStyle = '#c9b48a'; g.beginPath(); g.ellipse(sx, sy, c * 0.32, c * 0.22, rnd() * 3, 0, TAU); g.fill();
      g.strokeStyle = '#8a7650'; g.lineWidth = Math.max(1, c * 0.03); g.stroke();
      if (i === 0) { g.fillStyle = '#e3cf8a'; for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(sx + (rnd() - 0.3) * c * 0.9, sy + (rnd() - 0.5) * c * 0.5, Math.max(0.6, c * 0.025), 0, TAU); g.fill(); } }
    }
    g.restore();
  }
  // uma tenda (x, y: o meio; w × l, ang): as duas águas de pano, a cumeeira, as cordas; rasgada: furos e o pano caído
  function tenda(g, o, c, rnd) {
    const L = (o.l || 2.4) * c, Wd = (o.w || 1.8) * c, cor = o.cor || '#b8a27a';
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    g.globalAlpha = 0.35; g.fillStyle = '#000'; g.fillRect(-L / 2 + c * 0.15, -Wd / 2 + c * 0.2, L, Wd); g.globalAlpha = 1;
    // as cordas e as estacas
    g.strokeStyle = 'rgba(70,55,35,0.8)'; g.lineWidth = Math.max(1, c * 0.025);
    for (const [px, py] of [[-L / 2, -Wd / 2], [L / 2, -Wd / 2], [-L / 2, Wd / 2], [L / 2, Wd / 2]]) { g.beginPath(); g.moveTo(px, py); g.lineTo(px * 1.25, py * 1.45); g.stroke(); g.fillStyle = MAD.esc; g.fillRect(px * 1.25 - 2, py * 1.45 - 2, 4, 4); }
    g.fillStyle = tom(cor, 0.12); g.fillRect(-L / 2, -Wd / 2, L, Wd / 2);
    g.fillStyle = tom(cor, -0.18); g.fillRect(-L / 2, 0, L, Wd / 2);
    g.strokeStyle = tom(cor, -0.45); g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L / 2, 0); g.stroke();
    g.strokeRect(-L / 2, -Wd / 2, L, Wd);
    if (o.rasgada) {
      g.fillStyle = 'rgba(25,18,10,0.85)';
      for (let i = 0; i < 3; i++) { const fx = (rnd() - 0.5) * L * 0.8, fy = (rnd() - 0.5) * Wd * 0.8; g.beginPath(); g.moveTo(fx, fy); for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU, d = c * (0.12 + rnd() * 0.18); g.lineTo(fx + Math.cos(an) * d, fy + Math.sin(an) * d); } g.closePath(); g.fill(); }
      // um pedaço do pano caído para fora
      g.fillStyle = tom(cor, -0.08); g.beginPath(); g.moveTo(L / 2, -Wd * 0.2); g.lineTo(L / 2 + c * 0.7, -Wd * 0.05); g.lineTo(L / 2 + c * 0.5, Wd * 0.35); g.lineTo(L / 2, Wd * 0.25); g.closePath(); g.fill();
    }
    g.restore();
  }
  // a fogueira apagada: a roda de pedras, o carvão e a cinza
  function fogueiraApagada(g, o, c, rnd) {
    const X = o.x * c, Y = o.y * c, R = c * 0.5;
    g.save();
    g.fillStyle = 'rgba(40,36,32,0.8)'; g.beginPath(); g.arc(X, Y, R * 0.8, 0, TAU); g.fill();
    g.fillStyle = '#8a8580'; for (let i = 0; i < 12; i++) { const an = rnd() * TAU, d = rnd() * R * 0.6; g.globalAlpha = 0.6; g.beginPath(); g.arc(X + Math.cos(an) * d, Y + Math.sin(an) * d, R * (0.06 + rnd() * 0.08), 0, TAU); g.fill(); }
    g.globalAlpha = 1; g.fillStyle = '#1a1512'; for (let i = 0; i < 3; i++) { g.save(); g.translate(X, Y); g.rotate(rnd() * 3); g.fillRect(-R * 0.5, -R * 0.07, R, R * 0.14); g.restore(); }
    for (let i = 0; i < 9; i++) { const an = (i / 9) * TAU; g.fillStyle = i % 2 ? '#7a7672' : '#5f5b57'; g.beginPath(); g.arc(X + Math.cos(an) * R, Y + Math.sin(an) * R, R * 0.2, 0, TAU); g.fill(); }
    g.restore();
  }
  /* A ossada gigante (x, y: o meio do crânio; ang: para onde a espinha vai; L: o comprimento, em quadrados): o crânio
     com os chifres, a espinha e as costelas em arco, meio enterradas. */
  function ossada(g, o, c, rnd) {
    const L = (o.L || 10) * c, osso = ['#efe6d0', '#d8ccb0', '#a8987a'];
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    g.lineCap = 'round';
    // a sombra da espinha e das costelas
    g.globalAlpha = 0.25; g.strokeStyle = '#000'; g.lineWidth = c * 0.5; g.beginPath(); g.moveTo(c * 0.6, c * 0.25); g.lineTo(L, c * 0.25); g.stroke(); g.globalAlpha = 1;
    // as costelas (arcos dos dois lados da espinha, mais curtas para trás)
    for (let i = 0; i < 9; i++) {
      const t = 0.18 + i * 0.075, px = t * L, larg = c * (2.6 - i * 0.18);
      for (const s of [-1, 1]) {
        g.strokeStyle = osso[2]; g.lineWidth = c * 0.3; g.beginPath(); g.moveTo(px, 0); g.quadraticCurveTo(px + c * 0.5, s * larg * 0.75, px - c * 0.25, s * larg); g.stroke();
        g.strokeStyle = osso[0]; g.lineWidth = c * 0.18; g.beginPath(); g.moveTo(px, 0); g.quadraticCurveTo(px + c * 0.5, s * larg * 0.75, px - c * 0.25, s * larg); g.stroke();
      }
    }
    // a espinha: as vértebras em fila
    for (let t = 0.12; t < 1; t += 0.035) { const px = t * L, rr = c * (0.32 - t * 0.18); g.fillStyle = osso[1]; g.beginPath(); g.arc(px, 0, rr, 0, TAU); g.fill(); g.strokeStyle = osso[2]; g.lineWidth = Math.max(1, c * 0.04); g.stroke(); }
    // o crânio: a cabeça comprida, os olhos fundos, o focinho e os chifres
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.beginPath(); g.ellipse(c * 0.2, c * 0.3, c * 1.5, c * 1.05, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
    const gr = g.createRadialGradient(-c * 0.4, -c * 0.3, c * 0.2, 0, 0, c * 1.6); gr.addColorStop(0, osso[0]); gr.addColorStop(1, osso[2]);
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, c * 1.4, c * 0.95, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(-c * 1.5, 0, c * 0.9, c * 0.55, 0, 0, TAU); g.fill();
    g.fillStyle = '#2a2018'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(-c * 0.35, s * c * 0.42, c * 0.32, c * 0.22, s * 0.3, 0, TAU); g.fill(); }
    g.beginPath(); g.ellipse(-c * 2.05, -c * 0.15, c * 0.12, c * 0.08, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-c * 2.05, c * 0.15, c * 0.12, c * 0.08, 0, 0, TAU); g.fill();
    g.strokeStyle = osso[1]; g.lineWidth = c * 0.28;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(c * 0.6, s * c * 0.6); g.quadraticCurveTo(c * 1.6, s * c * 1.6, c * 0.9, s * c * 2.3); g.stroke(); }
    g.strokeStyle = osso[2]; g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.ellipse(0, 0, c * 1.4, c * 0.95, 0, 0, TAU); g.stroke();
    // a areia cobrindo pedaços (meio enterrada)
    g.globalAlpha = 0.55; g.fillStyle = o.chao || '#c9a86a';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse((0.3 + rnd() * 0.7) * L, (rnd() - 0.5) * c * 3.5, c * (0.5 + rnd() * 0.8), c * (0.25 + rnd() * 0.3), rnd() * 3, 0, TAU); g.fill(); }
    g.restore();
  }
  // as pás do moinho, vistas de cima, sobre o telhado (x, y: o eixo; r: o comprimento das pás)
  function pasDoMoinho(g, o, c, rnd) {
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0.4);
    const R = (o.r || 3) * c;
    for (let i = 0; i < 4; i++) {
      g.save(); g.rotate((i * Math.PI) / 2);
      g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(c * 0.3, c * 0.15, R, c * 0.55); g.globalAlpha = 1;
      g.fillStyle = MAD.esc; g.fillRect(0, -c * 0.07, R, c * 0.14);
      // a grade de ripas e o pano
      g.fillStyle = 'rgba(232,222,196,0.88)'; g.fillRect(R * 0.25, -c * 0.02, R * 0.72, c * 0.5);
      g.strokeStyle = MAD.med; g.lineWidth = Math.max(1, c * 0.03);
      for (let t = 0.25; t <= 0.97; t += 0.12) { g.beginPath(); g.moveTo(R * t, -c * 0.02); g.lineTo(R * t, c * 0.48); g.stroke(); }
      g.strokeRect(R * 0.25, -c * 0.02, R * 0.72, c * 0.5);
      g.restore();
    }
    g.fillStyle = '#3a3a3e'; g.beginPath(); g.arc(0, 0, c * 0.22, 0, TAU); g.fill();
    g.restore();
  }
  // a plantação (x, y, w, h: o retângulo; cultura: 'trigo' | 'milho' | 'horta' | 'arroz'), com as fileiras
  function plantacao(g, o, c, rnd) {
    const x = o.x * c, y = o.y * c, w = o.w * c, hh = o.h * c, deitada = o.w >= o.h;
    g.save();
    const fundo = { trigo: '#9a7e3a', milho: '#5a4a2a', horta: '#5e4128', arroz: '#3f6a5a' }[o.cultura] || '#5e4128';
    g.fillStyle = fundo; g.fillRect(x, y, w, hh);
    const n = Math.max(2, Math.round((deitada ? o.h : o.w) * 2.4));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      if (o.cultura === 'trigo') {
        g.strokeStyle = k % 2 ? '#d9b44f' : '#e6c568'; g.lineWidth = (deitada ? hh : w) / n * 0.85; g.beginPath();
        if (deitada) { g.moveTo(x, y + hh * t); g.lineTo(x + w, y + hh * t); } else { g.moveTo(x + w * t, y); g.lineTo(x + w * t, y + hh); }
        g.stroke();
        g.fillStyle = '#f4dd8a'; for (let u = 0; u < (deitada ? o.w : o.h) * 3; u++) { const px = deitada ? x + rnd() * w : x + w * t, py = deitada ? y + hh * t : y + rnd() * hh; g.globalAlpha = 0.7; g.beginPath(); g.arc(px + (rnd() - 0.5) * c * 0.1, py + (rnd() - 0.5) * c * 0.1, Math.max(0.6, c * 0.03), 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      } else {
        const cores = o.cultura === 'milho' ? ['#4f7a2e', '#5f8a36', '#6f9a3e'] : o.cultura === 'arroz' ? ['#6aa05a', '#7ab06a', '#5a9050'] : ['#5f9a3a', '#7ab04a', '#4f8a32'];
        g.strokeStyle = '#3e2a16'; g.lineWidth = Math.max(1, c * 0.1); g.beginPath();
        if (deitada) { g.moveTo(x + c * 0.15, y + hh * t); g.lineTo(x + w - c * 0.15, y + hh * t); } else { g.moveTo(x + w * t, y + c * 0.15); g.lineTo(x + w * t, y + hh - c * 0.15); }
        g.stroke();
        for (let u = 0.25; u < (deitada ? o.w : o.h) - 0.15; u += o.cultura === 'milho' ? 0.45 : 0.35) {
          const px = deitada ? x + u * c : x + w * t, py = deitada ? y + hh * t : y + u * c, rr = c * (o.cultura === 'milho' ? 0.18 : 0.1);
          g.fillStyle = cores[Math.floor(rnd() * 3)]; g.beginPath(); g.arc(px, py, rr * (0.8 + rnd() * 0.4), 0, TAU); g.fill();
          if (o.cultura === 'milho') { g.strokeStyle = '#86b04a'; g.lineWidth = Math.max(1, c * 0.03); for (let f = 0; f < 4; f++) { const an = rnd() * TAU; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(an) * rr * 1.8, py + Math.sin(an) * rr * 1.8); g.stroke(); } }
        }
      }
    }
    g.strokeStyle = 'rgba(60,40,20,0.6)'; g.lineWidth = Math.max(1, c * 0.05); g.strokeRect(x, y, w, hh);
    g.restore();
  }
  // a cerca de madeira (pts: a linha, em quadrados): os mourões e as duas ripas
  function cerca(g, pts, c, rnd) {
    g.save(); g.lineCap = 'round';
    g.globalAlpha = 0.3; g.strokeStyle = '#000'; g.lineWidth = c * 0.1; g.save(); g.translate(c * 0.06, c * 0.08); poli(g, pts, c); g.stroke(); g.restore(); g.globalAlpha = 1;
    for (const off of [-0.05, 0.05]) { g.strokeStyle = off < 0 ? MAD.cla : MAD.med; g.lineWidth = Math.max(1, c * 0.05); g.save(); g.translate(0, off * c); poli(g, pts, c); g.stroke(); g.restore(); }
    const L = compr(pts);
    for (let t = 0; t <= L; t += 1) { const p = aoLongo(pts, L ? t / L : 0); g.fillStyle = MAD.esc; g.beginPath(); g.arc(p.x * c, p.y * c, c * 0.08, 0, TAU); g.fill(); }
    g.restore();
  }
  // um fardo de feno redondo (visto de cima: a espiral)
  function feno(g, o, c) {
    const X = o.x * c, Y = o.y * c, R = (o.r || 0.45) * c;
    g.save();
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.beginPath(); g.arc(X + R * 0.2, Y + R * 0.25, R, 0, TAU); g.fill(); g.globalAlpha = 1;
    g.fillStyle = '#d9b44f'; g.beginPath(); g.arc(X, Y, R, 0, TAU); g.fill();
    g.strokeStyle = '#a3802f'; g.lineWidth = Math.max(1, R * 0.08); g.beginPath();
    for (let a = 0; a < TAU * 3; a += 0.3) { const d = (a / (TAU * 3)) * R * 0.9, px = X + Math.cos(a) * d, py = Y + Math.sin(a) * d; if (a) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
    g.restore();
  }
  // o espantalho (os paus em cruz, o casaco, o chapéu de palha)
  function espantalho(g, o, c, rnd) {
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(-c * 0.55 + c * 0.1, -c * 0.08 + c * 0.12, c * 1.1, c * 0.2); g.globalAlpha = 1;
    g.fillStyle = MAD.esc; g.fillRect(-c * 0.6, -c * 0.05, c * 1.2, c * 0.1);
    g.fillStyle = '#6a4a6a'; g.fillRect(-c * 0.32, -c * 0.2, c * 0.64, c * 0.4);
    g.fillStyle = '#5a3a5a'; g.fillRect(-c * 0.32, -c * 0.2, c * 0.64, c * 0.08);
    g.fillStyle = '#d9b44f'; g.beginPath(); g.arc(0, 0, c * 0.26, 0, TAU); g.fill();
    g.fillStyle = '#c29a3a'; g.beginPath(); g.arc(0, 0, c * 0.14, 0, TAU); g.fill();
    g.strokeStyle = '#e3cf8a'; g.lineWidth = Math.max(1, c * 0.025); for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(s * c * 0.6, 0); g.lineTo(s * c * (0.72 + rnd() * 0.1), (rnd() - 0.5) * c * 0.2); g.stroke(); }
    g.restore();
  }
  /* A ponte (x, y: o meio; comp × larg; ang: o sentido de quem atravessa), de madeira, de pedra ou de corda (as
     tábuas soltas presas nas cordas, com os vãos). */
  function ponte(g, o, c, rnd, est) {
    const L = o.comp * c, Wd = o.larg * c;
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    if (o.mat === 'tronco') {
      // um tronco atravessado (a casca, os nós) e as pontas cortadas
      g.globalAlpha = 0.35; g.fillStyle = '#000'; g.fillRect(-L / 2 + c * 0.1, -Wd / 2 + c * 0.22, L, Wd); g.globalAlpha = 1;
      const gr = g.createLinearGradient(0, -Wd / 2, 0, Wd / 2); gr.addColorStop(0, '#8a6a44'); gr.addColorStop(0.5, '#6b4a2b'); gr.addColorStop(1, '#3e2a18');
      g.fillStyle = gr; g.fillRect(-L / 2, -Wd / 2, L, Wd);
      g.strokeStyle = 'rgba(30,20,10,0.5)'; g.lineWidth = Math.max(1, c * 0.04);
      for (let k = 0; k < 3; k++) { const yy = -Wd / 2 + (k + 1) * Wd / 4; g.beginPath(); g.moveTo(-L / 2, yy); g.lineTo(L / 2, yy + (rnd() - 0.5) * c * 0.06); g.stroke(); }
      g.fillStyle = '#c9a26b'; for (const px of [-L / 2, L / 2]) { g.beginPath(); g.ellipse(px, 0, c * 0.1, Wd / 2, 0, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(110,150,70,0.5)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse((rnd() - 0.5) * L * 0.8, (rnd() - 0.5) * Wd * 0.5, c * 0.18, c * 0.08, 0, 0, TAU); g.fill(); }
    } else if (o.mat === 'neve') {
      // a ponte de neve sobre a fenda: um arco branco, com a sombra azul nas beiras
      g.globalAlpha = 0.3; g.fillStyle = '#4a6a86'; g.fillRect(-L / 2, -Wd / 2 + c * 0.2, L, Wd); g.globalAlpha = 1;
      g.fillStyle = '#eef4f8'; g.beginPath(); g.moveTo(-L / 2, -Wd / 2); g.quadraticCurveTo(0, -Wd / 2 - c * 0.15, L / 2, -Wd / 2); g.lineTo(L / 2, Wd / 2); g.quadraticCurveTo(0, Wd / 2 + c * 0.15, -L / 2, Wd / 2); g.closePath(); g.fill();
      g.strokeStyle = '#9fbdd2'; g.lineWidth = Math.max(1, c * 0.06); g.stroke();
      g.fillStyle = 'rgba(160,190,210,0.5)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse((rnd() - 0.5) * L * 0.8, (rnd() - 0.5) * Wd * 0.6, c * 0.12, c * 0.05, 0, 0, TAU); g.fill(); }
    } else if (o.mat === 'corda') {
      // as tábuas (com vãos), as cordas dos lados e as estacas das pontas
      g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(-L / 2, -Wd / 2 + c * 0.25, L, Wd); g.globalAlpha = 1;
      for (let x = -L / 2; x < L / 2 - c * 0.2; x += c * 0.34) { if (rnd() < 0.1) continue; g.fillStyle = rnd() < 0.5 ? MAD.cla : MAD.med; g.save(); g.translate(x + c * 0.14, 0); g.rotate((rnd() - 0.5) * 0.12); g.fillRect(-c * 0.12, -Wd / 2, c * 0.24, Wd); g.restore(); }
      g.strokeStyle = '#c9a86a'; g.lineWidth = Math.max(1.5, c * 0.06);
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-L / 2, s * Wd / 2); g.quadraticCurveTo(0, s * Wd / 2 + c * 0.25 * s, L / 2, s * Wd / 2); g.stroke(); }
      g.fillStyle = MAD.esc; for (const px of [-L / 2, L / 2]) for (const s of [-1, 1]) { g.beginPath(); g.arc(px, s * Wd / 2, c * 0.14, 0, TAU); g.fill(); }
    } else {
      const pedra2 = o.mat === 'pedra' || (!o.mat && (est === 'anao' || est === 'desertico'));
      g.globalAlpha = 0.35; g.fillStyle = '#000'; g.fillRect(-L / 2 + c * 0.1, -Wd / 2 + c * 0.25, L, Wd); g.globalAlpha = 1;
      g.fillStyle = pedra2 ? '#4b4f57' : '#5b3f22'; g.fillRect(-L / 2 - c * 0.1, -Wd / 2 - c * 0.1, L + c * 0.2, Wd + c * 0.2);
      for (let x = -L / 2; x < L / 2; x += c * 0.33) { const s = rnd(); g.fillStyle = pedra2 ? (s < 0.5 ? '#7d828c' : '#6b7079') : s < 0.33 ? '#8a6238' : s < 0.66 ? '#7c5631' : '#946b3f'; g.fillRect(x + 1, -Wd / 2, c * 0.33 - 2, Wd); }
      g.fillStyle = est === 'oriental' && !pedra2 ? '#a8302a' : pedra2 ? '#3d4148' : '#3d2914';
      g.fillRect(-L / 2, -Wd / 2 - c * 0.14, L, c * 0.16); g.fillRect(-L / 2, Wd / 2 - c * 0.02, L, c * 0.16);
    }
    g.restore();
  }
  // a passarela de tábuas sobre a água (pts: a linha; larg), com os postes nas curvas
  function passarela(g, pts, larg, c, rnd) {
    g.save(); g.lineCap = 'butt'; g.lineJoin = 'round';
    g.globalAlpha = 0.35; g.save(); g.translate(c * 0.12, c * 0.18); poli(g, pts, c); g.strokeStyle = '#000'; g.lineWidth = larg * c; g.stroke(); g.restore();
    g.globalAlpha = 1; poli(g, pts, c); g.strokeStyle = MAD.borda; g.lineWidth = larg * c + 2; g.stroke();
    poli(g, pts, c); g.strokeStyle = MAD.med; g.lineWidth = larg * c; g.stroke();
    // as tábuas atravessadas
    const L = compr(pts);
    for (let t = 0; t < L; t += 0.3) {
      const p = aoLongo(pts, t / L), ux = Math.cos(p.ang + Math.PI / 2), uy = Math.sin(p.ang + Math.PI / 2);
      g.strokeStyle = rnd() < 0.5 ? MAD.cla : '#8a6238'; g.lineWidth = c * 0.22;
      g.beginPath(); g.moveTo((p.x - ux * larg * 0.48) * c, (p.y - uy * larg * 0.48) * c); g.lineTo((p.x + ux * larg * 0.48) * c, (p.y + uy * larg * 0.48) * c); g.stroke();
    }
    g.fillStyle = MAD.borda;
    for (const [x, y] of pts) for (const s of [-1, 1]) { g.beginPath(); g.arc((x + s * larg * 0.45) * c, y * c, c * 0.09, 0, TAU); g.fill(); }
    g.restore();
  }
  // as pedras de atravessar (pts: os lugares), chatas, por cima da água
  function pedrasDePassar(g, pts, c, rnd, cores) {
    cores = cores || ['#8a8a84', '#7a7a74'];
    g.save();
    for (const [x, y] of pts) {
      g.globalAlpha = 0.35; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x * c + c * 0.06, y * c + c * 0.08, c * 0.36, c * 0.26, 0, 0, TAU); g.fill();
      g.globalAlpha = 1; g.fillStyle = rnd() < 0.5 ? cores[0] : cores[1]; g.beginPath(); g.ellipse(x * c, y * c, c * 0.36, c * 0.27, rnd() * 3, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(x * c - c * 0.08, y * c - c * 0.06, c * 0.16, c * 0.1, 0, 0, TAU); g.fill();
      g.strokeStyle = '#4f7a3a'; g.globalAlpha = 0.5; g.lineWidth = Math.max(1, c * 0.04); g.beginPath(); g.arc(x * c, y * c, c * 0.3, 2.4, 3.6); g.stroke();
    }
    g.restore();
  }
  // a fenda (pts: a linha; larg; brilho: a cor do que brilha lá dentro, ou null): o rasgo escuro e as rachaduras
  function fenda(g, pts, larg, c, rnd, brilho, cores) {
    cores = cores || ['#2a2622', '#0e0c0b'];
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    // o rasgo, em zigue-zague
    const zig = [];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.4)); for (let k = 0; k < n; k++) { const t = k / n, nx = -(b[1] - a[1]), ny = b[0] - a[0], L = Math.hypot(nx, ny) || 1, off = (rnd() - 0.5) * larg * 0.6; zig.push([a[0] + (b[0] - a[0]) * t + nx / L * off, a[1] + (b[1] - a[1]) * t + ny / L * off]); } }
    zig.push(pts[pts.length - 1]);
    if (brilho) { for (const [lw, a] of [[larg * 3.2, 0.1], [larg * 2, 0.18]]) { g.globalAlpha = a; poli(g, zig, c); g.strokeStyle = brilho; g.lineWidth = lw * c; g.stroke(); } }
    g.globalAlpha = 1; poli(g, zig, c); g.strokeStyle = cores[0]; g.lineWidth = (larg + 0.25) * c; g.stroke();
    poli(g, zig, c); g.strokeStyle = cores[1]; g.lineWidth = larg * c; g.stroke();
    if (brilho) { poli(g, zig, c); g.globalAlpha = 0.9; g.strokeStyle = brilho; g.lineWidth = Math.max(1.5, larg * 0.3 * c); g.stroke(); g.globalAlpha = 0.7; g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1, larg * 0.08 * c); g.stroke(); }
    // as rachaduras que saem do rasgo
    g.globalAlpha = 0.6; g.strokeStyle = cores[1]; g.lineWidth = Math.max(1, c * 0.05);
    for (let i = 0; i < zig.length; i += 2) { let [x, y] = zig[i], a = rnd() * TAU; g.beginPath(); g.moveTo(x * c, y * c); for (let k = 0; k < 3; k++) { a += (rnd() - 0.5) * 1.2; x += Math.cos(a) * (0.3 + rnd() * 0.5); y += Math.sin(a) * (0.3 + rnd() * 0.5); g.lineTo(x * c, y * c); } g.stroke(); }
    g.restore();
  }
  // uma coluna de basalto vista de cima (x, y: o meio; r; alt: a altura, que clareia o topo e alonga a sombra)
  function basalto(g, o, c, rnd) {
    const X = o.x * c, Y = o.y * c, R = (o.r || 0.6) * c, alt = o.alt || 1, hex = k => { g.beginPath(); for (let i = 0; i < 6; i++) { const an = Math.PI / 6 + (i * Math.PI) / 3; const px = X + Math.cos(an) * R * k, py = Y + Math.sin(an) * R * k; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); };
    g.save();
    g.globalAlpha = 0.45; g.fillStyle = '#000'; g.save(); g.translate(R * 0.25 * alt, R * 0.3 * alt); hex(1); g.fill(); g.restore(); g.globalAlpha = 1;
    const s = 48 + Math.round(alt * 14) + Math.floor(rnd() * 12);
    hex(1); g.fillStyle = `rgb(${s},${s - 4},${s - 8})`; g.fill();
    hex(0.78); g.fillStyle = `rgb(${s + 10},${s + 6},${s + 2})`; g.fill();
    hex(1); g.strokeStyle = '#141110'; g.lineWidth = Math.max(1, c * 0.04); g.stroke();
    g.restore();
  }
  // as raízes grossas em arco (pts: a linha; larg), saindo da água e voltando para ela
  function raiz(g, pts, larg, c) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.globalAlpha = 0.3; g.save(); g.translate(c * 0.1, c * 0.14); poli(g, pts, c); g.strokeStyle = '#000'; g.lineWidth = larg * c; g.stroke(); g.restore();
    g.globalAlpha = 1; poli(g, pts, c); g.strokeStyle = '#2e2216'; g.lineWidth = larg * c + 2; g.stroke();
    poli(g, pts, c); g.strokeStyle = '#5a4430'; g.lineWidth = larg * c; g.stroke();
    poli(g, pts, c); g.strokeStyle = '#7a6044'; g.globalAlpha = 0.6; g.lineWidth = larg * 0.35 * c; g.stroke();
    g.restore();
  }
  /* O tronco gigante caído (de a até b: a ponta da raiz até a da copa; r: o raio do tronco, em quadrados): a casca, a
     bola de raízes arrancada na ponta e os galhos quebrados com o resto da copa na outra. */
  function troncoGigante(g, o, c, rnd, pal) {
    const ax = o.a[0] * c, ay = o.a[1] * c, bx = o.b[0] * c, by = o.b[1] * c, R = o.r * c, ang = Math.atan2(by - ay, bx - ax), L = Math.hypot(bx - ax, by - ay);
    g.save(); g.translate(ax, ay); g.rotate(ang); g.lineCap = 'round';
    g.globalAlpha = 0.4; g.fillStyle = '#000'; g.fillRect(0, -R + R * 0.5, L, R * 2); g.globalAlpha = 1;
    // a copa quebrada, na ponta (galhos e folhas murchas)
    for (let i = 0; i < 7; i++) { const an = (rnd() - 0.5) * 2.4, l = R * (1.6 + rnd() * 1.4); g.strokeStyle = '#4e3420'; g.lineWidth = R * 0.25; g.beginPath(); g.moveTo(L - R, 0); g.lineTo(L - R + Math.cos(an) * l, Math.sin(an) * l); g.stroke(); }
    const cores = (PAL[pal] || PAL.floresta).copa;
    for (let i = 0; i < 9; i++) { const an = (rnd() - 0.5) * 2.4, d = R * (1 + rnd() * 1.8); g.globalAlpha = 0.85; g.fillStyle = cores[i % cores.length]; g.beginPath(); g.arc(L - R + Math.cos(an) * d, Math.sin(an) * d, R * (0.5 + rnd() * 0.5), 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    // o tronco: a casca (listras ao comprido) e a luz em cima
    const gr = g.createLinearGradient(0, -R, 0, R); gr.addColorStop(0, '#7a5a3a'); gr.addColorStop(0.45, '#5a3f26'); gr.addColorStop(1, '#2e2014');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -R); g.lineTo(L - R * 0.6, -R * 0.82); g.lineTo(L - R * 0.6, R * 0.82); g.lineTo(0, R); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(30,20,10,0.55)'; g.lineWidth = Math.max(1, c * 0.05);
    for (let k = 0; k < 9; k++) { const yy = -R * 0.85 + (k / 8) * R * 1.7; g.beginPath(); g.moveTo(R * 0.3 + rnd() * R, yy); for (let x = R; x < L - R; x += R * 0.8) g.lineTo(x, yy + (rnd() - 0.5) * R * 0.12); g.stroke(); }
    g.fillStyle = 'rgba(120,150,80,0.45)'; for (let i = 0; i < 10; i++) { g.beginPath(); g.ellipse(R + rnd() * (L - 2 * R), (rnd() - 0.5) * R * 1.4, R * 0.35, R * 0.18, 0, 0, TAU); g.fill(); }
    // a bola de raízes arrancada (com a terra presa)
    g.fillStyle = '#3a2a1a'; g.beginPath(); g.ellipse(0, 0, R * 0.7, R * 1.6, 0, 0, TAU); g.fill();
    g.strokeStyle = '#4e3420'; g.lineWidth = R * 0.18;
    for (let i = 0; i < 12; i++) { const an = Math.PI / 2 + (i / 11) * Math.PI + (rnd() - 0.5) * 0.3, l = R * (1.4 + rnd() * 0.9); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(an) * l * 0.6, Math.sin(an) * l * 0.9, Math.cos(an) * l, Math.sin(an) * l * 1.3); g.stroke(); }
    g.fillStyle = '#5a4430'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(-R * (0.2 + rnd() * 0.6), (rnd() - 0.5) * R * 2.4, R * (0.15 + rnd() * 0.2), 0, TAU); g.fill(); }
    g.restore();
  }
  // a base do tronco colossal (x, y; r: o raio do tronco): os anéis da casca, as raízes enormes e as manchas de luz
  function troncoColossal(g, o, c, rnd) {
    const X = o.x * c, Y = o.y * c, R = o.r * c;
    g.save(); g.lineCap = 'round';
    // as raízes, para fora (largas perto do tronco): as do plano, se ele as deu
    const raizes = o.raizes || Array.from({ length: 9 }, (_, i) => { const an = (i / 9) * TAU + rnd() * 0.4, l = o.r * (1.8 + rnd() * 1.4); return [[o.x, o.y], [o.x + Math.cos(an + 0.2) * l * 0.55, o.y + Math.sin(an + 0.2) * l * 0.55], [o.x + Math.cos(an) * l, o.y + Math.sin(an) * l]]; });
    for (const rz of raizes) {
      const mx = rz[1][0] * c, my = rz[1][1] * c, ex = rz[2][0] * c, ey = rz[2][1] * c;
      g.globalAlpha = 0.35; g.strokeStyle = '#000'; g.lineWidth = R * 0.42; g.beginPath(); g.moveTo(X + R * 0.12, Y + R * 0.16); g.quadraticCurveTo(mx + R * 0.12, my + R * 0.16, ex + R * 0.12, ey + R * 0.16); g.stroke();
      g.globalAlpha = 1; g.strokeStyle = '#3e2c1c'; g.lineWidth = R * 0.4; g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
      g.strokeStyle = '#5e4430'; g.lineWidth = R * 0.22; g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
      g.strokeStyle = 'rgba(140,170,90,0.4)'; g.lineWidth = R * 0.08; g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
    }
    g.globalAlpha = 0.45; g.fillStyle = '#000'; g.beginPath(); g.arc(X + R * 0.15, Y + R * 0.2, R * 1.02, 0, TAU); g.fill(); g.globalAlpha = 1;
    const gr = g.createRadialGradient(X - R * 0.35, Y - R * 0.4, R * 0.1, X, Y, R); gr.addColorStop(0, '#7a5a3a'); gr.addColorStop(0.7, '#5a3f26'); gr.addColorStop(1, '#3a2818');
    g.fillStyle = gr; g.beginPath(); g.arc(X, Y, R, 0, TAU); g.fill();
    // a casca em placas, o musgo
    g.strokeStyle = 'rgba(30,20,10,0.5)'; g.lineWidth = Math.max(1, c * 0.05);
    for (let i = 0; i < 18; i++) { const an = rnd() * TAU, d1 = R * (0.2 + rnd() * 0.5); g.beginPath(); g.moveTo(X + Math.cos(an) * d1, Y + Math.sin(an) * d1); g.lineTo(X + Math.cos(an + 0.15) * R * 0.95, Y + Math.sin(an + 0.15) * R * 0.95); g.stroke(); }
    g.fillStyle = 'rgba(110,150,70,0.5)'; for (let i = 0; i < 12; i++) { const an = rnd() * TAU, d = R * (0.4 + rnd() * 0.55); g.beginPath(); g.ellipse(X + Math.cos(an) * d, Y + Math.sin(an) * d, R * 0.14, R * 0.08, an, 0, TAU); g.fill(); }
    g.restore();
  }
  // a sombra das folhas lá do alto (as copas gigantes não aparecem: só a luz salpicada no chão)
  function luzSalpicada(g, W, H, c, rnd) {
    g.save();
    for (let i = 0, n = Math.round(W * H * 0.08); i < n; i++) { g.globalAlpha = 0.16; g.fillStyle = '#0a1a08'; const rr = c * (1.2 + rnd() * 2.5); g.beginPath(); g.ellipse(rnd() * W * c, rnd() * H * c, rr, rr * 0.7, rnd() * 3, 0, TAU); g.fill(); }
    for (let i = 0, n = Math.round(W * H * 0.05); i < n; i++) { g.globalAlpha = 0.12; g.fillStyle = '#e8f0a0'; const rr = c * (0.2 + rnd() * 0.5); g.beginPath(); g.ellipse(rnd() * W * c, rnd() * H * c, rr, rr * 0.7, rnd() * 3, 0, TAU); g.fill(); }
    g.restore();
  }
  // a beira da cratera do vulcão (x, y: o meio; rx × ry), com as rochas escuras e a cinza
  function cratera(g, o, c, rnd) {
    const X = o.x * c, Y = o.y * c, RX = o.rx * c, RY = o.ry * c;
    g.save();
    for (const [k, cor, lw] of [[1.18, 'rgba(0,0,0,0.35)', 0.9], [1.08, '#3a302b', 1.1], [1.02, '#5a4a40', 0.5], [0.97, '#241c19', 0.3]]) { g.strokeStyle = cor; g.lineWidth = lw * c; g.beginPath(); g.ellipse(X, Y, RX * k, RY * k, 0, 0, TAU); g.stroke(); }
    for (let i = 0; i < 40; i++) { const an = rnd() * TAU, k = 1.0 + rnd() * 0.22; g.fillStyle = rnd() < 0.5 ? '#4a3f3a' : '#2e2724'; g.beginPath(); g.arc(X + Math.cos(an) * RX * k, Y + Math.sin(an) * RY * k, c * (0.12 + rnd() * 0.25), 0, TAU); g.fill(); }
    g.restore();
  }
  // um barco a remo (x, y: o meio; ang; L: o comprimento), com os bancos e os remos
  function barco(g, o, c, rnd) {
    const L = (o.L || 3) * c, Wd = L * 0.36;
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    const casco = () => { g.beginPath(); g.moveTo(-L / 2, -Wd * 0.38); g.quadraticCurveTo(-L * 0.1, -Wd * 0.55, L * 0.25, -Wd * 0.45); g.quadraticCurveTo(L * 0.48, -Wd * 0.2, L / 2, 0); g.quadraticCurveTo(L * 0.48, Wd * 0.2, L * 0.25, Wd * 0.45); g.quadraticCurveTo(-L * 0.1, Wd * 0.55, -L / 2, Wd * 0.38); g.closePath(); };
    g.globalAlpha = 0.35; g.save(); g.translate(c * 0.12, c * 0.18); casco(); g.fillStyle = '#000'; g.fill(); g.restore(); g.globalAlpha = 1;
    casco(); g.fillStyle = MAD.esc; g.fill(); g.save(); casco(); g.clip();
    g.fillStyle = MAD.med; g.beginPath(); g.ellipse(0, 0, L * 0.46, Wd * 0.36, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(40,25,10,0.5)'; g.lineWidth = Math.max(1, c * 0.03); for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(-L / 2, k * Wd * 0.12); g.lineTo(L / 2, k * Wd * 0.12); g.stroke(); }
    g.restore();
    g.fillStyle = MAD.cla; for (const t of [-0.22, 0.12]) g.fillRect(t * L - c * 0.12, -Wd * 0.4, c * 0.24, Wd * 0.8);
    g.strokeStyle = MAD.borda; g.lineWidth = Math.max(1.5, c * 0.06); casco(); g.stroke();
    // os remos
    g.strokeStyle = '#8a6238'; g.lineWidth = Math.max(1, c * 0.06);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-L * 0.05, 0); g.lineTo(-L * 0.25, s * Wd * 1.2); g.stroke(); g.fillStyle = '#8a6238'; g.beginPath(); g.ellipse(-L * 0.27, s * Wd * 1.3, c * 0.1, c * 0.25, 0.4 * s, 0, TAU); g.fill(); }
    g.restore();
  }
  // o píer (x, y, w, h: o retângulo, em quadrados; deitado: as tábuas no sentido do comprimento)
  function pier(g, o, c, rnd) {
    const x = o.x * c, y = o.y * c, w = o.w * c, hh = o.h * c, deitado = o.w >= o.h;
    g.save();
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(x + c * 0.1, y + c * 0.14, w, hh); g.globalAlpha = 1;
    g.fillStyle = MAD.borda; g.fillRect(x, y, w, hh);
    const n = Math.max(2, Math.round((deitado ? o.h : o.w) * 3));
    for (let i = 0; i < n; i++) { g.fillStyle = [MAD.cla, MAD.med, '#8a6238'][Math.floor(rnd() * 3)]; if (deitado) g.fillRect(x + 1, y + (i * hh) / n + 0.8, w - 2, hh / n - 1.6); else g.fillRect(x + (i * w) / n + 0.8, y + 1, w / n - 1.6, hh - 2); }
    g.fillStyle = '#2e1f10'; for (const [px, py] of [[x, y], [x + w, y], [x, y + hh], [x + w, y + hh]]) { g.beginPath(); g.arc(px, py, c * 0.1, 0, TAU); g.fill(); }
    g.restore();
  }
  // os escombros e os destroços boiando (x, y; r), tábuas soltas e pedaços
  function destrocos(g, o, c, rnd) {
    g.save();
    for (let i = 0; i < (o.n || 10); i++) { const an = rnd() * TAU, d = rnd() * (o.r || 2) * c; g.save(); g.translate(o.x * c + Math.cos(an) * d, o.y * c + Math.sin(an) * d); g.rotate(rnd() * 3); g.globalAlpha = 0.9; g.fillStyle = rnd() < 0.5 ? MAD.med : MAD.esc; g.fillRect(-c * (0.2 + rnd() * 0.3), -c * 0.06, c * (0.4 + rnd() * 0.6), c * 0.12); g.restore(); }
    g.restore();
  }
  // um santuário de beira de estrada (a base de pedra; a estátua e as velas são objetos por cima)
  function santuario(g, o, c, rnd, est) {
    const X = o.x * c, Y = o.y * c, s = c * 1.5;
    g.save();
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(X - s / 2 + c * 0.12, Y - s / 2 + c * 0.16, s, s); g.globalAlpha = 1;
    g.fillStyle = est === 'oriental' ? '#8a857b' : '#6f6a62'; g.fillRect(X - s / 2, Y - s / 2, s, s);
    g.fillStyle = est === 'oriental' ? '#a29d92' : '#857f76'; g.fillRect(X - s / 2 + c * 0.12, Y - s / 2 + c * 0.12, s - c * 0.24, s - c * 0.24);
    // o telhadinho de duas águas por cima da metade de trás (onde fica a imagem)
    const telha = est === 'oriental' ? ['#3a4555', '#2f3846'] : est === 'nordico' ? ['#5f7a3c', '#4a6230'] : ['#9c4a32', '#7a3a26'];
    g.fillStyle = telha[0]; g.fillRect(X - s * 0.62, Y - s * 0.62, s * 1.24, s * 0.4); g.fillStyle = telha[1]; g.fillRect(X - s * 0.62, Y - s * 0.22, s * 1.24, s * 0.12);
    g.strokeStyle = 'rgba(20,14,10,0.8)'; g.lineWidth = Math.max(1, c * 0.05); g.strokeRect(X - s * 0.62, Y - s * 0.62, s * 1.24, s * 0.52);
    g.fillStyle = ['#f2c94c', '#e85d75', '#ffffff'][Math.floor(rnd() * 3)]; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(X + (rnd() - 0.5) * s * 1.3, Y + s * 0.55 + rnd() * c * 0.2, c * 0.06, 0, TAU); g.fill(); }
    g.restore();
  }
  /* O abismo (pts: o contorno, em quadrados): o escuro lá do fundo, as paredes de rocha descendo e a beira de pedras.
     cores: [a beira, a parede, o fundo] (o gelo da fenda é azulado). */
  function abismo(g, pts, c, rnd, cores) {
    cores = cores || ['#6b675e', '#3a3632', '#070606'];
    const [x0, y0, x1, y1] = caixa(pts);
    g.save(); g.lineJoin = 'round';
    poli(g, pts, c, true); g.fillStyle = cores[2]; g.fill();
    g.save(); poli(g, pts, c, true); g.clip();
    // as paredes descendo (faixas da beira para dentro, escurecendo)
    for (const [lw, a] of [[1.6, 0.85], [1.0, 0.75], [0.5, 0.6]]) { g.globalAlpha = a; poli(g, pts, c, true); g.strokeStyle = lw > 1.2 ? Estilos.tom(cores[1], -0.4) : lw > 0.7 ? cores[1] : Estilos.tom(cores[1], 0.2); g.lineWidth = lw * c; g.stroke(); }
    // lá no fundo: a névoa e as saliências de rocha mais abaixo (o abismo grande parece fundo, e não só preto)
    const area = (x1 - x0) * (y1 - y0);
    for (let i = 0, n = Math.round(area * 0.05) + 2; i < n; i++) { const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), rr = c * (1.2 + rnd() * 3); g.globalAlpha = 0.12 + rnd() * 0.1; g.fillStyle = '#5a6270'; g.beginPath(); g.ellipse(x * c, y * c, rr, rr * 0.55, rnd() * 3, 0, TAU); g.fill(); }
    for (let i = 0, n = Math.round(area * 0.03); i < n; i++) { const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), s2 = 0.5 + rnd() * 1.2; g.globalAlpha = 0.5; g.fillStyle = Estilos.tom(cores[1], -0.45); g.beginPath(); for (let k = 0; k < 5; k++) { const an = (k / 5) * TAU + rnd() * 0.6, d = s2 * (0.6 + rnd() * 0.4); const px = (x + Math.cos(an) * d) * c, py = (y + Math.sin(an) * d * 0.7) * c; if (k) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); g.fill(); }
    g.globalAlpha = 0.5; g.strokeStyle = Estilos.tom(cores[1], 0.25); g.lineWidth = Math.max(1, c * 0.04);
    for (let i = 0, n = Math.round((x1 - x0) * (y1 - y0) * 0.3) + 6; i < n; i++) { let x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), a = rnd() * TAU; g.beginPath(); g.moveTo(x * c, y * c); for (let k = 0; k < 3; k++) { a += (rnd() - 0.5); x += Math.cos(a) * 0.4; y += Math.sin(a) * 0.4; g.lineTo(x * c, y * c); } g.stroke(); }
    g.restore();
    // a beira: pedras soltas e a borda clara
    g.globalAlpha = 0.9; poli(g, pts, c, true); g.strokeStyle = cores[0]; g.lineWidth = c * 0.18; g.stroke();
    g.globalAlpha = 1;
    const L = compr(pts.concat([pts[0]]));
    for (let i = 0, n = Math.round(L * 1.2); i < n; i++) { const p = aoLongo(pts.concat([pts[0]]), rnd()); g.fillStyle = rnd() < 0.5 ? cores[0] : Estilos.tom(cores[0], -0.25); g.beginPath(); g.arc((p.x + (rnd() - 0.5) * 0.4) * c, (p.y + (rnd() - 0.5) * 0.4) * c, c * (0.06 + rnd() * 0.1), 0, TAU); g.fill(); }
    g.restore();
  }
  /* O planalto ou o morro (pts: o contorno; alt: a altura): camadas cada vez mais claras para o alto (como curvas de
     nível pintadas) e a sombra da encosta caindo para baixo e à direita. cores: [o alto, a encosta, a sombra]. */
  function planalto(g, pts, c, rnd, cores, alt) {
    const camadas = clamp(Math.round((alt || 3) / 1.5), 1, 4);
    g.save(); g.lineJoin = 'round';
    g.save(); g.translate(c * 0.25 * camadas, c * 0.32 * camadas); suave(g, pts, c); g.globalAlpha = 0.35; g.fillStyle = '#000'; g.fill(); g.restore();
    for (let k = 0; k < camadas; k++) {
      const f = 1 - k * (0.5 / camadas), pp = encolher(pts, f).map(([x, y]) => [x - k * 0.12, y - k * 0.16]);
      suave(g, pp, c); g.globalAlpha = 1; g.fillStyle = Estilos.tom(cores[1], k * 0.07); g.fill();
      g.globalAlpha = 0.45; g.strokeStyle = cores[2]; g.lineWidth = Math.max(1, c * 0.06); g.stroke();
    }
    g.restore();
    // as hachuras da encosta: traços curtos da beira para dentro, como nos mapas antigos (mais curtos quanto mais alto)
    { const [cx, cy] = centro(pts), L = compr(pts.concat([pts[0]])), n = Math.round(L * 2.4); g.save(); g.lineCap = 'round'; g.strokeStyle = cores[2]; g.lineWidth = Math.max(1, c * 0.045);
      for (let i = 0; i < n; i++) { const p = aoLongo(pts.concat([pts[0]]), i / n), dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy) || 1, l = Math.min(d * 0.35, 0.45 + (alt || 3) * 0.12) * (0.7 + rnd() * 0.5); g.globalAlpha = 0.4 + rnd() * 0.2; g.beginPath(); g.moveTo(p.x * c, p.y * c); g.lineTo((p.x + dx / d * l) * c, (p.y + dy / d * l) * c); g.stroke(); }
      g.restore(); }
    // um chão de mato por cima, de leve
    const [x0, y0, x1, y1] = caixa(pts);
    g.save(); suave(g, pts, c); g.clip();
    g.globalAlpha = 0.18; for (let i = 0, n = Math.round((x1 - x0) * (y1 - y0) * 0.8); i < n; i++) { g.fillStyle = rnd() < 0.5 ? cores[0] : cores[2]; const rr = c * (0.2 + rnd() * 0.5); g.beginPath(); g.ellipse((x0 + rnd() * (x1 - x0)) * c, (y0 + rnd() * (y1 - y0)) * c, rr, rr * 0.6, rnd() * 3, 0, TAU); g.fill(); }
    g.restore();
  }
  // a duna (pts: o contorno; ang: de onde sopra o vento): a encosta clara a barlavento, a sombra a sotavento e a crista
  function duna(g, pts, c, rnd, ang) {
    const [cx, cy] = centro(pts), ux = Math.cos(ang), uy = Math.sin(ang);
    g.save(); g.lineJoin = 'round';
    suave(g, pts, c); g.fillStyle = '#d6b679'; g.fill();
    g.save(); suave(g, pts, c); g.clip();
    // a sombra do lado de lá do vento
    const [x0, y0, x1, y1] = caixa(pts), R = Math.max(x1 - x0, y1 - y0);
    const gr = g.createLinearGradient((cx - ux * R / 2) * c, (cy - uy * R / 2) * c, (cx + ux * R / 2) * c, (cy + uy * R / 2) * c);
    gr.addColorStop(0, 'rgba(255,244,210,0.55)'); gr.addColorStop(0.5, 'rgba(255,240,200,0.1)'); gr.addColorStop(0.56, 'rgba(110,70,25,0.45)'); gr.addColorStop(1, 'rgba(110,70,25,0.55)');
    g.fillStyle = gr; g.fillRect(x0 * c, y0 * c, (x1 - x0) * c, (y1 - y0) * c);
    // as ondinhas da areia, de través ao vento
    g.globalAlpha = 0.3; g.strokeStyle = '#b8935a'; g.lineWidth = Math.max(1, c * 0.03);
    for (let i = 0, n = Math.round((x1 - x0) * (y1 - y0) * 0.6); i < n; i++) { const x = (x0 + rnd() * (x1 - x0)) * c, y = (y0 + rnd() * (y1 - y0)) * c, l = c * (0.5 + rnd() * 0.8); g.beginPath(); g.moveTo(x - uy * l / 2, y + ux * l / 2); g.quadraticCurveTo(x + ux * c * 0.15, y + uy * c * 0.15, x + uy * l / 2, y - ux * l / 2); g.stroke(); }
    g.restore();
    // a crista: uma curva clara de um lado a outro, pelo meio, de través ao vento
    g.globalAlpha = 0.9; g.strokeStyle = '#fbeac0'; g.lineWidth = Math.max(1.5, c * 0.1);
    g.beginPath(); g.moveTo((cx - uy * R * 0.42) * c, (cy + ux * R * 0.42) * c); g.quadraticCurveTo((cx + ux * R * 0.15) * c, (cy + uy * R * 0.15) * c, (cx + uy * R * 0.42) * c, (cy - ux * R * 0.42) * c); g.stroke();
    g.restore();
  }
  // a lenha empilhada (x, y: o canto; w × h, deitada no comprimento): os tocos vistos de ponta
  function lenha(g, o, c, rnd) {
    const w = (o.w || 2) * c, hh = (o.h || 0.8) * c;
    g.save(); g.translate(o.x * c, o.y * c);
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(c * 0.1, c * 0.12, w, hh); g.globalAlpha = 1;
    const r = c * 0.13;
    for (let y = r; y < hh; y += r * 1.8) for (let x = r; x < w; x += r * 1.9) { g.fillStyle = '#6b4a2b'; g.beginPath(); g.arc(x + (rnd() - 0.5) * r * 0.3, y, r, 0, TAU); g.fill(); g.fillStyle = '#c9a26b'; g.beginPath(); g.arc(x, y, r * 0.6, 0, TAU); g.fill(); g.strokeStyle = '#8a6238'; g.lineWidth = Math.max(0.6, r * 0.15); g.beginPath(); g.arc(x, y, r * 0.3, 0, TAU); g.stroke(); }
    g.restore();
  }
  // o varal das peles (x, y: o meio; ang): os paus e as peles esticadas secando
  function varal(g, o, c, rnd) {
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(-c + c * 0.1, -c * 0.45 + c * 0.14, c * 2, c * 0.9); g.globalAlpha = 1;
    g.strokeStyle = MAD.esc; g.lineWidth = c * 0.1; g.beginPath(); g.moveTo(-c, -c * 0.4); g.lineTo(c, -c * 0.4); g.stroke();
    for (const x of [-c, c]) { g.fillStyle = MAD.borda; g.beginPath(); g.arc(x, -c * 0.4, c * 0.1, 0, TAU); g.fill(); }
    for (let i = 0; i < 3; i++) { const x = -c * 0.7 + i * c * 0.7; g.fillStyle = ['#8a5a32', '#a0703e', '#6e4626'][i]; g.beginPath(); g.moveTo(x - c * 0.25, -c * 0.38); g.lineTo(x + c * 0.25, -c * 0.38); g.lineTo(x + c * 0.3, c * 0.2); g.quadraticCurveTo(x, c * 0.42, x - c * 0.3, c * 0.2); g.closePath(); g.fill(); g.strokeStyle = 'rgba(40,25,10,0.6)'; g.lineWidth = Math.max(1, c * 0.025); g.stroke(); }
    g.restore();
  }
  // escurece de leve as bordas (o mesmo dos outros geradores)
  function vinheta(g, W, H, c, forte) {
    const w = W * c, h = H * c, vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${forte || 0.22})`);
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
  }
  return { PAL, FIOS, PEDRA, pedraDe, poli, suave, caixa, centro, encolher, aoLongo, compr, chao, mancha, rio, lago, praia, espuma, cachoeira, caminho, penhasco, pedra, arvore, cristais,
    tabuas, carroca, tenda, fogueiraApagada, ossada, pasDoMoinho, plantacao, cerca, feno, espantalho, ponte, passarela, pedrasDePassar, fenda, basalto, raiz, troncoGigante, troncoColossal,
    luzSalpicada, cratera, barco, pier, destrocos, santuario, abismo, planalto, duna, lenha, varal, aguaRasa, vinheta, MAD };
})();
