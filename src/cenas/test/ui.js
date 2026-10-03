// Capturas de estados da interface (opções de ferramenta, painéis, janelas, menus).
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
(async () => {
  const t = await open({ w: 1366, h: 700 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const pt = (cx, cy) => ev(([cx, cy]) => { const u = __urgm, sc = u.Store.scene(), r = u.Render.cv.getBoundingClientRect(); const [sx, sy] = u.Render.toScreen(cx * sc.cell, cy * sc.cell); return [r.left + sx, r.top + sy]; }, [cx, cy]);
  const click = async (cx, cy, opt) => { const [x, y] = await pt(cx, cy); await page.mouse.click(x, y, opt); await page.waitForTimeout(90); };
  const drag = async (ax, ay, bx, by) => { const [x0, y0] = await pt(ax, ay), [x1, y1] = await pt(bx, by); await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(90); };
  const key = async k => { await page.keyboard.press(k); await page.waitForTimeout(90); };
  const shot = async name => { await page.waitForTimeout(250); await page.screenshot({ path: `ui-${name}.png` }); if (t.errs.length) { console.log(name, t.errs.join('\n')); t.errs.length = 0; } else console.log(name, 'ok'); };

  await shot('01-inicio');
  await key('t'); await page.mouse.move(...(await pt(5.5, 9.5))); await shot('02-token-tool');
  await key('r'); await ev(() => { __urgm.App.opt.fillOn = true; __urgm.UI.renderAll(); }); await drag(2, 6, 6, 9); await shot('03-rect-tool');
  await key('v'); await click(2, 7.5); await shot('04-shape-panel');
  await key('w'); await click(18.5, 3); await shot('05-wall-selected');
  await key('n'); await shot('06-fog-off');
  await page.locator('.o-warn .btn').click(); await page.waitForTimeout(150); await drag(8, 16, 14, 17); await shot('07-fog-on');
  await ev(() => { __urgm.App.opt.fxShape = 'cone'; __urgm.App.opt.fx = 'fogo'; }); await key('e'); await page.mouse.move(...(await pt(22, 13))); await shot('08-fx-tool');
  await drag(22, 13, 25, 15); await shot('09-fx-panel');
  await key('Escape'); await click(19.5, 5.5); await shot('10-light-panel');
  await key('Escape'); await drag(7, 11.2, 17, 14.5); await shot('11-multi');
  await page.locator('.chip', { hasText: 'Queimando' }).first().click(); await page.waitForTimeout(100);
  await page.locator('#mt-amt').fill('5'); await page.locator('.btn', { hasText: 'Aplicar' }).click(); await shot('12-multi-dano');
  await key('Escape'); await click(14.5, 10.5, { button: 'right' }); await shot('13-menu');
  await page.locator('.menu-i', { hasText: 'Condições' }).click(); await shot('14-condicoes');
  await key('Escape');
  await page.locator('#moreBtn').click(); await shot('15-arquivo');
  await page.locator('.menu-i', { hasText: 'Atalhos' }).click(); await shot('16-atalhos');
  await key('Escape');
  await page.locator('#sceneBtn').click(); await shot('17-cenas');
  await key('Escape');
  // fundo por arquivo
  const png = path.join(__dirname, 'tok.png');
  await ev(() => { __urgm.setSel([]); __urgm.UI.openTab('scene'); });
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('.btn', { hasText: 'Trocar imagem' }).click()]);
  await fc.setFiles(png); await page.waitForTimeout(300); await shot('18-fundo');
  await page.locator('.modal .btn', { hasText: 'Manter' }).click(); await page.waitForTimeout(200);
  await key('Control+z');
  // soltar imagem no mapa (simulado)
  const [dx, dy] = await pt(4.5, 4.5);
  await ev(async ([x, y]) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 96; const g = cv.getContext('2d');
    g.fillStyle = '#7a4fb0'; g.fillRect(0, 0, 96, 96); g.fillStyle = '#ffd25e'; g.beginPath(); g.arc(48, 40, 22, 0, 7); g.fill();
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'Mago das Sombras.png', { type: 'image/png' }));
    document.getElementById('stage').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt }));
  }, [dx, dy]);
  await shot('19-soltar-imagem');
  await page.locator('.modal .btn', { hasText: 'Novo token' }).click(); await page.waitForTimeout(500); await shot('20-token-com-imagem');
  const info = await ev(() => { const u = __urgm, sc = u.Store.scene(); const t = sc.tokens[sc.tokens.length - 1]; return { name: t.name, img: !!t.img, x: t.x / sc.cell, y: t.y / sc.cell, ms: u.Render.stats.ms.toFixed(2), frames: u.Render.stats.frames }; });
  console.log('token solto:', JSON.stringify(info));
  // jogador: próprio token e token alheio
  await ev(() => { __urgm.UI.setViewer(__urgm.Store.S.players[0].id); }); await page.waitForTimeout(200);
  await click(9.5, 12.5); await shot('21-jogador-proprio');
  await click(15.5, 12.5); await shot('22-jogador-alheio');
  await t.close();
})().catch(e => { console.error(e); process.exit(1); });
