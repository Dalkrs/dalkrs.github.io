// Lote 14, parte 14a: a cena que nasce do hexágono do Mapa-múndi (a página das Cenas sozinha, no navegador; os pedidos
// vêm do núcleo do Mapa-múndi, mundo/nucleo.js, num mundinho de teste).
//   · (SO=motor) o pedido conferido (o que não presta sai; os limites); os lados de cada orientação; o par (a mesma
//     semente dos dois lados); o chão: os vizinhos de outro bioma entram pelas bordas deles (e só até a fundura da
//     Mistura), a água do vizinho também, os de mesmo bioma não; o ENCAIXE do chão — na linha entre dois hexágonos, a
//     cena de cá e a de lá (de tamanhos diferentes) nunca se contradizem; as pontas do rio e dos caminhos (o lado, o
//     ponto de fora); a frase;
//   · (SO=regiao) a Região livre no hexágono: o chão dos vizinhos, a água deles (o mar, com a praia), o rio do mapa pelas
//     pontas exatas (até a água, quando acaba nela), os caminhos do mapa pelas pontas, os patamares longe da borda; sem
//     rio no mapa, a Água escolhida; o encaixe do rio e da estrada entre duas Regiões vizinhas; sem o hexágono, o plano
//     de sempre;
//   · (SO=encontro) o Encontro no hexágono: o chão novo (mesmo no modelo de antes), os vizinhos do mapa, o rio do mapa no
//     lugar do da situação, o caminho da situação com as pontas nos pontos do mapa (e os que sobram juntando nele), a água
//     dos vizinhos fora do que a situação põe; no pântano e na água, como sempre; sem o hexágono, o plano de sempre;
//   · (SO=janela) a janela vinda do Mapa-múndi: a chave no alto, com a frase; o Encontro e a Região livre preenchidos
//     (sem mexer no que a janela lembra); as notas no Traçado, na Água e no Caminho; desligar a chave; o pântano, o
//     hexágono de água e o sem terreno; o modelo não guarda o hexágono; a cena criada;
//   · (SO=robusto) pedidos sorteados (vizinhos, rios e caminhos à toa), nos dois lugares: sem erro e rápido.
// FOTOS=<pasta> guarda capturas.
const path = require('path'), fs = require('fs');
const { open } = require('./lib');
const N = require(path.join(__dirname, '..', '..', '..', 'mundo', 'nucleo.js'));
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;

// o mundinho: 5×5 hexágonos de floresta em volta do 0,0, com água a nordeste, campo a leste, montanha a sudoeste e
// savana ao sul; um rio do oeste que deságua na água, uma estrada do sudoeste ao leste e uma trilha do norte que acaba
// no 0,0 (e uma rota em cima da estrada)
function mundo(orient) {
  const m = N.normalizarMapa(N.mapaNovo('Teste 14a'));
  m.id = 'mp_teste14a'; m.grade.tam = 60; m.grade.orient = orient; m.grade.x = 0; m.grade.y = 0;
  for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) m.hexes[q + ',' + r] = 'fl';
  for (const k of ['1,-1', '2,-2', '2,-1', '1,-2', '0,-2', '3,-2']) m.hexes[k] = 'ag';
  for (const k of ['1,0', '2,0', '1,1', '3,-1', '2,1']) m.hexes[k] = 'pl';
  for (const k of ['-1,1', '-2,1', '-1,2', '-2,2']) m.hexes[k] = 'mo';
  for (const k of ['0,1', '0,2', '1,2']) m.hexes[k] = 'sv';
  const c = (q, r) => N.centroHex(m, q, r);
  m.objs.push(Object.assign(N.objNovo('l', { pts: [c(-3, 0), c(-2, 0), c(-1, 0), c(0, 0), c(1, -1)].map((p, i) => [p.x + [0, 9, -7, 6, 0][i], p.y + [0, -8, 10, -5, 0][i]]) }), { estilo: 'rio' }));
  const est = [c(-2, 2), c(-1, 1), c(0, 0), c(1, 0), c(3, 0)].map((p, i) => [p.x + [0, 6, 14, -6, 0][i], p.y + [0, -6, 12, 8, 0][i]]);
  m.objs.push(Object.assign(N.objNovo('l', { pts: est }), { estilo: 'estrada' }));
  m.objs.push(Object.assign(N.objNovo('l', { pts: [c(-1, -2), c(-1, -1), c(0, 0)].map((p, i) => [p.x + [0, 4, -10][i], p.y + [0, 5, -8][i]]) }), { estilo: 'trilha' }));
  m.objs.push(Object.assign(N.objNovo('t', { pts: est }), { via: 'estrada' }));
  const mm = N.normalizarMapa(m), out = {};
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) out[q + ',' + r] = N.hexParaCena(mm, q, r);
  return out;
}
const PE = mundo('pe'), DT = mundo('deitado');
// pedidos sorteados (para o robusto)
function sorteados(k) {
  let s = 1234 + k * 977; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const bios = ['floresta', 'campo', 'montanha', 'deserto', 'neve', 'savana', 'tundra', 'selva', 'corrompida', 'lava', 'cristais', 'pantano', 'agua', null];
  const out = [];
  for (let i = 0; i < 40; i++) {
    const orient = r() < 0.5 ? 'pe' : 'deitado', dirs = orient === 'pe' ? ['l', 'ne', 'no', 'o', 'so', 'se'] : ['se', 'ne', 'n', 'no', 'so', 's'], viz = {};
    for (const d of dirs) viz[d] = bios[Math.floor(r() * bios.length)];
    const borda = () => { const l = Math.floor(r() * 4), t = Math.round(r() * 1e4) / 1e4; return l === 0 ? [t, 0] : l === 1 ? [1, t] : l === 2 ? [t, 1] : [0, t]; };
    const dentro = () => [Math.round((0.1 + r() * 0.8) * 1e4) / 1e4, Math.round((0.1 + r() * 0.8) * 1e4) / 1e4];
    const peca = t => { const a = r() < 0.85, b = r() < 0.85, p = { pts: [a ? borda() : dentro(), dentro(), b ? borda() : dentro()], ini: a, fim: b }; if (t) p.t = t; return p; };
    out.push({ q: Math.floor(r() * 20) - 10, r: Math.floor(r() * 20) - 10, orient, sem: 1 + Math.floor(r() * 1e9), ter: ['floresta', 'campo', 'montanha', 'savana', 'neve', 'deserto'][Math.floor(r() * 6)], nome: 'X', viz,
      rios: Array.from({ length: Math.floor(r() * 3) }, () => peca(null)), caminhos: Array.from({ length: Math.floor(r() * 4) }, () => peca(r() < 0.5 ? 'estrada' : 'trilha')) });
  }
  return out;
}

