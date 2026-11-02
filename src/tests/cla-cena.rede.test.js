// Clã (lote 62) numa mesa de verdade (o banco local de ensaio): a sede ligada a uma cena das Cenas.
//   · o mestre faz uma cena nas Cenas; no Clã, aba "Sede e tropas", "Ligar a uma cena…" lista as cenas da mesa e liga;
//   · a ligação fica na sede (cla:sede:<clã>), com o nome; "Abrir a cena" abre as Cenas nela; "Desligar" (com Desfazer);
//   · no salão, a parte Sede aparece só com a cena ligada (sem planta), com o botão de abrir.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const C = require('../../cla/nucleo.js');
const { ok, end } = checker();

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const errosDeFora = () => t.errs.filter(e => !/^\[prep\]/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/status of (400|401|403|409)/.test(e));
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'cenas', 'tinycats-tour': '1', 'tinycats:cla:vista': 'mestre' } })).page;
  const w = ms => M.waitForTimeout(ms);
  const quadro = async re => { for (let i = 0; i < 80; i++) { const f = M.frame({ url: re }); if (f) return f; await w(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await w(350); } };
  const docM = id => M.evaluate(id => { const l = TC.dados.col('documentos').pegar(id); return l && !l.apagado ? JSON.parse(JSON.stringify(l.dados)) : null; }, id);
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await M.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cena Cla E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa);
  let apagada = false;
  try {
    // a cena, feita nas Cenas
    let F = null, cena = null;
    ok(await ate(async () => { F = await quadro(/\/cenas\//); return F && await F.evaluate(() => !!window.__tc && !!__tc.Store); }, 40000), '(o mestre abre as Cenas)');
    cena = await F.evaluate(() => { const sc = __tc.newScene('Fortaleza do clã'); __tc.Store.addScene(sc); __tc.Persist.scene(sc.id); __tc.Persist.meta(); return sc.id; });
    ok(await ate(async () => !!(await docM('cena:' + cena + ':m'))), '(a cena chega no banco)');
    await M.evaluate(cla => TC.dados.col('documentos').gravar('cla:c:cl_garret', { dados: cla, vis: 'mestre' }), C.normCla({ v: 1, nome: 'Clã Garret', jogadores: true, ver: {}, cargos: { lider: { nome: 'Líder', gente: [] } } }));
    await M.locator('#tab-cla').click(); await w(500);
    let K = null;
    ok(await ate(async () => { K = await quadro(/\/cla\//); return K && await K.evaluate(() => !!window.__cla && __cla.pronto && __cla.naMesa && __cla.mestre); }, 40000), '(o mestre abre o Clã)');
    await K.evaluate(() => __cla.irAba('sede')); await w(400);
    ok(await ate(async () => (await K.locator('[data-k="sede:cena:ligar"]').count()) === 1), 'a aba Sede e tropas: "Ligar a uma cena…"');
    await K.locator('[data-k="sede:cena:ligar"]').click(); await w(300);
    const opcs = await K.locator('#dlg [data-k="dl:cena"] option').allInnerTexts();
    ok(opcs.includes('Fortaleza do clã'), 'a janela lista as cenas da mesa, pelo nome — ' + JSON.stringify(opcs));
    await K.locator('#dlg [data-k="dl:cena"]').selectOption(cena); await K.locator('#dlg [data-k="dl:sim"]').click(); await w(500);
    ok(await ate(async () => { const s = await docM('cla:sede:cl_garret'); return s && s.cena && s.cena.id === cena && s.cena.nome === 'Fortaleza do clã'; }), 'a sede guarda a cena ligada (o id e o nome)');
    ok(await ate(async () => /Fortaleza do clã/.test(await K.locator('[data-k="sede:cena"]').innerText()) && (await K.locator('[data-k="sede:cena:abrir"]').count()) === 1), 'o cartão mostra a cena e "Abrir a cena"');
    await foto('l62-sede-cena');
    // o salão: a parte Sede aparece só com a cena
    await K.evaluate(() => { document.querySelector('[data-vista="salao"]').click(); }); await w(400);
    ok(await ate(async () => (await K.locator('#abas [data-aba="sede"]').count()) === 1), 'no salão, a parte Sede aparece com a cena ligada (mesmo sem planta)');
    await K.locator('#abas [data-aba="sede"]').click(); await w(300);
    ok(await ate(async () => (await K.locator('[data-k="sede-ver"] [data-k="sede:cena:abrir"]').count()) === 1), 'no salão, o botão de abrir a cena');
    await K.evaluate(() => { document.querySelector('[data-vista="mestre"]').click(); }); await w(400);
    await K.evaluate(() => __cla.irAba('sede')); await w(300);
    await K.locator('#mestre [data-k="sede:cena:abrir"]').click();
    ok(await ate(async () => { F = await quadro(/\/cenas\//); return F && await F.evaluate(id => __tc.Store.S.current === id, cena); }, 30000), '"Abrir a cena": as Cenas abrem na cena da sede');
    await M.locator('#tab-cla').click(); await w(500);
    K = await quadro(/\/cla\//);
    await K.evaluate(() => __cla.irAba('sede')); await w(300);
    await K.locator('#mestre [data-k="sede:cena:x"]').click(); await w(400);
    ok(await ate(async () => { const s = await docM('cla:sede:cl_garret'); return s && !s.cena; }), '"Desligar": a sede fica sem a cena');
    await K.evaluate(() => __cla.desfazer()); await w(400);
    ok(await ate(async () => { const s = await docM('cla:sede:cl_garret'); return s && s.cena && s.cena.id === cena; }), 'Desfazer liga de novo');
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } catch (e) {
    ok(false, 'parou: ' + String((e && e.message) || e).split('\n')[0]);
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
