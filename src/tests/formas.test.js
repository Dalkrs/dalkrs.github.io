const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = Object.assign(R.personagemPadrao('Lupa'), { id: 'pc_l', nome: 'Lupa', skills: { arvores: ['a_lobisomem'], pontos: {}, alocados: { n_lobisomem_f1: 1 } } });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_l', selSit: null, aba: 'fichas', grupos: [] });
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'formas', w: 1300, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await P.waitForTimeout(1200);
  // a biblioteca da mesa (aqui, fora de uma mesa: só a árvore do Lobisomem, a das formas)
  const lobo = require('fs').existsSync('/home/claude/forja/saida.json') ? require('/home/claude/forja/saida.json').find(a => a.id === 'a_lobisomem') : { id: 'a_lobisomem', nome: 'Lobisomem', nodes: [{ id: 'n_lobisomem_f1', nome: 'Transformar', graus: [{ texto: 'Vira lobo por 3 turnos.' }] }] };
  await P.evaluate(a => { S.bib = Object.assign({}, S.bib || {}, { arvores: [a] }); render(); }, lobo); await P.waitForTimeout(300);
  ok((await P.evaluate(() => FichasFormas.lista(S.personagens[0]).map(f => f.id))).includes('n_lobisomem_f1'), 'Transformar (Lobisomem) é uma forma');
  await P.locator('[data-abaficha="skills"]').click(); await P.waitForTimeout(300);
  ok(await P.locator('#painelFormas').count() === 1, 'o painel Formas aparece');
  await P.locator('[data-fmup]').first().setInputFiles({ name: 'l.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }); await P.waitForTimeout(600);
  ok(await P.evaluate(() => !!(S.personagens[0].formas && S.personagens[0].formas.n_lobisomem_f1)), 'a imagem foi guardada na ficha');
  ok(await P.locator('#painelFormas img').count() === 1, 'a miniatura aparece');
  await P.locator('#painelFormas').screenshot({ path: '/tmp/fotos/formas.png' });
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
