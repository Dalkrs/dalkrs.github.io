// Árvore de Habilidades, lote 27, sem mesa: as habilidades citadas viram links.
//   · no painel do jogador: os requisitos ("Exige …") e os nomes de outros nódulos escritos no texto levam até eles,
//     também em outra árvore equipada; o "← Voltar" desfaz o pulo;
//   · no editor do mestre: os requisitos e uma linha "Cita:" com o que o texto cita;
//   · quem joga não ganha link para o que não pode ver (o caminho trancado, a árvore que não tem equipada).
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const mk = (id, pais, nome, desc, o) => Object.assign({ id, pais, regra: 'e', nome, tipo: 'pequeno', forma: 'circulo', glifo: '', cor: '', natureza: '', usos: [], desc: desc || '', exclusivo: '', escola: null, graus: [{ custos: { p1: 1 }, texto: '' }] }, o || {});
const arvores = [
  { id: 'aA', nome: 'Samurai', categoria: 'classe', secreta: false, senha: '', nodes: [
    mk('r', [], 'Caminho da Lâmina', '', { tipo: 'keystone', graus: [{ custos: {}, texto: '' }] }),
    mk('b', ['r'], 'Casca de Cedro', 'A casca protege.'),
    mk('c', ['b'], 'Golpe Firme', 'Com a Casca de Cedro, o golpe pesa. Combina com o Passo do Vento, da outra árvore, e com o Segredo Fundo.'),
    mk('t', ['r'], 'Segredo Fundo', 'Só para quem o mestre abrir.', { tranca: true }),
    mk('x', ['r'], 'Fio', 'Nome curto: não vira link (Fio).') ] },
  { id: 'aB', nome: 'Kitsune Ayto', categoria: 'raca', secreta: false, senha: '', nodes: [
    mk('r2', [], 'Origem Ayto', '', { tipo: 'keystone', graus: [{ custos: {}, texto: '' }] }),
    mk('v', ['r2'], 'Passo do Vento', 'Leve como o vento.') ] },
  { id: 'aC', nome: 'Mago', categoria: 'classe', secreta: false, senha: '', nodes: [
    mk('r3', [], 'Círculo Mágico', 'Também aparece o Golpe Firme aqui.', { tipo: 'keystone', graus: [{ custos: {}, texto: '' }] }) ] },
];
const doc = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4,
  biblioteca: { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }], naturezas: [], usos: [],
    tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
    arvores, cofres: [] },
  personagens: [{ id: 'c_dain', nome: 'Dain', arvores: ['aA', 'aB'], arvoreAtual: 'aA', pontos: { p1: 20 }, alocados: {}, ordemLivre: true }] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'arvore27', w: 1400, h: 900, seed: { 'urgm.arvore.v4': doc, 'urgm.arvore.ui.v4': JSON.stringify({ modo: 'jogador', tema: 'pedra', arvoreMestre: 'aA', personagem: 'c_dain' }) } });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const links = sel => E(s => [...document.querySelectorAll(s + ' a.lk-no')].map(a => a.textContent + '>' + a.dataset.no), sel);
  await P.goto(t.base + 'arvore/', { waitUntil: 'load' }); await w(900);

  await passo('o jogador: links no texto e nos requisitos', async () => {
    await E(() => { selecionado = 'c'; desenhar(); pintarPainel(); }); await w(150);
    ok(j(await links('#descJog')) === j(['Casca de Cedro>b', 'Passo do Vento>v']), 'o texto: os nomes viram links, também o da outra árvore equipada; o trancado fica texto — ' + j(await links('#descJog')));
    ok(j(await links('#painel .acento')) === j(['Casca de Cedro>b']), 'o "Exige": o requisito é um link');
    await P.locator('#descJog a.lk-no', { hasText: 'Passo do Vento' }).click(); await w(300);
    ok(await E(() => arvoreVisivel().id + '/' + selecionado) === 'aB/v', 'clicar vai até a habilidade, na outra árvore');
    ok(await P.locator('#btVoltarNo').isVisible() && /Golpe Firme/.test(await P.locator('#btVoltarNo').innerText()), 'aparece o "← Voltar para “Golpe Firme”"');
    await P.locator('#btVoltarNo').click(); await w(300);
    ok(await E(() => arvoreVisivel().id + '/' + selecionado) === 'aA/c' && !(await P.locator('#btVoltarNo').isVisible()), 'Voltar: de volta, e o botão some');
    await E(() => { selecionado = 'x'; desenhar(); pintarPainel(); }); await w(100);
    ok((await links('#descJog')).length === 0, 'nome com menos de 4 letras e o próprio nome não viram link');
  });

  await passo('o mestre', async () => {
    await E(() => trocarModo('mestre')); await w(300);
    await E(() => { ui.arvoreMestre = 'aC'; selecionado = 'r3'; pintarTudo(); }); await w(200);
    ok(j(await links('#painel .citados')) === j(['Golpe Firme>c']), 'o editor: "Cita:" com o link (em outra árvore — o mestre vê tudo)');
    await P.locator('#painel .citados a.lk-no').click(); await w(300);
    ok(await E(() => ui.arvoreMestre + '/' + selecionado) === 'aA/c', 'clicar vai até ela');
    ok(j(await links('#painel .pre')) === j(['Casca de Cedro>b']), 'os requisitos do editor também são links');
    ok(j(await links('#painel .citados')).includes('Segredo Fundo>t'), 'o mestre também tem link para o caminho trancado');
  });

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
