// Lote 143, numa mesa de verdade: o quadro de pistas do jogador.
//   · o jogador cria um quadro e prega um cartão; vai ao banco como quadroj:<ele>:<id>, só dele e do mestre;
//   · o mestre vê, só olhando (sem os botões de mexer); o outro jogador não recebe nada.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Ana'); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'quadro', 'tinycats-tour': '1' };
  const M = (await t.device({ name: 'mestre', seed })).page;
  const J = (await t.device({ name: 'jogador', seed })).page;
  const K = (await t.device({ name: 'outro', seed })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async p => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: /\/quadro\// }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(300); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Quadro 143 E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false;
  try {
    for (const [p, cc, n] of [[J, c.jog1, 'Dalmo'], [K, c.jog2, 'Ana']]) { await p.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, p); await loginTela(p, cc, c.senha); await entrarMesaTela(p, codigo, n); }
    let FJ = null, FM = null, FK = null;
    await passo('o jogador monta', async () => {
      await J.locator('#tab-quadro').click();
      ok(await ate(async () => { FJ = await quadro(J); return FJ && await FJ.evaluate(() => !!window.__quadro); }), 'o jogador abre a aba Quadro de pistas');
      await FJ.locator('.vazio button').click(); await w(200, J);
      await FJ.locator('#nQ').fill('Minha saga'); await FJ.locator('#nOk').click(); await w(400, J);
      await FJ.locator('#btPregar').click(); await w(200, J);
      await FJ.locator('#pT').fill('Quem mentiu?'); await FJ.locator('#pOk').click(); await w(600, J);
      ok(await ate(() => J.evaluate(() => { const d = TC.dados.col('documentos'); return d.todas().some(l => /^quadroj:/.test(l.id) && !l.apagado); })), 'no banco: quadroj:<ele>:<id>, só dele e do mestre');
    });
    await passo('o mestre olha', async () => {
      await M.locator('#tab-quadro').click();
      ok(await ate(async () => { FM = await quadro(M); return FM && await FM.locator('.carta').count() === 1; }), 'o mestre vê o quadro do jogador');
      ok(/Só olhando: o quadro de Dalmo/.test(await FM.locator('#soVer').innerText()) && await FM.locator('#btPregar').isHidden() && await FM.locator('.carta [data-ed]').count() === 0, 'só olhando: sem pregar, sem editar');
      ok(/Dalmo · Minha saga/.test(await FM.locator('#selQ').innerText()), 'na lista, com o nome do jogador');
    });
    await passo('o outro jogador', async () => {
      await K.locator('#tab-quadro').click();
      ok(await ate(async () => { FK = await quadro(K); return FK && await FK.evaluate(() => !!window.__quadro); }), '(a outra jogadora abre a aba)');
      await w(1500, K);
      ok(await FK.evaluate(() => __quadro.quadros().length) === 0 && await K.evaluate(() => !TC.dados.col('documentos').todas().some(l => /^quadroj:/.test(l.id))), 'a outra jogadora não recebe o quadro do Dalmo');
    });
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)|Multiple GoTrueClient/i.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
