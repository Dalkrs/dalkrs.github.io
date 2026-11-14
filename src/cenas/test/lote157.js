// Bateria do lote 157 (as Cenas): (1) o passeio das novidades do gerador (abre as telas e acende cada novidade; uma
// vez só; no menu ⋯ para rever); (2) as zonas: tirar com um clique ou com o botão direito; a casa é uma só; (3) a IA
// desenha a planta (a casa, os cômodos, o lago) pelas zonas.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, w = ms => p.waitForTimeout(ms);
  // (1) o passeio
  ok(await p.evaluate(() => !__tc.Novidades.vistas()), 'as novidades ainda não vistas');
  await p.evaluate(() => __tc.Novidades.start()); await w(500);
  const vistos = [];
  for (let i = 0; i < 20; i++) {
    const tt = await p.locator('#tour-title').innerText().catch(() => null);
    if (!tt) break;
    const hole = await p.evaluate(() => { const h = document.querySelector('.tour-hole'); return h && !h.classList.contains('none'); });
    vistos.push(tt + (hole ? '*' : ''));
    const bt = await p.locator('#tour-next').innerText();
    await p.click('#tour-next'); await w(450);
    if (bt === 'Concluir') break;
  }
  ok(vistos.length === 19 && vistos.filter(x => x.endsWith('*')).length >= 15, 'o passeio: 19 cartões (lote 158: mais 4), os das telas com o destaque — ' + vistos.join(' | '));
  ok(await p.evaluate(() => __tc.Novidades.vistas() && !__tc.UI.modalOpen()), 'no fim: marcado como visto, e a janela que ele abriu fechou');
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'o passeio sem erros: ' + t.errs.slice(0, 3).join(' | '));
  // (2) as zonas: tirar
  await p.evaluate(() => { __tc.App.opt.zonas = { casarao: [{ k: 'casa', x: 10, y: 10, w: 12, h: 9 }, { k: 'agua', x: 30, y: 12, w: 8, h: 6 }] }; __tc.Gerador.abrir('casarao'); }); await w(1200);
  await p.locator('#ger-prev').scrollIntoViewIfNeeded(); await w(200);
  const bb = await p.locator('#ger-prev').boundingBox();
  const pt = await p.evaluate(([gx, gy]) => { const v = __tc.Gerador.vivo(), c = v.cell(), cv = document.querySelector('#ger-prev'), r = cv.getBoundingClientRect(), k = Math.min(r.width / cv.width, r.height / cv.height), ox = (r.width - cv.width * k) / 2, oy = (r.height - cv.height * k) / 2; return [ox + gx * c * k, oy + gy * c * k]; }, [33, 14]);
  await p.mouse.click(bb.x + pt[0], bb.y + pt[1], { button: 'right' }); await w(500);
  ok(await p.evaluate(() => __tc.App.opt.zonas.casarao.length === 1 && __tc.App.opt.zonas.casarao[0].k === 'casa'), 'o botão direito numa zona tira a zona');
  await p.evaluate(() => { const d = document.getElementById('ger-bl-zonas'); d.open = true; }); await p.locator('#ger-zonas-on').check({ force: true }); await w(300);
  await p.locator('#ger-zonas-tipo .seg-b', { hasText: 'Casa' }).click(); await w(200);
  await p.locator('#ger-prev').scrollIntoViewIfNeeded(); await w(200);
  const bb2 = await p.locator('#ger-prev').boundingBox();
  await p.mouse.move(bb2.x + bb2.width * 0.55, bb2.y + bb2.height * 0.3); await p.mouse.down(); await p.mouse.move(bb2.x + bb2.width * 0.8, bb2.y + bb2.height * 0.6, { steps: 5 }); await p.mouse.up(); await w(600);
  ok(await p.evaluate(() => { const l = __tc.App.opt.zonas.casarao; return l.length === 1 && l[0].k === 'casa' && l[0].x > 20; }), 'a casa nova fica no lugar da de antes (a casa é uma só)');
  const pt2 = await p.evaluate(() => { const z = __tc.App.opt.zonas.casarao[0], v = __tc.Gerador.vivo(), c = v.cell(), cv = document.querySelector('#ger-prev'), r = cv.getBoundingClientRect(), k = Math.min(r.width / cv.width, r.height / cv.height), ox = (r.width - cv.width * k) / 2, oy = (r.height - cv.height * k) / 2; return [ox + (z.x + 1) * c * k, oy + (z.y + 1) * c * k]; });
  await p.mouse.click(bb2.x + pt2[0], bb2.y + pt2[1]); await w(500);
  ok(await p.evaluate(() => __tc.App.opt.zonas.casarao.length === 0), 'com o desenho ligado, um clique na zona tira');
  await p.locator('#ger-zonas-on').uncheck({ force: true }); await w(200);
  await p.keyboard.press('Escape'); await w(300);
  // (3) a IA desenha a planta (uma resposta de mentira, no lugar do servidor)
  await p.evaluate(() => { window.TC = window.TC || {}; window.TC.ia = { pedir: async () => ({ dados: { lugar: 'sobmedida', nome: 'Casa do lago', sobmedida: { terreno: 'medio', muro: true, porte: 'nobre', terreo: ['sala', 'cozinha', 'quarto'], anexos: [], guardas: 'nenhum' },
    planta: { casa: { x: 45, y: 35, w: 40, h: 40 }, salas: [{ x: 0, y: 0, w: 50, h: 45, uso: 'cozinha' }, { x: 50, y: 0, w: 50, h: 45, uso: 'quarto' }, { x: 0, y: 60, w: 100, h: 40, uso: 'sala' }], agua: [{ x: 8, y: 10, w: 25, h: 25 }] } }, restam: 9 }) }; __tc.App.opt.zonas = {}; __tc.Gerador.abrir('sobmedida'); }); await w(900);
  await p.evaluate(() => { const d = document.getElementById('ger-bl-ia'); if (d) d.open = true; });
  await p.fill('#ger-ia-texto', 'Uma casa nobre à beira de um lago, com cozinha e quarto lado a lado e a sala na frente.'); await p.click('#ger-ia'); await w(1500);
  const r3 = await p.evaluate(() => { const zs = __tc.App.opt.zonas.sobmedida || [], pl = __tc.Gerador.vivo().estado.plano; return { zs: zs.map(z => z.k + (z.papel ? ':' + z.papel : '')).join(','), lago: pl.pintados.some(x => x.k === 'lago'), cozinha: pl.salas.some(q => q.papel === 'cozinha'), msg: document.querySelector('#ger-bl-ia').innerText }; });
  ok(/casa,sala:cozinha,sala:quarto,sala:sala,agua/.test(r3.zs) && r3.lago && r3.cozinha && /a planta desenhada/.test(r3.msg), 'a IA desenha a planta: a casa, os cômodos e o lago viram as zonas — ' + JSON.stringify(r3).slice(0, 300));
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
