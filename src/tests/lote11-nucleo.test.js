// Lote 11, as contas do Mapa-múndi (sem navegador):
//   · (parte 1) a corte: os personagens e as casas normalizados (os campos, o gênero, as datas do mundo — o ano, o mês e
//     o dia, conferidos pelo calendário —, os limites, os cargos de cada facção), as referências com o mapa todo (a
//     facção, a casa, o cargo da facção ou os de começo, o lugar — um marcador ou um grupo —, os pais e os cônjuges que
//     existem; os cônjuges dos dois lados; ninguém antepassado de si mesmo; o chefe da casa é da casa), a projeção (só os
//     conhecidos, sem a nota nem a ficha; os laços só entre conhecidos; o lugar só se eles o veem; a facção escondida não
//     vai; a casa com algum conhecido, o chefe só se conhecido; os cargos das facções que vão) e as contas da corte
//     (os cargos, a idade — antes e depois do aniversário, na morte, ainda por nascer —, a data em texto, os pais, os
//     filhos, os cônjuges, os descendentes, quem está num lugar, os membros de uma casa, os laços pelo gênero).
//   · (parte 1b) a árvore da família: quem entra (os membros e os cônjuges), as gerações, quem casou com alguém da casa
//     ao lado, os filhos na ordem do meio dos pais, os casais (o dos primos também), os filhos pendurados nos pais que
//     estão na árvore, o tamanho, a casa vazia, a projeção (só os conhecidos).
//   · (parte 2a) os títulos: os graus e os títulos normalizados (os campos, os limites, a maioridade), as referências
//     (o grau, a terra do tipo certo, o reino, as pessoas; o herdeiro escolhido, o regente e os pretendentes não são o
//     titular; o titular de antes que saiu fica com o nome), as contas (o nome do título e o de quem tem, pelo gênero;
//     os títulos de alguém e de uma terra, por grau; o maior junto do nome; o governante; a maioridade; os papéis de
//     alguém nos títulos) e a projeção (as terras que eles veem e os conhecidos; a terra escondida e a facção escondida
//     não; a névoa: o nome pronto; as pessoas só as conhecidas; sem a nota).
//   · (parte 3a) a diplomacia: os tipos, os tratados e a opinião normalizados (os campos, as partes que existem — duas
//     ou mais —, o prazo pelo calendário, os limites), as contas (o dia de uma data, o estado do tratado hoje, os
//     tratados de uma facção e entre duas, a opinião com os motivos vencidos) e a projeção (os públicos sem facção
//     escondida, sem a nota; sem a opinião).
const N = require('../../mundo/nucleo.js');
const C = require('../../mundo/corte.js');
const Dp = require('../../mundo/diplomacia.js');
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

/* ---- (parte 1b) a árvore da família ---- */
{
  const m = N.normalizarMapa({ nome: 'M', faccoes: [{ id: 'fa', nome: 'Aldar' }], corte: { casas: [{ id: 'ka', nome: 'Aldar' }, { id: 'kz', nome: 'Vazia' }, { id: 'kb', nome: 'Outra' }],
    pessoas: [
      { id: 'av', nome: 'Aldo', casa: 'ka', conj: ['ao'], ver: true }, { id: 'ao', nome: 'Olga', casa: 'kb', ver: true },
      { id: 'k1', nome: 'Kiko', casa: 'ka', pais: ['f2', 'gx'], ver: true },
      { id: 'f1', nome: 'Beto', casa: 'ka', pais: ['av', 'ao'], conj: ['nr'], ver: true }, { id: 'nr', nome: 'Lia', ver: false },
      { id: 'gx', nome: 'Gil', ver: true }, { id: 'f2', nome: 'Cléo', casa: 'ka', pais: ['av', 'ao'], conj: ['gx'], ver: true },
      { id: 'n1', nome: 'Davi', casa: 'ka', pais: ['f1', 'nr'], ver: true }, { id: 'n2', nome: 'Eva', casa: 'ka', pais: ['nr', 'f1'], conj: ['k1'], ver: true },
      { id: 'so', nome: 'Solto', casa: 'ka', pais: ['px'], ver: true }, { id: 'px', nome: 'Pai de fora', casa: 'kb' }] } });
  const t = C.arvoreDaCasa(m, 'ka'), P = id => t.nos.find(x => x.id === id), { LAR, ALT, VAO, VAO_G } = C.ARVORE, passo = LAR + VAO, linha = ALT + VAO_G;
  eq(t.nos.map(x => x.id).sort(), ['ao', 'av', 'f1', 'f2', 'gx', 'k1', 'n1', 'n2', 'nr', 'so'].sort(), 'na árvore da casa: os membros e os cônjuges deles (o pai de fora, que não casou com ninguém da casa, não)');
  eq(['av', 'ao', 'so', 'f1', 'nr', 'f2', 'gx', 'n1', 'n2', 'k1'].map(id => P(id).y / linha), [0, 0, 0, 1, 1, 1, 1, 2, 2, 2], 'as gerações: pelos pais na árvore (quem casou com alguém da casa fica na geração do cônjuge; quem tem os pais fora, em cima)');
  ok(P('ao').x === P('av').x + passo && P('nr').x === P('f1').x + passo && P('gx').x === P('f2').x + passo, 'quem casou com alguém da casa fica logo ao lado');
  ok(P('n1').x < P('k1').x && P('n2').x < P('k1').x, 'os filhos na ordem do meio dos pais (os do Beto antes do filho da Cléo, mesmo vindo depois na lista)');
  eq(t.casais.map(c => c.join('+')).sort(), ['av+ao', 'f1+nr', 'f2+gx', 'n2+k1'].sort(), 'os casais (o dos primos também), da esquerda para a direita');
  eq([t.filhos.find(f => f.id === 'n1').pais, t.filhos.find(f => f.id === 'n2').pais], [['f1', 'nr'], ['f1', 'nr']], 'cada filho com os pais que estão na árvore, da esquerda para a direita (mesmo escritos ao contrário)');
  ok(!t.filhos.some(f => f.id === 'so'), 'o filho do pai de fora não fica pendurado em ninguém');
  eq([t.larg, t.alt], [4 * passo - VAO, 3 * linha - VAO_G], 'o tamanho da árvore: a geração mais larga e as três gerações');
  const vazia = { nos: [], casais: [], filhos: [], larg: 0, alt: 0 };
  eq([C.arvoreDaCasa(m, 'kz'), C.arvoreDaCasa(m, null), C.arvoreDaCasa(m, 'xx')], [vazia, vazia, vazia], 'a casa sem ninguém (ou nenhuma): a árvore vazia');
  const tj = C.arvoreDaCasa(N.projetar(m), 'ka');
  ok(!tj.nos.some(x => x.id === 'nr') && tj.nos.length === 9 && tj.filhos.find(f => f.id === 'n1').pais.join() === 'f1', 'para quem joga (a projeção): só os conhecidos (sem a Lia; o Davi pendurado só no pai)');
}

