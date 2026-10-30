// Fichas, lote 40 (sem mesa: cada um é o mestre): as tropas.
//   · a aba Tropas só aparece na ficha com tropa; "+ Tropas", no fim das abas, cria (com Desfazer);
//   · a faixa da tropa: o brasão, o nome, os soldados, a veterania média, a moral (− e +), os mantimentos;
//   · as cartas das unidades: "+ Unidade"; "Números…" (as tropas, o efetivo, o HP, o ATQ, a DEF, a veterania, com a
//     prévia); a veterania na própria carta; as escolhas (o nome, a raça e a classe das árvores, os equipamentos — até
//     o limite —, os suprimentos, as informações, o brasão pelo montador do clã); o ATQ e a DEF com os equipamentos e a
//     veterania;
//   · registrar uma batalha (as baixas, o resultado, a moral) e o diário (as promoções, as notas, tirar com Desfazer);
//   · as listas nas Tabelas base (pôr, renomear, tirar com Desfazer; o bônus da veterania);
//   · dispensar a tropa (a aba sai; Desfazer a traz de volta);
//   · no celular, nada passa da tela.
// (A conta: tropas-nucleo.test.js. Quem vê, o dono e a tranca do banco: tropas.rede.test.js.)
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const j = JSON.stringify;

const bib = { nome: 'b', pools: [{ id: 'p', nome: 'Pontos', padrao: 0 }], usos: [], arvores: [
  { id: 'ar_humano', nome: 'Humano', categoria: 'raca', nodes: [] }, { id: 'ar_elfo', nome: 'Elfo', categoria: 'raca', nodes: [] },
  { id: 'cl_guerreiro', nome: 'Guerreiro', categoria: 'classe', nodes: [] }, { id: 'cl_arqueiro', nome: 'Arqueiro', categoria: 'classe', nodes: [] }] };
