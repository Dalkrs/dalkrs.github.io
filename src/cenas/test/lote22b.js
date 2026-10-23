// Bateria do lote 22 (2ª parte) nas Cenas: o ponto de reforço e a tela das barrinhas.
//   · o ponto de reforço (oculto): arrastar um token até ele guarda o token (sai do mapa; Desfazer); "Cópias de um
//     token…" guarda 3 × Bandido para a 2ª rodada; na rodada, nascem em volta do ponto, entram na ordem com a
//     iniciativa rolada (um passo; Desfazer); "Chegar agora"; a fase da arena solta os grupos marcados para ela;
//     a projeção dos jogadores não leva o que o ponto guarda;
//   · a tela das barrinhas: de começo, abre na vez de cada um (só ele); −5 tira e "Aplicar" faz num passo (Desfazer);
//     as chaves da aba Turnos (a rodada: todos).
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
(async () => {
  const t = await open({ barrinhas: true });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 160);
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const pt = (cx, cy) => ev(([cx, cy]) => { const u = __tc, sc = u.Store.scene(), r = u.Render.cv.getBoundingClientRect(); const [sx, sy] = u.Render.toScreen(cx * sc.cell, cy * sc.cell); return [r.left + sx, r.top + sy]; }, [cx, cy]);
  const ponto = () => ev(() => JSON.parse(JSON.stringify(__tc.Store.scene().tokens.find(x => x.prop === 'reforco') || null)));
  const fecharModal = async () => { if (await page.locator('.modal').count()) { await page.keyboard.press('Escape'); await w(200); } };
  // a cena: limpa os tokens de exemplo, põe dois heróis, um bandido e o ponto de reforço
  await ev(() => {
    const { Store, newToken, Props } = __tc, sc = Store.scene(), c = sc.cell;
    Store.tx('prep', () => {
      for (const x of sc.tokens.slice()) Store.del('tokens', x.id);
      Store.scn({ turn: { on: false, round: 1, cur: null, list: [], back: 0 } });
      Store.add('tokens', newToken(sc, 2 * c, 2 * c, { id: 'tk_ana', name: 'Ana', bars: [{ n: 'HP', c: '#d34a4a', v: 30, m: 30, k: 'bar', on: true, vis: '' }, { n: 'SP', c: '#4a7ad3', v: 10, m: 10, k: 'bar', on: true, vis: '' }] }));
      Store.add('tokens', newToken(sc, 4 * c, 2 * c, { id: 'tk_beto', name: 'Beto', bars: [{ n: 'HP', c: '#d34a4a', v: 20, m: 20, k: 'bar', on: true, vis: '' }] }));
      Store.add('tokens', newToken(sc, 2 * c, 8 * c, { id: 'tk_band', name: 'Bandido', bars: [{ n: 'HP', c: '#d34a4a', v: 12, m: 12, k: 'bar', on: true, vis: '' }] }));
      const p = Props.novo(sc, 'reforco', 12 * c, 6 * c, 1, true); p.id = 'tk_ponto'; p.name = 'Portão do norte';
      Store.add('tokens', p);
    });
    __tc.App.view.z = 1; __tc.App.view.x = 0; __tc.App.view.y = 0;
  });
  await w(400);
  const p0 = await ponto();
  ok(p0 && p0.hidden === true && p0.prop === 'reforco', 'o ponto de reforço nasce oculto dos jogadores');
  await ev(() => { __tc.setSel([{ c: 'tokens', id: 'tk_ponto' }]); __tc.UI.openTab('sel'); }); await w(300);
  ok(/Reforços guardados/i.test(await page.locator('#side').innerText()) && /Nada guardado ainda/.test(await page.locator('#side').innerText()), 'o painel do ponto: "Reforços guardados", vazio');
  // ---------- arrastar o Bandido até o ponto ----------
  await ev(() => { __tc.setSel([]); __tc.Tools.set('select'); }); await w(150);
  const [ax, ay] = await pt(2.5, 8.5), [bx, by] = await pt(12.5, 6.5);
  await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move((ax + bx) / 2, (ay + by) / 2, { steps: 6 }); await page.mouse.move(bx, by, { steps: 6 }); await page.mouse.up(); await w(400);
  let p = await ponto();
  ok(!(await ev(() => !!__tc.Store.get('tokens', 'tk_band'))) && p.ref.length === 1 && p.ref[0].tok.name === 'Bandido' && p.ref[0].quando.k === 'mao', 'arrastado até o ponto, o Bandido sai do mapa e fica guardado: ' + JSON.stringify(p.ref.map(g => [g.tok.name, g.n, g.quando])));
  ok(/Bandido está guardado em Portão do norte/.test(await toasts()), 'o aviso diz onde ele ficou: ' + await toasts());
  await ev(() => __tc.Tools.undo()); await w(250);
  ok(await ev(() => !!__tc.Store.get('tokens', 'tk_band')) && !((await ponto()).ref || []).length, 'o Desfazer devolve o Bandido ao mapa');
  await ev(() => __tc.Tools.redo()); await w(250);
  // ---------- cópias: 3 × Ana para a 2ª rodada ----------
  await clearToasts();
  await ev(() => { __tc.setSel([{ c: 'tokens', id: 'tk_ponto' }]); __tc.UI.openTab('sel'); }); await w(300);
  await page.locator('#rf-copias').click(); await w(250);
  await page.locator('#rf-modelo').selectOption('tk_beto'); await page.locator('#rf-qtd').fill('3');
  await page.locator('#rf-quando').selectOption('rodada'); await page.locator('#rf-rod').fill('2');
  await page.locator('.modal .btn.primary').click(); await w(300);
  p = await ponto();
  ok(p.ref.length === 2 && p.ref[1].n === 3 && p.ref[1].tok.name === 'Beto' && p.ref[1].quando.k === 'rodada' && p.ref[1].quando.v === 2 && await ev(() => !!__tc.Store.get('tokens', 'tk_beto')), '"Cópias de um token": 3 × Beto para a 2ª rodada (o Beto continua no mapa)');
  await foto('l22-reforco-painel');
  // ---------- o combate: a tela das barrinhas na vez de cada um ----------
  await ev(() => { const u = __tc; u.Act.turnAdd(['tk_ana', 'tk_beto'].map(id => u.Store.get('tokens', id))); u.Act.turnPatch(x => { x.list[0].init = 15; x.list[1].init = 10; }, 'ini'); u.UI.openTab('turn'); }); await w(300);
  await page.locator('#turnOnOff').click(); await w(400);
  ok(await page.locator('#bb-tela').count() === 1 && /A vez de Ana/.test(await page.locator('.modal').innerText()) && await page.locator('.bb-t').count() === 1, 'Iniciar: a tela das barrinhas abre na vez da Ana (só ela)');
  await foto('l22-barrinhas-vez');
  await page.locator('#bb-tk_ana-0').fill('-5'); await page.locator('#bb-tk_ana-1').fill('+0');
  await page.locator('.modal .btn.primary').click(); await w(300);
  ok(await ev(() => __tc.Store.get('tokens', 'tk_ana').bars[0].v) === 25 && /Barrinhas: Ana mudou/.test(await toasts()), '−5: a Ana vai a 25 de HP, com o Desfazer');
  await ev(() => __tc.Tools.undo()); await w(200);
  ok(await ev(() => __tc.Store.get('tokens', 'tk_ana').bars[0].v) === 30, 'o Desfazer volta o HP');
  // a vez do Beto
  await clearToasts();
  await page.locator('#turnNext').click(); await w(400);
  ok(/A vez de Beto/.test(await page.locator('.modal').innerText().catch(() => '')), 'próximo turno: a tela na vez do Beto');
  await fecharModal();
  // a rodada 2: os 3 Betos nascem
  await page.locator('#turnNext').click(); await w(500);
  await fecharModal();
  const nasc = await ev(() => { const sc = __tc.Store.scene(); return { toks: sc.tokens.filter(x => /^Beto \d$/.test(x.name)).map(x => x.name).sort(), ordem: sc.turn.list.filter(e => { const t = __tc.Store.get('tokens', e.token); return t && /^Beto \d$/.test(t.name); }).map(e => e.init != null), ref: (sc.tokens.find(x => x.prop === 'reforco').ref || []).length, round: sc.turn.round }; });
  ok(nasc.round === 2 && JSON.stringify(nasc.toks) === '["Beto 1","Beto 2","Beto 3"]' && nasc.ordem.length === 3 && nasc.ordem.every(Boolean) && nasc.ref === 1, 'na 2ª rodada, os 3 Betos nascem, entram na ordem com a iniciativa rolada e saem do ponto: ' + JSON.stringify(nasc));
  ok(/Reforços chegaram na 2ª rodada: 3 × Beto/.test(await toasts()), 'o aviso dos reforços, com o Desfazer: ' + await toasts());
  await foto('l22-reforco-chegou');
  await page.locator('.toast', { hasText: 'Reforços chegaram' }).getByRole('button', { name: 'Desfazer' }).click(); await w(300);
  ok(await ev(() => Store => 0) !== null && await ev(() => __tc.Store.scene().tokens.filter(x => /^Beto \d$/.test(x.name)).length) === 0 && (await ponto()).ref.length === 2, 'o Desfazer leva os 3 de volta para o ponto');
  // ---------- Chegar agora ----------
  await ev(() => { __tc.setSel([{ c: 'tokens', id: 'tk_ponto' }]); __tc.UI.openTab('sel'); }); await w(300);
  const gid = (await ponto()).ref[0].id;
  await page.locator('#rf-agora-' + gid).click(); await w(300);
  ok(await ev(() => __tc.Store.scene().tokens.some(x => x.name === 'Bandido' && !x.prop)) && (await ponto()).ref.length === 1, '"Chegar agora": o Bandido nasce do ponto');
  // ---------- a chave da rodada: todos ----------
  await ev(() => { __tc.Store.S.prefs.barrinhas = { combate: false, rodada: true, vez: false }; __tc.UI.openTab('turn'); }); await w(200);
  const ate = async () => { for (let k = 0; k < 8; k++) { const r = await ev(() => __tc.Store.scene().turn.round); if (r >= 3) return; await page.locator('#turnNext').click(); await w(250); if (await ev(() => __tc.Store.scene().turn.round) < 3) await fecharModal(); } };
  await ate(); await w(300);
  ok(/3ª rodada/.test(await page.locator('.modal').innerText().catch(() => '')) && await page.locator('.bb-t').count() >= 2, 'com a chave da rodada: no começo da 3ª, a tela com todos do combate');
  await fecharModal();
  // ---------- a fase da arena solta o grupo marcado para ela ----------
  await ev(() => { const u = __tc; u.Store.tx('fase', () => { u.Store.scn({ fases: [{ n: 2, nome: 'Fase 2', m: [{ k: 'reforcos', pts: [[1.5, 1.5]], nome: 'Lacaio' }] }] }); const pp = u.Store.scene().tokens.find(x => x.prop === 'reforco'); u.Store.upd('tokens', pp.id, { ref: [{ id: 'rg_f', tok: { name: 'Guarda', size: 1, bars: [] }, n: 2, quando: { k: 'fase', v: 0 } }] }); }); });
  await ev(() => __tc.Arena.acionar(0)); await w(250);
  await page.locator('.modal .btn.primary').click(); await w(300);
  const fase = await ev(() => { const sc = __tc.Store.scene(); return { guardas: sc.tokens.filter(x => /^Guarda \d$/.test(x.name)).length, lacaios: sc.tokens.filter(x => /^Lacaio/.test(x.name)).length }; });
  ok(fase.guardas === 2 && fase.lacaios === 0, 'a fase da arena solta os grupos marcados para ela (e não os lacaios de sempre): ' + JSON.stringify(fase));
  // ---------- os jogadores não recebem o que o ponto guarda ----------
  await ev(() => { const u = __tc, pp = u.Store.scene().tokens.find(x => x.prop === 'reforco'); u.Store.tx('mostra', () => u.Store.upd('tokens', pp.id, { hidden: false, ref: [{ id: 'rg_z', tok: { name: 'Segredo' }, n: 1, quando: { k: 'mao' } }] })); });
  const pj = await ev(() => { const v = __tc.Proj.projetar(__tc.Store.scene(), __tc.Store.S.assets, new Set()).v; const pp = v.tokens.find(x => x.prop === 'reforco'); return pp ? ('ref' in pp) : 'sem'; });
  ok(pj === false, 'a projeção dos jogadores não leva o que o ponto guarda (nem com o ponto à mostra)');
  if (t.errs.length) console.log(t.errs.slice(0, 8).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
