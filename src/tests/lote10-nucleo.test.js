// Lote 10, as contas do Mapa-múndi (sem navegador):
//   · (parte 1) a facção dos jogadores (uma só; vai na projeção); as províncias (as regiões de fora) e as sub-regiões
//     (as de dentro, em árvore); os hexágonos de uma região (os da grade com o centro dentro dela — conferidos contra a
//     conta de força bruta, nas duas orientações da grade e com a grade deslocada), os próprios (sem os das
//     sub-regiões), o terreno de cada um; e o Livro do reino (por facção: províncias, sub-regiões, hexágonos — a
//     sub-região de outro dono leva os dela — e exércitos, com as tropas; a linha sem dono).
//   · (parte 2) a economia normalizada, a de começo, ligar e a produção (a parte própria, a província, por facção).
//   · (parte 3) o catálogo de construções (normalizado; o pronto, pelos recursos e terrenos do mapa), os espaços, as
//     exigências, começar a obra (paga na hora, com o histórico), terminar, subir de nível, cancelar (devolve), demolir,
//     o que falta, de graça, a produção e o gasto, a defesa (até 20; desligada, nada), as construções normalizadas e a
//     sede do clã (para a facção ligada ao clã, sem ela para a dona do lugar).
const N = require('../../mundo/nucleo.js');
const R = require('../../mundo/reino.js');
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FALHOU: ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' — esperado ' + JSON.stringify(b) + ', veio ' + JSON.stringify(a));
const j = JSON.stringify;

/* ---- (parte 1) a facção dos jogadores ---- */
{
  const m = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, faccoes: [
    { id: 'fa', nome: 'Aldar', jog: true }, { id: 'fb', nome: 'Vale', jog: 'sim' }, { id: 'fc', nome: 'Culto', jog: false, oculta: true }, { id: 'fd', nome: 'Ilhas' }] });
  eq(m.faccoes.map(f => !!f.jog), [true, false, false, false], 'a facção dos jogadores: uma só (a primeira marcada)');
  ok(!('jog' in m.faccoes[1]) && !('jog' in m.faccoes[3]), 'sem a marca, o campo nem fica (o mapa de antes fica igual)');
  const p = N.projetar(m);
  ok(p.faccoes.find(f => f.id === 'fa').jog === true, 'a projeção leva a facção dos jogadores (eles sabem qual é a deles)');
  const m2 = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, faccoes: [{ id: 'fc', nome: 'Culto', jog: true, oculta: true }] });
  ok(!N.projetar(m2).faccoes.length, 'a facção dos jogadores escondida não vai (como qualquer escondida)');
}

/* ---- (parte 1) províncias e sub-regiões ---- */
const quad = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
{
  const m = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, objs: [
    { id: 'p1', k: 'r', nome: 'Reino', pts: quad(0, 0, 1000, 800) },
    { id: 's1', k: 'r', nome: 'Ducado Norte', pai: 'p1', pts: quad(50, 50, 500, 400) },
    { id: 's11', k: 'r', nome: 'Condado', pai: 's1', pts: quad(60, 60, 200, 200) },
    { id: 's2', k: 'r', nome: 'Ducado Sul', pai: 'p1', pts: quad(50, 450, 500, 750) },
    { id: 'p2', k: 'r', nome: 'Ilha', pts: quad(1200, 0, 1600, 400) }] });
  const r = id => m.objs.find(o => o.id === id);
  ok(R.ehProvincia(r('p1')) && R.ehProvincia(r('p2')) && !R.ehProvincia(r('s1')) && !R.ehProvincia(r('s11')), 'província: a região de fora');
  ok(R.provinciaDe(m, r('s11')) === r('p1') && R.provinciaDe(m, r('s2')) === r('p1') && R.provinciaDe(m, r('p2')) === r('p2'), 'a província de uma sub-região (subindo pelos pais); a de fora é a dela mesma');
  eq(R.subregioesDe(m, r('p1')).map(x => [x.r.id, x.nivel]), [['s1', 1], ['s11', 2], ['s2', 1]], 'as sub-regiões em árvore (cada uma seguida das de dentro dela)');
  eq(R.subregioesDe(m, r('p2')), [], 'a província sem sub-regiões');
}

/* ---- (parte 1) os hexágonos de uma região ---- */
{
  // a força bruta: todos os hexágonos de uma faixa grande, o centro dentro do polígono
  const bruta = (m, pts) => {
    const out = [];
    for (let q = -80; q <= 80; q++) for (let r = -80; r <= 80; r++) { const c = N.centroHex(m, q, r); if (N.dentroPoligono([c.x, c.y], pts)) out.push(q + ',' + r); }
    return out.sort();
  };
  const formas = { quadrado: quad(0, 0, 400, 300), concava: [[0, 0], [500, 0], [500, 400], [250, 150], [0, 400]], torta: [[-120, 30], [260, -90], [430, 280], [90, 360]] };
  for (const [orient, gx, gy] of [['pe', 0, 0], ['deitado', 0, 0], ['pe', 13, -7], ['deitado', -21, 9]]) {
    const base = { nome: 'M', larg: 2000, alt: 1400, grade: { tam: 40, x: gx, y: gy, orient, on: true } };
    for (const [nome, pts] of Object.entries(formas)) {
      const m = N.normalizarMapa(Object.assign({}, base, { objs: [{ id: 'r', k: 'r', pts }] }));
      const hs = R.hexesDaRegiao(m, m.objs[0]);
      ok(hs.length > 10 && j(hs.slice().sort()) === j(bruta(m, m.objs[0].pts)), 'os hexágonos da região (' + nome + ', grade ' + orient + (gx ? ' deslocada' : '') + ') batem com a força bruta: ' + hs.length);
    }
  }
  const sem = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, objs: [{ id: 'r', k: 'r', pts: quad(0, 0, 400, 300) }] });
  eq(R.hexesDaRegiao(sem, sem.objs[0]), [], 'sem grade: nenhum hexágono');
  const m = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, grade: { tam: 40, x: 0, y: 0, orient: 'pe', on: true }, objs: [{ id: 'r', k: 'r', pts: quad(0, 0, 400, 300) }] });
  ok(R.hexesDaRegiao(m, m.objs[0]) === R.hexesDaRegiao(m, m.objs[0]), 'a conta fica guardada para o mesmo mapa');
}

