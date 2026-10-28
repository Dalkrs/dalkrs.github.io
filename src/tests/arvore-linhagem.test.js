// Árvore de Habilidades, a categoria Linhagem (sem mesa), na Oficina e nas Fichas:
//   · a Linhagem logo depois de Raça: na lista de categorias de "Nova árvore" e de Renomear, e a aba Linhagens no
//     "Selecionar árvore" (vazia, diz como criar);
//   · a primeira árvore de Linhagem cria o tipo de ponto "Linhagem" (cada personagem começa com 0) e os nódulos dela
//     custam esses pontos; mudar uma árvore para Linhagem também;
//   · nas Fichas, a árvore de Linhagem aparece no grupo dela (entre Raça e Classe), e não vira "Outra".
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const R = require('../../tc/rules.js');
const no0 = k => ({ id: 'n' + k, pais: [], regra: 'e', nome: 'Origem', tipo: 'keystone', forma: 'hexagono', glifo: '', cor: '', natureza: '', usos: [], desc: '', exclusivo: '', escola: null, graus: [{ custos: {}, texto: '' }] });
const arvores = [{ id: 'a1', nome: 'Kitsune Ayto', categoria: 'raca', nodes: [no0(1)] }, { id: 'a2', nome: 'Mago', categoria: 'classe', nodes: [no0(2)] }, { id: 'a3', nome: 'Bênção de Selene', categoria: 'outra', nodes: [no0(3)] }]
  .map(a => Object.assign({ secreta: false, senha: '' }, a));
const doc = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4,
  biblioteca: { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }], naturezas: [], usos: [],
    tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
    arvores, cofres: [] },
  personagens: [{ id: 'c_dain', nome: 'Dain', arvores: [], arvoreAtual: null, pontos: { p1: 20 }, alocados: {}, ordemLivre: true }] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'linhagem', w: 1400, h: 900, seed: { 'urgm.arvore.v4': doc, 'urgm.arvore.ui.v4': JSON.stringify({ modo: 'mestre', tema: 'pedra', arvoreMestre: 'a2' }) } });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'arvore/', { waitUntil: 'load' }); await w(900);

  await passo('a aba', async () => {
    await P.keyboard.press('a'); await w(200);
    ok(j(await E(() => [...document.querySelectorAll('.sel-aba')].map(b => b.textContent))) === j(['Raças1', 'Linhagens0', 'Classes1', 'Escolas0', 'Profissões0', 'Outros1']), 'a aba Linhagens, logo depois de Raças');
    await P.locator('.sel-aba[data-cat="linhagem"]').click(); await w(120);
    ok(/Nenhuma árvore de Linhagem ainda/.test(await P.locator('#selCorpo').innerText()), 'vazia, diz como criar');
    await foto(P, 'arv-linhagem-aba');
  });
  await passo('a primeira árvore de Linhagem', async () => {
    await P.locator('#selNova').click(); await w(200);
    const cats = await E(() => [...document.querySelectorAll('#dlg .chips [data-v]')].map(b => b.dataset.v));
    ok(j(cats) === j(['raca', 'linhagem', 'classe', 'escola', 'profissao', 'outra']) && await E(() => document.querySelector('#dlg .chips').dataset.valor) === 'linhagem', 'a Nova árvore, aberta da aba Linhagens, já vem em Linhagem (a segunda da lista) — ' + j(cats));
    await P.locator('#dlg input.campo').first().fill('Linhagem do Dragão');
    await P.locator('#dlg button', { hasText: 'Criar árvore' }).click(); await w(300);
    const r = await E(() => { const b = bib(), a = b.arvores.find(x => x.nome === 'Linhagem do Dragão'), p = b.pools.find(x => x.nome === 'Linhagem'); return { cat: a && a.categoria, pool: p ? { cor: p.cor, padrao: p.padrao } : null, dain: p ? doc.personagens[0].pontos[p.id] : null, pad: p && poolPadrao(a) && poolPadrao(a).id === p.id }; });
    ok(r.cat === 'linhagem' && r.pool && r.pool.padrao === 0 && r.dain === 0 && r.pad, 'a árvore nasce em Linhagem, com o tipo de ponto “Linhagem” (0 para cada personagem), que é o dos nódulos dela — ' + j(r));
    ok(/custam pontos de “Linhagem”\. Criei o tipo de ponto “Linhagem”/.test(await E(() => document.body.innerText)), 'o aviso diz os dois');
  });
  await passo('mudar para Linhagem', async () => {
    await E(() => { ui.arvoreMestre = 'a3'; pintarTudo(); }); await w(200);
    await E(() => { renomearArvore(); }); await w(200);      // (sem esperar: ela espera a janela)
    await P.locator('#dlg .chips [data-v="linhagem"]').click(); await w(80);
    await P.locator('#dlg button', { hasText: 'Salvar' }).click(); await w(300);
    ok(await E(() => bib().arvores.find(x => x.id === 'a3').categoria) === 'linhagem' && await E(() => bib().pools.filter(x => x.nome === 'Linhagem').length) === 1, 'a Bênção vai para Linhagem pelo Renomear (o tipo de ponto não se repete)');
  });
  // as Fichas: o grupo das árvores equipadas
  const bibF = JSON.parse(doc).biblioteca;
  bibF.arvores.push({ id: 'a9', nome: 'Linhagem do Dragão', categoria: 'linhagem', secreta: false, senha: '', nodes: [no0(9)] });
  const pc = Object.assign(R.personagemPadrao('Dain'), { id: 'pc_dain', skills: { arvores: ['a9'], pontos: {}, alocados: {} } });
  const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib: bibF, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [], skillsUI: { equipar: true, distribuir: true } });
  const { page: F } = await t.device({ name: 'fichas-linhagem', w: 1300, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  await passo('as Fichas', async () => {
    await F.goto(t.base + 'fichas/', { waitUntil: 'load' }); await F.waitForTimeout(1200);
    await F.locator('#ficha [data-abaficha="skills"]').click(); await F.waitForTimeout(300);
    const grupos = await F.evaluate(() => [...document.querySelectorAll('.skcat')].map(c => c.querySelector('.eyebrow').textContent + ':' + [...c.querySelectorAll('.skchip span')].map(s => s.firstChild.textContent).join('/')));
    ok(j(grupos) === j(['Raça:Kitsune Ayto', 'Linhagem:Linhagem do Dragão', 'Classe:Mago', 'Outra:Bênção de Selene']), 'nas Fichas, o grupo Linhagem entre Raça e Classe — ' + j(grupos));
    ok(await F.evaluate(() => S.bib.arvores.find(a => a.id === 'a9').categoria) === 'linhagem', 'e a árvore continua em Linhagem (não vira Outra)');
  });
  await t.close();
  end();
})();
async function foto(P, nome) { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } }
