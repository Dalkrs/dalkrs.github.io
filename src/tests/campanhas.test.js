// "Campanha em evidência" (TC.agruparPorCampanha): onde se escolhe um personagem, uma cena ou um mapa, o que é da
// campanha em vista vem primeiro, depois o que é do mundo e por fim o das outras campanhas. A mesma conta existe em
// dois lugares — tc/tc.js (a casca) e tc/ponte.js (os sistemas) —, e este teste roda a mesma tabela nas duas: cada
// uma tem de dar o esperado, e as duas têm de dar o mesmo. Sem rede: só a conta.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;

// (roda dentro da página; devolve, para cada caso, o que saiu)
function tabela() {
  const G = TC.agruparPorCampanha, out = [];
  const A = { id: 'ca', nome: 'Geração do Dain', encerrada: false }, B = { id: 'cb', nome: 'Geração da Lira', encerrada: false }, C = { id: 'cc', nome: 'Os Antigos', encerrada: true };
  const p = (nome, camp) => ({ nome, camp: camp || null });
  const de = x => x.camp;
  // (do resultado fica só o que importa conferir: de cada grupo, o id, o nome, se é o em evidência e os nomes dos itens)
  const caso = (nome, itens, vista, lista) => {
    let r;
    try { r = G(itens, de, vista, lista).map(g => [g.id, g.nome, g.vista, g.itens.map(x => x.nome)]); } catch (e) { r = 'ERRO: ' + e.message; }
    out.push({ nome, saiu: r });
  };
  const todos = [p('Dain', 'ca'), p('Lira', 'cb'), p('Mercador'), p('Bram', 'ca'), p('Velho', 'cc'), p('Guarda')];
  caso('sem campanhas e sem itens', [], null, []);
  caso('sem campanhas: um grupo só, sem nome', [p('Dain'), p('Lira')], null, []);
  caso('itens nulos', null, 'ca', [A, B]);
  caso('lista nula, itens sem campanha', [p('Dain')], null, null);
  caso('a campanha em vista primeiro, depois o mundo, depois as outras na ordem do mestre', todos, 'ca', [A, B, C]);
  caso('outra campanha em vista', todos, 'cb', [A, B, C]);
  caso('a ordem das outras é a da lista do mestre, não a dos itens', todos, 'ca', [C, B, A]);
  caso('campanha encerrada em vista', todos, 'cc', [A, B, C]);
  caso('sem campanha em vista (quem não participa de nenhuma): o mundo fica em evidência', [p('Mercador'), p('Guarda')], null, [A, B]);
  caso('sem campanha em vista, com itens de campanha', todos, null, [A, B, C]);
  caso('grupo sem ninguém não aparece', [p('Dain', 'ca'), p('Bram', 'ca')], 'ca', [A, B, C]);
  caso('só gente do mundo, com campanha em vista', [p('Mercador')], 'ca', [A, B]);
  caso('a campanha em vista sem ninguém: o mundo vem primeiro, mas não é "o em evidência"', [p('Mercador'), p('Lira', 'cb')], 'ca', [A, B]);
  caso('campanha que quem usa não vê (não está na lista): "Outra campanha", no fim', [p('Dain', 'ca'), p('Fantasma', 'zz'), p('Mercador')], 'ca', [A, B]);
  caso('duas campanhas desconhecidas: cada uma no seu grupo', [p('X', 'z1'), p('Y', 'z2'), p('Z', 'z1')], 'ca', [A]);
  caso('lista vazia, mas há itens com campanha', [p('Dain', 'ca'), p('Mercador')], null, []);
  caso('a campanha em vista não está na lista', [p('Dain', 'ca'), p('Mercador')], 'ca', [B]);
  caso('a ordem dentro de cada grupo é a que veio', [p('3', 'ca'), p('1', 'ca'), p('b'), p('2', 'ca'), p('a')], 'ca', [A]);
  // quem chama não vê a lista dele mexida
  const meus = [p('Dain', 'ca'), p('Mercador')], antes = JSON.stringify(meus), camps = [A, B], campsAntes = JSON.stringify(camps);
  const g = G(meus, de, 'ca', camps);
  g[0].itens.push(p('intruso'));
  out.push({ nome: 'não mexe no que recebeu', saiu: [JSON.stringify(meus) === antes, JSON.stringify(camps) === campsAntes, G(meus, de, 'ca', camps)[0].itens.length] });
  // sem campanhas, o grupo único é uma cópia da lista (mexer nele não mexe na de quem chamou)
  const simples = [p('Dain')], gs = G(simples, de, null, []);
  gs[0].itens.push(p('intruso'));
  out.push({ nome: 'sem campanhas: o grupo é uma cópia', saiu: simples.length });
  return out;
}