/* ---- (parte 1) os próprios, o terreno e o Livro do reino ---- */
{
  const grade = { tam: 40, x: 0, y: 0, orient: 'pe', on: true };
  const terrenos = [{ id: 'flo', nome: 'Floresta', cor: '#2f6b3a' }, { id: 'cam', nome: 'Campo', cor: '#a8b04a' }, { id: 'mon', nome: 'Montanha', cor: '#8a8070' }];
  const m0 = { nome: 'M', larg: 2000, alt: 1400, grade, terrenos, faccoes: [{ id: 'fa', nome: 'Aldar' }, { id: 'fb', nome: 'Vale' }],
    objs: [
      { id: 'p1', k: 'r', nome: 'Reino', fac: 'fa', pts: quad(0, 0, 800, 600) },
      { id: 's1', k: 'r', nome: 'Ducado do Vale', fac: 'fb', pai: 'p1', pts: quad(20, 20, 380, 280) },
      { id: 's2', k: 'r', nome: 'Prefeitura', pai: 'p1', pts: quad(420, 20, 780, 280) },
      { id: 'p2', k: 'r', nome: 'Ermo', pts: quad(1000, 0, 1400, 400) },
      { id: 'ga', k: 'g', x: 100, y: 100, tipo: 'exercito', fac: 'fa', exe: { unid: [{ id: 'u1', tropas: 300 }, { id: 'u2', tropas: 200 }] } },
      { id: 'gb', k: 'g', x: 200, y: 100, tipo: 'exercito', fac: 'fb', exe: { unid: [{ id: 'u3', tropas: 100 }] } },
      { id: 'gc', k: 'g', x: 300, y: 100, tipo: 'exercito', exe: { unid: [{ id: 'u4', tropas: 50 }] } },
      { id: 'gd', k: 'g', x: 400, y: 100 }] };
  // o terreno: alguns hexágonos de s1 com floresta, um com montanha, um marcado "nenhum"
  const m1 = N.normalizarMapa(m0), s1 = m1.objs.find(o => o.id === 's1'), hs1 = R.hexesDaRegiao(m1, s1);
  const hexes = {};
  hs1.slice(0, 5).forEach(k => { hexes[k] = 'flo'; });
  hexes[hs1[5]] = 'mon';
  hexes[hs1[6]] = '-';
  hexes[hs1[7]] = ['cam', 3];
  const m = N.normalizarMapa(Object.assign({}, m0, { hexes }));
  const o = id => m.objs.find(x => x.id === id);
  const t = R.terrenosDaRegiao(m, o('s1'));
  eq([t.n, t.por.map(x => [x.id, x.n]), t.sem], [hs1.length, [['flo', 5], ['cam', 1], ['mon', 1]], hs1.length - 7], 'o terreno da sub-região: floresta 5, campo 1 (com custo próprio), montanha 1; o resto sem terreno (e o "nenhum")');
  eq(R.terrenoDoHex(m, hs1[6]), null, 'o hexágono marcado "nenhum" não tem terreno');
  const p1 = R.hexesDaRegiao(m, o('p1')), d1 = R.hexesDaRegiao(m, o('s1')), d2 = R.hexesDaRegiao(m, o('s2')), pr = R.hexesProprios(m, o('p1'));
  ok(pr.length === p1.length - d1.length - d2.length && !pr.some(k => d1.includes(k) || d2.includes(k)), 'os hexágonos próprios da província: os dela menos os das sub-regiões (' + pr.length + ')');
  const L = R.livroDoReino(m), fa = L.linhas[0], fb = L.linhas[1];
  eq([fa.prov, fa.sub, fa.hex, fa.exe, fa.tropas], [1, 1, pr.length + d2.length, 1, 500], 'o Livro: Aldar com 1 província, 1 sub-região (a Prefeitura, sem facção própria), os hexágonos dela e da Prefeitura, 1 exército com 500 tropas');
  eq([fb.prov, fb.sub, fb.hex, fb.exe, fb.tropas], [0, 1, d1.length, 1, 100], 'o Vale: só o ducado (de outro dono, leva os hexágonos dele) e 1 exército');
  eq([L.sem.prov, L.sem.hex, L.sem.exe, L.sem.tropas], [1, R.hexesDaRegiao(m, o('p2')).length, 1, 50], 'sem dono: o Ermo e o exército sem facção');
  ok(L.grade === true && R.livroDoReino(N.projetar(m)).linhas[0].exe === 0, 'na projeção, o exército vai sem os números: o livro não conta');
  // o terreno do desenho à mão também conta (e o "nenhum" do hexágono ganha do desenho)
  const hp2 = R.hexesDaRegiao(m, o('p2')), pint = N.normalizarMapa(Object.assign({}, m0, { hexes: { [hp2[0]]: '-' }, pintura: { ops: [{ t: 'mon', r: 400, pts: [[1200, 200]] }] } }));
  const tp = R.terrenosDaRegiao(pint, pint.objs.find(x => x.id === 'p2'));
  ok(tp.por.length === 1 && tp.por[0].id === 'mon' && tp.por[0].n === hp2.length - 1 && tp.sem === 1, 'o desenho à mão: a pincelada de montanha cobre o Ermo; o hexágono marcado "nenhum" fica sem: ' + JSON.stringify(tp));
}

