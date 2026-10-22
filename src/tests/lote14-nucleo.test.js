// Lote 14, parte 14a — a cena que nasce do hexágono, as contas do Mapa-múndi (sem navegador): mundo/nucleo.js.
//   · os vizinhos: as seis direções de cada orientação (com a ponta para cima e deitado) são as dos centros vizinhos;
//   · o "tijolo" do hexágono: os tijolos cobrem o mundo sem sobrar nem sobrepor (cada ponto cai em um só) e o lado de um
//     é o lado do vizinho (inteiro ou a metade, nos lugares certos);
//   · hexParaCena: sem grade, nada; o terreno dele e dos seis vizinhos pelo desenho (o bioma das Cenas, a água, o
//     terreno sem desenho conhecido); os rios e os caminhos recortados no tijolo, em (u, v), na ordem do mapa (o rio da
//     nascente para a foz), com as pontas na borda ou dentro — e o encaixe: o ponto por onde a linha sai de um é o ponto
//     por onde ela entra no vizinho; a rota em cima da estrada conta uma vez (a estrada vale mais); a rota selvagem, de
//     rio e de mar não é caminho; o pedaço que só raspa o tijolo fica de fora; os limites; o número do mapa;
//   · (14b) a guerra do hexágono (guerraDoHex): a batalha mais nova (os dias, os lados com as cores — a bandeira do clã,
//     a da facção, a cor dela e um tom; sem facção, a do grupo; sem nada, as neutras — e as tropas que ainda têm), a marca,
//     os exércitos juntos pela facção (até dois; as máquinas pelo desenho; o escondido), o cerco (o lugar no tijolo, quem
//     cerca e as máquinas a até um hexágono; quem está dentro não acampa; o lugar ocupado).
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

