// Testes das partes puras, sem navegador: a barra que pode ficar negativa (piso) e a barra que tem um começo próprio.
// Dano e cura, o que se digita, a cura total, o que os jogadores recebem (projeção) e o pedido de um jogador.
const fs = require('fs'), path = require('path'), vm = require('vm');
const FILES = ['01-base.js', '02-store.js', '03-geo.js', '03b-walls.js', '07-app.js', '07c-projecao.js'];
const src = FILES.map(f => fs.readFileSync(path.join(__dirname, '../src/js', f), 'utf8')).join('\n');
const sandbox = {
  console, Math, JSON, Date, Number, String, Object, Array, Map, Set, Uint8Array, Uint32Array, isFinite, parseFloat, parseInt, setTimeout, clearTimeout,
  document: { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 10 }), isPointInPath: () => false }) }), createElementNS: () => ({ setAttribute() {}, append() {} }) },
  Path2D: function () {}, performance: { now: () => 0 },
  Render: { request() {} }, UI: { toast() {} }, Tools: { undo() {} }, Nuvem: { ping() {} },
  FX: { P: { fogo: { n: 'Fogo' } } },
  crypto: { getRandomValues(buf) { buf[0] = Math.floor(Math.random() * 4294967296); return buf; } },
};
vm.createContext(sandbox);
vm.runInContext(src + `\n;globalThis.T = { Store, Proj, newScene, newToken, normalizeScene, Act, App, cleanBar, barAfter, barWith, barX, barLo, barFull, barNeg, parseBar, areaNext, fmtV, clone };`, sandbox);
const { Store, Proj, newScene, newToken, normalizeScene, Act, cleanBar, barAfter, barLo, barFull, barNeg, parseBar, areaNext, fmtV, clone } = sandbox.T;

