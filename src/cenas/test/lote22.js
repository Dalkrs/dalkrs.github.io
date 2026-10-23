// Bateria do lote 22 nas Cenas (no navegador, sem o site): os pontos de vida de qualquer zona.
//   · numa zona sem pontos (o Fogo), o painel do mestre oferece "Dar pontos de vida"; com eles, o dano com sinal tira;
//     em zero, a zona sai da cena (com o Desfazer); "Sem pontos de vida" volta a zona ao de antes;
//   · os jogadores recebem só a proporção (a barrinha, sem os números); o Totem continua com os 12 dele.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 160);
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const zona = () => ev(() => { const e = __tc.Store.get('effects', 'fx_l22'); return e ? { pv: e.pv, pvm: e.pvm } : null; });
  await ev(() => { const { Store, setSel, UI } = __tc, sc = Store.scene(); Store.tx('z', () => Store.add('effects', { id: 'fx_l22', fx: 'fogo', k: 'circ', x: 6 * sc.cell, y: 6 * sc.cell, r: 2, w: 1, rw: 2, rh: 2, ang: 60, dir: 0, pow: 0.9, token: null, gm: false, by: null, seed: 4, dur: 0, dur0: 0, at: null, apply: null })); setSel([{ c: 'effects', id: 'fx_l22' }]); UI.openTab('sel'); });
  await w(300);
  ok(await page.locator('#fx-pv-dar').count() === 1 && await page.locator('#fx-pv').count() === 0, 'o Fogo (sem pontos de vida): o painel oferece "Dar pontos de vida"');
  await page.locator('#fx-pv-novo').fill('25'); await page.locator('#fx-pv-dar').click(); await w(300);
  ok(JSON.stringify(await zona()) === JSON.stringify({ pv: 25, pvm: 25 }) && await page.locator('#fx-pv').inputValue() === '25', 'dá 25 pontos de vida (o painel passa a mostrar os pontos)');
  await foto('l22-cenas-zona-pv');
  const proj = await ev(() => { const p = __tc.Proj.projetar(__tc.Store.scene(), __tc.Store.S.assets, new Set()).v.effects.find(x => x.id === 'fx_l22'); return p ? { pv: p.pv, pvm: p.pvm, pvp: p.pvp } : null; });
  ok(proj && proj.pv === undefined && proj.pvm === undefined && proj.pvp === 100, 'para os jogadores, só a proporção (a barrinha, sem os números): ' + JSON.stringify(proj));
  await page.locator('#fx-pv').fill('-10'); await page.locator('#fx-pv').press('Enter'); await w(250);
  ok((await zona()).pv === 15, '−10 tira: 15 de 25');
  await page.locator('#fx-pv').fill('-15'); await page.locator('#fx-pv').press('Enter'); await w(300);
  ok(!(await zona()) && /Fogo saiu da cena/i.test(await toasts()), 'em zero, a zona sai da cena: ' + await toasts());
  await ev(() => __tc.Tools.undo()); await w(250);
  ok((await zona()) && (await zona()).pv === 15, 'o Desfazer a traz de volta');
  await ev(() => { __tc.setSel([{ c: 'effects', id: 'fx_l22' }]); __tc.UI.openTab('sel'); }); await w(250);
  await page.locator('#fx-pv-tirar').click(); await w(250);
  ok(!((await zona()).pvm > 0) && await page.locator('#fx-pv-dar').count() === 1, '"Sem pontos de vida": a zona volta ao de antes');
  // o Totem continua com os dele (e sem o "Sem pontos de vida")
  await ev(() => { const { Store, setSel, UI } = __tc, sc = Store.scene(); Store.tx('t', () => Store.add('effects', { id: 'fx_tot', fx: 'totem', k: 'circ', x: 12 * sc.cell, y: 6 * sc.cell, r: 2, w: 1, rw: 2, rh: 2, ang: 60, dir: 0, pow: 0.9, token: null, gm: false, by: null, seed: 4, dur: 0, dur0: 0, at: null, apply: null, pv: 12, pvm: 12 })); setSel([{ c: 'effects', id: 'fx_tot' }]); UI.openTab('sel'); }); await w(250);
  ok(await page.locator('#fx-pv').inputValue() === '12' && await page.locator('#fx-pv-tirar').count() === 0, 'o Totem continua com os 12 pontos dele (sem o "Sem pontos de vida")');
  if (t.errs.length) console.log(t.errs.slice(0, 8).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
