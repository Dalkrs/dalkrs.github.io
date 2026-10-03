// Bateria da v3 (Tiny Cats), no navegador. Cada seção abre a própria página, para uma não depender da outra.
// Uso: node v3.js            roda tudo
//      node v3.js travado    roda só as seções cujo nome contém "travado"
const fs = require('fs'), path = require('path');
const { open } = require('./lib');

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = path.join(__dirname, 'v3');

// Ferramentas comuns a todas as seções, presas a uma página aberta.
function kit(t) {
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 120);
  const pt = (cx, cy) => ev(([cx, cy]) => { const u = __urgm, sc = u.Store.scene(), r = u.Render.cv.getBoundingClientRect(); const [sx, sy] = u.Render.toScreen(cx * sc.cell, cy * sc.cell); return [r.left + sx, r.top + sy]; }, [cx, cy]);
  const click = async (cx, cy, opt) => { const [x, y] = await pt(cx, cy); await page.mouse.click(x, y, opt); await w(100); };
  const dbl = async (cx, cy) => { const [x, y] = await pt(cx, cy); await page.mouse.dblclick(x, y); await w(140); };
  const hover = async (cx, cy) => { const [x, y] = await pt(cx, cy); await page.mouse.move(x, y, { steps: 2 }); await w(80); };
  const drag = async (ax, ay, bx, by) => { const [x0, y0] = await pt(ax, ay), [x1, y1] = await pt(bx, by); await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up(); await w(120); };
  const key = async k => { await page.keyboard.press(k); await w(90); };
  const T = name => ev(nm => { const sc = __urgm.Store.scene(); return JSON.parse(JSON.stringify(sc.tokens.find(x => x.name === nm) || null)); }, name);
  const sel = async name => { await ev(nm => { const u = __urgm, tk = u.Store.scene().tokens.find(x => x.name === nm); u.setSel(tk ? [{ c: 'tokens', id: tk.id }] : []); }, name); await w(); };
  const viewer = async v => { await ev(v => __urgm.UI.setViewer(v), v); await w(250); };
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.firstChild.textContent));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const undo = async () => { await ev(() => __urgm.Tools.undo()); await w(); };
  const has = s => page.locator(s).count().then(c => c > 0);
  const hint = () => ev(() => document.getElementById('hint').textContent);
  const errs = (label, expected) => { const e = t.errs.filter(x => !(expected && expected.test(x))); if (e.length) { console.log(`ERROS em "${label}":\n` + e.join('\n')); fails += e.length; } t.errs.length = 0; };
  // Cor do mapa em pontos da cena (coordenadas em quadrados): [[r, g, b], …]
  const pix = pts => ev(pts => {
    const u = __urgm, sc = u.Store.scene(), cv = u.Render.cv;
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(cv, 0, 0);
    const k = cv.width / cv.getBoundingClientRect().width;
    return pts.map(([cx, cy]) => { const [sx, sy] = u.Render.toScreen(cx * sc.cell, cy * sc.cell); return Array.from(g.getImageData(Math.round(sx * k), Math.round(sy * k), 1, 1).data).slice(0, 3); });
  }, pts);
  const lum = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  // Ícone de uma abertura: { px, py } na página e { cx, cy } em quadrados; null se quem olha não o alcança.
  const spot = id => ev(id => {
    const u = __urgm, sc = u.Store.scene(), s = u.doorSpots(sc).find(x => x.w.id === id);
    if (!s) return null;
    const r = u.Render.cv.getBoundingClientRect(), [sx, sy] = u.Render.toScreen(s.x, s.y);
    return { px: r.left + sx, py: r.top + sy, cx: s.x / sc.cell, cy: s.y / sc.cell, r: 11 / u.App.view.z / sc.cell };
  }, id);
  const clickSpot = async id => { const sp = await spot(id); if (!sp) return false; await page.mouse.click(sp.px, sp.py); await w(120); return true; };
  // Corredor de teste: parede de cima a baixo em x = 6 e um token de jogador ("Vigia") à esquerda, em (3, 3).
  const corridor = async (extra) => {
    await blank(Object.assign({ fog: { dynamic: true, manual: false, explored: false, shared: true }, perms: { mover: true, barras: true, condicoes: true, auras: true, desenhar: false, efeitos: false, regua: true, ping: true, portas: true, turnos: true, mira: true } }, extra || {}));
    await ev(() => {
      const u = __urgm, S = u.Store;
      const tk = { id: 'tk_v', name: 'Vigia', x: 3 * 64, y: 3 * 64, size: 1, shape: 'circ', img: null, color: '#b9892f', owner: 'jg_dalmo', hidden: false, locked: false, showName: true, bars: [], barVis: 'num', conds: [], cinfo: {}, auras: [], vis: { on: true, range: 0, dark: 0 }, light: { on: false, bright: 4, dim: 8, c: '#ffc477' }, notes: '' };
      S.tx('x', () => { S.add('tokens', tk); S.add('walls', { id: 'w_par', k: 'wall', x1: 6 * 64, y1: 0, x2: 6 * 64, y2: 8 * 64, open: false, locked: false, secret: false }); });
      u.setSel([]);
    });
    await w(200);
  };
  // Cria ou altera uma parede pelo Store (um passo de desfazer).
  const wall = (id, p) => ev(([id, p]) => { const u = __urgm; u.Store.tx('x', () => { if (u.Store.get('walls', id)) u.Store.upd('walls', id, p); else u.Store.add('walls', Object.assign({ id, open: false, locked: false, secret: false }, p)); }); }, [id, p]);
  const getWall = id => ev(id => JSON.parse(JSON.stringify(__urgm.Store.get('walls', id) || null)), id);
  // O que quem está olhando enxerga agora naquele ponto (a visão é refeita pelo próprio quadro, não pelo teste).
  const sees = async (cx, cy) => { await w(150); return ev(([cx, cy]) => { const u = __urgm; if (u.Vision.isDirty()) u.Vision.update(u.Store.scene(), u.App.viewer); return u.Vision.canSee(cx * 64, cy * 64); }, [cx, cy]); };
  const moveTok = async (id, x, y) => { await ev(([id, x, y]) => { const u = __urgm; u.Store.tx('x', () => u.Store.upd('tokens', id, { x, y })); }, [id, x, y]); await w(120); };
  // Captura para conferência visual. Com `clip` ({ x, y, width, height } em px da página), só aquele recorte.
  const shot = async (name, clip) => { fs.mkdirSync(SHOTS, { recursive: true }); await w(250); await page.screenshot(Object.assign({ path: path.join(SHOTS, name + '.png') }, clip ? { clip } : {})); };
  // Uma cena pequena e vazia (12 × 8, clara, sem névoa), para medir uma coisa de cada vez.
  const blank = async (extra) => {
    await ev(extra => {
      const u = __urgm, S = u.Store;
      const base = JSON.parse(JSON.stringify(S.scene()));
      const sc = Object.assign(base, { id: 'cena_v3_' + Math.random().toString(36).slice(2, 7), name: 'Teste', sample: false, cols: 12, rows: 8, tokens: [], shapes: [], walls: [], lights: [], effects: [], fogOps: [], explored: {}, targets: [], light: 'claro', tone: 'dia', weather: { k: '', pow: 0.6 } });
      sc.bg = { asset: null, stretch: false, dx: 0, dy: 0, scale: 1 };
      sc.fog = { dynamic: false, manual: false, explored: false, shared: true };
      sc.turn = { on: false, round: 1, cur: null, list: [] };
      Object.assign(sc, extra || {});
      S.addScene(sc); u.UI.switchScene(sc.id);
    }, extra || null);
    await w(350);
  };
  return { page, ev, w, pt, click, dbl, hover, drag, key, T, sel, viewer, toasts, clearToasts, undo, has, hint, errs, shot, blank, pix, lum, spot, clickSpot, corridor, wall, getWall, sees, moveTok };
}

const sections = [];
const section = (name, fn, opt) => sections.push({ name, fn, opt });

/* ============ Item 5: desenho travado — selecionar com dois cliques e apagar ============ */
section('5 travado', async k => {
  const { page, ev, w, click, dbl, hover, drag, key, toasts, clearToasts, has, hint, errs, viewer, blank } = k;
  await blank();
  // um texto e um retângulo cheio, os dois travados, e um texto solto
  await ev(() => {
    const u = __urgm, S = u.Store;
    S.tx('x', () => {
      S.add('shapes', { id: 'sh_txt', k: 'text', x: 2 * 64, y: 2 * 64, txt: 'Sala do trono', fs: 40, s: '#f3ead2', sw: 0, f: null, a: 1, top: false, gm: false, lock: true, by: null });
      S.add('shapes', { id: 'sh_box', k: 'rect', x: 7 * 64, y: 1 * 64, w: 128, h: 96, s: '#f2c14e', sw: 4, f: '#f2c14e', a: 1, top: false, gm: false, lock: true, by: null });
      S.add('shapes', { id: 'sh_free', k: 'text', x: 2 * 64, y: 5 * 64, txt: 'Texto solto', fs: 40, s: '#f3ead2', sw: 0, f: null, a: 1, top: false, gm: false, lock: false, by: null });
    });
    u.setSel([]);
  });
  await w(200);
  const selIds = () => ev(() => __urgm.App.sel.map(s => s.id).join());
  const shape = id => ev(id => JSON.parse(JSON.stringify(__urgm.Store.get('shapes', id) || null)), id);
  const base = await hint();

  await click(2.6, 2.4);
  ok(await selIds() === '', 'texto travado: um clique passa direto (não seleciona)');
  await hover(2.7, 2.4);
  ok(await hint() === 'Item travado · dois cliques para selecionar', 'dica ao passar sobre o item travado: ' + await hint());
  await hover(10.5, 6.5);
  ok(await hint() === base, 'saindo de cima, a dica da ferramenta volta');
  await drag(2.6, 2.4, 4.6, 3.4);
  ok((await shape('sh_txt')).x === 2 * 64 && await selIds() === '', 'arrastar por cima de um travado não o move nem o seleciona');

  await page.waitForTimeout(450);
  await dbl(2.6, 2.4);
  ok(await selIds() === 'sh_txt', 'dois cliques selecionam o texto travado');
  ok(!(await has('.modal')), '… sem abrir a edição do texto');
  ok(await ev(() => __urgm.App.tab) === 'sel' && await page.locator('#sh-lock').isChecked() && await page.locator('.tab-body .btn', { hasText: 'Apagar' }).count() === 1, 'o painel abre com o interruptor "Travado" ligado e o botão Apagar');
  ok(await ev(() => document.querySelector('label.sw:has(#sh-lock) .sw-label').textContent) === 'Travado', 'o interruptor chama "Travado"');
  await hover(2.8, 2.4);
  ok(await hint() === 'Travado: destrave para mover', 'selecionado e travado: a dica explica por que não move — ' + await hint());
  await clearToasts();
  await drag(2.6, 2.4, 5.6, 4.4);
  ok((await shape('sh_txt')).x === 2 * 64 && (await shape('sh_txt')).y === 2 * 64, 'arrastar o travado selecionado não move');
  ok((await toasts()).some(x => x === 'Travado: destrave para mover'), 'e avisa: ' + JSON.stringify(await toasts()));
  ok(await selIds() === 'sh_txt', 'continua selecionado depois da tentativa');
  await clearToasts();

  await key('Delete');
  ok(await shape('sh_txt') === null, 'Delete apaga o texto travado selecionado');
  ok((await toasts()).some(x => x === 'Item apagado.') && await page.locator('.toast-a', { hasText: 'Desfazer' }).count() === 1, 'aviso com Desfazer');
  await page.locator('.toast-a', { hasText: 'Desfazer' }).click(); await w();
  ok((await shape('sh_txt')).lock === true && (await shape('sh_txt')).txt === 'Sala do trono', 'Desfazer devolve o texto, ainda travado');

  // Backspace, num desenho travado que não é texto
  await page.waitForTimeout(450);
  await dbl(8, 1.7);
  ok(await selIds() === 'sh_box', 'dois cliques selecionam o retângulo travado');
  ok(await ev(() => __urgm.Tools.handles().length) === 0, 'travado não mostra alças de redimensionar');
  await key('Backspace');
  ok(await shape('sh_box') === null, 'Backspace também apaga');
  await ev(() => __urgm.Tools.undo()); await w();
  ok(!!(await shape('sh_box')), 'desfazer devolve o retângulo');
  await clearToasts();

  // destravar pelo painel devolve o comportamento normal
  await page.waitForTimeout(450);
  await dbl(2.6, 2.4);
  await page.locator('label.sw:has(#sh-lock)').click(); await w();
  ok((await shape('sh_txt')).lock === false, 'destravar pelo painel');
  await drag(2.6, 2.4, 3.6, 2.4);
  ok((await shape('sh_txt')).x !== 2 * 64, 'destravado, arrastar move');
  await ev(() => __urgm.Tools.undo()); await w();

  // texto solto: dois cliques continuam editando
  await key('Escape');
  await page.waitForTimeout(450);
  await dbl(2.6, 5.4);
  ok(await has('.modal') && await page.locator('#dlg-in').inputValue() === 'Texto solto', 'texto solto: dois cliques abrem a edição, como antes');
  await key('Escape');

  // botão direito continua igual
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.upd('shapes', 'sh_txt', { lock: true })); u.setSel([]); }); await w();
  await click(2.6, 2.4, { button: 'right' }); await w(120);
  ok(await page.locator('.menu-i', { hasText: 'Destravar' }).count() === 1 && await page.locator('.menu-i', { hasText: 'Apagar' }).count() === 1, 'botão direito no travado: Destravar e Apagar, como antes');
  await key('Escape');

  // o jogador não recebe a dica de um desenho do mestre (ele não pode selecionar)
  await ev(() => { const u = __urgm; u.setSel([]); });
  await viewer('jg_dalmo');
  await hover(2.7, 2.4);
  ok(await hint() !== 'Item travado · dois cliques para selecionar', 'jogador: sem dica sobre o desenho travado do mestre');
  await page.waitForTimeout(450);
  await dbl(2.6, 2.4);
  ok(await selIds() === '', 'jogador: dois cliques não selecionam o desenho do mestre');
  await viewer('gm');
  errs('travado');
});

/* ============ Item 7: número flutuante = nome da barra + quanto, em todo caminho que mexe numa barra ============ */
section('7 flutuante', async k => {
  const { page, ev, w, sel, errs, clearToasts } = k;
  const floats = () => ev(() => __urgm.App.floats.map(f => f.text + '|' + f.c));
  const reset = () => ev(() => { __urgm.App.floats.length = 0; });
  const RED = '#ff8f80', GREEN = '#86e8ad';

  // faixa do token (HUD)
  await sel('Dain X'); await reset();
  await page.locator('#hud-b0').fill('-8'); await page.locator('#hud-b0').press('Enter'); await w();
  ok((await floats()).join() === `Vida −8|${RED}`, 'faixa: "Vida −8", com o sinal de menos tipográfico e a cor de dano — ' + await floats());
  // painel
  await reset();
  await page.locator('#tk-b2-v').fill('+2'); await page.locator('#tk-b2-v').press('Tab'); await w();
  ok((await floats()).join() === `Fé +2|${GREEN}`, 'painel: "Fé +2" na cor de cura — ' + await floats());
  // valor absoluto digitado também diz de quanto foi a mudança
  await reset();
  const before = await ev(() => __urgm.Store.scene().tokens.find(t => t.name === 'Dain X').bars[1].v);
  await page.locator('#tk-b1-v').fill(String(before - 3)); await page.locator('#tk-b1-v').press('Tab'); await w();
  ok((await floats()).join() === `SP −3|${RED}`, 'painel, valor absoluto: mostra a diferença — ' + await floats());
  // bolinhas (pontos)
  await reset();
  await page.locator('#hud-b3-p5').click(); await w();
  ok((await floats()).join() === `Poder divino +2|${GREEN}`, 'bolinhas: "Poder divino +2" — ' + await floats());
  await reset();
  await page.locator('#tk-b3-p1').click(); await w();
  ok((await floats()).join() === `Poder divino −4|${RED}`, 'bolinhas no painel: "Poder divino −4" — ' + await floats());
  // vários tokens
  await ev(() => { const u = __urgm; u.setSel(u.Store.scene().tokens.filter(t => ['Astie', 'Kairo'].includes(t.name)).map(t => ({ c: 'tokens', id: t.id }))); }); await w();
  await reset();
  await page.locator('#mt-bar').selectOption('SP'); await page.locator('#mt-amt').fill('5'); await page.locator('#mt-amt').press('Enter'); await w();
  ok((await floats()).join() === `SP −5|${RED},SP −5|${RED}`, 'vários tokens: um número por token, com o nome — ' + await floats());
  // aplicação em área (janela)
  await reset();
  await ev(() => { const u = __urgm, sc = u.Store.scene(); u.UI.areaBox('Teste', sc.tokens.filter(t => ['Bandido', 'Bandida'].includes(t.name)), null); }); await w();
  await page.locator('#ar-amt').fill('+1'); await page.locator('.modal .btn.primary').click(); await w(200);
  ok((await floats()).join() === `Vida +1|${GREEN}`, 'área: só quem mudou ganha número (a Bandida já estava cheia) — ' + await floats());
  await reset();
  await ev(() => { const u = __urgm, sc = u.Store.scene(); u.UI.areaBox('Teste', sc.tokens.filter(t => ['Bandido', 'Bandida'].includes(t.name)), null); }); await w();
  await page.locator('#ar-amt').fill('4'); await page.locator('#ar-half-1').click(); await page.locator('.modal .btn.primary').click(); await w(200);
  ok((await floats()).join() === `Vida −4|${RED},Vida −2|${RED}`, 'área com metade: "Vida −4" e "Vida −2" — ' + await floats());
  // duas barras do mesmo token de uma vez: os dois números empilham
  await reset();
  await ev(() => { const u = __urgm, tk = u.Store.scene().tokens.find(t => t.name === 'Dain X'); u.Store.tx('x', () => u.Store.upd('tokens', tk.id, { bars: tk.bars.map((b, i) => (i < 2 ? Object.assign({}, b, { v: b.v - 1 }) : b)) })); }); await w();
  ok((await floats()).join() === `Vida −1|${RED},SP −1|${RED}`, 'duas barras na mesma alteração: um número para cada — ' + await floats());
  // o desenho dos números não quebra o quadro
  await w(300);
  ok(await ev(() => (__urgm.Render.stats.fail || 0)) === 0, 'os números são desenhados sem erro');
  await clearToasts();
  errs('flutuante');
});

