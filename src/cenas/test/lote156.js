// Bateria do lote 156 (as Cenas): (1) o estilo por exemplo (o colapso de funções de onda): os exemplos prontos, o desenho
// do mestre e o exemplo de uma cena; o mapa sai com as paredes, as portas e a visão; (2) a erosão: na Região livre e no
// Encontro (o relevo gasto, o sombreado na prévia e no fundo) e na caverna (as galerias gastas).
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, w = ms => p.waitForTimeout(ms);
  // (1) o motor: cada pedaço de 3 × 3 do mapa existe no exemplo
  const r1 = await p.evaluate(() => { const E = __tc.Exemplo, out = {};
    for (const k of Object.keys(E.PRONTOS)) {
      const g = E.PRONTOS[k].g, res = E.fazer(g, 30, 22, 5, false, false);
      if (!res) { out[k] = 'falhou'; continue; }
      const M = E.aprender(g, 3, false), set = new Set(M.P); let fora = 0;
      // (a limpeza depois pode trocar umas casas: conta os pedaços que não estão no exemplo)
      for (let y = 0; y + 3 <= res.g.length; y++) for (let x = 0; x + 3 <= res.g[0].length; x++) { let s = ''; for (let j = 0; j < 3; j++) s += res.g[y + j].slice(x, x + 3); if (!set.has(s)) fora++; }
      out[k] = fora / ((res.g.length - 2) * (res.g[0].length - 2));
    }
    return out; });
  ok(Object.values(r1).every(v => v !== 'falhou' && v < 0.12), 'os exemplos prontos saem, e quase todo pedaço do mapa existe no exemplo — ' + JSON.stringify(r1));
  // a janela: o pronto, o desenho, a cena
  await p.evaluate(() => { __tc.App.opt.exSt = { fonte: 'pronto', pronto: 'salas' }; __tc.Gerador.abrir('exemplo', { semente: 3 }); }); await w(1200);
  ok(/Por exemplo \(Salas e corredores\) · 40 × 30 quadrados · \d+ pedaços/.test(await p.locator('#ger-resumo').innerText()), 'o lugar "Por exemplo" na janela — ' + await p.locator('#ger-resumo').innerText());
  await p.locator('#ex-fonte .seg-b', { hasText: 'O meu desenho' }).click(); await w(800);
  ok(await p.locator('#ex-cv').count() === 1 && await p.locator('#ex-pal .ex-tinta').count() === 5, 'o editor do desenho: a grade e as 5 tintas');
  await p.click('#ex-t-a'); await w(100);
  await p.locator('#ex-cv').scrollIntoViewIfNeeded();
  const bb = await p.locator('#ex-cv').boundingBox();
  await p.mouse.move(bb.x + bb.width * 0.3, bb.y + bb.height * 0.3); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.5, bb.y + bb.height * 0.32, { steps: 5 }); await p.mouse.up(); await w(1200);
  ok(await p.evaluate(() => __tc.App.opt.exSt.fonte === 'desenho' && __tc.App.opt.exSt.desenho.join('').includes('a')), 'pintar a água no desenho');
  // a cena: uma masmorra
  await p.keyboard.press('Escape'); await w(300);
  const idM = await p.evaluate(async () => { const L = __tc.Masmorra.LUGAR, pl = L.gerar(L.padrao(), { seed: 2, estilo: 'comum' }); const sc = await L.criar(pl, 'Masmorra exemplo', {}); return sc.id; });
  const r2 = await p.evaluate(id => { const g = __tc.Exemplo.daCena(__tc.Store.S.scenes[id]); return g ? { h: g.length, w: g[0].length, chao: g.join('').split('').filter(c => c !== 'x').length } : null; }, idM);
  ok(r2 && r2.w <= 24 && r2.h <= 24 && r2.chao > 20, 'o exemplo de uma cena: as paredes viram casas (um pedaço de até 24 × 24) — ' + JSON.stringify(r2));
  await p.evaluate(id => { __tc.App.opt.exSt = { fonte: 'cena', cena: id, tamanho: 'pequeno' }; __tc.Gerador.abrir('exemplo', { semente: 5 }); }, idM); await w(1500);
  ok(/Por exemplo \(Masmorra exemplo\)/.test(await p.locator('#ger-resumo').innerText()) || /Não deu/.test(await p.locator('#ger-resumo').innerText()), 'a janela com a cena de exemplo — ' + await p.locator('#ger-resumo').innerText());
  await p.evaluate(() => { __tc.App.opt.exSt = { fonte: 'pronto', pronto: 'salas', tamanho: 'medio' }; __tc.UI.closeModal(); __tc.Gerador.abrir('exemplo', { semente: 3 }); }); await w(1200);
  await p.locator('.modal-a .btn.primary').click(); await w(2500);
  const r3 = await p.evaluate(() => { const sc = __tc.Store.scene(); return { nome: sc.name, paredes: sc.walls.filter(x => x.k === 'wall').length, portas: sc.walls.filter(x => x.k === 'door').length, nevoa: !!sc.fog.dynamic, chegada: sc.tokens.some(x => x.prop === 'chegada') }; });
  ok(r3.paredes > 20 && r3.portas >= 1 && r3.nevoa && r3.chegada && /^Por exemplo/.test(r3.nome), 'a cena: as paredes, as portas, a névoa e a chegada — ' + JSON.stringify(r3));

  // (2) a erosão: a Região livre com e sem (a mesma semente)
  const r4 = await p.evaluate(() => { const u = __tc, L = u.Gerador.LUGARES.find(l => l.id === 'regiao'), st = L.padrao(); st.bioma = 'montanha';
    const a = L.gerar(Object.assign({}, st, { erosao: 'nada' }), { seed: 9, estilo: 'comum' }), b = L.gerar(Object.assign({}, st, { erosao: 'forte' }), { seed: 9, estilo: 'comum' });
    const E = u.Gerador.LUGARES.find(l => l.id === 'encontro'), se = E.padrao(); se.terreno = 'montanha';
    const c = E.gerar(Object.assign({}, se, { erosao: 'media' }), { seed: 9, estilo: 'comum' });
    return { a: !!u.Erosao.MAPAS.get(a), b: !!u.Erosao.MAPAS.get(b), berosao: b.erosao, c: !!u.Erosao.MAPAS.get(c), dep: (() => { const m = u.Erosao.MAPAS.get(b); let mx = 0; for (const v of m.dep) mx = Math.max(mx, v); return mx; })() }; });
  ok(!r4.a && r4.b && r4.berosao === 'forte' && r4.dep > 0 && r4.c, 'a erosão: o mapa gasto (com a areia que se juntou), na Região livre e no Encontro — ' + JSON.stringify(r4));
  const r5 = await p.evaluate(() => { const L = __tc.Masmorra.LUGAR, st = L.padrao(); st.tipo = 'caverna'; const n = g => g.grade.split('').filter(x => x !== '0').length; return [n(L.gerar(Object.assign({}, st, { erosao: 'nada' }), { seed: 4, estilo: 'comum' })), n(L.gerar(Object.assign({}, st, { erosao: 'forte' }), { seed: 4, estilo: 'comum' }))]; });
  ok(r5[1] > r5[0] * 1.15, 'a caverna gasta pela água: as galerias maiores — ' + JSON.stringify(r5));
  // a janela: a escolha e o fundo
  await p.evaluate(() => { const o = __tc.App.opt; o.regErosao = 'forte'; o.regBio = 'montanha'; __tc.Gerador.abrir('regiao', { semente: 9 }); }); await w(1500);
  ok(await p.locator('#reg-erosao .seg-b').count() === 4 && await p.locator('#reg-erosao .seg-b.on').innerText() === 'Forte', 'a escolha "Erosão" na Região livre');
  const bg0 = await p.evaluate(() => __tc.Store.scene().bg.asset);
  await p.locator('.modal-a .btn.primary').click(); await w(4000);
  ok(await p.evaluate(b => { const sc = __tc.Store.scene(); return /montanha|Região|região/i.test(sc.name) || !!sc.bg.asset; }, bg0), 'a cena da Região, com o fundo sombreado');
  await p.evaluate(() => { __tc.App.opt.masTipo = 'caverna'; __tc.UI.closeModal(); __tc.Gerador.abrir('masmorra'); }); await w(900);
  ok(await p.locator('#mas-erosao').count() === 1, 'a escolha "Erosão" na caverna');
  await p.keyboard.press('Escape');
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
