// Lote 11, as contas do Mapa-múndi (sem navegador):
//   · (parte 1) a corte: os personagens e as casas normalizados (os campos, o gênero, as datas do mundo — o ano, o mês e
//     o dia, conferidos pelo calendário —, os limites, os cargos de cada facção), as referências com o mapa todo (a
//     facção, a casa, o cargo da facção ou os de começo, o lugar — um marcador ou um grupo —, os pais e os cônjuges que
//     existem; os cônjuges dos dois lados; ninguém antepassado de si mesmo; o chefe da casa é da casa), a projeção (só os
//     conhecidos, sem a nota nem a ficha; os laços só entre conhecidos; o lugar só se eles o veem; a facção escondida não
//     vai; a casa com algum conhecido, o chefe só se conhecido; os cargos das facções que vão) e as contas da corte
//     (os cargos, a idade — antes e depois do aniversário, na morte, ainda por nascer —, a data em texto, os pais, os
//     filhos, os cônjuges, os descendentes, quem está num lugar, os membros de uma casa, os laços pelo gênero).
const N = require('../../mundo/nucleo.js');
const C = require('../../mundo/corte.js');
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FALHOU: ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' — esperado ' + JSON.stringify(b) + ', veio ' + JSON.stringify(a));
const j = JSON.stringify;

