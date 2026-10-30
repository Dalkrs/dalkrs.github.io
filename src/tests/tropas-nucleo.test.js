// As tropas das fichas (lote 40), a lógica pura (tc/tropas.js): normalizar a tropa e as unidades, as listas do mestre
// (os equipamentos, os suprimentos, o bônus da veterania), a parte do mestre (a conta que o banco também faz), as
// escolhas do jogador (que não mexem no resto), as contas (o HP, o ATQ e a DEF com os equipamentos e a veterania, a
// veterania média, os dias de mantimento), a batalha registrada e o diário.
const { checker } = require('./lib');
const { ok, end } = checker();
const T = require('../../tc/tropas.js');
const j = JSON.stringify;

// ---- normalizar
ok(T.norm(null) === null && T.norm([]) === null && T.norm('x') === null, 'sem tropa: null');
const d0 = T.norm({ nome: '  Guarda\nde Selene  ', moral: 14, mant: -3, cons: '', unid: [{ id: 'u1', tropas: 250.4, cheio: 100, hpT: 0, fer: 9, atq: 140, def: -2, vet: 7, equip: ['eq_lanca', 'eq_lanca', 'a b', 'eq_torre'], supr: ['sp_racoes'], suprQ: { sp_racoes: 10.6, sp_agua: 0, 'x y': 3 }, nome: '', info: 'linha 1\r\nlinha 2\u0007' }, { id: 'u1', nome: 'Gêmea' }, 'lixo'] });
const u1 = d0.unid[0];
ok(d0.nome === 'Guarda de Selene' && d0.moral === 10 && d0.mant === 0 && d0.cons === null && d0.unid.length === 3, 'a tropa: o nome numa linha, a moral até 10, os mantimentos sem negativo, o consumo vazio fica pelo tamanho');
ok(u1.tropas === 250 && u1.cheio === 250 && u1.hpT === 1 && u1.fer === 0 && u1.atq === 99 && u1.def === -2 && u1.vet === 3, 'a unidade: o efetivo completo nunca abaixo das tropas, o HP de cada soldado de 1 para cima, o ferido menos que um soldado, o ATQ até 99, a veterania de 1 a 3: ' + j(u1));
ok(j(u1.equip) === j(['eq_lanca', 'eq_torre']) && j(u1.suprQ) === j({ sp_racoes: 11 }) && u1.nome === 'Unidade 1' && u1.info === 'linha 1\nlinha 2' && !!u1.bras && u1.bras.forma === 'escudo',
  'os equipamentos sem repetir, as quantidades sem os zeros, o nome de começo, as informações com as quebras de linha, um brasão de começo');
ok(d0.unid[1].id !== 'u1' && d0.unid[1].nome === 'Gêmea' && d0.unid[2].nome === 'Unidade 3', 'o id repetido ganha outro; o que não é unidade vira uma unidade de começo');
ok(T.norm({ unid: [{ id: 'x', tipo: 'tp_lanceiros', maq: { ariete: 2, z: 0 } }] }).unid[0].tipo === 'tp_lanceiros' && j(T.norm({ unid: [{ id: 'x', maq: { ariete: 2, z: 0 } }] }).unid[0].maq) === j({ ariete: 2 }),
  'o tipo de tropa e as máquinas do Mapa-múndi ficam como vieram (para a ligação do próximo lote)');
const b = T.normBras({ forma: 'losango', div: 'faixa', cores: ['#ABCDEF', 'vermelho'], simb: 'lua', img: 'https://x/y.png' });
ok(b.forma === 'losango' && b.div === 'faixa' && b.cores[0] === '#abcdef' && /^#[0-9a-f]{6}$/.test(b.cores[1]) && b.simb === 'lua' && !('img' in b) && T.normBras({ simb: 'nao-existe' }).simb === null,
  'o brasão: o do montador do clã (a forma, a divisão, duas cores, o símbolo), sem imagem: ' + j(b));

