// Lote 14, parte 14a — a cena que nasce do hexágono, as contas do Mapa-múndi (sem navegador): mundo/nucleo.js.
//   · os vizinhos: as seis direções de cada orientação (com a ponta para cima e deitado) são as dos centros vizinhos;
//   · o "tijolo" do hexágono: os tijolos cobrem o mundo sem sobrar nem sobrepor (cada ponto cai em um só) e o lado de um
//     é o lado do vizinho (inteiro ou a metade, nos lugares certos);
//   · hexParaCena: sem grade, nada; o terreno dele e dos seis vizinhos pelo desenho (o bioma das Cenas, a água, o
//     terreno sem desenho conhecido); os rios e os caminhos recortados no tijolo, em (u, v), na ordem do mapa (o rio da
//     nascente para a foz), com as pontas na borda ou dentro — e o encaixe: o ponto por onde a linha sai de um é o ponto
//     por onde ela entra no vizinho; a rota em cima da estrada conta uma vez (a estrada vale mais); a rota selvagem, de
//     rio e de mar não é caminho; o pedaço que só raspa o tijolo fica de fora; os limites; o número do mapa.
// Uso: node src/tests/lote14-nucleo.test.js
'use strict';
const path = require('path');
const N = require(path.join(__dirname, '..', '..', 'mundo', 'nucleo.js'));

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FALHOU: ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' — esperado ' + JSON.stringify(b) + ', veio ' + JSON.stringify(a));
const perto = (a, b, e) => Math.abs(a - b) <= (e == null ? 2e-4 : e);

function mapa(orient, id) {
  const m = N.normalizarMapa(N.mapaNovo ? N.mapaNovo('Teste') : {});
  m.id = id || 'mp_teste';
  m.grade.tam = 60; m.grade.orient = orient; m.grade.x = 13; m.grade.y = -7;
  for (let q = -5; q <= 5; q++) for (let r = -5; r <= 5; r++) m.hexes[q + ',' + r] = 'fl';
  return m;
}
const DIR_ANG = { n: -90, ne: -45, l: 0, se: 45, s: 90, so: 135, o: 180, no: -135 };

