/* ---------------------------------------------------------------
   10c2. ESTILOS — o jeito de cada lugar gerado (lote 7)
   Comum, Oriental, Nórdico, Desértico, Élfico e Anão. O estilo muda o desenho (as ruas, a praça, o piso e as paredes
   das casas, as árvores e os enfeites pintados no fundo), os prédios (tamanhos e formas: a casa longa nórdica, a casa
   redonda élfica, o salão de pedra anão) e os móveis de cada tipo de prédio. Nada sai escrito: os nomes ficam com o
   mestre. Aqui só há tabelas e desenho; quem sorteia é o gerador (Vila, Cidade).
   --------------------------------------------------------------- */
const Estilos = (() => {
  const LISTA = [['comum', 'Comum'], ['oriental', 'Oriental'], ['nordico', 'Nórdico'], ['desertico', 'Desértico'], ['elfico', 'Élfico'], ['anao', 'Anão']];
  // para o nome da cena ("Aldeia nórdica", "Vila anã"): os lugares são todos femininos
  const ADJ = { comum: '', oriental: 'oriental', nordico: 'nórdica', desertico: 'desértica', elfico: 'élfica', anao: 'anã' };
  const valido = e => (LISTA.some(x => x[0] === e) ? e : 'comum');

  /* ---- os prédios de cada estilo ----
     tam: as medidas possíveis (largura × altura, em quadrados); piso: o desenho do chão de dentro; forma: 'ret'
     (retângulo) ou 'oct' (cantos cortados: redonda, vista de cima); moveis: na ordem em que entram (os primeiros são
     os que mais importam); max: quantos móveis no máximo; janelas: quantas; centro: o móvel que vai no meio (a fogueira
     da casa longa). */
  const T = (tam, piso, moveis, max, janelas, extra) => Object.assign({ tam, piso, forma: 'ret', moveis, max, janelas }, extra || null);
  const TIPOS = {
    comum: {
      taverna: T([[6, 5], [5, 6], [7, 5]], 'madeira', ['mesa', 'barril', 'mesa', 'cadeira', 'cadeira', 'barril', 'lampiao'], 6, 2),
      capela: T([[5, 6], [6, 5]], 'pedra', ['altar', 'estatua', 'vela', 'vela'], 4, 2),
      ferraria: T([[5, 4], [4, 5]], 'pedra', ['braseiro', 'bigorna', 'caixote', 'barril'], 4, 1),
      armazem: T([[5, 4], [6, 4], [4, 5]], 'madeira', ['estante', 'caixote', 'barril', 'caixote', 'barril'], 4, 1),
      casa: T([[4, 3], [3, 4], [4, 4], [5, 4], [4, 5]], 'madeira', ['cama', 'mesa', 'barril', 'bau', 'cadeira'], 3, 1),
    },
    oriental: {
      taverna: T([[6, 5], [7, 5], [6, 6]], 'tatami', ['mesa', 'almofada', 'almofada', 'mesa', 'almofada', 'lanterna'], 6, 2),
      capela: T([[5, 5], [6, 5]], 'madeira', ['altar', 'lanterna', 'lanterna', 'estatua'], 4, 2, { torii: true }),
      ferraria: T([[5, 4], [4, 5]], 'pedra', ['braseiro', 'bigorna', 'caixote'], 3, 1),
      armazem: T([[5, 4], [6, 4]], 'madeira', ['caixote', 'jarro', 'barril', 'caixote'], 4, 1),
      casa: T([[4, 4], [5, 4], [4, 5]], 'tatami', ['cama', 'mesa', 'almofada', 'bau', 'lanterna'], 3, 1),
    },
    nordico: {
      taverna: T([[9, 5], [8, 5], [10, 5]], 'madeira', ['fogueira', 'mesa', 'mesa', 'barril', 'barril', 'cadeira'], 6, 2, { centro: 'fogueira' }),
      capela: T([[6, 5], [5, 6]], 'pedra', ['altar', 'braseiro', 'estatua'], 3, 1),
      ferraria: T([[5, 4], [4, 5]], 'pedra', ['braseiro', 'bigorna', 'barril'], 3, 1),
      armazem: T([[6, 4], [7, 4]], 'madeira', ['barril', 'caixote', 'barril', 'caixote'], 4, 0),
      casa: T([[7, 4], [8, 4], [6, 4], [4, 7]], 'madeira', ['fogueira', 'cama', 'mesa', 'bau', 'barril'], 4, 1, { centro: 'fogueira' }),
    },
    desertico: {
      taverna: T([[6, 6], [7, 5]], 'ladrilho', ['tapete', 'almofada', 'almofada', 'mesa', 'jarro', 'lampiao'], 6, 2),
      capela: T([[6, 6], [5, 5]], 'ladrilho', ['altar', 'tapete', 'vela', 'vela'], 4, 2),
      ferraria: T([[5, 4], [5, 5]], 'pedra', ['braseiro', 'bigorna', 'jarro'], 3, 1),
      armazem: T([[5, 5], [6, 4]], 'pedra', ['jarro', 'jarro', 'caixote', 'barril', 'jarro'], 5, 1),
      casa: T([[4, 4], [5, 4], [4, 5], [5, 5]], 'ladrilho', ['tapete', 'cama', 'jarro', 'almofada', 'bau'], 4, 1),
    },
    elfico: {
      taverna: T([[7, 7], [6, 6]], 'clara', ['mesa', 'cadeira', 'cadeira', 'mesa', 'flores', 'lanterna'], 6, 2, { forma: 'oct' }),
      capela: T([[6, 6], [7, 7]], 'pedra', ['altar', 'flores', 'flores', 'estatua'], 4, 2, { forma: 'oct' }),
      ferraria: T([[5, 5]], 'pedra', ['braseiro', 'bigorna'], 2, 1, { forma: 'oct' }),
      armazem: T([[5, 5], [6, 5]], 'clara', ['estante', 'caixote', 'jarro'], 3, 1),
      casa: T([[5, 5], [6, 6], [5, 4]], 'clara', ['cama', 'mesa', 'flores', 'bau'], 3, 1, { forma: 'oct' }),
    },
    anao: {
      taverna: T([[7, 6], [8, 6]], 'lajes', ['mesa', 'barril', 'mesa', 'barril', 'braseiro', 'cadeira'], 6, 1, { forma: 'oct' }),
      capela: T([[6, 6]], 'lajes', ['altar', 'estatua', 'estatua', 'braseiro'], 4, 0, { forma: 'oct' }),
      ferraria: T([[6, 5], [7, 5]], 'lajes', ['braseiro', 'bigorna', 'bigorna', 'caixote', 'barril'], 5, 1),
      armazem: T([[6, 4], [5, 5]], 'lajes', ['caixote', 'caixote', 'barril', 'estante'], 4, 0),
      casa: T([[5, 4], [4, 5], [5, 5]], 'lajes', ['cama', 'mesa', 'bau', 'braseiro'], 3, 1),
    },
  };
  const tipos = est => TIPOS[valido(est)];
  // a forma de uma casa: a casa redonda (cantos cortados) só a partir de 5 × 5; menor que isso fica retângulo
  const formaDe = (def, w, h) => (def.forma === 'oct' && w >= 5 && h >= 5 ? 'oct' : 'ret');

  /* ---- o resto do lugar em cada estilo ----
     rua: as cores da rua (ou null: as do terreno); praca: o desenho do chão da praça; parede: como as paredes das casas
     são pintadas; poste: o objeto que ilumina a praça e a rua; enfeites: os objetos que dá para mover, espalhados;
     arvore: que árvore cresce (por terreno); dens: quantas árvores (1 = o normal). */
  const ESTILO = {
    comum: { rua: null, praca: 'pedras', parede: { cor: '#3a2a1b', luz: '#6b4e31', larg: 0.18, tipo: 'madeira' }, poste: 'lampiao',
      enfeites: { campo: ['arbusto', 'pedra', 'toco', 'arbusto'], floresta: ['arbusto', 'pedra', 'toco', 'arbusto'], areia: ['pedra', 'pedra', 'caixote'], neve: ['pedra', 'toco', 'tronco'] },
      arvore: { campo: 'folhosa', floresta: 'folhosa', areia: 'palmeira', neve: 'pinheiro' }, dens: 1 },
    oriental: { rua: ['#6e6a62', '#8a857b', '#a29d92'], praca: 'cascalho', parede: { cor: '#2a1d16', luz: '#efe4cb', larg: 0.13, tipo: 'papel' }, poste: 'lanterna',
      enfeites: { campo: ['pedra', 'arbusto', 'flores'], floresta: ['pedra', 'arbusto', 'flores'], areia: ['pedra', 'jarro'], neve: ['pedra', 'toco'] },
      arvore: { campo: 'oriental', floresta: 'oriental', areia: 'palmeira', neve: 'pinheiro' }, dens: 1 },
    nordico: { rua: ['#4a3d2c', '#5e4d38', '#76634a'], praca: 'terra', parede: { cor: '#3b2716', luz: '#7a5634', larg: 0.26, tipo: 'troncos' }, poste: 'braseiro',
      enfeites: { campo: ['runa', 'toco', 'tronco', 'pedra'], floresta: ['runa', 'toco', 'tronco', 'pedra'], areia: ['runa', 'pedra'], neve: ['runa', 'toco', 'tronco', 'pedra'] },
      arvore: { campo: 'pinheiro', floresta: 'pinheiro', areia: 'pinheiro', neve: 'pinheiro' }, dens: 1.1 },
    desertico: { rua: ['#b8996a', '#c9ab7c', '#d9bf93'], praca: 'mosaico', parede: { cor: '#9c7448', luz: '#d8b98a', larg: 0.3, tipo: 'adobe' }, poste: 'lampiao',
      enfeites: { campo: ['jarro', 'pedra', 'caixote'], floresta: ['jarro', 'pedra', 'arbusto'], areia: ['jarro', 'pedra', 'caixote'], neve: ['jarro', 'pedra'] },
      arvore: { campo: 'palmeira', floresta: 'folhosa', areia: 'palmeira', neve: 'pinheiro' }, dens: 0.8 },
    elfico: { rua: ['#4d5a45', '#66755a', '#7d8c6e'], praca: 'grama', parede: { cor: '#4a3c22', luz: '#7f9a52', larg: 0.2, tipo: 'viva' }, poste: 'lanterna',
      enfeites: { campo: ['flores', 'cogumelos', 'flores', 'estatua'], floresta: ['flores', 'cogumelos', 'flores'], areia: ['flores', 'pedra'], neve: ['pedra', 'cogumelos'] },
      arvore: { campo: 'elfica', floresta: 'elfica', areia: 'palmeira', neve: 'pinheiro' }, dens: 1.25 },
    anao: { rua: ['#55565a', '#6b6c70', '#85868a'], praca: 'lajes', parede: { cor: '#3d4148', luz: '#7d828c', larg: 0.3, tipo: 'pedra' }, poste: 'braseiro',
      enfeites: { campo: ['pedra', 'caixote', 'barril', 'pedra'], floresta: ['pedra', 'caixote', 'toco'], areia: ['pedra', 'caixote'], neve: ['pedra', 'caixote', 'barril'] },
      arvore: { campo: 'rocha', floresta: 'pinheiro', areia: 'rocha', neve: 'rocha' }, dens: 0.55 },
  };
  const de = est => ESTILO[valido(est)];

  /* ---- a forma de uma casa ----
     lados: as paredes da casa, em quadrados. Os quatro lados retos (n, s, o, l), sempre do menor para o maior, e, na
     casa de cantos cortados, as quatro diagonais (lado null). A porta e as janelas ficam nos lados retos. */
  /* o tamanho do canto cortado: 1 (as casas de fora), 2 (a planta de dentro, no dobro) ou mais (lote 7, parte 4b: as
     moradias redondas da tribo cortam perto de um oitavo regular); nunca a ponto de sumir com o lado reto */
  const corteDe = k => clamp(Math.round(Number(k.corte)) || 1, 1, Math.max(1, Math.floor(Math.min(k.w, k.h) / 2) - 1));
  function lados(k) {
    if (k.forma === 'navio') return ladosDoCasco(k);
    const { x, y, w, h } = k, o = k.forma === 'oct' ? corteDe(k) : 0;     // (a planta de dentro, no dobro, corta 2)
    const L = [
      { lado: 'n', x1: x + o, y1: y, x2: x + w - o, y2: y },
      { lado: 's', x1: x + o, y1: y + h, x2: x + w - o, y2: y + h },
      { lado: 'o', x1: x, y1: y + o, x2: x, y2: y + h - o },
      { lado: 'l', x1: x + w, y1: y + o, x2: x + w, y2: y + h - o },
    ];
    if (o) L.push({ lado: null, x1: x, y1: y + o, x2: x + o, y2: y }, { lado: null, x1: x + w - o, y1: y, x2: x + w, y2: y + o },
      { lado: null, x1: x + w, y1: y + h - o, x2: x + w - o, y2: y + h }, { lado: null, x1: x + o, y1: y + h, x2: x, y2: y + h - o });
    return L;
  }
  /* (lote 7, parte 4b) O casco de um navio visto de cima, na caixa (x, y, w, h): a popa reta (com os cantos
     cortados) e a proa em ponta, do lado k.proa ('l', o padrão, ou 'o'). Os lados retos são os de cima, o de baixo e o
     da popa; as quinas e a ponta da proa ficam sem lado (sem porta nem janela). */
  const proaDe = k => Math.max(2, Math.min(Math.round(k.h * 0.9), Math.floor(k.w / 2)));
  function cascoNaCaixa(k) {
    const { x, y, w, h } = k, p = proaDe(k), esp = k.proa === 'o';
    const X = v => (esp ? 2 * x + w - v : v);                     // (a proa do lado de lá: o espelho)
    return { p, X, pts: [[x + 1, y], [x + w - p, y], [x + w, y + h / 2], [x + w - p, y + h], [x + 1, y + h], [x, y + h - 1], [x, y + 1]].map(([px, py]) => [X(px), py]) };
  }
  function ladosDoCasco(k) {
    const { x, y, w, h } = k, { p, X } = cascoNaCaixa(k), esp = k.proa === 'o';
    const seg = (lado, x1, y1, x2, y2) => { const a = X(x1), b = X(x2); return lado && a > b ? { lado, x1: b, y1, x2: a, y2 } : { lado, x1: a, y1, x2: b, y2 }; };
    return [
      seg('n', x + 1, y, x + w - p, y), seg('s', x + 1, y + h, x + w - p, y + h), seg(esp ? 'l' : 'o', x, y + 1, x, y + h - 1),
      seg(null, x, y + 1, x + 1, y), seg(null, x + w - p, y, x + w, y + h / 2), seg(null, x + w, y + h / 2, x + w - p, y + h), seg(null, x + 1, y + h, x, y + h - 1),
    ];
  }
  // o contorno da casa (para recortar o piso): os cantos, em quadrados
  function contorno(k) {
    const { x, y, w, h } = k;
    if (k.forma === 'navio') return cascoNaCaixa(k).pts;
    if (k.forma !== 'oct') return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const o = corteDe(k);
    return [[x + o, y], [x + w - o, y], [x + w, y + o], [x + w, y + h - o], [x + w - o, y + h], [x + o, y + h], [x, y + h - o], [x, y + o]];
  }
  /* Os pedaços de um lado reto: parede, porta e janelas, na ordem. aberturas: [{ k: 'door' | 'window', a, b }] com a e
     b ao longo do lado (x nos lados n e s; y nos lados o e l). */
  function pedacos(L, aberturas) {
    const horiz = L.lado === 'n' || L.lado === 's', a0 = horiz ? L.x1 : L.y1, b0 = horiz ? L.x2 : L.y2, out = [];
    let a = a0;
    for (const ab of aberturas.slice().sort((p, q) => p.a - q.a)) {
      if (ab.a > a) out.push({ k: 'wall', a, b: ab.a });
      out.push({ k: ab.k, a: ab.a, b: ab.b });
      a = Math.max(a, ab.b);
    }
    if (a < b0) out.push({ k: 'wall', a, b: b0 });
    return out.map(p => (horiz ? { k: p.k, x1: p.a, y1: L.y1, x2: p.b, y2: L.y1 } : { k: p.k, x1: L.x1, y1: p.a, x2: L.x1, y2: p.b }));
  }
  // todas as paredes de uma casa, já com a porta e as janelas: [{ k: 'wall' | 'door' | 'window', x1, y1, x2, y2 }]
  function paredesDaCasa(k) {
    const out = [];
    for (const L of lados(k)) {
      if (!L.lado) { out.push({ k: 'wall', x1: L.x1, y1: L.y1, x2: L.x2, y2: L.y2 }); continue; }
      const horiz = L.lado === 'n' || L.lado === 's', ab = [];
      const abre = (o, kk) => { if (o && o.lado === L.lado) ab.push({ k: kk, a: horiz ? Math.min(o.x1, o.x2) : Math.min(o.y1, o.y2), b: horiz ? Math.max(o.x1, o.x2) : Math.max(o.y1, o.y2) }); };
      abre(k.porta, 'door');
      for (const j of k.janelas || []) abre(j, 'window');
      out.push(...pedacos(L, ab));
    }
    return out;
  }

  /* ================= o desenho ================= */
  const TAU2 = Math.PI * 2;
  // as cores da rua: as do estilo, ou as do terreno
  const corDaRua = (est, pal) => de(est).rua || pal.rua;

  // o piso de dentro de uma casa (o recorte na forma dela é feito por quem chama)
  function piso(g, k, c, rnd, tipo) {
    const x = k.x * c, y = k.y * c, w = k.w * c, hh = k.h * c;
    if (tipo === 'pedra' || tipo === 'lajes') {
      const grande = tipo === 'lajes', n = grande ? 1 : 2;
      g.fillStyle = grande ? '#4b4d52' : '#5a564e'; g.fillRect(x, y, w, hh);
      for (let j = 0; j < k.h * n; j++) for (let i = 0; i < k.w * n; i++) {
        const s = (grande ? 88 : 92) + Math.floor(rnd() * 30), q = c / n;
        g.fillStyle = grande ? `rgb(${s},${s + 2},${s + 6})` : `rgb(${s + 6},${s + 3},${s - 4})`;
        g.fillRect(x + i * q + (grande ? 2 : 1.5), y + j * q + (grande ? 2 : 1.5), q - (grande ? 4 : 3), q - (grande ? 4 : 3));
        if (grande && rnd() < 0.25) { g.strokeStyle = 'rgba(30,30,34,0.5)'; g.lineWidth = Math.max(1, c * 0.02); g.beginPath(); g.moveTo(x + i * q + q * 0.2, y + j * q + q * 0.3); g.lineTo(x + i * q + q * 0.6, y + j * q + q * 0.7); g.stroke(); }
      }
    } else if (tipo === 'terra' || tipo === 'neve') {
      // (lote 7, parte 4b) a terra batida com a palha (as tendas, as iurtes) ou a neve socada (o iglu)
      const neve = tipo === 'neve';
      g.fillStyle = neve ? '#dfe8ee' : '#6b5638'; g.fillRect(x, y, w, hh);
      for (let i = 0, n = Math.round(k.w * k.h * 5); i < n; i++) {
        const px = x + rnd() * w, py = y + rnd() * hh, r = c * (0.08 + rnd() * 0.22);
        g.globalAlpha = 0.25 + rnd() * 0.25; g.fillStyle = neve ? (rnd() < 0.5 ? '#f4f8fb' : '#c9d6df') : (rnd() < 0.5 ? '#7a6444' : '#5a482e');
        g.beginPath(); g.ellipse(px, py, r, r * 0.7, rnd() * 3, 0, TAU2); g.fill();
      }
      if (!neve) { g.strokeStyle = '#c9a85a'; g.lineWidth = Math.max(1, c * 0.025); for (let i = 0, n = Math.round(k.w * k.h * 2.5); i < n; i++) { const px = x + rnd() * w, py = y + rnd() * hh, a = rnd() * 3, l = c * (0.12 + rnd() * 0.16); g.globalAlpha = 0.35 + rnd() * 0.3; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke(); } }
      g.globalAlpha = 1;
    } else if (tipo === 'esteira') {
      // a esteira de junco trançada (as cabanas e as palafitas)
      g.fillStyle = '#7a6238'; g.fillRect(x, y, w, hh);
      for (let j = 0; j < k.h * 2; j++) for (let i = 0; i < k.w * 2; i++) {
        const q = c / 2, deitada = (i + j) % 2 === 0, s2 = Math.floor(rnd() * 18);
        g.fillStyle = `rgb(${176 + s2},${148 + s2},${92 + s2})`; g.fillRect(x + i * q + 1, y + j * q + 1, q - 2, q - 2);
        g.strokeStyle = 'rgba(110,86,46,0.45)'; g.lineWidth = Math.max(1, c * 0.015);
        for (let t = 0.25; t < 1; t += 0.25) { g.beginPath(); if (deitada) { g.moveTo(x + i * q + 1, y + j * q + q * t); g.lineTo(x + (i + 1) * q - 1, y + j * q + q * t); } else { g.moveTo(x + i * q + q * t, y + j * q + 1); g.lineTo(x + i * q + q * t, y + (j + 1) * q - 1); } g.stroke(); }
      }
    } else if (tipo === 'tatami') {
      g.fillStyle = '#3d3424'; g.fillRect(x, y, w, hh);
      // esteiras de 2 × 1, deitadas e em pé, alternando
      for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i += 2) {
        const deitada = (i / 2 + j) % 2 === 0, mx = x + i * c, my = y + j * c, mw = Math.min(2, k.w - i) * c;
        g.fillStyle = (i + j) % 3 ? '#b9a66e' : '#c2b079'; g.fillRect(mx + 1.5, my + 1.5, mw - 3, c - 3);
        g.strokeStyle = 'rgba(90,75,40,0.35)'; g.lineWidth = Math.max(1, c * 0.015);
        for (let t = 0.2; t < 1; t += 0.2) { g.beginPath(); if (deitada) { g.moveTo(mx + 3, my + c * t); g.lineTo(mx + mw - 3, my + c * t); } else { g.moveTo(mx + mw * t, my + 3); g.lineTo(mx + mw * t, my + c - 3); } g.stroke(); }
      }
    } else if (tipo === 'ladrilho') {
      g.fillStyle = '#6e3a22'; g.fillRect(x, y, w, hh);
      for (let j = 0; j < k.h * 2; j++) for (let i = 0; i < k.w * 2; i++) {
        const q = c / 2, enfeite = (i + j) % 4 === 0 && (i * 3 + j) % 3 === 0;
        const s = Math.floor(rnd() * 22);
        g.fillStyle = enfeite ? `rgb(${52 + s},${130 + s},${128 + s})` : `rgb(${170 + s},${92 + s},${58 + s})`;
        g.fillRect(x + i * q + 1.2, y + j * q + 1.2, q - 2.4, q - 2.4);
      }
    } else {
      // madeira (escura) ou clara (élfica): tábuas de largura variada
      const clara = tipo === 'clara', cores = clara ? ['#d8c29c', '#cfb68e', '#e0cca6'] : ['#8d6740', '#83603b', '#97704a'];
      g.fillStyle = clara ? '#a8916a' : '#5e4128'; g.fillRect(x, y, w, hh);
      for (let j = 0; j < k.h * 3; j++) {
        let xx = x - rnd() * c;
        while (xx < x + w) {
          const l = c * (0.9 + rnd() * 1.4), s = rnd();
          g.fillStyle = s < 0.33 ? cores[0] : s < 0.66 ? cores[1] : cores[2];
          const a = Math.max(x, xx), b = Math.min(x + w, xx + l);
          if (b > a) g.fillRect(a + 1, y + j * c / 3 + 1, b - a - 2, c / 3 - 2);
          xx += l;
        }
      }
      if (clara) {           // os veios em curva da madeira élfica
        g.strokeStyle = 'rgba(120,150,80,0.25)'; g.lineWidth = Math.max(1, c * 0.025);
        for (let i = 0; i < k.w * k.h * 0.4; i++) { const px = x + rnd() * w, py = y + rnd() * hh; g.beginPath(); g.arc(px, py, c * (0.2 + rnd() * 0.3), rnd() * 3, rnd() * 3 + 2); g.stroke(); }
      }
    }
  }
  /* As paredes pintadas de uma casa: o traço grosso do estilo, com o vão da porta; a janela é um traço claro no meio
     da parede. As paredes de verdade (que barram a visão) são da cena; estas são só o desenho. */
  function paredesPintadas(g, k, c, rnd, est, material) {
    const P = material || de(est).parede, L = paredesDaCasa(k), lw = Math.max(2, P.larg * c);
    g.save(); g.lineCap = 'square'; g.lineJoin = 'miter';
    const traco = (s, cor, larg) => { g.strokeStyle = cor; g.lineWidth = larg; g.beginPath(); g.moveTo(s.x1 * c, s.y1 * c); g.lineTo(s.x2 * c, s.y2 * c); g.stroke(); };
    // a sombra que a parede faz no chão de fora
    g.globalAlpha = 0.35; for (const s of L) if (s.k !== 'door') { g.save(); g.translate(c * 0.07, c * 0.09); traco(s, '#000', lw); g.restore(); }
    g.globalAlpha = 1;
    for (const s of L) {
      if (s.k === 'door') continue;
      if (s.k === 'window') {
        traco(s, P.cor, lw);
        g.lineCap = 'butt'; traco(s, '#a9d4e6', Math.max(1.5, lw * 0.42)); g.lineCap = 'square';
        continue;
      }
      traco(s, P.cor, lw);
      if (P.tipo === 'papel') traco(s, P.luz, Math.max(1, lw * 0.35));
      else if (P.tipo === 'troncos' || P.tipo === 'pedra' || P.tipo === 'adobe' || P.tipo === 'couro' || P.tipo === 'feltro' || P.tipo === 'gelo') {
        // os troncos, as pedras, o reboco, as costuras do couro, a treliça do feltro ou os blocos de gelo: marquinhas ao longo da parede
        const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1), n = Math.max(1, Math.round(len * ({ troncos: 3, couro: 4, feltro: 3.5, gelo: 1.6 }[P.tipo] || 2.2)));
        g.strokeStyle = P.luz; g.lineWidth = Math.max(1, c * 0.025); g.globalAlpha = P.tipo === 'adobe' ? 0.35 : 0.55;
        for (let i = 1; i < n; i++) {
          const t = i / n, px = (s.x1 + (s.x2 - s.x1) * t) * c, py = (s.y1 + (s.y2 - s.y1) * t) * c, nx = -(s.y2 - s.y1) / len, ny = (s.x2 - s.x1) / len;
          g.beginPath(); g.moveTo(px - nx * lw * 0.45, py - ny * lw * 0.45); g.lineTo(px + nx * lw * 0.45, py + ny * lw * 0.45); g.stroke();
        }
        g.globalAlpha = 1;
      } else if (P.tipo === 'viva') {
        g.globalAlpha = 0.7; traco(s, P.luz, Math.max(1, lw * 0.3)); g.globalAlpha = 1;
        // folhinhas presas na madeira viva
        g.fillStyle = '#6f9a48';
        const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        for (let i = 0; i < len * 1.5; i++) { const t = rnd(), px = (s.x1 + (s.x2 - s.x1) * t) * c, py = (s.y1 + (s.y2 - s.y1) * t) * c; g.beginPath(); g.ellipse(px, py, c * 0.07, c * 0.04, rnd() * 3, 0, TAU2); g.fill(); }
      } else traco(s, P.luz, Math.max(1, lw * 0.25));
    }
    // a soleira da porta
    const pt = k.porta;
    if (pt) { g.globalAlpha = 0.85; traco(pt, '#2a1a0c', Math.max(1.5, lw * 0.5)); g.globalAlpha = 1; }
    g.restore();
  }
  /* As árvores pintadas no fundo, de cada tipo: folhosa, pinheiro, palmeira, oriental (cerejeira ou bambu), élfica (com
     luzinhas) e rocha (os anões: pedras grandes no lugar das árvores). */
  function arvore(g, a, c, rnd, especie, pal, neve) {
    const x = a.x * c, y = a.y * c, R = a.r * c;
    if (especie === 'oriental') especie = rnd() < 0.45 ? 'bambu' : 'cerejeira';
    g.globalAlpha = 0.28; g.fillStyle = '#000'; g.beginPath(); g.arc(x + R * 0.16, y + R * 0.2, especie === 'bambu' ? R * 0.8 : R, 0, TAU2); g.fill();
    if (especie === 'pinheiro') {
      const cores = ['#2f4a3c', '#3a5a49', '#456a56'];
      for (let camada = 0; camada < 3; camada++) {
        const rr = R * (1 - camada * 0.28);
        g.globalAlpha = 0.95; g.fillStyle = cores[camada];
        g.beginPath();
        for (let i = 0; i <= 16; i++) { const an = (i / 16) * TAU2 + camada * 0.2, d = i % 2 ? rr * 0.55 : rr; const px = x + Math.cos(an) * d, py = y + Math.sin(an) * d; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
        g.fill();
      }
      if (neve) { g.globalAlpha = 0.85; g.fillStyle = '#f4f8fb'; for (let i = 0; i < 6; i++) { const an = rnd() * TAU2, d = R * (0.3 + rnd() * 0.6); g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, R * 0.1, 0, TAU2); g.fill(); } }
    } else if (especie === 'palmeira') {
      g.globalAlpha = 0.95; g.strokeStyle = '#6f8c45'; g.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const an = (i / 7) * TAU2 + rnd() * 0.4;
        g.lineWidth = R * 0.32; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(an + 0.3) * R * 0.6, y + Math.sin(an + 0.3) * R * 0.6, x + Math.cos(an) * R, y + Math.sin(an) * R); g.stroke();
      }
      g.fillStyle = '#6b4a2b'; g.beginPath(); g.arc(x, y, R * 0.16, 0, TAU2); g.fill();
    } else if (especie === 'bambu') {
      // uma moita de bambu: hastes vistas de cima (anéis verdes) e folhas finas
      for (let i = 0; i < 9; i++) {
        const an = rnd() * TAU2, d = rnd() * R * 0.6, px = x + Math.cos(an) * d, py = y + Math.sin(an) * d;
        g.globalAlpha = 0.9; g.strokeStyle = '#7ea24a'; g.lineWidth = R * 0.07; g.beginPath(); g.arc(px, py, R * 0.09, 0, TAU2); g.stroke();
        g.strokeStyle = '#5b7d31'; g.lineWidth = R * 0.05;
        for (let f = 0; f < 3; f++) { const b = rnd() * TAU2; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(b) * R * 0.45, py + Math.sin(b) * R * 0.45); g.stroke(); }
      }
    } else if (especie === 'cerejeira') {
      const cores = ['#d77a9a', '#e79ab2', '#f2bfd0'];
      for (let i = 0; i < 9; i++) { const an = rnd() * TAU2, d = rnd() * R * 0.55; g.globalAlpha = 0.92; g.fillStyle = cores[i % 3]; g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, R * (0.4 + rnd() * 0.25), 0, TAU2); g.fill(); }
      g.globalAlpha = 0.8; g.fillStyle = '#fff3f7'; for (let i = 0; i < 8; i++) { const an = rnd() * TAU2, d = rnd() * R * 0.8; g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, R * 0.06, 0, TAU2); g.fill(); }
    } else if (especie === 'rocha') {
      g.globalAlpha = 1;
      const pts = [];
      for (let i = 0; i < 9; i++) { const an = (i / 9) * TAU2, d = R * (0.6 + rnd() * 0.35); pts.push([x + Math.cos(an) * d, y + Math.sin(an) * d * 0.85]); }
      g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath();
      const gr = g.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R * 1.1); gr.addColorStop(0, '#a3a7ae'); gr.addColorStop(0.6, '#757a83'); gr.addColorStop(1, '#4e535b');
      g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(25,25,30,0.7)'; g.lineWidth = Math.max(1, R * 0.08); g.stroke();
      g.strokeStyle = 'rgba(40,40,46,0.45)'; g.lineWidth = Math.max(1, R * 0.05); g.beginPath(); g.moveTo(x - R * 0.2, y - R * 0.3); g.lineTo(x + R * 0.1, y + R * 0.2); g.stroke();
    } else {
      // folhosa (e a élfica, maior, com luzinhas)
      const elfica = especie === 'elfica', cores = elfica ? ['#2f5a3a', '#3d7048', '#4f8a57'] : (pal && pal.copa) || ['#2c4629', '#355432', '#3f6239'];
      for (let i = 0; i < (elfica ? 12 : 9); i++) {
        const an = rnd() * TAU2, d = rnd() * R * 0.55;
        g.globalAlpha = 0.92; g.fillStyle = cores[i % 3];
        g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, R * (0.42 + rnd() * 0.25), 0, TAU2); g.fill();
      }
      g.globalAlpha = 0.5; g.fillStyle = elfica ? '#8fc47a' : (pal && pal.luz) || '#56794a'; g.beginPath(); g.arc(x - R * 0.2, y - R * 0.25, R * 0.3, 0, TAU2); g.fill();
      if (elfica) { g.globalAlpha = 0.95; for (let i = 0; i < 7; i++) { const an = rnd() * TAU2, d = rnd() * R * 0.75; g.fillStyle = i % 2 ? '#e9fbff' : '#b9f0d8'; g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, Math.max(1, R * 0.05), 0, TAU2); g.fill(); } }
    }
    g.globalAlpha = 1;
  }
  // o chão da praça (um círculo de raio R, já recortado por quem chama)
  function praca(g, pr, c, rnd, est) {
    const tipo = de(est).praca, x = pr.x * c, y = pr.y * c, R = pr.r * c;
    const bordas = { pedras: '#6f685c', cascalho: '#8b8577', terra: '#5b4a35', mosaico: '#8a5a36', grama: '#3f5a36', lajes: '#55575c' };
    g.fillStyle = bordas[tipo] || '#6f685c'; g.beginPath(); g.arc(x, y, R + c * 0.15, 0, TAU2); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, R, 0, TAU2); g.clip();
    const cada = f => { for (let j = Math.floor(pr.y - pr.r - 1); j <= pr.y + pr.r + 1; j++) for (let i = Math.floor(pr.x - pr.r - 1); i <= pr.x + pr.r + 1; i++) f(i, j); };
    if (tipo === 'cascalho') {
      g.fillStyle = '#c9c1ad'; g.fillRect(x - R, y - R, 2 * R, 2 * R);
      g.strokeStyle = 'rgba(120,110,90,0.55)'; g.lineWidth = Math.max(1, c * 0.03);
      for (let rr = c * 0.35; rr < R; rr += c * 0.28) { g.beginPath(); g.arc(x, y, rr, 0, TAU2); g.stroke(); }
      // as pedras de pisar
      for (let i = 0; i < 6; i++) { const an = (i / 6) * TAU2 + 0.3, d = R * 0.62; g.fillStyle = '#7d786c'; g.beginPath(); g.ellipse(x + Math.cos(an) * d, y + Math.sin(an) * d, c * 0.32, c * 0.24, an, 0, TAU2); g.fill(); }
    } else if (tipo === 'terra') {
      g.fillStyle = '#6a563d'; g.fillRect(x - R, y - R, 2 * R, 2 * R);
      for (let i = 0; i < pr.r * pr.r * 8; i++) { g.globalAlpha = 0.25; g.fillStyle = rnd() < 0.5 ? '#7d684b' : '#55432e'; g.beginPath(); g.arc(x + (rnd() - 0.5) * 2 * R, y + (rnd() - 0.5) * 2 * R, c * (0.1 + rnd() * 0.25), 0, TAU2); g.fill(); }
      g.globalAlpha = 1;
      // um anel de pedras grandes em volta
      for (let i = 0; i < 14; i++) { const an = (i / 14) * TAU2; g.fillStyle = '#6f7178'; g.beginPath(); g.arc(x + Math.cos(an) * (R - c * 0.3), y + Math.sin(an) * (R - c * 0.3), c * 0.2, 0, TAU2); g.fill(); }
    } else if (tipo === 'mosaico') {
      cada((i, j) => { for (const [ox, oy] of [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]]) { const s = Math.floor(rnd() * 20), d = Math.hypot(i + ox + 0.25 - pr.x, j + oy + 0.25 - pr.y); g.fillStyle = Math.floor(d * 2) % 3 === 0 ? `rgb(${50 + s},${128 + s},${126 + s})` : `rgb(${190 + s},${150 + s},${100 + s})`; g.fillRect((i + ox) * c + 1.2, (j + oy) * c + 1.2, c / 2 - 2.4, c / 2 - 2.4); } });
      // a estrela do meio
      g.fillStyle = '#2f7f86'; g.beginPath();
      for (let i = 0; i <= 16; i++) { const an = (i / 16) * TAU2, d = i % 2 ? R * 0.22 : R * 0.45; const px = x + Math.cos(an) * d, py = y + Math.sin(an) * d; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
      g.fill();
    } else if (tipo === 'grama') {
      g.fillStyle = '#4f7040'; g.fillRect(x - R, y - R, 2 * R, 2 * R);
      g.strokeStyle = '#6b8c50'; g.lineWidth = Math.max(1, c * 0.025);
      for (let i = 0; i < pr.r * pr.r * 30; i++) { const px = x + (rnd() - 0.5) * 2 * R, py = y + (rnd() - 0.5) * 2 * R; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (rnd() - 0.5) * c * 0.1, py - c * 0.12); g.stroke(); }
      // o anel de pedra e as flores em roda
      g.strokeStyle = '#9aa08f'; g.lineWidth = c * 0.22; g.beginPath(); g.arc(x, y, R * 0.55, 0, TAU2); g.stroke();
      for (let i = 0; i < 26; i++) { const an = rnd() * TAU2, d = R * (0.7 + rnd() * 0.25); g.fillStyle = ['#f2c94c', '#e85d75', '#ffffff', '#9b7bd8'][i % 4]; g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, c * 0.07, 0, TAU2); g.fill(); }
    } else if (tipo === 'lajes') {
      // lajes de seis lados, como num salão anão
      g.fillStyle = '#3c3e43'; g.fillRect(x - R, y - R, 2 * R, 2 * R);
      const r = c * 0.42, hx = r * Math.sqrt(3);
      for (let j = -2; j * r * 1.5 < 2 * R + r * 3; j++) for (let i = -2; i * hx < 2 * R + hx * 2; i++) {
        const cx = x - R + i * hx + (j % 2 ? hx / 2 : 0), cy = y - R + j * r * 1.5, s = 92 + Math.floor(rnd() * 28);
        g.fillStyle = `rgb(${s},${s + 2},${s + 6})`; g.beginPath();
        for (let k = 0; k < 6; k++) { const an = Math.PI / 6 + k * Math.PI / 3, px = cx + Math.cos(an) * (r - 1.5), py = cy + Math.sin(an) * (r - 1.5); if (k) g.lineTo(px, py); else g.moveTo(px, py); }
        g.closePath(); g.fill();
      }
    } else {
      cada((i, j) => { for (const [ox, oy] of [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]]) { const s = 104 + Math.floor(rnd() * 34); g.fillStyle = `rgb(${s + 6},${s + 2},${s - 8})`; g.fillRect((i + ox) * c + 1.5, (j + oy) * c + 1.5, c / 2 - 3, c / 2 - 3); } });
    }
    g.restore();
    g.strokeStyle = 'rgba(30,26,20,.55)'; g.lineWidth = Math.max(1.5, c * 0.06); g.beginPath(); g.arc(x, y, R, 0, TAU2); g.stroke();
  }
  /* Os enfeites pintados de cada estilo, em volta de uma casa: o portal torii na frente do santuário oriental, o toldo
     listrado na porta da casa desértica. (Os outros estilos não têm.) */
  function enfeiteDaCasa(g, k, c, rnd, est, def) {
    const pt = k.porta;
    if (!pt) return;
    const cx = (pt.x1 + pt.x2) / 2, cy = (pt.y1 + pt.y2) / 2, dx = pt.lado === 'o' ? -1 : pt.lado === 'l' ? 1 : 0, dy = pt.lado === 'n' ? -1 : pt.lado === 's' ? 1 : 0;
    if (valido(est) === 'oriental' && def && def.torii) {
      // o torii: duas colunas vermelhas e as duas vigas, um pouco à frente da porta
      const tx = (cx + dx * 1.6) * c, ty = (cy + dy * 1.6) * c, larg = 1.6 * c, horiz = dy !== 0;
      g.save(); g.translate(tx, ty); if (!horiz) g.rotate(Math.PI / 2);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-larg / 2 - c * 0.2 + c * 0.08, -c * 0.12 + c * 0.1, larg + c * 0.4, c * 0.26);
      g.fillStyle = '#b8342a'; g.fillRect(-larg / 2 - c * 0.25, -c * 0.12, larg + c * 0.5, c * 0.22);
      g.fillStyle = '#1d1715'; g.fillRect(-larg / 2 - c * 0.35, -c * 0.2, larg + c * 0.7, c * 0.1);
      g.fillStyle = '#8f2620'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * larg / 2, 0, c * 0.14, 0, TAU2); g.fill(); }
      g.restore();
    } else if (valido(est) === 'desertico') {
      // o toldo listrado sobre a porta, para o lado de fora
      const cores = [['#c8452f', '#f1e2c2'], ['#2f6f8c', '#f1e2c2'], ['#d9a23a', '#7a2f2a']][Math.floor(rnd() * 3)];
      const horiz = dy !== 0, L = 2.2 * c, P = 0.9 * c;
      const x0 = horiz ? cx * c - L / 2 : (dx > 0 ? cx * c : cx * c - P), y0 = horiz ? (dy > 0 ? cy * c : cy * c - P) : cy * c - L / 2, w = horiz ? L : P, hh = horiz ? P : L;
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0 + c * 0.08, y0 + c * 0.1, w, hh);
      const n = 7;
      for (let i = 0; i < n; i++) { g.fillStyle = cores[i % 2]; if (horiz) g.fillRect(x0 + (i * w) / n, y0, w / n + 0.5, hh); else g.fillRect(x0, y0 + (i * hh) / n, w, hh / n + 0.5); }
      g.strokeStyle = 'rgba(60,30,20,0.6)'; g.lineWidth = Math.max(1, c * 0.03); g.strokeRect(x0, y0, w, hh);
    }
  }
  /* ================= os telhados (a cidade vista de cima) ================= */
  // o tom de uma cor (#rrggbb) mais claro (f > 0) ou mais escuro (f < 0)
  function tom(hex, f) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    const m = v => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f));
    return `rgb(${m(r)},${m(gg)},${m(b)})`;
  }
  const TELHAS = {
    comum: [['#9c4a32', '#b05a3c', '#8a3f2b', '#a3533a'], ['#56606e', '#646f7e'], ['#a88a52', '#b8995e']],
    oriental: [['#3a4555', '#46536a', '#2f3846']],
    nordico: [['#5f7a3c', '#6b8744', '#566f36']],
    desertico: [['#d6b98c', '#dcc196', '#cfae7e']],
    elfico: [['#5d8a55', '#6f9e62', '#86b27a']],
    anao: [['#4a4f58', '#555b65', '#42474f']],
  };
  /* O telhado de um prédio (k: x, y, w, h, forma; em quadrados), visto de cima, com a sombra no chão. A luz vem do alto,
     à esquerda: a água de cima (ou da esquerda) fica mais clara. h2: um número sorteado para o prédio (a cor, a chaminé). */
  function telhado(g, k, c, rnd, est, h2) {
    est = valido(est);
    const x = k.x * c, y = k.y * c, w = k.w * c, hh = k.h * c, oct = k.forma === 'oct';
    const cont = contorno(k).map(([px, py]) => [px * c, py * c]);
    const caminho = (pts, d) => { g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px + (d || 0), py + (d || 0)) : g.moveTo(px + (d || 0), py + (d || 0)))); g.closePath(); };
    // a sombra no chão (o prédio tem altura)
    g.save(); g.fillStyle = 'rgba(0,0,0,0.38)'; caminho(cont.map(([px, py]) => [px + c * 0.28, py + c * 0.34])); g.fill(); g.restore();
    const grupos = TELHAS[est], grupo = grupos[est === 'comum' ? (h2 % 10 < 7 ? 0 : h2 % 10 < 9 ? 1 : 2) : 0], base = grupo[h2 % grupo.length];
    const deitada = k.w >= k.h;                                  // a cumeeira vai no sentido mais comprido
    g.save(); caminho(cont); g.clip();
    if (est === 'desertico') {
      // terraço: o chão de barro, a mureta em volta, um alçapão e, às vezes, um tapete e jarros
      g.fillStyle = base; g.fillRect(x, y, w, hh);
      for (let i = 0; i < k.w * k.h * 2; i++) { g.globalAlpha = 0.12; g.fillStyle = rnd() < 0.5 ? '#fff4dc' : '#9c7a4c'; g.beginPath(); g.arc(x + rnd() * w, y + rnd() * hh, c * (0.1 + rnd() * 0.3), 0, TAU2); g.fill(); }
      g.globalAlpha = 1;
      g.strokeStyle = tom(base, -0.25); g.lineWidth = c * 0.32; caminho(cont); g.stroke();
      if (k.tipo === 'templo' || k.tipo === 'senhor') {
        const R = Math.min(w, hh) * 0.32, cx = x + w / 2, cy = y + hh / 2, gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
        gr.addColorStop(0, '#fbfbf6'); gr.addColorStop(0.7, '#d9dfe6'); gr.addColorStop(1, '#9aa8b6');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU2); g.fill();
        g.fillStyle = '#3f78a8'; g.beginPath(); g.arc(cx, cy, R * 0.18, 0, TAU2); g.fill();
      } else {
        g.fillStyle = 'rgba(60,40,20,0.75)'; g.fillRect(x + w * 0.2, y + hh * 0.25, c * 0.6, c * 0.6);
        if (h2 % 3 === 0) { g.fillStyle = ['#8e2f3c', '#2f5f6e', '#a0742a'][h2 % 3]; g.fillRect(x + w * 0.5, y + hh * 0.45, Math.min(w * 0.35, c * 1.6), Math.min(hh * 0.3, c)); }
        g.fillStyle = '#b5643a'; for (let i = 0; i < 2; i++) { g.beginPath(); g.arc(x + w - c * (0.6 + i * 0.6), y + c * 0.6, c * 0.22, 0, TAU2); g.fill(); }
      }
    } else if (est === 'elfico') {
      // escamas de folha, em fileiras que se sobrepõem, e um brilho prateado
      g.fillStyle = tom(base, -0.2); g.fillRect(x, y, w, hh);
      const passo = c * 0.42;
      for (let yy = y - passo, linha = 0; yy < y + hh + passo; yy += passo * 0.62, linha++) for (let xx = x - passo + (linha % 2) * passo / 2; xx < x + w + passo; xx += passo) {
        g.fillStyle = grupo[(Math.floor(xx / passo) + linha + h2) % grupo.length]; g.beginPath(); g.arc(xx, yy, passo * 0.62, 0, Math.PI); g.fill();
        g.strokeStyle = 'rgba(220,240,225,0.25)'; g.lineWidth = Math.max(1, c * 0.02); g.beginPath(); g.arc(xx, yy, passo * 0.62, 0.2, Math.PI - 0.2); g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(x + w * 0.35, y + hh * 0.3, w * 0.3, hh * 0.22, -0.4, 0, TAU2); g.fill();
    } else if (est === 'anao' && oct) {
      // salão de pedra de cantos cortados: as águas em roda, a partir do meio, e a cumeeira de bronze
      const cx = x + w / 2, cy = y + hh / 2;
      for (let i = 0; i < cont.length; i++) {
        const a = cont[i], b = cont[(i + 1) % cont.length], luz = 0.18 - 0.34 * ((i + 6) % cont.length) / cont.length;
        g.fillStyle = tom(base, luz); g.beginPath(); g.moveTo(cx, cy); g.lineTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.closePath(); g.fill();
      }
      g.strokeStyle = '#9a7a44'; g.lineWidth = Math.max(1.5, c * 0.12);
      for (const [px, py] of cont) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(px, py); g.stroke(); }
      g.fillStyle = '#b58f4f'; g.beginPath(); g.arc(cx, cy, c * 0.4, 0, TAU2); g.fill();
    } else {
      // de duas águas (comum, nórdico, anão) ou de quatro (oriental): a cumeeira no meio, uma água clara e a outra escura
      const meio = deitada ? y + hh / 2 : x + w / 2;
      const quatro = est === 'oriental', recuo = quatro ? Math.min(w, hh) * 0.5 : 0;
      // as águas compridas
      g.fillStyle = tom(base, 0.12);
      if (deitada) g.fillRect(x, y, w, hh / 2); else g.fillRect(x, y, w / 2, hh);
      g.fillStyle = tom(base, -0.18);
      if (deitada) g.fillRect(x, meio, w, hh / 2); else g.fillRect(meio, y, w / 2, hh);
      if (quatro) {
        // as pontas (as águas curtas), em triângulo
        g.fillStyle = tom(base, 0.02);
        g.beginPath();
        if (deitada) { g.moveTo(x, y); g.lineTo(x + recuo, meio); g.lineTo(x, y + hh); g.moveTo(x + w, y); g.lineTo(x + w - recuo, meio); g.lineTo(x + w, y + hh); }
        else { g.moveTo(x, y); g.lineTo(meio, y + recuo); g.lineTo(x + w, y); g.moveTo(x, y + hh); g.lineTo(meio, y + hh - recuo); g.lineTo(x + w, y + hh); }
        g.fill();
      }
      // as telhas: fileiras paralelas à cumeeira (o sapê do nórdico vira tufos de grama)
      if (est === 'nordico') {
        for (let i = 0; i < k.w * k.h * 3; i++) { g.globalAlpha = 0.35; g.fillStyle = rnd() < 0.5 ? '#7d9a4c' : '#4a5f2d'; g.beginPath(); g.arc(x + rnd() * w, y + rnd() * hh, c * (0.12 + rnd() * 0.2), 0, TAU2); g.fill(); }
        g.globalAlpha = 1;
      } else {
        g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = Math.max(1, c * 0.025);
        const passo = c * (est === 'anao' ? 0.34 : 0.26);
        if (deitada) for (let yy = y + passo; yy < y + hh; yy += passo) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
        else for (let xx = x + passo; xx < x + w; xx += passo) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + hh); g.stroke(); }
        if (est === 'comum' || est === 'oriental') {
          // as juntas das telhas, desencontradas
          g.strokeStyle = 'rgba(0,0,0,0.13)';
          if (deitada) for (let yy = y, l = 0; yy < y + hh; yy += passo, l++) for (let xx = x + (l % 2) * passo / 2; xx < x + w; xx += passo) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + passo); g.stroke(); }
          else for (let xx = x, l = 0; xx < x + w; xx += passo, l++) for (let yy = y + (l % 2) * passo / 2; yy < y + hh; yy += passo) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + passo, yy); g.stroke(); }
        }
      }
      // a cumeeira
      g.strokeStyle = est === 'anao' ? '#9a7a44' : est === 'nordico' ? '#3b2a1a' : tom(base, -0.45); g.lineWidth = Math.max(1.5, c * (est === 'anao' ? 0.14 : 0.1));
      g.beginPath();
      if (deitada) { g.moveTo(x + recuo, meio); g.lineTo(x + w - recuo, meio); } else { g.moveTo(meio, y + recuo); g.lineTo(meio, y + hh - recuo); }
      g.stroke();
      if (quatro) {
        // as quinas, das pontas da cumeeira até os cantos
        g.beginPath();
        if (deitada) { g.moveTo(x, y); g.lineTo(x + recuo, meio); g.lineTo(x, y + hh); g.moveTo(x + w, y); g.lineTo(x + w - recuo, meio); g.lineTo(x + w, y + hh); }
        else { g.moveTo(x, y); g.lineTo(meio, y + recuo); g.lineTo(x + w, y); g.moveTo(x, y + hh); g.lineTo(meio, y + hh - recuo); g.lineTo(x + w, y + hh); }
        g.lineWidth = Math.max(1, c * 0.06); g.stroke();
      }
      if (est === 'nordico') {
        // as tábuas cruzadas nas pontas da cumeeira
        g.strokeStyle = '#4a3220'; g.lineWidth = Math.max(1.5, c * 0.09);
        const xis = (px, py) => { g.beginPath(); g.moveTo(px - c * 0.3, py - c * 0.3); g.lineTo(px + c * 0.3, py + c * 0.3); g.moveTo(px + c * 0.3, py - c * 0.3); g.lineTo(px - c * 0.3, py + c * 0.3); g.stroke(); };
        if (deitada) { xis(x + c * 0.3, meio); xis(x + w - c * 0.3, meio); } else { xis(meio, y + c * 0.3); xis(meio, y + hh - c * 0.3); }
      }
      // a chaminé (não no templo nem no oriental)
      if (!quatro && k.tipo !== 'templo' && h2 % 4 !== 3) {
        const cx = deitada ? x + w * (0.25 + (h2 % 5) * 0.12) : meio + (h2 % 2 ? c * 0.3 : -c * 0.8), cy = deitada ? meio + (h2 % 2 ? c * 0.25 : -c * 0.85) : y + hh * (0.25 + (h2 % 5) * 0.12);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(cx + c * 0.12, cy + c * 0.14, c * 0.55, c * 0.55);
        g.fillStyle = est === 'anao' ? '#6b6f78' : '#6e4a36'; g.fillRect(cx, cy, c * 0.55, c * 0.55);
        g.fillStyle = '#2a2018'; g.fillRect(cx + c * 0.12, cy + c * 0.12, c * 0.31, c * 0.31);
      }
    }
    g.restore();
    // o beiral: o contorno escuro (o oriental, com as pontas viradas para cima)
    g.strokeStyle = 'rgba(20,14,10,0.8)'; g.lineWidth = Math.max(1.5, c * 0.07); caminho(cont); g.stroke();
    if (est === 'oriental' && !oct) {
      g.strokeStyle = '#20262f'; g.lineWidth = Math.max(1.5, c * 0.08);
      for (const [px, py, sx, sy] of [[x, y, -1, -1], [x + w, y, 1, -1], [x + w, y + hh, 1, 1], [x, y + hh, -1, 1]]) { g.beginPath(); g.moveTo(px - sx * c * 0.3, py); g.quadraticCurveTo(px + sx * c * 0.1, py + sy * c * 0.05, px + sx * c * 0.22, py + sy * c * 0.28); g.stroke(); }
      if (k.tipo === 'templo') {
        // o pagode: mais dois telhados, um dentro do outro
        for (const f of [0.66, 0.36]) {
          const kw = Math.max(1, k.w * f), kh = Math.max(1, k.h * f), k2 = { x: k.x + (k.w - kw) / 2, y: k.y + (k.h - kh) / 2, w: kw, h: kh, forma: 'ret', tipo: 'pagode' };
          telhado(g, k2, c, rnd, est, h2 + 1);
        }
      }
    }
  }

  // um quintal (em quadrados): a horta (os canteiros com as fileiras), o terreiro (a lenha empilhada e o feno) ou o jardim
  function quintal(g, q, c, rnd) {
    const x = q.x * c, y = q.y * c, w = q.w * c, hh = q.h * c;
    g.save();
    if (q.k === 'horta') {
      g.fillStyle = '#6b4a2b'; g.fillRect(x + c * 0.1, y + c * 0.1, w - c * 0.2, hh - c * 0.2);
      const deitada = q.w >= q.h, n = Math.max(2, Math.round((deitada ? q.h : q.w) * 2.2));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        g.strokeStyle = '#4e3520'; g.lineWidth = Math.max(1, c * 0.12); g.beginPath();
        if (deitada) { g.moveTo(x + c * 0.2, y + hh * t); g.lineTo(x + w - c * 0.2, y + hh * t); } else { g.moveTo(x + w * t, y + c * 0.2); g.lineTo(x + w * t, y + hh - c * 0.2); }
        g.stroke();
        g.fillStyle = ['#5f9a3a', '#7ab04a', '#4f8a32'][k % 3];
        for (let u = 0.3; u < (deitada ? q.w : q.h) - 0.2; u += 0.35) { const px = deitada ? x + u * c : x + w * t, py = deitada ? y + hh * t : y + u * c; g.beginPath(); g.arc(px + (rnd() - 0.5) * c * 0.06, py, c * (0.09 + rnd() * 0.05), 0, TAU2); g.fill(); }
      }
      g.strokeStyle = 'rgba(160,125,80,0.8)'; g.lineWidth = Math.max(1, c * 0.05); g.strokeRect(x + c * 0.1, y + c * 0.1, w - c * 0.2, hh - c * 0.2);
    } else if (q.k === 'terreiro') {
      g.fillStyle = 'rgba(138,115,80,0.75)'; g.fillRect(x + c * 0.1, y + c * 0.1, w - c * 0.2, hh - c * 0.2);
      // a lenha empilhada (os tocos vistos de ponta) e o fardo de feno
      const lx = x + c * 0.35, ly = y + c * 0.35;
      for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) { g.fillStyle = '#7a5532'; g.beginPath(); g.arc(lx + a * c * 0.24, ly + b * c * 0.22, c * 0.11, 0, TAU2); g.fill(); g.fillStyle = '#c9a26b'; g.beginPath(); g.arc(lx + a * c * 0.24, ly + b * c * 0.22, c * 0.06, 0, TAU2); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + w - c * 1.05, y + hh - c * 0.8, c * 0.8, c * 0.55);
      g.fillStyle = '#d9b44f'; g.fillRect(x + w - c * 1.15, y + hh - c * 0.9, c * 0.8, c * 0.55);
      g.strokeStyle = '#a3802f'; g.lineWidth = Math.max(1, c * 0.04);
      for (const t of [0.3, 0.7]) { g.beginPath(); g.moveTo(x + w - c * 1.15 + c * 0.8 * t, y + hh - c * 0.9); g.lineTo(x + w - c * 1.15 + c * 0.8 * t, y + hh - c * 0.35); g.stroke(); }
    } else {
      g.fillStyle = '#5f8f4a'; g.fillRect(x + c * 0.1, y + c * 0.1, w - c * 0.2, hh - c * 0.2);
      for (let i = 0; i < q.w * q.h * 5; i++) { g.fillStyle = ['#f2c94c', '#e85d75', '#ffffff', '#9b7bd8', '#ff9a5a'][i % 5]; g.beginPath(); g.arc(x + c * 0.2 + rnd() * (w - c * 0.4), y + c * 0.2 + rnd() * (hh - c * 0.4), c * 0.07, 0, TAU2); g.fill(); }
      g.fillStyle = '#3f6d34'; g.beginPath(); g.arc(x + w / 2, y + hh / 2, c * 0.4, 0, TAU2); g.fill();
    }
    g.restore();
  }

  /* ================= o relevo e as formas (lote 7) =================
     O relevo: áreas de terreno com altura (os tipos do Terreno da cena: morro, montanha, plataforma, fosso, água,
     mata), em quadrados do plano — { t, alt, k: 'rect' | 'ell' | 'poly' | 'free', x, y, w, h | pts: [[x, y]…], sw }.
     A altura (alt) vai em metros (a unidade da cena); negativa é fundura. As formas: desenhos de enfeite, travados
     (arte de fundo: o clique passa direto), em quadrados — { k: 'free' | 'poly' | 'ell' | 'rect', pts | x, y, w, h, s,
     f, sw, a }. Quem gera (Vila, Cidade, Interior) faz as listas; aqui elas viram desenhos da cena e a prévia. */
  const ptsNaCena = (pts, c, dx, dy) => { const o = []; for (const [x, y] of pts) o.push(Math.round((x + dx) * c * 10) / 10, Math.round((y + dy) * c * 10) / 10); return o; };
  function terrenoNaCena(r, c, dx, dy) {
    const geo = r.k === 'rect' || r.k === 'ell' ? { k: r.k, x: (r.x + dx) * c, y: (r.y + dy) * c, w: r.w * c, h: r.h * c } : { k: r.k, pts: ptsNaCena(r.pts, c, dx, dy), sw: r.k === 'free' ? Math.max(4, (r.sw || 1) * c) : 0 };
    return Combate.newTerrain(geo, r.t, r.alt);
  }
  function formaNaCena(f, c, dx, dy) {
    const s = { id: uid('sh'), k: f.k, s: f.s || '#000000', sw: Math.round((f.sw || 0) * c * 10) / 10, f: f.f || null, a: f.a == null ? 1 : f.a, top: false, gm: false, lock: true, by: null };
    if (f.k === 'rect' || f.k === 'ell') Object.assign(s, { x: (f.x + dx) * c, y: (f.y + dy) * c, w: f.w * c, h: f.h * c });
    else s.pts = ptsNaCena(f.pts, c, dx, dy);
    return s;
  }
  // um retângulo girado (cx, cy: o meio; L: o comprimento, no ângulo ang; Wd: a largura), em quadrados
  const retangulo = (cx, cy, L, Wd, ang) => { const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux; return [[cx - ux * L / 2 - vx * Wd / 2, cy - uy * L / 2 - vy * Wd / 2], [cx + ux * L / 2 - vx * Wd / 2, cy + uy * L / 2 - vy * Wd / 2], [cx + ux * L / 2 + vx * Wd / 2, cy + uy * L / 2 + vy * Wd / 2], [cx - ux * L / 2 + vx * Wd / 2, cy - uy * L / 2 + vy * Wd / 2]]; };
  // a caixa (em quadrados) de uma área ou forma, para saber se ela cai num recorte
  function caixaDe(r) {
    if (r.k === 'rect' || r.k === 'ell') return [r.x, r.y, r.x + r.w, r.y + r.h];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of r.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const m = (r.sw || 0) / 2;
    return [x0 - m, y0 - m, x1 + m, y1 + m];
  }
  // desloca (dx, dy) e escala (k) uma área ou forma do plano
  function moverRelevo(r, dx, dy, k) {
    k = k || 1;
    const o = Object.assign({}, r);
    if (r.k === 'rect' || r.k === 'ell') Object.assign(o, { x: (r.x + dx) * k, y: (r.y + dy) * k, w: r.w * k, h: r.h * k });
    else o.pts = r.pts.map(([x, y]) => [(x + dx) * k, (y + dy) * k]);
    if (r.sw) o.sw = r.sw * k;
    return o;
  }
  // as cores das bandeirinhas de cada estilo
  const BANDEIRAS = { comum: ['#c8452f', '#e9c24a', '#2f6f8c', '#5b8c3a', '#f1e2c2'], oriental: ['#b3262b', '#f4efe3', '#d9a23a'], nordico: ['#a8302a', '#f1e2c2', '#2f5a8c'],
    desertico: ['#e0902a', '#2a8c8c', '#a8302a', '#f1e2c2'], elfico: ['#5b8c3a', '#c8d6c0', '#9572b8', '#e9c24a'], anao: ['#d9a23a', '#8e2f3c', '#6b7380'] };
  /* As bandeirinhas: um cordão de a até b (caindo um pouco no meio) e os triângulos pendurados nele, de quadrado em
     quadrado e pouco; as cores do estilo, alternadas. Devolve as formas (o cordão primeiro), todas com o mesmo grupo
     (g): num recorte, o cordão entra inteiro ou não entra. */
  function bandeirinhas(a, b, est, grupo) {
    const cores = BANDEIRAS[valido(est)], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 2) return [];
    const queda = Math.min(0.6, L * 0.06), meio = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + queda];
    const ponto = t => { const u = 1 - t; return [u * u * a[0] + 2 * u * t * meio[0] + t * t * b[0], u * u * a[1] + 2 * u * t * meio[1] + t * t * b[1]]; };
    const out = [{ k: 'free', pts: [a, ponto(0.25), ponto(0.5), ponto(0.75), b], s: '#3b2a1a', sw: 0.04, a: 0.9, g: grupo || 'b' }];
    const n = Math.max(2, Math.floor(L / 0.55));
    for (let i = 1; i < n; i++) {
      const t = i / n, p = ponto(t), q = ponto(Math.min(1, t + 0.01)), d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, ux = (q[0] - p[0]) / d, uy = (q[1] - p[1]) / d;
      out.push({ k: 'poly', pts: [[p[0] - ux * 0.17, p[1] - uy * 0.17], [p[0] + ux * 0.17, p[1] + uy * 0.17], [p[0], p[1] + 0.34]], f: cores[i % cores.length], s: 'rgba(40,24,10,0.6)', sw: 0.015, a: 0.95, g: grupo || 'b' });
    }
    return out;
  }
  /* O relevo e as formas na prévia (pc pixels por quadrado), com o desenho de verdade do Terreno (o mesmo da cena:
     a cor, o desenho de cada tipo e a sombra de quem é alto, translúcido por cima do fundo). */
  function relevoNaPrevia(g, relevo, formas, pc, unidade) {
    if (typeof Render === 'undefined' || !Render.drawTer || !Render.drawShape) return;
    const k = pc / 64, sc = { cell: 64, grid: { unit: unidade || 1.5 } };
    // (lote 14, parte 14c: o deslocamento da tela vale — o lugar dentro dos arredores)
    const T = g.getTransform ? g.getTransform() : null, ox = T ? T.e : 0, oy = T ? T.f : 0;
    if (relevo && relevo.length) {
      const cv = document.createElement('canvas'); cv.width = g.canvas.width; cv.height = g.canvas.height;
      const t = cv.getContext('2d'); t.setTransform(k, 0, 0, k, ox, oy);
      for (const r of relevo) { try { const sh = terrenoNaCena(r, 64, 0, 0); if (r.a != null) sh.a = r.a; Render.drawTer(t, sh, sc, 1 / k); } catch (e) { /* (um tipo que a página não conhece) */ } }
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.62; g.drawImage(cv, 0, 0); g.restore();
    }
    if (formas && formas.length) { g.save(); g.setTransform(k, 0, 0, k, ox, oy); for (const f of formas) Render.drawShape(g, formaNaCena(f, 64, 0, 0)); g.restore(); }
  }
  return { LISTA, ADJ, valido, TIPOS, tipos, formaDe, ESTILO, de, lados, contorno, proaDe, pedacos, paredesDaCasa, corDaRua, piso, paredesPintadas, arvore, praca, enfeiteDaCasa, telhado, tom,
    quintal, terrenoNaCena, formaNaCena, caixaDe, moverRelevo, retangulo, bandeirinhas, relevoNaPrevia };
})();
