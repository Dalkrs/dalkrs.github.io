// Testes do serviço de dados (tc/dice.js).
// O rolador original (src/legado/rolador-urgm.html) roda lado a lado, dentro de um contexto isolado,
// para provar que as regras e os textos continuam os mesmos.
// Uso: node src/tests/dice.test.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const LIB_PATH = path.join(ROOT, 'tc', 'dice.js');
const HTML_PATH = path.join(ROOT, 'src', 'legado', 'rolador-urgm.html');
const libSrc = fs.readFileSync(LIB_PATH, 'utf8');
const html = fs.readFileSync(HTML_PATH, 'utf8');

/* ================= apoio ================= */
let n = 0, fails = 0;
function ok(cond, msg) { n++; if (!cond) { fails++; console.log('FALHOU:', msg); } }
// texto fiel do valor, incluindo a ordem das chaves (é o que o rolador grava)
const j = (v) => JSON.stringify(v, (k, x) => (x === undefined ? '«undefined»' : typeof x === 'number' && !Number.isFinite(x) ? '«' + x + '»' : x));
function eq(a, b, msg) { ok(j(a) === j(b), msg + ' — esperado ' + j(b) + ', veio ' + j(a)); }
// igual sem olhar a ordem das chaves
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) o[k] = canon(v[k]); return o; }
  return v;
}
function eqLoose(a, b, msg) { ok(j(canon(a)) === j(canon(b)), msg + ' — esperado ' + j(canon(b)) + ', veio ' + j(canon(a))); }
// roda fn e devolve o erro lançado (ou null); serve também para erros vindos de outro contexto
function caught(fn) { try { fn(); return null; } catch (err) { return err; } }
function throwsMsg(fn, message, msg) {
  const err = caught(fn);
  ok(!!err && err.name === 'Error' && err.message === message, msg + ' — esperado Error “' + message + '”, veio ' + (err ? err.name + ' “' + err.message + '”' : 'nenhum erro'));
}
// compara uma lista de entradas entre duas funções e aponta a primeira diferença
function sameOn(inputs, mine, orig, msg) {
  let bad = null;
  for (const x of inputs) {
    const a = j(mine(x)), b = j(orig(x));
    if (a !== b) { bad = 'entrada ' + j(x) + ': esperado ' + b + ', veio ' + a; break; }
  }
  ok(!bad, msg + (bad ? ' — ' + bad : ''));
}

/* Gerador fixo no lugar do crypto: os dois lados recebem a mesma sequência. */
function seeded(seed) {
  let s = seed >>> 0, calls = 0;
  const next = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  return { getRandomValues(buf) { calls++; for (let i = 0; i < buf.length; i++) buf[i] = next(); return buf; }, calls: () => calls, next };
}
/* Devolve exatamente estes números, na ordem. */
function scripted(values) {
  let i = 0;
  return {
    getRandomValues(buf) { for (let k = 0; k < buf.length; k++) { if (i >= values.length) throw new Error('acabaram os números do teste'); buf[k] = values[i++]; } return buf; },
    used: () => i,
  };
}
const T0 = 1790000000000;
function ticking() { let t = T0; return () => (t += 1000); }

/* ---- o rolador original, cortado antes da parte que desenha a tela ---- */
ok(html.split('<script>').length === 2, 'o rolador original tem um bloco de script só');
const origScript = /<script>\s*\n([\s\S]*?)<\/script>/.exec(html)[1];
const cutStart = origScript.indexOf("'use strict';");
const cutEnd = origScript.indexOf('  function renderPreview()');
ok(cutStart > 0 && cutEnd > cutStart, 'achou no original o trecho com as funções de rolagem');
const ORIG_NAMES = ['randInt', 'uid', 'fold', 'tableItems', 'tokenizeDice', 'displayTerms', 'compactTerms', 'parseDice', 'buildRoll', 'compText',
  'OPS', 'readSigned', 'normCheck', 'evalCheck', 'checkReach', 'fixaComp', 'dadosComp', 'rollTerms', 'bareTerms', 'rollSide', 'buildDuel',
  'addDuelRound', 'duelSummary', 'verdictEl', 'readInt', 'readCheck', 'validateFixa', 'capital', 'validateForm', 'normEntry', 'COLORS'];
const origSrc = '(function () {\n' + origScript.slice(cutStart, cutEnd) +
  '\n;globalThis.__orig = { ' + ORIG_NAMES.join(', ') + ', setState: (s) => { state = s; }, setDuelModes: (a, b) => { duelModes[0] = a; duelModes[1] = b; } };\n})();';

function loadOriginal(opt) {
  opt = opt || {};
  const fields = { fOp: '>=', d0Op: '>=', d1Op: '>=', d0Name: 'Ataque', d1Name: 'Defesa' };
  const sandbox = { __fields: fields, __crypto: opt.crypto, __now: opt.now || null };
  vm.createContext(sandbox);
  // o mínimo de "tela" para as funções do formulário lerem os campos e para o verdictEl montar o veredito
  vm.runInContext(`
    class Node { constructor() { this.kids = []; this.textContent = ''; } append(...k) { this.kids.push(...k); } setAttribute() {} addEventListener() {} }
    var document = {
      getElementById: (id) => ({ value: __fields[id] == null ? '' : String(__fields[id]) }),
      createElement: () => new Node(),
      createTextNode: (t) => { const x = new Node(); x.textContent = t; return x; },
    };
    var window = { crypto: __crypto };
    if (__now) Date.now = __now;
  `, sandbox);
  vm.runInContext(origSrc, sandbox, { filename: 'rolador-original.js' });
  return { O: sandbox.__orig, fields, sandbox };
}

/* ---- o serviço num global de navegador: existe window, não existe module ---- */
function loadBrowser(globals, before) {
  const sandbox = Object.assign({}, globals);
  vm.createContext(sandbox);
  vm.runInContext('var window = globalThis;' + (sandbox.now ? 'Date.now = now;' : '') + (before || ''), sandbox);
  vm.runInContext(libSrc, sandbox, { filename: 'tc/dice.js' });
  return sandbox;
}

/* Original e serviço com o mesmo gerador e o mesmo relógio. */
function pair(seed) {
  const co = seeded(seed), cm = seeded(seed);
  const o = loadOriginal({ crypto: co, now: ticking() });
  const m = loadBrowser({ crypto: cm, now: ticking() });
  return { O: o.O, fields: o.fields, M: m.TC.dice, co, cm };
}

const D = require(LIB_PATH);              // o serviço no Node, com o gerador de verdade
const { O } = loadOriginal({ crypto: globalThis.crypto });

/* ================= carregamento ================= */
const API = ['randInt', 'uid', 'parseDice', 'displayTerms', 'compactTerms', 'bareTerms', 'rollTerms', 'rollExpr', 'rollFixa', 'rollTable',
  'OPS', 'normCheck', 'readSigned', 'evalCheck', 'checkReach', 'verdict', 'fixaComp', 'dadosComp', 'compText', 'duelSummary',
  'buildFixa', 'buildDados', 'buildTabela', 'buildDuel', 'addDuelRound', 'summary', 'command', 'HELP'];
ok(API.every((k) => k in D), 'Node: require devolve a API inteira — falta ' + API.filter((k) => !(k in D)).join(', '));
ok(globalThis.TC && globalThis.TC.dice === D, 'Node: a API também fica em globalThis.TC.dice');
ok(Object.isFrozen(D), 'a API não pode ser alterada por quem usa');
ok(caught(() => new vm.Script(libSrc)) === null && !/^\s*(import|export)\s/m.test(libSrc), 'o arquivo é um script clássico (sem import/export)');
{
  const b = loadBrowser({});
  ok(vm.runInContext('typeof module === "undefined" && window.TC.dice === TC.dice && typeof TC.dice.randInt === "function"', b), 'navegador: sem module, a API fica em window.TC.dice');
  eq(Object.keys(b.TC.dice), Object.keys(D), 'navegador e Node expõem as mesmas funções');
  const kept = loadBrowser({ TC: { fichas: 1 } });
  ok(kept.TC.fichas === 1 && !!kept.TC.dice, 'um window.TC que já existia é aproveitado, não trocado');
  const twice = loadBrowser({});
  vm.runInContext(libSrc, twice);
  ok(typeof twice.TC.dice.rollExpr('1d6').total === 'number', 'incluir o arquivo duas vezes não quebra');
  const old = loadBrowser({}, 'delete globalThis.globalThis;');
  ok(vm.runInContext('typeof globalThis === "undefined" && typeof window.TC.dice.parseDice === "function"', old), 'navegador sem globalThis: usa window');
}
{
  // Nada de tela: qualquer toque em document, localStorage etc. seria contado aqui.
  let touched = 0;
  const trap = () => new Proxy(function () {}, { get() { touched++; return undefined; }, set() { touched++; return true; }, apply() { touched++; }, has() { touched++; return false; } });
  const b = loadBrowser({ document: trap(), localStorage: trap(), navigator: trap(), location: trap(), alert: trap() });
  const X = b.TC.dice;
  X.randInt(6); X.uid('r'); X.parseDice('2d6+3'); X.rollExpr('2d6+3'); X.rollFixa(60, 20); X.rollTable('a\nb');
  X.verdict(10, { op: '>=', target: 5 }); X.checkReach({ op: '>=', target: 5 }, 1, 20); X.command('/r 1d20');
  const f = X.buildFixa({ atributo: 60, fixa: 20 }, { title: 't' });
  const g = X.buildDados({ expr: '2d6+3' }, {});
  const t = X.buildTabela({ table: { id: 'a', name: 'A', text: 'x\ny' } }, {});
  const u = X.buildDuel([{ atributo: 10, fixa: 10 }, { atributo: 10, fixa: 10 }], {});
  X.addDuelRound(u);
  [f, g, t, u].forEach((e) => { X.summary(e); X.compText(e); });
  ok(touched === 0 && !/\b(document|localStorage|sessionStorage|navigator|querySelector|getElementById|addEventListener|innerHTML)\b/.test(libSrc), 'o serviço não mexe na tela nem no armazenamento do navegador');
}

