// Mapa-múndi, lote 8, pela interface (a página sozinha, no navegador):
//   · (parte 1) a textura dos hexágonos pintados: de longe (os hexágonos miúdos na tela), a tinta tem os desenhos da
//     textura (as árvores da floresta); de perto, quando cada hexágono ganha o seu desenho, a tinta fica só com a cor e
//     as manchas — os desenhos da textura, de outro tamanho, não ficam mais por cima dos de cada hexágono; sem os
//     desenhos de cada hexágono, a textura fica também de perto.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function escrever(a, k, v) { const c = campo(a, k); await c.fill(v); await c.press('Enter'); await a.F.waitForTimeout(160); }
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(160); }
const zoom = async (a, z) => { await A(a, z => { window.MundoTela.zoom = z; }, z); await espera(700); };

// Os pixels da tinta dos hexágonos de floresta do miolo (longe da beirada macia da área pintada), em amostras de meia
// unidade do mapa: "cantos" são as do canto de cada hexágono (fora do círculo de dentro dele, onde o desenho do
// hexágono não chega); "miolo", as de perto do centro. "Escuras" são as do verde das árvores (bem mais escuro que a cor
// da floresta, #3f7a46): as manchas da tinta lisa são de leve e não chegam lá.
const amostrar = a => A(a, () => {
  const { App, N } = __mundo, m = App.mapa, cv = document.querySelector('#mundo canvas.hex-desenho');
  if (!cv || cv.hidden) return null;
  const k = Number(cv.dataset.k), x0 = Number(cv.dataset.x0), y0 = Number(cv.dataset.y0);
  const tmp = document.createElement('canvas'); tmp.width = cv.width; tmp.height = cv.height;
  const tc = tmp.getContext('2d', { willReadFrequently: true }); tc.drawImage(cv, 0, 0);
  const img = tc.getImageData(0, 0, cv.width, cv.height).data;
  const c0 = N.hexDe(m, m.larg / 2, m.alt / 2), u = m.grade.tam / 2;
  const dentro = new Set();
  for (const ch of Object.keys(m.hexes)) { const [q, r] = ch.split(',').map(Number); if (N.distHex({ q, r }, c0) <= 3) dentro.add(ch); }
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const ch of dentro) { const [q, r] = ch.split(',').map(Number); for (const [x, y] of N.cantosHex(m, q, r)) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); } }
  const out = { cantos: 0, cantosEscuras: 0, miolo: 0, mioloEscuras: 0, k, liso: cv.dataset.liso, des: cv.dataset.des };
  for (let y = by0; y <= by1; y += 0.5) for (let x = bx0; x <= bx1; x += 0.5) {
    const h = N.hexDe(m, x, y);
    if (!dentro.has(h.q + ',' + h.r)) continue;
    const px = Math.round((x - x0) * k), py = Math.round((y - y0) * k);
    if (px < 0 || py < 0 || px >= cv.width || py >= cv.height) continue;
    const i = (py * cv.width + px) * 4, escura = img[i + 3] > 200 && img[i + 1] < 108;
    const c = N.centroHex(m, h.q, h.r), d = Math.hypot(x - c.x, y - c.y);
    if (d > u * 1.02) { out.cantos++; if (escura) out.cantosEscuras++; }
    else if (d < u * 0.9) { out.miolo++; if (escura) out.mioloEscuras++; }
  }
  return out;
});

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'lote8', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('o mapa e a grade', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await aba(L, 'terreno');
    await escrever(L, 'ter:tam', '40');
    ok((await A(L, () => __mundo.App.mapa.grade.tam)) === 40, '(a grade de 40 unidades)');
  });

  await passo('a textura de longe e de perto', async () => {
    // uma floresta grande no meio do mapa (os hexágonos a até 5 do hexágono do meio)
    await A(L, () => {
      const { App, N } = __mundo;
      App.mudar('pintar', m => { const c0 = N.hexDe(m, m.larg / 2, m.alt / 2); for (let q = c0.q - 6; q <= c0.q + 6; q++) for (let r = c0.r - 6; r <= c0.r + 6; r++) if (N.distHex({ q, r }, c0) <= 5) m.hexes[q + ',' + r] = 'fl'; });
    });
    await espera(400);
    // de longe: os hexágonos com menos de 12 pixels na tela — a tinta tem as árvores da textura
    await zoom(L, 0.25);
    const longe = await amostrar(L);
    ok(longe && longe.liso === '0' && longe.des === '1', 'de longe, a tinta fica com os desenhos da textura (os hexágonos miúdos não têm o desenho de cada um): ' + j(longe));
    ok(longe && longe.miolo + longe.cantos > 200 && longe.cantosEscuras + longe.mioloEscuras > 0.02 * (longe.miolo + longe.cantos), 'de longe, as árvores da textura aparecem na tinta: ' + j(longe));
    await foto('l8-textura-longe');
    // de perto: cada hexágono tem o seu desenho — a tinta fica só com a cor e as manchas
    await zoom(L, 3);
    const perto = await amostrar(L);
    ok(perto && perto.liso === '1', 'de perto, com o desenho de cada hexágono, a tinta fica lisa: ' + j(perto));
    ok(perto && perto.cantos > 2000 && perto.cantosEscuras === 0, 'de perto, nenhuma árvore da textura no canto dos hexágonos, onde o desenho de cada um não chega (antes, as árvores grandes da textura ficavam por cima): ' + j(perto));
    ok(perto && perto.mioloEscuras > 0.03 * perto.miolo, 'de perto, o desenho de cada hexágono continua lá (as árvores de cada um): ' + j(perto));
    await foto('l8-textura-perto');
    // sem os desenhos de cada hexágono, a textura fica também de perto
    await campo(L, 'ter:des').uncheck(); await espera(500);
    const semDes = await amostrar(L);
    ok(semDes && semDes.liso === '0' && semDes.des === '0' && semDes.cantosEscuras > 0.02 * semDes.cantos, 'sem os desenhos de cada hexágono ("Desenho em cada hexágono" desligado), a textura fica também de perto: ' + j(semDes));
    await campo(L, 'ter:des').check(); await espera(500);
    // e longe de novo: a textura volta (a lisa e a com desenhos não se confundem)
    await zoom(L, 0.25);
    const deNovo = await amostrar(L);
    ok(deNovo && deNovo.liso === '0' && deNovo.cantosEscuras + deNovo.mioloEscuras > 0.02 * (deNovo.miolo + deNovo.cantos), 'afastando de novo, as árvores da textura voltam: ' + j(deNovo));
    await zoom(L, 3);
    const pertoDeNovo = await amostrar(L);
    ok(pertoDeNovo && pertoDeNovo.liso === '1' && pertoDeNovo.cantosEscuras === 0, 'e aproximando de novo, somem: ' + j(pertoDeNovo));
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
