// Bateria do lote 152 (as Cenas): (1) a história da missão — a corrente de passos (chave, pista, mecanismo, puzzle) e o
// atalho de volta, no plano, na prévia e na cena (os objetos escondidos, a alavanca ligada à passagem secreta, a lista na
// aba Guardas). (2) A aba Guardas: o cone e a rota separados, por jogador, nos selecionados ou em todos; e
// "Selecionar todos os guardas".
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, w = ms => p.waitForTimeout(ms);
  // (1) o plano: em vários lugares e tamanhos, a corrente certa
  const r1 = await p.evaluate(() => {
    const G = __tc.Gerador.LUGARES, T = __tc.Trama, out = { erros: [], n: {}, porta: 0, bau: 0, mec: 0, atalho: 0 };
    const tipos = { chave: true, pista: true, mecanismo: true, puzzle: true, atalho: true };
    for (const id of ['mansao', 'casarao', 'fortaleza', 'acampamento', 'sobmedida', 'masmorra', 'catacumbas', 'ruinas']) for (const seed of [1, 2, 3, 4]) {
      const L = G.find(l => l.id === id), st = L.padrao(); if (id === 'sobmedida') st.spec.guardas = 'normal';
      const pl = L.gerar(st, { seed, estilo: 'comum' });
      T.tecer(pl, { on: true, tam: 'media', tipos });
      const tr = pl.trama;
      if (!tr || tr.falhou) { out.erros.push(id + seed + ' sem história'); continue; }
      const quer = id === 'catacumbas' ? 2 : 3; if (tr.passos.length < quer || tr.passos.length > 3) out.erros.push(id + seed + ' ' + tr.passos.length + ' passos');
      if (tr.passos.map(s => s.n).join() !== tr.passos.map((_, i) => i + 1).join()) out.erros.push(id + seed + ' ordem');
      // cada portão de porta está mesmo trancado (ou secreto) no plano, e a coisa que abre fica do lado de cá
      for (const s of tr.passos) {
        if (s.porta) { out.porta++; const pw = pl.paredes.find(x => x.x1 === s.porta.x1 && x.y1 === s.porta.y1 && x.x2 === s.porta.x2 && x.y2 === s.porta.y2); if (!pw || !(pw.locked || pw.secret)) out.erros.push(id + seed + ' porta sem tranca'); if (s.tipo === 'mecanismo') out.mec++; }
        else out.bau++;
      }
      if (tr.atalho) { out.atalho++; if (!pl.paredes.some(x => x.atalho && x.locked)) out.erros.push(id + seed + ' atalho sem porta'); }
    }
    return out;
  });
  ok(!r1.erros.length, 'a corrente de 3 passos em todos os lugares — ' + r1.erros.slice(0, 6).join('; '));
  ok(r1.porta > 4 && r1.bau > 4 && r1.mec > 0 && r1.atalho > 0, 'portas trancadas, baús, passagens secretas e atalhos — ' + JSON.stringify(r1));
  // curta e longa
  const r2 = await p.evaluate(() => { const L = __tc.Gerador.LUGARES.find(l => l.id === 'masmorra'), out = [];
    for (const tam of ['curta', 'longa']) for (const seed of [1, 2, 3, 4, 5, 6]) { const pl = L.gerar(L.padrao(), { seed, estilo: 'comum' }); __tc.Trama.tecer(pl, { on: true, tam, tipos: { chave: true, pista: false, mecanismo: false, puzzle: false, atalho: false } }); out.push(tam[0] + pl.trama.passos.length + pl.trama.passos.every(s => s.tipo === 'chave')); }
    return out.join(' '); });
  ok(/c1true/.test(r2) && /c2true/.test(r2) && /l4true/.test(r2) && /l5true/.test(r2) && !/false|c[03-9]|l[0-3]/.test(r2), 'curta 1–2, longa 4–5, só os tipos ligados — ' + r2);

  // a janela: o bloco "A história", a prévia e a cena
  await p.evaluate(() => { const o = __tc.App.opt; o.tramaOn = false; o.tramaTam = 'media'; o.tramaTipos = { chave: true, pista: true, mecanismo: true, puzzle: true, atalho: true }; __tc.Gerador.abrir('masmorra'); }); await w(900);
  const px = () => p.evaluate(() => { const cv = document.querySelector('#ger-prev'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let s = 0; for (let i = 0; i < d.length; i += 89) s += d[i] * 3 + d[i + 1]; return s; });
  const antes = await px();
  ok(await p.locator('#ger-trama-on').count() === 1, 'o bloco "A história" na masmorra');
  await p.locator('#ger-trama-on').check({ force: true }); await w(600);
  ok(await px() !== antes && /A história: 3 passos até/.test(await p.locator('#ger-resumo').innerText()), 'ligada: os números na prévia e o resumo — ' + await p.locator('#ger-resumo').innerText());
  ok(await p.locator('#ger-trama-tam .seg-b').count() === 3 && await p.locator('#ger-trama-mecanismo').count() === 1, 'o tamanho e os tipos');
  await p.locator('.modal-a .btn.primary').click(); await w(2500);
  const r3 = await p.evaluate(() => { const sc = __tc.Store.scene(), tr = sc.trama, toks = tr.passos.flatMap(s => s.ids).map(id => sc.tokens.find(x => x.id === id)).filter(Boolean);
    const itens = sc.tokens.filter(x => ['chave', 'diario', 'alavanca'].includes(x.prop) && /^\d · /.test(x.name || ''));
    const alav = itens.find(x => x.prop === 'alavanca'), sec = alav && sc.walls.find(w => w.id === alav.liga);
    return { n: tr.passos.filter(s => s.n).length, itens: itens.length, escondidos: itens.every(x => x.hidden), notas: itens.every(x => /^Passo \d\./.test(x.notes)), alav: !!alav, sec: alav ? !!(sec && sec.secret) : null, txt: tr.passos.map(s => s.txt).join(' | '), toks: toks.length };
  });
  ok(r3.n === 3 && r3.itens === 3 && r3.escondidos && r3.notas, 'na cena: os 3 objetos escondidos, com o nome e a nota do passo — ' + JSON.stringify(r3));
  ok(r3.sec !== false, 'a alavanca abre a passagem secreta (liga) — ' + r3.txt);
  await p.evaluate(() => { __tc.UI.refresh(); }); await p.click('#tab-guard'); await w(400);
  ok(await p.locator('#s-gd-trama .gd-tr').count() >= 3, 'a lista na aba Guardas');
  await p.locator('#gd-tr-1').check({ force: true }); await w(300);
  ok(await p.evaluate(() => __tc.Store.scene().trama.feitos.includes(1)), 'o mestre marca o passo feito');

  // (2) a aba Guardas: o cone e a rota separados
  await p.evaluate(async () => { const F = __tc.Furtividade, L = F.LUGARES.casarao; const pl = L.gerar({ tamanho: 'medio', guardas: 'normal', alvo: 'documento' }, { seed: 7, estilo: 'comum' }); const sc = await L.criar(pl, 'Casarão', { hora: 'noite' }); __tc.UI.switchScene(sc.id); __tc.Store.S.players = [{ id: 'j1', name: 'Dain' }, { id: 'j2', name: 'Lia' }]; __tc.setSel([]); __tc.UI.refresh(); });
  await w(600); await p.click('#tab-guard'); await w(300);
  await p.locator('#gd-ver-r-j1').check({ force: true }); await w(300);
  ok(await p.evaluate(() => __tc.Rondas.guardas(__tc.Store.scene()).every(t => t.ronda.ver && t.ronda.ver.rotas.join() === 'j1' && !t.ronda.ver.para.length)), 'só a rota para o Dain, sem o cone');
  await p.locator('#gd-ver-c-j2').check({ force: true }); await w(300);
  ok(await p.evaluate(() => __tc.Rondas.guardas(__tc.Store.scene()).every(t => t.ronda.ver.para.join() === 'j2' && t.ronda.ver.rotas.join() === 'j1')), 'o cone para a Lia, a rota continua do Dain');
  const pr = await p.evaluate(() => { const sc = __tc.Store.scene(), g = __tc.Rondas.guardas(sc).find(x => x.ronda.pts.length > 1); const v = __tc.Proj.projetar(sc, {}, new Set(['j1', 'j2'])).v.tokens.find(x => x.id === g.id); return JSON.parse(JSON.stringify(v.vc)); });
  ok(pr.para.join() === 'j2' && pr.rp.join() === 'j1' && pr.pts && pr.pts.length > 1, 'na projeção: o cone e a rota, cada um para o seu');
  // a tela do jogador: o Dain vê a rota e não o cone
  ok(await p.evaluate(() => { const sc = __tc.Store.scene(), g = __tc.Rondas.guardas(sc)[0], tk = Object.assign({}, g, { vc: { para: ['j2'], rp: ['j1'], pts: [[1, 1], [3, 1]] } }); delete tk.ronda; const u = __tc; u.App.viewer = 'j1'; const r = [u.Rondas.coneMeu(tk), u.Rondas.rotaMeu(tk)]; u.App.viewer = 'j2'; r.push(u.Rondas.coneMeu(tk), u.Rondas.rotaMeu(tk)); u.App.viewer = 'gm'; return r.join() === 'false,true,true,false'; }), 'cada jogador vê só o que foi mostrado a ele');
  // só os selecionados
  await p.click('#gd-sel-todos'); await w(300);
  ok(await p.evaluate(() => { const sc = __tc.Store.scene(); return __tc.App.sel.length === __tc.Rondas.guardas(sc).length && __tc.App.sel.length > 1; }), '"Selecionar todos os guardas"');
  await p.evaluate(() => { const sc = __tc.Store.scene(), g = __tc.Rondas.guardas(sc)[0]; __tc.setSel([{ c: 'tokens', id: g.id }]); __tc.App.tab = 'guard'; __tc.UI.refresh(); }); await w(300);
  ok(/o guarda selecionado/.test(await p.locator('#s-gd-ver').innerText()), 'com um guarda selecionado, vale só para ele');
  await p.locator('#gd-ver-c-j1').check({ force: true }); await w(300);
  ok(await p.evaluate(() => { const gs = __tc.Rondas.guardas(__tc.Store.scene()); return gs[0].ronda.ver.para.join() === 'j2,j1' && gs.slice(1).every(t => t.ronda.ver.para.join() === 'j2'); }), 'mudou só o do selecionado');
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
