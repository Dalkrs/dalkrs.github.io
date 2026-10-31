/* ---------------------------------------------------------------
   10ga. POVOAR O LUGAR (lote 49) — depois de criar a cena pelo "Gerar um lugar…" (ou pela Entrada de um nível), com a
   chave "Povoar o lugar" ligada, a cena ganha:
   · as luzes como a hora pede (de dia, as tochas e as velas de fora apagadas; o fogo da lareira e da forja, aceso);
   · as entradas para baixo nos lugares de gente: o poço desce à cisterna, o alçapão de uma casa desce ao porão (Entradas
     ocultas, como as outras);
   · os inimigos: sorteados no Bestiário da mesa entre os que combinam com o lugar (pelas tags: o tipo da criatura e o
     bioma); sem nenhum que sirva, um token com o nome ("Esqueleto"), para o mestre ligar depois. Todos ocultos, longe
     da chegada, quantos o perigo pede;
   · os moradores (nos lugares de gente): pelo gerador de NPC do site, com nome, raça, o papel e um traço, nas notas do
     token, ocultos até o mestre mostrar;
   · os tesouros: o saque escondido nos baús, nos cofres e nos sarcófagos (o saque no chão: "Recolher o saque").
   Tudo é um passo só: a cena acabou de nascer.
   --------------------------------------------------------------- */
