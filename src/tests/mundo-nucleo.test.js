// Testes da lógica pura do Mapa-múndi (mundo/nucleo.js), no Node, sem navegador.
// O ponto central é a projeção pública: cada regra tem um caso que falharia se ela faltasse.
// Uso: node src/tests/mundo-nucleo.test.js
'use strict';
const path = require('path');
const N = require(path.join(__dirname, '..', '..', 'mundo', 'nucleo.js'));

let n = 0, bad = 0;
const ok = (c, msg) => { n++; if (!c) { bad++; console.log('FALHOU: ' + msg); } };
const end = () => { console.log(bad ? `${n - bad} verificações passaram, ${bad} falharam` : `${n} verificações passaram`); process.exit(bad ? 1 : 0); };
const j = JSON.stringify;
const perto = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const naoLanca = fn => { try { fn(); return true; } catch (e) { console.log('   lançou:', e && e.message); return false; } };
// gerador previsível, para os sorteios
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

/* ================= catálogos ================= */
const ICS = ['cidade', 'vila', 'castelo', 'ruina', 'masmorra', 'templo', 'porto', 'torre', 'acampamento', 'caverna', 'floresta', 'montanha', 'ponte', 'mina', 'tesouro', 'perigo', 'misterio', 'bandeira'];
ok(ICS.every(k => N.ICONES[k] && N.ICONES[k].nome && /^#[0-9a-f]{6}$/.test(N.ICONES[k].cor) && /^<(path|circle)/.test(N.ICONES[k].svg)), 'os 18 ícones existem, com nome, cor e glifo');
ok(Object.keys(N.ICONES).length >= 16, 'pelo menos 16 ícones');
ok(Object.values(N.ICONES).every(i => !/fill="(?!none)/.test(i.svg) && !/<script|on\w+=/i.test(i.svg)), 'glifos só de traço e sem nada executável');
const EVS = ['guerra', 'conflito', 'praga', 'fome', 'festival', 'tempestade', 'magia', 'monstro', 'revolta', 'incendio', 'inundacao', 'descoberta'];
ok(EVS.every(k => N.EVENTOS[k] && N.EVENTOS[k].nome && /^#[0-9a-f]{6}$/.test(N.EVENTOS[k].cor) && N.EVENTOS[k].svg), 'os 12 tipos de evento existem');
ok(N.CORES.length === 10 && N.CORES.every(c => /^#[0-9a-f]{6}$/.test(c)) && new Set(N.CORES).size === 10, '10 cores de facção, todas diferentes');
ok(N.RITMOS === undefined && N.CUBOS_HEX === 5 && N.CUBOS_DIA === 30, 'sem ritmos: o grupo anda os cubos por dia dele (30 de começo); um hexágono = 5 cubos');
ok(j(Object.keys(N.VIAS)) === j(['estrada', 'trilha', 'selvagem', 'rio', 'mar']) && Object.values(N.VIAS).every(v => v.nome && v.mult === undefined) && N.VIAS.mar.nome === 'Mar (navio)', 'vias: só o desenho da rota (não mudam a velocidade)');
ok(j(N.TERRENOS_PADRAO.map(t => [t.id, t.nome, t.custo])) === j([['pl', 'Planície', 5], ['fl', 'Floresta', 10], ['co', 'Colina', 8], ['mo', 'Montanha', 15], ['pa', 'Pântano', 15], ['de', 'Deserto', 10], ['ne', 'Neve', 15], ['ag', 'Água', 10]]) && N.TERRENOS_PADRAO.every(t => /^#[0-9a-f]{6}$/.test(t.cor)), 'oito tipos de terreno de começo, com custo em cubos por hexágono');
ok(j(N.RELACOES) === j({ alianca: 'Aliança', neutra: 'Neutra', tensao: 'Tensão', guerra: 'Guerra' }), 'relações como no contrato');
ok(N.CAL_PADRAO.meses.length === 12 && N.CAL_PADRAO.meses.every(m => m.dias === 30 && m.nome) && N.CAL_PADRAO.ano0 === 1 && N.CAL_PADRAO.era === '', 'calendário padrão: 12 meses de 30 dias');

/* ================= criação ================= */
{
  const a = N.novoId('mp'), b = N.novoId('mp');
  ok(/^mp_[a-z0-9]+$/.test(a) && a !== b, 'novoId: prefixo e sem repetir (' + a + ')');
  const m = N.mapaNovo('Terra Média');
  ok(m.v === 1 && /^mp_/.test(m.id) && m.nome === 'Terra Média' && m.oculto === false && m.img === null && m.larg === 2000 && m.alt === 1400, 'mapaNovo: padrões do contrato');
  ok(j(m.grade) === j({ tam: 0, x: 0, y: 0, orient: 'pe', on: false, alfa: 0.35 }) && !('escala' in m) && m.cal.dia === 0 && m.cal.meses.length === 12 && m.nevoa.on === false && m.nevoa.ops.length === 0 && m.faccoes.length === 0 && m.objs.length === 0, 'mapaNovo: sem grade (sem escala), calendário, névoa e listas vazias');
  ok(j(m.terrenos) === j(N.TERRENOS_PADRAO) && m.terrenos !== N.TERRENOS_PADRAO && j(m.hexes) === '{}', 'mapaNovo: os terrenos de começo (uma cópia) e nenhum hexágono pintado');
  ok(N.mapaNovo('', { larg: 800, alt: 600 }).nome === 'Mundo conhecido' && N.mapaNovo('x', { larg: 800, alt: 600 }).larg === 800, 'mapaNovo: nome padrão e papel em branco do tamanho pedido');
  const c = N.mapaNovo('Com imagem', { img: { url: 'https://exemplo.com/a.jpg', w: 4000, h: 2800 }, larg: 10, alt: 10 });
  ok(c.larg === 4000 && c.alt === 2800 && c.img.url === 'https://exemplo.com/a.jpg', 'mapaNovo com imagem: o tamanho do mundo é o da imagem');
  m.cal.meses[0].nome = 'mexido';
  ok(N.CAL_PADRAO.meses[0].nome === 'Alvorada', 'mapaNovo copia o calendário padrão (não compartilha)');

  const tipos = { m: ['x', 'y', 'ic', 'cor', 'rumor', 'falso'], g: ['x', 'y', 'cor', 'sigla', 'cubos', 'rota', 'prog'], r: ['pts', 'fac', 'cor', 'custo', 'enc'], e: ['x', 'y', 'tipo', 'r', 'ini', 'fim', 'cresce', 'forca'], t: ['pts', 'via'], f: ['pts', 'a', 'b', 'ativa'] };
  for (const k in tipos) {
    const o = N.objNovo(k);
    ok(o && o.k === k && o.id && o.nome === '' && o.txt === '' && o.nota === '' && o.oculto === false && tipos[k].every(c2 => c2 in o), 'objNovo(' + k + ') tem os campos comuns e os do tipo');
  }
  ok(N.objNovo('m', { x: 10, y: 20, ic: 'castelo' }).ic === 'castelo' && N.objNovo('g').sigla === 'GR' && N.objNovo('g').cubos === 30 && !('ritmo' in N.objNovo('g')) && N.objNovo('r').custo === null && N.objNovo('e').r === 80 && N.objNovo('t').via === 'trilha' && N.objNovo('f').ativa === true, 'objNovo: padrões e campos passados');
  ok(N.objNovo('zz') === null, 'objNovo com tipo desconhecido: null');
  ok(N.objNovo('e', { x: 1, y: 1 }).ini === null && N.normalizarMapa({ cal: { dia: 42 }, objs: [N.objNovo('e', { x: 1, y: 1 })] }).objs[0].ini === 42, 'evento sem dia de começo começa "hoje" ao entrar no mapa');
  const f = N.faccaoNova('Corvos', '#3f7fbf');
  ok(/^fc_/.test(f.id) && f.nome === 'Corvos' && f.cor === '#3f7fbf' && f.oculta === false && j(f.rel) === '{}' && f.nota === '', 'faccaoNova');
}

/* ================= calendário ================= */
{
  const cal = N.copia(N.CAL_PADRAO);
  ok(N.diasNoAno(cal) === 360, 'ano de 360 dias');
  ok(j(N.dataDe(cal, 0)) === j({ ano: 1, mes: 0, diaMes: 1, nomeMes: 'Alvorada' }), 'dia 0 = 1 de Alvorada, ano 1');
  ok(N.dataDe(cal, 29).diaMes === 30 && N.dataDe(cal, 30).mes === 1 && N.dataDe(cal, 30).diaMes === 1, 'virada de mês');
  ok(N.dataDe(cal, 359).mes === 11 && N.dataDe(cal, 359).diaMes === 30 && N.dataDe(cal, 360).ano === 2 && N.dataDe(cal, 360).mes === 0, 'virada de ano');
  const c2 = { dia: 0, ano0: 1023, era: 'D.R.', meses: [{ nome: 'Curto', dias: 10 }, { nome: 'Florada', dias: 20 }] };
  ok(N.diasNoAno(c2) === 30 && N.textoData(c2, 21) === '12 de Florada, ano 1023 D.R.', 'meses de tamanhos diferentes, ano inicial e era: ' + N.textoData(c2, 21));
  ok(N.textoData({ ano0: 5, era: '', meses: [{ nome: 'Um', dias: 3 }] }, 7) === '2 de Um, ano 7', 'sem era, sem espaço sobrando');
  ok(N.dataDe(cal, -5).diaMes === 1 && N.dataDe(cal, 'lixo').ano === 1 && N.dataDe(null, 0).nomeMes === 'Alvorada', 'dia negativo ou lixo vira o dia 0; calendário ausente usa o padrão');
}

/* ================= geometria ================= */
{
  ok(N.dist([0, 0], [3, 4]) === 5 && N.dist({ x: 0, y: 0 }, { x: 6, y: 8 }) === 10, 'distância entre pontos ([x,y] ou {x,y})');
  const L = [[0, 0], [10, 0], [10, 10]];
  ok(N.compPolilinha(L) === 20 && N.compPolilinha([[1, 1]]) === 0, 'comprimento da linha');
  const p = N.pontoNaPolilinha(L, 15);
  ok(p.x === 10 && p.y === 5 && p.fim === false, 'ponto no meio do segundo trecho');
  ok(N.pontoNaPolilinha(L, 0).x === 0 && N.pontoNaPolilinha(L, -3).fim === false, 'ponto no começo');
  const q = N.pontoNaPolilinha(L, 99);
  ok(q.x === 10 && q.y === 10 && q.fim === true && N.pontoNaPolilinha(L, 20).fim === true, 'passou do fim: último ponto, fim = true');
  const U = [[0, 0], [10, 0], [10, 10], [6, 10], [6, 4], [4, 4], [4, 10], [0, 10]];   // um "U" (côncavo)
  ok(N.dentroPoligono([2, 8], U) && N.dentroPoligono([8, 8], U) && !N.dentroPoligono([5, 8], U) && !N.dentroPoligono([20, 5], U), 'ponto dentro do polígono côncavo (e fora do vão)');
  ok(N.dentroPoligono({ x: 2, y: 2 }, U) && !N.dentroPoligono([1, 1], [[0, 0], [1, 1]]), 'aceita {x,y}; com menos de 3 pontos nada está dentro');
  const c = N.centroide([[0, 0], [10, 0], [10, 10], [0, 10]]);
  ok(perto(c.x, 5) && perto(c.y, 5), 'centroide do quadrado');
  const c2 = N.centroide([[0, 0], [5, 0], [10, 0]]);
  ok(perto(c2.x, 5) && perto(c2.y, 0), 'polígono achatado: média dos pontos');
}

/* ================= eventos ================= */
{
  const e = { k: 'e', x: 0, y: 0, r: 100, ini: 10, fim: 20, cresce: 5, forca: 2 };
  ok(!N.eventoAtivo(e, 9) && N.eventoAtivo(e, 10) && N.eventoAtivo(e, 20) && !N.eventoAtivo(e, 21), 'evento ativo do dia de começo ao dia do fim (os dois contam)');
  ok(N.eventoAtivo(Object.assign({}, e, { fim: null }), 9999), 'sem fim: ativo para sempre');
  ok(N.raioNoDia(e, 10) === 100 && N.raioNoDia(e, 14) === 120 && N.raioNoDia(e, 3) === 100, 'raio cresce por dia (antes de começar, o raio de partida)');
  const enc = { k: 'e', x: 0, y: 0, r: 30, ini: 0, fim: null, cresce: -10 };
  ok(N.raioNoDia(enc, 2) === 10 && N.raioNoDia(enc, 5) === 0 && N.eventoAtivo(enc, 2) && !N.eventoAtivo(enc, 3), 'encolhe até sumir (raio nunca negativo) e então deixa de estar ativo');
  const m = { cal: { dia: 15 }, objs: [e, Object.assign({}, e, { id: 'b', ini: 16 }), { k: 'm', x: 0, y: 0 }] };
  ok(N.eventosDoDia(m, 15).length === 1 && N.eventosDoDia(m).length === 1 && N.eventosDoDia(m, 16).length === 2, 'eventos do dia (sem dia: o de hoje do mapa)');
}

/* ================= a grade, o terreno e a viagem ================= */
{
  for (const orient of ['pe', 'deitado']) {
    const m = N.normalizarMapa({ grade: { tam: 40, x: 10, y: 20, orient } });
    let volta = true, cantos = true;
    for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) {
      const c = N.centroHex(m, q, r), h = N.hexDe(m, c.x, c.y);
      if (h.q !== q || h.r !== r) volta = false;
      for (const [x, y] of N.cantosHex(m, q, r)) if (!perto(Math.hypot(x - c.x, y - c.y), 40 / Math.sqrt(3), 1e-9)) cantos = false;
    }
    const c0 = N.centroHex(m, 0, 0), viz = [[1, 0], [0, 1], [-1, 1]].map(([q, r]) => N.centroHex(m, q, r));
    ok(volta && cantos && viz.every(c => perto(Math.hypot(c.x - c0.x, c.y - c0.y), 40, 1e-9)) && perto(c0.x, 10) && perto(c0.y, 20),
      'grade ' + orient + ': centro → hexágono → centro; vizinhos a 40 unidades; cantos a 40/√3; o hexágono (0, 0) na origem');
    // o hexágono de um ponto qualquer é o de centro mais perto (também perto dos cantos, onde arredondar q e r sozinhos erra)
    const m2 = N.normalizarMapa({ grade: { tam: 30, x: 7, y: -4, orient } });
    let semente = 12345, perto1 = true;
    const sorte = () => (semente = semente * 16807 % 2147483647) / 2147483647;
    for (let i = 0; i < 3000 && perto1; i++) {
      const x = -200 + 400 * sorte(), y = -200 + 400 * sorte(), h = N.hexDe(m2, x, y), c = N.centroHex(m2, h.q, h.r), d = Math.hypot(x - c.x, y - c.y);
      for (const [dq, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]) { const v = N.centroHex(m2, h.q + dq, h.r + dr); if (Math.hypot(x - v.x, y - v.y) < d - 1e-9) perto1 = false; }
    }
    ok(perto1, 'grade ' + orient + ': o hexágono de qualquer ponto é o de centro mais perto');
  }
  const m0 = N.normalizarMapa({ grade: { tam: 40 } });
  ok(j(N.hexDe(m0, 19, 0)) === j({ q: 0, r: 0 }) && j(N.hexDe(m0, 21, 0)) === j({ q: 1, r: 0 }) && N.hexDe(N.normalizarMapa({}), 5, 5) === null, 'o hexágono de um ponto (sem grade: nenhum)');
  ok(Object.is(N.hexDe(m0, -1, 0).q, 0) && N.chaveHex(N.hexDe(m0, -1, -1)) === '0,0' && j(N.lerChaveHex('-3,12')) === j({ q: -3, r: 12 }) && N.lerChaveHex('1,x') === null, 'chave do hexágono (sem -0)');
  ok(N.distHex({ q: 0, r: 0 }, { q: 3, r: -1 }) === 3 && N.distHex({ q: 2, r: 2 }, { q: -1, r: 0 }) === 5, 'distância em hexágonos');
  const lh = N.linhaHex({ q: 0, r: 0 }, { q: 5, r: -2 });
  ok(lh.length === 6 && lh.every((h, i) => !i || N.distHex(h, lh[i - 1]) === 1) && j(lh[5]) === j({ q: 5, r: -2 }), 'linha de hexágonos: cada um vizinho do anterior');
  const cam = N.caminhoHex(m0, [[0, 0], [400, 0], [400, 300]]);
  ok(cam.length > 15 && cam.every((h, i) => !i || N.distHex(h, cam[i - 1]) === 1) && j(cam[0]) === j({ q: 0, r: 0 }) && j(cam[cam.length - 1]) === j(N.hexDe(m0, 400, 300)),
    'o caminho de uma linha: hexágonos vizinhos, do começo ao fim (' + cam.length + ')');
  ok(N.cubosDe(m0, 80) === 10 && N.unidadesDeCubos(m0, 10) === 80 && N.cubosDe(N.normalizarMapa({}), 80) === 0 && N.unidadesDeCubos(N.normalizarMapa({}), 5) === 0, 'cubos ↔ unidades: um hexágono (40) = 5 cubos; sem grade, sem escala');

  // a grade dos mapas de antes, e os limites
  const velho = N.normalizarMapa({ escala: { kmPorUn: 0.5 } });
  ok(velho.grade.tam === 10 && velho.grade.on === false && !('escala' in velho) && N.cubosDe(velho, 200) === 100, 'mapa de antes, com a escala em km: ganha a grade da mesma escala (1 km = 1 cubo), escondida');
  const g2 = N.normalizarMapa({ grade: { tam: '1', x: 'a', y: 3, orient: 'torto', on: 'sim', alfa: 7 } }).grade;
  ok(j(g2) === j({ tam: 4, x: 0, y: 3, orient: 'pe', on: true, alfa: 1 }), 'grade com lixo: tamanho mínimo 4, orientação de pé, força até 1: ' + j(g2));

  // terrenos e hexágonos
  const t = N.normalizarMapa({
    terrenos: [{ id: 'fl', nome: 'Mata', cor: '#00ff00', custo: '12.5' }, { id: 'fl', nome: 'repetido' }, { id: 'id com espaço' }, { id: 'lava', nome: '', custo: -3 }, 7],
    hexes: { '1,0': 'fl', '2,0': ['lava', 30], '3,0': 'sumiu', '4,0': ['sumiu', 9], 'x,y': 'fl', '5,0': ['', 'abc'], '-1,2': ['fl', 0.04] },
  });
  ok(j(t.terrenos) === j([{ id: 'fl', nome: 'Mata', cor: '#00ff00', custo: 12.5 }, { id: 'lava', nome: 'Terreno', cor: '#9aa3b5', custo: 5 }]), 'terrenos: id válido e sem repetir, nome, cor e custo com padrões: ' + j(t.terrenos));
  ok(j(t.hexes) === j({ '1,0': 'fl', '2,0': ['lava', 30], '4,0': ['', 9], '-1,2': ['fl', 0.1] }), 'hexágonos: terreno que sumiu cai (o custo próprio fica), o que não diz nada sai: ' + j(t.hexes));
  ok(N.normalizarMapa({ terrenos: [] }).terrenos.length === 0 && N.normalizarMapa({ terrenos: [], hexes: { '1,1': 'fl' } }).hexes['1,1'] === undefined, 'uma lista vazia de terrenos é escolha do mestre (não volta aos padrões)');

  // o custo de cada hexágono: o próprio, o da região, o do terreno, os 5 de um hexágono sem nada
  const c = N.normalizarMapa({ grade: { tam: 40 }, hexes: { '1,0': 'fl', '2,0': ['fl', 7], '3,0': ['', 20], '5,0': 'mo' },
    objs: [{ id: 'charco', k: 'r', pts: [[150, -30], [260, -30], [260, 30], [150, 30]], custo: 12 }, { id: 'semcusto', k: 'r', pts: [[150, -30], [400, -30], [400, 30], [150, 30]] }] });
  const info = (q, r) => { const x = N.hexInfo(c, q, r); return [x.terreno ? x.terreno.id : null, x.custo, x.de]; };
  ok(j([info(1, 0), info(2, 0), info(3, 0), info(4, 0), info(5, 0), info(7, 0)]) === j([['fl', 10, 'terreno'], ['fl', 7, 'hex'], [null, 20, 'hex'], [null, 12, 'regiao'], ['mo', 12, 'regiao'], [null, 5, 'base']]),
    'custo do hexágono: o próprio > o da região (a de cima com custo) > o do terreno > 5: ' + j([info(1, 0), info(2, 0), info(3, 0), info(4, 0), info(5, 0), info(7, 0)]));
  // o custo próprio ganha também dentro de uma região com custo; de duas regiões com custo, uma sobre a outra, vale a de cima
  const c2 = N.normalizarMapa({ grade: { tam: 40 }, hexes: { '4,0': ['fl', 3] },
    objs: [{ id: 'baixo', k: 'r', pts: [[150, -30], [260, -30], [260, 30], [150, 30]], custo: 12 }, { id: 'cima', k: 'r', pts: [[230, -30], [400, -30], [400, 30], [230, 30]], custo: 30 }] });
  const info2 = q => { const x = N.hexInfo(c2, q, 0); return [x.custo, x.de, x.regiao ? x.regiao.id : null]; };
  ok(j([4, 5, 6, 7].map(info2)) === j([[3, 'hex', null], [12, 'regiao', 'baixo'], [30, 'regiao', 'cima'], [30, 'regiao', 'cima']]),
    'o custo próprio ganha da região; onde duas regiões com custo se cobrem, vale a de cima: ' + j([4, 5, 6, 7].map(info2)));
  ok(j(N.medirHex(c, [0, 0], [280, 0]).hexes) === '7' && N.medirHex(c, [0, 0], [280, 0]).cubos === 35 && N.medirHex(c, [0, 0], [280, 0]).terreno === 78 && N.medirHex(N.normalizarMapa({}), [0, 0], [9, 9]) === null,
    'medir: 7 hexágonos = 35 cubos em linha reta; pelo terreno, 78');

  // viagem de hexágono em hexágono
  const v = N.normalizarMapa({ grade: { tam: 40 }, cal: { dia: 3 }, hexes: { '3,0': 'mo', '4,0': 'fl' },
    objs: [{ id: 'rt', k: 't', pts: [[0, 0], [400, 0]] }, { id: 'g1', k: 'g', x: 0, y: 0, rota: 'rt', cubos: 20 }, { id: 'g2', k: 'g', x: 5, y: 5 }, { id: 'lento', k: 'g', x: 0, y: 0, rota: 'rt', cubos: 10 }] });
  const antes = j(v);
  const depois = (m, id, r) => N.normalizarMapa(Object.assign(N.copia(m), { objs: m.objs.map(o => (o.id === id ? Object.assign({}, o, { x: r.x, y: r.y, prog: r.prog }) : o)) }));
  const a = N.andarUmDia(v, 'g1');
  ok(a.ok && a.hexes === 2 && a.cubos === 20 && a.prog === 20 && a.x === 80 && a.y === 0 && !a.chegou && a.msg === 'Andou 2 hexágonos (20 cubos); faltam 8 hexágonos (45 cubos)',
    'um dia com 20 cubos: dois hexágonos de 5, e a montanha (15) não cabe no que sobra: ' + j(a));
  ok(j(v) === antes, 'andarUmDia não muda o mapa');
  const b = N.andarUmDia(depois(v, 'g1', a), 'g1');
  ok(b.ok && b.hexes === 3 && b.prog === 40 && b.x === 200 && b.msg === 'Andou 3 hexágonos (20 cubos); faltam 5 hexágonos (25 cubos)', 'no dia seguinte, o que sobrou rumo à montanha valeu: montanha, floresta e mais um: ' + j(b));
  let l = v;
  const dias = [];
  for (let d = 0; d < 3; d++) { const r = N.andarUmDia(l, 'lento'); dias.push([r.hexes, r.prog, r.x, r.msg]); l = depois(l, 'lento', r); }
  ok(j(dias) === j([[2, 10, 80, 'Andou 2 hexágonos (10 cubos); faltam 8 hexágonos (55 cubos)'], [0, 20, 80, 'Ainda no caminho do próximo hexágono (Montanha): 10 de 15 cubos'], [1, 30, 120, 'Andou 1 hexágono (10 cubos); faltam 7 hexágonos (35 cubos)']]),
    'andando 10 por dia, a montanha de 15 leva dois dias: ' + j(dias));
  const mexido = g => N.normalizarMapa(Object.assign(N.copia(v), { objs: v.objs.map(o => (o.id === 'g1' ? Object.assign({}, o, g) : o)) }));
  const arr = N.andarUmDia(mexido({ x: 200, y: 0, prog: 0 }), 'g1');
  ok(arr.ok && arr.x === 360 && arr.prog === 60, 'grupo arrastado pela rota: anda do hexágono onde está, não do começo: ' + j(arr));
  const viz = N.andarUmDia(mexido({ x: 100, y: 40, prog: 0 }), 'g1');
  ok(viz.ok && viz.x === 120 && viz.prog === 30, 'grupo no hexágono vizinho da rota: segue do mais perto dela: ' + j(viz));
  const fora = N.andarUmDia(mexido({ x: 900, y: 900, prog: 0 }), 'g1');
  ok(!fora.ok && fora.x === 900 && /fora da rota \(a \d+ hexágonos dela\)/.test(fora.msg), 'grupo longe da rota: não salta para ela: ' + fora.msg);
  const noFim = N.andarUmDia(mexido({ x: 400, y: 0, prog: 65 }), 'g1');
  ok(!noFim.ok && noFim.chegou && noFim.msg === 'Chegou ao fim da rota' && noFim.x === 400, 'já no fim: não anda');
  ok(N.andarUmDia(v, 'g2').msg === 'Sem rota' && !N.andarUmDia(v, 'g2').ok, 'sem rota: avisa');
  ok(N.andarUmDia(N.normalizarMapa(Object.assign(N.copia(v), { grade: { tam: 0 } })), 'g1').msg === 'Defina a grade de hexágonos do mapa primeiro (aba Terreno)', 'sem grade: avisa');
  ok(N.andarUmDia(v, 'nada').ok === false, 'grupo que não existe: não anda');
  const rit = N.normalizarMapa({ objs: [{ k: 'g', x: 0, y: 0, ritmo: 'rapido' }, { k: 'g', x: 0, y: 0, ritmo: 'voando' }, { k: 'g', x: 0, y: 0, cubos: '12.25' }] }).objs;
  ok(j(rit.map(g => [g.cubos, 'ritmo' in g])) === j([[40, false], [30, false], [12.3, false]]), 'grupo de antes: o ritmo vira cubos por dia (rápido = 40)');
}

/* ================= regiões e encontros ================= */
{
  const m = N.normalizarMapa({ objs: [
    { id: 'baixo', k: 'r', pts: [[0, 0], [100, 0], [100, 100], [0, 100]] },
    { id: 'cima', k: 'r', pts: [[40, 40], [60, 40], [60, 60], [40, 60]], enc: { chance: 30, itens: [{ p: 3, txt: 'Lobos famintos' }, { p: 1, txt: 'Mercador' }] } },
  ] });
  ok(N.regiaoEm(m, 50, 50).id === 'cima' && N.regiaoEm(m, 10, 10).id === 'baixo' && N.regiaoEm(m, 500, 500) === null, 'regiaoEm: a de cima que contém o ponto');
  const r = m.objs[1];
  const s1 = N.sortearEncontro(r, seq(0.10, 0.5));            // d100 = 11 ≤ 30; 0,5 × 4 = 2 → Lobos (peso 3)
  ok(s1.houve && s1.d100 === 11 && s1.chance === 30 && s1.item === 'Lobos famintos' && s1.peso === 3 && s1.total === 4, 'encontro sorteado pelo peso: ' + j(s1));
  const s2 = N.sortearEncontro(r, seq(0.10, 0.80));           // 0,8 × 4 = 3,2 → Mercador
  ok(s2.item === 'Mercador' && s2.peso === 1, 'o último resultado também sai');
  const s3 = N.sortearEncontro(r, seq(0.30, 0.0));            // d100 = 31 > 30
  ok(!s3.houve && s3.item === null && s3.d100 === 31, 'd100 acima da chance: nada acontece');
  const s4 = N.sortearEncontro(r, seq(0.999999));
  ok(s4.d100 === 100, 'd100 vai de 1 a 100');
  ok(N.sortearEncontro(null).houve === false && N.sortearEncontro({ enc: { chance: 100, itens: [] } }, seq(0)).item === null, 'sem tabela: houve sem item; sem região: nada');
}

/* ================= névoa ================= */
{
  const m = { nevoa: { on: true, ops: [{ t: '+', x: 0, y: 0, r: 50 }, { t: '-', x: 30, y: 0, r: 10 }] } };
  ok(N.nevoaCobre(m, 500, 500) === true, 'névoa ligada: tudo começa coberto');
  ok(N.nevoaCobre(m, 0, 0) === false && N.nevoaCobre(m, 0, 49) === false, 'revelar abre um círculo');
  ok(N.nevoaCobre(m, 30, 0) === true && N.nevoaCobre(m, 35, 0) === true, 'cobrir depois fecha de novo (a ordem conta)');
  ok(N.nevoaCobre({ nevoa: { on: true, ops: [{ t: '-', x: 30, y: 0, r: 10 }, { t: '+', x: 0, y: 0, r: 50 }] } }, 30, 0) === false, 'na ordem inversa, o revelar vence');
  ok(N.nevoaCobre({ nevoa: { on: false, ops: [] } }, 1, 1) === false && N.nevoaCobre({}, 1, 1) === false, 'névoa desligada não cobre nada');
}

/* ================= normalização com lixo ================= */
const SEGREDO_NEVOA = 'Acampamento dos cultistas';
{
  const lixos = [null, undefined, 42, 'texto', true, [], [1, 2], { objs: 'x' }, { objs: [null, 3, 'a', [], { k: 'zz' }] }, { faccoes: 'x', nevoa: [], cal: 5, escala: 'x', img: 7 }, { grade: [], terrenos: 7, hexes: [] }, { grade: 'x', terrenos: [null, { id: 'a' }], hexes: 'x' },
    { cal: { meses: [null, { nome: 5, dias: 'x' }] } }, { nevoa: { on: 'sim', ops: [null, { t: '+', x: 'a' }, { t: '+', x: 1, y: 1, r: -5 }, { t: '*', x: 1, y: 1, r: 5 }] } },
    { objs: [{ k: 'r', pts: 'x' }, { k: 'r', pts: [[1, 1], [2, 2]] }, { k: 't', pts: [[1, 1]] }, { k: 'f', pts: null }] }];
  let todos = true;
  for (const x of lixos) {
    if (!naoLanca(() => { const m = N.normalizarMapa(x); if (!m || m.v !== 1 || !Array.isArray(m.objs) || !Array.isArray(m.faccoes) || !m.cal.meses.length) throw new Error('inválido: ' + j(x)); })) todos = false;
  }
  ok(todos, 'normalizarMapa nunca lança e sempre devolve um mapa válido (null, número, texto, arrays no lugar de objetos…)');
  const armadilha = new Proxy({}, { get() { throw new Error('armadilha'); }, ownKeys() { throw new Error('armadilha'); } });
  ok(naoLanca(() => N.normalizarMapa(armadilha)) && N.normalizarMapa(armadilha).v === 1, 'nem com um objeto que lança ao ser lido');
  ok(naoLanca(() => N.normalizarMapa({ objs: [armadilha, { k: 'm', x: 1, y: 1 }] })), 'nem com um objeto que lança no meio da lista');

  const m = N.normalizarMapa({ id: 'mp_x', nome: 7, larg: '800', alt: 'NaN', grade: { tam: '25' }, cal: { dia: '12', ano0: '1023', meses: [{ nome: 'Um', dias: '12' }] },
    objs: [
      { id: 'a', k: 'm', x: '10', y: '20.5', ic: 'naoexiste', cor: 'vermelho', rumor: 'true' },
      { id: 'a', k: 'm', x: 1, y: 2 },                                             // id repetido
      { id: 'b', k: 'm', x: NaN, y: 2 },                                           // sem posição: sai
      { id: 'c', k: 'm', x: Infinity, y: 2 },
      { k: 'g', x: 1, y: 1, sigla: 'grupo', ritmo: 'voando', rota: 'nao-existe', prog: 50 },
      { id: 'e1', k: 'e', x: 0, y: 0, ini: '5', fim: '2', forca: 9, r: -3, tipo: 'nada' },
      { id: 'r1', k: 'r', pts: [[0, 0], ['10', 0], { x: 10, y: 10 }, [NaN, 1], 'x'], fac: 'fc_fantasma', enc: { chance: 250, itens: [{ p: 0, txt: 'Zero' }, 'x'] } },
      { id: '__proto__', k: 't', pts: [[0, 0], [1, 1]] },
      { id: 'f1', k: 'f', pts: [[0, 0], [1, 1]], a: 'fc_a', b: 'fc_fantasma', ativa: undefined },
    ],
    faccoes: [
      { id: 'fc_a', nome: 'A', cor: '#ABC', rel: { fc_b: 'guerra', fc_a: 'alianca', fc_fantasma: 'tensao' } },
      { id: 'fc_b', nome: 'B', rel: { fc_a: 'alianca', fc_c: 'tensao' } },
      { id: 'fc_c', nome: 'C', rel: { fc_a: 'bagunca' } },
      { id: 'fc_a', nome: 'A de novo' },
      [1, 2],
    ],
  });
  ok(m.nome === 'Mundo conhecido' || m.nome === '7', 'nome que não é texto não quebra');
  ok(m.larg === 800 && m.alt === 1400 && m.grade.tam === 25 && m.cal.dia === 12 && m.cal.ano0 === 1023 && m.cal.meses[0].dias === 12, 'números como texto viram números; NaN usa o padrão');
  const ids = m.objs.map(o => o.id);
  ok(new Set(ids).size === ids.length && ids[0] === 'a' && ids[1] === 'a_2', 'ids repetidos ganham um nome novo previsível: ' + ids.join(','));
  ok(!ids.includes('b') && !ids.includes('c'), 'objeto sem posição válida (NaN, infinito) sai');
  const a = m.objs[0];
  ok(a.x === 10 && a.y === 20.5 && a.ic === 'cidade' && a.cor === '' && a.rumor === true, 'marcador: números, ícone desconhecido, cor inválida, "true" como texto');
  const g = m.objs.find(o => o.k === 'g');
  ok(g.sigla === 'GRU' && g.cubos === 30 && !('ritmo' in g) && g.rota === null && g.prog === 0, 'grupo: sigla de até 3 letras, ritmo desconhecido (30 cubos por dia), rota que não existe vira null');
  const e = m.objs.find(o => o.id === 'e1');
  ok(e.ini === 5 && e.fim === 5 && e.forca === 3 && e.r === 1 && e.tipo === 'guerra', 'evento: fim antes do começo, força e raio no limite');
  const r = m.objs.find(o => o.id === 'r1');
  ok(r.pts.length === 3 && j(r.pts[1]) === '[10,0]' && r.fac === null && r.enc.chance === 100 && r.enc.itens.length === 1 && r.enc.itens[0].p === 1, 'região: pontos ruins saem, facção fantasma vira null, chance até 100, peso ≥ 1');
  ok(!ids.includes('__proto__') && m.objs.some(o => o.k === 't'), 'id perigoso é trocado (o objeto fica)');
  const f1 = m.objs.find(o => o.id === 'f1');
  ok(f1.a === 'fc_a' && f1.b === null && f1.ativa === true, 'frente: lado que não existe vira null; "ativa" padrão é sim');
  ok(m.faccoes.length === 4 && m.faccoes[0].cor === '#aabbcc' && m.faccoes[3].id === 'fc_a_2', 'facções: cor curta expandida; id repetido renomeado; lixo sai');
  const [A, B, C] = m.faccoes;
  ok(A.rel.fc_b === 'guerra' && B.rel.fc_a === 'guerra', 'relação simétrica: quando os lados discordam, vale o da facção que vem antes');
  ok(B.rel.fc_c === 'tensao' && C.rel.fc_b === 'tensao', 'relação de um lado só vale para os dois');
  ok(!('fc_a' in A.rel) && !('fc_fantasma' in A.rel) && !('fc_a' in C.rel), 'sem relação consigo mesma, com facção que não existe ou com valor inválido');

  // limites
  const muitos = N.normalizarMapa({ objs: Array.from({ length: 2100 }, (_, i) => ({ k: 'm', x: i, y: 0 })) });
  ok(muitos.objs.length === 2000, 'no máximo 2000 objetos');
  const longo = 'x'.repeat(5000) + 'fim';
  const t = N.normalizarMapa({ nome: longo, objs: [{ k: 'm', x: 1, y: 1, nome: longo, txt: longo, nota: longo }], faccoes: [{ nome: longo, nota: longo }] });
  ok(t.nome.length === 4000 && t.objs[0].txt.length === 4000 && t.objs[0].nota.length === 4000 && t.faccoes[0].nota.length === 4000, 'textos cortados em 4000 caracteres');
  const emoji = N.normalizarMapa({ objs: [{ k: 'm', x: 1, y: 1, txt: 'a'.repeat(3999) + '😀' }] }).objs[0].txt;
  ok(emoji.length === 3999 && !/[\ud800-\udbff]$/.test(emoji), 'o corte não deixa meio emoji');

  // névoa: limite de operações, sem abrir o que estava coberto
  const ops = [];
  for (let i = 0; i < 4500; i++) ops.push({ t: '+', x: (i % 100) * 10, y: Math.floor(i / 100) * 10, r: 8 });
  ops.push({ t: '-', x: 50, y: 50, r: 30 });
  const nev = N.normalizarMapa({ nevoa: { on: true, ops } });
  ok(nev.nevoa.ops.length <= 4000, 'no máximo 4000 operações de névoa: ' + nev.nevoa.ops.length);
  ok(N.nevoaCobre(nev, 5000, 5000) && N.nevoaCobre(nev, 50, 50) && !N.nevoaCobre(nev, 990, 440), 'depois de fundir: longe continua coberto, o último "cobrir" vale, o mais novo revelado segue aberto');
  const repetidas = Array.from({ length: 4100 }, (_, i) => ({ t: '+', x: 100, y: 100, r: 20 + (i % 2) }));
  const rep = N.normalizarMapa({ nevoa: { on: true, ops: repetidas } }).nevoa.ops;
  ok(rep.length <= 4000 && rep.every(o => o.r <= 21) && !N.nevoaCobre({ nevoa: { on: true, ops: rep } }, 100, 100), 'operações que outra posterior cobre por inteiro saem sem mudar o desenho');
  const enorme = Array.from({ length: 20000 }, (_, i) => ({ t: i % 2 ? '-' : '+', x: i * 50, y: 0, r: 10 }));
  const t0 = Date.now(), en = N.normalizarMapa({ nevoa: { on: true, ops: enorme } }).nevoa.ops;
  ok(en.length <= 4000 && Date.now() - t0 < 1500, 'mesmo com 20 mil operações, corta rápido (' + (Date.now() - t0) + ' ms)');
  ok(N.normalizarMapa({ nevoa: { on: true, ops: [{ t: '-', x: 1, y: 1, r: 5 }, { t: '+', x: 1, y: 1, r: 5 }] } }).nevoa.ops.length === 1, 'cobrir antes de qualquer revelação sai (não muda nada)');
  // a regra de ouro do enxugamento: o que estava coberto continua coberto (senão o que a névoa escondia vaza)
  {
    const cru = (lista, x, y) => { for (let i = lista.length - 1; i >= 0; i--) { const o = lista[i]; if ((x - o.x) ** 2 + (y - o.y) ** 2 <= o.r * o.r) return o.t === '-'; } return true; };
    let sem = 11; const rnd = () => (sem = (sem * 16807) % 2147483647) / 2147483647;
    let abriu = 0, cobertos = 0;
    for (const [larg, cobre] of [[2000, 0.1], [2000, 0.5], [30000, 0.2]]) {
      const tracos = [];
      while (tracos.length < 4600) {
        const t = rnd() < cobre ? '-' : '+', x0 = rnd() * larg, y0 = rnd() * larg * 0.7, r = Math.round(20 + rnd() * 80);
        for (let k = 0; k < 30; k++) tracos.push({ t, x: Math.round(x0 + k * r / 2), y: Math.round(y0 + k * 2), r });
      }
      const en = N.normalizarMapa({ nevoa: { on: true, ops: tracos } });
      // pontos em toda parte e, principalmente, rentes à borda de cada pincelada (onde uma fusão gulosa abriria)
      const pontos = [];
      for (let x = 0; x < larg; x += larg / 100) for (let y = 0; y < larg * 0.7; y += larg / 100) pontos.push([x, y]);
      tracos.forEach((o, i) => { if (i % 2) for (const [dx, dy] of [[0, 1.06], [0.25, -1.02]]) pontos.push([o.x + dx * o.r, o.y + dy * o.r]); });
      for (const [x, y] of pontos) if (cru(tracos, x, y)) { cobertos++; if (!N.nevoaCobre(en, x, y)) abriu++; }
    }
    ok(cobertos > 1000 && abriu === 0, 'acima de 4000 operações: todo ponto coberto continua coberto depois de enxugar (' + abriu + ' de ' + cobertos + ' abriram)');
    // o caso do traço antigo: um marcador logo além dele, coberto, não pode ir para a projeção quando a névoa enxuga
    const velhas = [];
    for (let i = 0; i < 40; i++) velhas.push({ t: '+', x: 100 + i * 30, y: 200, r: 60 });
    for (let i = 0; velhas.length < 4000; i++) velhas.push({ t: '+', x: 100 + (i % 60) * 30, y: 700 + Math.floor(i / 60) * 8, r: 60 });
    const mapa = N.normalizarMapa({ larg: 2000, alt: 1400, nevoa: { on: true, ops: velhas.concat([{ t: '+', x: 1900, y: 1300, r: 60 }]) }, objs: [{ id: 'acamp', k: 'm', x: 115, y: 268, nome: SEGREDO_NEVOA }] });
    ok(mapa.nevoa.ops.length <= 4000 && N.nevoaCobre(mapa, 115, 268) && !j(N.projetar(mapa)).includes(SEGREDO_NEVOA), 'enxugar a névoa não revela o marcador logo além de um traço antigo');
  }

  // idempotente e previsível
  const duas = N.normalizarMapa(m);
  ok(j(duas) === j(m) && j(N.normalizarMapa(nev)) === j(nev), 'normalizar de novo não muda nada');
  const semId = { objs: [{ k: 'm', x: 1, y: 1 }] };
  ok(N.normalizarMapa(semId).objs[0].id === N.normalizarMapa(semId).objs[0].id, 'objeto sem id ganha um id previsível');
  const img = N.normalizarMapa({ img: { url: 'javascript:alert(1)', w: 10, h: 10 } });
  ok(img.img === null && N.normalizarMapa({ img: { url: 'idb:img_1', w: '300', h: 200 } }).larg === 300, 'imagem só com endereço https ou idb; o tamanho do mundo segue a imagem');
}

/* ================= projeção pública ================= */
const SEG = 'SEGREDO';
function mundo() {
  return N.normalizarMapa({
    id: 'mp_p', nome: 'Mundo', oculto: true, escala: { kmPorUn: 1 }, cal: { dia: 10 },
    nevoa: { on: false, ops: [] },
    faccoes: [
      { id: 'fc_rei', nome: 'Reino', nota: SEG + ' nota da facção', txt: 'público', rel: { fc_culto: 'guerra', fc_gui: 'alianca' } },
      { id: 'fc_culto', nome: SEG + ' Culto', oculta: true, rel: {} },
      { id: 'fc_gui', nome: 'Guilda', rel: {} },
      { id: 'fc_lixo', nome: SEG + ' seita', oculta: 'sim' },                      // "esconder" vindo como texto
    ],
    objs: [
      { id: 'm_ok', k: 'm', x: 100, y: 100, nome: 'Porto Azul', txt: 'cidade grande', nota: SEG + ' nota do marcador' },
      { id: 'm_esc', k: 'm', x: 200, y: 200, nome: SEG + ' covil', oculto: true },
      { id: 'm_lixo', k: 'm', x: 210, y: 210, nome: SEG + ' esconderijo', oculto: 'true' },
      { id: 'm_boato', k: 'm', x: 300, y: 300, nome: 'Torre', rumor: true, falso: true },
      { id: 'r_rei', k: 'r', pts: [[0, 0], [50, 0], [50, 50]], fac: 'fc_rei', enc: { chance: 40, itens: [{ p: 1, txt: SEG + ' emboscada' }] } },
      { id: 'r_culto', k: 'r', pts: [[0, 0], [60, 0], [60, 60]], fac: 'fc_culto' },
      { id: 'f_ab', k: 'f', pts: [[0, 0], [9, 9]], a: 'fc_rei', b: 'fc_culto' },
      { id: 'e_hoje', k: 'e', x: 500, y: 500, ini: 5, fim: 15 },
      { id: 'e_futuro', k: 'e', x: 500, y: 500, ini: 11, nome: SEG + ' invasão' },
      { id: 'e_passou', k: 'e', x: 500, y: 500, ini: 1, fim: 9, nome: SEG + ' antiga' },
      { id: 't_esc', k: 't', pts: [[0, 0], [10, 0]], oculto: true, nome: SEG + ' passagem' },
      { id: 'g_jog', k: 'g', x: 5, y: 5, rota: 't_esc', prog: 3, nota: SEG + ' nota do grupo' },
      { id: 't_ok', k: 't', pts: [[0, 0], [20, 0]] },
      { id: 'g_ok', k: 'g', x: 5, y: 5, rota: 't_ok', prog: 4 },
    ],
  });
}
{
  const M = mundo(), antes = j(M);
  const P = N.projetar(M), J = j(P);
  const ob = id => P.objs.find(o => o.id === id);
  ok(j(M) === antes, 'projetar não mexe no mapa do mestre');
  ok(!J.includes(SEG), 'nada marcado como segredo aparece no que os jogadores recebem');
  // regra 1
  ok(ob('m_ok') && ob('m_ok').nota === '' && ob('m_ok').txt === 'cidade grande' && ob('g_ok').nota === '', 'regra 1: a nota sai de todo objeto (o texto público fica)');
  ok(P.faccoes.every(f => f.nota === '') && P.faccoes.find(f => f.id === 'fc_rei').txt === 'público', 'regra 1: a nota sai de toda facção');
  ok(P.oculto !== true, 'regra 1: o "escondido" do mapa não vai junto');
  // regra 2
  ok(!ob('m_esc') && !ob('t_esc'), 'regra 2: objetos escondidos saem');
  ok(!ob('m_lixo') && !P.faccoes.some(f => f.id === 'fc_lixo'), 'regra 2: "esconder" que chega como texto ou número também esconde (na dúvida, esconde)');
  ok(!P.faccoes.some(f => f.id === 'fc_culto') && P.faccoes.length === 2, 'regra 2: facções escondidas saem');
  ok(!('fc_culto' in P.faccoes.find(f => f.id === 'fc_rei').rel) && P.faccoes.find(f => f.id === 'fc_rei').rel.fc_gui === 'alianca', 'regra 2: as relações com a facção escondida saem (as outras ficam)');
  ok(ob('r_culto') && ob('r_culto').fac === null && ob('r_rei').fac === 'fc_rei', 'regra 2: região da facção escondida fica sem facção');
  ok(ob('f_ab').a === 'fc_rei' && ob('f_ab').b === null, 'regra 2: frente com um lado escondido fica com esse lado vazio');
  // regra 3
  ok(ob('m_boato').rumor === true && ob('m_boato').falso !== true, 'regra 3: o boato vai como boato, sem dizer que é falso');
  ok(!ob('r_rei').enc || (ob('r_rei').enc.chance === 0 && ob('r_rei').enc.itens.length === 0), 'regra 3: a tabela de encontros não vai');
  // regra 4
  ok(ob('e_hoje') && !ob('e_futuro') && !ob('e_passou'), 'regra 4: só os eventos ativos hoje (futuros e terminados saem)');
  {
    const praga = N.projetar(N.normalizarMapa({ cal: { dia: 10 }, objs: [{ id: 'pr', k: 'e', x: 0, y: 0, r: 120, ini: 8, fim: 40, cresce: -3 }] })).objs[0];
    ok(praga && praga.r === 114 && praga.fim === null && praga.cresce === 0 && praga.ini === 8, 'regra 4: o evento vai como está hoje (raio de hoje), sem o fim planejado nem o crescimento: ' + j(praga));
  }
  // regra 6
  ok(ob('g_jog') && ob('g_jog').rota === null && ob('g_ok').rota === 't_ok' && ob('g_ok').prog === 4, 'regra 6: grupo fica; rota que não foi junto vira null');
  // regra 7
  ok(j(N.projetar(M)) === J && j(N.projetar(N.copia(M))) === J, 'regra 7: mesma entrada, mesmo JSON');
  ok(j(N.normalizarMapa(P)) === J, 'regra 7: o resultado já é um mapa normalizado');
  ok(j(N.projetar(P)) === J, 'projetar o que já foi projetado não muda nada');
}
{
  // regra 5: névoa
  const M = N.normalizarMapa({
    cal: { dia: 0 }, nevoa: { on: true, ops: [{ t: '+', x: 0, y: 0, r: 100 }] },
    objs: [
      { id: 'm_vis', k: 'm', x: 10, y: 10 },
      { id: 'm_cob', k: 'm', x: 500, y: 500, nome: SEG },
      { id: 'e_vis', k: 'e', x: 20, y: 20, ini: 0 },
      { id: 'e_cob', k: 'e', x: 500, y: 500, ini: 0, nome: SEG },
      { id: 'r_meio', k: 'r', pts: [[50, 50], [500, 50], [500, 500]] },
      { id: 'r_cob', k: 'r', pts: [[400, 400], [500, 400], [500, 500]], nome: SEG },
      { id: 't_meio', k: 't', pts: [[0, 0], [600, 0]] },
      { id: 't_cob', k: 't', pts: [[400, 0], [600, 0]], nome: SEG },
      { id: 'f_meio', k: 'f', pts: [[0, 0], [600, 600]] },
      { id: 'f_cob', k: 'f', pts: [[400, 400], [600, 600]], nome: SEG },
      { id: 'g_cob', k: 'g', x: 900, y: 900 },
    ],
  });
  const P = N.projetar(M), tem = id => P.objs.some(o => o.id === id);
  ok(tem('m_vis') && !tem('m_cob'), 'regra 5: marcador coberto pela névoa sai');
  ok(tem('e_vis') && !tem('e_cob'), 'regra 5: evento coberto pela névoa sai');
  ok(tem('r_meio') && !tem('r_cob'), 'regra 5: região sai só com todos os pontos cobertos');
  ok(tem('t_meio') && !tem('t_cob'), 'regra 5: rota sai só com todos os pontos cobertos');
  ok(tem('f_meio') && !tem('f_cob'), 'regra 5: frente sai só com todos os pontos cobertos');
  ok(tem('g_cob'), 'regra 5: grupo nunca sai pela névoa');
  ok(!j(P).includes(SEG), 'nada coberto pela névoa vaza');
  ok(P.nevoa.on === true && P.nevoa.ops.length === 1, 'a névoa vai junto (os jogadores a veem fechada)');
  const desl = N.projetar(Object.assign(N.copia(M), { nevoa: { on: false, ops: [] } }));
  ok(desl.objs.length === M.objs.length, 'névoa desligada não tira nada');
}

/* ================= projeção: o terreno dos hexágonos ================= */
{
  const M = N.normalizarMapa({ grade: { tam: 40 }, hexes: { '0,0': 'fl', '5,0': ['mo', 30], '10,0': 'ag', '12,0': ['', 9] },
    nevoa: { on: true, ops: [{ t: '+', x: 0, y: 0, r: 250 }] }, objs: [{ id: 'r', k: 'r', pts: [[0, 0], [50, 0], [50, 50]], custo: 12 }] });
  const P = N.projetar(M);
  ok(j(P.hexes) === j({ '0,0': 'fl', '5,0': 'mo' }) && P.objs[0].custo === null && j(P.grade) === j(M.grade) && j(P.terrenos) === j(M.terrenos),
    'projeção: o terreno dos hexágonos cobertos pela névoa não vai; o custo próprio do hexágono e o da região são só do mestre; a grade e os tipos de terreno vão: ' + j(P.hexes));
  const sem = N.projetar(Object.assign(N.copia(M), { nevoa: { on: false, ops: [] } }));
  ok(j(sem.hexes) === j({ '0,0': 'fl', '5,0': 'mo', '10,0': 'ag' }), 'sem névoa vai todo o terreno (sem os custos próprios)');
}

/* ================= troca de imagem: tudo acompanha ================= */
{
  const M = N.normalizarMapa({ larg: 1000, alt: 500, grade: { tam: 20, x: 10, y: 6 }, hexes: { '1,0': 'fl' }, nevoa: { on: true, ops: [{ t: '+', x: 100, y: 100, r: 10 }] },
    objs: [{ id: 'a', k: 'm', x: 100, y: 50 }, { id: 'e', k: 'e', x: 10, y: 10, r: 20, ini: 0 }, { id: 't', k: 't', pts: [[0, 0], [100, 0]] }] });
  const E = N.escalarMapa(M, 2, 2);
  ok(E.objs[0].x === 200 && E.objs[0].y === 100 && E.objs[1].r === 40 && j(E.objs[2].pts) === '[[0,0],[200,0]]', 'escalar: posições, raios e linhas acompanham');
  ok(E.grade.tam === 40 && E.grade.x === 20 && E.grade.y === 12 && N.cubosDe(E, N.compPolilinha(E.objs[2].pts)) === N.cubosDe(M, N.compPolilinha(M.objs[2].pts)) && j(E.hexes) === j(M.hexes),
    'escalar: a grade acompanha (os hexágonos ficam nos mesmos lugares, com o mesmo terreno) e as distâncias em cubos continuam as mesmas');
  ok(E.nevoa.ops[0].x === 200 && E.nevoa.ops[0].r === 20 && E.larg === 2000, 'escalar: a névoa e o papel acompanham');
  ok(j(N.escalarMapa(M, 1, 1)) === j(M), 'escala 1: nada muda');
}

/* ================= atalhos dos marcadores (cena, outro mapa, acampamento) ================= */
{
  const M = N.normalizarMapa({ objs: [
    { id: 'a', k: 'm', x: 1, y: 1, liga: { t: 'acampamento', id: 'x', lixo: 1 } },
    { id: 'b', k: 'm', x: 2, y: 2, liga: { t: 'cena', id: 'cena_1', nome: 'Emboscada na ponte' } },
    { id: 'c', k: 'm', x: 3, y: 3, liga: { t: 'mapa', id: 'mp_2', nome: 'Capital' } },
    { id: 'd', k: 'm', x: 4, y: 4, liga: { t: 'cena', id: '../x' } }, { id: 'e', k: 'm', x: 5, y: 5, liga: { t: 'site', id: 'x' } }, { id: 'f', k: 'm', x: 6, y: 6, liga: 'acampamento' },
    { id: 'g', k: 'g', x: 7, y: 7, liga: { t: 'acampamento' } }] });
  ok(j(M.objs.map(o => o.liga)) === j([{ t: 'acampamento' }, { t: 'cena', id: 'cena_1', nome: 'Emboscada na ponte' }, { t: 'mapa', id: 'mp_2', nome: 'Capital' }, null, null, null, undefined]),
    'atalho: acampamento, cena e mapa valem; id estranho, tipo desconhecido e texto solto saem; só o marcador tem atalho — ' + j(M.objs.map(o => o.liga)));
  ok(j(N.normalizarMapa(M)) === j(M), 'atalho: normalizar de novo dá no mesmo');
  ok(N.objNovo('m', { x: 0, y: 0 }).liga === null, 'marcador novo nasce sem atalho');
  const P = N.projetar(M);
  ok(j(P.objs.filter(o => o.k === 'm').map(o => o.liga && o.liga.t)) === j(['acampamento', 'cena', 'mapa', null, null, null]), 'atalho: vai junto na projeção dos jogadores (quem esconde o que não pode aparecer é o aplicativo, que conhece os outros mapas)');
}

end();
