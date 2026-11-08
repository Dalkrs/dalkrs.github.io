// Bateria do lote 107 nas Cenas (no navegador, sem o site): os 20 painéis do mundo novo (18 classes, Vampiro e
// Lobisomem), do lado do mestre, num NPC sem ficha: a escolha da barra, o disco de cada um (as marcas que se tocam), os
// ganhos, o que as habilidades põem no mapa (tokens e áreas com duração) e a conta dos turnos que tira o que acabou.
// FOTOS=pasta guarda uma foto de cada painel.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const j = JSON.stringify;
(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  const ids = await ev(() => __tc.TC ? null : (window.TC.painelBarras.BARRAS.map(b => b.id)));
  ok(ids && ids.length === 20, 'o motor tem as 20 barras do mundo novo — ' + j(ids));
  const tk = await ev(() => { const { Store, newToken } = __tc, sc = Store.scene();
    const a = newToken(sc, 8 * sc.cell, 6 * sc.cell, { name: 'Teste' }); Store.tx('Criar', () => Store.add('tokens', a)); return a.id; });
  await w(200);
  await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, tk); await w(250);
  ok((await page.locator('#pb-escolher option').count()) === 21, 'na escolha da barra especial: Nenhuma e as 20');
  for (const id of ids) {
    await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, tk); await w(120);
    await page.locator('#pb-escolher').selectOption(id); await w(200);
    await ev(id => __tc.PainelBarras.abrirNpc(id), tk); await w(200);
    const marcas = await page.locator('#pbHost .pb:not(.moeda) .pb-face .clic').count();
    for (let i = 0; i < marcas; i++) { const m = page.locator('#pbHost .pb:not(.moeda) .pb-face .clic').nth(i); if (await m.count()) { await m.click({ force: true }); await w(60); } }
    const chips = page.locator('#pbHost .pb:not(.moeda) .pb-chip[data-ga]');
    if (await chips.count()) { await chips.first().click(); await w(80); }
    const txt = await page.locator('#pbHost .pb:not(.moeda)').innerText().catch(() => '');
    ok(txt.length > 20, id + ': o painel abre e mostra algo');
    if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.locator('#pbHost .pb:not(.moeda)').screenshot({ path: path.join(SHOTS, 'l107-' + id + '.png') }).catch(() => {}); }
  }
  // o que as habilidades põem no mapa
  const antes = await ev(() => ({ t: __tc.Store.scene().tokens.length, e: __tc.Store.scene().effects.length }));
  await ev(id => { const P = __tc.PainelBarras, a = P._atorDe(__tc.Store.get('tokens', id)); const B = window.TC.painelBarras.BARRA;
    P._porNoMapa(a, __tc.Store.get('tokens', id), [{ sp: B.necromante.mapa['Horda'] }, { sp: B.karema.mapa['Passo de Brisa'] }, { sp: B.ninja.mapa['Bomba de Fumaça'] }]); }, tk);
  await w(200);
  const depois = await ev(() => { const sc = __tc.Store.scene(); return { t: sc.tokens.length, e: sc.effects.length, inv: sc.tokens.filter(x => x.inv).map(x => [x.name, x.inv.d]), ef: sc.effects.filter(x => x.pb).map(x => [x.fx, x.k, x.dur]) }; });
  ok(depois.t - antes.t === 3 && depois.inv.every(x => x[0] === 'Esqueleto' && x[1] === 3), 'Horda: 3 esqueletos perto, com 3 turnos — ' + j(depois.inv));
  ok(depois.e - antes.e === 2 && j(depois.ef) === j([['vento', 'line', 2], ['fumaca', 'circ', 2]]), 'a Corrente (linha de vento, 2 turnos) e a fumaça (2 turnos) — ' + j(depois.ef));
  // a conta dos turnos: o esqueleto some quando acaba
  await ev(id => { const { Act, Store } = __tc; Act.turnPatch(x => { x.list = []; x.on = false; x.round = 1; x.cur = null; }, 'Limpar'); Act.turnAdd([Store.get('tokens', id)]); }, tk);
  await ev(() => __tc.UI.openTab('turn')); await w(150);
  await page.locator('#turnOnOff').click(); await w(300);
  for (let i = 0; i < 4; i++) { await ev(() => __tc.Act.turnStep(1)); await w(120); }
  const fim = await ev(() => { const sc = __tc.Store.scene(); return { inv: sc.tokens.filter(x => x.inv).length, ef: sc.effects.filter(x => x.pb).length }; });
  ok(fim.inv === 0 && fim.ef === 0, 'depois de 4 voltas, os esqueletos e as áreas somem sozinhos — ' + j(fim));
  ok(!erros.length, 'sem erros na página — ' + j(erros.slice(0, 3)));
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'l107-mapa.png') });
  await t.close();
  console.log(`${n - fails} verificações passaram${fails ? ', ' + fails + ' falharam' : ''}`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
