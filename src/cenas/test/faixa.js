// A faixa do token selecionado (na base do mapa) não pode andar com o mouse em cima dela. Embaixo dela ficam a dica
// e o estado, que mudam com o mouse ("Item travado…", "Coluna · Linha", "Salvando…"): se a altura deles mudasse, a
// faixa subiria e desceria, o mouse sairia de cima dela, a dica mudaria de novo — e a faixa ficaria "dançando".
// Aqui o mouse passa devagar por cima da faixa, tremendo 1 px (como uma mão), e a posição dela é anotada a cada quadro.
const { open } = require('./lib');
(async () => {
  let fails = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
  for (const largura of [1150, 1024, 760]) {
    for (const travado of [true, false]) {
      const t = await open({ w: largura, h: 760 });
      const { page } = t;
      const ev = (fn, arg) => page.evaluate(fn, arg);
      const w = ms => page.waitForTimeout(ms || 120);
      await ev(travado => {
        const u = __urgm, sc = u.Store.scene();
        // um desenho travado cobrindo o mapa (um fundo desenhado, por exemplo): por cima dele, a dica muda para "Item travado…"
        if (travado) u.Store.tx('fundo travado', () => u.Store.add('shapes', { id: 'trava', k: 'rect', x: -2000, y: -2000, w: sc.cols * sc.cell + 4000, h: sc.rows * sc.cell + 4000, s: '#ffffff', sw: 2, f: '#223344', a: 0.3, top: false, gm: false, lock: true, by: null }));
        u.setSel([{ c: 'tokens', id: sc.tokens.find(x => x.name === 'Dain X').id }]);
        window.__tops = []; window.__medir = false;
        const passo = () => { if (window.__medir) window.__tops.push(Math.round(document.getElementById('hud').getBoundingClientRect().top)); requestAnimationFrame(passo); };
        requestAnimationFrame(passo);
      }, travado);
      await w(300);
      const caixa = () => ev(() => { const r = document.getElementById('hud').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; });
      const c0 = await caixa(), dicas = new Set();
      let mud = 0, vistos = [];
      for (const fx of [0.5, 0.85]) {
        const x = Math.round(c0.left + (c0.right - c0.left) * fx);
        await page.mouse.move(x, c0.top - 80); await w(150);
        await ev(() => { window.__tops = []; window.__medir = true; });
        for (let y = c0.top - 40; y <= c0.bottom + 30; y += 2) { await page.mouse.move(x + (y % 4 ? 1 : 0), y); await w(20); dicas.add(await ev(() => document.getElementById('hint').textContent.slice(0, 12))); }
        await ev(() => { window.__medir = false; });
        const tops = await ev(() => window.__tops);
        mud += tops.filter((v, i) => i && v !== tops[i - 1]).length; vistos = vistos.concat(tops);
      }
      ok(mud === 0, `${largura} px${travado ? ', com um desenho travado por baixo' : ''}: a faixa do token não sai do lugar com o mouse passando por ela (${mud} mudanças; posições ${[...new Set(vistos)].join('/')})`);
      if (travado) ok(dicas.size >= 2, `${largura} px: (a dica mudou mesmo durante a passada: ${[...dicas].join(' | ')})`);
      // mexer num valor pela faixa: o estado passa por "Salvando…" e a faixa continua onde estava
      await ev(() => { window.__tops = []; window.__medir = true; });
      await page.locator('#hud-b0').fill('-3'); await page.locator('#hud-b0').press('Enter'); await w(900);
      await ev(() => { window.__medir = false; });
      const depois = await ev(() => window.__tops);
      ok(depois.length > 10 && new Set(depois).size === 1, `${largura} px: mudar um valor pela faixa não a tira do lugar (posições ${[...new Set(depois)].join('/')})`);
      if (t.errs.length) { console.log('ERROS:\n' + t.errs.join('\n')); fails += t.errs.length; }
      await t.close();
    }
  }
  console.log(fails ? `\n${fails} falha(s) em ${n} verificações` : `\n${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
