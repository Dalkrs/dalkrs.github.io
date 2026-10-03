// Apoio aos testes no navegador: sobe um servidor local e abre a página.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');

// root: a pasta servida (padrão: esta, a dos testes). Endereço terminado em "/" entrega o index.html da pasta,
// como um servidor de site faz.
function serve(root) {
  return new Promise(res => {
    const srv = http.createServer((rq, rs) => {
      let f = path.join(root || __dirname, decodeURIComponent(rq.url.split('?')[0]));
      if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
      fs.readFile(f, (err, data) => {
        if (err) { rs.writeHead(404); rs.end('x'); return; }
        rs.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
        rs.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

// opt.root + opt.file abrem outra página que não a de teste (ex.: a página do site, servida a partir da raiz do
// repositório); opt.debug === false abre sem ?debug, como um visitante.
async function open(opt = {}) {
  const srv = await serve(opt.root);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: opt.w || 1440, height: opt.h || 900 }, colorScheme: opt.theme || 'dark', deviceScaleFactor: opt.dpr || 1, reducedMotion: opt.reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => errs.push('[pageerror] ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const url = `${base}${opt.file || 'page.html'}${opt.debug === false ? (opt.query || '').replace(/^&/, '?') : '?debug' + (opt.query || '')}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(opt.wait || 900);
  return { page, ctx, browser, errs, url, base, close: async () => { await browser.close(); srv.close(); } };
}
module.exports = { open };
