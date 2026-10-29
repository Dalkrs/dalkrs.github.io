// O Bestiário do clã (lote 36), a lógica pura (livro/nucleo.js): os documentos, a página, o que o clã vê de cada uma
// (a mesma conta do banco: o teste de rede confere as duas), o que vem do Bestiário do mestre (os números aproximados,
// enviar de novo sem apagar o que o mestre mudou no livro), as anotações, o índice e a busca.
const { checker } = require('./lib');
const { ok, end } = checker();
const N = require('../../livro/nucleo.js');
const j = JSON.stringify;

// os documentos
ok(j(N.qualDoc('cla:livro:gar')) === j({ k: 'capa', cla: 'gar', pag: null }) && j(N.qualDoc('cla:livro:gar:p:b_lobo')) === j({ k: 'pag', cla: 'gar', pag: 'b_lobo' })
  && j(N.qualDoc('cla:lpub:gar')) === j({ k: 'capaPub', cla: 'gar', pag: null }) && j(N.qualDoc('cla:lpub:gar:p:x1')) === j({ k: 'pagPub', cla: 'gar', pag: 'x1' })
  && j(N.qualDoc('cla:lpub:gar:n:x1')) === j({ k: 'notas', cla: 'gar', pag: 'x1' }), 'os cinco documentos do livro, pelo id');
ok(N.qualDoc('cla:livro:gar:n:x1') === null && N.qualDoc('cla:c:gar') === null && N.qualDoc('cla:livro:ga r') === null && N.qualDoc('cla:lpub:gar:p:') === null && N.qualDoc(5) === null,
  'o resto não é do livro (anotações só no que o clã vê; o clã e ids com espaço ou vazios)');
ok(N.idPagina('gar', 'p1') === 'cla:livro:gar:p:p1' && N.idPaginaPub('gar', 'p1') === 'cla:lpub:gar:p:p1' && N.idNotas('gar', 'p1') === 'cla:lpub:gar:n:p1' && N.idCapaPub('gar') === 'cla:lpub:gar', 'e os ids, de volta');

// a página
const p0 = N.normPagina({ nome: '  Lobo   da Névoa ', img: 'javascript:alert(1)', nums: [{ n: 'Vida', v: '~120' }, { n: '', v: '' }, 'x'], fraq: [{ nome: 'Fogo', tipo: 'fraco' }, { nome: 'fogo', tipo: 'imune' }, { nome: 'Gelo', tipo: 'qualquer' }],
  saque: ['Pele', 'pele', '', 3], ver: { pag: 1, img: true, desc: 'sim' }, mao: { desc: true, legenda: true }, de: 'best:i:abc', enviado: 'ontem' });
ok(p0.nome === 'Lobo da Névoa' && p0.img === null && j(p0.nums) === j([{ n: 'Vida', v: '~120' }]) && j(p0.fraq) === j([{ nome: 'Fogo', tipo: 'fraco' }, { nome: 'Gelo', tipo: 'fraco' }]) && j(p0.saque) === j(['Pele']),
  'normalizar a página: o nome, a imagem que não é imagem, as linhas vazias, as repetidas e os tipos: ' + j(p0));
ok(j(p0.ver) === j({ pag: false, img: true, desc: false, nums: false, fraq: false, saque: false }) && j(p0.mao) === j({ desc: true }) && p0.de === 'best:i:abc' && p0.enviado === null,
  'o que o clã vê só com true; o que o mestre mudou no livro, só os campos que vêm do Bestiário; a data que não é data');
ok(N.normPagina({ img: 'https://x.supabase.co/storage/v1/object/public/mesas/m/a.webp' }).img === 'https://x.supabase.co/storage/v1/object/public/mesas/m/a.webp' && N.normPagina({ img: 'http://x/a.png' }).img === null && N.normPagina({}).nome === 'Criatura sem nome',
  'a imagem: só https (ou embutida, fora de uma mesa)');

// o que o clã vê
const cheia = { nome: 'Lobo da Névoa', img: 'https://x/a.webp', legenda: 'Avistado na névoa', desc: 'Caça em bando.', nums: [{ n: 'Vida', v: '~120' }], fraq: [{ nome: 'Fogo', tipo: 'fraco' }], saque: ['Pele'] };
const aberto = { on: true, titulo: 'Bestiário do Garret' };
ok(N.projetar(Object.assign({}, cheia, { ver: { pag: true } }), { on: false }) === null && N.projetar(Object.assign({}, cheia, { ver: { img: true } }), aberto) === null && N.projetar(cheia, null) === null,
  'nada com o livro trancado, com a página escondida ou sem capa');
