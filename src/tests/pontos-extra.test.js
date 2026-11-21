// (lote 198) Os pontos de cada tipo em três partes, separadas: nível (o que respeita o teto), extraordinário (o mestre
// dá, com o motivo; uma linha por vez) e conquista. Fora da mesa, quem abre a ficha é o mestre de si mesmo.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = (id, nome) => ({ id, nome, raca: 'Elfa', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'E', DES: 'C', AGI: 'B', VIT: 'D', CAN: 'A' }, poderes: [],
  skills: { arvores: ['a1'], pontos: { pr: 4 }, alocados: { n1: 1 } }, defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 0, fonte: 'total' }, habilidades: [], itens: [], recursos: [{ id: 'hp', nome: 'HP', fml: '100' }], notas: '' });
const bib = { nome: 'Teste', pools: [{ id: 'pr', nome: 'Raça', cor: '#4E8C7D', padrao: 2, porNivel: 1 }], naturezas: [], usos: [], tipos: { pequeno: { nome: 'Pequeno', custo: 1 } },
  arvores: [{ id: 'a1', nome: 'Elfa', categoria: 'raca', nodes: [{ id: 'n1', nome: 'Sangue frio', pais: [], usos: [], graus: [{ custos: { pr: 2 }, texto: 'x' }] }] }] };
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_sel', 'Selene')], situacoes: [], tabelas: [], log: [], bib, sel: 'pc_sel' });
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'extra', w: 1320, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const sel = () => P.evaluate(() => JSON.parse(JSON.stringify(S.personagens.find(x => x.id === 'pc_sel'))));
  const txt = async s => (await P.locator(s).innerText()).replace(/\s+/g, ' ').trim();
  ok(R.extraDoTipo({ extra: [{ pid: 'pr', n: 3 }, { pid: 'pr', n: -1 }, { pid: 'pc', n: 9 }, { pid: 'pr', n: 'x' }] }, 'pr') === 2, 'a soma do tipo ignora o que não é número e os outros tipos');
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  await P.locator('[data-abaficha="skills"]').click(); await w(200);
  ok(await txt('#painelAsc [data-asc="pr"] [data-asctotal="pr"]') === 'Total 4 · 2 gastos · 2 livres', 'antes: nível 4, total 4');
  ok(await txt('#painelAsc [data-ascx="pr"] .ascval') === '0' && await txt('#painelAsc [data-ascc="pr"] .ascval') === '0', 'extraordinário 0 e conquista 0, à vista');
  // dar 3 extraordinários sem motivo: não dá
  await P.locator('[data-ascxabre="pr"]').click(); await w(150);
  await P.locator('[data-ascxn="pr"]').fill('3'); await P.locator('[data-ascxok="pr"]').click(); await w(200);
  ok(!(await sel()).skills.extra, 'sem motivo, não grava');
  await P.locator('[data-ascxm="pr"]').fill('Salvou a vila do dragão'); await P.locator('[data-ascxm="pr"]').press('Enter'); await w(300);
  const s1 = await sel();
  ok(s1.skills.extra && s1.skills.extra.length === 1 && s1.skills.extra[0].n === 3 && s1.skills.extra[0].motivo === 'Salvou a vila do dragão' && s1.skills.pontos.pr === 4, 'grava a linha (3, com o motivo e a data) e o nível não muda — ' + JSON.stringify(s1.skills));
  ok(await txt('#painelAsc [data-ascx="pr"] .ascval') === '+3' && await txt('#painelAsc [data-asctotal="pr"]') === 'Total 7 · 2 gastos · 5 livres', 'extraordinário +3; total 7, 5 livres');
  ok(/Salvou a vila do dragão/.test(await txt('#painelAsc .ascxlista')), 'a lista mostra o motivo');
  ok(/4 de 4/.test(await txt('#painelAsc [data-teto="pr"]')), 'o teto conta só o nível (4 de 4, no nível 3)');
  // na aba Skills, o cartão do tipo também
  ok(/\+3 extraordinários/.test(await txt('.poolcard')) && /5 livres/.test(await txt('.poolcard')), 'o cartão da aba Skills mostra +3 extraordinários e 5 livres');
  // tirar a linha, e desfazer
  await P.locator('[data-ascxtira]').click(); await w(300);
  ok(!((await sel()).skills.extra || []).length, 'tira a linha');
  await P.locator('.toast.comacao button').click(); await w(300);
  ok(((await sel()).skills.extra || []).length === 1, 'e o Desfazer devolve');
  if (process.env.FOTO) await P.locator('#painelAsc').screenshot({ path: process.env.FOTO });
  // o quadro da mesa só aparece na mesa (aqui não)
  ok(await P.locator('[data-ascquadro]').count() === 0, 'fora da mesa, sem Quadro da mesa');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
