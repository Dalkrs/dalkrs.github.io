// Bateria do lote 158 (as Cenas): (1) as 15 categorias novas de objetos (desenham sem erro); (2) os 15 climas novos (em
// grupos; desenham sem erro; os clarões da tempestade têm chave); (3) os objetos do tema no gerador (automático pelo lugar,
// escolhido, ou nenhum; não tampam portas nem cruzam paredes); (4) "Pôr objetos de um tema…" numa cena pronta, com
// Desfazer; (5) as salas novas (a taverna, a sala de magia, o treino…) mobiliadas; (6) a IA escolhe o tema; (7) o passeio
// das novidades: só os cartões novos para quem já viu o de antes.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, w = ms => p.waitForTimeout(ms);
  const NOVOS = ['taverna', 'escola', 'prisao', 'fazenda', 'treino', 'ruinas', 'inverno', 'deserto', 'pantano', 'esgoto', 'militar', 'portais', 'teatro', 'conves', 'fantastica'];
  // (1) os objetos
  const r1 = await p.evaluate(NOVOS => {
    const P = __tc.Props, cv = document.createElement('canvas'); cv.width = cv.height = 48;
    const por = NOVOS.map(g => P.ORDER.filter(id => P.P[id].g === g).length), erros = [];
    for (const id of P.ORDER) if (NOVOS.includes(P.P[id].g)) for (const tm of [0, 1.3, 9.1]) { try { P.thumb(cv, id, tm); } catch (e) { erros.push(id); } }
    const temas = __tc.Temas.LISTA.flatMap(T => T.nucleo.concat(T.itens)).filter(id => !P.P[id]);
    return { grupos: NOVOS.every(g => P.G.some(x => x.id === g)), por, erros, temas };
  }, NOVOS);
  ok(r1.grupos && r1.por.every(k => k >= 6) && r1.por.reduce((a, b) => a + b, 0) >= 100, 'as 15 categorias, com 6 ou mais objetos cada: ' + r1.por.join(','));
  ok(!r1.erros.length, 'todos os objetos novos desenham sem erro: ' + r1.erros.slice(0, 5).join(','));
  ok(!r1.temas.length, 'os temas só usam objetos que existem: ' + r1.temas.join(','));
  // (2) os climas
  const r2 = await p.evaluate(() => {
    const ids = __tc.WEATHERS.map(w => w[0]).filter(Boolean), nos = __tc.WEATHER_GRUPOS.flatMap(g => g[1]);
    return { n: ids.length, todos: ids.every(k => nos.filter(x => x === k).length === 1) && nos.every(k => ids.includes(k)) };
  });
  ok(r2.n === 23 && r2.todos, 'os 23 climas, cada um num grupo: ' + r2.n);
  await p.evaluate(() => __tc.Gerador.abrir('vila')); await w(1200);
  const r3 = await p.evaluate(() => { const s = document.getElementById('ger-clima'); return { sel: s && s.tagName, grupos: s ? s.querySelectorAll('optgroup').length : 0, op: s ? s.querySelectorAll('option').length : 0, tema: !!document.getElementById('ger-bl-tema'), mini: document.querySelectorAll('#ger-bl-tema .tema-mini canvas').length, resumo: document.querySelector('#ger-bl-tema .ger-bl-r').textContent }; });
  ok(r3.sel === 'SELECT' && r3.grupos === 4 && r3.op === 24, 'o clima do gerador é uma lista em grupos: ' + JSON.stringify(r3));
  ok(r3.tema && r3.mini >= 6 && /fazenda/.test(r3.resumo) && /automático/.test(r3.resumo), 'o bloco "Objetos do tema" na vila: a fazenda, automático, com as miniaturas — ' + r3.resumo);
  // (3) criar: a vila ganha a fazenda, sem tampar portas nem cruzar paredes
  await p.click('.modal-a .btn.primary'); await w(2800);
  const r4 = await p.evaluate(() => {
    const sc = __tc.Store.scene(), c = sc.cell, P = __tc.Props.P, ts = sc.tokens.filter(t => t.prop && P[t.prop] && P[t.prop].g === 'fazenda');
    const portas = sc.walls.filter(w => w.k === 'door'), cruza = [];
    for (const t of ts) {
      const [w, h] = __tc.tokWH(t), x0 = t.x / c, y0 = t.y / c;
      for (const d of portas) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dd = (() => { const ax = d.x1 / c, ay = d.y1 / c, bx = d.x2 / c, by = d.y2 / c, px = x0 + i + 0.5, py = y0 + j + 0.5, L = (bx - ax) ** 2 + (by - ay) ** 2, k = L ? Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L)) : 0; return Math.hypot(px - ax - k * (bx - ax), py - ay - k * (by - ay)); })(); if (dd < 1) cruza.push(t.prop); }
    }
    const toast = [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ');
    return { n: ts.length, cruza, toast };
  });
  ok(r4.n >= 6 && !r4.cruza.length, 'a vila criada com os objetos da fazenda, longe das portas: ' + r4.n + ' ' + r4.cruza.join(','));
  ok(/Objetos do tema fazenda/.test(r4.toast), 'o aviso conta os objetos do tema');
  // Nenhum: nada
  await p.evaluate(() => { __tc.App.opt.temaId = ''; __tc.Gerador.abrir('vila'); }); await w(1200);
  await p.click('.modal-a .btn.primary'); await w(2500);
  ok(await p.evaluate(() => !__tc.Store.scene().tokens.some(t => t.prop && __tc.Props.P[t.prop] && __tc.Props.P[t.prop].g === 'fazenda')), 'com o tema "Nenhum", nenhum objeto de tema');
  // escolhido: a masmorra com a prisão; os objetos ficam dentro das salas (não nos corredores apertados)
  await p.evaluate(() => { __tc.App.opt.temaId = 'prisao'; __tc.App.opt.temaQtd = 'muitos'; __tc.App.opt.masTipo = 'pedra'; __tc.Gerador.abrir('masmorra'); }); await w(1500);
  await p.click('.modal-a .btn.primary'); await w(3000);
  const r5 = await p.evaluate(() => {
    const sc = __tc.Store.scene(), G = __tc.Temas.grade(Object.assign({}, sc, { tokens: [] })), c = sc.cell, P = __tc.Props.P;
    const ts = sc.tokens.filter(t => t.prop && P[t.prop] && P[t.prop].g === 'prisao' || ['grilhoes'].includes(t.prop));
    const fora = ts.filter(t => { const q = Math.floor(t.y / c) * G.W + Math.floor(t.x / c); return G.temDentro && !G.dentro(q); }).length;
    return { n: ts.length, fora };
  });
  ok(r5.n >= 6 && r5.fora === 0, 'a masmorra com a prisão (muitos): os objetos dentro das salas — ' + JSON.stringify(r5));
  // (4) "Pôr objetos de um tema…" numa cena pronta, e o Desfazer
  const antes = await p.evaluate(() => __tc.Store.scene().tokens.length);
  await p.click('#sceneBtn'); await w(300);
  await p.locator('.menu-i, [role="menuitem"]', { hasText: 'Pôr objetos de um tema' }).first().click(); await w(500);
  await p.selectOption('#tema-cena-id', 'portais'); await w(300);
  ok(await p.evaluate(() => document.querySelectorAll('.tema-cena .tema-mini canvas').length >= 5), 'a janelinha mostra as miniaturas do tema');
  await p.click('.modal-a .btn.primary'); await w(800);
  const depois = await p.evaluate(() => __tc.Store.scene().tokens.filter(t => t.prop && __tc.Props.P[t.prop].g === 'portais').length);
  ok(depois >= 3, 'os objetos dos portais entraram na cena pronta: ' + depois);
  await p.evaluate(() => __tc.Tools.undo()); await w(400);
  ok(await p.evaluate(n0 => __tc.Store.scene().tokens.length === n0 && !__tc.Store.scene().tokens.some(t => t.prop && __tc.Props.P[t.prop].g === 'portais'), antes), 'o Desfazer tira todos de uma vez');
  // (2b) os climas desenham na cena (sem erro), e a tempestade tem a chave dos clarões
  const errAntes = t.errs.length;
  for (const k of ['tempestade', 'garoa', 'granizo', 'nevasca', 'areia', 'miragem', 'nuvens', 'nevoaRasteira', 'aurora', 'cadentes', 'sangue', 'corrupcao', 'esporos', 'submerso', 'fagulhas']) {
    await p.evaluate(k => { __tc.Store.tx('Clima', () => __tc.Store.scn({ weather: { k, pow: 0.8 } })); }, k); await w(160);
  }
  ok(t.errs.length === errAntes, 'os 15 climas novos desenham sem erro: ' + t.errs.slice(errAntes, errAntes + 3).join(' | '));
  await p.evaluate(() => { __tc.Store.tx('Clima', () => __tc.Store.scn({ weather: { k: 'tempestade', pow: 0.8 } })); __tc.App.tab = 'scene'; __tc.App.sideOpen = true; __tc.UI.renderAll(); }); await w(400);
  await p.evaluate(() => { const d = document.querySelector('#c-amb, [data-sec="c-amb"]'); if (d && d.tagName === 'DETAILS') d.open = true; });
  const temClarao = await p.evaluate(() => !!document.getElementById('sc-clarao'));
  ok(temClarao, 'na aba Cena, com a tempestade: a chave "Clarões dos raios"');
  if (temClarao) { await p.locator('#sc-clarao').uncheck({ force: true }); await w(300); ok(await p.evaluate(() => __tc.Store.scene().weather.clarao === false), 'desligar os clarões fica guardado na cena'); }
  // (5) as salas novas, mobiliadas
  const r6 = await p.evaluate(() => {
    const F = __tc.Furtividade, spec = { terreno: 'grande', muro: true, porte: 'boa', terreo: ['tavernaSalao', 'aula', 'treino', 'teatro', 'interrogatorio', 'portal'], anexos: [], guardas: 'nenhum' };
    const pl = F.gerar('sobmedida', { spec, seed: 11, estilo: 'comum' });
    const ids = new Set(pl.objetos.map(o => o.id)), papeis = pl.salas.map(q => q.papel);
    const sal = __tc.IaMapa.pedido().ferramenta.input_schema.properties;
    return { papeis, tem: ['chopeira', 'carteira', 'quadroRunas', 'cavaleteArmas', 'mesaInterrogatorio'].filter(x => ids.has(x)), iaSalas: ['tavernaSalao', 'aula', 'teatro'].every(x => sal.planta.properties.salas.items.properties.uso.enum.includes(x)), iaTema: sal.tema && sal.tema.enum.length === 15 };
  });
  ok(['tavernaSalao', 'aula', 'treino'].every(x => r6.papeis.includes(x)) && r6.tem.length >= 3, 'as salas novas mobiliadas com os objetos novos: ' + r6.tem.join(','));
  ok(r6.iaSalas && r6.iaTema, 'a IA conhece as salas novas e os 15 temas');
  // (6) a IA escolhe o tema
  ok(await p.evaluate(() => __tc.IaMapa.traduzir({ lugar: 'interior', nome: 'A taverna', tema: 'taverna', clima: 'garoa' }).comum.tema === 'taverna'), 'a ficha da IA traz o tema');
  // (7) o passeio: quem já viu o 157 vê só os novos
  await p.evaluate(() => { __tc.UI.closeModal(); __tc.Store.S.prefs.novidades = 157; try { localStorage.setItem('tinycats-novidades-gerador', '157'); } catch (e) { /* */ } __tc.Novidades.start({ auto: true }); }); await w(500);
  const vistos = [];
  for (let i = 0; i < 25; i++) {
    const tt = await p.locator('#tour-title').innerText().catch(() => null);
    if (!tt) break;
    vistos.push(tt);
    const bt = await p.locator('#tour-next').innerText();
    await p.click('#tour-next'); await w(400);
    if (bt === 'Concluir') break;
  }
  ok(vistos.length === 6 && vistos.includes('Objetos do tema') && vistos.includes('Climas novos'), 'o passeio sozinho: só os 4 cartões novos (e o começo e o fim) — ' + vistos.join(' | '));
  ok(await p.evaluate(() => __tc.Novidades.vistas() && __tc.Novidades.VERSAO === 158), 'no fim: marcado como visto (158)');
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'sem erros na página: ' + t.errs.slice(0, 3).join(' | '));
  console.log(`lote158: ${n - fails}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})();
