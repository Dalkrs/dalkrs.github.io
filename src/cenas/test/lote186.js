// (lote 186) O guarda dormindo não enxerga: sem cone desenhado, sem ver ninguém e fora do mapa de calor.
const { open } = require('./lib');
(async () => {
  const t = await open(); const { page } = t; const ev = (fn, a) => page.evaluate(fn, a);
  let ok = 0, fail = 0; const chk = (c, m) => { if (c) ok++; else { fail++; console.log('FALHOU: ' + m); } };
  const r = await ev(() => {
    const { Store, newToken, Rondas, Vigia } = __tc, sc = Store.scene();
    const g = newToken(sc, 8 * sc.cell, 6 * sc.cell, { name: 'Guarda' }), p = newToken(sc, 10 * sc.cell, 6 * sc.cell, { name: 'Dain' });
    g.ronda = Rondas.novaRonda({ dir: 0, r: 6, a: 90 }); p.owner = '*';
    Store.tx('Criar', () => { Store.add('tokens', g); Store.add('tokens', p); });
    const ve = () => Rondas.quemVe(Store.scene()).some(x => x.t.id === p.id);
    const calor = () => Vigia.daCena ? (Vigia.daCena(Store.scene()).guardas || []).length : -1;
    const a = { ve: ve(), calor: calor() };
    Store.tx('Dorme', () => Store.upd('tokens', g.id, { conds: ['adormecido'] }));
    const b = { ve: ve(), calor: calor(), dorme: Rondas.dormindo(Store.get('tokens', g.id)) };
    Store.tx('Acorda', () => Store.upd('tokens', g.id, { conds: [] }));
    return { a, b, c: { ve: ve() } };
  });
  chk(r.a.ve, 'acordado, o guarda vê quem está no cone');
  chk(!r.b.ve && r.b.dorme, 'Adormecido: não vê ninguém');
  chk(r.a.calor === -1 || r.b.calor === r.a.calor - 1, 'Adormecido: fora do mapa de calor — ' + JSON.stringify(r));
  chk(r.c.ve, 'acordou: volta a ver');
  console.log(`${ok} verificações passaram${fail ? ', ' + fail + ' falharam' : ''}`);
  await t.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
