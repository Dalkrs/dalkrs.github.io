// Lote 19, numa mesa (TC_LOCAL=… no banco local): os membros perdidos das condições das raças vão para a ficha.
//   · a Mão Perdida (do lado direito) num token ligado marca a mão direita da ficha como amputada (estado.amp, com a
//     condição de onde veio), e a ficha mostra a parte amputada;
//   · as Costelas Abertas (dos dois lados) viram dois ferimentos no peito;
//   · a condição tirada na cena desmarca a ficha; o Desfazer marca de novo; a amputação que o mestre marcou à mão na ficha
//     fica, mesmo quando a condição sai.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'fichas' } })).page;
  const w = ms => M.waitForTimeout(ms);
  const quadro = async re => { for (let i = 0; i < 60; i++) { const f = M.frame({ url: re }); if (f) return f; await w(250); } return null; };
  const ate = async (fn, ms = 12000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await w(350); } };
  const linha = () => M.evaluate(() => { const l = TC.dados.col('personagens').todas()[0]; return l ? { id: l.id, nome: l.nome, estado: l.estado, rev: l.rev } : null; });
  const nomeMesa = 'Lote19 E2E ' + Date.now().toString(36);
  let C = null, F = null;
  try {
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    await criarMesaTela(M, nomeMesa);
    // ---------- a ficha ----------
    ok(await ate(async () => { F = await quadro(/\/fichas\//); return F && (await F.locator('#btnNew').count()) === 1; }), '(Fichas abre na mesa)');
    await F.locator('#btnNew').click(); await w(400);
    await F.locator('#f_nome').fill("Mãzier'na"); await w(600);
    ok(await ate(async () => { const l = await linha(); return l && l.rev > 0 && await M.evaluate(() => TC.dados.pendentes === 0); }), '(a ficha sobe para a mesa)');
    const charId = (await linha()).id;
    // ---------- a cena: o token ligado ----------
    await M.locator('#tab-cenas').click();
    ok(await ate(async () => { C = await quadro(/\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Fichas.on()); }, 20000), '(a cena, com as fichas)');
    const tok = await C.evaluate(charId => {
      const u = __tc, sc = u.Store.scene();
      const k = u.newToken(sc, 4 * sc.cell, 4 * sc.cell, { name: 'Ghoul' });
      u.Store.tx('token', () => u.Store.add('tokens', k));
      u.Fichas.link(u.Store.get('tokens', k.id), charId);
      return k.id;
    }, charId);
    // a Mão Perdida, do lado direito (como a janela põe)
    const por = (id, lado) => C.evaluate(([tid, id, lado]) => { const u = __tc, k = u.Store.get('tokens', tid); u.Store.tx(id, () => u.Store.upd('tokens', tid, { conds: k.conds.concat(id), cinfo: Object.assign({}, k.cinfo, { [id]: { lado } }) })); }, [tok, id, lado]);
    await por('maoPerdida', 'd'); await w(300);
    ok(await ate(async () => { const l = await linha(); return l.estado.amp && l.estado.amp.maoD && l.estado.amp.maoD.cond === 'maoPerdida' && !l.estado.amp.maoE; }), 'a Mão Perdida (direita) marca a mão direita da ficha como amputada: ' + JSON.stringify((await linha()).estado.amp));
    // as Costelas Abertas, dos dois lados: dois ferimentos no peito
    await por('costelasAbertas', 'ed'); await w(300);
    ok(await ate(async () => { const f = (await linha()).estado.fer || {}; return f.cond_costelasE && f.cond_costelasD && f.cond_costelasE.p === 'peito' && /Costelas abertas, lado esquerdo/.test(f.cond_costelasE.n); }), 'as Costelas Abertas (os dois lados): dois ferimentos no peito');
    await M.locator('#tab-fichas').click(); await w(700);
    ok(await ate(async () => (await F.locator('.parte.amp').count()) >= 1), 'a ficha mostra a parte amputada');
    // a amputação marcada à mão (o pé esquerdo) fica
    await M.evaluate(id => { const P = TC.dados.col('personagens'), l = P.pegar(id); P.gravar(id, { estado: Object.assign({}, l.estado, { amp: Object.assign({}, l.estado.amp, { peE: { c: 1, n: 'à mão' } }) }) }); }, charId); await w(600);
    // ---------- tirar na cena ----------
    await M.locator('#tab-cenas').click(); await w(400);
    await C.evaluate(id => __tc.Act.condToggle([__tc.Store.get('tokens', id)], 'maoPerdida'), tok); await w(300);
    ok(await ate(async () => { const a = (await linha()).estado.amp || {}; return !a.maoD && a.peE && a.peE.n === 'à mão'; }), 'a condição tirada na cena desmarca a mão; o pé marcado à mão fica: ' + JSON.stringify((await linha()).estado.amp));
    await C.evaluate(() => __tc.Tools.undo()); await w(300);
    ok(await ate(async () => { const a = (await linha()).estado.amp || {}; return !!a.maoD && !!a.peE; }), 'o Desfazer marca a mão de novo');
    await C.evaluate(id => __tc.Act.condToggle([__tc.Store.get('tokens', id)], 'costelasAbertas'), tok); await w(300);
    ok(await ate(async () => { const f = (await linha()).estado.fer || {}; return !f.cond_costelasE && !f.cond_costelasD; }), 'as Costelas tiradas: os ferimentos saem');
  } catch (e) {
    ok(false, 'parou: ' + String((e && e.message) || e).split('\n')[0]);
  } finally {
    try { await M.locator('#tab-fichas').click(); await w(300); await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('(não consegui apagar a mesa de teste: ' + e.message + ')'); }
  }
  const erros = t.errs.filter(e => !/favicon|Failed to load resource|net::ERR/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