/* ============ Item 6: janela (ou porta) em cima de uma parede deixa de ser tapada pela parede ============ */
section('6 abertura sobre parede', async k => {
  const { page, ev, w, click, drag, key, viewer, clearToasts, errs, blank, pix } = k;
  // corredor: parede de cima a baixo em x = 6; um token de jogador à esquerda
  await blank({ fog: { dynamic: true, manual: false, explored: false, shared: true }, perms: { mover: true, barras: true, condicoes: true, auras: true, desenhar: false, efeitos: false, regua: true, ping: true, portas: true, turnos: true, mira: true } });
  await ev(() => {
    const u = __urgm, S = u.Store, sc = S.scene();
    const tk = { id: 'tk_v', name: 'Vigia', x: 3 * 64, y: 3 * 64, size: 1, shape: 'circ', img: null, color: '#b9892f', owner: 'jg_dalmo', hidden: false, locked: false, showName: true, bars: [], barVis: 'num', conds: [], cinfo: {}, auras: [], vis: { on: true, range: 0, dark: 0 }, light: { on: false, bright: 4, dim: 8, c: '#ffc477' }, notes: '' };
    S.tx('x', () => { S.add('tokens', tk); S.add('walls', { id: 'w_par', k: 'wall', x1: 6 * 64, y1: 0, x2: 6 * 64, y2: 8 * 64, open: false, locked: false, secret: false }); });
    u.setSel([]);
  });
  await w(200);
  const sees = (cx, cy) => ev(([cx, cy]) => { const u = __urgm, sc = u.Store.scene(); u.Vision.update(sc, u.App.viewer); return u.Vision.canSee(cx * 64, cy * 64); }, [cx, cy]);
  const home = async () => { await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.upd('tokens', 'tk_v', { x: 3 * 64, y: 3 * 64 })); }); await w(120); };
  const crosses = async () => { await home(); await drag(3.5, 3.5, 9.5, 3.5); const x = await ev(() => __urgm.Store.get('tokens', 'tk_v').x); await home(); return x > 6 * 64; };
  const wall = (id, p) => ev(([id, p]) => { const u = __urgm; u.Store.tx('x', () => { if (u.Store.get('walls', id)) u.Store.upd('walls', id, p); else u.Store.add('walls', Object.assign({ id, open: false, locked: false, secret: false }, p)); }); }, [id, p]);
  const del = id => ev(id => { const u = __urgm; u.Store.tx('x', () => u.Store.del('walls', id)); }, id);

  await viewer('jg_dalmo');
  ok(!(await sees(9.5, 3.5)) && !(await crosses()), 'só a parede: o jogador não vê nem passa');

  // o defeito relatado: janela desenhada EM CIMA da parede (y de 3 a 4)
  await viewer('gm');
  await wall('w_jan', { k: 'window', x1: 6 * 64, y1: 3 * 64, x2: 6 * 64, y2: 4 * 64 }); await w(150);
  await viewer('jg_dalmo');
  ok(await sees(9.5, 3.5), 'janela sobre a parede: o jogador enxerga através dela (antes a parede de baixo tapava)');
  ok(!(await sees(9.5, 0.5)) && !(await sees(9.5, 7.5)), '… mas só pelo vão: o resto da parede continua tapando');
  ok(!(await crosses()), '… e a janela fechada continua barrando a passagem');
  ok(await ev(() => __urgm.Store.scene().walls.find(x => x.id === 'w_par').y2) === 8 * 64, 'a parede salva continua inteira (nada foi regravado)');
  await clearToasts();

  // apagar a abertura devolve a parede
  await viewer('gm'); await del('w_jan'); await w(150); await viewer('jg_dalmo');
  ok(!(await sees(9.5, 3.5)), 'apagada a janela, a parede volta a tapar');
  await viewer('gm'); await ev(() => __urgm.Tools.undo()); await w(150); await viewer('jg_dalmo');
  ok(await sees(9.5, 3.5), 'desfazer devolve a janela e a visão por ela');

  // porta sobre a parede: fechada tapa e barra; aberta, o vão fica livre de verdade
  await viewer('gm'); await del('w_jan'); await wall('w_por', { k: 'door', x1: 6 * 64, y1: 3 * 64, x2: 6 * 64, y2: 4 * 64 }); await w(150); await viewer('jg_dalmo');
  ok(!(await sees(9.5, 3.5)) && !(await crosses()), 'porta fechada sobre a parede: não vê, não passa');
  await viewer('gm'); await wall('w_por', { open: true }); await w(150); await viewer('jg_dalmo');
  ok(await sees(9.5, 3.5) && await crosses(), 'porta aberta sobre a parede: vê e passa (antes a parede de baixo barrava os dois)');
  await clearToasts();

  // porta secreta sobre a parede: para o jogador, igual a parede
  await viewer('gm'); await wall('w_por', { open: false, secret: true }); await w(150); await viewer('jg_dalmo');
  ok(!(await sees(9.5, 3.5)) && !(await crosses()), 'porta secreta sobre a parede: tapa e barra como parede');
  await clearToasts();
  await viewer('gm'); await del('w_por');

  // desenho do mestre: no trecho da janela não aparece o traço âmbar da parede
  await wall('w_jan', { k: 'window', x1: 6 * 64, y1: 3 * 64, x2: 6 * 64, y2: 4 * 64 });
  await key('w'); await w(250);
  const amber = c => c[0] > 200 && c[1] > 150 && c[1] < 225 && c[2] < 150;
  const along = (y0, y1) => Array.from({ length: 24 }, (_, i) => [6, y0 + (y1 - y0) * (i + 0.5) / 24]);
  const onWall = (await pix(along(0.3, 2.7))).filter(amber).length, onWin = (await pix(along(3.1, 3.9))).filter(amber).length;
  ok(onWall >= 22 && onWin === 0, `o traço da parede aparece nos restos (${onWall}/24) e some no trecho da janela (${onWin}/24)`);
  await k.shot('tmp-6-parede-janela');

  // clique com a ferramenta de paredes: no trecho da janela, pega a janela; no resto, a parede
  const selWall = () => ev(() => __urgm.App.sel.filter(s => s.c === 'walls').map(s => s.id).join());
  await click(6, 3.5);
  ok(await selWall() === 'w_jan', 'clique no trecho da janela seleciona a janela, não a parede escondida embaixo: ' + await selWall());
  await click(6, 1.5);
  ok(await selWall() === 'w_par', 'clique no resto seleciona a parede');
  // cortina empilhada sobre a janela: o primeiro clique pega a de cima; o segundo, a de baixo
  await wall('w_cor', { k: 'veil', x1: 6 * 64, y1: 3 * 64, x2: 6 * 64, y2: 4 * 64 }); await w(150);
  await ev(() => __urgm.setSel([])); await w();
  await click(6, 3.5);
  const first = await selWall();
  await page.waitForTimeout(450);
  await click(6, 3.5);
  const second = await selWall();
  ok(first === 'w_cor' && second === 'w_jan', `empilhadas: um clique pega a de cima, outro passa para a de baixo (${first} → ${second})`);
  await key('Delete');
  ok(await ev(() => __urgm.Store.scene().walls.map(x => x.id).join()) === 'w_par,w_cor', 'Delete apaga só a que está selecionada');
  await key('v'); await clearToasts();

  // a reconstrução cabe com folga num quadro, mesmo numa cena pesada
  const ms = await ev(() => {
    const u = __urgm, S = u.Store, sc = S.scene();
    S.tx('x', () => { for (let i = 0; i < 300; i++) S.add('walls', { id: 'm' + i, k: i % 4 ? 'wall' : ['door', 'window', 'veil'][i % 3], x1: (i % 12) * 64, y1: (i % 8) * 64, x2: (i % 12) * 64 + 64, y2: (i % 8) * 64, open: false, locked: false, secret: false }); });
    const t0 = performance.now();
    for (let i = 0; i < 30; i++) { u.Walls.invalidate(); u.Walls.of(sc); }
    const each = (performance.now() - t0) / 30;
    S.undo();
    return each;
  });
  ok(ms < 8, `paredes efetivas com 300 trechos: ${ms.toFixed(2)} ms por reconstrução`);
  errs('abertura sobre parede');
});

/* ============ Item 8: janela e cortina abrem e fecham como a porta ============ */
section('8 abrir e fechar', async k => {
  const { page, ev, w, click, drag, key, viewer, toasts, clearToasts, errs, corridor, wall, getWall, sees, moveTok, spot, clickSpot, pix, has } = k;
  await corridor();
  const home = () => moveTok('tk_v', 3 * 64, 3 * 64);
  const crosses = async () => { await home(); await drag(3.5, 3.5, 9.5, 3.5); const x = await ev(() => __urgm.Store.get('tokens', 'tk_v').x); await home(); return x > 6 * 64; };
  const MID = { x1: 6 * 64, y1: 3 * 64, x2: 6 * 64, y2: 4 * 64, locked: false };

  // a tabela inteira, vista pelo jogador, com o trecho desenhado EM CIMA da parede: [enxerga além, atravessa]
  await viewer('jg_dalmo');
  const table = {};
  for (const [name, p] of [['parede', { k: 'wall', secret: false, open: false }], ['porta fechada', { k: 'door', secret: false, open: false }], ['porta aberta', { k: 'door', secret: false, open: true }], ['porta secreta', { k: 'door', secret: true, open: false }],
    ['janela fechada', { k: 'window', secret: false, open: false }], ['janela aberta', { k: 'window', secret: false, open: true }], ['cortina fechada', { k: 'veil', secret: false, open: false }], ['cortina aberta', { k: 'veil', secret: false, open: true }]]) {
    await wall('w_mid', Object.assign({}, MID, p));
    table[name] = [await sees(9.5, 3.5), await crosses()];
    await clearToasts();
  }
  ok(JSON.stringify(table) === JSON.stringify({ parede: [false, false], 'porta fechada': [false, false], 'porta aberta': [true, true], 'porta secreta': [false, false],
    'janela fechada': [true, false], 'janela aberta': [true, true], 'cortina fechada': [false, true], 'cortina aberta': [true, true] }), 'jogador, de longe: [enxerga além, atravessa] por tipo e estado — ' + JSON.stringify(table));
  await viewer('gm');

  // clique no ícone, pelo mestre: abre e fecha, com aviso e Desfazer
  const ring = async id => { const sp = await spot(id); return (await pix([[sp.cx + sp.r, sp.cy]]))[0]; };      // um ponto do aro do ícone
  const isOpen = c => c[1] > c[0] + 35, isClosed = c => c[0] > 170 && Math.abs(c[0] - c[1]) < 25;
  for (const [kind, Name] of [['window', 'Janela'], ['veil', 'Cortina'], ['door', 'Porta']]) {
    await wall('w_mid', Object.assign({}, MID, { k: kind, secret: false, open: false })); await w(200);
    ok(!!(await spot('w_mid')), `${Name}: tem ícone clicável no mapa`);
    const c0 = await ring('w_mid');
    await clearToasts();
    await clickSpot('w_mid');
    ok((await getWall('w_mid')).open === true && (await toasts()).some(x => x === `${Name} aberta`), `${Name}: o clique abre e avisa "${Name} aberta" — ` + JSON.stringify(await toasts()));
    ok(await page.locator('.toast-a', { hasText: 'Desfazer' }).count() === 1, `${Name}: o aviso oferece Desfazer`);
    await w(150);
    const c1 = await ring('w_mid');
    ok(isClosed(c0) && isOpen(c1), `${Name}: o ícone mostra o estado (aro claro fechada ${c0}, verde aberta ${c1})`);
    await clearToasts();
    await clickSpot('w_mid');
    ok((await getWall('w_mid')).open === false && (await toasts()).some(x => x === `${Name} fechada`), `${Name}: outro clique fecha e avisa "${Name} fechada"`);
    await page.locator('.toast-a', { hasText: 'Desfazer' }).click(); await w();
    ok((await getWall('w_mid')).open === true, `${Name}: Desfazer do aviso reabre`);
    await clearToasts();
  }

  // jogador: a mesma regra das portas (permissão da cena e tranca)
  await wall('w_mid', Object.assign({}, MID, { k: 'window', secret: false, open: false }));
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.scn({ perms: Object.assign({}, u.Store.scene().perms, { portas: false }) })); });
  await viewer('jg_dalmo'); await clearToasts();
  ok(!!(await spot('w_mid')), 'jogador vê o ícone da janela que ele enxerga');
  await clickSpot('w_mid');
  ok((await getWall('w_mid')).open === false && (await toasts()).some(x => /não liberou abrir janelas/.test(x)), 'jogador sem a permissão: não abre, e o aviso explica — ' + JSON.stringify(await toasts()));
  await viewer('gm');
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.scn({ perms: Object.assign({}, u.Store.scene().perms, { portas: true }) })); });
  await viewer('jg_dalmo'); await clearToasts();
  await clickSpot('w_mid');
  ok((await getWall('w_mid')).open === true, 'jogador com a permissão abre a janela');
  ok(await crosses(), '… e passa por ela');
  await viewer('gm'); await wall('w_mid', { k: 'veil', open: false, locked: true }); await viewer('jg_dalmo'); await clearToasts();
  await clickSpot('w_mid');
  ok((await getWall('w_mid')).open === false && (await toasts()).some(x => x === 'Está trancada.'), 'cortina trancada: o jogador não abre');
  await viewer('gm'); await clearToasts();
  await clickSpot('w_mid');
  ok((await getWall('w_mid')).open === true, 'o mestre abre mesmo trancada');
  await clearToasts();

  // painel da parede: controle Aberta/Fechada e tranca, para porta, janela e cortina
  await key('w');
  for (const [kind, title] of [['window', 'Janela'], ['veil', 'Cortina'], ['door', 'Porta']]) {
    await wall('w_mid', Object.assign({}, MID, { k: kind, secret: false, open: false }));
    await ev(() => __urgm.setSel([{ c: 'walls', id: 'w_mid' }])); await w(150);
    const lab = () => ev(() => { const l = document.querySelector('label.sw:has(#wl-open) .sw-label'); return l ? l.textContent : null; });
    ok(await ev(() => document.querySelector('.p-title').textContent) === title && await lab() === 'Fechada' && await has('#wl-lock'), `painel de ${title}: interruptor "Fechada" e tranca`);
    await page.locator('label.sw:has(#wl-open)').click(); await w(150);
    ok((await getWall('w_mid')).open === true && await lab() === 'Aberta' && await page.locator('#wl-open').isChecked(), `painel de ${title}: ligar abre, e o rótulo vira "Aberta"`);
    await page.locator('label.sw:has(#wl-lock)').click(); await w(150);
    ok((await getWall('w_mid')).locked === true, `painel de ${title}: trancar`);
    await ev(() => __urgm.Tools.undo()); await ev(() => __urgm.Tools.undo()); await w(150);
    ok((await getWall('w_mid')).open === false && (await getWall('w_mid')).locked === false, `painel de ${title}: cada mudança é um passo de desfazer`);
  }
  await wall('w_mid', Object.assign({}, MID, { k: 'wall', secret: false, open: false })); await w(150);
  await ev(() => __urgm.setSel([{ c: 'walls', id: 'w_mid' }])); await w(150);
  ok(!(await has('#wl-open')) && !(await has('#wl-lock')), 'parede comum não tem "aberta" nem tranca');
  await wall('w_mid', Object.assign({}, MID, { k: 'door', secret: true, open: false })); await w(150);
  ok(!(await has('#wl-open')) && await has('#wl-reveal'), 'porta secreta continua sem "aberta": abrir é revelar');
  // vários trechos selecionados: o rótulo resume o estado
  await wall('w_mid', Object.assign({}, MID, { k: 'window', secret: false, open: true }));
  await wall('w_m2', { k: 'window', x1: 9 * 64, y1: 1 * 64, x2: 9 * 64, y2: 2 * 64 });
  await ev(() => __urgm.setSel([{ c: 'walls', id: 'w_mid' }, { c: 'walls', id: 'w_m2' }])); await w(150);
  ok(await ev(() => document.querySelector('label.sw:has(#wl-open) .sw-label').textContent) === 'Algumas abertas', 'duas janelas, uma aberta: "Algumas abertas"');
  await page.locator('label.sw:has(#wl-open)').click(); await w(150);
  ok((await getWall('w_m2')).open === true && await ev(() => document.querySelector('label.sw:has(#wl-open) .sw-label').textContent) === 'Abertas', 'ligar abre as duas');
  await key('v'); await clearToasts();
  errs('abrir e fechar');
});

