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
//   · (parte 4) a semana (vira de domingo para segunda; as pendentes), a manutenção dos exércitos (por tipo, a cada 10
//     soldados, na proporção; a das sem tipo), a prévia (o estoque, a produção, a manutenção, o que fica — nunca abaixo
//     de zero —, o que falta, as construções que param, as consequências, as obras) e aplicar (com o que o mestre
//     recusou; as regras desligadas; uma semana de cada vez).
//   · (parte 5) a população por estrato: os estratos normalizados (os de começo no mapa de antes), a divisão por nível, as
//     pessoas de cada estrato (a de antes vira Camponeses), a produção pela população, o "Distribuir…" (pelos maiores
//     restos) e os lembretes na prévia.
//   · (parte 5b) as guildas: o catálogo e as da cidade normalizados, o catálogo pronto (pelo papel, pelos estratos, a moeda
//     do mapa), a guilda a partir de um modelo, a parte da facção e a da guilda, a produção (como "guildas") e a semana (o
//     estoque da guilda recebe a parte dela e paga o gasto).
//   · (pente fino) juntar o número da facção ao recurso do mundo de mesmo nome (com o histórico) e a população da facção
//     (a soma dos assentamentos; na projeção, com a economia ligada).
//   · a bandeira própria da facção (sem clã): normalizada (o que não serve volta ao de começo ou sai), ao lado da do clã,
//     e na projeção (a da facção escondida não vai).
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
  ok(!('pop' in e0.eco), '(parte 5) a tabela de antes (por mil pessoas) sai: a população produz pelos estratos');
  eq(e0.eco.niv.map(n => [n.id, n.nome, n.esp]), [['vila', 'Vila', 4], ['cid', 'Nível', 40]], 'os níveis: um id cada, os espaços de 0 a 40');
  ok(j(e0.eco.niv[0].dist) === j(N.DIST_INICIAL.vila) && j(e0.eco.niv[1].dist) === j(N.DIST_INICIAL.vila), '(parte 5) sem a divisão guardada, a de começo (a Vila pelo id; outro nível, a da Vila)');
  const ob = id => e0.objs.find(o => o.id === id);
  eq([ob('m1').ass, 'ass' in ob('m2'), ob('m3').ass, ob('r1').prod], [{ niv: 'vila', pop: 1201, estr: { camponeses: 1201 } }, false, { niv: null, pop: 30, estr: { camponeses: 30 } }, { la: 3, sal: -1.23 }],
    'o assentamento: o nível que não existe sai (sem população, o assentamento todo); a população sem estratos vira Camponeses; a produção do mestre só dos recursos do mundo');
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
  ok(ei.ter.pl.suprimentos === 2 && ei.ter.fl.madeira === 2 && ei.ter.mo.orith === 1 && !('ne' in ei.ter) && ei.niv.map(n => n.nome).join() === 'Aldeia,Vila,Cidade,Metrópole',
    'a tabela de começo (pelo papel: planície dá suprimentos, floresta madeira, montanha orith…) e os níveis');
  ok(ei.estr.length === 9 && j(ei.estr[0]) === j({ id: 'camponeses', nome: 'Camponeses', cor: '#9fbf4a', prod: { suprimentos: 0.6 }, lembra: '' }) && j(ei.niv[0].dist) === j(N.DIST_INICIAL.aldeia) && j(ei.niv[3].dist) === j(N.DIST_INICIAL.metropole),
    '(parte 5) os 9 estratos de começo (por pessoa, pelo papel do recurso) e a divisão de começo de cada nível');
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
  od('v1').ass = { niv: 'vila', pop: 0, estr: { camponeses: 50, mercadores: 5 } }; od('v2').ass = { niv: 'cidade', pop: 0, estr: { camponeses: 20, mercadores: 10, guarda: 10, nobreza: 2 } }; od('v3').ass = { niv: 'aldeia', pop: 0, estr: { camponeses: 10 } };
  const mp = N.normalizarMapa(mc);
  const o = id => mp.objs.find(x => x.id === id);
  eq(R.producaoPropria(mp, o('s2')), { terreno: { madeira: 8, suprimentos: 2 }, pop: {}, cons: {}, gasto: {}, guilda: {}, mestre: {}, total: { madeira: 8, suprimentos: 2 } }, 'a Prefeitura: só o terreno (4 florestas)');
  eq(R.producaoPropria(mp, o('s1')), { terreno: { pedra: 4, orith: 2 }, pop: { suprimentos: 30, lapros: 5 }, cons: {}, gasto: {}, guilda: {}, mestre: {}, total: { pedra: 4, orith: 2, suprimentos: 30, lapros: 5 } }, 'o Ducado: 2 montanhas e a vila (50 camponeses: 30 Suprimentos; 5 mercadores: 5 Lapros)');
  eq(R.producaoPropria(mp, o('p1')), { terreno: { suprimentos: 10 }, pop: { suprimentos: 8, lapros: 8 }, cons: {}, gasto: {}, guilda: {}, mestre: { lapros: 7 }, total: { suprimentos: 18, lapros: 15 } }, 'o Reino, a parte própria: 5 planícies, a cidade (a guarda e a nobreza consomem) e os 7 Lapros do mestre');
  eq(R.producaoDaRegiao(mp, o('p1')).total, { suprimentos: 50, lapros: 20, pedra: 4, orith: 2, madeira: 8 }, 'a província soma a dela e a das sub-regiões');
  eq(R.producaoPorFaccao(mp), { por: { fa: { suprimentos: 20, lapros: 15, madeira: 8 }, fb: { pedra: 4, orith: 2, suprimentos: 30, lapros: 5 } }, sem: {} }, 'por facção: Aldar com o Reino e a Prefeitura; o Vale com o Ducado (de outro dono); a aldeia fora das províncias não produz para ninguém');
  eq(R.assentamentosDaRegiao(mp, o('p1')).map(a => [a.o.id, a.r.id, a.nivel.nome]), [['v1', 's1', 'Vila'], ['v2', 'p1', 'Cidade']], 'os assentamentos de dentro da província (com a região e o nível de cada um)');
  const off = N.normalizarMapa(Object.assign(JSON.parse(j(mp)), { eco: Object.assign({}, mp.eco, { on: false }) }));
  ok(R.producaoPropria(off, off.objs.find(x => x.id === 'p1')) === null && j(R.producaoPorFaccao(off)) === j({ por: {}, sem: {} }) && off.eco.rec.length === 6,
    'desligada: nada produz, mas tudo fica guardado');
  // ligar de novo: a guardada (o nome que o mestre deu fica, nas facções também) volta a produzir
  const lo = JSON.parse(j(off)); lo.eco.rec[0].nome = 'Ouro';
  const rel3 = R.ligarEconomia(lo), mo = N.normalizarMapa(lo);
  ok(mo.eco.on === true && mo.eco.rec.length === 6 && mo.eco.rec[0].nome === 'Ouro' && mo.faccoes[0].rec[0].nome === 'Ouro' && rel3.semana === false && R.producaoPropria(mo, mo.objs.find(x => x.id === 'p1')).total.lapros === 15,
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

/* ---- (parte 4) fechar a semana ---- */
{
  const base = { nome: 'M', larg: 2000, alt: 1400, grade: { tam: 40, x: 0, y: 0, orient: 'pe', on: true },
    faccoes: [{ id: 'fa', nome: 'Aldar', apoio: 60 }, { id: 'fb', nome: 'Vale' }], guerra: { tipos: [{ id: 'inf', nome: 'Infantaria' }, { id: 'cer', nome: 'Cerco' }] },
    objs: [
      { id: 'p1', k: 'r', nome: 'Reino', fac: 'fa', pts: quad(0, 0, 800, 600) },
      { id: 's1', k: 'r', nome: 'Ducado', fac: 'fb', pai: 'p1', pts: quad(20, 20, 380, 280) },
      { id: 'v1', k: 'm', x: 600, y: 450, nome: 'Vila Alta' },
      { id: 'v2', k: 'm', x: 100, y: 100, nome: 'Aldeia do Vale' },
      { id: 'ga', k: 'g', x: 500, y: 500, tipo: 'exercito', fac: 'fa', exe: { moral: 5, unid: [{ id: 'u1', tipo: 'inf', tropas: 25 }, { id: 'u2', tropas: 10 }] } },
      { id: 'gb', k: 'g', x: 150, y: 150, tipo: 'exercito', fac: 'fb', exe: { moral: 6, unid: [{ id: 'u3', tipo: 'cer', tropas: 20 }] } }] };
  const ml = JSON.parse(j(N.normalizarMapa(base)));
  ml.cal.dia = 3;
  const rel = R.ligarEconomia(ml);
  let m = N.normalizarMapa(ml);
  ok(rel.semana === true && N.semanaDe(m.cal, 3) === 0 && m.eco.sem === R.semanaN(m, 3) && R.semanasPendentes(m) === 0, 'ligar: hoje vira segunda-feira e a semana começa a contar (nenhuma pendente)');
  eq([m.eco.manut0, m.eco.manut, m.eco.regras], [{ suprimentos: 1, lapros: 1 }, {}, { fome: 10, moral: 1, obras: true, outro: true, moralOutro: 1 }], 'a manutenção das unidades sem tipo de começo (1 de comida e 1 de moeda a cada 10) e as regras da falta de começo');
  // o calendário anda: domingo ainda é a mesma semana; segunda, uma para fechar; duas segundas, duas
  const comDia = d => N.normalizarMapa(Object.assign(JSON.parse(j(m)), { cal: Object.assign({}, m.cal, { dia: d }) }));
  eq([R.semanasPendentes(comDia(9)), R.semanasPendentes(comDia(10)), R.semanasPendentes(comDia(17)), R.semanasPendentes(comDia(1))], [0, 1, 2, 0], 'a semana vira de domingo para segunda (dia 9 é domingo: nenhuma; 10: uma; 17: duas; para trás: nenhuma)');
  // a manutenção dos exércitos (por tipo, a cada 10 soldados, na proporção)
  const mx = JSON.parse(j(m));
  mx.eco.manut = { inf: { suprimentos: 2, lapros: 1 }, cer: { pedra: 1 }, zz: { lapros: 9 } };
  mx.eco.cons.push({ id: 'forno', nome: 'Forno', esp: 1, niveis: [{ custo: {}, sem: 1, prod: { lapros: 5 }, gasto: { pedra: 2 } }] });
  const o = id => mx.objs.find(x => x.id === id);
  o('v1').ass = { niv: 'metropole', pop: 0, cons: [{ id: 'k1', t: 'fazenda', n: 1 }, { id: 'k2', t: 'santuario', n: 1 }, { id: 'k3', t: 'quartel', n: 1 }, { id: 'k4', t: 'templo', n: 0, obra: { n: 1, sem: 2, fac: 'fa', pago: {} } }, { id: 'k7', t: 'forno', n: 1 }] };
  o('v2').ass = { niv: 'aldeia', pop: 0, cons: [{ id: 'k5', t: 'forno', n: 1 }, { id: 'k6', t: 'celeiro', n: 0, obra: { n: 1, sem: 1, fac: null, pago: {} } }] };
  const fa = mx.faccoes[0], fb = mx.faccoes[1];
  fa.rec.find(r => r.id === 'lapros').n = 4; fa.rec.find(r => r.id === 'suprimentos').n = 1;
  fb.rec.find(r => r.id === 'pedra').n = 1;
  mx.cal.dia = 10;
  m = N.normalizarMapa(mx);
  eq(m.eco.manut, { inf: { suprimentos: 2, lapros: 1 }, cer: { pedra: 1 } }, 'a manutenção: só dos tipos de tropa que existem');
  const mn0 = N.normalizarMapa(Object.assign(JSON.parse(j(m)), { eco: Object.assign(JSON.parse(j(m.eco)), { manut0: { lapros: -1, suprimentos: 2 }, regras: { fome: 500, moral: -3, obras: 'não', outro: 0, moralOutro: 99 } }) }));
  eq([mn0.eco.manut0, mn0.eco.regras], [{ suprimentos: 2 }, { fome: 100, moral: 0, obras: false, outro: false, moralOutro: 10 }], 'a manutenção só de números acima de zero; as regras nos limites (o apoio até 100, a moral até 10)');
  eq([R.manutencaoDe(m, m.objs.find(x => x.id === 'ga')), R.manutencaoDe(m, m.objs.find(x => x.id === 'gb'))], [{ suprimentos: 6, lapros: 3.5 }, { pedra: 2 }],
    'a manutenção da Hoste: 25 de infantaria (2,5 × 2 de comida e 1 de moeda) e 10 sem tipo; a do Vale, 20 de cerco (2 de pedra)');
  // a prévia
  const p = R.semanaPrevia(m);
  const pa = p.fac.find(x => x.id === 'fa'), pb = p.fac.find(x => x.id === 'fb');
  ok(p.n === m.eco.sem && p.pendentes === 1 && p.de === 3 && p.ate === 9, 'a prévia da semana que acabou (de segunda, dia 3, a domingo, dia 9)');
  eq([pa.est, pa.prod, pa.manut, pa.fica, pa.falta], [{ lapros: 4, suprimentos: 1 }, { suprimentos: 3, runas: 3, lapros: -2 }, { suprimentos: 6, lapros: 3.5 }, { runas: 3 }, { lapros: 1.5, suprimentos: 2 }],
    'Aldar: o estoque, a produção (a Fazenda menos o Quartel; as runas e o gasto do Santuário), a manutenção, o que fica (nunca abaixo de zero) e o que falta');
  eq([pb.prod, pb.fica, pb.falta, pb.paradas], [{}, {}, { pedra: 1 }, [{ o: 'v2', c: 'k5', t: 'forno', r: 'pedra' }]],
    'o Vale sem pedra: o Forno dele para (nem produz os 5 Lapros, nem gasta as 2 pedras; o de Aldar não conta para o Vale), e ainda falta 1 para o cerco');
  eq(pa.paradas, [{ o: 'v1', c: 'k7', t: 'forno', r: 'pedra' }], 'o Forno de Aldar também para (sem pedra)');
  eq(p.cons.map(c => [c.id, c.de, c.para]), [['fome:fa', 60, 50], ['obras:fa', undefined, undefined], ['moral:ga', 5, 4], ['outro:gb', 6, 5]],
    'as consequências: a fome de Aldar (apoio 60 → 50), as obras dela param, a Hoste perde moral (sem Lapros) e o cerco do Vale (sem pedra)');
  eq(p.obras.map(w => [w.c, w.sem0, w.sem1, w.pronta, w.parada]), [['k4', 2, 2, false, true], ['k6', 1, 0, true, false]], 'as obras: o Templo de Aldar para (sem Lapros); o Celeiro (sem ninguém pagando) fica pronto');
  // aplicar (o mestre recusa a moral da Hoste)
  const rasc = JSON.parse(j(m)), feito = R.aplicarSemana(rasc, null, ['moral:ga'], 'Semana até o dia 9');
  const ma = N.normalizarMapa(rasc), fa2 = ma.faccoes[0], g2 = id => ma.objs.find(x => x.id === id);
  ok(!!feito && ma.eco.sem === m.eco.sem + 1 && R.semanasPendentes(ma) === 0, 'aplicar: a semana fecha (nenhuma pendente)');
  ok(j(Object.fromEntries(fa2.rec.map(r => [r.id, r.n]))) === j({ lapros: 0, suprimentos: 0, madeira: 0, pedra: 0, orith: 0, runas: 3 }) && fa2.apoio === 50 && fa2.hist[fa2.hist.length - 1].mot === 'Semana até o dia 9',
    'Aldar: os estoques no que sobrou, o apoio 50 (com o motivo no histórico): ' + j(fa2.rec));
  ok(g2('ga').exe.moral === 5 && g2('gb').exe.moral === 5, 'a moral recusada não cai (a Hoste fica com 5); a do cerco do Vale cai para 5');
  ok(j(g2('v1').ass.cons.find(c => c.id === 'k4').obra) === j({ n: 1, sem: 2, fac: 'fa', pago: {} }) && j(g2('v2').ass.cons.find(c => c.id === 'k6')) === j({ id: 'k6', t: 'celeiro', n: 1, obra: null }), 'o Templo continua parado; o Celeiro ficou pronto');
  // recusar "as obras param": a obra anda mesmo sem moeda
  const r2 = JSON.parse(j(m)); R.aplicarSemana(r2, null, ['obras:fa'], '');
  ok(N.normalizarMapa(r2).objs.find(x => x.id === 'v1').ass.cons.find(c => c.id === 'k4').obra.sem === 1, 'recusando "as obras param", o Templo anda uma semana');
  // as regras do mestre: sem a fome, sem a moral, sem parar as construções
  const r3 = JSON.parse(j(m)); r3.eco.regras = { fome: 0, moral: 0, obras: false, outro: false, moralOutro: 0 };
  const p3 = R.semanaPrevia(N.normalizarMapa(r3));
  ok(p3.cons.length === 0 && p3.fac.find(x => x.id === 'fb').paradas.length === 0 && j(p3.fac.find(x => x.id === 'fb').falta) === j({ pedra: 3 }) && p3.obras.every(w => !w.parada),
    'com as regras desligadas: nenhuma consequência, o Forno não para (falta mais pedra) e as obras andam');
  // duas semanas pendentes: uma de cada vez
  const r4 = JSON.parse(j(m)); r4.cal.dia = 17;
  const m4 = N.normalizarMapa(r4), p4 = R.semanaPrevia(m4);
  ok(p4.pendentes === 2 && p4.de === 3, 'duas semanas pendentes: a prévia é a da primeira');
  R.aplicarSemana(r4, null, [], ''); const m5 = N.normalizarMapa(r4);
  ok(R.semanasPendentes(m5) === 1 && R.semanaPrevia(m5).de === 10, 'aplicada a primeira, a segunda é a próxima (dia 10 a 16)');
  // o apoio sem número: a fome não tem o que tirar
  const r6 = JSON.parse(j(m)); r6.faccoes[0].apoio = null;
  ok(!R.semanaPrevia(N.normalizarMapa(r6)).cons.some(c => c.tipo === 'fome'), 'sem o apoio escrito, a fome não propõe nada');
  // o calendário que volta e depois anda não reabre a semana já fechada
  const r7 = JSON.parse(j(ma)); r7.cal.dia = 4;
  const m7 = N.normalizarMapa(r7), r8 = JSON.parse(j(m7)); r8.cal.dia = 11;
  ok(R.semanasPendentes(m7) === 0 && R.semanasPendentes(N.normalizarMapa(r8)) === 0 && m7.eco.sem === ma.eco.sem, 'voltar o calendário para a semana fechada e andar de novo: nenhuma semana para fechar');
  // ligar de novo depois de um tempo desligada: começa da semana de hoje (sem as que passaram)
  const r9 = JSON.parse(j(ma)); r9.eco.on = false; r9.cal.dia = 40;
  const m9 = N.normalizarMapa(r9), r10 = JSON.parse(j(m9)); R.ligarEconomia(r10);
  ok(R.semanasPendentes(N.normalizarMapa(r10)) === 0, 'ligar de novo depois de semanas desligada: nenhuma pendente');
  // sem a semana pendente, nada
  ok(R.semanaPrevia(comDia(9)) === null && R.aplicarSemana(JSON.parse(j(comDia(9))), null, [], '') === null, 'sem semana pendente: sem prévia, e aplicar não faz nada');
}

/* ---- (parte 5) a população por estrato ---- */
{
  const REC = [{ id: 'la', nome: 'Lapros', papel: 'moeda' }, { id: 'su', nome: 'Suprimentos', papel: 'comida' }, { id: 'ru', nome: 'Runas', papel: 'magia' }];
  // os estratos normalizados
  const e1 = N.normalizarMapa({ nome: 'M', eco: { on: true, rec: REC, niv: [{ id: 'vila', nome: 'Vila', esp: 4, dist: { cam: 60, mer: '40', xx: 5, out: -3 } }, { id: 'nv1', nome: 'Forte', esp: 2 }],
    estr: [{ id: 'cam', nome: '  Camponeses ', cor: '#9FBF4A', prod: { su: 0.6, xx: 1, la: 0 }, lembra: '  ' }, { id: 'cam', nome: 'repetido' }, { id: 'mer', nome: '', prod: { la: '1,5' }, lembra: 'x'.repeat(120) }, { nome: 'sem id' }] } }).eco;
  eq(e1.estr.map(s => [s.id, s.nome, s.cor, s.prod, s.lembra.length]), [['cam', 'Camponeses', '#9fbf4a', { su: 0.6 }, 0], ['mer', 'Estrato', '#9aa3b5', {}, 80]],
    'os estratos: um id cada, o nome aparado (vazio: "Estrato"), a produção só dos recursos do mundo (sem os zeros), o lembrete até 80 letras');
  eq([e1.niv[0].dist, e1.niv[1].dist], [{ cam: 60, mer: 40 }, {}], 'a divisão do nível: só dos estratos que existem e acima de zero; o nível sem divisão fica com a de começo (só dos estratos que existem: aqui, nenhum)');
  const e2 = N.normalizarMapa({ nome: 'M', eco: { on: true, rec: REC, estr: [], niv: [{ id: 'vila', nome: 'Vila', esp: 4, dist: {} }] } }).eco;
  ok(e2.estr.length === 0 && j(e2.niv[0].dist) === '{}', 'sem nenhum estrato (o mestre tirou todos) e a divisão vazia: ficam assim (não voltam os de começo)');
  const e3 = N.normalizarMapa({ nome: 'M', eco: { on: true, rec: REC } }).eco;
  ok(e3.estr.length === 9 && j(e3.estr.find(s => s.id === 'mercadores').prod) === j({ la: 1 }) && j(e3.estr.find(s => s.id === 'artesaos').prod) === '{}' && e3.estr.find(s => s.id === 'aventureiros').lembra === 'rumores',
    'o mapa de antes (sem a lista): os 9 de começo; a produção vai para o recurso de cada papel (sem madeira nem pedra, os artesãos não produzem)');
  // as pessoas de cada estrato no assentamento
  const base = { nome: 'M', larg: 2000, alt: 1400, faccoes: [{ id: 'fa', nome: 'Aldar' }],
    eco: { on: true, rec: REC, niv: [{ id: 'vila', nome: 'Vila', esp: 4 }, { id: 'cidade', nome: 'Cidade', esp: 6 }],
      estr: [{ id: 'cam', nome: 'Camponeses', prod: { su: 0.6 } }, { id: 'mer', nome: 'Mercadores', prod: { la: 1 }, lembra: 'comércio' }, { id: 'gua', nome: 'Guarda', prod: { su: -0.4 }, lembra: 'defesa' }, { id: 'cle', nome: 'Clero', prod: { ru: 0.25 } }] },
    objs: [
      { id: 'r', k: 'r', nome: 'Reino', fac: 'fa', pts: quad(0, 0, 900, 900) },
      { id: 'a1', k: 'm', x: 100, y: 100, ass: { niv: 'vila', pop: 999, estr: { cam: 50.4, mer: '7', gua: -3, xx: 9, fan: 4 }, cons: [{ id: 'k', t: 'nada', n: 1 }] } },
      { id: 'a2', k: 'm', x: 200, y: 100, ass: { niv: 'cidade', pop: 40, cla: { id: 'c1', prod: {} } } },
      { id: 'a3', k: 'm', x: 300, y: 100, ass: { niv: 'vila', pop: 0, estr: { fan: 9 } } }] };
  const mb = N.normalizarMapa(base), o = id => mb.objs.find(x => x.id === id);
  eq(o('a1').ass, { niv: 'vila', pop: 57, estr: { cam: 50, mer: 7 } }, 'as pessoas de cada estrato: inteiras, só as dos estratos que existem (a população é a soma)');
  eq(o('a2').ass, { niv: 'cidade', pop: 40, estr: { cam: 40 }, cla: { id: 'c1', prod: {} } }, 'a população de antes (sem estratos) vira Camponeses, com as chaves na ordem de sempre');
  eq(o('a3').ass, { niv: 'vila', pop: 0 }, 'só de estratos que não existem: a população fica zero');
  const semCam = JSON.parse(j(base)); semCam.eco.estr = semCam.eco.estr.filter(s => s.id !== 'cam');
  eq(N.normalizarMapa(semCam).objs.find(x => x.id === 'a2').ass.estr, { mer: 40 }, 'sem os Camponeses, a população de antes vai para o primeiro estrato');
  const depois = JSON.parse(j(base)); depois.eco.estr = [{ id: 'mer', nome: 'Mercadores' }, { id: 'camponeses', nome: 'Camponeses' }];
  eq(N.normalizarMapa(depois).objs.find(x => x.id === 'a2').ass.estr, { camponeses: 40 }, 'com os Camponeses (mesmo não sendo o primeiro), a população de antes vai para eles');
  const nenhum = JSON.parse(j(base)); nenhum.eco.estr = [];
  eq(N.normalizarMapa(nenhum).objs.find(x => x.id === 'a2').ass, { niv: 'cidade', pop: 40, cla: { id: 'c1', prod: {} } }, 'sem nenhum estrato no mundo, a população fica como estava (sem estrato)');
  ok(j(N.normalizarMapa(JSON.parse(j(mb)))) === j(mb), 'normalizar de novo não muda nada (a população e a ordem das chaves)');
  // a produção pela população
  eq(R.producaoDaPopulacao(mb, o('a1')), { su: 30, la: 7 }, 'o que a população produz por semana: 50 camponeses (30 Suprimentos) e 7 mercadores (7 Lapros)');
  const mg = JSON.parse(j(mb)); mg.objs.find(x => x.id === 'a1').ass.estr = { cam: 10, gua: 20, cle: 3 };
  const mgn = N.normalizarMapa(mg);
  eq(R.producaoDaPopulacao(mgn, mgn.objs.find(x => x.id === 'a1')), { su: -2, ru: 0.75 }, 'quem consome tira: 10 camponeses (+6) e 20 guardas (−8) dão −2 Suprimentos; 3 do clero, 0,75 Runa');
  eq(R.producaoPropria(mb, o('r')).pop, { su: 54, la: 7 }, 'a região soma a população dos assentamentos dela (a1 e a2)');
  // o "Distribuir…": as porcentagens do nível, pelos maiores restos
  const md = N.normalizarMapa(Object.assign(JSON.parse(j(base)), { eco: Object.assign(JSON.parse(j(base.eco)), { niv: [{ id: 'vila', nome: 'Vila', esp: 4, dist: { cam: 50, mer: 30, gua: 20 } }, { id: 'cidade', nome: 'Cidade', esp: 6, dist: { cam: 1, mer: 1, gua: 1 } }, { id: 'vazio', nome: 'Vazio', esp: 1, dist: {} }] }) }));
  eq(R.distribuir(md, 'vila', 100), { cam: 50, mer: 30, gua: 20 }, 'distribuir 100 na Vila: 50, 30 e 20');
  eq(R.distribuir(md, 'vila', 7), { cam: 4, mer: 2, gua: 1 }, 'distribuir 7: 3,5 / 2,1 / 1,4 → os maiores restos levam o que sobra (a soma é 7)');
  eq(R.distribuir(md, 'cidade', 10), { cam: 4, mer: 3, gua: 3 }, 'partes iguais (não precisa somar 100): o empate fica com quem vem antes');
  eq([R.distribuir(md, 'vazio', 12), R.nivelDaDivisao(md, 'vazio').id, R.distribuir(md, null, 10)], [{ cam: 6, mer: 4, gua: 2 }, 'vila', { cam: 5, mer: 3, gua: 2 }], 'o nível sem divisão (ou sem nível) usa a do primeiro nível que tem (12: 6 / 3,6 / 2,4 → 6, 4, 2)');
  eq([R.distribuir(md, 'vila', 0), R.distribuir(md, 'vila', -5)], [{}, {}], 'nada para distribuir: nada');
  for (const t of [1, 2, 3, 13, 99, 101, 1000]) { const d = R.distribuir(md, 'vila', t); ok(Object.values(d).reduce((a, b) => a + b, 0) === t, 'distribuir ' + t + ': a soma é ' + t + ' (' + j(d) + ')'); }
  // os lembretes na prévia (sem mudar nenhum número)
  const ms = N.normalizarMapa(Object.assign(JSON.parse(j(mb)), { cal: Object.assign({}, mb.cal, { sem0: 0, dia: 7 }), eco: Object.assign(JSON.parse(j(mb.eco)), { sem: 0 }) }));
  const pv = R.semanaPrevia(ms);
  eq(pv.lembretes, [{ o: 'a1', fac: 'fa', itens: [{ estr: 'mer', n: 7, txt: 'comércio' }] }], 'a prévia lembra o que os estratos com lembrete fazem (por assentamento, com a facção dona)');
  const ap = JSON.parse(j(ms)); R.aplicarSemana(ap, null, [], 'Semana');
  ok(j(N.normalizarMapa(ap).objs.find(x => x.id === 'a1').ass) === j(ms.objs.find(x => x.id === 'a1').ass), 'aplicar a semana não mexe na população (o lembrete é só lembrete)');
  // a economia de começo já vem com os estratos e a divisão
  const ml = N.normalizarMapa({ nome: 'M' }), r0 = JSON.parse(j(ml)); R.ligarEconomia(r0);
  const ligado = N.normalizarMapa(r0).eco;
  ok(ligado.estr.length === 9 && ligado.niv.every(n => Object.keys(n.dist).length >= 8), 'ligar a economia: os 9 estratos e a divisão de cada nível');
}

/* ---- (parte 5b) as guildas ---- */
{
  const REC = [{ id: 'la', nome: 'Lapros', papel: 'moeda' }, { id: 'su', nome: 'Suprimentos', papel: 'comida' }, { id: 'ru', nome: 'Runas', papel: 'magia' }];
  const ESTR = [{ id: 'mer', nome: 'Mercadores', prod: { la: 1 } }, { id: 'cam', nome: 'Camponeses', prod: { su: 0.6 } }];
  // a normalização: o catálogo (os modelos) e as guildas da cidade
  const g0 = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, faccoes: [{ id: 'fa', nome: 'Aldar' }],
    eco: { on: true, rec: REC, estr: ESTR, niv: [{ id: 'vila', nome: 'Vila', esp: 4 }],
      guildas: [{ id: 'm1', nome: '  Mercadores ', ic: 'balanca', estr: 'mer', prod: { la: 6, xx: 3 }, gasto: { su: 1, la: -2 }, pct: 140, membros: 9, lider: { nome: 'x' }, est: { la: 5 },
        serv: [{ tipo: 'item', nome: ' Seda ', preco: ' 12 Lapros ', desc: 'fina' }, { tipo: 'outro', nome: 'Rota' }, { nome: '   ' }], secreta: 'sim' }, { id: 'm1', nome: '', ic: 'Não Vale', estr: 'fantasma' }, 'lixo'] },
    objs: [
      { id: 'r', k: 'r', nome: 'Reino', fac: 'fa', pts: quad(0, 0, 900, 900) },
      { id: 'c1', k: 'm', x: 100, y: 100, ass: { niv: 'vila', pop: 0, estr: { mer: 10, cam: 30 }, guildas: [
        { id: 'g1', nome: 'Guilda dos Mercadores', ic: 'balanca', estr: 'mer', membros: '8', lider: { nome: '  Ilsa ', ficha: 'pc_ilsa' }, infl: 30, rel: -19, prod: { la: 6 }, gasto: { su: 1 }, pct: 50, est: { la: 10, su: 0, zz: 4 },
          serv: [{ id: 's', tipo: 'contrato', nome: 'Escolta', preco: '40 Lapros' }, { id: 's', tipo: 'info', nome: 'Preços' }], secreta: false },
        { id: 'g2', nome: 'Ladrões', estr: 'fantasma', membros: -4, prod: { su: 2 }, pct: 0, secreta: 1 }] } },
      { id: 'c2', k: 'm', x: 1500, y: 100, ass: { niv: null, pop: 0, guildas: [{ nome: 'Sozinha' }] } }] });
  const cat = g0.eco.guildas;
  eq(cat.map(t => Object.keys(t)), [['id', 'nome', 'ic', 'txt', 'estr', 'prod', 'gasto', 'pct', 'serv', 'secreta'], ['id', 'nome', 'ic', 'txt', 'estr', 'prod', 'gasto', 'pct', 'serv', 'secreta']], 'o catálogo de guildas: os modelos, sem membros, líder, influência, relação nem estoque');
  eq([cat[0].nome, cat[0].prod, cat[0].gasto, cat[0].pct, cat[0].secreta, cat[1].id, cat[1].nome, cat[1].ic, cat[1].estr], ['Mercadores', { la: 6 }, { su: 1 }, 100, true, 'm1_2', 'Guilda', 'salao', null],
    'o modelo: o nome aparado (vazio: "Guilda"), só os recursos do mundo, o gasto acima de zero, a parte da facção até 100; o id repetido ganha outro, o ícone que não vale e o estrato que não existe saem');
  eq(cat[0].serv, [{ id: 'sv', tipo: 'item', nome: 'Seda', preco: '12 Lapros', desc: 'fina' }, { id: 'sv_2', tipo: 'contrato', nome: 'Rota', preco: '', desc: '' }], 'os serviços: o tipo que não existe vira contrato, sem nome sai');
  const c1 = g0.objs.find(o => o.id === 'c1').ass, [g1, g2] = c1.guildas;
  eq(Object.keys(g1), ['id', 'nome', 'ic', 'txt', 'estr', 'membros', 'lider', 'infl', 'rel', 'prod', 'gasto', 'pct', 'est', 'serv', 'secreta'], 'a guilda da cidade: as chaves na ordem de sempre');
  eq([g1.membros, g1.lider, g1.infl, g1.rel, g1.est, g1.serv.map(s => s.id)], [8, { nome: 'Ilsa', ficha: 'pc_ilsa' }, 10, -10, { la: 10 }, ['s', 's_2']],
    'os membros inteiros, o líder (o nome aparado e a ficha), a influência até +10, a relação até −10 (pente fino: como a do clã), o estoque só dos recursos do mundo e acima de zero');
  eq([g2.estr, g2.membros, g2.secreta, g2.pct], [null, 0, true, 0], 'o estrato que não existe sai; os membros não ficam negativos');
  ok(j(g0.objs.find(o => o.id === 'c2').ass) === j({ niv: null, pop: 0, guildas: [{ id: 'gd', nome: 'Sozinha', ic: 'salao', txt: '', estr: null, membros: 0, lider: { nome: '', ficha: null }, infl: 0, rel: 0, prod: {}, gasto: {}, pct: 50, est: {}, serv: [], secreta: false }] }),
    'o marcador que só tem uma guilda continua assentamento (a guilda com o de começo)');
  ok(j(N.normalizarMapa(JSON.parse(j(g0)))) === j(g0), 'normalizar de novo não muda nada');
  const semCat = N.normalizarMapa({ nome: 'M', eco: { on: true, rec: REC } }).eco;
  ok(Array.isArray(semCat.guildas) && semCat.guildas.length === 0, 'o mapa de antes, sem o catálogo de guildas: vazio (o mestre põe as prontas)');
  const ant = N.normalizarMapa({ nome: 'M', eco: { on: true, rec: REC, estr: ESTR }, objs: [{ id: 'a', k: 'm', x: 1, y: 1, ass: { niv: null, pop: 7, cla: { id: 'k', prod: {} }, guildas: [{ nome: 'G' }] } }] });
  eq(Object.keys(ant.objs[0].ass), ['niv', 'pop', 'estr', 'cla', 'guildas'], 'a população de antes que vira estrato: as guildas ficam por último');
  // o catálogo pronto e a guilda a partir de um modelo
  const ei = R.ecoInicial(N.normalizarMapa({ nome: 'M' }));
  const pr = ei.guildas;
  eq(pr.map(t => t.id), ['cacadores', 'assassinos', 'ladroes', 'mercadores', 'magos', 'artesaos', 'aventureiros', 'bardos'], 'o catálogo de começo: as 8 guildas');
  const mer = pr.find(t => t.id === 'mercadores'), ass = pr.find(t => t.id === 'assassinos');
  ok(j(mer.prod) === j({ lapros: 6 }) && j(mer.gasto) === j({ suprimentos: 1 }) && mer.estr === 'mercadores' && mer.serv[0].preco === '40 Lapros' && ass.secreta === true && ass.pct === 0,
    'pelo papel dos recursos e pelos estratos de começo; os preços na moeda do mapa; os assassinos, secretos, não dão nada à facção');
  const ren = JSON.parse(j(ei)); ren.rec[0].nome = 'Coroas'; ren.estr = ren.estr.filter(s => s.id !== 'mercadores');
  const pr2 = R.guildasProntas(null, ren), mer2 = pr2.find(t => t.id === 'mercadores');
  ok(mer2.serv[0].preco === '40 Coroas' && mer2.estr === null, 'com a moeda renomeada, os preços nela; sem o estrato, a guilda fica sem');
  const gm = R.guildaDoModelo(mer, 'gx');
  eq([gm.id, gm.nome, gm.membros, gm.lider, gm.infl, gm.rel, gm.est, gm.prod, gm.serv.length], ['gx', 'Guilda dos Mercadores', 0, { nome: '', ficha: null }, 0, 0, {}, { lapros: 6 }, 3], 'a guilda nova a partir de um modelo: o que é de cada cidade começa vazio');
  gm.prod.lapros = 99; ok(mer.prod.lapros === 6, '(é uma cópia: o modelo não muda)');
  eq(R.guildaDoModelo(null, 'gy').nome, 'Guilda', 'em branco: "Guilda"');
  // a parte da facção e a da guilda
  eq(R.partesDaGuilda({ prod: { la: 6, su: 1 }, pct: 50 }), { fac: { la: 3, su: 0.5 }, guilda: { la: 3, su: 0.5 } }, 'metade para a facção, metade para o estoque');
  eq(R.partesDaGuilda({ prod: { la: 3 }, pct: 0 }), { fac: {}, guilda: { la: 3 } }, '0%: tudo para o estoque da guilda');
  eq(R.partesDaGuilda({ prod: { la: 3 }, pct: 100 }), { fac: { la: 3 }, guilda: {} }, '100%: tudo para a facção');
  // a produção da região e da facção
  const p = R.producaoPropria(g0, g0.objs.find(o => o.id === 'r'));
  eq([p.guilda, p.total], [{ la: 3 }, { la: 13, su: 18 }], 'a região: a parte da facção das guildas (metade dos 6 Lapros; os ladrões dão 0%) entra na produção, como "guildas"');
  eq(R.producaoPorFaccao(g0).por.fa, { la: 13, su: 18 }, 'e na da facção dona da cidade');
  // a semana: a parte da guilda entra no estoque dela; o gasto sai dele
  const ms = N.normalizarMapa(Object.assign(JSON.parse(j(g0)), { cal: Object.assign({}, g0.cal, { sem0: 0, dia: 7 }), eco: Object.assign(JSON.parse(j(g0.eco)), { sem: 0 }) }));
  const pv = R.semanaPrevia(ms);
  eq(pv.guildas.map(w => [w.o, w.g, w.fac, w.est, w.paraFac, w.paraGuilda, w.gasto, w.fica, w.falta]), [
    ['c1', 'g1', 'fa', { la: 10 }, { la: 3 }, { la: 3 }, { su: 1 }, { la: 13 }, { su: 1 }],
    ['c1', 'g2', 'fa', {}, {}, { su: 2 }, {}, { su: 2 }, {}],
    ['c2', 'gd', null, {}, {}, {}, {}, {}, {}]].filter(x => x[0] !== 'c2'),
    'a prévia: cada guilda recebe a parte dela, paga o gasto (o que falta só aparece: o estoque fica em zero); a guilda sem nada não aparece');
  const ap = JSON.parse(j(ms)); R.aplicarSemana(ap, null, [], 'Semana');
  const apn = N.normalizarMapa(ap), gs = apn.objs.find(o => o.id === 'c1').ass.guildas;
  eq([gs[0].est, gs[1].est], [{ la: 13 }, { su: 2 }], 'aplicar: o estoque de cada guilda fica no que sobrou');
  const pj = N.projetar(g0);
  ok(!pj.objs.some(o => 'ass' in o) && !('eco' in pj), 'na projeção, nada das guildas (por enquanto, tudo do mestre: a parte 6 decide o que os jogadores veem)');
}

