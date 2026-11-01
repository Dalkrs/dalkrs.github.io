// Lote 17, a lógica pura do Mapa-múndi (sem navegador):
//   · o que se guarda: a seta de ofensiva, a seta da marcha (e os pontos prontos da projeção), a produção do lugar, as
//     ligações por mar, a zona de guerra (desligada, o ajuste), a tabela da defesa, a zona pronta da projeção e os
//     recursos por hexágono — com os limites e as referências que não existem;
//   · a zona de guerra automática (os donos dos hexágonos, a fronteira entre facções em guerra, os ocupados, o ajuste, a
//     linha do front);
//   · as viagens por mar (as ligações, o caminho traçado que vai por mar, a viagem nos dias da ligação) e a seta da marcha;
//   · a projeção: quem vê cada seta, a zona pronta (fora da névoa, sem as facções escondidas), sem o que é do mestre;
//   · a economia: os recursos dos hexágonos e os lugares que produzem (para quem controla a região), para os jogadores;
//   · a guerra: a defesa do terreno e dos lugares (a tabela de começo e a do mestre) e o bônus do terreno na batalha;
//   · a terra devastada que o dia da campanha sugere (desmarcada) e o que ela faz ao ser marcada;
//   · os terrenos e os ícones novos.
'use strict';
const N = require('../../mundo/nucleo.js');
const R = require('../../mundo/reino.js');
const G = require('../../mundo/guerra.js');
const CA = require('../../mundo/campanha.js');
let n = 0, ruins = 0;
const ok = (c, m) => { n++; if (!c) { ruins++; console.log('FALHOU: ' + m); } };
const j = JSON.stringify;
const eq = (a, b, m) => ok(j(a) === j(b), m + ' — veio ' + j(a));

// um mapa com a grade (50 de um centro ao outro), duas facções em guerra lado a lado e uma neutra
const base = (extra) => N.normalizarMapa(Object.assign({
  id: 'mp_t', larg: 2000, alt: 1400, grade: { tam: 50, x: 25, y: 25 },
  faccoes: [{ id: 'fa', nome: 'Aldar', cor: '#3f7fbf', jog: true, rel: { fb: 'guerra' } }, { id: 'fb', nome: 'Vale', cor: '#c0503a' }, { id: 'fc', nome: 'Neutros', cor: '#3f9a5c' }],
  objs: [
    { k: 'r', id: 'r1', nome: 'Aldar', pts: [[0, 0], [1000, 0], [1000, 1400], [0, 1400]], fac: 'fa' },
    { k: 'r', id: 'r2', nome: 'Vale', pts: [[1000, 0], [2000, 0], [2000, 1400], [1000, 1400]], fac: 'fb' },
  ],
}, extra || {}));
const achar = (m, id) => m.objs.find(o => o.id === id);

