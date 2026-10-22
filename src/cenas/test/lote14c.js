// Lote 14, parte 14c: os arredores do Vilarejo, da Cidade, da Tribo, das Ruínas e do Porto (a página das Cenas sozinha, no
// navegador; os pedidos com o hexágono vêm do núcleo do Mapa-múndi, mundo/nucleo.js, num mundinho de teste com os marcadores).
//   · (SO=dados) os níveis; as passagens de uma linha pela beira do lugar; o pedido do marcador (o cerco dele, aqui);
//   · (SO=igual) com os arredores em Nenhum, o plano de sempre; o lugar dentro dos arredores é o de sempre;
//   · (SO=anel) o anel de cada lugar e nível: o tamanho, o lugar bloqueado e limpo, o rio e os caminhos continuados até a
//     borda, as manchas e os morros longe do lugar, o chão do lugar;
//   · (SO=emenda) o rio e os caminhos do lugar ficam dentro da beira dele (o anel os continua dali, com as cores dele);
//   · (SO=hex) com o hexágono do marcador: o chão do hexágono, o lugar preenchido (o rio e os portões do mapa), o rio pelos
//     pontos do mapa, as pontas dos caminhos do mapa, a água dos vizinhos fora do lugar;
//   · (SO=mar) o Porto e a Cidade com mar: o mar até a borda da cena, no lado da água do hexágono;
//   · (SO=guerra) o cerco em volta do próprio lugar, as casas do lugar queimadas, o corrompido em volta, o que cabe com os
//     arredores em Muito, o cerco de outro lugar do hexágono;
//   · (SO=janela) a escolha dos arredores, a história e os achados, o bloco do hexágono, os modelos de antes, a Cidade de
//     bairros, as notas do Traçado;
//   · (SO=cena) a cena criada: o tamanho, o lugar deslocado (as paredes e os tokens), os marcadores ocultos;
//   · (SO=robusto) lugares, níveis e sementes sorteados, com e sem o hexágono: sem erro, sem nada do anel no lugar, rápido.
// FOTOS=<pasta> guarda capturas.
const path = require('path'), fs = require('fs');
const { open } = require('./lib');
const N = require(path.join(__dirname, '..', '..', '..', 'mundo', 'nucleo.js'));
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;

/* O mundinho da 14b (a floresta com a água a nordeste, o rio e a estrada pelo 0,0; a guerra: a Batalha do Vau no 0,0, o
   0,0 e o 1,0 destruídos, o −1,1 corrompido, os exércitos e o cerco de Pedravale no 0,1) com os marcadores: a vila Vau
   Velho no 0,0 e o porto Porto Cinza no 0,−1 (com a água a noroeste, a nordeste e a leste). */
function mundo(orient) {
  const m = N.normalizarMapa(N.mapaNovo('Teste 14c'));
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
  m.faccoes = [Object.assign(N.faccaoNova('Casa de Ferro', '#b03a2e'), { id: 'fc_ferro', band: { forma: 'escudo', div: 'partido', cores: ['#b03a2e', '#f2d16b'] } }), Object.assign(N.faccaoNova('Os Corvos', '#2f5f9e'), { id: 'fc_corvos' })];
  m.cal.dia = 40;
  const cv = c(0, 1), c0 = c(0, 0), cp = c(0, -1);
  m.objs.push(Object.assign(N.objNovo('r', { pts: [[cv.x - 80, cv.y - 50], [cv.x + 80, cv.y - 50], [cv.x + 80, cv.y + 50], [cv.x - 80, cv.y + 50]] }), { id: 'rg_pedra', nome: 'Vale de Pedra', fac: 'fc_corvos' }));
  m.objs.push(Object.assign(N.objNovo('m', { x: cv.x + 12, y: cv.y - 6 }), { id: 'mk_pedra', nome: 'Pedravale', ic: 'castelo', estr: { nome: 'Muralha', def: 4, hp: 80, hpMax: 100 }, cerco: { fac: 'fc_ferro', d: 35 } }));
  m.objs.push(Object.assign(N.objNovo('m', { x: cv.x - 20, y: cv.y + 10 }), { id: 'mk_torre', nome: 'Torre do Vale', ic: 'torre' }));
  m.objs.push(Object.assign(N.objNovo('m', { x: c0.x - 4, y: c0.y + 2 }), { id: 'mk_vila', nome: 'Vau Velho', ic: 'vila' }));
  m.objs.push(Object.assign(N.objNovo('m', { x: cp.x + 3, y: cp.y - 2 }), { id: 'mk_porto', nome: 'Porto Cinza', ic: 'porto' }));
  const exe = (id, nome, fac, x, y, tropas, maq, oculto) => Object.assign(N.objNovo('g', { x, y }), { id, nome, fac, tipo: 'exercito', oculto: !!oculto, exe: { cmd: { nome: 'Cmd' }, moral: 5, unid: [{ id: id + '_u', nome: 'Infantaria', tropas, maq: maq || {} }] } });
  m.objs.push(exe('gr_ferro1', 'Hoste de Ferro', 'fc_ferro', c0.x + 5, c0.y + 4, 1200, { catapulta: 2 }));
  m.objs.push(exe('gr_ferro2', 'Vanguarda de Ferro', 'fc_ferro', c0.x - 6, c0.y - 3, 300, {}));
  m.objs.push(exe('gr_corvos1', 'Bando dos Corvos', 'fc_corvos', c0.x + 9, c0.y - 8, 450, {}));
  m.objs.push(exe('gr_cerco', 'Cerco de Ferro', 'fc_ferro', cv.x - 10, cv.y + 8, 2600, { trabuco: 1, ariete: 1, catapulta: 3 }));
  m.objs.push(exe('gr_dentro', 'Guarda de Pedravale', 'fc_corvos', cv.x + 14, cv.y - 4, 200, {}));
  m.guerra = { tipos: [], bats: [{ id: 'bt1', d: 38, nome: 'Batalha do Vau', a: { nome: 'Hoste de Ferro', g: 'gr_ferro1', fac: 'fc_ferro' }, b: { nome: 'Bando dos Corvos', g: 'gr_corvos1', fac: 'fc_corvos' }, modo: 'd100', mom: [], fim: { vence: 'a', tam: 3, como: 'dados' }, notas: [], hex: '0,0' }],
    hexes: { '1,0': 'd', '-1,1': 'c', '0,0': 'd' } };
  const mm = N.normalizarMapa(m), out = { hexes: {}, marcadores: {} };
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) out.hexes[q + ',' + r] = N.hexParaCena(mm, q, r);
  for (const [k, id] of [['0,1', 'mk_pedra'], ['0,1', 'mk_torre'], ['0,0', 'mk_vila'], ['0,-1', 'mk_porto']]) { const [q, r] = k.split(',').map(Number); out.marcadores[id] = N.hexParaCena(mm, q, r, { marcador: id }); }
  return out;
}
const PE = mundo('pe'), DT = mundo('deitado');

