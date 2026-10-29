// Fichas, lote 37 (sem mesa: cada um é o mestre): a corrupção.
//   · o painel lilás de quem mestra, em cima da ficha: Nenhuma, Vampírica, Licantropa, Demoníaca; a árvore que conta
//     (a de linhagem equipada vem escolhida); o estágio pelos pontos gastos nela; − e + ajustam (a demoníaca é à mão);
//     cada mudança com Desfazer;
//   · o efeito: as veias no resumo, a etiqueta, o retrato tingido (e os olhos, sem imagem, do estágio 3 em diante); a
//     ficha inteira nos estágios 4 e 5; as garras e as rachaduras; os pontos novos na árvore sobem o estágio;
//   · os cortes nas Tabelas base (um jogo por tipo; cada estágio precisa de mais pontos que o anterior);
//   · no celular, o painel quebra em linhas e nada passa da tela.
// (A conta: corrupcao-nucleo.test.js. Quem vê, o dono e as Cenas: corrupcao.rede.test.js.)
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const j = JSON.stringify;

const bib = { nome: 'b', pools: [{ id: 'lin', nome: 'Linhagem', padrao: 0 }], usos: [], arvores: [
  { id: 'av', nome: 'Linhagem do Vampiro', categoria: 'linhagem', nodes: [{ id: 'r', nome: 'Sangue', pais: [], graus: [{ custos: { lin: 3 } }, { custos: { lin: 5 } }, { custos: { lin: 7 } }, { custos: { lin: 10 } }, { custos: { lin: 15 } }] }] },
  { id: 'gu', nome: 'Guerreiro', categoria: 'classe', nodes: [{ id: 'g', nome: 'Golpe', pais: [], graus: [{ custos: { lin: 1 } }] }] }] };