// ---- as listas do mestre
const cf0 = T.normCfg(null);
ok(cf0.equip.length === 6 && cf0.supr.length === 6 && cf0.vet[2] === 1 && cf0.vet[3] === 2 && cf0.maxEquip === 2, 'sem as listas do mestre, as de começo (seis equipamentos, seis suprimentos; Veterana +1, Elite +2; dois equipamentos por unidade)');
const cf1 = T.normCfg({ tropas: { equip: [{ id: 'e1', nome: 'Machado', atq: 3, def: -1 }, { id: 'e1', nome: 'dup' }, { id: 'e 2' }], supr: [], vet: { 2: 4, 3: 99 }, maxEquip: 9 } });
ok(cf1.equip.length === 1 && cf1.equip[0].def === -1 && cf1.supr.length === 0 && cf1.vet[2] === 4 && cf1.vet[3] === 10 && cf1.maxEquip === 6, 'as listas do mestre: sem repetir os ids; uma lista vazia é vazia mesmo; os bônus até 10; até seis equipamentos por unidade');

// ---- a parte do mestre e as escolhas do jogador
const cru = { v: 1, nome: 'Guarda', bras: T.brasNovo(0), info: '', moral: 6, mant: 40, cons: null, diario: [],
  unid: [{ id: 'a', nome: 'Lanças', raca: null, racaN: '', classe: null, classeN: '', bras: T.brasNovo(1), equip: [], supr: [], info: '', tropas: 250, cheio: 300, hpT: 10, fer: 0, atq: 3, def: 2, vet: 3, bat: 3, baixas: 41, magos: 0, cura: 0, suprQ: { sp_racoes: 10 } },
    { id: 'b', nome: 'Arqueiros', tropas: 180, cheio: 180, hpT: 5, fer: 0, atq: 2, def: 1, vet: 2, bat: 0, baixas: 0, magos: 0, cura: 0, suprQ: {}, equip: ['eq_arco'], supr: [] }] };
const pm = T.parteMestre(cru);
ok(!('nome' in pm) && !('bras' in pm) && pm.moral === 6 && pm.unid.length === 2 && !('nome' in pm.unid[0]) && !('equip' in pm.unid[0]) && pm.unid[0].tropas === 250 && j(pm.unid[0].suprQ) === j({ sp_racoes: 10 }),
  'a parte do mestre: a tropa sem as escolhas do jogador (o nome, o brasão, os equipamentos…), com os números');
const esc = T.comEscolhas(cru, 'a', { nome: '  Lanças de Merunê ', raca: 'ar_humano', racaN: 'Humano', classe: 'x y', classeN: 'Guerreiro', equip: ['eq_lanca', 'eq_torre'], supr: ['sp_racoes', 'sp_ataduras'], info: 'Juraram a Selene.', bras: { forma: 'redondo', div: 'liso', cores: ['#24305e', '#d9a441'], simb: 'espada' } });
ok(j(T.parteMestre(esc)) === j(pm), 'as escolhas do jogador não mexem na parte do mestre (o banco confere a mesma conta)');
ok(esc.unid[0].nome === 'Lanças de Merunê' && esc.unid[0].raca === 'ar_humano' && esc.unid[0].classe === null && esc.unid[0].classeN === 'Guerreiro' && j(esc.unid[0].equip) === j(['eq_lanca', 'eq_torre']) && esc.unid[0].bras.forma === 'redondo' && esc.unid[1].nome === 'Arqueiros',
  'as escolhas de uma unidade: o nome, a raça (das árvores), a classe (o nome, sem árvore), os equipamentos, os suprimentos, o brasão — as outras unidades como estavam');
ok(cru.unid[0].nome === 'Lanças', 'a tropa crua de antes fica como estava (as escolhas vêm numa cópia)');
const escT = T.comEscolhas(cru, null, { nome: '', info: 'x', bras: { forma: 'estandarte' }, moral: 0, unid: [] });
ok(escT.nome === 'Tropa' && escT.info === 'x' && escT.bras.forma === 'estandarte' && escT.moral === 6 && escT.unid.length === 2 && j(T.parteMestre(escT)) === j(pm), 'as escolhas da tropa: o nome, o brasão, as informações — e só elas (a moral e as unidades não vêm)');
ok(T.comEscolhas(cru, 'nao', { nome: 'x' }) === null, 'a unidade que não existe: nada');
const volta = T.comEscolhas(esc, 'a', T.escolhasDaUnid(cru.unid[0]));
ok(volta.unid[0].nome === 'Lanças' && volta.unid[0].raca === null && j(volta.unid[0].equip) === j([]), 'desfazer as escolhas: as de antes voltam');

