// Mapa-múndi, lote 9 (parte 5), numa mesa (TC_LOCAL=… no banco local): os heróis na Guerra com as fichas de verdade.
//   · a ficha feita nas Fichas aparece em "+ Herói (uma ficha da mesa)…" do exército, com o bônus sugerido pelas contas
//     dela (nível e maior atributo);
//   · na batalha (a resumida), o herói soma; no depois, o ferimento dele vai para o HP da ficha e sobe para a mesa; o
//     Desfazer do aviso devolve o HP (e o Refazer tira de novo).
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1400, h: 900, seed: { 'tinycats:aba': 'fichas' } })).page;
  const w = ms => M.waitForTimeout(ms);
  const quadro = async re => { for (let i = 0; i < 60; i++) { const f = M.frame({ url: re }); if (f) return f; await w(250); } return null; };
  const ate = async (fn, ms = 15000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await w(350); } };
  const linha = id => M.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? JSON.parse(JSON.stringify({ id: l.id, nome: l.nome, estado: l.estado || null, rev: l.rev })) : null; }, id);
  const calma = () => M.evaluate(() => TC.dados.pendentes === 0);
  const nomeMesa = 'Herois E2E ' + Date.now().toString(36);
  let F = null, W = null;
  try {
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    await criarMesaTela(M, nomeMesa);

    // ---------- a ficha, nas Fichas ----------
    ok(await ate(async () => { F = await quadro(/\/fichas\//); return F && (await F.locator('#btnNew').count()) === 1; }), '(Fichas abre na mesa)');
    await F.locator('#btnNew').click(); await w(400);
    await F.locator('#f_nome').fill('Dain X'); await F.locator('#f_tier').selectOption('S'); await w(200); await F.locator('#f_level').selectOption('19'); await w(600);
    ok(await ate(async () => { const ls = await M.evaluate(() => TC.dados.col('personagens').todas().filter(l => !l.apagado).map(l => ({ nome: l.nome, rev: l.rev }))); return ls.length === 1 && ls[0].nome === 'Dain X' && ls[0].rev > 0 && await calma(); }), '(a ficha sobe para a mesa)');
    const id = await M.evaluate(() => TC.dados.col('personagens').todas().find(l => !l.apagado).id);
    const hpMax = await F.evaluate(() => Math.floor(calcular(S.personagens[0]).recursos.find(r => r.nome === 'HP').val));
    const idHP = await F.evaluate(() => S.personagens[0].recursos.find(r => r.nome === 'HP').id);
    const hpDe = async () => { const l = await linha(id); return l ? (l.estado && l.estado.rec && l.estado.rec[idHP] != null ? l.estado.rec[idHP] : hpMax) : null; };

    // ---------- o mapa: dois exércitos ----------
    await M.locator('#tab-mundo').click();
    ok(await ate(async () => { W = await quadro(/\/mundo\//); return W && await W.evaluate(() => !!window.__mundo && __mundo.App.pronto && __mundo.App.naMesa && __mundo.App.papel === 'mestre'); }, 20000), 'o mestre abre o Mapa-múndi da mesa');
    await W.evaluate(() => {
      const { App, N } = __mundo, Y = 346.41;
      App.criarMapa('Terras de Aldar');
      App.mudar('montar', m => {
        m.grade.tam = 40;
        m.faccoes.push({ id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, { id: 'fb', nome: 'Vale', cor: '#8a2a2a' });
        m.objs.push(Object.assign(N.objNovo('g', { x: 400, y: Y, sigla: 'EXE' }), { id: 'ga', nome: 'Hoste de Aldar', tipo: 'exercito', fac: 'fa', exe: { cmd: { nome: 'Rei', b: 0 }, moral: 5, mant: 50, unid: [{ id: 'u1', nome: 'Lanceiros', tropas: 500, atq: 3, def: 3 }] } }),
          Object.assign(N.objNovo('g', { x: 440, y: Y, sigla: 'EXE' }), { id: 'gb', nome: 'Legião do Vale', tipo: 'exercito', fac: 'fb', exe: { cmd: { nome: 'Duque', b: 0 }, moral: 5, mant: 50, unid: [{ id: 'u2', nome: 'Espadas', tropas: 500, atq: 3, def: 3 }] } }));
      });
    });
    await W.click('#tab-selecao'); await w(200);
    await W.evaluate(() => __mundo.App.selecionar(['ga'])); await w(400);
    const sel = W.locator('#pane [data-k="o:ga:heroi-novo"]');
    ok(await ate(async () => (await sel.count()) === 1 && (await sel.locator('option').allInnerTexts()).includes('Dain X')), 'a ficha das Fichas aparece em "+ Herói (uma ficha da mesa)…" do exército');
    await sel.selectOption(id); await w(500);
    ok(await ate(async () => j(await W.evaluate(() => __mundo.App.mapa.objs.find(o => o.id === 'ga').exe.herois)) === j([{ ficha: id }])), 'Dain X entra no exército');
    const dica = await W.evaluate(id => ((document.querySelector('#pane [data-k="o:ga:heroi:' + id + '"]') || {}).innerText || '').replace(/\s+/g, ' '), id);
    const mm = dica.match(/sugerido ([+−]?\d+) \(nível 19, maior atributo (\d+)\)/), sug = mm ? await W.evaluate(x => MundoGuerra.bonusSugerido(19, x), Number(mm[2])) : null;
    ok(!!mm && Number(mm[1].replace('−', '-')) === sug, 'o bônus sugerido vem das contas da ficha (nível 19 e o maior atributo dela): ' + dica);

    // ---------- a batalha: a resumida, o depois, aplicar ----------
    await W.evaluate(() => window.MundoGuerraPainel.abrirBatalha({ a: 'ga', b: 'gb' })); await w(400);
    ok(await ate(async () => /Heróis 1 \(/.test(await W.evaluate(() => ((document.querySelector('dialog.gb .gb-corpo') || {}).innerText || '').replace(/\s+/g, ' ')))), 'na batalha, a linha dos heróis na comparação (Dain X do lado de Aldar)');
    await W.evaluate(() => { let i = 0; const v = [0.95, 0.1]; __mundo.App.rng = () => v[i++ % v.length]; });
    await W.locator('dialog.gb [data-k="gb:d100"]').click(); await w(400);
    await W.locator('dialog.gb [data-k="gb:depois"]').click(); await w(400);
    const pct = await W.evaluate(() => MundoGuerra.feridaDoHeroi(window.MundoGuerraPainel.batalha.fim, 'a')), dano = Math.round(hpMax * pct / 100);
    const lin = await W.evaluate(id => ((document.querySelector('dialog.gb [data-k="gb:dep:heroi:' + id + '"]') || {}).innerText || '').replace(/\s+/g, ' '), id);
    ok(/Dain X \(Hoste de Aldar\)/.test(lin) && lin.includes(hpMax + ' → ' + (hpMax - dano)), 'no depois, o HP da ficha antes e depois (' + pct + '% do máximo): ' + lin);
    await W.locator('dialog.gb [data-k="gb:aplicar"]').click(); await w(600);
    ok(await ate(async () => (await hpDe()) === hpMax - dano && await calma()), 'aplicar: o ferimento vai para o HP da ficha e sobe para a mesa (' + hpMax + ' → ' + (hpMax - dano) + ')');
    await W.locator('#toasts .toast button', { hasText: 'Desfazer' }).first().click(); await w(600);
    ok(await ate(async () => (await hpDe()) === hpMax && await calma() && !(await W.evaluate(() => (__mundo.App.mapa.guerra || { bats: [] }).bats.length))), 'o Desfazer do aviso: a batalha sai do mapa e o HP da ficha volta (' + hpMax + ')');
    await W.evaluate(() => __mundo.App.refazer()); await w(600);
    ok(await ate(async () => (await hpDe()) === hpMax - dano && await calma()), 'o Refazer: o ferimento volta para a ficha');
  } catch (e) {
    ok(false, 'parou: ' + String((e && e.message) || e).split('\n')[0]);
  } finally {
    try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste:', e.message); }
    const erros = (t.errs || []).filter(e => !/^\[prep\]/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/status of (400|401|403|409)/.test(e));
    if (erros.length) console.log(erros.slice(0, 8).join('\n'));
    ok(erros.length === 0, 'sem erros inesperados no console');
    await t.close();
    end();
  }
})().catch(e => { console.error(e); process.exit(1); });
