// O cadeado "Só à mão" (lote 47) numa mesa de verdade, com a ficha (só o mestre, Bruno):
//   · o Dain tem quatro barras especiais na ficha: o Chamado de Selene e o Reforjar o Destino ("Só à mão"), a Voz da
//     Graça (sem regra escrita: vale "Só à mão"; começa em 4) e a Fé ("Enche no descanso longo");
//   · no token, as três primeiras vêm trancadas; a Fé, não;
//   · a Cura total e o Restaurar energias (o botão e o aviso do "Encerrar") não mexem nas trancadas, nem no token nem
//     na ficha; a Fé volta ao natural;
//   · abrir o cadeado da Voz da Graça fica guardado (mesmo depois de a ficha mudar e o token se acertar com ela); aí o
//     Restaurar leva a Voz da Graça a 4, e a ficha acompanha.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = ms => M.waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = () => M.evaluate(() => TC.dados.pendentes === 0);
  const foto = async nome => { if (process.env.FOTOS) await M.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cadeado 47 E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    await M.evaluate(() => {
      const R = TC.rules, P = TC.dados.col('personagens');
      const f = Object.assign(R.personagemPadrao('Dain', 'pc_dain'), { tier: 'C', level: 3, recursos: [{ id: 'hp', nome: 'HP', fml: '100' }],
        poderes: [{ id: 'reforjar', nome: 'Reforjar o Destino', max: 3, atual: 3, rec: 'manual' }, { id: 'chamado', nome: 'Chamado de Selene', max: 6, atual: 6, rec: 'manual' },
          { id: 'voz', nome: 'Voz da Graça', max: 4, atual: 4, inicio: 4 }, { id: 'fe', nome: 'Fé', max: 5, atual: 5, rec: 'longo' }] });
      P.gravar('pc_dain', { nome: 'Dain', ficha: f, skills: {}, estado: { rec: { hp: 40 }, pd: { reforjar: 1, chamado: 2, voz: 1, fe: 1 } }, dono_id: null, vis: 'mestre', ordem: 0 });
    });
    ok(await ate(() => parado()), '(a ficha do Dain sobe para a mesa)');
    await M.locator('#tab-cenas').click();
    let C = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && !!__tc.Store.scene() && __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on() && !!__tc.Fichas.get('pc_dain')); }, 40000), '(o mestre abre as Cenas)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
    let id = null;
    const bars = () => C.evaluate(id => __tc.Store.get('tokens', id).bars.map(b => b.n + ':' + b.v), id);
    const pd = () => M.evaluate(() => JSON.parse(JSON.stringify(TC.dados.col('personagens').pegar('pc_dain').estado.pd || {})));

    await passo('o token e os cadeados', async () => {
      await C.evaluate(() => __tc.Combate.trazer(['pc_dain'], 0, 0)); await w(700);
      id = await C.evaluate(() => __tc.Store.scene().tokens.find(k => k.char === 'pc_dain').id);
      ok(j(await bars()) === j(['HP:40', 'Reforjar o Destino:1', 'Chamado de Selene:2', 'Voz da Graça:1', 'Fé:1']), 'o token do Dain com o HP e as quatro especiais — ' + j(await bars()));
      await C.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, id); await w(400);
      const trancadas = await C.evaluate(id => { const t = __tc.Store.get('tokens', id); return t.bars.map(b => __tc.Fichas.soAMao(t, b)); }, id);
      ok(j(trancadas) === j([false, true, true, true, false]), 'trancadas: Reforjar, Chamado e Voz da Graça (Só à mão); a Fé (descanso longo) e o HP, não — ' + j(trancadas));
      ok(await C.locator('#tk-b2-lock').count() === 1 && await C.locator('#tk-b4-lock').count() === 0, 'o cadeado aparece ao lado das trancadas');
      await foto('l47-rede-cadeados');
    });
    await passo('Cura total e Restaurar', async () => {
      await C.locator('#tk-heal').click(); await w(400);
      ok(j(await bars()) === j(['HP:100', 'Reforjar o Destino:1', 'Chamado de Selene:2', 'Voz da Graça:1', 'Fé:1']), 'Cura total: só o HP enche — ' + j(await bars()));
      await C.evaluate(id => { const u = __tc; u.Act.turnAdd([u.Store.get('tokens', id)]); u.UI.openTab('turn'); }, id); await w(300);
      await C.locator('#turnOnOff').click(); await w(600);
      if (await C.locator('.modal').count()) { await C.evaluate(() => __tc.UI.closeModal()); await w(200); }
      await C.locator('#turnOnOff').click(); await w(600);       // encerrar: o aviso oferece restaurar
      const aviso = C.locator('.toast', { hasText: 'Restaurar as energias' });
      ok(await aviso.count() === 1, 'o "Encerrar" oferece restaurar (há a Fé para voltar)');
      await aviso.locator('button', { hasText: 'Restaurar' }).click(); await w(500);
      ok(j(await bars()) === j(['HP:100', 'Reforjar o Destino:1', 'Chamado de Selene:2', 'Voz da Graça:1', 'Fé:5']), 'Restaurar (pelo aviso): a Fé volta a 5; as trancadas ficam — ' + j(await bars()));
      ok(await ate(async () => j(await pd()) === j({ reforjar: 1, chamado: 2, voz: 1, fe: 5 })), 'a ficha acompanha: só a Fé mudou — ' + j(await pd()));
    });
    await passo('abrir o cadeado', async () => {
      await C.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, id); await w(300);
      await C.locator('#tk-b3-more').click(); await w(250);
      await C.locator('.sw', { has: C.locator('#tk-b3-mao') }).click(); await w(300);
      ok(await C.evaluate(id => __tc.Store.get('tokens', id).bars[3].mao, id) === false, 'a Voz da Graça destrancada (mao: false)');
      // a ficha muda (o máximo do Chamado): o token se acerta com ela e o cadeado aberto fica
      await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_dain'); const ps = l.ficha.poderes.map(x => (x.id === 'chamado' ? Object.assign({}, x, { max: 7 }) : x)); P.gravar('pc_dain', { ficha: Object.assign({}, l.ficha, { poderes: ps }) }); });
      ok(await ate(() => C.evaluate(id => { const t = __tc.Store.get('tokens', id); return t.bars[2].m === 7 && t.bars[3].mao === false; }, id)), 'a ficha mudou (Chamado com 7 de máximo): o token se acertou e o cadeado da Voz continua aberto');
      await C.evaluate(() => __tc.UI.openTab('turn')); await w(250);
      await C.locator('#turnRestaurar').click(); await w(300);
      const tela = await C.locator('#rs-tela').innerText();
      ok(/Voz da Graça 1 → 4/.test(tela) && !/Chamado|Reforjar/.test(tela), 'aberta, o Restaurar leva a Voz da Graça ao começo (4); as outras continuam de fora — ' + tela.replace(/\s+/g, ' '));
      await foto('l47-rede-restaurar');
      await C.locator('.modal .btn', { hasText: 'Restaurar' }).click(); await w(400);
      ok(await ate(async () => (await pd()).voz === 4 && (await pd()).chamado === 2), 'a ficha acompanha (Voz da Graça 4; o Chamado continua 2)');
    });
    await ate(() => parado());
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
