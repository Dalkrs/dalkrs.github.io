// Teste de ponta a ponta: exercita as ferramentas com mouse e teclado de verdade.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
(async () => {
  const t = await open();
  const { page } = t;
  let fails = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const S = () => ev(() => {
    const u = __urgm, sc = u.Store.scene();
    return {
      tool: u.App.tool, sel: u.App.sel, viewer: u.App.viewer, tab: u.App.tab,
      tokens: sc.tokens.map(t => ({ id: t.id, name: t.name, x: t.x, y: t.y, size: t.size, hidden: t.hidden, bars: t.bars, conds: t.conds, owner: t.owner, img: t.img })),
      shapes: sc.shapes.map(s => ({ id: s.id, k: s.k, x: s.x, y: s.y, w: s.w, h: s.h, pts: s.pts, txt: s.txt })),
      walls: sc.walls.map(w => ({ id: w.id, k: w.k, open: w.open })), lights: sc.lights.length, effects: sc.effects.map(e => ({ id: e.id, fx: e.fx, k: e.k, r: e.r, dir: e.dir, token: e.token })),
      fogOps: sc.fogOps.length, cell: sc.cell, turn: sc.turn, light: sc.light, fog: sc.fog, scenes: u.Store.S.order.length, name: sc.name, pings: u.App.pings.length,
      canUndo: u.Store.canUndo(),
    };
  });
  const pt = (cx, cy) => ev(([cx, cy]) => { const u = __urgm, sc = u.Store.scene(), r = u.Render.cv.getBoundingClientRect(); const [sx, sy] = u.Render.toScreen(cx * sc.cell, cy * sc.cell); return [r.left + sx, r.top + sy]; }, [cx, cy]);
  const click = async (cx, cy, opt) => { const [x, y] = await pt(cx, cy); await page.mouse.click(x, y, opt); await page.waitForTimeout(70); };
  const drag = async (ax, ay, bx, by, opt = {}) => {
    const [x0, y0] = await pt(ax, ay), [x1, y1] = await pt(bx, by);
    await page.mouse.move(x0, y0); await page.mouse.down(opt);
    await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await page.mouse.move(x1, y1, { steps: 4 });
    await page.mouse.up(opt); await page.waitForTimeout(90);
  };
  const key = async k => { await page.keyboard.press(k); await page.waitForTimeout(70); };
  const tok = (s, name) => s.tokens.find(x => x.name === name);
  const errsAt = label => { if (t.errs.length) { console.log(`ERROS em "${label}":\n` + t.errs.join('\n')); fails += t.errs.length; t.errs.length = 0; } };

  /* 1. Cena de exemplo */
  let s = await S();
  ok(s.tokens.length === 7 && s.walls.length === 8 && s.effects.length === 2, 'cena de exemplo carregada');
  ok(s.sel.length === 1 && tok(s, 'Dain X').id === s.sel[0].id, 'Dain X começa selecionado');
  ok(await page.locator('#tk-name').inputValue() === 'Dain X', 'painel mostra o token selecionado');
  ok(await page.locator('#hud').isVisible(), 'HUD visível');
  errsAt('início');

  /* 2. Selecionar e mover */
  await click(14.5, 10.5);
  s = await S();
  ok(s.sel.length === 1 && s.sel[0].id === tok(s, 'Bandido').id, 'clique seleciona o Bandido');
  await page.waitForTimeout(80);
  ok(await page.locator('#tk-name').inputValue() === 'Bandido', 'painel acompanha a seleção');
  await drag(14.5, 10.5, 16.5, 14.5);
  s = await S();
  ok(tok(s, 'Bandido').x === 16 * s.cell && tok(s, 'Bandido').y === 14 * s.cell, 'arrastar move e encaixa na grade');
  await key('Control+z');
  s = await S();
  ok(tok(s, 'Bandido').x === 14 * s.cell && tok(s, 'Bandido').y === 10 * s.cell, 'desfazer devolve o token');
  await key('Control+Shift+z');
  s = await S();
  ok(tok(s, 'Bandido').x === 16 * s.cell, 'refazer');
  await key('Control+z');
  await key('ArrowRight');
  s = await S();
  ok(tok(s, 'Bandido').x === 15 * s.cell, 'seta move um quadrado');
  await key('Control+z');
  errsAt('mover');

  /* 3. HUD e barras */
  await click(9.5, 12.5);
  await page.waitForTimeout(80);
  await page.locator('#hud-b0').fill('-10');
  await page.locator('#hud-b0').press('Enter');
  await page.waitForTimeout(80);
  s = await S();
  ok(tok(s, 'Dain X').bars[0].v === 52, 'HUD: -10 subtrai da Vida');
  await page.locator('#tk-b2-v').fill('+1');
  await page.locator('#tk-b2-v').press('Tab');
  await page.waitForTimeout(80);
  s = await S();
  ok(tok(s, 'Dain X').bars[2].v === 21, 'painel: +1 soma na Fé');
  ok(await page.locator('#hud-b0').inputValue() === '52', 'HUD mostra o valor novo');
  // condição pelo painel
  await page.locator('.chip', { hasText: 'Abençoado' }).first().click();
  await page.waitForTimeout(80);
  s = await S();
  ok(tok(s, 'Dain X').conds.includes('bencao'), 'condição ligada pelo painel');
  errsAt('barras');

  /* 4. Novo token */
  await key('t');
  ok((await S()).tool === 'token', 'atalho T');
  await click(4.5, 8.5);
  await page.waitForTimeout(120);
  s = await S();
  ok(s.tokens.length === 8 && s.tool === 'select', 'token criado e ferramenta volta a Selecionar');
  ok(await ev(() => document.activeElement && document.activeElement.id) === 'tk-name', 'campo do nome fica em foco');
  await page.keyboard.type('Goblin');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(120);
  s = await S();
  ok(!!tok(s, 'Goblin'), 'renomear pelo painel');
  ok(tok(s, 'Goblin').x === 4 * s.cell && tok(s, 'Goblin').y === 8 * s.cell, 'token nasce no quadrado clicado');
  ok(await ev(() => document.activeElement && document.activeElement.id) === 'tk-owner', 'Tab leva ao próximo campo mesmo com o painel redesenhado');
  await ev(() => document.activeElement.blur());
  errsAt('token');

  /* 5. Desenho e formas */
  const before = s.shapes.length;
  await key('r'); await drag(2, 2, 4, 3.5);
  await key('o'); await drag(5, 2, 7, 3.5);
  await key('l'); await drag(2, 5, 4, 6);
  await key('b'); await drag(5, 5, 7, 6.2);
  await key('p'); await click(2, 15); await click(4, 15); await click(3, 17); await key('Enter');
  s = await S();
  ok(s.shapes.length === before + 5, `cinco formas criadas (${s.shapes.length - before})`);
  ok(s.shapes.slice(-5).map(x => x.k).join() === 'rect,ell,line,free,poly', 'tipos: ' + s.shapes.slice(-5).map(x => x.k).join());
  await key('x'); await click(8, 2.5);
  await page.waitForTimeout(100);
  ok(await page.locator('.modal').isVisible(), 'texto abre a janela');
  await page.locator('#dlg-in').fill('Acampamento');
  await page.locator('.modal .btn.primary').click();
  await page.waitForTimeout(120);
  s = await S();
  ok(s.shapes[s.shapes.length - 1].txt === 'Acampamento' && s.tool === 'select', 'texto colocado');
  // redimensionar o retângulo pela alça
  const rect = s.shapes.find(x => x.k === 'rect');
  await key('Escape');
  await click(2 + 0.01, 2.6);                     // borda esquerda do retângulo
  s = await S();
  ok(s.sel.length === 1 && s.sel[0].id === rect.id, 'clique na borda seleciona o retângulo');
  await drag(4, 3.5, 6, 5);                      // alça do canto inferior direito
  s = await S();
  const r2 = s.shapes.find(x => x.id === rect.id);
  ok(Math.abs(r2.w - 4 * s.cell) < 3 && Math.abs(r2.h - 3 * s.cell) < 3, `alça redimensiona (${Math.round(r2.w)}×${Math.round(r2.h)})`);
  await drag(2 + 0.01, 3, 3, 4);                 // arrastar pela borda move
  s = await S();
  const r3 = s.shapes.find(x => x.id === rect.id);
  ok(Math.abs(r3.x - 3 * s.cell) < 4 && Math.abs(r3.y - 3 * s.cell) < 4, 'arrastar move a forma');
  await key('Delete');
  s = await S();
  ok(!s.shapes.find(x => x.id === rect.id), 'Delete apaga a forma');
  await key('Control+z');
  s = await S();
  ok(!!s.shapes.find(x => x.id === rect.id), 'desfazer devolve a forma');
  errsAt('formas');

  /* 5b. Clique duplo */
  const dbl = async (cx, cy) => { const [x, y] = await pt(cx, cy); await page.mouse.dblclick(x, y); await page.waitForTimeout(120); };
  const nShapes = (await S()).shapes.length;
  await key('p'); await click(8, 15); await click(10, 15); await dbl(9, 17);
  s = await S();
  ok(s.shapes.length === nShapes + 1 && s.shapes[s.shapes.length - 1].pts.length === 6, 'clique duplo fecha o polígono com três cantos');
  await key('v'); await dbl(15.5, 12.5);
  ok(await ev(() => document.activeElement && document.activeElement.id) === 'tk-name', 'clique duplo no token leva ao nome');
  await ev(() => document.activeElement.blur());
  errsAt('clique duplo');

  /* 6. Paredes e portas */
  const w0 = s.walls.length;
  await key('w');
  await click(3, 10); await click(6, 10); await click(6, 12); await key('Enter');
  s = await S();
  ok(s.walls.length === w0 + 2, `duas paredes em cadeia (${s.walls.length - w0})`);
  await click(9, 18); await dbl(11, 18);          // clique duplo encerra a cadeia
  s = await S();
  ok(s.walls.length === w0 + 3, `clique duplo termina a parede (${s.walls.length - w0})`);
  await click(13, 18.5);                          // começa outra cadeia, que o Esc cancela
  await key('Escape');
  s = await S();
  ok(s.walls.length === w0 + 3, 'Esc cancela a cadeia sem criar parede');
  await key('Control+z');
  await key('d');
  await drag(6, 12, 6, 13);
  s = await S();
  ok(s.walls.length === w0 + 3 && s.walls[s.walls.length - 1].k === 'door', 'porta criada arrastando');
  await click(4.5, 10);                          // clique na parede seleciona
  s = await S();
  ok(s.sel.length === 1 && s.sel[0].c === 'walls', 'clique seleciona a parede');
  await key('Delete');
  s = await S();
  ok(s.walls.length === w0 + 2, 'Delete apaga a parede');
  await key('Control+z');
  errsAt('paredes');

  /* 7. Luz */
  await key('i'); await click(12.5, 5.5);
  s = await S();
  ok(s.lights === 2 && s.tool === 'select' && s.sel[0].c === 'lights', 'luz criada e selecionada');
  errsAt('luz');

  /* 8. Efeitos */
  const e0 = s.effects.length;
  await key('e'); await click(11.5, 16.5);
  s = await S();
  ok(s.effects.length === e0 + 1 && s.sel[0].c === 'effects' && s.tool === 'select', 'efeito solto com um clique');
  await ev(() => { __urgm.App.opt.fx = 'raio'; __urgm.App.opt.fxShape = 'cone'; });
  await key('e'); await drag(16, 16, 19, 16);
  s = await S();
  const fx = s.effects[s.effects.length - 1];
  ok(fx.fx === 'raio' && fx.k === 'cone' && fx.dir === 0 && fx.r === 3, `cone arrastado define direção e alcance (dir ${fx.dir}, r ${fx.r})`);
  await ev(() => { __urgm.App.opt.fx = 'cura'; __urgm.App.opt.fxShape = 'circ'; });
  await key('e'); await click(10.5, 13.5);       // em cima do Kairo: prende ao token
  s = await S();
  ok(s.effects[s.effects.length - 1].token === tok(s, 'Kairo').id, 'efeito preso ao token clicado');
  errsAt('efeitos');

  /* 9. Névoa manual */
  await key('n'); await drag(2, 18, 5, 18);
  s = await S();
  ok(s.fogOps === 0, 'névoa desligada: não pinta');
  await ev(() => { const u = __urgm, sc = u.Store.scene(); u.Store.tx('x', () => u.Store.scn({ fog: Object.assign({}, sc.fog, { manual: true }) })); });
  await page.waitForTimeout(80);
  await drag(2, 18, 5, 18);
  s = await S();
  ok(s.fogOps === 1, 'pincelada vira uma operação de névoa');
  await ev(() => { __urgm.App.opt.fogShape = 'rect'; __urgm.App.opt.fogMode = 'h'; });
  await drag(20, 14, 24, 18);
  s = await S();
  ok(s.fogOps === 2, 'retângulo de névoa');
  errsAt('névoa');

  /* 10. Régua e ping */
  await key('m'); await drag(3.5, 3.5, 8.5, 6.5);
  await key('Escape');
  const [mx, my] = await pt(12, 12); await page.mouse.move(mx, my);
  await key('g');
  s = await S();
  ok(s.pings === 1, 'tecla G faz ping');
  await key('v');
  errsAt('régua e ping');

  /* 11. Porta e visão */
  const door = s.walls.find(w => w.k === 'door');
  await click(20.5, 9);
  s = await S();
  ok(s.walls.find(w => w.id === door.id).open === true, 'clique no ícone abre a porta');
  await click(20.5, 9);
  errsAt('porta');

  /* 12. Menu do botão direito */
  await click(15.5, 12.5, { button: 'right' });
  await page.waitForTimeout(100);
  ok(await page.locator('.menu').isVisible(), 'botão direito abre o menu');
  await page.locator('.menu-i', { hasText: 'Ocultar dos jogadores' }).click();
  await page.waitForTimeout(80);
  s = await S();
  ok(tok(s, 'Bandida').hidden === true, 'ocultar pelo menu');
  await key('Control+z');
  errsAt('menu');

  /* 13. Copiar, colar, duplicar */
  await click(15.5, 12.5);
  await key('Control+d');
  s = await S();
  ok(s.tokens.filter(x => x.name === 'Bandida').length === 2, 'Ctrl+D duplica');
  await key('Control+z');
  await page.waitForTimeout(450);                 // para não contar como clique duplo
  await click(15.5, 12.5);
  await key('Control+c');
  const [px2, py2] = await pt(6.5, 16.5); await page.mouse.move(px2, py2);
  await key('Control+v');
  await page.waitForTimeout(120);
  s = await S();
  const copies = s.tokens.filter(x => x.name === 'Bandida');
  ok(copies.length === 2 && copies.some(c => c.x === 6 * s.cell && c.y === 16 * s.cell), 'Ctrl+C e Ctrl+V colam onde o cursor está');
  await key('Control+z');
  errsAt('duplicar');

  /* 14. Turnos */
  await page.locator('#tab-turn').click();
  await page.waitForTimeout(80);
  const cur0 = s.turn.cur;
  await page.locator('#turnNext').click();
  await page.waitForTimeout(80);
  s = await S();
  ok(s.turn.cur !== cur0 && s.turn.cur === s.turn.list[1].id, 'próximo turno avança');
  for (let i = 0; i < 5; i++) { await page.locator('#turnNext').click(); await page.waitForTimeout(40); }
  s = await S();
  ok(s.turn.round === 3 && s.turn.cur === s.turn.list[0].id, `volta ao primeiro e soma a rodada (rodada ${s.turn.round})`);
  errsAt('turnos');

  /* 15. Ver como jogador */
  await page.locator('#viewerSel').selectOption({ label: 'Dalmo' });
  await page.waitForTimeout(250);
  s = await S();
  ok(s.viewer !== 'gm', 'troca para o jogador');
  ok(await page.locator('#banner').isVisible(), 'faixa de aviso aparece');
  const tools = await ev(() => Array.from(document.querySelectorAll('.tool')).map(b => b.id));
  ok(tools.join() === 'tool-select,tool-pan,tool-ruler,tool-ping', 'jogador vê só as ferramentas liberadas: ' + tools.join());
  const vis = await ev(() => {
    const u = __urgm, sc = u.Store.scene(), c = sc.cell;
    const byName = n => sc.tokens.find(t => t.name === n);
    return { self: u.Vision.canSee(9.5 * c, 12.5 * c), cap: u.tokShown(byName('Capitão'), sc), arq: u.tokShown(byName('Arqueira'), sc), bandida: u.tokShown(byName('Bandida'), sc), insideRuin: u.Vision.canSee(23.5 * c, 4.5 * c), far: u.Vision.canSee(1.5 * c, 1.5 * c) };
  });
  ok(vis.self && vis.bandida, 'jogador enxerga a si mesmo e quem está na estrada');
  ok(!vis.cap && !vis.insideRuin, 'paredes escondem quem está dentro da guarita');
  ok(!vis.arq, 'token oculto não aparece');
  // mover o próprio token
  await drag(9.5, 12.5, 11.5, 11.5);
  s = await S();
  ok(tok(s, 'Dain X').x === 11 * s.cell && tok(s, 'Dain X').y === 11 * s.cell, 'jogador move o próprio token');
  // não move token do mestre
  const bx = tok(s, 'Bandida').x;
  await drag(15.5, 12.5, 17.5, 13.5);
  s = await S();
  ok(tok(s, 'Bandida').x === bx, 'jogador não move token do mestre');
  // parede barra o movimento
  await ev(() => { const u = __urgm, sc = u.Store.scene(), d = sc.tokens.find(t => t.name === 'Dain X'); u.Store.tx('x', () => u.Store.upd('tokens', d.id, { x: 18 * sc.cell, y: 9 * sc.cell })); });
  await page.waitForTimeout(120);
  await drag(18.5, 9.5, 18.5, 7.5);
  s = await S();
  ok(tok(s, 'Dain X').y === 9 * s.cell, 'parede barra o movimento do jogador');
  // porta: sem permissão não abre
  await click(20.5, 9);
  s = await S();
  ok(s.walls.find(w => w.id === door.id).open === false, 'jogador sem permissão não abre porta');
  errsAt('jogador');
  await page.locator('#backGm').click();
  await page.waitForTimeout(200);
  s = await S();
  ok(s.viewer === 'gm', 'volta ao mestre');

  /* 16. Imagem de token (arquivo) */
  const png = path.join(__dirname, 'tok.png');
  fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFElEQVR42mP8z8Dwn4EIwDiqEF8hAK2nCPmvfS2GAAAAAElFTkSuQmCC', 'base64'));
  await page.locator('#tab-sel').click();
  await click(8.5, 13.5);
  await page.waitForTimeout(100);
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('.btn', { hasText: 'Escolher imagem' }).click()]);
  await fc.setFiles(png);
  await page.waitForTimeout(400);
  s = await S();
  ok(!!tok(s, 'Astie').img, 'imagem aplicada ao token');
  errsAt('imagem');

  /* 17. Nova cena, exportar, importar */
  await page.locator('#sceneBtn').click();
  await page.locator('.menu-i', { hasText: /^Nova cena$/ }).click();
  await page.waitForTimeout(100);
  await page.locator('#dlg-in').fill('Masmorra');
  await page.locator('.modal .btn.primary').click();
  await page.waitForTimeout(200);
  s = await S();
  ok(s.scenes === 2 && s.name === 'Masmorra' && s.tokens.length === 0, 'nova cena criada e aberta');
  await page.locator('#sceneBtn').click();
  await page.locator('.menu-i', { hasText: /^Cena de exemplo$/ }).click();
  await page.waitForTimeout(200);
  s = await S();
  ok(s.name === 'Cena de exemplo' && s.tokens.length === 8, 'troca de cena');
  await page.locator('#moreBtn').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.menu-i', { hasText: 'Exportar esta cena' }).click()]);
  const file = path.join(__dirname, 'export.json');
  await dl.saveAs(file);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok(data.format === 'tinycats-cena' && data.scene.tokens.length === 8 && Object.keys(data.assets).length >= 2, `exportação tem cena e imagens (${Object.keys(data.assets).length} imagens, ${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
  ok(dl.suggestedFilename() === 'tinycats-cena-cena-de-exemplo.json', 'nome do arquivo: ' + dl.suggestedFilename());
  await page.locator('#moreBtn').click();
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.locator('.menu-i', { hasText: 'Importar cena' }).click()]);
  await fc2.setFiles(file);
  await page.waitForTimeout(500);
  s = await S();
  ok(s.scenes === 3 && s.tokens.length === 8 && s.name === 'Cena de exemplo', 'importação cria uma cena nova e abre');
  errsAt('cenas');

  /* 18. Salvamento */
  await page.waitForTimeout(2200);
  const expl = await ev(() => Object.keys(__urgm.Store.scene().explored || {}).length);
  ok(expl >= 1, 'áreas exploradas ficam guardadas na cena');
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(900);
  s = await S();
  ok(s.scenes === 3, `as cenas continuam depois de recarregar (${s.scenes})`);
  ok(s.tokens.length === 8, 'a cena aberta por último volta');
  errsAt('recarregar');

  console.log(fails ? `\n${fails} falha(s) em ${n} verificações` : `\n${n} verificações passaram`);
  await page.screenshot({ path: path.join(__dirname, 'e2e-end.png') });
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
