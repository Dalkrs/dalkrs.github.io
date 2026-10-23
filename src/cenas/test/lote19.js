// Bateria do lote 19 nas Cenas (no navegador, sem o site): as condições das raças.
//   · a lista: o grupo "Raças" (as 53, em ordem alfabética), a raça e a árvore junto do nome, os ícones próprios;
//   · pôr a condição traz a duração e o contador de começo; o contador para no máximo; no limite, a sugestão (o Frio
//     no 5 sugere Congelado e zera; a Contagem no zero sugere a Sentença), com Aplicar e Desfazer;
//   · os membros perdidos: a janela pergunta o lado (só o mestre, um token de cada vez);
//   · as zonas das raças na aba Efeitos (o grupo Raças: o desenho, a regra, a raça no painel, a duração e a forma de
//     começo), as arapucas escondidas (e o aviso de quem entra), o Totem e a Parte Solta com os pontos de vida.
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

  // ---------- a lista ----------
  const L = await ev(() => { const { CONDS, ICONS } = __tc; const r = CONDS.filter(c => c.g === 'racas'); return { n: r.length, total: CONDS.length, nomes: r.map(c => c.n), sem: r.filter(c => !ICONS[c.i] || !c.r).map(c => c.id), ids: new Set(CONDS.map(c => c.id)).size }; });
  ok(L.n === 53 && L.total === 123 && L.ids === 123, 'as 53 condições das raças no grupo novo (123 ao todo, sem repetir): ' + L.n + '/' + L.total);
  const ord = L.nomes.slice().sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  ok(JSON.stringify(ord) === JSON.stringify(L.nomes), 'em ordem alfabética: ' + L.nomes.slice(0, 6).join(', ') + '…');
  ok(L.sem.length === 0, 'cada uma com o ícone próprio e a raça: ' + JSON.stringify(L.sem));

  // um token para as condições
  const id = await ev(() => { const { Store, newToken, setSel } = __tc, sc = Store.scene(); const t = newToken(sc, 5 * sc.cell, 5 * sc.cell, { name: 'Selene' }); Store.tx('t', () => Store.add('tokens', t)); setSel([{ c: 'tokens', id: t.id }]); return t.id; });
  await w(200);
  await ev(id => __tc.UI.condPicker([__tc.Store.get('tokens', id)]), id); await w(300);
  ok(await page.locator('#cgm-tab-racas').count() === 1, 'a aba "Raças" no seletor de condições');
  await page.locator('#cgm-tab-racas').click(); await w(200);
  ok(await page.locator('.modal .chips .chip.chip-r').count() === 53, 'na aba Raças, as 53, cada uma com a raça embaixo do nome');
  ok(/Frio\s*Kitsune Selene/.test(await page.locator('.modal .chips .chip', { hasText: 'Frio' }).first().innerText()), 'o Frio diz de onde vem: Kitsune Selene');
  await foto('l19-cenas-seletor');
  // pôr o Frio: o contador de começo (1); o Selo de Ocre: as 2 rodadas
  await page.locator('.modal .chips .chip', { hasText: 'Frio' }).first().click(); await w(150);
  await page.locator('.modal .chips .chip', { hasText: 'Selo de Ocre' }).first().click(); await w(150);
  let ci = await ev(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id).cinfo)), id);
  ok(ci.frio && ci.frio.n === 1 && !ci.frio.d && ci.seloOcre && ci.seloOcre.d === 2 && ci.seloOcre.d0 === 2, 'pôr traz o de começo: Frio com 1 acúmulo; Selo de Ocre com 2 rodadas — ' + JSON.stringify(ci));
  await page.keyboard.press('Escape'); await w(200);
  // o contador: sobe até 5 e para; no 5, a sugestão
  await ev(() => __tc.UI.openTab('sel')); await w(300);
  for (let k = 0; k < 3; k++) { await page.locator('#cd-frio-plus').click(); await w(120); }
  ok(await ev(id => __tc.Store.get('tokens', id).cinfo.frio.n, id) === 4, 'o + soma os acúmulos (4)');
  await clearToasts();
  await page.locator('#cd-frio-plus').click(); await w(200);
  ok(await ev(id => __tc.Store.get('tokens', id).cinfo.frio.n, id) === 5 && await page.locator('#cd-frio-plus').isDisabled(), 'no máximo (5), o + fica parado');
  ok(await ev(id => { const { Act, Store } = __tc, r = Act.condStep(Store.get('tokens', id), 'frio', 1); return r === 'max' && Store.get('tokens', id).cinfo.frio.n === 5; }, id), 'somar mais um no máximo não passa de 5 (nem pelo atalho)');
  ok(await ev(id => { const { Act, Store } = __tc; return Act.condLote([Store.get('tokens', id)], 'frio', { delta: 1 }) === 0 && Store.get('tokens', id).cinfo.frio.n === 5; }, id), 'nem pelos vários de uma vez');
  const sug = await toasts();
  ok(/Frio chegou a 5 em Selene: teste de VIT: se falhar, fica Congelado/.test(sug) && /Aplicar: Congelado/.test(sug), 'no limite, a sugestão com Aplicar: ' + sug);
  await foto('l19-cenas-frio-limite');
  await page.locator('.toast button', { hasText: 'Aplicar: Congelado' }).click(); await w(250);
  let tk = await ev(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id))), id);
  ok(tk.conds.includes('gelo') && !tk.conds.includes('frio') && tk.cinfo.gelo.d === 1 && !tk.cinfo.frio, 'Aplicar: Congelado por 1 rodada, e o Frio zerou (saiu) — ' + JSON.stringify(tk.cinfo));
  ok(/Desfazer/.test(await toasts()), 'com o Desfazer');
  await ev(() => __tc.Tools.undo()); await w(200);
  tk = await ev(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id))), id);
  ok(!tk.conds.includes('gelo') && tk.cinfo.frio.n === 5, 'o Desfazer volta (o Frio em 5, sem o Congelado)');
  // a Contagem: começa em 3 e desce; no zero, a Sentença
  await ev(id => __tc.Act.condToggle([__tc.Store.get('tokens', id)], 'contagem'), id); await w(250);
  ok(await ev(id => __tc.Store.get('tokens', id).cinfo.contagem.n, id) === 3, 'a Contagem começa em 3');
  await clearToasts();
  for (let k = 0; k < 3; k++) { await page.locator('#cd-contagem-minus').click(); await w(150); }
  tk = await ev(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id))), id);
  ok(!tk.conds.includes('contagem') && /Contagem de Selene chegou a zero: a oração se cumpre e vem a Sentença/.test(await toasts()), 'a Contagem chegou a zero (saiu): a sugestão da Sentença — ' + await toasts());
  await page.locator('.toast button', { hasText: 'Aplicar: Sentença' }).click(); await w(250);
  tk = await ev(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id))), id);
  ok(tk.conds.includes('sentenca') && tk.cinfo.sentenca.d === 1, 'Aplicar: a Sentença, por 1 rodada');
  // a lista das ativas: a raça embaixo do nome
  ok(/Selo de Ocre\s*Humano Sarep/.test(await page.locator('.cact').first().innerText()), 'nas ativas, a raça embaixo do nome');
  await foto('l19-cenas-ativas');

  // ---------- os membros perdidos ----------
  await ev(id => __tc.UI.condPicker([__tc.Store.get('tokens', id)]), id); await w(300);
  await page.locator('#cgm-tab-racas').click(); await w(200);
  await page.locator('.modal .chips .chip', { hasText: 'Mão Perdida' }).first().click(); await w(300);
  ok(await page.locator('#mb-lado-e').count() === 1 && await page.locator('#mb-lado-ed').count() === 1, 'Mão Perdida: a janela pergunta o lado (esquerdo, direito, os dois)');
  await foto('l19-cenas-membro');
  await page.locator('label:has(#mb-lado-d)').click();
  await page.locator('.modal .btn.primary').click(); await w(300);
  tk = await ev(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id))), id);
  ok(tk.conds.includes('maoPerdida') && tk.cinfo.maoPerdida.lado === 'd', 'a Mão Perdida, do lado direito: ' + JSON.stringify(tk.cinfo.maoPerdida));
  ok(/Selene: Mão Perdida \(lado direito\)/.test(await toasts()), 'o aviso diz o lado: ' + await toasts());
  await page.keyboard.press('Escape'); await w(150);

  // ---------- as zonas ----------
  await clearToasts();
  const Z = await ev(() => { const { FX } = __tc, r = FX.ORDER.filter(k => FX.P[k].g === 'racas'); return { n: r.length, tag: FX.TAGS.some(x => x.id === 'racas'), sem: r.filter(k => !FX.P[k].regra || !FX.P[k].r || typeof FX.P[k].draw !== 'function').concat(r.filter(k => FX.P[k].sug && !__tc.COND_BY_ID[FX.P[k].sug])) }; });
  ok(Z.n === 19 && Z.tag && !Z.sem.length, 'as 19 zonas e objetos das raças, no grupo Raças, cada uma com a regra, a raça e o desenho: ' + JSON.stringify(Z));
  await ev(() => __tc.UI.openTab('fx')); await w(300);
  await page.locator('#fxt-racas').click(); await w(400);
  ok(await page.locator('.fx-grid .fx-card').count() === 19, 'a aba Efeitos, no grupo Raças: 19 cartas');
  await foto('l19-cenas-efeitos');
  // escolher o Corredor de Vento: a ferramenta já vem com a linha de 6 e as 2 rodadas
  await page.locator('#fxc-corredorVento').click(); await w(200);
  const op = await ev(() => { const o = __tc.App.opt; return { fx: o.fx, k: o.fxShape, r: o.fxR, w: o.fxW, d: o.fxDur }; });
  ok(op.fx === 'corredorVento' && op.k === 'line' && op.r === 6 && op.w === 1 && op.d === 2, 'o Corredor de Vento: a linha de 6 cédulas e as 2 rodadas de começo, na ferramenta — ' + JSON.stringify(op));
  // pôr todas numa cena, para a foto (e conferir que desenham sem erro)
  await ev(() => {
    const { Store, FX, Tools } = __tc, sc = Store.scene(), c = sc.cell, ids = FX.ORDER.filter(k => FX.P[k].g === 'racas');
    Tools.set('select');
    Store.tx('zonas', () => { Store.scn({ cols: 40, rows: 24 }); ids.forEach((k, i) => { const pr = FX.P[k]; Store.add('effects', { id: 'fxr_' + k, fx: k, k: pr.k === 'line' ? 'line' : 'circ', x: (3 + (i % 7) * 5.5) * c, y: (3 + Math.floor(i / 7) * 7) * c, r: pr.k === 'line' ? 4 : 1.8, w: 1, rw: 2, rh: 2, ang: 0, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: 3 + i, dur: 0, dur0: 0, at: null, apply: null, pv: pr.pv, pvm: pr.pv }); }); });
    __tc.App.view.z = 0.62; __tc.App.view.x = 0; __tc.App.view.y = 0;
  });
  await w(900);
  await foto('l19-cenas-zonas');
  // o painel: a raça junto da forma, a regra
  await ev(() => { __tc.setSel([{ c: 'effects', id: 'fxr_terraMorta' }]); __tc.UI.openTab('sel'); }); await w(300);
  const pn = await page.locator('#side').innerText();
  ok(/Taekeir Magi'atach/.test(pn) && /Nela, os inimigos de quem a fez fixam −2 em tudo/.test(pn), 'o painel da Terra Morta: a raça e a regra');
  // o Totem: os pontos de vida; em zero, some (com o aviso dele)
  await ev(() => { __tc.setSel([{ c: 'effects', id: 'fxr_totem' }]); __tc.UI.openTab('sel'); }); await w(300);
  ok(await page.locator('#fx-pv').count() === 1 && await page.locator('#fx-pv').inputValue() === '12', 'o Totem com os 12 pontos de vida');
  await foto('l19-cenas-totem');
  await clearToasts();
  await page.locator('#fx-pv').fill('-12'); await page.locator('#fx-pv').press('Enter'); await w(300);
  ok(!(await ev(() => !!__tc.Store.get('effects', 'fxr_totem'))) && /Os pontos acabaram: o totem caiu/.test(await toasts()), 'em zero, o Totem some: ' + await toasts());
  await ev(() => __tc.Tools.undo()); await w(200);
  ok(await ev(() => !!__tc.Store.get('effects', 'fxr_totem')), 'e o Desfazer o traz de volta');
  // a Arapuca escondida: quem entra avisa o mestre
  await ev(() => { const { Store } = __tc; Store.tx('esconder', () => Store.upd('effects', 'fxr_arapuca', { gm: true })); });
  await clearToasts();
  const ar = await ev(() => { const { Store, FX, newToken } = __tc, sc = Store.scene(), e = Store.get('effects', 'fxr_arapuca'), c = sc.cell; const t = newToken(sc, e.x - 4 * c, e.y - c / 2, { name: 'Lobo' }); Store.tx('lobo', () => Store.add('tokens', t)); return { id: t.id, x: e.x - c / 2, y: e.y - c / 2, jog: __tc.Proj.projetar(Store.scene(), Store.S.assets, new Set()).v.effects.some(x => x.id === 'fxr_arapuca') }; });
  ok(!ar.jog, 'a Arapuca escondida não vai para os jogadores');
  await ev(a => { const { Store } = __tc; Store.tx('andar', () => Store.upd('tokens', a.id, { x: a.x, y: a.y })); }, ar); await w(300);
  ok(/Lobo entrou na Arapuca/.test(await toasts()) && /Revelar/.test(await toasts()), 'quem entra na Arapuca escondida avisa o mestre, com o Revelar: ' + await toasts());

  if (t.errs.length) console.log(t.errs.slice(0, 8).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
