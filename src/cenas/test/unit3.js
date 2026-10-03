// Testes da v3 (Tiny Cats) nas partes puras, sem navegador: paredes efetivas e o que mais for lógica pura.
const fs = require('fs'), path = require('path'), vm = require('vm');
const FILES = ['01-base.js', '02-store.js', '03-geo.js', '03b-walls.js', '07-app.js'];
const src = FILES.map(f => fs.readFileSync(path.join(__dirname, '../src/js', f), 'utf8')).join('\n');
const toasts = [];
// Dado viciado: quando a fila tem números, getRandomValues os entrega na ordem; vazia, sorteia de verdade.
const dice = [];
const sandbox = {
  console, Math, JSON, Date, Number, String, Object, Array, Map, Set, Uint8Array, Uint32Array, isFinite, parseFloat, parseInt, setTimeout, clearTimeout,
  document: { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 10 }), isPointInPath: () => false }) }), createElementNS: () => ({ setAttribute() {}, append() {} }) },
  Path2D: function () {}, performance: { now: () => 0 },
  Render: { request() {} }, UI: { toast: (t, o) => toasts.push(o && o.action ? t + ' [' + o.action + ']' : t) }, Tools: { undo() {} },
  FX: { P: { fogo: { n: 'Fogo' }, gelo: { n: 'Gelo' } } },
  crypto: { getRandomValues(buf) { buf[0] = dice.length ? dice.shift() : Math.floor(Math.random() * 4294967296); return buf; } },
};
vm.createContext(sandbox);
vm.runInContext(src + `\n;globalThis.T = { Store, Geo, Walls, newScene, newToken, normalizeScene, Act, App, can, setSel, cleanBar, uid,
  isOpening, wallOpen, wallBlocksSight, wallBlocksMove, PERMS, Ext, rollDie, clampTurns, clampIni, turnLabel, turnSort, rollText, cleanApply, applyLabel };`, sandbox);
const { Store, Geo, Walls, newScene, newToken, normalizeScene, Act, App, can, setSel, cleanBar, uid, isOpening, wallOpen, wallBlocksSight, wallBlocksMove, PERMS,
  Ext, rollDie, clampTurns, clampIni, turnLabel, turnSort, rollText, cleanApply, applyLabel } = sandbox.T;

