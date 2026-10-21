// Lote 12, as contas da campanha do Mapa-múndi (sem navegador):
//   · (parte 12a) as regras da campanha normalizadas (os números com os limites, os terrenos duros que existem, os meses
//     de inverno do calendário; sem elas, as de começo, com os meses de inverno pela estação do calendário), a forragem
//     guardada (por região e semana; as repetidas somam; só nas regiões que existem; o limite), onde cada exército está
//     (casa, aliada — pela relação e pelo tratado de aliança —, inimiga, neutra, sem dono, alheia), o terreno duro e o
//     inverno (o mês e a zona do Inverno rigoroso), o dia da campanha (reabastecer até o teto, do estoque, na ordem do
//     mapa; a forragem; comer; a fome e a moral; o desgaste — a fome em qualquer lugar, o terreno e o inverno só fora de
//     casa —; vários dias; as recusas), aplicar (os exércitos, a unidade que acaba, o estoque com o histórico, a forragem)
//     e a semana da economia (a produção de comida da região forrageada cai, até a dela; a forragem da semana sai ao
//     fechar); a projeção sem as regras e sem a forragem.
const N = require('../../mundo/nucleo.js');
const R = require('../../mundo/reino.js');
const C = require('../../mundo/campanha.js');
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FALHOU: ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' — esperado ' + JSON.stringify(b) + ', veio ' + JSON.stringify(a));
const j = JSON.stringify;
const quad = (x, y, w, hh) => [[x, y], [x + w, y], [x + w, y + hh], [x, y + hh]];

/* ---- (parte 12a) as regras e a forragem guardada ---- */
{
  const g = v => N.normalizarMapa({ nome: 'M', guerra: { regras: v } }).guerra;
  eq(N.CAMPANHA_PADRAO, { teto: 10, custo: 1, forr: 50, fome: 2, terreno: 1, inverno: 1, cerco: 1, duros: ['mo', 'pa', 'de', 'ne', 'se', 'lv', 'tu', 'tc'], meses: null, ocupar: 3 }, 'as regras de começo');
  eq(g({}).regras, N.CAMPANHA_PADRAO, 'as regras vazias viram as de começo');
  eq(g({ teto: 0, custo: -2, forr: 150, fome: 'x', inverno: 0.25, cerco: 3, duros: ['mo', 'zz', 'pa', 'mo'], meses: [11, 11, 3, '2', 12, -1], ocupar: 999 }).regras,
    { teto: 1, custo: 0, forr: 100, fome: 2, terreno: 1, inverno: 0.3, cerco: 3, duros: ['mo', 'pa'], meses: [2, 3, 11], ocupar: 365 },
    'os números com os limites (a % com uma casa); os terrenos duros que existem, sem repetir; os meses do calendário, sem repetir, em ordem');
  eq(g({ custo: 0.333 }).regras.custo, 0.33, 'o custo com duas casas');
  ok(!('guerra' in N.normalizarMapa({ nome: 'M' })) && !('guerra' in N.normalizarMapa({ nome: 'M', guerra: { tipos: [] } })), 'sem regras nem nada, a guerra nem fica (o mapa de antes fica igual)');
  const m4 = N.normalizarMapa({ nome: 'M', cal: { meses: [{ nome: 'A', dias: 10 }, { nome: 'B', dias: 10 }, { nome: 'C', dias: 10 }, { nome: 'D', dias: 10 }] }, guerra: { regras: { meses: [0, 3, 5] } } });
  eq([m4.guerra.regras.meses, C.mesesDeInverno(m4), C.mesesDeInverno(N.normalizarMapa({ nome: 'M' }))], [[0, 3], [0], [0, 1, 11]], 'os meses de inverno: só os do calendário; sem os do mestre, pela estação (num ano de 4 meses, o primeiro; num de 12, os dois primeiros e o último)');
  eq([C.regrasDe(N.normalizarMapa({ nome: 'M' })).meses, C.regrasDe(m4).meses], [[0, 1, 11], [0, 3]], 'as regras que valem: os meses do mestre ou os da estação');
  // a forragem guardada
  const fm = N.normalizarMapa({ nome: 'M', objs: [{ id: 'r1', k: 'r', pts: quad(0, 0, 10, 10) }],
    guerra: { forr: [{ r: 'r1', s: 3, n: 2 }, { r: 'r1', s: 3, n: 1.5 }, { r: 'r1', s: 4, n: 0 }, { r: 'zz', s: 3, n: 1 }, { r: 'r1', s: 'x', n: 1 }, { s: 3, n: 1 }, 'lixo', { r: 'r1', s: 5, n: 1.234 }] } }).guerra;
  eq(fm.forr, [{ r: 'r1', s: 3, n: 3.5 }, { r: 'r1', s: 5, n: 1.23 }], 'a forragem: por região e semana (as repetidas somam); sem a região que não existe, sem quantidade, sem semana ou sem região');
  ok(!('guerra' in N.normalizarMapa({ nome: 'M', guerra: { forr: [{ r: 'zz', s: 3, n: 1 }] } })), 'só com a forragem de uma região que não existe, a guerra nem fica');
  const lim = N.normalizarMapa({ nome: 'M', objs: [{ id: 'r1', k: 'r', pts: quad(0, 0, 10, 10) }], guerra: { forr: Array.from({ length: 600 }, (_, i) => ({ r: 'r1', s: i, n: 1 })) } }).guerra.forr;
  ok(lim.length === N.LIMITES.forragem && N.LIMITES.forragem === 500, 'o limite da forragem guardada: ' + N.LIMITES.forragem);
  eq(C.forragemDaSemana({ guerra: { forr: [{ r: 'r1', s: 3, n: 2 }, { r: 'r2', s: 3, n: 1 }, { r: 'r1', s: 4, n: 5 }] } }, 3), { r1: 2, r2: 1 }, 'a forragem de uma semana, por região');
  ok(!N.projetar(N.normalizarMapa({ nome: 'M', objs: [{ id: 'r1', k: 'r', pts: quad(0, 0, 10, 10) }], guerra: { regras: { teto: 5 }, forr: [{ r: 'r1', s: 1, n: 1 }] } })).guerra, 'a projeção não leva as regras nem a forragem');
}

