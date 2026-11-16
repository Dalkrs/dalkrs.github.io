/* Tiny Cats · Jogos de Tabuleiro (lote 169): o Destino de Hemvria, o jogo de cartas com o tarô.
   O tabuleiro: 3 fileiras × 5 casas. Cada lado começa com 2 peões em cada casa da sua ponta (o Sol à esquerda, a Lua à
   direita). Baralho de 15 cartas (todas diferentes, no máximo 3 arcanos maiores), mão de 5; no começo de cada vez,
   compra 1 (menos na primeira vez de quem começa). Na sua vez: jogar uma carta numa casa sua, vazia, com peões
   suficientes (o custo da carta, de 1 a 3), ou passar. Dois passes seguidos terminam a partida.
   Ao entrar, a carta espalha peões (o desenho dela): numa casa vazia sua, +1 peão (até 3); numa do outro, a casa vira
   sua; numa sem dono, vira sua com 1 peão. Casas com carta não recebem peão. Depois, o efeito dela.
   Os naipes: Paus avança peões para a frente; Ouros espalha para os lados; Copas fortalece as suas cartas vizinhas;
   Espadas enfraquece as do outro à frente. Carta com poder 0 ou menos é destruída (a casa fica do dono, com 1 peão).
   Os pontos: em cada fileira, quem tem mais poder somado ganha os pontos dessa soma (empate: ninguém). Vence quem somar
   mais nas três fileiras.
   O "para a frente" é a direção do outro lado: o desenho de uma carta da Lua é o espelho do Sol.
   Tudo é determinado pelo começo (os dois baralhos e a semente, que embaralha): os lances podem ser refeitos em
   qualquer aparelho, como nos outros jogos. O lance: "P5@7" (a carta P5 na casa 7) ou "passar". */
