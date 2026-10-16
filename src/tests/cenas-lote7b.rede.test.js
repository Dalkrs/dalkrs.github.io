// Lote 7, parte 3b (as zonas novas nas Cenas), numa mesa de verdade (banco local de ensaio ou o projeto real), com o
// mestre e um jogador em aparelhos separados:
//   · o Portal: o jogador solta o token dele num círculo e o mestre o faz sair no outro (a mesa leva);
//   · a Fumaça tapa a visão também na tela do jogador (as paredes de lá saem da cena que ele recebe);
//   · as Runas-armadilha escondidas não chegam ao jogador; quem pisa nelas avisa o mestre; reveladas, chegam;
//   · o fogo que o jogador solta em cima do óleo do mestre gera, para o mestre, o cartão da combinação.
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
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const pos = (f, id) => f.evaluate(id => { const k = __tc.Store.get('tokens', id); return k ? [k.x / 64, k.y / 64] : null; }, id);
  const aviso = f => f.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const sees = (f, cx, cy) => f.evaluate(([cx, cy]) => { const u = __tc, sc = u.Store.scene(); u.Vision.update(sc, u.App.viewer); return u.Vision.canSee(cx * 64, cy * 64); }, [cx, cy]);

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cenas L7B E2E ' + Date.now().toString(36);
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
    const ids = await C.evaluate(uid => {
      const u = __tc, sc = u.Store.scene(), c = sc.cell;
      const a = u.newToken(sc, 2 * c, 5 * c, { name: 'Selene', owner: uid, vis: { on: true, range: 0, dark: 0 } }), g = u.newToken(sc, 16 * c, 9 * c, { name: 'Goblin' });
      u.Store.tx('Criar', () => {
        u.Store.scn({ cols: 24, rows: 14, blockMove: false, perms: Object.assign({}, sc.perms, { efeitos: true }), fog: { dynamic: true, manual: false, explored: false, shared: false } });
        u.Store.add('tokens', a); u.Store.add('tokens', g);
        u.Store.add('effects', { id: 'p_portal', fx: 'portal', k: 'circ', x: 6.5 * c, y: 2.5 * c, x2: 18.5 * c, y2: 2.5 * c, r: 1, w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: 4, dur: 0, dur0: 0, at: null, apply: null });
        u.Store.add('effects', { id: 'p_runas', fx: 'runas', k: 'circ', x: 2.5 * c, y: 10.5 * c, r: 1, w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8, token: null, gm: true, by: null, seed: 4, dur: 0, dur0: 0, at: null, apply: null });
        u.Store.add('effects', { id: 'p_oleo', fx: 'oleo', k: 'circ', x: 12.5 * c, y: 11.5 * c, r: 1.5, w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: 4, dur: 0, dur0: 0, at: null, apply: null });
      });
      u.setSel([]); u.Render.fit();
      return { sel: a.id, gob: g.id };
    }, jogId);
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    await J.locator('#tab-cenas').click();
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(([a, b]) => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !!__tc.Store.get('tokens', a) && !!__tc.Store.get('tokens', b) && !!__tc.Store.get('effects', 'p_portal'), [ids.sel, ids.gob]); }, 40000), 'o jogador vê a cena no ar, com o portal');
    await J.waitForTimeout(800);
    if (await B.locator('.modal').count()) { await J.keyboard.press('Escape'); await w(300, J); }
    ok(await B.evaluate(() => { const e = __tc.Store.get('effects', 'p_portal'); return e && e.x2 === 18.5 * 64 && e.y2 === 2.5 * 64; }), 'a saída do portal chega ao jogador');
    ok(await B.evaluate(() => !__tc.Store.get('effects', 'p_runas')), 'as runas escondidas não chegam a ele');

    // ---------- o portal ----------
    await B.evaluate(id => { const u = __tc; u.Store.tx('Mover', () => u.Store.upd('tokens', id, { x: 6 * 64, y: 2 * 64 })); }, ids.sel);
    ok(await ate(async () => JSON.stringify(await pos(C, ids.sel)) === '[18,2]', 20000), 'o jogador solta a Selene na entrada: no mestre, ela sai na saída — ' + JSON.stringify(await pos(C, ids.sel)));
    ok(/Selene atravessou o portal/.test(await aviso(C)), '(o mestre vê o aviso, com Desfazer)');
    ok(await ate(async () => JSON.stringify(await pos(B, ids.sel)) === '[18,2]', 20000), '… e a mesa leva o lugar novo ao jogador');
    await foto(J, 'l7b-portal-jogador');
    await C.evaluate(id => { const u = __tc; u.Store.tx('Volta', () => u.Store.upd('tokens', id, { x: 2 * 64, y: 5 * 64 })); }, ids.sel);
    ok(await ate(async () => JSON.stringify(await pos(B, ids.sel)) === '[2,5]', 20000), '(o mestre a traz de volta)');

    // ---------- a fumaça, na tela do jogador ----------
    ok(await sees(B, 10.5, 5.5), 'na tela do jogador, a Selene vê do outro lado da sala');
    await C.evaluate(() => { const u = __tc; u.Store.tx('Fumaça', () => u.Store.add('effects', { id: 'p_fum', fx: 'fumaca', k: 'circ', x: 6.5 * 64, y: 5.5 * 64, r: 1.5, w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: 4, dur: 0, dur0: 0, at: null, apply: null })); });
    ok(await ate(async () => !!(await B.evaluate(() => __tc.Store.get('effects', 'p_fum'))), 20000) && await ate(async () => !(await sees(B, 10.5, 5.5)), 8000), 'o mestre solta a Fumaça no meio: na tela do jogador, ela tapa a visão');
    await foto(J, 'l7b-fumaca-jogador');
    await C.evaluate(() => { const u = __tc; u.Store.tx('x', () => u.Store.del('effects', 'p_fum')); });
    ok(await ate(async () => await sees(B, 10.5, 5.5), 20000), 'a fumaça sai: a visão volta');

    // ---------- as runas ----------
    await C.evaluate(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    await B.evaluate(id => { const u = __tc; u.Store.tx('Mover', () => u.Store.upd('tokens', id, { x: 2 * 64, y: 10 * 64 })); }, ids.sel);
    ok(await ate(async () => /Selene pisou nas Runas-armadilha/.test(await aviso(C)), 20000), 'o jogador anda com a Selene para cima das runas escondidas: o mestre fica sabendo — ' + await aviso(C));
    ok(!/Runas/.test(await aviso(B)), '(o jogador, não)');
    await C.locator('.toast-a', { hasText: 'Revelar' }).click(); await w(300);
    ok(await ate(async () => !!(await B.evaluate(() => __tc.Store.get('effects', 'p_runas'))), 20000), '"Revelar": as runas chegam ao jogador');

    // ---------- a combinação, com o fogo do jogador ----------
    await B.evaluate(() => { const u = __tc; u.Store.tx('Soltar efeito', () => u.Store.add('effects', { id: 'p_fogo', fx: 'fogo', k: 'circ', x: 14.5 * 64, y: 11.5 * 64, r: 1, w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: 4, dur: 0, dur0: 0, at: null, apply: null })); });
    ok(await ate(async () => (await C.locator('#combo-p_oleo').count()) === 1 && /Fogo no óleo: explosão\?/.test(await C.locator('#combos').innerText()), 20000), 'o jogador solta fogo em cima do óleo do mestre: para o mestre, o cartão "Fogo no óleo: explosão?"');
    ok(await B.locator('#combos').isHidden(), '(o jogador não vê o cartão)');
    await foto(M, 'l7b-combinacao-mestre');
    await C.locator('#combo-ok-p_oleo').click(); await w(400);
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(200); }
    ok(await ate(async () => await B.evaluate(() => { const e = __tc.Store.get('effects', 'p_oleo'); return !!e && e.fx === 'fogo' && !__tc.Store.get('effects', 'p_fogo'); }), 20000), '"Aplicar": o óleo vira fogo, e o jogador vê');

    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok')), '(tudo salvo)');
    await M.locator('#tab-fichas').click(); await w(500);
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
