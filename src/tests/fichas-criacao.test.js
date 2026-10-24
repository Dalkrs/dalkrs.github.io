// Fichas, lote 26, sem mesa: a criação de personagem e o background.
//   · a ficha com a criação pendente mostra o aviso e "Criar personagem"; o passo a passo: a raça (as famílias, pela
//     primeira palavra), a sub-raça (pulada quando a família tem uma só), a classe, o nome, os atributos (os pontos do
//     level, no mínimo 1) e as habilidades (os pontos iniciais, só o que já se alcança, sem passar dos pontos);
//   · ao criar: o nome, "Raça · Classe", a distribuição livre, as duas árvores equipadas com as raízes e o que foi
//     escolhido, e a marca para o mestre conferir;
//   · o mestre (aqui, de mentira: FichasMesa.mestre) dá a ficha — o level e as raças e classes que valem — e cria o
//     background: os NPCs vão para o grupo com o nome do jogador, à vista dos jogadores, sem dono, com ficha.fundo.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const no = (id, nome, pais, pool, extra) => Object.assign({ id, pais, regra: 'e', nome, tipo: 'pequeno', forma: 'circulo', glifo: '', cor: '', natureza: '', usos: ['passiva'], desc: 'Sobre ' + nome + '.', exclusivo: '', escola: null,
  graus: [{ custos: { [pool]: 1 }, texto: nome + ' I' }, { custos: { [pool]: 2 }, texto: nome + ' II' }] }, extra || {});
const raiz = (id, nome, desc) => ({ id, pais: [], regra: 'e', nome, tipo: 'keystone', forma: 'hexagono', glifo: '', cor: '', natureza: '', usos: [], desc, exclusivo: '', escola: null, graus: [{ custos: {}, texto: '' }] });
const arv = (id, nome, cat, pool, desc) => ({ id, nome, categoria: cat, secreta: false, senha: '', nodes: [raiz(id + '_r', 'Origem', desc + '\n\nO resto das regras.'),
  no(id + '_a', 'Passo A', [id + '_r'], pool), no(id + '_b', 'Passo B', [id + '_r'], pool), no(id + '_c', 'Passo C', [id + '_a'], pool)] });
