// (lote 212) A ficha diz de onde vem o que a árvore soma: no HP, na Vida da raça e nas marquinhas "árv." dos atributos.
const { start, checker } = require('./lib');
const { ok, end } = checker();
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fontes212', w: 1320, h: 1100 });
  const erros = []; P.on('pageerror', e => erros.push(String(e)));
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await P.waitForTimeout(1200);
  await P.evaluate(() => {
    S.bib = { arvores: [{ id: 'a_ayto', categoria: 'raca', nome: 'Kitsune Ayto', nodes: [
      { id: 'o', pais: [], nome: 'Origem: Kitsune Ayto', graus: [{ texto: '', bonus: { HP: 32, 'Vida por VIT': 1 } }] },
      { id: 'p', pais: ['o'], nome: 'Pele de Sombra', graus: [{ texto: '', bonus: { VIT: 2, HP: 5, ESQ: 1, DFF: 3 } }] }] }] };
    indexarArvores && indexarArvores();
    const p = personagemPadrao('Dain', '', 'C', 3); p.id = 'pc_d';
    p.skills = { arvores: ['a_ayto'], pontos: {}, alocados: { o: 1, p: 1 } };
    p.recursos = [{ id: 'hp', nome: 'HP', fml: '(VIT-VIT_EQ)*VIDAVIT' }];
    S.personagens = [p]; S.sel = 'pc_d'; S.aba = 'fichas'; render();
  });
  await P.waitForTimeout(500);
  const card = await P.evaluate(() => document.querySelector('[data-resfml="hp"]').closest('.rescard').innerText);
  ok(/Inclui \+37 da árvore: \+32 Origem: Kitsune Ayto \(Kitsune Ayto\) · \+5 Pele de Sombra \(Kitsune Ayto\)/.test(card), 'o HP diz de onde vem — ' + card.replace(/\n/g, ' | ').slice(0, 260));
  ok(/VIT × 1 \+ 32, da origem da árvore Kitsune Ayto/.test(card), 'a Vida da raça diz a árvore');
  ok(!/não usa o multiplicador/.test(card), 'fórmula padrão: sem aviso');
  const tt = await P.evaluate(() => [...document.querySelectorAll('.darv')].map(x => x.title));
  ok(tt.some(x => /Da árvore: \+2 Pele de Sombra \(Kitsune Ayto\)/.test(x)) && tt.some(x => /\+1 Pele de Sombra/.test(x)) && tt.some(x => /\+3 Pele de Sombra/.test(x)), 'atributo, derivado e defesa dizem de onde vem: ' + tt.join(' / '));
  await P.evaluate(() => document.querySelector('[data-resfml="hp"]').closest('.rescard').scrollIntoView({ block: 'center' }));
  await P.screenshot({ path: '/tmp/fontes-212.png' });
  ok(!erros.length, 'sem erro: ' + erros.slice(0, 2));
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