/* ---- (parte 2) a economia ---- */
{
  const grade = { tam: 40, x: 0, y: 0, orient: 'pe', on: true };
  // a normalização da economia
  const e0 = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, eco: { on: 'sim', rec: [{ id: 'la', nome: '  Lapros ', papel: 'moeda', cor: '#e6ab4f' }, { id: 'la', nome: 'repetido' }, { id: 'sal', nome: '', papel: 'tempero' }, { nome: 'sem id' }],
    ter: { pl: { la: 2, sal: '0.5', xx: 9 }, zz: { la: 1 }, fl: { la: 0 } }, pop: { la: '5', sal: 0 }, niv: [{ id: 'vila', nome: 'Vila', esp: 4 }, { id: 'vila', nome: 'outra' }, { id: 'cid', nome: '', esp: 99 }] },
    objs: [{ id: 'm1', k: 'm', x: 10, y: 10, ass: { niv: 'vila', pop: 1200.7 } }, { id: 'm2', k: 'm', x: 20, y: 10, ass: { niv: 'nao-existe', pop: 0 } }, { id: 'm3', k: 'm', x: 30, y: 10, ass: { niv: 'nao-existe', pop: 30 } },
      { id: 'r1', k: 'r', pts: quad(0, 0, 100, 100), prod: { la: 3, sal: -1.234, xx: 5 } }] });
  eq(e0.eco.rec, [{ id: 'la', nome: 'Lapros', cor: '#e6ab4f', papel: 'moeda' }, { id: 'sal', nome: 'Recurso', cor: '#9aa3b5' }], 'os recursos do mundo: um id cada, o nome aparado (vazio: "Recurso"), o papel só dos que existem');
  eq([e0.eco.on, e0.eco.ter], [true, { pl: { la: 2, sal: 0.5 } }], 'ligada; a tabela do terreno: só os terrenos e os recursos que existem, sem os zeros');
  eq(e0.eco.pop, { la: 5 }, 'a tabela da população: sem os zeros');
  eq(e0.eco.niv, [{ id: 'vila', nome: 'Vila', esp: 4 }, { id: 'cid', nome: 'Nível', esp: 40 }], 'os níveis: um id cada, os espaços de 0 a 40');
  const ob = id => e0.objs.find(o => o.id === id);
  eq([ob('m1').ass, 'ass' in ob('m2'), ob('m3').ass, ob('r1').prod], [{ niv: 'vila', pop: 1201 }, false, { niv: null, pop: 30 }, { la: 3, sal: -1.23 }],
    'o assentamento: o nível que não existe sai (sem população, o assentamento todo); a produção do mestre só dos recursos do mundo');
  const pe = N.projetar(e0);
  ok(!('eco' in pe) && !pe.objs.some(o => 'ass' in o || 'prod' in o), 'na projeção: sem a economia, sem os assentamentos e sem a produção do mestre (por enquanto, tudo do mestre)');
  ok(!('eco' in N.normalizarMapa({ nome: 'M' })), 'sem economia, o campo nem fica (o mapa de antes fica igual)');
  const se = N.normalizarMapa({ nome: 'M', objs: [{ id: 'm', k: 'm', x: 1, y: 1, ass: { niv: 'vila', pop: 10 } }, { id: 'r', k: 'r', pts: quad(0, 0, 9, 9), prod: { la: 1 } }] });
  eq([se.objs[0].ass, 'prod' in se.objs[1]], [{ niv: null, pop: 10 }, false], 'sem a economia: o nível e a produção do mestre não ficam (não há níveis nem recursos); a população fica');

  // a economia de começo e ligar
  const base = { nome: 'M', larg: 2000, alt: 1400, grade, faccoes: [{ id: 'fa', nome: 'Aldar', rec: [{ id: 'rc1', nome: 'lápros', n: 30 }, { id: 'rc2', nome: 'Honra', n: 3 }], hist: [{ d: 0, mot: 'tesouro', mud: [['r:rc1', 'lápros', 0, 30]] }] }, { id: 'fb', nome: 'Vale' }],
    objs: [
      { id: 'p1', k: 'r', nome: 'Reino', fac: 'fa', pts: quad(0, 0, 800, 600) },
      { id: 's1', k: 'r', nome: 'Ducado', fac: 'fb', pai: 'p1', pts: quad(20, 20, 380, 280) },
      { id: 's2', k: 'r', nome: 'Prefeitura', pai: 'p1', pts: quad(420, 20, 780, 280) },
      { id: 'v1', k: 'm', x: 100, y: 100, nome: 'Vila do Ducado' },
      { id: 'v2', k: 'm', x: 300, y: 450, nome: 'Cidade do Reino' },
      { id: 'v3', k: 'm', x: 1500, y: 1000, nome: 'Fora' }] };
  const mi = N.normalizarMapa(base), ei = R.ecoInicial(mi);
  eq(ei.rec.map(r => [r.id, r.nome, r.papel]), [['lapros', 'Lapros', 'moeda'], ['suprimentos', 'Suprimentos', 'comida'], ['madeira', 'Madeira', 'madeira'], ['pedra', 'Pedra', 'pedra'], ['orith', 'Orith', 'metal'], ['runas', 'Runas', 'magia']],
    'os recursos de começo: Lapros, Suprimentos, Madeira, Pedra, Orith e Runas (com o papel de cada um)');
  ok(ei.ter.pl.suprimentos === 2 && ei.ter.fl.madeira === 2 && ei.ter.mo.orith === 1 && !('ne' in ei.ter) && j(ei.pop) === j({ lapros: 5 }) && ei.niv.map(n => n.nome).join() === 'Aldeia,Vila,Cidade,Metrópole',
    'a tabela de começo (pelo papel: planície dá suprimentos, floresta madeira, montanha orith…), a população (5 Lapros por mil) e os níveis');
  const ml = JSON.parse(j(mi)), rel = R.ligarEconomia(ml), m = N.normalizarMapa(ml);
  const fa = m.faccoes[0], fb = m.faccoes[1];
  eq([rel.ligados, rel.semana, N.semanaDe(m.cal, m.cal.dia)], [[{ fac: 'fa', nome: 'lápros' }], true, 0], 'ligar: o recurso de mesmo nome da facção passa a ser o do mundo; o mapa passa a contar a semana (hoje: segunda-feira)');
  ok(j(fa.rec.map(r => [r.id, r.nome, r.n])) === j([['lapros', 'Lapros', 30], ['rc2', 'Honra', 3], ['suprimentos', 'Suprimentos', 0], ['madeira', 'Madeira', 0], ['pedra', 'Pedra', 0], ['orith', 'Orith', 0], ['runas', 'Runas', 0]])
    && fa.hist[0].mud[0][0] === 'r:lapros', 'na facção: o estoque de cada recurso do mundo (o de mesmo nome continua com o número e o histórico; o dela fica)');
  ok(fb.rec.length === 6 && fb.rec.every(r => r.n === 0), 'a outra facção ganha os seis, com zero');
  const ml2 = JSON.parse(j(m)), rel2 = R.ligarEconomia(ml2);
  ok(rel2.ligados.length === 0 && rel2.semana === false && N.normalizarMapa(ml2).faccoes[0].rec.length === 7, 'ligar de novo não repete nada (nem mexe na semana)');

  // a produção
  const s1 = m.objs.find(o => o.id === 's1'), s2 = m.objs.find(o => o.id === 's2'), p1 = m.objs.find(o => o.id === 'p1');
  const hs2 = R.hexesDaRegiao(m, s2), hp = R.hexesProprios(m, p1), hexes = {};
  hs2.slice(0, 4).forEach(k => { hexes[k] = 'fl'; });                 // floresta: 2 madeira e meio suprimento cada
  hp.slice(0, 5).forEach(k => { hexes[k] = 'pl'; });                  // planície: 2 suprimentos cada
  R.hexesDaRegiao(m, s1).slice(0, 2).forEach(k => { hexes[k] = 'mo'; });   // montanha: 2 pedra e 1 orith
  const mc = Object.assign(JSON.parse(j(m)), { hexes }), od = id => mc.objs.find(x => x.id === id);
  od('p1').prod = { lapros: 7 };                                       // o valor do mestre (com a economia ligada)
  od('v1').ass = { niv: 'vila', pop: 2000 }; od('v2').ass = { niv: 'cidade', pop: 5000 }; od('v3').ass = { niv: 'aldeia', pop: 900 };
  const mp = N.normalizarMapa(mc);
  const o = id => mp.objs.find(x => x.id === id);
  eq(R.producaoPropria(mp, o('s2')), { terreno: { madeira: 8, suprimentos: 2 }, pop: {}, cons: {}, gasto: {}, mestre: {}, total: { madeira: 8, suprimentos: 2 } }, 'a Prefeitura: só o terreno (4 florestas)');
  eq(R.producaoPropria(mp, o('s1')), { terreno: { pedra: 4, orith: 2 }, pop: { lapros: 10 }, cons: {}, gasto: {}, mestre: {}, total: { pedra: 4, orith: 2, lapros: 10 } }, 'o Ducado: 2 montanhas e a vila de 2.000 pessoas (5 Lapros por mil)');
  eq(R.producaoPropria(mp, o('p1')), { terreno: { suprimentos: 10 }, pop: { lapros: 25 }, cons: {}, gasto: {}, mestre: { lapros: 7 }, total: { suprimentos: 10, lapros: 32 } }, 'o Reino, a parte própria: 5 planícies, a cidade de 5.000 e os 7 Lapros do mestre');
  eq(R.producaoDaRegiao(mp, o('p1')).total, { suprimentos: 12, lapros: 42, pedra: 4, orith: 2, madeira: 8 }, 'a província soma a dela e a das sub-regiões');
  eq(R.producaoPorFaccao(mp), { por: { fa: { suprimentos: 12, lapros: 32, madeira: 8 }, fb: { pedra: 4, orith: 2, lapros: 10 } }, sem: {} }, 'por facção: Aldar com o Reino e a Prefeitura; o Vale com o Ducado (de outro dono); a aldeia fora das províncias não produz para ninguém');
  eq(R.assentamentosDaRegiao(mp, o('p1')).map(a => [a.o.id, a.r.id, a.nivel.nome]), [['v1', 's1', 'Vila'], ['v2', 'p1', 'Cidade']], 'os assentamentos de dentro da província (com a região e o nível de cada um)');
  const off = N.normalizarMapa(Object.assign(JSON.parse(j(mp)), { eco: Object.assign({}, mp.eco, { on: false }) }));
  ok(R.producaoPropria(off, off.objs.find(x => x.id === 'p1')) === null && j(R.producaoPorFaccao(off)) === j({ por: {}, sem: {} }) && off.eco.rec.length === 6,
    'desligada: nada produz, mas tudo fica guardado');
  // ligar de novo: a guardada (o nome que o mestre deu fica, nas facções também) volta a produzir
  const lo = JSON.parse(j(off)); lo.eco.rec[0].nome = 'Ouro';
  const rel3 = R.ligarEconomia(lo), mo = N.normalizarMapa(lo);
  ok(mo.eco.on === true && mo.eco.rec.length === 6 && mo.eco.rec[0].nome === 'Ouro' && mo.faccoes[0].rec[0].nome === 'Ouro' && rel3.semana === false && R.producaoPropria(mo, mo.objs.find(x => x.id === 'p1')).total.lapros === 32,
    'ligar de novo: a economia guardada volta (com o nome que o mestre deu) e produz');
  // o que dá zero sai da conta (o valor do mestre que gasta tudo o que o terreno dá)
  const mz0 = JSON.parse(j(mp)); mz0.objs.find(x => x.id === 's2').prod = { madeira: -8 };
  const mz = N.normalizarMapa(mz0), pz = R.producaoPropria(mz, mz.objs.find(x => x.id === 's2'));
  eq([pz.mestre, pz.total], [{ madeira: -8 }, { suprimentos: 2 }], 'o que dá zero sai da conta: a Prefeitura com o mestre gastando as 8 madeiras do terreno');
}

