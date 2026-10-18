// Cenas, lote 9 (parte 1), numa mesa (TC_LOCAL=… no banco local): o Duplicado de um token ligado a uma ficha.
//   · o gêmeo ganha uma ficha só dele — uma cópia da original ("… (gêmeo)"), só do mestre (sem dono), do lado Inimigo,
//     na mesma campanha —, com as barras cheias ou como estão; o token do gêmeo segue a ficha nova (o dano nele vai para
//     ela, não para a original); quando ele cai pela ficha (o HP zerado nela), o aviso oferece tirá-lo da cena; a ficha
//     nova aparece nas Fichas do mestre;
//   · para os jogadores, o gêmeo vai sem a ficha, sem a marca de quem ele copia e sem a condição Duplicado.
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
  const linhas = () => M.evaluate(() => TC.dados.col('personagens').todas().map(l => ({ id: l.id, nome: l.nome, vis: l.vis, dono: l.dono_id || null, camp: l.campanha || null, lado: l.ficha && l.ficha.lado, estado: l.estado, rev: l.rev })));
  const linha = async id => (await linhas()).find(l => l.id === id) || null;
  const nomeMesa = 'Lote9 E2E ' + Date.now().toString(36);
  let C = null, F = null;
  try {
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    await criarMesaTela(M, nomeMesa);

    // ---------- a ficha ----------
    ok(await ate(async () => { F = await quadro(/\/fichas\//); return F && (await F.locator('#btnNew').count()) === 1; }), '(Fichas abre na mesa)');
    await F.locator('#btnNew').click(); await w(400);
    await F.locator('#f_nome').fill('Dain X'); await F.locator('#f_tier').selectOption('S'); await w(200); await F.locator('#f_level').selectOption('19'); await w(600);
    ok(await ate(async () => { const ls = await linhas(); return ls.length === 1 && ls[0].nome === 'Dain X' && ls[0].rev > 0 && await M.evaluate(() => TC.dados.pendentes === 0); }), '(a ficha sobe para a mesa)');
    const orig = (await linhas())[0];
    const hpMax = await F.evaluate(() => Math.floor(calcular(S.personagens[0]).recursos.find(r => r.nome === 'HP').val));
    const idHP = await F.evaluate(() => S.personagens[0].recursos.find(r => r.nome === 'HP').id);
    const hpDe = async id => { const l = await linha(id); return l ? (l.estado && l.estado.rec && l.estado.rec[idHP] != null ? l.estado.rec[idHP] : hpMax) : null; };

    // ---------- a cena: um token ligado, ferido ----------
    await M.locator('#tab-cenas').click();
    ok(await ate(async () => { C = await quadro(/\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Fichas.on()); }, 20000), '(a cena, com as fichas)');
    const tok = await C.evaluate(charId => {
      const u = __tc, sc = u.Store.scene();
      const k = u.newToken(sc, 4 * sc.cell, 4 * sc.cell, { name: 'Guerreiro' });
      u.Store.tx('token', () => u.Store.add('tokens', k));
      u.Fichas.link(u.Store.get('tokens', k.id), charId);
      return k.id;
    }, orig.id);
    const hpTok = id => C.evaluate(id => { const k = __tc.Store.get('tokens', id); const b = k && k.bars.find(x => x.n === 'HP'); return b ? b.v : null; }, id);
    ok(await ate(async () => (await hpTok(tok)) === hpMax), '(o token ligado tem o HP da ficha)');
    await C.evaluate(id => { const u = __tc, k = u.Store.get('tokens', id), i = k.bars.findIndex(b => b.n === 'HP'); u.Act.barSet(k, i, '-15'); }, tok); await w(400);
    ok(await ate(async () => (await hpDe(orig.id)) === hpMax - 15), '(o dano chega à ficha original: HP ' + (hpMax - 15) + ')');

    // ---------- o Duplicado, com as barras cheias ----------
    const r1 = await C.evaluate(id => __tc.Act.duplicadoCriar(__tc.Store.get('tokens', id), { barras: 'cheias' }), tok); await w(400);
    ok(r1 && r1.id && r1.ficha, 'o gêmeo nasce com uma ficha nova: ' + JSON.stringify(r1));
    ok(await ate(async () => { const l = await linha(r1.ficha); return l && l.rev > 0 && await M.evaluate(() => TC.dados.pendentes === 0); }), 'a ficha do gêmeo sobe para a mesa');
    const f1 = await linha(r1.ficha);
    ok(f1.nome === 'Dain X (gêmeo)' && f1.vis === 'mestre' && f1.dono === null && f1.lado === 'Inimigo' && f1.camp === orig.camp, 'a ficha do gêmeo: "Dain X (gêmeo)", só do mestre, sem dono, do lado Inimigo, na mesma campanha: ' + JSON.stringify([f1.nome, f1.vis, f1.dono, f1.lado, f1.camp, orig.camp]));
    ok((await hpDe(r1.ficha)) === hpMax, 'cheias: a ficha do gêmeo com o HP no máximo (' + hpMax + '): ' + await hpDe(r1.ficha));
    const g1 = await C.evaluate(id => { const k = __tc.Store.get('tokens', id); return { char: k.char, nome: k.name, dup: k.dup, conds: k.conds }; }, r1.id);
    ok(g1.char === r1.ficha && g1.nome === 'Dain X' && g1.dup === tok && g1.conds.includes('duplicado'), 'o token do gêmeo segue a ficha nova, com o nome do original: ' + JSON.stringify(g1));
    ok(await ate(async () => (await hpTok(r1.id)) === hpMax), 'e o HP cheio no token: ' + await hpTok(r1.id));
    // o dano no gêmeo vai para a ficha dele, não para a original
    await C.evaluate(id => { const u = __tc, k = u.Store.get('tokens', id), i = k.bars.findIndex(b => b.n === 'HP'); u.Act.barSet(k, i, '-20'); }, r1.id); await w(500);
    ok(await ate(async () => (await hpDe(r1.ficha)) === hpMax - 20), 'o dano no gêmeo vai para a ficha dele: ' + await hpDe(r1.ficha));
    ok((await hpDe(orig.id)) === hpMax - 15 && (await hpTok(tok)) === hpMax - 15, 'a ficha original (e o token dela) não mudam: ' + JSON.stringify([await hpDe(orig.id), await hpTok(tok)]));
    // o gêmeo que cai pela ficha dele (o HP zerado na ficha: a mudança chega à cena de fora): o aviso também
    const toastsC = () => C.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.textContent).join(' | '));
    await C.evaluate(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    // (gravado pela casca, como a aba Fichas faz: a mudança chega à moldura das Cenas de fora)
    await M.evaluate(([id, idHP]) => { const P = TC.dados.col('personagens'), l = P.pegar(id), e = l.estado || {}; P.gravar(id, { estado: Object.assign({}, e, { rec: Object.assign({}, e.rec || {}, { [idHP]: 0 }) }) }); }, [r1.ficha, idHP]);
    ok(await ate(async () => (await hpTok(r1.id)) === 0 && /O gêmeo \(Duplicado\) de Dain X caiu\. Tirar da cena\?/.test(await toastsC())), 'o gêmeo que cai pela ficha dele (o HP zerado na ficha): o aviso oferece tirá-lo da cena: ' + await toastsC());
    ok(!!(await C.evaluate(id => __tc.Store.get('tokens', id), r1.id)), '(e ele continua na cena: nada some sozinho)');
    // nas Fichas do mestre
    await M.locator('#tab-fichas').click(); await w(600);
    ok(await ate(async () => (await F.evaluate(() => S.personagens.map(p => p.nome))).includes('Dain X (gêmeo)')), 'a ficha do gêmeo aparece nas Fichas do mestre');
    await M.locator('#tab-cenas').click(); await w(400);

    // ---------- como estão agora ----------
    const r2 = await C.evaluate(id => __tc.Act.duplicadoCriar(__tc.Store.get('tokens', id), { barras: 'agora' }), tok); await w(400);
    ok(await ate(async () => { const l = await linha(r2.ficha); return l && l.rev > 0; }), '(a segunda ficha sobe)');
    ok((await hpDe(r2.ficha)) === hpMax - 15 && await ate(async () => (await hpTok(r2.id)) === hpMax - 15), 'como estão: a ficha (e o token) do gêmeo com o HP de agora do original (' + (hpMax - 15) + '): ' + await hpDe(r2.ficha));

    // ---------- o que vai para os jogadores ----------
    const pub = await C.evaluate(ids => { const u = __tc; return u.Proj.projetar(u.Store.scene(), u.Store.S.assets || {}, new Set()).v.tokens.filter(x => ids.includes(x.id)).map(x => ({ id: x.id, nome: x.name, char: x.char, dup: x.dup || null, conds: x.conds })); }, [r1.id, r2.id]);
    ok(pub.length === 2 && pub.every(x => x.nome === 'Dain X' && x.char === null && !x.dup && !x.conds.includes('duplicado')), 'para os jogadores: os gêmeos com o nome do original, sem a ficha, sem a marca e sem a condição: ' + JSON.stringify(pub));
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