/* ---------------- o que se guarda ---------------- */
{
  const m = N.normalizarMapa({
    faccoes: [{ id: 'fa', nome: 'A' }],
    objs: [
      { k: 'a', id: 'st1', pts: [[0, 0], [10, 10]], fac: 'fa', ver: 1, cor: '#ABCDEF' },
      { k: 'a', id: 'st2', pts: [[0, 0], [10, 10]], fac: 'zz' },
      { k: 'a', id: 'st3', pts: [[0, 0]] },
      { k: 'm', id: 'p1', x: 1, y: 1, ic: 'porto', mar: [{ p: 'p2', d: 3 }, { p: 'p2', d: 5 }, { p: 'p1', d: 2 }, { p: 'zz', d: 2 }, { p: 'p3', d: 0 }, { p: 'p3', d: 999 }] },
      { k: 'm', id: 'p2', x: 2, y: 2, ic: 'porto' },
      { k: 'm', id: 'p3', x: 3, y: 3, ic: 'cidade' },
      { k: 'm', id: 'mn', x: 4, y: 4, ic: 'mina', pr: { orith: 5, nada: 0 } },
      { k: 'g', id: 'g1', x: 5, y: 5, seta: { ver: 'sim' }, sp: [[1, 1], [2, 2]] },
      { k: 'g', id: 'g2', x: 5, y: 5, seta: true },
    ],
  });
  eq(achar(m, 'st1'), { id: 'st1', k: 'a', nome: '', txt: '', nota: '', oculto: false, pts: [[0, 0], [10, 10]], fac: 'fa', cor: '#abcdef', ver: true }, 'a seta: os pontos, a facção, a cor e "ver"');
  ok(achar(m, 'st2').fac === null && !achar(m, 'st3'), 'a seta de uma facção que não existe fica sem facção; com um ponto só, não é seta');
  eq(achar(m, 'p1').mar, [{ p: 'p2', d: 3 }, { p: 'p3', d: 365 }], 'as ligações por mar: sem repetir o outro porto (vale a primeira), não com ele mesmo nem com quem não existe, de 1 a 365 dias');
  ok(achar(m, 'mn').pr === undefined, '(sem a economia, nenhum recurso do mundo: a produção do lugar sai)');
  ok(j(achar(m, 'g1').seta) === j({ ver: true }) && j(achar(m, 'g1').sp) === j([[1, 1], [2, 2]]) && achar(m, 'g2').seta === undefined, 'a marcha como seta ({ ver }) e os pontos prontos (sp); seta: true não é o formato');
  const comEco = N.normalizarMapa({ eco: { on: true, rec: [{ id: 'orith', nome: 'Orith' }, { id: 'mad', nome: 'Madeira' }], hexr: { '1,2': { mad: 3, zz: 9 }, '3,4': { mad: 0 }, 'xx': { mad: 1 }, '-1,-2': { orith: -2.5 } } },
    objs: [{ k: 'm', id: 'mn', x: 4, y: 4, ic: 'mina', pr: { orith: 5, zz: 1 } }] });
  eq(comEco.eco.hexr, { '1,2': { mad: 3 }, '-1,-2': { orith: -2.5 } }, 'os recursos por hexágono: só os recursos do mundo, sem zero, só chaves de hexágono');
  eq(achar(comEco, 'mn').pr, { orith: 5 }, 'a produção do lugar: só os recursos do mundo');
  ok(!N.normalizarMapa({ eco: { on: true, rec: [{ id: 'm', nome: 'M' }] } }).eco.hexr, '(sem recurso em hexágono nenhum: sem hexr)');
  const g = N.normalizarMapa({ guerra: { zona: { off: 1, add: ['1,1', '1,1', '2,2', 'lixo'], tira: ['2,2', '3,3'] }, def: { ter: { mo: 12, zz: 3, fl: 0, co: '-2' }, ic: { castelo: 4, coisa: 2 } } } }).guerra;
  eq(g.zona, { off: true, add: ['1,1'], tira: ['2,2', '3,3'] }, 'a zona: desligada, o que o mestre pôs (sem repetir) e tirou (o tirado vence)');
  eq(g.def, { ter: { mo: 10, co: -2 }, ic: { castelo: 4 } }, 'a tabela da defesa: os terrenos e os ícones que existem, de −10 a +10, sem os zeros');
  ok(!N.normalizarMapa({ guerra: { zona: { add: [] } } }).guerra, 'a zona sem nada: a guerra do mapa continua vazia (não aparece)');
  const za = N.normalizarMapa({ guerra: { zauto: { h: { '1,1': ['fa', null, 1], 'x': ['fa'] }, f: [['1,1', '2,1', 'fa', 'fb'], ['1,1', '5,5', 'fa', 'fb']] } } }).guerra.zauto;
  eq(za, { h: { '1,1': ['fa', null, 1] }, f: [['1,1', '2,1', 'fa', 'fb']] }, 'a zona pronta (da projeção): os hexágonos e os lados entre vizinhos');
}

