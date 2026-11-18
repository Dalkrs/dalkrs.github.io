// (lote 188) As formas: a habilidade de transformação troca a imagem do token, e ela volta quando o Transformado sai.
const { open } = require('./lib');
(async () => {
  const t = await open(); const { page } = t; const ev = (fn, a) => page.evaluate(fn, a); const w = ms => page.waitForTimeout(ms);
  let ok = 0, fail = 0; const chk = (c, m) => { if (c) ok++; else { fail++; console.log('FALHOU: ' + m); } };
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const id = await ev(png => {
    const { Store, newToken, Fichas } = __tc, sc = Store.scene();
    Fichas.get = c => (c === 'c1' ? { ficha: { formas: { n_lobisomem_f1: png } } } : null);
    const a = newToken(sc, 8 * sc.cell, 6 * sc.cell, { name: 'Lupa' }); a.char = 'c1'; a.img = null;
    Store.tx('Criar', () => Store.add('tokens', a));
    return a.id;
  }, PNG);
  const tok = () => ev(id => { const t = __tc.Store.get('tokens', id); return { img: t.img, tf: t.tf, conds: t.conds, d: (t.cinfo.transformado || {}).d }; }, id);
  chk(await ev(id => __tc.HabAcao.temForma(__tc.Store.get('tokens', id), { id: 'n_lobisomem_f1' }), id), 'a ficha tem a imagem da forma');
  await ev(id => __tc.HabAcao.forma(id, { id: 'n_lobisomem_f1', nome: 'Transformar', desc: 'Vira lobo por 3 turnos: garras.' }), id); await w(100);
  const a = await tok();
  chk(a.img && a.tf && a.conds.includes('transformado') && a.d === 3, 'usou: imagem da forma, Transformado por 3 turnos — ' + JSON.stringify(a));
  await ev(id => { const { Store } = __tc, t = Store.get('tokens', id); Store.tx('tira', () => Store.upd('tokens', id, { conds: t.conds.filter(c => c !== 'transformado') })); }, id); await w(100);
  const b = await tok();
  chk(!b.img && !b.tf, 'o Transformado saiu: a imagem voltou — ' + JSON.stringify(b));
  chk(!(await ev(id => __tc.HabAcao.temForma(__tc.Store.get('tokens', id), { id: 'outra' }), id)), 'sem imagem para a habilidade: nada muda');
  const errs = (t.errs || []).filter(e => !/favicon|net::|404/.test(e));
  chk(!errs.length, 'sem erros: ' + errs.join(' | '));
  console.log(`${ok} verificações passaram${fail ? ', ' + fail + ' falharam' : ''}`);
  await t.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
