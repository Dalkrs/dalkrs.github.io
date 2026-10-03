// Testes da v2 nas partes puras: barras, condições (contador e duração), área, mira, paredes e turnos.
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = ['01-base.js', '02-store.js', '03-geo.js', '07-app.js'].map(f => fs.readFileSync(path.join(__dirname, '../src/js', f), 'utf8')).join('\n');
const toasts = [];
const sandbox = {
  console, Math, JSON, Date, Number, String, Object, Array, Map, Set, Uint8Array, isFinite, parseFloat, parseInt, setTimeout, clearTimeout,
  document: { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 10 }), isPointInPath: () => false }) }), createElementNS: () => ({ setAttribute() {}, append() {} }) },
  Path2D: function () {}, performance: { now: () => 0 },
  Render: { request() {} }, UI: { toast: t => toasts.push(t) }, Tools: { undo() {} },
  FX: { P: { fogo: { n: 'Fogo' }, gelo: { n: 'Gelo' } } },
};
vm.createContext(sandbox);
vm.runInContext(src + `\n;globalThis.T = { Store, newScene, newToken, normalizeScene, Act, App, can, setSel, cleanBar, barDefaults, BAR_DEFAULTS, MAX_BARS,
  wallBlocksSight, wallBlocksMove, barMode, barsShown, areaAmount, areaNext, floatDelta, TONES, uid };`, sandbox);
const { Store, newScene, newToken, normalizeScene, Act, App, can, setSel, cleanBar, barDefaults, BAR_DEFAULTS, MAX_BARS,
  wallBlocksSight, wallBlocksMove, barMode, barsShown, areaAmount, areaNext, floatDelta, uid } = sandbox.T;

