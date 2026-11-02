// Bateria do lote 65 nas Cenas (no navegador, sem o site):
//   · o lápis (S): de todos, sem a permissão de desenhar; o rabisco que some em segundos e o que fica; a cor; desfazer o
//     último (e Ctrl+Z); limpar os meus com o aviso e o Desfazer; os traços guardados como os da caneta do Mapa-múndi
//     (mp = "cena:<id>"), e só na cena em que foram feitos;
//   · a visão pelo relevo: do alto se vê por cima das paredes mais baixas que o olho (o chão + 1 quadrado); do chão,
//     a parede barra; a altura própria da parede; a tabela do relevo tem a altura das paredes.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;

(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };

  // ---------- o lápis ----------
  await ev(() => { localStorage.removeItem('tinycats:cenas:rabiscos'); localStorage.removeItem('tinycats:cenas:lapis'); });
  const cv = await page.locator('canvas#cv, #stage canvas, canvas').first().boundingBox();
  const meio = { x: cv.x + cv.width / 2, y: cv.y + cv.height / 2 };
  await page.mouse.move(meio.x, meio.y); await page.keyboard.press('s'); await w(200);
  ok(await ev(() => __tc.App.tool) === 'lapis', 'a tecla S escolhe o lápis');
  ok(await page.locator('#o-lpm').count() === 1 && await page.locator('#o-lpm .seg-b.on').innerText() === 'Some em segundos', 'as opções: "Some em segundos" de começo, ou "Fica até limpar"');
  ok(await page.locator('.o-cores .o-cor').count() === 8, 'as oito cores');
  const nShapes0 = await ev(() => __tc.Store.scene().shapes.length);
  const rabisca = async (dx) => { await page.mouse.move(meio.x + dx, meio.y); await page.mouse.down(); for (let i = 1; i <= 8; i++) await page.mouse.move(meio.x + dx + i * 12, meio.y + (i % 2) * 10); await page.mouse.up(); await w(200); };
  await rabisca(0);
  let tr = await ev(() => __tc.Lapis.daCena(__tc.Store.scene().id));
  ok(tr.length === 1 && tr[0].s === 1 && tr[0].p.length >= 6, 'arrastar faz um rabisco que some (s = 1): ' + JSON.stringify(tr.map(x => [x.s, x.p.length])));
  const guardado = await ev(() => JSON.parse(localStorage.getItem('tinycats:cenas:rabiscos') || 'null'));
  ok(!guardado || !guardado.t.length, 'o que some não fica guardado no navegador');
  ok(await ev(() => __tc.Store.scene().shapes.length) === nShapes0, 'o rabisco não vira desenho da cena (nem entra no desfazer dela)');
  await foto('l65-lapis');
  await page.locator('#o-lpm .seg-b', { hasText: 'Fica até limpar' }).click(); await w(150);
  await page.locator('#o-lpc-7fbf7a').click(); await w(150);
  await rabisca(-200);
  tr = await ev(() => __tc.Lapis.daCena(__tc.Store.scene().id));
  const fica = tr.find(x => !x.s);
  ok(fica && fica.c === '#7fbf7a', '"Fica até limpar" e a cor verde: ' + JSON.stringify(tr.map(x => [x.s, x.c])));
  const g2 = await ev(() => JSON.parse(localStorage.getItem('tinycats:cenas:rabiscos') || 'null'));
  ok(g2 && g2.t.length === 1 && /^cena:/.test(g2.t[0].mp), 'o que fica é guardado como a caneta do Mapa-múndi, marcado com a cena (mp = "cena:…")');
  await w(8600);
  tr = await ev(() => __tc.Lapis.daCena(__tc.Store.scene().id));
  ok(tr.length === 1 && !tr[0].s, 'depois de 8 segundos, o que some sumiu; o que fica continua');
  // outra cena: não aparece
  const outra = await ev(() => { const { Store, newScene } = __tc; let id; Store.tx('nova', () => { const s = newScene('Outra'); Store.S.scenes[s.id] = s; id = s.id; }); return id; }).catch(() => null);
  if (outra) ok(await ev(id => __tc.Lapis.daCena(id).length, outra) === 0, 'em outra cena, os rabiscos desta não aparecem');
  await rabisca(100);
  ok(await ev(() => __tc.Lapis.quantosMeus(__tc.Store.scene().id)) === 2, '(dois que ficam)');
  await page.keyboard.press('Control+z'); await w(200);
  ok(await ev(() => __tc.Lapis.quantosMeus(__tc.Store.scene().id)) === 1, 'Ctrl+Z, com o lápis, tira o meu último rabisco');
  await page.locator('#o-lp-meus').click(); await w(200);
  ok(await ev(() => __tc.Lapis.quantosMeus(__tc.Store.scene().id)) === 0, '"Limpar os meus"');
  const toast = page.locator('.toast', { hasText: 'rabiscos nesta cena saíram' });
  ok(await toast.count() === 1, 'o aviso de que saíram, com o Desfazer');
  await toast.locator('.toast-a').click(); await w(200);
  ok(await ev(() => __tc.Lapis.quantosMeus(__tc.Store.scene().id)) === 1, 'Desfazer traz de volta');
  ok(await page.locator('#o-lp-todos').count() === 0, 'sem mesa, não há "Limpar os de todos" (só os seus)');

  // ---------- a visão pelo relevo: por cima das paredes ----------
  const ids = await ev(() => {
    const { Store, Combate, newToken, App } = __tc, sc = Store.scene();
    Store.tx('preparar', () => {
      Store.scn({ cols: 30, rows: 20, fog: Object.assign({}, sc.fog, { dynamic: true }), relevoVisao: true });
      Store.add('shapes', Combate.newTerrain({ k: 'rect', x: 0, y: 0, w: 6 * 64, h: 20 * 64 }, 'morro', 6));      // 4 q de altura
      // uma parede no chão, a 4 quadrados do morro
      Store.add('walls', { id: 'wl_a', k: 'wall', x1: 10 * 64, y1: 2 * 64, x2: 10 * 64, y2: 18 * 64, open: false, locked: false });
      const a = newToken(sc, 2 * 64, 8 * 64, { name: 'Alta' }), b = newToken(sc, 8 * 64, 8 * 64, { name: 'Baixa' });
      a.vis = { on: true, range: 0, dark: 0 }; b.vis = { on: true, range: 0, dark: 0 };
      Store.add('tokens', a); Store.add('tokens', b);
    });
    App.tool = 'select';
    const s2 = Store.scene();
    return { a: s2.tokens.find(x => x.name === 'Alta').id, b: s2.tokens.find(x => x.name === 'Baixa').id };
  });
  await w(200);
  const barra = id => ev(i => { const s = __tc.Walls.sightFor(__tc.Store.scene(), __tc.Store.get('tokens', i)); for (let k = 0; k + 3 < s.length; k += 4) if (s[k] === 640 && s[k + 2] === 640) return true; return false; }, id);
  ok(await barra(ids.b) === true, 'do chão (o olho a 1 quadrado), a parede de 2 quadrados barra a visão');
  ok(await barra(ids.a) === false, 'do alto do morro (4 q de chão, o olho a 5), a parede lá embaixo não barra: vê por cima');
  await ev(() => __tc.Store.tx('Altura', () => __tc.Store.upd('walls', 'wl_a', { h: 8 }))); await w(150);
  ok(await barra(ids.a) === true, 'a parede com 8 quadrados de altura (a dela) barra até quem está no morro');
  await ev(() => __tc.Store.tx('Altura', () => __tc.Store.upd('walls', 'wl_a', { h: undefined }))); await w(150);
  await ev(() => __tc.Store.tx('Visão', () => __tc.Store.scn({ relevoVisao: undefined }))); await w(150);
  ok(await barra(ids.a) === true, 'com a visão pelo relevo desligada, a parede barra como antes (de qualquer altura)');
  await ev(() => __tc.Store.tx('Visão', () => __tc.Store.scn({ relevoVisao: true }))); await w(150);
  // o painel da parede: a altura
  await ev(() => { __tc.setSel([{ c: 'walls', id: 'wl_a' }]); __tc.UI.openTab('sel'); }); await w(250);
  ok(await page.locator('#wl-h').count() === 1 && await page.locator('#wl-h').inputValue() === '2', 'no painel da parede, com a visão pelo relevo: a altura (2 de começo, a da tabela)');
  await page.locator('#wl-h').fill('5'); await page.locator('#wl-h').dispatchEvent('change'); await w(200);
  ok(await ev(() => __tc.Store.get('walls', 'wl_a').h) === 5, 'mudar a altura da parede no painel');
  await foto('l65-parede');
  // a tabela
  ok(await ev(() => __tc.Relevo.tabela(__tc.Store.scene()).parede) === 2, 'a tabela do relevo: as paredes têm 2 quadrados de começo');

  // (os erros esperados de rede: nenhum aqui)
  ok(!t.errs.some(e => /pageerror/.test(e)), 'nenhum erro na página: ' + t.errs.filter(e => /pageerror/.test(e)).slice(0, 2).join(' | '));
  console.log(n - fails + ' verificações passaram' + (fails ? ', ' + fails + ' falharam' : ''));
  await t.close();
  process.exit(fails ? 1 : 0);
})();
