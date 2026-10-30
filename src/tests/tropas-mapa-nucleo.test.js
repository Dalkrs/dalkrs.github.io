// As tropas no Mapa-múndi (lote 41), a lógica pura: a mesma tropa na ficha e no exército (tc/tropas.js — o que é comum,
// a ficha como o exército está, o exército como a ficha está, a batalha no diário, o comandante pela ficha) e, no
// Mapa-múndi (mundo/nucleo.js, mundo/guerra.js), a veterania da unidade, a média na projeção e o bônus nas batalhas.
const { checker } = require('./lib');
const { ok, end } = checker();
const T = require('../../tc/tropas.js');
const N = require('../../mundo/nucleo.js');
const G = require('../../mundo/guerra.js');
const j = JSON.stringify;

const cfg = { tropas: { equip: [{ id: 'eq_lanca', nome: 'Lança longa', atq: 2, def: 0 }, { id: 'eq_torre', nome: 'Escudo de torre', atq: 0, def: 3 }], supr: [], vet: { 2: 1, 3: 2 }, cmd: { atr: 'EMB', div: 3 } } };
const ficha = T.norm({ nome: 'Guarda de Selene', moral: 6, mant: 40, cons: null, diario: [],
  unid: [{ id: 'un_a', nome: 'Lanças de Merunê', raca: 'ar_h', racaN: 'Humano', classe: 'cl_g', classeN: 'Guerreiro', bras: { forma: 'redondo', div: 'liso', cores: ['#24305e', '#d9a441'], simb: 'torre' }, equip: ['eq_lanca', 'eq_torre'], supr: ['sp_racoes'], info: 'Do vale.',
    tropas: 250, cheio: 300, hpT: 10, fer: 3, atq: 3, def: 2, vet: 3, bat: 2, baixas: 41, magos: 0, cura: 5, suprQ: { sp_racoes: 10 } },
  { id: 'un_b', nome: 'Arqueiros', tropas: 100, cheio: 100, hpT: 5, atq: 2, def: 1, vet: 1, equip: [] }] });
const grupo = { id: 'g_sel', k: 'g', tipo: 'exercito', nome: 'Exército de Selene', x: 10, y: 10,
  exe: { cmd: { nome: '', b: 1, ficha: 'pc_s', auto: true }, moral: 5, mant: 12, cons: null, fome: 2, tropa: 'pc_s',
    unid: [{ id: 'un_a', nome: 'Lanças', tipo: 'tp_lanca', tropas: 200, hpT: 10, fer: 0, atq: 3, def: 2, magos: 0, cura: 5, maq: { ariete: 1 }, equip: [{ nome: 'Lança longa', atq: 2, def: 0 }], oc: true, vet: 3 },
      { id: 'un_c', nome: 'Cavaleiros', tipo: null, tropas: 50, hpT: 20, fer: 0, atq: 4, def: 3, magos: 0, cura: 0, maq: {}, equip: [{ nome: 'Escudo de torre', atq: 0, def: 3 }, { nome: 'Machado', atq: 1, def: 0 }], vet: 2 }] } };

// ---- o que é comum
const cf = T.comumDaTropa(ficha, cfg), cm = T.comumDoExe(grupo);
ok(cf.nome === 'Guarda de Selene' && cf.unid.length === 2 && j(cf.unid[0].equip) === j([{ nome: 'Lança longa', atq: 2, def: 0 }, { nome: 'Escudo de torre', atq: 0, def: 3 }]) && cf.unid[0].vet === 3 && !('raca' in cf.unid[0]) && !('cheio' in cf.unid[0]),
  'o comum da ficha: o nome, os números e os equipamentos da lista como os do mapa — sem a raça, o brasão, o efetivo: ' + j(cf.unid[0]));
ok(cm.nome === 'Exército de Selene' && cm.mant === 12 && cm.unid[0].tipo === 'tp_lanca' && j(cm.unid[0].maq) === j({ ariete: 1 }) && cm.unid[1].vet === 2 && !('oc' in cm.unid[0]) && !('fome' in cm),
  'o comum do exército: o tipo, as máquinas, a veterania — sem a unidade escondida nem a fome (são só do mapa)');
ok(!T.mesmaTropa(ficha, grupo, cfg), 'a ficha e o exército, diferentes');

