// Clã pela interface, sem mesa (a página sozinha — quem abre é o mestre, e tudo fica neste navegador):
//   · os clãs: criar o dos jogadores e um de NPC (que nasce escondido), o nome e o lema, desfazer (o botão e Ctrl+Z);
//   · a hierarquia: cargos (no alto e abaixo de outro), renomear, pessoas (um nome; o personagem de teste), tirar,
//     mover (a janela e arrastando), apagar um cargo (os de baixo sobem), passar a liderança;
//   · os recursos (somar, tirar, escrever a quantidade; o motivo vai para o histórico; mudanças seguidas numa linha só),
//     as construções (o custo do próximo nível, "faltam", subir de nível, o efeito novo), o respeito no mundo (e os
//     nomes dos níveis, renomeados), as relações (com um clã escondido) e o respeito dos membros;
//   · o brasão (forma, divisão, cores, símbolo, imagem) e o que os jogadores veem de um clã de NPC;
//   · o salão (como os jogadores veem): as abas, as partes escondidas, o respeito dos membros só no clã dos jogadores;
//   · apagar o clã (e desfazer), recarregar a página e a tela estreita.
// (Numa mesa — o mestre, o líder, os outros jogadores e o banco —: src/tests/cla.rede.test.js.) TC_SCRATCH=<pasta> guarda capturas.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const PNG = { name: 'brasao.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64') };

