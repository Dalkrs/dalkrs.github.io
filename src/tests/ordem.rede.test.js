// A mesa ao vivo e as linhas que aparecem no banco fora de ordem (projeto real).
// A leitura periódica pede "o que tem revisão maior que a última que vi". Duas linhas escritas no mesmo instante podem
// ficar visíveis fora de ordem — a de revisão menor depois da de revisão maior —, e a menor ficava para trás para
// sempre: a rolagem de um jogador que nunca aparecia no painel do mestre (até recarregar a página).
// Aqui o atraso é provocado de propósito: a resposta do banco à leitura do mestre sai sem uma das linhas, como se
// ela ainda não estivesse visível. Na leitura seguinte ela tem de chegar.
//   · durante o jogo: duas mensagens seguidas, a primeira "atrasada";
//   · ao abrir a mesa: a linha mais nova "atrasada" bem na hora em que o painel é lido.
// E um terceiro jeito de uma linha ficar para trás, sem atraso nenhum: quem fala assim que abre a mesa, logo depois
// de outra pessoa. A volta da própria gravação traz uma revisão alta; se ela empurrasse a marca de "até onde já li",
// a fala da outra pessoa (revisão menor, ainda não lida) nunca mais seria pedida.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const semTour = { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' };
  const dM = await t.device({ name: 'mestre', seed: semTour }), M = dM.page;
  const J = (await t.device({ name: 'jogador', w: 1200, h: 820, seed: semTour })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* página recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(300); } };
  const falas = p => p.evaluate(() => TC.aoVivo.itens.filter(l => l.tipo === 'fala').map(l => l.dados.texto));

  /* O banco responde à leitura do mestre SEM a linha cujo texto está em `some` (uma vez só): como se ela ainda não
     estivesse visível. `onde`: 'periodica' (rev maior que…) ou 'abrir' (as últimas linhas, ao abrir a mesa). */
  const atraso = { texto: null, onde: null, feito: 0 };
  await dM.ctx.route(u => /\/rest\/v1\/registro\?/.test(String(u)), async route => {
    const rq = route.request(), url = decodeURIComponent(rq.url());
    const periodica = /[?&]rev=gt\./.test(url) && /[?&]select=\*/.test(url), abrir = /[?&]order=criado_em\.desc/.test(url) && /[?&]select=\*/.test(url);
    if (rq.method() !== 'GET' || !atraso.texto || !((atraso.onde === 'periodica' && periodica) || (atraso.onde === 'abrir' && abrir))) return route.continue();
    const resp = await route.fetch();
    let linhas; try { linhas = await resp.json(); } catch (e) { return route.fulfill({ response: resp }); }
    if (!Array.isArray(linhas) || !linhas.some(l => l && l.dados && l.dados.texto === atraso.texto)) return route.fulfill({ response: resp });
    atraso.feito++; const texto = atraso.texto; atraso.texto = null;
    return route.fulfill({ response: resp, json: linhas.filter(l => !(l && l.dados && l.dados.texto === texto)) });
  });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Ordem E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    // ---------- falar assim que abre a mesa, logo depois de outra pessoa ----------
    // (a mesa ainda não tem conversa nenhuma, e o jogador ainda não fez a primeira leitura periódica)
    await M.evaluate(() => TC.aoVivo.fala('chegou alguém'));
    await J.evaluate(() => TC.aoVivo.fala('aquecimento'));
    ok(await ate(async () => (await falas(M)).includes('aquecimento')), '(a conversa chega do jogador ao mestre)');
    ok(await ate(async () => (await falas(J)).includes('chegou alguém'), 12000), 'quem fala assim que entra na mesa, logo depois de outra pessoa, não deixa de ver o que ela disse: ' + JSON.stringify(await falas(J)));
    ok(JSON.stringify(await falas(J)) === '["chegou alguém","aquecimento"]', 'e as duas falas ficam na ordem em que foram ditas');
    await w(3500);                                          // (uma volta da leitura periódica, para o mestre ficar em dia)

    // ---------- durante o jogo ----------
    atraso.texto = 'primeira'; atraso.onde = 'periodica';
    await J.evaluate(async () => { await TC.aoVivo.fala('primeira'); await TC.aoVivo.fala('segunda'); });
    ok(await ate(async () => (await falas(M)).includes('segunda')), 'a segunda mensagem chega ao mestre');
    ok(atraso.feito === 1, '(a primeira foi segurada uma vez na resposta do banco: ' + atraso.feito + ')');
    ok(await ate(async () => (await falas(M)).includes('primeira'), 15000), 'a primeira — que ficou visível depois, com revisão menor — chega na leitura seguinte: ' + JSON.stringify(await falas(M)));
    ok(JSON.stringify((await falas(M)).slice(-2)) === '["primeira","segunda"]', 'e aparece no lugar dela, antes da segunda');

    // ---------- ao abrir a mesa ----------
    await J.evaluate(() => TC.aoVivo.fala('bem na hora'));
    ok(await ate(async () => (await falas(M)).includes('bem na hora')), '(mais uma mensagem)');
    atraso.texto = 'bem na hora'; atraso.onde = 'abrir';
    await M.reload({ waitUntil: 'load' });
    ok(await ate(() => M.evaluate(() => !!(window.TC && TC.mesas && TC.mesas.atual) && TC.aoVivo.itens.length > 0), 30000), '(o mestre recarrega a página)');
    ok(atraso.feito === 2, '(a mais nova foi segurada na leitura de abertura: ' + atraso.feito + ')');
    ok(await ate(async () => (await falas(M)).includes('bem na hora'), 15000), 'a linha que não veio na leitura de abertura chega na primeira leitura periódica: ' + JSON.stringify(await falas(M)));
    ok(JSON.stringify(await falas(M)) === '["chegou alguém","aquecimento","primeira","segunda","bem na hora"]', 'e o painel fica completo e na ordem: ' + JSON.stringify(await falas(M)));
    await M.locator('#tab-fichas').click(); await w(400);
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
