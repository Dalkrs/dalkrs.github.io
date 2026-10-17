// Bateria do lote 5 (parte 1, a Cena), no navegador:
//   · o token do jogador para na parede enquanto é arrastado (e a visão nunca passa para o outro lado);
//   · a faixa de iniciativa de um grupo (uma linha só, rolada uma vez; empate: o jogador vai antes);
//   · a marca "esperando para reagir" na ordem de turnos;
//   · sobrevida para vários tokens de uma vez (fica a maior) e o escudinho sempre à vista;
//   · as condições novas, separadas por categoria;
//   · os números do token (Força, Canalização, Defesas, Esquiva) ao apontar ou escolher;
//   · Sanidade e Conforto no token, só para o mestre;
//   · a tecla K (ataque com defesa);
//   · objetos de cenário (luzes que tremulam, móveis, natureza, perigos), zonas de efeito novas e o aviso do
//     mestre no começo da vez de quem está dentro de uma zona;
//   · a plataforma de madeira desenhada como tábuas.
const path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = path.join(__dirname, 'v5');
require('fs').mkdirSync(SHOTS, { recursive: true });

(async () => {
  const t = await open({});
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const T = name => ev(nm => JSON.parse(JSON.stringify(__tc.Store.scene().tokens.find(x => x.name === nm) || null)), name);
  const tela = async (x, y) => { const box = await page.locator('#cv').boundingBox(), p = await ev(([x, y]) => __tc.Render.toScreen(x, y), [x, y]); return [box.x + p[0], box.y + p[1]]; };
  const quadro = () => ev(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

  // ================= o token para na parede =================
  const C = await ev(() => {
    const u = __tc, sc = u.newScene('Paredes'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
    u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }];
    u.Store.tx('prep', () => {
      u.Store.scn({ cols: 16, rows: 10, fog: { dynamic: true, manual: false, explored: true, shared: true }, blockMove: true });
      // uma parede de cima a baixo na coluna 6 (sem porta): do outro lado, nada pode aparecer
      u.Store.add('walls', { id: 'w1', k: 'wall', x1: 6 * sc.cell, y1: 0, x2: 6 * sc.cell, y2: 10 * sc.cell, open: false, locked: false, secret: false });
      u.Store.add('tokens', u.newToken(sc, 2 * sc.cell, 4 * sc.cell, { name: 'Ana', owner: 'p1' }));
    });
    u.Render.fit();
    return sc.cell;
  });
  await w(300);
  await ev(() => { __tc.App.viewer = 'p1'; __tc.Vision.invalidate(); __tc.Render.request(); }); await w(300);
  ok(await ev(([x, y]) => __tc.Vision.covered(x, y), [9.5 * C, 4.5 * C]) === true, '(do outro lado da parede, o jogador começa sem ver nada)');
  {
    await ev(id => __tc.setSel([{ c: 'tokens', id }]), (await T('Ana')).id); await w(200);   // (a faixa de cima pode mudar o mapa de lugar)
    const a = await tela(2.5 * C, 4.5 * C), b = await tela(10.5 * C, 4.5 * C);
    await page.mouse.move(a[0], a[1]); await page.mouse.down();
    let passou = false, maxX = 0;
    for (let i = 1; i <= 16; i++) {
      await page.mouse.move(a[0] + (b[0] - a[0]) * i / 16, a[1] + (b[1] - a[1]) * i / 16); await quadro();
      const k = await T('Ana'); maxX = Math.max(maxX, k.x);
      if (k.x + C / 2 > 6 * C) passou = true;
      if (await ev(([x, y]) => __tc.Vision.covered(x, y), [9.5 * C, 4.5 * C]) === false) passou = true;
    }
    ok(!passou && maxX === 5 * C, 'arrastando para além da parede, o token anda até o último quadrado antes dela e para ali — nem por um instante passa, nem a visão: ' + maxX / C);
    await page.mouse.move(b[0], b[1] - 60); await quadro();
    ok((await T('Ana')).x === 5 * C, 'com o mouse do outro lado, ele continua parado na parede');
    await page.mouse.up(); await w(250);
    ok((await T('Ana')).x === 5 * C && await ev(([x, y]) => __tc.Vision.covered(x, y), [9.5 * C, 4.5 * C]) === true && !/parede no caminho/.test(await toasts()),
      'ao soltar, ele fica junto da parede, sem aviso de erro, e o outro lado continua coberto');
    await ev(() => __tc.Tools.undo()); await w(200);
    ok((await T('Ana')).x === 2 * C, 'Desfazer devolve o token ao ponto de partida');
  }
  // contornando: com uma porta aberta na parede, o arrasto passa por ela
  await ev(() => { const u = __tc, sc = u.Store.scene(); u.Store.tx('porta', () => { u.Store.upd('walls', 'w1', { y2: 4 * sc.cell }); u.Store.add('walls', { id: 'w2', k: 'door', x1: 6 * sc.cell, y1: 4 * sc.cell, x2: 6 * sc.cell, y2: 5 * sc.cell, open: true, locked: false, secret: false }); u.Store.add('walls', { id: 'w3', k: 'wall', x1: 6 * sc.cell, y1: 5 * sc.cell, x2: 6 * sc.cell, y2: 10 * sc.cell, open: false, locked: false, secret: false }); }); });
  {
    const a = await tela(2.5 * C, 4.5 * C), b = await tela(9.5 * C, 4.5 * C);
    await page.mouse.move(a[0], a[1]); await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(a[0] + (b[0] - a[0]) * i / 10, a[1] + (b[1] - a[1]) * i / 10); await quadro(); }
    await page.mouse.up(); await w(250);
    ok((await T('Ana')).x === 9 * C, 'pela porta aberta, o token passa: ' + (await T('Ana')).x / C);
  }
  // o mestre não é barrado
  await ev(() => { __tc.App.viewer = 'gm'; __tc.Store.tx('fecha', () => __tc.Store.upd('walls', 'w2', { open: false })); }); await w(200);
  {
    const a = await tela(9.5 * C, 4.5 * C), b = await tela(3.5 * C, 4.5 * C);
    await page.mouse.move(a[0], a[1]); await page.mouse.down();
    for (let i = 1; i <= 8; i++) { await page.mouse.move(a[0] + (b[0] - a[0]) * i / 8, a[1] + (b[1] - a[1]) * i / 8); await quadro(); }
    await page.mouse.up(); await w(250);
    ok((await T('Ana')).x === 3 * C, 'o mestre arrasta através da parede, como sempre');
  }

  // ================= a faixa de iniciativa de um grupo =================
  const ids = await ev(() => {
    const u = __tc, sc = u.newScene('Turnos'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
    u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }];
    const o = {};
    u.Store.tx('prep', () => {
      const mk = (name, x, y, extra) => { const k = u.newToken(sc, x * sc.cell, y * sc.cell, Object.assign({ name }, extra)); u.Store.add('tokens', k); o[name] = k.id; };
      mk('Ana', 2, 2, { owner: 'p1', ini: 3 });
      mk('Lobo', 4, 2, { ini: 2 });
      mk('Goblin 1', 6, 5, { ini: 1 }); mk('Goblin 2', 7, 5, { ini: 5 }); mk('Goblin 3', 8, 5, { ini: 2 });
    });
    u.Render.fit(); u.UI.openTab('turn');
    return o;
  });
  await w(250);
  const ordem = () => ev(() => __tc.Store.scene().turn.list.map(e => JSON.parse(JSON.stringify(e))));
  const nomeDe = await ev(() => { const o = {}; for (const k of __tc.Store.scene().tokens) o[k.id] = k.name; return o; });
  ok(await page.locator('#turnBand').isDisabled(), 'sem tokens selecionados, o botão "Faixa de grupo" fica apagado');
  await ev(g => { __tc.setSel(g.map(id => ({ c: 'tokens', id }))); __tc.UI.openTab('turn'); }, [ids['Goblin 1'], ids['Goblin 2'], ids['Goblin 3']]); await w(200);
  await page.locator('#turnBand').click(); await w(200);
  ok(await page.locator('.modal h2').innerText() === 'Faixa de iniciativa do grupo' && await page.locator('#dlg-in').inputValue() === 'Goblin' && await page.locator('#bd-ini').inputValue() === '5' && await page.locator('#bd-list .band-m input:checked').count() === 3,
    'a janela da faixa já vem com o nome em comum ("Goblin"), a maior iniciativa deles (5) e os três marcados');
  await page.locator('#bd-ini').fill('4');
  await page.locator('.modal .btn', { hasText: 'Criar a faixa' }).click(); await w(200);
  let L = await ordem();
  ok(L.length === 1 && L[0].token === null && L[0].name === 'Goblin' && L[0].bonus === 4 && JSON.stringify(L[0].toks) === JSON.stringify([ids['Goblin 1'], ids['Goblin 2'], ids['Goblin 3']]) && L[0].init === null,
    'a faixa entra na ordem como uma linha só, com os três tokens: ' + JSON.stringify(L));
  ok(/Faixa "Goblin" na ordem: 3 tokens, 1d20 \+ 4/.test(await toasts()), 'e a mesa avisa, com Desfazer: ' + await toasts());
  ok(await page.locator(`#tl-${L[0].id} .band-av .av`).count() === 3 && /grupo · 3/.test(await page.locator(`#tl-${L[0].id}`).innerText()), 'na lista, a linha mostra os três rostos e "grupo · 3"');
  await clearToasts();
  await ev(() => { __tc.setSel([]); }); await w(100);
  await ev(g => { __tc.setSel([{ c: 'tokens', id: g }]); __tc.UI.openTab('turn'); }, ids['Goblin 2']); await w(150);
  await page.locator('#side .btn', { hasText: 'Adicionar 1 selecionado' }).click(); await w(150);
  ok((await ordem()).length === 1 && /Ele já está na ordem/.test(await toasts()), 'quem está numa faixa não ganha outra linha ("Ele já está na ordem")');
  await ev(a => { const u = __tc; u.Act.turnAdd([u.Store.get('tokens', a[0]), u.Store.get('tokens', a[1])]); }, [ids.Ana, ids.Lobo]); await w(150);
  // o empate com a faixa: o jogador vai antes, mesmo com o bônus menor
  const banda = (await ordem()).find(e => e.toks).id;
  await ev(([b, a, l]) => { const u = __tc; u.Act.turnPatch(x => { for (const e of x.list) e.init = e.id === b ? 12 : e.token === a ? 12 : 15; u.turnSort(x.list); }, 'ini'); }, [banda, ids.Ana, ids.Lobo]);
  ok(JSON.stringify((await ordem()).map(e => e.token ? nomeDe[e.token] : e.name)) === '["Lobo","Ana","Goblin"]', 'ordenando: quem tirou mais vai antes; Ana empata com a faixa (12 a 12) e joga antes do grupo: ' + JSON.stringify((await ordem()).map(e => e.token ? nomeDe[e.token] : e.name)));
  // a rolagem da faixa: uma só, 1d20 + 4
  const rol = await ev(b => { const u = __tc, out = []; for (let i = 0; i < 30; i++) { const r = u.Act.turnRoll([b]); out.push(r.length === 1 && r[0].bonus === 4 && r[0].total === r[0].d + 4 && r[0].name === 'Goblin'); } return out.every(Boolean); }, banda);
  ok(rol, 'a faixa rola uma vez só: 1d20 + 4, uma linha');
  // a faixa no meio da ordem (Lobo 15, faixa 14, Ana 12): a vez dela não coincide com a virada da rodada
  await ev(b => __tc.Act.turnPatch(x => { x.list.find(e => e.id === b).init = 14; x.list.find(e => e.id === b).roll = null; __tc.turnSort(x.list); }, 'ini'), banda);
  ok(JSON.stringify((await ordem()).map(e => e.token ? nomeDe[e.token] : e.name)) === '["Lobo","Goblin","Ana"]', '(a faixa com 14 fica entre o Lobo e a Ana)');
  // a vez da faixa: o aviso mostra o grupo; a duração das condições dos tokens dela desconta quando a faixa termina a vez
  await ev(g => { const u = __tc; u.Store.tx('cond', () => u.Store.upd('tokens', g, { conds: ['veneno'], cinfo: { veneno: { n: 0, d: 2, d0: 2 } } })); u.Act.turnPatch(x => { x.on = true; x.round = 1; x.back = 0; x.cur = x.list[0].id; }, 'Iniciar'); }, ids['Goblin 1']); await w(150);
  await ev(() => __tc.Act.turnStep(1)); await w(250);
  ok(await page.locator('#cine').isVisible() && /Vez de Goblin/.test(await page.locator('#cine').innerText()) && await page.locator('#cine .cine-av .av').count() === 3, 'na vez da faixa, o aviso (a faixa de cinema do mestre, lote 7) diz "Vez de Goblin", com os rostos do grupo');
  ok((await T('Goblin 1')).cinfo.veneno.d === 2, '(o veneno do Goblin 1 ainda não descontou: a faixa está jogando)');
  await ev(() => __tc.Act.turnStep(1)); await w(100);
  ok((await T('Goblin 1')).cinfo.veneno.d === 1, 'a faixa terminou a vez (passou para a Ana): o veneno do Goblin 1 desconta uma rodada');
  await ev(() => __tc.Act.turnStep(1)); await w(100);
  ok((await T('Goblin 1')).cinfo.veneno.d === 1 && await ev(() => __tc.Store.scene().turn.round) === 2, 'a virada da rodada não desconta de novo (ele está na ordem, pela faixa)');
  // mudar a faixa: tirar um, pôr outro
  await ev(() => __tc.UI.openTab('turn')); await w(150);
  await page.locator(`#tb-${banda}`).click(); await w(200);
  ok(await page.locator('.modal h2').innerText() === 'Faixa: Goblin' && await page.locator('#bd-list .band-m').count() === 3, 'o lápis da linha abre a faixa para mudar');
  await page.locator(`#bd-${ids['Goblin 3']}`).uncheck(); await page.locator('#bd-ini').fill('6');
  await page.locator('.modal .btn', { hasText: 'Salvar' }).click(); await w(200);
  L = await ordem();
  ok(JSON.stringify(L.find(e => e.id === banda).toks) === JSON.stringify([ids['Goblin 1'], ids['Goblin 2']]) && L.find(e => e.id === banda).bonus === 6 && !L.some(e => e.token === ids['Goblin 3']), 'o Goblin 3 sai da faixa (e da ordem); o bônus vira 6');
  await ev(g => { __tc.setSel([{ c: 'tokens', id: g }]); __tc.UI.openTab('turn'); }, ids['Goblin 3']); await w(150);
  await page.locator('#side .btn', { hasText: 'Adicionar 1 selecionado' }).click(); await w(150);
  ok((await ordem()).some(e => e.token === ids['Goblin 3']), 'sozinho, ele pode ganhar uma linha própria');
  await page.locator(`#tb-${banda}`).click(); await w(200);
  ok(await page.locator('#bd-list .band-sub').count() === 1 && /sai da linha dele/.test(await page.locator('#bd-list').innerText()), 'com ele selecionado, a janela da faixa oferece pô-lo de volta ("sai da linha dele")');
  await page.locator(`#bd-${ids['Goblin 3']}`).check();
  await page.locator('.modal .btn', { hasText: 'Salvar' }).click(); await w(200);
  L = await ordem();
  ok(L.find(e => e.id === banda).toks.length === 3 && !L.some(e => e.token === ids['Goblin 3']), 'de volta à faixa, a linha própria dele sai');
  // o que os jogadores recebem
  const proj = await ev(([g2, g1, g3]) => {
    const u = __tc, sc = JSON.parse(JSON.stringify(u.Store.scene()));
    const pub = s => u.Proj.projetar(s, {}, new Set(['p1'])).v.turn.list.filter(e => e.toks).map(e => e.toks.length);
    const a = pub(sc);
    sc.tokens.find(k => k.id === g2).hidden = true; const b = pub(sc);
    for (const id of [g1, g3]) sc.tokens.find(k => k.id === id).hidden = true; const c = pub(sc);
    return [a, b, c];
  }, [ids['Goblin 2'], ids['Goblin 1'], ids['Goblin 3']]);
  ok(JSON.stringify(proj) === '[[3],[2],[]]', 'para os jogadores, a faixa vai só com os tokens que eles veem; com todos ocultos, ela nem vai: ' + JSON.stringify(proj));

  // ================= esperando para reagir =================
  const anaE = (await ordem()).find(e => e.token === ids.Ana).id;
  await ev(a => { __tc.Act.turnPatch(x => { x.on = true; x.cur = a; }, 'vez'); __tc.UI.openTab('turn'); }, anaE); await w(150);
  ok(await page.locator('.turn-x [id^="tx-"]').count() === 1 && await page.locator(`#tx-${anaE}`).count() === 1, 'o botão de reação aparece só na linha de quem está jogando (a Ana)');
  await page.locator(`#tx-${anaE}`).click(); await w(150);
  ok((await ordem()).find(e => e.id === anaE).reac === true && await page.locator(`#tl-${anaE}.reac .turn-reac`).count() === 1, 'o botão de reação marca a linha da Ana: "reação"');
  await page.screenshot({ path: path.join(SHOTS, '01-faixa-e-reacao.png') });
  ok(await ev(() => { const u = __tc; return JSON.stringify(u.Proj.projetar(JSON.parse(JSON.stringify(u.Store.scene())), {}, new Set(['p1'])).v.turn.list.filter(e => e.reac).length); }) === '1', 'a marca vai também para os jogadores');
  ok(await page.locator(`#tx-${anaE}.on`).count() === 1, 'a linha dela fica com o botão aceso');
  await ev(() => __tc.Act.turnStep(1)); await w(150);
  ok(await page.locator(`#tx-${anaE}.on`).count() === 1 && (await ordem()).find(e => e.id === anaE).reac === true, 'a vez passa, e a marca fica (ela está esperando)');
  await page.locator(`#tx-${anaE}`).click(); await w(150);
  ok(!(await ordem()).find(e => e.id === anaE).reac && /Ana reagiu/.test(await toasts()) && await page.locator(`#tx-${anaE}`).count() === 0, 'na vez de outro, o botão aceso diz que ela reagiu: a marca sai (e o botão some da linha dela)');
  await ev(() => __tc.Tools.undo()); await w(100);
  ok((await ordem()).find(e => e.id === anaE).reac === true, 'Desfazer devolve a marca');
  // a vez chega: a marca sai sozinha
  await ev(a => { const u = __tc; for (let i = 0; i < 8 && u.Store.scene().turn.cur !== a; i++) u.Act.turnStep(1); }, anaE); await w(100);
  ok(!(await ordem()).find(e => e.id === anaE).reac, 'quando a vez dela chega, a espera acaba e a marca sai');
  // separar a faixa
  await ev(() => __tc.UI.openTab('turn')); await w(100);
  await page.locator(`#tb-${banda}`).click(); await w(200);
  await page.locator('.modal .btn', { hasText: 'Separar em linhas' }).click(); await w(200);
  L = await ordem();
  ok(!L.some(e => e.toks) && ['Goblin 1', 'Goblin 2', 'Goblin 3'].every(nm => L.filter(e => e.token === ids[nm]).length === 1) && /virou 3 linhas/.test(await toasts()), '"Separar em linhas" troca a faixa por uma linha para cada token');
  await ev(() => __tc.Tools.undo()); await w(100);
  ok((await ordem()).some(e => e.id === banda), 'Desfazer devolve a faixa');
  // apagar um token da faixa
  await ev(g => { const u = __tc; u.setSel([{ c: 'tokens', id: g }]); u.Act.deleteSel(); }, ids['Goblin 2']); await w(100);
  ok(JSON.stringify((await ordem()).find(e => e.id === banda).toks) === JSON.stringify([ids['Goblin 1'], ids['Goblin 3']]), 'apagar um token tira ele da faixa');
  await ev(() => __tc.Tools.undo()); await w(100);
  // criar uma faixa com quem já tem linha própria: a linha dele sai (num passo só)
  await ev(l => { const u = __tc; u.setSel([{ c: 'tokens', id: l }]); u.UI.openTab('turn'); }, ids.Lobo); await w(150);
  const antesL = (await ordem()).length;
  await page.locator('#turnBand').click(); await w(200);
  await page.locator('.modal .btn', { hasText: 'Criar a faixa' }).click(); await w(200);
  L = await ordem();
  ok(L.length === antesL && !L.some(e => e.token === ids.Lobo) && L.some(e => e.toks && e.toks.length === 1 && e.toks[0] === ids.Lobo && e.name === 'Lobo'), 'uma faixa com o Lobo, que tinha linha própria: a linha dele dá lugar à faixa');
  await ev(() => __tc.Tools.undo()); await w(150);
  ok((await ordem()).some(e => e.token === ids.Lobo), 'Desfazer devolve a linha dele');
  // dados estranhos: o mesmo token em duas faixas e numa linha própria
  const norm = await ev(() => { const u = __tc, sc = u.normalizeScene({ name: 'x', tokens: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 0, y: 0 }], turn: { on: false, round: 1, cur: null, list: [{ id: 'f1', token: null, name: 'F', toks: ['a', 'a', 'b', 7] }, { id: 'f2', token: null, name: 'G', toks: ['b'] }, { id: 'l', token: 'a', k: 1 }, { id: 'x', token: null, name: 'X', toks: 'oi', reac: 'sim' }] } }); return sc.turn.list.map(e => [e.id, e.toks, e.reac]); });
  ok(JSON.stringify(norm) === JSON.stringify([['f1', ['a', 'b']], ['f2', []], ['x', null, null]]) || JSON.stringify(norm) === '[["f1",["a","b"],null],["f2",[],null],["x",null,null]]', 'ao abrir a cena: um token fica numa faixa só, sem linha própria; a marca de reação só vale se for "sim" de verdade: ' + JSON.stringify(norm));

  // ================= sobrevida em grupo e o escudinho =================
  await ev(() => {
    const u = __tc, sc = u.newScene('Sobrevida'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
    const mk = (name, x, y, bars, extra) => u.Store.add('tokens', u.newToken(sc, x * sc.cell, y * sc.cell, Object.assign({ name, bars: bars.map(u.cleanBar) }, extra)));
    u.Store.tx('prep', () => {
      mk('Ana', 3, 3, [{ n: 'Vida', v: 30, m: 30 }], { owner: 'p1' });
      mk('Bruto', 6, 3, [{ n: 'Vida', v: 20, m: 40, x: 5 }], { barVis: 'bar' });
      mk('Caixa', 9, 3, [{ n: 'Vida', v: 0, m: 0, on: false }], {});
    });
    u.App.view.z = 1.6; u.App.view.x = 1.5 * sc.cell; u.App.view.y = 1.4 * sc.cell; u.Render.request();
  });
  await w(250);
  await ev(() => { const u = __tc, sc = u.Store.scene(); u.setSel(sc.tokens.filter(k => k.name !== 'Caixa').map(k => ({ c: 'tokens', id: k.id }))); u.UI.openTab('sel'); }); await w(200);
  await page.locator('#mt-sobre').click(); await w(200);
  ok(await page.locator('.modal h2').innerText() === 'Sobrevida a 2 tokens' && /sem sobrevida/.test(await page.locator('#sb-list').innerText()) && /tem 5/.test(await page.locator('#sb-list').innerText()), 'com dois tokens selecionados, "Sobrevida…" abre a janela com a barra Vida e o que cada um tem');
  await page.locator('#sb-amt').fill('10'); await w(100);
  ok(/0 → 10/.test(await page.locator('#sb-list').innerText()) && /5 → 10/.test(await page.locator('#sb-list').innerText()), 'a lista mostra o que vai mudar antes de aplicar: ' + (await page.locator('#sb-list').innerText()).replace(/\s+/g, ' '));
  await page.locator('.modal .btn', { hasText: 'Dar sobrevida' }).click(); await w(200);
  ok((await T('Ana')).bars[0].x === 10 && (await T('Bruto')).bars[0].x === 10 && /Sobrevida 10 em 2 tokens/.test(await toasts()), 'os dois ficam com 10 de sobrevida, num passo só');
  await clearToasts();
  await ev(() => __tc.Store.tx('mais', () => { const k = __tc.Store.scene().tokens.find(x => x.name === 'Ana'); __tc.Store.upd('tokens', k.id, { bars: [Object.assign({}, k.bars[0], { x: 15 })] }); })); await w(100);
  await page.locator('#mt-sobre').click(); await w(200);
  await page.locator('#sb-amt').fill('12'); await w(100);
  ok(/fica com 15 \(já tem mais\)/.test(await page.locator('#sb-list').innerText()) && /10 → 12/.test(await page.locator('#sb-list').innerText()), 'não soma: quem tem mais fica com o que tem');
  await page.locator('.modal .btn', { hasText: 'Dar sobrevida' }).click(); await w(200);
  ok((await T('Ana')).bars[0].x === 15 && (await T('Bruto')).bars[0].x === 12, 'Ana fica com 15; Bruto vai a 12');
  await ev(() => __tc.Tools.undo()); await w(100);
  ok((await T('Bruto')).bars[0].x === 10, 'Desfazer volta');
  // a aba Jogadores: para todos da cena
  await ev(() => { __tc.setSel([]); __tc.UI.openTab('players'); }); await w(200);
  await page.locator('#pl-sobre summary').click(); await w(100);
  await page.locator('#pl-sobre-all').click(); await w(200);
  ok(await page.locator('#sb-list li').count() === 3 && /sem Vida/.test(await page.locator('#sb-list').innerText()), 'na aba Jogadores, "A todos da cena…" lista os três (a Caixa, sem barra, não muda)');
  await page.keyboard.press('Escape'); await w(100);
  // o que vai para os jogadores: a sobrevida do Bruto, que mostra só a proporção
  const pb = await ev(() => { const u = __tc, sc = JSON.parse(JSON.stringify(u.Store.scene())); const k = u.Proj.projetar(sc, {}, new Set(['p1'])).v.tokens.find(x => x.name === 'Bruto'); return k.bars[0]; });
  ok(pb.m === 100 && pb.v === 50 && pb.x === 25 && pb.xn === 10, 'para os jogadores, a barra do Bruto vai em proporção, e a sobrevida também (25%) — com os pontos para o escudo (10): ' + JSON.stringify(pb));
  // o escudo com o número, na visão do jogador
  await ev(() => { __tc.App.viewer = 'p1'; __tc.setSel([]); __tc.Render.request(); }); await w(400);
  await page.screenshot({ path: path.join(SHOTS, '02-sobrevida-jogador.png') });
  await ev(() => { __tc.App.viewer = 'gm'; __tc.Render.request(); }); await w(200);

  // ================= as condições novas, por categoria =================
  await ev(() => { const u = __tc, k = u.Store.scene().tokens.find(x => x.name === 'Ana'); u.setSel([{ c: 'tokens', id: k.id }]); u.UI.openTab('sel'); }); await w(200);
  const chipsNomes = () => page.locator('#cg-list .chip').allInnerTexts();
  ok(await page.locator('#s-cond .ctab').count() === 8 && await page.locator('#cg-tab-dano.on').count() === 1, 'as condições do token vêm em abas: Todas e as sete categorias; abre em "Dano"');
  ok((await chipsNomes()).join() === 'Envenenado,Sangrando,Hemorragia,Queimando,Congelado,Resfriado,Molhado,Óleo,Eletrizado,Corroído,Enregelado,Ventania', 'em Dano, as de dano e elementos (com o Resfriado e, do lote 7, Eletrizado, Corroído, Enregelado e Ventania): ' + (await chipsNomes()).join());
  await page.locator('#cg-tab-combate').click(); await w(120);
  ok((await chipsNomes()).join() === 'Fúria,Grito de Batalha,Provocado,Defendendo,Desarmado,Concentrando,Vulnerável,Determinado', 'em Combate (com Vulnerável e Determinado, do lote 7): ' + (await chipsNomes()).join());
  await page.locator('#cg-list .chip', { hasText: 'Grito de Batalha' }).click(); await w(200);
  ok((await T('Ana')).conds.includes('grito') && await page.locator('#cg-tab-combate.tem').count() === 1 && await page.locator('#cg-tab-combate.on').count() === 1, 'um toque põe o Grito de Batalha; a aba Combate fica marcada com um ponto (e continua aberta)');
  await page.locator('#cg-busca').fill('resf'); await w(120);
  ok((await chipsNomes()).join() === 'Resfriado' && await page.locator('#s-cond .ctab.on').count() === 0, 'a busca procura em todas as categorias ("resf" → Resfriado)');
  await page.locator('#cg-busca').fill('bebad'); await w(120);
  ok((await chipsNomes()).join() === 'Bêbado', 'sem ligar para acento ("bebad" → Bêbado)');
  await page.locator('#cg-busca').fill('xyz'); await w(120);
  ok(/Nenhuma condição com esse nome/.test(await page.locator('#cg-list').innerText()), 'sem resultado, a mesa diz');
  await page.locator('#cg-tab-todas').click(); await w(120);
  ok(await page.locator('#cg-list .chip').count() === 67 && await page.locator('#cg-busca').inputValue() === '', 'a aba Todas mostra as 67 (47 + 20 do lote 7), e limpa a busca');
  await page.locator('#cg-tab-mente').click(); await w(120);
  for (const nm of ['Artefato Ativado', 'Enfeitiçado', 'Marcado']) { await page.locator('#cg-list .chip', { hasText: nm }).click(); await w(150); }
  { const ana = await T('Ana'); ok(['artefato', 'enfeiticado', 'marcado'].every(id => ana.conds.includes(id)), '(mais três na Ana)'); }
  // a janela de condições (botão direito) tem as mesmas abas
  await ev(() => { const u = __tc, k = u.Store.scene().tokens.find(x => x.name === 'Ana'); u.UI.condPicker([k]); }); await w(200);
  ok(await page.locator('.modal #cgm-tab-mente.on').count() === 1 && await page.locator('.modal #cgm-list .chip.on').count() === 3, 'a janela de condições abre na mesma aba, com as três ativas acesas');
  await page.locator('.modal #cgm-tab-ritmo').click(); await w(120);
  await page.locator('.modal #cgm-list .chip', { hasText: 'Voando' }).click(); await w(200);
  ok((await T('Ana')).conds.includes('voando') && await page.locator('.modal #cgm-tab-ritmo.on').count() === 1, 'nela também: Ritmo → Voando, e a aba continua aberta');
  await page.screenshot({ path: path.join(SHOTS, '03-condicoes.png') });
  await page.keyboard.press('Escape'); await w(100);
  // a janela de dano em área separa as condições por categoria
  await ev(() => { const u = __tc; u.UI.areaBox('Teste', u.Store.scene().tokens.slice(0, 2), null); }); await w(200);
  ok(await page.locator('#ar-cond optgroup').count() === 7 && await page.locator('#ar-cond option').count() === 68, 'na janela de dano em área, a lista de condições vem em grupos (7 categorias, 67 + "Nenhuma")');
  await page.keyboard.press('Escape'); await w(100);

  // ================= Força e defesas ao lado do nome =================
  await ev(() => { const u = __tc, k = u.Store.scene().tokens.find(x => x.name === 'Bruto'); u.setSel([{ c: 'tokens', id: k.id }]); u.UI.openTab('sel'); }); await w(200);
  ok(await page.locator('#s-nums').count() === 1 && await page.locator('#s-nums input').count() === 5 && await page.locator('#tk-st-for').inputValue() === '', 'num token sem ficha, o mestre tem os cinco campos (Força, Canalização, Defesas, Esquiva), vazios');
  await page.locator('#tk-st-for').fill('40'); await page.locator('#tk-st-for').press('Tab'); await w(150);
  await page.locator('#tk-st-dff').fill('12'); await page.locator('#tk-st-dff').press('Tab'); await w(150);
  await page.locator('#tk-st-esq').fill('7.6'); await page.locator('#tk-st-esq').press('Tab'); await w(150);
  ok(JSON.stringify((await T('Bruto')).st) === '{"for":40,"dff":12,"esq":8}', 'ficam guardados só os preenchidos: ' + JSON.stringify((await T('Bruto')).st));
  const stLimpo = await ev(() => { const u = __tc, sc = u.normalizeScene({ name: 'x', tokens: [{ id: 'a', x: 0, y: 0, st: { for: '', can: 'x', dff: 3.6, dfm: true, esq: null } }, { id: 'b', x: 0, y: 0, st: { for: '' } }, { id: 'c', x: 0, y: 0, st: [1, 2] }] }); return sc.tokens.map(k => (k.st === undefined ? '-' : k.st)); });
  ok(JSON.stringify(stLimpo) === JSON.stringify([{ dff: 4 }, '-', '-']), 'ao abrir a cena: campo vazio não vira zero; o que não é número sai; nada preenchido, nada guardado: ' + JSON.stringify(stLimpo));
  await ev(() => __tc.Tools.undo()); await w(120);
  ok(JSON.stringify((await T('Bruto')).st) === '{"for":40,"dff":12}', 'Desfazer volta um de cada vez');
  await ev(() => __tc.Tools.redo()); await w(120);
  // o mapa: ao apontar
  await ev(() => { __tc.setSel([]); __tc.Tools.set('select'); }); await w(150);
  { const k = await T('Bruto'), C2 = await ev(() => __tc.Store.scene().cell), p = await tela(k.x + C2 / 2, k.y + C2 / 2); await page.mouse.move(p[0], p[1]); await page.mouse.move(p[0] + 2, p[1] + 1); await w(250); }
  ok(await ev(() => __tc.App.hoverTok) === (await T('Bruto')).id, 'com o mouse sobre o Bruto, ele é o token apontado');
  await page.screenshot({ path: path.join(SHOTS, '04-numeros-ao-apontar.png') });
  await page.mouse.move(5, 500); await w(200);
  ok(await ev(() => __tc.App.hoverTok) === null, 'tirando o mouse do mapa, ninguém está apontado');
  // o que vai para os jogadores: os números de um token do mestre, não
  const stPub = await ev(() => { const u = __tc, sc = JSON.parse(JSON.stringify(u.Store.scene())); sc.tokens.find(k => k.name === 'Ana').st = { for: 9 }; const v = u.Proj.projetar(sc, {}, new Set(['p1'])).v.tokens; return [v.find(k => k.name === 'Bruto').st, v.find(k => k.name === 'Ana').st]; });
  ok(stPub[0] === undefined && JSON.stringify(stPub[1]) === '{"for":9}', 'os números de um token do mestre não vão para os jogadores; os do token de um jogador vão (o dono vê): ' + JSON.stringify(stPub));
  // o jogador: no token dele, só para ler; no do mestre, nada
  await ev(() => { const u = __tc, sc = u.Store.scene(), a = sc.tokens.find(x => x.name === 'Ana'); u.Store.tx('st', () => u.Store.upd('tokens', a.id, { st: { can: 22 } })); u.App.viewer = 'p1'; u.setSel([{ c: 'tokens', id: a.id }]); u.UI.openTab('sel'); }); await w(250);
  ok(await page.locator('#s-nums input').count() === 0 && await page.locator('#tk-num-CAN').innerText() === '22' && await page.locator('#tk-num-FOR').innerText() === '–', 'o jogador vê os números do token dele, só para ler');
  await ev(() => { const u = __tc, b = u.Store.scene().tokens.find(x => x.name === 'Bruto'); u.setSel([{ c: 'tokens', id: b.id }]); u.UI.openTab('sel'); }); await w(200);
  ok(await page.locator('#s-nums').count() === 0, 'no token do mestre, o jogador não vê os números');
  await ev(() => { __tc.App.viewer = 'gm'; __tc.setSel([]); }); await w(150);
  // K: o ataque com defesa (fora do site, a mesa explica)
  await clearToasts();
  { const k = await T('Bruto'), C2 = await ev(() => __tc.Store.scene().cell), p = await tela(k.x + C2 / 2, k.y + C2 / 2); await page.mouse.move(p[0], p[1]); await w(150); }
  await page.keyboard.press('k'); await w(200);
  ok(/O ataque com defesa funciona dentro do site/.test(await toasts()), 'a tecla K chama o ataque com defesa (fora do site, a mesa explica por que não abre)');
  await ev(() => { __tc.App.viewer = 'p1'; }); await clearToasts(); await page.keyboard.press('k'); await w(150);
  ok(/O ataque com defesa é do mestre/.test(await toasts()), 'para o jogador, K diz que o ataque é do mestre');
  await ev(() => { __tc.App.viewer = 'gm'; }); await w(100);
  await ev(() => __tc.UI.helpBox && __tc.UI.helpBox()); await w(150);

  // ================= objetos de cenário =================
  await ev(() => {
    const u = __tc, sc = u.newScene('Objetos'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
    u.Store.tx('prep', () => {
      u.Store.scn({ cols: 14, rows: 9, light: 'penumbra', fog: { dynamic: false, manual: false, explored: true, shared: true } });
      u.Store.add('walls', { id: 'pw', k: 'wall', x1: 7 * sc.cell, y1: 0, x2: 7 * sc.cell, y2: 9 * sc.cell, open: false, locked: false, secret: false });
      u.Store.add('tokens', u.newToken(sc, 2 * sc.cell, 6 * sc.cell, { name: 'Ana', owner: 'p1', bars: [u.cleanBar({ n: 'Vida', v: 30, m: 30 })] }));
    });
    u.App.view.z = 1; u.Render.fit(); u.setSel([]);
  });
  await w(250);
  await page.keyboard.press('j'); await w(200);
  ok(await ev(() => __tc.App.tool) === 'obj' && await page.locator('#tool-obj.on').count() === 1 && (await page.locator('#tool-obj').getAttribute('title')) === 'Objetos de cenário (J)', 'a tecla J abre a ferramenta Objetos de cenário (também no trilho)');
  ok(await page.locator('#o-oc .seg-b').count() === 4 && await page.locator('.o-obj').count() === 6 && await page.locator('#o-obj-fogueira.on').count() === 1, 'a barra de cima tem as quatro categorias e, em Luzes, as seis luzes (a fogueira escolhida; a lanterna de papel veio no lote 7)');
  await page.locator('#o-obj-tocha').click(); await w(120);
  { const p = await tela(3.5 * C, 2.5 * C); await page.mouse.click(p[0], p[1]); await w(200); }
  let objs = await ev(() => __tc.Store.scene().tokens.filter(k => k.prop).map(k => JSON.parse(JSON.stringify(k))));
  ok(objs.length === 1 && objs[0].prop === 'tocha' && objs[0].x === 3 * C && objs[0].y === 2 * C && objs[0].shape === 'quad' && objs[0].bars.length === 0 && objs[0].showName === false && objs[0].vis.on === false && objs[0].light.on && objs[0].light.fl === true && objs[0].light.dim === 8,
    'um clique no mapa põe a tocha: um token quadrado, sem barras, sem nome à mostra, sem visão, com a luz acesa e tremulando: ' + JSON.stringify(objs[0] && { prop: objs[0].prop, light: objs[0].light }));
  ok(await ev(() => __tc.App.tool) === 'obj' && /Tocha de parede no mapa/.test(await toasts()), 'a ferramenta continua escolhida (para pôr outras), e a mesa avisa com Desfazer');
  await page.locator('#o-obj-fogueira').click(); await w(80);
  { const p = await tela(10.5 * C, 4.5 * C); await page.mouse.click(p[0], p[1]); await w(200); }
  await page.locator('#o-oc .seg-b', { hasText: 'Móveis' }).click(); await w(120);
  ok(await page.locator('.o-obj').count() === 15 && await page.locator('#o-obj-bau.on').count() === 1, 'em Móveis e baús, quinze móveis (o baú já escolhido; almofada, tapete, jarro, bigorna, banco e balcão vieram no lote 7; a pele e as armas, das moradias da tribo, na parte 4b)');
  await page.locator('#o-obj-mesa').click(); await w(80);
  { const p = await tela(4 * C, 6 * C); await page.mouse.click(p[0], p[1]); await w(200); }
  for (const [cat, id, x, y] of [['Natureza', 'arvore', 12, 1], ['Natureza', 'pedra', 9.5, 7.5], ['Perigos', 'armadilha', 5.5, 4.5], ['Perigos', 'estatua', 12.5, 7.5]]) {
    await page.locator('#o-oc .seg-b', { hasText: cat }).click(); await w(80);
    await page.locator('#o-obj-' + id).click(); await w(80);
    const p = await tela(x * C, y * C); await page.mouse.click(p[0], p[1]); await w(150);
  }
  objs = await ev(() => __tc.Store.scene().tokens.filter(k => k.prop).map(k => [k.prop, k.size]));
  ok(JSON.stringify(objs) === JSON.stringify([['tocha', 1], ['fogueira', 1], ['mesa', 2], ['arvore', 2], ['pedra', 1], ['armadilha', 1], ['estatua', 1]]), 'sete objetos, cada um no tamanho dele (mesa e árvore com 2): ' + JSON.stringify(objs));
  await page.keyboard.press('Escape'); await w(150);
  await ev(() => __tc.Render.request()); await w(300);
  ok(await ev(() => __tc.Vision.out.flick.length) === 2, 'as duas luzes de chama (tocha e fogueira) tremulam: o mapa sabe até onde cada uma alcança');
  await page.screenshot({ path: path.join(SHOTS, '05-objetos-penumbra.png') });
  // o painel de um objeto
  const tochaId = await ev(() => __tc.Store.scene().tokens.find(k => k.prop === 'tocha').id);
  await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, tochaId); await w(200);
  ok(await page.locator('#s-prop').count() === 1 && await page.locator('#s-bars').count() === 0 && await page.locator('#s-cond').count() === 0 && await page.locator('#hud').isHidden(), 'o painel de um objeto: nome, girar, tamanho, luz — sem barras nem condições, e sem a faixa de baixo');
  await page.locator('#pr-rot-r').click(); await w(150);
  ok((await ev(id => __tc.Store.get('tokens', id).rot, tochaId)) === 90, 'girar para a direita: 90°');
  await page.locator('#pr-rot-l').click(); await page.locator('#pr-rot-l').click(); await w(150);
  ok((await ev(id => __tc.Store.get('tokens', id).rot, tochaId)) === 270, 'e para a esquerda, duas vezes: 270°');
  await page.locator('#pr-fl').uncheck({ force: true }); await w(150);
  ok(!(await ev(id => __tc.Store.get('tokens', id).light.fl, tochaId)) && await ev(() => __tc.Vision.out.flick.length) === 1, 'sem "tremula", a tocha para de tremular (só a fogueira continua)');
  await ev(() => __tc.Tools.undo()); await w(150);
  await page.locator('#pr-hidden').check({ force: true }); await w(150);
  const pub = await ev(() => { const u = __tc, sc = JSON.parse(JSON.stringify(u.Store.scene())); return u.Proj.projetar(sc, {}, new Set(['p1'])).v.tokens.filter(k => k.prop).map(k => k.prop + (k.rot ? ':' + k.rot : '') + (k.light && k.light.fl ? ':fl' : '')); });
  ok(!pub.includes('tocha') && !pub.some(x => x.startsWith('tocha')) && pub.includes('fogueira:fl') && pub.length === 6, 'para os jogadores: a tocha oculta não vai; os outros vão, com a luz tremulando: ' + JSON.stringify(pub));
  await ev(() => __tc.Tools.undo()); await w(100);
  // fora das contas: turnos, áreas, mira, ataque
  const fora = await ev(() => {
    const u = __tc, sc = u.Store.scene(), props = sc.tokens.filter(k => k.prop), ana = sc.tokens.find(k => k.name === 'Ana');
    const n = u.Act.turnAdd(props);
    const dentro = u.tokensIn ? null : null;
    const g = new Path2D(); g.rect(0, 0, sc.cols * sc.cell, sc.rows * sc.cell);
    return { turnos: n, ordem: sc.turn.list.length, area: u.Act.areaApply(props.map(t => ({ t, half: false })), 'Vida', '-5', null), anaNaArea: null, nome: props[0].name };
  });
  ok(fora.turnos === 0 && fora.ordem === 0, 'objeto de cenário não entra na ordem de turnos');
  await ev(() => { const u = __tc, sc = u.Store.scene(); u.Store.tx('fx', () => u.Store.add('effects', { id: 'fxall', fx: 'fogo', k: 'rect', x: sc.cols * sc.cell / 2, y: sc.rows * sc.cell / 2, r: 2, rw: sc.cols, rh: sc.rows, dir: 0, pow: 0.8, seed: 3, dur: 0, apply: null, gm: false, by: 'gm', token: null })); u.setSel([{ c: 'effects', id: 'fxall' }]); u.UI.openTab('sel'); }); await w(200);
  await page.locator('#fx-apply').click(); await w(200);
  ok(await page.locator('.modal .area-row').count() === 1 && /Ana/.test(await page.locator('.modal .area-list').innerText()), 'um efeito sobre o mapa todo: só a Ana aparece para levar dano (os objetos ficam de fora)');
  await page.keyboard.press('Escape'); await w(100);
  await ev(() => { const u = __tc; u.Store.tx('sem fx', () => u.Store.del('effects', 'fxall')); u.setSel([]); }); await w(150);
  // o mouse sobre um objeto: não é "o token apontado"; F e K não pegam objetos
  { const p = await tela(10.5 * C, 4.5 * C); await page.mouse.move(p[0], p[1]); await page.mouse.move(p[0] + 1, p[1] + 1); await w(200); }
  ok(await ev(() => __tc.App.hoverTok) === null, 'o mouse sobre a fogueira não conta como apontar um token');
  await clearToasts(); await page.keyboard.press('k'); await w(150);
  ok(/passe o mouse sobre um token/.test(await toasts()), 'K sobre a fogueira: a mesa pede um token');
  // o botão direito num objeto
  { const p = await tela(10.5 * C, 4.5 * C); await page.mouse.click(p[0], p[1], { button: 'right' }); await w(200); }
  ok(await page.locator('.menu .menu-i', { hasText: 'Girar para a direita' }).count() === 1 && await page.locator('.menu .menu-i', { hasText: 'Condições' }).count() === 0 && await page.locator('.menu .menu-i', { hasText: 'Adicionar aos turnos' }).count() === 0, 'o botão direito num objeto: girar, esconder, travar, duplicar, apagar (nada de condições ou turnos)');
  await page.keyboard.press('Escape'); await w(100);
  // um objeto debaixo de um token: o clique pega o token (que fica por cima)
  await ev(() => { const u = __tc, sc = u.Store.scene(), ana = sc.tokens.find(k => k.name === 'Ana'); u.Store.tx('tronco', () => u.Store.add('tokens', u.Props.novo(sc, 'tronco', ana.x, ana.y, 1, false))); u.setSel([]); u.Tools.set('select'); }); await w(150);
  { const a = await T('Ana'), p = await tela(a.x + C / 2, a.y + C / 2); await page.mouse.click(p[0], p[1]); await w(200); }
  ok(await ev(() => { const s = __tc.App.sel; return s.length === 1 && __tc.Store.get('tokens', s[0].id).name === 'Ana'; }), 'com um tronco debaixo da Ana, o clique escolhe a Ana');
  await ev(() => { __tc.Tools.undo(); __tc.setSel([]); }); await w(100);
  // o jogador não mexe em objeto
  const jog = await ev(() => { const u = __tc, sc = u.Store.scene(), f = sc.tokens.find(k => k.prop === 'fogueira'); u.App.viewer = 'p1'; const r = u.can('moveToken', f); u.App.viewer = 'gm'; return r; });
  ok(jog === false, 'o jogador não move objetos de cenário');
  // dados estranhos: objeto que não existe vira token comum
  const nz = await ev(() => { const u = __tc, sc = u.normalizeScene({ name: 'x', tokens: [{ id: 'a', x: 0, y: 0, prop: 'naoexiste', rot: 45 }, { id: 'b', x: 0, y: 0, prop: 'barril', rot: -90, shape: 'circ' }, { id: 'c', x: 0, y: 0, prop: 'tocha', rot: 725 }] }); return sc.tokens.map(k => [k.prop || null, k.rot === undefined ? null : k.rot, k.shape]); });
  ok(JSON.stringify(nz) === JSON.stringify([[null, null, 'circ'], ['barril', 270, 'quad'], ['tocha', 5, 'quad']]), 'ao abrir a cena: objeto desconhecido vira token comum; o giro fica de 0 a 359; objeto é sempre quadrado: ' + JSON.stringify(nz));

  // ================= zonas de efeito novas e o aviso no começo da vez =================
  await ev(() => { __tc.setSel([]); __tc.UI.openTab('fx'); }); await w(200);
  ok(await page.locator('#side .ctab').count() === 5 && await page.locator('#fxt-elem.on').count() === 1 && await page.locator('#side .fx-card').count() === 18, 'a aba Efeitos vem em categorias (Todos, Elementos, Magia, Natureza, Sagrado e sombrio); em Elementos, 18 (7 do lote 7)');
  await page.locator('#fxt-magia').click(); await w(150);
  ok((await page.locator('#side .fx-card .fx-n').allInnerTexts()).join() === 'Magia arcana,Antimagia,Tinta,Escuridão mágica,Teia,Barreira de força,Círculo arcano,Silêncio,Vórtice,Gravidade pesada,Distorção do tempo,Portal,Runas-armadilha,Formação de selos', 'em Magia (com as do lote 7): ' + (await page.locator('#side .fx-card .fx-n').allInnerTexts()).join());
  await page.locator('#fxt-todos').click(); await w(150);
  ok(await page.locator('#side .fx-card').count() === 51, 'em Todos, os 51 efeitos (19 do lote 7)');
  await page.locator('#fxc-teia').click(); await w(150);
  ok(await ev(() => __tc.App.tool) === 'fx' && await page.locator('#o-fx optgroup').count() === 4 && await page.locator('#o-fx').inputValue() === 'teia', 'escolher a Teia liga a ferramenta; a lista da barra de cima também vem em grupos');
  await page.keyboard.press('Escape'); await w(100);
  // uma zona de lava sobre a Ana, com dano guardado
  const fxIds = await ev(() => {
    const u = __tc, sc = u.Store.scene(), ana = sc.tokens.find(k => k.name === 'Ana');
    u.Store.tx('zonas', () => {
      u.Store.add('effects', { id: 'zlava', fx: 'lava', k: 'circ', x: ana.x + sc.cell / 2, y: ana.y + sc.cell / 2, r: 1.5, rw: 3, rh: 2, dir: 0, pow: 0.8, seed: 5, dur: 0, apply: { bar: 'Vida', amt: '-5', cond: { id: 'fogo', n: 0, d: 0 }, skip: [] }, gm: false, by: 'gm', token: null });
      u.Store.add('effects', { id: 'zteia', fx: 'teia', k: 'circ', x: 9.5 * sc.cell, y: 6.5 * sc.cell, r: 1, rw: 3, rh: 2, dir: 0, pow: 0.8, seed: 5, dur: 0, apply: null, gm: false, by: 'gm', token: null });
      u.Store.add('tokens', u.newToken(sc, 9 * sc.cell, 6 * sc.cell, { name: 'Lobo', bars: [u.cleanBar({ n: 'Vida', v: 20, m: 20 })] }));
    });
    u.Act.turnAdd([sc.tokens.find(k => k.name === 'Lobo'), ana]);
    u.Act.turnPatch(x => { x.on = true; x.round = 1; x.cur = x.list[0].id; x.back = 0; }, 'Iniciar');
    u.UI.openTab('turn');
    return { ana: ana.id };
  });
  await w(200);
  await page.locator('#turnNext').click(); await w(250);
  ok(await page.locator('#zonas').isVisible() && await page.locator('#zona-zlava').count() === 1 && /Ana começa a vez dentro de Lava: −5 Vida \+ Queimando/.test(await page.locator('#zonas').innerText()), 'a vez passa para a Ana, que está na lava: o mestre vê "Ana começa a vez dentro de Lava: −5 Vida + Queimando" — ' + (await page.locator('#zonas').innerText()).replace(/\s+/g, ' '));
  ok((await T('Ana')).bars[0].v === 30, '(nada aconteceu sozinho)');
  await page.screenshot({ path: path.join(SHOTS, '06-zona-no-comeco-da-vez.png') });
  await page.locator('#zona-ok-zlava').click(); await w(200);
  ok((await T('Ana')).bars[0].v === 25 && (await T('Ana')).conds.includes('fogo') && await page.locator('#zonas').isHidden() && /Lava: −5 Vida \+ Queimando em Ana/.test(await toasts()), '"Aplicar": −5 de Vida e Queimando, com Desfazer; o aviso sai');
  await ev(() => __tc.Tools.undo()); await w(150);
  ok((await T('Ana')).bars[0].v === 30 && !(await T('Ana')).conds.includes('fogo'), 'Desfazer devolve tudo');
  await page.locator('#turnNext').click(); await w(200);
  ok(await page.locator('#zonas').isHidden(), 'na vez do Lobo (fora da zona), nenhum aviso');
  await page.locator('#turnNext').click(); await w(200);
  await page.locator('#zona-no-zlava').click(); await w(150);
  ok((await T('Ana')).bars[0].v === 30 && await page.locator('#zonas').isHidden(), '"Pular": nada muda e o aviso sai');
  await page.locator('#turnNext').click(); await page.locator('#turnPrev').click(); await w(200);
  ok(await page.locator('#zonas').isHidden(), 'voltar a vez não pergunta de novo');
  // a teia: a primeira vez que se aplica, a condição que combina já vem escolhida
  await ev(() => { __tc.setSel([{ c: 'effects', id: 'zteia' }]); __tc.UI.openTab('sel'); }); await w(200);
  await page.locator('#fx-apply').click(); await w(200);
  ok(await page.locator('#ar-cond').inputValue() === '' && (await page.locator('#ar-sug').innerText()).trim() === 'Sugestão: Emaranhado', 'aplicar a Teia pela primeira vez: nada vem escolhido, e "Emaranhado" fica sugerido num botão');
  await page.locator('#ar-sug').click(); await w(100);
  ok(await page.locator('#ar-cond').inputValue() === 'emaranhado' && !(await page.locator('#ar-cn').isDisabled()), 'um clique na sugestão escolhe a condição');
  await page.keyboard.press('Escape'); await w(100);

  // ================= a plataforma de madeira =================
  await ev(() => { const u = __tc, sc = u.Store.scene(); u.Store.tx('ter', () => u.Store.add('shapes', { id: 'plat', k: 'rect', x: 1 * sc.cell, y: 1 * sc.cell, w: 4 * sc.cell, h: 3 * sc.cell, s: '#b08d5c', sw: 0, f: '#b08d5c', a: 1, top: false, gm: false, lock: false, by: null, ter: { t: 'plataforma', h: 1 } })); u.Store.scn({ light: 'claro' }); u.setSel([]); u.App.view.z = 1.6; u.App.view.x = 0.5 * sc.cell; u.App.view.y = 0.5 * sc.cell; u.Render.request(); }); await w(400);
  await page.screenshot({ path: path.join(SHOTS, '07-plataforma.png') });

  // ======== (as próximas partes entram aqui) ========

  const errs = t.errs.filter(x => !/favicon|fonts\.g/.test(x));
  ok(!errs.length, 'sem erros no console: ' + errs.join(' | '));
  console.log(`${n - fails} verificações passaram` + (fails ? `, ${fails} falharam` : ''));
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
