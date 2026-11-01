// Mapa-múndi (lote 54): o rio e as estradas pintados por hexágono, a conta pura (mundo/nucleo.js), sem navegador:
//   · os terrenos novos (Rio, Estrada de terra, de pedra e pavimentada) com o custo de cada um;
//   · a margem: o fundo do hexágono de rio ou de estrada é o terreno da maioria dos vizinhos (sem contar rio, estrada e água);
//   · o rio liga aos rios e a uma água só (a foz não se abre em leque); a estrada liga às estradas e à ponte;
//   · a ponte sai sozinha onde a estrada atravessa o rio, e ali o rio custa o da estrada (sem o a mais da água);
//   · três hexágonos de estrada vizinhos entre si não fecham um triângulo no desenho;
//   · a cena do hexágono leva o rio e a estrada (e a ponte), com o bioma da margem;
//   · a rota que passa pela estrada pintada conta como estrada.
const { checker } = require('./lib');
const { ok, end } = checker();
const N = require('../../mundo/nucleo.js');
const j = JSON.stringify;

ok(j(N.TERRENOS_L54.map(t => [t.id, t.nome, t.custo, t.tex])) === j([['ri', 'Rio', 10, 'rio'], ['et', 'Estrada de terra', 4, 'estradaTerra'], ['ep', 'Estrada de pedra', 3, 'estradaPedra'], ['ev', 'Estrada pavimentada', 2, 'estradaPav']]),
  'os quatro terrenos novos, com o custo (a planície custa 5)');

const novo = () => { const m = N.normalizarMapa({ id: 'rede', larg: 2000, alt: 2000, grade: { tam: 50 } }); m.hexes = {}; return m; };
const put = (m, q, r, t) => { m.hexes[q + ',' + r] = t; };
let m = novo();
for (let q = -4; q <= 8; q++) for (let r = -4; r <= 8; r++) put(m, q, r, 'fl');
for (let q = 0; q <= 5; q++) put(m, q, 2, 'ri');
put(m, 6, 2, 'ag'); put(m, 6, 1, 'ag'); put(m, 5, 3, 'ag');
for (const [q, r] of [[2, 0], [2, 1], [2, 3], [2, 4]]) put(m, q, r, 'et');

const ponte = N.redeDoHex(m, 2, 2);
ok(ponte.tipo === 'rio' && j(ponte.liga) === j([0, 3]) && ponte.ponte && j([ponte.ponte.a, ponte.ponte.b]) === j([2, 5]) && ponte.margem.id === 'fl',
  'o rio liga aos rios dos dois lados; a estrada que o atravessa dá a ponte; a margem é a floresta');
ok(N.hexInfo(m, 2, 2).custo === 4 && N.hexInfo(m, 2, 2).de === 'ponte' && N.hexInfo(m, 1, 2).custo === 10 && N.hexInfo(m, 2, 1).custo === 4,
  'na ponte o rio custa o da estrada (4); sem ponte, 10; a estrada de terra, 4');
ok(j(N.redeDoHex(m, 2, 1).liga) === j([2, 5]) && j(N.redeDoHex(m, 2, 3).liga) === j([2, 5]), 'a estrada liga à estrada de cima e à ponte de baixo (e o contrário)');
const foz = N.redeDoHex(m, 5, 2);
ok(foz.liga.length === 2 && foz.liga.includes(3) && foz.liga.filter(i => i !== 3).length === 1, 'na foz, o rio liga a uma água só (três vizinhos de água): ' + j(foz.liga));

// a margem: a maioria dos vizinhos que não são rede nem água
m = novo();
put(m, 0, 0, 'ri'); put(m, 1, 0, 'pl'); put(m, 1, -1, 'pl'); put(m, 0, -1, 'co'); put(m, -1, 0, 'ri'); put(m, -1, 1, 'ag'); put(m, 0, 1, 'pl');
ok(N.margemDoHex(m, 0, 0).id === 'pl', 'a margem: a planície (três vizinhos), não a colina (um), nem o rio, nem a água');
m = novo(); put(m, 0, 0, 'et');
ok(N.margemDoHex(m, 0, 0) === null && N.redeDoHex(m, 0, 0).liga.length === 0, 'sem vizinhos com terreno, sem margem e sem ligação');

// o triângulo: a curva fechada da estrada que vira
m = novo();
for (const [q, r] of [[-1, 0], [0, 0], [1, 0], [1, -1], [1, -2]]) put(m, q, r, 'ep');
const lig = k => N.redeDoHex(m, ...k.split(',').map(Number)).liga.length;
const arestas = new Set();
for (const k of Object.keys(m.hexes)) { const [q, r] = k.split(',').map(Number); for (const i of N.redeDoHex(m, q, r).liga) { const d = N.VIZ_REDE[i], o = (q + d[0]) + ',' + (r + d[1]); arestas.add([k, o].sort().join('|')); } }
const temTriangulo = (() => { const ks = Object.keys(m.hexes), ligado = (a, b) => arestas.has([a, b].sort().join('|')); for (const a of ks) for (const b of ks) for (const c of ks) if (a < b && b < c && ligado(a, b) && ligado(b, c) && ligado(a, c)) return true; return false; })();
ok(!temTriangulo && Object.keys(m.hexes).every(k => lig(k) >= 1), 'a estrada que vira não fecha um triângulo, e ninguém fica sem ligação');

// a cena do hexágono
m = novo();
for (let q = -3; q <= 5; q++) for (let r = -3; r <= 5; r++) put(m, q, r, 'pl');
for (let q = 0; q <= 4; q++) put(m, q, 1, 'ri');
put(m, 2, 0, 'ev'); put(m, 2, 2, 'ev');
const c = N.hexParaCena(m, 2, 1), cv = N.hexParaCena(m, 2, 0);
ok(c.ter === 'campo' && c.rios.length === 1 && c.caminhos.some(x => x.ponte && x.t === 'estrada' && x.nivel === 3), 'a cena do hexágono da ponte: o campo da margem, o rio e a estrada pavimentada pela ponte');
ok(cv.ter === 'campo' && cv.caminhos.length === 1 && cv.caminhos[0].pts.length === 9 && cv.caminhos[0].fim === true, 'a cena do hexágono da estrada: o campo e a estrada até a borda');

// a rota pela estrada pintada
m = novo();
for (let q = -2; q <= 12; q++) for (let r = -3; r <= 3; r++) put(m, q, r, 'fl');
for (let q = 0; q <= 10; q++) put(m, q, 0, 'ev');
const a = N.centroHex(m, 0, 0), b = N.centroHex(m, 10, 0), rota = N.tracarRota(m, a, b);
ok(rota.ok && rota.custo === 20 && rota.via === 'estrada' && rota.naVia === 10, 'a rota segue a estrada pavimentada (10 hexágonos de 2 cubos) e conta como estrada: ' + rota.msg);

// num mapa de antes, a aba Terreno oferece os quatro
const antigo = N.normalizarMapa({ terrenos: N.TERRENOS_PADRAO.filter(t => !['ri', 'et', 'ep', 'ev'].includes(t.id)) });
ok(j(N.terrenosQueFaltam(antigo).map(t => t.id)) === j(['ri', 'et', 'ep', 'ev']), 'num mapa de antes, faltam os quatro');
end();
