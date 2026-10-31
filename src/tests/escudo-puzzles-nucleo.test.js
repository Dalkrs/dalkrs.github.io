// Os puzzles do lote 46, a conta pura (tc/escudo-puzzles.js): os doze tipos, nas três dificuldades, em várias sementes —
// o começo não está resolvido; o estado resolvido dá a prova que o md5 confere; há sempre uma dica no começo; a mesma
// semente dá o mesmo puzzle; a resposta embaralhada não aparece à vista; o cronômetro (prazo).
const { checker } = require('./lib');
const { ok, end } = checker();
const E = require('../../tc/escudo.js'), X = require('../../tc/escudo-puzzles.js');
const j = JSON.stringify;
const TIPOS = ['cruzadas', 'caca', 'anagrama', 'labirinto', 'espelhos', 'fios', 'sudoku', 'falsa', 'equilibrar', 'deslizante', 'pares', 'sequencia'];
ok(TIPOS.every(t => E.PUZZLES[t] && E.EXTRA[t]) && Object.keys(E.PUZZLES).length === 19, 'os doze registrados (19 tipos ao todo)');
ok(j([...new Set(TIPOS.map(t => E.PUZZLES[t].grupo))]) === j(['Palavras', 'Caminhos', 'Lógica', 'Memória e sequência']), 'nos quatro grupos novos');
const ruins = [];
for (const tipo of TIPOS) for (const dif of ['facil', 'medio', 'dificil']) for (let seed = 1; seed <= 6; seed++) {
  const h = E.normHandout({ tipo: 'puzzle', puzzle: { tipo, dif, seed, tema: ['taverna', 'mar', 'magia'][seed % 3] } });
  const m = E.montarPuzzle(h.puzzle), jg = E.normJogo(E.jogoNovo('h1', h));
  const nome = tipo + '/' + dif + '/' + seed;
  if (!jg) { ruins.push(nome + ': sem jogo'); continue; }
  if (E.confere(jg, E.provaDoEstado(jg, null))) ruins.push(nome + ': já começa resolvido');
  if (j(E.montarPuzzle(h.puzzle).pub) !== j(m.pub)) ruins.push(nome + ': a mesma semente deu outro');
  const est = jg.estado; let tent = null;
  if (tipo === 'cruzadas') for (let i = 0; i < m.seg.sol.length; i++) { if (jg.pub.mask[i] === '.') est['c' + i] = m.seg.sol[i]; }
  if (tipo === 'caca') est.f = m.seg.pos.map(p => [p[0], p[1], X.palavraNaLinha(jg.pub, p[0], p[1])]);
  if (tipo === 'anagrama') m.seg.ks.forEach((k, i) => { if (!X.confereAnagrama(jg, i, k)) ruins.push(nome + ': o md5 da palavra'); est['r' + i] = k; });
  if (tipo === 'labirinto') est.p = jg.pub.fim;
  if (tipo === 'espelhos') est.o = m.seg.sol;
  if (tipo === 'fios') m.seg.caminhos.forEach((c, i) => { est['f' + i] = c; });
  if (tipo === 'sudoku') m.seg.sol.forEach((v, i) => { est['c' + i] = v; });
  if (tipo === 'falsa') { const s = X.segredoFalsa(jg); tent = { f: s.f, d: s.d }; }
  if (tipo === 'equilibrar') { for (const i in m.seg.sol) est['w' + i] = m.seg.sol[i]; tent = 'soltar'; }
  if (tipo === 'deslizante') est.p = [...Array(jg.pub.n * jg.pub.n).keys()];
  if (tipo === 'pares') est.m = [...Array(jg.pub.n).keys()];
  if (tipo === 'sequencia') tent = 'fim';
  if (!E.confere(jg, E.provaDoEstado(jg, tent))) ruins.push(nome + ': o resolvido não confere');
  const d = E.dicaDe(E.normJogo(E.jogoNovo('h1', h)), m);
  if (!d || !d.mudas || !d.txt) ruins.push(nome + ': sem dica');
}
ok(ruins.length === 0, 'os 216 puzzles: começam por resolver, o resolvido confere, a mesma semente repete, há dica — ' + ruins.slice(0, 5).join(' | '));
{
  const jg = E.normJogo(E.jogoNovo('h', E.normHandout({ tipo: 'puzzle', puzzle: { tipo: 'sudoku', dif: 'dificil', seed: 3 } })));
  const g = jg.pub.dadas.split(',').map(Number);
  ok(jg.pub.n === 9 && X.resolverSudoku(g, 9, 2) === 1, 'o sudoku difícil (9×9) tem uma resposta só');
  const f = E.normJogo(E.jogoNovo('h', E.normHandout({ tipo: 'puzzle', puzzle: { tipo: 'falsa', dif: 'medio', seed: 5 } }))), s = X.segredoFalsa(f);
  ok(!/"f"/.test(j(f.pub)) && X.pesar(f, [s.f], [(s.f + 1) % 8]) === 1 && X.pesar(f, [(s.f + 1) % 8], [(s.f + 2) % 8]) === 0, 'a pedra falsa: a resposta vai embaralhada; a balança pesa certo');
  const eq = E.normJogo(E.jogoNovo('h', E.normHandout({ tipo: 'puzzle', puzzle: { tipo: 'equilibrar', dif: 'facil', seed: 2 } })));
  ok(E.provaDoEstado(eq, 'soltar') !== 'equilibrio' && !E.confere(eq, E.provaDoEstado(eq, 'soltar')), 'soltar a balança vazia não confere (vira um erro)');
}
{
  const h = E.normHandout({ tipo: 'puzzle', puzzle: { tipo: 'labirinto', dif: 'facil', seed: 1, tempo: 5 } });
  const jg = E.normJogo(E.jogoNovo('h', h)), t0 = Date.parse(jg.estado.t0);
  const pr = E.prazo(jg, t0 + 60000);
  ok(h.puzzle.tempo === 5 && jg.tempo === 300 && pr.resta === 240000 && !pr.acabou, 'o cronômetro: 5 minutos, a conta do que falta');
  ok(E.prazo(jg, t0 + 301000).acabou && !E.prazo(Object.assign({}, jg, { estado: Object.assign({}, jg.estado, { mais: 120 }) }), t0 + 301000).acabou, 'acaba no tempo; "mais" estende');
  ok(E.normHandout({ tipo: 'puzzle', puzzle: { tipo: 'labirinto', tempo: 7 } }).puzzle.tempo === undefined && E.prazo(E.normJogo(E.jogoNovo('h', E.normHandout({ tipo: 'puzzle', puzzle: { tipo: 'luzes' } })))) === null, 'só os tempos da lista; sem tempo, sem prazo');
}
{
  const def = E.normPuzzleDef({ tipo: 'cruzadas', dif: 'facil', seed: 9, palavras: [{ p: 'Espada', d: 'Lâmina' }, { p: 'espada' }, { p: 'Escudo', d: 'Defesa' }, { p: 'Elmo' }, { p: 'x' }] });
  ok(def.palavras.length === 3 && def.tema === 'taverna', 'as palavras do mestre: sem repetir (sem acento), de 2 letras ou mais');
  const m = E.montarPuzzle(def);
  ok(m.seg.pals.every(p => ['Espada', 'Escudo', 'Elmo'].includes(p)), 'a grade usa só elas');
  ok(Object.keys(X.TEMAS).length === 8 && Object.values(X.TEMAS).every(t => t[1].length >= 16), 'o banco: oito temas, com 16 palavras ou mais cada');
}
end();
