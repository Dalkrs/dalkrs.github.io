// A busca rápida (lote 7, parte 6), no Node: o que entra (por papel), as campanhas, o que vem do navegador sem mesa e a
// ordem dos resultados.
'use strict';
const path = require('path');
const B = require(path.join(__dirname, '..', '..', 'tc', 'busca.js'));
let n = 0, bad = 0;
const ok = (c, msg) => { n++; if (!c) { bad++; console.log('FALHOU: ' + msg); } };
const j = JSON.stringify;

const personagens = [
  { id: 'pc_dain', nome: 'Dáin Escudo', dono_id: 'u_jog', ficha: { itens: [{ id: 'i1', nome: 'Escudo de carvalho' }], bolsa: [{ id: 'b1', nome: 'Poção de cura' }] } },
  { id: 'pc_lia', nome: 'Lia', dono_id: 'u_outro', campanha: 'cp2', ficha: { itens: [], bolsa: [] } },
  { id: 'npc_ogro', nome: 'Ogro da Ponte', dono_id: null, ficha: { itens: [{ id: 'i9', nome: 'Clava' }] } },
  { id: 'pet_lobo', nome: 'Lobo', dono_id: 'u_jog', ficha: { petDe: 'pc_dain' } },
  { id: 'apagado', nome: 'Velho', apagado: true },
];
const docs = {
  'cenas:indice': { ordem: ['c2', 'c1', 'c3'], pastas: { lista: [{ id: 'p1', nome: 'Capítulo 1' }], de: { c2: 'p1' }, mae: { c3: 'c1' } } },
  'cena:c1:m': { name: 'Taverna do Dain' }, 'cena:c2:m': { name: 'Ponte Velha' }, 'cena:c3:m': { name: 'Porão' }, 'cena:c4:m': { name: 'Palácio' }, 'cena:pub:m': { name: 'Projeção' },
  'mundo:mapa:mp1': { nome: 'Urgm', faccoes: [{ id: 'f1', nome: 'Guilda dos Ratos' }, { id: 'f2', nome: 'Culto Oculto', oculta: true }],
    objs: [{ id: 'm1', k: 'm', nome: 'Vila do Dain' }, { id: 'm2', k: 'm', nome: 'Covil secreto', oculto: true }, { id: 'r1', k: 'r', nome: 'Reino de Aldar' }, { id: 't1', k: 't', nome: 'Rota do sal' },
      { id: 'x1', k: 'x', nome: 'Mar do Norte' }, { id: 'e1', k: 'e', nome: '' }, { id: 'q1', k: 'q', nome: 'Tipo que não existe' }] },
  'mundo:pub:mp1': { nome: 'Urgm', faccoes: [{ id: 'f1', nome: 'Guilda dos Ratos' }], objs: [{ id: 'm1', k: 'm', nome: 'Vila do Dain' }, { id: 'r1', k: 'r', nome: 'Reino de Aldar' }] },
  'mundo:mapa:mp2': { nome: 'Ilhas', objs: [{ id: 'm5', k: 'm', nome: 'Farol' }] },
  'medit:receitas': { lista: [{ id: 'rc1', nome: 'Chama interior' }] },
  'medit:achados:pc_dain': { achadas: [{ id: 'rc1', nome: 'Chama interior' }] },
  'medit:achados:pc_lia': { achadas: [{ id: 'rc2', nome: 'Água calma' }] },
  'jornal:pub': { materias: [{ id: 'mt1', tit: 'Dragão visto em Urgm' }] },
  'jornal:rascunho': { materias: [{ id: 'mt1', tit: 'Dragão visto em Urgm' }, { id: 'mt2', tit: 'O golpe no palácio' }] },
};
const camps = { 'cena:c4:m': ['cp2'], 'mundo:mapa:mp2': ['cp2'], 'cena:c1:m': ['cp1'] };
const fonte = o => Object.assign({ personagens, doc: id => docs[id] || null, docIds: Object.keys(docs), nomes: { u_outro: 'Ana' } }, o);
const TUDO = { cenas: true, mundo: true, meditacao: true, jornal: true };
const mestre = B.indexar(fonte({ eu: 'u_mestre', mestra: TUDO }));
const jog = B.indexar(fonte({ eu: 'u_jog', mestra: {} }));
const tem = (ix, tipo, nome) => ix.some(x => x.tipo === tipo && x.nome === nome);
const achar = (ix, tipo, nome) => ix.find(x => x.tipo === tipo && x.nome === nome) || {};
const alvo = (ix, tipo, nome) => achar(ix, tipo, nome).alvo;

ok(tem(mestre, 'ficha', 'Dáin Escudo') && tem(mestre, 'ficha', 'Ogro da Ponte') && !tem(mestre, 'ficha', 'Velho') && j(alvo(mestre, 'ficha', 'Lia')) === j({ pc: 'pc_lia' }), 'as fichas e os NPCs (o apagado não), com o alvo na aba Fichas');
ok(achar(mestre, 'ficha', 'Lia').sub === 'Personagem de Ana' && achar(mestre, 'ficha', 'Dáin Escudo').sub === 'Personagem de jogador' && achar(mestre, 'ficha', 'Ogro da Ponte').sub === 'NPC' && achar(mestre, 'ficha', 'Lobo').sub === 'Pet',
  'de quem é cada ficha: o nome do jogador (quando se sabe), NPC, pet');
