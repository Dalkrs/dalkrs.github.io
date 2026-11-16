// Lote 170: parar e retomar quem anda pelo Mapa-múndi (a caravana, a patrulha, o exército, o evento que anda).
//   · parado (pausado), não anda: o andarTempos devolve ok:false com o aviso; a espera de uma parada também não corre;
//   · o "pausado" fica no mapa (normalizar) e sai quando retoma; retomado, anda de onde parou.
const N = require('../../mundo/nucleo.js');
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FALHOU: ' + m); } };
const mapa = (g) => N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, grade: { tam: 40 }, cal: { dia: 0, tempo: 0 },
  objs: [{ id: 'rt', k: 't', pts: [[100, 100], [900, 100]] }, Object.assign({ id: 'cv', k: 'g', tipo: 'caravana', x: 100, y: 100, rota: 'rt', prog: 0, pt: 8 }, g)] });
const cv = m => m.objs.find(o => o.id === 'cv');
{
  const m = mapa({ pausado: true });
  ok(cv(m).pausado === true, 'o "pausado" fica no mapa normalizado');
  const r = N.andarTempos(m, 'cv', 3);
  ok(!r.ok && r.pausado && /Retomar/.test(r.msg), 'parado, não anda: ' + JSON.stringify(r).slice(0, 120));
  const m2 = mapa({ pausado: true, espera: 4 });
  ok(N.andarTempos(m2, 'cv', 2).ok === false && cv(m2).espera === 4, 'a espera de uma parada não corre enquanto está parado');
  const m3 = mapa({ pausado: 'sim' });
  ok(!('pausado' in cv(m3)), 'só true conta como parado');
  const m4 = mapa({});
  const r4 = N.andarTempos(m4, 'cv', 1);
  ok(!('pausado' in cv(m4)) && r4.ok !== false, 'sem parar, anda como antes: ' + (r4.msg || ''));
}
console.log(bad ? `${n - bad} verificações passaram, ${bad} falharam` : `${n} verificações passaram`);
process.exit(bad ? 1 : 0);
