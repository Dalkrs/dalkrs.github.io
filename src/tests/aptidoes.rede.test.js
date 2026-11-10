// Lote 131, as aptidões numa mesa de verdade: o mestre cria e dá XP; a barra, o texto de cada nível e a aptidão
// secreta ficam num documento que só o mestre recebe (fichas:segredos); o jogador vê o nome, a descrição e o nível.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const j = JSON.stringify;
const pc = Object.assign(R.personagemPadrao('Dain'), { id: 'pc_dain', nome: 'Dain' });
const local = j({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { urgm_calc_atributos_v1: local, 'tinycats:aba': 'fichas' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'fichas' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const fichas = async p => { for (let i = 0; i < 40; i++) { const f = p.frame({ url: /\/fichas\// }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 15000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const noBanco = (p, tabela, id, mesa) => p.evaluate(async ([tabela, id, mesa]) => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave); const { data, error } = await a.from(tabela).select('*').eq('mesa_id', mesa).eq('id', id); return error ? 'erro: ' + error.message : (data || [])[0] || null; }, [tabela, id, mesa]);

  await M.goto(t.base, { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Aptidões E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false;
  try {
    let F = null, G = null;
    ok(await ate(async () => { F = await fichas(M); return F && (await F.locator('#ofertaSim').count()) === 1; }), 'a mesa nova oferece trazer a ficha');
    await F.locator('#ofertaSim').click(); await w(600);
    ok(await ate(() => M.evaluate(() => TC.dados.col('personagens').todas().length === 1 && TC.dados.pendentes === 0)), 'a ficha sobe');
    const mesa = await M.evaluate(() => TC.mesas.atual.id);
    await J.goto(t.base, { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    ok(await ate(async () => { G = await fichas(J); return !!G; }) && await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), 'o jogador entra');
    await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(500);
    ok(await ate(async () => (await G.locator('#lista .pc .nm').allInnerTexts()).join('|') === 'Dain'), 'e recebe a ficha do Dain');
    await G.locator('#lista .pc').first().click(); await w(400, J);

    await passo('o mestre cria e dá XP', async () => {
      await F.locator('#ficha [data-abaficha="aptidoes"]').click(); await w(300);
      for (const [n, oc] of [['Rastreio', false], ['Sombra antiga', true]]) {
        await F.locator('[data-aptnova]').click(); await w(200);
        await F.locator('[data-aptn]').fill(n); await F.locator('[data-aptd]').fill('Descrição de ' + n);
        await F.locator('[data-apttx="1"]').fill('Texto secreto do nível 1 de ' + n);
        if (oc) await F.locator('[data-aptoc]').check();
        await F.locator('[data-aptok]').click(); await w(400);
      }
      const ids = await F.evaluate(() => FichasApt.listaDe(S.personagens[0]).map(a => a.id));
      await F.locator(`[data-aptconta="pc_dain|${ids[0]}"]`).fill('+7'); await F.locator(`[data-aptconta="pc_dain|${ids[0]}"]`).press('Enter'); await w(800);
      ok(await ate(async () => { const s = await noBanco(M, 'documentos', 'fichas:segredos', mesa), b = await noBanco(M, 'personagens', 'pc_dain', mesa);
        const lista = s && s.dados && s.dados.v && s.dados.v.apt && s.dados.v.apt.pc_dain;
        return lista && lista.length === 2 && lista[0].xp === 7 && lista[1].oc && b && j((b.estado.apt || []).map(x => [x.id, x.n, x.d, x.nv, Object.keys(x).length])) === j([[ids[0], 'Rastreio', 'Descrição de Rastreio', 1, 4]]); }),
        'no banco: a lista inteira no documento do mestre; na ficha, só a Rastreio, sem barra e sem texto');
    });
    await passo('o jogador vê', async () => {
      await G.locator('#ficha [data-abaficha="aptidoes"]').click(); await w(300, J);
      ok(await ate(async () => /Rastreio/.test(await G.locator('#painelApt').innerText())), 'o jogador vê a Rastreio');
      const txt = await G.locator('#painelApt').innerText();
      ok(/Nível 1/.test(txt) && !/Sombra antiga/.test(txt) && !/XP/.test(txt) && !/Texto secreto/.test(txt) && await G.locator('[data-aptnova], [data-aptxp]').count() === 0, 'nome, descrição e nível; sem a secreta, sem a barra, sem o texto, sem botões');
      const tudo = await J.evaluate(() => JSON.stringify(TC.dados.col('personagens').todas()) + JSON.stringify(TC.dados.col('documentos').todas().map(d => d.id)));
      ok(!/Sombra antiga|Texto secreto|fichas:segredos/.test(tudo), 'no aparelho do jogador, a secreta e os textos não existem');
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