(async () => {
  const t = await open({ w: 1360, h: 1000, arredores: true });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const j = JSON.stringify;
  const foto = async (nome, clip) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot(Object.assign({ path: path.join(SHOTS, nome + '.png') }, clip ? { clip } : {})); } };
  const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);
  // (as escolhas de cada lugar, para os testes)
  const OPS = {
    vila: { tamanho: 'aldeia', terreno: 'floresta', rio: true, muralha: false, casas: 6 },
    cidade: { modo: 'completa', tamanho: 'pequena', terreno: 'campo', rio: true, muralha: true, mar: false, predios: 26 },
    tribo: { moradias: 'tenda', tamanho: 'pequena', terreno: 'floresta', palicada: true, sagrados: true, vida: true },
    ruinas: { tipo: 'forte', tamanho: 'pequeno', terreno: 'campo', masmorra: true, mato: true },
    porto: { tipo: 'vila', tamanho: 'pequeno', terreno: 'campo', navios: true, farol: true, mercado: true },
  };

  // ================= os dados =================
  if (parte('dados')) {
    const r = await ev(PE => {
      const u = __tc, A = u.Arredores, X = u.HexCena, out = {};
      out.niveis = A.NIVEIS.map(x => x[0]);
      out.larg = A.LARG;
      out.nivel = [A.nivel('muito'), A.nivel('x'), A.nivel(null), A.nivel('nenhum')];
      // uma linha que atravessa o lugar 10 × 8 da esquerda para a direita (passa 1 quadrado de cada borda)
      const ps = A.passagens([[-1, 4], [3, 4], [7, 4], [11, 4]], 10, 8);
      out.atravessa = ps.map(q => [q.lado, q.sai, +q.x.toFixed(2), +q.y.toFixed(2), q.fora.length, q.junta.length]);
      out.dentro = A.passagens([[2, 2], [8, 6]], 10, 8).length;
      out.diagonal = A.passagens([[5, 4], [12, 11]], 10, 8).map(q => [q.lado, q.sai, +q.x.toFixed(2), +q.y.toFixed(2)]);
      out.cruza = [A.cruzaBorda([5, 4], [5, -2], 10, 8), A.cruzaBorda([5, 4], [5, 4], 10, 8)];
      // (com a meia largura) a linha que corre rente à beira: o pedaço de dentro vai junto, até onde ela se afasta
      const rente = [[-1, 0.7], [2, 0.7], [4, 0.7], [6, 0.7], [6, 4], [8, 4]];
      out.rente = [A.passagens(rente, 12, 8)[0].junta.length, A.passagens(rente, 12, 8, 0.4)[0].junta.length];
      // o pedido do marcador: o cerco do próprio lugar sai marcado (aqui); o do outro marcador do mesmo hexágono, não
      out.aqui = [PE.marcadores.mk_pedra.guerra.cerco.aqui, PE.marcadores.mk_torre.guerra.cerco.aqui, PE.hexes['0,1'].guerra.cerco.aqui];
      out.valida = [X.valida(PE.marcadores.mk_pedra).guerra.cerco.aqui, X.valida(PE.marcadores.mk_torre).guerra.cerco.aqui === undefined];
      out.semMarcador = JSON.stringify(Object.assign({}, PE.hexes['0,0'])) === JSON.stringify(Object.assign({}, PE.marcadores.mk_vila));
      // o que o hexágono traz para o lugar: o rio (de onde vem, para onde vai) e os portões
      out.dirs = A.DIRS_DO(X.valida(PE.marcadores.mk_vila));
      out.dirs01 = A.DIRS_DO(X.valida(PE.marcadores.mk_pedra));
      out.agua = [A.ladoDaAgua(X.valida(PE.marcadores.mk_porto)), A.ladoDaAgua(X.valida(PE.marcadores.mk_pedra))];
      return out;
    }, PE);
    ok(j(r.niveis) === j(['nenhum', 'pouco', 'medio', 'muito']) && j(r.larg) === j({ nenhum: 0, pouco: 4, medio: 8, muito: 14 }), 'os níveis: Nenhum, Pouco (4), Médio (8) e Muito (14): ' + j(r.larg));
    ok(j(r.nivel) === j(['muito', 'medio', 'medio', 'nenhum']), 'o nível conferido (o de começo é o Médio): ' + j(r.nivel));
    ok(j(r.atravessa) === j([['o', false, 0, 4, 2, 1], ['l', true, 10, 4, 2, 1]]), 'a linha que atravessa: entra pelo oeste, sai pelo leste, com o pedaço de fora e o de dentro: ' + j(r.atravessa));
    ok(r.dentro === 0 && j(r.diagonal) === j([['s', true, 9, 8]]) && j(r.cruza) === j([[5, 0, 'n'], null]), 'a linha que fica dentro não passa; a diagonal sai pelo sul; o cruzamento da borda: ' + j([r.dentro, r.diagonal, r.cruza]));
    ok(j(r.rente) === j([1, 3]), 'a linha rente à beira: o pedaço de dentro vai até ela se afastar (o anel cobre o que o recorte do lugar cortaria): ' + j(r.rente));
    ok(j(r.aqui) === j([true, undefined, undefined]) && j(r.valida) === j([true, true]), 'o cerco do próprio marcador sai marcado (aqui); o de outro marcador do hexágono e o sem marcador, não: ' + j([r.aqui, r.valida]));
    ok(r.semMarcador, 'sem o cerco, o pedido do marcador é o mesmo do hexágono');
    ok(r.dirs.rio && r.dirs.de === 'o' && r.dirs.para === 'ne' && j(r.dirs.portoes) === j(['l', 's']), 'o hexágono da vila: o rio de oeste para nordeste e os portões a leste e ao sul: ' + j(r.dirs));
    ok(!r.dirs01.rio && r.dirs01.portoes.length === 0, 'sem rio nem caminho no 0,1: ' + j(r.dirs01));
    ok(r.agua[0] === 'n' && r.agua[1] === null, 'o lado da água do hexágono (o mar do Porto): ' + j(r.agua));
  }

  // ================= com os arredores em Nenhum, o plano de sempre =================
  if (parte('igual')) {
    const r = await ev(OPS => {
      const u = __tc, A = u.Arredores, out = [];
      const L0 = { vila: u.Vila.LUGAR, cidade: u.Cidade.LUGAR, tribo: u.Tribo.LUGAR, ruinas: u.Ruinas.LUGAR, porto: u.Porto.LUGAR };
      for (const id of Object.keys(OPS)) for (const seed of [3, 8]) {
        const L = A.LUGARES[id], st = Object.assign(L.padrao(), OPS[id]), c = { estilo: seed === 8 ? 'nordico' : 'comum', seed };
        const p0 = L0[id].gerar(Object.assign({}, st), c), pN = L.gerar(Object.assign({}, st, { arredores: 'nenhum' }), c), pM = L.gerar(Object.assign({}, st, { arredores: 'medio' }), c);
        const cv = document.createElement('canvas'), cv0 = document.createElement('canvas');
        L.previa(cv, pN, 460, 330, { relevo: true }); L0[id].previa(cv0, p0, 460, 330, { relevo: true });
        out.push([id + ' ' + seed, JSON.stringify(p0) === JSON.stringify(pN), cv.toDataURL() === cv0.toDataURL(), L.resumo(pN) === L0[id].resumo(p0), id === 'porto' || JSON.stringify(pM.lugar) === JSON.stringify(p0), !!pM.arredores && pM.a === 8]);
      }
      // a Cidade de bairros: os arredores não entram (o plano de sempre, mesmo pedindo)
      const Lc = A.LUGARES.cidade, sb = Object.assign(Lc.padrao(), OPS.cidade, { modo: 'bairros', arredores: 'muito' });
      out.push(['cidade bairros', JSON.stringify(Lc.gerar(sb, { estilo: 'comum', seed: 3 })) === JSON.stringify(u.Cidade.LUGAR.gerar(sb, { estilo: 'comum', seed: 3 })), true, true, true, true]);
      return out;
    }, OPS);
    const mal = r.filter(x => x.slice(1).some(v => !v));
    ok(!mal.length, 'com os arredores em Nenhum, o plano, a prévia e o resumo de sempre; com eles, o lugar de dentro é o de sempre (' + r.length + ' casos): ' + j(mal));
  }

  // ================= o anel =================
  if (parte('anel')) {
    const r = await ev(OPS => {
      const u = __tc, A = u.Arredores, M = u.Encontro.motor, out = [];
      for (const id of Object.keys(OPS)) for (const nv of ['pouco', 'medio', 'muito']) for (const seed of [4, 9]) {
        const L = A.LUGARES[id], st = Object.assign(L.padrao(), OPS[id], { arredores: nv, arrHist: [], arrAchados: false });
        const p = L.gerar(st, { estilo: 'comum', seed }), pA = p.anel, R = pA.R, a = p.a, W2 = p.W, H2 = p.H, pL = p.lugar;
        const den = (x, y, m) => x > R[0] + (m || 0) && y > R[1] + (m || 0) && x < R[2] - (m || 0) && y < R[3] - (m || 0);
        const distR = (x, y) => Math.hypot(x - Math.max(R[0], Math.min(R[2], x)), y - Math.max(R[1], Math.min(R[3], y)));
        let bloq = true;
        for (let jj = R[1]; jj < R[3]; jj++) for (let i = R[0]; i < R[2]; i++) if (pA.occ[jj * W2 + i] !== 3) bloq = false;
        const LN = A.AD[id].linhas(pL), rios = pA.aguas.filter(x => x.k === 'rio');
        // (cada passagem do rio do lugar: o rio do anel passa por ela e chega na borda da cena do mesmo lado)
        const passR = LN.rios.flatMap(r0 => A.passagens(r0.pts, pL.W, pL.H)).map(q => [q.x + a, q.y + a, q.lado]);
        const noLado = (px, py, l) => (l === 'n' ? py <= 0.1 : l === 's' ? py >= H2 - 0.1 : l === 'o' ? px <= 0.1 : px >= W2 - 0.1);
        const rioOk = passR.every(([x, y, l]) => rios.some(x2 => M.distLinha(x2.pts, x, y) < 0.8 && x2.pts.some(([px, py]) => noLado(px, py, l))));
        const passC = LN.caminhos.flatMap(c0 => A.passagens(c0.pts, pL.W, pL.H).filter(q => { const e = q.fora[q.fora.length - 1]; return Math.min(e[0] + a, e[1] + a, W2 - e[0] - a, H2 - e[1] - a) > 0.6; })).map(q => [q.x + a, q.y + a]);
        const camOk = passC.every(([x, y]) => pA.caminhos.some(c => M.distLinha(c.pts, x, y) < 1.2 && c.pts.some(([px, py]) => Math.min(px, py, W2 - px, H2 - py) <= 0.1)));
        // (o relevo do rio continuado: um só, da borda da cena até a outra (passando pelo lugar), e o do lugar sai dele)
        const relRio = LN.rios.map((r0, k) => { const rel = (p.lugar.relevo || []).findIndex(r => r.k === 'free' && r.t === 'agua' && r.pts.some(([x1, y1]) => r0.pts.some(([x2, y2]) => Math.hypot(x1 - x2, y1 - y2) < 0.6))); const ns = A.passagens(r0.pts, pL.W, pL.H).length; return rel < 0 || !ns ? true : (pA.relevoTirado || []).includes(rel) && pA.relevo.filter(r => r.k === 'free' && r.t === 'agua' && r0.pts.some(([x2, y2]) => r.pts.some(([x1, y1]) => Math.hypot(x1 + 0 - x2 - a, y1 - y2 - a) < 0.6))).length === 1; }).every(Boolean);
        // (o rio do anel fica longe do lugar — a mais de um quadrado —, menos junto das passagens)
        const rioLonge = rios.every(x2 => x2.pts.every(([px, py]) => den(px, py, -0.01) || distR(px, py) >= 1 || passR.some(([qx, qy]) => Math.hypot(px - qx, py - qy) < 3.6)));
        // (as casas dos morros a três quadrados ou mais do lugar; o contorno, um pouco mais perto)
        const patam = pA.pintados.filter(o => o.k === 'morro' || o.k === 'planalto').every(o => o.pts.every(([x, y]) => distR(x, y) >= 1.8)) && pA.massas.every(m => m.pts.every(([x, y]) => distR(x, y) >= 1.8));
        const manchas = (pA.biomas || []).filter(b => b.id !== 'lugar').every(b => b.pts.every(pts => pts.every(([x, y]) => !den(x, y, 0.3))));
        const nadaDentro = !pA.arvores.some(t2 => den(t2.x, t2.y, 0.3)) && !pA.rochas.some(t2 => den(t2.x, t2.y, 0.3)) && !pA.objetos.some(o => den(o.x + 0.5, o.y + 0.5, 0));
        const arvLonge = pA.arvores.every(t2 => distR(t2.x, t2.y) >= 1);
        // (o rio e os caminhos do lugar continuados: com as cores do lugar; o caminho, da largura dele)
        const palL = A.AD[id].pal(pL), riosL = pA.aguas.filter(x => x.k === 'rio');
        const cores = riosL.length === rios.length && rios.every(x => x.pal === palL) && passC.every(([x, y]) => pA.caminhos.some(c => c.pal === palL && M.distLinha(c.pts, x, y) < 0.05 && LN.caminhos.some(c0 => Math.abs(Math.max(0.6, Math.min(1.5, c0.hw)) - c.hw) < 1e-9)));
        out.push({ k: id + ' ' + nv + ' ' + seed, cores, tam: W2 === pL.W + 2 * a && H2 === pL.H + 2 * a && a === { pouco: 4, medio: 8, muito: 14 }[nv] && j0(R) === j0([a, a, a + pL.W, a + pL.H]), bloq, rioOk, camOk, rioLonge, relRio, patam, manchas, nadaDentro, arvLonge, pal: pA.pal, fim: pA.info.fim, nRios: passR.length, nCam: passC.length, trees: pA.arvores.length });
      }
      function j0(x) { return JSON.stringify(x); }
      return out;
    }, OPS);
    const falha = (k, f) => r.filter(x => !x[f]).map(x => x.k);
    ok(!falha(0, 'tam').length, 'o tamanho da cena: o lugar com 4, 8 ou 14 quadrados de cada lado, no meio: ' + j(falha(0, 'tam')));
    ok(!falha(0, 'bloq').length && !falha(0, 'nadaDentro').length, 'o lugar fica bloqueado no anel, sem as árvores, as pedras e os objetos dele: ' + j(falha(0, 'bloq').concat(falha(0, 'nadaDentro'))));
    ok(!falha(0, 'arvLonge').length, 'as árvores do anel a um quadrado do lugar ou mais: ' + j(falha(0, 'arvLonge')));
    ok(!falha(0, 'rioOk').length && r.some(x => x.nRios >= 2), 'o rio do lugar segue pelo anel até a borda, do lado de cada passagem: ' + j(falha(0, 'rioOk')));
    ok(!falha(0, 'rioLonge').length, 'o rio do anel fica longe do lugar (menos junto das passagens): ' + j(falha(0, 'rioLonge')));
    ok(!falha(0, 'relRio').length, 'o relevo do rio continuado é um só (o do lugar sai dele: as pontas não se sobrepõem): ' + j(falha(0, 'relRio')));
    ok(!falha(0, 'camOk').length && r.some(x => x.nCam >= 2), 'os caminhos do lugar seguem pelo anel até a borda: ' + j(falha(0, 'camOk')));
    ok(!falha(0, 'patam').length && !falha(0, 'manchas').length, 'os morros e os penhascos longe do lugar; as manchas dos vizinhos fora dele: ' + j(falha(0, 'patam').concat(falha(0, 'manchas'))));
    ok(r.every(x => x.fim === 0), 'nada do lugar fica sem continuar: ' + j(r.filter(x => x.fim).map(x => x.k)));
    ok(!falha(0, 'cores').length, 'o rio e os caminhos continuados têm as cores do lugar (e o caminho, a largura dele): sem emenda na beira: ' + j(falha(0, 'cores')));
    ok(r.filter(x => /^porto/.test(x.k)).every(x => x.pal === 'campo') && r.filter(x => /^tribo/.test(x.k)).every(x => x.pal === 'floresta') && r.every(x => x.trees > 0), 'o chão do anel é o do lugar (sem o hexágono), com a vegetação');
  }

  // ================= a emenda: o rio e os caminhos do lugar ficam dentro da beira (o anel os continua dali) =================
  if (parte('emenda')) {
    const r = await ev(OPS => {
      const u = __tc, A = u.Arredores, M = u.Encontro.motor, out = [];
      for (const id of Object.keys(OPS)) for (const seed of [4, 9, 31]) {
        const L = A.LUGARES[id], st = Object.assign(L.padrao(), OPS[id], { arredores: 'medio' });
        const p = L.gerar(st, { estilo: 'comum', seed }), pL = p.lugar, a = p.a, c = 10;
        // (só o lugar, numa tela transparente, no lugar dele dentro dos arredores)
        const cv = document.createElement('canvas'); cv.width = p.W * c; cv.height = p.H * c;
        const g = cv.getContext('2d');
        A.AD[id].pintar(g, pL, c, a);
        const img = g.getImageData(0, 0, cv.width, cv.height).data, alfa = (x, y) => img[(Math.floor(y * c) * cv.width + Math.floor(x * c)) * 4 + 3];
        // (o que o lugar desenha além da beira de propósito: as copas, as pedras, a água grande, a praia e os desenhos do chão)
        const polis = [].concat(pL.lago ? [pL.lago] : [], pL.mar ? [pL.mar.poli].concat(pL.mar.praias || []) : [], (pL.aguas || []).filter(x => x.k === 'lago').map(x => x.pts), (pL.chao || []).map(x => x.pts), (pL.massas || []).map(x => x.pts), (pL.pintados || []).filter(o => o.pts && o.pts.length > 2 && o.pts.every(q => Array.isArray(q))).map(o => o.pts)).filter(pts => Array.isArray(pts) && pts.length > 2);
        const coberto = (x, y) => (pL.arvores || []).concat(pL.rochas || []).some(t => Math.hypot(t.x - x, t.y - y) < (t.r || 1) + 1.2) || polis.some(pts => M.dentroPoli(pts, x, y) || M.distLinha(pts.concat([pts[0]]), x, y) < 1);
        const LN = A.AD[id].linhas(pL);
        let n = 0, pintado = 0;
        for (const ln of LN.rios.concat(LN.caminhos)) for (const q of A.passagens(ln.pts, pL.W, pL.H)) for (const f of q.fora.slice(1)) {
          const fora = Math.max(-f[0], -f[1], f[0] - pL.W, f[1] - pL.H);
          if (fora < 0.6 || coberto(f[0], f[1])) continue;
          n++; if (alfa(f[0] + a, f[1] + a) > 0) pintado++;
        }
        out.push([id + ' ' + seed, n, pintado]);
      }
      return out;
    }, OPS);
    ok(r.filter(x => x[1] > 0).length >= 6 && r.every(x => x[2] === 0), 'o rio e os caminhos do lugar ficam dentro da beira dele (o anel os continua dali, sem emenda): ' + j(r));
  }

  // ================= com o hexágono do marcador =================
  if (parte('hex')) {
    for (const [nome, HX, PORT] of [['pe', PE, ['l', 's']], ['deitado', DT, ['se', 'so']]]) {
      const r = await ev(([HX, OPS]) => {
        const u = __tc, A = u.Arredores, X = u.HexCena, G = u.MarcasGuerra, M = u.Encontro.motor, out = {};
        const hex = X.valida(HX.marcadores.mk_vila);
        /* (o caminho do lugar continuado tem as cores do chão do lugar — a Cidade no campo, no hexágono de floresta): o anel
           pintado, a cor no caminho a um quadrado e pouco da beira, entre o meio e a beira dele (o miolo da estrada) */
        function corDoCaminho(p) {
          const pA = p.anel, c = 10, cv = M.pintar(pA, c, { semVinheta: true }), img = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, out = [];
          const hex2 = v => '#' + Array.from(v).map(x => x.toString(16).padStart(2, '0')).join(''), px = (x, y) => { const k = (Math.floor(y * c) * cv.width + Math.floor(x * c)) * 4; return img.slice(k, k + 3); };
          const R = pA.R, distR = (x, y) => Math.hypot(x - Math.max(R[0], Math.min(R[2], x)), y - Math.max(R[1], Math.min(R[3], y)));
          for (const c0 of A.AD.cidade.linhas(p.lugar).caminhos) for (const q of A.passagens(c0.pts, p.lugar.W, p.lugar.H, c0.hw)) {
            const qx = q.x + p.a, qy = q.y + p.a, cam = pA.caminhos.find(cm => M.distLinha(cm.pts, qx, qy) < 0.05);
            if (!cam) continue;
            // (pelo caminho, de onde ele cruza a beira para fora, um quadrado e meio; ao lado do meio, no miolo da estrada)
            const P = cam.pts, i0 = P.reduce((m, q2, i) => (Math.hypot(q2[0] - qx, q2[1] - qy) < Math.hypot(P[m][0] - qx, P[m][1] - qy) ? i : m), 0);
            const passo = i0 + 1 < P.length && (i0 === 0 || distR(P[i0 + 1][0], P[i0 + 1][1]) > distR(P[i0 - 1][0], P[i0 - 1][1])) ? 1 : -1;
            let i = i0, L0 = 0;
            while (i + passo >= 0 && i + passo < P.length && L0 < 1.5) { L0 += Math.hypot(P[i + passo][0] - P[i][0], P[i + passo][1] - P[i][1]); i += passo; }
            const b = P[i], a2 = P[i - passo] || P[i], dl = Math.hypot(b[0] - a2[0], b[1] - a2[1]) || 1, ux = (b[0] - a2[0]) / dl, uy = (b[1] - a2[1]) / dl;
            out.push(hex2(px(b[0] - uy * cam.hw * 0.65, b[1] + ux * cam.hw * 0.65)));
          }
          const cores = k => u.Estilos.corDaRua('comum', u.Paisagem.PAL[k])[1];
          return { cores: out, doLugar: cores(A.AD.cidade.pal(p.lugar)), doAnel: cores(pA.pal) };
        }
        for (const id of ['vila', 'cidade', 'tribo']) {
          const L = A.LUGARES[id], st = Object.assign(L.padrao(), OPS[id], { arredores: 'medio', arrHist: [], arrAchados: false });
          L.preencherHex(st, hex);
          const p = L.gerar(st, { estilo: 'comum', seed: 21, hex, guerra: [] }), pA = p.anel, W2 = p.W, H2 = p.H, Ls = X.linhas(hex, W2, H2);
          const rh = X.rioDoMapa(Ls, X.mapa(W2, H2, hex, hex.ter, 'media'), W2, H2), rios = pA.aguas.filter(x => x.k === 'rio');
          const toca = (pt, arr) => arr.some(x => x.pts.some(q => Math.hypot(q[0] - pt.x, q[1] - pt.y) < 0.05));
          const pass = A.passagens((p.lugar.rio || (p.lugar.aguas || []).find(x => x.k === 'rio') || { pts: [] }).pts, p.lugar.W, p.lugar.H);
          // (o rio do anel fica longe do lugar — a mais de um quadrado —, menos junto das passagens: mesmo dando a volta nele
          // até o ponto do mapa)
          const R = pA.R, distR = (x, y) => Math.hypot(x - Math.max(R[0], Math.min(R[2], x)), y - Math.max(R[1], Math.min(R[3], y))), passR = A.AD[id].linhas(p.lugar).rios.flatMap(r0 => A.passagens(r0.pts, p.lugar.W, p.lugar.H)).map(q => [q.x + p.a, q.y + p.a]);
          const rioLonge = rios.every(x2 => x2.pts.every(([px, py]) => (px > R[0] && py > R[1] && px < R[2] && py < R[3]) || distR(px, py) >= 1 || passR.some(([qx, qy]) => Math.hypot(px - qx, py - qy) < 3.6)));
          out[id] = { bioma: pA.bioma, hex: !!pA.hex, rio: st.rio, de: st.t.rioDe, para: st.t.rioPara, portoes: st.t.portoes, entra: pass.filter(q => !q.sai).map(q => q.lado), rioIni: rh.pIni.borda ? toca(rh.pIni, rios) : null,
            pontas: X.pontasDosCaminhos(Ls).map(pt => toca(pt, pA.caminhos)), agua: pA.info.agua || 0, aguaLonge: pA.aguas.filter(x => x.k === 'lago' && x.tipo === 'mar').every(x => x.pts.every(([qx, qy]) => qx < pA.R[0] - 1.2 || qy < pA.R[1] - 1.2 || qx > pA.R[2] + 1.2 || qy > pA.R[3] + 1.2)),
            resumo: L.resumo(p), rioLonge, corCam: id === 'cidade' ? corDoCaminho(p) : null, mancha: (pA.biomas || []).filter(b => b.id === 'lugar').map(b => { const [x0, y0, x1, y1] = pA.R, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = (x1 - x0) / 2 * 0.9, hy = (y1 - y0) / 2 * 0.9; return [b.pal, [[cx, cy], [cx - hx, cy], [cx + hx, cy], [cx, cy - hy], [cx, cy + hy]].every(([x, y]) => b.pts.some(pts => M.dentroPoli(pts, x, y)))]; }) };
        }
        // os lugares sem rio (as Ruínas) e com mais caminhos que o mapa (o Porto): o rio do mapa passa em volta; o caminho do
        // mapa que sobra chega no caminho que já existe; o do lugar que sobra acaba no campo
        // o rio do lugar que sai do lado de lá (para o sul; o do mapa sai a nordeste): o rio dos arredores dá a volta no
        // lugar até o ponto do mapa, longe dele
        { const L = A.LUGARES.vila, st = Object.assign(L.padrao(), OPS.vila, { arredores: 'medio', arrHist: [], arrAchados: false });
          L.preencherHex(st, hex); st.t.rioPara = 's';
          const p = L.gerar(st, { estilo: 'comum', seed: 21, hex, guerra: [] }), pA = p.anel, R = pA.R, rios = pA.aguas.filter(x => x.k === 'rio');
          const distR = (x, y) => Math.hypot(x - Math.max(R[0], Math.min(R[2], x)), y - Math.max(R[1], Math.min(R[3], y))), passR = A.AD.vila.linhas(p.lugar).rios.flatMap(r0 => A.passagens(r0.pts, p.lugar.W, p.lugar.H)).map(q => [q.x + p.a, q.y + p.a, q.lado]);
          const longe = rios.map(x2 => Math.min(99, ...x2.pts.filter(([px, py]) => !(px > R[0] && py > R[1] && px < R[2] && py < R[3]) && !passR.some(([qx, qy]) => Math.hypot(px - qx, py - qy) < 3.6)).map(([px, py]) => distR(px, py))));
          out.volta = { lados: passR.map(q => q[2]), longe: longe.map(v => +v.toFixed(2)), fim: pA.info.fim }; }
        for (const [id, op] of [['ruinas', OPS.ruinas], ['porto', OPS.porto], ['tribo', Object.assign({}, OPS.tribo, { vida: false })]]) {
          const L = A.LUGARES[id], st = Object.assign(L.padrao(), op, { arredores: 'medio', arrHist: [], arrAchados: false });
          L.preencherHex(st, hex);
          const p = L.gerar(st, { estilo: 'comum', seed: 21, hex, guerra: [] }), pA = p.anel, W2 = p.W, H2 = p.H, Ls = X.linhas(hex, W2, H2);
          const rh = X.rioDoMapa(Ls, X.mapa(W2, H2, hex, hex.ter, 'media'), W2, H2), rios = pA.aguas.filter(x => x.k === 'rio');
          const toca = (pt, arr) => arr.some(x => x.pts.some(q => Math.hypot(q[0] - pt.x, q[1] - pt.y) < 0.05));
          const LN = A.AD[id].linhas(p.lugar), pass = [];
          for (const c of LN.caminhos) for (const q of A.passagens(c.pts, p.lugar.W, p.lugar.H, c.hw)) if (!pass.some(z => z.lado === q.lado && Math.hypot(z.x - q.x, z.y - q.y) < 2.5)) pass.push(q);
          const pontas = X.pontasDosCaminhos(Ls);
          // (a ponta do mapa que cai na água do lugar — o mar do Porto —: o caminho acaba na beira da água, na terra mais perto)
          const naAgua = pt => pA.occ[pt.cel] === 2 || pA.occ[pt.cel] === 3, pontaDe = c => [c.pts[0], c.pts[c.pts.length - 1]];
          const naBeira = ([x, y]) => { for (let jj = Math.floor(y - 2.5); jj <= y + 2.5; jj++) for (let ii = Math.floor(x - 2.5); ii <= x + 2.5; ii++) if (ii >= 0 && jj >= 0 && ii < W2 && jj < H2 && pA.occ[jj * W2 + ii] === 2) return true; return false; };
          out[id === 'tribo' ? 'triboSemRio' : id] = { semRio: !LN.rios.length, rioDoMapa: !!pA.info.rioDoMapa, rioIni: rh.pIni.borda ? toca(rh.pIni, rios) : null, pontas: pontas.map(pt => toca(pt, pA.caminhos) || (naAgua(pt) && pA.caminhos.some(c => pontaDe(c).some(naBeira)))), pass: pass.length,
            continua: pass.every(q => pA.caminhos.some(c => M.distLinha(c.pts, q.x + p.a, q.y + p.a) < 0.05)), campo: pA.info.campo || 0, fim: pA.info.fim, resumo: L.resumo(p) };
        }
        // sem o hexágono, o plano do lugar com os arredores é outro (o chão é o do lugar)
        const L = A.LUGARES.vila, st = Object.assign(L.padrao(), OPS.vila, { arredores: 'medio' });
        out.sem = L.gerar(st, { estilo: 'comum', seed: 21 }).anel.bioma;
        // o marcador que não é de lugar com arredores (a masmorra): o pedido dele vem sem o hexágono (no painel)
        return out;
      }, [HX, OPS]);
      for (const id of ['vila', 'cidade', 'tribo']) {
        const x = r[id];
        ok(x.bioma === 'floresta' && x.hex, nome + ' · ' + id + ': o chão do hexágono (floresta): ' + j([x.bioma, x.hex]));
        ok(x.de === 'o' && x.para === 'ne' && j(x.portoes) === j(PORT) && (id === 'tribo' || x.rio === true), nome + ' · ' + id + ': o lugar vem preenchido (o rio do mapa, de oeste para nordeste; os portões onde chegam os caminhos do mapa): ' + j([x.rio, x.de, x.para, x.portoes]));
        ok(x.entra.includes('o') || x.entra.length === 0, nome + ' · ' + id + ': o rio do lugar entra pelo oeste: ' + j(x.entra));
        ok(x.rioIni === true, nome + ' · ' + id + ': o rio do anel sai do ponto exato do rio do mapa na borda');
        ok(x.rioLonge, nome + ' · ' + id + ': o rio do anel fica longe do lugar (menos junto das passagens)');
        ok(x.pontas.length >= 2 && x.pontas.every(Boolean), nome + ' · ' + id + ': as pontas dos caminhos do mapa são as pontas dos caminhos do anel: ' + j(x.pontas));
        ok(x.agua >= 1 && x.aguaLonge, nome + ' · ' + id + ': a água dos vizinhos (a nordeste) fica fora do lugar: ' + j([x.agua, x.aguaLonge]));
        ok(/do hexágono 0, 0 do Mapa-múndi/.test(x.resumo) && /os arredores Médio/.test(x.resumo), nome + ' · ' + id + ': o resumo diz o hexágono e os arredores: ' + x.resumo);
      }
      ok(r.sem === 'floresta', nome + ': sem o hexágono, o chão do terreno do lugar');
      { const cc = r.cidade.corCam, perto = (a, b) => [1, 3, 5].every(i => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)) <= 3);
        ok(cc.doLugar !== cc.doAnel && cc.cores.some(x => perto(x, cc.doLugar)) && !cc.cores.some(x => perto(x, cc.doAnel)), nome + ': a estrada da Cidade continua nos arredores com as cores dela (do campo, no hexágono de floresta): ' + j(cc)); }
      ok(j(r.vila.mancha) === j([]) && j(r.tribo.mancha) === j([]) && j(r.cidade.mancha) === j([['campo', true]]), nome + ': o lugar de outro chão (a Cidade no campo, no hexágono de floresta) fica numa clareira do chão dele (os cantos, de beira macia, no chão de fora); o do mesmo chão, não: ' + j([r.vila.mancha, r.cidade.mancha, r.tribo.mancha]));
      ok(r.volta.lados.includes('s') && r.volta.fim === 0 && r.volta.longe.every(v => v >= 1), nome + ': o rio que sai do lado de lá dá a volta no lugar, a um quadrado ou mais dele: ' + j(r.volta));
      for (const id of ['ruinas', 'triboSemRio']) {
        const x = r[id];
        ok(x.semRio && x.rioDoMapa && x.rioIni === true && /o rio do mapa passa em volta/.test(x.resumo), nome + ' · ' + id + ' (sem rio): o rio do mapa passa em volta, pelo ponto dele na borda: ' + j([x.rioDoMapa, x.rioIni]));
      }
      for (const id of ['ruinas', 'porto', 'triboSemRio']) {
        const x = r[id], sobra = Math.max(0, x.pass - x.pontas.length);
        ok(x.pontas.every(Boolean) && x.continua && x.campo === sobra && x.fim === 0 && (!sobra || new RegExp(sobra === 1 ? 'um caminho do lugar acaba no campo \\(o mapa não tem caminho ali\\)' : sobra + ' caminhos do lugar acabam no campo').test(x.resumo)), nome + ' · ' + id + ': as pontas do mapa e os caminhos do lugar, todos continuados (o que sobra do lugar acaba no campo): ' + j([x.pontas, x.pass, x.campo, x.fim]));
      }
    }
  }

  // ================= o mar do Porto e da Cidade =================
  if (parte('mar')) {
    const r = await ev(([PE, OPS]) => {
      const u = __tc, A = u.Arredores, X = u.HexCena, out = {};
      const hex = X.valida(PE.marcadores.mk_porto);
      for (const [k, id, op] of [['porto', 'porto', OPS.porto], ['portoGrande', 'porto', Object.assign({}, OPS.porto, { tipo: 'porto' })], ['cidade', 'cidade', Object.assign({}, OPS.cidade, { mar: true })]]) for (const nv of ['pouco', 'muito']) {
        const L = A.LUGARES[id], st = Object.assign(L.padrao(), op, { arredores: nv });
        L.preencherHex(st, hex);
        const p = L.gerar(st, { estilo: 'comum', seed: 6, hex }), pL = p.lugar, a = p.a;
        const mar = id === 'porto' ? pL.aguas.find(x => x.k === 'lago' && x.tipo === 'mar') : { pts: pL.mar.poli };
        const xs = mar.pts.map(q => q[0] + a), ys = mar.pts.map(q => q[1] + a), lado = id === 'porto' ? pL.mar.lado : pL.mar.lado;
        // (o mar passa da borda da cena dos dois lados, ao longo da beira)
        const cobre = lado === 'n' || lado === 's' ? Math.min(...xs) <= -2 && Math.max(...xs) >= p.W + 2 : Math.min(...ys) <= -2 && Math.max(...ys) >= p.H + 2;
        const noMar = (x, y) => u.Encontro.motor.dentroPoli(mar.pts.map(q => [q[0] + a, q[1] + a]), x, y);
        out[k + ' ' + nv] = { lado, cobre, arvNoMar: p.anel.arvores.filter(t2 => noMar(t2.x, t2.y)).length, marQ: p.anel.occ.filter((v, q) => v === 2).length > 0 };
      }
      // sem o hexágono, o lado do mar é o sorteado (o de sempre)
      const Lp = A.LUGARES.porto, s0 = Object.assign(Lp.padrao(), OPS.porto);
      out.sorteado = [Lp.gerar(Object.assign({}, s0, { arredores: 'medio' }), { estilo: 'comum', seed: 6 }).lugar.mar.lado, u.Porto.LUGAR.gerar(Object.assign({}, s0), { estilo: 'comum', seed: 6 }).mar.lado];
      return out;
    }, [PE, OPS]);
    for (const k of Object.keys(r).filter(x => x !== 'sorteado')) {
      const x = r[k];
      ok(x.lado === 'n' && x.cobre, k + ': o mar no lado da água do hexágono (norte), passando da borda da cena: ' + j(x));
      ok(x.arvNoMar === 0 && x.marQ, k + ': nenhuma árvore do anel no mar (a grade do anel sabe dele): ' + j(x));
    }
    ok(r.sorteado[0] === r.sorteado[1], 'sem o hexágono, o mar fica no lado de sempre: ' + j(r.sorteado));
  }

  // ================= a guerra em volta do lugar =================
  if (parte('guerra')) {
    const r = await ev(([PE, OPS]) => {
      const u = __tc, A = u.Arredores, X = u.HexCena, G = u.MarcasGuerra, M = u.Encontro.motor, out = {};
      const pint = (p, k) => p.pintados.filter(o => o.k === k);
      const ger = (id, h, nv, op, sel, seed) => { const L = A.LUGARES[id], hex = X.valida(h), st = Object.assign(L.padrao(), OPS[id], op || null, { arredores: nv }); L.preencherHex(st, hex); const p = L.gerar(st, { estilo: 'comum', seed: seed || 5, hex, guerra: sel || G.padrao(hex.guerra) }); return { p, L }; };
      // o cerco em volta do forte cercado (Pedravale), nos três níveis
      for (const nv of ['medio', 'muito']) {
        const { p, L } = ger('ruinas', PE.marcadores.mk_pedra, nv), pA = p.anel, R = pA.R, cx = (R[0] + R[2]) / 2, cy = (R[1] + R[3]) / 2;
        const distR = (x, y) => Math.hypot(x - Math.max(R[0], Math.min(R[2], x)), y - Math.max(R[1], Math.min(R[3], y)));
        const tr = pint(pA, 'trincheira'), pts = tr.flatMap(o => o.pts), mq = ['catapulta', 'trabuco'].flatMap(k => pint(pA, k)), ar = pint(pA, 'ariete').concat((pA.sobreLugar || []).filter(o => o.k === 'ariete'));
        const lados = new Set(pts.map(([x, y]) => (x < R[0] ? 'o' : x > R[2] ? 'l' : y < R[1] ? 'n' : 's')));
        out['cerco ' + nv] = { n: tr.length, lados: [...lados].sort(), dist: [Math.min(...pts.map(q => distR(q[0], q[1]))), Math.max(...pts.map(q => distR(q[0], q[1])))], ds: tr.every(o => o.ds && o.ds.length === o.pts.length),
          mq: mq.map(o => [+(distR(o.x, o.y)).toFixed(2), Math.abs(Math.atan2(Math.sin(o.ang - Math.atan2(cy - o.y, cx - o.x)), Math.cos(o.ang - Math.atan2(cy - o.y, cx - o.x)))) < 1e-2]), ar: ar.length,
          fl: pint(pA, 'flechas').reduce((s, o) => s + o.itens.length, 0), info: pA.guerraInfo, marcas: (pA.guerra || []).map(q => q.n), resumo: L.resumo(p), tendas: pint(pA, 'tendaGuerra').length, tendasLonge: Math.min(99, ...pint(pA, 'tendaGuerra').map(o => distR(o.x, o.y))) };
      }
      // o cerco de outro lugar do mesmo hexágono (a torre): fica fora da cena
      { const { p, L } = ger('ruinas', PE.marcadores.mk_torre, 'medio', { tipo: 'torre' }); out.outro = { tr: pint(p.anel, 'trincheira').length, resumo: L.resumo(p) }; }
      // o destruído: as casas da própria vila queimadas (por cima do desenho dela), sem a casa queimada solta no anel
      for (const [k, id, op] of [['vila', 'vila', { tamanho: 'vila', casas: 14 }], ['cidade', 'cidade', null], ['tribo', 'tribo', { moradias: 'iurte' }]]) {
        const { p, L } = ger(id, PE.marcadores.mk_vila, 'medio', op, ['marca']), pA = p.anel, R = pA.R, s = pA.sobreLugar || [];
        const den = (x, y) => x > R[0] && y > R[1] && x < R[2] && y < R[3];
        const nPred = id === 'vila' ? p.lugar.casas.length : p.lugar.predios.length;
        out['d ' + k] = { nPred, fuligem: s.filter(o => o.k === 'fuligem').length, desab: s.filter(o => o.k === 'casaQueimada').length, cham: s.filter(o => o.k === 'chamusco').length, soltas: pint(pA, 'casaQueimada').length, dentro: s.every(o => (o.x != null ? den(o.x, o.y) : true) && (o.pts ? o.pts.every(q => den(q[0], q[1]) || true) : true)),
          marcas: (pA.guerra || []).filter(q => q.k === 'casa').map(q => den(q.x + 0.5, q.y + 0.5)), info: pA.guerraInfo && pA.guerraInfo.marca, arrasado: pint(pA, 'arrasado').length, resumo: L.resumo(p) };
      }
      // o corrompido em volta (o −1,1): a terra roxa no anel, nada por cima do lugar
      { const h = Object.assign({}, PE.hexes['-1,1']), { p, L } = ger('vila', h, 'medio', null, ['marca']); out.c = { arr: pint(p.anel, 'arrasado').map(o => o.t), sobre: (p.anel.sobreLugar || []).length, resumo: L.resumo(p) }; }
      // os acampamentos: com os arredores em Muito cabem; no Médio, não — e o resumo diz
      for (const nv of ['medio', 'muito']) { const { p, L } = ger('vila', PE.marcadores.mk_vila, nv, null, ['exe0', 'exe1'], 9); out['camp ' + nv] = { exes: (p.anel.guerraInfo.exes || []).map(e => [e.tendas, e.quer]), fora: p.anel.guerraInfo.fora || [], resumo: L.resumo(p) }; }
      // a batalha fresca no anel
      { const { p } = ger('vila', PE.marcadores.mk_vila, 'muito', null, ['bat'], 9), R = p.anel.R; out.bat = { caidos: pint(p.anel, 'caidos').reduce((s, o) => s + o.itens.length, 0), fora: pint(p.anel, 'caidos').every(o => o.itens.every(q => !(q.x > R[0] && q.y > R[1] && q.x < R[2] && q.y < R[3]))), info: p.anel.guerraInfo.bat || null }; }
      // a janela: o botão do cerco diz que é em volta do lugar
      out.botao = G.itens(X.valida(PE.marcadores.mk_pedra).guerra).find(x => x.k === 'cerco').dica;
      return out;
    }, [PE, OPS]);
    for (const nv of ['medio', 'muito']) {
      const x = r['cerco ' + nv];
      ok(x.n >= 1 && x.lados.length === 4 && x.dist[0] >= 2.2 && x.dist[1] <= 2.4 && x.ds, nv + ': a trincheira dá a volta no lugar (nos quatro lados, a uns dois quadrados), com a direção dele em cada ponto: ' + j([x.n, x.lados, x.dist]));
      ok(x.mq.length >= 1 && x.mq.every(([d, vira]) => d >= 4 && vira), nv + ': as máquinas atrás da trincheira, viradas para o meio do lugar: ' + j(x.mq));
      ok(x.ar === 1 && x.info.cerco.emVolta && x.info.cerco.maq.ariete === 1, nv + ': o aríete diante do portão: ' + j([x.ar, x.info.cerco]));
      ok(x.fl >= 1, nv + ': as flechas dos tiros entre a trincheira e o lugar: ' + x.fl);
      ok(x.marcas.some(m => /^Cerco de Pedravale \(há 5 dias, Casa de Ferro\)$/.test(m)), nv + ': o marcador do mestre (sem "o lugar fica a…"): ' + j(x.marcas));
      ok(/o cerco de Pedravale: a trincheira em volta/.test(x.resumo), nv + ': o resumo diz o cerco em volta: ' + x.resumo);
    }
    ok(r['cerco muito'].tendas > r['cerco medio'].tendas && r['cerco muito'].info.exes && r['cerco muito'].info.exes[0].lado === 'cerco', 'com os arredores em Muito, o acampamento de quem cerca cabe: ' + j([r['cerco medio'].tendas, r['cerco muito'].tendas]));
    ok(r['cerco muito'].tendasLonge >= 3.4 && r['cerco medio'].tendasLonge >= 3.4, 'as tendas de quem cerca ficam do lado de fora da trincheira: ' + j([r['cerco medio'].tendasLonge, r['cerco muito'].tendasLonge].map(v => +v.toFixed(2))));
    ok(/sem lugar para o acampamento “Cerco de Ferro” \(os arredores não comportam; com os arredores em Muito cabe mais\)/.test(r['cerco medio'].resumo), 'no Médio, o resumo diz que no Muito cabe: ' + r['cerco medio'].resumo);
    ok(r.outro.tr === 0 && /o cerco de Pedravale fica fora da cena \(o lugar cercado é outro, no mesmo hexágono\)/.test(r.outro.resumo), 'o cerco de outro lugar do hexágono fica fora da cena: ' + r.outro.resumo);
    for (const k of ['vila', 'cidade', 'tribo']) {
      const x = r['d ' + k], quer = Math.max(1, Math.min(6, Math.round(x.nPred * 0.4)));
      ok(x.fuligem + x.desab === quer && x.soltas === 0 && x.marcas.length === Math.min(3, quer) && x.marcas.every(Boolean), k + ': o destruído queima umas quatro em cada dez casas do próprio lugar (de uma a seis), sem a casa solta no anel; os marcadores dentro dele: ' + j(x));
      ok(x.arrasado >= 1 && x.info.noLugar === quer && new RegExp('e ' + (quer === 1 ? 'uma casa do lugar queimada' : quer + ' casas do lugar queimadas')).test(x.resumo), k + ': a cinza no anel e o resumo: ' + x.resumo);
    }
    ok(r['d vila'].cham === r['d vila'].fuligem && r['d vila'].desab === 0, 'na vila (as casas abertas), a fuligem e o chão chamuscado: ' + j(r['d vila']));
    ok(r['d cidade'].desab === Math.min(2, r['d cidade'].fuligem + r['d cidade'].desab) && r['d cidade'].cham === 0, 'na cidade (com o telhado), as duas primeiras desabadas: ' + j(r['d cidade']));
    ok(r['d tribo'].desab === 0 && r['d tribo'].cham === r['d tribo'].fuligem, 'na tribo (as iurtes redondas), a fuligem na forma delas, sem desabar: ' + j(r['d tribo']));
    ok(r.c.arr.length >= 1 && r.c.arr.every(t2 => t2 === 'c') && r.c.sobre === 0 && /a terra corrompida do hexágono/.test(r.c.resumo), 'o corrompido: a terra roxa em volta, nada por cima do lugar: ' + j(r.c));
    ok(r['camp muito'].exes.length === 2 && r['camp muito'].exes.every(([tn]) => tn >= 3), 'com os arredores em Muito, os dois acampamentos cabem: ' + j(r['camp muito'].exes));
    ok(!r['camp medio'].exes.length && r['camp medio'].fora.length === 2 && /com os arredores em Muito cabe mais/.test(r['camp medio'].resumo), 'no Médio, eles não cabem, e o resumo sugere o Muito: ' + r['camp medio'].resumo);
    ok(r.bat.info && r.bat.caidos >= 2 && r.bat.fora, 'a batalha fresca no anel, fora do lugar: ' + j(r.bat));
    ok(/Em volta do lugar: a trincheira com as estacas/.test(r.botao), 'o botão do cerco diz que é em volta do lugar: ' + r.botao);
  }

  // ================= a janela =================
  if (parte('janela')) {
    const w = ms => page.waitForTimeout(ms);
    const G = () => ev(() => { const V = __tc.Gerador.vivo(); return V ? { lugar: V.lugar, op: JSON.parse(JSON.stringify(V.estado.op)), W: V.estado.plano.W, H: V.estado.plano.H, arr: V.estado.plano.arredores || null } : null; });
    const bts = id => ev(id => [...document.querySelectorAll('#' + id + ' button')].map(b => [b.textContent, b.getAttribute('aria-pressed')]), id);
    const notasHex = () => ev(() => [...document.querySelectorAll('.ger-tr .note')].map(n => n.textContent).filter(t => /hexágono/.test(t)));
    const resumo = () => page.locator('#ger-resumo').innerText();
    const opt = () => ev(() => JSON.parse(JSON.stringify({ genArr: __tc.App.opt.genArr, arrHist: __tc.App.opt.arrHist, arrAchados: __tc.App.opt.arrAchados })));
    const guardado = await ev(() => { const o = __tc.App.opt, g = JSON.stringify(o); delete o.genArr; delete o.arrHist; delete o.arrAchados; return g; });
    // vinda do marcador da vila ("Gerar este lugar…" no Mapa-múndi): a escolha dos arredores (o Médio de começo), a história
    // e os achados, o bloco do hexágono (com as marcas da guerra), o rio e os portões do mapa no Traçado
    await ev(PE => __tc.Gerador.abrir('vila', { op: { terreno: 'floresta' }, hora: 'dia', estacao: 'verao', hex: PE.marcadores.mk_vila, nome: 'Vau Velho', ops: { regiao: { bioma: 'floresta', agua: 'rio', caminho: 'estrada' } } }), PE); await w(1200);
    let g = await G();
    const g0 = g, r0 = await resumo();
    ok(j(await bts('ger-arredores')) === j([['Nenhum', 'false'], ['Pouco', 'false'], ['Médio', 'true'], ['Muito', 'false']]) && g.arr === 'medio', 'a escolha dos arredores, com o Médio de começo: ' + j(await bts('ger-arredores')));
    ok(await page.locator('#arr-hist').count() === 1 && await page.locator('#arr-achados').count() === 1 && await page.locator('#ger-hex-bloco #ger-guerra').count() === 1, 'a história e os achados dos arredores; o bloco do hexágono, com as marcas da guerra');
    const nt = await notasHex();
    ok(nt.includes('O rio vem do hexágono do Mapa-múndi: o rio entra pelo oeste e sai pelo nordeste.') && nt.some(t2 => /^Os portões ficam onde chegam os caminhos do hexágono do Mapa-múndi: /.test(t2)) && g.op.t.rioDe === 'o' && j(g.op.t.portoes) === j(['l', 's']), 'o Traçado diz o rio e os portões do mapa (no lugar das rosas): ' + j(nt));
    ok(new RegExp('os arredores Médio \\(' + g.W + ' × ' + g.H + ' quadrados\\)').test(r0) && /do hexágono 0, 0 do Mapa-múndi/.test(r0) && /Batalha do Vau/.test(r0), 'o resumo diz os arredores, o hexágono e a guerra: ' + r0);
    await foto('janela-vila', await page.locator('.modal').boundingBox());
    // o Muito: seis quadrados a mais de cada lado; a janela lembra
    await page.locator('#ger-arredores button', { hasText: 'Muito' }).click(); await w(1200);
    g = await G();
    ok(g.W === g0.W + 12 && g.H === g0.H + 12 && (await opt()).genArr === 'muito' && new RegExp('os arredores Muito \\(' + g.W + ' × ' + g.H + ' quadrados\\)').test(await resumo()), 'o Muito: a cena maior, e a janela lembra: ' + j([g0.W, g0.H, g.W, g.H]));
    // o Nenhum: o lugar sozinho; o hexágono não entra (a nota no bloco); sem a história, os achados e as notas do mapa
    await page.locator('#ger-arredores button', { hasText: 'Nenhum' }).click(); await w(1000);
    g = await G();
    ok(g.arr === null && g.W === g0.W - 16 && !/arredores|hexágono/.test(await resumo()), 'o Nenhum: o lugar sozinho, como sempre: ' + j([g.W, g.H]));
    ok(/^Com os arredores em Nenhum, o chão do hexágono não entra: escolha Pouco, Médio ou Muito\.$/.test(await page.locator('#ger-hex-nao').innerText()) && await page.locator('#arr-hist').count() === 0 && await page.locator('#ger-guerra').count() === 0 && !(await notasHex()).length, 'o Nenhum: a nota do hexágono; sem a história dos arredores, a guerra e as notas do mapa');
    await page.locator('#ger-arredores button', { hasText: 'Médio' }).click(); await w(1000);
    // a história nos arredores e os achados (a janela lembra)
    await page.locator('#arr-hist button[data-hist="incendio"]').click(); await w(1000);
    g = await G();
    ok(/a história: incêndio antigo/.test(await resumo()) && j(g.op.arrHist) === j(['incendio']) && j((await opt()).arrHist) === j(['incendio']), 'a história nos arredores: ' + j(g.op.arrHist));
    await page.locator('.sw', { has: page.locator('#arr-achados') }).click(); await w(900);
    g = await G();
    ok(g.op.arrAchados === false && (await opt()).arrAchados === false, 'os achados desligados (a janela lembra)');
    // as outras abas: a Tribo e as Ruínas também têm os arredores (e o hexágono); o Encontro, não
    await page.locator('#ger-lugar button', { hasText: 'Tribo' }).click(); await w(1200);
    g = await G();
    ok(g.lugar === 'tribo' && await page.locator('#ger-arredores').count() === 1 && g.arr === 'medio' && await page.locator('#ger-hex-bloco #ger-hex').count() === 1 && j(g.op.t.portoes) === j(['l', 's']), 'na Tribo, os arredores e o hexágono (os portões da paliçada nos caminhos do mapa): ' + j([g.lugar, g.arr, g.op.t && g.op.t.portoes]));
    await page.locator('#ger-lugar button', { hasText: 'Ruínas' }).click(); await w(1200);
    g = await G();
    ok(g.lugar === 'ruinas' && await page.locator('#ger-arredores').count() === 1 && g.arr === 'medio' && /os arredores Médio/.test(await resumo()), 'nas Ruínas, os arredores');
    await page.locator('#ger-lugar button', { hasText: 'Encontro' }).click(); await w(1200);
    ok(await page.locator('#ger-arredores').count() === 0 && await page.locator('#arr-hist').count() === 0, 'o Encontro não tem os arredores');
    await page.keyboard.press('Escape'); await w(400);
    // a Cidade de bairros: a nota no lugar da escolha (e o hexágono não entra)
    await ev(PE => __tc.Gerador.abrir('cidade', { op: { modo: 'bairros' }, hora: 'dia', hex: PE.marcadores.mk_vila }), PE); await w(1200);
    g = await G();
    ok(/^No mapa de bairros, os arredores não entram: só na cena completa\.$/.test(await page.locator('#ger-arredores-nao').innerText()) && g.arr === null && /^No mapa de bairros, o chão do hexágono não entra: só na cena completa\.$/.test(await page.locator('#ger-hex-nao').innerText()), 'na Cidade de bairros, as notas');
    await page.keyboard.press('Escape'); await w(400);
    // os modelos: o de antes (sem os arredores) abre o lugar sozinho, como era; o de agora guarda os arredores
    const md = await ev(() => {
      const L = __tc.Arredores.LUGARES.vila, st = L.padrao(), st2 = L.padrao();
      L.aplicarOpcoes(st, { tamanho: 'aldeia', terreno: 'campo', rio: true, muralha: false, casas: 6 }, { modelo: true });
      L.aplicarOpcoes(st2, { tamanho: 'aldeia', terreno: 'campo', arredores: 'pouco', arrHist: ['ruinas', 'x'], arrAchados: true }, { modelo: true });
      return { antes: [st.arredores, st.arrHist, st.arrAchados], agora: [st2.arredores, st2.arrHist, st2.arrAchados], opcoes: L.opcoesDe(st2), sem: L.opcoesDe(Object.assign(L.padrao(), { arredores: 'nenhum', arrHist: [] })) };
    });
    ok(j(md.antes) === j(['nenhum', [], false]) && j(md.agora) === j(['pouco', ['ruinas'], true]), 'o modelo de antes: o lugar sozinho; o de agora, com os arredores dele: ' + j([md.antes, md.agora]));
    ok(md.opcoes.arredores === 'pouco' && j(md.opcoes.arrHist) === j(['ruinas']) && md.opcoes.arrAchados === true && md.sem.arredores === 'nenhum' && !('arrHist' in md.sem), 'o modelo guarda os arredores: ' + j([md.opcoes, md.sem]));
    await ev(g => { const o = __tc.App.opt, v = JSON.parse(g); for (const k of Object.keys(o)) if (!(k in v)) delete o[k]; Object.assign(o, v); }, guardado);
  }

  // ================= a cena criada =================
  if (parte('cena')) {
    const w = ms => page.waitForTimeout(ms);
    // pela janela, como o Mapa-múndi pede ("Gerar este lugar…"): o plano fica guardado (window.__p14c) para comparar
    const criar = async (lugar, h, extra) => {
      await ev(([lugar, h, extra]) => __tc.Gerador.abrir(lugar, Object.assign({ hora: 'dia', estacao: 'verao', hex: h }, extra)), [lugar, h, extra]); await w(1200);
      await ev(() => { window.__p14c = __tc.Gerador.vivo().estado.plano; document.querySelectorAll('.toast').forEach(x => x.remove()); });
      await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 60000 }); await w(800);
    };
    const olhar = () => ev(() => {
      const u = __tc, sc = u.Store.scene(), p = window.__p14c, pL = p.lugar, c = sc.cell, R = p.anel.R, out = {};
      out.id = sc.id; out.nome = sc.name; out.tam = [sc.cols, sc.rows, p.W, p.H]; out.stretch = sc.bg.stretch; out.bg = !!sc.bg.asset; out.tone = sc.tone;
      out.toast = (document.querySelector('.toast') || {}).textContent || '';
      const den = t2 => t2.x / c > R[0] && t2.y / c > R[1] && t2.x / c < R[2] && t2.y / c < R[3];
      out.ocultos = sc.tokens.filter(t2 => t2.hidden && t2.prop === 'interesse').map(t2 => [t2.name, den(t2)]);
      out.entradas = sc.tokens.filter(t2 => t2.prop === 'entrada').map(t2 => [t2.gera && t2.gera.t, den(t2), !!t2.hidden]);
      // o que a cena só do lugar teria (as paredes, as luzes e os tokens), deslocado para o meio dos arredores
      const tmp = { tokens: [], walls: [], lights: [], shapes: [], effects: [], tone: sc.tone, light: sc.light, cell: c, cols: pL.W, rows: pL.H };
      u.Arredores.AD[p.lugarId].montar(tmp, JSON.parse(JSON.stringify(pL)), c, { relevo: true });
      const d = p.a * c, chave = w2 => [w2.k || '', Math.round(w2.x1 + d), Math.round(w2.y1 + d), Math.round(w2.x2 + d), Math.round(w2.y2 + d)].join(','), tem = new Set(sc.walls.map(w2 => [w2.k || '', Math.round(w2.x1), Math.round(w2.y1), Math.round(w2.x2), Math.round(w2.y2)].join(',')));
      out.paredes = [tmp.walls.length, tmp.walls.filter(w2 => !tem.has(chave(w2))).length];
      const tk = new Set(sc.tokens.map(t2 => t2.name + '@' + Math.round(t2.x) + ',' + Math.round(t2.y)));
      out.tokens = [tmp.tokens.length, tmp.tokens.filter(t2 => !tk.has(t2.name + '@' + Math.round(t2.x + d) + ',' + Math.round(t2.y + d))).map(t2 => t2.name)];
      out.luzes = [tmp.lights.length, sc.lights.length];
      return out;
    });
    // a vila do marcador, de noite, com a guerra do hexágono (a batalha fresca, as casas queimadas)
    await criar('vila', PE.marcadores.mk_vila, { op: { terreno: 'floresta' }, hora: 'noite', id: 'cena_mundo_teste14c', nome: 'Vau Velho' });
    let r = await olhar();
    ok(r.id === 'cena_mundo_teste14c' && r.nome === 'Vau Velho' && r.tone === 'noite', 'a cena criada pela janela, com o id e o nome que o marcador pediu: ' + j([r.id, r.nome, r.tone]));
    ok(r.tam[0] === r.tam[2] && r.tam[1] === r.tam[3] && r.stretch && r.bg, 'o tamanho da cena é o dos arredores, com o fundo esticado: ' + j(r.tam));
    ok(r.paredes[0] > 10 && r.paredes[1] === 0 && r.tokens[1].length === 0 && r.luzes[1] >= r.luzes[0], 'as paredes, os tokens e as luzes da vila, deslocados para o meio: ' + j([r.paredes, r.tokens, r.luzes]));
    ok(r.ocultos.some(([n2, dn]) => /^Campo de batalha: Batalha do Vau/.test(n2) && !dn) && r.ocultos.filter(([n2]) => n2 === 'Casa queimada').length >= 1 && r.ocultos.filter(([n2]) => n2 === 'Casa queimada').every(([, dn]) => dn), 'os marcadores ocultos do mestre: a batalha nos arredores, as casas queimadas dentro da vila: ' + j(r.ocultos));
    ok(/Os arredores \(Médio\) vieram junto\./.test(r.toast), 'o aviso diz que os arredores vieram junto: ' + r.toast);
    await foto('cena-vila');
    // o forte cercado (Pedravale): o marcador do cerco nos arredores; a entrada da masmorra dentro do forte
    await criar('ruinas', PE.marcadores.mk_pedra, { op: { tipo: 'forte', arredores: 'muito' }, id: 'cena_mundo_teste14c2', nome: 'Pedravale' });
    r = await olhar();
    ok(r.id === 'cena_mundo_teste14c2' && r.tam[0] === r.tam[2] && r.tokens[1].length === 0 && r.paredes[1] === 0, 'o forte: os tokens e as paredes dele, deslocados: ' + j([r.tam, r.tokens, r.paredes]));
    ok(r.ocultos.some(([n2, dn]) => /^Cerco de Pedravale \(há 5 dias, Casa de Ferro\)$/.test(n2) && !dn) && j(r.entradas) === j([['masmorra', true, true]]), 'o marcador do cerco nos arredores; a entrada da masmorra (oculta) dentro do forte: ' + j([r.ocultos, r.entradas]));
    await foto('cena-forte');
  }

  // ================= robusto =================
  if (parte('robusto')) {
    const r = await ev(PE => {
      const u = __tc, A = u.Arredores, X = u.HexCena, G = u.MarcasGuerra, out = { casos: 0, erros: [], mal: [], max: 0 };
      let s = 4242; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }, pick = a => a[Math.floor(rnd() * a.length) % a.length];
      const hexes = Object.values(PE.hexes).filter(h => h && h.ter && h.ter !== 'agua').concat(Object.values(PE.marcadores));
      const OPS = {
        vila: () => ({ tamanho: pick(['aldeia', 'vila']), terreno: pick(['campo', 'floresta', 'areia', 'neve']), rio: rnd() < 0.7, muralha: rnd() < 0.5, casas: 8 }),
        cidade: () => ({ modo: 'completa', tamanho: 'pequena', terreno: pick(['campo', 'floresta', 'areia', 'neve']), rio: rnd() < 0.6, muralha: rnd() < 0.7, mar: rnd() < 0.3, predios: 30 }),
        tribo: () => ({ moradias: pick(['tenda', 'cabana', 'iurte', 'palafita', 'iglu']), tamanho: 'pequena', terreno: pick(['campo', 'floresta', 'selva', 'deserto', 'neve', 'pantano']), palicada: rnd() < 0.7, sagrados: true, vida: rnd() < 0.8 }),
        ruinas: () => ({ tipo: pick(['templo', 'torre', 'forte', 'circulo', 'mina']), tamanho: pick(['pequeno', 'medio']), terreno: pick(['campo', 'floresta', 'areia', 'neve']), masmorra: true, mato: rnd() < 0.7 }),
        porto: () => ({ tipo: pick(['vila', 'porto']), tamanho: 'pequeno', terreno: pick(['campo', 'floresta', 'areia', 'neve']), navios: true, farol: true, mercado: true }),
      };
      for (let k = 0; k < 70; k++) {
        const id = pick(Object.keys(OPS)), L = A.LUGARES[id], nv = pick(['pouco', 'medio', 'muito']), h = rnd() < 0.55 ? pick(hexes) : null, hex = h ? X.valida(h) : null;
        const st = Object.assign(L.padrao(), OPS[id](), { arredores: nv, arrHist: rnd() < 0.4 ? [pick(['batalha', 'acampamento', 'incendio', 'ruinas'])] : [], arrAchados: rnd() < 0.5 });
        if (hex) L.preencherHex(st, hex);
        const seed = 1 + Math.floor(rnd() * 1e6), nome = id + ' ' + nv + ' ' + seed + (hex ? ' ' + hex.k : '');
        try {
          const t0 = performance.now(), p = L.gerar(st, Object.assign({ estilo: 'comum', seed, estacao: L.aceitaEstacao ? pick(['verao', 'inverno']) : undefined }, hex ? { hex, guerra: hex.guerra ? G.padrao(hex.guerra) : null } : null));
          out.max = Math.max(out.max, performance.now() - t0);
          L.resumo(p); const cv = document.createElement('canvas'); L.previa(cv, p, 230, 165, { relevo: true });
          const pA = p.anel, R = pA.R, den = (x, y) => x > R[0] + 0.3 && y > R[1] + 0.3 && x < R[2] - 0.3 && y < R[3] - 0.3;
          if (pA.arvores.some(a => den(a.x, a.y)) || pA.objetos.some(o => den(o.x + 0.5, o.y + 0.5)) || pA.pintados.some(o => o.x != null && den(o.x, o.y) && o.k !== 'ponte')) out.mal.push(nome);
          out.casos++;
        } catch (e) { out.erros.push(nome + ': ' + e.message); }
      }
      return out;
    }, PE);
    ok(!r.erros.length && r.casos === 70, 'lugares, níveis e sementes sorteados, com e sem o hexágono: sem erro (' + r.casos + ' casos): ' + j(r.erros.slice(0, 3)));
    ok(!r.mal.length, 'nada do anel dentro do lugar: ' + j(r.mal.slice(0, 5)));
    ok(r.max < 1500, 'cada plano em menos de 1,5 s (o mais lento: ' + Math.round(r.max) + ' ms)');
  }

  if (t.errs.length) { console.log('console:', t.errs.slice(0, 6).join('\n')); }
  ok(!t.errs.filter(e => !/favicon|Failed to load resource/.test(e)).length, 'nenhum erro no console');
  await t.close();
  console.log(fails ? `${fails} de ${n} verificações FALHARAM` : `ok: ${n} verificações`);
  process.exit(fails ? 1 : 0);
})();