(function (root) {
  'use strict';
  const LIN = 3, COL = 5, N = LIN * COL;
  const NAIPES = { P: 'Paus', C: 'Copas', E: 'Espadas', O: 'Ouros' };
  const SIMB = { P: '♣', C: '♥', E: '♠', O: '♦' };
  const NUM = ['', 'Ás', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Valete', 'Cavaleiro', 'Rainha', 'Rei'];
  const ROMANO = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
  // as direções, do ponto de vista do Sol (a frente é +x): F frente, F2/F3 duas/três à frente, U/D cima/baixo, FU/FD
  // as diagonais da frente, B atrás, BU/BD as diagonais de trás
  const D = { F: [1, 0], F2: [2, 0], F3: [3, 0], U: [0, -1], D: [0, 1], FU: [1, -1], FD: [1, 1], B: [-1, 0], BU: [-1, -1], BD: [-1, 1] };
  const ds = s => s.split(' ').filter(Boolean).map(k => D[k]);
  const CRUZ = ds('F U D B'), VOLTA = ds('F U D B FU FD BU BD');
  const CUSTO = n => (n <= 6 ? 1 : n <= 12 ? 2 : 3);
  const PODER = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 3, 4, 6, 7];

  /* ---- as 56 cartas dos arcanos menores ---- */
  const PEOES = {
    P: ['', 'F F2', 'F FU', 'F FD', 'F F2', 'F F2', 'F FU', 'F FD', 'F F2 FU', 'F F2 FD', 'F F2 F3', 'F FU FD', 'F F2 FU FD', 'F F2 FU FD', 'F F2 F3 FU FD'],
    O: ['', 'U D', 'U F', 'D F', 'U D', 'U D', 'U D F', 'U D FU', 'U D FD', 'U D FU FD', 'U D F FU FD', 'U D BU BD', 'U D FU FD', 'U D F FU FD', 'U D F FU FD BU BD'],
    C: ['', 'F U', 'F D', 'F U D', 'F F2', 'F U D', 'F FU FD', 'F U', 'F U D', 'F FU FD', 'F U D FU FD', 'F U D', 'F FU FD', 'F U D', 'F U D FU FD'],
    E: ['', 'F U', 'F D', 'F U D', 'F F2', 'F U D', 'F FU FD', 'F U', 'F U D', 'F FU FD', 'F U D FU FD', 'F U D', 'F FU FD', 'F U D', 'F U D FU FD'],
  };
  const VAL_EF = [0, 1, 1, 1, 1, 1, 1, 2, 1, 2, 2, 2, 2, 3, 3];
  const CARTAS = {};
  for (const n of 'PCEO') {
    for (let i = 1; i <= 14; i++) {
      const c = { id: n + i, naipe: n, num: i, nome: NUM[i] + ' de ' + NAIPES[n], custo: CUSTO(i), poder: PODER[i], peoes: ds(PEOES[n][i]) };
      if (n === 'C') c.ef = { t: 'mais', em: i === 14 ? VOLTA : CRUZ, v: VAL_EF[i] };
      if (n === 'E') c.ef = { t: 'menos', em: i === 14 ? ds('F FU FD F2') : ds('F FU FD'), v: VAL_EF[i] };
      c.texto = n === 'P' ? 'Avança peões para a frente.' : n === 'O' ? 'Espalha peões para os lados.'
        : n === 'C' ? '+' + c.ef.v + ' às suas cartas vizinhas' + (i === 14 ? ' (as 8 em volta).' : '.')
        : '−' + c.ef.v + ' às cartas do outro à frente' + (i === 14 ? ' (até duas casas).' : '.');
      CARTAS[c.id] = c;
    }
  }
  /* ---- os 22 arcanos maiores ---- */
  const MAIORES = [
    ['O Louco', 1, 1, 'F U D B FU FD BU BD', 'Peões nas 8 casas em volta.'],
    ['O Mago', 2, 3, 'F U D', 'Compra 1 carta.'],
    ['A Sacerdotisa', 2, 2, 'U D', 'Compra 2 cartas.'],
    ['A Imperatriz', 3, 4, 'F U D', '+1 a todas as suas cartas no tabuleiro.'],
    ['O Imperador', 3, 8, 'F U D B', 'Só força.'],
    ['O Hierofante', 3, 4, 'F', '+3 às suas cartas vizinhas.'],
    ['Os Enamorados', 2, 3, 'U D', '+2 às suas cartas em volta e −2 às do outro em volta.'],
    ['O Carro', 3, 5, '', 'Peões em linha reta até o fim da fileira.'],
    ['A Força', 3, 9, '', 'Não pode ser enfraquecida.'],
    ['O Eremita', 2, 4, '', '+5 enquanto for a sua única carta na fileira.'],
    ['A Roda da Fortuna', 2, 3, 'F U D', '+1 às suas cartas e −1 às do outro na mesma coluna.'],
    ['A Justiça', 3, 5, 'F', 'As cartas do outro na fileira com poder acima de 5 caem para 5.'],
    ['O Enforcado', 2, 3, '', 'As casas vazias do outro em volta perdem 1 peão (sem peão, ficam sem dono).'],
    ['A Morte', 3, 4, '', 'Toma para você a carta mais fraca do outro em volta.'],
    ['A Temperança', 2, 3, 'F', 'Tira o enfraquecimento das suas cartas da fileira.'],
    ['O Diabo', 3, 3, '', '−2 às cartas do outro em volta; +1 a ele por carta atingida.'],
    ['A Torre', 3, 3, '', 'Destrói a carta mais forte do outro em volta.'],
    ['A Estrela', 2, 2, '', 'Compra 1 carta e +1 peão em todas as suas casas vazias.'],
    ['A Lua', 3, 4, 'U D', '−3 às cartas do outro na mesma coluna.'],
    ['O Sol', 3, 5, 'F', '+2 a todas as suas cartas da fileira.'],
    ['O Julgamento', 3, 4, 'F', '+4 se, ao entrar, você está perdendo a fileira.'],
    ['O Mundo', 3, 6, 'F U D', 'Quem vence a fileira dele ganha +5 pontos.'],
  ];
  MAIORES.forEach(([nome, custo, poder, pe, texto], i) => { CARTAS['M' + i] = { id: 'M' + i, naipe: 'M', num: i, nome, romano: ROMANO[i], custo, poder, peoes: ds(pe), texto, maior: true }; });
  const TODAS = Object.keys(CARTAS);
  const PRONTOS = {
    P: { nome: 'Paus e o Carro', cartas: [...Array(14).keys()].map(i => 'P' + (i + 1)).concat('M7') },
    C: { nome: 'Copas e o Sol', cartas: [...Array(14).keys()].map(i => 'C' + (i + 1)).concat('M19') },
    E: { nome: 'Espadas e a Torre', cartas: [...Array(14).keys()].map(i => 'E' + (i + 1)).concat('M16') },
    O: { nome: 'Ouros e a Estrela', cartas: [...Array(14).keys()].map(i => 'O' + (i + 1)).concat('M17') },
  };
  /* O baralho vale? → null (vale) ou o motivo */
  function baralhoInvalido(ids) {
    if (!Array.isArray(ids) || ids.length !== 15) return 'O baralho tem de ter 15 cartas.';
    if (new Set(ids).size !== 15) return 'Cada carta entra uma vez só.';
    if (ids.some(id => !CARTAS[id])) return 'Há uma carta que não existe.';
    if (ids.filter(id => CARTAS[id].maior).length > 3) return 'No máximo 3 arcanos maiores.';
    return null;
  }

  /* ---- o embaralhar (sempre igual para a mesma semente) ---- */
  function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function sorteio(sem) { let a = sem >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function embaralhar(ids, sem) { const r = sorteio(sem), a = ids.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  const idx = (l, c) => l * COL + c;
  const lc = i => [Math.floor(i / COL), i % COL];
  // a casa no desenho [dx, dy] a partir de i, para o lado (a Lua vê a frente ao contrário)
  function alvo(i, [dx, dy], lado) { const [l, c] = lc(i), cc = c + (lado === 0 ? dx : -dx), ll = l + dy; return ll >= 0 && ll < LIN && cc >= 0 && cc < COL ? idx(ll, cc) : -1; }

  /* o começo: opt = { baralhos: [ids do Sol, ids da Lua], semente } */
  function inicial(opt) {
    opt = opt || {};
    const bs = (opt.baralhos || []).map(b => (baralhoInvalido(b) ? PRONTOS.P.cartas : b));
    while (bs.length < 2) bs.push(PRONTOS[bs.length ? 'E' : 'P'].cartas);
    const sem = hash(opt.semente || 'hemvria');
    const pilhas = [embaralhar(bs[0], sem ^ 0x51), embaralhar(bs[1], sem ^ 0xa7)];
    const tab = [];
    for (let i = 0; i < N; i++) { const c = i % COL; tab.push({ d: c === 0 ? 0 : c === COL - 1 ? 1 : -1, p: c === 0 || c === COL - 1 ? 2 : 0, c: null }); }
    return { tab, maos: [pilhas[0].slice(0, 5), pilhas[1].slice(0, 5)], pilhas: [pilhas[0].slice(5), pilhas[1].slice(5)], vez: 0, passes: 0, n: 0 };
  }
  const copia = e => ({ tab: e.tab.map(t => ({ d: t.d, p: t.p, c: t.c ? Object.assign({}, t.c) : null })), maos: [e.maos[0].slice(), e.maos[1].slice()], pilhas: [e.pilhas[0].slice(), e.pilhas[1].slice()], vez: e.vez, passes: e.passes, n: e.n });

  /* o poder de uma carta no tabuleiro, agora (o Eremita depende da fileira) */
  function poderEm(e, i) {
    const t = e.tab[i]; if (!t.c) return 0;
    let v = CARTAS[t.c.id].poder + (t.c.m || 0);
    if (t.c.id === 'M9') { const [l] = lc(i); let so = true; for (let c = 0; c < COL; c++) { const j = idx(l, c); if (j !== i && e.tab[j].c && e.tab[j].c.d === t.c.d) so = false; } if (so) v += 5; }
    return v;
  }
  /* os pontos: { fileiras: [[sol, lua]×3], total: [sol, lua] } */
  function pontos(e) {
    const fileiras = [], total = [0, 0];
    for (let l = 0; l < LIN; l++) {
      const s = [0, 0]; let mundo = false;
      for (let c = 0; c < COL; c++) { const i = idx(l, c), t = e.tab[i]; if (t.c) { s[t.c.d] += Math.max(0, poderEm(e, i)); if (t.c.id === 'M21') mundo = true; } }
      fileiras.push(s);
      if (s[0] > s[1]) total[0] += s[0] + (mundo ? 5 : 0); else if (s[1] > s[0]) total[1] += s[1] + (mundo ? 5 : 0);
    }
    return { fileiras, total };
  }

  function lances(e) {
    if (e.passes >= 2) return [];
    const out = [], lado = e.vez;
    for (const id of e.maos[lado]) {
      const k = CARTAS[id];
      for (let i = 0; i < N; i++) { const t = e.tab[i]; if (t.d === lado && !t.c && t.p >= k.custo) out.push({ id: id + '@' + i, carta: id, casa: i }); }
    }
    out.push({ id: 'passar', passar: true });
    return out;
  }

  function mexer(e, i, delta, lado) {                       // mais/menos poder numa carta (a Força não enfraquece)
    const t = e.tab[i]; if (!t.c) return false;
    if (delta < 0 && t.c.id === 'M8') return false;
    t.c.m = (t.c.m || 0) + delta;
    return true;
  }
  function limparMortas(e) { for (let i = 0; i < N; i++) { const t = e.tab[i]; if (t.c && poderEm(e, i) <= 0) { t.d = t.c.d; t.c = null; t.p = 1; } } }
  function comprar(e, lado, q) { for (let k = 0; k < q && e.pilhas[lado].length; k++) e.maos[lado].push(e.pilhas[lado].shift()); }
  const volta = (i, lado) => VOLTA.map(o => alvo(i, o, lado)).filter(j => j >= 0);

  function aplicar(e, m) {
    const n = copia(e), lado = e.vez, outro = 1 - lado;
    if (m.passar) { n.passes = e.passes + 1; }
    else {
      const k = CARTAS[m.carta], i = m.casa;
      n.maos[lado] = n.maos[lado].filter(x => x !== m.carta);
      n.tab[i].c = { id: k.id, d: lado, m: 0 };
      n.passes = 0;
      // os peões
      let desenho = k.peoes;
      if (k.id === 'M7') { desenho = []; for (let dx = 1; dx < COL; dx++) desenho.push([dx, 0]); }
      for (const o of desenho) {
        const j = alvo(i, o, lado); if (j < 0) continue;
        const t = n.tab[j]; if (t.c) continue;
        if (t.d === lado) t.p = Math.min(3, t.p + 1); else if (t.d === outro) t.d = lado; else { t.d = lado; t.p = 1; }
      }
      // o efeito
      const [l, c] = lc(i);
      const minhasNa = (f) => { const r = []; for (let x = 0; x < N; x++) { const t = n.tab[x]; if (t.c && t.c.d === lado && f(x)) r.push(x); } return r; };
      const delesNa = (f) => { const r = []; for (let x = 0; x < N; x++) { const t = n.tab[x]; if (t.c && t.c.d === outro && f(x)) r.push(x); } return r; };
      const naFileira = x => lc(x)[0] === l, naColuna = x => lc(x)[1] === c, emVolta = new Set(volta(i, lado)), perto = x => emVolta.has(x);
      if (k.ef) {
        for (const o of k.ef.em) { const j = alvo(i, o, lado); if (j < 0 || !n.tab[j].c) continue; if (k.ef.t === 'mais' && n.tab[j].c.d === lado) mexer(n, j, k.ef.v); if (k.ef.t === 'menos' && n.tab[j].c.d === outro) mexer(n, j, -k.ef.v); }
      }
      switch (k.id) {
        case 'M1': comprar(n, lado, 1); break;
        case 'M2': comprar(n, lado, 2); break;
        case 'M3': for (const x of minhasNa(x => x !== i)) mexer(n, x, 1); break;
        case 'M5': for (const o of CRUZ) { const j = alvo(i, o, lado); if (j >= 0 && n.tab[j].c && n.tab[j].c.d === lado) mexer(n, j, 3); } break;
        case 'M6': for (const x of minhasNa(perto)) mexer(n, x, 2); for (const x of delesNa(perto)) mexer(n, x, -2); break;
        case 'M10': for (const x of minhasNa(x => naColuna(x) && x !== i)) mexer(n, x, 1); for (const x of delesNa(naColuna)) mexer(n, x, -1); break;
        case 'M11': for (const x of delesNa(naFileira)) { const v = poderEm(n, x); if (v > 5) mexer(n, x, 5 - v); } break;
        case 'M12': for (const j of volta(i, lado)) { const t = n.tab[j]; if (t.d === outro && !t.c) { t.p -= 1; if (t.p <= 0) { t.p = 0; t.d = -1; } } } break;
        case 'M13': { const xs = delesNa(perto).sort((a, b) => poderEm(n, a) - poderEm(n, b) || a - b); if (xs.length) { n.tab[xs[0]].c.d = lado; n.tab[xs[0]].d = lado; } break; }
        case 'M14': for (const x of minhasNa(naFileira)) if (n.tab[x].c.m < 0) n.tab[x].c.m = 0; break;
        case 'M15': { let q = 0; for (const x of delesNa(perto)) if (mexer(n, x, -2)) q++; if (q) mexer(n, i, q); break; }
        case 'M16': { const xs = delesNa(perto).sort((a, b) => poderEm(n, b) - poderEm(n, a) || a - b); if (xs.length) { const t = n.tab[xs[0]]; t.d = t.c.d; t.c = null; t.p = 1; } break; }
        case 'M17': comprar(n, lado, 1); for (const t of n.tab) if (t.d === lado && !t.c) t.p = Math.min(3, t.p + 1); break;
        case 'M18': for (const x of delesNa(naColuna)) mexer(n, x, -3); break;
        case 'M19': for (const x of minhasNa(x => naFileira(x) && x !== i)) mexer(n, x, 2); break;
        case 'M20': { const s = pontos(n).fileiras[l]; if (s[outro] > s[lado]) mexer(n, i, 4); break; }
        default: break;
      }
      limparMortas(n);
    }
    n.vez = outro; n.n = e.n + 1;
    if (n.passes < 2) comprar(n, outro, 1);                  // o próximo compra no começo da vez dele
    return n;
  }
  /* para o computador: passar só quando não há o que jogar, ou quando o outro acabou de passar (passar agora termina
     a partida — vale a pena se ele está ganhando) */
  function lancesBusca(e) { const ls = lances(e); return ls.length > 1 && e.passes === 0 ? ls.filter(m => !m.passar) : ls; }
  const jogar = (e, m) => aplicar(e, m);
  const vez = e => e.vez;
  const lancePorId = (e, id) => lances(e).find(m => m.id === id) || null;
  function fim(e) {
    if (e.passes < 2 && e.n < 120) return null;
    const p = pontos(e).total;
    return { vencedor: p[0] > p[1] ? 0 : p[1] > p[0] ? 1 : null, motivo: p[0] + ' a ' + p[1], pontos: p };
  }
  function avaliar(e) {
    const p = pontos(e), lado = e.vez;
    let s = (p.total[lado] - p.total[1 - lado]) * 10;
    for (let l = 0; l < LIN; l++) s += (p.fileiras[l][lado] - p.fileiras[l][1 - lado]) * 2;
    for (const t of e.tab) if (!t.c && t.d >= 0) s += (t.d === lado ? 1 : -1) * (2 + t.p);
    s += (e.maos[lado].length - e.maos[1 - lado].length) * 3;
    return s;
  }
  // o passe é o último a ser tentado, e não se passa à toa: na busca, passar quando o outro ainda não passou perde
  const ordem = (e, m) => (m.passar ? -1000 : CARTAS[m.carta].poder * 10 + CARTAS[m.carta].custo);
  const nomeDoLance = (e, m) => (m.passar ? 'passou' : CARTAS[m.carta].nome + ' em ' + 'ABC'[lc(m.casa)[0]] + (lc(m.casa)[1] + 1));

  const api = Object.freeze({
    id: 'hemvria', nome: 'Destino de Hemvria', lados: ['Sol', 'Lua'], lado0: 'Sol', cartas: true, LIN, COL, N,
    inicial, lances, lancesBusca, jogar, busca: aplicar, ruidoso: null, fim, vez, avaliar, ordem, lancePorId, nomeDoLance,
    CARTAS, TODAS, PRONTOS, NAIPES, SIMB, baralhoInvalido, poderEm, pontos, alvo, lc, idx, embaralhar, hash,
    profundidade: { facil: 1, medio: 2, dificil: 4 }, tempo: { facil: 300, medio: 1200, dificil: 3000 },
  });
  const TC = (root.TC = root.TC || {});
  TC.jogos = TC.jogos || {};
  TC.jogos.hemvria = api;
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
