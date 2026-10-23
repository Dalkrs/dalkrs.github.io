// Bateria do lote 23 nas Cenas (no navegador, sem o site): o botão direito nunca abre o menu do navegador.
//   · no Windows, o navegador pede o menu dele DEPOIS de soltar o botão — quando o menu das Cenas já está aberto embaixo
//     do cursor; o pedido que cai no menu, num aviso ou em qualquer lugar do mapa é barrado;
//   · os campos de texto continuam com o menu do navegador (copiar, colar).
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 160);
  // o pedido de menu do navegador, como o Windows manda (depois de soltar): devolve se foi barrado
  const pedir = sel => ev(sel => { const el = document.querySelector(sel); if (!el) return 'sem ' + sel; const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }); el.dispatchEvent(e); return e.defaultPrevented; }, sel);
  const box = await page.locator('#cv').boundingBox();
  const x = box.x + box.width - 30, y = box.y + box.height - 30;      // (perto do canto: o menu sobe e fica embaixo do cursor)
  await page.mouse.click(x, y, { button: 'right' }); await w(300);
  ok(await page.locator('.menu').count() === 1, 'o botão direito no mapa abre o menu das Cenas');
  const embaixo = await ev(([x, y]) => { const el = document.elementFromPoint(x, y); return el && el.closest('.menu') ? 'menu' : el.tagName; }, [x, y]);
  ok(embaixo === 'menu', '(perto do canto, o menu das Cenas fica embaixo do cursor: ' + embaixo + ')');
  ok(await pedir('.menu') === true && await pedir('.menu .menu-i') === true, 'o pedido do navegador que cai no menu das Cenas é barrado (o menu do navegador não abre)');
  ok(await pedir('#cv') === true, 'no mapa, barrado');
  await ev(() => __tc.UI.toast('Aviso de teste')); await w(100);
  ok(await pedir('#toasts .toast') === true && await pedir('#status') === true, 'num aviso ou na barra de baixo, também');
  await page.keyboard.press('Escape'); await w(100);
  ok(await pedir('#side input, #side textarea') === false, 'num campo de texto do painel, o menu do navegador continua (copiar, colar)');
  if (t.errs.length) console.log(t.errs.slice(0, 5).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
