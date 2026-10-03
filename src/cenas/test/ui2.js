// Segunda bateria: cada controle dos painéis, janelas e menus, pelo DOM.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
(async () => {
  const t = await open();
  const { page } = t;
  let fails = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 110);
  const pt = (cx, cy) => ev(([cx, cy]) => { const u = __urgm, sc = u.Store.scene(), r = u.Render.cv.getBoundingClientRect(); const [sx, sy] = u.Render.toScreen(cx * sc.cell, cy * sc.cell); return [r.left + sx, r.top + sy]; }, [cx, cy]);
  const click = async (cx, cy, opt) => { const [x, y] = await pt(cx, cy); await page.mouse.click(x, y, opt); await w(90); };
  const drag = async (ax, ay, bx, by) => { const [x0, y0] = await pt(ax, ay), [x1, y1] = await pt(bx, by); await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up(); await w(100); };
  const key = async k => { await page.keyboard.press(k); await w(80); };
  const T = name => ev(n => { const sc = __urgm.Store.scene(); return JSON.parse(JSON.stringify(sc.tokens.find(t => t.name === n) || null)); }, name);
  const SC = () => ev(() => { const sc = __urgm.Store.scene(); const { tokens, shapes, walls, lights, effects, fogOps, explored, ...rest } = sc; return JSON.parse(JSON.stringify(Object.assign(rest, { nT: tokens.length, shapes, walls, lights, effects, nFog: fogOps.length }))); });
  const setNum = async (id, v) => { await page.locator('#' + id).fill(String(v)); await page.locator('#' + id).press('Tab'); await w(); };
  const segClick = async (id, label) => { await page.locator(`#${id} .seg-b`, { hasText: label }).first().click(); await w(); };
  const sw = async id => { await page.locator(`label.sw:has(#${id})`).click(); await w(); };
  const range = async (id, v) => { await ev(([id, v]) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]); await w(); };
  const errs = label => { if (t.errs.length) { console.log(`ERROS em "${label}":\n` + t.errs.join('\n')); fails += t.errs.length; t.errs.length = 0; } };
  const openSec = async id => { if (!(await ev(id => document.getElementById(id).open, id))) { await page.locator(`#${id} > summary`).click(); await w(); } };

  /* Token: identidade, barras, auras, visão e luz */
  let d = await T('Dain X');
  await page.locator('#tk-owner').selectOption(''); await w();
  ok((await T('Dain X')).owner === null, 'dono → mestre');
  await page.locator('#tk-owner').selectOption({ label: 'Dalmo' }); await w();
  ok((await T('Dain X')).owner === 'jg_dalmo', 'dono → jogador');
  await segClick('tk-size', '2');
  ok((await T('Dain X')).size === 2, 'tamanho 2');
  await segClick('tk-size', '1');
  await segClick('tk-shape', 'Quadrado');
  ok((await T('Dain X')).shape === 'quad', 'forma quadrada');
  await sw('tk-showname');
  ok((await T('Dain X')).showName === false, 'esconder nome');
  await page.locator('#tk-b1-on').click(); await w();
  ok((await T('Dain X')).bars[1].on === false, 'desligar a barra SP');
  await setNum('tk-b0-m', 100);
  ok((await T('Dain X')).bars[0].m === 100, 'máximo da Vida');
  await page.locator('#tk-b2-n').fill('Fé divina'); await page.locator('#tk-b2-n').press('Enter'); await w();
  ok((await T('Dain X')).bars[2].n === 'Fé divina', 'renomear barra');
  ok(await ev(() => document.activeElement.id) === 'tk-b2-n', 'Enter mantém o foco no campo');
  await segClick('tk-barvis', 'Nada');
  ok((await T('Dain X')).barVis === 'none', 'barVis nada');
  await page.locator('.btn', { hasText: 'Adicionar aura' }).click(); await w();
  ok((await T('Dain X')).auras.length === 2, 'aura adicionada');
  await segClick('au1-k', 'Cone');
  await setNum('au1-r', 4); await setNum('au1-a', 90); await setNum('au1-d', 45);
  await range('au1-o', 0.4);
  d = await T('Dain X');
  ok(d.auras[1].k === 'cone' && d.auras[1].r === 4 && d.auras[1].ang === 90 && d.auras[1].dir === 45 && d.auras[1].a === 0.4, 'aura cone configurada: ' + JSON.stringify(d.auras[1]));
  // alça do cone no mapa: ponta em (centro + R na direção 45°)
  const half = 0.5, R = 4 + half, cx = d.x / 64 + half, cy = d.y / 64 + half;
  await drag(cx + Math.cos(Math.PI / 4) * R, cy + Math.sin(Math.PI / 4) * R, cx + 3.5, cy);
  d = await T('Dain X');
  ok(d.auras[1].dir === 0 && d.auras[1].r === 3, `alça gira e estica o cone (dir ${d.auras[1].dir}, r ${d.auras[1].r})`);
  await sw('au1-p');
  ok((await T('Dain X')).auras[1].pub === false, 'aura só para o dono');
  await page.locator('.card').nth(1).locator('.ib').click(); await w();
  ok((await T('Dain X')).auras.length === 1, 'aura removida');
  await openSec('s-vis');
  await setNum('tk-vr', 6); await setNum('tk-vd', 3);
  d = await T('Dain X');
  ok(d.vis.range === 6 && d.vis.dark === 3, 'alcance e visão no escuro');
  await sw('tk-light');
  await page.locator('#tk-lp').selectOption({ label: 'Lampião' }); await w();
  d = await T('Dain X');
  ok(d.light.on && d.light.dim === 12 && d.light.bright === 6, 'token carrega um lampião');
  await sw('tk-hidden'); await sw('tk-locked');
  await page.locator('#tk-notes').fill('nota secreta'); await page.locator('#tk-notes').press('Tab'); await w();
  d = await T('Dain X');
  ok(d.hidden && d.locked && d.notes === 'nota secreta', 'oculto, travado e anotado');
  await drag(cx, cy, cx + 3, cy); await w(100);
  ok((await T('Dain X')).x === d.x, 'token travado não sai do lugar');
  ok(await page.locator('.toast', { hasText: 'travada' }).count() > 0, 'aviso explica por que não moveu');
  await sw('tk-hidden'); await sw('tk-locked');
  errs('token');

  /* Formas */
  await key('r'); await drag(2, 2, 5, 4); await key('v'); await click(2.02, 3);
  await sw('sh-fon');
  let sc = await SC();
  let sh = sc.shapes[sc.shapes.length - 1];
  ok(!!sh.f, 'preencher');
  await range('sh-sw', 10); await range('sh-a', 0.5);
  await sw('sh-top'); await sw('sh-gm'); await sw('sh-lock');
  sc = await SC(); sh = sc.shapes[sc.shapes.length - 1];
  ok(sh.sw === 10 && sh.a === 0.5 && sh.top && sh.gm && sh.lock, 'espessura, opacidade, camada, só mestre, travado');
  await key('Escape'); await click(3.5, 3);
  ok((await ev(() => __urgm.App.sel.length)) === 0, 'forma travada não seleciona com clique');
  await click(3.5, 3, { button: 'right' });
  await page.locator('.menu-i', { hasText: 'Destravar' }).click(); await w();
  sc = await SC(); sh = sc.shapes[sc.shapes.length - 1];
  ok(!sh.lock, 'destravar pelo botão direito');
  await key('Delete');
  errs('formas');

  /* Efeito */
  await ev(() => { __urgm.App.opt.fx = 'veneno'; __urgm.App.opt.fxShape = 'circ'; });
  await key('e'); await click(4.5, 16.5);
  await page.locator('#fx-id').selectOption({ label: 'Tinta' }); await w();
  await segClick('fx-k', 'Linha');
  await setNum('fx-r', 5); await setNum('fx-w', 2); await setNum('fx-d', 90);
  await range('fx-p', 0.5);
  await sw('fx-gm');
  sc = await SC();
  let fx = sc.effects[sc.effects.length - 1];
  ok(fx.fx === 'tinta' && fx.k === 'line' && fx.r === 5 && fx.w === 2 && fx.dir === 90 && fx.pow === 0.5 && fx.gm, 'efeito editado: ' + JSON.stringify(fx));
  await page.locator('#fx-tok').selectOption({ label: 'Astie' }); await w();
  sc = await SC(); fx = sc.effects[sc.effects.length - 1];
  ok(fx.token === (await T('Astie')).id, 'efeito preso pelo painel');
  await page.locator('#fx-tok').selectOption(''); await w();
  sc = await SC(); fx = sc.effects[sc.effects.length - 1];
  ok(fx.token === null && Math.abs(fx.x - 8.5 * 64) < 1, 'solto do token, fica onde estava');
  await key('Delete');
  errs('efeito');

  /* Parede e porta pelo painel */
  await key('w'); await click(21, 3);
  await segClick('wl-k', 'Porta');
  await sw('wl-open'); await sw('wl-lock');
  sc = await SC();
  let wl = sc.walls.find(x => x.open);
  ok(wl && wl.k === 'door' && wl.locked, 'parede vira porta, aberta e trancada');
  await segClick('wl-k', 'Parede');
  await key('v');
  errs('parede');

  /* Luz */
  await click(19.5, 5.5);
  await sw('lz-on');
  sc = await SC();
  ok(sc.lights[0].on === false, 'luz apagada');
  await sw('lz-on');
  await page.locator('#lz-pre').selectOption({ label: 'Vela' }); await w();
  await setNum('lz-d', 4);
  sc = await SC();
  ok(sc.lights[0].name === 'Vela' && sc.lights[0].dim === 4, 'tipo e alcance da luz');
  await drag(19.5 + 4, 5.5, 19.5 + 7, 5.5);
  sc = await SC();
  ok(sc.lights[0].dim === 7, 'alça muda o alcance da luz (' + sc.lights[0].dim + ')');
  errs('luz');

  /* Turnos */
  await page.locator('#tab-turn').click(); await w();
  sc = await SC();
  const first = sc.turn.list[0].id;
  await page.locator('.turn').nth(0).locator('.turn-a .ib').nth(1).click(); await w();   // descer
  sc = await SC();
  ok(sc.turn.list[1].id === first && sc.turn.cur === first, 'descer mantém de quem é a vez');
  await page.locator('.turn').nth(1).locator('.turn-a .ib').nth(0).click(); await w();   // subir
  await setNum('tn-' + first, 3);
  await page.locator('.btn', { hasText: 'Ordenar por iniciativa' }).click(); await w();
  sc = await SC();
  ok(sc.turn.list[sc.turn.list.length - 1].id === first, 'ordenar por iniciativa');
  await page.locator('.turn').nth(0).locator('.turn-a .ib').nth(2).click(); await w();   // tirar
  sc = await SC();
  ok(sc.turn.list.length === 5, 'tirar da ordem');
  await page.locator('.btn', { hasText: 'Entrada avulsa' }).click(); await w();
  await page.locator('#dlg-in').fill('Armadilha'); await page.locator('.modal .btn.primary').click(); await w();
  sc = await SC();
  ok(sc.turn.list.some(e => e.name === 'Armadilha' && !e.token), 'entrada avulsa');
  await page.locator('.btn', { hasText: 'Encerrar' }).click(); await w();
  ok((await SC()).turn.on === false, 'encerrar');
  await page.locator('.btn', { hasText: 'Iniciar' }).click(); await w();
  sc = await SC();
  ok(sc.turn.on && sc.turn.round === 1, 'iniciar zera a rodada');
  await page.locator('.btn', { hasText: 'Limpar' }).click(); await w();
  ok((await SC()).turn.list.length === 0, 'limpar');
  await key('Control+z');
  ok((await SC()).turn.list.length === 6, 'desfazer devolve a ordem');
  errs('turnos');

  /* Cena */
  await page.locator('#tab-scene').click(); await w();
  await page.locator('#sc-name').fill('Emboscada'); await page.locator('#sc-name').press('Enter'); await w();
  await setNum('sc-cols', 34); await setNum('sc-rows', 22);
  sc = await SC();
  ok(sc.name === 'Emboscada' && sc.cols === 34 && sc.rows === 22, 'nome e tamanho da cena');
  ok(await page.locator('#sceneBtn .scene-n').textContent() === 'Emboscada', 'nome novo no topo');
  const before = await T('Bandido');
  await setNum('sc-cell', 80);
  sc = await SC();
  const after = await T('Bandido');
  ok(sc.cell === 80 && Math.abs(after.x - before.x * 1.25) < 0.01 && Math.abs(sc.walls[0].x2 - 25 * 80) < 0.01, 'mudar o quadrado reescala tokens e paredes');
  await key('Control+z');
  ok((await SC()).cell === 64, 'desfazer volta o quadrado');
  await openSec('c-grid');
  await sw('gr-on'); await setNum('gr-u', 2);
  await page.locator('#gr-un').fill('pés'); await page.locator('#gr-un').press('Enter'); await w();
  await segClick('gr-d', 'Distância real');
  sc = await SC();
  ok(sc.grid.on === false && sc.grid.unit === 2 && sc.grid.unitName === 'pés' && sc.grid.diag === 'eucl', 'grade e medidas');
  await sw('gr-on');
  await segClick('sc-light', 'Escuro');
  ok((await SC()).light === 'escuro', 'luz ambiente');
  await segClick('sc-light', 'Penumbra');
  await sw('fg-expl'); await sw('fg-shared'); await sw('fg-man'); await sw('sc-block');
  sc = await SC();
  ok(sc.fog.explored === false && sc.fog.shared === false && sc.fog.manual === true && sc.blockMove === false, 'interruptores de visão');
  await page.locator('.btn', { hasText: 'Esconder tudo' }).click(); await w();
  ok((await SC()).nFog === 1, 'esconder tudo');
  await page.locator('.btn', { hasText: 'Revelar tudo' }).click(); await w();
  ok((await SC()).nFog === 1, 'revelar tudo substitui a operação anterior');
  await sw('fg-expl');
  await page.locator('.btn', { hasText: 'Esquecer áreas exploradas' }).click(); await w();
  await page.locator('.modal .btn.danger').click(); await w();
  ok(await ev(() => Object.keys(__urgm.Store.scene().explored).length) === 0, 'esquecer áreas exploradas');
  await sw('pm-desenhar'); await sw('pm-efeitos'); await sw('pm-portas'); await sw('pm-mover');
  sc = await SC();
  ok(sc.perms.desenhar && sc.perms.efeitos && sc.perms.portas && !sc.perms.mover, 'permissões');
  errs('cena');

  /* Jogador com permissões novas */
  await page.locator('#viewerSel').selectOption({ label: 'Dalmo' }); await w(250);
  const tools = await ev(() => Array.from(document.querySelectorAll('.tool')).map(b => b.id.replace('tool-', '')).join());
  ok(tools === 'select,pan,free,line,rect,ell,poly,text,fx,ruler,ping', 'ferramentas liberadas ao jogador: ' + tools);
  d = await T('Dain X');
  await drag(d.x / 64 + 0.5, d.y / 64 + 0.5, d.x / 64 + 2.5, d.y / 64 + 0.5); await w(100);
  ok((await T('Dain X')).x === d.x, 'sem permissão de mover, o token do jogador não sai');
  ok(await page.locator('.toast', { hasText: 'não liberou mover' }).count() > 0, 'aviso de permissão');
  await key('r'); await drag(10, 16, 12, 17.5); await key('v');
  sc = await SC();
  ok(sc.shapes[sc.shapes.length - 1].by === 'jg_dalmo' && !sc.shapes[sc.shapes.length - 1].gm, 'desenho do jogador fica assinado');
  await click(10.02, 16.7);
  ok((await ev(() => __urgm.App.sel.length)) === 1, 'jogador seleciona o próprio desenho');
  await key('Delete');
  await click(12.2, 11.6);   // linha do mestre (só mestre) não é selecionável
  ok((await ev(() => __urgm.App.sel.filter(s => s.c === 'shapes').length)) === 0, 'jogador não seleciona desenho do mestre');
  await click(20.5, 9);
  ok((await SC()).walls.some(x => x.k === 'door' && x.open), 'com permissão, o jogador abre a porta');
  await page.locator('#backGm').click(); await w(200);
  errs('jogador');

  /* Jogadores */
  await page.locator('#tab-players').click(); await w();
  await page.locator('.btn', { hasText: 'Adicionar jogador' }).click(); await w();
  await page.locator('#dlg-in').fill('Bia'); await page.locator('.modal .btn.primary').click(); await w();
  let pls = await ev(() => __urgm.Store.S.players.map(p => p.name));
  ok(pls.join() === 'Dalmo,Bia', 'jogador adicionado');
  ok((await page.locator('#viewerSel option').allTextContents()).join() === 'Mestre,Dalmo,Bia', 'lista "Vendo como" atualizada');
  const bia = await ev(() => __urgm.Store.S.players[1].id);
  await page.locator('#pl-n-' + bia).fill('Beatriz'); await page.locator('#pl-n-' + bia).press('Enter'); await w();
  await page.locator('.li.player').nth(1).locator('.ib').nth(1).click(); await w();
  await page.locator('.modal .btn.danger').click(); await w();
  pls = await ev(() => __urgm.Store.S.players.map(p => p.name));
  ok(pls.join() === 'Dalmo', 'jogador removido');
  errs('jogadores');

  /* Menu de cenas */
  await page.locator('#sceneBtn').click(); await page.locator('.menu-i', { hasText: 'Duplicar esta cena' }).click(); await w(250);
  sc = await SC();
  ok(sc.name === 'Emboscada (cópia)' && sc.nT === 7, 'cena duplicada');
  await page.locator('#sceneBtn').click(); await page.locator('.menu-i', { hasText: 'Renomear' }).click(); await w();
  await page.locator('#dlg-in').fill('Cópia de teste'); await page.locator('.modal .btn.primary').click(); await w();
  ok((await SC()).name === 'Cópia de teste', 'renomear pelo menu');
  await page.locator('#sceneBtn').click(); await page.locator('.menu-i', { hasText: 'Apagar esta cena' }).click(); await w();
  await page.locator('.modal .btn.danger').click(); await w(250);
  ok((await SC()).name === 'Emboscada' && (await ev(() => __urgm.Store.S.order.length)) === 1, 'cena apagada, volta para a outra');
  await page.locator('#moreBtn').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.menu-i', { hasText: 'Exportar todas' }).click()]);
  const file = path.join(__dirname, 'all.json'); await dl.saveAs(file);
  const all = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok(all.format === 'tinycats-mesa' && all.scenes.length === 1 && all.players.length === 1, 'exportar todas as cenas');
  await page.locator('#moreBtn').click(); await page.locator('.menu-i', { hasText: 'Animar' }).click(); await w();
  ok(await ev(() => __urgm.App.anim) === false, 'animações desligadas');
  errs('menus');

  console.log(fails ? `\n${fails} falha(s) em ${n} verificações` : `\n${n} verificações passaram`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
