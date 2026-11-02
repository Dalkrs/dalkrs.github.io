/* Tiny Cats · a Sede do clã (lote 30): a conta pura (sem página, sem DOM). Roda igual no navegador (window.TC.sede, na
   aba Clã e nas Cenas) e no Node (testes).
   O documento da mesa: cla:sede:<id> — a sede de um clã (o terreno, os prédios e o que fica em volta). Quem mestra o
   Clã grava; a mesa lê quando os jogadores veem a sede (o clã dos jogadores, ou um de NPC que o mestre mostrou).
   Medidas em quadrados (os das Cenas: 1,5 m). Um prédio fica no terreno em (x, y) — o canto de cima, à esquerda — e a
   planta dele vai de 0 a W e de 0 a H, com um ou mais andares; cada andar: os cômodos (retângulos que não se cobrem),
   as aberturas (portas e janelas, em trechos das linhas da grade), os móveis (objetos das Cenas) e as escadas (que
   levam a outro andar). As paredes saem dos cômodos: entre um cômodo e o lado de fora, a parede de fora; entre dois
   cômodos, a de dentro. A porta de entrada do prédio é uma abertura na parede de fora (a "porta" da planta).
   As plantas prontas (Salão, Quartel, Forja, Templo, Estábulo e Torre, nos níveis 1, 2 e 3) saem de uma semente: a
   mesma semente dá a mesma planta. */