ok(j(alvo(mestre, 'item', 'Escudo de carvalho')) === j({ pc: 'pc_dain', item: 'i1' }) && j(alvo(mestre, 'item', 'Poção de cura')) === j({ pc: 'pc_dain', bolsa: 'b1' }) && achar(mestre, 'item', 'Poção de cura').sub === 'Na bolsa de Dáin Escudo',
  'os itens e o que está na bolsa, com de quem é (e o alvo diz qual dos dois)');
ok(j(mestre.filter(x => x.tipo === 'cena').map(x => x.nome)) === j(['Ponte Velha', 'Taverna do Dain', 'Porão', 'Palácio']) && j(alvo(mestre, 'cena', 'Taverna do Dain')) === j({ cena: 'c1' }), 'as cenas, na ordem do mestre (a projeção não)');
ok(achar(mestre, 'cena', 'Porão').sub === 'Cena dentro de “Taverna do Dain”' && achar(mestre, 'cena', 'Ponte Velha').sub === 'Cena · pasta “Capítulo 1”' && achar(mestre, 'cena', 'Palácio').sub === 'Cena', 'a família (a cena de cima) ou a pasta de cada cena');
ok(tem(mestre, 'mundo', 'Covil secreto') && tem(mestre, 'mundo', 'Urgm') && tem(mestre, 'mundo', 'Rota do sal') && tem(mestre, 'mundo', 'Mar do Norte') && !tem(mestre, 'mundo', 'Tipo que não existe') && !mestre.some(x => x.tipo === 'mundo' && !x.nome)
  && j(alvo(mestre, 'mundo', 'Reino de Aldar')) === j({ mapa: 'mp1', obj: 'r1' }) && achar(mestre, 'mundo', 'Vila do Dain').sub === 'Marcador · Urgm' && achar(mestre, 'mundo', 'Mar do Norte').sub === 'Texto · Urgm',
  'o mapa inteiro para quem mestra: tudo o que tem nome (o que não tem, não)');
ok(j(alvo(mestre, 'mundo', 'Guilda dos Ratos')) === j({ mapa: 'mp1', fac: 'f1' }) && achar(mestre, 'mundo', 'Culto Oculto').sub === 'Facção · Urgm', 'as facções do mapa (para quem mestra, até as escondidas)');
ok(j(alvo(mestre, 'receita', 'Chama interior')) === j({ receita: 'rc1' }) && tem(mestre, 'jornal', 'O golpe no palácio') && achar(mestre, 'jornal', 'O golpe no palácio').sub === 'No rascunho do Jornal' && j(alvo(mestre, 'jornal', 'O golpe no palácio')) === j({ materia: 'mt2', rascunho: true }),
  'as receitas e o rascunho do Jornal, para quem mestra');
// mestrar só uma parte (o mestre auxiliar com algumas abas)
const aux = B.indexar(fonte({ eu: 'u_aux', mestra: { mundo: true } }));
ok(!aux.some(x => x.tipo === 'cena') && tem(aux, 'mundo', 'Covil secreto') && !tem(aux, 'jornal', 'O golpe no palácio') && !aux.some(x => x.alvo.receita), 'quem mestra só o Mapa-múndi: o mapa inteiro, mas não as cenas, as receitas nem o rascunho');
// quem joga
ok(!jog.some(x => x.tipo === 'cena') && !tem(jog, 'mundo', 'Covil secreto') && tem(jog, 'mundo', 'Vila do Dain') && !tem(jog, 'mundo', 'Farol') && !tem(jog, 'jornal', 'O golpe no palácio') && tem(jog, 'jornal', 'Dragão visto em Urgm'),
  'quem joga: sem as cenas, só o que os jogadores veem do mapa, só o Jornal publicado');
ok(tem(jog, 'mundo', 'Guilda dos Ratos') && !tem(jog, 'mundo', 'Culto Oculto'), 'quem joga: as facções que os jogadores veem');
ok(j(alvo(jog, 'receita', 'Chama interior')) === j({ achado: 'rc1', pc: 'pc_dain' }) && !tem(jog, 'receita', 'Água calma') && achar(jog, 'ficha', 'Dáin Escudo').sub === 'Seu personagem',
  'quem joga: as receitas que os personagens dele descobriram (as de outro jogador, não)');
// (defesa) um mapa mostrado que ainda traga algo escondido (uma projeção antiga): quem joga não acha
const velho = B.indexar({ personagens: [], docIds: ['mundo:pub:mpv'], mestra: {},
  doc: id => (id === 'mundo:pub:mpv' ? { nome: 'Velho', objs: [{ id: 'z1', k: 'm', nome: 'Escondido antigo', oculto: true }], faccoes: [{ id: 'fz', nome: 'Facção antiga', oculta: true }] } : null) });
