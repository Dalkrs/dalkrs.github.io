// Casos de visão (névoa manual, visão individual) e um teste de carga.
const { open } = require('./lib');
(async () => {
  const t = await open();
  const { page } = t;
  let fails = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // 1. Visão individual: segundo jogador sem token → aviso
  let r = await ev(async () => {
    const u = __urgm, S = u.Store, sc = S.scene();
    S.S.players.push({ id: 'p2', name: 'Bia', color: '#ee8a4a' });
    S.tx('x', () => S.scn({ fog: Object.assign({}, sc.fog, { shared: false }) }));
    u.UI.setViewer('p2');
    await new Promise(r => setTimeout(r, 300));
    const a = { noSource: u.Vision.out.noSource, banner: document.getElementById('banner').textContent, see: u.Vision.canSee(9.5 * sc.cell, 12.5 * sc.cell) };
    // dá o Kairo para a Bia
    const k = sc.tokens.find(x => x.name === 'Kairo');
    u.UI.setViewer('gm');
    S.tx('x', () => S.upd('tokens', k.id, { owner: 'p2' }));
    u.UI.setViewer('p2');
    await new Promise(r => setTimeout(r, 300));
    const b = { noSource: u.Vision.out.noSource, see: u.Vision.canSee(10.5 * sc.cell, 13.5 * sc.cell), dainShown: u.tokShown(sc.tokens.find(x => x.name === 'Dain X'), sc) };
    return { a, b };
  });
  ok(r.a.noSource && /não tem token com visão/.test(r.a.banner) && !r.a.see, 'jogador sem token: tudo coberto e aviso na faixa');
  ok(!r.b.noSource && r.b.see && r.b.dainShown, 'com token próprio, enxerga os arredores');

  // 2. Só névoa manual
  r = await ev(async () => {
    const u = __urgm, S = u.Store, sc = S.scene(), c = sc.cell;
    u.UI.setViewer('gm');
    S.tx('x', () => S.scn({ fog: { dynamic: false, manual: true, explored: true, shared: true }, light: 'claro' }));
    u.UI.setViewer('jg_dalmo');
    await new Promise(r => setTimeout(r, 250));
    const a = { vis: u.Vision.canSee(9.5 * c, 12.5 * c) };
    u.UI.setViewer('gm');
    S.tx('x', () => S.add('fogOps', { id: 'f1', m: 'r', k: 'rect', x: 6 * c, y: 10 * c, w: 8 * c, h: 6 * c }));
    u.UI.setViewer('jg_dalmo');
    await new Promise(r => setTimeout(r, 250));
    const b = { inside: u.Vision.canSee(9.5 * c, 12.5 * c), outside: u.Vision.canSee(20 * c, 5 * c) };
    u.UI.setViewer('gm');
    S.tx('x', () => S.add('fogOps', { id: 'f2', m: 'h', k: 'brush', s: 2 * c, pts: [9.5 * c, 12.5 * c] }));
    u.UI.setViewer('jg_dalmo');
    await new Promise(r => setTimeout(r, 250));
    const d = { hidden: u.Vision.canSee(9.5 * c, 12.5 * c), still: u.Vision.canSee(12.5 * c, 14.5 * c) };
    u.UI.setViewer('gm');
    S.undo();
    u.UI.setViewer('jg_dalmo');
    await new Promise(r => setTimeout(r, 250));
    const e = { back: u.Vision.canSee(9.5 * c, 12.5 * c) };
    u.UI.setViewer('gm');
    return { a, b, d, e };
  });
  ok(!r.a.vis, 'névoa manual começa cobrindo tudo');
  ok(r.b.inside && !r.b.outside, 'retângulo revelado aparece, o resto não');
  ok(!r.d.hidden && r.d.still, 'pincel de esconder cobre de novo só onde passou');
  ok(r.e.back, 'desfazer a pincelada devolve a área');

  // 3. Carga: cena grande
  r = await ev(async () => {
    const u = __urgm, S = u.Store;
    const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
    u.UI.prompt = null;
    const sc0 = S.scene();
    S.tx('big', () => {
      S.scn({ cols: 100, rows: 80, light: 'escuro', fog: { dynamic: true, manual: false, explored: true, shared: true } });
      const c = sc0.cell;
      for (let i = 0; i < 300; i++) { const x = Math.floor(rnd() * 98) * c, y = Math.floor(rnd() * 78) * c, hz = rnd() > 0.5, len = (1 + Math.floor(rnd() * 5)) * c; S.add('walls', { id: 'bw' + i, k: 'wall', x1: x, y1: y, x2: hz ? x + len : x, y2: hz ? y : y + len, open: false, locked: false }); }
      for (let i = 0; i < 40; i++) { const base = sc0.tokens[0]; const tk = JSON.parse(JSON.stringify(base)); tk.id = 'bt' + i; tk.name = 'T' + i; tk.x = Math.floor(rnd() * 99) * c; tk.y = Math.floor(rnd() * 79) * c; tk.owner = i < 6 ? 'jg_dalmo' : null; tk.auras = []; tk.light = { on: i < 6, bright: 4, dim: 8, c: '#ffc477' }; S.add('tokens', tk); }
      for (let i = 0; i < 10; i++) S.add('lights', { id: 'bl' + i, name: 'L', x: rnd() * 100 * c, y: rnd() * 80 * c, bright: 4, dim: 8, c: '#ffc477', on: true });
      for (let i = 0; i < 12; i++) S.add('effects', { id: 'be' + i, fx: u.FX.ORDER[i % 14], k: ['circ', 'cone', 'quad', 'line'][i % 4], x: rnd() * 100 * c, y: rnd() * 80 * c, r: 3, w: 1, ang: 60, dir: i * 30, pow: 0.8, token: null, gm: false, by: null, seed: i + 1 });
    });
    u.Render.fit();
    await new Promise(r => setTimeout(r, 1500));
    const sc = S.scene();
    // mover um token invalida só a visão (as luzes fixas ficam em cache)
    const mv = sc.tokens.find(x => x.id === 'bt0');
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) { u.Vision.invalidate(); u.Vision.update(sc, 'gm'); }
    const vGm = (performance.now() - t0) / 5;
    const t1 = performance.now();
    for (let i = 0; i < 5; i++) { u.Vision.invalidate(); u.Vision.update(sc, 'jg_dalmo'); }
    const vPl = (performance.now() - t1) / 5;
    u.Vision.invalidate();
    const f0 = u.Render.stats.frames;
    await new Promise(r => setTimeout(r, 2000));
    const gmDraw = u.Render.stats.ms, gmFps = (u.Render.stats.frames - f0) / 2;
    u.UI.setViewer('jg_dalmo');
    await new Promise(r => setTimeout(r, 500));
    const f1 = u.Render.stats.frames;
    await new Promise(r => setTimeout(r, 2000));
    return { walls: sc.walls.length, tokens: sc.tokens.length, visGm: vGm.toFixed(1), visPlayer: vPl.toFixed(1), drawGm: gmDraw.toFixed(1), fpsGm: gmFps, drawPlayer: u.Render.stats.ms.toFixed(1), fpsPlayer: (u.Render.stats.frames - f1) / 2 };
  });
  console.log('cena grande:', JSON.stringify(r));
  ok(parseFloat(r.visPlayer) < 120, 'recalcular a visão cabe num quadro folgado');
  await page.screenshot({ path: 'stress.png' });
  if (t.errs.length) { console.log(t.errs.join('\n')); fails += t.errs.length; }
  console.log(fails ? `\n${fails} falha(s) em ${n}` : `\n${n} verificações passaram`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
