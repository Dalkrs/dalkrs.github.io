// Jornal, a lógica pura (jornal/nucleo.js): o rascunho e o publicado, as cartas dos jogadores e o que aconteceu com
// cada uma, a marcação simples do texto (negrito e itálico). Sem navegador.
'use strict';
const J = require('../../jornal/nucleo.js');
let n = 0, ruins = 0;
const ok = (c, m) => { n++; if (!c) { ruins++; console.log('FALHOU: ' + m); } };
const j = JSON.stringify;

/* ---------------- catálogos ---------------- */
ok(j(Object.keys(J.CLIMAS)) === j(['sol', 'nublado', 'chuva', 'tempestade', 'neve', 'nevoa', 'vento', 'calor', 'frio']) && Object.values(J.CLIMAS).every(c => c.nome && /^<(path|circle)/.test(c.svg) && !/<script|on\w+=|href/i.test(c.svg)),
  'nove climas, cada um com nome e ícone (só desenho, nada executável)');

/* ---------------- o rascunho ---------------- */
{
  const v = J.normJornal(null);
  ok(j(v) === j({ v: 1, nome: 'O Arauto', mapa: null, clima: { t: '', frase: '' }, materias: [], notas: [], cartas: [] }), 'um jornal novo: o nome de começo, sem data, sem clima, vazio');
  const r = J.normJornal({ nome: '  O   Arauto de Urgm ', mapa: 'mp_1', clima: { t: 'chuva', frase: ' Chuva   fina ' },
    materias: [{ id: 'm1', tit: ' A queda\nda ponte ', txt: 'Linha 1\r\nLinha 2', ass: 'Aldo', dest: true }, { tit: 'Sem id' }, 'lixo', { id: 'm1', tit: 'repetido' }],
    notas: [{ id: 'n1', txt: 'Vende-se cavalo.' }, null], cartas: [{ id: 'c1', de: 'u1', ref: 'ca_1', ass: 'Selene', txt: 'Oi' }, { de: 'x y', ass: '', txt: 'Anônima' }] });
  ok(r.nome === 'O Arauto de Urgm' && r.mapa === 'mp_1' && j(r.clima) === j({ t: 'chuva', frase: 'Chuva fina' }), 'o nome, o mapa da data e o clima (sem espaços sobrando)');
  ok(r.materias.length === 3 && j(r.materias[0]) === j({ id: 'm1', tit: 'A queda da ponte', txt: 'Linha 1\nLinha 2', ass: 'Aldo', dest: true }) && /^mt_/.test(r.materias[1].id) && r.materias[1].dest === false
    && r.materias[2].id !== 'm1' && r.materias[2].tit === 'repetido', 'matérias: título numa linha, o texto com as quebras, assinatura, destaque; ids sem repetir');
  ok(r.notas.length === 1 && r.notas[0].txt === 'Vende-se cavalo.' && r.cartas.length === 2 && r.cartas[0].de === 'u1' && r.cartas[0].ref === 'ca_1' && r.cartas[1].de === null && r.cartas[1].ass === '',
    'boatos e anúncios; as cartas no jornal (com quem mandou, se veio de um jogador)');
  const grande = J.normJornal({ nome: 'x'.repeat(200), clima: { t: 'furacao' }, materias: Array.from({ length: 40 }, (_, i) => ({ tit: 'M' + i, txt: 'y'.repeat(9000) })), notas: Array.from({ length: 50 }, () => ({ txt: 'z' })) });
  ok(grande.nome.length === 80 && grande.clima.t === '' && grande.materias.length === 30 && grande.materias[0].txt.length === 8000 && grande.notas.length === 40, 'os limites: nome, clima que não existe, 30 matérias de até 8000 letras, 40 notas');
}