/* ---- (parte 1) a corte normalizada ---- */
{
  const CAL = { dia: 0, ano0: 300, meses: [{ nome: 'Degelo', dias: 30 }, { nome: 'Semeadura', dias: 31 }, { nome: 'Colheita', dias: 28 }], era: 'DR' };
  const m = N.normalizarMapa({ nome: 'M', cal: CAL, faccoes: [{ id: 'fa', nome: 'Aldar' }, { id: 'fb', nome: 'Vale', oculta: true }, { id: 'fc', nome: 'Ilhas' }],
    objs: [{ id: 'c1', k: 'm', x: 10, y: 10, nome: 'Alta' }, { id: 'g1', k: 'g', x: 20, y: 20, nome: 'Hoste' }, { id: 'r1', k: 'r', pts: [[0, 0], [100, 0], [100, 100]] }],
    corte: {
      casas: [{ id: 'cv', nome: '  Casa do Vale ', lema: 'Firmes', chefe: 'p1', br: { forma: 'escudo', div: 'partido', cores: ['#123456', '#abcdef'], simb: null, img: null } },
        { id: 'cv', nome: 'repetida' }, { id: 'ce', nome: '', chefe: 'p3', br: 'azul' }, 'lixo'],
      pessoas: [
        { id: 'p1', nome: ' Ana ', gen: 'm', casa: 'cv', fac: 'fa', cargo: 'marechal', nasc: { a: 270, m: 1, d: 5 }, onde: { t: 'm', id: 'c1' }, ver: true, nota: 'segredo', txt: 'A marechal.', conj: ['p2', 'p2', 'p1', 'p5'], ficha: 'pc1' },
        { id: 'p2', nome: 'Bento', gen: 'h', casa: 'cv', fac: 'fb', cargo: 'marechal', pais: ['p3'], ver: false, onde: { t: 'm', id: 'g1' } },
        { id: 'p3', nome: 'Caio', gen: 'x', pais: ['p2', 'p9'], ver: 'sim', onde: { t: 'g', id: 'g1' }, casa: 'nenhuma', nasc: { a: 'x' } },
        { id: 'p4', nome: '', pais: ['p1', 'p2', 'p3'], ver: true, morte: { a: 301, m: 2, d: 40 }, nasc: { a: 280, m: 7, d: 3 }, fac: 'fa', cargo: 'rei' },
        { id: 'p1', nome: 'Ana de novo' }, { id: 'p5', nome: 'Eva', fac: 'fa', cargo: 'bobo', onde: { t: 'r', id: 'r1' }, conj: ['p6', 'p7', 'p8', 'p9', 'p1'] },
        { id: 'p6', nome: 'F', conj: ['p5'], pais: ['zz', 'p7'] }, { id: 'p7', nome: 'G', fac: 'fz' }, { id: 'p8', nome: 'H', pais: ['p3'] }, { id: 'p9', nome: 'I' }],
      cargos: { fa: [{ id: 'marechal', nome: 'Grão-marechal' }, { id: 'bobo', nome: '' }, { id: 'bobo', nome: 'repetido' }], fx: [{ id: 'x', nome: 'X' }], fb: 'lixo', fc: [{ id: 'almirante', nome: 'Almirante' }] } } });
  const c = m.corte, P = id => c.pessoas.find(p => p.id === id);
  eq(c.casas.map(x => [x.id, x.nome, x.lema, x.chefe, !!x.br]), [['cv', 'Casa do Vale', 'Firmes', 'p1', true], ['ce', 'Casa', '', null, false]], 'as casas: sem as repetidas; o nome que falta vira "Casa"; o brasão que não serve sai; o chefe tem de ser da casa');
  eq(c.pessoas.map(p => p.id), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'], 'os personagens: sem os repetidos');
  eq(Object.keys(P('p1')), ['id', 'nome', 'gen', 'casa', 'fac', 'cargo', 'nasc', 'morte', 'pais', 'conj', 'onde', 'ficha', 'txt', 'nota', 'ver'], 'cada personagem com os campos de sempre, nesta ordem');
  eq([P('p1').nome, P('p4').nome, P('p3').gen, P('p3').ver, P('p3').casa, P('p3').nasc], ['Ana', 'Sem nome', '', true, null, null], 'o nome (sem o vazio), o gênero que não existe, o "conhecem" (sim), a casa que não existe, a data sem o ano');
  eq([P('p1').nasc, P('p4').nasc, P('p4').morte], [{ a: 270, m: 1, d: 5 }, { a: 280 }, { a: 301, m: 2, d: 28 }], 'as datas: o mês que não existe sai (e o dia com ele); o dia passa do mês: fica no último');
  eq([P('p2').fac, P('p2').cargo, P('p4').cargo, P('p5').cargo], ['fb', 'marechal', null, 'bobo'], 'o cargo: da lista da facção (a do Vale não foi guardada: vale a de começo, que tem o marechal); o que não está na lista sai');
  eq(c.cargos, { fa: [{ id: 'marechal', nome: 'Grão-marechal' }, { id: 'bobo', nome: 'Cargo' }], fc: [{ id: 'almirante', nome: 'Almirante' }] }, 'os cargos: só das facções que existem e só listas (sem os repetidos; o nome que falta vira "Cargo")');
  eq([P('p7').fac, P('p6').pais], [null, ['p7']], 'a facção que não existe sai; o pai que não existe sai');
  eq([P('p1').onde, P('p2').onde, P('p3').onde, P('p5').onde], [{ t: 'm', id: 'c1' }, null, { t: 'g', id: 'g1' }, null], 'o lugar: um marcador ou um grupo que existam (o tipo tem de bater; região não)');
  eq([P('p1').conj, P('p2').conj], [['p2'], ['p1']], 'os cônjuges: sem repetir, sem a própria pessoa, dos dois lados');
  eq([P('p5').conj, P('p6').conj, P('p1').conj], [['p6', 'p7', 'p8', 'p9'], ['p5'], ['p2']], 'até quatro cônjuges (o quinto sai); o que não cabe do outro lado sai dos dois (a Ana não entra na lista cheia da Eva)');
  eq([P('p2').pais, P('p3').pais, P('p4').pais], [[], ['p2', 'p9'], ['p1', 'p2']], 'os pais: até dois, que existam; o pai que fecharia um círculo sai (ninguém é antepassado de si mesmo)');
  eq(P('p1').ficha, 'pc1', 'a ficha das Fichas fica');
  ok(!('corte' in N.normalizarMapa({ nome: 'M', corte: { pessoas: [], casas: 'x' } })) && !('corte' in N.normalizarMapa({ nome: 'M' })), 'sem nada na corte, nada fica (o mapa de antes fica igual)');
  const lim = N.normalizarMapa({ nome: 'M', corte: { pessoas: Array.from({ length: 450 }, (_, i) => ({ id: 'q' + i, nome: 'Q' + i })), casas: Array.from({ length: 90 }, (_, i) => ({ id: 'k' + i })) } }).corte;
  ok(lim.pessoas.length === N.LIMITES.personagens && lim.casas.length === N.LIMITES.casas, 'os limites: ' + N.LIMITES.personagens + ' personagens e ' + N.LIMITES.casas + ' casas');
  // o Bento é do Vale (escondida): no mapa do mestre, a facção fica
  eq(P('p2').fac, 'fb', 'a facção escondida continua no mapa do mestre');

  // a projeção
  const p = N.projetar(m), pc = p.corte, Q = id => pc.pessoas.find(x => x.id === id);
  eq(pc.pessoas.map(x => x.id), ['p1', 'p3', 'p4'], 'na projeção, só os personagens que os jogadores conhecem');
  eq([Q('p1').nota, Q('p1').ficha, Q('p1').txt], ['', null, 'A marechal.'], 'sem a nota do mestre nem a ficha; com o que os jogadores sabem');
  eq([Q('p1').conj, Q('p3').pais, Q('p4').pais], [[], [], ['p1']], 'os laços, só entre conhecidos');
  eq([Q('p1').onde, Q('p3').onde], [{ t: 'm', id: 'c1' }, { t: 'g', id: 'g1' }], 'o lugar que eles veem vai');
  const pOculto = N.projetar(N.normalizarMapa(Object.assign(JSON.parse(j(m)), { objs: JSON.parse(j(m.objs)).map(o => Object.assign(o, { oculto: o.id === 'c1' })) })));
  ok(pOculto.corte.pessoas.find(x => x.id === 'p1').onde === null, 'o lugar escondido não vai (o personagem fica sem lugar para eles)');
  eq(pc.casas.map(x => [x.id, x.chefe]), [['cv', 'p1']], 'a casa vai se algum membro é conhecido (com o chefe conhecido)');
  const semChefe = N.projetar(N.normalizarMapa(Object.assign(JSON.parse(j(m)), { corte: Object.assign(JSON.parse(j(m.corte)), { pessoas: JSON.parse(j(m.corte.pessoas)).map(x => Object.assign(x, { ver: x.id === 'p2' ? true : x.id === 'p1' ? false : x.ver })) }) })));
  eq(semChefe.corte.casas.map(x => [x.id, x.chefe]), [['cv', null]], 'o chefe que eles não conhecem não vai');
  eq(semChefe.corte.pessoas.find(x => x.id === 'p2').fac, null, 'a facção escondida não vai');
  eq(pc.cargos, { fa: [{ id: 'marechal', nome: 'Grão-marechal' }, { id: 'bobo', nome: 'Cargo' }] }, 'os cargos das facções que vão (para o nome do cargo)');
  ok(j(N.normalizarMapa(p)) === j(p), 'o que chega aos jogadores passa igual pela normalização deles');
  ok(!('corte' in N.projetar(N.normalizarMapa(Object.assign(JSON.parse(j(m)), { corte: Object.assign(JSON.parse(j(m.corte)), { pessoas: JSON.parse(j(m.corte.pessoas)).map(x => Object.assign(x, { ver: false })) }) })))), 'ninguém conhecido: a corte nem vai');

  // as contas da corte
  eq(C.cargosDe(m, 'fa').map(x => x.nome), ['Grão-marechal', 'Cargo'], 'os cargos de uma facção: os guardados');
  eq(C.cargosDe(m, 'fb').map(x => x.id), N.CARGOS_INICIAIS.map(x => x.id), 'sem a lista guardada: os de começo');
  eq(C.cargosDe(m, null), [], 'sem facção: nenhum');
  eq(C.cargoDe(m, P('p1')).nome, 'Grão-marechal', 'o cargo de um personagem, com o nome da lista');
  const hoje = C.hoje(m);
  eq(hoje, { a: 300, m: 0, d: 1 }, 'hoje (o dia 0 do mapa: 1 de Degelo do ano 300)');
  eq([C.idadeDe(m, P('p1')), C.idadeDe(m, P('p4')), C.idadeDe(m, P('p2'))], [29, 21, null], 'a idade: antes do aniversário, um ano a menos (Ana, nascida em 5 de Semeadura de 270: 29); na morte, só pelos anos quando falta o mês do nascimento (21); sem o nascimento, nada');
  const m2 = N.normalizarMapa(Object.assign(JSON.parse(j(m)), { cal: Object.assign({}, CAL, { dia: 35 }) }));
  eq([C.hoje(m2), C.idadeDe(m2, m2.corte.pessoas[0])], [{ a: 300, m: 1, d: 6 }, 30], 'depois do aniversário (6 de Semeadura): 30');
  eq(C.idadeDe(m, { nasc: { a: 305 } }), -5, 'ainda por nascer: a idade negativa');
  eq([C.dataTxt(m, P('p1').nasc), C.dataTxt(m, { a: 301, m: 2 }), C.dataTxt(m, { a: -12 }), C.dataTxt(m, null)], ['5 de Semeadura, ano 270 DR', 'Colheita do ano 301 DR', 'ano -12 DR', ''], 'a data em texto: tudo, o mês e o ano, só o ano (com a era); sem a data, nada');
  eq([C.paisDe(m, P('p4')).map(x => x.id), C.filhosDe(m, P('p1')).map(x => x.id), C.conjugesDe(m, P('p1')).map(x => x.id)], [['p1', 'p2'], ['p4'], ['p2']], 'os pais, os filhos e os cônjuges');
  eq([...C.descendentesDe(m, 'p2')].sort(), ['p3', 'p4', 'p8'], 'os descendentes (os filhos e os netos)');
  eq([C.quemEsta(m, 'c1').map(x => x.id), C.quemEsta(m, 'g1').map(x => x.id), C.quemEsta(m, null)], [['p1'], ['p3'], []], 'quem está num lugar');
  const m3 = N.normalizarMapa(Object.assign(JSON.parse(j(m)), { corte: Object.assign(JSON.parse(j(m.corte)), { pessoas: JSON.parse(j(m.corte.pessoas)).map(x => Object.assign(x, x.id === 'p3' ? { morte: { a: 299 } } : {})) }) }));
  eq(C.quemEsta(m3, 'g1'), [], 'o morto não está em lugar nenhum');
  eq([C.membrosDe(m3, 'cv').map(x => x.id), C.membrosDe(m3, null).map(x => x.id)], [['p1', 'p2'], ['p5', 'p6', 'p7', 'p8', 'p9', 'p3', 'p4']], 'os membros de uma casa (os vivos primeiro); os sem casa (os mortos no fim)');
  eq([C.laco('pai', P('p1')), C.laco('pai', P('p2')), C.laco('filho', P('p1')), C.laco('conj', P('p2')), C.laco('conj', P('p3'))], ['mãe', 'pai', 'filha', 'marido', 'cônjuge'], 'os laços pelo gênero (sem ele, o neutro)');
  ok(C.vivo(P('p1')) && !C.vivo(P('p4')) && C.pessoaDe(m, 'xx') === null && C.casaDe(m, 'cv').nome === 'Casa do Vale' && C.corteDe({}).pessoas.length === 0, 'vivo, achar um personagem, uma casa; o mapa sem corte');
}

console.log(bad ? bad + ' falharam de ' + n : n + ' verificações passaram');
process.exit(bad ? 1 : 0);
