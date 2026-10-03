// Movimento reduzido: clima parado, números de dano sem subir (e somem), tutorial sem transição.
const { open } = require('./lib');
(async () => {
  const t = await open({ reduce: true, query: '&tour', wait: 1500 });
  const { page } = t;
  let fails = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
  ok(await page.evaluate(() => __urgm.Tour.active() && getComputedStyle(document.querySelector('.tour-hole')).transitionDuration.split(',').every(x => parseFloat(x) === 0)), 'tutorial abre e o destaque não desliza');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  const r = await page.evaluate(async () => {
    const u = __urgm, sc = u.Store.scene();
    u.Store.tx('x', () => u.Store.scn({ weather: { k: 'chuva', pow: 1 } }));
    await new Promise(r => setTimeout(r, 400));
    const f0 = u.Render.stats.frames; await new Promise(r => setTimeout(r, 1000));
    const still = u.Render.stats.frames - f0;
    const tk = sc.tokens.find(t => t.name === 'Bandido');
    u.Act.barSet(tk, 0, '-3');
    const had = u.App.floats.length;
    await new Promise(r => setTimeout(r, 300));
    const mid = u.Render.stats.frames;
    await new Promise(r => setTimeout(r, 1700));
    return { still, had, after: u.App.floats.length, drew: mid - f0 - still };
  });
  ok(r.still === 0, 'com movimento reduzido, o clima fica parado (nenhum quadro novo em 1 s): ' + r.still);
  ok(r.had === 1 && r.after === 0 && r.drew > 0, 'o número de dano aparece e some sozinho: ' + JSON.stringify(r));
  if (t.errs.length) { console.log('ERROS:\n' + t.errs.join('\n')); fails += t.errs.length; }
  console.log(fails ? `\n${fails} falha(s) em ${n} verificações` : `\n${n} verificações passaram`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