const pc = Object.assign(R.personagemPadrao('Selene'), { id: 'pc_s', level: 8 });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib, sel: 'pc_s', selSit: null, aba: 'fichas', grupos: [], abaFicha: 'atributos' });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas-l40', w: 1300, h: 940, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const foto = async (nome, el) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await (el || P).screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const tropa = () => P.evaluate(() => { const p = S.personagens.find(x => x.id === 'pc_s'); return p.tropas ? JSON.parse(JSON.stringify(p.tropas)) : null; });
  const avisos = () => P.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ '));
  const desfazer = async () => { await P.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(250); };
  const carta = n => P.locator('#tropasAba .tr-carta').nth(n);
  const cartaDe = id => P.locator('#tropasAba .tr-carta[data-trunid="' + id + '"]');
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1400);

  await passo('sem tropa', async () => {
    ok(await P.locator('[data-abaficha="tropas"]').count() === 0 && await P.locator('[data-trcriar]').isVisible(), 'sem tropa: a ficha não tem a aba Tropas; no fim das abas, "+ Tropas"');
  });
  await passo('criar', async () => {
    await P.locator('[data-trcriar]').click(); await w(300);
    const d = await tropa();
    ok(!!d && d.nome === 'Guarda de Selene' && d.unid.length === 1 && await P.locator('[data-abaficha="tropas"][aria-selected="true"]').count() === 1 && (await P.locator('[data-abaficha="tropas"] .mk').innerText()) === '1',
      '"+ Tropas": a tropa nasce (Guarda de Selene, uma unidade) e a aba Tropas abre, com a marca 1');
    ok(await P.locator('[data-trcriar]').count() === 0 && /Tropa criada para Selene/.test(await avisos()), 'o "+ Tropas" sai; o aviso, com Desfazer');
    await desfazer();
    ok(await tropa() === null && await P.locator('[data-abaficha="tropas"]').count() === 0 && (await P.locator('.abasficha .abf.on').innerText()) === 'Atributos', 'Desfazer: a tropa e a aba saem (volta para Atributos)');
    await P.locator('[data-trcriar]').click(); await w(300);
  });
  await passo('a faixa', async () => {
    const f = await P.locator('.tr-faixa').innerText();
    ok(/Guarda de Selene/.test(f) && /100\s+soldados em\s+1\s+unidade/.test(f) && /Recruta/.test(f) && /média 1,0 de 3/.test(f) && /Moral\s*5/.test(f), 'a faixa: o nome, 100 soldados em 1 unidade, a veterania média (Recruta, 1,0), a moral 5 — ' + f.replace(/\s+/g, ' ').slice(0, 220));
    ok(await P.locator('.tr-faixa .tr-bras svg').count() === 1 && await P.locator('#tropasAba .tr-diario li').count() === 1 && /A tropa foi formada/.test(await P.locator('.tr-diario').innerText()), 'o brasão da tropa e o diário (a primeira linha: a tropa foi formada)');
    await P.locator('[data-trmoral="1"]').click(); await w(200);
    ok((await tropa()).moral === 6 && /Moral da tropa: 6 de 10/.test(await avisos()) && await P.locator('.tr-pips i.on').count() === 6, '+ na moral: 6 de 10 (seis marcas), com Desfazer');
  });
  let ida = '', idb = '';
  await passo('unidades', async () => {
    await P.locator('[data-trnova]').click(); await w(250);
    const d = await tropa();
    ida = d.unid[0].id; idb = d.unid[1].id;
    ok(d.unid.length === 2 && d.unid[1].nome === 'Unidade 2' && await P.locator('#tropasAba .tr-carta').count() === 2 && /Unidade 2 entrou na tropa/.test(await avisos()), '"+ Unidade": a segunda carta, e o aviso');
    ok(/Unidade 2 entrou na tropa/.test(await P.locator('.tr-diario').innerText()), 'e uma linha no diário');
  });
  await passo('os números', async () => {
    await cartaDe(ida).locator('[data-trnum]').click(); await w(250);
    const J = P.locator('.tr-janela');
    for (const [k, v] of [['tropas', '250'], ['cheio', '300'], ['hpT', '10'], ['atq', '3'], ['def', '2']]) { await J.locator('[data-trn="' + k + '"]').fill(v); }
    await J.locator('[data-trn="vet"]').selectOption('3'); await w(150);
    ok(/Fica: 250 soldados, HP 2\.500 de 3\.000, ATQ \+5 e DEF \+4/.test(await J.locator('[data-trprev]').innerText()), 'a prévia: 250 soldados, HP 2.500 de 3.000, ATQ +5 e DEF +4 (a Elite soma 2) — ' + await J.locator('[data-trprev]').innerText());
    await J.locator('[data-jok]').click(); await w(300);
    const u = (await tropa()).unid.find(x => x.id === ida);
    ok(u.tropas === 250 && u.cheio === 300 && u.vet === 3 && u.atq === 3, 'Salvar: os números da unidade');
    const c = await cartaDe(ida).innerText();
    ok(/250/.test(c) && /de 300/.test(c) && /2\.500 \/ 3\.000/.test(c) && /com baixas/.test(c) && /\+5/.test(c) && /Elite|Recruta/.test(c), 'a carta: 250 de 300, HP 2.500 / 3.000 (com baixas), ATQ +5 — ' + c.replace(/\s+/g, ' ').slice(0, 200));
    ok(/Unidade 1 virou Elite/.test(await P.locator('.tr-diario').innerText()) && (await carta(0).getAttribute('data-trunid')) === ida, 'o diário: "Unidade 1 virou Elite"; a carta Elite vem primeiro');
  });
  await passo('a veterania na carta', async () => {
    await cartaDe(idb).locator('[data-trvet]').selectOption('2'); await w(300);
    ok((await tropa()).unid.find(x => x.id === idb).vet === 2 && /Unidade 2 virou Veterana/.test(await avisos()), 'a veterania escolhida na carta: Unidade 2 virou Veterana (com Desfazer)');
    ok(/média 2,5 de 3/.test(await P.locator('.tr-faixa').innerText()), 'a veterania média: 2,5 (Elite e Veterana)');
  });
  await passo('as escolhas', async () => {
    await cartaDe(ida).locator('[data-tresc]').click(); await w(300);
    const J = P.locator('.tr-janela');
    await J.locator('[data-trnome]').fill('Lanças de Merunê');
    await J.locator('[data-trraca]').selectOption('ar_humano');
    await J.locator('[data-trclasse]').selectOption('cl_guerreiro');
    ok(j(await J.locator('[data-trraca] option').allInnerTexts()) === j(['—', 'Elfo', 'Humano']), 'a raça: das árvores de raça da mesa');
    await J.locator('[data-treq="eq_lanca"]').check(); await J.locator('[data-treq="eq_torre"]').check(); await w(100);
    ok(await J.locator('[data-treq="eq_arco"]').isDisabled() && !(await J.locator('[data-treq="eq_lanca"]').isDisabled()), 'dois equipamentos: os outros travam (o limite das tabelas base)');
    await J.locator('[data-trsp="sp_racoes"]').check(); await J.locator('[data-trsp="sp_ataduras"]').check();
    await J.locator('[data-trinfo]').fill('Recrutados nas aldeias do vale.');
    await J.locator('[data-mforma="redondo"]').click(); await J.locator('[data-mdiv="cortado"]').click();
    await J.locator('[data-malvo="1"]').click(); await J.locator('[data-mcor="#2f6b45"]').click(); await J.locator('[data-msimb="torre"]').click(); await w(150);
    ok(await J.locator('[data-mcor="#2f6b45"][aria-pressed="true"]').count() === 1 && await J.locator('[data-mprev] svg').count() === 1, 'o montador do brasão: a forma, a divisão, a cor 2, o símbolo — a prévia redesenha');
    await foto('tropas-escolhas');
    await J.locator('[data-jok]').click(); await w(300);
    const u = (await tropa()).unid.find(x => x.id === ida);
    ok(u.nome === 'Lanças de Merunê' && u.raca === 'ar_humano' && u.racaN === 'Humano' && u.classe === 'cl_guerreiro' && j(u.equip) === j(['eq_lanca', 'eq_torre']) && j(u.supr) === j(['sp_racoes', 'sp_ataduras']) && u.bras.forma === 'redondo' && u.bras.div === 'cortado' && u.bras.cores[1] === '#2f6b45' && u.bras.simb === 'torre' && u.tropas === 250,
      'Salvar: as escolhas (e os números como estavam): ' + j({ nome: u.nome, raca: u.raca, eq: u.equip, b: u.bras }));
    const c = await cartaDe(ida).innerText();
    ok(/Lanças de Merunê/.test(c) && /Humano/.test(c) && /Guerreiro/.test(c) && /Lança longa\s*ATQ \+2/.test(c) && /Escudo de torre\s*DEF \+3/.test(c) && /Rações/.test(c) && /Recrutados nas aldeias/.test(c) && /\+7/.test(c) && /\+7/.test(c),
      'a carta: o nome, a raça e a classe, os equipamentos (com o bônus), os suprimentos, as informações; ATQ +7 e DEF +7 — ' + c.replace(/\s+/g, ' ').slice(0, 260));
    ok(/As escolhas de Lanças de Merunê foram salvas/.test(await avisos()), 'o aviso, com Desfazer');
  });
  await passo('a quantidade dos suprimentos', async () => {
    await cartaDe(ida).locator('[data-trnum]').click(); await w(250);
    const J = P.locator('.tr-janela');
    ok(await J.locator('[data-trq]').count() === 2, 'nos números, a quantidade de cada suprimento que o jogador escolheu');
    await J.locator('[data-trq="sp_racoes"]').fill('10'); await J.locator('[data-jok]').click(); await w(300);
    ok((await tropa()).unid.find(x => x.id === ida).suprQ.sp_racoes === 10 && /Rações\s*10/.test(await cartaDe(ida).innerText()), 'Rações 10, na carta');
  });
  await passo('moral e mantimentos', async () => {
    await P.locator('[data-trnumtropa]').click(); await w(250);
    const J = P.locator('.tr-janela');
    await J.locator('[data-trm="mant"]').fill('40'); await w(100);
    ok(/mantimentos para 10 dias \(4 por dia\)/.test(await J.locator('[data-trprev]').innerText()), 'a prévia: 40 de estoque, 4 por dia (350 soldados, uma ração por 100) — 10 dias');
    await J.locator('[data-jok]').click(); await w(300);
    ok((await tropa()).mant === 40 && /10\s*dias/.test(await P.locator('.tr-faixa').innerText()), 'Salvar: 10 dias na faixa');
  });
  await passo('a batalha', async () => {
    await P.locator('[data-trbatalha]').click(); await w(250);
    const J = P.locator('.tr-janela');
    await J.locator('[data-jok]').click(); await w(150);
    ok(await J.isVisible() && /Escreva onde foi a batalha/.test(await J.locator('[data-trprev]').innerText()), 'sem dizer onde, a batalha não vai (o aviso na própria janela)');
    await J.locator('[data-trbt]').fill('Emboscada na Ponte Velha');
    await J.locator('[data-trres="d"]').click();
    await J.locator('[data-trbx="' + ida + '"]').fill('41'); await J.locator('[data-trbx="' + idb + '"]').fill('12');
    await J.locator('[data-trbm]').fill('4'); await w(150);
    ok(/53 baixas no total; a tropa fica com 297 soldados/.test(await J.locator('[data-trprev]').innerText()), 'a prévia: 53 baixas, 297 soldados');
    await foto('tropas-batalha');
    await J.locator('[data-jok]').click(); await w(300);
    const d = await tropa(), a = d.unid.find(x => x.id === ida);
    ok(a.tropas === 209 && a.bat === 1 && a.baixas === 41 && d.moral === 4 && d.diario[0].k === 'bat' && d.diario[0].r === 'd' && d.diario[0].b === 53, 'Registrar: as baixas saem, uma batalha para cada, a moral 4, a linha do diário');
    ok(/Batalha registrada: 53 baixas/.test(await avisos()) && /Emboscada na Ponte Velha\s*derrota · 53 baixas/.test(await P.locator('.tr-diario').innerText()) && /1 batalha · 41 baixas/.test(await cartaDe(ida).innerText()),
      'o diário (derrota · 53 baixas) e o pé da carta (1 batalha · 41 baixas)');
  });
  await passo('o diário', async () => {
    await P.locator('[data-trnota]').click(); await w(200);
    await P.locator('.tr-janela [data-trnt]').fill('Acamparam no Passo do Corvo'); await P.locator('.tr-janela [data-trnt]').press('Enter'); await w(300);
    ok((await tropa()).diario[0].t === 'Acamparam no Passo do Corvo', '+ Nota: a nota vai para o alto do diário');
    const n = (await tropa()).diario.length;
    await P.locator('.tr-diario [data-trtiradi]').first().click(); await w(250);
    ok((await tropa()).diario.length === n - 1, '×: a linha sai do diário');
    await desfazer();
    ok((await tropa()).diario.length === n, 'Desfazer: a linha volta');
    await P.mouse.move(5, 5); await w(400);
    await foto('tropas-mestre');
  });
  await passo('as tabelas base', async () => {
    await P.locator('text=Tabelas base').first().click(); await w(300);
    ok(await P.locator('[data-trceqn]').count() === 6 && await P.locator('[data-trcspn]').count() === 6, 'nas Tabelas base, os seis equipamentos e os seis suprimentos de começo');
    await P.locator('[data-trceqmais]').click(); await w(250);
    await P.locator('[data-trceqn]').last().fill('Machado de guerra'); await P.locator('[data-trceqn]').last().press('Tab'); await w(100);
    await P.locator('[data-trceqa]').last().fill('3'); await P.locator('[data-trceqa]').last().press('Tab'); await w(150);
    let cf = await P.evaluate(() => S.cfg.tropas);
    ok(cf.equip.length === 7 && cf.equip[6].nome === 'Machado de guerra' && cf.equip[6].atq === 3, '+ Equipamento: o Machado de guerra (ATQ +3)');
    await P.locator('[data-trceqx="eq_torre"]').click(); await w(250);
    cf = await P.evaluate(() => S.cfg.tropas);
    ok(!cf.equip.some(e => e.id === 'eq_torre') && /O equipamento “Escudo de torre” saiu da lista/.test(await avisos()), '×: o Escudo de torre sai da lista, com Desfazer');
    await desfazer();
    cf = await P.evaluate(() => S.cfg.tropas);
    ok(cf.equip.findIndex(e => e.id === 'eq_torre') === 3, 'Desfazer: ele volta no mesmo lugar');
    await P.locator('[data-trcvet="3"]').fill('4'); await P.locator('[data-trcvet="3"]').press('Tab'); await w(150);
    ok((await P.evaluate(() => S.cfg.tropas.vet[3])) === 4, 'o bônus da Elite: 4');
    await P.locator('#cfgClose').click(); await w(300);
    ok(/\+9/.test(await cartaDe(ida).locator('.tr-ngrid').innerText()), 'a carta Elite: ATQ +9 (3 + 2 dos equipamentos + 4 da veterania)');
  });
  await passo('dispensar', async () => {
    await P.locator('[data-trdispensar]').click(); await w(300);
    ok(await tropa() === null && await P.locator('[data-abaficha="tropas"]').count() === 0 && /foi dispensada/.test(await avisos()), 'Dispensar a tropa: a aba sai da ficha (com Desfazer)');
    await desfazer();
    ok((await tropa()).unid.length === 2 && await P.locator('[data-abaficha="tropas"]').count() === 1, 'Desfazer: a tropa volta inteira');
    await P.locator('[data-abaficha="tropas"]').click(); await w(200);
  });
  await passo('o celular', async () => {
    await P.setViewportSize({ width: 400, height: 860 }); await w(400);
    const r = await P.evaluate(() => ({ larg: document.documentElement.scrollWidth, carta: Math.round(document.querySelector('.tr-carta').getBoundingClientRect().right) }));
    ok(r.larg <= 400 && r.carta <= 400, 'no celular, a faixa e as cartas cabem: ' + j(r));
    await P.evaluate(() => document.getElementById('tropasAba').scrollIntoView());
    await foto('tropas-celular');
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
