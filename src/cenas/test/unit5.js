// Testes das partes puras da mesa na nuvem (7c. PROJEÇÃO), sem navegador: a cena em duas partes, a projeção
// para os jogadores (o que é só do mestre não pode sair), a conferência dos pedidos e a conta das diferenças.
const fs = require('fs'), path = require('path'), vm = require('vm');
const FILES = ['01-base.js', '02-store.js', '03-geo.js', '03b-walls.js', '07-app.js', '07c-projecao.js'];
const src = FILES.map(f => fs.readFileSync(path.join(__dirname, '../src/js', f), 'utf8')).join('\n');
const sandbox = {
  console, Math, JSON, Date, Number, String, Object, Array, Map, Set, Uint8Array, Uint32Array, isFinite, parseFloat, parseInt, setTimeout, clearTimeout,
  document: { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 10 }), isPointInPath: () => false }) }), createElementNS: () => ({ setAttribute() {}, append() {} }) },
  Path2D: function () {}, performance: { now: () => 0 },
  Render: { request() {} }, UI: { toast() {} }, Tools: { undo() {} }, Nuvem: { ping() {} },
  FX: { P: { fogo: { n: 'Fogo' }, gelo: { n: 'Gelo' }, sombra: { n: 'Sombra' }, cura: { n: 'Cura' } } },
  crypto: { getRandomValues(buf) { buf[0] = Math.floor(Math.random() * 4294967296); return buf; } },
};
vm.createContext(sandbox);
vm.runInContext(src + `\n;globalThis.T = { Store, Proj, newScene, newToken, normalizeScene, cleanBar, clone, uid, mulberry };`, sandbox);
const { Store, Proj, newScene, newToken, normalizeScene, cleanBar, clone, mulberry } = sandbox.T;

