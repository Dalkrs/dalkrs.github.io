// Bateria do lote 83 nas Cenas — a visão do mestre: Construção ou Mestrando.
//   · o botão no topo troca a visão; cada cena lembra a última (neste aparelho);
//   · Mestrando: a barra da esquerda fica só com o que se usa jogando (sem paredes, objetos, desenhos, luz, terreno);
//     arrastar um objeto não o move (aviso com "Ir para Construção"); a caixa de seleção pega só os tokens; o token anda;
//     o clique na porta abre e fecha; dois cliques num objeto de luz acendem e apagam; o Delete não apaga objeto;
//     os atalhos das ferramentas de construção avisam; o menu do objeto não tem girar, travar, duplicar nem apagar;
//   · Construção: tudo volta a se mexer.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const j = JSON.stringify;
(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const avisos = () => ev(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const cvb = await page.locator('#cv').boundingBox();
  const tela = async (x, y) => { const p = await ev(([x, y]) => __tc.Render.toScreen(x, y), [x, y]); return [cvb.x + p[0], cvb.y + p[1]]; };
  const arrasta = async (de, para) => { const a = await tela(...de), b = await tela(...para); await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, { steps: 4 }); await page.mouse.move(b[0], b[1], { steps: 4 }); await page.mouse.up(); await w(200); };
  const C = 64;

  const P = await ev(() => {
    const { Store, newScene, newToken, Props, Persist, normalizeScene } = __tc;
    const sc = normalizeScene(Object.assign(newScene('Taverna'), { cols: 16, rows: 10, cell: 64, light: 'penumbra' }));
    Store.addScene(sc); Persist.scene(sc.id); __tc.UI.switchScene(sc.id);
    const mesa = Props.novo(sc, 'mesa', 6 * 64, 3 * 64, 1, false);
    const lamp = Props.novo(sc, 'lampiao', 9 * 64, 3 * 64, 1, false);
    const tk = newToken(sc, 2 * 64, 2 * 64, { name: 'Dain' });
    const porta = { id: 'wl_porta', x1: 12 * 64, y1: 1 * 64, x2: 12 * 64, y2: 2 * 64, open: false, locked: false, k: 'door', secret: false };
    const parede = { id: 'wl_par', x1: 12 * 64, y1: 2 * 64, x2: 12 * 64, y2: 8 * 64, open: false, locked: false, k: 'wall', secret: false };
    const ret = { id: 'sh_tapete', k: 'rect', x: 1 * 64, y: 5 * 64, w: 4 * 64, h: 3 * 64, fill: '#884422', stroke: '#000000', sw: 2, op: 1 };
    Store.tx('Montar', () => { Store.add('tokens', mesa); Store.add('tokens', lamp); Store.add('tokens', tk); Store.add('walls', porta); Store.add('walls', parede); Store.add('shapes', ret); });
    return { sc: sc.id, mesa: mesa.id, lamp: lamp.id, tk: tk.id };
  });
  await w(300);
  const pos = id => ev(id => { const t = __tc.Store.get('tokens', id); return [t.x / 64, t.y / 64]; }, id);
  const ferramentas = () => ev(() => [...document.querySelectorAll('#rail .tool, #rail .rail-item')].map(b => b.id.replace('tool-', '')));

  ok(await ev(() => __tc.App.visao) === 'construcao', 'uma cena fora do ar abre em Construção');
  ok(await page.locator('#visaoSeg .visao-b').count() === 2 && /Construção/.test(await page.locator('#visaoSeg .visao-b.on').innerText()), 'o botão no topo: Construção (marcado) e Mestrando');
  const antes = await ferramentas();
  ok(['wall', 'obj', 'light', 'terrain'].every(x => antes.includes(x)), 'em Construção, a barra tem paredes, objetos, luz e terreno');

  /* ---------- Mestrando ---------- */
  await page.locator('#visaoSeg .visao-b', { hasText: 'Mestrando' }).click(); await w(250);
  ok(await ev(() => __tc.App.visao) === 'mestrando', 'o clique em Mestrando troca a visão');
  const depois = await ferramentas();
  ok(!['wall', 'obj', 'light', 'terrain', 'free', 'rect', 'grupo-desenho'].some(x => depois.includes(x)) && ['select', 'pan', 'ruler', 'fog', 'fx'].every(x => depois.includes(x)), 'em Mestrando, a barra fica com o que se usa jogando: ' + j(depois));
  ok(/Mestrando: arraste os tokens/.test(await page.locator('#hint').innerText()), 'a dica embaixo explica o Mestrando');
  await foto('l83-mestrando');

  // arrastar a mesa: não sai do lugar, e o aviso oferece ir para Construção
  await arrasta([6.5 * C, 3.5 * C], [7.5 * C, 6.5 * C]);
  ok(j(await pos(P.mesa)) === j([6, 3]), 'arrastar a mesa em Mestrando: ela fica onde estava');
  ok(/só os tokens andam/.test(await avisos()) && await page.locator('.toast button', { hasText: 'Ir para Construção' }).count() > 0, 'o aviso explica e tem "Ir para Construção"');
  await foto('l83-aviso');
  await ev(() => __tc.UI.openTab('sel')); await w(200);
  ok(await ev(() => !document.querySelector('#pr-rot-l') && !document.querySelector('#pr-locked') && !!document.querySelector('#pr-construcao') && !!document.querySelector('#pr-hidden')), 'o painel da mesa em Mestrando: sem girar e travar, com ocultar e "Mexer no objeto (Construção)"');
  // o token anda
  await arrasta([2.5 * C, 2.5 * C], [4.5 * C, 2.5 * C]);
  ok(j(await pos(P.tk)) === j([4, 2]), 'o Dain anda normalmente em Mestrando');
  // a caixa de seleção por cima de tudo pega só o token
  await arrasta([0.2 * C, 0.2 * C], [15.8 * C, 9.8 * C]);
  const sel = await ev(() => __tc.App.sel.map(s => s.c + ':' + (__tc.Store.get(s.c, s.id) || {}).name));
  ok(sel.length === 1 && /Dain/.test(sel[0]), 'a caixa por cima da cena toda pega só o token: ' + j(sel));
  // arrastar a seleção a partir do token: a mesa e o tapete continuam no lugar
  await ev(o => __tc.setSel([{ c: 'tokens', id: o.tk }, { c: 'tokens', id: o.mesa }, { c: 'shapes', id: 'sh_tapete' }]), P);
  await arrasta([4.5 * C, 2.5 * C], [4.5 * C, 4.5 * C]);
  const tap = await ev(() => { const s = __tc.Store.get('shapes', 'sh_tapete'); return [s.x / 64, s.y / 64]; });
  ok(j(await pos(P.tk)) === j([4, 4]) && j(await pos(P.mesa)) === j([6, 3]) && j(tap) === j([1, 5]), 'com a mesa e o tapete na seleção, só o token anda — ' + j({ tk: await pos(P.tk), mesa: await pos(P.mesa), tap }));
  // as setas: só o token
  await ev(o => __tc.setSel([{ c: 'tokens', id: o.mesa }]), P); await page.mouse.move(cvb.x + 5, cvb.y + 5);
  await page.keyboard.press('ArrowRight'); await w(150);
  ok(j(await pos(P.mesa)) === j([6, 3]), 'as setas não empurram a mesa');
  // Delete com a mesa selecionada: não apaga
  await page.keyboard.press('Delete'); await w(200);
  ok(await ev(o => !!__tc.Store.get('tokens', o.mesa), P), 'o Delete não apaga a mesa em Mestrando');
  // o clique na porta abre
  const porta = await tela(12 * C, 1.5 * C);
  await page.mouse.click(porta[0], porta[1]); await w(200);
  ok(await ev(() => __tc.Store.get('walls', 'wl_porta').open === true), 'o clique na porta abre a porta');
  // dois cliques no lampião: apaga ou acende
  const luz0 = await ev(o => __tc.Store.get('tokens', o.lamp).light.on !== false, P);
  const lp = await tela(9.5 * C, 3.5 * C);
  await page.mouse.dblclick(lp[0], lp[1]); await w(250);
  ok(await ev(o => __tc.Store.get('tokens', o.lamp).light.on !== false, P) === !luz0, 'dois cliques no lampião trocam a luz');
  ok(j(await pos(P.lamp)) === j([9, 3]), '(e o lampião não sai do lugar)');
  // o atalho W (paredes) avisa em vez de trocar
  await page.mouse.move(cvb.x + 5, cvb.y + 5);
  await page.keyboard.press('w'); await w(150);
  ok(await ev(() => __tc.App.tool) === 'select', 'a tecla W não abre as paredes em Mestrando');
  // o menu do objeto: sem girar, travar, duplicar, apagar
  const mp = await tela(6.5 * C, 3.5 * C);
  await page.mouse.click(mp[0], mp[1], { button: 'right' }); await w(250);
  const menu = await ev(() => [...document.querySelectorAll('.menu .menu-i')].map(b => b.innerText.trim()));
  ok(!menu.some(x => /Girar|Travar|Duplicar|Apagar|frente|trás/.test(x)) && menu.some(x => /Ir para Construção|Construção/.test(x)) && menu.some(x => /Ocultar|Mostrar/.test(x)), 'o menu da mesa em Mestrando: ocultar e ir para Construção, sem girar/travar/duplicar/apagar — ' + j(menu));
  await foto('l83-menu');
  await page.keyboard.press('Escape'); await w(100);
  // o desenho (tapete) não se pega com o clique
  const tp = await tela(2 * C, 7 * C);
  await page.mouse.click(tp[0], tp[1]); await w(150);
  ok(!(await ev(() => __tc.App.sel.some(s => s.c === 'shapes'))), 'o clique no tapete (um desenho) não o seleciona');

  /* ---------- lembrar por cena ---------- */
  const outra = await ev(() => { const { Store, newScene, Persist } = __tc, sc = newScene('Rua'); Store.addScene(sc); Persist.scene(sc.id); __tc.UI.switchScene(sc.id); return sc.id; });
  await w(250);
  ok(await ev(() => __tc.App.visao) === 'construcao', 'outra cena (nunca escolhida, fora do ar) abre em Construção');
  await ev(id => __tc.UI.switchScene(id), P.sc); await w(250);
  ok(await ev(() => __tc.App.visao) === 'mestrando', 'a Taverna volta em Mestrando (a cena lembra)');
  await page.reload(); await w(1500);
  await ev(id => __tc.UI.switchScene(id), P.sc); await w(300);
  ok(await ev(() => __tc.App.visao) === 'mestrando', 'e lembra também depois de recarregar a página');

  /* ---------- Construção ---------- */
  await page.locator('#visaoSeg .visao-b', { hasText: 'Construção' }).click(); await w(250);
  const cvb2 = await page.locator('#cv').boundingBox(); cvb.x = cvb2.x; cvb.y = cvb2.y;
  await arrasta([6.5 * C, 3.5 * C], [7.5 * C, 6.5 * C]);
  ok(j(await pos(P.mesa)) === j([7, 6]), 'em Construção, a mesa volta a se mover');
  ok((await ferramentas()).includes('wall'), 'e a barra volta a ter as paredes');

  ok(!t.errs || !t.errs.length, 'sem erros no console: ' + (t.errs || []).slice(0, 3).join(' | '));
  console.log((fails ? fails + ' falharam, ' : '') + (n - fails) + ' verificações passaram');
  await t.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
