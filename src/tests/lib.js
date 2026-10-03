// Apoio aos testes do site: serve a raiz do repositório (como o GitHub Pages) e abre páginas no Chromium.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = (() => { for (const p of ['playwright', '/opt/node-tools/node_modules/playwright', '/opt/npm-tools/node_modules/playwright']) { try { return require(p); } catch (e) { /* tenta o próximo */ } } throw new Error('Playwright não encontrado'); })();
const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((rq, rs) => {
      let p = decodeURIComponent(rq.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT)) { rs.writeHead(403); rs.end(); return; }
      fs.stat(f, (e, st) => {
        if (!e && st.isDirectory()) { rs.writeHead(301, { location: rq.url.split('?')[0] + '/' }); rs.end(); return; }
        fs.readFile(f, (err, data) => {
          if (err) { rs.writeHead(404); rs.end('não encontrado'); return; }
          rs.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
          rs.end(data);
        });
      });
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

// Abre um contexto de navegador. Cada contexto é um "aparelho" separado (armazenamento próprio).
async function start(opt = {}) {
  const srv = await serve();
  // opt.net: os testes falam com o Supabase de verdade, pelo proxy do ambiente
  const proxy = opt.net ? (process.env.HTTPS_PROXY || process.env.https_proxy) : null;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: '127.0.0.1,localhost' } } : {});
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const errs = [];
  async function device(o = {}) {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: !!opt.net, viewport: { width: o.w || 1440, height: o.h || 900 }, colorScheme: o.theme || 'dark', acceptDownloads: true });
    // Com o proxy ligado, o Chromium manda até o endereço local por ele; então os arquivos locais são entregues daqui mesmo.
    if (opt.net) await ctx.route(base + '**', route => {
      let p = decodeURIComponent(new URL(route.request().url()).pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, body: 'não encontrado' });
      route.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    });
    if (o.seed) await ctx.addInitScript(seed => { try { for (const k in seed) if (localStorage.getItem(k) === null) localStorage.setItem(k, seed[k]); } catch (e) {} }, o.seed);
    const page = await ctx.newPage();
    const tag = o.name || 'pg';
    // o proxy deste ambiente não aceita WebSocket: o tempo real do Supabase falha aqui (e a leitura periódica assume)
    const IGNORE = /Failed to load resource: net::ERR_(FAILED|INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|CERT_AUTHORITY_INVALID|TUNNEL_CONNECTION_FAILED|PROXY_CONNECTION_FAILED)|fonts\.g(oogleapis|static)\.com|WebSocket connection to 'wss:\/\/[a-z]+\.supabase\.co/;
    page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !IGNORE.test(m.text())) errs.push(`[${tag}] [${m.type()}] ${m.text()}`); });
    page.on('pageerror', e => errs.push(`[${tag}] [pageerror] ${e.message}`));
    return { ctx, page };
  }
  return { base, browser, errs, device, close: async () => { await browser.close(); srv.close(); } };
}

function checker() {
  let n = 0, bad = 0;
  const ok = (c, msg) => { n++; if (!c) { bad++; console.log('FALHOU: ' + msg); } };
  const end = () => { console.log(bad ? `${n - bad} verificações passaram, ${bad} falharam` : `${n} verificações passaram`); process.exit(bad ? 1 : 0); };
  return { ok, end };
}
module.exports = { start, checker, ROOT };
