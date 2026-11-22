// Lote 201: a conferência leve do que deixou de ser visível (migração 0049, tc.js dadosConferir).
//   · o jogador vê duas fichas; o mestre esconde uma; ela some da tela do jogador;
//   · a conferência vai pela função conferir_vivos (mandando os ids que o jogador tem), e não baixa mais a lista
//     inteira de ids da mesa a cada volta.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const ficha = nome => ({ nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', recursos: [{ id: 'hp', nome: 'HP', fml: '100' }], itens: [] });
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'fichas' };
  const M = (await t.device({ name: 'mestre', seed })).page;
  const J = (await t.device({ name: 'jogador', seed })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const pedidos = { rpc: 0, lista: 0 };
  J.on('request', r => {
    const u = r.url();
    if (/\/rest\/v1\/rpc\/conferir_vivos/.test(u)) pedidos.rpc++;
    if (/\/rest\/v1\/(documentos|personagens)\?select=id&/.test(u) && /apagado=eq\.false/.test(u)) pedidos.lista++;
  });
  await M.goto(t.base, { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Conferencia L201 ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base, { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    const base = { skills: { arvores: [], pontos: {}, alocados: {} }, estado: {} };
    await M.evaluate(([b, fa, fb]) => {
      const P = TC.dados.col('personagens');
      P.gravar('pc_a', Object.assign({}, b, { nome: 'Aberta', ficha: fa, vis: 'mesa', dono_id: null, ordem: 0 }));
      P.gravar('pc_b', Object.assign({}, b, { nome: 'Vai sumir', ficha: fb, vis: 'mesa', dono_id: null, ordem: 1 }));
    }, [base, ficha('Aberta'), ficha('Vai sumir')]);
    const tem = id => J.evaluate(id => { try { return !!TC.dados.col('personagens').pegar(id); } catch (e) { return false; } }, id);
    ok(await ate(async () => (await tem('pc_a')) && (await tem('pc_b')), 30000), 'o jogador recebe as duas fichas');
    pedidos.rpc = 0; pedidos.lista = 0;
    await M.evaluate(() => { const P = TC.dados.col('personagens'); P.gravar('pc_b', Object.assign({}, P.pegar('pc_b'), { vis: 'mestre' })); });
    ok(await ate(async () => !(await tem('pc_b')) && (await tem('pc_a')), 60000), 'o mestre esconde uma: ela some do aparelho do jogador, e a outra fica');
    ok(pedidos.rpc >= 1, `a conferência foi pela função conferir_vivos (${pedidos.rpc} vezes)`);
    ok(pedidos.lista === 0, `sem baixar a lista inteira de ids (${pedidos.lista} vezes)`);
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await M.evaluate(async () => { if (TC.mesas.atual) await TC.mesas.apagar(); }); } catch (e) { console.log('(a mesa de teste não pôde ser apagada)'); } }
  }
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
