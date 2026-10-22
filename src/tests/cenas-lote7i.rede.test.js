// Lote 7, parte 4b-3b (as ruínas), numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre e uma
// jogadora em aparelhos separados:
//   · a aba Ruínas da janela "Gerar um lugar": o forte em ruínas vai para a mesa com o fundo pintado na pasta dela; a
//     jogadora recebe as paredes (as de pé e as baixas, de mureta), o relevo (as torres, o adarve, o entulho) e os
//     objetos, e nada da Entrada da masmorra (oculta) nem do que ela sabe;
//   · o mestre desce: os dois cliques na Entrada geram o nível 1 (a masmorra de pedra), dentro do forte.
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
  const nomeMesa = 'Cenas L7I E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    await M.locator('#tab-cenas').click();
    let C = null, B = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre'); }, 40000), '(o mestre está nas Cenas da mesa)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }

    // ---------- o forte em ruínas ----------
    await C.locator('#sceneBtn').click(); await w(300);
    await C.locator('.menu-i', { hasText: 'Gerar um lugar…' }).click(); await w(800);
    await C.locator('#ger-lugar button', { hasText: 'Ruínas' }).click(); await w(700);
    await C.locator('#ger-arredores button', { hasText: 'Nenhum' }).click(); await w(500);      // (lote 14, parte 14c: o lugar sozinho)
    await C.locator('#rui-tipo button', { hasText: 'Forte em ruínas' }).click(); await w(500);
    await C.locator('#rui-tam button', { hasText: 'Pequeno' }).click(); await w(500);
    { const f = C.locator('#ger-semente'); await f.fill('5'); await f.press('Enter'); await w(500); }
    const plano = await C.evaluate(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado.plano)));
    ok(plano.lugar === 'ruinas' && plano.tipo === 'forte' && plano.W === 36 && plano.H === 28 && plano.entradas.length === 1, '(o forte em ruínas, pequeno, com a entrada da masmorra)');
    await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
    ok(await ate(async () => await C.evaluate(() => __tc.Store.scene().name === 'Forte em ruínas' && !document.querySelector('#ger-prev')), 40000), 'o mestre cria o forte');
    const fo = await C.evaluate(() => { const u = __tc, s = u.Store.scene(); return { id: s.id, paredes: s.walls.length, tipos: [...new Set(s.walls.map(x => x.k))].sort(), mureta: s.walls.filter(x => x.k === 'mureta').length, ter: s.shapes.filter(x => x.ter).length, ent: s.tokens.filter(x => x.prop === 'entrada').map(x => ({ id: x.id, oculto: !!x.hidden, gera: x.gera })), objetos: s.tokens.filter(x => x.prop && !x.hidden).map(x => x.prop).sort(), fundo: (u.Store.S.assets[s.bg.asset] || {}).url || '' }; });
    const pastaMesa = await M.evaluate(() => TC_CONFIG.url + '/storage/v1/object/public/mesas/' + TC.mesas.atual.id + '/');
    ok(fo.tipos.includes('wall') && fo.ter === plano.relevo.length && fo.fundo.startsWith(pastaMesa), 'o forte: as paredes, o relevo — e o fundo pintado vira um arquivo na pasta da mesa: ' + j([fo.tipos, fo.mureta]));
    ok(fo.ent.length === 1 && fo.ent[0].oculto && fo.ent[0].gera.t === 'masmorra' && fo.ent[0].gera.m === 'pedra', 'a Entrada oculta da masmorra: ' + j(fo.ent.map(e => e.gera)));
    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok'), 30000), '(tudo salvo)');
    // a jogadora vê o forte
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    await J.evaluate(() => { const v = document.getElementById('vivo'); if (!v.hidden) document.getElementById('vivoX').click(); }); await w(300, J);
    await J.locator('#tab-cenas').click();
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && __tc.Store.S.current === id, fo.id); }, 40000), 'a jogadora passa a ver o forte');
    await J.waitForTimeout(800);
    if (await B.locator('.modal').count()) { await J.keyboard.press('Escape'); await w(300, J); }
    const vj = await B.evaluate(() => { const s = __tc.Store.scene(); return { paredes: s.walls.length, mureta: s.walls.filter(x => x.k === 'mureta').length, ter: s.shapes.filter(x => x.ter).length, entradas: s.tokens.filter(x => x.prop === 'entrada').length, gera: s.tokens.some(x => 'gera' in x), objetos: s.tokens.filter(x => x.prop).map(x => x.prop).sort() }; });
    ok(vj.paredes === fo.paredes && vj.mureta === fo.mureta && vj.ter === fo.ter, 'a jogadora recebe as paredes (as de pé e as baixas) e o relevo: ' + j(vj));
    ok(vj.entradas === 0 && !vj.gera && j(vj.objetos) === j(fo.objetos), 'e os objetos, mas nada da Entrada da masmorra');
    ok(await ate(async () => await B.evaluate(() => __tc.Render.stats.frames > 0 && !(__tc.Render.stats.fail > 0)), 20000), 'o forte desenha na tela da jogadora');
    await foto(J, 'l7i-forte-jogadora');

    // ---------- o mestre desce: o nível 1 ----------
    await C.evaluate(id => { const u = __tc, t2 = u.Store.get('tokens', id); u.setSel([{ c: 'tokens', id }]); u.UI.passagem(t2, 400, 300); }, fo.ent[0].id); await w(300);
    await C.locator('.menu-i', { hasText: 'Gerar o nível 1' }).click(); await w(800);
    await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
    ok(await ate(async () => await C.evaluate(id => __tc.Store.S.pastas.mae[__tc.Store.scene().id] === id && !document.querySelector('.modal'), fo.id), 40000), 'o nível 1 (a masmorra de pedra) sai dentro do forte');
    const nv = await C.evaluate(() => { const s = __tc.Store.scene(); return { nome: s.name, tom: s.tone }; });
    ok(nv.nome === 'Masmorra — nível 1' && nv.tom === 'breu', 'a masmorra embaixo do forte, no breu: ' + j(nv));
    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok'), 30000), '(o nível foi salvo)');

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