ok(j(N.projetar(Object.assign({}, cheia, { ver: { pag: true } }), aberto)) === j({ v: 1, nome: 'Lobo da Névoa', oc: ['img', 'desc', 'nums', 'fraq', 'saque'] }),
  'só a página: o nome, e o aviso de cada parte que existe (sem o conteúdo)');
ok(j(N.projetar(Object.assign({}, cheia, { ver: { pag: true, img: true, fraq: true } }), aberto)) === j({ v: 1, nome: 'Lobo da Névoa', img: 'https://x/a.webp', legenda: 'Avistado na névoa', fraq: [{ nome: 'Fogo', tipo: 'fraco' }], oc: ['desc', 'nums', 'saque'] }),
  'a ilustração (com a legenda) e as fraquezas reveladas; o resto, escondido');
ok(j(N.projetar({ nome: 'Rato', desc: '', nums: [], legenda: 'só a legenda', ver: { pag: true, img: true, desc: true, nums: false } }, aberto)) === j({ v: 1, nome: 'Rato', img: null, legenda: 'só a legenda', oc: [] }),
  'a parte vazia não aparece (nem borrada); a legenda sozinha conta como ilustração');
ok(j(N.projetarCapa(aberto)) === j({ v: 1, titulo: 'Bestiário do Garret' }) && N.projetarCapa({ titulo: 'x' }) === null, 'a capa: o título, só com o livro liberado');
ok(j(N.normPub({ v: 1, nome: 'Rato', img: 'https://x/r.webp', legenda: 'l', desc: 'd', oc: ['img', 'nums', 'nums', 'xx'] })) === j({ v: 1, nome: 'Rato', img: 'https://x/r.webp', legenda: 'l', desc: 'd', oc: ['nums'] }) && N.normPub({ v: 1, oculto: true }) === null,
  'a página que chega do banco, limpa: uma parte não pode estar revelada e escondida ao mesmo tempo');

// do Bestiário para o livro
ok(N.vidaAprox(118) === '~120' && N.vidaAprox(23) === '~25' && N.vidaAprox(2) === '~5' && N.vidaAprox(1234) === '~1250' && N.vidaAprox(0) === '' && N.vidaAprox('x') === '', 'a vida arredondada: de 5 em 5, de 10 em 10, de 50 em 50');
ok(['Lenta', 'Normal', 'Rápida', 'Muito rápida', 'Relâmpago'].join() === [0, 2, 5, 8, 12].map(N.iniPalavra).join() && N.iniPalavra(-3) === 'Lenta', 'a iniciativa em palavras');
ok(N.bolinhas(N.perigoDe('E')) === '●○○○○' && N.bolinhas(N.perigoDe('C')) === '●●●○○' && N.bolinhas(N.perigoDe('S')) === '●●●●●' && N.perigoDe('?') === 3, 'o perigo pelo tier, em bolinhas');
const inimigo = { nome: 'Lobo da Névoa', img: 'https://x/l.webp', tags: ['Floresta', 'Fera'], ficha: { tier: 'C', itens: [{ nome: 'Coleira', chance: 20 }, { nome: 'Garra de ferro', chance: 0 }] },
  comp: { texto: 'Caça em bando.', lembrete: 'foge com 25%' }, saque: { itens: [{ nome: 'Pele de névoa' }, { nome: 'Presa longa' }] }, fraq: [{ nome: 'Fogo', tipo: 'fraco' }, { nome: 'Gelo', tipo: 'imune' }], notas: 'segredo do mestre' };
const contas = { barras: [{ n: 'HP', m: 118 }, { n: 'SP', m: 40 }], ini: 5 };
const veio = N.deInimigo(inimigo, contas, ['Floresta'], ['Fera']);
ok(j(veio.nums) === j([{ n: 'Vida', v: '~120' }, { n: 'Perigo', v: '●●●○○' }, { n: 'Iniciativa', v: 'Rápida' }, { n: 'Habitat', v: 'Floresta' }, { n: 'Tipo', v: 'Fera' }]),
  'os números aproximados do inimigo: a vida pelo HP, o perigo pelo tier, a iniciativa, o habitat e o tipo: ' + j(veio.nums));
