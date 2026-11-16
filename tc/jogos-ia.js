/* Tiny Cats · Jogos de Tabuleiro (lote 167): o computador, o adversário de quem joga sozinho.
   Uma busca só para todos os jogos (negamax com poda alfa-beta, aprofundando aos poucos até o tempo acabar), sobre a
   conversa comum dos jogos (inicial, lances, busca, fim, vez, avaliar, ordem, ruidoso). No fim de cada ramo, as
   capturas são seguidas até acalmar (para não parar a conta no meio de uma troca).
   Os níveis: fácil (olha um lance só e erra de propósito às vezes), médio e difícil (cada jogo diz quão fundo vai e
   quanto tempo pode pensar).
     TC.jogos.ia.escolher(jogo, estado, nivel, opt) → { lance, nota, prof } | null */
(function (root) {
  'use strict';
  const INF = 1e7, VITORIA = 1e6;

  function escolher(J, e, nivel, opt) {
    opt = opt || {};
    const sorte = opt.sorte || Math.random;
    // (lote 169) um jogo pode dar à busca uma lista mais curta (no Destino de Hemvria: não passar à toa)
    const L = J.lancesBusca || J.lances;
    const raiz = L(e);
    if (!raiz.length) return null;
    if (raiz.length === 1) return { lance: raiz[0], nota: 0, prof: 0 };
    nivel = J.profundidade[nivel] != null ? nivel : 'medio';
    const profMax = opt.prof || J.profundidade[nivel];
    const prazo = Date.now() + (opt.tempo || J.tempo[nivel]);
    let nos = 0, estourou = false;

    function terminal(x, ls, ply) {
      const f = J.fim(x, ls);
      if (!f) return null;
      if (f.vencedor === null) return 0;
      return f.vencedor === J.vez(x) ? VITORIA - ply : -(VITORIA - ply);
    }
    function calmo(x, alfa, beta, ply, q) {
      const ls = L(x);
      const t = terminal(x, ls, ply); if (t !== null) return t;
      const parado = J.avaliar(x);
      if (!J.ruidoso || q <= 0) return parado;
      const rs = ls.filter(J.ruidoso);
      if (!rs.length) return parado;
      // (nas Damas a captura é obrigatória: quando só há capturas, não dá para "ficar parado")
      const forcado = rs.length === ls.length;
      let melhor = forcado ? -INF : parado;
      if (!forcado) { if (parado >= beta) return parado; if (parado > alfa) alfa = parado; }
      rs.sort((a, b) => J.ordem(x, b) - J.ordem(x, a));
      for (const m of rs) {
        const v = -calmo(J.busca(x, m), -beta, -alfa, ply + 1, forcado ? q : q - 1);
        if (v > melhor) melhor = v;
        if (v >= beta) return v;
        if (v > alfa) alfa = v;
      }
      return melhor;
    }
    function negamax(x, prof, alfa, beta, ply) {
      if ((++nos & 1023) === 0 && Date.now() > prazo) { estourou = true; }
      if (estourou) return 0;
      if (prof <= 0) return calmo(x, alfa, beta, ply, 6);
      const ls = L(x);
      const t = terminal(x, ls, ply); if (t !== null) return t;
      ls.sort((a, b) => J.ordem(x, b) - J.ordem(x, a));
      let melhor = -INF;
      for (const m of ls) {
        const v = -negamax(J.busca(x, m), prof - 1, -beta, -alfa, ply + 1);
        if (estourou) return 0;
        if (v > melhor) melhor = v;
        if (v > alfa) alfa = v;
        if (alfa >= beta) break;
      }
      return melhor;
    }

    // o fácil: um lance de profundidade, com ruído; às vezes, um lance qualquer
    if (nivel === 'facil') {
      if (sorte() < 0.2) return { lance: raiz[Math.floor(sorte() * raiz.length)], nota: 0, prof: 0 };
      let best = null, bv = -INF;
      for (const m of raiz) {
        const v = -calmo(J.busca(e, m), -INF, INF, 1, 2) + (sorte() - 0.5) * 160;
        if (v > bv) { bv = v; best = m; }
      }
      return { lance: best, nota: bv, prof: 1 };
    }

    // entre os lances quase iguais ao melhor (dentro da margem), um ao acaso: o computador não joga sempre igual. Para
    // a nota desses lances ser exata (e não só "no máximo isto"), a janela da raiz vai até a margem abaixo do melhor.
    const margem = nivel === 'dificil' ? 4 : 15;
    let ordemRaiz = raiz.slice().sort((a, b) => J.ordem(e, b) - J.ordem(e, a));
    let escolhido = { lance: ordemRaiz[0], nota: 0, prof: 0 };
    for (let prof = 1; prof <= profMax; prof++) {
      let alfa = -INF, melhor = null, notas = new Map();
      for (const m of ordemRaiz) {
        const v = -negamax(J.busca(e, m), prof - 1, -INF, -(alfa - margem), 1);
        if (estourou) break;
        notas.set(m, v);
        if (v > alfa) { alfa = v; melhor = m; }
      }
      if (estourou && !melhor) break;
      if (melhor) {
        const bons = [...notas].filter(([, v]) => v >= alfa - margem).map(([m]) => m);
        const lance = estourou ? melhor : bons[Math.floor(sorte() * bons.length)] || melhor;
        escolhido = { lance, nota: alfa, prof };
        ordemRaiz = [melhor].concat(ordemRaiz.filter(m => m !== melhor));
      }
      if (estourou || Math.abs(alfa) > VITORIA / 2) break;
    }
    return escolhido;
  }

  const api = Object.freeze({ escolher });
  const TC = (root.TC = root.TC || {});
  TC.jogos = TC.jogos || {};
  TC.jogos.ia = api;
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
