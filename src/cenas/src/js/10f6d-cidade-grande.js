/* ---------------------------------------------------------------
   10f6d. CIDADE GRANDE — a aba "Cidade grande" (lote 126)
   Uma cidade inteira numa cena só, a 1 quadrado = 5 m, no jeito das cinco cidades grandes do mundo novo (Hemvria, o
   Porto da Baía, a Cidade-fornalha, a Cidade do Eco e a Capital Kitsune): só as muralhas são paredes (os portões são
   portas abertas); as casas são desenho (os telhados do estilo), sem paredes nem Entrada; os lugares com nome (a sede
   do poder, os templos, o mercado, os portões, os ganchos) são marcadores ocultos, com o nome. Cinco traçados:
   · cidade velha com rio: o rio corta a cidade, a cidade velha murada com o castelo e o templo, três pontes;
   · cidade alta e baixa com porto: o mar de um lado, o penhasco no meio, as escadas e a rampa, o cais, os píeres, os
     barcos e o farol no quebra-mar;
   · terraços na encosta: a montanha em cima, os terraços com os muros de arrimo, os canais (de lava, nos estilos anão
     e orc) e o grande portão na montanha;
   · fundo de cânion: as paredes do cânion, as casas escavadas nelas, a arena no meio e os portões nas pontas;
   · palácio no morro: o morro com o palácio murado, as ruas em grade, o rio com os canais e o templo na colina.
   O estilo (o da janela) muda os telhados, as ruas e as muralhas. Cada semente dá outra cidade.
   --------------------------------------------------------------- */
