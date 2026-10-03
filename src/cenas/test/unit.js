// Testes das partes puras: Store (operações, desfazer), Geo (visão, colisão) e parseBar.
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = ['01-base.js', '02-store.js', '03-geo.js', '07-app.js'].map(f => fs.readFileSync(path.join(__dirname, '../src/js', f), 'utf8')).join('\n');
const sandbox = {
  console, Math, JSON, Date, Number, String, Object, Array, Map, Set, Uint8Array, isFinite, parseFloat, parseInt, setTimeout, clearTimeout,
  document: { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 10 }) }) }), createElementNS: () => ({ setAttribute() {}, append() {} }) },
  Path2D: function () {}, performance: { now: () => 0 },
};
vm.createContext(sandbox);
vm.runInContext(src + '\n;globalThis.T = { Store, Geo, parseBar, newScene, newToken, normalizeScene, snapTok, gridDist, hitShape, shapeScaled, shapeBBox, Act, App, can, setSel };', sandbox);
const { Store, Geo, parseBar, newScene, newToken, snapTok, gridDist, hitShape, shapeScaled, shapeBBox, Act, App, can } = sandbox.T;

let fails = 0, n = 0;
const ok = (cond, msg) => { n++; if (!cond) { fails++; console.log('FALHOU:', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} — esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);

/* ---- Store ---- */
const sc = newScene('t');
Store.addScene(sc); Store.S.current = sc.id;
const commits = [];
Store.on('commit', e => commits.push(e));
const tk = newToken(sc, 64, 64, { name: 'A' });
Store.add('tokens', tk);
eq(sc.tokens.length, 1, 'add');
eq(commits.length, 1, 'um commit por operação solta');
// arrasto: muitas alterações, um passo só
Store.begin('Mover');
for (let i = 1; i <= 50; i++) Store.upd('tokens', tk.id, { x: 64 + i, y: 64 });
Store.upd('tokens', tk.id, { name: 'B' });
Store.commit();
eq(commits.length, 2, 'transação gera um commit');
eq(commits[1].ops.length, 1, 'alterações do mesmo objeto são unidas');
eq(commits[1].ops[0].p, { x: 114, y: 64, name: 'B' }, 'patch final unido');
Store.undo();
eq([tk.x, tk.name], [64, 'A'], 'desfazer volta ao valor original');
Store.redo();
eq([tk.x, tk.name], [114, 'B'], 'refazer reaplica');
Store.undo(); Store.undo();
eq(sc.tokens.length, 0, 'desfazer a criação remove');
ok(!Store.canUndo(), 'pilha vazia');
Store.redo(); Store.redo();
eq(sc.tokens.length, 1, 'refazer recria');
eq(sc.tokens[0].x, 114, 'objeto recriado com o estado certo');
// apagar e desfazer mantém a posição na lista
const t2 = newToken(sc, 0, 0, { name: 'C' }), t3 = newToken(sc, 0, 0, { name: 'D' });
Store.tx('x', () => { Store.add('tokens', t2); Store.add('tokens', t3); });
Store.del('tokens', t2.id);
eq(sc.tokens.map(t => t.name), ['B', 'D'], 'del');
Store.undo();
eq(sc.tokens.map(t => t.name), ['B', 'C', 'D'], 'desfazer del devolve no mesmo índice');
// ordem
Store.ord('tokens', [t3.id, tk.id, t2.id]);
eq(sc.tokens.map(t => t.name), ['D', 'B', 'C'], 'ord');
Store.undo();
eq(sc.tokens.map(t => t.name), ['B', 'C', 'D'], 'desfazer ord');
// cena
Store.scn({ light: 'escuro' });
eq(sc.light, 'escuro', 'scn');
Store.undo();
eq(sc.light, 'claro', 'desfazer scn');
// cancelar transação
Store.begin('y'); Store.upd('tokens', tk.id, { x: 999 }); Store.del('tokens', t3.id); Store.cancel();
eq([tk.x, sc.tokens.length], [114, 3], 'cancel desfaz tudo');
// add+upd+del na mesma transação
Store.tx('z', () => { const q = newToken(sc, 5, 5, { name: 'Q' }); Store.add('tokens', q); Store.upd('tokens', q.id, { x: 9 }); Store.del('tokens', q.id); });
eq(sc.tokens.length, 3, 'add+del na mesma transação');
Store.undo(); eq(sc.tokens.length, 3, 'desfazer add+del'); Store.redo(); eq(sc.tokens.length, 3, 'refazer add+del');

/* ---- Geo ---- */
ok(Geo.segHit(0, 0, 10, 0, 5, -5, 5, 5), 'segmentos que se cruzam');
ok(!Geo.segHit(0, 0, 10, 0, 5, 1, 5, 5), 'segmentos que não se cruzam');
ok(!Geo.segHit(0, 0, 10, 0, 0, 5, 10, 5), 'paralelos');
eq(Geo.distSeg(5, 5, 0, 0, 10, 0), 5, 'distância ponto-segmento');
ok(Geo.inPoly(5, 5, [0, 0, 10, 0, 10, 10, 0, 10]), 'dentro do polígono');
ok(!Geo.inPoly(15, 5, [0, 0, 10, 0, 10, 10, 0, 10]), 'fora do polígono');
const simp = Geo.simplify([0, 0, 1, 0.01, 2, 0, 3, 0.02, 4, 0], 0.5);
eq(simp, [0, 0, 4, 0], 'simplify remove pontos colineares');
// Polígono de visão: sala 100x100 com uma parede no meio; quem está à esquerda não vê o lado direito atrás da parede.
const poly = Geo.visPoly(20, 50, [50, 20, 50, 80], 0, 0, 100, 100);
ok(poly.length >= 12, 'polígono tem pontos');
ok(Geo.inPoly(40, 50, poly), 'vê antes da parede');
ok(!Geo.inPoly(80, 50, poly), 'não vê atrás da parede');
ok(Geo.inPoly(60, 4, poly), 'vê por cima da parede (quina)');
ok(Geo.inPoly(60, 96, poly), 'vê por baixo da parede (quina)');
ok(!Geo.inPoly(95, 50, poly), 'sombra continua até a borda');
// Sala fechada: nada de fora aparece
const room = [30, 30, 70, 30, 70, 30, 70, 70, 70, 70, 30, 70, 30, 70, 30, 30];
const p2 = Geo.visPoly(50, 50, room, 0, 0, 100, 100);
ok(Geo.inPoly(35, 35, p2) && !Geo.inPoly(10, 10, p2) && !Geo.inPoly(90, 50, p2), 'sala fechada limita a visão');
// Sem paredes: enxerga a caixa inteira
const p3 = Geo.visPoly(50, 50, [], 0, 0, 100, 100);
ok(Geo.inPoly(2, 2, p3) && Geo.inPoly(98, 98, p3), 'sem paredes vê tudo');
// Desempenho: 400 paredes
const many = [];
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(42);
for (let i = 0; i < 400; i++) { const x = rnd() * 2000, y = rnd() * 2000; many.push(x, y, x + (rnd() - 0.5) * 200, y + (rnd() - 0.5) * 200); }
const t0 = Date.now();
for (let i = 0; i < 10; i++) Geo.visPoly(1000.3, 1000.2, many, -64, -64, 2064, 2064);
const ms = (Date.now() - t0) / 10;
console.log(`visPoly com 400 paredes: ${ms.toFixed(1)} ms por fonte`);
ok(ms < 60, 'visPoly rápido o bastante');

/* ---- Barras, grade e formas ---- */
eq(parseBar('12', 5, 20), 12, 'valor absoluto');
eq(parseBar('+5', 5, 20), 10, 'soma');
eq(parseBar('-8', 5, 20), 0, 'subtrai sem passar de zero');
eq(parseBar('+50', 5, 20), 20, 'cura não passa do máximo');
eq(parseBar('- 3', 10, 20), 7, 'aceita espaço');
eq(parseBar('2,5', 10, 20), 2.5, 'vírgula decimal');
eq(parseBar('abc', 10, 20), null, 'texto inválido');
eq(snapTok(sc, 70, 130, 1, false), [64, 128], 'token encaixa na grade');
eq(snapTok(sc, -50, 99999, 1, false), [0, (sc.rows - 1) * sc.cell], 'token fica dentro da cena');
eq(gridDist(sc, 0, 0, 64 * 3, 64 * 4), 4, 'diagonal conta 1');
sc.grid.diag = 'eucl';
eq(gridDist(sc, 0, 0, 64 * 3, 64 * 4), 5, 'distância real');
ok(hitShape({ k: 'rect', x: 0, y: 0, w: 100, h: 100, sw: 4, f: null }, 50, 1, 3), 'retângulo vazado: borda acerta');
ok(!hitShape({ k: 'rect', x: 0, y: 0, w: 100, h: 100, sw: 4, f: null }, 50, 50, 3), 'retângulo vazado: miolo não acerta');
ok(hitShape({ k: 'rect', x: 0, y: 0, w: 100, h: 100, sw: 4, f: '#fff' }, 50, 50, 3), 'retângulo cheio: miolo acerta');
ok(hitShape({ k: 'ell', x: 0, y: 0, w: 100, h: 60, sw: 4, f: null }, 50, 0, 3), 'elipse: borda acerta');
ok(!hitShape({ k: 'ell', x: 0, y: 0, w: 100, h: 60, sw: 4, f: null }, 50, 30, 3), 'elipse: miolo não acerta');
ok(hitShape({ k: 'line', pts: [0, 0, 100, 100], sw: 4 }, 51, 49, 3), 'linha');
eq(shapeScaled({ k: 'poly', pts: [0, 0, 10, 0, 10, 10] }, { x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 20, h: 30 }), { pts: [5, 5, 25, 5, 25, 35] }, 'escala de polígono');

/* ---- Permissões ---- */
Store.S.players.push({ id: 'p1', name: 'P', color: '#fff' });
const mine = newToken(sc, 0, 0, { name: 'meu', owner: 'p1' }), npc = newToken(sc, 0, 0, { name: 'npc' });
App.viewer = 'gm';
ok(can('moveToken', npc) && can('draw') && can('fx'), 'mestre pode tudo');
App.viewer = 'p1';
ok(can('moveToken', mine), 'jogador move o próprio token');
ok(!can('moveToken', npc), 'jogador não move token do mestre');
ok(!can('draw') && !can('fx') && can('ruler') && can('ping') && !can('doors'), 'padrões das permissões');
sc.perms.mover = false;
ok(!can('moveToken', mine), 'interruptor desliga o movimento');
mine.locked = true; sc.perms.mover = true;
ok(!can('moveToken', mine), 'token travado não se move');
App.viewer = 'gm';

console.log(fails ? `\n${fails} de ${n} verificações falharam` : `\n${n} verificações passaram`);
process.exit(fails ? 1 : 0);
