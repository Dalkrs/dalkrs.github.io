/* Tiny Cats · Jogos de Tabuleiro (lote 167): o Tablut, a regra clássica.
   9×9. No centro, o trono (e5) com o rei; em volta dele, 8 defensores. Nas quatro bordas, 16 atacantes, que jogam
   primeiro. Toda peça anda como a torre do xadrez (em linha reta, quantas casas quiser), sem pular ninguém. Só o rei
   pisa no trono ou passa por ele.
   Captura: a peça que fica entre duas inimigas, na mesma linha, por um lance de quem cerca (andar para o meio de duas
   não é ser capturado). O trono vazio conta como inimigo de todos, e o rei ajuda a capturar.
   O rei: no trono, é capturado cercado pelos 4 lados; ao lado do trono, pelos 3 lados que sobram; longe dele, por 2,
   como as outras peças. O rei ganha chegando a qualquer casa da borda. Perde quem não tem lance.
   Empate: a mesma posição 3 vezes, ou 150 lances sem fim.
   As peças: a (atacante), d (defensor), K (rei). O lado 0 são os atacantes. O id do lance: "e1-e3". */
(function (root) {
  'use strict';
  const N = 9, TRONO = 40;
  const COLS = 'abcdefghi';
  const nomeCasa = c => COLS[c % N] + (Math.floor(c / N) + 1);
  const casaDe = s => { const f = COLS.indexOf(s[0]), r = +s.slice(1) - 1; return f < 0 || !(r >= 0 && r < N) ? -1 : r * N + f; };
  const ladoDe = p => (!p ? -1 : p === 'a' ? 0 : 1);
  const em = (f, r) => f >= 0 && f < N && r >= 0 && r < N;
  const borda = c => { const f = c % N, r = Math.floor(c / N); return f === 0 || r === 0 || f === N - 1 || r === N - 1; };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const vizinho = (c, df, dr) => { const f = c % N + df, r = Math.floor(c / N) + dr; return em(f, r) ? r * N + f : -1; };

  function inicial() {
    const b = Array(N * N).fill('');
    for (const s of ['d1', 'e1', 'f1', 'e2', 'd9', 'e9', 'f9', 'e8', 'a4', 'a5', 'a6', 'b5', 'i4', 'i5', 'i6', 'h5']) b[casaDe(s)] = 'a';
    for (const s of ['e3', 'e4', 'e6', 'e7', 'c5', 'd5', 'f5', 'g5']) b[casaDe(s)] = 'd';
    b[TRONO] = 'K';
    const e = { b, vez: 0, n: 0, rep: {}, fimJa: null };
    e.rep[chave(e)] = 1;
    return e;
  }
  const chave = e => e.b.map(x => x || '.').join('') + e.vez;

  function lances(e) {
    if (e.fimJa) return [];
    const b = e.b, out = [];
    for (let c = 0; c < N * N; c++) {
      const p = b[c]; if (!p || ladoDe(p) !== e.vez) continue;
      for (const [df, dr] of DIRS) {
        let a = vizinho(c, df, dr);
        while (a >= 0 && !b[a]) {
          if (a === TRONO && p !== 'K') break;                 // ninguém além do rei passa pelo trono
          out.push({ de: c, para: a, id: nomeCasa(c) + '-' + nomeCasa(a) });
          a = vizinho(a, df, dr);
        }
      }
    }
    return out;
  }

  // a casa o "segura" a peça da vítima (do lado `lv`)? Uma peça do outro lado, ou o trono vazio.
  const hostil = (b, o, lv) => o >= 0 && ((b[o] && ladoDe(b[o]) !== lv) || (o === TRONO && !b[o]));
  const juntoAoTrono = c => c === TRONO - 1 || c === TRONO + 1 || c === TRONO - N || c === TRONO + N;

  function aplicar(e, m, semRep) {
    const b = e.b.slice(), p = b[m.de], lado = e.vez;
    b[m.para] = p; b[m.de] = '';
    let fimJa = null;
    const caps = [];
    for (const [df, dr] of DIRS) {
      const v = vizinho(m.para, df, dr); if (v < 0 || !b[v] || ladoDe(b[v]) === lado) continue;
      if (b[v] === 'K') {
        // o rei: no trono, os 4 lados; ao lado do trono, os 3 que sobram; longe, 2 (em linha)
        if (v === TRONO || juntoAoTrono(v)) {
          const todos = DIRS.map(([x, y]) => vizinho(v, x, y)).every(o => o === TRONO || b[o] === 'a');
          if (todos) { caps.push(v); fimJa = { vencedor: 0, motivo: 'o rei foi capturado' }; }
        } else {
          const o = vizinho(v, df, dr);
          if (o >= 0 && b[o] === 'a') { caps.push(v); fimJa = { vencedor: 0, motivo: 'o rei foi capturado' }; }
        }
        continue;
      }
      const o = vizinho(v, df, dr);
      if (hostil(b, o, ladoDe(b[v]))) caps.push(v);
    }
    for (const c of caps) b[c] = '';
    if (p === 'K' && borda(m.para)) fimJa = { vencedor: 1, motivo: 'o rei chegou à borda' };
    const n = { b, vez: 1 - lado, n: e.n + 1, rep: e.rep, fimJa };
    if (!semRep) { n.rep = Object.assign({}, e.rep); const k = chave(n); n.rep[k] = (n.rep[k] || 0) + 1; }
    return n;
  }
  const jogar = (e, m) => aplicar(e, m, false);
  const vez = e => e.vez;
  const lancePorId = (e, id) => lances(e).find(m => m.id === id) || null;

  function fim(e, ls) {
    if (e.fimJa) return e.fimJa;
    ls = ls || lances(e);
    if (!ls.length) return { vencedor: 1 - e.vez, motivo: 'sem lance' };
    if ((e.rep[chave(e)] || 0) >= 3) return { vencedor: null, motivo: 'repetição' };
    if (e.n >= 300) return { vencedor: null, motivo: '150 lances sem fim' };
    return null;
  }

  /* Do ponto de vista de quem joga agora. Para os defensores: as saídas livres do rei até a borda valem muito. */
  function avaliar(e) {
    if (e.fimJa) return e.fimJa.vencedor === e.vez ? 100000 : -100000;
    const b = e.b;
    let nA = 0, nD = 0, k = -1;
    for (let c = 0; c < N * N; c++) { const p = b[c]; if (p === 'a') nA++; else if (p === 'd') nD++; else if (p === 'K') k = c; }
    let saidas = 0, cerco = 0;
    const kf = k % N, kr = Math.floor(k / N);
    for (const [df, dr] of DIRS) {
      let a = vizinho(k, df, dr), livre = true;
      if (a >= 0 && b[a] === 'a') cerco++;
      while (a >= 0) { if (b[a] || a === TRONO) { livre = false; break; } a = vizinho(a, df, dr); }
      if (livre) saidas++;
    }
    const dist = Math.min(kf, kr, N - 1 - kf, N - 1 - kr);
    const s = 70 * nD - 45 * nA + (saidas >= 2 ? 3000 : saidas * 600) - 25 * dist - 90 * cerco;   // (para os defensores)
    return e.vez === 1 ? s : -s;
  }
  const ordem = (e, m) => (e.b[m.de] === 'K' ? (borda(m.para) ? 5000 : 50) : 0);

  const LADOS = ['Atacantes', 'Defensores'];
  const nomeDoLance = (e, m) => (e.b[m.de] === 'K' ? 'Rei ' : '') + m.id;

  const api = Object.freeze({
    id: 'tablut', nome: 'Tablut', lados: LADOS, lado0: 'Atacantes', tam: N, TRONO,
    inicial, lances, jogar, busca: (e, m) => aplicar(e, m, true), ruidoso: null, fim, vez, avaliar, ordem, lancePorId, nomeDoLance, nomeCasa, casaDe, ladoDe, borda, chave,
    profundidade: { facil: 1, medio: 3, dificil: 5 }, tempo: { facil: 300, medio: 1500, dificil: 3500 },
  });
  const TC = (root.TC = root.TC || {});
  TC.jogos = TC.jogos || {};
  TC.jogos.tablut = api;
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
