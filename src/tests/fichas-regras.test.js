// Fichas sem mesa (tudo neste navegador): o que entrou com as regras novas — as opções das barras (começa em, pode
// ficar negativa), itens que dão barra e defesa, as 13 defesas específicas, os bônus temporários, as bolsas (poções
// que mexem em barra e dão bônus; bombas e afins que só gastam) e os campos Sexo, partes íntimas e Panteão.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = (id, nome) => ({ id, nome, raca: 'Elfa da neve', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'E', DES: 'C', AGI: 'B', VIT: 'D', CAN: 'A' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 0, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens: [{ id: 'it1', nome: 'Manto da Geada', equipado: true, bonus: { FOR: 0, DES: 0, VIT: 0, CAN: 2, AGI: 0 } }],
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: 'CAN*2' }, { id: 'gelo', nome: 'Gelo de Selene', fml: '20' }], notas: '' });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_sel', 'Selene'), pc('pc_out', 'Outra')], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_sel', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas', w: 1320, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const S0 = (fn, a) => P.evaluate(fn, a);
  const sel = () => S0(() => JSON.parse(JSON.stringify(S.personagens.find(x => x.id === 'pc_sel'))));
  const calc = () => S0(() => { const c = calcular(S.personagens.find(x => x.id === 'pc_sel')); return { tot: c.tot, def: c.def, defEsp: c.defEsp, tmp: c.tmp, rec: c.recursos.map(r => ({ id: r.id, max: r.max, min: r.min, inicio: r.inicio, eq: r.eq })) }; });
  const barrinhas = () => P.locator('#barrinhas .bz').evaluateAll(els => els.map(e => [e.querySelector('.bzn').textContent, e.querySelector('.bzv').textContent, Math.round(parseFloat(e.querySelector('.bzt i').style.width)), e.classList.contains('neg')]));
  const toast = () => P.locator('.toast').last().innerText();
  const j = JSON.stringify;

  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  ok(await P.locator('#f_nome').inputValue() === 'Selene', 'a ficha abre');
  const antes = j(await sel());
  ok(await P.evaluate(() => new Promise(r => setTimeout(() => r(localStorage.getItem('urgm_calc_atributos_v1')), 700))).then(v => { const p = JSON.parse(v).personagens[0]; return !('bolsa' in p) && !('defEsp' in p) && !p.recursos.some(r => 'comeca' in r || 'piso' in r); }), 'abrir uma ficha antiga não acrescenta nada a ela (nenhum campo novo é gravado à toa)');

  // ---------- Sexo, partes íntimas e Panteão ----------
  ok(await P.locator('#f_sexo').inputValue() === '' && await P.locator('#f_tampenis').count() === 1 && await P.locator('#f_partes').count() === 1, 'sem o sexo informado, aparecem os dois campos (tamanho do pênis e tipo das partes íntimas)');
  await P.locator('#f_tampenis').fill('15 cm'); await P.locator('#f_partes').fill('exemplo A'); await w(200);
  await P.locator('#f_sexo').selectOption('F'); await w(300);
  ok(await P.locator('#f_tampenis').count() === 0 && await P.locator('#f_partes').inputValue() === 'exemplo A', 'ficha do sexo feminino: fica só o "Tipo das partes íntimas"');
  await P.locator('#f_sexo').selectOption('M'); await w(300);
  ok(await P.locator('#f_partes').count() === 0 && await P.locator('#f_tampenis').inputValue() === '15 cm', 'do sexo masculino: fica só o "Tamanho do pênis" (o que estava no outro campo não se perde)');
  await P.locator('#f_sexo').selectOption('O'); await w(300);
  ok(await P.locator('#f_partes').inputValue() === 'exemplo A' && await P.locator('#f_tampenis').inputValue() === '15 cm', '"Outro": os dois campos');
  await P.locator('#f_sexo').selectOption('F'); await w(200);
  await P.locator('#f_panteao').fill('Selene, a Lua de Gelo'); await w(500);
  const id1 = await sel();
  ok(id1.sexo === 'F' && id1.partes === 'exemplo A' && id1.tamPenis === '15 cm' && id1.panteao === 'Selene, a Lua de Gelo', 'Sexo, partes íntimas e Panteão ficam guardados na ficha: ' + j([id1.sexo, id1.partes, id1.panteao]));

  // ---------- opções da barra: começa em, pode ficar negativa ----------
  ok(await P.locator('details.resopc').count() === 3 && !(await P.locator('details.resopc').first().evaluate(e => e.open)), 'cada barra tem as "Opções da barra", fechadas');
  await P.locator('[data-resopc="gelo"] summary').click(); await w(150);
  await P.locator('[data-rescomeca="gelo"]').fill('4'); await P.locator('[data-rescomeca="gelo"]').press('Enter'); await w(350);
  let c = await calc();
  ok(c.rec[2].inicio === 4 && c.rec[2].max === 20 && (await sel()).recursos[2].comeca === '4', '"Começa em 4" fica na ficha');
  ok(await P.locator('[data-resatual="gelo"]').inputValue() === '4' && j((await barrinhas())[2].slice(0, 3)) === j(['Gelo de Selene', '4/20', 20]), 'sem valor anotado, a barra já aparece em 4 de 20 (no campo e na barrinha): ' + j(await barrinhas()));
  ok(await P.locator('[data-resopc="gelo"]').evaluate(e => e.open) && /começa em 4/.test(await P.locator('[data-resopc="gelo"] .resopc-r').innerText()), 'as opções continuam abertas depois de mudar, e o resumo diz "começa em 4"');
  await P.locator('[data-resatual="gelo"]').fill('13'); await P.locator('#f_nome').click(); await w(300);
  ok((await P.locator('[data-rescheio="gelo"]').innerText()).trim() === 'Voltar a 4', 'com outro valor anotado, o botão de encher vira "Voltar a 4"');
  await P.locator('[data-rescheio="gelo"]').click(); await w(300);
  ok(await P.locator('[data-resatual="gelo"]').inputValue() === '4' && !((await sel()).estado.rec || {}).gelo, 'e leva a barra de volta ao começo');
  await P.locator('[data-rescomeca="gelo"]').fill('MAX/2'); await P.locator('[data-rescomeca="gelo"]').press('Enter'); await w(350);
  ok((await calc()).rec[2].inicio === 10 && await P.locator('[data-resatual="gelo"]').inputValue() === '10', 'o começo aceita fórmula (MAX/2 = 10)');
  await P.locator('[data-rescomeca="gelo"]').fill('MAX /'); await P.locator('[data-rescomeca="gelo"]').press('Enter'); await w(350);
  ok(/Começa em:/.test(await P.locator('[data-resopc="gelo"] .fmlerr').innerText()) && (await calc()).rec[2].inicio === null, 'fórmula errada avisa embaixo do campo (e a barra volta a começar cheia)');
  await P.locator('[data-rescomeca="gelo"]').fill('4'); await P.locator('[data-rescomeca="gelo"]').press('Enter'); await w(300);
  // negativa
  await P.locator('[data-resopc="hp"] summary').click(); await w(150);
  await P.locator('[data-respiso="hp"]').fill('10'); await P.locator('[data-respiso="hp"]').press('Enter'); await w(350);
  ok((await calc()).rec[0].min === -10 && /até −10/.test(await P.locator('.rescard').first().locator('.de').innerText()), 'a barra de HP pode ficar negativa até −10');
  await P.locator('[data-resatual="hp"]').fill('-6'); await w(250);
  const bn = (await barrinhas())[0];
  ok(bn[1] === '−6/100' && bn[2] === 60 && bn[3] === true, 'HP em −6: a barrinha mostra a parte negativa (60% do piso), riscada — ' + j(bn));
  await P.locator('#f_nome').click(); await w(250);
  ok(await P.locator('.rescard .atual.neg').count() === 1, 'e o campo do valor fica em destaque');
  await P.locator('[data-resatual="hp"]').fill('-45'); await P.locator('#f_nome').click(); await w(350);
  ok((await sel()).estado.rec.hp === -10 && /não desce de −10/.test(await toast()), 'abaixo do piso, o valor fica no piso ao sair do campo, com aviso: ' + await toast());
  await P.locator('[data-resatual="sp"]').fill('-3'); await P.locator('#f_nome').click(); await w(350);
  ok((await sel()).estado.rec.sp === 0, 'a barra sem piso continua parando em zero');

  // ---------- itens que somam numa barra e numa defesa ----------
  await P.locator('[data-itmais="it1"]').selectOption('rec:hp'); await w(300);
  await P.locator('[data-itx="rec"][data-ch="hp"]').fill('25'); await P.locator('[data-itx="rec"][data-ch="hp"]').press('Tab'); await w(350);
  c = await calc();
  ok(c.rec[0].max === 125 && c.rec[0].eq === 25 && /Inclui \+25 dos equipamentos/.test(await P.locator('.rescard').first().innerText()), 'o item passa a dar +25 no máximo do HP (100 → 125), e o cartão da barra avisa');
  await P.locator('[data-itmais="it1"]').selectOption('def:GELO'); await w(300);
  await P.locator('[data-itx="def"][data-ch="GELO"]').fill('5'); await P.locator('[data-itx="def"][data-ch="GELO"]').press('Tab'); await w(350);
  ok((await calc()).defEsp.GELO === 5 && /HP \+25 · Defesa contra gelo \+5/.test(await P.locator('#itExtras').innerText()), 'e +5 na defesa contra gelo; embaixo da tabela, o resumo do que os itens somam: ' + await P.locator('#itExtras').innerText());
  ok(await P.locator('[data-itmais="it1"] option[value="rec:hp"]').count() === 0 && await P.locator('[data-itmais="it1"] option[value="rec:sp"]').count() === 1, 'o que o item já soma sai da lista de escolha');
  await P.locator('[data-itemon="it1"]').uncheck(); await w(300);
  c = await calc();
  ok(c.rec[0].max === 100 && c.defEsp.GELO === 0, 'desequipado, o item deixa de somar na barra e na defesa');
  await P.locator('[data-itemon="it1"]').check(); await w(300);

  // ---------- a aba Defesas ----------
  await P.locator('[data-abaatr="def"]').click(); await w(300);
  ok(await P.locator('table.defs tbody tr').count() === 13 && await P.locator('table.defs .icodef').count() === 13, 'a aba Defesas lista as 13 defesas específicas, cada uma com o ícone dela');
  const nomes = await P.locator('table.defs .aname').allInnerTexts();
  ok(j(nomes) === j(['Fogo', 'Água', 'Pedra', 'Gelo', 'Trovão', 'Planta', 'Vento', 'Luz', 'Sombras', 'Psicológico', 'Corte', 'Perfuração', 'Contusão']), 'na ordem: ' + nomes.join(', '));
  await P.locator('[data-defesp="GELO"]').fill('12'); await P.locator('[data-defesp="GELO"]').press('Tab'); await w(300);
  await P.locator('[data-defesp="FOGO"]').fill('-4'); await P.locator('[data-defesp="FOGO"]').press('Tab'); await w(300);
  const lg = await P.locator('table.defs tbody tr').nth(3).locator('td').allInnerTexts();
  ok((await calc()).defEsp.GELO === 17 && lg[2].trim() === '+5' && lg[4].trim() === '17' && (await sel()).defEsp.GELO === 12 && (await sel()).defEsp.FOGO === -4, 'Gelo: 12 da ficha + 5 do item = 17; Fogo aceita valor negativo (fraqueza): ' + j(lg));
  ok((await P.locator('[data-abaatr="def"] .mk').innerText()).trim() === '2', 'a aba mostra quantas defesas o personagem tem (2)');
  await P.locator('[data-rolar="GELO"]').click(); await w(300);
  ok(/Defesa contra gelo 17/.test(await S0(() => S.log[0].det)) && await S0(() => S.log[0].total >= 1 && S.log[0].total <= 17), 'dá para rolar uma defesa específica (fica no registro): ' + await S0(() => S.log[0].det));
  await P.locator('[data-abaatr="atr"]').click(); await w(300);
  ok(await P.locator('table.attr').count() === 1 && await P.locator('table.defs').count() === 0, 'de volta à aba Atributos');

  // ---------- bônus temporários ----------
  const totAntes = (await calc()).tot, spAntes = (await calc()).rec[1].max;
  await P.locator('[data-tmpadd]').click(); await w(300);
  const idT = await S0(() => Object.keys(S.personagens[0].estado.tmp)[0]);
  ok(await P.evaluate(id => document.activeElement && document.activeElement.dataset.tmpn === id, idT) && j((await calc()).tot) === j(totAntes), 'um bônus novo nasce valendo zero (nada muda ainda) e com o cursor no nome');
  await P.locator(`[data-tmpn="${idT}"]`).fill('Chá de neve'); await P.locator(`[data-tmpk="${idT}"]`).selectOption('CAN'); await w(250);
  await P.locator(`[data-tmpv="${idT}"]`).fill('5'); await P.locator(`[data-tmpv="${idT}"]`).press('Tab'); await w(300);
  await P.locator(`[data-tmpd="${idT}"]`).fill('até o descanso'); await w(300);
  c = await calc();
  ok(c.tot.CAN === totAntes.CAN + 5 && c.tmp.CAN === 5 && c.rec[1].max === spAntes + 10, 'o bônus soma no atributo (+5 de Canalização) e entra nas fórmulas (SP = CAN*2 sobe 10)');
  ok(/\+5 temp\./.test(await P.locator('table.attr tbody tr').nth(3).innerText()) && /1 somando agora/.test(await P.locator('#painelTmp .hd').innerText()), 'a tabela de atributos mostra "+5 temp." na linha da Canalização');
  const bt = (await sel()).estado.tmp[idT];
  ok(bt.n === 'Chá de neve' && bt.k === 'CAN' && bt.v === 5 && bt.d === 'até o descanso', 'o bônus fica no estado do personagem, com a duração anotada: ' + j(bt));
  await P.locator(`[data-tmpon="${idT}"]`).uncheck(); await w(300);
  ok((await calc()).tot.CAN === totAntes.CAN && await P.locator('.tmprow.off').count() === 1, 'desligado, para de somar (e continua na lista, apagado)');
  await P.locator(`[data-tmpon="${idT}"]`).check(); await w(300);
  await P.locator(`[data-tmpk="${idT}"]`).selectOption('GELO'); await w(300);
  ok((await calc()).defEsp.GELO === 22 && (await calc()).tot.CAN === totAntes.CAN, 'o bônus também pode ir para uma defesa específica (Gelo 17 → 22)');
  await P.locator(`[data-tmpdel="${idT}"]`).click(); await w(300);
  ok(await P.locator('.tmprow').count() === 0 && /Chá de neve/.test(await toast()), 'tirar o bônus avisa, com Desfazer');
  await P.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(300);
  ok(await P.locator('.tmprow').count() === 1 && (await calc()).defEsp.GELO === 22, 'Desfazer devolve o bônus');
  // como o bônus acaba: anotação (quem desliga é você), até o próximo descanso (o Acampamento tira) ou rodadas
  await P.locator(`[data-tmpk="${idT}"]`).selectOption('CAN'); await w(300);
  ok(await P.locator(`[data-tmpmodo="${idT}"]`).inputValue() === 'nota', 'o bônus feito à mão começa com a duração anotada');
  await P.locator(`[data-tmpmodo="${idT}"]`).selectOption('descanso'); await w(300);
  let b2 = (await sel()).estado.tmp[idT];
  ok(b2.ate === 'descanso' && b2.r === undefined && b2.d === 'até o próximo descanso' && await P.locator(`[data-tmprow="${idT}"] .tmpate`).count() === 1 && await P.evaluate(id => document.activeElement && document.activeElement.dataset.tmpmodo === id, idT),
    '"Até o descanso": quem tira é o descanso do Acampamento (e o cursor fica no seletor)');
  await P.locator(`[data-tmpmodo="${idT}"]`).selectOption('rodadas'); await w(300);
  b2 = (await sel()).estado.tmp[idT];
  ok(b2.r === 3 && !b2.ate && b2.d === '3 rodadas' && (await P.locator(`[data-tmprow="${idT}"] .tmprod b`).innerText()) === '3 rodadas', 'por rodadas: começa em 3');
  for (let i = 0; i < 2; i++) { await P.locator(`[data-tmprod="${idT}"][data-d="-1"]`).click(); await w(200); }
  ok((await sel()).estado.tmp[idT].r === 1 && (await calc()).tot.CAN === totAntes.CAN + 5 && (await P.locator(`[data-tmprow="${idT}"] .tmprod b`).innerText()) === '1 rodada', 'descontando duas rodadas: falta 1, e o bônus ainda soma');
  await P.locator(`[data-tmprod="${idT}"][data-d="-1"]`).click(); await w(300);
  ok((await sel()).estado.tmp[idT].r === 0 && (await calc()).tot.CAN === totAntes.CAN && await P.locator(`[data-tmprow="${idT}"].off`).count() === 1 && (await P.locator(`[data-tmprow="${idT}"] .tmprod b`).innerText()) === 'acabou' && await P.locator(`[data-tmprod="${idT}"][data-d="-1"]`).isDisabled(),
    'com 0, acabou: não soma mais, a linha fica apagada e o "−" desliga');
  ok(!/somando agora/.test(await P.locator('#painelTmp .hd').innerText()), 'e o painel não o conta entre os que estão somando');
  ok(await P.evaluate(id => document.activeElement && document.activeElement.dataset.tmprod === id && document.activeElement.dataset.d === '1', idT), '(o cursor vai para o "+")');
  await P.locator(`[data-tmprod="${idT}"][data-d="1"]`).click(); await w(300);
  ok((await sel()).estado.tmp[idT].r === 1 && (await calc()).tot.CAN === totAntes.CAN + 5, 'uma rodada a mais: volta a somar');
  await P.locator(`[data-tmpmodo="${idT}"]`).selectOption('nota'); await w(300);
  b2 = (await sel()).estado.tmp[idT];
  ok(b2.r === undefined && !b2.ate && await P.locator(`[data-tmpd="${idT}"]`).count() === 1 && (await calc()).tot.CAN === totAntes.CAN + 5, 'de volta à anotação');
  await P.locator(`[data-tmpdel="${idT}"]`).click(); await w(300);

  // ---------- bolsas ----------
  ok(await P.locator('#painelBolsa [data-ababolsa]').count() === 5 && /Nenhuma poção/.test(await P.locator('#painelBolsa .bd').innerText()), 'o painel Bolsas tem as cinco abas (Poções, Bombas, Runas, Munições, Materiais), vazias');
  await P.locator('[data-boladd="pocao"]').click(); await w(300);
  const idP = await S0(() => S.personagens[0].bolsa[0].id);
  await P.locator(`[data-bolnome="${idP}"]`).fill('Poção de cura'); await w(200);
  await P.locator(`[data-bolrec="${idP}"]`).selectOption('hp'); await w(250);
  await P.locator(`[data-bolval="${idP}"]`).fill('30'); await P.locator(`[data-bolval="${idP}"]`).press('Tab'); await w(250);
  await P.locator(`[data-bolstep="${idP}"][data-d="1"]`).click(); await w(250);
  let s1 = await sel();
  ok(s1.bolsa[0].nome === 'Poção de cura' && s1.bolsa[0].rec === 'hp' && s1.bolsa[0].val === '30' && s1.estado.qtd[idP] === 2 && (await P.locator('[data-ababolsa="pocao"] .mk').innerText()).trim() === '2', 'a poção fica na ficha (o que ela faz) e a quantidade, no estado do personagem: ' + j([s1.bolsa[0], s1.estado.qtd]));
  ok(s1.estado.rec.hp === -10, '(o HP está em −10)');
  await P.locator(`[data-boluse="${idP}"]`).click(); await w(300);
  const previa = await P.locator('.bolconf').innerText();
  ok(/Usar Poção de cura\?/.test(previa) && /HP −10 → 20 \(\+30\)/.test(previa) && /sobra 1/.test(previa) && (await sel()).estado.qtd[idP] === 2, '"Usar" mostra antes o que vai acontecer, sem gastar: ' + previa.replace(/\n/g, ' | '));
  await P.locator('[data-bolnao]').click(); await w(250);
  ok(await P.locator('.bolconf').count() === 0 && (await sel()).estado.rec.hp === -10, 'Cancelar fecha a prévia sem mudar nada');
  await P.locator(`[data-boluse="${idP}"]`).click(); await w(250); await P.locator(`[data-bolsim="${idP}"]`).click(); await w(350);
  s1 = await sel();
  ok(s1.estado.rec.hp === 20 && s1.estado.qtd[idP] === 1 && await P.locator('[data-resatual="hp"]').inputValue() === '20', '"Usar agora": o HP sobe 30 (−10 → 20) e sobra uma poção');
  ok(/Poção de cura: HP −10 → 20 \(\+30\) · resta 1/.test(await toast()) && /usou Poção de cura · HP −10 → 20 \(\+30\) · resta 1/.test(await S0(() => S.log[0].det)) && await S0(() => S.log[0].quem === 'Selene · Poção de cura' && S.log[0].total === null), 'um aviso com Desfazer, e a linha no registro: ' + await S0(() => S.log[0].det));
  await P.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(350);
  s1 = await sel();
  ok(s1.estado.rec.hp === -10 && s1.estado.qtd[idP] === 2 && /desfeito/.test(await S0(() => S.log[0].det)), 'Desfazer devolve a poção e o HP (e o registro diz que foi desfeito)');
  // poção com rolagem e bônus temporário
  await P.locator(`[data-bolval="${idP}"]`).fill('2d6+3'); await P.locator(`[data-bolval="${idP}"]`).press('Tab'); await w(250);
  await P.locator(`[data-bolbk="${idP}"]`).selectOption('AGI'); await w(250);
  await P.locator(`[data-bolbv="${idP}"]`).fill('4'); await P.locator(`[data-bolbv="${idP}"]`).press('Tab'); await w(250);
  await P.locator(`[data-bolbd="${idP}"]`).fill('3 turnos'); await w(250);
  await P.locator(`[data-boluse="${idP}"]`).click(); await w(250);
  ok(/HP −10 \+ 2d6\+3, rolado na hora · Agilidade \+4 \(3 turnos\)/.test(await P.locator('.bolconf').innerText()), 'com dados, a prévia avisa que rola na hora, e mostra o bônus: ' + (await P.locator('.bolconf').innerText()).replace(/\n/g, ' | '));
  const agiAntes = (await calc()).tot.AGI;
  await P.locator(`[data-bolsim="${idP}"]`).click(); await w(350);
  s1 = await sel();
  const rolado = await S0(() => S.log[0].total);
  ok(rolado >= 5 && rolado <= 15 && s1.estado.rec.hp === -10 + rolado && Object.keys(s1.estado.tmp).length === 1 && (await calc()).tot.AGI === agiAntes + 4, 'a poção rola 2d6+3 (' + rolado + '), soma no HP e põe +4 de Agilidade como bônus temporário');
  ok(/2d6\+3 → 2d6 \[\d, \d\] \+3 = \d+/.test(await S0(() => S.log[0].det)) && await P.locator('.tmprow').count() === 1 && await P.locator('.tmprow .tmpn').inputValue() === 'Poção de cura' && await P.locator('.tmprow .tmpd').inputValue() === '3 turnos', 'o registro guarda os dados rolados, e o bônus aparece em "Bônus temporários" com o nome da poção: ' + await S0(() => S.log[0].det));
  await P.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(350);
  s1 = await sel();
  ok(s1.estado.rec.hp === -10 && Object.keys(s1.estado.tmp || {}).length === 0 && s1.estado.qtd[idP] === 2 && (await calc()).tot.AGI === agiAntes, 'Desfazer tira também o bônus que a poção tinha dado');
  await P.locator(`[data-bolval="${idP}"]`).fill('abc'); await P.locator(`[data-bolval="${idP}"]`).press('Tab'); await w(300);
  ok(await P.locator(`[data-bolval="${idP}"].ruim`).count() === 1 && /Escreva um valor/.test(await P.locator('#painelBolsa .fmlerr').innerText()), 'valor que não é número nem dados fica marcado, com a dica');
  await P.locator(`[data-bolval="${idP}"]`).fill('-5'); await P.locator(`[data-bolval="${idP}"]`).press('Tab'); await w(250);
  // bombas: um clique gasta e avisa
  await P.locator('[data-ababolsa="bomba"]').click(); await w(250);
  await P.locator('[data-boladd="bomba"]').click(); await w(300);
  const idB = await S0(() => S.personagens[0].bolsa[1].id);
  await P.locator(`[data-bolnome="${idB}"]`).fill('Bomba de fumaça'); await P.locator(`[data-bolqtd="${idB}"]`).fill('3'); await P.locator(`[data-bolqtd="${idB}"]`).press('Tab'); await w(300);
  ok(await P.locator('#painelBolsa .bolfx').count() === 0, 'a bomba não tem efeito para configurar (só nome, quantidade e anotação)');
  const hpB = (await sel()).estado.rec.hp;
  await P.locator(`[data-boluse="${idB}"]`).click(); await w(350);
  s1 = await sel();
  ok(await P.locator('.bolconf').count() === 0 && s1.estado.qtd[idB] === 2 && s1.estado.rec.hp === hpB && /usou Bomba de fumaça · restam 2/.test(await S0(() => S.log[0].det)), 'usar a bomba: um clique gasta uma e registra; nada é aplicado sozinho');
  await P.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(300);
  ok((await sel()).estado.qtd[idB] === 3, 'e dá para desfazer');
  await P.locator(`[data-bolstep="${idB}"][data-d="-1"]`).click(); await P.locator(`[data-bolstep="${idB}"][data-d="-1"]`).click(); await P.locator(`[data-bolstep="${idB}"][data-d="-1"]`).click(); await w(300);
  ok((await sel()).estado.qtd[idB] === 0 && await P.locator(`[data-boluse="${idB}"]`).isDisabled() && await P.locator(`[data-bolstep="${idB}"][data-d="-1"]`).isDisabled(), 'sem unidades, "Usar" e "−" ficam desligados (a quantidade não fica negativa)');
  await P.locator(`[data-boldel="${idB}"]`).click(); await w(300);
  ok((await sel()).bolsa.length === 1 && !(idB in (await sel()).estado.qtd), 'tirar o item da bolsa leva a quantidade junto');
  await P.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(300);
  ok((await sel()).bolsa.length === 2 && (await sel()).bolsa[1].nome === 'Bomba de fumaça', 'e Desfazer o devolve');

  // ---------- duplicar: os itens e as poções da cópia continuam apontando para as barras dela ----------
  await P.locator('[data-act="dup"]').click(); await w(400);
  const copia = await S0(() => { const p = S.personagens[S.personagens.length - 1], c = calcular(p); return { nome: p.nome, hpMax: c.recursos[0].max, eq: c.recursos[0].eq, rec: (p.estado || {}).rec || null, bolsa: p.bolsa.map(b => b.rec || ''), qtd: p.estado.qtd, gelo: c.recursos[2].inicio }; });
  ok(copia.nome === 'Selene (cópia)' && copia.hpMax === 125 && copia.eq === 25 && copia.rec === null && copia.bolsa[0] === 'hp' && copia.gelo === 4, 'a cópia mantém o item somando no HP e a poção apontando para ele, e nasce com as barras no começo: ' + j(copia));

  // ---------- a ficha que não usa nada disso continua igual ----------
  await P.locator('#lista .pc', { has: P.locator('.nm', { hasText: /^Outra$/ }) }).click(); await w(300);
  ok(await S0(() => { const p = S.personagens.find(x => x.id === 'pc_out'); return !('bolsa' in p) && !('defEsp' in p) && !p.estado; }), 'a outra ficha, em que ninguém mexeu, não ganhou campo nenhum');

  // ---------- tudo continua lá depois de recarregar ----------
  await w(500);
  await P.reload({ waitUntil: 'load' }); await w(1200);
  const fim = await S0(() => { const p = S.personagens.find(x => x.id === 'pc_sel'), c = calcular(p); return { sexo: p.sexo, pant: p.panteao, com: p.recursos[2].comeca, piso: p.recursos[0].piso, hp: p.estado.rec.hp, max: c.recursos[0].max, gelo: c.defEsp.GELO, bolsa: p.bolsa.length, aba: S.abaBolsa }; });
  ok(fim.sexo === 'F' && fim.pant === 'Selene, a Lua de Gelo' && fim.com === '4' && fim.piso === '10' && fim.max === 125 && fim.gelo === 17 && fim.bolsa === 2 && fim.aba === 'bomba', 'depois de recarregar, tudo continua lá: ' + j(fim));
  void antes;

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
