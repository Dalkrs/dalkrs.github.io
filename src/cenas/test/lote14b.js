// Lote 14, parte 14b: as marcas da guerra na cena do hexágono (a página das Cenas sozinha, no navegador; os pedidos vêm
// do núcleo do Mapa-múndi, mundo/nucleo.js, num mundinho de teste com a guerra).
//   · (SO=dados) a guerra do pedido conferida; os botões da janela (o exército escondido no mapa começa desligado; a
//     batalha de mais de 7 dias vira a Batalha antiga); a escolha; as tendas pelas tropas;
//   · (SO=igual) com as marcas desligadas, o plano é o de sem guerra (a Região livre e o Encontro);
//   · (SO=batalha) a batalha fresca: o campo, os caídos (só nas casas dele, longe da borda, mais de quem perdeu), as
//     armas, os estandartes (o de quem venceu fincado, o de quem perdeu caído; no empate, os dois caídos), as brasas no
//     dia e no seguinte (a zona, a luz e o chão chamuscado), os corvos depois, as covas do terceiro dia em diante, menos
//     caídos a cada fase; com mais de 7 dias, a Batalha antiga da história (o nome, os dias e a cor de quem perdeu);
//   · (SO=marca) o destruído (a cinza por cima do chão, as árvores carbonizadas, os arbustos e as flores queimados, a
//     casa queimada com a chaminé, a fuligem nas construções da situação) e o corrompido (a terra roxa, os veios, as
//     árvores mortas e roxas, os cristais negros com a luz);
//   · (SO=acampamento) os acampamentos: as tendas (sem se encostar, fora do caminho e da água, longe da borda), a tenda
//     do comando, o estandarte, as fogueiras, as provisões, as paredes de visão, as cores da facção; mais tropas, mais
//     tendas (até 16); as máquinas paradas; o escondido no mapa; no Encontro, longe do meio da situação;
//   · (SO=cerco) o cerco: a trincheira no lado do lugar (leste, oeste, norte e sul), as estacas do lado de lá, as
//     máquinas atrás dela viradas para o lugar (o aríete na frente), o acampamento de quem cerca atrás delas, o de dentro
//     não acampa; o posto sem o exército; sem máquinas, nenhuma; o cerco desligado deixa o acampamento comum;
//   · (SO=janela) a janela vinda do Mapa-múndi: os botões no bloco do hexágono, desligar um (nas duas abas), as notas,
//     a chave do hexágono desligada, a batalha antiga sem mexer no que a janela lembra; a cena criada (os marcadores
//     ocultos com os nomes, as fogueiras com a luz);
//   · (SO=robusto) guerras sorteadas nos dois lugares: sem erro e rápido.
// FOTOS=<pasta> guarda capturas.
const path = require('path'), fs = require('fs');
const { open } = require('./lib');
const N = require(path.join(__dirname, '..', '..', '..', 'mundo', 'nucleo.js'));
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;

/* O mundinho da 14a (5×5 hexágonos de floresta em volta do 0,0, com água a nordeste, campo a leste, montanha a sudoeste
   e savana ao sul; o rio e a estrada) com a guerra: a Casa de Ferro (vermelha, com a bandeira própria) e Os Corvos
   (azuis); a Batalha do Vau no 0,0 há dias (Ferro venceu, vitória clara), uma escaramuça antiga no −1,0 (com um exército
   escondido no mapa), o 0,0 e o 1,0 destruídos, o −1,1 corrompido; exércitos de Ferro (dois, com catapultas) e dos
   Corvos no 0,0; o cerco de Pedravale (no 0,1, dos Corvos) pela Casa de Ferro, com a guarda dos Corvos dentro. */
