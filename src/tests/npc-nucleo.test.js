// O gerador de NPC e os encontros por bioma, a conta pura (tc/npc.js e tc/encontros.js): os nomes por estilo de cultura
// (prenome e sobrenome, o do pai, o de família antes, o que muda com o gênero, o epíteto), a mesma semente dando o mesmo
// NPC, a raça da lista (o estilo e a aparência dela; a sub-raça), o papel (as roupas e os números), o lugar e a facção
// nas frases, as raças das fichas; as tabelas por bioma (normalizar, os dados da quantidade, o sorteio pelo peso, a
// sugestão do Bestiário pelas tags, o resultado pronto para mostrar).
'use strict';
const N = require('../../tc/npc.js');
const EN = require('../../tc/encontros.js');
let n = 0, ruins = 0;
const ok = (c, m) => { n++; if (!c) { ruins++; console.log('FALHOU: ' + m); } };
const j = JSON.stringify;
const rngDe = s => { let x = s; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; };

/* ---------------- os nomes ---------------- */
{
  const E = N.ESTILOS;
  ok(N.ORDEM_ESTILOS.length === 10 && N.ORDEM_ESTILOS.every(k => E[k].m.length >= 20 && E[k].f.length >= 20), 'dez estilos, cada um com pelo menos 20 prenomes de homem e 20 de mulher');
  const nord = N.nomes('nordico', 'f', 30, 5);
  ok(nord.length === 30 && nord.every(x => / \S+sdóttir$/.test(x) || /^\S+ (o |a )?\S+/.test(x)), 'nórdico de mulher: o nome do pai com -sdóttir (ou um apelido): ' + nord.slice(0, 3).join(', '));
  ok(nord.filter(x => /sdóttir$/.test(x)).length >= 20, '(a maioria com o nome do pai)');
  const nordM = N.nomes('nordico', 'm', 30, 6);
  ok(nordM.filter(x => /sson$/.test(x)).length >= 20 && !nordM.some(x => /sdóttir$/.test(x)), 'nórdico de homem: -sson');
  const esl = N.nomes('eslavo', 'f', 40, 7).filter(x => / (Volkova|Petrova|Kowalska|Morozova|Gorska)$/.test(x) || / (Volkov|Petrov|Kowalski|Morozov|Gorski)$/.test(x));
  ok(esl.length > 0 && esl.every(x => /(ova|ska)$/.test(x)), 'eslavo: o sobrenome muda com o gênero (-ova, -ska): ' + esl.slice(0, 3).join(', '));
  const des = N.nomes('deserto', 'f', 40, 8);
  ok(des.some(x => / bint /.test(x)) && !des.some(x => / ibn /.test(x)), 'desértico: bint (de mulher), nunca ibn');
  const cel = N.nomes('celta', 'm', 40, 9);
  ok(cel.some(x => / Mac /.test(x)) && cel.some(x => / O'/.test(x)) && !cel.some(x => / Ní /.test(x)), "celta: Mac ou O' (de homem)");
  const ori = N.nomes('oriental', 'm', 40, 10);
  ok(ori.some(x => E.oriental.sob.includes(x.split(' ')[0])), 'oriental: às vezes o nome de família vem antes');
  ok(N.nomes('anao', 'm', 40, 11).every(x => x.split(' ').length >= 2), 'todo nome tem pelo menos duas partes');
  ok(j(N.nomes('elfico', 'f', 6, 42)) === j(N.nomes('elfico', 'f', 6, 42)) && j(N.nomes('elfico', 'f', 6, 42)) !== j(N.nomes('elfico', 'f', 6, 43)), 'a mesma semente dá os mesmos nomes; outra semente, outros');
  ok(new Set(N.nomes('latino', '', 25, 3)).size === 25, 'os nomes de uma vez não se repetem');
}

/* ---------------- o NPC ---------------- */
{
  const raca = { id: 'rAnao', nome: 'Anão', estilo: 'anao', aparencia: 'barba trançada, nariz largo', sub: { id: 's1', nome: 'da Montanha', estilo: null, aparencia: 'pele cinzenta' } };
  const opts = { raca, papel: 'guarda', gen: 'f', lugar: { mapa: 'm1', obj: 'o1', nome: 'Vila Clara' }, fac: { k: 'faccao', id: 'f1', nome: 'Guarda da Ponte', mapa: 'm1' } };
  const a = N.gerar(opts, 777), b = N.gerar(opts, 777), c = N.gerar(opts, 778);
  ok(j(a) === j(b) && j(a) !== j(c), 'a mesma semente dá o mesmo NPC');
  ok(a.gen === 'f' && a.papel === 'guarda' && a.estilo === 'anao' && a.raca.nome === 'Anão' && a.raca.sub === 'da Montanha', 'o que foi escolhido vale: mulher, guarda, anã da Montanha (o estilo dos nomes da raça)');
  ok(N.ESTILOS.anao.f.includes(a.nome.split(' ')[0]), 'o prenome é dos anões, de mulher: ' + a.nome);
  ok(N.PAPEIS.guarda.roupas.includes(a.roupa) && a.ficha.tier === 'C' && a.ficha.nivel >= 2 && a.ficha.nivel <= 6 && a.ficha.tiers.FOR === 'A' && a.ficha.lado === 'Neutro', 'o papel dá a roupa e os números (tier C, level de 2 a 6, FOR forte, neutro)');
  ok(a.tracos.length >= 2 && a.tracos.every(t => typeof t === 'string' && t) && a.maneirismo && a.fala && a.motivacao && a.segredo && a.gancho, 'o jeito (traços, maneirismo, fala) e o que quer, esconde e o gancho');
  ok(!/\{lugar\}|\{faccao\}/.test(a.motivacao + a.segredo + a.gancho), 'as frases não ficam com {lugar} nem {faccao}');
  const muitos = [];
  for (let s = 1; s <= 120; s++) muitos.push(N.gerar(opts, s));
  ok(muitos.some(x => /Vila Clara/.test(x.motivacao + x.segredo + x.gancho)) && muitos.some(x => /Guarda da Ponte/.test(x.motivacao + x.segredo + x.gancho)), 'o lugar e a facção aparecem nas frases');
  ok(muitos.some(x => ['barba trançada', 'nariz largo', 'pele cinzenta'].includes(x.marca)), 'a aparência típica da raça e da sub-raça aparece (a marca)');
  ok(muitos.every(x => !/^alt/.test(x.corpo) && !/esguia/.test(x.corpo)), 'anão não sai alto, magro ou esguio');
  const sem = [];
  for (let s = 1; s <= 60; s++) sem.push(N.gerar({}, s));
  ok(new Set(sem.map(x => x.estilo)).size >= 6 && new Set(sem.map(x => x.papel)).size >= 10 && sem.some(x => x.gen === 'm') && sem.some(x => x.gen === 'f'), 'sem escolha: estilos, papéis e gêneros variados');
  ok(N.gerar({ raca, estilo: 'celta' }, 5).estilo === 'celta', 'o estilo escolhido vale por cima do da raça');
  const d = N.descricao(a);
  ok(/^Anão \(da Montanha\), guarda, \d+ anos$/.test(d.quem) && /^[A-ZÁÉÍÓÚ]/.test(d.aparencia) && /Veste /.test(d.aparencia) && /\.$/.test(d.jeito), 'a descrição: quem é, a aparência (com a roupa) e o jeito: ' + d.quem);
  const nn = N.normNpc({ nome: '  ', papel: 'xx', estilo: 'yy', ficha: { tier: 'Z', nivel: 99, tiers: { FOR: 'Q' }, lado: 'x' }, lugar: { mapa: 'a b', obj: 'c' }, fac: { k: 'cla', id: 'c1', nome: 'Clã' }, img: 'javascript:x' });
  ok(nn.nome === 'NPC' && nn.papel === 'viajante' && nn.estilo === 'latino' && nn.ficha.tier === 'C' && nn.ficha.nivel === 30 && nn.ficha.tiers.FOR === 'C' && nn.ficha.lado === 'Aliado' && nn.lugar === null && nn.fac.k === 'cla' && nn.img === null, 'normalizar: o que não vale volta ao padrão (e a imagem só https)');
  const fb = N.fichaBestiario(a);
  ok(fb.tier === a.ficha.tier && fb.level === a.ficha.nivel && fb.tiers.FOR === 'A', 'a ficha no formato do Bestiário (para as contas)');
}

/* ---------------- as raças ---------------- */
{
  const rs = N.normRacas({ lista: [{ id: 'a', nome: ' Elfo ', estilo: 'elfico', subs: [{ nome: 'da Floresta' }, { nome: '' }, { nome: 'Alto', estilo: 'latino' }] }, { id: 'a', nome: 'Anão', estilo: 'zz' }, 'x', { nome: '' }] });
  ok(rs.lista.length === 3 && rs.lista[0].nome === 'Elfo' && rs.lista[0].subs.length === 2 && rs.lista[0].subs[1].estilo === 'latino' && rs.lista[1].id !== 'a' && rs.lista[1].estilo === 'latino' && rs.lista[2].nome === 'Raça', 'as raças normalizadas: ids sem repetir, sub-raça sem nome sai, estilo que não existe vira latino');
  const r = rngDe(3);
  const e1 = N.escolherRaca(rs, rs.lista[0].id, rs.lista[0].subs[1].id, r);
  ok(e1.nome === 'Elfo' && e1.sub.nome === 'Alto' && e1.sub.estilo === 'latino', 'escolher a raça e a sub-raça');
  ok(N.escolherRaca({ lista: [] }, null, '', r) === null, 'sem lista, sem raça');
  const v = new Set(); for (let i = 0; i < 40; i++) v.add(N.escolherRaca(rs, null, '', r).nome);
  ok(v.size === 3, 'sem escolher: uma da lista, sorteada');
  ok(j(N.racasDasFichas([{ raca: 'Elfo' }, { raca: 'elfo' }, { raca: 'Anão' }, { raca: '' }, {}, null])) === j(['Anão', 'Elfo']), 'as raças das fichas: sem repetir, em ordem');
  ok(N.estiloPorNome('Meio-Orc') === 'tribal' && N.estiloPorNome('Elfa da floresta') === 'elfico' && N.estiloPorNome('Anões') === 'anao' && N.estiloPorNome('Halfling') === 'pequeno' && N.estiloPorNome('Humano') === 'latino', 'o palpite do estilo pelo nome da raça');
}

/* ---------------- os encontros por bioma ---------------- */
{
  ok(EN.ORDEM.length === 13 && EN.ORDEM.includes('floresta') && EN.ORDEM.includes('agua'), 'os biomas do Mapa-múndi (13)');
  ok(j(EN.dadosOk('1d4+1')) === j({ n: 1, f: 4, b: 1, txt: '1d4+1' }) && EN.dadosOk('3').txt === '3' && EN.dadosOk('0d4') === null && EN.dadosOk('1d4*2') === null && EN.dadosOk('31') === null, 'os dados da quantidade: número ou NdF±B');
  const r = rngDe(11);
  let lo = 99, hi = 0;
  for (let i = 0; i < 300; i++) { const q = EN.rolarDados('2d4+1', r); lo = Math.min(lo, q.n); hi = Math.max(hi, q.n); }
  ok(lo === 3 && hi === 9, 'rolar 2d4+1 vai de 3 a 9: ' + lo + '–' + hi);
  ok(EN.rolarDados('1d2-5', r).n === 1 && /= /.test(EN.rolarDados('2d6', r).txt), 'a quantidade é pelo menos 1, e o texto mostra a conta');
  const d = EN.normBiomas({ sugerir: 'xx', tabelas: { floresta: { chance: 140, itens: [{ k: 'inimigo', ref: 'gob', dados: 'abc', p: 0 }, { k: 'zz' }, { k: 'evento', txt: 'Ponte caída' }, { k: 'npc', papel: 'guarda', raca: 'rA' }] }, marte: { chance: 10 } } });
  const t = d.tabelas.floresta;
  ok(d.sugerir === 'dia' && !d.tabelas.marte && t.chance === 100 && t.itens.length === 3 && t.itens[0].dados === '1' && t.itens[0].p === 1 && t.itens[2].papel === 'guarda', 'a tabela normalizada: chance até 100, tipo desconhecido sai, dados ruins viram 1, o peso pelo menos 1');
  ok(EN.regiaoTemTabela({ enc: { chance: 0, itens: [{ p: 1, txt: '' }] } }) === false && EN.regiaoTemTabela({ enc: { chance: 0, itens: [{ p: 1, txt: 'Lobos' }] } }) === true && EN.regiaoTemTabela({ enc: { chance: 15, itens: [] } }) === true, 'a região "tem tabela" quando tem chance ou um resultado escrito (a região manda)');
  const tab = { chance: 60, itens: [{ id: 'i1', k: 'inimigo', ref: 'gob', dados: '1d4+1', p: 3 }, { id: 'i2', k: 'encontro', ref: 'e1', p: 1 }, { id: 'i3', k: 'npc', papel: 'mercenario', p: 2 }, { id: 'i4', k: 'evento', txt: 'Uma ponte caída.', p: 1 }, { id: 'i5', k: 'nada', p: 3 }] };
  const cont = {}, r2 = rngDe(5);
  let houve = 0;
  for (let i = 0; i < 2000; i++) { const x = EN.sortear(tab, r2); if (x.houve) { houve++; cont[x.item.id] = (cont[x.item.id] || 0) + 1; } }
  ok(houve > 1050 && houve < 1350, 'a chance de 60%: ' + houve + ' de 2000');
  ok(cont.i1 > cont.i3 && cont.i3 > cont.i2 && cont.i5 > cont.i4, 'o peso decide o que sai mais: ' + j(cont));
  ok(EN.sortear({ chance: 0, itens: tab.itens }, r2).houve === false && EN.sortear(tab, () => 0.999, -100).chance === 0 && EN.sortear(tab, () => 0, 200).chance === 100, 'chance 0 nunca; o extra dos eventos soma e fica entre 0 e 100');
  const pct = EN.porcentagens(tab);
  ok(pct.get('i1') === 30 && pct.get('i5') === 30 && pct.get('i2') === 10, 'as porcentagens de cada resultado');
  const ini = [{ id: 'a', e: { tags: ['Floresta'], ficha: { tier: 'D' } } }, { id: 'b', e: { tags: ['Mar'], ficha: { tier: 'C' } } }, { id: 'c', e: { tags: ['selva'], ficha: { tier: 'B' } } }, { id: 'gob', e: { tags: ['Floresta'], ficha: { tier: 'E' } } }];
  const sug = EN.sugerirDoBestiario(tab, 'floresta', ini);
  ok(sug.length === 1 && sug[0].ref === 'a' && sug[0].dados === '1d4' && sug[0].p === 4, 'sugerir do Bestiário: os inimigos com a tag do bioma que ainda não estão na tabela (os dados e o peso pelo tier)');
  ok(EN.sugerirDoBestiario({ itens: [] }, 'selva', ini).map(x => x.ref).sort().join() === 'a,c,gob', 'a selva aceita as tags Selva e Floresta (sem diferença de maiúscula)');
  const racas = { lista: [{ id: 'rA', nome: 'Anão', estilo: 'anao' }] };
  const ctx = { rng: rngDe(9), npc: N, racas, inimigo: id => ({ gob: { nome: 'Goblin' }, xam: { nome: 'Xamã goblin' } })[id] || null, encontro: id => (id === 'e1' ? { nome: 'Emboscada', itens: [{ id: 'gob', n: 3 }, { id: 'xam', n: 1 }, { id: 'sumiu', n: 2 }] } : null), lugar: { mapa: 'm', obj: 'o', nome: 'Vale' } };
  const ri = EN.resolver(EN.normItem(tab.itens[0]), ctx);
  ok(ri.k === 'inimigos' && ri.linhas.length === 1 && ri.linhas[0].n >= 2 && ri.linhas[0].n <= 5 && ri.texto === ri.linhas[0].n + ' × Goblin', 'inimigos: a quantidade rolada pelos dados: ' + ri.texto);
  const re = EN.resolver(EN.normItem(tab.itens[1]), ctx);
  ok(re.k === 'inimigos' && re.nome === 'Emboscada' && re.texto === 'Emboscada: 3 × Goblin e 1 × Xamã goblin', 'o encontro guardado (sem quem saiu do Bestiário): ' + re.texto);
  const rn = EN.resolver(EN.normItem({ k: 'npc', papel: 'mercenario', raca: 'rA' }), ctx);
  ok(rn.k === 'npc' && rn.npc.papel === 'mercenario' && rn.npc.raca.nome === 'Anão' && rn.npc.estilo === 'anao' && /^Alguém no caminho: /.test(rn.texto), 'o NPC sorteado na hora, com o papel e a raça da tabela: ' + rn.texto);
  ok(EN.resolver(EN.normItem(tab.itens[3]), ctx).texto === 'Uma ponte caída.' && EN.resolver(EN.normItem(tab.itens[4]), ctx).k === 'nada', 'o evento e o "nada"');
  ok(EN.resolver(EN.normItem({ k: 'inimigo', ref: 'sumiu' }), ctx).k === 'falta' && EN.resolver(null, ctx).k === 'vazio', 'o inimigo que saiu do Bestiário; a tabela sem resultado');
  ok(EN.textoLinhas([{ n: 2, nome: 'Lobo' }, { n: 0, nome: 'Urso' }, { n: 1, nome: 'Alfa' }]) === '2 × Lobo e 1 × Alfa', 'o texto das quantidades (sem quem ficou em zero)');
}

console.log(ruins ? n - ruins + ' verificações passaram, ' + ruins + ' falharam' : n + ' verificações passaram');
process.exit(ruins ? 1 : 0);
