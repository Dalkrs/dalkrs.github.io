// Lote 7, parte 4b-3a (as masmorras), numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre e
// uma jogadora em aparelhos separados:
//   · o mestre põe uma Entrada numa cena e, pelos dois cliques nela, gera uma masmorra de pedra embaixo (com os
//     segredos): o nível sai dentro da cena, no breu, com o fundo pintado na pasta da mesa;
//   · a jogadora recebe as paredes — a porta secreta como parede comum, sem nada que a denuncie —, as portas comuns,
//     os móveis e as tochas, e nada das runas escondidas, das Entradas nem da Saída;
//   · o mestre revela a porta secreta: ela vira porta para a jogadora também.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' };
  const M = (await t.device({ name: 'mestre', w: 1360, h: 900, seed })).page;
  const J = (await t.device({ name: 'jogador', w: 1300, h: 860, seed })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(250); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cenas L7H E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    await M.locator('#tab-cenas').click();
    let C = null, B = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre'); }, 40000), '(o mestre está nas Cenas da mesa)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }

    // ---------- a Entrada e a masmorra embaixo ----------
    const ent = await C.evaluate(() => { const u = __tc, sc = u.Store.scene(), tk = u.Props.novo(sc, 'entrada', 4 * sc.cell, 4 * sc.cell, 1, true); u.Store.tx('Pôr a entrada', () => u.Store.add('tokens', tk)); return { id: tk.id, cena: sc.id }; });
    await C.evaluate(id => { const u = __tc, t2 = u.Store.get('tokens', id); u.setSel([{ c: 'tokens', id }]); u.UI.passagem(t2, 400, 300); }, ent.id); await w(300);
    await C.locator('.menu-i', { hasText: 'Gerar uma masmorra embaixo' }).click(); await w(800);
    await C.locator('#mas-tipo button', { hasText: 'Masmorra de pedra' }).click(); await w(400);
    await C.locator('#mas-tam button', { hasText: 'Pequeno' }).click(); await w(400);
    // (uma semente fixa, com segredos: a porta secreta do tesouro e as runas)
    const plano = await C.evaluate(() => { const M2 = __tc.Masmorra; for (let s = 1; s < 200; s++) { const p = M2.gerar({ tipo: 'pedra', tamanho: 'pequeno', seed: s, segredos: true }); if (p.paredes.some(x => x.secret) && p.zonas.length) return { s }; } return null; });
    ok(!!plano, '(uma semente com porta secreta e runas)');
    await C.evaluate(s => { const v = __tc.Masmorra.vivo(); v.st.seed = s; v.refazer(); }, plano.s); await w(400);
    await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
    ok(await ate(async () => await C.evaluate(mae => __tc.Store.S.pastas.mae[__tc.Store.scene().id] === mae && !document.querySelector('.modal'), ent.cena), 40000), 'o mestre gera o nível 1, dentro da cena');
    const niv = await C.evaluate(() => { const u = __tc, s = u.Store.scene(); return { id: s.id, nome: s.name, tom: s.tone, paredes: s.walls.length, secretas: s.walls.filter(x => x.secret).map(x => x.id), portas: s.walls.filter(x => x.k === 'door' && !x.secret).length, runas: s.effects.filter(e => e.fx === 'runas' && e.gm).length, marcas: s.tokens.filter(x => x.prop === 'entrada' || x.prop === 'saida').length, objetos: s.tokens.filter(x => x.prop && x.prop !== 'entrada' && x.prop !== 'saida' && !x.hidden).map(x => x.prop).sort(), fundo: (u.Store.S.assets[s.bg.asset] || {}).url || '' }; });
    const pastaMesa = await M.evaluate(() => TC_CONFIG.url + '/storage/v1/object/public/mesas/' + TC.mesas.atual.id + '/');
    ok(/^Masmorra — nível 1$/.test(niv.nome) && niv.tom === 'breu' && niv.fundo.startsWith(pastaMesa), 'o nível no breu, com o fundo pintado na pasta da mesa: ' + j([niv.nome, niv.tom]));
    ok(niv.marcas === 2 && niv.secretas.length >= 1 && niv.runas >= 1, 'a Saída e a Entrada da escada de descida (ocultas), a porta secreta e as runas escondidas: ' + j([niv.secretas.length, niv.runas]));
    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok'), 30000), '(tudo salvo)');
    // a jogadora vê o nível
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    await J.evaluate(() => { const v = document.getElementById('vivo'); if (!v.hidden) document.getElementById('vivoX').click(); }); await w(300, J);
    await J.locator('#tab-cenas').click();
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && __tc.Store.S.current === id, niv.id); }, 40000), 'a jogadora passa a ver o nível');
    await J.waitForTimeout(800);
    if (await B.locator('.modal').count()) { await J.keyboard.press('Escape'); await w(300, J); }
    const vj = await B.evaluate(ids => { const s = __tc.Store.scene(); return { paredes: s.walls.length, secretas: s.walls.filter(x => x.secret).length, portas: s.walls.filter(x => x.k === 'door').length, comoParede: ids.every(id => { const x = s.walls.find(q => q.id === id); return x && x.k === 'wall'; }), runas: s.effects.filter(e => e.fx === 'runas').length, marcas: s.tokens.filter(x => x.prop === 'entrada' || x.prop === 'saida').length, gera: s.tokens.some(x => 'gera' in x), objetos: s.tokens.filter(x => x.prop).map(x => x.prop).sort() }; }, niv.secretas);
    ok(vj.paredes === niv.paredes && vj.secretas === 0 && vj.comoParede && vj.portas === niv.portas, 'a jogadora recebe as paredes: a porta secreta como parede comum, as portas comuns: ' + j([vj.paredes, vj.portas, niv.secretas.length]));
    ok(vj.runas === 0 && vj.marcas === 0 && !vj.gera && j(vj.objetos) === j(niv.objetos), 'os móveis e as tochas, mas nada das runas, das Entradas nem da Saída: ' + j([vj.runas, vj.marcas, vj.objetos.length]));
    ok(await ate(async () => await B.evaluate(() => __tc.Render.stats.frames > 0 && !(__tc.Render.stats.fail > 0)), 20000), 'o nível desenha na tela da jogadora');
    await foto(J, 'l7h-masmorra-jogadora');
    // o mestre revela a porta secreta (quando há): ela vira porta para a jogadora
    await C.evaluate(id => { const u = __tc; u.Store.tx('Revelar porta secreta', () => u.Store.upd('walls', id, { secret: false })); }, niv.secretas[0]);
    ok(await ate(async () => await B.evaluate(id => { const x = __tc.Store.scene().walls.find(q => q.id === id); return x && x.k === 'door' && !x.secret; }, niv.secretas[0]), 30000), 'o mestre revela a porta secreta: ela vira porta para a jogadora');

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
