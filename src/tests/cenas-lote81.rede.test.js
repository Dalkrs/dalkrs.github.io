// Lote 81 numa mesa de verdade: o fundo grande (7680 × 5120, WebP) sobe para o Storage como veio — o arquivo lá tem o
// tamanho do enviado — e a cena guarda w: 7680, h: 5120; o jogador recebe a mesma imagem na cena no ar.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' };
  const M = (await t.device({ name: 'mestre', seed })).page, J = (await t.device({ name: 'jogador', seed })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(250); } };
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cenas L81 E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    await M.locator('#tab-cenas').click();
    let C = null, B = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && !!__tc.Store.scene()); }), '(as Cenas do mestre)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
    const r = await C.evaluate(() => new Promise(ok => {
      const cv = document.createElement('canvas'); cv.width = 7680; cv.height = 5120; const x = cv.getContext('2d');
      for (let i = 0; i < 3000; i++) { x.fillStyle = `hsl(${i * 37 % 360},60%,${30 + i % 40}%)`; x.fillRect((i * 997) % 7680, (i * 613) % 5120, 90, 90); }
      cv.toBlob(async b => {
        const f = new File([b], 'fortaleza.webp', { type: 'image/webp' });
        const a = await __tc.Assets.fromFile(f, 'bg');
        __tc.Store.tx('Fundo', () => __tc.Store.scn({ cols: 120, rows: 80, cell: 64, bg: { asset: a.id, stretch: true, dx: 0, dy: 0, scale: 1 } }));
        ok({ size: f.size, url: a.url, w: a.w, h: a.h });
      }, 'image/webp', 0.95);
    }));
    ok(/^https:\/\//.test(r.url) && r.w === 7680 && r.h === 5120, 'o fundo sobe para o Storage da mesa com 7680 × 5120: ' + JSON.stringify({ w: r.w, h: r.h, kb: Math.round(r.size / 1024) }));
    const tam = await M.evaluate(async u => { const res = await fetch(u); return (await res.arrayBuffer()).byteLength; }, r.url);
    ok(tam === r.size, 'o arquivo no Storage tem o tamanho do enviado (' + tam + ' = ' + r.size + ' bytes)');
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(600);
    await J.locator('#tab-cenas').click();
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(u => { const s = __tc.Store.scene(), a = s && s.bg.asset && __tc.Store.S.assets[s.bg.asset]; return !!a && a.url === u && a.w === 7680 && s.cols === 120; }, r.url); }, 30000), 'o jogador recebe a cena com o mesmo fundo (7680 × 5120, 120 × 80 quadrados)');
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally { if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('mesa: ' + e.message); } } }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)|Multiple GoTrueClient/i.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
