// Fichas sem mesa (tudo neste navegador): os quadros que entraram por último — a barra de XP junto do nível, o quadro
// de Ascensão (os pontos das árvores), o corpo com ferimentos e a aba de Missões. Sem mesa não há jogadores nem o que
// esconder: tudo aparece e tudo pode ser mexido.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = (id, nome, extra) => Object.assign({ id, nome, raca: 'Elfa da neve', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'E', DES: 'C', AGI: 'B', VIT: 'D', CAN: 'A' }, pctProprio: null, poderes: [],
  skills: { arvores: ['a1'], pontos: { pr: 2 }, alocados: { n1: 1 } }, defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 0, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens: [], recursos: [{ id: 'hp', nome: 'HP', fml: '100' }], notas: '' }, extra);
const bib = { nome: 'Teste', pools: [{ id: 'pr', nome: 'Raça', cor: '#4E8C7D', padrao: 0 }, { id: 'pc', nome: 'Classe', cor: '#D9A441', padrao: 0 }], naturezas: [], usos: [], tipos: { pequeno: { nome: 'Pequeno', custo: 1 } },
  arvores: [{ id: 'a1', nome: 'Elfa da neve', categoria: 'raca', nodes: [{ id: 'n1', nome: 'Sangue frio', pais: [], usos: [], graus: [{ custos: { pr: 2 }, texto: 'x' }] }] }] };
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_sel', 'Selene', { modoAtr: 'livre', atrLivre: { FOR: 5, DES: 12, VIT: 8, CAN: 14, AGI: 10 } }), pc('pc_npc', 'Guarda')], situacoes: [], tabelas: [], log: [], bib, sel: 'pc_sel', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas', w: 1320, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const S0 = (fn, a) => P.evaluate(fn, a);
  const sel = () => S0(() => JSON.parse(JSON.stringify(S.personagens.find(x => x.id === 'pc_sel'))));
  const des = () => S0(() => calcular(S.personagens.find(x => x.id === 'pc_sel')).tot.DES);
  const toast = () => P.locator('.toast').last().innerText();
  const desfazer = async () => { await P.locator('.toast.comacao button').click(); await w(300); };
  const j = JSON.stringify;

  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  ok(await P.locator('#f_nome').inputValue() === 'Selene', 'a ficha abre');
  ok(await P.evaluate(() => new Promise(r => setTimeout(() => r(localStorage.getItem('urgm_calc_atributos_v1')), 700))).then(v => { const p = JSON.parse(v).personagens[0]; return !p.estado || (!('xp' in p.estado) && !('fer' in p.estado) && !('mis' in p.estado)); }), 'abrir a ficha não acrescenta nada a ela (nem XP, nem ferimentos, nem missões)');

  // ---------- a barra de XP ----------
  ok(await P.locator('#xpBox').count() === 1 && await P.locator('#f_xp').inputValue() === '0' && await P.locator('#f_xpmin').inputValue() === '0' && await P.locator('#f_xpmax').inputValue() === '30' && (await P.locator('.xpfalta').innerText()) === 'faltam 30', 'a ficha de quem joga (distribuição livre) tem a barra de XP junto do nível: 0 de 30 no nível 3 (10 por nível)');
  await P.locator('#f_xp').fill('+12'); await P.locator('#f_xp').press('Enter'); await w(300);
  ok((await sel()).estado.xp.v === 12 && /XP de Selene: 0 \+ 12 = 12 \(faltam 18\)/.test(await toast()) && await P.locator('.xpbar i').evaluate(e => e.style.width) === '40%', '"+12" soma, avisa a conta e a barra anda (40%): ' + await toast());
  await P.locator('#f_xp').fill('−5'); await P.locator('#f_xp').press('Enter'); await w(300);
  ok((await sel()).estado.xp.v === 7, '"−5" subtrai (7)');
  await desfazer();
  ok((await sel()).estado.xp.v === 12, 'e o Desfazer devolve os 12');
  await P.locator('#f_xp').fill('-99'); await P.locator('#f_xp').press('Enter'); await w(300);
  ok((await sel()).estado.xp.v === 0 && await P.locator('#f_xp').inputValue() === '0', 'não desce abaixo do mínimo');
  await P.locator('#f_xp').fill('abc'); await P.locator('#f_xp').press('Enter'); await w(250);
  ok((await sel()).estado.xp.v === 0 && await P.locator('#f_xp').inputValue() === '0', 'o que não é número não muda nada');
  await P.locator('#f_xpmin').fill('10'); await P.locator('#f_xpmin').press('Tab'); await w(300);
  await P.locator('#f_xpmax').fill('110'); await P.locator('#f_xpmax').press('Tab'); await w(300);
  let x = (await sel()).estado.xp;
  ok(x.min === 10 && x.max === 110 && await P.locator('#f_xp').inputValue() === '10', 'mínimo e máximo são editáveis a qualquer hora (10 e 110); o XP acompanha o mínimo');
  await P.locator('#f_xp').fill('35'); await P.locator('#f_xp').press('Enter'); await w(300);
  ok(await P.locator('.xpbar i').evaluate(e => e.style.width) === '25%' && (await P.locator('.xpfalta').innerText()) === 'faltam 75' && await P.locator('#xpSubir').count() === 0, 'a barra conta entre o mínimo e o máximo (35 de 10–110 → 25%)');
  await P.locator('#f_xpmax').fill('5'); await P.locator('#f_xpmax').press('Tab'); await w(300);
  ok((await sel()).estado.xp.max === 10 && await P.locator('#f_xpmax').inputValue() === '10', 'o máximo não fica abaixo do mínimo');
  await P.locator('#f_xpmin').fill(''); await P.locator('#f_xpmin').press('Tab'); await w(250);
  await P.locator('#f_xpmax').fill(''); await P.locator('#f_xpmax').press('Tab'); await w(300);
  x = (await sel()).estado.xp;
  ok(!('min' in x) && !('max' in x) && await P.locator('#f_xpmax').inputValue() === '30' && await P.locator('#f_xpmin').inputValue() === '0', 'apagar os campos volta ao de costume (0 e 10 por nível)');
  ok(await P.locator('#xpSubir').count() === 1 && await P.locator('.xpbar.cheia').count() === 1 && (await P.locator('.xpfalta').innerText()) === 'cheia', 'com 35 de 30 a barra está cheia e oferece "Subir de nível"');
  await P.locator('#xpSubir').click(); await w(250);
  ok(/Subir Selene do nível 3 para o 4\? O XP fica em 5 \(o que passou de 30\) e o máximo passa a 40\./.test(await P.locator('#xpBox .relconf').innerText()) && (await sel()).level === 3, 'pergunta antes, dizendo o que muda — e nada mudou ainda');
  await P.locator('#xpNao').click(); await w(250);
  ok(await P.locator('#xpBox .relconf').count() === 0 && (await sel()).level === 3, '"Cancelar" deixa como está');
  const limAntes = await S0(() => calcular(S.personagens[0]).limite);
  await P.locator('#xpSubir').click(); await w(200); await P.locator('#xpSim').click(); await w(400);
  let s = await sel();
  ok(s.level === 4 && s.estado.xp.v === 5 && !('max' in s.estado.xp) && await P.locator('#f_level').inputValue() === '4' && await P.locator('#f_xpmax').inputValue() === '40' && await P.locator('#xpSubir').count() === 0, 'confirmado: nível 4, XP 5 (a sobra), máximo 40');
  ok(await S0(() => calcular(S.personagens[0]).limite) > limAntes, 'e o nível novo vale nas contas da ficha (mais pontos para distribuir)');
  await desfazer();
  s = await sel();
  ok(s.level === 3 && s.estado.xp.v === 35 && await P.locator('#f_level').inputValue() === '3', 'o Desfazer devolve o nível 3 com os 35 de XP');
  // o nível mais alto da tabela: não há para onde subir
  const topo = await S0(() => Math.max(...S.cfg.niveis.map(r => +r.lvl)));
  await P.locator('#f_level').selectOption(String(topo)); await w(300);
  await P.locator('#f_xp').fill('99999'); await P.locator('#f_xp').press('Enter'); await w(300);
  ok(await P.locator('#xpSubir').isDisabled(), 'no último nível da tabela, "Subir de nível" fica desligado');
  await P.locator('#f_level').selectOption('3'); await w(250); await P.locator('#f_xp').fill('4'); await P.locator('#f_xp').press('Enter'); await w(250);
  // quem não joga: sem a barra, a não ser que já tenha XP
  await P.locator('#lista .pc', { hasText: 'Guarda' }).click(); await w(350);
  ok(await P.locator('#xpBox').count() === 0, 'ficha que segue a tabela (um NPC) não mostra a barra de XP');
  await P.locator('#lista .pc', { hasText: 'Selene' }).click(); await w(350);

  // ---------- Ascensão ----------
  ok(await P.locator('#painelAsc .ascrow').count() === 2 && (await P.locator('#painelAsc [data-asc="pr"] .ascconta').innerText()).replace(/\s+/g, ' ') === '2 gastos · 0 livres' && await P.locator('[data-asctot="pr"]').inputValue() === '2' && await P.locator('[data-asctot="pc"]').inputValue() === '0',
    'o quadro de Ascensão mostra cada tipo de ponto: Raça 2 (2 gastos, 0 livres) e Classe 0');
  ok(await P.locator('[data-ascstep="pc|-1"]').isDisabled(), 'não dá para tirar ponto de quem tem zero');
  await P.locator('[data-ascstep="pr|1"]').click(); await P.locator('[data-ascstep="pr|1"]').click(); await w(300);
  ok((await sel()).skills.pontos.pr === 4 && (await P.locator('#painelAsc [data-asc="pr"] .ascconta').innerText()).replace(/\s+/g, ' ') === '2 gastos · 2 livres' && /Raça de Selene: 3 → 4 \(2 livres\)/.test(await toast()), 'dar dois pontos de Raça: 4, com 2 livres — "' + await toast() + '"');
  await desfazer();
  ok((await sel()).skills.pontos.pr === 3 && await P.locator('[data-asctot="pr"]').inputValue() === '3', 'o Desfazer volta o último ponto');
  await P.locator('[data-asctot="pc"]').fill('5'); await P.locator('[data-asctot="pc"]').press('Tab'); await w(300);
  ok((await sel()).skills.pontos.pc === 5, 'também dá para digitar o total (Classe 5)');
  await P.locator('[data-asctot="pr"]').fill('1'); await P.locator('[data-asctot="pr"]').press('Tab'); await w(300);
  ok(await P.locator('#painelAsc [data-asc="pr"] .ascconta.warn').count() === 1 && /gastou mais do que tem/.test(await P.locator('#painelAsc [data-asc="pr"] .ascconta').innerText()) && (await sel()).skills.alocados.n1 === 1, 'tirar pontos já gastos avisa ("gastou mais do que tem") e não mexe no que está alocado');
  await P.locator('[data-asctot="pr"]').fill('3'); await P.locator('[data-asctot="pr"]').press('Tab'); await w(250);
  await P.locator('[data-ascir]').click(); await w(400);
  ok(await P.locator('#ficha [data-sub="skills"].on').count() === 1 && (await P.locator('.poolbar [data-skpontos="pr"]').inputValue()) === '3', '"Gastar em Skills" abre a aba Skills, que mostra os mesmos pontos');
  await P.locator('.poolbar [data-skpontos="pr"]').fill('6'); await P.locator('.poolbar [data-skpontos="pr"]').press('Tab'); await w(350);
  ok(await P.locator('[data-asctot="pr"]').inputValue() === '6', 'e o que muda lá aparece no quadro (são os mesmos pontos)');
  await P.locator('[data-ascstep="pr|-1"]').click(); await w(350);
  ok(await P.locator('.poolbar [data-skpontos="pr"]').inputValue() === '5', 'e o contrário também');

  // ---------- corpo e ferimentos ----------
  await P.locator('#lista .pc', { hasText: 'Guarda' }).click(); await w(350);
  ok(await P.locator('#painelCorpo svg').count() === 0 && await P.locator('[data-corpo="usar"]').count() === 1, 'numa ficha que não é de jogador, o corpo fica desligado até alguém pedir');
  await P.locator('[data-corpo="usar"]').click(); await w(300);
  ok(await P.locator('#painelCorpo svg .parte').count() === 12 && await P.locator('[data-fernovo]').isDisabled(), 'ligado: o boneco com 12 partes; "+ Ferimento" espera a escolha de uma parte');
  const desG = await S0(() => calcular(S.personagens[1]).tot.DES);
  await P.locator('[data-parte="bracoE"]').click(); await w(250);
  ok(await P.locator('[data-parte="bracoE"].sel').count() === 1 && (await P.locator('.fertit').innerText()) === 'Braço esquerdo' && !(await P.locator('[data-fernovo]').isDisabled()), 'clicar no braço esquerdo escolhe a parte');
  await P.locator('[data-fernovo]').click(); await w(300);
  const fid = await S0(() => Object.keys(S.personagens[1].estado.fer)[0]);
  ok(await P.locator(`[data-fert="${fid}"]`).count() === 1 && (await P.locator('.fertxt').innerText()).trim() === 'Corte leve', 'o ferimento nasce como um corte leve, já aberto para descrever');
  await P.locator(`[data-fert="${fid}"]`).selectOption('perf'); await w(250);
  await P.locator(`[data-ferg="${fid}"]`).selectOption('2'); await w(250);
  await P.locator(`[data-fers="${fid}|sg"]`).check(); await w(250);
  await P.locator(`[data-fers="${fid}|inf"]`).check(); await w(250);
  ok((await P.locator('.fertxt').innerText()).trim() === 'Perfuração média · sangrando, infeccionado' && await P.locator('[data-parte="bracoE"].g2').count() === 1 && (await P.locator('[data-parte="bracoE"] .pn').textContent()) === '1', 'tipo, gravidade e estado: "Perfuração média · sangrando, infeccionado"; no boneco, o braço fica marcado');
  ok(await S0(() => calcular(S.personagens[1]).tot.DES) === desG && await P.locator(`[data-ferv="${fid}"]`).isDisabled(), 'sem penalidade, nenhuma conta muda');
  await P.locator(`[data-ferk="${fid}"]`).selectOption('DES'); await w(350);
  ok(await S0(() => calcular(S.personagens[1]).tot.DES) === desG - 1 && await P.locator(`[data-ferv="${fid}"]`).inputValue() === '1', 'escolhida a Destreza, a penalidade começa em −1');
  await P.locator(`[data-ferv="${fid}"]`).fill('3'); await P.locator(`[data-ferv="${fid}"]`).press('Tab'); await w(350);
  ok(await S0(() => calcular(S.personagens[1]).tot.DES) === desG - 3 && await S0(f => S.personagens[1].estado.fer[f].v, fid) === -3 && (await P.locator('#painelTmp .chipfer').innerText()).includes('−3 Destreza'), 'digitando 3: −3 de Destreza, guardada como penalidade, e o quadro de bônus temporários diz de onde vem');
  await P.locator(`[data-fern="${fid}"]`).fill('flecha de caçador'); await P.locator(`[data-fern="${fid}"]`).press('Tab'); await w(300);
  ok(await S0(f => S.personagens[1].estado.fer[f].n, fid) === 'flecha de caçador' && (await P.locator('.fernota').first().innerText()).includes('flecha de caçador'), 'a anotação fica guardada e aparece na linha');
  await P.locator(`[data-ferp="${fid}"]`).selectOption('peE'); await w(300);
  ok(await P.locator('[data-parte="peE"].g2').count() === 1 && await P.locator('[data-parte="bracoE"].g2').count() === 0 && (await P.locator('.fertit').innerText()) === 'Pé esquerdo', 'dá para mudar o ferimento de lugar (o quadro acompanha)');
  await P.locator('[data-fertodos]').click(); await w(250);
  await P.locator('[data-parte="cabeca"]').click(); await w(200); await P.locator('[data-fernovo]').click(); await w(300);
  ok(await S0(() => Object.keys(S.personagens[1].estado.fer).length) === 2 && /2 ferimentos abertos · 1 com penalidade/.test(await P.locator('#painelCorpo .hd .hint').innerText()), 'um segundo ferimento, na cabeça: o cabeçalho conta os abertos e os que pesam');
  await P.locator('[data-fertodos]').click(); await w(250);
  await P.locator(`[data-fercura="${fid}"]`).click(); await w(350);
  ok(await S0(() => Object.keys(S.personagens[1].estado.fer).length) === 1 && await S0(() => calcular(S.personagens[1]).tot.DES) === desG && /Curado: Perfuração média/.test(await toast()), '"Curado" tira o ferimento e a penalidade: ' + await toast());
  await desfazer();
  ok(await S0(() => Object.keys(S.personagens[1].estado.fer).length) === 2 && await S0(() => calcular(S.personagens[1]).tot.DES) === desG - 3, 'e o Desfazer devolve os dois');
  await P.locator('[data-corpo="parar"]').click(); await w(350);
  ok(await P.locator('#painelCorpo svg').count() === 0 && await S0(() => !S.personagens[1].estado.fer && !S.personagens[1].usaCorpo) && await S0(() => calcular(S.personagens[1]).tot.DES) === desG, '"Deixar de usar" tira o corpo e os ferimentos');
  await desfazer();
  ok(await P.locator('#painelCorpo svg .parte').count() === 12 && await S0(() => Object.keys(S.personagens[1].estado.fer).length) === 2, 'e também dá para desfazer');
  await P.locator('#lista .pc', { hasText: 'Selene' }).click(); await w(350);
  ok(await des() === 12 && await P.locator('#painelCorpo svg').count() === 0, 'cada ficha tem o seu corpo: a da Selene não mudou');

  // ---------- missões ----------
  await P.locator('#ficha [data-sub="missoes"]').click(); await w(300);
  ok(await P.locator('[data-misnova="g"]').count() === 1 && await P.locator('[data-misnova="p"]').count() === 1 && await P.locator('.miscard').count() === 0 && await P.locator('.misdica').count() === 0, 'a aba Missões: do grupo e do personagem, vazias (sem mesa, nada de "escondida")');
  await P.locator('[data-misnova="g"]').click(); await w(300);
  const gid = await S0(() => Object.keys(S.missoes)[0]);
  await P.locator(`[data-mist="g|${gid}"]`).fill('Escoltar a caravana'); await P.locator(`[data-mist="g|${gid}"]`).press('Tab'); await w(250);
  await P.locator(`[data-misd="g|${gid}"]`).fill('Três dias de estrada.'); await w(150);
  await P.locator(`[data-misoadd="g|${gid}"]`).click(); await w(250);
  await P.locator(`[data-misoadd="g|${gid}"]`).click(); await w(250);
  const oids = await S0(g => Object.keys(S.missoes[g].o).sort((a, b) => S.missoes[g].o[a].n - S.missoes[g].o[b].n), gid);
  await P.locator(`[data-misot="g|${gid}|${oids[0]}"]`).fill('Sair ao amanhecer'); await P.locator(`[data-misot="g|${gid}|${oids[1]}"]`).fill('Atravessar o desfiladeiro'); await w(200);
  await P.locator(`[data-misok="g|${gid}|${oids[0]}"]`).check(); await w(300);
  await P.locator(`[data-misr="g|${gid}"]`).fill('50 lapros'); await P.locator(`[data-misr="g|${gid}"]`).press('Tab'); await w(300);
  let m = await S0(g => JSON.parse(JSON.stringify(S.missoes[g])), gid);
  ok(m.t === 'Escoltar a caravana' && m.d === 'Três dias de estrada.' && m.r === '50 lapros' && m.e === 'ativa' && m.o[oids[0]].ok === 1 && !m.o[oids[1]].ok && (await P.locator(`[data-mis="g|${gid}"] .misprog`).innerText()) === '1/2' && await P.locator(`[data-mis="g|${gid}"] .tagseg`).count() === 0,
    'missão do grupo: título, descrição, dois objetivos (um feito: 1/2) e recompensa — sem mesa, ela não nasce escondida');
  await P.locator('[data-misnova="p"]').click(); await w(300);
  const pid = await S0(() => Object.keys(S.personagens[0].estado.mis)[0]);
  await P.locator(`[data-mist="p|${pid}"]`).fill('Aprender a runa do gelo'); await P.locator(`[data-mist="p|${pid}"]`).press('Tab'); await w(300);
  ok((await sel()).estado.mis[pid].t === 'Aprender a runa do gelo' && (await P.locator('#ficha [data-sub="missoes"] .mk').innerText()) === '2', 'missão da Selene: fica na ficha dela; a aba mostra 2 missões ativas');
  await P.locator(`[data-mise="p|${pid}"]`).selectOption('feita'); await w(300);
  ok((await sel()).estado.mis[pid].e === 'feita' && (await P.locator(`[data-mis="p|${pid}"] .misest`).innerText()).toLowerCase() === 'concluída' && (await P.locator('#ficha [data-sub="missoes"] .mk').innerText()) === '1', 'concluída: muda a situação, e deixa de contar como ativa');
  await P.locator(`[data-misodel="g|${gid}|${oids[1]}"]`).click(); await w(300);
  ok(await S0(g => Object.keys(S.missoes[g].o).length, gid) === 1 && (await P.locator(`[data-mis="g|${gid}"] .misprog`).innerText()) === '1/1', 'tirar um objetivo');
  await P.locator(`[data-misabrir="g|${gid}"]`).click(); await w(250);
  ok(await P.locator(`[data-mist="g|${gid}"]`).count() === 0 && (await P.locator(`[data-mis="g|${gid}"] .mistit`).innerText()) === 'Escoltar a caravana', 'a missão fecha num cabeçalho de uma linha');
  await P.locator(`[data-misabrir="g|${gid}"]`).click(); await w(250);
  await P.locator(`[data-misdel="g|${gid}"]`).click(); await w(300);
  ok(await S0(() => Object.keys(S.missoes).length) === 0 && /Missão “Escoltar a caravana” excluída/.test(await toast()), 'excluir avisa: ' + await toast());
  await desfazer();
  ok(await S0(g => S.missoes[g] && S.missoes[g].t, gid) === 'Escoltar a caravana', 'e dá para desfazer');
  // a missão do grupo aparece na ficha de todos; a da Selene, só na dela
  await P.locator('#lista .pc', { hasText: 'Guarda' }).click(); await w(350);
  ok(await P.locator(`[data-mis="g|${gid}"]`).count() === 1 && await P.locator('[data-mis^="p|"]').count() === 0, 'na ficha do Guarda: a missão do grupo, e nenhuma da Selene');
  await P.locator(`[data-miscopiar]`).count().then(n => ok(n === 0, 'sem mesa não há "copiar para" (é coisa do mestre)'));

  // ---------- o gesto: o clique que vem depois de um campo pega de primeira; o Tab leva ao campo seguinte ----------
  // (um campo de número só avisa que mudou quando o cursor sai dele; se a ficha fosse redesenhada nessa hora, o
  //  botão em que a pessoa está clicando deixaria de existir no meio do clique)
  await P.locator('#lista .pc', { hasText: 'Selene' }).click(); await w(350);
  const pts = k => P.locator(`#ficha [data-pts="${k}"]`);
  const ativo = () => S0(() => { const e = document.activeElement; return { id: e.id || '', pts: e.dataset ? e.dataset.pts || '' : '', tag: e.tagName, dentro: e.isConnected }; });
  // (um clique de verdade: o botão do mouse desce, fica um instante e sobe — no meio da tela, longe do cabeçalho fixo)
  const apertar = async (loc, ms) => {
    await loc.evaluate(e => e.scrollIntoView({ block: 'center' }));
    const b = await loc.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
    if (!await loc.evaluate((e, [px, py]) => { const n = document.elementFromPoint(px, py); return !!n && (n === e || e.contains(n)); }, [x, y])) throw new Error('o clique não cairia no alvo');
    await P.mouse.move(x, y); await P.mouse.down(); await w(ms || 90); await P.mouse.up();
  };
  const digitar = async (loc, texto) => { await loc.click(); await P.keyboard.press('Control+A'); await P.keyboard.type(texto); };
  const agi0 = (await sel()).atrLivre.AGI;
  await digitar(pts('FOR'), '7');
  await apertar(P.locator('#ficha [data-ptsstep="AGI|-1"]')); await w(250);
  let al = (await sel()).atrLivre;
  ok(al.FOR === 7 && al.AGI === agi0 - 1 && await pts('FOR').inputValue() === '7' && await pts('AGI').inputValue() === String(agi0 - 1), 'digitar num campo e clicar num botão: o campo vale, e o clique pega de primeira (FOR 7, AGI ' + (agi0 - 1) + ')');
  // (o mesmo vale para os campos mais antigos da ficha, que redesenham por outro caminho)
  await P.locator('#ficha [data-pdadd]').click(); await w(250);
  const pw = await S0(() => S.personagens[0].poderes[0].id);
  await digitar(P.locator(`#ficha [data-pdmax="${pw}"]`), '5');
  await apertar(P.locator(`#ficha [data-pdstep="${pw}|1"]`)); await w(250);
  ok(j((await sel()).poderes.map(x => [x.max, x.atual])) === '[[5,1]]' && await P.locator(`#ficha [data-pdmax="${pw}"]`).inputValue() === '5', 'num poder: digitar o limite (5) e clicar no "+" — o limite vale e o clique conta 1 uso');
  await apertar(P.locator(`#ficha [data-pdstep="${pw}|1"]`)); await w(200);
  ok((await sel()).poderes[0].atual === 2 && await P.locator('#ficha .pip.on').count() === 2, 'e a ficha redesenhada depois do clique continua respondendo (2 usos, 2 círculos acesos)');
  // Tab: o valor fica, e o cursor segue para o campo seguinte (não volta para o que a pessoa acabou de deixar)
  await digitar(pts('FOR'), '6'); await P.keyboard.press('Tab'); await w(200);
  let onde = await ativo();
  ok((await sel()).atrLivre.FOR === 6 && await pts('FOR').inputValue() === '6' && onde.dentro && onde.tag !== 'BODY' && onde.pts !== 'FOR', 'Tab: o valor fica (FOR 6) e o cursor segue adiante — está em ' + j(onde));
  // Enter: o valor fica, e o cursor continua no mesmo campo
  await digitar(pts('FOR'), '5'); await P.keyboard.press('Enter'); await w(200);
  onde = await ativo();
  ok((await sel()).atrLivre.FOR === 5 && onde.pts === 'FOR' && onde.dentro, 'Enter: o valor fica (FOR 5) e o cursor continua no campo');
  // de um campo de número para o seguinte, pelo Tab: o que se digita em seguida entra por cima (como o Tab deixa)
  await digitar(P.locator('#f_xpmin'), '2'); await P.keyboard.press('Tab'); await w(200);
  ok((await ativo()).id === 'f_xpmax' && (await sel()).estado.xp.min === 2, 'do mínimo do XP, o Tab leva ao máximo (e o mínimo ficou em 2)');
  await P.keyboard.type('77'); await P.keyboard.press('Enter'); await w(200);
  ok((await sel()).estado.xp.max === 77 && (await ativo()).id === 'f_xpmax' && await P.locator('#f_xpmax').inputValue() === '77', 'o que se digita em seguida troca o número do campo seguinte (máximo 77), sem grudar no que havia');
  await P.locator('#f_xp').fill('+3'); await P.locator('#f_xp').press('Enter'); await w(250);
  ok((await sel()).estado.xp.v === 7 && (await ativo()).id === 'f_xp' && await P.locator('#f_xp').inputValue() === '7', 'no XP, o Enter soma e deixa o cursor no campo, pronto para o próximo "+…"');
  await P.locator('#f_xp').fill('4'); await P.locator('#f_xp').press('Enter'); await w(200);
  await P.locator('#f_xpmin').fill(''); await P.locator('#f_xpmin').press('Tab'); await w(200); await P.locator('#f_xpmax').fill(''); await P.locator('#f_xpmax').press('Tab'); await w(250);
  // de um campo para outro, pelo clique: o cursor fica no campo clicado, e o que se digita entra nele
  await digitar(pts('FOR'), '8');
  await apertar(P.locator('#f_raca')); await w(200);
  onde = await ativo();
  await P.keyboard.press('End'); await P.keyboard.type('!'); await w(200);
  ok(onde.id === 'f_raca' && onde.dentro && (await sel()).atrLivre.FOR === 8 && (await sel()).raca === 'Elfa da neve!', 'clicar noutro campo: o cursor fica nele e o que se digita entra nele (FOR 8; raça "Elfa da neve!")');
  await P.locator('#f_raca').fill('Elfa da neve'); await w(150);
  // clicar numa lista: ela continua aberta (a ficha só é redesenhada depois da escolha)
  await P.locator('#f_level').evaluate(e => { e.__marca = 1; });
  await digitar(pts('FOR'), '9');
  await apertar(P.locator('#f_level')); await w(300);
  ok(await P.locator('#f_level').evaluate(e => e.__marca === 1 && document.activeElement === e) && (await sel()).atrLivre.FOR === 9, 'clicar numa lista depois de digitar: a lista aberta continua sendo a mesma (não foi trocada por baixo do clique), e o valor já está guardado');
  await P.keyboard.press('Escape'); await w(100);
  await P.locator('#f_level').selectOption('4'); await w(300);
  ok((await sel()).level === 4 && await pts('FOR').inputValue() === '9' && await P.locator('#f_level').evaluate(e => e.__marca === undefined && e.value === '4'), 'feita a escolha, a ficha é redesenhada com as duas mudanças (nível 4, FOR 9)');
  await P.locator('#f_level').selectOption('3'); await w(250);
  // um quadro que esperava para ser redesenhado não aparece na ficha de outro personagem
  await P.locator('#ficha [data-mente="usar"]').click(); await w(250);
  await digitar(P.locator('#ficha [data-mval="san"]'), '77');
  await apertar(P.locator('#lista .pc', { hasText: 'Guarda' })); await w(350);
  ok(await P.locator('#f_nome').inputValue() === 'Guarda' && await P.locator('#ficha [data-mval]').count() === 0 && (await sel()).estado.san === 77, 'digitar a Sanidade da Selene e clicar no Guarda: abre a ficha do Guarda (sem o quadro da Selene), e os 77 ficaram guardados');
  await P.locator('#lista .pc', { hasText: 'Selene' }).click(); await w(350);
  ok(await P.locator('#ficha [data-mval="san"]').inputValue() === '77', 'de volta à Selene: Sanidade 77');
  // quem redesenha por conta de uma mudança que veio de fora espera o clique terminar
  await P.locator('#ficha [data-ptsstep="AGI|-1"]').evaluate(e => e.scrollIntoView({ block: 'center' }));
  const bx = await P.locator('#ficha [data-ptsstep="AGI|-1"]').boundingBox();
  ok(await S0(() => FichasMesa.depoisDoGesto(() => { window.__fora = 1; })) === false && await S0(() => window.__fora) === undefined, 'sem clique em andamento, nada precisa esperar');
  await P.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await P.mouse.down(); await w(60);
  const esperou = await S0(() => FichasMesa.depoisDoGesto(() => { window.__quando = document.querySelector('#ficha [data-pts="AGI"]').value; }));
  await w(120);
  const antesDeSoltar = await S0(() => window.__quando);
  await P.mouse.up(); await w(200);
  ok(esperou === true && antesDeSoltar === undefined && await S0(() => window.__quando) === String(agi0 - 2) && (await sel()).atrLivre.AGI === agi0 - 2, 'com o botão do mouse apertado, o desenho fica para depois: o clique pega (AGI ' + (agi0 - 2) + ') e só então roda o que esperava');

  // ---------- bônus temporário: "todos os atributos" de uma vez, e o valor valendo enquanto é digitado ----------
  const rolagem = () => S0(() => { const o = {}; document.querySelectorAll('#ficha .rolbox [data-rolar]').forEach(b => { o[b.dataset.rolar] = b.querySelector('span').textContent; }); return o; });
  const totais = () => S0(() => [...document.querySelectorAll('#ficha table.attr:not(.defs) tbody tr')].slice(0, 5).map(tr => tr.querySelector('.vtot').textContent).join(','));
  const r0 = await rolagem(), t0 = await totais();
  await P.locator('#ficha [data-tmpadd]').click(); await w(300);
  const tid = await S0(() => { const m = S.personagens[0].estado.tmp; return Object.keys(m).sort((a, b) => m[b].t - m[a].t)[0]; });
  ok(await P.locator(`[data-tmpk="${tid}"] optgroup[label="Atributos"] option`).first().evaluate(o => o.value + '|' + o.textContent) === 'ATR|Todos os atributos', 'na lista de onde o bônus soma, a primeira opção é "Todos os atributos"');
  await P.locator(`[data-tmpk="${tid}"]`).selectOption('ATR'); await w(300);
  await P.locator(`[data-tmpv="${tid}"]`).click(); await P.keyboard.press('Control+A'); await P.keyboard.type('3'); await w(300);
  let r1 = await rolagem();
  ok(await S0(i => document.activeElement === document.querySelector(`[data-tmpv="${i}"]`), tid) && ['FOR', 'DES', 'VIT', 'CAN', 'AGI'].every(k => +r1[k] === +r0[k] + 3) && r1.ESQ === r0.ESQ && r1.DFF === r0.DFF,
    'digitando 3 (com o cursor ainda no campo), os cinco botões de atributo da rolagem rápida já mostram +3 — e derivados e defesas não mudam: ' + j(r1));
  ok(await totais() === t0.split(',').map(v => +v + 3).join(',') && await P.locator('#ficha table.attr:not(.defs) tbody tr').first().locator('.dtmp').innerText() === '+3 temp.', 'a tabela de atributos acompanha na hora (total e "+3 temp."): ' + await totais());
  ok((await sel()).estado.tmp[tid].v === 3 && (await sel()).estado.tmp[tid].k === 'ATR', 'e o valor já está guardado (não espera o cursor sair do campo)');
  await apertar(P.locator('#ficha .rolbox [data-rolar="FOR"]')); await w(350);
  ok((await P.locator('.rolsaida .roldet').innerText()).startsWith('FOR ' + (+r0.FOR + 3)), 'clicar no FOR logo em seguida rola com o bônus, num clique só: ' + (await P.locator('.rolsaida .roldet').innerText()));
  // um número pela metade ("-" a caminho de "-2") não vale nada no meio do caminho
  await P.locator(`[data-tmpv="${tid}"]`).click(); await P.keyboard.press('Control+A'); await P.keyboard.type('-'); await w(250);
  ok((await sel()).estado.tmp[tid].v === 3 && +(await rolagem()).FOR === +r0.FOR + 3, '"−" sozinho ainda não muda nada (o bônus continua +3)');
  await P.keyboard.type('2'); await w(250);
  r1 = await rolagem();
  ok((await sel()).estado.tmp[tid].v === -2 && ['FOR', 'DES', 'VIT', 'CAN', 'AGI'].every(k => +r1[k] === +r0[k] - 2), 'completando "−2", os cinco descem 2: ' + j(r1));
  await P.keyboard.press('Tab'); await w(300);
  ok(await totais() === t0.split(',').map(v => +v - 2).join(',') && await P.locator(`[data-tmpv="${tid}"]`).inputValue() === '-2', 'saindo do campo, a ficha inteira é redesenhada com o mesmo valor');
  await P.locator(`[data-tmpdel="${tid}"]`).click(); await w(300);
  ok(j(await rolagem()) === j(r0) && await totais() === t0, 'tirado o bônus, tudo volta ao que era');

  // ---------- tudo continua lá depois de recarregar ----------
  await w(600);
  await P.reload({ waitUntil: 'load' }); await w(1200);
  const fim = await S0(([g, p]) => { const a = S.personagens[0], b = S.personagens[1]; return { xp: a.estado.xp.v, pr: a.skills.pontos.pr, pcl: a.skills.pontos.pc, fer: Object.keys(b.estado.fer).length, corpo: b.usaCorpo, grupo: S.missoes[g].t, pessoal: a.estado.mis[p].e }; }, [gid, pid]);
  ok(fim.xp === 4 && fim.pr === 5 && fim.pcl === 5 && fim.fer === 2 && fim.corpo === 1 && fim.grupo === 'Escoltar a caravana' && fim.pessoal === 'feita', 'recarregando a página, XP, pontos, ferimentos e missões continuam lá: ' + j(fim));

  // ---------- numa tela de toque ----------
  // (no toque, o campo só perde o cursor depois que o dedo já saiu da tela: o caminho é outro, o resultado é o mesmo)
  const { page: T } = await t.device({ name: 'toque', w: 900, h: 1100, toque: true, seed: { urgm_calc_atributos_v1: estado } });
  await T.goto(t.base + 'fichas/', { waitUntil: 'load' }); await T.waitForTimeout(1200);
  const tocar = async loc => {
    await loc.evaluate(e => e.scrollIntoView({ block: 'center' }));
    const b = await loc.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
    if (!await loc.evaluate((e, [px, py]) => { const n = document.elementFromPoint(px, py); return !!n && (n === e || e.contains(n)); }, [x, y])) throw new Error('o toque não cairia no alvo');
    await T.touchscreen.tap(x, y);
  };
  const selT = () => T.evaluate(() => JSON.parse(JSON.stringify(S.personagens.find(x => x.id === 'pc_sel'))));
  await tocar(T.locator('#ficha [data-pts="FOR"]')); await T.keyboard.press('Control+A'); await T.keyboard.type('9');
  await tocar(T.locator('#ficha [data-ptsstep="AGI|-1"]')); await T.waitForTimeout(300);
  let at = (await selT()).atrLivre;
  ok(at.FOR === 9 && at.AGI === 9 && await T.locator('#ficha [data-pts="FOR"]').inputValue() === '9' && await T.locator('#ficha [data-pts="AGI"]').inputValue() === '9', 'no toque: digitar num campo e tocar num botão — o campo vale e o toque pega de primeira (FOR 9, AGI 9)');
  await tocar(T.locator('#ficha [data-ptsstep="AGI|-1"]')); await T.waitForTimeout(250);
  ok((await selT()).atrLivre.AGI === 8, 'e o toque seguinte também (AGI 8)');
  await tocar(T.locator('#ficha [data-pts="FOR"]')); await T.keyboard.press('Control+A'); await T.keyboard.type('4');
  await tocar(T.locator('#f_raca')); await T.waitForTimeout(250);
  ok(await T.evaluate(() => document.activeElement.id) === 'f_raca' && (await selT()).atrLivre.FOR === 4 && await T.locator('#ficha [data-pts="FOR"]').inputValue() === '4', 'tocar noutro campo: o cursor fica nele, e o valor do primeiro está guardado e desenhado (FOR 4)');

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
