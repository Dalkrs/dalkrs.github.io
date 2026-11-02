// Mapa-múndi, lote 57 (a página sozinha, no navegador; sem mesa, quem usa é o mestre): a água e a fenda que se ligam.
//   · a costa: as correntes entre a água e a terra, com a margem de cada tipo — a areia (o mar na planície), o junco (o
//     lago, o pântano, a mata), a falésia (a montanha no mar), o gelo (a neve no mar) e a foz (onde o rio deságua);
//   · a fenda do desfiladeiro ligada (com o rio no fundo num trecho e a ponte suspensa da estrada);
//   · a cordilheira, a borda da mata e os canais do pântano, de perto; sem erros no console.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }

(async () => {
  const t = await start();
  const dv = await t.device({ name: 'mundo-l57', w: 1400, h: 900 });
  dv.page.setDefaultTimeout(8000);
  const P = dv.page, F = P.mainFrame();
  const A = (fn, arg) => F.evaluate(fn, arg);
  const foto = async nome => { if (process.env.TC_SCRATCH) { require('fs').mkdirSync(path.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const dados = () => A(() => Object.assign({}, (document.querySelector('canvas.hex-desenho') || {}).dataset || {}));

  await passo('o mapa', async () => {
    await P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await F.fill('#vazio [data-k="vz:nome"]', 'Água'); await F.click('#vazio [data-k="vz:papel"]'); await espera(400);
    const feito = await A(() => {
      const App = __mundo.App;
      const ok = App.mudar('pintar', m => {
      m.grade.tam = Math.round(Math.min(m.larg, m.alt) / 11); m.grade.on = true; m.grade.alfa = 0.25;
      const hx = {}, ids = new Set(m.terrenos.map(t => t.id));
      const D = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
      const put = (c, r, t) => { hx[(c - Math.floor(r / 2)) + ',' + r] = t; };
      for (let r = -1; r <= 11; r++) for (let c = -1; c <= 17; c++) {
        let t = 'pl'; const n = Math.sin(c * 0.9 + r * 0.4) + Math.cos(r * 0.7 - c * 0.3);
        if (n > 0.9) t = 'fl';
        if (c >= 13) t = c >= 16 ? 'md' : c >= 15 ? 'ar' : 'pl';
        if (r <= 1 && c <= 6) t = 'mo';
        if (r >= 9 && c <= 3) t = 'pa';
        if (r >= 9 && c >= 12) t = 'ne';
        put(c, r, t);
      }
      [[2, 2], [3, 2]].forEach(([c, r]) => put(c, r, 'mo'));
      // o mar entra numa baía; o raso na borda; a falésia: montanha encostada no mar
      [[14, 4], [14, 5], [13, 5], [14, 6]].forEach(([c, r]) => put(c, r, 'ar'));
      [[15, 5], [15, 4], [15, 6]].forEach(([c, r]) => put(c, r, 'md'));
      [[14, 1], [14, 2], [13, 1]].forEach(([c, r]) => put(c, r, 'mo'));
      // o lago (água doce) no meio, irregular
      [[6, 5], [7, 5], [8, 5], [6, 6], [7, 6], [8, 6], [7, 4], [5, 6], [7, 7]].forEach(([c, r]) => put(c, r, 'lg'));
      // o pântano encosta no lago
      [[4, 7], [5, 7], [4, 8], [5, 8], [6, 8]].forEach(([c, r]) => put(c, r, 'pa'));
      // o rio: da montanha ao lago, e do lago à baía
      let q, rr; const trilha = (c, r, dirs, t) => { q = c - Math.floor(r / 2); rr = r; hx[q + ',' + rr] = t; for (const d of dirs) { q += D[d][0]; rr += D[d][1]; if (!['lg', 'df'].includes(hx[q + ',' + rr]) || t === 'df') hx[q + ',' + rr] = t; } };
      trilha(3, 3, [5, 0, 5, 0, 5], 'ri');
      trilha(9, 6, [0, 0, 1, 0], 'ri');
      hx[(10 - 3) + ',6'] = 'df'; hx[(11 - 3) + ',6'] = 'df';
      // o desfiladeiro: uma fenda do norte que desce até o rio; o rio corre no fundo dela num trecho
      trilha(9, 0, [5, 4, 5, 0], 'df');
      // uma estrada atravessa a fenda (a ponte suspensa)
      trilha(7, 2, [0, 0, 0], 'et');
      hx[(10 - 1) + ',' + 2] = 'et';
      // um desfiladeiro que chega ao mar
      trilha(12, 7, [0, 0], 'df');
      for (const k in hx) if (!ids.has(hx[k])) delete hx[k];
      m.hexes = hx;
    });
      return ok;
    });
    ok(feito, '(o mundo pintado: o lago, o mar com o raso e o fundo, o rio, a fenda, a estrada, o pântano, a neve)');
    await espera(1500);
    const d = await dados();
    const [n, tipos] = String(d.costa || '0:').split(':');
    ok(+n >= 2 && ['areia', 'junco', 'rocha', 'gelo', 'foz'].every(x => tipos.split(',').includes(x)), 'a costa em correntes, com a areia, o junco, a falésia, o gelo e a foz: ' + d.costa);
    const [fe, comRio, ponte] = String(d.fendas || '0:0:0').split(':').map(Number);
    ok(fe >= 6 && comRio >= 2 && ponte >= 1, 'a fenda ligada (com o rio no fundo em dois hexágonos e uma ponte suspensa): ' + d.fendas);
    ok(/(^|,)lg:/.test(d.ters || '') && !/(^|,)df:/.test(d.ters || ''), 'o lago pintado; o desfiladeiro desenhado como rede, por cima do terreno da margem: ' + d.ters);
    await foto('l57-mapa');
  });

  await passo('de perto', async () => {
    for (const [nome, x, y] of [['l57-lago', 520, 430], ['l57-fenda', 640, 245], ['l57-costa', 960, 330]]) {
      await P.mouse.move(x, y); for (let i = 0; i < 3; i++) { await P.mouse.wheel(0, -300); await espera(250); }
      await espera(900);
      const d = await dados();
      ok(d.liso === '1', nome + ': de perto, com o desenho em cada hexágono');
      await foto(nome);
      for (let i = 0; i < 3; i++) { await P.mouse.wheel(0, 300); await espera(250); }
    }
  });

  const erros = dv.errs ? dv.errs.filter(e => !/favicon|fonts\.g/.test(e)) : [];
  ok(!erros.length, 'sem erros no console: ' + erros.slice(0, 3).join(' | '));
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
