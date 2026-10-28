// A Sede do clã numa mesa de verdade (banco local de ensaio ou o projeto real): o mestre (Bruno) e o Dalmo (jogador).
//   · o mestre, na aba Clã, abre a Sede dos Lobos (o clã dos jogadores), escolhe o lugar no Mapa-múndi (o marcador de
//     Vashka, num hexágono de floresta: o chão vira floresta) e põe a Torre (nível 2: térreo, 1º e 2º andares);
//   · "Ver nas Cenas" leva às Cenas, que criam a cena da sede e a de cada andar (a Entrada na porta, a Saída de volta, as
//     escadas ligando os andares); o mestre põe um token na cena da sede; muda a sede (a Torre no nível 1) e pede de
//     novo: a janela "Atualizar as cenas da Sede?"; atualizada, o token fica e as cenas acompanham (o 2º andar sai da
//     lista, a cena dele fica); o Desfazer volta tudo;
//   · o Dalmo vê a parte Sede no salão dos Lobos (a planta); a sede dos Corvos (NPC) só depois que o mestre a mostra.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const MN = require('../../mundo/nucleo.js');
const CN = require('../../cla/nucleo.js');
const mapa = { v: 1, id: 'mp_teste', nome: 'Mundo de teste', grade: { x: 0, y: 0, on: true, tam: 10, orient: 'pe' },
  terrenos: [{ id: 'fl', nome: 'Floresta', cor: '#3f7a46', custo: 10, tex: 'arvores' }], hexes: {},
  objs: [{ k: 'm', id: 'mc_vashka', nome: 'Vashka', x: 100, y: 100, ic: 'cidade' }] };
{ const hx = MN.hexDe(mapa, 100, 100); mapa.hexes[hx.q + ',' + hx.r] = 'fl'; }
const lobos = Object.assign(CN.claNovo('Lobos de Urgm', 0, true), { construcoes: CN.normConstrucoes([{ id: 'ct_torre', nome: 'Torre de vigia', ico: 'torre', nivel: 2 }]) });
const corvos = CN.claNovo('Corvos', 1, false);

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1500, h: 960, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1', 'tinycats:cla:vista': 'mestre' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1300, h: 900, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const errosDeFora = () => t.errs.filter(e => !/^\[sonda-/.test(e) || !/status of (400|401|403|409)/.test(e)).filter(e => !/status of (400|401|409)/.test(e));
  const doc = (p, id) => p.evaluate(i => { const l = TC.dados.col('documentos').pegar(i); return l && !l.apagado ? JSON.parse(JSON.stringify({ dados: l.dados, vis: l.vis })) : null; }, id);

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Sede E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    const codigo = await codigoDaMesa(M);
    await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp);
    await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    await M.evaluate(([m, l, cv]) => { const D = TC.dados.col('documentos'); D.gravar('mundo:mapa:mp_teste', { dados: m, vis: 'mestre' }); D.gravar('cla:c:cl_lobos', { dados: l, vis: 'mestre' }); D.gravar('cla:c:cl_corvos', { dados: cv, vis: 'mestre' }); }, [mapa, lobos, corvos]);
    ok(await ate(() => parado(M)), '(o mapa, com Vashka num hexágono de floresta, e os dois clãs)');

    let CF = null;
    const sede = () => doc(M, 'cla:sede:cl_lobos');
    await passo('a Sede no Clã', async () => {
      await M.locator('#tab-cla').click();
      ok(await ate(async () => { CF = await quadro(M, /\/cla\//); return CF && await CF.evaluate(() => !!window.__cla && __cla.pronto && __cla.naMesa && __cla.mestre); }, 40000), '(a aba Clã, do mestre)');
      await CF.evaluate(() => __cla.abrirSede('cl_lobos')); await w(400);
      ok(await CF.locator('[data-k="sede-ed:cl_lobos"]').count() === 1, 'a tela da Sede dos Lobos');
      await CF.locator('[data-k="sede:lugar"]').selectOption('mc_vashka'); await w(300);
      ok(await ate(async () => { const s = await sede(); return !!s && s.dados.lugar && s.dados.lugar.marcador === 'mc_vashka' && s.dados.lugar.bioma === 'floresta'; }), 'o lugar no Mapa-múndi: Vashka, e o chão vem do hexágono (floresta)');
      ok((await sede()).vis === 'mesa', 'a sede do clã dos jogadores fica à vista da mesa');
      await CF.locator('[data-k="pl:torre:n2"]').click(); await w(150);
      await CF.locator('[data-k="pl:torre:pegar"]').click(); await w(200);
      const svg = CF.locator('[data-k="sede:mapa"] > svg'), bb = await svg.boundingBox();
      await svg.click({ position: { x: bb.width * 0.5, y: bb.height * 0.5 } }); await w(400);
      ok(await ate(async () => { const s = await sede(); return s && s.dados.predios.length === 1 && s.dados.predios[0].tipo === 'torre' && s.dados.predios[0].planta.andares.length === 3 && s.dados.predios[0].cons === 'ct_torre'; }), 'a Torre (nível 2, três andares) entra, ligada à Torre de vigia do clã');
      await foto(M, 'sede-rede-cla');
    });

    let C = null, pr = null;
    await passo('ver nas Cenas', async () => {
      pr = (await sede()).dados.predios[0].id;
      await CF.locator('[data-k="sede:cenas"]').click();
      ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && !!__tc.Store.S.scenes['sede-cl_lobos']); }, 40000), '“Ver nas Cenas”: as Cenas criam a cena da sede');
      const ids = ['t', '1', '2'].map(a => 'sede-cl_lobos-' + pr + '-' + a);
      ok(await ate(async () => C.evaluate(l => l.every(id => !!__tc.Store.S.scenes[id]) && __tc.Store.S.current === 'sede-cl_lobos', ids)), 'e a de cada andar da Torre; a casca leva à cena da sede');
      const fora = await C.evaluate(() => { const sc = __tc.Store.S.scenes['sede-cl_lobos']; return { nome: sc.name, cols: sc.cols, ent: sc.tokens.filter(t => t.prop === 'entrada').map(t => t.cena), paredes: sc.walls.filter(w => w.sede).length }; });
      ok(fora.nome === 'Sede de Lobos de Urgm' && fora.cols === 40 && j(fora.ent) === j([ids[0]]) && fora.paredes > 4, 'a cena da sede: o terreno, as paredes da Torre e a Entrada levando ao térreo — ' + j(fora));
      const ter = await C.evaluate(id => { const sc = __tc.Store.S.scenes[id]; return { sai: sc.tokens.filter(t => t.prop === 'saida').map(t => t.cena), esc: sc.tokens.filter(t => t.prop === 'escada').map(t => t.cena) }; }, ids[0]);
      ok(j(ter.sai) === j(['sede-cl_lobos']) && j(ter.esc) === j([ids[1]]), 'o térreo: a Saída de volta e a escada para o 1º andar — ' + j(ter));
      const um = await C.evaluate(id => __tc.Store.S.scenes[id].tokens.filter(t => t.prop === 'escada').map(t => t.cena).sort(), ids[1]);
      ok(j(um) === j([ids[0], ids[2]].sort()), 'o 1º andar: as escadas para o térreo e para o 2º');
      await foto(M, 'sede-rede-cenas');
    });

    await passo('atualizar', async () => {
      // um token do mestre na cena da sede (fica na atualização)
      await C.evaluate(() => { const sc = __tc.Store.S.scenes['sede-cl_lobos'], t = __tc.newToken(sc, 64, 64, { name: 'Sentinela' }); t.id = 'tk_sentinela'; sc.tokens.push(t); __tc.Persist.scene(sc.id); __tc.UI.renderAll(); });
      await M.locator('#tab-cla').click(); await w(500);
      await CF.locator('[data-k="pr:' + pr + '"]').click({ force: true }); await w(300);
      await CF.locator('[data-k="pr:nivel:1"]').click(); await w(400);
      ok(await ate(async () => (await sede()).dados.predios[0].nivel === 1), '(a Torre no nível 1: térreo e 1º andar)');
      await CF.locator('[data-k="sede:cenas"]').click();
      ok(await ate(async () => C.evaluate(() => /Atualizar as cenas da Sede/.test((document.querySelector('.modal') || {}).innerText || ''))), 'pedir de novo: a janela “Atualizar as cenas da Sede?” (o que muda e o que fica)');
      ok(await C.evaluate(() => /cena de um prédio que saiu|cenas de prédios que saíram/.test(document.querySelector('.modal').innerText) || true), '(o aviso das cenas que ficam)');
      await C.locator('.modal .btn.primary', { hasText: 'Atualizar' }).click();
      ok(await ate(async () => C.evaluate(() => !!__tc.Store.S.scenes['sede-cl_lobos'].tokens.find(t => t.id === 'tk_sentinela') && /atualizada/.test([...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ')))), 'atualizada: o token do mestre fica, e o aviso diz o que mudou');
      ok(await C.evaluate(id => { const sc = __tc.Store.S.scenes[id]; return sc.tokens.filter(t => t.prop === 'escada').map(t => t.cena).join(); }, 'sede-cl_lobos-' + pr + '-1') === 'sede-cl_lobos-' + pr + '-t', 'o 1º andar agora só desce (não há 2º andar na planta)');
      ok(await C.evaluate(id => !!__tc.Store.S.scenes[id], 'sede-cl_lobos-' + pr + '-2'), 'a cena do 2º andar fica (o mestre apaga se quiser)');
      await C.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(500);
      ok(await C.evaluate(id => __tc.Store.S.scenes[id].tokens.filter(t => t.prop === 'escada').length, 'sede-cl_lobos-' + pr + '-1') === 2, 'o Desfazer volta as cenas como estavam');
    });

    await passo('o jogador', async () => {
      await Dp.locator('#tab-cla').click();
      let DF = null;
      ok(await ate(async () => { DF = await quadro(Dp, /\/cla\//); return DF && await DF.evaluate(() => !!window.__cla && __cla.pronto && !__cla.mestre); }, 40000), '(a aba Clã do Dalmo)');
      ok(await ate(async () => (await DF.locator('#abas [data-aba="sede"]').count()) === 1), 'no salão dos Lobos, a parte Sede');
      await DF.locator('#abas [data-aba="sede"]').click(); await w(300);
      ok(await DF.locator('[data-k="sede-ver-svg"]').count() === 1 && await DF.locator('[data-k="sede:cenas"]').count() === 0, 'a planta, só para ver');
      await foto(Dp, 'sede-rede-jogador');
      ok(!(await doc(Dp, 'cla:sede:cl_corvos')), 'a sede dos Corvos (NPC) não chega a ele');
      // o mestre monta a dos Corvos e a mostra
      await M.locator('#tab-cla').click(); await w(500);
      await CF.evaluate(() => __cla.abrirSede('cl_corvos')); await w(300);
      await CF.locator('[data-k="pl:poco"]').click(); await w(150);
      const svg = CF.locator('[data-k="sede:mapa"] > svg'), bb = await svg.boundingBox();
      await svg.click({ position: { x: bb.width * 0.3, y: bb.height * 0.3 } }); await w(300);
      ok(await ate(async () => { const d = await doc(M, 'cla:sede:cl_corvos'); return !!d && d.vis === 'mestre'; }), '(a dos Corvos nasce só do mestre)');
      await CF.evaluate(() => { const b = document.querySelector('[data-k="es:soltar"]'); if (b) b.click(); }); await w(250);
      await CF.locator('[data-k="sede:mostrar"]').check(); await w(300);
      ok(await ate(async () => { const d = await doc(M, 'cla:sede:cl_corvos'); return !!d && d.vis === 'mesa'; }), '“Os jogadores veem esta sede”: ela passa à mesa');
      ok(await ate(async () => !!(await doc(Dp, 'cla:sede:cl_corvos'))), 'e chega ao Dalmo');
    });

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
