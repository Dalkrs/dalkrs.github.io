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
  const orc = tok('Orc chefe', 8, 3, { img: 'img_orc', bars: [bar('Vida', 45, 90, { x: 10 }), bar('Fúria', 3, 5, { k: 'pts' }), bar('Segredo', 7, 9, { vis: 'none' }), bar('Aberta', 12, 20, { vis: 'num' })], barVis: 'bar', notes: 'fraqueza-secreta', ini: 7, char: 'pc_orc', vis: { on: true, range: 12, dark: 6 }, auras: [{ id: 'au2', k: 'circ', r: 1, c: '#ff0000', a: 0.3, ang: 60, dir: 0, pub: true }, { id: 'au3', k: 'circ', r: 3, c: '#00ff00', a: 0.3, ang: 60, dir: 0, pub: false }] });
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
  img_fundo: { id: 'img_fundo', url: 'https://x.supabase.co/storage/v1/object/public/mesas/m/fundo.webp', w: 1920, h: 1280, kind: 'bg', name: 'arquivo-ponte.png' },
  img_dain: { id: 'img_dain', url: 'https://x.supabase.co/storage/v1/object/public/mesas/m/dain.webp', w: 256, h: 256, kind: 'token', name: 'arquivo-dain.png' },
  img_orc: { id: 'img_orc', url: 'https://x.supabase.co/storage/v1/object/public/mesas/m/orc.webp', w: 256, h: 256, kind: 'token', name: 'arquivo-orc-chefe.png' },
  img_oculto: { id: 'img_oculto', url: 'https://x.supabase.co/storage/v1/object/public/mesas/m/assassino-oculto.webp', w: 256, h: 256, kind: 'token', name: 'arquivo-assassino.png' },
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
  eq([Object.keys(m.imgs), Object.keys(v.imgs).sort(), m.imgs.img_fundo.name], [['img_fundo'], ['img_dain', 'img_oculto', 'img_orc'], 'arquivo-ponte.png'], 'cada parte leva o endereço das imagens que usa (com o nome do arquivo: estes documentos são só do mestre)');
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
  // um token de quem já saiu da mesa: para os jogadores, é um token do mestre
  const saiu = newToken(sc, 6 * sc.cell, 6 * sc.cell, { name: 'Ex-jogador', owner: 'u-saiu', notes: 'nota-de-quem-saiu', bars: [bar('Vida', 5, 10)], barVis: 'none', char: 'pc_saiu', ini: 3, vis: { on: true, range: 9, dark: 4 } });
  sc.tokens.push(saiu);
  const MESA = new Set([ANA, BETO]);
  const antes = JSON.stringify(sc);
  const { m, v } = Proj.projetar(sc, ASSETS, MESA);
  const texto = JSON.stringify({ m, v });
  eq(antes, JSON.stringify(sc), 'projetar não muda a cena do mestre');
  for (const segredo of ['Assassino-escondido', 'ataca-pelas-costas', 'fraqueza-secreta', 'nota-secreta-do-dain', 'armadilha-do-mestre', 'assassino-oculto.webp', oculto.id, 'Vulto', '"secret":true', 'data:image',
    'Segredo', 'Tocha', 'arquivo-', 'nota-de-quem-saiu', 'pc_saiu', 'u-saiu', 'pc_orc'])
    ok(!texto.includes(segredo), 'não sai na projeção: ' + segredo);
  eq(v.tokens.map(t => t.name), ['Dain X', 'Lia', 'Carroça', 'Orc chefe', '???', 'Ex-jogador'], 'o token oculto não vai; o de nome escondido vai como "???"');
  const pOrc = v.tokens.find(t => t.id === orc.id), pDain = v.tokens.find(t => t.id === dain.id), pSombra = v.tokens.find(t => t.id === sombra.id), pSaiu = v.tokens.find(t => t.id === saiu.id);
  eq(pOrc.bars.map(b => [b.n, b.v, b.m, b.on, b.x === undefined]), [['Vida', 50, 100, true, true], ['Fúria', 60, 100, true, true], ['Barra', 0, 0, false, true], ['Aberta', 12, 20, true, true]],
    'token do mestre: barra "só proporção" vira porcentagem (sem números nem sobrevida); a escondida some, com o nome; a aberta vai inteira');
  eq(pOrc.bars.length, orc.bars.length, 'as barras continuam na mesma posição (o índice não muda)');
  eq([pOrc.notes, pOrc.char, pOrc.ini, pOrc.auras.map(a => a.id), pOrc.vis, pOrc.owner], ['', null, 0, ['au2'], { on: false, range: 0, dark: 0 }, null], 'do token do mestre saem as anotações, a ficha, a iniciativa, o que ele enxerga e as auras que os jogadores não veem');
  eq([pDain.bars.map(b => [b.v, b.m, b.x || 0]), pDain.notes, pDain.char, pDain.auras.length, pDain.vis.on, pDain.owner], [[[62, 80, 0], [24, 40, 5]], '', 'pc_dain', 1, true, ANA], 'token de jogador: barras inteiras (com sobrevida), ficha, auras e visão; as anotações do mestre, não');
  eq(pSombra.bars.map(b => [b.n, b.v, b.m, b.on]), [['Barra', 0, 0, false]], 'regra "ninguém vê as barras": nada vai, nem o nome');
  eq([pSaiu.owner, pSaiu.notes, pSaiu.char, pSaiu.ini, pSaiu.bars.map(b => [b.n, b.v, b.m, b.on]), pSaiu.vis], [null, '', null, 0, [['Barra', 0, 0, false]], { on: false, range: 0, dark: 0 }], 'token de quem saiu da mesa vai como token do mestre (sem dono, sem ficha, com as barras pela regra dele)');
  eq(m.walls.map(w => [w.id, w.k, w.secret, w.locked]), [['w1', 'wall', false, false], ['w2', 'door', false, false], ['w3', 'door', false, true], ['w4', 'wall', false, false], ['w5', 'window', false, false]], 'a porta secreta vai como parede comum');
  eq(m.lights.map(l => [l.id, l.name, l.bright, l.on]), [['l1', '', 4, true]], 'as luzes vão sem o nome que o mestre deu');
  eq(m.shapes.map(s => s.id), ['s1', 's3'], 'desenhos "só do mestre" não vão');
  eq(v.effects.map(e => [e.id, e.apply]), [['e1', null], ['e4', null]], 'não vão: efeito só do mestre, efeito preso a token oculto, e o "aplicar em área" guardado');
  eq(v.turn.list.map(e => [e.id, e.name, e.init, e.roll, e.bonus]), [['t1', 'Dain X', 18, null, 0], ['t3', '???', 12, null, 0], ['t4', 'Armadilha', 9, null, 0]], 'turnos: sem o token oculto, com "???" no de nome escondido, sem o detalhe da rolagem nem o bônus');
  eq([v.turn.on, v.turn.round, v.turn.cur], [true, 3, null], 'a rodada vai; a vez de um token oculto não aponta para ninguém (nem para um id que os jogadores não conhecem)');
  sc.turn.cur = 't3';
  eq(Proj.projetar(sc, ASSETS, MESA).v.turn.cur, 't3', 'a vez de quem os jogadores veem vai');
  eq(v.targets, [{ by: 'gm', t: dain.id }, { by: ANA, t: orc.id }], 'mira num token oculto não vai');
  eq([Object.keys(m.imgs), Object.keys(v.imgs).sort(), m.imgs.img_fundo.name, v.imgs.img_orc.name, v.imgs.img_orc.url, v.imgs.img_orc.w], [['img_fundo'], ['img_dain', 'img_orc'], '', '', ASSETS.img_orc.url, 256], 'as imagens: só as do que vai, com o endereço e sem o nome do arquivo');
  eq([m.id, v.id, m.name, m.fog.dynamic, m.light, m.perms.mover, m.lights.length, m.fogOps.length], ['cena_teste1', 'cena_teste1', 'Emboscada na ponte', true, 'penumbra', true, 1, 1], 'o mapa vai inteiro: grade, luz, névoa, permissões, luzes, névoa pintada');
  sc.perms.turnos = false;
  eq(Proj.projetar(sc, ASSETS, MESA).v.turn, { on: false, round: 1, cur: null, list: [] }, 'sem a permissão de ver os turnos, a ordem não vai');
  // do lado do jogador: monta, e o que ele vê bate com a regra
  const j = normalizeScene(Proj.juntar(ida(m), ida(v)));
  ok(j.tokens.length === 6 && j.walls.length === 5 && j.tokens.every(t => Array.isArray(t.bars) && t.cinfo && t.vis && t.light), 'o jogador monta a cena a partir da projeção, com todos os campos no lugar');
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
  /* Barras: do pedido só valem o valor e a sobrevida, das barras que existem e estão em uso. */
  const B = (bars, antes) => V(Object.assign({ t: 'upd', c: 'tokens', id: dain.id, p: { bars } }, antes ? { b: { bars: antes } } : {}));
  const vida = (v, x) => Object.assign({ n: 'Vida', v, m: 80 }, x ? { x } : {}), sp = (v, x) => Object.assign({ n: 'SP', v, m: 40 }, x ? { x } : {});
  const como = r => (r ? r.p.bars.map(b => [b.n, b.v, b.m, b.x || 0]) : null);
  const barras = B([{ n: 'Vida', c: '#000000', v: 50, m: 999, k: 'pts', on: false, vis: 'none', lixo: 1 }, { n: 'X'.repeat(80), v: -5, m: 'a' }, { n: 'Nova', v: 5, m: 5 }]);
  eq(barras.p.bars, [{ n: 'Vida', c: '#d6524b', v: 50, m: 80, k: 'bar', on: true, vis: '' }, { n: 'SP', c: '#d6524b', v: 24, m: 40, k: 'bar', on: true, vis: '', x: 5 }],
    'barras: do pedido só vale o valor; nome, cor, máximo, estilo e "quem vê" continuam os do mestre; barra com outro nome, ou a mais, não entra');
  eq([B('nada'), B([{ n: 'Vida', v: 62, m: 999, c: '#000000', on: false }]), B([{ n: 'Vida', v: 'abc' }]), B([])], [null, null, null, null], 'não muda nada: barras que não são lista, pedido que só mexe no que não é do jogador, valor que não é número, lista vazia');
  eq([como(B([vida(-5)]))[0][1], como(B([vida(95)]))[0][1], como(B([vida(1e12)]))[0][1], como(B([null, sp(20, 0)]))[1]], [0, 95, 999999, ['SP', 20, 40, 0]],
    'o valor não fica abaixo de zero; quem digita acima do máximo fica com o que digitou (até um teto); sobrevida zerada sai da barra');
  // o mestre deu dano em Vida (62 → 40) enquanto o jogador, com a tela ainda em 62, gastava SP (24 → 14)
  dain.bars[0].v = 40;
  eq(como(B([vida(62), sp(14, 5)], [vida(62), sp(24, 5)])), [['Vida', 40, 80, 0], ['SP', 14, 40, 5]], 'com o "como estava", o dano do mestre e o gasto do jogador valem os dois (nenhum apaga o outro)');
  eq(como(B([vida(50), sp(24, 5)], [vida(62), sp(24, 5)])), [['Vida', 28, 80, 0], ['SP', 24, 40, 5]], 'na mesma barra, vale a variação: −12 continua −12 sobre o valor de agora');
  eq(B([vida(62), sp(24, 5)], [vida(62), sp(24, 5)]), null, 'pedido que não muda nada em relação ao "como estava" não vira mudança (nem desfaz o dano do mestre)');
  // sobrevida: o jogador levou 9 de dano (5 da sobrevida, 4 do SP) enquanto o mestre aumentava a sobrevida de 5 para 8
  dain.bars[1].x = 8;
  eq(como(B([vida(62), sp(20)], [vida(62), sp(24, 5)])), [['Vida', 40, 80, 0], ['SP', 20, 40, 3]], 'a sobrevida também vai pela variação');
  // duas curas somadas não estouram o máximo
  dain.bars[0].v = 78;
  eq(como(B([vida(80), sp(24, 5)], [vida(70), sp(24, 5)]))[0], ['Vida', 80, 80, 0], 'cura por cima de cura não passa do máximo');
  // o mestre trocou as barras de lugar nesse meio-tempo: o pedido não se aplica à barra errada
  const [bVida, bSp] = dain.bars; dain.bars = [bSp, bVida];
  eq(B([vida(10), sp(1, 5)], [vida(62), sp(24, 5)]), null, 'se a barra saiu do lugar (o mestre reordenou), o pedido não cai na barra errada');
  dain.bars = [bVida, bSp];
  dain.bars[1].on = false;
  eq(como(B([vida(70), sp(1)], [vida(78), sp(24, 8)])), [['Vida', 70, 80, 0], ['SP', 24, 40, 8]], 'barra desligada pelo mestre não muda');
  dain.bars[1].on = true; dain.bars[0].v = 62; dain.bars[1].x = 5;

  /* Condições */
  const C = (p, b) => V(Object.assign({ t: 'upd', c: 'tokens', id: dain.id, p }, b ? { b } : {}));
  eq(C({ conds: ['fogo', 'inventada', 'fogo', 'gelo'], cinfo: { fogo: { n: 2, d: 0, d0: -1, x: 9 }, inventada: { n: 1 }, gelo: 'x' } }).p, { conds: ['fogo', 'gelo'], cinfo: { fogo: { n: 2 } } }, 'condições: só as que existem, sem repetir; contadores só positivos');
  dain.conds = ['gelo']; dain.cinfo = { gelo: { d: 2, d0: 3 } };            // o mestre pôs "gelo" enquanto o jogador punha "fogo"
  eq(C({ conds: ['fogo'], cinfo: { fogo: { n: 1 } } }, { conds: [], cinfo: {} }).p, { conds: ['gelo', 'fogo'], cinfo: { gelo: { d: 2, d0: 3 }, fogo: { n: 1 } } }, 'condição que o mestre pôs nesse meio-tempo fica; a do jogador entra junto');
  dain.conds = ['fogo', 'gelo']; dain.cinfo = { fogo: { n: 1 }, gelo: { d: 2, d0: 3 } };
  eq(C({ conds: ['gelo'] }, { conds: ['fogo', 'gelo'] }).p, { conds: ['gelo'], cinfo: { gelo: { d: 2, d0: 3 } } }, 'tirar uma condição leva o contador dela junto, e só o dela');
  eq(C({ cinfo: { fogo: { n: 3 }, gelo: { d: 2, d0: 3 } } }, { cinfo: { fogo: { n: 1 }, gelo: { d: 2, d0: 3 } } }).p, { cinfo: { fogo: { n: 3 }, gelo: { d: 2, d0: 3 } } }, 'contador: muda só o da condição em que o jogador mexeu');
  eq(C({ conds: ['fogo', 'gelo'] }, { conds: ['fogo', 'gelo'] }), null, 'condições iguais ao "como estava" não viram mudança');
  dain.conds = []; dain.cinfo = {};

  /* Auras: "os jogadores veem" é escolha do mestre */
  eq(C({ auras: [{ id: 'au9', k: 'losango', r: 999, c: 'vermelho', a: 5, ang: 1, dir: 720, pub: false }] }).p.auras, [{ id: 'au9', k: 'circ', r: 60, c: '#e6ab4f', a: 0.8, ang: 10, dir: 360, pub: true }], 'auras: forma, raio, cor e opacidade dentro do que a mesa aceita; aura criada por jogador nasce visível');
  eq(C({ auras: [{ id: 'au1', k: 'circ', r: 4, c: '#ffffff', a: 0.2, ang: 60, dir: 0, pub: true }] }).p.auras, [{ id: 'au1', k: 'circ', r: 4, c: '#ffffff', a: 0.2, ang: 60, dir: 0, pub: false }], 'aura que o mestre escondeu continua escondida, mesmo que o pedido diga o contrário');
  const au1 = clone(dain.auras[0]), au7 = { id: 'au7', k: 'circ', r: 5, c: '#00ffff', a: 0.3, ang: 60, dir: 0, pub: true }, au9 = { id: 'au9', k: 'cone', r: 3, c: '#ff00ff', a: 0.3, ang: 90, dir: 45, pub: true };
  dain.auras = [au1, au7];                                                  // o mestre criou a au7 enquanto o jogador mexia nas dele
  eq(C({ auras: [au1, au9] }, { auras: [au1] }).p.auras.map(a => a.id), ['au1', 'au7', 'au9'], 'aura criada pelo jogador entra sem apagar a que o mestre criou nesse meio-tempo');
  eq(C({ auras: [] }, { auras: [au1] }).p.auras.map(a => a.id), ['au7'], 'e tirar a dele não tira a do mestre');
  eq(C({ auras: Array.from({ length: 30 }, (_, i) => Object.assign({}, au9, { id: 'ax' + i })) }).p.auras.length, 12, 'no máximo 12 auras por token');
  dain.auras = [au1];
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
  eq(forma.v, { id: 's9', k: 'rect', s: '#ffffff', sw: 4, f: '#000000', a: 1, top: true, gm: false, lock: true, by: ANA, x: 1, y: 2, w: 3, h: 4 }, 'o desenho entra com o jogador como autor, nunca "só do mestre", só com os campos de desenho');
  eq([V({ t: 'add', c: 'shapes', v: { id: 's1', k: 'rect', x: 0, y: 0, w: 1, h: 1 } }), V({ t: 'add', c: 'shapes', v: { id: 's8', k: 'bomba' } }), V({ t: 'add', c: 'shapes', v: { id: 's8', k: 'free', pts: [1, 2, 3] } }), V({ t: 'add', c: 'shapes', v: { id: 's8', k: 'text', x: 0, y: 0, txt: '   ' } }), V({ t: 'add', c: 'shapes', v: { id: 'com espaço', k: 'rect' } })],
    [null, null, null, null, null], 'não vale: id que já existe, forma que não existe, pontos quebrados, texto vazio, id estranho');
  eq([V({ t: 'add', c: 'shapes', v: { id: 's8', k: 'free', pts: Array(7000).fill(1) } }), V({ t: 'add', c: 'shapes', v: { id: 's8', k: 'free', pts: Array(3002).fill(1) } }), !!V({ t: 'add', c: 'shapes', v: { id: 's8', k: 'free', pts: Array(3000).fill(1) } })], [null, null, true], 'traço com pontos demais não entra (até 1500 pontos, entra)');
  eq(V({ t: 'add', c: 'shapes', v: { id: 's8', k: 'free', pts: [1.23456, 2.98765, 3.14159, 4.5, 1e9, -1e9] } }).v.pts, [1.2, 3, 3.1, 4.5, 100000, -100000], 'os pontos de um traço entram com uma casa decimal e dentro de um limite (pesam menos no banco)');
  {
    // quatro traços longos do mesmo jogador (uns 24 KB cada); o quinto passaria do que cabe a um jogador nesta cena
    const longo = id => ({ id, k: 'free', pts: Array.from({ length: 3000 }, (_, i) => 10000.5 + i), s: '#ffffff', sw: 4, a: 1 });
    const n0 = sc.shapes.length;
    for (let i = 0; i < 4; i++) { const r = V({ t: 'add', c: 'shapes', v: longo('longo' + i) }); sc.shapes.push(r.v); }
    const peso = sc.shapes.filter(s => s.by === ANA).reduce((t, s) => t + JSON.stringify(s).length, 0);
    eq([peso > 90000 && peso < 120000, V({ t: 'add', c: 'shapes', v: longo('longo4') }), !!V({ t: 'add', c: 'shapes', v: { id: 'curto', k: 'rect', x: 0, y: 0, w: 1, h: 1 } }), !!V({ t: 'add', c: 'shapes', v: longo('longo4') }, BETO), V({ t: 'upd', c: 'shapes', id: 's3', p: { k: 'rect', w: 5 } }) !== null],
      [true, null, true, true, true], 'os desenhos de um jogador têm um tamanho total por cena: passou disso, o próximo não entra (um pequeno ainda cabe; o limite de um jogador não trava o outro)');
    sc.shapes.length = n0;
  }
  // a ordem dos desenhos: o jogador só vê s1 e s3 (s2 e s4 são só do mestre e ficam onde estão)
  eq(V({ t: 'ord', c: 'shapes', ids: ['s3', 's1'] }), { t: 'ord', c: 'shapes', ids: ['s3', 's2', 's1', 's4'] }, 'trazer para frente / enviar para trás: troca os desenhos que o jogador vê, sem tirar os do mestre do lugar');
  eq([V({ t: 'ord', c: 'shapes', ids: ['s1', 's3'] }), V({ t: 'ord', c: 'shapes', ids: ['s3'] }), V({ t: 'ord', c: 'shapes', ids: ['s3', 's3'] }), V({ t: 'ord', c: 'shapes', ids: ['s3', 's1', 's2'] }), V({ t: 'ord', c: 'shapes', ids: ['s1', 'zz'] }), V({ t: 'ord', c: 'shapes', ids: 'x' })],
    [null, null, null, null, null, null], 'ordem que não vale: a mesma de agora, lista incompleta, repetida, com desenho só do mestre, com id que não existe, que não é lista');
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
  eq([lia.id, orc.id, dain.id, grupo.id].map(tk => V({ t: 'add', c: 'effects', v: Object.assign({}, fx, { id: 'e11', token: tk }) }).v.token), [null, null, dain.id, grupo.id], 'efeito preso a token: só ao dele ou ao "de todos"; no de outro jogador ou do mestre, entra solto');
  // limites por jogador: uma cena não enche por causa de um só
  const formasAntes = sc.shapes.length, efeitosAntes = sc.effects.length;
  for (let i = 0; i < 150; i++) sc.shapes.push({ id: 'lote' + i, k: 'rect', x: 0, y: 0, w: 1, h: 1, s: '#ffffff', sw: 1, f: null, a: 1, top: false, gm: false, lock: false, by: BETO });
  for (let i = 0; i < 40; i++) sc.effects.push(Object.assign({}, feito, { id: 'lote' + i, by: BETO }));
  eq([V({ t: 'add', c: 'shapes', v: { id: 's8', k: 'rect', x: 0, y: 0, w: 1, h: 1 } }, BETO), !!V({ t: 'add', c: 'shapes', v: { id: 's8', k: 'rect', x: 0, y: 0, w: 1, h: 1 } }), V({ t: 'add', c: 'effects', v: Object.assign({}, fx, { id: 'e12' }) }, BETO), !!V({ t: 'add', c: 'effects', v: Object.assign({}, fx, { id: 'e12' }) })],
    [null, true, null, true], 'cada jogador tem um limite de desenhos (150) e de efeitos (40) por cena; o limite de um não trava o outro');
  sc.shapes.length = formasAntes; sc.effects.length = efeitosAntes;

  // pedidos feitos para quebrar o programa do mestre
  const hostil = JSON.parse('{"t":"upd","c":"tokens","id":"' + dain.id + '","p":{"__proto__":{"x":1},"constructor":1,"conds":["__proto__","constructor","toString","fogo"],"cinfo":{"__proto__":{"n":5},"constructor":{"n":5},"fogo":{"n":1}}}}');
  const limpo = V(hostil);
  eq([limpo.p.conds, Object.keys(limpo.p.cinfo), limpo.p.cinfo.n === undefined && limpo.p.x === undefined, Object.keys(limpo.p).sort()], [['fogo'], ['fogo'], true, ['cinfo', 'conds']], 'nomes que todo objeto tem ("__proto__", "constructor", "toString") não passam por condição nem por campo');
  eq([V({ t: 'add', c: 'shapes', v: { id: '__proto__', k: 'rect', x: 0, y: 0, w: 1, h: 1 } }), V({ t: 'add', c: 'shapes', v: { id: 'constructor', k: 'rect', x: 0, y: 0, w: 1, h: 1 } }), V({ t: 'add', c: 'effects', v: Object.assign({}, fx, { id: 'toString' }) }), V({ t: 'add', c: 'effects', v: Object.assign({}, fx, { id: 'e10', fx: '__proto__' }) }), V({ t: 'add', c: 'effects', v: Object.assign({}, fx, { id: 'e10', fx: 'inventado' }) })],
    [null, null, null, null, null], 'ids com esses nomes e efeitos que não estão na biblioteca não entram');
  eq([V({ t: 'upd', c: 'shapes', id: 's3', p: { k: 'text', txt: 'virou texto', lock: true, w: 77 } }), V({ t: 'upd', c: 'effects', id: 'e4', p: { fx: '__proto__' } }), V({ t: 'upd', c: 'effects', id: 'e4', p: { fx: 'gelo', token: oculto.id } })],
    [{ t: 'upd', c: 'shapes', id: 's3', p: { lock: true, w: 77 } }, null, { t: 'upd', c: 'effects', id: 'e4', p: { fx: 'gelo', token: null } }], 'remendos: a forma não troca de tipo (travar o próprio desenho vale); o efeito só troca para outro da biblioteca e não se prende a token oculto');
  ok(!Proj.idOk('__proto__') && !Proj.idOk('constructor') && !Proj.idOk('hasOwnProperty') && Proj.idOk('cena_abc12') && !Proj.idOk('a b') && !Proj.idOk('') && !Proj.idOk('x'.repeat(61)), 'idOk: curto, sem espaço, e nunca um nome que todo objeto já tem');
  /* Valores feitos para dar erro em quem tenta convertê-los em número ou em texto ({"toString":1,"valueOf":1}): em
     qualquer campo de qualquer pedido, a conferência não pode quebrar (um erro pararia os pedidos de toda a mesa). */
  {
    const ruim = () => JSON.parse('{"toString":1,"valueOf":1}');
    const campos = ['x', 'y', 'w', 'h', 'r', 'rw', 'rh', 'sw', 'a', 'fs', 'ang', 'dir', 'pow', 'seed', 'dur', 'dur0', 's', 'f', 'c', 'txt', 'k', 'fx', 'id', 'token', 'at', 'pts', 'top', 'lock', 'n', 'v', 'm', 'd', 'd0', 'by', 't', 'open'];
    const moldes = [
      v => ({ t: 'upd', c: 'tokens', id: dain.id, p: { x: v, y: v, bars: [{ n: 'Vida', v, x: v, m: v }, v], conds: [v, 'fogo'], cinfo: { fogo: { n: v, d: v, d0: v }, gelo: v }, auras: [{ id: v, k: v, r: v, c: v, a: v, ang: v, dir: v }, v] }, b: { bars: [{ n: v, v, x: v }, v], conds: [v], cinfo: { fogo: { n: v } }, auras: [{ id: v, r: v }, v] } }),
      v => ({ t: 'upd', c: 'tokens', id: dain.id, p: { bars: v, conds: v, cinfo: v, auras: v }, b: v }),
      v => ({ t: 'upd', c: 'tokens', id: v, p: v, b: v }),
      v => ({ t: 'add', c: 'shapes', v: Object.fromEntries([['id', 'sx1'], ['k', 'text']].concat(campos.filter(k => k !== 'id' && k !== 'k').map(k => [k, v]))) }),
      v => ({ t: 'add', c: 'shapes', v: { id: 'sx2', k: 'free', pts: [1, v, 3, 4], s: v, sw: v } }),
      v => ({ t: 'add', c: 'shapes', v: { id: 'sx3', k: 'rect', x: v, y: v, w: v, h: v, s: v, f: v, a: v } }),
      v => ({ t: 'upd', c: 'shapes', id: 's3', p: Object.fromEntries(campos.map(k => [k, v])) }),
      v => ({ t: 'ord', c: 'shapes', ids: [v, 's1', v] }),
      v => ({ t: 'add', c: 'effects', v: Object.fromEntries([['id', 'ex1'], ['fx', 'fogo'], ['k', 'circ']].concat(campos.filter(k => !['id', 'fx', 'k'].includes(k)).map(k => [k, v]))) }),
      v => ({ t: 'upd', c: 'effects', id: 'e4', p: Object.fromEntries(campos.map(k => [k, v])) }),
      v => ({ t: 'upd', c: 'walls', id: 'w2', p: { open: v } }),
      v => ({ t: 'scn', p: { targets: [{ by: v, t: v }, v, { by: ANA, t: v }] } }),
      v => ({ t: v, c: v, id: v, p: v, v, ids: v, b: v }),
    ];
    let erros = 0, feitos = 0;
    for (const molde of moldes) for (const v of [ruim(), [ruim()], { a: ruim() }, 1e400, -1e400, NaN, null, '', 'x'.repeat(5000), [], {}, true]) {
      feitos++;
      try { const r = V(molde(v)); if (r) JSON.stringify(r); } catch (e) { erros++; console.log('  erro em', JSON.stringify(molde('«v»')).slice(0, 90), '→', e.message); }
    }
    eq([erros, feitos], [0, moldes.length * 12], 'pedidos com valores feitos para dar erro (em qualquer campo): a conferência recusa ou limpa, e nunca quebra');
    // e, por cima de uma cena do jogador, o que ele mesmo mandou também não quebra a tela dele
    let erros2 = 0;
    for (const molde of moldes) { try { Proj.aplicarEm(clone(sc), [molde(ruim())]); } catch (e) { erros2++; console.log('  erro (aplicarEm) em', JSON.stringify(molde('«v»')).slice(0, 90), '→', e.message); } }
    eq(erros2, 0, 'e repor esses pedidos por cima da cena (na tela do próprio jogador) também não quebra');
  }
  ok(Proj.idCena('cena_abc12') && !Proj.idCena('pub') && !Proj.idCena('pedido') && !Proj.idCena('__proto__') && !Proj.idCena('a:b'), 'id de cena: além disso, nunca "pub" nem "pedido" (os nomes dos documentos da projeção e dos pedidos)');

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
  const base = () => { const pr = Proj.projetar(cenaCheia().sc, ASSETS, new Set([ANA, BETO])), j = normalizeScene(Proj.juntar(ida(pr.m), ida(pr.v))); j.id = 'cena_teste1'; return j; };
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

  // cada mudança avisa também como as coisas estavam antes (é o que vai junto no pedido do jogador), na ordem contrária
  {
    const tk = a.tokens[0], x0 = tk.x, avis = [];
    Store.on('commit', e => avis.push(e));
    Store.tx('teste', () => { Store.upd('tokens', tk.id, { x: 111 }); Store.add('shapes', { id: 'sx1', k: 'rect', x: 0, y: 0, w: 1, h: 1 }); Store.upd('tokens', tk.id, { x: 222 }); });
    const e = avis[avis.length - 1];
    eq([e.ops.map(o => o.t), e.inv.map(o => o.t), e.inv[2].p.x, e.inv[0].p.x, !!e.remote], [['upd', 'add', 'upd'], ['upd', 'del', 'upd'], x0, 111, false], 'o aviso de uma mudança leva o "como estava" de cada operação (a última da lista desfaz a primeira)');
    Store.undo();
    const d = avis[avis.length - 1];
    eq([d.ops.map(o => o.t), d.inv.map(o => o.t), d.ops[2].p.x, d.inv[0].p.x, tk.x], [['upd', 'del', 'upd'], ['upd', 'add', 'upd'], x0, 111, x0], 'desfazer avisa do mesmo jeito: as operações são as inversas, e o "como estava" é o que tinha sido feito');
    Store.redo();
    eq([avis[avis.length - 1].inv[2].p.x, tk.x], [x0, 222], 'refazer também');
    Store.undo();
  }

  // pedido com o "como estava", reposto por cima de uma projeção em que o mestre já mexeu em outra barra
  {
    const ch = base(), tk = ch.tokens[0];
    tk.bars[0].v = 40;
    Proj.aplicarEm(ch, [{ t: 'upd', c: 'tokens', id: tk.id, p: { bars: [{ n: 'Vida', v: 62, m: 80 }, { n: 'SP', v: 14, m: 40, x: 5 }], conds: ['fogo'] }, b: { bars: [{ n: 'Vida', v: 62, m: 80 }, { n: 'SP', v: 24, m: 40, x: 5 }], conds: [] } }]);
    eq([tk.bars.map(b => [b.n, b.v, b.x || 0]), tk.conds], [[['Vida', 40, 0], ['SP', 14, 5]], ['fogo']], 'aplicarEm com o "como estava": na tela do jogador entra só a diferença dele, como vai entrar na do mestre');
  }

  // o MESTRE refaz por cima da cena que chegou de outro aparelho dele o que tinha feito aqui: sem os limites dos jogadores
  {
    const ch = base(), tk = ch.tokens.find(t => t.name === 'Orc chefe') || ch.tokens[3];
    const antes = clone(tk.bars), aurasAntes = clone(tk.auras);
    // lá (o que chegou): o valor da primeira barra mudou (um pedido de jogador aplicado no outro aparelho) e entrou uma barra nova
    tk.bars[0].v = tk.bars[0].v - 7; tk.bars.push(cleanBar({ n: 'De lá', v: 1, m: 2 }));
    // aqui: o mestre mudou o máximo e o nome de "quem vê" da primeira barra, criou uma barra, e criou uma aura só dele
    const meu = clone(antes); meu[0].m = 250; meu[0].vis = 'none'; meu.push(cleanBar({ n: 'Daqui', v: 3, m: 9, vis: 'none' }));
    const auraSecreta = { id: 'au_m', k: 'circ', r: 99, c: '#123456', a: 0.9, ang: 60, dir: 0, pub: false };
    Proj.aplicarEm(ch, [{ t: 'upd', c: 'tokens', id: tk.id, p: { bars: meu, auras: aurasAntes.concat([auraSecreta]), name: 'Orc renomeado' }, b: { bars: antes, auras: aurasAntes } }], true);
    eq([tk.bars[0].m, tk.bars[0].vis, tk.bars[0].v, tk.bars.map(b => b.n).slice(-2), tk.name], [250, 'none', antes[0].v - 7, ['Daqui', 'De lá'], 'Orc renomeado'],
      'refeito como mestre: o máximo, o "quem vê" e a barra nova dele ficam; o valor que mudou lá e a barra criada lá também');
    eq(tk.auras.find(a => a.id === 'au_m'), auraSecreta, 'e a aura que o mestre criou só para ele continua só dele, do tamanho que ele deu (sem os limites das auras de jogador)');
    // a mesma operação aplicada com as regras de jogador não poderia fazer nada disso
    const ch2 = base(), tk2 = ch2.tokens.find(t => t.name === 'Orc chefe') || ch2.tokens[3];
    tk2.bars[0].v = tk2.bars[0].v - 7;
    const antes2 = clone(tk2.bars).map((b, i) => (i ? b : Object.assign({}, b, { v: b.v + 7 }))), auras2 = clone(tk2.auras);
    const meu2 = clone(antes2); meu2[0].m = 250; meu2.push(cleanBar({ n: 'Daqui', v: 3, m: 9 }));
    Proj.aplicarEm(ch2, [{ t: 'upd', c: 'tokens', id: tk2.id, p: { bars: meu2, auras: auras2.concat([auraSecreta]) }, b: { bars: antes2, auras: auras2 } }]);
    eq([tk2.bars[0].m, tk2.bars.length, tk2.auras.find(a => a.id === 'au_m').pub, tk2.auras.find(a => a.id === 'au_m').r], [antes2[0].m, antes2.length, true, 60], '(com as regras de jogador, o máximo e a barra nova não entram, e a aura entra visível e limitada)');
  }

  // o jogador repõe por cima da projeção o que ele fez e o mestre ainda não aplicou
  const chegou = base(), meu = chegou.tokens[0].id;
  Proj.aplicarEm(chegou, [{ t: 'upd', c: 'tokens', id: meu, p: { x: 640, y: 320 } }, { t: 'add', c: 'shapes', v: { id: 'meu-traço', k: 'rect', x: 0, y: 0, w: 5, h: 5 } }, { t: 'del', c: 'shapes', id: 's3' }, { t: 'ord', c: 'tokens', ids: chegou.tokens.map(t => t.id).reverse() }, { t: 'scn', p: { targets: [{ by: ANA, t: meu }] } }, { t: 'upd', c: 'tokens', id: 'sumiu', p: { x: 1 } }, { t: 'add', c: 'coisas', v: { id: 'x' } }, null]);
  eq([chegou.tokens[chegou.tokens.length - 1].x, chegou.shapes.map(s => s.id), chegou.targets], [640, ['s1', 'meu-traço'], [{ by: ANA, t: meu }]], 'aplicarEm: mover, criar, apagar, reordenar e trocar campo da cena; o que não se aplica é ignorado');
}

