// Árvore de Habilidades, lote 21, sem mesa: o símbolo da barra especial.
//   · a barra vem do nó que a define ("Preparo (barra): máximo 20…"); o nó que soma ganha ▲ verde, o que gasta ▼
//     vermelha, o que faz as duas, as duas; o que não mexe (ou só barateia: "custa 1 a menos") fica sem;
//   · o mestre corrige no nó ("Na barra especial": Automático, ▲ Soma, ▼ Gasta, ▲▼ As duas, Nenhum), e a árvore aceita
//     o nome da barra quando o texto não diz; o painel do jogador mostra "▲ soma · barra Preparo".
// + as contas (tc/rules.js): a leitura do texto, nos jeitos de escrever das árvores do Bruno.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const j = JSON.stringify;
// ---------- as contas ----------
const def = { pais: [], desc: 'O mago aprende…\n\nPreparo (barra): máximo 20; começa em 0. Custam Preparo.' };
ok(R.barraEspecial({ nodes: [def] }) === 'Preparo', 'a barra do nó que a define: Preparo');
ok(R.barraEspecial({ nodes: [{ pais: [], desc: 'x\n\nSombras de Razier (o nome vale também para as filhas de Lakerk): máximo 20; começa com 5.' }] }) === 'Sombras de Razier', 'com um parêntese no meio: Sombras de Razier');
ok(R.barraEspecial({ nodes: [{ pais: [], desc: 'x\n\nGeada: máximo 20; começa com 4.' }] }) === 'Geada' && R.barraEspecial({ barra: 'Dívida', nodes: [{ pais: [], desc: 'Pacto: …' }] }) === 'Dívida', 'sem "(barra)" (Geada) e o nome escrito pelo mestre na árvore (Dívida)');
const M = t => { const m = R.marcaDaBarra({ desc: t }, 'Preparo'); return m ? (m.soma ? 'S' : '') + (m.gasta ? 'G' : '') : '-'; };
const casos = [
  ['+1 de Preparo inicial +2 de Preparo inicial', 'S'], ['ganha +1 de Preparo no começo do próximo turno', 'S'], ['Ela recupera 1d3 de Preparo.', 'S'],
  ['Quando o mago gasta 8 de Preparo numa magia', 'G'], ['testa CAN; se falhar, perde metade do Preparo', 'G'], ['custa 3 de Preparo', 'G'], ['se for empurrado, o Preparo zera', 'G'],
  ['cada magia marcada custa 1 de Preparo a menos (mínimo 1)', '-'], ['para não perder Preparo', '-'], ['É a técnica de abertura: não gasta Preparo.', '-'], ['Com 12 ou mais de Preparo, dobra.', '-'],
  ['Ganha 2 de Preparo. Em troca, perde 1 de Preparo quando sofre dano.', 'SG'], ['O Preparado ganha 2 de fôlego', '-'],
];
for (const [t, e] of casos) ok(M(t) === e, 'lê "' + t + '": ' + M(t) + ' (esperado ' + e + ')');
ok(R.marcaDaBarra(def, 'Preparo') === null, 'o nó que define a barra fica sem marca');
ok(j(R.marcaDaBarra({ desc: 'Um corte gélido.', graus: [{ uso: [{ b: 'Geada de Selene', v: '2' }] }] }, 'Geada')) === j({ soma: false, gasta: true, mao: false }) && R.marcaDaBarra({ desc: 'x', graus: [{ uso: [{ b: 'SP', v: '3' }] }] }, 'Preparo') === null,
  'o custo de uso na barra também é gastar ("Geada de Selene: 2" vale para a Geada); só SP, não');
ok(j(R.marcaDaBarra({ desc: 'ganha 1 de Preparo', barra: 'gasta' }, 'Preparo')) === j({ soma: false, gasta: true, mao: true }) && R.marcaDaBarra({ desc: 'ganha 1 de Preparo', barra: 'nada' }, 'Preparo') === null, 'a marca do mestre vence a leitura (▼ Gasta; Nenhum)');