function mundo(orient, dias) {
  const m = N.normalizarMapa(N.mapaNovo('Teste 14b'));
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
  const cv = c(0, 1), c0 = c(0, 0);
  m.objs.push(Object.assign(N.objNovo('r', { pts: [[cv.x - 80, cv.y - 50], [cv.x + 80, cv.y - 50], [cv.x + 80, cv.y + 50], [cv.x - 80, cv.y + 50]] }), { id: 'rg_pedra', nome: 'Vale de Pedra', fac: 'fc_corvos' }));
  m.objs.push(Object.assign(N.objNovo('m', { x: cv.x + 12, y: cv.y - 6 }), { id: 'mk_pedra', nome: 'Pedravale', ic: 'castelo', estr: { nome: 'Muralha', def: 4, hp: 80, hpMax: 100 }, cerco: { fac: 'fc_ferro', d: 35 } }));
  const exe = (id, nome, fac, x, y, tropas, maq, oculto) => Object.assign(N.objNovo('g', { x, y }), { id, nome, fac, tipo: 'exercito', oculto: !!oculto, exe: { cmd: { nome: 'Cmd' }, moral: 5, unid: [{ id: id + '_u', nome: 'Infantaria', tropas, maq: maq || {} }] } });
  m.objs.push(exe('gr_ferro1', 'Hoste de Ferro', 'fc_ferro', c0.x + 5, c0.y + 4, 1200, { catapulta: 2 }));
  m.objs.push(exe('gr_ferro2', 'Vanguarda de Ferro', 'fc_ferro', c0.x - 6, c0.y - 3, 300, {}));
  m.objs.push(exe('gr_corvos1', 'Bando dos Corvos', 'fc_corvos', c0.x + 9, c0.y - 8, 450, {}));
  m.objs.push(exe('gr_cerco', 'Cerco de Ferro', 'fc_ferro', cv.x - 10, cv.y + 8, 2600, { trabuco: 1, ariete: 1, catapulta: 3 }));
  m.objs.push(exe('gr_dentro', 'Guarda de Pedravale', 'fc_corvos', cv.x + 14, cv.y - 4, 200, {}));
  m.objs.push(exe('gr_oculto', 'Sombras', null, c(-1, 0).x, c(-1, 0).y, 80, {}, true));
  m.guerra = { tipos: [], bats: [{ id: 'bt1', d: 40 - dias, nome: 'Batalha do Vau', a: { nome: 'Hoste de Ferro', g: 'gr_ferro1', fac: 'fc_ferro' }, b: { nome: 'Bando dos Corvos', g: 'gr_corvos1', fac: 'fc_corvos' }, modo: 'd100', mom: [], fim: { vence: 'a', tam: 3, como: 'dados' }, notas: [], hex: '0,0' },
    { id: 'bt0', d: 10, nome: 'Escaramuça antiga', a: { nome: 'A' }, b: { nome: 'B' }, fim: { vence: null, tam: 0 }, hex: '-1,0' }], hexes: { '1,0': 'd', '-1,1': 'c', '0,0': 'd' } };
  const mm = N.normalizarMapa(m), out = {};
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) out[q + ',' + r] = N.hexParaCena(mm, q, r);
  return out;
}
const PE = mundo('pe', 2), DT = mundo('deitado', 2);
// guerras sorteadas (para o robusto)
function sorteadas(k) {
  let s = 4321 + k * 613; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const cor = () => '#' + Math.floor(r() * 0xffffff).toString(16).padStart(6, '0'), cores = () => [cor(), cor()];
  const out = [];
  for (let i = 0; i < 24; i++) {
    const h = JSON.parse(JSON.stringify(PE[['0,0', '1,0', '-1,1', '0,1', '-1,0', '1,1', '0,2', '-2,0'][i % 8]] || PE['0,0'])), g = {};
    if (r() < 0.6) g.bat = { nome: r() < 0.5 ? 'B' + i : '', dias: Math.floor(r() * 12), tam: Math.floor(r() * 5), vence: ['a', 'b', null][Math.floor(r() * 3)], a: { nome: 'A', cores: cores() }, b: { nome: 'B', cores: cores() }, tropas: r() < 0.5 ? Math.floor(r() * 20000) : undefined };
    if (r() < 0.4) g.marca = r() < 0.5 ? 'd' : 'c';
    if (r() < 0.6) g.exes = Array.from({ length: 1 + Math.floor(r() * 2) }, (_, j) => ({ nome: 'E' + j, fac: '', cores: cores(), tropas: 1 + Math.floor(r() * 9000), n: 1, maq: r() < 0.5 ? { catapulta: Math.floor(r() * 3), trabuco: Math.floor(r() * 2), ariete: Math.floor(r() * 2) } : undefined, lado: j === 0 && r() < 0.4 ? 'cerco' : undefined }));
    if (r() < 0.4) g.cerco = { nome: 'L' + i, fac: 'F', cores: cores(), dias: Math.floor(r() * 9), u: r(), v: r(), maq: r() < 0.6 ? { catapulta: 1 + Math.floor(r() * 3), ariete: Math.floor(r() * 2) } : undefined };
    h.guerra = g;
    out.push(h);
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
  const NEUTRAS = ['#8a7a5e', '#4e4434'];

  // ================= os dados =================
  if (parte('dados')) {
    const r = await ev(([PE, NEUTRAS]) => {
      const u = __tc, X = u.HexCena, M = u.MarcasGuerra, out = {};
      out.nulos = [X.validaGuerra(null), X.validaGuerra({}), X.validaGuerra({ bat: 5, marca: 'x', exes: 'a', cerco: 3 }), X.validaGuerra('x')].map(v => v === null);
      out.v = X.validaGuerra({ bat: { nome: '  Vau  ', dias: -3, tam: 9, vence: 'x', a: { nome: '', cores: ['#zz0000', '#00ff00'] }, b: null, tropas: 1e9 }, marca: 'c',
        exes: [{ nome: 'A', tropas: 10, cores: ['#AA0000', '#00aa00'], maq: { catapulta: 2.4, foguete: 3, ariete: -1 }, oculto: true, lado: 'cerco', n: 0 }, { nome: 'B', tropas: 0 }, { tropas: 5 }], maisExes: 3, dentro: 2.2, cerco: { nome: '', u: 7, v: -1, dias: 2.6, maq: {} } });
      out.hex = X.valida(PE['0,0']).guerra;
      out.hexIgual = JSON.stringify(out.hex) === JSON.stringify(X.validaGuerra(PE['0,0'].guerra));
      out.semGuerra = X.valida(Object.assign({}, PE['0,0'], { guerra: undefined })).guerra;
      const g00 = out.hex, gm10 = X.valida(PE['-1,0']).guerra, g01 = X.valida(PE['0,1']).guerra;
      out.itens00 = M.itens(g00).map(x => [x.k, x.on, x.n]);
      out.itensM10 = M.itens(gm10).map(x => [x.k, x.on, x.n]);
      out.itens01 = M.itens(g01).map(x => [x.k, x.on, x.n]);
      out.padrao = [M.padrao(g00), M.padrao(gm10), M.padrao(null)];
      out.valida = [M.valida(g00, ['exe1', 'zz', 'bat']), M.valida(g00, undefined), M.valida(g00, []), M.valida(gm10, ['exe0'])];
      const e1 = M.escolha(g00, ['bat']), e2 = M.escolha(gm10, undefined), e3 = M.escolha(g00, []), e4 = M.escolha(g00, undefined), e5 = M.escolha(null, ['bat']);
      out.escolha = [e1 && Object.keys(e1), e2 && Object.keys(e2), e3, e4 && Object.keys(e4), e5, e4 && e4.exes.map(e => e.nome)];
      out.comHist = [M.comHistoria(['incendio'], { velha: {} }), M.comHistoria(['batalha'], { velha: {} }), M.comHistoria(['ruinas'], { bat: {} }), M.comHistoria([], null)];
      out.tendas = [0, 50, 450, 1500, 6000, 1e6].map(M.tendasDe);
      out.neutras = NEUTRAS;
      return out;
    }, [PE, NEUTRAS]);
    ok(r.nulos.every(Boolean), 'a guerra sem nada que preste: null');
    ok(j(r.v.bat) === j({ nome: 'Vau', dias: 0, tam: 4, vence: null, a: { nome: 'Lado', cores: NEUTRAS }, b: { nome: 'Lado', cores: NEUTRAS }, tropas: 1e7 }), 'a batalha conferida (os dias, o tamanho, quem venceu, as cores, as tropas): ' + j(r.v.bat));
    ok(r.v.marca === 'c' && j(r.v.exes) === j([{ nome: 'A', fac: '', cores: ['#aa0000', '#00aa00'], tropas: 10, n: 1, maq: { catapulta: 2 }, oculto: true, lado: 'cerco' }]), 'os exércitos conferidos (até dois, com tropas; as máquinas que a cena desenha): ' + j(r.v.exes));
    ok(r.v.maisExes === 3 && r.v.dentro === 2 && j(r.v.cerco) === j({ nome: 'o lugar', fac: '', cores: NEUTRAS, dias: 3, u: 1, v: 0 }), 'o cerco conferido (o lugar dentro do tijolo, sem máquinas): ' + j(r.v.cerco));
    ok(r.hexIgual && r.hex.bat && r.hex.bat.dias === 2 && r.hex.marca === 'd' && r.hex.exes.length === 2 && r.semGuerra === null, 'o pedido do hexágono leva a guerra conferida (sem ela, null)');
    ok(j(r.itens00.map(x => [x[0], x[1]])) === j([['bat', true], ['marca', true], ['exe0', true], ['exe1', true]]) && r.itens00[0][2] === 'Batalha do Vau (há 2 dias)' && r.itens00[1][2] === 'Hexágono destruído' && r.itens00[2][2] === 'Acampamento: Hoste de Ferro (1.500 tropas)', 'os botões do 0,0: ' + j(r.itens00));
    ok(r.itensM10[0][2] === 'Escaramuça antiga (há 30 dias): vira a Batalha antiga' && r.itensM10[1][1] === false && /escondido no mapa$/.test(r.itensM10[1][2]), 'a batalha antiga e o exército escondido (desligado de começo): ' + j(r.itensM10));
    ok(j(r.itens01.map(x => x[0])) === j(['exe0', 'cerco']) && r.itens01[1][2] === 'Cerco de Pedravale (há 5 dias)', 'os botões do cerco: ' + j(r.itens01));
    ok(j(r.padrao) === j([['bat', 'marca', 'exe0', 'exe1'], ['bat'], []]), 'as de começo: ' + j(r.padrao));
    ok(j(r.valida) === j([['bat', 'exe1'], ['bat', 'marca', 'exe0', 'exe1'], [], ['exe0']]), 'a escolha conferida: ' + j(r.valida));
    ok(j(r.escolha) === j([['bat'], ['velha'], null, ['bat', 'marca', 'exes'], null, ['Hoste de Ferro', 'Bando dos Corvos']]), 'o que o gerador usa (a batalha de mais de 7 dias vai para a história): ' + j(r.escolha));
    ok(j(r.comHist) === j([['batalha', 'incendio'], ['batalha'], ['ruinas'], []]), 'a história com a batalha antiga: ' + j(r.comHist));
    ok(j(r.tendas) === j([3, 3, 8, 11, 15, 16]), 'as tendas pelas tropas (até 16): ' + j(r.tendas));
  }

  // ================= com as marcas desligadas, o plano de sem guerra =================
  if (parte('igual')) {
    const r = await ev(([PE, DT]) => {
      const u = __tc, out = [];
      for (const [nome, HX] of [['pe', PE], ['dt', DT]]) for (const k of ['0,0', '0,1', '1,0', '-1,1', '-1,0']) {
        const h = HX[k], sem = Object.assign({}, h, { guerra: undefined });
        for (const seed of [1, 2]) {
          const reg = o => u.Regiao.gerar(Object.assign({ bioma: h.ter, seed, agua: 'surpresa', mistura: 'media', historia: seed === 2 ? ['incendio'] : undefined, achados: true }, o));
          const enc = o => u.Encontro.gerar(Object.assign({ terreno: 'floresta', situacao: 'surpresa', seed, chao: 2, historia: seed === 1 ? ['ruinas'] : undefined, achados: true }, o));
          out.push([nome + ' ' + k + ' ' + seed, JSON.stringify(reg({ hex: h, guerra: [] })) === JSON.stringify(reg({ hex: sem })), JSON.stringify(enc({ hex: h, guerra: [] })) === JSON.stringify(enc({ hex: sem }))]);
        }
      }
      return out;
    }, [PE, DT]);
    const mal = r.filter(x => !x[1] || !x[2]);
    ok(!mal.length, 'com todas as marcas desligadas, o plano é o de sem guerra (' + r.length + ' casos, nos dois lugares): ' + j(mal));
  }

  // ================= a batalha =================
  if (parte('batalha')) {
    const r = await ev(PE => {
      const u = __tc, out = {}, h0 = PE['0,0'], bat = h0.guerra.bat;
      const comBat = extra => Object.assign({}, h0, { guerra: { bat: Object.assign({}, bat, extra) } });
      const pint = (p, k) => p.pintados.filter(o => o.k === k);
      const itens = (p, k) => pint(p, k).reduce((s, o) => s + (o.itens || []).length, 0);
      for (const d of [0, 1, 2, 5, 8]) {
        const p = u.Regiao.gerar({ bioma: 'floresta', tamanho: 'grande', seed: 7, hex: comBat({ dias: d }), agua: 'rio', caminho: 'trilha' });
        const cai = pint(p, 'caidos').flatMap(o => o.itens);
        out[d] = { caidos: cai.length, armas: itens(p, 'armasCaidas'), covas: itens(p, 'covas'), corvos: itens(p, 'corvos'), cham: itens(p, 'chamusco'), brasas: p.zonas.filter(z => z.fx === 'brasas').length, luz: p.luzes.filter(l => l.c === '#ff8a3a').length,
          finc: pint(p, 'estandarte').map(o => o.c1), caido: pint(p, 'estandarteCaido').map(o => o.c1), info: p.guerraInfo || null, marcas: (p.guerra || []).map(q => q.n), hist: (p.historia || []).map(q => [q.k, q.n, q.txt || null]),
          rasgado: pint(p, 'estandarteRasgado').map(o => o.cor), resumo: u.Regiao.LUGAR.resumo(p),
          // os caídos: nas casas do campo (o campo ou o caminho), longe da borda; as cores dos lados
          bons: cai.every(q => q.x >= 2.5 && q.y >= 2.5 && q.x <= p.W - 2.5 && q.y <= p.H - 2.5 && [5, 1].includes(p.occ[Math.floor(q.y) * p.W + Math.floor(q.x)])),
          deB: cai.filter(q => q.c1 === bat.b.cores[0]).length, deA: cai.filter(q => q.c1 === bat.a.cores[0]).length };
      }
      // o empate: os dois estandartes caídos
      const pe = u.Regiao.gerar({ bioma: 'floresta', tamanho: 'grande', seed: 7, hex: comBat({ dias: 2, vence: null, tam: 0 }), agua: 'rio', caminho: 'trilha' });
      out.empate = { finc: pint(pe, 'estandarte').length, caido: pint(pe, 'estandarteCaido').map(o => o.c1) };
      // no Encontro (com a situação): o campo longe do meio dela
      const ps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(seed => u.Encontro.gerar({ terreno: ['floresta', 'campo', 'savana', 'deserto'][seed % 4], situacao: 'surpresa', seed, chao: 2, hex: comBat({ dias: 1 }) }));
      // (o campo fica a pelo menos 0,45 × (o raio do meio da situação + o do campo) do meio dela: o que se pede, no mais perto)
      out.enc = ps.map(p => { const m = (p.guerra || []).find(q => q.k === 'batalha'); return m ? Math.hypot(m.cx - p.foco[0], m.cy - p.foco[1]) - 0.45 * (Math.hypot(p.W, p.H) * 0.17 + m.R) : null; });
      // (nos dez Encontros: os caídos só nas casas do campo ou no caminho, e longe da borda)
      const cai = ps.flatMap(p => pint(p, 'caidos').flatMap(o => o.itens).map(q => [q.x, q.y, p.W, p.H, p.occ[Math.floor(q.y) * p.W + Math.floor(q.x)]]));
      out.encCaidos = [cai.length, cai.filter(([x, y, W, H, v]) => ![5, 1].includes(v)).length, Math.min(...cai.map(([x, y, W, H]) => Math.min(x, y, W - x, H - y)))];
      return out;
    }, PE);
    const A = '#b03a2e', B = '#2f5f9e';
    ok(r[0].brasas >= 1 && r[0].luz === r[0].brasas && r[0].cham === r[0].brasas && r[0].corvos === 0 && r[0].covas === 0, 'no dia: as brasas (a zona, a luz e o chão chamuscado), sem corvos e sem covas: ' + j([r[0].brasas, r[0].luz, r[0].cham, r[0].corvos]));
    ok(r[1].brasas >= 1 && r[1].corvos >= 1, 'no dia seguinte: as brasas e os corvos: ' + j([r[1].brasas, r[1].corvos]));
    ok(r[2].brasas === 0 && r[2].luz === 0 && r[2].corvos >= 1 && r[2].covas === 0 && r[2].caidos < r[0].caidos, 'com dois dias: sem brasas, os corvos, menos caídos: ' + j([r[2].brasas, r[2].corvos, r[2].caidos, r[0].caidos]));
    ok(r[5].covas >= 1 && r[5].corvos >= 1 && r[5].caidos < r[2].caidos && r[5].armas < r[0].armas, 'com cinco dias: as covas, menos caídos e menos armas: ' + j([r[5].covas, r[5].caidos, r[5].armas]));
    ok([0, 1, 2, 5].every(d => r[d].bons && r[d].caidos >= 2), 'os caídos só nas casas do campo (ou no caminho), longe da borda');
    ok(r[0].deB > r[0].deA, 'mais caídos de quem perdeu (nas cores dele): ' + j([r[0].deB, r[0].deA]));
    ok(r[2].finc.includes(A) && r[2].caido.includes(B), 'o estandarte de quem venceu fincado; o de quem perdeu, caído: ' + j([r[2].finc, r[2].caido]));
    ok(r.empate.finc === 0 && r.empate.caido.length >= 1, 'no empate, nenhum fincado: ' + j(r.empate));
    ok(r[2].marcas.includes('Campo de batalha: Batalha do Vau (há 2 dias)') && r[0].marcas.includes('Campo de batalha: Batalha do Vau (hoje)') && r[1].marcas.includes('Campo de batalha: Batalha do Vau (ontem)'), 'o marcador do mestre: ' + j(r[2].marcas));
    ok(/o campo de batalha \(Batalha do Vau, hoje\) com as brasas ainda acesas/.test(r[0].resumo) && /o campo de batalha \(Batalha do Vau, há 5 dias\) com as covas/.test(r[5].resumo), 'o resumo diz: ' + r[5].resumo);
    ok(!r[8].info && r[8].caidos === 0 && j(r[8].hist) === j([['batalha', 'Batalha antiga: Batalha do Vau (há 8 dias)', 'batalha antiga (Batalha do Vau, há 8 dias)']]) && j(r[8].rasgado) === j([B]), 'com 8 dias: a Batalha antiga da história (o nome, os dias e a cor de quem perdeu): ' + j([r[8].hist, r[8].rasgado]));
    ok(/a história: batalha antiga \(Batalha do Vau, há 8 dias\)/.test(r[8].resumo), 'e o resumo diz: ' + r[8].resumo);
    ok(r.enc.every(d => d == null || d >= -0.01) && r.enc.some(d => d != null), 'no Encontro, o campo de batalha longe do meio da situação: ' + j(r.enc));
    ok(r.encCaidos[0] > 30 && r.encCaidos[1] === 0 && r.encCaidos[2] >= 2.5, 'nos Encontros, os caídos só nas casas do campo (ou no caminho) e longe da borda: ' + j(r.encCaidos));
  }

  // ================= o destruído e o corrompido =================
  if (parte('marca')) {
    const r = await ev(PE => {
      const u = __tc, M = u.Encontro.motor, out = {};
      const pint = (p, k) => p.pintados.filter(o => o.k === k);
      const ARV = s => !['juncos', 'cacto', 'cristal', 'cristalNegro', 'flor', 'cogumelo'].includes(s);
      for (const [k, t] of [['1,0', 'd'], ['-1,1', 'c']]) {
        const lista = [];
        for (const seed of [3, 4, 5]) {
          const p = u.Regiao.gerar({ bioma: PE[k].ter, tamanho: 'grande', seed, hex: PE[k], agua: 'surpresa', caminho: 'trilha' });
          const polis = pint(p, 'arrasado').map(o => o.pts), dentro = (x, y) => polis.some(pts => M.dentroPoli(pts, x, y));
          const arv = p.arvores.filter(a => ARV(a.esp) && dentro(a.x, a.y));
          const casas = pint(p, 'casaQueimada');
          lista.push({ t: pint(p, 'arrasado').map(o => o.t), info: p.guerraInfo && p.guerraInfo.marca, n: polis.length, arv: arv.length,
            queim: arv.every(a => a.esp === 'queimada'), mortas: arv.every(a => a.esp === 'morta' && a.pal === 'corrompida'),
            arbustos: p.objetos.filter(o => ['arbusto', 'flores', 'cogumelos'].includes(o.id) && dentro(o.x + 0.5, o.y + 0.5)).length,
            casas: casas.length, chamines: casas.every(o => [3, 1].includes(p.occ[Math.floor(o.ch[1]) * p.W + Math.floor(o.ch[0])])), marcas: (p.guerra || []).map(q => q.n),
            veios: pint(p, 'veios').reduce((s, o) => s + o.linhas.length, 0), cristais: pint(p, 'cristais').filter(o => o.cor === 'negro').length, luzRoxa: p.luzes.filter(l => l.c === '#b06cf0').length, resumo: u.Regiao.LUGAR.resumo(p) });
        }
        out[t] = lista;
      }
      // a fuligem: as construções da situação (o moinho e o celeiro) que ficam na cinza
      let fu = null;
      for (let seed = 1; seed <= 16 && !fu; seed++) {
        const p = u.Encontro.gerar({ terreno: 'campo', situacao: 'moinho', seed, chao: 2, hex: PE['1,0'] });
        const polis = pint(p, 'arrasado').map(o => o.pts), na = p.predios.filter(k => polis.some(pts => M.dentroPoli(pts, k.x + k.w / 2, k.y + k.h / 2)));
        if (na.length) fu = { na: na.length, fuligem: pint(p, 'fuligem').length };
      }
      out.fuligem = fu;
      return out;
    }, PE);
    ok(r.d.every(x => x.n >= 1 && x.t.every(t => t === 'd') && x.info.manchas === x.n && x.queim && x.arbustos === 0), 'o destruído: a cinza, as árvores carbonizadas, sem arbustos nem flores nela: ' + j(r.d.map(x => [x.n, x.arv, x.arbustos])));
    ok(r.d.some(x => x.casas >= 1) && r.d.every(x => x.chamines && x.casas === x.info.casas && (x.casas ? x.marcas.includes('Casa queimada') : x.marcas.includes('Terra arrasada (o hexágono destruído)'))), 'a casa queimada (a chaminé fica de pé) e o marcador: ' + j(r.d.map(x => [x.casas, x.marcas])));
    ok(r.d.some(x => x.arv > 0), 'há árvores carbonizadas: ' + j(r.d.map(x => x.arv)));
    ok(r.d.every(x => /o chão queimado do hexágono destruído/.test(x.resumo)), 'o resumo diz o destruído');
    ok(r.c.every(x => x.n >= 1 && x.t.every(t => t === 'c') && x.mortas && x.veios >= 1 && x.cristais === x.info.cristais && x.luzRoxa === x.cristais && x.marcas.includes('Terra corrompida (o hexágono corrompido)')), 'o corrompido: a terra roxa, os veios, as árvores mortas e roxas, os cristais negros com a luz: ' + j(r.c.map(x => [x.n, x.veios, x.cristais, x.luzRoxa, x.arv])));
    ok(r.c.some(x => x.cristais >= 1) && r.c.every(x => /a terra corrompida do hexágono/.test(x.resumo)), 'há cristais negros, e o resumo diz');
    ok(r.fuligem && r.fuligem.fuligem >= r.fuligem.na, 'as construções da situação que ficam na cinza ganham a fuligem: ' + j(r.fuligem));
  }

  // ================= os acampamentos =================
  if (parte('acampamento')) {
    const r = await ev(PE => {
      const u = __tc, out = {}, h0 = PE['0,0'];
      const pint = (p, k) => p.pintados.filter(o => o.k === k);
      const so = sel => Object.assign({}, h0, { guerra: Object.assign({}, h0.guerra) });
      const op = { bioma: 'floresta', tamanho: 'grande', seed: 9, agua: 'rio', caminho: 'trilha' };
      const p = u.Regiao.gerar(Object.assign({ hex: so(), guerra: ['exe0', 'exe1'] }, op)), p0 = u.Regiao.gerar(Object.assign({ hex: so(), guerra: [] }, op));
      const I = p.guerraInfo, tendas = pint(p, 'tendaGuerra');
      const ret = (x, y, L, Wd, a) => u.Estilos ? null : null;
      const cantos = tn => { const ux = Math.cos(tn.ang), uy = Math.sin(tn.ang), vx = -uy, vy = ux; return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [tn.x + ux * a * tn.l / 2 + vx * b * tn.w / 2, tn.y + uy * a * tn.l / 2 + vy * b * tn.w / 2]); };
      let perto = Infinity;
      for (let a = 0; a < tendas.length; a++) for (let b = a + 1; b < tendas.length; b++) perto = Math.min(perto, Math.hypot(tendas[a].x - tendas[b].x, tendas[a].y - tendas[b].y));
      const noCaminho = tn => p.caminhos.some(c => u.Encontro.motor.distLinha(c.pts, tn.x, tn.y) < c.hw + 0.5);
      out.um = { exes: I.exes, tendas: tendas.length, pav: pint(p, 'pavilhao').length, fog: p.objetos.filter(o => o.id === 'fogueira').length, visao: p.visao.length - p0.visao.length,
        perto, margem: tendas.every(tn => cantos(tn).every(([x, y]) => x >= 2.5 && y >= 2.5 && x <= p.W - 2.5 && y <= p.H - 2.5)),
        ocup: tendas.every(tn => p.occ[Math.floor(tn.y) * p.W + Math.floor(tn.x)] === 3), caminho: tendas.filter(noCaminho).length,
        ferro: tendas.filter(tn => tn.c1 === '#b03a2e' && tn.c2 === '#f2d16b').length, corvos: tendas.filter(tn => tn.c1 === '#2f5f9e').length,
        prov: ['barril', 'caixote', 'armas'].map(id => p.objetos.filter(o => o.id === id).length), est: pint(p, 'estandarte').map(o => o.c1),
        cat: pint(p, 'catapulta').length, marcas: (p.guerra || []).map(q => q.n), resumo: u.Regiao.LUGAR.resumo(p) };
      // as tendas nunca no caminho (em várias sementes, nos dois lugares, com a estrada do mapa passando)
      let nT = 0, minD = Infinity, minM = Infinity;
      for (const L of [u.Encontro, u.Regiao]) for (let seed = 1; seed <= 8; seed++) {
        const q = L === u.Encontro ? L.gerar({ terreno: 'floresta', situacao: 'surpresa', seed, chao: 2, hex: h0, guerra: ['exe0', 'exe1'] }) : L.gerar({ bioma: 'floresta', seed, hex: h0, guerra: ['exe0', 'exe1'], caminho: 'estrada', agua: 'rio' });
        for (const tn of pint(q, 'tendaGuerra')) { nT++; for (const c of q.caminhos) minD = Math.min(minD, u.Encontro.motor.distLinha(c.pts, tn.x, tn.y) - c.hw); for (const [x, y] of cantos(tn)) minM = Math.min(minM, x, y, q.W - x, q.H - y); }
      }
      out.longeDoCaminho = [nT, minD, minM];
      // a guerra nunca mexe nas casas do caminho (as mesmas do lugar sem ela, na mesma semente)
      let nC = 0, mexidas = 0;
      for (const L of [u.Encontro, u.Regiao]) for (let seed = 1; seed <= 8; seed++) {
        const o = L === u.Encontro ? { terreno: ['floresta', 'campo'][seed % 2], situacao: 'surpresa', seed, chao: 2, hex: h0 } : { bioma: 'floresta', seed, hex: h0, caminho: 'estrada', agua: 'rio' };
        const q = L.gerar(Object.assign({ guerra: ['bat', 'marca', 'exe0', 'exe1'] }, o)), q0 = L.gerar(Object.assign({ guerra: [] }, o));
        for (let k = 0; k < q0.occ.length; k++) if (q0.occ[k] === 1) { nC++; if (q.occ[k] !== 1) mexidas++; }
      }
      out.caminhoIntacto = [nC, mexidas];
      // mais tropas, mais tendas (sozinho, na Região grande)
      const com = tropas => u.Regiao.gerar(Object.assign({}, op, { hex: Object.assign({}, h0, { guerra: { exes: [{ nome: 'X', fac: '', cores: ['#336699', '#112233'], tropas, n: 1 }] } }) })).guerraInfo.exes[0];
      out.cresce = [60, 450, 1500, 9000].map(com);
      // o exército escondido no mapa: só quando ligado
      const hm = PE['-1,0'];
      const pm = u.Regiao.gerar({ bioma: 'floresta', tamanho: 'grande', seed: 4, hex: hm }), pm2 = u.Regiao.gerar({ bioma: 'floresta', tamanho: 'grande', seed: 4, hex: hm, guerra: ['exe0'] });
      out.escondido = [pm.guerraInfo ? pm.guerraInfo.exes || null : null, pm2.guerraInfo.exes.map(e => e.nome), pint(pm2, 'tendaGuerra').map(o => o.c1)[0]];
      // no Encontro: as tendas longe do meio da situação; o resumo diz quando não cabe tudo
      // (as casas das tendas estavam livres antes da guerra: no mesmo plano sem ela, livres ou com a vegetação)
      out.enc = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(seed => { const o = { terreno: ['floresta', 'campo', 'savana'][seed % 3], situacao: 'surpresa', seed, chao: 2, hex: h0 }, q = u.Encontro.gerar(Object.assign({ guerra: ['exe0', 'exe1'] }, o)), q0 = u.Encontro.gerar(Object.assign({ guerra: [] }, o)), ts = pint(q, 'tendaGuerra');
        const cs = (q.guerra || []).filter(m => m.k === 'acampamento').map(m => Math.hypot(m.cx - q.foco[0], m.cy - q.foco[1]) - 0.45 * (Math.hypot(q.W, q.H) * 0.17 + m.R));
        return { d: ts.length ? Math.min(...ts.map(tn => Math.hypot(tn.x - q.foco[0], tn.y - q.foco[1]))) : null, livres: ts.every(tn => [0, 4].includes(q0.occ[Math.floor(tn.y) * q0.W + Math.floor(tn.x)])), cs, info: q.guerraInfo, resumo: u.Encontro.LUGAR.resumo(q) }; });
      return out;
    }, PE);
    const U = r.um, soma = U.exes.reduce((s, e) => s + e.tendas, 0);
    ok(U.exes.length === 2 && U.tendas === soma && U.pav === 2 && U.fog === U.exes.reduce((s, e) => s + e.fogos, 0) && U.exes.every(e => e.fogos >= 1), 'dois acampamentos: as tendas, as tendas do comando e as fogueiras contadas: ' + j(U.exes));
    ok(U.visao === 4 * U.tendas + 16, 'as paredes de visão: quatro por tenda e oito por tenda do comando: ' + j([U.visao, U.tendas]));
    ok(U.perto >= 1.45 && U.margem && U.ocup && U.caminho === 0, 'as tendas não se encostam, ficam longe da borda e fora do caminho: ' + j([U.perto, U.margem, U.ocup, U.caminho]));
    ok(r.longeDoCaminho[0] > 100 && r.longeDoCaminho[1] >= 0.2 && r.longeDoCaminho[2] >= 2.5 - 1e-6, 'em várias sementes, nenhuma tenda em cima do caminho nem perto da borda: ' + j(r.longeDoCaminho));
    ok(r.caminhoIntacto[0] > 500 && r.caminhoIntacto[1] === 0, 'a guerra não mexe nas casas do caminho: ' + j(r.caminhoIntacto));
    ok(U.ferro === U.exes[0].tendas && U.corvos === U.exes[1].tendas && U.est.includes('#b03a2e') && U.est.includes('#2f5f9e'), 'as cores de cada facção (a bandeira própria da Casa de Ferro): ' + j([U.ferro, U.corvos, U.est]));
    ok(U.prov.every(x => x >= 1), 'as provisões (barris, caixotes e as armas): ' + j(U.prov));
    ok(U.exes[0].maq >= 1 && U.cat === U.exes[0].maq, 'as catapultas da Hoste de Ferro, paradas atrás: ' + j([U.exes[0].maq, U.cat]));
    ok(U.marcas.includes('Acampamento: Hoste de Ferro (1.500 tropas, Casa de Ferro)') && U.marcas.includes('Acampamento: Bando dos Corvos (450 tropas, Os Corvos)'), 'os marcadores do mestre: ' + j(U.marcas));
    ok(/o acampamento “Hoste de Ferro” \(11 tendas e \d fogueiras, com \d máquinas? de cerco parada/.test(U.resumo), 'o resumo diz: ' + U.resumo);
    ok(j(r.cresce.map(e => e.quer)) === j([3, 8, 11, 16]) && r.cresce[0].tendas === 3 && r.cresce[3].tendas >= 14 && r.cresce[3].tendas > r.cresce[2].tendas && r.cresce[2].tendas > r.cresce[1].tendas, 'mais tropas, mais tendas (até 16): ' + j(r.cresce.map(e => [e.quer, e.tendas, e.fogos])));
    ok(r.cresce[3].fogos > r.cresce[0].fogos, 'e mais fogueiras: ' + j(r.cresce.map(e => e.fogos)));
    ok(r.escondido[0] === null && j(r.escondido[1]) === j(['Sombras']) && r.escondido[2] === '#e6ab4f', 'o exército escondido no mapa: só quando ligado (nas cores do grupo, sem facção): ' + j(r.escondido));
    ok(r.enc.every(x => (x.d == null || x.d >= 2) && x.livres && x.cs.every(d => d >= -0.01)) && r.enc.some(x => x.cs.length), 'no Encontro, as tendas fora do que a situação usa (e o acampamento longe do meio dela): ' + j(r.enc.map(x => [x.d, x.livres, x.cs])));
    ok(r.enc.every(x => !x.info || (x.info.exes || []).every(e => e.tendas === e.quer || / das \d+ tendas[^)]*; no tamanho Grande cabe mais\)/.test(x.resumo))), 'quando não cabe tudo, o resumo diz e sugere o tamanho Grande');
  }

  // ================= o cerco =================
  if (parte('cerco')) {
    const r = await ev(PE => {
      const u = __tc, out = {}, h = PE['0,1'];
      const pint = (p, k) => p.pintados.filter(o => o.k === k);
      const op = { bioma: 'savana', tamanho: 'grande', seed: 5, agua: 'nenhuma', caminho: 'nenhum' };
      const ver = p => {
        const tr = pint(p, 'trincheira'), pts = tr.flatMap(o => o.pts), mq = ['catapulta', 'trabuco', 'ariete'].flatMap(k => pint(p, k).map(o => Object.assign({ k }, o)));
        const camp = (p.guerra || []).find(q => q.k === 'acampamento');
        return { W: p.W, H: p.H, n: tr.length, d: tr.map(o => o.d), xs: pts.map(q => q[0]), ys: pts.map(q => q[1]), mq: mq.map(o => [o.k, o.x, o.y, o.ang]), est: p.objetos.filter(o => o.id === 'estacas').map(o => [o.x + 0.5, o.y + 0.5]),
          info: p.guerraInfo || null, camp: camp ? [camp.cx, camp.cy] : null, marcas: (p.guerra || []).map(q => q.n), tendas: pint(p, 'tendaGuerra').map(o => o.c1), fl: pint(p, 'flechas').length, resumo: u.Regiao.LUGAR.resumo(p) };
      };
      out.l = ver(u.Regiao.gerar(Object.assign({ hex: h }, op)));
      const comC = (cerco, exes) => Object.assign({}, h, { guerra: Object.assign({}, h.guerra, { cerco: Object.assign({}, h.guerra.cerco, cerco) }, exes === undefined ? {} : { exes }) });
      out.o = ver(u.Regiao.gerar(Object.assign({ hex: comC({ u: 0.1, v: 0.5 }) }, op)));
      out.s = ver(u.Regiao.gerar(Object.assign({ hex: comC({ u: 0.45, v: 0.95 }) }, op)));
      out.n = ver(u.Regiao.gerar(Object.assign({ hex: comC({ u: 0.55, v: 0.04 }) }, op)));
      out.posto = ver(u.Regiao.gerar(Object.assign({ hex: comC({}, []) }, op)));
      out.semMaq = ver(u.Regiao.gerar(Object.assign({ hex: comC({ maq: undefined }, [Object.assign({}, h.guerra.exes[0], { maq: undefined })]) }, op)));
      out.desligado = ver(u.Regiao.gerar(Object.assign({ hex: h, guerra: ['exe0'] }, op)));
      out.enc = [1, 2, 3].map(seed => ver(u.Encontro.gerar({ terreno: 'savana', situacao: 'surpresa', seed, chao: 2, hex: h })));
      return out;
    }, PE);
    const L = r.l, minX = Math.min(...L.xs), maxX = Math.max(...L.xs);
    ok(L.n >= 1 && L.d.every(d => d[0] === 1 && d[1] === 0) && minX >= L.W - 7.8 && maxX <= L.W - 2.5 + 1e-6, 'a trincheira no lado do lugar (leste), longe da borda: ' + j([L.n, minX, maxX, L.W]));
    ok(L.mq.length >= 2 && L.mq.every(([k, x, y, a]) => Math.abs(a) < 1e-3 && (k === 'ariete' ? x > minX - 0.5 : x < minX)), 'as máquinas atrás da trincheira, viradas para o lugar (o aríete na frente): ' + j(L.mq));
    const fe = L.info.cerco.maq;
    ok(fe.catapulta + fe.trabuco + fe.ariete === L.mq.length && fe.trabuco <= 1 && fe.catapulta <= 2 && fe.ariete <= 1, 'as máquinas contadas (até duas de cada, um aríete): ' + j(fe));
    ok(L.est.filter(([x]) => x > minX).length >= 2, 'as estacas do lado do lugar: ' + j(L.est));
    ok(L.info.exes && L.info.exes[0].lado === 'cerco' && L.camp && L.camp[0] < minX - 3 && L.tendas.every(c => c === '#b03a2e'), 'o acampamento de quem cerca, atrás das máquinas, nas cores dela: ' + j([L.info.exes, L.camp]));
    ok(!L.marcas.some(x => /Guarda de Pedravale/.test(x)) && L.marcas.includes('Cerco de Pedravale (há 5 dias, Casa de Ferro): o lugar fica a nordeste'), 'quem está dentro não acampa fora; o marcador diz onde fica o lugar: ' + j(L.marcas));
    ok(L.fl >= 1 && /o cerco de Pedravale \(o lugar fica a nordeste\): a trincheira, /.test(L.resumo) && /o acampamento de quem cerca “Cerco de Ferro”/.test(L.resumo), 'as flechas de lá; o resumo diz: ' + L.resumo);
    const faixa = (V, eixo, de, ate) => V[eixo].every(v => v >= de - 1e-6 && v <= ate + 1e-6);
    ok(r.o.n >= 1 && r.o.d.every(d => d[0] === -1) && faixa(r.o, 'xs', 2.5, 7.8) && r.o.mq.every(([k, , , a]) => Math.abs(Math.abs(a) - Math.PI) < 1e-3), 'o lugar a oeste: a trincheira a oeste, as máquinas viradas para lá: ' + j([Math.min(...r.o.xs), Math.max(...r.o.xs)]));
    ok(r.s.n >= 1 && r.s.d.every(d => d[1] === 1) && faixa(r.s, 'ys', r.s.H - 7.8, r.s.H - 2.5) && r.s.mq.every(([k, , , a]) => Math.abs(a - Math.PI / 2) < 1e-3), 'a sul: ' + j([Math.min(...r.s.ys), Math.max(...r.s.ys)]));
    ok(r.n.n >= 1 && r.n.d.every(d => d[1] === -1) && faixa(r.n, 'ys', 2.5, 7.8) && r.n.mq.every(([k, , , a]) => Math.abs(a + Math.PI / 2) < 1e-3), 'a norte: ' + j([Math.min(...r.n.ys), Math.max(...r.n.ys)]));
    ok(r.posto.info.cerco.posto === true && r.posto.tendas.length === 2 && r.posto.tendas.every(c => c === '#b03a2e') && /e o posto de quem cerca/.test(r.posto.resumo), 'sem o exército de quem cerca na cena: o posto (duas tendas): ' + j(r.posto.tendas));
    ok(r.semMaq.mq.length === 0 && r.semMaq.n >= 1 && /\): a trincheira ·/.test(r.semMaq.resumo), 'sem máquinas, nenhuma (só a trincheira): ' + r.semMaq.resumo);
    ok(r.desligado.n === 0 && r.desligado.info.exes[0].lado === null && !/de quem cerca/.test(r.desligado.resumo), 'o cerco desligado: o acampamento comum, sem a trincheira');
    ok(r.enc.every(V => V.n >= 1 || (V.info && V.info.fora && V.info.fora.some(x => /cerco/.test(x)))), 'no Encontro: a trincheira (ou o resumo diz que não coube): ' + j(r.enc.map(V => [V.n, V.info && V.info.fora])));
  }

  // ================= a janela =================
  if (parte('janela')) {
    const G = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado)));
    const C = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().comum)));
    const abreDoMapa = async (h, extra) => { await ev(([h, extra]) => __tc.Gerador.abrir('encontro', Object.assign({ op: { terreno: 'floresta', situacao: 'surpresa', caminho: 'estrada', tamanho: 'grande' }, hora: 'dia', estacao: 'verao', hex: h, ops: { regiao: { bioma: h && h.ter, agua: 'rio', caminho: 'estrada', tamanho: 'grande' } } }, extra || {})), [h, extra]); await w(1000); };
    const bts = () => ev(() => [...document.querySelectorAll('#ger-guerra button')].map(b => [b.dataset.guerra, b.getAttribute('aria-pressed')]));
    await abreDoMapa(PE['0,0']);
    const dentro = await ev(() => { const a = document.getElementById('ger-hex-bloco'), b = document.getElementById('ger-guerra-bloco'); return !!a && !!b && a.contains(b); });
    ok(dentro && j(await bts()) === j([['bat', 'true'], ['marca', 'true'], ['exe0', 'true'], ['exe1', 'true']]) && j((await C()).guerra) === j(['bat', 'marca', 'exe0', 'exe1']), 'os botões da guerra no bloco do hexágono, ligados: ' + j(await bts()));
    let g = await G();
    ok(g.plano.guerraInfo && /o campo de batalha \(Batalha do Vau, há 2 dias\)/.test(await page.locator('#ger-resumo').innerText()), 'o plano tem a guerra, e o resumo diz');
    await foto('14b-janela-encontro', await page.locator('.modal').boundingBox());
    await page.locator('#ger-guerra button[data-guerra="exe1"]').click(); await w(800);
    g = await G();
    ok(j(await bts()) === j([['bat', 'true'], ['marca', 'true'], ['exe0', 'true'], ['exe1', 'false']]) && !((g.plano.guerraInfo || {}).exes || []).some(e => e.nome === 'Bando dos Corvos') && !/Bando dos Corvos/.test(await page.locator('#ger-resumo').innerText()), 'desligar um: o acampamento dos Corvos sai');
    await page.locator('#ger-lugar button', { hasText: 'Região livre' }).click(); await w(1000);
    g = await G();
    ok(await page.locator('#ger-guerra').count() === 1 && j(await bts()) === j([['bat', 'true'], ['marca', 'true'], ['exe0', 'true'], ['exe1', 'false']]) && g.plano.guerraInfo && !((g.plano.guerraInfo.exes || []).some(e => e.nome === 'Bando dos Corvos')), 'na Região livre, os mesmos botões, do mesmo jeito');
    await foto('14b-janela-regiao', await page.locator('.modal').boundingBox());
    await page.locator('.sw', { has: page.locator('#ger-hex') }).click(); await w(800);
    g = await G();
    ok(await page.locator('#ger-guerra').count() === 0 && !g.plano.guerraInfo, 'a chave do hexágono desligada: sem a guerra');
    await page.locator('.sw', { has: page.locator('#ger-hex') }).click(); await w(800);
    await page.locator('#ger-lugar button', { hasText: 'Encontro' }).click(); await w(900);
    // a cena criada: os marcadores ocultos, com o nome, e as fogueiras com a luz
    await ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    await page.locator('#ger-guerra button[data-guerra="exe1"]').click(); await w(900);
    await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 60000 }); await w(600);
    const sc = await ev(() => { const u = __tc, sc = u.Store.scene(); return { marcas: sc.tokens.filter(t => t.prop === 'interesse').map(t => [t.name, t.hidden]), fogo: sc.tokens.filter(t => t.prop === 'fogueira').map(t => !!(t.light && t.light.on)), estacas: sc.tokens.filter(t => t.prop === 'estacas').length, paredes: sc.walls.length, toast: (document.querySelector('.toast') || {}).textContent || '' }; });
    ok(sc.marcas.some(([nm, oc]) => nm === 'Acampamento: Hoste de Ferro (1.500 tropas, Casa de Ferro)' && oc) && sc.marcas.some(([nm, oc]) => /^Campo de batalha: Batalha do Vau/.test(nm) && oc), 'a cena criada: os marcadores da guerra, ocultos, com o nome: ' + j(sc.marcas));
    ok(sc.fogo.length >= 2 && sc.fogo.every(Boolean) && /o acampamento “Hoste de Ferro”/.test(sc.toast), 'as fogueiras do acampamento, acesas (com a luz); o aviso diz: ' + j(sc.fogo));
    await foto('14b-cena');
    await ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    // o cerco: a nota de quem está dentro
    await abreDoMapa(PE['0,1'], { ops: null });
    ok(/^Um exército está dentro de Pedravale: não acampa fora\.$/.test(await page.locator('#ger-guerra-nota').innerText()), 'o cerco: a nota de quem está dentro');
    await page.keyboard.press('Escape'); await w(400);
    // a batalha antiga e o exército escondido: sem mexer no que a janela lembra (a história)
    const antes = await ev(() => JSON.stringify([__tc.App.opt.encHist, __tc.App.opt.regHist]));
    await abreDoMapa(PE['-1,0'], { ops: null });
    g = await G();
    const depois = await ev(() => JSON.stringify([__tc.App.opt.encHist, __tc.App.opt.regHist]));
    ok(j(await bts()) === j([['bat', 'true'], ['exe0', 'false']]) && /vira a Batalha antiga/.test(await page.locator('#ger-guerra button[data-guerra="bat"]').innerText()), 'a batalha antiga ligada, o exército escondido desligado');
    ok((g.plano.historia || []).some(q => q.k === 'batalha' && /Escaramuça antiga/.test(q.n)) && depois === antes && !(await page.locator('#enc-hist button[data-hist="batalha"]').getAttribute('aria-pressed') === 'true'), 'a Batalha antiga entra na cena sem mudar a História da janela (nem o que ela lembra): ' + j([antes, depois]));
    await page.locator('#ger-guerra button[data-guerra="exe0"]').click(); await w(800);
    g = await G();
    ok(g.plano.guerraInfo && g.plano.guerraInfo.exes && g.plano.guerraInfo.exes[0].nome === 'Sombras', 'ligar o escondido: o acampamento dele');
    await page.keyboard.press('Escape'); await w(400);
    // sem guerra no hexágono: sem os botões
    await abreDoMapa(PE['1,1'], { ops: null });
    ok(await page.locator('#ger-hex-bloco').count() === 1 && await page.locator('#ger-guerra').count() === 0, 'o hexágono sem guerra: sem os botões');
    await page.keyboard.press('Escape'); await w(400);
  }

  // ================= robusto =================
  if (parte('robusto')) {
    const S = sorteadas(1).concat(sorteadas(2));
    const r = await ev(S => {
      const u = __tc, out = { erros: [], max: 0, n: 0, com: 0 };
      S.forEach((h, i) => {
        for (const [L, o] of [[u.Regiao, { bioma: h.ter && h.ter !== 'agua' ? h.ter : 'floresta', tamanho: ['pequeno', 'medio', 'grande'][i % 3], agua: ['rio', 'lago', 'nenhuma', 'surpresa'][i % 4], caminho: ['nenhum', 'trilha', 'estrada'][i % 3], historia: i % 4 === 0 ? ['batalha', 'ruinas'] : undefined, achados: true }],
          [u.Encontro, { terreno: ['floresta', 'campo', 'montanha', 'savana', 'neve', 'deserto'][i % 6], situacao: 'surpresa', chao: 2, tamanho: ['pequeno', 'medio', 'grande'][(i + 1) % 3], historia: i % 3 === 0 ? ['acampamento'] : undefined }]]) {
          try {
            const t0 = performance.now(), p = L.gerar(Object.assign({ seed: 1 + i, estilo: 'comum', hex: h, estacao: i % 5 === 0 ? 'inverno' : undefined }, o));
            const dt = performance.now() - t0;
            out.max = Math.max(out.max, dt); out.n++; if (p.guerraInfo) out.com++;
            if (!Array.isArray(p.occ) || p.occ.length !== p.W * p.H || p.occ.some(v => v === 11)) out.erros.push(i + ': occ');
            u.Encontro.motor.pintar(p, 6);
            L.LUGAR.resumo(p);
          } catch (e) { out.erros.push(i + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
        }
      });
      return out;
    }, S);
    ok(!r.erros.length, 'guerras sorteadas nos dois lugares: sem erro (' + r.n + ' planos, ' + r.com + ' com guerra): ' + j(r.erros.slice(0, 4)));
    ok(r.max < 2500, 'e rápido (o pior: ' + Math.round(r.max) + ' ms)');
  }

  console.log(fails ? `${fails} de ${n} verificações FALHARAM` : `OK: ${n} verificações`);
  await t.close();
  process.exit(fails ? 1 : 0);
})();
