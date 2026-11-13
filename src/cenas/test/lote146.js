// Bateria do lote 146 (as Cenas): o casarão com jardim (Furtividade). A casa grande com o escritório, o jardim com as
// estufas (paredes de vidro), a casa de ferramentas e o altar; o andar de cima com a sala misteriosa; o porão com a
// sala secreta atrás da passagem secreta. Três cenas ligadas pelas escadas.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1440, h: 900 });
  const r = await t.page.evaluate(async () => {
    const F = __tc.Furtividade, L = F.LUGARES.casarao, S = __tc.Store.S;
    const p = L.gerar({ tamanho: 'medio', guardas: 'normal', alvo: 'artefato', and: { cima: 1, porao: 1, base: true, salas: { base: ['secreta'] } } }, { seed: 7, estilo: 'comum' });
    const pap = q => q.salas.map(s => s.papel);
    const antes = new Set(S.order); await L.criar(p, 'Casarão', { hora: 'noite' });
    const ids = S.order.filter(x => !antes.has(x)), cenas = ids.map(id => S.scenes[id]);
    const props = cenas[1] ? cenas.find(c => c.nivel === 0).tokens.map(t => t.name || '') : [];
    return { ids: F.IDS.includes('casarao'), t0: pap(p), cima: p.andares.filter(a => a.nivel === 1).map(pap)[0] || [], baixo: p.andares.filter(a => a.nivel === -1).map(pap)[0] || [],
      vidro: p.paredes.filter(w => w.k === 'mureta').length, sec: p.andares.filter(a => a.nivel === -1).some(a => a.paredes.some(w => w.secret)),
      niveis: cenas.map(c => c.nivel).sort(), tone: cenas.every(c => c.tone === 'noite'), links: cenas.every(c => c.tokens.some(t => t.cena && ids.includes(t.cena))),
      canteiro: props.filter(n => /Canteiro/.test(n)).length, altar: props.some(n => /altar/i.test(n)) };
  });
  ok(r.ids, 'o casarão está na lista dos lugares');
  ok(['escritorio', 'estufa', 'ferramentas'].every(x => r.t0.includes(x)) && r.t0.filter(x => x === 'estufa').length >= 2, 'o térreo tem o escritório, as estufas e a casa de ferramentas — ' + r.t0);
  ok(r.cima.includes('misteriosa'), 'o 1º andar tem a sala misteriosa — ' + r.cima);
  ok(r.baixo.includes('secreta') && r.sec, 'o porão tem a sala secreta, atrás da passagem secreta — ' + r.baixo);
  ok(r.vidro >= 20, 'as estufas são de vidro (barram a passagem, não a vista) — ' + r.vidro);
  ok(JSON.stringify(r.niveis) === '[-1,0,1]' && r.tone && r.links, 'três cenas, de noite, ligadas pelas escadas — ' + JSON.stringify(r.niveis));
  ok(r.canteiro >= 6 && r.altar, 'os canteiros e o altar do jardim — ' + r.canteiro);
  ok(!t.errs.length, 'sem erros no console — ' + t.errs.join(' | '));
  await t.close();
  console.log(`lote 146: ${n - fails}/${n}`); process.exit(fails ? 1 : 0);
})();
