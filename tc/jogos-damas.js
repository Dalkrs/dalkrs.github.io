/* Tiny Cats · Jogos de Tabuleiro (lote 167): as Damas brasileiras.
   8×8, nas casas escuras (a1 é escura). As brancas começam embaixo e jogam primeiro. A pedra anda uma casa na diagonal,
   para a frente, e captura para a frente e para trás. Capturar é obrigatório, e vale a lei da maioria: entre as capturas
   possíveis, é obrigatório fazer a que leva mais peças (a dama não vale mais que a pedra na conta). As peças capturadas
   saem só no fim do lance e não podem ser puladas duas vezes. A dama anda e captura à distância ("dama voadora"), e
   pode parar em qualquer casa livre depois da peça capturada. A pedra que chega à última fileira vira dama — mas, se
   passar por ela no meio de uma captura e continuar capturando, segue pedra.
   Perde quem não tem lance. Empate: a mesma posição 3 vezes, ou 20 lances de cada lado só com damas, sem captura.
   As peças: b (pedra branca), B (dama branca), p (pedra preta), P (dama preta). O id do lance: "c3-d4" ou "c3xe5xc7". */
(function (root) {
  'use strict';
  const COLS = 'abcdefgh';
  const nomeCasa = c => COLS[c & 7] + ((c >> 3) + 1);
  const casaDe = s => { const f = COLS.indexOf(s[0]), r = +s[1] - 1; return f < 0 || !(r >= 0 && r < 8) ? -1 : r * 8 + f; };
  const corDe = p => (!p ? -1 : p === 'b' || p === 'B' ? 0 : 1);
  const ehDama = p => p === 'B' || p === 'P';
  const escura = c => (((c & 7) + (c >> 3)) & 1) === 0;
  const em = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
  const DIRS = [[1, 1], [-1, 1], [1, -1], [-1, -1]];

  function inicial() {
    const b = Array(64).fill('');
    for (let c = 0; c < 64; c++) { if (!escura(c)) continue; const r = c >> 3; if (r <= 2) b[c] = 'b'; else if (r >= 5) b[c] = 'p'; }
    const e = { b, vez: 0, soDamas: 0, rep: {} };
    e.rep[chave(e)] = 1;
    return e;
  }
  const chave = e => e.b.map(x => x || '.').join('') + e.vez;

  /* As capturas a partir de `de` (todas as sequências completas): [{ caminho: [casas], caps: [casas] }]. */
  function capturasDe(b, de) {
    const p = b[de], cor = corDe(p), dama = ehDama(p), out = [];
    const bb = b.slice(); bb[de] = '';                        // a casa de onde saiu fica livre durante a sequência
    function busca(c, caminho, caps) {
      let continuou = false;
      const f = c & 7, r = c >> 3;
      for (const [df, dr] of DIRS) {
        if (!dama) {
          const f1 = f + df, r1 = r + dr, f2 = f + 2 * df, r2 = r + 2 * dr;
          if (!em(f2, r2)) continue;
          const meio = r1 * 8 + f1, alvo = r2 * 8 + f2;
          if (bb[meio] && corDe(bb[meio]) !== cor && !caps.includes(meio) && !bb[alvo]) {
            continuou = true;
            busca(alvo, caminho.concat(alvo), caps.concat(meio));
          }
        } else {
          let ff = f + df, rr = r + dr;
          while (em(ff, rr) && !bb[rr * 8 + ff]) { ff += df; rr += dr; }
          if (!em(ff, rr)) continue;
          const meio = rr * 8 + ff;
          if (corDe(bb[meio]) === cor || caps.includes(meio)) continue;
          ff += df; rr += dr;
          while (em(ff, rr) && !bb[rr * 8 + ff]) {
            continuou = true;
            const alvo = rr * 8 + ff;
            busca(alvo, caminho.concat(alvo), caps.concat(meio));
            ff += df; rr += dr;
          }
        }
      }
      if (!continuou && caps.length) out.push({ caminho, caps });
    }
    busca(de, [de], []);
    return out;
  }

  function lances(e) {
    const b = e.b, cor = e.vez, caps = [], simples = [];
    for (let c = 0; c < 64; c++) {
      const p = b[c]; if (!p || corDe(p) !== cor) continue;
      for (const s of capturasDe(b, c)) caps.push(s);
    }
    const fazer = (caminho, capturas) => ({ de: caminho[0], para: caminho[caminho.length - 1], caminho, caps: capturas, id: caminho.map(nomeCasa).join(capturas.length ? 'x' : '-') });
    if (caps.length) {
      const max = Math.max(...caps.map(s => s.caps.length));
      const vistos = new Set(), out = [];
      for (const s of caps) if (s.caps.length === max) { const m = fazer(s.caminho, s.caps); if (!vistos.has(m.id)) { vistos.add(m.id); out.push(m); } }
      return out;
    }
    for (let c = 0; c < 64; c++) {
      const p = b[c]; if (!p || corDe(p) !== cor) continue;
      const f = c & 7, r = c >> 3;
      for (const [df, dr] of DIRS) {
        if (!ehDama(p)) {
          if ((cor === 0 && dr < 0) || (cor === 1 && dr > 0)) continue;
          const ff = f + df, rr = r + dr;
          if (em(ff, rr) && !b[rr * 8 + ff]) simples.push(fazer([c, rr * 8 + ff], []));
        } else {
          let ff = f + df, rr = r + dr;
          while (em(ff, rr) && !b[rr * 8 + ff]) { simples.push(fazer([c, rr * 8 + ff], [])); ff += df; rr += dr; }
        }
      }
    }
    return simples;
  }

  function aplicar(e, m, semRep) {
    const b = e.b.slice(), p = b[m.de];
    b[m.de] = '';
    for (const c of m.caps) b[c] = '';
    const ult = corDe(p) === 0 ? 7 : 0;
    b[m.para] = !ehDama(p) && (m.para >> 3) === ult ? p.toUpperCase() : p;
    const n = { b, vez: 1 - e.vez, soDamas: ehDama(p) && !m.caps.length ? e.soDamas + 1 : 0, rep: e.rep };
    if (!semRep) { n.rep = Object.assign({}, e.rep); const k = chave(n); n.rep[k] = (n.rep[k] || 0) + 1; }
    return n;
  }
  const jogar = (e, m) => aplicar(e, m, false);
  const vez = e => e.vez;
  const lancePorId = (e, id) => lances(e).find(m => m.id === id) || null;

  function fim(e, ls) {
    ls = ls || lances(e);
    if (!ls.length) return { vencedor: 1 - e.vez, motivo: e.b.some(p => corDe(p) === e.vez) ? 'sem lance' : 'todas as peças capturadas' };
    if (e.soDamas >= 40) return { vencedor: null, motivo: '20 lances só de damas' };
    if ((e.rep[chave(e)] || 0) >= 3) return { vencedor: null, motivo: 'repetição' };
    return null;
  }

  function avaliar(e) {
    let s = 0;
    for (let c = 0; c < 64; c++) {
      const p = e.b[c]; if (!p) continue;
      const cor = corDe(p), r = c >> 3, f = c & 7;
      let v = ehDama(p) ? 320 : 100 + (cor === 0 ? r : 7 - r) * 6;
      if (f >= 2 && f <= 5 && r >= 2 && r <= 5) v += 6;                    // o centro
      if (!ehDama(p) && (cor === 0 ? r === 0 : r === 7)) v += 8;           // a fileira de trás, que segura a dama do outro
      s += cor === 0 ? v : -v;
    }
    return e.vez === 0 ? s : -s;
  }
  const ordem = (e, m) => m.caps.length * 100 + (ehDama(e.b[m.de]) ? 0 : 1);

  const COR = ['Brancas', 'Pretas'];
  const nomeDoLance = (e, m) => m.id.replace(/x/g, '×');

  const api = Object.freeze({
    id: 'damas', nome: 'Damas', lados: COR, lado0: 'Brancas', tam: 8,
    inicial, lances, jogar, busca: (e, m) => aplicar(e, m, true), ruidoso: m => m.caps.length > 0, fim, vez, avaliar, ordem, lancePorId, nomeDoLance, nomeCasa, casaDe, corDe, ehDama, escura, chave,
    profundidade: { facil: 1, medio: 5, dificil: 12 }, tempo: { facil: 300, medio: 1000, dificil: 2500 },
  });
  const TC = (root.TC = root.TC || {});
  TC.jogos = TC.jogos || {};
  TC.jogos.damas = api;
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
