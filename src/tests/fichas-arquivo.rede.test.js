// Lote 162: o Arquivo das fichas numa mesa de verdade (mestre e um jogador).
//   · ao encerrar a campanha, "Arquivar as fichas desta campanha" marca as fichas dela (ficha.arquivo, junto: true);
//   · as arquivadas somem das listas dos sistemas (TC.dados todas()), mas continuam pegáveis pelo id;
//   · nas Fichas, a seção Arquivo: o mestre vê todas, o jogador só a dele (sem os botões);
//   · reabrir a campanha traz de volta as que foram com ela; o mestre arquiva uma ficha sozinha pelo "⋯".
const { start, checker, espiarBanco } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const novo = async (name, o) => { const d = await t.device(Object.assign({ name }, o)); await espiarBanco(d.ctx); d.page.setDefaultTimeout(15000); return d.page; };
  const TM = await novo('mestre'), TA = await novo('jogador', { w: 1280, h: 860 });
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* abrindo */ } if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 300)); } };
  const avisos = async p => (await p.locator('#toasts .toast').allInnerTexts()).join(' | ');
  const abrirMenu = async p => { if (await p.locator('#menu').isHidden()) await p.locator('#btnConta').click(); await p.locator('#menu').waitFor({ state: 'visible' }); await p.waitForTimeout(200); };
  const aba = async (p, id) => {
    await p.locator('#tab-' + id).click();
    let f = null;
    await ate(async () => { f = p.frames().find(x => x !== p.mainFrame() && new RegExp('/' + id + '/').test(x.url())) || null; return !!f && await f.evaluate(() => typeof FichasMesa === 'object' && FichasMesa.ativo()); });
    await p.waitForTimeout(800);
    return f;
  };
  const noBanco = (fn, arg) => TM.evaluate(fn, arg);
  await TM.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(TM, c.mestre, c.senha);
  const nomeT = 'Arquivo ' + Date.now().toString(36);
  const codigo = await criarMesaTela(TM, nomeT);
  await TA.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(TA, c.jog1, c.senha); await entrarMesaTela(TA, codigo, 'Dalmo');
  const mesa = await TM.evaluate(() => TC.mesas.atual.id), uidA = await TA.evaluate(() => TC.conta.usuario.id);
  const arqDe = () => noBanco(async mesa => Object.fromEntries(((await window.__sb.from('personagens').select('id,ficha').eq('mesa_id', mesa).order('id')).data || []).map(l => [l.id, l.ficha && l.ficha.arquivo ? (l.ficha.arquivo.junto ? 'junto' : 'só') : '-'])), mesa);
  try {
    const erro = await noBanco(async ([mesa, a]) => {
      const r = await window.__sb.from('personagens').insert([
        { mesa_id: mesa, id: 'pc_a', nome: 'Selene', dono_id: a, vis: 'mesa', ordem: 1, ficha: { nome: 'Selene', grupo: 'Heróis' }, estado: {} },
        { mesa_id: mesa, id: 'npc', nome: 'Guarda', vis: 'mesa', ordem: 2, ficha: { nome: 'Guarda', grupo: '' }, estado: {} },
      ]);
      return r.error ? r.error.message : null;
    }, [mesa, uidA]);
    ok(!erro, 'duas fichas na mesa' + (erro ? ' — ' + erro : ''));
    // a campanha, com as fichas que a mesa tinha
    await TM.evaluate(() => TC.mesas.criarCampanha('Saga 1', true));
    ok(await ate(async () => (await TM.evaluate(() => TC.mesas.atual.campanhas.length)) === 1 && (await TA.evaluate(() => TC.mesas.atual.campanhas.length)) === 1), 'a campanha Saga 1, com as duas fichas');
    const camp = await TM.evaluate(() => TC.mesas.atual.campanhas[0].id);
    ok(await ate(async () => (await TM.evaluate(() => TC.dados.col('personagens').todas().filter(l => l.campanha).length)) === 2), '(as fichas já são da campanha)');
    // encerrar, arquivando
    await abrirMenu(TM); await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    await TM.locator(`#cp-lista .cpl[data-camp="${camp}"] [data-a="encerrar"]`).click();
    await TM.locator('#enc-arq').waitFor();
    ok(!(await TM.locator('#enc-arq').isChecked()) && /Arquivar as 2 fichas desta campanha/.test(await TM.locator('dialog[open]').innerText()), 'encerrar oferece arquivar as 2 fichas (desmarcado)');
    await TM.locator('#enc-arq').check();
    await TM.locator('dialog[open] button[type="submit"]').click();
    ok(await ate(async () => /2 fichas foram para o Arquivo/.test(await avisos(TM))), 'o aviso: ' + await avisos(TM));
    ok(await ate(async () => JSON.stringify(await arqDe()) === JSON.stringify({ npc: 'junto', pc_a: 'junto' })), 'no banco: as duas arquivadas com a campanha — ' + JSON.stringify(await arqDe()));
    ok(await TM.evaluate(() => TC.dados.col('personagens').todas().length === 0 && TC.dados.col('personagens').todas({ arquivo: true }).length === 2 && !!TC.dados.col('personagens').pegar('pc_a')), 'as listas dos sistemas não trazem as arquivadas (mas pegar pelo id continua)');
    await TM.keyboard.press('Escape');
    // nas Fichas
    let F = await aba(TM, 'fichas');
    ok(await ate(async () => (await F.locator('#lista .bloco.arquivo .cnt').innerText()) === '2'), 'nas Fichas do mestre, o Arquivo com 2');
    ok(await F.evaluate(() => [...document.querySelectorAll('#lista > li:not(.arquivo) [data-abrir]')].length) === 0, 'e nenhuma no elenco');
    const FA = await aba(TA, 'fichas');
    ok(await ate(async () => (await FA.locator('#lista .bloco.arquivo .cnt').innerText()) === '1'), 'o jogador vê só a dele no Arquivo');
    await FA.locator('[data-arqtoggle]').click(); await TA.waitForTimeout(300);
    await FA.locator('#lista .arqitens [data-abrir="pc_a"]').click(); await TA.waitForTimeout(500);
    ok(await FA.locator('#ficha .arq-aviso').isVisible() && await FA.locator('#ficha [data-arq]').count() === 0, 'a ficha dele abre no Arquivo, sem os botões do mestre');
    // reabrir: voltam
    await abrirMenu(TM); await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    await TM.locator(`#cp-lista .cpl[data-camp="${camp}"] [data-a="reabrir"]`).click();
    ok(await ate(async () => /2 fichas voltaram do Arquivo/.test(await avisos(TM))), 'reabrir traz as duas de volta: ' + await avisos(TM));
    ok(await ate(async () => JSON.stringify(await arqDe()) === JSON.stringify({ npc: '-', pc_a: '-' })), 'no banco: sem marca');
    await TM.keyboard.press('Escape');
    // arquivar uma ficha só, pelo "⋯"
    F = await aba(TM, 'fichas');
    await ate(async () => (await F.locator('#lista [data-abrir="npc"]').count()) === 1);
    await F.locator('#lista [data-abrir="npc"]').click(); await TM.waitForTimeout(400);
    await F.evaluate(() => { document.getElementById('fmais').open = true; }); await F.locator('[data-act="arquivar"]').click();
    ok(await ate(async () => (await arqDe()).npc === 'só'), 'o mestre arquiva o Guarda sozinho: ' + JSON.stringify(await arqDe()));
    ok(await ate(async () => (await TA.evaluate(() => TC.dados.col('personagens').todas().map(l => l.id).join(','))) === 'pc_a'), 'e ele some das listas do jogador também');
    // desarquivar pelo aviso da ficha
    if (await F.locator('#lista .arqitens').isHidden()) await F.locator('[data-arqtoggle]').click();
    await F.locator('#lista .arqitens [data-abrir="npc"]').click(); await TM.waitForTimeout(400);
    await F.locator('[data-arq="desarquivar"]').click();
    ok(await ate(async () => (await arqDe()).npc === '-'), 'Desarquivar tira a marca no banco');
  } catch (e) { ok(false, 'falhou: ' + String(e.message).split('\n').slice(0, 3).join(' ')); }
  finally { try { await TM.keyboard.press('Escape'); await apagarMesaTela(TM, nomeT); } catch (e) { console.log('(não apagou a mesa de teste: ' + e.message.split('\n')[0] + ')'); } }
  await t.close(); end();
})();
