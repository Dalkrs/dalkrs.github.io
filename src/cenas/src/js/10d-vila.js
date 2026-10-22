/* ---------------------------------------------------------------
   10d. VILA — o gerador de vilarejo (lote 6; lote 7: estilos, travar, janelas e a noite)
   O mestre escolhe o tamanho (aldeia ou vila), o terreno, o estilo, se tem rio e muralha e quantas casas; a janela do
   gerador (10h) mostra a prévia e "Gerar outro" sorteia de novo — menos o que ele travou (as ruas e a praça, o rio,
   cada casa). Sai uma cena nova: o fundo pintado (o chão, as ruas, a praça, o rio e a ponte, o piso e as paredes das
   casas, a paliçada, as árvores e os enfeites do estilo) e, por cima, tudo editável — as paredes de cada casa (que
   bloqueiam a visão), a porta, as janelas, os móveis (objetos de cenário), o poço e as luzes da praça e a paliçada com
   os portões abertos. À noite, cada casa ganha uma luz por dentro, que escapa pelas janelas. Nada sai escrito: os
   nomes ficam com o mestre.
   O plano (gerar) é uma conta pura, sorteada por uma semente: a mesma escolha, com a mesma semente e as mesmas partes
   travadas, dá o mesmo vilarejo. Nada muda nas cenas que já existem.
   --------------------------------------------------------------- */
