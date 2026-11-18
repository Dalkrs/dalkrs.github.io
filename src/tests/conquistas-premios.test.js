// (lote 184) Os prêmios das conquistas na ficha: os pontos que vieram de conquistas (a coluna conq, que o banco calcula)
// somam no que sobra para gastar, aparecem com a origem e ficam fora do total digitado; o título escolhido entre os das
// conquistas aparece embaixo do nome. (Sem mesa: a coluna vem pronta no personagem guardado neste navegador.)
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const conq = { pontos: { pc: 2 }, origem: [{ c: 'cq_fantasma', nome: 'Fantasma', pool: 'pc', n: 1 }, { c: 'cq_um_de_nos', nome: 'Um de Nós', pool: 'pc', n: 1 }],
  titulos: [{ c: 'cq_sem_rosto', nome: 'Sem Rosto', v: 'Sem Rosto' }, { c: 'cq_ranking', nome: 'Nome no Ranking', v: 'Aventureiro Famoso' }] };
const pc = (id, nome, extra) => Object.assign({ id, nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'E', DES: 'C', AGI: 'B', VIT: 'D', CAN: 'A' }, pctProprio: null, poderes: [],
  skills: { arvores: ['a1'], pontos: { pr: 2, pc: 3 }, alocados: { n1: 1 } }, defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 0, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens: [], recursos: [{ id: 'hp', nome: 'HP', fml: '100' }], notas: '' }, extra);
const bib = { nome: 'Teste', pools: [{ id: 'pr', nome: 'Raça', cor: '#4E8C7D', padrao: 0 }, { id: 'pc', nome: 'Classe', cor: '#D9A441', padrao: 0 }], naturezas: [], usos: [], tipos: { pequeno: { nome: 'Pequeno', custo: 1 } },
  arvores: [{ id: 'a1', nome: 'Humano', categoria: 'raca', nodes: [{ id: 'n1', nome: 'Versátil', pais: [], usos: [], graus: [{ custos: { pr: 2 }, texto: 'x' }] }] },
    { id: 'a2', nome: 'Ladrão', categoria: 'classe', nodes: [{ id: 'n2', nome: 'Mão leve', pais: [], usos: [], graus: [{ custos: { pc: 5 }, texto: 'y' }] }] }] };
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_dain', 'Dain', { modoAtr: 'livre', atrLivre: { FOR: 5, DES: 12, VIT: 8, CAN: 14, AGI: 10 }, _conq: conq, skills: { arvores: ['a1', 'a2'], pontos: { pr: 2, pc: 3 }, alocados: { n1: 1 } } }), pc('pc_npc', 'Guarda')],
  situacoes: [], tabelas: [], log: [], bib, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'conquistas-premios', w: 1320, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  ok(await P.locator('#f_nome').inputValue() === 'Dain', 'a ficha abre');

  // ---------- o título ----------
  ok(await P.locator('#f_titulo option').count() === 3, 'o seletor de título tem "Sem título" e os 2 títulos das conquistas');
  ok(await P.locator('.rstit').count() === 0, 'sem título escolhido, nada embaixo do nome');
  await P.locator('#f_titulo').selectOption('Sem Rosto'); await w(300);
  ok((await P.locator('.rstit').innerText()) === '“Sem Rosto”', 'o título escolhido aparece embaixo do nome');
  ok(await P.evaluate(() => S.personagens.find(x => x.id === 'pc_dain').titulo) === 'Sem Rosto', 'e fica guardado na ficha');
  ok(await P.evaluate(() => { const p = S.personagens.find(x => x.id === 'pc_npc'); return document.querySelectorAll('#f_titulo').length === 1 && !(p._conq); }), 'o NPC não tem conquistas');

  // ---------- os pontos ----------
  ok(await P.evaluate(() => restantesPool(S.personagens.find(x => x.id === 'pc_dain'), 'pc')) === 5, 'Classe: 3 da ficha + 2 de conquistas = 5 para gastar');
  await P.locator('[data-abaficha="skills"]').click(); await w(400);
  const selo = await P.locator('.conq-pts').first().innerText().catch(() => '');
  ok(/\+2 de conquistas \(Fantasma \+1, Um de Nós \+1\)/.test(selo), 'a origem dos pontos aparece: ' + selo);
  ok(await P.locator('[data-asctot="pc"]').inputValue().catch(() => null) === '3' || await P.locator('[data-skpontos="pc"]').inputValue().catch(() => null) === '3', 'o total digitado continua 3 (os de conquista ficam fora)');
  await P.screenshot({ path: __dirname + '/_conquistas-premios.png' });
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
