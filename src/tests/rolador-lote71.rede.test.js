// Lote 71, o Rolador numa mesa de verdade (o mestre): "Da ficha", na Fixa — os personagens da mesa e os números de
// cada um (o total e a base); um clique põe o número no Atributo e o nome no "O que está sendo rolado".
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const ficha = (nome, extra) => Object.assign({ nome, raca: 'Humana', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 5, fonte: 'total' }, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '',
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }] }, extra);
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = ms => M.waitForTimeout(ms);
  const quadro = async re => { for (let i = 0; i < 80; i++) { const f = M.frame({ url: re }); if (f) return f; await w(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await w(300); } };
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Rolador 71 E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    await M.evaluate(f => { TC.dados.col('personagens').gravar('pc_sel', { nome: 'Selene', ficha: Object.assign(JSON.parse(f), { nome: 'Selene' }), skills: {}, estado: {}, vis: 'mesa', ordem: 0 }); }, j(ficha('x')));
    await M.locator('#tab-rolador').click();
    let R = null;
    ok(await ate(async () => { R = await quadro(/\/rolador\//); return R && await R.locator('#daFicha').isVisible(); }, 40000), 'na Fixa, "Da ficha" com os personagens da mesa');
    ok(await R.locator('#fxPc option').allInnerTexts().then(x => j(x)) === j(['Selene']), '(a Selene)');
    const n = await R.locator('#fxAtrs .fx-b').count();
    ok(n >= 10, 'os cinco atributos (total e base) e os derivados: ' + n + ' botões');
    const b = R.locator('#fxAtrs .fx-b:not(.base)').first(), v = (await b.locator('b').innerText()).trim();
    await b.click(); await w(200);
    ok(await R.locator('#fAtr').inputValue() === v && /de Selene$/.test(await R.locator('#fTitle').inputValue()), 'um clique põe o número no Atributo (' + v + ') e o nome no título: ' + await R.locator('#fTitle').inputValue());
    if (process.env.FOTOS) await M.screenshot({ path: process.env.FOTOS + '/l71-rolador.png' });
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)|Multiple GoTrueClient/i.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
