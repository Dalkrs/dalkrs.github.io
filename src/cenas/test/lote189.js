// Bateria do lote 189 (as Cenas): os dois tipos novos do gerador de interiores — o apotecário (a botica, o laboratório,
// o quarto) e a casa noturna (o salão fino na frente; as alcovas finas, o escritório da madame e as alcovas sujas dos
// fundos; o porão com as celas).
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, ev = (f, a) => p.evaluate(f, a);
  const r = await ev(() => {
    const I = __tc.Interior, ids = pl => new Set([].concat(...pl.salas.map(q => q.moveis.map(m => m.id))));
    const apo = I.gerar({ tipo: 'apotecario', w: 7, h: 6, p: 's', seed: 7 }), bor = I.gerar({ tipo: 'bordel', w: 12, h: 9, p: 'n', seed: 7 });
    const borP = I.gerar({ tipo: 'bordel', w: 12, h: 9, p: 'n', seed: 7, andares: __tc.PlantaAndares.normalizar({ porao: 1 }, I.catDe('bordel')) });
    return { tipos: ['apotecario', 'bordel'].every(k => I.PLANTAS[k]), apo: apo.salas.map(q => q.papel), apoM: [...ids(apo)], bor: bor.salas.map(q => q.papel), borM: [...ids(bor)],
      porao: (borP.andares || []).map(a => a.nivel + ':' + a.salas.map(q => q.papel).join(',')).join(' '), nomes: ['botica', 'alcovaFundos'].map(k => __tc.PlantaAndares.NOMES[k]) };
  });
  ok(r.tipos, 'os dois tipos no gerador de interiores');
  ok(r.apo[0] === 'botica' && r.apo.includes('laboratorio') && ['balanca', 'vasinhosErvas', 'alambique'].every(x => r.apoM.includes(x)), 'o apotecário: a botica na frente e o laboratório — ' + r.apo.join(',') + ' ' + r.apoM.join(','));
  ok(r.bor[0] === 'salaoNoturno' && r.bor.includes('alcovaFundos') && r.bor.includes('escritorioMadame') && ['palcoPole', 'camaDossel', 'colchaoChao', 'livroCaixa'].every(x => r.borM.includes(x)), 'a casa noturna: o salão fino, as alcovas finas e as sujas, o escritório — ' + r.bor.join(','));
  ok(/^-1:.*cela/.test(r.porao), 'o porão da casa noturna, com as celas: ' + r.porao);
  ok(r.nomes.join('|') === 'Botica|Alcova dos fundos', 'os nomes das salas novas');
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'sem erros na página: ' + t.errs.slice(0, 3).join(' | '));
  console.log(`lote189: ${n - fails}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})();
