// Lote 200 (as Cenas), numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre e um jogador:
//   · o jogador anda com o token passo a passo, depressa: os pedidos vão juntos (poucas gravações do documento de pedidos,
//     não uma por passo) e o mestre aplica todos, na ordem — o token chega aonde o jogador parou;
//   · depois que o mestre confirma, o jogador não grava de novo na hora só para tirar da fila o que já foi aplicado: a
//     limpeza espera alguns segundos (ou vai junto com o próximo pedido).
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' };
  const M = (await t.device({ name: 'mestre', seed })).page;
  const J = (await t.device({ name: 'jogador', w: 1300, h: 860, seed })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(250); } };
  // as gravações do documento de pedidos que saem do aparelho do jogador
  const gravacoes = [];
  J.on('request', r => { if (/\/rest\/v1\/documentos/.test(r.url()) && /cena%3Apedido|cena:pedido/.test(r.url() + (r.postData() || '')) && r.method() !== 'GET') gravacoes.push(Date.now()); });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cenas L200 ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    const jogId = await J.evaluate(() => TC.conta.usuario.id);
    await M.locator('#tab-cenas').click();
    let C = null, B = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && __tc.Store.S.players.some(p => p.id === id), jogId); }, 40000), '(o mestre está nas Cenas, com o jogador da mesa)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
    const tokId = await C.evaluate(uid => {
      const u = __tc, sc = u.Store.scene(), cl = sc.cell;
      const a = u.newToken(sc, cl * 3, cl * 3, { name: 'Selene', owner: uid });
      u.Store.tx('Criar', () => u.Store.add('tokens', a));
      return a.id;
    }, jogId);
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    await J.locator('#tab-cenas').click();
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !!__tc.Store.get('tokens', id), tokId); }, 40000), 'o jogador vê a cena no ar, com o token dele');
    if (await B.locator('.modal').count()) { await J.keyboard.press('Escape'); await w(300, J); }
    await w(3000, J);                                        // (o que a abertura grava fica para trás)

    // ---------- andar passo a passo, depressa ----------
    gravacoes.length = 0;
    const PASSOS = 12;
    const fim = await B.evaluate(async ([id, n]) => {
      const u = __tc, cl = u.Store.scene().cell;
      let x = u.Store.get('tokens', id).x;
      for (let i = 0; i < n; i++) { x += cl; u.Store.tx('Mover', () => u.Store.upd('tokens', id, { x })); await new Promise(r => setTimeout(r, 100)); }
      return x;
    }, [tokId, PASSOS]);
    await w(1500, J);
    ok(gravacoes.length >= 1 && gravacoes.length <= 3, `${PASSOS} passos em 1,2 s viram poucas gravações de pedido (${gravacoes.length}), não uma por passo`);
    ok(await ate(async () => await C.evaluate(([id, x]) => __tc.Store.get('tokens', id).x === x, [tokId, fim]), 15000), 'o mestre aplica todos os passos: o token chega aonde o jogador parou');
    ok(await ate(async () => await B.evaluate(([id, x]) => __tc.Store.get('tokens', id).x === x, [tokId, fim]), 15000), '…e o jogador vê o token lá');

    // ---------- a confirmação não regrava na hora ----------
    const t0 = Date.now();
    await w(3000, J);
    ok(gravacoes.filter(x => x > t0).length === 0, 'depois da confirmação do mestre, nenhuma gravação nos 3 s seguintes ');

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