/* ---------------- a zona de guerra automática ---------------- */
{
  const m = base();
  const z = N.zonaDeGuerra(m);
  const ks = [...z.h.keys()], lado = k => { const h = N.lerChaveHex(k); return N.centroHex(m, h.q, h.r).x < 1000 ? 'a' : 'b'; };
  ok(z.h.size > 0 && ks.some(k => lado(k) === 'a') && ks.some(k => lado(k) === 'b'), 'a fronteira entre duas facções em guerra: os hexágonos dos dois lados');
  ok([...z.h.values()].every(x => (x.a === 'fa' && x.b === 'fb') || (x.a === 'fb' && x.b === 'fa')) && [...z.h.values()].every(x => !x.o), 'cada um: quem controla e contra quem (nenhum ocupado)');
  const longe = N.hexDe(m, 200, 700);
  ok(!z.h.has(longe.q + ',' + longe.r), 'o meio de Aldar não está na zona');
  ok(z.f.length > 0 && z.f.every(([k1, k2, a, b]) => N.distHex(N.lerChaveHex(k1), N.lerChaveHex(k2)) === 1 && a !== b), 'a linha do front: os lados entre vizinhos de facções em guerra');
  {
    // conta à parte: cada par de vizinhos de facções em guerra — os dois hexágonos na zona, e o lado na linha uma vez só
    const dn = N.donosDosHexes(m), lados = new Set(), pares = new Set();
    for (const [k, d] of dn) {
      const h = N.lerChaveHex(k);
      for (const [dq, dr] of [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]) {
        const kn = (h.q + dq) + ',' + (h.r + dr), e = dn.get(kn);
        if (e && N.emGuerra(m, d.fac, e.fac)) { lados.add(k); lados.add(kn); pares.add([k, kn].sort().join('|')); }
      }
    }
    ok(lados.size > 0 && z.h.size === lados.size && [...lados].every(k => z.h.has(k)), 'a zona: os dois hexágonos de cada lado da fronteira (e só eles): ' + z.h.size + ' de ' + lados.size);
    const fs = z.f.map(x => [x[0], x[1]].sort().join('|'));
    ok(fs.length === pares.size && new Set(fs).size === fs.length && fs.every(x => pares.has(x)), 'a linha do front: cada lado da fronteira uma vez só: ' + fs.length + ' de ' + pares.size);
  }
  ok(N.zonaDeGuerra(base({ faccoes: [{ id: 'fa', nome: 'A' }, { id: 'fb', nome: 'B' }] })) === null, 'sem guerra entre elas: nada');
  ok(N.zonaDeGuerra(Object.assign({}, m, { grade: { tam: 0 } })) === null || N.zonaDeGuerra(N.normalizarMapa(Object.assign({}, m, { grade: { tam: 0 } }))) === null, 'sem a grade: nada');
  ok(N.zonaDeGuerra(N.normalizarMapa(Object.assign({}, m, { guerra: { zona: { off: true } } }))) === null, 'desligada: nada');
  // o ajuste
  const kAdd = longe.q + ',' + longe.r, kTira = ks[0];
  const z2 = N.zonaDeGuerra(N.normalizarMapa(Object.assign({}, m, { guerra: { zona: { add: [kAdd], tira: [kTira] } } })));
  ok(z2.h.has(kAdd) && j(z2.h.get(kAdd)) === j({ a: 'fa', b: null, o: false }) && !z2.h.has(kTira) && z2.f.every(x => x[0] !== kTira && x[1] !== kTira), 'o ajuste: o posto entra (com quem controla, contra ninguém); o tirado sai (e os lados dele saem da linha)');
  // a região ocupada e o lugar ocupado
  const oc = base({ objs: m.objs.concat([{ k: 'r', id: 'r3', pts: [[1300, 200], [1600, 200], [1600, 500], [1300, 500]], pai: 'r2', ocup: { fac: 'fa', d: 0 } }, { k: 'm', id: 'cid', x: 1800, y: 1200, ic: 'cidade', ocup: { fac: 'fa', d: 0 } }]) });
  const zo = N.zonaDeGuerra(oc), dentro = N.hexDe(oc, 1450, 350), cid = N.hexDe(oc, 1800, 1200);
  eq(zo.h.get(dentro.q + ',' + dentro.r), { a: 'fa', b: 'fb', o: true }, 'o hexágono da região ocupada: de quem ocupa, contra a dona, ocupado');
  eq(zo.h.get(cid.q + ',' + cid.r), { a: 'fa', b: 'fb', o: true }, 'o hexágono da cidade ocupada também');
  const d = N.donosDosHexes(oc);
  eq(d.get(dentro.q + ',' + dentro.r), { fac: 'fa', dono: 'fb', oc: true }, 'os donos dos hexágonos: a sub-região de dentro vale (ocupada: quem ocupa e a dona)');
  ok(N.emGuerra(m, 'fa', 'fb') && N.emGuerra(m, 'fb', 'fa') && !N.emGuerra(m, 'fa', 'fc') && !N.emGuerra(m, 'fa', 'fa'), 'emGuerra: dos dois lados; com a neutra, não');
}

