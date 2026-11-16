// Lote 167: os Jogos de Tabuleiro, as regras (sem navegador).
//   · Xadrez: as contagens de lances (perft) de posições conhecidas — roque, en passant, promoção, xeque —, o mate, o
//     afogamento e a falta de material;
//   · Damas brasileiras: a contagem do começo, a lei da maioria, a dama voadora, a pedra que passa pela última fileira
//     no meio da captura (segue pedra);
//   · Tablut: o começo, a captura entre duas, o trono vazio, o rei no trono (4 lados), ao lado (3) e longe (2), a fuga;
//   · o computador acha o mate em 1 e vence o nível fácil;
//   · as partidas online: juntar os dois documentos, lance fora da vez, desistência, empate combinado, a aposta.
global.self = global;
const X = require('../../tc/jogos-xadrez.js'), Dm = require('../../tc/jogos-damas.js'), T = require('../../tc/jogos-tablut.js');
const H = require('../../tc/jogos-hemvria.js');
const IA = require('../../tc/jogos-ia.js'), O = require('../../tc/jogos.js');
const { checker } = require('./lib');
const { ok, end } = checker();
const perft = (G, e, d) => { if (!d) return 1; let n = 0; for (const m of G.lances(e)) n += perft(G, G.jogar(e, m), d - 1); return n; };
const MAP = { p: 'p', n: 'c', b: 'b', r: 't', q: 'd', k: 'r' };
function fen(s) {
  const [pos, v, ro, ep] = s.split(' '); const b = Array(64).fill('');
  pos.split('/').forEach((l, i) => { let f = 0; for (const ch of l) { if (/\d/.test(ch)) f += +ch; else { const m = MAP[ch.toLowerCase()]; b[(7 - i) * 8 + f] = ch === ch.toUpperCase() ? m.toUpperCase() : m; f++; } } });
  return { b, vez: v === 'w' ? 0 : 1, roque: { K: ro.includes('K'), Q: ro.includes('Q'), k: ro.includes('k'), q: ro.includes('q') }, ep: ep === '-' ? -1 : X.casaDe(ep), meio: 0, n: 1, rep: {} };
}
const jogarIds = (G, ids, e) => { e = e || G.inicial(); for (const id of ids) { const m = G.lancePorId(e, id); if (!m) throw new Error('lance inválido ' + id); e = G.jogar(e, m); } return e; };

