// Bateria do lote 179 (as Cenas): (1) os 50 objetos novos (as categorias fracas reforçadas e o Dia a dia); (2) o painel de
// Objetos em 7 seções; (3) a busca por nome e por apelidos, sem acento, que não perde o cursor; Enter e Esc; (4) os
// favoritos (a estrela) e os usados por último, guardados neste aparelho.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, w = ms => p.waitForTimeout(ms), ev = (f, a) => p.evaluate(f, a);
  await ev(() => { try { localStorage.removeItem('tinycats:cenas:objetos'); } catch (e) { /* */ } });
  // (1) os objetos
  const r1 = await ev(() => {
    const P = __tc.Props, conta = g => P.ORDER.filter(id => P.P[id].g === g).length, cv = document.createElement('canvas'); cv.width = cv.height = 48;
    const NOVOS = ['lupa', 'pegadasSangue', 'facaCrime', 'cartaRasgada', 'frascoVeneno', 'mapaParede', 'caixasContrabando', 'mesaPlanos', 'estanteSecreta', 'sacoOuro', 'cartaSelo', 'medalhao', 'mapaTesouro', 'balanca', 'bancaPeixe', 'rolosTecido', 'sinoTemplo', 'pulpito', 'oferendas', 'armaduraSuporte', 'rodaOleiro', 'tear', 'mesaCha', 'ponteArco', 'jardimPedras', 'portaoMadeira', 'balista', 'mastroFitas', 'bandeirolas'].concat(P.ORDER.filter(id => P.P[id].g === 'diaadia'));
    const erros = []; for (const id of NOVOS) for (const tm of [0, 2.2]) { try { P.thumb(cv, id, tm); } catch (e) { erros.push(id); } }
    return { n: NOVOS.length, falta: NOVOS.filter(id => !P.P[id]), erros, total: P.ORDER.length, misterio: conta('misterio'), base: conta('base'), trama: conta('trama'), dia: conta('diaadia') };
  });
  ok(r1.n === 50 && !r1.falta.length && r1.total >= 346, 'os 50 objetos novos (' + r1.total + ' no total): ' + r1.falta.join(','));
  ok(!r1.erros.length, 'todos desenham sem erro: ' + r1.erros.join(','));
  ok(r1.misterio === 8 && r1.base === 7 && r1.trama === 5 && r1.dia === 21, 'as fracas reforçadas e o Dia a dia: ' + JSON.stringify(r1));
  // (2) as seções
  const r2 = await ev(() => { const ss = __tc.ObjPainel.secoes(), gs = ss.flatMap(s => s[2]); return { n: ss.length, ids: ss.map(s => s[0]), todas: __tc.Props.G.every(g => gs.filter(x => x === g.id).length === 1) }; });
  ok(r2.n === 7 && !r2.ids.includes('outros') && r2.todas, 'as 7 seções, cada categoria numa só: ' + r2.ids.join(','));
  await p.keyboard.press('j'); await w(400);
  ok(await p.locator('#o-osec .seg-b').count() === 7 && await p.locator('#o-oc .seg-b').count() === 5 && await p.locator('#o-objs #o-obj-fogueira.on').count() === 1, 'a barra: 7 seções, as 5 categorias de Casa e móveis, a fogueira escolhida');
  await p.locator('#o-osec .seg-b', { hasText: 'Cidade e comércio' }).click(); await w(200);
  ok(await p.locator('#o-oc .seg-b', { hasText: 'Dia a dia' }).count() === 1 && await ev(() => __tc.App.opt.objCat) === 'mercado', 'a seção Cidade e comércio abre as categorias dela (e o Dia a dia)');
  await p.locator('#o-oc .seg-b', { hasText: 'Dia a dia' }).click(); await w(200);
  ok(await p.locator('#o-objs .o-obj').count() === 21, 'o Dia a dia mostra os 21');
  // nenhum id repetido na barra
  ok(await ev(() => { const ids = [...document.querySelectorAll('.o-obj, .o-fav')].map(e => e.id); return ids.length === new Set(ids).size; }), 'nenhum id repetido na barra');
  // (3) a busca
  await p.click('#o-busca'); await p.keyboard.type('cadeira', { delay: 20 }); await w(200);
  const b1 = await ev(() => ({ foco: document.activeElement && document.activeElement.id, ids: [...document.querySelectorAll('#o-objs .o-obj')].map(b => b.id.replace('o-obj-', '')), conta: document.getElementById('o-achados').textContent, filtros: document.querySelector('.o-filtros').hidden }));
  ok(b1.foco === 'o-busca', 'o cursor fica na caixa enquanto digita');
  ok(b1.ids[0] === 'cadeira' && ['banco', 'poltrona', 'tronoOssos', 'cadeiraBalanco', 'banquinho'].every(x => b1.ids.includes(x)), '"cadeira" acha a cadeira primeiro, e o banco, a poltrona, o trono e o banquinho: ' + b1.ids.join(','));
  ok(/objetos achados/.test(b1.conta) && b1.filtros, 'a busca mostra quantos achou e esconde as categorias');
  await p.fill('#o-busca', 'agua'); await w(200);
  const agua = await ev(() => [...document.querySelectorAll('#o-objs .o-obj')].map(b => b.id.replace('o-obj-', '')));
  ok(['jarrosAgua', 'bebedouro', 'poco'].every(x => agua.includes(x)), 'sem acento: "agua" acha os jarros d\'água, o bebedouro e o poço');
  await p.fill('#o-busca', 'FOGO'); await w(200);
  const fogo = await ev(() => [...document.querySelectorAll('#o-objs .o-obj')].map(b => b.id.replace('o-obj-', '')));
  ok(['fogueira', 'lareira', 'braseiro', 'fornoBarro'].every(x => fogo.includes(x)), 'pelos apelidos: "FOGO" acha a fogueira, a lareira, o braseiro e o forno de barro');
  await p.fill('#o-busca', 'xyzw'); await w(200);
  ok(await p.locator('#o-objs .o-obj').count() === 0 && /Nada com esse nome/.test(await p.locator('#o-achados').innerText()), 'nada achado: o aviso');
  await p.fill('#o-busca', 'ponte'); await w(150); await p.keyboard.press('Enter'); await w(300);
  const ent = await ev(() => [__tc.App.opt.obj, __tc.Props.P[__tc.App.opt.obj].n]);
  ok(/^Ponte/.test(ent[1]), 'Enter escolhe o primeiro achado: ' + ent[1]);
  await p.click('#o-busca'); await p.keyboard.press('Escape'); await w(300);
  ok(await ev(() => document.getElementById('o-busca').value === '' && !document.querySelector('.o-filtros').hidden), 'Esc limpa a busca e as categorias voltam');
  // (4) os favoritos e os últimos
  await p.locator('#o-osec .seg-b', { hasText: 'Casa e móveis' }).click(); await w(200);
  await p.hover('#o-obj-lareira'); await p.click('#o-fav-lareira'); await w(200);
  ok(await p.locator('#o-favoritos #o-favoritos-lareira').count() === 1 && await ev(() => JSON.parse(localStorage.getItem('tinycats:cenas:objetos')).fav.includes('lareira')), 'a estrela põe a lareira nos favoritos (guardado neste aparelho)');
  await p.click('#o-favoritos-lareira'); await w(200);
  ok(await ev(() => __tc.App.opt.obj) === 'lareira', 'um clique no favorito escolhe o objeto');
  // pôr no mapa: entra nos últimos
  const tela = await ev(() => { const sc = __tc.Store.scene(); return __tc.Render.toScreen(sc.cols / 2 * sc.cell, (sc.rows - 3) * sc.cell); });
  const box = await p.locator('#cv').boundingBox();
  await p.mouse.click(box.x + tela[0], box.y + tela[1]); await w(300);
  await p.locator('#o-osec .seg-b', { hasText: 'Natureza e clima' }).click(); await w(200);
  ok(await p.locator('#o-recentes #o-recentes-lareira').count() === 1, 'a lareira posta no mapa aparece nos Últimos');
  await p.click('#o-favoritos-fav-lareira'); await w(200);
  ok(await p.locator('#o-favoritos').count() === 0, 'a estrela de novo tira dos favoritos');
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'sem erros na página: ' + t.errs.slice(0, 3).join(' | '));
  console.log(`lote179: ${n - fails}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})();
