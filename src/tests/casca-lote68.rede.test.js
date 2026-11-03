// Lote 68, numa mesa de verdade (o mestre):
//   · os modos no alto com a mesa aberta;
//   · a Mesa ao vivo fechada vira o trilho fino (a conversa, com o número do que chegou, e os dados); aberta ou fechada
//     fica lembrada por aba; no Acampamento, ela começa fechada;
//   · o selo "Falta o descanso longo": aparece quando o dia do mundo virou desde o último descanso longo; o × ("hoje
//     não tem") esconde até o dia seguinte, com Desfazer; o descanso longo no Acampamento (com o dia anotado) tira o selo.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const dev = await t.device({ name: 'mestre', modos: true, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } });
  const M = dev.page;
  const w = ms => M.waitForTimeout(ms);
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await w(250); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const vis = sel => M.locator(sel).first().isVisible().catch(() => false);
  const foto = async nome => { if (process.env.FOTOS) await M.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Casca 68 E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    await passo('os modos', async () => {
      ok(j((await M.locator('.modo:visible').allTextContents()).map(x => x.trim())) === j(['Sessão', 'Mundo', 'Descanso', 'Preparar']), 'com a mesa, o mestre tem os quatro modos');
      ok((await M.locator('.modo[aria-checked="true"]').textContent()).trim() === 'Sessão', '(nas Fichas: Sessão)');
    });

    await passo('o trilho', async () => {
      ok(await vis('#vivo') && !(await vis('#trilho')), 'nas Fichas, a Mesa ao vivo aberta (sem o trilho)');
      await M.locator('#vivoX').click(); await w(300);
      ok(!(await vis('#vivo')) && await vis('#trilho') && await vis('#trConversa') && await vis('#trDados'), 'fechada, fica o trilho fino: a conversa e os dados');
      await M.evaluate(() => TC.aoVivo && TC.aoVivo.enviar ? TC.aoVivo.enviar({ tipo: 'msg', texto: 'oi' }) : null).catch(() => null);
      await M.locator('#modo-descanso').click(); await w(800);
      ok(await M.evaluate(() => (document.querySelector('.tab[aria-selected="true"]') || {}).id) === 'tab-acampamento', '(Descanso: o Acampamento)');
      ok(!(await vis('#vivo')) && await vis('#trilho'), 'no Acampamento, a Mesa ao vivo começa fechada');
      await M.locator('#trConversa').click(); await w(300);
      ok(await vis('#vivo') && !(await vis('#trilho')), 'o trilho abre a Mesa ao vivo');
      await M.locator('#modo-sessao').click(); await w(600);
      ok(!(await vis('#vivo')), 'de volta às Fichas: fechada, como estava nela');
      await M.locator('#modo-descanso').click(); await w(600);
      ok(await vis('#vivo'), 'e no Acampamento, aberta (lembrada por aba)');
      await M.locator('#vivoX').click(); await w(200);
      await M.locator('#trDados').click(); await w(300);
      ok(await vis('#vivo') && (!(await vis('#dados')) || (await M.locator('#dadosAbre').getAttribute('aria-expanded')) === 'true'), 'o botão dos dados abre a Mesa ao vivo (com os Dados abertos, quando há ficha)');
      await M.locator('#modo-sessao').click(); await w(500);
    });

    await passo('o selo do descanso longo', async () => {
      const dia = n => M.evaluate(n => TC.dados.col('documentos').gravar('mundo:mapa:mp_t68', { dados: { id: 'mp_t68', nome: 'Vale', cal: { dia: n, ano0: 400 } }, vis: 'mestre' }), n);
      await dia(10);
      await M.evaluate(() => TC.dados.col('documentos').gravar('acampamento', { dados: { nome: 'Acampamento', diario: [] }, vis: 'mesa' }));
      await w(1500);
      ok(!(await vis('#seloDesc')), 'o acampamento de antes (sem o dia anotado): sem selo no dia em que foi visto');
      await dia(11); await w(1200);
      ok(await ate(() => vis('#seloDesc'), 6000), 'o dia virou no Mapa-múndi: o selo "Falta o descanso longo" no alto');
      await foto('l68-selo');
      await M.locator('#seloDescHoje').click(); await w(400);
      ok(!(await vis('#seloDesc')), 'o × ("hoje não tem") esconde');
      const toast = M.locator('.toast', { hasText: 'hoje sem descanso longo' });
      ok(await toast.count() === 1, 'com o aviso e o Desfazer');
      await toast.locator('button').click(); await w(300);
      ok(await vis('#seloDesc'), 'Desfazer traz o selo de volta');
      await M.locator('#seloDescAbrir').click(); await w(800);
      ok(await M.evaluate(() => (document.querySelector('.tab[aria-selected="true"]') || {}).id) === 'tab-acampamento', 'o selo abre o Acampamento');
      // o descanso longo, com o dia do mundo anotado (como o Acampamento faz)
      await M.evaluate(() => { const D = TC.dados.col('documentos'), l = D.pegar('acampamento'); D.gravar('acampamento', { dados: Object.assign({}, l.dados, { longo: { t: Date.now(), dia: TC.calendario.chaveDeHoje(D.todas(), { pegar: id => D.pegar(id), mestre: true }) } }) }); });
      ok(await ate(async () => !(await vis('#seloDesc')), 6000), 'depois do descanso longo, o selo sai');
      await dia(12);
      ok(await ate(() => vis('#seloDesc'), 6000), 'e volta no dia seguinte');
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
