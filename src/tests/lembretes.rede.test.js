// Lote 131, numa mesa de verdade (o mestre): os lembretes do dia.
//   · abrem sozinhos na primeira vez do dia que o mestre entra na mesa (e não de novo no mesmo dia);
//   · marcar um item guarda em escudo:lembretes; o número de aptidões prontas para subir aparece no item;
//   · "Editar a lista": renomear, tirar e criar itens; o menu da mesa reabre a lista.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const dev = await t.device({ name: 'mestre', lembretes: true, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } });
  const M = dev.page;
  const w = ms => M.waitForTimeout(ms);
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await w(250); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const vis = sel => M.locator(sel).first().isVisible().catch(() => false);
  const doc = () => M.evaluate(() => { const l = TC.dados.col('documentos').pegar('escudo:lembretes'); return l && !l.apagado ? l.dados : null; });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Lembretes 131 E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    await passo('abre sozinha', async () => {
      ok(await ate(() => vis('#f-lembretes'), 15000), 'a checklist do dia abre sozinha para o mestre');
      ok(await M.locator('#f-lembretes .lembr li').count() === 10, 'com os 10 itens de costume');
      await M.locator('#lb-fichas').check(); await w(400);
      ok(await ate(async () => { const d = await doc(); return d && d.feitos && j(d.feitos.ids) === j(['fichas']); }, 6000), 'marcar guarda em escudo:lembretes');
      ok(/1 de 10/.test(await M.locator('#f-lembretes .lembr-sub').textContent()), 'o resumo conta o que foi feito');
      await M.locator('#f-lembretes button[type=submit]').click(); await w(300);
    });
    await passo('o número das aptidões', async () => {
      await M.evaluate(() => TC.dados.col('documentos').gravar('fichas:segredos', { dados: { apt: { pc_x: [{ id: 'ap_a', n: 'Rastreio', xp: 12, max: 10 }] } }, vis: 'mestre' }));
      await M.evaluate(() => TC.dados.col('personagens').gravar('pc_x', { nome: 'Dain', vis: 'mestre', ficha: {}, estado: {}, skills: {} }));
      await w(800);
      await M.locator('#btnConta').click(); await w(300);
      await M.locator('#mn-lembretes').click(); await w(400);
      if (process.env.FOTOS) await M.locator('#f-lembretes').screenshot({ path: process.env.FOTOS + '/lembretes.png' });
      ok(await vis('#f-lembretes') && /1 aptidão pronta para subir/.test(await M.locator('#f-lembretes').innerText()), 'pelo menu; o item das aptidões mostra 1 pronta para subir');
      ok(await M.locator('#lb-fichas').isChecked(), 'a marca de hoje continua');
    });
    await passo('editar a lista', async () => {
      await M.locator('#f-lembretes button', { hasText: 'Editar a lista' }).click(); await w(300);
      const li = M.locator('#f-lembretes-ed li');
      await li.nth(0).locator('input').fill('Conferir Vida e XP');
      await li.nth(9).locator('button').click();
      await M.locator('#f-lembretes-ed button', { hasText: '+ Item' }).click();
      await M.locator('#f-lembretes-ed li').last().locator('input').fill('Separar a trilha sonora');
      await M.locator('#f-lembretes-ed li').last().locator('select').selectOption('cenas');
      await M.locator('#f-lembretes-ed button[type=submit]').click(); await w(500);
      const d = await doc();
      ok(d && d.itens && d.itens.length === 10 && d.itens[0].t === 'Conferir Vida e XP' && !d.itens.some(i => i.id === 'jornal') && d.itens[9].t === 'Separar a trilha sonora' && d.itens[9].ir === 'cenas', 'a lista nova foi guardada');
      ok(await vis('#f-lembretes') && /Separar a trilha sonora/.test(await M.locator('#f-lembretes').innerText()), 'e volta para a checklist');
      await M.locator('#f-lembretes button', { hasText: 'Abrir Cenas' }).last().click(); await w(800);
      ok(await M.evaluate(() => (document.querySelector('.tab[aria-selected="true"]') || {}).id) === 'tab-cenas', 'o atalho abre a aba');
    });
    await passo('só uma vez por dia', async () => {
      await M.reload({ waitUntil: 'load' }); await w(4500);
      ok(!(await vis('#f-lembretes')), 'no mesmo dia, não abre de novo sozinha');
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
