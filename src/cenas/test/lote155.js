// Bateria do lote 155 (as Cenas): (1) o que o mundo empresta (o reino: as cores e o nome nos guardas; o que está por
// perto e os eventos, na nota "Do mundo"); (2) "O tempo passou…" (a guarda reage, os consertos, a limpeza, o desgaste),
// com um Desfazer; (3) os segredos com três pistas (as marcas nas cenas, a lista na aba Guardas, achar, apagar).
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, w = ms => p.waitForTimeout(ms);
  // (1) o mundo
  await p.evaluate(() => { const o = __tc.App.opt; o.tramaOn = false; o.tempoNivel = 'novo'; o.tempoEvento = 'nada'; o.zonas = {};
    __tc.Gerador.abrir('casarao', { reino: { nome: 'Valdor', cores: ['#223366', '#e8d8a0'], regiao: 'Vale do Rio', ocupada: 'Torvia' }, perto: [{ nome: 'Vila Rosa', tipo: 'Vila', d: 2, dir: 'a leste' }, { nome: 'Torre Velha', tipo: 'Torre', d: 1, dir: 'ao norte', boato: true }], eventos: ['Eclipse'] }); });
  await w(900);
  ok(await p.locator('#ger-mundo-reino').count() === 1 && await p.locator('.ger-mundo-l li').count() === 2, 'o bloco "Do mundo": o reino e o que está por perto');
  await p.locator('.modal-a .btn.primary').click(); await w(3000);
  const r1 = await p.evaluate(() => { const sc = __tc.Store.scene(), gs = __tc.Rondas.guardas(sc), est = sc.tokens.filter(t => t.prop && __tc.Props.P[t.prop] && __tc.Props.P[t.prop].cores), nota = sc.tokens.find(t => t.prop === 'interesse' && t.name === 'Do mundo');
    return { gs: gs.length, nomes: gs.every(g => / de Valdor/.test(g.name)), cor: gs.every(g => g.color === '#223366'), est: est.length, estCor: est.every(x => x.cores && x.cores[0] === '#223366'), nota: nota && nota.hidden ? nota.notes : '' }; });
  ok(r1.gs > 0 && r1.nomes && r1.cor, 'os guardas com o nome e a cor do reino');
  ok(r1.est === 0 || r1.estCor, 'os estandartes com as cores do reino');
  ok(/Terra de Valdor \(Vale do Rio\)/.test(r1.nota) && /Ocupada: a dona é Torvia/.test(r1.nota) && /Vila Rosa \(vila\), a 2 hexágonos a leste/.test(r1.nota) && /é boato/.test(r1.nota) && /Hoje: Eclipse/.test(r1.nota), 'a nota "Do mundo", escondida — ' + r1.nota);

  // (2) o tempo passou
  const r2 = await p.evaluate(async () => { const u = __tc, sc = u.Store.scene();
    const portas = sc.walls.filter(x => x.k === 'door' && !x.secret);
    u.Store.tx('prep', () => { portas.slice(0, 3).forEach(w2 => u.Store.upd('walls', w2.id, { open: true, locked: false, fech: w2.fech || 'medio' })); const c = u.Props.novo(sc, 'corpo', 5 * sc.cell, 5 * sc.cell, 1, false); u.Store.add('tokens', c); });
    const antes = { tok: sc.tokens.length, gs: u.Rondas.guardas(sc).length, abertas: sc.walls.filter(x => x.open).length, corpo: sc.tokens.some(x => x.prop === 'corpo') };
    const txt = await u.Tempo.passou(sc, { quanto: 'semanas', guarda: true, consertos: true, limpeza: true, desgaste: false });
    const s2 = u.Store.scene(), gs = u.Rondas.guardas(s2);
    const depois = { gs: gs.length, desconf: gs.every(g => g.alerta === 'desconfiado'), reforcos: gs.filter(g => /reforço/.test(g.name)).length, abertas: s2.walls.filter(x => x.open).length, trancadas: portas.slice(0, 3).every(w2 => s2.walls.find(x => x.id === w2.id).locked), corpo: s2.tokens.some(x => x.prop === 'corpo'), nota: (s2.tokens.find(x => x.name === 'O que mudou') || {}).notes };
    u.Tools.undo();
    const s3 = u.Store.scene(), volta = { gs: u.Rondas.guardas(s3).length, abertas: s3.walls.filter(x => x.open).length, corpo: s3.tokens.some(x => x.prop === 'corpo') };
    return { antes, depois, volta, txt }; });
  ok(r2.depois.desconf && r2.depois.reforcos >= 1 && r2.depois.gs > r2.antes.gs, 'a guarda reage: desconfiada, com reforços — ' + r2.txt);
  ok(r2.depois.abertas === 0 && r2.depois.trancadas, 'os consertos: as portas fecham e trancam');
  ok(r2.antes.corpo && !r2.depois.corpo && /Passaram semanas/.test(r2.depois.nota || ''), 'a limpeza e a nota "O que mudou"');
  ok(r2.volta.gs === r2.antes.gs && r2.volta.abertas === r2.antes.abertas && r2.volta.corpo, 'o Desfazer volta tudo');
  const r2b = await p.evaluate(async () => { const u = __tc, sc = u.Store.scene(), a = sc.bg.asset; await u.Tempo.passou(sc, { quanto: 'anos', guarda: false, consertos: false, limpeza: false, desgaste: true }); const s2 = u.Store.scene(); return { bg: s2.bg.asset !== a, tempo: s2.tempo && s2.tempo.nivel }; });
  ok(r2b.bg && r2b.tempo === 'abandonado', 'o desgaste: anos sem cuidar, o lugar fica abandonado');
  await p.evaluate(() => __tc.Tempo.abrirPassou()); await w(400);
  ok(await p.locator('.modal-t').innerText() === 'O tempo passou' && await p.locator('#passou-quanto .seg-b').count() === 4, 'a janela "O tempo passou"');
  await p.keyboard.press('Escape'); await w(200);

  // (3) os segredos
  const r3 = await p.evaluate(() => { const u = __tc, S = u.Store.S, sc0 = u.Store.scene();
    const outra = u.newScene('Taverna'); outra.cols = 20; outra.rows = 15; u.Store.addScene(outra); u.Persist.scene(outra.id);
    const s = u.Segredos.criar({ titulo: 'O traidor', texto: 'O mordomo vendeu a chave do cofre.', pistas: [{ txt: 'Um recibo com o selo do mordomo.', cena: sc0.id }, { txt: 'A cozinheira viu o mordomo sair de noite.', cena: outra.id }, { txt: 'Pegadas de lama até o quarto do mordomo.', cena: sc0.id }] });
    const marcas = s.pistas.map(p2 => (S.scenes[p2.cena].tokens.find(x => x.id === p2.tok) || null));
    return { ok: marcas.every(m => m && m.prop === 'pista' && m.hidden && m.seg && m.seg.id === s.id), naOutra: marcas[1] && S.scenes[outra.id].tokens.includes(marcas[1]), todos: u.Segredos.todos().length, id: s.id }; });
  ok(r3.ok && r3.naOutra && r3.todos === 1, 'o segredo: as 3 marcas de pista, escondidas, cada uma na cena dela');
  await p.evaluate(() => { __tc.App.tab = 'guard'; __tc.App.sideOpen = true; __tc.UI.renderAll(); }); await w(400);
  ok(await p.locator('#s-gd-seg .seg-li').count() === 1 && /0 de 3 achadas/.test(await p.locator('#s-gd-seg').innerText()), 'a lista dos segredos na aba Guardas');
  await p.locator(`#seg-a-${r3.id}-2`).check({ force: true }); await w(300);
  ok(/1 de 3 achadas/.test(await p.locator('#s-gd-seg').innerText()), 'o mestre marca a pista achada');
  await p.click('#seg-novo'); await w(400);
  ok(await p.locator('.modal-t').innerText() === 'Novo segredo' && await p.locator('#seg-p2').count() === 1 && await p.locator('#seg-c2').count() === 1, 'a janela "Novo segredo": o segredo, as 3 pistas e as cenas');
  await p.fill('#seg-texto', 'O conde é um vampiro.'); await p.click('#seg-ia'); await w(500);
  ok(/mesa aberta/.test(await p.locator('#seg-msg').innerText()), 'sem a mesa, a IA avisa');
  await p.keyboard.press('Escape'); await w(200);
  await p.evaluate(id => { const u = __tc, x = u.Segredos.todos().find(y => y.s.id === id); u.Segredos.apagar(x.sc, id); }, r3.id); await w(200);
  ok(await p.evaluate(() => __tc.Segredos.todos().length === 0 && !Object.values(__tc.Store.S.scenes).some(sc => sc.tokens.some(x => x.seg))), 'apagar o segredo tira as marcas');
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