/* ================= randInt ================= */
for (const size of [1, 2, 6, 20, 100, 1000]) {
  let lo = Infinity, hi = -Infinity, ints = true;
  for (let i = 0; i < size * 60 + 200; i++) { const v = D.randInt(size); if (v < lo) lo = v; if (v > hi) hi = v; if (!Number.isInteger(v)) ints = false; }
  ok(ints && lo === 1 && hi === size, 'randInt(' + size + ') dá inteiros de 1 a ' + size + ' e alcança as duas pontas — veio de ' + lo + ' a ' + hi);
}
for (const [size, draws] of [[2, 20000], [6, 60000], [20, 100000], [100, 200000]]) {
  const counts = new Array(size).fill(0);
  for (let i = 0; i < draws; i++) counts[D.randInt(size) - 1]++;
  const exp = draws / size;
  const chi = counts.reduce((s, c) => s + (c - exp) * (c - exp) / exp, 0);
  const df = size - 1;
  const bound = df + 8 * Math.sqrt(2 * df) + 20; // folga enorme: só acusa dado claramente viciado
  ok(chi < bound, 'randInt(' + size + ') é uniforme (qui-quadrado ' + chi.toFixed(1) + ' < ' + bound.toFixed(1) + ')');
}
for (const bad of [0, -1, 1.5, NaN, Infinity, -Infinity, '6', null, undefined, true, [6], 4294967297, 2 ** 40, Number.MAX_SAFE_INTEGER, 2 ** 53]) {
  const err = caught(() => D.randInt(bad));
  ok(err instanceof RangeError, 'randInt(' + j(bad) + ') recusa com RangeError — veio ' + (err ? err.name : 'um resultado'));
}
{
  const big = Array.from({ length: 2000 }, () => D.randInt(4294967296));
  ok(big.every((v) => Number.isInteger(v) && v >= 1 && v <= 4294967296) && big.some((v) => v > 2147483648), 'randInt(2^32) termina e cobre a faixa inteira');
  // no original, acima de 2^32 o laço nunca termina; aqui é recusado na hora
  const hang = caught(() => vm.runInContext('__orig.randInt(4294967297)', loadOriginal({ crypto: seeded(1) }).sandbox, { timeout: 250 }));
  ok(!!hang && hang.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT', 'o original trava em randInt(2^32 + 1) (o defeito que foi corrigido)');
}
{
  // sorteio por rejeição: 4294967292 em diante é sobra de 2^32 / 6 e tem de ser descartado
  const seq = [4294967295, 4294967292, 4294967291, 0, 5, 6];
  const cm = scripted(seq), co = scripted(seq);
  const M = loadBrowser({ crypto: cm }).TC.dice;
  const P = loadOriginal({ crypto: co }).O;
  eq([M.randInt(6), cm.used()], [6, 3], 'randInt(6) descarta a sobra e usa o primeiro número que serve');
  eq([M.randInt(6), M.randInt(6), M.randInt(6)], [1, 6, 1], 'randInt(6): 0 vira 1, 5 vira 6, 6 volta para 1');
  eq([P.randInt(6), co.used(), P.randInt(6), P.randInt(6), P.randInt(6)], [6, 3, 1, 6, 1], 'o original faz o mesmo com a mesma sequência');
  const c1 = scripted([7]);
  const M1 = loadBrowser({ crypto: c1 }).TC.dice;
  eq([M1.randInt(1), c1.used()], [1, 0], 'randInt(1) devolve 1 sem gastar sorteio');
  const cb = scripted([4294967295, 0]);
  const Mb = loadBrowser({ crypto: cb }).TC.dice;
  eq([Mb.randInt(4294967296), Mb.randInt(4294967296)], [4294967296, 1], 'randInt(2^32) vai de 1 a 2^32 sem descartar nada');
}
{
  const p = pair(42);
  const sizes = [2, 3, 6, 7, 20, 100, 1000, 100000, 4294967296];
  const mine = [], orig = [];
  for (let i = 0; i < 3000; i++) { const s = sizes[i % sizes.length]; mine.push(p.M.randInt(s)); orig.push(p.O.randInt(s)); }
  ok(j(mine) === j(orig) && p.cm.calls() === p.co.calls(), 'com o mesmo gerador, randInt dá os mesmos 3000 resultados do original');
}
{
  // sem crypto: cai no Math.random
  const b = loadBrowser({});
  const X = b.TC.dice;
  vm.runInContext('Math.random = () => 0;', b);
  eq([X.randInt(6), X.randInt(4294967296)], [1, 1], 'sem crypto, Math.random = 0 dá 1');
  vm.runInContext('Math.random = () => 0.9999999999;', b);
  eq([X.randInt(6), X.randInt(20), X.randInt(4294967296)], [6, 20, 4294967296], 'sem crypto, Math.random quase 1 dá n');
  ok(caught(() => X.randInt(4294967297)).name === 'RangeError', 'sem crypto, o limite de 2^32 vale igual');
  ok(/^h_[0-9a-z]+$/.test(X.uid('h')), 'sem crypto, uid continua funcionando');
}

/* ================= uid, fold, tableItems ================= */
{
  const p = pair(7);
  eq([p.M.uid('r'), p.M.uid('tb'), p.M.uid('s')], [p.O.uid('r'), p.O.uid('tb'), p.O.uid('s')], 'uid igual ao original com o mesmo gerador e o mesmo relógio');
  const ids = new Set(Array.from({ length: 2000 }, () => D.uid('r')));
  ok(ids.size === 2000 && [...ids].every((x) => /^r_[0-9a-z]+$/.test(x)), 'uid: 2000 ids diferentes, no formato prefixo_letras');
}
sameOn(['Ação', 'ÁÉÍÓÚ àèìòù âêô ãõ ç Ü', 'Nevoeiro', '', null, undefined, 0, 12, 'ǅ', 'São João'], D.fold, O.fold, 'fold igual ao original');
eq(D.fold('Atenção, MAÇÃ'), 'atencao, maca', 'fold tira acento e caixa');
sameOn([{ text: ' Sol \r\n\r\n Chuva\n\n   \nNevoeiro  ' }, { text: '' }, {}, { text: null }, { text: 'um só' }, { text: '\n\n' }, { text: 12 }],
  D.tableItems, O.tableItems, 'tableItems igual ao original');
eq(D.tableItems({ text: ' Sol \r\n\r\n Chuva\n   \nNevoeiro  ' }), ['Sol', 'Chuva', 'Nevoeiro'], 'tableItems: um item por linha, sem linhas vazias');

/* ================= parseDice ================= */
const TWENTY = Array.from({ length: 20 }, () => 'd4').join('+');
const VALID = ['d20', '1d20', '2d6+3', '2d6 + 3', ' 2d6+3 ', '2D6-1', 'D20', '1d20+1d4', '1d20-1d4+2', '3d6+2d8+1d10-4', '+1d6', '-1d6',
  '−1d6', '1d20−5', '1d20–5', '1d20—5', '1d20‒5', 'd%', '2d%', 'D%+5', '1d%5', '1d100', '1d2', '1d100000', '100d6',
  '100d6+100d6+100d6', '1d6+1000000', '1d6-1000000', '1d6+0', '01d06', '1d6\t+\n2', '1d6 + 2', '5+1d6', '-5-1d6', '2-d2', TWENTY];
const INVALID = ['', '   ', null, undefined, 0, 20, '20', '+5', '-5', '5+5', 'abc', '1d', 'd', '2d6+', '2d6-', '2d6 −', '2d6 3', '2d6 d4', '2d6++3',
  '2d6+-3', '2d6*2', '2d6+3 extra', '(2d6)', '1.5d6', '1d6.5', '1,5', '1d6+1,5', '0d6', '00d6', '101d6', '1d1', '1d0', '1d100001', '1d6+1000001',
  TWENTY + '+d4', '100d6+100d6+100d6+1d6', '99999999999999999999d6', '1d99999999999999999999', '1d6+99999999999999999999', '１d６',
  '2d6+３', '2 d 6', '2d 6', '2 d6', '- 1d6', '1d6 - - 2', '1d6+2d', 'd%%', '%', 'dd6', '1dd6', '1d6d6', '2d6 + 3 +', '+', '-', '1d6;', 'd-6'];
for (const x of VALID) {
  const a = D.parseDice(x), b = O.parseDice(x);
  ok(j(a) === j(b) && !!a.terms && !a.error, 'parseDice(' + j(x) + ') aceita e dá o mesmo do original — esperado ' + j(b) + ', veio ' + j(a));
}
for (const x of INVALID) {
  const a = D.parseDice(x), b = O.parseDice(x);
  ok(j(a) === j(b) && !a.terms, 'parseDice(' + j(x) + ') recusa com a mesma resposta do original — esperado ' + j(b) + ', veio ' + j(a));
}
sameOn(VALID.concat(INVALID), D.tokenizeDice, O.tokenizeDice, 'tokenizeDice igual ao original em todas as expressões acima');
eq(D.parseDice('2d6+3'), { terms: [{ kind: 'dice', sign: 1, count: 2, sides: 6 }, { kind: 'num', sign: 1, value: 3 }], min: 5, max: 15, norm: '2d6 + 3' }, 'parseDice: partes, mínimo, máximo e texto normalizado');
eq(D.parseDice('d%'), { terms: [{ kind: 'dice', sign: 1, count: 1, sides: 100 }], min: 1, max: 100, norm: '1d100' }, 'parseDice: d% é d100');
eq(D.parseDice('−1d6'), { terms: [{ kind: 'dice', sign: -1, count: 1, sides: 6 }], min: -6, max: -1, norm: '−1d6' }, 'parseDice: sinal de menos tipográfico e faixa negativa');
eq([D.parseDice('1d20-1d4+2').min, D.parseDice('1d20-1d4+2').max], [-1, 21], 'parseDice: dado subtraído entra invertido no mínimo e no máximo');
eq(D.parseDice('   '), { empty: true }, 'parseDice: vazio');
eq(D.parseDice(TWENTY).terms.length, 20, 'parseDice: 20 partes passam');
eq(D.parseDice(TWENTY + '+d4'), { error: 'Use no máximo 20 partes numa rolagem só.' }, 'parseDice: 21 partes não');
eq(D.parseDice('101d6'), { error: 'Use no máximo 100 dados iguais de uma vez.' }, 'parseDice: 101 dados iguais não');
eq([D.parseDice('100d6+100d6+100d6').max, D.parseDice('100d6+100d6+100d6+1d6')], [1800, { error: 'São dados demais numa rolagem só (máximo 300).' }], 'parseDice: 300 dados passam, 301 não');
eq([D.parseDice('1d2').max, D.parseDice('1d1')], [2, { error: 'O dado precisa ter pelo menos 2 lados.' }], 'parseDice: dado de 2 lados passa, de 1 não');
eq([D.parseDice('1d100000').max, D.parseDice('1d100001')], [100000, { error: 'O dado pode ter no máximo 100000 lados.' }], 'parseDice: 100000 lados passam, 100001 não');
eq([D.parseDice('1d6+1000000').max, D.parseDice('1d6+1000001')], [1000006, { error: 'Esse modificador é grande demais.' }], 'parseDice: modificador até 1000000');
eq(D.parseDice('0d6'), { error: 'A quantidade de dados precisa ser pelo menos 1.' }, 'parseDice: zero dados');
eq(D.parseDice('5'), { error: 'Falta o dado. Escreva algo como 1d20 ou 2d6+3.' }, 'parseDice: só número');
eq([D.parseDice('2d6+'), D.parseDice('2d6−')], [{ error: 'Falta completar depois do “+”.' }, { error: 'Falta completar depois do “−”.' }], 'parseDice: sinal sobrando no fim');
eq(D.parseDice('2d6 3'), { error: 'Falta um + ou − antes de “3”.' }, 'parseDice: falta o sinal entre as partes');
eq(D.parseDice('abc'), { error: 'Não entendi “abc”. Escreva algo como 2d6+3.' }, 'parseDice: texto que não é dado');
{
  // expressões sorteadas (sempre as mesmas): tem de bater com o original uma a uma
  const rnd = seeded(2024);
  const alpha = '0123456789dD+-−–% .x';
  const fuzz = [];
  for (let i = 0; i < 4000; i++) {
    let s = '';
    const len = 1 + (rnd.next() % 12);
    for (let k = 0; k < len; k++) s += alpha[rnd.next() % alpha.length];
    fuzz.push(s);
  }
  sameOn(fuzz, D.parseDice, O.parseDice, 'parseDice igual ao original em 4000 expressões sorteadas');
  sameOn(fuzz, D.tokenizeDice, O.tokenizeDice, 'tokenizeDice igual ao original em 4000 expressões sorteadas');
  const good = fuzz.filter((s) => D.parseDice(s).terms).length;
  ok(good > 200 && good < 3800, 'as expressões sorteadas misturam válidas e inválidas (' + good + ' válidas)');
}
{
  const lists = VALID.map((x) => D.parseDice(x).terms);
  sameOn(lists, D.displayTerms, O.displayTerms, 'displayTerms igual ao original');
  sameOn(lists, D.compactTerms, O.compactTerms, 'compactTerms igual ao original');
  sameOn(lists, D.bareTerms, O.bareTerms, 'bareTerms igual ao original');
  const terms = [{ kind: 'dice', sign: -1, count: 2, sides: 6 }, { kind: 'num', sign: 1, value: 3 }, { kind: 'dice', sign: -1, count: 1, sides: 4 }];
  eq([D.displayTerms(terms), D.compactTerms(terms)], ['−2d6 + 3 − 1d4', '-2d6+3-1d4'], 'displayTerms para mostrar, compactTerms para o campo');
  ok(lists.every((t) => j(D.parseDice(D.compactTerms(t)).terms) === j(t) && j(D.parseDice(D.displayTerms(t)).terms) === j(t)), 'os dois textos voltam para as mesmas partes quando lidos de novo');
  const rolled = D.rollTerms(terms).terms;
  eq(D.bareTerms(rolled), terms, 'bareTerms tira os resultados e deixa só a rolagem');
}

/* ================= rollTerms e rollExpr ================= */
{
  const p = pair(99);
  const lists = ['1d20', '2d6+3', '3d6-1d4+2', '100d6+100d6+100d6', '−1d6', '10d10-5'].map((x) => p.O.parseDice(x).terms);
  ok(lists.every((t) => j(p.M.rollTerms(t)) === j(p.O.rollTerms(t))), 'rollTerms igual ao original com o mesmo gerador');
}
for (const expr of ['1d20', '2d6+3', '3d6-1d4+2', '-2d8', '4d4-10']) {
  const parsed = D.parseDice(expr);
  let fine = true, lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 3000; i++) {
    const r = D.rollTerms(parsed.terms);
    const sum = r.terms.reduce((a, t) => a + t.sign * (t.kind === 'dice' ? t.rolls.reduce((x, y) => x + y, 0) : t.value), 0);
    if (sum !== r.total || r.total < parsed.min || r.total > parsed.max) fine = false;
    for (const t of r.terms) if (t.kind === 'dice' && (t.rolls.length !== t.count || t.rolls.some((v) => !Number.isInteger(v) || v < 1 || v > t.sides))) fine = false;
    lo = Math.min(lo, r.total); hi = Math.max(hi, r.total);
  }
  ok(fine && lo < hi, 'rollTerms(' + expr + '): cada dado na sua faixa, total somado certo e dentro de ' + parsed.min + ' a ' + parsed.max);
}
{
  const r = D.rollExpr(' 2D6+3 ');
  eq(Object.keys(r), ['ok', 'expr', 'terms', 'total', 'min', 'max'], 'rollExpr: formato do resultado');
  ok(r.ok === true && r.expr === '2d6 + 3' && r.min === 5 && r.max === 15 && r.total >= 5 && r.total <= 15 && r.terms[0].rolls.length === 2, 'rollExpr lê, normaliza e rola');
  eq(D.rollExpr(''), { ok: false, error: 'Escreva os dados (ex.: 2d6+3).' }, 'rollExpr: vazio');
  eq(D.rollExpr('2d6+'), { ok: false, error: 'Falta completar depois do “+”.' }, 'rollExpr: erro de leitura vem com a mensagem do rolador');
  eq(D.rollExpr('20'), { ok: false, error: 'Falta o dado. Escreva algo como 1d20 ou 2d6+3.' }, 'rollExpr: número solto não é dado (isso é só do comando /r)');
  const p = pair(5);
  const a = p.M.rollExpr('3d6+2'), b = p.O.rollTerms(p.O.parseDice('3d6+2').terms);
  eq([a.terms, a.total], [b.terms, b.total], 'rollExpr rola igual ao original com o mesmo gerador');
}

