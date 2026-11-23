// (lote 206) O radial arrumado da Árvore (arvore/layout.js): cada ramo na sua fatia, as camadas em anéis, a Mestria
// depois das duas trilhas, as vertentes em faixas, as pontes nos vãos e nenhum nó em cima de outro.
const { checker } = require('./lib');
const { ok, end } = checker();
const L = require('../../arvore/layout.js');
// um Ninja de mentira: 3 ramos, cada um com o golpe e o jutsu, a Mestria e os topos; 3 pontes; 2 fundamentos
const linhas = ['o:', 'f1:o', 'f2:o'];
for (const r of 'abc') linhas.push(...[`${r}cab:o`, `${r}b1:${r}cab`, `${r}b2:${r}cab`, `${r}b3:${r}b1`, `${r}b4:${r}b2`, `${r}xa:${r}b3,${r}b4`, `${r}xb:${r}b3,${r}b4`,
  `${r}m1:${r}xa,${r}xb`, `${r}mes:${r}m1,${r}jm1`, `${r}c1:${r}mes`, `${r}k1:${r}c1`, `${r}jcab:${r}cab`, `${r}j1:${r}jcab`, `${r}j2:${r}j1`, `${r}jm1:${r}j2`,
  `${r}jc1:${r}mes`, `${r}k3:${r}jc1`]);
linhas.push('p1:am1,bm1', 'p2:bm1,cm1', 'p3:am1,cm1');
const nodes = linhas.map(l => { const [id, p] = l.split(':'); return { id, pais: p ? p.split(',') : [], forma: /mes$/.test(id) ? 'selo' : 'circulo',
  natureza: /^.j/.test(id) ? 'canalizacao' : 'forca' }; });
const R = n => (n.id === 'o' || /k\d$/.test(n.id) ? 27 : /cab$|mes$|^p\d/.test(n.id) ? 18 : 10);
const { pos, aneis } = L.calc(nodes, { raio: R });
ok(pos.size === nodes.length, 'todo nó tem lugar: ' + pos.size);
ok(pos.get('o').x === 0 && pos.get('o').y === 0, 'a origem no centro');
const d = id => Math.hypot(pos.get(id).x, pos.get(id).y);
ok(d('f1') < d('acab') && d('f2') < d('bcab'), 'os fundamentos ficam mais perto do centro que as cabeças');
ok(d('ames') > d('am1') && d('ames') > d('ajm1'), 'a Mestria fica depois das duas trilhas que chegam nela');
ok(['a', 'b', 'c'].every(r => pos.get(r + 'b1').ramo === pos.get(r + 'k1').ramo && pos.get(r + 'j1').ramo === pos.get(r + 'cab').ramo), 'cada nó fica no ramo da sua cabeça');
ok(pos.get('aj1').faixa === 'ajcab' && pos.get('ajc1').faixa === 'ajcab', 'o jutsu forma uma faixa, e ela segue depois da Mestria (pela natureza)');
ok(pos.get('ames').faixa === null, 'a Mestria fica no tronco');
ok(['p1', 'p2', 'p3'].every(id => pos.get(id).ramo === null), 'as pontes não são de ramo nenhum');
// sem nó em cima de outro
let enc = 0; const ids = [...pos.keys()];
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
  const A = pos.get(ids[i]), B = pos.get(ids[j]), a = nodes.find(n => n.id === ids[i]), b = nodes.find(n => n.id === ids[j]);
  if (Math.hypot(A.x - B.x, A.y - B.y) < R(a) + R(b) + 6) enc++;
}
ok(enc === 0, 'nenhum nó encosta em outro: ' + enc);
// os ramos não se misturam: o ângulo de cada ramo fica numa fatia própria
const ang = id => Math.atan2(pos.get(id).y, pos.get(id).x);
const fatia = r => nodes.filter(n => pos.get(n.id).ramo === r).map(n => ang(n.id));
const meio = [0, 1, 2].map(r => { const a = fatia(r); return Math.atan2(a.reduce((s, x) => s + Math.sin(x), 0), a.reduce((s, x) => s + Math.cos(x), 0)); });
ok(meio.every((m, i) => meio.every((m2, j) => i === j || Math.abs(Math.atan2(Math.sin(m - m2), Math.cos(m - m2))) > 1.5)), 'os 3 ramos apontam para lados diferentes');
ok(aneis.length >= 5 && aneis.every((r, i) => !i || r > aneis[i - 1]), 'os anéis do fundo crescem para fora: ' + aneis.length);
// o mesmo desenho toda vez
const b = L.calc(nodes, { raio: R }).pos;
ok([...pos.keys()].every(id => Math.abs(pos.get(id).x - b.get(id).x) < 1e-9), 'o desenho é sempre o mesmo');
ok(L.calc([], {}).pos.size === 0, 'árvore vazia: nada');
end();