/* ============ Item 9: cortina fechada só deixa ver quem está encostado nela ============ */
section('9 cortina', async k => {
  const { page, ev, w, drag, viewer, clearToasts, errs, corridor, wall, sees, moveTok, shot, pix, lum } = k;
  await corridor();
  await wall('w_cor', { k: 'veil', x1: 6 * 64, y1: 3 * 64, x2: 6 * 64, y2: 4 * 64 });       // em cima da parede, y de 3 a 4
  await viewer('jg_dalmo');
  // o token mede 1 quadrado: encostado até o centro ficar a 80 px (32 + 48) da cortina
  const atDist = d => moveTok('tk_v', 6 * 64 - d - 32, 3 * 64);
  await atDist(160);
  ok(!(await sees(9.5, 3.5)), 'a 2,5 quadrados: a cortina fechada tapa');
  await atDist(96);
  ok(!(await sees(9.5, 3.5)), 'um quadrado de distância (centro a 96 px): ainda tapa');
  await shot('03b-cortina-um-quadrado-longe');
  await atDist(81);
  ok(!(await sees(9.5, 3.5)), 'a 81 px: do lado de fora do limite, tapa');
  await atDist(80);
  ok(await sees(9.5, 3.5), 'a 80 px: no limite, já enxerga através');
  await atDist(32);
  ok(await sees(9.5, 3.5), 'encostado (centro a 32 px): enxerga através da cortina fechada');
  ok(!(await sees(6.5, 0.5)) && !(await sees(6.5, 7.5)), '… só pelo vão dela: logo atrás da parede, acima e abaixo, continua tapado');
  await shot('03a-cortina-encostado');
  // sair de perto tapa de novo; voltar, abre de novo (nada fica guardado de uma posição para a outra)
  await atDist(96);
  ok(!(await sees(9.5, 3.5)), 'afastou: tapa de novo');
  await drag(4.5, 3.5, 5.5, 3.5);
  ok(await ev(() => __urgm.Store.get('tokens', 'tk_v').x) === 5 * 64 && await sees(9.5, 3.5), 'arrastado para o quadrado ao lado da cortina: volta a ver');
  await drag(5.5, 3.5, 5.5, 6.5);
  ok(!(await sees(9.5, 3.5)), 'desceu três quadrados ao longo da parede: longe da cortina, tapa');
  // atravessar pode sempre; do outro lado, encostado, vê de volta
  await drag(5.5, 6.5, 5.5, 3.5);
  await drag(5.5, 3.5, 6.5, 3.5);
  ok(await ev(() => __urgm.Store.get('tokens', 'tk_v').x) === 6 * 64 && await sees(2.5, 3.5), 'atravessa a cortina fechada e, encostado do outro lado, vê o lado de onde veio');
  await clearToasts();
  await moveTok('tk_v', 3 * 64, 3 * 64);

  // dois jogadores, visão individual: cada um pela própria distância
  await viewer('gm');
  await ev(() => {
    const u = __urgm, S = u.Store, sc = S.scene();
    if (!S.S.players.some(p => p.id === 'p_b')) S.S.players.push({ id: 'p_b', name: 'Bia', color: '#ee8a4a' });
    const tk = JSON.parse(JSON.stringify(S.get('tokens', 'tk_v')));
    Object.assign(tk, { id: 'tk_b', name: 'Batedora', owner: 'p_b', x: 5 * 64, y: 3 * 64 });
    S.tx('x', () => { S.add('tokens', tk); S.scn({ fog: Object.assign({}, sc.fog, { shared: false }) }); });
    S.meta();
  });
  await viewer('p_b');
  ok(await sees(9.5, 3.5), 'visão individual: a Batedora, encostada, vê através');
  await viewer('jg_dalmo');
  ok(!(await sees(9.5, 3.5)), '… e o Vigia, longe, não');
  await viewer('gm');
  await ev(() => { const u = __urgm, sc = u.Store.scene(); u.Store.tx('x', () => u.Store.scn({ fog: Object.assign({}, sc.fog, { shared: true }) })); });
  await viewer('jg_dalmo');
  ok(await sees(9.5, 3.5), 'visão em grupo: o que a Batedora vê pela cortina vale para o grupo');
  await viewer('gm');
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.del('tokens', 'tk_b')); });

  // token grande: o limite acompanha o tamanho (2 quadrados → 64 + 48 = 112 px)
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.upd('tokens', 'tk_v', { size: 2, x: 6 * 64 - 113 - 64, y: 2.5 * 64 })); });
  await viewer('jg_dalmo');
  ok(!(await sees(9.5, 3.5)), 'token de 2 quadrados a 113 px: tapa');
  await moveTok('tk_v', 6 * 64 - 112 - 64, 2.5 * 64);
  ok(await sees(9.5, 3.5), 'token de 2 quadrados a 112 px: vê');
  await viewer('gm');
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.upd('tokens', 'tk_v', { size: 1, x: 3 * 64, y: 3 * 64 })); });

  // luz não é "quem olha": cortina fechada barra a luz mesmo com alguém encostado
  await ev(() => { const u = __urgm; u.Store.tx('x', () => { u.Store.scn({ light: 'escuro' }); u.Store.add('lights', { id: 'lz', name: 'Tocha', x: 4.5 * 64, y: 3.5 * 64, bright: 6, dim: 10, c: '#ffc477', on: true }); }); });
  await moveTok('tk_v', 5 * 64, 3 * 64);
  await viewer('jg_dalmo');
  ok(await sees(4.5, 3.5) && !(await sees(9.5, 3.5)), 'no escuro, com a luz do lado de cá: encostado na cortina, o outro lado continua escuro (a luz não atravessa)');
  await viewer('gm');
  await wall('w_cor', { open: true });
  await viewer('jg_dalmo');
  ok(await sees(9.5, 3.5), 'cortina aberta: a luz e a visão passam');
  await viewer('gm');
  errs('cortina');
});

/* ============ Itens 8 e 9: cortina sobre janela (duas aberturas empilhadas) ============ */
section('8 9 janela e cortina juntas', async k => {
  const { page, ev, w, drag, viewer, toasts, clearToasts, errs, corridor, wall, getWall, sees, moveTok, spot, clickSpot, shot } = k;
  await corridor();
  const SEG = { x1: 6 * 64, y1: 3 * 64, x2: 6 * 64, y2: 4 * 64 };
  await wall('w_jan', Object.assign({ k: 'window' }, SEG));
  await wall('w_cor', Object.assign({ k: 'veil' }, SEG));
  await w(200);
  // os dois ícones cairiam no mesmo ponto: ficam lado a lado, ao longo do trecho
  const a = await spot('w_jan'), b = await spot('w_cor');
  const gap = Math.hypot(a.px - b.px, a.py - b.py);
  ok(Math.abs(gap - 24) < 0.6 && Math.abs(a.px - b.px) < 0.6, `os dois ícones se afastam ao longo do trecho (${gap.toFixed(1)} px entre os centros, sem se sobrepor)`);
  ok(Math.abs((a.py + b.py) / 2 - (await k.pt(6, 3.5))[1]) < 0.6, 'e continuam centrados no meio do trecho');
  // de perto (a seção roda com 2 px de tela por px de página, para os ícones saírem nítidos na captura)
  const close = { x: Math.round(a.px - 260), y: Math.round((a.py + b.py) / 2 - 170), width: 520, height: 340 };
  await shot('04-janela-e-cortina', close);
  await clearToasts();
  await clickSpot('w_cor');
  ok((await getWall('w_cor')).open === true && (await getWall('w_jan')).open === false && (await toasts()).join() === 'Cortina aberta', 'clicar no ícone da cortina abre só a cortina');
  await clearToasts();
  await clickSpot('w_jan');
  ok((await getWall('w_jan')).open === true && (await toasts()).join() === 'Janela aberta', 'clicar no ícone da janela abre só a janela');
  await clearToasts();
  // em outro zoom os ícones continuam separados e clicáveis
  await ev(() => { const u = __urgm; const [cw, ch] = u.Render.size(); u.Render.zoomAt(cw / 2, ch / 2, 0.45); }); await w(200);
  const a2 = await spot('w_jan'), b2 = await spot('w_cor');
  ok(Math.abs(Math.hypot(a2.px - b2.px, a2.py - b2.py) - 24) < 0.6, 'com o mapa afastado, a distância na tela entre os ícones é a mesma');
  await clickSpot('w_jan');
  ok((await getWall('w_jan')).open === false && (await getWall('w_cor')).open === true, 'e cada um continua acertando a sua abertura');
  await ev(() => __urgm.Render.fit()); await w(200); await clearToasts();

  // trancadas: o mestre vê um cadeado pequeno no canto, e o desenho continua dizendo o tipo e o estado de cada uma
  await wall('w_jan', { open: false, locked: true }); await wall('w_cor', { open: true, locked: true }); await w(250);
  const look = async id => { const sp = await spot(id); const [ring, badge] = await k.pix([[sp.cx - sp.r, sp.cy], [sp.cx + 0.42 * sp.r, sp.cy - 0.8 * sp.r]]); return { ring, badge }; };
  const isRed = c => c[0] > 150 && c[1] < 120 && c[2] < 120, ringRed = c => c[0] > 200 && c[1] < 180 && c[0] - c[1] > 60, ringGreen = c => c[1] > 180 && c[1] - c[0] > 40;
  let lj = await look('w_jan'), lc = await look('w_cor');
  ok(ringRed(lj.ring) && isRed(lj.badge), `mestre, janela fechada e trancada: aro vermelho e cadeado no canto (aro ${lj.ring}, canto ${lj.badge})`);
  ok(ringGreen(lc.ring) && isRed(lc.badge), `mestre, cortina ABERTA e trancada: o aro continua verde (dá para ver que está aberta) e o cadeado aparece (aro ${lc.ring}, canto ${lc.badge})`);
  const s2 = await spot('w_jan'), s3 = await spot('w_cor');
  await shot('04b-trancadas-janela-fechada-cortina-aberta', { x: Math.round(s2.px - 260), y: Math.round((s2.py + s3.py) / 2 - 170), width: 520, height: 340 });
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.scn({ fog: Object.assign({}, u.Store.scene().fog, { dynamic: false }) })); });      // sem névoa, para o jogador alcançar os dois ícones de onde está
  await viewer('jg_dalmo');
  lj = await look('w_jan'); lc = await look('w_cor');
  ok(!isRed(lj.badge) && !isRed(lc.badge) && !ringRed(lj.ring) && ringGreen(lc.ring), `jogador: sem cadeado e sem vermelho (a tranca é assunto do mestre); o estado continua à vista (janela ${lj.ring}, cortina ${lc.ring})`);
  await viewer('gm');
  await ev(() => __urgm.Tools.undo());
  await wall('w_jan', { open: false, locked: false }); await wall('w_cor', { open: false, locked: false }); await w(200);

  // cada uma pela própria regra: [de longe vê além, encostado vê além, atravessa]
  await viewer('jg_dalmo');
  const home = () => moveTok('tk_v', 3 * 64, 3 * 64);
  const combo = async (jOpen, cOpen) => {
    await viewer('gm'); await wall('w_jan', { open: jOpen }); await wall('w_cor', { open: cOpen }); await viewer('jg_dalmo');
    await home();
    const far = await sees(9.5, 3.5);
    await moveTok('tk_v', 5 * 64, 3 * 64);
    const near = await sees(9.5, 3.5);
    await home();
    await drag(3.5, 3.5, 9.5, 3.5);
    const crossed = (await ev(() => __urgm.Store.get('tokens', 'tk_v').x)) > 6 * 64;
    await clearToasts();
    return [far, near, crossed];
  };
  const got = { ff: await combo(false, false), af: await combo(true, false), fa: await combo(false, true), aa: await combo(true, true) };
  ok(JSON.stringify(got) === JSON.stringify({ ff: [false, true, false], af: [false, true, true], fa: [true, true, false], aa: [true, true, true] }),
    'janela/cortina (f fechada, a aberta) → [de longe vê, encostado vê, atravessa]: ' + JSON.stringify(got));
  await viewer('gm');
  errs('janela e cortina');
}, { dpr: 2 });

/* ============ Item 3: véu do mestre sobre o que os jogadores não veem ============ */
section('3 véu', async k => {
  const { page, ev, w, viewer, toasts, clearToasts, errs, corridor, wall, sel, pix, lum, spot, has, moveTok } = k;
  await corridor();
  // um NPC (sem dono) do outro lado da parede, e uma porta lá longe, para conferir o que fica por cima do véu
  await ev(() => {
    const u = __urgm, S = u.Store;
    const g = JSON.parse(JSON.stringify(S.get('tokens', 'tk_v')));
    Object.assign(g, { id: 'tk_g', name: 'Guarda', owner: null, x: 9 * 64, y: 5 * 64, color: '#9c4a45' });
    S.tx('x', () => { S.add('tokens', g); S.add('walls', { id: 'w_dr', k: 'door', x1: 9 * 64, y1: 1 * 64, x2: 10 * 64, y2: 1 * 64, open: false, locked: false, secret: false }); });
    u.setSel([]);
  });
  await w(250);
  const veil = () => ev(() => { const u = __urgm; if (u.Vision.isDirty()) u.Vision.update(u.Store.scene(), u.App.viewer); return u.Vision.out.veil ? u.Vision.out.veilOf : null; });
  const chip = () => ev(() => { const c = document.getElementById('veilchip'); return c.hidden ? null : document.getElementById('veilText').textContent; });
  const P = { left: [2.5, 6.5], right: [8.5, 6.5], out: [-0.4, 4], guard: [9.5, 5.5] };
  const read = async () => { await w(200); const [left, right, out, guard] = await pix([P.left, P.right, P.out, P.guard]); return { left, right, out, guard }; };
  const same = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= 6;
  const darker = (a, b) => lum(a) < lum(b) * 0.72;                  // véu de ~50% sobre o mapa

  // desligado: nada muda
  ok(await veil() === null && await chip() === null, 'por padrão não há véu nem legenda');
  const off = await read();

  // ligar pelo interruptor da aba Cena
  await page.locator('#tab-scene').click(); await w();
  ok(await ev(() => document.querySelector('label.sw:has(#sc-showvis) .sw-label').textContent) === 'Escurecer o que os jogadores não veem', 'o interruptor chama "Escurecer o que os jogadores não veem"');
  await page.locator('label.sw:has(#sc-showvis)').click(); await w(250);
  ok(await veil() === '*' && await ev(() => __urgm.Store.S.prefs.showVision) === true && await ev(() => __urgm.App.showVision) === true, 'ligado: véu do grupo, e a escolha fica guardada na mesma preferência de antes');
  ok(await chip() === 'Véu: visão dos jogadores', 'legenda sobre o mapa: ' + await chip());
  const on = await read();
  ok(darker(on.right, off.right), `o que os jogadores não veem fica mais escuro para o mestre (${off.right} → ${on.right})`);
  ok(same(on.left, off.left), `o que eles veem continua com o brilho normal (${off.left} → ${on.left})`);
  ok(same(on.out, off.out), 'fora do retângulo da cena o véu não aparece');
  ok(darker(on.guard, off.guard), `o véu passa por cima dos tokens: o Guarda, que ninguém vê, escurece (${off.guard} → ${on.guard})`);
  ok(lum(on.right) > 12, 'o véu é translúcido: o mapa continua visível por baixo (' + on.right + ')');
  // o que é da interface fica por cima do véu: o aro do ícone da porta continua claro
  const sp = await spot('w_dr');
  const ring = (await pix([[sp.cx + sp.r, sp.cy]]))[0];
  ok(ring[0] > 170 && ring[1] > 170, 'ícone de porta na área escurecida continua com a cor cheia (por cima do véu): ' + ring);

  // um token selecionado: só o que ELE vê (mesmo sem dono)
  await sel('Guarda'); await w(250);
  ok(await veil() === 'tk_g' && await chip() === 'Véu: visão de Guarda', 'um token selecionado: o véu passa a ser a visão dele — ' + await chip());
  const one = await read();
  ok(same(one.right, off.right) && darker(one.left, off.left), `visão do Guarda (NPC): o lado dele fica normal e o outro lado escurece (${one.right} / ${one.left})`);
  ok(same(one.guard, off.guard) || lum(one.guard) > lum(on.guard) * 1.3, 'o próprio token selecionado não fica debaixo do véu');
  await sel('Vigia'); await w(250);
  ok(await veil() === 'tk_v' && await chip() === 'Véu: visão de Vigia', 'trocar a seleção troca o dono do véu');
  // dois selecionados, ou algo que não é token: volta para o grupo
  await ev(() => { const u = __urgm; u.setSel([{ c: 'tokens', id: 'tk_v' }, { c: 'tokens', id: 'tk_g' }]); }); await w(250);
  ok(await veil() === '*' && await chip() === 'Véu: visão dos jogadores', 'dois tokens selecionados: véu do grupo');
  // a seleção também encolhe sem clique nenhum (um dos itens selecionados é apagado ou desfeito): o véu acompanha
  const selNow = () => ev(() => __urgm.App.sel.map(s => s.id).join());
  const veilOf = () => ev(async () => { await new Promise(r => setTimeout(r, 250)); const o = __urgm.Vision.out; return __urgm.Vision.isDirty() ? 'pendente' : o.veil ? o.veilOf : null; });      // sem forçar a conta: o que o mapa está mostrando
  const addFx = () => ev(() => { const u = __urgm, S = u.Store; S.tx('Soltar efeito', () => S.add('effects', { id: 'fx_v', fx: 'fogo', k: 'circ', x: 2 * 64, y: 6.5 * 64, r: 0.5, w: 1, ang: 60, dir: 0, rw: 1, rh: 1, pow: 0.8, token: null, gm: false, by: null, seed: 3, dur: 0, dur0: 0, at: null, apply: null })); u.setSel([{ c: 'tokens', id: 'tk_g' }, { c: 'effects', id: 'fx_v' }]); });
  await addFx();
  ok(await veilOf() === '*' && await chip() === 'Véu: visão dos jogadores', 'token + efeito selecionados: véu do grupo');
  await ev(() => __urgm.Tools.undo());                                // desfaz a criação do efeito: sobra só o Guarda na seleção
  ok(await selNow() === 'tk_g' && await veilOf() === 'tk_g' && await chip() === 'Véu: visão de Guarda', `desfazer tira o efeito da seleção, e o véu passa para o token que sobrou — seleção ${await selNow()}, véu ${await veilOf()}, legenda "${await chip()}"`);
  const shrunk = await read();
  ok(same(shrunk.right, off.right) && darker(shrunk.left, off.left), 'e o mapa mostra mesmo a visão dele (não só a legenda)');
  await addFx();
  await page.locator('#tab-fx').click(); await w();
  await page.locator('#side button[title="Remover efeito"]').click();   // lixeira da linha do efeito, na aba Efeitos
  ok(await selNow() === 'tk_g' && await veilOf() === 'tk_g' && await chip() === 'Véu: visão de Guarda', `apagar o efeito pela aba Efeitos: o véu passa para o token que continua selecionado — véu ${await veilOf()}`);
  await ev(() => __urgm.setSel([])); await clearToasts();
  await page.locator('#tab-scene').click(); await w();
  // token com a visão desligada: não há o que mostrar dele, então fica o grupo
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.upd('tokens', 'tk_g', { vis: { on: false, range: 0, dark: 0 } })); });
  await sel('Guarda'); await w(250);
  ok(await veil() === '*' && await chip() === 'Véu: visão dos jogadores', 'token selecionado que não enxerga: continua o véu do grupo');
  await ev(() => { const u = __urgm; u.Tools.undo(); u.setSel([]); }); await w(250);

  // só refaz a conta quando a visão é invalidada
  const calls = await ev(async () => {
    const u = __urgm, real = u.Vision.update; let n = 0;
    u.Vision.update = function (a, b) { n++; return real.call(u.Vision, a, b); };
    const tick = () => new Promise(r => setTimeout(r, 160));
    u.Render.request(); await tick();
    const idle = n;
    u.setSel([{ c: 'walls', id: 'w_par' }]); await tick();          // seleção que não muda o dono do véu
    const sameSubject = n;
    u.setSel([{ c: 'tokens', id: 'tk_g' }]); await tick();          // agora muda
    const changed = n;
    u.Store.tx('x', () => u.Store.scn({ weather: { k: 'chuva', pow: 0.5 } })); await tick();
    const weather = n;
    u.Store.tx('x', () => u.Store.scn({ weather: { k: '', pow: 0.5 } }));
    u.setSel([]); await tick();
    u.Vision.update = real;
    return { idle, sameSubject, changed, weather };
  });
  ok(calls.idle === 0 && calls.sameSubject === 0 && calls.changed === 1 && calls.weather === 1, 'a conta do véu só é refeita quando a visão é invalidada (parado, seleção sem efeito, clima: nada) — ' + JSON.stringify(calls));

  // cortina fechada: o véu segue a mesma regra de quem está encostado
  await wall('w_cor', { k: 'veil', x1: 6 * 64, y1: 3 * 64, x2: 6 * 64, y2: 4 * 64 });
  const through = [8.5, 3.5];
  await w(250);
  const far = (await pix([through]))[0];
  await moveTok('tk_v', 5 * 64, 3 * 64); await w(250);
  const near = (await pix([through]))[0];
  ok(darker(far, near) && same(near, off.right), `cortina fechada: com o jogador longe, o outro lado fica sob o véu; encostado, aparece pelo vão (${far} → ${near})`);
  await moveTok('tk_v', 3 * 64, 3 * 64);

  // × da legenda desliga o interruptor; o aviso deixa voltar atrás
  await clearToasts();
  await page.locator('#veilOff').click(); await w(250);
  ok(await veil() === null && await chip() === null && await ev(() => __urgm.App.showVision === false && __urgm.Store.S.prefs.showVision === false), 'o × da legenda desliga o véu e a preferência');
  ok(!(await page.locator('#sc-showvis').isChecked()), '… e o interruptor da aba Cena acompanha');
  ok(same((await read()).right, off.right), 'sem véu, o mapa volta ao brilho normal');
  await page.locator('.toast-a', { hasText: 'Desfazer' }).click(); await w(250);
  ok(await veil() === '*' && await chip() === 'Véu: visão dos jogadores', 'Desfazer do aviso religa');

  // nunca na visão de jogador
  await viewer('jg_dalmo');
  ok(await veil() === null && await chip() === null, 'vendo como jogador: sem véu e sem legenda');
  await viewer('gm');
  ok(await veil() === '*', 'de volta ao mestre, o véu continua ligado');

  // sem visão por paredes não há o que escurecer
  await ev(() => { const u = __urgm, sc = u.Store.scene(); u.Store.tx('x', () => u.Store.scn({ fog: Object.assign({}, sc.fog, { dynamic: false }) })); }); await w(250);
  ok(await veil() === null && await chip() === null && same((await read()).right, off.right), 'cena sem visão por paredes: sem véu e sem legenda, mesmo com a opção ligada');
  ok(!(await has('#sc-showvis')), '… e o interruptor some da aba Cena, como antes');
  await ev(() => __urgm.Tools.undo()); await w(250);

  // rede de segurança: se a conta da visão falhar, o mapa fica coberto e a visão continua pendente
  const safe = await ev(async () => {
    const u = __urgm, real = u.Walls.sightFor;
    const tick = () => new Promise(r => setTimeout(r, 220));
    u.Walls.sightFor = () => { throw new Error('falha de teste'); };
    u.Vision.invalidate(); u.Render.request(); await tick();
    const during = { fail: u.Render.stats.fail || 0, dirty: u.Vision.isDirty() };
    u.Walls.sightFor = real; u.Render.stats.fail = 0;
    u.Render.request(); await tick();
    return { during, after: { fail: u.Render.stats.fail || 0, dirty: u.Vision.isDirty(), veil: !!u.Vision.out.veil } };
  });
  ok(safe.during.fail > 0 && safe.during.dirty === true, 'falha na conta do véu: o quadro cai na rede de segurança e a visão continua pendente — ' + JSON.stringify(safe.during));
  ok(safe.after.fail === 0 && safe.after.dirty === false && safe.after.veil, 'passado o erro, o véu volta sozinho — ' + JSON.stringify(safe.after));
  ok(same((await read()).left, off.left), 'e o mapa volta a ser desenhado normalmente');
  await clearToasts();
  errs('véu', /falha de teste/);
});