const ESPERADO = {
  'sem campanhas e sem itens': [],
  'sem campanhas: um grupo só, sem nome': [['', '', true, ['Dain', 'Lira']]],
  'itens nulos': [],
  'lista nula, itens sem campanha': [['', '', true, ['Dain']]],
  'a campanha em vista primeiro, depois o mundo, depois as outras na ordem do mestre': [['ca', 'Geração do Dain', true, ['Dain', 'Bram']], ['', 'Do mundo', false, ['Mercador', 'Guarda']], ['cb', 'Geração da Lira', false, ['Lira']], ['cc', 'Os Antigos (encerrada)', false, ['Velho']]],
  'outra campanha em vista': [['cb', 'Geração da Lira', true, ['Lira']], ['', 'Do mundo', false, ['Mercador', 'Guarda']], ['ca', 'Geração do Dain', false, ['Dain', 'Bram']], ['cc', 'Os Antigos (encerrada)', false, ['Velho']]],
  'a ordem das outras é a da lista do mestre, não a dos itens': [['ca', 'Geração do Dain', true, ['Dain', 'Bram']], ['', 'Do mundo', false, ['Mercador', 'Guarda']], ['cc', 'Os Antigos (encerrada)', false, ['Velho']], ['cb', 'Geração da Lira', false, ['Lira']]],
  'campanha encerrada em vista': [['cc', 'Os Antigos (encerrada)', true, ['Velho']], ['', 'Do mundo', false, ['Mercador', 'Guarda']], ['ca', 'Geração do Dain', false, ['Dain', 'Bram']], ['cb', 'Geração da Lira', false, ['Lira']]],
  'sem campanha em vista (quem não participa de nenhuma): o mundo fica em evidência': [['', 'Do mundo', true, ['Mercador', 'Guarda']]],
  'sem campanha em vista, com itens de campanha': [['', 'Do mundo', true, ['Mercador', 'Guarda']], ['ca', 'Geração do Dain', false, ['Dain', 'Bram']], ['cb', 'Geração da Lira', false, ['Lira']], ['cc', 'Os Antigos (encerrada)', false, ['Velho']]],
  'grupo sem ninguém não aparece': [['ca', 'Geração do Dain', true, ['Dain', 'Bram']]],
  'só gente do mundo, com campanha em vista': [['', 'Do mundo', false, ['Mercador']]],
  'a campanha em vista sem ninguém: o mundo vem primeiro, mas não é "o em evidência"': [['', 'Do mundo', false, ['Mercador']], ['cb', 'Geração da Lira', false, ['Lira']]],
  'campanha que quem usa não vê (não está na lista): "Outra campanha", no fim': [['ca', 'Geração do Dain', true, ['Dain']], ['', 'Do mundo', false, ['Mercador']], ['zz', 'Outra campanha', false, ['Fantasma']]],
  'duas campanhas desconhecidas: cada uma no seu grupo': [['z1', 'Outra campanha', false, ['X', 'Z']], ['z2', 'Outra campanha', false, ['Y']]],
  'lista vazia, mas há itens com campanha': [['', 'Do mundo', true, ['Mercador']], ['ca', 'Outra campanha', false, ['Dain']]],
  'a campanha em vista não está na lista': [['ca', 'Outra campanha', true, ['Dain']], ['', 'Do mundo', false, ['Mercador']]],
  'a ordem dentro de cada grupo é a que veio': [['ca', 'Geração do Dain', true, ['3', '1', '2']], ['', 'Do mundo', false, ['b', 'a']]],
  'não mexe no que recebeu': [true, true, 1],
  'sem campanhas: o grupo é uma cópia': 1,
};

(async () => {
  const t = await start();
  // a da casca (tc/tc.js)
  const { page: casca } = await t.device({ name: 'casca' });
  await casca.goto(t.base, { waitUntil: 'load' });
  await casca.waitForFunction(() => window.TC && typeof TC.agruparPorCampanha === 'function' && !!TC.mesas, null, { timeout: 15000 });
  const daCasca = await casca.evaluate(tabela);
  // a dos sistemas (tc/ponte.js), numa página que só tem a ponte
  const { page: sistema } = await t.device({ name: 'sistema' });
  await sistema.goto(t.base + 'src/tests/vazio.html', { waitUntil: 'load' });
  await sistema.addScriptTag({ url: '/tc/ponte.js' });
  await sistema.waitForFunction(() => window.TC && typeof TC.agruparPorCampanha === 'function' && !!TC.ponte, null, { timeout: 15000 });
  ok(await sistema.evaluate(() => !TC.mesas), 'a página dos sistemas tem só a ponte (não é a conta da casca)');
  const daPonte = await sistema.evaluate(tabela);

  ok(daCasca.length === Object.keys(ESPERADO).length && daPonte.length === daCasca.length, 'a tabela inteira rodou nos dois lugares: ' + daCasca.length + ' casos');
  for (let i = 0; i < daCasca.length; i++) {
    const c = daCasca[i], p = daPonte[i] || {}, esp = ESPERADO[c.nome];
    ok(esp !== undefined && j(c.saiu) === j(esp), 'casca · ' + c.nome + (j(c.saiu) === j(esp) ? '' : ' — saiu ' + j(c.saiu) + ', esperado ' + j(esp)));
    ok(p.nome === c.nome && j(p.saiu) === j(esp), 'ponte · ' + c.nome + (j(p.saiu) === j(esp) ? '' : ' — saiu ' + j(p.saiu) + ', esperado ' + j(esp)));
  }
  // a ponte também serve a conta já com a campanha em vista e as campanhas de quem usa (aqui: fora de uma mesa)
  const soPonte = await sistema.evaluate(() => {
    const p = TC.ponte;
    return { vazio: JSON.stringify(p.porCampanha([{ n: 1 }], () => null)), camp: p.estado.campanha, camps: p.estado.campanhas.length, tem: p.estado.temCampanhas };
  });
  ok(soPonte.vazio === j([{ id: '', nome: '', vista: true, itens: [{ n: 1 }] }]) && soPonte.camp === null && soPonte.camps === 0 && soPonte.tem === false, 'fora de uma mesa a ponte não tem campanha em vista nem campanha nenhuma, e a lista vem num grupo só');

  if (t.errs.length) console.log('CONSOLE:\n' + t.errs.join('\n'));
  ok(t.errs.length === 0, 'nenhum erro (nem aviso) no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
