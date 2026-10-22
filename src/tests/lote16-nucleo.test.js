// Lote 16, a lógica pura (sem navegador):
//   · o aniversário no calendário do mundo (tc/rules.js): anivOk (o dia preso ao tamanho do mês, o ano opcional) e
//     aniversario (é hoje, quantos dias faltam, a idade — a que faz, no dia; a volta do ano);
//   · as skills únicas (tc/rules.js): unicasDe limpa (sem repetidas, sem as sem nome, o custo de uso e o tipo de uso), e
//     bonusDaArvore soma o bônus delas junto do das árvores (o código do atributo em maiúsculas; o nome do recurso na
//     primeira grafia);
//   · os aniversários do Jornal (jornal/nucleo.js): quem faz hoje e nos próximos dias, a idade, o texto da nota pronta,
//     com a data do mundo (mundo/nucleo.js).
'use strict';
const R = require('../../tc/rules.js');
const J = require('../../jornal/nucleo.js');
const M = require('../../mundo/nucleo.js');
let n = 0, ruins = 0;
const ok = (c, m) => { n++; if (!c) { ruins++; console.log('FALHOU: ' + m); } };
const j = JSON.stringify;
const meses = [{ nome: 'Alvorada', dias: 30 }, { nome: 'Degelo', dias: 28 }, { nome: 'Semeadura', dias: 31 }];

/* ---------------- o aniversário ---------------- */
ok(j(R.anivOk({ d: 5, m: 1, a: 280 }, meses)) === j({ d: 5, m: 1, a: 280 }), 'anivOk: dia, mês (de 0) e ano');
ok(j(R.anivOk({ d: 5, m: 1 }, meses)) === j({ d: 5, m: 1 }), 'sem o ano, vale (o ano é opcional)');
ok(R.anivOk({ d: 29, m: 1 }, meses) === null && j(R.anivOk({ d: 28, m: 1 }, meses)) === j({ d: 28, m: 1 }), 'o dia preso ao tamanho do mês (Degelo tem 28)');
ok(R.anivOk({ d: 1, m: 3 }, meses) === null && R.anivOk({ d: 0, m: 0 }, meses) === null && R.anivOk({ m: 0 }, meses) === null && R.anivOk(null, meses) === null && R.anivOk('5/1', meses) === null, 'mês que não existe, dia zero, sem o dia, nada ou texto: não vale');
ok(j(R.anivOk({ d: '7', m: '2', a: '300.4' }, meses)) === j({ d: 7, m: 2, a: 300 }), 'números escritos como texto contam (arredondados)');
const hoje = { a: 300, m: 1, d: 5 };
ok(j(R.aniversario({ d: 5, m: 1, a: 280 }, hoje, meses)) === j({ hoje: true, faltam: 0, idade: 20 }), 'é hoje: faz 20 anos');
ok(j(R.aniversario({ d: 6, m: 1, a: 280 }, hoje, meses)) === j({ hoje: false, faltam: 1, idade: 19 }), 'amanhã: falta 1 dia, ainda tem 19');
ok(j(R.aniversario({ d: 4, m: 1, a: 280 }, hoje, meses)) === j({ hoje: false, faltam: 88, idade: 20 }), 'ontem: faltam 88 dias (o ano tem 89), já fez 20');
ok(j(R.aniversario({ d: 1, m: 0 }, hoje, meses)) === j({ hoje: false, faltam: 55, idade: null }), 'a volta do ano: o 1º de Alvorada, a 55 dias; sem o ano, sem a idade');
ok(R.aniversario({ d: 5, m: 1 }, null, meses) === null && R.aniversario({ d: 5, m: 1 }, hoje, null) === null && R.aniversario(null, hoje, meses) === null, 'sem o dia de hoje, sem os meses ou sem o aniversário: null');

/* ---------------- as skills únicas ---------------- */
const sk = { arvores: ['a1'], alocados: { n1: 1 }, unicas: [
  { id: 'u1', nome: '  Sangue   do dragão ', desc: 'Cura {VIT*2}.', bonus: { vit: 3, 'HP ': 10, nada: 0, ruim: 'x' }, uso: [{ b: 'SP', v: '{10}' }, { b: '', v: '5' }], usos: ['ativa', 'ativa', 'x y'], cor: '#AABBCC' },
  { id: 'u1', nome: 'Repetida', bonus: { FOR: 99 } },
  { id: 'u2', nome: '', bonus: { FOR: 99 } },
  { id: 'id inválido', nome: 'Sem id', bonus: { FOR: 99 } },
  'lixo', null,
  { id: 'u3', nome: 'Olho', bonus: { hp: 5 } }] };
