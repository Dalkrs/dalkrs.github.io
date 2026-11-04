// Lote 78 (as Cenas), numa mesa de verdade, com o mestre e um jogador em aparelhos separados: os andares no ar ao
// mesmo tempo.
//   · o mestre põe no ar o Térreo "com os andares": o Porão (ligado por escada) já vem marcado;
//   · o jogador vê o andar do token dele, com a barra dos andares no alto; o mestre troca de cena sem mudar o que ele vê;
//   · o jogador olha o outro andar e volta ao token dele;
//   · a escada: dois cliques levam o token do jogador ao Porão (perto da escada de lá), e a tela dele acompanha;
//   · o mestre leva o token de volta (botão direito → "Levar para Térreo");
//   · "Só esta cena": os andares saem do ar (a projeção do Porão sai do banco).
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
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
  const nomeMesa = 'Cenas L78 E2E ' + Date.now().toString(36);
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
    // o Térreo (com a escada que desce e o token do Dalmo) e o Porão (com a escada que sobe)
    const ids = await C.evaluate(jog => {
      const T = __tc, A = T.Store.scene();
      A.name = 'Térreo';
      const P = T.newScene('Porão');
      const eA = T.Props.novo(A, 'escada', 4 * A.cell, 4 * A.cell, 1, false); eA.cena = P.id; A.tokens.push(eA);
      const eP = T.Props.novo(P, 'saida', 10 * P.cell, 6 * P.cell, 1, true); eP.cena = A.id; P.tokens.push(eP);
      const tk = T.newToken(A, 5 * A.cell, 4 * A.cell, { name: 'Dain', owner: jog }); A.tokens.push(tk);
      T.normalizeScene(P); T.normalizeScene(A);
      T.Store.addScene(P); T.Persist.scene(P.id); T.Persist.scene(A.id); T.UI.switchScene(A.id);
      return { A: A.id, P: P.id, tk: tk.id, eA: eA.id };
    }, jogId);
    await w(1200);

    await passo('pôr no ar com os andares', async () => {
      await C.locator('#airBtn').click(); await w(250);
      await C.locator('.menu-i', { hasText: 'Pôr no ar com os andares' }).click(); await w(300);
      const op = C.locator('.andar-op');
      ok(await op.count() === 1 && /Porão/.test(await op.innerText()) && /ligada por passagem/.test(await op.innerText()) && await op.locator('input').isChecked(), 'a janela dos andares: o Porão, ligado pela escada, já vem marcado');
      await foto(M, 'l78-janela');
      await C.locator('.modal .btn', { hasText: 'Mostrar aos jogadores' }).click(); await w(500);
      ok(j(await C.evaluate(() => __tc.Nuvem.andaresNoAr())) === j([ids.A, ids.P]), 'no ar: o Térreo e o Porão');
      ok(/2 andares/.test(await C.locator('#airBtn').innerText()), 'o botão diz: "No ar · 2 andares"');
    });

    await passo('o jogador vê o andar do token dele', async () => {
      await J.locator('#tab-cenas').click();
      ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !!__tc.Store.scene()); }, 30000), '(as Cenas do jogador abrem)');
      if (await B.locator('.modal').count()) { await J.keyboard.press('Escape'); await w(300, J); }
      ok(await ate(() => B.evaluate(id => __tc.Store.scene().id === id, ids.A), 20000), 'o jogador está no Térreo (onde está o token dele)');
      ok(await ate(async () => (await B.locator('#andaresBar .andar-b').count()) === 2, 10000) && /Térreo/.test(await B.locator('#andaresBar .andar-b.on').innerText()), 'a barra dos andares no alto: Térreo (marcado) e Porão');
      ok(await B.evaluate(id => (__tc.Store.scene().tokens.find(t => t.id === id) || {}).vai, ids.eA) === ids.P, 'a escada do Térreo diz, para ele, que leva ao Porão');
      ok(await ate(() => B.evaluate(([A]) => { const m = __tc.UI.saidasDeAndar(__tc.Store.scene()); return m.length === 1 && m[0].nome === 'Porão'; }, [ids.A]), 5000), '(e o menu do token tem "Ir para Porão")');
      await C.evaluate(id => __tc.UI.switchScene(id), ids.P); await w(2500);
      ok(await B.evaluate(id => __tc.Store.scene().id === id, ids.A), 'o mestre abre o Porão: o jogador continua no Térreo');
      await foto(J, 'l78-jogador-terreo');
    });

    await passo('olhar o outro andar', async () => {
      await B.locator('#andaresBar .andar-b', { hasText: 'Porão' }).click();
      ok(await ate(() => B.evaluate(id => __tc.Store.scene().id === id, ids.P), 8000), 'o jogador olha o Porão');
      ok(await B.locator('#andarVolta').isVisible(), '"Voltar ao meu token" aparece');
      await B.locator('#andarVolta').click();
      ok(await ate(() => B.evaluate(id => __tc.Store.scene().id === id, ids.A), 8000), 'e volta ao Térreo');
    });

    await passo('a escada', async () => {
      await B.evaluate(id => { const t = __tc.Store.get('tokens', id); __tc.UI.andarPelaPassagem(t); }, ids.eA);
      ok(await ate(() => C.evaluate(([P, tk]) => __tc.Store.S.scenes[P].tokens.some(t => t.id === tk), [ids.P, ids.tk]), 15000), 'pela escada, o token do Dalmo vai para o Porão (no mestre)');
      const pos = await C.evaluate(([A, P, tk]) => { const sc = __tc.Store.S.scenes[P], t = sc.tokens.find(x => x.id === tk), e = sc.tokens.find(x => x.prop && x.cena === A); return { dx: t.x - e.x, dy: t.y - e.y, noTerreo: __tc.Store.S.scenes[A].tokens.some(x => x.id === tk) }; }, [ids.A, ids.P, ids.tk]);
      ok(!pos.noTerreo && pos.dx === -320 && pos.dy === -128, '(lote 82) sai do Térreo e aparece na mesma casa no Porão (os andares são do mesmo tamanho): ' + j(pos));
      ok(await ate(() => B.evaluate(id => __tc.Store.scene().id === id, ids.P), 15000), 'a tela do jogador acompanha o token: ele está no Porão');
      ok(await ate(async () => /Porão/.test(await B.locator('#andaresBar .andar-b.on').innerText()), 5000), '(a barra marca o Porão)');
      await foto(J, 'l78-jogador-porao');
    });

    await passo('o mestre leva o token de volta', async () => {
      await C.evaluate(([P, tk]) => { __tc.UI.switchScene(P); __tc.setSel([{ c: 'tokens', id: tk }]); }, [ids.P, ids.tk]); await w(400);
      const itens = await C.evaluate(([tk]) => { const t = __tc.Store.get('tokens', tk), sc = __tc.Store.scene(); __tc.UI.contextMenu({ x: t.x + sc.cell / 2, y: t.y + sc.cell / 2 }, 300, 300); return [...document.querySelectorAll('.menu-i')].map(b => b.innerText.trim()); }, [ids.tk]);
      ok(itens.includes('Levar para Térreo'), 'no botão direito do token: "Levar para Térreo": ' + j(itens.filter(x => /Levar/.test(x))));
      await C.locator('.menu-i', { hasText: 'Levar para Térreo' }).click(); await w(500);
      ok(await ate(() => B.evaluate(id => __tc.Store.scene().id === id, ids.A), 15000), 'o token volta ao Térreo, e o jogador junto');
    });

    await passo('só esta cena', async () => {
      await C.evaluate(id => __tc.UI.switchScene(id), ids.A); await w(300);
      await C.locator('#airBtn').click(); await w(250);
      await C.locator('.menu-i', { hasText: 'Andares no ar (2)' }).click(); await w(300);
      await C.locator('.modal .btn', { hasText: 'Só esta cena' }).click(); await w(800);
      ok(j(await C.evaluate(() => __tc.Nuvem.andaresNoAr())) === j([ids.A]), '"Só esta cena": só o Térreo no ar');
      ok(await ate(async () => !(await B.locator('#andaresBar').count()), 10000), 'a barra dos andares some para o jogador');
      ok(await ate(() => M.evaluate(P => !TC.dados.col('documentos').pegar('cena:pub:' + P + ':m') && !TC.dados.col('documentos').pegar('cena:pub:' + P + ':v'), ids.P), 10000), 'a projeção do Porão sai do banco');
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