/* ================= comparadores ================= */
eq(Object.keys(D.OPS), ['>=', '>', '=', '<=', '<'], 'OPS: os cinco sinais, na ordem do rolador');
ok(Object.keys(D.OPS).every((op) => D.OPS[op].sym === O.OPS[op].sym && D.OPS[op].label === O.OPS[op].label && D.OPS[op].short(7) === O.OPS[op].short(7)),
  'OPS: símbolo, rótulo e frase curta iguais aos do original');
{
  let same = true;
  for (const op of Object.keys(D.OPS)) for (let v = -3; v <= 3; v++) for (let t = -3; t <= 3; t++) if (D.OPS[op].test(v, t) !== O.OPS[op].test(v, t)) same = false;
  ok(same, 'OPS: o teste de cada sinal dá o mesmo do original');
}
const SIGNED = ['15', ' 15 ', '-5', '−5', '–5', '—5', '‒5', '+5', '0', '-0', '007', '', '   ', null, undefined, 0, 15, -5, '1.5', '1,5', 'abc', '5a',
  '9999999', '-9999999', '10000000', '-10000000', '99999999999999999999', '--5', '- 5', '5-'];
sameOn(SIGNED, D.readSigned, O.readSigned, 'readSigned igual ao original');
eq([D.readSigned('−5'), D.readSigned(''), D.readSigned('1.5'), D.readSigned('10000000'), D.readSigned('-9999999')],
  [{ value: -5 }, { empty: true }, { bad: true }, { big: true }, { value: -9999999 }], 'readSigned: valor, vazio, inválido e grande demais');
sameOn(SIGNED, D.readInt, O.readInt, 'readInt igual ao original');
eq([D.readInt('60'), D.readInt(''), D.readInt('-5'), D.readInt('6.5'), D.readInt('10000000'), D.readInt('9999999')],
  [{ value: 60 }, { empty: true }, { bad: true }, { bad: true }, { big: true }, { value: 9999999 }], 'readInt: valor, vazio, inválido e grande demais');
const CHECKS = [null, undefined, 0, 'x', [], {}, { op: '>=' }, { target: 5 }, { op: '>=', target: 5 }, { op: '>', target: -5 }, { op: '=', target: 0 }, { op: '<=', target: 9999999 },
  { op: '<', target: 5, extra: 1 }, { op: '>>', target: 5 }, { op: '≥', target: 5 }, { op: '>=', target: '5' }, { op: '>=', target: 1.5 }, { op: '>=', target: NaN },
  { op: '>=', target: 2 ** 60 }, { op: '', target: 5 }, { op: null, target: 5 }];
sameOn(CHECKS, D.normCheck, O.normCheck, 'normCheck igual ao original');
eq([D.normCheck({ op: '<', target: 5, extra: 1 }), D.normCheck({ op: '>=', target: '5' })], [{ op: '<', target: 5 }, null], 'normCheck: só op e target, e alvo tem de ser inteiro');
{
  // No original, nomes herdados de Object ("constructor", "__proto__", "toString"…) passam por sinal válido e derrubam a tela depois.
  const protoKeys = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'];
  ok(protoKeys.every((op) => D.normCheck({ op, target: 1 }) === null && D.evalCheck(5, { op, target: 1 }) === null && D.verdict(5, { op, target: 1 }) === null &&
    D.checkReach({ op, target: 1 }, 1, 6) === null), 'sinal com nome herdado de Object é recusado, sem erro');
  ok(O.normCheck({ op: 'constructor', target: 1 }) !== null && caught(() => O.evalCheck({ op: 'constructor', target: 1 }, 5)) !== null,
    'o original aceita esse sinal e quebra ao avaliar (defeito encontrado na leitura)');
}

const TARGETS = [-2, 0, 1, 15, 45];
for (const op of Object.keys(D.OPS)) {
  let bad = null;
  for (const target of TARGETS) for (let total = target - 4; total <= target + 4 && !bad; total++) {
    const want = j(O.evalCheck({ op, target }, total));
    const a = j(D.evalCheck(total, { op, target })), b = j(D.evalCheck({ op, target }, total));
    if (a !== want || b !== want) bad = 'total ' + total + ', alvo ' + target + ': esperado ' + want + ', veio ' + a + ' e ' + b;
  }
  ok(!bad, 'evalCheck com ' + op + ' igual ao original, nas duas ordens de chamada' + (bad ? ' — ' + bad : ''));
}
sameOn([null, undefined, {}, { op: '>>', target: 1 }, { op: '>=' }, 'x', 7], (c) => D.evalCheck(c, 5), (c) => O.evalCheck(c, 5), 'evalCheck: comparação inválida dá o mesmo do original');
eq([D.evalCheck(5, null), D.evalCheck(null, 5), D.evalCheck(5, undefined), D.evalCheck(5, 7), D.evalCheck('5', { op: '>=', target: 1 })], [null, null, null, null, null], 'evalCheck: sem comparação (ou sem total em número) devolve null');

// As frases da margem, sinal por sinal: passou, no limite, não passou.
const WORDING = [
  ['>=', 45, 48, true, '≥ 45, por 3'], ['>=', 45, 45, true, '≥ 45, no limite'], ['>=', 45, 44, false, '≥ 45, faltou 1'], ['>=', 45, 40, false, '≥ 45, faltaram 5'],
  ['>', 45, 48, true, '> 45, por 3'], ['>', 45, 46, true, '> 45, por 1'], ['>', 45, 45, false, '> 45, faltou 1'], ['>', 45, 44, false, '> 45, faltaram 2'],
  ['=', 45, 45, true, '= 45, exatamente 45'], ['=', 45, 47, false, '= 45, diferença de 2'], ['=', 45, 40, false, '= 45, diferença de 5'],
  ['<=', 45, 40, true, '≤ 45, por 5'], ['<=', 45, 45, true, '≤ 45, no limite'], ['<=', 45, 46, false, '≤ 45, passou do limite por 1'],
  ['<', 45, 40, true, '< 45, por 5'], ['<', 45, 44, true, '< 45, por 1'], ['<', 45, 45, false, '< 45, passou do limite por 1'], ['<', 45, 50, false, '< 45, passou do limite por 6'],
  ['>=', -3, -1, true, '≥ -3, por 2'], ['<', 0, 0, false, '< 0, passou do limite por 1'],
];
for (const [op, target, total, pass, text] of WORDING) {
  const check = { op, target };
  eq(D.evalCheck(total, check), { pass, text }, 'evalCheck: ' + total + ' contra ' + op + ' ' + target);
  // o veredito inteiro tem de sair como o rolador monta na tela: palavra + detalhe
  const el = O.verdictEl(O.evalCheck(check, total));
  const shown = el.kids.map((k) => k.textContent).join(' ');
  const v = D.verdict(total, check);
  ok(v.passed === pass && v.text === (pass ? '✓ Passou ' : '✗ Não passou ') + text && v.text === shown && /pass|fail/.exec(el.className)[0] === (pass ? 'pass' : 'fail'),
    'verdict: ' + total + ' contra ' + op + ' ' + target + ' — esperado “' + shown + '”, veio “' + v.text + '”');
}
eq(D.verdict(48, { op: '>=', target: 45 }), { passed: true, text: '✓ Passou ≥ 45, por 3' }, 'verdict: o exemplo do pedido');
eq([D.verdict(48, null), D.verdict(48, undefined), D.verdict(48, { op: '?', target: 1 })], [null, null, null], 'verdict: sem comparação devolve null');
eq(D.verdict({ op: '<', target: 10 }, 12), { passed: false, text: '✗ Não passou < 10, passou do limite por 3' }, 'verdict também aceita (check, total)');