/* ---- (parte 3) as construções ---- */
{
  // a normalização do catálogo
  const c0 = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, eco: { on: true, rec: [{ id: 'la', nome: 'Lapros' }, { id: 'pe', nome: 'Pedra' }], niv: [{ id: 'vila', nome: 'Vila', esp: 4 }],
    cons: [
      { id: 'faz', nome: '  Fazenda ', ic: 'fazenda', esp: 9, exige: { niv: 'vila', ter: ['mo', 'zz', 'mo'], cons: 'faz' }, niveis: [{ custo: { la: 5, pe: -2, xx: 1 }, sem: 200, prod: { la: 3, pe: -1 }, gasto: { la: 0.5, pe: 0 }, def: 30, ef: '  rende ' }] },
      { id: 'faz', nome: 'repetida' },
      { id: 'tor', nome: '', ic: 'Não Vale!', exige: { niv: 'cidade', cons: 'faz' }, niveis: [] },
      { id: 'big', nome: 'Grande', niveis: [1, 2, 3, 4, 5, 6].map(i => ({ sem: i })) }] } });
  const cs = c0.eco.cons;
  eq(cs.map(c => c.id), ['faz', 'tor', 'big'], 'o catálogo de construções: um id cada');
  eq([cs[0].nome, cs[0].ic, cs[0].esp, cs[0].exige], ['Fazenda', 'fazenda', 6, { niv: 'vila', ter: ['mo'], cons: null }], 'a construção: o nome aparado, até 6 espaços, as exigências só do nível, dos terrenos e da construção que existem (e não ela mesma)');
  eq(cs[0].niveis[0], { custo: { la: 5 }, sem: 104, prod: { la: 3, pe: -1 }, gasto: { la: 0.5 }, def: 20, ef: 'rende' }, 'o nível: o custo e o gasto só acima de zero, a produção pode gastar, até 104 semanas, a defesa até 20, o efeito aparado');
  eq([cs[1].nome, cs[1].ic, cs[1].exige, cs[1].niveis.length], ['Construção', 'salao', { niv: null, ter: [], cons: 'faz' }, 1], 'sem nome: "Construção"; o ícone que não vale: o salão; sem níveis: um vazio');
  eq(cs[2].niveis.length, 5, 'até 5 níveis');

  // ligar a economia traz o catálogo pronto
  const grade = { tam: 40, x: 0, y: 0, orient: 'pe', on: true };
  const base = { nome: 'M', larg: 2000, alt: 1400, grade, faccoes: [{ id: 'fa', nome: 'Aldar' }, { id: 'fb', nome: 'Vale' }],
    objs: [
      { id: 'p1', k: 'r', nome: 'Reino', fac: 'fa', pts: quad(0, 0, 800, 600) },
      { id: 's1', k: 'r', nome: 'Ducado', fac: 'fb', pai: 'p1', pts: quad(20, 20, 380, 280) },
      { id: 'v1', k: 'm', x: 600, y: 450, nome: 'Vila Alta' },
      { id: 'v2', k: 'm', x: 100, y: 100, nome: 'Aldeia do Vale' }] };
  const m0 = N.normalizarMapa(base), ml = JSON.parse(j(m0));
  R.ligarEconomia(ml);
  const mn = N.normalizarMapa(ml), e = mn.eco, tp = id => e.cons.find(c => c.id === id);
  ok(e.cons.map(c => c.nome).join() === 'Fazenda,Serraria,Pedreira,Mina de Orith,Mercado,Santuário rúnico,Paliçada,Muralha,Quartel,Torre de vigia,Templo,Taverna,Celeiro,Porto,Biblioteca', 'ligar a economia traz o catálogo pronto: as 15 construções');
  ok(j(tp('mina').niveis.map(x => x.prod)) === j([{ orith: 3 }, { orith: 5 }, { orith: 8 }]) && j(tp('mina').exige.ter) === j(['co', 'mo']) && tp('mercado').exige.niv === 'vila' && tp('muralha').exige.niv === 'cidade' && tp('muralha').esp === 2 && tp('muralha').niveis[0].def === 3
    && j(tp('santuario').niveis[0].gasto) === j({ lapros: 2 }) && j(tp('porto').exige.ter) === j(['ag']) && j(tp('fazenda').niveis[0].custo) === j({ madeira: 10, lapros: 10 }),
    'o catálogo pronto pelos recursos do mapa (o metal é o Orith, a moeda o Lapros…), com as exigências (a Mina em colina ou montanha, o Mercado a partir da Vila, a Muralha da Cidade, o Porto na água) e os 3 níveis');
  const semAgua = R.catalogoPronto(Object.assign({}, m0, { terrenos: m0.terrenos.filter(t => t.id !== 'ag') }), Object.assign({}, e, { niv: e.niv.filter(x => x.id !== 'cidade') }));
  ok(j(semAgua.find(c => c.id === 'porto').exige.ter) === j([]) && semAgua.find(c => c.id === 'muralha').exige.niv === null, 'num mapa sem água (e sem a Cidade): o Porto e a Muralha sem essas exigências');

  // o mapa: montanhas no Reino, a vila (no Reino) e a aldeia (no Ducado), o estoque de Aldar
  const hp = R.hexesProprios(mn, mn.objs.find(o => o.id === 'p1')), hexes = {};
  hp.slice(0, 3).forEach(k => { hexes[k] = 'mo'; });
  const mc = Object.assign(JSON.parse(j(mn)), { hexes });
  mc.objs.find(o => o.id === 'v1').ass = { niv: 'vila', pop: 0 };
  mc.objs.find(o => o.id === 'v2').ass = { niv: 'aldeia', pop: 0 };
  for (const [id, q] of [['lapros', 100], ['madeira', 50], ['pedra', 50], ['orith', 20]]) mc.faccoes[0].rec.find(r => r.id === id).n = q;
  let m = N.normalizarMapa(mc), rasc = null;
  const ob = (mm, id) => mm.objs.find(o => o.id === id);
  const est = (mm, fid) => Object.fromEntries(mm.faccoes.find(f => f.id === fid).rec.filter(r => mm.eco.rec.some(w => w.id === r.id)).map(r => [r.id, r.n]));
  const passo = fn => { rasc = JSON.parse(j(m)); const r = fn(rasc); m = N.normalizarMapa(rasc); return r; };
  eq(R.espacosDe(m, ob(m, 'v1')), { total: 4, usados: 0, livres: 4 }, 'a vila: 4 espaços livres');
  eq(R.exigenciasDe(m, ob(m, 'v2'), R.tipoDe(m, 'mercado')).map(x => x.txt), ['precisa de Vila ou maior'], 'o Mercado na aldeia: precisa de Vila ou maior');
  eq(R.exigenciasDe(m, ob(m, 'v2'), R.tipoDe(m, 'mina')).map(x => x.txt), ['precisa de Colina ou Montanha na região'], 'a Mina na aldeia do Ducado (sem colina nem montanha): o terreno');
  eq(R.exigenciasDe(m, ob(m, 'v1'), R.tipoDe(m, 'mina')), [], 'a Mina na vila do Reino (com montanhas): pode');

  // começar a obra: paga na hora (com o histórico) e fica em obra, já ocupando o espaço
  const c1 = passo(x => R.comecarObra(x, 'v1', 'mina', 'fa', 'Obra: Mina de Orith'));
  ok(c1 && c1.n === 0 && j(c1.obra) === j({ n: 1, sem: 4, fac: 'fa', pago: { madeira: 15, pedra: 10, lapros: 20 } }), 'começar a Mina: em obra (nível 1, 4 semanas), paga por Aldar: ' + j(c1));
  eq(est(m, 'fa'), { lapros: 80, suprimentos: 0, madeira: 35, pedra: 40, orith: 20, runas: 0 }, 'o estoque de Aldar: o custo saiu');
  const h0 = m.faccoes[0].hist[m.faccoes[0].hist.length - 1];
  ok(h0 && h0.mot === 'Obra: Mina de Orith' && h0.mud.length === 3, 'no histórico de Aldar, uma linha com o motivo e os três números: ' + j(h0));
  ok(j(R.producaoPropria(m, ob(m, 'p1')).cons) === j({}) && j(R.espacosDe(m, ob(m, 'v1'))) === j({ total: 4, usados: 1, livres: 3 }), 'em obra: ainda não produz, mas já ocupa o espaço');
  // terminar: produz
  ok(passo(x => R.terminarObra(x, 'v1', c1.id)) === true, 'terminar a obra');
  const pm = R.producaoPropria(m, ob(m, 'p1'));
  ok(j(pm.cons) === j({ orith: 3 }) && pm.total.orith === 6, 'pronta: a Mina produz 3 de Orith (com o das montanhas, 6): ' + j(pm));
  // subir de nível: paga o nível 2; o nível 1 continua valendo durante a obra
  const c1b = passo(x => R.subirNivel(x, 'v1', c1.id, 'fa', 'Obra: Mina de Orith (nível 2)'));
  ok(c1b && c1b.n === 1 && c1b.obra.n === 2 && c1b.obra.sem === 4 && j(R.producaoPropria(m, ob(m, 'p1')).cons) === j({ orith: 3 }), 'subir para o nível 2: em obra, e o nível 1 continua produzindo');
  eq(est(m, 'fa'), { lapros: 45, suprimentos: 0, madeira: 15, pedra: 25, orith: 20, runas: 0 }, 'o custo do nível 2 saiu do estoque');
  ok(R.proximoNivel(m, ob(m, 'v1').ass.cons[0]) === null, 'com a obra em andamento, não dá para subir de novo');
  // cancelar a obra do nível 2: devolve, e a mina fica no nível 1
  ok(passo(x => R.cancelarObra(x, 'v1', c1.id, 'Obra cancelada')) === true && j(ob(m, 'v1').ass.cons[0]) === j({ id: c1.id, t: 'mina', n: 1, obra: null }), 'cancelar a obra do nível 2: a mina fica no nível 1');
  eq(est(m, 'fa'), { lapros: 80, suprimentos: 0, madeira: 35, pedra: 40, orith: 20, runas: 0 }, 'e o que foi pago volta');
  eq(R.faltaPara(m, 'fa', R.tipoDe(m, 'muralha').niveis[2].custo), [{ id: 'pedra', nome: 'Pedra', falta: 50 }], 'o que falta para a Muralha 3: 50 de Pedra');
  // ninguém paga; sem semanas de obra: pronta na hora
  const c2 = passo(x => { x.eco.cons.find(c => c.id === 'palicada').niveis[0].sem = 0; return R.comecarObra(x, 'v1', 'palicada', null, ''); });
  ok(c2 && c2.n === 1 && c2.obra === null && est(m, 'fa').madeira === 35 && R.defDoAssentamento(m, ob(m, 'v1')) === 1, 'de graça e sem semanas de obra: a Paliçada fica pronta na hora e soma 1 de defesa');
  // o gasto das construções: o Quartel come suprimentos
  passo(x => { const c = R.comecarObra(x, 'v1', 'quartel', null, ''); R.terminarObra(x, 'v1', c.id); });
  const pq = R.producaoPropria(m, ob(m, 'p1'));
  ok(j(pq.gasto) === j({ suprimentos: -3 }) && pq.total.suprimentos === -3, 'o Quartel gasta 3 suprimentos por semana: ' + j(pq));
  passo(x => { const c = R.comecarObra(x, 'v2', 'fazenda', null, ''); R.terminarObra(x, 'v2', c.id); });
  const pd = R.producaoDaRegiao(m, ob(m, 'p1'));
  ok(pd.cons.suprimentos === 6 && pd.gasto.suprimentos === -3 && pd.total.suprimentos === 3 && j(R.producaoPropria(m, ob(m, 's1')).cons) === j({ suprimentos: 6 }),
    'a Fazenda da aldeia do Ducado: na parte dele, e a província soma (os 6 dela menos os 3 do Quartel): ' + j(pd));
  eq(R.espacosDe(m, ob(m, 'v1')), { total: 4, usados: 3, livres: 1 }, 'a vila: a mina, a paliçada e o quartel (1 espaço livre)');
  eq(R.exigenciasDe(m, ob(m, 'v1'), R.tipoDe(m, 'porto')).map(x => x.k), ['ter', 'esp'], 'o Porto: sem água na região e sem espaço (ocupa 2)');
  passo(x => { x.eco.cons.find(c => c.id === 'biblioteca').exige.cons = 'templo'; });
  eq(R.exigenciasDe(m, ob(m, 'v1'), R.tipoDe(m, 'biblioteca')).map(x => x.txt), ['precisa antes de Templo neste assentamento'], 'a Biblioteca que pede o Templo antes');
  const ct0 = passo(x => R.comecarObra(x, 'v1', 'templo', null, ''));
  const pedeTemplo = () => R.exigenciasDe(m, ob(m, 'v1'), R.tipoDe(m, 'biblioteca')).some(x => x.k === 'cons');
  ok(pedeTemplo(), 'o Templo em obra ainda não vale para a Biblioteca');
  passo(x => R.terminarObra(x, 'v1', ct0.id));
  ok(!pedeTemplo(), 'pronto, vale');
  passo(x => R.demolir(x, 'v1', ct0.id, ''));
  // demolir com a obra em andamento: devolve; cancelar a obra do nível 1: a construção sai
  const c4 = passo(x => R.comecarObra(x, 'v1', 'templo', 'fa', 'Obra: Templo'));
  ok(est(m, 'fa').pedra === 20 && passo(x => R.demolir(x, 'v1', c4.id, 'Demolido: Templo')) === true && !ob(m, 'v1').ass.cons.some(c => c.t === 'templo') && est(m, 'fa').pedra === 40 && est(m, 'fa').lapros === 80,
    'demolir o Templo em obra: sai, e o que foi pago volta');
  passo(x => { const c = R.comecarObra(x, 'v1', 'templo', 'fa', 'Obra: Templo'); R.cancelarObra(x, 'v1', c.id, 'Obra cancelada'); });
  ok(!ob(m, 'v1').ass.cons.some(c => c.t === 'templo') && est(m, 'fa').pedra === 40, 'cancelar a obra que ainda não ficou pronta: a construção sai, e o pago volta');
  // a defesa: soma (até 20); desligada, não soma
  passo(x => { ob(x, 'v1').ass.niv = 'metropole'; const c = R.comecarObra(x, 'v1', 'muralha', null, ''); R.terminarObra(x, 'v1', c.id); });
  ok(R.defDoAssentamento(m, ob(m, 'v1')) === 4, 'a Paliçada (1) e a Muralha (3): defesa 4');
  const m20 = N.normalizarMapa(Object.assign(JSON.parse(j(m)), { eco: Object.assign(JSON.parse(j(m.eco)), { cons: m.eco.cons.map(c => c.id === 'muralha' ? Object.assign({}, c, { niveis: c.niveis.map(x => Object.assign({}, x, { def: 20 })) }) : c) }) }));
  const off = N.normalizarMapa(Object.assign(JSON.parse(j(m)), { eco: Object.assign({}, m.eco, { on: false }) }));
  ok(R.defDoAssentamento(m20, ob(m20, 'v1')) === 20 && R.defDoAssentamento(off, ob(off, 'v1')) === 0, 'a defesa das construções vai até 20; com a economia desligada, não soma');

  // a normalização das construções do assentamento
  const nz = JSON.parse(j(m));
  ob(nz, 'v2').ass.cons = [{ id: 'a', t: 'nao-existe', n: 1 }, { id: 'b', t: 'fazenda', n: 9 }, { id: 'c', t: 'fazenda', n: 3, obra: { n: 4, sem: 2 } },
    { id: 'd', t: 'serraria', n: 1, obra: { n: 7, sem: 3, fac: 'zz', pago: { lapros: 5, xx: 3, madeira: -1 } } }, { id: 'e', t: 'taverna', n: 0 }];
  eq(ob(N.normalizarMapa(nz), 'v2').ass.cons, [{ id: 'b', t: 'fazenda', n: 3, obra: null }, { id: 'c', t: 'fazenda', n: 3, obra: null }, { id: 'd', t: 'serraria', n: 1, obra: { n: 2, sem: 3, fac: null, pago: { lapros: 5 } } }],
    'as construções do assentamento: só os tipos do catálogo, o nível até o último, a obra só do seguinte (quem pagou, só uma facção; o pago, só dos recursos do mundo); a sem nível nem obra sai');
  const sq = JSON.parse(j(m)); sq.eco.cons = sq.eco.cons.filter(c => c.id !== 'quartel');
  ok(!ob(N.normalizarMapa(sq), 'v1').ass.cons.some(c => c.t === 'quartel'), 'tirar o Quartel do catálogo: o da vila sai junto');

  // a sede do clã: os números do mestre vão para a facção ligada ao clã (sem ela, para a dona do lugar)
  const cl = JSON.parse(j(m));
  ob(cl, 'v1').ass.cla = { id: 'cla1', prod: { k1: { lapros: 5 }, k2: { orith: 2 }, k3: { xx: 1 } } };
  cl.objs.push({ id: 'v3', k: 'm', x: 700, y: 500, ass: { cla: { id: 'cla2' } } });
  const mcl = N.normalizarMapa(cl);
  eq([ob(mcl, 'v1').ass.cla, ob(mcl, 'v3').ass], [{ id: 'cla1', prod: { k1: { lapros: 5 }, k2: { orith: 2 } } }, { niv: null, pop: 0, cla: { id: 'cla2', prod: {} } }], 'a sede do clã: os números só dos recursos do mundo (e o marcador que só é sede fica)');
  const pf = (mm, clas) => R.producaoPorFaccao(mm, clas).por, a0 = pf(m).fa, b0 = pf(m).fb, a1 = pf(mcl).fa;
  ok(a1.lapros === (a0.lapros || 0) + 5 && a1.orith === (a0.orith || 0) + 2, 'sem saber do clã: para a dona do lugar (Aldar)');
  const viaVale = pf(mcl, new Map([['cla1', { fac: 'fb', cons: new Set(['k1', 'k2']) }]]));
  ok(j(viaVale.fa) === j(a0) && viaVale.fb.lapros === (b0.lapros || 0) + 5 && viaVale.fb.orith === (b0.orith || 0) + 2, 'o clã ligado ao Vale: a produção da sede vai para o Vale: ' + j(viaVale));
  const soK1 = pf(mcl, id => (id === 'cla1' ? { fac: null, cons: new Set(['k1']) } : null));
  ok(soK1.fa.lapros === (a0.lapros || 0) + 5 && (soK1.fa.orith || 0) === (a0.orith || 0), 'o clã sem facção ligada: para a dona do lugar; a construção que o clã não tem mais não conta');
}

console.log(bad ? bad + ' falharam de ' + n : n + ' verificações passaram');
process.exit(bad ? 1 : 0);
