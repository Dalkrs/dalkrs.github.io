// Lote 122: a arma de arremesso (Kunai, Shuriken…) — uma pilha equipada como arma.
//   · as regras: a pilha vazia não soma; o catálogo leva a pilha à ficha (o nome sem o "(5)") e soma na pilha que já existe;
//     o Desfazer da entrega tira só o que entrou;
//   · na ficha: −/+, digitar, "Arremessar" (gasta 1, com Desfazer), o zero (apagado, sem somar) e o campo no editor.
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
const kun = n => it('ku', 'Kunai', { tipo: 'arma', peca: 'arma', faixa: 1, atr: 'DES', pilha: n, bonus: Object.assign({}, zero, { DES: 10 }) });
const des = n => R.valorDoAtributo(R.calcular(pc('p', 'X', 1, [kun(n)])), 'DES');
ok(des(3) - des(0) === 10, 'a pilha com kunais soma (DES +10); vazia, não soma');
ok(R.pilhaVazia(kun(0)) && !R.pilhaVazia(kun(2)) && !R.pilhaVazia(it('x', 'Espada')), 'pilhaVazia');
global.window = global; window.TC = { rules: R };
require('../../tc/itens.js');
const I = window.TC.itens;
const cat = I.item({ t: 'equip', id: 'mu_kunai', nome: 'Kunai (5)', nota: '[Comum] Facas de arremesso.', equip: { tipo: 'arma', peca: 'arma', faixa: 1, atr: 'DES', bonus: { DES: 10 }, pilha: 5 } });
let e1 = I.entregar({ itens: [] }, {}, [{ item: cat, qtd: 2 }], 0);
ok(e1.ficha.itens.length === 1 && e1.ficha.itens[0].nome === 'Kunai' && e1.ficha.itens[0].pilha === 10 && e1.ficha.itens[0].atr === 'DES', 'comprar 2 pacotes: uma pilha "Kunai" ×10');
const e2 = I.entregar(e1.ficha, e1.estado, [{ item: cat, qtd: 1 }], 0);
ok(e2.ficha.itens.length === 1 && e2.ficha.itens[0].pilha === 15, 'comprar mais: entra na mesma pilha (×15)');
ok(I.desentregar(e2.ficha, e2.estado, e2.desfazer).ficha.itens[0].pilha === 10, 'o Desfazer da compra tira só os 5');

// 2) na tela
const estado = j({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_d', 'Dain', 1, [kun(2), it('ka', 'Katana', { tipo: 'arma', atr: 'FOR', faixa: 1, bonus: Object.assign({}, zero, { FOR: 10 }) })])], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_d', selSit: null, aba: 'fichas', grupos: [] });
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'arremesso', w: 1320, h: 960, seed: { urgm_calc_atributos_v1: estado } });
  P.setDefaultTimeout(8000);
  const w = ms => P.waitForTimeout(ms);
  const item = id => P.evaluate(i => JSON.parse(JSON.stringify(S.personagens[0].itens.find(x => x.id === i) || null)), id);
  const desfazer = async () => { await P.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(350); };
  const erros = []; P.on('pageerror', e => erros.push(String(e.message)));
  try {
    await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
    await P.locator('[data-abaficha="bolsas"]').click(); await w(250);
    ok(await P.locator('[data-itcard="ku"] .itpilha').count() === 1 && (await P.locator('[data-itpilhan="ku"]').inputValue()) === '2', 'o cartão da Kunai mostra a pilha (2)');
    await P.locator('[data-itarremesso="ku"]').click(); await w(300);
    ok((await item('ku')).pilha === 1, 'Arremessar gasta 1');
    ok(/arremessou Kunai \(restam 1\)/.test(await P.locator('.toast').last().innerText()), 'o aviso: ' + await P.locator('.toast').last().innerText());
    await desfazer();
    ok((await item('ku')).pilha === 2, 'Desfazer devolve');
    await P.locator('[data-itpilha="ku"][data-d="1"]').click(); await w(250);
    ok((await item('ku')).pilha === 3, '+ soma 1 (o mestre devolveu as achadas)');
    await P.locator('[data-itpilhan="ku"]').fill('0'); await P.locator('[data-itpilhan="ku"]').press('Tab'); await w(300);
    ok((await item('ku')).pilha === 0 && await P.locator('[data-itcard="ku"].pilhazero').count() === 1 && await P.locator('[data-itarremesso="ku"]').isDisabled(), 'em 0: fica na ficha, apagada, sem arremessar');
    ok(/acabaram/.test(await P.locator('[data-itcard="ku"] .itpilha').innerText()), '(o aviso "acabaram")');
    // o editor: tornar a Katana de arremesso e voltar
    await P.locator('[data-itemed="ka"]').click(); await w(250);
    await P.locator('[data-itpilhaset="ka"]').fill('4'); await P.locator('[data-itpilhaset="ka"]').press('Tab'); await w(300);
    ok((await item('ka')).pilha === 4 && await P.locator('[data-itcard="ka"] .itpilha').count() === 1, 'o campo "Arremesso (quantos)" no editor faz uma pilha');
    if (await P.locator('[data-itpilhaset="ka"]').count() === 0) { await P.locator('[data-itemed="ka"]').click(); await w(250); }
    await P.locator('[data-itpilhaset="ka"]').fill(''); await P.locator('[data-itpilhaset="ka"]').press('Tab'); await w(300);
    ok((await item('ka')).pilha === undefined, 'vazio: deixa de ser de arremesso');
    if (process.env.FOTOS) await P.locator('[data-itcard="ku"]').screenshot({ path: process.env.FOTOS + '/l122-kunai.png' });
    ok(!erros.length, 'sem erros na página: ' + erros.join(' | '));
  } catch (e) { ok(false, 'falhou: ' + e.message.split('\n')[0]); }
  await t.close(); end();
})();
