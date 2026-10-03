// Bateria da v2, parte B: tutorial de primeiro uso, dados salvos pela v1 abrindo na v2, e exportar/importar.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
(async () => {
  let fails = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };

  /* ============ 1. Tutorial ============ */
  {
    const t = await open({ query: '&tour', wait: 1500 });
    const { page } = t;
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const w = ms => page.waitForTimeout(ms || 350);
    const errs = label => { if (t.errs.length) { console.log(`ERROS em "${label}":\n` + t.errs.join('\n')); fails += t.errs.length; t.errs.length = 0; } };
    const state = () => ev(() => {
      const r = e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
      const u = __urgm, hole = document.querySelector('.tour-hole'), card = document.querySelector('.tour-card');
      return {
        active: u.Tour.active(), step: u.Tour.step(), title: card ? card.querySelector('.tour-t').textContent : '', count: card && card.querySelector('.tour-n') ? card.querySelector('.tour-n').textContent : '',
        none: hole ? hole.classList.contains('none') : null, hole: hole ? r(hole) : null, card: card ? r(card) : null,
        vw: innerWidth, vh: innerHeight, tab: u.App.tab, tool: u.App.tool, sel: u.App.sel.map(s => (u.Store.get(s.c, s.id) || {}).name),
        focus: document.activeElement ? document.activeElement.id : '', next: card ? card.querySelector('#tour-next').textContent : '',
      };
    });
    const rectOf = sel => ev(sel => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; }, sel);
    const apart = s => s.card.r <= s.hole.l + 1 || s.card.l >= s.hole.r - 1 || s.card.b <= s.hole.t + 1 || s.card.t >= s.hole.b - 1;
    const inside = s => s.card.l >= 0 && s.card.t >= 0 && s.card.r <= s.vw && s.card.b <= s.vh;
    const near = (a, b, tol) => Math.abs(a.l - b.l) <= tol && Math.abs(a.t - b.t) <= tol && Math.abs(a.r - b.r) <= tol && Math.abs(a.b - b.b) <= tol;

    let s = await state();
    ok(s.active && s.step === 0 && s.title === 'Bem-vindo à mesa de cenas' && s.none && s.count === '' && s.next === 'Começar', 'primeira visita do mestre: o tutorial abre sozinho na tela de boas-vindas');
    ok(s.focus === 'tour-next' && inside(s), 'o foco começa no botão de avançar e o cartão cabe na tela');
    ok(!(await ev(() => document.querySelector('.tour-card').textContent.includes('null'))), 'cartão sem texto sobrando');
    const nTok = await ev(() => __urgm.Store.scene().tokens.length);
    await page.keyboard.press('t'); await page.keyboard.press('Delete'); await page.keyboard.press('w'); await w(150);
    ok((await state()).tool === 'select' && await ev(() => __urgm.Store.scene().tokens.length) === nTok, 'atalhos do mapa ficam parados durante o tutorial');
    await page.mouse.click(300, 300); await w(150);
    s = await state();
    ok(s.active && s.step === 0 && s.sel.join() === 'Dain X', 'clicar fora do cartão não fecha nem mexe no mapa');
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    ok(await ev(() => document.querySelector('.tour-card').contains(document.activeElement)), 'Tab fica dentro do cartão');

    await page.locator('#tour-next').click(); await w();
    s = await state();
    ok(s.step === 1 && s.title === 'Mover os tokens' && s.count === '1 de 5' && !s.none && s.hole.w > 20 && s.hole.h > 20, 'passo 1: destaque no token');
    const tokR = await ev(() => { const u = __urgm, sc = u.Store.scene(), tk = sc.tokens.find(t => t.name === 'Dain X'), r = u.Render.cv.getBoundingClientRect(), [sx, sy] = u.Render.toScreen(tk.x, tk.y); return { x: r.left + sx + tk.size * sc.cell * u.App.view.z / 2, y: r.top + sy + tk.size * sc.cell * u.App.view.z / 2 }; });
    ok(tokR.x > s.hole.l && tokR.x < s.hole.r && tokR.y > s.hole.t && tokR.y < s.hole.b && apart(s) && inside(s), 'o destaque cobre o token e o cartão não fica por cima dele');
    await page.keyboard.press('ArrowRight'); await w();
    s = await state();
    ok(s.step === 2 && s.title === 'Barras' && near(s.hole, await rectOf('#hud'), 8) && apart(s) && inside(s), 'passo 2 (seta →): destaque na faixa de barras');
    await page.keyboard.press('Enter'); await w();
    s = await state();
    ok(s.step === 3 && s.title === 'Condições' && s.tab === 'sel' && s.sel.join() === 'Bandido', 'passo 3 (Enter): condições, num token que já tem contador');
    const cond = await rectOf('#s-cond');
    ok(await ev(() => document.getElementById('s-cond').open) && Math.abs(s.hole.l - (cond.l - 6)) <= 2 && Math.abs(s.hole.t - (cond.t - 6)) <= 2 && apart(s) && inside(s), 'destaque na seção de condições, aberta e visível');
    ok(await ev(() => !!document.getElementById('cd-fogo-plus')), 'o contador aparece dentro do destaque');
    await page.locator('#tour-next').click(); await w();
    s = await state();
    ok(s.step === 4 && s.title === 'Turnos' && s.tab === 'turn' && near(s.hole, await rectOf('#side'), 8) && apart(s) && inside(s), 'passo 4: aba de turnos');
    await page.keyboard.press('ArrowLeft'); await w();
    s = await state();
    ok(s.step === 3 && s.tab === 'sel', 'seta ← volta um passo');
    await page.locator('#tour-next').click(); await w();
    await page.locator('#tour-next').click(); await w();
    s = await state();
    ok(s.step === 5 && s.title === 'Ver como jogador' && s.next === 'Concluir' && near(s.hole, await rectOf('.viewer'), 8) && apart(s) && inside(s) && !(await ev(() => !!document.getElementById('tour-skip'))), 'passo 5: "Vendo como", com o botão Concluir');
    await page.setViewportSize({ width: 1180, height: 760 }); await w(450);
    s = await state();
    ok(near(s.hole, await rectOf('.viewer'), 8) && inside(s), 'mudar o tamanho da janela reposiciona destaque e cartão');
    await page.setViewportSize({ width: 1440, height: 900 }); await w(300);
    await page.locator('#tour-back').click(); await w();
    ok((await state()).step === 4, 'botão Voltar');
    await page.locator('#tour-next').click(); await w();
    await page.locator('#tour-next').click(); await w();
    s = await state();
    ok(!s.active && s.tab === 'sel' && s.sel.join() === 'Dain X' && s.tool === 'select' && !(await ev(() => !!document.getElementById('tour'))), 'Concluir fecha e devolve aba, seleção e ferramenta');
    ok(await ev(() => __urgm.Store.S.prefs.tour === 1 && __urgm.Tour.seen()), 'fica marcado como visto');
    ok(await ev(() => JSON.stringify(__urgm.Store.scene().turn.round)) === '2' && !(await ev(() => __urgm.Store.canUndo())), 'o passeio não mudou nada na cena');
    errs('tutorial');

    await ev(() => __urgm.Persist.flush()); await w(300);
    await page.reload({ waitUntil: 'load' }); await w(1500);
    ok(!(await state()).active, 'na visita seguinte o tutorial não abre de novo');
    await page.locator('#moreBtn').click(); await w(150);
    await page.locator('.menu-i', { hasText: 'Rever o tutorial' }).click(); await w();
    ok((await state()).active, 'menu ⋯ → "Rever o tutorial" abre de novo');
    await page.keyboard.press('Escape'); await w(200);
    ok(!(await state()).active, 'Esc fecha o tutorial');
    await ev(() => __urgm.Tour.start()); await w();
    await page.locator('#tour-skip').click(); await w(200);
    ok(!(await state()).active, '"Pular o tutorial" fecha');
    // jogador não tem o item no menu
    await ev(() => __urgm.UI.setViewer('jg_dalmo')); await w(250);
    await page.locator('#moreBtn').click(); await w(150);
    ok(await page.locator('.menu-i', { hasText: 'Rever o tutorial' }).count() === 0 && await page.locator('.menu-i', { hasText: 'Atalhos de teclado' }).count() === 1, 'vendo como jogador, o menu não oferece o tutorial');
    await page.keyboard.press('Escape');
    // começar vendo como jogador: volta ao mestre
    await ev(() => __urgm.Tour.start()); await w();
    ok(await ev(() => __urgm.App.viewer) === 'gm' && (await state()).active, 'abrir o tutorial vendo como jogador volta para a visão do mestre');
    await page.keyboard.press('Escape'); await w(200);
    // cena vazia: o passeio continua funcionando, com destaques de reserva
    await ev(() => { const u = __urgm; const sc = JSON.parse(JSON.stringify(u.Store.scene())); Object.assign(sc, { id: 'cena_vazia', name: 'Vazia', sample: false, tokens: [], shapes: [], walls: [], lights: [], effects: [], fogOps: [], explored: {}, targets: [], turn: { on: false, round: 1, cur: null, list: [] } }); u.Store.addScene(sc); u.UI.switchScene(sc.id); });
    await w(400);
    await ev(() => __urgm.Tour.start()); await w();
    const seen = [];
    for (let i = 0; i < 5; i++) { await page.locator('#tour-next').click(); await w(); const x = await state(); seen.push([x.step, x.none, inside(x)]); }
    ok(JSON.stringify(seen) === JSON.stringify([[1, false, true], [2, true, true], [3, false, true], [4, false, true], [5, false, true]]), 'cena sem tokens: o passeio segue com destaques de reserva — ' + JSON.stringify(seen));
    await page.locator('#tour-next').click(); await w(200);
    ok(!(await state()).active, 'e conclui normalmente');
    errs('tutorial, casos de borda');
    await t.close();
  }

  /* ============ 2. Dados salvos pela v1 abrindo na v2 ============ */
  {
    const t = await open({ file: 'page-v1.html', wait: 1200 });
    const { page } = t;
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const w = ms => page.waitForTimeout(ms || 300);
    const errs = label => { if (t.errs.length) { console.log(`ERROS em "${label}":\n` + t.errs.join('\n')); fails += t.errs.length; t.errs.length = 0; } };
    // uso típico da v1: mexe em barras, condições, parede, efeito, névoa e turnos; exporta a cena
    const v1 = await ev(() => {
      const u = __urgm, S = u.Store, sc = S.scene();
      const tk = n => sc.tokens.find(t => t.name === n);
      u.Act.barSet(tk('Dain X'), 0, '-12');
      u.Act.condToggle([tk('Astie')], 'veneno');
      S.tx('x', () => {
        S.add('walls', { id: 'w_v1', k: 'door', x1: 64, y1: 64, x2: 128, y2: 64, open: true, locked: false });
        S.add('effects', { id: 'fx_v1', fx: 'raio', k: 'line', x: 320, y: 960, r: 4, w: 1, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: 5 });
        S.scn({ fog: Object.assign({}, sc.fog, { manual: true }) });
        S.add('fogOps', { id: 'fg_v1', m: 'r', k: 'rect', x: 0, y: 0, w: 640, h: 640 });
      });
      u.Act.turnStep(1);
      return { hasNew: 'cinfo' in tk('Dain X') || 'targets' in sc || 'weather' in sc, bars: tk('Dain X').bars.map(b => Object.keys(b).sort().join()).join('|'), cur: sc.turn.cur, nTok: sc.tokens.length, id: sc.id };
    });
    ok(!v1.hasNew && v1.bars === 'c,m,n,on,v|c,m,n,on,v|c,m,n,on,v', 'a página de teste é mesmo a v1 (sem os campos novos)');
    await page.locator('#moreBtn').click(); await w(150);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.menu-i', { hasText: 'Exportar esta cena' }).click()]);
    const fileV1 = path.join(__dirname, 'export-v1.json'); await dl.saveAs(fileV1);
    ok(JSON.parse(fs.readFileSync(fileV1, 'utf8')).version === 1, 'cena exportada pela v1 guardada para o teste de importação');
    await ev(() => { __urgm.Vision.flushExplored(); return __urgm.Persist.flush(); }); await w(400);
    errs('v1');

    await page.goto(t.base + 'page.html?debug&tour', { waitUntil: 'load' }); await w(1600);
    errs('abrir na v2 os dados da v1');
    const v2 = await ev(() => {
      const u = __urgm, sc = u.Store.scene(), tk = n => sc.tokens.find(t => t.name === n);
      return {
        id: sc.id, nTok: sc.tokens.length, cur: sc.turn.cur, dain: tk('Dain X').bars.map(b => `${b.n}:${b.v}/${b.m}:${b.k}:${b.vis}:${b.on}`).join(), cinfo: JSON.stringify(tk('Astie').cinfo), conds: tk('Astie').conds.join(),
        door: JSON.stringify(sc.walls.find(x => x.id === 'w_v1')), fx: !!sc.effects.find(e => e.id === 'fx_v1'), fog: sc.fog.manual && sc.fogOps.length === 1,
        targets: JSON.stringify(sc.targets), tone: sc.tone, weather: JSON.stringify(sc.weather), mira: sc.perms.mira, light: sc.light,
        frames: u.Render.stats.frames, tour: u.Tour.active(), hud: !!document.getElementById('hud-b0'),
      };
    });
    ok(v2.id === v1.id && v2.nTok === v1.nTok && v2.cur === v1.cur, 'a cena, os tokens e a vez continuam os mesmos');
    ok(v2.dain === 'Vida:50/80:bar::true,SP:24/40:bar::true,Fé:3/5:bar::true', 'as barras da v1 chegam inteiras e ganham estilo e visibilidade: ' + v2.dain);
    ok(v2.conds === 'veneno' && v2.cinfo === '{}', 'condições da v1 continuam, prontas para ganhar contador');
    ok(JSON.parse(v2.door).open === true && JSON.parse(v2.door).k === 'door' && v2.fx && v2.fog, 'porta aberta, efeito e névoa manual preservados');
    ok(v2.targets === '[]' && v2.tone === 'dia' && v2.weather === '{"k":"","pow":0.6}' && v2.mira === true && v2.light === 'penumbra', 'campos novos com valores neutros; a luz que a cena tinha não muda');
    ok(v2.frames > 0, 'o mapa desenha normalmente');
    ok(v2.tour, 'quem vem da v1 vê o tutorial uma vez');
    await page.keyboard.press('Escape'); await w(250);
    ok(await ev(() => { const u = __urgm; u.setSel([{ c: 'tokens', id: u.Store.scene().tokens.find(t => t.name === 'Dain X').id }]); u.UI.renderAll(); return !!document.getElementById('hud-b0') && !u.Tour.active(); }), 'depois do tutorial, a mesa funciona: selecionar um token mostra a faixa dele');
    // usa os recursos novos em cima dos dados antigos e recarrega
    await ev(() => {
      const u = __urgm, sc = u.Store.scene(), tk = n => sc.tokens.find(t => t.name === n);
      u.Act.barAdd(tk('Dain X')); u.Act.condStep(tk('Astie'), 'veneno', 1); u.Act.condStep(tk('Astie'), 'veneno', 1);
      u.Act.targetToggle([tk('Bandido')]);
      u.Store.tx('x', () => u.Store.scn({ tone: 'noite', weather: { k: 'chuva', pow: 0.8 } }));
      return u.Persist.flush();
    });
    await w(400);
    await page.reload({ waitUntil: 'load' }); await w(1200);
    const again = await ev(() => { const u = __urgm, sc = u.Store.scene(), tk = n => sc.tokens.find(t => t.name === n); return { bars: tk('Dain X').bars.length, n: tk('Astie').cinfo.veneno.n, tg: sc.targets.length, tone: sc.tone, wk: sc.weather.k, tour: u.Tour.active() }; });
    ok(again.bars === 4 && again.n === 2 && again.tg === 1 && again.tone === 'noite' && again.wk === 'chuva' && !again.tour, 'recursos novos sobre os dados antigos, salvos e recarregados: ' + JSON.stringify(again));
    // a cena de exemplo nova (com pontos e contadores) fica a um clique, sem tocar nas cenas antigas
    const before = await ev(() => ({ n: __urgm.Store.S.order.length, id: __urgm.Store.S.current, json: JSON.stringify(__urgm.Store.scene().tokens.map(t => [t.name, t.bars.length])) }));
    await page.locator('#sceneBtn').click(); await w(150);
    await page.locator('.menu-i', { hasText: 'Nova cena de exemplo' }).click(); await w(500);
    const smp = await ev(() => { const u = __urgm, sc = u.Store.scene(), tk = n => sc.tokens.find(t => t.name === n); return { n: u.Store.S.order.length, name: sc.name, dain: tk('Dain X').bars.map(b => b.n + ':' + b.k).join(), fogo: tk('Bandido').cinfo.fogo.n, d: tk('Capitão').cinfo.escudo.d, sel: u.App.sel.map(s => u.Store.get(s.c, s.id).name).join(), hud: document.querySelectorAll('#hud .pip').length, players: u.Store.S.players.length }; });
    ok(smp.n === before.n + 1 && smp.name === 'Cena de exemplo 2' && smp.dain === 'Vida:bar,SP:bar,Fé:bar,Poder divino:pts' && smp.fogo === 2 && smp.d === 3 && smp.sel === 'Dain X' && smp.hud === 5 && smp.players === 1, 'menu de cenas → "Nova cena de exemplo": ' + JSON.stringify(smp));
    const old = await ev(id => JSON.stringify(__urgm.Store.S.scenes[id].tokens.map(t => [t.name, t.bars.length])), before.id);
    ok(old === before.json, 'a cena antiga não foi tocada');
    errs('v2 sobre dados da v1');
    await t.close();
  }

  /* ============ 3. Exportar e importar ============ */
  {
    const t = await open();
    const { page } = t;
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const w = ms => page.waitForTimeout(ms || 300);
    const errs = label => { if (t.errs.length) { console.log(`ERROS em "${label}":\n` + t.errs.join('\n')); fails += t.errs.length; t.errs.length = 0; } };
    // importa a cena exportada pela v1
    await page.locator('#fileJson').setInputFiles(path.join(__dirname, 'export-v1.json')); await w(500);
    let r = await ev(() => { const u = __urgm, sc = u.Store.scene(); return { n: u.Store.S.order.length, name: sc.name, bars: sc.tokens[0].bars.map(b => `${b.n}:${b.k}:${b.vis}`).join(), cinfo: sc.tokens.every(t => t.cinfo && typeof t.cinfo === 'object'), tone: sc.tone, tg: Array.isArray(sc.targets), wk: sc.weather.k, toast: Array.from(document.querySelectorAll('.toast')).map(x => x.textContent).join(' | ') }; });
    ok(r.n === 2 && r.bars === 'Vida:bar:,SP:bar:,Fé:bar:' && r.cinfo && r.tone === 'dia' && r.tg && r.wk === '' && /Cena importada/.test(r.toast), 'importar arquivo da v1: ' + JSON.stringify(r));
    errs('importar v1');
    // exporta a mesa da v2 com barras padrão e recursos novos
    await ev(() => {
      const u = __urgm; u.UI.switchScene(u.Store.S.order[0]);
      u.Store.S.prefs.barDefaults = [{ n: 'PV', c: '#d6524b', v: 20, m: 20, k: 'bar', on: true, vis: '' }, { n: 'Cargas', c: '#b07ad9', v: 3, m: 3, k: 'pts', on: true, vis: 'none' }];
    });
    await w(300);
    await ev(() => { const u = __urgm, sc = u.Store.scene(); u.Store.tx('x', () => { u.Store.scn({ tone: 'breu', light: 'escuro', weather: { k: 'neve', pow: 0.4 } }); u.Store.add('walls', { id: 'w_jan', k: 'window', x1: 0, y1: 0, x2: 64, y2: 0, open: false, locked: false, secret: false }); u.Store.add('walls', { id: 'w_sec', k: 'door', x1: 0, y1: 64, x2: 64, y2: 64, open: false, locked: false, secret: true }); }); });
    await page.locator('#moreBtn').click(); await w(150);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.menu-i', { hasText: 'Exportar todas' }).click()]);
    const file = path.join(__dirname, 'all-v2.json'); await dl.saveAs(file);
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    const s0 = d.scenes[0], bandido = s0.tokens.find(x => x.name === 'Bandido');
    ok(d.format === 'tinycats-mesa' && d.version === 3 && d.barDefaults.length === 2 && d.barDefaults[1].k === 'pts', 'arquivo da mesa: formato Tiny Cats, versão 3, com as barras padrão');
    ok(s0.tone === 'breu' && s0.weather.k === 'neve' && bandido.cinfo.fogo.n === 2 && s0.walls.some(x => x.k === 'window') && s0.walls.some(x => x.secret) && s0.tokens.find(x => x.name === 'Dain X').bars[3].k === 'pts', 'o arquivo leva hora do dia, clima, contadores, paredes especiais e pontos');
    await t.close();

    // numa mesa nova (outro navegador): importa tudo
    const t2 = await open();
    const p2 = t2.page;
    await p2.locator('#fileJson').setInputFiles(file); await p2.waitForTimeout(600);
    const r2 = await p2.evaluate(() => { const u = __urgm, S = u.Store; const sc = S.scene(); return { n: S.S.order.length, defs: (S.S.prefs.barDefaults || []).map(b => b.n + ':' + b.k).join(), tone: sc.tone, wk: sc.weather.k, sec: sc.walls.filter(x => x.secret).length, fogo: (sc.tokens.find(x => x.name === 'Bandido').cinfo.fogo || {}).n }; });
    ok(r2.n === 3 && r2.defs === 'PV:bar,Cargas:pts' && r2.tone === 'breu' && r2.wk === 'neve' && r2.sec === 1 && r2.fogo === 2, 'mesa nova recebe cenas, barras padrão e os recursos novos: ' + JSON.stringify(r2));
    // quem já tem barras padrão próprias não é atropelado por um arquivo importado
    await p2.evaluate(() => { __urgm.Store.S.prefs.barDefaults = [{ n: 'Minha', c: '#6fbf73', v: 5, m: 5, k: 'bar', on: true, vis: '' }]; });
    await p2.locator('#fileJson').setInputFiles(file); await p2.waitForTimeout(600);
    ok(await p2.evaluate(() => __urgm.Store.S.prefs.barDefaults.map(b => b.n).join()) === 'Minha', 'importar não troca as barras padrão que a mesa já tem');
    // arquivo estragado ou de outro lugar
    const bad = path.join(__dirname, 'bad.json'); fs.writeFileSync(bad, '{"format":"outro","scenes":[]}');
    await p2.evaluate(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    await p2.locator('#fileJson').setInputFiles(bad); await p2.waitForTimeout(400);
    ok(/não parece ter sido exportado/.test(await p2.evaluate(() => Array.from(document.querySelectorAll('.toast')).map(x => x.textContent).join())), 'arquivo de outro lugar: recusa com explicação');
    if (t2.errs.length) { console.log('ERROS na importação:\n' + t2.errs.join('\n')); fails += t2.errs.length; }
    await t2.close();
  }

  console.log(fails ? `\n${fails} falha(s) em ${n} verificações` : `\n${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
