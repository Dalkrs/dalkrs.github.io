// Fichas, lote 23 (sem mesa): os filtros da aba Skills.
//   · a busca (pelo nome e pelo texto, sem acento) e o botão "Filtros (n)", que abre os chips: Uso, Origem e Barra;
//   · valem para os cartões de "Aprendidas" e para as "Passivas e habilidades" (escritas à mão);
//   · dentro de um grupo, basta um chip bater; entre os grupos, todos; cada chip diz quantos aparecem;
//   · cada ficha lembra o filtro dela (também ao recarregar); "Limpar" volta tudo; nada muda na ficha.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const bib = { nome: 'Bib', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 10 }], usos: [{ id: 'passiva', nome: 'Passiva', sigla: 'Pa' }, { id: 'ativa', nome: 'Ativa', sigla: 'At' }, { id: 'reacao', nome: 'Reação', sigla: 'Re' }], naturezas: [],
  arvores: [
    { id: 'a1', nome: 'Monge', categoria: 'classe', barra: 'Ki', nodes: [
      { id: 'n1', nome: 'Origem', tipo: 'keystone', pais: [], usos: [], desc: 'Ponto de partida.', graus: [{ custos: {}, texto: '' }] },
      { id: 'n2', nome: 'Respiro', tipo: 'notavel', pais: ['n1'], usos: ['passiva'], desc: 'Ganha 1 de Ki por turno.', graus: [{ custos: { p1: 1 }, texto: '' }] },
      { id: 'n3', nome: 'Palma explosiva', tipo: 'notavel', pais: ['n1'], usos: ['ativa'], desc: 'Gasta 2 de Ki: dano dobrado.', graus: [{ custos: { p1: 1 }, texto: '' }] }] },
    { id: 'a2', nome: 'Kitsune', categoria: 'raca', nodes: [
      { id: 'k1', nome: 'Raiz da raposa', tipo: 'keystone', pais: [], usos: [], desc: 'O começo.', graus: [{ custos: {}, texto: '' }] },
      { id: 'k2', nome: 'Esquiva lunar', tipo: 'notavel', pais: ['k1'], usos: ['reacao'], desc: 'Desvia de um golpe.', graus: [{ custos: { p1: 1 }, texto: '' }] }] }] };
const pc = (id, nome, extra) => Object.assign(R.personagemPadrao(nome), { id, nome, level: 8, recursos: [{ id: 'hp' + id, nome: 'HP', fml: '100' }] }, extra);
const dain = pc('pc_dain', 'Dain X', { grupo: 'Heróis',
  habilidades: [{ id: 'h1', nome: 'Faro aguçado', desc: 'Sente cheiros a 100 m.', tipo: 'Passivo' }, { id: 'h2', nome: 'Grito de guerra', desc: 'Aliados +1 de dano.', tipo: 'Ativo' }],
  skills: { arvores: ['a1', 'a2'], pontos: { p1: 10 }, alocados: { n1: 1, n2: 1, n3: 1, k1: 1, k2: 1 }, unicas: [{ id: 'u1', nome: 'Sangue do dragão', desc: 'Cura 10 de HP.', uso: [{ b: 'SP', v: '10' }], usos: ['ativa'] }] } });
