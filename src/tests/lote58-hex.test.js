// Mapa-múndi → Cenas (lote 58): a cena do hexágono leva a beira da água e a fenda (mundo/nucleo.js, hexParaCena), sem
// navegador:
//   · cada vizinho de água vem com a margem que o mapa desenha (a areia na planície, o junco na mata e no lago, a rocha
//     na montanha, o gelo na neve) e os que são de lago;
//   · o hexágono de desfiladeiro leva a fenda (os pedaços, o rio no fundo e a ponte).
const { checker } = require('./lib');
const { ok, end } = checker();
const N = require('../../mundo/nucleo.js');
const j = JSON.stringify;
const novo = () => { const m = N.normalizarMapa({ id: 'hex58', larg: 2000, alt: 2000, grade: { tam: 50 } }); m.hexes = {}; return m; };
const put = (m, q, r, t) => { m.hexes[q + ',' + r] = t; };

let m = novo();
for (let q = -3; q <= 6; q++) for (let r = -3; r <= 6; r++) put(m, q, r, 'pl');
put(m, 2, 1, 'md'); put(m, 1, 0, 'lg');                     // a leste (l) o mar; a noroeste (no) o lago
let h = N.hexParaCena(m, 1, 1);
ok(h.margem && h.margem.l === 'areia' && h.margem.no === 'junco' && h.lago && h.lago.no === true && !h.lago.l, 'a planície: areia no mar, junco no lago — ' + j({ margem: h.margem, lago: h.lago }));
put(m, 1, 1, 'mo'); h = N.hexParaCena(m, 1, 1);
ok(h.margem.l === 'rocha' && h.margem.no === 'rocha', 'a montanha na água: a rocha (a falésia)');
put(m, 1, 1, 'ne'); h = N.hexParaCena(m, 1, 1);
ok(h.margem.l === 'gelo', 'a neve: a borda de gelo');
put(m, 1, 1, 'fl'); h = N.hexParaCena(m, 1, 1);
ok(h.margem.l === 'junco', 'a mata: o junco também no mar');
put(m, 2, 1, 'pl'); put(m, 1, 0, 'pl'); h = N.hexParaCena(m, 1, 1);
ok(!h.margem && !h.lago, 'sem água ao lado, nada a mais');

m = novo();
for (let q = -3; q <= 6; q++) for (let r = -3; r <= 6; r++) put(m, q, r, 'mo');
for (let r = -1; r <= 4; r++) put(m, 2, r, 'df');
put(m, 1, 2, 'et'); put(m, 0, 2, 'et'); put(m, 3, 2, 'et'); put(m, 4, 2, 'et');
h = N.hexParaCena(m, 2, 2);
ok(h.fenda && h.fenda.pecas.length >= 1 && h.fenda.ponte === true && h.fenda.comRio === false && h.ter === 'montanha' && h.caminhos.length >= 1, 'o desfiladeiro com a estrada: a fenda, a ponte e o caminho — ' + j(h.fenda && { n: h.fenda.pecas.length, ponte: h.fenda.ponte }));
ok(h.fenda.pecas.every(p => p.pts.every(([u, v]) => u >= 0 && u <= 1 && v >= 0 && v <= 1)), 'os pedaços da fenda no tijolo (de 0 a 1)');
ok(!N.hexParaCena(m, 0, 0).fenda, 'fora da fenda, sem fenda');
end();