/* ---------------- as viagens por mar e a seta da marcha ---------------- */
{
  const m = base({ objs: [
    { k: 'm', id: 'p1', x: 100, y: 100, ic: 'porto', mar: [{ p: 'p2', d: 3 }] },
    { k: 'm', id: 'p2', x: 1900, y: 1300, ic: 'porto', mar: [{ p: 'p1', d: 2 }] },
    { k: 'm', id: 'p3', x: 100, y: 1300, ic: 'cidade', mar: [{ p: 'p1', d: 1 }] },
  ] });
  const ls = N.ligacoesMar(m);
  ok(ls.length === 1 && ls[0].d === 2 && ls[0].ka && ls[0].kb, 'as ligações por mar: uma por par (guardada dos dois lados: vale a menor), só entre portos: ' + j(ls));
  const r = N.tracarRota(m, { x: 100, y: 100 }, { x: 1900, y: 1300 }, { cubosDia: 30 });
  ok(r.ok && r.dias === 2 && j(r.mar) === j([{ a: 'p1', b: 'p2', d: 2 }]) && r.hexes === 0 && r.msg === '2 dias de mar', 'de porto a porto: por mar (2 dias valem 60 cubos, menos que por terra): ' + r.msg);
  const lento = N.tracarRota(m, { x: 100, y: 100 }, { x: 1900, y: 1300 }, { cubosDia: 1000 });
  ok(lento.ok && !lento.mar, 'para quem anda muito num dia, a terra chega antes: o caminho não usa o mar');
  const r2 = N.tracarRota(m, { x: 300, y: 100 }, { x: 1900, y: 1200 }, { cubosDia: 30 });
  ok(r2.ok && r2.dias === 2 && r2.hexes > 0 && /hexágonos \(\d+ cubos\) e 2 dias de mar$/.test(r2.msg) && r2.pts.length >= 3, 'de perto de um porto a perto do outro: anda até o porto, vai por mar e anda de novo: ' + r2.msg);
  // a viagem: a travessia leva os dias da ligação, no passo de quem anda
  const t = N.objNovo('t', { id: 't1', pts: [[100, 100], [1900, 1300]] });
  const m2 = N.normalizarMapa(Object.assign({}, m, { objs: m.objs.concat([t, { k: 'g', id: 'g1', x: 100, y: 100, rota: 't1', pt: 3 }]) }));
  const v = N.viagem(m2, achar(m2, 'g1'));
  ok(Math.abs(v.total - 60) < 1e-6 && v.mar.length === 1 && v.mar[0].i0 === 0 && v.mar[0].i1 === v.cam.length - 1, 'a viagem por mar: 2 dias × 10 tempos × 3 cubos = 60, divididos entre os hexágonos do mar: ' + v.total);
  const m5 = N.normalizarMapa(Object.assign({}, m2, { objs: m2.objs.concat([{ k: 'g', id: 'g5', x: 100, y: 100, rota: 't1', pt: 5 }]) }));
  const v5 = N.viagem(m5, achar(m5, 'g5'));
  ok(Math.abs(v5.total - 100) < 1e-6, 'no passo de quem anda: com 5 cubos por tempo, os 2 dias de mar valem 100: ' + v5.total);
  const sem = N.viagem(N.normalizarMapa(Object.assign({}, m2, { objs: m2.objs.map(o => (o.k === 'm' ? Object.assign({}, o, { mar: [] }) : o)) })), achar(m2, 'g1'));
  ok(sem.total > 60 && !sem.mar, 'sem a ligação, a mesma linha é por terra (o custo dos hexágonos)');
  // a seta da marcha
  const m3 = base({ objs: [{ k: 't', id: 't2', pts: [[300, 700], [900, 700], [1300, 900]] }, { k: 'g', id: 'g2', x: 300, y: 700, rota: 't2' }] });
  eq(N.setaDaMarcha(m3, achar(m3, 'g2')), [[300, 700], [900, 700], [1300, 900]], 'a seta da marcha: do grupo até o fim da rota');
  const m4 = N.normalizarMapa(Object.assign({}, m3, { objs: m3.objs.map(o => (o.id === 'g2' ? Object.assign({}, o, { x: 975, y: 743.01, prog: 70 }) : o)) }));
  eq(N.setaDaMarcha(m4, achar(m4, 'g2')), [[975, 743.01], [1300, 900]], 'depois de andar: de onde ele está');
  const fim = N.normalizarMapa(Object.assign({}, m3, { objs: m3.objs.map(o => (o.id === 'g2' ? Object.assign({}, o, { x: 1300, y: 900, prog: 999 }) : o)) }));
  ok(N.setaDaMarcha(fim, achar(fim, 'g2')) === null && N.setaDaMarcha(m3, { k: 'g', id: 'x' }) === null, 'no fim da rota, ou sem rota: sem seta');
}

