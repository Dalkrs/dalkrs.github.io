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
//   · (parte 12b) a ocupação: normalizada (de uma facção que existe e não é a dona; na região e no marcador; a contagem
//     dos dias), quem controla, onde o exército está na ocupada, a projeção (de uma facção escondida, sem a facção), a
//     contagem do dia (sem defensor — a dona ou uma aliada —, sem fortificação de pé — também a das construções —, a
//     região de dentro à parte, os dias de antes, a recusa, libertar), aplicar, a produção para quem ocupa (o Livro e a
//     população, da dona), a forragem na ocupada, anexar, devolver, ocupar à mão, as terras na paz e as notícias.
//   · (parte 12c) a vida das tropas e a cura: a Enfermaria no catálogo (a cura de cada nível; as que faltam nos mapas de
//     antes; a cura da cidade, até 100%), a Enfermaria perto (a cidade de casa ou da aliada, no hexágono ou colado; sem
//     a grade, perto), a cura no dia (os médicos e a Enfermaria; vários dias; desmarcada; os médicos que acabam; a ferida
//     do desgaste), o desgaste no HP das unidades e aplicar.
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
  const m = mundo(), d = JSON.parse(j(m)), r = C.diaDaCampanha(m, 7, ['g:g3', 'ocup:r2']);    // (sem ocupar o Vale: a parte 12b)
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

