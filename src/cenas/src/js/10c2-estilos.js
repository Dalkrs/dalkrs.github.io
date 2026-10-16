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
  function lados(k) {
    const { x, y, w, h } = k, o = k.forma === 'oct' ? 1 : 0;
    const L = [
      { lado: 'n', x1: x + o, y1: y, x2: x + w - o, y2: y },
      { lado: 's', x1: x + o, y1: y + h, x2: x + w - o, y2: y + h },
      { lado: 'o', x1: x, y1: y + o, x2: x, y2: y + h - o },
      { lado: 'l', x1: x + w, y1: y + o, x2: x + w, y2: y + h - o },
    ];
    if (o) L.push({ lado: null, x1: x, y1: y + 1, x2: x + 1, y2: y }, { lado: null, x1: x + w - 1, y1: y, x2: x + w, y2: y + 1 },
      { lado: null, x1: x + w, y1: y + h - 1, x2: x + w - 1, y2: y + h }, { lado: null, x1: x + 1, y1: y + h, x2: x, y2: y + h - 1 });
    return L;
  }
  // o contorno da casa (para recortar o piso): os cantos, em quadrados
  function contorno(k) {
    const { x, y, w, h } = k;
    if (k.forma !== 'oct') return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    return [[x + 1, y], [x + w - 1, y], [x + w, y + 1], [x + w, y + h - 1], [x + w - 1, y + h], [x + 1, y + h], [x, y + h - 1], [x, y + 1]];
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
  function paredesPintadas(g, k, c, rnd, est) {
    const P = de(est).parede, L = paredesDaCasa(k), lw = Math.max(2, P.larg * c);
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
      else if (P.tipo === 'troncos' || P.tipo === 'pedra' || P.tipo === 'adobe') {
        // os troncos, as pedras ou o reboco: marquinhas ao longo da parede
        const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1), n = Math.max(1, Math.round(len * (P.tipo === 'troncos' ? 3 : 2.2)));
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
  return { LISTA, ADJ, valido, TIPOS, tipos, formaDe, ESTILO, de, lados, contorno, pedacos, paredesDaCasa, corDaRua, piso, paredesPintadas, arvore, praca, enfeiteDaCasa };
})();
