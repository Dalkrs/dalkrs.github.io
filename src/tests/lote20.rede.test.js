// Lote 20, numa mesa (TC_LOCAL=… no banco local): os Feridos vão para a ficha.
//   · o Levemente Ferido num token ligado grava estado.ferido na ficha, e o resumo da ficha mostra a tag;
//   · o Extremamente Ferido (pela sugestão do HP negativo, com o Aplicar) troca a tag da ficha;
//   · a tag tirada na cena sai da ficha; o Desfazer põe de novo.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'fichas' } })).page;
  const w = ms => M.waitForTimeout(ms);
  const quadro = async re => { for (let i = 0; i < 60; i++) { const f = M.frame({ url: re }); if (f) return f; await w(250); } return null; };
  const ate = async (fn, ms = 12000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await w(350); } };
  const linha = () => M.evaluate(() => { const l = TC.dados.col('personagens').todas()[0]; return l ? { id: l.id, nome: l.nome, estado: l.estado, rev: l.rev } : null; });
  const nomeMesa = 'Lote20 E2E ' + Date.now().toString(36);
  let C = null, F = null;
  try {
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    await criarMesaTela(M, nomeMesa);
    // ---------- a ficha ----------
    ok(await ate(async () => { F = await quadro(/\/fichas\//); return F && (await F.locator('#btnNew').count()) === 1; }), '(Fichas abre na mesa)');
    await F.locator('#btnNew').click(); await w(400);
    await F.locator('#f_nome').fill('Aégis Ferido'); await w(600);
    ok(await ate(async () => { const l = await linha(); return l && l.rev > 0 && await M.evaluate(() => TC.dados.pendentes === 0); }), '(a ficha sobe para a mesa)');
    const charId = (await linha()).id;
    // ---------- a cena: o token ligado ----------
    await M.locator('#tab-cenas').click();
    ok(await ate(async () => { C = await quadro(/\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Fichas.on()); }, 20000), '(a cena, com as fichas)');
    const tok = await C.evaluate(charId => {
      const u = __tc, sc = u.Store.scene();
      const k = u.newToken(sc, 4 * sc.cell, 4 * sc.cell, { name: 'Aégis' });
      u.Store.tx('token', () => u.Store.add('tokens', k));
      u.Fichas.link(u.Store.get('tokens', k.id), charId);
      return k.id;
    }, charId);
    const fer = () => linha().then(l => (l && l.estado && l.estado.ferido) || null);
    await C.evaluate(tid => __tc.Act.condToggle([__tc.Store.get('tokens', tid)], 'levementeFerido'), tok); await w(300);
    ok(await ate(async () => (await fer()) === 'levementeFerido'), 'o Levemente Ferido no token ligado vai para a ficha (estado.ferido): ' + await fer());
    // a sugestão do HP negativo: a barra da ficha pode ficar negativa? põe um piso no token (barra comum) para o teste
    const barra = await C.evaluate(tid => { const t = __tc.Store.get('tokens', tid), b = __tc.barraDaVida ? __tc.barraDaVida(t.bars) : t.bars[0]; return b ? { n: b.n, m: b.m, lo: b.lo || 0, ref: !!b.ref } : null; }, tok);
    await C.evaluate(tid => { const u = __tc; u.Act.feridoAplicar(u.Store.get('tokens', tid), 'extremamenteFerido'); }, tok); await w(300);
    ok(await ate(async () => (await fer()) === 'extremamenteFerido'), 'o Extremamente troca a tag da ficha: ' + await fer() + ' (barra: ' + JSON.stringify(barra) + ')');
    await M.locator('#tab-fichas').click(); await w(700);
    ok(await ate(async () => (await F.locator('#rsFerido').count()) === 1 && /Extremamente Ferido/.test(await F.locator('#rsFerido').innerText())), 'o resumo da ficha mostra a tag');
    if (process.env.TC_SCRATCH) { require('fs').mkdirSync(require('path').join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await M.screenshot({ path: require('path').join(process.env.TC_SCRATCH, 'fotos', 'l20-ficha-ferido.png') }); }
    await M.locator('#tab-cenas').click(); await w(400);
    await C.evaluate(tid => __tc.Act.condToggle([__tc.Store.get('tokens', tid)], 'extremamenteFerido'), tok); await w(300);
    ok(await ate(async () => (await fer()) === null), 'a tag tirada na cena sai da ficha');
    await C.evaluate(() => __tc.Tools.undo()); await w(300);
    ok(await ate(async () => (await fer()) === 'extremamenteFerido'), 'o Desfazer põe de novo');
  } catch (e) {
    ok(false, 'parou: ' + String((e && e.message) || e).split('\n')[0]);
  } finally {
    try { await M.locator('#tab-fichas').click(); await w(300); await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('(não consegui apagar a mesa de teste: ' + e.message + ')'); }
  }
  const erros = t.errs.filter(e => !/favicon|Failed to load resource|net::ERR/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
