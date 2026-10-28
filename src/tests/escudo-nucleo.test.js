// O Escudo do mestre, a conta pura (tc/escudo.js): o md5 (o mesmo do banco), as sessões e os passos, os relógios e o
// que a mesa vê deles, os handouts com trechos e áreas escondidas (o que vai aos jogadores não leva o escondido), os
// sete puzzles em três dificuldades — cada um com solução garantida (conferida aqui por força bruta) e a solução fora do
// que vai aos jogadores — e o resumo da sessão.
'use strict';
const E = require('../../tc/escudo.js');
let n = 0, ruins = 0;
const ok = (c, m) => { n++; if (!c) { ruins++; console.log('FALHOU: ' + m); } };
const j = JSON.stringify;

/* ---------------- md5 ---------------- */
ok(E.md5('') === 'd41d8cd98f00b204e9800998ecf8427e' && E.md5('abc') === '900150983cd24fb0d6963f7d28e17f72'
  && E.md5('The quick brown fox jumps over the lazy dog') === '9e107d9d372bb6826bd81d3542a419d6', 'o md5 dá os valores conhecidos');
ok(E.md5('a'.repeat(200)).length === 32 && E.md5('ação') !== E.md5('acao'), 'o md5 de textos longos e com acento (em UTF-8, como o do banco)');

/* ---------------- sessões ---------------- */
{
  const s = E.normSessao({ nome: '  Sessão   3 ', n: 3, estado: 'aberta', passos: [{ id: 'p1', txt: 'A emboscada', liga: { k: 'encontro', id: 'enc1' } }, { id: 'p1', txt: 'Dup' }, { txt: 'Sem liga', liga: { k: 'xx', id: 'a' } }, { txt: 'Lugar', liga: { k: 'lugar', mapa: 'mp1', obj: 'mc2' } }, { txt: 'Relógio', liga: { k: 'relogio', id: 'r1', n: 30 } }] });
  ok(s.nome === 'Sessão 3' && s.estado === 'aberta' && s.passos.length === 5 && s.passos[1].id !== 'p1', 'a sessão: o nome limpo, o estado, ids de passo sem repetir');
  ok(j(s.passos[0].liga) === j({ k: 'encontro', id: 'enc1' }) && s.passos[2].liga === null && j(s.passos[3].liga) === j({ k: 'lugar', mapa: 'mp1', obj: 'mc2' }) && s.passos[4].liga.n === 12, 'as ligações: encontro, lugar (mapa e marcador), relógio (gomos limitados); tipo desconhecido fica sem ligação');
  ok(E.normSessao({ estado: 'zz' }).estado === 'plano' && E.normSessao({}).passos.length === 0, 'sessão vazia: planejada, sem passos');
  const lista = [{ id: 'a', s: E.normSessao({ n: 1, estado: 'fechada' }) }, { id: 'b', s: E.normSessao({ n: 3, estado: 'plano' }) }, { id: 'c', s: E.normSessao({ n: 2, estado: 'plano' }) }, { id: 'd', s: E.normSessao({ n: 9, estado: 'plano', camp: 'cpX' }) }];
  ok(E.proximaPlanejada(lista, null).id === 'c' && E.proximaPlanejada(lista, null, 'c').id === 'b' && E.proximaPlanejada(lista, 'cpX').id === 'd', 'a próxima planejada: a de número mais baixo, da mesma campanha');
  ok(E.proximoNumero(lista, null) === 4 && E.proximoNumero(lista, 'cpX') === 10 && E.proximoNumero([], null) === 1, 'o número da sessão nova');
}