for (const op of Object.keys(D.OPS)) {
  let bad = null;
  for (let target = -8; target <= 24 && !bad; target++) {
    for (const [min, max] of [[1, 20], [5, 5], [2, 12], [-6, -1], [0, 0], [null, 5], [5, null], [undefined, undefined]]) {
      const a = D.checkReach({ op, target }, min, max), b = O.checkReach({ op, target }, min, max);
      if (a !== b) { bad = 'alvo ' + target + ', faixa ' + min + ' a ' + max + ': esperado ' + b + ', veio ' + a; break; }
    }
  }
  ok(!bad, 'checkReach com ' + op + ' igual ao original' + (bad ? ' — ' + bad : ''));
}
eq([D.checkReach({ op: '>=', target: 21 }, 1, 20), D.checkReach({ op: '>=', target: 1 }, 1, 20), D.checkReach({ op: '>=', target: 10 }, 1, 20)], ['never', 'always', null], 'checkReach com ≥: nunca, sempre, depende');
eq([D.checkReach({ op: '>', target: 20 }, 1, 20), D.checkReach({ op: '>', target: 0 }, 1, 20), D.checkReach({ op: '=', target: 5 }, 5, 5), D.checkReach({ op: '=', target: 21 }, 1, 20)], ['never', 'always', 'always', 'never'], 'checkReach com > e =');
eq([D.checkReach({ op: '<=', target: 20 }, 1, 20), D.checkReach({ op: '<=', target: 0 }, 1, 20), D.checkReach({ op: '<', target: 1 }, 1, 20), D.checkReach({ op: '<', target: 21 }, 1, 20)], ['always', 'never', 'never', 'always'], 'checkReach com ≤ e <');
eq([D.checkReach(null, 1, 20), D.checkReach({ op: '?', target: 1 }, 1, 20), D.checkReach({ op: '>=', target: 1 }, null, 20)], [null, null, null], 'checkReach: sem comparação ou sem faixa devolve null');

/* ================= fixa ================= */
{
  // o validateFixa do original lê dois campos da tela; aqui os campos são de mentira
  const o = loadOriginal({ crypto: globalThis.crypto });
  const origValidate = (atr, fixa, prefix) => { o.fields.fAtr = atr; o.fields.fFixa = fixa; return o.O.validateFixa('fAtr', 'fFixa', prefix); };
  const FIELD = { fAtr: 'atributo', fFixa: 'fixa' };
  const PAIRS = [['60', '20'], ['60', ''], ['60', '0'], ['60', '60'], ['1', ''], ['1', '1'], ['9999999', '9999998'], [' 60 ', ' 20 '], ['060', '020'],
    ['', ''], ['', '20'], ['0', ''], ['0', '0'], ['20', '30'], ['20', '21'], ['abc', ''], ['6.5', ''], ['6,5', ''], ['-5', ''], ['60', 'abc'], ['60', '-1'], ['60', '2.5'],
    ['10000000', ''], ['60', '10000000'], ['abc', 'abc'], ['10000000', 'abc'], ['', 'abc'], ['', '10000000'], ['+60', ''], ['60', '+20']];
  for (const prefix of ['', 'Ataque: ']) {
    let bad = null;
    for (const [atr, fixa] of PAIRS) {
      const want = o.O.validateFixa && origValidate(atr, fixa, prefix);
      if (want.field) want.field = FIELD[want.field];
      const got = D.validateFixa(atr, fixa, prefix);
      if (j(got) !== j(want)) { bad = j([atr, fixa]) + ': esperado ' + j(want) + ', veio ' + j(got); break; }
    }
    ok(!bad, 'validateFixa igual ao original em ' + PAIRS.length + ' pares de campos' + (prefix ? ', com o nome do lado na frente' : '') + (bad ? ' — ' + bad : ''));
  }
  // rollFixa mostra as mesmas mensagens que o formulário do rolador (com inicial maiúscula)
  let bad = null;
  for (const [atr, fixa] of PAIRS) {
    const want = origValidate(atr, fixa, '');
    const got = D.rollFixa(atr, fixa);
    if (want.ok ? !(got.ok && got.atributo === want.atributo && got.fixa === want.fixa && got.die === want.die && got.total >= want.min && got.total <= want.max)
      : !(got.ok === false && got.error === o.O.capital(want.text))) { bad = j([atr, fixa]) + ': original ' + j(want) + ', veio ' + j(got); break; }
  }
  ok(!bad, 'rollFixa aceita e recusa os mesmos pares que o formulário do rolador, com os mesmos textos' + (bad ? ' — ' + bad : ''));
}
eq(Object.keys(D.rollFixa(60, 20)), ['ok', 'atributo', 'fixa', 'die', 'dieValue', 'total'], 'rollFixa: formato do resultado');
for (const [atr, fixa] of [[60, 20], [10, 0], [6, 3], [2, 0], [100, 99]]) {
  let lo = Infinity, hi = -Infinity, fine = true;
  for (let i = 0; i < 400 + (atr - fixa) * 40; i++) {
    const r = D.rollFixa(atr, fixa);
    if (!(r.ok && r.atributo === atr && r.fixa === fixa && r.die === atr - fixa && Number.isInteger(r.dieValue) && r.dieValue >= 1 && r.dieValue <= r.die && r.total === r.dieValue + fixa)) fine = false;
    lo = Math.min(lo, r.total); hi = Math.max(hi, r.total);
  }
  ok(fine && lo === fixa + 1 && hi === atr, 'rollFixa(' + atr + ', ' + fixa + ') vai de ' + (fixa + 1) + ' a ' + atr + ' — veio de ' + lo + ' a ' + hi);
}
{
  const c = seeded(3);
  const X = loadBrowser({ crypto: c }).TC.dice;
  eq([X.rollFixa(60, 60), c.calls()], [{ ok: true, atributo: 60, fixa: 60, die: 0, dieValue: 0, total: 60 }, 0], 'fixa igual ao atributo: resultado é o atributo, sem sortear nada');
  eq([X.rollFixa(1, 1).total, X.rollFixa(1, 0).total, X.rollFixa(1).total, c.calls()], [1, 1, 1, 0], 'atributo 1: sempre 1, sem sortear');
  X.rollFixa(60, 20);
  eq(c.calls(), 1, 'rollFixa gasta um sorteio só');
  const p = pair(11);
  const mine = [], orig = [];
  for (const [atr, fixa] of [[60, 20], [60, 0], [10, 9], [9999999, 1], [7, 7]]) {
    const r = p.M.rollFixa(atr, fixa); mine.push([r.total, r.dieValue]);
    const s = p.O.rollSide({ mode: 'fixa', atributo: atr, fixa }); orig.push([s.total, s.dieValue]);
  }
  eq(mine, orig, 'rollFixa rola igual ao original com o mesmo gerador');
}
eq([D.rollFixa('60', '20').ok, D.rollFixa(60).fixa, D.rollFixa('60', '').fixa, D.rollFixa(60, null).fixa], [true, 0, 0, 0], 'rollFixa: aceita texto de campo, e fixa em branco vale 0');
const FIXA_ERRORS = [
  [['abc', 0], 'O atributo só aceita número inteiro (sem letra, vírgula ou ponto).'], [[6.5, 0], 'O atributo só aceita número inteiro (sem letra, vírgula ou ponto).'],
  [[-5, 0], 'O atributo só aceita número inteiro (sem letra, vírgula ou ponto).'], [[NaN, 0], 'O atributo só aceita número inteiro (sem letra, vírgula ou ponto).'],
  [[{}, 0], 'O atributo só aceita número inteiro (sem letra, vírgula ou ponto).'],
  [[10000000, 0], 'Esse atributo é grande demais.'], [['10000000', 0], 'Esse atributo é grande demais.'],
  [[60, 'x'], 'A fixa só aceita número inteiro (sem letra, vírgula ou ponto).'], [[60, 2.5], 'A fixa só aceita número inteiro (sem letra, vírgula ou ponto).'],
  [[60, -1], 'A fixa só aceita número inteiro (sem letra, vírgula ou ponto).'],
  [[60, 10000000], 'Essa fixa é grande demais.'],
  [[undefined, undefined], 'Digite o atributo e quanto quer fixar.'], [['', 20], 'Digite o atributo e quanto quer fixar.'], [[null, 0], 'Digite o atributo e quanto quer fixar.'],
  [[0, 0], 'O atributo precisa ser pelo menos 1.'], [['0', ''], 'O atributo precisa ser pelo menos 1.'],
  [[20, 30], 'A fixa (30) passou do atributo (20). Ela pode ir no máximo até 20.'], [[20, 21], 'A fixa (21) passou do atributo (20). Ela pode ir no máximo até 20.'],
];
for (const [[atr, fixa], error] of FIXA_ERRORS) eq(D.rollFixa(atr, fixa), { ok: false, error }, 'rollFixa(' + j(atr) + ', ' + j(fixa) + ') recusa');
eq([D.rollFixa(9999999, 0).ok, D.rollFixa(9999999, 9999999).total], [true, 9999999], 'rollFixa: 9 999 999 é o maior atributo aceito');
eq(D.validateFixa(60, 20), { ok: true, atributo: 60, fixa: 20, die: 40, min: 21, max: 60, roll: '1d40 + 20' }, 'validateFixa: o que vai rolar e a faixa do resultado');
eq([D.validateFixa(60, 0).roll, D.validateFixa(60, 60).roll, D.validateFixa(60, 60).min], ['1d60, sem fixa', 'fixa total 60', 60], 'validateFixa: sem fixa e fixa total');
eq(D.validateFixa(20, 30, 'Defesa: '), { ok: false, level: 'problem', field: 'fixa', text: 'Defesa: a fixa (30) passou do atributo (20). Ela pode ir no máximo até 20.' }, 'validateFixa: diz qual campo está errado');

