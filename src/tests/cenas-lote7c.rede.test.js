// Lote 7, parte 4a (as famílias de cenas, as passagens e o gerador de lugares), numa mesa de verdade (banco local de
// ensaio ou o projeto real), com o mestre e uma jogadora em aparelhos separados:
//   · as famílias vão para a mesa, no índice das cenas (só do mestre): a jogadora não recebe; o mestre, em outro
//     aparelho, encontra a família (e os modelos do gerador, que também moram no índice);
//   · a vila gerada de noite, com chuva, no estilo oriental: o fundo vai para o Storage; a jogadora recebe as paredes,
//     as janelas, as luzes de dentro das casas, a noite e a chuva — e nada escrito;
//   · a passagem: aonde o objeto leva não chega à jogadora (nem com o objeto à mostra); o marcador oculto nem chega.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' };
  const M = (await t.device({ name: 'mestre', w: 1360, h: 900, seed })).page;
  const J = (await t.device({ name: 'jogador', w: 1300, h: 860, seed })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(250); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const indice = () => M.evaluate(() => { const l = TC.dados.col('documentos').pegar('cenas:indice'); return l && l.dados ? JSON.parse(JSON.stringify(l.dados)) : null; });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cenas L7C E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    await M.locator('#tab-cenas').click();
    let C = null, B = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre'); }, 40000), '(o mestre está nas Cenas da mesa)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }

    // ---------- as famílias, no índice da mesa ----------
    const ids = await C.evaluate(() => { const u = __tc, o = {}; for (const nm of ['Cidade de teste', 'Bairro de teste']) { const sc = u.newScene(nm); u.Store.addScene(sc); u.Persist.scene(sc.id); o[nm] = sc.id; } u.Persist.meta(); return o; });
    const cid = ids['Cidade de teste'], bai = ids['Bairro de teste'];
    await C.locator('#sceneBtn').click(); await w(300);
    await C.locator('.menu-i', { hasText: 'Organizar as cenas…' }).click(); await w(400);
    await C.locator('#org-c-' + bai).dragTo(C.locator('#org-c-' + cid)); await w(400);
    ok(await C.evaluate(([b, c]) => __tc.Store.S.pastas.mae[b] === c, [bai, cid]), 'o mestre arrasta o Bairro para cima da Cidade: ele fica dentro dela');
    ok(await ate(async () => { const ix = await indice(); return !!ix && !!ix.pastas && ix.pastas.mae && ix.pastas.mae[bai] === cid && await parado(M); }, 20000), 'a família vai para a mesa, no índice das cenas');
    ok(await J.evaluate(() => !TC.dados.col('documentos').pegar('cenas:indice')), 'o índice é só do mestre: a jogadora não recebe as famílias');
    await M.keyboard.press('Escape'); await w(200);
    await C.locator('#sceneBtn').click(); await w(300);
    ok(await C.locator('#mf-' + cid).count() === 1 && await C.locator('#mc-' + bai + '.filha').count() === 1, 'na lista de cenas, o Bairro vem dentro da Cidade');
    await foto(M, 'l7c-familia-mesa');
    await M.keyboard.press('Escape'); await w(200);

    // ---------- o gerador: um modelo e a vila de noite, com chuva ----------
    await C.locator('#sceneBtn').click(); await w(300);
    await C.locator('.menu-i', { hasText: 'Gerar um lugar…' }).click(); await w(800);
    ok(await C.locator('#ger-prev').count() === 1, '"Gerar um lugar…": a janela, com a prévia');
    await C.locator('#vila-tam button', { hasText: 'Vila' }).click(); await w(400);
    await C.locator('#ger-arredores button', { hasText: 'Nenhum' }).click(); await w(400);      // (lote 14, parte 14c: o lugar sozinho)
    await C.locator('#ger-est button', { hasText: 'Oriental' }).click(); await w(400);
    await C.locator('#ger-hora button', { hasText: 'Noite' }).click(); await w(150);
    await C.locator('#ger-clima button', { hasText: 'Chuva' }).click(); await w(150);
    await C.locator('#ger-guardar').click(); await w(200);
    await C.locator('#ger-modelo-nome').fill('Vila da mesa'); await C.locator('#ger-modelo-nome').press('Enter'); await w(400);
    const semente = +(await C.locator('#ger-semente').inputValue());
    ok(await ate(async () => { const ix = await indice(); return !!ix && ix.prefs && Array.isArray(ix.prefs.modelos) && ix.prefs.modelos.some(m => m.nome === 'Vila da mesa' && m.seed === semente && m.o.estilo === 'oriental') && await parado(M); }, 20000), 'o modelo vai para a mesa, no índice das cenas (com a semente e o estilo)');
    const plano = await C.evaluate(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado.plano)));
    await C.locator('#ger-nome').fill('Vila oriental de teste');
    const nCenas = await C.evaluate(() => __tc.Store.S.order.length);
    await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
    ok(await ate(async () => await C.evaluate(n => __tc.Store.S.order.length === n + 1 && __tc.Store.scene().name === 'Vila oriental de teste' && !document.querySelector('#ger-prev'), nCenas), 40000), 'Criar a cena: a vila nova abre');
    const vila = await C.evaluate(() => { const u = __tc, sc = u.Store.scene(); return { id: sc.id, paredes: sc.walls.length, janelas: sc.walls.filter(x => x.k === 'window').length, luzes: sc.lights.length, tone: sc.tone, clima: sc.weather.k, textos: sc.shapes.filter(x => x.k === 'text').length, lanternas: sc.tokens.filter(x => x.prop === 'lanterna').length, fundo: (u.Store.S.assets[sc.bg.asset] || {}).url || '' }; });
    const pastaMesa = await M.evaluate(() => TC_CONFIG.url + '/storage/v1/object/public/mesas/' + TC.mesas.atual.id + '/');
    ok(vila.luzes === plano.casas.length && vila.janelas >= plano.casas.length && vila.tone === 'noite' && vila.clima === 'chuva' && vila.textos === 0 && vila.lanternas >= 4 && vila.fundo.startsWith(pastaMesa),
      'a vila: uma luz em cada casa, as janelas, a noite e a chuva, as lanternas de papel da praça, nada escrito — e o fundo pintado vira um arquivo na pasta da mesa: ' + JSON.stringify(Object.assign({}, vila, { fundo: vila.fundo.slice(-20) })));
    // a passagem: uma Entrada à mostra, ligada à Cidade, e uma oculta
    const pas = await C.evaluate(c => {
      const u = __tc, sc = u.Store.scene(), a = u.Props.novo(sc, 'entrada', 2 * 64, 2 * 64, 1, false), b = u.Props.novo(sc, 'saida', 4 * 64, 2 * 64, 1, false);
      a.hidden = false; a.cena = c; b.cena = c;
      u.Store.tx('Passagens', () => { u.Store.add('tokens', a); u.Store.add('tokens', b); });
      return { vis: a.id, oculta: b.id };
    }, cid);
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    await J.evaluate(() => { const v = document.getElementById('vivo'); if (!v.hidden) document.getElementById('vivoX').click(); }); await w(300, J);
    await J.locator('#tab-cenas').click();
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && __tc.Store.S.current === id, vila.id); }, 40000), 'a jogadora passa a ver a vila');
    await J.waitForTimeout(800);
    if (await B.locator('.modal').count()) { await J.keyboard.press('Escape'); await w(300, J); }
    const vj = await B.evaluate(() => { const u = __tc, sc = u.Store.scene(); return { paredes: sc.walls.length, janelas: sc.walls.filter(x => x.k === 'window').length, luzes: sc.lights.length, tone: sc.tone, clima: sc.weather.k, textos: sc.shapes.filter(x => x.k === 'text').length }; });
    ok(vj.paredes === vila.paredes && vj.janelas === vila.janelas && vj.luzes === vila.luzes && vj.tone === 'noite' && vj.clima === 'chuva' && vj.textos === 0, 'com as mesmas paredes e janelas, as luzes das casas, a noite e a chuva: ' + JSON.stringify(vj));
    ok(await ate(async () => await B.evaluate(([v, o]) => { const a = __tc.Store.get('tokens', v); return !!a && a.prop === 'entrada' && !('cena' in a) && !__tc.Store.get('tokens', o); }, [pas.vis, pas.oculta]), 20000), 'a Entrada à mostra chega sem dizer aonde leva; a Saída oculta nem chega');
    ok(await ate(async () => await B.evaluate(() => __tc.Render.stats.frames > 0 && !(__tc.Render.stats.fail > 0)), 20000), 'a vila desenha na tela da jogadora');
    await foto(J, 'l7c-vila-jogadora');

    // ---------- outro aparelho do mestre: a família e o modelo estão na mesa ----------
    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok')), '(tudo salvo)');
    {
      const d2 = await t.device({ name: 'mestre2', seed }), M2 = d2.page;
      await M2.goto(t.base + '?debug', { waitUntil: 'load' }); await M2.waitForTimeout(1500);
      await loginTela(M2, c.mestre, c.senha);
      await M2.evaluate(async nome => { const m = (await TC.mesas.lista()).find(x => x.nome === nome); await TC.mesas.abrir(m.id); }, nomeMesa);
      await M2.waitForTimeout(800);
      if (await M2.locator('dialog[open]').count()) { await M2.keyboard.press('Escape'); await M2.waitForTimeout(300); }
      await M2.locator('#tab-cenas').click();
      let C2 = null;
      ok(await ate(async () => { C2 = await quadro(M2, /\/cenas\//); return C2 && await C2.evaluate(([b, c]) => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && !!__tc.Store.S.pastas && __tc.Store.S.pastas.mae[b] === c && (__tc.Store.S.prefs.modelos || []).some(m => m.nome === 'Vila da mesa'), [bai, cid]); }, 40000),
        'o mestre, em outro aparelho, encontra o Bairro dentro da Cidade e o modelo "Vila da mesa" (estão na mesa, não no navegador)');
      await d2.ctx.close();
    }

    await M.locator('#tab-fichas').click(); await w(500);
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await M.keyboard.press('Escape'); await M.evaluate(async () => { if (TC.mesas.atual) await TC.mesas.apagar(); }); } catch (e) { console.log('(a mesa de teste não pôde ser apagada: ' + String(e.message).split('\n')[0] + ')'); } }
  }
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