// ---------------- (14b) a guerra no hexágono ----------------
{
  const mk = () => {
    const m = mapa('pe', 'mp_guerra');
    m.cal.dia = 50;
    m.faccoes = [Object.assign(N.faccaoNova('Ferro', '#b03a2e'), { id: 'fc_a', band: { forma: 'escudo', div: 'partido', cores: ['#b03a2e', '#f2d16b'] } }),
      Object.assign(N.faccaoNova('Corvos', '#101820'), { id: 'fc_b' }),
      Object.assign(N.faccaoNova('Clã', '#2a8a4a'), { id: 'fc_c', br: { forma: 'escudo', div: 'partido', cores: ['#2a8a4a', '#ffffff'] }, band: { forma: 'escudo', div: 'partido', cores: ['#000000', '#111111'] } }),
      Object.assign(N.faccaoNova('Aliados', '#7a3a9a'), { id: 'fc_d', rel: { fc_a: 'alianca' } }),
      Object.assign(N.faccaoNova('Vizinhos', '#3a7a9a'), { id: 'fc_e', rel: { fc_b: 'alianca' } })];
    return m;
  };
  const c = (m, q, r) => N.centroHex(m, q, r);
  const exe = (m, id, nome, fac, q, r, tropas, maq, extra) => { const p = c(m, q, r); return Object.assign(N.objNovo('g', { x: p.x + 3, y: p.y - 2 }), { id, nome, fac, tipo: 'exercito', exe: { cmd: { nome: 'C' }, moral: 5, unid: [{ id: id + 'u', nome: 'U', tropas, maq: maq || {} }] } }, extra || {}); };
  // sem guerra: nada
  {
    const m = N.normalizarMapa(mk());
    ok(N.guerraDoHex(m, 0, 0, N.tijoloHex(m, 0, 0)) === null && !('guerra' in N.hexParaCena(m, 0, 0)), 'sem guerra no hexágono: nada (o pedido fica como era)');
  }
  // a batalha: a mais nova do hexágono, os dias, os lados com as cores, as tropas que os exércitos ainda têm
  {
    const m = mk();
    m.objs.push(exe(m, 'g1', 'Hoste', 'fc_a', 0, 0, 800), exe(m, 'g2', 'Bando', 'fc_b', 3, 0, 150), Object.assign(N.objNovo('g', { x: 0, y: 0 }), { id: 'g3', nome: 'Sem facção', cor: '#336699' }));
    m.guerra = { tipos: [], hexes: { '0,0': 'c' }, bats: [
      { id: 'b1', d: 30, nome: 'Velha', a: { nome: 'A' }, b: { nome: 'B' }, fim: { vence: 'b', tam: 1 }, hex: '0,0' },
      { id: 'b2', d: 44, nome: 'Do Vau', a: { nome: 'Hoste', g: 'g1', fac: 'fc_a' }, b: { nome: 'Bando', g: 'g2', fac: 'fc_b' }, fim: { vence: 'a', tam: 3 }, hex: '0,0' },
      { id: 'b3', d: 49, nome: 'Outra', a: { nome: 'A' }, b: { nome: 'B' }, fim: { vence: 'a', tam: 2 }, hex: '1,0' },
      { id: 'b4', d: 44, nome: 'Mesmo dia, depois', a: { nome: 'X', g: 'g3' }, b: { nome: 'Y', fac: 'fc_c' }, fim: { vence: null, tam: 0 }, hex: '2,0' }] };
    const mm = N.normalizarMapa(m), g = N.hexParaCena(mm, 0, 0).guerra;
    eq(g.bat, { nome: 'Do Vau', dias: 6, tam: 3, vence: 'a', a: { nome: 'Hoste', cores: ['#b03a2e', '#f2d16b'] }, b: { nome: 'Bando', cores: ['#101820', '#93979b'] }, tropas: 950 }, 'a batalha mais nova do hexágono, com as cores (a bandeira; a cor escura ganha um tom claro) e as tropas dos dois');
    ok(g.marca === 'c', 'a marca do hexágono (corrompido)');
    const g2 = N.guerraDoHex(mm, 2, 0, N.tijoloHex(mm, 2, 0));
    eq([g2.bat.a.cores, g2.bat.b.cores, 'tropas' in g2.bat], [['#336699', '#1c3854'], ['#2a8a4a', '#ffffff'], false], 'sem facção, a cor do grupo; a bandeira do clã vale antes da da facção; sem exércitos, sem as tropas');
    m.guerra.bats.push({ id: 'b5', d: 44, nome: 'No mesmo dia', a: { nome: 'P' }, b: { nome: 'Q' }, fim: {}, hex: '0,0' }, { id: 'b6', d: 60, nome: 'Adiante', a: { nome: 'P' }, b: { nome: 'Q' }, fim: {}, hex: '1,0' });
    const m2 = N.normalizarMapa(m);
    eq([N.guerraDoHex(m2, 0, 0, N.tijoloHex(m2, 0, 0)).bat.nome, N.guerraDoHex(m2, 1, 0, N.tijoloHex(m2, 1, 0)).bat.dias], ['No mesmo dia', 0], 'no mesmo dia, a última do histórico; a de depois de hoje fica com 0 dias');
    eq(N.guerraDoHex(m2, 0, 0, N.tijoloHex(m2, 0, 0)).bat.a.cores, ['#8a7a5e', '#4e4434'], 'o lado sem facção nem grupo: as cores neutras');
  }
  // os exércitos: juntos pela facção (os maiores primeiro, até dois), as máquinas pelo desenho, o escondido
  {
    const m = mk();
    m.guerra = { tipos: [], bats: [], hexes: {}, maqs: [{ id: 'ariete', nome: 'Aríete', est: 3, exe: 0, ac: null }, { id: 'balista', nome: 'Balista', est: 1, exe: 4, ac: 12 }, { id: 'torre', nome: 'Torre', est: 6, exe: 0, ac: 14 }, { id: 'carro', nome: 'Carro', est: 2, exe: 0, ac: null }] };
    m.objs.push(exe(m, 'a1', 'Pequena', 'fc_a', 0, 0, 100, { balista: 2, torre: 1, catapulta: 5 }), exe(m, 'a2', 'Grande', 'fc_a', 0, 0, 900, { carro: 1, ariete: 2 }),
      exe(m, 'b1', 'Corvos', 'fc_b', 0, 0, 600), exe(m, 's1', 'Solta', null, 0, 0, 50, {}, { cor: '#aa6600', oculto: true }), exe(m, 's2', 'Outra solta', null, 0, 0, 40),
      exe(m, 'z1', 'Morta', 'fc_c', 0, 0, 0), exe(m, 'f1', 'Fora', 'fc_c', 1, 0, 999), Object.assign(N.objNovo('g', { x: c(m, 0, 0).x, y: c(m, 0, 0).y }), { id: 'cv', nome: 'Caravana', tipo: 'caravana' }));
    const mm = N.normalizarMapa(m), g = N.guerraDoHex(mm, 0, 0, N.tijoloHex(mm, 0, 0));
    eq(g.exes.map(e => [e.nome, e.fac, e.tropas, e.n]), [['Grande', 'Ferro', 1000, 2], ['Corvos', 'Corvos', 600, 1]], 'juntos pela facção (o nome do maior), os maiores primeiro');
    eq(Object.entries(g.exes[0].maq).sort(), [['ariete', 3], ['catapulta', 2], ['trabuco', 1]], 'as máquinas pelo desenho (a que não atira é aríete, a que bate forte é trabuco; o tipo que não existe no mapa não conta)');
    ok(g.maisExes === 2 && !('oculto' in g.exes[0]) && !('dentro' in g), 'até dois; o resto conta (os soltos, cada um por si; sem as tropas, a caravana e o de fora, nada)');
    // (os maiores primeiro, mesmo quando o pequeno vem antes no mapa)
    const m3 = mk();
    m3.objs.push(exe(m3, 'p1', 'Pequeno', 'fc_c', 0, 0, 100), exe(m3, 'p2', 'Médio', 'fc_b', 0, 0, 400), exe(m3, 'p3', 'Grande', 'fc_a', 0, 0, 900));
    const g3 = N.guerraDoHex(N.normalizarMapa(m3), 0, 0, N.tijoloHex(N.normalizarMapa(m3), 0, 0));
    eq([g3.exes.map(e => e.nome), g3.maisExes], [['Grande', 'Médio'], 1], 'os maiores primeiro (o pequeno, que vem antes no mapa, fica no resto)');
    m.objs = m.objs.filter(o => ['s1'].includes(o.id));
    const g2 = N.guerraDoHex(N.normalizarMapa(m), 0, 0, N.tijoloHex(N.normalizarMapa(m), 0, 0));
    eq(g2.exes, [{ nome: 'Solta', fac: '', cores: ['#aa6600', '#5e3800'], tropas: 50, n: 1, oculto: true }], 'o exército escondido no mapa leva oculto (e, sem facção, a cor do grupo)');
  }
  // o cerco: o lugar no hexágono, quem cerca (as máquinas dos exércitos a até um hexágono), quem está dentro não acampa
  {
    const m = mk(), p = c(m, 0, 0), T = N.tijoloHex(N.normalizarMapa(m), 0, 0);
    m.objs.push(Object.assign(N.objNovo('r', { pts: [[p.x - 200, p.y - 200], [p.x + 200, p.y - 200], [p.x + 200, p.y + 200], [p.x - 200, p.y + 200]] }), { id: 'rg', nome: 'R', fac: 'fc_b' }));
    m.objs.push(Object.assign(N.objNovo('m', { x: p.x + 15, y: p.y - 10 }), { id: 'mk', nome: 'Pedravale', ic: 'castelo', estr: { nome: 'Muro', def: 3, hp: 50, hpMax: 50 }, cerco: { fac: 'fc_a', d: 42 } }));
    m.objs.push(exe(m, 'c1', 'Cerco', 'fc_a', 0, 0, 2000, { trabuco: 1 }), exe(m, 'c2', 'Reforço', 'fc_a', 1, 0, 500, { catapulta: 2 }), exe(m, 'c3', 'Longe', 'fc_a', 3, 0, 500, { catapulta: 9 }),
      exe(m, 'al', 'Aliado', 'fc_d', 0, 0, 300, { ariete: 1 }), exe(m, 'd1', 'Guarda', 'fc_b', 0, 0, 200), exe(m, 'd2', 'Amigos de dentro', 'fc_e', 0, 0, 150), exe(m, 'n1', 'Neutro', 'fc_c', 0, 0, 100));
    const mm = N.normalizarMapa(m), g = N.guerraDoHex(mm, 0, 0, T);
    eq(g.cerco, { nome: 'Pedravale', fac: 'Ferro', cores: ['#b03a2e', '#f2d16b'], dias: 8, u: Math.round((p.x + 15 - T.x0) / T.w * 1e3) / 1e3, v: Math.round((p.y - 10 - T.y0) / T.h * 1e3) / 1e3, maq: { trabuco: 1, catapulta: 2, ariete: 1 } }, 'o cerco: o lugar (onde fica no tijolo), quem cerca, os dias e as máquinas de quem cerca a até um hexágono (com as da aliada)');
    eq(g.exes.map(e => [e.nome, e.lado || null]), [['Cerco', 'cerco'], ['Aliado', 'cerco']], 'os que cercam (a facção e a aliada) acampam, com o lado do cerco');
    ok(g.dentro === 2 && g.maisExes === 1, 'o dono do lugar e a aliada dele estão dentro (não acampam); o neutro acampa (fica no resto): ' + JSON.stringify([g.dentro, g.maisExes]));
    m.objs.find(o => o.id === 'mk').ocup = { fac: 'fc_c', d: 30 };
    const g2 = N.guerraDoHex(N.normalizarMapa(m), 0, 0, T);
    ok(g2.dentro === 1 && g2.maisExes === 2, 'o lugar ocupado: quem ocupa é o dono (os de dentro são os dele; a guarda de antes e a aliada dela acampam fora): ' + JSON.stringify([g2.dentro, g2.maisExes]));
  }
}

console.log((bad ? 'FALHOU: ' : 'ok: ') + (n - bad) + '/' + n + ' conferências da cena do hexágono (núcleo)');
if (bad) process.exit(1);