const un = R.unicasDe(sk);
ok(j(un) === j([{ id: 'u1', nome: 'Sangue do dragão', desc: 'Cura {VIT*2}.', bonus: { vit: 3, HP: 10 }, uso: [{ b: 'SP', v: '10' }], usos: ['ativa'], cor: '#AABBCC' }, { id: 'u3', nome: 'Olho', desc: '', bonus: { hp: 5 } }]),
  'unicasDe: o nome sem espaço sobrando; o bônus só com números (sem o zero); o custo de uso limpo; o tipo de uso sem repetir; sem as repetidas, sem nome ou sem id: ' + j(un));
ok(j(R.unicasDe({})) === '[]' && j(R.unicasDe(null)) === '[]' && j(R.unicasDe({ unicas: 'x' })) === '[]', 'sem skills únicas: lista vazia');
ok(R.unicasDe({ unicas: Array.from({ length: 80 }, (_, i) => ({ id: 'u' + i, nome: 'S' + i })) }).length === 60, 'no máximo 60');
const bib = { arvores: [{ id: 'a1', nodes: [{ id: 'n1', graus: [{ custos: {}, bonus: { FOR: 2, Hp: 1 } }] }] }] };
ok(j(R.bonusDaArvore(sk, bib)) === j({ FOR: 2, Hp: 16, VIT: 3 }), 'bonusDaArvore: a árvore (FOR +2, Hp +1) e as únicas (VIT +3, HP +10, hp +5) somadas — o HP na grafia da árvore: ' + j(R.bonusDaArvore(sk, bib)));
ok(j(R.bonusDaArvore({ unicas: [{ id: 'u1', nome: 'X', bonus: { FOR: 2 } }] }, null)) === j({ FOR: 2 }), 'sem biblioteca (nenhuma árvore), as únicas contam');
ok(j(R.bonusDaArvore({ arvores: ['a1'], alocados: { n1: 1 } }, bib)) === j({ FOR: 2, Hp: 1 }), 'sem únicas, como sempre');

/* ---------------- os aniversários do Jornal ---------------- */
const cal = { dia: 31, ano0: 300, meses: M.CAL_PADRAO.meses };          // dia 31 = 2 de Degelo do ano 300
const dataDe = k => M.dataDe(cal, cal.dia + k);
ok(j(dataDe(0)) === j({ ano: 300, mes: 1, diaMes: 2, nomeMes: 'Degelo' }), '(a data do mundo: 2 de Degelo, ano 300)');
const pcs = [{ nome: 'Ana', aniv: { d: 2, m: 1, a: 277 } }, { nome: 'Bia', aniv: { d: 2, m: 1 } }, { nome: 'Caio', aniv: { d: 3, m: 1 } }, { nome: 'Duda', aniv: { d: 6, m: 1, a: 299 } }, { nome: 'Eli', aniv: { d: 9, m: 1 } }, { nome: 'Sem', aniv: null }, { nome: 'Fora', aniv: { d: 2, m: 5 } }];
const a = J.aniversarios(pcs, dataDe);
ok(a && j(a.hoje) === j([{ nome: 'Ana', idade: 23 }, { nome: 'Bia', idade: null }]) && j(a.logo.map(x => [x.nome, x.k, x.data, x.idade])) === j([['Caio', 1, '3 de Degelo', null], ['Duda', 4, '6 de Degelo', 1]]),
  'hoje, a Ana (faz 23) e a Bia; nos próximos 7 dias, o Caio (amanhã) e a Duda (em 4 dias, faz 1); o Eli (em 7) fica de fora: ' + j(a));
ok(a.texto === 'Hoje é aniversário de Ana (faz 23 anos) e de Bia. Nos próximos dias: Caio (amanhã, 3 de Degelo) e Duda (6 de Degelo).', 'o texto da nota pronta: ' + a.texto);
ok(J.aniversarios(pcs, dataDe, 8).logo.some(x => x.nome === 'Eli'), 'com 8 dias, o Eli entra');
ok(J.aniversarios([{ nome: 'Caio', aniv: { d: 3, m: 1 } }], dataDe).texto === 'Aniversários nos próximos dias: Caio (amanhã, 3 de Degelo).', 'só os próximos: o texto começa diferente');
ok(J.aniversarios([{ nome: 'Ana', aniv: { d: 2, m: 1, a: 299 } }], dataDe).texto === 'Hoje é aniversário de Ana (faz 1 ano).', '"faz 1 ano", no singular');
ok(J.aniversarios([{ nome: 'Fora', aniv: { d: 2, m: 5 } }], dataDe) === null && J.aniversarios([], dataDe) === null && J.aniversarios(pcs, null) === null, 'ninguém perto, ninguém, ou sem a data do mundo: null');

console.log(ruins ? ruins + ' de ' + n + ' falharam' : n + ' verificações passaram');
process.exit(ruins ? 1 : 0);
