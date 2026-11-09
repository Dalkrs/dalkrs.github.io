// Bateria do lote 128 (as Cenas): o banheiro no "Gerar o interior". A casa (de qualquer tamanho) e a casa do senhor
// (média e grande) saem com um banheiro, na menor sala, com a banheira (ou a tina, se a banheira não cabe), a latrina e o
// lavatório; nunca a banheira e a tina juntas.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1300, h: 850 });
  const r = await t.page.evaluate(() => {
    const I = __tc.Interior, out = [];
    for (const [tipo, tams] of [['casa', ['pequeno', 'medio', 'grande']], ['senhor', ['medio', 'grande']]]) for (const tam of tams) for (const seed of [1, 2, 3, 4, 5]) {
      const T = I.TAMANHOS_I[tam], p = I.gerar({ tipo, w: T.w, h: T.h, seed, estilo: 'comum' });
      const b = p.salas.find(q => q.papel === 'banheiro'), ids = b ? b.moveis.map(m => m.id) : [];
      out.push({ k: tipo + '/' + tam + '/' + seed, tem: !!b, menor: !!b && b.w * b.h === Math.min(...p.salas.slice(1).map(q => q.w * q.h)),
        banho: ids.includes('banheira') !== ids.includes('tina'), latrina: ids.includes('latrina'), cozinha: tipo !== 'casa' || tam === 'pequeno' || p.salas.some(q => q.papel === 'cozinha') });
    }
    return out;
  });
  const ruins = r.filter(x => !(x.tem && x.menor && x.banho && x.latrina && x.cozinha));
  ok(!ruins.length, 'cada casa sai com o banheiro na menor sala, com a banheira (ou a tina) e a latrina; a casa média e a grande guardam a cozinha: ' + JSON.stringify(ruins.slice(0, 4)));
  ok(t.errs.filter(e => !/favicon/.test(e)).length === 0, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
