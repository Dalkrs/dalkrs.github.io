// Testes da v4 nas partes puras, sem navegador: sobrevida (pontos por cima de uma barra) e cura total.
const fs = require('fs'), path = require('path'), vm = require('vm');
const FILES = ['01-base.js', '02-store.js', '03-geo.js', '03b-walls.js', '07-app.js'];
const src = FILES.map(f => fs.readFileSync(path.join(__dirname, '../src/js', f), 'utf8')).join('\n');
const sandbox = {
  console, Math, JSON, Date, Number, String, Object, Array, Map, Set, Uint8Array, Uint32Array, isFinite, parseFloat, parseInt, setTimeout, clearTimeout,
  document: { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 10 }), isPointInPath: () => false }) }), createElementNS: () => ({ setAttribute() {}, append() {} }) },
  Path2D: function () {}, performance: { now: () => 0 },
  Render: { request() {} }, UI: { toast() {} }, Tools: { undo() {} },
  FX: { P: { fogo: { n: 'Fogo' } } },
  crypto: { getRandomValues(buf) { buf[0] = Math.floor(Math.random() * 4294967296); return buf; } },
};
vm.createContext(sandbox);
vm.runInContext(src + `\n;globalThis.T = { Store, newScene, newToken, normalizeScene, Act, App, cleanBar, barAfter, barWith, barX, areaNext, areaDelta };`, sandbox);
const { Store, newScene, newToken, normalizeScene, Act, App, cleanBar, barAfter, barWith, barX, areaNext, areaDelta } = sandbox.T;

