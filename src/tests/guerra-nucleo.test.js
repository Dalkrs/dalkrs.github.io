// Lote 8, parte 6 — a Guerra no Mapa-múndi, as contas (sem navegador): mundo/nucleo.js (o que fica guardado no mapa e
// o que vai para os jogadores) e mundo/guerra.js (o motor das batalhas).
//   · o mapa de antes continua igual (sem a chave guerra, sem fases na frente); os tipos de tropa (tabela do mestre),
//     as unidades (tropas, HP, ATQ, DEF, magos, cerco, equipamentos, escondida), o exército (comandante com bônus e
//     ficha, moral, mantimentos), a fortificação do marcador, as fases da frente, o histórico das batalhas e os
//     hexágonos destruídos ou corrompidos — com os limites; a escala nova leva as fases da frente junto;
//   · a projeção: os jogadores veem os exércitos e as frentes, sem os números (nem as unidades escondidas, nem a
//     fortificação, nem as vantagens, nem o histórico, nem as fases que vêm, nem o hexágono debaixo da névoa);
//   · o motor: os lados (a força pelo HP, os equipamentos, quem é de longe), cada bônus em cada momento (Abertura:
//     magos e distância; Choque: números, ATQ × DEF, tipos, fortificação, fome; Virada: moral e comandante; Desfecho:
//     números, moral e fome; a resumida soma tudo), os bônus do mestre (do lado, da batalha toda ou de um momento), a
//     resumida (d100 + 5 × bônus) e a detalhada (d20 por momento) com os dados dados, o momento-chave, os tamanhos, o
//     parar (recuo, rendição, trégua), o depois (perdas, moral, mantimentos, a fortificação, a frente que anda para
//     quem perdeu, o hexágono) e o aplicar, os mantimentos do dia e os exércitos que se encontram.
// Uso: node src/tests/guerra-nucleo.test.js
'use strict';
const path = require('path');
const N = require(path.join(__dirname, '..', '..', 'mundo', 'nucleo.js'));
const G = require(path.join(__dirname, '..', '..', 'mundo', 'guerra.js'));

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FALHOU: ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' — esperado ' + JSON.stringify(b) + ', veio ' + JSON.stringify(a));
const j = JSON.stringify;
const achar = (m, id) => m.objs.find(o => o.id === id);
const semente = s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

// o mapa de teste: grade de 40, duas facções, os três tipos (Cavalaria, Lanceiros, Arqueiros), dois exércitos, um
// forte com muralhas perto do segundo e uma frente entre os dois
const TIPOS = [{ id: 'cav', nome: 'Cavalaria', vant: { arq: 3, lan: -2 } }, { id: 'lan', nome: 'Lanceiros', vant: { cav: 3 } }, { id: 'arq', nome: 'Arqueiros', dist: true, vant: {} }];
const exA = () => ({ cmd: { nome: 'Rei Aldar', b: 2 }, moral: 7, mant: 40, unid: [
  { id: 'u1', nome: 'Cavalaria pesada', tipo: 'cav', tropas: 800, atq: 6, def: 4 },
  { id: 'u2', nome: 'Arqueiros do rei', tipo: 'arq', tropas: 400, atq: 4, def: 2, magos: 9 }] });
