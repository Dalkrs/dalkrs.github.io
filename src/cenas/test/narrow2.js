// Largura de celular (400 px): nada pode empurrar a página para os lados; janelas novas e tutorial cabem na tela.
const { open } = require('./lib');
(async () => {
  let fails = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
  for (const theme of ['dark', 'light']) {
    const t = await open({ w: 400, h: 780, theme, query: '&tour', wait: 1500 });
    const { page } = t;
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const w = ms => page.waitForTimeout(ms || 300);
    const fits = () => ev(() => ({ page: document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth, modal: (() => { const m = document.querySelector('.modal'); return !m || (m.scrollWidth <= m.clientWidth + 1 && m.getBoundingClientRect().right <= innerWidth && m.getBoundingClientRect().left >= 0); })() }));
    const cardIn = () => ev(() => { const c = document.querySelector('.tour-card').getBoundingClientRect(); return c.left >= 0 && c.top >= 0 && c.right <= innerWidth && c.bottom <= innerHeight; });
    for (let i = 0; i <= 5; i++) { await w(420); ok(await cardIn() && (await fits()).page, `${theme}: tutorial passo ${i} cabe em 400 px`); if (i === 3) await page.screenshot({ path: `v2/n-${theme}-tour3.png` }); await page.locator('#tour-next').click(); }
    await w();
    await ev(() => { const u = __urgm; u.setSel([{ c: 'tokens', id: u.Store.scene().tokens[0].id }]); u.UI.barDefaultsBox(u.Store.scene().tokens[0]); }); await w();
    await page.locator('#bd-copy').click(); await w();
    let f = await fits(); ok(f.page && f.modal, `${theme}: janela de barras padrão cabe em 400 px ` + JSON.stringify(f));
    await page.screenshot({ path: `v2/n-${theme}-barras.png` });
    await page.keyboard.press('Escape');
    await ev(() => __urgm.UI.areaBox('Aplicar a 7 tokens', __urgm.Store.scene().tokens, null)); await w();
    await page.locator('#ar-amt').fill('15'); await w(150);
    f = await fits(); ok(f.page && f.modal, `${theme}: janela de área cabe em 400 px ` + JSON.stringify(f));
    await page.screenshot({ path: `v2/n-${theme}-area.png` });
    await page.keyboard.press('Escape');
    await ev(() => __urgm.UI.condPicker([__urgm.Store.scene().tokens.find(t => t.name === 'Bandido')])); await w();
    f = await fits(); ok(f.page && f.modal, `${theme}: janela de condições cabe em 400 px ` + JSON.stringify(f));
    await page.screenshot({ path: `v2/n-${theme}-cond.png` });
    await page.keyboard.press('Escape');
    await ev(() => { __urgm.Act.turnStep(1); }); await w();
    f = await fits();
    const tb = await ev(() => { const b = document.getElementById('turnb').getBoundingClientRect(); return !document.getElementById('turnb').hidden && b.left >= 0 && b.right <= innerWidth; });
    ok(f.page && tb, `${theme}: faixa de vez cabe em 400 px`);
    await page.screenshot({ path: `v2/n-${theme}-mapa.png` });
    await ev(() => { __urgm.UI.openTab('sel'); }); await w();
    f = await fits(); ok(f.page, `${theme}: painel aberto não empurra a página`);
    await page.screenshot({ path: `v2/n-${theme}-painel.png` });
    if (t.errs.length) { console.log('ERROS:\n' + t.errs.join('\n')); fails += t.errs.length; }
    await t.close();
  }
  console.log(fails ? `\n${fails} falha(s) em ${n} verificações` : `\n${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
