// Os 26 puzzles do lote 209, a conta pura (tc/escudo-puzzles2.js e 3): cada tipo nos 5 níveis, em várias sementes — o
// começo não está resolvido; o último passo do tutorial (o "demo") resolve, e o md5 confere; a mesma semente dá o mesmo
// puzzle; há dica no começo; há resposta para o mestre. E os que o mestre escreve (dedução, guardas, palavra, ordem,
// bússola, mensagem), os 5 níveis só nos tipos novos, e o banco de antes sem mudança.
const { checker } = require('./lib');
const { ok, end } = checker();
const E = require('../../tc/escudo.js'); require('../../tc/escudo-puzzles.js');
const X2 = require('../../tc/escudo-puzzles2.js'), X3 = require('../../tc/escudo-puzzles3.js');
const j = JSON.stringify;
const NOVOS = ['deducao', 'guardas', 'nonograma', 'somas', 'magico', 'contacifrada', 'guardas8', 'campo', 'tesouro', 'palavra', 'espelhada', 'ordem', 'diferencas',
  'torre', 'jarros', 'travessia', 'canos', 'sokoban', 'gelo', 'restaum', 'pontes', 'trilhos', 'constelacao', 'encaixar', 'bussola', 'cavalo'];
ok(NOVOS.every(t => E.PUZZLES[t] && E.EXTRA[t] && E.PUZZLES[t].niveis === 5 && E.EXTRA[t].niv.length === 5 && typeof E.EXTRA[t].demo === 'function') && Object.keys(E.PUZZLES).length === 45, 'os 26 registrados, com 5 níveis, a frase de cada nível e o tutorial (45 tipos sem a fechadura)');
ok(j(E.niveisDe('deducao')) === j(['facil', 'medio', 'dificil', 'extremo', 'absoluto']) && j(E.niveisDe('sudoku')) === j(['facil', 'medio', 'dificil']) && j(E.niveisDe('cifra')) === j(['facil', 'medio', 'dificil']), 'os novos com 5 níveis; os de antes, com 3');
ok(E.normPuzzleDef({ tipo: 'sudoku', dif: 'absoluto', seed: 3 }).dif === 'dificil' && E.normPuzzleDef({ tipo: 'torre', dif: 'absoluto', seed: 3 }).dif === 'absoluto', 'um puzzle de antes no Absoluto fica Difícil; um novo fica no Absoluto');
ok(E.montarPuzzle({ tipo: 'sudoku', dif: 'dificil', seed: 3 }).pub.n === 9, 'o sudoku difícil continua 9×9 (a semente dos de antes não mudou)');
const ruins = [];
let total = 0;
for (const tipo of NOVOS) for (const dif of E.DIF5) for (let seed = 1; seed <= 8; seed++) {
  total++;
  const nome = tipo + '/' + dif + '/' + seed;
  const h = E.normHandout({ tipo: 'puzzle', puzzle: { tipo, dif, seed } });
  const m = E.montarPuzzle(h.puzzle), jg = E.normJogo(E.jogoNovo('h1', h));
  if (!m || !jg) { ruins.push(nome + ': não montou'); continue; }
  if (j(E.montarPuzzle(h.puzzle).pub) !== j(m.pub)) ruins.push(nome + ': a mesma semente deu outro');
  for (const t of [null, 'conferir', 'fim']) if (E.confere(jg, E.provaDoEstado(jg, t))) ruins.push(nome + ': já começa resolvido');
  let est = Object.assign({}, jg.estado), tent;
  for (const p of E.EXTRA[tipo].demo(m, jg)) { if (p.mudas) for (const k in p.mudas) { if (p.mudas[k] === null) delete est[k]; else est[k] = p.mudas[k]; } if (p.t !== undefined) tent = p.t; if (!p.txt) ruins.push(nome + ': passo sem texto'); }
  const fim = Object.assign({}, jg, { estado: est });
  if (!E.confere(fim, E.provaDoEstado(fim, tent))) ruins.push(nome + ': o fim do tutorial não resolve');
  const d = E.dicaDe(jg, m); if (!d || !d.mudas || !d.txt) ruins.push(nome + ': sem dica');
  if (!E.EXTRA[tipo].resposta(m, h.puzzle)) ruins.push(nome + ': sem resposta');
  if (j(m.pub).includes(m.resposta) && m.resposta.length > 6 && !/^[a-z]+:\d+$|^torre|^jarros|^travessia|^estatuas|^gelo|^resta1|^trilhos/.test(m.resposta)) ruins.push(nome + ': a resposta à vista');
  if (tipo === 'guardas' && m.seg.fb) ruins.push(nome + ': as falas de reserva');
}
ok(ruins.length === 0, 'os ' + total + ' puzzles: começam por resolver, o tutorial resolve, a mesma semente repete, há dica e resposta — ' + ruins.slice(0, 6).join(' | '));
// a dedução: as pistas deixam uma resposta só (contando pelas frases não dá; pelo quadro: a resposta certa confere e uma trocada não)
{
  const m = E.montarPuzzle({ tipo: 'deducao', dif: 'absoluto', seed: 4 }), jg = E.normJogo(E.jogoNovo('h', E.normHandout({ tipo: 'puzzle', puzzle: { tipo: 'deducao', dif: 'absoluto', seed: 4 } })));
  ok(m.pub.n === 5 && m.pub.C === 3 && m.pub.pis.length >= 6, 'a dedução absoluta: 5 pessoas, 3 colunas e as pistas');
  const certo = m.seg.sol, mm = Array(3 * 25).fill('x');
  certo.forEach((pm, c) => pm.forEach((v, i) => { mm[X2.dedIdx(m.pub, c, i, v)] = 'v'; }));
  const a = Object.assign({}, jg, { estado: { m: mm.join('') } });
  const trocado = mm.slice(); const i0 = X2.dedIdx(m.pub, 0, 0, certo[0][0]), i1 = X2.dedIdx(m.pub, 0, 1, certo[0][1]), k0 = X2.dedIdx(m.pub, 0, 0, certo[0][1]), k1 = X2.dedIdx(m.pub, 0, 1, certo[0][0]);
  trocado[i0] = 'x'; trocado[i1] = 'x'; trocado[k0] = 'v'; trocado[k1] = 'v';
  ok(E.confere(a, E.provaDoEstado(a, 'conferir')) && !E.confere(Object.assign({}, jg, { estado: { m: trocado.join('') } }), E.provaDoEstado(Object.assign({}, jg, { estado: { m: trocado.join('') } }), 'conferir')), 'o quadro certo confere; trocar duas pessoas não');
}
// os que o mestre escreve
{
  const ded = { pes: ['Corvo', 'Lina', 'Bento'], cats: [{ n: 'Arma', v: ['Faca', 'Veneno', 'Corda'] }] };
  const m = E.montarPuzzle({ tipo: 'deducao', dif: 'medio', seed: 2, ded });
  ok(j(m.pub.pes) === j(ded.pes) && m.pub.cats[0].n === 'Arma' && /Corvo: Faca · Lina: Veneno · Bento: Corda/.test(E.EXTRA.deducao.resposta(m)) && m.pub.pis.every(t => /Corvo|Lina|Bento|Faca|Veneno|Corda/.test(t)), 'a dedução com os nomes do mestre: a resposta é a dele, e as pistas falam dos nomes dele');
  ok(E.normPuzzleDef({ tipo: 'deducao', dif: 'medio', seed: 2, ded: { pes: ['A', 'A', 'B'], cats: [{ n: 'X', v: ['1', '2', '3'] }] } }).ded === undefined, 'nomes repetidos não valem (volta ao sorteio)');
  const g = E.montarPuzzle({ tipo: 'guardas', dif: 'dificil', seed: 5, grd: { portas: ['do norte', 'do sul', 'da cripta'], guardas: ['Ivo', 'Rui', 'Téo'], certa: 2 } });
  ok(g.seg.s === 2 && j(g.pub.ps) === j(['do norte', 'do sul', 'da cripta']) && !g.seg.fb && X2.grdSolucoes, 'os guardas do mestre: a porta segura é a que ele escolheu');
  const pw = E.montarPuzzle({ tipo: 'palavra', dif: 'absoluto', seed: 1, palavra: 'Lâmina' });
  const jp = E.normJogo(E.jogoNovo('h', E.normHandout({ tipo: 'puzzle', puzzle: { tipo: 'palavra', dif: 'absoluto', seed: 1, palavra: 'Lâmina' } })));
  ok(pw.seg.pal === 'LAMINA' && pw.pub.L === 6 && pw.pub.modo === 'conta' && !j(pw.pub).includes('LAMINA') && X2.palDe(jp) === 'LAMINA' && E.confere(jp, E.provaDoEstado(jp, 'lâmina')), 'a palavra do mestre: sem acento, escondida com o sal, e confere escrita de qualquer jeito');
  ok(j(X2.corPalavra('LOBOS', 'BOLSA')) === j(['a', 'v', 'a', 'c', 'a']), 'as cores do palpite (verde, amarelo, cinza), com letra repetida');
  const o = E.montarPuzzle({ tipo: 'ordem', dif: 'extremo', seed: 1, ord: { tit: 'O baile', evs: ['A banda chega', 'O duque dança', 'A luz apaga', 'Um grito'] } });
  ok(o.pub.tit === 'O baile' && o.seg.sol.map(i => o.pub.evs[i]).join('|') === 'A banda chega|O duque dança|A luz apaga|Um grito', 'a história do mestre: a ordem certa é a dele');
  const b = E.montarPuzzle({ tipo: 'bussola', dif: 'facil', seed: 3, bus: { passos: [{ d: 'N', n: 4 }, { d: 'L', n: 5 }, { d: 'S', n: 2 }] } });
  const ini = b.pub.marcos[0][0], n = b.pub.n, x = ini % n + 5, y = Math.floor(ini / n) - 2;
  ok(!b.pub.erro && b.seg.fim === y * n + x && b.pub.ins.length === 4, 'o caminho do mestre: o tesouro fica onde as instruções levam');
  const e = E.montarPuzzle({ tipo: 'espelhada', dif: 'medio', seed: 1, msg: 'O rei mente' });
  ok(e.seg.pal.join(' ') === 'O REI MENTE' && e.pub.txt.replace(/ /g, '').length === 2 * 'OREIMENTE'.length - 1, 'a mensagem do mestre, com uma letra falsa entre as certas');
}
// mecânicas
{
  const m = E.montarPuzzle({ tipo: 'torre', dif: 'medio', seed: 1 });
  ok(m.seg.lances === 15 && j(X3.torLance([[4, 3, 2, 1], [], []], 4, 2)) === j({ de: 0, para: 1 }), 'a torre de 4 discos: 15 lances, o primeiro para o pino do meio');
  const s = E.montarPuzzle({ tipo: 'sokoban', dif: 'extremo', seed: 2 }), js = E.normJogo(E.jogoNovo('h', E.normHandout({ tipo: 'puzzle', puzzle: { tipo: 'sokoban', dif: 'extremo', seed: 2 } })));
  ok(s.pub.alvos.length === 3 && !!X3.sokProximo(js), 'as estátuas (3): a busca acha o próximo empurrão');
  const tv = E.montarPuzzle({ tipo: 'travessia', dif: 'facil', seed: 1 }), V = tv.pub;
  ok(V.tipo === 'barqueiro' && !!X3.travProblema(V, { s: [1, 1, 0, 0], b: 1, t: 0 }) && !X3.travProblema(V, { s: [1, 0, 1, 0], b: 1, t: 0 }) && tv.seg.cam.length - 1 === 7, 'a travessia do barqueiro: o lobo e a cabra sozinhos dá problema; o caminho tem 7 travessias');
  const pt = E.montarPuzzle({ tipo: 'travessia', dif: 'dificil', seed: 1 });
  ok(pt.pub.tipo === 'ponte' && pt.pub.limite === pt.seg.cam[pt.seg.cam.length - 1].t, 'a ponte e a tocha: o limite é o melhor tempo');
}
ok(require('fs').readFileSync(require('path').join(__dirname, '../../tc/escudo-puzzles2.js'), 'utf8').includes('niveis: 5'), 'o arquivo dos puzzles marca os 5 níveis');
end();