/* ---------------- relógios ---------------- */
{
  const r = E.normRelogio({ nome: 'O culto desperta', gomos: 6, cheio: 9, vista: true, porDia: 1, cor: 'roxo' });
  ok(r.cheio === 6 && r.gomos === 6 && r.cor === 'roxo' && r.tipo === 'ameaca' && r.porDia === 1, 'o relógio: cheio limitado aos gomos');
  const a = E.avancar(Object.assign({}, r, { cheio: 5 }), 1), b = E.avancar(r, 1), c = E.avancar(Object.assign({}, r, { cheio: 1 }), -3);
  ok(a.encheu && a.r.cheio === 6 && !b.encheu && b.r.cheio === 6 && c.r.cheio === 0 && !c.encheu, 'avançar: encheu só ao chegar ao fim; voltar para no zero');
  const rs = [{ id: 'r1', r: E.normRelogio({ nome: 'B', vista: true, ordem: 2, consequencia: 'segredo' }) }, { id: 'r2', r: E.normRelogio({ nome: 'A', vista: true, ordem: 1 }) }, { id: 'r3', r: E.normRelogio({ nome: 'C', vista: false }) }, { id: 'r4', r: E.normRelogio({ nome: 'D', vista: true, camp: 'cp1' }) }];
  const v = E.vistaDe(rs, null);
  ok(j(v.relogios.map(x => x.id)) === j(['r2', 'r1']) && !j(v).includes('segredo') && j(E.vistaDe(rs, 'cp1').relogios.map(x => x.id)) === j(['r4']), 'a vista: só os à vista, em ordem, da campanha certa, sem a consequência');
  ok(E.idVista(null) === 'escudo:vista' && E.idVista('cp1') === 'escudo:vista@cp1' && E.normVista({ relogios: [{ id: 'x', gomos: 4, cheio: 7 }, { id: '???' }] }).relogios.length === 1, 'o documento da vista');
}

/* ---------------- handouts ---------------- */
{
  const txt = 'Caro amigo, {{a chave está no poço}}. Venha {{à meia-noite}}. Assinado: {{  }}';
  const tr = E.trechos(txt);
  ok(tr.length === 2 && tr[0].txt === 'a chave está no poço' && /^t[0-9a-z]+$/.test(tr[0].k), 'os trechos escondidos do texto ({{…}}); o vazio não conta');
  const p0 = E.partesDoTexto(txt, []), p1 = E.partesDoTexto(txt, [tr[0].k]);
  ok(j(p0) === j(['Caro amigo, ', 20, '. Venha ', 12, '. Assinado:   ']) && j(p1) === j(['Caro amigo, a chave está no poço. Venha ', 12, '. Assinado:   ']), 'as partes: o escondido vira o tamanho; o revelado volta a ser texto');
  const h = E.normHandout({ nome: 'A carta', tipo: 'carta', texto: txt, revelados: [tr[1].k, 'lixo'], areas: [{ x: 0.9, y: 0.1, w: 0.5, h: 0.2 }, 'x'], img: 'javascript:alert(1)' });
  ok(h.revelados.length === 1 && h.areas.length === 1 && h.areas[0].w <= 0.1 + 1e-9 && h.img === null && h.puzzle === null, 'o handout: revelados válidos, a área dentro da imagem, imagem só https/data');
  const pj = E.projetarHandout('ho1', h, 'https://x.y/z.png', '2026-10-28T20:00:00.000Z');
  ok(!j(pj).includes('a chave está no poço') && j(pj).includes('meia-noite') && pj.img === 'https://x.y/z.png' && pj.hid === 'ho1', 'o que vai aos jogadores não leva o trecho escondido');
  ok(E.escondidos(h) === 2 && E.escondidos(E.normHandout(Object.assign({}, h, { revelados: tr.map(t => t.k), areas: [] }))) === 0, 'quantos ainda estão escondidos');
  ok(E.normPara('mesa') === 'mesa' && j(E.normPara(['AAAAAAAA-0000-0000-0000-000000000001', 'x'])) === j(['aaaaaaaa-0000-0000-0000-000000000001']) && E.normPara([]) === null, 'para quem: a mesa, ou ids de pessoas');
  ok(E.idPista('ho1', null) === 'pista:ho1' && E.idPista('ho1', 'cp') === 'pista:ho1@cp' && E.hidDaPista('pista:ho1@cp') === 'ho1' && E.hidDaPista('pista:jogo:ho1') === null && E.hidDoJogo('pista:jogo:ho1@cp') === 'ho1', 'os ids das pistas e dos jogos');
  const pz = E.normHandout({ tipo: 'puzzle', puzzle: { tipo: 'zz' }, liga: { acerto: [{ k: 'revelar', h: 'ho1', trechos: [tr[0].k, 'bad!'] }, { k: 'entregar', h: 'ho2' }, { k: 'x', h: 'ho3' }], erro: { relogio: 'r1', gomos: 9 } } });
  ok(pz.puzzle && pz.puzzle.tipo === 'charada' && pz.liga.acerto.length === 2 && j(pz.liga.acerto[0].trechos) === j([tr[0].k]) && pz.liga.erro.gomos === 6, 'o puzzle: tipo desconhecido vira charada; o que acontece ao acertar e ao errar');
}

