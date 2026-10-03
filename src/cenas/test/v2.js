// Bateria da v2, no navegador: barras extras, contadores e durações, dano em área, mira,
// paredes especiais, hora do dia e clima, véu da visão dos jogadores, números flutuantes e a faixa de vez.
const { open } = require('./lib');
(async () => {
  const t = await open();
  const { page } = t;
  let fails = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 120);
  const pt = (cx, cy) => ev(([cx, cy]) => { const u = __urgm, sc = u.Store.scene(), r = u.Render.cv.getBoundingClientRect(); const [sx, sy] = u.Render.toScreen(cx * sc.cell, cy * sc.cell); return [r.left + sx, r.top + sy]; }, [cx, cy]);
  const click = async (cx, cy, opt) => { const [x, y] = await pt(cx, cy); await page.mouse.click(x, y, opt); await w(100); };
  const hover = async (cx, cy) => { const [x, y] = await pt(cx, cy); await page.mouse.move(x, y, { steps: 2 }); await w(60); };
  const drag = async (ax, ay, bx, by) => { const [x0, y0] = await pt(ax, ay), [x1, y1] = await pt(bx, by); await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up(); await w(120); };
  const key = async k => { await page.keyboard.press(k); await w(90); };
  const T = name => ev(n => { const sc = __urgm.Store.scene(); return JSON.parse(JSON.stringify(sc.tokens.find(t => t.name === n) || null)); }, name);
  const SC = () => ev(() => { const sc = __urgm.Store.scene(); const { tokens, shapes, explored, fogOps, ...rest } = sc; return JSON.parse(JSON.stringify(Object.assign(rest, { nT: tokens.length }))); });
  const sel = async name => { await ev(n => { const u = __urgm, tk = u.Store.scene().tokens.find(t => t.name === n); u.setSel(tk ? [{ c: 'tokens', id: tk.id }] : []); }, name); await w(); };
  const selMany = async names => { await ev(ns => { const u = __urgm; u.setSel(u.Store.scene().tokens.filter(t => ns.includes(t.name)).map(t => ({ c: 'tokens', id: t.id }))); }, names); await w(); };
  const fillTab = async (id, v) => { await page.locator('#' + id).fill(String(v)); await page.locator('#' + id).press('Tab'); await w(); };
  const segClick = async (id, label) => { await page.locator(`#${id} .seg-b`, { hasText: label }).first().click(); await w(); };
  const sw = async id => { await page.locator(`label.sw:has(#${id})`).click(); await w(); };
  const viewer = async v => { await ev(v => __urgm.UI.setViewer(v), v); await w(250); };
  const toastTexts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.firstChild.textContent));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const undo = async () => { await ev(() => __urgm.Tools.undo()); await w(); };
  const errs = label => { if (t.errs.length) { console.log(`ERROS em "${label}":\n` + t.errs.join('\n')); fails += t.errs.length; t.errs.length = 0; } };
  const has = sel => page.locator(sel).count().then(c => c > 0);

  /* ============ 1. Barras extras, pontos e opções por barra ============ */
  let d = await T('Dain X');
  ok(d.bars.length === 4 && d.bars[3].k === 'pts' && d.bars[3].n === 'Poder divino', 'exemplo: Dain X tem 4 barras, a última em pontos');
  ok(await page.locator('#hud .pips .pip').count() === 5 && await page.locator('#hud .pips .pip.on').count() === 3, 'faixa mostra 5 bolinhas, 3 cheias');
  await page.locator('#hud-b3-p5').click(); await w();
  ok((await T('Dain X')).bars[3].v === 5, 'faixa: clicar na 5ª bolinha enche até 5');
  await page.locator('#hud-b3-p5').click(); await w();
  ok((await T('Dain X')).bars[3].v === 4, 'faixa: clicar na última cheia tira uma');
  await page.locator('#tk-b3-p1').click(); await w();
  await page.locator('#tk-b3-p1').click(); await w();
  ok((await T('Dain X')).bars[3].v === 0, 'painel: as bolinhas chegam a zero');
  ok(!(await has('#hud-b3')) && await has('#hud-b0'), 'faixa: barra comum tem campo de número; pontos, não');
  await page.locator('#tk-baradd').click(); await w();
  d = await T('Dain X');
  ok(d.bars.length === 5 && d.bars[4].on && await has('#tk-b4-k'), 'adicionar barra: entra ligada e com as opções abertas');
  await page.locator('#tk-b4-n').fill('Mana'); await page.locator('#tk-b4-n').press('Enter'); await w();
  await segClick('tk-b4-k', 'Pontos');
  await fillTab('tk-b4-m', 6);
  await page.locator('#tk-b4-vis').selectOption('none'); await w();
  d = await T('Dain X');
  ok(d.bars[4].n === 'Mana' && d.bars[4].k === 'pts' && d.bars[4].m === 6 && d.bars[4].vis === 'none', 'barra nova: nome, estilo, máximo e visibilidade — ' + JSON.stringify(d.bars[4]));
  ok(await page.locator('.bar-pips .pip').count() === 5 + 6, 'painel mostra as bolinhas das duas barras em pontos');
  await fillTab('tk-b4-m', 30);
  ok(await page.locator('.bar-pips .pip').count() === 5, 'máximo alto demais: as bolinhas somem do painel');
  ok(await ev(() => /viram|aparecem como barra/.test(document.querySelector('.bar-opt').textContent)), 'aviso de que os pontos viram barra no mapa');
  await page.locator('#tk-b4-del').click(); await w();
  ok((await T('Dain X')).bars.length === 4 && (await toastTexts()).some(x => /Barra "Mana" removida/.test(x)), 'remover barra avisa');
  await page.locator('.toast-a', { hasText: 'Desfazer' }).click(); await w();
  ok((await T('Dain X')).bars.length === 5, 'desfazer devolve a barra removida');
  for (let i = 0; i < 3; i++) { await page.locator('#tk-baradd').click(); await w(); }
  ok((await T('Dain X')).bars.length === 8 && await page.locator('#tk-baradd').isDisabled(), 'limite de 8 barras por token');
  for (let i = 0; i < 9; i++) await undo();
  ok((await T('Dain X')).bars.length === 4, 'desfazer passo a passo volta às 4 barras');
  await clearToasts();
  errs('barras');

  // regra de visibilidade por barra, vista pelo jogador
  await sel('Bandido');
  await page.locator('#tk-b0-more').click(); await w();
  await page.locator('#tk-b0-vis').selectOption('num'); await w();
  await viewer('jg_dalmo'); await sel('Bandido');
  ok(await ev(() => { const u = __urgm, tk = u.Store.scene().tokens.find(t => t.name === 'Bandido'); return u.barsShown(tk).map(x => x.mode).join(); }) === 'num', 'jogador vê números na barra liberada');
  ok(await ev(() => (document.querySelector('#hud .hud-v') || {}).textContent) === '14/22', 'faixa do jogador mostra os números');
  await viewer('gm'); await sel('Bandido');
  await page.locator('#tk-b0-vis').selectOption('none'); await w();
  await viewer('jg_dalmo'); await sel('Bandido');
  ok(await ev(() => /não mostra as barras/.test(document.querySelector('#s-bars').textContent)), 'barra escondida: o painel do jogador avisa');
  ok(!(await has('#hud .hud-b')), 'barra escondida não aparece na faixa do jogador');
  await viewer('gm'); await sel('Bandido');
  await page.locator('#tk-b0-vis').selectOption(''); await w();
  await page.locator('#tk-b0-more').click(); await w();
  errs('visibilidade por barra');

  /* ============ 2. Barras padrão ============ */
  await page.locator('#tk-bardef').click(); await w();
  ok(await ev(() => document.querySelector('.modal-t').textContent) === 'Barras padrão' && await page.locator('.bd-row:not(.bd-h)').count() === 3, 'janela das barras padrão com as 3 de fábrica');
  await page.locator('#bd-new').click(); await w();
  await page.locator('#bd-3-n').fill('Mana');
  await page.locator('#bd-3-m').fill('3');
  await page.locator('#bd-3-k .seg-b', { hasText: 'Pontos' }).click(); await w();
  ok(await page.locator('#bd-3-n').inputValue() === 'Mana', 'trocar o estilo não perde o que foi digitado');
  await page.locator('#bd-add').check();
  await page.locator('.modal .btn.primary').click(); await w(200);
  let prefs = await ev(() => JSON.parse(JSON.stringify(__urgm.Store.S.prefs)));
  ok(prefs.barDefaults.length === 4 && prefs.barDefaults[3].n === 'Mana' && prefs.barDefaults[3].k === 'pts' && prefs.barDefaults[3].m === 3 && prefs.barDefaults[3].v === 3, 'padrão salvo: ' + JSON.stringify(prefs.barDefaults[3]));
  let all = await ev(() => __urgm.Store.scene().tokens.map(t => [t.name, t.bars.map(b => b.n).join('|')]));
  ok(all.every(([, b]) => b.split('|').filter(x => x === 'Mana').length === 1), 'os tokens da cena receberam a barra que faltava, sem duplicar');
  ok((await T('Dain X')).bars.map(b => b.n).join() === 'Vida,SP,Fé,Poder divino,Energia,Mana', 'quem já tinha barras próprias recebe só as que faltam: ' + (await T('Dain X')).bars.map(b => b.n).join());
  ok((await toastTexts()).some(x => /Barras padrão salvas\. 7 tokens receberam/.test(x)), 'aviso com a contagem: ' + JSON.stringify(await toastTexts()));
  await undo();
  ok((await T('Dain X')).bars.length === 4, 'desfazer tira as barras acrescentadas (o padrão continua salvo)');
  await key('t'); await click(4.5, 4.5);
  let nt = await ev(() => { const sc = __urgm.Store.scene(); return JSON.parse(JSON.stringify(sc.tokens[sc.tokens.length - 1])); });
  ok(nt.bars.map(b => `${b.n}:${b.on}:${b.k}:${b.v}/${b.m}`).join() === 'Vida:true:bar:10/10,SP:false:bar:10/10,Energia:false:bar:10/10,Mana:true:pts:3/3', 'token novo nasce com as barras padrão: ' + nt.bars.map(b => `${b.n}:${b.on}:${b.k}:${b.v}/${b.m}`).join());
  await ev(() => { document.activeElement.blur(); __urgm.Act.deleteSel(); }); await w(); await clearToasts();
  // cancelar não salva
  await ev(() => __urgm.UI.barDefaultsBox(null)); await w();
  await page.locator('#bd-reset').click(); await w();
  ok(await page.locator('.bd-row:not(.bd-h)').count() === 3, '"Voltar ao original" mostra as 3 de fábrica');
  await key('Escape');
  ok((await ev(() => __urgm.Store.S.prefs.barDefaults.length)) === 4, 'fechar sem salvar mantém o padrão');
  errs('barras padrão');

  /* ============ 3. Condições: contador e duração ============ */
  await sel('Bandido');
  let b1 = await T('Bandido');
  ok(b1.conds.join() === 'sangue,fogo' && b1.cinfo.fogo.n === 2, 'exemplo: Bandido queimando com contador 2');
  await page.locator('#cd-fogo-plus').click(); await w();
  ok((await T('Bandido')).cinfo.fogo.n === 3 && await ev(() => document.getElementById('cd-fogo-n').textContent) === '3', '+ soma no contador');
  await page.locator('#cd-fogo-plus').focus(); await key('Enter');
  ok((await T('Bandido')).cinfo.fogo.n === 4 && await ev(() => document.activeElement.id) === 'cd-fogo-plus', 'teclado: Enter no + soma e o foco fica no botão');
  ok(await page.locator('#cd-sangue-minus').isDisabled(), '− fica desligado em quem não tem contador');
  for (let i = 0; i < 4; i++) { await page.locator('#cd-fogo-minus').click(); await w(); }
  b1 = await T('Bandido');
  ok(!b1.conds.includes('fogo') && !b1.cinfo.fogo && (await toastTexts()).some(x => /Queimando saiu de Bandido/.test(x)), 'descer de 1 tira a condição e avisa');
  await page.locator('.toast-a', { hasText: 'Desfazer' }).click(); await w();
  ok((await T('Bandido')).cinfo.fogo.n === 1, 'desfazer devolve a condição com contador 1');
  await fillTab('cd-sangue-d', 2);
  ok((await T('Bandido')).cinfo.sangue.d === 2 && (await T('Bandido')).cinfo.sangue.d0 === 2, 'duração em rodadas');
  await fillTab('cd-sangue-d', '');
  ok(!(await T('Bandido')).cinfo.sangue, 'apagar o campo tira a duração');
  await page.locator('#hud-c-fogo-plus').click(); await w();
  ok((await T('Bandido')).cinfo.fogo.n === 2 && await ev(() => document.getElementById('hud-c-fogo-n').textContent) === '2', 'faixa: + no marcador com contador');
  await page.locator('#hud-c-sangue').click(); await w();
  ok(await ev(() => /Condições de Bandido/.test(document.querySelector('.modal-t').textContent)), 'faixa: marcador sem contador abre a janela de condições');
  await page.locator('#cdm-sangue-plus').click(); await w();
  ok((await T('Bandido')).cinfo.sangue.n === 1 && await ev(() => document.getElementById('cdm-sangue-n').textContent) === '1', 'janela: o contador começa e a lista se atualiza');
  ok(await ev(() => document.activeElement.id) === 'cdm-sangue-plus', 'janela: o foco continua no botão usado');
  await page.locator('.modal .chip', { hasText: 'Congelado' }).click(); await w();
  ok((await T('Bandido')).conds.includes('gelo') && await has('#cdm-gelo-plus'), 'janela: condição ligada aparece nas ativas');
  await page.locator('#cdm-gelo-x').click(); await w();
  ok(await ev(() => new Set(Array.from(document.querySelectorAll('[id]')).map(e => e.id)).size === document.querySelectorAll('[id]').length), 'nenhum id repetido na página com a janela aberta');
  ok(!(await T('Bandido')).conds.includes('gelo'), 'janela: o x tira a condição');
  await key('Escape');
  await clearToasts();
  // jogador: só o dono, com a permissão ligada
  await viewer('jg_dalmo'); await sel('Dain X');
  await page.locator('#s-cond .chip', { hasText: 'Envenenado' }).click(); await w();
  await page.locator('#cd-veneno-plus').click(); await w();
  ok((await T('Dain X')).cinfo.veneno.n === 1, 'jogador marca condição e contador no próprio token');
  await sel('Bandido');
  ok(!(await has('#cd-fogo-plus')) && await ev(() => document.querySelector('#s-cond .cact.ro') !== null), 'token alheio: condições só para ler, com os contadores à vista');
  await viewer('gm');
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.scn({ perms: Object.assign({}, u.Store.scene().perms, { condicoes: false }) })); });
  await viewer('jg_dalmo'); await sel('Dain X');
  ok(!(await has('#cd-veneno-plus')) && !(await has('#hud-cond')), 'sem a permissão, o jogador não mexe nem no próprio contador');
  await viewer('gm');
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.scn({ perms: Object.assign({}, u.Store.scene().perms, { condicoes: true }) })); });
  await sel('Dain X'); await page.locator('#cd-veneno-x').click(); await w();
  errs('condições');

  /* ============ 4. Turnos: faixa de vez, durações, aviso do que acabou ============ */
  await page.locator('#tab-turn').click(); await w();
  let sc = await SC();
  ok(sc.turn.on && sc.turn.round === 2 && (await T('Capitão')).cinfo.escudo.d === 3, 'exemplo: combate na rodada 2, proteção do Capitão dura 3');
  ok(await ev(() => document.getElementById('turnb').hidden), 'a faixa de vez não aparece sozinha ao abrir');
  await page.locator('#turnNext').click(); await w(200);
  let banner = await ev(() => ({ hidden: document.getElementById('turnb').hidden, text: document.getElementById('turnb').textContent }));
  ok(!banner.hidden && /Vez de Capitão/.test(banner.text) && /Protegido · 3 rodadas/.test(banner.text), 'faixa: "Vez de Capitão" com a condição e a duração — ' + banner.text);
  ok((await T('Capitão')).cinfo.escudo.d === 3, 'a duração só desconta quando o token termina a vez');
  await page.locator('#turnNext').click(); await w(200);
  ok((await T('Capitão')).cinfo.escudo.d === 2, 'Capitão terminou a vez: 3 → 2');
  ok(/Vez de Astie/.test(await ev(() => document.getElementById('turnb').textContent)), 'faixa acompanha a vez');
  await page.locator('#turnPrev').click(); await w(200);
  await page.locator('#turnNext').click(); await w(200);
  ok((await T('Capitão')).cinfo.escudo.d === 2, 'voltar e avançar não desconta duas vezes');
  await page.locator('.turnb-x').click(); await w();
  ok(await ev(() => document.getElementById('turnb').hidden), 'a faixa fecha no x');
  // Bandido: vez dele com o contador à vista
  await page.locator('#turnNext').click(); await w(200);
  banner = await ev(() => document.getElementById('turnb').textContent);
  ok(/Vez de Bandido/.test(banner) && /Queimando 2/.test(banner) && /Sangrando 1/.test(banner), 'faixa lembra os contadores de quem vai jogar — ' + banner);
  ok((await T('Bandido')).cinfo.fogo.n === 2, 'o contador não muda sozinho na troca de vez');
  // duas rodadas inteiras à frente: a proteção do Capitão acaba
  await ev(() => { for (let i = 0; i < 9; i++) __urgm.Act.turnStep(1); }); await w(200);
  ok((await T('Capitão')).cinfo.escudo.d === 1, 'mais uma vez do Capitão: 2 → 1');
  await ev(() => { __urgm.Act.turnStep(1); }); await w(200);
  sc = await SC();
  ok(sc.turn.list.find(e => e.id === sc.turn.cur).name === 'Capitão', 'de volta à vez do Capitão');
  await clearToasts();
  await page.locator('#turnNext').click(); await w(200);
  ok(!(await T('Capitão')).conds.includes('escudo') && (await toastTexts()).some(x => x === 'Acabou: Protegido em Capitão.'), 'a proteção acaba e a mesa avisa: ' + JSON.stringify(await toastTexts()));
  await page.locator('.toast-a', { hasText: 'Desfazer' }).click(); await w(200);
  ok((await T('Capitão')).cinfo.escudo.d === 1 && (await T('Capitão')).conds.includes('escudo'), 'desfazer devolve a condição que tinha acabado');
  // jogador não fica sabendo da vez de quem ele não vê
  await ev(() => { const u = __urgm, sc = u.Store.scene(); u.Act.turnAdd([sc.tokens.find(t => t.name === 'Arqueira')]); u.Act.turnPatch(x => { x.cur = x.list[x.list.length - 2].id; }); });
  await w(200);
  await viewer('jg_dalmo');
  await ev(() => { __urgm.Act.turnStep(1); }); await w(200);
  ok(await ev(() => document.getElementById('turnb').hidden), 'jogador: a faixa não anuncia a vez de um token oculto');
  await viewer('gm');
  await ev(() => { const u = __urgm; u.Act.turnPatch(x => { x.list = x.list.filter(e => e.name !== 'Arqueira'); x.cur = x.list[0].id; x.back = 0; }); }); await w(200);
  await clearToasts();
  errs('turnos');

  /* ============ 5. Efeitos com duração e dano em área ============ */
  await page.locator('#tab-sel').click(); await w();
  await ev(() => { const u = __urgm; Object.assign(u.App.opt, { fx: 'fogo', fxShape: 'circ', fxR: 2.5, fxAttach: false }); });
  await key('e');
  await fillTab('o-fxdur', 2);
  ok(await ev(() => __urgm.App.opt.fxDur) === 2, 'opção de duração da ferramenta de efeito');
  await click(14.5, 11);
  sc = await SC();
  let fx = sc.effects[sc.effects.length - 1];
  ok(fx.fx === 'fogo' && fx.dur === 2 && fx.dur0 === 2 && fx.at === sc.turn.cur, 'efeito criado com 2 rodadas, ancorado em quem está jogando');
  ok(await page.locator('#fx-dur').inputValue() === '2', 'painel mostra a duração');
  await fillTab('fx-dur', 3);
  sc = await SC(); fx = sc.effects[sc.effects.length - 1];
  ok(fx.dur === 3 && fx.dur0 === 3, 'duração editada no painel');
  const hpA = (await T('Bandido')).bars[0].v, hpB = (await T('Bandida')).bars[0].v;
  await page.locator('#fx-apply').click(); await w();
  let rows = await ev(() => Array.from(document.querySelectorAll('.area-row')).map(r => [r.querySelector('.area-n').textContent, r.querySelector('.area-res').textContent]));
  ok(rows.length === 2 && rows[0][0] === 'Bandido' && rows[1][0] === 'Bandida', 'janela lista quem está dentro do efeito: ' + JSON.stringify(rows));
  ok(await ev(() => document.activeElement.id) === 'ar-amt', 'o foco começa no campo "Quanto"');
  await page.locator('#ar-amt').fill('12'); await w();
  await page.locator('#ar-half-1').click(); await w();
  rows = await ev(() => Array.from(document.querySelectorAll('.area-res')).map(r => r.textContent));
  ok(rows[0] === `${hpA} → ${Math.max(0, hpA - 12)}` && rows[1] === `${hpB} → ${hpB - 6}`, 'prévia do resultado, com a metade: ' + JSON.stringify(rows));
  ok(await page.locator('#ar-cn').isDisabled(), 'contador e rodadas só ligam com uma condição escolhida');
  await page.locator('#ar-cond').selectOption('gelo'); await page.locator('#ar-cn').fill('2'); await page.locator('#ar-cd').fill('3');
  await ev(() => { __urgm.App.floats.length = 0; });
  await page.locator('.modal .btn.primary').click(); await w(200);
  let ba = await T('Bandido'), bb = await T('Bandida');
  ok(ba.bars[0].v === Math.max(0, hpA - 12) && bb.bars[0].v === hpB - 6, `dano inteiro e metade (${ba.bars[0].v}, ${bb.bars[0].v})`);
  ok(ba.conds.includes('gelo') && ba.cinfo.gelo.n === 2 && ba.cinfo.gelo.d === 3 && bb.cinfo.gelo.n === 2, 'condição aplicada com contador e duração');
  ok(await ev(() => __urgm.App.floats.map(f => f.text).join()) === `Vida −${Math.min(12, hpA)},Vida −6`, 'números de dano sobem dos dois tokens, com o nome da barra: ' + await ev(() => __urgm.App.floats.map(f => f.text).join()));
  ok(await page.locator('#toasts .toast').count() >= 1 && await page.locator('#toastsTop .toast').count() === 0 && (await toastTexts()).some(x => x === 'Aplicado em 2 tokens.'), 'aviso no lugar de sempre depois que a janela fecha');
  await page.locator('.toast-a', { hasText: 'Desfazer' }).click(); await w(200);
  ba = await T('Bandido'); bb = await T('Bandida');
  ok(ba.bars[0].v === hpA && bb.bars[0].v === hpB && !ba.conds.includes('gelo') && !bb.conds.includes('gelo'), 'um desfazer devolve barras e condições dos dois');
  await clearToasts();
  // validações: a janela não fecha com entrada errada
  await page.locator('#fx-apply').click(); await w();
  await page.locator('#ar-amt').fill('abc'); await page.locator('.modal .btn.primary').click(); await w();
  ok(await has('.modal') && (await toastTexts()).some(x => /digite um número/.test(x)) && await page.locator('#toastsTop .toast').count() === 1, 'valor inválido: avisa por cima da janela e não fecha');
  await page.locator('#ar-amt').fill(''); await page.locator('.modal .btn.primary').click(); await w();
  ok(await has('.modal') && (await toastTexts()).some(x => /escolha uma condição/.test(x)), 'nada para aplicar: avisa e não fecha');
  await page.locator('.area-bar .btn', { hasText: 'Nenhum' }).click(); await page.locator('#ar-amt').fill('5'); await page.locator('.modal .btn.primary').click(); await w();
  ok(await has('.modal') && (await toastTexts()).some(x => /Marque pelo menos um token/.test(x)), 'ninguém marcado: avisa e não fecha');
  ok(await ev(() => document.querySelector('.area-count').textContent) === '0 de 2 marcados' && await page.locator('#ar-half-0').isDisabled(), 'contagem de marcados; ½ desligado para quem ficou de fora');
  await key('Escape'); await clearToasts();
  ok((await T('Bandido')).bars[0].v === hpA, 'fechar a janela não aplica nada');
  // o efeito perde rodadas na ordem de turnos e some no fim
  sc = await SC();
  const nFx = sc.effects.length, steps = sc.turn.list.length;
  await ev(k => { for (let i = 0; i < k * 2; i++) __urgm.Act.turnStep(1); }, steps); await w(200);
  sc = await SC();
  ok(sc.effects.length === nFx && sc.effects[sc.effects.length - 1].dur === 1, 'duas voltas completas: 3 → 1');
  await page.locator('#tab-turn').click(); await w();
  await ev(k => { for (let i = 0; i < k - 1; i++) __urgm.Act.turnStep(1); }, steps); await w(200);
  await clearToasts();
  await page.locator('#turnNext').click(); await w(200);
  sc = await SC();
  ok(sc.effects.length === nFx - 1 && (await toastTexts()).some(x => /Acabou: .*efeito Fogo/.test(x)), 'na terceira volta o efeito some e a mesa avisa: ' + JSON.stringify(await toastTexts()));
  await page.locator('#tab-sel').click(); await w(); await clearToasts();
  errs('efeitos e área');

  // aura: quem está dentro, com o dono da aura de fora por padrão
  await sel('Dain X');
  const hp = { a: (await T('Astie')).bars[0].v, k: (await T('Kairo')).bars[0].v, d: (await T('Dain X')).bars[0].v };
  await ev(() => __urgm.Store.tx('x', () => { const u = __urgm, sc = u.Store.scene(); for (const n of ['Astie', 'Kairo']) { const tk = sc.tokens.find(t => t.name === n); u.Store.upd('tokens', tk.id, { bars: tk.bars.map((b, i) => (i === 0 ? Object.assign({}, b, { v: b.v - 10 }) : b)) }); } })); await w();
  await page.locator('#au0-apply').click(); await w();
  rows = await ev(() => Array.from(document.querySelectorAll('.area-row')).map((r, i) => [r.querySelector('.area-n').textContent, document.getElementById('ar-on-' + i).checked]));
  ok(rows.length === 3 && rows.find(r => r[0] === 'Dain X')[1] === false && rows.filter(r => r[1]).map(r => r[0]).sort().join() === 'Astie,Kairo', 'aura: lista quem está dentro e deixa o dono desmarcado — ' + JSON.stringify(rows));
  await page.locator('#ar-amt').fill('+5'); await key('Enter'); await w(200);
  ok((await T('Astie')).bars[0].v === hp.a - 5 && (await T('Kairo')).bars[0].v === hp.k - 5 && (await T('Dain X')).bars[0].v === hp.d, 'cura com +: Enter aplica; o dono da aura não muda');
  await clearToasts();
  errs('aura');

  // vários tokens selecionados
  await selMany(['Astie', 'Kairo']);
  ok(await ev(() => Array.from(document.querySelectorAll('#mt-bar option')).map(o => o.value).join()) === 'Vida,SP', 'vários tokens: as barras são escolhidas pelo nome');
  await page.locator('#mt-bar').selectOption('SP'); await page.locator('#mt-amt').fill('2'); await page.locator('#mt-amt').press('Enter'); await w();
  ok((await T('Astie')).bars[1].v === 28 && (await T('Kairo')).bars[1].v === 10, 'vários tokens: subtrai da barra escolhida');
  await page.locator('#mt-area').click(); await w();
  ok(await ev(() => document.querySelector('.modal-t').textContent) === 'Aplicar a 2 tokens' && await page.locator('.area-row').count() === 2, 'vários tokens: janela com metade e condição');
  await key('Escape');
  errs('vários tokens');

  /* ============ 6. Mira ============ */
  await page.locator('#mt-mira').click(); await w();
  sc = await SC();
  ok(sc.targets.length === 2 && sc.targets.every(x => x.by === 'gm'), 'mirar nos selecionados');
  await page.locator('#mt-mira').click(); await w();
  ok((await SC()).targets.length === 0, 'de novo, tira a mira');
  await ev(() => __urgm.setSel([])); await w();
  await hover(15.5, 12.5); await key('a');
  sc = await SC();
  const bandida = await T('Bandida');
  ok(sc.targets.length === 1 && sc.targets[0].t === bandida.id, 'tecla A mira no token sob o cursor');
  await key('a');
  ok((await SC()).targets.length === 0, 'tecla A de novo tira a mira');
  await hover(2.5, 18.5); await key('a');
  ok((await toastTexts()).some(x => /Para mirar, passe o mouse/.test(x)), 'tecla A no vazio explica o que fazer');
  await clearToasts();
  await sel('Capitão'); await page.locator('#hud-mira').click(); await w();
  ok((await SC()).targets.length === 1 && await ev(() => document.getElementById('hud-mira').classList.contains('on')), 'botão de mira na faixa');
  const [mx, my] = await pt(15.5, 12.5);
  await page.mouse.click(mx, my, { button: 'right' }); await w(150);
  ok(await has('.menu-i:has-text("Mirar")'), 'menu do botão direito tem "Mirar"');
  await page.locator('.menu-i', { hasText: 'Mirar' }).click(); await w();
  ok((await SC()).targets.length === 2, 'mira pelo menu');
  await ev(() => __urgm.Act.turnStep(1)); await w();
  ok((await SC()).targets.length === 0, 'passar a vez limpa as miras');
  await viewer('jg_dalmo'); await sel('Bandido');
  await page.locator('#tk-mira').click(); await w();
  sc = await SC();
  ok(sc.targets.length === 1 && sc.targets[0].by === 'jg_dalmo' && await ev(() => document.getElementById('tk-mira').textContent) === 'Tirar a mira', 'jogador mira num token alheio pelo painel');
  await viewer('gm');
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.scn({ perms: Object.assign({}, u.Store.scene().perms, { mira: false }) })); });
  await viewer('jg_dalmo'); await sel('Bandido');
  ok(!(await has('#tk-mira')) && !(await has('#hud-mira')), 'sem a permissão, o jogador não tem botão de mira');
  await hover(15.5, 12.5); await key('a');
  ok((await SC()).targets.length === 1, '… e a tecla A não faz nada');
  await viewer('gm');
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.scn({ targets: [], perms: Object.assign({}, u.Store.scene().perms, { mira: true }) })); });
  errs('mira');

  /* ============ 7. Números flutuantes: só para quem vê os números ============ */
  const floatsAfter = async (name, i, txt) => ev(([name, i, txt]) => { const u = __urgm, tk = u.Store.scene().tokens.find(t => t.name === name); u.App.floats.length = 0; u.Act.barSet(tk, i, txt); return u.App.floats.map(f => f.text).join(); }, [name, i, txt]);
  ok(await floatsAfter('Bandido', 0, '+1') === 'Vida +1', 'mestre vê o número em qualquer token, com o nome da barra');
  ok(await floatsAfter('Dain X', 1, '-4') === 'SP −4', 'toda barra leva o nome junto, na frente do número');
  await ev(() => { const u = __urgm, tk = u.Store.scene().tokens.find(t => t.name === 'Bandido'); u.App.floats.length = 0; u.Act.barPatch(tk, 0, { m: 40 }); });
  ok(await ev(() => __urgm.App.floats.length) === 0, 'mudar o máximo não gera número');
  await ev(() => { __urgm.App.floats.length = 0; __urgm.Tools.undo(); __urgm.Tools.undo(); });
  ok(await ev(() => __urgm.App.floats.length) === 0, 'desfazer não gera número');
  await viewer('jg_dalmo');
  ok(await floatsAfter('Bandido', 0, '-1') === '', 'jogador não vê o número de uma barra que ele só vê em proporção');
  ok(await floatsAfter('Dain X', 0, '-2') === 'Vida −2', 'jogador vê o número no próprio token');
  await viewer('gm'); await clearToasts();
  errs('números flutuantes');

  /* ============ 8. Paredes especiais e sala ============ */
  await page.locator('#tab-sel').click(); await w();
  const nWalls0 = (await SC()).walls.length;
  await key('w');
  ok(await page.locator('#o-wk .seg-b').count() === 5 && await page.locator('#o-wm .seg-b').count() === 2, 'opções: 5 tipos de parede e 2 modos');
  await segClick('o-wk', 'Janela');
  await click(3, 16); await click(6, 16); await key('Enter');
  await segClick('o-wk', 'Cortina');
  await click(3, 17); await click(6, 17); await key('Enter');
  await segClick('o-wk', 'Secreta');
  await click(3, 18); await click(6, 18);
  sc = await SC();
  let nw = sc.walls.slice(nWalls0);
  ok(nw.length === 3 && nw[0].k === 'window' && nw[1].k === 'veil' && nw[2].k === 'door' && nw[2].secret === true, 'janela, cortina e porta secreta criadas: ' + JSON.stringify(nw.map(x => [x.k, !!x.secret])));
  await segClick('o-wm', 'Sala');
  ok(await ev(() => __urgm.App.opt.wallKind) === 'wall' && /quatro paredes/.test(await ev(() => document.getElementById('hint').textContent)), 'modo sala: troca porta por parede e muda a dica');
  await drag(8, 15, 11, 18);
  sc = await SC();
  nw = sc.walls.slice(nWalls0 + 3);
  ok(nw.length === 4 && nw.every(x => x.k === 'wall'), 'sala: quatro paredes de uma vez');
  const xs = nw.flatMap(x => [x.x1, x.x2]), ys = nw.flatMap(x => [x.y1, x.y2]);
  ok(Math.min(...xs) === 8 * 64 && Math.max(...xs) === 11 * 64 && Math.min(...ys) === 15 * 64 && Math.max(...ys) === 18 * 64, 'sala no retângulo arrastado');
  await undo();
  ok((await SC()).walls.length === nWalls0 + 3, 'um desfazer tira a sala inteira');
  await segClick('o-wk', 'Porta');
  ok(await ev(() => __urgm.App.opt.wallMode) === 'line', 'escolher porta volta ao modo trecho');
  // painel de uma porta secreta
  await click(4.5, 18);
  ok(await ev(() => document.querySelector('.p-title').textContent) === 'Porta secreta' && await has('#wl-reveal') && !(await has('#wl-open')), 'painel da porta secreta: revelar, sem "aberta"');
  await segClick('wl-k', 'Janela');
  sc = await SC();
  ok(sc.walls[nWalls0 + 2].k === 'window' && !sc.walls[nWalls0 + 2].secret, 'trocar o tipo pelo painel limpa o "secreta"');
  await segClick('wl-k', 'Secreta');
  await key('v'); await clearToasts();
  errs('paredes');

  // o que cada tipo barra, na prática: um corredor de teste numa cena nova
  await ev(() => {
    const u = __urgm, S = u.Store;
    const base = JSON.parse(JSON.stringify(S.scene()));
    const tok = JSON.parse(JSON.stringify(base.tokens.find(t => t.name === 'Dain X')));
    const sc = Object.assign(base, { id: 'cena_teste', name: 'Teste', sample: false, cols: 12, rows: 6, tokens: [], shapes: [], walls: [], lights: [], effects: [], fogOps: [], explored: {}, targets: [], light: 'claro', tone: 'dia', weather: { k: '', pow: 0.6 } });
    sc.bg = { asset: null, stretch: false, dx: 0, dy: 0, scale: 1 };
    sc.fog = { dynamic: true, manual: false, explored: false, shared: true };
    sc.perms = Object.assign({}, sc.perms, { portas: true, mover: true });
    sc.turn = { on: false, round: 1, cur: null, list: [] };
    Object.assign(tok, { id: 'tk_teste', x: 2 * 64, y: 2 * 64, auras: [] });
    sc.tokens.push(tok);
    // parede de cima a baixo em x = 5, com o trecho do meio (y de 2 a 3) trocável
    sc.walls.push({ id: 'w_a', k: 'wall', x1: 320, y1: 0, x2: 320, y2: 128, open: false, locked: false }, { id: 'w_b', k: 'wall', x1: 320, y1: 192, x2: 320, y2: 384, open: false, locked: false },
      { id: 'w_mid', k: 'wall', x1: 320, y1: 128, x2: 320, y2: 192, open: false, locked: false, secret: false });
    S.addScene(sc); u.UI.switchScene(sc.id);
  });
  await w(400);
  const setMid = async p => { await ev(p => { const u = __urgm; u.Store.tx('x', () => u.Store.upd('walls', 'w_mid', p)); }, p); await w(150); };
  const seesBeyond = async () => ev(() => { const u = __urgm; u.Vision.update(u.Store.scene(), u.App.viewer); return u.Vision.canSee(8.5 * 64, 2.5 * 64); });
  const home = async () => { await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.upd('tokens', 'tk_teste', { x: 128, y: 128 })); }); await w(120); };
  const tryCross = async () => { await drag(2.5, 2.5, 7.5, 2.5); return (await ev(() => __urgm.Store.get('tokens', 'tk_teste').x)) > 320; };
  await viewer('jg_dalmo');
  const table = {};
  for (const [name, p] of [['parede', { k: 'wall', secret: false, open: false }], ['janela', { k: 'window', secret: false, open: false }], ['cortina', { k: 'veil', secret: false, open: false }], ['porta fechada', { k: 'door', secret: false, open: false }], ['porta aberta', { k: 'door', secret: false, open: true }], ['porta secreta', { k: 'door', secret: true, open: false }]]) {
    await home(); await setMid(p);
    table[name] = [await seesBeyond(), await tryCross()];
    await clearToasts();
  }
  ok(JSON.stringify(table) === JSON.stringify({ parede: [false, false], janela: [true, false], cortina: [false, true], 'porta fechada': [false, false], 'porta aberta': [true, true], 'porta secreta': [false, false] }), 'jogador: [enxerga além, atravessa] por tipo — ' + JSON.stringify(table));
  // porta secreta: o jogador não acha o ícone; o mestre abre e revela
  await setMid({ k: 'door', secret: true, open: false });
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.upd('tokens', 'tk_teste', { x: 3 * 64, y: 2 * 64 })); }); await w(150);
  await click(5, 2.5);
  ok(!(await ev(() => __urgm.Store.get('walls', 'w_mid').open)), 'jogador clica onde estaria o ícone da porta secreta e nada acontece');
  await viewer('gm');
  await click(5, 2.5);
  const mid = await ev(() => JSON.parse(JSON.stringify(__urgm.Store.get('walls', 'w_mid'))));
  ok(mid.open && !mid.secret && (await toastTexts()).some(x => /secreta revelada/.test(x)), 'mestre clica no ícone: a porta se revela e abre');
  await viewer('jg_dalmo');
  await click(5, 2.5);
  ok(!(await ev(() => __urgm.Store.get('walls', 'w_mid').open)), 'revelada, o jogador com permissão fecha e abre a porta');
  await viewer('gm'); await clearToasts();
  errs('tipos de parede na prática');

  /* ============ 9. Hora do dia, clima e véu da visão ============ */
  await page.locator('#tab-scene').click(); await w();
  for (const [label, tone, light] of [['Noite', 'noite', 'penumbra'], ['Breu', 'breu', 'escuro'], ['Entardecer', 'entardecer', 'claro'], ['Dia', 'dia', 'claro']]) {
    await segClick('sc-tone', label);
    sc = await SC();
    ok(sc.tone === tone && sc.light === light, `hora do dia ${label}: tom ${sc.tone}, luz ${sc.light}`);
  }
  await segClick('sc-tone', 'Noite'); await segClick('sc-light', 'Claro');
  sc = await SC();
  ok(sc.tone === 'noite' && sc.light === 'claro', 'a luz ambiente continua ajustável depois de escolher a hora');
  await undo(); await undo();
  ok((await SC()).tone === 'dia', 'desfazer volta a hora do dia');
  for (const k of ['chuva', 'neve', 'neblina', 'cinzas', 'vagalumes']) {
    await page.locator('#sc-wk').selectOption(k); await w(260);
    ok((await SC()).weather.k === k && await has('#sc-wp'), `clima ${k} com controle de intensidade`);
  }
  await ev(() => { const el = document.getElementById('sc-wp'); el.value = 1; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }); await w();
  ok((await SC()).weather.pow === 1, 'intensidade do clima');
  ok(await ev(() => { const u = __urgm; const d0 = u.Vision.isDirty(); u.Store.tx('x', () => u.Store.scn({ weather: { k: 'chuva', pow: 0.5 } })); return !d0 && !u.Vision.isDirty(); }), 'mudar o clima não refaz o cálculo de visão');
  await page.locator('#sc-wk').selectOption(''); await w();
  ok(!(await has('#sc-wp')) && (await SC()).weather.k === '', 'sem clima, some o controle de intensidade');
  ok(await ev(() => __urgm.Vision.out.veil === null), 'véu da visão dos jogadores desligado por padrão');
  await sw('sc-showvis'); await w(200);
  ok(await ev(() => { const u = __urgm; u.Vision.update(u.Store.scene(), u.App.viewer); return !!u.Vision.out.veil && u.Vision.out.veilOf === '*'; }) && await ev(() => __urgm.Store.S.prefs.showVision) === true, 'véu da visão: ligado, mostra a visão do grupo de jogadores, e a escolha fica salva');
  await viewer('jg_dalmo');
  ok(await ev(() => { const u = __urgm; u.Vision.update(u.Store.scene(), u.App.viewer); return u.Vision.out.veil === null; }), 'jogador nunca recebe o véu');
  await viewer('gm');
  errs('ambiente');

  /* ============ 10. Recarregar: tudo continua salvo ============ */
  await ev(() => { __urgm.Vision.flushExplored(); return __urgm.Persist.flush(); }); await w(300);
  await page.reload({ waitUntil: 'load' }); await w(900);
  prefs = await ev(() => JSON.parse(JSON.stringify(__urgm.Store.S.prefs)));
  ok(prefs.barDefaults && prefs.barDefaults.length === 4 && prefs.showVision === true && await ev(() => __urgm.App.showVision) === true, 'depois de recarregar: barras padrão e véu da visão continuam');
  ok(await ev(() => __urgm.Store.scene().id) === 'cena_teste' && await ev(() => __urgm.Store.S.order.length) === 2, 'as duas cenas continuam lá');
  await ev(() => __urgm.UI.switchScene(__urgm.Store.S.order[0])); await w(300);
  b1 = await T('Bandido');
  ok(b1.cinfo.fogo && b1.cinfo.fogo.n === 2 && b1.cinfo.sangue.n === 1, 'contadores salvos: ' + JSON.stringify(b1.cinfo));
  sc = await SC();
  ok(sc.walls.some(x => x.k === 'window') && sc.walls.some(x => x.k === 'veil') && sc.walls.some(x => x.k === 'door' && x.secret), 'paredes especiais salvas');
  ok(!(await ev(() => __urgm.Tour.active())), 'com ?debug o tutorial não abre sozinho');
  errs('recarregar');

  console.log(fails ? `\n${fails} falha(s) em ${n} verificações` : `\n${n} verificações passaram`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