// ---- as contas
const cfg = { tropas: { equip: [{ id: 'eq_lanca', nome: 'Lança longa', atq: 2, def: 0 }, { id: 'eq_torre', nome: 'Escudo de torre', atq: 0, def: 3 }], supr: [{ id: 'sp_racoes', nome: 'Rações', desc: '' }], vet: { 2: 1, 3: 2 } } };
const c = T.calc(esc, cfg), ka = c.cartas[0], kb = c.cartas[1];
ok(ka.atq === 3 + 2 + 2 && ka.def === 2 + 3 + 2 && ka.eqAtq === 2 && ka.eqDef === 3 && ka.vb === 2 && ka.hp === 2500 && ka.hpCheio === 3000 && ka.desfalque === true,
  'a unidade: o ATQ e a DEF com os equipamentos e a veterania (Elite +2); o HP das tropas e o do efetivo completo: ' + j({ atq: ka.atq, def: ka.def, hp: ka.hp, cheio: ka.hpCheio }));
ok(ka.sps.length === 1 && ka.sps[0].q === 10 && kb.eqs.length === 0 && kb.atq === 2 + 1 && kb.vb === 1, 'os suprimentos com a quantidade do mestre; o equipamento que saiu da lista não conta; a Veterana +1');
ok(c.tropas === 430 && c.unidades === 2 && c.vetMedia === 2.5 && c.vetN === 3 && c.vetNome === 'Elite' && T.fmtMedia(c.vetMedia) === '2,5' && c.consumo === 5 && c.dias === 8,
  'a tropa: 430 soldados em 2 unidades; a veterania média 2,5 (Elite); o consumo pelo tamanho (5 por dia) e 8 dias de mantimentos: ' + j({ t: c.tropas, m: c.vetMedia, cons: c.consumo, dias: c.dias }));
const c2 = T.calc(Object.assign({}, esc, { cons: 20, unid: esc.unid.concat([{ id: 'z', tropas: 0, vet: 1 }]) }), cfg);
ok(c2.vetMedia === 2.5 && c2.unidades === 2 && c2.consumo === 20 && c2.dias === 2, 'a unidade sem soldados não entra na média; o consumo escrito vale');
ok(T.calc({ unid: [{ id: 'a', tropas: 0, vet: 1 }] }, cfg).dias === null && T.calc({ unid: [] }).vetMedia === null && T.vetDaMedia(1.4) === 1 && T.vetDaMedia(1.5) === 2 && T.vetDaMedia(2.49) === 2,
  'sem soldados, sem conta de mantimentos; sem unidades, sem média; os cortes da média (1,5 e 2,5)');
const bib = { arvores: [{ id: 'ar_humano', nome: 'Humano', categoria: 'raca' }, { id: 'ar_elfo', nome: 'Elfo', categoria: 'raca' }, { id: 'cl_g', nome: 'Guerreiro', categoria: 'classe' }] };
ok(T.racaDe(esc.unid[0], bib) === 'Humano' && T.classeDe(esc.unid[0], bib) === 'Guerreiro' && T.racaDe({ raca: 'sumiu', racaN: 'Anão' }, bib) === 'Anão' && j(T.arvoresDe(bib, 'raca').map(a => a.nome)) === j(['Elfo', 'Humano']),
  'a raça e a classe pelas árvores da mesa (ou pelo nome guardado); as árvores de cada categoria, por nome');

