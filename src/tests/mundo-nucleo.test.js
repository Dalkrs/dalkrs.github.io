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
// (lote 7, parte 5a) os 24 novos, cada um com o nome, a cor, o desenho e o peso de começo
const EVS5 = ['caravana', 'peregrinacao', 'bandidos', 'ponte', 'migracao', 'eclipse', 'meteoros', 'luaSangue', 'tribulacao', 'seca', 'terremoto', 'erupcao', 'inverno', 'torneio', 'coroacao', 'golpe', 'cerco', 'leilao', 'assombracao', 'reino', 'dragao', 'seita', 'cacada', 'colheita'];
ok(j(Object.keys(N.EVENTOS)) === j(EVS.concat(EVS5)) && EVS5.every(k => N.EVENTOS[k].nome && /^#[0-9a-f]{6}$/.test(N.EVENTOS[k].cor) && /<(path|circle)/.test(N.EVENTOS[k].svg)), 'os 24 eventos novos, depois dos 12 de antes, com o nome, a cor e o desenho');
ok(Object.keys(N.EVENTOS).every(k => N.PESO_EVENTO[k] && typeof N.PESO_EVENTO[k].fecha === 'boolean') && j(Object.keys(N.EVENTOS).filter(k => N.PESO_EVENTO[k].fecha)) === j(['ponte', 'terremoto', 'cerco']), 'todo tipo tem o peso de começo; fecham a passagem a ponte caída, o terremoto e o cerco');
ok(N.CORES.length === 10 && N.CORES.every(c => /^#[0-9a-f]{6}$/.test(c)) && new Set(N.CORES).size === 10, '10 cores de facção, todas diferentes');
ok(N.RITMOS === undefined && N.CUBOS_HEX === 5 && N.CUBOS_DIA === 30, 'sem ritmos: o grupo anda os cubos por dia dele (30 de começo); um hexágono = 5 cubos');
ok(j(Object.keys(N.VIAS)) === j(['estrada', 'trilha', 'selvagem', 'rio', 'mar']) && Object.values(N.VIAS).every(v => v.nome && v.mult === undefined) && N.VIAS.mar.nome === 'Mar (navio)', 'vias: só o desenho da rota (não mudam a velocidade)');
ok(j(N.TERRENOS_PADRAO.map(t => [t.id, t.nome, t.custo])) === j([['pl', 'Planície', 5], ['fl', 'Floresta', 10], ['co', 'Colina', 8], ['mo', 'Montanha', 15], ['pa', 'Pântano', 15], ['de', 'Deserto', 10], ['ne', 'Neve', 15], ['ag', 'Água', 10],
  ['la', 'Lavoura', 6], ['ru', 'Ruínas', 8], ['lv', 'Lava', 30], ['cr', 'Cristais', 12], ['se', 'Selva', 15], ['sv', 'Savana', 6], ['tu', 'Tundra', 10], ['tc', 'Terra corrompida', 12],
  ['ar', 'Água rasa', 8], ['md', 'Mar profundo', 15], ['df', 'Desfiladeiro', 15], ['gl', 'Geleira', 20], ['fm', 'Floresta morta', 10], ['oa', 'Oásis', 5], ['ch', 'Charneca', 8], ['td', 'Terra devastada', 8],
  ['ri', 'Rio', 10], ['et', 'Estrada de terra', 4], ['ep', 'Estrada de pedra', 3], ['ev', 'Estrada pavimentada', 2], ['lg', 'Lago', 10]])
  && N.TERRENOS_PADRAO.every(t => /^#[0-9a-f]{6}$/.test(t.cor)) && j(N.TERRENOS_NOVOS.map(t => t.id)) === j(['la', 'ru', 'lv', 'cr', 'se', 'sv', 'tu', 'tc']),
  'os tipos de terreno de começo (os oito de antes, os oito novos do lote 6, os oito do lote 17 e, no lote 54, o rio e as três estradas; no 57, o lago), com custo em cubos por hexágono');
ok(j(N.RELACOES) === j({ alianca: 'Aliança', neutra: 'Neutra', tensao: 'Tensão', guerra: 'Guerra' }), 'relações como no contrato');
ok(N.CAL_PADRAO.meses.length === 12 && N.CAL_PADRAO.meses.every(m => m.dias === 30 && m.nome) && N.CAL_PADRAO.ano0 === 1 && N.CAL_PADRAO.era === '', 'calendário padrão: 12 meses de 30 dias');

/* ================= criação ================= */
{
  const a = N.novoId('mp'), b = N.novoId('mp');
  ok(/^mp_[a-z0-9]+$/.test(a) && a !== b, 'novoId: prefixo e sem repetir (' + a + ')');
  const m = N.mapaNovo('Terra Média');
  ok(m.v === 1 && /^mp_/.test(m.id) && m.nome === 'Terra Média' && m.oculto === false && m.img === null && m.larg === 2000 && m.alt === 1400, 'mapaNovo: padrões do contrato');
  ok(j(m.grade) === j({ tam: 0, x: 0, y: 0, orient: 'pe', on: false, alfa: 0.35, des: true }) && !('escala' in m) && m.cal.dia === 0 && m.cal.meses.length === 12 && m.nevoa.on === false && m.nevoa.ops.length === 0 && m.faccoes.length === 0 && m.objs.length === 0, 'mapaNovo: sem grade (sem escala), calendário, névoa e listas vazias');
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
  // (lote 7) os dias da semana: o mestre diz que dia é hoje, e o resto segue
  const cs = Object.assign({}, cal, { sem0: N.sem0Para(41, 2) });
  ok(cs.sem0 === 3 && N.diaDaSemana(cs, 41) === 'Quarta-Feira' && N.diaDaSemana(cs, 42) === 'Quinta-Feira' && N.diaDaSemana(cs, 40) === 'Terça-Feira' && N.diaDaSemana(cs, 41 + 7) === 'Quarta-Feira',
    'hoje (dia 41) é Quarta-Feira: amanhã, Quinta; ontem, Terça; daqui a 7 dias, Quarta de novo');
  ok(N.diaDaSemana(cs, 46) === 'Segunda-Feira' && N.semanaDe(cs, 45) === 6 && N.SEMANA.length === 7 && N.SEMANA[6] === 'Domingo', 'depois de Domingo, Segunda-Feira');
  ok(N.textoDataSemana(cs, 41) === 'Quarta-Feira, 12 de Degelo, ano 1' && N.textoDataSemana(cal, 41) === '12 de Degelo, ano 1' && N.diaDaSemana(cal, 41) === '' && N.semanaDe(cal, 41) === -1,
    'com a semana, "Quarta-Feira, 12 de Degelo, ano 1"; sem ela (o mapa de antes), só a data');
  ok(N.sem0Para(0, 0) === 0 && N.sem0Para(5, 0) === 2 && N.sem0Para(3, -1) === null && N.sem0Para(3, 7) === null && N.sem0Para(3, 1.5) === null, 'o sem0 para cada escolha (fora de 0 a 6: sem a semana)');
  ok(N.normalizarMapa({ cal: { sem0: 4 } }).cal.sem0 === 4 && N.normalizarMapa({ cal: { sem0: 9 } }).cal.sem0 === null && N.normalizarMapa({}).cal.sem0 === null && N.normalizarMapa({ cal: { sem0: '2' } }).cal.sem0 === null,
    'o mapa guarda o sem0 de 0 a 6 (o resto vira sem a semana)');
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
  ok(j(g2) === j({ tam: 4, x: 0, y: 3, orient: 'pe', on: true, alfa: 1, des: true }), 'grade com lixo: tamanho mínimo 4, orientação de pé, força até 1: ' + j(g2));

  // terrenos e hexágonos
  const t = N.normalizarMapa({
    terrenos: [{ id: 'fl', nome: 'Mata', cor: '#00ff00', custo: '12.5' }, { id: 'fl', nome: 'repetido' }, { id: 'id com espaço' }, { id: 'lava', nome: '', custo: -3 }, 7],
    hexes: { '1,0': 'fl', '2,0': ['lava', 30], '3,0': 'sumiu', '4,0': ['sumiu', 9], 'x,y': 'fl', '5,0': ['', 'abc'], '-1,2': ['fl', 0.04] },
  });
  ok(j(t.terrenos) === j([{ id: 'fl', nome: 'Mata', cor: '#00ff00', custo: 12.5, tex: 'arvores' }, { id: 'lava', nome: 'Terreno', cor: '#9aa3b5', custo: 5, tex: 'liso' }]), 'terrenos: id válido e sem repetir, nome, cor, custo e textura com padrões (a de um terreno de começo, pelo id): ' + j(t.terrenos));
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

/* ================= o desenho: carimbos, textos, linhas, zonas de guerra e o terreno à mão ================= */
{
  // catálogos
  ok(Object.keys(N.CARIMBOS).length >= 12 && Object.values(N.CARIMBOS).every(c => c.nome && /^#[0-9a-f]{6}$/.test(c.cor) && /^<path/.test(c.svg) && !/<script|on\w+=|href/i.test(c.svg)),
    'carimbos: pelo menos 12, com nome, cor e desenho (só path, nada executável)');
  ok(j(Object.keys(N.LINHAS)) === j(['rio', 'estrada', 'trilha']) && Object.keys(N.FONTES).length === 3 && Object.keys(N.TEXTURAS).length === 31 && N.TERRENOS_PADRAO.every(t => N.TEXTURAS[t.tex]),
    'linhas (rio, estrada, trilha), três letras para os textos, as texturas (lote 57: 31) — e cada terreno de começo com a sua');

  // objetos novos
  const M0 = N.normalizarMapa({ cal: { dia: 12 }, faccoes: [{ id: 'fa', nome: 'Norte' }, { id: 'fb', nome: 'Sul' }], objs: [
    { id: 'z1', k: 'z', pts: [[0, 0], [100, 0], [100, 100]], a: 'fa', b: 'nao-existe', fim: 3,
      fases: [{ dia: 20, pts: [[0, 0], [50, 0], [50, 50]] }, { dia: 15, pts: [[0, 0], [9, 0], [9, 9]] }, { dia: 20, pts: [[0, 0], [60, 0], [60, 60]] }, { dia: 'x', pts: [[0, 0], [1, 1], [2, 0]] }, { dia: 30, pts: [[0, 0], [1, 1]] }] },
    { id: 'l1', k: 'l', pts: [[0, 0], [10, 10]], estilo: 'canal', larg: -4 }, { k: 'l', pts: [[0, 0]] },
    { id: 'c1', k: 'c', x: 5, y: 6, ic: 'dragao', tam: 0, vira: 'sim', cor: 'azul' },
    { id: 'x1', k: 'x', x: 7, y: 8, nome: 'Mar das Brumas', fonte: 'gotica', rot: 400, esp: 3, tam: 'abc' }] });
  const [z1, l1, c1, x1] = M0.objs;
  ok(M0.objs.length === 4 && z1.ini === 12 && z1.fim === 12 && z1.a === 'fa' && z1.b === null && j(z1.fases.map(f => f.dia)) === '[15,20]' && j(z1.fases[1].pts) === '[[0,0],[60,0],[60,60]]',
    'zona: começa hoje ao entrar no mapa, o fim não vem antes do começo, facção que não existe sai, fases em ordem (a do mesmo dia: a de depois; sem dia ou com menos de 3 pontos, fora): ' + j(z1));
  ok(l1.estilo === 'rio' && l1.larg === 0.5 && l1.cor === '' && c1.ic === 'arvore' && c1.tam === 1 && c1.vira === true && c1.cor === '' && x1.fonte === 'mapa' && x1.rot === 180 && x1.esp === 1 && x1.tam === 28 && x1.nome === 'Mar das Brumas',
    'linha (desenho desconhecido vira rio; largura mínima), carimbo (desenho desconhecido vira árvore), texto (letra desconhecida, giro e espaço no limite): ' + j([l1, c1, x1]));
  ok(N.objNovo('z').ini === null && N.objNovo('c').ic === 'arvore' && N.objNovo('x').fonte === 'mapa' && N.objNovo('l').estilo === 'rio' && /^zg_/.test(N.objNovo('z').id) && /^tx_/.test(N.objNovo('x').id),
    'objetos novos com os padrões (a zona sem começo: começa no dia em que entra no mapa)');
  ok(j(N.normalizarMapa(M0)) === j(M0), 'normalizar de novo dá no mesmo');

  // a forma da zona no dia
  ok(N.faseNoDia(z1, 14) === -1 && j(N.formaNoDia(z1, 14)) === j(z1.pts) && N.faseNoDia(z1, 15) === 0 && j(N.formaNoDia(z1, 19)) === '[[0,0],[9,0],[9,9]]' && j(N.formaNoDia(z1, 99)) === '[[0,0],[60,0],[60,60]]',
    'zona: antes da primeira fase, a forma de partida; depois, a da última fase que já começou');
  ok(N.zonaAtiva({ ini: 5, fim: 8 }, 5) && N.zonaAtiva({ ini: 5, fim: 8 }, 8) && !N.zonaAtiva({ ini: 5, fim: 8 }, 9) && !N.zonaAtiva({ ini: 5, fim: null }, 4) && N.zonaAtiva({ ini: 5, fim: null }, 1e6),
    'zona ativa: do dia do começo ao dia do fim (sem fim: para sempre)');

  // a linha suave e o rio
  const pts = [[0, 0], [100, 40], [200, 0], [300, 60]], sv = N.suavizar(pts, 10);
  ok(j(sv[0]) === '[0,0]' && j(sv[sv.length - 1]) === '[300,60]' && sv.length > 20 && pts.every(p => sv.some(q => perto(q[0], p[0], 1e-9) && perto(q[1], p[1], 1e-9))) && j(N.suavizar([[1, 2], [3, 4]], 5)) === '[[1,2],[3,4]]',
    'a linha suave passa por todos os pontos, do começo ao fim (com dois pontos, fica reta)');
  let curva = 0;
  for (let i = 2; i < sv.length; i++) {
    const a1 = Math.atan2(sv[i - 1][1] - sv[i - 2][1], sv[i - 1][0] - sv[i - 2][0]), a2 = Math.atan2(sv[i][1] - sv[i - 1][1], sv[i][0] - sv[i - 1][0]);
    curva = Math.max(curva, Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1))) * 180 / Math.PI);
  }
  ok(curva < 15, 'e é suave: nos cantos do zigue-zague, a direção vira aos poucos (no máximo ' + curva.toFixed(1) + '° de um trecho ao outro)');
  const rio = N.contornoRio([[0, 0], [400, 0]], 20, 'rio-a'), meio = rio.length / 2;
  const larg = i => Math.hypot(rio[i][0] - rio[rio.length - 1 - i][0], rio[i][1] - rio[rio.length - 1 - i][1]);
  ok(rio.length % 2 === 0 && larg(0) < 6 && larg(meio - 1) > 15 && larg(meio - 1) < 25 && j(N.contornoRio([[0, 0], [400, 0]], 20, 'rio-a')) === j(rio) && j(N.contornoRio([[0, 0], [400, 0]], 20, 'rio-b')) !== j(rio),
    'o rio engrossa da nascente (um quinto da largura) à foz (a largura), com a ondulação sempre igual para o mesmo rio (e outra para outro): ' + [larg(0), larg(meio - 1)].map(v => v.toFixed(1)));

  // o terreno à mão
  const base = { grade: { tam: 40 }, terrenos: [{ id: 'fl', nome: 'Floresta', custo: 10 }, { id: 'mo', nome: 'Montanha', custo: 15 }] };
  const T = N.normalizarMapa(Object.assign({}, base, { pintura: { alfa: 7, ops: [
    { t: '', r: 30, pts: [[0, 0]] },                                     // borracha antes de qualquer tinta: sai
    { t: 'fl', r: 25, pts: [[0, 0], [160.4, 0.6]] },                     // floresta do hexágono 0 ao 4
    { t: 'lava', r: 30, pts: [[0, 0]] },                                 // terreno que não existe: sai
    { t: '', r: 10, pts: [[80, 0]] },                                    // borracha no hexágono 2
    { t: 'mo', r: 10, pts: [[40, 0]] },                                  // montanha por cima do hexágono 1
    { t: 'fl', r: -1, pts: [[0, 0]] }, { t: 'fl', r: 5, pts: [] }, 'lixo'] } }));
  ok(T.pintura.alfa === 1 && j(T.pintura.ops) === j([{ t: 'fl', r: 25, pts: [[0, 0], [160, 1]] }, { t: '', r: 10, pts: [[80, 0]] }, { t: 'mo', r: 10, pts: [[40, 0]] }]),
    'desenho à mão: borracha no começo, terreno que não existe, raio inválido e linha vazia saem; pontos inteiros; força até 1: ' + j(T.pintura));
  const tp = N.terrenoPintado(T);
  ok(j([...tp].sort()) === j([['0,0', 'fl'], ['1,0', 'mo'], ['3,0', 'fl'], ['4,0', 'fl']]) && N.terrenoPintado(T) === tp && N.terrenoPintado(N.normalizarMapa(base)).size === 0,
    'o terreno de cada hexágono vem do desenho: a última pincelada que cobre o centro vale (a borracha tira); guardado por mapa: ' + j([...tp]));
  const T2 = N.normalizarMapa(Object.assign({}, T, { hexes: { '0,0': 'mo', '1,0': '-', '3,0': ['', 3], '4,0': ['-', 7], '9,9': '-', '5,0': 'sumiu' } }));
  const info = q => { const i = N.hexInfo(T2, q, 0); return [i.terreno ? i.terreno.id : null, i.custo, i.de, i.desenho]; };
  ok(j([0, 1, 2, 3, 4].map(info)) === j([['mo', 15, 'terreno', false], [null, 5, 'base', false], [null, 5, 'base', false], ['fl', 3, 'hex', true], [null, 7, 'hex', false]]) && T2.hexes['9,9'] === '-' && !('5,0' in T2.hexes),
    'o hexágono pintado à mão vale mais que o desenho; "-" tira o terreno do desenho; "" com custo próprio segue o desenho: ' + j([0, 1, 2, 3, 4].map(info)));
  ok(N.medirHex(T2, [0, 0], [160, 0]).terreno === 5 + 5 + 3 + 7 && N.medirHex(T, [0, 0], [160, 0]).terreno === 15 + 5 + 10 + 10,
    'a régua e a viagem contam o terreno do desenho');
  ok(N.terrenoPintado(N.normalizarMapa(Object.assign({}, T, { grade: null }))).size === 0, 'sem grade, o desenho não dá terreno a hexágono nenhum');
  let muitos = [];
  for (let i = 0; i < 80; i++) muitos.push({ t: 'fl', r: 5, pts: Array.from({ length: 1000 }, (_, k) => [k, i]) });
  const cheio = N.normalizarMapa(Object.assign({}, base, { pintura: { ops: muitos } }));
  ok(cheio.pintura.ops.length === N.LIMITES.pontosPintura / 1000 && N.LIMITES.pinceladas >= 1000, 'desenho à mão: até o limite de pontos (as pinceladas de depois saem): ' + cheio.pintura.ops.length);

  // a projeção
  const P0 = N.normalizarMapa(Object.assign({}, T2, { cal: { dia: 16 }, nevoa: { on: true, ops: [{ t: '+', x: 0, y: 0, r: 200 }] },
    faccoes: [{ id: 'fa', nome: 'Norte' }, { id: 'fb', nome: 'Sul', oculta: true }], objs: [
      { id: 'zv', k: 'z', pts: [[0, 0], [100, 0], [100, 100]], a: 'fa', b: 'fb', ini: 10, fim: 40, fases: [{ dia: 15, pts: [[0, 0], [9, 0], [9, 9]] }, { dia: 30, pts: [[1, 1], [2, 1], [2, 2]] }] },
      { id: 'zf', k: 'z', pts: [[0, 0], [100, 0], [100, 100]], ini: 20 }, { id: 'zp', k: 'z', pts: [[0, 0], [100, 0], [100, 100]], ini: 1, fim: 15 },
      { id: 'zc', k: 'z', pts: [[500, 500], [600, 500], [600, 600]], ini: 1 },
      { id: 'cv', k: 'c', x: 10, y: 10 }, { id: 'cc', k: 'c', x: 900, y: 900 }, { id: 'xv', k: 'x', x: 20, y: 20, nome: 'Aqui' }, { id: 'xc', k: 'x', x: 900, y: 10, nome: 'Lá' },
      { id: 'lv', k: 'l', pts: [[0, 0], [900, 900]] }, { id: 'lc', k: 'l', pts: [[800, 800], [900, 900]] }] }));
  const P = N.projetar(P0), po = id => P.objs.find(o => o.id === id);
  ok(j(P.objs.map(o => o.id)) === j(['zv', 'cv', 'xv', 'lv']), 'projeção: só a zona ativa hoje e à mostra; carimbo e texto sob a névoa saem; linha toda coberta sai: ' + j(P.objs.map(o => o.id)));
  ok(j(po('zv').pts) === '[[0,0],[9,0],[9,9]]' && j(po('zv').fases) === '[]' && po('zv').fim === null && po('zv').a === 'fa' && po('zv').b === null && po('zv').ini === 10,
    'projeção: a zona vai com a forma de hoje, sem as fases que vêm, sem o fim planejado e sem a facção escondida: ' + j(po('zv')));
  ok(j(P.pintura) === j(P0.pintura) && !Object.values(P.hexes).includes('-') && P.hexes['0,0'] === 'mo', 'projeção: o desenho à mão vai inteiro (é a arte do mapa); o "-" do mestre não vai');

  // escalar
  const E0 = N.normalizarMapa(Object.assign({}, T, { objs: [{ id: 'c', k: 'c', x: 10, y: 10, tam: 20 }, { id: 'x', k: 'x', x: 1, y: 1, nome: 'a', tam: 10 }, { id: 'l', k: 'l', pts: [[0, 0], [5, 5]], larg: 4 },
    { id: 'z', k: 'z', pts: [[0, 0], [10, 0], [10, 10]], ini: 0, fases: [{ dia: 3, pts: [[0, 0], [5, 0], [5, 5]] }] }] }));
  const E = N.escalarMapa(E0, 2, 2);
  ok(E.objs[0].tam === 40 && E.objs[1].tam === 20 && E.objs[2].larg === 8 && j(E.objs[3].fases[0].pts) === '[[0,0],[10,0],[10,10]]' && j(E.pintura.ops[0]) === j({ t: 'fl', r: 50, pts: [[0, 0], [320, 2]] }),
    'escalar: carimbos, textos, linhas, as fases da zona e o desenho à mão acompanham: ' + j(E.pintura.ops[0]));
}

/* ================= lote 6: a marcha em tempos, as bolinhas, o tamanho do mapa em cubos e as regiões de dentro ================= */
{
  const M = N.normalizarMapa({ grade: { tam: 40 }, cal: { dia: 5, tempo: 7 }, hexes: { '1,0': ['mo', 20] },
    objs: [{ id: 'rt', k: 't', pts: [[0, 0], [400, 0]] }, { id: 'g', k: 'g', x: 0, y: 0, rota: 'rt', pt: 10 }, { id: 'velho', k: 'g', x: 0, y: 0, cubos: 30 }] });
  const g = M.objs.find(o => o.id === 'g'), velho = M.objs.find(o => o.id === 'velho');
  ok(M.cal.tpd === 10 && M.cal.tempo === 7 && g.pt === 10 && g.cubos === 100 && velho.pt === 3 && velho.cubos === 30,
    'o dia tem 10 tempos de marcha; o grupo anda pt cubos por tempo (e os cubos por dia, para o site de antes); o grupo de antes (30 por dia) anda 3 por tempo');
  ok(N.normalizarMapa({ cal: { tpd: 4, tempo: 9 } }).cal.tempo === 3 && N.normalizarMapa({ cal: { tpd: 0 } }).cal.tpd === 1 && N.normalizarMapa({ cal: { tpd: 999 } }).cal.tpd === N.LIMITES.tempos && N.mapaNovo('x').cal.tpd === 10,
    'tempos por dia de 1 a 100 (10 num mapa novo); o tempo de hoje cabe no dia');
  ok(j(N.passarTempos(M.cal, 1)) === j({ dia: 5, tempo: 8, dias: 0 }) && j(N.passarTempos(M.cal, 3)) === j({ dia: 6, tempo: 0, dias: 1 }) && j(N.passarTempos(M.cal, 25)) === j({ dia: 8, tempo: 2, dias: 3 }), 'passar tempos: a cada 10, um dia');
  // a montanha de 20 cubos, andando 10 por tempo: duas bolinhas
  const b0 = N.bolinhas(M, g);
  ok(j(b0) === j({ total: 2, feitas: 0, terreno: 'Montanha' }), 'a montanha de 20 cubos a 10 por tempo: duas bolinhas, nenhuma andada: ' + j(b0));
  const depois = (m, id, r) => N.normalizarMapa(Object.assign(N.copia(m), { objs: m.objs.map(o => (o.id === id ? Object.assign({}, o, { x: r.x, y: r.y, prog: r.prog }) : o)) }));
  const t1 = N.andarTempos(M, 'g', 1), M1 = depois(M, 'g', t1);
  ok(t1.ok && t1.prog === 10 && t1.x === 0 && t1.hexes === 0 && t1.msg === 'Ainda no caminho do próximo hexágono (Montanha): 10 de 20 cubos' && j(N.bolinhas(M1, M1.objs[1])) === j({ total: 2, feitas: 1, terreno: 'Montanha' }),
    'um tempo: metade da montanha (uma bolinha cheia): ' + j(t1));
  const t2 = N.andarTempos(M1, 'g', 1), M2 = depois(M1, 'g', t2);
  ok(t2.ok && t2.prog === 20 && t2.x === 40 && t2.hexes === 1 && N.bolinhas(M2, M2.objs[1]) === null, 'o segundo tempo: entra na montanha (e o próximo hexágono, de 5, não tem bolinhas)');
  ok(N.andarTempos(M, 'g', 2).prog === 20 && N.andarUmDia(M, 'g').prog === 65 && N.andarTempos(M, 'g', 0).prog === 0, 'andar n tempos de uma vez; um dia são os 10 tempos (até o fim da rota)');
  // o ajuste à mão (sem passar o tempo)
  const a1 = N.ajustarMarcha(M1, 'g', -1), a2 = N.ajustarMarcha(M1, 'g', 1), a3 = N.ajustarMarcha(M, 'g', { bolinha: 1 }), a4 = N.ajustarMarcha(M, 'g', { bolinha: 2 }), a5 = N.ajustarMarcha(M, 'g', -1);
  ok(a1.ok && a1.prog === 0 && a2.ok && a2.prog === 20 && a2.x === 40 && a3.ok && a3.prog === 10 && a3.x === 0 && a4.ok && a4.prog === 20 && a4.x === 40 && !a5.ok && a5.msg === 'Nada mudou',
    'ajustar à mão: − e + um tempo; a bolinha 1 marca meio caminho; a última leva para dentro da montanha; no começo, voltar não muda nada');
  ok(N.ajustarMarcha(M, 'velho', 1).msg === 'Sem rota' && N.bolinhas(M, velho) === null, 'sem rota: nem ajuste, nem bolinhas');
  // andando 3 por tempo, a montanha de 20 pede 7 tempos (o último, mais curto): a 7ª bolinha leva para dentro dela, sem passar
  const M3 = N.normalizarMapa(Object.assign(N.copia(M), { objs: M.objs.map(o => (o.id === 'g' ? Object.assign({}, o, { pt: 3 }) : o)) })), g3 = M3.objs.find(o => o.id === 'g');
  const b7 = N.ajustarMarcha(M3, 'g', { bolinha: 7 }), b6 = N.ajustarMarcha(M3, 'g', { bolinha: 6 });
  ok(j(N.bolinhas(M3, g3)) === j({ total: 7, feitas: 0, terreno: 'Montanha' }) && b7.prog === 20 && b7.x === 40 && b6.prog === 18 && b6.x === 0,
    'andando 3 por tempo, a montanha de 20 cubos pede 7 tempos; a 7ª bolinha leva o grupo para dentro dela (20 cubos, não 21): ' + j([N.bolinhas(M3, g3), b7.prog, b6.prog]));
  // com 4 tempos por dia: a cada 4, um dia; andar 1 dia anda os 4
  const Q4 = N.normalizarMapa(Object.assign(N.copia(M), { cal: { dia: 5, tempo: 3, tpd: 4 } }));
  ok(j(N.passarTempos(Q4.cal, 1)) === j({ dia: 6, tempo: 0, dias: 1 }) && j(N.passarTempos(Q4.cal, 6)) === j({ dia: 7, tempo: 1, dias: 2 }) && N.andarUmDia(Q4, 'g').prog === 40 && Q4.objs.find(o => o.id === 'g').cubos === 40,
    'com 4 tempos de marcha por dia: a cada 4 tempos, um dia; "andar 1 dia" anda 4 tempos (40 cubos)');
  // para quem joga: as bolinhas vão prontas (o custo próprio do hexágono, que dá as duas, não vai)
  const P1 = N.projetar(M1), pg = P1.objs.find(o => o.id === 'g');
  ok(j(pg.bol) === '[1,2]' && P1.hexes['1,0'] === 'mo' && !('bol' in N.projetar(M2).objs.find(o => o.id === 'g')) && !('bol' in M1.objs[1]),
    'projeção: as bolinhas vão prontas para quem joga (o mapa do mestre não as guarda): ' + j(pg.bol));
  ok(N.normalizarMapa({ objs: [{ k: 'g', x: 0, y: 0, bol: [5, 2] }, { k: 'g', x: 0, y: 0, bol: [0, 1] }, { k: 'g', x: 0, y: 0, rota: 'x', bol: [1, 3] }] }).objs.every(o => !('bol' in o)), 'bolinhas tortas (ou sem rota) não ficam');

  // o tamanho do mapa em cubos: a grade nova, o terreno refeito
  const G = N.normalizarMapa({ larg: 400, alt: 200, grade: { tam: 40 }, hexes: { '2,0': 'fl', '3,0': ['mo', 12] }, objs: [{ id: 'rt', k: 't', pts: [[0, 0], [400, 0]] }, { id: 'g', k: 'g', x: 120, y: 0, rota: 'rt', prog: 25 }] });
  const G2 = N.copia(G), rg = N.regradear(G2, 20);
  const terr = (m, x, y) => { const h = N.hexDe(m, x, y); return m.hexes[h.q + ',' + h.r]; };
  ok(rg.ok && G2.grade.tam === 20 && rg.hexes >= 6 && j(terr(G2, 80, 0)) === '"fl"' && j(terr(G2, 120, 0)) === j(['mo', 12]) && terr(G2, 200, 0) === undefined,
    'hexágonos com a metade do tamanho: cada um fica com o terreno (e o custo próprio) do hexágono velho que tem o centro dele: ' + rg.hexes);
  const gg = G2.objs.find(o => o.id === 'g');
  ok(gg.x === 120 && gg.y === 0 && gg.prog === N.viagem(G2, gg).acum[6], 'o grupo fica onde está, e o andado é o do hexágono dele na rota nova: ' + gg.prog);
  ok(N.regradear(N.copia(G), 40).ok === false && N.regradear(N.normalizarMapa({}), 20).ok === false, 'mesmo tamanho, ou sem grade: nada muda');
  const cheio = {};
  for (let q = 0; q < 120; q++) for (let r = 0; r < 50; r++) cheio[q + ',' + r] = 'pl';
  const rc = N.regradear(N.normalizarMapa({ larg: 6000, alt: 4000, grade: { tam: 40 }, hexes: cheio }), 20);
  ok(!rc.ok && /passaria de 20\.000 hexágonos/.test(rc.msg), 'o terreno que passaria do limite de hexágonos: não muda, e diz por quê: ' + rc.msg);

  // as regiões de dentro
  const R = N.normalizarMapa({ grade: { tam: 40 }, faccoes: [{ id: 'fa', nome: 'Aldar' }], objs: [
    { id: 'brenn', k: 'r', pts: [[0, -50], [100, -50], [100, 50], [0, 50]], pai: 'reino' },
    { id: 'reino', k: 'r', pts: [[-100, -100], [300, -100], [300, 100], [-100, 100]], fac: 'fa', custo: 8, enc: { chance: 50, itens: [{ p: 1, txt: 'Lobos' }] } },
    { id: 'neta', k: 'r', pts: [[10, -10], [30, -10], [30, 10], [10, 10]], pai: 'brenn' },
    { id: 'eu', k: 'r', pts: [[0, 0], [1, 0], [1, 1]], pai: 'eu' }, { id: 'sumiu', k: 'r', pts: [[0, 0], [1, 0], [1, 1]], pai: 'nada' }, { id: 'gx', k: 'g', x: 0, y: 0, pai: 'reino' }] });
  const ro = id => R.objs.find(o => o.id === id);
  ok(ro('brenn').pai === 'reino' && ro('neta').pai === 'brenn' && ro('eu').pai === null && ro('sumiu').pai === null && !('pai' in ro('gx')), 'a região de dentro: o pai existe, é região e não é ela mesma');
  ok(N.facDaRegiao(R, ro('brenn')) === 'fa' && N.facDaRegiao(R, ro('neta')) === 'fa' && j([...N.acimaDe(R, ro('neta'))]) === j(['brenn', 'reino']), 'sem facção, ela é da facção da de fora (e da avó)');
  ok(N.regiaoEm(R, 50, 0).id === 'brenn' && N.regiaoEm(R, 20, 0).id === 'neta' && N.regiaoEm(R, 200, 0).id === 'reino', 'o encontro: vale a região mais de dentro (mesmo com o Reino desenhado depois)');
  ok(N.custoHex(R, 1, 0) === 5 && N.custoHex(R, 4, 0) === 8, 'o custo do Reino não vale dentro do Condado sem custo; fora dele, vale');
  const PR = N.projetar(N.normalizarMapa(Object.assign(N.copia(R), { objs: R.objs.map(o => (o.id === 'reino' ? Object.assign({}, o, { oculto: true }) : o)) })));
  ok(PR.objs.find(o => o.id === 'brenn').fac === 'fa' && PR.objs.find(o => o.id === 'brenn').pai === null && PR.objs.find(o => o.id === 'neta').pai === 'brenn' && !PR.objs.some(o => o.id === 'reino'),
    'projeção: com o Reino escondido, o Condado vai com a facção que herdou (e sem o pai)');
  const ciclo = N.normalizarMapa({ objs: [{ id: 'a', k: 'r', pts: [[0, 0], [1, 0], [1, 1]], pai: 'b' }, { id: 'b', k: 'r', pts: [[0, 0], [1, 0], [1, 1]], pai: 'a' }] });
  ok(ciclo.objs.filter(o => o.pai).length === 1, 'duas regiões uma dentro da outra (um ciclo): uma delas deixa de ter pai');
  // a facção escondida não vai para quem joga, nem pela região de dentro que a herda
  const PH = N.projetar(N.normalizarMapa(Object.assign(N.copia(R), { faccoes: [{ id: 'fa', nome: 'Aldar', oculta: true }] })));
  ok(PH.objs.find(o => o.id === 'brenn').fac === null && PH.objs.find(o => o.id === 'neta').fac === null && PH.objs.find(o => o.id === 'reino').fac === null && !PH.faccoes.length,
    'a facção escondida não vai para quem joga, nem pela região de dentro (que a herda)');
}

/* ================= lote 6 (5b): a honra dos grupos, o painel das facções e os terrenos novos ================= */
{
  // a honra: de −10 a +10 (lote 8; era de −5 a +5), com um estilo; o histórico com a data do mundo e o motivo
  ok(j(Object.keys(N.HONRA)) === j(['elmo', 'kabuto', 'katana', 'turbante', 'coroa', 'escudo', 'cajado', 'mascara']) && N.HONRA.escudo === 'Escudo com brasão' && N.LIMITES.honra === 10,
    'oito estilos de honra (elmo medieval, kabuto, katana, turbante, coroa, escudo com brasão, cajado de mago, máscara tribal)');
  const G = N.normalizarMapa({ objs: [{ id: 'g', k: 'g', x: 0, y: 0 }, { id: 'h', k: 'g', x: 0, y: 0, estilo: 'kabuto', honra: 19, hhist: [{ d: 3, de: 0, para: 2, mot: 'Salvaram a vila' }, { d: 4, de: 2, para: 2 }, { de: 'x', para: 1 }, 'lixo'] }, { id: 'i', k: 'g', x: 0, y: 0, estilo: 'nada', honra: -19 }] });
  const gg = id => G.objs.find(o => o.id === id);
  ok(gg('g').estilo === '' && gg('g').honra === 0 && j(gg('g').hhist) === '[]' && gg('h').estilo === 'kabuto' && gg('h').honra === 10 && j(gg('h').hhist) === j([{ d: 3, de: 0, para: 2, mot: 'Salvaram a vila' }]) && gg('i').estilo === '' && gg('i').honra === -10,
    'o grupo: sem estilo de começo (não mostra honra); a honra fica entre −10 e +10; o histórico só com as linhas que mudam algo');
  const H = N.copia(gg('g'));
  ok(N.mudarHonra(H, 2, 7, '  Venceram o duelo  ') && H.honra === 2 && j(H.hhist) === j([{ d: 7, de: 0, para: 2, mot: 'Venceram o duelo' }]) && !N.mudarHonra(H, 2, 8, 'nada') && H.hhist.length === 1
    && N.mudarHonra(H, -99, 9, '') && H.honra === -10 && H.hhist[1].para === -10 && H.hhist[1].mot === '',
    'mudar a honra: o valor e a linha do histórico (o mesmo valor não muda nada; passa de −10, fica em −10)');
  const H2 = { honra: 0, hhist: [] };
  for (let i = 0; i < 130; i++) N.mudarHonra(H2, i % 2 ? 0 : 1, i, 'vez ' + i);
  ok(H2.hhist.length === N.LIMITES.historico && H2.hhist[0].mot === 'vez 30' && N.normalizarMapa({ objs: [Object.assign({ k: 'g', x: 0, y: 0 }, H2)] }).objs[0].hhist.length === 100, 'o histórico da honra guarda as últimas 100 mudanças');
  ok(j(N.projetar(G).objs.find(o => o.id === 'h').hhist) === j(gg('h').hhist) && N.projetar(G).objs.find(o => o.id === 'h').honra === 10, 'a honra e o histórico vão para os jogadores (todos veem)');

  // o painel das facções
  const F = N.normalizarMapa({ faccoes: [{ id: 'fa', nome: 'Aldar', rec: [{ id: 'ouro', nome: 'Ouro', n: '1000', ver: true }, { id: 'sold', nome: 'Soldados', n: 500 }, { nome: 'Comida', n: 'x' }, 'lixo'], pop: 12000.4, apoio: 140, ver: { pop: 1, hist: 'sim' } }, { id: 'fb', nome: 'Vale' }] });
  const fa = F.faccoes[0], fb = F.faccoes[1];
  ok(j(fa.rec) === j([{ id: 'ouro', nome: 'Ouro', n: 1000, ver: true }, { id: 'sold', nome: 'Soldados', n: 500, ver: false }, { id: 'rc2', nome: 'Comida', n: 0, ver: false }]) && fa.pop === 12000 && fa.apoio === 100 && j(fa.ver) === j({ pop: true, apoio: false, hist: true }),
    'a facção: recursos (nome e número; os jogadores não veem de começo), população, apoio de 0 a 100% e o que os jogadores veem: ' + j(fa.rec));
  ok(j(fb.rec) === '[]' && fb.pop === null && fb.apoio === null && j(fb.ver) === j({ pop: false, apoio: false, hist: false }) && j(fb.hist) === '[]' && j(N.faccaoNova('X').ver) === j(fb.ver),
    'uma facção sem nada disso: tudo vazio e só com o mestre');
  const fx = N.copia(fa);
  ok(N.facMudar(fx, 'r:ouro', 900, 10, 'Pagaram os mercenários') && N.facMudar(fx, 'r:sold', 650, 10, 'Pagaram os mercenários') && N.facMudar(fx, 'r:ouro', 850, 10, 'Pagaram os mercenários')
    && j(fx.hist) === j([{ d: 10, mot: 'Pagaram os mercenários', mud: [['r:ouro', 'Ouro', 1000, 850], ['r:sold', 'Soldados', 500, 650]] }]),
    'mudar os números entra sozinho no histórico; no mesmo dia e com o mesmo motivo, numa linha só: ' + j(fx.hist));
  ok(N.facMudar(fx, 'pop', 11000, 10, 'A peste') && N.facMudar(fx, 'apoio', '55', 11, 'A peste') && !N.facMudar(fx, 'apoio', 55, 11, 'outro') && !N.facMudar(fx, 'r:nada', 1, 11, '') && !N.facMudar(fx, 'r:ouro', 'x', 11, '')
    && fx.hist.length === 3 && j(fx.hist[1].mud) === j([['pop', '', 12000, 11000]]) && j(fx.hist[2]) === j({ d: 11, mot: 'A peste', mud: [['apoio', '', 100, 55]] }),
    'outro motivo ou outro dia: outra linha; o mesmo valor, um campo que não existe ou um número torto: nada muda: ' + j(fx.hist));
  ok(N.facMudar(fx, 'apoio', 100, 11, 'A peste') && fx.hist.length === 2 && fx.apoio === 100, 'voltar ao que era no mesmo dia e motivo: a mudança some do histórico (e a linha vazia também)');
  const idc = N.facNovoRecurso(fx, '  Magia ', 30, 12, 'O tratado');
  ok(/^rc_/.test(idc) && fx.rec[3].nome === 'Magia' && fx.rec[3].ver === false && j(fx.hist[2]) === j({ d: 12, mot: 'O tratado', mud: [['r:' + idc, 'Magia', null, 30]] }) && N.facTirarRecurso(fx, 'sold', 12, 'O tratado')
    && j(fx.hist[2].mud[1]) === j(['r:sold', 'Soldados', 650, null]) && !fx.rec.some(r => r.id === 'sold') && N.facTirarRecurso(fx, idc, 12, 'O tratado') && fx.hist[2].mud.length === 1,
    'recurso novo e recurso tirado entram no histórico (nasceu, saiu); nascer e sair no mesmo dia e motivo se anulam');
  // os jogadores: só o que o mestre marcou
  const fy = N.copia(fx);
  fy.hist.push({ d: 13, mot: 'Segredo', mud: [['r:sold', 'Soldados', null, 10]] });
  const P = N.projetar(N.normalizarMapa({ faccoes: [fy, { id: 'fz', nome: 'Oculta', oculta: true, rec: [{ nome: 'Ouro', n: 1, ver: true }] }] }));
  const pf = P.faccoes[0];
  ok(P.faccoes.length === 1 && j(pf.rec) === j([{ id: 'ouro', nome: 'Ouro', n: 850, ver: true }]) && pf.pop === 11000 && pf.apoio === null && pf.nota === ''
    && j(pf.hist) === j([{ d: 10, mot: 'Pagaram os mercenários', mud: [['r:ouro', 'Ouro', 1000, 850]] }, { d: 10, mot: 'A peste', mud: [['pop', '', 12000, 11000]] }]),
    'para os jogadores: só os recursos marcados, a população marcada, e do histórico só o que eles veem (a linha só do que é escondido some): ' + j(pf.hist));
  const fh = { rec: [{ id: 'x', nome: 'X', n: 0 }], hist: [] };
  for (let i = 0; i < 230; i++) N.facMudar(fh, 'r:x', i + 1, i, 'dia ' + i);
  ok(fh.hist.length === N.LIMITES.historicoFac && fh.hist[0].mot === 'dia 30' && N.normalizarMapa({ faccoes: [Object.assign({ nome: 'F' }, fh)] }).faccoes[0].hist.length === 200, 'o histórico da facção guarda as últimas 200 linhas');
  const fw = N.copia(fy); fw.ver.hist = false;
  ok(j(N.projetar(N.normalizarMapa({ faccoes: [fw] })).faccoes[0].hist) === '[]', 'sem marcar o histórico, ele não vai');

  // a grade: o desenho em cada hexágono (ligado de começo); os terrenos novos que faltam num mapa de antes
  ok(N.normalizarMapa({ grade: { tam: 40 } }).grade.des === true && N.normalizarMapa({ grade: { tam: 40, des: false } }).grade.des === false, 'o desenho em cada hexágono: ligado de começo; o mestre desliga');
  const antigo = N.normalizarMapa({ terrenos: [{ id: 'pl', nome: 'Planície' }, { id: 'xx', nome: 'lava' }] });
  ok(j(N.terrenosQueFaltam(antigo).map(t => t.id)) === j(['la', 'ru', 'cr', 'se', 'sv', 'tu', 'tc', 'ar', 'md', 'df', 'gl', 'fm', 'oa', 'ch', 'td', 'ri', 'et', 'ep', 'ev', 'lg']) && N.terrenosQueFaltam(N.mapaNovo('x')).length === 0 && N.normalizarMapa({}).terrenos.length === 29,
    'num mapa de antes, os terrenos novos que faltam (nem o id nem o nome; lote 17: e os oito dele); um mapa novo já tem todos');
  const cheio = N.normalizarMapa({ terrenos: Array.from({ length: 36 }, (_, i) => ({ id: 't' + i, nome: 'T' + i })) });
  ok(N.terrenosQueFaltam(cheio).length === 4, 'cabendo no limite de 40 tipos de terreno');
}

/* ================= lote 7, parte 4b: o que vai do mapa para as cenas ================= */
{
  // quando escurece: o entardecer no 8º tempo e a noite no 9º, num dia de 10 (o mestre muda)
  const cal10 = N.normalizarMapa({}).cal;
  const q = N.quandoEscurece(cal10);
  ok(q.ent === 8 && q.noi === 9 && q.padraoEnt === 8 && q.padraoNoi === 9, 'de fábrica, num dia de 10 tempos: entardecer no 8º, noite no 9º: ' + j(q));
  const hora = (cal, t) => N.horaDoTempo(Object.assign({}, cal, { tempo: t }));
  ok(j([0, 6, 7, 8, 9].map(t => hora(cal10, t))) === j(['dia', 'dia', 'entardecer', 'noite', 'noite']), 'a hora de cada tempo: dia até o 7º, entardecer no 8º, noite no 9º e no 10º');
  const q4 = N.quandoEscurece({ tpd: 4 }), q3 = N.quandoEscurece({ tpd: 3 });
  ok(q4.ent === 2 && q4.noi === 3 && q3.ent === 4 && q3.noi === 4 && j([0, 1, 2].map(t => hora({ tpd: 3 }, t))) === j(['dia', 'dia', 'dia']), 'num dia de 4 tempos, entardecer no 2º e noite no 3º; com menos de 4, de fábrica não escurece');
  const meu = N.normalizarMapa({ cal: { tpd: 10, tempo: 2, ent: 3, noi: 4 } }).cal;
  ok(meu.ent === 3 && meu.noi === 4 && N.horaDoTempo(meu) === 'entardecer' && hora(meu, 3) === 'noite' && hora(meu, 1) === 'dia', 'o mestre diz quando escurece (entardecer no 3º, noite no 4º) e a hora segue');
  const sem = N.normalizarMapa({ cal: { ent: '', noi: 'x' } }).cal, sem2 = N.normalizarMapa({ cal: { ent: 'x', noi: '' } }).cal, fora = N.normalizarMapa({ cal: { ent: 0, noi: 500 } }).cal;
  ok(!('ent' in sem) && !('noi' in sem) && !('ent' in sem2) && !('noi' in sem2) && fora.ent === 1 && fora.noi === N.LIMITES.tempos + 1, 'vazio ou inválido volta ao de fábrica (não fica guardado); fora da faixa, fica no limite (um tempo depois do último quer dizer "nunca")');
  ok(N.horaDoTempo(null) === 'dia' && N.horaDoTempo(undefined) === 'dia', 'sem calendário, é dia');
  ok(j(N.normalizarMapa({ cal: { tpd: 10 } }).cal).indexOf('"ent"') < 0, 'um mapa sem a escolha não ganha campos novos');
  // o estilo das cenas, por região
  ok(j(Object.keys(N.ESTILOS_CENA)) === j(['comum', 'oriental', 'nordico', 'desertico', 'elfico', 'anao']) && N.ESTILOS_CENA.nordico === 'Nórdico', 'os seis estilos das cenas, com os nomes da janela das Cenas');
  const rg = (estilo, extra) => N.normalizarMapa({ objs: [Object.assign({ id: 'rg1', k: 'r', pts: [[0, 0], [100, 0], [100, 100]], estilo }, extra || {})] }).objs[0];
  ok(rg('nordico').estilo === 'nordico' && !('estilo' in rg('xyz')) && !('estilo' in rg(undefined)) && !('estilo' in rg('__proto__')), 'a região guarda o estilo das cenas só quando é um dos seis');
  const pub = N.projetar(N.normalizarMapa({ objs: [{ id: 'rg1', k: 'r', pts: [[0, 0], [100, 0], [100, 100]], estilo: 'elfico', nome: 'Bosque' }] }));
  ok(pub.objs.length === 1 && !('estilo' in pub.objs[0]) && pub.objs[0].nome === 'Bosque', 'quem joga recebe a região sem o estilo das cenas (é do mestre)');
}

/* ================= lote 7, parte 5a: os eventos pesam na viagem ================= */
{
  // a fileira de hexágonos y = 0 (grade de 20, em pé): uma rota reta para a direita, o grupo a 5 cubos por tempo
  const base = (extra, dia) => N.normalizarMapa({ grade: { tam: 20, x: 0, y: 0, orient: 'pe', on: true }, cal: { dia: dia || 5 }, objs: [
    { id: 'rt', k: 't', pts: [[0, 0], [200, 0]] }, { id: 'g1', k: 'g', x: 0, y: 0, rota: 'rt', pt: 5, nome: 'Os Heróis' }].concat(extra) });
  // o peso: normalizado, e só quando tem (os eventos de antes não pesam)
  const ev1 = N.normalizarMapa({ objs: [{ id: 'e', k: 'e', x: 0, y: 0, tipo: 'tempestade', peso: { custo: '7,5'.replace(',', '.'), enc: 300, fecha: 'sim' } }, { id: 'e0', k: 'e', x: 0, y: 0, tipo: 'guerra' }] }).objs;
  ok(j(ev1[0].peso) === j({ custo: 7.5, enc: 100, fecha: true }) && !('peso' in ev1[1]), 'o peso guardado do jeito certo (a chance até 100%); o evento de antes, sem peso: ' + j(ev1[0].peso));
  ok(j(N.pesoPadrao('tempestade')) === j({ custo: 5, enc: 0, fecha: false }) && N.pesoPadrao('xyz').enc === 20 && N.pesoPadrao('tempestade') !== N.PESO_EVENTO.tempestade, 'o peso de começo do tipo (uma cópia)');
  // o custo: a tempestade (+5) cobre os hexágonos 1 a 3; o de antes (guerra sem peso) não conta
  const m = base([{ id: 'tp', k: 'e', tipo: 'tempestade', x: 40, y: 0, r: 25, ini: 0, peso: N.pesoPadrao('tempestade') }, { id: 'gu', k: 'e', tipo: 'guerra', x: 40, y: 0, r: 25, ini: 0 }]);
  const v = N.viagem(m, m.objs[1]), h2 = N.hexInfo(m, v.cam[2].q, v.cam[2].r), h5 = N.hexInfo(m, v.cam[5].q, v.cam[5].r);
  ok(j(v.acum.slice(0, 6)) === j([0, 10, 20, 30, 35, 40]) && h2.custo === 10 && h2.custoBase === 5 && h2.extra === 5 && j(h2.eventos) === j(['tp']) && h2.fechado === null && !('eventos' in h5), 'a tempestade soma 5 cubos nos hexágonos dentro dela (o hexInfo diz de onde vem): ' + j(v.acum));
  // fora da data, nada pesa
  const mFora = base([{ id: 'tp', k: 'e', tipo: 'tempestade', x: 40, y: 0, r: 25, ini: 9, peso: N.pesoPadrao('tempestade') }]);
  ok(N.viagem(mFora, mFora.objs[1]).acum[3] === 15, 'o evento que ainda não começou não pesa');
  // a passagem fechada: a ponte caída cobre o hexágono 6 — o grupo para no 5, com o aviso, e não guarda andado rumo ao 6
  const mp = base([{ id: 'pc', k: 'e', tipo: 'ponte', x: 120, y: 0, r: 12, ini: 0, peso: N.pesoPadrao('ponte'), nome: '' }]);
  const anda = (mm, n) => { const r = N.andarTempos(mm, 'g1', n), c = JSON.parse(j(mm)), g = c.objs.find(o => o.id === 'g1'); if (r.ok) { g.x = r.x; g.y = r.y; g.prog = r.prog; } return [N.normalizarMapa(c), r]; };
  let [m2, r1] = anda(mp, 4);
  ok(r1.ok && r1.hexes === 4 && !r1.parou, '(anda 4 hexágonos livres)');
  let r2; [m2, r2] = anda(m2, 3);
  ok(r2.ok && r2.hexes === 1 && r2.parou && r2.parou.id === 'pc' && r2.parou.nome === 'Ponte caída' && /e parou: "Ponte caída" fecha a passagem/.test(r2.msg) && r2.prog === 25, 'anda até o hexágono antes da ponte e para, com o aviso (sem andado rumo a ela): ' + r2.msg);
  let r3; [m2, r3] = anda(m2, 5);
  ok(r3.ok && r3.hexes === 0 && r3.cubos === 0 && r3.parou && r3.msg === 'Parou: "Ponte caída" fecha a passagem' && r3.prog === 25, 'parado: o próximo tempo não sai do lugar');
  const semFecha = base([{ id: 'pc', k: 'e', tipo: 'ponte', x: 120, y: 0, r: 12, ini: 0, peso: { custo: 0, enc: 0, fecha: false } }]);
  ok(!anda(semFecha, 8)[1].parou, 'com a passagem aberta, segue');
  // o encontro: os eventos somam (ou tiram) da chance da região, até 0 e 100
  const reg = { enc: { chance: 10, itens: [{ p: 1, txt: 'Lobos' }] } };
  const s1 = N.sortearEncontro(reg, seq(0.35, 0), 30), s2 = N.sortearEncontro(reg, seq(0.35, 0), -40), s3 = N.sortearEncontro(reg, seq(0.99, 0), 200);
  ok(s1.houve && s1.chance === 40 && s1.base === 10 && s1.extra === 30 && s2.chance === 0 && !s2.houve && s3.chance === 100 && s3.houve, 'a chance com os eventos: 10% + 30% = 40%; nunca abaixo de 0 nem acima de 100');
  const pe = N.pesoNoPonto(base([{ id: 'b1', k: 'e', tipo: 'bandidos', x: 0, y: 0, r: 30, ini: 0, peso: N.pesoPadrao('bandidos') }, { id: 'c1', k: 'e', tipo: 'colheita', x: 0, y: 0, r: 30, ini: 0, peso: N.pesoPadrao('colheita') }, { id: 'f1', k: 'e', tipo: 'festival', x: 0, y: 0, r: 30, ini: 0, peso: N.pesoPadrao('festival') }]), 0, 0);
  ok(pe.enc === 20 && pe.custo === 0 && j(pe.eventos.map(e => e.id)) === j(['b1', 'c1']), 'no ponto: os bandidos (+30) e a colheita farta (−10); o festival não pesa (nada a somar): ' + j([pe.enc, pe.eventos.map(e => e.id)]));
  // o que vai para a cena: o clima, a hora, as zonas e o chão seco (com ou sem o peso ligado)
  const mc = base([{ id: 'i1', k: 'e', tipo: 'inverno', x: 0, y: 0, r: 30, ini: 0 }, { id: 'l1', k: 'e', tipo: 'luaSangue', x: 0, y: 0, r: 30, ini: 0 }, { id: 'ec', k: 'e', tipo: 'eclipse', x: 0, y: 0, r: 30, ini: 0 }, { id: 'sc', k: 'e', tipo: 'seca', x: 0, y: 0, r: 30, ini: 0 }, { id: 'as', k: 'e', tipo: 'assombracao', x: 0, y: 0, r: 30, ini: 0 }]);
  const cn = N.cenaNoPonto(mc, 0, 0), longe = N.cenaNoPonto(mc, 500, 500);
  ok(cn.clima === 'neve' && cn.hora === 'breu' && j(cn.fx) === j(['luaSangue', 'espiritos']) && cn.seco === true && cn.eventos.length === 5 && longe.clima === '' && !longe.eventos.length, 'na cena: a neve do inverno, o breu do eclipse (vence a noite da lua de sangue), as zonas e o chão seco: ' + j([cn.clima, cn.hora, cn.fx, cn.seco]));
  // quem joga não recebe o peso
  const pub = N.projetar(mp);
  ok(pub.objs.filter(o => o.k === 'e').length === 1 && pub.objs.filter(o => o.k === 'e').every(o => !('peso' in o)), 'quem joga recebe o evento sem o peso (é do mestre)');
}

/* ================= lote 7, parte 5b: os grupos do mundo, as paradas, os eventos que andam e o traçado ================= */
{
  const base = (objs, extra) => N.normalizarMapa(Object.assign({ larg: 400, alt: 300, grade: { tam: 20, x: 0, y: 0, orient: 'pe', on: true }, cal: { dia: 5 }, objs }, extra || {}));
  const aplica = (m, id, r) => { const c = JSON.parse(j(m)), o = c.objs.find(x => x.id === id); Object.assign(o, { x: r.x, y: r.y, prog: r.prog, espera: r.espera || 0 }); if ('sentido' in r) o.sentido = r.sentido; return N.normalizarMapa(c); };
  // a normalização
  const [t1, g1, g2, e1, e2] = N.normalizarMapa({ objs: [
    { id: 'rt', k: 't', pts: [[0, 0], [100, 0]], esc: 'sim' },
    { id: 'g1', k: 'g', x: 0, y: 0, rota: 'rt', tipo: 'caravana', modo: 'volta', sentido: -1, espera: 3, paradas: [{ x: 40, y: 0, n: 2, u: 'd', nome: ' Mercado ' }, { x: 'a', y: 0 }, { x: 60, y: 0, n: 0 }] },
    { id: 'g2', k: 'g', x: 0, y: 0, tipo: 'dragao', modo: 'xyz', sentido: -1 },
    { id: 'e1', k: 'e', x: 0, y: 0, tipo: 'migracao', rota: 'rt', pt: '3', modo: 'circuito', sentido: -1 },
    { id: 'e2', k: 'e', x: 0, y: 0, tipo: 'migracao', rota: 'nao-existe', pt: 3 },
  ] }).objs;
  ok(t1.esc === true && g1.tipo === 'caravana' && g1.modo === 'volta' && g1.sentido === -1 && g1.espera === 3 && j(g1.paradas) === j([{ x: 40, y: 0, n: 2, u: 'd', nome: 'Mercado' }, { x: 60, y: 0, n: 1, u: 't' }]),
    'o grupo do mundo: o tipo, ida e volta (voltando), a espera e as paradas (a sem lugar sai; no mínimo 1 tempo): ' + j(g1.paradas));
  ok(!('tipo' in g2) && !('modo' in g2) && !('sentido' in g2) && !('paradas' in g2) && !('espera' in g2), 'o tipo e o modo que não existem: o grupo comum, só ida');
  ok(e1.rota === 'rt' && e1.pt === 3 && e1.modo === 'circuito' && !('sentido' in e1) && e1.prog === 0 && !('rota' in e2) && !('pt' in e2), 'o evento que anda (a rota que não existe some)');
  ok(j(N.camposDoTipo('patrulha')) === j({ tipo: 'patrulha', sigla: 'PAT', cor: '#5a8fc0', pt: 4, oculto: true }) && j(N.camposDoTipo('')) === '{}', 'o grupo novo do tipo: escondido, com a sigla, a cor e o passo');
  // ida e volta: a rota de 5 hexágonos (x = 0 a 80), a caravana a 10 cubos por tempo (2 hexágonos)
  const mv = base([{ id: 'rt', k: 't', pts: [[0, 0], [80, 0]] }, { id: 'c', k: 'g', x: 0, y: 0, rota: 'rt', pt: 10, modo: 'volta', tipo: 'caravana' }]);
  const a1 = N.andarTempos(mv, 'c', 3);
  ok(a1.ok && a1.x === 40 && a1.prog === 10 && a1.sentido === -1 && a1.hexes === 6 && a1.voltas === 1 && a1.msg === 'Andou 6 hexágonos (30 cubos) e virou no fim da rota' && j(a1.pass) === j(['0,0', '1,0', '2,0', '3,0', '4,0', '3,0', '2,0']),
    'ida e volta: no fim, vira e segue no outro sentido com o que sobrou: ' + j([a1.x, a1.prog, a1.sentido, a1.msg, a1.pass]));
  const mv2 = aplica(mv, 'c', a1), a2 = N.andarTempos(mv2, 'c', 3);
  ok(a2.x === 80 && a2.sentido === 1 && a2.prog === 20 && a2.voltas === 1, 'volta ao começo, vira de novo e vai até o fim: ' + j([a2.x, a2.sentido, a2.prog]));
  const a3 = N.andarTempos(aplica(mv2, 'c', a2), 'c', 1);
  ok(a3.x === 40 && a3.sentido === -1, 'parado no fim, o próximo tempo já vira: ' + j([a3.x, a3.sentido]));
  ok(j(N.viagem(mv2, mv2.objs[1]).cam.map(h => h.q)) === j([4, 3, 2, 1, 0]), 'na volta, o caminho é a rota ao contrário');
  // circuito: o triângulo (0,0) → (80,0) → (40,69.28), fechado de volta ao começo (12 hexágonos)
  const mc = base([{ id: 'rt', k: 't', pts: [[0, 0], [80, 0], [40, 69.28]] }, { id: 'c', k: 'g', x: 0, y: 0, rota: 'rt', pt: 5, modo: 'circuito' }]);
  const vc = N.viagem(mc, mc.objs[1]), c1 = N.andarTempos(mc, 'c', 14);
  ok(vc.cam.length === 13 && vc.total === 60 && c1.x === 40 && c1.y === 0 && c1.prog === 10 && c1.voltas === 1 && c1.msg === 'Andou 14 hexágonos (70 cubos) e recomeçou a rota', 'em circuito: a rota fechada, e no fim recomeça: ' + j([vc.cam.length, c1.x, c1.prog, c1.msg]));
  ok(N.andarTempos(base([{ id: 'rt', k: 't', pts: [[0, 0], [80, 0]] }, { id: 'c', k: 'g', x: 0, y: 0, rota: 'rt', pt: 5 }]), 'c', 14).chegou, '(só ida: para no fim)');
  // as paradas: a patrulha a 10 cubos por tempo; a parada "Forte" no hexágono 3, de 2 tempos
  const mp = base([{ id: 'rt', k: 't', pts: [[0, 0], [200, 0]] }, { id: 'p', k: 'g', x: 0, y: 0, rota: 'rt', pt: 10, tipo: 'patrulha', paradas: [{ x: 60, y: 0, n: 2, u: 't', nome: 'Forte' }] }]);
  const p1 = N.andarTempos(mp, 'p', 2);
  ok(p1.x === 60 && p1.espera === 2 && p1.parada && p1.parada.nome === 'Forte' && p1.msg === 'Andou 3 hexágonos (15 cubos) e parou em "Forte": faltam 2 tempos', 'ao entrar na parada, fica (o resto do tempo se perde) e a espera começa: ' + j([p1.x, p1.espera, p1.msg]));
  const mp2 = aplica(mp, 'p', p1), p2 = N.andarTempos(mp2, 'p', 1);
  ok(p2.ok && p2.x === 60 && p2.espera === 1 && p2.hexes === 0 && p2.msg === 'Parado em "Forte": falta 1 tempo', 'na espera, o tempo passa e o grupo fica: ' + j([p2.espera, p2.msg]));
  const p3 = N.andarTempos(aplica(mp2, 'p', p2), 'p', 3);
  ok(p3.x === 140 && p3.espera === 0 && p3.esperou === 1 && p3.hexes === 4 && p3.msg === 'Andou 4 hexágonos (20 cubos), depois de 1 tempo parado em "Forte"', 'acabada a espera, segue (sem parar de novo na mesma): ' + j([p3.x, p3.msg]));
  const pd = N.andarTempos(base([{ id: 'rt', k: 't', pts: [[0, 0], [200, 0]] }, { id: 'p', k: 'g', x: 0, y: 0, rota: 'rt', pt: 10, paradas: [{ x: 20, y: 0, n: 1, u: 'd' }] }]), 'p', 4);
  ok(pd.x === 20 && pd.espera === 7 && /parou em "a parada 1": faltam 7 tempos/.test(pd.msg), 'a parada de 1 dia (10 tempos), sem nome: ' + pd.msg);
  const vel = base([{ id: 'rt', k: 't', pts: [[0, 0], [200, 0]] }, { id: 'v', k: 'm', x: 20, y: 0, ic: 'vila', nome: 'Vila do Rio' }, { id: 'p', k: 'g', x: 0, y: 0, rota: 'rt', pt: 10, paradas: [{ x: 20, y: 0, n: 3 }] }]);
  ok(/parou em "Vila do Rio"/.test(N.andarTempos(vel, 'p', 1).msg), 'a parada sem nome leva o nome do marcador do hexágono dela');
  // o evento que anda
  const mev = base([{ id: 'rt', k: 't', pts: [[0, 0], [200, 0]] }, { id: 'e', k: 'e', x: 0, y: 0, tipo: 'migracao', ini: 0, r: 30, rota: 'rt', pt: 5 }]);
  const re = N.andarTempos(mev, 'e', 2);
  ok(re.ok && re.x === 40 && re.hexes === 2, 'o evento anda pela rota como um grupo: ' + j([re.x, re.hexes]));
  // os encontros no caminho
  const me = base([{ id: 'g', k: 'g', x: 100, y: 0, nome: 'Os Heróis' }, { id: 'p', k: 'g', x: 140, y: 0, tipo: 'patrulha' }, { id: 'c', k: 'g', x: 300, y: 0, tipo: 'caravana' }, { id: 'g2', k: 'g', x: 120, y: 0 }]);
  ok(j(N.encontrosNoCaminho(me)) === j([['p', 'g2']]), 'a até 1 hexágono: a patrulha encontra o grupo do lado (não o de 2 hexágonos, nem os do mundo entre si): ' + j(N.encontrosNoCaminho(me)));
  ok(j(N.encontrosNoCaminho(me, { p: ['9,0', '8,0', '7,0', '6,0'], g2: ['7,0'] })) === j([['p', 'g'], ['p', 'g2']]), 'pelo caminho: quem passou perto também conta');
  // traçar: o mapa todo custa 10 (uma região); a estrada contorna por cima, e o caminho vai por ela
  const reg = { id: 'rg', k: 'r', pts: [[-50, -100], [450, -100], [450, 350], [-50, 350]], custo: 10 };
  // (a fileira r = 4, de x = 40 a 240; a estrada sobe para a fileira r = 2 e desce no fim)
  const est = { id: 'es', k: 'l', estilo: 'estrada', pts: [[40, 69.28], [60, 34.64], [220, 34.64], [240, 69.28]] };
  const mt = base([reg, est]);
  const tr = N.tracarRota(mt, { x: 40, y: 69.28 }, { x: 240, y: 69.28 });
  ok(tr.ok && tr.hexes === 12 && tr.naVia === 12 && tr.via === 'estrada' && tr.custo === 120 && tr.msg === '12 hexágonos (120 cubos), 12 hexágonos por estrada ou trilha', 'traçar: pela estrada (mais barata), contornando: ' + j([tr.hexes, tr.naVia, tr.custo, tr.msg]));
  ok(j(N.caminhoHex(mt, tr.pts)) === j(tr.cam) && tr.pts.length === 4, 'os cantos do traçado refazem o mesmo caminho: ' + j(tr.pts));
  const semEst = N.tracarRota(base([reg]), { x: 40, y: 69.28 }, { x: 240, y: 69.28 });
  ok(semEst.ok && semEst.hexes === 10 && semEst.via === 'trilha' && semEst.pts.length === 2, 'sem estrada: em linha reta: ' + j(semEst.pts));
  const fechado = N.tracarRota(base([reg, { id: 'pc', k: 'e', x: 240, y: 69.28, tipo: 'ponte', r: 12, ini: 0, peso: N.pesoPadrao('ponte') }]), { x: 40, y: 69.28 }, { x: 240, y: 69.28 });
  ok(!fechado.ok && fechado.msg === 'Não há caminho: um evento fecha a passagem', 'onde um evento fecha a passagem, não passa');
  ok(!N.tracarRota(N.normalizarMapa({}), { x: 0, y: 0 }, { x: 200, y: 0 }).ok && !N.tracarRota(mt, { x: 0, y: 0 }, { x: 3, y: 2 }).ok, 'sem grade, ou no mesmo hexágono: não traça');
  // quem joga
  const pj = N.projetar(base([{ id: 'rt', k: 't', pts: [[0, 0], [80, 0]], esc: true }, { id: 'c', k: 'g', x: 0, y: 0, rota: 'rt', tipo: 'caravana', modo: 'volta', sentido: -1, paradas: [{ x: 40, y: 0, n: 1 }], espera: 2 },
    { id: 'h', k: 'g', x: 0, y: 0, tipo: 'patrulha', oculto: true }, { id: 'e', k: 'e', x: 0, y: 0, tipo: 'migracao', ini: 0, rota: 'rt', pt: 3, modo: 'volta' }]));
  const pc = pj.objs.find(o => o.id === 'c'), pe = pj.objs.find(o => o.id === 'e');
  ok(!pj.objs.some(o => o.id === 'rt' || o.id === 'h') && pc.tipo === 'caravana' && pc.rota === null && !('modo' in pc) && !('paradas' in pc) && !('espera' in pc) && !('sentido' in pc) && pe && !('rota' in pe) && !('pt' in pe) && !('modo' in pe),
    'quem joga: sem a rota escondida, sem o grupo escondido, sem o jeito de andar nem as paradas; o evento sem a rota');
}

/* ================= lote 7, parte 5c: o clima do dia e as zonas de perigo ================= */
{
  const J = require(path.join(__dirname, '..', '..', 'jornal', 'nucleo.js'));
  ok(j(Object.keys(N.CLIMAS)) === j(Object.keys(J.CLIMAS)) && Object.keys(N.CLIMAS).every(k => N.CLIMAS[k].nome === J.CLIMAS[k].nome && N.CLIMAS[k].svg === J.CLIMAS[k].svg && typeof N.CLIMAS[k].conf === 'number'),
    'os climas do mapa são os do Jornal (e da Meditação), com o mesmo nome e o mesmo desenho');
  ok(j([...Array(12).keys()].map(i => N.estacaoDoMes(i, 12))) === j(['inverno', 'inverno', 'primavera', 'primavera', 'primavera', 'verao', 'verao', 'verao', 'outono', 'outono', 'outono', 'inverno'])
    && Object.values(N.CLIMA_ESTACOES).every(t => Object.values(t).reduce((a, b) => a + b, 0) === 100), 'as estações dos 12 meses; cada tabela de começo soma 100%');
  // a normalização
  const c1 = N.normalizarMapa({ id: 'mpc', cal: { meses: [{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }, { nome: 'D' }] }, clima: { tab: [{ chuva: 150, sol: '40' }, null, { neve: 0 }], mao: { d: '3', k: 'neve' }, hoje: 'xyz' } }).clima;
  ok(c1.tab.length === 4 && c1.tab[0].chuva === 100 && c1.tab[0].sol === 40 && c1.tab[0].neve === 0 && j(c1.tab[1]) === j(N.tabelaPadraoDoMes(1, 4)) && j(c1.tab[2]) === j(N.tabelaPadraoDoMes(2, 4)) && j(c1.mao) === j({ d: 3, k: 'neve' }) && !('hoje' in c1),
    'a tabela: um mês por linha (o que falta, o de começo; até 100%); o de hoje à mão: ' + j(c1));
  ok(!('clima' in N.normalizarMapa({ objs: [] })), 'o mapa de antes, sem clima, fica igual');
  // o sorteio: o mesmo dia dá o mesmo clima; os dias variam
  const base = (extra, objs) => N.normalizarMapa(Object.assign({ id: 'mpc', larg: 400, alt: 300, grade: { tam: 20, x: 0, y: 0, orient: 'pe', on: true }, cal: { dia: 40 }, objs: objs || [] }, extra || {}));
  const m1 = base();
  const dias = [...Array(90).keys()].map(d => N.climaSorteado(m1, d));
  ok(dias.every((k, d) => N.climaSorteado(m1, d) === k) && new Set(dias).size >= 4 && dias.every(k => N.CLIMAS[k]), 'o sorteio do dia sai sempre igual, e os dias variam: ' + [...new Set(dias)].join(', '));
  // as chances do mês valem: com 100% de chuva, sempre chuva; e a região ajusta lendo o mesmo número do dia
  const tab12 = [...Array(12)].map(() => ({ sol: 50, neve: 50 }));
  const m2 = base({ clima: { tab: tab12 } }, [
    { id: 'rd', k: 'r', pts: [[0, 0], [200, 0], [200, 300], [0, 300]], clima: { neve: 'nunca' } },
    { id: 'rg', k: 'r', pts: [[200, 0], [400, 0], [400, 300], [200, 300]], clima: { sol: 'nunca' } },
    { id: 'ri', k: 'r', pts: [[10, 10], [60, 10], [60, 60], [10, 60]], pai: 'rd' }]);
  const rd = m2.objs[0], rg = m2.objs[1];
  const mundo = [...Array(200).keys()].map(d => N.climaSorteado(m2, d)), deserto = [...Array(200).keys()].map(d => N.climaSorteado(m2, d, rd)), gelo = [...Array(200).keys()].map(d => N.climaSorteado(m2, d, rg));
  ok(new Set(mundo).size === 2 && deserto.every(k => k === 'sol') && gelo.every(k => k === 'neve'), 'as chances do mês e o ajuste da região (nunca neve; nunca sol)');
  ok(mundo.every((k, d) => k === 'sol' ? deserto[d] === 'sol' : gelo[d] === 'neve'), '(o número do dia é o mesmo: a região só muda as chances)');
  const meio = [...Array(400).keys()].map(d => N.climaSorteado(base({ clima: { tab: [...Array(12)].map(() => ({ sol: 75, chuva: 25 })) } }), d));
  const sol = meio.filter(k => k === 'sol').length;
  ok(sol > 250 && sol < 350, 'a chance: 75% de sol sai em cerca de três de cada quatro dias: ' + sol + ' de 400');
  // o de hoje à mão (só naquele dia), e o clima num ponto
  const m3 = base({ clima: { tab: tab12, mao: { d: 40, k: 'tempestade' } } }, m2.objs);
  ok(j(N.climaDoDia(m3, 40)) === j({ k: 'tempestade', mao: true }) && !N.climaDoDia(m3, 41).mao, 'o de hoje escolhido à mão vale só hoje');
  const p1 = N.climaNoPonto(m3, 30, 30), p2 = N.climaNoPonto(m3, 300, 100);
  ok(p1.regiao && p1.regiao.id === 'rd' && p1.k === 'sol' && p2.regiao.id === 'rg' && p2.k === 'neve', 'num ponto: a região mais de dentro com ajuste (a de dentro sem ajuste usa a de fora)');
  const m4 = base({ clima: { tab: tab12 } }, [Object.assign({}, m2.objs[0], { chj: { d: 40, k: 'vento' } })]);
  ok(N.climaNoPonto(m4, 30, 30).k === 'vento' && N.climaNoPonto(m4, 30, 30).mao, 'a região com o de hoje escolhido à mão');
  // as zonas de perigo
  const zs = N.normalizarMapa({ cal: { dia: 5 }, objs: [
    { id: 'z1', k: 'z', tipo: 'frio', pts: [[0, 0], [100, 0], [100, 100], [0, 100]], ini: 0 },
    { id: 'z2', k: 'z', tipo: 'maldita', pts: [[50, 50], [150, 50], [150, 150], [50, 150]], ini: 0, ef: { fad: -9, conf: 20, san: '-7' } },
    { id: 'z3', k: 'z', tipo: 'praga', pts: [[0, 0], [100, 0], [100, 100], [0, 100]], ini: 9 },
    { id: 'z4', k: 'z', pts: [[0, 0], [100, 0], [100, 100], [0, 100]], ini: 0 },
    { id: 'z5', k: 'z', tipo: 'xyz', pts: [[0, 0], [100, 0], [100, 100], [0, 100]], ini: 0 }] });
  const [z1, z2, , z4, z5] = zs.objs;
  ok(z1.tipo === 'frio' && !('ef' in z1) && j(N.efeitoDasZonas([z1])) === j(N.ZONAS.frio.ef) && j(z2.ef) === j({ fad: -5, conf: 20, san: -7 }) && !('tipo' in z4) && !('ef' in z4) && !('tipo' in z5),
    'a zona de perigo: o tipo e os números (sem eles, os de começo do tipo; os do mestre, nos limites); a de guerra, sem tipo');
  const aqui = N.zonasNoPonto(zs, 75, 75), ef = N.efeitoDasZonas(aqui);
  ok(j(aqui.map(z => z.id)) === j(['z1', 'z2']) && j(ef) === j({ fad: -6, conf: 10, san: -7 }) && !N.zonasNoPonto(zs, 120, 20).length, 'num ponto: as zonas acontecendo hoje (a que começa no dia 9 e a de guerra não contam), e o que mexem juntas: ' + j(ef));
  // quem joga: o clima de hoje pronto, sem a tabela, os ajustes e os números das zonas
  const pj = N.projetar(base({ clima: { tab: tab12, mao: { d: 40, k: 'chuva' } } }, m2.objs.concat([{ id: 'g', k: 'g', x: 300, y: 100 }, { id: 'zz', k: 'z', tipo: 'frio', pts: [[0, 0], [100, 0], [100, 100], [0, 100]], ini: 0 }])));
  const prd = pj.objs.find(o => o.id === 'rd'), pri = pj.objs.find(o => o.id === 'ri'), pg = pj.objs.find(o => o.id === 'g'), pz = pj.objs.find(o => o.id === 'zz');
  ok(j(pj.clima) === j({ hoje: 'chuva' }) && prd.ch === N.climaDoDia(m2, 40, rd).k && !('clima' in prd) && !('ch' in pri) && pg.ch === 'neve' && pz.tipo === 'frio' && !('ef' in pz),
    'quem joga: o clima de hoje pronto (o do mundo, o das regiões com ajuste, o de onde cada grupo está), sem a tabela, os ajustes e os números das zonas');
  const pn = N.normalizarMapa(pj);
  ok(N.climaDoDia(pn, 40).k === 'chuva' && N.climaNoPonto(pn, 30, 30).k === prd.ch && N.climaNoPonto(pn, 300, 100).k === 'neve', '(e o mapa de quem joga lê o clima de hoje pronto)');
}

/* ================= lote 8 (parte 3): a facção do grupo e a bandeira do clã na facção ================= */
{
  const M8 = N.normalizarMapa({ faccoes: [{ id: 'fa', nome: 'Aldar', br: { forma: 'escudo', div: 'partido', cores: ['#24305E', '#d9a441'], simb: 'lua', img: 'https://x.supabase.co/b.png' } }, { id: 'fb', nome: 'Vale', br: { cores: ['#111111'] } }, { id: 'fc', nome: 'Segredo', oculta: true }],
    objs: [{ k: 'g', id: 'g1', x: 1, y: 1, fac: 'fa' }, { k: 'g', id: 'g2', x: 1, y: 1, fac: 'nada' }, { k: 'g', id: 'g3', x: 1, y: 1, fac: 'fc' }, { k: 'g', id: 'g4', x: 1, y: 1 }] });
  const gf = id => M8.objs.find(o => o.id === id).fac;
  ok(gf('g1') === 'fa' && gf('g2') === null && gf('g3') === 'fc' && gf('g4') === null, 'o grupo tem uma facção (a que não existe vira nenhuma)');
  ok(j(M8.faccoes[0].br) === j({ forma: 'escudo', div: 'partido', cores: ['#24305e', '#d9a441'], simb: 'lua', img: 'https://x.supabase.co/b.png' }) && !('br' in M8.faccoes[1]) && !('br' in M8.faccoes[2]),
    'a bandeira na facção (a que a projeção leva): forma, divisão, as duas cores, o símbolo e a imagem do banco; incompleta, não vale');
  ok(j(N.normBr({ forma: '<x>', div: 'partido', cores: ['#000000', '#ffffff'], simb: 'a b', img: 'javascript:alert(1)' })) === j({ forma: 'escudo', div: 'partido', cores: ['#000000', '#ffffff'], simb: null, img: null }), 'o que não presta na bandeira volta ao comum (ou sai)');
  const P8 = N.projetar(M8);
  ok(P8.objs.find(o => o.id === 'g1').fac === 'fa' && P8.objs.find(o => o.id === 'g3').fac === null && P8.faccoes.length === 2 && P8.faccoes[0].br.cores[0] === '#24305e', 'na projeção: o grupo de facção escondida vai sem ela; a bandeira vai com a facção');
}

end();