/* ---------------- a projeção ---------------- */
{
  const m = base({ guerra: { zona: { add: ['3,3'] }, def: { ter: { mo: 2 }, ic: {} } }, nevoa: { on: true, ops: [{ t: '+', x: 1000, y: 700, r: 400 }] },
    faccoes: [{ id: 'fa', nome: 'Aldar', jog: true, rel: { fb: 'guerra' } }, { id: 'fb', nome: 'Vale' }, { id: 'fz', nome: 'Oculta', oculta: true }],
    objs: [
      { k: 'r', id: 'r1', pts: [[0, 0], [1000, 0], [1000, 1400], [0, 1400]], fac: 'fa' },
      { k: 'r', id: 'r2', pts: [[1000, 0], [2000, 0], [2000, 1400], [1000, 1400]], fac: 'fb' },
      { k: 'a', id: 'aj', pts: [[900, 700], [1100, 700]], fac: 'fa' },
      { k: 'a', id: 'ab', pts: [[900, 700], [1100, 700]], fac: 'fb' },
      { k: 'a', id: 'av', pts: [[900, 700], [1100, 700]], fac: 'fb', ver: true },
      { k: 'a', id: 'az', pts: [[900, 700], [1100, 700]], fac: 'fz', ver: true },
      { k: 'a', id: 'ao', pts: [[900, 700], [1100, 700]], fac: 'fa', oculto: true },
      { k: 'a', id: 'an', pts: [[50, 50], [60, 60]], fac: 'fa' },
      { k: 't', id: 't1', pts: [[800, 700], [1200, 700]] },
      { k: 'g', id: 'gj', x: 800, y: 700, rota: 't1', fac: 'fa', seta: { ver: false } },
      { k: 'g', id: 'gb', x: 800, y: 700, rota: 't1', fac: 'fb', seta: { ver: false } },
      { k: 'g', id: 'gv', x: 800, y: 700, rota: 't1', fac: 'fb', seta: { ver: true } },
      { k: 'g', id: 'gs', x: 800, y: 700, rota: 't1', fac: 'fa' },
      { k: 'm', id: 'mn', x: 950, y: 700, ic: 'mina', pr: { x: 1 } },
      { k: 'm', id: 'p1', x: 950, y: 750, ic: 'porto', mar: [{ p: 'p2', d: 2 }, { p: 'p3', d: 4 }] },
      { k: 'm', id: 'p2', x: 1050, y: 750, ic: 'porto' },
      { k: 'm', id: 'p3', x: 1950, y: 1350, ic: 'porto' },
    ] });
  const p = N.projetar(m), ids = new Set(p.objs.map(o => o.id));
  ok(ids.has('aj') && !ids.has('ab') && ids.has('av') && !ids.has('ao') && !ids.has('an'), 'as setas: a da facção dos jogadores vai; a de outra, só mostrada; a escondida e a coberta pela névoa, não');
  ok(ids.has('az') && p.objs.find(o => o.id === 'az').fac === null, 'a de uma facção escondida, mostrada: vai sem a facção');
  const sp = id => (p.objs.find(o => o.id === id) || {}).sp;
  ok(j(sp('gj')) === j([[800, 700], [1200, 700]]) && !sp('gb') && j(sp('gv')) === j([[800, 700], [1200, 700]]) && !sp('gs') && p.objs.every(o => o.seta === undefined), 'a seta da marcha: pronta para a facção dos jogadores e para a mostrada; sem "seta", nada; o "seta" do mestre não vai');
  ok(p.guerra && p.guerra.zauto && Object.keys(p.guerra.zauto.h).length > 0 && p.guerra.zauto.f.length > 0 && !p.guerra.zona && !p.guerra.def, 'a zona vai pronta (zauto); o ajuste e a tabela da defesa, não');
  ok(Object.keys(p.guerra.zauto.h).every(k => { const h = N.lerChaveHex(k), c = N.centroHex(m, h.q, h.r); return !N.nevoaCobre(m, c.x, c.y); }) && !p.guerra.zauto.h['3,3'], 'a zona pronta: só fora da névoa (o hexágono posto à mão, coberto, não vai)');
  ok(p.objs.find(o => o.id === 'mn').pr === undefined, 'a produção do lugar é do mestre');
  const me = base({ eco: { on: true, rec: [{ id: 'orith', nome: 'Orith' }] }, objs: [{ k: 'm', id: 'mn', x: 400, y: 400, ic: 'mina', pr: { orith: 5 } }] });
  ok(j(achar(me, 'mn').pr) === j({ orith: 5 }) && N.projetar(me).objs.find(o => o.id === 'mn').pr === undefined, 'com a economia ligada: o mestre tem a produção do lugar; a projeção, não');
  eq(p.objs.find(o => o.id === 'p1').mar, [{ p: 'p2', d: 2 }], 'as ligações por mar: só com os portos que eles veem');
  const pz = N.projetar(base({ guerra: { zona: { off: true } } }));
  ok(!pz.guerra, 'a zona desligada não vai');
}

