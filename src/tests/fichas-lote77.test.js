// Lote 77 (sem mesa): o XP no modo Jogando; e os pontos de atributo de uma vez (o inicial e o por level refazem a
// tabela; as fichas em distribuição livre que passam do total novo aparecem numa janela, e "Tirar na proporção"
// ajusta, com Desfazer).
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start();
  const d = await t.device({ name: 'ficha', w: 1300, h: 900, jogando: true, fechado: true });
  const P = d.page;
  const foto = async nome => { if (process.env.FOTOS) await P.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await P.waitForTimeout(1500);
  // duas fichas em distribuição livre: o Dain (level 9, 109 pontos) e a Lia (level 4, 69)
  await P.evaluate(() => {
    const a = S.personagens[0];
    Object.assign(a, { nome: 'Dain', level: 9, tier: 'C', modoAtr: 'livre', atrLivre: { FOR: 40, DES: 20, VIT: 19, CAN: 10, AGI: 20 }, estado: Object.assign({}, a.estado, { xp: { v: 157, max: 180 } }) });
    const b = JSON.parse(JSON.stringify(a)); Object.assign(b, { id: 'pc_lia', nome: 'Lia', level: 4, atrLivre: { FOR: 9, DES: 20, VIT: 10, CAN: 20, AGI: 10 } }); S.personagens.push(b);
    S.atual = a.id; save(); render();
  });
  await P.waitForTimeout(500);
  // ---- o XP no Jogando ----
  ok(await P.locator('#ficha.ficha-jogando').count() === 1, '(a ficha no Jogando)');
  ok(await P.locator('#xpBox.xpjog').isVisible() && await P.locator('#f_xp').inputValue() === '157', 'no Jogando, a barra de XP aparece (157 de 180)');
  ok(!(await P.locator('#xpBox.xpjog .xplim').isVisible()), '(o mínimo e o máximo ficam só no Editar)');
  await P.locator('#f_xp').fill('+20'); await P.locator('#f_xp').press('Enter'); await P.waitForTimeout(500);
  ok(await P.evaluate(() => S.personagens[0].estado.xp.v) === 177 && await P.locator('#f_xp').inputValue() === '177', 'digitar +20 no Jogando soma (157 → 177)');
  ok(/XP de Dain: 157 \+ 20 = 177/.test(await P.locator('body').innerText()), 'com o aviso (e o Desfazer)');
  await foto('l77-xp-jogando');
  await P.evaluate(() => { fichaModo = 'editar'; renderFicha(); }); await P.waitForTimeout(300);
  ok(await P.locator('#xpBox').count() === 1 && !(await P.locator('#xpBox.xpjog').count()) && await P.locator('#f_xpmax').isVisible(), 'no Editar, a barra de sempre (com o mínimo e o máximo), uma só');
  // ---- os pontos de atributo ----
  await P.evaluate(() => abrirCfg()); await P.waitForTimeout(300);
  ok(await P.locator('#ptsIni').inputValue() === '45' && await P.locator('#ptsPor').inputValue() === '8', 'nas Tabelas base: inicial 45 e 8 por level (o de hoje)');
  await P.locator('#ptsPor').fill('5'); await P.waitForTimeout(100);
  ok(/level 10\s*90\s*level 20\s*140/.test(await P.locator('#ptsPrevia').innerText()), 'a prévia: level 10 com 90, level 20 com 140');
  await P.locator('#ptsAplicar').click(); await P.waitForTimeout(400);
  ok(await P.evaluate(() => S.cfg.niveis[0].pts === 45 && S.cfg.niveis[8].pts === 85 && S.cfg.niveis[29].pts === 190 && S.cfg.niveis.length === 30), 'a tabela refeita: 45, level 9 com 85, level 30 com 190');
  const linhas = await P.locator('.modal[data-prop] tr').allInnerTexts();
  ok(linhas.length === 2 && /Dain/.test(linhas[0]) && /109 → 85 −24/.test(linhas[0]) && /Lia/.test(linhas[1]) && /69 → 60 −9/.test(linhas[1]), 'a janela lista quem passa: o Dain (−24) e a Lia (−9): ' + j(linhas));
  ok(await P.evaluate(() => S.personagens[0].atrLivre.FOR) === 40, '(nada muda nas fichas antes de escolher)');
  await foto('l77-proporcao');
  await P.locator('#propTirar').click(); await P.waitForTimeout(400);
  const al = await P.evaluate(() => S.personagens.map(p => p.atrLivre));
  const soma = o => Object.values(o).reduce((s, v) => s + v, 0);
  ok(soma(al[0]) === 85 && soma(al[1]) === 60 && al[0].FOR === 31 && al[0].CAN === 8, 'tirar na proporção: o Dain fica com 85 (FOR 40 → 31), a Lia com 60: ' + j(al));
  const toast = P.locator('.toast', { hasText: 'ajustadas na proporção' });
  ok(await toast.count() === 1, 'o aviso, com Desfazer');
  await toast.locator('button').click(); await P.waitForTimeout(400);
  ok(await P.evaluate(() => S.personagens[0].atrLivre.FOR === 40 && S.personagens[1].atrLivre.DES === 20 && S.cfg.niveis[8].pts === 109), 'Desfazer volta os pontos das fichas e a tabela');
  // "Deixar como estão"
  await P.locator('#ptsPor').fill('5'); await P.locator('#ptsAplicar').click(); await P.waitForTimeout(400);
  await P.locator('#propDeixar').click(); await P.waitForTimeout(300);
  ok(await P.evaluate(() => S.cfg.niveis[8].pts === 85 && S.personagens[0].atrLivre.FOR === 40), '"Deixar como estão": a tabela muda, as fichas não');
  ok(t.errs.length === 0, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
