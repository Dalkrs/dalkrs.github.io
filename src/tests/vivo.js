// Confere o site NO AR (pelo proxy do ambiente). Uso: node vivo.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy } } : {});
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('[pageerror] ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
  const url = (process.argv[2] || 'https://dalkrs.github.io/') + '?t=' + Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500);
  const out = { titulo: await page.title(), abas: await page.locator('.tab').allInnerTexts() };
  for (const id of ['cenas', 'fichas', 'arvore', 'rolador']) {
    await page.locator('#tab-' + id).click(); await page.waitForTimeout(2200);
    const f = page.frame({ url: new RegExp('/' + id + '/') });
    out[id] = f ? await f.title() : 'SEM MOLDURA';
  }
  await page.screenshot({ path: 'shot-vivo.png' });
  console.log(JSON.stringify(out, null, 1));
  console.log(errs.length ? 'ERROS:\n' + errs.join('\n') : 'sem erros no console');
  await browser.close();
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
