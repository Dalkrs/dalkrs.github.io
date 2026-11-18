// (lote 187) A caixa "Oculto dos jogadores" da ferramenta de objetos vale também para a armadilha.
const { open } = require('./lib');
(async () => {
  const t = await open(); const { page } = t; const ev = (fn, a) => page.evaluate(fn, a); const w = ms => page.waitForTimeout(ms);
  let ok = 0, fail = 0; const chk = (c, m) => { if (c) ok++; else { fail++; console.log('FALHOU: ' + m); } };
  const por = async (obj, oculto) => {
    await ev(([obj, oculto]) => { __tc.App.opt.obj = obj; __tc.App.opt.objHidden = oculto; __tc.Tools.set('obj'); }, [obj, oculto]); await w(150);
    const box = await page.locator('#cv, canvas').first().boundingBox();
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.75); await w(200);
    return ev(obj => { const l = __tc.Store.scene().tokens.filter(x => x.prop === obj); const t = l[l.length - 1]; return t ? { hidden: !!t.hidden, est: t.est } : null; }, obj);
  };
  const a = await por('armadilha', false), b = await por('estacas', true), c = await por('barril', false), d = await por('barril', true);
  chk(a && !a.hidden && a.est === 'armada', 'armadilha com a caixa desmarcada: visível (e armada) — ' + JSON.stringify(a));
  chk(b && b.hidden, 'armadilha com a caixa marcada: oculta — ' + JSON.stringify(b));
  chk(c && !c.hidden && d && d.hidden, 'objeto comum segue a caixa');
  console.log(`${ok} verificações passaram${fail ? ', ' + fail + ' falharam' : ''}`);
  await t.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
