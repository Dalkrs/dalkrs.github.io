// Bateria do lote 148 (as Cenas): a casa nobre com piscina. Os objetos novos (o grupo "Casa nobre e quintal") desenham
// sem erro; os pisos novos (mármore, ladrilho, deck, grama) e a piscina pintam; o "Gerar o interior" põe o fogão e a pia
// na cozinha; a Furtividade mobilia a sala da mansão com o sofá, a cozinha com o fogão, e o casarão às vezes ganha a
// piscina no jardim (no lugar da fonte), com as espreguiçadeiras e a escadinha.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1300, h: 850 });
  const r = await t.page.evaluate(() => {
    const T = __tc, P = T.Props, NOVOS = ['sofa', 'poltrona', 'aparador', 'vasoGrande', 'fogao', 'piaCozinha', 'prateleiraPanelas', 'espreguicadeira', 'guardaSol', 'mesaJardim', 'escadaPiscina', 'boia'];
    const cv = document.createElement('canvas'); cv.width = 200; cv.height = 200; const g = cv.getContext('2d');
    const desenham = NOVOS.filter(id => { try { P.desenhar(g, id, 0, 0, P.P[id].fw || P.P[id].size || 1, P.P[id].fh || P.P[id].size || 1, 0, 40); return P.P[id].g === 'nobre'; } catch (e) { return false; } });
    const KIT = T.LugaresFora.kit, K = KIT.novoPlano('teste', 12, 10, 3);
    for (const tipo of ['marmore', 'ladrilho', 'deck', 'grama']) K.pinta('piso', { x: 0, y: 0, w: 3, h: 3, tipo });
    K.pinta('piscina', { x: 4, y: 2, w: 6, h: 4 });
    const pc = KIT.pintar(K.p, 20), d = pc.getContext('2d').getImageData(7 * 20, 4 * 20, 1, 1).data;      // o meio da piscina: azul
    const I = T.Interior, coz = [];
    for (const seed of [1, 2, 3, 4]) { const TT = I.TAMANHOS_I.medio, p = I.gerar({ tipo: 'casa', w: TT.w, h: TT.h, seed, estilo: 'comum' }); const q = p.salas.find(x => x.papel === 'cozinha'); if (q) coz.push(q.moveis.map(m => m.id)); }
    const F = T.Furtividade, mans = F.gerar('mansao', { tamanho: 'medio', seed: 5, estilo: 'comum', guardas: 'normal', alvo: 'cofre' });
    const ids = mans.objetos.map(o => o.id), piscinas = [];
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) { const c = F.gerar('casarao', { tamanho: 'medio', seed, estilo: 'comum', guardas: 'normal', alvo: 'documento' }); piscinas.push({ p: c.pintados.some(x => x.k === 'piscina'), esp: c.objetos.filter(o => o.id === 'espreguicadeira').length, esc: c.objetos.some(o => o.id === 'escadaPiscina'), mj: c.objetos.some(o => o.id === 'mesaJardim') }); }
    return { desenham, NOVOS, azul: d[2] > d[0] + 40, coz, fogaoMans: ids.includes('fogao'), sofaMans: ids.includes('aparador') && ids.includes('poltrona'), vaso: ids.includes('vasoGrande'), piscinas };
  });
  ok(r.desenham.length === r.NOVOS.length, 'os 12 objetos novos desenham, no grupo "Casa nobre e quintal": ' + r.desenham.join(','));
  ok(r.azul, 'a piscina pinta a água azul');
  ok(r.coz.length >= 2 && r.coz.every(l => l.includes('fogao') || l.includes('piaCozinha')), 'o "Gerar o interior": a cozinha com o fogão ou a pia — ' + JSON.stringify(r.coz));
  ok(r.fogaoMans && r.sofaMans && r.vaso, 'a mansão: o fogão na cozinha, o aparador, a poltrona e os vasos');
  const com = r.piscinas.filter(x => x.p);
  ok(com.length >= 1 && com.length < r.piscinas.length && com.every(x => x.esp >= 2 && x.esc), 'o casarão: às vezes a piscina (com as espreguiçadeiras e a escadinha), às vezes a fonte — ' + JSON.stringify(r.piscinas));
  ok(r.piscinas.every(x => x.mj), 'o casarão: sempre a mesa de jardim');
  ok(t.errs.filter(e => !/favicon/.test(e)).length === 0, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
