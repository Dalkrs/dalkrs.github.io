// Bateria da v4, no navegador: sobrevida (barrinha por cima da barra + escudo no token) e cura total.
const path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = path.join(__dirname, 'v4');

(async () => {
  const t = await open({});
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.firstChild.textContent));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const T = name => ev(nm => JSON.parse(JSON.stringify(__urgm.Store.scene().tokens.find(x => x.name === nm) || null)), name);
  const sel = async names => { await ev(ns => { const u = __urgm, sc = u.Store.scene(); u.setSel(sc.tokens.filter(x => ns.includes(x.name)).map(x => ({ c: 'tokens', id: x.id }))); u.UI.openTab && u.UI.openTab('sel'); }, [].concat(names)); await w(200); };

  // cena limpa com três tokens
  await ev(() => {
    const u = __urgm, sc = u.newScene('Sobrevida'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
    u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }];
    const mk = (name, x, y, bars, extra) => u.Store.add('tokens', u.newToken(sc, x * sc.cell, y * sc.cell, Object.assign({ name, bars: bars.map(u.cleanBar) }, extra)));
    mk('Ana', 3, 3, [{ n: 'Vida', v: 12, m: 40 }, { n: 'SP', v: 3, m: 20 }], { owner: 'p1' });
    mk('Bruto', 6, 3, [{ n: 'Vida', v: 40, m: 40 }], {});
    mk('Caio', 9, 3, [{ n: 'Vida', v: 5, m: 25 }, { n: 'Cargas', v: 1, m: 4, k: 'pts' }], { owner: 'p1' });
    u.Render.fit();
  });
  await w(400);

  // ---------- sobrevida pelo painel do token ----------
  await sel('Ana');
  ok(await page.locator('#tk-b0-xb').count() === 1 && await page.locator('#tk-b0-x').count() === 0, 'cada barra tem o botão do escudo; o campo de sobrevida começa fechado');
  await page.locator('#tk-b0-xb').click(); await w();
  ok(await page.locator('#tk-b0-x').count() === 1, 'o escudo abre o campo de sobrevida');
  await page.locator('#tk-b0-x').fill('10'); await page.locator('#tk-b0-x').press('Enter'); await w(200);
  ok((await T('Ana')).bars[0].x === 10, 'a sobrevida fica guardada na barra');
  ok(await page.locator('#tk-b0-xb.tem').count() === 1 && await page.locator('#tk-b0-x').inputValue() === '10', 'e o painel mostra que a barra tem sobrevida');
  await page.locator('#tk-b0-v').fill('-4'); await page.locator('#tk-b0-v').press('Enter'); await w(200);
  ok((await T('Ana')).bars[0].v === 12 && (await T('Ana')).bars[0].x === 6, 'dano digitado na barra gasta primeiro a sobrevida (10 → 6), a vida fica');
  ok((await ev(() => __urgm.App.floats.map(f => f.text))).some(x => /^Sobrevida −4/.test(x)), 'o número que sobe no mapa diz "Sobrevida −4"');
  await ev(() => { const u = __urgm, sc = u.Store.scene(); u.App.view.z = 2.2; u.App.view.x = 2 * sc.cell; u.App.view.y = 1.6 * sc.cell; u.App.floats.length = 0; u.Render.request(); });
  await w(400);
  await page.screenshot({ path: path.join(SHOTS, '01-sobrevida.png') });
  await page.locator('#tk-b0-v').fill('-9'); await page.locator('#tk-b0-v').press('Enter'); await w(200);
  ok((await T('Ana')).bars[0].v === 9 && (await T('Ana')).bars[0].x === undefined, 'dano maior que a sobrevida: ela acaba e o resto sai da vida');
  ok(await page.locator('#tk-b0-x').count() === 0, 'sem sobrevida, o campo fecha sozinho');
  await ev(() => __urgm.Tools.undo()); await w(200);
  ok((await T('Ana')).bars[0].v === 12 && (await T('Ana')).bars[0].x === 6, 'Desfazer devolve as duas');

  // ---------- o desenho no mapa não quebra e o escudo aparece ----------
  await ev(() => { __urgm.setSel([]); __urgm.Render.request(); }); await w(350);
  // conta, na área do token, os pontos da cor do escudo (azul) e da barrinha de sobrevida (ciano claro)
  const cores = await ev(() => {
    const u = __urgm, sc = u.Store.scene(), tk = sc.tokens.find(x => x.name === 'Ana'), cv = u.Render.cv;
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, 0, 0);
    const k = cv.width / cv.getBoundingClientRect().width, s = tk.size * sc.cell;
    const [x0, y0] = u.Render.toScreen(tk.x - s * 0.2, tk.y - s * 0.6), [x1, y1] = u.Render.toScreen(tk.x + s * 1.2, tk.y + s * 1.1);
    const d = g.getImageData(Math.round(x0 * k), Math.round(y0 * k), Math.round((x1 - x0) * k), Math.round((y1 - y0) * k)).data;
    let escudo = 0, barrinha = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      if (Math.abs(r - 0x1f) < 14 && Math.abs(gg - 0x7f) < 14 && Math.abs(b - 0xa3) < 14) escudo++;
      if (Math.abs(r - 0x8f) < 14 && Math.abs(gg - 0xe3) < 14 && Math.abs(b - 0xff) < 14) barrinha++;
    }
    return { escudo, barrinha };
  });
  ok(cores.escudo > 40 && cores.barrinha > 40, 'no mapa aparecem o escudo no canto do token e a barrinha de sobrevida por cima da barra: ' + JSON.stringify(cores));

  // ---------- quem não é dono ----------
  await ev(() => __urgm.UI.setViewer('p1')); await w(300);
  await sel('Ana');
  ok(await page.locator('#tk-b0-xb').count() === 1 && await page.locator('#tk-b0-more').count() === 0, 'o dono do token também põe sobrevida (sem as opções do mestre)');
  await ev(() => { const u = __urgm, sc = u.Store.scene(), b = sc.tokens.find(x => x.name === 'Bruto'); u.Store.upd('tokens', b.id, { barVis: 'num', bars: b.bars.map(x => Object.assign({}, x, { x: 7 })) }); });
  await sel('Bruto');
  ok((await page.locator('.bar-ro .bar-m').first().innerText()).replace(/\s+/g, ' ') === '40/40 +7', 'quem vê os números de um token alheio vê a sobrevida junto: ' + await page.locator('.bar-ro .bar-m').first().innerText());
  await ev(() => __urgm.UI.setViewer('gm')); await w(300);

  // ---------- cura total ----------
  await sel('Ana'); await clearToasts();
  await page.locator('#tk-heal').click(); await w(200);
  ok(JSON.stringify((await T('Ana')).bars.map(b => [b.v, b.x || 0])) === '[[40,6],[20,0]]', 'Cura total no painel do token: enche as barras e deixa a sobrevida');
  ok((await toasts()).some(x => x === 'Cura total em Ana.'), 'com aviso: ' + (await toasts()).join(' | '));
  await page.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(200);
  ok(JSON.stringify((await T('Ana')).bars.map(b => b.v)) === '[12,3]', 'o Desfazer do aviso volta ao que era');
  await page.locator('#tk-heal').click(); await w(150); await clearToasts();
  await page.locator('#tk-heal').click(); await w(150);
  ok((await toasts()).some(x => /já está com as barras cheias/.test(x)), 'curar quem já está cheio só avisa');
  await ev(() => { __urgm.Tools.undo(); }); await w(150);
  // vários tokens
  await sel(['Ana', 'Caio']); await clearToasts();
  ok(await page.locator('#mt-heal').count() === 1, 'com vários tokens selecionados também há "Cura total"');
  await page.locator('#mt-heal').click(); await w(200);
  ok((await T('Ana')).bars[0].v === 40 && (await T('Caio')).bars[0].v === 25 && (await T('Caio')).bars[1].v === 4, 'cura todos os selecionados (inclusive a barra de pontos)');
  ok((await toasts()).some(x => x === 'Cura total em 2 tokens.'), 'e diz quantos: ' + (await toasts()).join(' | '));
  await ev(() => __urgm.Tools.undo()); await w(150);
  ok((await T('Ana')).bars[0].v === 12 && (await T('Caio')).bars[0].v === 5, 'um Ctrl+Z desfaz a cura de todos');
  // aba Jogadores: os tokens dos jogadores, ou todos
  await ev(() => { const u = __urgm, sc = u.Store.scene(), b = sc.tokens.find(x => x.name === 'Bruto'); u.Store.upd('tokens', b.id, { bars: b.bars.map(x => Object.assign({}, x, { v: 9 })) }); u.setSel([]); u.UI.openTab('players'); });
  await w(250); await clearToasts();
  await page.locator('#pl-heal-pcs').click(); await w(200);
  ok((await T('Ana')).bars[0].v === 40 && (await T('Caio')).bars[0].v === 25 && (await T('Bruto')).bars[0].v === 9, '"Curar os tokens dos jogadores" não mexe nos do mestre');
  await page.locator('#pl-heal-all').click(); await w(200);
  ok((await T('Bruto')).bars[0].v === 40, '"Curar todos da cena" cura também os do mestre');
  await page.screenshot({ path: path.join(SHOTS, '02-cura.png') });

  // ---------- dano em área com sobrevida: a prévia avisa ----------
  await sel(['Ana', 'Bruto']);
  await page.locator('#mt-area').click(); await w(300);
  await page.locator('#ar-amt').fill('10'); await w(200);
  const previa = (await page.locator('.area-row').allInnerTexts()).join(' | ').replace(/\s+/g, ' ');
  ok(/sobrevida 6 → 0/.test(previa) && /sobrevida 7 → 0/.test(previa), 'a janela de dano em área mostra a sobrevida que vai ser gasta: ' + previa);
  await page.keyboard.press('Escape'); await w(200);

  if (t.errs.length) { console.log('ERROS:\n' + t.errs.join('\n')); fails += t.errs.length; }
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
