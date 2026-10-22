/* ---------------------------------------------------------------
   10c5. A CENA DO HEXÁGONO — o que vem do Mapa-múndi (lote 14, parte 14a)
   A cena gerada num hexágono do mapa é o "tijolo" dele (mundo/nucleo.js, hexParaCena): o retângulo do mundo que fica
   com ele. Os tijolos cobrem o mundo sem sobrar nem sobrepor, então o lado de uma cena é o lado da cena do vizinho (ou
   a metade dele: com a ponta para cima, os vizinhos de cima e os de baixo ficam com meio lado cada um; deitado, os da
   direita e os da esquerda):
   · os vizinhos nas bordas: em cada lado, a fronteira com o vizinho de outro bioma é uma linha ondulada, sorteada pelo
     par de hexágonos (e pelo mapa) e medida pelo mundo ao longo do lado — a cena de cá e a de lá desenham a mesma
     linha, cada uma do seu lado; ela some nas pontas do lado. A água do vizinho (o mar, o lago) entra mais e segue
     pela borda toda que é dela. A Mistura diz quanto os vizinhos entram;
   · o rio e os caminhos pelos lados certos: os pontos da borda por onde eles entram e saem (o mesmo ponto do mundo é
     o mesmo ponto do lado, de cá e de lá); o rio vai da nascente para a foz, como no mapa.
   Tudo é conta pura: o mesmo hexágono, com as mesmas escolhas, dá o mesmo chão.
   --------------------------------------------------------------- */
