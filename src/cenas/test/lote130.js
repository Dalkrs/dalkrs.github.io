// Bateria do lote 130 (as Cenas): a chave da grade do mestre (Na grade / Livre) para paredes, objetos, luzes e a régua;
// Alt inverte; Shift deixa a parede reta; e "Marcar uma casa na imagem" ajusta a grade em cima do desenho do fundo.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1300, h: 850 });
  const { page } = t;
  await page.evaluate(() => {
    const T = __tc, S = T.Store, sc = T.newScene('Grade'); sc.cols = 20; sc.rows = 12; T.normalizeScene(sc); S.addScene(sc); T.UI.switchScene(sc.id);
    T.Render.fit(); document.getElementById('cv').focus();
  });
  // de coordenada da cena para a tela
  const tela = (x, y) => page.evaluate(([x, y]) => { const r = document.getElementById('cv').getBoundingClientRect(), v = __tc.App.view; return [r.left + (x - v.x) * v.z, r.top + (y - v.y) * v.z]; }, [x, y]);
  const clique = async (x, y, mods) => { const [a, b] = await tela(x, y); for (const m of mods || []) await page.keyboard.down(m); await page.mouse.move(a, b); await page.mouse.down(); await page.mouse.up(); for (const m of mods || []) await page.keyboard.up(m); await page.waitForTimeout(60); };
  const ferr = k => page.evaluate(k => __tc.Tools.set(k), k);
  const ultima = c => page.evaluate(c => { const a = __tc.Store.scene()[c]; return a[a.length - 1]; }, c);

  ok(await page.evaluate(() => { const b = document.getElementById('tool-grade'); return b && b.getAttribute('aria-pressed') === 'true' && __tc.Tools.naGrade(); }), 'a chave aparece na barra, ligada (Na grade)');
  // Na grade: a parede encaixa (meio quadrado = 32)
  await ferr('wall'); await clique(100, 100); await clique(300, 107); await page.keyboard.press('Escape');
  let w = await ultima('walls');
  ok(w && w.x1 === 96 && w.y1 === 96 && w.x2 === 288 && w.y2 === 96, 'na grade, a parede encaixa: ' + JSON.stringify(w && [w.x1, w.y1, w.x2, w.y2]));
  // Shift+G: Livre
  await page.mouse.move(650, 400); await page.keyboard.press('Shift+G'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => !__tc.Tools.naGrade() && localStorage.getItem('tinycats:cenas:grade') === 'livre' && document.getElementById('tool-grade').getAttribute('aria-pressed') === 'false'), 'Shift+G troca para Livre (e fica guardado)');
  await ferr('wall'); await clique(110, 300); await clique(310, 305); await page.keyboard.press('Escape');
  w = await ultima('walls');
  ok(w && Math.abs(w.x1 - 110) < 1.5 && Math.abs(w.y1 - 300) < 1.5 && Math.abs(w.x2 - 310) < 1.5 && Math.abs(w.y2 - 305) < 1.5, 'livre, a parede fica onde soltou: ' + JSON.stringify(w && [w.x1, w.y1, w.x2, w.y2]));
  // a ponta gruda na de outra parede, mesmo livre
  { const [a, b] = await tela(312, 303), [c, d] = await tela(312, 500); await page.mouse.move(a, b); await page.mouse.down(); await page.mouse.move(c, d, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(60); await page.keyboard.press('Escape'); }
  w = await ultima('walls');
  ok(w && Math.abs(w.x1 - 310) < 0.01 && Math.abs(w.y1 - 305) < 0.01, 'livre, a ponta gruda na ponta da outra parede');
  // Shift: reta
  await clique(500, 200); await clique(700, 215, ['Shift']); await page.keyboard.press('Escape');
  w = await ultima('walls');
  ok(w && Math.abs(w.y2 - w.y1) < 0.01 && Math.abs(w.x2 - 700) < 1.5, 'Shift deixa a parede deitada: ' + JSON.stringify(w && [w.x1, w.y1, w.x2, w.y2]));
  // Alt, no Livre, encaixa
  await clique(500, 610, ['Alt']); await clique(700, 615, ['Alt']); await page.keyboard.press('Escape');
  w = await ultima('walls');
  ok(w && w.y1 === 608 && w.x2 === 704, 'no Livre, o Alt encaixa: ' + JSON.stringify(w && [w.x1, w.y1, w.x2, w.y2]));
  // objeto e luz livres
  await page.evaluate(() => { __tc.App.opt.obj = 'bau'; });
  await ferr('obj'); await clique(410, 410);
  const ob = await ultima('tokens');
  ok(ob && ob.prop && (ob.x % 32 !== 0 || ob.y % 32 !== 0), 'livre, o objeto fica fora da grade: ' + JSON.stringify(ob && [ob.x, ob.y]));
  await ferr('light'); await clique(213, 517);
  const lz = await ultima('lights');
  ok(lz && Math.abs(lz.x - 213) < 1.5 && Math.abs(lz.y - 517) < 1.5, 'livre, a luz fica onde clicou');
  // o token de personagem continua na grade
  await page.evaluate(() => { const T = __tc, sc = T.Store.scene(), k = T.newToken(sc, 0, 0, { name: 'Herói' }); T.Store.tx('t', () => T.Store.add('tokens', Object.assign(k, { id: 'th', x: 0, y: 640 }))); T.setSel([{ c: 'tokens', id: 'th' }]); T.Tools.set('select'); });
  { const [a, b] = await tela(32, 640 + 32), [c, d] = await tela(32 + 77, 640 + 32 + 11); await page.mouse.move(a, b); await page.mouse.down(); await page.mouse.move(c, d, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(80); }
  ok(await page.evaluate(() => { const k = __tc.Store.get('tokens', 'th'); return k.x % 64 === 0 && k.y % 64 === 0 && k.x !== 0; }), 'o token de personagem continua encaixando: ' + JSON.stringify(await page.evaluate(() => { const k = __tc.Store.get('tokens', 'th'); return [k.x, k.y]; })));
  // volta para a grade pelo botão
  await page.click('#tool-grade'); await page.waitForTimeout(80);
  ok(await page.evaluate(() => __tc.Tools.naGrade() && localStorage.getItem('tinycats:cenas:grade') === 'grade'), 'o botão volta para Na grade');

  // ---- Marcar uma casa na imagem: uma imagem 700 × 500 com casas de 50 px começando em 20 px ----
  const r = await page.evaluate(async () => {
    const T = __tc, S = T.Store, cv = document.createElement('canvas'); cv.width = 700; cv.height = 500;
    const g = cv.getContext('2d'); g.fillStyle = '#ddd'; g.fillRect(0, 0, 700, 500); g.strokeStyle = '#000';
    for (let x = 20; x < 700; x += 50) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 500); g.stroke(); }
    for (let y = 20; y < 500; y += 50) { g.beginPath(); g.moveTo(0, y); g.lineTo(700, y); g.stroke(); }
    const a = await T.Assets.fromCanvas(cv, 'bg', 'grade');
    S.tx('bg', () => S.scn({ bg: { asset: a.id, stretch: false, dx: 0, dy: 0, scale: 1 } }));
    await new Promise(res => { const tick = () => (T.Assets.img(a.id) && T.Assets.img(a.id).naturalWidth ? res() : setTimeout(tick, 50)); tick(); });
    T.Render.fit();
    return { k: 1280 / 700 };
  });
  // a casa da imagem de (120,170) a (170,220): na cena, vezes 1280/700
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Marcar uma casa/.test(x.textContent)); if (b) b.click(); else __tc.Tools.set('gradeImg'); });
  ok(await page.evaluate(() => __tc.App.tool) === 'gradeImg', 'o botão entra no modo de marcar a casa');
  { const [a, b] = await tela(120 * r.k, 170 * r.k), [c, d] = await tela(170 * r.k, 220 * r.k); await page.mouse.move(a, b); await page.mouse.down(); await page.mouse.move(c, d, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(120); }
  const sc = await page.evaluate(() => { const s = __tc.Store.scene(); return { cols: s.cols, rows: s.rows, bg: s.bg, cell: s.cell, tool: __tc.App.tool }; });
  // 50 px da imagem viram 64; a linha de 20 px da imagem cai no 0 da cena; a cena cobre 700 × 500 (menos a sobra)
  const k = sc.cell / 50, dwx = sc.cols * sc.cell * sc.bg.scale;
  ok(Math.abs(dwx / 700 - k) < 0.01, 'a imagem ficou com uma casa = um quadrado: ' + (dwx / 700).toFixed(3));
  ok(Math.abs(sc.bg.dx + 20 * k) < 1 && Math.abs(sc.bg.dy + 20 * k) < 1, 'as linhas do desenho caem nas da grade: ' + sc.bg.dx + ', ' + sc.bg.dy);
  ok(sc.cols === 14 && sc.rows === 10, 'a cena cobre a imagem: ' + sc.cols + ' × ' + sc.rows);
  ok(sc.tool === 'select' && !sc.bg.stretch, 'depois volta para o Selecionar');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(80);
  ok(await page.evaluate(() => __tc.Store.scene().cols === 20), 'Ctrl+Z desfaz o ajuste');
  const inesperados = t.errs.filter(e => !/favicon/.test(e));
  ok(!inesperados.length, 'sem erros no console: ' + inesperados.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
