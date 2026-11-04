// Lote 88: "Puxar os membros do clã" — sem foto própria nem retrato da ficha, o token usa a foto padrão do cargo; sem
// ela, a foto padrão do clã (a que o Clã chamava "dos sem cargo"), também para quem tem cargo.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open();
  if (!(await t.page.evaluate(() => !!window.ClaNucleo))) await t.page.addScriptTag({ path: require('path').join(__dirname, '../../../cla/nucleo.js') });   // (a página de teste não traz o núcleo do clã)
  const r = await t.page.evaluate(() => {
    const A = 'https://x.y/cargo.png', S = 'https://x.y/cla.png', P = 'https://x.y/propria.png';
    const c = window.ClaNucleo.normCla({ nome: 'Clã Garret', cargos: { lider: { nome: 'Rei', gente: [{ id: 'ps_rei', nome: 'Dain' }] },
      cg_ar: { nome: 'Arauto', pai: 'lider', gente: [{ id: 'ps_ar', nome: 'Kotrick' }] }, cg_ap: { nome: 'Aprendizes', pai: 'lider', gente: [{ id: 'ps_ap', nome: 'Amanda' }, { id: 'ps_mi', nome: 'Maia' }] } },
      membros: { avulsos: [{ id: 'ps_av', nome: 'Oswin' }], dados: { ps_mi: { img: P } }, imgCargo: { cg_ar: A, _sem: S } } });
    return Object.fromEntries(__tc.MembrosCla.membros(c).map(m => [m.nome, m.img]));
  });
  ok(r.Kotrick === 'https://x.y/cargo.png', 'Kotrick (Arauto, cargo com foto padrão): a do cargo — ' + r.Kotrick);
  ok(r.Amanda === 'https://x.y/cla.png' && r.Dain === 'https://x.y/cla.png', 'Amanda (Aprendizes) e Dain (Rei), cargos sem foto padrão: a do clã — ' + JSON.stringify(r));
  ok(r.Oswin === 'https://x.y/cla.png', 'Oswin, sem cargo: a do clã');
  ok(r.Maia === 'https://x.y/propria.png', 'Maia, com foto própria: a dela');
  ok(!t.errs || !t.errs.length, 'sem erros no console: ' + (t.errs || []).slice(0, 3).join(' | '));
  console.log((fails ? fails + ' falharam, ' : '') + (n - fails) + ' verificações passaram');
  await t.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
