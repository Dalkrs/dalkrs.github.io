// Lote 10, as contas do Mapa-múndi (sem navegador):
//   · (parte 1) a facção dos jogadores (uma só; vai na projeção); as províncias (as regiões de fora) e as sub-regiões
//     (as de dentro, em árvore); os hexágonos de uma região (os da grade com o centro dentro dela — conferidos contra a
//     conta de força bruta, nas duas orientações da grade e com a grade deslocada), os próprios (sem os das
//     sub-regiões), o terreno de cada um; e o Livro do reino (por facção: províncias, sub-regiões, hexágonos — a
//     sub-região de outro dono leva os dela — e exércitos, com as tropas; a linha sem dono).
const N = require('../../mundo/nucleo.js');
const R = require('../../mundo/reino.js');
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FALHOU: ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' — esperado ' + JSON.stringify(b) + ', veio ' + JSON.stringify(a));
const j = JSON.stringify;

/* ---- (parte 1) a facção dos jogadores ---- */
{
  const m = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, faccoes: [
    { id: 'fa', nome: 'Aldar', jog: true }, { id: 'fb', nome: 'Vale', jog: 'sim' }, { id: 'fc', nome: 'Culto', jog: false, oculta: true }, { id: 'fd', nome: 'Ilhas' }] });
  eq(m.faccoes.map(f => !!f.jog), [true, false, false, false], 'a facção dos jogadores: uma só (a primeira marcada)');
  ok(!('jog' in m.faccoes[1]) && !('jog' in m.faccoes[3]), 'sem a marca, o campo nem fica (o mapa de antes fica igual)');
  const p = N.projetar(m);
  ok(p.faccoes.find(f => f.id === 'fa').jog === true, 'a projeção leva a facção dos jogadores (eles sabem qual é a deles)');
  const m2 = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, faccoes: [{ id: 'fc', nome: 'Culto', jog: true, oculta: true }] });
  ok(!N.projetar(m2).faccoes.length, 'a facção dos jogadores escondida não vai (como qualquer escondida)');
}

/* ---- (parte 1) províncias e sub-regiões ---- */
const quad = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
{
  const m = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, objs: [
    { id: 'p1', k: 'r', nome: 'Reino', pts: quad(0, 0, 1000, 800) },
    { id: 's1', k: 'r', nome: 'Ducado Norte', pai: 'p1', pts: quad(50, 50, 500, 400) },
    { id: 's11', k: 'r', nome: 'Condado', pai: 's1', pts: quad(60, 60, 200, 200) },
    { id: 's2', k: 'r', nome: 'Ducado Sul', pai: 'p1', pts: quad(50, 450, 500, 750) },
    { id: 'p2', k: 'r', nome: 'Ilha', pts: quad(1200, 0, 1600, 400) }] });
  const r = id => m.objs.find(o => o.id === id);
  ok(R.ehProvincia(r('p1')) && R.ehProvincia(r('p2')) && !R.ehProvincia(r('s1')) && !R.ehProvincia(r('s11')), 'província: a região de fora');
  ok(R.provinciaDe(m, r('s11')) === r('p1') && R.provinciaDe(m, r('s2')) === r('p1') && R.provinciaDe(m, r('p2')) === r('p2'), 'a província de uma sub-região (subindo pelos pais); a de fora é a dela mesma');
  eq(R.subregioesDe(m, r('p1')).map(x => [x.r.id, x.nivel]), [['s1', 1], ['s11', 2], ['s2', 1]], 'as sub-regiões em árvore (cada uma seguida das de dentro dela)');
  eq(R.subregioesDe(m, r('p2')), [], 'a província sem sub-regiões');
}

/* ---- (parte 1) os hexágonos de uma região ---- */
{
  // a força bruta: todos os hexágonos de uma faixa grande, o centro dentro do polígono
  const bruta = (m, pts) => {
    const out = [];
    for (let q = -80; q <= 80; q++) for (let r = -80; r <= 80; r++) { const c = N.centroHex(m, q, r); if (N.dentroPoligono([c.x, c.y], pts)) out.push(q + ',' + r); }
    return out.sort();
  };
  const formas = { quadrado: quad(0, 0, 400, 300), concava: [[0, 0], [500, 0], [500, 400], [250, 150], [0, 400]], torta: [[-120, 30], [260, -90], [430, 280], [90, 360]] };
  for (const [orient, gx, gy] of [['pe', 0, 0], ['deitado', 0, 0], ['pe', 13, -7], ['deitado', -21, 9]]) {
    const base = { nome: 'M', larg: 2000, alt: 1400, grade: { tam: 40, x: gx, y: gy, orient, on: true } };
    for (const [nome, pts] of Object.entries(formas)) {
      const m = N.normalizarMapa(Object.assign({}, base, { objs: [{ id: 'r', k: 'r', pts }] }));
      const hs = R.hexesDaRegiao(m, m.objs[0]);
      ok(hs.length > 10 && j(hs.slice().sort()) === j(bruta(m, m.objs[0].pts)), 'os hexágonos da região (' + nome + ', grade ' + orient + (gx ? ' deslocada' : '') + ') batem com a força bruta: ' + hs.length);
    }
  }
  const sem = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, objs: [{ id: 'r', k: 'r', pts: quad(0, 0, 400, 300) }] });
  eq(R.hexesDaRegiao(sem, sem.objs[0]), [], 'sem grade: nenhum hexágono');
  const m = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, grade: { tam: 40, x: 0, y: 0, orient: 'pe', on: true }, objs: [{ id: 'r', k: 'r', pts: quad(0, 0, 400, 300) }] });
  ok(R.hexesDaRegiao(m, m.objs[0]) === R.hexesDaRegiao(m, m.objs[0]), 'a conta fica guardada para o mesmo mapa');
}

