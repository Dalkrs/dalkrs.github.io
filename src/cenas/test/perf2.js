// Custo de desenho com clima, hora do dia e véu do mestre: cena de exemplo e cena grande (100×80).
const { open } = require('./lib');
(async () => {
  const t = await open({ w: 1440, h: 900 });
  const measure = (label) => t.page.evaluate(async (label) => {
    const u = __urgm;
    const out = {};
    for (const k of ['', 'chuva', 'neve', 'neblina', 'cinzas', 'vagalumes']) {
      u.Store.tx('x', () => u.Store.scn({ tone: k ? 'noite' : 'dia', weather: { k, pow: 1 } }));
      await new Promise(r => setTimeout(r, 500));
      const f0 = u.Render.stats.frames; u.Render.stats.ms = 0;
      // média do tempo de desenho medida direto, para não depender do filtro exponencial
      let sum = 0, n = 0; const t0 = performance.now();
      while (performance.now() - t0 < 1500) { await new Promise(r => requestAnimationFrame(r)); sum += u.Render.stats.ms; n++; }
      out[k || 'sem clima'] = { ms: +(u.Render.stats.ms).toFixed(1), fps: +((u.Render.stats.frames - f0) / ((performance.now() - t0) / 1000)).toFixed(0) };
    }
    return [label, out];
  }, label);
  console.log(JSON.stringify(await measure('exemplo, enquadrada')));
  await t.page.evaluate(() => { const u = __urgm; u.Render.zoomAt(700, 400, 2); });
  console.log(JSON.stringify(await measure('exemplo, zoom 200%')));
  // cena grande
  await t.page.evaluate(() => {
    const u = __urgm, S = u.Store, base = JSON.parse(JSON.stringify(S.scene()));
    const tok = base.tokens[0];
    const sc = Object.assign(base, { id: 'cena_big', name: 'Grande', cols: 100, rows: 80, tokens: [], shapes: [], walls: [], lights: [], effects: [], fogOps: [], explored: {}, targets: [], bg: { asset: null, stretch: false, dx: 0, dy: 0, scale: 1 } });
    for (let i = 0; i < 40; i++) sc.tokens.push(Object.assign(JSON.parse(JSON.stringify(tok)), { id: 'tk_' + i, name: 'T' + i, x: (5 + (i % 10) * 9) * 64, y: (5 + Math.floor(i / 10) * 18) * 64, owner: i < 4 ? 'jg_dalmo' : null, auras: [], conds: ['fogo', 'veneno'], cinfo: { fogo: { n: 3 }, veneno: { d: 2, d0: 3 } } }));
    for (let i = 0; i < 300; i++) sc.walls.push({ id: 'w_' + i, k: ['wall', 'window', 'veil', 'door'][i % 4], x1: ((i * 37) % 100) * 64, y1: ((i * 53) % 80) * 64, x2: ((i * 37) % 100 + 3) * 64, y2: ((i * 53) % 80 + (i % 3)) * 64, open: false, locked: false, secret: i % 8 === 3 });
    for (let i = 0; i < 12; i++) sc.effects.push({ id: 'fx_' + i, fx: ['fogo', 'gelo', 'raio', 'nevoa'][i % 4], k: 'circ', x: (10 + i * 7) * 64, y: (10 + (i % 5) * 12) * 64, r: 3, w: 1, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: i + 1, dur: 3, dur0: 3, at: null });
    sc.fog = { dynamic: true, manual: false, explored: true, shared: true };
    u.App.showVision = true;
    S.addScene(sc); u.UI.switchScene(sc.id);
  });
  await t.page.waitForTimeout(800);
  console.log(JSON.stringify(await measure('grande 100×80, enquadrada, véu ligado')));
  await t.page.evaluate(() => { const u = __urgm; u.Render.zoomAt(700, 400, 1); });
  console.log(JSON.stringify(await measure('grande, zoom 100%')));
  const vis = await t.page.evaluate(() => { const u = __urgm, sc = u.Store.scene(); const t0 = performance.now(); for (let i = 0; i < 5; i++) { u.Vision.invalidate(); u.Vision.update(sc, 'gm'); } return ((performance.now() - t0) / 5).toFixed(1); });
  console.log('visão do mestre com véu, cena grande: ' + vis + ' ms');
  console.log(t.errs.length ? 'ERROS:\n' + t.errs.join('\n') : 'sem erros no console');
  await t.close();
})().catch(e => { console.error(e); process.exit(1); });