/* ---------------- a economia ---------------- */
{
  const m0 = base({ objs: [
    { k: 'r', id: 'r1', pts: [[0, 0], [1000, 0], [1000, 1400], [0, 1400]], fac: 'fa' },
    { k: 'r', id: 'r2', pts: [[1000, 0], [2000, 0], [2000, 1400], [1000, 1400]], fac: 'fb', ocup: { fac: 'fa', d: 0 } },
    { k: 'm', id: 'mn', x: 400, y: 1000, ic: 'mina', pr: { orith: 5 } },
    { k: 'm', id: 'fz', x: 1500, y: 1000, ic: 'fazenda', pr: { suprimentos: 7 } },
    { k: 'm', id: 'ci', x: 400, y: 300, ic: 'cidade', pr: { orith: 9 } },
    { k: 'm', id: 'fora', x: 2500, y: 1000, ic: 'mina', pr: { orith: 9 } },
  ] });
  const m1 = JSON.parse(JSON.stringify(m0));
  R.ligarEconomia(m1);
  const prs = { mn: { orith: 5 }, fz: { suprimentos: 7 }, ci: { orith: 9 }, fora: { orith: 9 } };
  for (const o of m1.objs) if (prs[o.id]) o.pr = prs[o.id];      // (a produção só fica com os recursos do mundo: depois de ligar a economia)
  const h1 = N.hexDe(m1, 300, 300), k1 = h1.q + ',' + h1.r;
  m1.eco.hexr = { [k1]: { madeira: 3 } };
  const m = N.normalizarMapa(m1);
  const r1 = achar(m, 'r1'), sem = (() => { const x = JSON.parse(JSON.stringify(m)); delete x.eco.hexr; return N.normalizarMapa(x); })();
  ok((R.producaoPropria(m, r1).terreno.madeira || 0) === (R.producaoPropria(sem, achar(sem, 'r1')).terreno.madeira || 0) + 3, 'os recursos do hexágono somam ao terreno da região (+3 Madeira)');
  eq(R.producaoPropria(m, r1).lugar, { orith: 5 }, 'a mina produz para a região onde fica (a cidade não produz: não é um lugar que produz)');
  ok(R.producaoPropria(m, r1).total.orith === 5 && R.producaoDaRegiao(m, r1).lugar.orith === 5, 'e entra no total (e na região com as de dentro)');
  const pf = R.producaoPorFaccao(m);
  ok(pf.por.fa.orith === 5 && pf.por.fa.suprimentos >= 7 && !(pf.por.fb.suprimentos >= 7), 'a fazenda na região ocupada produz para quem ocupa (Aldar), não para a dona');
  ok(R.lugaresQueProduzem(m).length === 3 && R.lugaresQueProduzem(m).find(x => x.o.id === 'fora').r === null, 'os lugares que produzem: a mina fora das regiões não vai para ninguém');
  const ej = R.economiaDosJogadores(m);
  ok(ej.prod.lugar.orith === 5 && ej.prod.lugar.suprimentos === 7, 'a economia dos jogadores mostra os lugares como fonte: ' + j(ej.prod.lugar));
  eq(N.projetar(m).ecoJ.prod.lugar, { orith: 5, suprimentos: 7 }, 'e vai na projeção');
  ok(R.recursoDoLugar(m, 'mina').id === 'orith' && R.recursoDoLugar(m, 'serraria').id === 'madeira' && R.recursoDoLugar(m, 'fazenda').papel === 'comida' && R.recursoDoLugar(m, 'cidade') === null, 'o recurso de começo de cada lugar: o do papel (a mina, o metal…)');
}