let fails = 0, n = 0;
const ok = (cond, msg) => { n++; if (!cond) { fails++; console.log('FALHOU:', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} — esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);

const sc = newScene('t');
Store.addScene(sc); Store.S.current = sc.id;
Store.S.players.push({ id: 'p1', name: 'P', color: '#4fb8e0' });

/* ---- Barras ---- */
eq(cleanBar({ n: 'X', c: 'azul', v: -3, m: 'a', k: 'zzz', vis: 'tudo' }), { n: 'X', c: '#d6524b', v: 0, m: 0, k: 'bar', on: true, vis: '' }, 'cleanBar conserta valores inválidos');
eq(cleanBar({ n: 'Poder', c: '#B07AD9', v: 3, m: 5, k: 'pts', on: false, vis: 'none' }), { n: 'Poder', c: '#B07AD9', v: 3, m: 5, k: 'pts', on: false, vis: 'none' }, 'cleanBar mantém o que é válido');
eq(cleanBar({ n: 'x'.repeat(60) }).n.length, 24, 'nome da barra limitado a 24 letras');
eq(barDefaults().map(b => b.n), ['Vida', 'SP', 'Energia'], 'barras de fábrica');
const a = newToken(sc, 0, 0, { name: 'A' });
eq(a.bars.map(b => [b.n, b.on, b.k]), [['Vida', true, 'bar'], ['SP', false, 'bar'], ['Energia', false, 'bar']], 'token novo nasce com as de fábrica');
a.bars[0].v = 1;
eq(BAR_DEFAULTS[0].v, 10, 'mexer num token não altera a lista de fábrica');
Store.S.prefs.barDefaults = [{ n: 'PV', c: '#d6524b', v: 30, m: 30, k: 'bar', on: true }, { n: 'Cargas', c: '#b07ad9', v: 4, m: 4, k: 'pts', on: true }];
const b = newToken(sc, 64, 0, { name: 'B' });
eq(b.bars.map(x => [x.n, x.m, x.k]), [['PV', 30, 'bar'], ['Cargas', 4, 'pts']], 'token novo usa as barras padrão do mestre');
Store.S.prefs.barDefaults = Array.from({ length: 12 }, (_, i) => ({ n: 'B' + i, m: 5, v: 5 }));
eq(barDefaults().length, MAX_BARS, 'lista padrão respeita o limite de barras');
Store.S.prefs.barDefaults = [];
eq(barDefaults().length, 3, 'lista padrão vazia volta às de fábrica');
delete Store.S.prefs.barDefaults;

Store.add('tokens', a); Store.add('tokens', b);
ok(Act.barAdd(a), 'adicionar barra');
eq([a.bars.length, a.bars[3].n, a.bars[3].on, a.bars[3].k], [4, 'Barra 4', true, 'bar'], 'barra nova entra ligada, em estilo barra');
ok(a.bars[3].c !== a.bars[0].c && a.bars[3].c !== a.bars[1].c && a.bars[3].c !== a.bars[2].c, 'barra nova ganha uma cor ainda não usada');
while (a.bars.length < MAX_BARS) Act.barAdd(a);
ok(!Act.barAdd(a) && a.bars.length === MAX_BARS, 'não passa do limite por token');
Act.barDel(a, 1);
eq([a.bars.length, a.bars[1].n], [MAX_BARS - 1, 'Energia'], 'remover barra');
Store.undo();
eq([a.bars.length, a.bars[1].n], [MAX_BARS, 'SP'], 'desfazer devolve a barra removida no lugar');
Act.barPatch(a, 0, { k: 'pts', vis: 'none' });
eq([a.bars[0].k, a.bars[0].vis], ['pts', 'none'], 'estilo e visibilidade por barra');

// quem vê o quê
const npc = newToken(sc, 128, 0, { name: 'N', barVis: 'bar', bars: [cleanBar({ n: 'Vida', v: 5, m: 10 }), cleanBar({ n: 'Segredo', v: 2, m: 4, vis: 'none' }), cleanBar({ n: 'Aberta', v: 2, m: 4, vis: 'num' }), cleanBar({ n: 'Zero', v: 0, m: 0 }), cleanBar({ n: 'Off', v: 1, m: 2, on: false })] });
const mine = newToken(sc, 192, 0, { name: 'M', owner: 'p1', barVis: 'none', bars: [cleanBar({ n: 'Vida', v: 5, m: 10 }), cleanBar({ n: 'Fé', v: 1, m: 3, vis: 'none' })] });
Store.add('tokens', npc); Store.add('tokens', mine);
App.viewer = 'gm';
eq(barsShown(npc).map(x => [x.b.n, x.mode, x.i]), [['Vida', 'num', 0], ['Segredo', 'num', 1], ['Aberta', 'num', 2]], 'mestre vê todas as barras ligadas, com números');
App.viewer = 'p1';
eq(barsShown(npc).map(x => [x.b.n, x.mode]), [['Vida', 'bar'], ['Aberta', 'num']], 'jogador: a regra da barra vence a do token');
eq(barsShown(mine).map(x => [x.b.n, x.mode]), [['Vida', 'num'], ['Fé', 'num']], 'o dono vê tudo do próprio token');
eq(barMode(npc, npc.bars[1]), 'none', 'barra escondida dos outros');
App.viewer = 'gm';

/* ---- Condições: contador (na mão) e duração ---- */
Act.condToggle([npc], 'fogo');
eq([npc.conds, npc.cinfo], [['fogo'], {}], 'condição ligada, sem contador');
eq(Act.condStep(npc, 'fogo', -1), 'none', '− sem contador não faz nada');
eq(npc.conds, ['fogo'], '… e a condição continua');
eq(Act.condStep(npc, 'fogo', 1), 'ok', '+ começa o contador');
Act.condStep(npc, 'fogo', 1); Act.condStep(npc, 'fogo', 1);
eq(npc.cinfo.fogo, { n: 3 }, 'contador sobe');
Act.condStep(npc, 'fogo', -1);
eq(npc.cinfo.fogo.n, 2, 'contador desce');
Act.condSet(npc, 'fogo', { d: 4, d0: 4 });
eq(npc.cinfo.fogo, { n: 2, d: 4, d0: 4 }, 'duração convive com o contador');
Act.condSet(npc, 'fogo', { d: 0, d0: 0 });
eq(npc.cinfo.fogo, { n: 2 }, 'duração zero apaga o campo');
Act.condStep(npc, 'fogo', -1);
eq(Act.condStep(npc, 'fogo', -1), 'removed', 'descer de 1 encerra a condição');
eq([npc.conds, npc.cinfo], [[], {}], '… e limpa os dados dela');
Store.undo();
eq([npc.conds, npc.cinfo], [['fogo'], { fogo: { n: 1 } }], 'desfazer devolve a condição com o contador');
Act.condToggle([npc], 'fogo');
eq([npc.conds, npc.cinfo], [[], {}], 'desligar a condição limpa contador e duração');

/* ---- Dano e cura em área ---- */
eq([areaAmount('12'), areaAmount('-12'), areaAmount('+8'), areaAmount(' + 8 '), areaAmount(''), areaAmount('abc'), areaAmount('1,5')], [-12, -12, 8, 8, 0, null, -1.5], 'leitura do valor digitado');
eq([areaNext({ v: 10, m: 20 }, -12, false), areaNext({ v: 10, m: 20 }, -7, true), areaNext({ v: 10, m: 20 }, 50, false), areaNext({ v: 25, m: 20 }, 3, false), areaNext({ v: 10, m: 20 }, 7, true)], [0, 7, 20, 25, 13], 'não passa do máximo, não fica negativo, metade arredonda para baixo');
const t1 = newToken(sc, 0, 64, { name: 'T1', bars: [cleanBar({ n: 'Vida', v: 20, m: 20 })] });
const t2 = newToken(sc, 64, 64, { name: 'T2', bars: [cleanBar({ n: 'Vida', v: 9, m: 20 })], conds: ['fogo'], cinfo: { fogo: { n: 1 } } });
const t3 = newToken(sc, 128, 64, { name: 'T3', bars: [cleanBar({ n: 'Escudo', v: 5, m: 5 })] });
Store.tx('x', () => { Store.add('tokens', t1); Store.add('tokens', t2); Store.add('tokens', t3); });
eq(Act.areaApply([{ t: t1 }, { t: t2 }], 'Vida', 'x9', null), -1, 'valor inválido não aplica nada');
const nApplied = Act.areaApply([{ t: t1, half: false }, { t: t2, half: true }, { t: t3, half: false }], 'Vida', '12', { id: 'fogo', n: 2, d: 3 });
eq(nApplied, 3, 'conta quantos tokens mudaram');
eq([t1.bars[0].v, t2.bars[0].v, t3.bars[0].v], [8, 3, 5], 'dano inteiro, metade, e quem não tem a barra fica igual');
eq([t1.cinfo.fogo, t2.cinfo.fogo, t3.cinfo.fogo], [{ n: 2, d: 3, d0: 3 }, { n: 3, d: 3, d0: 3 }, { n: 2, d: 3, d0: 3 }], 'condição: contador soma ao que já havia e a duração é marcada');
ok(t1.conds.includes('fogo') && t3.conds.includes('fogo') && t2.conds.filter(c => c === 'fogo').length === 1, 'condição entra sem duplicar');
Store.undo();
eq([t1.bars[0].v, t2.bars[0].v, t1.conds, t2.cinfo.fogo, t3.conds], [20, 9, [], { n: 1 }, []], 'um desfazer devolve tudo');
eq(Act.areaApply([{ t: t1 }], 'Vida', '+5', null), 0, 'cura em quem está cheio não conta como mudança');
eq(Act.areaApply([{ t: t2 }], 'Vida', '+5', null), 1, 'cura com +');
eq(t2.bars[0].v, 14, 'valor curado');
eq(Act.areaApply([{ t: t1 }, { t: t2 }], 'Vida', '', { id: 'gelo', n: 0, d: 0 }), 2, 'só a condição, sem valor');
eq([t1.conds, t1.cinfo], [['gelo'], {}], 'condição sem contador nem duração');

/* ---- Mira ---- */
Act.targetToggle([t1, t2]);
eq(sc.targets.map(x => [x.by, x.t]), [['gm', t1.id], ['gm', t2.id]], 'mestre mira dois tokens');
Act.targetToggle([t1]);
eq(sc.targets.map(x => x.t), [t2.id], 'mirar de novo tira a mira');
Act.targetToggle([t1, t2]);
eq(sc.targets.length, 2, 'seleção mista: completa a mira nos que faltam');
App.viewer = 'p1';
Act.targetToggle([t1]);
eq(sc.targets.filter(x => x.by === 'p1').map(x => x.t), [t1.id], 'jogador mira (permissão ligada por padrão)');
sc.perms.mira = false;
ok(!can('target'), 'interruptor da mira');
Act.targetToggle([t2]);
eq(sc.targets.filter(x => x.by === 'p1').length, 1, 'sem permissão, o jogador não mira');
sc.perms.mira = true;
App.viewer = 'gm';
setSel([{ c: 'tokens', id: t1.id }]);
Act.deleteSel();
ok(!sc.targets.some(x => x.t === t1.id) && sc.targets.length === 1, 'apagar o token limpa as miras nele');
Store.undo();
ok(sc.tokens.some(t => t.id === t1.id) && sc.targets.length === 3, 'desfazer devolve o token e as miras');

/* ---- Paredes especiais ---- */
const W = (k, extra) => Object.assign({ k, open: false, locked: false }, extra);
eq([['wall'], ['door'], ['door', { open: true }], ['door', { secret: true }], ['window'], ['veil']].map(([k, x]) => [wallBlocksSight(W(k, x)), wallBlocksMove(W(k, x))]),
  [[true, true], [true, true], [false, false], [true, true], [false, true], [true, false]], 'o que cada tipo barra: [visão, passagem]');
const secret = { id: uid('wl'), k: 'door', secret: true, open: false, locked: false, x1: 0, y1: 0, x2: 64, y2: 0 };
const locked = { id: uid('wl'), k: 'door', secret: false, open: false, locked: true, x1: 0, y1: 64, x2: 64, y2: 64 };
Store.tx('x', () => { Store.add('walls', secret); Store.add('walls', locked); });
Act.toggleDoor(secret);
eq([secret.secret, secret.open], [false, true], 'mestre abre a porta secreta: ela se revela e vira porta comum');
ok(toasts.some(t => /secreta revelada/.test(t)), 'aviso de porta revelada');
App.viewer = 'p1';
Act.toggleDoor(locked);
ok(!locked.open, 'jogador sem permissão não abre porta');
sc.perms.portas = true;
Act.toggleDoor(locked);
ok(!locked.open && toasts.some(t => /trancada/.test(t)), 'porta trancada não abre para o jogador');
App.viewer = 'gm';
Act.toggleDoor(locked);
ok(locked.open, 'mestre abre porta trancada');

/* ---- Importação de cena antiga (v1) ---- */
const old = {
  id: 'cena_v1', name: 'Antiga', cols: 10, rows: 10, cell: 64, light: 'penumbra',
  tokens: [{ id: 'tk1', name: 'Velho', x: 0, y: 0, size: 1, bars: [{ n: 'Vida', c: '#d6524b', v: 7, m: 9, on: true }, { n: 'SP', c: '#4a9be0', v: 0, m: 10, on: false }, { n: 'Fé', c: '#e2b23e', v: 3, m: 5, on: true }], conds: ['sangue'] }, { id: 'tk2', name: 'Sem barras', x: 64, y: 0 }],
  shapes: [], walls: [{ id: 'w1', k: 'door', open: true, x1: 0, y1: 0, x2: 1, y2: 1 }, { id: 'w2', k: 'grade', x1: 0, y1: 0, x2: 1, y2: 1 }, { id: 'w3', k: 'door', secret: true, x1: 0, y1: 0, x2: 1, y2: 1 }],
  lights: [], effects: [], fogOps: [], turn: { on: true, round: 2, cur: null }, tone: 'crepúsculo',
};
normalizeScene(old);
eq(old.tokens[0].bars.map(x => [x.n, x.v, x.m, x.k, x.on, x.vis]), [['Vida', 7, 9, 'bar', true, ''], ['SP', 0, 10, 'bar', false, ''], ['Fé', 3, 5, 'bar', true, '']], 'barras antigas ganham estilo e visibilidade');
eq([old.tokens[0].cinfo, old.tokens[0].conds], [{}, ['sangue']], 'condições antigas ganham o campo de contador');
eq(old.tokens[1].bars.map(x => x.n), ['Vida', 'SP', 'Energia'], 'token sem barras recebe as padrão');
eq([old.targets, old.tone, old.weather, old.perms.mira, old.turn.list], [[], 'dia', { k: '', pow: 0.6 }, true, []], 'campos novos da cena com valores padrão');
eq(old.walls.map(w => [w.k, !!w.secret]), [['door', false], ['wall', false], ['door', true]], 'tipos de parede desconhecidos viram parede; porta secreta é mantida');
eq(old.light, 'penumbra', 'o que já existia não muda');

/* ---- Turnos: durações, miras e desfazer ---- */
const s2 = newScene('turnos');
Store.addScene(s2); Store.setCurrent(s2.id);
const mk = (name, extra) => { const t = newToken(s2, 0, 0, Object.assign({ name }, extra)); Store.add('tokens', t); return t; };
const A = mk('A', { conds: ['escudo'], cinfo: { escudo: { d: 2, d0: 2 } } });
const B = mk('B', { conds: ['fogo', 'gelo'], cinfo: { fogo: { n: 3 }, gelo: { d: 1, d0: 1 } } });
const C = mk('C');
const fora = mk('Fora', { conds: ['veneno'], cinfo: { veneno: { d: 1, d0: 1, n: 2 } } });
eq(Act.turnStep(1), [], 'sem ninguém na ordem, passar a vez não faz nada');
Act.turnAdd([A, B, C]);
const ids = s2.turn.list.map(e => e.id);
eq([s2.turn.on, s2.turn.cur === ids[0]], [false, true], 'ordem montada, combate parado');
eq(Act.turnStep(1), [], 'primeiro "próximo turno" só inicia o combate');
eq([s2.turn.on, s2.turn.cur === ids[0], s2.turn.round, A.cinfo.escudo.d], [true, true, 1, 2], '… na vez do primeiro, sem descontar nada');
// efeitos: um ancorado na vez de A, outro criado fora de combate
const fxA = { id: uid('fx'), fx: 'fogo', k: 'circ', x: 0, y: 0, r: 1, dur: 2, dur0: 2, at: ids[0], token: null };
const fxFree = { id: uid('fx'), fx: 'gelo', k: 'circ', x: 0, y: 0, r: 1, dur: 1, dur0: 1, at: null, token: null };
const fxForever = { id: uid('fx'), fx: 'gelo', k: 'circ', x: 0, y: 0, r: 1, dur: 0, dur0: 0, at: null, token: null };
Store.tx('x', () => { Store.add('effects', fxA); Store.add('effects', fxFree); Store.add('effects', fxForever); });
Act.targetToggle([B]);
eq(Act.turnStep(1), [], 'A termina a vez');
eq([A.cinfo.escudo.d, B.cinfo.gelo.d, s2.turn.cur === ids[1], s2.targets], [1, 1, true, []], 'a duração de A desconta quando A termina a vez; a de B, não; as miras somem');
eq(Act.turnStep(1), ['Congelado em B'], 'B termina a vez: a condição dele que estava em 1 acaba');
eq([B.conds, B.cinfo], [['fogo'], { fogo: { n: 3 } }], 'a condição com prazo sai; o contador sem prazo fica');
eq([fxA.dur, fxFree.dur, fora.cinfo.veneno.d], [2, 1, 1], 'no meio da rodada, efeitos e quem está fora da ordem não descontam');
const ended = Act.turnStep(1);
eq(s2.turn.round, 2, 'virou a rodada');
eq(ended.slice().sort(), ['Envenenado em Fora', 'efeito Gelo'].sort(), 'na virada: acaba a condição de quem está fora da ordem e o efeito sem âncora');
eq([fxA.dur, s2.effects.map(e => e.id).includes(fxFree.id), s2.effects.map(e => e.id).includes(fxForever.id), fora.conds], [1, false, true, []], 'efeito ancorado em A perde uma rodada quando a vez volta para A; o sem prazo fica');
Store.undo();
eq([s2.turn.round, s2.turn.cur === ids[2], fxA.dur, s2.effects.length, fora.conds, fora.cinfo.veneno], [1, true, 2, 3, ['veneno'], { d: 1, d0: 1, n: 2 }], 'um desfazer devolve vez, efeitos e condições');
Store.redo();
Act.turnStep(-1);
eq([s2.turn.cur === ids[2], s2.turn.round, fxA.dur, A.cinfo.escudo.d], [true, 1, 1, 1], 'voltar a vez não mexe nas durações');
eq(s2.turn.back, 1, 'a mesa lembra que o mestre recuou um passo');
Act.turnStep(1);
eq([s2.turn.cur === ids[0], s2.turn.round, fxA.dur, s2.effects.some(e => e.id === fxA.id), s2.turn.back], [true, 2, 1, true, 0], 'avançar de novo um passo já contado não desconta outra vez');
eq(Act.turnStep(1), ['Protegido em A'], 'A termina a segunda vez e a proteção acaba');
Act.turnStep(1);
eq(Act.turnStep(1), ['efeito Fogo'], 'a vez volta para A pela segunda vez e o efeito ancorado chega a zero');
ok(!s2.effects.some(e => e.id === fxA.id), '… e some da cena');
Act.turnStep(-1); Act.turnStep(-1); Act.turnStep(-1); Act.turnStep(-1); Act.turnStep(-1); Act.turnStep(-1); Act.turnStep(-1); Act.turnStep(-1);
eq([s2.turn.round, s2.turn.cur === ids[0], s2.turn.back], [1, true, 6], 'voltar para antes do começo para na primeira vez da rodada 1 e não conta passos que não andaram');
let nCommits = 0;
Store.on('commit', () => nCommits++);
Act.turnStep(-1);
eq(nCommits, 0, 'voltar quando já se está no começo não cria passo de desfazer');
// combate de um só: cada passo é uma rodada inteira
const s3 = newScene('um');
Store.addScene(s3); Store.setCurrent(s3.id);
const solo = newToken(s3, 0, 0, { name: 'Solo', conds: ['foco'], cinfo: { foco: { d: 2, d0: 2 } } });
Store.add('tokens', solo);
Act.turnAdd([solo]); Act.turnStep(1);
eq([Act.turnStep(1), s3.turn.round, solo.cinfo.foco.d], [[], 2, 1], 'ordem de um só: cada passo vira a rodada e desconta');
eq(Act.turnStep(1), ['Concentrando em Solo'], '… até acabar');
Store.setCurrent(s2.id);

/* ---- Números flutuantes ---- */
App.floats.length = 0;
floatDelta(A, -12); floatDelta(A, 5, 'SP'); floatDelta(A, 0);
eq(App.floats.map(f => f.text), ['−12', 'SP +5'], 'texto do dano e da cura (nome da barra na frente, quando informado); zero não aparece');

console.log(fails ? `\n${fails} de ${n} verificações falharam` : `\n${n} verificações passaram`);
process.exit(fails ? 1 : 0);