// ---- a batalha e o diário
const bt = T.registrarBatalha(esc, { t: 'Cerco de Ostra', r: 'v', baixas: { a: 41, b: 999, z: 5 }, moral: 8 }, '2026-10-29T12:00:00.000Z', '3º de Brumas, 412');
ok(bt.unid[0].tropas === 209 && bt.unid[0].baixas === 82 && bt.unid[0].bat === 4 && bt.unid[1].tropas === 0 && bt.unid[1].baixas === 180 && bt.unid[1].bat === 1 && bt.moral === 8,
  'a batalha: as baixas saem das tropas (sem passar de zero), cada unidade com soldados ganha uma batalha, a moral de depois');
ok(bt.diario[0].k === 'bat' && bt.diario[0].t === 'Cerco de Ostra' && bt.diario[0].r === 'v' && bt.diario[0].b === 221 && bt.diario[0].dj === '3º de Brumas, 412' && /Lanças de Merunê −41/.test(bt.diario[0].x),
  'a linha do diário: onde, o resultado, as baixas, a data do mapa e as baixas de cada unidade: ' + j(bt.diario[0]));
let dd = bt;
for (let i = 0; i < 45; i++) dd = T.noDiario(dd, { k: 'nota', t: 'nota ' + i });
ok(dd.diario.length === 40 && dd.diario[0].t === 'nota 44' && T.normDiario([{ t: '' }, { t: 'x', r: 'z', b: -3 }]).length === 1 && !('r' in T.normDiario([{ t: 'x', r: 'z' }])[0]),
  'o diário: as mais novas em cima, até 40 linhas; sem título não entra; o resultado que não existe some');

// ---- a tropa nova
const nv = T.nova('Selene', '2026-10-29T12:00:00.000Z', '');
ok(nv.nome === 'Guarda de Selene' && nv.unid.length === 1 && nv.unid[0].vet === 1 && nv.unid[0].tropas === 100 && nv.unid[0].hpT === 10 && nv.diario.length === 1 && nv.diario[0].k === 'form' && /^un_/.test(nv.unid[0].id),
  'a tropa nova: "Guarda de Selene", uma unidade de recrutas (100 soldados) e a primeira linha do diário');
ok(T.pcDoDoc('fichas:tropas:pc_s') === 'pc_s' && T.pcDoDoc('fichas:corr:pc_s') === null && T.docId('pc_1') === 'fichas:tropas:pc_1', 'o documento: fichas:tropas:<id do personagem>');
// ---- (lote 42) os soldados com nome e o clã
const ds = T.norm({ cla: 'cl_garret', unid: [{ id: 'a', tropas: 10, sold: [{ nome: 'Aron', raca: 'ar_humano', racaN: 'Humano' }, {}, { classeN: 'Arqueiro' }].concat(Array.from({ length: 60 }, (_, i) => ({ nome: 'S' + i }))) }] });
ok(ds.cla === 'cl_garret' && ds.unid[0].sold.length === 50 && ds.unid[0].sold[0].nome === 'Aron' && ds.unid[0].sold[1].nome === 'Soldado' && ds.unid[0].sold[1].classeN === 'Arqueiro' && /^sd_/.test(ds.unid[0].sold[0].id),
  'os soldados com nome: até 50; a linha vazia sai; sem nome, "Soldado"; o clã da tropa fica (na parte do mestre)');
ok(!('sold' in T.parteMestre(ds).unid[0]) && T.parteMestre(ds).cla === 'cl_garret', 'os soldados são do jogador (fora da parte do mestre); o clã, do mestre');
const ds2 = T.comEscolhas(ds, 'a', { sold: [{ nome: 'Tomas', classe: 'cl_g', classeN: 'Guerreiro' }] });
ok(ds2.unid[0].sold.length === 1 && ds2.unid[0].sold[0].nome === 'Tomas' && j(T.parteMestre(ds2)) === j(T.parteMestre(ds)) && T.quemESold(ds2.unid[0].sold[0], { arvores: [{ id: 'cl_g', nome: 'Guerreiro de Ferro', categoria: 'classe' }] }) === 'Guerreiro de Ferro',
  'as escolhas trocam os soldados sem mexer no resto; a raça e a classe do soldado pelas árvores');
end();
