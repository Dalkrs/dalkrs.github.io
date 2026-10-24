// Bateria do lote 23 nas Cenas (no navegador, sem o site): o botão direito nunca abre o menu do navegador.
//   · no Windows, o navegador pede o menu dele DEPOIS de soltar o botão — quando o menu das Cenas já está aberto embaixo
//     do cursor; o pedido que cai no menu, num aviso ou em qualquer lugar do mapa é barrado;
//   · os campos de texto continuam com o menu do navegador (copiar, colar);
//   · as letras de atalho (N, K, F…) não caem escritas no campo da janela que elas abrem (o N com a tela das barrinhas).
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ barrinhas: true });
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
  // ---------- a letra do atalho não cai no campo da janela que ela abre ----------
  await ev(() => {
    const { Store, newToken, Act } = __tc, sc = Store.scene(), c = sc.cell, bar = v => [{ n: 'HP', c: '#d34a4a', v, m: v, k: 'bar', on: true, vis: '' }];
    Store.tx('t', () => { Store.add('tokens', newToken(sc, 2 * c, 2 * c, { id: 'tk_a', name: 'Ana', bars: bar(30) })); Store.add('tokens', newToken(sc, 4 * c, 2 * c, { id: 'tk_b', name: 'Beto', bars: bar(20) })); });
    Act.turnAdd(['tk_a', 'tk_b'].map(id => Store.get('tokens', id))); Act.turnPatch(x => { x.list[0].init = 15; x.list[1].init = 10; }, 'ini');
  });
  await ev(() => __tc.UI.openTab('turn')); await w(200);
  await page.locator('#turnOnOff').click(); await w(400);
  if (await page.locator('#bb-tela').count()) { await page.locator('.modal .btn', { hasText: 'Pular' }).click(); await w(200); }
  await page.mouse.move(box.x + 40, box.y + 40); await page.mouse.click(box.x + 40, box.y + 40); await w(150);
  await page.keyboard.press('n'); await w(400);
  const campo = await ev(() => { const a = document.activeElement; return { aberta: !!document.querySelector('#bb-tela'), tag: a && a.tagName, valor: a && 'value' in a ? a.value : null, vez: /^A vez de /.test((document.querySelector('.modal') || {}).innerText || ''), txt: ((document.querySelector('.modal') || {}).innerText || '').slice(0, 120) }; });
  ok(campo.aberta && campo.vez && campo.tag === 'INPUT', 'N passa a vez e a tela das barrinhas abre ("A vez de…"), com o cursor no campo: ' + JSON.stringify(campo));
  ok(campo.valor === '', 'e o "n" não fica escrito no campo: ' + JSON.stringify(campo.valor));
  await page.keyboard.type('-3'); await w(100);
  ok(await ev(() => document.activeElement.value) === '-3', '(o mestre escreve o número direto: "-3")');
  await page.locator('.modal .btn', { hasText: 'Pular' }).click(); await w(200);
  const pre = await ev(() => { const r = {}; const f = e => { r[e.key] = e.defaultPrevented; }; window.addEventListener('keydown', f); window.__f = f; return true; });
  await page.mouse.move(box.x + 300, box.y + 300); await page.keyboard.press('k'); await page.keyboard.press('f'); await w(200);
  await ev(() => { if (document.querySelector('.modal')) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
  const barradas = await ev(() => { const r = []; for (const k of ['k', 'f']) { const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); document.body.dispatchEvent(e); r.push(k + ':' + e.defaultPrevented); } return r.join(' '); });
  ok(pre && barradas === 'k:true f:true', 'as outras letras de atalho (K, F) também não seguem adiante: ' + barradas);
  if (t.errs.length) console.log(t.errs.slice(0, 5).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