/* ================= tabela ================= */
{
  const text = ' Sol \r\n\r\n Chuva\n   \nNevoeiro\nNeve';
  const seen = new Set();
  let fine = true;
  for (let i = 0; i < 600; i++) {
    const r = D.rollTable(text);
    if (!(r.ok && r.itemCount === 4 && r.itemIndex >= 1 && r.itemIndex <= 4 && r.itemText === ['Sol', 'Chuva', 'Nevoeiro', 'Neve'][r.itemIndex - 1])) fine = false;
    seen.add(r.itemText);
  }
  ok(fine && seen.size === 4, 'rollTable(texto): posição de 1 a 4, item certo, e todos os itens saem');
  eq(Object.keys(D.rollTable(text)), ['ok', 'itemCount', 'itemIndex', 'itemText'], 'rollTable: formato do resultado');
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < 40000; i++) counts[D.rollTable(['a', 'b', 'c', 'd']).itemIndex - 1]++;
  ok(counts.every((c) => Math.abs(c - 10000) < 700), 'rollTable: todos os itens com a mesma chance — veio ' + counts.join(', '));
  eq(D.rollTable(['Único']), { ok: true, itemCount: 1, itemIndex: 1, itemText: 'Único' }, 'rollTable: tabela de 1 item');
  const arr = D.rollTable([' a ', '', '  ', 'b', null, 7]);
  ok(arr.itemCount === 3 && ['a', 'b', '7'].includes(arr.itemText), 'rollTable(lista): apara os itens e ignora os vazios');
  eq(D.rollTable({ id: 't', name: 'Clima', text: 'Sol' }), { ok: true, itemCount: 1, itemIndex: 1, itemText: 'Sol' }, 'rollTable: também aceita a tabela do rolador');
  for (const empty of [[], '', '  \n \r\n', null, undefined, ['', '  '], 5]) eq(D.rollTable(empty), { ok: false, error: 'A tabela está vazia.' }, 'rollTable(' + j(empty) + '): tabela vazia');
  eq(D.rollTable({ name: 'Clima', text: '\n' }), { ok: false, error: 'A tabela “Clima” está vazia.' }, 'rollTable: tabela vazia com nome');
  const p = pair(21);
  const table = { id: 'tb_1', name: 'Clima', text };
  const mine = [], orig = [];
  for (let i = 0; i < 50; i++) {
    const r = p.M.rollTable(i % 2 ? text : p.M.tableItems(table)); mine.push([r.itemIndex, r.itemText]);
    p.co.getRandomValues(new Uint32Array(2)); // o registro do original gasta um sorteio com o id antes de sortear o item
    p.cm.getRandomValues(new Uint32Array(2));
    const e = p.O.buildRoll({ mode: 'tabela', table }, {}); orig.push([e.itemIndex, e.itemText]);
    p.cm.getRandomValues(new Uint32Array(2)); p.co.getRandomValues(new Uint32Array(1));
  }
  ok(mine.every((x) => x[1] === ['Sol', 'Chuva', 'Nevoeiro', 'Neve'][x[0] - 1]) && orig.every((x) => x[1] === ['Sol', 'Chuva', 'Nevoeiro', 'Neve'][x[0] - 1]), 'rollTable e o original leem a mesma tabela do mesmo jeito');
}

/* ================= registros: iguais aos que o rolador grava ================= */
const META = [
  { title: 'Ataque do goblin', description: 'com a espada curta', color: 'azul' },
  { title: '', description: '', color: null },
  { title: 'Sem cor conhecida', color: 'ciano' },
  {},
];
{
  const SPECS = [{ atributo: 60, fixa: 20 }, { atributo: 60, fixa: 0, check: { op: '>=', target: 45 } }, { atributo: 10, fixa: 10, check: { op: '=', target: 10 } },
    { atributo: 1, fixa: 0, check: { op: '<', target: -3 } }, { atributo: 9999999, fixa: 1 }];
  SPECS.forEach((spec, i) => {
    const p = pair(100 + i), meta = META[i % META.length];
    const want = p.O.buildRoll(Object.assign({ mode: 'fixa' }, spec), meta);
    const got = p.M.buildFixa(spec, meta);
    eq(got, want, 'buildFixa(' + j(spec) + ') dá o mesmo registro do original, campo por campo');
  });
}
{
  const EXPRS = ['2d6+3', 'd20', '3d6-1d4+2', '100d6+100d6+100d6', '−1d6', '1d%'];
  EXPRS.forEach((expr, i) => {
    const check = i % 2 ? { op: '<=', target: 7 } : null;
    const meta = META[i % META.length];
    const p = pair(200 + i);
    const want = p.O.buildRoll({ mode: 'dados', parsed: p.O.parseDice(expr), check }, meta);
    eq(p.M.buildDados({ expr, check }, meta), want, 'buildDados({ expr: ' + j(expr) + ' }) dá o mesmo registro do original');
    const q = pair(200 + i);
    eq(q.M.buildDados({ parsed: q.M.parseDice(expr), check }, meta), want, 'buildDados({ parsed }) de ' + j(expr) + ' dá o mesmo registro');
  });
}
{
  const table = { id: 'tb_clima', name: 'Clima', text: 'Sol\n\n Chuva \r\nNevoeiro\nNeve', createdAt: 1, updatedAt: 2 };
  [0, 1, 2].forEach((i) => {
    const p = pair(300 + i);
    eq(p.M.buildTabela({ table }, META[i]), p.O.buildRoll({ mode: 'tabela', table }, META[i]), 'buildTabela dá o mesmo registro do original (' + (i + 1) + ')');
  });
}
const DUELS = [
  [{ name: 'Ataque', atributo: 60, fixa: 20 }, { name: 'Defesa', atributo: 50, fixa: 10 }],
  [{ name: 'Orc', atributo: 40, fixa: 0, check: { op: '>=', target: 20 } }, { name: 'Guarda', expr: '2d20+5', check: { op: '>', target: 12 } }],
  [{ name: 'Mago', expr: '3d6' }, { name: 'Ladino', expr: '1d20-1' }],
  [{ name: 'Muro', atributo: 10, fixa: 10 }, { name: 'Porta', atributo: 10, fixa: 10 }],       // sempre empata
  [{ name: 'A', expr: 'd2' }, { name: 'B', expr: 'd2' }],
];
// do jeito que o formulário do original monta cada lado
const origSide = (P, s) => (s.atributo != null
  ? { name: s.name, mode: 'fixa', atributo: s.atributo, fixa: s.fixa, check: s.check || null }
  : { name: s.name, mode: 'dados', parsed: P.parseDice(s.expr), check: s.check || null });
DUELS.forEach((sides, i) => {
  const p = pair(400 + i), meta = META[i % META.length];
  const want = p.O.buildDuel({ mode: 'duelo', sides: sides.map((s) => origSide(p.O, s)) }, meta);
  const got = p.M.buildDuel(sides, meta);
  eq(got, want, 'buildDuel ' + sides[0].name + ' × ' + sides[1].name + ' dá o mesmo registro do original');
});
{
  const p = pair(404);
  const want = p.O.buildDuel({ mode: 'duelo', sides: DUELS[1].map((s) => origSide(p.O, s)) }, {});
  eq(p.M.buildDuel({ sides: DUELS[1].map((s) => Object.assign({ mode: s.atributo != null ? 'fixa' : 'dados' }, s)) }, {}), want, 'buildDuel também aceita { sides } com mode em cada lado, como no rolador');
}
{
  // desempate: várias rodadas seguidas, comparando o registro depois de cada uma
  let rounds = 0, same = true, decided = 0;
  for (let seed = 500; seed < 540; seed++) {
    const p = pair(seed);
    const want = p.O.buildDuel({ mode: 'duelo', sides: DUELS[4].map((s) => origSide(p.O, s)) }, {});
    const got = p.M.buildDuel(DUELS[4], {});
    while (want.winner == null && want.rounds.length < 12) {
      p.O.addDuelRound(want);
      const back = p.M.addDuelRound(got);
      if (back !== got) same = false;
      rounds++;
    }
    if (j(got) !== j(want)) same = false;
    if (got.winner != null && got.rounds.length > 1) decided++;
  }
  ok(same && rounds > 10 && decided > 5, 'addDuelRound igual ao original em ' + rounds + ' rodadas de desempate (' + decided + ' duelos decididos depois de empate)');
  const p = pair(77);
  const tie = p.M.buildDuel(DUELS[3], {});
  const tieO = p.O.buildDuel({ mode: 'duelo', sides: DUELS[3].map((s) => origSide(p.O, s)) }, {});
  eq([tie.winner, tie.decidedBy, tie.rounds], [null, null, [[{ total: 10, dieValue: 0 }, { total: 10, dieValue: 0 }]]], 'duelo empatado: sem vencedor');
  p.M.addDuelRound(tie); p.M.addDuelRound(tie); p.O.addDuelRound(tieO); p.O.addDuelRound(tieO);
  eq(tie, tieO, 'empate que continua empatado: mesmas 3 rodadas do original');
}
{
  // pelo caminho inteiro do original: campos do formulário → validateForm → buildRoll/buildDuel
  const table = { id: 'tb_x', name: 'Encontros', text: 'Lobo\nUrso\nNada' };
  const FORMS = [
    { mode: 'fixa', fields: { fAtr: '60', fFixa: '20', fAlvo: '45', fOp: '>=' }, mine: (M, meta) => M.buildFixa({ atributo: '60', fixa: '20', check: { op: '>=', target: '45' } }, meta) },
    { mode: 'fixa', fields: { fAtr: ' 12 ', fFixa: '', fAlvo: '' }, mine: (M, meta) => M.buildFixa({ atributo: ' 12 ', fixa: '', check: { op: '>=', target: '' } }, meta) },
    { mode: 'fixa', fields: { fAtr: '8', fFixa: '8', fAlvo: '−2', fOp: '<' }, mine: (M, meta) => M.buildFixa({ atributo: 8, fixa: 8, check: { op: '<', target: -2 } }, meta) },
    { mode: 'dados', fields: { fExpr: ' 2D6 + 3 ', fAlvo: '9', fOp: '<=' }, mine: (M, meta) => M.buildDados({ expr: ' 2D6 + 3 ', check: { op: '<=', target: '9' } }, meta) },
    { mode: 'dados', fields: { fExpr: 'd%−5', fAlvo: '' }, mine: (M, meta) => M.buildDados({ expr: 'd%−5' }, meta) },
    { mode: 'tabela', fields: { fTable: 'tb_x' }, mine: (M, meta) => M.buildTabela({ table }, meta) },
  ];
  FORMS.forEach((f, i) => {
    const p = pair(600 + i), meta = { title: 'Teste ' + i, description: '', color: 'verde' };
    Object.assign(p.fields, f.fields);
    p.O.setState({ mode: f.mode, tables: [table] });
    const v = p.O.validateForm();
    const want = v.ok ? p.O.buildRoll(v.spec, meta) : null;
    eq(f.mine(p.M, meta), want, 'formulário do original (' + f.mode + ', ' + j(f.fields) + ') e o serviço gravam o mesmo registro');
  });
  const p = pair(650);
  Object.assign(p.fields, { d0Name: ' Orc ', d0Atr: '40', d0Fixa: '5', d0Alvo: '20', d0Op: '>', d1Name: '', d1Expr: '2d20+5', d1Alvo: '' });
  p.O.setState({ mode: 'duelo', tables: [] });
  p.O.setDuelModes('fixa', 'dados');
  const v = p.O.validateForm();
  const want = p.O.buildDuel(v.spec, { title: 'Briga', description: 'na taverna', color: 'roxo' });
  const got = p.M.buildDuel([{ name: ' Orc ', atributo: '40', fixa: '5', check: { op: '>', target: '20' } }, { name: '', expr: '2d20+5', check: { op: '>=', target: '' } }],
    { title: 'Briga', description: 'na taverna', color: 'roxo' });
  eq(got, want, 'formulário de duelo do original e buildDuel gravam o mesmo registro (nome aparado, nome padrão, requisito)');
  eq([got.sides[0].name, got.sides[1].name], ['Orc', 'Defesa'], 'duelo: nome aparado e nome padrão do segundo lado');
}
{
  // o que o serviço monta passa pela leitura do rolador (normEntry) sem perder nem mudar nada
  const p = pair(700);
  const table = { id: 'tb_1', name: 'Clima', text: 'Sol\nChuva' };
  const built = [
    p.M.buildFixa({ atributo: 60, fixa: 20, check: { op: '>=', target: 45 } }, META[0]),
    p.M.buildFixa({ atributo: 5, fixa: 5 }, {}),
    p.M.buildDados({ expr: '3d6-1d4+2', check: { op: '<', target: 0 } }, META[0]),
    p.M.buildTabela({ table }, META[1]),
    p.M.buildDuel(DUELS[0], META[0]), p.M.buildDuel(DUELS[1], {}), p.M.buildDuel(DUELS[2], {}), p.M.addDuelRound(p.M.buildDuel(DUELS[3], {})),
  ];
  for (const e of built) eqLoose(p.O.normEntry(JSON.parse(JSON.stringify(e))), e, 'registro de ' + e.mode + ' passa inteiro pela leitura do rolador');
}
{
  const p = pair(800);
  const e = p.M.buildFixa({ atributo: 60, fixa: 20 }, { title: '  Ataque  ', description: ' d '.repeat(900), color: 'rosa', createdAt: 1234567890123 });
  eq([e.type, e.mode, e.pinned, e.color, e.createdAt, e.title, e.description.length], ['roll', 'fixa', false, 'rosa', 1234567890123, 'Ataque', 2000],
    'meta: createdAt informado é mantido; título e descrição entram aparados e no tamanho do rolador');
  ok(/^r_[0-9a-z]+$/.test(e.id), 'meta: id no formato do rolador');
  eq(Object.keys(e), ['id', 'type', 'mode', 'title', 'description', 'color', 'pinned', 'createdAt', 'atributo', 'fixa', 'die', 'dieValue', 'total', 'check'], 'registro de fixa: campos na ordem do rolador');
  eq(p.M.buildDados({ expr: 'd6' }, { title: 'x'.repeat(300) }).title.length, 120, 'meta: título cortado em 120 letras');
  eq([p.M.buildFixa({ atributo: 6 }).title, p.M.buildFixa({ atributo: 6 }, null).color, p.M.buildFixa({ atributo: 6 }, { color: ['azul'] }).color, p.M.buildFixa({ atributo: 6 }, { color: 'constructor' }).color],
    ['', null, null, null], 'meta: pode faltar; cor desconhecida vira sem cor');
  ok(O.COLORS.every((c, i) => j(c) === j(D.COLORS[i])) && D.COLORS.length === O.COLORS.length, 'as cores são as mesmas do rolador');
  const before = p.cm.calls();
  const now = p.M.buildFixa({ atributo: 6, fixa: 6 }, {});
  eq([p.cm.calls() - before, typeof now.createdAt], [1, 'number'], 'sem createdAt, entra a hora atual; fixa total só gasta o sorteio do id');
}

