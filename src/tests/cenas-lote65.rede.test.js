// Lote 65 (as Cenas), numa mesa de verdade, com o mestre e um jogador em aparelhos separados:
//   · o lápis: o rabisco do jogador aparece para o mestre (e o do mestre para o jogador), sem precisar da permissão de
//     desenhar; o que some sai do documento de quem desenhou depois de uns segundos; o que fica, "Limpar os de todos"
//     (o mestre) apaga o do jogador também; tudo no documento da caneta do Mapa-múndi, marcado com a cena.
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
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cenas L65 E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    const jogId = await J.evaluate(() => TC.conta.usuario.id);
    await M.locator('#tab-cenas').click();
    let C = null, B = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && !!__tc.Store.scene()); }), '(as Cenas do mestre abrem)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    await J.locator('#tab-cenas').click();
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !!__tc.Store.scene()); }, 30000), '(o jogador vê a cena no ar)');
    if (await B.locator('.modal').count()) { await J.keyboard.press('Escape'); await w(300, J); }
    const cena = await C.evaluate(() => __tc.Store.scene().id);
    ok(await ate(() => B.evaluate(id => __tc.Store.scene().id === id, cena)), '(a mesma cena nos dois)');

    await passo('o lápis do jogador', async () => {
      ok(await B.evaluate(() => !__tc.can('draw') && __tc.Tools.allowed('lapis')), 'o jogador sem a permissão de desenhar tem o lápis');
      await B.evaluate(() => __tc.Tools.set('lapis')); await w(200, J);
      await B.locator('#o-lpm .seg-b', { hasText: 'Fica até limpar' }).click(); await w(150, J);
      const bx = await B.locator('canvas').first().boundingBox();
      await J.mouse.move(bx.x + 300, bx.y + 300); await J.mouse.down();
      for (let i = 1; i <= 10; i++) await J.mouse.move(bx.x + 300 + i * 15, bx.y + 300 + (i % 2) * 12);
      await J.mouse.up(); await w(400, J);
      ok(await ate(() => C.evaluate(id => __tc.Lapis.daCena(id).some(x => !x.s), cena)), 'o rabisco do jogador aparece para o mestre');
      const doc = await M.evaluate(uid => { const l = TC.dados.col('documentos').pegar('mundo:rabisco:' + uid); return l ? { dono: l.dono_id, t: l.dados.t.map(x => x.mp) } : null; }, jogId);
      ok(doc && doc.dono === jogId && doc.t.every(mp => /^cena:/.test(mp)), 'no documento da caneta dele (dono: o jogador), marcado com a cena: ' + JSON.stringify(doc));
      await foto(M, 'l65-rede-mestre-ve');
    });
    await passo('o rabisco do mestre que some', async () => {
      await C.evaluate(() => __tc.Tools.set('lapis')); await w(200);
      const bx = await C.locator('canvas').first().boundingBox();
      await M.mouse.move(bx.x + 200, bx.y + 200); await M.mouse.down();
      for (let i = 1; i <= 8; i++) await M.mouse.move(bx.x + 200 + i * 15, bx.y + 220);
      await M.mouse.up(); await w(300);
      ok(await ate(() => B.evaluate(id => __tc.Lapis.daCena(id).some(x => x.s), cena), 10000), 'o rabisco do mestre (o que some) aparece para o jogador');
      ok(await ate(() => B.evaluate(id => !__tc.Lapis.daCena(id).some(x => x.s), cena), 20000), '…e some sozinho em segundos');
    });
    await passo('limpar os de todos', async () => {
      ok(await C.locator('#o-lp-todos').count() === 1, 'o mestre tem "Limpar os de todos"');
      await C.locator('#o-lp-todos').click(); await w(500);
      ok(await ate(() => B.evaluate(id => __tc.Lapis.daCena(id).length === 0, cena)), 'limpo: o rabisco do jogador sumiu para ele também');
    });
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
