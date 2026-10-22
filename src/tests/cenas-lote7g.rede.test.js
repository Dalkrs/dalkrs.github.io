// Lote 7, parte 4b-2 (o porto), numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre e uma
// jogadora em aparelhos separados:
//   · a aba Porto da janela "Gerar um lugar": o porto grande, pequeno, vai para a mesa com o fundo pintado na pasta dela;
//     a jogadora recebe as paredes (os prédios fechados e a amurada do navio, de mureta), o relevo leve (o mar, os
//     molhes, o convés, o quebra-mar, o farol), os lampiões e a carga do convés — e nada das Entradas (ocultas) nem do
//     que elas sabem;
//   · o porão do navio (pela Entrada da escotilha): sai dentro do porto, do tamanho do convés; a jogadora recebe tudo.
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
  const nomeMesa = 'Cenas L7G E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    await M.locator('#tab-cenas').click();
    let C = null, B = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre'); }, 40000), '(o mestre está nas Cenas da mesa)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }

    // ---------- o porto grande ----------
    await C.locator('#sceneBtn').click(); await w(300);
    await C.locator('.menu-i', { hasText: 'Gerar um lugar…' }).click(); await w(800);
    await C.locator('#ger-lugar button', { hasText: 'Porto' }).click(); await w(700);
    await C.locator('#ger-arredores button', { hasText: 'Nenhum' }).click(); await w(500);      // (lote 14, parte 14c: o lugar sozinho)
    await C.locator('#por-tipo button', { hasText: 'Porto grande' }).click(); await w(500);
    await C.locator('#por-tam button', { hasText: 'Pequeno' }).click(); await w(500);
    { const f = C.locator('#ger-semente'); await f.fill('5'); await f.press('Enter'); await w(500); }
    const plano = await C.evaluate(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado.plano)));
    ok(plano.lugar === 'porto' && plano.tipo === 'porto' && plano.W === 54 && plano.H === 42 && plano.navios.length === 1 && plano.predios.length >= 6, '(o porto grande, pequeno, com um navio)');
    await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
    ok(await ate(async () => await C.evaluate(() => __tc.Store.scene().name === 'Porto' && !document.querySelector('#ger-prev')), 40000), 'o mestre cria o porto');
    const por = await C.evaluate(() => { const u = __tc, s = u.Store.scene(); return { id: s.id, paredes: s.walls.length, tipos: [...new Set(s.walls.map(x => x.k))].sort(), mureta: s.walls.filter(x => x.k === 'mureta').length, ter: s.shapes.filter(x => x.ter).length, ent: s.tokens.filter(x => x.prop === 'entrada').map(x => ({ id: x.id, oculto: !!x.hidden, gera: x.gera })), objetos: s.tokens.filter(x => x.prop && !x.hidden).map(x => x.prop).sort(), fundo: (u.Store.S.assets[s.bg.asset] || {}).url || '' }; });
    const pastaMesa = await M.evaluate(() => TC_CONFIG.url + '/storage/v1/object/public/mesas/' + TC.mesas.atual.id + '/');
    ok(j(por.tipos) === j(['mureta', 'wall']) && por.mureta >= 6 && por.ter === plano.relevo.length && por.fundo.startsWith(pastaMesa), 'o porto: os prédios e a amurada do navio (mureta), o relevo — e o fundo pintado vira um arquivo na pasta da mesa: ' + j([por.tipos, por.mureta]));
    ok(por.ent.length === plano.predios.length + 1 && por.ent.every(e => e.oculto) && por.ent.filter(e => e.gera.t === 'navio').length === 1, 'uma Entrada oculta em cada prédio e uma na escotilha do navio: ' + j(por.ent.map(e => e.gera.t)));
    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok'), 30000), '(tudo salvo)');
    // a jogadora vê o porto
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    await J.evaluate(() => { const v = document.getElementById('vivo'); if (!v.hidden) document.getElementById('vivoX').click(); }); await w(300, J);
    await J.locator('#tab-cenas').click();
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && __tc.Store.S.current === id, por.id); }, 40000), 'a jogadora passa a ver o porto');
    await J.waitForTimeout(800);
    if (await B.locator('.modal').count()) { await J.keyboard.press('Escape'); await w(300, J); }
    const vj = await B.evaluate(() => { const s = __tc.Store.scene(); return { paredes: s.walls.length, mureta: s.walls.filter(x => x.k === 'mureta').length, ter: s.shapes.filter(x => x.ter).length, entradas: s.tokens.filter(x => x.prop === 'entrada').length, gera: s.tokens.some(x => 'gera' in x), objetos: s.tokens.filter(x => x.prop).map(x => x.prop).sort() }; });
    ok(vj.paredes === por.paredes && vj.mureta === por.mureta && vj.ter === por.ter, 'a jogadora recebe as paredes (a amurada do navio) e o relevo: ' + j(vj));
    ok(vj.entradas === 0 && !vj.gera && j(vj.objetos) === j(por.objetos), 'e os lampiões, a carga e os enfeites, mas nada das Entradas: ' + j(vj.objetos.filter(x => ['lampiao', 'barril', 'caixote'].includes(x)).length));
    ok(await ate(async () => await B.evaluate(() => __tc.Render.stats.frames > 0 && !(__tc.Render.stats.fail > 0)), 20000), 'o porto desenha na tela da jogadora');
    await foto(J, 'l7g-porto-jogadora');

    // ---------- o porão do navio ----------
    const ent = por.ent.find(e => e.gera.t === 'navio').id;
    await C.evaluate(id => { const u = __tc, t2 = u.Store.get('tokens', id); u.setSel([{ c: 'tokens', id }]); u.UI.passagem(t2, 400, 300); }, ent); await w(300);
    await C.locator('.menu-i', { hasText: 'Gerar o interior' }).click(); await w(700);
    ok(j(await C.evaluate(() => [...document.querySelectorAll('#int-tipo button')].map(b => b.textContent.trim()))) === j(['Navio']), 'a janela do interior: o tipo é só "Navio"');
    await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
    ok(await ate(async () => await C.evaluate(id => __tc.Store.S.pastas.mae[__tc.Store.scene().id] === id && !document.querySelector('.modal'), por.id), 40000), 'o navio por dentro sai dentro do porto');
    const it = await C.evaluate(() => { const s = __tc.Store.scene(); return { id: s.id, nome: s.name, cols: s.cols, rows: s.rows, paredes: s.walls.length, portas: s.walls.filter(x => x.k === 'door').length, moveis: s.tokens.filter(x => x.prop && x.prop !== 'saida').map(x => x.prop).sort(), saida: s.tokens.filter(x => x.prop === 'saida').length }; });
    const nv = plano.navios[0];
    ok(it.cols === nv.L + 4 && it.rows === nv.B + 4 && it.portas >= 3 && it.saida === 1 && it.moveis.length >= 6, 'do tamanho do convés (com a margem de dois quadrados), com as divisões, as portas, os móveis e a Saída: ' + j([it.cols, it.rows, it.portas, it.moveis.length]));
    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok'), 30000), '(o porão foi salvo)');
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => __tc.Store.S.current === id, it.id); }, 40000), 'a jogadora passa a ver o navio por dentro');
    await J.waitForTimeout(800);
    const ij = await B.evaluate(() => { const s = __tc.Store.scene(); return { paredes: s.walls.length, moveis: s.tokens.filter(x => x.prop && x.prop !== 'saida').map(x => x.prop).sort() }; });
    ok(ij.paredes === it.paredes && j(ij.moveis) === j(it.moveis), 'a jogadora recebe as paredes e os móveis: ' + j(ij));
    ok(await ate(async () => await B.evaluate(() => __tc.Render.stats.frames > 0 && !(__tc.Render.stats.fail > 0)), 20000), 'o navio por dentro desenha na tela da jogadora');
    await foto(J, 'l7g-porao-jogadora');

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
