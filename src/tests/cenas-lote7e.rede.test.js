// Lote 7, parte 4b-1 (do Mapa-múndi para a cena), numa mesa de verdade (banco local de ensaio ou o projeto real), com
// o mestre e uma jogadora em aparelhos separados:
//   · "Gerar a cena aqui" no grupo: a aba Cenas abre a janela "Gerar um lugar" na aba Encontro, já com o terreno do
//     hexágono (floresta), o caminho da rota (estrada), a hora do tempo de agora (o calendário diz quando escurece), o
//     clima do evento que cobre o grupo (tempestade → chuva) e o estilo da região (Nórdico); nada muda até criar;
//     (lote 7, parte 5a) a seca e a assombração no mesmo lugar: a chave dos eventos, o chão seco e a Névoa de espíritos;
//   · "Gerar este lugar…" no marcador de uma vila: a janela abre na aba Vila, com o nome do marcador e o terreno do
//     hexágono (neve); o marcador fica ligado à cena que vai nascer (Desfazer volta); cancelar não cria nada e o botão
//     continua "Gerar este lugar…"; criar faz a cena com o id do atalho, e o marcador passa a abrir a cena;
//   · a jogadora não vê os botões de gerar nem o estilo da região.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'mundo', 'tinycats-tour': '1' };
  const M = (await t.device({ name: 'mestre', w: 1400, h: 900, seed })).page;
  const J = (await t.device({ name: 'jogador', w: 1300, h: 860, seed })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(250); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const semAvisos = F => F.evaluate(() => { const t2 = document.getElementById('toasts'); if (t2) t2.replaceChildren(); });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cenas L7E E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');

    // as Cenas abertas uma vez (a primeira janela delas, se houver, fecha), depois o Mapa-múndi
    await M.locator('#tab-cenas').click();
    let C = null, W = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre'); }, 40000), '(o mestre está nas Cenas da mesa)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
    const cenasAntes = await C.evaluate(() => Object.keys(__tc.Store.S.scenes).length);
    await M.locator('#tab-mundo').click();
    ok(await ate(async () => { W = await quadro(M, /\/mundo\//); return W && await W.evaluate(() => !!window.__mundo && __mundo.App.pronto && __mundo.App.naMesa && __mundo.App.papel === 'mestre'); }, 40000), '(o mestre está no Mapa-múndi da mesa)');

    // ---------- o mapa: uma floresta com uma estrada, uma tempestade, uma região nórdica e uma vila na neve ----------
    const ids = await W.evaluate(() => {
      const { App, N } = __mundo;
      App.criarMapa('Terras do Teste');
      const out = {};
      App.mudar('montar', m => {
        m.grade.tam = 40;
        for (let q = 0; q < 14; q++) for (let r = 0; r < 10; r++) m.hexes[q + ',' + r] = q < 9 ? 'fl' : 'ne';
        const a = N.centroHex(m, 2, 4), b = N.centroHex(m, 7, 4), v = N.centroHex(m, 11, 4);
        const rt = Object.assign(N.objNovo('t', { pts: [[a.x, a.y], [b.x, b.y]] }), { nome: 'Estrada Real', via: 'estrada' });
        const g = N.objNovo('g', { x: a.x, y: a.y, nome: 'Os Heróis', sigla: 'HER', rota: rt.id, prog: 0 });
        const reg = Object.assign(N.objNovo('r', { pts: [[a.x - 120, a.y - 120], [a.x + 120, a.y - 120], [a.x + 120, a.y + 120], [a.x - 120, a.y + 120]] }), { nome: 'Terras do Norte' });
        const ev = N.objNovo('e', { x: a.x, y: a.y, tipo: 'tempestade', r: 90, ini: m.cal.dia, nome: 'Tempestade' });
        const vila = N.objNovo('m', { x: v.x, y: v.y, ic: 'vila', nome: 'Vila do Gelo' });
        // (lote 7, parte 5a) a seca e a assombração no mesmo lugar: o chão seco e a Névoa de espíritos na cena
        const seca = N.objNovo('e', { x: a.x, y: a.y, tipo: 'seca', r: 90, ini: m.cal.dia });
        const ass = N.objNovo('e', { x: a.x, y: a.y, tipo: 'assombracao', r: 90, ini: m.cal.dia });
        m.objs.push(rt, g, reg, ev, seca, ass, vila);
        Object.assign(out, { g: g.id, reg: reg.id, vila: vila.id });
        m.cal.tempo = 3;                                   // o 4º tempo do dia: de fábrica, ainda é dia
      });
      return out;
    });
    ok(!!(ids.g && ids.reg && ids.vila), '(o mapa de teste: o grupo na estrada da floresta, a região, a tempestade e a vila)');
    // o calendário: o mestre diz que escurece cedo (entardecer no 3º tempo, noite a partir do 4º)
    await W.click('#tab-mapa'); await w(300);
    const ph = await W.evaluate(() => ({ ent: document.querySelector('#pane [data-k="mapa:ent"]').placeholder, noi: document.querySelector('#pane [data-k="mapa:noi"]').placeholder }));
    ok(ph.ent === '8' && ph.noi === '9', 'no calendário, vazio quer dizer o de fábrica: entardecer no 8º tempo e noite no 9º (num dia de 10): ' + j(ph));
    for (const [k, v] of [['mapa:ent', '3'], ['mapa:noi', '4']]) { const f = W.locator(`#pane [data-k="${k}"]`); await f.fill(v); await f.press('Enter'); await w(250); }
    const cal = await W.evaluate(() => ({ ent: __mundo.App.mapa.cal.ent, noi: __mundo.App.mapa.cal.noi, hora: __mundo.N.horaDoTempo(__mundo.App.mapa.cal) }));
    ok(cal.ent === 3 && cal.noi === 4 && cal.hora === 'noite', 'o mestre muda quando escurece; no 4º tempo, agora é noite: ' + j(cal));
    // a região: o estilo das cenas
    await W.evaluate(id => __mundo.App.selecionar([id]), ids.reg); await w(300);
    if (await W.locator('#tab-selecao').count()) { await W.click('#tab-selecao'); await w(250); }
    await W.locator(`#pane [data-k="o:${ids.reg}:estilo"]`).selectOption('nordico'); await w(300);
    ok(await W.evaluate(id => __mundo.App.mapa.objs.find(o => o.id === id).estilo === 'nordico', ids.reg), 'a região ganha o estilo das cenas: Nórdico');

    // ---------- "Gerar a cena aqui", no grupo ----------
    await W.evaluate(id => __mundo.App.selecionar([id]), ids.g); await w(300);
    if (await W.locator('#tab-selecao').count()) { await W.click('#tab-selecao'); await w(250); }
    ok(await W.locator('#pane [data-k="o:gerar-cena"]').count() === 1, 'no grupo, o botão "Gerar a cena aqui"');
    await semAvisos(W);
    await W.locator('#pane [data-k="o:gerar-cena"]').click();
    ok(await ate(async () => await M.evaluate(() => document.getElementById('tab-cenas').getAttribute('aria-selected') === 'true') && await C.evaluate(() => !!__tc.Gerador.vivo()), 20000), 'a aba Cenas abre, com a janela "Gerar um lugar"');
    const g1 = await C.evaluate(() => { const v = __tc.Gerador.vivo(); return { lugar: v.lugar, op: Object.assign({}, v.estado.op), estilo: v.comum.estilo, hora: v.comum.hora, clima: v.comum.clima, nome: document.getElementById('ger-nome').value, cenas: Object.keys(__tc.Store.S.scenes).length }; });
    ok(g1.lugar === 'encontro' && g1.op.terreno === 'floresta' && g1.op.caminho === 'estrada' && g1.op.situacao === 'surpresa', 'na aba Encontro, com o terreno do hexágono (floresta), a estrada da rota e a situação sorteada: ' + j(g1.op));
    ok(g1.estilo === 'nordico' && g1.hora === 'noite' && g1.clima === 'chuva', 'o estilo da região (Nórdico), a hora do tempo de agora (noite) e o clima da tempestade (chuva): ' + j([g1.estilo, g1.hora, g1.clima]));
    ok(g1.cenas === cenasAntes, 'nada muda nas cenas até o mestre criar');
    const ev1 = await C.evaluate(() => { const el = document.getElementById('ger-eventos'), sw = el && el.closest('.sw'); return { txt: sw ? sw.innerText.replace(/\s+/g, ' ').trim() : '', seco: !!__tc.Gerador.vivo().estado.plano.seco }; });
    ok(ev1.txt === 'Com os eventos do Mapa-múndi (Tempestade, Seca, Assombração): o chão seco e a zona Névoa de espíritos cobrindo a cena' && ev1.seco,
      'os eventos do mapa chegam à janela: a chave com os nomes, o chão seco e a zona — ' + j(ev1));
    await foto(M, 'l7e-gerar-aqui');
    await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
    ok(await ate(async () => await C.evaluate(n => Object.keys(__tc.Store.S.scenes).length === n + 1 && !document.querySelector('.modal'), cenasAntes), 40000), 'o mestre cria a cena');
    const enc = await C.evaluate(() => { const s = __tc.Store.scene(); return { nome: s.name, tom: s.tone, clima: s.weather && s.weather.k, cols: s.cols, marcas: s.tokens.filter(x => x.prop === 'chegada' || x.prop === 'emboscada').map(x => x.prop + (x.hidden ? ':oculto' : '')).sort() }; });
    ok(enc.tom === 'noite' && enc.clima === 'chuva' && enc.cols === 32 && /floresta/i.test(enc.nome), 'a cena sai de noite, com chuva, do tamanho médio, e com o nome do lugar: ' + j(enc));
    ok(j(enc.marcas) === j(['chegada:oculto', 'emboscada:oculto']), 'com a chegada e a emboscada marcadas, só para o mestre: ' + j(enc.marcas));
    const zonas = await C.evaluate(() => __tc.Store.scene().effects.filter(e => e.fx === 'espiritos').map(e => ({ leve: !!e.leve, gm: !!e.gm })));
    ok(j(zonas) === j([{ leve: true, gm: false }]), 'e com a Névoa de espíritos da assombração cobrindo a cena (leve, à mostra): ' + j(zonas));
    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok'), 30000), '(a cena foi salva)');

    // ---------- com uma janela aberta nas Cenas, o pedido do mapa não a atropela ----------
    await C.evaluate(() => { __tc.UI.prompt('Uma pergunta', 'Resposta', 'x'); }); await w(300);
    await M.locator('#tab-mundo').click(); await w(500);
    await W.evaluate(id => { __mundo.App.selecionar([]); __mundo.App.selecionar([id]); }, ids.g); await w(300);
    if (await W.locator('#tab-selecao').count()) { await W.click('#tab-selecao'); await w(250); }
    await semAvisos(W);
    const nAntes = await C.evaluate(() => Object.keys(__tc.Store.S.scenes).length);
    await W.locator('#pane [data-k="o:gerar-cena"]').click();
    ok(await ate(async () => await M.evaluate(() => document.getElementById('tab-cenas').getAttribute('aria-selected') === 'true') && /Há uma janela aberta aqui nas Cenas/.test(await C.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.textContent).join(' '))), 15000), 'com uma janela aberta nas Cenas, o pedido do mapa só avisa');
    ok(await C.evaluate(n => !__tc.Gerador.vivo() && !!document.querySelector('.modal') && Object.keys(__tc.Store.S.scenes).length === n, nAntes), '(a janela que estava aberta continua; nada é criado)');
    await C.evaluate(() => __tc.UI.closeModal()); await w(300);

    // ---------- "Gerar este lugar…", no marcador da vila ----------
    await M.locator('#tab-mundo').click(); await w(500);
    await W.evaluate(id => __mundo.App.selecionar([id]), ids.vila); await w(300);
    if (await W.locator('#tab-selecao').count()) { await W.click('#tab-selecao'); await w(250); }
    ok(await W.locator(`#pane [data-k="o:${ids.vila}:gerar"]`).count() === 1, 'no marcador da vila (sem atalho), o botão "Gerar este lugar…"');
    const n0 = await C.evaluate(() => Object.keys(__tc.Store.S.scenes).length);
    await semAvisos(W);
    await W.locator(`#pane [data-k="o:${ids.vila}:gerar"]`).click();
    ok(await ate(async () => await C.evaluate(() => !!__tc.Gerador.vivo()), 20000), 'a janela "Gerar um lugar" abre de novo');
    const g2 = await C.evaluate(() => { const v = __tc.Gerador.vivo(); return { lugar: v.lugar, terreno: v.estado.op.terreno, estilo: v.comum.estilo, nome: document.getElementById('ger-nome').value }; });
    const liga = await W.evaluate(id => __mundo.App.mapa.objs.find(o => o.id === id).liga, ids.vila);
    ok(g2.lugar === 'vila' && g2.terreno === 'neve' && g2.nome === 'Vila do Gelo', 'na aba Vila, com o terreno do hexágono (neve) e o nome do marcador: ' + j(g2));
    ok(g2.estilo === 'comum', 'fora de qualquer região com estilo, vale o da própria janela (o Nórdico que veio do mapa para o encontro não ficou como escolha dela): ' + j(g2.estilo));
    ok(liga && liga.t === 'cena' && /^cena_mundo_[a-z0-9]+$/.test(liga.id) && liga.nome === 'Vila do Gelo', 'o marcador já fica ligado à cena que vai nascer: ' + j(liga));
    ok(await W.evaluate(() => __mundo.App.rotuloDesfazer()) === 'ligar o marcador à cena gerada', '(um passo de desfazer: "ligar o marcador à cena gerada")');
    // cancelar: nada é criado; o botão continua "Gerar este lugar…"
    await C.locator('.modal .btn', { hasText: 'Cancelar' }).click(); await w(500);
    ok(await C.evaluate(n => Object.keys(__tc.Store.S.scenes).length === n && !document.querySelector('.modal'), n0), 'cancelar não cria nada');
    await M.locator('#tab-mundo').click(); await w(500);
    await W.evaluate(id => { __mundo.App.selecionar([]); __mundo.App.selecionar([id]); }, ids.vila); await w(400);
    const bt = await W.locator(`#pane [data-k="o:${ids.vila}:seguir"]`).textContent();
    ok(/Gerar este lugar/.test(bt), 'o marcador, ligado a uma cena que ainda não existe, oferece gerá-la de novo: ' + j(bt));
    await semAvisos(W);
    await W.locator(`#pane [data-k="o:${ids.vila}:seguir"]`).click();
    ok(await ate(async () => await C.evaluate(() => !!__tc.Gerador.vivo()), 20000), 'e a janela abre outra vez');
    await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
    ok(await ate(async () => await C.evaluate(id => !!__tc.Store.S.scenes[id] && __tc.Store.S.current === id && !document.querySelector('.modal'), liga.id), 40000), 'a vila nasce com o id do atalho do marcador');
    const vila = await C.evaluate(() => { const s = __tc.Store.scene(); return { nome: s.name, tom: s.tone, gerado: s.gerado && s.gerado.lugar }; });
    ok(vila.nome === 'Vila do Gelo' && vila.tom === 'noite', 'com o nome do marcador e a hora do mapa: ' + j(vila));
    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok'), 30000), '(a vila foi salva)');
    // de volta ao mapa: o marcador agora abre a cena
    await C.evaluate(() => { const s = Object.values(__tc.Store.S.scenes).find(x => /floresta/i.test(x.name)); __tc.UI.switchScene(s.id); }); await w(400);
    await M.locator('#tab-mundo').click(); await w(500);
    ok(await ate(async () => { await W.evaluate(id => { __mundo.App.selecionar([]); __mundo.App.selecionar([id]); }, ids.vila); await w(300); return /Abrir a cena/.test(await W.locator(`#pane [data-k="o:${ids.vila}:seguir"]`).textContent()); }, 30000), 'o marcador da vila passa a oferecer "Abrir a cena"');
    await semAvisos(W);
    await W.locator(`#pane [data-k="o:${ids.vila}:seguir"]`).click();
    ok(await ate(async () => await C.evaluate(id => __tc.Store.S.current === id && !__tc.Gerador.vivo(), liga.id), 20000), 'e abre a vila nas Cenas, sem gerar nada');

    // ---------- a jogadora ----------
    await M.locator('#tab-mundo').click(); await w(500);
    ok(await W.evaluate(() => __mundo.App.mostrarAosJogadores()), '(o mestre mostra o mapa aos jogadores)');
    await J.evaluate(() => { const v = document.getElementById('vivo'); if (v && !v.hidden) document.getElementById('vivoX').click(); }); await w(300, J);
    await J.locator('#tab-mundo').click();
    let WJ = null;
    ok(await ate(async () => { WJ = await quadro(J, /\/mundo\//); return WJ && await WJ.evaluate(id => !!window.__mundo && __mundo.App.pronto && __mundo.App.papel === 'jogador' && !!__mundo.App.mapa && __mundo.App.mapa.objs.some(o => o.id === id), ids.g); }, 40000), 'a jogadora vê o mapa');
    const vj = await WJ.evaluate(([g, reg]) => { const m = __mundo.App.mapa, r = m.objs.find(o => o.id === reg); __mundo.App.selecionar([g]); return { estilo: r ? 'estilo' in r : null }; }, [ids.g, ids.reg]); await w(400, J);
    if (await WJ.locator('#tab-selecao').count()) { await WJ.click('#tab-selecao'); await w(250, J); }
    const btJ = await WJ.locator('#pane [data-k="o:gerar-cena"]').count();
    ok(vj.estilo === false && btJ === 0, 'a jogadora não recebe o estilo da região e não tem o botão "Gerar a cena aqui": ' + j([vj, btJ]));

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
