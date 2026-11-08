// Lote 116: bolinhas ou barra no token (a escolha fica na ficha, barra por barra).
//   · a regra (TC.rules.estiloDaBarra): a escolha do dono; sem ela, raça em bolinhas, as outras das árvores em barra;
//     as barras soltas (HP, SP) sem escolha ficam com o token (null);
//   · na ficha: "No token: ●●● Bolinhas / ━━ Barra" em cada barra, com o padrão marcado; clicar escolhe; clicar no
//     escolhido volta ao padrão.
const { start, checker } = require('./lib');
const R = require('../../tc/rules.js');
const { ok, end } = checker();
ok(R.estiloDaBarra({ id: 'x', arvs: ['a'], cat: 'raca' }) === 'pts' && R.estiloDaBarra({ id: 'x', arvs: ['a'], cat: 'classe' }) === 'bar', 'o padrão: raça em bolinhas, classe em barra');
ok(R.estiloDaBarra({ id: 'x', arvs: ['a'], cat: 'raca', est: 'bar' }) === 'bar' && R.estiloDaBarra({ id: 'hp' }) === null && R.estiloDaBarra({ id: 'hp', est: 'pts' }) === 'pts', 'a escolha manda; o HP sem escolha: o token decide');
const est = R.estadoRecursos({ recursos: [{ id: 'hp', nome: 'HP' }, { id: 'det', nome: 'Determinação', arvs: ['a'], cat: 'raca' }] }, { recursos: [{ id: 'hp', max: 10 }, { id: 'det', max: 5 }] }, {});
ok(!('est' in est[0]) && est[1].est === 'pts', 'o estado da barra leva o jeito para as Cenas');

const pc = { id: 'pc_d', nome: 'Dain', raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 1, tiers: { FOR: 'E', DES: 'C', AGI: 'B', VIT: 'D', CAN: 'A' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 0, DFM: 0 }, rol: { fixa: 0, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '',
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'det', nome: 'Determinação', fml: '5', arvs: ['ahum'], cat: 'raca', comb: 'fica' }, { id: 'pos', nome: 'Postura', fml: '20', arvs: ['asam'], cat: 'classe', comb: 'inicio' }] };
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_d', selSit: null, aba: 'fichas', grupos: [] });
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas116', w: 1320, h: 960, seed: { urgm_calc_atributos_v1: estado } });
  P.setDefaultTimeout(8000);
  const w = ms => P.waitForTimeout(ms);
  const erros = []; P.on('pageerror', e => erros.push(String(e.message)));
  const rec = id => P.evaluate(i => JSON.parse(JSON.stringify(S.personagens[0].recursos.find(x => x.id === i))), id);
  const on = sel => P.locator(sel).getAttribute('aria-pressed');
  try {
    await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
    if (await P.locator('[data-resest="det|pts"]').count() === 0) { const a = P.locator('[data-abaficha="atributos"]'); if (await a.count()) { await a.click(); await w(250); } }
    ok(await on('[data-resest="det|pts"]') === 'true' && await on('[data-resest="pos|bar"]') === 'true', 'sem escolha: Determinação (raça) em bolinhas, Postura (classe) em barra');
    ok(await on('[data-resest="hp|pts"]') === 'false' && await on('[data-resest="hp|bar"]') === 'false', 'o HP sem escolha: nenhum aceso ("o token decide")');
    await P.locator('[data-resest="det|bar"]').click(); await w(250);
    ok((await rec('det')).est === 'bar' && await on('[data-resest="det|bar"]') === 'true', 'clicar em Barra: a Determinação fica em barra');
    await P.locator('[data-resest="det|bar"]').click(); await w(250);
    ok(!('est' in await rec('det')) && await on('[data-resest="det|pts"]') === 'true', 'clicar de novo: volta ao padrão (bolinhas)');
    await P.locator('[data-resest="pos|pts"]').click(); await w(250);
    ok((await rec('pos')).est === 'pts', 'a Postura em bolinhas');
    if (process.env.FOTOS) await P.locator('.rescard').nth(1).screenshot({ path: process.env.FOTOS + '/l116-ficha.png' });
  } catch (e) { ok(false, 'parou: ' + String(e.message).split('\n')[0]); }
  ok(!erros.length, 'sem erro na página: ' + erros.join(' | '));
  await t.close(); end();
})();
