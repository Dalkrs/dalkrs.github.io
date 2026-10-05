// Árvore de Habilidades sem mesa (tudo neste navegador): o tipo de ponto de cada árvore vem da categoria dela.
// Árvore de Raça gasta pontos de "Raça"; de Classe, pontos de "Classe"; as outras, o primeiro tipo da lista.
const { start, checker } = require('./lib');
const { ok, end } = checker();
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'arvore' });
  const w = ms => P.waitForTimeout(ms);
  await P.goto(t.base + 'arvore/', { waitUntil: 'load' }); await w(1500);
  const E = fn => P.evaluate(fn);
  const pools = () => E(() => bib().pools.map(p => p.nome + ':' + p.padrao));
  const poolDaTela = () => E(() => { const a = arvoreVisivel(); return a ? [a.nome, a.categoria, poolPadrao(a).nome] : null; });
  // o custo de cada nódulo da árvore à mostra, com o NOME do tipo de ponto
  const custos = () => E(() => arvoreVisivel().nodes.map(n => n.nome + '=' + n.graus.map(g => Object.entries(g.custos).map(([k, v]) => v + ' ' + poolPorId(k).nome).join('+') || '0').join('/')));
  const novaArvore = async (nome, cat) => {
    await E(() => { novaArvore(); }); await w(250);
    await P.locator('#dlgc0').fill(nome); await P.locator('#dlg .chip[data-v="' + cat + '"]').click(); await P.locator('#dlg .rodape .btn.ouro').click(); await w(350);
  };
  const novoNo = async () => { await E(() => { const a = arvoreVisivel(); criarNo(a.nodes[0].id); }); await w(200); };

  ok(await E(() => ui.modo) === 'mestre' && JSON.stringify(await pools()) === '["Pontos:20"]', 'a página abre no modo do mestre, com um tipo de ponto só: ' + JSON.stringify(await pools()));
  ok(JSON.stringify(await poolDaTela()) === '["Árvore de exemplo","classe","Pontos"]', 'a árvore que já existia continua gastando o tipo de ponto de sempre: ' + JSON.stringify(await poolDaTela()));
  const antes = await custos();

  // ---------- árvore nova de Raça ----------
  await novaArvore('Humano', 'raca');
  ok(JSON.stringify(await pools()) === '["Pontos:20","Raça:0"]', 'criar uma árvore de Raça cria o tipo de ponto "Raça", começando em 0: ' + JSON.stringify(await pools()));
  ok(JSON.stringify(await poolDaTela()) === '["Humano","raca","Raça"]', 'e a árvore passa a gastar pontos de Raça');
  ok(/Raça/.test(await P.locator('#dica').innerText()), 'um aviso diz isso: ' + await P.locator('#dica').innerText());
  ok(await E(() => { const id = bib().pools.find(p => p.nome === 'Raça').id; return doc.personagens.every(p => p.pontos[id] === 0); }), 'cada personagem começa com 0 pontos de Raça (é o mestre quem dá)');
  await novoNo();
  ok(JSON.stringify(await custos()) === '["Origem=0","Novo nódulo=1 Raça"]', 'um nódulo novo nessa árvore já vem custando pontos de Raça: ' + JSON.stringify(await custos()));
  await E(() => { const b = bib(); document.querySelectorAll('details.bloco').forEach(d => { d.open = true; }); });

  // ---------- árvore nova de Classe, e de Escola ----------
  await novaArvore('Monge', 'classe'); await novoNo();
  ok(JSON.stringify(await pools()) === '["Pontos:20","Raça:0","Classe:0"]' && JSON.stringify(await custos()) === '["Origem=0","Novo nódulo=1 Classe"]', 'árvore de Classe: tipo "Classe" criado, nódulo novo custa pontos de Classe: ' + JSON.stringify(await custos()));
  await novaArvore('Humano das colinas', 'raca'); await novoNo();
  ok(JSON.stringify(await pools()) === '["Pontos:20","Raça:0","Classe:0"]' && JSON.stringify(await custos()) === '["Origem=0","Novo nódulo=1 Raça"]', 'outra árvore de Raça usa o mesmo tipo "Raça" (não cria outro)');
  await novaArvore('Garça Branca', 'escola'); await novoNo();
  ok(JSON.stringify(await pools()) === '["Pontos:20","Raça:0","Classe:0"]' && JSON.stringify(await custos()) === '["Origem=0","Novo nódulo=1 Pontos"]', 'árvore de Escola continua no primeiro tipo da lista: ' + JSON.stringify(await custos()));

  // ---------- a árvore que já existia (Classe, custando "Pontos") ----------
  await E(() => { ui.arvoreMestre = bib().arvores[0].id; selecionado = null; pintarTudo(); }); await w(200);
  ok(JSON.stringify(await poolDaTela()) === '["Árvore de exemplo","classe","Classe"]' && JSON.stringify(await custos()) === JSON.stringify(antes), 'agora que existe o tipo "Classe", os nódulos NOVOS da árvore de classe antiga passam a usá-lo; os que já existiam não mudam de custo');
  // mudar a categoria dela para Raça: pergunta antes de trocar os custos já postos
  const mudarCategoria = async (cat, trocar) => {
    await E(() => { renomearArvore(); }); await w(250);
    await P.locator('#dlg .chip[data-v="' + cat + '"]').click(); await P.locator('#dlg .rodape .btn.ouro').click(); await w(300);
    const perguntou = await P.locator('#dlg h2').innerText().catch(() => '');
    if (/^Pontos de /.test(perguntou)) { await P.locator('#dlg .rodape .btn', { hasText: trocar ? 'Trocar os custos' : 'Cancelar' }).click(); await w(300); }
    return perguntou;
  };
  let p = await mudarCategoria('raca', false);
  ok(p === 'Pontos de Raça' && JSON.stringify(await poolDaTela()) === '["Árvore de exemplo","raca","Raça"]' && JSON.stringify(await custos()) === JSON.stringify(antes), 'mudar a categoria para Raça pergunta se troca os custos; recusando, a categoria muda e os custos ficam como estavam');
  await E(() => { desfazer(); }); await w(250);
  ok(JSON.stringify(await poolDaTela()) === '["Árvore de exemplo","classe","Classe"]', 'Ctrl+Z desfaz a mudança de categoria');
  p = await mudarCategoria('raca', true);
  const depois = await custos();
  ok(p === 'Pontos de Raça' && depois.join('|') === antes.join('|').replace(/ Pontos/g, ' Raça') && depois.some(x => / Raça/.test(x)), 'aceitando, os nódulos que gastavam "Pontos" passam a gastar "Raça", com os mesmos valores: ' + JSON.stringify(depois));
  await E(() => { desfazer(); }); await w(250);
  ok(JSON.stringify(await custos()) === JSON.stringify(antes) && JSON.stringify(await poolDaTela()) === '["Árvore de exemplo","classe","Classe"]', 'e Ctrl+Z devolve a categoria e os custos de antes');

  // ---------- desfazer a criação da árvore leva junto o tipo de ponto criado com ela ----------
  await E(() => { const b = bib(); b.pools = b.pools.filter(x => x.nome !== 'Classe'); b.arvores = b.arvores.filter(a => a.nome !== 'Monge'); doc.personagens.forEach(x => { for (const k in x.pontos) if (!b.pools.some(q => q.id === k)) delete x.pontos[k]; }); ui.arvoreMestre = b.arvores[0].id; salvar(); pintarTudo(); }); await w(200);
  await novaArvore('Guerreiro', 'classe');
  ok((await pools()).includes('Classe:0'), '(árvore de Classe criada de novo, com o tipo "Classe")');
  await E(() => { desfazer(); }); await w(250);
  ok(!(await pools()).some(x => x.startsWith('Classe')) && !(await E(() => bib().arvores.some(a => a.nome === 'Guerreiro'))), 'desfazer a criação da árvore desfaz também o tipo de ponto que nasceu com ela');

  // ---------- recarregar: tudo guardado ----------
  await w(600); await P.reload({ waitUntil: 'load' }); await w(1500);
  ok((await pools()).join() === 'Pontos:20,Raça:0' && await E(() => bib().arvores.map(a => a.nome + ':' + a.categoria).join()) === 'Árvore de exemplo:classe,Humano:raca,Humano das colinas:raca,Garça Branca:escola', 'depois de recarregar, os tipos de ponto e as árvores continuam lá: ' + await E(() => bib().arvores.map(a => a.nome + ':' + a.categoria).join()));

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