/* ---- (pente fino) juntar pelo nome e a população da facção ---- */
{
  const REC = [{ id: 'lapros', nome: 'Lapros', papel: 'moeda' }, { id: 'su', nome: 'Suprimentos', papel: 'comida' }];
  const base = { nome: 'M', larg: 2000, alt: 1400, cal: { dia: 3 },
    eco: { on: true, rec: REC, estr: [{ id: 'cam', nome: 'Camponeses', prod: { su: 0.6 } }], niv: [{ id: 'vila', nome: 'Vila', esp: 4 }] },
    faccoes: [
      { id: 'fa', nome: 'Aldar', ver: { pop: true }, pop: 999, rec: [{ id: 'lapros', nome: 'Lapros', n: 30 }, { id: 'rc1', nome: '  LÁPROS ', n: 12, ver: true }, { id: 'rc2', nome: 'Honra', n: 3 }],
        hist: [{ d: 1, mot: 'tesouro', mud: [['r:rc1', 'lápros', 0, 12]] }] },
      { id: 'fb', nome: 'Vale', pop: 50, rec: [{ id: 'rc3', nome: 'suprimentos', n: 7 }] }],
    objs: [
      { id: 'r1', k: 'r', nome: 'Reino', fac: 'fa', pts: quad(0, 0, 900, 900) },
      { id: 'r2', k: 'r', nome: 'Vale', fac: 'fb', pts: quad(1000, 0, 1900, 900) },
      { id: 'a1', k: 'm', x: 100, y: 100, ass: { niv: 'vila', pop: 0, estr: { cam: 40 } } },
      { id: 'a2', k: 'm', x: 200, y: 100, ass: { niv: 'vila', pop: 0, estr: { cam: 25 } } },
      { id: 'a3', k: 'm', x: 1200, y: 100, ass: { niv: 'vila', pop: 0, estr: { cam: 10 } } },
      { id: 'a4', k: 'm', x: 1950, y: 1300, ass: { niv: 'vila', pop: 0, estr: { cam: 99 } } }] };
  const m = N.normalizarMapa(base);
  // juntar ao recurso do mundo
  const r1 = JSON.parse(j(m)), res = R.juntarAoMundo(r1, 'fa', 'rc1', ''), j1 = N.normalizarMapa(r1), fa = j1.faccoes[0];
  eq(res, { nome: 'Lapros', de: 30, mais: 12, para: 42 }, 'juntar "LÁPROS" (12) ao estoque de Lapros (30): 42');
  ok(j(fa.rec.map(r => [r.id, r.n])) === j([['lapros', 42], ['rc2', 3]]) && fa.rec[0].ver === true, 'o número da facção sai da lista; o estoque fica com a soma (e "jogadores veem", se o outro tinha)');
  ok(fa.hist[0].mud[0][0] === 'r:lapros' && fa.hist[fa.hist.length - 1].mud.some(x => x[0] === 'r:lapros' && x[2] === 30 && x[3] === 42) && fa.hist[fa.hist.length - 1].mot === 'juntou LÁPROS',
    'o histórico do número vai junto (passa a ser o do recurso do mundo) e a junção entra no histórico');
  ok(R.juntarAoMundo(JSON.parse(j(m)), 'fa', 'rc2', '') === null && R.juntarAoMundo(JSON.parse(j(m)), 'fa', 'lapros', '') === null && R.juntarAoMundo(JSON.parse(j(m)), 'fa', 'xx', '') === null,
    'sem recurso do mundo com o mesmo nome (ou já sendo o do mundo, ou não existindo): nada');
  const r2 = JSON.parse(j(m)), res2 = R.juntarAoMundo(r2, 'fb', 'rc3', 'tributo'), fb = N.normalizarMapa(r2).faccoes[1];
  ok(res2.para === 7 && j(fb.rec.map(r => [r.id, r.n])) === j([['su', 7]]) && fb.hist.some(h => h.mot === 'tributo'), 'a facção sem o estoque do recurso: ele entra com o número dela (e o motivo escrito)');
  // a população da facção: a soma dos assentamentos dela
  eq([R.populacaoDaFaccao(m, 'fa'), R.populacaoDaFaccao(m, 'fb')], [65, 10], 'a população de cada facção: a soma das cidades das regiões dela (a de fora das regiões não conta)');
  const pj = N.projetar(m);
  eq([pj.faccoes[0].pop, pj.faccoes[1].pop], [65, null], 'na projeção, com a economia ligada: a soma (só para a facção que mostra a população); a outra continua sem número');
  const pjOff = N.projetar(N.normalizarMapa(Object.assign(JSON.parse(j(m)), { eco: Object.assign(JSON.parse(j(m.eco)), { on: false }) })));
  eq(pjOff.faccoes[0].pop, 999, 'com a economia desligada, vale o número escrito à mão');
}

