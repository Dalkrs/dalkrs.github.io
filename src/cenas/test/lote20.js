// Bateria do lote 20 nas Cenas (no navegador, sem o site): as condições e as zonas das classes, e os Feridos.
//   · a lista: o grupo "Classes" (as 24, em ordem alfabética), a classe junto do nome, os ícones próprios, a duração de
//     começo;
//   · os Feridos: o HP abaixo de zero sugere a tag do terço do limite negativo (Aplicar e Desfazer); a tag mais grave
//     troca a mais leve; a cura não tira; um Ferido de cada vez; a tabela do mestre (os cortes) com o Desfazer;
//   · as zonas das classes na aba Efeitos (o grupo Classes: as 21 novas e as 4 de hoje que a classe usa, com a regra da
//     classe no painel); as que andam com o personagem prendem ao token clicado; a Muralha de Natu e o Pilar de Pedra
//     barram e têm os pontos de vida.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;

(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const pt = (cx, cy) => ev(([cx, cy]) => { const u = __tc, sc = u.Store.scene(), r = u.Render.cv.getBoundingClientRect(); const [sx, sy] = u.Render.toScreen(cx * sc.cell, cy * sc.cell); return [r.left + sx, r.top + sy]; }, [cx, cy]);
  const tok = id => ev(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id))), id);

  // ---------- a lista ----------
  const L = await ev(() => { const { CONDS, ICONS } = __tc; const r = CONDS.filter(c => c.g === 'classes'); return { n: r.length, total: CONDS.length, nomes: r.map(c => c.n), sem: r.filter(c => !ICONS[c.i] || !c.r).map(c => c.id), ids: new Set(CONDS.map(c => c.id)).size, fer: r.filter(c => c.ferido).map(c => c.id) }; });
  ok(L.n === 24 && L.total === 147 && L.ids === 147, 'as 24 condições das classes no grupo novo (147 ao todo, sem repetir): ' + L.n + '/' + L.total);
  const ord = L.nomes.slice().sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  ok(JSON.stringify(ord) === JSON.stringify(L.nomes), 'em ordem alfabética: ' + L.nomes.slice(0, 6).join(', ') + '…');
  ok(L.sem.length === 0, 'cada uma com o ícone próprio e a classe: ' + JSON.stringify(L.sem));
  ok(L.fer.length === 3, 'os três Feridos estão no grupo: ' + JSON.stringify(L.fer));

  const id = await ev(() => { const { Store, newToken, setSel } = __tc, sc = Store.scene(); const t = newToken(sc, 5 * sc.cell, 5 * sc.cell, { name: 'Aégis' }); t.bars = [{ n: 'HP', c: '#d34a4a', v: 30, m: 30, lo: 30, k: 'bar', on: true, vis: '' }]; Store.tx('t', () => Store.add('tokens', t)); setSel([{ c: 'tokens', id: t.id }]); return t.id; });
  await w(200);
  await ev(id => __tc.UI.condPicker([__tc.Store.get('tokens', id)]), id); await w(300);
  ok(await page.locator('#cgm-tab-classes').count() === 1, 'a aba "Classes" no seletor de condições');
  await page.locator('#cgm-tab-classes').click(); await w(200);
  ok(await page.locator('.modal .chips .chip.chip-r').count() === 24, 'na aba Classes, as 24, cada uma com a classe embaixo do nome');
  await foto('l20-cenas-seletor');
  const chipDur = await ev(() => __tc.CONDS.find(c => c.g === 'classes' && c.dur > 0));
  if (chipDur) {
    await page.locator('.modal .chips .chip', { hasText: chipDur.n }).first().click(); await w(150);
    const tk = await tok(id);
    ok(tk.conds.includes(chipDur.id) && tk.cinfo[chipDur.id] && tk.cinfo[chipDur.id].d === chipDur.dur, chipDur.n + ': entra com as ' + chipDur.dur + ' rodadas de começo — ' + JSON.stringify(tk.cinfo[chipDur.id]));
  } else ok(false, '(nenhuma condição de classe com duração de começo)');
  await page.keyboard.press('Escape'); await w(150);
  await ev(id => { const { Store } = __tc; Store.tx('limpa', () => Store.upd('tokens', id, { conds: [], cinfo: {} })); }, id);

  // ---------- os Feridos ----------
  const hp = (v, nome) => ev(([id, v, nome]) => { const { Store } = __tc, t = Store.get('tokens', id); Store.tx(nome || 'Dano', () => Store.upd('tokens', id, { bars: t.bars.map((b, i) => (i ? b : Object.assign({}, b, { v }))) })); }, [id, v, nome]);
  await clearToasts();
  await hp(-5); await w(250);
  ok(/Aégis está com −5 de HP \(o limite é −30\): a regra sugere Levemente Ferido\./.test(await toasts()) && /Aplicar/.test(await toasts()), 'HP −5 de −30 (o primeiro terço): a sugestão do Levemente Ferido, com o Aplicar — ' + await toasts());
  ok(!(await tok(id)).conds.length, 'nada se aplica sozinho');
  await foto('l20-cenas-ferido-sugere');
  await clearToasts(); await hp(-6); await w(250);
  ok(!/sugere/.test(await toasts()), 'sem aplicar, mais dano na mesma faixa não repete a sugestão');
  await hp(-5); await w(200);
  await ev(id => __tc.Act.feridoAplicar(__tc.Store.get('tokens', id), 'levementeFerido'), id); await w(200);
  await ev(() => __tc.Tools.undo()); await w(200);
  await clearToasts(); await hp(0); await hp(-5); await w(250);
  await page.locator('.toast', { hasText: 'Levemente Ferido' }).getByRole('button', { name: 'Aplicar' }).click(); await w(250);
  ok((await tok(id)).conds.join() === 'levementeFerido' && /Aégis: Levemente Ferido\./.test(await toasts()), 'Aplicar põe o Levemente Ferido (com o Desfazer): ' + await toasts());
  await clearToasts();
  await hp(-7); await w(250);
  ok(!/sugere/.test(await toasts()), 'mais dano na mesma faixa: sem nova sugestão');
  await hp(-15); await w(250);
  ok(/a regra sugere Extremamente Ferido/.test(await toasts()), 'HP −15 (o segundo terço): a sugestão do Extremamente Ferido');
  await page.locator('.toast', { hasText: 'Extremamente Ferido' }).getByRole('button', { name: 'Aplicar' }).click(); await w(250);
  ok((await tok(id)).conds.join() === 'extremamenteFerido', 'o Extremamente troca o Levemente: ' + (await tok(id)).conds.join());
  await ev(() => __tc.Tools.undo()); await w(200);
  ok((await tok(id)).conds.join() === 'levementeFerido', 'o Desfazer volta o Levemente');
  await ev(() => __tc.Tools.redo()); await w(200);
  await clearToasts();
  await hp(10, 'Cura'); await w(250);
  ok((await tok(id)).conds.join() === 'extremamenteFerido' && !/sugere/.test(await toasts()), 'a cura não tira a tag (o mestre tira) nem sugere nada');
  await hp(-25); await w(250);
  ok(/a regra sugere Mortalmente Ferido/.test(await toasts()), 'HP −25 (além de 2/3): a sugestão do Mortalmente Ferido');
  await clearToasts();
  // um Ferido de cada vez, também pelo seletor
  await ev(id => __tc.Act.condToggle([__tc.Store.get('tokens', id)], 'mortalmenteFerido'), id); await w(200);
  ok((await tok(id)).conds.join() === 'mortalmenteFerido', 'pôr o Mortalmente à mão tira o Extremamente (um de cada vez): ' + (await tok(id)).conds.join());
  await hp(30, 'Cura'); await clearToasts(); await hp(-5); await w(250);
  ok(!/sugere/.test(await toasts()), 'com o Mortalmente, a faixa mais leve não é sugerida');
  // sem limite negativo: nada
  await ev(id => { const { Store } = __tc, t = Store.get('tokens', id); Store.tx('x', () => Store.upd('tokens', id, { conds: [], cinfo: {}, bars: [Object.assign({}, t.bars[0], { lo: 0, v: 30 })] })); }, id);
  await clearToasts(); await hp(-3); await w(250);
  ok(!/sugere/.test(await toasts()), 'a barra que não pode ficar negativa não sugere nada');
  await ev(id => { const { Store } = __tc, t = Store.get('tokens', id); Store.tx('x', () => Store.upd('tokens', id, { bars: [Object.assign({}, t.bars[0], { lo: 30, v: 30 })] })); }, id);
  // a tabela do mestre
  await ev(() => __tc.UI.openTab('scene')); await w(300);
  if (!(await page.locator('#fd-regras').isVisible().catch(() => false))) { await page.locator('#side').getByText('Feridos', { exact: true }).first().click(); await w(200); }
  ok(/até 33% do limite negativo, Levemente Ferido; até 67%, Extremamente Ferido/.test(await page.locator('#fd-resumo').innerText()), 'a aba Cena: os cortes dos Feridos (de começo, os terços)');
  await page.locator('#fd-regras').click(); await w(250);
  await page.locator('#fd-t1').fill('20'); await page.locator('#fd-t1').press('Tab');
  await foto('l20-cenas-feridos-tabela');
  await page.locator('.modal .btn.primary', { hasText: 'Salvar' }).click(); await w(250);
  ok(JSON.stringify(await ev(() => __tc.Store.S.prefs.feridos)) === JSON.stringify({ t1: 20, t2: 67 }) && /até 20%/.test(await page.locator('#fd-resumo').innerText()), 'Salvar guarda os cortes da mesa: ' + JSON.stringify(await ev(() => __tc.Store.S.prefs.feridos)));
  await clearToasts(); await hp(-7); await w(250);
  ok(/sugere Extremamente Ferido/.test(await toasts()), 'com o corte em 20%, −7 de −30 já é Extremamente');
  await clearToasts();
  await ev(() => __tc.Store.S.prefs.feridos = null);

  // ---------- as zonas ----------
  const Z = await ev(() => { const { FX } = __tc, r = FX.ORDER.filter(k => FX.P[k].g === 'classes'), g2 = FX.ORDER.filter(k => FX.P[k].g2 === 'classes'); return { n: r.length, g2, tag: FX.TAGS.some(x => x.id === 'classes'), total: FX.ORDER.length, sem: r.filter(k => !FX.P[k].regra || !FX.P[k].r || typeof FX.P[k].draw !== 'function').concat(r.filter(k => FX.P[k].sug && !__tc.COND_BY_ID[FX.P[k].sug])).concat(g2.filter(k => !FX.P[k].rc)), presas: r.filter(k => FX.P[k].presa) }; });
  ok(Z.n === 21 && Z.tag && Z.total === 91 && !Z.sem.length, 'as 21 zonas das classes, no grupo Classes, cada uma com a regra, a classe e o desenho (91 efeitos ao todo): ' + JSON.stringify(Z));
  ok(JSON.stringify(Z.g2.slice().sort()) === JSON.stringify(['consagrado', 'lama', 'pantano', 'silencio']), 'as de hoje que a classe usa (o Chão consagrado, a Lama, o Pântano, o Silêncio), com a regra da classe: ' + JSON.stringify(Z.g2));
  ok(JSON.stringify(Z.presas.slice().sort()) === JSON.stringify(['circuloProtecao', 'fermata', 'luzLanterna', 'retaguarda']), 'as que andam com o personagem: ' + JSON.stringify(Z.presas));
  await ev(() => __tc.UI.openTab('fx')); await w(300);
  await page.locator('#fxt-classes').click(); await w(400);
  ok(await page.locator('.fx-grid .fx-card').count() === 25, 'a aba Efeitos, no grupo Classes: 25 cartas (as 21 e as 4 de hoje)');
  await foto('l20-cenas-efeitos');
  // a Luz da Lanterna: liga o "Prender ao token clicado" e vem com o raio 3; outra zona volta ao que era
  await ev(() => { __tc.App.opt.fxAttach = false; });
  await clearToasts();
  await page.locator('#fxc-luzLanterna').click(); await w(200);
  let op = await ev(() => { const o = __tc.App.opt; return { fx: o.fx, r: o.fxR, at: o.fxAttach, d: o.fxDur }; });
  ok(op.fx === 'luzLanterna' && op.r === 3 && op.at === true, 'a Luz da Lanterna: o raio 3 e o "Prender ao token clicado" ligado — ' + JSON.stringify(op));
  ok(/Luz da Lanterna: clique no token de quem cria a zona/.test(await toasts()), 'o aviso diz para clicar no token: ' + await toasts());
  const [x, y] = await pt(5.5, 5.5); await page.mouse.click(x, y); await w(250);
  const luz = await ev(id => { const e = __tc.Store.scene().effects.find(e => e.fx === 'luzLanterna'); return e ? { token: e.token, r: e.r } : null; }, id);
  ok(luz && luz.token === id && luz.r === 3, 'clicada no token do sacerdote, a Luz fica presa a ele: ' + JSON.stringify(luz));
  await ev(() => __tc.Tools.set('fx')); await w(100);
  await ev(() => __tc.UI.openTab('fx')); await w(300); await page.locator('#fxt-classes').click(); await w(300);
  await page.locator('#fxc-chaoBrasa').click(); await w(200);
  op = await ev(() => { const o = __tc.App.opt; return { fx: o.fx, r: o.fxR, at: o.fxAttach, d: o.fxDur }; });
  ok(op.fx === 'chaoBrasa' && op.at === false && op.d === 2 && op.r === 2, 'o Chão em Brasa: o "Prender" volta a ser o de antes (desligado), com as 2 rodadas — ' + JSON.stringify(op));
  await ev(() => { __tc.App.opt.fxAttach = true; __tc.Tools.set('select'); });
  // todas numa cena, para a foto (e conferir que desenham sem erro)
  await ev(() => {
    const { Store, FX } = __tc, sc = Store.scene(), c = sc.cell, ids = FX.ORDER.filter(k => FX.P[k].g === 'classes');
    Store.tx('zonas', () => { Store.scn({ cols: 40, rows: 24 }); ids.forEach((k, i) => { const pr = FX.P[k]; Store.add('effects', { id: 'fxc_' + k, fx: k, k: pr.k === 'line' ? 'line' : pr.k === 'quad' ? 'quad' : 'circ', x: (3 + (i % 7) * 5.5) * c, y: (9 + Math.floor(i / 7) * 5.5) * c, r: pr.k === 'line' ? 3.5 : pr.k === 'quad' ? 0.5 : 1.8, w: 1, rw: 2, rh: 2, ang: 60, dir: 0, pow: 0.85, token: null, gm: false, by: null, seed: 3 + i, dur: 0, dur0: 0, at: null, apply: null, pv: pr.pv, pvm: pr.pv }); }); });
    __tc.App.view.z = 0.62; __tc.App.view.x = 0; __tc.App.view.y = 0;
  });
  await w(900); await clearToasts();
  await foto('l20-cenas-zonas');
  // o painel: a classe, a regra; nas de hoje, a regra da classe
  await ev(() => { __tc.setSel([{ c: 'effects', id: 'fxc_fermata' }]); __tc.UI.openTab('sel'); }); await w(300);
  let pn = await page.locator('#side').innerText();
  ok(/Bardo/.test(pn) && /Silenciado e Surdo/.test(pn), 'o painel da Fermata: a classe e a regra');
  await ev(() => { const { Store } = __tc, sc = Store.scene(); Store.tx('s', () => Store.add('effects', { id: 'fxc_sil', fx: 'silencio', k: 'circ', x: 30 * sc.cell, y: 3 * sc.cell, r: 2, w: 1, rw: 2, rh: 2, ang: 60, dir: 0, pow: 1, token: null, gm: false, by: null, seed: 1, dur: 0, dur0: 0, at: null, apply: null })); __tc.setSel([{ c: 'effects', id: 'fxc_sil' }]); __tc.UI.openTab('sel'); }); await w(300);
  ok(/Na classe \(Bardo, a Zona de Silêncio\)/.test(await page.locator('#fx-regra-classe').innerText()), 'o Silêncio de hoje traz a regra da Zona de Silêncio do bardo');
  // a Muralha de Natu: barra a passagem e a visão, com os 36 pontos de vida
  const mu = await ev(() => { const { FX, Store } = __tc, e = Store.get('effects', 'fxc_muralhaNatu'); return { barra: FX.ehBarreira(e), bloq: !!FX.P.muralhaNatu.bloqueia, pv: e.pv, pilar: FX.P.pilarPedra.pv, pb: FX.ehBarreira(Store.get('effects', 'fxc_pilarPedra')) }; });
  ok(mu.barra && mu.bloq && mu.pv === 36 && mu.pilar === 15 && mu.pb, 'a Muralha de Natu e o Pilar de Pedra barram a passagem e a visão (36 e 15 de HP): ' + JSON.stringify(mu));
  await ev(() => { __tc.setSel([{ c: 'effects', id: 'fxc_pilarPedra' }]); __tc.UI.openTab('sel'); }); await w(300);
  await clearToasts();
  await page.locator('#fx-pv').fill('-15'); await page.locator('#fx-pv').press('Enter'); await w(300);
  ok(!(await ev(() => !!__tc.Store.get('effects', 'fxc_pilarPedra'))) && /o pilar caiu/i.test(await toasts()), 'em zero, o Pilar cai: ' + await toasts());

  if (t.errs.length) console.log(t.errs.slice(0, 8).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
