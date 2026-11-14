/* ---------------------------------------------------------------
   10g. INTERIOR — a planta de dentro de um prédio (lote 7)
   Dois cliques no marcador de Entrada de um prédio da cidade abrem "Gerar o interior": o tipo do prédio e o estilo já
   vêm escolhidos (dá para trocar), a prévia mostra a planta e "Gerar outro" sorteia de novo. Uma Entrada que o mestre
   pôs à mão (sem prédio gerado) também gera: aí ele escolhe o tamanho. A planta tem o dobro das
   medidas do prédio (cada quadrado da cidade vira dois por dois), é dividida em salas conforme o tipo (a taverna com o
   salão, a cozinha e os quartos; o templo com a nave e a sacristia; a casa do senhor com o salão, a biblioteca, os
   quartos e a cozinha…), com uma porta entre as salas, janelas nas paredes de fora e os móveis de cada sala, no estilo
   do lugar. Sai uma cena nova, dentro da de fora (na lista de cenas), com a Saída junto da porta de entrada levando de
   volta; o marcador fica ligado à cena nova. Nada sai escrito.
   --------------------------------------------------------------- */
const Interior = (() => {
  // as salas de cada tipo: a primeira é a da porta de entrada; min: quantas no mínimo; grande: a sala da porta fica com
  // a faixa da frente, inteira (essa parte da largura ou do fundo), e não se divide mais (o salão, a nave, a forja)
  const PLANTAS = {
    casa: { n: 'Casa', salas: ['sala', 'quarto', 'banheiro', 'cozinha'], min: 3 },      // (lote 128: o banheiro)
    loja: { n: 'Loja', salas: ['loja', 'deposito', 'quarto'], min: 2 },
    taverna: { n: 'Taverna', salas: ['salao', 'cozinha', 'quarto', 'quarto'], min: 3, grande: 0.58 },
    ferraria: { n: 'Ferraria', salas: ['forja', 'deposito'], min: 2, grande: 0.62 },
    armazem: { n: 'Armazém', salas: ['armazem', 'escritorio'], min: 1, grande: 0.72 },
    templo: { n: 'Templo', salas: ['nave', 'sacristia'], min: 2, grande: 0.72 },
    senhor: { n: 'Casa do senhor', salas: ['nobre', 'biblioteca', 'quarto', 'banheiro', 'cozinha', 'quarto'], min: 4, grande: 0.42 },
    quartel: { n: 'Quartel', salas: ['refeitorio', 'dormitorio', 'arsenal'], min: 3 },
    // (lote 7, parte 4b) o navio: a planta vem do Navio (do tamanho do convés, com o porão e as cabines)
    navio: { n: 'Navio', salas: ['capitao', 'cabine', 'porao', 'alojamento', 'paiol'], min: 1, so: true, planta: o => Navio.planta(Object.assign({}, o, { tipo: 'navio' })) },
    // (lote 7, parte 4b) as moradias da tribo: a planta vem da Tribo (uma sala só, redonda nas tendas, nas iurtes e nos
    // iglus, com a fogueira no meio, as peles e os baús); fogo: a fogueira já ilumina (nenhuma luz da sala à noite)
    tenda: { n: 'Tenda', salas: ['tenda'], min: 1, so: true, fogo: true, planta: o => Tribo.planta(o) },
    iurte: { n: 'Iurte', salas: ['iurte'], min: 1, so: true, fogo: true, planta: o => Tribo.planta(o) },
    iglu: { n: 'Iglu', salas: ['iglu'], min: 1, so: true, fogo: true, planta: o => Tribo.planta(o) },
    cabana: { n: 'Cabana', salas: ['cabana'], min: 1, so: true, fogo: true, planta: o => Tribo.planta(o) },
    palafita: { n: 'Palafita', salas: ['cabana'], min: 1, so: true, fogo: true, planta: o => Tribo.planta(o) },
  };
  const DO_VILAREJO = { capela: 'templo', estalagem: 'taverna', celeiro: 'armazem', moinho: 'armazem', estabulo: 'armazem', torre: 'quartel', guarita: 'quartel', banhos: 'casa', guilda: 'loja', escola: 'casa' };      // (lote 61: os prédios novos usam a planta mais parecida)
  const TIPOS_I = Object.keys(PLANTAS).filter(k => !PLANTAS[k].so);      // (o navio e as moradias da tribo só aparecem no marcador deles)
  // os móveis de cada sala, na ordem em que entram (o tapete que vem primeiro fica por baixo da mesa); com "#", uma
  // arrumação: o estrado do altar, a colunata, os bancos e a pia de água benta da nave; o balcão no fundo da taverna e
  // da loja; o palquinho do bardo; a mesa alta no estrado do salão nobre e as colunas; a tina da forja; o alçapão do
  // porão no armazém. O estrado, o palco, a pia, a tina e o alçapão são áreas de terreno (com a altura ou a fundura)
  const MOVEIS = {
    sala: ['tapete', 'mesa', 'cadeira', 'cadeira', 'estante', 'bau'],
    quarto: ['cama', 'bau', 'vela', 'tapete'],
    banheiro: ['banheira', 'latrina', 'lavatorio', 'espelho', 'toalheiro', 'tina'],      // (lote 128) se a banheira não cabe, a tina
    // (lote 54: os sacos de grãos e as frutas na cozinha, na loja e no depósito; o quadro de missões na taverna; o troféu
    //  no salão nobre; a pedra de amolar e os lingotes na forja; o atril no templo e na biblioteca; o boneco e o alvo no
    //  arsenal do quartel; a cortina na sacristia)
    cozinha: ['fogao', 'piaCozinha', 'mesa', 'barril', 'jarro', 'sacos', 'prateleiraPanelas'],      // (lote 148: o fogão a lenha, a pia e as panelas)
    loja: ['#balcao', 'estante', 'estante', 'caixote', 'barril', 'jarro', 'frutas', 'sacos'],
    deposito: ['caixote', 'barril', 'caixote', 'estante', 'barril', 'sacos'],
    salao: ['#balcao', '#palco', 'mesa', 'cadeira', 'cadeira', 'mesa', 'cadeira', 'cadeira', 'barril', 'mesa', 'cadeira', 'braseiro', 'quadroMissoes'],
    nobre: ['#mesaAlta', 'tapete', 'cadeira', 'cadeira', '#colunas', 'estatua', 'estatua', 'braseiro', 'estante', 'trofeu', 'sofa', 'poltrona', 'aparador', 'vasoGrande'],      // (lote 148: o sofá, a poltrona, o aparador e o vaso)
    forja: ['braseiro', 'bigorna', '#tina', 'barril', 'caixote', 'bigorna', 'rebolo', 'lingotes'],
    armazem: ['#alcapao', 'caixote', 'caixote', 'barril', 'estante', 'barril', 'caixote', 'jarro', 'barril', 'sacos', 'sacos'],
    escritorio: ['mesa', 'cadeira', 'estante', 'bau'],
    nave: ['altar', 'estatua', 'estatua', 'vela', 'vela', '#estrado', '#colunata', '#bancos', '#pia', 'atril'],
    sacristia: ['estante', 'bau', 'vela', 'cortina'],
    biblioteca: ['estante', 'estante', 'estante', 'mesa', 'cadeira', 'vela', 'atril'],
    dormitorio: ['cama', 'cama', 'cama', 'cama', 'bau', 'bau'],
    arsenal: ['estante', 'caixote', 'bau', 'estante', 'boneco', 'alvo'],
    refeitorio: ['mesa', 'banco', 'banco', 'mesa', 'banco', 'banco', 'barril'],
    // (lote 141) os andares de cima, o porão e a base secreta
    sotao: ['bau', 'caixote', 'cestoRoupa', 'caixote', 'chamine', 'estatua'],
    adega: ['prateleiraVinho', 'tonel', 'barril', 'barril', 'prateleiraVinho', 'vela'],
    despensa: ['barril', 'sacos', 'caixote', 'estante', 'jarro', 'sacos'],
    galeria: ['tapete', 'estatua', 'estatua', 'candelabro', 'trofeu', 'estatua'],
    cela: ['grilhoes', 'feno', 'jarro'],
    reuniao: ['mesaGuerra', 'cadeira', 'cadeira', 'cadeira', 'cadeira', 'estante', 'candelabro'],
    laboratorio: ['alambique', 'caldeirao', 'estante', 'jarro', 'vela', 'bau'],
    cofre: ['cofre', 'cofre', 'bau', 'lingotes', 'sacos'],
    tunel: ['tunel', 'escombros', 'caixote', 'lampiao'],
  };
  // perto de quê cada móvel gosta de ficar (a cadeira junto da mesa, o baú e a vela junto da cama, as estátuas junto do altar)
  const PERTO = { cadeira: ['mesa', 'mesaGuerra'], banco: ['mesa'], vela: ['altar', 'cama', 'mesa'], bau: ['cama'], estatua: ['altar'], bigorna: ['braseiro'], jarro: ['braseiro', 'mesa'] };
  // o estilo troca alguns móveis e põe outros
  const TROCA = { oriental: { cadeira: 'almofada', vela: 'lanterna' }, desertico: { cadeira: 'almofada' }, anao: { vela: 'braseiro' } };
  const EXTRA = { nordico: { sala: 'fogueira', salao: 'fogueira', nobre: 'fogueira' }, elfico: { sala: 'flores', quarto: 'flores', salao: 'flores', nobre: 'flores' }, desertico: { sala: 'jarro', quarto: 'tapete' }, oriental: { sala: ['lanterna', 'tatame', 'bonsai'], quarto: ['tatame', 'biombo'], salao: ['lanterna', 'biombo'], nobre: ['lanterna', 'biombo', 'bonsai'] } };     // (lote 54: o tatame, o biombo e o bonsai)
  // o piso de cada tipo (pelo tipo do vilarejo que mais se parece)
  const PISO_DE = { casa: 'casa', loja: 'armazem', taverna: 'taverna', ferraria: 'ferraria', armazem: 'armazem', templo: 'capela', senhor: 'taverna', quartel: 'ferraria', navio: 'armazem' };
  const tipoValido = t => (PLANTAS[t] ? t : PLANTAS[DO_VILAREJO[t]] ? DO_VILAREJO[t] : 'casa');
  /* (lote 141) Os andares: as salas que o interior sabe mobiliar, os temas de cada andar e o da base secreta. */
  const TEMAS_CIMA = {
    quartos: { n: 'Quartos', lista: ['quarto', 'quarto', 'banheiro', 'quarto'] },
    servico: { n: 'Serviço', lista: ['cozinha', 'despensa', 'deposito', 'quarto'] },
    trabalho: { n: 'Trabalho', lista: ['escritorio', 'biblioteca', 'deposito'] },
    luxo: { n: 'Luxo', lista: ['nobre', 'galeria', 'biblioteca', 'banheiro'] },
    quartel: { n: 'Quartel', lista: ['dormitorio', 'refeitorio', 'arsenal', 'dormitorio'] },
    sotao: { n: 'Sótão', lista: ['sotao', 'deposito'] },
    deposito: { n: 'Depósito', lista: ['deposito', 'armazem', 'despensa'] },
  };
  const TEMAS_PORAO = {
    adega: { n: 'Adega e despensa', lista: ['adega', 'despensa', 'deposito'] },
    celas: { n: 'Celas', lista: ['cela', 'cela', 'deposito'] },
    deposito: { n: 'Depósito', lista: ['deposito', 'deposito', 'adega'] },
  };
  const BASE_I = ['reuniao', 'arsenal', 'dormitorio', 'laboratorio', 'cofre', 'cela', 'tunel'];
  const catDe = tipo => ({
    salas: Object.keys(MOVEIS), cima: TEMAS_CIMA, porao: TEMAS_PORAO, base: BASE_I,
    padrao: (n, N) => (n < 0 ? (tipo === 'quartel' ? 'celas' : 'adega')
      : n === N && N >= 2 && tipo !== 'quartel' ? 'sotao'
        : tipo === 'quartel' ? 'quartel' : tipo === 'senhor' && n === 2 ? 'luxo' : tipo === 'armazem' || tipo === 'ferraria' ? 'deposito' : 'quartos'),
  });
  // o tamanho, para uma Entrada posta à mão (em quadrados de fora; a planta tem o dobro)
  const TAMANHOS_I = { pequeno: { n: 'Pequeno', w: 4, h: 4 }, medio: { n: 'Médio', w: 6, h: 5 }, grande: { n: 'Grande', w: 8, h: 7 } };

  /* ================= a planta (conta pura) ================= */
  // o: { tipo, w, h, p (o lado da porta), estilo, f (forma), seed, andares (lote 141: a escolha da PlantaAndares) }
  const subS = (seed, k) => (((Math.imul(seed ^ 0x5bd1e995, 0x01000193 + k * 0x9e3779b1) >>> 0) ^ (k * 0x85ebca6b)) >>> 0) || (k + 1);
  function gerar(o) {
    o = o || {};
    if (o.f === 'navio') return PLANTAS.navio.planta(o);
    if (PLANTAS[o.tipo] && PLANTAS[o.tipo].planta) return PLANTAS[o.tipo].planta(o);
    const tipo = tipoValido(o.tipo), cat = catDe(tipo);
    const a = o.andares ? PlantaAndares.normalizar(o.andares, cat) : null;
    if (!a || (!a.cima && !a.porao)) return gerar1(o, null);
    /* (lote 141) Os andares: todos do mesmo tamanho (as cenas ficam alinhadas: quem sobe aparece no mesmo lugar). As
       escadas: A e B (nos cantos de cima) se revezam subindo; C desce do térreo ao 1º porão; D, do 1º ao 2º (com a base,
       um alçapão escondido). */
    const W = clamp(Math.round(Number(o.w) || 4) * 2, 6, 24), H = clamp(Math.round(Number(o.h) || 4) * 2, 6, 24), seed = (Math.round(Number(o.seed)) >>> 0) || 1;
    const A = [W - 2, 1], B = [1, 1], C = [1, H - 2], D = [W - 2, H - 2];
    const esc = (c, para, de, oc) => ({ x: c[0], y: c[1], para, de, oculto: !!oc });
    const N = a.cima, P = a.porao;
    const p0 = gerar1(o, { nivel: 0, escadas: [].concat(N ? [esc(A, 1, 0)] : [], P ? [esc(C, -1, 0)] : []) });
    const andares = [];
    const outro = k => Object.assign({}, o, { seed: (subS(seed, k) % 2147483000) + 1 });
    for (let n = 1; n <= N; n++) {
      const baixo = n % 2 ? A : B, cima = n % 2 ? B : A;
      andares.push(gerar1(outro(300 + n), { nivel: n, entra: baixo, semPorta: true, lista: PlantaAndares.salasDe(a, cat, n), escadas: [esc(baixo, n - 1, n)].concat(n < N ? [esc(cima, n + 1, n)] : []) }));
    }
    for (let n = -1; n >= -P; n--) {
      const pp = PlantaAndares.papelDoNivel(a, n), sobe = n === -1 ? C : D;
      const escs = [esc(sobe, n + 1, n)].concat(n === -1 && P === 2 ? [esc(D, -2, -1, a.base)] : []);
      const ex = { nivel: n, entra: sobe, semPorta: true, subsolo: true, escadas: escs };
      if (pp === 'base') Object.assign(ex, { lista: PlantaAndares.salasDe(a, cat, 'base'), base: true });
      else { ex.lista = PlantaAndares.salasDe(a, cat, n); if (pp === 'dividido') ex.baseLista = PlantaAndares.salasDe(a, cat, 'base'); }
      andares.push(gerar1(outro(400 - n), ex));
    }
    p0.andares = andares; p0.and = a;
    return p0;
  }
  /* Um andar. ex (lote 141): { nivel, lista (os papéis das salas, a primeira é a da escada de baixo), entra (a casa da
     escada de baixo), semPorta, subsolo (sem janelas, piso de lajes), escadas [{ x, y, para, de, oculto }], base (o
     andar todo é a base secreta), baseLista (o porão se divide: a base fica atrás de uma parede com a porta secreta) } */
  function gerar1(o, ex) {
    const tipo = tipoValido(o.tipo), PL = PLANTAS[tipo], estilo = Estilos.valido(o.estilo);
    const W = clamp(Math.round(Number(o.w) || 4) * 2, 6, 24), H = clamp(Math.round(Number(o.h) || 4) * 2, 6, 24);
    const seed = (Math.round(Number(o.seed)) >>> 0) || 1, rnd = mulberry(seed);
    const r = (a, b) => a + rnd() * (b - a), ri = (a, b) => Math.floor(r(a, b + 1));
    const forma = o.f === 'oct' && W >= 8 && H >= 8 ? 'oct' : 'ret', corte = forma === 'oct' ? 2 : 0;
    const lado = typeof o.p === 'string' && o.p.length === 1 && 'nsol'.includes(o.p) ? o.p : 's';
    // a porta de entrada, no meio do lado (fora dos cantos cortados)
    const len = lado === 'n' || lado === 's' ? W : H, d = clamp(Math.floor(len / 2) - 1 + ri(0, 1), corte + 1, len - corte - 2);
    const porta = lado === 'n' ? { lado, x1: d, y1: 0, x2: d + 1, y2: 0 } : lado === 's' ? { lado, x1: d, y1: H, x2: d + 1, y2: H } : lado === 'o' ? { lado, x1: 0, y1: d, x2: 0, y2: d + 1 } : { lado, x1: W, y1: d, x2: W, y2: d + 1 };
    // a casa logo para dentro da porta (lote 141: num andar sem porta, a casa da escada de baixo)
    const entra = ex && ex.entra ? ex.entra.slice() : lado === 'n' ? [d, 0] : lado === 's' ? [d, H - 1] : lado === 'o' ? [0, d] : [W - 1, d];
    // as salas: divide a maior até ter quantas o tipo pede (pela área); (lote 141) num andar com lista, quantas a lista pede
    const lista0 = ex && ex.lista && ex.lista.length ? ex.lista : null, baseL = ex && ex.baseLista && ex.baseLista.length && W >= 8 ? ex.baseLista : null;
    const cabem = area => Math.max(1, Math.floor(area / 14));
    const n = lista0 ? clamp(lista0.length, 1, cabem(W * H)) : clamp(Math.round((W * H) / 34), PL.min, PL.salas.length);
    const salas = [{ x: 0, y: 0, w: W, h: H }], paredes = [];
    if (ex && ex.base) salas[0].base = true;
    const contem = (q, [i, j]) => i >= q.x && i < q.x + q.w && j >= q.y && j < q.y + q.h;
    // divide a sala k com uma parede vertical (emPe) ou deitada em t; a porta entre as duas fica fora das pontas
    function dividir(k, emPe, t) {
      const q = salas[k];
      const a = emPe ? { x: q.x, y: q.y, w: t, h: q.h } : { x: q.x, y: q.y, w: q.w, h: t }, b = emPe ? { x: q.x + t, y: q.y, w: q.w - t, h: q.h } : { x: q.x, y: q.y + t, w: q.w, h: q.h - t };
      if (q.base) a.base = b.base = true;      // (lote 141) o lado da base continua base
      const comp = emPe ? q.h : q.w, ini = emPe ? q.y : q.x, pd = comp >= 3 ? ri(ini + 1, ini + comp - 2) : ini;
      const linha = emPe ? { x1: q.x + t, y1: q.y, x2: q.x + t, y2: q.y + q.h } : { x1: q.x, y1: q.y + t, x2: q.x + q.w, y2: q.y + t };
      paredes.push(Object.assign(linha, { porta: emPe ? { x1: q.x + t, y1: pd, x2: q.x + t, y2: pd + 1 } : { x1: pd, y1: q.y + t, x2: pd + 1, y2: q.y + t } }));
      salas.splice(k, 1, a, b);
    }
    // (lote 141) o porão dividido: a base (à direita) fica atrás de uma parede com a porta secreta
    let alvoN = null;
    if (baseL) {
      const xs = clamp(Math.round(W * 0.5), 3, W - 3);
      dividir(0, true, xs);
      paredes[paredes.length - 1].secreta = true;
      salas[1].base = true;
      alvoN = { c: clamp(n, 1, cabem(xs * H)), b: clamp(baseL.length, 1, cabem((W - xs) * H)) };
    }
    // a faixa da frente: a parede é paralela à da porta, e a sala da porta fica com a parte "grande"
    if (PL.grande && n > 1 && !lista0) {
      const emPe = lado === 'o' || lado === 'l', L = emPe ? W : H, g = clamp(Math.round(L * PL.grande), 3, L - 3);
      dividir(0, emPe, lado === 'n' || lado === 'o' ? g : L - g);
    }
    for (let volta = 0; (alvoN || salas.length < n) && volta < 40; volta++) {
      const fixa = PL.grande && !lista0 ? salas.find(q => contem(q, entra)) : null;
      const falta = q => (alvoN ? salas.filter(s2 => !!s2.base === !!q.base).length < (q.base ? alvoN.b : alvoN.c) : true);
      const cand = salas.map((q, k) => [q, k]).filter(([q]) => q !== fixa && (q.w >= 6 || q.h >= 6) && falta(q)).sort((a, b) => b[0].w * b[0].h - a[0].w * a[0].h);
      if (!cand.length) break;
      const [q, k] = cand[0], emPe = q.w >= q.h, L = emPe ? q.w : q.h;   // emPe: a parede nova é vertical (divide a largura)
      dividir(k, emPe, clamp(Math.round(L * r(0.38, 0.62)), 3, L - 3));
    }
    // os papéis: a sala da porta é a primeira; as outras, das maiores para as menores
    const comuns = salas.filter(q => !q.base || (ex && ex.base));
    const primeira = comuns.find(q => contem(q, entra)) || comuns[0];
    const resto = comuns.filter(q => q !== primeira).sort((a, b) => b.w * b.h - a.w * a.h);
    const daBase = ex && ex.base ? [] : salas.filter(q => q.base).sort((a, b) => b.w * b.h - a.w * a.h);
    const lista = [primeira].concat(resto, daBase);
    // (lote 128) o banheiro fica com a menor sala (a lista vai das maiores para as menores)
    // (lote 141) num andar com lista, os papéis vêm dela (a mais, a última se repete); a base, com os dela
    const L = lista0 || PL.salas, nc = 1 + resto.length;
    const pap = lista.slice(0, nc).map((q, i) => L[Math.min(i, L.length - 1)]), kb = pap.indexOf('banheiro');
    if (kb > 0 && kb < pap.length - 1) { pap.splice(kb, 1); pap.push('banheiro'); }
    daBase.forEach((q, i) => pap.push(baseL[Math.min(i, baseL.length - 1)]));
    lista.forEach((q, i) => { q.papel = pap[i]; q.moveis = []; });
    // as janelas: uma por sala, numa parede de fora (nos lados retos, longe da porta de entrada); no porão, nenhuma
    const janelas = [];
    for (const q of ex && ex.subsolo ? [] : lista) {
      const lados = [];
      if (q.y === 0) lados.push('n');
      if (q.y + q.h === H) lados.push('s');
      if (q.x === 0) lados.push('o');
      if (q.x + q.w === W) lados.push('l');
      for (const l of lados.sort(() => rnd() - 0.5)) {
        const horiz = l === 'n' || l === 's', a0 = (horiz ? q.x : q.y), a1 = a0 + (horiz ? q.w : q.h), lim = horiz ? W : H;
        const lo = Math.max(a0 + 1, corte + 1), hi = Math.min(a1 - 2, lim - corte - 2);
        if (hi < lo) continue;
        let p0 = Math.floor((lo + hi) / 2);
        if (l === lado && Math.abs(p0 - d) < 2) p0 = p0 + 2 <= hi ? p0 + 2 : p0 - 2 >= lo ? p0 - 2 : -1;
        if (p0 < lo || p0 > hi) continue;
        janelas.push(horiz ? { lado: l, x1: p0, y1: l === 'n' ? 0 : H, x2: p0 + 1, y2: l === 'n' ? 0 : H } : { lado: l, x1: l === 'o' ? 0 : W, y1: p0, x2: l === 'o' ? 0 : W, y2: p0 + 1 });
        break;
      }
    }
    // os móveis de cada sala: longe das portas, fora dos cantos cortados
    const fora = (i, j) => corte && (i + j < corte || (W - 1 - i) + j < corte || i + (H - 1 - j) < corte || (W - 1 - i) + (H - 1 - j) < corte);
    const passagens = new Set();
    const passagem = (i, j) => passagens.add(i + ',' + j);
    // diante da porta de entrada (duas casas) e dos dois lados de cada porta de dentro
    { const di = lado === 'l' ? -1 : lado === 'o' ? 1 : 0, dj = lado === 's' ? -1 : lado === 'n' ? 1 : 0; for (let k = 0; k < 2; k++) passagem(entra[0] + di * k, entra[1] + dj * k); }
    for (const pw of paredes) { const p = pw.porta; if (p.x1 === p.x2) { passagem(p.x1 - 1, p.y1); passagem(p.x1, p.y1); } else { passagem(p.x1, p.y1 - 1); passagem(p.x1, p.y1); } }
    for (const e of (ex && ex.escadas) || []) passagem(e.x, e.y);      // (lote 141) as escadas ficam livres
    const TR = TROCA[estilo] || {}, EX = EXTRA[estilo] || {};
    // o relevo (as áreas de terreno: o estrado, o palco, a água, o alçapão) e as formas de enfeite, em quadrados da planta
    const relevo = [], formas = [];
    // encosta (pela beira) ou fica do lado (pela quina) de um móvel m
    // (lote 121) as medidas de um móvel na planta (o comprido, pelo retângulo dele)
    const dims = m => (m.fw ? tokWH({ prop: m.id, fw: m.fw, fh: m.fh, rot: m.rot }) : [m.s, m.s]);
    const encosta = (i, j, s, m) => { const [mw, mh] = dims(m); return ((i + s === m.x || i === m.x + mw) && j < m.y + mh && j + s > m.y) || ((j + s === m.y || j === m.y + mh) && i < m.x + mw && i + s > m.x); };
    const aoLado = (i, j, s, m, g) => { const [mw, mh] = dims(m); return i < m.x + mw + g && i + s > m.x - g && j < m.y + mh + g && j + s > m.y - g; };
    // o giro de quem fica junto de m, virado para ele (a cadeira de frente para a mesa; o banco ao comprido)
    const viradoPara = (i, j, s, m, id) => {
      const [mw, mh] = dims(m), dx = (i + s / 2) - (m.x + mw / 2), dy = (j + s / 2) - (m.y + mh / 2), deLado = Math.abs(dx) > Math.abs(dy);
      if (id === 'banco') return deLado ? 90 : 0;
      return deLado ? (dx < 0 ? 270 : 90) : (dy < 0 ? 0 : 180);
    };
    // virado para dentro da sala, de costas para a parede mais perto (a cabeceira da cama, as lombadas da estante)
    const deCostas = (i, j, s, q) => { const b = [j - q.y, q.y + q.h - s - j, i - q.x, q.x + q.w - s - i], k = b.indexOf(Math.min(...b)); return [0, 180, 270, 90][k]; };
    for (const q of lista) {
      // ocup: os móveis; sob: os tapetes (um móvel pode ficar em cima do tapete; um tapete não fica em cima de nada)
      const ocup = new Set(), sob = new Set();
      const livre = (i, j, tapete) => i >= q.x && j >= q.y && i < q.x + q.w && j < q.y + q.h && !fora(i, j) && !passagens.has(i + ',' + j) && !ocup.has(i + ',' + j) && !(tapete && sob.has(i + ',' + j));
      const livreS = (i, j, s) => { for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) if (!livre(i + a, j + b, false)) return false; return true; };
      const poe = (id, i, j, rot, arranjo) => {
        const s = Props.P[id].size || 1, d = Props.P[id];
        // (lote 121) o comprido com costas (a cama, a estante): ocupa só o retângulo dele, rente à parede, dentro do quadrado
        if (d.fw && d.costas && s > 1) {
          const tk = { prop: id, rot: rot || 0, fw: Math.max(1, Math.round((d.legado ? d.legado.w : 1) * s)), fh: Math.max(1, Math.round((d.legado ? d.legado.h : 1) * s)) }, [w, h] = tokWH(tk);
          const r4 = ((Math.round((rot || 0) / 90) % 4) + 4) % 4, costas = ['n', 'l', 's', 'o'][(['n', 'l', 's', 'o'].indexOf(d.costas) + r4) % 4];
          const ox = s - w <= 0 ? 0 : costas === 'o' ? 0 : costas === 'l' ? s - w : i === q.x ? 0 : i + s === q.x + q.w ? s - w : 0;
          const oy = s - h <= 0 ? 0 : costas === 'n' ? 0 : costas === 's' ? s - h : j === q.y ? 0 : j + s === q.y + q.h ? s - h : 0;
          for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) ocup.add((i + ox + a) + ',' + (j + oy + b));
          const m = { id, x: i + ox, y: j + oy, s, fw: tk.fw, fh: tk.fh };
          if (rot) m.rot = rot;
          if (arranjo) m.arranjo = true;
          q.moveis.push(m);
          return;
        }
        for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) (id === 'tapete' ? sob : ocup).add((i + a) + ',' + (j + b));
        const m = { id, x: i, y: j, s };
        if (rot) m.rot = rot;
        if (arranjo) m.arranjo = true;
        q.moveis.push(m);
      };
      // a sala vista da porta: u vai da parede da porta para o fundo, v de um lado ao outro (vc: a linha da porta)
      const U = lado === 'n' || lado === 's' ? q.h : q.w, V = lado === 'n' || lado === 's' ? q.w : q.h;
      const ij = (u, v) => (lado === 's' ? [q.x + v, q.y + q.h - 1 - u] : lado === 'n' ? [q.x + v, q.y + u] : lado === 'o' ? [q.x + u, q.y + v] : [q.x + q.w - 1 - u, q.y + v]);
      const uv = (i, j) => (lado === 's' ? [q.y + q.h - 1 - j, i - q.x] : lado === 'n' ? [j - q.y, i - q.x] : lado === 'o' ? [i - q.x, j - q.y] : [q.x + q.w - 1 - i, j - q.y]);
      const vc = clamp((lado === 'n' || lado === 's' ? d - q.x : d - q.y), 0, V - 1);
      const rotFrente = { s: 0, n: 180, o: 90, l: 270 }[lado], rotDeitado = lado === 'n' || lado === 's' ? 0 : 90;
      const comColunata = V >= 7 && U >= 7, c0 = V >= 12 ? 2 : 1;
      // um retângulo dado em (u, v), na planta; e as casas dele marcadas como "chão coberto" (o tapete não cai nelas)
      const retUV = (u0, u1, v0, v1) => { const [a, b] = ij(u0, v0), [c2, d2] = ij(u1, v1); return { x: Math.min(a, c2), y: Math.min(b, d2), w: Math.abs(a - c2) + 1, h: Math.abs(b - d2) + 1 }; };
      const marcaSob = r => { for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) sob.add(i + ',' + j); };
      // as arrumações: a colunata e os bancos da nave, o balcão (da taverna e da loja), as colunas do salão nobre
      const ARRANJOS = {
        colunata() {
          if (!comColunata) return;
          for (let u = 2; u <= U - 3; u += 3) for (const v of [c0, V - 1 - c0]) { const [i, j] = ij(u, v); if (livreS(i, j, 1)) poe('coluna', i, j, 0, true); }
        },
        bancos() {
          const m0 = comColunata ? c0 + 1 : 1, m1 = comColunata ? V - 2 - c0 : V - 2;
          for (let u = 3; u <= U - 4; u += 2) for (let v = m0; v <= m1; v++) {
            if (Math.abs(v - vc) <= 1) continue;                              // o corredor do meio, da porta ao altar
            const [i, j] = ij(u, v); if (livreS(i, j, 1)) poe('banco', i, j, rotDeitado, true);
          }
        },
        balcao() {
          const len = clamp(Math.round(V / 3), 2, 5), u = q.papel === 'loja' && U >= 6 ? U - 3 : U - 2;
          if (u < 2 || V < len + 2) return;
          // encostado num dos lados (o outro lado fica aberto, para passar), o mais longe das portas
          let melhor = null;
          for (const v0 of [0, V - len]) {
            const cel = Array.from({ length: len }, (_, k) => ij(u, v0 + k));
            if (!cel.every(([i, j]) => livreS(i, j, 1))) continue;
            let dist = Infinity;
            for (const ps of passagens) { const [pi, pj] = ps.split(',').map(Number); for (const [i, j] of cel) dist = Math.min(dist, Math.abs(pi - i) + Math.abs(pj - j)); }
            if (!melhor || dist > melhor.dist) melhor = { v0, dist, cel };
          }
          if (!melhor) return;
          for (const [i, j] of melhor.cel) poe('balcao', i, j, rotFrente, true);
          // um barril atrás, na ponta encostada na parede
          const [bi, bj] = ij(U - 1, melhor.v0 === 0 ? 0 : V - 1);
          if (q.papel === 'salao' && livreS(bi, bj, 1)) poe('barril', bi, bj, 0, true);
        },
        colunas() {
          if (U < 5 || V < 8) return;
          for (const u of [1, U - 2]) for (let v = 2; v <= V - 3; v += 3) {
            if (Math.abs(v - vc) <= 1) continue;
            const [i, j] = ij(u, v); if (livreS(i, j, 1)) poe('coluna', i, j, 0, true);
          }
        },
        // o estrado do altar: as duas fileiras do fundo, de dois quadrados para cada lado do altar (meio metro acima)
        estrado() {
          const alt = q.moveis.find(m => m.id === 'altar');
          if (!alt) return;
          const [, va] = uv(alt.x, alt.y), r = retUV(U - 2, U - 1, Math.max(0, va - 2), Math.min(V - 1, va + 2));
          relevo.push(Object.assign({ t: 'plataforma', alt: 0.5, k: 'rect' }, r));
          marcaSob(r);
        },
        // a pia de água benta, perto da entrada, ao lado do corredor
        pia() {
          for (const v of [vc + 2, vc - 2, vc + 3, vc - 3]) {
            if (v < 0 || v >= V) continue;
            const [i, j] = ij(1, v);
            if (!livreS(i, j, 1)) continue;
            ocup.add(i + ',' + j);
            relevo.push({ t: 'agua', alt: -0.5, k: 'ell', x: i + 0.15, y: j + 0.15, w: 0.7, h: 0.7 });
            formas.push({ k: 'ell', x: i + 0.08, y: j + 0.08, w: 0.84, h: 0.84, f: null, s: '#9a9ca4', sw: 0.1 });
            return;
          }
        },
        // o palquinho do bardo: um bloco de 2 × 2 livre na metade do fundo, de preferência num canto
        palco() {
          let melhor = null;
          for (let u = U - 2; u >= Math.ceil(U / 2) - 1 && u >= 1; u--) for (let v = 0; v + 1 < V; v++) {
            const cel = [ij(u, v), ij(u + 1, v), ij(u, v + 1), ij(u + 1, v + 1)];
            if (!cel.every(([i, j]) => livreS(i, j, 1))) continue;
            const canto = Math.min(v, V - 2 - v) + (U - 2 - u), dp = Math.min(...[...passagens].map(ps => { const [pi, pj] = ps.split(',').map(Number); return Math.min(...cel.map(([i, j]) => Math.abs(pi - i) + Math.abs(pj - j))); }));
            if (dp < 2) continue;
            if (!melhor || canto < melhor.canto) melhor = { canto, cel };
          }
          if (!melhor) return;
          for (const [i, j] of melhor.cel) ocup.add(i + ',' + j);
          const xs = melhor.cel.map(c => c[0]), ys = melhor.cel.map(c => c[1]);
          relevo.push({ t: 'plataforma', alt: 0.5, k: 'rect', x: Math.min(...xs), y: Math.min(...ys), w: 2, h: 2 });
        },
        // a mesa alta do salão nobre, num estrado no fundo (as cadeiras vêm depois, junto dela)
        mesaAlta() {
          const v0 = clamp(vc - 1, 0, V - 2), cel = [ij(U - 2, v0), ij(U - 1, v0), ij(U - 2, v0 + 1), ij(U - 1, v0 + 1)];
          const r = retUV(U - 2, U - 1, Math.max(0, v0 - 2), Math.min(V - 1, v0 + 3));
          relevo.push(Object.assign({ t: 'plataforma', alt: 0.5, k: 'rect' }, r));
          marcaSob(r);
          if (cel.every(([i, j]) => livreS(i, j, 1))) { const xs = cel.map(c => c[0]), ys = cel.map(c => c[1]); poe('mesa', Math.min(...xs), Math.min(...ys), 0, false); }
        },
        // a tina de água da forja (para temperar o ferro), junto da bigorna ou do braseiro
        tina() {
          const perto = q.moveis.filter(m => m.id === 'bigorna' || m.id === 'braseiro');
          for (let j = q.y; j < q.y + q.h; j++) for (let i = q.x; i < q.x + q.w; i++) for (const [w2, h2] of [[2, 1], [1, 2]]) {
            if (i + w2 > q.x + q.w || j + h2 > q.y + q.h || !livreS(i, j, 1) || !livreS(i + w2 - 1, j + h2 - 1, 1)) continue;
            if (perto.length && !perto.some(m => aoLado(i, j, Math.max(w2, h2), m, 1))) continue;
            for (let b = 0; b < h2; b++) for (let a = 0; a < w2; a++) ocup.add((i + a) + ',' + (j + b));
            relevo.push({ t: 'agua', alt: -0.5, k: 'rect', x: i + 0.1, y: j + 0.1, w: w2 - 0.2, h: h2 - 0.2 });
            formas.push({ k: 'rect', x: i + 0.04, y: j + 0.04, w: w2 - 0.08, h: h2 - 0.08, f: null, s: '#5b3f22', sw: 0.12 });
            return;
          }
        },
        // o alçapão do porão (aberto: 3 m de fundura), encostado numa parede, com a tampa ao lado
        alcapao() {
          const beira = ([i, j]) => Math.min(i - q.x, j - q.y, q.x + q.w - 1 - i, q.y + q.h - 1 - j);
          const lugares = [];
          for (let j = q.y; j < q.y + q.h; j++) for (let i = q.x; i < q.x + q.w; i++) if (livreS(i, j, 1) && beira([i, j]) === 1) for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (livreS(i + di, j + dj, 1)) lugares.push([i, j, di, dj]);
          if (!lugares.length) return;
          const [i, j, di, dj] = lugares[Math.floor(rnd() * lugares.length) % lugares.length];
          ocup.add(i + ',' + j); ocup.add((i + di) + ',' + (j + dj));
          relevo.push({ t: 'fosso', alt: -3, k: 'rect', x: i + 0.1, y: j + 0.1, w: 0.8, h: 0.8 });
          formas.push({ k: 'rect', x: i + di + 0.08, y: j + dj + 0.08, w: 0.84, h: 0.84, f: '#7a5532', s: '#3b2a14', sw: 0.06 });
          formas.push({ k: 'free', pts: [[i + di + 0.2, j + dj + 0.5], [i + di + 0.8, j + dj + 0.5]], s: '#3b2a14', sw: 0.05 });
        },
      };
      // os móveis da sala (com os do estilo); o "#" marca uma arrumação
      const ids = [].concat(EX[q.papel] || []).concat((MOVEIS[q.papel] || MOVEIS.sala)).filter(id => id[0] === '#' || Props.P[TR[id] || id]);
      // quantos (o tapete e as arrumações não contam; o tapete só entra em sala de 12 casas ou mais)
      const max = clamp(Math.round(q.w * q.h / 5), 1, ids.filter(id => id[0] !== '#').length), contam = () => q.moveis.filter(m => m.id !== 'tapete' && !m.arranjo).length;
      const cx0 = q.x + q.w / 2, cy0 = q.y + q.h / 2;
      // o altar: encostado na parede do fundo, o mais perto da linha da porta
      const fundo = ([i, j]) => { const [u, v] = uv(i, j); return (U - 1 - u) * 100 + Math.abs(v - vc); };
      for (const id0 of ids) {
        if (id0[0] === '#') { const f = ARRANJOS[id0.slice(1)]; if (f) f(); continue; }
        // id0: o móvel da lista (para saber perto de quê ele fica); id: o que entra (o estilo pode trocar)
        const id = TR[id0] || id0, tap = id === 'tapete';
        if (id0 === 'tina' && q.moveis.some(m => m.id === 'banheira')) continue;      // (lote 128) a tina só se a banheira não coube
        if (tap ? q.w * q.h < 12 : contam() >= max) continue;
        const s = Props.P[id].size || 1, lugares = [];
        for (let j = q.y; j + s <= q.y + q.h; j++) for (let i = q.x; i + s <= q.x + q.w; i++) {
          let ok = true;
          for (let b = 0; b < s && ok; b++) for (let a = 0; a < s && ok; a++) if (!livre(i + a, j + b, tap)) ok = false;
          if (ok) lugares.push([i, j]);
        }
        if (!lugares.length) continue;
        const sorteia = l => l[Math.floor(rnd() * l.length) % l.length];
        const perto = l => { const cx = cx0 - s / 2, cy = cy0 - s / 2; return l.slice().sort((u, v) => Math.hypot(u[0] - cx, u[1] - cy) - Math.hypot(v[0] - cx, v[1] - cy)); };
        let esc = null, rot = 0;
        // junto de quem ele gosta (se já está na sala): primeiro encostado; senão, do lado
        const ancoras = (PERTO[id0] || []).map(a => q.moveis.filter(m => m.id === (TR[a] || a) && !m.arranjo)).find(l => l.length);
        if (ancoras) {
          // junto do altar: as estátuas dos lados dele; as velas dos lados ou na quina da frente (nunca bem na frente)
          const doAltar = ancoras[0].id === 'altar', [ua, va] = doAltar ? uv(ancoras[0].x, ancoras[0].y) : [0, 0];
          const vale = ([i, j]) => { if (!doAltar) return true; const [u, v] = uv(i, j); return id0 === 'estatua' ? u === ua && Math.abs(v - va) <= 2 : v !== va; };
          const bons = lugares.filter(vale);
          const junto = bons.filter(([i, j]) => ancoras.some(m => encosta(i, j, s, m)));
          const l = junto.length ? junto : bons.filter(([i, j]) => ancoras.some(m => aoLado(i, j, s, m, 1)));
          // (a estátua: a do lado do altar mais perto dele, na mesma fileira)
          const est = doAltar && id0 === 'estatua' ? bons.slice().sort((a, b) => Math.abs(uv(a[0], a[1])[1] - va) - Math.abs(uv(b[0], b[1])[1] - va)) : null;
          if (est && est.length) esc = est[0];
          else if (l.length) {
            esc = sorteia(l);
            if (id === 'cadeira' || id === 'banco') { const m = ancoras.find(a => aoLado(esc[0], esc[1], s, a, 1)); if (m) rot = viradoPara(esc[0], esc[1], s, m, id); }
          }
        }
        if (esc) { /* já escolhido */ }
        else if (id === 'altar') { esc = lugares.slice().sort((u, v) => fundo(u) - fundo(v))[0]; rot = rotFrente; }
        else if (id === 'mesa') {
          // a mesa perto do meio, longe das outras mesas (sobra lugar para as cadeiras)
          const outras = q.moveis.filter(m => m.id === 'mesa');
          const longe = g => lugares.filter(([i, j]) => !outras.some(m => aoLado(i, j, s, m, g)));
          const l = [3, 2, 1].map(longe).find(x => x.length) || lugares;
          esc = perto(l)[Math.min(l.length - 1, ri(0, 2))];
        } else if (id === 'fogueira' || tap) esc = perto(lugares)[0];
        else {
          // encostado na parede (um dos mais encostados, sorteado); a cama e a estante, bem encostadas
          const beira = ([i, j]) => Math.min(i - q.x, j - q.y, q.x + q.w - s - i, q.y + q.h - s - j);
          const l = lugares.slice().sort((u, v) => beira(u) - beira(v));
          const rente = id === 'cama' || id === 'estante' ? l.filter(p => beira(p) === beira(l[0])) : null;
          esc = rente ? sorteia(rente) : l[Math.floor(rnd() * Math.max(1, Math.ceil(l.length / 3))) % l.length];
          if (rente) rot = deCostas(esc[0], esc[1], s, q);
        }
        poe(id, esc[0], esc[1], rot, false);
      }
    }
    // os feixes de luz que entram pelas janelas (a cor vem da hora, na cena): da janela para dentro da sala, abrindo
    const luzes = [];
    for (const jn of janelas) {
      const di = jn.lado === 'o' ? 1 : jn.lado === 'l' ? -1 : 0, dj = jn.lado === 'n' ? 1 : jn.lado === 's' ? -1 : 0;
      const dentro = [jn.lado === 'l' ? W - 1 : jn.x1, jn.lado === 's' ? H - 1 : jn.y1], q = lista.find(s2 => contem(s2, dentro));
      if (!q) continue;
      const fundo2 = di ? q.w : q.h, L = Math.min(3.2, fundo2 - 0.3), A = [jn.x1, jn.y1], B = [jn.x2, jn.y2];
      const lx = (B[0] - A[0]), ly = (B[1] - A[1]), sol = [0.5 * L / 3.2, 0.35 * L / 3.2];
      luzes.push({ pts: [A, B, [B[0] + di * L + lx * 0.55 + sol[0], B[1] + dj * L + ly * 0.55 + sol[1]], [A[0] + di * L - lx * 0.55 + sol[0], A[1] + dj * L - ly * 0.55 + sol[1]]] });
    }
    const semPorta = !!(ex && (ex.semPorta || ex.subsolo));
    return Object.assign({ v: 1, lugar: 'interior', tipo, estilo, W, H, forma, seed, porta: semPorta ? null : porta, entra, salas: lista, paredes, janelas, relevo, formas, luzes },
      ex ? { nivel: ex.nivel || 0, escadas: (ex.escadas || []).map(e => Object.assign({}, e)), nomeAndar: PlantaAndares.nomeAndar(ex.nivel || 0) } : null,
      ex && ex.subsolo ? { piso: 'lajes' } : null);
  }

  /* ================= o desenho ================= */
  const M = 2;                                             // a margem em volta da planta, na cena (em quadrados)
  // a casa vista como o gerador de vilarejo vê (para o piso e as paredes de fora)
  const casaDe = p => ({ x: M, y: M, w: p.W, h: p.H, forma: p.forma, corte: p.corte || 2, proa: p.proa, porta: desloca(p.porta), janelas: p.janelas.map(desloca) });
  const desloca = s => (s ? Object.assign({}, s, { x1: s.x1 + M, y1: s.y1 + M, x2: s.x2 + M, y2: s.y2 + M }) : null);
  function pintar(p, c) {
    const W = (p.W + 2 * M) * c, H = (p.H + 2 * M) * c, est = Estilos.valido(p.estilo), TP = Estilos.tipos(est), piso = p.piso || (TP[PISO_DE[p.tipo]] || TP.casa).piso;
    const cv = document.createElement('canvas'); cv.width = Math.round(W); cv.height = Math.round(H);
    const g = cv.getContext('2d'), rnd = mulberry((p.seed ^ 0x27d4eb2f) >>> 0 || 5);
    // lá fora: escuro
    g.fillStyle = '#16130f'; g.fillRect(0, 0, W, H);
    const k = casaDe(p), cont = Estilos.contorno(k);
    g.save(); g.beginPath(); cont.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); g.closePath(); g.clip();
    Estilos.piso(g, k, c, rnd, piso);
    // a sombra das paredes de dentro
    for (const q of p.salas) {
      const x = (q.x + M) * c, y = (q.y + M) * c, gr = g.createLinearGradient(0, y, 0, y + c * 0.35);
      gr.addColorStop(0, 'rgba(0,0,0,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, q.w * c, c * 0.35);
    }
    g.restore();
    // as paredes de dentro (mais finas), com o vão da porta
    const P = Estilos.de(est).parede, lw = Math.max(2, P.larg * c * 0.75);
    g.lineCap = 'square';
    for (const pw of p.paredes) {
      const pd = pw.porta, horiz = pw.y1 === pw.y2;
      // (lote 141) a parede da porta secreta sai inteira no fundo (quem olha não vê o vão)
      const pedacos = pw.secreta ? (horiz ? [[pw.x1, pw.x2]] : [[pw.y1, pw.y2]]) : horiz ? [[pw.x1, pd.x1], [pd.x2, pw.x2]] : [[pw.y1, pd.y1], [pd.y2, pw.y2]];
      for (const [a, b] of pedacos) {
        if (b <= a) continue;
        g.strokeStyle = P.cor; g.lineWidth = lw; g.beginPath();
        if (horiz) { g.moveTo((a + M) * c, (pw.y1 + M) * c); g.lineTo((b + M) * c, (pw.y1 + M) * c); } else { g.moveTo((pw.x1 + M) * c, (a + M) * c); g.lineTo((pw.x1 + M) * c, (b + M) * c); }
        g.stroke();
      }
    }
    Estilos.paredesPintadas(g, k, c, rnd, est, p.parede || null);
    return cv;
  }
  // os feixes de luz das janelas, como formas, na cor da hora (no breu, nenhum)
  const LUZ_DA_HORA = { dia: ['#fff1c2', 0.16], entardecer: ['#ffc27a', 0.18], noite: ['#b7cdfc', 0.09] };
  const feixes = (p, tom) => { const L = LUZ_DA_HORA[tom]; return L ? (p.luzes || []).map(l => ({ k: 'poly', pts: l.pts, f: L[0], a: L[1], s: null, sw: 0 })) : []; };
  function previa(cv, p, maxW, maxH, op) {
    // (lote 141) com andares, a prévia de um deles (op.nivel)
    if (op && op.nivel && Array.isArray(p.andares)) p = p.andares.find(q => q.nivel === op.nivel) || p;
    const cell = Math.max(6, Math.floor(Math.min((maxW || 460) / (p.W + 2 * M), (maxH || 330) / (p.H + 2 * M))));
    const fundo = pintar(p, cell);
    cv.width = fundo.width; cv.height = fundo.height;
    const g = cv.getContext('2d');
    g.drawImage(fundo, 0, 0);
    const seg = (s, cor, w) => { g.strokeStyle = cor; g.lineWidth = w; g.beginPath(); g.moveTo((s.x1 + M) * cell, (s.y1 + M) * cell); g.lineTo((s.x2 + M) * cell, (s.y2 + M) * cell); g.stroke(); };
    g.lineCap = 'round';
    if (p.porta) seg(p.porta, '#7fd1ff', Math.max(2, cell * 0.24));
    for (const pw of p.paredes) seg(pw.porta, pw.secreta ? '#c58bff' : '#7fd1ff', Math.max(2, cell * 0.2));
    // (lote 141) as escadas: amarelas; a escondida, roxa
    for (const e of p.escadas || []) { g.fillStyle = e.oculto ? '#c58bff' : '#ffd34d'; g.fillRect((e.x + M) * cell + cell * 0.2, (e.y + M) * cell + cell * 0.2, cell * 0.6, cell * 0.6); g.strokeStyle = '#1a1208'; g.lineWidth = 1; g.strokeRect((e.x + M) * cell + cell * 0.2, (e.y + M) * cell + cell * 0.2, cell * 0.6, cell * 0.6); }
    for (const j of p.janelas) seg(j, '#bff3ff', Math.max(2, cell * 0.2));
    // o relevo, as formas e a luz das janelas (como na cena)
    if (!op || op.relevo !== false) Estilos.relevoNaPrevia(g, (p.relevo || []).map(r => Estilos.moverRelevo(r, M, M)), (p.formas || []).concat(feixes(p, (op && op.tom) || 'dia')).map(f => Estilos.moverRelevo(f, M, M)), cell, 1.5);
    g.fillStyle = '#f3ead2';
    for (const q of p.salas) for (const mv of q.moveis) {
      if (mv.fw) { const [w, hh] = tokWH({ prop: mv.id, fw: mv.fw, fh: mv.fh, rot: mv.rot }); g.fillRect((mv.x + M) * cell + 1, (mv.y + M) * cell + 1, w * cell - 2, hh * cell - 2); continue; }      // (lote 121) o comprido: o retângulo dele
      g.beginPath(); g.arc((mv.x + M + mv.s / 2) * cell, (mv.y + M + mv.s / 2) * cell, Math.max(1.5, cell * 0.18 * mv.s), 0, Math.PI * 2); g.fill();
    }
    return { cell };
  }
  const resumo = p => {
    const todos = [p].concat(p.andares || []), n = todos.reduce((s, q) => s + q.salas.length, 0), m = todos.reduce((s, q) => s + q.salas.reduce((s2, x) => s2 + x.moveis.length, 0), 0);
    return `${n} ${n === 1 ? 'sala' : 'salas'} · ${m} móveis · ${p.W} × ${p.H} quadrados` + (p.and ? ` · ${PlantaAndares.resumo(p.and)} (${todos.length} cenas ligadas pelas escadas)` : '') + '.';
  };

  /* ================= a cena ================= */
  /* Monta a cena da planta, dentro da cena de fora (fora): as paredes de fora (com a porta e as janelas) e as de dentro
     (com as portas fechadas), os móveis, e a Saída junto da porta de entrada. A hora e o clima vêm da cena de fora; à
     noite, uma luz em cada sala. */
  /* (lote 141) Com andares: uma cena para cada (do mesmo tamanho), ligadas pelas escadas; o andar de cada cena
     (sc.nivel) põe a ordem na barra de andares. A Saída fica no térreo. → a cena do térreo */
  async function criar(p, nome, fora, op) {
    const base = String(nome || '').trim().slice(0, 60) || (p.nome || PLANTAS[p.tipo].n) + ' — por dentro';
    if (!Array.isArray(p.andares) || !p.andares.length) return criar1(p, base, fora, op, null, true);
    const planos = [p].concat(p.andares), cenas = planos.map((q, i) => newScene(i ? (base.slice(0, 40) + ' — ' + (q.nomeAndar || 'andar')).slice(0, 60) : base)), ids = {};
    planos.forEach((q, i) => { ids[q.nivel || 0] = cenas[i].id; });
    for (let i = 0; i < planos.length; i++) { await criar1(planos[i], null, fora, op, { sc: cenas[i], ids }, false); cenas[i].nivel = planos[i].nivel || 0; }
    // na lista, de baixo para cima (o porão, o térreo, os de cima)
    for (const [sc] of cenas.map((sc, i) => [sc, planos[i].nivel || 0]).sort((a, b) => a[1] - b[1])) {
      Store.addScene(sc); Persist.scene(sc.id);
      if (fora) { UI.porNaFamilia(sc.id, fora.id); UI.herdarCampanha(sc.id, fora.id); }
    }
    Persist.meta();
    return cenas[0];
  }
  async function criar1(p, nome, fora, op, multi, guardar) {
    const sc = multi ? multi.sc : newScene(nome);
    sc.cols = p.W + 2 * M; sc.rows = p.H + 2 * M;
    const c = sc.cell;
    sc.fog.dynamic = true; sc.fog.explored = true;
    sc.tone = op && TONES.some(t => t.id === op.hora) ? op.hora : fora ? fora.tone : 'dia';      // (lote 149) a hora escolhida na janela
    sc.light = fora && sc.tone === fora.tone ? fora.light : sc.tone === 'dia' ? 'claro' : 'penumbra';
    sc.bgColor = '#16130f'; sc.bg.stretch = true;
    try { const cv = pintar(p, c); const a = await Assets.fromCanvas(cv, 'bg', sc.name); sc.bg.asset = a.id; } catch (e) { console.error(e); }
    const parede = (x1, y1, x2, y2, k) => sc.walls.push({ id: uid('wl'), k: k || 'wall', x1: (x1 + M) * c, y1: (y1 + M) * c, x2: (x2 + M) * c, y2: (y2 + M) * c, open: false, locked: false });
    for (const s of Estilos.paredesDaCasa({ x: 0, y: 0, w: p.W, h: p.H, forma: p.forma, corte: p.corte || 2, proa: p.proa, porta: p.porta, janelas: p.janelas })) parede(s.x1, s.y1, s.x2, s.y2, s.k);
    for (const pw of p.paredes) {
      const pd = pw.porta, horiz = pw.y1 === pw.y2;
      if (horiz) { if (pd.x1 > pw.x1) parede(pw.x1, pw.y1, pd.x1, pw.y1); parede(pd.x1, pw.y1, pd.x2, pw.y1, 'door'); if (pw.x2 > pd.x2) parede(pd.x2, pw.y1, pw.x2, pw.y1); }
      else { if (pd.y1 > pw.y1) parede(pw.x1, pw.y1, pw.x1, pd.y1); parede(pw.x1, pd.y1, pw.x1, pd.y2, 'door'); if (pw.y2 > pd.y2) parede(pw.x1, pd.y2, pw.x1, pw.y2); }
      if (pw.secreta) { const w = sc.walls[sc.walls.length - (horiz ? (pw.x2 > pd.x2 ? 2 : 1) : (pw.y2 > pd.y2 ? 2 : 1))]; if (w && w.k === 'door') { w.secret = true; w.name = 'Passagem secreta (a base)'; } }      // (lote 141) a porta secreta da base
    }
    // (lote 141) as escadas (e o alçapão escondido da base, que só o mestre vê): levam ao outro andar
    for (const e of p.escadas || []) {
      const id = e.oculto ? 'alcapao' : 'escada', t = Props.novo(sc, id, (e.x + M) * c, (e.y + M) * c, 1, !!e.oculto);
      t.name = e.oculto ? 'Alçapão secreto: desce para a base' : (e.para > e.de ? 'Escada que sobe: ' : 'Escada que desce: ') + PlantaAndares.nomeAndar(e.para);
      if (id === 'escada') t.rot = e.para > e.de ? 180 : 0; else t.est = 'fechado';
      if (multi && multi.ids[e.para]) t.cena = multi.ids[e.para];
      sc.tokens.push(t);
    }
    const noite = sc.tone === 'noite' || sc.tone === 'breu';
    for (const q of p.salas) {
      const ms = q.moveis.slice().sort((a, b) => (a.id === 'tapete' ? 0 : 1) - (b.id === 'tapete' ? 0 : 1));
      for (const mv of ms) if (Props.P[mv.id]) {
        const tk = Props.novo(sc, mv.id, (mv.x + M) * c, (mv.y + M) * c, mv.s, false);
        if (mv.rot) tk.rot = mv.rot;
        if (mv.fw) { tk.fw = mv.fw; tk.fh = mv.fh; tk.size = Math.max(mv.fw, mv.fh); tk.x = (mv.x + M) * c; tk.y = (mv.y + M) * c; delete tk.q0; }      // (lote 121) já no lugar certo
        sc.tokens.push(tk);
      }
      if (noite && !(PLANTAS[p.tipo] && PLANTAS[p.tipo].fogo)) sc.lights.push({ id: uid('lz'), name: 'Luz da sala', x: (q.x + M + q.w / 2) * c, y: (q.y + M + q.h / 2) * c, bright: 1.5, dim: Math.max(3, Math.round(Math.max(q.w, q.h) * 0.8)), c: '#ffc77a', on: true, fl: true });
    }
    // o relevo (o estrado, o palco, a água, o alçapão), as formas de enfeite (travadas) e os feixes de luz das janelas
    if (!op || op.relevo !== false) {
      for (const r of p.relevo || []) sc.shapes.push(Estilos.terrenoNaCena(r, c, M, M));
      for (const f of (p.formas || []).concat(feixes(p, sc.tone))) sc.shapes.push(Estilos.formaNaCena(f, c, M, M));
    }
    // a Saída: logo para dentro da porta de entrada (só no térreo)
    if (fora && !p.nivel) {
      const s = Props.novo(sc, 'saida', (p.entra[0] + M) * c, (p.entra[1] + M) * c, 1, true);
      s.cena = fora.id; sc.tokens.push(s);
    }
    normalizeScene(sc);
    if (!guardar) return sc;
    Store.addScene(sc); Persist.scene(sc.id); Persist.meta();
    if (fora) { UI.porNaFamilia(sc.id, fora.id); UI.herdarCampanha(sc.id, fora.id); }
    return sc;
  }

  /* ================= (lote 149) a aba Interior da janela "Gerar um lugar…" =================
     A janela "Gerar o interior" virou a aba Interior do "Gerar um lugar…" (as duas eram parecidas: agora é uma só). O
     estilo, a hora, o relevo, a semente, os modelos, o Povoar e o Mistério são os da janela. Pelos dois cliques (ou pelo
     menu) na Entrada de um prédio, a janela abre já nesta aba, com o prédio preenchido (o tipo, as medidas, a porta, a
     semente), a hora da cena de fora, e a cena nova sai dentro dela (com a Saída) e fica ligada à Entrada. */
  const novaSemente = () => 1 + Math.floor(Math.random() * 2147483000);
  let tipoNota = 'casa';
  const semPartes = { partes: () => [], parteEm: () => null, nomeDaParte: () => '', formaDaParte: () => [], travada: () => false, alternar: (p, parte, trava) => trava, quantasTravadas: () => 0, baseDe: () => null, travaDe: () => null };
  const soPredio = st => !!(st.predio && PLANTAS[st.predio.t] && PLANTAS[st.predio.t].so);
  const comAndaresI = st => !(PLANTAS[st.tipo] && PLANTAS[st.tipo].so);
  const medidasDe = (st, estilo) => {
    const g0 = st.predio;
    if (g0) return { w: g0.w, h: g0.h, p: g0.p, f: g0.f, c: !!g0.c };
    const T = TAMANHOS_I[st.tam] || TAMANHOS_I.medio;
    return { w: T.w, h: T.h, p: 's', f: estilo === 'elfico' && T.w >= 5 && T.h >= 5 ? 'oct' : 'ret' };
  };
  const LUGAR = Object.assign({ id: 'interior', n: 'Interior',
    padrao: () => { const tipo = TIPOS_I.includes(App.opt.intTipo) ? App.opt.intTipo : 'casa'; return { tipo, tam: TAMANHOS_I[App.opt.intTam] ? App.opt.intTam : 'medio', and: PlantaAndares.normalizar(App.opt.intAnd, catDe(tipo)), ver: 0, predio: null, fora: null, tok: null }; },
    controles(st, K, mudou) {
      const tipos = soPredio(st) ? [st.tipo] : TIPOS_I;
      return h('div', { class: 'ger-c' }, ...[
        st.predio && st.fora ? K.note('O prédio da Entrada' + (Store.S.scenes[st.fora] ? ' de "' + Store.S.scenes[st.fora].name + '"' : '') + ': o tipo e as medidas vêm dele; a cena sai dentro dela, com a Saída junto da porta.') : null,
        K.field('Que prédio', K.seg('int-tipo', st.tipo, tipos.map(k => [k, PLANTAS[k].n]), v => { st.tipo = v; App.opt.intTipo = v; st.and = PlantaAndares.normalizar(st.and, catDe(v)); mudou(true); }), 'stack'),
        st.predio ? null : K.field('Tamanho', K.seg('int-tam', st.tam, Object.keys(TAMANHOS_I).map(k => [k, TAMANHOS_I[k].n, null, `${TAMANHOS_I[k].w * 2} × ${TAMANHOS_I[k].h * 2} quadrados`]), v => { st.tam = v; App.opt.intTam = v; mudou(true); }), 'stack'),
        comAndaresI(st) ? h('details', { class: 'sec and-sec', id: 'int-and-sec', open: !!(st.and.cima || st.and.porao) }, h('summary', { text: 'Andares e porão' }),
          PlantaAndares.ui(st.and, catDe(st.tipo), a => { st.and = a; App.opt.intAnd = JSON.parse(JSON.stringify(a)); mudou(true); }, 'int')) : null,
        st.niveis && st.niveis.length > 1 ? K.field('Ver na prévia', K.seg('int-ver', st.ver, st.niveis.map(n => [n, n === 0 ? 'Térreo' : n < 0 ? (n === -1 ? '1º porão' : '2º porão') : n + 'º andar']), v => { st.ver = v; mudou(true); }), 'stack') : null].filter(Boolean));
    },
    opcoesDe: st => ({ tipo: st.tipo, tam: st.tam, and: JSON.parse(JSON.stringify(st.and)) }),
    aplicarOpcoes(st, o) {
      if (!o || typeof o !== 'object') return;
      if (o.predio && typeof o.predio === 'object') { st.predio = o.predio; st.tipo = PLANTAS[o.predio.t] && PLANTAS[o.predio.t].so ? o.predio.t : tipoValido(o.predio.t); }
      else if (TIPOS_I.includes(o.tipo)) st.tipo = o.tipo;
      if (TAMANHOS_I[o.tam]) st.tam = o.tam;
      if (o.and) st.and = PlantaAndares.normalizar(o.and, catDe(st.tipo));
      if (typeof o.fora === 'string') st.fora = o.fora;
      if (typeof o.tok === 'string') st.tok = o.tok;
    },
    gerar(st, comum) {
      tipoNota = st.tipo;
      const p = gerar(Object.assign(medidasDe(st, comum && comum.estilo), { tipo: st.tipo, estilo: comum && comum.estilo, seed: comum && comum.seed }, comAndaresI(st) ? { andares: st.and } : null));
      st.niveis = [0].concat((p.andares || []).map(q => q.nivel)).sort((a, b) => b - a);
      if (!st.niveis.includes(st.ver)) st.ver = 0;
      p._ver = st.ver;
      return p;
    },
    previa: (cv, p, w, hh, o) => previa(cv, p, w, hh, { relevo: !o || o.relevo !== false, nivel: p._ver || 0 }),
    resumo,
    nomePadrao: p => (p.nome || PLANTAS[p.tipo].n) + ' — por dentro',
    relevoTxt: 'Com relevo e formas (o estrado, o palco, a água, a luz das janelas)',
    criar(p, nome, ex) {
      const st = ex && ex.op ? ex.op : {}, fora = st.fora && Store.S.scenes[st.fora] ? Store.S.scenes[st.fora] : null;
      return criar(p, nome, fora, { relevo: !ex || ex.relevo !== false, hora: ex && ex.hora }).then(sc => {
        const t = fora && st.tok ? (fora.tokens || []).find(x => x.id === st.tok) : null;
        if (t && Store.S.current === fora.id && Store.get('tokens', t.id)) UI.ligarObjeto(t, sc.id);
        sc._interiorFora = fora ? fora.name : null;
        return sc;
      });
    },
    feito(sc, p) {
      const dentro = sc._interiorFora ? `, dentro de "${sc._interiorFora}"` : ''; delete sc._interiorFora;
      return p.andares && p.andares.length ? `"${sc.name}" criada${dentro}: ${PlantaAndares.resumo(p.and)}, ${p.andares.length + 1} cenas ligadas pelas escadas.` + (dentro ? ' A Saída, junto da porta, leva de volta.' : '')
        : `"${sc.name}" criada${dentro}: ${p.salas.length === 1 ? 'uma sala' : p.salas.length + ' salas'}.` + (dentro ? ' A Saída, junto da porta, leva de volta.' : '');
    },
    dica: '"Gerar outro" sorteia outra planta para o mesmo prédio. Na prévia: as portas em azul, as escadas em amarelo, a passagem da base em roxo.',
    // a nota acompanha o prédio da prévia (a moradia da tribo, o navio, os outros)
    get nota() {
      return PLANTAS[tipoNota] && PLANTAS[tipoNota].fogo ? 'Por dentro, no dobro do tamanho da moradia: a fogueira no meio, as peles para dormir em volta, os baús e os jarros (na do chefe, mais peles, o assento e as armas). Pela Entrada, sai uma cena nova, dentro da de fora, com a Saída junto da porta levando de volta; o marcador fica ligado a ela.'
        : tipoNota === 'navio' ? 'O porão e as cabines, do tamanho do convés: a cabine do capitão (com as janelas da popa), as cabines pequenas, o porão de carga, o alojamento e o paiol da proa, com as portas de dentro fechadas e a carga de cada sala. Pela Entrada, sai uma cena nova, dentro da de fora, com a Saída na escada da escotilha levando de volta ao convés.'
        : 'A planta é dividida em salas, com as portas de dentro fechadas, as janelas e os móveis de cada sala. Pela Entrada de um prédio, a cena sai dentro da cena de fora, com a Saída junto da porta levando de volta. Com andares, cada andar e o porão viram uma cena, ligadas pelas escadas.';
    },
  }, semPartes);
  /* A Entrada de um prédio (o marcador da cidade) ou posta à mão: abre o "Gerar um lugar…" na aba Interior. */
  function abrir(t) {
    const fora = Store.scene();
    if (!isGM() || !t || !fora) return;
    const g0 = t.gera && t.gera.t ? t.gera : null;
    const op = { fora: fora.id, tok: t.id };
    if (g0) op.predio = { t: g0.t, w: g0.w, h: g0.h, p: g0.p, f: g0.f, c: !!g0.c };
    Gerador.abrir('interior', Object.assign({ op, hora: fora.tone }, g0 ? { estilo: g0.e, semente: g0.s || null } : null));
  }
  return { PLANTAS, MOVEIS, TAMANHOS_I, gerar, pintar, previa, resumo, criar, abrir, catDe, LUGAR };
})();