let fails = 0, n = 0;
const ok = (cond, msg) => { n++; if (!cond) { fails++; console.log('FALHOU:', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} — esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);
const ida = x => JSON.parse(JSON.stringify(x));          // como o conteúdo volta do banco (sem referências, sem undefined)

const ANA = 'u-ana', BETO = 'u-beto';
const bar = (nome, v, m, extra) => cleanBar(Object.assign({ n: nome, c: '#d6524b', v, m, k: 'bar', on: true, vis: '' }, extra));
// Uma cena com um pouco de tudo, inclusive o que é só do mestre.
function cenaCheia() {
  const sc = newScene('Emboscada na ponte');
  sc.id = 'cena_teste1';
  const c = sc.cell;
  const tok = (nome, x, y, extra) => { const t = newToken(sc, x * c, y * c, Object.assign({ name: nome }, extra)); sc.tokens.push(t); return t; };
  const dain = tok('Dain X', 2, 2, { owner: ANA, img: 'img_dain', bars: [bar('Vida', 62, 80), bar('SP', 24, 40, { x: 5 })], barVis: 'bar', notes: 'nota-secreta-do-dain', auras: [{ id: 'au1', k: 'circ', r: 2, c: '#ffffff', a: 0.2, ang: 60, dir: 0, pub: false }], char: 'pc_dain', ini: 4 });
  const lia = tok('Lia', 3, 2, { owner: BETO, bars: [bar('Vida', 30, 30)] });
  const grupo = tok('Carroça', 5, 5, { owner: '*' });
  const orc = tok('Orc chefe', 8, 3, { img: 'img_orc', bars: [bar('Vida', 45, 90, { x: 10 }), bar('Fúria', 3, 5, { k: 'pts' }), bar('Segredo', 7, 9, { vis: 'none' }), bar('Aberta', 12, 20, { vis: 'num' })], barVis: 'bar', notes: 'fraqueza-secreta', ini: 7, char: 'pc_orc', auras: [{ id: 'au2', k: 'circ', r: 1, c: '#ff0000', a: 0.3, ang: 60, dir: 0, pub: true }, { id: 'au3', k: 'circ', r: 3, c: '#00ff00', a: 0.3, ang: 60, dir: 0, pub: false }] });
  const sombra = tok('Vulto', 9, 9, { showName: false, bars: [bar('Vida', 10, 10)], barVis: 'none' });
  const oculto = tok('Assassino-escondido', 12, 4, { hidden: true, img: 'img_oculto', notes: 'ataca-pelas-costas' });
  sc.walls.push({ id: 'w1', k: 'wall', x1: 0, y1: 0, x2: 64, y2: 0, open: false, locked: false, secret: false },
    { id: 'w2', k: 'door', x1: 64, y1: 0, x2: 128, y2: 0, open: false, locked: false, secret: false },
    { id: 'w3', k: 'door', x1: 128, y1: 0, x2: 192, y2: 0, open: false, locked: true, secret: false },
    { id: 'w4', k: 'door', x1: 192, y1: 0, x2: 256, y2: 0, open: false, locked: false, secret: true },
    { id: 'w5', k: 'window', x1: 256, y1: 0, x2: 320, y2: 0, open: false, locked: false, secret: false });
  sc.lights.push({ id: 'l1', name: 'Tocha', x: 100, y: 100, bright: 4, dim: 8, c: '#ffc477', on: true });
  sc.shapes.push({ id: 's1', k: 'text', x: 10, y: 10, txt: 'Ponte velha', fs: 30, s: '#ffffff', sw: 0, f: null, a: 1, top: false, gm: false, lock: false, by: null },
    { id: 's2', k: 'line', pts: [0, 0, 50, 50], s: '#f2c14e', sw: 4, f: null, a: 1, arrow: true, top: false, gm: true, lock: false, by: null },
    { id: 's3', k: 'rect', x: 5, y: 5, w: 40, h: 30, s: '#f2c14e', sw: 4, f: null, a: 1, top: false, gm: false, lock: false, by: ANA },
    { id: 's4', k: 'text', x: 1, y: 1, txt: 'armadilha-do-mestre', fs: 20, s: '#ffffff', sw: 0, f: null, a: 1, top: false, gm: true, lock: false, by: null });
  sc.effects.push({ id: 'e1', fx: 'fogo', k: 'circ', x: 50, y: 50, r: 2, w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: 3, dur: 0, dur0: 0, at: null, apply: { bar: 'Vida', amt: '8', cond: null, skip: [oculto.id] } },
    { id: 'e2', fx: 'gelo', k: 'circ', x: 0, y: 0, r: 1, w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8, token: oculto.id, gm: false, by: null, seed: 4, dur: 0, dur0: 0, at: null, apply: null },
    { id: 'e3', fx: 'sombra', k: 'circ', x: 9, y: 9, r: 1, w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8, token: null, gm: true, by: null, seed: 5, dur: 0, dur0: 0, at: null, apply: null },
    { id: 'e4', fx: 'cura', k: 'circ', x: 9, y: 9, r: 1, w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8, token: dain.id, gm: false, by: ANA, seed: 6, dur: 2, dur0: 3, at: null, apply: null });
  sc.fogOps.push({ id: 'f1', m: 'r', k: 'rect', x: 0, y: 0, w: 100, h: 100 });
  sc.turn = { on: true, round: 3, cur: 't2', back: 0, list: [
    { id: 't1', token: dain.id, name: 'Dain X', init: 18, roll: { d: 14, b: 4 }, k: 1 },
    { id: 't2', token: oculto.id, name: 'Assassino-escondido', init: 17, roll: null, k: 1 },
    { id: 't3', token: sombra.id, name: 'Vulto', init: 12, roll: null, k: 1 },
    { id: 't4', token: null, name: 'Armadilha', init: 9, roll: null, k: 1, bonus: 3, grp: 'g1' }] };
  sc.targets = [{ by: 'gm', t: dain.id }, { by: ANA, t: orc.id }, { by: ANA, t: oculto.id }];
  sc.bg.asset = 'img_fundo';
  sc.fog.dynamic = true; sc.light = 'penumbra';
  sc.explored = { '*': 'data:image/png;base64,AAAA' };
  normalizeScene(sc);
  return { sc, dain, lia, grupo, orc, sombra, oculto };
}
const ASSETS = {
  img_fundo: { id: 'img_fundo', url: 'https://x.supabase.co/storage/v1/object/public/mesas/m/fundo.webp', w: 1920, h: 1280, kind: 'bg', name: 'Ponte' },
  img_dain: { id: 'img_dain', url: 'https://x.supabase.co/storage/v1/object/public/mesas/m/dain.webp', w: 256, h: 256, kind: 'token', name: 'Dain' },
  img_orc: { id: 'img_orc', url: 'https://x.supabase.co/storage/v1/object/public/mesas/m/orc.webp', w: 256, h: 256, kind: 'token', name: 'Orc' },
  img_oculto: { id: 'img_oculto', url: 'https://x.supabase.co/storage/v1/object/public/mesas/m/assassino-oculto.webp', w: 256, h: 256, kind: 'token', name: 'Assassino' },
  img_local: { id: 'img_local', url: 'data:image/png;base64,AAAA', w: 1, h: 1, kind: 'token', name: 'local' },
};

/* ============ igual: conteúdo, sem ligar para a ordem das chaves ============ */
{
  ok(Proj.igual({ a: 1, b: [1, { c: 2, d: 3 }] }, { b: [1, { d: 3, c: 2 }], a: 1 }), 'mesmo conteúdo com as chaves em outra ordem é igual');
  ok(!Proj.igual({ a: 1 }, { a: 2 }) && !Proj.igual([1, 2], [2, 1]) && !Proj.igual({ a: 1 }, { a: 1, b: 2 }) && !Proj.igual([1], { 0: 1 }), 'valor, ordem de lista, chave a mais e lista × objeto são diferentes');
  ok(Proj.igual({ a: 1, b: undefined }, { a: 1 }) && Proj.igual({ a: null }, { a: undefined }) && Proj.igual(null, undefined) && !Proj.igual(null, 0) && !Proj.igual('', null), 'campo sem valor (null, undefined ou ausente) é a mesma coisa; zero e texto vazio, não');
}

/* ============ a cena do mestre em duas partes, ida e volta ============ */
{
  const { sc } = cenaCheia();
  const { m, v } = Proj.partes(sc, ASSETS);
  eq(Object.keys(v).sort(), ['effects', 'id', 'imgs', 'targets', 'tokens', 'turn'], 'a parte viva tem os tokens, os efeitos, os turnos e as miras');
  ok(!('tokens' in m) && !('turn' in m) && !('explored' in m) && !('explored' in v) && m.walls === sc.walls && m.name === sc.name, 'a parte do mapa tem o resto; o que foi explorado não vai para o banco');
  eq([Object.keys(m.imgs), Object.keys(v.imgs).sort()], [['img_fundo'], ['img_dain', 'img_oculto', 'img_orc']], 'cada parte leva o endereço das imagens que usa');
  ok(!JSON.stringify(Proj.imgsDe(['img_local', 'nao_existe', null], ASSETS)).includes('data:'), 'imagem que não está no banco (embutida) não vai para o documento');
  const volta = normalizeScene(Proj.juntar(ida(m), ida(v)));
  const semExp = Object.assign({}, sc, { explored: {} });
  ok(Proj.igual(volta, semExp), 'gravar e ler de volta dá a mesma cena (sem o explorado)');
  ok(volta.tokens !== sc.tokens && volta.tokens[0] !== sc.tokens[0], 'o que volta é cópia: mexer nele não mexe no documento');
  const soMapa = normalizeScene(Proj.juntar(ida(m), null));
  ok(soMapa.tokens.length === 0 && soMapa.walls.length === 5 && soMapa.turn.list.length === 0, 'se a parte viva ainda não chegou, a cena abre só com o mapa (sem quebrar)');
}

/* ============ a projeção: o que os jogadores recebem ============ */
{
  const { sc, dain, lia, orc, sombra, oculto } = cenaCheia();
  const antes = JSON.stringify(sc);
  const { m, v } = Proj.projetar(sc, ASSETS);
  const texto = JSON.stringify({ m, v });
  eq(antes, JSON.stringify(sc), 'projetar não muda a cena do mestre');
  for (const segredo of ['Assassino-escondido', 'ataca-pelas-costas', 'fraqueza-secreta', 'nota-secreta-do-dain', 'armadilha-do-mestre', 'assassino-oculto.webp', oculto.id, 'Vulto', '"secret":true', 'data:image'])
    ok(!texto.includes(segredo), 'não sai na projeção: ' + segredo);
  eq(v.tokens.map(t => t.name), ['Dain X', 'Lia', 'Carroça', 'Orc chefe', '???'], 'o token oculto não vai; o de nome escondido vai como "???"');
  const pOrc = v.tokens.find(t => t.id === orc.id), pDain = v.tokens.find(t => t.id === dain.id), pSombra = v.tokens.find(t => t.id === sombra.id);
  eq(pOrc.bars.map(b => [b.n, b.v, b.m, b.on, b.x === undefined]), [['Vida', 50, 100, true, true], ['Fúria', 60, 100, true, true], ['Segredo', 0, 0, false, true], ['Aberta', 12, 20, true, true]],
    'token do mestre: barra "só proporção" vira porcentagem (sem números nem sobrevida); a escondida some; a aberta vai inteira');
  eq(pOrc.bars.length, orc.bars.length, 'as barras continuam na mesma posição (o índice não muda)');
  eq([pOrc.notes, pOrc.char, pOrc.ini, pOrc.auras.map(a => a.id)], ['', null, 0, ['au2']], 'do token do mestre saem as anotações, a ficha, a iniciativa e as auras que os jogadores não veem');
  eq([pDain.bars.map(b => [b.v, b.m, b.x || 0]), pDain.notes, pDain.char, pDain.auras.length], [[[62, 80, 0], [24, 40, 5]], '', 'pc_dain', 1], 'token de jogador: barras inteiras (com sobrevida), ficha e auras; as anotações do mestre, não');
  eq(pSombra.bars.map(b => [b.v, b.m, b.on]), [[0, 0, false]], 'regra "ninguém vê as barras": nada vai');
  eq(m.walls.map(w => [w.id, w.k, w.secret, w.locked]), [['w1', 'wall', false, false], ['w2', 'door', false, false], ['w3', 'door', false, true], ['w4', 'wall', false, false], ['w5', 'window', false, false]], 'a porta secreta vai como parede comum');
  eq(m.shapes.map(s => s.id), ['s1', 's3'], 'desenhos "só do mestre" não vão');
  eq(v.effects.map(e => [e.id, e.apply]), [['e1', null], ['e4', null]], 'não vão: efeito só do mestre, efeito preso a token oculto, e o "aplicar em área" guardado');
  eq(v.turn.list.map(e => [e.id, e.name, e.init, e.roll, e.bonus]), [['t1', 'Dain X', 18, null, 0], ['t3', '???', 12, null, 0], ['t4', 'Armadilha', 9, null, 0]], 'turnos: sem o token oculto, com "???" no de nome escondido, sem o detalhe da rolagem nem o bônus');
  eq([v.turn.on, v.turn.round, v.turn.cur], [true, 3, 't2'], 'a rodada e a vez vão (a vez de um oculto não aponta para ninguém da lista)');
  eq(v.targets, [{ by: 'gm', t: dain.id }, { by: ANA, t: orc.id }], 'mira num token oculto não vai');
  eq([Object.keys(m.imgs), Object.keys(v.imgs).sort()], [['img_fundo'], ['img_dain', 'img_orc']], 'as imagens: só as do que vai');
  eq([m.id, v.id, m.name, m.fog.dynamic, m.light, m.perms.mover, m.lights.length, m.fogOps.length], ['cena_teste1', 'cena_teste1', 'Emboscada na ponte', true, 'penumbra', true, 1, 1], 'o mapa vai inteiro: grade, luz, névoa, permissões, luzes, névoa pintada');
  sc.perms.turnos = false;
  eq(Proj.projetar(sc, ASSETS).v.turn, { on: false, round: 1, cur: null, list: [] }, 'sem a permissão de ver os turnos, a ordem não vai');
  // do lado do jogador: monta, e o que ele vê bate com a regra
  const j = normalizeScene(Proj.juntar(ida(m), ida(v)));
  ok(j.tokens.length === 5 && j.walls.length === 5 && j.tokens.every(t => Array.isArray(t.bars) && t.cinfo && t.vis && t.light), 'o jogador monta a cena a partir da projeção, com todos os campos no lugar');
  ok(Proj.igual(Proj.diferenca(j, normalizeScene(Proj.juntar(ida(m), ida(v)))), []), 'a mesma projeção duas vezes não gera diferença nenhuma');
}

/* ============ os pedidos dos jogadores ============ */
{
  const { sc, dain, lia, grupo, orc, oculto } = cenaCheia();
  const V = (op, quem) => Proj.validar(op, quem || ANA, sc);
  const move = (t, x, y) => ({ t: 'upd', c: 'tokens', id: t.id, p: { x, y } });
  eq(V(move(dain, 128, 192)), { t: 'upd', c: 'tokens', id: dain.id, p: { x: 128, y: 192 } }, 'mover o próprio token vale');
  eq(V(move(grupo, 64, 64), BETO), { t: 'upd', c: 'tokens', id: grupo.id, p: { x: 64, y: 64 } }, 'token "de todos os jogadores": qualquer um move');
  eq([V(move(lia, 0, 0)), V(move(orc, 0, 0)), V(move(oculto, 0, 0)), V(move({ id: 'nao-existe' }, 0, 0))], [null, null, null, null], 'não vale mover: o token de outro jogador, o do mestre, um oculto, um que não existe');
  eq(V(move(dain, -500, 99999)).p, { x: 0, y: (sc.rows - 1) * sc.cell }, 'a posição pedida fica dentro da cena');
  eq([V(move(dain, NaN, Infinity)), V({ t: 'upd', c: 'tokens', id: dain.id, p: { x: '10' } }), V(move(dain, NaN, 5)).p], [null, null, { y: 5 }], 'posição que não é número não vale (a metade que é número, sim)');
  dain.locked = true;
  eq(V(move(dain, 10, 10)), null, 'token travado pelo mestre não se move');
  dain.locked = false;
  sc.perms.mover = false;
  eq(V(move(dain, 10, 10)), null, 'sem a permissão de mover, não vale');
  sc.perms.mover = true;
  // só os campos que o jogador pode mexer passam
  const tudo = V({ t: 'upd', c: 'tokens', id: dain.id, p: { x: 64, hidden: true, owner: BETO, name: 'Hackeado', notes: 'x', size: 4, light: { on: true }, vis: { on: true, range: 99 }, char: 'outro', img: 'img_orc', locked: false, color: '#000000' } });
  eq(tudo, { t: 'upd', c: 'tokens', id: dain.id, p: { x: 64 } }, 'dono, nome, tamanho, visão, luz, imagem, ficha, oculto: nada disso é do jogador');
  const barras = V({ t: 'upd', c: 'tokens', id: dain.id, p: { bars: [{ n: 'Vida', c: '#d6524b', v: 50, m: 80, k: 'bar', on: true, vis: '', lixo: 1 }, { n: 'X'.repeat(80), v: -5, m: 'a' }] } });
  eq(barras.p.bars, [{ n: 'Vida', c: '#d6524b', v: 50, m: 80, k: 'bar', on: true, vis: '' }, { n: 'X'.repeat(24), c: '#d6524b', v: 0, m: 0, k: 'bar', on: true, vis: '' }], 'as barras pedidas passam pela mesma limpeza das barras do mestre');
  eq(V({ t: 'upd', c: 'tokens', id: dain.id, p: { bars: 'nada' } }), null, 'barras que não são lista não valem');
  eq(V({ t: 'upd', c: 'tokens', id: dain.id, p: { conds: ['fogo', 'inventada', 'fogo', 'gelo'], cinfo: { fogo: { n: 2, d: 0, d0: -1, x: 9 }, inventada: { n: 1 }, gelo: 'x' } } }).p, { conds: ['fogo', 'gelo'], cinfo: { fogo: { n: 2 } } }, 'condições: só as que existem, sem repetir; contadores só positivos');
  eq(V({ t: 'upd', c: 'tokens', id: dain.id, p: { auras: [{ id: 'au9', k: 'losango', r: 999, c: 'vermelho', a: 5, ang: 1, dir: 720, pub: false }] } }).p.auras, [{ id: 'au9', k: 'circ', r: 60, c: '#e6ab4f', a: 0.8, ang: 10, dir: 360, pub: false }], 'auras: forma, raio, cor e opacidade dentro do que a mesa aceita');
  for (const [perm, p] of [['barras', { bars: [bar('Vida', 1, 2)] }], ['condicoes', { conds: ['fogo'] }], ['auras', { auras: [] }]]) {
    sc.perms[perm] = false;
    eq(V({ t: 'upd', c: 'tokens', id: dain.id, p }), null, 'sem a permissão "' + perm + '", o pedido não vale');
    sc.perms[perm] = true;
  }
  eq([V({ t: 'add', c: 'tokens', v: { id: 'tk_novo', name: 'Clone' } }), V({ t: 'del', c: 'tokens', id: dain.id }), V({ t: 'ord', c: 'tokens', ids: [] })], [null, null, null], 'criar, apagar e reordenar tokens é só com o mestre');

  // portas
  sc.perms.portas = true;
  eq(V({ t: 'upd', c: 'walls', id: 'w2', p: { open: true, locked: true, k: 'wall' } }), { t: 'upd', c: 'walls', id: 'w2', p: { open: true } }, 'abrir uma porta: só o "aberta" passa');
  eq([V({ t: 'upd', c: 'walls', id: 'w3', p: { open: true } }), V({ t: 'upd', c: 'walls', id: 'w4', p: { open: true } }), V({ t: 'upd', c: 'walls', id: 'w1', p: { open: true } }), V({ t: 'upd', c: 'walls', id: 'w2', p: { open: false } }), V({ t: 'upd', c: 'walls', id: 'w2', p: { open: 'sim' } })],
    [null, null, null, null, null], 'não vale: porta trancada, porta secreta, parede comum, "fechar" o que já está fechado, valor que não é sim/não');
  eq([V({ t: 'del', c: 'walls', id: 'w1' }), V({ t: 'add', c: 'walls', v: { id: 'wz', k: 'wall' } }), V({ t: 'add', c: 'lights', v: { id: 'lz' } }), V({ t: 'add', c: 'fogOps', v: { id: 'fz', m: 'r', k: 'all' } }), V({ t: 'del', c: 'fogOps', id: 'f1' })], [null, null, null, null, null], 'paredes, luzes e névoa são só do mestre');
  sc.perms.portas = false;
  eq(V({ t: 'upd', c: 'walls', id: 'w2', p: { open: true } }), null, 'sem a permissão de portas, não abre');

  // desenhos
  eq(V({ t: 'add', c: 'shapes', v: { id: 's9', k: 'rect', x: 1, y: 2, w: 3, h: 4, s: '#ffffff', sw: 4, a: 1 } }), null, 'sem a permissão de desenhar, não desenha');
  sc.perms.desenhar = true;
  const forma = V({ t: 'add', c: 'shapes', v: { id: 's9', k: 'rect', x: 1, y: 2, w: 3, h: 4, s: '#ffffff', sw: 4, f: '#000000', a: 1, gm: true, by: BETO, lock: true, top: true, extra: 'x' } });
  eq(forma.v, { id: 's9', k: 'rect', s: '#ffffff', sw: 4, f: '#000000', a: 1, top: true, gm: false, lock: false, by: ANA, x: 1, y: 2, w: 3, h: 4 }, 'o desenho entra com o jogador como autor, nunca "só do mestre", só com os campos de desenho');
  eq([V({ t: 'add', c: 'shapes', v: { id: 's1', k: 'rect', x: 0, y: 0, w: 1, h: 1 } }), V({ t: 'add', c: 'shapes', v: { id: 's8', k: 'bomba' } }), V({ t: 'add', c: 'shapes', v: { id: 's8', k: 'free', pts: [1, 2, 3] } }), V({ t: 'add', c: 'shapes', v: { id: 's8', k: 'text', x: 0, y: 0, txt: '   ' } }), V({ t: 'add', c: 'shapes', v: { id: 'com espaço', k: 'rect' } })],
    [null, null, null, null, null], 'não vale: id que já existe, forma que não existe, pontos quebrados, texto vazio, id estranho');
  eq(V({ t: 'add', c: 'shapes', v: { id: 's8', k: 'free', pts: Array(7000).fill(1) } }), null, 'traço com pontos demais não entra');
  eq([V({ t: 'upd', c: 'shapes', id: 's3', p: { x: 50, gm: true, by: BETO } }), V({ t: 'del', c: 'shapes', id: 's3' })], [{ t: 'upd', c: 'shapes', id: 's3', p: { x: 50 } }, { t: 'del', c: 'shapes', id: 's3' }], 'o jogador muda e apaga o desenho dele (sem trocar o autor nem escondê-lo)');
  eq([V({ t: 'upd', c: 'shapes', id: 's1', p: { x: 50 } }), V({ t: 'del', c: 'shapes', id: 's1' }), V({ t: 'del', c: 'shapes', id: 's3' }, BETO), V({ t: 'del', c: 'shapes', id: 's4' })], [null, null, null, null], 'não mexe no desenho do mestre nem no de outro jogador');

  // efeitos
  const fx = { id: 'e9', fx: 'fogo', k: 'cone', x: 10, y: 20, r: 3, w: 1, rw: 3, rh: 2, ang: 60, dir: 90, pow: 0.8, token: oculto.id, gm: true, by: null, seed: 7, dur: 2, dur0: 2, at: 't1', apply: { bar: 'Vida', amt: '99' } };
  eq(V({ t: 'add', c: 'effects', v: fx }), null, 'sem a permissão de efeitos, não solta');
  sc.perms.efeitos = true;
  const feito = V({ t: 'add', c: 'effects', v: fx }).v;
  eq([feito.by, feito.gm, feito.token, feito.apply, feito.dur, feito.at], [ANA, false, null, null, 2, 't1'], 'o efeito entra com o jogador como autor, visível, sem "aplicar em área" e sem se prender a token oculto');
  eq([V({ t: 'upd', c: 'effects', id: 'e4', p: { r: 5, by: BETO, gm: true, apply: { bar: 'Vida', amt: '5' } } }), V({ t: 'del', c: 'effects', id: 'e4' })], [{ t: 'upd', c: 'effects', id: 'e4', p: { r: 5 } }, { t: 'del', c: 'effects', id: 'e4' }], 'muda e apaga o efeito dele');
  eq([V({ t: 'del', c: 'effects', id: 'e1' }), V({ t: 'upd', c: 'effects', id: 'e3', p: { r: 5 } }), V({ t: 'del', c: 'effects', id: 'e4' }, BETO)], [null, null, null], 'não mexe no efeito do mestre nem no de outro jogador');

  // pedidos feitos para quebrar o programa do mestre
  const hostil = JSON.parse('{"t":"upd","c":"tokens","id":"' + dain.id + '","p":{"__proto__":{"x":1},"constructor":1,"conds":["__proto__","constructor","toString","fogo"],"cinfo":{"__proto__":{"n":5},"constructor":{"n":5},"fogo":{"n":1}}}}');
  const limpo = V(hostil);
  eq([limpo.p.conds, Object.keys(limpo.p.cinfo), limpo.p.cinfo.n === undefined && limpo.p.x === undefined, Object.keys(limpo.p).sort()], [['fogo'], ['fogo'], true, ['cinfo', 'conds']], 'nomes que todo objeto tem ("__proto__", "constructor", "toString") não passam por condição nem por campo');
  eq([V({ t: 'add', c: 'shapes', v: { id: '__proto__', k: 'rect', x: 0, y: 0, w: 1, h: 1 } }), V({ t: 'add', c: 'shapes', v: { id: 'constructor', k: 'rect', x: 0, y: 0, w: 1, h: 1 } }), V({ t: 'add', c: 'effects', v: Object.assign({}, fx, { id: 'toString' }) }), V({ t: 'add', c: 'effects', v: Object.assign({}, fx, { id: 'e10', fx: '__proto__' }) }), V({ t: 'add', c: 'effects', v: Object.assign({}, fx, { id: 'e10', fx: 'inventado' }) })],
    [null, null, null, null, null], 'ids com esses nomes e efeitos que não estão na biblioteca não entram');
  eq([V({ t: 'upd', c: 'shapes', id: 's3', p: { k: 'text', txt: 'virou texto', lock: true, w: 77 } }), V({ t: 'upd', c: 'effects', id: 'e4', p: { fx: '__proto__' } }), V({ t: 'upd', c: 'effects', id: 'e4', p: { fx: 'gelo', token: oculto.id } })],
    [{ t: 'upd', c: 'shapes', id: 's3', p: { w: 77 } }, null, { t: 'upd', c: 'effects', id: 'e4', p: { fx: 'gelo', token: null } }], 'remendos: a forma não troca de tipo nem se trava; o efeito só troca para outro da biblioteca e não se prende a token oculto');
  ok(!Proj.idOk('__proto__') && !Proj.idOk('constructor') && !Proj.idOk('hasOwnProperty') && Proj.idOk('cena_abc12') && !Proj.idOk('a b') && !Proj.idOk('') && !Proj.idOk('x'.repeat(61)), 'idOk: curto, sem espaço, e nunca um nome que todo objeto já tem');

  // mira e o resto da cena
  const mira = V({ t: 'scn', p: { targets: [{ by: ANA, t: lia.id }, { by: 'gm', t: lia.id }, { by: BETO, t: dain.id }, { by: ANA, t: oculto.id }, { by: ANA, t: lia.id }] } });
  eq(mira, { t: 'scn', p: { targets: [{ by: 'gm', t: dain.id }, { by: ANA, t: lia.id }] } }, 'mira: o pedido só troca as miras de quem pediu (as do mestre e dos outros ficam), sem repetir e sem mirar em oculto');
  sc.targets = mira.p.targets;
  eq(V({ t: 'scn', p: { targets: [{ by: ANA, t: lia.id }] } }), null, 'pedido que deixa as miras como já estão não gera mudança');
  eq(V({ t: 'scn', p: { targets: [] } }), { t: 'scn', p: { targets: [{ by: 'gm', t: dain.id }] } }, 'tirar a própria mira: as dos outros ficam');
  sc.perms.mira = false;
  eq(V({ t: 'scn', p: { targets: [] } }), null, 'sem a permissão de mira, não vale');
  eq([V({ t: 'scn', p: { perms: { mover: true, desenhar: true } } }), V({ t: 'scn', p: { name: 'Hackeada' } }), V({ t: 'scn', p: { turn: { on: false, list: [] } } }), V({ t: 'scn', p: { fog: { dynamic: false } } }), V(null), V('x'), V({}), Proj.validar({ t: 'upd', c: 'tokens', id: dain.id, p: { x: 1 } }, null, sc)],
    [null, null, null, null, null, null, null, null], 'permissões, nome, turnos e névoa da cena não são do jogador; pedido vazio ou sem dono não vale');
}

/* ============ diferenças: do que está na tela para o que chegou ============ */
{
  const rnd = mulberry(2026);
  const sorte = n => Math.floor(rnd() * n);
  const base = () => { const j = normalizeScene(Proj.juntar(ida(Proj.projetar(cenaCheia().sc, ASSETS).m), ida(Proj.projetar(cenaCheia().sc, ASSETS).v))); j.id = 'cena_teste1'; return j; };
  // mudanças ao acaso, como as que o mestre faz durante o jogo
  function mexer(sc) {
    const k = sorte(11), t = sc.tokens[sorte(sc.tokens.length)];
    if (k === 0 && t) { t.x += 64; t.y -= 32; }
    else if (k === 1 && t) t.bars = t.bars.map(b => Object.assign({}, b, { v: sorte(50) }));
    else if (k === 2 && t) { t.conds = ['fogo']; t.cinfo = { fogo: { n: 1 + sorte(3) } }; }
    else if (k === 3) sc.tokens.push(newToken(sc, sorte(900), sorte(600), { name: 'Novo ' + sorte(999) }));
    else if (k === 4 && sc.tokens.length > 1) sc.tokens.splice(sorte(sc.tokens.length), 1);
    else if (k === 5 && sc.tokens.length > 2) { const i = sorte(sc.tokens.length); const [x] = sc.tokens.splice(i, 1); sc.tokens.splice(sorte(sc.tokens.length + 1), 0, x); }
    else if (k === 6) sc.walls[sorte(sc.walls.length)].open = rnd() > 0.5;
    else if (k === 7) sc.turn = Object.assign({}, sc.turn, { round: sc.turn.round + 1, cur: 't' + (1 + sorte(4)) });
    else if (k === 8) { sc.light = ['claro', 'penumbra', 'escuro'][sorte(3)]; sc.weather = { k: ['', 'chuva', 'neve'][sorte(3)], pow: 0.5 }; }
    else if (k === 9) sc.shapes.push({ id: 'sh' + sorte(1e6), k: 'rect', x: sorte(100), y: sorte(100), w: 30, h: 20, s: '#ffffff', sw: 2, f: null, a: 1, top: false, gm: false, lock: false, by: null });
    else if (k === 10 && sc.effects.length) sc.effects.pop();
  }
  let iguais = 0, pelaLoja = 0, vazias = 0;
  for (let rodada = 0; rodada < 300; rodada++) {
    const a = base(), b = base();
    for (let i = 0, q = 1 + sorte(6); i < q; i++) mexer(b);
    if (rnd() > 0.5) for (let i = 0, q = 1 + sorte(3); i < q; i++) mexer(a);           // a tela também não estava no começo
    const ops = Proj.diferenca(a, ida(b));
    if (Proj.igual(Proj.aplicarEm(clone(a), ops), b)) iguais++;
    // e pelo caminho de verdade: as operações aplicadas pelo Store, numa cena que não é a que está aberta
    Store.S.scenes = { outra: newScene('outra'), [a.id]: a }; Store.S.current = 'outra';
    Store.remoteIn(a.id, ops);
    if (Proj.igual(Store.S.scenes[a.id], b)) pelaLoja++;
    if (!Proj.diferenca(Store.S.scenes[a.id], ida(b)).length) vazias++;
  }
  eq([iguais, pelaLoja, vazias], [300, 300, 300], '300 pares de cenas mexidas ao acaso: as operações da diferença levam uma à outra (aplicadas à mão e pelo Store), e depois não sobra diferença');

  // o Store, numa cena que não é a aberta: avisa uma vez, com as operações que valeram
  const a = base();
  Store.S.scenes = { outra: newScene('outra'), [a.id]: a }; Store.S.current = 'outra';
  const avisos = [], vivos = [];
  Store.on('commit', e => avisos.push(e)); Store.on('live', op => vivos.push(op));
  const feitas = Store.remoteIn(a.id, [{ t: 'upd', c: 'tokens', id: a.tokens[0].id, p: { x: 999 } }, { t: 'upd', c: 'tokens', id: 'nao-existe', p: { x: 1 } }, { t: 'del', c: 'shapes', id: 's1' }]);
  eq([feitas, avisos.length, avisos[0].sceneId, avisos[0].remote, avisos[0].ops.length, vivos.length, a.tokens[0].x, Store.canUndo()], [2, 1, a.id, true, 2, 0, 999, false],
    'operações de fora numa cena fechada: valem, avisam uma vez (como remotas), não mexem na tela da cena aberta nem entram no desfazer');
  Store.S.current = a.id;
  eq([Store.remoteIn(a.id, [{ t: 'upd', c: 'tokens', id: a.tokens[0].id, p: { y: 7 } }]), vivos.length, Store.remoteIn('nao-existe', [{ t: 'scn', p: { name: 'x' } }]), Store.remoteIn(a.id, [])], [1, 1, 0, 0], 'na cena aberta, a tela acompanha; cena que não existe ou lista vazia não fazem nada');

  // o jogador repõe por cima da projeção o que ele fez e o mestre ainda não aplicou
  const chegou = base(), meu = chegou.tokens[0].id;
  Proj.aplicarEm(chegou, [{ t: 'upd', c: 'tokens', id: meu, p: { x: 640, y: 320 } }, { t: 'add', c: 'shapes', v: { id: 'meu-traço', k: 'rect', x: 0, y: 0, w: 5, h: 5 } }, { t: 'del', c: 'shapes', id: 's3' }, { t: 'ord', c: 'tokens', ids: chegou.tokens.map(t => t.id).reverse() }, { t: 'scn', p: { targets: [{ by: ANA, t: meu }] } }, { t: 'upd', c: 'tokens', id: 'sumiu', p: { x: 1 } }, { t: 'add', c: 'coisas', v: { id: 'x' } }, null]);
  eq([chegou.tokens[chegou.tokens.length - 1].x, chegou.shapes.map(s => s.id), chegou.targets], [640, ['s1', 'meu-traço'], [{ by: ANA, t: meu }]], 'aplicarEm: mover, criar, apagar, reordenar e trocar campo da cena; o que não se aplica é ignorado');
}

/* ============ o índice e as cenas que vêm de fora ============ */
{
  eq(Proj.normIndice(null), { v: 1, ordem: [], atual: null, noAr: null, prefs: { barDefaults: null } }, 'índice vazio');
  eq(Proj.normIndice({ ordem: ['cena_a', 'cena_a', 'com espaço', 7, 'cena_b'], atual: 'cena_b', noAr: '../x', prefs: { barDefaults: [{ n: 'PV', v: 3, m: 5, lixo: 1 }], anim: false } }),
    { v: 1, ordem: ['cena_a', 'cena_b'], atual: 'cena_b', noAr: null, prefs: { barDefaults: [{ n: 'PV', c: '#d6524b', v: 3, m: 5, k: 'bar', on: true, vis: '' }] } }, 'índice sujo: ids estranhos e repetidos saem; as barras padrão são limpas');
  const membros = [{ id: ANA, name: 'Ána' }, { id: BETO, name: 'Beto' }];
  const mapa = Proj.mapaDeDonos([{ id: 'jg_1', name: 'ana ' }, { id: 'jg_2', name: 'Carla' }, { id: BETO, name: 'Outro nome' }, null, {}], membros);
  eq(mapa, { jg_1: ANA, jg_2: null, [BETO]: BETO }, 'donos: mesmo nome (sem ligar para acento e maiúsculas) ou mesmo id casam; quem não tem par fica sem');
  const sc = newScene('de fora');
  sc.tokens.push(newToken(sc, 0, 0, { name: 'A', owner: 'jg_1' }), newToken(sc, 0, 0, { name: 'B', owner: 'jg_2' }), newToken(sc, 0, 0, { name: 'C', owner: '*' }), newToken(sc, 0, 0, { name: 'D', owner: null }), newToken(sc, 0, 0, { name: 'E', owner: BETO }));
  sc.shapes.push({ id: 's1', by: 'jg_1' }, { id: 's2', by: 'jg_2' }, { id: 's3', by: null });
  sc.effects.push({ id: 'e1', by: 'jg_2' });
  sc.targets = [{ by: 'gm', t: 'a' }, { by: 'jg_1', t: 'a' }, { by: 'jg_2', t: 'a' }];
  sc.explored = { jg_1: 'data:...' };
  Proj.trocarDonos(sc, mapa, membros);
  eq([sc.tokens.map(t => t.owner), sc.shapes.map(s => s.by), sc.effects.map(e => e.by), sc.targets, sc.explored], [[ANA, null, '*', null, BETO], [ANA, null, null], [null], [{ by: 'gm', t: 'a' }, { by: ANA, t: 'a' }], {}],
    'trazer para a mesa: quem tem par continua dono; o resto passa a ser do mestre; "todos os jogadores" continua; o explorado recomeça');
}

console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
process.exit(fails ? 1 : 0);
