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
ok(j(N.RITMOS) === j({ lento: { nome: 'Lento', km: 20 }, normal: { nome: 'Normal', km: 30 }, rapido: { nome: 'Rápido', km: 40 } }), 'ritmos como no contrato');
ok(N.VIAS.estrada.mult === 1.25 && N.VIAS.trilha.mult === 1 && N.VIAS.selvagem.mult === 0.6 && N.VIAS.rio.mult === 1.5 && N.VIAS.mar.mult === 2.5 && N.VIAS.mar.nome === 'Mar (navio)', 'vias como no contrato');
ok(j(N.RELACOES) === j({ alianca: 'Aliança', neutra: 'Neutra', tensao: 'Tensão', guerra: 'Guerra' }), 'relações como no contrato');
ok(N.CAL_PADRAO.meses.length === 12 && N.CAL_PADRAO.meses.every(m => m.dias === 30 && m.nome) && N.CAL_PADRAO.ano0 === 1 && N.CAL_PADRAO.era === '', 'calendário padrão: 12 meses de 30 dias');

/* ================= criação ================= */
{
  const a = N.novoId('mp'), b = N.novoId('mp');
  ok(/^mp_[a-z0-9]+$/.test(a) && a !== b, 'novoId: prefixo e sem repetir (' + a + ')');
  const m = N.mapaNovo('Terra Média');
  ok(m.v === 1 && /^mp_/.test(m.id) && m.nome === 'Terra Média' && m.oculto === false && m.img === null && m.larg === 2000 && m.alt === 1400, 'mapaNovo: padrões do contrato');
  ok(m.escala.kmPorUn === 0 && m.cal.dia === 0 && m.cal.meses.length === 12 && m.nevoa.on === false && m.nevoa.ops.length === 0 && m.faccoes.length === 0 && m.objs.length === 0, 'mapaNovo: escala, calendário, névoa e listas vazias');
  ok(N.mapaNovo('', { larg: 800, alt: 600 }).nome === 'Mundo conhecido' && N.mapaNovo('x', { larg: 800, alt: 600 }).larg === 800, 'mapaNovo: nome padrão e papel em branco do tamanho pedido');
  const c = N.mapaNovo('Com imagem', { img: { url: 'https://exemplo.com/a.jpg', w: 4000, h: 2800 }, larg: 10, alt: 10 });
  ok(c.larg === 4000 && c.alt === 2800 && c.img.url === 'https://exemplo.com/a.jpg', 'mapaNovo com imagem: o tamanho do mundo é o da imagem');
  m.cal.meses[0].nome = 'mexido';
  ok(N.CAL_PADRAO.meses[0].nome === 'Alvorada', 'mapaNovo copia o calendário padrão (não compartilha)');

  const tipos = { m: ['x', 'y', 'ic', 'cor', 'rumor', 'falso'], g: ['x', 'y', 'cor', 'sigla', 'ritmo', 'rota', 'prog'], r: ['pts', 'fac', 'cor', 'enc'], e: ['x', 'y', 'tipo', 'r', 'ini', 'fim', 'cresce', 'forca'], t: ['pts', 'via'], f: ['pts', 'a', 'b', 'ativa'] };
  for (const k in tipos) {
    const o = N.objNovo(k);
    ok(o && o.k === k && o.id && o.nome === '' && o.txt === '' && o.nota === '' && o.oculto === false && tipos[k].every(c2 => c2 in o), 'objNovo(' + k + ') tem os campos comuns e os do tipo');
  }
  ok(N.objNovo('m', { x: 10, y: 20, ic: 'castelo' }).ic === 'castelo' && N.objNovo('g').sigla === 'GR' && N.objNovo('g').ritmo === 'normal' && N.objNovo('e').r === 80 && N.objNovo('t').via === 'trilha' && N.objNovo('f').ativa === true, 'objNovo: padrões e campos passados');
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

/* ================= escala e viagem ================= */
{
  const base = N.normalizarMapa({
    escala: { kmPorUn: 0.5 }, cal: { dia: 3 },
    objs: [
      { id: 'rt1', k: 't', pts: [[0, 0], [100, 0], [100, 100]], via: 'estrada' },            // 200 un = 100 km
      { id: 'g1', k: 'g', x: 0, y: 0, ritmo: 'normal', rota: 'rt1', prog: 0 },
      { id: 'g2', k: 'g', x: 5, y: 5, ritmo: 'lento' },
      { id: 'g3', k: 'g', x: 100, y: 80, ritmo: 'rapido', rota: 'rt1', prog: 90 },              // 90 km = 180 un: em (100, 80)
    ],
  });
  ok(N.kmDe(base, 200) === 100 && N.unidadesDe(base, 100) === 200 && N.unidadesDe({ escala: { kmPorUn: 0 } }, 50) === 0, 'km ↔ unidades');
  ok(N.kmPorDia(base, base.objs[1]) === 37.5 && N.kmPorDia(base, base.objs[2]) === 20 && N.kmPorDia(base, Object.assign({}, base.objs[3], { rota: null })) === 40, 'km por dia = ritmo × via (sem rota, só o ritmo)');
  const antes = j(base);
  const a = N.andarUmDia(base, 'g1');
  ok(a.ok && a.km === 37.5 && a.prog === 37.5 && a.x === 75 && a.y === 0 && !a.chegou, 'andar 1 dia pela estrada: 37,5 km = 75 unidades: ' + j(a));
  ok(j(base) === antes, 'andarUmDia não muda o mapa');
  const b = N.andarUmDia(base, 'g3');
  ok(b.ok && b.chegou && b.prog === 100 && b.km === 10 && b.x === 100 && b.y === 100 && /fim da rota/.test(b.msg), 'chega ao fim: anda só o que falta');
  const fim = N.andarUmDia(N.normalizarMapa(Object.assign(N.copia(base), { objs: base.objs.map(o => (o.id === 'g3' ? Object.assign({}, o, { prog: 100, x: 100, y: 100 }) : o)) })), 'g3');
  ok(!fim.ok && fim.chegou && fim.msg === 'Chegou ao fim da rota' && fim.x === 100 && fim.y === 100, 'já no fim: não anda (e fica no fim da rota, não no começo): ' + j(fim));
  ok(j(N.pontoNaPolilinha([[0, 0], [100, 0], [100, 100]], Infinity)) === j({ x: 100, y: 100, fim: true, i: 1 }), 'pontoNaPolilinha até o infinito: o último ponto');
  // o grupo anda de onde está: arrastado na rota (ou com a escala trocada), segue dali; longe dela, não anda
  const mexido = g => N.normalizarMapa(Object.assign(N.copia(base), { objs: base.objs.map(o => (o.id === 'g1' ? Object.assign({}, o, g) : o)) }));
  const arr = N.andarUmDia(mexido({ x: 100, y: 20, prog: 0 }), 'g1');               // 120 un = 60 km já andados
  ok(arr.ok && arr.prog === 97.5 && arr.km === 37.5 && arr.x === 100 && arr.y === 95, 'grupo arrastado pela rota: anda dali, não do começo: ' + j(arr));
  const esc = N.andarUmDia(mexido({ x: 75, y: 0, prog: 75 }), 'g1');               // prog de outra escala (75 km = 150 un)
  ok(esc.ok && esc.prog === 75 && esc.x === 100 && esc.y === 50, 'progresso de outra escala: o lugar do grupo vale: ' + j(esc));
  const fora = N.andarUmDia(mexido({ x: 900, y: 900, prog: 0 }), 'g1');
  ok(!fora.ok && fora.x === 900 && /longe da rota/.test(fora.msg), 'grupo longe da rota: não salta para ela: ' + fora.msg);
  ok(N.andarUmDia(base, 'g2').msg === 'Sem rota' && !N.andarUmDia(base, 'g2').ok, 'sem rota: avisa');
  const semEscala = N.normalizarMapa(Object.assign(N.copia(base), { escala: { kmPorUn: 0 } }));
  ok(N.andarUmDia(semEscala, 'g1').msg === 'Defina a escala do mapa primeiro', 'sem escala: avisa');
  ok(N.andarUmDia(base, 'nada').ok === false, 'grupo que não existe: não anda');
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
  const lixos = [null, undefined, 42, 'texto', true, [], [1, 2], { objs: 'x' }, { objs: [null, 3, 'a', [], { k: 'zz' }] }, { faccoes: 'x', nevoa: [], cal: 5, escala: 'x', img: 7 },
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

  const m = N.normalizarMapa({ id: 'mp_x', nome: 7, larg: '800', alt: 'NaN', escala: { kmPorUn: '2.5' }, cal: { dia: '12', ano0: '1023', meses: [{ nome: 'Um', dias: '12' }] },
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
  ok(m.larg === 800 && m.alt === 1400 && m.escala.kmPorUn === 2.5 && m.cal.dia === 12 && m.cal.ano0 === 1023 && m.cal.meses[0].dias === 12, 'números como texto viram números; NaN usa o padrão');
  const ids = m.objs.map(o => o.id);
  ok(new Set(ids).size === ids.length && ids[0] === 'a' && ids[1] === 'a_2', 'ids repetidos ganham um nome novo previsível: ' + ids.join(','));
  ok(!ids.includes('b') && !ids.includes('c'), 'objeto sem posição válida (NaN, infinito) sai');
  const a = m.objs[0];
  ok(a.x === 10 && a.y === 20.5 && a.ic === 'cidade' && a.cor === '' && a.rumor === true, 'marcador: números, ícone desconhecido, cor inválida, "true" como texto');
  const g = m.objs.find(o => o.k === 'g');
  ok(g.sigla === 'GRU' && g.ritmo === 'normal' && g.rota === null && g.prog === 0, 'grupo: sigla de até 3 letras, ritmo desconhecido, rota que não existe vira null');
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

/* ================= troca de imagem: tudo acompanha ================= */
{
  const M = N.normalizarMapa({ larg: 1000, alt: 500, escala: { kmPorUn: 2 }, nevoa: { on: true, ops: [{ t: '+', x: 100, y: 100, r: 10 }] },
    objs: [{ id: 'a', k: 'm', x: 100, y: 50 }, { id: 'e', k: 'e', x: 10, y: 10, r: 20, ini: 0 }, { id: 't', k: 't', pts: [[0, 0], [100, 0]] }] });
  const E = N.escalarMapa(M, 2, 2);
  ok(E.objs[0].x === 200 && E.objs[0].y === 100 && E.objs[1].r === 40 && j(E.objs[2].pts) === '[[0,0],[200,0]]', 'escalar: posições, raios e linhas acompanham');
  ok(E.escala.kmPorUn === 1 && N.kmDe(E, N.compPolilinha(E.objs[2].pts)) === N.kmDe(M, N.compPolilinha(M.objs[2].pts)), 'escalar: as distâncias em km continuam as mesmas');
  ok(E.nevoa.ops[0].x === 200 && E.nevoa.ops[0].r === 20 && E.larg === 2000, 'escalar: a névoa e o papel acompanham');
  ok(j(N.escalarMapa(M, 1, 1)) === j(M), 'escala 1: nada muda');
}

end();