let fails = 0, n = 0;
const ok = (cond, msg) => { n++; if (!cond) { fails++; console.log('FALHOU:', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} — esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);
const r1 = v => Math.round(v * 10) / 10;
const flat = a => Array.from(a).map(r1);

/* ============ Item 6: abertura em cima de parede tira aquele trecho da parede ============ */
{
  const sc = newScene('paredes');
  Store.addScene(sc); Store.setCurrent(sc.id);
  const W = (id, k, x1, y1, x2, y2, extra) => Object.assign({ id, k, x1, y1, x2, y2, open: false, locked: false, secret: false }, extra);
  const set = list => { Store.tx('x', () => { for (const w of sc.walls.slice()) Store.del('walls', w.id); for (const w of list) Store.add('walls', w); }); return Walls.of(sc); };
  const pieces = (d, id) => (d.pieces.get(id) || []).map(q => q.map(r1));

  eq([isOpening({ k: 'wall' }), isOpening({ k: 'door' }), isOpening({ k: 'door', secret: true }), isOpening({ k: 'window' }), isOpening({ k: 'veil' }), isOpening({ k: 'grade' })], [false, true, true, true, true, false], 'abertura: porta, porta secreta, janela e cortina');

  let d = set([W('a', 'wall', 0, 0, 300, 0)]);
  eq([pieces(d, 'a'), flat(d.sight), flat(d.move)], [[[0, 0, 300, 0]], [0, 0, 300, 0], [0, 0, 300, 0]], 'parede sozinha: inteira para a visão e para a passagem');

  // o caso do defeito: janela desenhada em cima da parede
  d = set([W('a', 'wall', 0, 0, 300, 0), W('j', 'window', 100, 0, 200, 0)]);
  eq(pieces(d, 'a'), [[0, 0, 100, 0], [200, 0, 300, 0]], 'janela sobre a parede: sobram os dois lados da parede');
  eq(flat(d.sight), [0, 0, 100, 0, 200, 0, 300, 0], '… e a visão passa pelo vão da janela');
  eq(flat(d.move), [0, 0, 100, 0, 200, 0, 300, 0, 100, 0, 200, 0], '… mas a janela fechada continua barrando a passagem');
  ok(!d.pieces.has('j'), 'a abertura não tem "restos": vale o trecho inteiro dela');
  const poly = Geo.visPoly(150.3, -60.2, d.sightAll, -400, -400, 700, 400);
  ok(Geo.inPoly(150, 80, poly) && !Geo.inPoly(-100, 80, poly) && !Geo.inPoly(400, 80, poly), 'quem olha de frente vê através da janela, e não através da parede dos lados');
  ok(Walls.blocksMove(sc, 150, -60, 150, 60) && Walls.blocksMove(sc, 40, -60, 40, 60), 'atravessar pela janela fechada ou pela parede: barrado');
  eq(JSON.parse(JSON.stringify(sc.walls)).map(w => [w.id, w.x1, w.x2]), [['a', 0, 300], ['j', 100, 200]], 'os dados salvos não mudam (a parede continua inteira no arquivo)');

  // porta sobre a parede: fechada barra, aberta abre o vão de verdade
  d = set([W('a', 'wall', 0, 0, 300, 0), W('p', 'door', 100, 0, 200, 0)]);
  eq([flat(d.sight), flat(d.move)], [[0, 0, 100, 0, 200, 0, 300, 0, 100, 0, 200, 0], [0, 0, 100, 0, 200, 0, 300, 0, 100, 0, 200, 0]], 'porta fechada sobre a parede: barra visão e passagem');
  Store.tx('x', () => Store.upd('walls', 'p', { open: true }));
  d = Walls.of(sc);
  eq([flat(d.sight), flat(d.move)], [[0, 0, 100, 0, 200, 0, 300, 0], [0, 0, 100, 0, 200, 0, 300, 0]], 'porta aberta sobre a parede: o vão fica livre (antes a parede de baixo continuava barrando)');
  ok(!Walls.blocksMove(sc, 150, -60, 150, 60) && Walls.blocksMove(sc, 250, -60, 250, 60), 'passa pela porta aberta, não pela parede ao lado');

  // porta secreta: para a visão e a passagem, igual a uma parede
  d = set([W('a', 'wall', 0, 0, 300, 0), W('s', 'door', 100, 0, 200, 0, { secret: true })]);
  eq(pieces(d, 'a'), [[0, 0, 100, 0], [200, 0, 300, 0]], 'porta secreta também corta a parede de baixo');
  ok(Walls.blocksMove(sc, 150, -60, 150, 60) && !Geo.inPoly(150, 80, Geo.visPoly(150.3, -60.2, d.sightAll, -400, -400, 700, 400)), '… e barra como parede: nada passa, nada se vê');

  // limites da regra
  d = set([W('a', 'wall', 0, 0, 100, 0), W('p', 'door', 100, 0, 164, 0)]);
  eq(pieces(d, 'a'), [[0, 0, 100, 0]], 'porta em sequência (só encosta na ponta): não corta nada');
  d = set([W('a', 'wall', 0, 0, 100, 0), W('p', 'door', 98.5, 0, 164, 0)]);
  eq(pieces(d, 'a'), [[0, 0, 100, 0]], 'sobreposição de 1,5 px: não conta');
  d = set([W('a', 'wall', 0, 0, 100, 0), W('p', 'door', 90, 0, 164, 0)]);
  eq(pieces(d, 'a'), [[0, 0, 90, 0]], 'sobreposição de 10 px: corta');
  d = set([W('a', 'wall', 0, 0, 300, 0), W('j', 'window', 100, 3, 200, 3)]);
  eq(pieces(d, 'a').length, 2, 'janela 3 px fora da linha: ainda vale como "em cima"');
  // … e a abertura um pouco fora da linha não deixa fresta: o resto da parede termina na ponta da própria abertura
  // (sala fechada dos lados, para o outro lado só poder ser visto ATRAVÉS da parede de baixo)
  const sides = [W('l', 'wall', 0, -400, 0, 0), W('r', 'wall', 300, -400, 300, 0)];
  d = set([W('a', 'wall', 0, 0, 300, 0), W('p', 'door', 100, 3, 200, 3)].concat(sides));
  eq(pieces(d, 'a'), [[0, 0, 100, 3], [200, 3, 300, 0]], 'porta 3 px fora da linha: os restos da parede vão até as pontas da porta');
  const leaks = (from, segs) => { const poly = Geo.visPoly(from[0] + 0.3, from[1] + 0.2, segs, -400, -400, 700, 400); let n = 0; for (const y of [40, 80, 200]) for (let x = -150; x <= 450; x += 1) if (Geo.inPoly(x + 0.5, y, poly)) n++; return n; };
  eq([[150, -60], [60, -30], [240, -8], [100, -2], [200.5, -40]].map(v => leaks(v, d.sightAll)), [0, 0, 0, 0, 0], 'porta fechada 3 px fora da linha: de nenhum ponto se vê o outro lado (sem fresta entre a parede e a porta)');
  ok(Walls.blocksMove(sc, 100.2, 1.5, 99, 10) && Walls.blocksMove(sc, 199.8, 1.5, 201, 10), '… e ninguém atravessa pela fresta que ficaria nas pontas');
  Store.tx('x', () => Store.upd('walls', 'p', { open: true }));
  const openPoly = Geo.visPoly(150.3, -59.8, Walls.of(sc).sightAll, -400, -400, 700, 400);
  ok(Geo.inPoly(150, 80, openPoly) && Geo.inPoly(80, 40, openPoly) && !Geo.inPoly(20, 40, openPoly) && !Geo.inPoly(280, 40, openPoly), 'aberta, vê-se pelo vão dela (e só por ele)');
  d = set([W('a', 'wall', 0, 0, 300, 0), W('j', 'window', 40, -2, 100, -2), W('p', 'door', 180, 3, 320, 3)]);
  eq(pieces(d, 'a'), [[0, 0, 40, -2], [100, -2, 180, 3]], 'duas aberturas fora da linha: cada resto liga as pontas das aberturas vizinhas; a que passa do fim da parede não deixa resto');
  d = set([W('a', 'wall', 0, 0, 300, 0), W('j', 'window', 100, 2, 200, 2), W('c', 'veil', 120, -3, 240, -3)]);
  eq(pieces(d, 'a'), [[0, 0, 100, 2], [240, -3, 300, 0]], 'aberturas que se sobrepõem: o corte é um só, e cada lado termina na ponta da abertura que chega mais longe');
  d = set([W('a', 'wall', 0, 0, 300, 0), W('j', 'window', 100, 6, 200, 6)]);
  eq(pieces(d, 'a'), [[0, 0, 300, 0]], 'janela 6 px fora da linha: é outra parede, não corta');
  d = set([W('a', 'wall', 0, 0, 300, 0), W('j', 'window', 150, -50, 150, 50)]);
  eq(pieces(d, 'a'), [[0, 0, 300, 0]], 'abertura perpendicular, cruzando: não corta');
  d = set([W('a', 'wall', 0, 0, 300, 0), W('j', 'window', 100, -20, 200, 20)]);
  eq(pieces(d, 'a'), [[0, 0, 300, 0]], 'abertura inclinada, cruzando: não corta');
  d = set([W('a', 'wall', 0, 0, 300, 0), W('j', 'window', 200, 0, 100, 0)]);
  eq(pieces(d, 'a'), [[0, 0, 100, 0], [200, 0, 300, 0]], 'abertura desenhada no sentido contrário: mesmo resultado');
  d = set([W('a', 'wall', 100, 0, 200, 0), W('p', 'door', 0, 0, 300, 0)]);
  eq([pieces(d, 'a'), d.pieces.has('a')], [[], true], 'abertura maior que a parede: a parede some inteira (lista vazia de restos)');
  d = set([W('a', 'wall', 0, 0, 300, 0), W('j', 'window', 40, 0, 100, 0), W('p', 'door', 180, 0, 240, 0)]);
  eq(pieces(d, 'a'), [[0, 0, 40, 0], [100, 0, 180, 0], [240, 0, 300, 0]], 'duas aberturas na mesma parede: três restos');
  d = set([W('a', 'wall', 0, 0, 300, 0), W('j', 'window', 100, 0, 298, 0)]);
  eq(pieces(d, 'a'), [[0, 0, 100, 0]], 'sobra de 2 px na ponta não vira um caco de parede');
  d = set([W('a', 'wall', 0, 0, 300, 400), W('j', 'window', 60, 80, 180, 240)]);
  eq(pieces(d, 'a'), [[0, 0, 60, 80], [180, 240, 300, 400]], 'parede na diagonal com janela ao longo dela');
  d = set([W('a', 'wall', 0, 0, 300, 0), W('b', 'wall', 100, 0, 200, 0)]);
  eq([pieces(d, 'a'), pieces(d, 'b')], [[[0, 0, 300, 0]], [[100, 0, 200, 0]]], 'parede sobre parede não corta nada (só abertura corta)');

  // aberturas empilhadas: cada uma vale pela própria regra; a parede é cortada uma vez só
  d = set([W('a', 'wall', 0, 0, 300, 0), W('j', 'window', 100, 0, 200, 0), W('c', 'veil', 100, 0, 200, 0)]);
  eq(pieces(d, 'a'), [[0, 0, 100, 0], [200, 0, 300, 0]], 'janela + cortina sobre a parede: um corte só');
  eq([d.curtains.map(w => w.id), flat(d.sight), flat(d.sightAll).slice(-4), flat(d.move).slice(-4)], [['c'], [0, 0, 100, 0, 200, 0, 300, 0], [100, 0, 200, 0], [100, 0, 200, 0]],
    'a cortina fechada entra na visão à parte (depende de quem olha); a janela fechada, na passagem');
  ok(Walls.blocksMove(sc, 150, -60, 150, 60) && !Geo.inPoly(150, 80, Geo.visPoly(150.3, -160.2, d.sightAll, -400, -400, 700, 400)), 'janela + cortina fechadas: não passa (janela) e, de longe, não vê (cortina)');

  // apagar a abertura devolve a parede inteira; o cache acompanha cada alteração feita pelo Store
  d = set([W('a', 'wall', 0, 0, 300, 0), W('j', 'window', 100, 0, 200, 0)]);
  ok(Walls.of(sc) === d, 'sem mudança nas paredes, o resultado guardado é reaproveitado');
  Store.tx('x', () => Store.upd('tokens', 'nada', { x: 1 }));
  Store.tx('x', () => Store.scn({ tone: 'noite' }));
  ok(Walls.of(sc) === d, 'mudar outra coisa na cena não refaz as paredes');
  Store.tx('x', () => Store.del('walls', 'j'));
  const whole = Walls.of(sc);
  ok(whole !== d, 'apagar a abertura invalida o resultado guardado');
  eq(pieces(whole, 'a'), [[0, 0, 300, 0]], 'apagada a janela, a parede volta inteira');
  Store.undo();
  eq(pieces(Walls.of(sc), 'a'), [[0, 0, 100, 0], [200, 0, 300, 0]], 'desfazer devolve a janela e o corte');
  Store.tx('x', () => Store.upd('walls', 'j', { x1: 150 }));
  eq(pieces(Walls.of(sc), 'a'), [[0, 0, 150, 0], [200, 0, 300, 0]], 'mover a ponta da abertura refaz o corte');
  const before = Walls.of(sc);
  sc.walls[1].x1 = 100;                       // por fora do Store: precisa avisar
  ok(Walls.of(sc) === before, 'alteração por fora do Store não é percebida sozinha');
  Walls.invalidate();
  eq(pieces(Walls.of(sc), 'a'), [[0, 0, 100, 0], [200, 0, 300, 0]], 'Walls.invalidate() resolve');

  // a tolerância acompanha o tamanho do quadrado
  Store.tx('x', () => Store.scn({ cell: 128 }));
  d = set([W('a', 'wall', 0, 0, 600, 0), W('j', 'window', 200, 6, 400, 6)]);
  eq(pieces(d, 'a').length, 2, 'quadrado de 128 px: 6 px fora da linha ainda é "em cima" (tolerância proporcional)');
  Store.tx('x', () => Store.scn({ cell: 64 }));
  eq(pieces(Walls.of(sc), 'a').length, 1, 'de volta ao quadrado de 64 px, os mesmos 6 px já não valem');

  // desempenho: 300 paredes e 80 aberturas
  const many = [];
  for (let i = 0; i < 300; i++) many.push(W('w' + i, 'wall', (i % 20) * 100, Math.floor(i / 20) * 100, (i % 20) * 100 + 100, Math.floor(i / 20) * 100));
  for (let i = 0; i < 80; i++) many.push(W('o' + i, ['door', 'window', 'veil'][i % 3], (i % 20) * 100 + 20, Math.floor(i / 20) * 100, (i % 20) * 100 + 60, Math.floor(i / 20) * 100));
  set(many);
  const t0 = Date.now();
  for (let i = 0; i < 20; i++) { Walls.invalidate(); Walls.of(sc); }
  const ms = (Date.now() - t0) / 20;
  console.log(`paredes efetivas, 300 paredes × 80 aberturas: ${ms.toFixed(2)} ms por reconstrução`);
  ok(ms < 20, 'reconstrução rápida o bastante');
  eq(Walls.of(sc).pieces.get('w0').map(q => q.map(r1)), [[0, 0, 20, 0], [60, 0, 100, 0]], 'e o resultado continua certo na cena grande');
  set([]);
}

/* ============ Itens 8 e 9: janela e cortina abrem e fecham; cortina fechada só deixa ver quem está encostado ============ */
{
  const sc = newScene('aberturas');
  Store.addScene(sc); Store.setCurrent(sc.id);
  Store.S.players.push({ id: 'p1', name: 'P', color: '#4fb8e0' });
  App.viewer = 'gm';
  const W = (id, k, x1, y1, x2, y2, extra) => Object.assign({ id, k, x1, y1, x2, y2, open: false, locked: false, secret: false }, extra);
  const set = list => { Store.tx('x', () => { for (const w of sc.walls.slice()) Store.del('walls', w.id); for (const w of list) Store.add('walls', w); }); return Walls.of(sc); };
  const tok = (x, y, size) => newToken(sc, x, y, { name: 'V', size: size || 1, owner: 'p1' });

  // a tabela, pelos predicados: [barra a visão, barra a passagem]
  const kinds = { parede: { k: 'wall' }, 'porta fechada': { k: 'door' }, 'porta aberta': { k: 'door', open: true }, 'secreta fechada': { k: 'door', secret: true }, 'secreta aberta': { k: 'door', secret: true, open: true },
    'janela fechada': { k: 'window' }, 'janela aberta': { k: 'window', open: true }, 'cortina fechada': { k: 'veil' }, 'cortina aberta': { k: 'veil', open: true } };
  const table = {};
  for (const nm in kinds) table[nm] = [wallBlocksSight(kinds[nm]), wallBlocksMove(kinds[nm])];
  eq(table, { parede: [true, true], 'porta fechada': [true, true], 'porta aberta': [false, false], 'secreta fechada': [true, true], 'secreta aberta': [false, false],
    'janela fechada': [false, true], 'janela aberta': [false, false], 'cortina fechada': [true, false], 'cortina aberta': [false, false] }, 'tabela do que cada tipo barra: [visão, passagem]');
  eq([wallBlocksSight({ k: 'wall', open: true }), wallBlocksMove({ k: 'wall', open: true }), wallOpen({ k: 'wall', open: true })], [true, true, false], 'parede comum não "abre", mesmo com um open perdido nos dados');

  // a mesma tabela pelo ajudante, com o trecho sozinho no mapa (quem olha está longe)
  const far = tok(0, 200), probe = {};
  for (const nm in kinds) {
    const d = set([W('m', kinds[nm].k, 300, 0, 300, 500, kinds[nm])]);
    const poly = Geo.visPoly(32.3, 232.2, Walls.sightFor(sc, far), -100, -100, 700, 600);
    probe[nm] = [!Geo.inPoly(500, 232, poly), Walls.blocksMove(sc, 32, 232, 500, 232), d.curtains.length];
  }
  eq(probe, { parede: [true, true, 0], 'porta fechada': [true, true, 0], 'porta aberta': [false, false, 0], 'secreta fechada': [true, true, 0], 'secreta aberta': [false, false, 0],
    'janela fechada': [false, true, 0], 'janela aberta': [false, false, 0], 'cortina fechada': [true, false, 1], 'cortina aberta': [false, false, 0] }, 'na prática, de longe: [não vê além, não passa, cortinas fechadas]');

  // item 9: encostado = centro do token a até (tamanho × quadrado ÷ 2 + 0,75 quadrado) da cortina
  const cur = W('c', 'veil', 300, 0, 300, 500);
  set([cur]);
  const at = (dist, size) => tok(300 - dist - (size || 1) * 32, 200, size);          // centro a `dist` px da cortina
  eq([Walls.curtainNear(at(32), cur, 64), Walls.curtainNear(at(80), cur, 64), Walls.curtainNear(at(80.5), cur, 64), Walls.curtainNear(at(96), cur, 64)], [true, true, false, false],
    'token de 1 quadrado: encostado até 80 px (32 + 48); 80,5 px já não é');
  eq([Walls.curtainNear(at(112, 2), cur, 64), Walls.curtainNear(at(112.5, 2), cur, 64)], [true, false], 'token de 2 quadrados: até 112 px (64 + 48)');
  eq([Walls.curtainNear(at(64, 0.5), cur, 64), Walls.curtainNear(at(64.5, 0.5), cur, 64)], [true, false], 'token de meio quadrado: até 64 px (16 + 48)');
  const pastEnd = newToken(sc, 300 - 32 + 40, 500 + 40 - 32, { name: 'Q', size: 1 });                   // na diagonal da ponta de baixo
  eq([Walls.curtainNear(pastEnd, cur, 64), r1(Math.hypot(40, 40))], [true, 56.6], 'a distância é até o trecho (vale a ponta): 56,6 px da quina também é encostado');
  const d0 = Walls.of(sc);
  ok(Walls.sightFor(sc, at(96)) === d0.sightAll && Walls.sightFor(sc, at(96)).length === 4, 'longe: a cortina fechada entra no que barra a visão dele');
  eq(flat(Walls.sightFor(sc, at(32))), [], 'encostado: a cortina sai da lista só para ele');
  const seesBeyond = t => Geo.inPoly(500, 232, Geo.visPoly(t.x + t.size * 32 + 0.31, t.y + t.size * 32 + 0.17, Walls.sightFor(sc, t), -100, -100, 700, 600));
  eq([seesBeyond(at(32)), seesBeyond(at(80)), seesBeyond(at(81)), seesBeyond(at(200))], [true, true, false, false], 'o polígono de visão segue a regra dos dois lados do limite');
  // duas cortinas: cada uma conta por si
  const c2 = W('c2', 'veil', 600, 0, 600, 500);
  set([cur, c2]);
  eq(flat(Walls.sightFor(sc, at(32))), [600, 0, 600, 500], 'encostado numa cortina e longe da outra: só a de longe barra');
  ok(Walls.of(sc).curtains.length === 2 && Walls.of(sc).sightAll.length === 8, 'para a luz, as duas cortinas fechadas barram sempre');
  Store.tx('x', () => Store.upd('walls', 'c', { open: true }));
  eq([Walls.of(sc).curtains.map(w => w.id), seesBeyond(at(200))], [['c2'], true], 'cortina aberta sai da conta para todo mundo');

  // cortina sobre janela sobre parede: [de longe vê além, encostado vê além, passa]
  const combo = (jOpen, cOpen) => {
    set([W('a', 'wall', 300, 0, 300, 500), W('j', 'window', 300, 200, 300, 264, { open: jOpen }), W('c', 'veil', 300, 200, 300, 264, { open: cOpen })]);
    return [seesBeyond(at(200)), seesBeyond(at(32)), !Walls.blocksMove(sc, 100, 232, 500, 232)];
  };
  eq({ ff: combo(false, false), af: combo(true, false), fa: combo(false, true), aa: combo(true, true) },
    { ff: [false, true, false], af: [false, true, true], fa: [true, true, false], aa: [true, true, true] },
    'janela + cortina (j/c: f fechada, a aberta): a visão é a da cortina; a passagem, a da janela');
  ok(Walls.blocksMove(sc, 100, 100, 500, 100), 'fora do vão, a parede continua barrando');

  // dados antigos: janela e cortina sem os campos novos carregam fechadas e destrancadas
  const old = normalizeScene({ id: 'v', name: 'v', tokens: [], shapes: [], lights: [], effects: [], fogOps: [], walls: [{ id: 'j', k: 'window', x1: 0, y1: 0, x2: 9, y2: 0 }, { id: 'c', k: 'veil', x1: 0, y1: 0, x2: 9, y2: 0, open: 1 }, { id: 'w', k: 'window', x1: 0, y1: 0, x2: 9, y2: 0, secret: true }] });
  eq(old.walls.map(w => [w.k, w.open, w.locked, w.secret]), [['window', false, false, false], ['veil', true, false, false], ['window', false, false, false]], 'normalizeScene: open, locked e secret viram sim/não; só porta pode ser secreta');
  ok(/janelas e cortinas/.test(PERMS.find(p => p[0] === 'portas')[1]), 'a permissão de portas agora fala de janelas e cortinas');

  // abrir pelo ícone: mestre sempre; jogador com a permissão e sem tranca; aviso com o tipo
  toasts.length = 0;
  set([W('j', 'window', 0, 0, 64, 0), W('c', 'veil', 0, 64, 64, 64, { locked: true }), W('p', 'door', 0, 128, 64, 128)]);
  const g = id => Store.get('walls', id);
  Act.toggleDoor(g('j')); Act.toggleDoor(g('c')); Act.toggleDoor(g('p'));
  eq([g('j').open, g('c').open, g('p').open, toasts], [true, true, true, ['Janela aberta [Desfazer]', 'Cortina aberta [Desfazer]', 'Porta aberta [Desfazer]']], 'mestre abre os três (até a trancada), cada um com o seu aviso');
  Act.toggleDoor(g('j')); Act.toggleDoor(g('c'));
  eq([g('j').open, g('c').open, toasts.slice(3)], [false, false, ['Janela fechada [Desfazer]', 'Cortina fechada [Desfazer]']], 'e fecha');
  Store.undo();
  eq(g('c').open, true, 'cada abrir ou fechar é um passo de desfazer');
  Store.redo();
  App.viewer = 'p1'; toasts.length = 0;
  sc.perms.portas = false;
  Act.toggleDoor(g('j')); Act.toggleDoor(g('c'));
  eq([g('j').open, g('c').open, toasts], [false, false, ['O mestre não liberou abrir janelas nesta cena.', 'O mestre não liberou abrir cortinas nesta cena.']], 'jogador sem a permissão: nada muda, e o aviso diz o quê');
  sc.perms.portas = true; toasts.length = 0;
  Act.toggleDoor(g('j')); Act.toggleDoor(g('c'));
  eq([g('j').open, g('c').open, toasts], [true, false, ['Janela aberta [Desfazer]', 'Está trancada.']], 'jogador com a permissão: abre a janela; a cortina trancada, não');
  App.viewer = 'gm';
  set([]);
}

/* ============ Itens 1, 2 e 4: turnos por rodada, iniciativa 1d20 + bônus, entrada avulsa ============ */
{
  App.viewer = 'gm';
  // dado: de 1 a n, com descarte do que desequilibraria; sem crypto, Math.random
  const D = v => v - 1;                                    // valor do sorteio que faz o d20 dar v
  dice.push(0, 19, 20, 4294967279); 
  eq([rollDie(20), rollDie(20), rollDie(20), rollDie(20)], [1, 20, 1, 20], 'rollDie: o sorteio vira 1 + (valor % n)');
  dice.push(4294967280, 4294967295, 6);                    // os dois primeiros caem na sobra (2^32 não é múltiplo de 20) e são descartados
  eq([rollDie(20), dice.length], [7, 0], 'rollDie: valores da sobra são descartados e o sorteio é refeito');
  dice.push(5); eq(rollDie(6), 6, 'rollDie serve para qualquer dado');
  const tally = new Array(21).fill(0);
  for (let i = 0; i < 40000; i++) tally[rollDie(20)]++;
  ok(tally[0] === 0 && tally.slice(1).every(c => c > 1700 && c < 2300), 'rollDie(20): só sai de 1 a 20, e todos com frequência parecida — ' + Math.min(...tally.slice(1)) + ' a ' + Math.max(...tally.slice(1)) + ' em 40000');
  const keep = sandbox.crypto; sandbox.crypto = undefined;
  const fb = Array.from({ length: 300 }, () => rollDie(20));
  ok(fb.every(v => Number.isInteger(v) && v >= 1 && v <= 20) && new Set(fb).size > 10, 'sem crypto, o dado cai no Math.random e continua de 1 a 20');
  sandbox.crypto = { getRandomValues() { throw new Error('bloqueado'); } };
  ok([rollDie(20), rollDie(20)].every(v => v >= 1 && v <= 20), 'crypto que falha não derruba a rolagem');
  sandbox.crypto = keep;
  eq([clampTurns(0), clampTurns(1), clampTurns(4), clampTurns(9), clampTurns('x'), clampTurns(2.6), clampIni(150), clampIni(-200), clampIni('3'), clampIni(null), clampIni(2.5)], [1, 1, 4, 4, 1, 3, 99, -99, 3, 0, 3], 'limites: turnos de 1 a 4, iniciativa de −99 a 99, sempre inteiros');
  eq([rollText(12, 5), rollText(12, -2), rollText(7, 0)], ['12 + 5', '12 − 2', '7 + 0'], 'texto da rolagem');
  eq([turnLabel({ k: 1 }, 'Capitão'), turnLabel({}, 'Capitão'), turnLabel({ k: 2 }, 'Capitão'), turnLabel({ k: 4 }, 'Capitão')], ['Capitão', 'Capitão', 'Capitão · 2º turno', 'Capitão · 4º turno'], 'rótulo: nome puro no 1º turno, "Nome · 2º turno" nos outros');

  const sc = newScene('combate');
  Store.addScene(sc); Store.setCurrent(sc.id);
  const mk = (name, extra) => { const t = newToken(sc, 0, 0, Object.assign({ name }, extra)); Store.add('tokens', t); return t; };
  const ana = mk('Ana', { ini: 5 }), bob = mk('Bob', { ini: 2 }), chefe = mk('Chefe', { ini: 3, turns: 2, conds: ['escudo'], cinfo: { escudo: { d: 2, d0: 2 } } });
  eq([newToken(sc, 0, 0).ini, newToken(sc, 0, 0).turns], [0, 1], 'token novo: iniciativa 0 e um turno por rodada');
  const L = () => sc.turn.list.map(e => turnLabel(e, e.token ? Store.get('tokens', e.token).name : e.name));
  const ent = (tok, k) => sc.turn.list.find(e => e.token === tok.id && e.k === k);
  const hist = () => { let c = 0; while (Store.canUndo()) { Store.undo(); c++; } for (let i = 0; i < c; i++) Store.redo(); return c; };

  /* ---- item 1: chefe com mais de um turno ---- */
  eq(Act.turnAdd([ana, bob, chefe]), 3, 'turnAdd conta tokens, não entradas');
  eq(L(), ['Ana', 'Bob', 'Chefe', 'Chefe · 2º turno'], 'o chefe de 2 turnos entra com duas entradas');
  eq(sc.turn.list.map(e => [e.k, e.init, e.roll]), [[1, null, null], [1, null, null], [1, null, null], [2, null, null]], 'entradas novas: k, sem iniciativa e sem rolagem');
  eq([Act.turnAdd([chefe, ana]), sc.turn.list.length], [0, 4], 'adicionar de novo não duplica');
  // aumentar e diminuir com o token já na ordem: no mesmo passo de desfazer
  let steps = hist();
  ok(Act.tokenTurns(chefe, 4), 'tokenTurns devolve verdadeiro quando muda');
  eq([chefe.turns, L()], [4, ['Ana', 'Bob', 'Chefe', 'Chefe · 2º turno', 'Chefe · 3º turno', 'Chefe · 4º turno']], 'turnos 2 → 4: duas entradas a mais, no fim');
  eq(hist(), steps + 1, '… num passo de desfazer só');
  Store.undo();
  eq([chefe.turns, L().length], [2, 4], 'desfazer devolve o número e a lista juntos');
  Store.redo();
  Act.tokenTurns(chefe, 9);
  eq(chefe.turns, 4, 'não passa de 4');
  ok(!Act.tokenTurns(chefe, 4), 'pedir o mesmo número não cria passo');
  const third = ent(chefe, 3).id;
  Act.turnPatch(x => { x.on = true; x.cur = third; });
  Act.tokenTurns(chefe, 2);
  eq([chefe.turns, L()], [2, ['Ana', 'Bob', 'Chefe', 'Chefe · 2º turno']], 'turnos 4 → 2: saem as de número mais alto');
  eq(sc.turn.cur, sc.turn.list[0].id, 'a entrada da vez sumiu e era a última: a vez vai para a primeira');
  Store.undo();
  Act.turnPatch(x => { x.cur = x.list.find(e => e.token === chefe.id && e.k === 3).id; x.list.push(x.list.splice(1, 1)[0]); });      // Bob para o fim, depois dos turnos do chefe
  eq(L(), ['Ana', 'Chefe', 'Chefe · 2º turno', 'Chefe · 3º turno', 'Chefe · 4º turno', 'Bob'], 'ordem rearranjada à mão');
  Act.tokenTurns(chefe, 2);
  eq([L(), turnLabel(sc.turn.list.find(e => e.id === sc.turn.cur), 'x')], [['Ana', 'Chefe', 'Chefe · 2º turno', 'Bob'], 'x'], 'lista depois de diminuir');
  eq(sc.turn.cur, sc.turn.list[3].id, 'a entrada da vez sumiu: a vez passa para a entrada seguinte (Bob), não volta ao começo');
  // tirar UMA entrada extra pelo botão: só ela sai, e o número do token desce
  steps = hist();
  const lowered = Act.turnRemove(ent(chefe, 1).id);
  eq([lowered && lowered.id === chefe.id, chefe.turns, L()], [true, 1, ['Ana', 'Chefe', 'Bob']], 'tirar o 1º turno do chefe: sobra um só, renumerado para 1º, e "turnos por rodada" desce para 1');
  eq(hist(), steps + 1, '… num passo só');
  Store.undo();
  eq([chefe.turns, L()], [2, ['Ana', 'Chefe', 'Chefe · 2º turno', 'Bob']], 'desfazer devolve a entrada e o número');
  eq([Act.turnRemove(ent(bob, 1).id), bob.turns, L()], [null, 1, ['Ana', 'Chefe', 'Chefe · 2º turno']], 'tirar quem tem um turno só: sai da ordem e o número dele não muda');
  Store.undo();
  eq(Act.turnRemove('nao-existe'), null, 'entrada que não existe: nada acontece');

  // durações: uma vez por RODADA por combatente, mesmo com dois turnos
  Act.turnPatch(x => { x.on = true; x.round = 1; x.cur = x.list[0].id; x.back = 0; });
  eq(L(), ['Ana', 'Chefe', 'Chefe · 2º turno', 'Bob'], 'ordem do combate');
  const fx = { id: uid('fx'), fx: 'fogo', k: 'circ', x: 0, y: 0, r: 1, dur: 2, dur0: 2, at: ent(chefe, 2).id, token: null };
  Store.tx('x', () => Store.add('effects', fx));
  const trail = [];
  for (let i = 0; i < 8; i++) { const ended = Act.turnStep(1); const cur = sc.turn.list.find(e => e.id === sc.turn.cur); trail.push([turnLabel(cur, cur.token ? Store.get('tokens', cur.token).name : cur.name), sc.turn.round, (chefe.cinfo.escudo || {}).d || 0, sc.effects.some(e => e.id === fx.id) ? fx.dur : 0, ended.join('; ')]); }
  eq(trail, [
    ['Chefe', 1, 2, 2, ''],                       // saiu a Ana
    ['Chefe · 2º turno', 1, 1, 1, ''],            // o chefe terminou o 1º turno: a condição dele desconta; o efeito preso ao 2º turno desconta ao chegar nele
    ['Bob', 1, 1, 1, ''],                         // terminou o 2º turno: NÃO desconta de novo
    ['Ana', 2, 1, 1, ''],
    ['Chefe', 2, 1, 1, ''],
    ['Chefe · 2º turno', 2, 0, 0, 'Protegido em Chefe; efeito Fogo'],
    ['Bob', 2, 0, 0, ''],
    ['Ana', 3, 0, 0, ''],
  ], 'com dois turnos, a duração da condição desconta uma vez por rodada (ao sair do 1º turno); o efeito preso a uma entrada continua igual');
  ok(!chefe.conds.includes('escudo'), 'a condição acabou na 2ª rodada, não na 1ª');

  /* ---- item 2: iniciativa = 1d20 + bônus ---- */
  const got = [];
  Ext.roll = r => got.push(r);
  Act.turnPatch(x => { x.cur = x.list.find(e => e.token === bob.id).id; });
  const curBefore = sc.turn.cur;
  steps = hist();
  dice.push(D(12), D(4), D(18), D(9));                    // Ana 12+5 = 17; Chefe 4+3 = 7; Chefe 2º 18+3 = 21; Bob 9+2 = 11
  const res = Act.turnRoll(sc.turn.list.map(e => e.id));
  eq(res.map(r => [r.name, r.d, r.bonus, r.total]), [['Ana', 12, 5, 17], ['Chefe', 4, 3, 7], ['Chefe · 2º turno', 18, 3, 21], ['Bob', 9, 2, 11]], 'rolagem: dado + bônus de cada entrada (cada turno do chefe rola a sua)');
  eq(sc.turn.list.map(e => [turnLabel(e, Store.get('tokens', e.token).name), e.init, e.roll]), [['Chefe · 2º turno', 21, { d: 18, b: 3 }], ['Ana', 17, { d: 12, b: 5 }], ['Bob', 11, { d: 9, b: 2 }], ['Chefe', 7, { d: 4, b: 3 }]], 'a lista fica em ordem de iniciativa, a maior primeiro, e guarda { d, b }');
  eq(sc.turn.cur, curBefore, 'ordenar não muda de quem é a vez (a vez é guardada pelo id da entrada)');
  eq(hist(), steps + 1, 'uma rolagem é um passo de desfazer');
  eq(got, res.map(r => ({ kind: 'iniciativa', name: r.name, tokenId: r.tokenId, d: r.d, bonus: r.bonus, total: r.total })), 'Ext.roll recebe cada rolagem: { kind, name, tokenId, d, bonus, total }');
  ok(got.every(r => r.tokenId && r.kind === 'iniciativa') && got[2].tokenId === chefe.id, 'tokenId é o id do token da entrada');
  Store.undo();
  eq(sc.turn.list.map(e => e.init), [null, null, null, null], 'desfazer a rolagem devolve as iniciativas e a ordem de antes');
  eq(L(), ['Ana', 'Chefe', 'Chefe · 2º turno', 'Bob'], '… a ordem de antes');
  Store.redo();
  // rolar uma só
  got.length = 0; dice.push(D(20));
  const one = Act.turnRoll([ent(chefe, 1).id]);
  eq([one.length, one[0].total, got.length, L()], [1, 23, 1, ['Chefe', 'Chefe · 2º turno', 'Ana', 'Bob']], 'rolar só uma entrada mexe só nela e reordena');
  // empates: maior bônus primeiro; depois, a ordem em que já estavam
  dice.push(D(10), D(13), D(10), D(13));                  // Chefe 13, Chefe 2º 16, Ana 15, Bob 15
  Act.turnRoll(sc.turn.list.map(e => e.id));
  eq(L(), ['Chefe · 2º turno', 'Ana', 'Bob', 'Chefe'], 'empate em 15: Ana (bônus 5) antes de Bob (bônus 2)');
  Store.tx('x', () => Store.upd('tokens', bob.id, { ini: 5 }));
  dice.push(D(13), D(10), D(10), D(10));                  // Chefe 2º 16, Ana 15, Bob 15, Chefe 13  (Ana e Bob com o mesmo bônus agora)
  Act.turnRoll(sc.turn.list.map(e => e.id));
  eq(L(), ['Chefe · 2º turno', 'Ana', 'Bob', 'Chefe'], 'empate total (valor e bônus): fica a ordem em que já estavam');
  Act.turnPatch(x => { const i = x.list.findIndex(e => e.token === bob.id); const [m] = x.list.splice(i, 1); x.list.splice(1, 0, m); });
  dice.push(D(13), D(10), D(10), D(10));
  Act.turnRoll(sc.turn.list.map(e => e.id));
  eq(L(), ['Chefe · 2º turno', 'Bob', 'Ana', 'Chefe'], '… e, invertida à mão antes, a ordem invertida se mantém');
  // iniciativa digitada: continua valendo, e apaga o detalhe da rolagem daquela entrada
  Act.turnPatch(x => { const y = x.list.find(e => e.token === ana.id); y.init = 30; y.roll = null; });
  eq([ent(ana, 1).init, ent(ana, 1).roll], [30, null], 'valor digitado à mão');
  eq(turnSort(JSON.parse(JSON.stringify(sc.turn.list))).map(e => e.init), [30, 16, 15, 13], 'ordenar por iniciativa usa a mesma regra');
  eq(turnSort([{ id: 'a', init: null, bonus: 0 }, { id: 'b', init: 3, bonus: 0 }, { id: 'c', init: null, bonus: 9 }, { id: 'd', init: -4, bonus: 0 }]).map(e => e.id), ['b', 'd', 'c', 'a'], 'sem iniciativa vai para o fim (entre eles, maior bônus primeiro)');
  eq(Act.turnRoll([]).length, 0, 'rolar para ninguém não faz nada');
  // gancho com defeito não trava a mesa
  const realErr = console.error; let logged = 0; console.error = () => { logged++; };
  Ext.roll = () => { throw new Error('quem escuta falhou'); };
  dice.push(D(2));
  const safe = Act.turnRoll([ent(bob, 1).id]);
  console.error = realErr;
  eq([safe.length, ent(bob, 1).init, logged], [1, 7, 1], 'um erro em Ext.roll é registrado e a rolagem vale mesmo assim');
  Ext.roll = null;
  dice.push(D(3));
  ok(Act.turnRoll([ent(bob, 1).id]).length === 1, 'sem gancho, rola normalmente');

  /* ---- item 4: entrada avulsa com nome, bônus e turnos ---- */
  steps = hist();
  eq(Act.turnLoose('Armadilha', -1, 3), 3, 'entrada avulsa com 3 turnos');
  const loose = sc.turn.list.filter(e => !e.token);
  eq(loose.map(e => [e.name, e.k, e.bonus, e.init, e.token]), [['Armadilha', 1, -1, null, null], ['Armadilha', 2, -1, null, null], ['Armadilha', 3, -1, null, null]], 'três entradas, com o bônus próprio');
  ok(loose[0].grp && loose.every(e => e.grp === loose[0].grp), 'as três dividem o mesmo grp');
  eq(hist(), steps + 1, 'criar a entrada avulsa é um passo de desfazer');
  eq(L().slice(-3), ['Armadilha', 'Armadilha · 2º turno', 'Armadilha · 3º turno'], 'rótulos das avulsas');
  got.length = 0; Ext.roll = r => got.push(r);
  dice.push(D(20), D(1), D(6));
  Act.turnRoll(loose.map(e => e.id));
  eq(got.map(r => [r.name, r.tokenId, r.d, r.bonus, r.total]), [['Armadilha', null, 20, -1, 19], ['Armadilha · 2º turno', null, 1, -1, 0], ['Armadilha · 3º turno', null, 6, -1, 5]], 'a avulsa rola igual, com o bônus dela; tokenId vem nulo');
  Ext.roll = null;
  eq(Act.turnRemove(loose[0].id), null, 'tirar uma avulsa não mexe em token nenhum');
  eq(sc.turn.list.filter(e => !e.token).map(e => [e.k, e.init]), [[2, 5], [1, 0]], 'saiu só aquela; as que ficam são renumeradas pela ordem dos números (o 2º turno vira 1º, o 3º vira 2º), cada uma no lugar em que estava na lista');
  eq([Act.turnLoose('  ', 200, 0), sc.turn.list[sc.turn.list.length - 1].bonus], [1, 99], 'limites: pelo menos 1 turno, bônus até 99');

  // apagar um token de vários turnos tira todas as entradas dele; a vez passa adiante
  Act.turnPatch(x => { x.cur = x.list.find(e => e.token === chefe.id && e.k === 2).id; });
  const afterChefe = (() => { const i = sc.turn.list.findIndex(e => e.id === sc.turn.cur); return sc.turn.list.slice(i + 1).find(e => e.token !== chefe.id); })();
  setSel([{ c: 'tokens', id: chefe.id }]);
  Act.deleteSel();
  ok(!sc.turn.list.some(e => e.token === chefe.id), 'apagar o chefe tira os dois turnos dele da ordem');
  eq(sc.turn.cur, afterChefe.id, 'a vez era dele: passa para a entrada seguinte que sobrou');
  Store.undo();
  eq(sc.turn.list.filter(e => e.token === chefe.id).map(e => e.k).sort(), [1, 2], 'desfazer devolve o token e os dois turnos');

  // dados antigos (v1 e v2): entradas sem os campos novos
  const old = normalizeScene({ id: 'o', name: 'o', tokens: [{ id: 't1', name: 'Velho', x: 0, y: 0, turns: 7, ini: '4' }, { id: 't2', name: 'Novo', x: 0, y: 0 }], shapes: [], walls: [], lights: [], effects: [], fogOps: [],
    turn: { on: true, round: 3, cur: 'a', list: [{ id: 'a', token: 't1', name: 'Velho', init: 12 }, { id: 'b', token: null, name: 'Avulsa', init: null }, null, { id: 'c', name: 'Sem token', roll: { d: 'x' } }] } });
  eq(old.turn.list, [{ id: 'a', token: 't1', name: 'Velho', init: 12, k: 1, roll: null }, { id: 'b', token: null, name: 'Avulsa', init: null, k: 1, roll: null, bonus: 0, grp: null }, { id: 'c', name: 'Sem token', roll: null, init: null, k: 1, token: null, bonus: 0, grp: null }],
    'normalizeScene: entradas antigas ganham k = 1 e roll nulo; as avulsas, bonus 0 e grp nulo; lixo sai');
  eq(old.tokens.map(t => [t.turns, t.ini]), [[4, 4], [1, 0]], 'normalizeScene: turns e ini com padrão e dentro dos limites');
  eq([old.turn.on, old.turn.round, old.turn.cur], [true, 3, 'a'], 'o resto da ordem antiga não muda');
  const rolled = normalizeScene({ id: 'r', name: 'r', tokens: [], shapes: [], walls: [], lights: [], effects: [], fogOps: [],
    turn: { on: false, round: 1, cur: 'a', list: [{ id: 'a', token: null, name: 'A', init: 17, roll: { d: 12, b: 5 }, k: 2.7 }, { id: 'b', token: null, name: 'B', init: 9, roll: { d: 12, b: 5 }, k: 0 }, { id: 'c', token: null, name: 'C', init: 'x', roll: { d: 3, b: 0 } }] } });
  eq(rolled.turn.list.map(e => [e.init, e.roll, e.k]), [[17, { d: 12, b: 5 }, 2], [9, null, 1], [null, null, 1]], 'normalizeScene: a rolagem guardada fica se fecha com a iniciativa (12 + 5 = 17); se não fecha, o valor passa a contar como digitado');
}

/* ============ Item 10: área retangular — campos novos nos dados antigos ============ */
{
  const old = normalizeScene({ id: 'fx', name: 'fx', tokens: [], shapes: [], walls: [], lights: [], fogOps: [],
    effects: [{ id: 'a', fx: 'fogo', k: 'circ', x: 0, y: 0, r: 2.5 }, { id: 'b', fx: 'gelo', k: 'line', x: 0, y: 0, r: 4, w: 1 }, { id: 'c', fx: 'raio', k: 'rect', x: 0, y: 0, rw: 5, rh: 0.5, dir: 30 }, { id: 'd', fx: 'agua', k: 'quad', x: 0, y: 0 }] });
  eq(old.effects.map(e => [e.k, e.rw, e.rh]), [['circ', 5, 5], ['line', 8, 8], ['rect', 5, 0.5], ['quad', 2, 2]], 'normalizeScene: efeito antigo ganha rw/rh (a caixa do tamanho que já tinha); o retângulo salvo fica como está');
  eq([old.effects[1].w, old.effects[2].dir], [1, 30], 'a largura da linha (w) e a direção não são tocadas');
}

/* ============ Item 11: a aplicação em área fica guardada no efeito, para o Reaplicar ============ */
{
  App.viewer = 'gm';
  eq([cleanApply(null), cleanApply({}), cleanApply({ bar: 'Vida', amt: '' }), cleanApply({ bar: 'Vida', amt: ' 8 ' }), cleanApply({ amt: '', cond: { id: 'fogo', n: 2.4, d: -1 }, skip: ['a', 7] })],
    [null, null, null, { bar: 'Vida', amt: '8', cond: null, skip: [] }, { bar: '', amt: '', cond: { id: 'fogo', n: 2, d: 0 }, skip: ['a', '7'] }], 'cleanApply: sem valor nem condição não há o que guardar; o resto sai arrumado');
  eq([applyLabel({ bar: 'Vida', amt: '8' }), applyLabel({ bar: 'Vida', amt: '-8' }), applyLabel({ bar: 'Fé', amt: '+2' }), applyLabel({ bar: 'Vida', amt: '1,5' }), applyLabel({ bar: 'Vida', amt: '+5', cond: { id: 'bencao' } }), applyLabel({ bar: '', amt: '', cond: { id: 'fogo' } }), applyLabel(null)],
    ['−8 Vida', '−8 Vida', '+2 Fé', '−1,5 Vida', '+5 Vida + Abençoado', 'Queimando', ''], 'rótulo do que o Reaplicar vai fazer');

  const sc = newScene('area');
  Store.addScene(sc); Store.setCurrent(sc.id);
  const mk = name => { const t = newToken(sc, 0, 0, { name, bars: [cleanBar({ n: 'Vida', v: 20, m: 20 })] }); Store.add('tokens', t); return t; };
  const a = mk('A'), b = mk('B'), c = mk('C');
  const fx = { id: 'fx1', fx: 'fogo', k: 'circ', x: 0, y: 0, r: 2, token: null, apply: null };
  Store.tx('x', () => Store.add('effects', fx));
  const count = () => { let k = 0; while (Store.canUndo()) { Store.undo(); k++; } for (let i = 0; i < k; i++) Store.redo(); return k; };
  const steps = count();
  eq(Act.areaApply([{ t: a, half: false }, { t: b, half: true }], 'Vida', '8', { id: 'fogo', n: 1, d: 2 }, { id: 'fx1', skip: [c.id] }), 2, 'aplicar pela janela de um efeito: dois tokens mudam');
  eq(fx.apply, { bar: 'Vida', amt: '8', cond: { id: 'fogo', n: 1, d: 2 }, skip: [c.id] }, 'o efeito guarda a barra, o valor como digitado, a condição e quem ficou de fora (o ½ não é guardado)');
  eq([a.bars[0].v, b.bars[0].v, c.bars[0].v, count()], [12, 16, 20, steps + 1], 'tudo num passo de desfazer só');
  Store.undo();
  eq([a.bars[0].v, b.bars[0].v, fx.apply], [20, 20, null], 'desfazer devolve as barras E tira a configuração guardada');
  Store.redo();
  eq(Act.areaApply([{ t: a, half: false }], 'Vida', 'xx', null, { id: 'fx1', skip: [] }), -1, 'valor inválido: nada é aplicado');
  eq(fx.apply.amt, '8', '… e a configuração guardada não muda');
  eq(Act.areaApply([{ t: a, half: false }], 'Vida', '+3', null, { id: 'nao-existe', skip: [] }), 1, 'efeito que não existe mais: aplica nos tokens e segue');
  eq(Act.areaApply([{ t: a, half: false }], 'Vida', '-1', null), 1, 'sem efeito (aura, seleção): continua como antes, sem guardar nada');
  eq(fx.apply.amt, '8', 'a configuração do efeito continua a mesma');
  // nada a aplicar (valor vazio ou zero, sem condição): não mexe no que estava guardado nem cria passo de desfazer
  const before = count();
  eq([Act.areaApply([{ t: a, half: false }], 'Vida', '', null, { id: 'fx1', skip: [] }), Act.areaApply([{ t: a, half: false }], 'Vida', '0', null, { id: 'fx1', skip: [a.id] }), fx.apply.amt, fx.apply.skip, count()],
    [0, 0, '8', [c.id], before], 'aplicar "nada" pela janela de um efeito deixa a configuração guardada como estava');
  eq([cleanApply({ bar: 'Vida', amt: '0' }), cleanApply({ bar: 'Vida', amt: 'zz' }), cleanApply({ bar: 'Vida', amt: 'zz', cond: { id: 'fogo' } }), cleanApply({ bar: 'Vida', amt: '0', cond: { id: 'gelo', n: 1 } }), cleanApply({ bar: 'Vida', amt: '+2,5' })],
    [null, null, { bar: 'Vida', amt: '', cond: { id: 'fogo', n: 0, d: 0 }, skip: [] }, { bar: 'Vida', amt: '', cond: { id: 'gelo', n: 1, d: 0 }, skip: [] }, { bar: 'Vida', amt: '+2,5', cond: null, skip: [] }],
    'cleanApply: zero ou texto que não é número não é valor a reaplicar (sobra só a condição, se houver)');
  const old = normalizeScene({ id: 'ap', name: 'ap', tokens: [], shapes: [], walls: [], lights: [], fogOps: [], effects: [{ id: 'a', fx: 'fogo', k: 'circ', x: 0, y: 0, r: 1 }, { id: 'b', fx: 'fogo', k: 'circ', x: 0, y: 0, r: 1, apply: { bar: 'Vida', amt: '-4', skip: 'x' } }, { id: 'c', fx: 'fogo', k: 'circ', x: 0, y: 0, r: 1, apply: 'lixo' }] });
  eq(old.effects.map(e => e.apply), [null, { bar: 'Vida', amt: '-4', cond: null, skip: [] }, null], 'normalizeScene: efeito antigo fica sem configuração (apply nulo); a que existe é arrumada; lixo vira nulo');
}

console.log(fails ? `\n${fails} de ${n} verificações falharam` : `\n${n} verificações passaram`);
process.exit(fails ? 1 : 0);
