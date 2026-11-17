// Bateria do lote 180 (as Cenas): a casa noturna — (1) os 20 objetos (desenham sem erro) na seção Cidade e comércio;
// (2) a busca acha pelos apelidos; (3) o tema "Casa noturna" nos Objetos do tema; (4) as três salas novas (o salão, a
// alcova, o escritório da madame) mobiliadas no gerador e nas zonas.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, w = ms => p.waitForTimeout(ms), ev = (f, a) => p.evaluate(f, a);
  const r1 = await ev(() => {
    const P = __tc.Props, ids = P.ORDER.filter(id => P.P[id].g === 'noturna'), cv = document.createElement('canvas'); cv.width = cv.height = 48, erros = [];
    for (const id of ids) for (const tm of [0, 1.7]) { try { P.thumb(cv, id, tm); } catch (e) { erros.push(id); } }
    const sec = __tc.ObjPainel.secoes().find(s => s[2].includes('noturna'));
    return { n: ids.length, erros, sec: sec && sec[0], busca: __tc.ObjPainel.achar('bordel').length, madame: __tc.ObjPainel.achar('madame')[0], lanterna: __tc.ObjPainel.achar('lanterna vermelha')[0] };
  });
  ok(r1.n === 20 && !r1.erros.length, 'os 20 objetos da casa noturna desenham sem erro: ' + r1.erros.join(','));
  ok(r1.sec === 'cidade', 'a categoria fica em Cidade e comércio');
  ok(r1.busca >= 15 && r1.madame === 'livroCaixa' && r1.lanterna === 'lanternaVermelha', 'a busca: "bordel" acha a categoria; "madame" acha o livro-caixa; "lanterna vermelha" acha a lanterna');
  // (3) o tema
  const r3 = await ev(() => {
    const T = __tc.Temas, tm = T.tema('noturna');
    const faltam = tm.nucleo.concat(tm.itens).filter(id => !__tc.Props.P[id]);
    return { tem: !!tm, onde: tm.onde, faltam };
  });
  ok(r3.tem && r3.onde === 'dentro' && !r3.faltam.length, 'o tema "Casa noturna" (dentro das salas) só com objetos que existem');
  // (4) as salas
  const r4 = await ev(() => {
    const F = __tc.Furtividade, P = __tc.Props.P;
    const pl = F.gerar('sobmedida', { spec: { terreno: 'grande', muro: true, porte: 'boa', terreo: ['salaoNoturno', 'alcova', 'alcova', 'escritorioMadame'], anexos: [], guardas: 'nenhum' }, seed: 5, estilo: 'comum' });
    const ids = new Set(pl.objetos.map(o => o.id));
    return { papeis: pl.salas.map(q => q.papel), tem: ['balcaoBebidas', 'camaDossel', 'livroCaixa', 'quadroChaves'].filter(x => ids.has(x)), nomes: ['salaoNoturno', 'alcova', 'escritorioMadame'].map(k => (__tc.PlantaAndares || window.PlantaAndares || { NOMES: {} }).NOMES[k]) };
  });
  ok(['salaoNoturno', 'alcova', 'escritorioMadame'].every(x => r4.papeis.includes(x)) && r4.tem.length === 4, 'as salas novas mobiliadas: ' + r4.tem.join(','));
  ok(r4.nomes.join('|') === 'Salão da casa noturna|Alcova|Escritório da madame', 'os nomes das salas');
  // o painel: a seção Cidade e comércio mostra a Casa noturna
  await p.keyboard.press('j'); await w(400);
  await p.locator('#o-osec .seg-b', { hasText: 'Cidade e comércio' }).click(); await w(200);
  await p.locator('#o-oc .seg-b', { hasText: 'Casa noturna' }).click(); await w(200);
  ok(await p.locator('#o-objs .o-obj').count() === 20, 'no painel, a Casa noturna com os 20');
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'sem erros na página: ' + t.errs.slice(0, 3).join(' | '));
  console.log(`lote180: ${n - fails}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})();