ok(tem(velho, 'mundo', 'Velho') && !tem(velho, 'mundo', 'Escondido antigo') && !tem(velho, 'mundo', 'Facção antiga'), 'quem joga não acha o que vier escondido num mapa mostrado');
// as campanhas
const comCamp = B.indexar(fonte({ eu: 'u_mestre', mestra: TUDO, vista: 'cp1', campanhas: [{ id: 'cp1', nome: 'A Guerra' }, { id: 'cp2', nome: 'As Ilhas' }], campsDoc: id => camps[id] || [] }));
ok(achar(comCamp, 'cena', 'Palácio').outra === 'As Ilhas' && !achar(comCamp, 'cena', 'Taverna do Dain').outra && !achar(comCamp, 'cena', 'Ponte Velha').outra && achar(comCamp, 'mundo', 'Farol').outra === 'As Ilhas' && achar(comCamp, 'mundo', 'Ilhas').outra === 'As Ilhas',
  'a cena e o mapa de outra campanha dizem de qual (o que é da campanha em vista ou do mundo, não)');
ok(achar(comCamp, 'ficha', 'Lia').sub === 'Personagem de Ana · As Ilhas' && !achar(comCamp, 'ficha', 'Lia').outra, 'a ficha de outra campanha diz de qual (e abre do mesmo jeito)');
ok(!achar(mestre, 'cena', 'Palácio').outra, 'sem campanha em vista, nada é de outra campanha');
// a busca
const nomes = r => r.map(x => x.nome);
ok(j(nomes(B.buscar(mestre, 'dain'))) === j(['Dáin Escudo', 'Taverna do Dain', 'Vila do Dain', 'Porão', 'Escudo de carvalho', 'Poção de cura']), 'sem acento: o nome que começa vem antes, depois as palavras, depois o que só a linha de baixo tem: ' + j(nomes(B.buscar(mestre, 'dain'))));
ok(j(nomes(B.buscar(mestre, 'ponte  OGRO'))) === j(['Ogro da Ponte', 'Clava']) && !B.buscar(mestre, '').length && !B.buscar(mestre, '   ').length && !B.buscar(mestre, 'xyz').length, 'todas as palavras, em qualquer ordem; nada para a busca vazia ou sem resultado');
ok(B.buscar(mestre, 'a', 3).length === 3 && B.buscar(mestre, 'a').length <= 40, 'o limite de resultados');
const pa = nomes(B.buscar(comCamp, 'pal'));
ok(pa.indexOf('O golpe no palácio') > -1 && pa[0] === 'Palácio', 'o de outra campanha também aparece (no empate, depois do que está em vista)');
const em = nomes(B.buscar(comCamp, 'cena'));
ok(em.indexOf('Palácio') === em.length - 1, 'no empate, o que é de outra campanha fica por último: ' + j(em));
// sem mesa: o que os sistemas guardaram neste navegador
const guardado = {
  urgm_calc_atributos_v1: j({ personagens: [{ id: 'p1', nome: 'Kira', itens: [{ id: 'k1', nome: 'Katana' }], bolsa: [] }, { nome: 'sem id' }] }),
  'tinycats:cenas:lista': j([{ id: 'sc_a', nome: 'Floresta' }, { id: 'sc_b' }]),
  'tinycats:mundo:v1': j({ atual: 'w1', mapas: { w1: { nome: 'Terra', objs: [{ id: 'o1', k: 'm', nome: 'Forte' }] } } }),
  'tinycats:jornal:pub': j({ materias: [{ id: 'j1', tit: 'Notícia' }] }),
  'tinycats:jornal:rascunho': j({ materias: [{ id: 'j2', tit: 'Rascunho' }] }),
  'tinycats:meditacao:local': j({ 'medit:receitas': { lista: [{ id: 'r9', nome: 'Vento' }] } }),
};
const loc = B.indexar(B.fonteLocal(k => (k in guardado ? guardado[k] : null)));
ok(achar(loc, 'ficha', 'Kira').sub === 'Ficha' && j(alvo(loc, 'item', 'Katana')) === j({ pc: 'p1', item: 'k1' }) && !tem(loc, 'ficha', 'sem id'), 'sem mesa: as fichas deste navegador (sem dono) e os itens');
ok(j(alvo(loc, 'cena', 'Floresta')) === j({ cena: 'sc_a' }) && tem(loc, 'cena', 'Cena') && j(alvo(loc, 'mundo', 'Forte')) === j({ mapa: 'w1', obj: 'o1' }), 'sem mesa: as cenas e os mapas deste navegador');
ok(j(alvo(loc, 'receita', 'Vento')) === j({ receita: 'r9' }) && tem(loc, 'jornal', 'Notícia') && tem(loc, 'jornal', 'Rascunho'), 'sem mesa: as receitas e o Jornal (o publicado e o rascunho)');
ok(B.indexar(B.fonteLocal(() => '{estragado')).length === 0 && B.indexar(B.fonteLocal(null)).length === 0 && B.indexar(null).length === 0, 'nada guardado (ou guardado estragado): nada para achar, sem erro');
console.log(bad ? `${n - bad} verificações passaram, ${bad} falharam` : `${n} verificações passaram`);
process.exit(bad ? 1 : 0);