/* ---------------- publicar ---------------- */
{
  const ras = { nome: 'O Arauto', materias: [{ id: 'm1', tit: 'Manchete', txt: 'Texto' }], cartas: [{ id: 'cj1', de: 'u1', ref: 'ca_9', ass: 'Selene', txt: 'Oi' }, { id: 'cj2', ass: 'Leitor', txt: 'Sem jogador' }] };
  const p1 = J.publicar(ras, null, '3 de Alvorada, ano 1', '2026-10-15T20:00:00.000Z');
  ok(p1.n === 1 && p1.em === '2026-10-15T20:00:00.000Z' && p1.data === '3 de Alvorada, ano 1' && p1.materias[0].tit === 'Manchete' && !J.vazioPub(p1) && J.vazioPub(J.normPub(null)),
    'publicar: o rascunho sai com a data do mundo, a hora e o número 1');
  const p2 = J.publicar(ras, p1, '4 de Alvorada, ano 1', '2026-10-16T20:00:00.000Z');
  ok(p2.n === 2 && p2.em !== p1.em, 'publicar de novo: número 2, outra hora');
  ok(!J.mudouDesde(ras, p1) && J.mudouDesde(Object.assign({}, ras, { nome: 'Outro' }), p1), 'o rascunho igual ao publicado não tem novidade; mudou, tem');
  ok(j(J.saidasAoPublicar(p1)) === j({ u1: { ca_9: 'saiu' } }), 'ao publicar, a carta de um jogador que está no jornal saiu (para avisar a ele)');
  ok(J.normPub({ n: -3, em: 'ontem' }).n === 0 && J.normPub({ em: 'ontem' }).em === null, 'publicado torto: número e hora que não valem');
}

/* ---------------- as cartas ---------------- */
{
  let d = J.normCartas(null);
  ok(j(d) === j({ cartas: [] }), 'sem cartas');
  const a = J.mandarCarta(d, 'Caro editor,\n\no ponte caiu.', { pc: 'pc1', nome: ' Selene ' }, '2026-10-15T10:00:00.000Z');
  ok(a.ok && a.cartas.cartas.length === 1 && a.carta.ass.nome === 'Selene' && a.carta.ass.pc === 'pc1' && /^ca_/.test(a.carta.id) && a.carta.em === '2026-10-15T10:00:00.000Z', 'mandar uma carta assinada por um personagem');
  const b = J.mandarCarta(a.cartas, 'Sem nome.', null);
  ok(b.ok && b.carta.ass === null && J.assTxt(b.carta.ass) === 'Anônima' && J.assTxt(a.carta.ass) === 'Selene', 'mandar uma carta anônima');
  ok(!J.mandarCarta(b.cartas, '   ', null).ok && !J.mandarCarta(b.cartas, 'x'.repeat(1501), null).ok && /1500 letras/.test(J.mandarCarta(b.cartas, 'x'.repeat(1501), null).msg), 'carta vazia ou grande demais: não vai, e diz por quê');
  let cheio = { cartas: [] };
  for (let i = 0; i < 60; i++) cheio = J.mandarCarta(cheio, 'c' + i, null).cartas;
  ok(!J.mandarCarta(cheio, 'mais uma', null).ok && J.normCartas({ cartas: Array.from({ length: 70 }, () => ({ txt: 'x' })) }).cartas.length === 60, 'até 60 cartas por jogador');
  ok(J.normCartas({ cartas: [{ id: 'c1', txt: '' }, { id: 'c2', txt: 'ok', ass: { nome: '' } }] }).cartas.length === 1 && J.normCartas({ cartas: [{ txt: 'ok', ass: { nome: '' } }] }).cartas[0].ass === null, 'carta sem texto não fica; assinatura sem nome é anônima');
  // o que aconteceu com cada uma
  ok(j(J.normResp({ st: { c1: 'saiu', c2: 'nao', c3: 'talvez', 'x y': 'saiu' } })) === j({ st: { c1: 'saiu', c2: 'nao' } }), 'as respostas: saiu ou não saiu (o resto não vale)');
  ok(J.situacao({ st: { c1: 'saiu' } }, 'c1') === 'saiu' && J.situacao({ st: { c1: 'nao' } }, 'c1') === 'nao' && J.situacao(null, 'c1') === 'esperando', 'a situação de cada carta para quem mandou');
  // a caixa de quem mestra
  const docs = [
    { de: 'u1', cartas: { cartas: [{ id: 'c1', txt: 'Primeira', em: '2026-10-15T10:00:00.000Z' }, { id: 'c2', txt: 'Terceira', em: '2026-10-15T12:00:00.000Z' }] }, resp: { st: { c2: 'nao' } } },
    { de: 'u2', cartas: { cartas: [{ id: 'c9', txt: 'Segunda', ass: { nome: 'Brisa' }, em: '2026-10-15T11:00:00.000Z' }] }, resp: null },
    { de: '', cartas: { cartas: [{ id: 'z', txt: 'sem dono' }] } },
  ];
  let ras = J.porNoJornal(null, 'u2', docs[1].cartas.cartas[0]);
  const caixa = J.caixaDeCartas(docs, ras);
  ok(j(caixa.map(c => [c.de, c.id, c.st, c.noRascunho])) === j([['u1', 'c1', 'esperando', false], ['u2', 'c9', 'esperando', true], ['u1', 'c2', 'nao', false]]),
    'a caixa de quem mestra: todas as cartas, em ordem de chegada, com a situação e se já estão no rascunho: ' + j(caixa.map(c => [c.de, c.id, c.st, c.noRascunho])));
  ok(ras.cartas.length === 1 && ras.cartas[0].ass === 'Brisa' && ras.cartas[0].txt === 'Segunda' && ras.cartas[0].de === 'u2' && ras.cartas[0].ref === 'c9' && J.porNoJornal(ras, 'u2', docs[1].cartas.cartas[0]).cartas.length === 1,
    'pôr no jornal: a carta entra no rascunho com a assinatura e o texto (uma vez só)');
}