const BIB = { nome: 'x', pools: [{ id: 'p1', nome: 'Raça', cor: '#90b800', padrao: 4 }, { id: 'pc', nome: 'Classe', cor: '#585550', padrao: 6 }, { id: 'pp', nome: 'Profissão', cor: '#C9894B', padrao: 3 }],
  naturezas: [], usos: [{ id: 'passiva', nome: 'Passiva', sigla: 'Pa' }], tipos: { pequeno: { nome: 'Pequeno', custo: 1 }, keystone: { nome: 'Keystone', custo: 4 } },
  arvores: [arv('k1', 'Kitsune Ayto', 'raca', 'p1', 'As Ayto nascem ninjas.'), arv('k2', 'Kitsune Hayune', 'raca', 'p1', 'As Hayune dançam.'), arv('s1', 'Silk', 'raca', 'p1', 'Os Silk tecem.'),
    arv('c1', 'Arqueiro', 'classe', 'pc', 'Vive do arco.'), arv('c2', 'Mago', 'classe', 'pc', 'Estuda.'), arv('f1', 'Ferreiro', 'profissao', 'pp', 'Forja.')], cofres: [] };

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'criacao', w: 1300, h: 900 });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const cartoes = () => E(() => [...document.querySelectorAll('.cria-card b')].map(b => b.textContent));
  const falta = () => E(() => document.querySelector('.cria-falta').textContent);
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(900);
  await E(B => { S.bib = B; indexarArvores(); const p = personagemPadrao('Ficha de Dalmo', '', 'C', 3); p.id = 'pc_novo'; p.criacao = { pendente: true, level: 3, racas: [], classes: [] }; p.skills = { arvores: [], pontos: { p1: 4, pc: 6, pp: 3 }, alocados: {} }; S.personagens.push(p); S.sel = p.id; render(); }, BIB);

  await passo('o aviso', async () => {
    ok(/esperando você criar o personagem/.test(await P.locator('.cria-aviso').innerText()) && await P.locator('.pc.on .cria-selo').innerText() === 'a criar', 'a ficha pendente: o aviso no alto e "a criar" na lista');
    await P.locator('[data-criar]').click(); await w(150);
    ok(await P.locator('.cria-veu').count() === 1 && j(await E(() => [...document.querySelectorAll('.cria-passos li')].map(l => l.textContent.replace(/^\d+/, '')))) === j(['Raça', 'Sub-raça', 'Classe', 'Nome e foto', 'Atributos', 'Habilidades', 'Pronto']), 'abre o passo a passo, com os sete passos');
  });

  await passo('raça e sub-raça', async () => {
    ok(j(await cartoes()) === j(['Kitsune', 'Silk']) && await falta() === 'Escolha uma raça.', 'as raças pela família (Kitsune, Silk), e o Próximo diz o que falta');
    await P.locator('[data-fam="silk"]').click(); await w(80);
    ok(j(await E(() => [...document.querySelectorAll('.cria-passos li')].map(l => l.textContent.replace(/^\d+/, '')))).indexOf('Sub-raça') < 0 && /Os Silk tecem/.test(await P.locator('.cria-detalhe').innerText()), 'Silk (uma só): sem o passo da sub-raça, e o texto da raiz aparece');
    await P.locator('[data-fam="kitsune"]').click(); await w(80);
    ok(j(await cartoes()) === j(['Ayto', 'Hayune']), 'Kitsune: vai para a sub-raça, com o resto do nome');
    await P.locator('[data-raca="k1"]').click(); await w(60);
    ok(/As Ayto nascem ninjas/.test(await P.locator('.cria-detalhe').innerText()), 'escolher mostra o texto da raça');
    await P.locator('[data-cr="proximo"]').click(); await P.locator('[data-classe="c1"]').click(); await P.locator('[data-cr="proximo"]').click(); await w(60);
    ok(await falta() === 'Dê um nome.', 'o nome é preciso');
    await P.locator('#criaNome').fill('Aiko'); await P.keyboard.press('Enter'); await w(80);
  });

  await passo('atributos', async () => {
    ok(/61 pontos \(level 3\)/.test(await P.locator('.cria-corpo').innerText()) && await falta() === 'Ainda faltam 56 pontos para distribuir.', 'os pontos do level 3 (61), com 1 em cada');
    await P.locator('[data-atr="FOR"][data-d="-1"]').click(); await w(40);
    ok(await E(() => document.querySelector('[data-atrv="FOR"]').value) === '1', 'nenhum abaixo de 1');
    await P.locator('[data-cr="igual"]').click(); await w(40);
    ok(await falta() === '' && j(await E(() => ['FOR', 'DES', 'VIT', 'CAN', 'AGI'].map(k => +document.querySelector(`[data-atrv="${k}"]`).value))) === j([13, 12, 12, 12, 12]), '"Dividir igual" reparte os 61');
    await P.locator('[data-atr="FOR"][data-d="5"]').click(); await w(40);
    ok(await falta() === 'Passou 5 pontos do total.', 'passou do total: avisa');
    await P.locator('[data-atr="FOR"][data-d="-5"]').click(); await P.locator('[data-cr="proximo"]').click(); await w(80);
  });

  await passo('habilidades', async () => {
    const lista = () => E(() => [...document.querySelectorAll('.cria-no summary b')].map(b => b.textContent).join());
    ok(await lista() === 'Passo A,Passo B,Passo A,Passo B', 'só o que já se alcança (a raiz vem escolhida): A e B em cada árvore');
    await P.locator('[data-no="k1_a"][data-d="1"]').click(); await w(60);
    ok(await lista() === 'Passo A,Passo B,Passo C,Passo A,Passo B', 'escolher o A abre o C');
    await P.locator('[data-no="k1_a"][data-d="1"]').click(); await w(60);
    await P.locator('[data-no="k1_c"][data-d="1"]').click(); await w(60);
    ok(/0 de 4 pontos de Raça/.test(await P.locator('.cria-pontos').innerText()) && await E(() => document.querySelector('[data-no="k1_b"][data-d="1"]').disabled), 'A no grau 2 (1 + 2) e C (1): os 4 de Raça gastos, e o B fica desligado');
    ok(await E(() => document.querySelector('[data-no="k1_a"][data-d="-1"]').disabled === false), 'o A, com dois graus, pode descer um');
  });

  await passo('criar', async () => {
    await P.locator('[data-cr="proximo"]').click(); await w(60);
    ok(/Kitsune Ayto · Arqueiro · Level 3/.test(await P.locator('.cria-fim').innerText()), 'o resumo');
    await P.locator('[data-cr="criar"]').click(); await w(400);
    const pc = await E(() => { const p = S.personagens.find(x => x.id === 'pc_novo'); return { nome: p.nome, raca: p.raca, modo: p.modoAtr, atr: p.atrLivre, arv: p.skills.arvores, al: p.skills.alocados, cr: Object.keys(p.criacao).sort(), conf: p.criacao.conferir }; });
    ok(pc.nome === 'Aiko' && pc.raca === 'Kitsune Ayto · Arqueiro' && pc.modo === 'livre' && j(pc.atr) === j({ FOR: 13, DES: 12, VIT: 12, CAN: 12, AGI: 12 }), 'a ficha: nome, raça e classe, atributos livres');
    ok(j(pc.arv) === j(['k1', 'c1']) && j(pc.al) === j({ k1_r: 1, c1_r: 1, k1_a: 2, k1_c: 1 }) && pc.conf === true && pc.cr.indexOf('pendente') < 0, 'as árvores equipadas, as raízes e o escolhido; marcada para conferir');
    ok(await P.locator('.cria-veu').count() === 0 && await P.locator('.cria-aviso').count() === 0, 'sem o aviso (o jogador não confere)');
  });

  await passo('o mestre dá a ficha', async () => {
    await E(() => { FichasMesa.mestre = () => true; });
    await E(() => FichasCriacao.darFicha({ jogador: 'u1', nome: 'Dalmo', camp: null })); await w(150);
    ok(/Ficha para Dalmo/.test(await P.locator('.cria-topo').innerText()) && await P.locator('[data-dr]').count() === 3 && await P.locator('[data-dc]').count() === 2, 'a janela: as raças e as classes da mesa, todas marcadas');
    await P.locator('[data-nenhuma="c"]').click(); await P.locator('[data-dc="c2"]').check(); await P.locator('#dfLvl').fill('5'); await P.locator('#dfLvl').press('Tab'); await w(80);
    await P.locator('[data-cr="dar"]').click(); await w(300);
    const p = await E(() => { const p = S.personagens[S.personagens.length - 1]; return { dono: p._dono, vis: p._vis, cr: p.criacao, pts: p.skills.pontos, lvl: p.level, modo: p.modoAtr }; });
    ok(p.dono === 'u1' && p.cr.pendente && p.cr.level === 5 && j(p.cr.racas) === '[]' && j(p.cr.classes) === j(['c2']) && j(p.pts) === j({ p1: 4, pc: 6, pp: 3 }) && p.modo === 'livre', 'a ficha nasce do jogador, pendente, com o level, as classes que valem (todas as raças: lista vazia) e os pontos de começo');
    ok(/Esperando .* criar o personagem/.test(await P.locator('.cria-aviso').innerText()), 'o mestre vê que espera o jogador');
    await E(() => FichasCriacao.abrir(S.personagens[S.personagens.length - 1])); await w(100);
    await P.locator('[data-fam="kitsune"]').click(); await P.locator('[data-raca="k2"]').click(); await P.locator('[data-cr="proximo"]').click(); await w(60);
    ok(j(await cartoes()) === j(['Mago']), 'na criação, só as classes que valem');
    await P.locator('[data-cr="fechar"]').click(); await w(60);
    ok(await P.locator('.cria-veu').count() === 1, 'fechar com escolhas pergunta antes (aqui: cancelado)');
  });

  await passo('o background', async () => {
    P.once('dialog', d => d.accept());
    await E(() => document.querySelector('[data-cr="fechar"]').click()); await w(100);
    await E(() => FichasCriacao.fundo({ jogador: 'u1', nome: 'Dalmo' })); await w(120);
    ok(j(await E(() => [...document.querySelectorAll('.cria-passos li')].map(l => l.textContent.replace(/^\d+/, '')))) === j(['Raça', 'Sub-raça', 'Papel', 'Nome e foto', 'Pronto']), 'o background: raça, papel, nome e pronto');
    await P.locator('[data-fam="silk"]').click(); await P.locator('[data-cr="proximo"]').click(); await w(60);
    await P.locator('[data-papel="toldo"]').click(); await w(40);
    ok(await falta() === 'Escolha a profissão.' && j(await E(() => [...document.querySelectorAll('[data-principal]')].map(b => b.textContent))) === j(['Ferreiro']), 'toldo: escolhe a profissão');
    await P.locator('[data-principal="f1"]').click(); await P.locator('[data-cr="proximo"]').click();
    await P.locator('#criaNome').fill('Bruna'); await P.locator('#criaRel').fill('tia'); await P.locator('[data-tier="B"]').click(); await P.locator('[data-cr="proximo"]').click(); await w(60);
    ok(/Tia de Dalmo\. Vai para o grupo “Dalmo”/.test(await P.locator('.cria-fim').innerText()), 'o resumo diz o grupo e a relação');
    await P.locator('[data-cr="outro"]').click(); await w(150);
    ok(/NPC 2/.test(await P.locator('.cria-topo').innerText()), '"Criar e fazer outro": começa o próximo');
    await P.locator('[data-fam="kitsune"]').click(); await P.locator('[data-raca="k2"]').click(); await P.locator('[data-cr="proximo"]').click();
    await P.locator('[data-papel="familia"]').click(); await P.locator('[data-cr="proximo"]').click(); await P.locator('#criaNome').fill('Kenji'); await P.locator('[data-cr="proximo"]').click(); await P.locator('[data-cr="criar"]').click(); await w(300);
    const npcs = await E(() => S.personagens.filter(p => p.fundo).map(p => ({ n: p.nome, r: p.raca, t: p.tier, g: p.grupo, v: p._vis, d: p._dono, papel: p.fundo.papel, de: p.fundo.de, arv: p.skills.arvores, al: p.skills.alocados })));
    ok(npcs.length === 2 && npcs[0].n === 'Bruna' && npcs[0].r === 'Silk · Ferreiro' && npcs[0].t === 'B' && npcs[0].papel === 'toldo' && j(npcs[0].arv) === j(['s1', 'f1']) && j(npcs[0].al) === j({ s1_r: 1, f1_r: 1 }), 'Bruna: Silk · Ferreiro, tier B, as árvores com as raízes');
    ok(npcs.every(x => x.g === 'Dalmo' && x.v === 'mesa' && x.d === null && x.de === 'u1') && npcs[1].papel === 'familia' && j(npcs[1].arv) === j(['k2']), 'os dois no grupo Dalmo, à vista, sem dono, com o fundo do jogador');
    ok(await E(() => gruposDe('').includes('Dalmo')), 'o grupo existe na lista');
  });

  await passo('conferido', async () => {
    await E(() => { S.sel = 'pc_novo'; render(); }); await w(150);
    ok(/criou este personagem/.test(await P.locator('.cria-aviso').innerText()) && await P.locator('.pc.on .cria-selo').innerText() === 'nova · conferir', 'o mestre vê "nova · conferir"');
    await P.locator('[data-conferido]').click(); await w(150);
    ok(await P.locator('.cria-aviso').count() === 0 && await E(() => !S.personagens.find(x => x.id === 'pc_novo').criacao.conferir), '"Conferido" tira a marca');
  });

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
