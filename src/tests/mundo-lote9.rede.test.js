// Mapa-múndi, lote 9 (parte 2), numa mesa (TC_LOCAL=… no banco local de ensaio): a missão ligada a uma missão das Fichas.
//   · o mestre liga o marcador a uma missão do grupo das Fichas ainda escondida (com ele): o "!" aparece no mapa dele, e
//     a janela oferece as missões das Fichas; marcada "Os jogadores veem", ela ainda não vai para os jogadores;
//   · revelada nas Fichas, a projeção leva o nome e a situação, e o jogador vê o "!" no mapa mostrado (sem a ligação);
//   · concluída nas Fichas, vira ✓ para os dois (sem o mestre mexer no mapa).
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'mundo' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'mundo' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const doc = (p, id) => p.evaluate(id => { const l = TC.dados.col('documentos').pegar(id); return l && !l.apagado ? l.dados : null; }, id);
  const marca = (F, id) => F.evaluate(id => { const g = document.querySelector(`#mundo svg [data-id="${id}"] .missao`); if (!g) return null; const cls = g.getAttribute('class'); return { e: (cls.match(/\bm-(ativa|feita|falhou)\b/) || [])[1], so: /so-mestre/.test(cls), dica: (g.querySelector('title') || {}).textContent || '' }; }, id);
  const MIS = (e, oculta) => ({ t: 'O dragão de Urgm', d: 'Ele voltou.', r: '', e, de: 'm', c: 1 });
  let nomeMesa = null;
  try {
    // ---------- a mesa e o jogador ----------
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    nomeMesa = 'Missao E2E ' + Date.now().toString(36);
    const codigo = await criarMesaTela(M, nomeMesa);
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');

    // ---------- a missão do grupo, ainda escondida (nas Fichas: o segredo do mestre) ----------
    await M.evaluate(m => TC.dados.col('documentos').gravar('fichas:segredos', { dados: { v: { mis: { g: { mdrag: m } } } }, vis: 'mestre' }), MIS('ativa'));

    // ---------- o mapa: o marcador ligado à missão ----------
    await M.locator('#tab-mundo').click();
    let W = null;
    ok(await ate(async () => { W = await quadro(M, /\/mundo\//); return W && await W.evaluate(() => !!window.__mundo && __mundo.App.pronto && __mundo.App.naMesa && __mundo.App.papel === 'mestre'); }), 'o mestre abre o Mapa-múndi da mesa');
    ok(await ate(async () => j(await W.evaluate(() => (__mundo.App.missoesDasFichas() || []).map(f => [f.id, f.t, f.e, f.oculta]))) === j([['mdrag', 'O dragão de Urgm', 'ativa', true]])), 'o mapa conhece a missão do grupo das Fichas (escondida)');
    const mapa = await W.evaluate(() => {
      const { App, N } = __mundo;
      App.criarMapa('Terras de Urgm');
      App.mudar('montar', m => { m.objs.push(Object.assign(N.objNovo('m', { x: 500, y: 500, ic: 'cidade' }), { id: 'vila', nome: 'Vila Alta' })); });
      App.mostrarAosJogadores(App.mapa.id);
      return App.mapa.id;
    });
    await W.evaluate(() => __mundo.App.selecionar(['vila'])); await w(300);
    await W.locator('#pane [data-k="o:vila:mis"]').click();
    await W.waitForSelector('dialog.mundo-dl[open]');
    ok(/O dragão de Urgm · Ativa \(escondida\)/.test(await W.locator('dialog.mundo-dl[open] #dl-f').innerText()), 'a janela "Marcar missão" oferece a missão das Fichas (e diz que está escondida)');
    await W.locator('dialog.mundo-dl[open] input[name="dl-modo"][value="f"]').check();
    await W.locator('dialog.mundo-dl[open] #dl-f').selectOption('mdrag');
    await W.locator('dialog.mundo-dl[open] button[type="submit"]').click(); await w(400);
    await W.locator('#pane [data-k="o:vila:mis-ver"]').check(); await w(400);
    ok(j(await W.evaluate(() => __mundo.App.mapa.objs.find(o => o.id === 'vila').mis)) === j({ t: '', ref: 'mdrag', ver: true }), 'o marcador ligado à missão, "Os jogadores veem" marcado');
    let mk = await marca(W, 'vila');
    ok(mk && mk.e === 'ativa' && mk.so && /O dragão de Urgm/.test(mk.dica), 'no mapa do mestre: o "!" com o nome da missão, tracejado (ainda escondida nas Fichas): ' + j(mk));
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa), v = p && p.objs.find(o => o.id === 'vila'); return !!v && !v.mis && await M.evaluate(() => TC.dados.pendentes === 0); }), 'escondida nas Fichas: a missão não vai para os jogadores');
    let JW = null;
    ok(await ate(async () => { JW = await quadro(J, /\/mundo\//); return JW && await JW.evaluate(() => !!window.__mundo && __mundo.App.pronto && __mundo.App.papel !== 'mestre' && !!__mundo.App.mapa && __mundo.App.mapa.objs.some(o => o.id === 'vila')); }), 'o jogador abre o mapa mostrado');
    ok(!(await marca(JW, 'vila')), 'e não vê marca nenhuma');

    // ---------- revelada nas Fichas ----------
    await M.evaluate(m => { const D = TC.dados.col('documentos'); D.gravar('fichas:missoes', { dados: { v: { mdrag: m } }, vis: 'mesa' }); D.gravar('fichas:segredos', { dados: { v: { mis: { g: {} } } } }); }, MIS('ativa'));
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa), v = p && p.objs.find(o => o.id === 'vila'); return !!(v && v.mis) && j(v.mis) === j({ t: 'O dragão de Urgm', ref: null, ver: true, e: 'ativa' }); }), 'revelada nas Fichas: a projeção leva o nome e a situação (sem a ligação)');
    ok(await ate(async () => { const x = await marca(JW, 'vila'); return !!x && x.e === 'ativa' && /Missão: O dragão de Urgm/.test(x.dica); }), 'o jogador vê o "!" no marcador, com o nome');
    ok(await ate(async () => { const x = await marca(W, 'vila'); return !!x && !x.so; }), 'e no mapa do mestre ela deixa de ser tracejada');

    // ---------- concluída nas Fichas ----------
    await M.evaluate(m => TC.dados.col('documentos').gravar('fichas:missoes', { dados: { v: { mdrag: m } } }), MIS('feita'));
    ok(await ate(async () => { const x = await marca(W, 'vila'); return !!x && x.e === 'feita'; }), 'concluída nas Fichas: no mapa do mestre, vira ✓');
    ok(await ate(async () => { const x = await marca(JW, 'vila'); return !!x && x.e === 'feita' && /\(concluída\)/.test(x.dica); }), 'e no do jogador também');
    ok((await W.evaluate(() => __mundo.App.podeDesfazer() ? __mundo.App.rotuloDesfazer() : '')) !== 'concluir a missão', '(o mapa não mudou: a situação vem das Fichas)');
  } catch (e) {
    ok(false, 'parou: ' + String((e && e.message) || e).split('\n')[0]);
  } finally {
    if (nomeMesa) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste:', e.message); } }
    const erros = (t.errs || []).filter(e => !/^\[prep\]/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/status of (400|401|403|409)/.test(e));
    if (erros.length) console.log(erros.slice(0, 8).join('\n'));
    ok(erros.length === 0, 'sem erros inesperados no console');
    await t.close();
    end();
  }
})().catch(e => { console.error(e); process.exit(1); });
