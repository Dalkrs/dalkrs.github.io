// Bateria do lote 133 (as Cenas): as roupas e os disfarces, e o "Voltar para a ronda".
//   · as 18 roupas desenham (a foto mostra todas); a roupa vai na projeção, para todos;
//   · disfarçado, no cone de quem ronda: só "pode ter notado" (?), nunca "visto" (!);
//   · disfarçado perto e à vista de um NPC com a mesma roupa de verdade: o "??" (só o mestre) e o aviso;
//     com parede no meio, ou com roupa diferente, não;
//   · o jogador veste o próprio token (pedido validado: sempre disfarce) e tira;
//   · "Ficar de posto" guarda a rota; "Voltar para a ronda" a traz de volta, do ponto mais perto.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const j = JSON.stringify;
(async () => {
  const t = await open({ w: 1400, h: 900 });
  const { page } = t;
  const ev = (fn, a) => page.evaluate(fn, a);
  const w = ms => page.waitForTimeout(ms || 150);

  // ---- o desfile: todas as roupas ----
  const ids = await ev(() => {
    const T = __tc, S = T.Store, sc = T.newScene('Roupas'); sc.cols = 20; sc.rows = 8; sc.light = 'claro'; T.normalizeScene(sc); S.addScene(sc); T.UI.switchScene(sc.id);
    const c = sc.cell, L = T.Roupas.LISTA;
    S.tx('desfile', () => L.forEach((r, i) => { const k = T.newToken(sc, (1 + (i % 9) * 2) * c, (1 + Math.floor(i / 9) * 3) * c, { name: r.n.split(' ')[0] }); k.roupa = { k: r.id }; S.add('tokens', k); }));
    T.App.view.zoom = 0.75; T.Render.request();
    return L.map(r => r.id);
  });
  ok(ids.length === 18, '18 roupas: ' + ids.join(', '));
  await w(400);
  if (process.env.FOTOS) await page.locator('#cv').screenshot({ path: process.env.FOTOS + '/roupas-desfile.png' });
  const pub = await ev(() => { const sc = __tc.Store.scene(); return __tc.Proj.projetar(sc, {}, new Set(['p1'])).v.tokens.filter(k => k.roupa).length; });
  ok(pub === 18, 'a roupa vai na projeção (todos veem)');

  // ---- disfarce e rondas ----
  await ev(() => {
    const T = __tc, S = T.Store, sc = T.newScene('Disfarce'); sc.cols = 24; sc.rows = 14; sc.light = 'claro'; T.normalizeScene(sc); S.addScene(sc); T.UI.switchScene(sc.id);
    const c = sc.cell;
    const g = T.newToken(sc, 2 * c, 6 * c, { name: 'Sentinela' }); g.ronda = T.Rondas.novaRonda({ pts: [[2, 6], [2, 2], [8, 2]], dir: 0, r: 8, a: 120 }); g.roupa = { k: 'guarda' };
    const nv = T.newToken(sc, 16 * c, 6 * c, { name: 'Irmão Tobias' }); nv.roupa = { k: 'novico' };
    const pj = T.newToken(sc, 6 * c, 6 * c, { name: 'Dalmo' }); pj.owner = 'p1';
    S.tx('c', () => { S.add('tokens', Object.assign(g, { id: 'g1' })); S.add('tokens', Object.assign(nv, { id: 'n1' })); S.add('tokens', Object.assign(pj, { id: 'pj' })); });
    S.S.players = [{ id: 'p1', name: 'Dalmo' }];
  });
  const nivel = () => ev(() => __tc.Rondas.quemVe(__tc.Store.scene()).map(v => v.nivel).join());
  ok(await nivel() === 'visto', 'sem disfarce, de dia, no cone: visto (!)');
  await ev(() => __tc.Store.tx('v', () => __tc.Store.upd('tokens', 'pj', { roupa: { k: 'guarda', d: true } })));
  ok(await nivel() === 'sombra', 'disfarçado de guarda: só "pode ter notado" (?)');
  ok(/pode ter notado Dalmo \(disfarçado\)/.test(await ev(() => __tc.Rondas.resumoVistos(__tc.Rondas.quemVe(__tc.Store.scene())))), 'o aviso das rondas diz "disfarçado"');

  // ---- noviço encontra noviço ----
  const enc = () => ev(() => __tc.Roupas.encontros(__tc.Store.scene()).map(e => e.d.name + '>' + e.n.name).join());
  ok(await enc() === '', 'disfarçado de guarda: o sentinela também é guarda, mas é NPC de ronda com roupa de verdade');
  // (o sentinela veste guarda de verdade e está longe: 4 quadrados) — mais perto: ??
  await ev(() => { const c = __tc.Store.scene().cell; __tc.Store.tx('m', () => __tc.Store.upd('tokens', 'pj', { x: 4 * c })); });
  ok(await enc() === 'Dalmo>Sentinela', 'a 2 quadrados do sentinela (guarda de verdade): ??');
  await ev(() => { const c = __tc.Store.scene().cell; __tc.Store.tx('m', () => __tc.Store.upd('tokens', 'pj', { x: 14 * c, roupa: { k: 'novico', d: true } })); });
  ok(await enc() === 'Dalmo>Irmão Tobias', 'disfarçado de noviço, perto do Irmão Tobias (noviço de verdade): ??');
  await w(300);
  ok(/disfarçado de noviço, está perto de Irmão Tobias/.test(await ev(() => [...document.querySelectorAll('.toast')].map(x => x.textContent).join(' '))), 'o mestre recebe o aviso');
  if (process.env.FOTOS) await page.locator('#cv').screenshot({ path: process.env.FOTOS + '/roupas-encontro.png' });
  await ev(() => { const S = __tc.Store, c = S.scene().cell; S.tx('parede', () => S.add('walls', { id: 'wx', k: 'wall', x1: 15.5 * c, y1: 4 * c, x2: 15.5 * c, y2: 9 * c })); });
  ok(await enc() === '', 'com uma parede no meio: não');
  await ev(() => __tc.Store.tx('x', () => __tc.Store.del('walls', 'wx')));
  await ev(() => __tc.App.opt.disfPerto = 1);
  ok(await enc() === '', 'com o alcance em 1 quadrado: longe demais');
  await ev(() => __tc.App.opt.disfPerto = 3);

  // ---- o pedido do jogador ----
  const val = await ev(() => {
    const P = __tc.Proj, sc = __tc.Store.scene(); sc.perms = Object.assign({}, sc.perms, { condicoes: true });
    const a = P.validar({ t: 'upd', c: 'tokens', id: 'pj', p: { roupa: { k: 'vip', d: false } } }, 'p1', sc);
    const b = P.validar({ t: 'upd', c: 'tokens', id: 'pj', p: { roupa: null } }, 'p1', sc);
    const c = P.validar({ t: 'upd', c: 'tokens', id: 'n1', p: { roupa: { k: 'vip' } } }, 'p1', sc);
    return { a: a && a.p, b: b && Object.keys(b.p), c };
  });
  ok(j(val.a) === j({ roupa: { k: 'vip', d: true } }) && j(val.b) === j(['roupa']) && val.c === null, 'o pedido do jogador: veste (sempre disfarce) e tira o próprio; no NPC, não');
  await ev(() => { __tc.setSel([{ c: 'tokens', id: 'pj' }]); __tc.App.tab = 'sel'; __tc.App.sideOpen = true; __tc.UI.renderAll(); }); await w(300);
  await ev(() => { const d = document.getElementById('s-roupa'); if (d) d.open = true; }); await w(100);
  ok(await page.locator('#tk-roupa').count() === 1 && await page.locator('#tk-roupa').inputValue() === 'novico', 'o bloco Roupa no painel do token');
  await page.locator('#tk-roupa').selectOption('mendigo'); await w(200);
  ok(j(await ev(() => __tc.Store.get('tokens', 'pj').roupa)) === j({ k: 'mendigo', d: true }), 'trocar no painel: mendigo (o token do jogador: disfarce)');
  await page.locator('#tk-roupa-tira').click(); await w(200);
  ok(!(await ev(() => __tc.Store.get('tokens', 'pj').roupa)), '"Tirar o disfarce"');

  // ---- ficar de posto e voltar para a ronda ----
  await ev(() => { __tc.setSel([{ c: 'tokens', id: 'g1' }]); __tc.UI.renderAll(); }); await w(250);
  await ev(() => { const d = document.getElementById('s-guarda'); if (d) d.open = true; }); await w(100);
  await page.locator('#tk-gposto').click(); await w(250);
  let g = await ev(() => JSON.parse(JSON.stringify(__tc.Store.get('tokens', 'g1').ronda)));
  ok(g.pts.length === 0 && g.guardada && g.guardada.pts.length === 3, '"Ficar de posto": parado, com a rota guardada');
  ok(await page.locator('#tk-gvolta').count() === 1, 'aparece "Voltar para a ronda"');
  await ev(() => { const S = __tc.Store, c = S.scene().cell; S.tx('m', () => S.upd('tokens', 'g1', { x: 7 * c, y: 2 * c })); });
  await page.locator('#tk-gvolta').click(); await w(250);
  g = await ev(() => JSON.parse(JSON.stringify(__tc.Store.get('tokens', 'g1').ronda)));
  ok(g.pts.length === 3 && !g.guardada && g.i === 2, 'voltou para a ronda, rumo ao ponto mais perto (o 3º): i=' + g.i);
  ok(await page.locator('#tk-gposto').count() === 1 && await page.locator('#tk-gvolta').count() === 0, 'e o botão volta a ser "Ficar de posto"');
  if (process.env.FOTOS) await page.locator('#s-guarda').screenshot({ path: process.env.FOTOS + '/guarda-posto.png' });

  const inesperados = t.errs.filter(e => !/favicon/.test(e));
  ok(!inesperados.length, 'sem erros no console: ' + inesperados.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