/* ============ Item 3: o véu nos dois temas, na cena de exemplo (capturas) ============ */
for (const theme of ['dark', 'light']) {
  section('3 véu tema ' + theme, async k => {
    const { page, ev, w, sel, pix, lum, shot, errs } = k;
    await ev(() => __urgm.setSel([])); await w(200);
    const pts = [[23.5, 5.5], [3.5, 16.5], [9.5, 12.5]];            // dentro da guarita, canto longe, ao lado do Dain X
    const off = await pix(pts);
    await ev(() => { const u = __urgm; u.App.showVision = true; u.Vision.invalidate(); u.UI.renderAll(); u.Render.request(); }); await w(300);
    const on = await pix(pts);
    ok(lum(on[0]) < lum(off[0]) * 0.75, `${theme}: dentro da guarita (que os jogadores não veem) escurece: ${off[0]} → ${on[0]}`);
    ok(Math.abs(lum(on[2]) - lum(off[2])) < 4, `${theme}: ao lado do Dain X nada muda: ${off[2]} → ${on[2]}`);
    const color = await ev(() => getComputedStyle(document.documentElement).getPropertyValue('--veil').trim());
    ok(/^rgba\(/.test(color), `${theme}: a cor do véu vem do tema (${color})`);
    ok(await ev(() => document.getElementById('veilText').textContent) === 'Véu: visão dos jogadores', `${theme}: legenda do grupo`);
    const chipBox = await ev(() => { const c = document.getElementById('veilchip').getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect(); return { in: c.left >= s.left && c.right <= s.right && c.top >= s.top, w: Math.round(c.width), h: Math.round(c.height) }; });
    ok(chipBox.in && chipBox.h <= 34, `${theme}: a legenda é pequena e fica dentro do mapa — ` + JSON.stringify(chipBox));
    if (theme === 'dark') await shot('01-veu-grupo'); else await shot('01b-veu-grupo-tema-claro');
    await sel('Capitão'); await w(300);
    ok(await ev(() => document.getElementById('veilText').textContent) === 'Véu: visão de Capitão', `${theme}: legenda de um token`);
    const cap = await pix(pts);
    ok(Math.abs(lum(cap[0]) - lum(off[0])) < 6 && lum(cap[1]) < lum(off[1]) * 0.75, `${theme}: visão do Capitão: a sala dele aparece, a estrada lá fora escurece (${cap[0]} / ${cap[1]})`);
    if (theme === 'dark') await shot('02-veu-um-token');
    await ev(() => { __urgm.App.showVision = false; __urgm.Vision.invalidate(); });
    errs('véu ' + theme);
  }, { theme });
}

/* ============ Itens 1, 2 e 4: turnos por rodada, iniciativa 1d20 + bônus, entrada avulsa ============ */
section('1 2 4 turnos', async k => {
  const { page, ev, w, key, sel, viewer, toasts, clearToasts, errs, has, shot } = k;
  const turn = () => ev(() => JSON.parse(JSON.stringify(__urgm.Store.scene().turn)));
  const tokOf = name => ev(nm => JSON.parse(JSON.stringify(__urgm.Store.scene().tokens.find(t => t.name === nm))), name);
  const labels = () => ev(() => Array.from(document.querySelectorAll('.turns .turn')).map(li => li.querySelector('.turn-n').textContent + (li.querySelector('.turn-k') ? li.querySelector('.turn-k').textContent : '')));
  const undoCount = () => ev(() => { const S = __urgm.Store; let c = 0; while (S.canUndo()) { S.undo(); c++; } for (let i = 0; i < c; i++) S.redo(); return c; });
  // dado viciado: enquanto a fila tiver números, o d20 sai com eles, na ordem
  await ev(() => {
    window.__dice = []; window.__rolls = [];
    const real = crypto.getRandomValues.bind(crypto);
    Object.defineProperty(crypto, 'getRandomValues', { configurable: true, value: buf => { if (window.__dice.length && buf.length === 1) { buf[0] = window.__dice.shift() - 1; return buf; } return real(buf); } });
    __urgm.Ext.roll = r => window.__rolls.push(r);
  });
  const dice = (...v) => ev(v => { window.__dice.push(...v); }, v);
  ok(await ev(() => { window.__dice.push(13); return __urgm.rollDie(20); }) === 13, 'o dado da mesa usa crypto.getRandomValues (o teste consegue viciá-lo)');
  const spread = await ev(() => { const c = new Array(21).fill(0); for (let i = 0; i < 20000; i++) c[__urgm.rollDie(20)]++; return [c[0], Math.min(...c.slice(1)), Math.max(...c.slice(1))]; });
  ok(spread[0] === 0 && spread[1] > 820 && spread[2] < 1180, `no navegador, 20000 rolagens de d20: só de 1 a 20, todas com frequência parecida (${spread[1]} a ${spread[2]})`);

  /* ---- painel do token: Iniciativa e Turnos por rodada ---- */
  await sel('Capitão');
  ok(await ev(() => Array.from(document.querySelectorAll('#s-turn .lb')).map(l => l.textContent).join('|')) === 'Iniciativa|Turnos por rodada', 'painel do token: campos "Iniciativa" e "Turnos por rodada"');
  ok(await page.locator('#tk-ini').inputValue() === '0' && await ev(() => document.getElementById('tk-turns-n').textContent) === '1' && await page.locator('#tk-turns-minus').isDisabled(), 'padrões: iniciativa 0, um turno (o − fica desligado)');
  await page.locator('#tk-ini').fill('3'); await page.locator('#tk-ini').press('Tab'); await w();
  ok((await tokOf('Capitão')).ini === 3, 'iniciativa (bônus) editada no painel');
  await page.locator('#tk-ini').fill('250'); await page.locator('#tk-ini').press('Tab'); await w();
  ok((await tokOf('Capitão')).ini === 99, 'iniciativa não passa de 99');
  const z0 = await ev(() => __urgm.App.view.z);
  await page.locator('#tk-ini').focus(); await page.keyboard.type('-3'); await w();
  ok(await ev(() => __urgm.App.view.z) === z0 && await ev(() => __urgm.App.tool) === 'select', 'digitar "-3" no campo não vira atalho do mapa (o "-" não afasta a câmera)');
  await page.locator('#tk-ini').fill('3'); await page.locator('#tk-ini').press('Tab'); await w();

  // o Capitão já está na ordem (cena de exemplo): mudar os turnos dele mexe na lista no mesmo passo
  let t0 = await turn();
  ok(t0.list.length === 6 && t0.list.every(e => e.k === 1), 'exemplo: seis entradas, todas de um turno');
  const steps0 = await undoCount();
  await page.locator('#tk-turns-plus').click(); await w();
  let t1 = await turn();
  ok((await tokOf('Capitão')).turns === 2 && t1.list.length === 7 && t1.list[6].k === 2 && t1.list[6].init === null, 'turnos por rodada 1 → 2: entra a segunda entrada do Capitão, no fim e sem iniciativa');
  ok(await undoCount() === steps0 + 1, '… num passo de desfazer só');
  ok(await ev(() => document.getElementById('tk-turns-n').textContent) === '2' && await ev(() => document.activeElement.id) === 'tk-turns-plus', 'o contador mostra 2 e o foco continua no botão');
  for (let i = 0; i < 3; i++) { await page.locator('#tk-turns-plus').click({ force: true }).catch(() => {}); await w(60); }
  ok((await tokOf('Capitão')).turns === 4 && await page.locator('#tk-turns-plus').isDisabled() && (await turn()).list.length === 9, 'o limite é 4 turnos (o + desliga)');
  await page.locator('#tk-turns-minus').click(); await w(); await page.locator('#tk-turns-minus').click(); await w();
  t1 = await turn();
  ok((await tokOf('Capitão')).turns === 2 && t1.list.length === 7 && t1.list.filter(e => e.token === t1.list[1].token).map(e => e.k).join() === '1,2', 'de volta a 2: saíram as de número mais alto');

  /* ---- aba Turnos: rótulos, rolagem, ordenação, desfazer ---- */
  await page.locator('#tab-turn').click(); await w();
  ok((await labels()).join('|') === 'Dain X|Capitão|Astie|Bandido|Kairo|Bandida|Capitão · 2º turno', 'lista: nome puro no 1º turno e "Capitão · 2º turno" no outro — ' + (await labels()).join('|'));
  ok(await page.locator('.turns .turn .turn-d').count() === 7 && await page.locator('.turns .turn').first().locator('.turn-a .ib').count() === 3, 'cada linha tem o seu dado, fora do grupo subir/descer/tirar');
  // só uma entrada sem iniciativa: "Rolar iniciativa" rola só para ela, sem perguntar
  await ev(() => { const u = __urgm, tk = u.Store.scene().tokens.find(t => t.name === 'Dain X'); u.Store.tx('x', () => u.Store.upd('tokens', tk.id, { ini: 5 })); }); await w();
  await clearToasts(); await ev(() => { window.__rolls.length = 0; });
  const curId = (await turn()).cur;
  const before = (await turn()).list.map(e => [e.id, e.init]);
  await dice(9);
  const stepsRoll = await undoCount();
  await page.locator('#turnRoll').click(); await w(200);
  t1 = await turn();
  ok(!(await has('.modal')), 'com alguém ainda sem iniciativa, "Rolar iniciativa" não pergunta nada');
  const second = t1.list.find(e => e.k === 2);
  ok(second.init === 12 && JSON.stringify(second.roll) === '{"d":9,"b":3}' && before.filter(([, v]) => v != null).every(([id, v]) => t1.list.find(e => e.id === id).init === v), 'rolou só para quem não tinha: 9 + 3 = 12; os outros ficam como estavam');
  ok((await toasts()).join() === 'Capitão · 2º turno: iniciativa 12 (9 + 3)' && await page.locator('.toast-a', { hasText: 'Desfazer' }).count() === 1, 'aviso de uma rolagem: ' + JSON.stringify(await toasts()));
  ok(t1.list.map(e => e.init).join() === '18,15,14,12,11,9,7' && t1.cur === curId, 'a lista é reordenada pela iniciativa e a vez continua com quem estava: ' + t1.list.map(e => e.init).join());
  ok(await undoCount() === stepsRoll + 1, 'a rolagem é um passo de desfazer ("Rolar iniciativa")');
  ok(JSON.stringify(await ev(() => window.__rolls)) === JSON.stringify([{ kind: 'iniciativa', name: 'Capitão · 2º turno', tokenId: second.token, d: 9, bonus: 3, total: 12 }]), 'Ext.roll recebeu a rolagem: ' + JSON.stringify(await ev(() => window.__rolls)));
  ok(await ev(() => (document.querySelector('.turn .turn-r') || {}).textContent) === '(9 + 3)', 'a linha mostra o detalhe da rolagem ao lado do nome: "(9 + 3)", com o total 12 no campo');
  ok(/12 \(9 \+ 3\)/.test(await page.locator(`#tn-${second.id}`).getAttribute('title')), 'e a dica do campo diz "12 (9 + 3)"');
  await clearToasts();

  // todos já têm: pergunta antes de trocar
  await page.locator('#turnRoll').click(); await w(200);
  ok(await ev(() => (document.querySelector('.modal-t') || {}).textContent) === 'Rolar de novo a iniciativa de todos?', 'todos com iniciativa: pergunta "Rolar de novo a iniciativa de todos?"');
  await page.locator('.modal .btn', { hasText: 'Cancelar' }).click(); await w(200);
  ok((await turn()).list.map(e => e.init).join() === '18,15,14,12,11,9,7' && await ev(() => window.__rolls.length) === 1, 'Cancelar: nada muda');
  await ev(() => { window.__rolls.length = 0; });
  // dado para cada entrada, na ordem da lista: Dain X, Capitão, Astie, Capitão 2º, Bandido, Kairo, Bandida
  await dice(12, 4, 10, 17, 10, 2, 20);
  await page.locator('#turnRoll').click(); await w(200);
  await page.locator('.modal .btn.primary').click(); await w(250);
  t1 = await turn();
  const names = await labels();
  ok(names.join('|') === 'Capitão · 2º turno|Bandida|Dain X|Astie|Bandido|Capitão|Kairo', 'rolar de novo para todos: ordem nova pela iniciativa (empate em 10: fica a ordem que já estava) — ' + names.join('|'));
  ok(t1.list.map(e => e.init).join() === '20,20,17,10,10,7,2' && t1.cur === curId, 'valores: ' + t1.list.map(e => e.init).join() + '; a vez não muda de dono');
  ok((await toasts()).join() === 'Iniciativa: Capitão · 2º turno 20 · Bandida 20 · Dain X 17 · Astie 10 +3', 'aviso resumido: as 4 maiores e "+3" — ' + JSON.stringify(await toasts()));
  ok(await ev(() => window.__rolls.length) === 7 && await ev(() => window.__rolls.every(r => r.kind === 'iniciativa' && r.total === r.d + r.bonus)), 'Ext.roll: uma chamada por entrada rolada');
  await shot('06-turnos-chefe-e-iniciativas');
  await page.locator('.toast-a', { hasText: 'Desfazer' }).click(); await w(200);
  ok((await turn()).list.map(e => e.init).join() === '18,15,14,12,11,9,7', 'Desfazer do aviso devolve as iniciativas e a ordem de antes, de uma vez');
  await clearToasts();

  // o dado da linha rola só aquela entrada — o exemplo da especificação: Dain X, d20 = 12, bônus 5
  const dain = (await turn()).list.find(e => e.name === 'Dain X');
  await dice(12);
  await page.locator(`#tr-${dain.id}`).click(); await w(200);
  t1 = await turn();
  ok((await toasts()).join() === 'Dain X: iniciativa 17 (12 + 5)', 'dado da linha: "Dain X: iniciativa 17 (12 + 5)" — ' + JSON.stringify(await toasts()));
  ok(t1.list.find(e => e.id === dain.id).init === 17 && t1.list.map(e => e.init).join() === '17,15,14,12,11,9,7', 'só o Dain X mudou; a lista segue em ordem');
  ok(await ev(id => document.activeElement && document.activeElement.id === 'tr-' + id, dain.id), 'o foco continua no dado clicado');
  await clearToasts();
  // bônus negativo aparece com o sinal de menos tipográfico
  await ev(() => { const u = __urgm, tk = u.Store.scene().tokens.find(t => t.name === 'Kairo'); u.Store.tx('x', () => u.Store.upd('tokens', tk.id, { ini: -2 })); }); await w();
  const kairo = (await turn()).list.find(e => e.name === 'Kairo');
  await dice(6);
  await page.locator(`#tr-${kairo.id}`).click(); await w(200);
  ok((await toasts()).join() === 'Kairo: iniciativa 4 (6 − 2)', 'bônus negativo: ' + JSON.stringify(await toasts()));
  await clearToasts();

  // digitar a iniciativa continua valendo (e tira o detalhe da rolagem daquela linha)
  await page.locator(`#tn-${dain.id}`).fill('30'); await page.locator(`#tn-${dain.id}`).press('Tab'); await w();
  t1 = await turn();
  ok(t1.list.find(e => e.id === dain.id).init === 30 && t1.list.find(e => e.id === dain.id).roll === null, 'iniciativa digitada à mão: vale, sem detalhe de rolagem');

  // tirar UMA entrada do chefe pelo x da linha
  const row2 = page.locator('.turns .turn', { hasText: 'Capitão · 2º turno' });
  await row2.locator('.turn-a .ib').nth(2).click(); await w(200);
  t1 = await turn();
  ok(t1.list.length === 6 && (await tokOf('Capitão')).turns === 1 && (await toasts()).some(x => x === 'Capitão agora tem 1 turno por rodada.'), 'tirar o 2º turno pelo x: sai só ele, "turnos por rodada" desce para 1, e a mesa avisa');
  await page.locator('.toast-a', { hasText: 'Desfazer' }).click(); await w(200);
  ok((await turn()).list.length === 7 && (await tokOf('Capitão')).turns === 2, 'Desfazer devolve a entrada e o número');
  await clearToasts();

  /* ---- faixa "Vez de…" com o número do turno ---- */
  await ev(() => { const u = __urgm; u.Act.turnPatch(x => { const i = x.list.findIndex(e => e.k === 2); x.cur = x.list[(i + x.list.length - 1) % x.list.length].id; x.back = 0; }); }); await w(200);
  await page.locator('#turnNext').click(); await w(250);
  ok(await ev(() => document.querySelector('#turnb .turnb-t').textContent) === 'Vez de Capitão · 2º turno', 'faixa: "Vez de Capitão · 2º turno" — ' + await ev(() => document.querySelector('#turnb .turnb-t').textContent));
  ok(await ev(() => document.querySelector('.turn.cur .turn-k') !== null), 'a linha da vez é a do 2º turno');

  /* ---- item 4: entrada avulsa ---- */
  await page.locator('#turnLoose').click(); await w(200);
  ok(await ev(() => document.querySelector('.modal-t').textContent) === 'Entrada avulsa' && await ev(() => Array.from(document.querySelectorAll('.modal .lb')).map(l => l.textContent).join('|')) === 'Nome|Iniciativa|Turnos por rodada', 'janela da entrada avulsa: Nome, Iniciativa e Turnos por rodada');
  ok(await ev(() => document.activeElement.id) === 'dlg-in' && await page.locator('#le-ini').inputValue() === '0' && await page.locator('#le-turns').inputValue() === '1', 'foco no nome; padrões 0 e 1');
  await shot('07-entrada-avulsa');
  await clearToasts();
  await page.locator('.modal .btn.primary').click(); await w(200);
  ok(await has('.modal') && (await toasts()).some(x => /nome/i.test(x)) && (await turn()).list.length === 7, 'sem nome: avisa e a janela continua aberta');
  await page.locator('#dlg-in').fill('Armadilha de flechas');
  await page.keyboard.type('t'); await w(60);
  ok(await ev(() => __urgm.App.tool) === 'select', 'digitar na janela não aciona atalhos do mapa');
  await page.locator('#dlg-in').fill('Armadilha');
  await page.locator('#le-ini').fill('4'); await page.locator('#le-turns').fill('2');
  await page.locator('#le-turns').press('Enter'); await w(250);
  t1 = await turn();
  const loose = t1.list.filter(e => !e.token);
  ok(!(await has('.modal')) && loose.length === 2 && loose.every(e => e.name === 'Armadilha' && e.bonus === 4 && e.grp === loose[0].grp && e.init === null) && loose.map(e => e.k).join() === '1,2', 'Enter confirma: duas entradas "Armadilha", com bônus 4 e o mesmo grp — ' + JSON.stringify(loose));
  ok((await labels()).slice(-2).join('|') === 'Armadilha|Armadilha · 2º turno', 'rótulos da avulsa na lista');
  await clearToasts(); await ev(() => { window.__rolls.length = 0; });
  await dice(15, 3);
  await page.locator('#turnRoll').click(); await w(250);
  t1 = await turn();
  ok(t1.list.filter(e => !e.token).map(e => `${e.init}:${e.roll.d}+${e.roll.b}`).sort().join() === '19:15+4,7:3+4' && await ev(() => window.__rolls.map(r => r.tokenId).join()) === ',', 'a avulsa rola com o bônus dela (15 + 4 e 3 + 4); no gancho, tokenId vem nulo');
  await clearToasts();
  const lrow = page.locator('.turns .turn', { hasText: 'Armadilha · 2º turno' });
  await lrow.locator('.turn-a .ib').nth(2).click(); await w(200);
  t1 = await turn();
  ok(t1.list.filter(e => !e.token).length === 1 && t1.list.filter(e => !e.token)[0].k === 1 && (await toasts()).length === 0, 'tirar uma das avulsas tira só aquela (a que fica vira o 1º turno); sem aviso, porque não mexeu em token');
  // limites da janela
  await page.locator('#turnLoose').click(); await w(200);
  await page.locator('#dlg-in').fill('Horda'); await page.locator('#le-ini').fill('-150'); await page.locator('#le-turns').fill('9');
  await page.locator('#dlg-in').press('Enter'); await w(250);
  t1 = await turn();
  ok(t1.list.filter(e => e.name === 'Horda').length === 4 && t1.list.find(e => e.name === 'Horda').bonus === -99, 'limites: no máximo 4 turnos e bônus de −99 a 99');
  await ev(() => __urgm.Tools.undo()); await w(200);

  /* ---- o jogador vê a ordem, sem dados nem campos ---- */
  await viewer('jg_dalmo');
  await ev(() => __urgm.UI.openTab('turn')); await w(200);
  ok(!(await has('.turn-d')) && !(await has('.turn .in')) && !(await has('#turnRoll')) && !(await has('.turn-r')), 'jogador: sem dado, sem campo, sem botão de rolar e sem o detalhe das rolagens');
  ok((await labels()).some(x => x === 'Capitão · 2º turno') && await page.locator('.turn-i').count() >= 6, 'jogador vê os rótulos e os totais');
  await viewer('gm');
  await ev(() => { __urgm.Ext.roll = null; });
  errs('turnos');
});

/* ============ Item 10: área de efeito retangular ============ */
section('10 retângulo', async k => {
  const { page, ev, w, click, drag, key, toasts, clearToasts, errs, blank, has, pix, hint } = k;
  await blank();
  const fxs = () => ev(() => JSON.parse(JSON.stringify(__urgm.Store.scene().effects)));
  const last = async () => { const l = await fxs(); return l[l.length - 1]; };
  const near = (a, b, tol) => Math.abs(a - b) <= (tol || 0.01);
  const inside = (id, pts) => ev(([id, pts]) => { const u = __urgm, sc = u.Store.scene(), g = u.FX.geom(u.Store.get('effects', id), sc), c = document.createElement('canvas').getContext('2d'); return pts.map(([x, y]) => c.isPointInPath(g.path, x * 64, y * 64)); }, [id, pts]);
  const setNum = async (id, v) => { await page.locator('#' + id).fill(String(v)); await page.locator('#' + id).press('Tab'); await w(); };

  /* ---- ferramenta: opções e colocação ---- */
  await key('e');
  ok((await ev(() => Array.from(document.querySelectorAll('#o-fxk .seg-b')).map(b => b.textContent).join())) === 'Círculo,Quadrado,Retângulo,Cone,Linha', 'opções da ferramenta: "Retângulo" ao lado das outras formas');
  await page.locator('#o-fxk .seg-b', { hasText: 'Retângulo' }).click(); await w();
  ok(await ev(() => __urgm.App.opt.fxShape) === 'rect' && await has('#o-fxrw') && await has('#o-fxrh') && await has('#o-fxdir') && !(await has('#o-fxr')), 'com Retângulo: Largura, Altura e Rotação no lugar do Raio');
  ok(/de um canto ao outro/.test(await hint()), 'a dica da ferramenta explica o arrasto pela diagonal');
  await setNum('o-fxrw', 3); await setNum('o-fxrh', 1.5);
  ok(await ev(() => __urgm.App.opt.fxRW + '×' + __urgm.App.opt.fxRH) === '3×1.5', 'largura e altura nas opções, de meio em meio quadrado');
  // um clique: solta no tamanho das opções, centrado no ponto (encaixado na grade)
  await ev(() => { __urgm.App.opt.fxAttach = false; });
  await click(4.02, 2.98);
  let e = await last();
  ok(e.k === 'rect' && e.rw === 3 && e.rh === 1.5 && e.x === 4 * 64 && e.y === 3 * 64 && e.dir === 0 && e.token === null, 'clique: retângulo de 3 × 1,5 centrado no ponto — ' + JSON.stringify([e.k, e.rw, e.rh, e.x / 64, e.y / 64, e.dir]));
  ok(await ev(() => __urgm.App.tool) === 'select' && await ev(() => __urgm.App.sel[0].c) === 'effects', 'depois de soltar, volta a Selecionar com o efeito selecionado (como as outras formas)');
  // arrastar a diagonal: de um canto ao outro, com a grade
  await key('e'); await drag(2.1, 5.1, 4.9, 6.95);
  e = await last();
  ok(e.rw === 3 && e.rh === 2 && near(e.x, 3.5 * 64) && near(e.y, 6 * 64), 'diagonal de (2, 5) a (5, 7): 3 × 2 com centro em (3,5; 6), encaixado na grade — ' + JSON.stringify([e.rw, e.rh, e.x / 64, e.y / 64]));
  ok((await inside(e.id, [[2.05, 5.05], [4.95, 6.95], [1.9, 6], [3.5, 7.1]])).join() === 'true,true,false,false', 'os cantos arrastados são os cantos do retângulo');
  await key('e'); await drag(11, 3, 8.5, 1.5);
  e = await last();
  ok(e.rw === 2.5 && e.rh === 1.5 && near(e.x, 9.75 * 64) && near(e.y, 2.25 * 64), 'arrastar no sentido contrário dá o mesmo retângulo (2,5 × 1,5)');
  // rotação pelas opções: a diagonal é lida nos eixos do retângulo girado
  await key('e'); await setNum('o-fxdir', 90);
  await drag(6, 4, 8, 7);
  e = await last();
  ok(e.dir === 90 && e.rw === 3 && e.rh === 2 && near(e.x, 7 * 64) && near(e.y, 5.5 * 64), 'com rotação de 90°: a diagonal de (6, 4) a (8, 7) vira 3 × 2 girado — ' + JSON.stringify([e.dir, e.rw, e.rh, e.x / 64, e.y / 64]));
  ok((await inside(e.id, [[6.05, 4.05], [7.95, 6.95], [5.9, 5.5], [7, 7.1]])).join() === 'true,true,false,false', '… e ocupa exatamente a caixa arrastada');
  await key('e'); await setNum('o-fxdir', 45);
  await drag(1, 1.5, 3, 1.5);
  e = await last();
  const c45 = [e.x / 64, e.y / 64];
  ok(e.dir === 45 && e.rw === 1.5 && e.rh === 1.5 && near(c45[1], 1.5, 0.02), 'a 45°: os lados continuam de meio em meio quadrado (1,5 × 1,5) — ' + JSON.stringify([e.rw, e.rh, c45]));
  ok((await inside(e.id, [[1.06, 1.5], [0.94, 1.5]])).join() === 'true,false', '… e o ponto onde o botão desceu continua sendo um canto');
  await ev(() => { __urgm.App.opt.fxDir = 0; });
  errs('ferramenta');

  /* ---- quem está dentro: reto e girado ---- */
  await ev(() => {
    const u = __urgm, S = u.Store, sc = S.scene();
    S.tx('x', () => {
      for (const ef of sc.effects.slice()) S.del('effects', ef.id);
      S.add('effects', { id: 'fx_r', fx: 'fogo', k: 'rect', x: 6 * 64, y: 4 * 64, r: 2, w: 1, rw: 4, rh: 2, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: 3, dur: 0, dur0: 0, at: null });
      const base = { size: 1, shape: 'circ', img: null, color: '#7c8fb8', owner: null, hidden: false, locked: false, showName: true, bars: [{ n: 'Vida', c: '#d6524b', v: 20, m: 20, k: 'bar', on: true, vis: '' }], barVis: 'bar', conds: [], cinfo: {}, auras: [], vis: { on: true, range: 0, dark: 0 }, light: { on: false, bright: 4, dim: 8, c: '#ffc477' }, ini: 0, turns: 1, notes: '' };
      for (const [name, cx, cy] of [['A', 6, 4], ['B', 8.5, 4], ['C', 7.5, 4.5], ['D', 6, 5.5]]) S.add('tokens', Object.assign({}, JSON.parse(JSON.stringify(base)), { id: 'tk_' + name, name, x: (cx - 0.5) * 64, y: (cy - 0.5) * 64 }));
    });
    u.setSel([]);
  });
  await w(200);
  const who = dir => ev(dir => { const u = __urgm, sc = u.Store.scene(); if (dir != null) u.Store.tx('x', () => u.Store.upd('effects', 'fx_r', { dir })); const ef = u.Store.get('effects', 'fx_r'); return u.tokensIn(u.FX.geom(ef, sc).path, sc).map(t => t.name).join(''); }, dir);
  ok(await who(0) === 'AC', 'retângulo 4 × 2 reto: A e C dentro; B (além da ponta) e D (acima da altura) fora — ' + await who(null));
  ok(await who(90) === 'AD', 'girado 90°: agora D está dentro e C fica fora — ' + await who(null));
  ok(await who(45) === 'AC', 'girado 45°: A e C dentro, B e D fora — ' + await who(null));
  ok(await who(180) === 'AC', 'girado 180°: igual ao reto');
  await who(0);

  /* ---- clique e seleção ---- */
  await click(4.6, 3.3);
  ok(await ev(() => __urgm.App.sel.map(s => s.id).join()) === 'fx_r', 'clique dentro do retângulo seleciona o efeito');
  await key('Escape');
  await click(6, 5.6 - 0.35);
  ok(await ev(() => __urgm.App.sel.map(s => s.c).join()) !== 'effects', 'clique fora da altura dele (mas dentro do "raio") não pega o efeito');
  await ev(() => __urgm.setSel([{ c: 'effects', id: 'fx_r' }])); await w();
  const hs = await ev(() => __urgm.Tools.handles().map(h => [h.kind, h.x / 64, h.y / 64]));
  ok(JSON.stringify(hs) === JSON.stringify([['fx', 8, 4], ['fxbox', 8, 5]]), 'selecionado: uma bolinha no meio do lado e um quadradinho no canto — ' + JSON.stringify(hs));
  await drag(8, 4, 6, 7);                                   // bolinha: gira para baixo e estica
  e = await ev(() => JSON.parse(JSON.stringify(__urgm.Store.get('effects', 'fx_r'))));
  ok(e.dir === 90 && e.rw === 6 && e.rh === 2, 'a bolinha gira (90°) e muda a largura (6), sem mexer na altura — ' + JSON.stringify([e.dir, e.rw, e.rh]));
  await ev(() => __urgm.Tools.undo()); await w();
  await drag(8, 5, 7, 5.5);                                 // canto: largura e altura, com o centro parado
  e = await ev(() => JSON.parse(JSON.stringify(__urgm.Store.get('effects', 'fx_r'))));
  ok(e.rw === 2 && e.rh === 3 && e.x === 6 * 64 && e.y === 4 * 64 && e.dir === 0, 'o canto muda largura e altura em volta do centro — ' + JSON.stringify([e.rw, e.rh, e.x / 64, e.y / 64]));
  await ev(() => __urgm.Tools.undo()); await w();
  await drag(5, 4.2, 6, 5.2);
  e = await ev(() => JSON.parse(JSON.stringify(__urgm.Store.get('effects', 'fx_r'))));
  ok(e.x === 7 * 64 && e.y === 5 * 64, 'arrastar por dentro move o efeito, com a grade');
  await ev(() => __urgm.Tools.undo()); await w();

  /* ---- painel do efeito ---- */
  ok(await ev(() => Array.from(document.querySelectorAll('#fx-k .seg-b')).map(b => b.textContent).join()) === 'Círculo,Quadrado,Retângulo,Cone,Linha' && await ev(() => document.querySelector('#fx-k .seg-b.on').textContent) === 'Retângulo', 'painel: a forma "Retângulo" entre as outras');
  ok(await has('#fx-rw') && await has('#fx-rh') && await has('#fx-d') && !(await has('#fx-r')) && await ev(() => document.querySelector('label[for="fx-d"]').textContent) === 'Rotação (°)', 'painel do retângulo: Largura, Altura e Rotação');
  await setNum('fx-rw', 5); await setNum('fx-rh', 1.5); await setNum('fx-d', 30);
  e = await ev(() => JSON.parse(JSON.stringify(__urgm.Store.get('effects', 'fx_r'))));
  ok(e.rw === 5 && e.rh === 1.5 && e.dir === 30, 'editar largura, altura e rotação pelo painel');
  await page.locator('#fx-k .seg-b', { hasText: 'Círculo' }).click(); await w();
  ok(await has('#fx-r') && !(await has('#fx-rw')), 'trocar para círculo devolve o campo do raio');
  await page.locator('#fx-k .seg-b', { hasText: 'Retângulo' }).click(); await w();
  e = await ev(() => JSON.parse(JSON.stringify(__urgm.Store.get('effects', 'fx_r'))));
  ok(e.k === 'rect' && e.rw === 5 && e.rh === 1.5, 'voltar a retângulo conserva a largura e a altura dele');
  await ev(() => __urgm.UI.openTab('fx')); await w();
  ok(/5 × 1,5 q/.test(await ev(() => document.querySelector('#s-fxlist .li.on .li-s').textContent)), 'aba Efeitos: a linha mostra "5 × 1,5 q" — ' + await ev(() => document.querySelector('#s-fxlist .li.on .li-s').textContent));
  await ev(() => __urgm.UI.openTab('sel')); await w();
  // preso a um token: fica centrado nele e o acompanha
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.upd('effects', 'fx_r', { token: 'tk_B', dir: 0, rw: 1.5, rh: 1.5 })); }); await w();
  ok(await who(null) === 'B', 'preso ao token B: a área fica centrada nele — ' + await who(null));
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.upd('tokens', 'tk_B', { x: 7 * 64, y: 3.5 * 64 })); }); await w();
  ok(await who(null) === 'BC', 'o token andou e o retângulo foi junto (agora pega C também): ' + await who(null));
  await ev(() => { __urgm.Tools.undo(); __urgm.Tools.undo(); }); await w();
  // rótulo de duração
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.upd('effects', 'fx_r', { dur: 3, dur0: 3, dir: 30 })); u.setSel([]); }); await w(300);
  ok(await ev(() => (__urgm.Render.stats.fail || 0)) === 0, 'rótulo de duração num retângulo girado: desenha sem erro');
  errs('painel e seleção');

  /* ---- todo efeito da biblioteca, recortado no retângulo ---- */
  const lib = await ev(() => {
    const u = __urgm, S = u.Store, sc = S.scene();
    S.tx('x', () => {
      for (const ef of sc.effects.slice()) S.del('effects', ef.id);
      for (const t of sc.tokens.slice()) S.del('tokens', t.id);
      u.FX.ORDER.forEach((fx, i) => S.add('effects', { id: 'lib_' + fx, fx, k: 'rect', x: (1.5 + (i % 5) * 2.2) * 64, y: (1.3 + Math.floor(i / 5) * 2.6) * 64, r: 2, w: 1, rw: 2, rh: 1, ang: 60, dir: 0, pow: 1, token: null, gm: false, by: null, seed: i + 2, dur: i % 3, dur0: i % 3, at: null }));
    });
    u.setSel([]);
    return u.FX.ORDER.map((fx, i) => [fx, 1.5 + (i % 5) * 2.2, 1.3 + Math.floor(i / 5) * 2.6]);
  });
  await w(700);
  const bg = (await pix([[11.6, 7.6]]))[0];
  const diff = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  const inPts = await pix(lib.map(([, x, y]) => [x - 0.6, y + 0.2])), outPts = await pix(lib.map(([, x, y]) => [x, y + 0.86]));
  const noFill = lib.filter((_, i) => diff(inPts[i], bg) < 6).map(l => l[0]), leak = lib.filter((_, i) => diff(outPts[i], bg) > 6).map(l => l[0]);
  ok(noFill.length === 0, 'os 14 efeitos da biblioteca desenham dentro do retângulo' + (noFill.length ? ' — sem desenho: ' + noFill.join() : ''));
  ok(leak.length === 0, 'e nenhum vaza para fora dele (logo acima e abaixo do lado maior, o mapa está intacto)' + (leak.length ? ' — vazou: ' + leak.join() : ''));
  // vários quadros com animação, depois girados, depois com a animação desligada
  await ev(async () => { const u = __urgm; for (let i = 0; i < 12; i++) await new Promise(r => requestAnimationFrame(r)); u.Store.tx('x', () => { for (const ef of u.Store.scene().effects) u.Store.upd('effects', ef.id, { dir: 35, rw: 2.5, rh: 0.5 }); }); for (let i = 0; i < 12; i++) await new Promise(r => requestAnimationFrame(r)); u.App.anim = false; u.Render.request(); await new Promise(r => setTimeout(r, 200)); u.App.anim = true; });
  ok(await ev(() => (__urgm.Render.stats.fail || 0)) === 0, 'retos, girados, estreitos, com e sem animação: nenhum quadro falha');
  await k.shot('tmp-10-biblioteca');
  errs('biblioteca no retângulo');

  /* ---- exportar e importar ---- */
  await ev(() => { const u = __urgm, S = u.Store; S.tx('x', () => { for (const ef of S.scene().effects.slice()) S.del('effects', ef.id); S.add('effects', { id: 'fx_exp', fx: 'gelo', k: 'rect', x: 5 * 64, y: 4 * 64, r: 2, w: 1, rw: 4.5, rh: 2, ang: 60, dir: 30, pow: 0.7, token: null, gm: false, by: null, seed: 9, dur: 2, dur0: 2, at: null }); }); });
  await page.locator('#moreBtn').click(); await w(150);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.menu-i', { hasText: 'Exportar esta cena' }).click()]);
  const file = path.join(__dirname, 'export-v3-rect.json'); await dl.saveAs(file);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const saved = data.scene.effects.find(x => x.id === 'fx_exp');
  ok(saved && saved.k === 'rect' && saved.rw === 4.5 && saved.rh === 2 && saved.dir === 30, 'o arquivo exportado leva o retângulo com largura, altura e rotação');
  const nScenes = await ev(() => __urgm.Store.S.order.length);
  await page.locator('#fileJson').setInputFiles(file); await w(500);
  const back = await ev(() => { const u = __urgm, sc = u.Store.scene(), ef = sc.effects.find(x => x.k === 'rect'); const g = u.FX.geom(ef, sc); return { n: u.Store.S.order.length, ef: [ef.k, ef.rw, ef.rh, ef.dir, ef.fx, ef.dur], hw: g.hw / 64, hh: g.hh / 64, fail: u.Render.stats.fail || 0 }; });
  ok(back.n === nScenes + 1 && JSON.stringify(back.ef) === '["rect",4.5,2,30,"gelo",2]' && back.hw === 2.25 && back.hh === 1, 'importado numa cena nova, o retângulo volta igual — ' + JSON.stringify(back));
  await w(300);
  ok(await ev(() => (__urgm.Render.stats.fail || 0)) === 0, 'e a cena importada desenha sem erro');
  // arquivo antigo, sem os campos do retângulo
  const oldFile = path.join(__dirname, 'old-fx.json');
  fs.writeFileSync(oldFile, JSON.stringify({ format: 'urgm-cena', version: 2, scene: { id: 'cena_velha_fx', name: 'Antiga', cols: 10, rows: 8, cell: 64, tokens: [], shapes: [], walls: [], lights: [], fogOps: [], effects: [{ id: 'fx_old', fx: 'fogo', k: 'circ', x: 320, y: 256, r: 1.5, w: 1, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: 4 }] }, players: [], assets: {} }));
  await page.locator('#fileJson').setInputFiles(oldFile); await w(500);
  const oldFx = await ev(() => JSON.parse(JSON.stringify(__urgm.Store.scene().effects[0])));
  ok(oldFx.k === 'circ' && oldFx.rw === 3 && oldFx.rh === 3, 'efeito de arquivo antigo carrega e ganha rw/rh padrão (a caixa do círculo): ' + JSON.stringify([oldFx.k, oldFx.rw, oldFx.rh]));
  await ev(() => { const u = __urgm; u.setSel([{ c: 'effects', id: 'fx_old' }]); u.UI.openTab('sel'); }); await w();
  await page.locator('#fx-k .seg-b', { hasText: 'Retângulo' }).click(); await w(250);
  ok(await ev(() => (__urgm.Render.stats.fail || 0)) === 0 && await page.locator('#fx-rw').inputValue() === '3', 'trocado para retângulo no painel, o efeito antigo vira a caixa 3 × 3 e desenha');
  await clearToasts();
  errs('exportar e importar');
});

