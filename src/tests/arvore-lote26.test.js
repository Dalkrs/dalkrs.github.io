// Árvore de Habilidades, lote 26, sem mesa: o painel "Selecionar árvore" do mestre (a Oficina).
//   · no lugar da fileira de todas as árvores: o botão "Selecionar árvore" (ou a tecla A), a árvore aberta (com onde ela
//     fica) e as últimas abertas;
//   · o painel: abas por categoria (com Profissões), pastas pela família — a primeira palavra do nome, ou a Família de
//     Renomear —, mais um passo no " - " (Kitsune › Karê), pasta de uma árvore só vira a árvore, a busca pelo nome;
//   · Esc fecha, Backspace volta uma pasta, as setas andam pelos cartões.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const NOMES = { raca: ['Anão da Forja', 'Anão Mercador', 'Kitsune Ayto', 'Kitsune Hayune', 'Kitsune Karê - Dançarina', 'Kitsune Karê - Oradora · Rast', 'Silk', 'Konaitos'],
  classe: ['Arqueiro', 'Mago'], escola: ['Shaji-Samurai'], outra: ['Bênção de Selene'] };
const arvores = [];
let k = 0;
for (const cat in NOMES) for (const nome of NOMES[cat]) arvores.push({ id: 'a' + (++k), nome, categoria: cat, secreta: nome === 'Bênção de Selene', senha: '', nodes: [
  { id: 'n' + k, pais: [], regra: 'e', nome: 'Origem', tipo: 'keystone', forma: 'hexagono', glifo: '', cor: '', natureza: '', usos: [], desc: '', exclusivo: '', escola: null, graus: [{ custos: {}, texto: '' }] }] });
