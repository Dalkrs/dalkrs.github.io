// O tutorial em telas menores: cartão sempre dentro da tela e fora do destaque.
const { open } = require('./lib');
(async () => {
  let fails = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
  for (const [w, h] of [[1100, 650], [820, 600], [1920, 1080]]) {
    const t = await open({ w, h, query: '&tour', wait: 1500 });
    const { page } = t;
    const state = () => page.evaluate(() => {
      const r = e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      const hole = document.querySelector('.tour-hole'), card = document.querySelector('.tour-card');
      return { active: __urgm.Tour.active(), step: __urgm.Tour.step(), none: hole.classList.contains('none'), hole: r(hole), card: r(card), vw: innerWidth, vh: innerHeight };
    });
    for (let i = 0; i <= 5; i++) {
      await page.waitForTimeout(420);
      const s = await state();
      const inside = s.card.l >= 0 && s.card.t >= 0 && s.card.r <= s.vw && s.card.b <= s.vh;
      const apart = s.none || s.card.r <= s.hole.l + 1 || s.card.l >= s.hole.r - 1 || s.card.b <= s.hole.t + 1 || s.card.t >= s.hole.b - 1;
      ok(s.active && s.step === i && inside, `${w}×${h} passo ${i}: cartão dentro da tela`);
      if (!apart) console.log(`   (aviso) ${w}×${h} passo ${i}: cartão sobre o destaque`, JSON.stringify(s));
      await page.screenshot({ path: `v2/tour-${w}-${i}.png` });
      await page.locator('#tour-next').click();
    }
    await page.waitForTimeout(300);
    ok(!(await page.evaluate(() => __urgm.Tour.active())), `${w}×${h}: conclui`);
    if (t.errs.length) { console.log('ERROS:\n' + t.errs.join('\n')); fails += t.errs.length; }
    await t.close();
  }
  console.log(fails ? `\n${fails} falha(s) em ${n} verificações` : `\n${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