const Vila = (() => {
  const TAMANHOS = {
    aldeia: { n: 'Aldeia', W: 28, H: 20, rua: 2, praca: 2.5, casas: [3, 8], padrao: 5, lamp: 2 },
    vila: { n: 'Vila', W: 40, H: 28, rua: 3, praca: 3.5, casas: [6, 16], padrao: 10, lamp: 4 },
  };
  const TERRENOS_V = [['campo', 'Campo'], ['floresta', 'Floresta'], ['areia', 'Deserto'], ['neve', 'Neve']];
  // o nome de cada tipo de prédio, para as dicas da janela ("Clique para travar a taverna")
  const NOME_TIPO = { taverna: 'a taverna', capela: 'a capela', ferraria: 'a ferraria', armazem: 'o armazém', casa: 'a casa' };
  const NOME_TIPO_EST = { oriental: { taverna: 'a casa de chá', capela: 'o santuário' }, nordico: { taverna: 'o salão', capela: 'o templo', casa: 'a casa longa' }, desertico: { capela: 'o templo' }, elfico: { capela: 'o bosque sagrado' }, anao: { taverna: 'o salão', capela: 'o salão dos ancestrais', ferraria: 'a forja' } };
  const nomeDoTipo = (tipo, est) => (NOME_TIPO_EST[est] || {})[tipo] || NOME_TIPO[tipo] || 'a casa';

  /* ================= o plano (conta pura) ================= */
  const distSeg = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };
  const distLinha = (pts, x, y) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, distSeg(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return d; };
  const amostrar = (f, de, ate, eixoX) => { const out = []; for (let t = de; t <= ate + 1e-9; t += 0.5) out.push(eixoX ? [t, f(t)] : [f(t), t]); return out; };
  const num = v => typeof v === 'number' && Number.isFinite(v);

  /* As partes travadas que chegam de fora (um modelo guardado, a janela): só valem se fazem sentido neste tamanho.
     ruas e rio: os números que desenham a rua e o rio; casas: cópias das casas (com porta, janelas e móveis). */
  function limparTrava(t, W, H, TP) {
    if (!t || typeof t !== 'object') return { ruas: null, rio: null, casas: [] };
    // (lote 8: as ruas novas e o rio da rosa travam pela semente — { v: 8, s } e { v: 8, s, k }, a tentativa que serviu)
    const s8 = q => Number.isInteger(q.s) && q.s > 0 && q.s <= 4294967295;
    const ruas = t.ruas && t.ruas.v === 8 ? (s8(t.ruas) ? { v: 8, s: t.ruas.s } : null)
      : t.ruas && ['y0', 'A', 'L', 'F'].every(k => num(t.ruas[k])) && t.ruas.L > 0 ? Object.assign({}, t.ruas) : null;
    const rio = t.rio && t.rio.v === 8 ? (s8(t.rio) && Number.isInteger(t.rio.k) && t.rio.k >= 0 && t.rio.k < 40 ? { v: 8, s: t.rio.s, k: t.rio.k } : null)
      : t.rio && ['xr0', 'C', 'N', 'Hh', 'rw'].every(k => num(t.rio[k])) && t.rio.N > 0 && t.rio.rw > 0 && t.rio.rw < 4 ? Object.assign({}, t.rio) : null;
    const casas = [];
    for (const k of Array.isArray(t.casas) ? t.casas.slice(0, 20) : []) {
      if (!k || !TP[k.tipo] || ![k.x, k.y, k.w, k.h].every(v => Number.isInteger(v)) || k.w < 3 || k.h < 3 || k.w > 12 || k.h > 12 || k.x < 0 || k.y < 0 || k.x + k.w > W || k.y + k.h > H) continue;
      const pt = k.porta;
      const lado = l => typeof l === 'string' && l.length === 1 && 'nsol'.includes(l);
      if (!pt || !lado(pt.lado) || ![pt.x1, pt.y1, pt.x2, pt.y2].every(Number.isInteger)) continue;
      const ladoOk = { n: pt.y1 === k.y && pt.y2 === k.y && pt.x2 - pt.x1 === 1 && pt.x1 > k.x && pt.x2 < k.x + k.w, s: pt.y1 === k.y + k.h && pt.y2 === k.y + k.h && pt.x2 - pt.x1 === 1 && pt.x1 > k.x && pt.x2 < k.x + k.w,
        o: pt.x1 === k.x && pt.x2 === k.x && pt.y2 - pt.y1 === 1 && pt.y1 > k.y && pt.y2 < k.y + k.h, l: pt.x1 === k.x + k.w && pt.x2 === k.x + k.w && pt.y2 - pt.y1 === 1 && pt.y1 > k.y && pt.y2 < k.y + k.h }[pt.lado];
      if (!ladoOk) continue;
      const janelas = (Array.isArray(k.janelas) ? k.janelas.slice(0, 3) : []).filter(j => j && lado(j.lado) && j.lado !== pt.lado && [j.x1, j.y1, j.x2, j.y2].every(Number.isInteger)).map(j => ({ lado: j.lado, x1: j.x1, y1: j.y1, x2: j.x2, y2: j.y2 }));
      const moveis = (Array.isArray(k.moveis) ? k.moveis.slice(0, 10) : []).filter(m => m && Props.P[m.id] && [m.x, m.y, m.s].every(Number.isInteger) && m.s >= 1 && m.x >= k.x && m.y >= k.y && m.x + m.s <= k.x + k.w && m.y + m.s <= k.y + k.h).map(m => ({ id: m.id, x: m.x, y: m.y, s: m.s }));
      casas.push({ tipo: k.tipo, forma: k.forma === 'oct' ? 'oct' : 'ret', x: k.x, y: k.y, w: k.w, h: k.h, porta: { lado: pt.lado, x1: pt.x1, y1: pt.y1, x2: pt.x2, y2: pt.y2 }, janelas, moveis, estilo: typeof k.estilo === 'string' ? k.estilo : null });
    }
    return { ruas, rio, casas };
  }

  // (lote 8, parte 5) os sorteios novos têm sementes próprias: o que já existe sai igual
  const sub = (seed, k) => (((Math.imul(seed ^ 0x5bd1e995, 0x01000193 + k * 0x9e3779b1) >>> 0) ^ (k * 0x85ebca6b)) >>> 0) || (k + 1);
  // (lote 8) o contorno da paliçada: o retângulo de sempre (a dois quadrados da borda), o octógono, a redonda ou a irregular
  // (estas duas, mais perto da borda: os cantos do mapa ficam de fora, e o vilarejo precisa de lugar)
  function anelDe(forma, W, H, rnd) {
    const m = 2;
    if (forma === 'oct') { const cc = Math.round(Math.min(W, H) * 0.2); return [[m + cc, m], [W - m - cc, m], [W - m, m + cc], [W - m, H - m - cc], [W - m - cc, H - m], [m + cc, H - m], [m, H - m - cc], [m, m + cc]]; }
    if (forma === 'redonda' || forma === 'irregular') return Tracado.muro(forma, W / 2, H / 2, W / 2 - 1.2, H / 2 - 1.2, rnd).ring.map(([x, y]) => [clamp(x, 0.7, W - 0.7), clamp(y, 0.7, H - 0.7)]);
    return [[m, m], [W - m, m], [W - m, H - m], [m, H - m]];
  }
  // a reta de a até b e a curva (de Bézier) de a até b puxada por m, um ponto a cada meio quadrado
  const reta = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.5)), out = []; for (let i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return out; };
  const curvaQ = (a, m, b) => { const L = Math.hypot(m[0] - a[0], m[1] - a[1]) + Math.hypot(b[0] - m[0], b[1] - m[1]), n = Math.max(2, Math.ceil(L / 0.5)), out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * m[0] + t * t * b[0], u * u * a[1] + 2 * u * t * m[1] + t * t * b[1]]); } return out; };
  // "rio com 2 pontes"; (lote 8) "rio com afluente, lago e 2 pontes"; "rio sem pontes"
  function textoDoRio(p) {
    const n = (p.pontes || []).length, partes = [p.afluente ? 'afluente' : null, p.lago ? 'lago' : null, n ? n + (n === 1 ? ' ponte' : ' pontes') : null].filter(Boolean);
    return partes.length ? ' · rio com ' + (partes.length > 1 ? partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1] : partes[0]) : ' · rio sem pontes';
  }

  function gerar(o) {
    o = o || {};
    const tam = TAMANHOS[o.tamanho] ? o.tamanho : 'aldeia', T = TAMANHOS[tam];
    const terreno = TERRENOS_V.some(x => x[0] === o.terreno) ? o.terreno : 'campo', estilo = Estilos.valido(o.estilo), TP = Estilos.tipos(estilo), E = Estilos.de(estilo);
    const W = T.W, H = T.H, seed = (Math.round(Number(o.seed)) >>> 0) || 1, rnd = mulberry(seed);
    const r = (a, b) => a + rnd() * (b - a), ri = (a, b) => Math.floor(r(a, b + 1)), pick = a => a[Math.floor(rnd() * a.length) % a.length];
    const comRio = !!o.rio, muralha = !!o.muralha;
    const want = clamp(Math.round(Number(o.casas) || T.padrao), T.casas[0], T.casas[1]);
    const trava = limparTrava(o.trava, W, H, TP), base = o.base && typeof o.base === 'object' ? o.base : {};
    const hw = T.rua / 2;
    /* (lote 8, parte 5) o traçado escolhido na janela; o que faltar sai como sempre. As ruas novas (uma de cada portão
       até a praça) vêm com os portões da rosa, com a praça fora do centro ou com o rio da rosa (o rio vem antes, onde o
       mestre pediu, e o vilarejo se arruma em volta: a praça num lugar seco); a paliçada pelo contorno, com outra forma,
       com as ruas novas ou com o rio da rosa; as pontes pela conta nova, quando as ruas ou o rio são novos ou quando o
       mestre escolheu quantas. A trava de cada parte só vale no jeito em que foi feita. */
    const T8 = Tracado.escolhas(o, ['oct', 'redonda', 'irregular'], 'ret');
    const rioRosa = comRio && Tracado.rioDaRosa(T8.rio), pracaRio = comRio && T8.praca === 'rio';
    const ruasNovas = T8.portoes.length > 0 || T8.praca === 'portao' || pracaRio || rioRosa;
    // (o rio de sempre mais largo ou mais sinuoso pode encostar na paliçada dos lados: ela também vai pelo contorno, que abre na água)
    const anelNovo = muralha && (T8.muro !== 'ret' || ruasNovas || rioRosa || (comRio && (T8.rio.larg != null || T8.rio.curvas != null)));
    const contaNova = comRio && (rioRosa || ruasNovas || T8.pontes != null);
    const travaRuas = trava.ruas && (trava.ruas.v === 8) === ruasNovas ? trava.ruas : null;
    const travaRio = comRio && trava.rio && (trava.rio.v === 8) === rioRosa ? trava.rio : null;

    // as ruas: a principal atravessa de um lado ao outro; na vila, uma segunda cruza de cima a baixo
    const sortearRuas = () => {
      const P = { y0: H / 2 + r(-1.2, 1.2), A: r(0.4, 1.1), L: r(W * 0.7, W * 1.3), F: r(0, Math.PI * 2), px: W / 2 + r(-2, 2) };
      if (tam === 'vila') Object.assign(P, { x0: W / 2 + r(-2, 2), B: r(0.3, 0.9), M: r(H * 0.8, H * 1.4), G: r(0, Math.PI * 2) });
      return P;
    };
    const completar = P => {
      P = Object.assign({}, P);
      if (!num(P.px)) P.px = W / 2;
      if (tam === 'vila' && !(num(P.x0) && num(P.B) && num(P.M) && P.M > 0 && num(P.G))) Object.assign(P, { x0: W / 2, B: 0.5, M: H, G: 0 });
      if (tam !== 'vila') { delete P.x0; delete P.B; delete P.M; delete P.G; }
      return P;
    };
    const geoRuas = P => {
      const ruaY = x => P.y0 + P.A * Math.sin(2 * Math.PI * x / P.L + P.F);
      const ruaX = tam === 'vila' ? (y => P.x0 + P.B * Math.sin(2 * Math.PI * y / P.M + P.G)) : null;
      let px = ruaX ? ruaX(P.y0) : P.px;
      if (ruaX) for (let k = 0; k < 6; k++) px = ruaX(ruaY(px));
      const ruas = [{ pts: amostrar(ruaY, -1, W + 1, true), hw }];
      if (ruaX) ruas.push({ pts: amostrar(ruaX, -1, H + 1, false), hw: hw * 0.85 });
      return { ruaY, ruaX, ruas, praca: { x: px, y: ruaY(px), r: T.praca } };
    };
    // o rio: de cima a baixo, longe da praça (lote 8: com a largura e as curvas escolhidas — 4 é como sempre)
    const sortearRio = praca => {
      const rw = T8.rio.larg ? Tracado.LARGURA[T8.rio.larg] : tam === 'vila' ? 1.6 : 1.3, lados = [W * 0.17, W * 0.83].filter(x => Math.abs(x - praca.x) >= praca.r + rw + 3);
      const R = { xr0: (lados.length ? pick(lados) : W * 0.83) + r(-1, 1), C: r(0.6, 1.6), N: r(H * 0.7, H * 1.3), Hh: r(0, Math.PI * 2), rw };
      if (T8.rio.curvas != null) { R.C = R.C * T8.rio.curvas / 4; R.N = R.N / (0.6 + T8.rio.curvas * 0.1); }
      return R;
    };
    const geoRio = R => { const rioX = y => R.xr0 + R.C * Math.sin(2 * Math.PI * y / R.N + R.Hh); return { rioX, pts: amostrar(rioX, -1, H + 1, false), hw: R.rw }; };
    // uma casa travada bate na rua, na praça ou no rio?
    const bateNaRua = (k, G) => { for (let j = k.y; j < k.y + k.h; j++) for (let i = k.x; i < k.x + k.w; i++) { const cx = i + 0.5, cy = j + 0.5; if (G.ruas.some(ru => distLinha(ru.pts, cx, cy) <= ru.hw + 0.25) || Math.hypot(cx - G.praca.x, cy - G.praca.y) <= G.praca.r + 0.3) return true; } return false; };
    // (a casa não encosta no rio: nem a volta dela pode ser água)
    const bateNoRio = (k, R) => { for (let j = k.y - 1; j <= k.y + k.h; j++) for (let i = k.x - 1; i <= k.x + k.w; i++) if (distLinha(R.pts, i + 0.5, j + 0.5) <= R.hw + 0.6) return true; return false; };
    const pracaLongeDoRio = (G, R) => Math.abs(G.praca.x - R.rioX(G.praca.y)) >= G.praca.r + R.hw + 2;
    // (lote 8) a água pela conta nova: { rios: [{ pts, hw }], lago, ag } (ag.dist: a distância até a água)
    const comoAgua = (rios, lago) => { const A = { rios, lago: lago || null }; A.ag = Tracado.agua(A); return A; };
    const bateNaAgua = (k, A) => { for (let j = k.y - 1; j <= k.y + k.h; j++) for (let i = k.x - 1; i <= k.x + k.w; i++) if (A.ag.dist(i + 0.5, j + 0.5) <= 0.6) return true; return false; };
    // (lote 8) o rio da rosa: cada tentativa (k) tem o seu sorteio; a trava guarda a semente e a tentativa que serviu
    // (as pontas andam mais pela borda que na cidade: o vilarejo é pequeno, e o rio pode correr por um lado dele)
    const rioRosaEm = (s, k) => { const R = Tracado.rioPlano(Object.assign({}, T8.rio, { desvio: 0.5 }), W, H, mulberry(sub(s, k)), null); return { rioP: { v: 8, s, k }, A: comoAgua(R.rios.map(x => ({ pts: x.pts, hw: x.hw })), R.lago) }; };
    /* (um que não passe pelas casas travadas e deixe chão seco para o vilarejo: das 40 tentativas, uma das cinco que deixam
       mais chão seco no meio do mapa — e o meio, para a praça; se nenhuma desvia das casas travadas, o rio que estava na tela) */
    const sortearRosa = () => {
      const s0 = sub(seed, 23), amostras = [], notas = [];
      for (let j = 1; j < H; j += 2) for (let i = 1; i < W; i += 2) if (((i - W / 2) / (W * 0.42)) ** 2 + ((j - H / 2) / (H * 0.42)) ** 2 <= 1) amostras.push([i, j]);
      for (let k = 0; k < 40; k++) {
        const e = rioRosaEm(s0, k);
        if (trava.casas.some(q => bateNaAgua(q, e.A))) continue;
        let seco = 0;
        for (const [x, y] of amostras) if (e.A.ag.dist(x, y) >= 1.5) seco++;
        notas.push({ e, v: seco + (e.A.ag.dist(W / 2, H / 2) - T.praca >= 3 ? amostras.length * 0.1 : 0), k });
      }
      if (notas.length) { notas.sort((a, b) => b.v - a.v || a.k - b.k); return notas[Math.floor(mulberry(sub(s0, 99))() * Math.min(5, notas.length))].e; }
      if (base.rioP && base.rioP.v === 8 && Number.isInteger(base.rioP.s) && Number.isInteger(base.rioP.k)) return rioRosaEm(base.rioP.s, base.rioP.k);
      return rioRosaEm(s0, 0);
    };
    // (lote 8) o rio de sempre (de cima a baixo), na conta nova: o travado, ou um que não passe pelas casas travadas
    const rioDeSempre = (rioTr, praca0) => {
      if (rioTr) return { rioP: Object.assign({}, rioTr), rioG: geoRio(rioTr) };
      for (let tent = 0; tent < 60; tent++) { const R = sortearRio(praca0), Rg = geoRio(R); if (!trava.casas.some(k => bateNoRio(k, Rg))) return { rioP: R, rioG: Rg }; }
      if (base.rioP && ['xr0', 'C', 'N', 'Hh', 'rw'].every(k => num(base.rioP[k]))) return { rioP: Object.assign({}, base.rioP), rioG: geoRio(base.rioP) };
      const R = sortearRio(praca0);
      return { rioP: R, rioG: geoRio(R) };
    };
    /* (lote 8) As ruas novas: uma de cada portão (os da rosa; no automático, os dos lados de sempre) até a praça — reta do
       lado de fora, uma curva do portão até a praça. A praça: no centro, na beira do rio (agua0) ou perto de um portão.
       Com paliçada, o portão é o ponto do contorno naquela direção. */
    const dirs8 = T8.portoes.length ? T8.portoes : tam === 'vila' ? ['n', 'l', 's', 'o'] : ['l', 'o'];
    const tracar8 = (sR, agua0) => {
      const rg = mulberry(sR), rr = (a, b) => a + rg() * (b - a);
      const ring = muralha ? anelDe(T8.muro, W, H, mulberry(sub(sR, 21))) : null;
      const c0 = ring ? [ring.reduce((s, q) => s + q[0], 0) / ring.length, ring.reduce((s, q) => s + q[1], 0) / ring.length] : [W / 2, H / 2];
      const praca = { x: W / 2 + rr(-2, 2), y: H / 2 + rr(-1.2, 1.2), r: T.praca };
      // (o rio veio antes) um lugar seco para a praça: a partir de (x0, y0), andando em volta (ou ao longo de dir), até achar
      const ringF = ring ? ring.concat([ring[0]]) : null;
      const pracaCabe = (x, y) => x >= praca.r + 2 && y >= praca.r + 2 && x <= W - praca.r - 2 && y <= H - praca.r - 2 && (!agua0 || agua0.ag.dist(x, y) >= praca.r + 1.5) && (!ring || (Tracado.dentro(ring, x, y) && Tracado.distLinha(ringF, x, y) > praca.r + 2));
      const seca = (x0, y0) => {
        if (!agua0 || pracaCabe(x0, y0)) return [x0, y0];
        for (let d = 0.75; d < 14; d += 0.75) { const n = Math.round(d * 5); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, x = x0 + Math.cos(a) * d, y = y0 + Math.sin(a) * d; if (pracaCabe(x, y)) return [x, y]; } }
        return [x0, y0];
      };
      if (agua0 && !pracaRio) [praca.x, praca.y] = seca(praca.x, praca.y);
      if (pracaRio && agua0) {
        const rio0 = agua0.rios[0];
        for (let k = 0; k < 80; k++) {
          const q = Tracado.aoLongo(rio0.pts, 0.2 + rg() * 0.6), lado = rg() < 0.5 ? 1 : -1, d = rio0.hw + praca.r + 1.2;
          const x = q.x - Math.sin(q.ang) * d * lado, y = q.y + Math.cos(q.ang) * d * lado;
          if (x < praca.r + 2.5 || y < praca.r + 2.5 || x > W - praca.r - 2.5 || y > H - praca.r - 2.5 || agua0.ag.dist(x, y) < praca.r + 0.9) continue;
          if (ring && !(Tracado.dentro(ring, x, y) && Tracado.distLinha(ring.concat([ring[0]]), x, y) > praca.r + 2.5)) continue;
          praca.x = x; praca.y = y;
          break;
        }
      }
      // o portão (com paliçada, o ponto do contorno; sem ela, a borda do mapa) numa direção; com o rio, ele escorrega um
      // pouco para o lado, para não cair na água
      const saidaEm = ang => {
        let primeira = null;
        for (const da of agua0 ? [0, 0.12, -0.12, 0.24, -0.24, 0.36, -0.36, 0.5, -0.5] : [0]) {
          const a = ang + da, ux = Math.cos(a), uy = Math.sin(a), g = ring ? Tracado.noContorno(ring, c0[0], c0[1], a) : null;
          if (ring && !g) continue;
          const ox = g ? g.x : c0[0], oy = g ? g.y : c0[1];
          const t = Math.min(ux > 1e-9 ? (W + 1 - ox) / ux : ux < -1e-9 ? (-1 - ox) / ux : Infinity, uy > 1e-9 ? (H + 1 - oy) / uy : uy < -1e-9 ? (-1 - oy) / uy : Infinity);
          const fora = [ox + ux * t, oy + uy * t], ini = g ? [g.x, g.y] : fora, q = { fora, ini };
          if (!primeira) primeira = q;
          if (!agua0 || agua0.ag.dist(clamp(ini[0], 0.5, W - 0.5), clamp(ini[1], 0.5, H - 0.5)) >= hw + 1.2) return q;
        }
        return primeira;
      };
      const saidas = [];
      for (const id of dirs8) {
        const q = saidaEm(Tracado.DIR[id].a);
        if (!q || (ring && saidas.some(s2 => Math.hypot(s2.ini[0] - q.ini[0], s2.ini[1] - q.ini[1]) < 5))) continue;
        saidas.push({ id, fora: q.fora, ini: q.ini, o: rr(-2.2, 2.2) });
      }
      // a praça perto de um portão (sorteado entre eles): para dentro, a alguns quadrados dele
      if (T8.praca === 'portao' && saidas.length) {
        const sd = saidas[Math.floor(rg() * saidas.length) % saidas.length], [gx, gy] = sd.ini;
        const dx = c0[0] - gx, dy = c0[1] - gy, d = Math.hypot(dx, dy) || 1;
        let k = Math.min(d * 0.6, praca.r + (ring ? 4.5 : 6));
        // (com o rio, um pouco mais para dentro, até ficar seca)
        if (agua0) while (k < d * 0.9 && !pracaCabe(gx + dx / d * k, gy + dy / d * k)) k += 0.75;
        [praca.x, praca.y] = seca(gx + dx / d * k, gy + dy / d * k);
      }
      const ruas = saidas.map(sd => {
        const [x, y] = sd.ini, L = Math.hypot(praca.x - x, praca.y - y) || 1, nx = -(praca.y - y) / L, ny = (praca.x - x) / L;
        const meio = [(x + praca.x) / 2 + nx * sd.o, (y + praca.y) / 2 + ny * sd.o];
        return { pts: (ring ? reta(sd.fora, sd.ini) : [sd.fora]).concat(curvaQ(sd.ini, meio, [praca.x, praca.y]).slice(1)), hw, dir: sd.id };
      });
      return { ruaY: null, ruaX: null, ruas, praca, anel: ring, ruaP: { v: 8, s: sR } };
    };

    // 1) as ruas: as travadas; senão, sorteadas sem passar por cima das casas travadas (nem da praça em cima do rio travado)
    let ruaP = null, G = null, rioPre = null;
    const rioTrP = travaRio && !rioRosa ? travaRio : null, rioTravado = rioTrP ? geoRio(rioTrP) : null;
    if (!ruasNovas) {
      ruaP = travaRuas ? completar(travaRuas) : null;
      const servem = Gx => !trava.casas.some(k => bateNaRua(k, Gx)) && (!rioTravado || pracaLongeDoRio(Gx, rioTravado));
      if (ruaP) G = geoRuas(ruaP);
      else {
        for (let tent = 0; tent < 60 && !G; tent++) { const P = sortearRuas(), Gx = geoRuas(P); if (servem(Gx)) { ruaP = P; G = Gx; } }
        // nenhuma serviu: as ruas que estavam na tela (as casas travadas cabiam nelas); sem elas, um sorteio a mais
        if (!G && base.ruaP && ['y0', 'A', 'L', 'F'].every(k => num(base.ruaP[k])) && base.ruaP.L > 0) { ruaP = completar(base.ruaP); G = geoRuas(ruaP); }
        if (!G) { ruaP = sortearRuas(); G = geoRuas(ruaP); }
      }
    } else {
      // (lote 8) o rio da rosa e a praça na beira do rio: o rio vem antes (o travado, o da rosa ou o de sempre, longe do
      // meio do mapa), e as ruas se arrumam em volta dele
      if (rioRosa) { const e = travaRio ? rioRosaEm(travaRio.s, travaRio.k) : sortearRosa(); rioPre = { rioP: e.rioP, A: e.A }; }
      else if (pracaRio) { const e = rioDeSempre(rioTrP, { x: W / 2, y: H / 2, r: T.praca }); rioPre = { rioP: e.rioP, rioG: e.rioG, A: comoAgua([{ pts: e.rioG.pts, hw: e.rioP.rw }], null) }; }
      const aguaTr = rioPre ? rioPre.A : rioTravado ? comoAgua([{ pts: rioTravado.pts, hw: rioTravado.hw }], null) : null;
      const servem8 = Gx => !trava.casas.some(k => bateNaRua(k, Gx)) && (!aguaTr || aguaTr.ag.dist(Gx.praca.x, Gx.praca.y) >= Gx.praca.r + 0.9);
      if (travaRuas) G = tracar8(travaRuas.s, rioPre && rioPre.A);
      else {
        for (let k = 0; k < 20 && !G; k++) { const e = tracar8(sub(seed, 1 + 100 * k), rioPre && rioPre.A); if (servem8(e)) G = e; }
        if (!G && base.ruaP && base.ruaP.v === 8 && Number.isInteger(base.ruaP.s) && base.ruaP.s > 0) G = tracar8(base.ruaP.s, rioPre && rioPre.A);
        if (!G) G = tracar8(sub(seed, 1), rioPre && rioPre.A);
      }
      ruaP = G.ruaP;
    }
    const { ruaY, ruaX, praca } = G;
    let ruas = G.ruas, anel = G.anel || null;
    const occ = new Uint8Array(W * H);                     // 0 livre · 1 rua ou praça · 2 rio · 3 casa · 4 árvore ou enfeite · 6 paliçada (lote 8)
    const at = (i, j) => (i >= 0 && j >= 0 && i < W && j < H ? occ[j * W + i] : 9);
    const pos = (i, j, v) => { if (i >= 0 && j >= 0 && i < W && j < H) occ[j * W + i] = v; };
    const marcarRuas = () => {
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const cx = i + 0.5, cy = j + 0.5;
        if (ruas.some(ru => distLinha(ru.pts, cx, cy) <= ru.hw + 0.25) || Math.hypot(cx - praca.x, cy - praca.y) <= praca.r + 0.3) pos(i, j, 1);
      }
    };
    marcarRuas();
    // 2) o rio (atravessa a rua principal por uma ponte): o travado, ou um sorteado que não passe pelas casas travadas
    let rioP = null, rioG = null, ponte = null, A8 = null, pontes = null;
    if (comRio && !contaNova) {
      if (rioTravado) { rioP = Object.assign({}, travaRio); rioG = rioTravado; }
      else {
        for (let tent = 0; tent < 60 && !rioG; tent++) { const R = sortearRio(praca), Rg = geoRio(R); if (!trava.casas.some(k => bateNoRio(k, Rg))) { rioP = R; rioG = Rg; } }
        if (!rioG && base.rioP && ['xr0', 'C', 'N', 'Hh', 'rw'].every(k => num(base.rioP[k]))) { rioP = Object.assign({}, base.rioP); rioG = geoRio(rioP); }
        if (!rioG) { rioP = sortearRio(praca); rioG = geoRio(rioP); }
      }
      let xb = rioP.xr0;
      for (let k = 0; k < 6; k++) xb = rioG.rioX(ruaY(xb));
      const yb = ruaY(xb), inc = Math.atan2(ruaY(xb + 0.5) - ruaY(xb - 0.5), 1);
      ponte = { x: xb, y: yb, comp: 2 * rioP.rw + 1.6, larg: 2 * hw + 0.5, ang: inc };
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (at(i, j) !== 1 && distLinha(rioG.pts, i + 0.5, j + 0.5) <= rioP.rw + 0.6) pos(i, j, 2);
    } else if (comRio) {
      /* (lote 8) a conta nova: o rio (o da rosa ou o de sempre) e as pontes onde as ruas cruzam a água — na ordem de perto
         da praça, até o tanto escolhido; onde não há ponte (e no lago), a rua para na beira, dos dois lados */
      if (rioPre) { rioP = rioPre.rioP; A8 = rioPre.A; }
      else { const e = rioDeSempre(rioTrP, praca); rioP = e.rioP; A8 = comoAgua([{ pts: e.rioG.pts, hw: e.rioP.rw }], null); }
      pontes = [];
      const todos = [];
      // (o rio que passa por dentro do lago não ganha ponte ali: no lago, a rua para na beira)
      ruas.forEach((ru, ir) => { for (const q of Tracado.cruzamentos(ru.pts, A8)) if (!q.lago && !(A8.lago && Tracado.dentro(A8.lago, q.x, q.y))) todos.push(Object.assign(q, { ir, ru })); });
      todos.sort((a, b) => Math.hypot(a.x - praca.x, a.y - praca.y) - Math.hypot(b.x - praca.x, b.y - praca.y));
      const max = T8.pontes == null ? Infinity : T8.pontes, fora = new Map();
      for (const q of todos) {
        if (pontes.some(pq => Math.hypot(pq.x - q.x, pq.y - q.y) < 3)) continue;
        if (pontes.length < max) { pontes.push({ x: q.x, y: q.y, comp: 2 * q.rio.hw + 1.6, larg: 2 * q.ru.hw + 0.5, ang: q.ang }); continue; }
        if (!fora.has(q.ir)) fora.set(q.ir, []);
        fora.get(q.ir).push([q.s - q.rio.hw - 0.9, q.s + q.rio.hw + 0.9]);
      }
      if (A8.lago) ruas.forEach((ru, ir) => { for (const iv of Tracado.dentroDe(ru.pts, (x, y) => Tracado.dentro(A8.lago, x, y), 0.6)) { if (!fora.has(ir)) fora.set(ir, []); fora.get(ir).push(iv); } });
      if (fora.size) { const novas = []; ruas.forEach((ru, ir) => { if (!fora.has(ir)) { novas.push(ru); return; } for (const pts of Tracado.cortar(ru.pts, fora.get(ir), 1.5)) novas.push(Object.assign({}, ru, { pts })); }); ruas = novas; }
      // (as ruas de novo, sem os pedaços cortados; depois a água)
      occ.fill(0); marcarRuas();
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (at(i, j) !== 1 && A8.ag.dist(i + 0.5, j + 0.5) <= 0.6) pos(i, j, 2);
    }
    const rioGeo = rioG ? { pts: rioG.pts, hw: rioP.rw } : A8 ? { pts: A8.rios[0].pts, hw: A8.rios[0].hw } : null;
    const afluente = A8 && A8.rios[1] ? { pts: A8.rios[1].pts, hw: A8.rios[1].hw } : null, lago = A8 ? A8.lago : null;
    const pontesTodas = pontes || (ponte ? [ponte] : []);
    // os quadrados perto de uma linha (até R dela), que valem vale(v), viram v
    const marcarLinha = (pts, R, v, vale) => {
      for (let k = 1; k < pts.length; k++) {
        const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
        for (let j = Math.max(0, Math.floor(Math.min(ay, by) - R - 1)); j <= Math.min(H - 1, Math.ceil(Math.max(ay, by) + R + 1)); j++)
          for (let i = Math.max(0, Math.floor(Math.min(ax, bx) - R - 1)); i <= Math.min(W - 1, Math.ceil(Math.max(ax, bx) + R + 1)); i++)
            if (vale(occ[j * W + i]) && distSeg(i + 0.5, j + 0.5, ax, ay, bx, by) <= R) occ[j * W + i] = v;
      }
    };
    // 3) a muralha (paliçada): um retângulo a dois quadrados da borda, com portões onde as ruas saem e a água passa por baixo
    let muro = null;
    if (muralha && !anelNovo) {
      const x1 = 2, y1 = 2, x2 = W - 2, y2 = H - 2;
      const vaos = { n: [], s: [], o: [], l: [] }, portoes = [];
      const vao = (lado, c, meia, portao) => {
        const a = Math.floor(c - meia - 0.5), b = Math.ceil(c + meia + 0.5);
        vaos[lado].push([a, b]);
        if (portao) portoes.push(lado === 'o' || lado === 'l' ? { x1: lado === 'o' ? x1 : x2, y1: a, x2: lado === 'o' ? x1 : x2, y2: b } : { x1: a, y1: lado === 'n' ? y1 : y2, x2: b, y2: lado === 'n' ? y1 : y2 });
      };
      vao('o', ruaY(x1), hw, true); vao('l', ruaY(x2), hw, true);
      if (ruaX) { vao('n', ruaX(y1), hw * 0.85, true); vao('s', ruaX(y2), hw * 0.85, true); }
      if (rioGeo) { const rx = y => rioGeo.pts.reduce((m, p) => (Math.abs(p[1] - y) < Math.abs(m[1] - y) ? p : m))[0]; vao('n', rx(y1), rioGeo.hw, false); vao('s', rx(y2), rioGeo.hw, false); }
      const trechos = (de, ate, vs) => {
        const out = []; let a = de;
        for (const [va, vb] of vs.slice().sort((p, q) => p[0] - q[0])) { if (va > a) out.push([a, Math.min(va, ate)]); a = Math.max(a, vb); }
        if (a < ate) out.push([a, ate]);
        return out.filter(([p, q]) => q - p >= 1);
      };
      muro = { x1, y1, x2, y2, portoes, lados: { n: trechos(x1, x2, vaos.n), s: trechos(x1, x2, vaos.s), o: trechos(y1, y2, vaos.o), l: trechos(y1, y2, vaos.l) } };
    } else if (muralha) {
      // (lote 8) a paliçada pelo contorno (o retângulo, o octógono, a redonda ou a irregular): os portões onde as ruas
      // cruzam o contorno; aberta onde ele passa pela água. Os quadrados dela ficam marcados (nada nasce em cima)
      if (!anel) anel = anelDe(T8.muro, W, H, mulberry(sub(seed, 21)));
      const aguaD = A8 ? A8.ag.dist : rioGeo ? (x, y) => distLinha(rioGeo.pts, x, y) - rioGeo.hw : null;
      const pecas = Tracado.pecasDoAnel(anel, ruas, aguaD ? (x, y) => aguaD(x, y) < 0.35 : null), portoes = [];
      for (const pc of pecas) if (pc.k === 'door') for (let i = 1; i < pc.pts.length; i++) portoes.push({ x1: pc.pts[i - 1][0], y1: pc.pts[i - 1][1], x2: pc.pts[i][0], y2: pc.pts[i][1] });
      for (const pc of pecas) if (pc.k === 'wall') marcarLinha(pc.pts, 0.75, 6, v => v === 0);
      muro = { forma: T8.muro, anel, pecas, portoes };
    }
    if (!muralha) anel = null;
    const reg = muralha && !anel ? { x0: 3, y0: 3, x1: W - 3, y1: H - 3 } : { x0: 1, y0: 1, x1: W - 1, y1: H - 1 };
    // (lote 8) dentro da paliçada pelo contorno, com folga m em volta
    const dentroDoAnel = (x, y, w, h, m) => {
      if (!anel) return true;
      const f = m == null ? 1 : m;
      for (const [px, py] of [[x - f, y - f], [x + w + f, y - f], [x - f, y + h + f], [x + w + f, y + h + f], [x + w / 2, y - f], [x + w / 2, y + h + f], [x - f, y + h / 2], [x + w + f, y + h / 2]]) if (!Tracado.dentro(anel, px, py)) return false;
      return true;
    };

    // 4) as casas: primeiro as travadas; depois as que dão para a rua; se faltar lugar, as de trás (com a porta virada para a rua)
    const cabe = (x, y, w, h) => {
      if (x < reg.x0 || y < reg.y0 || x + w > reg.x1 || y + h > reg.y1) return false;
      if (anel && !dentroDoAnel(x, y, w, h, 0.3)) return false;          // (os quadrados da paliçada já ficam de fora)
      for (let j = y - 1; j <= y + h; j++) for (let i = x - 1; i <= x + w; i++) {
        const v = at(i, j), dentro = i >= x && i < x + w && j >= y && j < y + h;
        if (dentro ? v !== 0 : v === 3 || v === 2) return false;
      }
      return true;
    };
    const ocupar = k => { for (let j = k.y; j < k.y + k.h; j++) for (let i = k.x; i < k.x + k.w; i++) pos(i, j, 3); };
    const casas = [];
    let soltas = 0;
    // (as casas travadas em outro estilo são mobiliadas com outro sorteio: assim o resto do lugar não muda por causa delas)
    const rndT = mulberry((seed ^ 0x9e3779b9) >>> 0 || 3);
    for (const k of trava.casas) {
      if (casas.length >= want || !cabe(k.x, k.y, k.w, k.h)) { soltas++; continue; }
      let casa = Object.assign({}, k, { porta: Object.assign({}, k.porta), janelas: k.janelas.map(j => Object.assign({}, j)), moveis: k.moveis.map(m => Object.assign({}, m)), trava: true });
      // travada em outro estilo: fica no mesmo lugar, com a mesma porta, mas a forma, as janelas e os móveis passam a ser deste
      if (casa.estilo !== estilo) { casa.forma = Estilos.formaDe(TP[casa.tipo], casa.w, casa.h); casa.janelas = janelasDe(casa, TP[casa.tipo], rndT); casa.moveis = mobiliar(casa, TP[casa.tipo], rndT); }
      delete casa.estilo;
      ocupar(casa); casas.push(casa);
    }
    const tipos = [];
    if (want >= 4) tipos.push('taverna');
    if (tam === 'vila' && want >= 7) tipos.push('capela', 'armazem');
    if (want >= 6) tipos.push('ferraria');
    while (tipos.length < want) tipos.push('casa');
    for (const k of casas) { const i = tipos.indexOf(k.tipo); tipos.splice(i >= 0 ? i : tipos.lastIndexOf('casa') >= 0 ? tipos.lastIndexOf('casa') : tipos.length - 1, 1); }
    const porta = (x, y, w, h, lado) => {
      const len = lado === 'n' || lado === 's' ? w : h, d = clamp(Math.floor(len / 2) + ri(-1, 1) * (len >= 5 ? 1 : 0), 1, Math.max(1, len - 2));
      if (lado === 'n') return { lado, x1: x + d, y1: y, x2: x + d + 1, y2: y };
      if (lado === 's') return { lado, x1: x + d, y1: y + h, x2: x + d + 1, y2: y + h };
      if (lado === 'o') return { lado, x1: x, y1: y + d, x2: x, y2: y + d + 1 };
      return { lado, x1: x + w, y1: y + d, x2: x + w, y2: y + d + 1 };
    };
    const tentarNaRua = tipo => {
      const def = TP[tipo];
      for (let k = 0; k < 300; k++) {
        const [w, h] = pick(def.tam);
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
      const def = TP[tipo];
      for (let k = 0; k < 300; k++) {
        const [w, h] = pick(def.tam), x = ri(reg.x0, reg.x1 - w), y = ri(reg.y0, reg.y1 - h);
        if (!cabe(x, y, w, h)) continue;
        const cx = x + w / 2, cy = y + h / 2, dy = cy - ruaY(cx), dx = ruaX ? cx - ruaX(cy) : Infinity;
        const lado = Math.abs(dx) < Math.abs(dy) ? (dx < 0 ? 'l' : 'o') : (dy < 0 ? 's' : 'n');
        return { x, y, w, h, porta: porta(x, y, w, h, lado) };
      }
      return null;
    };
    /* (lote 8) Com as ruas novas (que não são senoides): todos os lugares de frente para uma rua — a cada quadrado de cada
       rua, a casa de um lado ou do outro, encostada ou a um quadrado dela — e um deles, sorteado; senão, os de trás (os
       mais perto de uma rua), com a porta virada para a rua mais perto. Procurar em todos acha os cantos apertados. */
    const comps8 = ruasNovas ? ruas.map(ru => Tracado.comprimento(ru.pts)) : null;
    const tentarNaRua8 = tipo => {
      const def = TP[tipo], vagas = [], vistas = new Set();
      ruas.forEach((ru, ir) => {
        const L = comps8[ir];
        for (let u = 0.5; u < L; u += 1) {
          const q = Tracado.aoLongo(ru.pts, u / L), deitada = Math.abs(Math.cos(q.ang)) >= Math.abs(Math.sin(q.ang));
          for (const [w, h] of def.tam) {
            const x0 = Math.round(q.x - w / 2), y0 = Math.round(q.y - h / 2);
            const perto = deitada ? ru.pts.filter(([px, py]) => px >= x0 - 0.25 && px <= x0 + w + 0.25 && Math.abs(py - q.y) < 4).map(pt => pt[1]) : ru.pts.filter(([px, py]) => py >= y0 - 0.25 && py <= y0 + h + 0.25 && Math.abs(px - q.x) < 4).map(pt => pt[0]);
            if (!perto.length) continue;
            const mn = Math.min(...perto), mx = Math.max(...perto);
            for (const antes of [true, false]) for (const gap of [0, 1]) {
              const x = deitada ? x0 : antes ? Math.floor(mn - ru.hw - 0.25) - gap - w : Math.ceil(mx + ru.hw + 0.25) + gap;
              const y = !deitada ? y0 : antes ? Math.floor(mn - ru.hw - 0.25) - gap - h : Math.ceil(mx + ru.hw + 0.25) + gap;
              const lado = deitada ? (antes ? 's' : 'n') : (antes ? 'l' : 'o'), chave = x + ',' + y + ',' + w + ',' + h;
              if (vistas.has(chave)) continue;
              vistas.add(chave);
              if (cabe(x, y, w, h)) vagas.push({ x, y, w, h, lado });
            }
          }
        }
      });
      if (!vagas.length) return null;
      const v = vagas[Math.floor(rnd() * vagas.length) % vagas.length];
      return { x: v.x, y: v.y, w: v.w, h: v.h, porta: porta(v.x, v.y, v.w, v.h, v.lado) };
    };
    const tentarAtras8 = tipo => {
      const def = TP[tipo], vagas = [];
      const ruaMaisPerto = (cx, cy) => { let alvo = [praca.x, praca.y], dm = Math.hypot(praca.x - cx, praca.y - cy); for (const ru of ruas) for (const pt of ru.pts) { const d = Math.hypot(pt[0] - cx, pt[1] - cy); if (d < dm) { dm = d; alvo = pt; } } return { alvo, dm }; };
      for (const [w, h] of def.tam) for (let y = reg.y0; y <= reg.y1 - h; y++) for (let x = reg.x0; x <= reg.x1 - w; x++) if (cabe(x, y, w, h)) vagas.push({ x, y, w, h, d: ruaMaisPerto(x + w / 2, y + h / 2).dm });
      if (!vagas.length) return null;
      vagas.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
      const { x, y, w, h } = vagas[Math.floor(rnd() * Math.ceil(vagas.length / 3)) % vagas.length], { alvo } = ruaMaisPerto(x + w / 2, y + h / 2);
      const dx = alvo[0] - (x + w / 2), dy = alvo[1] - (y + h / 2);
      return { x, y, w, h, porta: porta(x, y, w, h, Math.abs(dx) / w > Math.abs(dy) / h ? (dx < 0 ? 'o' : 'l') : (dy < 0 ? 'n' : 's')) };
    };
    for (const tipo of tipos) {
      const lugar = ruasNovas ? tentarNaRua8(tipo) || tentarAtras8(tipo) : tentarNaRua(tipo) || tentarAtras(tipo);
      if (!lugar) continue;
      const def = TP[tipo], casa = Object.assign({ tipo, forma: Estilos.formaDe(def, lugar.w, lugar.h) }, lugar);
      casa.janelas = janelasDe(casa, def, rnd);
      casa.moveis = mobiliar(casa, def, rnd);
      ocupar(casa); casas.push(casa);
    }
    // 5) a praça: o poço no meio e as luzes em volta (o lampião, a lanterna de papel ou o braseiro, conforme o estilo)
    const poco = { x: Math.round(praca.x - 0.5), y: Math.round(praca.y - 0.5) };
    const lampioes = [];
    for (let k = 0; k < T.lamp; k++) {
      const a = (k / T.lamp) * Math.PI * 2 + Math.PI / 4, lx = Math.round(praca.x + Math.cos(a) * (praca.r - 0.6) - 0.5), ly = Math.round(praca.y + Math.sin(a) * (praca.r - 0.6) - 0.5);
      if ((lx !== poco.x || ly !== poco.y) && !lampioes.some(q => q.x === lx && q.y === ly)) lampioes.push({ x: lx, y: ly });
    }
    // 5b) (lote 8) o relevo natural: as colinas e as matas (áreas de terreno da cena) e as pedras, em manchas pelo ruído —
    //     longe da praça, das ruas, da água, das casas e da paliçada (outro sorteio)
    let natural = null;
    const longeNat = Math.min(W, H) * 0.3;
    if (T8.relevo) {
      const pode = (i, j) => {
        if (at(i, j) !== 0 || Math.hypot(i + 0.5 - praca.x, j + 0.5 - praca.y) < longeNat) return false;
        // (a paliçada de sempre, o retângulo, não marca os quadrados dela: longe da linha)
        if (muro && muro.lados && Math.min(Math.abs(i + 0.5 - muro.x1), Math.abs(i + 0.5 - muro.x2), Math.abs(j + 0.5 - muro.y1), Math.abs(j + 0.5 - muro.y2)) < 2.5) return false;
        // (o vilarejo é pequeno: basta um quadrado de folga das ruas, da água, das casas e da paliçada)
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const v = at(i + a, j + b); if (v === 1 || v === 2 || v === 3 || v === 6) return false; }
        return true;
      };
      natural = Tracado.manchas(W, H, pode, sub(seed, 12));
      for (const q of natural.pedras) pos(Math.floor(q.x), Math.floor(q.y), 4);
    }
    // 6) as árvores (pintadas no fundo) e alguns enfeites que dá para mover
    const densidade = { campo: 0.05, floresta: 0.2, areia: 0.025, neve: 0.06 }[terreno] * E.dens;
    const especie = E.arvore[terreno];
    const arvores = [], enfeites = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (at(i, j) !== 0) continue;
      let perto = false;
      for (let b = -1; b <= 1 && !perto; b++) for (let a = -1; a <= 1 && !perto; a++) if (at(i + a, j + b) === 3) perto = true;
      if (perto) continue;
      const borda = Math.min(i, j, W - 1 - i, H - 1 - j), fora = muralha && (anel ? !Tracado.dentro(anel, i + 0.5, j + 0.5) : (i < 2 || j < 2 || i >= W - 2 || j >= H - 2));
      // (lote 8: com o relevo natural, as árvores de longe da praça se juntam nos bosques)
      const bos = natural && Math.hypot(i + 0.5 - praca.x, j + 0.5 - praca.y) >= longeNat ? natural.bosque(i + 0.5, j + 0.5) : null;
      const pr = densidade * (fora ? 2.2 : borda < 3 ? 1.5 : terreno === 'floresta' ? 0.35 : 0.6) * (bos == null ? 1 : 0.15 + 2.7 * bos);
      if (rnd() < pr) { arvores.push({ x: i + 0.5 + r(-0.25, 0.25), y: j + 0.5 + r(-0.25, 0.25), r: r(0.55, terreno === 'floresta' ? 1.25 : 1.05) }); pos(i, j, 4); }
    }
    const tiposEnfeite = E.enfeites[terreno];
    for (let k = 0, tent = 0; k < (tam === 'vila' ? 6 : 4) && tent < 200; tent++) {
      const i = ri(reg.x0, reg.x1 - 1), j = ri(reg.y0, reg.y1 - 1), id = pick(tiposEnfeite), s = Props.P[id] ? Props.P[id].size || 1 : 1;
      let ok = !anel || dentroDoAnel(i, j, s, s, 0.5);
      for (let b = -1; b <= s && ok; b++) for (let a = -1; a <= s && ok; a++) { const v = at(i + a, j + b); if (v === 3 || v === 2 || ((a >= 0 && a < s && b >= 0 && b < s) && v !== 0)) ok = false; }
      if (!ok) continue;
      for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) pos(i + a, j + b, 4);
      enfeites.push({ id, x: i, y: j, s }); k++;
    }
    // 6b) (lote 7) outro sorteio, que não mexe no resto: os quintais atrás das casas (a horta ou o terreiro), o píer no
    //     rio (do lado da praça, longe da ponte) e um morro num canto livre
    const rq = mulberry((seed ^ 0x51ed270b) >>> 0 || 7), quintais = [];
    for (const k of casas) {
      if (rq() < 0.35) continue;
      const atras = { n: 's', s: 'n', o: 'l', l: 'o' }[k.porta.lado], horiz = atras === 'n' || atras === 's';
      const w2 = horiz ? Math.max(2, k.w - 1) : 2, h2 = horiz ? 2 : Math.max(2, k.h - 1);
      const x = horiz ? k.x + Math.floor((k.w - w2) / 2) : atras === 'o' ? k.x - w2 - 1 : k.x + k.w + 1, y = horiz ? (atras === 'n' ? k.y - h2 - 1 : k.y + k.h + 1) : k.y + Math.floor((k.h - h2) / 2);
      let ok = x >= 1 && y >= 1 && x + w2 <= W - 1 && y + h2 <= H - 1 && (!anel || dentroDoAnel(x, y, w2, h2, 0.4));
      for (let j = y - 1; j < y + h2 + 1 && ok; j++) for (let i = x - 1; i < x + w2 + 1 && ok; i++) { const v = at(i, j); const dentro = i >= x && i < x + w2 && j >= y && j < y + h2; if (dentro ? v !== 0 && v !== 4 : v === 1 || v === 2) ok = false; }
      if (!ok) continue;
      quintais.push({ x, y, w: w2, h: h2, k: rq() < 0.6 ? 'horta' : 'terreiro' });
      for (let j = y; j < y + h2; j++) for (let i = x; i < x + w2; i++) pos(i, j, 5);
    }
    // (as árvores e os enfeites que caíram num quintal saem)
    for (let n = arvores.length - 1; n >= 0; n--) if (quintais.some(q => arvores[n].x > q.x - 0.2 && arvores[n].x < q.x + q.w + 0.2 && arvores[n].y > q.y - 0.2 && arvores[n].y < q.y + q.h + 0.2)) arvores.splice(n, 1);
    for (let n = enfeites.length - 1; n >= 0; n--) { const e = enfeites[n]; if (quintais.some(q => e.x < q.x + q.w && e.x + e.s > q.x && e.y < q.y + q.h && e.y + e.s > q.y)) enfeites.splice(n, 1); }
    let pier = null;
    if (rioGeo) {
      const cands = rioGeo.pts.filter(([x, y]) => x > 1 && y > 1 && x < W - 1 && y < H - 1 && !pontesTodas.some(b => Math.hypot(x - b.x, y - b.y) <= 4)).sort((u, v) => Math.hypot(u[0] - praca.x, u[1] - praca.y) - Math.hypot(v[0] - praca.x, v[1] - praca.y));
      for (const [x, y] of cands.slice(0, 12)) {
        const lado = praca.x < x ? -1 : 1, px = lado < 0 ? x - rioGeo.hw - 1 : x + rioGeo.hw - 0.4, py = y - 0.4;
        let ok = true;
        for (let j = Math.floor(py); j <= Math.floor(py + 0.8) && ok; j++) for (let i = Math.floor(px); i <= Math.floor(px + 1.4) && ok; i++) { const v = at(i, j); if (v === 3 || v === 1) ok = false; }
        if (ok) { pier = { x: px, y: py, w: 1.4, h: 0.8 }; break; }
      }
    }
    // o morro: num dos cantos, se ali só há chão e árvore (nada de rua, rio ou casa) — (lote 8) com o relevo natural, não:
    // as colinas fazem esse papel
    let morro = null;
    if (!natural) for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]].sort(() => rq() - 0.5)) {
      const mw = Math.min(8, Math.floor(W * 0.28)), mh = Math.min(6, Math.floor(H * 0.3)), x0 = cx ? W - mw : 0, y0 = cy ? H - mh : 0;
      let ok = true;
      for (let j = y0; j < y0 + mh && ok; j++) for (let i = x0; i < x0 + mw && ok; i++) { const v = at(i, j); if (v !== 0 && v !== 4) ok = false; }
      if (!ok) continue;
      const mx = x0 + mw / 2 + (cx ? 0.6 : -0.6), my = y0 + mh / 2 + (cy ? 0.5 : -0.5), pts = [];
      for (let k = 0; k < 14; k++) { const an = k / 14 * Math.PI * 2, rr = 0.82 + rq() * 0.22; pts.push([mx + Math.cos(an) * mw / 2 * rr, my + Math.sin(an) * mh / 2 * rr]); }
      morro = { pts, alt: 3 + Math.floor(rq() * 3) };
      break;
    }
    // 7) (lote 7) o relevo e as formas: o rio vira água (com fundura), a ponte fica 1,5 m acima dela, o píer e o morro;
    //    as bandeirinhas cruzam a praça, de uma luz à do outro lado (lote 8: as matas e as colinas do relevo natural, por
    //    baixo de tudo; o afluente e o lago)
    const relevo = [], formas = [];
    if (natural) { for (const m of natural.matas) relevo.push({ t: 'mata', alt: 0, k: 'poly', pts: m.pts }); for (const c of natural.colinas) relevo.push({ t: 'morro', alt: c.alt, k: 'poly', pts: c.pts }); }
    if (morro) relevo.push({ t: 'morro', alt: morro.alt, k: 'poly', pts: morro.pts });
    if (rioGeo) relevo.push({ t: 'agua', alt: -1.5, k: 'free', pts: rioGeo.pts.filter((_, i) => i % 2 === 0), sw: rioGeo.hw * 2 });
    if (afluente) relevo.push({ t: 'agua', alt: -1.2, k: 'free', pts: afluente.pts.filter((_, i) => i % 2 === 0), sw: afluente.hw * 2 });
    if (lago) relevo.push({ t: 'agua', alt: -1.5, k: 'poly', pts: lago });
    // (a ponte de madeira vira plataforma; a de pedra, do anão e do desértico, fica só no desenho)
    for (const b of pontesTodas) if (estilo !== 'anao' && estilo !== 'desertico') relevo.push({ t: 'plataforma', alt: 1.5, k: 'poly', pts: Estilos.retangulo(b.x, b.y, b.comp, b.larg, b.ang) });
    if (pier) relevo.push({ t: 'plataforma', alt: 0.5, k: 'rect', x: pier.x, y: pier.y, w: pier.w, h: pier.h });
    const metade = Math.floor(lampioes.length / 2);
    for (let i = 0; i < metade; i++) { const a = lampioes[i], b = lampioes[i + metade]; formas.push(...Estilos.bandeirinhas([a.x + 0.5, a.y + 0.5], [b.x + 0.5, b.y + 0.5], estilo, 'praca' + i)); }
    const out = { v: 2, seed, tamanho: tam, terreno, estilo, especie, poste: E.poste, rio: rioGeo, muralha, W, H, pedidas: want, ruaP, rioP, travaRuas: !!travaRuas, travaRio: !!travaRio, soltas,
      ruas, praca, ponte, muro, casas, poco, lampioes, arvores, enfeites, quintais, pier, relevo, formas };
    // (lote 8: o traçado novo — as pontes contadas, o afluente, o lago e as pedras; sem ele, o plano fica como era)
    if (pontes) out.pontes = pontes;
    if (afluente) out.afluente = afluente;
    if (lago) out.lago = lago;
    if (natural) out.pedras = natural.pedras;
    return out;
  }
  /* As janelas de uma casa: nos lados sem a porta, longe dos cantos, cada uma num lado. */
  function janelasDe(c, def, rnd) {
    const out = [], livres = ['n', 's', 'o', 'l'].filter(l => l !== c.porta.lado);
    for (let i = 0; i < (def.janelas || 0) && livres.length; i++) {
      const lado = livres.splice(Math.floor(rnd() * livres.length) % livres.length, 1)[0], len = lado === 'n' || lado === 's' ? c.w : c.h;
      if (len < 3) continue;
      const d = 1 + (Math.floor(rnd() * (len - 2)) % (len - 2));
      if (lado === 'n') out.push({ lado, x1: c.x + d, y1: c.y, x2: c.x + d + 1, y2: c.y });
      else if (lado === 's') out.push({ lado, x1: c.x + d, y1: c.y + c.h, x2: c.x + d + 1, y2: c.y + c.h });
      else if (lado === 'o') out.push({ lado, x1: c.x, y1: c.y + d, x2: c.x, y2: c.y + d + 1 });
      else out.push({ lado, x1: c.x + c.w, y1: c.y + d, x2: c.x + c.w, y2: c.y + d + 1 });
    }
    return out;
  }
  /* Os móveis de uma casa: longe da porta (a passagem fica livre), sem um em cima do outro e fora dos cantos cortados
     da casa redonda. O do meio (a fogueira da casa longa) vai primeiro; depois, encostados nas paredes (a mesa, no meio). */
  function mobiliar(c, def, rnd) {
    const out = [], dentro = new Uint8Array(c.w * c.h);
    const livre = (i, j) => i >= 0 && j >= 0 && i < c.w && j < c.h && !dentro[j * c.w + i];
    if (c.forma === 'oct') for (const [i, j] of [[0, 0], [c.w - 1, 0], [0, c.h - 1], [c.w - 1, c.h - 1]]) dentro[j * c.w + i] = 3;
    const p = c.porta, pi = p.lado === 'l' ? c.w - 1 : p.lado === 'o' ? 0 : p.x1 - c.x, pj = p.lado === 's' ? c.h - 1 : p.lado === 'n' ? 0 : p.y1 - c.y;
    const di = p.lado === 'l' ? -1 : p.lado === 'o' ? 1 : 0, dj = p.lado === 's' ? -1 : p.lado === 'n' ? 1 : 0;
    for (let k = 0; k < 2; k++) { const i = pi + di * k, j = pj + dj * k; if (i >= 0 && j >= 0 && i < c.w && j < c.h) dentro[j * c.w + i] = 2; }
    const por = (id, i, j, s) => { for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) dentro[(j + b) * c.w + i + a] = 1; out.push({ id, x: c.x + i, y: c.y + j, s }); };
    const lista = def.moveis.slice();
    // o do meio: no meio da casa ou, se a passagem da porta está lá, no lugar livre mais perto do meio
    if (def.centro && Props.P[def.centro]) {
      const s = Props.P[def.centro].size || 1, ci = (c.w - s) / 2, cj = (c.h - s) / 2, lugares = [];
      for (let j = 0; j + s <= c.h; j++) for (let i = 0; i + s <= c.w; i++) {
        let ok = true;
        for (let b = 0; b < s && ok; b++) for (let a = 0; a < s && ok; a++) if (!livre(i + a, j + b)) ok = false;
        if (ok) lugares.push([i, j, Math.hypot(i - ci, j - cj)]);
      }
      lugares.sort((u, v) => u[2] - v[2] || u[1] - v[1] || u[0] - v[0]);
      if (lugares.length) { por(def.centro, lugares[0][0], lugares[0][1], s); const k = lista.indexOf(def.centro); if (k >= 0) lista.splice(k, 1); }
    }
    for (const id of lista) {
      if (out.length >= def.max) break;
      if (!Props.P[id]) continue;
      const s = Props.P[id].size || 1, lugares = [];
      for (let j = 0; j + s <= c.h; j++) for (let i = 0; i + s <= c.w; i++) {
        let ok = true;
        for (let b = 0; b < s && ok; b++) for (let a = 0; a < s && ok; a++) if (!livre(i + a, j + b)) ok = false;
        if (ok) lugares.push([i, j]);
      }
      if (!lugares.length) continue;
      // perto das paredes fica mais natural (cama e estante encostadas); o meio, para a mesa e o tapete
      const meio = id === 'mesa' || id === 'tapete';
      lugares.sort((u, v) => (meio ? 0 : Math.min(u[0], u[1], c.w - s - u[0], c.h - s - u[1]) - Math.min(v[0], v[1], c.w - s - v[0], c.h - s - v[1])) || 0);
      const n = meio ? lugares.length : Math.max(1, Math.ceil(lugares.length / 3));
      const [i, j] = lugares[Math.floor(rnd() * n) % lugares.length];
      por(id, i, j, s);
    }
    return out;
  }

  /* ================= as partes que travam (a janela do gerador) ================= */
  // a parte que está no ponto (x, y), em quadrados: 'c<n>' (uma casa), 'rio' ou 'ruas' (as ruas e a praça)
  function parteEm(p, x, y) {
    for (let i = 0; i < p.casas.length; i++) { const k = p.casas[i]; if (x >= k.x - 0.15 && x <= k.x + k.w + 0.15 && y >= k.y - 0.15 && y <= k.y + k.h + 0.15) return 'c' + i; }
    if (p.rio && (distLinha(p.rio.pts, x, y) <= p.rio.hw + 0.5 || (p.afluente && distLinha(p.afluente.pts, x, y) <= p.afluente.hw + 0.5) || (p.lago && Tracado.dentro(p.lago, x, y)))) return 'rio';
    if (Math.hypot(x - p.praca.x, y - p.praca.y) <= p.praca.r + 0.4 || p.ruas.some(ru => distLinha(ru.pts, x, y) <= ru.hw + 0.35)) return 'ruas';
    return null;
  }
  const nomeDaParte = (p, parte) => (parte === 'rio' ? 'o rio' : parte === 'ruas' ? 'as ruas e a praça' : /^c\d+$/.test(parte) && p.casas[+parte.slice(1)] ? nomeDoTipo(p.casas[+parte.slice(1)].tipo, p.estilo) : 'esta parte');
  // o desenho da parte, para a prévia marcar (em quadrados)
  function formaDaParte(p, parte) {
    if (parte === 'rio') return p.rio ? [{ k: 'linha', pts: p.rio.pts, hw: p.rio.hw }].concat(p.afluente ? [{ k: 'linha', pts: p.afluente.pts, hw: p.afluente.hw }] : [], p.lago ? [{ k: 'poli', pts: p.lago }] : []) : [];
    if (parte === 'ruas') return [{ k: 'circ', x: p.praca.x, y: p.praca.y, r: p.praca.r }].concat(p.ruas.map(ru => ({ k: 'linha', pts: ru.pts, hw: ru.hw })));
    const k = /^c\d+$/.test(parte) ? p.casas[+parte.slice(1)] : null;
    return k ? [{ k: 'poli', pts: Estilos.contorno(k) }] : [];
  }
  const travada = (p, parte) => (parte === 'rio' ? !!p.travaRio : parte === 'ruas' ? !!p.travaRuas : /^c\d+$/.test(parte) && p.casas[+parte.slice(1)] ? !!p.casas[+parte.slice(1)].trava : false);
  /* Trava ou solta a parte: muda a trava (o que vai para o próximo sorteio) e a marca no plano que está na tela (nada
     é sorteado de novo). Devolve a trava nova. */
  function alternar(p, parte, trava) {
    const t = { ruas: trava && trava.ruas || null, rio: trava && trava.rio || null, casas: (trava && trava.casas || []).slice() };
    if (parte === 'ruas') { p.travaRuas = !p.travaRuas; t.ruas = p.travaRuas ? Object.assign({}, p.ruaP) : null; }
    else if (parte === 'rio') { if (!p.rio) return t; p.travaRio = !p.travaRio; t.rio = p.travaRio ? Object.assign({}, p.rioP) : null; }
    else if (/^c\d+$/.test(parte) && p.casas[+parte.slice(1)]) {
      const k = p.casas[+parte.slice(1)], mesma = q => q.x === k.x && q.y === k.y && q.w === k.w && q.h === k.h;
      k.trava = !k.trava;
      t.casas = t.casas.filter(q => !mesma(q));
      if (k.trava) t.casas.push({ tipo: k.tipo, forma: k.forma, x: k.x, y: k.y, w: k.w, h: k.h, porta: Object.assign({}, k.porta), janelas: k.janelas.map(j => Object.assign({}, j)), moveis: k.moveis.map(m => Object.assign({}, m)), estilo: p.estilo });
    }
    return t;
  }
  // quantas partes estão travadas no plano
  const quantasTravadas = p => (p.travaRuas ? 1 : 0) + (p.travaRio ? 1 : 0) + p.casas.filter(k => k.trava).length;
  // o que vai para o próximo sorteio quando o mestre não travou nada: as ruas e o rio de agora, para as casas travadas caberem
  const baseDe = p => ({ ruaP: p.ruaP, rioP: p.rioP });
  // a trava do plano que está na tela (para guardar como modelo)
  function travaDe(p) {
    return { ruas: p.travaRuas ? Object.assign({}, p.ruaP) : null, rio: p.travaRio ? Object.assign({}, p.rioP) : null,
      casas: p.casas.filter(k => k.trava).map(k => ({ tipo: k.tipo, forma: k.forma, x: k.x, y: k.y, w: k.w, h: k.h, porta: Object.assign({}, k.porta), janelas: k.janelas.map(j => Object.assign({}, j)), moveis: k.moveis.map(m => Object.assign({}, m)), estilo: p.estilo })) };
  }

  /* ================= o fundo pintado ================= */
  const PAL = {
    campo: { base: '#4b5b40', manchas: ['#3d4c35', '#56693f', '#445637', '#5e6c46', '#39472f'], fios: ['#6c7f4e', '#33412b'], rua: ['#5c5140', '#7a6950', '#8c7a5d'], copa: ['#2c4629', '#355432', '#3f6239'], luz: '#56794a', agua: ['#2f5e7d', '#3f7396', '#5d8fb0'], margem: '#4a4232' },
    floresta: { base: '#3a4a32', manchas: ['#2f3d29', '#465a38', '#36472e', '#4f5f3c', '#2b3826'], fios: ['#5b6e42', '#2a3524'], rua: ['#4f4536', '#6b5c45', '#7d6c52'], copa: ['#23391f', '#2c4527', '#365230'], luz: '#4b6c3f', agua: ['#2a5470', '#386886', '#5684a3'], margem: '#3f3829' },
    areia: { base: '#c9a86a', manchas: ['#bf9c5e', '#d4b57a', '#b8935a', '#cfae72', '#b48c52'], fios: ['#d8bd85', '#a8844c'], rua: ['#a88a5a', '#bfa274', '#cdb388'], copa: ['#5e7a3a', '#6f8c45', '#4f6a30'], luz: '#87a457', agua: ['#356f8c', '#4683a0', '#69a2bc'], margem: '#9a7d4c' },
    neve: { base: '#dfe6ec', manchas: ['#cfd8e0', '#e9eef2', '#c4ced8', '#f2f5f8', '#bcc7d2'], fios: ['#f4f7fa', '#b9c4ce'], rua: ['#8e8273', '#a99d8d', '#bdb3a6'], copa: ['#2f4a3c', '#3a5a49', '#456a56'], luz: '#e8f0f2', agua: ['#5d8aa6', '#7aa3bc', '#a9c8da'], margem: '#9aa6b0' },
  };
  /* (lote 14, parte 14c) op: { g, dx, dy, semChao, semVinheta, recorte } — a vila dentro dos arredores: noutra tela,
     deslocada (em quadrados), sem o chão (o sorteio dele corre numa tela de um pixel: o resto sai igual), sem a vinheta e,
     com o recorte, só dentro do retângulo dela (menos as árvores, que passam um pouco da beira) */
  function pintar(p, cell, op) {
    op = op || {};
    const W = p.W * cell, H = p.H * cell, pal = PAL[p.terreno] || PAL.campo, est = Estilos.valido(p.estilo), TP = Estilos.tipos(est);
    const cv = op.g ? op.g.canvas : document.createElement('canvas');
    if (!op.g) { cv.width = W; cv.height = H; }
    const g = op.g || cv.getContext('2d'), rnd = mulberry((p.seed ^ 0x5bd1e995) >>> 0 || 7), c = cell;
    const TAU2 = Math.PI * 2;
    if (op.g) { g.save(); g.translate((op.dx || 0) * c, (op.dy || 0) * c); }
    // o chão
    { const gc = op.semChao ? Encontro.motor.telinha() : g;
      gc.fillStyle = pal.base; gc.fillRect(0, 0, W, H);
      for (let i = 0, n = Math.round(p.W * p.H * 0.9); i < n; i++) {
        const rr = (0.45 + rnd() * 1.4) * c;
        gc.globalAlpha = 0.1 + rnd() * 0.14; gc.fillStyle = pal.manchas[i % pal.manchas.length];
        gc.beginPath(); gc.ellipse(rnd() * W, rnd() * H, rr, rr * (0.5 + rnd() * 0.6), rnd() * Math.PI, 0, TAU2); gc.fill();
      }
      gc.lineCap = 'round';
      if (p.terreno === 'areia') {
        gc.globalAlpha = 0.25; gc.lineWidth = Math.max(1, c * 0.03);
        for (let i = 0, n = Math.round(p.W * p.H * 0.35); i < n; i++) {
          const x = rnd() * W, y = rnd() * H, l = c * (0.4 + rnd() * 0.9);
          gc.strokeStyle = pal.fios[i % 2]; gc.beginPath(); gc.moveTo(x, y); gc.quadraticCurveTo(x + l / 2, y - c * 0.12, x + l, y); gc.stroke();
        }
      } else {
        gc.globalAlpha = p.terreno === 'neve' ? 0.22 : 0.3; gc.lineWidth = Math.max(1, c * 0.024);
        for (let i = 0, n = Math.round(p.W * p.H * (p.terreno === 'neve' ? 1.2 : 4)); i < n; i++) {
          const x = rnd() * W, y = rnd() * H, a = -Math.PI / 2 + (rnd() - 0.5) * 0.9, l = c * (0.06 + rnd() * 0.1);
          gc.strokeStyle = pal.fios[i % 2]; gc.beginPath(); gc.moveTo(x, y); gc.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); gc.stroke();
        }
      }
      gc.globalAlpha = 1;
    }
    // (sem o chão: o resto começa com o mesmo estado da tela)
    if (op.semChao) { const t = Encontro.motor.telinha(); Object.assign(g, { lineCap: t.lineCap, lineWidth: t.lineWidth, globalAlpha: 1, strokeStyle: t.strokeStyle, fillStyle: t.fillStyle }); }
    // (com o recorte: tudo, menos as árvores, só dentro do retângulo da vila)
    if (op.recorte) { g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip(); }
    const linha = pts => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); };
    // (lote 7) os quintais atrás das casas (num sorteio à parte: o resto do desenho fica igual)
    { const rq2 = mulberry((p.seed ^ 0x3c6ef372) >>> 0 || 3); for (const q of p.quintais || []) Estilos.quintal(g, q, c, rq2); }
    // o rio (por baixo das ruas: a ponte passa por cima; lote 14, parte 14c — com o recorte, o rio fica dentro do
    // retângulo: o anel dos arredores o continua da beira para fora, sem emenda; o lago passa da beira)
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
      // (lote 8) o afluente, do mesmo jeito, e o lago
      if (p.afluente) {
        const pa = p.afluente.pts, ha = p.afluente.hw;
        g.lineCap = 'butt';
        linha(pa); g.strokeStyle = pal.margem; g.lineWidth = (ha * 2 + 0.7) * c; g.stroke();
        linha(pa); g.strokeStyle = pal.agua[0]; g.lineWidth = ha * 2 * c; g.stroke();
        linha(pa); g.strokeStyle = pal.agua[1]; g.lineWidth = ha * 1.3 * c; g.stroke();
      }
    }
    if (op.recorte) g.restore();
    if (p.rio && p.lago) Paisagem.lago(g, p.lago, c, rnd, p.terreno, 'agua');
    if (op.recorte) { g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip(); }
    // (lote 8) as pedras do relevo natural, em grupos
    if (p.pedras && p.pedras.length) { const cp = Paisagem.pedraDe(p.terreno === 'areia' ? 'areia' : p.terreno === 'neve' ? 'neve' : p.terreno === 'floresta' ? 'floresta' : 'campo'); for (const q of p.pedras) Paisagem.pedra(g, q.x, q.y, q.r, c, rnd, cp); }
    // as ruas (com as cores do estilo) e a praça
    const corRua = Estilos.corDaRua(est, pal);
    g.lineJoin = 'round'; g.lineCap = 'butt';
    for (const ru of p.ruas) {
      linha(ru.pts); g.strokeStyle = corRua[0]; g.lineWidth = (ru.hw * 2 + 0.35) * c; g.stroke();
      linha(ru.pts); g.strokeStyle = corRua[1]; g.lineWidth = ru.hw * 2 * c; g.stroke();
      g.globalAlpha = 0.45; linha(ru.pts); g.strokeStyle = corRua[2]; g.lineWidth = ru.hw * 0.9 * c; g.stroke(); g.globalAlpha = 1;
      g.globalAlpha = 0.18; g.strokeStyle = '#2a2116'; g.lineWidth = Math.max(1, c * 0.04);
      for (const off of [-0.35, 0.35]) { g.save(); g.translate(0, off * ru.hw * c); linha(ru.pts); g.stroke(); g.restore(); }
      g.globalAlpha = 1;
    }
    Estilos.praca(g, p.praca, c, rnd, est);
    // (lote 7) o píer de madeira na beira do rio
    if (p.pier) {
      const q = p.pier;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(q.x * c + c * 0.08, q.y * c + c * 0.1, q.w * c, q.h * c);
      g.fillStyle = '#5b3f22'; g.fillRect(q.x * c, q.y * c, q.w * c, q.h * c);
      g.fillStyle = '#8a6238'; for (let s2 = 0; s2 < 4; s2++) g.fillRect(q.x * c + s2 * 0.35 * c + 1, (q.y + 0.06) * c, 0.3 * c - 2, (q.h - 0.12) * c);
      g.fillStyle = '#2e1f10'; for (const [px, py] of [[q.x, q.y], [q.x + q.w, q.y], [q.x, q.y + q.h], [q.x + q.w, q.y + q.h]]) { g.beginPath(); g.arc(px * c, py * c, c * 0.09, 0, Math.PI * 2); g.fill(); }
    }
    for (const b of p.pontes || (p.ponte ? [p.ponte] : [])) {
      g.save(); g.translate(b.x * c, b.y * c); g.rotate(b.ang);
      const L = b.comp * c, Wd = b.larg * c, pedra = est === 'anao' || est === 'desertico';
      g.fillStyle = pedra ? '#4b4f57' : '#5b3f22'; g.fillRect(-L / 2 - c * 0.1, -Wd / 2 - c * 0.1, L + c * 0.2, Wd + c * 0.2);
      for (let x = -L / 2; x < L / 2; x += c * 0.33) {
        const s = rnd();
        g.fillStyle = pedra ? (s < 0.5 ? '#7d828c' : '#6b7079') : s < 0.33 ? '#8a6238' : s < 0.66 ? '#7c5631' : '#946b3f';
        g.fillRect(x + 1, -Wd / 2, c * 0.33 - 2, Wd);
      }
      g.fillStyle = est === 'oriental' ? '#a8302a' : pedra ? '#3d4148' : '#3d2914'; g.fillRect(-L / 2, -Wd / 2 - c * 0.12, L, c * 0.14); g.fillRect(-L / 2, Wd / 2 - c * 0.02, L, c * 0.14);
      g.restore();
    }
    // as casas: a sombra, o piso (na forma da casa), a sombra das paredes de dentro, as paredes pintadas e o enfeite do estilo
    for (const k of p.casas) {
      const def = TP[k.tipo] || TP.casa, cont = Estilos.contorno(k);
      const caminho = () => { g.beginPath(); cont.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); g.closePath(); };
      g.save(); g.translate(c * 0.1, c * 0.12); g.fillStyle = 'rgba(0,0,0,.32)'; caminho(); g.fill(); g.restore();
      g.save(); caminho(); g.clip();
      Estilos.piso(g, k, c, rnd, def.piso);
      const gr = g.createLinearGradient(0, k.y * c, 0, k.y * c + c * 0.35); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(k.x * c, k.y * c, k.w * c, c * 0.35);
      g.restore();
      Estilos.paredesPintadas(g, k, c, rnd, est);
      Estilos.enfeiteDaCasa(g, k, c, rnd, est, def);
    }
    // a paliçada: troncos lado a lado (os portões e a água ficam de fora); nos anões e no deserto, pedra
    if (p.muro) {
      const m = p.muro, pedra = est === 'anao' || est === 'desertico';
      const tronco = (x, y) => {
        g.fillStyle = pedra ? '#3d4148' : '#3b2814'; g.beginPath(); g.arc(x, y, c * 0.24, 0, TAU2); g.fill();
        g.fillStyle = pedra ? (rnd() < 0.5 ? '#7d828c' : '#6b7079') : rnd() < 0.5 ? '#7a5532' : '#6b4a2b'; g.beginPath(); g.arc(x, y, c * 0.18, 0, TAU2); g.fill();
        g.fillStyle = 'rgba(255,230,180,.18)'; g.beginPath(); g.arc(x - c * 0.05, y - c * 0.05, c * 0.07, 0, TAU2); g.fill();
      };
      const passo = 0.42;
      if (m.pecas) {
        // (lote 8) pelo contorno: um tronco a cada passo, ao longo de cada pedaço de muro (dobrando os cantos)
        for (const pc of m.pecas) if (pc.k === 'wall') {
          let falta = 0.21;
          for (let i = 1; i < pc.pts.length; i++) {
            const [ax, ay] = pc.pts[i - 1], [bx, by] = pc.pts[i], L = Math.hypot(bx - ax, by - ay);
            let t = falta;
            for (; t < L; t += passo) tronco((ax + (bx - ax) * t / L) * c, (ay + (by - ay) * t / L) * c);
            falta = t - L;
          }
        }
      } else {
        for (const [a, b] of m.lados.n) for (let t = a + 0.21; t < b; t += passo) tronco(t * c, m.y1 * c);
        for (const [a, b] of m.lados.s) for (let t = a + 0.21; t < b; t += passo) tronco(t * c, m.y2 * c);
        for (const [a, b] of m.lados.o) for (let t = a + 0.21; t < b; t += passo) tronco(m.x1 * c, t * c);
        for (const [a, b] of m.lados.l) for (let t = a + 0.21; t < b; t += passo) tronco(m.x2 * c, t * c);
      }
    }
    if (op.recorte) g.restore();
    for (const a of p.arvores) Estilos.arvore(g, a, c, rnd, p.especie || 'folhosa', pal, p.terreno === 'neve');
    g.globalAlpha = 1;
    // um escurecido de leve nas bordas
    if (!op.semVinheta) {
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.22)');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    }
    if (op.g) g.restore();
    return cv;
  }

  /* ================= a cena ================= */
  const nomePadrao = p => (p.tamanho === 'vila' ? 'Vila' : 'Aldeia') + (Estilos.ADJ[p.estilo] ? ' ' + Estilos.ADJ[p.estilo] : '');
  /* Monta a cena do plano: o fundo, as paredes, a porta e as janelas de cada casa, os móveis, a praça e a muralha. ex:
     { hora, clima } — a hora do dia e o clima da cena; à noite (e no breu), uma luz por dentro de cada casa. */
  async function criar(p, nome, ex) {
    const sc = newScene(String(nome || '').trim().slice(0, 60) || nomePadrao(p));
    if (ex && typeof ex.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(ex.id) && !Store.S.scenes[ex.id]) sc.id = ex.id;   // (o id que o Mapa-múndi já ligou ao marcador)
    sc.cols = p.W; sc.rows = p.H;
    const c = sc.cell;
    sc.fog.dynamic = true; sc.fog.explored = true;      // as paredes das casas escondem o que está lá dentro
    const tom = TONES.find(t => t.id === (ex && ex.hora)) || TONES[0];
    sc.tone = tom.id; sc.light = tom.light;
    sc.weather = { k: WEATHERS.some(w => w[0] === (ex && ex.clima)) ? ex.clima : '', pow: 0.6 };
    sc.bgColor = (PAL[p.terreno] || PAL.campo).base;
    try { const cv = pintar(p, c); const a = await Assets.fromCanvas(cv, 'bg', sc.name); sc.bg.asset = a.id; } catch (e) { console.error(e); }
    montar(sc, p, c, ex);
    normalizeScene(sc);
    Store.addScene(sc); Persist.scene(sc.id); Persist.meta();
    return sc;
  }
  /* (lote 14, parte 14c: à parte — os arredores montam a vila numa cena de rascunho e a deslocam) As paredes, as portas
     e as janelas de cada casa, os móveis, a luz de dentro à noite (sc.tone), a muralha, o poço, os lampiões, os enfeites,
     o relevo e as formas. */
  function montar(sc, p, c, ex) {
    const parede = (x1, y1, x2, y2, k, extra) => sc.walls.push(Object.assign({ id: uid('wl'), k: k || 'wall', x1: x1 * c, y1: y1 * c, x2: x2 * c, y2: y2 * c, open: false, locked: false }, extra || null));
    const noite = sc.tone === 'noite' || sc.tone === 'breu';
    for (const k of p.casas) {
      for (const s of Estilos.paredesDaCasa(k)) parede(s.x1, s.y1, s.x2, s.y2, s.k);
      // o tapete vai primeiro (fica por baixo dos outros móveis)
      const ms = k.moveis.slice().sort((a, b) => (a.id === 'tapete' ? 0 : 1) - (b.id === 'tapete' ? 0 : 1));
      for (const mv of ms) if (Props.P[mv.id]) sc.tokens.push(Props.novo(sc, mv.id, mv.x * c, mv.y * c, mv.s, false));
      if (noite) sc.lights.push({ id: uid('lz'), name: 'Luz da casa', x: (k.x + k.w / 2) * c, y: (k.y + k.h / 2) * c, bright: 1.5, dim: Math.max(3, Math.round(Math.max(k.w, k.h) * 0.9)), c: '#ffc77a', on: true, fl: true });
    }
    if (p.muro) {
      const m = p.muro;
      if (m.pecas) { for (const pc of m.pecas) if (pc.k === 'wall') for (let i = 1; i < pc.pts.length; i++) parede(pc.pts[i - 1][0], pc.pts[i - 1][1], pc.pts[i][0], pc.pts[i][1]); }
      else {
        for (const [a, b] of m.lados.n) parede(a, m.y1, b, m.y1);
        for (const [a, b] of m.lados.s) parede(a, m.y2, b, m.y2);
        for (const [a, b] of m.lados.o) parede(m.x1, a, m.x1, b);
        for (const [a, b] of m.lados.l) parede(m.x2, a, m.x2, b);
      }
      for (const g of m.portoes) parede(g.x1, g.y1, g.x2, g.y2, 'door', { open: true });
    }
    if (Props.P.poco) sc.tokens.push(Props.novo(sc, 'poco', p.poco.x * c, p.poco.y * c, 1, false));
    const poste = Props.P[p.poste] ? p.poste : 'lampiao';
    for (const l of p.lampioes) sc.tokens.push(Props.novo(sc, poste, l.x * c, l.y * c, 1, false));
    for (const e of p.enfeites) if (Props.P[e.id]) sc.tokens.push(Props.novo(sc, e.id, e.x * c, e.y * c, e.s, false));
    // (lote 7) o relevo (com a altura) e as formas de enfeite (travadas: arte de fundo)
    if (!ex || ex.relevo !== false) {
      for (const r of p.relevo || []) sc.shapes.push(Estilos.terrenoNaCena(r, c, 0, 0));
      for (const f of p.formas || []) sc.shapes.push(Estilos.formaNaCena(f, c, 0, 0));
    }
  }

  /* ================= a prévia ================= */
  // O resumo do plano, embaixo da prévia.
  function resumo(p) {
    const n = p.casas.length, moveis = p.casas.reduce((s, k) => s + k.moveis.length, 0);
    return `${n} ${n === 1 ? 'casa' : 'casas'}` + (n < p.pedidas ? ` (couberam ${n} das ${p.pedidas}${p.pontes && n < p.pedidas / 2 ? ': pouco lugar — tente "Gerar outro"' + (p.tamanho === 'aldeia' ? ' ou a Vila, maior' : '') : ''})` : '') + ` · ${moveis} móveis · ${p.W} × ${p.H} quadrados` + (p.rio ? (p.pontes ? textoDoRio(p) : ' · rio com ponte') : '') +
      (p.muro ? ' · paliçada' + ({ oct: ' em octógono', redonda: ' redonda', irregular: ' irregular' }[p.muro.forma] || '') + ' com ' + nPortoes(p.muro) + (p.muro.pecas && nPortoes(p.muro) === 1 ? ' portão' : ' portões') : '') + '.';
  }
  // quantos portões a paliçada tem (lote 8: pelo contorno, cada vão conta um, mesmo dobrando um canto)
  const nPortoes = m => (m.pecas ? m.pecas.filter(pc => pc.k === 'door').length : m.portoes.length);
  // A prévia: o fundo pintado e, por cima, as paredes, as portas (azul), as janelas (ciano) e os móveis (pontinhos).
  function previa(cv, p, maxW, maxH, op) {
    const cell = Math.max(6, Math.floor(Math.min((maxW || 420) / p.W, (maxH || 300) / p.H)));
    const fundo = pintar(p, cell);
    cv.width = fundo.width; cv.height = fundo.height;
    const g = cv.getContext('2d');
    g.drawImage(fundo, 0, 0);
    previaSobre(g, p, cell, op);
    return { cell };
  }
  // (lote 14, parte 14c: o que vai por cima do fundo na prévia, à parte)
  function previaSobre(g, p, cell, op) {
    if (!op || op.relevo !== false) Estilos.relevoNaPrevia(g, p.relevo, p.formas, cell, 1.5);
    g.lineCap = 'round';
    const seg = (s, cor, w) => { g.strokeStyle = cor; g.lineWidth = w; g.beginPath(); g.moveTo(s.x1 * cell, s.y1 * cell); g.lineTo(s.x2 * cell, s.y2 * cell); g.stroke(); };
    for (const k of p.casas) {
      for (const s of Estilos.paredesDaCasa(k)) seg(s, s.k === 'door' ? '#7fd1ff' : s.k === 'window' ? '#bff3ff' : '#1b1612', Math.max(2, cell * (s.k === 'wall' ? 0.22 : 0.24)));
      g.fillStyle = '#f3ead2';
      for (const mv of k.moveis) { g.beginPath(); g.arc((mv.x + mv.s / 2) * cell, (mv.y + mv.s / 2) * cell, Math.max(1.5, cell * 0.18 * mv.s), 0, Math.PI * 2); g.fill(); }
    }
    if (p.muro) for (const gt of p.muro.portoes) seg(gt, '#7fd1ff', Math.max(2, cell * 0.2));
  }

  /* ================= o lugar, para a janela do gerador ================= */
  // As escolhas do vilarejo (lembradas entre uma janela e outra) e os controles delas.
  function padrao() {
    const o = App.opt;
    const st = { tamanho: TAMANHOS[o.vilaTam] ? o.vilaTam : 'aldeia', terreno: TERRENOS_V.some(x => x[0] === o.vilaTer) ? o.vilaTer : 'campo', rio: o.vilaRio != null ? !!o.vilaRio : true, muralha: !!o.vilaMuro, casas: 0,
      t: Tracado.limpar(o.vilaTracado) };                                         // (lote 8) o traçado (a seção "Traçado")
    st.casas = TAMANHOS[st.tamanho].padrao;
    return st;
  }
  const lembrar = st => { App.opt.vilaTam = st.tamanho; App.opt.vilaTer = st.terreno; App.opt.vilaRio = st.rio; App.opt.vilaMuro = st.muralha; App.opt.vilaTracado = Tracado.soMudadas(st.t || Tracado.padrao()); };
  // os controles: mudou(true) sorteia o plano de novo (mesma semente); soltar() avisa que as partes travadas saíram
  // (lote 14, parte 14c: ctx.hex — com os arredores, o rio e os portões vêm do hexágono do Mapa-múndi: a nota no lugar da rosa)
  function controles(st, K, mudou, ctx) {
    const { field, seg, toggle, stepper } = K, T = TAMANHOS[st.tamanho];
    return h('div', { class: 'ger-c' },
      h('div', { class: 'ger-l' },
        field('Tamanho', seg('vila-tam', st.tamanho, Object.keys(TAMANHOS).map(k => [k, TAMANHOS[k].n, null, k === 'aldeia' ? 'Uma rua, ' + TAMANHOS.aldeia.W + ' × ' + TAMANHOS.aldeia.H + ' quadrados' : 'Duas ruas que se cruzam na praça, ' + TAMANHOS.vila.W + ' × ' + TAMANHOS.vila.H + ' quadrados']),
          v => { st.tamanho = v; st.casas = TAMANHOS[v].padrao; lembrar(st); mudou(true, { soltar: true }); }), 'stack'),
        field('Terreno', seg('vila-ter', st.terreno, TERRENOS_V.map(([k, n]) => [k, n]), v => { st.terreno = v; lembrar(st); mudou(true); }), 'stack')),
      h('div', { class: 'ger-l' },
        field('Casas', stepper('vila-casas', st.casas, T.casas[0], T.casas[1], v => { st.casas = v; mudou(true); }, 'Quantas casas'), 'stack'),
        toggle('vila-rio', st.rio, v => { st.rio = v; lembrar(st); mudou(true); }, 'Com rio (e uma ponte)'),
        toggle('vila-muro', st.muralha, v => { st.muralha = v; lembrar(st); mudou(true); }, 'Com paliçada (portões abertos)')),
      // (lote 8) o traçado: os portões na rosa, a forma da paliçada, o rio, a praça, as pontes e o relevo natural
      Tracado.secao(st.t || (st.t = Tracado.padrao()), K, () => { lembrar(st); mudou(true); }, Object.assign({ pre: 'vila', portoes: 'Portões',
        muro: { nome: 'Paliçada', formas: [['ret', 'Retângulo'], ['oct', 'Octógono'], ['redonda', 'Redonda'], ['irregular', 'Irregular']], ligada: !!st.muralha, padraoLigada: false, ligar: v => { st.muralha = v; } },
        rio: st.rio ? true : false, praca: true, pontes: true }, Arredores.notasHex(ctx, !!st.rio))));
  }
  // as escolhas que vão num modelo, e de volta (o que não fizer sentido fica como está)
  const opcoesDe = st => Object.assign({ tamanho: st.tamanho, terreno: st.terreno, rio: !!st.rio, muralha: !!st.muralha, casas: st.casas }, Tracado.soMudadas(st.t || Tracado.padrao()));
  function aplicarOpcoes(st, o) {
    if (TAMANHOS[o.tamanho]) st.tamanho = o.tamanho;
    if (TERRENOS_V.some(x => x[0] === o.terreno)) st.terreno = o.terreno;
    if (typeof o.rio === 'boolean') st.rio = o.rio;
    if (typeof o.muralha === 'boolean') st.muralha = o.muralha;
    const T = TAMANHOS[st.tamanho];
    st.casas = clamp(Math.round(Number(o.casas) || T.padrao), T.casas[0], T.casas[1]);
    st.t = Tracado.limpar(o);                                                       // (lote 8: o traçado do modelo; sem ele, o automático)
    lembrar(st);
  }
  // as partes que travam, na ordem do teclado (as setas da prévia): as ruas e a praça, o rio e cada casa
  const partes = p => ['ruas'].concat(p.rio ? ['rio'] : [], p.casas.map((k, i) => 'c' + i));
  const LUGAR = { id: 'vila', n: 'Vilarejo', padrao, controles, opcoesDe, aplicarOpcoes, gerar: (st, comum) => gerar(Object.assign({}, st, Tracado.soMudadas(st.t || Tracado.padrao()), comum)), previa, resumo, partes, parteEm, nomeDaParte, formaDaParte, travada, alternar, quantasTravadas, baseDe, travaDe, nomePadrao, criar,
    nota: 'Sai uma cena nova, com as paredes de cada casa, a porta, as janelas e alguns móveis — nada escrito: os nomes ficam com você. A névoa dinâmica vem ligada: as paredes bloqueiam a visão, e os jogadores enxergam a partir dos tokens deles. À noite, cada casa tem uma luz por dentro, que escapa pelas janelas. Tudo continua editável; as cenas que já existem não mudam.',
    feito: (sc, p) => `"${sc.name}" criada: ${p.casas.length} ${p.casas.length === 1 ? 'casa' : 'casas'}, com paredes, portas, janelas e móveis. Tudo é editável.` };
  // (o atalho de antes: abre a janela do gerador no vilarejo)
  const abrir = () => Gerador.abrir('vila');
  return { TAMANHOS, TERRENOS_V, PAL, gerar, pintar, criar, montar, previa, previaSobre, resumo, parteEm, formaDaParte, alternar, travada, travaDe, limparTrava, nomePadrao, janelasDe, mobiliar, LUGAR, abrir };
})();