/* ---- (parte 1) os próprios, o terreno e o Livro do reino ---- */
{
  const grade = { tam: 40, x: 0, y: 0, orient: 'pe', on: true };
  const terrenos = [{ id: 'flo', nome: 'Floresta', cor: '#2f6b3a' }, { id: 'cam', nome: 'Campo', cor: '#a8b04a' }, { id: 'mon', nome: 'Montanha', cor: '#8a8070' }];
  const m0 = { nome: 'M', larg: 2000, alt: 1400, grade, terrenos, faccoes: [{ id: 'fa', nome: 'Aldar' }, { id: 'fb', nome: 'Vale' }],
    objs: [
      { id: 'p1', k: 'r', nome: 'Reino', fac: 'fa', pts: quad(0, 0, 800, 600) },
      { id: 's1', k: 'r', nome: 'Ducado do Vale', fac: 'fb', pai: 'p1', pts: quad(20, 20, 380, 280) },
      { id: 's2', k: 'r', nome: 'Prefeitura', pai: 'p1', pts: quad(420, 20, 780, 280) },
      { id: 'p2', k: 'r', nome: 'Ermo', pts: quad(1000, 0, 1400, 400) },
      { id: 'ga', k: 'g', x: 100, y: 100, tipo: 'exercito', fac: 'fa', exe: { unid: [{ id: 'u1', tropas: 300 }, { id: 'u2', tropas: 200 }] } },
      { id: 'gb', k: 'g', x: 200, y: 100, tipo: 'exercito', fac: 'fb', exe: { unid: [{ id: 'u3', tropas: 100 }] } },
      { id: 'gc', k: 'g', x: 300, y: 100, tipo: 'exercito', exe: { unid: [{ id: 'u4', tropas: 50 }] } },
      { id: 'gd', k: 'g', x: 400, y: 100 }] };
  // o terreno: alguns hexágonos de s1 com floresta, um com montanha, um marcado "nenhum"
  const m1 = N.normalizarMapa(m0), s1 = m1.objs.find(o => o.id === 's1'), hs1 = R.hexesDaRegiao(m1, s1);
  const hexes = {};
  hs1.slice(0, 5).forEach(k => { hexes[k] = 'flo'; });
  hexes[hs1[5]] = 'mon';
  hexes[hs1[6]] = '-';
  hexes[hs1[7]] = ['cam', 3];
  const m = N.normalizarMapa(Object.assign({}, m0, { hexes }));
  const o = id => m.objs.find(x => x.id === id);
  const t = R.terrenosDaRegiao(m, o('s1'));
  eq([t.n, t.por.map(x => [x.id, x.n]), t.sem], [hs1.length, [['flo', 5], ['cam', 1], ['mon', 1]], hs1.length - 7], 'o terreno da sub-região: floresta 5, campo 1 (com custo próprio), montanha 1; o resto sem terreno (e o "nenhum")');
  eq(R.terrenoDoHex(m, hs1[6]), null, 'o hexágono marcado "nenhum" não tem terreno');
  const p1 = R.hexesDaRegiao(m, o('p1')), d1 = R.hexesDaRegiao(m, o('s1')), d2 = R.hexesDaRegiao(m, o('s2')), pr = R.hexesProprios(m, o('p1'));
  ok(pr.length === p1.length - d1.length - d2.length && !pr.some(k => d1.includes(k) || d2.includes(k)), 'os hexágonos próprios da província: os dela menos os das sub-regiões (' + pr.length + ')');
  const L = R.livroDoReino(m), fa = L.linhas[0], fb = L.linhas[1];
  eq([fa.prov, fa.sub, fa.hex, fa.exe, fa.tropas], [1, 1, pr.length + d2.length, 1, 500], 'o Livro: Aldar com 1 província, 1 sub-região (a Prefeitura, sem facção própria), os hexágonos dela e da Prefeitura, 1 exército com 500 tropas');
  eq([fb.prov, fb.sub, fb.hex, fb.exe, fb.tropas], [0, 1, d1.length, 1, 100], 'o Vale: só o ducado (de outro dono, leva os hexágonos dele) e 1 exército');
  eq([L.sem.prov, L.sem.hex, L.sem.exe, L.sem.tropas], [1, R.hexesDaRegiao(m, o('p2')).length, 1, 50], 'sem dono: o Ermo e o exército sem facção');
  ok(L.grade === true && R.livroDoReino(N.projetar(m)).linhas[0].exe === 0, 'na projeção, o exército vai sem os números: o livro não conta');
  // o terreno do desenho à mão também conta (e o "nenhum" do hexágono ganha do desenho)
  const hp2 = R.hexesDaRegiao(m, o('p2')), pint = N.normalizarMapa(Object.assign({}, m0, { hexes: { [hp2[0]]: '-' }, pintura: { ops: [{ t: 'mon', r: 400, pts: [[1200, 200]] }] } }));
  const tp = R.terrenosDaRegiao(pint, pint.objs.find(x => x.id === 'p2'));
  ok(tp.por.length === 1 && tp.por[0].id === 'mon' && tp.por[0].n === hp2.length - 1 && tp.sem === 1, 'o desenho à mão: a pincelada de montanha cobre o Ermo; o hexágono marcado "nenhum" fica sem: ' + JSON.stringify(tp));
}

console.log(bad ? bad + ' falharam de ' + n : n + ' verificações passaram');
process.exit(bad ? 1 : 0);
