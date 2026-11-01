// Lote 22, numa mesa (TC_LOCAL=… no banco local): o bloco de notas do mestre.
// Três contas: o mestre, o Dalmo (mestre auxiliar, com todas as abas) e o Visitante (jogador).
//   · o bloco do mestre (lote 52: todos têm o botão, mas as notas do mestre são só dele); o bloco: "+ Capítulo", o título, as tags, o texto com o básico (o negrito), salva sozinho;
//   · as notas são documentos "notas:<id>", vis mestre — e o banco não as entrega nem ao auxiliar nem ao jogador;
//   · os filtros: a busca e a tag; apagar pergunta antes, e o Desfazer traz o capítulo de volta.
const { start, checker, espiarBanco } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start({ net: true });
  const c = contas();
  let ids = {};
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); const m = await entrar(d.page, c.mestre, c.senha, 'Bruno'), a = await entrar(d.page, c.jog1, c.senha, 'Dalmo'), jj = await entrar(d.page, c.jog2, c.senha, 'Visitante'); ids = { m: m.uid, a: a.uid, j: jj.uid }; await d.ctx.close(); }
  const novo = async (name, o) => { const d = await t.device(Object.assign({ name, seed: { 'tinycats:aba': 'jornal', 'tinycats-tour': '1' } }, o)); await espiarBanco(d.ctx); d.page.setDefaultTimeout(15000); return d.page; };
  const M = await novo('mestre', { w: 1400, h: 900 }), A = await novo('auxiliar'), J = await novo('jogador');
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 300)); } };
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await M.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const notasDoBanco = p => p.evaluate(async mesa => ((await window.__sb.from('documentos').select('id,vis,apagado,dados').eq('mesa_id', mesa).like('id', 'notas:%')).data || []).filter(x => !x.apagado), mesa);
  let mesa = null;
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(M, c.mestre, c.senha);
  const codigo = await criarMesaTela(M, 'Notas ' + Date.now().toString(36));
  mesa = await M.evaluate(() => TC.mesas.atual.id);
  try {
    for (const [p, email, nome] of [[A, c.jog1, 'Dalmo'], [J, c.jog2, 'Visitante']]) { await p.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(p, email, c.senha); await entrarMesaTela(p, codigo, nome); }
    const nomear = await M.evaluate(async ([mesa, a]) => { const r = await window.__sb.rpc('definir_auxiliar', { p_mesa: mesa, p_usuario: a, p_auxiliar: true, p_abas: ['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador'] }); return r.error ? r.error.message : 'ok'; }, [mesa, ids.a]);
    ok(nomear === 'ok', 'o Dalmo vira mestre auxiliar, com todas as abas: ' + nomear);
    ok(await ate(async () => await A.evaluate(() => TC.mesas.atual && TC.mesas.atual.cargo === 'auxiliar'), 30000), '(o Dalmo já é auxiliar na tela dele)');
    // ---------- o mestre ----------
    // (lote 52) todos têm o botão: quem joga escreve no caderno dele (notasj:) e no do grupo — as notas do mestre continuam só dele
    ok(await M.locator('#btnNotas').isVisible() && await A.locator('#btnNotas').isVisible() && await J.locator('#btnNotas').isVisible(), 'o botão do bloco de notas: todos o têm (lote 52), cada um com o seu caderno');
    await M.locator('#btnNotas').click(); await w(300);
    ok(await M.locator('#notas').isVisible() && /O bloco de notas está vazio/.test(await M.locator('#notas').innerText()), 'o bloco abre vazio, com o convite para o primeiro capítulo');
    await M.locator('#nt-novo').click(); await w(300);
    await M.locator('#nt-tit').fill('Planos da sessão 4'); await w(100);
    await M.locator('#nt-tagsin').fill('sessão, segredo'); await M.locator('#nt-tagsin').press('Tab'); await w(300);
    await M.locator('#nt-texto').click();
    await M.keyboard.type('O barão ');
    await M.locator('.nt-b-bold').click(); await M.keyboard.type('trai o grupo'); await M.locator('.nt-b-bold').click();
    await M.keyboard.type(' no baile.'); await w(1200);
    let l = null;
    ok(await ate(async () => { const ls = await M.evaluate(() => TC.dados.col('documentos').todas().filter(x => x.id.startsWith('notas:') && !x.apagado)); l = ls[0]; return ls.length === 1 && l.vis === 'mestre' && l.dados.t === 'Planos da sessão 4' && j(l.dados.tags) === j(['sessão', 'segredo']) && /<b>trai o grupo<\/b>|<strong>trai o grupo<\/strong>/.test(l.dados.html) && await M.evaluate(() => TC.dados.pendentes === 0); }),
      'o capítulo salva sozinho (título, tags e o texto com o negrito), como documento só do mestre: ' + j(l && { id: l.id, vis: l.vis, d: l.dados }));
    await M.locator('#nt-novo').click(); await w(300);
    await M.locator('#nt-tit').fill('O ferreiro de Lira'); await M.locator('#nt-tagsin').fill('npc'); await M.locator('#nt-tagsin').press('Tab'); await w(300);
    await M.locator('#nt-texto').click(); await M.keyboard.type('Sabe do mapa.'); await w(1200);
    await foto('l22-notas');
    // ---------- o banco: o auxiliar e o jogador não recebem ----------
    ok(await ate(async () => (await notasDoBanco(M)).length === 2), 'o banco tem os dois capítulos (para o mestre)');
    ok((await notasDoBanco(A)).length === 0 && (await notasDoBanco(J)).length === 0, 'o auxiliar e o jogador não leem nenhuma nota do banco');
    const tentar = await A.evaluate(async mesa => { const r = await window.__sb.from('documentos').insert({ mesa_id: mesa, id: 'notas:intruso', vis: 'mestre', dados: { t: 'x' } }); return r.error ? 'recusado' : 'aceito'; }, mesa);
    ok(tentar === 'recusado', 'e o auxiliar não consegue criar uma nota: ' + tentar);
    // ---------- os filtros ----------
    await M.locator('.nt-tag', { hasText: 'npc' }).click(); await w(250);
    ok(j(await M.locator('.nt-cap b').allInnerTexts()) === j(['O ferreiro de Lira']), 'a tag "npc" filtra a lista');
    await M.locator('.nt-tag', { hasText: 'npc' }).click(); await w(200);
    await M.locator('#nt-busca').fill('barão'); await w(250);
    ok(j(await M.locator('.nt-cap b').allInnerTexts()) === j(['Planos da sessão 4']), 'a busca acha pelo texto ("barão")');
    await M.locator('#nt-busca').fill(''); await w(200);
    // ---------- apagar e desfazer ----------
    await M.locator('.nt-cap', { hasText: 'O ferreiro de Lira' }).click(); await w(250);
    await M.locator('#nt-apagar').click(); await w(250);
    await M.locator('dialog[open] .btn.per').click(); await w(500);
    ok(await ate(async () => (await M.locator('.nt-cap').count()) === 1), 'apagar (depois de confirmar): o capítulo sai');
    await M.locator('#toasts .toast', { hasText: 'saiu do bloco de notas' }).getByRole('button', { name: 'Desfazer' }).click(); await w(500);
    ok(await ate(async () => j(await M.locator('.nt-cap b').allInnerTexts()) === j(['O ferreiro de Lira', 'Planos da sessão 4']) || j(await M.locator('.nt-cap b').allInnerTexts()) === j(['Planos da sessão 4', 'O ferreiro de Lira'])), 'o Desfazer traz de volta: ' + j(await M.locator('.nt-cap b').allInnerTexts()));
    // ---------- de novo, depois de recarregar ----------
    await M.reload({ waitUntil: 'load' });
    ok(await ate(async () => await M.locator('#notas').isVisible() && (await M.locator('.nt-cap').count()) === 2, 30000), 'recarregando, o bloco volta aberto, com os dois capítulos');
  } finally {
    const x = await M.evaluate(async mesa => { const r = await window.__sb.from('mesas').delete().eq('id', mesa).select('id'); return r.error ? r.error.message : (r.data || []).length; }, mesa).catch(e => String(e.message).split('\n')[0]);
    ok(x === 1, 'a mesa de teste é apagada no fim: ' + x);
  }
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
