// Lote 147: o cadeado de símbolos e as placas de pressão montados pelo mestre (o pedido do Bruno): "Sortear" ou
// "Montar eu mesmo"; a resposta (a ordem das placas, a combinação do cadeado), as pistas prontas (o site confere se são
// verdade e quantas respostas sobram) e as linhas livres; os jogadores recebem as linhas livres e não a resposta.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start();
  const { page: p } = await t.device({ name: 'escudo', w: 1440, h: 900 });
  const w = ms => p.waitForTimeout(ms);
  const ev = (fn, a) => p.evaluate(fn, a);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await p.goto(t.base + 'escudo/?debug'); await w(700);
  await p.click('[data-k="aba:handouts"]').catch(() => {}); await w(200);
  await p.click('[data-k="h:novo:puzzle"]'); await w(200);
  const puz = await ev(() => __escudo.HO.sel);
  const H = () => ev(id => JSON.parse(JSON.stringify(__escudo.A.handout(id).puzzle)), puz);
  const tst = () => ev(id => { const t = __escudo.HO.testes[id]; return t ? JSON.parse(JSON.stringify(t.jogo)) : null; }, puz);
  const resolvido = async () => { for (let i = 0; i < 20; i++) { if (await p.locator('.previa .pz.resolvido').count()) return true; await w(100); } return false; };

  await passo('as placas', async () => {
    await p.click('[data-k="pz:t:placas"]'); await w(300);
    ok(await p.locator('[data-k="pz:man:s"][aria-pressed="true"]').count() === 1, 'as placas começam sorteadas');
    const antes = await ev(id => __escudo.E.montarPuzzle(__escudo.A.handout(id).puzzle).resposta, puz);
    await p.click('[data-k="pz:man:m"]'); await w(300);
    let pz = await H();
    ok(!!pz.manual && pz.manual.seq.length >= 4 && await p.locator('[data-k="pz:d:facil"]').count() === 0, '"Montar eu mesmo" começa do puzzle sorteado (e some a dificuldade): ' + j(pz.manual.seq));
    ok(await ev(id => __escudo.E.montarPuzzle(__escudo.A.handout(id).puzzle).cands, puz) === 1, 'o que veio do sorteio já resolve (uma resposta só)');
    // a ordem do Bruno: Chama, Lua, Estrela (e tira as que sobram)
    while ((await H()).manual.seq.length > 3) { await p.click('[data-k="pz:seq-"]'); await w(150); }
    for (const [i, v] of ['chama', 'lua', 'estrela'].entries()) { await p.selectOption('[data-k="pz:seq:' + i + '"]', v); await w(150); }
    pz = await H();
    ok(j(pz.manual.seq) === j(['chama', 'lua', 'estrela']), 'a ordem certa escolhida: ' + j(pz.manual.seq));
    // tira as inscrições e escreve as dele
    while ((await H()).manual.pis.length) { await p.click('[data-k="pz:px:0"]'); await w(120); }
    ok(/3|6/.test(await p.locator('[data-k="pz:man-estado"]').innerText()) && /ainda deixam/.test(await p.locator('[data-k="pz:man-estado"]').innerText()), 'sem inscrições: o aviso das respostas que sobram');
    await p.click('[data-k="pz:p+"]'); await w(150);
    await p.selectOption('[data-k="pz:pa:0"]', 'chama'); await w(120); await p.selectOption('[data-k="pz:pk:0"]', 'primeira'); await w(150);
    await p.click('[data-k="pz:p+"]'); await w(150);
    await p.selectOption('[data-k="pz:pa:1"]', 'estrela'); await w(120); await p.selectOption('[data-k="pz:pk:1"]', 'antes'); await w(120); await p.selectOption('[data-k="pz:pb:1"]', 'lua'); await w(150);
    ok(await p.locator('.man-pista .man-aviso').count() === 1 && /1 inscrição está errada/.test(await p.locator('[data-k="pz:man-estado"]').innerText()), 'a inscrição falsa ("Estrela antes da Lua") é marcada e não vai');
    await p.selectOption('[data-k="pz:pk:1"]', 'ultima'); await w(200);
    ok(/uma resposta só/.test(await p.locator('[data-k="pz:man-estado"]').innerText()), 'com "Chama é a primeira" e "Estrela é a última": uma resposta só');
    await p.fill('[data-k="pz:livres"]', 'O fogo acorda antes de todos.\nA lua vem antes da estrela.'); await p.locator('[data-k="pz:livres"]').dispatchEvent('change'); await w(250);
    pz = await H();
    ok(j(pz.manual.livres) === j(['O fogo acorda antes de todos.', 'A lua vem antes da estrela.']), 'as linhas livres guardadas');
    const jg = await tst();
    ok(j(jg.pub.livres) === j(pz.manual.livres) && !j(jg.pub).includes('chama","lua","estrela') && jg.pub.pistas.length === 2, 'os jogadores recebem as inscrições e as linhas livres, com as placas embaralhadas: ' + j(jg.pub.simbolos));
    ok(await p.locator('.previa .pl-livre').count() === 2, 'as linhas livres aparecem nas inscrições');
    const resp = await ev(id => __escudo.E.montarPuzzle(__escudo.A.handout(id).puzzle).resposta.split(',').map(Number), puz);
    ok(j(resp.map(i => jg.pub.simbolos[i])) === j(['chama', 'lua', 'estrela']), 'a resposta é a ordem do mestre');
    for (const i of resp) { await p.click('[data-k="tst:p' + i + '"]'); await w(60); }
    ok(await resolvido(), 'pisando na ordem do mestre, resolve');
    ok(/Chama → Lua → Estrela/.test(await p.locator('.previa [data-k="tst:resposta"]').innerText()), 'a resposta, em palavras, para o mestre');
    await p.click('[data-k="pz:man:s"]'); await w(300);
    ok(!(await H()).manual && (await ev(id => __escudo.E.montarPuzzle(__escudo.A.handout(id).puzzle).resposta, puz)) === antes, '"Sortear" volta ao puzzle sorteado de antes');
  });

  await passo('o cadeado', async () => {
    await p.click('[data-k="pz:t:cadeado"]'); await w(300);
    await p.click('[data-k="pz:man:m"]'); await w(300);
    let pz = await H();
    ok(!!pz.manual && pz.manual.disc.length >= 6 && pz.manual.sol.length >= 3, 'o cadeado à mão, a partir do sorteado');
    ok(await ev(id => __escudo.E.montarPuzzle(__escudo.A.handout(id).puzzle).cands, puz) === 1, 'e já resolve');
    for (const v of pz.manual.disc.slice()) if (!['sol', 'lua', 'estrela', 'chama'].includes(v) && (await H()).manual.disc.length > 3) { await p.uncheck('[data-k="pz:disc:' + v + '"]'); await w(120); }
    for (const v of ['sol', 'lua', 'estrela', 'chama']) if (!(await H()).manual.disc.includes(v)) { await p.check('[data-k="pz:disc:' + v + '"]'); await w(120); }
    for (const v of (await H()).manual.disc.slice()) if (!['sol', 'lua', 'estrela', 'chama'].includes(v)) { await p.uncheck('[data-k="pz:disc:' + v + '"]'); await w(120); }
    pz = await H();
    ok(j(pz.manual.disc.slice().sort()) === j(['chama', 'estrela', 'lua', 'sol']), 'os discos: Sol, Lua, Estrela e Chama');
    while ((await H()).manual.sol.length > 3) { await p.click('[data-k="pz:sol-"]'); await w(120); }
    for (const [i, v] of ['lua', 'chama', 'sol'].entries()) { await p.selectOption('[data-k="pz:sol:' + i + '"]', v); await w(120); }
    while ((await H()).manual.pis.length) { await p.click('[data-k="pz:px:0"]'); await w(120); }
    await p.click('[data-k="pz:p+"]'); await w(150);
    for (const [k, v] of ['lua', 'chama', 'sol'].entries()) { await p.selectOption('[data-k="pz:pc:0:' + k + '"]', v); await w(120); }
    ok(/própria resposta/.test(await p.locator('.man-pista').first().innerText()), 'o palpite igual à resposta é avisado');
    await p.selectOption('[data-k="pz:pc:0:2"]', 'estrela'); await w(150);
    ok(/dois símbolos certos nos lugares certos/.test(await p.locator('.man-pista').first().innerText()), 'o site escreve quantos estavam certos: ' + await p.locator('.man-pista').first().innerText());
    await p.fill('[data-k="pz:livres"]', 'Quem abriu por último amava a lua.'); await p.locator('[data-k="pz:livres"]').dispatchEvent('change'); await w(250);
    const jg = await tst();
    ok(j(jg.pub.livres) === j(['Quem abriu por último amava a lua.']) && await p.locator('.previa .cd-livre').count() === 1, 'a linha livre riscada na parede');
    const comb = await ev(id => __escudo.E.montarPuzzle(__escudo.A.handout(id).puzzle).resposta.split(',').map(Number), puz);
    ok(j(comb.map(i => jg.pub.simbolos[i])) === j(['lua', 'chama', 'sol']), 'a combinação é a do mestre');
    for (let i = 0; i < comb.length; i++) for (let k = 0; k < comb[i]; k++) { await p.click('[data-k="tst:d' + i + '-"]'); await w(25); }
    await p.click('[data-k="tst:abrir"]');
    ok(await resolvido(), 'girando até a combinação do mestre, abre');
  });

  ok(t.errs.length === 0, 'sem erros no console' + (t.errs.length ? ': ' + t.errs.slice(0, 3).join(' | ') : ''));
  await t.close(); end();
})();
