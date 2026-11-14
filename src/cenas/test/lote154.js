// Bateria do lote 154 (as Cenas): as zonas desenhadas à mão (a casa, as salas, a água, a mata, o pátio, o vazio; na
// masmorra, as salas, a água e o vazio), "Outra versão deste cômodo" (na prévia e na cena pronta) e os caminhos do quintal
// do sob medida, que não atravessam mais os anexos.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, w = ms => p.waitForTimeout(ms);
  const r1 = await p.evaluate(() => {
    const u = __tc, F = u.Furtividade, res = {};
    const zon = [{ k: 'casa', x: 30, y: 8, w: 20, h: 14 }, { k: 'sala', x: 30, y: 8, w: 8, h: 6, papel: 'cozinha' }, { k: 'sala', x: 38, y: 8, w: 12, h: 6, papel: 'biblioteca' }, { k: 'agua', x: 6, y: 6, w: 10, h: 7 }, { k: 'mata', x: 6, y: 20, w: 10, h: 8 }, { k: 'vazio', x: 20, y: 30, w: 6, h: 6 }, { k: 'patio', x: 40, y: 30, w: 6, h: 5 }];
    const pl = F.LUGARES.casarao.gerar({ tamanho: 'medio', guardas: 'normal', alvo: 'sorteio', zonas: zon }, { seed: 3, estilo: 'comum' });
    u.Zonas.pos(pl, zon);
    const sal = pl.salas.filter(q => q.x >= 30 && q.y >= 8 && q.x < 50 && q.y < 22);
    res.casa = sal.length >= 3 && sal.every(q => q.x + q.w <= 50 && q.y + q.h <= 22);
    res.salas = sal.some(q => q.papel === 'cozinha' && q.x === 30 && q.y === 8 && q.w === 8 && q.h === 6) && sal.some(q => q.papel === 'biblioteca' && q.x === 38 && q.w === 12);
    res.portas = pl.paredes.filter(x => x.k === 'door' && x.x1 >= 30 && x.x1 <= 50 && x.y1 >= 8 && x.y1 <= 22).length;
    res.lago = pl.pintados.some(x => x.k === 'lago');
    res.mata = pl.objetos.filter(o => o.id === 'arvore' && o.x >= 6 && o.x < 16 && o.y >= 20 && o.y < 28).length;
    res.vazio = pl.objetos.filter(o => o.x >= 20 && o.x < 26 && o.y >= 30 && o.y < 36).length;
    res.patio = pl.pintados.some(x => x.k === 'piso' && x.tipo === 'calcada' && x.x === 40 && x.y === 30);
    // a masmorra
    const L = u.Masmorra.LUGAR, st = L.padrao(); st.zonas = [{ k: 'sala', x: 5, y: 5, w: 8, h: 6 }, { k: 'vazio', x: 20, y: 10, w: 10, h: 12 }];
    const pm = L.gerar(st, { seed: 2, estilo: 'comum' });
    res.masmSala = pm.salas.some(q => q.x === 5 && q.y === 5 && q.w === 8 && q.h === 6);
    res.masmVazio = !pm.salas.some(q => q.x < 30 && q.x + q.w > 20 && q.y < 22 && q.y + q.h > 10) && !pm.grade.split('').some((c, k) => c !== '0' && (k % pm.W) >= 21 && (k % pm.W) < 29 && Math.floor(k / pm.W) >= 11 && Math.floor(k / pm.W) < 21);
    // outra versão: a sala muda, o resto não
    const a = F.LUGARES.mansao.gerar({ tamanho: 'medio', guardas: 'normal', alvo: 'sorteio' }, { seed: 5, estilo: 'comum' });
    const q = a.salas.find(x => x.papel === 'biblioteca' || x.papel === 'quarto'), k = F.chaveSala({ p: { nivel: 0 } }, q);
    const b = F.LUGARES.mansao.gerar({ tamanho: 'medio', guardas: 'normal', alvo: 'sorteio', variantes: { [k]: 1 } }, { seed: 5, estilo: 'comum' });
    const inQ = o => o.x >= q.x && o.y >= q.y && o.x < q.x + q.w && o.y < q.y + q.h, sig = l => l.map(o => o.id + o.x + ',' + o.y).sort().join(';');
    res.varMudou = sig(a.objetos.filter(inQ)) !== sig(b.objetos.filter(inQ)); res.varResto = sig(a.objetos.filter(o => !inQ(o))) === sig(b.objetos.filter(o => !inQ(o)));
    return res;
  });
  ok(r1.casa && r1.salas && r1.portas >= 3, 'a casa e as salas desenhadas: no lugar, com as portas — ' + JSON.stringify(r1));
  ok(r1.lago && r1.mata >= 5 && r1.vazio === 0 && r1.patio, 'a água (o lago), a mata, o vazio e o pátio');
  ok(r1.masmSala && r1.masmVazio, 'na masmorra: a sala desenhada entra, e nada passa no vazio');
  ok(r1.varMudou && r1.varResto, 'outra versão: os móveis do cômodo mudam, o resto fica igual');
  // os caminhos do quintal não atravessam os anexos
  const r2 = await p.evaluate(() => { const u = __tc, L = u.Furtividade.LUGAR_SOB, erros = [];
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const st = L.padrao(); st.spec = u.Furtividade.specLimpa({ terreno: 'grande', muro: true, porte: 'nobre', terreo: ['sala', 'cozinha', 'banheiro', 'quarto'], anexos: [{ t: 'piscina', n: 1 }, { t: 'estufa', n: 2 }, { t: 'ferramentas', n: 1 }, { t: 'estabulo', n: 1 }], guardas: 'normal' });
      const pl = L.gerar(st, { seed, estilo: 'comum' });
      const caixas = []; for (const w of pl.paredes) if (w.k === 'mureta' || w.k === 'wall') caixas.push(w);
      // os retângulos dos anexos com paredes: as salas que não são da casa
      const anexos = pl.salas.filter(q => ['estufa', 'ferramentas', 'estabulo'].includes(q.papel));
      for (const c of pl.pintados.filter(x => x.k === 'caminho' && x.w < 2)) {
        const pts = c.pts.map(([x, y]) => [x - 0.5, y - 0.5]);
        for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], nn = Math.max(Math.abs(bx - ax), Math.abs(by - ay)); for (let s2 = 1; s2 < nn; s2++) { const x = Math.round(ax + (bx - ax) * s2 / nn), y = Math.round(ay + (by - ay) * s2 / nn); if (anexos.some(q => x >= q.x && y >= q.y && x < q.x + q.w && y < q.y + q.h)) erros.push(seed + '@' + x + ',' + y); } }
      }
    }
    return erros; });
  ok(!r2.length, 'os caminhos do quintal não atravessam os anexos — ' + r2.slice(0, 5).join(' '));
  // a janela: o bloco, desenhar com o mouse, o clique num cômodo
  await p.evaluate(() => { const o = __tc.App.opt; o.zonas = {}; o.tramaOn = false; o.tempoNivel = 'novo'; o.tempoEvento = 'nada'; __tc.Gerador.abrir('casarao'); }); await w(900);
  ok(await p.locator('#ger-zonas-on').count() === 1, 'o bloco "Zonas à mão"');
  await p.locator('#ger-zonas-on').check({ force: true }); await w(300);
  await p.locator('#ger-zonas-tipo .seg-b', { hasText: 'Água' }).click(); await w(200);
  await p.locator('#ger-prev').scrollIntoViewIfNeeded(); await w(200);
  const bb = await p.locator('#ger-prev').boundingBox();
  await p.mouse.move(bb.x + bb.width * 0.08, bb.y + bb.height * 0.1); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.2, bb.y + bb.height * 0.25, { steps: 6 }); await p.mouse.up(); await w(600);
  const zs = await p.evaluate(() => __tc.App.opt.zonas.casarao);
  ok(zs && zs.length === 1 && zs[0].k === 'agua' && zs[0].w >= 3 && await p.locator('.ger-zl').count() === 1, 'arrastar na prévia cria a zona (e a lista mostra) — ' + JSON.stringify(zs));
  ok(await p.evaluate(() => __tc.Gerador.vivo().estado.plano.pintados.some(x => x.k === 'lago')), 'o lago entra na prévia');
  await p.click('#ger-zl-x-0'); await w(400);
  ok(await p.evaluate(() => __tc.App.opt.zonas.casarao.length === 0), 'o × tira a zona');
  await p.locator('#ger-zonas-on').uncheck({ force: true }); await w(300);
  // o clique num cômodo
  await p.locator('#ger-prev').scrollIntoViewIfNeeded(); await w(200);
  const bb2 = await p.locator('#ger-prev').boundingBox();
  const alvo = await p.evaluate(() => { const v = __tc.Gerador.vivo(), pl = v.estado.plano, q = pl.salas.find(x => x.papel === 'biblioteca' || x.papel === 'quarto' || x.papel === 'cozinha'), c = v.cell(); return { x: (q.x + q.w / 2) * c, y: (q.y + q.h / 2) * c, papel: q.papel }; });
  const cvw = await p.evaluate(() => [document.querySelector('#ger-prev').width, document.querySelector('#ger-prev').height]);
  const k = Math.min(bb2.width / cvw[0], bb2.height / cvw[1]), ox = (bb2.width - cvw[0] * k) / 2, oy = (bb2.height - cvw[1] * k) / 2;
  await p.mouse.click(bb2.x + ox + alvo.x * k, bb2.y + oy + alvo.y * k); await w(500);
  ok(await p.evaluate(() => Object.values(__tc.Gerador.vivo().estado.op.variantes || {}).some(v => v === 1)), 'clicar num cômodo da prévia: outra versão dele');
  await p.locator('.modal-a .btn.primary').click(); await w(2500);
  // na cena pronta
  const r3 = await p.evaluate(() => { const u = __tc, sc = u.Store.scene(), q = sc.comodos.salas.find(x => x.papel === 'biblioteca' || x.papel === 'quarto' || x.papel === 'cozinha' || x.papel === 'salao'); if (!q) return null;
    const dentro = t => t.prop && t.x / sc.cell >= q.x && t.y / sc.cell >= q.y && t.x / sc.cell < q.x + q.w && t.y / sc.cell < q.y + q.h;
    const antes = sc.tokens.filter(dentro).map(t => t.id).sort().join(), achou = u.Furtividade.comodoEm(sc, (q.x + 0.5) * sc.cell, (q.y + 0.5) * sc.cell);
    const nn = u.Furtividade.outraVersaoCena(sc, q), depois = u.Store.scene().tokens.filter(dentro).map(t => t.id).sort().join();
    return { achou: !!achou, nn, mudou: antes !== depois, outras: u.Store.scene().tokens.length > 0 }; });
  ok(r3 && r3.achou && r3.nn > 0 && r3.mudou, '"Outra versão deste cômodo" na cena pronta — ' + JSON.stringify(r3));
  await p.evaluate(() => __tc.Tools.undo()); await w(200);
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