/* ============ Item 11: "Reaplicar" nas áreas de efeito ============ */
section('11 reaplicar', async k => {
  const { page, ev, w, click, key, viewer, toasts, clearToasts, errs, blank, has, shot } = k;
  await blank();
  // quatro tokens com Vida 20; uma área de fogo retangular que pega A, B e C (D fica fora)
  await ev(() => {
    const u = __urgm, S = u.Store;
    const base = { size: 1, shape: 'circ', img: null, color: '#7c8fb8', owner: null, hidden: false, locked: false, showName: true, barVis: 'bar', conds: [], cinfo: {}, auras: [], vis: { on: true, range: 0, dark: 0 }, light: { on: false, bright: 4, dim: 8, c: '#ffc477' }, ini: 0, turns: 1, notes: '' };
    S.tx('x', () => {
      for (const [name, cx, cy] of [['A', 3, 3], ['B', 4, 3], ['C', 5, 4], ['D', 9, 6]]) S.add('tokens', Object.assign({}, JSON.parse(JSON.stringify(base)), { id: 'tk_' + name, name, x: (cx - 0.5) * 64, y: (cy - 0.5) * 64, bars: [{ n: 'Vida', c: '#d6524b', v: 20, m: 20, k: 'bar', on: true, vis: '' }, { n: 'Fé', c: '#e2b23e', v: 3, m: 10, k: 'bar', on: true, vis: '' }] }));
      S.add('effects', { id: 'fx_a', fx: 'fogo', k: 'rect', x: 4 * 64, y: 3.5 * 64, r: 2, w: 1, rw: 4, rh: 3, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: 3, dur: 0, dur0: 0, at: null, apply: null });
    });
    u.setSel([{ c: 'effects', id: 'fx_a' }]); u.UI.openTab('sel');
  });
  await w(250);
  const hp = () => ev(() => __urgm.Store.scene().tokens.map(t => t.bars[0].v).join());
  const fx = () => ev(() => JSON.parse(JSON.stringify(__urgm.Store.get('effects', 'fx_a'))));
  const steps = () => ev(() => { const S = __urgm.Store; let c = 0; while (S.canUndo()) { S.undo(); c++; } for (let i = 0; i < c; i++) S.redo(); return c; });
  const floats = () => ev(() => __urgm.App.floats.map(f => f.text).join());
  const menuItems = async () => { await click(4.6, 4.6, { button: 'right' }); await w(150); const t = await ev(() => Array.from(document.querySelectorAll('.menu-i')).map(x => x.textContent)); return t; };

  /* ---- sem nada guardado: a entrada de sempre, nos três lugares ---- */
  ok(await has('#fx-apply') && !(await has('#fx-reapply')), 'painel, sem configuração: só "Aplicar a quem está dentro…"');
  let items = await menuItems();
  ok(items.some(x => /Aplicar a quem está dentro/.test(x)) && !items.some(x => /Reaplicar/.test(x)), 'menu, sem configuração: só a entrada de aplicar');
  await key('Escape');
  await ev(() => __urgm.UI.openTab('fx')); await w();
  ok(await has('#fxa-fx_a') && !(await has('#fxr-fx_a')), 'aba Efeitos, sem configuração: a linha tem o botão de aplicar');
  await ev(() => __urgm.UI.openTab('sel')); await w();

  /* ---- aplicar pela janela guarda a configuração no efeito, no mesmo passo ---- */
  const s0 = await steps();
  await page.locator('#fx-apply').click(); await w(200);
  ok(await ev(() => Array.from(document.querySelectorAll('.area-n')).map(x => x.textContent).join()) === 'A,B,C', 'a janela lista quem está dentro do retângulo');
  await page.locator('#ar-amt').fill('8');
  await page.locator('#ar-half-1').click();
  await ev(() => { __urgm.App.floats.length = 0; });
  await page.locator('.modal .btn.primary').click(); await w(250);
  ok(await hp() === '12,16,12,20', 'aplicado: A −8, B −4 (metade), C −8; D, fora da área, igual — ' + await hp());
  let e = await fx();
  ok(JSON.stringify(e.apply) === '{"bar":"Vida","amt":"8","cond":null,"skip":[]}', 'o efeito guardou a barra pelo nome, o valor como digitado e quem ficou de fora: ' + JSON.stringify(e.apply));
  ok(await steps() === s0 + 1, 'barras e configuração num passo de desfazer só');
  await ev(() => __urgm.Tools.undo()); await w();
  ok(await hp() === '20,20,20,20' && (await fx()).apply === null, 'desfazer devolve as barras e a configuração some junto');
  await ev(() => __urgm.Tools.redo()); await w(); await clearToasts();

  /* ---- agora há o botão rápido, com o que ele vai fazer escrito ---- */
  ok(await has('#fx-reapply') && await ev(() => document.getElementById('fx-reapply').textContent) === 'Reaplicar −8 Vida' && await has('#fx-apply'), 'painel: botão "Reaplicar −8 Vida" (e a entrada de aplicar continua lá, para mudar a configuração)');
  await ev(() => __urgm.UI.openTab('fx')); await w();
  ok(await ev(() => (document.getElementById('fxr-fx_a') || {}).textContent) === 'Reaplicar −8 Vida' && !(await has('#fxa-fx_a')), 'aba Efeitos: a linha do efeito tem o mesmo botão');
  await ev(() => __urgm.UI.openTab('sel')); await w();
  items = await menuItems();
  ok(items.includes('Reaplicar −8 Vida') && items.some(x => /Aplicar a quem está dentro/.test(x)), 'menu do botão direito: "Reaplicar −8 Vida" — ' + JSON.stringify(items));
  await key('Escape');

  /* ---- um clique: sem janela, um passo de desfazer, números flutuantes e aviso ---- */
  const s1 = await steps();
  await ev(() => { __urgm.App.floats.length = 0; });
  await page.locator('#fx-reapply').click(); await w(250);
  ok(!(await has('.modal')), 'reaplicar não abre janela nem pede confirmação');
  ok(await hp() === '4,8,4,20', 'aplica o valor inteiro em quem está dentro agora (a metade era daquela vez): ' + await hp());
  ok((await toasts()).join() === 'Fogo: −8 Vida em 3 tokens' && await page.locator('.toast-a', { hasText: 'Desfazer' }).count() === 1, 'aviso: "Fogo: −8 Vida em 3 tokens", com Desfazer — ' + JSON.stringify(await toasts()));
  ok(await floats() === 'Vida −8,Vida −8,Vida −8', 'números flutuantes com o nome da barra: ' + await floats());
  ok(await steps() === s1 + 1, 'um passo de desfazer');
  await page.locator('.toast-a', { hasText: 'Desfazer' }).click(); await w();
  ok(await hp() === '12,16,12,20', 'Desfazer do aviso devolve os três de uma vez');
  await clearToasts();

  /* ---- vale para quem está dentro AGORA ---- */
  await ev(() => { const u = __urgm; u.Store.tx('x', () => { u.Store.upd('tokens', 'tk_A', { x: 9 * 64, y: 1 * 64 }); u.Store.upd('tokens', 'tk_D', { x: 3 * 64, y: 3 * 64 }); }); }); await w();
  await page.locator('#fx-reapply').click(); await w(250);
  ok(await hp() === '12,8,4,12', 'A saiu da área e D entrou: o reaplicar pega B, C e D — ' + await hp());
  ok((await toasts()).join() === 'Fogo: −8 Vida em 3 tokens', 'aviso com a contagem de agora');
  await clearToasts();
  // pela aba Efeitos e pelo menu, o mesmo
  await ev(() => __urgm.UI.openTab('fx')); await w();
  await page.locator('#fxr-fx_a').click(); await w(250);
  ok(await hp() === '12,0,0,4' && (await toasts()).join() === 'Fogo: −8 Vida em 3 tokens', 'pelo botão da aba Efeitos: ' + await hp());
  await clearToasts();
  await ev(() => __urgm.UI.openTab('sel')); await w();
  items = await menuItems();
  await page.locator('.menu-i', { hasText: 'Reaplicar −8 Vida' }).click(); await w(250);
  ok(await hp() === '12,0,0,0' && (await toasts()).join() === 'Fogo: −8 Vida em 1 token', 'pelo menu: só D ainda tinha Vida para perder — "em 1 token": ' + JSON.stringify(await toasts()));
  await clearToasts();
  const s2 = await steps();
  await page.locator('#fx-reapply').click(); await w(250);
  ok(await steps() === s2 && (await toasts()).join() === 'Fogo: nada mudou em quem está dentro da área.', 'todos já em zero: nada muda, nenhum passo de desfazer, e a mesa diz');
  await clearToasts();
  // ninguém dentro
  await ev(() => { const u = __urgm; u.Store.tx('x', () => u.Store.upd('effects', 'fx_a', { x: 9.5 * 64, y: 6.5 * 64, rw: 1, rh: 1 })); }); await w();
  const s3 = await steps();
  await page.locator('#fx-reapply').click(); await w(250);
  ok((await toasts()).join() === 'Nenhum token dentro da área.' && await steps() === s3, 'área vazia: "Nenhum token dentro da área.", sem passo de desfazer');
  await clearToasts();
  await ev(() => { const u = __urgm; u.Tools.undo(); u.Store.tx('x', () => { for (const t of u.Store.scene().tokens) u.Store.upd('tokens', t.id, { bars: t.bars.map((b, i) => (i === 0 ? Object.assign({}, b, { v: 20 }) : b)) }); }); }); await w(); await clearToasts();

  /* ---- quem ficou de fora continua de fora; condição entra no botão ---- */
  await page.locator('#fx-apply').click(); await w(200);
  ok(await page.locator('#ar-amt').inputValue() === '8' && await page.locator('#ar-bar').inputValue() === 'Vida', 'a janela reabre com a última configuração (para mudar só o que precisa)');
  await page.locator('#ar-bar').selectOption('Fé'); await page.locator('#ar-amt').fill('+2');
  await page.locator('#ar-cond').selectOption('bencao'); await page.locator('#ar-cn').fill('1');
  await page.locator('#ar-on-0').uncheck();                       // o primeiro da lista (B) fica de fora
  const outName = await ev(() => document.querySelector('.area-row .area-n').textContent);
  await page.locator('.modal .btn.primary').click(); await w(250);
  e = await fx();
  ok(e.apply.bar === 'Fé' && e.apply.amt === '+2' && JSON.stringify(e.apply.cond) === '{"id":"bencao","n":1,"d":0}' && e.apply.skip.length === 1, 'configuração nova: outra barra, valor com +, condição com contador e quem ficou de fora — ' + JSON.stringify(e.apply));
  ok(await ev(() => document.getElementById('fx-reapply').textContent) === 'Reaplicar +2 Fé + Abençoado', 'o botão acompanha: "Reaplicar +2 Fé + Abençoado"');
  await clearToasts(); await ev(() => { __urgm.App.floats.length = 0; });
  await page.locator('#fx-reapply').click(); await w(250);
  const st = await ev(() => __urgm.Store.scene().tokens.map(t => [t.name, t.bars[1].v, (t.cinfo.bencao || {}).n || 0]));
  const skipped = st.find(x => x[0] === outName), others = st.filter(x => x[0] !== outName && x[0] !== 'A');
  ok(skipped[1] === 3 && skipped[2] === 0 && others.every(x => x[1] === 7 && x[2] === 2), `reaplicado: quem tinha ficado de fora (${outName}) continua de fora; os outros dois ganham +2 Fé e mais 1 no contador — ` + JSON.stringify(st));
  ok((await toasts()).join() === 'Fogo: +2 Fé + Abençoado em 2 tokens' && await floats() === 'Fé +2,Fé +2', 'aviso e números: ' + JSON.stringify(await toasts()) + ' / ' + await floats());
  await clearToasts();
  await shot('05-retangulo-com-reaplicar');

  /* ---- a configuração viaja com o efeito ---- */
  await ev(() => { const u = __urgm; u.setSel([{ c: 'effects', id: 'fx_a' }]); u.Act.duplicateSel(); }); await w();
  ok(await ev(() => { const u = __urgm, sc = u.Store.scene(), c = sc.effects[sc.effects.length - 1]; return c.id !== 'fx_a' && c.apply && c.apply.bar === 'Fé'; }), 'duplicar o efeito leva a configuração junto');
  await ev(() => { __urgm.Tools.undo(); __urgm.setSel([{ c: 'effects', id: 'fx_a' }]); }); await w();
  await page.locator('#moreBtn').click(); await w(150);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.menu-i', { hasText: 'Exportar esta cena' }).click()]);
  const file = path.join(__dirname, 'export-v3-apply.json'); await dl.saveAs(file);
  ok(JSON.parse(fs.readFileSync(file, 'utf8')).scene.effects[0].apply.amt === '+2', 'a configuração vai no arquivo exportado');
  await page.locator('#fileJson').setInputFiles(file); await w(500);
  ok(await ev(() => { const ef = __urgm.Store.scene().effects[0]; return ef.apply && ef.apply.bar === 'Fé' && ef.apply.cond.id === 'bencao'; }), '… e volta na importação');
  await ev(() => { const u = __urgm; u.setSel([{ c: 'effects', id: u.Store.scene().effects[0].id }]); u.UI.openTab('sel'); }); await w();
  ok(await ev(() => (document.getElementById('fx-reapply') || {}).textContent) === 'Reaplicar +2 Fé + Abençoado', 'na cena importada, o botão já aparece');

  /* ---- jogador não tem esses botões ---- */
  await ev(() => { const u = __urgm, sc = u.Store.scene(); u.Store.tx('x', () => { u.Store.scn({ perms: Object.assign({}, sc.perms, { efeitos: true }) }); u.Store.upd('effects', sc.effects[0].id, { by: 'jg_dalmo' }); }); });
  const fid = await ev(() => __urgm.Store.scene().effects[0].id);
  await viewer('jg_dalmo');
  await ev(id => { const u = __urgm; u.setSel([{ c: 'effects', id }]); u.UI.openTab('sel'); }, fid); await w();
  ok(!(await has('#fx-reapply')) && !(await has('#fx-apply')), 'jogador, mesmo dono do efeito: sem aplicar nem reaplicar no painel');
  await ev(() => __urgm.UI.openTab('fx')); await w();
  ok(!(await has('.li-x')) && !(await has('[id^="fxa-"]')), '… nem na aba Efeitos');
  await viewer('gm');
  errs('reaplicar');
});