const exB = () => ({ cmd: { nome: 'Duquesa', b: 1 }, moral: 5, mant: 12, unid: [{ id: 'u3', nome: 'Lanceiros', tipo: 'lan', tropas: 900, atq: 5, def: 6, cerco: 2 }] });
function mapaGuerra(extra) {
  return N.normalizarMapa(Object.assign({
    v: 1, id: 'mp_g', nome: 'Guerra', larg: 2000, alt: 1400, grade: { tam: 40, x: 0, y: 0 },
    faccoes: [{ id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, { id: 'fb', nome: 'Vale', cor: '#8a2a2a' }],
    guerra: { tipos: TIPOS, bats: [], hexes: {} },
    objs: [
      { k: 'g', id: 'ga', nome: 'Hoste de Aldar', x: 700, y: 600, tipo: 'exercito', fac: 'fa', exe: exA() },
      { k: 'g', id: 'gb', nome: 'Legião do Vale', x: 760, y: 610, tipo: 'exercito', fac: 'fb', exe: exB() },
      { k: 'm', id: 'cast', nome: 'Forte do Vale', x: 765, y: 612, ic: 'castelo', estr: { nome: 'Muralhas', def: 4, hp: 60, hpMax: 60 } },
      { k: 'f', id: 'fr', nome: 'Frente do Vale', pts: [[730, 200], [730, 1000]], a: 'fa', b: 'fb' },
    ],
  }, extra || {}));
}

/* ================= o que fica guardado no mapa ================= */
{
  const m0 = N.normalizarMapa({ nome: 'Antigo', objs: [{ k: 'f', id: 'f0', pts: [[0, 0], [0, 100]] }, { k: 'g', id: 'g0', x: 1, y: 1 }] });
  ok(!('guerra' in m0), 'o mapa de antes continua sem a chave guerra');
  ok(!('fases' in achar(m0, 'f0')) && !('exe' in achar(m0, 'g0')), 'e a frente sem fases, e o grupo sem exército');
  ok(!('guerra' in N.normalizarMapa({ nome: 'x', guerra: { tipos: [], bats: [], hexes: {} } })), 'a guerra vazia não fica no mapa');
  ok(!('guerra' in N.normalizarMapa({ nome: 'x', guerra: 'lixo' })), 'a guerra que não é objeto sai');
}
{ // os tipos de tropa: a tabela do mestre
  const m = N.normalizarMapa({ guerra: { tipos: [
    { id: 'cav', nome: ' Cavalaria ', vant: { arq: 3, lan: -2, zzz: 5, cav: 4, x: 0 } },
    { id: 'lan', nome: '', vant: { cav: 30 } },
    { id: 'arq', nome: 'Arqueiros', dist: true },
    { id: 'cav', nome: 'Repetido' }, { nome: 'Sem id' }, 'lixo', { id: 'mal id!', nome: 'x' },
  ] } });
  eq(m.guerra.tipos, [{ id: 'cav', nome: 'Cavalaria', dist: false, vant: { arq: 3, lan: -2 } }, { id: 'lan', nome: 'Tipo', dist: false, vant: { cav: 20 } }, { id: 'arq', nome: 'Arqueiros', dist: true, vant: {} }],
    'os tipos: o nome (sem nome: "Tipo"), de longe ou não e a vantagem contra os outros tipos (contra um tipo que não existe, contra ele mesmo e o zero saem; até ±20); repetidos e sem id saem');
  eq([m.guerra.bats, m.guerra.hexes], [[], {}], 'com os tipos, a guerra fica (o histórico e os hexágonos vazios)');
  const muitos = N.normalizarMapa({ guerra: { tipos: Array.from({ length: 50 }, (_, i) => ({ id: 't' + i, nome: 'T' + i })) } });
  eq(muitos.guerra.tipos.length, N.LIMITES.tiposGuerra, 'até ' + N.LIMITES.tiposGuerra + ' tipos');
}
{ // as unidades e o exército
  const m = N.normalizarMapa({ guerra: { tipos: [{ id: 'cav', nome: 'Cavalaria' }] }, objs: [
    { k: 'g', id: 'ga', x: 10, y: 10, tipo: 'exercito', exe: { cmd: { nome: ' Rei ', b: 50, ficha: 'pc_1' }, moral: 14, mant: -3, cons: '', fome: 2, unid: [
      { id: 'u1', nome: 'Cav', tipo: 'cav', tropas: 500, hp: 150, hpMax: 120, atq: 150, def: -150, magos: 3, cerco: 2, equip: [{ nome: 'Lanças', atq: 2 }, 'lixo'], oc: true },
      { id: 'u1', tipo: 'nada', tropas: -5, hpT: 10, fer: 3 }, {}, { id: 'u4', tropas: 20, hpT: 10, fer: 15, cura: 250 }, { id: 'u6', tropas: 3, hpT: 2.4, fer: 1, cura: -3 }, 'lixo'] } },
    { k: 'g', id: 'gc', x: 20, y: 20, tipo: 'caravana', exe: { unid: [{ tropas: 5 }] } },
    { k: 'g', id: 'gd', x: 30, y: 30, exe: { unid: [] } },
    { k: 'g', id: 'ge', x: 40, y: 40, tipo: 'exercito', exe: { moral: 'x', cons: 7, cmd: 'lixo', unid: 'lixo' } },
  ] });
  const e = achar(m, 'ga').exe;
  eq(e.cmd, { nome: 'Rei', b: 20, ficha: 'pc_1' }, 'o comandante: o nome, o bônus (até ±20) e a ficha ligada');
  eq([e.moral, e.mant, e.cons, e.fome], [10, 0, null, 2], 'a moral vai de 0 a 10, os mantimentos não ficam negativos, o consumo vazio é o de começo (null)');
  eq(e.unid[0], { id: 'u1', nome: 'Cav', tipo: 'cav', tropas: 500, hpT: 1, fer: 0, atq: 99, def: -99, magos: 3, cura: 0, cerco: 2, equip: [{ nome: 'Lanças', atq: 2, def: 0 }], oc: true },
    'a unidade: o HP de antes (separado) sai — 1 de HP por tropa, inteira —, ATQ e DEF até ±99, o equipamento com ATQ e DEF, escondida');
  eq(e.unid.slice(1).map(u => [u.nome, u.tipo, u.tropas, u.hpT, u.fer, u.atq, u.def, u.magos, u.cura, u.cerco, u.equip.length]),
    [['Unidade 2', null, 0, 10, 0, 0, 0, 0, 0, 0, 0], ['Unidade 3', null, 100, 1, 0, 0, 0, 0, 0, 0, 0], ['Unidade 4', null, 20, 10, 9, 0, 0, 0, 100, 0, 0], ['Unidade 5', null, 3, 2, 1, 0, 0, 0, 0, 0, 0]],
    'sem nada: 100 tropas de 1 de HP; o tipo que não existe vira "sem tipo"; tropas negativas viram zero (sem a ferida); a ferida, menos que o HP de uma tropa; a cura de 0 a 100; o lixo sai');
  ok(new Set(e.unid.map(u => u.id)).size === 5, 'os ids das unidades não se repetem');
  eq([N.hpDaUnidade(e.unid[3]), N.hpDaUnidade(e.unid[1]), N.hpDaUnidade({ tropas: 98, hpT: 10, fer: 5 }), N.tropasComHp(10, 975), N.tropasComHp(10, 980), N.tropasComHp(10, 0), N.tropasComHp(1, 12.4), N.tropasComHp(0, 3)],
    [{ hp: 191, max: 200 }, { hp: 0, max: 0 }, { hp: 975, max: 980 }, { tropas: 98, fer: 5 }, { tropas: 98, fer: 0 }, { tropas: 0, fer: 0 }, { tropas: 12, fer: 0 }, { tropas: 3, fer: 0 }],
    'o HP da unidade (a soma das tropas, menos a ferida) e as tropas de um HP (a ferida conta como viva)');
  ok(!('exe' in achar(m, 'gc')) && !('exe' in achar(m, 'gd')), 'só o grupo do tipo Exército tem exército');
  eq(achar(m, 'ge').exe, { cmd: { nome: '', b: 0, ficha: null }, moral: 5, mant: 0, cons: 7, fome: 0, unid: [] }, 'o exército com lixo: os padrões (moral 5), e o consumo escolhido fica');
  const muitas = N.normalizarMapa({ objs: [{ k: 'g', id: 'g', x: 1, y: 1, tipo: 'exercito', exe: { unid: Array.from({ length: 50 }, () => ({ equip: Array.from({ length: 20 }, () => ({})) })) } }] });
  eq([achar(muitas, 'g').exe.unid.length, achar(muitas, 'g').exe.unid[0].equip.length], [N.LIMITES.unidades, N.LIMITES.equipamentos], 'até ' + N.LIMITES.unidades + ' unidades, e ' + N.LIMITES.equipamentos + ' equipamentos cada');
}
{ // a fortificação do marcador, as fases da frente
  const m = N.normalizarMapa({ objs: [
    { k: 'm', id: 'mk', x: 5, y: 5, estr: { nome: ' Muralhas ', def: 40, hp: 500 } }, { k: 'm', id: 'mk2', x: 5, y: 5, estr: 'lixo' }, { k: 'm', id: 'mk3', x: 5, y: 5, estr: {} },
    { k: 'e', id: 'ev', x: 1, y: 1, estr: { def: 3 } },
    { k: 'f', id: 'fr', pts: [[0, 0], [0, 100]], fases: [{ dia: 3, pts: [[1, 1], [1, 101]] }, { dia: 2, pts: [[5, 5]] }, { dia: 3, pts: [[2, 2], [2, 102]] }, { dia: 1, pts: [[0, 0], [1, 1], [2, 2]] }, { dia: 'x', pts: [[0, 0], [1, 1]] }] },
    { k: 'f', id: 'fr2', pts: [[0, 0], [0, 100]], fases: [] },
  ] });
  eq(achar(m, 'mk').estr, { nome: 'Muralhas', def: 20, hp: 100, hpMax: 100 }, 'a fortificação: o nome, a DEF (até 20), o HP (até o máximo; 100 de começo)');
  ok(!('estr' in achar(m, 'mk2')) && j(achar(m, 'mk3').estr) === j({ nome: '', def: 3, hp: 100, hpMax: 100 }), 'sem fortificação, nada; a vazia ganha os padrões (DEF 3, HP 100)');
  ok(!('estr' in achar(m, 'ev')), 'só o marcador tem fortificação');
  eq(achar(m, 'fr').fases, [{ dia: 1, pts: [[0, 0], [1, 1], [2, 2]] }, { dia: 3, pts: [[2, 2], [2, 102]] }], 'as fases da frente: em ordem, um dia só uma vez (vale a de depois), com dois pontos ou mais e um dia que é número');
  ok(!('fases' in achar(m, 'fr2')), 'a frente sem fases fica sem a chave');
  eq(N.faseNoDia(achar(m, 'fr'), 2), 0, 'no dia 2 vale a fase do dia 1');
  eq(N.formaNoDia(achar(m, 'fr'), 0), [[0, 0], [0, 100]], 'antes da primeira fase, a linha de partida');
  eq(N.formaNoDia(achar(m, 'fr'), 9), [[2, 2], [2, 102]], 'depois, a última fase');
  const e2 = N.escalarMapa(N.normalizarMapa({ larg: 1000, alt: 1000, objs: [{ k: 'f', id: 'fr', pts: [[0, 0], [0, 100]], fases: [{ dia: 1, pts: [[10, 0], [10, 100]] }] }] }), 2, 2);
  eq([achar(e2, 'fr').pts, achar(e2, 'fr').fases], [[[0, 0], [0, 200]], [{ dia: 1, pts: [[20, 0], [20, 200]] }]], 'a imagem nova de outro tamanho leva as fases da frente junto');
}
{ // o histórico das batalhas e os hexágonos
  const m = N.normalizarMapa({ guerra: { bats: [{ id: 'bt1', d: 5, nome: 'A × B', a: { nome: 'A', g: 'ga', fac: 'fa' }, b: 'lixo', modo: 'x',
    mom: [{ k: 'zz', da: 0, db: 300, ta: 5000, tb: -5000, chave: true, nota: ' foi ' }, 'lixo'], fim: { vence: 'c', tam: 9, como: 'fuga' }, notas: [' a ', '', 'b'], hex: '3,4' },
  { id: 'bt2', modo: 'd20', fim: { vence: 'b', tam: 2, como: 'recuo' }, hex: 'x' }],
  hexes: { '1,2': 'd', '3,4': 'c', '5,6': 'x', 'mal': 'd', '-7,8': 'c' } } });
  eq(m.guerra.bats[0], { id: 'bt1', d: 5, nome: 'A × B', a: { nome: 'A', g: 'ga', fac: 'fa' }, b: { nome: 'Lado', g: null, fac: null }, modo: 'd100',
    mom: [{ k: 'ch', da: 1, db: 100, ta: 999, tb: -999, chave: true, nota: 'foi' }], fim: { vence: null, tam: 4, como: 'dados' }, notas: ['a', 'b'], hex: '3,4' },
  'a batalha guardada: os lados, o modo, os momentos (os dados de 1 a 100), o fim, as notas e o hexágono — o lixo vira o padrão');
  eq([m.guerra.bats[1].modo, m.guerra.bats[1].fim, 'hex' in m.guerra.bats[1]], ['d20', { vence: 'b', tam: 2, como: 'recuo' }, false], 'a detalhada e o recuo ficam; o hexágono inválido sai');
  eq(m.guerra.hexes, { '1,2': 'd', '3,4': 'c', '-7,8': 'c' }, 'os hexágonos: só destruído (d) ou corrompido (c), e só chave de hexágono');
  const muitas = N.normalizarMapa({ guerra: { bats: Array.from({ length: 70 }, (_, i) => ({ id: 'b' + i })) } });
  eq([muitas.guerra.bats.length, muitas.guerra.bats[0].id, muitas.guerra.bats[59].id], [N.LIMITES.batalhas, 'b10', 'b69'], 'até ' + N.LIMITES.batalhas + ' batalhas no histórico: ficam as mais novas');
}
{ // as contas do exército
  const e = { unid: [{ tropas: 250 }, { tropas: 120 }], cons: null, mant: 10 };
  eq([N.tropasDe(e), N.consumoDe(e), N.diasDeMantimento(e)], [370, 4, 2], 'as tropas somam; comem um por cem soldados (para cima); 10 de mantimento dá 2 dias');
  eq([N.consumoDe(Object.assign({}, e, { cons: 3 })), N.diasDeMantimento(Object.assign({}, e, { cons: 3 }))], [3, 3], 'o consumo que o mestre escolheu vale');
  eq([N.consumoDe({ unid: [], cons: null, mant: 5 }), N.diasDeMantimento({ unid: [], cons: null, mant: 5 }), N.tropasDe(null), N.consumoDe(null)], [0, Infinity, 0, 0], 'sem tropas, não comem (os dias não acabam)');
  eq([N.HEX_GUERRA, N.MOMENTOS, Object.keys(N.FINS)], [{ d: 'Destruído', c: 'Corrompido' }, { ab: 'Abertura', ch: 'Choque', vi: 'Virada', de: 'Desfecho' }, ['dados', 'recuo', 'rendicao', 'tregua']], 'os catálogos: os hexágonos, os momentos e os fins');
}

/* ================= o que vai para os jogadores ================= */
{
  const m = mapaGuerra({ cal: Object.assign({}, N.mapaNovo('x').cal, { dia: 2 }),
    nevoa: { on: true, ops: [{ t: '+', x: 700, y: 600, r: 700 }] } });
  const m2 = N.normalizarMapa(Object.assign({}, m, {
    guerra: { tipos: TIPOS, bats: [{ id: 'bt1', d: 1, nome: 'A × B', fim: { vence: 'a', tam: 2, como: 'dados' }, notas: ['segredo do mestre'] }], hexes: { '17,0': 'd', '45,0': 'c' } },
    objs: m.objs.map(o => (o.id === 'ga' ? Object.assign({}, o, { exe: Object.assign({}, o.exe, { cmd: { nome: 'Rei Aldar', b: 2, ficha: 'pc_9' }, unid: o.exe.unid.concat([{ id: 'u9', nome: 'Assassinos', tropas: 5, oc: true }]) }) })
      : o.id === 'fr' ? Object.assign({}, o, { fases: [{ dia: 0, pts: [[720, 200], [720, 1000]] }, { dia: 5, pts: [[600, 200], [600, 1000]] }] }) : o)),
  }));
  const p = N.projetar(m2), pa = achar(p, 'ga'), pf = achar(p, 'fr');
  eq(p.guerra, { tipos: [{ id: 'cav', nome: 'Cavalaria', dist: false, vant: {} }, { id: 'lan', nome: 'Lanceiros', dist: false, vant: {} }, { id: 'arq', nome: 'Arqueiros', dist: false, vant: {} }], bats: [], hexes: { '17,0': 'd' } },
    'os jogadores recebem os nomes dos tipos (as vantagens e o "de longe" não vão: ficam os padrões), nada do histórico, e os hexágonos fora da névoa');
  eq(pa.exe, { pub: true, cmd: { nome: 'Rei Aldar' }, unid: [{ id: 'u1', nome: 'Cavalaria pesada', tipo: 'cav' }, { id: 'u2', nome: 'Arqueiros do rei', tipo: 'arq' }] },
    'o exército para os jogadores: o nome do comandante e as unidades (nome e tipo), sem os números, sem a ficha e sem a escondida');
  ok(!('estr' in achar(p, 'cast')), 'a fortificação do marcador é do mestre');
  eq([pf.pts, 'fases' in pf], [[[720, 200], [720, 1000]], false], 'a frente como ela está hoje (a fase de hoje); as fases que vêm são do mestre');
  const pn = N.normalizarMapa(p);
  eq(achar(pn, 'ga').exe, pa.exe, 'o mapa dos jogadores, normalizado de novo (no navegador deles), continua sem os números');
  const txt = j([pn.guerra, pn.objs.filter(o => o.k === 'g' || o.k === 'm' || o.k === 'f')]);
  const vaza = (txt.match(/"(tropas|hp|hpMax|atq|def|magos|cerco|moral|mant|cons|fome|estr|ficha|mom|notas|fases)"|segredo|Assassinos|pc_9|"arq":3|"cav":3/g) || []);
  eq(vaza, [], 'nenhum número, segredo, nota ou fase futura vaza na projeção');
}

/* ================= o motor: os lados e os bônus ================= */
const m = mapaGuerra();
const A = G.lado(m, achar(m, 'ga')), B = G.lado(m, achar(m, 'gb'));
const FORTE = { estr: { lado: 'b', def: 4, hp: 60, hpMax: 60 }, mestre: [] };
const bs = (X, Y, ctx, q, mom) => G.bonus(X, Y, ctx, q, mom).map(b => [b.k, b.v]);
{
  eq([A.tropas, A.forca, Math.round(A.atq * 1000) / 1000, Math.round(A.def * 1000) / 1000, A.magos, A.cerco, A.dist, A.moral, A.cmd, A.cmdNome], [1200, 1200, 5.333, 3.333, 9, 0, 400, 7, 2, 'Rei Aldar'],
    'o lado A: as tropas, a força, ATQ e DEF médios (pela força), os magos, a força de longe (só dos Arqueiros), a moral e o comandante');
  eq([B.tropas, B.forca, B.atq, B.def, B.cerco, B.dist], [900, 900, 5, 6, 2, 0], 'o lado B');
  const ferido = G.lado(m, { id: 'x', exe: { cmd: { nome: '', b: 0 }, moral: 5, unid: [{ tropas: 1000, hpT: 10, fer: 5, atq: 2, def: 1, equip: [{ atq: 3, def: 1 }] }, { tropas: 10, hpT: 50, fer: 0, atq: 2, def: 1, equip: [{ atq: 3, def: 1 }] }, { tropas: 0, hpT: 1, fer: 0, atq: 50, def: 50, magos: 50, cerco: 9, equip: [] }] } });
  eq([ferido.forca, ferido.atq, ferido.def, ferido.tropas, ferido.magos, ferido.cerco], [1010, 5, 2, 1010, 0, 0], 'a força são as tropas (a ferida conta; o HP de cada tropa não pesa); o equipamento soma no ATQ e na DEF; a unidade sem tropas não luta (nem os magos e o cerco dela)');
  eq(G.lado(m, { id: 'y', exe: { pub: true, unid: [{ id: 'u', nome: 'U' }] } }).forca, 0, 'o exército dos jogadores (sem números) não tem força');
  eq([G.numeros(0, 5), G.numeros(5, 0), G.numeros(100, 100), G.numeros(150, 100), G.numeros(200, 100), G.numeros(400, 100), G.numeros(800, 100), G.numeros(100, 200)], [0, 10, 0, 2, 4, 8, 10, 0],
    'os números: +4 a cada vez que dobra o outro (até 10); o menor, nada');
}
{
  eq(bs(A, B, FORTE, 'a', 'ab'), [['magia', 3], ['distancia', 3]], 'Abertura de A: os magos (√9 = 3) e a distância (só A tem arqueiros: +3)');
  eq(bs(B, A, FORTE, 'b', 'ab'), [], 'Abertura de B: nada (sem magos, sem arqueiros)');
  eq(bs(A, B, FORTE, 'a', 'ch'), [['numeros', 2], ['qualidade', -1], ['tipos', -1]], 'Choque de A: números (1200 × 900: +2), ATQ contra DEF (5,3 − 6 → −1), tipos (Cavalaria contra Lanceiros, −2 × 2/3 → −1)');
  eq(bs(B, A, FORTE, 'b', 'ch'), [['qualidade', 2], ['tipos', 2], ['estrutura', 4]], 'Choque de B: ATQ contra DEF (5 − 3,3 → +2), tipos (Lanceiros contra Cavalaria, +3 × 2/3 → +2), as muralhas (DEF 4, A sem cerco)');
  eq(bs(A, B, FORTE, 'a', 'vi'), [['moral', 2], ['comandante', 2]], 'Virada de A: a moral (7 − 5) e o comandante');
  eq(bs(B, A, FORTE, 'b', 'vi'), [['comandante', 1]], 'Virada de B: só o comandante (moral 5 não soma)');
  eq(bs(A, B, FORTE, 'a', 'de'), [['numeros', 2], ['moral', 2]], 'Desfecho de A: números e moral');
  eq(G.total(G.bonus(A, B, FORTE, 'a', 'd100')), 10, 'a resumida de A soma tudo: 2 − 1 − 1 + 2 + 2 + 3 + 3 = 10');
  eq(G.total(G.bonus(B, A, FORTE, 'b', 'd100')), 9, 'a resumida de B: 2 + 2 + 1 + 4 = 9');
  eq(G.total(G.bonus(B, A, { estr: null, mestre: [] }, 'b', 'd100')), 5, 'sem a fortificação, B perde as muralhas');
  // a fortificação: só de quem defende, pelo HP, menos o cerco de quem ataca
  const est = (e, X, Y, q) => (G.bonus(X, Y, { estr: e, mestre: [] }, q, 'ch').find(b => b.k === 'estrutura') || { v: 0 }).v;
  eq([est({ lado: 'b', def: 4, hp: 30, hpMax: 60 }, B, A, 'b'), est({ lado: 'b', def: 4, hp: 0, hpMax: 60 }, B, A, 'b'), est({ lado: 'a', def: 4, hp: 60, hpMax: 60 }, A, B, 'a'), est({ lado: 'a', def: 4, hp: 60, hpMax: 60 }, B, A, 'b'), est({ lado: 'a', def: 1, hp: 60, hpMax: 60 }, A, B, 'a')],
    [2, 0, 2, 0, 0], 'a fortificação: pela metade com metade do HP; em ruínas, nada; quem ataca com 2 máquinas de cerco tira 2; só quem defende ganha; nunca fica negativa');
  // a distância dos dois lados, a fome
  const longe = (d1, d2) => [G.bonus({ ...A, dist: d1 }, { ...B, dist: d2 }, null, 'a', 'ab').find(b => b.k === 'distancia'), G.bonus({ ...B, dist: d2 }, { ...A, dist: d1 }, null, 'b', 'ab').find(b => b.k === 'distancia')].map(b => (b ? b.v : 0));
  eq([longe(400, 100), longe(100, 100), longe(400, 0)], [[6, 0], [0, 0], [3, 0]], 'os dois com arqueiros: os números da força de longe (até 6); só um, +3');
  const comFome = Object.assign({}, A, { fome: 5 });
  eq(['ab', 'ch', 'vi', 'de', 'd100'].map(k => (G.bonus(comFome, B, null, 'a', k).find(b => b.k === 'fome') || { v: 0 }).v), [0, -3, 0, -3, -3], 'sem mantimentos: −1 por dia (até −3), no Choque, no Desfecho e na resumida');
  eq([G.bonus(Object.assign({}, A, { magos: 100 }), B, null, 'a', 'ab').find(b => b.k === 'magia').v, G.bonus(Object.assign({}, A, { atq: 30 }), B, null, 'a', 'ch').find(b => b.k === 'qualidade').v], [6, 6], 'os magos e o ATQ contra DEF param em 6');
}
{ // os bônus do mestre
  const ctx = { estr: null, mestre: [{ lado: 'a', tipo: 'tatica', v: 3, mom: 'ab', txt: 'emboscada' }, { lado: 'b', tipo: 'terreno', v: -2, mom: null, txt: '' }, { lado: 'a', tipo: 'magia', v: 0, mom: null }] };
  const mestre = (X, Y, q, k) => G.bonus(X, Y, ctx, q, k).filter(b => b.k === 'mestre').map(b => [b.nome, b.v]);
  eq([mestre(A, B, 'a', 'ab'), mestre(A, B, 'a', 'ch'), mestre(A, B, 'a', 'd100')], [[['Tática: emboscada', 3]], [], [['Tática: emboscada', 3]]], 'o bônus de um momento vale só nele (e na resumida, que é tudo de uma vez)');
  eq([mestre(B, A, 'b', 'ab'), mestre(B, A, 'b', 'vi'), mestre(A, B, 'a', 'vi')], [[['Terreno', -2]], [['Terreno', -2]], []], 'o bônus da batalha toda vale em todos os momentos, só do lado dele; o zero não entra');
}

/* ================= o motor: as rolagens ================= */
{
  const r = G.resumida(A, B, FORTE, null, [60, 50]);
  eq([r.da, r.db, r.ta, r.tb, r.m, r.tam, r.vence], [60, 50, 110, 95, 15, 1, 'a'], 'a resumida: d100 + 5 × os bônus (60 + 50 contra 50 + 45): margem 15, vitória apertada de A');
  eq([G.resumida(A, B, FORTE, null, [50, 50]).vence, G.resumida(A, B, FORTE, null, [50, 50]).tam], [null, 0], 'margem 5: empate');
  eq([7, 8, 24, 25, 49, 50, 79, 80, -80, -8, 0].map(G.tamanhoD100), [0, 1, 1, 2, 2, 3, 3, 4, 4, 1, 0], 'os tamanhos do d100: < 8 empate; até 24 apertada; até 49 vitória; até 79 clara; 80 esmagadora');
  const r1 = G.resumida(A, B, FORTE, semente(42)), r2 = G.resumida(A, B, FORTE, semente(42));
  ok(j(r1) === j(r2) && r1.da >= 1 && r1.da <= 100, 'os mesmos dados, o mesmo resultado (o sorteio vem de quem chama)');
  eq([G.rolar(20, () => 0), G.rolar(20, () => 0.999999), G.rolar(20, () => 1), G.rolar(100, () => 0.5), G.rolar(6, () => -3)], [1, 20, 20, 51, 1], 'o dado: de 1 a n, nunca fora');
}
{
  const ch = G.momento('ch', A, B, FORTE, null, [10, 10]);
  eq([ch.ta, ch.tb, ch.m, ch.chave], [10, 18, -8, false], 'o Choque: d20 + os bônus dele (10 + 0 contra 10 + 8): B leva por 8, sem momento-chave');
  eq([G.momento('ch', A, B, FORTE, null, [12, 5]).m, G.momento('ch', A, B, FORTE, null, [12, 5]).chave], [-1, true], 'apertado (margem de 2 ou menos): momento-chave');
  eq([G.momento('ab', A, B, FORTE, null, [20, 15]).chave, G.momento('ab', A, B, FORTE, null, [9, 1]).chave, G.momento('ch', A, B, FORTE, null, [19, 2]).chave], [true, true, false], 'saiu 20 ou 1: momento-chave; senão, não');
  eq([G.momento('vi', A, B, FORTE, null, [12, 12]).m, G.momento('vi', A, B, FORTE, null, [12, 12]).chave], [3, false], 'margem 3 já não é momento-chave');
  eq(G.momento('ab', A, B, FORTE, null, [10, 10]).m, 6, 'a Abertura: A com magos e arqueiros, +6');
  const moms = [{ m: 6 }, { m: -8 }, { m: 3 }, { m: 4 }];
  eq(G.fimDetalhada(moms), { placar: 5, tam: 1, vence: 'a', como: 'dados' }, 'o fim da detalhada: o placar soma as margens (5: vitória apertada de A)');
  eq([3, 4, 11, 12, 23, 24, 35, 36, -36].map(G.tamanhoD20), [0, 1, 1, 2, 2, 3, 3, 4, 4], 'os tamanhos do placar: < 4 empate; até 11 apertada; até 23 vitória; até 35 clara; 36 esmagadora');
  eq(G.fimDetalhada([{ m: -12 }]).vence, 'b', 'placar negativo: vence B');
}
{ // parar, e o texto do fim
  eq([G.parar('recuo', 'a'), G.parar('rendicao', 'b'), G.parar('tregua')], [{ vence: 'b', tam: 1, como: 'recuo', por: 'a' }, { vence: 'a', tam: 3, como: 'rendicao', por: 'b' }, { vence: null, tam: 0, como: 'tregua', por: null }],
    'parar: quem recua perde por pouco; quem se rende perde feio; a trégua não tem vencedor');
  eq([G.textoFim({ vence: 'a', tam: 3, como: 'dados' }, 'Aldar', 'Vale'), G.textoFim({ vence: null, tam: 0, como: 'dados' }, 'Aldar', 'Vale'), G.textoFim(G.parar('tregua'), 'Aldar', 'Vale'),
    G.textoFim(G.parar('recuo', 'b'), 'Aldar', 'Vale'), G.textoFim(G.parar('rendicao', 'a'), 'Aldar', 'Vale')],
  ['Vitória clara de Aldar', 'Empate: os dois lados recuam', 'Trégua: ninguém venceu', 'Vale recuou — vitória apertada de Aldar', 'Aldar se rendeu — vitória clara de Vale'], 'o texto de cada fim');
}

/* ================= o depois e o aplicar ================= */
{
  eq([G.perdas({ vence: 'a', tam: 2, como: 'dados' }), G.perdas({ vence: null, tam: 0, como: 'dados' }), G.perdas(G.parar('tregua')), G.perdas(G.parar('recuo', 'b')), G.perdas(G.parar('rendicao', 'a'))],
    [{ b: 0.22, a: 0.07 }, { a: 0.06, b: 0.06 }, { a: 0.03, b: 0.03 }, { b: 0.1, a: 0.03 }, { a: 0.35, b: 0.02 }], 'as perdas: pelo tamanho (quem perde, mais); empate e trégua, pouco; recuo e rendição, pelo jeito de parar');
  eq([G.moralDepois({ vence: 'a', tam: 2, como: 'dados' }, 'a', 7), G.moralDepois({ vence: 'a', tam: 2, como: 'dados' }, 'b', 5), G.moralDepois(G.parar('recuo', 'b'), 'a', 5), G.moralDepois(G.parar('recuo', 'b'), 'b', 5),
    G.moralDepois(G.parar('rendicao', 'a'), 'b', 5), G.moralDepois(G.parar('rendicao', 'a'), 'a', 5), G.moralDepois({ vence: null, tam: 0, como: 'dados' }, 'a', 5), G.moralDepois({ vence: 'b', tam: 4, como: 'dados' }, 'a', 1), G.moralDepois({ vence: 'a', tam: 4, como: 'dados' }, 'a', 10)],
  [8, 3, 5, 4, 6, 2, 5, 0, 10], 'a moral depois: quem vence sobe, quem perde cai (pelo tamanho; recuo −1, rendição −3); sem vencedor, igual; de 0 a 10');
}
{
  const fim = { vence: 'b', tam: 2, como: 'dados' };
  const hexB = (h => h.q + ',' + h.r)(N.hexDe(m, 760, 610));
  const bat = { a: { g: 'ga' }, b: { g: 'gb' }, fim, estr: { m: 'cast', lado: 'b' }, hex: hexB, frente: { f: 'fr', n: 2 }, hexEst: 'd' };
  const antes = j(m), prev = G.depois(m, bat);
  ok(j(m) === antes, 'a prévia não muda o mapa');
  const La = prev.lados.a, Lb = prev.lados.b;
  eq([La.perda, La.unid.map(u => [u.tropas0, u.tropas1, u.hp0, u.hp1, u.fer1, u.acaba]), La.moral0, La.moral1, La.mant0, La.mant1], [0.22, [[800, 624, 800, 624, 0, false], [400, 312, 400, 312, 0, false]], 7, 5, 40, 28],
    'quem perdeu (A): 22% do HP das unidades (1 por tropa: 22% das tropas), a moral cai 2, e um dia de mantimentos (12) vai na batalha');
  eq([Lb.perda, Lb.unid.map(u => [u.tropas1, u.hp1]), Lb.moral1, Lb.mant1], [0.07, [[837, 837]], 6, 3], 'quem venceu (B): perde pouco, a moral sobe');
  eq(prev.estr, { m: 'cast', nome: 'Muralhas', hp0: 60, hp1: 60, hpMax: 60, dano: 0 }, 'a fortificação de quem venceu, contra quem não tem cerco: sem dano');
  eq(prev.hex, { k: hexB, est: 'd', antes: null }, 'o hexágono da batalha fica destruído');
  ok(prev.frente && prev.frente.n === 2 && j(prev.frente.pts1[0]) === j([730, 200]) && j(prev.frente.pts1[prev.frente.pts1.length - 1]) === j([730, 1000]), 'a frente anda, e as pontas ficam');
  const xs = prev.frente.pts1.map(p => p[0]), xMin = Math.min(...xs);
  ok(xMin < 730 - 40 && xMin >= 730 - 80 - 0.01 && Math.max(...xs) <= 730, 'a frente anda para o lado de quem perdeu (A, à esquerda), mais de um hexágono e no máximo dois, perto da batalha (' + xMin + ')');
  ok(prev.frente.pts1.filter(p => Math.abs(p[1] - 610) > 4 * 40 + 20).every(p => p[0] === 730), 'longe da batalha (mais de 4 hexágonos), a linha não muda');
  // a fortificação com cerco: quem ataca e vence bate mais
  const mC = N.normalizarMapa(Object.assign({}, m, { objs: m.objs.map(o => (o.id === 'ga' ? Object.assign({}, o, { exe: Object.assign({}, o.exe, { unid: o.exe.unid.map(u => Object.assign({}, u, { cerco: u.id === 'u1' ? 3 : 0 })) }) }) : o)) }));
  const dano = f => G.depois(mC, Object.assign({}, bat, { fim: f, frente: null })).estr;
  eq([dano({ vence: 'a', tam: 2, como: 'dados' }).dano, dano({ vence: 'a', tam: 2, como: 'dados' }).hp1, dano({ vence: 'b', tam: 1, como: 'dados' }).dano, dano({ vence: 'a', tam: 4, como: 'dados' }).hp1], [10, 50, 3, 44],
    'o cerco de quem ataca: vencendo, 2 × as máquinas + o tamanho (3 × 2 + 4 = 10); perdendo, só as máquinas (3)');
  // (lote 12, parte 12c) o HP de cada tropa: a perda sai da soma, as tropas morrem uma a uma (a ferida fica)
  const mU = N.normalizarMapa(Object.assign({}, m, { objs: m.objs.map(o => (o.id === 'ga' ? Object.assign({}, o, { exe: Object.assign({}, o.exe, { unid: o.exe.unid.concat([{ id: 'u5', nome: 'Ogros', tropas: 50, hpT: 10, fer: 3 }, { id: 'u6', nome: 'Um', tropas: 1, hpT: 10, fer: 9 }]) }) }) : o)) }));
  const pU = G.depois(mU, Object.assign({}, bat, { frente: null }));
  eq([pU.lados.a.unid.find(u => u.id === 'u5'), pU.lados.a.unid.find(u => u.id === 'u6')],
    [{ id: 'u5', nome: 'Ogros', tropas0: 50, tropas1: 39, hp0: 497, hp1: 388, fer1: 2, acaba: false }, { id: 'u6', nome: 'Um', tropas0: 1, tropas1: 1, hp0: 1, hp1: 1, fer1: 9, acaba: false }],
    'as unidades de 10 de HP por tropa: 22% de 497 (388: 39 tropas, uma ferida com 8 de 10); a de 1 de HP fica (o arredondado)');
  const dU = N.copia(mU), pX = JSON.parse(j(pU));
  pX.lados.a.unid.find(u => u.id === 'u6').acaba = true;
  G.aplicar(dU, pX, null);
  eq([achar(dU, 'ga').exe.unid.map(u => u.id), (u => [u.tropas, u.fer])(achar(dU, 'ga').exe.unid.find(u => u.id === 'u5'))], [['u1', 'u2', 'u5'], [39, 2]], 'ao aplicar: as tropas e a ferida; a unidade que acabou sai do exército');
  // o aplicar
  const d = N.copia(m), reg = { id: 'bt_1', d: 0, nome: 'Hoste de Aldar × Legião do Vale', a: { nome: 'Hoste de Aldar', g: 'ga', fac: 'fa' }, b: { nome: 'Legião do Vale', g: 'gb', fac: 'fb' }, modo: 'd100', mom: [{ k: 'ch', da: 40, db: 70, ta: 90, tb: 115 }], fim, notas: ['A cavalaria atolou.'], hex: hexB };
  G.aplicar(d, prev, reg);
  const dn = N.normalizarMapa(d);
  eq([achar(dn, 'ga').exe.unid.map(u => [u.tropas, u.fer]), achar(dn, 'ga').exe.moral, achar(dn, 'ga').exe.mant, achar(dn, 'gb').exe.unid[0].tropas, achar(dn, 'gb').exe.moral], [[[624, 0], [312, 0]], 5, 28, 837, 6], 'aplicar: as tropas, a ferida, a moral e os mantimentos de cada lado');
  eq([dn.guerra.hexes[hexB], dn.guerra.bats.length, dn.guerra.bats[0].notas, dn.guerra.bats[0].hex], ['d', 1, ['A cavalaria atolou.'], hexB], 'o hexágono marcado e a batalha no histórico (com as notas e o hexágono)');
  eq([achar(dn, 'fr').pts, achar(dn, 'fr').fases.length, achar(dn, 'fr').fases[0].dia], [[[730, 200], [730, 1000]], 1, 0], 'a frente ganha a fase de hoje (a linha de antes continua valendo nos dias de antes)');
  G.aplicar(d, prev, Object.assign({}, reg, { id: 'bt_2' }));
  eq([achar(d, 'fr').fases.length, N.normalizarMapa(d).guerra.bats.length], [1, 2], 'outra batalha no mesmo dia troca a fase de hoje (não duplica)');
  const cheio = N.copia(m); cheio.guerra.bats = Array.from({ length: N.LIMITES.batalhas }, (_, i) => Object.assign({}, reg, { id: 'b' + i }));
  G.aplicar(cheio, prev, Object.assign({}, reg, { id: 'nova' }));
  eq([cheio.guerra.bats.length, cheio.guerra.bats[0].id, cheio.guerra.bats[cheio.guerra.bats.length - 1].id], [N.LIMITES.batalhas, 'b1', 'nova'], 'o histórico cheio: a mais velha sai');
  const semGuerra = N.copia(m); delete semGuerra.guerra;
  G.aplicar(semGuerra, { lados: {}, estr: null, frente: null, hex: { k: '1,1', est: 'c' } }, null);
  eq(semGuerra.guerra, { tipos: [], bats: [], hexes: { '1,1': 'c' } }, 'no mapa sem guerra, o aplicar cria a guerra');
  // a frente sem vencedor (ou sem passos) não anda
  eq([G.depois(m, Object.assign({}, bat, { fim: { vence: null, tam: 0, como: 'dados' } })).frente, G.depois(m, Object.assign({}, bat, { frente: { f: 'fr', n: 0 } })).frente], [null, null], 'sem vencedor ou com 0 hexágonos, a frente fica');
}
{ // a frente que anda: a conta
  const pts = [[0, 0], [0, 400]];
  const esq = G.frenteAnda(pts, 0, 200, -50, 200, 2, 40), dir = G.frenteAnda(pts, 0, 200, 50, 200, 2, 40);
  eq([Math.min(...esq.map(p => p[0])), Math.max(...esq.map(p => p[0])), Math.max(...dir.map(p => p[0]))], [-80, 0, 80], 'no ponto da batalha, a linha anda n × o hexágono (2 × 40), para o lado de quem perdeu');
  ok(esq.filter(p => p[1] <= 40 || p[1] >= 360).every(p => p[0] === 0), 'a 4 hexágonos da batalha, nada anda');
  ok(esq.length < 40 && esq.every(p => Number.isFinite(p[0]) && Math.round(p[0] * 100) === p[0] * 100), 'a linha nova é enxuta (poucos pontos) e arredondada');
  ok(G.frenteAnda(pts, 0, 200, -50, 200, 0, 40) === pts && G.frenteAnda([[0, 0]], 0, 0, 1, 1, 2, 40).length === 1, 'zero hexágonos (ou linha sem trecho): a mesma linha');
}

/* ================= os mantimentos do dia ================= */
{
  const um = G.mantimentosDoDia(m, 1);
  eq(um.map(p => [p.g, p.cons, p.mant0, p.mant1, p.fome1, p.moral1, p.dura]), [['ga', 12, 40, 28, 0, 7, 2], ['gb', 9, 12, 3, 0, 5, 0]], 'um dia: cada exército come pelo tamanho (1200 → 12; 900 → 9)');
  eq(G.mantimentosDoDia(m, 3)[0], { g: 'ga', nome: 'Hoste de Aldar', cons: 12, mant0: 40, mant1: 4, fome0: 0, fome1: 0, moral0: 7, moral1: 7, dura: 0 }, 'três dias: 36 comidos, sobra 4');
  eq(G.mantimentosDoDia(m, 4)[0].fome1 + '/' + G.mantimentosDoDia(m, 4)[0].moral1 + '/' + G.mantimentosDoDia(m, 4)[0].mant1, '1/6/0', 'quatro dias: acabou no quarto — um dia sem comer, a moral cai 1');
  eq(G.mantimentosDoDia(m, 2)[1], { g: 'gb', nome: 'Legião do Vale', cons: 9, mant0: 12, mant1: 0, fome0: 0, fome1: 1, moral0: 5, moral1: 4, dura: 0 }, 'B, dois dias: deu para um');
  const mF = N.normalizarMapa(Object.assign({}, m, { objs: m.objs.map(o => (o.id === 'ga' ? Object.assign({}, o, { exe: Object.assign({}, o.exe, { mant: 0, fome: 2, cons: 5 }) })
    : o.id === 'gb' ? Object.assign({}, o, { exe: Object.assign({}, o.exe, { cons: 4, unid: o.exe.unid.map(u => Object.assign({}, u, { tropas: 0 })) }) }) : o)).concat([{ k: 'g', id: 'gc', x: 1, y: 1, tipo: 'caravana' }]) }));
  eq(G.mantimentosDoDia(mF, 1).map(p => [p.g, p.cons, p.fome1, p.moral1]), [['ga', 5, 3, 6]], 'já sem mantimentos: mais um dia de fome, a moral cai; o consumo escolhido vale; o exército sem tropas (mesmo com consumo escolhido) e a caravana não comem');
}

/* ================= os exércitos que se encontram ================= */
{
  const em = (q, r) => N.centroHex(m, q, r);
  const g = (id, fac, q, r) => Object.assign({ k: 'g', id, nome: id, tipo: 'exercito', fac, exe: { unid: [{ tropas: 10 }] } }, em(q, r));
  const mE = N.normalizarMapa(Object.assign({}, m, { objs: [g('ga', 'fa', 0, 0), g('gb', 'fb', 1, 0), g('gc', 'fa', 1, -1), g('gd', null, 5, 5), g('ge', 'fb', 10, 0), g('gg', 'fb', -2, 0), { k: 'g', id: 'gx', x: em(0, 1).x, y: em(0, 1).y, tipo: 'caravana' }] }));
  eq(G.confrontos(mE), [['ga', 'gb'], ['gb', 'gc']], 'a 1 hexágono, de facções diferentes: encontram-se (a 2 hexágonos não; a mesma facção não; o grupo que não é exército não)');
  eq(G.confrontos(mE, { ga: ['8,0', '9,0'] }), [['ga', 'ge'], ['gb', 'gc']], 'pelo caminho do dia (os hexágonos por onde passou): A passou perto de E');
  eq(G.confrontos(N.normalizarMapa(Object.assign({}, mE, { objs: mE.objs.concat([g('gf', null, 5, 6)]) }))).filter(p => p.includes('gf')), [['gd', 'gf']], 'sem facção, encontra qualquer um');
  eq(G.confrontos(N.normalizarMapa(Object.assign({}, mE, { grade: null }))), [], 'sem grade, não há encontro');
}

console.log(bad ? `${n - bad} verificações passaram, ${bad} falharam` : `${n} verificações passaram`);
process.exit(bad ? 1 : 0);