/* ---- (parte 12a) o mundo da campanha ---- */
const ex = (id, x, y, fac, mant, tropas, nome) => ({ id, k: 'g', tipo: 'exercito', x, y, fac, nome, exe: { moral: 6, mant, unid: [{ id: id + 'u', nome: 'Unidade de ' + nome, tropas }] } });
function mundo() {
  let m = N.normalizarMapa({ id: 'x', nome: 'M', larg: 4000, alt: 1000, grade: { tam: 40, x: 0, y: 0 },
    faccoes: [{ id: 'fa', nome: 'Aldar', rel: { fb: 'guerra', fc: 'alianca' } }, { id: 'fb', nome: 'Vale', rel: { fa: 'guerra' } }, { id: 'fc', nome: 'Ilhas', rel: { fa: 'alianca' } }, { id: 'fd', nome: 'Culto' }, { id: 'fe', nome: 'Porto' }],
    objs: [{ id: 'r1', k: 'r', nome: 'Terra Alta', fac: 'fa', pts: quad(0, 0, 400, 400) }, { id: 'r2', k: 'r', nome: 'Vale Fundo', fac: 'fb', pts: quad(500, 0, 400, 400) },
      { id: 'r3', k: 'r', nome: 'Ilha Grande', fac: 'fc', pts: quad(1000, 0, 400, 400) }, { id: 'r4', k: 'r', nome: 'Templo', fac: 'fd', pts: quad(1500, 0, 400, 400) },
      { id: 'r5', k: 'r', nome: 'Cais', fac: 'fe', pts: quad(2000, 0, 400, 400) }, { id: 'r6', k: 'r', nome: 'Ermo', pts: quad(2500, 0, 400, 400) },
      ex('g1', 100, 100, 'fa', 5, 300, 'Hoste'), ex('g2', 600, 100, 'fa', 2, 155, 'Vanguarda'), ex('g3', 1100, 100, 'fa', 0, 100, 'Frota'), ex('g4', 1600, 100, 'fa', 0, 200, 'Peregrinos'),
      ex('g5', 2100, 100, 'fa', 1, 100, 'Guarda do Cais'), ex('g6', 2600, 100, 'fa', 4, 100, 'Batedores'), ex('g7', 150, 150, null, 2, 100, 'Bandoleiros'), ex('g8', 3500, 100, 'fa', 3, 100, 'Perdidos')],
    dipl: { tratados: [{ id: 'ta', tipo: 'alianca', partes: ['fa', 'fe'], pub: true }, { id: 'tc', tipo: 'comercio', partes: ['fa', 'fd'], pub: true }] } });
  m = JSON.parse(j(m));
  m.objs.find(o => o.id === 'g6').exe.fome = 3;                   // (os Batedores vinham sem comida há 3 dias)
  m.cal.dia = 3;
  R.ligarEconomia(m);
  m = JSON.parse(j(N.normalizarMapa(m)));
  // a montanha debaixo da Hoste (em casa) e da Vanguarda (na terra inimiga); 20 de Suprimentos no estoque de Aldar
  for (const [x, y] of [[100, 100], [600, 100]]) { const h = N.hexDe(m, x, y); m.hexes[h.q + ',' + h.r] = 'mo'; }
  m.faccoes.find(f => f.id === 'fa').rec.find(r => r.id === 'suprimentos').n = 20;
  m.cal.dia = 4;                                                  // (o dia que passou, 3 — 4 de Alvorada —, é de inverno)
  return N.normalizarMapa(m);
}