// ---- o mapa mudou: a ficha recebe
const lig = T.normLig({ mapa: 'mp_1', mn: 'Vale de Merunê', g: 'g_sel', nome: 'Exército de Selene', cmd: 'pc_s', auto: true });
const f2 = T.tropaComExe(ficha, grupo, lig, cfg), a2 = f2.unid.find(u => u.id === 'un_a'), c2 = f2.unid.find(u => u.id === 'un_c');
ok(f2.nome === 'Exército de Selene' && f2.mant === 12 && f2.unid.length === 2 && !f2.unid.some(u => u.id === 'un_b'), 'a ficha como o exército: o nome, os mantimentos, as unidades do mapa (a que saiu de lá sai daqui)');
ok(a2.tropas === 200 && a2.cheio === 300 && a2.nome === 'Lanças' && a2.raca === 'ar_h' && a2.classeN === 'Guerreiro' && a2.bras.forma === 'redondo' && j(a2.equip) === j(['eq_lanca', 'eq_torre']) && a2.bat === 2 && a2.baixas === 41 && j(a2.suprQ) === j({ sp_racoes: 10 }) && a2.tipo === 'tp_lanca',
  'a unidade que já existia: os números do mapa, e fica com o que é só da ficha (a raça, o brasão, os equipamentos escolhidos, o efetivo, as batalhas): ' + j({ t: a2.tropas, ch: a2.cheio, eq: a2.equip }));
ok(c2.cheio === 50 && c2.vet === 2 && j(c2.equip) === j(['eq_torre']) && c2.raca === null && !!c2.bras, 'a unidade nova (do mapa): o efetivo cheio, os equipamentos da lista que têm o nome dos dela (o Machado não está na lista)');
ok(j(f2.lig) === j({ mapa: 'mp_1', g: 'g_sel', nome: 'Exército de Selene', mn: 'Vale de Merunê', cmd: 'pc_s', auto: true }) && j(T.parteMestre(f2)).includes('"lig"'), 'a ligação fica na ficha (na parte do mestre: o jogador não muda)');
ok(T.mesmaTropa(f2, Object.assign({}, grupo, { exe: Object.assign({}, grupo.exe, { unid: grupo.exe.unid.map((u, i) => Object.assign({}, u, { equip: i === 1 ? [{ nome: 'Escudo de torre', atq: 0, def: 3 }] : [{ nome: 'Lança longa', atq: 2, def: 0 }, { nome: 'Escudo de torre', atq: 0, def: 3 }] })) }) }), cfg),
  'depois: a mesma tropa (com os equipamentos da ficha no mapa)');

// ---- a ficha mudou: o exército recebe
const fJ = T.comEscolhas(f2, 'un_a', { nome: 'Lanças de Merunê', equip: ['eq_lanca'] });
fJ.moral = 8;
const g3 = T.exeComTropa(grupo, fJ, cfg), ua = g3.exe.unid.find(u => u.id === 'un_a');
ok(g3.nome === 'Exército de Selene' && g3.exe.moral === 8 && g3.exe.fome === 2 && g3.exe.tropa === 'pc_s' && g3.exe.cmd.auto === true && ua.nome === 'Lanças de Merunê' && j(ua.equip) === j([{ nome: 'Lança longa', atq: 2, def: 0 }]) && ua.oc === true && j(ua.maq) === j({ ariete: 1 }),
  'o exército como a ficha: o nome escolhido, os equipamentos da ficha, a moral — e fica com o que é só do mapa (a fome, a unidade escondida, o comandante)');
const TIPOS = { tipos: [{ id: 'tp_lanca', nome: 'Lanceiros', dist: false, vant: {} }], bats: [], hexes: {} };
const g3n = N.normalizarMapa({ id: 'mp_1', guerra: TIPOS, objs: [g3] }).objs[0];
ok(T.mesmaTropa(fJ, g3n, cfg), 'depois de normalizar no mapa, a mesma tropa (nada a mandar de volta)');
ok(g3n.exe.tropa === 'pc_s' && g3n.exe.cmd.auto === true && g3n.exe.unid[0].vet === 3 && !('vet' in N.normalizarMapa({ id: 'x', objs: [Object.assign({}, g3, { exe: Object.assign({}, g3.exe, { unid: [Object.assign({}, g3.exe.unid[0], { vet: 1 })] }) })] }).objs[0].exe.unid[0]),
  'o mapa guarda a ligação, a marca do comandante e a veterania (a Recruta, sem guardar)');
ok(!('auto' in N.normalizarMapa({ id: 'x', objs: [Object.assign({}, g3, { exe: Object.assign({}, g3.exe, { cmd: { nome: '', b: 0, ficha: null, auto: true } }) })] }).objs[0].exe.cmd), 'sem a ficha do comandante, sem a marca');

// ---- a veterania no Mapa-múndi
ok(N.vetMediaDe(grupo.exe) === 2.5 && N.vetMediaDe(grupo.exe, true) === 2 && N.vetMediaDe({ unid: [{ tropas: 10 }, { tropas: 5 }] }) === null && N.vetMediaDe({ tropa: 'pc', unid: [{ tropas: 10 }] }) === 1 && N.vetMediaDe({ pub: true, vet: 2.1 }) === 2.1,
  'a veterania média: das unidades com soldados (sem as escondidas, para os jogadores); só na tropa de uma ficha ou com alguma unidade que subiu');