ok(j(veio.saque) === j(['Pele de névoa', 'Presa longa', 'Coleira']) && veio.desc === 'Caça em bando.' && j(veio.fraq) === j(inimigo.fraq) && veio.img === 'https://x/l.webp' && !j(veio).includes('segredo'),
  'o saque (com o equipamento que pode cair), o comportamento como descrição, as fraquezas e a imagem — sem as notas do mestre');
const nova = N.receber(null, veio, 'best:i:lobo', '2026-10-29T03:00:00.000Z');
ok(nova.nome === 'Lobo da Névoa' && nova.de === 'best:i:lobo' && nova.enviado === '2026-10-29T03:00:00.000Z' && Object.values(nova.ver).every(v => v === false) && j(nova.mao) === '{}',
  'a página nova chega com tudo escondido do clã');
// o mestre mexe no livro: a legenda, a descrição, o que o clã vê
const noLivro = N.marcarMao(nova, Object.assign({}, nova, { legenda: 'Avistado em Merunê', desc: 'Caça em bando nas manhãs de neblina.', ver: { pag: true, desc: true } }));
ok(j(noLivro.mao) === j({ desc: true }) && noLivro.legenda === 'Avistado em Merunê', 'o que o mestre muda no livro fica marcado (a legenda não vem do Bestiário: nem precisa)');
ok(j(N.marcarMao({ nome: 'x' }, { nome: 'y' }).mao) === '{}', 'numa página feita à mão (sem Bestiário), nada a marcar');
const veio2 = N.deInimigo(Object.assign({}, inimigo, { comp: { texto: 'Outro texto.' }, saque: { itens: [{ nome: 'Pele de névoa' }] }, ficha: { tier: 'B' } }), { barras: [{ n: 'HP', m: 200 }], ini: 1 }, [], []);
const de_novo = N.receber(noLivro, veio2, 'best:i:lobo', '2026-10-30T03:00:00.000Z');
ok(de_novo.desc === 'Caça em bando nas manhãs de neblina.' && de_novo.legenda === 'Avistado em Merunê' && j(de_novo.ver) === j(noLivro.ver) && j(de_novo.saque) === j(['Pele de névoa'])
  && de_novo.nums[0].v === '~200' && de_novo.nums[1].v === '●●●●○' && de_novo.enviado === '2026-10-30T03:00:00.000Z' && j(de_novo.mao) === j({ desc: true }),
  'enviar de novo: os números e o saque se atualizam; a descrição que o mestre mudou, a legenda e o que o clã vê ficam');

// as anotações
const ns = N.normNotas({ notas: [{ id: 'n1', autor: 'u1', nome: 'Selene', texto: ' O fogo espantou dois deles. ', em: '2026-10-29T03:00:00.000Z' }, { id: 'n2', autor: 'u2', texto: '' }, { autor: 'u3', texto: 'sem id' }, null] });
ok(ns.length === 1 && ns[0].texto === 'O fogo espantou dois deles.' && ns[0].nome === 'Selene', 'as anotações: sem id, sem autor ou vazias não entram');
ok(N.letraDe('u1') === N.letraDe('u1') && N.LETRAS.includes(N.letraDe('qualquer')) && new Set(['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8'].map(N.letraDe)).size > 1, 'cada pessoa escreve sempre com a mesma letra (e não são todas iguais)');

// o índice e a busca
const pags = N.ordenar([{ nome: 'Lobo da Névoa' }, { nome: 'Aranha' }, { nome: 'Ácaro de Cinzas' }, { nome: 'Rato-rei' }]);
ok(j(pags.map(p => p.nome)) === j(['Ácaro de Cinzas', 'Aranha', 'Lobo da Névoa', 'Rato-rei']) && j(N.indice(pags)) === j([{ l: 'A', i: 0 }, { l: 'L', i: 2 }, { l: 'R', i: 3 }]),
  'as páginas em ordem de nome; o índice com a primeira página de cada letra (Á e A juntas)');
ok(N.passa(cheia, [], 'nevoa') && N.passa(cheia, [{ texto: 'medo real', nome: 'Selene' }], 'MEDO') && N.passa(cheia, [], 'fogo') && !N.passa(cheia, [], 'dragão') && N.passa(cheia, [], '  '),
  'a busca: pelo nome (sem acento), pelas anotações, pelas fraquezas; nada com o que não está');
ok(N.tituloPadrao('Garret') === 'Bestiário de Garret' && N.tituloPadrao('') === 'Bestiário do clã', 'o título de começo do livro');
end();
