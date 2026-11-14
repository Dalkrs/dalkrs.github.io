// Bateria do lote 153 (as Cenas): o tempo — o lugar envelhecido (Usado, Abandonado, Em ruínas) e as marcas do que houve
// (incêndio, saque, batalha, inundação): o fundo ganha a camada pintada, as paredes caem (em ruínas), as luzes apagam,
// os objetos somem ou tombam, o saque abre os baús e arromba as portas; a nota e a pista escondidas. No gerador, o bloco
// "O tempo" (a prévia mostra) e, numa cena pronta, "Envelhecer esta cena…" (uma cópia; a original fica).
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, w = ms => p.waitForTimeout(ms);
  const r1 = await p.evaluate(async () => {
    const u = __tc, L = u.Furtividade.LUGARES.mansao, out = {};
    const pl = L.gerar({ tamanho: 'medio', guardas: 'normal', alvo: 'sorteio' }, { seed: 9, estilo: 'comum' });
    const sc = await L.criar(pl, 'M', { hora: 'noite' });
    const antes = { bg: sc.bg.asset, walls: sc.walls.length, portasTr: sc.walls.filter(x => x.k === 'door' && x.locked && !x.secret).length, luzes: sc.tokens.filter(x => x.light && x.light.on !== false).length, objs: sc.tokens.filter(x => x.prop).length };
    const txt = await u.Tempo.aplicar(sc, { nivel: 'ruinas', evento: 'saque' }, 9);
    const depois = { bg: sc.bg.asset, walls: sc.walls.length, portasTr: sc.walls.filter(x => x.k === 'door' && x.locked && !x.secret).length, luzes: sc.tokens.filter(x => x.prop && x.light && x.light.on !== false).length, objs: sc.tokens.filter(x => x.prop).length };
    const nota = sc.tokens.find(x => x.prop === 'interesse' && x.name === 'O que houve aqui'), pista = sc.tokens.find(x => x.prop === 'pista');
    const baus = sc.tokens.filter(x => x.prop === 'bau');
    return { antes, depois, txt, nota: nota && nota.hidden && /Em ruínas/.test(nota.notes) && /saqueado/.test(nota.notes) && /Pista: /.test(nota.notes), pista: !!(pista && pista.hidden), baus: baus.every(b => b.est === 'aberto' && !b.tranca), tempo: sc.tempo };
  });
  ok(r1.depois.bg !== r1.antes.bg, 'o fundo ganhou a camada pintada (uma imagem nova)');
  ok(r1.depois.walls > r1.antes.walls - 30 && /paredes? caídas?/.test(r1.txt), 'em ruínas: paredes caídas (os vãos) — ' + r1.txt);
  ok(r1.antes.portasTr > 0 && r1.depois.portasTr === 0, 'o saque arrombou as portas trancadas — ' + JSON.stringify([r1.antes.portasTr, r1.depois.portasTr]));
  ok(r1.depois.luzes === 0, 'as luzes apagaram');
  ok(r1.baus, 'os baús abertos, sem tranca');
  ok(r1.nota && r1.pista && r1.tempo.nivel === 'ruinas', 'a nota "O que houve aqui" e a pista, escondidas');
  // a batalha: as armas, as barricadas e os corpos (se é recente)
  const r2 = await p.evaluate(async () => { const u = __tc, L = u.Furtividade.LUGARES.fortaleza, pl = L.gerar({ tamanho: 'medio', guardas: 'normal', alvo: 'sorteio' }, { seed: 4, estilo: 'comum' }); const sc = await L.criar(pl, 'F', { hora: 'noite' });
    const n0 = ['armas', 'barricada', 'corpo'].map(id => sc.tokens.filter(x => x.prop === id).length);
    await u.Tempo.aplicar(sc, { nivel: 'usado', evento: 'batalha' }, 4);
    return { n0, n1: ['armas', 'barricada', 'corpo'].map(id => sc.tokens.filter(x => x.prop === id).length) }; });
  ok(r2.n1[0] > r2.n0[0] && r2.n1[1] > r2.n0[1] && r2.n1[2] > r2.n0[2], 'a batalha: armas, barricadas e corpos — ' + JSON.stringify(r2));
  // o gerador: o bloco e a prévia
  await p.evaluate(() => { const o = __tc.App.opt; o.tramaOn = false; o.tempoNivel = 'novo'; o.tempoEvento = 'nada'; __tc.Gerador.abrir('masmorra'); }); await w(900);
  const px = () => p.evaluate(() => { const cv = document.querySelector('#ger-prev'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let s = 0; for (let i = 0; i < d.length; i += 89) s += d[i] * 3 + d[i + 1]; return s; });
  const a0 = await px();
  ok(await p.locator('#ger-tempo-nivel .seg-b').count() === 4 && await p.locator('#ger-tempo-evento .seg-b').count() === 5, 'o bloco "O tempo": 4 níveis e 5 escolhas do que houve');
  await p.locator('#ger-tempo-nivel .seg-b', { hasText: 'Abandonado' }).click(); await w(500);
  ok(await px() !== a0, 'a prévia mostra o tempo');
  await p.locator('#ger-tempo-evento .seg-b', { hasText: 'Incêndio' }).click(); await w(400);
  await p.locator('.modal-a .btn.primary').click(); await w(4000);
  ok(await p.evaluate(() => { const sc = __tc.Store.scene(); return !!(sc.tempo && sc.tempo.nivel === 'abandonado' && sc.tempo.evento === 'incendio'); }), 'a cena sai envelhecida');
  // Envelhecer esta cena…: uma cópia, a original fica
  const r3 = await p.evaluate(async () => { const u = __tc, src = u.Store.scene(), id = src.id, a = { bg: src.bg.asset, w: src.walls.length, t: src.tokens.length };
    const sc = await u.Tempo.envelhecer(id, { nivel: 'ruinas', evento: 'nada' }, 'Masmorra — séculos depois');
    const o = u.Store.S.scenes[id];
    return { nova: sc.id !== id && sc.name === 'Masmorra — séculos depois' && !!u.Store.S.scenes[sc.id], intacta: o.bg.asset === a.bg && o.walls.length === a.w && o.tokens.length === a.t, tempo: sc.tempo && sc.tempo.nivel }; });
  ok(r3.nova && r3.intacta && r3.tempo === 'ruinas', '"Envelhecer": a cópia nova, a original intacta — ' + JSON.stringify(r3));
  await p.evaluate(() => __tc.Tempo.abrirEnvelhecer()); await w(500);
  ok(await p.locator('.modal-t').innerText() === 'Envelhecer esta cena' && await p.locator('#tempo-nome').count() === 1, 'a janela "Envelhecer esta cena"');
  await p.keyboard.press('Escape'); await w(200);
  // com a história da missão: as portas dela continuam trancadas, mesmo no saque
  const r4 = await p.evaluate(async () => { const u = __tc, L = u.Masmorra.LUGAR, pl = L.gerar(L.padrao(), { seed: 3, estilo: 'comum' }); u.Trama.tecer(pl, { on: true, tam: 'media', tipos: { chave: true, pista: true, mecanismo: false, puzzle: false, atalho: false } });
    const portas = pl.trama.passos.filter(s => s.porta).map(s => s.porta); if (!portas.length) return null;
    const sc = await L.criar(pl, 'X', { hora: 'noite' }); const c = sc.cell;
    await u.Tempo.aplicar(sc, { nivel: 'ruinas', evento: 'saque', proteger: portas }, 3);
    return portas.every(q => sc.walls.some(w => w.locked && Math.abs(w.x1 - q.x1 * c) < 2 && Math.abs(w.y1 - q.y1 * c) < 2)); });
  ok(r4 !== false, 'as portas da história ficam trancadas');
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