// Xadrez
ok([1, 2, 3].map(d => perft(X, X.inicial(), d)).join() === '20,400,8902', 'xadrez: o começo (20, 400, 8902)');
ok([1, 2].map(d => perft(X, fen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -'), d)).join() === '48,2039', 'xadrez: "kiwipete" (roque, en passant)');
ok([1, 2, 3].map(d => perft(X, fen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -'), d)).join() === '14,191,2812', 'xadrez: a posição 3 (en passant com cravada)');
ok([1, 2].map(d => perft(X, fen('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -'), d)).join() === '6,264', 'xadrez: a posição 4 (promoção)');
{
  const e = jogarIds(X, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
  const f = X.fim(e); ok(f && f.vencedor === 1 && f.motivo === 'xeque-mate', 'xadrez: o mate do tolo');
  const af = fen('7k/5Q2/6K1/8/8/8/8/8 b - -'); ok(X.fim(af).vencedor === null && X.fim(af).motivo === 'afogamento', 'xadrez: afogamento');
  ok(X.fim(fen('7k/8/6K1/8/8/8/8/2B5 b - -')).motivo === 'falta de material', 'xadrez: rei e bispo contra rei');
  const pr = X.lances(fen('8/P6k/8/8/8/8/8/K7 w - -')).filter(m => m.de === X.casaDe('a7')).map(m => m.id).sort().join();
  ok(pr === 'a7a8B,a7a8C,a7a8D,a7a8T', 'xadrez: a promoção a qualquer peça: ' + pr);
  let r = jogarIds(X, ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']);
  ok(X.fim(r) && X.fim(r).motivo === 'repetição', 'xadrez: a mesma posição 3 vezes');
}
// Damas
ok([1, 2, 3, 4].map(d => perft(Dm, Dm.inicial(), d)).join() === '7,49,302,1469', 'damas: o começo (7, 49, 302, 1469)');
{
  const s = Dm.casaDe, vazio = () => Array(64).fill('');
  let b = vazio(); b[s('c3')] = 'b'; b[s('d4')] = 'p'; b[s('f6')] = 'p'; b[s('b4')] = 'p'; b[s('h8')] = 'P';
  ok(Dm.lances({ b, vez: 0, soDamas: 0, rep: {} }).map(m => m.id).join() === 'c3xe5xg7', 'damas: a lei da maioria (a captura de 2, não a de 1)');
  b = vazio(); b[s('a1')] = 'B'; b[s('c3')] = 'p'; b[s('e5')] = 'p'; b[s('f2')] = 'p'; b[s('h8')] = 'P';
  ok(Dm.lances({ b, vez: 0, soDamas: 0, rep: {} }).map(m => m.id).sort().join() === 'a1xd4xf6,a1xd4xg1,a1xd4xg7', 'damas: a dama voadora para em qualquer casa depois da peça');
  b = vazio(); b[s('b6')] = 'b'; b[s('c7')] = 'p'; b[s('e7')] = 'p'; b[s('a1')] = 'P';
  const ms = Dm.lances({ b, vez: 0, soDamas: 0, rep: {} });
  ok(ms.length === 1 && ms[0].id === 'b6xd8xf6', 'damas: a pedra passa pela última fileira capturando: ' + ms.map(m => m.id));
  const depois = Dm.jogar({ b, vez: 0, soDamas: 0, rep: {} }, ms[0]);
  ok(depois.b[s('f6')] === 'b', 'damas: …e segue pedra');
  b = vazio(); b[s('c7')] = 'b'; b[s('a1')] = 'P';
  ok(Dm.jogar({ b, vez: 0, soDamas: 0, rep: {} }, Dm.lancePorId({ b, vez: 0, soDamas: 0, rep: {} }, 'c7-d8')).b[s('d8')] === 'B', 'damas: a pedra que para na última fileira vira dama');
  b = vazio(); b[s('a1')] = 'b'; b[s('b2')] = 'p'; b[s('c3')] = 'p';
  ok(Dm.fim({ b, vez: 0, soDamas: 0, rep: {} }).vencedor === 1, 'damas: quem não tem lance perde');
}
// Tablut
{
  const e0 = T.inicial(), s = T.casaDe;
  ok(e0.b.filter(x => x === 'a').length === 16 && e0.b.filter(x => x === 'd').length === 8 && e0.b[40] === 'K' && T.vez(e0) === 0, 'tablut: 16 atacantes, 8 defensores, o rei no trono; os atacantes começam');
  ok(!T.lances(e0).some(m => m.para === T.TRONO), 'tablut: só o rei pisa no trono');
  const vazio = () => Array(81).fill('');
  let b, e;
  b = vazio(); b[s('c3')] = 'a'; b[s('d3')] = 'd'; b[s('e1')] = 'a'; b[s('a9')] = 'K';
  e = T.jogar({ b, vez: 0, n: 0, rep: {}, fimJa: null }, T.lancePorId({ b, vez: 0, n: 0, rep: {}, fimJa: null }, 'e1-e3'));
  ok(e.b[s('d3')] === '', 'tablut: a captura entre duas');
  b = vazio(); b[s('d5')] = 'a'; b[s('b5')] = 'd'; b[s('a1')] = 'K';
  e = T.jogar({ b, vez: 1, n: 0, rep: {}, fimJa: null }, T.lancePorId({ b, vez: 1, n: 0, rep: {}, fimJa: null }, 'b5-c5'));
  ok(e.b[s('d5')] === '', 'tablut: o trono vazio ajuda a capturar');
  b = vazio(); b[s('e5')] = 'K'; b[s('d5')] = 'a'; b[s('f5')] = 'a'; b[s('e4')] = 'a'; b[s('a6')] = 'a';
  let k = { b, vez: 0, n: 0, rep: {}, fimJa: null };
  k = T.jogar(k, T.lancePorId(k, 'a6-e6'));
  ok(T.fim(k) && T.fim(k).vencedor === 0, 'tablut: o rei no trono, cercado pelos 4 lados');
  b = vazio(); b[s('e5')] = 'K'; b[s('d5')] = 'a'; b[s('a6')] = 'a';
  k = { b, vez: 0, n: 0, rep: {}, fimJa: null }; k = T.jogar(k, T.lancePorId(k, 'a6-e6'));
  ok(!T.fim(k) && k.b[s('e5')] === 'K', 'tablut: no trono, 2 não bastam');
  b = vazio(); b[s('e4')] = 'K'; b[s('d4')] = 'a'; b[s('f4')] = 'a'; b[s('a3')] = 'a';
  k = { b, vez: 0, n: 0, rep: {}, fimJa: null }; k = T.jogar(k, T.lancePorId(k, 'a3-e3'));
  ok(T.fim(k) && T.fim(k).vencedor === 0, 'tablut: ao lado do trono, os 3 lados que sobram');
  b = vazio(); b[s('c3')] = 'K'; b[s('b3')] = 'a'; b[s('h3')] = 'a'; b[s('i9')] = 'd';
  k = { b, vez: 0, n: 0, rep: {}, fimJa: null }; k = T.jogar(k, T.lancePorId(k, 'h3-d3'));
  ok(T.fim(k) && T.fim(k).motivo === 'o rei foi capturado', 'tablut: longe do trono, 2 bastam');
  b = vazio(); b[s('c3')] = 'K'; b[s('h8')] = 'a';
  k = { b, vez: 1, n: 0, rep: {}, fimJa: null }; k = T.jogar(k, T.lancePorId(k, 'c3-a3'));
  ok(T.fim(k) && T.fim(k).vencedor === 1, 'tablut: o rei chega à borda');
}

// Destino de Hemvria (lote 169)
{
  ok(H.TODAS.length === 78 && H.TODAS.filter(id => H.CARTAS[id].maior).length === 22, 'hemvria: 78 cartas, 22 arcanos maiores');
  ok(Object.values(H.PRONTOS).every(p => H.baralhoInvalido(p.cartas) === null), 'hemvria: os 4 baralhos prontos valem');
  ok(H.baralhoInvalido(H.PRONTOS.P.cartas.slice(0, 14)) && H.baralhoInvalido(['M0', 'M1', 'M2', 'M3'].concat(H.PRONTOS.P.cartas.slice(0, 11))), 'hemvria: 14 cartas não vale; 4 arcanos maiores não vale');
  const cfg = { baralhos: [H.PRONTOS.P.cartas, H.PRONTOS.E.cartas], semente: 'teste' };
  const e0 = H.inicial(cfg), e1 = H.inicial(cfg);
  ok(JSON.stringify(e0) === JSON.stringify(e1) && e0.maos[0].length === 5 && e0.pilhas[0].length === 10, 'hemvria: o mesmo começo para a mesma semente; mão de 5');
  ok(e0.tab[0].d === 0 && e0.tab[0].p === 2 && e0.tab[4].d === 1 && e0.tab[2].d === -1, 'hemvria: 2 peões em cada casa da ponta de cada lado');
  // um tabuleiro feito à mão
  const vazio = () => { const e = H.inicial(cfg); e.tab.forEach(t => { t.d = -1; t.p = 0; t.c = null; }); return e; };
  let e = vazio(); e.tab[5].d = 0; e.tab[5].p = 1; e.maos[0] = ['P1']; e.tab[7].d = 1; e.tab[7].p = 2;
  e = H.jogar(e, H.lancePorId(e, 'P1@5'));
  ok(e.tab[6].d === 0 && e.tab[6].p === 1 && e.tab[7].d === 0 && e.tab[7].p === 2, 'hemvria: o Ás de Paus põe peão à frente e toma a casa do outro: ' + JSON.stringify(e.tab.slice(5, 8)));
  e = vazio(); e.tab[9].d = 1; e.tab[9].p = 1; e.vez = 1; e.maos[1] = ['P1'];
  e = H.jogar(e, H.lancePorId(e, 'P1@9'));
  ok(e.tab[8].d === 1 && e.tab[7].d === 1, 'hemvria: o desenho da Lua é o espelho (a frente é para a esquerda)');
  e = vazio(); e.tab[6].c = { id: 'P5', d: 0, m: 0 }; e.tab[6].d = 0; e.tab[7].d = 0; e.tab[7].p = 1; e.maos[0] = ['C1'];
  e = H.jogar(e, H.lancePorId(e, 'C1@7'));
  ok(H.poderEm(e, 6) === 4, 'hemvria: o Ás de Copas fortalece a carta vizinha (+1)');
  e = vazio(); e.tab[8].c = { id: 'P1', d: 1, m: 0 }; e.tab[8].d = 1; e.tab[7].d = 0; e.tab[7].p = 1; e.maos[0] = ['E1'];
  e = H.jogar(e, H.lancePorId(e, 'E1@7'));
  ok(!e.tab[8].c && e.tab[8].d === 1 && e.tab[8].p === 1, 'hemvria: o Ás de Espadas enfraquece a carta da frente até destruí-la');
  e = vazio(); e.tab[8].c = { id: 'P14', d: 1, m: 0 }; e.tab[8].d = 1; e.tab[2].c = { id: 'P2', d: 1, m: 0 }; e.tab[7].d = 0; e.tab[7].p = 3; e.maos[0] = ['M16'];
  e = H.jogar(e, H.lancePorId(e, 'M16@7'));
  ok(!e.tab[8].c && !!e.tab[2].c, 'hemvria: A Torre destrói a mais forte em volta');
  e = vazio(); e.tab[8].c = { id: 'P2', d: 1, m: 0 }; e.tab[8].d = 1; e.tab[7].d = 0; e.tab[7].p = 3; e.maos[0] = ['M13'];
  e = H.jogar(e, H.lancePorId(e, 'M13@7'));
  ok(e.tab[8].c.d === 0, 'hemvria: A Morte toma a carta do outro');
  e = vazio(); e.tab[7].d = 0; e.tab[7].p = 3; e.maos[0] = ['M8']; e = H.jogar(e, H.lancePorId(e, 'M8@7'));
  e.vez = 0; e.tab[6].d = 1; e.tab[6].p = 1; e.vez = 1; e.maos[1] = ['E4']; e = H.jogar(e, H.lancePorId(e, 'E4@6'));
  ok(H.poderEm(e, 7) === 9, 'hemvria: A Força não enfraquece');
  e = vazio(); e.tab[0].c = { id: 'P9', d: 0, m: 0 }; e.tab[4].c = { id: 'P3', d: 1, m: 0 }; e.tab[10].c = { id: 'M21', d: 1, m: 0 };
  const pt = H.pontos(e);
  ok(pt.total[0] === 5 && pt.total[1] === 11 && pt.fileiras[0].join() === '5,2', 'hemvria: os pontos por fileira (o Mundo dá +5 a quem vence a fileira dele): ' + JSON.stringify(pt));
  e = H.inicial(cfg); e = H.jogar(e, H.lancePorId(e, 'passar')); e = H.jogar(e, H.lancePorId(e, 'passar'));
  ok(H.fim(e) && H.fim(e).vencedor === null, 'hemvria: dois passes seguidos terminam a partida');
  ok(e.maos[1].length === 6 && e.maos[0].length === 5, 'hemvria: quem joga depois compra no começo da vez');
  let g = H.inicial(cfg), k = 0;
  while (!H.fim(g) && k < 80) { g = H.jogar(g, IA.escolher(H, g, H.vez(g) === 0 ? 'medio' : 'facil', { tempo: 150 }).lance); k++; }
  ok(!!H.fim(g), 'hemvria: o computador joga uma partida inteira: ' + H.fim(g).motivo);
  // online: os dois baralhos
  const A = 'aaaaaaaa-0000-0000-0000-000000000001', B = 'bbbbbbbb-0000-0000-0000-000000000002', pid = 'hem1234567';
  const da = d => ({ id: O.docId(pid, A), dono_id: A, dados: Object.assign({ papel: 'criador', jogo: 'hemvria', pc: null, pcNome: 'Ana', contra: B, contraNome: 'Beto', aposta: 0, lado: 0, t: 1, lances: [], baralho: H.PRONTOS.P.cartas }, d) });
  const db = d => ({ id: O.docId(pid, B), dono_id: B, dados: Object.assign({ papel: 'convidado', resp: 'aceito', pcNome: 'Bia', lances: [], baralho: H.PRONTOS.O.cartas }, d) });
  let p = O.juntar([da(), db()]);
  ok(p.status === 'jogando' && p.cfg && p.cfg.semente === pid && p.estado.maos[1].length === 5, 'online: o Destino de Hemvria começa com os dois baralhos');
  const primeira = p.estado.maos[0].find(id => H.CARTAS[id].custo <= 2);
  p = O.juntar([da({ lances: [{ n: 0, id: primeira + '@0' }] }), db()]);
  ok(p.lances.length === 1 && p.vez === B && p.estado.tab[0].c.id === primeira, 'online: a carta jogada entra');
  ok(O.juntar([da(), db({ baralho: ['P1'] })]).status === 'convite', 'online: sem baralho válido a partida não começa');
}
// o computador
{
  const e = jogarIds(X, ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6']);
  ok(IA.escolher(X, e, 'medio').lance.id === 'h5f7', 'o computador acha o mate em 1');
  let g = Dm.inicial(), n = 0;
  while (!Dm.fim(g) && n < 200) { g = Dm.jogar(g, IA.escolher(Dm, g, Dm.vez(g) === 0 ? 'medio' : 'facil', { tempo: 200 }).lance); n++; }
  ok(Dm.fim(g) && Dm.fim(g).vencedor === 0, 'damas: o médio vence o fácil');
}
// as partidas online
{
  const A = 'aaaaaaaa-0000-0000-0000-000000000001', B = 'bbbbbbbb-0000-0000-0000-000000000002', pid = 'abc123xyz9';
  const da = (dados) => ({ id: O.docId(pid, A), dono_id: A, dados: Object.assign({ papel: 'criador', jogo: 'xadrez', pc: 'pa', pcNome: 'Ana', contra: B, contraNome: 'Beto', aposta: 10, lado: 0, t: 1, lances: [], pagou: true }, dados) });
  const db = (dados) => ({ id: O.docId(pid, B), dono_id: B, dados: Object.assign({ papel: 'convidado', resp: 'aceito', pc: 'pb', pcNome: 'Bia', lances: [], pagou: true }, dados) });
  let p = O.juntar([da()]); ok(p.status === 'convite' && p.aposta === 10, 'online: o convite');
  ok(O.aReceber(O.juntar([da({ cancela: true })]), A).lapros === 10, 'online: cancelou, recebe de volta');
  ok(O.juntar([da(), db({ resp: 'recusado' })]).status === 'recusado' && O.aReceber(O.juntar([da(), db({ resp: 'recusado' })]), A).lapros === 10, 'online: recusado, quem convidou recebe de volta');
  p = O.juntar([da({ lances: [{ n: 0, id: 'f2f3' }, { n: 2, id: 'g2g4' }] }), db({ lances: [{ n: 1, id: 'e7e5' }] })]);
  ok(p.status === 'jogando' && p.vez === B && p.lances.length === 3, 'online: os lances dos dois documentos, na ordem');
  p = O.juntar([da({ lances: [{ n: 0, id: 'f2f3' }] }), db({ lances: [{ n: 0, id: 'e7e5' }] })]);
  ok(p.lances.length === 1 && p.vez === B, 'online: o lance fora da vez não entra');
  p = O.juntar([da({ lances: [{ n: 0, id: 'f2f3' }, { n: 2, id: 'g2g4' }] }), db({ lances: [{ n: 1, id: 'e7e5' }, { n: 3, id: 'd8h4' }] })]);
  ok(p.status === 'fim' && p.fim.vencedor === B && O.aReceber(p, B).lapros === 20 && O.aReceber(p, A).lapros === 0, 'online: o mate, e quem vence recebe as duas partes');
  ok(/Bia \(Pretas\) venceu Ana \(Brancas\) no Xadrez \(xeque-mate, em 4 lances\)\. Levou 20 lapros\./.test(O.textoDoFim(p)), 'online: o texto do fim: ' + O.textoDoFim(p));
  p = O.juntar([da({ desiste: true }), db()]); ok(p.fim.vencedor === B && p.fim.motivo === 'desistência', 'online: quem desiste perde');
  p = O.juntar([da({ empate: 0 }), db()]); ok(p.status === 'jogando' && p.empateOferecido === A, 'online: o empate oferecido');
  p = O.juntar([da({ empate: 0 }), db({ empate: 0 })]); ok(p.status === 'fim' && p.fim.vencedor === null && O.aReceber(p, B).lapros === 10, 'online: o empate combinado devolve a aposta');
  p = O.juntar([da({ empate: 0, lances: [{ n: 0, id: 'e2e4' }] }), db()]); ok(p.status === 'jogando' && !p.empateOferecido, 'online: o empate oferecido caduca com um lance');
  p = O.juntar([da({ desiste: true, recebeu: true }), db({ recebeu: true })]); ok(O.aReceber(p, B) === null, 'online: não recebe duas vezes');
  ok(O.juntar([Object.assign(da(), { dono_id: B })]) === null, 'online: o documento de quem convida tem de ser dele');
}
end();
