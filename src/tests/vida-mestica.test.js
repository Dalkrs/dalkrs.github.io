// (lote 211) A Vida da raça: o mestiço puxa de UMA raça (a escolhida pelo mestre, ou a primeira) ou de um valor único.
const { checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const bib = { arvores: [
  { id: 'a_humano', categoria: 'raca', nome: 'Humano', nodes: [{ id: 'h_o', pais: [], graus: [{ bonus: { HP: 28, 'Vida por VIT': 2 } }] }] },
  { id: 'a_kobold', categoria: 'raca', nome: 'Kobold', nodes: [{ id: 'k_o', pais: [], graus: [{ bonus: { HP: 24, 'Vida por VIT': 2 } }] }, { id: 'k_1', pais: ['k_o'], graus: [{ bonus: { HP: 5 } }] }] },
  { id: 'a_anao', categoria: 'raca', nome: 'Anão', nodes: [{ id: 'a_o', pais: [], graus: [{ bonus: { HP: 24, 'Vida por VIT': 3 } }] }] }] };
const sk = { arvores: ['a_humano', 'a_kobold'], alocados: { h_o: 1, k_o: 1, k_1: 1 } };
const b = x => R.bonusDaArvore(x, bib);
ok(b({ arvores: ['a_anao'], alocados: { a_o: 1 } }).HP === 24 && b({ arvores: ['a_anao'], alocados: { a_o: 1 } })['Vida por VIT'] === 3, 'uma raça só: a Vida dela');
let v = R.vidaDeRaca(sk, bib);
ok(v.mestico && !v.escolhida && v.arv === 'a_humano', 'mestiço sem escolha: a primeira raça da lista');
ok(b(sk).HP === 28 + 5 && b(sk)['Vida por VIT'] === 2, 'sem escolha: só a origem da primeira conta (o +5 de outra habilidade continua)');
ok(b({ ...sk, vidaMestica: { modo: 'raca', arv: 'a_kobold' } }).HP === 24 + 5, 'escolheu o Kobold: a base do Kobold');
ok(b({ ...sk, vidaMestica: { modo: 'raca', arv: 'a_sumiu' } }).HP === 33, 'escolha de uma raça que saiu: volta à primeira');
const f = b({ ...sk, vidaMestica: { modo: 'fixo', vv: 3, base: 40 } });
ok(f.HP === 45 && f['Vida por VIT'] === 3, 'valor único: o multiplicador e a base do mestre');
ok(R.vidaDeRaca({ ...sk, vidaMestica: { modo: 'fixo', vv: 9, base: 10 } }, bib).fixo.vv === 3, 'o multiplicador do valor único não passa de 3');
// na ficha: VIT 10, fórmula padrão
const cfg = { niveis: [{ lvl: 1, pts: 45 }], pct: { A: .3, B: .26, C: .22, D: .17, E: .05 } };
const pc = { level: 1, atrMan: { VIT: 10 }, recursos: [{ id: 'hp', nome: 'HP', fml: '(VIT-VIT_EQ)*VIDAVIT' }] };
const hp = x => R.calcular(pc, cfg, { arvore: b(x) }).recursos[0].val;
ok(hp(sk) === 10 * 2 + 33, 'HP do mestiço sem escolha: 10 × 2 + 28 + 5 = ' + hp(sk));
ok(hp({ ...sk, vidaMestica: { modo: 'fixo', vv: 3, base: 40 } }) === 10 * 3 + 45, 'HP com valor único: 10 × 3 + 40 + 5 = ' + hp({ ...sk, vidaMestica: { modo: 'fixo', vv: 3, base: 40 } }));
end();