const CidadeGrande = (() => {
  const TAU = Math.PI * 2, MO = Encontro.motor;
  const MODELOS = [['velha', 'Cidade velha com rio'], ['porto', 'Cidade alta e baixa, com porto'], ['terracos', 'Terraços na encosta'], ['canion', 'Fundo de cânion'], ['morro', 'Palácio no morro']];
  const DICA = {
    velha: 'O rio corta a cidade ao meio; a cidade velha, murada, com o castelo e o templo; três pontes; a muralha de fora com quatro portões (como Hemvria)',
    porto: 'O mar de um lado; a cidade alta no penhasco e a baixa no cais, ligadas por escadas e uma rampa; os píeres, os barcos e o farol (como o Porto da Baía)',
    terracos: 'A montanha em cima; os terraços descendo, com os muros de arrimo; os canais; o grande portão na montanha (como a Cidade-fornalha)',
    canion: 'As paredes do cânion dos dois lados, as casas escavadas nelas, a arena no meio e os portões nas pontas (como a Cidade do Eco)',
    morro: 'O morro com o palácio murado; as ruas em grade; o rio com os canais; o templo numa colina (como a Capital Kitsune)',
  };
  const TAMANHOS = { pequena: { n: 'Pequena', W: 100, H: 76 }, media: { n: 'Média', W: 140, H: 104 }, grande: { n: 'Grande', W: 180, H: 136 } };
  const TERRENOS_C = [['campo', 'Campo'], ['floresta', 'Floresta'], ['areia', 'Deserto'], ['neve', 'Neve']];
  const TER_DE = { campo: 'campo', floresta: 'floresta', areia: 'deserto', neve: 'neve' };
  const PEDRA = ['#a8a296', '#8a8478', '#5e594f', '#3e3a33'];
  // as cores das muralhas de cada estilo (as mesmas da Cidade): [média, clara, escura]
  const MUROS = { comum: ['#6e6a62', '#8a857b', '#4f4b45'], oriental: ['#e8e2d3', '#f4efe3', '#2f3846'], nordico: ['#6b4a2b', '#7a5532', '#3b2814'], desertico: ['#c9a46a', '#d8b98a', '#9c7448'], elfico: ['#c8cfc0', '#dde3d4', '#5d8a55'], anao: ['#4b4f57', '#5e646e', '#2f3238'],
    orc: ['#3b2a1e', '#5a3e28', '#1e140c'], konaito: ['#8a4a2c', '#a85e3a', '#4a2414'], kobold: ['#5a5030', '#7a6c40', '#2e2818'], antro: ['#4a3a22', '#5e4a2c', '#3f6a34'], silk: ['#d8d4c8', '#eeeae0', '#3f5f8c'], vampiro: ['#24202a', '#36303e', '#7a1e2a'], magitec: ['#3a4450', '#4e5a68', '#5fd4e6'] };
  const ROCHA = { campo: ['#9a958b', '#77736a', '#4f4c46'], floresta: ['#8e8d82', '#6c6c62', '#474840'], areia: ['#c9a670', '#a5834f', '#6d5434'], neve: ['#bfc6cc', '#929aa2', '#626a72'] };
  const dentroPoli = MO.dentroPoli;
  const caixaDe = pts => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };
  const oval = (cx, cy, rx, ry, n, K, v) => { const out = []; for (let k = 0; k < n; k++) { const a = (k / n) * TAU, f = 1 + (K ? (K.rT() - 0.5) * (v || 0.12) : 0); out.push([cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f]); } return out; };

  /* ---------------- as peças ---------------- */
  // um retângulo livre (todas as casas com o código livre) para uma casa
  function livre(K, x, y, w, h, ok) { ok = ok || (v => v === 0); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!ok(K.at(i, j))) return false; return true; }
  // a muralha: o anel (ou a linha) com as torres; os portões (pontos do anel) ficam abertos. Paredes de verdade.
  function muralha(C, pts, op) {
    const { K, P } = C, fechada = op.fechada !== false, portoes = op.portoes || [], larg = op.larg || 1.1, cores = op.cores || C.muro;
    const n = pts.length, seg = fechada ? n : n - 1;
    for (let i = 0; i < seg; i++) {
      const a = pts[i], b = pts[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 0.1) continue;
      // os vãos dos portões neste trecho
      const vaos = [];
      for (const g of portoes) { const t = ((g[0] - a[0]) * (b[0] - a[0]) + (g[1] - a[1]) * (b[1] - a[1])) / (L * L); if (t <= 0 || t >= 1) continue; const px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t; if (Math.hypot(px - g[0], py - g[1]) < 1.6) vaos.push([t - 1.6 / L, t + 1.6 / L]); }
      vaos.sort((x, y) => x[0] - y[0]);
      let t0 = 0;
      const pedaco = (u0, u1, porta) => {
        if (u1 - u0 <= 0.001) return;
        const p0 = [a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0], p1 = [a[0] + (b[0] - a[0]) * u1, a[1] + (b[1] - a[1]) * u1];
        if (porta) { P.paredes.push({ k: 'door', open: true, x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] }); K.pinta(2, 'portaoCidade', { a: p0, b: p1, cores }); return; }
        P.paredes.push({ k: 'wall', x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] });
        K.marcaLinha([p0, p1], larg / 2 + 0.2, 3, true);
      };
      for (const [u0, u1] of vaos) { pedaco(t0, Math.max(t0, u0), false); pedaco(Math.max(0, u0), Math.min(1, u1), true); t0 = Math.min(1, u1); }
      pedaco(t0, 1, false);
    }
    K.pinta(2, 'muralhaCidade', { pts, fechada, larg, cores, torres: op.torres !== false, portoes });
  }
  // as casas numa região (um polígono): em fileiras sorteadas, encostadas, onde o chão está livre
  function casas(C, regiao, op) {
    const { K, P } = C, r = K.r, [x0, y0, x1, y1] = caixaDe(regiao), tam = op.tam || [[4, 3], [3, 4], [4, 4], [5, 3], [3, 5], [5, 4]];
    let n = 0;
    for (let y = Math.floor(y0); y < y1; y += Math.max(2, (op.passo || 4) / 2)) for (let x = Math.floor(x0) + (K.rT() < 0.5 ? 0 : 1); x < x1; x += 1) {
      if (K.rT() < (op.vazio || 0.12)) { x += 2; continue; }
      const [w, h] = K.pick(tam), yy = y + (K.rT() < 0.3 ? 1 : 0);
      if (!dentroPoli(regiao, x + w / 2, yy + h / 2) || !dentroPoli(regiao, x, yy) || !dentroPoli(regiao, x + w, yy + h)) continue;
      if (!livre(K, x - 1, yy - 1, w + 2, h + 2, v => v !== 2 && v !== 7 && v !== 9) || !livre(K, x, yy, w, h)) continue;
      const k = K.predio({ tipo: op.tipo || 'casa', x, y: yy, w, h, lado: 's', aberto: false });
      k.soDesenho = true; n++;
      x += w - 1 + (K.rT() < 0.25 ? 1 : 0);
    }
    return n;
  }
  // um prédio que importa (a sede, o templo): o telhado do tipo, e o marcador com o nome
  function predioNomeado(C, tipo, x, y, w, h, nome) {
    const { K, P } = C;
    for (let j = Math.floor(y) - 1; j < y + h + 1; j++) for (let i = Math.floor(x) - 1; i < x + w + 1; i++) if (K.at(i, j) === 3 || K.at(i, j) === 4) K.pos(i, j, 0);
    // (tira as casas que estavam no lugar)
    P.predios = P.predios.filter(q => !(q.soDesenho && q.x < x + w + 1 && q.x + q.w > x - 1 && q.y < y + h + 1 && q.y + q.h > y - 1));
    const k = K.predio({ tipo, x: Math.round(x), y: Math.round(y), w, h, lado: 's', aberto: false });
    k.soDesenho = true;
    P.pontos.push({ x: x + w / 2, y: y + h / 2, n: nome });
    return k;
  }
  // a praça: o chão de pedra, com o marcador
  function praca(C, x, y, rr, nome, op) {
    const { K, P } = C;
    K.pinta(1, 'pracaCidade', { x, y, r: rr, estilo: C.estilo });
    K.marcaCirc(x, y, rr, 1, true);
    if (!(op && op.semFonte)) { K.objeto('poco', Math.floor(x - 0.5), Math.floor(y - 0.5), 0, () => true); }
    if (nome) P.pontos.push({ x, y, n: nome });
  }
  // as ruas de bairro: uma grade torta dentro da região, recortada
  function ruas(C, regiao, passo, tipo) {
    const { K } = C, [x0, y0, x1, y1] = caixaDe(regiao), r = K.r;
    const linha = (pts) => {
      let run = [];
      const solta = () => { if (run.length > 3) K.poeCaminho(run, tipo || 'rua'); run = []; };
      for (const p of pts) { if (dentroPoli(regiao, p[0], p[1])) run.push(p); else solta(); }
      solta();
    };
    for (let y = y0 + passo * r(0.5, 0.8); y < y1 - 2; y += passo * r(0.85, 1.15)) { const pts = [], ond = r(0, 6); for (let x = x0; x <= x1; x += 2) pts.push([x, y + Math.sin(x * 0.12 + ond) * 1.2]); linha(pts); }
    for (let x = x0 + passo * r(0.5, 0.8); x < x1 - 2; x += passo * r(0.9, 1.3)) { const pts = [], ond = r(0, 6); for (let y = y0; y <= y1; y += 2) pts.push([x + Math.sin(y * 0.12 + ond) * 1.2, y]); linha(pts); }
  }
  const estrada = (C, pts) => C.K.poeCaminho(pts, 'estrada');
  const meio = (a, b, d) => [(a[0] + b[0]) / 2 + (d || 0), (a[1] + b[1]) / 2 + (d || 0)];
  const noAnel = (pts, ang, cx, cy) => {
    // o ponto do anel na direção ang (a partir do centro)
    let melhor = pts[0], md = Infinity;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; for (let t = 0; t <= 1; t += 0.05) { const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, d = Math.abs(Math.atan2(Math.sin(Math.atan2(y - cy, x - cx) - ang), Math.cos(Math.atan2(y - cy, x - cx) - ang))); if (d < md) { md = d; melhor = [x, y]; } } }
    return melhor;
  };
  const nomesDosPortoes = ['O Portão Norte', 'O Portão Leste', 'O Portão Sul', 'O Portão Oeste'];
  const nomeDoPortao = ang => nomesDosPortoes[((Math.round(((ang + Math.PI / 2) % TAU + TAU) % TAU / (Math.PI / 2)) % 4) + 4) % 4];

  /* ---------------- os cinco traçados ---------------- */
  // cidade velha com rio (Hemvria)
  function velha(C) {
    const { K, P, W, H } = C, r = K.r, cx = W / 2, cy = H / 2;
    const anel = oval(cx, cy, W * 0.44, H * 0.43, 16, K, 0.08);
    // o rio, de oeste a leste, um pouco abaixo do meio
    const ry = cy + H * r(0.05, 0.12), rio = [[-2, ry + r(-3, 3)], [W * 0.3, ry + r(-2, 2)], [W * 0.6, ry + r(-2, 2)], [W + 2, ry + r(-3, 3)]];
    const rioPts = K.poeRio(rio, 2.2, 'agua', -2);
    const yRio = x => { let best = ry, md = Infinity; for (const p of rioPts) { const d = Math.abs(p[0] - x); if (d < md) { md = d; best = p[1]; } } return best; };
    // a cidade velha: ao norte do rio, murada, com o castelo a leste e o templo a oeste
    const vx = cx + r(-W * 0.05, W * 0.05), vy = ry - H * 0.2, velhaP = oval(vx, vy, W * 0.17, H * 0.15, 12, K, 0.06);
    // os portões de fora (quatro) e da velha (quatro)
    const portoes = [-Math.PI / 2, 0, Math.PI / 2, Math.PI].map(a => noAnel(anel, a + r(-0.12, 0.12), cx, cy));
    const pV = [-Math.PI / 2, 0, Math.PI / 2, Math.PI].map(a => noAnel(velhaP, a, vx, vy));
    // as ruas principais: de cada portão até a praça do mercado (ao sul do rio) ou até a velha
    const mercado = [cx + r(-6, 6), yRio(cx) + H * 0.14];
    estrada(C, [portoes[2], meio(portoes[2], mercado, r(-2, 2)), mercado]);
    estrada(C, [portoes[1], [W * 0.7, yRio(W * 0.7) + 6], mercado]);
    estrada(C, [portoes[3], [W * 0.3, yRio(W * 0.3) + 6], mercado]);
    estrada(C, [portoes[0], pV[0]]);
    estrada(C, [mercado, [pV[2][0], yRio(pV[2][0]) + 3]]);
    estrada(C, [[pV[2][0], yRio(pV[2][0]) - 3], pV[2]]);
    // as três pontes
    const pontes = [[W * 0.32, 'A Ponte dos Cais'], [pV[2][0], 'A Ponte Grande'], [W * 0.68, 'A Ponte do Castelo']];
    for (const [x, n] of pontes) { const y = yRio(x); K.ponte(x, y, 7, 2.2, Math.PI / 2, 'pedra', 0.2); P.pontos.push({ x, y, n }); }
    muralha(C, velhaP, { portoes: pV, larg: 0.9 });
    praca(C, vx - W * 0.06, vy + 1, 4, 'A praça da cidade velha');
    predioNomeado(C, 'senhor', Math.round(vx + W * 0.05), Math.round(vy - 5), 12, 9, 'O castelo');
    muralha(C, oval(vx + W * 0.05 + 6, vy - 0.5, 9, 7.5, 10), { larg: 0.8, portoes: [[vx + W * 0.05 + 6, vy + 7]] });
    predioNomeado(C, 'templo', Math.round(vx - W * 0.12), Math.round(vy - 6), 8, 10, 'O templo');
    praca(C, mercado[0], mercado[1], 5, 'O mercado');
    for (let k = 0; k < 8; k++) K.objetoPerto(K.pick(['barraca', 'caixote', 'barril']), mercado[0], mercado[1], 4.5, v => v === 1 || v === 0);
    // as ruas e as casas: dentro da velha, e na cidade de fora (sem entrar na velha)
    ruas(C, velhaP, 9);
    casas(C, velhaP, { passo: 4, vazio: 0.08 });
    const fora = anel;
    muralha(C, anel, { portoes });
    ruas(C, fora, 12);
    const foraSemVelha = pts => pts;
    casas(C, foraSemVelha(fora), { passo: 4, vazio: 0.12 });
    // o cais na beira do rio, o bairro pobre a sudoeste
    P.pontos.push({ x: W * 0.22, y: yRio(W * 0.22) + 8, n: 'O bairro pobre (o esgoto sai no rio)' });
    portoes.forEach((g, i) => P.pontos.push({ x: g[0], y: g[1], n: nomeDoPortao([-Math.PI / 2, 0, Math.PI / 2, Math.PI][i]) }));
    K.foco(cx, cy);
  }
  // cidade alta e baixa, com porto (o Porto da Baía)
  function porto(C) {
    const { K, P, W, H } = C, r = K.r;
    // o mar embaixo (ao sul), com a linha da costa ondulada
    const costa = []; for (let x = -2; x <= W + 2; x += 3) costa.push([x, H * 0.72 + Math.sin(x * 0.08 + r(0, 3)) * 2]);
    K.poeLago(costa.concat([[W + 2, H + 2], [-2, H + 2]]), 'agua', -3);
    const yCosta = x => { let best = H * 0.72, md = Infinity; for (const p of costa) { const d = Math.abs(p[0] - x); if (d < md) { md = d; best = p[1]; } } return best; };
    // o penhasco que separa a alta (em cima) da baixa (entre ele e o mar)
    const yP = H * 0.5, pen = []; for (let x = -2; x <= W + 2; x += 3) pen.push([x, yP + Math.sin(x * 0.1 + 1) * 1.5]);
    const banda = pen.concat(pen.slice().reverse().map(([x, y]) => [x, y + 3]));
    // as escadas e a rampa: os vãos no penhasco
    const vaos = [W * 0.25, W * 0.5, W * 0.75];
    const pedacos = [[-2, vaos[0] - 2], [vaos[0] + 2, vaos[1] - 2], [vaos[1] + 2, vaos[2] - 3], [vaos[2] + 3, W + 2]];
    for (const [a, b] of pedacos) { const s = banda.filter(([x]) => x >= a && x <= b); if (s.length < 4) continue; const sup = s.slice(0, s.length / 2 | 0), inf = s.slice(s.length / 2 | 0); K.poePenhasco(sup.concat(inf), 6, C.rocha); }
    vaos.forEach((x, i) => { const y = yP + 1.5; if (i === 2) { K.pinta(1, 'escadaPedra', { pts: [[x, y - 2.5], [x, y + 4]], larg: 3.2 }); P.pontos.push({ x, y, n: 'A Rampa das Carroças' }); } else { K.pinta(1, 'escadaPedra', { pts: [[x, y - 2.5], [x, y + 4]], larg: 1.8 }); P.pontos.push({ x, y, n: i === 1 ? 'A Escadaria do Concílio' : 'A escada do porto' }); } K.marcaLinha([[x, y - 2.5], [x, y + 4]], 1, 1, true); });
    // a muralha só do lado de terra (de um lado do penhasco ao outro), com três portões
    const muro = [[1, yP + 2], [W * 0.08, H * 0.08], [W * 0.5, 2], [W * 0.92, H * 0.08], [W - 1, yP + 2]];
    const portoes = [noAnel(muro, -Math.PI / 2, W / 2, H * 0.4), [W * 0.04, H * 0.3], [W * 0.96, H * 0.3]];
    // a cidade alta: o palácio do concílio, a praça na beira do penhasco, o templo
    muralha(C, muro, { fechada: false, portoes });
    const alta = [[3, yP - 1], [W * 0.1, H * 0.1], [W * 0.5, 4], [W * 0.9, H * 0.1], [W - 3, yP - 1]];
    estrada(C, [portoes[0], [W * 0.5, H * 0.25], [W * 0.5, yP - 3]]);
    estrada(C, [portoes[1], [W * 0.25, yP - 3]]); estrada(C, [portoes[2], [W * 0.75, yP - 3]]);
    predioNomeado(C, 'senhor', Math.round(W * 0.5 - 7), Math.round(H * 0.16), 14, 9, 'O palácio do Concílio');
    praca(C, W * 0.5, yP - 5, 4, 'A praça do Concílio (na beira do penhasco)');
    predioNomeado(C, 'templo', Math.round(W * 0.68), Math.round(H * 0.2), 8, 8, 'O templo');
    ruas(C, alta, 11); casas(C, alta, { passo: 5, vazio: 0.18, tam: [[5, 4], [4, 5], [6, 4], [5, 5]] });
    // a cidade baixa: o cais de pedra na beira, os armazéns, o mercado do peixe
    const baixa = [[1, yP + 3.5], [W - 1, yP + 3.5], [W - 1, H * 0.7 - 2], [1, H * 0.7 - 2]];
    const cais = []; for (const [x, y] of costa) if (x >= 0 && x <= W) cais.push([x, y - 1.2]);
    K.poeCaminho(cais, 'estrada');
    ruas(C, baixa, 8); casas(C, baixa, { passo: 4, vazio: 0.08, tipo: 'armazem', tam: [[5, 4], [4, 4], [6, 4]] });
    P.pontos.push({ x: W * 0.4, y: yCosta(W * 0.4) - 3, n: 'O mercado do peixe' }, { x: W * 0.2, y: yCosta(W * 0.2) - 3, n: 'A doca do mercado negro' }, { x: W * 0.6, y: yCosta(W * 0.6) - 3, n: 'A alfândega' });
    // os píeres e os barcos, o quebra-mar com o farol
    for (let k = 0; k < 4; k++) { const x = W * (0.18 + k * 0.2) + r(-3, 3), y = yCosta(x); K.pinta(1, 'pier', { x: x - 1, y: y - 0.5, w: 2, h: 7 }); K.marcaPoli([[x - 1, y], [x + 1, y], [x + 1, y + 6.5], [x - 1, y + 6.5]], 1, true); K.pinta(2, 'barco', { x: x + 3, y: y + 4, L: 6, ang: Math.PI / 2 + r(-0.2, 0.2) }); }
    const qx = W * 0.06, qy = yCosta(qx); K.pinta(1, 'pier', { x: qx, y: qy, w: 3, h: H * 0.2 }); K.marcaPoli([[qx, qy], [qx + 3, qy], [qx + 3, qy + H * 0.2], [qx, qy + H * 0.2]], 1, true);
    predioNomeado(C, 'torre', Math.round(qx), Math.round(qy + H * 0.2 - 3), 3, 3, 'O farol do porto');
    K.luz(qx + 1.5, qy + H * 0.2 - 1.5, 8, '#ffd27a', 2);
    portoes.forEach((g, i) => P.pontos.push({ x: g[0], y: g[1], n: ['O Portão da Estrada', 'O Portão Oeste', 'O Portão Leste'][i] }));
    K.foco(W / 2, H / 2);
  }
  // terraços na encosta (a Cidade-fornalha)
  function terracos(C) {
    const { K, P, W, H } = C, r = K.r, lava = C.estilo === 'anao' || C.estilo === 'orc' || C.estilo === 'magitec';
    // a montanha em cima
    const topo = []; for (let x = -2; x <= W + 2; x += 3) topo.push([x, H * 0.16 + Math.sin(x * 0.07 + 2) * 3]);
    K.poePenhasco([[-2, -2], [W + 2, -2]].concat(topo.slice().reverse()), 10, C.rocha);
    // o grande portão na montanha
    const gx = W / 2 + r(-8, 8), gy = H * 0.16 + Math.sin(gx * 0.07 + 2) * 3;
    K.pinta(3, 'bocaCaverna', { x: gx, y: gy - 0.5, ang: -Math.PI / 2, larg: 5, cores: C.rocha });
    P.pontos.push({ x: gx, y: gy + 1, n: 'O Grande Portão na montanha' });
    // os terraços: faixas descendo, cada uma com o muro de arrimo embaixo e a altura
    const n = 5, y0 = H * 0.2, y1 = H * 0.9, dy = (y1 - y0) / n;
    const canais = [W * 0.32 + r(-4, 4), W * 0.68 + r(-4, 4)];
    for (const x of canais) K.poeRio([[x, gy + 2], [x + r(-2, 2), (gy + H) / 2], [x + r(-3, 3), H + 2]], 0.9, lava ? 'lava' : 'agua', lava ? -1 : -1);
    if (lava) for (const x of canais) K.luz(x, H * 0.5, 10, '#ff7a3a', 2);
    const muro = [[0, H * 0.92], [W, H * 0.92]], portao = [W / 2, H * 0.92];
    muralha(C, muro, { fechada: false, portoes: [portao] });
    for (let k = 0; k < n; k++) {
      const ya = y0 + k * dy, yb = ya + dy, alt = (n - k) * 2;
      const reg = [[2, ya + 1], [W - 2, ya + 1], [W - 2, yb - 1.5], [2, yb - 1.5]];
      P.relevo.push({ t: 'plataforma', alt, k: 'rect', x: 0, y: ya, w: W, h: dy });
      K.pinta(1, 'muroArrimo', { y: yb - 0.6, x0: 0, x1: W, cores: C.muro });
      // a rua do terraço (de um lado ao outro) e a rampa até o de baixo
      K.poeCaminho([[0, ya + dy / 2], [W * 0.5, ya + dy / 2 + r(-1, 1)], [W, ya + dy / 2]], k === 0 ? 'estrada' : 'rua');
      const rx = k % 2 ? W * 0.12 : W * 0.88;
      K.pinta(1, 'escadaPedra', { pts: [[rx, yb - 2.5], [rx, yb + 2.5]], larg: 2.2 });
      if (k === 0) { predioNomeado(C, 'senhor', Math.round(gx + 8), Math.round(ya + 1), 12, 8, 'O salão do senhor'); predioNomeado(C, 'templo', Math.round(gx - 18), Math.round(ya + 1), 8, 8, 'O templo'); }
      if (k === 2) { praca(C, W / 2, ya + dy / 2, 4, 'A praça da bigorna (o mercado)'); predioNomeado(C, 'ferraria', Math.round(W * 0.2), Math.round(ya + 2), 8, 6, 'A grande forja'); }
      casas(C, reg, { passo: 4, vazio: 0.12 });
    }
    // as minas nas encostas, embaixo a muralha com o portão
    for (const x of [W * 0.1, W * 0.9]) { const y = H * 0.16 + Math.sin(x * 0.07 + 2) * 3; K.pinta(3, 'portalMina', { x, y: y - 0.3, ang: -Math.PI / 2, larg: 2.6 }); P.pontos.push({ x, y: y + 1, n: 'A boca da mina' }); }
    estrada(C, [portao, [W / 2, H + 2]]);
    P.pontos.push({ x: portao[0], y: portao[1], n: 'O Portão de Baixo' });
    K.foco(W / 2, H / 2);
  }
  // fundo de cânion (a Cidade do Eco)
  function canion(C) {
    const { K, P, W, H } = C, r = K.r;
    const borda = (base, sinal) => { const out = []; for (let x = -2; x <= W + 2; x += 3) out.push([x, base + Math.sin(x * 0.09 + (sinal > 0 ? 1 : 4)) * 2.5 + r(-0.5, 0.5)]); return out; };
    const cima = borda(H * 0.24, 1), baixo = borda(H * 0.76, -1);
    K.poePenhasco([[-2, -2], [W + 2, -2]].concat(cima.slice().reverse()), 12, C.rocha);
    K.poePenhasco(baixo.concat([[W + 2, H + 2], [-2, H + 2]]), 12, C.rocha);
    // as casas escavadas nas paredes do cânion
    for (const [lin, s] of [[cima, 1], [baixo, -1]]) for (const [x, y] of lin) if (x > 2 && x < W - 2 && K.rT() < 0.55) K.pinta(3, 'casaEscavada', { x: x + r(-1, 1), y: y - s * 0.6, s });
    // a estrada pelo fundo, os portões nas pontas, as rampas para o planalto
    const yM = H / 2;
    estrada(C, [[-1, yM], [W * 0.5, yM + r(-2, 2)], [W + 1, yM]]);
    const reg = [[2, H * 0.24 + 4], [W - 2, H * 0.24 + 4], [W - 2, H * 0.76 - 4], [2, H * 0.76 - 4]];
    // a arena no meio, o mercado a oeste, a praça das correntes a leste, a sede e o templo nas pontas
    const ax = W / 2, ay = yM;
    K.pinta(2, 'arenaCidade', { x: ax, y: ay, r: Math.min(10, H * 0.14) }); K.marcaCirc(ax, ay, Math.min(10, H * 0.14) + 0.5, 3, true);
    P.pontos.push({ x: ax, y: ay, n: 'A Arena (e o mercado negro por baixo)' });
    praca(C, W * 0.3, yM + 5, 4, 'O mercado');
    praca(C, W * 0.7, yM + 5, 4, 'A praça das correntes (o mercado de escravizados)', { semFonte: true });
    predioNomeado(C, 'senhor', Math.round(W * 0.06), Math.round(yM - 9), 10, 8, 'O salão das vozes (a sede do poder)');
    predioNomeado(C, 'templo', Math.round(W * 0.86), Math.round(yM - 9), 9, 8, 'O templo');
    muralha(C, [[2, H * 0.22], [2, H * 0.78]], { fechada: false, portoes: [[2, yM]] });
    muralha(C, [[W - 2, H * 0.22], [W - 2, H * 0.78]], { fechada: false, portoes: [[W - 2, yM]] });
    ruas(C, reg, 10); casas(C, reg, { passo: 4, vazio: 0.1 });
    for (const [x, lin, s] of [[W * 0.2, cima, 1], [W * 0.8, baixo, -1]]) { const y = lin.find(p => p[0] >= x)[1]; K.pinta(1, 'escadaPedra', { pts: [[x, y + s * 3], [x, y - s * 4]], larg: 2 }); P.pontos.push({ x, y, n: 'A rampa para o planalto' }); }
    P.pontos.push({ x: 2, y: yM, n: 'O Portão Oeste' }, { x: W - 2, y: yM, n: 'O Portão Leste' });
    K.foco(W / 2, yM);
  }
  // palácio no morro (a Capital Kitsune)
  function morro(C) {
    const { K, P, W, H } = C, r = K.r;
    // o rio a oeste, com os dois canais
    const rx = W * 0.1, rioPts = K.poeRio([[rx, -2], [rx + r(-3, 3), H * 0.5], [rx + r(-2, 2), H + 2]], 2.5, 'agua', -2);
    for (const y of [H * 0.4, H * 0.7]) K.poeRio([[rx, y], [W * 0.6, y + r(-1, 1)]], 0.8, 'agua', -1);
    // o morro com o palácio murado, no norte
    const mx = W * 0.55, my = H * 0.24, morroP = oval(mx, my, W * 0.16, H * 0.15, 14, K, 0.1);
    K.mancha(morroP, ['#5a7a3e', '#668848', '#4e6c36']);
    P.relevo.push({ t: 'morro', alt: 4, k: 'poly', pts: morroP });
    const palP = oval(mx, my, W * 0.1, H * 0.09, 10);
    const portaoPal = noAnel(palP, Math.PI / 2, mx, my);
    muralha(C, palP, { portoes: [portaoPal], larg: 0.8, cores: ['#e8e2d3', '#f4efe3', '#2f3846'] });
    predioNomeado(C, 'senhor', Math.round(mx - 7), Math.round(my - 5), 14, 8, 'O palácio (o salão da lua)');
    K.poeLago(oval(mx + 6, my + 4, 2.2, 1.6, 10), 'agua', -1);
    // a avenida do palácio até o grande portal, as ruas em grade
    const gate = [mx, H - 3];
    estrada(C, [portaoPal, [mx, H * 0.6], gate]);
    K.pinta(2, 'toriiGrande', { x: mx, y: H * 0.75 });
    P.pontos.push({ x: mx, y: H * 0.75, n: 'O grande portal' });
    const cidade = [[rx + 4, 3], [W - 3, 3], [W - 3, H - 3], [rx + 4, H - 3]];
    for (let x = rx + 10; x < W - 4; x += 12) K.poeCaminho([[x, H * 0.42], [x, H - 3]], 'rua');
    for (let y = H * 0.48; y < H - 4; y += 10) K.poeCaminho([[rx + 4, y], [W - 3, y]], 'rua');
    // o templo numa colina a leste, a rua das lanternas (o mercado)
    const tx = W * 0.85, ty = H * 0.45;
    K.mancha(oval(tx, ty, 9, 7, 10, K), ['#5a7a3e', '#668848', '#4e6c36']); P.relevo.push({ t: 'morro', alt: 2, k: 'ell', x: tx - 9, y: ty - 7, w: 18, h: 14 });
    predioNomeado(C, 'templo', Math.round(tx - 4), Math.round(ty - 4), 8, 8, 'O templo das três luas');
    P.pontos.push({ x: W * 0.4, y: H * 0.6, n: 'A rua das lanternas (o mercado)' });
    for (let k = 0; k < 10; k++) K.objetoPerto('lanterna', W * 0.4, H * 0.6, 6, v => v === 1 || v === 0);
    casas(C, cidade.map(([x, y]) => [x, y]), { passo: 4, vazio: 0.14 });
    // os arrozais fora, ao sul e a leste
    for (let k = 0; k < 4; k++) { const x = r(W * 0.6, W - 10), y = r(H * 0.8, H - 6); K.pinta(0, 'plantacao', { x, y, w: 8, h: 5, cultura: 'arroz' }); }
    K.foco(mx, H / 2);
  }
  const FAZER = { velha, porto, terracos, canion, morro };

  function gerar(o) {
    o = o || {};
    const modelo = MODELOS.some(m => m[0] === o.modelo) ? o.modelo : 'velha';
    const tamanho = TAMANHOS[o.tamanho] ? o.tamanho : 'media', T = TAMANHOS[tamanho], W = T.W, H = T.H;
    const terreno = TERRENOS_C.some(t => t[0] === o.terreno) ? o.terreno : o.terreno === 'deserto' ? 'areia' : 'campo';
    const estilo = Estilos.valido(o.estilo), seed = (Math.round(Number(o.seed)) >>> 0) || 1;
    const sT = (MO.sub(seed, 1) % 2147483000) + 1;
    const K = MO.contexto(W, H, TER_DE[terreno], 'ruinas', estilo, 'estrada', sT, terreno), P = K.P;
    const muroCor = MUROS[estilo] || MUROS[Estilos.raiz(estilo)] || MUROS.comum;
    const C = { K, P, W, H, modelo, tamanho, terreno, estilo, seed, rocha: ROCHA[terreno], muro: muroCor ? [muroCor[1], muroCor[0], muroCor[2], '#2a2620'] : PEDRA };
    P.paredes = []; P.pontos = [];
    FAZER[modelo](C);
    const rV = mulberry((MO.sub(seed, 2) % 2147483000) + 1);
    P.dens = () => 0.35;
    MO.vegetacao(K, rV);
    P.marcas = {};
    delete P.dens; delete P.esp;
    Estacoes.noPlano(K, o.estacao);
    return Object.assign(P, { v: 1, lugar: 'cidadeGrande', modelo, seed, sT, tamanho, entradas: [], comMarcas: true, sitPedida: null, occ: Array.from(K.occ) });
  }

  /* ================= os desenhos ================= */
  const caminhoPts = (g, pts, c, fechar) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); if (fechar) g.closePath(); };
  const PR = {
    // a muralha: a faixa de pedra grossa (o adarve claro em cima), as ameias e as torres redondas nos cantos
    muralhaCidade(g, o, c, rnd) {
      const pts = o.fechada ? o.pts.concat([o.pts[0]]) : o.pts, L = o.larg * c, cores = o.cores;
      g.save(); g.lineJoin = 'round'; g.lineCap = 'butt';
      // (os vãos dos portões ficam de fora: recortados)
      g.beginPath(); g.rect(-c * 10, -c * 10, c * 4000, c * 4000);
      for (const p of o.portoes || []) { g.moveTo((p[0] + 1.6) * c, p[1] * c); g.arc(p[0] * c, p[1] * c, 1.55 * c, 0, TAU, true); }
      g.clip('evenodd');
      g.save(); g.translate(c * 0.3, c * 0.4); caminhoPts(g, pts, c, false); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = L * 1.1; g.stroke(); g.restore();
      caminhoPts(g, pts, c, false); g.strokeStyle = cores[2]; g.lineWidth = L * 1.15; g.stroke();
      caminhoPts(g, pts, c, false); g.strokeStyle = cores[1]; g.lineWidth = L * 0.9; g.stroke();
      caminhoPts(g, pts, c, false); g.strokeStyle = cores[0]; g.lineWidth = L * 0.35; g.stroke();
      g.setLineDash([c * 0.3, c * 0.3]); caminhoPts(g, pts, c, false); g.strokeStyle = cores[2]; g.lineWidth = L * 0.18; g.stroke(); g.setLineDash([]);
      if (o.torres) for (const [x, y] of o.pts) {
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc((x + 0.35) * c, (y + 0.45) * c, L * 1.25, 0, TAU); g.fill();
        g.fillStyle = cores[1]; g.beginPath(); g.arc(x * c, y * c, L * 1.25, 0, TAU); g.fill();
        g.strokeStyle = cores[2]; g.lineWidth = Math.max(1.5, c * 0.12); g.stroke();
        g.fillStyle = cores[0]; g.beginPath(); g.arc(x * c, y * c, L * 0.75, 0, TAU); g.fill();
      }
      g.restore();
    },
    // o portão: as duas torres quadradas e o chão de pedra no vão
    portaoCidade(g, o, c) {
      const ang = Math.atan2(o.b[1] - o.a[1], o.b[0] - o.a[0]), cores = o.cores;
      for (const p of [o.a, o.b]) { g.save(); g.translate(p[0] * c, p[1] * c); g.rotate(ang); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(-c * 0.75 + c * 0.25, -c * 0.75 + c * 0.35, c * 1.5, c * 1.5); g.fillStyle = cores[1]; g.fillRect(-c * 0.75, -c * 0.75, c * 1.5, c * 1.5); g.strokeStyle = cores[2]; g.lineWidth = Math.max(1, c * 0.1); g.strokeRect(-c * 0.75, -c * 0.75, c * 1.5, c * 1.5); g.restore(); }
    },
    // a praça: o chão de pedras em roda
    pracaCidade(g, o, c, rnd) { Estilos.praca(g, { x: o.x, y: o.y, r: o.r }, c, rnd, o.estilo); },
    // o muro de arrimo dos terraços (a fileira de pedras, com a sombra para baixo)
    muroArrimo(g, o, c, rnd) {
      g.save(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(o.x0 * c, (o.y + 0.4) * c, (o.x1 - o.x0) * c, c * 0.8);
      for (let x = o.x0; x < o.x1; x += 0.8) { g.fillStyle = Estilos.tom(o.cores[rnd() < 0.5 ? 0 : 1], (rnd() - 0.5) * 0.15); g.fillRect(x * c + 1, (o.y - 0.4) * c, c * 0.8 - 2, c * 0.8); }
      g.strokeStyle = o.cores[2]; g.lineWidth = Math.max(1, c * 0.08); g.beginPath(); g.moveTo(o.x0 * c, (o.y + 0.4) * c); g.lineTo(o.x1 * c, (o.y + 0.4) * c); g.stroke();
      g.restore();
    },
    // a casa escavada na parede do cânion: a porta escura e a soleira
    casaEscavada(g, o, c) {
      g.save(); g.fillStyle = '#1c120c'; g.beginPath(); g.ellipse(o.x * c, o.y * c, c * 0.55, c * 0.4, 0, 0, TAU); g.fill();
      g.fillStyle = '#b07c56'; g.fillRect((o.x - 0.7) * c, (o.y + o.s * 0.45) * c - c * 0.1, c * 1.4, c * 0.2);
      g.fillStyle = 'rgba(255,190,110,0.5)'; g.beginPath(); g.arc(o.x * c, o.y * c, c * 0.15, 0, TAU); g.fill();
      g.restore();
    },
    // a arena: a arquibancada em anéis e a areia no meio
    arenaCidade(g, o, c) {
      const x = o.x * c, y = o.y * c, R = o.r * c;
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(x + c * 0.4, y + c * 0.5, R, 0, TAU); g.fill();
      for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? '#8a5a3c' : '#a06a48'; g.beginPath(); g.arc(x, y, R * (1 - k * 0.08), 0, TAU); g.fill(); }
      g.fillStyle = '#d8bf8a'; g.beginPath(); g.arc(x, y, R * 0.58, 0, TAU); g.fill();
      g.strokeStyle = '#5a3a24'; g.lineWidth = Math.max(1.5, c * 0.15); g.beginPath(); g.arc(x, y, R * 0.58, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
    },
    // o grande torii (o portal vermelho), visto de cima
    toriiGrande(g, o, c) {
      g.save(); g.translate(o.x * c, o.y * c);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-c * 3 + c * 0.3, -c * 0.4 + c * 0.4, c * 6, c * 0.8);
      g.fillStyle = '#b8342a'; g.fillRect(-c * 3, -c * 0.4, c * 6, c * 0.8);
      g.fillStyle = '#1d1715'; g.fillRect(-c * 3.4, -c * 0.6, c * 6.8, c * 0.3);
      g.fillStyle = '#8f2620'; for (const sx of [-2.2, 2.2]) { g.beginPath(); g.arc(sx * c, 0, c * 0.45, 0, TAU); g.fill(); }
      g.restore();
    },
  };
  Object.assign(MO.PINTORES, PR);

  /* ================= a cena, a prévia e o lugar ================= */
  const nomePadrao = p => 'Cidade grande' + (Estilos.ADJ[p.estilo] ? ' ' + Estilos.ADJ[p.estilo] : '');
  const criar = (p, nome, ex) => MO.criarPlano(p, nome, ex, nomePadrao);
  function resumo(p) {
    const casasN = p.predios.filter(k => k.soDesenho).length;
    return [(MODELOS.find(m => m[0] === p.modelo) || MODELOS[0])[1], p.W + ' × ' + p.H + ' quadrados (' + p.W * 5 + ' m × ' + p.H * 5 + ' m)', casasN + ' casas', p.pontos.length + ' lugares com nome (ocultos)'].join(' · ') + '.';
  }
  const lembrar = st => { App.opt.cgMod = st.modelo; App.opt.cgTam = st.tamanho; App.opt.cgTer = st.terreno; };
  function padrao() {
    const o = App.opt;
    return { modelo: MODELOS.some(m => m[0] === o.cgMod) ? o.cgMod : 'velha', tamanho: TAMANHOS[o.cgTam] ? o.cgTam : 'media', terreno: TERRENOS_C.some(t => t[0] === o.cgTer) ? o.cgTer : 'campo' };
  }
  function controles(st, K, mudou) {
    const { field, seg } = K;
    const muda = (campo, v) => { st[campo] = v; lembrar(st); mudou(true); };
    return h('div', { class: 'ger-c' },
      field('O traçado', seg('cg-mod', st.modelo, MODELOS.map(([k, n]) => [k, n, null, DICA[k]]), v => muda('modelo', v)), 'stack'),
      h('p', { class: 'note', id: 'cg-dica', text: DICA[st.modelo] }),
      h('div', { class: 'ger-l' },
        field('Tamanho', seg('cg-tam', st.tamanho, Object.keys(TAMANHOS).map(k => [k, TAMANHOS[k].n, null, TAMANHOS[k].W + ' × ' + TAMANHOS[k].H + ' quadrados (' + TAMANHOS[k].W * 5 + ' × ' + TAMANHOS[k].H * 5 + ' m)']), v => muda('tamanho', v)), 'stack'),
        field('Terreno', seg('cg-ter', st.terreno, TERRENOS_C.map(([k, n]) => [k, n]), v => muda('terreno', v)), 'stack')));
  }
  const opcoesDe = st => ({ modelo: st.modelo, tamanho: st.tamanho, terreno: st.terreno });
  function aplicarOpcoes(st, o) {
    if (MODELOS.some(m => m[0] === o.modelo)) st.modelo = o.modelo;
    if (TAMANHOS[o.tamanho]) st.tamanho = o.tamanho;
    if (TERRENOS_C.some(t => t[0] === o.terreno)) st.terreno = o.terreno;
    lembrar(st);
  }
  const LUGAR = { aceitaEstacao: true, id: 'cidadeGrande', n: 'Cidade grande', padrao, controles, opcoesDe, aplicarOpcoes, gerar: (st, comum) => gerar(Object.assign({}, st, comum)), previa: MO.previa, resumo,
    partes: () => [], parteEm: () => null, nomeDaParte: () => '', formaDaParte: () => [], travada: () => false, alternar: (p, parte, trava) => trava, quantasTravadas: () => 0, baseDe: () => null, travaDe: () => null,
    nomePadrao, criar,
    relevoTxt: 'Com relevo (o morro, os terraços, o penhasco, o rio)',
    dica: '"Gerar outro" sorteia outra cidade com o mesmo traçado. O estilo muda os telhados, as ruas e as muralhas.',
    nota: 'Sai a cidade inteira numa cena só, a 1 quadrado = 5 m: só as muralhas são paredes (os portões ficam abertos); as casas são desenho. Os lugares com nome (a sede, os templos, o mercado, os portões) são marcadores ocultos: só você vê. Os interiores você gera à parte, quando precisar.',
    feito: (sc, p) => `"${sc.name}" criada: ${resumo(p).replace(/\.$/, '')}.` };
  // (as peças, para quem monta um lugar à mão: os lugares importantes do mundo)
  const ferr = { muralha, casas, predioNomeado, praca, ruas, estrada, oval, noAnel, MUROS, ROCHA, TER_DE };
  return { MODELOS, TAMANHOS, gerar, resumo, criar, nomePadrao, LUGAR, ferr };
})();
