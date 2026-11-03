// Lote 72: a cor e o desenho de cada número do resumo da ficha (sem mesa): os cinco atributos, os quatro subatributos
// e as três defesas, cada um com o seu desenho e a sua cor.
const { start, checker } = require('./lib');
const { ok, end } = checker();
(async () => {
  const t = await start();
  const d = await t.device({ name: 'ficha', w: 1300, h: 900, jogando: true, fechado: true });
  const P = d.page;
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await P.waitForTimeout(1500);
  const r = await P.evaluate(() => [...document.querySelectorAll('#resumo .rscor')].map(el => ({ ico: !!el.querySelector('svg.rsico'), cor: getComputedStyle(el).getPropertyValue('--cn').trim(), nome: el.querySelector('.rsnm').textContent.trim() })));
  ok(r.length === 12, 'doze números com cor: ' + r.map(x => x.nome).join(', '));
  ok(r.every(x => x.ico), 'cada um com o seu desenho');
  ok(new Set(r.map(x => x.cor)).size === 12, 'e cada um com a sua cor: ' + r.map(x => x.cor).join(' '));
  ok(t.errs.length === 0, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