/* ---- (parte 12a) onde, o terreno e o inverno ---- */
{
  const m = mundo(), G = id => m.objs.find(o => o.id === id);
  eq(['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'].map(id => C.ondeEsta(m, G(id))),
    [{ r: 'r1', dono: 'fa', tipo: 'casa' }, { r: 'r2', dono: 'fb', tipo: 'inimiga' }, { r: 'r3', dono: 'fc', tipo: 'aliada' }, { r: 'r4', dono: 'fd', tipo: 'neutra' },
      { r: 'r5', dono: 'fe', tipo: 'aliada' }, { r: 'r6', dono: null, tipo: 'semdono' }, { r: 'r1', dono: 'fa', tipo: 'alheia' }, { r: null, dono: null, tipo: 'semdono' }],
    'onde: em casa; na terra inimiga (em guerra); aliada pela relação e pelo tratado de aliança; neutra; sem dono; o exército sem facção, na terra alheia; fora das regiões, sem dono');
  eq([C.aliadas(m, 'fa', 'fc'), C.aliadas(m, 'fa', 'fe'), C.aliadas(m, 'fa', 'fd'), C.aliadas(m, 'fa', 'fa'), C.emGuerra(m, 'fa', 'fb'), C.emGuerra(m, 'fa', 'fd')], [true, true, false, false, true, false],
    'aliadas (o tratado de comércio com o Culto não é aliança) e em guerra');
  const mt = JSON.parse(j(m));
  mt.dipl.tratados[0].enc = { a: 1, m: 0, d: 1 };
  ok(!C.aliadas(N.normalizarMapa(mt), 'fa', 'fe'), 'o tratado de aliança encerrado não vale');
  eq([(C.terrenoDuro(m, G('g2')) || {}).nome, C.terrenoDuro(m, G('g3')), C.terrenoDuro(N.normalizarMapa(Object.assign(JSON.parse(j(m)), { guerra: { regras: { duros: ['pa'] } } })), G('g2'))],
    ['Montanha', null, null], 'o terreno duro: o do hexágono, se está nas regras');
  ok(!C.terrenoDuro(N.normalizarMapa(Object.assign(JSON.parse(j(m)), { grade: null })), G('g2')), 'sem a grade, nenhum terreno');
  eq([C.invernoEm(m, 600, 100, 4), C.invernoEm(m, 600, 100, 100), C.invernoEm(m, 600, 100, 340)], [true, false, true], 'o inverno pelo mês (Alvorada e Noite Longa, não Florada)');
  const mi = N.normalizarMapa(Object.assign(JSON.parse(j(m)), { objs: m.objs.concat([{ id: 'ev', k: 'e', tipo: 'inverno', x: 600, y: 100, r: 50, ini: 90 }, { id: 'ev2', k: 'e', tipo: 'praga', x: 700, y: 100, r: 50, ini: 90 }]) }));
  eq([C.invernoEm(mi, 600, 100, 100), C.invernoEm(mi, 700, 100, 100), C.invernoEm(mi, 600, 100, 80)], [true, false, false], 'e a zona do evento Inverno rigoroso (só dentro dela, depois de começar; a praga não é inverno)');
}

