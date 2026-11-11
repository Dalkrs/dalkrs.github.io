/* Lote 140: Vantagem e Desvantagem na Disputa da ficha. Cada lado tem as duas caixinhas (marcar uma desmarca a
   outra); com vantagem rola duas vezes e fica com o maior, com desvantagem com o menor; a outra sai riscada no registro e
   o dado dela vai junto (para o auditor). A desta ficha fica nela; a do oponente fica com ele. */
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = (id, nome, lvl) => ({ id, nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: lvl, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 0, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  habilidades: [], itens: [], notas: '' });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_dain', 'Dain X', 5), pc('pc_cap', 'Capitão Orrin', 4)], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas', seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms), S0 = fn => P.evaluate(fn);
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  await P.locator('[data-abaficha="atributos"]').click(); await w(150);
  await P.locator('#btnDisputa').click(); await w(250);
  ok(await P.locator('#disVantA').count() === 1 && await P.locator('#disDesvB').count() === 1, 'os dois lados têm Vantagem e Desvantagem');
  await P.locator('#disAlvo').selectOption('__avulso__'); await w(200);
  await P.locator('#disVantA').check(); await w(200);
  await P.locator('#disDesvA').check(); await w(200);
  ok(!(await P.locator('#disVantA').isChecked()) && await P.locator('#disDesvA').isChecked(), 'marcar Desvantagem desmarca a Vantagem');
  await P.locator('#disVantA').check(); await w(200);
  await P.locator('#disDesvB').check(); await w(200);
  await P.locator('#disValorB').fill('60'); await P.locator('#disFixaB').fill('10'); await w(200);
  await P.locator('#disRolar').click(); await w(300);
  const e = await S0(() => { const x = S.log[0]; return { det: x.det, dd: x.dd }; });
  ok(/\(1d\d+ \+ 0, dado \d+ · vantagem: (\d+) e .*̶/.test(e.det) && /NPC: valor 60 \(1d50 \+ 10, dado \d+ · desvantagem: \d+ e /.test(e.det) && e.dd.length === 4, 'o registro mostra as duas rolagens de cada lado (a outra riscada), e os quatro dados vão junto: ' + JSON.stringify(e));
  // o número que ficou: o maior (vantagem) e o menor (desvantagem)
  const m = /Dain X: \S+ \d+ \(1d\d+ \+ 0, dado (\d+) · vantagem: (\d+) e ([^)]*)\) = (\d+)  ·  NPC: valor 60 \(1d50 \+ 10, dado (\d+) · desvantagem: (\d+) e ([^)]*)\) = (\d+)/.exec(e.det);
  const tira = s => Number(s.replace(/̶/g, ''));
  ok(m && +m[4] >= tira(m[3]) && +m[8] <= tira(m[7]) && +m[8] === +m[5] + 10, 'vantagem fica com o maior; desvantagem, com o menor');
  ok(/vantagem: \d+ e /.test(await P.locator('.dislado').first().locator('.disdet').innerText()), 'a janela mostra as duas rolagens');
  await P.locator('#disFechar').click(); await w(250);
  await P.locator('#btnDisputa').click(); await w(250);
  ok(await P.locator('#disVantA').isChecked() && await P.locator('#disDesvB').isChecked(), 'abrir de novo: a vantagem da ficha e a desvantagem do NPC continuam marcadas');
  await P.locator('#disAlvo').selectOption('pc_cap'); await w(200);
  ok(!(await P.locator('#disDesvB').isChecked()) && !(await P.locator('#disVantB').isChecked()), 'outro oponente, sem nada guardado, vem sem vantagem');
  await P.locator('#disFechar').click(); await w(250);
  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
