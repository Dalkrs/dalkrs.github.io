// Árvore de Habilidades, lote 16, sem mesa (tudo neste navegador):
//   · a busca acha também pelo texto dos graus, e lista o que achou em todas as árvores: um clique leva até lá
//     (troca de árvore e escolhe o nódulo); Esc fecha; nada encontrado diz isso;
//   · o filtro dos tipos de uso (ativa, passiva…), ao lado das naturezas: apaga o que não é daquele tipo; "limpar";
//   · as skills únicas: no modo jogador, o bloco do personagem; "+ Skill única" (nome, o que faz, bônus, custo de uso,
//     tipo de uso), já aprendida; Editar; Apagar (pergunta antes); o Desfazer (↺) e o Refazer; o que não vale no custo
//     de uso é recusado com a explicação; a busca também acha as skills únicas do personagem.
// (Na mesa — o jogador vê as dele, só o mestre cria, a ficha mostra — é o lote16b.rede.test.js.)
const { start, checker } = require('./lib');
const { ok, end } = checker();
const no = (id, nome, pais, extra) => Object.assign({ id, pais, regra: 'e', nome, tipo: 'pequeno', forma: 'circulo', glifo: '', cor: '', natureza: '', usos: [], desc: '', exclusivo: '', escola: null, graus: [{ custos: { p1: 1 }, texto: '' }] }, extra);
const doc = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4,
  biblioteca: { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }], naturezas: [{ id: 'forca', nome: 'Força', cor: '#c0563b' }],
    usos: [{ id: 'passiva', nome: 'Passiva', sigla: 'Pa' }, { id: 'ativa', nome: 'Ativa', sigla: 'At' }],
    tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
    arvores: [
      { id: 'a_kit', nome: 'Kitsune Lunar', categoria: 'classe', secreta: false, senha: '', nodes: [
        no('n_origem', 'Origem', [], { tipo: 'keystone', forma: 'hexagono', graus: [{ custos: {}, texto: '' }] }),
        no('n_corpo', 'Corpo da Raposa', ['n_origem'], { usos: ['passiva'], natureza: 'forca' }),
        no('n_garra', 'Garra Lunar', ['n_origem'], { usos: ['ativa'], graus: [{ custos: { p1: 1 }, texto: '' }, { custos: { p1: 2 }, texto: '+{floor(CAN/2)} de gelo' }] })] },
      { id: 'a_monge', nome: 'Monge', categoria: 'classe', secreta: false, senha: '', nodes: [
        no('m_origem', 'Caminho', [], { tipo: 'keystone', graus: [{ custos: {}, texto: '' }] }),
        no('m_lanca', 'Lança de Gelo', ['m_origem'], { usos: ['ativa'], desc: 'Arremessa uma lança.' })] }], cofres: [] },
  personagens: [{ id: 'c_selene', nome: 'Selene', arvores: ['a_kit', 'a_monge'], arvoreAtual: 'a_kit', pontos: { p1: 20 }, alocados: {}, ordemLivre: true }] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'arvore16', w: 1400, h: 900, seed: { 'urgm.arvore.v4': doc, 'urgm.arvore.ui.v4': JSON.stringify({ modo: 'mestre', tema: 'pedra', arvoreMestre: 'a_kit' }) } });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const j = JSON.stringify;
  const foto = async (nome, alvo) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await (alvo || P).screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const apagados = () => E(() => [...document.querySelectorAll('#nos .no.apagado')].map(g => g.dataset.id).sort().join(','));
  const salvo = () => E(() => new Promise(r => setTimeout(() => r(JSON.parse(localStorage.getItem('urgm.arvore.v4'))), 450)));
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'arvore/', { waitUntil: 'load' }); await w(900);
  ok(await E(() => arvoreVisivel().id) === 'a_kit', '(a Kitsune Lunar à vista, no modo mestre)');

  await passo('a busca', async () => {
    await P.locator('#busca').fill('gelo'); await w(300);
    const itens = await P.locator('#buscaRes .br-item').evaluateAll(l => l.map(b => b.innerText.replace(/\s+/g, ' ').trim()));
    ok(await P.locator('#buscaRes').isVisible() && itens.length === 2 && /^Garra Lunar Kitsune Lunar · Ativa/.test(itens[0]) && /^Lança de Gelo Monge · Ativa/.test(itens[1]), 'buscando "gelo": a Garra (pelo texto do 2º grau, nesta árvore) e a Lança de Gelo (em outra), cada uma com a árvore e o tipo de uso: ' + j(itens));
    ok(/1 nesta árvore · 1 em outra/i.test(await P.locator('#buscaRes .br-topo').innerText()), 'em cima, quantas aqui e quantas em outras: ' + await P.locator('#buscaRes .br-topo').innerText());
    ok(await apagados() === 'n_corpo,n_origem', 'na árvore à vista, o que não bate fica apagado (como sempre)');
    await foto('l16-arvore-busca');
    await P.locator('#buscaRes [data-brno="m_lanca"]').click(); await w(400);
    ok(await E(() => arvoreVisivel().id) === 'a_monge' && await E(() => selecionado) === 'm_lanca' && await P.locator('#buscaRes').isHidden(), 'um clique na Lança: abre a árvore do Monge com a Lança escolhida, e a lista fecha');
    ok(/Lança de Gelo/.test(await P.locator('#painel').innerText()), '(o painel mostra a Lança)');
    await P.locator('#busca').focus(); await w(200);
    ok(await P.locator('#buscaRes').isVisible(), 'de volta à busca, a lista volta');
    await P.keyboard.press('Escape'); await w(150);
    ok(await P.locator('#buscaRes').isHidden(), 'Esc fecha a lista');
    await P.locator('#busca').fill('xyzw'); await w(250);
    ok(/Nada encontrado/i.test(await P.locator('#buscaRes').innerText()), 'nada encontrado: diz');
    await P.locator('#busca').fill(''); await w(250);
    ok(await P.locator('#buscaRes').isHidden() && await apagados() === '', 'busca vazia: sem lista, nada apagado');
  });

  await passo('o filtro dos tipos de uso', async () => {
    await E(() => trocarArvoreMestre('a_kit')); await w(300);
    const chips = await P.locator('#filtroNat .chip').evaluateAll(l => l.map(b => b.textContent.trim()));
    ok(j(chips) === j(['Força', 'Passiva', 'Ativa']), 'em cima da árvore, as naturezas e, depois de um traço, os tipos de uso que aparecem nela: ' + j(chips));
    await P.locator('#filtroNat [data-fuso="ativa"]').click(); await w(250);
    ok(await apagados() === 'n_corpo,n_origem' && (await P.locator('#filtroNat [data-fuso="ativa"]').getAttribute('aria-pressed')) === 'true', '"Ativa": só a Garra fica acesa');
    await P.locator('#filtroNat [data-fuso="passiva"]').click(); await w(250);
    ok(await apagados() === 'n_origem', '"Ativa" e "Passiva": a Garra e o Corpo');
    await P.locator('#busca').fill('garra'); await w(250);
    ok(j(await P.locator('#buscaRes .br-item').evaluateAll(l => l.map(b => b.dataset.brno))) === j(['n_garra']), 'a busca respeita o filtro');
    await P.locator('#busca').fill(''); await w(200);
    await P.locator('#filtroNat [data-flimpar]').click(); await w(250);
    ok(await apagados() === '' && await P.locator('#filtroNat [data-flimpar]').count() === 0, '"limpar" tira os filtros');
  });

  await passo('as skills únicas', async () => {
    await E(() => trocarModo('jogador')); await w(400);
    ok(await P.locator('#blocoUnicas').count() === 1 && /Nenhuma/.test(await P.locator('#blocoUnicas').innerText()) && await P.locator('#btUnica').count() === 1, 'no modo jogador, o personagem tem o bloco "Skills únicas" (sem mesa, quem usa a página cria)');
    await P.locator('#btUnica').click(); await w(300);
    const c = i => P.locator('#dlg [data-campo="' + i + '"]');
    ok(await P.locator('#dlg h2').innerText() === 'Nova skill única' && /Só de Selene: já vem aprendida/.test(await P.locator('#dlg').innerText()), 'a janela "Nova skill única" explica');
    await c(0).fill('Sangue do dragão'); await c(1).fill('Uma vez por cena, cura {VIT*2} de HP.');
    await c(2).fill('FOR +2, HP +10'); await c(3).fill('dez');
    await P.locator('#dlg [data-campo="4"] [data-v="ativa"]').click();
    await foto('l16-arvore-unica-janela', P.locator('#dlg'));
    await P.locator('#dlg .rodape .btn.ouro').click(); await w(200);
    ok(/O custo de uso fica assim: 10 SP, CAN\/2 Energia/.test(await P.locator('#dlgErro').innerText()) && await P.locator('#veuDlg.on').count() === 1, 'custo de uso que não dá para ler: recusa, com o jeito certo');
    await c(3).fill('10 SP, CAN/2 Energia');
    await P.locator('#dlg .rodape .btn.ouro').click(); await w(400);
    const u = await E(() => personagemAtual().unicas);
    ok(u && u.length === 1 && u[0].nome === 'Sangue do dragão' && j(u[0].bonus) === j({ FOR: 2, HP: 10 }) && j(u[0].uso) === j([{ b: 'SP', v: '10' }, { b: 'Energia', v: 'CAN/2' }]) && j(u[0].usos) === j(['ativa']) && /^u/.test(u[0].id), 'criada, com o bônus, o custo de uso e o tipo: ' + j(u));
    const card = (await P.locator('#blocoUnicas .unica').innerText()).replace(/\s+/g, ' ');
    ok(/Sangue do dragão/.test(card) && /ATIVA/i.test(card) && /Uma vez por cena, cura VIT\*2 de HP\./.test(card) && /Na ficha: FOR \+2, HP \+10/.test(card) && /Custo de uso: 10 SP · CAN\/2 Energia/.test(card), 'o cartão mostra tudo (sem mesa, a conta aparece escrita): ' + card);
    ok(/criada para Selene \(já aprendida\)/.test(await P.locator('#dica').innerText()), 'o aviso: ' + await P.locator('#dica').innerText());
    ok((await salvo()).personagens[0].unicas.length === 1, '(gravada neste navegador)');
    await foto('l16-arvore-unica', P.locator('#painel'));
    await E(() => desfazer()); await w(300);
    ok(!(await E(() => personagemAtual().unicas)) && /Nenhuma/.test(await P.locator('#blocoUnicas').innerText()), 'o Desfazer (↺) tira a skill');
    await E(() => refazer()); await w(300);
    ok((await E(() => personagemAtual().unicas)).length === 1, 'e o Refazer a devolve');
    // editar
    await P.locator('#blocoUnicas [data-unied]').click(); await w(300);
    ok(await c(0).inputValue() === 'Sangue do dragão' && await c(2).inputValue() === 'FOR +2, HP +10' && await c(3).inputValue() === '10 SP, CAN/2 Energia' && (await P.locator('#dlg [data-campo="4"] [data-v="ativa"]').getAttribute('aria-pressed')) === 'true', 'Editar abre com o que ela tem');
    await c(0).fill('Sangue do dragão ancestral'); await c(2).fill('');
    await P.locator('#dlg .rodape .btn.ouro').click(); await w(300);
    const u2 = (await E(() => personagemAtual().unicas))[0];
    ok(u2.nome === 'Sangue do dragão ancestral' && !u2.bonus && u2.id === u[0].id, 'salva: o nome novo, sem o bônus, o mesmo id');
    // a busca acha a skill única do personagem
    await P.locator('#busca').fill('dragao'); await w(300);
    ok(await P.locator('#buscaRes [data-brunica]').count() === 1 && /skill única/.test(await P.locator('#buscaRes').innerText()), 'a busca (sem acento) acha a skill única do personagem');
    await P.locator('#buscaRes [data-brunica]').click(); await w(200);
    ok(await P.locator('#blocoUnicas .unica.piscar').count() === 1, 'um clique leva até ela (o cartão pisca)');
    await P.locator('#busca').fill(''); await w(200);
    // apagar
    await P.locator('#blocoUnicas [data-unidel]').click(); await w(300);
    ok(/Apagar “Sangue do dragão ancestral” de Selene\?/.test(await P.locator('#dlg').innerText()), 'Apagar pergunta antes');
    await P.locator('#dlg .rodape .btn.ouro').click(); await w(300);
    ok(!(await E(() => personagemAtual().unicas)) && /apagada/.test(await P.locator('#dica').innerText()), 'apagada, com o aviso');
    await E(() => desfazer()); await w(300);
    ok((await E(() => personagemAtual().unicas)).length === 1, 'e o Desfazer a devolve');
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