// ---------- a tela ----------
const no = (id, nome, pais, extra) => Object.assign({ id, pais, regra: 'e', nome, tipo: 'notavel', forma: 'circulo', glifo: '', cor: '', natureza: '', usos: [], desc: '', exclusivo: '', escola: null, graus: [{ custos: { p1: 1 }, texto: '' }] }, extra);
const doc = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4,
  biblioteca: { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }], naturezas: [], usos: [{ id: 'ativa', nome: 'Ativa', sigla: 'At' }],
    tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
    arvores: [{ id: 'a_mago', nome: 'Mago', categoria: 'classe', secreta: false, senha: '', nodes: [
      no('n_raiz', 'Grimório', [], Object.assign({ tipo: 'keystone', forma: 'hexagono', graus: [{ custos: {}, texto: '' }] }, { desc: def.desc })),
      no('n_soma', 'Fórmula na Cabeça', ['n_raiz'], { desc: 'Começa o combate com Preparo.', graus: [{ custos: { p1: 1 }, texto: '+1 de Preparo inicial' }] }),
      no('n_gasta', 'Bola de Fogo', ['n_raiz'], { usos: ['ativa'], desc: 'Custa 4 de Preparo. Dano de fogo em área.' }),
      no('n_duas', 'Contrafeitiço', ['n_raiz'], { desc: 'Gasta 2 de Preparo para anular uma magia; se anular, ganha 1 de Preparo.' }),
      no('n_nada', 'Foco Firme', ['n_raiz'], { desc: 'A Bola de Fogo custa 1 de Preparo a menos.' })] }], cofres: [] },
  personagens: [{ id: 'c_dain', nome: 'Dain', arvores: ['a_mago'], arvoreAtual: 'a_mago', pontos: { p1: 20 }, alocados: {}, ordemLivre: true }] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'arvore21', w: 1400, h: 900, seed: { 'urgm.arvore.v4': doc, 'urgm.arvore.ui.v4': JSON.stringify({ modo: 'mestre', tema: 'pedra', arvoreMestre: 'a_mago' }) } });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const setas = () => E(() => { const o = {}; for (const g of document.querySelectorAll('#nos .no')) o[g.dataset.id] = [...g.querySelectorAll('.seta-barra')].map(c => c.classList.contains('soma') ? 'S' : 'G').join(''); return o; });
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'arvore/', { waitUntil: 'load' }); await w(900);

  await passo('os símbolos', async () => {
    const s = await setas();
    ok(j(s) === j({ n_raiz: '', n_soma: 'S', n_gasta: 'G', n_duas: 'SG', n_nada: '' }), 'no mapa da árvore: ▲ na que soma, ▼ na que gasta, as duas na que faz as duas, nada nas outras — ' + j(s));
    await foto('l21-arvore-setas');
  });

  await passo('a correção do mestre', async () => {
    await E(() => { selecionado = 'n_nada'; pintarPainel(); desenhar(); }); await w(300);
    ok(/Na barra especial · Preparo/i.test(await P.locator('#grupoBarra').innerText()) && /Automático \(nada\)/.test(await P.locator('#grupoBarra').innerText()), 'o nó diz a barra e o que leu ("Automático (nada)"): ' + (await P.locator('#grupoBarra').innerText()).replace(/\s+/g, ' '));
    await P.locator('#grupoBarra [data-barra="gasta"]').click(); await w(300);
    ok((await setas()).n_nada === 'G' && await E(() => porId.get('n_nada').barra) === 'gasta', '▼ Gasta: o nó ganha a seta');
    await foto('l21-arvore-corrigir');
    await P.locator('#grupoBarra [data-barra=""]').click(); await w(300);
    ok((await setas()).n_nada === '' && await E(() => !('barra' in porId.get('n_nada'))), 'Automático volta à leitura do texto');
    await E(() => { selecionado = 'n_soma'; pintarPainel(); desenhar(); }); await w(300);
    await P.locator('#grupoBarra [data-barra="nada"]').click(); await w(300);
    ok((await setas()).n_soma === '', 'Nenhum: tira a seta');
    await E(() => desfazer()); await w(300);
    ok((await setas()).n_soma === 'S', 'o Desfazer a traz de volta');
  });

  await passo('o painel do jogador', async () => {
    await E(() => { ui.modo = 'jogador'; selecionado = 'n_duas'; pintarPainel(); desenhar(); }); await w(400);
    const txt = await P.locator('#marcaBarra').innerText().catch(() => '');
    ok(/▲ soma e ▼ gasta · barra Preparo/.test(txt), 'no painel do jogador: "▲ soma e ▼ gasta · barra Preparo" — ' + txt);
    await foto('l21-arvore-jogador');
  });

  const errs = t.errs.filter(e => !/favicon/i.test(e));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  ok(errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
