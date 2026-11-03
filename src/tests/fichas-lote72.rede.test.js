// Lote 72, as Fichas de quem joga numa mesa de verdade: com 1 ou 2 personagens, o elenco sai e vira um seletor no alto
// da ficha (com 1, nem o seletor); com 3, o elenco volta.
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
  const J = (await t.device({ name: 'jogador', jogando: true, seed })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 80; i++) { const f = p.frame({ url: re }); if (f) return f; await w(250, p); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await w(300); } };
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Fichas 72 E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    const jogId = await J.evaluate(() => TC.conta.usuario.id);
    const dar = (id, nome, ordem) => M.evaluate(([f, uid, id, nome, ordem]) => { TC.dados.col('personagens').gravar(id, { nome, ficha: Object.assign(JSON.parse(f), { nome }), skills: {}, estado: {}, dono_id: uid, vis: 'mesa', ordem }); }, [j(ficha('x')), jogId, id, nome, ordem]);
    await dar('pc_a', 'Selene', 0);
    let F = null;
    ok(await ate(async () => { F = await quadro(J, /\/fichas\//); return F && await F.evaluate(() => S.personagens.length === 1); }, 40000), '(o Dalmo abre as Fichas, com a Selene)');
    ok(await ate(() => F.evaluate(() => document.documentElement.classList.contains('elenco-seletor'))) && !(await F.locator('.roster').isVisible()), 'com 1 personagem, o elenco sai e a ficha fica com a largura');
    ok(await F.locator('#ficha .rsnomej').innerText() === 'Selene' && (await F.locator('#fselPc').count()) === 0, 'a ficha da Selene aberta, sem seletor (só há ela)');
    await dar('pc_b', 'Kaira', 1);
    ok(await ate(async () => (await F.locator('#fselPc option').count()) === 2), 'com 2, o seletor no alto da ficha');
    await F.locator('#fselPc').selectOption('pc_b'); await w(400, J);
    ok(await F.locator('#ficha .rsnomej').innerText() === 'Kaira', 'trocar no seletor abre a outra ficha');
    if (process.env.FOTOS) await J.screenshot({ path: process.env.FOTOS + '/l72-seletor.png' });
    await dar('pc_c', 'Dain', 2);
    ok(await ate(async () => !(await F.evaluate(() => document.documentElement.classList.contains('elenco-seletor'))) && await F.locator('.roster').isVisible()), 'com 3, o elenco volta');
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)|Multiple GoTrueClient/i.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