/* ---- (parte 2a) os títulos ---- */
{
  const CAL = { dia: 0, ano0: 300, meses: [{ nome: 'Degelo', dias: 30 }, { nome: 'Semeadura', dias: 31 }], era: 'DR' };
  const base = { nome: 'M', cal: CAL, faccoes: [{ id: 'fa', nome: 'Arvel' }, { id: 'fb', nome: 'Culto', oculta: true }],
    nevoa: { on: true, ops: [{ t: '+', x: 0, y: 0, r: 400 }] },
    objs: [{ id: 'r1', k: 'r', nome: 'Valmor', fac: 'fa', pts: [[0, 0], [100, 0], [100, 100]] }, { id: 'r2', k: 'r', nome: 'Longe', pts: [[900, 900], [1000, 900], [1000, 1000]] },
      { id: 'r3', k: 'r', nome: 'Vale Secreto', oculto: true, pts: [[10, 10], [60, 10], [60, 60]] }, { id: 'c1', k: 'm', x: 20, y: 20, ic: 'castelo' }, { id: 'c2', k: 'm', x: 2000, y: 2000, ic: 'porto' },
      { id: 'g1', k: 'g', x: 30, y: 30 }],
    corte: {
      graus: [{ id: 'reino', nome: 'Reino', h: 'Rei', m: 'Rainha' }, { id: 'ducado', nome: ' Ducado ', h: 'Duque', m: '' }, { id: 'ducado', nome: 'repetido' }, { id: 'sen', nome: '', h: '', m: '', o: 'Senhore' }, 'lixo'],
      maior: 18,
      pessoas: [{ id: 'a', nome: 'Ana', gen: 'm', ver: true, nasc: { a: 290 } }, { id: 'b', nome: 'Beto', gen: 'h', nasc: { a: 260 } }, { id: 'c', nome: 'Caio', gen: 'o', ver: true },
        { id: 'd', nome: 'Duda', morte: { a: 299 } }, { id: 'e', nome: 'Edu', nasc: { a: 295 }, morte: { a: 298 } }, { id: 'f', nome: 'Fábio', nasc: { a: 305 } }],
      titulos: [
        { id: 't1', grau: 'ducado', preso: { t: 'r', id: 'r1' }, fac: 'fa', tit: 'a', desde: { a: 298, m: 1, d: 40 }, herd: 'a', reg: 'b', pret: [{ p: 'c', mot: ' irmão ' }, { p: 'c', mot: 'repetido' }, { p: 'a' }, { p: 'zz' }, { p: 'b' }],
          hist: [{ p: 'd', nome: 'velho' }, { p: 'zz', nome: 'Saiu' }, { p: 'zz' }, { nome: 'Aldric I', de: { a: 200 }, ate: { a: 230 } }, {}], txt: 'O ducado.', nota: 'Segredo.' },
        { id: 't2', grau: 'reino', preso: { t: 'f', id: 'fa' }, tit: 'b' },
        { id: 't3', grau: 'sen', preso: { t: 'r', id: 'r2' }, tit: 'c', herd: 'b' },
        { id: 't4', grau: 'reino', preso: { t: 'r', id: 'r3' }, tit: 'a' },
        { id: 't5', nome: 'Grão-Mestre da Ordem', tit: 'c', reg: 'c', fac: 'fb', desde: { a: 1 } },
        { id: 't6', grau: 'imperio', preso: { t: 'm', id: 'c1' }, tit: 'x', desde: { a: 3 } },
        { id: 't7', grau: 'reino', preso: { t: 'f', id: 'fb' }, tit: 'a' },
        { id: 't8', grau: 'ducado', preso: { t: 'm', id: 'g1' }, fac: 'zz', tit: 'b', desde: { a: 5 } },
        { id: 't9', grau: 'ducado', preso: { t: 'm', id: 'c2' }, tit: 'c' },
        { id: 't1', nome: 'repetido' }, 'lixo'] } };
  const m = N.normalizarMapa(base), c = m.corte, T = id => c.titulos.find(t => t.id === id), P = id => C.pessoaDe(m, id);
  eq(c.graus, [{ id: 'reino', nome: 'Reino', h: 'Rei', m: 'Rainha', o: '' }, { id: 'ducado', nome: 'Ducado', h: 'Duque', m: '', o: '' }, { id: 'sen', nome: 'Grau', h: '', m: '', o: 'Senhore' }],
    'os graus: sem os repetidos nem o lixo; o nome que falta vira "Grau"; as formas como foram escritas');
  eq(c.maior, 18, 'a maioridade guardada');
  eq(c.titulos.map(t => t.id), ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9'], 'os títulos: sem os repetidos nem o lixo');
  eq(Object.keys(T('t1')), ['id', 'grau', 'de', 'nome', 'preso', 'fac', 'tit', 'desde', 'herd', 'reg', 'regra', 'pret', 'hist', 'txt', 'nota'], 'cada título com os campos de sempre, nesta ordem');
  eq([T('t1').herd, T('t1').reg, T('t1').desde], [null, 'b', { a: 298, m: 1, d: 31 }], 'o herdeiro escolhido não é o próprio titular; o regente fica; o "desde" (o dia passa do mês: fica no último)');
  eq(T('t1').pret, [{ p: 'c', mot: 'irmão' }, { p: 'b', mot: '' }], 'os pretendentes: sem repetir, sem o titular, só quem existe (com o motivo)');
  eq(T('t1').hist, [{ p: 'd', nome: 'Duda', de: null, ate: null }, { p: null, nome: 'Saiu', de: null, ate: null }, { p: null, nome: 'Aldric I', de: { a: 200 }, ate: { a: 230 } }],
    'os titulares de antes: o nome de quem está vem da corte; quem saiu fica só com o nome (sem nome, sai)');
  eq([T('t6').grau, T('t6').tit, T('t6').desde], [null, null, null], 'o grau que não existe sai; o titular que não existe sai (e o "desde" com ele)');
  eq([T('t5').reg, T('t5').fac], [null, 'fb'], 'o regente não é o próprio titular; o reino escondido fica no mapa do mestre');
  eq([T('t8').preso, T('t8').fac], [null, null], 'a terra tem de ser do tipo certo (um grupo não é); o reino que não existe sai');
  eq([T('t2').preso, T('t9').preso], [{ t: 'f', id: 'fa' }, { t: 'm', id: 'c2' }], 'presos a uma facção e a um marcador');
  const lim = N.normalizarMapa({ nome: 'M', corte: { pessoas: Array.from({ length: 12 }, (_, i) => ({ id: 'q' + i })),
    graus: Array.from({ length: 15 }, (_, i) => ({ id: 'g' + i, nome: 'G' + i })),
    titulos: Array.from({ length: 210 }, (_, i) => ({ id: 'k' + i, nome: 'K', pret: Array.from({ length: 12 }, (_, j) => ({ p: 'q' + j })), hist: Array.from({ length: 45 }, (_, j) => ({ nome: 'H' + j })) })), maior: 500 } }).corte;
  ok(lim.titulos.length === N.LIMITES.titulos && lim.graus.length === N.LIMITES.graus && lim.titulos[0].pret.length === N.LIMITES.pretendentes && lim.titulos[0].hist.length === N.LIMITES.titularesAntes && lim.maior === N.LIMITES.maioridade,
    'os limites: ' + [N.LIMITES.titulos, N.LIMITES.graus, N.LIMITES.pretendentes, N.LIMITES.titularesAntes, N.LIMITES.maioridade].join(', '));
  eq([N.normalizarMapa({ nome: 'M', corte: { graus: [] } }).corte, N.normalizarMapa({ nome: 'M', corte: { maior: 21 } }).corte.maior, 'maior' in N.normalizarMapa({ nome: 'M', corte: { maior: 'x', graus: [] } }).corte],
    [{ pessoas: [], casas: [], cargos: {}, titulos: [], graus: [] }, 21, false], 'só os graus (mesmo vazios) ou só a maioridade já fazem a corte; a maioridade que não é número sai');
  eq(N.normalizarMapa({ nome: 'M', corte: { titulos: [{ id: 'x', nome: 'X' }] } }).corte.titulos.map(t => t.nome), ['X'], 'só um título já faz a corte');
  // as contas dos títulos
  eq([C.grausDe(m).map(g => g.id), C.grausDe(N.normalizarMapa({ nome: 'M' })).map(g => g.id)], [['reino', 'ducado', 'sen'], N.GRAUS_INICIAIS.map(g => g.id)], 'os graus: os guardados, ou os de começo');
  eq(['t1', 't2', 't3', 't5', 't6', 't8', 't9'].map(id => C.nomeDoTitulo(m, T(id))), ['Ducado de Valmor', 'Reino de Arvel', 'Grau de Longe', 'Grão-Mestre da Ordem', 'Título sem nome', 'Ducado', 'Ducado de Porto'],
    'o nome do título: o grau e "de" + a terra (o marcador sem nome: o do ícone); sem grau, o nome livre; sem terra, só o grau');
  eq(C.nomeDoTitulo(m, Object.assign({}, T('t1'), { de: 'da Terra Alta' })), 'Ducado da Terra Alta', 'o "de quê" escrito pelo mestre vale antes da terra');
  eq([C.tituloDoTitular(m, T('t1'), P('a')), C.tituloDoTitular(m, T('t2'), P('a')), C.tituloDoTitular(m, T('t2'), P('b')), C.tituloDoTitular(m, T('t3'), P('c')), C.tituloDoTitular(m, T('t3'), P('b')), C.tituloDoTitular(m, T('t2'), P('d'))],
    ['Duque de Valmor', 'Rainha de Arvel', 'Rei de Arvel', 'Senhore de Longe', 'Grau de Longe', 'Rei de Arvel'], 'o de quem tem, pelo gênero (sem a forma, a de homem; sem nenhuma, o nome do grau; sem gênero, a de homem)');
  eq([C.titulosDe(m, 'a').map(t => t.id), C.titulosDe(m, 'b').map(t => t.id), C.titulosDe(m, null)], [['t4', 't7', 't1'], ['t2', 't8'], []], 'os títulos de alguém: do maior grau para o menor (empate: a ordem da lista)');
  eq(C.porGrau(m, [T('t5'), T('t1'), T('t6'), T('t2')]).map(t => t.id), ['t2', 't1', 't5', 't6'], 'os sem grau por último');
  eq([C.nomeComTitulo(m, P('a')), C.nomeComTitulo(m, P('d')), C.nomeComTitulo(m, null)], ['Ana, Rainha de Vale Secreto', 'Duda', ''], 'o maior título junto do nome (sem título, só o nome)');
  eq([C.titulosDaTerra(m, 'r', 'r1').map(t => t.id), C.titulosDaTerra(m, 'f', 'fa').map(t => t.id), C.titulosDaTerra(m, 'm', null)], [['t1'], ['t2'], []], 'os títulos de uma terra');
  const gv = C.governanteDe(m, 'fa');
  eq([gv.titulo.id, gv.pessoa.id, C.governanteDe(m, 'zz')], ['t2', 'b', null], 'o governante: quem tem o maior título preso à facção');
  const m2 = N.normalizarMapa(Object.assign(JSON.parse(j(base)), { corte: Object.assign(JSON.parse(j(base.corte)), { titulos: [{ id: 'v1', grau: 'reino', preso: { t: 'f', id: 'fa' } }, { id: 'v2', grau: 'ducado', preso: { t: 'f', id: 'fa' }, tit: 'c' }] }) }));
  eq(C.governanteDe(m2, 'fa').pessoa.id, 'c', 'o maior título vago: governa quem tem o seguinte');
  eq([C.maioridadeDe(m), C.maioridadeDe(N.normalizarMapa({ nome: 'M' })), C.menorDeIdade(m, P('a')), C.menorDeIdade(m, P('b')), C.menorDeIdade(m, P('c')), C.menorDeIdade(m, P('d')), C.menorDeIdade(m, P('e')), C.menorDeIdade(m, P('f'))],
    [18, 16, true, false, false, false, false, false], 'a maioridade (sem ela, 16); menor de idade: a Ana (10 anos); não: o Beto (40), o Caio (sem nascimento), a Duda e o Edu (mortos), o Fábio (ainda não nasceu)');
  const pb = C.papeisNosTitulos(m, 'b'), pc0 = C.papeisNosTitulos(m, 'c');
  eq([pb.tem.map(t => t.id), pb.regente.map(t => t.id), pb.herdeiro.map(t => t.id), pb.pretende.map(x => [x.titulo.id, x.mot]), pc0.pretende.map(x => [x.titulo.id, x.mot]), pc0.herdeiro], [['t2', 't8'], ['t1'], ['t3'], [['t1', '']], [['t1', 'irmão']], []],
    'os títulos em que alguém aparece: os que tem, de que é regente, herdeiro escolhido ou pretendente (com o motivo)');
  eq(C.terraDe(m, T('t1')).nome, 'Valmor', 'a terra do título');
  // a projeção
  const p = N.projetar(m), pt = p.corte.titulos, Q = id => pt.find(t => t.id === id);
  eq(pt.map(t => t.id), ['t1', 't2', 't3', 't5', 't6', 't9'], 'na projeção: os títulos das terras que eles veem (a região, a cidade, a facção) e os dos personagens conhecidos (não: a terra escondida pelo mestre, a facção escondida, o titular que eles não conhecem sem terra que eles vejam)');
  eq([Q('t1').preso, Q('t1').de, Q('t1').tit, Q('t1').reg, Q('t1').nota, Q('t1').txt], [{ t: 'r', id: 'r1' }, '', 'a', null, '', 'O ducado.'], 'a terra que eles veem vai; o titular conhecido; o regente que eles não conhecem, não; sem a nota; com o que eles sabem');
  eq([Q('t1').pret, Q('t1').hist.map(x => x.nome)], [[{ p: 'c', mot: 'irmão' }], ['Saiu', 'Aldric I']], 'os pretendentes e os titulares de antes: só os conhecidos (os só com nome também)');
  eq([Q('t2').tit, Q('t2').preso], [null, { t: 'f', id: 'fa' }], 'o título da facção que eles veem, com o titular que eles não conhecem: vai sem o titular');
  eq([Q('t3').preso, Q('t3').de, Q('t9').de, Q('t5').desde], [null, 'de Longe', 'de Porto', { a: 1 }], 'a terra na névoa: o título vai com o nome pronto (sem a terra); o lugar sem nome, com o do ícone');
  eq([Q('t3').herd, Q('t5').fac], [null, null], 'o herdeiro escolhido que eles não conhecem não vai; o reino escondido também não');
  eq([C.nomeDoTitulo(p, Q('t3')), C.tituloDoTitular(p, Q('t3'), C.pessoaDe(p, 'c')), C.nomeDoTitulo(p, Q('t1'))], ['Grau de Longe', 'Senhore de Longe', 'Ducado de Valmor'], 'quem joga lê os mesmos nomes');
  eq([p.corte.graus.length, p.corte.maior], [3, 18], 'os graus e a maioridade vão (para os nomes e o "menor")');
  ok(j(N.normalizarMapa(p)) === j(p), 'o que chega aos jogadores passa igual pela normalização deles');
  const semNinguem = N.projetar(N.normalizarMapa(Object.assign(JSON.parse(j(base)), { corte: Object.assign(JSON.parse(j(base.corte)), { pessoas: JSON.parse(j(base.corte.pessoas)).map(x => Object.assign(x, { ver: false })) }) })));
  eq([semNinguem.corte.pessoas, semNinguem.corte.titulos.map(t => t.id)], [[], ['t1', 't2', 't6']], 'ninguém conhecido: os títulos das terras que eles veem vão mesmo assim (sem titular)');
  const comDe = N.projetar(N.normalizarMapa(Object.assign(JSON.parse(j(base)), { corte: Object.assign(JSON.parse(j(base.corte)), { titulos: [{ id: 'z', grau: 'sen', preso: { t: 'r', id: 'r2' }, tit: 'c', de: 'das Brumas' }] }) })));
  eq([comDe.corte.titulos[0].de, comDe.corte.titulos[0].preso], ['das Brumas', null], 'na névoa, o "de quê" escrito pelo mestre vai como está');
}

/* ---- (parte 2b) a sucessão ---- */
{
  const CAL = { dia: 0, ano0: 310, meses: [{ nome: 'Degelo', dias: 30 }, { nome: 'Semeadura', dias: 31 }], era: 'DR' };
  const P0 = [
    { id: 'av', nome: 'Aldo', gen: 'h', casa: 'ka', nasc: { a: 230 }, morte: { a: 290 }, conj: ['ao'] }, { id: 'ao', nome: 'Olga', gen: 'm', casa: 'kb', nasc: { a: 232 } },
    { id: 'tia', nome: 'Tânia', gen: 'm', casa: 'ka', nasc: { a: 252 }, pais: ['av', 'ao'] }, { id: 'rei', nome: 'Rui', gen: 'h', casa: 'ka', nasc: { a: 255 }, pais: ['av', 'ao'], conj: ['ro'] },
    { id: 'tio', nome: 'Tito', gen: 'h', casa: 'ka', nasc: { a: 258 }, pais: ['av', 'ao'] }, { id: 'ro', nome: 'Rosa', gen: 'm', casa: 'kb', nasc: { a: 260 } },
    { id: 'f4', nome: 'Félix', gen: 'h', casa: 'ka', nasc: { a: 290 }, pais: ['rei', 'ro'] }, { id: 'f1', nome: 'Fábia', gen: 'm', casa: 'ka', nasc: { a: 280 }, pais: ['rei', 'ro'] },
    { id: 'f2', nome: 'Fred', gen: 'h', casa: 'ka', nasc: { a: 283 }, pais: ['rei', 'ro'] }, { id: 'f3', nome: 'Flor', gen: 'm', casa: 'ka', nasc: { a: 286 }, morte: { a: 295 }, pais: ['rei', 'ro'] },
    { id: 'n3', nome: 'Nico', gen: 'h', casa: 'ka', nasc: { a: 294 }, pais: ['f3'] }, { id: 'n1', nome: 'Nina', gen: 'm', casa: 'ka', nasc: { a: 300 }, pais: ['f1', 'gx'] },
    { id: 'gx', nome: 'Gil', gen: 'h', casa: 'kc', nasc: { a: 278 } }, { id: 'n2', nome: 'Neto', gen: 'h', casa: 'ka', nasc: { a: 305 }, pais: ['f2'] },
    { id: 'p1', nome: 'Pedro', gen: 'h', casa: 'ka', nasc: { a: 285 }, pais: ['tio'] }, { id: 's1', nome: 'Sara', gen: 'm', casa: 'kc', nasc: { a: 278 }, pais: ['tia'] }];
  const mapa = (titulos, regras, mud) => N.normalizarMapa({ nome: 'M', cal: CAL, faccoes: [{ id: 'fa', nome: 'Arvel' }, { id: 'fb', nome: 'Vale' }],
    corte: { casas: [{ id: 'ka', nome: 'Aldar', chefe: 'rei' }, { id: 'kb', nome: 'Rosas' }, { id: 'kc', nome: 'Gil' }], regras: regras || {},
      pessoas: P0.map(p => Object.assign({}, p, (mud || {})[p.id] || {})), titulos } });
  // as regras normalizadas
  const mr = N.normalizarMapa({ nome: 'M', faccoes: [{ id: 'fa', nome: 'A' }], corte: { regras: { fa: { forma: 'antig', gen: 'homens' }, fz: { forma: 'primo' }, fb: { forma: 'x' } },
    titulos: [{ id: 't', nome: 'T', regra: { forma: 'partilha', gen: 'zz' } }, { id: 'u', nome: 'U', regra: 'x' }, { id: 'w', nome: 'W', regra: { forma: 'zz', gen: 'homens' } }] } });
  eq([mr.corte.regras, mr.corte.titulos.map(t => t.regra)], [{ fa: { forma: 'antig', gen: 'homens' } }, [{ forma: 'partilha', gen: 'igual' }, null, null]],
    'as regras: só as dos reinos que existem e com uma forma que existe (o gênero que não existe vira "igual"); a do título, igual (sem forma: nenhuma)');
  ok(N.normalizarMapa({ nome: 'M', faccoes: [{ id: 'fa', nome: 'A' }], corte: { regras: { fa: { forma: 'primo' } } } }).corte.regras.fa.forma === 'primo' && !('regras' in N.normalizarMapa({ nome: 'M', faccoes: [{ id: 'fa', nome: 'A' }], corte: { regras: { fz: { forma: 'primo' } }, titulos: [{ id: 'x', nome: 'X' }] } }).corte),
    'só uma regra já faz a corte; as regras de reinos que não existem saem (e a lista vazia some)');
  ok(!('regras' in N.normalizarMapa({ nome: 'M', faccoes: [{ id: 'fa', nome: 'A' }], corte: { regras: { fa: { forma: 'zz' } }, titulos: [{ id: 'x', nome: 'X' }] } }).corte), 'a regra de um reino que existe, com uma forma que não existe: sai');
  // a regra de um título e o texto dela
  const T = (id, o) => Object.assign({ id, grau: 'reino', fac: 'fa', tit: 'rei' }, o || {});
  let m = mapa([T('t1')], { fa: { forma: 'ultimo', gen: 'homens' } });
  eq([C.regraDe(m, m.corte.titulos[0]), C.regraDe(m, Object.assign({}, m.corte.titulos[0], { regra: { forma: 'antig', gen: 'igual' } })), C.regraDe(m, Object.assign({}, m.corte.titulos[0], { fac: 'fb' }))],
    [{ forma: 'ultimo', gen: 'homens' }, { forma: 'antig', gen: 'igual' }, N.REGRA_PADRAO], 'a regra do título: a dele, a do reino, ou a de começo');
  eq([C.textoRegra({ forma: 'primo', gen: 'igual' }), C.textoRegra({ forma: 'antig', gen: 'sohomens' }), C.textoRegra({ forma: 'eletiva', gen: 'homens' }), N.REGRA_PADRAO],
    ['Primogenitura · por igual', 'Antiguidade · só homens', 'O mestre escolhe', { forma: 'primo', gen: 'igual' }], 'a regra em texto curto (a de começo: primogenitura, homens e mulheres por igual)');
  // a linha de sucessão, por regra
  const linha = (forma, gen, o) => { const mm = mapa([T('t1', Object.assign({ regra: { forma, gen } }, o || {}))]); return C.linhaDeSucessao(mm, mm.corte.titulos[0], 8); };
  const ids = l => l.map(x => x.id).join(' ');
  const l0 = linha('primo', 'igual');
  eq(ids(l0), 'f1 n1 f2 n2 n3 f4 tia s1', 'primogenitura: os filhos do mais velho para o mais novo, cada um com a linha dele (a filha morta: o filho dela no lugar); depois os irmãos e os sobrinhos');
  eq(l0.map(x => x.por), ['filha', 'neta', 'filho', 'neto', 'neto', 'filho', 'irmã', 'sobrinha'], 'com o laço de cada um com o titular');
  eq(ids(linha('primo', 'homens')), 'f2 n2 f4 f1 n1 n3 tio p1', 'homens primeiro: em cada leva de irmãos, os homens antes');
  eq(ids(linha('primo', 'sohomens')), 'f2 n2 f4 tio p1', 'só homens: a linha só passa por eles (sem as filhas e os filhos delas)');
  eq(ids(linha('primo', 'mulheres')), 'f1 n1 n3 f2 n2 f4 ao tia', 'mulheres primeiro (a mãe viva herda antes dos irmãos)');
  eq(ids(linha('primo', 'somulheres')), 'f1 n1 ao tia s1', 'só mulheres: a linha só passa por elas');
  eq(ids(linha('ultimo', 'igual')), 'f4 n3 f2 n2 f1 n1 tio p1', 'ultimogenitura: do mais novo para o mais velho');
  const la = linha('antig', 'igual');
  eq([ids(la), la[0].por], ['tia tio f1 f2 p1 f4 n3 n1', 'da casa'], 'antiguidade: os vivos da casa do titular, do mais velho para o mais novo');
  eq(ids(linha('antig', 'homens')), 'tio f2 p1 f4 n3 n2 tia f1', 'antiguidade, homens primeiro');
  eq([linha('eletiva', 'igual'), ids(linha('eletiva', 'igual', { herd: 'p1' }))], [[], 'p1'], '"o mestre escolhe": ninguém (só o herdeiro escolhido, se houver)');
  const lh = linha('primo', 'igual', { herd: 'p1' });
  eq([ids(lh).split(' ').slice(0, 3).join(' '), lh[0].por, lh.filter(x => x.id === 'p1').length], ['p1 f1 n1', 'herdeiro escolhido', 1], 'o herdeiro escolhido passa na frente (uma vez só)');
  eq(ids(linha('primo', 'igual', { herd: 'f3' })).split(' ')[0], 'f1', 'o herdeiro escolhido morto não passa');
  const mg = mapa([T('t1', { tit: 'gx', regra: { forma: 'antig', gen: 'igual' } })], null, { s1: { casa: 'ka' } });
  eq(ids(C.linhaDeSucessao(mg, mg.corte.titulos[0], 8)), 'n1', 'antiguidade sem mais ninguém vivo na casa: como na primogenitura (a filha do Gil)');
  const mv = mapa([T('t1', { tit: null, hist: [{ p: 'av' }, { p: 'rei' }] })]);
  eq(ids(C.linhaDeSucessao(mv, mv.corte.titulos[0], 3)), 'f1 n1 f2', 'o título vago: a linha sai do último titular de antes que está na corte');
  eq([C.lacoNaLinha({ gen: '' }, 0, 1), C.lacoNaLinha({ gen: 'h' }, 2, 1), C.lacoNaLinha({ gen: 'm' }, 2, 2), C.lacoNaLinha({ gen: 'h' }, 0, 5), C.lacoNaLinha({ gen: 'h' }, 3, 2)],
    ['filho ou filha', 'tio', 'prima', 'descendente', 'parente'], 'os laços da linha (sem gênero, os dois; longe, "descendente" ou "parente")');
  eq([C.porIdade(m, [C.pessoaDe(m, 'f4'), { id: 'xx' }, C.pessoaDe(m, 'f1')]).map(p => p.id), C.peloGenero([{ gen: 'm' }, { gen: 'h' }, { gen: '' }], 'homens').map(p => p.gen)], [['f1', 'f4', 'xx'], ['h', 'm', '']],
    'a ordem de nascimento (sem o nascimento, por último); homens primeiro (os outros na ordem de antes)');
  // a sucessão de quem morreu: os títulos, a partilha, o regente, o chefe da casa
  const titulos = [T('t1'), T('t2', { grau: 'ducado', regra: { forma: 'partilha', gen: 'igual' } }), T('t3', { grau: 'condado', regra: { forma: 'partilha', gen: 'igual' } }),
    T('t4', { grau: 'baronia', regra: { forma: 'eletiva', gen: 'igual' } }), T('t5', { tit: 'tio' })];
  m = mapa(titulos, null, { rei: { morte: { a: 310 } } });
  let sc = C.sucessaoDe(m, 'rei');
  eq(sc.itens.map(x => [x.titulo.id, x.herdeiro, x.regente]), [['t1', 'f1', null], ['t2', 'f1', null], ['t3', 'f2', null], ['t4', null, null]],
    'a sucessão do Rui: o reino para a Fábia; a partilha divide o ducado e o condado entre os filhos vivos (o maior com a mais velha); "o mestre escolhe": ninguém; o título do Tito não entra');
  eq([sc.casa.casa.id, sc.casa.chefe], ['ka', 'f1'], 'o chefe da casa: quem herda o maior título (da casa)');
  eq(sc.itens[0].linha.slice(0, 2).map(x => x.id), ['f1', 'n1'], 'cada título vem com a linha');
  m = mapa(titulos, null, { rei: { morte: { a: 310 } }, f1: { morte: { a: 305 } } });
  sc = C.sucessaoDe(m, 'rei');
  eq([sc.itens[0].herdeiro, sc.itens[0].regente, sc.itens[1].herdeiro, sc.itens[2].herdeiro, sc.casa.chefe], ['n1', 'gx', 'f2', 'f4', 'n1'], 'a Fábia morta: a Nina (menor de idade) herda o reino, com o pai vivo de regente; a partilha só entre os filhos vivos');
  m = mapa(titulos, null, { rei: { morte: { a: 310 } }, f1: { casa: 'kc' } });
  eq(C.sucessaoDe(m, 'rei').casa.chefe, 'tia', 'quem herda o maior título é de outra casa: o chefe é o mais velho da casa');
  m = mapa([T('t2', { grau: 'ducado', regra: { forma: 'partilha', gen: 'igual' }, herd: 'p1' }), T('t3', { grau: 'condado', regra: { forma: 'partilha', gen: 'igual' } }), T('t6', { grau: 'baronia', regra: { forma: 'partilha', gen: 'igual' } })], null, { rei: { morte: { a: 310 } } });
  eq(C.sucessaoDe(m, 'rei').itens.map(x => x.herdeiro), ['p1', 'f1', 'f2'], 'na partilha, o título com herdeiro escolhido fica com ele; os outros se dividem');
  eq([C.sucessaoDe(m, 'xx'), C.sucessaoDe(m, 'tio').itens, C.sucessaoDe(m, 'tio').casa], [null, [], null], 'sem a pessoa: nada; sem títulos e sem casa: nada a passar');
  // aplicar
  m = mapa(titulos.concat([T('t9', { tit: 'rei', desde: { a: 290 }, herd: 'f2', hist: Array.from({ length: 40 }, (_, i) => ({ nome: 'H' + i })) })]), null, { rei: { morte: { a: 310, m: 1, d: 3 } } });
  const c = JSON.parse(j(m.corte));
  const nmud = C.aplicarSucessao(c, 'rei', [{ titulo: 't1', herdeiro: 'n1', regente: 'gx' }, { titulo: 't4', herdeiro: null }, { titulo: 't5', herdeiro: 'f1' }, { titulo: 't9', herdeiro: 'f2', regente: 'f2' }], 'f2', { a: 310, m: 1, d: 3 });
  const Tc = id => c.titulos.find(t => t.id === id);
  eq([nmud, Tc('t1').tit, Tc('t1').desde, Tc('t1').reg, Tc('t1').hist[Tc('t1').hist.length - 1]], [3, 'n1', { a: 310, m: 1, d: 3 }, 'gx', { p: 'rei', nome: 'Rui', de: null, ate: { a: 310, m: 1, d: 3 } }],
    'aplicar: o reino para a Nina desde a data da morte, com o regente; o Rui nos titulares de antes (até a data)');
  eq([Tc('t4').tit, Tc('t4').desde, Tc('t5').tit, Tc('t9').reg, Tc('t9').herd, Tc('t9').hist.length, Tc('t9').hist[0].nome, Tc('t9').hist[39].de], [null, null, 'tio', null, null, 40, 'H1', { a: 290 }],
    'o vago fica sem "desde"; o título de outro titular não muda; o regente não é o próprio herdeiro; o herdeiro escolhido que herdou sai; a lista cheia perde o mais antigo');
  eq(c.casas.find(x => x.id === 'ka').chefe, 'f2', 'aplicar: o novo chefe da casa');
  const c2 = JSON.parse(j(m.corte));
  C.aplicarSucessao(c2, 'rei', [], undefined, { a: 310 });
  eq(c2.casas.find(x => x.id === 'ka').chefe, 'rei', 'sem dizer o chefe: a casa não muda');
  // a projeção: as regras são do mestre
  const mp = N.normalizarMapa({ nome: 'M', faccoes: [{ id: 'fa', nome: 'A' }], corte: { regras: { fa: { forma: 'antig' } }, pessoas: [{ id: 'a', nome: 'A', ver: true }], titulos: [{ id: 't', nome: 'T', tit: 'a', regra: { forma: 'primo' } }] } });
  const pp = N.projetar(mp).corte;
  eq([pp.titulos[0].regra, 'regras' in pp], [null, false], 'na projeção, sem as regras de sucessão (a do título e as dos reinos)');
}

/* ---- (parte 3a) a diplomacia: os tratados e a opinião ---- */
{
  const CAL = { dia: 35, ano0: 10, meses: [{ nome: 'Degelo', dias: 30 }, { nome: 'Semeadura', dias: 31 }, { nome: 'Colheita', dias: 28 }], era: 'DR' };
  const base = { nome: 'M', cal: CAL, faccoes: [{ id: 'fa', nome: 'Arvel' }, { id: 'fb', nome: 'Vale' }, { id: 'fc', nome: 'Ilhas' }, { id: 'fd', nome: 'Culto', oculta: true }],
    dipl: {
      tipos: [{ id: 'alianca', nome: ' Aliança ' }, { id: 'alianca', nome: 'repetida' }, { id: 'liga', nome: '' }, 'lixo'],
      tratados: [
        { id: 't1', tipo: 'alianca', partes: ['fa', 'fb', 'fa', 'zz'], ini: { a: 10 }, fim: { a: 12, m: 1, d: 40 }, pub: true, txt: ' Juntos. ', nota: 'segredo' },
        { id: 't2', tipo: 'paz', partes: ['fa', 'fc', 'fb'], pub: false },
        { id: 't3', tipo: 'liga', partes: ['fb', 'fd'], pub: true },
        { id: 't4', partes: ['fa', 'zz'] },
        { id: 't5', tipo: 'alianca', partes: ['fb', 'fc'], ini: { a: 9 }, fim: { a: 10, m: 0 }, pub: true },
        { id: 't6', tipo: 'alianca', partes: ['fa', 'fc'], ini: { a: 10, m: 2 }, pub: true },
        { id: 't7', tipo: 'alianca', partes: ['fa', 'fb'], enc: { a: 10, m: 1, d: 2 }, pub: true },
        { id: 't8', tipo: 'alianca', partes: ['fa', 'fb', 'fd'], pub: true },
        { id: 't1', partes: ['fa', 'fb'] }, 'lixo'],
      opin: [
        { de: 'fa', sobre: 'fb', motivos: [{ id: 'm1', txt: ' tomaram Valmor ', v: -30, ate: { a: 10, m: 0 } }, { id: 'm2', txt: '', v: 250 }, { id: 'm1', txt: 'repetido', v: 5 }, { id: 'm3', txt: 'velha aliança', v: 'x' }] },
        { de: 'fa', sobre: 'fb', motivos: [{ id: 'm9', txt: 'repetida', v: 1 }] },
        { de: 'fb', sobre: 'fa', motivos: [{ id: 'k1', txt: 'ofensa', v: -80 }, { id: 'k2', txt: 'outra', v: -70 }] },
        { de: 'fa', sobre: 'fa', motivos: [{ id: 'x', txt: 'eu', v: 1 }] }, { de: 'fa', sobre: 'zz', motivos: [{ id: 'x', txt: 'ninguém', v: 1 }] }, { de: 'fc', sobre: 'fa', motivos: [] }] } };
  const m = N.normalizarMapa(base), d = m.dipl, T = id => d.tratados.find(t => t.id === id);
  eq(d.tipos, [{ id: 'alianca', nome: 'Aliança' }, { id: 'liga', nome: 'Tratado' }], 'os tipos: sem os repetidos nem o lixo; o nome que falta vira "Tratado"');
  eq(d.tratados.map(t => t.id), ['t1', 't2', 't3', 't5', 't6', 't7', 't8'], 'os tratados: sem os repetidos, o lixo e o de menos de duas facções que existem');
  eq(Object.keys(T('t1')), ['id', 'tipo', 'partes', 'ini', 'fim', 'pub', 'txt', 'nota', 'enc'], 'cada tratado com os campos de sempre, nesta ordem');
  eq([T('t1').partes, T('t2').partes, T('t1').fim, T('t1').txt, T('t2').pub], [['fa', 'fb'], ['fa', 'fc', 'fb'], { a: 12, m: 1, d: 31 }, 'Juntos.', false], 'as partes (sem repetir, só as que existem; três facções também); o prazo pelo calendário; os termos aparados');
  eq([T('t2').tipo, T('t3').tipo], [null, 'liga'], 'o tipo que não existe na lista guardada sai (fica "Tratado")');
  eq(d.opin.map(o => o.de + '>' + o.sobre), ['fa>fb', 'fb>fa'], 'a opinião: um registro por lado, de uma facção sobre outra que existe (nem sobre si mesma; sem motivos, nada)');
  eq(d.opin[0].motivos, [{ id: 'm1', txt: 'tomaram Valmor', v: -30, ate: { a: 10, m: 0 } }, { id: 'm2', txt: 'Sem motivo', v: 100, ate: null }, { id: 'm3', txt: 'velha aliança', v: 0, ate: null }],
    'os motivos: sem os repetidos; o texto que falta vira "Sem motivo"; o valor de −100 a +100 (o que não é número, 0)');
  const lim = N.normalizarMapa({ nome: 'M', faccoes: [{ id: 'a' }, { id: 'b' }], dipl: { tipos: Array.from({ length: 20 }, (_, i) => ({ id: 'k' + i, nome: 'K' })), tratados: Array.from({ length: 210 }, (_, i) => ({ id: 't' + i, partes: ['a', 'b'] })),
    opin: [{ de: 'a', sobre: 'b', motivos: Array.from({ length: 25 }, (_, i) => ({ id: 'm' + i, txt: 'M', v: 1 })) }] } }).dipl;
  ok(lim.tipos.length === N.LIMITES.tiposTratado && lim.tratados.length === N.LIMITES.tratados && lim.opin[0].motivos.length === N.LIMITES.motivosOpiniao, 'os limites: ' + [N.LIMITES.tiposTratado, N.LIMITES.tratados, N.LIMITES.motivosOpiniao].join(', '));
  ok(!('dipl' in N.normalizarMapa({ nome: 'M', dipl: { tratados: [], opin: [] } })) && 'dipl' in N.normalizarMapa({ nome: 'M', dipl: { tipos: [] } }), 'sem nada, a diplomacia nem fica (só os tipos, mesmo vazios, ficam)');
  // as contas
  eq([Dp.tiposDe(m).length, Dp.tiposDe(N.normalizarMapa({ nome: 'M' })).map(t => t.id), Dp.nomeDoTipo(m, T('t2')), Dp.nomeDoTipo(m, T('t3'))], [2, N.TIPOS_TRATADO.map(t => t.id), 'Tratado', 'Tratado'], 'os tipos: os guardados ou os de começo; o nome do tipo (sem ele, "Tratado")');
  eq([Dp.diaDe(m, { a: 10 }), Dp.diaDe(m, { a: 10 }, true), Dp.diaDe(m, { a: 10, m: 1 }), Dp.diaDe(m, { a: 10, m: 1 }, true), Dp.diaDe(m, { a: 11, m: 0, d: 5 }), Dp.diaDe(m, null)], [0, 88, 30, 60, 93, null],
    'o dia de uma data (o começo ou o fim do ano, do mês; o dia exato)');
  eq(['t1', 't2', 't5', 't6', 't7'].map(id => Dp.estadoDe(m, T(id))), ['ativo', 'ativo', 'vencido', 'futuro', 'encerrado'], 'o estado hoje (dia 35: 6 de Semeadura do ano 10): em vigor, sem datas, vencido, ainda não começou, encerrado');
  eq([Dp.tratadosDe(m, 'fc').map(t => t.id), Dp.tratadosEntre(m, 'fa', 'fb').map(t => t.id), Dp.tratadosDe(m, null).length, Dp.tratadoDe(m, 't3').id], [['t2', 't5', 't6'], ['t1', 't2', 't7', 't8'], 7, 't3'], 'os tratados de uma facção, entre duas, todos');
  const o1 = Dp.opiniao(m, 'fa', 'fb'), o2 = Dp.opiniao(m, 'fb', 'fa'), o3 = Dp.opiniao(m, 'fc', 'fa');
  eq([o1.total, o1.motivos.map(x => x.vencido), o2.total, o3, Dp.opTxt(20), Dp.opTxt(-5), Dp.opTxt(0)], [70, [true, false, false], -100, { total: 0, motivos: [] }, '+20', '−5', '0'],
    'a opinião: a soma dos motivos (de −100 a +100), o motivo vencido (continua contando); sem motivos, 0; o número com o sinal');
  // a projeção: os tratados públicos entre facções que eles veem, sem a nota; sem a opinião
  const p = N.projetar(m);
  eq([p.dipl.tratados.map(t => t.id), p.dipl.tratados[0].nota, p.dipl.opin, p.dipl.tipos.length], [['t1', 't5', 't6', 't7'], '', [], 2], 'na projeção: só os públicos sem facção escondida (nem o de três com a escondida; sem a nota); a opinião não vai; os tipos vão');
  ok(j(N.normalizarMapa(p)) === j(p), 'o que chega aos jogadores passa igual pela normalização deles');
  ok(!('dipl' in N.projetar(N.normalizarMapa(Object.assign(JSON.parse(j(base)), { dipl: { opin: base.dipl.opin, tratados: [{ id: 'x', partes: ['fa', 'fb'] }] } })))), 'sem tratado público: a diplomacia nem vai');
}

console.log(bad ? bad + ' falharam de ' + n : n + ' verificações passaram');
process.exit(bad ? 1 : 0);
