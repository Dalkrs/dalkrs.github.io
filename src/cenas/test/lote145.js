// Bateria do lote 145 (as Cenas): a atenção de vários guardas de uma vez. Com vários selecionados, o bloco "Guardas
// (N)" muda o estado de todos e os faz olhar para um ponto (um clique no mapa); no painel Mestre > Rondas, os botões
// para todos os guardas da cena (calmos, desconfiados, em alerta, olhar para um ponto).
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const j = JSON.stringify;
(async () => {
  const t = await open({ w: 1440, h: 900 });
  const { page } = t, ev = (fn, a) => page.evaluate(fn, a), w = ms => page.waitForTimeout(ms || 200);
  const ids = await ev(() => {
    const T = __tc, S = T.Store, sc = T.newScene('Guardas'); sc.cols = 20; sc.rows = 14; T.normalizeScene(sc); S.addScene(sc); T.UI.switchScene(sc.id);
    const mk = (nome, x, y, ronda) => { const k = T.newToken(S.scene(), x * 64, y * 64, { name: nome }); if (ronda) k.ronda = T.Rondas.novaRonda({ dir: 0 }); return k; };
    const a = mk('Guarda A', 2, 2, 1), b = mk('Guarda B', 10, 2, 1), c = mk('Guarda C', 2, 10, 1), herói = mk('Herói', 6, 6, 0);
    S.tx('t', () => [a, b, c, herói].forEach(k => S.add('tokens', k)));
    T.Render.fit(); T.UI.openTab('sel');
    return { a: a.id, b: b.id, c: c.id, h: herói.id };
  });
  const est = () => ev(ids => ['a', 'b', 'c'].map(k => __tc.Rondas.estadoDe(__tc.Store.get('tokens', ids[k]))), ids);
  const dirs = () => ev(ids => ['a', 'b', 'c'].map(k => __tc.Store.get('tokens', ids[k]).ronda.dir), ids);
  const tela = (x, y) => ev(([x, y]) => { const r = document.getElementById('cv').getBoundingClientRect(), v = __tc.App.view; return [r.left + (x - v.x) * v.z, r.top + (y - v.y) * v.z]; }, [x, y]);

  // dois guardas e o herói selecionados: o bloco "Guardas (2)"
  await ev(ids => __tc.setSel([{ c: 'tokens', id: ids.a }, { c: 'tokens', id: ids.b }, { c: 'tokens', id: ids.h }]), ids); await w(300);
  ok(await page.locator('#s-guardas').count() === 1 && /Guardas \(2\)/i.test(await page.locator('#s-guardas').innerText()) && /Só os guardas \(2 de 3/.test(await page.locator('#s-guardas').innerText()), 'com vários selecionados, o bloco "Guardas (2)" (o herói fica de fora) — ' + j(await page.locator('#s-guardas').innerText().catch(() => '?')));
  await page.locator('#mt-alerta button', { hasText: 'Desconfiado' }).click(); await w(250);
  ok(j(await est()) === j(['desconfiado', 'desconfiado', 'calmo']), 'o estado muda nos dois selecionados, e só neles — ' + j(await est()));
  await page.locator('#mt-alerta button', { hasText: 'Alerta' }).click(); await w(250);
  ok(j(await est()) === j(['alerta', 'alerta', 'calmo']), 'e de novo, para Alerta');
  // olhar para um ponto: os dois viram para (6,10) em quadrados
  await page.locator('#mt-olhar').click(); await w(200);
  ok(await ev(() => __tc.App.tool) === 'olhar', 'o "Olhar para um ponto" pede o clique no mapa');
  { const [x, y] = await tela(6 * 64 + 32, 10 * 64 + 32); await page.mouse.move(x, y); await w(80); await page.mouse.down(); await page.mouse.up(); await w(250); }
  const d1 = await dirs();
  const esperado = ([gx, gy]) => ((Math.round(Math.atan2((10 * 64 + 32) - (gy * 64 + 32), (6 * 64 + 32) - (gx * 64 + 32)) * 180 / Math.PI) % 360) + 360) % 360;
  ok(d1[0] === esperado([2, 2]) && d1[1] === esperado([10, 2]) && d1[2] === 0 && await ev(() => __tc.App.tool) === 'select', 'os dois olham para o ponto; o terceiro não — ' + j(d1));
  ok(await ev(ids => { const T = __tc, sc = T.Store.scene(), g = T.Store.get('tokens', ids.a); const c = T.Rondas.cone(g, sc); return !!c && T.Rondas.noCone(c, 6 * 64 + 32, 10 * 64 + 32); }, ids), 'o ponto cai dentro do cone de quem olhou');
  await page.keyboard.press('Control+z'); await w(200);
  ok(j(await dirs()) === j([0, 0, 0]), 'Ctrl+Z desfaz o olhar');

  // o painel do Mestre: todos da cena
  await ev(() => { __tc.setSel([]); }); await w(150);
  await page.locator('#mt-rail-mestre').click(); await w(200);
  await page.locator('#mt-rail-rondas').click(); await w(300);
  ok(await page.locator('#mtp-calmo').count() === 1 && await page.locator('#mtp-desconf').count() === 1 && await page.locator('#mtp-alerta').count() === 1 && await page.locator('#mtp-olhar').count() === 1, 'no Mestre > Rondas: Todos calmos, Todos desconfiados, Todos em alerta e Todos olham para um ponto');
  const mtp = async id => { if (await page.locator('#' + id).count() === 0) { await page.locator('#mt-rail-mestre').click(); await w(150); await page.locator('#mt-rail-rondas').click(); await w(250); } await page.locator('#' + id).click(); await w(250); };
  await mtp('mtp-desconf');
  ok(j(await est()) === j(['desconfiado', 'desconfiado', 'desconfiado']), 'Todos desconfiados: os três');
  await mtp('mtp-calmo');
  ok(j(await est()) === j(['calmo', 'calmo', 'calmo']), 'Todos calmos: os três');
  // mesmo com alguém selecionado, o "Todos" é todos
  await ev(ids => __tc.setSel([{ c: 'tokens', id: ids.a }]), ids); await w(150);
  await ev(() => document.getElementById('mtp-alerta') ? document.getElementById('mtp-alerta').click() : null); await w(250);
  if (await page.locator('#mtp-alerta').count() === 0) { await page.locator('#mt-rail-mestre').click(); await w(150); await page.locator('#mt-rail-rondas').click(); await w(250); await page.locator('#mtp-alerta').click(); await w(250); }
  ok(j(await est()) === j(['alerta', 'alerta', 'alerta']), 'Todos em alerta: os três, mesmo com um selecionado');
  await ev(() => __tc.setSel([])); await w(100);
  if (await page.locator('#mtp-olhar').count() === 0) { await page.locator('#mt-rail-mestre').click(); await w(150); await page.locator('#mt-rail-rondas').click(); await w(250); }
  await page.locator('#mtp-olhar').click(); await w(200);
  { const [x, y] = await tela(15 * 64, 12 * 64); await page.mouse.move(x, y); await w(80); await page.mouse.down(); await page.mouse.up(); await w(250); }
  const d2 = await dirs();
  ok(d2.every(x => x > 0 && x < 90), 'Todos olham para um ponto: os três viram para lá — ' + j(d2));
  // Esc cancela
  await ev(() => __tc.Rondas.olharNoMapa(null)); await w(100);
  await page.keyboard.press('Escape'); await w(150);
  ok(await ev(() => __tc.App.tool) === 'select' && j(await dirs()) === j(d2), 'Esc cancela sem mexer em ninguém');
  const errs = t.errs.filter(e => !/favicon/.test(e));
  ok(!errs.length, 'sem erros no console: ' + errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