/* ---- os registros recusam entrada errada antes de sortear ---- */
{
  const c = seeded(9);
  const X = loadBrowser({ crypto: c }).TC.dice;
  const table = { id: 'tb_1', name: 'Clima', text: 'Sol' };
  // o original aceita isto e grava um registro errado
  const wrong = O.buildRoll({ mode: 'fixa', atributo: 20, fixa: 30 }, {});
  eq([wrong.total, wrong.die], [30, -10], 'o original grava fixa maior que o atributo como total = fixa (o defeito que foi corrigido)');
  ok(caught(() => O.buildRoll({ mode: 'tabela', table: { id: 't', name: 'Vazia', text: '' } }, {})).name === 'RangeError', 'o original estoura RangeError com tabela vazia (o defeito que foi corrigido)');
  const REFUSED = [
    [() => X.buildFixa({ atributo: 20, fixa: 30 }, {}), 'A fixa (30) passou do atributo (20). Ela pode ir no máximo até 20.'],
    [() => X.buildFixa({ atributo: 0, fixa: 0 }, {}), 'O atributo precisa ser pelo menos 1.'],
    [() => X.buildFixa({ atributo: 6.5 }, {}), 'O atributo só aceita número inteiro (sem letra, vírgula ou ponto).'],
    [() => X.buildFixa({ atributo: 60, fixa: -1 }, {}), 'A fixa só aceita número inteiro (sem letra, vírgula ou ponto).'],
    [() => X.buildFixa({ atributo: 10000000 }, {}), 'Esse atributo é grande demais.'],
    [() => X.buildFixa({}, {}), 'Digite o atributo e quanto quer fixar.'],
    [() => X.buildFixa(), 'Digite o atributo e quanto quer fixar.'],
    [() => X.buildFixa({ atributo: 60, check: { op: '>=', target: 'x' } }, {}), 'O alvo só aceita número inteiro (sem letra, vírgula ou ponto).'],
    [() => X.buildFixa({ atributo: 60, check: { op: '>=', target: 4.5 } }, {}), 'O alvo só aceita número inteiro (sem letra, vírgula ou ponto).'],
    [() => X.buildFixa({ atributo: 60, check: { op: '>=', target: 10000000 } }, {}), 'Esse alvo é grande demais.'],
    [() => X.buildFixa({ atributo: 60, check: { op: '=>', target: 5 } }, {}), 'Não entendi o sinal “=>”. Use >=, >, =, <= ou <.'],
    [() => X.buildFixa({ atributo: 60, check: { op: 'constructor', target: 5 } }, {}), 'Não entendi o sinal “constructor”. Use >=, >, =, <= ou <.'],
    [() => X.buildFixa({ atributo: 60, check: '>= 5' }, {}), 'A comparação precisa vir como { op, target }.'],
    [() => X.buildFixa({ atributo: 60 }, { title: 12 }), 'O título precisa ser um texto.'],
    [() => X.buildFixa({ atributo: 60 }, { description: {} }), 'A descrição precisa ser um texto.'],
    [() => X.buildFixa({ atributo: 60 }, { createdAt: 'ontem' }), 'createdAt precisa ser a hora em milissegundos.'],
    [() => X.buildFixa({ atributo: 60 }, 'título'), 'Título, descrição e cor precisam vir num objeto.'],
    [() => X.buildDados({ expr: '' }, {}), 'Escreva os dados (ex.: 2d6+3).'],
    [() => X.buildDados({}, {}), 'Escreva os dados (ex.: 2d6+3).'],
    [() => X.buildDados({ expr: '2d6+' }, {}), 'Falta completar depois do “+”.'],
    [() => X.buildDados({ expr: '101d6' }, {}), 'Use no máximo 100 dados iguais de uma vez.'],
    [() => X.buildDados({ expr: 20 }, {}), '“expr” precisa ser um texto, como 2d6+3.'],
    [() => X.buildDados({ parsed: X.parseDice('abc') }, {}), 'Não entendi “abc”. Escreva algo como 2d6+3.'],
    [() => X.buildDados({ parsed: X.parseDice('') }, {}), 'Escreva os dados (ex.: 2d6+3).'],
    [() => X.buildDados({ parsed: { terms: [{ kind: 'dice', sign: 1, count: 1000, sides: 6 }], min: 1, max: 6, norm: '1d6' } }, {}), 'Use no máximo 100 dados iguais de uma vez.'],
    [() => X.buildDados({ parsed: { terms: [{ kind: 'dice', sign: 1, count: 1.5, sides: 6 }] } }, {}), '“parsed” precisa ser o resultado de parseDice.'],
    [() => X.buildDados({ parsed: { terms: [{ kind: 'num', sign: 1, value: -3 }] } }, {}), '“parsed” precisa ser o resultado de parseDice.'],
    [() => X.buildDados({ parsed: { terms: 'x' } }, {}), '“parsed” precisa ser o resultado de parseDice.'],
    [() => X.buildDados({ expr: '2d6', check: { op: '<', target: '1,5' } }, {}), 'O alvo só aceita número inteiro (sem letra, vírgula ou ponto).'],
    [() => X.buildTabela({ table: { id: 't', name: 'Vazia', text: ' \n ' } }, {}), 'A tabela “Vazia” está vazia.'],
    [() => X.buildTabela({ table: { id: 't', name: 'Sem texto' } }, {}), 'A tabela “Sem texto” está vazia.'],
    [() => X.buildTabela({}, {}), 'A tabela precisa vir como { id, name, text }.'],
    [() => X.buildTabela({ table: { name: 'Sem id', text: 'a' } }, {}), 'A tabela precisa vir como { id, name, text }.'],
    [() => X.buildTabela({ table: { id: 't', name: 'Lista', text: ['a', 'b'] } }, {}), 'A tabela precisa vir como { id, name, text }.'],
    [() => X.buildDuel([{ atributo: 60 }], {}), 'O duelo precisa de exatamente 2 lados.'],
    [() => X.buildDuel([{ atributo: 60 }, { atributo: 60 }, { atributo: 60 }], {}), 'O duelo precisa de exatamente 2 lados.'],
    [() => X.buildDuel(null, {}), 'O duelo precisa de exatamente 2 lados.'],
    [() => X.buildDuel([{ atributo: 60 }, null], {}), 'Cada lado do duelo precisa vir como um objeto.'],
    [() => X.buildDuel([{ atributo: 20, fixa: 30 }, { atributo: 60 }], {}), 'Ataque: a fixa (30) passou do atributo (20). Ela pode ir no máximo até 20.'],
    [() => X.buildDuel([{ atributo: 60 }, { name: 'Goblin', expr: '2d6+' }], {}), 'Goblin: falta completar depois do “+”.'],
    [() => X.buildDuel([{ atributo: 60 }, { expr: '' }], {}), 'Defesa: escreva os dados (ex.: 2d6+3).'],
    [() => X.buildDuel([{ atributo: 60 }, { atributo: 60, check: { target: 'x' } }], {}), 'Defesa: o alvo só aceita número inteiro (sem letra, vírgula ou ponto).'],
    [() => X.buildDuel([{ atributo: 60 }, { name: 'Vulto' }], {}), 'Vulto: diga se o lado rola fixa (atributo e fixa) ou dados (expr).'],
    [() => X.buildDuel([{ atributo: 60 }, { name: 7, atributo: 60 }], {}), 'O nome do lado precisa ser um texto.'],
    [() => X.addDuelRound(null), 'Essa rolagem não é um duelo que dê para rolar de novo.'],
    [() => X.addDuelRound(X.buildFixa({ atributo: 6, fixa: 6 }, { createdAt: 5 })), 'Essa rolagem não é um duelo que dê para rolar de novo.'],
    [() => X.addDuelRound({ mode: 'duelo', sides: [{ mode: 'fixa', atributo: 20, fixa: 30 }, { mode: 'fixa', atributo: 5, fixa: 0 }], rounds: [], winner: null }), 'Essa rolagem não é um duelo que dê para rolar de novo.'],
    [() => X.addDuelRound({ mode: 'duelo', sides: [{ mode: 'dados', terms: [{ kind: 'dice', sign: 1, count: 100000000, sides: 6 }] }, { mode: 'fixa', atributo: 5, fixa: 0 }], rounds: [], winner: null }), 'Essa rolagem não é um duelo que dê para rolar de novo.'],
  ];
  const start = c.calls();
  let spent = 0;
  for (const [fn, message] of REFUSED) {
    const before = c.calls();
    throwsMsg(fn, message, 'entrada errada é recusada com um Error claro');
    // o único sorteio permitido aqui é o do id do registro montado dentro do próprio teste (addDuelRound de uma fixa)
    spent += c.calls() - before;
  }
  ok(spent === 1 && c.calls() - start === 1, 'nenhuma recusa chega a sortear dado (' + spent + ' sorteio foi o id do registro usado num dos testes)');
  // exemplos com resultado certo: empate decidido não rola de novo
  const won = X.buildDuel([{ name: 'A', atributo: 100, fixa: 99 }, { name: 'B', atributo: 5, fixa: 5 }], {});
  eq([won.winner, won.decidedBy, won.rounds.length], [0, 'rolagem', 1], 'duelo: quem tira mais vence');
  throwsMsg(() => X.addDuelRound(won), 'Esse duelo já tem vencedor: só dá para rolar de novo depois de um empate.', 'addDuelRound não mexe em duelo que já tem vencedor');
  eq(won.rounds.length, 1, 'a rodada recusada não foi acrescentada');
  ok(caught(() => D.buildFixa({ atributo: 20, fixa: 30 })) instanceof Error && caught(() => D.buildTabela({ table: { id: 't', name: 'x', text: '' } })).constructor === Error,
    'no Node, a recusa também é um Error comum (não RangeError)');
}

