/* Tiny Cats · Jogos de Tabuleiro (lote 167): o Xadrez.
   As regras completas: roque, en passant, promoção (a qualquer peça), xeque, xeque-mate, afogamento, e os empates por
   repetição (a mesma posição 3 vezes), pelos 50 lances sem captura nem peão e por falta de material.
   A casa é um número de 0 a 63: 0 = a1, 7 = h1, 56 = a8. As peças: P C B T D R (peão, cavalo, bispo, torre, dama, rei),
   maiúsculas as brancas, minúsculas as pretas. O lance tem um nome curto, o "id": "e2e4", "e7e8D" (promoção), que é o
   que vai para o banco. Todas as partidas seguem a mesma conversa (ver tc/jogos.js):
     inicial() · lances(e) · jogar(e, lance) · fim(e) · vez(e) · avaliar(e) · lancePorId(e, id) */
(function (root) {
  'use strict';
  const COLS = 'abcdefgh';
  const nomeCasa = c => COLS[c & 7] + ((c >> 3) + 1);
  const casaDe = s => { const f = COLS.indexOf(s[0]), r = +s[1] - 1; return f < 0 || !(r >= 0 && r < 8) ? -1 : r * 8 + f; };
  const branca = p => p && p === p.toUpperCase();
  const corDe = p => (!p ? -1 : branca(p) ? 0 : 1);
  const tipo = p => (p ? p.toUpperCase() : '');
  const NOMES = { P: 'peão', C: 'cavalo', B: 'bispo', T: 'torre', D: 'dama', R: 'rei' };

  const INICIO = 'TCBDRBCT' + 'PPPPPPPP' + '                                ' + 'pppppppp' + 'tcbdrbct';
  function inicial() {
    const b = INICIO.split('').map(x => (x === ' ' ? '' : x));
    const e = { b, vez: 0, roque: { K: true, Q: true, k: true, q: true }, ep: -1, meio: 0, n: 1, rep: {} };
    e.rep[chave(e)] = 1;
    return e;
  }
  const copia = e => ({ b: e.b.slice(), vez: e.vez, roque: Object.assign({}, e.roque), ep: e.ep, meio: e.meio, n: e.n, rep: e.rep });
  // a posição, para contar as repetições (as peças, a vez, o roque e o en passant)
  function chave(e) {
    return e.b.map(x => x || '.').join('') + e.vez + (e.roque.K ? 'K' : '') + (e.roque.Q ? 'Q' : '') + (e.roque.k ? 'k' : '') + (e.roque.q ? 'q' : '') + e.ep;
  }

  const DIR_C = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const DIR_R = [[1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
  const DIR_B = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  const DIR_T = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const em = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;

  /* A casa c é atacada por alguma peça da cor `cor`? */
  function atacada(b, c, cor) {
    const f = c & 7, r = c >> 3;
    // peão
    const dr = cor === 0 ? -1 : 1, P = cor === 0 ? 'P' : 'p';
    for (const df of [-1, 1]) { const ff = f + df, rr = r + dr; if (em(ff, rr) && b[rr * 8 + ff] === P) return true; }
    const C = cor === 0 ? 'C' : 'c', R = cor === 0 ? 'R' : 'r';
    for (const [df, d2] of DIR_C) { const ff = f + df, rr = r + d2; if (em(ff, rr) && b[rr * 8 + ff] === C) return true; }
    for (const [df, d2] of DIR_R) { const ff = f + df, rr = r + d2; if (em(ff, rr) && b[rr * 8 + ff] === R) return true; }
    const B = cor === 0 ? 'B' : 'b', T = cor === 0 ? 'T' : 't', D = cor === 0 ? 'D' : 'd';
    for (const [df, d2] of DIR_B) {
      let ff = f + df, rr = r + d2;
      while (em(ff, rr)) { const p = b[rr * 8 + ff]; if (p) { if (p === B || p === D) return true; break; } ff += df; rr += d2; }
    }
    for (const [df, d2] of DIR_T) {
      let ff = f + df, rr = r + d2;
      while (em(ff, rr)) { const p = b[rr * 8 + ff]; if (p) { if (p === T || p === D) return true; break; } ff += df; rr += d2; }
    }
    return false;
  }
  const reiDe = (b, cor) => b.indexOf(cor === 0 ? 'R' : 'r');
  const emXeque = (e, cor) => { const k = reiDe(e.b, cor === undefined ? e.vez : cor); return k >= 0 && atacada(e.b, k, 1 - (cor === undefined ? e.vez : cor)); };

  function pseudo(e) {
    const b = e.b, cor = e.vez, out = [];
    const add = (de, para, extra) => { const m = Object.assign({ de, para, cap: b[para] || '' }, extra || {}); m.id = nomeCasa(de) + nomeCasa(para) + (m.promo ? m.promo.toUpperCase() : ''); out.push(m); };
    for (let c = 0; c < 64; c++) {
      const p = b[c]; if (!p || corDe(p) !== cor) continue;
      const t = tipo(p), f = c & 7, r = c >> 3;
      if (t === 'P') {
        const dr = cor === 0 ? 1 : -1, ini = cor === 0 ? 1 : 6, ult = cor === 0 ? 7 : 0;
        const promos = rr => (rr === ult ? ['D', 'T', 'B', 'C'].map(x => (cor === 0 ? x : x.toLowerCase())) : [null]);
        const r1 = r + dr;
        if (em(f, r1) && !b[r1 * 8 + f]) {
          for (const pr of promos(r1)) add(c, r1 * 8 + f, pr ? { promo: pr } : null);
          const r2 = r + 2 * dr;
          if (r === ini && !b[r2 * 8 + f]) add(c, r2 * 8 + f, { duplo: true });
        }
        for (const df of [-1, 1]) {
          const ff = f + df; if (!em(ff, r1)) continue;
          const alvo = r1 * 8 + ff;
          if (b[alvo] && corDe(b[alvo]) !== cor) for (const pr of promos(r1)) add(c, alvo, pr ? { promo: pr } : null);
          else if (alvo === e.ep) add(c, alvo, { ep: true, cap: cor === 0 ? 'p' : 'P' });
        }
      } else if (t === 'C' || t === 'R') {
        for (const [df, dr] of t === 'C' ? DIR_C : DIR_R) {
          const ff = f + df, rr = r + dr; if (!em(ff, rr)) continue;
          const a = rr * 8 + ff; if (!b[a] || corDe(b[a]) !== cor) add(c, a);
        }
        if (t === 'R') {
          const base = cor === 0 ? 0 : 56, K = cor === 0 ? 'K' : 'k', Q = cor === 0 ? 'Q' : 'q', inimigo = 1 - cor;
          if (c === base + 4 && !atacada(b, c, inimigo)) {
            if (e.roque[K] && !b[base + 5] && !b[base + 6] && b[base + 7] === (cor === 0 ? 'T' : 't') && !atacada(b, base + 5, inimigo) && !atacada(b, base + 6, inimigo)) add(c, base + 6, { roque: 'curto' });
            if (e.roque[Q] && !b[base + 3] && !b[base + 2] && !b[base + 1] && b[base] === (cor === 0 ? 'T' : 't') && !atacada(b, base + 3, inimigo) && !atacada(b, base + 2, inimigo)) add(c, base + 2, { roque: 'longo' });
          }
        }
      } else {
        const dirs = t === 'B' ? DIR_B : t === 'T' ? DIR_T : DIR_R;
        for (const [df, dr] of dirs) {
          let ff = f + df, rr = r + dr;
          while (em(ff, rr)) { const a = rr * 8 + ff; if (b[a]) { if (corDe(b[a]) !== cor) add(c, a); break; } add(c, a); ff += df; rr += dr; }
        }
      }
    }
    return out;
  }

  /* Faz o lance (sem conferir se é permitido). `semRep`: não conta a repetição (a busca do computador). */
  function aplicar(e, m, semRep) {
    const n = copia(e), b = n.b, p = b[m.de], cor = e.vez;
    b[m.para] = m.promo || p; b[m.de] = '';
    if (m.ep) b[m.para + (cor === 0 ? -8 : 8)] = '';
    if (m.roque) {
      const base = cor === 0 ? 0 : 56;
      if (m.roque === 'curto') { b[base + 5] = b[base + 7]; b[base + 7] = ''; } else { b[base + 3] = b[base]; b[base] = ''; }
    }
    if (tipo(p) === 'R') { if (cor === 0) n.roque.K = n.roque.Q = false; else n.roque.k = n.roque.q = false; }
    for (const [casa, k] of [[0, 'Q'], [7, 'K'], [56, 'q'], [63, 'k']]) if (m.de === casa || m.para === casa) n.roque[k] = false;
    n.ep = m.duplo ? (m.de + m.para) >> 1 : -1;
    n.meio = tipo(p) === 'P' || m.cap ? 0 : e.meio + 1;
    if (cor === 1) n.n = e.n + 1;
    n.vez = 1 - cor;
    if (!semRep) { n.rep = Object.assign({}, e.rep); const k = chave(n); n.rep[k] = (n.rep[k] || 0) + 1; }
    return n;
  }

  function lances(e) {
    const out = [];
    for (const m of pseudo(e)) { const n = aplicar(e, m, true); if (!emXeque(n, e.vez)) out.push(m); }
    return out;
  }
  const jogar = (e, m) => aplicar(e, m, false);
  const vez = e => e.vez;
  const lancePorId = (e, id) => lances(e).find(m => m.id === id) || null;

  function semMaterial(b) {
    const resto = b.filter(p => p && tipo(p) !== 'R');
    if (!resto.length) return true;
    if (resto.length === 1 && (tipo(resto[0]) === 'B' || tipo(resto[0]) === 'C')) return true;
    // só bispos, todos na mesma cor de casa
    if (resto.every(p => tipo(p) === 'B')) { const cs = new Set(); b.forEach((p, c) => { if (p && tipo(p) === 'B') cs.add(((c & 7) + (c >> 3)) & 1); }); return cs.size === 1; }
    return false;
  }
  /* O fim: null (a partida segue) ou { vencedor: 0 | 1 | null, motivo }. 0 = brancas, 1 = pretas, null = empate. */
  function fim(e, ls) {
    ls = ls || lances(e);
    if (!ls.length) return emXeque(e) ? { vencedor: 1 - e.vez, motivo: 'xeque-mate' } : { vencedor: null, motivo: 'afogamento' };
    if (e.meio >= 100) return { vencedor: null, motivo: '50 lances sem captura' };
    if (semMaterial(e.b)) return { vencedor: null, motivo: 'falta de material' };
    if ((e.rep[chave(e)] || 0) >= 3) return { vencedor: null, motivo: 'repetição' };
    return null;
  }

  /* ---- a avaliação, para o computador (do ponto de vista de quem joga agora) ---- */
  const VAL = { P: 100, C: 320, B: 330, T: 500, D: 900, R: 0 };
  // tabelas de posição (vistas pelas brancas, a1 = índice 0)
  const TAB = {
    P: [0,0,0,0,0,0,0,0, 5,10,10,-20,-20,10,10,5, 5,-5,-10,0,0,-10,-5,5, 0,0,0,20,20,0,0,0, 5,5,10,25,25,10,5,5, 10,10,20,30,30,20,10,10, 50,50,50,50,50,50,50,50, 0,0,0,0,0,0,0,0],
    C: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,5,5,0,-20,-40, -30,5,10,15,15,10,5,-30, -30,0,15,20,20,15,0,-30, -30,5,15,20,20,15,5,-30, -30,0,10,15,15,10,0,-30, -40,-20,0,0,0,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    B: [-20,-10,-10,-10,-10,-10,-10,-20, -10,5,0,0,0,0,5,-10, -10,10,10,10,10,10,10,-10, -10,0,10,10,10,10,0,-10, -10,5,5,10,10,5,5,-10, -10,0,5,10,10,5,0,-10, -10,0,0,0,0,0,0,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    T: [0,0,0,5,5,0,0,0, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 5,10,10,10,10,10,10,5, 0,0,0,0,0,0,0,0],
    D: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,5,0,0,0,0,-10, -10,5,5,5,5,5,0,-10, 0,0,5,5,5,5,0,-5, -5,0,5,5,5,5,0,-5, -10,0,5,5,5,5,0,-10, -10,0,0,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    R: [20,30,10,0,0,10,30,20, 20,20,0,0,0,0,20,20, -10,-20,-20,-20,-20,-20,-20,-10, -20,-30,-30,-40,-40,-30,-30,-20, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30],
    RF: [-50,-30,-30,-30,-30,-30,-30,-50, -30,-30,0,0,0,0,-30,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-20,-10,0,0,-10,-20,-30, -50,-40,-30,-20,-20,-30,-40,-50],
  };
  function avaliar(e) {
    const b = e.b;
    let s = 0, pesado = 0;
    for (let c = 0; c < 64; c++) { const p = b[c]; if (p && (tipo(p) === 'D' || tipo(p) === 'T')) pesado += VAL[tipo(p)]; }
    const final = pesado <= 1300;
    for (let c = 0; c < 64; c++) {
      const p = b[c]; if (!p) continue;
      const t = tipo(p), w = branca(p), idx = w ? c : (7 - (c >> 3)) * 8 + (c & 7);
      const v = VAL[t] + (t === 'R' && final ? TAB.RF[idx] : TAB[t][idx]);
      s += w ? v : -v;
    }
    return e.vez === 0 ? s : -s;
  }
  // a ordem dos lances para a busca: capturas boas primeiro
  const ordem = (e, m) => (m.cap ? 10 * VAL[tipo(m.cap)] - VAL[tipo(e.b[m.de])] + 1000 : 0) + (m.promo ? 800 : 0);

  /* ---- os textos ---- */
  const COR = ['Brancas', 'Pretas'];
  function nomeDoLance(e, m) {
    if (m.roque) return m.roque === 'curto' ? 'O-O' : 'O-O-O';
    const t = tipo(e.b[m.de]);
    return (t === 'P' ? '' : t) + nomeCasa(m.de) + (m.cap ? '×' : '-') + nomeCasa(m.para) + (m.promo ? '=' + tipo(m.promo) : '') + (m.ep ? ' e.p.' : '');
  }

  const api = Object.freeze({
    id: 'xadrez', nome: 'Xadrez', lados: COR, lado0: 'Brancas', tam: 8,
    inicial, lances, jogar, busca: (e, m) => aplicar(e, m, true), ruidoso: m => !!m.cap || !!m.promo, fim, vez, avaliar, ordem, lancePorId, emXeque, nomeDoLance, nomeCasa, casaDe, corDe, tipo, NOMES, chave,
    profundidade: { facil: 1, medio: 3, dificil: 5 }, tempo: { facil: 300, medio: 1200, dificil: 3000 },
  });
  const TC = (root.TC = root.TC || {});
  TC.jogos = TC.jogos || {};
  TC.jogos.xadrez = api;
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
