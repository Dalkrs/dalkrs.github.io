// Oficina, lote 34, sem mesa: a barra da raça, da classe e da linhagem na própria árvore.
//   · a árvore de classe mostra a barra (do guia de barras, pelo id): nome, faixa, início, o começo do combate, o fim, o
//     teto, como enche, a observação; mudar um campo guarda na árvore (a.barraDef), "Voltar ao guia" desfaz;
//   · "Esta árvore não cria barra";
//   · no grau, "Soma ao início" vem lido do texto ("+1 de Preparo inicial"); o número posto vale; vazio volta ao texto;
//   · a árvore de outra categoria continua com o nome da barra especial.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const no = (id, nome, pais, extra) => Object.assign({ id, pais, regra: 'e', nome, tipo: 'notavel', forma: 'circulo', glifo: '', cor: '', natureza: '', usos: [], desc: '', exclusivo: '', escola: null, graus: [{ custos: { p1: 1 }, texto: '' }] }, extra);
const doc = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4,
  biblioteca: { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }], naturezas: [], usos: [{ id: 'ativa', nome: 'Ativa', sigla: 'At' }],
    tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
    arvores: [
      { id: 'ae54tu1fze', nome: 'Mago', categoria: 'classe', secreta: false, senha: '', nodes: [
        no('n_raiz', 'Caminho do Grimório', [], { tipo: 'keystone', forma: 'hexagono', graus: [{ custos: {}, texto: '' }], desc: 'O mago…\n\nPreparo (barra): máximo 20; começa em 0 e volta a 0 no fim do combate.' }),
        no('n_ini', 'Mente Desperta', ['n_raiz'], { desc: 'Começa o combate com Preparo.', graus: [{ custos: { p1: 1 }, texto: '+1 de Preparo inicial' }, { custos: { p1: 1 }, texto: '+2 de Preparo inicial' }, { custos: { p1: 1 }, texto: '+4 de Preparo inicial' }] })] },
      { id: 'a_outra', nome: 'Pacto Antigo', categoria: 'outra', secreta: false, senha: '', nodes: [no('o1', 'Pacto', [], { desc: 'Cargas: máximo 3.' })] }], cofres: [] },
  personagens: [] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'arvore34', w: 1400, h: 950, seed: { 'urgm.arvore.v4': doc, 'urgm.arvore.ui.v4': JSON.stringify({ modo: 'mestre', tema: 'pedra', arvoreMestre: 'ae54tu1fze' }) } });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const foto = async nome => { if (process.env.FOTOS) await P.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const arv = id => E(id => JSON.parse(JSON.stringify(bib().arvores.find(a => a.id === id))), id);
  await P.goto(t.base + 'arvore/', { waitUntil: 'load' }); await w(900);

  await passo('a barra da classe', async () => {
    await E(() => { selecionado = 'n_raiz'; pintarPainel(); desenhar(); }); await w(300);
    const g = P.locator('#grupoBarraArv');
    const txt = (await g.innerText()).replace(/\s+/g, ' ');
    ok(/Barra da classe/.test(txt) && /Do guia de barras \(28\/10\)\./.test(txt), 'a árvore de classe mostra a barra, do guia — ' + txt.slice(0, 200));
    const v = await E(() => ['#abNome', '#abMin', '#abMax', '#abIni', '#abFim', '#abTeto', '#abEnche'].map(s => document.querySelector(s).value));
    ok(v[0] === 'Preparo' && v[1] === '0' && v[2] === '20' && v[3] === '0' && v[4] === 'zera' && v[5] === '6' && /No começo do turno \+3/.test(v[6]), 'os campos vêm do guia: Preparo, 0 a 20, início 0, zera, teto 6 — ' + j(v.slice(0, 6)));
    ok(await P.locator('#grupoBarraArv [data-abcomb="inicio"][aria-pressed="true"]').count() === 1 && await P.locator('#aBarra').count() === 0, '"Vai para o início" marcado; o campo da barra especial some');
    ok(!(await arv('ae54tu1fze')).barraDef, '(nada guardado na árvore ainda)');
    await g.scrollIntoViewIfNeeded(); await foto('l34-oficina-barra');
    await P.locator('#abMax').fill('25'); await P.locator('#abMax').press('Tab'); await w(300);
    const a = await arv('ae54tu1fze');
    ok(a.barraDef && a.barraDef.max === 25 && a.barraDef.nome === 'Preparo' && a.barraDef.inicio === 0, 'mudar o máximo guarda a barra na árvore (máximo 25) — ' + j(a.barraDef));
    ok(/Mudada aqui \(o guia de barras diz Preparo, 0 a 20, começa em 0\)/.test(await P.locator('#grupoBarraArv').innerText()), 'a nota diz que mudou (e o que o guia diz)');
    await P.locator('#grupoBarraArv [data-abcomb="pergunta"]').click(); await w(300);
    ok((await arv('ae54tu1fze')).barraDef.comb === 'pergunta', '"O mestre escolhe" guarda');
    await P.locator('#abGuia').click(); await w(300);
    ok(!(await arv('ae54tu1fze')).barraDef && await P.locator('#abMax').inputValue() === '20', '"Voltar ao guia" tira o que foi mudado');
    await E(() => desfazer()); await w(300);
    ok((await arv('ae54tu1fze')).barraDef.max === 25, 'o Desfazer devolve (máximo 25)');
    await P.locator('#abNenhuma').check(); await w(300);
    ok(j((await arv('ae54tu1fze')).barraDef) === j({ nenhuma: true }) && await P.locator('#abNome').isDisabled(), '"Esta árvore não cria barra": guardado, os campos param');
    await P.locator('#abNenhuma').uncheck(); await w(300);
    ok(!(await arv('ae54tu1fze')).barraDef, 'desmarcar volta ao guia');
  });
  await passo('o início no grau', async () => {
    await E(() => { selecionado = 'n_ini'; pintarPainel(); desenhar(); }); await w(300);
    const vals = await E(() => [...document.querySelectorAll('.gini')].map(i => i.value));
    const lidos = await E(() => [...document.querySelectorAll('.gini-l em')].map(e => e.textContent));
    ok(j(vals) === j(['1', '2', '4']) && lidos.every(x => x === 'lido do texto'), 'cada grau: "Soma ao início de Preparo", lido do texto (1, 2, 4) — ' + j(vals) + ' ' + j(lidos));
    await P.locator('.gini[data-g="2"]').scrollIntoViewIfNeeded(); await foto('l34-oficina-grau');
    await P.locator('.gini[data-g="2"]').fill('3'); await P.locator('.gini[data-g="2"]').press('Tab'); await w(300);
    ok(await E(() => porId.get('n_ini').graus[2].ini) === 3 && await P.locator('.gini-l em').nth(2).innerText() === 'posto aqui', 'o 3º grau com 3: guardado no grau ("posto aqui")');
    ok(await E(() => TC.rules.inicioDoGrau(porId.get('n_ini').graus[2])) === 3, '(as regras usam o número posto)');
    await P.locator('.gini[data-g="2"]').fill(''); await P.locator('.gini[data-g="2"]').press('Tab'); await w(300);
    ok(await E(() => !('ini' in porId.get('n_ini').graus[2])) && await P.locator('.gini[data-g="2"]').inputValue() === '4', 'vazio: volta ao texto (4)');
  });
  await passo('a árvore de outra categoria', async () => {
    await E(() => { ui.arvoreMestre = 'a_outra'; pintarTudo(); }); await w(400);
    ok(await P.locator('#aBarra').count() === 1 && await P.locator('#grupoBarraArv').count() === 0 && await P.locator('.gini').count() === 0, 'continua com o nome da barra especial (e sem o início nos graus)');
  });
  const errs = t.errs.filter(e => !/favicon/i.test(e));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  ok(errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
