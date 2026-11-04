// Lote 73, numa mesa de verdade: o painel Dados com a base embaixo dos cinco atributos (e as cores da ficha); o
// resultado grande no meio da tela, para a mesa toda; a rolagem em segredo, só para quem rolou.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const ficha = (nome, extra) => Object.assign({ nome, raca: 'Humana', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 5, fonte: 'total' }, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '',
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }] }, extra);
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' };
  const M = (await t.device({ name: 'mestre', seed })).page;
  const J = (await t.device({ name: 'jogador', seed })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await w(200); } };
  const grande = p => p.evaluate(() => { const g = document.getElementById('grande'); return g && !g.hidden ? { n: g.querySelector('.gr-n').textContent, t: (g.querySelector('.gr-t') || {}).textContent || '' } : null; });
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Dados 73 E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    const jogId = await J.evaluate(() => TC.conta.usuario.id);
    await M.evaluate(([f, uid]) => { TC.dados.col('personagens').gravar('pc_sel', { nome: 'Selene', ficha: Object.assign(JSON.parse(f), { nome: 'Selene' }), skills: {}, estado: {}, dono_id: uid, vis: 'mesa', ordem: 0 }); }, [j(ficha('x')), jogId]);
    ok(await ate(() => J.evaluate(() => !document.getElementById('dados').hidden && document.querySelectorAll('#dadosBotoes button[data-kb]').length === 5)), 'o painel Dados do jogador: a base embaixo dos cinco atributos');
    if (await J.locator('#dadosCorpo').isHidden()) await J.locator('#dadosAbre').click();
    const cor = await J.evaluate(() => [...document.querySelectorAll('#dadosBotoes .dados-c')].map(x => getComputedStyle(x).getPropertyValue('--cn').trim()));
    ok(new Set(cor).size === 11, 'cada número com a cor da ficha (lote 90: sem o Embate): ' + cor.length);
    const base = await J.evaluate(() => document.querySelector('#dadosBotoes button[data-kb="FOR"] b').textContent);
    await J.locator('#dadosBotoes button[data-kb="FOR"]').click();
    ok(await ate(async () => { const l = await J.evaluate(() => { const x = TC.aoVivo.itens.filter(l => l.tipo === 'rolagem').pop(); return x ? x.dados : null; }); return l && /base/.test(l.titulo || '') ; }, 10000), 'o "base" rola a Força base (' + base + ')');
    ok(await ate(async () => !!(await grande(J)), 5000), 'o resultado grande no meio da tela, para quem rolou');
    ok(await ate(async () => { const g = await grande(M); return g && /base/.test(g.t); }, 8000), 'e para o mestre também (a mesa toda): ' + j(await grande(M)));
    if (process.env.FOTOS) await M.screenshot({ path: process.env.FOTOS + '/l73-grande.png' });
    ok(await ate(async () => !(await grande(M)), 6000), 'some sozinho em 3 segundos');
    // o mestre em segredo
    await M.locator('#segredo').click(); await w(300);
    await M.locator('#msg').fill('/r 1d20'); await M.keyboard.press('Enter');
    ok(await ate(async () => !!(await grande(M)), 8000), 'em segredo: o mestre vê o resultado grande');
    await w(2500, J);
    ok(!(await grande(J)), 'e o jogador não');
    await M.locator('#segredo').click();
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)|Multiple GoTrueClient/i.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
