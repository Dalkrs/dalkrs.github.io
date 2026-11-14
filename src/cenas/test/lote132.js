// Bateria do lote 132 (as Cenas, pedido do Bruno): o guarda vira sozinho e a vista revelada a um jogador.
//   · na ronda, ao chegar num ponto, já olha para o trecho seguinte; arrastado à mão, olha para onde foi (com Desfazer);
//   · "Mostrar o cone a um jogador": a projeção leva o cone (e a rota, se o mestre deixou) só com quem pode ver; o tempo
//     conta por "Avançar rondas" ou por rodada de combate e acaba sozinho;
//   · na tela do jogador, só quem está na lista vê o cone (e o "!" de quem o guarda vê).
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const j = JSON.stringify;
(async () => {
  const t = await open({ w: 1300, h: 850 });
  const { page } = t;
  const ev = (fn, a) => page.evaluate(fn, a);
  const w = ms => page.waitForTimeout(ms || 150);
  await ev(() => {
    const T = __tc, S = T.Store, sc = T.newScene('Rondas 132'); sc.cols = 20; sc.rows = 14; T.normalizeScene(sc); S.addScene(sc); T.UI.switchScene(sc.id);
    const c = sc.cell, g = T.newToken(sc, 2 * c, 2 * c, { name: 'Soldado' });
    S.tx('g', () => S.add('tokens', Object.assign(g, { id: 'tg', ronda: { pts: [[2, 2], [5, 2], [5, 9]], i: 1, s: 1, modo: 'ida', passo: 3, r: 6, a: 90, dir: 0 } })));
    const pj = T.newToken(sc, 12 * c, 2 * c, { name: 'Dalmo' });
    S.tx('p', () => S.add('tokens', Object.assign(pj, { id: 'tp', owner: 'p1' })));
    S.S.players = [{ id: 'p1', name: 'Dalmo' }, { id: 'p2', name: 'Ana' }];
  });
  const g = () => ev(() => JSON.parse(JSON.stringify(__tc.Store.get('tokens', 'tg'))));

  // ---- virar antes da curva ----
  await ev(() => __tc.Rondas.avancar()); await w();
  let k = await g();
  ok(Math.round(k.x / 64) === 5 && k.ronda.dir === 90, 'chegou ao canto da rota: já olha para baixo, o trecho seguinte (' + Math.round(k.x / 64) + ', rumo ' + k.ronda.dir + ')');
  await ev(() => __tc.Rondas.avancar()); await w();
  k = await g();
  ok(k.ronda.dir === 90 && Math.round(k.y / 64) === 5, 'descendo: continua olhando para baixo');

  // ---- arrastado à mão ----
  await ev(() => { const S = __tc.Store, t = S.get('tokens', 'tg'); S.tx('Mover', () => S.upd('tokens', 'tg', { x: t.x + 3 * 64 })); }); await w();
  k = await g();
  ok(k.ronda.dir === 0, 'arrastado para a direita: olha para a direita (' + k.ronda.dir + ')');
  await ev(() => { const S = __tc.Store, t = S.get('tokens', 'tg'); S.tx('Mover', () => S.upd('tokens', 'tg', { x: t.x - 64, y: t.y - 64 })); }); await w();
  ok((await g()).ronda.dir === 225, 'para cima e para a esquerda: olha na diagonal (225)');
  await ev(() => __tc.Tools.undo()); await w();
  ok((await g()).ronda.dir === 0, 'Desfazer volta o rumo junto com a posição');
  await ev(() => { const S = __tc.Store, t = S.get('tokens', 'tp'); S.tx('Mover', () => S.upd('tokens', 'tp', { x: t.x + 64 })); }); await w();
  ok(!(await ev(() => __tc.Store.get('tokens', 'tp').ronda)), 'quem não é guarda não ganha rumo');

  // ---- o painel: mostrar o cone a um jogador ----
  await ev(() => { __tc.setSel([{ c: 'tokens', id: 'tg' }]); __tc.App.tab = 'sel'; __tc.App.sideOpen = true; __tc.UI.renderAll(); }); await w(300);
  await ev(() => { const d = document.getElementById('s-guarda'); if (d && !d.open) d.open = true; }); await w(100);
  ok(await page.locator('#tk-gver-c-p1').count() === 1 && await page.locator('#tk-gver-r-p2').count() === 1, 'o bloco "Mostrar o cone a um jogador" lista os jogadores');
  await page.locator('#tk-gver-c-p1').check({ force: true }); await w(300);
  k = await g();
  ok(k.ronda.ver && j(k.ronda.ver.para) === j(['p1']) && !k.ronda.ver.rotas.length && k.ronda.ver.por === '', 'marcado: só o Dalmo vê, sem a rota, até o mestre esconder');
  ok(/veem o cone: Dalmo \(até você esconder\)/.test(await page.locator('.tk-gver').innerText()), 'o resumo diz quem vê e até quando');
  if (process.env.FOTOS) await page.locator('.tk-gver').screenshot({ path: process.env.FOTOS + '/gver-painel.png' });

  // ---- a projeção ----
  const pub = await ev(() => { const sc = __tc.Store.scene(), t = __tc.Store.get('tokens', 'tg'); return JSON.parse(JSON.stringify(__tc.Proj.projetar(sc, {}, new Set(['p1', 'p2'])).v.tokens.find(x => x.id === 'tg'))); });
  if (pub) {
    ok(pub.vc && j(pub.vc.para) === j(['p1']) && pub.vc.r === 6 && pub.vc.a === 90 && pub.vc.est === 'calmo' && !pub.vc.pts && !pub.ronda, 'na projeção: o cone, sem a rota e sem o resto da ronda');
  }
  await ev(() => { const S = __tc.Store, t = S.get('tokens', 'tg'); S.tx('v', () => S.upd('tokens', 'tg', { ronda: Object.assign({}, t.ronda, { ver: Object.assign({}, t.ronda.ver, { rota: true, por: 'rondas', n: 2 }) }) })); });
  const pub2 = await ev(() => { const sc = __tc.Store.scene(); return JSON.parse(JSON.stringify(__tc.Proj.projetar(sc, {}, new Set(['p1'])).v.tokens.find(x => x.id === 'tg'))); });
  if (pub2) ok(pub2.vc && pub2.vc.pts && pub2.vc.pts.length === 3, 'com "A rota vai junto": a rota também');
  

  // ---- o tempo ----
  await ev(() => __tc.Rondas.avancar()); await w();
  ok((await g()).ronda.ver.n === 1, 'uma vez de "Avançar rondas": falta 1');
  await ev(() => __tc.Rondas.avancar()); await w();
  ok(!(await g()).ronda.ver && /não veem mais o cone de Soldado/.test(await ev(() => [...document.querySelectorAll('.toast')].map(x => x.textContent).join(' '))), 'acabou: o cone some para o jogador, e o mestre é avisado');
  await ev(() => { const S = __tc.Store, t = S.get('tokens', 'tg'); S.tx('v', () => S.upd('tokens', 'tg', { ronda: Object.assign({}, t.ronda, { ver: { para: ['p1'], rota: false, por: 'rodadas', n: 1 } }) })); });
  await ev(() => __tc.Rondas.avancar()); await w();
  ok((await g()).ronda.ver.n === 1, 'contando por rodadas, "Avançar rondas" não gasta');
  await ev(() => __tc.Rondas.naRodada()); await w();
  ok(!(await g()).ronda.ver, 'uma rodada de combate: acabou');

  // ---- a tela do jogador ----
  const vistos = await ev(() => {
    const T = __tc, sc = T.Store.scene(), t = T.Store.get('tokens', 'tg');
    const sc2 = Object.assign({}, sc, { tokens: sc.tokens.map(x => (x.id === 'tg' ? Object.assign({}, t, { ronda: Object.assign({}, t.ronda, { ver: { para: ['p1'], rota: true, por: '', n: 0 } }) }) : x)) });
    const pubT = JSON.parse(JSON.stringify(T.Proj.projetar(sc2, {}, new Set(['p1'])).v.tokens.find(x => x.id === 'tg')));
    T.Rondas.limpar(pubT);
    const out = {};
    const antes = sc.tokens.slice();
    sc.tokens = sc.tokens.map(x => (x.id === 'tg' ? pubT : x));
    T.App.viewer = 'p1'; out.p1 = T.Rondas.vistos(sc).map(x => x.id); out.ve = T.Rondas.quemVe(sc, T.Rondas.vistos(sc)).map(v => v.t.name);
    T.App.viewer = 'p2'; out.p2 = T.Rondas.vistos(sc).length;
    T.App.viewer = 'p1'; T.Render.request();
    return out;
  });
  ok(j(vistos.p1) === j(['tg']) && vistos.p2 === 0, 'na tela do jogador: só o Dalmo vê o cone (' + j(vistos) + ')');
  await w(400);
  if (process.env.FOTOS) await page.screenshot({ path: process.env.FOTOS + '/gver-jogador.png' });

  const inesperados = t.errs.filter(e => !/favicon/.test(e));
  ok(!inesperados.length, 'sem erros no console: ' + inesperados.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
