// Lote 167: os Jogos de Tabuleiro numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre e um jogador.
//   · o banco: o jogador cria a parte dele numa partida, e não a de outra pessoa (nem com outro vis);
//   · o mestre convida o jogador para o Xadrez valendo 30 lapros: os 30 saem da ficha dele;
//   · o jogador vê o convite, aceita com o personagem dele (os 30 saem da ficha dele) e a mesa ao vivo fica sabendo;
//   · o "mate do pastor ao contrário" (f3, e5, g4, Dh4#): o jogador vence, recebe os 60 e a mesa ao vivo conta.
const { start, checker, espiarBanco } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const novo = async (name, o) => { const d = await t.device(Object.assign({ name }, o)); await espiarBanco(d.ctx); d.page.setDefaultTimeout(15000); return d.page; };
  const M = await novo('mestre', { seed: { 'tinycats:aba': 'jogos', 'tinycats-tour': '1' } }), J = await novo('jogador', { w: 1280, h: 880, seed: { 'tinycats:aba': 'jogos', 'tinycats-tour': '1' } });
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* abrindo */ } if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 300)); } };
  const quadro = async p => { for (let i = 0; i < 80; i++) { const f = p.frames().find(x => /\/jogos\//.test(x.url())); if (f && await f.evaluate(() => !!window.__jogos).catch(() => false)) return f; await p.waitForTimeout(250); } return null; };
  const lapros = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l && l.estado ? l.estado.lapros : null; }, id);
  const vivo = p => p.evaluate(() => document.getElementById('feed').innerText);
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(M, c.mestre, c.senha);
  const nomeT = 'Jogos ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeT);
  await J.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  const mesa = await M.evaluate(() => TC.mesas.atual.id), uidM = await M.evaluate(() => TC.conta.usuario.id), uidJ = await J.evaluate(() => TC.conta.usuario.id);
  try {
    await ate(async () => (await M.evaluate(() => TC.mesas.atual.membros.length)) === 2);
    // os personagens: o do mestre (sem dono) e o do jogador, com 100 lapros cada
    await M.evaluate(([d]) => {
      const P = TC.dados.col('personagens');
      P.gravar('pc_bruno', { nome: 'Velho Bruno', ficha: { nome: 'Velho Bruno' }, estado: { lapros: 100 }, vis: 'mesa', ordem: 0 });
      P.gravar('pc_dain', { nome: 'Dain', ficha: { nome: 'Dain' }, estado: { lapros: 100 }, dono_id: d, vis: 'mesa', ordem: 1 });
    }, [uidJ]);
    ok(await ate(async () => (await lapros(J, 'pc_dain')) === 100, 25000), 'a ficha do Dain chega ao jogador');
    // o banco
    const tentar = (p, id, vis) => p.evaluate(async ([m, id, vis, u]) => { const r = await window.__sb.from('documentos').insert({ mesa_id: m, id, dono_id: u, vis, dados: { papel: 'criador' } }); if (!r.error) await window.__sb.from('documentos').delete().eq('mesa_id', m).eq('id', id); return r.error ? 'recusado' : 'criou'; }, [mesa, id, vis, uidJ]);
    ok(await tentar(J, 'jogo:abcdefgh:' + uidJ, 'mesa') === 'criou', 'o jogador cria a parte dele numa partida');
    ok(await tentar(J, 'jogo:abcdefgh:' + uidM, 'mesa') === 'recusado', 'e não a de outra pessoa');
    ok(await tentar(J, 'jogo:abcdefgh:' + uidJ, 'mestre') === 'recusado', 'nem escondida da mesa');

    // o mestre convida
    const FM = await quadro(M); ok(!!FM, 'a aba abre para o mestre');
    await FM.locator('[data-k="on:xadrez"]').click();
    await FM.locator('[data-k="on:pc"]').selectOption('pc_bruno');
    await FM.locator('[data-k="ladoon:0"]').click();
    await FM.locator('[data-k="on:aposta"]').fill('30');
    await FM.locator('[data-k="on:convidar"]').click();
    await FM.locator('dialog[open] [data-k="dl:sim"]').click();
    ok(await ate(async () => (await lapros(M, 'pc_bruno')) === 70), 'os 30 saem da ficha do mestre');
    ok(await ate(async () => (await FM.locator('[data-k^="cancelar:"]').count()) === 1), 'o convite aparece como enviado');

    // o jogador aceita
    const FJ = await quadro(J); ok(!!FJ, 'a aba abre para o jogador');
    ok(await ate(async () => (await FJ.locator('[data-k^="aceitar:pc:"]').count()) === 1, 25000), 'o convite chega ao jogador');
    if (process.env.FOTOS) await J.screenshot({ path: process.env.FOTOS + '/l167-convite.png' });
    await FJ.locator('[data-k^="aceitar:pc:"]').selectOption('pc_dain');
    await FJ.locator('[data-k^="aceitar:"]:not(select)').click();
    await FJ.locator('dialog[open] [data-k="dl:sim"]').click();
    ok(await ate(async () => (await lapros(J, 'pc_dain')) === 70), 'os 30 saem da ficha do jogador');
    ok(await ate(async () => /começaram uma partida de Xadrez/.test(await vivo(M)), 25000), 'a mesa ao vivo fica sabendo do começo');

    // a partida: f3, e5, g4, Dh4#
    const lance = async (F, de, para) => { await F.locator(`[data-c="${de}"]:not([disabled])`).click({ timeout: 25000 }); await F.locator(`[data-c="${para}"]`).click(); };
    await FM.locator('[data-k^="abrir:"]').first().click({ timeout: 25000 });
    await lance(FM, 'f2', 'f3');
    await lance(FJ, 'e7', 'e5');
    await lance(FM, 'g2', 'g4');
    await lance(FJ, 'd8', 'h4');
    if (process.env.FOTOS) await J.screenshot({ path: process.env.FOTOS + '/l167-mate.png' });
    ok(/Dain \(Pretas\) venceu Velho Bruno \(Brancas\) no Xadrez \(xeque-mate, em 4 lances\)\. Levou 60 lapros\./.test(await FJ.locator('.status').innerText()), 'o jogador vê o fim: ' + await FJ.locator('.status').innerText());
    ok(await ate(async () => (await lapros(J, 'pc_dain')) === 130), 'quem venceu recebe os 60: ' + await lapros(J, 'pc_dain'));
    ok(await ate(async () => /Dain \(Pretas\) venceu Velho Bruno/.test(await vivo(M)), 25000), 'a mesa ao vivo conta o fim');
    ok(await ate(async () => /venceu/.test(await FM.locator('.status').innerText()), 25000), 'o mestre vê o fim');
    await M.waitForTimeout(1500);
    ok((await lapros(M, 'pc_bruno')) === 70, 'quem perdeu não recebe nada');
    const doc = await J.evaluate(([u]) => { const x = TC.dados.col('documentos').todas().find(l => l.id.startsWith('jogo:') && !l.id.startsWith('jogo:abcdefgh') && l.id.endsWith(u)); return x && x.dados; }, [uidJ]);
    ok(doc && doc.recebeu === true && doc.publicou === true, 'a parte do jogador marca o recebido e o aviso: ' + JSON.stringify(doc && { r: doc.recebeu, p: doc.publicou }));

    // (lote 169) o Destino de Hemvria: o jogador monta um baralho para o Dain (fica na ficha), o mestre convida com um
    // pronto, o jogador aceita com o dele; um lance de cada; o jogador desiste
    await FJ.locator('#voltar').click();
    await FJ.locator('[data-k="bar:novo:pc_dain"]').click();
    await FJ.locator('[data-k="bar:filtro:O"]').click();
    for (let i = 1; i <= 14; i++) await FJ.locator(`.grade-cartas [data-carta="O${i}"]`).click();
    await FJ.locator('[data-k="bar:filtro:M"]').click();
    await FJ.locator('.grade-cartas [data-carta="M17"]').click();
    await FJ.locator('[data-k="bar:nome"]').fill('Ouro do Dain');
    await FJ.locator('[data-k="bar:salvar"]').click();
    ok(await ate(async () => (await M.evaluate(() => { const l = TC.dados.col('personagens').pegar('pc_dain'); return l && l.estado && l.estado.hemvria && l.estado.hemvria.baralhos.length; })) === 1), 'o baralho do Dain fica na ficha dele (o mestre vê)');
    await FM.locator('#voltar').click();
    await FM.locator('[data-k="on:hemvria"]').click();
    await FM.locator('[data-k="on:pc"]').selectOption('pc_bruno');
    await FM.locator('[data-k="ladoon:0"]').click();
    await FM.locator('[data-k="on:aposta"]').fill('0');
    await FM.locator('[data-k="on:baralho"]').selectOption('pronto:E');
    await FM.locator('[data-k="on:convidar"]').click();
    ok(await ate(async () => (await FJ.locator('select[data-k^="aceitar:baralho:"]').count()) === 1, 25000), 'o convite do Destino de Hemvria chega, com a escolha do baralho');
    await FJ.locator('select[data-k^="aceitar:pc:"]').selectOption('pc_dain');
    await FJ.locator('select[data-k^="aceitar:baralho:"]').selectOption('meu:pc_dain:0');
    await FJ.locator('button[data-k^="aceitar:"]').click();
    ok(await ate(async () => (await FJ.locator('.hem-mao .carta').count()) === 5), 'o jogador vê a mesa e a mão dele (5 cartas)');
    ok((await FJ.locator('.hem-mao .carta.nO, .hem-mao [data-carta="M17"]').count()) === 5, 'a mão sai do baralho dele (Ouros e a Estrela)');
    await FM.locator('[data-k^="abrir:"]').first().click({ timeout: 25000 });
    ok(await ate(async () => (await FM.locator('.hem-mao .carta').count()) === 5), 'o mestre vê a mão dele');
    const joga = async F => { const ids = await F.locator('.hem-mao button.carta').evaluateAll(xs => xs.map(x => x.dataset.carta)); for (const id of ids) { await F.locator(`.hem-mao [data-carta="${id}"]`).click(); if (await F.locator('.hem-casa.alvo').count()) { await F.locator('.hem-casa.alvo').first().click(); return id; } await F.locator(`.hem-mao [data-carta="${id}"]`).click(); } return null; };
    const c1 = await joga(FM); ok(!!c1, 'o mestre joga uma carta: ' + c1);
    ok(await ate(async () => (await FJ.locator('.hem-mao .carta').count()) === 6 && (await FJ.locator('.hem-casa .carta').count()) === 1, 25000), 'o jogador vê a carta na mesa e compra uma');
    const c2 = await joga(FJ); ok(!!c2, 'o jogador joga: ' + c2);
    if (process.env.FOTOS) await J.screenshot({ path: process.env.FOTOS + '/l169-hemvria.png' });
    await FJ.locator('[data-k="on:desistir"]').click(); await FJ.locator('dialog[open] [data-k="dl:sim"]').click();
    ok(await ate(async () => /Velho Bruno \(Sol\) venceu Dain \(Lua\) no Destino de Hemvria \(desistência/.test(await vivo(M)), 25000), 'a mesa ao vivo conta o fim do Destino de Hemvria');
  } catch (e) { ok(false, 'erro: ' + (e && e.stack || e)); }
  finally {
    try { await apagarMesaTela(M, nomeT); } catch (e) { /* fica */ }
    const errs = t.errs.filter(x => !/Failed to load resource: the server responded with a status of (400|403|409)/.test(x));
    ok(!errs.length, 'sem erros no console: ' + errs.join('\n'));
    await t.close();
    end();
  }
})();