let fails = 0, n = 0;
const ok = (cond, msg) => { n++; if (!cond) { fails++; console.log('FALHOU:', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} — esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);
const ida = x => JSON.parse(JSON.stringify(x));

/* ============ a barra guardada: piso (lo) e começo (st) ============ */
{
  const comum = cleanBar({ n: 'Vida', v: -5, m: 10 });
  eq([comum.v, comum.lo, comum.st], [0, undefined, undefined], 'a barra comum não fica negativa (e não guarda piso nem começo)');
  const neg = cleanBar({ n: 'HP', v: -8, m: 100, lo: 10 });
  eq([neg.v, neg.lo], [-8, 10], 'com piso, o valor negativo é guardado');
  eq(cleanBar({ n: 'HP', v: -80, m: 100, lo: 10 }).v, -10, 'e nunca passa do piso');
  eq([cleanBar({ v: 1, m: 5, lo: 0 }).lo, cleanBar({ v: 1, m: 5, lo: -4 }).lo, cleanBar({ v: 1, m: 5, lo: 'x' }).lo, cleanBar({ v: 1, m: 5, lo: 2.26 }).lo], [undefined, undefined, undefined, 2.3], 'piso zero, negativo ou torto não fica guardado; uma casa decimal');
  eq([cleanBar({ v: 4, m: 20, st: 4 }).st, cleanBar({ v: 4, m: 20, st: 99 }).st, cleanBar({ v: 4, m: 20, st: -3 }).st, cleanBar({ v: 4, m: 20, st: -3, lo: 5 }).st, cleanBar({ v: 4, m: 20, st: null }).st, cleanBar({ v: 4, m: 20, st: '' }).st, cleanBar({ v: 4, m: 20, st: 0 }).st],
    [4, 20, 0, -3, undefined, undefined, 0], 'o começo fica dentro da barra (entre o piso e o máximo); zero é um começo de verdade');
  eq([barLo({}), barLo(null), barLo({ lo: 7 }), barFull({ m: 20 }), barFull({ m: 20, st: 4 }), barFull({ m: 20, st: 0 })], [0, 0, 7, 20, 4, 0], 'barLo e barFull');
  eq([barNeg({ v: 5, m: 10, lo: 10 }), barNeg({ v: -5, m: 10, lo: 10 }), barNeg({ v: -50, m: 10, lo: 10 }), barNeg({ v: -5, m: 10 })], [0, 0.5, 1, 0], 'barNeg: quanto do piso a barra negativa já gastou');
  eq(fmtV(-5), '−5', 'o valor negativo aparece com o sinal de menos de verdade');
  const sc = newScene('x'); const t = newToken(sc, 0, 0, { name: 'A' });
  t.bars = [{ n: 'HP', c: '#d6524b', v: -3, m: 30, lo: 5, st: 12, ref: 'hp', on: true }]; sc.tokens.push(t);
  const volta = normalizeScene(ida(sc)).tokens[0].bars[0];
  eq([volta.v, volta.lo, volta.st, volta.ref], [-3, 5, 12, 'hp'], 'a cena guardada e reaberta mantém o piso, o começo e o valor negativo');
}

/* ============ dano, cura e o que se digita ============ */
{
  const b = { n: 'HP', v: 6, m: 30, lo: 10 };
  eq(barAfter(b, -10), { v: -4 }, 'dano que passa de zero numa barra com piso: 6 − 10 = −4');
  eq(barAfter(b, -100), { v: -10 }, 'e para no piso');
  eq(barAfter({ n: 'HP', v: -4, m: 30, lo: 10 }, 9), { v: 5 }, 'a cura sobe de volta, passando por zero');
  eq(barAfter({ n: 'HP', v: -4, m: 30, lo: 10 }, 99), { v: 30 }, 'até o máximo');
  eq(barAfter({ n: 'HP', v: 6, m: 30, lo: 10, x: 4 }, -12), { v: -2, x: 0 }, 'a sobrevida continua levando o dano primeiro');
  eq(barAfter({ n: 'Vida', v: 6, m: 30 }, -100), { v: 0 }, 'a barra comum continua parando em zero');
  eq([areaNext(b, -20, false), areaNext(b, -20, true)], [-10, -4], 'dano em área: a prévia também desce abaixo de zero (e a metade arredonda para baixo)');
  eq([parseBar('-10', 6, 30, 10), parseBar('-100', 6, 30, 10), parseBar('+3', -4, 30, 10), parseBar('-10', 6, 30), parseBar('12', 6, 30, 10), parseBar('x', 6, 30, 10)], [-4, -10, -1, 0, 12, null], 'digitado: −10 e +3 somam (até o piso); sem piso, para em zero');

  const sc = newScene('acao'); Store.addScene(sc); Store.setCurrent(sc.id);
  const t = newToken(sc, 0, 0, { name: 'Selene' });
  t.bars = [cleanBar({ n: 'HP', v: 6, m: 30, lo: 10, ref: 'hp' }), cleanBar({ n: 'Gelo', v: 13, m: 20, st: 4, ref: 'gelo' }), cleanBar({ n: 'SP', v: 3, m: 12 }), cleanBar({ n: 'Fúria', v: 0, m: 10, st: 0 }), cleanBar({ n: 'Fora', v: 1, m: 9, on: false })];
  Store.add('tokens', t);
  const tk = () => Store.get('tokens', t.id);
  ok(Act.barSet(tk(), 0, '-9') && tk().bars[0].v === -3, 'digitar −9 na barra com piso: 6 → −3');
  ok(Act.barSet(tk(), 0, '-90') && tk().bars[0].v === -10, 'digitar −90: fica no piso (−10)');
  ok(!Act.barSet(tk(), 0, '-5') && tk().bars[0].v === -10, 'no piso, mais dano não muda nada');
  ok(Act.barSet(tk(), 2, '-90') && tk().bars[2].v === 0, 'a barra comum, ao lado, continua parando em zero');
  const nCura = Act.fullHeal([tk()]);
  eq([nCura, tk().bars.map(b => b.v)], [1, [30, 4, 12, 0, 1]], 'cura total: a negativa enche; a que começa em 4 volta a 4 (vinha de 13); a comum enche; a que começa vazia fica vazia; a que não está em uso fica como está');
  eq(Act.fullHeal([tk()]), 0, 'de novo, não há o que curar');
  Act.barSet(tk(), 1, '2');
  ok(Act.fullHeal([tk()]) === 1 && tk().bars[1].v === 4, 'abaixo do começo, a cura total sobe até ele');
  Store.undo(); Store.undo();
  eq(tk().bars[1].v, 4, 'e tudo isso entra no desfazer (voltou ao 4 de antes do "2")');
}

/* ============ o que os jogadores recebem ============ */
{
  const ANA = 'u-ana';
  const sc = newScene('proj'); sc.id = 'cena_p';
  const npc = newToken(sc, 0, 0, { name: 'Ogro' }), pj = newToken(sc, 70, 0, { name: 'Selene' });
  npc.barVis = 'bar';
  npc.bars = [cleanBar({ n: 'HP', v: -5, m: 40, lo: 20 }), cleanBar({ n: 'Raiva', v: 5, m: 10 }), cleanBar({ n: 'Segredo', v: -1, m: 10, lo: 5, vis: 'none' }), cleanBar({ n: 'Aberta', v: -2, m: 10, lo: 4, vis: 'num', st: 3 })];
  pj.owner = ANA; pj.char = 'pc_selene';
  pj.bars = [cleanBar({ n: 'HP', v: -8, m: 100, lo: 10, ref: 'hp' }), cleanBar({ n: 'Gelo', v: 13, m: 20, st: 4, ref: 'gelo' })];
  sc.tokens.push(npc, pj);
  const pub = ida(Proj.projetar(sc, {}, new Set([ANA])).v.tokens);
  const bn = pub.find(x => x.name === 'Ogro').bars;
  eq([bn[0].v, bn[0].m, bn[0].lo], [-25, 100, 100], 'barra "só a proporção" abaixo de zero: vai a proporção da parte negativa (25% do piso), sem os números');
  eq([bn[1].v, bn[1].m, bn[1].lo], [50, 100, undefined], 'a barra positiva continua como proporção de 0 a 100');
  eq([bn[2].on, bn[2].n, bn[2].v], [false, 'Barra', 0], 'a barra que ninguém vê não leva nem o nome');
  eq([bn[3].v, bn[3].m, bn[3].lo, bn[3].st], [-2, 10, 4, 3], 'a barra com números à mostra vai inteira (valor negativo, piso e começo)');
  const bj = pub.find(x => x.name === 'Selene').bars;
  eq([bj[0].v, bj[0].lo, bj[1].st, bj[1].ref], [-8, 10, 4, 'gelo'], 'o token do jogador vai com as barras dele como são');
  ok(barNeg(bn[0]) === 0.25, 'e, do outro lado, a proporção negativa é desenhada como 25% do piso');

  /* ---- o pedido do jogador (o mestre aplica por cima do que tem) ---- */
  const pede = (antes, depois) => Proj.validar({ t: 'upd', c: 'tokens', id: pj.id, p: { bars: depois }, b: { bars: antes } }, ANA, sc);
  sc.perms = Object.assign({}, sc.perms, { barras: true });
  const base = clone(pj.bars);
  let d = clone(base); d[0].v = -9;
  eq(pede(base, d).p.bars[0].v, -9, 'o jogador desce a barra dele abaixo de zero (de −8 para −9)');
  d = clone(base); d[0].v = -500;
  eq(pede(base, d).p.bars[0].v, -10, 'mas não além do piso da barra');
  d = clone(base); d[1].v = -6;
  eq(pede(base, d).p.bars[1].v, 0, 'e a barra sem piso continua parando em zero');
  d = clone(base); d[0].v = 20; d[0].lo = 999; d[0].st = 50; d[0].m = 5;
  const r = pede(base, d).p.bars[0];
  eq([r.v, r.lo, r.st, r.m], [20, 10, undefined, 100], 'o jogador só mexe no valor: piso, começo e máximo continuam os do mestre');
  // o mestre deu dano enquanto o jogador curava: valem as duas variações, a partir do valor de agora
  pj.bars[0].v = -2;
  d = clone(base); d[0].v = -5;                                   // (o jogador curou 3: de −8 para −5)
  eq(pede(base, d).p.bars[0].v, 1, 'pedido feito sobre um valor antigo: vale a variação (+3) sobre o de agora (−2 → 1)');

  /* ---- o mestre em dois aparelhos: o que um fez é refeito por cima do que chegou do outro ---- */
  const sc2 = newScene('dois'); sc2.id = 'cena_d';
  const t2 = newToken(sc2, 0, 0, { name: 'Chefe' }); t2.bars = [cleanBar({ n: 'HP', v: -3, m: 50, lo: 20 })]; sc2.tokens.push(t2);
  const b0 = [cleanBar({ n: 'HP', v: 4, m: 50, lo: 20 })], meu = [cleanBar({ n: 'HP', v: -6, m: 50, lo: 20 })];      // aqui: −10; lá: −7
  Proj.aplicarEm(sc2, [{ t: 'upd', c: 'tokens', id: t2.id, p: { bars: meu }, b: { bars: b0 } }], true);
  eq(sc2.tokens[0].bars[0].v, -13, 'duas variações negativas se somam abaixo de zero (4 → −3 lá, −10 aqui = −13)');
  const t3 = newToken(sc2, 70, 0, { name: 'Capanga' }); t3.bars = [cleanBar({ n: 'HP', v: -15, m: 50, lo: 20 })]; sc2.tokens.push(t3);
  Proj.aplicarEm(sc2, [{ t: 'upd', c: 'tokens', id: t3.id, p: { bars: [cleanBar({ n: 'HP', v: -8, m: 50, lo: 20 })] }, b: { bars: [cleanBar({ n: 'HP', v: 4, m: 50, lo: 20 })] } }], true);
  eq(sc2.tokens[1].bars[0].v, -20, 'e a soma para no piso (−15 − 12 = −27 → −20)');
  const t4 = newToken(sc2, 140, 0, { name: 'Sem piso' }); t4.bars = [cleanBar({ n: 'HP', v: 2, m: 50 })]; sc2.tokens.push(t4);
  Proj.aplicarEm(sc2, [{ t: 'upd', c: 'tokens', id: t4.id, p: { bars: [cleanBar({ n: 'HP', v: 0, m: 50 })] }, b: { bars: [cleanBar({ n: 'HP', v: 9, m: 50 })] } }], true);
  eq(sc2.tokens[2].bars[0].v, 0, 'sem piso, a soma das variações continua parando em zero');
}

console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `\n${n} verificações passaram`);
process.exit(fails ? 1 : 0);
