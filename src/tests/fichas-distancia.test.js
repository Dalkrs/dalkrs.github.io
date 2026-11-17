// Lote 161: a arma à distância (arco, besta, arma de fogo) — dano fixo e a munição na arma.
//   · as regras: distDoItem, dispararDist, recarregarDist, textoDist, danoDoTiro;
//   · na ficha: "Dano rola" → "À distância: arma de fogo", o dano fixo digitado, a capacidade, −/+, Disparar e Recarregar.
const { start, checker } = require('./lib');
const R = require('../../tc/rules.js');
const { ok, end } = checker();
const j = JSON.stringify;
const zero = { FOR: 0, DES: 0, VIT: 0, CAN: 0, AGI: 0 };
const it = (id, nome, o) => Object.assign({ id, nome, equipado: true, bonus: Object.assign({}, zero) }, o);
const pc = (id, nome, level, itens) => ({ id, nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level, tiers: { FOR: 'E', DES: 'C', AGI: 'B', VIT: 'D', CAN: 'A' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 0, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens, recursos: [{ id: 'hp', nome: 'HP', fml: '100' }], notas: '' });

// 1) as regras
const pistola = it('pi', 'Pistola', { tipo: 'arma', peca: 'arma', faixa: 1, dp: 18, dano: { FOGO: 4 }, dist: { k: 'fogo', cap: 6, bal: 1, pen: 1 } });
ok(R.ehDist(pistola) && !R.ehDist(it('x', 'Espada')) && !R.ehDist(it('y', 'Coisa', { dist: { k: 'nada' } })), 'ehDist');
ok(j(R.distDoItem(it('z', 'Z', { dist: { k: 'fogo', cap: 6, bal: 99, pen: -3 } })).bal) === '6' && R.distDoItem(it('z', 'Z', { dist: { k: 'fogo', cap: 6, bal: 99, pen: -3 } })).pen === 0, 'a munição fica entre 0 e a capacidade');
let r = R.dispararDist(pistola);
ok(r.ok && r.d.bal === 0 && R.textoDist(r.d) === 'Balas 0/6 · Pentes 1', 'disparar gasta 1: ' + R.textoDist(r.d));
ok(pistola.dist.bal === 1, 'sem mexer no item de antes');
const vazio = R.dispararDist(r.item);
ok(!vazio.ok && /recarregue/.test(vazio.erro), 'sem bala não dispara: ' + vazio.erro);
r = R.recarregarDist(r.item);
ok(r.ok && r.d.bal === 6 && r.d.pen === 0, 'recarregar gasta 1 pente e enche');
ok(!R.recarregarDist(r.item).ok, 'cheia não recarrega');
ok(R.danoDoTiro(pistola).texto === '18 + Fogo 4', 'o dano do tiro: ' + R.danoDoTiro(pistola).texto);
ok(R.chavesDaPeca(pistola, 'arma')[0] === 'DP', 'na regra, o principal é o dano fixo');

// 2) na tela
const estado = j({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_d', 'Dain', 1, [it('ar', 'Mosquete', { tipo: 'arma', peca: 'arma', atr: 'DES', faixa: 1, bonus: Object.assign({}, zero, { DES: 10 }) })])], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_d' });
{ // (lote 178) a pistola com um 0 no campo "Arremesso" (pilha: 0) continua dando os atributos: arma à distância não é de arremesso
  const p0 = it('p0', 'Pistola', { tipo: 'arma', pilha: 0, dist: { k: 'fogo', cap: 10, bal: 7, pen: 1 }, dp: 30, bonus: Object.assign({}, zero, { DES: 12, AGI: 10 }) });
  const ku = it('ku', 'Kunai', { tipo: 'arma', pilha: 0, bonus: Object.assign({}, zero, { FOR: 3 }) });
  ok(R.itemAtivo(p0, [p0, ku]) && !R.itemAtivo(ku, [p0, ku]), 'a pistola com pilha 0 soma; a Kunai sem nenhuma, não');
}

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'distancia', w: 1320, h: 960, seed: { urgm_calc_atributos_v1: estado } });
  P.setDefaultTimeout(8000);
  const w = ms => P.waitForTimeout(ms);
  const item = id => P.evaluate(i => JSON.parse(JSON.stringify(S.personagens[0].itens.find(x => x.id === i) || null)), id);
  const desfazer = async () => { await P.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(350); };
  const abrir = async () => { if (await P.locator('[data-itregdano="ar"]').count() === 0) { await P.locator('[data-itemed="ar"]').click(); await w(250); } };
  const erros = []; P.on('pageerror', e => erros.push(String(e.message)));
  try {
    await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
    await P.locator('[data-abaficha="bolsas"]').click(); await w(250);
    await abrir();
    await P.selectOption('[data-itregdano="ar"]', 'd:fogo'); await w(300);
    let x = await item('ar');
    ok(x.dp === 10 && !x.atr && j(x.dist) === j({ k: 'fogo', cap: 6, bal: 6, pen: 2 }), 'À distância: arma de fogo — dano fixo 10 (F1), 6 balas e 2 pentes: ' + j(x));
    ok(/Arma de fogo · dano 10/.test(await P.locator('[data-itcard="ar"] .itdist').innerText()), 'o cartão mostra a munição');
    await abrir();
    await P.locator('[data-itregdp="ar"]').fill('25'); await P.locator('[data-itregdp="ar"]').press('Tab'); await w(300);
    ok((await item('ar')).dp === 25, 'o dano fixo digitado (25)');
    await abrir();
    await P.locator('[data-itdistcap="ar"]').fill('4'); await P.locator('[data-itdistcap="ar"]').press('Tab'); await w(300);
    x = await item('ar');
    ok(x.dist.cap === 4 && x.dist.bal === 4, 'cabem 4: as balas ficam em 4');
    await P.locator('[data-itdisparar="ar"]').click(); await w(300);
    ok((await item('ar')).dist.bal === 3, 'Disparar gasta 1');
    ok(/disparou Mosquete: dano 25\. Restam 3 balas\./.test(await P.locator('.toast').last().innerText()), 'o aviso: ' + await P.locator('.toast').last().innerText());
    await desfazer();
    ok((await item('ar')).dist.bal === 4, 'Desfazer devolve a bala');
    await P.locator('[data-itdistbaln="ar"]').fill('0'); await P.locator('[data-itdistbaln="ar"]').press('Tab'); await w(300);
    ok(await P.locator('[data-itdisparar="ar"]').isDisabled() && /vazia/.test(await P.locator('[data-itcard="ar"] .itdist').innerText()), 'em 0: não dispara, "vazia — recarregue"');
    await P.locator('[data-itrecarregar="ar"]').click(); await w(300);
    x = await item('ar');
    ok(x.dist.bal === 4 && x.dist.pen === 1, 'Recarregar: 1 pente a menos, cheia');
    await P.locator('[data-itdistpen="ar"][data-d="1"]').click(); await w(250);
    ok((await item('ar')).dist.pen === 2, '+ nos pentes');
    await abrir();
    await P.selectOption('[data-itregdano="ar"]', 'DES'); await w(300);
    x = await item('ar');
    ok(!x.dist && !x.dp && x.atr === 'DES' && await P.locator('[data-itcard="ar"] .itdist').count() === 0, 'voltar para DES tira a munição');
    if (process.env.FOTOS) { await desfazer(); await P.locator('[data-itcard="ar"]').screenshot({ path: process.env.FOTOS + '/l161-arma.png' }); }
    ok(!erros.length, 'sem erros na página: ' + erros.join(' | '));
  } catch (e) { ok(false, 'falhou: ' + e.message.split('\n')[0]); }
  await t.close(); end();
})();