// ---------------- os vizinhos e o tijolo ----------------
for (const orient of ['pe', 'deitado']) {
  const m = N.normalizarMapa(mapa(orient)), c0 = N.centroHex(m, 0, 0), viz = N.VIZINHOS_HEX[orient];
  eq(viz.length, 6, orient + ': seis vizinhos');
  for (const [d, dq, dr] of viz) {
    const c = N.centroHex(m, dq, dr), a = Math.atan2(c.y - c0.y, c.x - c0.x) * 180 / Math.PI;
    // (a direção da rosa mais perto do ângulo do centro do vizinho é a do nome; com a ponta para cima, o "ne" fica a −60°)
    let melhor = null;
    for (const k of Object.keys(DIR_ANG)) { let dd = Math.abs(((DIR_ANG[k] - a) % 360 + 540) % 360 - 180); if (!melhor || dd < melhor.d) melhor = { k, d: dd }; }
    ok(melhor.k === d, orient + ': o vizinho ' + d + ' está na direção dele (ângulo ' + a.toFixed(0) + '°, mais perto de ' + melhor.k + ')');
  }
  // os tijolos cobrem o mundo: cada ponto cai em um só (meio aberto: [x0, x0 + w) × [y0, y0 + h))
  let semDono = 0, dois = 0;
  const s = (x => () => { x = (x * 16807) % 2147483647; return x / 2147483647; })(97);
  for (let k = 0; k < 4000; k++) {
    const x = c0.x + (s() - 0.5) * 400, y = c0.y + (s() - 0.5) * 400, h = N.hexDe(m, x, y);
    let donos = 0;
    for (let dq = -3; dq <= 3; dq++) for (let dr = -3; dr <= 3; dr++) { const T = N.tijoloHex(m, h.q + dq, h.r + dr); if (x >= T.x0 && x < T.x0 + T.w && y >= T.y0 && y < T.y0 + T.h) donos++; }
    if (donos === 0) semDono++; if (donos > 1) dois++;
  }
  ok(semDono === 0 && dois === 0, orient + ': os tijolos cobrem o mundo sem sobrar nem sobrepor (sem dono ' + semDono + ', com dois ' + dois + ')');
  // o lado de um é o lado do vizinho
  const T = N.tijoloHex(m, 0, 0), L = (d) => { const v = viz.find(x => x[0] === d); return N.tijoloHex(m, v[1], v[2]); };
  if (orient === 'pe') {
    const l = L('l'), ne = L('ne'), no = L('no'), se = L('se'), so = L('so'), o = L('o');
    ok(perto(l.x0, T.x0 + T.w) && perto(l.y0, T.y0) && perto(l.h, T.h), 'pe: o vizinho l fica com o lado direito inteiro');
    ok(perto(o.x0 + o.w, T.x0) && perto(o.y0, T.y0), 'pe: o vizinho o fica com o lado esquerdo inteiro');
    ok(perto(ne.y0 + ne.h, T.y0) && perto(ne.x0, T.x0 + T.w / 2), 'pe: o vizinho ne fica com a metade direita de cima');
    ok(perto(no.y0 + no.h, T.y0) && perto(no.x0 + no.w, T.x0 + T.w / 2), 'pe: o vizinho no fica com a metade esquerda de cima');
    ok(perto(se.y0, T.y0 + T.h) && perto(se.x0, T.x0 + T.w / 2), 'pe: o vizinho se fica com a metade direita de baixo');
    ok(perto(so.y0, T.y0 + T.h) && perto(so.x0 + so.w, T.x0 + T.w / 2), 'pe: o vizinho so fica com a metade esquerda de baixo');
    ok(perto(T.w, 60) && perto(T.h, 60 / Math.sqrt(3) * 1.5), 'pe: o tijolo tem a largura de um hexágono e a altura de uma fileira');
  } else {
    const n_ = L('n'), s_ = L('s'), ne = L('ne'), se = L('se'), no = L('no'), so = L('so');
    ok(perto(n_.y0 + n_.h, T.y0) && perto(n_.x0, T.x0) && perto(n_.w, T.w), 'deitado: o vizinho n fica com o lado de cima inteiro');
    ok(perto(s_.y0, T.y0 + T.h) && perto(s_.x0, T.x0), 'deitado: o vizinho s fica com o lado de baixo inteiro');
    ok(perto(ne.x0, T.x0 + T.w) && perto(ne.y0 + ne.h, T.y0 + T.h / 2), 'deitado: o vizinho ne fica com a metade de cima do lado direito');
    ok(perto(se.x0, T.x0 + T.w) && perto(se.y0, T.y0 + T.h / 2), 'deitado: o vizinho se fica com a metade de baixo do lado direito');
    ok(perto(no.x0 + no.w, T.x0) && perto(no.y0 + no.h, T.y0 + T.h / 2), 'deitado: o vizinho no fica com a metade de cima do lado esquerdo');
    ok(perto(so.x0 + so.w, T.x0) && perto(so.y0, T.y0 + T.h / 2), 'deitado: o vizinho so fica com a metade de baixo do lado esquerdo');
    ok(perto(T.h, 60) && perto(T.w, 60 / Math.sqrt(3) * 1.5), 'deitado: o tijolo tem a altura de um hexágono e a largura de uma coluna');
  }
}

// ---------------- hexParaCena ----------------
{
  const sem = N.normalizarMapa(Object.assign(mapa('pe'), {}));
  sem.grade.tam = 0;
  eq(N.hexParaCena(N.normalizarMapa(sem), 0, 0), null, 'sem grade: nada');
  const m = mapa('pe');
  m.terrenos.push({ id: 'zz', nome: 'Terra estranha', cor: '#777777', custo: 5 });
  Object.assign(m.hexes, { '1,0': 'pl', '1,-1': 'ag', '0,-1': 'zz', '-1,0': 'co', '-1,1': 'mo', '0,1': 'la' });
  delete m.hexes['0,0'];
  m.hexes['0,0'] = 'de';
  const h = N.hexParaCena(N.normalizarMapa(m), 0, 0);
  eq([h.k, h.q, h.r, h.orient, h.ter, h.nome], ['0,0', 0, 0, 'pe', 'deserto', 'Deserto'], 'o hexágono: a chave, a orientação, o bioma e o nome do terreno');
  eq(h.viz, { l: 'campo', ne: 'agua', no: 'campo', o: 'campo', so: 'montanha', se: 'campo' }, 'os seis vizinhos: a planície e a colina são campo, a água, o terreno do mestre sem desenho (liso: campo), a montanha, a lavoura');
  ok(Number.isInteger(h.sem) && h.sem > 0, 'o número do mapa');
  const h2 = N.hexParaCena(N.normalizarMapa(Object.assign(mapa('pe', 'mp_outro'))), 0, 0), h3 = N.hexParaCena(N.normalizarMapa(mapa('pe')), 0, 0);
  ok(h2.sem !== h.sem && h3.sem === h.sem, 'o número do mapa vem do id: outro mapa, outro número; o mesmo id, o mesmo');
  eq([h.rios, h.caminhos], [[], []], 'sem linhas, sem rio nem caminho');
  // o hexágono sem terreno nenhum
  const m2 = mapa('pe'); delete m2.hexes['2,2'];
  eq(N.hexParaCena(N.normalizarMapa(m2), 2, 2).ter, null, 'o hexágono sem terreno: o bioma é nenhum');
}