(async () => {
  const t = await open({ w: 1360, h: 900 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const j = JSON.stringify;
  const foto = async (nome, clip) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot(Object.assign({ path: path.join(SHOTS, nome + '.png') }, clip ? { clip } : {})); } };
  const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);

  // ================= o motor =================
  if (parte('motor')) {
    const r = await ev(({ PE, DT }) => {
      const u = __tc, X = u.HexCena, B = u.Biomas, out = {};
      // o pedido conferido
      out.nulos = [X.valida(null), X.valida({}), X.valida({ q: 1.5, r: 0 }), X.valida({ q: 'a', r: 0 })].map(v => v === null);
      const v = X.valida({ q: 3, r: -2, orient: 'x', sem: -5, ter: 'nada', nome: '  Floresta funda  ', viz: { l: 'campo', ne: 'agua', no: 'lixo', o: 7 }, rios: [{ pts: [[0, 0.5], [2, -1], [0.3, 0.3]], ini: true, fim: 'sim' }, { pts: [[0, 0]] }, 'x'], caminhos: Array.from({ length: 9 }, () => ({ t: 'rua', pts: [[0, 0.2], [1, 0.3]], ini: true, fim: true })) });
      out.v = { k: v.k, orient: v.orient, sem: v.sem, ter: v.ter, nome: v.nome, viz: v.viz, rios: v.rios, ncam: v.caminhos.length, tcam: v.caminhos[0].t };
      out.aceita = [X.aceita(X.valida(PE['0,0'])), X.aceita(X.valida(PE['1,-1'])), X.aceita(X.valida(Object.assign({}, PE['0,0'], { ter: null }))), X.aceita(null)];
      // os lados: cada orientação cobre os quatro lados do mapa, sem sobrar
      out.lados = {};
      for (const o of ['pe', 'deitado']) { const c = { n: 0, s: 0, o: 0, l: 0 }; for (const L of X.LADOS[o]) c[L.l] += L.b - L.a; out.lados[o] = [X.LADOS[o].map(L => L.d).join(','), c]; }
      // o par: a mesma semente dos dois lados, e um é o primeiro
      const h0 = X.valida(PE['0,0']), h1 = X.valida(PE['1,0']), hn = X.valida(PE['1,-1']);
      const a = X.doPar(h0, 'l'), b = X.doPar(h1, 'o'), c2 = X.doPar(h0, 'ne'), d2 = X.doPar(hn, 'so');
      out.par = [a.s === b.s, a.primeiro !== b.primeiro, c2.s === d2.s, a.s !== c2.s];
      // o chão: os vizinhos de outro bioma entram pelas bordas deles, até a fundura; a água; os de mesmo bioma não
      const W = 40, H = 30, M = X.mapa(W, H, h0, 'floresta', 'media'), bioDe = q => B.LISTA[M.bio[q]].id;
      out.vizs = M.vizs.slice().sort(); out.temAgua = M.temAgua;
      let longe = 0, foraDoLado = 0, aguaFora = 0, nAgua = 0;
      const distLado = (l, i, j2) => (l === 'n' ? j2 + 0.5 : l === 's' ? H - j2 - 0.5 : l === 'o' ? i + 0.5 : W - i - 0.5);
      for (let q = 0; q < W * H; q++) {
        const i = q % W, j2 = (q - i) / W, id = bioDe(q);
        if (M.agua[q]) { nAgua++; const L = X.LADOS.pe.find(x => x.d === 'ne'); if (distLado(L.l, i, j2) > M.D * 1.25 + 0.6 || (i + 0.5) / W < L.a - 0.02) aguaFora++; continue; }
        if (id === 'floresta') continue;
        // o lado (ou os lados) cujo vizinho é deste bioma
        const Ls = X.LADOS.pe.filter(x => h0.viz[x.d] === id);
        if (!Ls.length) { foraDoLado++; continue; }
        const dm = Math.min(...Ls.map(L => distLado(L.l, i, j2)));
        if (dm > M.D + 0.6) longe++;
      }
      out.chao = { longe, foraDoLado, aguaFora, nAgua, D: M.D };
      // a Mistura: muita entra mais que pouca
      const conta = mi => { const M2 = X.mapa(W, H, h0, 'floresta', mi); let k = 0; for (let q = 0; q < W * H; q++) if (M2.agua[q] || B.LISTA[M2.bio[q]].id !== 'floresta') k++; return k; };
      out.mistura = [conta('pouca'), conta('media'), conta('muita')];
      // o vizinho de mesmo bioma não entra (a floresta nos lados de floresta): só os outros
      const iguais = X.mapa(W, H, Object.assign({}, h0, { viz: { no: 'floresta', ne: 'floresta', l: 'floresta', se: 'floresta', so: 'floresta', o: 'floresta' } }), 'floresta', 'muita');
      out.iguais = [iguais.vizs.length, iguais.temAgua, Array.from(iguais.bio).every(x => x === B.IDX.floresta)];
      // o ENCAIXE do chão: na linha entre dois hexágonos (cada um com o seu tamanho), nunca "lá é de cá e cá é de lá"
      const encaixe = (HX, k1, k2, d, W1, H1, W2, H2) => {
        const A = X.valida(HX[k1]), Bh = X.valida(HX[k2]), MA = X.mapa(W1, H1, A, A.ter, 'muita'), MB = X.mapa(W2, H2, Bh, Bh.ter, 'muita');
        const LA = X.LADOS[A.orient].find(x => x.d === d), op = { n: 's', s: 'n', l: 'o', o: 'l', ne: 'so', so: 'ne', no: 'se', se: 'no' }[d], LB = X.LADOS[A.orient].find(x => x.d === op);
        // (o mesmo ponto do mundo nos dois: pela posição no mundo, em raios de hexágono)
        const [cxA, cyA] = X.centro(A.orient, A.q, A.r), [cxB, cyB] = X.centro(A.orient, Bh.q, Bh.r), [tw, th] = X.tijolo(A.orient);
        const deitado = LA.l === 'n' || LA.l === 's';
        let contra = 0, cA = 0, cB = 0, amostras = 0;
        // (no meio de cada casa da borda de cá)
        const nA = deitado ? W1 : H1;
        for (let k = Math.ceil(LA.a * nA); k < LA.b * nA; k++) {
          const f = (k + 0.5) / nA, wx = deitado ? cxA - tw / 2 + f * tw : null, wy = deitado ? null : cyA - th / 2 + f * th;
          const fB = deitado ? (wx - (cxB - tw / 2)) / tw : (wy - (cyB - th / 2)) / th;
          if (fB < LB.a || fB > LB.b) continue;
          amostras++;
          const cel = (L, fr, W0, H0) => { const i = L.l === 'o' ? 0 : L.l === 'l' ? W0 - 1 : Math.min(W0 - 1, Math.floor(fr * W0)), jj = L.l === 'n' ? 0 : L.l === 's' ? H0 - 1 : Math.min(H0 - 1, Math.floor(fr * H0)); return jj * W0 + i; };
          const qa = cel(LA, f, W1, H1), qb = cel(LB, fB, W2, H2);
          const aEhB = B.LISTA[MA.bio[qa]].id === Bh.ter && !MA.agua[qa], bEhA = B.LISTA[MB.bio[qb]].id === A.ter && !MB.agua[qb];
          if (aEhB) cA++; if (bEhA) cB++;
          if (aEhB && bEhA) contra++;
        }
        return { contra, cA, cB, amostras };
      };
      // (do mesmo tamanho, as casas da borda de cá e de lá ficam no mesmo ponto do mundo)
      out.encaixe = [encaixe(PE, '0,0', '1,0', 'l', 40, 30, 40, 30), encaixe(PE, '0,0', '0,1', 'se', 32, 24, 32, 24), encaixe(PE, '0,0', '-1,1', 'so', 40, 30, 40, 30), encaixe(DT, '0,0', '0,1', 's', 48, 36, 48, 36), encaixe(DT, '0,0', '1,0', 'se', 40, 30, 40, 30)];
      // a linha é a mesma conta dos dois lados, com o sinal trocado (em qualquer tamanho: o mundo é o mesmo) — e some nas pontas
      const linha = (HX, k1, k2, d) => {
        const A = X.valida(HX[k1]), Bh = X.valida(HX[k2]), op = { n: 's', s: 'n', l: 'o', o: 'l', ne: 'so', so: 'ne', no: 'se', se: 'no' }[d];
        const SA = X.lados(A, A.ter).find(S => S.L.d === d), SB = X.lados(Bh, Bh.ter).find(S => S.L.d === op);
        if (!SA || !SB) return 'sem linha';
        let pior = 0;
        for (let k = 0; k <= 100; k++) { const tt = SA.t0 + (SA.t1 - SA.t0) * k / 100; pior = Math.max(pior, Math.abs(SA.f(tt) + SB.f(tt))); }
        return [Math.abs(SA.t0 - SB.t0) < 1e-9 && Math.abs(SA.t1 - SB.t1) < 1e-9, pior < 1e-9];
      };
      out.linha = [linha(PE, '0,0', '1,0', 'l'), linha(PE, '0,0', '0,1', 'se'), linha(PE, '0,0', '-1,1', 'so'), linha(DT, '0,0', '0,1', 's'), linha(DT, '0,0', '1,0', 'se'), linha(DT, '0,0', '-1,1', 'so')];
      // as pontas do rio e dos caminhos
      const Ls = X.linhas(h0, 40, 30), rio = Ls.rios[0];
      out.rio = { ini: [rio.ini.borda, rio.ini.lado, rio.ini.fora[0], +rio.ini.y.toFixed(3)], fim: [rio.fim.borda, rio.fim.lado, +rio.fim.fora[1].toFixed(2)], pts: rio.pts.length };
      out.cams = Ls.caminhos.map(c => [c.t, c.ini.borda, c.fim.borda, c.ini.lado || '-', c.fim.lado || '-']);
      // (duas pontas no mesmo lado, perto: viram uma)
      const dup = X.valida(Object.assign({}, PE['0,0'], { caminhos: [{ t: 'estrada', pts: [[0, 0.5], [1, 0.5]], ini: true, fim: true }, { t: 'trilha', pts: [[0, 0.52], [0.5, 1]], ini: true, fim: true }] }));
      const Ld = X.linhas(dup, 40, 30);
      out.junta = [Ld.caminhos[0].ini === Ld.caminhos[1].ini, X.pontasDosCaminhos(Ld).length, X.pontasDosCaminhos(Ld).find(p => p.lado === 'o').t];
      // a linha some nas pontas do lado (a terra); a água, na quina com outra água, não
      const SL = X.lados(h0, 'floresta'), terra = SL.find(S => S.L.d === 'l');
      const duasAguas = X.valida(Object.assign({}, PE['0,0'], { viz: Object.assign({}, PE['0,0'].viz, { l: 'agua' }) })), SA2 = X.lados(duasAguas, 'floresta');
      const ne = SA2.find(S => S.L.d === 'ne'), le = SA2.find(S => S.L.d === 'l');
      out.pontas = [terra.g(terra.t0) === 0 && terra.g(terra.t1) === 0 && Math.abs(terra.g((terra.t0 + terra.t1) / 2)) >= 0, ne.g(ne.t1) > 0.1 && le.g(le.t0) > 0.1, ne.g(ne.t0) === 0];
      // os pedacinhos soltos (menos de cinco casas, longe da borda) não ficam
      let soltos = 0;
      for (const [hh, mi] of [[h0, 'muita'], [X.valida(PE['1,0']), 'muita'], [X.valida(PE['-1,1']), 'media'], [X.valida(DT['0,0']), 'muita'], [duasAguas, 'pouca']]) {
        const M2 = X.mapa(40, 30, hh, hh.ter, mi), cls = q => (M2.agua[q] ? 255 : M2.bio[q]), vis = new Uint8Array(1200);
        for (let q0 = 0; q0 < 1200; q0++) {
          if (vis[q0]) continue;
          const c0 = cls(q0), fila = [q0], cel = []; vis[q0] = 1;
          while (fila.length) { const q = fila.pop(), i = q % 40, jj = (q - i) / 40; cel.push(q); for (const [a2, b2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a2, y = jj + b2; if (x < 0 || y < 0 || x >= 40 || y >= 30) continue; const nq = y * 40 + x; if (!vis[nq] && cls(nq) === c0) { vis[nq] = 1; fila.push(nq); } } }
          if (cel.length < 5 && !cel.some(q => { const i = q % 40, jj = (q - i) / 40; return i === 0 || jj === 0 || i === 39 || jj === 29; })) soltos++;
        }
      }
      out.soltos = soltos;
      // a altura: alta de onde o rio do mapa vem, baixa para onde ele vai
      const Lh = X.linhas(h0, 40, 30), Mh = X.mapa(40, 30, h0, 'floresta', 'media'), rh = X.rioDoMapa(Lh, Mh, 40, 30), alt = X.altura(40, 30, 77, Mh, X.distancia(40, 30, q => Mh.agua[q] === 1), rh, {});
      const media = (x, y) => { let s2 = 0, k = 0; for (let jj = 0; jj < 30; jj++) for (let i = 0; i < 40; i++) if (Math.hypot(i + 0.5 - x, jj + 0.5 - y) < 6) { s2 += alt[jj * 40 + i]; k++; } return s2 / k; };
      out.altura = [+media(rh.pIni.x, rh.pIni.y).toFixed(2), +media(rh.pFim.x, rh.pFim.y).toFixed(2)];
      // (sem a água: só a inclinação do rio — em várias sementes, a entrada mais alta que a saída)
      const seco = X.valida(Object.assign({}, PE['0,0'], { viz: { no: 'floresta', ne: 'floresta', l: 'floresta', se: 'floresta', so: 'floresta', o: 'floresta' }, rios: [{ pts: [[0, 0.5], [1, 0.5]], ini: true, fim: true }] }));
      const Ms = X.mapa(40, 30, seco, 'floresta', 'media'), rs = X.rioDoMapa(X.linhas(seco, 40, 30), Ms, 40, 30);
      let mais = 0;
      for (let sd = 1; sd <= 12; sd++) { const a2 = X.altura(40, 30, sd * 131, Ms, X.distancia(40, 30, () => false), rs, {}); let e = 0, sa = 0; for (let jj = 0; jj < 30; jj++) { for (let i = 0; i < 6; i++) e += a2[jj * 40 + i]; for (let i = 34; i < 40; i++) sa += a2[jj * 40 + i]; } if (e > sa) mais++; }
      out.inclina = mais;
      out.texto = X.texto(h0, 'floresta');
      out.textoDt = X.texto(X.valida(DT['0,0']), 'floresta');
      return out;
    }, { PE, DT });
    ok(r.nulos.every(Boolean), 'o pedido que não presta não vale (sem q e r inteiros)');
    ok(r.v.k === '3,-2' && r.v.orient === 'pe' && r.v.sem >= 1 && r.v.ter === null && r.v.nome === 'Floresta funda' && j(r.v.viz) === j({ no: null, ne: 'agua', l: 'campo', se: null, so: null, o: null }), 'o pedido conferido: a orientação, o número, o bioma que não existe e os vizinhos que não prestam saem: ' + j(r.v));
    ok(r.v.rios.length === 1 && j(r.v.rios[0].pts) === j([[0, 0.5], [1, 0], [0.3, 0.3]]) && r.v.rios[0].ini === true && r.v.rios[0].fim === false && r.v.ncam === 6 && r.v.tcam === 'trilha', 'os pontos de 0 a 1, o pedaço de um ponto só sai, até seis caminhos (o tipo que não existe vira trilha): ' + j(r.v.rios));
    ok(j(r.aceita) === j([true, false, false, false]), 'a cena aceita o hexágono de terra (não o de água, nem o sem terreno): ' + j(r.aceita));
    ok(r.lados.pe[0] === 'no,ne,l,se,so,o' && r.lados.deitado[0] === 'n,ne,se,s,so,no' && Object.values(r.lados.pe[1]).every(x => x === 1) && Object.values(r.lados.deitado[1]).every(x => x === 1), 'os seis vizinhos cobrem os quatro lados do mapa, cada um com o seu pedaço: ' + j(r.lados));
    ok(r.par.every(Boolean), 'o par tem a mesma semente dos dois lados (e um é o primeiro); outro par, outra semente: ' + j(r.par));
    ok(j(r.vizs) === j(['campo', 'montanha', 'savana']) && r.temAgua, 'os vizinhos de outro bioma entram (o campo, a montanha, a savana) e a água também: ' + j(r.vizs));
    ok(r.chao.longe === 0 && r.chao.foraDoLado === 0, 'cada vizinho só pela borda dele, até a fundura da Mistura (' + r.chao.D.toFixed(1) + ' quadrados): ' + j(r.chao));
    ok(r.chao.nAgua > 20 && r.chao.aguaFora === 0, 'a água pela borda dela (a nordeste): ' + j(r.chao));
    ok(r.mistura[0] < r.mistura[1] && r.mistura[1] < r.mistura[2] && r.mistura[0] > 0, 'a Mistura: pouca < média < muita: ' + j(r.mistura));
    ok(j(r.iguais) === j([0, false, true]), 'os vizinhos de mesmo bioma não entram: o chão fica todo do principal');
    ok(r.linha.every(x => Array.isArray(x) && x[0] && x[1]), 'a linha entre dois hexágonos é a mesma conta dos dois lados, com o sinal trocado (o mesmo pedaço do mundo), nas duas orientações: ' + j(r.linha));
    ok(r.encaixe.every(e => e.contra === 0 && e.amostras >= 12) && r.encaixe.every(e => e.cA > 2 && e.cB > 2), 'o ENCAIXE do chão: na linha entre dois hexágonos, as casas da borda de cá e de lá nunca se contradizem, e os dois entram um no outro: ' + j(r.encaixe));
    ok(j(r.rio.ini) === j([true, 'o', -1.5, r.rio.ini[3]]) && r.rio.fim[0] && r.rio.fim[1] === 'n' && r.rio.fim[2] === -1.5, 'as pontas do rio: entra pelo oeste (o ponto de fora, um e meio para fora) e sai por cima: ' + j(r.rio));
    ok(j(r.cams) === j([['estrada', true, true, 's', 'l'], ['trilha', true, false, 'o', '-']]), 'as pontas dos caminhos: a estrada do sul ao leste, a trilha que entra pelo oeste e acaba dentro: ' + j(r.cams));
    ok(r.junta[0] && r.junta[1] === 3 && r.junta[2] === 'estrada', 'duas pontas no mesmo lado, perto, viram uma (e a estrada vale mais): ' + j(r.junta));
    ok(/^Floresta \(hexágono 0, 0\): água a nordeste, campo a leste, savana a sudeste e montanha a sudoeste; o rio entra pelo oeste e sai pelo nordeste; a estrada vai do sul ao leste e a trilha chega pelo noroeste e acaba aqui\.$/.test(r.texto), 'a frase: ' + r.texto);
    ok(/hexágono 0, 0\): /.test(r.textoDt) && /o rio entra/.test(r.textoDt), 'a frase, deitado: ' + r.textoDt);
    ok(j(r.pontas) === j([true, true, true]), 'a linha some nas pontas do lado (a terra); a água, na quina com outra água, segue (e some onde encosta na terra): ' + j(r.pontas));
    ok(r.soltos === 0, 'sem pedacinhos soltos longe da borda: ' + r.soltos);
    ok(r.altura[0] > r.altura[1] + 0.15, 'o chão é alto de onde o rio vem e baixo para onde ele vai: ' + j(r.altura));
    ok(r.inclina === 12, 'sem água por perto, a inclinação é a do rio: a entrada mais alta que a saída em todas as sementes: ' + r.inclina + '/12');
  }

  // ================= a Região livre =================
  if (parte('regiao')) {
    const r = await ev(({ PE, DT }) => {
      const u = __tc, X = u.HexCena, R = u.Regiao, M = u.Encontro.motor, out = {};
      const op = (h, o) => Object.assign({ bioma: h.ter, agua: 'nenhuma', caminho: 'nenhum', seed: 21, estilo: 'comum' }, o || {}, { hex: h });
      const h0 = PE['0,0'], p = R.gerar(op(h0));
      out.hex = p.hex; out.vizinhos = p.vizinhos.slice().sort(); out.resumo = R.resumo(p);
      // a água dos vizinhos: o mar (com a praia), do lado dela
      const mares = p.aguas.filter(a => a.k === 'lago' && a.tipo === 'mar'), praias = p.pintados.filter(o => o.k === 'praia');
      const cen = pts => { let x = 0, y = 0; for (const q of pts) { x += q[0]; y += q[1]; } return [x / pts.length, y / pts.length]; };
      out.mar = mares.map(m => cen(m.pts).map(v => +v.toFixed(1))); out.praias = praias.length; out.pmar = p.mar;
      // o rio do mapa: as pontas exatas (o ponto de fora e o da borda), e acaba na água
      const L = X.linhas(X.valida(h0), p.W, p.H), rio = p.aguas.filter(a => a.k === 'rio');
      // (o desenho passa pelos pontos: o de fora é o primeiro; o da borda está nele)
      const tem = (pts, q) => pts.some(x => Math.hypot(x[0] - q[0], x[1] - q[1]) < 1e-6);
      out.rio = { n: rio.length, fora: !!rio[0] && tem([rio[0].pts[0]], L.rios[0].ini.fora), borda: !!rio[0] && tem(rio[0].pts, [L.rios[0].ini.x, L.rios[0].ini.y]), destino: p.rios[0] && p.rios[0].destino };
      // os caminhos do mapa pelas pontas: cada ponta da borda tem um caminho passando por ela
      const pontas = X.pontasDosCaminhos(L);
      out.cam = pontas.map(q => p.caminhos.some(c => M.distLinha(c.pts, q.x, q.y) < 0.6 + c.hw) ? 1 : 0);
      out.tipos = p.caminhos.map(c => c.tipo).sort().filter((x, i, a) => a.indexOf(x) === i);
      // os patamares a três quadrados da borda
      const dB = (x, y) => Math.min(x, y, p.W - x, p.H - y);
      out.patamar = p.relevo.filter(x => x.t === 'morro').map(x => Math.min(...x.pts.map(q => dB(q[0], q[1])))).map(v => +v.toFixed(2));
      out.massas = p.massas.map(m => Math.min(...m.pts.map(q => dB(q[0], q[1])))).map(v => +v.toFixed(2));
      // sem rio no mapa: a Água escolhida (o lago, nada); o rio pedido vem pela rosa
      const h2 = Object.assign({}, h0, { rios: [] }), pl = R.gerar(op(h2, { agua: 'lago' })), pn = R.gerar(op(h2, { agua: 'nenhuma' }));
      out.semRio = [pl.aguas.filter(a => a.k === 'lago' && a.tipo !== 'mar').length, pl.aguas.filter(a => a.k === 'rio').length, pn.aguas.filter(a => a.k === 'rio' || (a.k === 'lago' && a.tipo !== 'mar')).length, pl.hex.rioDoMapa];
      // com rio no mapa, a Água escolhida não conta (o rio vem): o mesmo plano
      const pa = R.gerar(op(h0, { agua: 'lago' }));
      const pr2 = R.gerar(op(h0, { agua: 'rio' }));
      out.aguaNaoConta = JSON.stringify([pa.aguas, pa.caminhos, pa.relevo]) === JSON.stringify([pr2.aguas, pr2.caminhos, pr2.relevo]) && pa.agua === 'rio';
      // sem o hexágono (ou com um que não presta, ou de água): o plano de sempre
      const base = { bioma: 'floresta', agua: 'rio', caminho: 'trilha', seed: 21, estilo: 'comum' }, p0 = JSON.stringify(R.gerar(base));
      out.semHex = [JSON.stringify(R.gerar(Object.assign({}, base, { hex: null }))) === p0, JSON.stringify(R.gerar(Object.assign({}, base, { hex: { q: 'x' } }))) === p0, JSON.stringify(R.gerar(Object.assign({}, base, { hex: PE['1,-1'] }))) === p0, !('hex' in JSON.parse(p0))];
      // o encaixe entre duas Regiões vizinhas (de tamanhos diferentes): o rio e a estrada saem de uma e entram na outra
      // pelo mesmo ponto (relativo) do lado
      const encaixe = (HX, k1, k2, t1, t2) => {
        const A = R.gerar(op(HX[k1], { tamanho: t1, seed: 5 })), Bp = R.gerar(op(HX[k2], { tamanho: t2, seed: 6 }));
        // (os pontos do desenho que caem bem na borda: por onde a linha entra e sai)
        const naBorda = (p2, l) => l.flatMap(a => a.pts).filter(q => Math.abs(q[0]) < 1e-6 || Math.abs(q[1]) < 1e-6 || Math.abs(q[0] - p2.W) < 1e-6 || Math.abs(q[1] - p2.H) < 1e-6).map(q => [q[0] / p2.W, q[1] / p2.H]);
        const bordasRio = p2 => naBorda(p2, p2.aguas.filter(a => a.k === 'rio')), bordasCam = p2 => naBorda(p2, p2.caminhos);
        return { rioA: bordasRio(A), rioB: bordasRio(Bp), camA: bordasCam(A), camB: bordasCam(Bp) };
      };
      out.enc = encaixe(PE, '-1,0', '0,0', 'grande', 'medio');
      out.encE = encaixe(PE, '0,0', '1,0', 'medio', 'pequeno');
      out.encD = encaixe(DT, '-1,0', '0,0', 'medio', 'grande');
      // a água do vizinho passa da borda (continua lá fora)
      out.marFora = mares.length > 0 && mares[0].pts.some(q => q[1] < -0.5);
      // o rio que vem da água do vizinho nasce na terra; o que acaba ali dentro, num lago; o que nasce ali, dentro
      const comRio = (rio, viz) => R.gerar(op(Object.assign({}, h0, { rios: [rio], viz: Object.assign({}, h0.viz, viz || {}) }), { seed: 23 }));
      const pDaAgua = comRio({ pts: [[0, 0.5], [0.5, 0.5], [1, 0.6]], ini: true, fim: true }, { o: 'agua' });
      const rA = pDaAgua.aguas.find(a => a.k === 'rio'), dentroA = q => q[0] > 0 && q[1] > 0 && q[0] < pDaAgua.W && q[1] < pDaAgua.H;
      out.daAgua = !!rA && dentroA(rA.pts[0]) && !pDaAgua.aguas.some(a => a.k === 'lago' && a.tipo === 'mar' && M.dentroPoli(a.pts, rA.pts[0][0], rA.pts[0][1]));
      const pAcaba = comRio({ pts: [[0, 0.4], [0.5, 0.5]], ini: true, fim: false });
      out.acaba = [pAcaba.lagos.length, pAcaba.rios[0] && pAcaba.rios[0].destino];
      const pNasce = comRio({ pts: [[0.5, 0.5], [1, 0.4]], ini: false, fim: true }), rN = pNasce.aguas.find(a => a.k === 'rio');
      out.nasce = !!rN && rN.pts[0][0] > 1 && rN.pts[0][0] < pNasce.W - 1 && rN.pts[rN.pts.length - 1][0] > pNasce.W;
      // dois rios no mapa: o segundo é o afluente, do ponto dele
      const pAf = R.gerar(op(Object.assign({}, h0, { rios: [{ pts: [[0, 0.3], [1, 0.4]], ini: true, fim: true }, { pts: [[0.6, 1], [0.6, 0.5]], ini: true, fim: false }], viz: Object.assign({}, h0.viz, { ne: 'floresta' }) }), { seed: 24 }));
      const af = pAf.rios.find(x => x.afluente), afD = pAf.aguas.filter(a => a.k === 'rio')[1];
      out.afluente = !!af && !!afD && afD.pts.some(q => Math.abs(q[0] - 0.6 * pAf.W) < 1e-6 && Math.abs(q[1] - pAf.H) < 1e-6);
      // (o motor, direto: o rio nasce na casa da ponta de entrada, e o afluente na da ponta dele)
      const hAf = X.valida(Object.assign({}, h0, { rios: [{ pts: [[0, 0.3], [1, 0.4]], ini: true, fim: true }, { pts: [[0.6, 1], [0.6, 0.5]], ini: true, fim: false }], viz: Object.assign({}, h0.viz, { ne: 'floresta' }) }));
      const Fh = X.campo(40, 30, 77, { bioma: 'floresta', mistura: 'media', hex: hAf, agua: 'rio', rio: { hw: 1.2, curvas: 4 } }), Lh = X.linhas(hAf, 40, 30);
      out.celulas = [Fh.rios[0] && Fh.rios[0].cel[0] === Lh.rios[0].ini.cel, Fh.rios[1] && Fh.rios[1].cel[0] === Lh.rios[1].ini.cel, Fh.rios[0] && Fh.rios[0].cel[Fh.rios[0].cel.length - 1] === Lh.rios[0].fim.cel];
      // na estação, na história e na seca, o hexágono continua
      const pw = R.gerar(op(h0, { estacao: 'inverno', historia: ['ruinas'], seco: true }));
      out.junto = [!!pw.hex, pw.estacao, (pw.historia || []).length, pw.seco];
      return out;
    }, { PE, DT });
    ok(r.hex && r.hex.k === '0,0' && r.hex.rioDoMapa && r.hex.camDoMapa && r.hex.agua === 1 && r.hex.rios === 1 && r.hex.caminhos === 2, 'a Região no hexágono: o que veio do mapa (o rio, os dois caminhos, a água): ' + j(r.hex));
    ok(j(r.vizinhos) === j(['campo', 'montanha', 'savana']), 'o chão: os vizinhos do mapa nas bordas: ' + j(r.vizinhos));
    ok(r.mar.length === 1 && r.mar[0][0] > 20 && r.mar[0][1] < 8 && r.praias >= 1 && r.pmar && r.pmar.lado === null, 'a água do vizinho (a nordeste): o mar no alto, à direita, com a praia: ' + j([r.mar, r.praias]));
    ok(r.rio.n >= 1 && r.rio.fora && r.rio.borda && r.rio.destino === 'mar', 'o rio do mapa entra pelo ponto exato da borda (e o de fora dele) e acaba na água: ' + j(r.rio));
    ok(r.cam.length === 3 && r.cam.every(Boolean) && j(r.tipos) === j(['estrada', 'trilha']), 'os caminhos do mapa passam pelas pontas deles na borda (as duas da estrada e a da trilha): ' + j([r.cam, r.tipos]));
    ok(r.patamar.every(v => v >= 2) && r.massas.every(v => v >= 2), 'os patamares e os penhascos longe da borda (a borda fica como a do vizinho): ' + j([r.patamar, r.massas]));
    ok(r.semRio[0] === 1 && r.semRio[1] === 0 && r.semRio[2] === 0 && r.semRio[3] === false, 'sem rio no mapa: a Água escolhida (o lago; nada): ' + j(r.semRio));
    ok(r.aguaNaoConta, 'com rio no mapa, a Água escolhida não conta: o rio do mapa vem');
    ok(r.semHex.every(Boolean), 'sem o hexágono (nulo, que não presta, de água): o plano de sempre, sem a chave hex: ' + j(r.semHex));
    // (deitado, o vizinho da direita fica meio tijolo para baixo: desl)
    const casa = (as, bs, eixo, va, vb, desl) => as.filter(a => Math.abs(a[eixo] - va) < 1e-6).every(a => bs.some(b => Math.abs(b[eixo] - vb) < 1e-6 && Math.abs(b[1 - eixo] - (a[1 - eixo] - (desl || 0))) < 2e-3));
    ok(r.enc.rioA.some(a => Math.abs(a[0] - 1) < 1e-6) && casa(r.enc.rioA, r.enc.rioB, 0, 1, 0), 'o ENCAIXE do rio: o que sai do -1,0 (Grande) pelo leste entra no 0,0 (Médio) pelo oeste, no mesmo ponto do lado: ' + j([r.enc.rioA, r.enc.rioB]));
    ok(r.encE.camA.some(a => Math.abs(a[0] - 1) < 1e-6) && casa(r.encE.camA, r.encE.camB, 0, 1, 0), 'o ENCAIXE da estrada: a que sai do 0,0 pelo leste entra no 1,0 (Pequeno) pelo oeste, no mesmo ponto: ' + j([r.encE.camA, r.encE.camB]));
    ok(r.encD.rioA.some(a => Math.abs(a[0] - 1) < 1e-6) && casa(r.encD.rioA.filter(a => a[1] > 0.5), r.encD.rioB, 0, 1, 0, 0.5), 'deitado também (o vizinho de sudeste fica com a metade de baixo do lado direito): ' + j([r.encD.rioA, r.encD.rioB]));
    ok(/do hexágono 0, 0 do Mapa-múndi \(a água dos vizinhos, o rio do mapa e os caminhos do mapa\)/.test(r.resumo), 'o resumo diz o hexágono: ' + r.resumo);
    ok(j(r.junto) === j([true, 'inverno', 1, true]), 'com a estação, a história e a seca, o hexágono continua: ' + j(r.junto));
    ok(r.marFora, 'a água do vizinho passa da borda (continua lá fora)');
    ok(r.daAgua, 'o rio que vem da água do vizinho nasce na terra, ali dentro');
    ok(r.acaba[0] >= 1 && r.acaba[1] === 'lago', 'o rio que acaba ali dentro, no mapa, acaba num lago: ' + j(r.acaba));
    ok(r.nasce, 'o rio que nasce ali dentro começa no meio e sai pela borda');
    ok(r.afluente, 'dois rios no mapa: o segundo é o afluente, do ponto exato dele na borda');
    ok(j(r.celulas) === j([true, true, true]), 'o rio nasce na casa da ponta de entrada e chega na da saída; o afluente nasce na da ponta dele: ' + j(r.celulas));
  }

  // ================= o Encontro =================
  if (parte('encontro')) {
    const r = await ev(({ PE }) => {
      const u = __tc, X = u.HexCena, E = u.Encontro, M = E.motor, out = {};
      const op = (h, o) => Object.assign({ terreno: 'floresta', situacao: 'clareira', caminho: 'trilha', seed: 31, estilo: 'comum' }, o || {}, { hex: h });
      const h0 = PE['0,0'], p = E.gerar(op(h0, { chao: 1 }));
      out.hex = p.hex; out.chao = [p.chaoNovo, p.mistura]; out.vizinhos = p.vizinhos.slice().sort(); out.resumo = E.LUGAR.resumo(p);
      // o rio do mapa pelas pontas exatas (o da situação muda: o riacho)
      const L = X.linhas(X.valida(h0), p.W, p.H), pr = E.gerar(op(h0, { situacao: 'riacho' })), rios = pr.aguas.filter(a => a.k === 'rio');
      const tem = (pts, q) => pts.some(x => Math.hypot(x[0] - q[0], x[1] - q[1]) < 1e-6);
      out.rio = { n: rios.length, fora: !!rios[0] && tem([rios[0].pts[0]], L.rios[0].ini.fora), borda: !!rios[0] && tem(rios[0].pts, [L.rios[0].ini.x, L.rios[0].ini.y]), sit: pr.sit };
      // os caminhos: cada ponta do mapa tem um caminho passando por ela (o da situação, com as pontas trocadas, e os que sobram)
      const pontas = X.pontasDosCaminhos(L);
      const passa = pp => pontas.map(q => pp.caminhos.some(c => M.distLinha(c.pts, q.x, q.y) < 0.6 + c.hw) ? 1 : 0);
      out.cam = passa(p); out.camSem = passa(E.gerar(op(h0, { caminho: 'nenhum' })));
      out.camEstr = passa(E.gerar(op(h0, { terreno: 'estrada', situacao: 'curva', caminho: 'estrada' })));
      // a água dos vizinhos fora do que a situação põe
      const mares = p.aguas.filter(a => a.k === 'lago' && a.tipo === 'mar');
      out.mar = mares.length;
      const casas = E.gerar(op(h0, { terreno: 'campo', situacao: 'moinho' }));
      out.predioNaAgua = casas.predios.filter(k => casas.aguas.some(a => a.k === 'lago' && a.tipo === 'mar' && M.dentroPoli(a.pts, k.x + k.w / 2, k.y + k.h / 2))).length;
      out.marMoinho = casas.aguas.filter(a => a.k === 'lago' && a.tipo === 'mar').length;
      // no pântano e na água: como sempre (sem o hexágono)
      const base = o => Object.assign({ situacao: 'surpresa', caminho: 'nenhum', seed: 31, estilo: 'comum' }, o);
      out.cobre = [['pantano', 'ilhas'], ['agua', 'navio']].map(([ter, sit]) => JSON.stringify(E.gerar(base({ terreno: ter, situacao: sit, hex: h0 }))) === JSON.stringify(E.gerar(base({ terreno: ter, situacao: sit }))));
      // sem o hexágono: o plano de sempre
      const b0 = base({ terreno: 'floresta', situacao: 'clareira', chao: 2 });
      out.semHex = [JSON.stringify(E.gerar(Object.assign({}, b0, { hex: null }))) === JSON.stringify(E.gerar(b0)), JSON.stringify(E.gerar(Object.assign({}, b0, { hex: PE['1,-1'] }))) === JSON.stringify(E.gerar(b0))];
      // as situações todas dos terrenos de chão, no hexágono: sem erro
      out.erros = [];
      for (const T of E.TERRENOS) { if (T.id === 'agua' || T.id === 'pantano') continue; for (const s of T.sit) { try { const q = E.gerar(op(h0, { terreno: T.id, situacao: s[0] })); if (!q.hex) out.erros.push(T.id + '.' + s[0] + ': sem hex'); } catch (e) { out.erros.push(T.id + '.' + s[0] + ': ' + e.message); } } }
      // o rio do mapa acaba na água do vizinho
      const rf = rios[0] || null, marR = pr.aguas.filter(a => a.k === 'lago' && a.tipo === 'mar'), ult = rf && rf.pts[rf.pts.length - 1];
      out.rioNaAgua = !!ult && marR.some(m => M.dentroPoli(m.pts, ult[0], ult[1]) || M.distLinha(m.pts.concat([m.pts[0]]), ult[0], ult[1]) < 1.5);
      // com os caminhos do mapa, a rosa não conta
      const pRosa = E.gerar(op(h0, { portoes: ['n', 's'] }));
      out.rosa = [pRosa.caminhosRosa === undefined, E.gerar(op(Object.assign({}, h0, { caminhos: [] }), { portoes: ['n', 's'] })).caminhosRosa];
      // as manchas dos vizinhos pelas bordas deles (até a fundura da Mistura, e um pouco do desenho)
      const Dm = X.FUNDO.media * Math.min(p.W, p.H), dLado = (l, x, y) => (l === 'n' ? y : l === 's' ? p.H - y : l === 'o' ? x : p.W - x);
      out.manchas = p.biomas.map(b => [b.id, Math.max(...b.pts.flat().map(q => Math.min(...X.LADOS.pe.filter(L => h0.viz[L.d] === b.id).map(L => dLado(L.l, q[0], q[1])))))]).map(([id, d]) => [id, +d.toFixed(1)]);
      out.Dm = Dm;
      // os patamares longe da borda
      const dB = (x, y) => Math.min(x, y, p.W - x, p.H - y);
      out.patamar = [p, pr, casas].flatMap(q => q.relevo.filter(x => x.t === 'morro').map(x => Math.min(...x.pts.map(z => dB(z[0], z[1]))))).map(v => +v.toFixed(2));
      // o caminho da situação não sai por onde o mapa não tem caminho (as pontas na borda são as do mapa)
      const saidas = pp => pp.caminhos.flatMap(c => [c.pts[0], c.pts[c.pts.length - 1]]).filter(q => Math.min(q[0], q[1], pp.W - q[0], pp.H - q[1]) < 0.5);
      out.extras = [p, E.gerar(op(h0, { terreno: 'estrada', situacao: 'curva', caminho: 'estrada' }))].map(pp => saidas(pp).filter(q => !pontas.some(t => Math.hypot(t.x - q[0], t.y - q[1]) < 2.5)).length);
      // o rio que acaba na água acaba antes da borda (não corre por cima da água até lá)
      out.rioAntes = !!rf && rf.pts.slice(3).every(q => q[1] > -0.5 && q[0] < pr.W + 0.5);
      // a ilha (água nos seis lados, muita): a água não cobre o que a situação põe
      const ilha = Object.assign({}, h0, { viz: { no: 'agua', ne: 'agua', l: 'agua', se: 'agua', so: 'agua', o: 'agua' }, rios: [], caminhos: [] });
      out.ilha = [];
      for (const sd of [31, 32, 33, 34]) {
        const pi = E.gerar(op(ilha, { terreno: 'campo', situacao: 'moinho', mistura: 'muita', seed: sd })), mar = pi.aguas.filter(a => a.k === 'lago' && a.tipo === 'mar');
        let cob = 0;
        for (const k of pi.predios) for (let y = k.y; y < k.y + k.h; y++) for (let x = k.x; x < k.x + k.w; x++) if (mar.some(a => M.dentroPoli(a.pts, x + 0.5, y + 0.5))) cob++;
        out.ilha.push([mar.length, cob]);
      }
      // travar o traçado e gerar outro: o mesmo traçado (o hexágono não solta a trava)
      const tr = E.travaDe(Object.assign(p, { travaTracado: true })), p2 = E.gerar(op(h0, { chao: 1, trava: tr, seed: 99 }));
      out.trava = JSON.stringify(p2.aguas) === JSON.stringify(p.aguas) && JSON.stringify(p2.caminhos) === JSON.stringify(p.caminhos);
      return out;
    }, { PE });
    ok(r.hex && r.hex.k === '0,0' && r.hex.rioDoMapa && r.hex.camDoMapa, 'o Encontro no hexágono: o que veio do mapa: ' + j(r.hex));
    ok(r.chao[0] === true && r.chao[1] === 'media', 'o chão novo vem junto (mesmo com o chão de antes pedido): ' + j(r.chao));
    ok(j(r.vizinhos) === j(['campo', 'montanha', 'savana']), 'os vizinhos do mapa nas bordas: ' + j(r.vizinhos));
    ok(r.rio.n >= 1 && r.rio.fora && r.rio.borda && r.rio.sit === 'riacho', 'o rio do mapa no lugar do riacho da situação, pela ponta exata da borda: ' + j(r.rio));
    ok(r.cam.every(Boolean) && r.cam.length === 3, 'o caminho da situação vai até as pontas do mapa (e o que sobra junta nele): ' + j(r.cam));
    ok(r.camSem.every(Boolean), 'sem o caminho da situação, os do mapa mesmo assim: ' + j(r.camSem));
    ok(r.camEstr.every(Boolean), 'na estrada (a curva), a estrada da situação com as pontas do mapa: ' + j(r.camEstr));
    ok(r.mar === 1 && r.marMoinho >= 1 && r.predioNaAgua === 0, 'a água dos vizinhos, fora do que a situação põe (nenhuma casa do moinho na água): ' + j([r.mar, r.marMoinho, r.predioNaAgua]));
    ok(r.cobre.every(Boolean), 'no pântano e na água, como sempre (o hexágono não entra): ' + j(r.cobre));
    ok(r.semHex.every(Boolean), 'sem o hexágono (ou de água): o plano de sempre');
    ok(r.erros.length === 0, 'todas as situações dos terrenos de chão, no hexágono, sem erro: ' + j(r.erros));
    ok(r.trava, 'travar o traçado e gerar outro: o mesmo rio e os mesmos caminhos');
    ok(r.rioNaAgua && r.rioAntes, 'o rio do mapa acaba na água do vizinho, antes da borda: ' + j([r.rioNaAgua, r.rioAntes]));
    ok(j(r.extras) === j([0, 0]), 'o caminho da situação não sai por onde o mapa não tem caminho: ' + j(r.extras));
    ok(r.ilha.every(([n2, cob]) => n2 >= 1 && cob === 0), 'na ilha (água nos seis lados), a água não cobre as casas do moinho: ' + j(r.ilha));
    ok(r.rosa[0] === true && Array.isArray(r.rosa[1]) && r.rosa[1].length === 2, 'com os caminhos do mapa, a rosa não conta; sem eles, conta: ' + j(r.rosa));
    ok(r.manchas.length >= 2 && r.manchas.every(([, d]) => d <= r.Dm + 2.5), 'as manchas dos vizinhos ficam pelas bordas deles (até ' + r.Dm.toFixed(1) + ' quadrados e o desenho): ' + j(r.manchas));
    ok(r.patamar.every(v => v >= 2), 'os patamares longe da borda: ' + j(r.patamar));
    ok(/do hexágono 0, 0 do Mapa-múndi/.test(r.resumo), 'o resumo diz o hexágono: ' + r.resumo);
  }

  // ================= a janela =================
  if (parte('janela')) {
    const G = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado)));
    const C = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().comum)));
    const abreDoMapa = async (h, extra) => { await ev(([h, extra]) => __tc.Gerador.abrir('encontro', Object.assign({ op: { terreno: 'floresta', situacao: 'surpresa', caminho: 'estrada' }, hora: 'dia', estacao: 'verao', hex: h, ops: { regiao: { bioma: h && h.ter, agua: 'rio', caminho: 'estrada' } } }, extra || {})), [h, extra]); await w(900); };
    const antes = await ev(() => { const o = __tc.App.opt; o.regBio = 'deserto'; o.regAgua = 'lago'; o.regCam = 'nenhum'; return { regBio: o.regBio, regAgua: o.regAgua, regCam: o.regCam }; });
    await abreDoMapa(PE['0,0']);
    let g = await G();
    const ord = await ev(() => { const a = document.getElementById('ger-hex-bloco'), b = document.getElementById('enc-ter'); return !!a && !!b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) > 0; });
    ok(await page.locator('#ger-hex').isChecked() && ord, 'a chave do hexágono, ligada, no alto das escolhas');
    ok(/^Floresta \(hexágono 0, 0\): água a nordeste, campo a leste, savana a sudeste e montanha a sudoeste; o rio/.test(await page.locator('#ger-hex-txt').innerText()), 'com a frase do que vem dele: ' + await page.locator('#ger-hex-txt').innerText());
    ok(g.plano.hex && g.plano.hex.k === '0,0' && /caminhos do mapa · rio do mapa/.test(await page.locator('#enc-tr-res').innerText()) && /do hexágono 0, 0 do Mapa-múndi/.test(await page.locator('#ger-resumo').innerText()), 'o Encontro no hexágono, o Traçado e o resumo dizem');
    await foto('14a-janela-encontro', await page.locator('.modal').boundingBox());
    await page.locator('#enc-tr summary').click(); await w(300);
    ok(/O rio vem do hexágono do Mapa-múndi: o rio entra pelo oeste/.test(await page.locator('#enc-tr').innerText()) && /Os caminhos vêm do hexágono do Mapa-múndi/.test(await page.locator('#enc-tr').innerText()) && await page.locator('#enc-rio-de').count() === 0 && await page.locator('#enc-portoes').count() === 0, 'no Traçado, as notas no lugar das rosas (a largura e as curvas continuam: ' + (await page.locator('#enc-rio-larg').count() === 1) + ')');
    await page.locator('#enc-tr summary').click(); await w(200);
    // a Região livre, preenchida, sem mexer no que a janela lembra
    await page.locator('#ger-lugar button', { hasText: 'Região livre' }).click(); await w(900);
    g = await G();
    const depois = await ev(() => { const o = __tc.App.opt; return { regBio: o.regBio, regAgua: o.regAgua, regCam: o.regCam }; });
    ok(g.op.bioma === 'floresta' && g.plano.hex && g.plano.hex.k === '0,0' && j(depois) === j(antes), 'a Região livre já vem com o hexágono (o bioma dele), sem mexer no que a janela lembra: ' + j([g.op.bioma, depois]));
    ok(/^Do Mapa-múndi: o rio entra pelo oeste e sai pelo nordeste\.$/.test(await page.locator('#reg-agua-hex').innerText()) && /^Do Mapa-múndi: a estrada vai do sul ao leste/.test(await page.locator('#reg-cam-hex').innerText()) && await page.locator('#reg-agua').count() === 0 && await page.locator('#reg-cam').count() === 0, 'a Água e o Caminho dizem o que vem do mapa');
    ok(await page.locator('#ger-hex').isChecked(), 'a chave vale nas duas abas');
    await foto('14a-janela-regiao', await page.locator('.modal').boundingBox());
    // desligar a chave: o lugar de sempre (e as escolhas voltam)
    await page.locator('.sw', { has: page.locator('#ger-hex') }).click(); await w(800);
    g = await G();
    ok(!g.plano.hex && (await C()).comHex === false && await page.locator('#reg-agua').count() === 1 && await page.locator('#reg-cam').count() === 1, 'desligada: a Região de sempre, com a Água e o Caminho à escolha');
    await page.locator('#ger-lugar button', { hasText: 'Encontro' }).click(); await w(800);
    g = await G();
    ok(!g.plano.hex, 'e o Encontro também');
    await page.locator('.sw', { has: page.locator('#ger-hex') }).click(); await w(800);
    g = await G();
    ok(g.plano.hex && g.plano.hex.k === '0,0', 'ligar de novo: o hexágono volta');
    // o pântano: o hexágono não entra (e diz por quê)
    await page.locator('#enc-ter button').filter({ hasText: /^Pântano$/ }).click(); await w(800);
    g = await G();
    ok(!g.plano.hex && await page.locator('#ger-hex').count() === 0 && /não entra no pântano nem na água/.test(await page.locator('#ger-hex-nao').innerText()), 'no pântano, o hexágono não entra, e a janela diz por quê');
    // o modelo não guarda o hexágono
    await page.locator('#enc-ter button').filter({ hasText: /^Floresta$/ }).click(); await w(800);
    await page.locator('#ger-guardar').click(); await w(150);
    await page.locator('#ger-modelo-nome').fill('Do hexágono'); await page.keyboard.press('Enter'); await w(300);
    const mod = await ev(() => __tc.Store.S.prefs.modelos.find(m => m.nome === 'Do hexágono'));
    ok(mod && !('hex' in mod.o) && !JSON.stringify(mod.o).includes('"q"'), 'o modelo guarda as escolhas, não o hexágono: ' + j(mod && Object.keys(mod.o)));
    await ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    // a cena criada
    await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 60000 }); await w(500);
    const sc = await ev(() => { const u = __tc, sc = u.Store.scene(); return { fundo: !!(sc.bg.asset && u.Store.S.assets[sc.bg.asset]), cols: sc.cols, toast: (document.querySelector('.toast') || {}).textContent || '' }; });
    ok(sc.fundo && sc.cols === 32 && /do hexágono 0, 0 do Mapa-múndi/.test(sc.toast), 'a cena criada (o aviso diz o hexágono): ' + j(sc));
    await ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    // o hexágono de água e o sem terreno: a janela diz
    await abreDoMapa(PE['1,-1'], { ops: null });
    ok(await page.locator('#ger-hex').count() === 0 && /é de água/.test(await page.locator('#ger-hex-nao').innerText()), 'o hexágono de água: a janela diz que os vizinhos não entram');
    await page.keyboard.press('Escape'); await w(400);
    await abreDoMapa(Object.assign({}, PE['0,0'], { ter: null }), { ops: null });
    ok(/não tem terreno: pinte o terreno dele/.test(await page.locator('#ger-hex-nao').innerText()), 'o hexágono sem terreno: a janela diz como fazer');
    await page.keyboard.press('Escape'); await w(400);
    // sem o hexágono: a janela de sempre
    await ev(() => __tc.Gerador.abrir('encontro', { op: { terreno: 'campo', situacao: 'capim', caminho: 'trilha' } })); await w(800);
    ok(await page.locator('#ger-hex-bloco').count() === 0 && !(await G()).plano.hex, 'sem o hexágono, a janela de sempre');
    await page.keyboard.press('Escape'); await w(400);
  }

  // ================= robusto =================
  if (parte('robusto')) {
    const S = sorteados(1).concat(sorteados(2));
    const r = await ev(S => {
      const u = __tc, out = { erros: [], max: 0, n: 0, hex: 0 };
      S.forEach((h, i) => {
        for (const [L, o] of [[u.Regiao, { bioma: h.ter, mistura: ['pouca', 'media', 'muita'][i % 3], tamanho: ['pequeno', 'medio', 'grande'][i % 3], agua: ['rio', 'lago', 'nenhuma', 'surpresa'][i % 4], caminho: ['nenhum', 'trilha', 'estrada'][i % 3] }],
          [u.Encontro, { terreno: ({ floresta: 'floresta', campo: 'campo', montanha: 'montanha', savana: 'savana', neve: 'neve', deserto: 'deserto' })[h.ter], situacao: 'surpresa', caminho: ['nenhum', 'trilha', 'estrada'][i % 3], mistura: ['pouca', 'media', 'muita'][i % 3], tamanho: ['pequeno', 'medio', 'grande'][(i + 1) % 3] }]]) {
          try {
            const t0 = performance.now(), p = L.gerar(Object.assign({ seed: 1 + i, estilo: 'comum', hex: h, estacao: i % 5 === 0 ? 'inverno' : undefined }, o));
            const dt = performance.now() - t0;
            out.max = Math.max(out.max, dt); out.n++; if (p.hex) out.hex++;
            if (!Array.isArray(p.occ) || p.occ.length !== p.W * p.H) out.erros.push(i + ': occ');
            u.Encontro.motor.pintar(p, 6);
          } catch (e) { out.erros.push(i + ' ' + (L === u.Regiao ? 'reg' : 'enc') + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
        }
      });
      out.max = Math.round(out.max);
      return out;
    }, S);
    ok(r.erros.length === 0, 'pedidos sorteados, nos dois lugares, sem erro: ' + j(r.erros.slice(0, 5)));
    ok(r.n === S.length * 2 && r.hex > S.length, 'todos gerados, a maioria no hexágono: ' + j([r.n, r.hex]));
    ok(r.max < 400, 'rápido (o mais lento: ' + r.max + ' ms)');
  }

  const errs = t.errs.filter(e => !/favicon/i.test(e));
  if (errs.length) console.log(errs.slice(0, 8).join('\n'));
  ok(errs.length === 0, 'sem erros no console');
  console.log((fails ? 'FALHOU: ' : 'ok: ') + (n - fails) + '/' + n + ' conferências da cena do hexágono');
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
