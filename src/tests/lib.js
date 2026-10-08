// Apoio aos testes do site: serve a raiz do repositório (como o GitHub Pages) e abre páginas no Chromium.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = (() => { for (const p of ['playwright', '/opt/node-tools/node_modules/playwright', '/opt/npm-tools/node_modules/playwright']) { try { return require(p); } catch (e) { /* tenta o próximo */ } } throw new Error('Playwright não encontrado'); })();
const ROOT = path.join(__dirname, '..', '..');
/* TC_LOCAL=https://127.0.0.1:54331 — os testes "de rede" falam com o banco local de ensaio (src/tests/local) em vez do
   projeto de verdade: a página recebe um tc/config.js que aponta para ele, e nada sai para a rede de fora. */
const LOCAL = (process.env.TC_LOCAL || '').replace(/\/$/, '') || null;
// o endereço do banco com que os testes de rede falam: o local, ou o do projeto (o que está em tc/config.js)
const BANCO = LOCAL || (/url:\s*'([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'tc', 'config.js'), 'utf8')) || [])[1];
const CONFIG_LOCAL = () => Buffer.from(`// (testes: banco local de ensaio)\nwindow.TC_CONFIG = { url: ${JSON.stringify(LOCAL)}, chave: 'chave-publica-do-banco-local' };\n`);
// o arquivo que a página pediu (com o banco local, o endereço do banco é o dele)
const ler = (f, p) => (LOCAL && p === '/tc/config.js' ? CONFIG_LOCAL() : fs.readFileSync(f));
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
          rs.end(LOCAL && p === '/tc/config.js' ? CONFIG_LOCAL() : data);
        });
      });
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

