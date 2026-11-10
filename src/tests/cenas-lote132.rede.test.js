// Lote 132 (pedido do Bruno), numa mesa de verdade: o mestre mostra o cone de um guarda a um jogador.
//   · o jogador recebe o cone (t.vc), sem o resto da ronda, e desenha; sem a rota até o mestre deixar;
//   · o guarda arrastado pelo mestre vira, e o cone do jogador vira junto;
//   · "Esconder o cone de novo": some da tela do jogador.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'cenas', 'tinycats-tour': '1' };
  const M = (await t.device({ name: 'mestre', w: 1300, h: 860, seed })).page;
  const J = (await t.device({ name: 'jogador', w: 1300, h: 860, seed })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(300); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cone 132 E2E ' + Date.now().toString(36);
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
    await C.evaluate(uid => {
      const u = __tc, sc = u.Store.scene(), cl = sc.cell;
      const g = u.newToken(sc, cl * 4, cl * 4, { name: 'Sentinela' }), p = u.newToken(sc, cl * 12, cl * 4, { name: 'Dalmo' });
      u.Store.tx('Criar', () => { u.Store.add('tokens', Object.assign(g, { id: 'tg132', ronda: u.Rondas.novaRonda({ pts: [[4, 4], [9, 4]], dir: 0 }) })); u.Store.add('tokens', Object.assign(p, { id: 'tp132', owner: uid })); });
    }, jogId);
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    await J.locator('#tab-cenas').click();
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !!__tc.Store.get('tokens', 'tg132')); }, 40000), 'o jogador vê a cena, com a sentinela');
    if (await B.locator('.modal').count()) { await J.keyboard.press('Escape'); await w(300, J); }
    const noJog = () => B.evaluate(() => { const k = __tc.Store.get('tokens', 'tg132'); return { vc: k && k.vc ? JSON.parse(JSON.stringify(k.vc)) : null, ronda: !!(k && k.ronda), vistos: __tc.Rondas.vistos(__tc.Store.scene()).length }; });
    ok(!(await noJog()).vc && (await noJog()).vistos === 0 && !(await noJog()).ronda, 'antes: o jogador não recebe nada da ronda');

    await passo('mostrar o cone', async () => {
      await C.evaluate(() => { __tc.setSel([{ c: 'tokens', id: 'tg132' }]); __tc.UI.openTab('sel'); }); await w(400);
      await C.evaluate(() => { const d = document.getElementById('s-guarda'); if (d) d.open = true; }); await w(150);
      await C.locator('#tk-gver-' + jogId).check({ force: true }); await w(300);
      ok(await ate(async () => { const v = await noJog(); return v.vc && v.vistos === 1 && v.vc.dir === 0 && !v.vc.pts && !v.ronda; }), 'o jogador recebe o cone (sem a rota) e o desenha');
      if (process.env.FOTOS) await J.screenshot({ path: process.env.FOTOS + '/l132-jogador-cone.png' });
      await C.evaluate(() => { const S = __tc.Store, k = S.get('tokens', 'tg132'); S.tx('Mover', () => S.upd('tokens', 'tg132', { y: k.y + 3 * __tc.Store.scene().cell })); }); await w(300);
      ok(await ate(async () => (await noJog()).vc.dir === 90), 'o mestre arrasta a sentinela para baixo: o cone do jogador vira para baixo');
      await C.locator('#tk-gver-rota').check({ force: true }); await w(300);
      ok(await ate(async () => { const v = await noJog(); return v.vc.pts && v.vc.pts.length === 2; }), '"A rota vai junto": o jogador recebe a rota');
      await C.locator('#tk-gver-fim').click(); await w(300);
      ok(await ate(async () => { const v = await noJog(); return !v.vc && v.vistos === 0; }), '"Esconder o cone de novo": some da tela do jogador');
    });
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)|Multiple GoTrueClient/i.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