/* ---- (parte 12a) o dia da campanha ---- */
{
  const m = mundo(), r = C.diaDaCampanha(m, 1, []), L = id => r.linhas.find(x => x.g === id);
  eq([r.dias, r.rec, r.linhas.map(x => x.g)], [1, 'suprimentos', ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8']], 'um dia; a comida é Suprimentos; todos os exércitos com tropas');
  eq([L('g1').cons, L('g1').mant1, L('g1').reab, L('g1').forr, L('g1').desg, r.estoque.fa], [3, 22, { n: 20, gasto: 20 }, null, null, { de: 20, para: 0 }],
    'em casa: reabastece o que falta para a refeição e para o teto (3 + 30 − 5 = 28), até o estoque (20); come 3; na montanha e no inverno, mas em casa: sem desgaste');
  eq([L('g2').mant1, L('g2').forr, L('g2').desg && [L('g2').desg.tropas0, L('g2').desg.tropas1, L('g2').desg.dias, L('g2').desg.ter], L('g2').fome1, L('g2').moral1],
    [1, { n: 1, r: 'r2' }, [155, 152, { fome: 0, terreno: 1, inverno: 1 }, 'Montanha'], 0, 6], 'na terra inimiga: a forragem (metade do que come: 1); come; o desgaste da montanha e do inverno (2%: 155 → 151,9, arredondado: 152)');
  eq([L('g3').reab, L('g3').mant1, L('g3').fomeDias, L('g3').fome1, L('g3').moral1, L('g3').desg && [L('g3').desg.tropas1, L('g3').desg.dias]], [null, 0, 1, 1, 5, [98, { fome: 1, terreno: 0, inverno: 0 }]],
    'na terra aliada: o estoque já foi para quem vem antes; sem comida: a moral cai 1 e o desgaste da fome (2%), sem o do inverno (abrigado)');
  eq([L('g4').desg && [L('g4').desg.tropas1, L('g4').desg.dias], L('g4').moral1], [[194, { fome: 1, terreno: 0, inverno: 1 }], 5], 'na terra neutra: vive do que leva (nada); a fome e o inverno (3%: 200 → 194)');
  eq([L('g5').mant1, L('g5').desg, L('g6').forr, L('g6').mant1, L('g6').fome1, L('g7').forr, L('g8').forr], [0, null, { n: 1, r: 'r6' }, 4, 0, { n: 1, r: 'r1' }, { n: 1, r: null }],
    'aliada pelo tratado: come o que tem, sem desgaste; sem dono, alheia e fora das regiões: a forragem (os Batedores comeram: a fome zera)');
  eq(r.forr, [{ r: 'r2', s: R.semanaN(m, 3), n: 1 }, { r: 'r1', s: R.semanaN(m, 3), n: 1 }], 'a forragem guardada: só nas regiões com dona (o Vale, e a terra de Aldar pelos bandoleiros), na semana do dia que passou (o de ontem)');
  // vários dias
  const r7 = C.diaDaCampanha(m, 7, []), L7 = id => r7.linhas.find(x => x.g === id);
  eq([L7('g2').mant1, L7('g2').forr.n, L7('g2').fomeDias, L7('g2').fome1, L7('g2').moral1, L7('g2').desg.dias, L7('g2').desg.tropas1],
    [0, 7, 5, 5, 1, { fome: 5, terreno: 7, inverno: 7 }, Math.round(155 * 0.98 ** 2 * 0.96 ** 5)],
    'em 7 dias: a forragem de cada dia; a comida acaba no terceiro, e os 5 dias de fome tiram a moral e somam o desgaste da fome (dia a dia)');
  eq([L7('g1').reab, L7('g1').mant1, r7.estoque.fa.para], [{ n: 20, gasto: 20 }, 4, 0], 'em casa, em 7 dias: o estoque acaba no primeiro, e ele vive do que levou');
  const porSem = new Map();
  for (let d = -3; d <= 3; d++) porSem.set(R.semanaN(m, d), (porSem.get(R.semanaN(m, d)) || 0) + 1);
  eq(r7.forr.filter(x => x.r === 'r2').map(x => [x.s, x.n]), [...porSem], 'a forragem de vários dias (os 7 antes de hoje), cada dia na semana dele');
  // as recusas
  const rr = C.diaDaCampanha(m, 1, ['reab:g1', 'g:g2', 'forr:g6', 'desg:g4']), LR = id => rr.linhas.find(x => x.g === id);
  eq([LR('g1').reab, LR('g1').mant1, LR('g1').fome1, LR('g3').reab, LR('g3').mant1, LR('g5').reab, rr.estoque.fa], [null, 2, 0, { n: 11, gasto: 11 }, 10, { n: 9, gasto: 9 }, { de: 20, para: 0 }],
    'sem o reabastecimento da Hoste: ela come o que leva, e o estoque vai para a Frota (na aliada: 1 + 10 − 0 = 11) e o resto para a Guarda do Cais (9 dos 10)');
  eq([LR('g2').fora, LR('g2').mant1, LR('g2').forr, LR('g2').desg, rr.forr.map(x => x.r)], [true, 2, null, null, ['r1']], 'o exército desmarcado fica como está (sem forragem, sem desgaste)');
  eq([LR('g6').forr, LR('g6').mant1, LR('g4').desg, LR('g4').moral1], [null, 3, null, 5], 'sem a forragem, come o que leva; sem o desgaste, só a moral cai');
  // sem a economia ligada: ninguém reabastece; a forragem não fica guardada
  const me = N.normalizarMapa(Object.assign(JSON.parse(j(m)), { eco: Object.assign(JSON.parse(j(m.eco)), { on: false }) })), re = C.diaDaCampanha(me, 1, []);
  eq([re.rec, re.linhas[0].reab, re.linhas[0].mant1, re.linhas[1].forr, re.forr], [null, null, 2, { n: 1, r: 'r2' }, []], 'sem a economia: ninguém reabastece; a forragem vale, mas não fica guardada (não há semana)');
  // sem forragem e sem desgaste nas regras
  const mz = N.normalizarMapa(Object.assign(JSON.parse(j(m)), { guerra: { regras: { forr: 0, fome: 0, terreno: 0, inverno: 0, teto: 2, custo: 2 } } })), rz = C.diaDaCampanha(mz, 1, []);
  eq([rz.linhas[0].reab, rz.linhas[0].mant1, rz.linhas[1].forr, rz.linhas.some(x => x.desg), rz.linhas[3].moral1], [{ n: 4, gasto: 8 }, 6, null, false, 5],
    'com as regras do mestre: o teto de 2 dias e o custo 2 (3 + 6 − 5 = 4 mantimentos, 8 do estoque); sem forragem e sem desgaste (a moral ainda cai na fome)');
  const mc = N.normalizarMapa(Object.assign(JSON.parse(j(m)), { guerra: { regras: { custo: 2, forr: 30 } } })), rc = C.diaDaCampanha(mc, 1, []);
  eq([rc.linhas[0].reab, rc.linhas[0].mant1, rc.estoque.fa.para, rc.linhas[5].forr, rc.forr.find(x => x.r === 'r2').n], [{ n: 10, gasto: 20 }, 12, 0, { n: 1, r: 'r6' }, 2],
    'o custo 2: com 20 no estoque, só 10 mantimentos; a forragem de 30% de 1 é pelo menos 1, e a guardada vale 2 (no recurso de comida)');
  ok(!C.diaDaCampanha(N.normalizarMapa({ nome: 'M', objs: [{ id: 'g', k: 'g', tipo: 'exercito', x: 0, y: 0, exe: { unid: [{ id: 'u', tropas: 0 }] } }, { id: 'h', k: 'g', x: 0, y: 0 }] }), 1, []).linhas.length,
    'sem tropas (ou sem ser exército), fora da conta');
}

/* ---- (parte 12a) aplicar e a semana da economia ---- */
{
  const m = mundo(), d = JSON.parse(j(m)), r = C.diaDaCampanha(m, 7, ['g:g3']);
  eq(C.aplicarDia(d, r), 7, 'aplicar: os 7 exércitos marcados');
  const ma = N.normalizarMapa(d), G = id => ma.objs.find(o => o.id === id), fa = ma.faccoes.find(f => f.id === 'fa');
  eq([G('g1').exe.mant, G('g2').exe.mant, G('g2').exe.fome, G('g2').exe.moral, G('g2').exe.unid[0].tropas, G('g3').exe.mant, G('g3').exe.unid[0].tropas],
    [4, 0, 5, 1, r.linhas[1].desg.tropas1, 0, 100], 'os mantimentos, a fome, a moral e as tropas; o desmarcado, como estava');
  eq([fa.rec.find(x => x.id === 'suprimentos').n, (fa.hist || []).slice(-1)[0].mot], [0, 'reabastecimento dos exércitos'], 'o estoque de Aldar, com o motivo no histórico');
  eq(ma.guerra.forr.reduce((s, x) => s + x.n, 0), 7 + 7, 'a forragem guardada (a Vanguarda no Vale, os bandoleiros em Aldar: 1 por dia cada; o Ermo, sem dono, não)');
  // a unidade que fica sem ninguém sai
  const m2 = JSON.parse(j(m));
  m2.objs.find(o => o.id === 'g4').exe.unid.push({ id: 'g4v', nome: 'Viúvas', tropas: 1 });
  const mm2 = N.normalizarMapa(m2), r2 = C.diaDaCampanha(mm2, 30, []), L4 = r2.linhas.find(x => x.g === 'g4'), d2 = JSON.parse(j(mm2));
  C.aplicarDia(d2, r2);
  eq([L4.desg.unid.map(u => [u.id, u.acaba]), N.normalizarMapa(d2).objs.find(o => o.id === 'g4').exe.unid.map(u => u.id), L4.moral1], [[['g4u', false], ['g4v', true]], ['g4u'], 0],
    'a unidade que fica sem ninguém (1 tropa, no desgaste) sai do exército; a moral não passa de zero');
  // a semana: a produção de comida da região forrageada cai, até a dela, na conta da dona
  const mw = JSON.parse(j(ma));
  mw.objs.find(o => o.id === 'r2').prod = { suprimentos: 4 };
  mw.hexes = {};                                                  // (sem as montanhas: o Vale só produz os 4 de Suprimentos)
  mw.objs.find(o => o.id === 'r1').prod = { suprimentos: 30 };
  mw.cal.dia = 10;
  const ws = N.normalizarMapa(mw), sem = ws.eco.sem;
  const comForr = N.normalizarMapa(Object.assign(JSON.parse(j(ws)), { guerra: Object.assign(JSON.parse(j(ws.guerra)), { forr: [{ r: 'r2', s: sem, n: 6 }, { r: 'r1', s: sem, n: 2 }, { r: 'r1', s: sem + 1, n: 9 }, { r: 'r6', s: sem, n: 3 }] }) }));
  const p = R.semanaPrevia(comForr), P = id => p.fac.find(x => x.id === id);
  eq([p.forr, !!P('fb'), (P('fb') || { prod: {} }).prod.suprimentos || 0, P('fa').prod.suprimentos], [[{ r: 'r2', fac: 'fb', rec: 'suprimentos', n: 4 }, { r: 'r1', fac: 'fa', rec: 'suprimentos', n: 2 }], true, 0, 28],
    'na prévia da semana: a produção de comida do Vale cai até a dele (4 de 6: fica sem nada, mas aparece), a de Aldar cai 2; a da semana seguinte, não; a região sem dono, nada');
  const dw = JSON.parse(j(comForr));
  R.aplicarSemana(dw, null, [], 'Semana');
  eq(N.normalizarMapa(dw).guerra.forr, [{ r: 'r1', s: sem + 1, n: 9 }], 'fechar a semana: a forragem dela sai (a da semana seguinte fica)');
}

console.log(bad ? bad + ' falharam de ' + n : n + ' verificações passaram');
process.exit(bad ? 1 : 0);