const idDe = nome => arvores.find(a => a.nome === nome).id;
const doc = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4,
  biblioteca: { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }], naturezas: [], usos: [],
    tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
    arvores, cofres: [] },
  personagens: [{ id: 'c_dain', nome: 'Dain', arvores: [], arvoreAtual: null, pontos: { p1: 20 }, alocados: {}, ordemLivre: true }] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'arvore26', w: 1400, h: 900, seed: { 'urgm.arvore.v4': doc, 'urgm.arvore.ui.v4': JSON.stringify({ modo: 'mestre', tema: 'pedra', arvoreMestre: idDe('Kitsune Karê - Dançarina') }) } });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const cartoes = () => E(() => [...document.querySelectorAll('#selCorpo .sel-grade .sel-card b')].map(b => b.textContent.replace(/秘/g, '').trim()));
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'arvore/', { waitUntil: 'load' }); await w(900);

  await passo('a barra', async () => {
    ok(await P.locator('#btSelArv').isVisible() && (await P.locator('#atualArv').innerText()).replace(/\s+/g, ' ') === 'Raça › Kitsune › Karê Kitsune Karê - Dançarina', 'a barra: o botão e a árvore aberta, com onde ela fica — ' + (await P.locator('#atualArv').innerText()).replace(/\s+/g, ' '));
    ok(await P.locator('#listaAbas .aba').count() === 0, 'sem a fileira de todas as árvores (e nada nas recentes ainda)');
  });

  await passo('o painel abre onde a árvore está', async () => {
    await P.keyboard.press('a'); await w(200);
    ok(await P.locator('#veuSel.on').count() === 1 && await E(() => document.activeElement.id) === 'selBusca', 'a tecla A abre o painel, com o cursor na busca');
    ok(j(await E(() => [...document.querySelectorAll('.sel-aba')].map(b => b.textContent))) === j(['Raças8', 'Classes2', 'Escolas1', 'Profissões0', 'Outros1']), 'as abas, com Profissões, e quantas há em cada');
    ok((await P.locator('.sel-trilha').innerText()).replace(/\s+/g, ' ') === 'Raças › Kitsune › Karê' && j(await cartoes()) === j(['Dançarina', 'Oradora · Rast']), 'abre na pasta da árvore aberta: Raças › Kitsune › Karê');
    ok(await P.locator('.sel-card.atual').innerText().then(x => x.startsWith('Dançarina')), 'a aberta fica marcada');
  });

  await passo('as pastas', async () => {
    await P.keyboard.press('Backspace'); await w(120);
    ok(j(await cartoes()) === j(['Ayto', 'Hayune', 'Karê']) && /2 árvores/.test(await P.locator('.sel-card.pasta').innerText()), 'Backspace volta uma pasta: Kitsune tem Ayto, Hayune e a pasta Karê (2 árvores)');
    await P.locator('.sel-trilha [data-nivel="0"]').click(); await w(120);
    ok(j(await cartoes()) === j(['Anão', 'Kitsune', 'Konaitos', 'Silk']), 'em Raças: as famílias; Konaitos e Silk (uma árvore só) aparecem direto');
    await P.locator('.sel-card[data-pasta="anao"]').click(); await w(120);
    ok(j(await cartoes()) === j(['Anão da Forja', 'Anão Mercador']), 'em Anão, o nome inteiro (por causa de "da Forja", todos)');
    await P.locator('.sel-aba[data-cat="classe"]').click(); await w(120);
    ok(j(await cartoes()) === j(['Arqueiro', 'Mago']), 'Classes, sem pastas');
    await P.locator('.sel-aba[data-cat="profissao"]').click(); await w(120);
    ok(/Nenhuma árvore de Profissão ainda/.test(await P.locator('#selCorpo').innerText()), 'Profissões vazia diz como criar');
  });

  await passo('a busca e escolher', async () => {
    await P.locator('#selBusca').fill('oradora'); await w(120);
    ok(j(await cartoes()) === j(['Kitsune Karê - Oradora · Rast']), 'a busca acha pelo nome, em qualquer categoria');
    await P.locator('#selBusca').fill(''); await P.locator('.sel-aba[data-cat="classe"]').click(); await w(100);
    await P.locator('#selBusca').focus(); await P.keyboard.press('ArrowDown'); await P.keyboard.press('ArrowRight'); await w(60);
    ok(await E(() => document.activeElement.textContent.trim().startsWith('Mago')), 'as setas andam pelos cartões');
    await P.keyboard.press('Enter'); await w(250);
    ok(await P.locator('#veuSel.on').count() === 0 && await E(() => arvorePorId(ui.arvoreMestre).nome) === 'Mago', 'Enter abre a árvore e fecha o painel');
    ok(j(await E(() => [...document.querySelectorAll('#listaAbas .aba')].map(b => b.textContent.trim()))) === j(['Kitsune Karê - Dançarina']), 'a anterior fica nas recentes da barra');
    await P.locator('#listaAbas .aba').click(); await w(200);
    ok(await E(() => arvorePorId(ui.arvoreMestre).nome) === 'Kitsune Karê - Dançarina', 'clicar na recente volta para ela');
    await P.locator('#btSelArv').click(); await w(150);
    const rec = await E(() => [...document.querySelectorAll('.sel-recentes .aba')].map(b => b.querySelector('small').textContent + ' ' + b.lastChild.textContent.trim()));
    ok(j(rec) === j(['Raça Kitsune Karê - Dançarina', 'Classe Mago']), 'no painel, "Abertas por último": ' + j(rec));
    await P.keyboard.press('Escape'); await w(100);
    ok(await P.locator('#veuSel.on').count() === 0, 'Esc fecha');
  });

  await passo('a família de Renomear', async () => {
    await E(() => { ui.arvoreMestre = arvores2('Shaji-Samurai'); pintarTudo(); function arvores2(n) { return bib().arvores.find(a => a.nome === n).id; } });
    await P.locator('#btRenomearAba').click(); await w(150);
    await P.locator('#dlg input[data-campo="2"]').fill('Shaji'); await P.locator('#dlg .rodape .btn.ouro').click(); await w(200);
    ok(await E(() => bib().arvores.find(a => a.nome === 'Shaji-Samurai').familia) === 'Shaji', 'Renomear guarda a Família');
    ok((await P.locator('#atualArv small').innerText()).trim() === 'Escola › Shaji', 'a barra diz a família nova: ' + (await P.locator('#atualArv small').innerText()).trim());
  });

  await passo('as profissões prontas', async () => {
    await P.keyboard.press('a'); await P.locator('.sel-aba[data-cat="profissao"]').click(); await w(120);
    ok(/Profissões prontas/.test(await P.locator('.sel-prontas').innerText()), 'na aba Profissões, o quadro das prontas');
    await P.locator('#selProntas').click(); await w(400);
    ok(/14 árvores de Profissão: Alquimista, Caçador/.test(await P.locator('#dlg').innerText()), 'a confirmação diz quais entram');
    await P.locator('#dlg .rodape .btn.ouro').click(); await w(500);
    const r = await E(() => { const b = bib(), pool = b.pools.find(p => p.nome === 'Profissão'), ps = b.arvores.filter(a => a.categoria === 'profissao');
      const nos = ps.flatMap(a => a.nodes), custos = new Set(nos.flatMap(n => n.graus.flatMap(g => Object.keys(g.custos))));
      return { n: ps.length, pool: pool && pool.padrao, custos: [...custos], pp: pool && pool.id, nos: nos.length, tranca: nos.filter(n => n.tranca).length, hp: nos.some(n => n.graus.some(g => g.bonus && g.bonus.HP)), vida: nos.some(n => n.graus.some(g => g.bonus && g.bonus.Vida)) }; });
    ok(r.n === 14 && r.pool === 3 && r.custos.length === 1 && r.custos[0] === r.pp, 'as 14 entram, com o tipo de ponto "Profissão" (3 de começo) em todos os custos: ' + JSON.stringify({ n: r.n, pool: r.pool, custos: r.custos }));
    ok(r.nos > 14 * 60 && r.tranca >= 14 * 2 && r.hp && !r.vida, 'de 60 a 70 nódulos cada, os caminhos de toldo trancados e os bônus na barra HP');
    ok(await P.locator('.sel-prontas').count() === 0 && await P.locator('#selCorpo .sel-card').count() === 14, 'depois, o quadro some e as 14 aparecem');
    await P.keyboard.press('Escape'); await w(80);
  });

  await passo('os nós não se sobrepõem', async () => {
    // uma árvore cheia: a raiz com 9 filhos, cada um com 5 de nome comprido, e uma ponta que junta dois ramos
    const r = await E(() => {
      const mk = (id, pais, tipo, nome) => ({ id, pais, regra: 'e', nome, tipo, forma: 'circulo', glifo: '', cor: '', natureza: '', usos: [], desc: '', exclusivo: '', escola: null, graus: [{ custos: {}, texto: '' }] });
      const nodes = [mk('r0', [], 'keystone', 'Raiz')];
      for (let i = 0; i < 9; i++) { nodes.push(mk('f' + i, ['r0'], 'notavel', 'Ramo de número ' + i)); for (let k = 0; k < 5; k++) nodes.push(mk('f' + i + 'n' + k, ['f' + i], 'pequeno', 'Uma habilidade de nome bem comprido ' + i + k)); }
      nodes.push(mk('ponta', ['f0n4', 'f1n4'], 'keystone', 'A Ponta que Junta'));
      bib().arvores.push({ id: 'a_cheia', nome: 'Cheia', categoria: 'outra', secreta: false, senha: '', nodes });
      indexar(); ui.arvoreMestre = 'a_cheia'; pintarTudo(); centralizar();
      const a = arvorePorId('a_cheia'), p = calcularLayout(a); let ov = 0;
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const A = nodes[i], B = nodes[j], pa = p.get(A.id), pb = p.get(B.id), ca = caixaDoNo(A), cb = caixaDoNo(B);
        if (Math.abs(pb.x - pa.x) < ca.w + cb.w && (pb.y >= pa.y ? pa.y + ca.baixo > pb.y - cb.cima : pb.y + cb.baixo > pa.y - ca.cima)) ov++;
      }
      const ang = id => Math.atan2(p.get(id).y, p.get(id).x), pt = ang('ponta'), a0 = ang('f0n4'), a1 = ang('f1n4');
      const entre = Math.min(a0, a1) - .2 <= pt && pt <= Math.max(a0, a1) + .2;
      return { ov, entre, n: nodes.length };
    });
    ok(r.ov === 0, 'com ' + r.n + ' nós de nome comprido, nenhuma caixa (a bolinha e o nome) encosta em outra: ' + r.ov);
    ok(r.entre, 'a ponta que junta dois ramos fica entre os pais');
    const nomes = async () => E(() => [...document.querySelectorAll('#nos .rotulo')].map(t => t.textContent));
    await E(() => { zoomPara(.5); desenhar(); }); await w(120);
    const longe = await nomes();
    ok(longe.includes('Raiz') && longe.includes('Ramo de número 3') && !longe.some(n => /nome bem comprido/.test(n)), 'afastado: só os nomes dos nós grandes');
    await E(() => { selecionado = null; ui.modo = 'jogador'; }); await E(() => { trocarModo('mestre'); zoomPara(1.2); desenhar(); }); await w(120);
    ok((await nomes()).filter(n => /nome bem comprido/.test(n)).length === 45, 'de perto: todos');
  });

  await passo('o jogador não vê', async () => {
    await E(() => trocarModo('jogador')); await w(200);
    ok(!(await P.locator('#btSelArv').isVisible()), 'no modo Jogador, o botão some (as abas são os personagens)');
  });

  await t.close();
  end();
})();