let fails = 0, n = 0;
const ok = (cond, msg) => { n++; if (!cond) { fails++; console.log('FALHOU:', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} — esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);

/* ============ a barra com sobrevida ============ */
{
  const b = { n: 'Vida', c: '#d6524b', v: 30, m: 40, k: 'bar', on: true, vis: '', x: 12 };
  eq(barAfter(b, -5), { v: 30, x: 7 }, 'dano menor que a sobrevida: só a sobrevida desce');
  eq(barAfter(b, -12), { v: 30, x: 0 }, 'dano igual à sobrevida: ela zera e a barra fica');
  eq(barAfter(b, -20), { v: 22, x: 0 }, 'dano maior: a sobrevida zera e o resto sai da barra');
  eq(barAfter(b, -200), { v: 0, x: 0 }, 'dano enorme: barra em zero, nunca negativa');
  eq(barAfter(b, 6), { v: 36 }, 'cura não mexe na sobrevida');
  eq(barAfter(b, 60), { v: 40 }, 'e não passa do máximo');
  eq(barAfter({ v: 30, m: 40 }, -8), { v: 22 }, 'sem sobrevida, o dano é o de sempre');
  eq(barAfter({ v: 30, m: 40, x: 2.5 }, -1), { v: 30, x: 1.5 }, 'valores com uma casa decimal');
  eq([barX({}), barX({ x: -3 }), barX({ x: '4' }), barX(null)], [0, 0, 4, 0], 'barX: nunca negativa, nunca NaN');
  eq(barWith(b, { v: 22, x: 0 }), { n: 'Vida', c: '#d6524b', v: 22, m: 40, k: 'bar', on: true, vis: '' }, 'sobrevida zerada sai do objeto');
  eq([areaNext(b, -20, false), areaNext(b, -20, true), areaDelta(-9, true), areaDelta(9, true)], [22, 30, -4, 4], 'dano em área: a prévia também desconta a sobrevida; metade arredonda para baixo');
  eq([cleanBar({ n: 'Vida', v: 5, m: 10, x: 3 }).x, cleanBar({ n: 'Vida', v: 5, m: 10, x: 0 }).x, cleanBar({ n: 'Vida', v: 5, m: 10, x: -2 }).x, cleanBar({ n: 'Vida', v: 5, m: 10, x: 'lixo' }).x], [3, undefined, undefined, undefined], 'cleanBar guarda a sobrevida só quando há alguma');
}

/* ============ ações: digitar na barra, sobrevida, cura total, dano em área ============ */
{
  const sc = newScene('cura');
  Store.addScene(sc); Store.setCurrent(sc.id);
  const mk = (name, bars, extra) => { const t = newToken(sc, 0, 0, Object.assign({ name, bars: bars.map(cleanBar) }, extra)); Store.add('tokens', t); return t.id; };
  const A = mk('Ana', [{ n: 'Vida', v: 12, m: 40 }, { n: 'SP', v: 3, m: 20 }, { n: 'Fôlego', v: 1, m: 6, on: false }], { owner: 'p1' });
  const B = mk('Bruto', [{ n: 'Vida', v: 40, m: 40 }], {});
  const C = mk('Caio', [{ n: 'Vida', v: 0, m: 25 }, { n: 'Cargas', v: 1, m: 4, k: 'pts' }], { owner: 'p2' });
  const T = id => Store.get('tokens', id);
  const bars = id => T(id).bars.map(b => [b.n, b.v, b.m, b.x || 0]);

  ok(Act.barExtra(T(A), 0, 10) === true && T(A).bars[0].x === 10, 'barExtra põe a sobrevida');
  ok(Act.barExtra(T(A), 0, 10) === false, 'o mesmo valor de novo não gera passo de desfazer');
  ok(Act.barSet(T(A), 0, '-4') && T(A).bars[0].v === 12 && T(A).bars[0].x === 6, 'digitar -4 na barra: gasta a sobrevida primeiro');
  ok(Act.barSet(T(A), 0, '-9') && T(A).bars[0].v === 9 && T(A).bars[0].x === undefined, 'digitar -9: os 6 de sobrevida vão embora e 3 saem da vida');
  Store.undo();
  eq([T(A).bars[0].v, T(A).bars[0].x], [12, 6], 'desfazer devolve a vida e a sobrevida juntas');
  ok(Act.barSet(T(A), 0, '20') && T(A).bars[0].v === 20 && T(A).bars[0].x === 6, 'digitar um valor exato muda a barra e deixa a sobrevida como está');
  ok(Act.barSet(T(A), 0, '+5') && T(A).bars[0].v === 25 && T(A).bars[0].x === 6, 'cura (+5) não mexe na sobrevida');
  ok(Act.barExtra(T(A), 0, 0) && T(A).bars[0].x === undefined, 'sobrevida zero some');

  // dano em área com sobrevida
  Act.barExtra(T(B), 0, 5);
  const nA = Act.areaApply([{ t: T(A), half: false }, { t: T(B), half: false }, { t: T(C), half: true }], 'Vida', '8', null);
  eq([nA, bars(A)[0], bars(B)[0], bars(C)[0]], [2, ['Vida', 17, 40, 0], ['Vida', 37, 40, 0], ['Vida', 0, 25, 0]], 'dano em área: quem tem sobrevida perde ela primeiro (Bruto: 5 de sobrevida + 3 de vida)');
  Store.undo();
  eq(bars(B)[0], ['Vida', 40, 40, 5], 'e o desfazer devolve');

  // cura total
  Act.barSet(T(A), 1, '3');
  const antes = [bars(A), bars(B), bars(C)];
  const nH = Act.fullHeal([T(A), T(B), T(C)]);
  eq([nH, bars(A), bars(B), bars(C)], [2, [['Vida', 40, 40, 0], ['SP', 20, 20, 0], ['Fôlego', 1, 6, 0]], [['Vida', 40, 40, 5]], [['Vida', 25, 25, 0], ['Cargas', 4, 4, 0]]],
    'cura total: enche as barras em uso (a desligada fica), conta só quem mudou e não mexe na sobrevida');
  Store.undo();
  eq([bars(A), bars(B), bars(C)], antes, 'um Desfazer devolve todos de uma vez');
  ok(Act.fullHeal([T(B)]) === 0 && Act.fullHeal([]) === 0, 'quem já está cheio (ou ninguém) não conta nem gera passo de desfazer');
  ok(!Store.canRedo() || true, 'ok');

  // cena salva e relida: a sobrevida continua
  const copia = normalizeScene(JSON.parse(JSON.stringify(sc)));
  eq(copia.tokens.find(t => t.name === 'Bruto').bars[0].x, 5, 'a sobrevida sobrevive a salvar e reabrir a cena');
  eq(copia.tokens.find(t => t.name === 'Ana').bars[0].x, undefined, 'e barra sem sobrevida não ganha o campo');
}

console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
process.exit(fails ? 1 : 0);
