// (lote 209) O puzzle no Escudo em três passos, na tela do notebook do mestre (1366×768): a galeria (as famílias, os
// novos, a busca, "só os que eu escrevo"), o tutorial do "?" (anda sozinho, para, volta, "Usar este puzzle"), o nível
// com a frase do que muda, os que o mestre escreve (a palavra, o quadro de dedução, as portas dos guardas) e alguns
// puzzles novos jogados na prévia como os jogadores jogam (a palavra, a dedução, a torre, os jarros pela dica).
const { start, checker } = require('./lib');
const { ok, end } = checker();
(async () => {
  const t = await start();
  const { page: p } = await t.device({ name: 'escudo209', w: 1366, h: 768 });
  p.setDefaultTimeout(8000);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const w = ms => p.waitForTimeout(ms);
  const ev = (fn, a) => p.evaluate(fn, a);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const clicar = async (k, ms) => { await p.click('[data-k="' + k + '"]'); await w(ms || 120); };
  const resolvido = async () => { for (let i = 0; i < 30; i++) { if (await p.locator('.previa .pz.resolvido').count()) return true; await w(100); } return false; };
  await p.goto(t.base + 'escudo/?debug'); await w(700);
  await clicar('aba:handouts', 150);
  await clicar('h:novo:puzzle', 300);
  const puz = await ev(() => __escudo.HO.sel);
  const pz = () => ev(id => JSON.parse(JSON.stringify(__escudo.A.handout(id).puzzle)), puz);
  const m = () => ev(id => { const h = __escudo.A.handout(id); return JSON.parse(JSON.stringify(__escudo.E.montarPuzzle(h.puzzle, h.img, h.imgAr))); }, puz);
  const tst = () => ev(id => { const x = __escudo.HO.testes[id]; return x ? JSON.parse(JSON.stringify(x.jogo)) : null; }, puz);
  const escolher = async tipo => { if (!(await p.locator('[data-k="pz:t:' + tipo + '"]').count())) await clicar('pz:trocar', 200); if (await p.locator('[data-k="pz:fam:todos"]').count()) await clicar('pz:fam:todos', 100); if (await p.locator('[data-k="pz:busca"]').count()) await p.fill('[data-k="pz:busca"]', ''); await w(100); await clicar('pz:t:' + tipo, 300); };

  await passo('a galeria', async () => {
    ok(await p.locator('.pz-passo.at', { hasText: 'Escolher' }).count() === 1 && await p.locator('.gal-card').count() === 46 && !(await p.locator('.previa').count()), 'o puzzle novo abre no passo 1: a galeria com os 46 tipos, sem a prévia');
    await clicar('pz:fam:novos', 150);
    ok(await p.locator('.gal-card').count() === 26 && await p.locator('.gal-card .gal-novo').count() === 26, 'o filtro “Novos”: os 26 do lote 209, com a marca');
    await clicar('pz:fam:mecanismos', 150);
    ok(await p.locator('.gal-card').count() === 9, 'a família Mecanismos: 9');
    await clicar('pz:fam:todos', 100);
    await p.fill('[data-k="pz:busca"]', 'guarda'); await w(200);
    const nomes = await p.locator('.gal-nome').allInnerTexts();
    ok(nomes.includes('Guardas que mentem') && nomes.includes('Oito guardas') && nomes.length <= 4, 'a busca: “guarda” acha os guardas — ' + nomes.join(', '));
    await p.fill('[data-k="pz:busca"]', ''); await w(100);
    await p.check('[data-k="pz:soescreve"]'); await w(150);
    const esc = await p.locator('.gal-card').count();
    ok(esc >= 15 && esc < 46 && await p.locator('.gal-card .gal-tag.escreve').count() === esc, 'só os que o mestre escreve: ' + esc + ', todos com a etiqueta');
    await p.uncheck('[data-k="pz:soescreve"]'); await w(150);
    const larg = await ev(() => { const e = document.querySelector('.ed'); return [e.scrollWidth, e.clientWidth, document.documentElement.scrollWidth, innerWidth]; });
    ok(larg[0] <= larg[1] + 1 && larg[2] <= larg[3] + 1, 'cabe na tela de 1366 sem rolar de lado — ' + larg.join('/'));
  });

  await passo('o tutorial', async () => {
    await clicar('pz:tut:torre', 400);
    ok(await p.locator('dialog.tut[open]').count() === 1 && await p.locator('.tut-palco .pz-torre').count() === 1 && /passo 1 de/i.test(await p.locator('.tut-leg').innerText()), 'o “?” abre o tutorial: a torre de verdade, no passo 1');
    await w(3600);
    ok(/passo 2 de/i.test(await p.locator('.tut-leg').innerText()), 'o tutorial anda sozinho');
    ok(await p.locator('.tut-palco .tut-alvo').count() >= 1 && await ev(() => getComputedStyle(document.querySelector('.tut-cursor')).opacity) === '1', 'o cursor aponta onde clicar (e o lugar pisca)');
    await clicar('tut:play', 100);
    const antes = await p.locator('.tut-leg').innerText(); await w(3600);
    ok(antes === await p.locator('.tut-leg').innerText() && (await p.locator('[data-k="tut:play"]').innerText()).includes('Continuar'), 'Pausar para o tutorial');
    await clicar('tut:prox', 150);
    ok(await p.locator('.tut-niv li').count() === 5 && (await p.locator('.tut-lado').innerText()).includes('Em 3 frases'), 'ao lado: as regras em 3 frases e os 5 níveis');
    await clicar('tut:fechar', 200);
    await clicar('pz:tut:cifra', 400);
    ok(await p.locator('.tut-palco .pz-cifra').count() === 1 && await p.locator('.tut-niv li').count() === 3, 'os puzzles de antes também têm tutorial (a cifra, com 3 níveis)');
    await clicar('tut:fechar', 200);
    await clicar('pz:tut:imagem', 300);
    ok(await p.locator('.tut-video.sem').count() === 1, 'o quebra-cabeça (que precisa da imagem do mestre) explica em palavras');
    await clicar('tut:fechar', 200);
    await clicar('pz:tut:palavra', 400);
    await clicar('tut:usar', 400);
    ok((await pz()).tipo === 'palavra' && await p.locator('.pz-passo.at', { hasText: 'Ajustar' }).count() === 1 && await p.locator('.previa .pz-palavra').count() === 1, '“Usar este puzzle”: vira a palavra secreta e vai ao passo 2, com a prévia');
  });

  await passo('o nível e a palavra do mestre', async () => {
    ok(await p.locator('[data-k^="pz:d:"]').count() === 5 && (await p.locator('.nivel-txt').innerText()).includes('Neste nível'), 'os 5 níveis, com a frase do que muda');
    await clicar('pz:d:absoluto', 300);
    ok((await p.locator('.nivel-txt').innerText()).includes('sem cores') && (await m()).pub.modo === 'conta', 'o Absoluto da palavra: sem as cores');
    await clicar('pz:d:facil', 300);
    await clicar('pz:man:m', 300);
    await p.fill('[data-k="pz:palavra"]', 'Espada'); await p.press('[data-k="pz:palavra"]', 'Tab'); await w(300);
    ok((await pz()).palavra === 'ESPADA', 'o mestre escreve a palavra');
    await p.fill('[data-k="tst:in"]', 'PEDRA'); await clicar('tst:ok', 150);
    ok(await p.locator('.toast', { hasText: '6 letras' }).count() > 0, 'palpite do tamanho errado: o aviso');
    await p.fill('[data-k="tst:in"]', 'ADAGAS'); await clicar('tst:ok', 300);
    ok(await p.locator('.previa .pw-t.v').count() + await p.locator('.previa .pw-t.a').count() >= 2, 'o palpite ganha as cores');
    await p.fill('[data-k="tst:in"]', 'espada'); await clicar('tst:ok', 300);
    ok(await resolvido(), 'a palavra certa resolve');
  });

  await passo('o quadro de dedução do mestre', async () => {
    await escolher('deducao');
    await clicar('pz:man:m', 400);
    ok(await p.locator('.ded-ed input').count() >= 6, 'o quadro para escrever: as pessoas e o que é de cada uma');
    await p.fill('[data-k="pz:dp0"]', 'Barão'); await p.press('[data-k="pz:dp0"]', 'Tab'); await w(300);
    ok((await pz()).ded.pes[0] === 'Barão' && (await m()).pub.pes.includes('Barão'), 'o nome do NPC entra no puzzle');
    await p.fill('[data-k="pz:dp1"]', 'Barão'); await p.press('[data-k="pz:dp1"]', 'Tab'); await w(300);
    ok(await p.locator('.toast', { hasText: 'não podem repetir' }).count() > 0 && (await pz()).ded.pes[1] !== 'Barão', 'nome repetido: o aviso, e não grava');
    await clicar('pz:d+p', 300);
    ok((await pz()).ded.pes.length === 4, '+ Pessoa');
    // jogar: ✕ e ✓ pelos cliques, e Conferir
    const mm = await m();
    for (let c = 0; c < mm.pub.C; c++) for (let i = 0; i < mm.pub.n; i++) { const k = (c * mm.pub.n + i) * mm.pub.n + mm.seg.sol[c][i]; const cel = '[data-k="tst:m' + k + '"]'; const txt = await p.locator(cel).innerText(); if (txt !== '✓') { if (txt !== '✕') await p.click(cel); await w(40); await p.click(cel); await w(60); } }
    await clicar('tst:ok', 300);
    ok(await resolvido(), 'o quadro certo, marcado à mão, resolve no Conferir');
  });

  await passo('os guardas do mestre', async () => {
    await escolher('guardas');
    await clicar('pz:d:dificil', 300);
    await clicar('pz:man:m', 300);
    await p.fill('[data-k="pz:gp0"]', 'da cripta'); await p.press('[data-k="pz:gp0"]', 'Tab'); await w(300);
    await p.selectOption('[data-k="pz:gcerta"]', '0'); await w(400);
    const mm = await m();
    ok(mm.pub.ps[0] === 'da cripta' && mm.seg.s === 0, 'as portas escritas e a porta segura escolhida');
    for (let k = 0; k < mm.pub.g; k++) await clicar('tst:r' + k + (mm.seg.R[k] ? '' : 'm'), 80);
    await clicar('tst:porta0', 300);
    ok(await resolvido(), 'marcar quem mente e abrir a porta segura resolve');
  });

  await passo('a torre e os jarros', async () => {
    await escolher('torre');
    await clicar('pz:d:facil', 300);
    for (let i = 0; i < 10 && !(await p.locator('.previa .pz.resolvido').count()); i++) {
      const l = await ev(id => { const x = __escudo.HO.testes[id].jogo; return __escudo.E.mais3.torLance(__escudo.E.mais3.pinosDe(x), x.pub.n, x.pub.alvo); }, puz);
      await clicar('tst:pino' + l.de, 60); await clicar('tst:pino' + l.para, 120);
    }
    ok(await resolvido() && (await tst()).estado.n === 7, 'a torre de 3 discos, pelos cliques, em 7 lances');
    await escolher('jarros');
    for (let i = 0; i < 20; i++) await clicar('tst:dica', 120);
    const falta = await ev(id => { const x = __escudo.HO.testes[id].jogo, X = __escudo.E.mais3; const c = X.bfs(X.jarrosDe(x), s => s.join(','), s => X.jarVizinhos(s, x.pub.caps, x.pub.fonte), s => X.jarAlvoOk(s, x.pub.alvo)); return c ? c.length - 1 : -1; }, puz);
    ok(falta === 1 && await p.locator('.toast', { hasText: 'Não há mais dica' }).count() > 0, 'os jarros: as dicas levam até a um lance do fim (o último é dos jogadores)');
  });

  await passo('os passos 2 e 3', async () => {
    await escolher('ordem');
    await clicar('pz:prox', 300);
    ok(await p.locator('.pz-passo.at', { hasText: 'Entregar' }).count() === 1 && await p.locator('[data-k="lg:entregar"]').count() === 1 && await p.locator('.previa .pz-ordem').count() === 1, 'o passo 3: o que acontece ao acertar e ao errar, e a prévia ao lado');
    await clicar('pz:volta', 300);
    await escolher('sudoku');
    ok(await p.locator('[data-k^="pz:d:"]').count() === 3, 'um puzzle de antes: os 3 níveis');
  });
  await passo('o tutorial de cada tipo', async () => {
    const r = await ev(() => {
      const G = TC.puzzlesGuia, E = TC.escudo, PUI = TC.pistasUI, out = [], box = document.createElement('div');
      for (const t of Object.keys(E.PUZZLES)) {
        const ps = G.passosDe(t);
        if (!ps) { if (t !== 'imagem' && t !== 'fechadura') out.push(t + ': sem passos'); continue; }
        ps.forEach((s, k) => { box.replaceChildren(PUI.puzzle(s.jg, { chave: 'demo:', aviso() {}, jogar: () => Promise.resolve() })); if (box.textContent.includes('não abriu')) out.push(t + ' ' + k + ': não abriu'); if (s.alvo && !box.querySelector('[data-k="demo:' + s.alvo + '"]')) out.push(t + ' ' + k + ': sem ' + s.alvo); });
        if (!ps[ps.length - 1].jg.resolvido) out.push(t + ': o fim não fica verde');
      }
      return out;
    });
    ok(!r.length, 'o tutorial dos 44 tipos jogáveis: cada passo desenha, o cursor acha onde apontar, e o fim fica verde — ' + r.slice(0, 5).join(' | '));
  });
  ok(!errs.length, 'sem erros na página — ' + errs.slice(0, 3).join(' | '));
  await t.close(); end();
})();