/* ============ o índice e as cenas que vêm de fora ============ */
{
  eq(Proj.normIndice(null), { v: 1, ordem: [], atual: null, noAr: null, tx: null, prefs: { barDefaults: null } }, 'índice vazio');
  eq(Proj.normIndice({ ordem: ['cena_a', 'cena_a', 'com espaço', 7, 'cena_b'], atual: 'cena_b', noAr: '../x', prefs: { barDefaults: [{ n: 'PV', v: 3, m: 5, lixo: 1 }], anim: false } }),
    { v: 1, ordem: ['cena_a', 'cena_b'], atual: 'cena_b', noAr: null, tx: null, prefs: { barDefaults: [{ n: 'PV', c: '#d6524b', v: 3, m: 5, k: 'bar', on: true, vis: '' }] } }, 'índice sujo: ids estranhos e repetidos saem; as barras padrão são limpas');
  eq(Proj.normIndice({ ordem: ['pub', 'pedido', 'cena_a'], atual: 'pub', noAr: 'pedido' }), { v: 1, ordem: ['cena_a'], atual: null, noAr: null, tx: null, prefs: { barDefaults: null } }, 'nenhuma cena se chama "pub" nem "pedido"');
  eq([Proj.normIndice({ noAr: 'cena_a', tx: 'ap1k2j3h4g' }).tx, Proj.normIndice({ noAr: 'cena_a', tx: 'com espaço' }).tx, Proj.normIndice({ noAr: 'cena_a', tx: { toString: 1 } }).tx], ['ap1k2j3h4g', null, null], 'o índice guarda qual aparelho do mestre transmite a cena que está no ar (só se for um código de verdade)');
  // o resumo que serve de versão do mapa: o mesmo conteúdo dá sempre o mesmo, conteúdo diferente dá outro
  ok(typeof Proj.resumo('abc') === 'string' && Proj.resumo('abc') === Proj.resumo('abc') && Proj.resumo('abc') !== Proj.resumo('abd') && Proj.resumo('') !== Proj.resumo(' ') && new Set(Array.from({ length: 2000 }, (_, i) => Proj.resumo('mapa ' + i))).size === 2000, 'o resumo do mapa: igual para o mesmo texto, diferente para textos diferentes');
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
