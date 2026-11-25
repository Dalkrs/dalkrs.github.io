// Lote 175, as desvantagens e os vícios numa mesa de verdade (na aba Aptidões):
//   · a desvantagem: como a aptidão (a barra enche até "Piorar"); o jogador vê nome, descrição e nível;
//   · o vício: a necessidade sobe com os dias do Mapa-múndi no ritmo de cada um, avisa quando passa de faixa, o ⚠ na
//     aba, "Cumpriu…" baixa; o secreto e o ritmo não chegam ao jogador; ele vê o nome, a faixa e a barra.
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
  const nomeMesa = 'Vícios E2E ' + Date.now().toString(36);
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

    const mapaDia = dia => M.evaluate(d => TC.dados.col('documentos').gravar('mundo:mapa:tst', { dados: { id: 'tst', nome: 'Teste', cal: { dia: d } }, vis: 'mestre' }), dia);
    await mapaDia(3); await w(800);
    await passo('o mestre cria a desvantagem e os vícios', async () => {
      await F.locator('#ficha [data-abaficha="aptidoes"]').click(); await w(300);
      await F.locator('[data-dsvnova]').click(); await w(200); await F.locator('[data-dsvcriar]').click(); await w(200);
      await F.locator('[data-dsvn]').fill('Medo de altura'); await F.locator('[data-dsvd]').fill('Trava perto de beiradas.');
      await F.locator('[data-dsvmax]').fill('5'); await F.locator('[data-dsvtx="1"]').fill('−1 perto de altura');
      await F.locator('[data-dsvok]').click(); await w(400);
      const dv = await F.evaluate(() => FichasDesv.listaDe(S.personagens[0]));
      await F.locator(`[data-dsvconta="pc_dain|${dv[0].id}"]`).fill('+5'); await F.locator(`[data-dsvconta="pc_dain|${dv[0].id}"]`).press('Enter'); await w(400);
      ok(await F.locator(`[data-dsvsobe="pc_dain|${dv[0].id}"]`).innerText() === '▼ Piorar' && /▼1/.test(await F.locator('#abaficha-aptidoes').innerText()), 'a desvantagem: a barra cheia acende "▼ Piorar" e o ▼ na aba');
      await F.locator(`[data-dsvsobe="pc_dain|${dv[0].id}"]`).click(); await w(400);
      ok(await F.evaluate(() => FichasDesv.listaDe(S.personagens[0])[0].nv) === 2, 'piorou: nível 2');
      for (const [n, rit, bx, nec, oc] of [['Cigarro', '2', '4', '1', false], ['Jogo', '1', '5', '0', true]]) {
        await F.locator('[data-vicnova]').click(); await w(200); await F.locator('[data-viccriar]').click(); await w(200);
        await F.locator('[data-vicn]').fill(n); await F.locator('[data-vicd]').fill('Sobre ' + n);
        await F.locator('[data-vicrit]').fill(rit); await F.locator('[data-vicbx]').fill(bx); await F.locator('[data-vicnecv]').fill(nec);
        if (oc) await F.locator('[data-vicoc]').check();
        await F.locator('[data-vicok]').click(); await w(400);
      }
      ok(await ate(async () => { const s = await noBanco(M, 'documentos', 'fichas:segredos', mesa), b = await noBanco(M, 'personagens', 'pc_dain', mesa);
        const v = s && s.dados && s.dados.v && s.dados.v.vic && s.dados.v.vic.pc_dain, d = s && s.dados && s.dados.v && s.dados.v.desv && s.dados.v.desv.pc_dain;
        return v && v.length === 2 && v[0].rit === 2 && v[0].dia === 3 && v[1].oc && d && d[0].nv === 2 && b
          && j((b.estado.vic || []).map(x => Object.keys(x).sort())) === j([['d', 'g', 'id', 'n', 'nec']]) && b.estado.vic[0].nec === 1
          && j((b.estado.desv || []).map(x => [x.n, x.nv])) === j([['Medo de altura', 2]]); }),
        'no banco: as listas inteiras com o mestre; na ficha, só o Cigarro (sem ritmo) e a desvantagem (sem barra)');
    });
    await passo('os dias passam no Mapa-múndi', async () => {
      await mapaDia(5);
      ok(await ate(async () => (await F.evaluate(() => FichasVic.listaDe(S.personagens[0])[0].nec)) === 5), '2 dias × 2: o Cigarro foi de 1 para 5 (Inquieto), sozinho');
      await mapaDia(6);
      ok(await ate(async () => (await F.evaluate(() => FichasVic.listaDe(S.personagens[0])[0].nec)) === 7), 'mais um dia: 7');
      ok(await ate(async () => /Cigarro de Dain: Com fissura/.test(await F.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' ')))), 'o aviso: "Cigarro de Dain: Com fissura"');
      ok(/⚠1/.test(await F.locator('#abaficha-aptidoes').innerText()), 'o ⚠ na aba');
      ok(await F.evaluate(() => FichasVic.listaDe(S.personagens[0])[1].nec) === 3, 'o Jogo (1 por dia) também subiu: 3');
      if (process.env.TC_SCRATCH) await F.locator('#abafichac-aptidoes').screenshot({ path: require('path').join(process.env.TC_SCRATCH, 'l175-mestre.png') });
    });
    await passo('cumprir', async () => {
      const id = await F.evaluate(() => FichasVic.listaDe(S.personagens[0])[0].id);
      await F.locator(`[data-viccumpre="pc_dain|${id}"]`).click(); await w(300);
      ok(await F.locator('[data-vicbaixa]').inputValue() === '4', '"Cumpriu…" propõe o que o vício baixa (4)');
      await F.locator('[data-vicbaixaok]').click(); await w(500);
      ok(await F.evaluate(() => FichasVic.listaDe(S.personagens[0])[0].nec) === 3, 'baixou: 7 − 4 = 3 (Inquieto)');
    });
    await passo('o jogador vê', async () => {
      await G.locator('#ficha [data-abaficha="aptidoes"]').click(); await w(300, J);
      ok(await ate(async () => /Cigarro/.test(await G.locator('#painelVic').innerText()) && /Inquieto/.test(await G.locator('#painelVic').innerText())), 'o jogador vê o Cigarro, Inquieto');
      const txt = await G.locator('#abafichac-aptidoes').innerText();
      ok(!/Jogo/.test(txt) && !/por dia/.test(txt) && /Medo de altura/.test(txt) && /Nível 2/.test(txt) && await G.locator('[data-vicnova], [data-viccumpre], [data-dsvnova]').count() === 0, 'sem o secreto, sem o ritmo, sem botões; a desvantagem com o nível');
      if (process.env.TC_SCRATCH) await G.locator('#abafichac-aptidoes').screenshot({ path: require('path').join(process.env.TC_SCRATCH, 'l175-jogador.png') });
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