const HexCena = (() => {
  const B = Biomas, R3 = Math.sqrt(3);
  // os lados de cada orientação: a direção do vizinho, o lado do mapa e o pedaço dele (de a até b: da esquerda para a
  // direita em cima e embaixo; de cima para baixo nos lados)
  const LADOS = {
    pe: [{ d: 'no', l: 'n', a: 0, b: 0.5 }, { d: 'ne', l: 'n', a: 0.5, b: 1 }, { d: 'l', l: 'l', a: 0, b: 1 }, { d: 'se', l: 's', a: 0.5, b: 1 }, { d: 'so', l: 's', a: 0, b: 0.5 }, { d: 'o', l: 'o', a: 0, b: 1 }],
    deitado: [{ d: 'n', l: 'n', a: 0, b: 1 }, { d: 'ne', l: 'l', a: 0, b: 0.5 }, { d: 'se', l: 'l', a: 0.5, b: 1 }, { d: 's', l: 's', a: 0, b: 1 }, { d: 'so', l: 'o', a: 0.5, b: 1 }, { d: 'no', l: 'o', a: 0, b: 0.5 }],
  };
  // o passo (q, r) até o vizinho de cada direção
  const PASSO = { pe: { l: [1, 0], ne: [1, -1], no: [0, -1], o: [-1, 0], so: [-1, 1], se: [0, 1] }, deitado: { se: [1, 0], ne: [1, -1], n: [0, -1], no: [-1, 0], so: [-1, 1], s: [0, 1] } };
  const NA_DIR = { n: 'ao norte', ne: 'a nordeste', l: 'a leste', se: 'a sudeste', s: 'ao sul', so: 'a sudoeste', o: 'a oeste', no: 'a noroeste' };
  const PELA_DIR = { n: 'pelo norte', ne: 'pelo nordeste', l: 'pelo leste', se: 'pelo sudeste', s: 'pelo sul', so: 'pelo sudoeste', o: 'pelo oeste', no: 'pelo noroeste' };
  const DO_DIR = { n: 'do norte', ne: 'do nordeste', l: 'do leste', se: 'do sudeste', s: 'do sul', so: 'do sudoeste', o: 'do oeste', no: 'do noroeste' };
  const AO_DIR = { n: 'ao norte', ne: 'ao nordeste', l: 'ao leste', se: 'ao sudeste', s: 'ao sul', so: 'ao sudoeste', o: 'ao oeste', no: 'ao noroeste' };
  // quanto os vizinhos entram (a fundura da onda, em partes do lado menor do mapa), pela Mistura; a água entra mais
  const FUNDO = { pouca: 0.13, media: 0.21, muita: 0.3 }, MAIS_AGUA = 1.25;
  const TAPER = 0.24;                                    // (em raios de hexágono: onde a linha some, na ponta do lado)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const suave = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

  /* ---- o pedido do Mapa-múndi, conferido ---- */
  const okBio = v => v === 'agua' || (typeof v === 'string' && !!B.BIO[v]);
  const n01 = v => { const x = typeof v === 'number' ? v : NaN; return Number.isFinite(x) ? clamp(x, 0, 1) : null; };
  const inteiro = v => (Number.isInteger(v) && Math.abs(v) <= 1e6 ? v + 0 : null);
  function peca(p, comTipo) {
    if (!p || typeof p !== 'object' || !Array.isArray(p.pts)) return null;
    const pts = [];
    for (const q of p.pts.slice(0, 24)) { if (!Array.isArray(q)) return null; const u = n01(q[0]), v = n01(q[1]); if (u == null || v == null) return null; pts.push([u, v]); }
    if (pts.length < 2) return null;
    const out = { pts, ini: p.ini === true, fim: p.fim === true };
    if (comTipo) out.t = p.t === 'estrada' ? 'estrada' : 'trilha';
    return out;
  }
  /* (lote 14, parte 14b) a guerra do hexágono (mundo/nucleo.js, guerraDoHex), conferida: { bat, marca, exes, maisExes,
     dentro, cerco } — só o que veio; sem nada, null */
  const okCor = v => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null);
  const NEUTRAS = ['#8a7a5e', '#4e4434'];
  const cores2 = v => { const a = Array.isArray(v) ? v.slice(0, 2).map(okCor) : []; return a[0] && a[1] ? [a[0], a[1]] : NEUTRAS.slice(); };
  const txt = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
  const nInt = (v, a, b) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(a, Math.min(b, Math.round(v))) : null);
  const maqs = v => { const out = {}; for (const k of ['catapulta', 'trabuco', 'ariete']) { const n = v && typeof v === 'object' ? nInt(v[k], 0, 1e4) : null; if (n) out[k] = n; } return Object.keys(out).length ? out : null; };
  function validaGuerra(g) {
    if (!g || typeof g !== 'object') return null;
    const out = {};
    if (g.bat && typeof g.bat === 'object') {
      const b = g.bat, lado = l => ({ nome: txt(l && l.nome, 80) || 'Lado', cores: cores2(l && l.cores) });
      out.bat = { nome: txt(b.nome, 120), dias: nInt(b.dias, 0, 1e6) || 0, tam: nInt(b.tam, 0, 4) || 0, vence: b.vence === 'a' || b.vence === 'b' ? b.vence : null, a: lado(b.a), b: lado(b.b) };
      const t = nInt(b.tropas, 0, 1e7);
      if (t != null) out.bat.tropas = t;
    }
    if (g.marca === 'd' || g.marca === 'c') out.marca = g.marca;
    const exes = (Array.isArray(g.exes) ? g.exes : []).slice(0, 2).filter(e => e && typeof e === 'object' && typeof e.tropas === 'number' && e.tropas >= 1).map(e => {
      const x = { nome: txt(e.nome, 80) || 'Exército', fac: txt(e.fac, 60), cores: cores2(e.cores), tropas: nInt(e.tropas, 1, 1e7), n: nInt(e.n, 1, 999) || 1 };
      const mq = maqs(e.maq);
      if (mq) x.maq = mq;
      if (e.oculto === true) x.oculto = true;
      if (e.lado === 'cerco') x.lado = 'cerco';
      return x;
    });
    if (exes.length) out.exes = exes;
    const mais = nInt(g.maisExes, 0, 999), dentro = nInt(g.dentro, 0, 999);
    if (mais) out.maisExes = mais;
    if (dentro) out.dentro = dentro;
    if (g.cerco && typeof g.cerco === 'object') {
      const c = g.cerco, u = n01(c.u), v = n01(c.v);
      out.cerco = { nome: txt(c.nome, 80) || 'o lugar', fac: txt(c.fac, 60), cores: cores2(c.cores), dias: nInt(c.dias, 0, 1e6) || 0, u: u == null ? 0.5 : u, v: v == null ? 0.5 : v };
      const mq = maqs(c.maq);
      if (mq) out.cerco.maq = mq;
      if (c.aqui === true) out.cerco.aqui = true;                          // (lote 14, parte 14c: a cena é o próprio lugar cercado)
    }
    return Object.keys(out).length ? out : null;
  }
  // → { k, q, r, orient, sem, ter, nome, viz: { direção: bioma | 'agua' | null }, rios, caminhos, guerra }, ou null
  function valida(h) {
    if (!h || typeof h !== 'object') return null;
    const q = inteiro(h.q), r = inteiro(h.r);
    if (q == null || r == null) return null;
    const orient = h.orient === 'deitado' ? 'deitado' : 'pe', viz = {};
    for (const L of LADOS[orient]) viz[L.d] = h.viz && typeof h.viz === 'object' && okBio(h.viz[L.d]) ? h.viz[L.d] : null;
    const sem = (Math.round(Number(h.sem)) >>> 0) || 1;
    return { k: q + ',' + r, q, r, orient, sem, ter: okBio(h.ter) ? h.ter : null, nome: typeof h.nome === 'string' ? h.nome.trim().slice(0, 60) : '', viz,
      rios: (Array.isArray(h.rios) ? h.rios : []).slice(0, 3).map(p => peca(p, false)).filter(Boolean),
      caminhos: (Array.isArray(h.caminhos) ? h.caminhos : []).slice(0, 6).map(p => peca(p, true)).filter(Boolean), guerra: validaGuerra(h.guerra) };
  }
  // a cena aceita o hexágono quando ele é de terra (no mar e no lago, o Encontro fica como era)
  const aceita = hex => !!hex && !!hex.ter && hex.ter !== 'agua';

  /* ---- o mundo, em raios de hexágono ---- */
  const centro = (o, q, r) => (o === 'deitado' ? [1.5 * q, R3 * (q / 2 + r)] : [R3 * (q + r / 2), 1.5 * r]);
  const tijolo = o => (o === 'deitado' ? [1.5, R3] : [R3, 1.5]);
  // a semente de um par (a mesma dos dois lados: o par vai sempre na mesma ordem) e se o hexágono é o primeiro dele
  const mistura = (a, b) => { let x = (Math.imul((a >>> 0) ^ 0x9e3779b1, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35)) >>> 0; x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d); x ^= x >>> 12; return x >>> 0; };
  function doPar(hex, d) {
    const [dq, dr] = PASSO[hex.orient][d], q2 = hex.q + dq, r2 = hex.r + dr, primeiro = hex.q < q2 || (hex.q === q2 && hex.r < r2);
    const a = primeiro ? [hex.q, hex.r] : [q2, r2], b = primeiro ? [q2, r2] : [hex.q, hex.r];
    return { s: (mistura(mistura(mistura(mistura(hex.sem, a[0]), a[1]), b[0]), b[1]) % 2147483000) + 1, primeiro };
  }
  /* a onda de uma linha: de −1 a 1, ao longo de t (em raios de hexágono) — uma onda larga (uma vez e pouco por raio:
     o vizinho entra num lugar e a cena de cá entra na dele no outro, em todo lado) com o ruído por cima */
  const onda = seed => { const nz = Tracado.ruido(seed), fase = ((seed >>> 3) % 1000) / 1000; return t => clamp(0.72 * Math.sin(2 * Math.PI * (t * 1.3 + fase)) + (nz(t * 2.6, 0.37) - 0.5) * 1.9, -1, 1); };

  /* ---- os vizinhos no chão ----
     → para cada pedaço de lado com vizinho de outro bioma (ou de água): { L (o pedaço), tipo ('terra' | 'agua'), bio,
     t0 e t1 (o pedaço no mundo, ao longo do lado), lenMundo (o comprimento do lado inteiro), f(t) (a onda, de −1 a 1),
     apagaA e apagaB (a linha some na ponta a e na b), g(t) (o quanto o vizinho entra ali, já sumindo nas pontas) } */
  function lados(hex, principal) {
    const o = hex.orient, [cx, cy] = centro(o, hex.q, hex.r), [w, h] = tijolo(o), Ls = LADOS[o], out = [];
    const tipoDe = d => { const v = hex.viz[d]; return v === 'agua' ? 'agua' : v && v !== principal ? 'terra' : null; };
    // as pontas de cada pedaço (no mapa, de 0 a 1), para achar o vizinho que encosta em cada uma
    const pontas = L => (L.l === 'n' ? [[L.a, 0], [L.b, 0]] : L.l === 's' ? [[L.a, 1], [L.b, 1]] : L.l === 'o' ? [[0, L.a], [0, L.b]] : [[1, L.a], [1, L.b]]);
    const vizinhoNa = (L, p) => Ls.find(M => M !== L && pontas(M).some(q => Math.abs(q[0] - p[0]) < 1e-9 && Math.abs(q[1] - p[1]) < 1e-9));
    for (const L of Ls) {
      const tipo = tipoDe(L.d);
      if (!tipo) continue;
      const deitado = L.l === 'n' || L.l === 's', len = deitado ? w : h, base = deitado ? cx - w / 2 : cy - h / 2;
      const [pa, pb] = pontas(L), Ma = vizinhoNa(L, pa), Mb = vizinhoNa(L, pb);
      let f;
      if (tipo === 'terra') { const par = doPar(hex, L.d), on = onda(par.s); f = par.primeiro ? t => -on(t) : on; }
      else { const on = onda((mistura(mistura(hex.sem, hex.q * 7 + 3), hex.r * 13 + 'nslo'.indexOf(L.l)) % 2147483000) + 1); f = t => 0.6 + 0.4 * on(t); }
      // (a terra some nas duas pontas; a água só onde encosta noutro pedaço que não é de água) → g(t): o quanto entra ali
      const apaga = M => tipo === 'terra' || !M || tipoDe(M.d) !== 'agua', apagaA = apaga(Ma), apagaB = apaga(Mb), t0 = base + L.a * len, t1 = base + L.b * len;
      const g = t => f(t) * (apagaA ? suave((t - t0) / TAPER) : 1) * (apagaB ? suave((t1 - t) / TAPER) : 1);
      out.push({ L, tipo, bio: hex.viz[L.d], t0, t1, base, lenMundo: len, f, g, apagaA, apagaB });
    }
    return out;
  }
  /* O mapa do chão: de quem é cada casa — do bioma principal, do vizinho que entrou ali (o que mais entrou, quando dois
     chegam) ou da água. Os pedacinhos (menos de cinco casas) viram o que está em volta.
     → { bio (o índice do bioma, como no Biomas), agua (1 = a água do vizinho), vizs (os biomas dos vizinhos que entraram),
     temAgua, D (a fundura, em quadrados) } */
  function mapa(W, H, hex, principal, mist) {
    const N = W * H, ip = B.IDX[B.valido(principal)], bio = new Uint8Array(N).fill(ip), agua = new Uint8Array(N);
    const D = (FUNDO[mist] || FUNDO.media) * Math.min(W, H), ls = lados(hex, B.valido(principal));
    const dono = new Int16Array(N).fill(-1), sobra = new Float32Array(N);
    ls.forEach((S, k) => {
      const L = S.L, deitado = L.l === 'n' || L.l === 's', Dk = S.tipo === 'agua' ? D * MAIS_AGUA : D;
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const x = i + 0.5, y = j + 0.5, d = L.l === 'n' ? y : L.l === 's' ? H - y : L.l === 'o' ? x : W - x;
        if (d >= Dk) continue;
        const fr = deitado ? x / W : y / H;
        if (fr < L.a || fr > L.b) continue;
        const g = S.g(S.base + fr * S.lenMundo) * Dk, q = j * W + i;
        if (g > d && g - d > sobra[q]) { sobra[q] = g - d; dono[q] = k; }
      }
    });
    for (let q = 0; q < N; q++) {
      const k = dono[q];
      if (k < 0) continue;
      if (ls[k].tipo === 'agua') agua[q] = 1; else bio[q] = B.IDX[ls[k].bio];
    }
    // (os pedacinhos: de cada um — a água, cada bioma — os grupos com menos de cinco casas viram o que mais encosta; os
    // que encostam na borda ficam: a outra metade deles está na cena do vizinho)
    const classe = q => (agua[q] ? 255 : bio[q]), naBorda = q => { const i = q % W, j = (q - i) / W; return i === 0 || j === 0 || i === W - 1 || j === H - 1; };
    for (let volta = 0; volta < 2; volta++) {
      const visto = new Int32Array(N).fill(-1), grupos = [];
      for (let q0 = 0; q0 < N; q0++) {
        if (visto[q0] >= 0) continue;
        const c = classe(q0), fila = [q0], cel = [];
        visto[q0] = grupos.length;
        while (fila.length) { const q = fila.pop(), i = q % W, j = (q - i) / W; cel.push(q); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= W || y >= H) continue; const n = y * W + x; if (visto[n] < 0 && classe(n) === c) { visto[n] = grupos.length; fila.push(n); } } }
        grupos.push({ c, cel });
      }
      let mudou = false;
      for (const g of grupos) {
        if (g.cel.length >= 5 || grupos.length < 2 || g.cel.some(naBorda)) continue;
        const conta = new Map();
        for (const q of g.cel) { const i = q % W, j = (q - i) / W; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= W || y >= H) continue; const c = classe(y * W + x); if (c !== g.c) conta.set(c, (conta.get(c) || 0) + 1); } }
        let m = null, mc = -1;
        for (const [c, n] of conta) if (n > mc) { m = c; mc = n; }
        if (m == null) continue;
        for (const q of g.cel) { if (m === 255) agua[q] = 1; else { agua[q] = 0; bio[q] = m; } }
        mudou = true;
      }
      if (!mudou) break;
    }
    // (embaixo da água, o chão é o principal)
    for (let q = 0; q < N; q++) if (agua[q]) bio[q] = ip;
    const vizs = [];
    for (const S of ls) if (S.tipo === 'terra' && !vizs.includes(S.bio) && bio.includes(B.IDX[S.bio])) vizs.push(S.bio);
    return { bio, agua, vizs, temAgua: agua.includes(1), D };
  }
  /* A água dos vizinhos: cada pedaço de água (as casas ligadas), com o contorno que passa da borda (a água continua lá
     fora), a praia em volta (a água alargada em dois quadrados) e a beira (a espuma). → [{ pts, praia, beira, cel }] */
  function aguas(W, H, M) {
    const out = [], fora = 2.5;
    const empurra = pts => pts.map(([x, y]) => [x <= 0.05 ? -fora : x >= W - 0.05 ? W + fora : x, y <= 0.05 ? -fora : y >= H - 0.05 ? H + fora : y]);
    const contornoDe = (cel, em) => {
      const G = B.grupos(W, H, em), g = G.marca[cel[0]];
      const pts = g >= 0 ? Tracado.contorno(G.grupos[g].map(q => [q % W, (q - (q % W)) / W]), W, H, G.marca, g) : null;
      return pts && pts.length >= 4 ? Tracado.arredondar(empurra(Tracado.simplificar(pts, 0.6)), 3) : null;
    };
    const G = B.grupos(W, H, q => M.agua[q] === 1);
    for (const cel of G.grupos) {
      if (cel.length < 4) continue;
      const set = new Set(cel), pts = contornoDe(cel, q => set.has(q));
      if (!pts) continue;
      // a praia: a água alargada em dois quadrados (só para fora: o desenho dela fica embaixo da água)
      const largo = new Uint8Array(W * H);
      for (const q of cel) { const i = q % W, j = (q - i) / W; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < W && y < H && a * a + b * b <= 5) largo[y * W + x] = 1; } }
      const praia = contornoDe(cel, q => largo[q] === 1) || pts;
      // a beira: o contorno, só o que fica dentro do mapa (a espuma não corre por fora da borda)
      const beira = pts.concat([pts[0]]);
      out.push({ pts, praia, beira, cel: set });
    }
    return out;
  }

  /* ---- o rio e os caminhos ---- */
  // a ponta de um pedaço, no mapa W × H: na borda → o lado, o ponto de fora (um e meio para fora) e a casa da borda;
  // dentro → a casa
  function ponta(p, W, H, borda, prox) {
    const x = p[0] * W, y = p[1] * H, cel = clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1);
    if (!borda) return { x, y, borda: false, cel };
    const d = { o: p[0], l: 1 - p[0], n: p[1], s: 1 - p[1] };
    let lado = 'n';
    for (const k of ['s', 'o', 'l']) if (d[k] < d[lado] - 1e-9) lado = k;
    // (no canto, o lado de onde a linha se afasta)
    if (prox) { const quase = Object.keys(d).filter(k => d[k] < 1e-3); if (quase.length > 1) lado = quase.reduce((m, k) => { const v = { o: prox[0] - p[0], l: p[0] - prox[0], n: prox[1] - p[1], s: p[1] - prox[1] }; return v[k] > v[m] ? k : m; }); }
    const fora = lado === 'o' ? [-1.5, y] : lado === 'l' ? [W + 1.5, y] : lado === 'n' ? [x, -1.5] : [x, H + 1.5];
    return { x, y, borda: true, lado, fora, cel };
  }
  // a direção (da rosa) de um ponto do mapa, vista do meio
  const dirDe = (x, y, W, H) => Tracado.maisPerto(Math.atan2(y / H - 0.5, x / W - 0.5));
  /* Os rios e os caminhos do hexágono neste mapa: os pontos (em quadrados) e as pontas. As pontas de caminho no mesmo
     lado, a menos de dois quadrados uma da outra, viram uma só (a rota em cima da estrada, a bifurcação na borda).
     → { rios: [{ pts, ini, fim }], caminhos: [{ t, pts, ini, fim }] } */
  function linhas(hex, W, H) {
    const conv = pc => {
      const pts = pc.pts.map(([u, v]) => [u * W, v * H]);
      return { pts, ini: ponta(pc.pts[0], W, H, pc.ini, pc.pts[1]), fim: ponta(pc.pts[pc.pts.length - 1], W, H, pc.fim, pc.pts[pc.pts.length - 2]) };
    };
    const rios = hex.rios.map(conv), caminhos = hex.caminhos.map(pc => Object.assign({ t: pc.t }, conv(pc)));
    const pontas = [];
    for (const c of caminhos) for (const k of ['ini', 'fim']) {
      const p = c[k];
      if (!p.borda) continue;
      const igual = pontas.find(q => q.lado === p.lado && Math.hypot(q.x - p.x, q.y - p.y) < 2);
      if (igual) c[k] = igual; else pontas.push(p);
    }
    return { rios, caminhos };
  }
  // o vetor (do meio do mapa para um ponto), para a inclinação do chão (de onde o rio vem, para onde vai)
  const vetorPara = (x, y, W, H) => { const dx = x / W - 0.5, dy = y / H - 0.5, L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };

  // a distância (em quadrados, pelas oito vizinhas) de cada casa até a mais perto em que em(q) vale (sem nenhuma: Infinity)
  function distancia(W, H, em) {
    const N = W * H, d = new Float32Array(N).fill(Infinity), fila = [];
    for (let q = 0; q < N; q++) if (em(q)) { d[q] = 0; fila.push(q); }
    // (duas passadas do chanfro: a de ida e a de volta)
    for (let volta = 0; volta < 2 && fila.length; volta++) {
      const ordem = volta === 0 ? [...Array(N).keys()] : [...Array(N).keys()].reverse();
      for (const q of ordem) {
        const i = q % W, j = (q - i) / W;
        for (const [a, b, c] of [[-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1], [-1, -1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [1, 1, 1.414]]) {
          const x = i + a, y = j + b;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const v = d[y * W + x] + c;
          if (v < d[q]) d[q] = v;
        }
      }
    }
    return d;
  }
  // (a ponta do rio que cai na água do vizinho: a nascente fica na terra mais perto; a foz na água já vale)
  function naTerra(p, agua, W, H) {
    if (!p || !agua[p.cel]) return p;
    let m = -1, dm = Infinity;
    const i0 = p.cel % W, j0 = Math.floor(p.cel / W);
    for (let q = 0; q < W * H; q++) { if (agua[q]) continue; const d = Math.hypot(q % W - i0, Math.floor(q / W) - j0); if (d < dm) { dm = d; m = q; } }
    return m < 0 ? p : { x: m % W + 0.5, y: Math.floor(m / W) + 0.5, borda: false, cel: m };
  }
  // o rio do mapa (o mais comprido; o segundo vira o afluente): as pontas para o Biomas.rioDe — ou null, sem rio
  function rioDoMapa(Ls, M, W, H) {
    const r0 = Ls.rios[0] || null, r1 = Ls.rios[1] || null;
    return r0 ? { pIni: naTerra(r0.ini, M.agua, W, H), pFim: r0.fim, pAf: r1 ? naTerra(r1.ini, M.agua, W, H) : null } : null;
  }
  // a altura no hexágono: alta de onde o rio do mapa vem e baixa para onde ele vai (sem ele: a inclinação o pedida) e
  // perto da água dos vizinhos
  function altura(W, H, seed, M, dAgua, rh, o) {
    const alt = B.alturas(W, H, seed, rh ? { de: vetorPara(rh.pIni.x, rh.pIni.y, W, H), para: vetorPara(rh.pFim.x, rh.pFim.y, W, H), mar: null, k: 0.7 } : Object.assign({}, o, { mar: null }));
    if (M.temAgua) {
      let lo = Infinity, hi = -Infinity;
      for (let q = 0; q < W * H; q++) { alt[q] -= 0.55 * Math.max(0, 1 - dAgua[q] / 9); lo = Math.min(lo, alt[q]); hi = Math.max(hi, alt[q]); }
      const s = hi - lo > 1e-6 ? 1 / (hi - lo) : 0;
      for (let q = 0; q < W * H; q++) alt[q] = (alt[q] - lo) * s;
    }
    return alt;
  }
  /* O campo inteiro no hexágono (como o Biomas.campo): o chão com os vizinhos nas bordas e a água deles; a altura (alta
     de onde o rio vem, baixa para onde ele vai e perto da água); o rio do mapa, pelos pontos (o afluente, se o mapa tem
     outro; o lago, se pedido ou se o rio acaba ali dentro) — sem rio no mapa, a água escolhida (o.agua; o rio pela
     rosa, como sempre); os patamares longe da água e a três quadrados da borda (a borda fica como a do vizinho) e as
     manchas dos vizinhos. o: { bioma, mistura, hex (conferido), agua ('rio' | 'lago' | 'nenhuma'), rio: { de, para,
     curvas, hw, afluente, lago } }. → como o Biomas.campo, com mares (a água dos vizinhos) e linhas (os rios e os
     caminhos do hexágono, em quadrados) */
  function campo(W, H, seed, o) {
    const BB = B.BIO[B.valido(o.bioma)], mist = B.mistura(o.mistura), N = W * H, hex = o.hex;
    const M = mapa(W, H, hex, BB.id, mist), mares = aguas(W, H, M), Ls = linhas(hex, W, H), rr = mulberry((B.sub(seed, 1) % 2147483000) + 1);
    const ehMarQ = q => M.agua[q] === 1;
    const ehMar = (x, y) => { const i = Math.floor(x), j = Math.floor(y); return i >= 0 && j >= 0 && i < W && j < H && M.agua[j * W + i] === 1; };
    const dAgua = distancia(W, H, ehMarQ), pertoDoMar = q => dAgua[q] < 3;
    // o rio: o do mapa — sem ele, o escolhido (pela rosa; sem ela, de um lado sorteado)
    const rh = rioDoMapa(Ls, M, W, H), rio0 = o.rio || {};
    let agua = o.agua === 'lago' || o.agua === 'nenhuma' ? o.agua : 'rio', R0 = null, inc = { de: null, para: null, k: 0.7 };
    if (rh) { agua = 'rio'; R0 = Object.assign({}, rio0, { de: null, para: null, pIni: rh.pIni, pFim: rh.pFim, pAf: rh.pAf, afluente: !!rh.pAf || rio0.afluente === true }); }
    else if (agua === 'rio') {
      R0 = Object.assign({}, rio0);
      inc = { de: R0.de || null, para: Tracado.valida(R0.para) ? R0.para : null, k: 0.7 };
      if (!Tracado.valida(R0.de) && !inc.para) inc = { de: Tracado.IDS[Math.floor(rr() * 8) % 8], para: null, k: 0.45 };
    }
    const alt = altura(W, H, B.sub(seed, 2), M, dAgua, rh, inc);
    const bio = M.bio, bioEm = (x, y) => B.LISTA[bio[clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1)]];
    const altEm = (x, y) => alt[clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1)];
    const { rios, lagos } = B.aguaDe(W, H, alt, seed, agua, R0, null, ehMarQ, pertoDoMar);
    // perto da água (sem patamar): o rio, o lago e o mar; e a três quadrados da borda
    const perto = new Uint8Array(N);
    const marca = (x, y, r) => { for (let j = Math.max(0, Math.floor(y - r)); j <= Math.min(H - 1, Math.floor(y + r)); j++) for (let i = Math.max(0, Math.floor(x - r)); i <= Math.min(W - 1, Math.floor(x + r)); i++) if (Math.hypot(i + 0.5 - x, j + 0.5 - y) <= r) perto[j * W + i] = 1; };
    for (const r of rios) for (const p of r.pts.filter((_, i) => i % 2 === 0)) marca(p[0], p[1], r.hw + 1.8);
    for (const l of lagos) for (const q of l.cel) marca(q % W + 0.5, Math.floor(q / W) + 0.5, 2);
    for (let q = 0; q < N; q++) { const i = q % W, j = (q - i) / W; if (pertoDoMar(q) || Math.min(i, j, W - 1 - i, H - 1 - j) < 3) perto[q] = 1; }
    const { planaltos, paredoes } = B.patamares(W, H, alt, bio, q => !perto[q]);
    const manchas = B.manchasDe(W, H, bio, M.vizs);
    return { principal: BB.id, mistura: mist, vizs: M.vizs.slice(), alt, bio, bioEm, altEm, mar: null, mares, ehMar, rios, lagos, planaltos, paredoes, manchas, perto, agua, linhas: Ls, D: M.D };
  }
  /* (para o Encontro) As pontas dos caminhos do hexágono na borda, cada uma uma vez (a de mais de um caminho, uma só), com
     o tipo (a estrada vale mais). → [{ x, y, lado, fora, cel, t }] */
  function pontasDosCaminhos(Ls) {
    const out = [];
    for (const c of Ls.caminhos) for (const p of [c.ini, c.fim]) {
      if (!p.borda) continue;
      const ja = out.find(q => q.p === p);
      if (ja) { if (c.t === 'estrada') ja.t = 'estrada'; continue; }
      out.push({ p, t: c.t });
    }
    return out.map(x => Object.assign({}, x.p, { t: x.t }));
  }
  /* (para o Encontro) O caminho da situação com as pontas nos pontos do hexágono: as pontas dele que ficam na borda (ou
     fora, ou a menos de dois quadrados e meio dela) saem, e ele vai de cada uma das que sobram até a ponta do hexágono
     mais perto (cada ponta uma vez; com uma ponta só, a outra ponta da situação acaba ali dentro). → { ctrl, usadas } */
  function prenderNaSituacao(ctrl, W, H, pontas) {
    const ext = p => Math.min(p[0], p[1], W - p[0], H - p[1]) < 2.5;
    let a = 0, b = ctrl.length - 1;
    const iniExt = ext(ctrl[0]), fimExt = ext(ctrl[b]);
    if (iniExt) while (a < b && ext(ctrl[a])) a++;
    if (fimExt) while (b > a && ext(ctrl[b])) b--;
    if (a >= b || !pontas.length || (!iniExt && !fimExt)) return { ctrl, usadas: [] };
    const nucleo = ctrl.slice(a, b + 1), livres = pontas.slice(), usadas = [];
    const pega = ref => { if (!livres.length) return null; let m = 0; for (let k = 1; k < livres.length; k++) if (Math.hypot(livres[k].x - ref[0], livres[k].y - ref[1]) < Math.hypot(livres[m].x - ref[0], livres[m].y - ref[1])) m = k; return livres.splice(m, 1)[0]; };
    // (a ponta que tem a ponta do hexágono mais perto escolhe primeiro)
    const ends = [];
    if (iniExt) ends.push({ k: 'ini', ref: [clamp(ctrl[0][0], 0, W), clamp(ctrl[0][1], 0, H)] });
    if (fimExt) ends.push({ k: 'fim', ref: [clamp(ctrl[ctrl.length - 1][0], 0, W), clamp(ctrl[ctrl.length - 1][1], 0, H)] });
    const dist = e => Math.min(...livres.map(p => Math.hypot(p.x - e.ref[0], p.y - e.ref[1])));
    ends.sort((x, y) => dist(x) - dist(y));
    const dest = {};
    for (const e of ends) { const p = pega(e.ref); if (p) { dest[e.k] = p; usadas.push(p); } }
    const entra = p => { const d = 2.5, v = p.lado === 'o' ? [d, 0] : p.lado === 'l' ? [-d, 0] : p.lado === 'n' ? [0, d] : [0, -d]; return [p.x + v[0], p.y + v[1]]; };
    let out = nucleo.map(q => q.slice());
    if (dest.ini) out = [dest.ini.fora.slice(), [dest.ini.x, dest.ini.y], entra(dest.ini)].concat(out);
    if (dest.fim) out = out.concat([entra(dest.fim), [dest.fim.x, dest.fim.y], dest.fim.fora.slice()]);
    return { ctrl: out, usadas };
  }

  /* ---- a frase da janela (e do resumo) ---- */
  const nomeBio = id => (id === 'agua' ? 'água' : B.BIO[id] ? B.BIO[id].n.toLowerCase() : '');
  const juntar = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
  // os vizinhos de outro bioma (e a água), juntos pelo bioma: "campo a leste e a sudeste, água a nordeste"
  function vizinhosTxt(hex, principal) {
    const por = new Map();
    for (const L of LADOS[hex.orient]) { const v = hex.viz[L.d]; if (!v || v === principal) continue; if (!por.has(v)) por.set(v, []); por.get(v).push(NA_DIR[L.d]); }
    return Array.from(por, ([v, ds]) => nomeBio(v) + ' ' + juntar(ds));
  }
  function linhaTxt(pc, W, H, nome) {
    const a = pc.ini.borda ? dirDe(pc.ini.x, pc.ini.y, W, H) : null, b = pc.fim.borda ? dirDe(pc.fim.x, pc.fim.y, W, H) : null;
    if (nome === 'o rio') return a && b ? 'o rio entra ' + PELA_DIR[a] + ' e sai ' + PELA_DIR[b] : a ? 'o rio entra ' + PELA_DIR[a] + ' e acaba num lago' : b ? 'o rio nasce aqui e sai ' + PELA_DIR[b] : 'o rio';
    return a && b ? nome + ' vai ' + DO_DIR[a] + ' ' + AO_DIR[b] : a || b ? nome + ' chega ' + PELA_DIR[a || b] + ' e acaba aqui' : nome;
  }
  // o rio do hexágono e os caminhos, em palavras ('' sem eles): "o rio entra pelo oeste e sai pelo leste (com um afluente)"
  function rioTxt(hex) {
    const Ls = linhas(hex, 100, 100);
    return Ls.rios.length ? linhaTxt(Ls.rios[0], 100, 100, 'o rio') + (Ls.rios.length > 1 ? ' (com um afluente)' : '') : '';
  }
  function caminhosTxt(hex) {
    const cams = linhas(hex, 100, 100).caminhos.map(c => linhaTxt(c, 100, 100, c.t === 'estrada' ? 'a estrada' : 'a trilha'));
    return cams.length ? juntar(cams.slice(0, 3)) + (cams.length > 3 ? ' (e mais ' + (cams.length - 3) + ')' : '') : '';
  }
  const numTxt = n => String(n).replace('-', '−');
  // no resumo do plano (p.hex): "do hexágono 0, 0 do Mapa-múndi (a água dos vizinhos, o rio e os caminhos do mapa)"
  function resumoTxt(ph) {
    const leva = [];
    if (ph.agua) leva.push('a água dos vizinhos');
    if (ph.rioDoMapa) leva.push('o rio do mapa');
    if (ph.camDoMapa) leva.push(ph.caminhos === 1 ? 'o caminho do mapa' : 'os caminhos do mapa');
    return 'do hexágono ' + numTxt(ph.q) + ', ' + numTxt(ph.r) + ' do Mapa-múndi' + (leva.length ? ' (' + juntar(leva) + ')' : '');
  }
  /* "Floresta (hexágono 12, −3): campo a leste, água a nordeste; o rio entra pelo oeste e sai pelo leste; a estrada vai
     do oeste ao leste." */
  function texto(hex, principal) {
    const partes = [], viz = vizinhosTxt(hex, principal || hex.ter), rio = rioTxt(hex), cam = caminhosTxt(hex);
    partes.push(viz.length ? juntar(viz) : 'os vizinhos são do mesmo chão');
    if (rio) partes.push(rio);
    if (cam) partes.push(cam);
    return (hex.nome || nomeBio(hex.ter) || 'Hexágono') + ' (hexágono ' + numTxt(hex.q) + ', ' + numTxt(hex.r) + '): ' + partes.join('; ') + '.';
  }

  return { LADOS, PASSO, FUNDO, valida, validaGuerra, aceita, centro, tijolo, doPar, lados, mapa, aguas, linhas, ponta, dirDe, vetorPara, distancia, naTerra, rioDoMapa, altura, campo, pontasDosCaminhos, prenderNaSituacao, vizinhosTxt, rioTxt, caminhosTxt, resumoTxt, texto, nomeBio };
})();
