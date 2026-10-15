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
  const foto = async nome => { if (process.env.FOTOS) await P.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };

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
  // (lote 6) o equipamento é um cartão: a chave, o nome e só os bônus que ele tem; os números ficam em "Editar"
  ok(await P.locator('table.items').count() === 0 && await P.locator('[data-itcard="it1"]').count() === 1 && (await P.locator('[data-itcard="it1"] .itbon').innerText()).replace(/\s+/g, ' ').trim() === 'CAN +2' && await P.locator('[data-itembon]').count() === 0,
    'o cartão do Manto mostra só o que ele soma ("CAN +2"), sem a tabela de números: ' + await P.locator('[data-itcard="it1"] .itbon').innerText());
  await P.locator('[data-itemed="it1"]').click(); await w(300);
  ok(await P.locator('[data-itcard="it1"] [data-itembon]').count() === 12 && await P.locator('[data-itembon="it1|EMB"]').count() === 1 && await P.locator('[data-itemed="it1"]').innerText() === 'Fechar', '"Editar" abre os doze números (atributos, secundários com o Embate, defesas)');
  await P.locator('[data-itembon="it1|DFF"]').fill('3'); await P.locator('[data-itembon="it1|DFF"]').press('Tab'); await w(350);
  ok((await sel()).itens[0].bonus.DFF === 3 && /CAN \+2\s*·\s*DEF F \+3/.test(await P.locator('[data-itcard="it1"] .itbon').innerText()) && /DEF F \+3/.test(await P.locator('#itTotal').innerText()), 'mudar um número: o cartão e o "Em uso somam" acompanham');
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
  ok(/HP \+25/.test(await P.locator('[data-itcard="it1"] .itbon').innerText()) && /Def\. Gelo \+5/.test(await P.locator('[data-itcard="it1"] .itbon').innerText()), 'o cartão mostra também a barra e a defesa específica que o item soma');

  // ---------- (lote 6) a relíquia e os grupos de troca ----------
  await P.locator('[data-itembon="it1|DFF"]').fill('0'); await P.locator('[data-itembon="it1|DFF"]').press('Tab'); await w(300);
  await P.locator('[data-itemrel="it1"]').check(); await w(300);
  ok((await sel()).itens[0].reliquia === true && await P.locator('[data-itcard="it1"].rel .itrel').count() === 1, 'relíquia: o cartão fica dourado, com o ícone (e nada nas contas muda)');
  await P.locator('[data-itemtroca="it1"]').fill('Manto'); await P.locator('[data-itemtroca="it1"]').press('Tab'); await w(300);
  await P.locator('[data-itemed="it1"]').click(); await w(250);
  for (const nome of ['Manto da Brasa', 'Manto do Vento']) {
    await P.locator('#painelItens [data-act="additem"]').click(); await w(300);
    ok(await P.evaluate(() => document.activeElement && 'itemnome' in document.activeElement.dataset), '"+ Item": o cartão novo vem aberto, com o cursor no nome');
    await P.keyboard.type(nome); await w(200);
    const id = await P.evaluate(() => document.activeElement.dataset.itemnome);
    await P.locator('[data-itemtroca="' + id + '"]').fill(nome === 'Manto da Brasa' ? ' manto ' : 'MANTO'); await P.locator('[data-itemtroca="' + id + '"]').press('Tab'); await w(300);
    await P.locator('[data-itemed="' + id + '"]').click(); await w(250);
  }
  let it = (await sel()).itens;
  ok(it.length === 3 && it.every(x => x.equipado !== false) && /mais de um item equipado/.test(await P.locator('.itdobro').innerText()), 'três mantos no grupo, todos equipados: um aviso calmo, sem mexer em nada');
  ok(await P.locator('[data-itcard] .ittroca').count() === 3 && await P.locator('#gruposTroca option').count() >= 1, 'cada cartão mostra o grupo de troca dele; o campo sugere os grupos que já existem');
  await P.locator('[data-itemon="' + it[1].id + '"]').uncheck(); await w(250);
  await P.locator('[data-itemon="' + it[1].id + '"]').check(); await w(350);
  it = (await sel()).itens;
  ok(it[1].equipado === true && it[0].equipado === false && it[2].equipado === false && /Equipou Manto da Brasa no lugar de Manto da Geada e Manto do Vento\./.test(await toast()), 'equipar a Brasa guarda a Geada e o Vento (o mesmo grupo, sem diferença de maiúsculas e espaços): ' + await toast());
  ok(await P.locator('[data-itcard="it1"].guardado').count() === 1 && await P.locator('.itdobro').count() === 0 && (await calc()).tot.CAN === (await S0(() => calcular(S.personagens.find(x => x.id === 'pc_sel')).base.CAN)), 'o cartão guardado fica apagado, o aviso sai e o +2 do Manto da Geada deixa de somar');
  await P.locator('.toast button').last().click(); await w(350);
  it = (await sel()).itens;
  ok(it[0].equipado !== false && it[1].equipado === false && it[2].equipado !== false, 'Desfazer: tudo volta como estava antes de equipar a Brasa (ela guardada, os outros dois equipados)');
  await P.locator('[data-itemdel="' + it[2].id + '"]').click(); await w(300);
  ok((await sel()).itens.length === 2 && /saiu da ficha/.test(await toast()), 'tirar um item avisa, com Desfazer');
  await P.locator('.toast button').last().click(); await w(300);
  ok((await sel()).itens.length === 3 && (await sel()).itens[2].nome === 'Manto do Vento', 'e o Desfazer o traz de volta, no mesmo lugar');
  await P.locator('[data-itemdel="' + it[2].id + '"]').click(); await w(200);
  await P.locator('[data-itemdel="' + it[1].id + '"]').click(); await w(200);
  await P.locator('[data-itemed="it1"]').click(); await w(250);
  await P.locator('[data-itemrel="it1"]').uncheck(); await P.locator('[data-itemtroca="it1"]').fill(''); await P.locator('[data-itemtroca="it1"]').press('Tab'); await w(300);
  await P.locator('[data-itemed="it1"]').click(); await w(250);
  ok((await sel()).itens.length === 1 && !(await sel()).itens[0].reliquia && !('troca' in (await sel()).itens[0]) && (await sel()).itens[0].equipado !== false, '(de volta: só o Manto da Geada, equipado, sem relíquia nem grupo)');

  // ---------- (lote 6) "Só funciona com…": os itens complementares ----------
  // A Espada do Gelo em dois níveis (o mesmo grupo de troca); a Bainha de Selene só vale com uma delas (o grupo:
  // qualquer nível serve) e a Luva da Geada, só com a Espada do Gelo I (o item).
  const novoItem = async (nome, troca) => {
    await P.locator('#painelItens [data-act="additem"]').click(); await w(300);
    await P.keyboard.type(nome); await w(150);
    const id = await P.evaluate(() => document.activeElement.dataset.itemnome);
    if (troca) { await P.locator('[data-itemtroca="' + id + '"]').fill(troca); await P.locator('[data-itemtroca="' + id + '"]').press('Tab'); await w(250); }
    return id;
  };
  const fecharItem = async id => { await P.locator('[data-itemed="' + id + '"]').click(); await w(200); };
  const eqs = async () => (await sel()).itens.filter(x => x.equipado !== false).map(x => x.nome).join(', ');
  const chipReq = async id => ((await P.locator('[data-itcard="' + id + '"] .itreq').count()) ? (await P.locator('[data-itcard="' + id + '"] .itreq').innerText()).replace(/\s+/g, ' ').trim() : '');
  const e1 = await novoItem('Espada do Gelo I', 'Espada de gelo'); await fecharItem(e1);
  const e2 = await novoItem('Espada do Gelo II', 'Espada de gelo'); await fecharItem(e2);
  await P.locator('[data-itemon="' + e2 + '"]').uncheck(); await w(250);
  await P.locator('[data-itemon="' + e1 + '"]').uncheck(); await w(250);
  const dff0 = (await calc()).def.DFF;
  const ba = await novoItem('Bainha de Selene');
  await P.locator('[data-itembon="' + ba + '|DFF"]').fill('2'); await P.locator('[data-itembon="' + ba + '|DFF"]').press('Tab'); await w(300);
  ok((await calc()).def.DFF === dff0 + 2 && await chipReq(ba) === '', '(a Bainha nova, equipada, soma DEF F +2 — e funciona sozinha)');
  const opsReq = await P.locator('[data-itemreq="' + ba + '"] option').allInnerTexts();
  ok(j(opsReq) === j(['Funciona sozinho', 'Grupo de troca: Espada de gelo', 'Item: Manto da Geada', 'Item: Espada do Gelo I', 'Item: Espada do Gelo II']) && await P.locator('[data-itemreq="' + ba + '"]').inputValue() === '',
    'no "Editar", o "Só funciona com…": sozinho (o padrão), um grupo de troca (qualquer item dele serve) ou um item da ficha: ' + j(opsReq));
  await P.locator('[data-itemreq="' + ba + '"]').selectOption('g:Espada de gelo'); await w(300);
  ok((await sel()).itens.find(x => x.id === ba).req === 'g:Espada de gelo' && await chipReq(ba) === 'sem efeito · Espada de gelo' && await P.locator('[data-itcard="' + ba + '"].semfx').count() === 1 && (await calc()).def.DFF === dff0 && await eqs() === 'Manto da Geada, Bainha de Selene',
    'só com a espada: equipada sem nenhuma espada, a Bainha fica "sem efeito" (o cartão avisa, e nada é equipado ou guardado sozinho) e o +2 deixa de somar: ' + await chipReq(ba));
  ok(await P.evaluate(() => document.activeElement && document.activeElement.dataset.itemreq !== undefined), '(o cursor continua no "Só funciona com…")');
  await fecharItem(ba);
  await P.locator('[data-itemon="' + e1 + '"]').check(); await w(300);
  ok(await chipReq(ba) === 'com Espada de gelo' && await P.locator('[data-itcard="' + ba + '"].semfx').count() === 0 && (await calc()).def.DFF === dff0 + 2, 'com a Espada do Gelo I equipada, a Bainha vale ("com Espada de gelo"), e o +2 volta a somar');
  const lu = await novoItem('Luva da Geada');
  await P.locator('[data-itemreq="' + lu + '"]').selectOption('i:' + e1); await w(300);
  await fecharItem(lu);
  ok(await chipReq(lu) === 'com Espada do Gelo I', 'a Luva da Geada, só com a Espada do Gelo I (o item, não o grupo)');
  // guardar a espada guarda as duas
  await P.locator('[data-itemon="' + e1 + '"]').uncheck(); await w(350);
  ok(await eqs() === 'Manto da Geada' && /Guardou Espada do Gelo I; guardou junto: Bainha de Selene e Luva da Geada\./.test(await toast()) && (await calc()).def.DFF === dff0,
    'guardar a espada guarda junto a Bainha e a Luva (o aviso diz): ' + await toast());
  await P.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(350);
  ok(await eqs() === 'Manto da Geada, Espada do Gelo I, Bainha de Selene, Luva da Geada' && (await sel()).itens.every(x => !x.volta), 'Desfazer: as três de volta, como estavam');
  await P.locator('[data-itemon="' + e1 + '"]').uncheck(); await w(350);
  // equipar a Bainha sem espada: a espada vem junto (a última usada), e a Luva, que tinha saído com ela, volta
  await P.locator('[data-itemon="' + ba + '"]').check(); await w(350);
  ok(await eqs() === 'Manto da Geada, Espada do Gelo I, Bainha de Selene, Luva da Geada' && /Equipou Bainha de Selene; junto: Espada do Gelo I e Luva da Geada\./.test(await toast()),
    'equipar a Bainha sem espada equipa a espada junto (a última usada) — e a Luva, que tinha saído com ela, volta: ' + await toast());
  // trocar o nível da espada: a Bainha fica (qualquer nível serve); a Luva (só com a I) sai — e volta com a I
  await P.locator('[data-itemon="' + e2 + '"]').check(); await w(350);
  ok(await eqs() === 'Manto da Geada, Espada do Gelo II, Bainha de Selene' && /Equipou Espada do Gelo II no lugar de Espada do Gelo I; guardou junto: Luva da Geada\./.test(await toast()),
    'a Espada do Gelo II no lugar da I: a Bainha continua (o grupo serve), a Luva (só com a I) é guardada: ' + await toast());
  await P.locator('[data-itemon="' + e1 + '"]').check(); await w(350);
  ok(await eqs() === 'Manto da Geada, Espada do Gelo I, Bainha de Selene, Luva da Geada' && /Equipou Espada do Gelo I no lugar de Espada do Gelo II; junto: Luva da Geada\./.test(await toast()), 'a I de volta traz a Luva junto: ' + await toast());
  await foto('fichas-itens-complementares');
  // a espada sai da ficha: a Luva (que dependia só dela) passa a funcionar sozinha; a Bainha, com a II, continua presa ao grupo
  await P.locator('[data-itemdel="' + e1 + '"]').click(); await w(300);
  ok(await chipReq(lu) === '' && await chipReq(ba) === 'sem efeito · Espada de gelo', 'tirar a Espada do Gelo I da ficha: a Luva fica sem requisito (não prende a nada que não existe); a Bainha, sem espada equipada, fica "sem efeito"');
  await P.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(300);
  ok(await chipReq(lu) === 'com Espada do Gelo I' && await chipReq(ba) === 'com Espada de gelo', '(Desfazer devolve a espada, e as duas voltam a depender dela)');
  for (const id of [lu, ba, e2, e1]) { await P.locator('[data-itemdel="' + id + '"]').click(); await w(200); }
  ok((await sel()).itens.length === 1 && (await calc()).def.DFF === dff0, '(de volta: só o Manto da Geada)');

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
  await P.locator(`[data-fxadd="${idP}"]`).selectOption('barra'); await w(300);
  await P.locator(`[data-fxrec="${idP}|0"]`).selectOption('hp'); await w(250);
  await P.locator(`[data-fxval="${idP}|0"]`).fill('30'); await P.locator(`[data-fxval="${idP}|0"]`).press('Tab'); await w(250);
  await P.locator(`[data-bolstep="${idP}"][data-d="1"]`).click(); await w(250);
  let s1 = await sel();
  ok(s1.bolsa[0].nome === 'Poção de cura' && j(s1.bolsa[0].fx) === j([{ k: 'barra', rec: 'hp', val: '30' }]) && s1.estado.qtd[idP] === 2 && (await P.locator('[data-ababolsa="pocao"] .mk').innerText()).trim() === '2', 'a poção fica na ficha (o que ela faz: a lista de efeitos) e a quantidade, no estado do personagem: ' + j([s1.bolsa[0], s1.estado.qtd]));
  ok(s1.estado.rec.hp === -10, '(o HP está em −10)');
  await P.locator(`[data-boluse="${idP}"]`).click(); await w(300);
  const previa = await P.locator('.bolconf').innerText();
  ok(/Usar Poção de cura/.test(previa) && /HP −10 → 20 \(\+30\)/.test(previa) && /sobra 1/.test(previa) && (await sel()).estado.qtd[idP] === 2 && await P.locator(`[data-bolem="${idP}"] option`).count() === 2, '"Usar" mostra antes o que vai acontecer (e em quem: ela ou a outra), sem gastar: ' + previa.replace(/\n/g, ' | '));
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
  await P.locator(`[data-fxval="${idP}|0"]`).fill('2d6+3'); await P.locator(`[data-fxval="${idP}|0"]`).press('Tab'); await w(250);
  await P.locator(`[data-fxadd="${idP}"]`).selectOption('bonus'); await w(300);
  await P.locator(`[data-fxbk="${idP}|1"]`).selectOption('AGI'); await w(250);
  await P.locator(`[data-fxbv="${idP}|1"]`).fill('4'); await P.locator(`[data-fxbv="${idP}|1"]`).press('Tab'); await w(250);
  await P.locator(`[data-fxbd="${idP}|1"]`).fill('3 turnos'); await w(250);
  await P.locator(`[data-boluse="${idP}"]`).click(); await w(250);
  ok(/HP −10 \+ 2d6\+3, rolado na hora · Agilidade \+4 \(3 turnos\)/.test(await P.locator('.bolconf').innerText()), 'com dados, a prévia avisa que rola na hora, e mostra o bônus: ' + (await P.locator('.bolconf').innerText()).replace(/\n/g, ' | '));
  const agiAntes = (await calc()).tot.AGI;
  await P.locator(`[data-bolsim="${idP}"]`).click(); await w(350);
  s1 = await sel();
  const rolado = s1.estado.rec.hp + 10;
  ok(rolado >= 5 && rolado <= 15 && Object.keys(s1.estado.tmp).length === 1 && (await calc()).tot.AGI === agiAntes + 4, 'a poção rola 2d6+3 (' + rolado + '), soma no HP e põe +4 de Agilidade como bônus temporário');
  ok(/2d6\+3 → 2d6 \[\d, \d\] \+3 = \d+/.test(await S0(() => S.log[0].det)) && (await S0(() => S.log[0].dd)).length === 2 && await P.locator('.tmprow').count() === 1 && await P.locator('.tmprow .tmpn').inputValue() === 'Poção de cura' && await P.locator('.tmprow .tmpd').inputValue() === '3 turnos', 'o registro guarda os dados rolados, e o bônus aparece em "Bônus temporários" com o nome da poção: ' + await S0(() => S.log[0].det));
  await P.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(350);
  s1 = await sel();
  ok(s1.estado.rec.hp === -10 && Object.keys(s1.estado.tmp || {}).length === 0 && s1.estado.qtd[idP] === 2 && (await calc()).tot.AGI === agiAntes, 'Desfazer tira também o bônus que a poção tinha dado');
  await P.locator(`[data-fxval="${idP}|0"]`).fill('abc'); await P.locator(`[data-fxval="${idP}|0"]`).press('Tab'); await w(300);
  ok(await P.locator(`[data-fxval="${idP}|0"].ruim`).count() === 1 && /Escreva um valor/.test(await P.locator('#painelBolsa .fmlerr').innerText()), 'valor que não é número nem dados fica marcado, com a dica');
  await P.locator(`[data-fxval="${idP}|0"]`).fill('-5'); await P.locator(`[data-fxval="${idP}|0"]`).press('Tab'); await w(250);
  // mais efeitos (sobrevida e condição; o bônus passa a durar até o descanso) e o uso em OUTRA personagem
  await P.locator(`[data-fxdur="${idP}|1"]`).selectOption('descanso'); await w(250);
  await P.locator(`[data-fxadd="${idP}"]`).selectOption('sob'); await w(300);
  await P.locator(`[data-fxrec="${idP}|2"]`).selectOption('hp'); await w(200);
  await P.locator(`[data-fxval="${idP}|2"]`).fill('15'); await P.locator(`[data-fxval="${idP}|2"]`).press('Tab'); await w(250);
  await P.locator(`[data-fxadd="${idP}"]`).selectOption('cond'); await w(300);
  await P.locator(`[data-fxc="${idP}|3"]`).selectOption('bencao'); await w(200);
  await P.locator(`[data-fxr="${idP}|3"]`).fill('2'); await P.locator(`[data-fxr="${idP}|3"]`).press('Tab'); await w(250);
  s1 = await sel();
  ok(j(s1.bolsa[0].fx) === j([{ k: 'barra', rec: 'hp', val: '-5' }, { k: 'bonus', bk: 'AGI', bv: 4, dur: 'descanso', r: 0, bd: '' }, { k: 'sob', rec: 'hp', val: '15' }, { k: 'cond', c: 'bencao', r: 2 }]), 'quatro efeitos na mesma poção: ' + j(s1.bolsa[0].fx));
  await P.locator(`[data-boluse="${idP}"]`).click(); await w(250);
  await P.locator(`[data-bolem="${idP}"]`).selectOption('pc_out'); await w(300);
  const pOutra = (await P.locator('.bolconf').innerText()).replace(/\n/g, ' | ');
  ok(/HP 100 → 95 \(−5\)/.test(pOutra) && /Agilidade \+4 \(até o próximo descanso\)/.test(pOutra) && /Sobrevida 15 em HP/.test(pOutra) && /Condição: Abençoado \(2 rodadas\) — só pela cena, no token/.test(pOutra), 'em outra personagem, a prévia é a dela (o HP dela, cheio) e avisa que a condição é pela cena: ' + pOutra);
  await P.locator(`[data-bolsim="${idP}"]`).click(); await w(350);
  const outra = await S0(() => JSON.parse(JSON.stringify(S.personagens.find(x => x.id === 'pc_out').estado || {})));
  s1 = await sel();
  ok(outra.rec.hp === 95 && outra.sob.hp === 15 && Object.values(outra.tmp).some(b => b.k === 'AGI' && b.v === 4 && b.ate === 'descanso') && s1.estado.qtd[idP] === 1 && s1.estado.rec.hp === -10 && !Object.keys(s1.estado.tmp || {}).length,
    'usada na outra: ela recebe o efeito (HP −5, sobrevida, bônus até o descanso) e a bolsa da Selene perde uma — a Selene não muda: ' + j(outra));
  ok(/Selene · Poção de cura em Outra/.test(await S0(() => S.log[0].quem)) && /usou Poção de cura em Outra/.test(await S0(() => S.log[0].det)), 'o registro diz em quem foi: ' + await S0(() => S.log[0].det));
  await P.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(350);
  const outra2 = await S0(() => JSON.parse(JSON.stringify(S.personagens.find(x => x.id === 'pc_out').estado || {})));
  ok((outra2.rec || {}).hp === undefined && (outra2.sob || {}).hp === undefined && !Object.keys(outra2.tmp || {}).length && (await sel()).estado.qtd[idP] === 2, 'Desfazer devolve a poção e tira o efeito da outra: ' + j(outra2));
  // (a poção volta a ser só a de −5, para o resto do teste)
  for (let k = 3; k >= 1; k--) { await P.locator(`[data-fxdel="${idP}|${k}"]`).click(); await w(250); }
  ok(j((await sel()).bolsa[0].fx) === j([{ k: 'barra', rec: 'hp', val: '-5' }]), 'o × tira um efeito');
  // bombas: um clique gasta e avisa
  await P.locator('[data-ababolsa="bomba"]').click(); await w(250);
  await P.locator('[data-boladd="bomba"]').click(); await w(300);
  const idB = await S0(() => S.personagens[0].bolsa[1].id);
  await P.locator(`[data-bolnome="${idB}"]`).fill('Bomba de fumaça'); await P.locator(`[data-bolqtd="${idB}"]`).fill('3'); await P.locator(`[data-bolqtd="${idB}"]`).press('Tab'); await w(300);
  ok(await P.locator('#painelBolsa .bolfxs').count() === 0, 'a bomba não tem efeito para configurar (só nome, quantidade e anotação)');
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
  const copia = await S0(() => { const p = S.personagens[S.personagens.length - 1], c = calcular(p); return { nome: p.nome, hpMax: c.recursos[0].max, eq: c.recursos[0].eq, rec: (p.estado || {}).rec || null, bolsa: p.bolsa.map(b => (b.fx && b.fx[0] && b.fx[0].rec) || b.rec || ''), qtd: p.estado.qtd, gelo: c.recursos[2].inicio }; });
  ok(copia.nome === 'Selene (cópia)' && copia.hpMax === 125 && copia.eq === 25 && copia.rec === null && copia.bolsa[0] === 'hp' && copia.gelo === 4, 'a cópia mantém o item somando no HP e a poção apontando para ele, e nasce com as barras no começo: ' + j(copia));

  // ---------- a ficha que não usa nada disso continua igual ----------
  await P.locator('#lista .pc', { has: P.locator('.nm', { hasText: /^Outra$/ }) }).click(); await w(300);
  ok(await S0(() => { const p = S.personagens.find(x => x.id === 'pc_out'); return !('bolsa' in p) && !('defEsp' in p) && (!p.estado || Object.values(p.estado).every(v => v && typeof v === 'object' && !Object.keys(v).length)); }), 'a outra ficha (fora o uso desfeito da poção) não ganhou campo nenhum');

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
