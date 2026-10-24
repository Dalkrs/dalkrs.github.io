// Apoio aos testes no navegador: sobe um servidor local e abre a página.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = (() => { for (const p of ['playwright', '/opt/node-tools/node_modules/playwright', '/opt/npm-tools/node_modules/playwright']) { try { return require(p); } catch (e) { /* tenta o próximo */ } } throw new Error('Playwright não encontrado'); })();

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
// (lote 14, parte 14c) A janela "Gerar um lugar" começa com os arredores em Médio; os testes de antes dos arredores
// conferem o lugar sozinho, então a página abre com eles em Nenhum (também depois de recarregar) — opt.arredores === true
// deixa como o mestre encontra (o Médio de começo).
async function open(opt = {}) {
  const srv = await serve(opt.root);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: opt.w || 1440, height: opt.h || 900 }, colorScheme: opt.theme || 'dark', deviceScaleFactor: opt.dpr || 1, reducedMotion: opt.reduce ? 'reduce' : 'no-preference' });
  // o tema do site (tc/tema.js) é escuro por padrão; nos testes ele segue o aparelho (opt.theme)
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('tinycats:tema')) localStorage.setItem('tinycats:tema', 'aparelho'); } catch (e) { /* página sem armazenamento */ } });
  // (lote 26) os blocos do painel e a lista de condições começam abertos nos testes (opt.fechado: como o mestre encontra)
  if (!opt.fechado) await ctx.addInitScript(() => { try { localStorage.setItem('tinycats:testes-tudo-aberto', '1'); } catch (e) { /* página sem armazenamento */ } });
  // (lote 15) opt.init: um código que roda antes da página (por exemplo, um site de mentira em window.TC)
  if (opt.init) await ctx.addInitScript({ content: opt.init });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => errs.push('[pageerror] ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const url = `${base}${opt.file || 'page.html'}${opt.debug === false ? (opt.query || '').replace(/^&/, '?') : '?debug' + (opt.query || '')}`;
  if (opt.arredores !== true) {
    const semArredores = () => page.evaluate(() => { try { if (window.__tc && __tc.App && __tc.App.opt && __tc.App.opt.genArr == null) __tc.App.opt.genArr = 'nenhum'; } catch (e) { /* (a página sem as Cenas) */ } }).catch(() => {});
    page.on('load', semArredores);
  }
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(opt.wait || 900);
  // (lote 22) a tela das barrinhas abre sozinha na vez de cada um: nos testes de antes, desligada (opt.barrinhas: a de começo)
  if (!opt.barrinhas) await page.evaluate(() => { try { if (window.__tc && __tc.Store) __tc.Store.S.prefs.barrinhas = { combate: false, rodada: false, vez: false }; } catch (e) { /* (a página sem as Cenas) */ } }).catch(() => {});
  if (opt.arredores !== true) await page.evaluate(() => { try { if (window.__tc && __tc.App && __tc.App.opt && __tc.App.opt.genArr == null) __tc.App.opt.genArr = 'nenhum'; } catch (e) { /* (a página sem as Cenas) */ } }).catch(() => {});
  return { page, ctx, browser, errs, url, base, close: async () => { await browser.close(); srv.close(); } };
}
module.exports = { open };