const lia = pc('pc_lia', 'Lia', { grupo: 'Heróis', habilidades: [{ id: 'h9', nome: 'Canção', desc: 'Acalma.', tipo: 'Ativo' }] });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [dain, lia], situacoes: [], tabelas: [], log: [], bib, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: ['Heróis'] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas-l23', w: 1300, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const j = JSON.stringify;
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png'), fullPage: true }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  // o que aparece: os cartões (nome) e as escritas à mão (nome)
  const vis = () => P.evaluate(() => ({
    cartoes: [...document.querySelectorAll('#habsDaArvore .skcard')].filter(x => !x.hidden).map(x => x.querySelector('.habnome').textContent.replace(/grau.*/, '').replace(/[▲▼]/g, '').trim()),
    mao: [...document.querySelectorAll('#painelHabs [data-habmao]')].filter(x => !x.hidden).map(x => x.querySelector('[data-habnome]').value) }));
  const chip = (k, txt) => P.locator('#skFiltro [data-skf="' + k + '"]', { hasText: txt });
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  await P.locator('#ficha [data-abaficha="skills"]').click(); await w(300);

  await passo('a barra', async () => {
    ok(await P.locator('#skFiltro #skf-busca').isVisible() && /^Filtros\s*▾$/.test((await P.locator('#skf-abrir').innerText()).trim()) && await P.locator('#skf-painel').isHidden() && await P.locator('#skf-limpar').isHidden(),
      'a aba Skills tem a busca e o botão "Filtros ▾" (o painel fechado, sem o Limpar)');
    const v = await vis();
    ok(v.cartoes.length === 6 && v.mao.length === 2, 'sem filtro, tudo à vista: 6 cartões e 2 escritas à mão — ' + j(v));
  });
  await passo('a busca', async () => {
    await P.locator('#skf-busca').fill('dano'); await w(250);
    let v = await vis();
    ok(j(v.cartoes) === j(['Palma explosiva']) && j(v.mao) === j(['Grito de guerra']), 'a busca "dano" acha pelo texto, nos cartões e nas escritas à mão: ' + j(v));
    ok(/Mostrando 2 de 8/.test(await P.locator('#skf-conta').innerText()) && await P.locator('#skf-limpar').isVisible(), 'diz "Mostrando 2 de 8" e aparece o Limpar');
    await P.locator('#skf-busca').fill('agucado'); await w(250);
    ok(j((await vis()).mao) === j(['Faro aguçado']) && (await vis()).cartoes.length === 0, 'sem acento também acha ("agucado" → Faro aguçado)');
    ok(await P.locator('.skf-nada', { hasText: 'aprendidas' }).count() === 1, 'e avisa quando nenhuma das aprendidas bate');
    await P.locator('#skf-busca').fill(''); await w(250);
  });
  await passo('os chips', async () => {
    await P.locator('#skf-abrir').click(); await w(200);
    ok(await P.locator('#skf-painel').isVisible() && j((await P.locator('#skf-painel .skf-g > .eyebrow').allInnerTexts()).map(x => x.toUpperCase())) === j(['USO', 'ORIGEM', 'BARRA']), 'Filtros abre os três grupos: Uso, Origem, Barra');
    const nomes = async k => (await P.locator('#skFiltro [data-skf="' + k + '"]').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
    ok(j(await nomes('orig')) === j(['Monge 3', 'Kitsune 2', 'Skill única 1', 'À mão 2']), 'Origem: cada árvore, a única e as à mão, com quantos: ' + j(await nomes('orig')));
    ok(j(await nomes('barra')) === j(['▲ soma 1', '▼ gasta 1', 'Com custo 1']), 'Barra: ▲ soma, ▼ gasta, com custo: ' + j(await nomes('barra')));
    await chip('uso', 'Ativa').click(); await w(200);
    let v = await vis();
    ok(j(v.cartoes) === j(['Palma explosiva', 'Sangue do dragão']) && j(v.mao) === j(['Grito de guerra']), 'o chip "Ativa": as ativas da árvore, a única ativa e a escrita à mão do tipo Ativo — ' + j(v));
    ok(/Filtros \(1\)/.test(await P.locator('#skf-abrir').innerText()) && await chip('uso', 'Ativa').getAttribute('aria-pressed') === 'true', 'o botão mostra "Filtros (1)" e o chip fica marcado');
    await chip('uso', 'Reação').click(); await w(200);
    v = await vis();
    ok(j(v.cartoes) === j(['Palma explosiva', 'Esquiva lunar', 'Sangue do dragão']), 'dois chips do mesmo grupo somam (Ativa ou Reação): ' + j(v.cartoes));
    await chip('orig', 'Monge').click(); await w(200);
    v = await vis();
    ok(j(v.cartoes) === j(['Palma explosiva']) && v.mao.length === 0, 'chips de grupos diferentes se cruzam (Ativa/Reação e Monge): ' + j(v));
    await chip('orig', 'Monge').click(); await chip('uso', 'Ativa').click(); await chip('uso', 'Reação').click(); await w(200);
    await chip('barra', 'soma').click(); await w(200);
    ok(j((await vis()).cartoes) === j(['Respiro']), '"▲ soma": só a que enche a barra especial (Respiro, +1 de Ki)');
    await chip('barra', 'soma').click(); await chip('barra', 'Com custo').click(); await w(200);
    ok(j((await vis()).cartoes) === j(['Sangue do dragão']), '"Com custo": só a que tem custo de uso (10 SP)');
    await chip('barra', 'Com custo').click(); await chip('orig', 'À mão').click(); await w(200);
    v = await vis();
    ok(v.cartoes.length === 0 && v.mao.length === 2, '"À mão": só as escritas à mão');
    await foto('l23-skills-filtro');
  });
  await passo('cada ficha lembra o dela', async () => {
    await P.locator('#lista .pc', { has: P.locator('.nm', { hasText: /^Lia$/ }) }).click(); await w(400);
    ok(await P.locator('#skf-busca').inputValue() === '' && !/\(/.test(await P.locator('#skf-abrir').innerText()) && (await vis()).mao.length === 1, 'a Lia abre sem filtro (o filtro é de cada ficha)');
    await P.locator('#lista .pc', { has: P.locator('.nm', { hasText: /^Dain X$/ }) }).click(); await w(400);
    ok(/Filtros \(1\)/.test(await P.locator('#skf-abrir').innerText()) && (await vis()).cartoes.length === 0, 'o Dain volta com o filtro dele ("À mão")');
    await P.reload({ waitUntil: 'load' }); await w(1200);
    ok(/Filtros \(1\)/.test(await P.locator('#skf-abrir').innerText()) && (await vis()).cartoes.length === 0, 'e continua depois de recarregar');
    await P.locator('#skf-limpar').click(); await w(200);
    const v = await vis();
    ok(v.cartoes.length === 6 && v.mao.length === 2 && await P.locator('#skf-limpar').isHidden() && await P.evaluate(k => !(JSON.parse(localStorage.getItem(k) || '{}').pc_dain), 'tinycats:filtroSk'), '"Limpar" mostra tudo de novo (e esquece o filtro da ficha)');
    ok(await P.evaluate(() => S.personagens[0].habilidades.length === 2 && Object.keys(S.personagens[0].skills.alocados).length === 5), 'nada mudou na ficha');
  });
  ok(t.errs.length === 0, 'sem erros no console' + (t.errs.length ? ': ' + t.errs.slice(0, 3).join(' | ') : ''));
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