const Povoar = (() => {
  const PERIGOS = [['facil', 'Fácil'], ['medio', 'Médio'], ['dificil', 'Difícil']];
  const QUANTOS = { facil: [2, 3], medio: [4, 6], dificil: [7, 10] };
  const DE_GENTE = new Set(['vila', 'cidade', 'porto', 'tribo', 'castelo', 'cemiterio']);
  const FORA = new Set(['vila', 'cidade', 'porto', 'tribo', 'castelo', 'cemiterio', 'encontro', 'regiao', 'ruinas']);
  const FOGO_FICA = new Set(['fogueira', 'lareira', 'fornalha', 'braseiro', 'carvao', 'caldeirao', 'circulo', 'tripe', 'incensario']);
  /* O que vive em cada lugar: as tags do Bestiário (tipo e bioma) e os nomes de reserva. */
  const GENERICOS = {
    'Morto-vivo': ['Esqueleto', 'Zumbi', 'Carniçal', 'Espectro'], Humanoide: ['Bandido', 'Mercenário', 'Cultista', 'Salteador'], Fera: ['Lobo', 'Rato gigante', 'Aranha gigante', 'Javali'],
    'Aberração': ['Aberração', 'Coisa rastejante'], Constructo: ['Golem de pedra', 'Armadura animada'], 'Espírito': ['Fantasma', 'Aparição'], 'Demônio': ['Diabrete', 'Demônio menor'],
  };
  function quemVive(lugar, p) {
    const t = p && p.tipo, est = p && p.estado;
    if (lugar === 'cemiterio') return { tipos: ['Morto-vivo', 'Espírito'], biomas: ['Ruínas'] };
    if (lugar === 'castelo') return est === 'ruinas' ? { tipos: ['Morto-vivo', 'Fera', 'Espírito'], biomas: ['Ruínas'] } : { tipos: ['Humanoide'], biomas: ['Cidade', 'Planície'] };
    if (lugar === 'vila' || lugar === 'cidade' || lugar === 'porto' || lugar === 'tribo') return { tipos: ['Humanoide'], biomas: ['Cidade'] };
    if (lugar === 'masmorra' || lugar === 'catacumbas' || lugar === 'arena') {
      if (['ossuario', 'inundada', 'nobre', 'cripta', 'navio'].includes(t)) return { tipos: ['Morto-vivo'], biomas: ['Masmorra', 'Subterrâneo'] };
      if (t === 'culto') return { tipos: ['Humanoide', 'Demônio', 'Morto-vivo'], biomas: ['Masmorra'] };
      if (['caverna', 'covil', 'subsolo'].includes(t)) return { tipos: ['Fera', 'Aberração'], biomas: ['Caverna', 'Subterrâneo'] };
      if (['esgoto', 'cisterna', 'porao'].includes(t)) return { tipos: ['Fera'], biomas: ['Subterrâneo', 'Cidade'] };
      if (['torre', 'laboratorio', 'mina'].includes(t)) return { tipos: ['Constructo', 'Aberração'], biomas: ['Masmorra'] };
      if (t === 'templo' || t === 'ruinas') return { tipos: ['Espírito', 'Morto-vivo'], biomas: ['Ruínas'] };
      return { tipos: ['Humanoide', 'Fera'], biomas: ['Masmorra'] };
    }
    if (lugar === 'ruinas') return { tipos: ['Espírito', 'Fera'], biomas: ['Ruínas'] };
    return { tipos: ['Fera', 'Humanoide'], biomas: ['Floresta', 'Planície'] };
  }
  const PAPEIS_DE = {
    castelo: ['guarda', 'guarda', 'guarda', 'nobre', 'artesao', 'sacerdote', 'mercenario'], cemiterio: ['sacerdote', 'campones', 'mendigo', 'estudioso'],
    vila: ['taverneiro', 'artesao', 'campones', 'campones', 'guarda', 'comerciante', 'curandeiro'], cidade: ['comerciante', 'guarda', 'nobre', 'artesao', 'ladrao', 'taverneiro', 'artista', 'mendigo'],
    porto: ['marinheiro', 'marinheiro', 'comerciante', 'guarda', 'taverneiro', 'ladrao'], tribo: ['cacador', 'cacador', 'curandeiro', 'artesao', 'campones'],
  };

  /* ---- onde cabe alguém: um ponto de chão, longe das paredes, fora da água, sem token em cima ---- */
  function lugaresLivres(sc, n, longeDe, dentroDe, r) {
    const c = sc.cell, out = [], segs = [];
    for (const w of sc.walls) segs.push([w.x1 / c, w.y1 / c, w.x2 / c, w.y2 / c]);
    const ocup = new Set(sc.tokens.map(t => Math.floor(t.x / c) + ',' + Math.floor(t.y / c)));
    const agua = sc.shapes.filter(s => s.ter && (s.ter.t === 'agua' || s.ter.t === 'fosso'));
    const naAgua = (x, y) => agua.some(s => {
      if (s.k === 'rect' || s.k === 'ell') return x * c >= Math.min(s.x, s.x + s.w) && x * c <= Math.max(s.x, s.x + s.w) && y * c >= Math.min(s.y, s.y + s.h) && y * c <= Math.max(s.y, s.y + s.h);
      if (s.k === 'poly') { let d = false; const P = s.pts; for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) { const xi = P[i] / c, yi = P[i + 1] / c, xj = P[j] / c, yj = P[j + 1] / c; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; }
      return false;
    });
    const perto = (x, y) => segs.some(([a, b, cc, d]) => Geo.distSeg(x, y, a, b, cc, d) < 0.75);
    const area = dentroDe && dentroDe.length ? dentroDe : [{ x: 1, y: 1, w: sc.cols - 2, h: sc.rows - 2 }];
    for (let t = 0; t < n * 60 && out.length < n; t++) {
      const q = area[Math.floor(r() * area.length)];
      const i = Math.floor(q.x + r() * q.w), j = Math.floor(q.y + r() * q.h), x = i + 0.5, y = j + 0.5;
      if (i < 0 || j < 0 || i >= sc.cols || j >= sc.rows || ocup.has(i + ',' + j)) continue;
      if (longeDe && Math.hypot(x - longeDe[0], y - longeDe[1]) < Math.min(10, Math.max(sc.cols, sc.rows) * 0.25)) continue;
      if (perto(x, y) || naAgua(x, y)) continue;
      ocup.add(i + ',' + j); out.push([i, j]);
    }
    return out;
  }
  // a chegada: o marcador de chegada, a Saída (a escada de subida) ou a borda de baixo
  function chegadaDe(sc) {
    const c = sc.cell, t = sc.tokens.find(k => k.prop === 'chegada' || k.prop === 'saida');
    return t ? [t.x / c + 0.5, t.y / c + 0.5] : [sc.cols / 2, sc.rows - 1];
  }

  /* ---- as partes ---- */
  function luzes(sc, lugar) {
    const dia = sc.light === 'claro', fora = FORA.has(lugar);
    let n = 0;
    for (const t of sc.tokens) {
      const d = t.prop ? Props.P[t.prop] : null;
      if (!d || !d.luz || !t.light) continue;
      const on = !(dia && fora && !FOGO_FICA.has(t.prop));
      if ((t.light.on !== false) !== on) { t.light = Object.assign({}, t.light, { on }); n++; }
    }
    return n;
  }
  function entradas(sc, lugar, p, r) {
    if (!['vila', 'cidade', 'porto'].includes(lugar)) return 0;
    const c = sc.cell, novas = [];
    const ent = (x, y, n, m) => { const t = Props.novo(sc, 'entrada', x, y, 1, true); t.size = 0.75; t.x += c * 0.125; t.y += c * 0.125; t.name = n; t.gera = { t: 'masmorra', m, n: 1, tam: 'pequeno', e: (p && p.estilo) || 'comum', s: 1 + Math.floor(r() * 2147483000) }; novas.push(t); };
    const pocos = sc.tokens.filter(t => t.prop === 'poco').slice(0, 1);
    for (const t of pocos) ent(t.x + c, t.y, 'O poço (desce à cisterna)', 'cisterna');
    // o alçapão: ao lado de uma cama ou de uma mesa (dentro de casa), em até duas casas
    const casas = sc.tokens.filter(t => t.prop === 'cama' || t.prop === 'mesa' || t.prop === 'balcao');
    for (let k = 0; k < Math.min(2, casas.length); k++) { const t = casas.splice(Math.floor(r() * casas.length), 1)[0]; ent(t.x, t.y + t.size * c, 'O alçapão (desce ao porão)', 'porao'); }
    for (const t of novas) sc.tokens.push(t);
    return novas.length;
  }
  function inimigos(sc, lugar, p, perigo, r) {
    const [a, b] = QUANTOS[perigo] || QUANTOS.medio, n = a + Math.floor(r() * (b - a + 1));
    const quem = quemVive(lugar, p), lista = typeof Fichas !== 'undefined' && Fichas.listaBest ? Fichas.listaBest() : [];
    const tagOk = (e, tags) => e.tags.some(t => tags.includes(t));
    let bons = lista.filter(e => tagOk(e, quem.tipos) && (tagOk(e, quem.biomas) || !e.tags.some(t => ['Floresta', 'Caverna', 'Cidade', 'Pântano', 'Montanha', 'Deserto', 'Planície', 'Mar', 'Neve', 'Masmorra', 'Ruínas', 'Subterrâneo'].includes(t))));
    if (!bons.length) bons = lista.filter(e => tagOk(e, quem.tipos));
    const lacaios = bons.filter(e => !e.tags.some(t => ['Chefe', 'Elite'].includes(t))), elites = bons.filter(e => e.tags.some(t => ['Chefe', 'Elite'].includes(t)));
    // onde: na masmorra, nas salas (menos a da entrada); no castelo sitiado, no acampamento de fora; no resto, em qualquer chão longe da chegada
    let area = null;
    if (p && Array.isArray(p.salas) && p.salas.length && (lugar === 'masmorra' || lugar === 'catacumbas')) area = p.salas.filter(q => q.papel !== 'entrada').map(q => ({ x: q.x + 1, y: q.y + 1, w: Math.max(1, q.w - 2), h: Math.max(1, q.h - 2) }));
    if (lugar === 'castelo' && p && p.estado === 'sitiado') area = [{ x: 1, y: sc.rows - 9, w: sc.cols - 2, h: 7 }];
    const pts = lugaresLivres(sc, n, chegadaDe(sc), area, r);
    const conta = new Map(), feitos = [];
    pts.forEach(([i, j], k) => {
      const x = i * sc.cell, y = j * sc.cell;
      const forte = perigo === 'dificil' && k === 0 && elites.length;
      const pool = forte ? elites : lacaios.length ? lacaios : bons;
      let t = null;
      if (pool.length) { const e = pool[Math.floor(r() * pool.length)]; t = Fichas.novoTokenBest(sc, e.id, x, y, { hidden: true }); }
      if (!t) {
        const tipo = quem.tipos[Math.floor(r() * quem.tipos.length)], nomes = GENERICOS[tipo] || GENERICOS.Humanoide;
        t = newToken(sc, x, y, { name: nomes[Math.floor(r() * nomes.length)], hidden: true, color: '#8f3d4a' });
        t.notes = 'Inimigo do lugar povoado (' + tipo.toLowerCase() + '): ligue a um inimigo do Bestiário pelo painel, se quiser.';
      }
      const base = t.name; conta.set(base, (conta.get(base) || 0) + 1); t.name = (base.slice(0, 54) + ' ' + conta.get(base)).trim();
      feitos.push(t);
    });
    for (const t of feitos) sc.tokens.push(t);
    return { n: feitos.length, doBest: feitos.filter(t => t.best).length };
  }
  function moradores(sc, lugar, p, r) {
    if (!DE_GENTE.has(lugar) || (lugar === 'castelo' && p && p.estado === 'ruinas')) return 0;
    const N = window.TC && window.TC.npc;
    const papeis = PAPEIS_DE[lugar] || PAPEIS_DE.vila, n = Math.min(papeis.length, 3 + Math.floor(r() * 4));
    let racas = [];
    try { const T = window.TC, d = T && T.ponte && T.dados && T.dados.col ? T.dados.col('documentos').pegar(N && N.RACAS) : null; if (N && d && d.dados) racas = N.normRacas(d.dados); } catch (e) { racas = []; }
    const dentroDe = p && Array.isArray(p.salas) && p.salas.length ? null : null;
    const pts = lugaresLivres(sc, n, null, dentroDe, r), feitos = [];
    pts.forEach(([i, j], k) => {
      const papel = papeis[k % papeis.length];
      let nome = (N ? null : null), notas = '', cor = '#4a6a8f';
      if (N) {
        try {
          const rr = mulberry(1 + Math.floor(r() * 2147483000));
          const raca = racas.length && N.escolherRaca ? N.escolherRaca(racas, null, null, rr) : null;
          const x = N.gerar(Object.assign({ papel, estilo: undefined }, raca ? { raca } : null), 1 + Math.floor(r() * 2147483000));
          const ds = N.descricao(x);
          nome = x.nome; notas = [ds.quem + '.', ds.aparencia, ds.jeito, x.motivacao ? 'Quer: ' + x.motivacao : '', x.segredo ? 'Esconde: ' + x.segredo : ''].filter(Boolean).join('\n');
        } catch (e) { console.error(e); }
      }
      if (!nome) nome = papel.charAt(0).toUpperCase() + papel.slice(1);
      const t = newToken(sc, i * sc.cell, j * sc.cell, { name: nome.slice(0, 60), hidden: true, color: cor });
      t.notes = notas.slice(0, 2000);
      feitos.push(t);
    });
    for (const t of feitos) sc.tokens.push(t);
    return feitos.length;
  }
  function tesouros(sc, perigo, r) {
    const guarda = sc.tokens.filter(t => ['bau', 'cofre', 'sarcofago', 'caixao'].includes(t.prop));
    const mult = { facil: 1, medio: 2, dificil: 4 }[perigo] || 2;
    const ITENS = [['Poção de cura', 'pocao'], ['Moedas antigas', 'material'], ['Joia de prata', 'material'], ['Pergaminho velho', 'material'], ['Runa gasta', 'runa'], ['Flechas', 'municao'], ['Bomba de fumaça', 'bomba']];
    let n = 0;
    for (const t of guarda) {
      if (r() < 0.35) continue;
      const itens = [];
      for (let k = 0, m = 1 + Math.floor(r() * 2); k < m; k++) { const [nome, tipo] = ITENS[Math.floor(r() * ITENS.length)]; itens.push({ nome, qtd: 1 + Math.floor(r() * mult), tipo }); }
      const s = cleanSaque({ itens, lapros: Math.round((5 + r() * 25) * mult), de: t.name });
      if (s) { t.saque = s; n++; }
    }
    return n;
  }

  /* o: { perigo, inimigos, moradores, tesouros } → o texto do que entrou (para o aviso) */
  function aplicar(sc, lugar, p, o) {
    o = o || {};
    const r = mulberry(((p && p.seed) || 7) ^ 0x2f6b9d1);
    const perigo = PERIGOS.some(x => x[0] === o.perigo) ? o.perigo : 'medio';
    const partes = [];
    luzes(sc, lugar);
    const ne = entradas(sc, lugar, p, r);
    if (ne) partes.push(ne === 1 ? '1 entrada para baixo' : ne + ' entradas para baixo');
    if (o.inimigos !== false) { const k = inimigos(sc, lugar, p, perigo, r); if (k.n) partes.push(`${k.n} ${k.n === 1 ? 'inimigo' : 'inimigos'}${k.doBest ? ` (${k.doBest} do Bestiário)` : ''}`); }
    if (o.moradores !== false) { const k = moradores(sc, lugar, p, r); if (k) partes.push(k === 1 ? '1 morador' : k + ' moradores'); }
    if (o.tesouros !== false) { const k = tesouros(sc, perigo, r); if (k) partes.push(k === 1 ? '1 baú com saque' : k + ' com saque'); }
    Persist.scene(sc.id);
    return partes.length ? 'Povoado: ' + partes.join(', ') + ' (ocultos dos jogadores).' : '';
  }
  // as escolhas da janela (lembradas neste navegador)
  const prefs = () => { const o = App.opt; return { on: o.genPovoar === true, perigo: PERIGOS.some(x => x[0] === o.genPerigo) ? o.genPerigo : 'medio', inimigos: o.genPovInim !== false, moradores: o.genPovMor !== false, tesouros: o.genPovTes !== false }; };
  function controles(K, mudou) {
    const pr = prefs(), set = (k, v) => { App.opt[k] = v; if (mudou) mudou(); };
    return h('div', { class: 'ger-pov', id: 'ger-pov' },
      K.toggle('ger-povoar', pr.on, v => set('genPovoar', v), 'Povoar o lugar (luzes, inimigos, moradores e tesouros, ocultos)'),
      pr.on ? h('div', { class: 'ger-pov-op' },
        K.field('Perigo', K.seg('ger-perigo', pr.perigo, PERIGOS, v => set('genPerigo', v)), 'stack'),
        K.toggle('ger-pov-inim', pr.inimigos, v => set('genPovInim', v), 'Inimigos (do Bestiário que combina)'),
        K.toggle('ger-pov-mor', pr.moradores, v => set('genPovMor', v), 'Moradores (nos lugares de gente)'),
        K.toggle('ger-pov-tes', pr.tesouros, v => set('genPovTes', v), 'Tesouros nos baús')) : null);
  }
  return { aplicar, controles, prefs, quemVive, PERIGOS, lugaresLivres };
})();
