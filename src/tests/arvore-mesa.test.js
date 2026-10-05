// Árvore dentro de uma mesa, no projeto real: o mestre traz a biblioteca, o jogador recebe sem arquivo, escolhe os
// nódulos no personagem dele, e os bônus dos nódulos entram na ficha.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const arvLocal = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4,
  biblioteca: { nome: 'Campanha', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }], naturezas: [{ id: 'forca', nome: 'Força', cor: '#D0463A' }], usos: [{ id: 'passiva', nome: 'Passiva', sigla: 'Pa' }],
    tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
    arvores: [{ id: 'a_monge', nome: 'Monge', categoria: 'classe', secreta: false, senha: '', nodes: [
      { id: 'n_origem', pais: [], regra: 'e', nome: 'Origem', tipo: 'keystone', forma: 'hexagono', glifo: '道', cor: '', natureza: '', usos: [], desc: 'Ponto de partida.', exclusivo: '', escola: null, graus: [{ custos: {}, texto: '' }] },
      { id: 'n_punho', pais: ['n_origem'], regra: 'e', nome: 'Punho de Ferro', tipo: 'notavel', forma: 'circulo', glifo: '力', cor: '', natureza: 'forca', usos: ['passiva'], desc: 'Golpes desarmados.', exclusivo: '', escola: null,
        graus: [{ custos: { p1: 2 }, texto: '+1 dano', bonus: { FOR: 2, HP: 10 } }, { custos: { p1: 3 }, texto: '+2 dano', bonus: { FOR: 1 } }] }] }], cofres: [] },
  personagens: [{ id: 'c_local', nome: 'Rascunho local', arvores: ['a_monge'], arvoreAtual: 'a_monge', pontos: { p1: 20 }, alocados: {}, ordemLivre: true }] });
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { 'urgm.arvore.v4': arvLocal, 'tinycats:aba': 'arvore' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'arvore' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 14000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const linhas = p => p.evaluate(() => ({ docs: TC.dados.col('documentos').todas().map(d => d.id + ':' + d.vis).sort(), pcs: TC.dados.col('personagens').todas().map(l => ({ id: l.id, nome: l.nome, dono: !!l.dono_id, skills: l.skills })), pend: TC.dados.pendentes }));

  // ---------- sem mesa: a árvore deste navegador, como sempre ----------
  await M.goto(t.base, { waitUntil: 'load' }); await w(2000);
  let A = await quadro(M, /\/arvore\//);
  ok(await A.evaluate(() => bib().nome === 'Campanha' && bib().arvores.length === 1 && doc.personagens[0].nome === 'Rascunho local'), 'sem mesa, a Árvore abre a biblioteca deste navegador');
  ok(await A.evaluate(() => bib().arvores[0].nodes[1].graus[0].bonus.FOR === 2 && bonusTexto(bib().arvores[0].nodes[1].graus[0].bonus) === 'FOR +2, HP +10'), 'o bônus de cada grau é guardado e mostrado como texto');
  ok(await A.evaluate(() => JSON.stringify(bonusLer('for +2; Fé -3, hp+10 , lixo, x 0')) === '{"FOR":2,"Fé":-3,"hp":10}' && bonusLer('nada') === null), 'o texto do bônus é lido com folga (siglas de atributo viram maiúsculas, nome de recurso fica como escrito, zero e lixo saem)');

  // ---------- o mestre abre a mesa: oferta de trazer as árvores ----------
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Árvore E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  ok(await ate(async () => { A = await quadro(M, /\/arvore\//); return A && (await A.locator('.mesa-oferta').count()) === 1; }), 'na mesa nova, a Árvore oferece trazer as árvores do navegador');
  ok(await A.evaluate(() => doc.personagens.length === 1 && doc.personagens[0].id === 'teste_local'), 'sem personagens na mesa, o mestre fica com um rascunho que não vai para a mesa');
  ok((await linhas(M)).pcs.length === 0 && (await linhas(M)).docs.length === 0, 'nada sobe sozinho: a mesa continua vazia');
  await A.locator('#ofertaSim').click(); await w(500);
  ok(await ate(async () => { const l = await linhas(M); return l.docs.join() === 'arvore:biblioteca:mestre,arvore:pacote:mesa' && l.pend === 0; }), 'trazidas, viram a biblioteca da mesa (só do mestre) e o pacote dos jogadores');
  ok(await M.evaluate(() => { const p = TC.dados.col('documentos').pegar('arvore:pacote').dados, b = TC.dados.col('documentos').pegar('arvore:biblioteca').dados; return p.arvores.length === 1 && p.arvores[0].nodes[1].graus[0].bonus.HP === 10 && b.nome === 'Campanha'; }), 'o pacote leva as árvores e os bônus');

  // ---------- a ficha do jogador ----------
  await M.locator('#tab-fichas').click();
  let F = null;
  ok(await ate(async () => { F = await quadro(M, /\/fichas\//); return F && (await F.locator('#btnNew').count()) === 1; }), 'Fichas abre na mesa');
  await F.locator('#btnNew').click(); await w(400);
  await F.locator('#f_nome').fill('Li'); await F.locator('#f_tier').selectOption('C'); await w(200); await F.locator('#f_level').selectOption('5'); await w(300);
  await F.locator('#f_ini').fill('AGI/5'); await w(500);
  ok((await F.locator('#iniVal').innerText()).startsWith('= +'), 'a ficha tem fórmula de iniciativa: ' + await F.locator('#iniVal').innerText());
  const antes = await F.evaluate(() => { const c0 = calcular(S.personagens[0]); return { FOR: c0.tot.FOR, hp: c0.recursos.find(r => r.nome === 'HP').val }; });

  // ---------- o jogador entra e recebe a ficha ----------
  await J.goto(t.base, { waitUntil: 'load' }); await w(1500, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  let B = null;
  ok(await ate(async () => { B = await quadro(J, /\/arvore\//); return B && await B.evaluate(() => typeof doc === 'object' && bib().arvores.length === 1 && bib().arvores[0].nome === 'Monge'); }), 'o jogador abre a Árvore e já tem as árvores da mesa, sem arquivo');
  ok(await B.evaluate(() => ui.modo === 'jogador' && getComputedStyle(document.querySelector('#btMestre')).display === 'none'), 'o jogador fica no modo jogador, sem o botão de mestre');
  ok(await ate(async () => (await linhas(J)).pcs.some(p => p.nome === 'Personagem de Dalmo' && p.dono)), 'sem ficha ainda, o jogador ganha o próprio personagem ("Personagem de Dalmo")');
  ok(await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), 'o mestre vê o jogador na lista');
  await F.locator('#lista .pc', { has: F.locator('.nm', { hasText: /^Li$/ }) }).click(); await w(300);
  await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(300);
  ok(await ate(async () => await B.evaluate(() => doc.personagens.some(p => p.nome === 'Li'))), 'a ficha entregue pelo mestre aparece como personagem na Árvore do jogador');

  // ---------- o jogador equipa a árvore e escolhe os nódulos ----------
  const idLi = (await linhas(J)).pcs.find(p => p.nome === 'Li').id;
  await B.evaluate(async id => {
    trocarPersonagem(id);
    const p = personagemAtual(); registrar('equipar Monge'); p.arvores.push('a_monge'); p.arvoreAtual = 'a_monge'; indexar(); salvar(); pintarTudo();
    await subirGrau('n_origem'); await subirGrau('n_punho'); await subirGrau('n_punho');
  }, idLi); await w(600, J);
  ok(await B.evaluate(() => { const p = personagemAtual(); return p.nome === 'Li' && p.alocados.n_origem === 1 && p.alocados.n_punho === 2; }), 'o jogador equipa a árvore e compra os graus (regras do aplicativo)');
  ok(await ate(async () => { const l = (await linhas(M)).pcs.find(p => p.id === idLi); return l && l.skills && l.skills.alocados && l.skills.alocados.n_punho === 2 && l.skills.arvores.join() === 'a_monge'; }), 'as escolhas ficam guardadas no personagem da mesa');
  // clicar de novo no que já foi aprendido até o fim não esquece nada; só o botão direito desfaz
  await B.evaluate(async () => { await subirGrau('n_punho'); await subirGrau('n_origem'); }); await w(300, J);
  ok(await B.evaluate(() => { const p = personagemAtual(); return p.alocados.n_origem === 1 && p.alocados.n_punho === 2 && /botão direito/.test(document.querySelector('#dica').textContent); }), 'clicar de novo num nódulo já no grau máximo não o esquece (e a dica aponta o botão direito)');
  {
    const cx = await B.evaluate(() => { const r = document.querySelector('.no[data-id="n_punho"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    const off = await (await B.frameElement()).boundingBox();
    await J.mouse.click(off.x + cx[0], off.y + cx[1]); await w(300, J);
    ok(await B.evaluate(() => personagemAtual().alocados.n_punho === 2), 'o clique esquerdo de verdade, na tela, também não esquece');
    await J.mouse.click(off.x + cx[0], off.y + cx[1], { button: 'right' }); await w(300, J);
    ok(await B.evaluate(() => personagemAtual().alocados.n_punho === 1), 'o botão direito desce um grau');
    await J.mouse.click(off.x + cx[0], off.y + cx[1]); await w(300, J);
    ok(await B.evaluate(() => personagemAtual().alocados.n_punho === 2), 'e o clique esquerdo sobe de volta');
  }

  // ---------- os bônus entram na ficha ----------
  ok(await ate(async () => { const d = await F.evaluate(() => { const pc = S.personagens.find(p => p.nome === 'Li'), c0 = calcular(pc); return { FOR: c0.tot.FOR, arv: c0.arv.FOR, hp: c0.recursos.find(r => r.nome === 'HP').val, alo: pc.skills.alocados.n_punho }; }); return d.alo === 2 && d.FOR === antes.FOR + 3 && d.arv === 3 && d.hp === antes.hp + 10; }), 'na ficha do mestre, Força sobe 3 (2 + 1) e o HP ganha 10 — antes: ' + JSON.stringify(antes));
  await F.locator('#lista .pc', { has: F.locator('.nm', { hasText: /^Li$/ }) }).click(); await w(500);
  ok((await F.locator('.darv').first().innerText()).includes('+3') && (await F.locator('.rescard .hint').first().innerText()).includes('+10'), 'e a ficha mostra de onde veio: "' + (await F.locator('.darv').first().innerText()) + '" · "' + (await F.locator('.rescard .hint').first().innerText()) + '"');
  // a aba Skills da ficha enxerga a mesma biblioteca e as mesmas escolhas
  ok(await F.evaluate(() => !!S.bib && S.bib.arvores[0].nome === 'Monge' && skillsEscolhidas(S.personagens.find(p => p.nome === 'Li')).length === 2), 'a aba Skills da ficha usa a biblioteca da mesa e mostra os 2 nódulos escolhidos');

  // ---------- o mestre muda a árvore: o jogador recebe ----------
  await M.locator('#tab-arvore').click(); await w(800);
  await A.evaluate(() => { registrar('renomear nódulo'); bib().arvores[0].nodes[1].nome = 'Punho de Aço'; bib().arvores[0].nodes[1].graus[0].bonus = bonusLer('FOR +5'); salvar(); pintarTudo(); });
  ok(await ate(async () => await B.evaluate(() => bib().arvores[0].nodes[1].nome === 'Punho de Aço'), 20000), 'o que o mestre muda na árvore chega ao jogador (pacote novo)');
  ok(await B.evaluate(() => personagemAtual().alocados.n_punho === 2), 'e as escolhas do jogador continuam');
  ok(await ate(async () => (await F.evaluate(() => calcular(S.personagens.find(p => p.nome === 'Li')).arv.FOR)) === 6), 'o bônus novo (FOR +5 e +1) já vale na ficha');
  // o mestre muda a árvore e fecha a página na mesma hora: a biblioteca sobe na saída; o pacote dos jogadores, que
  // é montado um instante depois, fica para trás — e é refeito quando o mestre abre a Árvore de novo
  await A.evaluate(() => { registrar('renomear nódulo'); bib().arvores[0].nodes[1].nome = 'Punho de Titânio'; salvar(); pintarTudo(); });
  await M.reload({ waitUntil: 'load' });
  ok(await ate(async () => { A = await quadro(M, /\/arvore\//); return A && await A.evaluate(() => typeof doc === 'object' && typeof bib === 'function' && bib().arvores[0].nodes[1].nome === 'Punho de Titânio'); }, 40000), 'o mestre renomeia um nódulo e recarrega a página na mesma hora: a mudança não fica para trás');
  ok(await ate(async () => await B.evaluate(() => bib().arvores[0].nodes[1].nome === 'Punho de Titânio'), 40000), 'e o pacote dos jogadores, que tinha ficado para trás, é refeito quando o mestre abre a Árvore: o jogador recebe o nome novo');
  ok(t.saidas.length === 0, 'sem o navegador precisar perguntar "sair da página?"');
  ok(await ate(async () => await M.evaluate(() => TC.dados.pendentes === 0)), '(tudo salvo)');
  // desfazer do jogador não volta por cima do que é dos outros
  await B.evaluate(async () => { await descerGrau('n_punho'); }); await w(400, J);
  await B.evaluate(() => desfazer()); await w(500, J);
  ok(await B.evaluate(() => personagemAtual().alocados.n_punho === 2 && bib().arvores[0].nodes[1].nome === 'Punho de Titânio'), 'o desfazer do jogador volta só a escolha dele, não a árvore do mestre');
  ok(await B.evaluate(() => excluirPersonagem().then(() => doc.personagens.some(p => p.nome === 'Li'))), 'na mesa, personagem não é excluído pela Árvore');

  // ---------- a ficha e a árvore acompanham uma à outra, sem recarregar ----------
  // (o mestre recarregou a página há pouco: as Fichas ainda não tinham sido abertas nesta página)
  await M.locator('#tab-fichas').click();
  ok(await ate(async () => { F = await quadro(M, /\/fichas\//); return F && (await F.locator('#lista .pc').count()) > 0 && await F.evaluate(() => !!S.bib && S.bib.arvores[0].nodes[1].nome === 'Punho de Titânio'); }, 40000), '(o mestre abre as Fichas, já com a árvore de agora)');
  await F.locator('#lista .pc', { has: F.locator('.nm', { hasText: /^Li$/ }) }).click(); await w(300);
  // o que foi aprendido na árvore aparece sozinho em "Passivas e Habilidades"
  await F.locator('#ficha [data-sub="habs"]').click(); await w(300);
  const habs = await F.locator('#habsDaArvore .habrow.daarv').evaluateAll(l => l.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  ok(habs.length === 2 && habs.some(x => x.includes('Punho de Titânio') && x.includes('grau 2/2') && /passiva/i.test(x) && x.includes('+2 dano') && x.includes('Golpes desarmados.') && x.includes('Monge')) && habs.some(x => x.includes('Origem') && x.includes('Ponto de partida.')),
    'na ficha, "Passivas e Habilidades" lista sozinha o que foi aprendido na árvore — uso, nome, grau, o texto do grau, a descrição e de que árvore veio: ' + JSON.stringify(habs));
  ok((await F.locator('#ficha [data-sub="habs"] .mk').innerText()) === '2' && await F.locator('#habsDaArvore input, #habsDaArvore textarea, #habsDaArvore button').count() === 0, 'a aba conta essas habilidades, e elas são só leitura (mudam pela árvore)');
  await B.evaluate(async () => { await descerGrau('n_punho'); }); await w(400, J);
  ok(await ate(async () => (await F.locator('#habsDaArvore .habrow.daarv', { hasText: 'Punho de Titânio' }).innerText()).replace(/\s+/g, ' ').includes('grau 1/2'), 15000), 'o jogador desce um grau na Árvore dele: a lista na ficha do mestre acompanha sozinha (grau 1/2)');
  // o cursor parado num campo da Árvore não segura o que vem da mesa
  await B.locator('#busca').click(); await w(200, J);
  await F.locator('#ficha [data-sub="skills"]').click(); await w(300);
  if (!await F.locator('#ficha [data-skpegar]').count()) { await F.locator('#ficha [data-skui="distribuir"]').click(); await w(300); }
  await F.locator('#ficha [data-skpegar="n_punho"]').click(); await w(500);
  ok(await ate(async () => await B.evaluate(() => personagemAtual().alocados.n_punho === 2 && !!document.activeElement && document.activeElement.id === 'busca'), 15000), 'o mestre sobe o grau pela ficha (aba Skills): a Árvore do jogador acompanha mesmo com o cursor dele parado no campo de busca — e o cursor continua lá');
  // quem está digitando de verdade não é interrompido — e nada do que os dois fizeram se perde
  await B.locator('#tot_p1').click(); await J.keyboard.press('Control+A'); await J.keyboard.type('25'); await w(200, J);
  await F.locator('#ficha [data-sksoltar="n_punho"]').click(); await w(500);
  ok(await ate(async () => (await linhas(M)).pcs.find(p => p.id === idLi).skills.alocados.n_punho === 1 && (await linhas(M)).pend === 0), '(o mestre desce um grau pela ficha; a mudança está no banco)');
  await w(4500, J);
  ok(await B.evaluate(() => { const i = document.querySelector('#tot_p1'); return document.activeElement === i && i.value === '25' && personagemAtual().alocados.n_punho === 2; }), 'o jogador está digitando o total de pontos: o que chegou da mesa espera (o campo continua com o 25 e com o cursor)');
  await J.keyboard.press('Tab');
  ok(await ate(async () => await B.evaluate(() => { const p = personagemAtual(); return p.pontos.p1 === 25 && p.alocados.n_punho === 1; }), 15000), 'ele sai do campo: o total dele vale (25) e o que o mestre fez entra em seguida (grau 1)');
  ok(await ate(async () => { const l = (await linhas(M)).pcs.find(p => p.id === idLi); return l.skills.pontos.p1 === 25 && l.skills.alocados.n_punho === 1 && l.skills.alocados.n_origem === 1; }, 15000), 'e no banco ficam as duas coisas: os pontos do jogador e a escolha do mestre');
  await B.evaluate(async () => { await subirGrau('n_punho'); }); await w(500, J);
  ok(await ate(async () => await F.evaluate(() => { const b = document.querySelector('#ficha [data-skpegar="n_punho"]'); return !!b && b.textContent.trim() === '2'; }), 15000), '(de volta ao grau 2, e a aba Skills da ficha do mestre mostra)');

  // (antes de o mestre apagar a mesa, o que o jogador acabou de fazer termina de subir: depois de apagada, o banco recusaria)
  await ate(async () => await J.evaluate(() => TC.dados.pendentes === 0) && await M.evaluate(() => TC.dados.pendentes === 0));
  await apagarMesaTela(M, nomeMesa);
  // de volta sem mesa: a biblioteca local intacta (o mestre estava nas Fichas; a Árvore só carrega quando ele abre a aba)
  await M.locator('#tab-arvore').click();
  const comoFicou = async () => { const q = M.frame({ url: /\/arvore\// }); if (!q) return { quadro: false, aba: await M.evaluate(() => (document.querySelector('.tab[aria-selected="true"]') || {}).id || null) }; try { return await q.evaluate(() => ({ bib: bib().nome, nodulo: bib().arvores[0].nodes[1].nome, pcs: doc.personagens.map(p => p.nome) })); } catch (e) { return { erro: String(e).slice(0, 120) }; } };
  ok(await ate(async () => { A = await quadro(M, /\/arvore\//); return A && await A.evaluate(() => typeof doc === 'object' && bib().nome === 'Campanha' && bib().arvores[0].nodes[1].nome === 'Punho de Ferro' && doc.personagens[0].nome === 'Rascunho local'); }), 'fora da mesa, a árvore do navegador continua como era: ' + JSON.stringify(await comoFicou()));
  const fora = t.errs.filter(e => !/status of (400|401|409)/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.join('\n') + '\nRESPOSTAS DE ERRO:\n' + t.ruins.join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