// Abre um contexto de navegador. Cada contexto é um "aparelho" separado (armazenamento próprio).
async function start(opt = {}) {
  const srv = await serve();
  // opt.net: os testes falam com o Supabase de verdade, pelo proxy do ambiente (ou, com TC_LOCAL, com o banco local: sem proxy)
  const proxy = opt.net && !LOCAL ? (process.env.HTTPS_PROXY || process.env.https_proxy) : null;
  // (com o banco local, a página — servida daqui — fala com outro endereço desta mesma máquina: o navegador novo pede
  //  uma permissão para isso, que num teste ninguém dá; a conferência fica desligada só nesse caso)
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: '127.0.0.1,localhost' } } : opt.net && LOCAL ? { args: ['--disable-features=LocalNetworkAccessChecks'] } : {});
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const errs = [], ruins = [], saidas = [];          // saidas: quem recebeu do navegador o "Sair da página?"
  async function device(o = {}) {
    // (o.toque: um aparelho de tela de toque — o toque chega à página como chega num celular)
    const ctx = await browser.newContext({ ignoreHTTPSErrors: !!opt.net, viewport: { width: o.w || 1440, height: o.h || 900 }, colorScheme: o.theme || 'dark', acceptDownloads: true, hasTouch: !!o.toque });
    // Com o proxy ligado, o Chromium manda até o endereço local por ele; então os arquivos locais são entregues daqui mesmo.
    if (opt.net) await ctx.route(base + '**', route => {
      let p = decodeURIComponent(new URL(route.request().url()).pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, body: 'não encontrado' });
      route.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: ler(f, p) });
    });
    if (o.seed) await ctx.addInitScript(seed => { try { for (const k in seed) if (localStorage.getItem(k) === null) localStorage.setItem(k, seed[k]); } catch (e) {} }, o.seed);
    /* Texto solto que denuncia um valor vazio escrito na tela: "null", "undefined", "NaN" ou "[object Object]" como o
       texto inteiro de um pedaço da página (é o que o navegador escreve quando um desses vai parar num append). Fica
       conferindo o tempo todo, em toda página e moldura que o teste abrir; quem acha avisa pelo console — e os testes
       não aceitam erro no console. (o.soltos === false desliga, para o teste que escreve um desses de propósito;
       TC_SEM_SOLTOS=1 desliga em tudo — para rodar os testes contra uma versão antiga do site, que ainda os tinha.) */
    if (o.soltos !== false && !process.env.TC_SEM_SOLTOS) await ctx.addInitScript(() => {
      const vistos = new Set();
      const olhar = () => {
        if (!document.body) return;
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
        while ((n = w.nextNode())) {
          const x = n.nodeValue.trim();
          if (x !== 'null' && x !== 'undefined' && x !== 'NaN' && x !== '[object Object]') continue;
          const e = n.parentElement; if (!e || e.closest('script,style,textarea')) continue;
          const onde = '<' + e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : '') + '>';
          if (vistos.has(x + onde)) continue; vistos.add(x + onde);
          console.error('texto solto na tela: "' + x + '" em ' + onde + ' — ' + location.pathname);
        }
      };
      setInterval(olhar, 700);
    });
    const page = await ctx.newPage();
    const tag = o.name || 'pg';
    // o proxy deste ambiente não aceita WebSocket: o tempo real do Supabase falha aqui (e a leitura periódica assume)
    const IGNORE = /Failed to load resource: net::ERR_(FAILED|INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|CERT_AUTHORITY_INVALID|TUNNEL_CONNECTION_FAILED|PROXY_CONNECTION_FAILED)|fonts\.g(oogleapis|static)\.com|WebSocket connection to 'wss:\/\/[a-z]+\.supabase\.co|WebSocket connection to 'wss?:\/\/127\.0\.0\.1:\d+\/realtime|Access to fetch at 'https:\/\/[a-z]+\.supabase\.co\/[^']*' from origin '[^']*' has been blocked by CORS policy: No 'Access-Control-Allow-Origin'/;      // (o último: uma resposta de erro do proxy, que vem sem os cabeçalhos; o programa tenta de novo sozinho)
    page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !IGNORE.test(m.text())) errs.push(`[${tag}] [${m.type()}] ${m.text()}`); });
    page.on('pageerror', e => errs.push(`[${tag}] [pageerror] ${e.message}`));
    // "Sair da página?" (há algo ainda subindo para a mesa): nos testes, a resposta é sempre sair.
    // As outras janelas do navegador continuam como sem este ouvinte: recusadas — a não ser que o próprio teste
    // tenha posto um ouvinte para responder (aí é ele quem responde).
    page.on('dialog', d => {
      if (d.type() === 'beforeunload') { saidas.push(tag); d.accept().catch(() => {}); }
      else if (page.listenerCount('dialog') <= 1) d.dismiss().catch(() => {});
    });
    // as respostas de erro, com o método e o caminho: o console só diz "status of 403", sem dizer de quê
    page.on('response', r => { if (r.status() >= 400) { let u; try { u = new URL(r.url()); } catch (e) { return; } ruins.push(`[${tag}] ${r.status()} ${r.request().method()} ${u.pathname}${u.search.replace(/(apikey|token|code)=[^&]*/g, '$1=…').slice(0, 160)}`); } });
    return { ctx, page };
  }
  return { base, browser, errs, ruins, saidas, device, close: async () => { await browser.close(); srv.close(); } };
}

/* Deixa em window.__sb o cliente do banco que a página criar (a casca não o expõe). Serve para um teste fazer chegar
   um aviso em tempo real do jeito que o banco manda — neste ambiente o tempo real de verdade não liga. Chamar antes
   de a página ser aberta. */
async function espiarBanco(ctx) {
  await ctx.addInitScript(() => {
    let lib;
    try {
      Object.defineProperty(window, 'supabase', { configurable: true, enumerable: true, get() { return lib; },
        set(v) {
          lib = v;
          if (v && typeof v.createClient === 'function' && !v.__espiado) { const criar = v.createClient; v.createClient = function () { return (window.__sb = criar.apply(this, arguments)); }; v.__espiado = true; }
        } });
    } catch (e) { /* sem espiar: o teste que precisar disso avisa */ }
  });
}

function checker() {
  let n = 0, bad = 0;
  const ok = (c, msg) => { n++; if (!c) { bad++; console.log('FALHOU: ' + msg); } };
  const end = () => { console.log(bad ? `${n - bad} verificações passaram, ${bad} falharam` : `${n} verificações passaram`); process.exit(bad ? 1 : 0); };
  return { ok, end };
}
module.exports = { start, checker, espiarBanco, ROOT, LOCAL, BANCO };