const mapa = N.normalizarMapa({ id: 'mp_1', nome: 'Vale', guerra: TIPOS, objs: [grupo] });
const pub = N.projetar(mapa, {}).objs.find(o => o.id === 'g_sel');
ok(pub.exe.pub === true && pub.exe.vet === 2 && pub.exe.unid.length === 1 && !('tropa' in pub.exe) && !JSON.stringify(pub.exe).includes('tropas'), 'na projeção: a média pronta (2,0, sem a unidade escondida), sem a ligação e sem os números: ' + j(pub.exe));
ok(N.normalizarMapa({ id: 'x', objs: [Object.assign({}, pub, { exe: Object.assign({}, pub.exe, { vet: 9 }) })] }).objs[0].exe.vet === undefined, 'a média fora de 1 a 3 não vale');

// ---- o bônus nas batalhas
G.usarVeterania(null);
const L0 = G.lado(mapa, mapa.objs[0]);
G.usarVeterania({ 2: 3, 3: 5 });
const L1 = G.lado(mapa, mapa.objs[0]);
ok(Math.abs(L0.atq - (200 * (3 + 2 + 2) + 50 * (4 + 1 + 1)) / 250) < 1e-9 && Math.abs(L1.atq - (200 * (3 + 2 + 5) + 50 * (4 + 1 + 3)) / 250) < 1e-9 && Math.abs(L1.def - (200 * (2 + 0 + 5) + 50 * (3 + 3 + 3)) / 250) < 1e-9,
  'a veterania soma no ATQ e na DEF de cada unidade (o bônus das tabelas base das Fichas: Veterana e Elite): ' + j([L0.atq, L1.atq, L1.def]));
G.usarVeterania(null);
const B = G.lado(mapa, null);
const bs = G.bonus(L0, B, { cmd: { a: 4 } }, 'a', 'vi'), bs2 = G.bonus(L0, B, {}, 'a', 'vi');
ok(bs.some(b => b.k === 'comandante' && b.v === 4) && bs2.some(b => b.k === 'comandante' && b.v === 1), 'o comandante pela ficha (o que quem chama calculou) vale no lugar do escrito: ' + j([bs, bs2]));

// ---- o comandante e a batalha no diário
ok(T.bonusDeComando(8, { atr: 'EMB', div: 3 }) === 2 && T.bonusDeComando(80, { atr: 'EMB', div: 1 }) === 20 && T.bonusDeComando(8, { atr: '', div: 3 }) === null && T.peloAtr('EMB') === 'pelo Embate' && T.peloAtr('FOR') === 'pela Força',
  'o bônus de comando: o atributo ÷ o divisor, para baixo, até 20; sem atributo, sem conta');
ok(j(T.normCfg(null).cmd) === j({ atr: 'EMB', div: 3 }) && j(T.normCfg({ tropas: { cmd: { atr: '', div: 99 } } }).cmd) === j({ atr: '', div: 10 }) && T.normCfg({ tropas: { cmd: { atr: 'XX' } } }).cmd.atr === 'EMB',
  'nas tabelas base: o Embate ÷ 3 de começo; "nenhum" vale; o divisor até 10');
const fb = T.comBatalhaDoMapa(f2, { id: 'dr_bt.1:a', t: 'Exército de Selene × Hoste', r: 'v', lutaram: ['un_a', 'un_c'], perdas: { un_a: 30, un_x: 7 }, acabaram: ['Batedores'] }, '2026-10-29T12:00:00.000Z', '3 de Brumas, ano 412');
const e0 = fb.diario[0], fa = fb.unid.find(u => u.id === 'un_a'), fc = fb.unid.find(u => u.id === 'un_c');
ok(e0.id === 'dr_bt_1_a' && e0.k === 'bat' && e0.r === 'v' && e0.b === 30 && /Lanças −30/.test(e0.x) && /Batedores foi destruída/.test(e0.x) && e0.dj === '3 de Brumas, ano 412' && fa.bat === 3 && fa.baixas === 71 && fc.bat === 1 && fc.baixas === 0,
  'a batalha do mapa no diário: o resultado deste lado, as baixas, a unidade destruída; cada unidade que lutou ganha a batalha: ' + j(e0));
const fb2 = T.comBatalhaDoMapa(fb, { id: 'dr_bt.1:a', t: 'de novo', r: 'd', lutaram: [], perdas: {} });
ok(fb2.diario.filter(e => e.id === 'dr_bt_1_a').length === 1 && fb2.diario[0].t === 'de novo', 'a mesma batalha (o mesmo id) não entra duas vezes no diário');
end();
