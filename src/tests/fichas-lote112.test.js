// Lote 112: a Cola dos Equipamentos, parte 2.
//   · as regras (tc/rules.js): o dano próprio da arma (arco, besta, pólvora: it.dp, o número da faixa, que sobe com a
//     melhoria), o atributo que rola o dano (it.atr: FOR ou CAN, fixo mesmo que outro número seja maior), os outros
//     atributos da arma (F1 25 … F4 77: os cinco atributos menos o principal, e Esquiva, Furtividade e Percepção) e a
//     armadura leve/pesada (a Esquiva dela entra no total);
//   · na ficha: o aviso "Outros atributos da arma… X de 25", a escolha "Dano rola" (com Desfazer) e o "Dano 10" no cartão;
//   · o catálogo leva a regra para a ficha (peça, faixa, material, melhoria, atr, dp).
const { start, checker } = require('./lib');
const R = require('../../tc/rules.js');
const { ok, end } = checker();
const j = JSON.stringify;
const zero = { FOR: 0, DES: 0, VIT: 0, CAN: 0, AGI: 0 };
const it = (id, nome, o) => Object.assign({ id, nome, equipado: true, bonus: Object.assign({}, zero) }, o);
const pc = (id, nome, level, itens) => ({ id, nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level, tiers: { FOR: 'E', DES: 'C', AGI: 'B', VIT: 'D', CAN: 'A' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 0, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens, recursos: [{ id: 'hp', nome: 'HP', fml: '100' }], notas: '' });

// 1) as regras, sem tela
let r = R.itemNaRegra({ nome: 'Arco curto', tipo: 'arma', dp: 10, faixa: 1, bonus: { AGI: 5, PER: 3 } }, 1);
ok(r.peca === 'arma' && j(r.chaves) === j(['DP']) && r.valor === 10 && r.estado === 'no', 'o arco: dano próprio 10 é o número da F1');
ok(r.outros.soma === 8 && r.outros.max === 25 && r.outros.sobra === 17 && r.outros.chaves.includes('AGI'), 'no arco, todos os atributos são "outros": 8 de 25');
ok(R.melhorarItem({ nome: 'Arco', dp: 10, faixa: 1, mat: 1 }, 1).it.dp === 11, 'Melhorar o arco: dano próprio 10 → 11');
ok(R.ajusteDoItem({ nome: 'Besta', tipo: 'arma', dp: 6, faixa: 2 }, 7).it.dp === 14, 'abaixo da faixa: o dano próprio sobe até 14 (F2)');
r = R.itemNaRegra({ nome: 'Katana', tipo: 'arma', atr: 'FOR', faixa: 1, bonus: { FOR: 10, AGI: 20, DES: 8 } }, 3);
ok(j(r.chaves) === j(['FOR']) && r.estado === 'no', 'a Katana rola FOR, mesmo com AGI 20 (it.atr manda)');
ok(r.outros.soma === 28 && r.outros.acima && !r.outros.chaves.includes('FOR'), 'outros: AGI 20 + DES 8 = 28 de 25, passou');
r = R.itemNaRegra({ nome: 'Cajado', tipo: 'arma', atr: 'CAN', faixa: 3, bonus: { CAN: 22, VIT: 10, ESQ: 5, FUR: 5, DFF: 30, BLQ: 9 } }, 12);
ok(r.outros.soma === 20 && r.outros.max === 55, 'o cajado F3: VIT 10 + Esquiva 5 + Furtividade 5 = 20 de 55 (defesas e Bloqueio fora da conta)');
ok(j([1, 2, 3, 4].map(f => R.outrosDaArma({ bonus: {} }, 'FOR', f).max)) === j([25, 35, 55, 77]), 'o teto dos outros: 25, 35, 55, 77');
const leve = R.itemNaRegra({ nome: 'Couro', tipo: 'armadura', faixa: 1, bonus: { DFF: 6, DFM: 9, ESQ: 3 } }, 1), pesada = R.itemNaRegra({ nome: 'Placas', tipo: 'armadura', faixa: 1, bonus: { DFF: 12, DFM: 9, ESQ: -3 } }, 1);
ok(leve.estado === 'no' && pesada.estado === 'no' && leve.valor === 18 && pesada.valor === 18, 'a armadura leve (6 + 9 + 3 de Esquiva) e a pesada (12 + 9 − 3) estão no valor da F1');

// 2) o catálogo leva a regra para a ficha
global.window = global; window.TC = { rules: R };
require('../../tc/itens.js');
const I = window.TC.itens;
const cat = I.catalogo({ itens: [{ id: 'ar_arco', t: 'equip', nome: 'Arco curto', nota: 'Dano próprio 10.', equip: { tipo: 'arma', peca: 'arma', faixa: 1, dp: 10, bonus: {}, def: {} } },
  { id: 'ar_cajado', t: 'equip', nome: 'Cajado', equip: { tipo: 'arma', peca: 'arma', faixa: 2, mat: 2, melhoria: 1, atr: 'CAN', bonus: { CAN: 15 }, def: {} } }] });
const fA = I.paraFicha(cat.itens[0]), fC = I.paraFicha(cat.itens[1]);
ok(fA.dp === 10 && fA.peca === 'arma' && fA.faixa === 1, 'o arco entra na ficha com o dano próprio e a faixa');
ok(fC.atr === 'CAN' && fC.mat === 2 && fC.melhoria === 1 && R.itemNaRegra(fC, 7).estado === 'no', 'o cajado entra com CAN, Q2 e +1, no valor (15)');

// 3) na tela
const ITENS = [it('ka', 'Katana', { tipo: 'arma', atr: 'FOR', faixa: 1, bonus: Object.assign({}, zero, { FOR: 10, AGI: 8, DES: 6 }) }),
  it('ar', 'Arco curto', { tipo: 'arma', faixa: 1, dp: 10 })];
const estado = j({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_d', 'Dain', 3, ITENS)], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_d', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas112', w: 1320, h: 960, seed: { urgm_calc_atributos_v1: estado } });
  P.setDefaultTimeout(8000);
  const w = ms => P.waitForTimeout(ms);
  const foto = async (nome, sel) => { if (process.env.FOTOS) await P.locator(sel).first().screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const item = id => P.evaluate(i => JSON.parse(JSON.stringify(S.personagens[0].itens.find(x => x.id === i) || null)), id);
  const desfazer = async () => { await P.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(350); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n').slice(0, 8).join(' / ')); } };
  const erros = []; P.on('pageerror', e => erros.push(String(e.message)));

  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  await P.locator('[data-abaficha="bolsas"]').click(); await w(250);

  await passo('o cartão', async () => {
    const tx = await P.locator('[data-itcard="ar"] .itbon').innerText();
    ok(/Dano 10/.test(tx) && !/\+10/.test(tx), 'o cartão do arco mostra "Dano 10": ' + tx.replace(/\s+/g, ' '));
  });

  await passo('os outros atributos', async () => {
    await P.locator('[data-itemed="ka"]').click(); await w(250);
    const o = await P.locator('[data-itcard="ka"] .itregoutros').innerText();
    ok(/todos juntos: 14 de 25 \(F1\)\. Sobram 11\./.test(o), 'a Katana: ' + o);
    ok(!/FOR/.test(o.split(':')[0]), 'o principal (FOR) não entra na lista dos outros');
    await P.locator('[data-itembon="ka|AGI"]').fill('20'); await P.locator('[data-itembon="ka|AGI"]').press('Tab'); await w(350);
    if (await P.locator('[data-itcard="ka"] .itregoutros').count() === 0) { await P.locator('[data-itemed="ka"]').click(); await w(250); }
    ok(/26 de 25 \(F1\)\. Passou 1\./.test(await P.locator('[data-itcard="ka"] .itregoutros').innerText()), 'AGI 20 + DES 6: passou 1');
    ok(await P.locator('[data-itcard="ka"] .itregoutros.est-acima').count() === 1, 'e o aviso fica no estilo de "acima"');
    await foto('l112-outros', '[data-itcard="ka"]');
  });

  await passo('Dano rola', async () => {
    ok((await P.locator('[data-itregdano="ka"]').inputValue()) === 'FOR', 'a Katana: "Dano rola" mostra FOR');
    await P.selectOption('[data-itregdano="ka"]', 'dp'); await w(300);
    let x = await item('ka');
    ok(x.dp === 10 && !x.atr, 'trocar para "Próprio": dano próprio 10 (o número da F1)');
    await desfazer();
    x = await item('ka');
    ok(x.atr === 'FOR' && !x.dp, 'Desfazer volta a FOR');
    if (await P.locator('[data-itregdano="ar"]').count() === 0) { await P.locator('[data-itemed="ar"]').click(); await w(250); }
    ok((await P.locator('[data-itregdano="ar"]').inputValue()) === 'dp', 'o arco: "Dano rola" mostra "Próprio"');
    ok(/A F1 pede 10 em Dano próprio\. Este item está no valor\./.test(await P.locator('[data-itcard="ar"] .itregaviso').first().innerText()), 'o aviso do arco fala do dano próprio');
  });

  ok(!erros.length, 'sem erro na página: ' + erros.join(' | '));
  await t.close();
  end();
})();