// ---------------- as linhas: o recorte e o encaixe ----------------
for (const orient of ['pe', 'deitado']) {
  const m = mapa(orient), c = (q, r) => N.centroHex(m, q, r);
  // um riacho que nasce dentro do 0,0 e sai (antes, no mapa, do rio comprido: o mais comprido vem primeiro)
  const a = c(-2, 0), b = c(0, 0), d = c(2, 0);
  m.objs.push(Object.assign(N.objNovo('l', { pts: [[b.x + 1, b.y + 2], [b.x + 4, b.y + 80]] }), { estilo: 'rio' }));
  // um rio que atravessa três hexágonos (da nascente, a oeste, para a foz, a leste), torto
  m.objs.push(Object.assign(N.objNovo('l', { pts: [[a.x + 3, a.y - 4], [b.x - 6, b.y + 9], [b.x + 7, b.y - 5], [d.x, d.y + 6]] }), { estilo: 'rio' }));
  // uma rota (trilha) e a estrada embaixo dela (a estrada vale mais, mesmo vindo depois); uma rota selvagem, uma de rio e
  // uma de mar (não são caminho)
  const e0 = c(-2, 1), e1 = c(2, -1);
  const est = [[e0.x, e0.y], [b.x + 2, b.y + 12], [e1.x, e1.y]];
  m.objs.push(Object.assign(N.objNovo('t', { pts: est.map(p => [p[0] + 0.4, p[1] - 0.3]) }), { via: 'trilha', esc: true }));
  m.objs.push(Object.assign(N.objNovo('l', { pts: est }), { estilo: 'estrada' }));
  for (const via of ['selvagem', 'rio', 'mar']) m.objs.push(Object.assign(N.objNovo('t', { pts: [[a.x, a.y + 15], [d.x, d.y + 15]] }), { via }));
  // uma trilha que entra e acaba dentro dele
  m.objs.push(Object.assign(N.objNovo('l', { pts: [[b.x - 90, b.y - 20], [b.x - 3, b.y - 4]] }), { estilo: 'trilha' }));
  // uma linha que só toca o canto do tijolo (num ponto) e uma que corre em cima da borda
  const T0 = N.tijoloHex(N.normalizarMapa(m), 0, 0);
  m.objs.push(Object.assign(N.objNovo('l', { pts: [[T0.x0 - 1, T0.y0 + 1], [T0.x0 + 1, T0.y0 - 1]] }), { estilo: 'estrada' }));
  m.objs.push(Object.assign(N.objNovo('l', { pts: [[T0.x0 + 2, T0.y0], [T0.x0 + T0.w - 2, T0.y0]] }), { estilo: 'trilha' }));
  const mm = N.normalizarMapa(m), H0 = N.hexParaCena(mm, 0, 0);
  eq(H0.rios.length, 2, orient + ': os dois rios que passam pelo 0,0');
  const rio = H0.rios[0], nasce = H0.rios[1];
  ok(rio.ini && rio.fim, orient + ': o rio de fora atravessa (entra e sai pela borda)');
  ok(rio.pts[0][0] < 0.5 && rio.pts[rio.pts.length - 1][0] > 0.5, orient + ': na ordem do mapa — entra do lado da nascente (oeste) e sai do lado da foz (leste)');
  ok(!nasce.ini && nasce.fim, orient + ': o riacho nasce dentro (a ponta de cima, dentro) e sai pela borda');
  const cams = H0.caminhos;
  eq(cams.filter(x => x.t === 'estrada').length, 1, orient + ': a rota em cima da estrada conta uma vez (a estrada, mesmo desenhada depois)');
  ok(cams.some(x => x.t === 'trilha' && x.ini && !x.fim), orient + ': a trilha que entra e acaba dentro');
  ok(!cams.some(x => x.pts.every(p => p[1] <= 1e-4)), orient + ': a linha em cima da borda fica de fora');
  eq(cams.length, 2, orient + ': nem a rota selvagem, nem a de rio, nem a de mar, nem a que só toca o canto (sobram a estrada e a trilha)');
  ok(H0.rios.concat(cams).every(pc => pc.pts.every(p => p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1)), orient + ': os pontos em (u, v) de 0 a 1');
  // o encaixe: o ponto por onde o rio sai do 0,0 é o ponto por onde ele entra no vizinho
  const fimR = rio.pts[rio.pts.length - 1], noLado = p => (p[0] >= 1 - 1e-4 ? 'l' : p[0] <= 1e-4 ? 'o' : p[1] <= 1e-4 ? 'n' : 's');
  const lado = noLado(fimR), viz = N.VIZINHOS_HEX[orient];
  const T = N.tijoloHex(mm, 0, 0), mundo = [T.x0 + fimR[0] * T.w, T.y0 + fimR[1] * T.h];
  // (o vizinho de lá: o que tem o ponto do mundo na borda dele)
  let achou = null;
  for (const [dd, dq, dr] of viz) {
    const Tv = N.tijoloHex(mm, dq, dr), u = (mundo[0] - Tv.x0) / Tv.w, v = (mundo[1] - Tv.y0) / Tv.h;
    if (u >= -1e-6 && u <= 1 + 1e-6 && v >= -1e-6 && v <= 1 + 1e-6) achou = { dd, dq, dr, u, v };
  }
  ok(!!achou, orient + ': o ponto de saída fica na borda de um vizinho (' + lado + ')');
  if (achou) {
    const Hv = N.hexParaCena(mm, achou.dq, achou.dr), rv = Hv.rios.find(x => perto(x.pts[0][0], achou.u, 2e-3) && perto(x.pts[0][1], achou.v, 2e-3));
    ok(!!rv && rv.ini, orient + ': o vizinho ' + achou.dd + ' tem o rio entrando pelo mesmo ponto (' + achou.u.toFixed(3) + ', ' + achou.v.toFixed(3) + ')');
  }
  // o mesmo para a estrada, nas duas pontas: no mundo, a ponta de cá e a de um vizinho no mesmo ponto (a menos de 1% do
  // tijolo — a linha que passa raspando o canto de um terceiro vizinho pula um pedaço pequeno demais para a cena dele)
  const estr = cams.find(x => x.t === 'estrada'), noMundo = (Tq, p) => [Tq.x0 + p[0] * Tq.w, Tq.y0 + p[1] * Tq.h];
  for (const p of [estr.pts[0], estr.pts[estr.pts.length - 1]]) {
    const w = noMundo(T, p);
    let bate = false;
    for (const [, dq, dr] of viz) {
      const Tv = N.tijoloHex(mm, dq, dr), Hv = N.hexParaCena(mm, dq, dr);
      for (const x of Hv.caminhos) for (const q of [x.pts[0], x.pts[x.pts.length - 1]]) { const wq = noMundo(Tv, q); if (Math.hypot(wq[0] - w[0], wq[1] - w[1]) < 0.01 * T.w) bate = true; }
    }
    ok(bate, orient + ': a estrada sai do 0,0 e entra no vizinho pelo mesmo ponto (' + p.join(', ') + ')');
  }
}

