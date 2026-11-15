// Lote 163: os bônus da conta (cor e tamanho), numa mesa de verdade.
//   · as regras (TC.bonus): dar, gastar, tirar, plural, sem bônus;
//   · o mestre dá pelo menu "Bônus dos jogadores…"; o jogador vê em "Meus bônus…" e gasta (some);
//   · o banco não deixa o jogador aumentar os bônus dele nem criar o documento;
//   · ao encerrar uma campanha, a janela "Bônus por zerar" dá os bônus aos jogadores dela.
const { start, checker, espiarBanco } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const B = require('../../tc/bonus.js');
const { ok, end } = checker();
// 1) as regras
{
  let r = B.mudar(null, { q: 'deu', itens: [{ cor: 'vermelho', tam: 'grande', qt: 2 }, { cor: 'dourado', tam: 'supremo', qt: 1 }], nota: 'Zerou a Saga 1' });
  ok(r.ok && B.total(r.dados) === 3 && B.qtd(r.dados, 'vermelho', 'grande') === 2, 'dar vários de uma vez');
  ok(B.textoHist(r.dados.hist[0]) === 'Ganhou 2 bônus vermelhos grandes — Zerou a Saga 1', 'o plural: ' + B.textoHist(r.dados.hist[0]));
  const g = B.mudar(r.dados, { q: 'gastou', cor: 'dourado', tam: 'supremo' });
  ok(g.ok && B.qtd(g.dados, 'dourado', 'supremo') === 0 && !('dourado:supremo' in g.dados.n) && B.total(r.dados) === 3, 'gastar: o bônus some (o de antes não muda)');
  ok(!B.mudar(g.dados, { q: 'gastou', cor: 'dourado', tam: 'supremo' }).ok && !B.mudar(g.dados, { q: 'tirou', cor: 'vermelho', tam: 'grande', qt: 3 }).ok, 'sem o bônus, não gasta nem tira');
  ok(!B.mudar(null, { q: 'deu', cor: 'verde', tam: 'grande' }).ok && B.CORES.length === 5 && B.TAMANHOS.length === 4, 'só as 5 cores e os 4 tamanhos');
}
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const novo = async (name, o) => { const d = await t.device(Object.assign({ name }, o)); await espiarBanco(d.ctx); d.page.setDefaultTimeout(15000); return d.page; };
  const TM = await novo('mestre'), TA = await novo('jogador', { w: 1280, h: 860 });
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* abrindo */ } if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 300)); } };
  const avisos = async p => (await p.locator('#toasts .toast').allInnerTexts()).join(' | ');
  const abrirMenu = async p => { if (await p.locator('#menu').isHidden()) await p.locator('#btnConta').click(); await p.locator('#menu').waitFor({ state: 'visible' }); await p.waitForTimeout(200); };
  await TM.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(TM, c.mestre, c.senha);
  const nomeT = 'Bonus ' + Date.now().toString(36);
  const codigo = await criarMesaTela(TM, nomeT);
  await TA.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(TA, c.jog1, c.senha); await entrarMesaTela(TA, codigo, 'Dalmo');
  const mesa = await TM.evaluate(() => TC.mesas.atual.id), uidA = await TA.evaluate(() => TC.conta.usuario.id);
  const doBanco = () => TM.evaluate(async ([m, u]) => { const r = await window.__sb.from('documentos').select('dados').eq('mesa_id', m).eq('id', 'bonus:' + u).maybeSingle(); if (!r.data) return null; const n = r.data.dados.n; return Object.fromEntries(Object.keys(n).sort().map(k => [k, n[k]])); }, [mesa, uidA]);
  try {
    await ate(async () => (await TM.evaluate(() => TC.mesas.atual.membros.length)) === 2);
    // o jogador não cria o documento sozinho
    const criou = await TA.evaluate(async ([m, u]) => { const r = await window.__sb.from('documentos').insert({ mesa_id: m, id: 'bonus:' + u, dono_id: u, vis: 'mestre', dados: { n: { 'dourado:supremo': 9 } } }); return r.error ? 'recusado' : 'criou'; }, [mesa, uidA]);
    ok(criou === 'recusado', 'o jogador não cria bônus para si: ' + criou);
    // o mestre dá
    await abrirMenu(TM); await TM.locator('#mn-bonus').click(); await TM.locator('#f-bonus-m').waitFor();
    ok(/Bônus dos jogadores/.test(await TM.locator('#f-bonus-m h2').innerText()) && await TM.locator('#f-bonus-m .bn-quem [data-uid]').count() === 1, 'a janela do mestre, com o jogador');
    await TM.locator('#bn-dar [data-k="vermelho:grande"]').fill('2');
    await TM.locator('#bn-dar [data-k="roxo:pequeno"]').fill('1');
    await TM.locator('#bn-nota').fill('Zerou o prólogo');
    await TM.locator('#bn-dar-ok').click();
    ok(await ate(async () => /Dalmo ganhou 3 bônus/.test(await avisos(TM))), 'o aviso: ' + await avisos(TM));
    ok(await ate(async () => JSON.stringify(await doBanco()) === JSON.stringify({ 'roxo:pequeno': 1, 'vermelho:grande': 2 })), 'no banco: ' + JSON.stringify(await doBanco()));
    ok(/×2/.test(await TM.locator('#bn-dele tr[data-cor="vermelho"] td[data-tam="grande"]').innerText()), 'a tabela dele mostra ×2');
    await TM.keyboard.press('Escape');
    // o jogador vê e gasta
    ok(await ate(async () => (await TA.evaluate(() => { const l = TC.dados.col('documentos').pegar('bonus:' + TC.conta.usuario.id); return l ? TC.bonus.total(l.dados) : 0; })) === 3, 25000), 'o documento chega ao jogador');
    await abrirMenu(TA);
    ok(await TA.locator('#mn-bonus').innerText() === 'Meus bônus…', 'o jogador tem "Meus bônus…"');
    await TA.locator('#mn-bonus').click(); await TA.locator('#f-bonus').waitFor();
    ok(/Você tem 3 bônus/.test(await TA.locator('#f-bonus').innerText()) && /Ganhou 2 bônus vermelhos grandes — Zerou o prólogo/.test(await TA.locator('#f-bonus .bn-hist').innerText()), 'ele vê os 3 e a história');
    await TA.locator('[data-gastar="vermelho:grande"]').click();
    await TA.locator('dialog[open] button[type="submit"]').click();
    ok(await ate(async () => JSON.stringify(await doBanco()) === JSON.stringify({ 'roxo:pequeno': 1, 'vermelho:grande': 1 })), 'gastar: some 1 no banco — ' + JSON.stringify(await doBanco()));
    // o jogador não aumenta
    const subiu = await TA.evaluate(async ([m, u]) => { const r = await window.__sb.from('documentos').update({ dados: { n: { 'vermelho:grande': 5, 'roxo:pequeno': 1 }, hist: [] } }).eq('mesa_id', m).eq('id', 'bonus:' + u); return r.error ? 'recusado' : 'mudou'; }, [mesa, uidA]);
    ok(subiu === 'recusado' && JSON.stringify(await doBanco()) === JSON.stringify({ 'roxo:pequeno': 1, 'vermelho:grande': 1 }), 'o banco não deixa o jogador aumentar: ' + subiu);
    ok(await ate(async () => /Dalmo gastou 1 bônus vermelho grande/.test(await avisos(TM)), 75000), 'o mestre fica sabendo: ' + await avisos(TM));
    if (process.env.FOTOS) { await TA.keyboard.press('Escape'); await abrirMenu(TA); await TA.locator('#mn-bonus').click(); await TA.waitForTimeout(400); await TA.locator('#f-bonus').screenshot({ path: process.env.FOTOS + '/l163-meus.png' }); }
    await TA.keyboard.press('Escape');
    // ao encerrar a campanha
    await TM.evaluate(() => TC.mesas.criarCampanha('Saga 1', true));
    await ate(async () => (await TM.evaluate(() => TC.mesas.atual.campanhas.length)) === 1);
    const camp = await TM.evaluate(() => TC.mesas.atual.campanhas[0].id);
    await TM.evaluate(c => TC.mesas.participar(c, TC.mesas.atual.membros.find(m => m.cargo !== 'mestre').usuario_id, true), camp).catch(() => {});
    await abrirMenu(TM); await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    await TM.locator(`#cp-lista .cpl[data-camp="${camp}"] [data-a="encerrar"]`).click();
    await TM.locator('dialog[open] button[type="submit"]').click();
    ok(await ate(async () => await TM.locator('#f-bonus-camp').isVisible()), 'ao encerrar, a janela "Bônus por zerar"');
    ok((await TM.locator('#bn-camp-nota').inputValue()) === 'Zerou Saga 1' && await TM.locator('#f-bonus-camp .bn-pessoa').count() === 1, 'com o jogador e o motivo pronto');
    await TM.locator(`#bn-camp-${uidA} [data-k="dourado:supremo"]`).fill('1');
    if (process.env.FOTOS) await TM.locator('#f-bonus-camp').screenshot({ path: process.env.FOTOS + '/l163-camp.png' });
    await TM.locator('#f-bonus-camp button[type="submit"]').click();
    ok(await ate(async () => (await doBanco() || {})['dourado:supremo'] === 1), 'o dourado supremo foi para a conta: ' + JSON.stringify(await doBanco()));
  } catch (e) { ok(false, 'falhou: ' + String(e.message).split('\n').slice(0, 3).join(' ')); }
  finally { try { await TM.keyboard.press('Escape'); await apagarMesaTela(TM, nomeT); } catch (e) { console.log('(não apagou a mesa de teste: ' + e.message.split('\n')[0] + ')'); } }
  await t.close(); end();
})();
