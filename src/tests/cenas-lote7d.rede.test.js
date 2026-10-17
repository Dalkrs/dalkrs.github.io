// Lote 7, parte 4a-2 (a cidade, o mapa de bairros, os interiores, o relevo e as formas), numa mesa de verdade (banco
// local de ensaio ou o projeto real), com o mestre e uma jogadora em aparelhos separados:
//   · o mapa de bairros vai para a mesa com os dados da cidade (com que escolhas, semente e traçado ela foi feita),
//     que são só do mestre: a jogadora recebe o mapa, o relevo e nada dos marcadores (ocultos) nem dos dados;
//   · o mestre, em outro aparelho, abre o mesmo mapa e gera um bairro: a cidade refeita lá é a mesma (os mesmos
//     prédios), e o bairro fica dentro do mapa, ligado ao marcador;
//   · o interior gerado pelo marcador de um prédio: a jogadora recebe as paredes, o estrado e as formas (os feixes de
//     luz), sem o que o marcador sabe.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
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
  const nomeMesa = 'Cenas L7D E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    await M.locator('#tab-cenas').click();
    let C = null, B = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre'); }, 40000), '(o mestre está nas Cenas da mesa)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }

    // ---------- o mapa de bairros ----------
    await C.locator('#sceneBtn').click(); await w(300);
    await C.locator('.menu-i', { hasText: 'Gerar um lugar…' }).click(); await w(800);
    await C.locator('#ger-lugar button', { hasText: 'Cidade' }).click(); await w(700);
    await C.locator('#cid-tam button', { hasText: 'Pequena' }).click(); await w(500);
    await C.locator('#cid-modo button', { hasText: 'Mapa de bairros' }).click(); await w(500);
    await C.locator('#ger-nome').fill('Mapa de teste');
    const plano = await C.evaluate(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado.plano)));
    await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
    ok(await ate(async () => await C.evaluate(() => __tc.Store.scene().name === 'Mapa de teste' && !document.querySelector('#ger-prev')), 40000), 'o mestre cria o mapa de bairros');
    const mapa = await C.evaluate(() => { const u = __tc, s = u.Store.scene(); return { id: s.id, gerado: JSON.parse(JSON.stringify(s.gerado)), ter: s.shapes.filter(x => x.ter).length, mk: s.tokens.filter(x => x.gera && x.gera.b).map(x => ({ id: x.id, b: x.gera.b })), fundo: (u.Store.S.assets[s.bg.asset] || {}).url || '' }; });
    const pastaMesa = await M.evaluate(() => TC_CONFIG.url + '/storage/v1/object/public/mesas/' + TC.mesas.atual.id + '/');
    ok(mapa.gerado && mapa.gerado.seed === plano.seed && mapa.gerado.trava.ruas === plano.sRuas && mapa.mk.length === 6 && mapa.ter > 5 && mapa.fundo.startsWith(pastaMesa), 'o mapa: os dados da cidade, os seis marcadores, o relevo — e o fundo pintado vira um arquivo na pasta da mesa');
    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok'), 30000), '(tudo salvo)');
    // a jogadora vê o mapa
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    await J.evaluate(() => { const v = document.getElementById('vivo'); if (!v.hidden) document.getElementById('vivoX').click(); }); await w(300, J);
    await J.locator('#tab-cenas').click();
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && __tc.Store.S.current === id, mapa.id); }, 40000), 'a jogadora passa a ver o mapa');
    await J.waitForTimeout(800);
    if (await B.locator('.modal').count()) { await J.keyboard.press('Escape'); await w(300, J); }
    const vj = await B.evaluate(() => { const s = __tc.Store.scene(); return { gerado: 'gerado' in s, ter: s.shapes.filter(x => x.ter).length, marcadores: s.tokens.filter(x => x.prop === 'entrada').length }; });
    ok(!vj.gerado && vj.ter === mapa.ter && vj.marcadores === 0, 'a jogadora recebe o mapa e o relevo, mas não os dados da cidade nem os marcadores (ocultos): ' + JSON.stringify(vj));
    await foto(J, 'l7d-mapa-jogadora');

    // ---------- outro aparelho do mestre: o mesmo mapa gera o bairro ----------
    {
      const d2 = await t.device({ name: 'mestre2', seed }), M2 = d2.page;
      await M2.goto(t.base + '?debug', { waitUntil: 'load' }); await M2.waitForTimeout(1500);
      await loginTela(M2, c.mestre, c.senha);
      await M2.evaluate(async nome => { const m = (await TC.mesas.lista()).find(x => x.nome === nome); await TC.mesas.abrir(m.id); }, nomeMesa);
      await M2.waitForTimeout(800);
      if (await M2.locator('dialog[open]').count()) { await M2.keyboard.press('Escape'); await M2.waitForTimeout(300); }
      await M2.locator('#tab-cenas').click();
      let C2 = null;
      ok(await ate(async () => { C2 = await quadro(M2, /\/cenas\//); return C2 && await C2.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && !!__tc.Store.S.scenes[id] && !!__tc.Store.S.scenes[id].gerado, mapa.id); }, 40000), 'o mestre, em outro aparelho, encontra o mapa com os dados da cidade (estão na mesa)');
      const igual = await C2.evaluate(([id, n]) => { const u = __tc, g = u.Store.S.scenes[id].gerado, p = u.Cidade.gerar(Object.assign({}, g.o, { seed: g.seed, trava: g.trava, modo: 'completa' })); return p.predios.length === n; }, [mapa.id, plano.predios.length]);
      ok(igual, 'lá, a cidade refeita com os dados do mapa é a mesma (os mesmos prédios)');
      await C2.evaluate(id => __tc.UI.switchScene(id), mapa.id); await M2.waitForTimeout(500);
      const mk = mapa.mk.find(x => x.b === 'mercado') || mapa.mk[0];
      await C2.evaluate(id => { const u = __tc, t2 = u.Store.get('tokens', id); u.setSel([{ c: 'tokens', id }]); u.UI.passagem(t2, 400, 300); }, mk.id); await M2.waitForTimeout(300);
      await C2.locator('.menu-i', { hasText: 'Gerar este bairro' }).click(); await M2.waitForTimeout(900);
      await C2.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
      ok(await ate(async () => await C2.evaluate(([id, mk2]) => { const u = __tc, s = u.Store.scene(); return s.id !== id && u.Store.S.pastas.mae[s.id] === id && u.Store.S.scenes[id].tokens.find(x => x.id === mk2).cena === s.id && !document.querySelector('.modal'); }, [mapa.id, mk.id]), 40000), 'o bairro sai dentro do mapa, e o marcador do mapa já leva até ele');
      ok(await ate(async () => await parado(M2) && await C2.evaluate(() => __tc.Persist.status() === 'ok'), 30000), '(o bairro foi salvo)');
      await d2.ctx.close();
    }

    // ---------- o interior, mostrado à jogadora ----------
    ok(await ate(async () => await C.evaluate(id => Object.values(__tc.Store.S.scenes).some(s => __tc.Store.S.pastas.mae[s.id] === id), mapa.id), 30000), 'o primeiro aparelho do mestre recebe o bairro novo');
    const bai = await C.evaluate(id => Object.values(__tc.Store.S.scenes).find(s => __tc.Store.S.pastas.mae[s.id] === id).id, mapa.id);
    await C.evaluate(id => __tc.UI.switchScene(id), bai); await w(600);
    const ent = await C.evaluate(() => { const s = __tc.Store.scene(), l = s.tokens.filter(x => x.prop === 'entrada' && x.gera && x.gera.t); return (l.find(x => x.gera.t === 'templo') || l[0]).id; });
    await C.evaluate(id => { const u = __tc, t2 = u.Store.get('tokens', id); u.setSel([{ c: 'tokens', id }]); u.UI.passagem(t2, 400, 300); }, ent); await w(300);
    await C.locator('.menu-i', { hasText: 'Gerar o interior' }).click(); await w(700);
    await C.locator('#int-tipo button', { hasText: 'Templo' }).click(); await w(300);
    await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
    ok(await ate(async () => await C.evaluate(id => __tc.Store.S.pastas.mae[__tc.Store.scene().id] === id && !document.querySelector('.modal'), bai), 40000), 'o interior (um templo) sai dentro do bairro');
    const it = await C.evaluate(() => { const s = __tc.Store.scene(); return { id: s.id, paredes: s.walls.length, estrado: s.shapes.filter(x => x.ter && x.ter.t === 'plataforma').length, feixes: s.shapes.filter(x => !x.ter && x.k === 'poly').length, saida: s.tokens.filter(x => x.prop === 'saida').length }; });
    await C.evaluate(id => { const u = __tc, t2 = u.Store.get('tokens', u.Store.scene().tokens.find(x => x.prop === 'saida').id); t2.hidden = false; u.Store.tx('x', () => u.Store.upd('tokens', t2.id, { hidden: false })); }); await w(300);
    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok'), 30000), '(o interior foi salvo)');
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => __tc.Store.S.current === id, it.id); }, 40000), 'a jogadora passa a ver o interior');
    await J.waitForTimeout(800);
    const ij = await B.evaluate(() => { const s = __tc.Store.scene(), sa = s.tokens.find(x => x.prop === 'saida'); return { paredes: s.walls.length, estrado: s.shapes.filter(x => x.ter && x.ter.t === 'plataforma').length, feixes: s.shapes.filter(x => !x.ter && x.k === 'poly').length, saida: !!sa, cena: sa ? 'cena' in sa : null, gera: s.tokens.some(x => 'gera' in x) }; });
    ok(ij.paredes === it.paredes && ij.estrado === it.estrado && it.estrado >= 1 && ij.feixes === it.feixes && it.feixes >= 1 && ij.saida && ij.cena === false && !ij.gera, 'a jogadora recebe as paredes, o estrado do altar e os feixes de luz; a Saída à mostra chega sem dizer aonde leva: ' + JSON.stringify(ij));
    ok(await ate(async () => await B.evaluate(() => __tc.Render.stats.frames > 0 && !(__tc.Render.stats.fail > 0)), 20000), 'o interior desenha na tela da jogadora');
    await foto(J, 'l7d-interior-jogadora');

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
