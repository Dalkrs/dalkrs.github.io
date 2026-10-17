// Lote 7, parte 4b-2 (a aldeia da tribo), numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre
// e uma jogadora em aparelhos separados:
//   · a aba Tribo da janela "Gerar um lugar": a aldeia dos iglus, na neve, vai para a mesa com o fundo pintado na pasta
//     dela; a jogadora recebe as paredes (a paliçada, o portão, a cerca do cercado, os iglus), o relevo leve (as torres,
//     o fosso), a fogueira, os totens e as tochas — e nada das Entradas (ocultas) nem do que elas sabem;
//   · o interior do iglu do chefe (pela Entrada): sai dentro da aldeia, com o estrado de neve (a área de meio metro e a
//     forma clara), o braseiro no meio, as peles, as armas e o totem; a jogadora recebe tudo isso.
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
  const nomeMesa = 'Cenas L7F E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    await M.locator('#tab-cenas').click();
    let C = null, B = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre'); }, 40000), '(o mestre está nas Cenas da mesa)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }

    // ---------- a aldeia dos iglus ----------
    await C.locator('#sceneBtn').click(); await w(300);
    await C.locator('.menu-i', { hasText: 'Gerar um lugar…' }).click(); await w(800);
    await C.locator('#ger-lugar button', { hasText: 'Tribo' }).click(); await w(700);
    await C.locator('#tri-mor button', { hasText: 'Iglus' }).click(); await w(500);
    await C.locator('#tri-tam button', { hasText: 'Pequena' }).click(); await w(500);
    await C.locator('#tri-ter button', { hasText: 'Neve' }).click(); await w(500);
    { const f = C.locator('#ger-semente'); await f.fill('8'); await f.press('Enter'); await w(500); }
    const plano = await C.evaluate(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado.plano)));
    ok(plano.lugar === 'tribo' && plano.moradias === 'iglu' && plano.W === 36 && plano.H === 30 && plano.predios.length >= 4, '(a aldeia dos iglus, pequena, na neve)');
    await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
    ok(await ate(async () => await C.evaluate(() => __tc.Store.scene().name === 'Aldeia dos iglus' && !document.querySelector('#ger-prev')), 40000), 'o mestre cria a aldeia dos iglus');
    const ald = await C.evaluate(() => { const u = __tc, s = u.Store.scene(); return { id: s.id, paredes: s.walls.length, tipos: [...new Set(s.walls.map(x => x.k))].sort(), ter: s.shapes.filter(x => x.ter).length, ent: s.tokens.filter(x => x.prop === 'entrada').map(x => ({ id: x.id, oculto: !!x.hidden, gera: x.gera })), objetos: s.tokens.filter(x => x.prop && !x.hidden).map(x => x.prop).sort(), fundo: (u.Store.S.assets[s.bg.asset] || {}).url || '' }; });
    const pastaMesa = await M.evaluate(() => TC_CONFIG.url + '/storage/v1/object/public/mesas/' + TC.mesas.atual.id + '/');
    ok(j(ald.tipos) === j(['door', 'mureta', 'wall']) && ald.ter === plano.relevo.length && ald.fundo.startsWith(pastaMesa), 'a aldeia: a paliçada, o portão e a cerca, o relevo leve — e o fundo pintado vira um arquivo na pasta da mesa');
    ok(ald.ent.length === plano.predios.length && ald.ent.every(e => e.oculto && e.gera.t === 'iglu') && ald.ent.filter(e => e.gera.c).length === 1, 'uma Entrada oculta em cada iglu (uma delas, a do chefe): ' + j(ald.ent.map(e => e.gera.c ? 'chefe' : e.gera.t)));
    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok'), 30000), '(tudo salvo)');
    // a jogadora vê a aldeia
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    await J.evaluate(() => { const v = document.getElementById('vivo'); if (!v.hidden) document.getElementById('vivoX').click(); }); await w(300, J);
    await J.locator('#tab-cenas').click();
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && __tc.Store.S.current === id, ald.id); }, 40000), 'a jogadora passa a ver a aldeia');
    await J.waitForTimeout(800);
    if (await B.locator('.modal').count()) { await J.keyboard.press('Escape'); await w(300, J); }
    const vj = await B.evaluate(() => { const s = __tc.Store.scene(); return { paredes: s.walls.length, portao: s.walls.filter(x => x.k === 'door').length, cerca: s.walls.filter(x => x.k === 'mureta').length, ter: s.shapes.filter(x => x.ter).length, entradas: s.tokens.filter(x => x.prop === 'entrada').length, gera: s.tokens.some(x => 'gera' in x), objetos: s.tokens.filter(x => x.prop).map(x => x.prop).sort() }; });
    ok(vj.paredes === ald.paredes && vj.portao === 1 && vj.cerca === 5 && vj.ter === ald.ter, 'a jogadora recebe as paredes (o portão, a cerca do cercado) e o relevo: ' + j(vj));
    ok(vj.entradas === 0 && !vj.gera && j(vj.objetos) === j(ald.objetos), 'e a fogueira, os totens e as tochas, mas nada das Entradas: ' + j(vj.objetos.filter(x => ['fogueira', 'totem', 'tocha'].includes(x))));
    ok(await ate(async () => await B.evaluate(() => __tc.Render.stats.frames > 0 && !(__tc.Render.stats.fail > 0)), 20000), 'a aldeia desenha na tela da jogadora');
    await foto(J, 'l7f-aldeia-jogadora');

    // ---------- o iglu do chefe, por dentro ----------
    const ent = ald.ent.find(e => e.gera.c).id;
    await C.evaluate(id => { const u = __tc, t2 = u.Store.get('tokens', id); u.setSel([{ c: 'tokens', id }]); u.UI.passagem(t2, 400, 300); }, ent); await w(300);
    await C.locator('.menu-i', { hasText: 'Gerar o interior' }).click(); await w(700);
    ok(j(await C.evaluate(() => [...document.querySelectorAll('#int-tipo button')].map(b => b.textContent.trim()))) === j(['Iglu']), 'a janela do interior: o tipo é só "Iglu"');
    await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
    ok(await ate(async () => await C.evaluate(id => __tc.Store.S.pastas.mae[__tc.Store.scene().id] === id && !document.querySelector('.modal'), ald.id), 40000), 'o iglu do chefe, por dentro, sai dentro da aldeia');
    const it = await C.evaluate(() => { const s = __tc.Store.scene(); return { id: s.id, nome: s.name, paredes: s.walls.length, estrado: s.shapes.filter(x => x.ter && x.ter.t === 'plataforma' && x.ter.h === 0.5).length, neve: s.shapes.filter(x => !x.ter && x.k === 'poly').length, moveis: s.tokens.filter(x => x.prop && x.prop !== 'saida').map(x => x.prop).sort() }; });
    ok(it.nome === 'Iglu do chefe — por dentro' && it.estrado === 1 && it.neve === 1 && ['braseiro', 'pele', 'armas', 'totem', 'almofada', 'bau', 'jarro'].every(k => it.moveis.includes(k)), 'o estrado de neve, o braseiro, as peles, o assento, as armas e o totem: ' + j(it));
    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok'), 30000), '(o interior foi salvo)');
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => __tc.Store.S.current === id, it.id); }, 40000), 'a jogadora passa a ver o iglu por dentro');
    await J.waitForTimeout(800);
    const ij = await B.evaluate(() => { const s = __tc.Store.scene(); return { paredes: s.walls.length, estrado: s.shapes.filter(x => x.ter && x.ter.t === 'plataforma' && x.ter.h === 0.5).length, neve: s.shapes.filter(x => !x.ter && x.k === 'poly').length, moveis: s.tokens.filter(x => x.prop && x.prop !== 'saida').map(x => x.prop).sort() }; });
    ok(ij.paredes === it.paredes && ij.estrado === 1 && ij.neve === 1 && j(ij.moveis) === j(it.moveis), 'a jogadora recebe as paredes, o estrado de neve e os móveis: ' + j(ij));
    ok(await ate(async () => await B.evaluate(() => __tc.Render.stats.frames > 0 && !(__tc.Render.stats.fail > 0)), 20000), 'o iglu desenha na tela da jogadora');
    await foto(J, 'l7f-iglu-jogadora');

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
