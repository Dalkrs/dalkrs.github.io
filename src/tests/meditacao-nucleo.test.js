// Meditação, a lógica pura (meditacao/nucleo.js): a cena, os símbolos, as receitas (e a conferência delas, igual à
// do banco), o treinamento, a prática e o que a meditação guarda — e o que a página faz sozinha, fora de uma mesa.
'use strict';
const M = require('../../meditacao/nucleo.js');
let n = 0, ruins = 0;
const ok = (c, m) => { n++; if (!c) { ruins++; console.log('FALHOU: ' + m); } };
const j = JSON.stringify;

/* ---------------- catálogos ---------------- */
ok(M.AMBIENTES.length === 8 && M.HORAS.map(h => h[0]).join() === 'manha,tarde,por,noite,madrugada' && j(M.CLIMAS) === j(['sol', 'nublado', 'chuva', 'tempestade', 'neve', 'nevoa', 'vento', 'calor', 'frio']),
  'oito ambientes, cinco horas e os nove climas do Jornal');
{
  const todos = M.GRUPOS.flatMap(g => g.itens), ids = todos.map(s => s.id);
  ok(j(M.GRUPOS.map(g => [g.id, g.itens.length])) === j([['el', 8], ['as', 5], ['an', 6], ['ru', 6]]) && new Set(ids).size === ids.length && ids.every(id => /^[A-Za-z0-9_-]{1,40}$/.test(id))
    && todos.every(s => s.nome && /^M[\d.]/.test(s.d) && !/[<>"]/.test(s.d)), 'os quatro grupos de símbolos prontos (25), com ids que o banco aceita e desenho só de traço');
  ok(M.DESENHOS.length >= 12 && M.DESENHOS.every(d => !ids.includes(d.id) && /^M[\d.]/.test(d.d)), 'mais desenhos para os símbolos do mestre');
}

/* ---------------- a cena ---------------- */
{
  ok(j(M.normCena(null)) === j({ v: 1, amb: 'templo', hora: 'por', clima: '', img: null }), 'a cena de começo: o templo, ao pôr do sol, sem clima');
  const c = M.normCena({ amb: 'caverna', hora: 'madrugada', clima: 'neve', img: 'https://x.supabase.co/a.png', quem: ['pc_a'] });
  ok(j(c) === j({ v: 1, amb: 'caverna', hora: 'madrugada', clima: 'neve', img: 'https://x.supabase.co/a.png' }), 'a cena: ambiente, hora, clima e imagem (quem medita fica à parte)');
  ok(j(M.normQuem({ quem: ['pc_a', 'pc_a', 'pc b', 'a:b', 7, 'pc_c'] })) === j({ v: 1, quem: ['pc_a', 'pc_c'] }) && j(M.normQuem(null)) === j({ v: 1, quem: [] }), 'quem medita: sem repetir, sem id torto');
  ok(M.normCena({ amb: 'lua', hora: 'meio-dia', clima: 'furacao', img: 'javascript:alert(1)' }).amb === 'templo' && M.normCena({ img: 'http://x/a.png' }).img === null && M.normCena({ clima: 'furacao' }).clima === ''
    && M.normCena({ img: 'data:image/png;base64,iVBORw0KGgo=' }).img === 'data:image/png;base64,iVBORw0KGgo=' && M.normCena({ img: 'data:image/svg+xml;base64,PHN2Zz4=' }).img === null
    && M.normCena({ img: 'data:text/html;base64,PGI+' }).img === null, 'o que não existe volta ao de começo (e só imagem https, ou embutida: png, jpeg, webp)');
  ok(M.meditando({ quem: ['pc_a'] }, 'pc_a') && !M.meditando({ quem: ['pc_a'] }, 'pc_b'), 'quem está meditando');
}

/* ---------------- os símbolos ---------------- */
{
  const s = M.normSimbolos({ ocultos: ['g1', 'g1', 'xx', 'lua'], meus: [{ id: 'sm_1', nome: ' Chave de prata ', des: 'chave' }, { nome: 'Sem desenho' }, { id: 'lua', nome: 'Imita um pronto', des: 'olho' }, { nome: '' }, { nome: 'Foto', img: 'https://x/f.png', des: 'olho' }] });
  ok(j(s.ocultos) === j(['g1', 'lua']) && s.meus.length === 4 && j(s.meus[0]) === j({ id: 'sm_1', nome: 'Chave de prata', des: 'chave', img: null }) && s.meus[1].des === 'espiral'
    && s.meus[2].id !== 'lua' && /^sm_/.test(s.meus[2].id) && s.meus[3].img === 'https://x/f.png' && s.meus[3].des === null, 'os símbolos: os prontos escondidos e os do mestre (nome, desenho ou imagem; id que não imita um pronto)');
  const g = M.grupos(s), gm = M.grupos(s, true);
  ok(g.find(x => x.id === 'ru').itens.length === 5 && !g.find(x => x.id === 'as').itens.some(x => x.id === 'lua') && g[g.length - 1].nome === 'Do mestre' && g[g.length - 1].itens.length === 4,
    'para os pilares: sem os escondidos, e um grupo "Do mestre" com os dele');
  ok(gm.find(x => x.id === 'ru').itens.find(x => x.id === 'g1').oculto === true, 'quem mestra vê os escondidos, marcados');
  ok(M.simbolo(s, 'fogo').nome === 'Fogo' && M.simbolo(s, 'sm_1').nome === 'Chave de prata' && /^M/.test(M.simbolo(s, 'sm_1').d) && M.simbolo(s, s.meus[3].id).img === 'https://x/f.png' && M.simbolo(s, 'sumiu').sumiu === true,
    'um símbolo pelo id (pronto, do mestre com desenho ou imagem, ou um que não existe mais)');
  ok(M.seqTxt(s, ['sol', 'fogo', 'sm_1']) === 'Sol → Fogo → Chave de prata', 'a sequência em palavras');
  ok(M.normSimbolos({ meus: Array.from({ length: 70 }, (_, i) => ({ nome: 'S' + i })) }).meus.length === 60, 'até 60 símbolos do mestre');
}

/* ---------------- as receitas ---------------- */
{
  const rec = M.normReceitas({ lista: [
    { id: 'r1', nome: ' Chama  do Primeiro Sol ', seq: ['sol', 'fogo', 'dragao'], efeito: 'O calor\ndo sol.', onde: null, quem: null },
    { id: 'r2', nome: 'Raiz Antiga', seq: ['terra', 'g1'], onde: 'floresta' },
    { id: 'r3', nome: 'Maré', seq: ['lua', 'agua'], onde: 'lugar-nenhum', quem: ['pc_b', 'pc_b', 'x y'] },
    { id: 'r1', nome: '', seq: ['a', 'b c', 'c', 'd', 'e', 'f', 'g'] },
    'lixo',
  ] });
  ok(rec.lista.length === 4 && j(rec.lista[0]) === j({ id: 'r1', nome: 'Chama do Primeiro Sol', seq: ['sol', 'fogo', 'dragao'], efeito: 'O calor\ndo sol.', onde: null, quem: null }), 'a receita: nome, sequência, efeito (com as quebras), onde e para quem');
  ok(rec.lista[1].onde === 'floresta' && rec.lista[2].onde === null && j(rec.lista[2].quem) === j(['pc_b']) && rec.lista[3].id !== 'r1' && rec.lista[3].nome === 'Receita sem nome' && j(rec.lista[3].seq) === j(['a', 'c', 'd', 'e', 'f']),
    'o lugar que não existe vale em qualquer um; para quem, sem repetir; id sem repetir; no máximo 5 pilares (só ids que o banco aceita)');
  ok(M.receitaQueCasa(rec, ['sol', 'fogo', 'dragao'], 'templo', 'pc_a').id === 'r1' && !M.receitaQueCasa(rec, ['fogo', 'sol', 'dragao'], 'templo', 'pc_a') && !M.receitaQueCasa(rec, ['sol', 'fogo'], 'templo', 'pc_a'),
    'a combinação casa só na mesma ordem e com o mesmo número de pilares');
  ok(!M.receitaQueCasa(rec, ['terra', 'g1'], 'templo', 'pc_a') && M.receitaQueCasa(rec, ['terra', 'g1'], 'floresta', 'pc_a').id === 'r2', 'a receita de um ambiente só vale nele');
  ok(!M.receitaQueCasa(rec, ['lua', 'agua'], 'templo', 'pc_a') && M.receitaQueCasa(rec, ['lua', 'agua'], 'templo', 'pc_b').id === 'r3', 'a receita de alguns personagens só vale para eles');
  ok(M.receitaQueCasa(rec, ['sol'], 'templo', 'pc_a') === null && M.receitaPronta(rec.lista[0]) && !M.receitaPronta({ seq: ['sol'] }), 'com menos de 2 símbolos não há receita');
  const dup = M.normReceitas({ lista: [{ id: 'a', seq: ['sol', 'lua'] }, { id: 'b', seq: ['sol', 'lua'], onde: 'templo' }, { id: 'c', seq: ['sol', 'lua'], quem: ['pc_x'] }, { id: 'd', seq: ['lua', 'sol'] }, { id: 'e', seq: ['agua', 'fogo'], onde: 'jardim' }, { id: 'f', seq: ['agua', 'fogo'], onde: 'deserto' },
    { id: 'g', seq: ['luz', 'sombra'], quem: ['pc_a'] }, { id: 'h', seq: ['luz', 'sombra'], quem: ['pc_b'] }, { id: 'i', seq: ['luz', 'sombra'], quem: ['pc_b', 'pc_c'] }] });
  ok(j(M.repetidas(dup).map(x => x.id + '<' + x.antes)) === j(['b<a', 'c<a', 'i<h']),
    'receitas com a mesma sequência que valeriam juntas: só a primeira seria achada (avisa); em ambientes diferentes, ou para personagens diferentes, as duas valem');
  ok(M.normReceitas({ lista: Array.from({ length: 210 }, () => ({ seq: ['sol', 'lua'] })) }).lista.length === 200, 'até 200 receitas');
}

/* ---------------- o treinamento ---------------- */
{
  const t = M.normTreino({ pcs: { pc_a: [{ id: 'b1', nome: 'Controle do chi', max: 10, n: 7 }, { id: 'b2', nome: '', max: 0, n: 5, cheia: '2026-10-14T10:00:00.000Z' }, 'x'], 'pc b': [{ nome: 'x' }], pc_c: [] } });
  ok(j(Object.keys(t.pcs)) === j(['pc_a']) && j(t.pcs.pc_a[0]) === j({ id: 'b1', nome: 'Controle do chi', max: 10, n: 7, cheia: null }) && j(t.pcs.pc_a[1]) === j({ id: t.pcs.pc_a[1].id, nome: 'Treinamento', max: 1, n: 1, cheia: '2026-10-14T10:00:00.000Z' }),
    'as barras de treinamento de cada personagem (máximo de 1 a 999, o valor dentro dele)');
  const a = M.somarTreino(t, 'pc_a', 'b1', 3, '2026-10-15T20:00:00.000Z');
  ok(a.pcs.pc_a[0].n === 10 && a.pcs.pc_a[0].cheia === '2026-10-15T20:00:00.000Z' && t.pcs.pc_a[0].n === 7, 'encher a barra marca quando ela ficou completa (sem mexer no documento de antes)');
  const b = M.somarTreino(a, 'pc_a', 'b1', 5);
  ok(b === null && M.somarTreino(a, 'pc_a', 'b1', -1).pcs.pc_a[0].cheia === null && M.somarTreino(a, 'pc_a', 'nada', 1) === null && M.somarTreino(t, 'pc_a', 'b1', -20).pcs.pc_a[0].n === 0,
    'não passa do máximo nem fica abaixo de zero; tirar um ponto da cheia desmarca');
}

/* ---------------- a prática e o que a meditação guardou ---------------- */
{
  ok(j(M.normPratica({ objeto: ' Um  colar ', mantra: 'A lua\nnão tem pressa', rep: 'Uma raposa\nsob a lua', img: 'https://x/m.png', extra: 1 })) === j({ v: 1, objeto: 'Um colar', mantra: 'A lua não tem pressa', rep: 'Uma raposa\nsob a lua', img: 'https://x/m.png' }),
    'a prática: objeto e mantra numa linha, a representação com as quebras, a imagem');
  const a = M.normAchados({ lib: 1, feitas: 3, achadas: [{ id: 'r1', nome: 'Chama', efeito: 'x', amb: 'templo' }, { id: 'r1', nome: 'de novo' }, { id: 'x y' }],
    reg: [{ tipo: 'tentou', seq: ['sol', 'fogo'], res: 'r1', nome: 'Chama', amb: 'templo', hora: 'por', clima: 'nevoa', em: '2026-10-15T20:00:00.000Z' }, { tipo: 'entrou', amb: 'templo', por: 'mestre' }, { tipo: 'outro' }] });
  ok(a.lib === 3 && a.feitas === 3 && a.achadas.length === 1 && a.reg.length === 2 && a.reg[0].res === 'r1' && j(a.reg[0].seq) === j(['sol', 'fogo']) && a.reg[1].por === 'mestre' && a.reg[1].seq === null,
    'o que a meditação guardou: as liberadas nunca abaixo das feitas, as receitas sem repetir, o registro');
  ok(!M.liberada(a) && M.liberada({ lib: 2, feitas: 1 }) && M.ultimaTentativa(a).res === 'r1' && M.ultimaTentativa({ reg: [{ tipo: 'entrou' }] }) === null, 'há tentativa liberada? qual foi a última?');
}

/* ---------------- fora de uma mesa: entrar, liberar e tentar, como o banco ---------------- */
{
  const rec = { lista: [{ id: 'r1', nome: 'Chama', seq: ['sol', 'fogo', 'dragao'], efeito: 'O calor.' }, { id: 'r2', nome: 'Raiz', seq: ['terra', 'g1'], onde: 'floresta' }] };
  const cena = { amb: 'templo', hora: 'por', clima: 'nevoa' };
  let quem = null, ach = null;
  let r = M.localTentar(quem, cena, ach, rec, 'pc_t', ['sol', 'fogo', 'dragao']);
  ok(!r.ok && /não está meditando/.test(r.msg), 'sem meditar não há tentativa');
  r = M.localEntrar(quem, cena, ach, 'pc_t', true, '2026-10-15T20:00:00.000Z', true); quem = r.quem; ach = r.achados;
  ok(j(quem.quem) === j(['pc_t']) && ach.reg[0].tipo === 'entrou' && ach.reg[0].amb === 'templo' && ach.reg[0].clima === 'nevoa' && ach.reg[0].por === 'mestre', 'entrar: aparece na cena, e o registro guarda o lugar, a hora e o clima');
  ok(M.localEntrar(quem, cena, ach, 'pc_t', true).achados.reg.length === 1, 'entrar de novo não repete');
  ok(M.localEntrar(quem, null, null, 'pc_u', true).achados.reg[0].amb === 'templo', 'sem a cena criada, o registro diz o templo (o lugar de começo)');
  r = M.localTentar(quem, cena, ach, rec, 'pc_t', ['sol', 'fogo', 'dragao']);
  ok(!r.ok && /ainda não liberou/.test(r.msg), 'sem tentativa liberada, não tenta');
  ach = M.localLiberar(ach, 1);
  ok(ach.lib === 1 && M.localLiberar(ach, -5).lib === 0 && M.localLiberar(ach, 50).lib === 5, 'liberar: nunca abaixo das feitas, no máximo 5 à frente');
  ok(!M.localTentar(quem, cena, ach, rec, 'pc_t', ['sol']).ok && !M.localTentar(quem, cena, ach, rec, 'pc_t', ['sol', 'x y']).ok, 'de 2 a 5 símbolos que existem');
  r = M.localTentar(quem, cena, ach, rec, 'pc_t', ['sol', 'fogo', 'corvo'], '2026-10-15T20:05:00.000Z'); ach = r.achados;
  ok(r.ok && r.res.res === 'nada' && ach.feitas === 1 && ach.reg[0].tipo === 'tentou' && ach.reg[0].res === null && !M.liberada(ach), 'errar: "nada", a tentativa foi usada e entra no registro');
  ach = M.localLiberar(ach, 1);
  r = M.localTentar(quem, cena, ach, rec, 'pc_t', ['terra', 'g1']); ach = r.achados;
  ok(r.res.res === 'nada', 'a receita de outro ambiente não vale aqui');
  ach = M.localLiberar(ach, 1);
  r = M.localTentar(quem, cena, ach, rec, 'pc_t', ['sol', 'fogo', 'dragao'], '2026-10-15T20:10:00.000Z'); ach = r.achados;
  ok(j(r.res) === j({ res: 'achou', nova: true, id: 'r1', nome: 'Chama', efeito: 'O calor.' }) && ach.achadas.length === 1 && ach.achadas[0].amb === 'templo' && ach.reg[0].nome === 'Chama', 'acertar: a receita nova entra na lista dele');
  ach = M.localLiberar(ach, 1);
  r = M.localTentar(quem, cena, ach, rec, 'pc_t', ['sol', 'fogo', 'dragao']);
  ok(r.res.res === 'achou' && r.res.nova === false && r.achados.achadas.length === 1, 'acertar de novo a mesma: não é nova');
  ok(j(M.localEntrar(quem, cena, ach, 'pc_t', false).quem.quem) === j([]), 'sair da meditação');
}

console.log(ruins ? n - ruins + ' verificações passaram, ' + ruins + ' falharam' : n + ' verificações passaram');
process.exit(ruins ? 1 : 0);