/* ================= textos ================= */
for (const [atr, fixa, die] of [[60, 20, 8], [60, 0, 33], [60, 60, 0], [1, 0, 1], [5, 4, 1], [9999999, 1, 77]]) {
  const want = O.fixaComp(atr, fixa, die);
  eq([D.fixaComp(atr, fixa, die), D.fixaComp({ atributo: atr, fixa, dieValue: die })], [want, want], 'fixaComp(' + atr + ', ' + fixa + ', ' + die + ') igual ao original, por valores ou pela rolagem');
}
eq([D.fixaComp(60, 20, 8), D.fixaComp(60, 0, 33), D.fixaComp(60, 60, 0)],
  ['8 no d40 + 20 de fixa (atributo 60)', '33 no d60, sem fixa (atributo 60)', 'Fixa total de 60, sem rolar dado (atributo 60)'], 'fixaComp: os três jeitos de contar a fixa');
{
  const many = { kind: 'dice', sign: 1, count: 14, sides: 6, rolls: [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2] };
  const LISTS = [
    [{ kind: 'dice', sign: 1, count: 2, sides: 6, rolls: [5, 1] }, { kind: 'num', sign: 1, value: 3 }],
    [{ kind: 'dice', sign: -1, count: 1, sides: 20, rolls: [17] }, { kind: 'num', sign: -1, value: 2 }, { kind: 'dice', sign: 1, count: 1, sides: 4, rolls: [4] }],
    [many, { kind: 'dice', sign: -1, count: 12, sides: 6, rolls: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6] }],
    [{ kind: 'dice', sign: 1, count: 2, sides: 6 }], [],
  ];
  ok(LISTS.every((t) => D.dadosComp(t) === O.dadosComp(t) && D.dadosComp(t, true) === O.dadosComp(t, true) && D.dadosComp({ terms: t }) === O.dadosComp(t) && D.dadosComp({ terms: t }, true) === O.dadosComp(t, true)),
    'dadosComp igual ao original, curto e completo, por lista ou pela rolagem');
  eq(D.dadosComp(LISTS[0]), '2d6 (5, 1) + 3', 'dadosComp: dados com os resultados entre parênteses');
  eq(D.dadosComp(LISTS[1]), '−1d20 (17) − 2 + 1d4 (4)', 'dadosComp: sinais de menos');
  eq([D.dadosComp([many]), D.dadosComp([many], true)], ['14d6 (1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, …)', '14d6 (1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2)'], 'dadosComp: corta em 12 dados, a não ser no modo completo');
}
const duel = (rounds, winner, decidedBy) => ({ type: 'roll', mode: 'duelo', sides: [{ name: 'Ataque', mode: 'fixa', atributo: 60, fixa: 20 }, { name: 'Defesa', mode: 'fixa', atributo: 50, fixa: 10 }],
  rounds: rounds.map(([a, b]) => [{ total: a, dieValue: a - 20 }, { total: b, dieValue: b - 10 }]), winner, decidedBy });
const DUEL_TEXT = [
  [duel([[47, 42]], 0, 'rolagem'), 'Ataque venceu por 5.', 'Ataque 47 × 42 Defesa. Ataque venceu por 5.'],
  [duel([[30, 44]], 1, 'rolagem'), 'Defesa venceu por 14.', 'Ataque 30 × 44 Defesa. Defesa venceu por 14.'],
  [duel([[33, 33]], null, null), 'Empate em 33.', 'Ataque 33 × 33 Defesa. Empate em 33.'],
  [duel([[33, 33]], 1, 'mestre'), 'Empate em 33: o mestre deu a vitória para Defesa.', 'Ataque 33 × 33 Defesa. Empate em 33: o mestre deu a vitória para Defesa.'],
  [duel([[33, 33], [40, 40], [41, 38]], 0, 'rolagem'), 'Ataque venceu por 3 (desempate na 3ª rodada).', 'Ataque 41 × 38 Defesa. Ataque venceu por 3 (desempate na 3ª rodada).'],
];
for (const [e, text, line] of DUEL_TEXT) {
  eq([D.duelSummary(e), D.duelSummary(e)], [text, O.duelSummary(e)], 'duelSummary: “' + text + '”');
  eq([D.compText(e), D.summary(e)], [O.compText(e), line], 'compText e summary do duelo: “' + line + '”');
}
{
  // compText em registros de verdade, montados pelo original
  const { O: P } = loadOriginal({ crypto: seeded(31) });
  const entries = [
    P.buildRoll({ mode: 'fixa', atributo: 60, fixa: 20 }, {}), P.buildRoll({ mode: 'fixa', atributo: 60, fixa: 0 }, {}), P.buildRoll({ mode: 'fixa', atributo: 7, fixa: 7 }, {}),
    P.buildRoll({ mode: 'dados', parsed: P.parseDice('2d6+3') }, {}), P.buildRoll({ mode: 'dados', parsed: P.parseDice('20d6-1d4') }, {}),
    P.buildRoll({ mode: 'tabela', table: { id: 't', name: 'Clima', text: 'Sol\nChuva\nNevoeiro\nNeve' } }, {}),
    P.buildDuel({ sides: [origSide(P, DUELS[1][0]), origSide(P, DUELS[1][1])] }, {}), P.buildDuel({ sides: [origSide(P, DUELS[3][0]), origSide(P, DUELS[3][1])] }, {}),
  ];
  ok(entries.every((e) => D.compText(e) === P.compText(e) && D.compText(e, true) === P.compText(e, true)), 'compText igual ao original em registros de fixa, dados, tabela e duelo');
  ok(entries.every((e) => typeof D.summary(e) === 'string' && D.summary(e).length > 0 && !/undefined|NaN/.test(D.summary(e))), 'summary dá uma linha para cada registro gravado pelo original');
  eq(D.compText(entries[5]), 'Tabela “Clima”, item ' + entries[5].itemIndex + ' de 4', 'compText da tabela');
}

/* ================= summary ================= */
eq(D.summary({ type: 'roll', mode: 'fixa', atributo: 60, fixa: 20, die: 40, dieValue: 8, total: 28, check: null }), '28 · 8 no d40 + 20 de fixa (atributo 60)', 'summary de fixa');
eq(D.summary({ type: 'roll', mode: 'fixa', atributo: 60, fixa: 60, die: 0, dieValue: 0, total: 60 }), '60 · Fixa total de 60, sem rolar dado (atributo 60)', 'summary de fixa total');
eq(D.summary({ type: 'roll', mode: 'dados', expr: '2d6 + 3', terms: [{ kind: 'dice', sign: 1, count: 2, sides: 6, rolls: [5, 1] }, { kind: 'num', sign: 1, value: 3 }], total: 9, min: 5, max: 15 }),
  '9 · 2d6 + 3 → [5, 1] + 3', 'summary de dados');
eq(D.summary({ mode: 'dados', expr: '1d20 − 1d4 − 2', terms: [{ kind: 'dice', sign: 1, count: 1, sides: 20, rolls: [14] }, { kind: 'dice', sign: -1, count: 1, sides: 4, rolls: [3] }, { kind: 'num', sign: -1, value: 2 }], total: 9 }),
  '9 · 1d20 − 1d4 − 2 → [14] − [3] − 2', 'summary de dados com subtração');
{
  const rolls = [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2];
  const e = { mode: 'dados', expr: '14d6', terms: [{ kind: 'dice', sign: 1, count: 14, sides: 6, rolls }], total: 45 };
  eq([D.summary(e), D.summary(e, true)], ['45 · 14d6 → [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, …]', '45 · 14d6 → [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 1, 2]'], 'summary de dados: curta por padrão, completa quando pedido');
  eq(D.summary({ mode: 'dados', terms: e.terms, total: 45 }), '45 · 14d6 → [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, …]', 'summary de dados sem expr guardada');
}
eq(D.summary({ type: 'roll', mode: 'tabela', tableId: 't', tableName: 'Clima', itemCount: 4, itemIndex: 3, itemText: 'Nevoeiro' }), 'Clima → Nevoeiro (3 de 4)', 'summary de tabela');
eq(D.summary({ id: 's_1', type: 'sep', text: 'Início do combate', createdAt: 1 }), 'Início do combate', 'summary de separador');
eq([D.summary(null), D.summary(undefined), D.summary('x'), D.summary({}), D.summary({ type: 'roll', mode: 'outro' }), D.summary({ mode: 'duelo', sides: [], rounds: [] }), D.summary({ mode: 'dados', total: 3 })],
  ['', '', '', '', '', '', ''], 'summary: o que não reconhece vira linha vazia, sem erro');
{
  const c = scripted([7, 4, 0, 2]);
  const X = loadBrowser({ crypto: c }).TC.dice;
  eq(X.summary(X.rollFixa(60, 20)), '28 · 8 no d40 + 20 de fixa (atributo 60)', 'summary também serve para o resultado de rollFixa');
  eq(X.summary(X.rollExpr('2d6+3')), '9 · 2d6 + 3 → [5, 1] + 3', 'summary também serve para o resultado de rollExpr');
  eq(X.summary(X.rollTable('Sol\nChuva\nNevoeiro\nNeve')), 'Nevoeiro (3 de 4)', 'summary também serve para o resultado de rollTable');
}

