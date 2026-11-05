// (lote 92) O movimento leve das Cenas, numa mesa de verdade. Com TC_REAL=1 confere o canal: mexer num token vai por mensagem, sem
// gravar o documento; os jogadores recebem na hora; nada só do mestre vai para eles; quem é de fora não entra; jogador não forja
// mensagem; o documento alcança depois; quem abre depois recebe tudo. No banco local, sem canal, tudo cai no documento inteiro.
const { start, checker, LOCAL } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const SEG = 'Z7731SEG';
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); for (const [e, n] of [[c.mestre, 'Bruno'], [c.jog1, 'Dalmo'], [c.jog2, 'Lia']]) await entrar(d.page, e, c.senha, n); }
  const seed = { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' };
  const DM = await t.device({ name: 'mestre', seed }), M = DM.page;
  await DM.ctx.addInitScript(() => { window.TC_LEVE = { cheia: 9000 }; });
  const DJ = await t.device({ name: 'jogador', w: 1300, h: 860, seed }), J = DJ.page;
  const DL = await t.device({ name: 'lia', w: 1300, h: 860, seed }), L = DL.page;
  const DF = await t.device({ name: 'fora', seed }), F = DF.page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 150)); } };
  const quadro = async p => { for (let i = 0; i < 80; i++) { const f = p.frame({ url: /\/cenas\// }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const abreCenas = async (p, papel) => {
    await p.locator('#tab-cenas').click();
    let C = null;
    const foi = await ate(async () => { C = await quadro(p); return C && await C.evaluate(pp => !!window.__tc && __tc.Nuvem.modo() === pp && !!__tc.Store.scene(), papel); }, 30000);
    if (foi && await C.locator('.modal').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
    return foi ? C : null;
  };
  // os documentos da cena que vão ao banco, contados no aparelho de quem grava
  const grava = []; DM.ctx.on('request', r => { if (r.method() !== 'GET' && r.method() !== 'OPTIONS' && r.url().includes('/documentos') && r.url().includes('cena')) grava.push(decodeURIComponent(r.url())); });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200);
  await loginTela(M, c.mestre, c.senha);
  const nome = 'Leve E2E ' + Date.now().toString(36), codigo = await criarMesaTela(M, nome);
  const mesaId = await M.evaluate(() => TC.mesas.atual.id);
  for (const [p, e, n] of [[J, c.jog1, 'Dalmo'], [L, c.jog2, 'Lia']]) { await p.goto(t.base + '?debug', { waitUntil: 'load' }); await w(800, p); await loginTela(p, e, c.senha); await entrarMesaTela(p, codigo, n); }
  const uidJ = await J.evaluate(() => TC.conta.usuario.id);
  const C = await abreCenas(M, 'mestre');
  ok(!!C, 'as Cenas do mestre abrem');
  const ids = await C.evaluate(([jog, seg]) => {
    const T = __tc, A = T.Store.scene();
    const a = T.newToken(A, 3 * 64, 3 * 64, { name: 'Dain', owner: jog }); A.tokens.push(a);
    const b = T.newToken(A, 5 * 64, 5 * 64, { name: 'Covil ' + seg, hidden: true }); A.tokens.push(b);
    T.normalizeScene(A); T.Persist.scene(A.id);
    return { cena: A.id, pub: a.id, oculto: b.id };
  }, [uidJ, SEG]);
  await w(1000);
  await C.evaluate(id => __tc.Nuvem.definirAndares ? null : null, ids.cena);
  ok(await C.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Pôr no ar|Colocar no ar|No ar/i.test(x.textContent || x.title || '')); if (b) { b.click(); return true; } return false; }) || true, '(pôr no ar)');
  await w(500);
  if (!(await C.evaluate(() => __tc.Nuvem.noAr()))) await C.evaluate(id => __tc.Nuvem.mostrar(id), ids.cena);
  ok(await ate(() => C.evaluate(id => __tc.Nuvem.noAr() === id && __tc.Nuvem.transmito(), ids.cena)), 'a cena está no ar');
  const B = await abreCenas(J, 'jogador'), BL = await abreCenas(L, 'jogador');
  ok(await ate(() => B.evaluate(id => __tc.Store.scene().tokens.some(t => t.id === id), ids.pub)), 'o jogador vê o token');
  ok(await B.evaluate(id => !__tc.Store.scene().tokens.some(t => t.id === id), ids.oculto), 'e não vê o escondido');
  await w(1500);

  const mover = (id, x, y) => C.evaluate(([id, x, y]) => { const { Store } = __tc; Store.tx('Mover token', () => Store.upd('tokens', id, { x, y })); }, [id, x, y]);
  const posJ = (p, id) => p.evaluate(id => { const t = __tc.Store.scene().tokens.find(x => x.id === id); return t ? t.x : null; }, id);
  const docPubX = id => M.evaluate(id => { const l = TC.dados.col('documentos').pegar('cena:pub:v'); const t = l && l.dados.tokens.find(x => x.id === id); return t ? t.x : null; }, id);

  if (LOCAL) {
    await mover(ids.pub, 7 * 64, 3 * 64);
    ok(await ate(async () => await posJ(B, ids.pub) === 7 * 64, 9000), 'sem o canal, o movimento chega do jeito de sempre');
    ok(await ate(async () => await docPubX(ids.pub) === 7 * 64, 3000), 'e o documento é gravado em seguida');
  } else {
    const prontos = await ate(() => C.evaluate(m => { const L = window.parent.TC.aoVivo.leve; return L.pronto('cenam:' + m) && L.pronto('cenap:' + m + ':mundo'); }, mesaId), 8000);
    ok(prontos, 'o mestre entra nos canais');
    ok(await ate(() => B.evaluate(m => window.parent.TC.aoVivo.leve.pronto('cenap:' + m + ':mundo'), mesaId), 8000), 'o jogador entra no canal dele');
    // o primeiro movimento já pode ir leve (o documento inteiro foi ao entrar no ar)
    await mover(ids.pub, 7 * 64, 3 * 64); await w(700);
    // tudo o que sai pelos canais, como quem transmite manda
    await M.evaluate(() => { const L = TC.aoVivo.leve, e = L.enviar; window.__saiu = []; L.enviar = (t, m) => { window.__saiu.push({ t, j: JSON.stringify(m) }); return e(t, m); }; });
    const saiu = () => M.evaluate(() => window.__saiu.splice(0));
    grava.length = 0;
    const antesDoc = await docPubX(ids.pub);
    const t0 = Date.now();
    await mover(ids.pub, 8 * 64, 3 * 64);
    ok(await ate(async () => await posJ(B, ids.pub) === 8 * 64, 4000), 'o jogador vê o movimento em ' + (Date.now() - t0) + ' ms');
    ok(await ate(async () => await posJ(BL, ids.pub) === 8 * 64, 4000), 'a outra jogadora também');
    await w(800);
    ok(!grava.some(u => /id=eq\.cena:pub:v/.test(u) || u.includes('id=eq.cena:' + ids.cena + ':v')), 'o movimento não gravou o documento: ' + grava.length);
    const s1 = await saiu();
    ok(s1.some(x => x.t.startsWith('cenap:')) && s1.some(x => x.t.startsWith('cenam:')) && Math.max(...s1.map(x => x.j.length)) < 1000, 'a mensagem é pequena: ' + Math.max(0, ...s1.map(x => x.j.length)) + ' bytes, em ' + s1.length + ' envios');
    // o escondido não vai aos jogadores
    await mover(ids.oculto, 9 * 64, 9 * 64); await w(1500);
    const s2 = await saiu();
    ok(s2.some(x => x.t.startsWith('cenam:') && x.j.includes(ids.oculto)), 'o token escondido vai só pelo canal do mestre');
    ok(!s2.some(x => x.t.startsWith('cenap:') && (x.j.includes(ids.oculto) || x.j.includes(SEG))), 'mexer no token escondido não manda nada dele ao jogador');
    ok(await B.evaluate(id => !__tc.Store.scene().tokens.some(t => t.id === id), ids.oculto), 'e ele continua sem aparecer');
    // o documento alcança depois
    ok(await ate(async () => await docPubX(ids.pub) === 8 * 64, 15000), 'o documento alcança o movimento na gravação seguinte (antes: ' + antesDoc + ')');
    // quem abre depois recebe tudo
    await mover(ids.pub, 10 * 64, 3 * 64); await w(300);
    await J.reload({ waitUntil: 'load' });
    const B2 = await abreCenas(J, 'jogador');
    ok(!!B2 && await ate(async () => await posJ(B2, ids.pub) === 10 * 64, 12000), 'quem recarrega vê o último movimento');
    // segurança do canal
    const tentar = (p, topico) => p.evaluate(tp => new Promise(ok => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave, { auth: { storageKey: Object.keys(localStorage).find(k => k.endsWith('-auth-token')) } }); const ch = a.channel(tp, { config: { private: true } }); const fim = st => { ok(st); try { a.removeChannel(ch); } catch (e) { /* já fechado */ } }; ch.subscribe(st => { if (st !== 'CLOSED') fim(st); }); setTimeout(() => fim('tempo'), 7000); }), topico);
    ok(await tentar(J, 'cenam:' + mesaId) !== 'SUBSCRIBED', 'o jogador não entra no canal do mestre');
    await F.goto(t.base + 'src/tests/vazio.html'); await entrar(F, 'fora-' + Date.now().toString(36) + c.mestre, c.senha, 'Fora');
    ok(await tentar(F, 'cenap:' + mesaId + ':mundo') !== 'SUBSCRIBED', 'quem é de fora da mesa não entra no canal');
    ok(await J.evaluate(([m, id]) => { const r = window.parent === window ? null : null; const L = TC.aoVivo.leve; return L.enviar('cenap:' + m + ':mundo', { t: 'v', doc: 'cena:pub:v', tx: 'forjado', base: 0, n: 999999, d: { u: [{ id, p: { x: 64 } }] } }); }, [mesaId, ids.pub]) !== undefined, '(o jogador tenta forjar uma mensagem)');
    await w(1800);
    ok(await posJ(BL, ids.pub) === 10 * 64, 'a mensagem forjada não chega aos outros');
    // a conta dos pedidos: o pedido do jogador volta como mensagem
    const nJ = await B2.evaluate(id => { __tc.Store.tx('Mover token', () => __tc.Store.upd('tokens', id, { x: 2 * 64, y: 2 * 64 })); return 1; }, ids.pub);
    ok(nJ && await ate(() => C.evaluate(id => __tc.Store.scene().tokens.find(t => t.id === id).x === 2 * 64, ids.pub), 8000), 'o pedido do jogador chega ao mestre');
    ok(await ate(async () => await posJ(BL, ids.pub) === 2 * 64, 6000), 'e o movimento dele chega à outra jogadora');
    ok(await ate(() => B2.evaluate(() => !document.querySelector('.err')) , 2000), 'sem erro na tela do jogador');
    // o outro aparelho do mestre acompanha
    const DM2 = await t.device({ name: 'mestre2', seed }), M2 = DM2.page;
    await M2.goto(t.base + '?debug', { waitUntil: 'load' }); await w(800, M2); await loginTela(M2, c.mestre, c.senha);
    await M2.evaluate(m => TC.mesas.abrir(m), mesaId); await w(800, M2);
    await M2.keyboard.press('Escape'); await w(300, M2);
    const C2 = await abreCenas(M2, 'mestre');
    ok(await ate(async () => C2.evaluate(() => __tc.Nuvem.transmito()) , 10000) , 'o outro aparelho do mestre assume ao abrir');
    await ate(() => C.evaluate(m => window.parent.TC.aoVivo.leve.pronto('cenam:' + m), mesaId));
    await w(1500);
    await C2.evaluate(id => { __tc.Store.tx('Mover token', () => __tc.Store.upd('tokens', id, { x: 11 * 64, y: 2 * 64 })); }, ids.pub);
    ok(await ate(() => C.evaluate(id => __tc.Store.scene().tokens.find(t => t.id === id).x === 11 * 64, ids.pub), 4000), 'o primeiro aparelho do mestre vê o movimento do outro');
    await M2.evaluate(() => TC.dados.esvaziar && TC.dados.esvaziar(2000)); await w(500);
  }
  await apagarMesaTela(M, nome);
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
