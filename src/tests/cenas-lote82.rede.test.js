// Lote 82 (as Cenas), numa mesa de verdade, com o mestre e um jogador em aparelhos separados: os andares mais rápidos.
//   · o prédio: Térreo e 2º andar alinhados (mesmo tamanho), com 2 escadas; a do leste "leva ao pisar";
//   · o mestre põe o prédio no ar pela barra de andares dele (com a contagem de tokens);
//   · o jogador arrasta o token dele para cima da escada do leste: vira um pedido, o token chega no 2º andar ao lado
//     da escada que usou (não na outra), e a tela dele acompanha; a barra do jogador marca o 2º andar;
//   · "Levar todos os meus": os 2 tokens dele vão juntos, na formação;
//   · "Só pela escada": longe da escada, o pedido nem sai (o aviso explica); perto, vai.
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
  const nomeMesa = 'Cenas L82 E2E ' + Date.now().toString(36);
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
    const ids = await C.evaluate(jog => {
      const T = __tc, A = T.Store.scene();
      Object.assign(A, { name: 'Térreo', cols: 20, rows: 14, cell: 64, nivel: 0 });
      const P = Object.assign(T.newScene('2º andar'), { cols: 20, rows: 14, cell: 64, nivel: 1 });
      const esc = (sc, c, r, para, nome) => { const e = T.Props.novo(sc, 'escada', c * 64, r * 64, 1, false); e.cena = para; e.name = nome; sc.tokens.push(e); return e; };
      const oA = esc(A, 3, 7, P.id, 'Escada oeste'), lA = esc(A, 16, 7, P.id, 'Escada leste');
      lA.pisar = true;
      esc(P, 3, 7, A.id, 'Escada oeste'); esc(P, 16, 7, A.id, 'Escada leste');
      const tk = T.newToken(A, 14 * 64, 7 * 64, { name: 'Dain', owner: jog }); A.tokens.push(tk);
      const tk2 = T.newToken(A, 14 * 64, 8 * 64, { name: 'Lira', owner: jog }); A.tokens.push(tk2);
      T.normalizeScene(P); T.normalizeScene(A);
      T.Store.addScene(P); T.Persist.scene(P.id); T.Persist.scene(A.id); T.UI.switchScene(A.id);
      return { A: A.id, P: P.id, tk: tk.id, tk2: tk2.id, oA: oA.id, lA: lA.id };
    }, jogId);
    await w(1200);

    await passo('a barra de andares do mestre', async () => {
      ok(await ate(async () => (await C.locator('#andaresGm .andar-b').count()) === 2, 5000), 'a barra do mestre mostra os 2 andares do prédio');
      const txt = await C.locator('#andaresGm').innerText();
      ok(/2º andar\s*0/.test(txt) && /Térreo\s*2/.test(txt), 'com a contagem: Térreo 2 tokens, 2º andar 0 — ' + j(txt));
      await C.locator('#predioNoAr').click(); await w(800);
      ok(j(await C.evaluate(() => __tc.Nuvem.andaresNoAr().slice().sort())) === j([ids.A, ids.P].sort()), '"Pôr o prédio no ar": os 2 andares no ar juntos');
      await foto(M, 'l82-barra-mestre');
    });

    await passo('o jogador entra', async () => {
      await J.locator('#tab-cenas').click();
      ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !!__tc.Store.scene()); }, 30000), '(as Cenas do jogador abrem)');
      if (await B.locator('.modal').count()) { await J.keyboard.press('Escape'); await w(300, J); }
      ok(await ate(() => B.evaluate(id => __tc.Store.scene().id === id, ids.A), 20000), 'o jogador está no Térreo');
      ok(await ate(() => B.evaluate(id => { const e = __tc.Store.scene().tokens.find(t => t.id === id); return !!e && !!e.vai && e.pisa === true && !('pisar' in e); }, ids.lA), 10000), 'a escada do leste chega para ele com "pisa" (e sem o campo do mestre)');
    });

    await passo('leva ao pisar', async () => {
      await B.evaluate(id => { const { Store } = __tc; Store.tx('Mover token', () => Store.upd('tokens', id, { x: 16 * 64, y: 7 * 64 })); }, ids.tk);
      ok(await ate(() => C.evaluate(([P, tk]) => __tc.Store.S.scenes[P].tokens.some(t => t.id === tk), [ids.P, ids.tk]), 15000), 'o jogador para na escada do leste: o pedido vai e o Dain chega no 2º andar (no mestre)');
      const pos = await C.evaluate(([P, tk]) => { const t = __tc.Store.S.scenes[P].tokens.find(x => x.id === tk); return [t.x / 64, t.y / 64]; }, [ids.P, ids.tk]);
      ok(Math.abs(pos[0] - 16) <= 1 && Math.abs(pos[1] - 7) <= 1 && !(pos[0] === 16 && pos[1] === 7), 'chega ao lado da escada que usou (a do leste), não em cima dela nem na do oeste: ' + j(pos));
      ok(/vai para "2º andar" pela passagem/.test(await B.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' '))), 'o jogador vê o aviso, com Desfazer');
      ok(await ate(() => B.evaluate(id => __tc.Store.scene().id === id, ids.P), 15000), 'a tela do jogador acompanha: ele está no 2º andar');
      ok(await ate(async () => /2º andar/.test(await B.locator('#andaresBar .andar-b.on').innerText()), 5000), 'a barra dos andares do jogador marca o 2º andar');
      ok(await ate(async () => /2º andar\s*1/.test(await C.locator('#andaresGm').innerText()) && /Térreo\s*1/.test(await C.locator('#andaresGm').innerText()), 8000), 'a barra do mestre acompanha: 1 token em cada andar');
      await foto(J, 'l82-jogador-pisou');
    });

    await passo('levar todos os meus', async () => {
      // o Dain volta pelo mestre (direto) e os dois sobem juntos pelo jogador
      await C.evaluate(([P, tk]) => { __tc.UI.switchScene(P); const t = __tc.Store.get('tokens', tk); __tc.UI.levarAndar([t], __tc.Store.S.scenes[P].tokens.find(x => x.prop && x.cena).cena); }, [ids.P, ids.tk]);
      ok(await ate(() => B.evaluate(id => __tc.Store.scene().id === id, ids.A), 15000), '(o Dain volta ao Térreo, e o jogador junto)');
      await w(800, J);
      const itens = await B.evaluate(tk => { const t = __tc.Store.get('tokens', tk), sc = __tc.Store.scene(); __tc.setSel([{ c: 'tokens', id: tk }]); __tc.UI.contextMenu({ x: t.x + sc.cell / 2, y: t.y + sc.cell / 2 }, 300, 300); return [...document.querySelectorAll('.menu-i')].map(b => b.innerText.trim()); }, ids.tk);
      ok(itens.some(x => /^Levar todos os meus \(2\) para 2º andar$/.test(x)), 'no menu do token: "Levar todos os meus (2) para 2º andar" — ' + j(itens.filter(x => /Ir|Levar/.test(x))));
      const antes = await C.evaluate(([A, a, b]) => { const sc = __tc.Store.S.scenes[A], p = id => sc.tokens.find(t => t.id === id); return [(p(b).x - p(a).x) / 64, (p(b).y - p(a).y) / 64]; }, [ids.A, ids.tk, ids.tk2]);
      await B.locator('.menu-i', { hasText: 'Levar todos os meus' }).click();
      ok(await ate(() => C.evaluate(([P, a, b]) => { const sc = __tc.Store.S.scenes[P]; return sc.tokens.some(t => t.id === a) && sc.tokens.some(t => t.id === b); }, [ids.P, ids.tk, ids.tk2]), 15000), 'os 2 tokens dele vão juntos para o 2º andar');
      const depois = await C.evaluate(([P, a, b]) => { const sc = __tc.Store.S.scenes[P], p = id => sc.tokens.find(t => t.id === id); return [(p(b).x - p(a).x) / 64, (p(b).y - p(a).y) / 64]; }, [ids.P, ids.tk, ids.tk2]);
      ok(j(antes) === j(depois), 'e chegam na mesma formação: ' + j({ antes, depois }));
    });

    await passo('só pela escada', async () => {
      // todos de volta ao Térreo, longe das escadas; a regra ligada no Térreo
      await C.evaluate(([A, P, a, b]) => { const T = __tc; T.UI.switchScene(P); T.UI.levarAndar([a, b].map(id => T.Store.get('tokens', id)), A); T.UI.switchScene(A);
        T.Store.tx('Longe', () => { T.Store.upd('tokens', a, { x: 9 * 64, y: 2 * 64 }); T.Store.upd('tokens', b, { x: 10 * 64, y: 2 * 64 }); T.Store.scn({ soEscada: true }); }); }, [ids.A, ids.P, ids.tk, ids.tk2]);
      ok(await ate(() => B.evaluate(([A, a]) => __tc.Store.scene().id === A && __tc.Store.scene().soEscada === true && (__tc.Store.get('tokens', a) || {}).y === 2 * 64, [ids.A, ids.tk]), 15000), '(o jogador no Térreo, com a regra "Só pela escada")');
      await B.evaluate(tk => { __tc.UI.irDeAndar([__tc.Store.get('tokens', tk)], __tc.UI.saidasDeAndar(__tc.Store.scene())[0].para, '2º andar'); }, ids.tk);
      await w(400, J);
      ok(/só se troca de andar pela escada/.test(await B.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' '))), 'longe da escada: o aviso explica e o pedido nem sai');
      await w(2000);
      ok(await C.evaluate(([A, a]) => __tc.Store.S.scenes[A].tokens.some(t => t.id === a), [ids.A, ids.tk]), 'o Dain continua no Térreo');
      await B.evaluate(tk => { const { Store } = __tc; Store.tx('Mover token', () => Store.upd('tokens', tk, { x: 4 * 64, y: 7 * 64 })); }, ids.tk);
      await w(800, J);
      await B.evaluate(tk => { __tc.UI.irDeAndar([__tc.Store.get('tokens', tk)], __tc.UI.saidasDeAndar(__tc.Store.scene())[0].para, '2º andar'); }, ids.tk);
      ok(await ate(() => C.evaluate(([P, a]) => __tc.Store.S.scenes[P].tokens.some(t => t.id === a), [ids.P, ids.tk]), 15000), 'ao lado da escada do oeste: vai');
      const pos = await C.evaluate(([P, tk]) => { const t = __tc.Store.S.scenes[P].tokens.find(x => x.id === tk); return [t.x / 64, t.y / 64]; }, [ids.P, ids.tk]);
      ok(j(pos) === j([4, 7]), 'e chega na mesma casa, ao lado da escada do oeste: ' + j(pos));
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