const pc = Object.assign(R.personagemPadrao('Selene'), { id: 'pc_s', level: 8, skills: { arvores: ['av', 'gu'], pontos: {}, alocados: { r: 2 } } });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib, sel: 'pc_s', selSit: null, aba: 'fichas', grupos: [], abaFicha: 'atributos' });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas-l37', w: 1300, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const corr = () => P.evaluate(() => { const p = S.personagens.find(x => x.id === 'pc_s'); return p.corr ? JSON.parse(JSON.stringify(p.corr)) : null; });
  const classes = () => P.evaluate(() => document.getElementById('ficha').className);
  const avisos = () => P.evaluate(() => [...document.querySelectorAll('.toast, .aviso, [role="status"]')].map(x => x.innerText).join(' ¶ '));
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1400);

  await passo('o painel', async () => {
    ok(await P.locator('#corrBarra').isVisible() && (await P.locator('#corrBarra [aria-checked="true"]').innerText()) === 'Nenhuma' && /Só o mestre/.test(await P.locator('#corrBarra').innerText()),
      'o painel lilás da corrupção, em cima da ficha ("Só o mestre"), em Nenhuma');
    ok(await corr() === null && !/corr-e/.test(await classes()) && await P.locator('.corr-fx').count() === 0, 'sem corrupção, nenhum efeito');
  });
  await passo('vampírica', async () => {
    await P.locator('#corrBarra [data-corrtipo="vamp"]').click(); await w(300);
    const c = await corr();
    ok(!!c && c.tipo === 'vamp' && c.arv === 'av' && c.ajuste === 0, 'Vampírica: a árvore de linhagem equipada vem escolhida — ' + j(c));
    ok(/Estágio 2/.test(await P.locator('.corr-est').innerText()) && /8 pontos em Linhagem do Vampiro · o próximo estágio com 15/.test(await P.locator('.corr-est').innerText()) && (await P.locator('#corrArv').inputValue()) === 'av',
      'o estágio pelos pontos: 8 gastos (3 + 5) chegam aos cortes 3 e 8 — estágio 2; o próximo, com 15');
  });
  await passo('a conta do estágio', async () => {
    const e = await P.evaluate(() => FichasCorr.estadoDe(S.personagens.find(x => x.id === 'pc_s')));
    ok(e.pts === 8 && e.n === 2 && e.nome === 'Sedento', 'a conta: 8 pontos passam de 3 e de 8 — estágio 2 (Sedento): ' + j(e));
  });
  await passo('o efeito', async () => {
    ok(/corr-vamp/.test(await classes()) && /corr-e2/.test(await classes()) && await P.locator('#resumo .corr-fx .cv').count() === 3 && /Vampírica · Sedento/.test(await P.locator('.corr-chip').innerText()),
      'as veias no resumo (três, no estágio 2) e a etiqueta "Vampírica · Sedento"');
    ok(await P.evaluate(() => { const q = document.querySelector('.retrato .quadro'); return q.classList.contains('corr-q') && q.classList.contains('corr-vamp') && !q.querySelector('.olhos'); }), 'o retrato tingido (sem os olhos ainda: só do estágio 3)');
    await P.locator('#corrBarra [data-corrpm="1"]').click(); await w(250);
    ok((await corr()).ajuste === 1 && /corr-e3/.test(await classes()) && await P.locator('.retrato .quadro .olhos').count() === 1 && /Noturno/.test(await P.locator('.corr-est').innerText()) && /ajuste \+1/.test(await P.locator('.corr-est').innerText()),
      '+: o ajuste sobe um estágio (Noturno), e os olhos aparecem no retrato sem imagem');
    ok(/A corrupção avançou um estágio\. Agora: estágio 3 \(Noturno\)/.test(await avisos()), 'o aviso, com Desfazer');
    await P.locator('text=Desfazer').last().click(); await w(250);
    ok((await corr()).ajuste === 0 && /corr-e2/.test(await classes()), 'Desfazer: o ajuste volta');
    // mais pontos na árvore: o estágio sobe
    await P.evaluate(() => { const p = S.personagens.find(x => x.id === 'pc_s'); p.skills.alocados.r = 5; save(); render(); }); await w(250);
    ok(/corr-e5/.test(await classes()) && /corr-tomada/.test(await classes()) && await P.locator('#resumo .corr-fx .cv').count() === 10 && /Senhor da Noite/.test(await P.locator('.corr-chip').innerText()),
      'com 40 pontos na árvore, o estágio 5 (Senhor da Noite): as dez veias e a ficha inteira tomada');
    await foto('corr-vamp5');
  });
  await passo('licantropa e demoníaca', async () => {
    await P.locator('#corrBarra [data-corrtipo="lica"]').click(); await w(250);
    ok(/corr-lica/.test(await classes()) && await P.locator('#resumo .corr-fx .cg').count() === 15 && await P.locator('#resumo .corr-fx .cp').count() === 1, 'Licantropa: as garras (cinco, de três riscos) e a pegada');
    await P.locator('#corrBarra [data-corrtipo="demo"]').click(); await w(250);
    const c = await corr();
    ok(c.tipo === 'demo' && /corr-demo/.test(await classes()) === false && /A demoníaca é à mão/.test(await P.locator('.corr-est').innerText()) && /Estágio 0/.test(await P.locator('.corr-est').innerText()),
      'Demoníaca: começa no 0, à mão (os pontos não contam)');
    for (let k = 0; k < 4; k++) { await P.locator('#corrBarra [data-corrpm="1"]').click(); await w(150); }
    ok((await corr()).estagio === 4 && /corr-demo/.test(await classes()) && /corr-e4/.test(await classes()) && await P.locator('#resumo .corr-fx .cr').count() === 6 && await P.locator('#resumo .corr-fx .cu').count() === 12,
      'quatro vezes +: Possuído, com as rachaduras, as brasas e as runas');
    await foto('corr-demo4');
    await P.locator('#corrBarra [data-corrtipo=""]').click(); await w(250);
    ok(await corr() === null && !/corr-e/.test(await classes()) && await P.locator('.corr-fx').count() === 0 && await P.locator('.retrato .quadro.corr-q').count() === 0, 'Nenhuma: tudo some');
  });
  await passo('os cortes', async () => {
    await P.locator('#corrBarra [data-corrtipo="vamp"]').click(); await w(200);
    await P.locator('text=Tabelas base').first().click(); await w(250);
    ok(await P.locator('[data-corrcorte]').count() === 10, 'nas Tabelas base, os cortes da vampírica e da licantropa (cinco cada)');
    await P.locator('[data-corrcorte="vamp|4"]').fill('50'); await P.locator('[data-corrcorte="vamp|4"]').press('Tab'); await w(150);
    await P.locator('[data-corrcorte="vamp|1"]').fill('2'); await P.locator('[data-corrcorte="vamp|1"]').press('Tab'); await w(150);
    const cfg = await P.evaluate(() => S.cfg.corr);
    ok(j(cfg.vamp) === j([3, 8, 15, 25, 50]) && (await P.locator('[data-corrcorte="vamp|1"]').inputValue()) === '8', 'muda o último para 50; o 2 abaixo do 3 é recusado (volta ao 8): ' + j(cfg));
    await P.locator('#cfgClose').click(); await w(250);
    ok(/corr-e4/.test(await classes()), 'com o último corte em 50, os 40 pontos são o estágio 4');
  });
  await passo('o celular', async () => {
    await P.setViewportSize({ width: 400, height: 860 }); await w(300);
    const r = await P.evaluate(() => ({ larg: document.documentElement.scrollWidth, bar: document.getElementById('corrBarra').getBoundingClientRect().width }));
    ok(r.larg <= 400 && r.bar <= 400, 'no celular, o painel cabe (quebra em linhas): ' + j(r));
    await foto('corr-celular');
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