(async () => {
  const t = await start();
  const dv = await t.device({ name: 'cla', w: 1440, h: 950 });
  const P = dv.page;
  P.setDefaultTimeout(8000);
  const A = (fn, arg) => P.evaluate(fn, arg);
  const k = s => P.locator(`[data-k="${s}"]`);
  const clicar = async sel => { await P.click(sel); await espera(180); };
  const escrever = async (s, v) => { const c = k(s); await c.fill(v); await c.dispatchEvent('change'); await espera(160); };
  const dlg = async (campos, botao) => { for (const [s, v] of Object.entries(campos || {})) await P.fill(`#dlg [data-k="${s}"]`, v); await clicar(`#dlg [data-k="${botao || 'dl:sim'}"]`); };
  const cla = () => A(() => __cla.doc('cla:c:' + __cla.sel));
  const rotulo = () => A(() => { const p = __cla.pilha; return p.length ? p[p.length - 1] : null; });
  const avisos = () => A(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const limparAvisos = () => A(() => document.getElementById('toasts').replaceChildren());
  const desfazerDoAviso = async () => { await P.locator('#toasts .toast button', { hasText: 'Desfazer' }).last().click(); await espera(300); };
  const cargoPorNome = async nome => A(n => { const c = __cla.doc('cla:c:' + __cla.sel).cargos; return Object.keys(c).find(x => c[x].nome === n) || null; }, nome);
  const foto = async nome => { if (process.env.TC_SCRATCH) await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png'), fullPage: true }); };
  let lam = null, varo = null;

  await passo('a página sozinha', async () => {
    await P.goto(t.base + 'cla/?debug&tudo', { waitUntil: 'load' });
    await P.waitForFunction(() => window.__cla && __cla.pronto, null, { timeout: 15000 }); await espera(300);
    ok(await A(() => __cla.mestre && !__cla.naMesa && __cla.vista === 'mestre') && await P.locator('#vistas').isVisible() && await P.locator('#mestre').isVisible(),
      'sem mesa, quem abre o Clã é o próprio mestre: o painel (Mestre) e o salão');
    ok(/Nenhum clã ainda/.test(await P.locator('#mestre').innerText()) && /Neste navegador/.test(await P.locator('#salvo').innerText()) && await P.locator('#btDesfazer').isDisabled(),
      'nenhum clã; tudo neste navegador; nada para desfazer');
  });

  await passo('criar os clãs', async () => {
    await clicar('[data-k="novo-cla"]');
    ok(await P.locator('#dlg[open] [data-k="dl:jog"]').isChecked(), 'o primeiro clã já vem marcado como o dos jogadores');
    await dlg({ 'dl:nome': '  Lâmina do Crepúsculo ' });
    lam = await A(() => __cla.sel);
    const c = await cla();
    ok(c && c.nome === 'Lâmina do Crepúsculo' && c.jogadores === true && c.cargos.lider.nome === 'Líder' && c.ver.mostrar === false && /Ponha alguém na liderança/.test(await avisos()),
      'a Lâmina do Crepúsculo, o clã dos jogadores (com o cargo de líder, vazio)');
    ok(/Clã dos jogadores · eles veem tudo/.test(await P.locator(`.cla-item[data-cla="${lam}"]`).innerText()) && await k('c:ver').count() === 0 && await k('c:lider').innerText() === 'Passar a liderança…',
      'na lista: "Clã dos jogadores"; sem "O que os jogadores veem…" (eles veem tudo)');
    await clicar('[data-k="novo-cla"]');
    ok(!(await P.locator('#dlg[open] [data-k="dl:jog"]').isChecked()), 'o segundo, não');
    await dlg({ 'dl:nome': 'Casa Varonil' });
    varo = await A(() => __cla.sel);
    ok(varo !== lam && /NPC · escondido dos jogadores/.test(await P.locator(`.cla-item[data-cla="${varo}"]`).innerText()) && /escondido dos jogadores/.test(await avisos())
      && await k('c:ver').isVisible() && await k('c:lider').innerText() === 'Trocar o líder…', 'a Casa Varonil, de NPC, nasce escondida dos jogadores');
    const cores = await A(([a, b]) => [__cla.doc('cla:c:' + a).brasao.cores.join(), __cla.doc('cla:c:' + b).brasao.cores.join()], [lam, varo]);
    ok(cores[0] !== cores[1], 'cada clã novo com um brasão de cores diferentes');
    await clicar(`.cla-item[data-cla="${lam}"]`);
    ok(await A(() => __cla.sel) === lam && await P.locator(`.cla-item[data-cla="${lam}"]`).getAttribute('aria-pressed') === 'true', 'escolher um clã na lista');
  });

  await passo('o nome, o lema e o desfazer', async () => {
    await escrever('c:lema', '“Onde a luz termina, nós ficamos.”');
    ok((await cla()).lema === '“Onde a luz termina, nós ficamos.”' && await rotulo() === 'mudar o lema', 'o lema');
    await escrever('c:nome', '   ');
    ok((await cla()).nome === 'Lâmina do Crepúsculo' && await k('c:nome').inputValue() === 'Lâmina do Crepúsculo', 'o nome não fica vazio');
    await escrever('c:nome', 'Lâmina');
    await P.locator('#mestre .tit', { hasText: 'Clãs' }).click(); await espera(100);
    await P.keyboard.press('Control+z'); await espera(300);
    ok((await cla()).nome === 'Lâmina do Crepúsculo' && /Desfeito: mudar o nome do clã/.test(await avisos()), 'Ctrl+Z desfaz o nome');
    ok(await k('c:fac').isDisabled() && /Nenhuma facção nos mapas ainda/.test(await k('c:fac').innerText()), 'sem mapas do Mapa-múndi, nenhuma facção para escolher');
  });

  await passo('a hierarquia: cargos e pessoas', async () => {
    await clicar('[data-k="sub:lider"]'); await dlg({ 'dl:nome': 'Conselheira' });
    await clicar('[data-k="sub:lider"]'); await dlg({ 'dl:nome': 'Mestre de armas' });
    const kc = await cargoPorNome('Conselheira'), km = await cargoPorNome('Mestre de armas');
    ok(kc && km && (await cla()).cargos[kc].pai === 'lider' && (await cla()).hist[0].txt === 'O mestre: criou o cargo Mestre de armas.', 'dois cargos logo abaixo do líder (e o histórico)');
    await clicar(`[data-k="sub:${kc}"]`); await dlg({ 'dl:nome': 'Batedores' });
    const kb = await cargoPorNome('Batedores');
    ok((await cla()).cargos[kb].pai === kc && await P.locator(`[data-k="ramo:${kc}"] [data-cargo="${kb}"]`).count() === 1, 'os Batedores, abaixo da Conselheira (desenhados embaixo dela)');
    await clicar(`[data-k="ren:${kb}"]`);
    ok(await P.locator('#dlg[open] [data-k="dl:nome"]').inputValue() === 'Batedores', 'renomear: o nome de agora no campo');
    await dlg({ 'dl:nome': 'Batedores do Vale' });
    ok((await cla()).cargos[kb].nome === 'Batedores do Vale', 'renomeado');
    await clicar(`[data-k="pes:${kc}"]`);
    ok(await P.locator('#dlg[open] [data-k="dl:modo-pc"]').isChecked(), 'pôr alguém: começa pelos personagens da mesa');
    await clicar('#dlg [data-k="dl:sim"]');
    await clicar(`[data-k="pes:${kb}"]`); await clicar('#dlg [data-k="dl:modo-nome"]'); await dlg({ 'dl:nome': 'Tobias' });
    await clicar(`[data-k="pes:${kb}"]`); await clicar('#dlg [data-k="dl:modo-nome"]'); await dlg({ 'dl:nome': 'Rin' });
    const c = await cla();
    ok(c.cargos[kc].gente[0].pc === 'pc_teste' && c.cargos[kc].gente[0].nome === 'Personagem de teste' && c.cargos[kb].gente.map(p => p.nome).join() === 'Tobias,Rin' && c.cargos[kb].gente.every(p => p.resp === 0),
      'o personagem de teste na Conselheira; Tobias e Rin (só nomes) nos Batedores, com respeito 0');
    ok(/Personagem de teste · teste/.test(await P.locator(`[data-cargo="${kc}"]`).innerText()) && await P.locator(`[data-cargo="${kb}"] .resp`).count() === 2, 'no cartão: o personagem e de quem é; o respeito de cada um');
    const rin = c.cargos[kb].gente[1].id;
    await clicar(`[data-k="tirar:${rin}"]`);
    ok((await cla()).cargos[kb].gente.length === 1 && /Rin saiu do cargo/.test(await avisos()), 'tirar a Rin');
    await desfazerDoAviso();
    ok((await cla()).cargos[kb].gente.length === 2, 'o Desfazer do aviso a traz de volta');
    await clicar('[data-k="sub:lider"]'); await dlg({ 'dl:nome': 'Tesoureiro' });
    const kt = await cargoPorNome('Tesoureiro');
    await clicar(`[data-k="pes:${kt}"]`); await clicar('#dlg [data-k="dl:modo-nome"]'); await dlg({ 'dl:nome': 'Oswin' });
    await foto('cla-1-cargos');
  });

  await passo('mover e apagar cargos', async () => {
    const kc = await cargoPorNome('Conselheira'), km = await cargoPorNome('Mestre de armas'), kb = await cargoPorNome('Batedores do Vale'), kt = await cargoPorNome('Tesoureiro');
    await clicar(`[data-k="mov:${kb}"]`);
    ok(!(await P.locator('#dlg [data-k="dl:pai"] option').allInnerTexts()).some(x => /Batedores/.test(x)), 'mover: o próprio cargo (e os de baixo dele) não aparecem como destino');
    await P.selectOption('#dlg [data-k="dl:pai"]', km); await espera(100);
    await clicar('#dlg [data-k="dl:sim"]');
    ok((await cla()).cargos[kb].pai === km && /pôs o cargo Batedores do Vale abaixo de Mestre de armas/.test((await cla()).hist[0].txt), 'os Batedores foram para debaixo do Mestre de armas');
    // arrastar o Tesoureiro para o quarto da esquerda da Conselheira: vai antes dela
    const alvo = P.locator(`[data-cargo="${kc}"]`), caixa = await alvo.boundingBox();
    await P.locator(`[data-cargo="${kt}"] .alca`).dragTo(alvo, { targetPosition: { x: 8, y: caixa.height / 2 } }); await espera(400);
    const ordem = await A(() => { const c = __cla.doc('cla:c:' + __cla.sel).cargos; return Object.keys(c).filter(x => c[x].pai === 'lider').sort((a, b) => c[a].ordem - c[b].ordem).map(x => c[x].nome).join(','); });
    ok(ordem === 'Tesoureiro,Conselheira,Mestre de armas', 'arrastando, o Tesoureiro vai para antes da Conselheira: ' + ordem);
    // arrastar para o meio de um cargo: fica debaixo dele
    const meio = await P.locator(`[data-cargo="${km}"]`).boundingBox();
    await P.locator(`[data-cargo="${kt}"] .alca`).dragTo(P.locator(`[data-cargo="${km}"]`), { targetPosition: { x: meio.width / 2, y: meio.height / 2 } }); await espera(400);
    ok((await cla()).cargos[kt].pai === km, 'no meio do Mestre de armas: o Tesoureiro fica debaixo dele');
    await P.keyboard.press('Control+z'); await espera(300);
    ok((await cla()).cargos[kt].pai === 'lider', 'desfazer o arrasto');
    await clicar(`[data-k="apg:${km}"]`);
    ok(/Os cargos de baixo sobem/.test(await P.locator('#dlg[open]').innerText()), 'apagar um cargo pergunta antes (os de baixo sobem)');
    await clicar('#dlg [data-k="dl:sim"]');
    const c = await cla();
    ok(!c.cargos[km] && c.cargos[kb].pai === 'lider', 'o Mestre de armas sai; os Batedores sobem para o lugar dele');
    await desfazerDoAviso();
    ok((await cla()).cargos[km] && (await cla()).cargos[kb].pai === km, 'o Desfazer do aviso traz o cargo (e os Batedores voltam para debaixo dele)');
  });

  await passo('passar a liderança', async () => {
    const kc = await cargoPorNome('Conselheira');
    await clicar('[data-k="c:lider"]');
    ok(/Ninguém lidera agora/.test(await P.locator('#dlg[open]').innerText()), 'ninguém lidera ainda');
    await P.selectOption('#dlg [data-k="dl:novo"]', { label: 'Personagem de teste · Conselheira' }); await espera(100);
    await clicar('#dlg [data-k="dl:sim"]');
    let c = await cla();
    ok(c.cargos.lider.gente[0].nome === 'Personagem de teste' && !c.cargos[kc].gente.length && c.hist[0].txt === 'A liderança passou para Personagem de teste.', 'o personagem de teste (que estava na Conselheira) passa a liderar');
    await clicar('[data-k="liderar"]');
    await P.selectOption('#dlg [data-k="dl:novo"]', { label: 'Oswin · Tesoureiro' }); await espera(100);
    ok(await P.locator('#dlg [data-k="dl:velho"]').inputValue() === await cargoPorNome('Tesoureiro'), 'quem sai da liderança vai, de começo, para o cargo de quem entra');
    await P.selectOption('#dlg [data-k="dl:velho"]', kc); await clicar('#dlg [data-k="dl:sim"]');
    c = await cla();
    ok(c.cargos.lider.gente[0].nome === 'Oswin' && c.cargos[kc].gente[0].nome === 'Personagem de teste', 'o Oswin lidera; o personagem de teste volta para a Conselheira');
    await P.keyboard.press('Control+z'); await espera(300);
    ok((await cla()).cargos.lider.gente[0].nome === 'Personagem de teste', 'desfazer a troca');
  });

  await passo('os recursos', async () => {
    await clicar('[data-k="rec:novo"]'); await dlg({ 'dl:nome': 'Ferro', 'dl:qtd': '18' });
    await clicar('[data-k="rec:novo"]'); await dlg({ 'dl:nome': 'Madeira', 'dl:qtd': '55' });
    let c = await cla();
    const fe = c.recursos.lista[0].id, ma = c.recursos.lista[1].id;
    ok(c.recursos.lista.map(r => r.nome + ' ' + r.qtd).join(', ') === 'Ferro 18, Madeira 55', 'dois recursos');
    await P.fill('[data-k="mot:rec"]', 'a mina do norte');
    await clicar(`[data-k="rec:mais:${fe}"]`); await clicar(`[data-k="rec:mais:${fe}"]`);
    await P.click(`[data-k="rec:mais:${fe}"]`, { modifiers: ['Shift'] }); await espera(200);
    c = await cla();
    ok(c.recursos.lista[0].qtd === 30 && c.recursos.hist.length === 1 && c.recursos.hist[0].mud[0].d === 12 && c.recursos.hist[0].mot === 'a mina do norte' && await k('mot:rec').inputValue() === '',
      'somar 1, 1 e 10 (Shift): uma linha só no histórico (+12, com o motivo); o campo do motivo esvazia');
    await escrever(`rec:qtd:${ma}`, '40');
    c = await cla();
    ok(c.recursos.lista[1].qtd === 40 && c.recursos.hist[0].mud[0].d === -15 && c.recursos.hist[0].mud[0].n === 'Madeira', 'escrever a quantidade: o histórico leva a diferença');
    await clicar(`[data-k="rec:menos:${ma}"]`);
    ok((await cla()).recursos.hist[0].mud[0].d === -16 && /Madeira/.test(await rotulo()), 'tirar 1 da Madeira (na mesma linha)');
    await clicar(`[data-k="rec:ren:${fe}"]`); await dlg({ 'dl:nome': 'Ferro bom' });
    ok((await cla()).recursos.lista[0].nome === 'Ferro bom', 'renomear um recurso');
    await P.keyboard.press('Control+z'); await espera(250);
  });

  await passo('as construções', async () => {
    let c = await cla();
    const fe = c.recursos.lista[0].id;
    await clicar('[data-k="cons:nova"]');
    await P.fill('#dlg [data-k="dl:nome"]', 'Forja'); await clicar('#dlg [data-ico="forja"]'); await P.fill('#dlg [data-k="dl:nivel"]', '2');
    await P.fill('#dlg [data-k="dl:efeito"]', 'Armas comuns pela metade do preço.');
    await clicar('#dlg [data-k="dl:custo-mais"]'); await clicar('#dlg [data-k="dl:custo-mais"]');
    await P.fill('#dlg [data-k="dl:custo-qtd:0"]', '45'); await P.fill('#dlg [data-k="dl:custo-qtd:1"]', '20');
    await P.fill('#dlg [data-k="dl:efeito-novo"]', 'Armas e armaduras pela metade do preço.');
    await clicar('#dlg [data-k="dl:sim"]');
    c = await cla();
    const f = c.construcoes[0];
    ok(f && f.nome === 'Forja' && f.ico === 'forja' && f.nivel === 2 && f.prox.custo.map(x => x.nome + ' ' + x.qtd).join() === 'Ferro 45,Madeira 20' && f.prox.efeito === 'Armas e armaduras pela metade do preço.',
      'a Forja, nível 2, com o custo do nível 3 (45 Ferro, 20 Madeira) e o efeito novo');
    ok(await k(`cons:sobe:${f.id}`).isDisabled() && /Faltam 15 Ferro/.test(await P.locator(`[data-cons="${f.id}"]`).innerText()), 'sem Ferro bastante: "faltam 15 Ferro" e o botão desativado');
    await P.fill(`[data-k="rec:qtd:${fe}"]`, '100'); await k(`rec:qtd:${fe}`).dispatchEvent('change'); await espera(200);
    ok(!(await k(`cons:sobe:${f.id}`).isDisabled()) && /\(−45 Ferro, −20 Madeira\)/.test(await k(`cons:sobe:${f.id}`).getAttribute('title')), 'com recursos: o botão diz o que vai sair');
    await clicar(`[data-k="cons:sobe:${f.id}"]`);
    c = await cla();
    ok(c.construcoes[0].nivel === 3 && c.construcoes[0].efeito === 'Armas e armaduras pela metade do preço.' && c.recursos.lista[0].qtd === 55 && c.recursos.lista[1].qtd === 19
      && c.recursos.hist[0].mot === 'Forja subiu para o nível 3' && c.hist[0].tipo === 'cons' && /Forja subiu para o nível 3/.test(await avisos()), 'subir de nível: desconta, o efeito novo vale, vai para o histórico');
    ok(/sem custo/.test(await P.locator(`[data-cons="${f.id}"]`).innerText()), 'o próximo nível fica sem custo (o mestre escreve)');
    await desfazerDoAviso();
    c = await cla();
    ok(c.construcoes[0].nivel === 2 && c.recursos.lista[0].qtd === 100, 'desfazer: o nível e os recursos voltam');
    await clicar(`[data-k="cons:ed:${f.id}"]`); await P.fill('#dlg [data-k="dl:nome"]', 'Forja Grande'); await clicar('#dlg [data-k="dl:sim"]');
    ok((await cla()).construcoes[0].nome === 'Forja Grande', 'editar a construção');
    await clicar('[data-k="cons:nova"]'); await dlg({ 'dl:nome': 'Biblioteca' });
    ok((await cla()).construcoes[1].nivel === 0 && /Ainda não construída/.test(await P.locator('[data-k="sec:cons"]').innerText()), 'uma construção de nível 0: ainda não construída');
    const bib = (await cla()).construcoes[1].id;
    await clicar(`[data-k="cons:ed:${bib}"]`); await clicar('#dlg [data-k="dl:apagar"]');
    ok(/os recursos gastos nela não voltam/.test(await P.locator('#dlg[open]').innerText()), 'apagar uma construção pergunta antes');
    await clicar('#dlg [data-k="dl:sim"]');
    ok((await cla()).construcoes.length === 1, 'a Biblioteca saiu');
    // (lote 8) um recurso que o clã ainda não tem, direto no custo: entra na lista com 0, no mesmo passo
    const nRec = (await cla()).recursos.lista.length;
    await limparAvisos();
    await clicar('[data-k="cons:nova"]');
    await P.fill('#dlg [data-k="dl:nome"]', 'Torre de Mitril');
    await clicar('#dlg [data-k="dl:custo-novo"]');
    ok(await P.locator('#dlg [data-k="dl:custo-novo:0"]').count() === 1 && await P.evaluate(() => document.activeElement && document.activeElement.dataset.k === 'dl:custo-novo:0'), '"+ recurso novo no custo": um campo para o nome, já com o cursor');
    await P.fill('#dlg [data-k="dl:custo-novo:0"]', '  Mitril ');
    await P.fill('#dlg [data-k="dl:custo-qtd:0"]', '30');
    // o mesmo nome de um que já existe (sem acento e maiúscula) usa o que existe
    await clicar('#dlg [data-k="dl:custo-novo"]'); await P.fill('#dlg [data-k="dl:custo-novo:1"]', 'ferro'); await P.fill('#dlg [data-k="dl:custo-qtd:1"]', '5');
    await clicar('#dlg [data-k="dl:sim"]');
    c = await cla();
    const torre = c.construcoes.find(x => x.nome === 'Torre de Mitril'), mit = c.recursos.lista.find(r => r.nome === 'Mitril');
    ok(torre && mit && mit.qtd === 0 && c.recursos.lista.length === nRec + 1 && torre.prox.custo.map(x => x.rec + ':' + x.qtd).join() === mit.id + ':30,' + fe + ':5',
      'salvo: o Mitril entra na lista do clã com 0 e já está no custo; "ferro" usou o Ferro que existia: ' + JSON.stringify(torre && torre.prox.custo));
    ok(/Recurso novo na lista do clã \(com 0\): Mitril/.test(await avisos()), 'o aviso diz o recurso novo: ' + await avisos());
    await desfazerDoAviso();
    c = await cla();
    ok(!c.construcoes.some(x => x.nome === 'Torre de Mitril') && !c.recursos.lista.some(r => r.nome === 'Mitril'), 'um Desfazer tira os dois (a construção e o recurso novo)');
    // o "+ Recurso novo…" na lista de um custo também
    await clicar(`[data-k="cons:ed:${f.id}"]`);
    await P.selectOption('#dlg [data-k="dl:custo-rec:0"]', '__novo__'); await espera(150);
    ok(await P.locator('#dlg [data-k="dl:custo-novo:0"]').count() === 1, '"+ Recurso novo…" na lista troca a linha por um campo de nome');
    await clicar('#dlg [data-k="dl:sim"]');
    ok(await P.locator('#dlg[open]').count() === 1 && /Dê um nome ao recurso novo do custo/.test(await avisos()), 'sem nome, a janela não fecha (e diz por quê)');
    await P.fill('#dlg [data-k="dl:custo-novo:0"]', 'Aço negro'); await clicar('#dlg [data-k="dl:sim"]');
    c = await cla();
    ok(c.recursos.lista.some(r => r.nome === 'Aço negro' && r.qtd === 0) && c.construcoes[0].prox.custo[0].nome === 'Aço negro', 'ao editar uma construção também');
    await desfazerDoAviso();
  });

  await passo('o respeito no mundo e os nomes dos níveis', async () => {
    await P.fill('[data-k="mot:resp"]', 'a escolta da caravana');
    await clicar('[data-k="resp:mais"]'); await clicar('[data-k="resp:mais"]');
    let c = await cla();
    ok(c.respeito.v === 2 && c.respeito.hist.length === 1 && c.respeito.hist[0].de === 0 && c.respeito.hist[0].para === 2 && c.respeito.hist[0].mot === 'a escolta da caravana'
      && await k('resp:txt').innerText() === '+2 · Respeitado', 'de 0 a +2 numa linha só (com o motivo): "+2 · Respeitado"');
    ok(await P.locator('[data-k="esc-m"] [data-n]').count() === 21 && await P.locator('[data-k="esc-m"] [data-n="10"]').innerText() === '+10' && await P.locator('[data-k="esc-m"] [data-n="7"]').innerText() === '',
      '(lote 8) a escala vai de −10 a +10 (o número no 0, no ±5, no ±10 e no de agora)');
    await clicar('[data-k="esc-m"] [data-n="5"]');
    ok(!(await k('resp:mais').isDisabled()), '(lote 8) no +5, o + continua');
    await clicar('[data-k="resp:mais"]');
    ok((await cla()).respeito.v === 6 && await k('resp:txt').innerText() === '+6 · Mítico', '(lote 8) +6 · Mítico, um dos níveis novos');
    await clicar('[data-k="esc-m"] [data-n="10"]');
    ok(await k('resp:mais').isDisabled() && await k('resp:txt').innerText() === '+10 · Divino', '(lote 8) +10 · Divino, e o + para no limite');
    await clicar('[data-k="esc-m"] [data-n="-3"]');
    ok((await cla()).respeito.v === -3 && (await cla()).respeito.hist.length === 2 && await k('resp:txt').innerText() === '−3 · Temido', 'clicar na escala (outra linha: sem motivo novo, mas depois de um com motivo… e longe no valor)');
    await clicar('[data-k="corrigir:0"]'); await dlg({ 'dl:mot': 'o massacre na ponte' });
    c = await cla();
    ok(c.respeito.hist[0].mot === 'o massacre na ponte' && c.hist.find(e => e.tipo === 'resp' && e.para === -3).mot === 'o massacre na ponte', 'corrigir o motivo (nas duas listas)');
    await clicar('[data-k="niveis"]');
    ok(await P.locator('#dlg [data-k^="nv:mundo:"]').count() === 21, '(lote 8) a janela dos nomes tem os 21 níveis de cada escala, de −10 a +10');
    await P.fill('#dlg [data-k="nv:mundo:7"]', 'Pavor do Vale'); await clicar('#dlg [data-k="dl:sim"]');
    ok(await k('resp:txt').innerText() === '−3 · Pavor do Vale' && (await A(() => __cla.doc('cla:nomes'))).mundo[7] === 'Pavor do Vale' && (await A(() => __cla.doc('cla:nomes'))).v === 2, 'renomear um nível: vale na hora (para a mesa toda)');
    await clicar('[data-k="niveis"]'); await clicar('#dlg [data-k="nv:comeco"]'); await clicar('#dlg [data-k="dl:sim"]');
    ok(await k('resp:txt').innerText() === '−3 · Temido', 'voltar aos nomes de começo');
  });

  await passo('as relações e o respeito dos membros', async () => {
    await clicar('[data-k="rel:nova"]');
    ok(/Casa Varonil \(os jogadores não o veem\)/.test(await P.locator('#dlg [data-k="dl:alvo"]').innerText()), 'a relação nova: os outros clãs (o escondido, marcado)');
    ok(await P.locator('#dlg [data-k="dl:valor"] option').count() === 21 && /\+10 · Um só povo/.test(await P.locator('#dlg [data-k="dl:valor"]').innerText()), '(lote 8) a relação nova começa em qualquer nível de −10 a +10');
    await P.selectOption('#dlg [data-k="dl:valor"]', '-2'); await clicar('#dlg [data-k="dl:sim"]');
    let c = await cla();
    const r = c.relacoes[0];
    ok(r && r.tipo === 'cla' && r.alvo === varo && r.v === -2 && c.hist[0].tipo === 'rel' && c.hist[0].para === -2 && /\(escondido\)/.test(await P.locator(`[data-rel="${r.id}"]`).innerText()),
      'a relação com a Casa Varonil (−2), marcada como escondida dos jogadores');
    ok(!(await A(id => __cla.pub(id), lam)).relacoes.length, 'o que os jogadores recebem da Lâmina não tem a relação com a Varonil (escondida)');
    await clicar(`[data-k="rel:menos:${r.id}"]`);
    ok((await cla()).relacoes[0].v === -3 && /−3 · Rival/.test(await P.locator(`[data-rel="${r.id}"]`).innerText()), 'piorar: −3 · Rival');
    const pid = (await cla()).cargos.lider.gente[0].id;
    await clicar(`[data-k="mb:mais:${pid}"]`); await clicar(`[data-k="mb:mais:${pid}"]`); await clicar(`[data-k="mb:mais:${pid}"]`);
    c = await cla();
    ok(c.cargos.lider.gente[0].resp === 3 && c.hist[0].tipo === 'membro' && c.hist[0].de === 0 && c.hist[0].para === 3 && /\+3 · Estimado/.test(await P.locator(`[data-k="mb:v:${pid}"]`).innerText())
      && (await P.locator('[data-cargo="lider"] .resp').innerText()) === '+3', 'o respeito do líder: +3 (Estimado), também no cartão do cargo');
    await foto('cla-2-painel');
  });

  await passo('o brasão', async () => {
    await clicar('[data-k="c:brasao"]');
    ok(await P.locator('#dlg[open] .brasao-ed').isVisible(), 'a janela do brasão');
    await clicar('#dlg [data-forma="losango"]'); await clicar('#dlg [data-div="esquartelado"]');
    await clicar('#dlg [data-alvo="1"]'); await clicar('#dlg [data-cor="#8a2a2a"]'); await clicar('#dlg [data-simb="lobo"]');
    let b = (await cla()).brasao;
    ok(b.forma === 'losango' && b.div === 'esquartelado' && b.cores[1] === '#8a2a2a' && b.simb === 'lobo' && await P.locator('#dlg [data-forma="losango"]').getAttribute('aria-pressed') === 'true',
      'forma, divisão, a segunda cor e o símbolo (cada um vale na hora)');
    ok(await A(() => __cla.pilha.slice(-4).join('|')) === 'mudar a forma do brasão|mudar a divisão do brasão|mudar a cor do brasão|mudar o símbolo do brasão', 'um passo de desfazer cada');
    const [fc] = await Promise.all([P.waitForEvent('filechooser'), P.click('#dlg [data-k="br:img"]')]); await fc.setFiles(PNG);
    await P.waitForFunction(() => { const c = __cla.doc('cla:c:' + __cla.sel); return c && c.brasao.img; }, null, { timeout: 8000 }); await espera(300);
    ok(/^data:image\/png;base64,/.test((await cla()).brasao.img) && await P.locator('#dlg .previa img').count() === 1 && await k('br:sem-img').isVisible(), 'a imagem do mestre no lugar do desenho (embutida, sem mesa)');
    await clicar('#dlg [data-k="br:sem-img"]');
    ok((await cla()).brasao.img === null && await P.locator('#dlg .previa svg').count() === 1, 'voltar ao desenho');
    await clicar('#dlg [data-k="dl:fechar"]');
    ok(await P.locator(`.cla-item[data-cla="${lam}"] svg`).count() === 1, 'o brasão novo na lista dos clãs');
  });

  await passo('o que os jogadores veem de um clã de NPC', async () => {
    await clicar(`.cla-item[data-cla="${varo}"]`);
    await clicar('[data-k="c:ver"]');
    ok(await P.locator('#dlg [data-ver="cargos"]').isDisabled() && /Nada: o clã está escondido/.test(await P.locator('#dlg').innerText()), 'escondido: as partes nem dá para marcar');
    await clicar('#dlg [data-ver="mostrar"]'); await clicar('#dlg [data-ver="cargos"]'); await clicar('#dlg [data-ver="respeito"]');
    const c = await cla();
    ok(c.ver.mostrar && c.ver.cargos && c.ver.respeito && !c.ver.recursos && /Cargos e quem ocupa · Respeito no mundo/.test(await P.locator('#dlg [data-k="ver:previa"]').innerText()), 'mostrar o clã, os cargos e o respeito: a prévia acompanha');
    await clicar('#dlg [data-k="dl:fechar"]');
    ok(/NPC · os jogadores veem: cargos, respeito/.test(await P.locator(`.cla-item[data-cla="${varo}"]`).innerText()), 'a lista diz o que eles veem');
    await clicar('[data-k="sub:lider"]'); await dlg({ 'dl:nome': 'Espiã-mor' });
    const ke = await cargoPorNome('Espiã-mor');
    await clicar(`[data-k="pes:${ke}"]`); await clicar('#dlg [data-k="dl:modo-nome"]'); await dlg({ 'dl:nome': 'Vesna' });
    await clicar('[data-k="c:lider"]'); await clicar('#dlg [data-k="dl:modo-nome"]').catch(() => {});
    await P.selectOption('#dlg [data-k="dl:novo"]', 'n:'); await espera(100); await P.fill('#dlg [data-k="dl:nome"]', 'Lorde Aster'); await clicar('#dlg [data-k="dl:sim"]');
    ok((await cla()).cargos.lider.gente[0].nome === 'Lorde Aster', 'o líder de um clã de NPC: só um nome');
  });

  await passo('o salão (como os jogadores veem)', async () => {
    await limparAvisos();
    await clicar('[data-vista="salao"]');
    ok(await P.locator('#salao').isVisible() && await A(() => __cla.vista) === 'salao' && await P.locator('#escolhaCla').isVisible(), 'o salão, com a escolha do clã');
    await clicar(`#escolhaCla [data-cla="${lam}"]`);
    ok(await P.locator('#nomeCla h1').innerText() === 'Lâmina do Crepúsculo' && /Onde a luz termina/.test(await P.locator('#nomeCla').innerText()) && await P.locator('#fundo > svg').count() === 1
      && /Respeito no mundo: −3 · Temido/.test((await P.locator('#chips').innerText()).replace(/\s+/g, ' ')), 'o salão da Lâmina: o nome, o lema, o desenho com as bandeiras e o respeito no mundo');
    ok(await P.locator('#abas button.tranca').count() === 0 && await P.locator('#parte [data-cargo="lider"] .resp').count() === 1 && await P.locator('#parte button').count() === 0,
      'o clã dos jogadores: todas as abas abertas; o respeito de cada membro aparece; nada para mexer (é a vista dos jogadores)');
    await clicar('[data-aba="cons"]');
    ok(/Forja Grande/.test(await P.locator('#parte').innerText()) && /Para o nível 3: 45 Ferro · 20 Madeira/.test(await P.locator('#parte').innerText()), 'as construções, com o custo do próximo nível');
    await clicar('[data-aba="rec"]');
    ok(/Ferro\s*100/.test(await P.locator('#parte').innerText()) && /a mina do norte/.test(await P.locator('#parte').innerText()), 'os recursos e o que mudou');
    await clicar('[data-aba="hist"]');
    ok(/Respeito de Personagem de teste no clã: \+3 \(Estimado\)/.test(await P.locator('#parte').innerText()) && /A liderança passou para Personagem de teste/.test(await P.locator('#parte').innerText()), 'o histórico');
    await clicar(`#escolhaCla [data-cla="${varo}"]`);
    ok(await P.locator('#abas button.tranca').count() === 4 && await P.locator('[data-aba="hier"]').getAttribute('aria-selected') === 'true', 'a Casa Varonil: os membros, as construções, os recursos e o histórico trancados (lote 56: a aba Membros)');
    ok(/Espiã-mor/.test(await P.locator('#parte').innerText()) && await P.locator('#parte .resp').count() === 0, 'os cargos, sem o respeito dos membros (clã de NPC)');
    await clicar('[data-aba="rec"]');
    ok(/O mestre ainda não mostrou esta parte de Casa Varonil/.test(await P.locator('#parte').innerText()), 'a parte trancada diz que o mestre ainda não mostrou');
    await clicar(`#escolhaCla [data-cla="${lam}"]`); await clicar('[data-aba="resp"]');
    ok(/Casa Varonil/.test(await P.locator('#parte').innerText()) && /−3 · Rival/.test(await P.locator('#parte').innerText()), '...mas agora que a Varonil está à mostra, a relação com ela aparece no salão da Lâmina');
    await foto('cla-3-salao');
    await clicar('[data-vista="mestre"]');
  });

  await passo('esconder de novo e apagar o clã', async () => {
    await clicar(`.cla-item[data-cla="${varo}"]`);
    await clicar('[data-k="c:ver"]'); await clicar('#dlg [data-ver="mostrar"]'); await clicar('#dlg [data-k="dl:fechar"]');
    await clicar('[data-vista="salao"]');
    ok(/Os jogadores não veem este clã/.test(await P.locator('#chips').innerText()) && await P.locator('#abas').isHidden(), 'no salão, um clã escondido avisa que os jogadores não o veem');
    await clicar('[data-vista="mestre"]');
    await clicar('[data-k="c:apagar"]'); await clicar('#dlg [data-k="dl:sim"]');
    ok(await P.locator(`.cla-item[data-cla="${varo}"]`).count() === 0 && !(await A(id => __cla.doc('cla:c:' + id), varo)), 'apagar a Casa Varonil');
    await desfazerDoAviso();
    ok(await P.locator(`.cla-item[data-cla="${varo}"]`).count() === 1 && (await A(id => __cla.doc('cla:c:' + id), varo)).cargos.lider.gente[0].nome === 'Lorde Aster', 'o Desfazer do aviso a traz de volta, inteira');
  });

  await passo('depois de recarregar', async () => {
    await P.reload({ waitUntil: 'load' });
    await P.waitForFunction(() => window.__cla && __cla.pronto, null, { timeout: 15000 }); await espera(300);
    ok(await P.locator('.cla-item').count() === 2 && await P.locator('#btDesfazer').isDisabled() && await A(() => __cla.vista) === 'mestre', 'recarregando, tudo continua (neste navegador); o desfazer começa de novo');
  });

  await passo('tela estreita', async () => {
    await P.setViewportSize({ width: 390, height: 844 }); await espera(400);
    ok(await A(() => document.documentElement.scrollWidth <= innerWidth + 1), 'o painel cabe na tela estreita (sem rolar para os lados)');
    await clicar('[data-vista="salao"]');
    ok(await A(() => document.documentElement.scrollWidth <= innerWidth + 1) && await P.locator('#cena').isVisible(), 'o salão também');
    await foto('cla-4-390');
  });

  const inesperados = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  end();
})();