/* ---------------- puzzles ---------------- */
// resolver as luzes (álgebra no corpo de dois elementos): os toques que acendem tudo, ou null
function resolverLuzes(l, n) {
  const N = n * n, M = [];
  for (let i = 0; i < N; i++) {
    const row = Array(N + 1).fill(0);
    for (let k = 0; k < N; k++) { const x = k % n, y = Math.floor(k / n), xi = i % n, yi = Math.floor(i / n); if (Math.abs(x - xi) + Math.abs(y - yi) <= 1) row[k] = 1; }
    row[N] = l[i] === '1' ? 0 : 1;
    M.push(row);
  }
  let r = 0; const piv = [];
  for (let c = 0; c < N && r < N; c++) {
    let p = r; while (p < N && !M[p][c]) p++;
    if (p === N) continue;
    [M[r], M[p]] = [M[p], M[r]];
    for (let i = 0; i < N; i++) if (i !== r && M[i][c]) for (let k = c; k <= N; k++) M[i][k] ^= M[r][k];
    piv.push(c); r++;
  }
  for (let i = r; i < N; i++) if (M[i][N]) return null;
  const x = Array(N).fill(0); piv.forEach((c, i) => { x[c] = M[i][N]; });
  return x;
}
const DIFS = ['facil', 'medio', 'dificil'];
let tudoCerto = true;
for (const dif of DIFS) {
  for (let s = 1; s <= 8; s++) {
    const seed = s * 7777 + 3;
    // cifra (os três métodos)
    for (const metodo of ['cesar', 'troca', 'runas']) {
      const m = E.montarPuzzle({ tipo: 'cifra', dif, seed, msg: 'O espião usa um anel de prata!', metodo });
      const jogo = { tipo: 'cifra', pub: m.pub, estado: {}, sal: m.sal, chk: m.chk };
      // a resposta certa: o mapa de volta de cada símbolo (aqui, sabendo a mensagem)
      const msg = E.normMensagem('O espião usa um anel de prata!').replace(/ /g, '');
      let k = 0; const est = {};
      for (const x of m.pub.cod) if (typeof x === 'number') { const L = msg[k++]; if (!(('c' + x) in est)) est['c' + x] = L; }
      const certo = E.confere(jogo, E.provaDoEstado(Object.assign({}, jogo, { estado: est })));
      const livre = m.pub.simbolos.findIndex((x, i) => !(i in m.pub.dadas));            // (um símbolo sem letra dada)
      const errado = E.confere(jogo, E.provaDoEstado(Object.assign({}, jogo, { estado: Object.assign({}, est, { ['c' + livre]: est['c' + livre] === 'Z' ? 'Y' : 'Z' }) })));
      const dada = E.confere(jogo, E.provaDoEstado(Object.assign({}, jogo, { estado: Object.assign({}, est, { ['c' + livre]: 'Q', ['d' + livre]: est['c' + livre] }) })));
      if (!dada || j(m.letras) === 'null' || m.letras[livre] !== est['c' + livre]) { tudoCerto = false; console.log('cifra: a letra revelada pelo mestre (d) vale mais que o palpite', dif, metodo); }
      const vazia = E.provaDoEstado(jogo) === null || Object.keys(m.pub.dadas).length === m.pub.simbolos.length;
      if (!certo || errado || !vazia || j(m.pub).includes('ESPIAO') || (metodo === 'runas' && !m.pub.simbolos.every(c => E.RUNAS.includes(c)))) { tudoCerto = false; console.log('cifra', dif, metodo, seed, certo, errado, vazia); }
      if (dif === 'facil' && metodo !== 'cesar' && !Object.keys(m.pub.dadas).length) { tudoCerto = false; console.log('cifra fácil sem letras dadas'); }
      if (dif === 'dificil' && Object.keys(m.pub.dadas).length) { tudoCerto = false; console.log('cifra difícil com letras dadas'); }
    }
    // charada
    {
      const idx = E.sortearCharada(dif, E.mulberry(seed));
      const m = E.montarPuzzle({ tipo: 'charada', dif, seed, idx });
      const c = E.CHARADAS[idx], jogo = { tipo: 'charada', pub: m.pub, sal: m.sal, chk: m.chk, estado: {} };
      const certas = c.r.every(r => E.confere(jogo, E.provaDoEstado(jogo, '  O ' + r.toUpperCase() + '! ')));
      if (c.dif !== dif || !certas || E.confere(jogo, E.provaDoEstado(jogo, 'batata frita')) || (c.r[0].length > 2 && j(m.pub).includes(c.r[0]))) { tudoCerto = false; console.log('charada', dif, idx); }
    }
    // luzes
    {
      const m = E.montarPuzzle({ tipo: 'luzes', dif, seed }), nn = m.pub.n;
      const x = resolverLuzes(m.estado.l, nn);
      let l = m.estado.l; if (x) x.forEach((v, i) => { if (v) l = E.tocarLuz(l, nn, i); });
      const jogo = { tipo: 'luzes', pub: m.pub, sal: m.sal, chk: m.chk, estado: { l } };
      if (!x || nn !== { facil: 3, medio: 4, dificil: 5 }[dif] || m.estado.l === '1'.repeat(nn * nn) || !E.confere(jogo, E.provaDoEstado(jogo)) || E.confere(Object.assign({}, jogo, { estado: m.estado }), E.provaDoEstado(Object.assign({}, jogo, { estado: m.estado })))) { tudoCerto = false; console.log('luzes', dif, seed); }
    }
    // alavancas
    {
      const m = E.montarPuzzle({ tipo: 'alavancas', dif, seed }), na = m.pub.n;
      let achou = 0;
      for (let b = 0; b < (1 << na); b++) { const est = {}; for (let i = 0; i < na; i++) est['a' + i] = (b >> i) & 1 ? '1' : '0'; if (E.gradesDe(m.pub, est) === '1'.repeat(m.pub.m)) achou++; }
      const jogo = { tipo: 'alavancas', pub: m.pub, sal: m.sal, chk: m.chk, estado: {} };
      if (!achou || E.gradesDe(m.pub, {}) === '1'.repeat(m.pub.m) || E.confere(jogo, E.provaDoEstado(jogo))) { tudoCerto = false; console.log('alavancas', dif, seed, achou); }
    }
    // cadeado: só uma combinação bate com todas as pistas, e é a certa
    {
      const m = E.montarPuzzle({ tipo: 'cadeado', dif, seed }), nd = m.pub.n, k = m.pub.simbolos.length;
      const cands = [];
      const c = Array(nd).fill(0);
      for (;;) {
        if (m.pub.pistas.every(p => { const x = E.nota(p.c, c); return x[0] === p.l && x[1] === p.f; })) cands.push(c.slice());
        let i = nd - 1; while (i >= 0 && ++c[i] === k) { c[i] = 0; i--; } if (i < 0) break;
      }
      const jogo = { tipo: 'cadeado', pub: m.pub, sal: m.sal, chk: m.chk, estado: {} };
      if (cands.length !== 1 || !E.confere(jogo, E.provaDoEstado(jogo, cands[0])) || m.pub.pistas.some(p => p.l === nd) || j(m.pub).includes(m.resposta)) { tudoCerto = false; console.log('cadeado', dif, seed, cands.length); }
    }
    // placas: só uma ordem bate com as inscrições, e é a certa
    {
      const m = E.montarPuzzle({ tipo: 'placas', dif, seed }), np = m.pub.n;
      const perms = []; const rec = (a, r) => { if (!r.length) { perms.push(a); return; } r.forEach((x, i) => rec(a.concat(x), r.slice(0, i).concat(r.slice(i + 1)))); };
      rec([], [...Array(np).keys()]);
      const boas = perms.filter(o => { const p = E.posDe(o); return m.pub.pistas.every(c => E.REGRAS[c.k](p, c.a, c.b, np)); });
      const jogo = { tipo: 'placas', pub: m.pub, sal: m.sal, chk: m.chk, estado: {} };
      const frases = m.pub.pistas.map(c => E.textoPistaPlacas(c, m.pub.simbolos));
      if (boas.length !== 1 || !E.confere(jogo, E.provaDoEstado(jogo, boas[0])) || frases.some(f => !/^A placa d[oa] [A-Z].*\.$/.test(f) || / d placa/.test(f))) { tudoCerto = false; console.log('placas', dif, seed, boas.length, frases); }
    }
    // imagem
    {
      const m = E.montarPuzzle({ tipo: 'imagem', dif, seed }, 'https://x.y/img.png'), nn = m.pub.n;
      const jogo = { tipo: 'imagem', pub: m.pub, sal: m.sal, chk: m.chk, estado: { p: [...Array(nn * nn).keys()] } };
      if (!E.confere(jogo, E.provaDoEstado(jogo)) || E.confere(Object.assign({}, jogo, { estado: m.estado }), E.provaDoEstado(Object.assign({}, jogo, { estado: m.estado }))) || m.pub.img !== 'https://x.y/img.png') { tudoCerto = false; console.log('imagem', dif, seed); }
    }
  }
}
ok(tudoCerto, 'os sete puzzles, nas três dificuldades, em 8 sementes: a solução existe (e, no cadeado e nas placas, é uma só), confere, e não vai no que os jogadores recebem');
ok(j(E.montarPuzzle({ tipo: 'placas', dif: 'medio', seed: 42 })) === j(E.montarPuzzle({ tipo: 'placas', dif: 'medio', seed: 42 })) && j(E.montarPuzzle({ tipo: 'placas', dif: 'medio', seed: 42 }).pub) !== j(E.montarPuzzle({ tipo: 'placas', dif: 'medio', seed: 43 }).pub), 'a mesma semente dá o mesmo puzzle; outra dá outro');
ok(E.CHARADAS.length >= 45 && E.CHARADAS.every(c => c.p && c.r.length && c.d.length === 2 && E.DIF[c.dif]) && ['facil', 'medio', 'dificil'].every(d => E.CHARADAS.filter(c => c.dif === d).length >= 14), 'o banco de charadas: 45 ou mais, cada uma com respostas e duas dicas, nas três dificuldades');
{
  const r = new Set(); for (const c of E.CHARADAS) for (const x of c.r) r.add(E.normResposta(x));
  ok(r.size > 60 && E.normResposta('  A   Arco-Íris!') === 'arco iris' && E.normResposta('O Silêncio') === 'silencio', 'as respostas: sem artigo, sem acento, sem pontuação');
}
{
  const h = { nome: 'O cofre', tipo: 'puzzle', puzzle: { tipo: 'cadeado', dif: 'facil', seed: 9 } };
  const jg = E.jogoNovo('ho9', h);
  const nj = E.normJogo(JSON.parse(j(jg)));
  ok(nj && nj.tipo === 'cadeado' && nj.chk.length === 1 && nj.erros === 0 && nj.resolvido === null && !('resposta' in jg) && E.normJogo({ tipo: 'zz' }) === null, 'o jogo novo (sem a resposta) e o jogo como chega');
}

