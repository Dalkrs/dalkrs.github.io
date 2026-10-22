/* ---------------------------------------------------------------
   10c4. BIOMAS — o motor de biomas (lote 13, parte 13a)
   A conta por baixo dos lugares de natureza aberta (a Região livre; depois, o chão do Encontro). Tudo é conta pura,
   sorteada pela semente: a mesma semente, com as mesmas escolhas, dá o mesmo chão.
   · os biomas, de uma tabela pronta: o nome, a paleta do chão, as árvores (a espécie de cada estilo) e quantas, os
     enfeites e as pedrinhas, se é de pedra (no alto, o planalto de pedra e o paredão; nos outros, o morro), a água
     parada (o gelo, a lava, o espelho), as poças (a água rasa, o lodo, a lava), onde ele fica quando é vizinho (os de
     altura no alto, os de água no baixo, a costa num lado, junto do mar) e os vizinhos que combinam com ele;
   · a altura do chão (o ruído, de 0 a 1), inclinada pelo rio (de onde ele vem é alto; para onde vai, baixo) e pelo
     mar (baixo);
   · o mapa dos biomas: o principal e um ou dois vizinhos, pela Mistura (pouca, média ou muita), em manchas que se
     juntam, sem os pedacinhos soltos;
   · o rio que desce pelo relevo, do alto para o baixo, pelo caminho mais barato (subir custa muito; o vale é bom), com
     as curvas pedidas: acaba num lago, no mar ou sai pela borda; o afluente desce até ele; o lago enche a parte mais
     baixa, como a água sobe;
   · os patamares, onde o chão passa de uma altura (longe da água): nos biomas de pedra, o planalto e, mais alto, o
     paredão; nos outros, o morro e, mais alto, o topo dele.
   (lote 13, parte 13b) O Encontro usa as etapas em separado, com a situação no meio: a altura e o rio da rosa antes
   dela (aguaDe; o rio desvia do que ela põe de grande: o.bloq), o mapa dos vizinhos longe do meio dela
   (mapaDosBiomas … longe), as manchas (manchasDe) e os patamares só onde ela não usa (patamares … ok); o mar da costa
   pode entrar mais num ponto (marDe … forma: a enseada).
   --------------------------------------------------------------- */
