// A corrupção das fichas (lote 37), a lógica pura (tc/corrupcao.js): a configuração de cada personagem, os cortes da
// mesa, os pontos gastos na árvore escolhida, o estágio (pelos pontos e o ajuste; a demoníaca à mão) e a árvore de
// começo.
const { checker } = require('./lib');
const { ok, end } = checker();
const C = require('../../tc/corrupcao.js');
const j = JSON.stringify;

ok(j(C.normConf({ tipo: 'vamp', arv: 'av', ajuste: 9, estagio: -2 })) === j({ v: 1, tipo: 'vamp', arv: 'av', ajuste: 5, estagio: 0 }) && C.normConf({ tipo: 'zumbi' }).tipo === null && C.normConf(null).tipo === null
  && C.normConf({ tipo: 'demo', estagio: 3.6 }).estagio === 4 && C.normConf({ arv: 'a b' }).arv === null, 'normalizar: o tipo, a árvore, o ajuste (até ±5) e o estágio à mão (0 a 5)');
ok(j(C.normCortes([2, 4, 6, 8, 10])) === j([2, 4, 6, 8, 10]) && j(C.normCortes([5, 4, 6, 8, 10])) === j(C.CORTES_PADRAO) && j(C.normCortes([1, 2])) === j(C.CORTES_PADRAO) && j(C.normCortes(null)) === j([3, 8, 15, 25, 40]),
  'os cortes: cinco números sempre subindo (senão, os de começo: 3, 8, 15, 25, 40)');
ok(j(C.cortesDe({ corr: { vamp: [1, 2, 3, 4, 5] } }, 'vamp')) === j([1, 2, 3, 4, 5]) && j(C.cortesDe({ corr: { vamp: [1, 2, 3, 4, 5] } }, 'lica')) === j(C.CORTES_PADRAO) && j(C.cortesDe(null, 'vamp')) === j(C.CORTES_PADRAO),
  'um jogo de cortes por tipo, da mesa');

const bib = { arvores: [
  { id: 'av', nome: 'Linhagem do Vampiro', categoria: 'linhagem', nodes: [
    { id: 'r', graus: [{ custos: { lin: 3 } }, { custos: { lin: 5 } }, { custos: { lin: 7, ouro: 2 } }] },
    { id: 'm', graus: [{ custos: { lin: 4 } }] },
    { id: 'z', graus: [{ custos: { lin: 100 } }] }] },
  { id: 'al', nome: 'Linhagem do Lobo', categoria: 'linhagem', nodes: [{ id: 'l1', graus: [{ custos: { lin: 6 } }] }] },
  { id: 'gu', nome: 'Guerreiro', categoria: 'classe', nodes: [{ id: 'g1', graus: [{ custos: { cl: 2 } }] }] }] };
const skills = { arvores: ['av', 'gu'], alocados: { r: 2, m: 1, g1: 1, fantasma: 3 } };
ok(C.gastoNaArvore(skills, bib, 'av') === 12 && C.gastoNaArvore({ alocados: { r: 9 } }, bib, 'av') === 17 && C.gastoNaArvore(skills, bib, 'al') === 0 && C.gastoNaArvore(skills, bib, 'nada') === 0 && C.gastoNaArvore(null, bib, 'av') === 0,
  'os pontos gastos na árvore: a soma dos custos dos graus que o personagem tem (de todos os tipos de ponto; o grau além do último não conta)');

const e = C.estado({ tipo: 'vamp', arv: 'av' }, skills, bib, null);
ok(e.n === 2 && e.nome === 'Sedento' && e.pts === 12 && e.prox === 15 && !e.manual && e.base === 2, 'vampírica: 12 pontos passam de 3 e de 8 — estágio 2 (Sedento), o próximo com 15: ' + j(e));
const e2 = C.estado({ tipo: 'vamp', arv: 'av', ajuste: 1 }, skills, bib, null), e3 = C.estado({ tipo: 'vamp', arv: 'av', ajuste: -4 }, skills, bib, null), e4 = C.estado({ tipo: 'vamp', arv: 'av', ajuste: 5 }, skills, bib, null);
ok(e2.n === 3 && e2.nome === 'Noturno' && e3.n === 0 && e3.nome === '' && e4.n === 5 && e4.nome === 'Senhor da Noite', 'o ajuste do mestre soma (sem passar de 0 nem de 5)');
ok(C.estado({ tipo: 'lica', arv: 'av' }, skills, bib, { corr: { lica: [1, 2, 3, 12, 50] } }).nome === 'Fera' && C.estado({ tipo: 'lica', arv: 'av' }, { alocados: { r: 3, m: 1, z: 1 } }, bib, null).prox === null,
  'licantropa, com os cortes da mesa: 12 pontos é o estágio 4 (Fera); no fim da escala, sem próximo');
const d = C.estado({ tipo: 'demo', estagio: 3, ajuste: 2, arv: 'av' }, skills, bib, null);
ok(d.n === 3 && d.nome === 'Pactuado' && d.manual && d.pts === null && C.estado({ tipo: 'demo' }, skills, bib, null).n === 0, 'demoníaca: o estágio à mão (os pontos e o ajuste não contam)');
ok(C.estado({}, skills, bib, null) === null && C.estado({ tipo: 'vamp' }, skills, bib, null).n === 0, 'sem tipo, sem corrupção; sem árvore, estágio 0');
ok(C.rotulo(e) === 'Corrupção vampírica: Sedento (estágio 2 de 5)' && C.rotulo(e3) === 'Corrupção vampírica: ainda adormecida' && C.rotulo(null) === '', 'o texto do estágio');

ok(j(C.arvoresParaEscolher(bib, skills).map(a => a.id)) === j(['av', 'al', 'gu']), 'as árvores para escolher: as de linhagem primeiro (a equipada na frente), depois as outras');
ok(C.arvorePadrao(bib, skills, 'vamp') === 'av' && C.arvorePadrao(bib, { arvores: ['al', 'av'] }, 'lica') === 'al' && C.arvorePadrao(bib, { arvores: ['gu'] }, 'vamp') === null,
  'a árvore de começo: a de linhagem equipada que lembra o tipo (Vampiro, Lobo), senão nenhuma');
ok(C.docId('pc_selene') === 'fichas:corr:pc_selene' && C.pcDoDoc('fichas:corr:pc_selene') === 'pc_selene' && C.pcDoDoc('fichas:cfg') === null, 'o documento de cada personagem');
ok(C.ORDEM.every(k => C.TIPOS[k].estagios.length === C.MAX) && C.TIPOS.demo.manual && !C.TIPOS.vamp.manual, 'os três tipos, cada um com os cinco nomes de estágio');
end();