/* ---------------- o resumo ---------------- */
{
  const s = E.normSessao({ nome: 'Sessão 4', quando: '02/11', passos: [{ txt: 'A emboscada', feito: true }, { txt: 'O conselho', feito: false }],
    inicio: { em: '2026-10-28T20:00:00.000Z', relogios: { r1: 2, r2: 3 } }, log: [{ em: '2026-10-28T21:00:00.000Z', t: 'entregou', txt: 'A carta do barão (à mesa)' }, { em: '2026-10-28T21:30:00.000Z', t: 'puzzle', txt: 'O cofre: resolvido por Dalmo' }] });
  const t = E.resumoDaSessao(s, [{ id: 'r1', r: E.normRelogio({ nome: 'O culto', gomos: 6, cheio: 4 }) }, { id: 'r2', r: E.normRelogio({ nome: 'A guerra', gomos: 8, cheio: 3 }) }]);
  ok(t.includes('**Sessão 4** (02/11)') && t.includes('- A emboscada') && t.includes('Ficou para depois:\n- O conselho') && t.includes('- A carta do barão (à mesa)') && t.includes('O cofre: resolvido por Dalmo') && t.includes('- O culto: 2 → 4 de 6') && !t.includes('A guerra'), 'o resumo: o que aconteceu, as pistas, os puzzles, os relógios que andaram e o que ficou');
}

console.log(ruins ? n - ruins + ' verificações passaram, ' + ruins + ' falharam' : n + ' verificações passaram');
process.exit(ruins ? 1 : 0);