/* ============ Item 12: marca Tiny Cats; arquivos novos se identificam como Tiny Cats; os antigos continuam entrando ============ */
section('12 marca', async k => {
  const { page, ev, w, click, key, viewer, toasts, clearToasts, errs, has } = k;
  // tudo o que a pessoa pode ler: texto da página, título da aba e dicas dos controles
  const scan = () => ev(() => {
    const re = /urgm/i, hits = [];
    if (re.test(document.title)) hits.push('título: ' + document.title);
    if (re.test(document.body.innerText)) hits.push('texto: ' + document.body.innerText.match(/.{0,30}urgm.{0,30}/i)[0]);
    for (const el of document.querySelectorAll('*')) for (const a of ['title', 'aria-label', 'placeholder', 'alt']) { const v = el.getAttribute(a); if (v && re.test(v)) hits.push(a + ': ' + v); }
    return hits;
  });
  const found = [];
  const look = async where => { await w(120); for (const h of await scan()) found.push(where + ' → ' + h); };

  ok(await ev(() => document.title) === 'Cenas · Tiny Cats', 'título da página: ' + await ev(() => document.title));
  ok(await ev(() => document.querySelector('.brand').textContent) === 'Tiny Cats', 'a marca no topo é "Tiny Cats"');
  ok(await ev(() => window.__tc === window.__urgm && !!window.__tc.Store), 'window.__tc aponta para o mesmo objeto de window.__urgm');
  await look('início');
  for (const tab of ['turn', 'fx', 'scene', 'players', 'sel']) { await ev(t => __urgm.UI.openTab(t), tab); await look('aba ' + tab); }
  for (const tool of await ev(() => __urgm.Tools.LIST.map(t => t.id))) { await ev(t => __urgm.Tools.set(t), tool); await look('ferramenta ' + tool); }
  await ev(() => __urgm.Tools.set('select'));
  await page.locator('#moreBtn').click(); await look('menu de arquivo');
  await page.locator('.menu-i', { hasText: 'Atalhos' }).click(); await look('atalhos'); await key('Escape');
  await page.locator('#sceneBtn').click(); await look('menu de cenas'); await key('Escape');
  await click(15.5, 12.5, { button: 'right' }); await look('menu do token'); await key('Escape');
  await ev(() => __urgm.UI.barDefaultsBox(null)); await look('barras padrão'); await key('Escape');
  await ev(() => __urgm.Tour.start());
  for (let i = 0; i < 6; i++) { await look('tutorial passo ' + i); if (i < 5) { await page.locator('#tour-next').click(); await w(300); } }
  await key('Escape'); await w(250);
  await viewer('jg_dalmo'); await look('vendo como jogador'); await viewer('gm');
  ok(found.length === 0, 'o nome antigo não aparece em nada que a pessoa lê' + (found.length ? ': ' + found.slice(0, 4).join(' | ') : ''));

  /* ---- arquivos novos ---- */
  await page.locator('#moreBtn').click(); await w(150);
  let [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.menu-i', { hasText: 'Exportar esta cena' }).click()]);
  const fScene = path.join(__dirname, 'export-v3-cena.json'); await dl.saveAs(fScene);
  let d = JSON.parse(fs.readFileSync(fScene, 'utf8'));
  ok(d.format === 'tinycats-cena' && d.version === 3 && dl.suggestedFilename() === 'tinycats-cena-cena-de-exemplo.json', `exportar a cena: formato ${d.format}, versão ${d.version}, arquivo ${dl.suggestedFilename()}`);
  await page.locator('#moreBtn').click(); await w(150);
  [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.menu-i', { hasText: 'Exportar todas' }).click()]);
  const fAll = path.join(__dirname, 'export-v3-mesa.json'); await dl.saveAs(fAll);
  d = JSON.parse(fs.readFileSync(fAll, 'utf8'));
  ok(d.format === 'tinycats-mesa' && d.version === 3 && dl.suggestedFilename() === 'tinycats-cenas.json', `exportar tudo: formato ${d.format}, versão ${d.version}, arquivo ${dl.suggestedFilename()}`);
  ok(!/urgm/i.test(fs.readFileSync(fAll, 'utf8').replace(/"url":"data:[^"]*"/g, '').replace(/"jg_[a-z]+"/g, '')) , 'dentro do arquivo novo também não há o nome antigo');

  /* ---- importação: tudo o que as versões anteriores gravaram ---- */
  const importFile = async file => { await clearToasts(); const n = await ev(() => __urgm.Store.S.order.length); await page.locator('#fileJson').setInputFiles(file); await w(600); return { added: (await ev(() => __urgm.Store.S.order.length)) - n, toast: (await toasts()).join(' | ') }; };
  const state = () => ev(() => { const u = __urgm, sc = u.Store.scene(); return { name: sc.name, nT: sc.tokens.length, tok: sc.tokens.map(t => [t.name, t.ini, t.turns, Array.isArray(t.bars), typeof t.cinfo]), turn: sc.turn.list.map(e => [e.name, e.k, e.roll, e.init]), fx: sc.effects.map(e => [e.k, e.rw > 0, e.rh > 0, e.apply]), walls: sc.walls.map(w => [w.k, w.open, w.locked, w.secret]), tone: sc.tone, wk: sc.weather.k, fail: u.Render.stats.fail || 0 }; });
  // 1) arquivos de verdade da v1: exportados agora pela página da v1 (src.v1)
  const t1 = await open({ file: 'page-v1.html', wait: 1200 });
  const fV1c = path.join(__dirname, 'old-v1-cena.json'), fV1m = path.join(__dirname, 'old-v1-mesa.json');
  await t1.page.evaluate(() => { const u = __urgm, S = u.Store, sc = S.scene(); S.tx('x', () => { S.add('walls', { id: 'w_v1', k: 'door', x1: 64, y1: 64, x2: 128, y2: 64, open: true, locked: false }); S.add('effects', { id: 'fx_v1', fx: 'raio', k: 'line', x: 320, y: 960, r: 4, w: 1, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: 5 }); }); });
  await t1.page.locator('#moreBtn').click(); await t1.page.waitForTimeout(150);
  let [d1] = await Promise.all([t1.page.waitForEvent('download'), t1.page.locator('.menu-i', { hasText: 'Exportar esta cena' }).click()]);
  await d1.saveAs(fV1c);
  await t1.page.locator('#moreBtn').click(); await t1.page.waitForTimeout(150);
  [d1] = await Promise.all([t1.page.waitForEvent('download'), t1.page.locator('.menu-i', { hasText: 'Exportar todas' }).click()]);
  await d1.saveAs(fV1m);
  await t1.close();
  const v1c = JSON.parse(fs.readFileSync(fV1c, 'utf8')), v1m = JSON.parse(fs.readFileSync(fV1m, 'utf8'));
  ok(v1c.format === 'urgm-cena' && v1c.version === 1 && v1m.format === 'urgm-mesa' && v1m.version === 1, 'arquivos de teste gravados pela v1 de verdade: urgm-cena e urgm-mesa, versão 1');
  let r = await importFile(fV1c), st = await state();
  ok(r.added === 1 && /Cena importada/.test(r.toast) && st.nT === 7, 'importar "urgm-cena" v1: entra como cena nova — ' + r.toast);
  ok(st.tok.every(x => x[1] === 0 && x[2] === 1 && x[3] && x[4] === 'object') && st.turn.length === 6 && st.turn.every(x => x[1] === 1 && x[2] === null), 'v1: tokens ganham iniciativa 0 e 1 turno; as entradas da ordem, k = 1 e sem rolagem');
  ok(st.fx.every(x => x[1] && x[2] && x[3] === null) && st.fx.some(x => x[0] === 'line') && st.walls.some(x => x[0] === 'door' && x[1] === true) && st.walls.every(x => typeof x[1] === 'boolean' && typeof x[3] === 'boolean'), 'v1: efeitos ganham rw/rh e apply nulo; a porta aberta continua aberta; campos de parede completos');
  await w(300);
  ok((await state()).fail === 0, 'v1: a cena importada desenha sem erro');
  r = await importFile(fV1m);
  ok(r.added === 1 && /importad/.test(r.toast), 'importar "urgm-mesa" v1 (todas as cenas): ' + r.toast);
  // 2) arquivos da v2, com tudo o que ela tinha de próprio
  const v2scene = {
    id: 'cena_v2_teste', name: 'Da v2', cols: 12, rows: 8, cell: 64, light: 'penumbra', tone: 'noite', weather: { k: 'chuva', pow: 0.5 }, targets: [{ by: 'gm', t: 'tk_a' }],
    fog: { dynamic: true, manual: false, explored: true, shared: true },
    tokens: [{ id: 'tk_a', name: 'Antigo', x: 128, y: 128, size: 1, owner: 'jg_dalmo', bars: [{ n: 'Vida', c: '#d6524b', v: 7, m: 9, k: 'bar', on: true, vis: '' }, { n: 'Cargas', c: '#b07ad9', v: 2, m: 4, k: 'pts', on: true, vis: 'none' }], conds: ['fogo'], cinfo: { fogo: { n: 2, d: 3, d0: 3 } } }],
    walls: [{ id: 'w1', k: 'wall', x1: 320, y1: 0, x2: 320, y2: 512, open: false, locked: false }, { id: 'w2', k: 'window', x1: 320, y1: 128, x2: 320, y2: 192, open: false, locked: false, secret: false }, { id: 'w3', k: 'veil', x1: 0, y1: 320, x2: 128, y2: 320, open: false, locked: false, secret: false }, { id: 'w4', k: 'door', x1: 448, y1: 64, x2: 512, y2: 64, open: false, locked: true, secret: true }],
    shapes: [], lights: [], fogOps: [],
    effects: [{ id: 'fx2', fx: 'fogo', k: 'cone', x: 200, y: 200, r: 3, w: 1, ang: 60, dir: 45, pow: 0.8, token: null, gm: false, by: null, seed: 3, dur: 2, dur0: 2, at: 'tn_a' }],
    turn: { on: true, round: 4, cur: 'tn_a', back: 0, list: [{ id: 'tn_a', token: 'tk_a', name: 'Antigo', init: 14 }, { id: 'tn_b', token: null, name: 'Armadilha', init: null }] },
  };
  const fV2c = path.join(__dirname, 'old-v2-cena.json'), fV2m = path.join(__dirname, 'old-v2-mesa.json');
  fs.writeFileSync(fV2c, JSON.stringify({ format: 'urgm-cena', version: 2, scene: v2scene, players: [{ id: 'jg_dalmo', name: 'Dalmo', color: '#4fb8e0' }], assets: {} }));
  fs.writeFileSync(fV2m, JSON.stringify({ format: 'urgm-mesa', version: 2, scenes: [Object.assign({}, v2scene, { id: 'cena_v2_a', name: 'Da v2 A' }), Object.assign({}, v2scene, { id: 'cena_v2_b', name: 'Da v2 B' })], players: [], barDefaults: [{ n: 'PV', c: '#d6524b', v: 30, m: 30, k: 'bar', on: true, vis: '' }], assets: {} }));
  r = await importFile(fV2c); st = await state();
  ok(r.added === 1 && st.name === 'Da v2' && st.tone === 'noite' && st.wk === 'chuva', 'importar "urgm-cena" v2: ' + r.toast);
  ok(JSON.stringify(st.turn) === '[["Antigo",1,null,14],["Armadilha",1,null,null]]' && JSON.stringify(st.tok) === '[["Antigo",0,1,true,"object"]]', 'v2: a ordem de turnos e os tokens chegam inteiros, com os campos novos no padrão — ' + JSON.stringify(st.turn));
  ok(JSON.stringify(st.walls) === '[["wall",false,false,false],["window",false,false,false],["veil",false,false,false],["door",false,true,true]]', 'v2: janela e cortina chegam fechadas; a porta secreta trancada continua igual');
  ok(JSON.stringify(st.fx) === '[["cone",true,true,null]]' && await ev(() => { const sc = __urgm.Store.scene(), t = sc.tokens[0]; return t.cinfo.fogo.n === 2 && t.bars[1].k === 'pts' && sc.effects[0].at === 'tn_a' && sc.targets.length === 1; }), 'v2: contadores, pontos, efeito com duração ancorada e miras preservados');
  // a cena antiga funciona com o que é novo: rolar a iniciativa da avulsa que veio sem bônus
  ok(await ev(() => { const u = __urgm, sc = u.Store.scene(); const res = u.Act.turnRoll(sc.turn.list.filter(e => e.init == null).map(e => e.id)); return res.length === 1 && res[0].bonus === 0 && sc.turn.list.every(e => e.init != null); }), 'v2: a entrada avulsa antiga rola iniciativa (bônus 0)');
  await w(300);
  ok((await state()).fail === 0, 'v2: a cena importada desenha sem erro, com a janela sobre a parede e a cortina');
  r = await importFile(fV2m);
  ok(r.added === 2 && /2 cenas importadas/.test(r.toast), 'importar "urgm-mesa" v2 com duas cenas: ' + r.toast);
  // 3) os arquivos novos entram de volta
  r = await importFile(fScene);
  ok(r.added === 1 && /Cena importada/.test(r.toast), 'importar o "tinycats-cena" recém-exportado');
  r = await importFile(fAll);
  ok(r.added >= 1 && /importad/.test(r.toast), 'importar o "tinycats-mesa" recém-exportado');
  // 4) arquivo de outro lugar continua recusado
  const bad = path.join(__dirname, 'bad-v3.json'); fs.writeFileSync(bad, JSON.stringify({ format: 'outra-mesa', version: 3, scenes: [v2scene] }));
  r = await importFile(bad);
  ok(r.added === 0 && /não parece ter sido exportado/.test(r.toast), 'formato desconhecido: recusa com explicação');
  ok(await ev(() => indexedDB.databases().then(l => l.map(x => x.name).join())) === 'cenas-de-urgm', 'o banco deste navegador continua com o nome de antes (as cenas salvas de quem já usava não se perdem)');
  errs('marca e arquivos');
});

/* ============ Item 12: marca de "tutorial visto" — grava a chave nova, respeita a antiga ============ */
section('12 tutorial', async k => {
  const { page, ev, w, errs } = k;
  ok(await ev(() => __urgm.Tour.active()), 'primeira visita: o tutorial abre');
  ok(await ev(() => localStorage.getItem('tinycats-tour') === null && localStorage.getItem('urgm-tour') === null), 'nenhuma marca gravada antes de concluir');
  // só a chave ANTIGA presente (quem viu o tutorial antes da troca de nome): não abre de novo
  await ev(() => localStorage.setItem('urgm-tour', '1'));
  await page.reload({ waitUntil: 'load' }); await w(1500);
  ok(!(await ev(() => __urgm.Tour.active())) && await ev(() => __urgm.Tour.seen() && !__urgm.Store.S.prefs.tour), 'com a chave antiga "urgm-tour", o tutorial é dado como visto');
  await ev(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' }); await w(1500);
  ok(await ev(() => __urgm.Tour.active()), 'sem marca nenhuma, abre de novo');
  await page.keyboard.press('Escape'); await w(300);
  ok(await ev(() => localStorage.getItem('tinycats-tour') === '1' && localStorage.getItem('urgm-tour') === null), 'ao concluir, grava a chave nova "tinycats-tour" (a antiga não é mais escrita)');
  await ev(() => { __urgm.Store.S.prefs.tour = 0; });
  ok(await ev(() => __urgm.Tour.seen()), 'e a chave nova sozinha basta');
  errs('tutorial');
}, { query: '&tour', wait: 1500 });

/* ============ Item 13: a página do site — documento completo, sem depender do visualizador de artefatos ============ */
const REPO = path.resolve(__dirname, '..', '..', '..');            // a raiz do site (onde ficam /cenas, /fichas, …)
const SITE_FILE = path.join(REPO, 'cenas', 'index.html');
section('13 página do site', async ({ ok }) => {
  const sleep = (page, ms) => page.waitForTimeout(ms);
  const toastsOf = fr => fr.evaluate(() => Array.from(document.querySelectorAll('.toast')).map(x => x.firstChild.textContent));
  const clearOf = fr => fr.evaluate(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const done = async (t, label, expected) => { const e = t.errs.filter(x => !(expected && expected.test(x))); if (e.length) { console.log(`ERROS em "${label}":\n` + e.join('\n')); ok(false, 'console limpo: ' + label); } else ok(true, 'console limpo: ' + label); await t.close(); };
  const siteFrame = page => page.frames().find(f => new URL(f.url()).pathname === '/cenas/' && f !== page.mainFrame());
  const exportVia = async (page, fr, label) => { await fr.locator('#moreBtn').click(); await sleep(page, 150); await fr.locator('.menu-i', { hasText: label }).click(); };

  /* ---- o arquivo gerado pelo build.sh ---- */
  const html = fs.readFileSync(SITE_FILE, 'utf8'), frag = fs.readFileSync(path.join(__dirname, '..', 'cenas-de-urgm.html'), 'utf8');
  const head = html.slice(0, html.indexOf('</head>')), body = html.slice(html.indexOf('<body>'));
  ok(/^<!doctype html>\n<html lang="pt-BR">\n<head>\n/.test(html) && /<\/body>\n<\/html>\n$/.test(html), 'documento completo: <!doctype html>, <html lang="pt-BR">, <head>, <body>');
  ok(/<meta charset="utf-8">/.test(head) && /<meta name="viewport" content="width=device-width, initial-scale=1[^"]*">/.test(head) && /<title>Cenas · Tiny Cats<\/title>/.test(head), 'no <head>: codificação, viewport e o título "Cenas · Tiny Cats"');
  const links = x => (x.match(/<link rel="stylesheet" href="[^"]+">/g) || []).join('\n');
  ok(links(head).split('\n').length === 3 && links(head) === links(frag) && !/<link/.test(body), 'as mesmas três folhas de fonte do fragmento, todas no <head>');
  const cut = (x, a, b) => x.slice(x.indexOf(a), x.lastIndexOf(b) + b.length);
  ok(cut(head, '<style>', '</style>') === cut(frag, '<style>', '</style>') && cut(head, '<style>', '</style>').length > 20000, 'o CSS inteiro está no <head> (o mesmo do fragmento)');
  ok(cut(body, '<script>', '</script>') === cut(frag, '<script>', '</script>') && (html.match(/<script/g) || []).length === 1 && body.includes('<div class="app" id="app">'), 'no <body>: a marcação e o mesmo programa do fragmento, num <script> só');
  ok(!/<script[^>]+src=|<link(?![^>]+fonts\.googleapis\.com)|@import|url\(\s*["']?https?:/i.test(html), 'nada de fora além das fontes: sem script externo, sem outra folha de estilo');

  /* ---- 1) visitante de primeira viagem: sem ?debug, navegador limpo ---- */
  let t = await open({ root: REPO, file: 'cenas/', debug: false, wait: 2200 });
  let page = t.page;
  const info = await page.evaluate(() => ({ title: document.title, lang: document.documentElement.lang, mode: document.compatMode, cs: document.characterSet, claude: typeof window.claude, tc: typeof window.__tc, urgm: typeof window.__urgm, brand: document.querySelector('.brand').textContent, scene: document.querySelector('.scene-n').textContent }));
  ok(info.title === 'Cenas · Tiny Cats' && info.lang === 'pt-BR' && info.mode === 'CSS1Compat' && info.cs === 'UTF-8', `abre em modo padrão, pt-BR, UTF-8, com o título certo — ${JSON.stringify(info)}`);
  ok(info.claude === 'undefined' && info.tc === 'undefined' && info.urgm === 'undefined', 'página comum: não há visualizador (window.claude) nem o apoio de teste exposto ao visitante');
  ok(info.brand === 'Tiny Cats' && info.scene === 'Cena de exemplo', 'a mesa abre com a marca e a cena de exemplo');
  ok(await page.locator('#tour .tour-card').count() === 1 && /^Bem-vindo/.test(await page.locator('#tour-title').innerText()), 'primeira visita: o tutorial se apresenta');
  await page.keyboard.press('Escape'); await sleep(page, 350);
  ok(await page.evaluate(() => localStorage.getItem('tinycats-tour')) === '1', 'fechado o tutorial, a marca de "já viu" fica no navegador');
  // o que o esqueleto do visualizador fazia e agora é da própria página
  const disp = await page.evaluate(() => ['banner', 'opts', 'turnb', 'veilchip', 'drop', 'fileImg', 'fileJson'].map(id => { const e = document.getElementById(id); return [id, e.hidden, getComputedStyle(e).display]; }));
  ok(disp.filter(d => d[1]).length >= 5 && disp.every(d => !d[1] || d[2] === 'none'), 'o que está com [hidden] não aparece (faixas, legenda do véu, área de soltar imagem): ' + disp.filter(d => d[1] && d[2] !== 'none').map(d => d[0]).join());
  const box = await page.evaluate(() => { const r = id => { const b = document.getElementById(id).getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; }; return { sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, ih: innerHeight, iw: innerWidth, app: r('app'), cv: r('cv'), side: r('side'), pad: getComputedStyle(document.documentElement).paddingTop, margin: getComputedStyle(document.body).margin }; });
  ok(box.sh === box.ih && box.sw === box.iw && box.app.join() === `0,0,${box.iw},${box.ih}` && box.margin === '0px', `a mesa ocupa a janela inteira, sem rolagem da página — ${JSON.stringify(box)}`);
  ok(box.cv[2] > 600 && box.cv[3] > 500 && box.side[2] > 250, 'mapa e painel com tamanho de verdade');
  // a cena de exemplo foi desenhada: o mapa tem muitas cores diferentes (vazio teria uma só)
  const colours = () => page.evaluate(() => { const cv = document.getElementById('cv'), c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, 0, 0); const set = new Set(); for (let y = 10; y < cv.height; y += 23) for (let x = 10; x < cv.width; x += 23) { const d = g.getImageData(x, y, 1, 1).data; set.add((d[0] >> 3) + ',' + (d[1] >> 3) + ',' + (d[2] >> 3)); } return set.size; });
  const nCol = await colours();
  ok(nCol > 40, `a cena de exemplo está desenhada no mapa (${nCol} tons diferentes numa amostra)`);
  ok(await page.locator('#hud').isVisible() && /Dain X/.test(await page.locator('#hud').innerText()) && /Salvo neste navegador/.test(await page.locator('#status').innerText()), 'o token de exemplo vem selecionado (faixa embaixo) e a mesa diz "Salvo neste navegador"');
  // exportar baixa um arquivo pelo caminho normal do navegador
  let [dl] = await Promise.all([page.waitForEvent('download'), exportVia(page, page, 'Exportar esta cena')]);
  const f1 = path.join(__dirname, 'site-v3-cena.json'); await dl.saveAs(f1);
  let d = JSON.parse(fs.readFileSync(f1, 'utf8'));
  ok(dl.suggestedFilename() === 'tinycats-cena-cena-de-exemplo.json' && d.format === 'tinycats-cena' && d.version === 3 && d.scene.tokens.length === 7 && /^blob:/.test(dl.url()), `exportar a cena baixa "${dl.suggestedFilename()}" (Blob + <a download>): ${d.scene.tokens.length} tokens dentro`);
  await sleep(page, 150);
  ok((await toastsOf(page)).join() === 'Arquivo enviado para a pasta de downloads.' && await page.locator('.toast-a').count() === 0 && await page.locator('.modal').count() === 0, 'aviso simples, sem janela de copiar: ' + (await toastsOf(page)).join());
  [dl] = await Promise.all([page.waitForEvent('download'), exportVia(page, page, 'Exportar todas')]);
  const f2 = path.join(__dirname, 'site-v3-mesa.json'); await dl.saveAs(f2);
  d = JSON.parse(fs.readFileSync(f2, 'utf8'));
  ok(dl.suggestedFilename() === 'tinycats-cenas.json' && d.format === 'tinycats-mesa' && d.scenes.length === 1, 'exportar tudo baixa "tinycats-cenas.json"');
  // importar de volta, e o que foi feito continua lá depois de recarregar (IndexedDB numa página comum)
  await clearOf(page);
  await page.locator('#fileJson').setInputFiles(f1); await sleep(page, 700);
  ok((await toastsOf(page)).join() === 'Cena importada.', 'importar o arquivo exportado: ' + (await toastsOf(page)).join());
  await sleep(page, 900);
  const stored = () => page.evaluate(() => new Promise(res => { const rq = indexedDB.open('cenas-de-urgm'); rq.onsuccess = () => { const g = rq.result.transaction('kv').objectStore('kv').get('meta'); g.onsuccess = () => { rq.result.close(); res(g.result ? g.result.order.length : -1); }; g.onerror = () => res(-2); }; rq.onerror = () => res(-3); }));
  ok(await stored() === 2, 'as duas cenas estão gravadas no navegador');
  await page.reload({ waitUntil: 'load' }); await sleep(page, 1800);
  ok(await page.locator('.scene-n').innerText() === 'Cena de exemplo' && await stored() === 2 && await page.locator('#tour').count() === 0, 'recarregar: as cenas voltam e o tutorial não se repete');
  await page.locator('#sceneBtn').click(); await sleep(page, 200);
  ok(await page.locator('.menu-i .menu-l', { hasText: /^Cena de exemplo$/ }).count() === 2, 'o menu de cenas lista as duas');
  await page.keyboard.press('Escape');
  await done(t, 'visitante');

  /* ---- 2) a mesma página nos dois temas (segue o sistema, já que não há visualizador para escolher) ---- */
  for (const theme of ['dark', 'light']) {
    t = await open({ root: REPO, file: 'cenas/', wait: 1800, theme }); page = t.page;
    const th = await page.evaluate(() => { const u = window.__tc; return { scheme: getComputedStyle(document.documentElement).colorScheme, table: getComputedStyle(document.documentElement).getPropertyValue('--table').trim(), same: window.__tc === window.__urgm, toks: u.Store.scene().tokens.length, frames: u.Render.stats.frames, fail: u.Render.stats.fail || 0, save: u.Persist.status() }; });
    ok(th.scheme === theme && th.table === (theme === 'dark' ? '#0d1017' : '#c7ced9'), `tema ${theme === 'dark' ? 'escuro' : 'claro'} do sistema: a página acompanha (${th.scheme}, mesa ${th.table})`);
    ok(th.same && th.toks === 7 && th.frames > 0 && th.fail === 0 && th.save === 'ok', `com ?debug: apoio de teste presente, 7 tokens, ${th.frames} quadros desenhados sem falha, salvamento "${th.save}"`);
    if (theme === 'light') { fs.mkdirSync(SHOTS, { recursive: true }); }
    await page.screenshot({ path: path.join(SHOTS, theme === 'dark' ? '08-pagina-do-site.png' : '08b-pagina-do-site-tema-claro.png') });
    await done(t, 'tema ' + theme);
  }

  /* ---- 3) celular: recorte da tela respeitado e nada fora do lugar ---- */
  t = await open({ root: REPO, file: 'cenas/', wait: 1800, w: 390, h: 780 }); page = t.page;
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, sh: document.documentElement.scrollHeight, ih: innerHeight, pad: getComputedStyle(document.documentElement).padding, cv: document.getElementById('cv').getBoundingClientRect().width }));
  ok(m.sw === m.iw && m.sh === m.ih && m.cv > 200 && /^0px/.test(m.pad), `tela estreita (390 × 780): sem rolagem lateral, mapa com ${Math.round(m.cv)} px — ${JSON.stringify(m)}`);
  ok(/padding:\s*env\(safe-area-inset-top, 0px\) 0 env\(safe-area-inset-bottom, 0px\)/.test(html) && /viewport-fit=cover/.test(head), 'o recorte da tela do celular (safe-area) está no CSS da própria página');
  await done(t, 'celular');

  /* ---- 4) dentro de uma moldura de outra página (sem visualizador): baixa do mesmo jeito, com a saída "Copiar" à mão ---- */
  const frameFile = name => path.join(__dirname, name);
  fs.writeFileSync(frameFile('page-frame.html'), '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>moldura</title><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe id="f" src="/cenas/?debug"></iframe></body></html>');
  fs.writeFileSync(frameFile('page-frame-sandbox.html'), '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>moldura fechada</title><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe id="f" sandbox="allow-scripts allow-same-origin" src="/cenas/?debug"></iframe></body></html>');
  const rel = name => path.relative(REPO, frameFile(name)).split(path.sep).join('/');
  t = await open({ root: REPO, file: rel('page-frame.html'), debug: false, wait: 2200 }); page = t.page;
  let fr = page.frameLocator('#f'), frame = siteFrame(page);
  ok(!!frame && await frame.evaluate(() => window.top !== window.self && typeof window.claude === 'undefined' && window.__tc.Store.scene().tokens.length === 7), 'a página do site abre dentro de uma moldura');
  [dl] = await Promise.all([page.waitForEvent('download'), exportVia(page, fr, 'Exportar esta cena')]);
  ok(dl.suggestedFilename() === 'tinycats-cena-cena-de-exemplo.json', 'na moldura, exportar também baixa: ' + dl.suggestedFilename());
  await sleep(page, 200);
  ok((await toastsOf(frame)).join() === 'Download pedido ao navegador.' && await fr.locator('.toast-a').innerText() === 'Não baixou? Copiar', 'o aviso diz o que foi feito e oferece "Não baixou? Copiar": ' + (await toastsOf(frame)).join());
  ok(await fr.locator('.modal').count() === 0, '… sem abrir janela nenhuma por conta própria');
  await done(t, 'moldura');

  // moldura que proíbe downloads (como um visualizador fechado): nada baixa, e o "Copiar" resolve
  t = await open({ root: REPO, file: rel('page-frame-sandbox.html'), debug: false, wait: 2200 }); page = t.page;
  fr = page.frameLocator('#f'); frame = siteFrame(page);
  let got = 0; page.on('download', () => got++);
  await exportVia(page, fr, 'Exportar esta cena'); await sleep(page, 600);
  ok(got === 0 && (await toastsOf(frame)).join() === 'Download pedido ao navegador.', 'moldura que proíbe downloads: nada baixa, e o aviso não afirma que baixou');
  await fr.locator('.toast-a').click(); await sleep(page, 250);
  const copy = await frame.evaluate(() => { const m = document.querySelector('.modal'), ta = document.getElementById('dlg-json'); return m && ta ? { title: m.querySelector('.modal-t').textContent, text: m.innerText, json: ta.value } : null; });
  ok(!!copy && copy.title === 'Copiar em vez de salvar' && /tinycats-cena-cena-de-exemplo\.json/.test(copy.text) && JSON.parse(copy.json).format === 'tinycats-cena', '"Não baixou? Copiar" abre a janela com o conteúdo inteiro e o nome do arquivo');
  await page.keyboard.press('Escape');
  await done(t, 'moldura que proíbe downloads', /Download is disallowed|sandbox/i);

  /* ---- 5) e dentro do visualizador de artefatos, o recurso dele continua sendo usado ---- */
  const hostWith = async (use, file, wait) => {
    const t = await open({ root: REPO, file: file || 'cenas/', wait: 300, debug: !file ? undefined : false });
    await t.page.addInitScript(use);
    await t.page.reload({ waitUntil: 'load' }); await sleep(t.page, wait || 1800);
    return t;
  };
  t = await hostWith(() => { window.__saved = []; window.claude = { use: name => Promise.resolve(name === 'downloads' ? { save: async o => { window.__saved.push({ filename: o.filename, size: o.data.size, type: o.data.type }); } } : null) }; });
  page = t.page; got = 0; page.on('download', () => got++);
  await exportVia(page, page, 'Exportar esta cena'); await sleep(page, 500);
  const saved = await page.evaluate(() => window.__saved);
  ok(saved.length === 1 && saved[0].filename === 'tinycats-cena-cena-de-exemplo.json' && saved[0].size > 1000 && saved[0].type === 'application/json' && got === 0, 'com o recurso de salvar do visualizador, é ele que recebe o arquivo (sem download comum): ' + JSON.stringify(saved));
  ok((await toastsOf(page)).join() === 'Arquivo salvo.', 'aviso: ' + (await toastsOf(page)).join());
  await done(t, 'visualizador com recurso de salvar');

  // visualizador presente, mas sem o recurso: fora de moldura baixa normal; dentro dela, janela de copiar direto
  t = await hostWith(() => { window.claude = { use: () => Promise.resolve(null) }; });
  page = t.page;
  [dl] = await Promise.all([page.waitForEvent('download'), exportVia(page, page, 'Exportar esta cena')]);
  ok(dl.suggestedFilename() === 'tinycats-cena-cena-de-exemplo.json', 'visualizador sem o recurso, página solta: baixa pelo caminho comum');
  await done(t, 'visualizador sem recurso, página solta');
  t = await hostWith(() => { window.claude = { use: () => Promise.reject(new Error('sem permissão')) }; }, rel('page-frame.html'), 2200);
  page = t.page; fr = page.frameLocator('#f'); frame = siteFrame(page);
  got = 0; page.on('download', () => got++);
  await exportVia(page, fr, 'Exportar esta cena'); await sleep(page, 500);
  ok(got === 0 && await fr.locator('.modal').count() === 1 && /Este visualizador não deixa a página salvar arquivos\./.test(await fr.locator('.modal').innerText()), 'visualizador sem o recurso, dentro da moldura dele: abre direto a janela de copiar (como antes)');
  await page.keyboard.press('Escape');
  await done(t, 'visualizador sem recurso, na moldura');
}, { raw: true });

/* ================= Execução ================= */
(async () => {
  const filter = process.argv.slice(2).join(' ').toLowerCase();
  const run = sections.filter(s => !filter || s.name.toLowerCase().includes(filter));
  for (const s of run) {
    const before = fails, n0 = n;
    if (s.opt && s.opt.raw) { await s.fn({ ok }); }
    else {
      const t = await open(s.opt || {});
      try { await s.fn(kit(t)); }
      catch (e) { fails++; console.log(`EXCEÇÃO na seção "${s.name}":\n` + (e.stack || e)); }
      if (t.errs.length) { console.log(`ERROS em "${s.name}":\n` + t.errs.join('\n')); fails += t.errs.length; }
      await t.close();
    }
    console.log(`  ${fails === before ? 'ok ' : 'XX '} ${s.name} (${n - n0})`);
  }
  console.log(fails ? `\n${fails} falha(s) em ${n} verificações` : `\n${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