// ---------------- os limites ----------------
{
  const m = mapa('pe'), c = N.centroHex(m, 0, 0), T = N.tijoloHex(N.normalizarMapa(m), 0, 0);
  for (let k = 0; k < 6; k++) m.objs.push(Object.assign(N.objNovo('l', { pts: [[T.x0 - 5, T.y0 + 5 + k * 6], [T.x0 + T.w + 5, T.y0 + 7 + k * 6]] }), { estilo: 'rio' }));
  for (let k = 0; k < 10; k++) m.objs.push(Object.assign(N.objNovo('l', { pts: [[T.x0 + 3 + k * 5, T.y0 - 5], [T.x0 + 4 + k * 5, T.y0 + T.h + 5]] }), { estilo: 'trilha' }));
  const zig = []; for (let k = 0; k <= 200; k++) zig.push([T.x0 - 2 + k * (T.w + 4) / 200, c.y + (k % 2 ? 3 : -3)]);
  m.objs.push(Object.assign(N.objNovo('l', { pts: zig }), { estilo: 'estrada' }));
  const h = N.hexParaCena(N.normalizarMapa(m), 0, 0);
  ok(h.rios.length === 3 && h.caminhos.length === 6, 'até três rios e seis caminhos (vieram ' + h.rios.length + ' e ' + h.caminhos.length + ')');
  ok(h.rios.concat(h.caminhos).every(pc => pc.pts.length <= 24 && pc.pts.length >= 2), 'até 24 pontos em cada pedaço');
  const zz = N.hexParaCena(N.normalizarMapa(Object.assign(mapa('pe'), { objs: [Object.assign(N.objNovo('l', { pts: zig }), { estilo: 'estrada' })] })), 0, 0).caminhos[0];
  ok(zz && zz.pts.length === 24 && zz.pts[0][0] === 0 && zz.pts[23][0] === 1, 'a linha comprida fica com 24 pontos, das duas pontas da borda');
}

console.log((bad ? 'FALHOU: ' : 'ok: ') + (n - bad) + '/' + n + ' conferências da cena do hexágono (núcleo)');
if (bad) process.exit(1);
