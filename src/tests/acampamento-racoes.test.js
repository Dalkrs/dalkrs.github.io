// Acampamento sem mesa: as rações com tipo e efeito (o que cada descanso serve, o que a comida faz), a estrutura
// que vale só para alguns (e o que ela faz na ficha), a aura da emoção em volta do retrato e a aba Caravana.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = (id, nome, lvl, grupo, estado) => ({ id, nome, raca: 'Humano', lado: 'Aliado', grupo, tags: [], tier: 'C', level: lvl, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null,
  poderes: [], skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 20, fonte: 'total' }, ultRol: null,
  disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [],
  recursos: [{ id: 'hp' + id, nome: 'Vida', fml: 'VIT*8 + LVL*5' }, { id: 'sp' + id, nome: 'SP', fml: 'CAN*6 + LVL*3' }], notas: '', estado });
const fichas = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_dain', 'Dain X', 5, 'Heróis', { rec: { hppc_dain: 40 }, san: 60, conf: 30 }), pc('pc_lia', 'Lia', 3, 'Heróis', { san: 50, conf: 50 }), pc('pc_ogro', 'Ogro', 6, 'Vila', { san: 40, conf: 40 })],
  situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'racoes', w: 1366, h: 860, seed: { urgm_calc_atributos_v1: fichas } });
  const w = ms => P.waitForTimeout(ms || 160);
  const A = (fn, arg) => P.evaluate(fn, arg);
  const aba = async id => { await P.locator('#tab-' + id).click(); await w(); };
  const dlg = async () => (await P.locator('dialog[open]').innerText()).replace(/\s+/g, ' ');
  const foto = async nome => { if (process.env.TC_SCRATCH) await P.screenshot({ path: require('path').join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };
  const campo = async (sel, v) => { await P.locator(sel).fill(String(v)); await P.locator(sel).press('Enter'); await w(); };
  await P.goto(t.base + 'acampamento/?debug', { waitUntil: 'load' }); await w(900);
  for (const nome of ['Dain X', 'Lia', 'Ogro']) { await P.locator('#chamar').selectOption({ label: nome }); await w(); }
  ok(await P.locator('#roda .pers').count() === 3, '(os três em volta da fogueira)');
  ok(await P.locator('#tabs .tab').allInnerTexts().then(x => x.join('|')) === 'Grupo|Provisões|Estrutura|Caravana|Diário', 'o painel ganha a aba Caravana, antes do Diário');

  // ================= rações: o que cada descanso serve, e o que a comida faz =================
  await aba('provisoes');
  for (const [nome, q] of [['Carne seca', 10], ['Ensopado de javali', 2]]) {
    await P.locator('#pv-novo').click(); await w(); await P.keyboard.type(nome); await P.keyboard.press('Enter'); await w();
    const id = await A(n => __acamp.camp.provisoes.find(p => p.nome === n).id, nome);
    await campo('#pv-q-' + id, q);
  }
  const idEns = await A(() => __acamp.camp.provisoes[1].id), idCarne = await A(() => __acamp.camp.provisoes[0].id);
  ok(await P.locator('#sv-longo').count() === 1 && await P.locator('#sv-longo').inputValue() === '' && await P.locator('#sv-curto-prov').inputValue() === '0', 'cada descanso diz o que serve (sem escolher: a ordem da lista) e quantas rações cada um come');
  await P.locator('#sv-longo').selectOption(idEns); await w();
  ok(await A(() => __acamp.camp.servir.longo) === idEns, 'o descanso longo passa a servir o ensopado');
  ok((await P.locator(`#pv-${idEns}-ef summary`).innerText()).includes('só mata a fome'), 'sem efeito, a ração "só mata a fome"');
  await P.locator(`#pv-${idEns}-ef summary`).click(); await w();
  await campo(`#pv-conf-${idEns}`, 5);
  ok(await P.locator(`#pv-${idEns}-ef`).evaluate(d => d.open), 'o painel "Ao comer" continua aberto depois de mexer');
  await P.locator(`#pv-${idEns}-fxnovo`).click(); await w();
  const fx1 = await A(id => __acamp.camp.provisoes.find(p => p.id === id).fx[0].id, idEns);
  ok(await P.evaluate(() => document.activeElement && /-fxt-/.test(document.activeElement.id)), 'efeito novo na ficha: o cursor vai para o tipo dele');
  await P.locator(`#pv-${idEns}-fxv-${fx1}`).fill('2'); await P.locator(`#pv-${idEns}-fxv-${fx1}`).press('Enter'); await w();
  await P.locator(`#pv-${idEns}-fxnovo`).click(); await w();
  const fx2 = await A(id => __acamp.camp.provisoes.find(p => p.id === id).fx[1].id, idEns);
  await P.locator(`#pv-${idEns}-fxt-${fx2}`).selectOption('barra'); await w();
  ok(await P.locator(`#pv-${idEns}-fxb-${fx2}`).inputValue() === 'SP' || await P.locator(`#pv-${idEns}-fxb-${fx2}`).inputValue() === 'Vida', 'a barra é escolhida entre as das fichas');
  await P.locator(`#pv-${idEns}-fxb-${fx2}`).selectOption('Vida'); await w();
  await P.locator(`#pv-${idEns}-fxv-${fx2}`).fill('abc'); await P.locator(`#pv-${idEns}-fxv-${fx2}`).press('Enter'); await w(250);
  ok(await A(id => __acamp.camp.provisoes.find(p => p.id === id).fx[1].val, idEns) === '10' && /Escreva um valor/.test(await P.locator('#toasts').innerText()), 'valor que não é número nem dados não entra (o aviso explica)');
  await P.locator(`#pv-${idEns}-fxv-${fx2}`).fill('2d6+3'); await P.locator(`#pv-${idEns}-fxv-${fx2}`).press('Enter'); await w();
  await P.locator(`#pv-${idEns}-fxnovo`).click(); await w();
  const fx3 = await A(id => __acamp.camp.provisoes.find(p => p.id === id).fx[2].id, idEns);
  await P.locator(`#pv-${idEns}-fxt-${fx3}`).selectOption('sob'); await w();
  await P.locator(`#pv-${idEns}-fxb-${fx3}`).selectOption('Vida'); await w();
  await campo(`#pv-${idEns}-fxv-${fx3}`, 12);
  await foto('acamp-racao-efeito');
  ok((await P.locator(`#pv-${idEns}-ef summary`).innerText()) === 'Ao comer: Conforto +5 · Força +2 (até o próximo descanso) · Vida +2d6+3 · Sobrevida 12 em Vida', 'o resumo diz tudo o que a ração faz: ' + await P.locator(`#pv-${idEns}-ef summary`).innerText());

  // ================= estrutura: só para alguns, e o que faz na ficha =================
  await aba('estrutura');
  await P.locator('#ml-novo').click(); await w(); await P.keyboard.type('Forja'); await P.keyboard.press('Enter'); await w();
  const idF = await A(() => __acamp.camp.melhorias[0].id);
  await campo(`#ml-conf-${idF}`, 10);
  await P.locator(`#ml-alvo-${idF}`).selectOption('alguns'); await w();
  ok((await P.locator(`[data-est="${idF}"] .marcas`).innerText()).includes('Ninguém escolhido'), 'só os escolhidos, sem ninguém marcado: diz que não vale para ninguém');
  await P.locator(`#ml-g-${idF}-Vila`).check(); await w();
  await P.locator(`#ml-p-${idF}-pc_lia`).check(); await w();
  ok(await A(id => JSON.stringify(__acamp.camp.melhorias.find(m => m.id === id).alvo), idF) === '{"todos":false,"pers":["pc_lia"],"grupos":["Vila"]}', 'vale para o grupo Vila e para a Lia');
  await P.locator(`#ml-${idF}-ef summary`).click(); await w();
  await P.locator(`#ml-${idF}-fxnovo`).click(); await w();
  const fxF = await A(id => __acamp.camp.melhorias.find(m => m.id === id).fx[0].id, idF);
  await P.locator(`#ml-${idF}-fxk-${fxF}`).selectOption('DFF'); await w();
  await P.locator(`#ml-${idF}-fxd-${fxF}`).selectOption('rodadas'); await w();
  ok(await P.locator(`#ml-${idF}-fxr-${fxF}`).inputValue() === '3', 'por rodadas: começa em 3');
  await foto('acamp-estrutura-alguns');
  ok((await P.locator('#estResumo').innerText()).includes('Há também o que vale só para alguns') && (await P.locator('#avisosCena').innerText()).includes('só para alguns'), 'o resumo e a cena avisam que há estrutura só para alguns');

  // ================= o descanso longo, com tudo isso =================
  await P.locator('#btLongo').click(); await w(300);
  let d = await dlg();
  await foto('acamp-descanso-servir');
  ok(await P.locator('#ds-sv').inputValue() === idEns && await P.locator('#ds-qtd').inputValue() === '1', 'a prévia já vem servindo o que o descanso serve, uma ração cada');
  ok(/Ensopado de javali dá para 2 de 3 \(abaixo, quem come\); o outro come do resto da lista, sem o efeito\./.test(d), 'o ensopado não dá para todos: a prévia diz para quantos dá — ' + d.slice(0, 260));
  const col = id => P.locator(`td[data-fx="${id}"]`).innerText().then(x => x.replace(/\s+/g, ' '));
  ok(/come Ensopado de javali/.test(await col('pc_dain')) && /Força \+2 \(até o próximo descanso\)/.test(await col('pc_dain')) && /Vida \+2d6\+3 \(rolado no descanso\)/.test(await col('pc_dain')), 'Dain come o ensopado: o que ele faz na ficha aparece na linha dele — ' + await col('pc_dain'));
  ok(/Defesa Física \+1 \(3 rodadas\)/.test(await col('pc_lia')) && /come Ensopado/.test(await col('pc_lia')), 'Lia come o ensopado e ganha o da forja (só para ela)');
  ok(!/Ensopado/.test(await col('pc_ogro')) && /Defesa Física \+1/.test(await col('pc_ogro')), 'o Ogro não come o ensopado (acabou), mas a forja vale para ele (grupo Vila)');
  const celula = (id, n) => P.locator(`#ds-${id}`).locator('xpath=ancestor::tr').locator('td').nth(n).innerText().then(x => x.replace(/\s+/g, ' '));
  const confDe = id => celula(id, 3);
  ok(await celula('pc_dain', 2) === '60 → 65' && await celula('pc_ogro', 2) === '40 → 45', 'Sanidade: só a da regra (+5) — o ensopado e a forja não mexem nela');
  ok(await confDe('pc_dain') === '30 → 45' && await confDe('pc_lia') === '50 → 75' && await confDe('pc_ogro') === '40 → 60', 'Conforto: a regra (+10), o ensopado (+5) para quem comeu, a forja (+10) para quem ela alcança — ' + [await confDe('pc_dain'), await confDe('pc_lia'), await confDe('pc_ogro')].join(' | '));
  await P.locator('#ds-sv').selectOption(''); await w(250);
  ok(!/Ensopado/.test(await col('pc_dain')) && /Gasta 3 de 12 rações \(Carne seca −3\)/i.test(await dlg()), 'servindo "a ordem da lista" na hora: come a carne seca, sem o efeito do ensopado');
  await P.locator('#ds-sv').selectOption(idEns); await w(250);
  await P.locator('#ds-qtd').fill('0'); await P.locator('#ds-qtd').press('Enter'); await w(250);
  ok(/não gasta provisões/.test(await dlg()) && !/Ensopado/.test(await col('pc_dain')), 'sem ração por personagem neste descanso, ninguém come (nem ganha o efeito)');
  await P.keyboard.press('Escape'); await w(200);
  ok(await A(() => __acamp.camp.provisoes.map(p => p.qtd).join()) === '10,2', 'fechar a prévia não muda nada');
  const nDi = await A(() => __acamp.camp.diario.length);
  await P.locator('#btLongo').click(); await w(300);
  ok(/os valores abaixo \(e o que vai para a ficha\) são para você aplicar/.test(await dlg()), 'sem mesa, a prévia avisa que o que vai para a ficha fica para o mestre aplicar');
  await P.locator('#ds-ok').click(); await w(300);
  ok(await A(() => __acamp.camp.provisoes.map(p => p.qtd).join()) === '9,0', 'o descanso serve o ensopado a dois e a carne seca ao terceiro');
  const di = await A(() => __acamp.camp.diario.map(x => x.texto).join(' | '));
  ok(/3 rações gastas · 2 comeram Ensopado de javali/.test(di) && !/Na ficha —/.test(di), 'o diário conta quantos comeram o ensopado (sem mesa, nada vai para a ficha): ' + di);
  ok(await A(id => __acamp.camp.servir.longo === id, idEns), 'o ensopado acabou, mas continua sendo o que o descanso longo serve (até o mestre trocar)');
  await P.locator('#toasts .toast button').click(); await w();
  ok(await A(() => __acamp.camp.provisoes.map(p => p.qtd).join()) === '10,2' && await A(() => __acamp.camp.diario.length) === nDi, 'o Desfazer devolve as rações e tira a linha do diário');

  // ================= a aura da emoção =================
  await aba('grupo');
  await P.locator('#roda .pers[data-id="pc_lia"]').click(); await w();
  ok(await P.locator('.emos button').count() === 11, 'no cartão da Lia: as dez emoções e "Nenhuma"');
  await P.locator('#emo-pc_lia-alegre').click(); await w();
  await P.mouse.move(5, 5); await w(600); await foto('acamp-aura');
  ok(await A(() => __acamp.camp.emo.pc_lia) === 'alegre' && await P.locator('#roda .pers[data-id="pc_lia"][data-emo="alegre"] .aura').count() === 1, 'escolher "Alegre" acende a aura em volta do retrato (sem mesa, a emoção fica no acampamento)');
  ok(await P.locator('#roda .pers[data-id="pc_lia"]').getAttribute('title') === 'Lia · Alegre' && /alegre/.test(await P.locator('#roda .pers[data-id="pc_lia"]').getAttribute('aria-label')), 'a dica e o leitor de tela dizem a emoção');
  const cor = await P.locator('#roda .pers[data-id="pc_lia"]').evaluate(e => getComputedStyle(e).getPropertyValue('--emo').trim());
  ok(cor === '#f2c94c', 'a aura tem a cor da emoção: ' + cor);
  ok(await P.evaluate(() => document.activeElement && document.activeElement.id === 'emo-pc_lia-alegre'), 'o cursor fica no botão escolhido');
  await P.locator('#emo-pc_lia-nada').click(); await w();
  ok(!(await A(() => 'pc_lia' in __acamp.camp.emo)) && await P.locator('#roda .pers[data-id="pc_lia"] .aura').count() === 0, '"Nenhuma" apaga a aura');
  await P.locator('#emo-pc_lia-raiva').click(); await w();
  await P.keyboard.press('Control+z'); await w();
  ok(!(await A(() => 'pc_lia' in __acamp.camp.emo)), 'e dá para desfazer');

  // ================= a caravana =================
  await aba('caravana');
  ok((await P.locator('#pane').innerText()).includes('Os veículos, os animais, a carga e quem viaja com o grupo.'), 'a caravana começa vazia, dizendo para que serve');
  await P.locator('#vc-novo').click(); await w(); await P.keyboard.type('Carroça grande'); await P.keyboard.press('Enter'); await w();
  const idV = await A(() => __acamp.camp.caravana.veiculos[0].id);
  await campo('#vc-c-' + idV, 100);
  await P.locator('#vc-e-' + idV).fill('roda bamba'); await P.locator('#vc-e-' + idV).press('Enter'); await w();
  await P.locator('#vc-novo').click(); await w(); await P.keyboard.type('Mula'); await P.keyboard.press('Enter'); await w();
  const idM = await A(() => __acamp.camp.caravana.veiculos[1].id);
  await P.locator('#vc-t-' + idM).selectOption('animal'); await w();
  await P.locator('#cg-novo').click(); await w(); await P.keyboard.type('Barris'); await P.keyboard.press('Enter'); await w();
  const idC = await A(() => __acamp.camp.caravana.carga[0].id);
  await campo('#cg-q-' + idC, 3); await campo('#cg-p-' + idC, 40);
  ok((await P.locator('#cv-peso').innerText()).replace(/\s+/g, ' ').includes('120 kg de 100 kg') && await P.locator('#cv-peso.demais').count() === 1 && (await P.locator('#cv-semlugar').innerText()).includes('120 kg de carga sem lugar'), 'o total da carga contra o que os veículos levam: carga demais, e sem lugar');
  await P.locator('#cg-v-' + idC).selectOption(idV); await w();
  ok((await P.locator('#vc-peso-' + idV).innerText()).replace(/\s+/g, ' ').includes('Carga demais 120 kg de 100 kg') && await P.locator('#cv-semlugar').count() === 0, 'pondo os barris na carroça: a carroça avisa que é carga demais');
  await P.locator('#gt-novo').click(); await w(); await P.keyboard.type('Tobias'); await P.keyboard.press('Enter'); await w();
  const idG = await A(() => __acamp.camp.caravana.gente[0].id);
  await P.locator('#gt-p-' + idG).fill('cocheiro'); await P.locator('#gt-p-' + idG).press('Enter'); await w();
  await P.locator('#gt-v-' + idG).selectOption(idV); await w();
  await P.locator('#vai-pc_dain').selectOption(idM); await w();
  ok(await A(() => { const c = __acamp.camp.caravana; return JSON.stringify([c.veiculos.map(v => [v.nome, v.tipo, v.cap, v.estado]), c.gente.map(g => [g.nome, g.papel, !!g.veiculo]), c.vai]); }) === JSON.stringify([[['Carroça grande', 'carroca', 100, 'roda bamba'], ['Mula', 'animal', 0, '']], [['Tobias', 'cocheiro', true]], { pc_dain: idM }]),
    'veículos com tipo, capacidade e estado; o cocheiro na carroça; Dain na mula');
  await foto('acamp-caravana');
  await P.locator('#vc-x-' + idV).click(); await w();
  ok(await A(() => __acamp.camp.caravana.carga[0].veiculo === null && __acamp.camp.caravana.gente[0].veiculo === null) && /ficaram sem lugar/.test(await P.locator('#toasts').innerText()), 'tirar a carroça deixa a carga e o cocheiro sem lugar (o aviso diz)');
  await P.locator('#toasts .toast button').click(); await w();
  ok(await A(id => __acamp.camp.caravana.veiculos.length === 2 && __acamp.camp.caravana.carga[0].veiculo === id, idV), 'e o Desfazer traz a carroça de volta, com a carga dentro');
  await P.setViewportSize({ width: 400, height: 820 }); await w(400);
  if (!(await P.locator('#pane').isVisible())) { await P.locator('#btPainel').click(); await w(300); }
  const cabe = await A(() => { const p = document.getElementById('pane'); return p.clientWidth > 200 && p.scrollWidth <= p.clientWidth + 1; });
  ok(cabe && await P.locator('#vc-novo').isVisible(), 'na tela estreita, a aba Caravana aparece e não estoura para os lados');
  await foto('acamp-caravana-400');
  await P.setViewportSize({ width: 1366, height: 860 }); await w(300);

  if (t.errs.length) console.log('ERROS NO CONSOLE:\n' + t.errs.join('\n'));
  ok(t.errs.length === 0, 'nenhum erro no console (' + t.errs.length + ')');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