/* ---- (parte 12b) a ocupação ---- */
// Aldar (fa) em guerra com o Vale (fb); as Ilhas (fc), aliadas do Vale; o Culto (fd), aliado de Aldar; o Porto (fe), de ninguém
function mundoOc(extra) {
  let m = N.normalizarMapa({ id: 'y', nome: 'M', larg: 4000, alt: 1000,
    faccoes: [{ id: 'fa', nome: 'Aldar', rel: { fb: 'guerra', fd: 'alianca' } }, { id: 'fb', nome: 'Vale', rel: { fa: 'guerra', fc: 'alianca' } }, { id: 'fc', nome: 'Ilhas', rel: { fb: 'alianca' } },
      { id: 'fd', nome: 'Culto', rel: { fa: 'alianca' } }, { id: 'fe', nome: 'Porto' }],
    objs: [{ id: 'r1', k: 'r', nome: 'Terra Alta', fac: 'fa', pts: quad(0, 0, 400, 400) }, { id: 'r2', k: 'r', nome: 'Vale Fundo', fac: 'fb', pts: quad(500, 0, 400, 400) },
      { id: 'r2s', k: 'r', nome: 'Vau', pai: 'r2', pts: quad(800, 300, 90, 90) }, { id: 'r3', k: 'r', nome: 'Ilha', fac: 'fc', pts: quad(1000, 0, 400, 400) },
      { id: 'r4', k: 'r', nome: 'Ermo', pts: quad(1500, 0, 400, 400) }, { id: 'r5', k: 'r', nome: 'Forte', fac: 'fb', pts: quad(2000, 0, 400, 400) },
      { id: 'r6', k: 'r', nome: 'Ruína', fac: 'fb', pts: quad(2500, 0, 400, 400) }, { id: 'r7', k: 'r', nome: 'Paliçada', fac: 'fb', pts: quad(3000, 0, 400, 400) },
      { id: 'k5', k: 'm', nome: 'Castelo', x: 2100, y: 100, estr: { nome: 'Muralhas', def: 3, hp: 50, hpMax: 100 } },
      { id: 'k6', k: 'm', nome: 'Torre Velha', x: 2600, y: 100, estr: { nome: '', def: 3, hp: 0, hpMax: 100 } },
      { id: 'k7', k: 'm', nome: 'Aldeia', x: 3100, y: 100 },
      ex('a1', 600, 100, 'fa', 5, 100, 'Primeira'), ex('a2', 850, 350, 'fa', 5, 100, 'Segunda'), ex('a3', 1600, 100, 'fa', 5, 100, 'Terceira'),
      ex('a4', 2150, 150, 'fa', 5, 100, 'Quarta'), ex('a5', 2650, 150, 'fa', 5, 100, 'Quinta'), ex('a6', 3150, 150, 'fa', 5, 100, 'Sexta'), ex('a7', 1100, 100, 'fe', 5, 100, 'Sétima')].concat(extra || []) });
  m = JSON.parse(j(m));
  m.cal.dia = 3;
  R.ligarEconomia(m);
  m.objs.find(o => o.id === 'k7').ass = { niv: 'aldeia', pop: 100, cons: [{ id: 'c1', t: 'palicada', n: 1 }] };   // (a Paliçada: DEF 1)
  return N.normalizarMapa(m);
}
const arr = v => Math.round((Number(v) || 0) * 100) / 100;
{
  // normalizar: a ocupação de uma facção que existe e não é a dona; a contagem dos dias
  const mn = N.normalizarMapa(Object.assign(JSON.parse(j(mundoOc())), {}));
  const D = JSON.parse(j(mn)), O = id => D.objs.find(o => o.id === id);
  O('r1').ocup = { fac: 'fb', d: 2.6 }; O('r2').ocup = { fac: 'fb', d: 1 }; O('r3').ocup = { fac: 'zz', d: 1 }; O('r4').ocup = 'lixo'; O('r6').ocup = { fac: 'fa' };
  O('k5').ocup = { fac: 'fa', d: 4 }; O('k6').ocup = { fac: 'fb', d: 4 };
  D.guerra = { pres: { r2: { fac: 'fa', n: 2 }, r6: { fac: 'fa', n: 1, lib: 1 }, zz: { fac: 'fa', n: 1 }, r4: { fac: 'zz', n: 1 }, r5: { fac: 'fa', n: 0 }, r7: 'lixo', 'x y': { fac: 'fa', n: 1 } } };
  const nn = N.normalizarMapa(D), P = id => nn.objs.find(o => o.id === id);
  eq([P('r1').ocup, P('r2').ocup, P('r3').ocup, P('r4').ocup, P('r6').ocup, P('k5').ocup, P('k6').ocup], [{ fac: 'fb', d: 3 }, undefined, undefined, undefined, { fac: 'fa', d: 0 }, { fac: 'fa', d: 4 }, undefined],
    'a ocupação: de uma facção que existe e que não é a dona (na região e no marcador, cuja dona é a da região dele); o dia, inteiro');
  eq(nn.guerra.pres, { r2: { fac: 'fa', n: 2 }, r6: { fac: 'fa', n: 1, lib: true } }, 'a contagem dos dias: só nas regiões e com as facções que existem, com dias');
  ok(N.LIMITES.contagens === 2000, 'o limite das contagens: ' + N.LIMITES.contagens);
  const sp = JSON.parse(j(mn)); sp.guerra = { pres: { zz: { fac: 'fa', n: 1 } } };
  ok(!('guerra' in N.normalizarMapa(sp)), 'só com a contagem de uma região que não existe, a guerra nem fica');
  const so = JSON.parse(j(mn)); so.guerra = { pres: { r2: { fac: 'fa', n: 1 } } };
  eq(N.normalizarMapa(so).guerra.pres, { r2: { fac: 'fa', n: 1 } }, 'só com a contagem, a guerra fica');
  // quem controla; onde o exército está
  eq([N.controleDaRegiao(nn, P('r1')), N.controleDaRegiao(nn, P('r2')), N.controleDaRegiao(nn, P('r2s')), N.facDaRegiao(nn, P('r1'))], ['fb', 'fb', 'fb', 'fa'],
    'quem controla: quem ocupa, senão a dona (a de dentro herda a dona, não a ocupação); a dona continua a mesma');
  const no2 = JSON.parse(j(mn)); no2.objs.find(o => o.id === 'r2').ocup = { fac: 'fa', d: 3 }; no2.objs.push(ex('b1', 650, 150, 'fb', 5, 100, 'Do Vale'));
  const m2 = N.normalizarMapa(no2), G2 = id => m2.objs.find(o => o.id === id);
  eq([C.ondeEsta(m2, G2('a1')), C.ondeEsta(m2, G2('b1')), C.ondeEsta(m2, G2('a2'))], [{ r: 'r2', dono: 'fa', tipo: 'casa', ocup: true }, { r: 'r2', dono: 'fa', tipo: 'inimiga', ocup: true }, { r: 'r2s', dono: 'fb', tipo: 'inimiga' }],
    'onde: a ocupada é de quem ocupa (o exército de Aldar em casa; o do Vale, na terra inimiga); a de dentro, não');
  // a projeção
  const pj = N.projetar(nn), PJ = id => pj.objs.find(o => o.id === id);
  eq([PJ('r1').ocup, PJ('k5').ocup, 'guerra' in pj], [{ fac: 'fb', d: 3 }, { fac: 'fa', d: 4 }, false], 'a projeção: a ocupação vai (a contagem, não)');
  const ct = JSON.parse(j(nn)); ct.guerra.tipos = [{ id: 'tp1', nome: 'Lanceiros' }];
  eq((g => [g.tipos.map(t => t.nome), 'pres' in g])(N.projetar(N.normalizarMapa(ct)).guerra), [['Lanceiros'], false], 'com a guerra que vai (os tipos), a contagem fica');
  const esc = JSON.parse(j(nn)); esc.faccoes.find(f => f.id === 'fb').oculta = true; esc.faccoes.find(f => f.id === 'fa').oculta = true;
  const pe = N.projetar(N.normalizarMapa(esc)), PE = id => pe.objs.find(o => o.id === id);
  eq([PE('r1').ocup, PE('k5').ocup, PE('r1').fac], [{ fac: null, d: 3 }, { fac: null, d: 4 }, null], 'de uma facção escondida, a ocupação vai sem a facção');
  eq((P => [P.ocup, N.controleDaRegiao(pe, P)])(N.normalizarMapa(pe).objs.find(o => o.id === 'r1')), [{ fac: null, d: 3 }, null], 'e fica assim normalizada (quem controla: a dona, que eles não veem)');
}
{
  // a contagem no dia
  const m = mundoOc(), r = C.ocupacaoNoDia(m, 1, new Set()), E = id => r.regioes.find(x => x.r === id);
  eq(r.regioes.map(x => [x.r, x.tipo]), [['r2', 'conta'], ['r2s', 'conta'], ['r5', 'forte'], ['r6', 'conta'], ['r7', 'forte']],
    'quem conta: na terra da inimiga, sem defensor (a região de dentro conta à parte); a fortificação de pé (e a Paliçada das construções) impede; a em ruínas, não; sem dona e sem guerra, nada');
  eq([E('r2'), E('r5').forte, E('r7').forte, r.pres], [{ r: 'r2', tipo: 'conta', lib: false, fac: 'fa', dono: 'fb', n: 1, de: 3, recusado: false }, 'k5', 'k7', { r2: { fac: 'fa', n: 1 }, r2s: { fac: 'fa', n: 1 }, r6: { fac: 'fa', n: 1 } }],
    'a contagem: 1 de 3 dias; a nova, só onde ela continua');
  const c3 = C.ocupacaoNoDia(N.normalizarMapa(Object.assign(JSON.parse(j(m)), { guerra: { pres: { r2: { fac: 'fa', n: 2 }, r6: { fac: 'fd', n: 2 }, r2s: { fac: 'fa', n: 2, lib: true } } } })), 1, new Set(['ocup:r6']));
  eq(c3.regioes.filter(x => ['r2', 'r6', 'r2s'].includes(x.r)).map(x => [x.r, x.tipo, x.n, x.recusado]), [['r2', 'ocupar', 3, false], ['r2s', 'conta', 1, false], ['r6', 'conta', 1, false]],
    'com os dias de antes: no terceiro, a proposta; a contagem de outra facção (ou a de libertar) recomeça; a recusa só vale na proposta');
  eq(C.ocupacaoNoDia(m, 7, new Set(['ocup:r2'])).regioes.filter(x => x.tipo === 'ocupar').map(x => [x.r, x.n, x.recusado]), [['r2', 3, true], ['r2s', 3, false], ['r6', 3, false]], 'vários dias de uma vez; a recusa');
  ok(!C.ocupacaoNoDia(m, 7).regioes.some(x => x.recusado), 'sem as recusas, nenhuma');
  // quem defende: a dona ou uma aliada dela; o sem tropas e o sem facção não contam
  const def = o => C.ocupacaoNoDia(mundoOc([o]), 1, new Set()).regioes.filter(x => x.r === 'r2').map(x => x.tipo);
  eq([def(ex('b1', 700, 100, 'fb', 5, 100, 'Do Vale')), def(ex('c1', 700, 100, 'fc', 5, 100, 'Das Ilhas')), def(ex('e1', 700, 100, 'fe', 5, 100, 'Do Porto')),
    def(ex('b1', 700, 100, 'fb', 5, 0, 'Vazio')), def(ex('n1', 700, 100, null, 5, 100, 'Bandoleiros'))], [[], [], ['conta'], ['conta'], ['conta']],
    'o exército da dona ou de uma aliada dela defende; o de outra, não; o sem tropas e o sem facção não contam');
  // no dia da campanha, o exército desmarcado (fica como está) continua lá: conta (e quem defende, defende)
  const dd = C.diaDaCampanha(mundoOc([ex('b1', 700, 100, 'fb', 5, 100, 'Do Vale')]), 1, ['g:b1', 'g:a1']);
  eq([C.diaDaCampanha(mundoOc(), 1, ['g:a1']).regioes.find(x => x.r === 'r2').tipo, dd.regioes.some(x => x.r === 'r2')], ['conta', false], 'o exército desmarcado no dia ainda conta para a ocupação');
  // a fortificação: a ocupada por outra facção não defende; a de dentro de uma região de dentro é dela
  const mf = JSON.parse(j(m)); mf.objs.find(o => o.id === 'k5').ocup = { fac: 'fa', d: 1 };
  const mt = JSON.parse(j(m)); mt.objs.push({ id: 'r5s', k: 'r', nome: 'Torreão', pai: 'r5', pts: quad(2060, 60, 80, 80) });
  const nt = N.normalizarMapa(mt), tipoR5 = mm => C.ocupacaoNoDia(mm, 1, new Set()).regioes.find(x => x.r === 'r5').tipo;
  eq([tipoR5(N.normalizarMapa(mf)), tipoR5(nt), C.fortesDePe(nt, nt.objs.find(o => o.id === 'r5s')).map(o => o.id)], ['conta', 'conta', ['k5']],
    'a fortificação ocupada por outra facção não defende; a de dentro de uma região de dentro é dela (o Forte conta)');
  const sem = JSON.parse(j(m)); sem.eco.on = false;
  eq(C.fortesDePe(N.normalizarMapa(sem), m.objs.find(o => o.id === 'r7')).length, 0, 'sem a economia, as construções não fazem a fortificação');
  // libertar
  const lib = (extra, pres) => { const d = JSON.parse(j(mundoOc(extra))); d.objs.find(o => o.id === 'r1').ocup = { fac: 'fb', d: 0 }; if (pres) d.guerra = { pres }; return N.normalizarMapa(d); };
  const O1 = C.ocupacaoNoDia(lib([ex('g1', 100, 100, 'fa', 5, 100, 'Hoste')]), 1, new Set(['lib:r1'])), L1 = O1.regioes.find(x => x.r === 'r1');
  eq([L1, O1.pres.r1], [{ r: 'r1', tipo: 'conta', lib: true, fac: 'fa', dono: 'fa', quem: 'fb', n: 1, de: 3, recusado: false }, { fac: 'fa', n: 1, lib: true }],
    'a ocupada, com o exército da dona e sem o de quem ocupa: conta para libertar (a recusa só vale na proposta)');
  ok(!C.ocupacaoNoDia(lib([ex('e1', 100, 100, 'fe', 5, 100, 'Do Porto')]), 1).regioes.some(x => x.r === 'r1'), 'o exército de uma facção de fora, na ocupada: nada');
  eq([C.ocupacaoNoDia(lib([ex('d1', 100, 100, 'fd', 5, 100, 'Do Culto')], { r1: { fac: 'fa', n: 2, lib: true } }), 1, new Set(['lib:r1'])).regioes.find(x => x.r === 'r1'),
    C.ocupacaoNoDia(lib([ex('g1', 100, 100, 'fa', 5, 100, 'Hoste'), ex('c1', 150, 150, 'fc', 5, 100, 'Das Ilhas')]), 1, new Set()).regioes.find(x => x.r === 'r1'),
    C.ocupacaoNoDia(lib([ex('g1', 100, 100, 'fa', 5, 100, 'Hoste')], { r1: { fac: 'fb', n: 2 } }), 1, new Set()).regioes.find(x => x.r === 'r1').n],
    [{ r: 'r1', tipo: 'libertar', lib: true, fac: 'fd', dono: 'fa', quem: 'fb', n: 3, de: 3, recusado: true }, undefined, 1],
    'a aliada da dona também liberta (no terceiro dia, a proposta; a recusa); a aliada de quem ocupa impede; a contagem de ocupar não vale para libertar');
  ok(!C.ocupacaoNoDia(lib([ex('b1', 100, 100, 'fb', 5, 100, 'Do Vale')]), 1, new Set()).regioes.some(x => x.r === 'r1'), 'quem ocupa, sozinho na ocupada: nada');
  // aplicar
  const ma = N.normalizarMapa(Object.assign(JSON.parse(j(m)), { guerra: { pres: { r2: { fac: 'fa', n: 2 }, r6: { fac: 'fa', n: 2 } } } }));
  const res = C.diaDaCampanha(ma, 1, ['ocup:r6']), da = JSON.parse(j(ma));
  eq([res.regioes.filter(x => x.tipo === 'ocupar').map(x => [x.r, x.recusado]), C.aplicarDia(da, res)], [[['r2', false], ['r6', true]], res.linhas.length + 1], 'o dia da campanha traz a ocupação; aplicar conta os exércitos e as regiões');
  const na = N.normalizarMapa(da), NA = id => na.objs.find(o => o.id === id);
  eq([NA('r2').ocup, NA('r6').ocup, na.guerra.pres], [{ fac: 'fa', d: 3 }, undefined, { r2s: { fac: 'fa', n: 1 } }], 'aplicar: o Vale ocupado por Aldar desde hoje (a contagem sai); a recusada recomeça do zero');
  const dl = JSON.parse(j(lib([ex('g1', 100, 100, 'fa', 5, 100, 'Hoste')], { r1: { fac: 'fa', n: 2, lib: true } }))), rl = C.diaDaCampanha(N.normalizarMapa(dl), 1, []);
  C.aplicarDia(dl, rl);
  ok(!N.normalizarMapa(dl).objs.find(o => o.id === 'r1').ocup, 'aplicar: libertar tira a ocupação');
  const vz = JSON.parse(j(ma)); vz.guerra = { pres: { r2: { fac: 'fa', n: 1 } } };
  vz.objs = vz.objs.filter(o => o.k !== 'g');
  const dz = JSON.parse(j(vz)); C.aplicarDia(dz, C.diaDaCampanha(N.normalizarMapa(vz), 1, []));
  ok(!('guerra' in N.normalizarMapa(dz)), 'sem ninguém para contar, a contagem de antes sai (e a guerra vazia some)');
}
{
  // a produção vai para quem ocupa; o Livro e a população continuam da dona
  const d = JSON.parse(j(mundoOc())), O = id => d.objs.find(o => o.id === id);
  O('r2').prod = { suprimentos: 5 }; O('r1').prod = { suprimentos: 2 }; O('r2').ocup = { fac: 'fa', d: 1 };
  d.faccoes.find(f => f.id === 'fa').jog = true;
  d.objs.push({ id: 'k2', k: 'm', nome: 'Vila do Vale', x: 700, y: 200, ass: { niv: 'vila', pop: 300 } });
  const m = N.normalizarMapa(d), por = R.producaoPorFaccao(m).por, sem0 = JSON.parse(j(d)); delete sem0.objs.find(o => o.id === 'r2').ocup;
  const por0 = R.producaoPorFaccao(N.normalizarMapa(sem0)).por, v2 = arr(R.producaoPropria(m, m.objs.find(o => o.id === 'r2')).total.suprimentos);
  ok(v2 > 5, 'o Vale produz (os 5 do mestre, o terreno e a vila): ' + v2);
  eq([arr(por.fa.suprimentos - por0.fa.suprimentos), arr(por0.fb.suprimentos - por.fb.suprimentos)], [v2, v2], 'a produção da ocupada vai para quem ocupa (sai da dona)');
  const ej = R.economiaDosJogadores(m, null, () => true);
  eq([arr(ej.prod.total.suprimentos - R.economiaDosJogadores(N.normalizarMapa(sem0), null, () => true).prod.total.suprimentos), ej.livro.prov, R.populacaoDaFaccao(m, 'fb'), R.populacaoDaFaccao(m, 'fa')], [v2, 1, 400, 0],
    'na economia dos jogadores, a produção da ocupada entra; o Livro conta só as regiões deles; a população fica com a dona');
  // a forragem na ocupada: na conta de quem a controla
  const w = JSON.parse(j(m)); w.hexes = {};
  const sem = N.normalizarMapa(w).eco.sem;
  w.guerra = { forr: [{ r: 'r2', s: sem, n: 2 }] };
  w.cal.dia = 10;
  eq(R.semanaPrevia(N.normalizarMapa(w)).forr, [{ r: 'r2', fac: 'fa', rec: 'suprimentos', n: 2 }], 'a forragem na ocupada sai da produção de quem ocupa');
}
{
  // anexar, devolver, ocupar à mão e a paz
  const d = JSON.parse(j(mundoOc())), O = id => d.objs.find(o => o.id === id);
  O('r2').ocup = { fac: 'fa', d: 1 }; O('r1').ocup = { fac: 'fb', d: 1 }; O('r3').ocup = { fac: 'fa', d: 1 };
  const m = N.normalizarMapa(d);
  eq(C.terrasEntre(m, 'fa', 'fb'), [{ r: 'r1', nome: 'Terra Alta', dono: 'fa', quem: 'fb' }, { r: 'r2', nome: 'Vale Fundo', dono: 'fb', quem: 'fa' }], 'as terras ocupadas entre as duas (a das Ilhas, não)');
  eq(C.textoTerrasNaPaz(m, [{ r: 'r1', anexar: false }, { r: 'r2', anexar: true }, { r: 'r4', anexar: true }]), '**As terras ocupadas:** Terra Alta volta para Aldar; Vale Fundo passa a ser de Aldar.', 'o parágrafo das terras para a notícia da paz');
  eq(C.textoTerrasNaPaz(m, []), '', 'sem terras, nada');
  const dp = JSON.parse(j(m));
  eq(C.terrasNaPaz(dp, [{ r: 'r1', anexar: false }, { r: 'r2', anexar: true }, { r: 'r4', anexar: true }]), 2, 'a paz: devolver e anexar (a sem ocupação, nada)');
  const mp = N.normalizarMapa(dp), MP = id => mp.objs.find(o => o.id === id);
  eq([MP('r1').fac, MP('r1').ocup, MP('r2').fac, MP('r2').ocup, MP('r3').ocup], ['fa', undefined, 'fa', undefined, { fac: 'fa', d: 1 }], 'devolvida, a ocupação sai; anexada, a dona muda; a outra fica');
  const dm = JSON.parse(j(m));
  dm.guerra = { pres: { r5: { fac: 'fa', n: 2 }, r2: { fac: 'fb', n: 1, lib: true }, r6: { fac: 'fa', n: 1 }, r7: { fac: 'fa', n: 1 } } };
  eq([C.ocupar(dm, 'r4', 'fa'), C.ocupar(dm, 'r5', 'fb'), C.ocupar(dm, 'r5', 'zz'), C.ocupar(dm, 'r2', 'fa'), C.ocupar(dm, 'r5', 'fa'), C.ocupar(dm, 'zz', 'fa'), C.ocupar(dm, 'r5', null)], [false, false, false, false, true, false, false],
    'ocupar à mão: a terra de uma facção; não a dona, não quem já ocupa, uma facção que existe');
  eq([dm.objs.find(o => o.id === 'r5').ocup, Object.keys(dm.guerra.pres), C.devolver(dm, 'r2'), C.devolver(dm, 'r2'), C.anexar(dm, 'r5'), C.anexar(dm, 'r5'), dm.objs.find(o => o.id === 'r5').fac, Object.keys(dm.guerra.pres)],
    [{ fac: 'fa', d: 3 }, ['r2', 'r6', 'r7'], true, false, 'fa', null, 'fa', ['r6', 'r7']], 'ocupar desde hoje; devolver e anexar (só a ocupada); a contagem da região sai junto');
  // as notícias (com a data)
  const dt = R.semanaN ? require('../../mundo/corte.js').dataTxt(m, (x => ({ a: x.ano, m: x.mes, d: x.diaMes }))(N.dataDe(m.cal, 3))) : '';
  const dt10 = require('../../mundo/corte.js').dataTxt(m, (x => ({ a: x.ano, m: x.mes, d: x.diaMes }))(N.dataDe(m.cal, 10)));
  eq([C.noticiaOcupacao(m, 'r2', 'fa'), C.noticiaLibertacao(m, 'r1', 'fb', 'fa'), C.noticiaLibertacao(m, 'r1', 'fb', 'fd', 10), C.noticiaAnexacao(m, 'r2')],
    [{ tit: 'Vale Fundo ocupada por Aldar', txt: 'As tropas de Aldar ocupam Vale Fundo, terra de Vale (' + dt + ').' }, { tit: 'Terra Alta livre de novo', txt: 'Aldar retoma Terra Alta, que estava ocupada por Vale (' + dt + ').' },
      { tit: 'Terra Alta livre de novo', txt: 'Com as tropas de Culto, Aldar retoma Terra Alta, que estava ocupada por Vale (' + dt10 + ').' }, { tit: 'Aldar anexa Vale Fundo', txt: 'Vale Fundo, que era de Vale, passa a ser de Aldar (' + dt + ').' }],
    'as notícias da ocupação, da libertação (pela aliada, com o nome dela; num outro dia) e da anexação, com a data');
  ok(/^\d+ de .+, ano \d+$/.test(dt), 'a data da notícia: ' + dt);
}
/* ---- (parte 12c) a vida das tropas e a cura ---- */
function mundoVida(extra) {
  let m = N.normalizarMapa({ id: 'z', nome: 'M', larg: 2000, alt: 1000, grade: { tam: 40, x: 0, y: 0 },
    faccoes: [{ id: 'fa', nome: 'Aldar', rel: { fb: 'guerra', fc: 'alianca' } }, { id: 'fb', nome: 'Vale', rel: { fa: 'guerra' } }, { id: 'fc', nome: 'Ilhas', rel: { fa: 'alianca' } }],
    objs: [{ id: 'r1', k: 'r', nome: 'Terra Alta', fac: 'fa', pts: quad(0, 0, 400, 400) }, { id: 'r2', k: 'r', nome: 'Vale Fundo', fac: 'fb', pts: quad(500, 0, 400, 400) },
      { id: 'r3', k: 'r', nome: 'Ilha', fac: 'fc', pts: quad(1000, 0, 400, 400) },
      { id: 'c1', k: 'm', nome: 'Vila Alta', x: 100, y: 100 }, { id: 'c2', k: 'm', nome: 'Vila do Vale', x: 600, y: 100 }, { id: 'c3', k: 'm', nome: 'Porto das Ilhas', x: 1100, y: 100 },
      { id: 'h1', k: 'g', tipo: 'exercito', x: 100, y: 100, fac: 'fa', nome: 'Hoste', exe: { moral: 6, mant: 50, unid: [{ id: 'o1', nome: 'Ogros', tropas: 20, hpT: 10, fer: 7 }, { id: 'm1', nome: 'Médicos', tropas: 10, cura: 20 }] } },
      { id: 'h2', k: 'g', tipo: 'exercito', x: 600, y: 100, fac: 'fa', nome: 'Vanguarda', exe: { moral: 6, mant: 50, unid: [{ id: 'o2', nome: 'Ogros', tropas: 20, hpT: 10, fer: 7 }] } },
      { id: 'h3', k: 'g', tipo: 'exercito', x: 1100, y: 100, fac: 'fa', nome: 'Frota', exe: { moral: 6, mant: 50, unid: [{ id: 'o3', nome: 'Marujos', tropas: 20, hpT: 10, fer: 7 }] } },
      { id: 'h4', k: 'g', tipo: 'exercito', x: 300, y: 300, fac: 'fa', nome: 'Faminta', exe: { moral: 6, mant: 0, unid: [{ id: 'o4', nome: 'Lanceiros', tropas: 155, hpT: 10, fer: 0 }] } }].concat(extra || []) });
  m = JSON.parse(j(m));
  m.cal.dia = 150;                                                // (um dia de verão: sem o desgaste do inverno)
  R.ligarEconomia(m);
  const ass = n => ({ niv: 'vila', pop: 100, cons: [{ id: 'ce', t: 'enfermaria', n }] });
  m.objs.find(o => o.id === 'c1').ass = ass(1); m.objs.find(o => o.id === 'c2').ass = ass(3); m.objs.find(o => o.id === 'c3').ass = ass(2);
  return N.normalizarMapa(m);
}
{
  // o catálogo: a Enfermaria, a cura de cada nível; as que faltam nos mapas de antes
  const m = mundoVida(), enf = m.eco.cons.find(c => c.id === 'enfermaria');
  eq([!!enf, enf && enf.niveis.map(nv => nv.cura), enf && enf.ic, m.eco.cons.filter(c => c.niveis.some(nv => 'cura' in nv)).map(c => c.id)], [true, [5, 10, 15], 'enfermaria', ['enfermaria']],
    'o catálogo pronto traz a Enfermaria (cura +5%, +10%, +15%); só ela tem a cura');
  const cat = N.normalizarMapa(Object.assign(JSON.parse(j(m)), { eco: Object.assign(JSON.parse(j(m.eco)), { cons: [{ id: 'x', nome: 'X', niveis: [{ cura: 150 }, { cura: -3 }, { cura: 'a' }, { cura: 7.6 }] }] }) })).eco.cons[0];
  eq(cat.niveis.map(nv => nv.cura), [100, undefined, undefined, 8], 'a cura de um nível: de 0 a 100, inteira (zero, nem fica)');
  const antes = JSON.parse(j(m)); antes.eco.cons = antes.eco.cons.filter(c => c.id !== 'enfermaria' && c.id !== 'taverna');
  const ma = N.normalizarMapa(antes);
  eq([R.construcoesQueFaltam(ma).map(c => c.id), R.construcoesQueFaltam(m), R.construcoesQueFaltam(N.normalizarMapa({ nome: 'M' }))], [['taverna', 'enfermaria'].sort((x, y) => R.CONSTRUCOES_INICIAIS.findIndex(c => c.id === x) - R.CONSTRUCOES_INICIAIS.findIndex(c => c.id === y)), [], []],
    'as do catálogo pronto que o mapa não tem (na ordem dele); com todas, nenhuma; sem a economia, nenhuma');
  const C1 = m.objs.find(o => o.id === 'c1'), C2 = m.objs.find(o => o.id === 'c2');
  eq([R.efeitoDasConstrucoes(m, C1).cura, R.curaDoAssentamento(m, C2), R.curaDoAssentamento(N.normalizarMapa(Object.assign(JSON.parse(j(m)), { eco: Object.assign(JSON.parse(j(m.eco)), { on: false }) })), C2)], [5, 15, 0],
    'a cura das construções da cidade (o nível pronto); sem a economia ligada, nada');
  const dois = JSON.parse(j(m)); dois.objs.find(o => o.id === 'c1').ass.cons.push({ id: 'cf', t: 'enfermaria', n: 3 });
  dois.eco.cons.find(c => c.id === 'enfermaria').niveis[2].cura = 98;
  eq(R.curaDoAssentamento(N.normalizarMapa(dois), N.normalizarMapa(dois).objs.find(o => o.id === 'c1')), 100, 'a cura das construções soma, até 100%');
}
{
  // a Enfermaria perto: a da cidade no hexágono (ou colado), na terra da facção ou de uma aliada
  const m = mundoVida(), G = id => m.objs.find(o => o.id === id);
  eq([C.enfermariaPerto(m, G('h1')), C.enfermariaPerto(m, G('h2')), C.enfermariaPerto(m, G('h3')), C.enfermariaPerto(m, G('h4'))],
    [{ m: 'c1', nome: 'Vila Alta', pct: 5 }, null, { m: 'c3', nome: 'Porto das Ilhas', pct: 10 }, null], 'na cidade de casa e na da aliada, sim; na do inimigo e longe, não');
  const ocupa = JSON.parse(j(m)); ocupa.objs.find(o => o.id === 'r2').ocup = { fac: 'fa', d: 0 };
  Object.assign(ocupa.objs.find(o => o.id === 'h4'), { x: 140, y: 100 });
  const mo = N.normalizarMapa(ocupa);
  eq([C.enfermariaPerto(mo, mo.objs.find(o => o.id === 'h2')).pct, C.enfermariaPerto(mo, mo.objs.find(o => o.id === 'h4')).m], [15, 'c1'], 'a cidade ocupada é de quem ocupa; colado no hexágono da cidade também vale');
  const semG = N.normalizarMapa(Object.assign(JSON.parse(j(m)), { grade: null }));
  eq([C.enfermariaPerto(semG, semG.objs.find(o => o.id === 'h1')).m, C.enfermariaPerto(semG, Object.assign({}, semG.objs.find(o => o.id === 'h1'), { x: 200 }))], ['c1', null], 'sem a grade, perto (menos de 60)');
  eq(C.enfermariaPerto(m, Object.assign({}, G('h1'), { fac: null })), null, 'o exército sem facção não usa a Enfermaria');
  eq(C.enfermariaPerto(m, Object.assign({}, G('h1'), { x: 180 })), null, 'a dois hexágonos da cidade, não');
  const duas = JSON.parse(j(m)); duas.objs.find(o => o.id === 'c1').ass.cons[0].n = 3;
  duas.objs.push({ id: 'c4', k: 'm', nome: 'Aldeia Baixa', x: 140, y: 100, ass: { niv: 'vila', pop: 0, cons: [{ id: 'cf', t: 'enfermaria', n: 1 }] } });
  const md = N.normalizarMapa(duas);
  eq(C.enfermariaPerto(md, md.objs.find(o => o.id === 'h1')), { m: 'c1', nome: 'Vila Alta', pct: 15 }, 'com duas cidades perto, a de maior cura');
}
{
  // o dia: a cura e o desgaste no HP das unidades
  const m = mundoVida(), r = C.diaDaCampanha(m, 1, []), L = id => r.linhas.find(x => x.g === id);
  eq([L('h1').curaPct, L('h1').cura], [25, { pct: 25, med: 20, enf: { m: 'c1', nome: 'Vila Alta', pct: 5 }, hp: 2, unid: [{ id: 'o1', nome: 'Ogros', f0: 7, f1: 5 }] }],
    'a cura: os médicos (20%) e a Enfermaria (5%), 25% do que falta na ferida dos Ogros (7 → 5: o arredondado de 1,75)');
  eq([L('h2').curaPct, L('h2').cura, L('h3').curaPct, L('h3').cura.unid[0].f1], [0, null, 10, 6], 'sem médicos nem Enfermaria, nada; na Enfermaria da aliada, 10% (pelo menos 1 de HP)');
  eq([L('h4').desg.unid[0], L('h4').cura], [{ id: 'o4', nome: 'Lanceiros', t0: 155, t1: 152, f1: 1, acaba: false }, null],
    'o desgaste sai do HP da unidade: 1550 → 1519 (2% da fome): 152 tropas, uma ferida (9 de 10)');
  eq(C.diaDaCampanha(m, 4, []).linhas.find(x => x.g === 'h3').cura.unid[0].f1, 3, 'pelo menos 1 de HP por dia (10% de 4 seria 0)');
  const r3 = C.diaDaCampanha(m, 3, []);
  eq([r3.linhas.find(x => x.g === 'h1').cura.unid[0].f1, r3.linhas.find(x => x.g === 'h3').cura.unid[0].f1], [3, 4], 'vários dias: a cura de cada dia (25% do que falta, arredondado: 7 → 5 → 4 → 3; 10%: pelo menos 1 por dia)');
  const rr = C.diaDaCampanha(m, 1, ['cura:h1', 'g:h3']);
  eq([rr.linhas.find(x => x.g === 'h1').cura, rr.linhas.find(x => x.g === 'h1').curaPct, rr.linhas.find(x => x.g === 'h3').cura], [null, 25, null], 'sem a cura (desmarcada) e o exército desmarcado: nada (a % fica para a janela)');
  // os médicos que morrem no desgaste não curam; o desgaste faz a ferida que a cura trata
  const dm = JSON.parse(j(m)); const h4 = dm.objs.find(o => o.id === 'h4');
  h4.exe.unid.push({ id: 'm4', nome: 'Médicos', tropas: 1, cura: 50 });
  const r4 = C.diaDaCampanha(N.normalizarMapa(dm), 60, []), L4 = r4.linhas.find(x => x.g === 'h4');
  eq([L4.desg.unid.find(u => u.id === 'm4').acaba, L4.curaPct], [true, 0], 'os médicos que acabam no desgaste não curam');
  const d5 = JSON.parse(j(m)); d5.objs.find(o => o.id === 'h4').exe.unid.push({ id: 'm5', nome: 'Alquimistas', tropas: 50, cura: 50 });
  const L5 = C.diaDaCampanha(N.normalizarMapa(d5), 1, []).linhas.find(x => x.g === 'h4');
  eq([L5.desg.unid.find(u => u.id === 'o4').f1, L5.cura.unid], [1, [{ id: 'o4', nome: 'Lanceiros', f0: 1, f1: 0 }]], 'a ferida do desgaste do dia, a cura trata (50% de 1: pelo menos 1)');
  // o desgaste com a ferida de antes; o desgaste que só fere (nenhuma tropa morre); o médico sem tropas não cura
  const d6 = JSON.parse(j(m)), h6 = d6.objs.find(o => o.id === 'h4');
  h6.exe.unid[0].fer = 3; h6.exe.unid.push({ id: 'p6', nome: 'Poucos', tropas: 10, hpT: 10 });
  d6.objs.find(o => o.id === 'h3').exe.unid.push({ id: 'z3', nome: 'Médicos mortos', tropas: 0, cura: 50 });
  const r6 = C.diaDaCampanha(N.normalizarMapa(d6), 1, []), L6 = r6.linhas.find(x => x.g === 'h4');
  eq([L6.desg.unid.map(u => [u.t1, u.f1]), r6.linhas.find(x => x.g === 'h3').curaPct], [[[152, 4], [10, 2]], 10],
    'o desgaste sai do HP com a ferida (1547 × 98% = 1516: 152 tropas, falta 4); o que só fere (100 → 98: 10 tropas, falta 2); o médico sem tropas não cura');
  const so = C.diaDaCampanha(N.normalizarMapa(Object.assign(JSON.parse(j(d6)), { objs: JSON.parse(j(d6)).objs.map(o => (o.id === 'h4' ? Object.assign(o, { exe: Object.assign(o.exe, { unid: [o.exe.unid[1]] }) }) : o)) })), 1, []);
  eq((L => [L.desg && L.desg.tropas0, L.desg && L.desg.tropas1, L.desg && L.desg.unid[0].f1])(so.linhas.find(x => x.g === 'h4')), [10, 10, 2], 'o desgaste que só fere fica na conta (as tropas iguais)');
  // aplicar
  const d = JSON.parse(j(m));
  C.aplicarDia(d, r);
  const na = N.normalizarMapa(d), U = (g, u) => na.objs.find(o => o.id === g).exe.unid.find(x => x.id === u);
  eq([[U('h1', 'o1').tropas, U('h1', 'o1').fer], [U('h3', 'o3').tropas, U('h3', 'o3').fer], [U('h4', 'o4').tropas, U('h4', 'o4').fer], U('h2', 'o2').fer], [[20, 5], [20, 6], [152, 1], 7],
    'aplicar: a ferida curada; o desgaste nas tropas e na ferida; sem cura, igual');
}

console.log(bad ? bad + ' falharam de ' + n : n + ' verificações passaram');
process.exit(bad ? 1 : 0);