/* ---------------- a guerra: a defesa do terreno e dos lugares ---------------- */
{
  const m = base();
  ok(N.defesaDoTerreno(m, 'mo') === 3 && N.defesaDoTerreno(m, 'df') === 3 && N.defesaDoTerreno(m, 'co') === 2 && N.defesaDoTerreno(m, 'pl') === 0, 'a defesa de começo do terreno (Montanha e Desfiladeiro +3, Colina +2, Planície nada)');
  ok(N.defesaDoIcone(m, 'castelo') === 3 && N.defesaDoIcone(m, 'forte') === 2 && N.defesaDoIcone(m, 'cidade') === 0, 'a dos lugares (Castelo +3, Forte +2)');
  const t = N.normalizarMapa(Object.assign({}, m, { guerra: { def: { ter: { pl: 1 }, ic: { cidade: 1 } } } }));
  ok(N.defesaDoTerreno(t, 'pl') === 1 && N.defesaDoTerreno(t, 'mo') === 0 && N.defesaDoIcone(t, 'cidade') === 1 && N.defesaDoIcone(t, 'castelo') === 0, 'a tabela do mestre vale inteira (o que não está nela, nada)');
  const h = N.hexDe(m, 500, 500), k = h.q + ',' + h.r, comMo = N.normalizarMapa(Object.assign({}, m, { hexes: { [k]: 'mo' } }));
  ok(j(N.defesaNoHex(comMo, k)) === j({ terreno: comMo.terrenos.find(x => x.id === 'mo'), v: 3 }) && N.defesaNoHex(m, k) === null && N.defesaNoHex(comMo, 'lixo') === null, 'defesaNoHex: o terreno do hexágono e o quanto dá (sem terreno com defesa: null)');
  // o bônus na batalha
  const lado = { forca: 100, atq: 0, def: 0, tipos: [], share: [], moral: 5, cmd: 0, magos: 0, dist: 0, fome: 0, maqExe: 0 };
  const ctx = { terreno: { lado: 'b', v: 3, nome: 'Montanha' } };
  const bb = G.bonus(lado, lado, ctx, 'b', 'ch'), ba = G.bonus(lado, lado, ctx, 'a', 'ch');
  ok(bb.some(x => x.k === 'terreno' && x.v === 3 && x.nome === 'Terreno (Montanha)') && !ba.some(x => x.k === 'terreno'), 'na batalha: o terreno ajuda quem defende (com o nome dele), não o outro lado');
  ok(G.bonus(lado, lado, ctx, 'b', 'd100').some(x => x.k === 'terreno') && !G.bonus(lado, lado, ctx, 'b', 'ab').some(x => x.k === 'terreno') && !G.bonus(lado, lado, ctx, 'b', 'vi').some(x => x.k === 'terreno'), 'vale no Choque e na resumida (não na Abertura nem na Virada)');
  ok(G.NOMES.terreno === 'Terreno' && G.DO_MOMENTO.ch.includes('terreno'), '(o nome e o momento)');
}

