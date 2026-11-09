// Bateria do lote 127 (as Cenas): o atalho das rondas. Shift+W faz os guardas andarem um passo (só o mestre); segurar a
// tecla não repete; o W sozinho continua a ferramenta de parede; o jogador não avança.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1300, h: 850 });
  const { page } = t;
  await page.evaluate(() => {
    const T = __tc, S = T.Store, sc = T.newScene('Rondas'); sc.cols = 20; sc.rows = 12; T.normalizeScene(sc); S.addScene(sc); T.UI.switchScene(sc.id);
    const c = sc.cell, g = T.newToken(sc, 2 * c + c / 2, 2 * c + c / 2, { name: 'Guarda' });
    S.tx('g', () => S.add('tokens', Object.assign(g, { id: 'tg', ronda: { pts: [[2, 2], [12, 2]], i: 0, s: 1, modo: 'ida', passo: 3, r: 6, a: 90, dir: 0 } })));
    document.getElementById('cv').focus();
  });
  const pos = () => page.evaluate(() => { const k = __tc.Store.get('tokens', 'tg'); return Math.round(k.x / __tc.Store.scene().cell); });
  const x0 = await pos();
  await page.mouse.move(650, 400);
  await page.keyboard.press('Shift+W'); await page.waitForTimeout(150);
  const x1 = await pos();
  ok(x1 > x0, 'Shift+W: o guarda andou pela rota (' + x0 + ' → ' + x1 + ')');
  // segurar: as repetições não contam
  await page.keyboard.down('Shift'); await page.keyboard.down('w');
  await page.evaluate(() => { for (let i = 0; i < 5; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'W', code: 'KeyW', shiftKey: true, repeat: true, bubbles: true })); });
  await page.keyboard.up('w'); await page.keyboard.up('Shift'); await page.waitForTimeout(150);
  ok(await pos() === x1 + 3, 'segurar a tecla não repete: um passo por toque');
  await page.keyboard.press('w'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => __tc.App.tool) === 'wall', 'o W sozinho continua a ferramenta de parede');
  const ajuda = await page.evaluate(() => { const lst = [...document.querySelectorAll('.menu-i, button')].find(b => /Atalhos de teclado/.test(b.textContent)); if (lst) lst.click(); const m = document.querySelector('.modal'); const tx = m ? m.innerText : ''; document.querySelectorAll('.modal .btn').forEach(b => { if (/Fechar|OK/.test(b.textContent)) b.click(); }); return tx; });
  ok(!ajuda || /Shift\+W/.test(ajuda), 'a lista de atalhos mostra o Shift+W');
  // o jogador não avança
  await page.evaluate(() => { __tc.App.tool = 'select'; __tc.App.viewer = 'player'; });
  const x2 = await pos();
  await page.keyboard.press('Shift+W'); await page.waitForTimeout(150);
  ok(await pos() === x2, 'o jogador não faz os guardas andarem');
  const inesperados = t.errs.filter(e => !/favicon/.test(e));
  ok(!inesperados.length, 'sem erros no console: ' + inesperados.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
