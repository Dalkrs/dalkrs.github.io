// No navegador: uma barra comum de token que o mestre deixa ficar negativa (opções da barra → "Negativa até −"),
// o valor negativo na faixa e no painel, o desenho no mapa, e a cura total.
const { open } = require('./lib');
(async () => {
  let fails = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
  const t = await open({ w: 1280, h: 800 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  const id = await ev(() => { const u = __urgm, tk = u.Store.scene().tokens.find(x => x.name === 'Dain X'); u.setSel([{ c: 'tokens', id: tk.id }]); u.UI.openTab('sel'); return tk.id; });
  await w(300);
  const barra = () => ev(id => { const b = __urgm.Store.get('tokens', id).bars[0]; return { n: b.n, v: b.v, m: b.m, lo: b.lo || 0 }; }, id);
  const b0 = await barra();
  ok(b0.n === 'Vida' && b0.lo === 0, 'a barra de fábrica não fica negativa: ' + JSON.stringify(b0));
  await page.locator('#hud-b0').fill('-999'); await page.locator('#hud-b0').press('Enter'); await w(250);
  ok((await barra()).v === 0, 'sem piso, um dano enorme para em zero');
  // o mestre abre as opções da barra e deixa que ela vá até −15
  await page.locator('#tk-b0-more').click(); await w(200);
  ok(await page.locator('#tk-b0-lo').isVisible(), 'nas opções da barra há o campo "Negativa até −"');
  await page.locator('#tk-b0-lo').fill('15'); await page.locator('#tk-b0-lo').press('Tab'); await w(250);
  ok((await barra()).lo === 15, 'o piso fica guardado na barra');
  await page.locator('#hud-b0').fill('-8'); await page.locator('#hud-b0').press('Enter'); await w(250);
  ok((await barra()).v === -8, 'agora o dano passa de zero (0 − 8 = −8)');
  ok(await page.locator('#hud-b0').evaluate(e => e.classList.contains('neg') && e.value === '-8') && await page.locator('#tk-b0-v').evaluate(e => e.classList.contains('neg')), 'a faixa e o painel mostram o valor negativo em destaque');
  await page.locator('#hud-b0').fill('-50'); await page.locator('#hud-b0').press('Enter'); await w(250);
  ok((await barra()).v === -15, 'e para no piso (−15)');
  // no mapa, a parte negativa é desenhada (riscada, na cor de aviso): procura a cor nos pixels da barra do token
  await ev(id => { const u = __urgm; u.App.view.z = 2.2; const tk = u.Store.get('tokens', id), sc = u.Store.scene(); u.App.view.x = tk.x - 200; u.App.view.y = tk.y - 200; u.Render.request(); }, id);
  await w(500);
  const pintado = await ev(id => {
    const u = __urgm, tk = u.Store.get('tokens', id), cv = u.Render.cv, cx = cv.getContext('2d');
    const [x0, y0] = u.Render.toScreen(tk.x, tk.y - 40), [x1, y1] = u.Render.toScreen(tk.x + tk.size * u.Store.scene().cell, tk.y);
    const k = cv.width / cv.getBoundingClientRect().width;
    const d = cx.getImageData(Math.round(x0 * k), Math.round(y0 * k), Math.max(1, Math.round((x1 - x0) * k)), Math.max(1, Math.round((y1 - y0) * k))).data;
    let rosa = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 60 && d[i + 1] < 130 && d[i + 2] > 80 && d[i + 2] < 150) rosa++;
    return rosa;
  }, id);
  ok(pintado > 20, 'no mapa, a barra abaixo de zero tem a parte negativa desenhada (' + pintado + ' pixels na cor de aviso)');
  if (process.env.FOTOS) await page.screenshot({ path: process.env.FOTOS + '/negativa-mapa.png' });
  // cura total: enche
  await ev(id => { __urgm.Act.fullHeal([__urgm.Store.get('tokens', id)]); }, id); await w(250);
  const b1 = await barra();
  ok(b1.v === b1.m && !(await page.locator('#hud-b0').evaluate(e => e.classList.contains('neg'))), 'a cura total enche a barra que estava negativa');
  await ev(() => __urgm.Tools.undo()); await w(250);
  ok((await barra()).v === -15, 'e Desfazer devolve o valor negativo');
  // tirar o piso com a barra negativa: ela volta para zero
  await page.locator('#tk-b0-lo').fill('0'); await page.locator('#tk-b0-lo').press('Tab'); await w(250);
  const b2 = await barra();
  ok(b2.lo === 0 && b2.v === 0, 'tirando o piso, a barra negativa volta para zero: ' + JSON.stringify(b2));
  ok(t.errs.length === 0, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `\n${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