/* ---------------- a terra devastada ---------------- */
{
  const m0 = base({ cal: { dia: 10 } });
  const h = N.hexDe(m0, 500, 500), k = h.q + ',' + h.r, h2 = N.hexDe(m0, 700, 500), k2 = h2.q + ',' + h2.r;
  const m = N.normalizarMapa(Object.assign({}, m0, { hexes: { [k2]: ['td', 12] }, guerra: { bats: [
    { id: 'b1', d: 9, nome: 'Vau', a: { nome: 'A' }, b: { nome: 'B' }, hex: k, fim: { vence: 'a', tam: 2 } },
    { id: 'b2', d: 3, nome: 'Velha', a: { nome: 'A' }, b: { nome: 'B' }, hex: '9,9' },
    { id: 'b3', d: 9, nome: 'Já', a: { nome: 'A' }, b: { nome: 'B' }, hex: k2 },
  ] } }));
  const dv = CA.devastadaNoDia(m, 1, new Set(), []);
  eq(dv, [{ k, por: 'batalha', nome: 'Vau', recusado: false }], 'a sugestão: onde houve batalha nos dias que passaram (não a antiga, nem onde já é Terra devastada)');
  ok(CA.devastadaNoDia(m, 1, new Set(['dev:' + k]), [])[0].recusado === true, 'desmarcada (dev: nas recusadas): fica recusada');
  const d1 = JSON.parse(JSON.stringify(m));
  ok(CA.aplicarDevastada(d1, { devast: [{ k, recusado: false }, { k: k2, recusado: true }] }) === 1 && d1.hexes[k] === 'td' && j(d1.hexes[k2]) === j(['td', 12]), 'aplicar: a marcada vira Terra devastada (o custo próprio de um hexágono fica)');
  const d2 = JSON.parse(JSON.stringify(m));
  d2.hexes[k] = ['pl', 7];
  CA.aplicarDevastada(d2, { devast: [{ k, recusado: false }] });
  eq(d2.hexes[k], ['td', 7], 'o custo próprio do hexágono fica');
  const semTd = N.normalizarMapa(Object.assign({}, m, { terrenos: m.terrenos.filter(t => t.id !== 'td') }));
  ok(CA.devastadaNoDia(semTd, 1, new Set(), []).length === 0, 'sem o terreno no mapa, nenhuma sugestão');
  // o cerco
  const cer = N.normalizarMapa(Object.assign({}, m, { objs: m.objs.concat([{ k: 'm', id: 'cid', x: 1500, y: 700, ic: 'cidade', nome: 'Forte Velho', cerco: { fac: 'fa', d: 5 } }]) }));
  const hc = N.hexDe(cer, 1500, 700);
  const dc = CA.devastadaNoDia(cer, 1, new Set(), [{ m: 'cid', fim: false }]);
  ok(dc.some(x => x.por === 'cerco' && x.k === hc.q + ',' + hc.r && x.nome === 'Forte Velho' && x.m === 'cid'), 'onde há cerco, também');
  ok(!CA.devastadaNoDia(cer, 1, new Set(), [{ m: 'cid', fim: true }]).some(x => x.por === 'cerco'), 'o cerco que acabou não sugere');
  // pela conta do dia
  const res = CA.diaDaCampanha(m, 1, ['dev:' + k]);
  ok(res.devast.length === 1 && res.devast[0].recusado === true, 'o dia da campanha leva a sugestão (com a caixa)');
}

/* ---------------- os terrenos e os ícones novos ---------------- */
{
  const ids = ['ar', 'md', 'df', 'gl', 'fm', 'oa', 'ch', 'td'];
  ok(j(N.TERRENOS_L17.map(t => t.id)) === j(ids) && N.TERRENOS_L17.every(t => /^#[0-9a-f]{6}$/.test(t.cor) && t.custo > 0 && N.TEXTURAS[t.tex] && N.BIOMA_DA_TEX[t.tex]), 'os oito terrenos novos, cada um com a cor, o custo, o desenho e o bioma da cena');
  ok(ids.every(id => N.TERRENOS_PADRAO.some(t => t.id === id)) && N.mapaNovo('x').terrenos.length === 28, 'um mapa novo já vem com eles (lote 54: e o rio e as três estradas)');
  const antigo = N.normalizarMapa({ terrenos: N.TERRENOS_PADRAO.slice(0, 16) });
  eq(N.terrenosQueFaltam(antigo).map(t => t.id), ids.concat(['ri', 'et', 'ep', 'ev']), 'num mapa de antes, a aba Terreno oferece os que faltam (lote 54: e os quatro dele)');
  const ics = ['fazenda', 'pedreira', 'serraria', 'forte', 'farol', 'estalagem', 'mercado', 'cemiterio', 'portal', 'ninho'];
  ok(ics.every(k => N.ICONES[k] && N.ICONES[k].nome && /^#[0-9a-f]{6}$/.test(N.ICONES[k].cor) && /^<path d="[^"]+"\/>|^<path/.test(N.ICONES[k].svg)), 'os dez ícones novos, com o nome, a cor e o desenho');
  ok(j(Object.keys(N.PRODUCAO_ICONE)) === j(['mina', 'pedreira', 'serraria', 'fazenda']) && j(N.DEF_ICONE_PADRAO) === j({ castelo: 3, forte: 2 }), 'os lugares que produzem e os que defendem');
}

console.log(ruins ? ruins + ' de ' + n + ' falharam' : n + ' verificações passaram');
process.exit(ruins ? 1 : 0);