/* ---- a bandeira própria da facção (sem clã) ---- */
{
  const BAND = { forma: 'estandarte', div: 'cortado', cores: ['#8a2a2a', '#d9a441'], simb: 'lua', img: null };
  const m = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, faccoes: [
    { id: 'fa', nome: 'Aldar', cor: '#3f7fbf', band: BAND }, { id: 'fb', nome: 'Culto', oculta: true, band: BAND },
    { id: 'fc', nome: 'Ermo', band: { forma: 'escudo', cores: ['#ffffff'] } }, { id: 'fd', nome: 'Ilhas', band: 'azul' },
    { id: 'fe', nome: 'Porto', band: { forma: 'Escudo Grande', div: 'x', cores: ['#123456', '#ABCDEF'], simb: '<b>', img: 'javascript:alert(1)' } },
    { id: 'ff', nome: 'Torre', band: { forma: 'redondo', div: 'liso', cores: ['#123456', '#abcdef'], simb: 'torre', img: 'https://exemplo.invalid/torre.png' } }] });
  const f = id => m.faccoes.find(x => x.id === id);
  eq(f('fa').band, BAND, 'a bandeira própria fica na facção');
  ok(!('band' in f('fc')) && !('band' in f('fd')), 'sem as duas cores (ou sem ser um objeto), a bandeira sai');
  eq(f('fe').band, { forma: 'escudo', div: 'partido', cores: ['#123456', '#abcdef'], simb: null, img: null }, 'o que não serve volta ao de começo (a forma, a divisão) ou sai (o símbolo, a imagem que não é https)');
  eq(f('ff').band.img, 'https://exemplo.invalid/torre.png', 'a imagem https fica');
  const comBr = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, faccoes: [{ id: 'fa', nome: 'Aldar', br: Object.assign({}, BAND, { simb: 'coroa' }), band: BAND }] }).faccoes[0];
  ok(comBr.br.simb === 'coroa' && comBr.band.simb === 'lua', 'a do clã (br) e a própria (band) ficam lado a lado: quem desenha escolhe a do clã');
  const p = N.projetar(m);
  eq(p.faccoes.find(x => x.id === 'fa').band, BAND, 'a projeção leva a bandeira própria (os jogadores veem)');
  ok(!p.faccoes.some(x => x.id === 'fb'), 'a facção escondida não vai (nem a bandeira dela)');
}

console.log(bad ? bad + ' falharam de ' + n : n + ' verificações passaram');
process.exit(bad ? 1 : 0);
