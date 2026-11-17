// Bateria do lote 177 (as Cenas): os atalhos dos guardas, só o mestre. Shift+1, 2, 3: Calmo, Desconfiado, Alerta;
// Shift+setas: o guarda vira sem andar (duas setas: a diagonal). Vale o guarda sob o mouse, senão os selecionados;
// sem guarda, Shift+seta continua andando com o token; o jogador não muda nada.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1300, h: 850 });
  const { page } = t;
  await page.evaluate(() => {
    const T = __tc, S = T.Store, sc = T.newScene('Guardas'); sc.cols = 20; sc.rows = 12; T.normalizeScene(sc); S.addScene(sc); T.UI.switchScene(sc.id);
    const c = sc.cell, ron = dir => ({ pts: [], i: 0, s: 1, modo: 'ida', passo: 3, r: 6, a: 90, dir });
    S.tx('g', () => {
      S.add('tokens', Object.assign(T.newToken(sc, 2 * c + c / 2, 2 * c + c / 2, { name: 'Guarda A' }), { id: 'ga', ronda: ron(0) }));
      S.add('tokens', Object.assign(T.newToken(sc, 8 * c + c / 2, 2 * c + c / 2, { name: 'Guarda B' }), { id: 'gb', ronda: ron(0) }));
      S.add('tokens', Object.assign(T.newToken(sc, 5 * c + c / 2, 8 * c + c / 2, { name: 'Ladra' }), { id: 'pl' }));
    });
    document.getElementById('cv').focus();
  });
  const tk = id => page.evaluate(id => { const k = __tc.Store.get('tokens', id); return { x: k.x, y: k.y, al: k.alerta || 'calmo', dir: k.ronda ? k.ronda.dir : null }; }, id);
  // o mouse sobre o Guarda A (o canto da cena: quadrado 2,2)
  const sobre = async id => {
    const box = await page.locator('#cv').boundingBox(), p = await page.evaluate(id => { const k = __tc.Store.get('tokens', id), sc = __tc.Store.scene(); return __tc.Render.toScreen(k.x + sc.cell / 2, k.y + sc.cell / 2); }, id);
    await page.mouse.move(box.x + p[0], box.y + p[1]); await page.waitForTimeout(80);
  };
  await sobre('ga');
  await page.keyboard.press('Shift+Digit2'); await page.waitForTimeout(120);
  ok((await tk('ga')).al === 'desconfiado' && (await tk('gb')).al === 'calmo', 'Shift+2 sob o mouse: o Guarda A fica Desconfiado (o B não)');
  await page.keyboard.press('Shift+Digit3'); await page.waitForTimeout(120);
  ok((await tk('ga')).al === 'alerta', 'Shift+3: Alerta');
  await page.keyboard.press('Shift+Digit1'); await page.waitForTimeout(120);
  ok((await tk('ga')).al === 'calmo', 'Shift+1: Calmo');
  const p0 = await tk('ga');
  await page.keyboard.press('Shift+ArrowUp'); await page.waitForTimeout(120);
  let a = await tk('ga');
  ok(a.dir === 270 && a.x === p0.x && a.y === p0.y, 'Shift+↑: olha para cima, sem andar (' + a.dir + ')');
  await page.keyboard.down('Shift'); await page.keyboard.down('ArrowDown'); await page.keyboard.down('ArrowLeft'); await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowDown'); await page.keyboard.up('Shift');
  await page.waitForTimeout(120);
  a = await tk('ga');
  ok(a.dir === 135 && a.x === p0.x, 'Shift+↓ e ←: a diagonal (baixo, à esquerda): ' + a.dir);
  ok(await page.evaluate(() => /olha para/.test(document.body.innerText)), 'o aviso diz para onde ele olha');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(120);
  ok((await tk('ga')).dir === 90, 'Ctrl+Z desfaz a última virada (volta a olhar para baixo, a seta apertada antes)');
  // os selecionados (o mouse longe de qualquer guarda)
  await page.evaluate(() => __tc.Tools && 0);
  await page.evaluate(() => { const T = __tc; T.App.sel = [{ c: 'tokens', id: 'ga' }, { c: 'tokens', id: 'gb' }]; T.Store.emit('sel'); });
  await sobre('pl');
  await page.keyboard.press('Shift+Digit3'); await page.waitForTimeout(120);
  ok((await tk('ga')).al === 'alerta' && (await tk('gb')).al === 'alerta', 'com os dois selecionados e o mouse na Ladra: os dois em Alerta');
  await page.keyboard.press('Shift+ArrowRight'); await page.waitForTimeout(120);
  ok((await tk('ga')).dir === 0 && (await tk('gb')).dir === 0, 'Shift+→: os dois olham para a direita');
  // sem guarda: Shift+seta anda com o token
  await page.evaluate(() => { const T = __tc; T.App.sel = [{ c: 'tokens', id: 'pl' }]; T.Store.emit('sel'); });
  await page.mouse.move(5, 5);
  const l0 = await tk('pl');
  await page.keyboard.press('Shift+ArrowRight'); await page.waitForTimeout(120);
  ok((await tk('pl')).x > l0.x, 'sem guarda, Shift+→ continua movendo o token');
  // o jogador não muda
  await page.evaluate(() => { const T = __tc; T.App.sel = [{ c: 'tokens', id: 'ga' }]; T.Store.emit('sel'); T.App.viewer = 'player'; });
  await page.keyboard.press('Shift+Digit1'); await page.waitForTimeout(120);
  ok((await tk('ga')).al === 'alerta', 'o jogador não muda o estado');
  const inesperados = t.errs.filter(e => !/favicon/.test(e));
  ok(!inesperados.length, 'sem erros no console: ' + inesperados.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
