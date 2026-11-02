// Mapa-múndi (lote 57): a água e a fenda, a conta pura (mundo/nucleo.js), sem navegador:
//   · o terreno novo Lago (água doce, 10 cubos), que conta como água (a foz do rio, a cena 'agua', o encontro);
//   · o Desfiladeiro vira rede (a fenda): liga às fendas, ao rio que corre no fundo dela e a uma água; o fundo do
//     hexágono é o terreno da margem;
//   · o rio liga às fendas (passa por dentro delas); a fenda que liga a um rio leva o rio no fundo (comRio);
//   · a estrada que atravessa a fenda ganha a ponte (suspensa) e ali a fenda custa o da estrada; sem ponte, 15;
//   · a cena do hexágono de fenda é a da montanha (o desfiladeiro), e a fenda seca não vira caminho.
const { checker } = require('./lib');
const { ok, end } = checker();
const N = require('../../mundo/nucleo.js');
const j = JSON.stringify;

ok(j(N.TERRENOS_L57.map(t => [t.id, t.nome, t.custo, t.tex])) === j([['lg', 'Lago', 10, 'lago']]) && N.TEX_AGUA.lago === 1 && N.TEXTURAS.lago,
  'o Lago: água doce, 10 cubos, textura própria, e conta como água');
ok(N.mapaNovo('x').terrenos.some(t => t.id === 'lg') && N.terrenosQueFaltam(N.normalizarMapa({ terrenos: [{ id: 'pl', nome: 'Planície' }] })).some(t => t.id === 'lg'),
  'um mapa novo já tem o Lago; num mapa de antes, a aba Terreno oferece');

const novo = () => { const m = N.normalizarMapa({ id: 'agua', larg: 2000, alt: 2000, grade: { tam: 50 } }); m.hexes = {}; return m; };
const put = (m, q, r, t) => { m.hexes[q + ',' + r] = t; };

// o rio deságua no lago
let m = novo();
for (let q = -4; q <= 8; q++) for (let r = -4; r <= 8; r++) put(m, q, r, 'pl');
for (let q = 0; q <= 3; q++) put(m, q, 2, 'ri');
put(m, 4, 2, 'lg'); put(m, 5, 2, 'lg'); put(m, 4, 1, 'lg');
const fozL = N.redeDoHex(m, 3, 2);
ok(fozL.tipo === 'rio' && fozL.liga.includes(3) && fozL.liga.length === 2 && fozL.liga.some(i => i !== 3), 'o rio deságua no lago (uma água só): ' + j(fozL.liga));
ok(N.hexParaCena(m, 4, 2).ter === 'agua', 'a cena do hexágono de lago é a da água');

// a fenda: liga às fendas e ao rio; o rio passa por ela
m = novo();
for (let q = -4; q <= 8; q++) for (let r = -4; r <= 8; r++) put(m, q, r, 'fl');
put(m, 0, 2, 'ri'); put(m, 1, 2, 'df'); put(m, 2, 2, 'df'); put(m, 3, 2, 'ri'); put(m, 4, 2, 'ri');
put(m, 2, 0, 'df'); put(m, 2, 1, 'df');
const f1 = N.redeDoHex(m, 1, 2), f2 = N.redeDoHex(m, 2, 2);
ok(f1.tipo === 'fenda' && f1.liga.includes(0) && f1.liga.includes(3) && f1.comRio && f1.margem.id === 'fl', 'a fenda liga ao rio e à outra fenda; leva o rio no fundo; a margem é a floresta: ' + j(f1.liga));
ok(f2.tipo === 'fenda' && f2.liga.includes(0) && f2.liga.includes(3) && f2.comRio, 'a fenda do meio liga à fenda e ao rio (o braço do norte entra por uma delas, sem fechar triângulo): ' + j(f2.liga));
ok(!N.redeDoHex(m, 2, 0).comRio && N.redeDoHex(m, 2, 0).liga.length === 1, 'a fenda seca, na ponta, não leva o rio');
ok(N.redeDoHex(m, 0, 2).liga.includes(0) && N.redeDoHex(m, 3, 2).liga.includes(3), 'o rio liga às fendas (entra e sai por elas)');
ok(N.hexInfo(m, 1, 2).custo === 15 && N.hexParaCena(m, 1, 2).ter === 'montanha', 'a fenda custa 15; a cena dela é a do desfiladeiro (montanha)');
ok(N.hexParaCena(m, 2, 0).caminhos.length === 0 && N.hexParaCena(m, 2, 0).rios.length === 0 && N.hexParaCena(m, 1, 2).rios.length > 0, 'a fenda seca não vira caminho nem rio; a com o rio leva o rio para a cena');

// a ponte suspensa: a estrada que atravessa a fenda
m = novo();
for (let q = -4; q <= 8; q++) for (let r = -4; r <= 8; r++) put(m, q, r, 'pl');
for (let r = 0; r <= 4; r++) put(m, 2, r, 'df');
put(m, 1, 2, 'et'); put(m, 0, 2, 'et'); put(m, 3, 2, 'et'); put(m, 4, 2, 'et');
const p = N.redeDoHex(m, 2, 2);
ok(p.tipo === 'fenda' && p.ponte && j([p.ponte.a, p.ponte.b]) === j([0, 3]) && N.hexInfo(m, 2, 2).custo === 4 && N.hexInfo(m, 2, 2).de === 'ponte',
  'a estrada que atravessa a fenda dá a ponte; ali a fenda custa o da estrada (4)');
ok(N.redeDoHex(m, 1, 2).liga.includes(0) && N.redeDoHex(m, 3, 2).liga.includes(3) && N.hexInfo(m, 2, 1).custo === 15, 'a estrada liga à ponte dos dois lados; a fenda sem ponte, 15');

end();
