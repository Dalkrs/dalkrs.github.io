// Cenas, lote 8 (parte 2), numa mesa (TC_LOCAL=… no banco local): o token ligado à ficha.
//   · a Ferida permanente posta no token vai para a ficha (estado.podre), e a ficha mostra a barra podre; a ficha que
//     tira a ferida tira também do token (a ponta e a condição); desfazer na ficha traz de volta; a condição tirada na
//     cena limpa a ficha;
//   · o Clone de um token ligado: as cópias ficam fora da sincronização com a ficha (o dano numa cópia não chega a ela);
//     o dano no real chega à ficha e leva as cópias; o dano que vem da ficha (o HP mudado na aba Fichas) também leva as
//     cópias; a cura que vem da ficha vai do real para as cópias.
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
  const nomeMesa = 'Lote8 E2E ' + Date.now().toString(36);
  let C = null, F = null;
  try {
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    await criarMesaTela(M, nomeMesa);

    // ---------- a ficha ----------
    ok(await ate(async () => { F = await quadro(/\/fichas\//); return F && (await F.locator('#btnNew').count()) === 1; }), '(Fichas abre na mesa)');
    await F.locator('#btnNew').click(); await w(400);
    await F.locator('#f_nome').fill('Dain X'); await F.locator('#f_tier').selectOption('S'); await w(200); await F.locator('#f_level').selectOption('19'); await w(600);
    ok(await ate(async () => { const l = await linha(); return l && l.nome === 'Dain X' && l.rev > 0 && await M.evaluate(() => TC.dados.pendentes === 0); }), '(a ficha sobe para a mesa)');
    const hpMax = await F.evaluate(() => Math.floor(calcular(S.personagens[0]).recursos.find(r => r.nome === 'HP').val));
    const idHP = await F.evaluate(() => S.personagens[0].recursos.find(r => r.nome === 'HP').id);

    // ---------- a cena: um token ligado ----------
    await M.locator('#tab-cenas').click();
    ok(await ate(async () => { C = await quadro(/\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Fichas.on()); }, 20000), '(a cena, com as fichas)');
    const tok = await C.evaluate(charId => {
      const u = __tc, sc = u.Store.scene();
      const k = u.newToken(sc, 4 * sc.cell, 4 * sc.cell, { name: 'Guerreiro' });
      u.Store.tx('token', () => u.Store.add('tokens', k));
      u.Fichas.link(u.Store.get('tokens', k.id), charId);
      return k.id;
    }, await linha().then(l => l.id));
    const hp = () => C.evaluate(id => { const k = __tc.Store.get('tokens', id); const b = k && k.bars.find(x => x.n === 'HP'); return b ? { v: b.v, m: b.m, pod: b.pod || 0, conds: k.conds } : null; }, tok);
    ok(await ate(async () => { const b = await hp(); return b && b.m === hpMax && b.v === hpMax; }), 'o token ligado tem o HP da ficha: ' + JSON.stringify(await hp()));

    // ---------- a Ferida permanente: cena → ficha ----------
    await C.evaluate(id => { const u = __tc, k = u.Store.get('tokens', id), i = k.bars.findIndex(b => b.n === 'HP'); u.Act.podSet(k, i, 20); }, tok); await w(300);
    let b = await hp();
    ok(b.pod === 20 && b.v === hpMax - 20 && b.conds.includes('ferida'), 'a ferida no token: a ponta podre (20), o HP no teto e a condição: ' + JSON.stringify(b));
    ok(await ate(async () => { const l = await linha(); return l.estado.podre && l.estado.podre[idHP] === 20 && l.estado.rec[idHP] === hpMax - 20; }), 'a ficha guarda o podre e o HP no teto (estado.podre)');
    await M.locator('#tab-fichas').click(); await w(600);
    ok(await ate(async () => (await F.locator(`[data-respodre="${idHP}"]`).count()) === 1 && (await F.locator(`[data-resatual="${idHP}"]`).inputValue()) === String(hpMax - 20)), 'a ficha mostra a barra podre ("20 apodrecidos") e o HP no teto');
    // a ficha tira a ferida: o token perde a ponta e a condição
    await F.locator(`[data-restirapodre="${idHP}"]`).click(); await w(400);
    await M.locator('#tab-cenas').click(); await w(400);
    ok(await ate(async () => { const x = await hp(); return x.pod === 0 && !x.conds.includes('ferida'); }), 'tirada na ficha, a ferida sai do token (a ponta e a condição): ' + JSON.stringify(await hp()));
    await M.locator('#tab-fichas').click(); await w(400);
    await F.locator('.aviso button, .toast button', { hasText: 'Desfazer' }).first().click().catch(() => {}); await w(400);
    await M.locator('#tab-cenas').click(); await w(400);
    ok(await ate(async () => { const x = await hp(); return x.pod === 20 && x.conds.includes('ferida'); }), 'desfazer na ficha traz a ferida de volta ao token');
    // a condição tirada na cena limpa a ficha
    await C.evaluate(id => __tc.Act.condToggle([__tc.Store.get('tokens', id)], 'ferida'), tok); await w(300);
    ok(await ate(async () => { const x = await hp(); const l = await linha(); return x.pod === 0 && !(l.estado.podre && l.estado.podre[idHP]); }), 'a condição tirada na cena limpa a ficha');

    // ---------- o Clone de um token ligado ----------
    await C.evaluate(id => { const u = __tc, k = u.Store.get('tokens', id), i = k.bars.findIndex(b => b.n === 'HP'); u.Act.barSet(k, i, '+999'); }, tok); await w(300);
    const hpCheio = (await hp()).v;
    const res = await C.evaluate(id => __tc.Act.cloneCriar(__tc.Store.get('tokens', id), 2, 2, false), tok); await w(300);
    const copias = () => C.evaluate(id => __tc.Store.scene().tokens.filter(x => x.clone === id).map(x => ({ id: x.id, char: x.char, v: x.bars.find(b => b.n === 'HP').v })), tok);
    let cs = await copias();
    ok(res.n === 2 && cs.length === 2 && cs.every(x => x.char && x.v === hpCheio), 'duas cópias, com a ficha (só para mostrar) e o mesmo HP: ' + JSON.stringify(cs));
    // dano numa cópia: só ela some; a ficha não muda
    await C.evaluate(id => { const u = __tc, k = u.Store.get('tokens', id), i = k.bars.findIndex(b => b.n === 'HP'); u.Act.barSet(k, i, '-40'); }, cs[0].id); await w(600);
    ok((await copias()).length === 1, 'dano numa cópia: só ela some');
    ok(await ate(async () => { const l = await linha(); return (l.estado.rec[idHP] == null ? hpMax : l.estado.rec[idHP]) === hpCheio; }, 3000), 'e a ficha não muda (a cópia fica fora da sincronização)');
    await C.evaluate(() => __tc.Store.undo()); await w(400);
    ok((await copias()).length === 2, '(desfazer traz a cópia)');
    // dano no real: chega à ficha e leva as cópias
    await C.evaluate(id => { const u = __tc, k = u.Store.get('tokens', id), i = k.bars.findIndex(b => b.n === 'HP'); u.Act.barSet(k, i, '-10'); }, tok); await w(500);
    ok((await copias()).length === 0, 'dano no real: as cópias somem');
    ok(await ate(async () => { const l = await linha(); return l.estado.rec[idHP] === hpCheio - 10; }), 'e o dano chega à ficha');
    await C.evaluate(() => __tc.Store.undo()); await w(500);
    ok((await copias()).length === 2 && await ate(async () => { const l = await linha(); return (l.estado.rec[idHP] == null ? hpMax : l.estado.rec[idHP]) === hpCheio; }), '(desfazer traz as cópias e o HP da ficha)');
    // a cura que vem da ficha vai do real para as cópias
    await M.locator('#tab-fichas').click(); await w(500);
    await F.locator(`[data-resatual="${idHP}"]`).fill('-30'); await F.locator(`[data-resatual="${idHP}"]`).press('Enter'); await w(900);
    await M.locator('#tab-cenas').click(); await w(400);
    ok(await ate(async () => (await hp()).v === hpCheio - 30 && (await copias()).length === 0), 'o dano que vem da ficha (−30 na aba Fichas) também leva as cópias: ' + JSON.stringify([await hp(), await copias()]));
    await C.evaluate(id => __tc.Act.cloneCriar(__tc.Store.get('tokens', id), 2, 2, false), tok); await w(400);
    await M.locator('#tab-fichas').click(); await w(500);
    await F.locator(`[data-resatual="${idHP}"]`).fill('+10'); await F.locator(`[data-resatual="${idHP}"]`).press('Enter'); await w(900);
    await M.locator('#tab-cenas').click(); await w(400);
    ok(await ate(async () => { const x = await hp(), cc = await copias(); return x.v === hpCheio - 20 && cc.length === 2 && cc.every(k => k.v === hpCheio - 20); }), 'a cura que vem da ficha (+10) vai do real para as cópias: ' + JSON.stringify([await hp(), await copias()]));
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