/* ---------------- a marcação do texto ---------------- */
{
  const p = J.marcacao('Um **negrito** e um _itálico_ e um *outro*.\n\nSegundo parágrafo\ncom quebra.');
  ok(p.length === 2 && j(p[0]) === j([{ t: 'Um ', b: false, i: false }, { t: 'negrito', b: true, i: false }, { t: ' e um ', b: false, i: false }, { t: 'itálico', b: false, i: true }, { t: ' e um ', b: false, i: false }, { t: 'outro', b: false, i: true }, { t: '.', b: false, i: false }]),
    'negrito e itálico no texto: ' + j(p[0]));
  ok(j(p[1]) === j([{ t: 'Segundo parágrafo', b: false, i: false }, { br: true }, { t: 'com quebra.', b: false, i: false }]), 'uma linha em branco separa os parágrafos; a quebra simples fica');
  ok(j(J.marcacao('2 * 3 = 6 e nome_com_traço e ** solto')[0].map(x => x.t).join('')) === j('2 * 3 = 6 e nome_com_traço e ** solto') && J.marcacao('2 * 3 = 6')[0].every(x => !x.i)
    && J.marcacao('valor_total_ e mais')[0].every(x => !x.i), 'o que não é marcação fica como está (um traço colado numa palavra não abre itálico)');
  ok(j(J.marcacao('**negrito com _itálico_ dentro**')[0]) === j([{ t: 'negrito com ', b: true, i: false }, { t: 'itálico', b: true, i: true }, { t: ' dentro', b: true, i: false }]), 'itálico dentro do negrito');
  ok(J.marcacao('').length === 0 && J.marcacao('\n\n  \n').length === 0, 'texto vazio: nenhum parágrafo');
  const e1 = J.envolver('Uma ponte caiu', 4, 9, '**'), e2 = J.envolver('abc', 1, 1, '_');
  ok(e1.txt === 'Uma **ponte** caiu' && e1.ini === 6 && e1.fim === 11 && e2.txt === 'a_itálico_bc' && e2.ini === 2 && e2.fim === 9, 'os botões N e I envolvem o trecho escolhido (sem trecho, um exemplo para trocar)');
}

console.log(ruins ? n - ruins + ' verificações passaram, ' + ruins + ' falharam' : n + ' verificações passaram');
process.exit(ruins ? 1 : 0);