const Biomas = (() => {
  /* A tabela. arv(E, rnd, estilo): a espécie de uma árvore (E: o estilo, com as árvores dele). ter: o terreno dos
     encontros (as árvores e os enfeites de sempre). alto: que parte do mapa (do mais alto para baixo) é patamar e
     que parte é o mais alto, onde o bioma está. morro: as cores do morro [a luz do alto, a encosta, as curvas de nível]
     (os de pedra usam as da pedra: Paisagem.PEDRA). clareira: as cores do chão aberto (Encontro.motor.CH, ou elas mesmas). */
  const LISTA = [
    { id: 'floresta', n: 'Floresta', em: 'na floresta', pal: 'floresta', ter: 'floresta', dens: 0.15, arv: E => E.arvore.floresta, enf: ['arbusto', 'toco', 'cogumelos', 'pedra', 'arbusto'], pedrinhas: 3, juncos: 0.15, mata: true,
      rocha: false, alto: [0.2, 0.06], morro: ['#a9c27a', '#5a7444', '#1f2a17'], clareira: 'clareira', pref: null, viz: ['campo', 'montanha', 'pantano'] },
    { id: 'campo', n: 'Campo', em: 'no campo', pal: 'campo', ter: 'campo', dens: 0.03, arv: E => E.arvore.campo, enf: ['arbusto', 'pedra', 'flores'], pedrinhas: 3, juncos: 0.15,
      rocha: false, alto: [0.15, 0.05], morro: ['#c3d68f', '#667f48', '#2c3a1f'], clareira: 'grama', pref: null, viz: ['floresta', 'savana', 'costa'] },
    { id: 'deserto', n: 'Deserto', em: 'no deserto', pal: 'areia', ter: 'deserto', dens: 0.012, arv: () => 'cacto', enf: ['pedra', 'arbusto', 'pedra'], pedrinhas: 5, juncos: 0,
      rocha: true, pedra: 'canion', alto: [0.16, 0.05], clareira: 'areia', pref: null, viz: ['savana', 'montanha', 'costa'] },
    { id: 'montanha', n: 'Montanha', em: 'na montanha', pal: 'rocha', ter: 'montanha', dens: 0.03, arv: (E, r, est) => (est === 'anao' ? 'rocha' : 'pinheiro'), enf: ['pedra', 'pedra', 'arbusto'], pedrinhas: 10, juncos: 0,
      rocha: true, pedra: 'rocha', alto: [0.26, 0.09], clareira: 'terra', pref: 'alto', viz: ['floresta', 'neve', 'tundra'] },
    { id: 'pantano', n: 'Pântano', em: 'no pântano', pal: 'pantano', ter: 'pantano', dens: 0.1, arv: (E, r) => (r() < 0.6 ? 'mangue' : 'morta'), enf: ['toco', 'cogumelos', 'arbusto'], pedrinhas: 0, juncos: 0.4, mata: true,
      rocha: false, alto: [0.07, 0.02], morro: ['#9aa878', '#454f33', '#1d2316'], clareira: 'ilha', pref: 'baixo', poca: 'agua', viz: ['floresta', 'selva', 'corrompida'] },
    { id: 'neve', n: 'Neve', em: 'na neve', pal: 'neve', ter: 'neve', dens: 0.07, arv: E => (E.arvore.neve === 'rocha' ? 'rocha' : 'pinheiro'), enf: ['pedra', 'toco', 'pedra'], pedrinhas: 4, juncos: 0, neve: true,
      rocha: true, pedra: 'neve', alto: [0.18, 0.06], clareira: 'neveFunda', pref: 'alto', lago: 'gelo', viz: ['tundra', 'montanha', 'floresta'] },
    { id: 'selva', n: 'Selva', em: 'na selva', pal: 'selva', ter: 'selva', dens: 0.18, arv: (E, r) => (r() < 0.82 ? 'selva' : 'palmeira'), enf: ['arbusto', 'flores', 'cogumelos', 'arbusto'], pedrinhas: 2, juncos: 0.25, mata: true,
      rocha: false, alto: [0.16, 0.05], morro: ['#8fbf6a', '#30552a', '#122412'], clareira: 'clareira', pref: 'baixo', viz: ['pantano', 'floresta', 'costa'] },
    { id: 'corrompida', n: 'Terra corrompida', em: 'na terra corrompida', pal: 'corrompida', ter: 'corrompida', dens: 0.07, arv: () => 'morta', enf: ['pedra', 'cogumelos'], pedrinhas: 4, juncos: 0.1,
      rocha: false, alto: [0.2, 0.06], morro: ['#a594b0', '#4a3f52', '#1f1826'], clareira: 'rachado', pref: null, poca: 'lodo', viz: ['pantano', 'floresta', 'cristais'] },
    { id: 'lava', n: 'Lava', em: 'na terra de lava', pal: 'basalto', ter: 'lava', dens: 0.012, arv: () => 'carbonizada', enf: ['pedra'], pedrinhas: 6, juncos: 0,
      rocha: true, pedra: 'basalto', alto: [0.16, 0.06], clareira: 'cinza', pref: null, agua: 'lava', lago: 'lava', poca: 'lava', viz: ['montanha', 'corrompida', 'deserto'] },
    { id: 'cristais', n: 'Cristais', em: 'entre os cristais', pal: 'cristal', ter: 'cristais', dens: 0.02, arv: () => 'cristal', enf: ['pedra'], pedrinhas: 3, juncos: 0, cristais: true,
      rocha: true, pedra: 'cristal', alto: [0.18, 0.06], clareira: 'cristalClaro', pref: 'alto', lago: 'espelho', viz: ['montanha', 'neve', 'corrompida'] },
    { id: 'savana', n: 'Savana', em: 'na savana', pal: 'savana', ter: 'campo', dens: 0.022, arv: () => 'acacia', enf: ['arbusto', 'pedra', 'arbusto'], pedrinhas: 3, juncos: 0.1,
      rocha: false, alto: [0.14, 0.04], morro: ['#e0d49a', '#8f884c', '#4a4424'], clareira: 'capimAlto', pref: null, viz: ['campo', 'deserto', 'floresta'] },
    { id: 'costa', n: 'Costa', em: 'na costa', pal: 'campo', ter: 'campo', dens: 0.03, arv: (E, r) => (r() < 0.55 ? 'palmeira' : E.arvore.campo), enf: ['pedra', 'arbusto'], pedrinhas: 4, juncos: 0.12,
      rocha: true, pedra: 'mar', alto: [0.14, 0.05], clareira: 'grama', pref: 'borda', mar: true, viz: ['campo', 'selva', 'deserto'] },
    { id: 'tundra', n: 'Tundra', em: 'na tundra', pal: 'tundra', ter: 'neve', dens: 0.012, arv: () => 'pinheiro', enf: ['pedra', 'pedra', 'toco'], pedrinhas: 8, juncos: 0, neve: true,
      rocha: true, pedra: 'tundra', alto: [0.16, 0.05], clareira: ['#a3ab98', '#b3baa8', '#959d8a', '#c2c8b6'], pref: 'alto', lago: 'gelo', viz: ['neve', 'montanha', 'campo'] },
  ];
  const BIO = Object.fromEntries(LISTA.map(b => [b.id, b]));
  const IDS = LISTA.map(b => b.id), IDX = Object.fromEntries(IDS.map((id, k) => [id, k]));
  const valido = id => (typeof id === 'string' && BIO[id] ? id : 'floresta');
  const MISTURAS = [['pouca', 'Pouca', null, 'Os vizinhos em poucas manchas'], ['media', 'Média', null, 'O principal e uns pedaços dos vizinhos'], ['muita', 'Muita', null, 'Quase metade da cena é dos vizinhos']];
  const FRACAO = { pouca: 0.16, media: 0.32, muita: 0.48 };
  const mistura = v => (typeof v === 'string' && FRACAO[v] != null ? v : 'media');

  /* ---- a conta de apoio ---- */
  // a semente de uma parte do sorteio (k), bem embaralhada (a mesma conta do motor dos encontros)
  const sub = (seed, k) => { let h = ((seed >>> 0) ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) || (k + 1); };
  const sorteio = s => mulberry((s % 2147483000) + 1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const VIZ4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const VIZ8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  // o lado do mapa → o vetor para fora; a direção da rosa → o vetor dela
  const LADO = { n: [0, -1], s: [0, 1], o: [-1, 0], l: [1, 0] };
  const vetor = id => { const d = Tracado.DIR[id]; return d ? [Math.cos(d.a), Math.sin(d.a)] : null; };
  const angLado = l => Math.atan2(LADO[l][1], LADO[l][0]);
  // a distância de um ponto à borda de um lado, e a medida do mapa nessa direção
  const distLado = (lado, x, y, W, H) => (lado === 'n' ? y : lado === 's' ? H - y : lado === 'o' ? x : W - x);
  const fundoDe = (lado, W, H) => (lado === 'n' || lado === 's' ? H : W);
  // o lado mais perto de uma casa da borda
  const ladoDaCasa = (q, W, H) => { const i = q % W, j = (q - i) / W, d = { n: j, s: H - 1 - j, o: i, l: W - 1 - i }; return Object.keys(d).reduce((m, k) => (d[k] < d[m] ? k : m), 'n'); };

  // os grupos ligados (pelas quatro vizinhas) das casas em que em(q) vale → { grupos: [[q…]], marca: q → o grupo }
  function grupos(W, H, em) {
    const N = W * H, marca = new Int32Array(N).fill(-1), out = [];
    for (let k = 0; k < N; k++) {
      if (marca[k] >= 0 || !em(k)) continue;
      const g = out.length, fila = [k], cel = [];
      marca[k] = g;
      while (fila.length) {
        const q = fila.pop(), i = q % W, j = (q - i) / W;
        cel.push(q);
        for (const [a, b] of VIZ4) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= W || y >= H) continue; const n = y * W + x; if (marca[n] < 0 && em(n)) { marca[n] = g; fila.push(n); } }
      }
      out.push(cel);
    }
    return { grupos: out, marca };
  }
  // o contorno macio de um grupo (em quadrados), ou null: a escada das casas sai, a forma fica
  function contornoDe(cel, W, H, marca, g, voltas, eps) {
    const pts = Tracado.contorno(cel.map(q => [q % W, (q - (q % W)) / W]), W, H, marca, g);
    if (!pts || pts.length < 4) return null;
    const s = Tracado.simplificar(pts, eps == null ? 0.6 : eps);
    return s.length >= 3 ? Tracado.arredondar(s, voltas == null ? 2 : voltas) : null;
  }
  /* O caminho mais barato (Dijkstra, pelas oito vizinhas) das fontes até uma casa em que alvo(q) vale. custo(de, para,
     passo): o preço do passo (Infinity: não passa). → os índices, da fonte ao alvo, ou null */
  function maisBarato(W, H, fontes, alvo, custo) {
    const N = W * H, dist = new Float64Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), hp = [];
    const sobe = i => { while (i > 0) { const p = (i - 1) >> 1; if (hp[p][0] <= hp[i][0]) break; [hp[p], hp[i]] = [hp[i], hp[p]]; i = p; } };
    const desce = i => { for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hp.length && hp[l][0] < hp[m][0]) m = l; if (r < hp.length && hp[r][0] < hp[m][0]) m = r; if (m === i) return; [hp[m], hp[i]] = [hp[i], hp[m]]; i = m; } };
    const poe = (d, q) => { hp.push([d, q]); sobe(hp.length - 1); };
    const tira = () => { const t = hp[0], u = hp.pop(); if (hp.length) { hp[0] = u; desce(0); } return t; };
    for (const f of fontes) { dist[f] = 0; poe(0, f); }
    let fim = -1;
    while (hp.length) {
      const [d, q] = tira();
      if (d > dist[q]) continue;
      if (alvo(q)) { fim = q; break; }
      const i = q % W, j = (q - i) / W;
      for (const [a, b, L] of VIZ8) {
        const x = i + a, y = j + b;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const m = y * W + x, c = custo(q, m, L);
        if (!(c < Infinity) || d + c >= dist[m]) continue;
        dist[m] = d + c; de[m] = q; poe(d + c, m);
      }
    }
    if (fim < 0) return null;
    const out = [];
    for (let q = fim; q >= 0; q = de[q]) out.push(q);
    return out.reverse();
  }
  /* As casas → a linha macia (um ponto a cada meio quadrado): uma casa a cada duas, uma volta de Chaikin (tira os
     dentes da escada) e a curva por elas. ini e fim: um ponto a mais no começo e no fim (fora da borda, dentro do mar). */
  function linhaDe(W, cel, ini, fim) {
    const c = cel.map(q => [q % W + 0.5, Math.floor(q / W) + 0.5]), ctl = [];
    for (let k = 0; k < c.length; k += 2) ctl.push(c[k]);
    if (c.length > 1 && ctl[ctl.length - 1] !== c[c.length - 1]) ctl.push(c[c.length - 1]);
    if (ini) ctl.unshift(ini);
    if (fim) ctl.push(fim);
    if (ctl.length < 2) return ctl;
    const q = [ctl[0]];
    for (let i = 0; i < ctl.length - 1; i++) { const a = ctl[i], b = ctl[i + 1]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
    q.push(ctl[ctl.length - 1]);
    return Tracado.suave(q, 0.5);
  }
  /* A linha serpenteando (como o rio de sempre, em Tracado.caminho): pontos de controle a cada uns seis quadrados ao
     longo dela, empurrados para os lados (um para cada lado, quase sempre), tanto mais quanto mais curvas (0 = segue a
     linha; 10 = bem sinuoso); as pontas ficam, e os pontos fixos (o meio do lago no caminho) também. */
  function serpentear(pts, curvas, rnd, maxAmp, fixos) {
    const L = Tracado.comprimento(pts), k = clamp(Number(curvas), 0, 10) / 10, amp = k * Math.min(maxAmp, L * 0.11);
    if (L < 4 || amp < 0.05) return pts;
    const esp = Math.max(5.5, amp * 2.3), n = Math.max(2, Math.round(L / esp)), ctl = [pts[0]];
    let lado = rnd() < 0.5 ? 1 : -1;
    for (let i = 1; i < n; i++) {
      // (o passo e o tamanho de cada curva variam: o rio não fica uma onda certinha)
      const t = (i + (rnd() - 0.5) * 0.5) / n, p = Tracado.aoLongo(pts, t), env = Math.sqrt(Math.sin(Math.PI * t));
      if (rnd() < 0.8) lado = -lado;
      const off = lado * amp * (0.35 + 0.65 * rnd()) * env;
      ctl.push([p.x - Math.sin(p.ang) * off, p.y + Math.cos(p.ang) * off]);
    }
    ctl.push(pts[pts.length - 1]);
    for (const f of fixos || []) {
      let m = 1, dm = Infinity;
      for (let i = 1; i < ctl.length - 1; i++) { const d = Math.hypot(ctl[i][0] - f[0], ctl[i][1] - f[1]); if (d < dm) { dm = d; m = i; } }
      if (ctl.length > 2) ctl[m] = f.slice();
    }
    return Tracado.suave(ctl, 0.5);
  }
  // o ponto fora da borda ao lado de uma casa da borda (o rio entra e sai do mapa por ali)
  const foraDa = (q, W, H) => { const i = q % W, j = (q - i) / W, x = i + 0.5, y = j + 0.5, l = ladoDaCasa(q, W, H); return l === 'n' ? [x, -1.5] : l === 's' ? [x, H + 1.5] : l === 'o' ? [-1.5, y] : [W + 1.5, y]; };

  /* (lote 14, parte 14a) A linha que entra e sai pelos pontos certos da borda (o rio e o caminho do hexágono passam pelo
     mesmo ponto na cena do vizinho): o pedaço de fora, em cada ponta pedida, troca pelo ponto exato da borda e pelo de
     fora dele. ini, fim: { x, y, fora } (a ponta do hexágono) ou null (a ponta fica como está) */
  function prenderPontas(pts, W, H, ini, fim) {
    const dentro = p => p[0] > 0.3 && p[1] > 0.3 && p[0] < W - 0.3 && p[1] < H - 0.3;
    let a = 0, b = pts.length - 1;
    if (ini) while (a < b && !dentro(pts[a])) a++;
    if (fim) while (b > a && !dentro(pts[b])) b--;
    let out = pts.slice(a, b + 1);
    if (ini) out = [ini.fora.slice(), [ini.x, ini.y]].concat(out);
    if (fim) out = out.concat([[fim.x, fim.y], fim.fora.slice()]);
    return out;
  }

  /* ---- a altura ----
     O ruído (as feições de uns onze quadrados), inclinado: alto de onde o rio vem, baixo para onde ele vai e para o lado
     do mar (k: quanto inclina). → a altura de cada casa, de 0 a 1 */
  function alturas(W, H, seed, o) {
    const nA = Tracado.ruido(seed), EA = 1 / 11, alt = new Float32Array(W * H);
    // (lote 14, parte 14a: de e para também podem vir como o vetor [x, y] — os pontos do rio do hexágono)
    const de = Array.isArray(o.de) ? o.de : vetor(o.de), para = Array.isArray(o.para) ? o.para : vetor(o.para), mar = o.mar ? LADO[o.mar] : null, k = o.k == null ? 0.7 : o.k;
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const u = (i + 0.5) / W - 0.5, v = (j + 0.5) / H - 0.5;
      let a = nA((i + 0.5) * EA, (j + 0.5) * EA), t = 0, n = 0;
      if (de) { t += u * de[0] + v * de[1]; n++; }
      if (para) { t -= u * para[0] + v * para[1]; n++; }
      if (mar) { t -= (u * mar[0] + v * mar[1]) * 1.2; n++; }
      if (n) a += k * t / Math.max(1, n * 0.75);
      alt[j * W + i] = a; lo = Math.min(lo, a); hi = Math.max(hi, a);
    }
    const s = hi - lo > 1e-6 ? 1 / (hi - lo) : 0;
    for (let q = 0; q < alt.length; q++) alt[q] = (alt[q] - lo) * s;
    return alt;
  }

  /* ---- o mapa dos biomas ---- */
  // os vizinhos: um (pouca), um ou dois (média, pela semente) ou dois (muita), da tabela do principal
  function vizinhosDe(B, mist, rr) {
    const pool = B.viz.slice(), n = mist === 'pouca' ? 1 : mist === 'muita' ? 2 : rr() < 0.5 ? 1 : 2, out = [];
    for (let k = 0; k < n && pool.length; k++) out.push(pool.splice(Math.floor(rr() * pool.length) % pool.length, 1)[0]);
    return out;
  }
  /* Cada vizinho fica com a parte dele (as casas em que o ruído dele, mais a preferência, é maior: os de altura no alto,
     os de água no baixo, a costa na faixa do mar; com a costa de principal, os vizinhos ficam longe do mar). Depois,
     duas voltas da maioria em volta e os pedacinhos (menos de seis casas) viram o que está em volta. */
  function mapaDosBiomas(W, H, seed, B, vizs, frac, alt, marLado, longe) {
    const N = W * H, ip = IDX[B.id], bio = new Uint8Array(N).fill(ip);
    vizs.forEach((v, k) => {
      const BV = BIO[v], fv = vizs.length === 1 ? frac : (k === 0 ? 0.58 : 0.42) * frac, nz = Tracado.ruido(sub(seed, 10 + k)), EV = 1 / 8, cand = [];
      for (let q = 0; q < N; q++) {
        if (bio[q] !== ip) continue;
        const i = q % W, j = (q - i) / W, x = i + 0.5, y = j + 0.5;
        let s = nz(x * EV, y * EV);
        if (BV.pref === 'alto') s += 0.8 * alt[q];
        else if (BV.pref === 'baixo') s += 0.8 * (1 - alt[q]);
        else if (BV.pref === 'borda' && marLado) s = 2 - distLado(marLado, x, y, W, H) / fundoDe(marLado, W, H) + 0.25 * s;
        if (B.mar && marLado) s += 1.1 * distLado(marLado, x, y, W, H) / fundoDe(marLado, W, H);
        // (lote 13, parte 13b) longe: { x, y, R } — o meio da situação do Encontro: o vizinho fica longe dele
        if (longe) { const d = Math.max(0, 1 - Math.hypot(x - longe.x, y - longe.y) / longe.R); s -= 1.6 * d * d; }
        cand.push([s, q]);
      }
      cand.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
      const n = Math.round(fv * N), iv = IDX[v];
      for (let t = 0; t < n && t < cand.length; t++) bio[cand[t][1]] = iv;
    });
    // a maioria em volta (a casa conta duas vezes)
    for (let volta = 0; volta < 2; volta++) {
      const novo = bio.slice();
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const q0 = j * W + i, conta = new Map([[bio[q0], 2]]);
        for (const [a, b] of VIZ8) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= W || y >= H) continue; const v = bio[y * W + x]; conta.set(v, (conta.get(v) || 0) + 1); }
        let m = bio[q0], mc = conta.get(m);
        for (const [v, c] of conta) if (c > mc) { m = v; mc = c; }
        novo[q0] = m;
      }
      bio.set(novo);
    }
    // os pedacinhos soltos (os grupos do mesmo bioma com menos de seis casas) viram o bioma que mais encosta neles
    for (let volta = 0; volta < 3; volta++) {
      const marca = new Int32Array(N).fill(-1), lista = [];
      for (let k = 0; k < N; k++) {
        if (marca[k] >= 0) continue;
        const g = lista.length, v = bio[k], fila = [k], cel = [];
        marca[k] = g;
        while (fila.length) { const q = fila.pop(), i = q % W, j = (q - i) / W; cel.push(q); for (const [a, b] of VIZ4) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= W || y >= H) continue; const n = y * W + x; if (marca[n] < 0 && bio[n] === v) { marca[n] = g; fila.push(n); } } }
        lista.push({ v, cel });
      }
      if (lista.length < 2) break;
      let mudou = false;
      for (const g of lista) {
        if (g.cel.length >= 6) continue;
        const conta = new Map();
        for (const q of g.cel) { const i = q % W, j = (q - i) / W; for (const [a, b] of VIZ4) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= W || y >= H) continue; const v = bio[y * W + x]; if (v !== g.v) conta.set(v, (conta.get(v) || 0) + 1); } }
        let m = null, mc = -1;
        for (const [v, c] of conta) if (c > mc) { m = v; mc = c; }
        if (m != null) { for (const q of g.cel) bio[q] = m; mudou = true; }
      }
      if (!mudou) break;
    }
    return bio;
  }

  /* ---- o mar (a costa) ----
     Num lado do mapa: a beira ondulada (fundo: quanto o mar entra, mais ou menos), o contorno do mar (passa da borda)
     e a faixa da praia. → { lado, pts, beira, praia, prof(t), noMar(x, y) } */
  function marDe(W, H, lado, fundo, seed, forma) {
    const nz = Tracado.ruido(seed), deitado = lado === 'n' || lado === 's', L = deitado ? W : H, D = deitado ? H : W;
    // (lote 13, parte 13b) forma(t): o quanto o mar entra a mais em t (a enseada do Encontro)
    const prof = t => clamp(fundo + (forma ? forma(t) : 0) + (nz(t * 0.19, 3.7) - 0.5) * Math.max(2, fundo * 0.55), 1.5, D * 0.6);
    const ponto = (t, d) => (lado === 'n' ? [t, d] : lado === 's' ? [t, H - d] : lado === 'o' ? [d, t] : [W - d, t]);
    const larg = t => 1.5 + nz(t * 0.31 + 11.3, 8.1) * 1.4;
    const beira = [], dentro = [], fora = [];
    for (let t = -2; t <= L + 2.001; t += 0.5) { beira.push(ponto(t, prof(t))); dentro.push(ponto(t, prof(t) - 0.5)); fora.push(ponto(t, prof(t) + larg(t))); }
    const noMar = (x, y) => distLado(lado, x, y, W, H) < prof(deitado ? x : y);
    // (lote 13, parte 13b: a largura da praia em t e o ponto a d da borda do mar, em t — para quem monta a costa)
    return { lado, pts: beira.concat([ponto(L + 2, -3), ponto(-2, -3)]), beira, praia: dentro.concat(fora.reverse()), prof, noMar, larg, ponto, L, D };
  }

  /* ---- o rio ----
     o: { de, para (a direção, ou 'lago'), curvas, afluente, bloq (lote 13, parte 13b: as casas por onde ele não passa —
     o que a situação do Encontro põe de grande) }. A fonte: uma casa alta da borda (perto da direção de onde
     ele vem, se escolhida; longe dos cantos). O alvo: perto da direção para onde vai; o lago (a parte mais baixa do
     meio); o mar; ou, sem nada, uma casa mais baixa da borda, longe da fonte. O passo custa o comprimento × (1 + 9 × o
     que sobe + 1,6 × a altura + as curvas, pelo ruído). → { cel, ini, fim, lagoEm, destino, afluente: { cel, ini } } */
  function rioDe(W, H, alt, o, seed, ehMar) {
    const N = W * H, rr = sorteio(seed), mm = Math.min(W, H), R = Math.max(3, mm * 0.3);
    const xy = q => [q % W + 0.5, Math.floor(q / W) + 0.5];
    const dist = (a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.hypot(ax - bx, ay - by); };
    const naBorda = q => { const i = q % W, j = (q - i) / W; return i === 0 || j === 0 || i === W - 1 || j === H - 1; };
    const canto = q => { const i = q % W, j = (q - i) / W; return j === 0 || j === H - 1 ? Math.min(i + 0.5, W - i - 0.5) : Math.min(j + 0.5, H - j - 0.5); };
    const pertoDe = (q, id) => { const [x, y] = xy(q), p = Tracado.naBorda(id, W, H, 0, 0); return Math.hypot(x - p[0], y - p[1]) <= R; };
    const borda = [];
    let temMar = false;
    for (let q = 0; q < N; q++) { if (ehMar(q)) temMar = true; else if (naBorda(q)) borda.push(q); }
    if (!borda.length) return null;
    // (lote 14, parte 14a) o rio do hexágono: a fonte na casa do ponto de entrada (ou da nascente, ali dentro)
    const fonte = o.pIni ? o.pIni.cel : (() => {
      let fontes = borda.filter(q => canto(q) >= 3 && (!o.de || pertoDe(q, o.de)));
      if (!fontes.length) fontes = borda.filter(q => !o.de || pertoDe(q, o.de));
      if (!fontes.length) fontes = borda.slice();
      fontes.sort((a, b) => alt[b] - alt[a] || a - b);
      return fontes[Math.floor(rr() * Math.min(3, fontes.length)) % fontes.length];
    })();
    // o alvo (o do hexágono: a casa do ponto de saída — na água do vizinho, a água; ali dentro, o lago)
    let alvo = null, lagoEm = null, destino = 'borda';
    if (o.pFim) {
      const c = o.pFim.cel;
      if (!o.pFim.borda) { lagoEm = c; alvo = q => q === c; destino = 'lago'; }
      else if (ehMar(c)) { alvo = q => ehMar(q); destino = 'mar'; }
      else alvo = q => q === c;
    } else if (o.para === 'lago') {
      let m = -1;
      for (let q = 0; q < N; q++) { const [x, y] = xy(q); if (x < 4 || y < 4 || x > W - 4 || y > H - 4 || ehMar(q) || (o.bloq && o.bloq(q)) || dist(q, fonte) < mm * 0.4) continue; if (m < 0 || alt[q] < alt[m]) m = q; }
      if (m >= 0) { lagoEm = m; alvo = q => q === m; destino = 'lago'; }
    }
    if (!alvo && Tracado.valida(o.para)) {
      const alvos = new Set(borda.filter(q => pertoDe(q, o.para) && dist(q, fonte) > mm * 0.4));
      if (alvos.size) alvo = q => alvos.has(q);
      else if (temMar) { alvo = q => ehMar(q); destino = 'mar'; }
    }
    if (!alvo && temMar) { alvo = q => ehMar(q); destino = 'mar'; }
    /* (sem direção: noutro lado do mapa, mais baixo, com a reta da fonte até lá passando perto do meio — o rio
       atravessa a região, e não corta só um canto nem corre junto da borda) */
    const ladoF = ladoDaCasa(fonte, W, H);
    if (!alvo) {
      const a0 = alt[fonte], [fx, fy] = xy(fonte);
      const pelMeio = q => { const [x, y] = xy(q), dx = x - fx, dy = y - fy, l = dx * dx + dy * dy || 1, t = clamp(((W / 2 - fx) * dx + (H / 2 - fy) * dy) / l, 0, 1); return Math.hypot(fx + dx * t - W / 2, fy + dy * t - H / 2) <= mm * 0.28; };
      const ok = q => naBorda(q) && !ehMar(q) && canto(q) >= 2 && ladoDaCasa(q, W, H) !== ladoF && dist(q, fonte) > mm * 0.5;
      const conds = [q => ok(q) && pelMeio(q) && alt[q] < a0 - 0.05, q => ok(q) && pelMeio(q), ok];
      for (const c of conds) { let tem = false; for (const q of borda) if (c(q)) { tem = true; break; } if (tem) { alvo = c; break; } }
      if (!alvo) alvo = ok;
    }
    const nz = Tracado.ruido(sub(seed, 5)), w = 0.15 + (o.curvas == null ? 4 : clamp(o.curvas, 0, 10)) * 0.13;
    const custo = (q, m, L) => {
      if ((ehMar(m) || (o.bloq && o.bloq(m))) && !alvo(m)) return Infinity;
      const [x, y] = xy(m), beira = Math.min(x, y, W - x, H - y) < 2.5 && !alvo(m) ? 2.5 : 0;
      return L * (1 + 9 * Math.max(0, alt[m] - alt[q]) + 1.6 * alt[m] + w * nz(x / 3.3, y / 3.3) + beira);
    };
    let cel = maisBarato(W, H, [fonte], alvo, custo);
    if (!cel && destino === 'borda') cel = maisBarato(W, H, [fonte], q => naBorda(q) && !ehMar(q) && ladoDaCasa(q, W, H) !== ladoF && dist(q, fonte) > mm * 0.5, custo);
    if (!cel || cel.length < 4) return null;
    const ult = cel[cel.length - 1], [ux, uy] = xy(ult);
    const r = { cel, ini: o.pIni ? (o.pIni.borda ? o.pIni.fora : null) : foraDa(fonte, W, H), fim: null, lagoEm, destino, afluente: null };
    if (destino === 'borda') r.fim = o.pFim ? o.pFim.fora : foraDa(ult, W, H);
    else if (destino === 'mar') { const pre = xy(cel[Math.max(0, cel.length - 3)]), dx = ux - pre[0], dy = uy - pre[1], L = Math.hypot(dx, dy) || 1; r.fim = [ux + dx / L * 2.2, uy + dy / L * 2.2]; }
    // o afluente: de outra casa alta da borda, longe do rio, até o trecho do meio dele
    if (o.afluente) {
      const noRio = new Set(cel), meio = new Set(cel.slice(Math.floor(cel.length * 0.3), Math.ceil(cel.length * 0.75))), amostra = cel.filter((_, k) => k % 3 === 0);
      const longe = borda.filter(q => canto(q) >= 3 && !noRio.has(q) && dist(q, fonte) > mm * 0.35 && amostra.every(p => dist(p, q) > mm * 0.3));
      longe.sort((a, b) => alt[b] - alt[a] || a - b);
      // (lote 14, parte 14a: o afluente do hexágono vem do ponto dele)
      for (const f2 of o.pAf ? [o.pAf.cel] : longe.slice(0, 4)) {
        const ca = maisBarato(W, H, [f2], q => meio.has(q), (q, m, L) => (noRio.has(m) && !meio.has(m) ? Infinity : custo(q, m, L)));
        if (ca && ca.length >= 4) { r.afluente = { cel: ca, ini: o.pAf ? (o.pAf.borda ? o.pAf.fora : null) : foraDa(f2, W, H) }; break; }
      }
    }
    return r;
  }
  /* O lago em volta de uma casa (centro): enche como a água sobe (sempre a casa mais baixa da beira, e um pouco a mais
     perto do meio: ele não escorre comprido pelo vale) até ter n casas, sem chegar a dois quadrados da borda nem entrar
     em bloq. → { pts (o contorno macio), cel (o conjunto), centro } */
  function lagoDe(W, H, alt, centro, n, bloq) {
    const N = W * H, em = new Uint8Array(N), hp = [[alt[centro], centro]], visto = new Uint8Array(N), ci = centro % W, cj = Math.floor(centro / W);
    const prio = m => alt[m] + 0.035 * Math.hypot(m % W - ci, Math.floor(m / W) - cj);
    visto[centro] = 1;
    let k = 0;
    while (hp.length && k < n) {
      let mi = 0;
      for (let t = 1; t < hp.length; t++) if (hp[t][0] < hp[mi][0] || (hp[t][0] === hp[mi][0] && hp[t][1] < hp[mi][1])) mi = t;
      const [, q] = hp.splice(mi, 1)[0];
      em[q] = 1; k++;
      const i = q % W, j = (q - i) / W;
      for (const [a, b] of VIZ4) { const x = i + a, y = j + b; if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue; const m = y * W + x; if (visto[m] || (bloq && bloq(m))) continue; visto[m] = 1; hp.push([prio(m), m]); }
    }
    const G = grupos(W, H, q => !!em[q]);
    if (!G.grupos.length) return null;
    let g = 0;
    G.grupos.forEach((c, i) => { if (c.length > G.grupos[g].length) g = i; });
    const pts = contornoDe(G.grupos[g], W, H, G.marca, g, 3, 0.7);
    return pts ? { pts, cel: new Set(G.grupos[g]), centro: [centro % W + 0.5, Math.floor(centro / W) + 0.5] } : null;
  }
  // a linha cortada onde ela entra num dos lagos (fica um pouco de cada ponta lá dentro: o lago cobre a junta)
  function cortarNosLagos(pts, lagos) {
    let pecas = [pts];
    for (const L of lagos) {
      const novas = [];
      for (const p of pecas) {
        const iv = Tracado.dentroDe(p, (x, y) => Tracado.dentro(L.pts, x, y), -0.5).filter(([a, b]) => b > a);
        if (iv.length) novas.push(...Tracado.cortar(p, iv, 1)); else novas.push(p);
      }
      pecas = novas;
    }
    return pecas;
  }

  /* ---- o campo inteiro ----
     O chão de uma cena W × H. o: { bioma, mistura, agua: 'rio' | 'lago' | 'nenhuma', rio: { de, para, curvas, hw,
     afluente, lago } (lago: o lago no caminho do rio), marLado (o lado do mar, na costa; senão, sorteado) }.
     → { principal, mistura, vizs, alt, bio, bioEm(x, y), altEm(x, y), mar, ehMar(x, y), rios: [{ pts, pecas, hw, cel,
     destino, afluente }], lagos: [{ pts, cel, centro }], planaltos: [{ pts, alt, bio, nivel }], paredoes: [{ pts, alt,
     bio }], manchas: [{ bio, pts }], perto (as casas perto da água) } */
  function campo(W, H, seed, o) {
    o = o || {};
    const B = BIO[valido(o.bioma)], mist = mistura(o.mistura), rr = sorteio(sub(seed, 1)), N = W * H;
    const vizs = vizinhosDe(B, mist, rr);
    const agua = o.agua === 'lago' || o.agua === 'nenhuma' ? o.agua : 'rio', R0 = agua === 'rio' ? Object.assign({}, o.rio || {}) : null;
    // o mar, na costa (a principal ou uma vizinha): o lado — não o de onde o rio vem; o de para onde ele vai, se dá
    let marLado = null;
    if (B.mar || vizs.some(v => BIO[v].mar)) {
      const todos = ['n', 's', 'o', 'l'];
      let lados = todos.filter(l => !R0 || !Tracado.valida(R0.de) || Math.abs(Tracado.difAng(Tracado.DIR[R0.de].a, angLado(l))) > Math.PI / 2 - 0.01);
      if (!lados.length) lados = todos;
      if (todos.includes(o.marLado)) marLado = o.marLado;
      else if (R0 && Tracado.valida(R0.para)) { const a = Tracado.DIR[R0.para].a; marLado = lados.reduce((m, l) => (Math.abs(Tracado.difAng(a, angLado(l))) < Math.abs(Tracado.difAng(a, angLado(m))) ? l : m)); }
      else marLado = lados[Math.floor(rr() * lados.length) % lados.length];
      if (R0 && B.mar && R0.para !== 'lago') R0.para = null;                // (na costa, o rio vai para o mar, ou para o lago)
    }
    // sem a rosa, o chão inclina menos, para um lado sorteado
    let k = 0.7, inclina = null;
    if (R0 && !Tracado.valida(R0.de) && !Tracado.valida(R0.para) && !marLado) { inclina = Tracado.IDS[Math.floor(rr() * 8) % 8]; k = 0.45; }
    const alt = alturas(W, H, sub(seed, 2), { de: R0 ? R0.de || inclina : null, para: R0 && Tracado.valida(R0.para) ? R0.para : null, mar: marLado, k });
    const bio = mapaDosBiomas(W, H, sub(seed, 3), B, vizs, FRACAO[mist], alt, marLado);
    const bioEm = (x, y) => LISTA[bio[clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1)]];
    const altEm = (x, y) => alt[clamp(Math.floor(y), 0, H - 1) * W + clamp(Math.floor(x), 0, W - 1)];
    // o mar: na costa principal, uns 28% do mapa; na vizinha, metade da faixa dela
    let mar = null;
    if (marLado) {
      const D = fundoDe(marLado, W, H);
      let fundo = D * 0.28;
      if (!B.mar) { let n = 0; for (let q = 0; q < N; q++) if (LISTA[bio[q]].mar) n++; fundo = clamp(n / N * D * 0.5, 2.5, D * 0.3); }
      mar = marDe(W, H, marLado, fundo, sub(seed, 4));
    }
    const ehMar = (x, y) => !!mar && mar.noMar(x, y);
    const ehMarQ = q => !!mar && mar.noMar(q % W + 0.5, Math.floor(q / W) + 0.5);
    const pertoDoMar = q => { if (!mar) return false; const x = q % W + 0.5, y = Math.floor(q / W) + 0.5; return distLado(mar.lado, x, y, W, H) < mar.prof(mar.lado === 'n' || mar.lado === 's' ? x : y) + 3; };
    // a água: o rio (e o afluente) e o lago
    const { rios, lagos } = aguaDe(W, H, alt, seed, agua, R0, mar, ehMarQ, pertoDoMar);
    // perto da água (sem patamar): o rio, o lago e o mar
    const perto = new Uint8Array(N);
    const marca = (x, y, r) => { for (let j = Math.max(0, Math.floor(y - r)); j <= Math.min(H - 1, Math.floor(y + r)); j++) for (let i = Math.max(0, Math.floor(x - r)); i <= Math.min(W - 1, Math.floor(x + r)); i++) if (Math.hypot(i + 0.5 - x, j + 0.5 - y) <= r) perto[j * W + i] = 1; };
    for (const r of rios) for (const p of r.pts.filter((_, i) => i % 2 === 0)) marca(p[0], p[1], r.hw + 1.8);
    for (const l of lagos) for (const q of l.cel) marca(q % W + 0.5, Math.floor(q / W) + 0.5, 2);
    for (let q = 0; q < N; q++) if (pertoDoMar(q)) perto[q] = 1;
    // os patamares: o alto e o mais alto (de cada bioma), longe da água e da borda
    const { planaltos, paredoes } = patamares(W, H, alt, bio, q => !perto[q]);
    // as manchas dos vizinhos (o contorno de cada grupo de casas deles), para o desenho do chão
    const manchas = manchasDe(W, H, bio, vizs);
    const presentes = vizs.filter(v => bio.includes(IDX[v]));
    return { principal: B.id, mistura: mist, vizs: presentes, alt, bio, bioEm, altEm, mar, ehMar, rios, lagos, planaltos, paredoes, manchas, perto, agua };
  }
  /* ---- a água do campo (lote 13, parte 13b: também a do rio da rosa no Encontro) ----
     O rio que desce pelo relevo (R0: { de, para, curvas, hw, afluente, lago }) e o afluente; o lago no fim dele, no
     caminho dele (R0.lago) ou sozinho (agua 'lago'), fora das casas de pertoDoMar(q) (perto do mar; no Encontro, também
     perto do que a situação põe). → { rios: [{ pts, pecas, hw, cel, destino, afluente }], lagos: [{ pts, cel, centro }] } */
  function aguaDe(W, H, alt, seed, agua, R0, mar, ehMarQ, pertoDoMar) {
    const N = W * H, rios = [], lagos = [];
    const rio = R0 ? rioDe(W, H, alt, R0, sub(seed, 5), ehMarQ) : null;
    const nLago = Math.round(N * (0.045 + sorteio(sub(seed, 6))() * 0.03));
    if (rio && rio.lagoEm != null) { const l = lagoDe(W, H, alt, rio.lagoEm, nLago, pertoDoMar); if (l) lagos.push(l); }
    else if (rio && R0.lago) {
      // o lago no caminho do rio: na casa mais baixa do meio dele
      const longeDoMar = q => { if (!mar) return true; const x = q % W + 0.5, y = Math.floor(q / W) + 0.5; return distLado(mar.lado, x, y, W, H) > mar.prof(mar.lado === 'n' || mar.lado === 's' ? x : y) + 7; };
      const meio = rio.cel.slice(Math.floor(rio.cel.length * 0.3), Math.ceil(rio.cel.length * 0.7)).filter(q => { const x = q % W, y = Math.floor(q / W); return x >= 4 && y >= 4 && x < W - 4 && y < H - 4 && longeDoMar(q) && !pertoDoMar(q); });
      if (meio.length) { const c = meio.reduce((m, q) => (alt[q] < alt[m] ? q : m)); const l = lagoDe(W, H, alt, c, Math.round(nLago * 0.8), pertoDoMar); if (l) lagos.push(l); }
    } else if (agua === 'lago') {
      let m = -1;
      for (let q = 0; q < N; q++) { const x = q % W, y = Math.floor(q / W); if (x < 4 || y < 4 || x >= W - 4 || y >= H - 4 || pertoDoMar(q)) continue; if (m < 0 || alt[q] < alt[m]) m = q; }
      if (m >= 0) { const l = lagoDe(W, H, alt, m, nLago, pertoDoMar); if (l) lagos.push(l); }
    }
    if (rio) {
      // (o caminho mais barato dá o rumo, pelo relevo; as curvas pedidas fazem ele serpentear)
      const hw = R0.hw || 1.2, rc = sorteio(sub(seed, 7)), curvas = R0.curvas == null ? 4 : R0.curvas;
      const fixos = R0.lago && rio.lagoEm == null && lagos.length ? [lagos[0].centro] : [];
      let pts = serpentear(linhaDe(W, rio.cel, rio.ini, rio.fim), curvas, rc, 4.5, fixos);
      // (lote 14, parte 14a: o rio do hexágono entra e sai pelos pontos exatos da borda)
      if (R0.pIni || R0.pFim) pts = prenderPontas(pts, W, H, R0.pIni && R0.pIni.borda ? R0.pIni : null, R0.pFim && R0.pFim.borda && rio.destino === 'borda' ? R0.pFim : null);
      rios.push({ pts, pecas: cortarNosLagos(pts, lagos), hw, cel: rio.cel, destino: rio.destino, afluente: false });
      if (rio.afluente) {
        // (o afluente acaba no ponto do rio mais perto do fim do rumo dele)
        const ca = rio.afluente.cel, u = ca[ca.length - 1], ux = u % W + 0.5, uy = Math.floor(u / W) + 0.5;
        const jn = pts.reduce((m, p) => (Math.hypot(p[0] - ux, p[1] - uy) < Math.hypot(m[0] - ux, m[1] - uy) ? p : m));
        const hw2 = Math.max(0.6, Math.round(hw * 0.62 * 10) / 10);
        let p2 = serpentear(linhaDe(W, ca.slice(0, -1), rio.afluente.ini, jn.slice()), curvas, rc, 3, []);
        if (R0.pAf && R0.pAf.borda) p2 = prenderPontas(p2, W, H, R0.pAf, null);
        rios.push({ pts: p2, pecas: cortarNosLagos(p2, lagos), hw: hw2, cel: ca, destino: 'rio', afluente: true });
      }
    }
    return { rios, lagos };
  }
  /* ---- os patamares ----
     O alto e o mais alto de cada bioma (a altura do patamar é a da parte mais alta do mapa que ele pede), só onde
     ok(q) deixa (longe da água; no Encontro, longe da situação) e fora da borda: nos de pedra, o planalto e, mais alto,
     o paredão (pequeno) ou o planalto de cima; nos outros, o morro e o topo dele. → { planaltos: [{ pts, alt, bio, nivel,
     n }], paredoes: [{ pts, alt, bio, n }] } */
  function patamares(W, H, alt, bio, ok) {
    const N = W * H, planaltos = [], paredoes = [];
    const maioria = cel => { const c = new Map(); for (const q of cel) c.set(bio[q], (c.get(bio[q]) || 0) + 1); let m = bio[cel[0]], mc = -1; for (const [v, n] of c) if (n > mc) { m = v; mc = n; } return LISTA[m]; };
    // (a altura do patamar de cada bioma: a da parte mais alta do mapa que ele pede)
    const ord = Float32Array.from(alt).sort(), Q = f => ord[clamp(Math.floor((1 - f) * (N - 1)), 0, N - 1)];
    const lim = LISTA.map(b => [Q(b.alto[0]), Q(b.alto[1])]);
    const alto = nivel => q => { const i = q % W, j = (q - i) / W; return i > 0 && j > 0 && i < W - 1 && j < H - 1 && ok(q) && alt[q] >= lim[bio[q]][nivel]; };
    const G1 = grupos(W, H, alto(0));
    G1.grupos.forEach((cel, g) => {
      if (cel.length < 10) return;
      const BB = maioria(cel), pts = contornoDe(cel, W, H, G1.marca, g, 3, 0.7);
      if (pts) planaltos.push({ pts, alt: BB.rocha ? 3 : 2, bio: BB.id, nivel: 1, n: cel.length });
    });
    const G2 = grupos(W, H, alto(1));
    G2.grupos.forEach((cel, g) => {
      if (cel.length < 4) return;
      const BB = maioria(cel), pts = contornoDe(cel, W, H, G2.marca, g, 2, 0.6);
      if (!pts) return;
      if (BB.rocha && cel.length <= 36) paredoes.push({ pts, alt: 6, bio: BB.id, n: cel.length });
      else planaltos.push({ pts, alt: BB.rocha ? 6 : 4, bio: BB.id, nivel: 2, n: cel.length });
    });
    return { planaltos, paredoes };
  }
  // as manchas dos vizinhos (o contorno de cada grupo de casas deles, de quatro casas ou mais), para o desenho do chão
  function manchasDe(W, H, bio, vizs) {
    const manchas = [];
    for (const v of vizs) {
      const iv = IDX[v], G = grupos(W, H, q => bio[q] === iv);
      G.grupos.forEach((cel, g) => { if (cel.length < 4) return; const pts = contornoDe(cel, W, H, G.marca, g, 2, 0.6); if (pts) manchas.push({ bio: v, pts }); });
    }
    return manchas;
  }

  return { LISTA, BIO, IDS, IDX, valido, MISTURAS, FRACAO, mistura, sub, campo, alturas, vizinhosDe, mapaDosBiomas, marDe, rioDe, lagoDe, cortarNosLagos, grupos, contornoDe, maisBarato, linhaDe, foraDa, serpentear,
    aguaDe, patamares, manchasDe, prenderPontas };
})();
