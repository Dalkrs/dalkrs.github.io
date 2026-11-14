// Bateria do lote 151 (as Cenas): a furtividade medida. (1) O Vigia: o calor (onde os guardas veem, com eles andando),
// a parede que tapa a vista, os dois caminhos e a dificuldade. (2) No gerador: a Dificuldade (põe ou tira guardas até a
// medida bater), o resumo com a medida e o calor na prévia. (3) Na cena: a seção "O calor e os caminhos" da aba Guardas.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, w = ms => p.waitForTimeout(ms);
  // (1) um quarto 12×8: um guarda parado olhando para o leste, uma parede no meio com uma porta
  const r1 = await p.evaluate(() => {
    const V = __tc.Vigia, M = V.novo(12, 8);
    V.parede(M, 6, 0, 6, 3, true, true); V.parede(M, 6, 4, 6, 8, true, true);        // a parede em x=6, com o vão em y=3
    M.guardas.push({ x: 2, y: 6, pts: [], r: 8, a: 120, dir: 0 });
    const C = V.calor(M);
    M.de = [0, 0]; M.para = [10, 6];
    const med = V.medir(M);
    return { perto: C[6 * 12 + 4], atras: C[6 * 12 + 9], costas: C[6 * 12 + 0], curta: med.curta && med.curta.n, nivel: med.nivel, txt: med.texto };
  });
  ok(r1.perto === 1 && r1.atras === 0 && r1.costas === 0, 'o calor: na frente do guarda sim; atrás da parede e nas costas dele não — ' + JSON.stringify(r1));
  ok(r1.curta > 0 && /Dificuldade medida/.test(r1.txt), 'o caminho passa pelo vão da parede e a medida sai — ' + r1.txt);
  // (2) o gerador: a dificuldade pedida
  const r2 = await p.evaluate(() => {
    const F = __tc.Furtividade, L = F.LUGARES.casarao, out = {};
    for (const d of ['facil', 'muito']) { const pl = L.gerar({ tamanho: 'medio', guardas: 'normal', alvo: 'documento', dific: d }, { seed: 1, estilo: 'comum' }); out[d] = { n: pl.guardas.length, nivel: pl.medida.nivel, r: L.resumo(pl) }; }
    const livre = L.gerar({ tamanho: 'medio', guardas: 'normal', alvo: 'documento', dific: 'livre' }, { seed: 1, estilo: 'comum' });
    out.livre = { n: livre.guardas.length, nivel: livre.medida.nivel, cam: livre.medida.caminhos };
    return out;
  });
  ok(r2.facil.nivel === 'facil' && r2.facil.n < r2.livre.n, 'Fácil: o ajuste tira guardas — ' + JSON.stringify(r2.facil));
  ok(r2.muito.nivel === 'muito' && r2.muito.n > r2.livre.n && /entraram \d guardas? parados?/.test(r2.muito.r), 'Muito difícil: o ajuste põe guardas parados no caminho — ' + r2.muito.r);
  ok(r2.livre.cam === 2, '"Pelos guardas": só mede (2 caminhos no casarão)');
  // a janela
  await p.evaluate(() => { __tc.App.opt.furCalor = false; __tc.Gerador.abrir('casarao'); }); await w(800);
  ok(await p.locator('#fur-dific .seg-b').count() === 5 && /Dificuldade medida: /.test(await p.locator('#ger-resumo').innerText()), 'a Dificuldade nos controles e a medida no resumo');
  await p.locator('#fur-dific .seg-b', { hasText: 'Difícil' }).first().click(); await w(500);
  const dif = await p.locator('#ger-resumo').innerText();
  ok(/Dificuldade medida: (Difícil|Muito difícil)/.test(dif) && await p.evaluate(() => __tc.App.opt.furDific) === 'dificil', 'a escolha ajusta e fica guardada — ' + dif);
  const px = () => p.evaluate(() => { const cv = document.querySelector('#ger-prev'); const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data; let s = 0; for (let i = 0; i < d.length; i += 97) s += d[i] * 3 + d[i + 1]; return s; });
  const antes = await px();
  await p.locator('#fur-calor').check({ force: true }); await w(500);
  ok(await px() !== antes && await p.evaluate(() => __tc.App.opt.furCalor) === true, 'o calor na prévia');
  await p.locator('.modal-a .btn.primary').click(); await w(2500);
  // (3) a cena: a aba Guardas
  await p.evaluate(() => { __tc.App.opt.gdCalor = false; __tc.UI.refresh(); }); await p.click('#tab-guard'); await w(400);
  ok(/Dificuldade medida: /.test(await p.locator('#gd-medida').innerText()), 'a aba Guardas mostra a medida — ' + await p.locator('#gd-medida').innerText());
  const mapa = () => p.evaluate(() => { const cv = document.querySelector('#cv'); const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data; let s = 0; for (let i = 0; i < d.length; i += 101) s += d[i] * 3 + d[i + 1]; return s; });
  const m0 = await mapa();
  await p.locator('#gd-calor').check({ force: true }); await w(600);
  ok(await mapa() !== m0, 'a chave pinta o calor no mapa');
  const t0 = await p.locator('#gd-medida').innerText();
  await p.evaluate(() => { const u = __tc, sc = u.Store.scene(); u.Store.tx('x', () => u.Rondas.guardas(sc).forEach(g => u.Store.upd('tokens', g.id, { alerta: 'alerta' }))); u.UI.refresh(); }); await w(400);
  const t1 = await p.locator('#gd-medida').innerText();
  ok(t1 !== t0, 'em alerta (o cone maior, parados) a medida muda — ' + t1);
  // o jogador não vê o calor
  ok(await p.evaluate(() => { const u = __tc; u.App.viewer = 'j1'; let chamou = false; const c = { save() {}, restore() {}, fillRect() { chamou = true; } }; u.Vigia.desenharCena(c, u.Store.scene()); u.App.viewer = 'gm'; return !chamou; }), 'o jogador não vê o calor');
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