(() => {
  'use strict';
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, p) => { const n = Number(v); return Number.isFinite(n) ? n : p; };
  const int = (v, p, a, b) => clamp(Math.round(num(v, p)), a, b);
  const texto = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 60);
  const idOk = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : null);
  function mulberry(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  let seq = 0;
  const novoId = pre => { seq = (seq + 1) % 1296; return pre + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5) + seq.toString(36); };
  const novaSemente = () => 1 + Math.floor(Math.random() * 2147483000);

  /* ---------------- os catálogos ---------------- */
  const PRE = 'cla:sede:';
  const LIM = { W: [16, 120], H: [12, 90], predios: 40, estruturas: 160, salas: 24, aberturas: 120, moveis: 240, escadas: 8, pts: 80, nome: 60 };
  const ANDARES = [['p', 'Porão'], ['t', 'Térreo'], ['1', '1º andar'], ['2', '2º andar'], ['3', '3º andar']];
  const ANDAR_NOME = Object.fromEntries(ANDARES);
  const ORDEM_ANDAR = Object.fromEntries(ANDARES.map(([k], i) => [k, i]));
  // os pisos (os mesmos das Cenas: Estilos.piso), com a cor da planta
  const PISOS = [['madeira', 'Madeira', '#8d6740'], ['clara', 'Madeira clara', '#cfb68e'], ['pedra', 'Pedra', '#7b766c'], ['lajes', 'Lajes', '#5d6068'], ['terra', 'Terra batida', '#6b5638'], ['ladrilho', 'Ladrilho', '#a85c3a']];
  const PISO = Object.fromEntries(PISOS.map(([k, n, cor]) => [k, { n, cor }]));
  // os móveis e objetos (os ids das Cenas; os que faltavam entraram com a Sede: lareira, estandarte, fornalha, feno,
  // cocho e escada). s: o tamanho em quadrados; parede: gosta de ficar encostado na parede; meio: no meio do cômodo.
  const MOVEIS = {
    mesa: { n: 'Mesa', s: 2, meio: true }, cadeira: { n: 'Cadeira', s: 1 }, banco: { n: 'Banco', s: 1 }, cama: { n: 'Cama', s: 2, parede: true },
    bau: { n: 'Baú', s: 1, parede: true }, barril: { n: 'Barril', s: 1, parede: true }, caixote: { n: 'Caixote', s: 1, parede: true },
    estante: { n: 'Estante', s: 2, parede: true }, tapete: { n: 'Tapete', s: 2, meio: true, chao: true }, jarro: { n: 'Jarro', s: 1, parede: true },
    bigorna: { n: 'Bigorna', s: 1 }, balcao: { n: 'Balcão', s: 1, parede: true }, armas: { n: 'Armas', s: 1, parede: true }, pele: { n: 'Pele', s: 1 },
    altar: { n: 'Altar', s: 1, parede: true }, estatua: { n: 'Estátua', s: 1, parede: true }, coluna: { n: 'Coluna', s: 1 },
    braseiro: { n: 'Braseiro', s: 1 }, vela: { n: 'Velas', s: 1, parede: true }, tocha: { n: 'Tocha', s: 1, parede: true }, lampiao: { n: 'Lampião', s: 1 },
    lareira: { n: 'Lareira', s: 2, parede: true }, estandarte: { n: 'Estandarte', s: 1, parede: true }, fornalha: { n: 'Fornalha', s: 2, parede: true },
    feno: { n: 'Feno', s: 1, parede: true }, cocho: { n: 'Cocho', s: 2, parede: true }, almofada: { n: 'Almofada', s: 1 },
    poco: { n: 'Poço', s: 1 }, flores: { n: 'Flores', s: 1 }, arbusto: { n: 'Arbusto', s: 1 }, arvore: { n: 'Árvore', s: 2 },
    // (lote 39) os objetos novos do clã (nas Cenas, os de cor saem com as cores do brasão)
    brasao: { n: 'Brasão na parede', s: 1, parede: true }, mesaGuerra: { n: 'Mesa de guerra', s: 2, meio: true }, quadroMissoes: { n: 'Quadro de missões', s: 1, parede: true },
    cofre: { n: 'Cofre', s: 1, parede: true }, trofeu: { n: 'Troféu de caça', s: 1, parede: true }, boneco: { n: 'Boneco de treino', s: 1 }, alvo: { n: 'Alvo de arco', s: 1, parede: true },
    atril: { n: 'Atril com o livro', s: 1, parede: true },
  };
  // perto de quê cada móvel gosta de ficar (o primeiro que já estiver no cômodo)
  const PERTO = { cadeira: ['mesa', 'mesaGuerra'], banco: ['mesa'], vela: ['altar', 'cama', 'mesa', 'atril'], bau: ['cama'], estatua: ['altar'], bigorna: ['fornalha'], estandarte: ['lareira'], brasao: ['lareira', 'estandarte'], alvo: ['boneco'] };
  // os papéis dos cômodos: o nome, o piso e os móveis (na ordem em que entram)
  const PAPEIS = {
    salao: { n: 'Salão', piso: 'madeira', m: ['tapete', 'mesa', 'banco', 'banco', 'mesa', 'banco', 'banco', 'lareira', 'estandarte', 'estandarte', 'brasao', 'trofeu', 'barril', 'tocha'] },
    cozinha: { n: 'Cozinha', piso: 'pedra', m: ['lareira', 'mesa', 'barril', 'caixote', 'jarro', 'jarro'] },
    quarto: { n: 'Quarto', piso: 'madeira', m: ['cama', 'bau', 'vela', 'tapete'] },
    lider: { n: 'Sala do líder', piso: 'madeira', m: ['tapete', 'mesaGuerra', 'cadeira', 'cadeira', 'estante', 'cofre', 'estandarte', 'brasao', 'vela'] },
    arsenal: { n: 'Arsenal', piso: 'pedra', m: ['armas', 'armas', 'estante', 'caixote', 'bau'] },
    biblioteca: { n: 'Biblioteca', piso: 'madeira', m: ['estante', 'estante', 'estante', 'atril', 'mesa', 'cadeira', 'vela'] },
    dormitorio: { n: 'Dormitório', piso: 'madeira', m: ['cama', 'cama', 'cama', 'cama', 'bau', 'bau', 'cama', 'cama'] },
    refeitorio: { n: 'Refeitório', piso: 'pedra', m: ['mesa', 'banco', 'banco', 'mesa', 'banco', 'banco', 'barril'] },
    treino: { n: 'Sala de treino', piso: 'terra', m: ['boneco', 'boneco', 'alvo', 'armas', 'armas', 'barril', 'caixote'] },
    forja: { n: 'Forja', piso: 'pedra', m: ['fornalha', 'bigorna', 'bigorna', 'barril', 'caixote', 'armas'] },
    oficina: { n: 'Oficina', piso: 'madeira', m: ['mesa', 'estante', 'caixote', 'barril'] },
    deposito: { n: 'Depósito', piso: 'terra', m: ['caixote', 'barril', 'caixote', 'estante', 'barril', 'caixote'] },
    adega: { n: 'Adega', piso: 'pedra', m: ['barril', 'barril', 'barril', 'barril', 'caixote', 'jarro'] },
    cela: { n: 'Cela', piso: 'pedra', m: ['pele', 'jarro'] },
    nave: { n: 'Nave', piso: 'lajes', m: ['altar', 'estatua', 'estatua', 'vela', 'vela', 'banco', 'banco', 'banco', 'banco', 'coluna', 'coluna'] },
    sacristia: { n: 'Sacristia', piso: 'lajes', m: ['estante', 'bau', 'vela'] },
    cripta: { n: 'Cripta', piso: 'lajes', m: ['estatua', 'vela', 'vela', 'coluna'] },
    baias: { n: 'Baias', piso: 'terra', m: ['cocho', 'feno', 'feno', 'cocho', 'feno', 'barril'] },
    selaria: { n: 'Selaria', piso: 'madeira', m: ['estante', 'bau', 'caixote'] },
    palheiro: { n: 'Palheiro', piso: 'terra', m: ['feno', 'feno', 'feno', 'feno', 'feno'] },
    guarda: { n: 'Sala da guarda', piso: 'pedra', m: ['mesa', 'cadeira', 'quadroMissoes', 'armas', 'braseiro', 'bau'] },
    vigia: { n: 'Vigia', piso: 'pedra', m: ['braseiro', 'armas', 'caixote'] },
    sala: { n: 'Sala', piso: 'madeira', m: ['tapete', 'mesa', 'cadeira', 'cadeira', 'estante', 'trofeu', 'bau'] },
    vazio: { n: 'Cômodo', piso: 'madeira', m: [] },
  };
  /* Os prédios prontos: o nome, o ícone (o das construções do Clã), a forma, e cada nível: as medidas e os andares, com
     os papéis dos cômodos de cada andar (o primeiro, o da porta). grande: a sala da porta pega essa parte do fundo. */
  const PREDIOS = {
    salao: { n: 'Salão do clã', ic: 'salao', niveis: [
      { W: 10, H: 8, andares: { t: ['salao', 'cozinha', 'lider'] } },
      { W: 14, H: 10, andares: { t: ['salao', 'cozinha', 'lider', 'arsenal'], 1: ['quarto', 'quarto', 'biblioteca'] } },
      { W: 18, H: 12, andares: { p: ['adega', 'deposito', 'cela'], t: ['salao', 'cozinha', 'lider', 'arsenal', 'quarto'], 1: ['quarto', 'quarto', 'biblioteca', 'quarto'] } }], grande: 0.56 },
    quartel: { n: 'Quartel', ic: 'quartel', niveis: [
      { W: 9, H: 6, andares: { t: ['dormitorio', 'arsenal'] } },
      { W: 12, H: 8, andares: { t: ['refeitorio', 'dormitorio', 'arsenal'] } },
      { W: 14, H: 10, andares: { t: ['refeitorio', 'treino', 'arsenal', 'guarda'], 1: ['dormitorio', 'dormitorio', 'quarto'] } }] },
    forja: { n: 'Forja', ic: 'forja', niveis: [
      { W: 7, H: 6, andares: { t: ['forja', 'deposito'] } },
      { W: 9, H: 7, andares: { t: ['forja', 'deposito', 'oficina'] } },
      { W: 12, H: 8, andares: { t: ['forja', 'oficina', 'deposito', 'arsenal'] } }], grande: 0.62 },
    templo: { n: 'Templo', ic: 'templo', niveis: [
      { W: 8, H: 9, andares: { t: ['nave', 'sacristia'] } },
      { W: 10, H: 12, andares: { t: ['nave', 'sacristia', 'sacristia'] } },
      { W: 12, H: 16, andares: { p: ['cripta', 'cripta'], t: ['nave', 'sacristia', 'biblioteca'] } }], grande: 0.72 },
    estabulo: { n: 'Estábulo', ic: 'estabulo', niveis: [
      { W: 8, H: 6, andares: { t: ['baias', 'selaria'] } },
      { W: 12, H: 7, andares: { t: ['baias', 'selaria', 'palheiro'] } },
      { W: 16, H: 8, andares: { t: ['baias', 'baias', 'selaria', 'palheiro'] } }], grande: 0.66 },
    torre: { n: 'Torre', ic: 'torre', forma: 'oct', niveis: [
      { W: 6, H: 6, andares: { t: ['guarda'], 1: ['vigia'] } },
      { W: 8, H: 8, andares: { t: ['guarda'], 1: ['quarto'], 2: ['vigia'] } },
      { W: 10, H: 10, andares: { p: ['cela'], t: ['guarda'], 1: ['arsenal'], 2: ['vigia'] } }] },
  };
  const TIPOS_PREDIO = Object.keys(PREDIOS);
  // o que fica em volta dos prédios: as linhas (a muralha e a estrada) e as peças (o portão, o poço e o jardim)
  const ESTRUTURAS = {
    muralha: { n: 'Muralha', linha: true, larg: 1 }, estrada: { n: 'Estrada', linha: true, larg: 2 },
    portao: { n: 'Portão', w: 3, h: 1 }, poco: { n: 'Poço', w: 2, h: 2 }, jardim: { n: 'Jardim', w: 4, h: 3, area: true },
  };
  const TERRENOS = [['campo', 'Campo'], ['floresta', 'Floresta'], ['areia', 'Deserto'], ['neve', 'Neve']];
  const ESTILOS = [['comum', 'Comum'], ['nordico', 'Nórdico'], ['oriental', 'Oriental'], ['desertico', 'Desértico'], ['elfico', 'Élfico'], ['anao', 'Anão']];

  /* ---------------- a planta de um prédio pronto ---------------- */
  // os cômodos de um andar: divide o retângulo até ter tantos quantos papéis (a sala da porta, se "grande", pega a frente)
  function dividir(W, H, papeis, grande, rnd, lado) {
    const r = (a, b) => a + rnd() * (b - a), ri = (a, b) => Math.floor(r(a, b + 1));
    const n = clamp(papeis.length, 1, Math.max(1, Math.floor((W * H) / 12)));
    const salas = [{ x: 0, y: 0, w: W, h: H }], portas = [];
    function partir(k, emPe, t) {
      const q = salas[k];
      const a = emPe ? { x: q.x, y: q.y, w: t, h: q.h } : { x: q.x, y: q.y, w: q.w, h: t }, b = emPe ? { x: q.x + t, y: q.y, w: q.w - t, h: q.h } : { x: q.x, y: q.y + t, w: q.w, h: q.h - t };
      const comp = emPe ? q.h : q.w, ini = emPe ? q.y : q.x, pd = comp >= 3 ? ri(ini + 1, ini + comp - 2) : ini;
      portas.push(emPe ? { k: 'door', x1: q.x + t, y1: pd, x2: q.x + t, y2: pd + 1 } : { k: 'door', x1: pd, y1: q.y + t, x2: pd + 1, y2: q.y + t });
      salas.splice(k, 1, a, b);
    }
    if (grande && n > 1) {
      const emPe = lado === 'o' || lado === 'l', L = emPe ? W : H, g = clamp(Math.round(L * grande), 3, L - 3);
      if (L >= 6) partir(0, emPe, lado === 'n' || lado === 'o' ? g : L - g);
    }
    const daPorta = q => (lado === 's' ? q.y + q.h === H : lado === 'n' ? q.y === 0 : lado === 'o' ? q.x === 0 : q.x + q.w === W);
    for (let volta = 0; salas.length < n && volta < 40; volta++) {
      const fixa = grande && salas.length > 1 ? salas.find(daPorta) : null;
      const cand = salas.map((q, k) => [q, k]).filter(([q]) => q !== fixa && (q.w >= 6 || q.h >= 6)).sort((a, b) => b[0].w * b[0].h - a[0].w * a[0].h);
      if (!cand.length) break;
      const [q, k] = cand[0], emPe = q.w >= q.h, L = emPe ? q.w : q.h;
      partir(k, emPe, clamp(Math.round(L * r(0.38, 0.62)), 3, L - 3));
    }
    return { salas, portas };
  }
  // o lado da porta de entrada e o trecho dela (no meio do lado, fora dos cantos)
  function portaDe(W, H, lado, corte, rnd) {
    const len = lado === 'n' || lado === 's' ? W : H, d = clamp(Math.floor(len / 2) - 1 + Math.floor(rnd() * 2), corte + 1, len - corte - 2);
    if (lado === 'n') return { lado, x1: d, y1: 0, x2: d + 1, y2: 0 };
    if (lado === 's') return { lado, x1: d, y1: H, x2: d + 1, y2: H };
    if (lado === 'o') return { lado, x1: 0, y1: d, x2: 0, y2: d + 1 };
    return { lado, x1: W, y1: d, x2: W, y2: d + 1 };
  }
  // a casa logo para dentro de uma porta (na parede de fora)
  function dentroDa(p, W, H) {
    if (p.y1 === p.y2) return [Math.min(p.x1, p.x2), p.y1 === 0 ? 0 : p.y1 - 1];
    return [p.x1 === 0 ? 0 : p.x1 - 1, Math.min(p.y1, p.y2)];
  }
  // os cantos cortados da torre (oct): as casas que ficam de fora
  const foraDoOct = (i, j, W, H, corte) => corte > 0 && (i + j < corte || (W - 1 - i) + j < corte || i + (H - 1 - j) < corte || (W - 1 - i) + (H - 1 - j) < corte);

  /* A planta pronta: tipo, nível (1 a 3), semente. → { tipo, nivel, W, H, forma, corte, porta, andares: [...] } */
  function plantaPronta(tipo, nivel, seed) {
    const T = PREDIOS[tipo] || PREDIOS.salao, nv = clamp(Math.round(num(nivel, 1)), 1, 3), N = T.niveis[nv - 1];
    seed = (Math.round(num(seed, 1)) >>> 0) || 1;
    const rnd = mulberry(seed), W = N.W, H = N.H, forma = T.forma === 'oct' ? 'oct' : 'ret', corte = forma === 'oct' ? Math.max(1, Math.floor(Math.min(W, H) / 4)) : 0;
    const lado = 's', porta = portaDe(W, H, lado, corte, rnd);
    const ids = ANDARES.map(([k]) => k).filter(k => N.andares[k]);
    // as escadas: na mesma casa em todos os andares que ela liga (subir de t para 1 na casa A; descer de t para p na B)
    const livres = [];
    for (let j = 1 + corte; j < H - 1 - corte; j++) for (let i = 1 + corte; i < W - 1 - corte; i++) livres.push([i, j]);
    const [pi, pj] = dentroDa(porta, W, H);
    const longe = livres.filter(([i, j]) => Math.abs(i - pi) + Math.abs(j - pj) >= 3);
    const escolher = () => { const l = longe.length ? longe : livres; const c = l.splice(Math.floor(rnd() * l.length) % Math.max(1, l.length), 1)[0] || [1, 1]; return c; };
    const ligacoes = [];                          // [andar de baixo, andar de cima, [i, j]]
    for (let k = 0; k + 1 < ids.length; k++) ligacoes.push([ids[k], ids[k + 1], escolher()]);
    const andares = ids.map(id => {
      const papeis = N.andares[id];
      const d = dividir(W, H, papeis, id === 't' ? T.grande : null, rnd, lado);
      const daPorta = id === 't' ? d.salas.find(q => q.y + q.h === H && porta.x1 >= q.x && porta.x2 <= q.x + q.w) : null;
      const lista = (daPorta ? [daPorta] : []).concat(d.salas.filter(q => q !== daPorta).sort((a, b) => b.w * b.h - a.w * a.h));
      const salas = lista.map((q, i) => { const papel = papeis[Math.min(i, papeis.length - 1)]; return { id: 's' + (i + 1), x: q.x, y: q.y, w: q.w, h: q.h, papel, piso: (PAPEIS[papel] || PAPEIS.vazio).piso }; });
      const aberturas = d.portas.slice();
      if (id === 't') aberturas.push({ k: 'door', x1: porta.x1, y1: porta.y1, x2: porta.x2, y2: porta.y2, entrada: true });
      // as janelas: uma por cômodo, numa parede de fora (não no porão)
      if (id !== 'p') for (const q of salas) {
        const lados = [];
        if (q.y === 0) lados.push('n'); if (q.y + q.h === H) lados.push('s'); if (q.x === 0) lados.push('o'); if (q.x + q.w === W) lados.push('l');
        for (const l of lados.sort(() => rnd() - 0.5)) {
          const horiz = l === 'n' || l === 's', a0 = horiz ? q.x : q.y, a1 = a0 + (horiz ? q.w : q.h), lim = horiz ? W : H;
          const lo = Math.max(a0 + 1, corte + 1), hi = Math.min(a1 - 2, lim - corte - 2);
          if (hi < lo) continue;
          let p0 = Math.floor((lo + hi) / 2);
          if (id === 't' && l === lado && Math.abs(p0 - porta.x1) < 2) p0 = p0 + 2 <= hi ? p0 + 2 : p0 - 2 >= lo ? p0 - 2 : -1;
          if (p0 < lo || p0 > hi) continue;
          aberturas.push(horiz ? { k: 'window', x1: p0, y1: l === 'n' ? 0 : H, x2: p0 + 1, y2: l === 'n' ? 0 : H } : { k: 'window', x1: l === 'o' ? 0 : W, y1: p0, x2: l === 'o' ? 0 : W, y2: p0 + 1 });
          break;
        }
      }
      const escadas = [];
      for (const [baixo, cima, [i, j]] of ligacoes) {
        if (baixo === id) escadas.push({ x: i, y: j, para: cima });
        else if (cima === id) escadas.push({ x: i, y: j, para: baixo });
      }
      const andar = { id, salas, aberturas, moveis: [], escadas };
      andar.moveis = mobiliar(andar, W, H, (seed ^ (ORDEM_ANDAR[id] + 1) * 0x9e3779b1) >>> 0, forma === 'oct' ? corte : 0);
      return andar;
    });
    return { tipo: PREDIOS[tipo] ? tipo : 'salao', nivel: nv, W, H, forma, corte, porta, andares };
  }

  /* Os móveis de um andar (cada cômodo, pelos papéis): longe das portas e das escadas, sem se cobrir; os de "parede"
     encostados numa parede, os de "meio" perto do meio. Uma conta simples, sorteada pela semente. */
  function mobiliar(andar, W, H, seed, corte) {
    const rnd = mulberry(seed || 1), ocup = new Set(), out = [];
    const chave = (i, j) => i + ',' + j;
    const livre = (i, j) => !ocup.has(chave(i, j)) && !foraDoOct(i, j, W, H, corte || 0);
    // as passagens: as duas casas de cada lado de cada porta e a casa de cada escada (e a da frente dela)
    for (const a of andar.aberturas) {
      if (a.k !== 'door') continue;
      const horiz = a.y1 === a.y2, len = Math.max(1, Math.abs(horiz ? a.x2 - a.x1 : a.y2 - a.y1));
      for (let t = 0; t < len; t++) {
        const i = horiz ? Math.min(a.x1, a.x2) + t : a.x1, j = horiz ? a.y1 : Math.min(a.y1, a.y2) + t;
        if (horiz) { ocup.add(chave(i, j)); ocup.add(chave(i, j - 1)); ocup.add(chave(i, j + 1)); ocup.add(chave(i, j - 2)); }
        else { ocup.add(chave(i, j)); ocup.add(chave(i - 1, j)); ocup.add(chave(i + 1, j)); ocup.add(chave(i - 2, j)); }
      }
    }
    for (const e of andar.escadas) { ocup.add(chave(e.x, e.y)); ocup.add(chave(e.x, e.y + 1)); ocup.add(chave(e.x + 1, e.y)); }
    for (const q of andar.salas) {
      const P = PAPEIS[q.papel] || PAPEIS.vazio, ids = P.m.filter(id => MOVEIS[id]);
      const max = clamp(Math.round(q.w * q.h / 5), 1, ids.filter(id => !MOVEIS[id].chao).length || 1);
      let n = 0;
      for (const id of ids) {
        const M = MOVEIS[id], s = M.s;
        if (M.chao ? q.w * q.h < 12 : n >= max) continue;
        const lugares = [];
        for (let j = q.y; j + s <= q.y + q.h; j++) for (let i = q.x; i + s <= q.x + q.w; i++) {
          let ok = true;
          for (let b = 0; b < s && ok; b++) for (let a = 0; a < s && ok; a++) if (!M.chao ? !livre(i + a, j + b) : foraDoOct(i + a, j + b, W, H, corte || 0)) ok = false;
          if (ok) lugares.push([i, j]);
        }
        if (!lugares.length) continue;
        const naParede = ([i, j]) => i === q.x || j === q.y || i + s === q.x + q.w || j + s === q.y + q.h;
        const cx = q.x + q.w / 2 - s / 2, cy = q.y + q.h / 2 - s / 2, perto = ([i, j]) => Math.hypot(i - cx, j - cy);
        let l = lugares;
        // junto de quem ele gosta, se já está no cômodo (a cadeira e o banco ao lado da mesa, a vela junto do altar…)
        const dentro = m => m.x >= q.x && m.y >= q.y && m.x < q.x + q.w && m.y < q.y + q.h;
        const ancoras = (PERTO[id] || []).map(a => out.filter(m => m.id === a && dentro(m))).find(x => x.length) || null;
        const encosta = ([i, j], m) => { const sx = i < m.x + m.s && i + s > m.x, sy = j < m.y + m.s && j + s > m.y; return (sx && (j + s === m.y || j === m.y + m.s)) || (sy && (i + s === m.x || i === m.x + m.s)); };
        const junto = ancoras ? lugares.filter(c => ancoras.some(m => encosta(c, m))) : [];
        if (junto.length) l = junto;
        else if (M.parede) { const p = lugares.filter(naParede); if (p.length) l = p; }
        else if (M.meio) l = lugares.slice().sort((a, b) => perto(a) - perto(b)).slice(0, Math.max(1, Math.ceil(lugares.length / 4)));
        else { const p = lugares.filter(c => !naParede(c)); if (p.length) l = p; }
        const [i, j] = l[Math.floor(rnd() * l.length) % l.length];
        // virado para dentro do cômodo (o que encosta na parede de cima vira para baixo…): 0, 90, 180, 270; o que está
        // junto da mesa, virado para ela
        let rot = 0;
        const m0 = junto.length ? ancoras.find(m => encosta([i, j], m)) : null;
        if (m0 && (id === 'cadeira' || id === 'banco')) rot = j + s <= m0.y ? 0 : j >= m0.y + m0.s ? 180 : i + s <= m0.x ? 270 : 90;
        else if (M.parede) rot = j === q.y ? 0 : j + s === q.y + q.h ? 180 : i === q.x ? 270 : i + s === q.x + q.w ? 90 : 0;
        out.push({ id, x: i, y: j, s, rot });
        if (!M.chao) { for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) ocup.add(chave(i + a, j + b)); n++; }
      }
    }
    return out;
  }

  /* ---------------- as paredes de um andar (da planta) ---------------- */
  /* Cada linha da grade entre duas casas de donos diferentes vira parede (de fora, se um lado é o lado de fora; de
     dentro, entre dois cômodos); a abertura que cai nela a troca por porta ou janela. Trechos seguidos do mesmo jeito
     viram um trecho só. → [{ x1, y1, x2, y2, k: 'wall'|'door'|'window', fora }] (as portas e janelas, uma por abertura) */
  function paredes(andar, W, H) {
    const dono = new Int16Array(Math.max(1, W * H)).fill(-1);
    andar.salas.forEach((q, n) => { for (let j = Math.max(0, q.y); j < Math.min(H, q.y + q.h); j++) for (let i = Math.max(0, q.x); i < Math.min(W, q.x + q.w); i++) dono[j * W + i] = n; });
    const de = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? -1 : dono[j * W + i]);
    const ab = new Map();
    for (const a of andar.aberturas) {
      const horiz = a.y1 === a.y2, len = Math.abs(horiz ? a.x2 - a.x1 : a.y2 - a.y1);
      for (let t = 0; t < len; t++) ab.set(horiz ? 'h' + (Math.min(a.x1, a.x2) + t) + ',' + a.y1 : 'v' + a.x1 + ',' + (Math.min(a.y1, a.y2) + t), a);
    }
    const out = [];
    // as linhas deitadas (y de 0 a H), casa por casa, juntando os trechos
    for (let j = 0; j <= H; j++) {
      let cur = null;
      for (let i = 0; i <= W; i++) {
        const a = i < W ? de(i, j - 1) : -2, b = i < W ? de(i, j) : -2, eh = i < W && a !== b, ap = eh ? ab.get('h' + i + ',' + j) : null;
        const k = !eh ? null : ap ? 'ab' : 'wall', fora = eh && (a === -1 || b === -1);
        if (cur && (k !== 'wall' || cur.fora !== fora)) { out.push(cur); cur = null; }
        if (k === 'wall') { if (!cur) cur = { x1: i, y1: j, x2: i + 1, y2: j, k: 'wall', fora }; else cur.x2 = i + 1; }
      }
    }
    for (let i = 0; i <= W; i++) {
      let cur = null;
      for (let j = 0; j <= H; j++) {
        const a = j < H ? de(i - 1, j) : -2, b = j < H ? de(i, j) : -2, eh = j < H && a !== b, ap = eh ? ab.get('v' + i + ',' + j) : null;
        const k = !eh ? null : ap ? 'ab' : 'wall', fora = eh && (a === -1 || b === -1);
        if (cur && (k !== 'wall' || cur.fora !== fora)) { out.push(cur); cur = null; }
        if (k === 'wall') { if (!cur) cur = { x1: i, y1: j, x2: i, y2: j + 1, k: 'wall', fora }; else cur.y2 = j + 1; }
      }
    }
    // as aberturas que estão de fato numa parede (entre dois donos)
    for (const a of andar.aberturas) {
      const horiz = a.y1 === a.y2, i0 = Math.min(a.x1, a.x2), j0 = Math.min(a.y1, a.y2);
      const ok = horiz ? de(i0, a.y1 - 1) !== de(i0, a.y1) : de(a.x1 - 1, j0) !== de(a.x1, j0);
      if (!ok) continue;
      const fora = horiz ? de(i0, a.y1 - 1) === -1 || de(i0, a.y1) === -1 : de(a.x1 - 1, j0) === -1 || de(a.x1, j0) === -1;
      out.push({ x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, k: a.k === 'window' ? 'window' : 'door', fora, entrada: !!a.entrada });
    }
    return out;
  }

  /* ---------------- girar uma planta (90° no sentido do relógio) ---------------- */
  function girar(pl) {
    const W = pl.W, H = pl.H;                               // (x, y) → (H − y, x): o lado de cima vai para a direita
    const pt = (x, y) => [H - y, x];
    const ret = q => { const [ax, ay] = pt(q.x, q.y + q.h); return Object.assign({}, q, { x: ax, y: ay, w: q.h, h: q.w }); };
    const seg = s => { const [a1, b1] = pt(s.x1, s.y1), [a2, b2] = pt(s.x2, s.y2); return Object.assign({}, s, { x1: Math.min(a1, a2), y1: Math.min(b1, b2), x2: Math.max(a1, a2), y2: Math.max(b1, b2) }); };
    const LADO = { n: 'l', l: 's', s: 'o', o: 'n' };
    const cel = (i, j, s) => { const [a, b] = pt(i, j + (s || 1)); return [a, b]; };
    return Object.assign({}, pl, {
      W: H, H: W, porta: pl.porta ? Object.assign(seg(pl.porta), { lado: LADO[pl.porta.lado] || 's' }) : null,
      andares: pl.andares.map(a => Object.assign({}, a, {
        salas: a.salas.map(ret), aberturas: a.aberturas.map(seg),
        moveis: a.moveis.map(m => { const [x, y] = cel(m.x, m.y, m.s); return Object.assign({}, m, { x, y, rot: ((m.rot || 0) + 90) % 360 }); }),
        escadas: a.escadas.map(e => { const [x, y] = cel(e.x, e.y, 1); return Object.assign({}, e, { x, y }); }),
      })),
    });
  }

  /* ---------------- a normalização ---------------- */
  function normPlanta(p) {
    if (!ehObj(p)) return null;
    const W = int(p.W, 8, 3, 60), H = int(p.H, 6, 3, 60), forma = p.forma === 'oct' ? 'oct' : 'ret', corte = forma === 'oct' ? int(p.corte, 1, 1, 15) : 0;
    const seg = s => {
      if (!ehObj(s)) return null;
      const x1 = int(s.x1, 0, 0, W), y1 = int(s.y1, 0, 0, H), x2 = int(s.x2, 0, 0, W), y2 = int(s.y2, 0, 0, H);
      if (!(x1 === x2 && y1 !== y2) && !(y1 === y2 && x1 !== x2)) return null;
      return { x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2) };
    };
    const vistos = new Set(), andares = [];
    for (const a of Array.isArray(p.andares) ? p.andares : []) {
      if (!ehObj(a) || !ANDAR_NOME[a.id] || vistos.has(a.id)) continue;
      vistos.add(a.id);
      const salas = [], ocup = new Set(), sid = new Set();
      for (const q of Array.isArray(a.salas) ? a.salas : []) {
        if (!ehObj(q) || salas.length >= LIM.salas) continue;
        const x = int(q.x, 0, 0, W - 1), y = int(q.y, 0, 0, H - 1), w = int(q.w, 1, 1, W - x), h = int(q.h, 1, 1, H - y);
        let bate = false;
        for (let j = y; j < y + h && !bate; j++) for (let i = x; i < x + w && !bate; i++) if (ocup.has(i + ',' + j)) bate = true;
        if (bate) continue;
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) ocup.add(i + ',' + j);
        let id = idOk(q.id) || 's' + (salas.length + 1); while (sid.has(id)) id = id + 'x'; sid.add(id);
        const papel = PAPEIS[q.papel] ? q.papel : 'vazio';
        salas.push({ id, x, y, w, h, papel, piso: PISO[q.piso] ? q.piso : PAPEIS[papel].piso, nome: texto(q.nome, 40) || undefined });
      }
      const aberturas = [];
      for (const s of Array.isArray(a.aberturas) ? a.aberturas : []) {
        if (aberturas.length >= LIM.aberturas) break;
        const g = seg(s); if (!g) continue;
        aberturas.push(Object.assign(g, { k: s.k === 'window' ? 'window' : 'door' }, s.entrada === true ? { entrada: true } : null));
      }
      const moveis = [];
      for (const m of Array.isArray(a.moveis) ? a.moveis : []) {
        if (!ehObj(m) || !MOVEIS[m.id] || moveis.length >= LIM.moveis) continue;
        const s = MOVEIS[m.id].s;
        moveis.push({ id: m.id, x: int(m.x, 0, 0, Math.max(0, W - s)), y: int(m.y, 0, 0, Math.max(0, H - s)), s, rot: [0, 90, 180, 270].includes(m.rot) ? m.rot : 0 });
      }
      const escadas = [];
      for (const e of Array.isArray(a.escadas) ? a.escadas : []) {
        if (!ehObj(e) || !ANDAR_NOME[e.para] || e.para === a.id || escadas.length >= LIM.escadas) continue;
        escadas.push({ x: int(e.x, 0, 0, W - 1), y: int(e.y, 0, 0, H - 1), para: e.para });
      }
      andares.push({ id: a.id, salas, aberturas, moveis, escadas });
    }
    if (!andares.length) andares.push({ id: 't', salas: [{ id: 's1', x: 0, y: 0, w: W, h: H, papel: 'vazio', piso: 'madeira' }], aberturas: [], moveis: [], escadas: [] });
    andares.sort((x, y) => ORDEM_ANDAR[x.id] - ORDEM_ANDAR[y.id]);
    // as escadas só levam a andares que existem
    const tem = new Set(andares.map(a => a.id));
    for (const a of andares) a.escadas = a.escadas.filter(e => tem.has(e.para));
    const porta = seg(p.porta);
    return { W, H, forma, corte, porta: porta ? Object.assign(porta, { lado: ['n', 's', 'o', 'l'].includes(p.porta.lado) ? p.porta.lado : 's' }) : null, andares };
  }
  function normPredio(d) {
    if (!ehObj(d)) return null;
    const planta = normPlanta(d.planta);
    if (!planta) return null;
    return {
      id: idOk(d.id) || novoId('pr'), tipo: PREDIOS[d.tipo] ? d.tipo : 'livre', nome: texto(d.nome, LIM.nome) || (PREDIOS[d.tipo] || { n: 'Prédio' }).n,
      cons: idOk(d.cons), nivel: int(d.nivel, 1, 1, 3), seed: (Math.round(num(d.seed, 1)) >>> 0) || 1, mexido: d.mexido === true,
      x: int(d.x, 0, 0, LIM.W[1]), y: int(d.y, 0, 0, LIM.H[1]), planta,
    };
  }
  function normEstrutura(d) {
    if (!ehObj(d) || !ESTRUTURAS[d.k]) return null;
    const E = ESTRUTURAS[d.k], id = idOk(d.id) || novoId('es');
    if (E.linha) {
      const pts = (Array.isArray(d.pts) ? d.pts : []).filter(p => Array.isArray(p) && p.length === 2).slice(0, LIM.pts).map(([x, y]) => [Math.round(clamp(num(x, 0), 0, LIM.W[1]) * 2) / 2, Math.round(clamp(num(y, 0), 0, LIM.H[1]) * 2) / 2]);
      return pts.length >= 2 ? { id, k: d.k, pts } : null;
    }
    const rot = d.rot === 90 ? 90 : 0, w = E.area ? int(d.w, E.w, 2, 20) : E.w, h = E.area ? int(d.h, E.h, 2, 20) : E.h;
    return Object.assign({ id, k: d.k, x: int(d.x, 0, 0, LIM.W[1]), y: int(d.y, 0, 0, LIM.H[1]) }, E.area ? { w, h } : { rot });
  }
  // a caixa que uma peça ocupa no terreno (o portão deitado ou em pé)
  function caixaDe(o) {
    if (o.planta) return { x: o.x, y: o.y, w: o.planta.W, h: o.planta.H };
    const E = ESTRUTURAS[o.k];
    if (!E || E.linha) return null;
    if (E.area) return { x: o.x, y: o.y, w: o.w, h: o.h };
    return o.rot === 90 ? { x: o.x, y: o.y, w: E.h, h: E.w } : { x: o.x, y: o.y, w: E.w, h: E.h };
  }
  function normSede(d) {
    d = ehObj(d) ? d : {};
    const out = {
      v: 1, W: int(d.W, 40, LIM.W[0], LIM.W[1]), H: int(d.H, 30, LIM.H[0], LIM.H[1]),
      terreno: TERRENOS.some(([k]) => k === d.terreno) ? d.terreno : '', estilo: ESTILOS.some(([k]) => k === d.estilo) ? d.estilo : 'comum',
      lugar: ehObj(d.lugar) && idOk(d.lugar.mapa) && idOk(d.lugar.marcador) ? { mapa: d.lugar.mapa, marcador: d.lugar.marcador, nome: texto(d.lugar.nome, 60), bioma: TERRENOS.some(([k]) => k === d.lugar.bioma) ? d.lugar.bioma : '' } : null,
      mostrar: d.mostrar === true, predios: [], estruturas: [],
    };
    // (lote 62) a cena das Cenas ligada à sede (o mapa que o mestre já fez): o id e o nome dela
    if (ehObj(d.cena) && typeof d.cena.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(d.cena.id)) out.cena = { id: d.cena.id, nome: texto(d.cena.nome, 60) || 'Cena' };
    const ids = new Set();
    for (const p of Array.isArray(d.predios) ? d.predios : []) {
      if (out.predios.length >= LIM.predios) break;
      const q = normPredio(p); if (!q) continue;
      while (ids.has(q.id)) q.id = novoId('pr');
      ids.add(q.id);
      q.x = clamp(q.x, 0, Math.max(0, out.W - q.planta.W)); q.y = clamp(q.y, 0, Math.max(0, out.H - q.planta.H));
      out.predios.push(q);
    }
    for (const e of Array.isArray(d.estruturas) ? d.estruturas : []) {
      if (out.estruturas.length >= LIM.estruturas) break;
      const q = normEstrutura(e); if (!q) continue;
      while (ids.has(q.id)) q.id = novoId('es');
      ids.add(q.id);
      const c = caixaDe(q);
      if (c) { q.x = clamp(q.x, 0, Math.max(0, out.W - c.w)); q.y = clamp(q.y, 0, Math.max(0, out.H - c.h)); }
      else q.pts = q.pts.map(([x, y]) => [Math.min(x, out.W), Math.min(y, out.H)]);
      out.estruturas.push(q);
    }
    return out;
  }
  const sedeNova = () => normSede({});
  // o terreno de verdade: o escolhido, senão o do lugar no mapa, senão campo
  const terrenoDe = s => s.terreno || (s.lugar && s.lugar.bioma) || 'campo';

  /* ---------------- pôr e mover ---------------- */
  // cabe (dentro do terreno, sem cobrir outro prédio nem peça)? ignorar: o id da peça que está mudando
  function cabe(s, caixa, ignorar) {
    if (!caixa || caixa.x < 0 || caixa.y < 0 || caixa.x + caixa.w > s.W || caixa.y + caixa.h > s.H) return false;
    for (const o of s.predios.concat(s.estruturas)) {
      if (o.id === ignorar) continue;
      const c = caixaDe(o);
      if (c && caixa.x < c.x + c.w && caixa.x + caixa.w > c.x && caixa.y < c.y + c.h && caixa.y + caixa.h > c.y) return false;
    }
    return true;
  }
  // um lugar livre perto de (x, y) para uma caixa w × h (em espiral), ou null
  function lugarLivre(s, w, h, x, y, ignorar) {
    x = Math.round(num(x, (s.W - w) / 2)); y = Math.round(num(y, (s.H - h) / 2));
    for (let r = 0; r < Math.max(s.W, s.H); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const c = { x: x + dx, y: y + dy, w, h };
      if (cabe(s, c, ignorar)) return c;
    }
    return null;
  }
  function predioNovo(tipo, nivel, seed) {
    const T = PREDIOS[tipo] || PREDIOS.salao;
    seed = seed || novaSemente();
    return { id: novoId('pr'), tipo: PREDIOS[tipo] ? tipo : 'salao', nome: T.n, cons: null, nivel: clamp(Math.round(num(nivel, 1)), 1, 3), seed, mexido: false, x: 0, y: 0, planta: plantaPronta(tipo, nivel, seed) };
  }

  /* ---------------- as cenas ---------------- */
  // os ids das cenas da sede: a de fora e a de cada andar de cada prédio (os mesmos sempre: assim a cena se atualiza)
  const cenaDeFora = cla => 'sede-' + cla;
  const cenaDoAndar = (cla, pr, andar) => 'sede-' + cla + '-' + pr + '-' + andar;
  const nomeDoAndar = id => ANDAR_NOME[id] || 'Andar';
  // um resumo curto (para a lista e os avisos)
  function resumo(s) {
    const n = s.predios.length, a = s.predios.reduce((t, p) => t + p.planta.andares.length, 0);
    return n ? n + (n === 1 ? ' prédio' : ' prédios') + ' · ' + a + (a === 1 ? ' andar' : ' andares') : 'Nenhum prédio ainda';
  }

  const api = {
    PRE, LIM, ANDARES, ANDAR_NOME, PISOS, PISO, MOVEIS, PAPEIS, PREDIOS, TIPOS_PREDIO, ESTRUTURAS, TERRENOS, ESTILOS,
    mulberry, novaSemente, plantaPronta, dividir, mobiliar, paredes, girar, foraDoOct,
    normPlanta, normPredio, normEstrutura, normSede, sedeNova, terrenoDe, caixaDe, cabe, lugarLivre, predioNovo,
    cenaDeFora, cenaDoAndar, nomeDoAndar, resumo, novoId,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.TC = window.TC || {}; window.TC.sede = api; }
})();