/* ================= comandos do chat ================= */
const roll = (expr, check) => ({ type: 'dados', expr, check: check || null });
const fixa = (atributo, fx, check) => ({ type: 'fixa', atributo, fixa: fx, check: check || null });
const erro = (message) => ({ type: 'erro', message });
const BAD_INT = 'só aceita número inteiro (sem letra, vírgula ou ponto).';
const USO_FIXA = 'Escreva algo como /fixa 60 20 ou /fixa 60 20 >= 45.';
const COMMANDS = [
  // conversa
  ['oi, pessoal', { type: 'chat', text: 'oi, pessoal' }],
  ['  com espaço em volta  ', { type: 'chat', text: 'com espaço em volta' }],
  ['', { type: 'chat', text: '' }], ['   ', { type: 'chat', text: '' }],
  ['2d6+3', { type: 'chat', text: '2d6+3' }], ['e/ou', { type: 'chat', text: 'e/ou' }], ['linha 1\nlinha 2', { type: 'chat', text: 'linha 1\nlinha 2' }],
  // dados
  ['/r 2d6+3', roll('2d6 + 3')], ['/rolar 2d6+3', roll('2d6 + 3')], ['/roll 2d6+3', roll('2d6 + 3')],
  ['/R 2D6+3', roll('2d6 + 3')], ['/Rolar 2d6 + 3', roll('2d6 + 3')], ['/ROLL 2d6+3', roll('2d6 + 3')],
  ['  /r   2d6+3  ', roll('2d6 + 3')], ['/r\t2d6+3', roll('2d6 + 3')], ['/r2d6+3', roll('2d6 + 3')], ['/rolar2d6 +3', roll('2d6 + 3')],
  ['/r 20', roll('1d20')], ['/r 100', roll('1d100')], ['/r d20', roll('1d20')], ['/r d%', roll('1d100')], ['/r 1d20-2', roll('1d20 − 2')], ['/r 1d20−2', roll('1d20 − 2')],
  ['/r 1d20+5 >= 15', roll('1d20 + 5', { op: '>=', target: 15 })], ['/r 1d20+5>=15', roll('1d20 + 5', { op: '>=', target: 15 })],
  ['/r 1d20+5 ≥ 15', roll('1d20 + 5', { op: '>=', target: 15 })], ['/r 1d20+5 > 15', roll('1d20 + 5', { op: '>', target: 15 })],
  ['/r 1d20+5 = 15', roll('1d20 + 5', { op: '=', target: 15 })], ['/r 1d20+5 <= 15', roll('1d20 + 5', { op: '<=', target: 15 })],
  ['/r 1d20+5 ≤ 15', roll('1d20 + 5', { op: '<=', target: 15 })], ['/r 1d20+5 < 15', roll('1d20 + 5', { op: '<', target: 15 })],
  ['/r 1d20-2 >= -3', roll('1d20 − 2', { op: '>=', target: -3 })], ['/r 1d20 >= −3', roll('1d20', { op: '>=', target: -3 })],
  ['/r 20 >= 10', roll('1d20', { op: '>=', target: 10 })], ['/rolar 2d6 <7', roll('2d6', { op: '<', target: 7 })], ['/r2d6>=7', roll('2d6', { op: '>=', target: 7 })],
  ['/r', erro('Falta o dado. Escreva algo como /r 1d20 ou /r 2d6+3 >= 10.')], ['/rolar   ', erro('Falta o dado. Escreva algo como /rolar 1d20 ou /rolar 2d6+3 >= 10.')],
  ['/ROLL', erro('Falta o dado. Escreva algo como /roll 1d20 ou /roll 2d6+3 >= 10.')], ['/r >= 10', erro('Falta o dado. Escreva algo como /r 1d20 ou /r 2d6+3 >= 10.')],
  ['/r abc', erro('Não entendi “abc”. Escreva algo como 2d6+3.')], ['/r 1', erro('O dado precisa ter pelo menos 2 lados.')], ['/r 0', erro('O dado precisa ter pelo menos 2 lados.')],
  ['/r 100001', erro('O dado pode ter no máximo 100000 lados.')], ['/r 2d6+', erro('Falta completar depois do “+”.')], ['/r 101d6', erro('Use no máximo 100 dados iguais de uma vez.')],
  ['/r 5+5', erro('Falta o dado. Escreva algo como 1d20 ou 2d6+3.')], ['/r 2d6 3', erro('Falta um + ou − antes de “3”.')],
  ['/r 1d20 >=', erro('Falta o alvo depois do “≥”.')], ['/r 1d20 <', erro('Falta o alvo depois do “<”.')],
  ['/r 1d20 >= abc', erro('O alvo ' + BAD_INT)], ['/r 1d20 >= 1.5', erro('O alvo ' + BAD_INT)], ['/r 1d20 >= 15 de novo', erro('O alvo ' + BAD_INT)],
  ['/r 1d20 >= 99999999', erro('Esse alvo é grande demais.')],
  ['/r 1d20 => 10', erro('Não entendi o sinal “=>”. Use >=, >, =, <= ou <.')], ['/r 1d20 == 10', erro('Não entendi o sinal “==”. Use >=, >, =, <= ou <.')],
  ['/r 1d20 <> 10', erro('Não entendi o sinal “<>”. Use >=, >, =, <= ou <.')],
  ['/r ' + '1d6+'.repeat(40) + '1d6', erro('Essa rolagem ficou comprida demais. Escreva algo como /r 2d6+3.')],
  // fixa
  ['/fixa 60 20', fixa(60, 20)], ['/f 60 20', fixa(60, 20)], ['/FIXA 60 20', fixa(60, 20)], ['/Fixa   60    20  ', fixa(60, 20)], ['/f60 20', fixa(60, 20)],
  ['/fixa 60', fixa(60, 0)], ['/f 60', fixa(60, 0)], ['/fixa 60 0', fixa(60, 0)], ['/fixa 60 60', fixa(60, 60)], ['/fixa 9999999 1', fixa(9999999, 1)],
  ['/fixa 60 20 >= 45', fixa(60, 20, { op: '>=', target: 45 })], ['/fixa 60 20>=45', fixa(60, 20, { op: '>=', target: 45 })], ['/f 60 >= 45', fixa(60, 0, { op: '>=', target: 45 })],
  ['/f 60 20 ≤ 30', fixa(60, 20, { op: '<=', target: 30 })], ['/fixa 60 20 = -1', fixa(60, 20, { op: '=', target: -1 })], ['/f60>50', fixa(60, 0, { op: '>', target: 50 })],
  ['/fixa', erro('Digite o atributo e quanto quer fixar. ' + USO_FIXA)], ['/f', erro('Digite o atributo e quanto quer fixar. Escreva algo como /f 60 20 ou /f 60 20 >= 45.')],
  ['/fixa >= 45', erro('Digite o atributo e quanto quer fixar. ' + USO_FIXA)],
  ['/fixa abc', erro('O atributo ' + BAD_INT)], ['/fixa 60,20', erro('O atributo ' + BAD_INT)], ['/fixa -5', erro('O atributo ' + BAD_INT)], ['/fixa 6.5', erro('O atributo ' + BAD_INT)],
  ['/fixa 60 abc', erro('A fixa ' + BAD_INT)], ['/fixa 60 +20', erro('A fixa ' + BAD_INT)],
  ['/fixa 0', erro('O atributo precisa ser pelo menos 1.')], ['/fixa 20 30', erro('A fixa (30) passou do atributo (20). Ela pode ir no máximo até 20.')],
  ['/fixa 99999999', erro('Esse atributo é grande demais.')], ['/fixa 60 99999999', erro('Essa fixa é grande demais.')],
  ['/fixa 60 20 30', erro('O /fixa só leva o atributo e a fixa. ' + USO_FIXA)],
  ['/fixa 60 20 >=', erro('Falta o alvo depois do “≥”.')], ['/fixa 60 20 >= x', erro('O alvo ' + BAD_INT)], ['/fixa 60 20 =< 5', erro('Não entendi o sinal “=<”. Use >=, >, =, <= ou <.')],
  // ação
  ['/me saca a espada', { type: 'me', text: 'saca a espada' }], ['/ME   olha em volta  ', { type: 'me', text: 'olha em volta' }], ['/me 1d20 >= 5', { type: 'me', text: '1d20 >= 5' }],
  ['/me', erro('Falta dizer a ação. Escreva algo como /me saca a espada.')], ['/me    ', erro('Falta dizer a ação. Escreva algo como /me saca a espada.')],
  // ajuda
  ['/ajuda', { type: 'ajuda' }], ['/help', { type: 'ajuda' }], ['/?', { type: 'ajuda' }], ['/AJUDA', { type: 'ajuda' }], ['/Help agora', { type: 'ajuda' }],
  // desconhecido
  ['/', erro('Não entendi o comando “/”. Escreva /ajuda para ver os comandos.')], ['/xyz', erro('Não entendi o comando “/xyz”. Escreva /ajuda para ver os comandos.')],
  ['/dado 2d6', erro('Não entendi o comando “/dado”. Escreva /ajuda para ver os comandos.')], ['/meu deus', erro('Não entendi o comando “/meu”. Escreva /ajuda para ver os comandos.')],
  ['/ r 2d6', erro('Não entendi o comando “/”. Escreva /ajuda para ver os comandos.')], ['/rd20', erro('Não entendi o comando “/rd20”. Escreva /ajuda para ver os comandos.')],
  ['/constructor', erro('Não entendi o comando “/constructor”. Escreva /ajuda para ver os comandos.')], ['/__proto__ 1', erro('Não entendi o comando “/__proto__”. Escreva /ajuda para ver os comandos.')],
  ['/' + 'x'.repeat(60), erro('Não entendi o comando “/' + 'x'.repeat(24) + '…”. Escreva /ajuda para ver os comandos.')],
];
for (const [text, want] of COMMANDS) eq(D.command(text), want, 'command(' + j(text) + ')');
eq([D.command(null), D.command(undefined), D.command(42)], [{ type: 'chat', text: '' }, { type: 'chat', text: '' }, { type: 'chat', text: '42' }], 'command: o que não é texto vira conversa');
ok(COMMANDS.every(([text]) => { const r = D.command(text); return r.type !== 'erro' || (r.message.length <= 130 && /[.!]$/.test(r.message)); }), 'command: toda mensagem de erro é curta e termina em ponto');
{
  // o que o comando devolve serve direto para rolar e para gravar
  const c = D.command('/r 1d20−2 >= -3');
  const r = D.rollExpr(c.expr), e = D.buildDados({ expr: c.expr, check: c.check }, { title: 'pelo chat' });
  ok(r.ok && r.expr === c.expr && e.expr === c.expr && j(e.check) === j(c.check) && e.min === -1 && e.max === 18, 'command → rollExpr e buildDados: a expressão normalizada é lida de volta igual');
  const f = D.command('/fixa 60 20 >= 45');
  const g = D.buildFixa({ atributo: f.atributo, fixa: f.fixa, check: f.check }, {});
  ok(g.atributo === 60 && g.fixa === 20 && g.total >= 21 && g.total <= 60 && j(g.check) === '{"op":">=","target":45}' && D.verdict(g.total, g.check).passed === (g.total >= 45), 'command → buildFixa → verdict');
  let before = 0;
  const cnt = { getRandomValues(buf) { before++; return buf; } };
  const X = loadBrowser({ crypto: cnt }).TC.dice;
  COMMANDS.forEach(([text]) => X.command(text));
  eq(before, 0, 'command só interpreta: não sorteia nada');
}
ok(Array.isArray(D.HELP) && D.HELP.length >= 4 && D.HELP.every((h) => typeof h.cmd === 'string' && h.cmd.charAt(0) === '/' && typeof h.desc === 'string' && h.desc.length > 10 && j(Object.keys(h)) === '["cmd","desc"]'),
  'HELP: lista de { cmd, desc }');
{
  const all = D.HELP.map((h) => h.cmd + ' ' + h.desc).join(' ');
  ok(['/r ', '/rolar', '/roll', '/fixa', '/f', '/me', '/ajuda', '/help', '/?', '>=', '<='].every((w) => all.includes(w)), 'HELP cita todos os comandos e os sinais');
  // todo exemplo que a ajuda mostra tem de funcionar de verdade
  const examples = all.match(/\/(?:r|fixa|me) [^.:]*?(?=\.| rola | Também|$)/g) || [];
  const tried = examples.map((x) => x.trim()).filter((x) => !/</.test(x.replace(/<=?\s*\d/, '')));
  ok(tried.length >= 5 && tried.every((x) => !['erro', 'chat'].includes(D.command(x).type)), 'HELP: os exemplos da ajuda são comandos válidos — ' + tried.map((x) => x + ' → ' + D.command(x).type).join('; '));
}

/* ================= fim ================= */
if (fails) { console.log((n - fails) + ' verificações passaram, ' + fails + ' falharam'); process.exit(1); }
console.log(n + ' verificações passaram');
