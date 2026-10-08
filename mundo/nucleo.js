/* Tiny Cats · Mapa-múndi: a lógica pura do mundo (sem página, sem DOM).
   O modelo do mapa, o calendário, a geometria, a grade de hexágonos e o terreno, as viagens, os encontros, a névoa e
   — o que mais importa — a projeção pública: o recorte do mapa que os jogadores recebem. Roda igual no navegador
   (window.MundoNucleo) e no Node (testes).
   Unidades do mapa = pixels da imagem original. A distância do mundo é em cubos: um hexágono da grade tem 5 cubos de
   um centro ao outro, e é a grade que diz quantas unidades do mapa dá um cubo (sem grade, não há escala). */
(() => {
  'use strict';

  /* ---------------- catálogos ---------------- */
  // Glifos desenhados numa caixa 24×24, só traço (o CSS pinta .glifo sem preenchimento, sobre o selo colorido).
  const ICONES = {
    cidade: { nome: 'Cidade', cor: '#e6ab4f', svg: '<path d="M3 21h18M5 21V11l4-3 4 3v10M13 21V6l3-2 3 2v15M8 14h2M8 17h2M15 9h2M15 13h2M15 17h2"/>' },
    vila: { nome: 'Vila', cor: '#d9b77a', svg: '<path d="M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5"/>' },
    castelo: { nome: 'Castelo', cor: '#b9a3e3', svg: '<path d="M4 21V8h3v3h3V8h4v3h3V8h3v13zM10 21v-4a2 2 0 0 1 4 0v4M3 21h18"/>' },
    ruina: { nome: 'Ruína', cor: '#b3ab98', svg: '<path d="M3 21h18M6 21V9M4.5 9h3M10 21v-6l1.5-1M15 21V7M13.5 7h3.5l-1 2M19 21v-3"/>' },
    masmorra: { nome: 'Masmorra', cor: '#94a5bd', svg: '<path d="M3 21h18M5 21V11a7 7 0 0 1 14 0v10M9 21v-7a3 3 0 0 1 6 0v7M9 17.5h6"/>' },
    templo: { nome: 'Templo', cor: '#f0d27a', svg: '<path d="M3 9l9-5 9 5zM5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 18h18M2 21h20"/>' },
    porto: { nome: 'Porto', cor: '#7fb7e0', svg: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 10h8M4 13a8 8 0 0 0 16 0M4 13l-1 2M20 13l1 2"/>' },
    torre: { nome: 'Torre', cor: '#c9a0dc', svg: '<path d="M8 21l1-12h6l1 12zM7 9V4h2v2h2V4h2v2h2V4h2v5zM6 21h12M11 13h2"/>' },
    acampamento: { nome: 'Acampamento', cor: '#d79a62', svg: '<path d="M2 20h20M4 20 12 6l8 14M12 20l-3-6M12 20l3-6M12 6 10 3M12 6l2-3"/>' },
    caverna: { nome: 'Caverna', cor: '#a89c8c', svg: '<path d="M2 20h20M3 20c1-7 4-12 9-12s8 5 9 12M8 20c0-3 1.8-5.5 4-5.5s4 2.5 4 5.5"/>' },
    floresta: { nome: 'Floresta', cor: '#7fbf7a', svg: '<path d="M8 3 4 10h2.5L3.5 15h9l-3-5H12zM8 15v6M17 8l-3.5 6h7zM17 14v7M3 21h18"/>' },
    montanha: { nome: 'Montanha', cor: '#b5b0a5', svg: '<path d="M2 20 9 6l5 8 2.5-3.5L22 20zM7 10l2 2 2-2"/>' },
    ponte: { nome: 'Ponte', cor: '#c7a77c', svg: '<path d="M2 9h20M4 9v11M20 9v11M7 20a5 5 0 0 1 10 0M12 9v6M8 9v3M16 9v3"/>' },
    mina: { nome: 'Mina', cor: '#a7b3c2', svg: '<path d="M4 20 15 9M9.5 4.5c3.5-1 7 0 10 4M13 7l4 4M15 21h6v-4"/>' },
    tesouro: { nome: 'Tesouro', cor: '#f2c14e', svg: '<path d="M3 10h18v10H3zM3 10c0-3 4-5 9-5s9 2 9 5M3 14h18M11 13h2v3h-2z"/>' },
    perigo: { nome: 'Perigo', cor: '#f0786e', svg: '<path d="M12 3 2 20h20zM12 9v5M12 17v.01"/>' },
    misterio: { nome: 'Mistério', cor: '#b39cf0', svg: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.7-.8 1.2V14M12 17v.01"/>' },
    bandeira: { nome: 'Bandeira', cor: '#e58a6b', svg: '<path d="M5 21V3M5 4h12l-3 4 3 4H5"/>' },
  };
  const EVENTOS = {
    guerra: { nome: 'Guerra', cor: '#e05a4f', svg: '<path d="M4 4l10 10M11 17l6-6M15 15l4 4M20 4 10 14M7 11l6 6M9 15l-4 4"/>' },
    conflito: { nome: 'Conflito', cor: '#e58a4f', svg: '<path d="M3 12h7M7 8l4 4-4 4M21 12h-7M17 8l-4 4 4 4"/>' },
    praga: { nome: 'Praga', cor: '#9fbf4a', svg: '<path d="M12 3c3.5 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 2.5-6.5 6-11zM10 13v.01M14 15v.01M11.5 17.5v.01"/>' },
    fome: { nome: 'Fome', cor: '#c8a060', svg: '<path d="M3 11h18c0 5-4 9-9 9s-9-4-9-9zM11 11l1.5 3-1.5 2M8 7c0-1.5 1-1.5 1-3M15 7c0-1.5 1-1.5 1-3"/>' },
    festival: { nome: 'Festival', cor: '#f2c14e', svg: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4l-5.3 3 1.2-6-4.5-4.1 6-.7z"/>' },
    tempestade: { nome: 'Tempestade', cor: '#7fa8e0', svg: '<path d="M7 15a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 6a4.5 4.5 0 0 1 .5 9M13 12l-2.5 4.5h3.5L11.5 21"/>' },
    magia: { nome: 'Magia', cor: '#b39cf0', svg: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>' },
    monstro: { nome: 'Monstro', cor: '#d0703a', svg: '<path d="M6 4c2.5 5 2.5 11 0 16M12 3c2.5 6 2.5 12 0 18M18 4c2.5 5 2.5 11 0 16"/>' },
    revolta: { nome: 'Revolta', cor: '#e07a5a', svg: '<path d="M9 21h6M10 21l-1-9h6l-1 9M12 3c2 2 3.5 3.5 3.5 5.5a3.5 3.5 0 0 1-7 0C8.5 6.5 10 5 12 3z"/>' },
    incendio: { nome: 'Incêndio', cor: '#f08a3a', svg: '<path d="M12 3c4 4 6.5 7 6.5 11a6.5 6.5 0 0 1-13 0c0-3 1.7-5.2 3.2-6.5.1 2 1.1 3.3 2.3 3.5 0-3.5.2-5.6 1-8z"/>' },
    inundacao: { nome: 'Inundação', cor: '#5fa8d8', svg: '<path d="M2 8c2.5-2 4.5-2 6.5 0s4.5 2 6.5 0 4.5-2 6.5 0M2 13c2.5-2 4.5-2 6.5 0s4.5 2 6.5 0 4.5-2 6.5 0M2 18c2.5-2 4.5-2 6.5 0s4.5 2 6.5 0 4.5-2 6.5 0"/>' },
    descoberta: { nome: 'Descoberta', cor: '#6fbf8f', svg: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l6 6M10.5 7.5v6M7.5 10.5h6"/>' },
  };
  // Cores de facção: médias, para a região (preenchida a 20%) e a frente lerem bem no tema escuro e no claro.
  const CORES = ['#c0503a', '#3f7fbf', '#3f9a5c', '#c9922e', '#8a5cc0', '#c0457f', '#2f9a9a', '#8a9a3a', '#a0623a', '#5a6fd0'];
  // O tipo do caminho de uma rota é só o desenho dela: quanto o grupo anda é ele quem diz (cubos por dia), e o que
  // pesa no caminho é o terreno de cada hexágono.
  const VIAS = {
    estrada: { nome: 'Estrada' }, trilha: { nome: 'Trilha' }, selvagem: { nome: 'Terreno selvagem' },
    rio: { nome: 'Rio (barco)' }, mar: { nome: 'Mar (navio)' },
  };
  // os ritmos dos mapas de antes viram cubos por dia (eram km por dia: 1 km vira 1 cubo)
  const RITMO_ANTIGO = { lento: 20, normal: 30, rapido: 40 };
  const CUBOS_HEX = 5;                            // um hexágono da grade, de um centro ao vizinho
  const CUBOS_DIA = 30;                           // o quanto um grupo novo anda por dia
  /* Os tipos de terreno de um mapa novo. custo = quantos cubos se gastam para atravessar um hexágono dele (o mestre
     muda; sem terreno, um hexágono custa os 5 cubos dele). Os ids curtos deixam o terreno dos hexágonos pequeno. */
  const TERRENOS_PADRAO = [
    { id: 'pl', nome: 'Planície', cor: '#a3bf6a', custo: 5 },
    { id: 'fl', nome: 'Floresta', cor: '#3f7a46', custo: 10 },
    { id: 'co', nome: 'Colina', cor: '#b39a62', custo: 8 },
    { id: 'mo', nome: 'Montanha', cor: '#8b8178', custo: 15 },
    { id: 'pa', nome: 'Pântano', cor: '#5f7d5c', custo: 15 },
    { id: 'de', nome: 'Deserto', cor: '#e0c07a', custo: 10 },
    { id: 'ne', nome: 'Neve', cor: '#e3ecf2', custo: 15 },
    { id: 'ag', nome: 'Água', cor: '#4f86c0', custo: 10 },
  ];
  const RELACOES = { alianca: 'Aliança', neutra: 'Neutra', tensao: 'Tensão', guerra: 'Guerra' };
  const CAL_PADRAO = {
    dia: 0, ano0: 1, era: '',
    meses: ['Alvorada', 'Degelo', 'Semeadura', 'Florada', 'Verdor', 'Solar', 'Colheita', 'Âmbar', 'Brumas', 'Geada', 'Vigília', 'Noite Longa']
      .map(nome => ({ nome, dias: 30 })),
  };

  /* ---------------- limites ---------------- */
  const MAX_OBJS = 2000, MAX_OPS = 4000, MAX_TXT = 4000, MAX_FAC = 500, MAX_PTS = 2000, MAX_COORD = 1e6;
  const MAX_HEX = 20000, MAX_TER = 40, MAX_CUSTO = 9999;
  const PREFIXO = { m: 'mc', g: 'gr', r: 'rg', e: 'ev', t: 'rt', f: 'fr' };
  const PADROES = {
    m: { x: 0, y: 0, ic: 'cidade', cor: '', rumor: false, falso: false, liga: null },
    g: { x: 0, y: 0, cor: '#e6ab4f', sigla: 'GR', cubos: CUBOS_DIA, rota: null, prog: 0 },
    r: { pts: [], fac: null, cor: '', custo: null, enc: { chance: 0, itens: [] } },
    e: { x: 0, y: 0, tipo: 'guerra', r: 80, ini: null, fim: null, cresce: 0, forca: 1 },   // ini null = "hoje" ao entrar no mapa
    t: { pts: [], via: 'trilha' },
    f: { pts: [], a: null, b: null, ativa: true },
  };

  /* ---------------- apoio ---------------- */
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const tem = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  // Número só se for número de verdade ou texto numérico ("12"); true, [], null e lixo não viram 0 por acaso.
  const num = (v, padrao) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    return Number.isFinite(n) ? n : padrao;
  };
  const limitar = (n, a, b) => Math.min(b, Math.max(a, n));
  const inteiro = (v, padrao, a, b) => { const n = num(v, NaN); return Number.isFinite(n) ? limitar(Math.round(n), a, b) : padrao; };
  const arred = n => Math.round(n * 100) / 100 || 0;          // duas casas bastam (são pixels) e o JSON fica curto; sem -0
  const coord = v => { const n = num(v, NaN); return Number.isFinite(n) ? arred(limitar(n, -MAX_COORD, MAX_COORD)) : null; };
  function texto(v, padrao = '', max = MAX_TXT) {
    let s = typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : padrao;
    if (s.length > max) { s = s.slice(0, max); if (/[\ud800-\udbff]$/.test(s)) s = s.slice(0, -1); }
    return s;
  }
  const sim = v => v === true || v === 1 || (typeof v === 'string' && /^(true|1|sim)$/i.test(v.trim()));
  // Para o que esconde dos jogadores, na dúvida esconde: só um "não" claro conta como não.
  const talvez = v => !(v === false || v == null || v === 0 || (typeof v === 'string' && /^(|false|0|n[aã]o|no)$/i.test(v.trim())));
  function cor(v, padrao) {
    if (typeof v !== 'string') return padrao;
    const s = v.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(s)) return s;
    if (/^#[0-9a-f]{3}$/.test(s)) return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return padrao;
  }
  const idOk = v => (typeof v === 'string' && v.length <= 80 && /^[A-Za-z0-9_:.-]+$/.test(v) && v !== '__proto__' ? v : '');
  /* O atalho de um marcador: para onde ele leva quem clica em "abrir".
       { t: 'cena', id, nome }   uma cena da aba Cenas (o nome fica guardado para quem não tem a lista de cenas)
       { t: 'mapa', id, nome }   outro mapa do Mapa-múndi
       { t: 'acampamento' }      o acampamento da mesa */
  function normLiga(v) {
    if (!ehObj(v)) return null;
    if (v.t === 'acampamento') return { t: 'acampamento' };
    if ((v.t === 'cena' || v.t === 'mapa') && idOk(v.id)) return { t: v.t, id: v.id, nome: texto(v.nome, '', 80) };
    return null;
  }
  function unico(id, vistos) {
    let r = id, n = 2;
    while (vistos.has(r)) r = id + '_' + n++;
    vistos.add(r);
    return r;
  }
  function copia(x) {
    if (x === undefined) return undefined;
    try { if (typeof structuredClone === 'function') return structuredClone(x); } catch (e) { /* algo que não clona: cai no JSON */ }
    return JSON.parse(JSON.stringify(x));
  }
  const novoId = prefixo => (prefixo || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const xy = p => (Array.isArray(p) ? { x: num(p[0], 0), y: num(p[1], 0) } : ehObj(p) ? { x: num(p.x, 0), y: num(p.y, 0) } : { x: 0, y: 0 });

  /* ---------------- geometria ---------------- */
  function dist(a, b) { const p = xy(a), q = xy(b); return Math.hypot(q.x - p.x, q.y - p.y); }
  function compPolilinha(pts) {
    if (!Array.isArray(pts)) return 0;
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]);
    return s;
  }
  // O ponto a s unidades do começo da linha; fim = chegou (ou passou) do último ponto. i = trecho onde caiu.
  function pontoNaPolilinha(pts, s) {
    if (!Array.isArray(pts) || !pts.length) return { x: 0, y: 0, fim: true, i: 0 };
    const total = compPolilinha(pts), ult = xy(pts[pts.length - 1]);
    s = s === Infinity ? total : num(s, 0);                  // "até o fim" também vale (num() não aceita infinito)
    if (s >= total) return { x: ult.x, y: ult.y, fim: true, i: Math.max(0, pts.length - 2) };
    if (s <= 0) { const p = xy(pts[0]); return { x: p.x, y: p.y, fim: false, i: 0 }; }
    for (let i = 1; i < pts.length; i++) {
      const a = xy(pts[i - 1]), b = xy(pts[i]), d = Math.hypot(b.x - a.x, b.y - a.y);
      if (s <= d) { const t = d ? s / d : 0; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, fim: false, i: i - 1 }; }
      s -= d;
    }
    return { x: ult.x, y: ult.y, fim: true, i: Math.max(0, pts.length - 2) };
  }
  // O ponto da linha mais perto de p: onde fica, a que distância (d) e quanto da linha vem antes dele (s).
  function maisPerto(pts, p) {
    const q = xy(p);
    let melhor = null, s0 = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = xy(pts[i - 1]), b = xy(pts[i]), dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
      const t = L ? limitar(((q.x - a.x) * dx + (q.y - a.y) * dy) / (L * L), 0, 1) : 0;
      const x = a.x + dx * t, y = a.y + dy * t, d = Math.hypot(q.x - x, q.y - y);
      if (!melhor || d < melhor.d) melhor = { x, y, d, s: s0 + L * t };
      s0 += L;
    }
    if (melhor) return melhor;
    const a = xy(pts[0]);
    return { x: a.x, y: a.y, d: Math.hypot(q.x - a.x, q.y - a.y), s: 0 };
  }
  function dentroPoligono(p, pts) {
    if (!Array.isArray(pts) || pts.length < 3) return false;
    const { x, y } = xy(p);
    let dentro = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = xy(pts[i]), b = xy(pts[j]);
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) dentro = !dentro;
    }
    return dentro;
  }
  // Centro de massa do polígono (onde vai o nome da região); polígono achatado: a média dos pontos.
  function centroide(pts) {
    if (!Array.isArray(pts) || !pts.length) return { x: 0, y: 0 };
    let A = 0, cx = 0, cy = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = xy(pts[j]), b = xy(pts[i]), f = a.x * b.y - b.x * a.y;
      A += f; cx += (a.x + b.x) * f; cy += (a.y + b.y) * f;
    }
    if (Math.abs(A) < 1e-9) {
      let sx = 0, sy = 0;
      for (const p of pts) { const q = xy(p); sx += q.x; sy += q.y; }
      return { x: sx / pts.length, y: sy / pts.length };
    }
    return { x: cx / (3 * A), y: cy / (3 * A) };
  }

  /* ---------------- calendário ---------------- */
  const mesesDe = cal => (ehObj(cal) && Array.isArray(cal.meses) && cal.meses.some(ehObj) ? cal.meses.filter(ehObj) : CAL_PADRAO.meses);
  const diasDoMes = m => inteiro(m.dias, 30, 1, 1000);
  function diasNoAno(cal) { return mesesDe(cal).reduce((s, m) => s + diasDoMes(m), 0); }
  function dataDe(cal, dia) {
    const meses = mesesDe(cal), total = diasNoAno(cal), d = Math.max(0, Math.floor(num(dia, 0)));
    const ano = inteiro(ehObj(cal) ? cal.ano0 : 1, 1, -1e6, 1e6) + Math.floor(d / total);
    let r = d % total;
    for (let i = 0; i < meses.length; i++) {
      const n = diasDoMes(meses[i]);
      if (r < n) return { ano, mes: i, diaMes: r + 1, nomeMes: texto(meses[i].nome, '') || 'Mês ' + (i + 1) };
      r -= n;
    }
    return { ano, mes: 0, diaMes: 1, nomeMes: texto(meses[0].nome, '') || 'Mês 1' };   // não chega aqui
  }
  function textoData(cal, dia) {
    const d = dataDe(cal, dia), era = ehObj(cal) ? texto(cal.era, '').trim() : '';
    return d.diaMes + ' de ' + d.nomeMes + ', ano ' + d.ano + (era ? ' ' + era : '');
  }

  /* ---------------- eventos ---------------- */
  // Raio no dia: cresce (ou encolhe) desde o começo; antes de começar, o raio de partida. Nunca negativo.
  function raioNoDia(e, dia) {
    const r = num(e && e.r, 80), ini = num(e && e.ini, 0), cresce = num(e && e.cresce, 0);
    return Math.max(0, r + cresce * Math.max(0, num(dia, 0) - ini));
  }
  // Ativo: já começou, não terminou (o dia do fim conta) e ainda tem tamanho (encolher até sumir também termina).
  function eventoAtivo(e, dia) {
    if (!e) return false;
    dia = num(dia, 0);
    const ini = num(e.ini, 0), fim = e.fim == null || e.fim === '' ? null : num(e.fim, null);
    return dia >= ini && (fim == null || dia <= fim) && raioNoDia(e, dia) > 0;
  }
  function eventosDoDia(mapa, dia) {
    const objs = ehObj(mapa) && Array.isArray(mapa.objs) ? mapa.objs : [];
    if (dia == null) dia = ehObj(mapa) && ehObj(mapa.cal) ? mapa.cal.dia : 0;
    return objs.filter(o => ehObj(o) && o.k === 'e' && eventoAtivo(o, dia));
  }

  /* ---------------- a grade de hexágonos ----------------
     grade = { tam, x, y, orient, on, alfa }: tam é a distância entre os centros de dois hexágonos vizinhos, em
     unidades do mapa (0 = sem grade); (x, y) é o centro do hexágono (0, 0); orient 'pe' (com a ponta para cima) ou
     'deitado' (com um lado em cima). Coordenadas axiais (q, r), como as de quem joga com hexágonos. */
  const R3 = Math.sqrt(3);
  const gradeDe = m => (ehObj(m) && ehObj(m.grade) ? m.grade : null);
  const temGrade = m => { const g = gradeDe(m); return !!g && num(g.tam, 0) > 0; };
  const objDe = (mapa, id, k) => (ehObj(mapa) && Array.isArray(mapa.objs) ? mapa.objs.find(o => ehObj(o) && o.id === id && (!k || o.k === k)) || null : null);
  // o hexágono de coordenadas fracionárias mais perto (arredonda em cubo: a soma q + r + s fica zero)
  function arredHex(q, r) {
    const s = -q - r;
    let rq = Math.round(q), rr = Math.round(r);
    const rs = Math.round(s), dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
    return { q: rq + 0, r: rr + 0 };                           // (+ 0: sem -0)
  }
  // O hexágono onde cai o ponto (x, y). Sem grade: null.
  function hexDe(m, x, y) {
    if (!temGrade(m)) return null;
    const g = m.grade, s = num(g.tam, 0) / R3, px = num(x, 0) - num(g.x, 0), py = num(y, 0) - num(g.y, 0);
    if (g.orient === 'deitado') return arredHex((2 / 3 * px) / s, (-1 / 3 * px + R3 / 3 * py) / s);
    return arredHex((R3 / 3 * px - 1 / 3 * py) / s, (2 / 3 * py) / s);
  }
  function centroHex(m, q, r) {
    const g = gradeDe(m) || {}, s = num(g.tam, 0) / R3, gx = num(g.x, 0), gy = num(g.y, 0);
    if (g.orient === 'deitado') return { x: gx + s * 1.5 * q, y: gy + s * (R3 / 2 * q + R3 * r) };
    return { x: gx + s * (R3 * q + R3 / 2 * r), y: gy + s * 1.5 * r };
  }
  // os 6 cantos (para desenhar o hexágono)
  function cantosHex(m, q, r) {
    const g = gradeDe(m) || {}, s = num(g.tam, 0) / R3, c = centroHex(m, q, r), a0 = g.orient === 'deitado' ? 0 : -30;
    const out = [];
    for (let i = 0; i < 6; i++) { const a = (a0 + 60 * i) * Math.PI / 180; out.push([c.x + s * Math.cos(a), c.y + s * Math.sin(a)]); }
    return out;
  }
  const distHex = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
  const chaveHex = h => h.q + ',' + h.r;
  function lerChaveHex(k) {
    const m = /^(-?\d{1,6}),(-?\d{1,6})$/.exec(String(k));
    return m ? { q: Number(m[1]) + 0, r: Number(m[2]) + 0 } : null;
  }
  // Os hexágonos de a até b, cada um vizinho do anterior: a linha reta da grade.
  function linhaHex(a, b) {
    const n = distHex(a, b), out = [];
    // (o empurrãozinho deixa o ponto que cai bem na aresta sempre do mesmo lado)
    for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; out.push(arredHex(a.q + (b.q - a.q) * t + 1e-6, a.r + (b.r - a.r) * t + 1e-6)); }
    return out;
  }
  // Os hexágonos por onde passa uma linha (a rota), do começo ao fim, cada um vizinho do anterior.
  function caminhoHex(m, pts) {
    if (!temGrade(m) || !Array.isArray(pts) || !pts.length) return [];
    const out = [];
    let ant = null;
    for (const p of pts) {
      const q = xy(p), h = hexDe(m, q.x, q.y);
      for (const x of ant ? linhaHex(ant, h) : [h]) { const u = out[out.length - 1]; if (!u || u.q !== x.q || u.r !== x.r) out.push(x); }
      ant = h;
    }
    return out;
  }
  // Distâncias: um hexágono = 5 cubos. Sem grade não há escala (0).
  const cubosDe = (m, unidades) => (temGrade(m) ? num(unidades, 0) * CUBOS_HEX / num(m.grade.tam, 1) : 0);
  const unidadesDeCubos = (m, cubos) => (temGrade(m) ? num(cubos, 0) * num(m.grade.tam, 0) / CUBOS_HEX : 0);

  /* ---------------- o terreno ----------------
     O custo de entrar num hexágono, do mais forte para o mais fraco: o custo próprio dele (o mestre mudou só ali), o
     da região que tem custo e cobre o centro dele, o do terreno dele, e os 5 cubos de um hexágono sem nada. */
  const terrenoDe = (m, id) => (ehObj(m) && Array.isArray(m.terrenos) && id ? m.terrenos.find(t => t.id === id) || null : null);
  function regiaoComCusto(m, x, y) {
    const objs = ehObj(m) && Array.isArray(m.objs) ? m.objs : [];
    for (let i = objs.length - 1; i >= 0; i--) {             // a de cima é a desenhada por último
      const o = objs[i];
      if (ehObj(o) && o.k === 'r' && o.custo != null && dentroPoligono([x, y], o.pts)) return o;
    }
    return null;
  }
  // Tudo sobre um hexágono: o terreno, o custo e de onde ele vem ('hex', 'regiao', 'terreno' ou 'base').
  function hexInfo(m, q, r) {
    const v = ehObj(m) && ehObj(m.hexes) ? m.hexes[q + ',' + r] : undefined;
    const tid = typeof v === 'string' ? v : Array.isArray(v) ? v[0] : '', proprio = Array.isArray(v) && v[1] != null ? num(v[1], null) : null;
    const t = terrenoDe(m, tid);
    if (proprio != null) return { q, r, terreno: t, custo: proprio, de: 'hex', regiao: null };
    const c = centroHex(m, q, r), reg = regiaoComCusto(m, c.x, c.y);
    if (reg) return { q, r, terreno: t, custo: reg.custo, de: 'regiao', regiao: reg };
    if (t) return { q, r, terreno: t, custo: t.custo, de: 'terreno', regiao: null };
    return { q, r, terreno: null, custo: CUBOS_HEX, de: 'base', regiao: null };
  }
  const custoHex = (m, q, r) => hexInfo(m, q, r).custo;
  // Medir de um ponto a outro: hexágonos em linha reta, os cubos disso e quanto custa pelo terreno de cada um.
  function medirHex(m, a, b) {
    if (!temGrade(m)) return null;
    const p = xy(a), q = xy(b), ha = hexDe(m, p.x, p.y), hb = hexDe(m, q.x, q.y), linha = linhaHex(ha, hb);
    let terreno = 0;
    for (let i = 1; i < linha.length; i++) terreno += custoHex(m, linha[i].q, linha[i].r);
    return { hexes: linha.length - 1, cubos: (linha.length - 1) * CUBOS_HEX, terreno: arred(terreno), linha };
  }

  /* ---------------- viagem ---------------- */
  const n1 = n => String(Math.round(n * 10) / 10).replace('.', ',');
  const plHex = n => (n === 1 ? '1 hexágono' : n + ' hexágonos');
  // o custo acumulado até cada hexágono do caminho (o primeiro é de onde se sai: 0)
  function custosDoCaminho(m, cam) {
    const acum = [0];
    for (let i = 1; i < cam.length; i++) acum.push(acum[i - 1] + custoHex(m, cam[i].q, cam[i].r));
    return acum;
  }
  // A rota de um grupo em hexágonos: o caminho, o custo acumulado e o total (null sem rota ou sem grade).
  function viagem(mapa, g) {
    const rota = g && g.rota ? objDe(mapa, g.rota, 't') : null;
    if (!rota || !Array.isArray(rota.pts) || rota.pts.length < 2 || !temGrade(mapa)) return null;
    const cam = caminhoHex(mapa, rota.pts), acum = custosDoCaminho(mapa, cam);
    return { rota, cam, acum, total: acum[acum.length - 1] };
  }
  /* Em que hexágono do caminho o grupo está: o dele, se o caminho passa por ali (passando mais de uma vez, o que bate
     com o que ele já andou); fora do caminho, o mais perto — e a distância até ele, em hexágonos. */
  function ondeNoCaminho(mapa, g, v) {
    const aqui = hexDe(mapa, g.x, g.y), prog = num(g.prog, 0);
    let i = -1, melhor = Infinity, k0 = 0, d0 = Infinity;
    v.cam.forEach((h, k) => {
      const d = distHex(h, aqui);
      if (d === 0 && Math.abs(v.acum[k] - prog) < melhor) { melhor = Math.abs(v.acum[k] - prog); i = k; }
      if (d < d0) { d0 = d; k0 = k; }
    });
    return i >= 0 ? { i, longe: 0 } : { i: k0, longe: d0 };
  }
  /* Um dia de marcha pela rota, de hexágono em hexágono: o grupo tem os cubos do dia dele e gasta, para entrar em
     cada hexágono, o custo do terreno de lá. O que sobra rumo ao próximo (que custa mais do que sobrou) fica guardado
     no andado: atravessar uma montanha de 15 cubos andando 10 por dia leva dois dias. Não muda o mapa: devolve onde o
     grupo fica; quem chama aplica (e passa o dia) com App.mudar. */
  function andarUmDia(mapa, grupoId) {
    const g = objDe(mapa, grupoId, 'g');
    if (!g) return { ok: false, cubos: 0, hexes: 0, x: null, y: null, prog: 0, chegou: false, msg: 'Grupo não encontrado' };
    const base = { ok: false, cubos: 0, hexes: 0, x: g.x, y: g.y, prog: num(g.prog, 0), chegou: false };
    const rota = g.rota ? objDe(mapa, g.rota, 't') : null;
    if (!rota || !Array.isArray(rota.pts) || rota.pts.length < 2) return Object.assign(base, { msg: 'Sem rota' });
    if (!temGrade(mapa)) return Object.assign(base, { msg: 'Defina a grade de hexágonos do mapa primeiro (aba Terreno)' });
    const v = viagem(mapa, g), { cam, acum, total } = v, onde = ondeNoCaminho(mapa, g, v);
    // longe da rota não anda (seria um salto pelo mapa); no hexágono vizinho dela, segue do mais perto
    if (onde.longe > 1) return Object.assign(base, { msg: 'O grupo está fora da rota (a ' + plHex(onde.longe) + ' dela). Arraste-o para a rota ou use "Pôr no começo da rota"' });
    const i = onde.i, ult = cam.length - 1;
    if (i >= ult) {
      const c = centroHex(mapa, cam[ult].q, cam[ult].r);
      return Object.assign(base, { x: arred(c.x), y: arred(c.y), prog: arred(total), chegou: true, msg: 'Chegou ao fim da rota' });
    }
    // o que já tinha andado rumo ao próximo hexágono (num dia que não deu para entrar nele) continua valendo
    const sobra = onde.longe ? 0 : limitar(base.prog - acum[i], 0, Math.max(0, acum[i + 1] - acum[i] - 1e-6));
    const antes = acum[i] + sobra, prog = Math.min(total, antes + Math.max(0, num(g.cubos, CUBOS_DIA)));
    let j = i;
    while (j < ult && acum[j + 1] <= prog + 1e-9) j++;
    const c = centroHex(mapa, cam[j].q, cam[j].r), chegou = j === ult, anda = j - i;
    let msg;
    if (anda > 0) msg = 'Andou ' + plHex(anda) + ' (' + n1(prog - antes) + ' cubos)' + (chegou ? ' e chegou ao fim da rota' : '; faltam ' + plHex(ult - j) + ' (' + n1(total - prog) + ' cubos)');
    else {
      const prox = hexInfo(mapa, cam[j + 1].q, cam[j + 1].r);
      msg = 'Ainda no caminho do próximo hexágono' + (prox.terreno ? ' (' + (prox.terreno.nome || 'terreno') + ')' : '') + ': ' + n1(prog - acum[j]) + ' de ' + n1(acum[j + 1] - acum[j]) + ' cubos';
    }
    return { ok: true, cubos: arred(prog - antes), hexes: anda, x: arred(c.x), y: arred(c.y), prog: arred(prog), chegou, msg };
  }
  function regiaoEm(mapa, x, y) {
    const objs = ehObj(mapa) && Array.isArray(mapa.objs) ? mapa.objs : [];
    for (let i = objs.length - 1; i >= 0; i--) {             // a de cima é a desenhada por último
      const o = objs[i];
      if (ehObj(o) && o.k === 'r' && dentroPoligono([x, y], o.pts)) return o;
    }
    return null;
  }
  /* Um número de 0 (inclusive) a 1 (exclusive), do gerador criptográfico do navegador — o mesmo dos dados do site.
     Sem ele (um ambiente de teste, um navegador muito antigo), vale o Math.random. */
  function sorteio() {
    const c = typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function' ? crypto : null;
    if (!c) return Math.random();
    const b = new Uint32Array(1);
    c.getRandomValues(b);
    return b[0] / 4294967296;
  }
  function sortearEncontro(regiao, rng = sorteio) {
    const enc = ehObj(regiao) && ehObj(regiao.enc) ? regiao.enc : {};
    const chance = inteiro(enc.chance, 0, 0, 100);
    const itens = (Array.isArray(enc.itens) ? enc.itens : []).filter(ehObj).map(it => ({ p: inteiro(it.p, 1, 1, 1e6), txt: texto(it.txt, '') }));
    const total = itens.reduce((s, it) => s + it.p, 0);
    const d100 = limitar(1 + Math.floor(num(rng(), 0) * 100), 1, 100);
    const houve = d100 <= chance;
    let item = null, peso = 0;
    if (houve && total > 0) {
      let s = num(rng(), 0) * total;
      for (const it of itens) { if (s < it.p) { item = it.txt; peso = it.p; break; } s -= it.p; }
      if (item === null) { const it = itens[itens.length - 1]; item = it.txt; peso = it.p; }
    }
    return { houve, d100, chance, item, peso, total };
  }

  /* ---------------- névoa ---------------- */
  // As operações valem em ordem sobre "tudo coberto": a última que pega o ponto decide.
  function cobertoPor(ops, x, y) {
    for (let i = ops.length - 1; i >= 0; i--) {
      const o = ops[i], dx = x - o.x, dy = y - o.y;
      if (dx * dx + dy * dy <= o.r * o.r) return o.t === '-';
    }
    return true;
  }
  function nevoaCobre(mapa, x, y) {
    const n = ehObj(mapa) && ehObj(mapa.nevoa) ? mapa.nevoa : null;
    if (!n || n.on !== true) return false;
    const px = num(x, NaN), py = num(y, NaN);
    if (!Number.isFinite(px) || !Number.isFinite(py)) return true;
    return cobertoPor(Array.isArray(n.ops) ? n.ops.filter(ehObj) : [], px, py);
  }
  // O círculo que envolve dois círculos.
  function envolver(a, b) {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d + b.r <= a.r) return { t: a.t, x: a.x, y: a.y, r: a.r };
    if (d + a.r <= b.r) return { t: a.t, x: b.x, y: b.y, r: b.r };
    const r = (d + a.r + b.r) / 2, k = (r - a.r) / d;
    return { t: a.t, x: arred(a.x + (b.x - a.x) * k), y: arred(a.y + (b.y - a.y) * k), r: arred(r) };
  }
  /* Passou do limite. A regra de ouro: o que estava coberto continua coberto (nada escondido vaza para os jogadores).
     1) some quem uma operação posterior cobre por inteiro (não muda nada no desenho);
     2) as mais antigas, vizinhas e do mesmo tipo, se fundem num círculo. "Cobrir" pode fundir num círculo que envolve
        as duas (cobre a mais, nunca a menos; só quando ele não fica maior que as duas somadas). Duas revelações só se
        fundem quando uma já contém a outra: envolver as duas abriria área que estava coberta;
     3) em último caso, as mais antigas saem (o que elas abriam volta a ficar coberto — nunca o contrário). */
  function enxugarOps(ops) {
    if (ops.length > MAX_OPS && ops.length <= MAX_OPS * 3) ops = semCobrirNoComeco(semRedundantes(ops));
    if (ops.length > MAX_OPS) {
      let sobra = ops.length - MAX_OPS;
      const r = [];
      for (const o of ops) {
        const u = r[r.length - 1];
        if (sobra > 0 && u && u.t === o.t) {
          const e = envolver(u, o);
          const contem = (e.x === u.x && e.y === u.y && e.r === u.r) || (e.x === o.x && e.y === o.y && e.r === o.r);
          if (o.t === '-' ? e.r * e.r <= u.r * u.r + o.r * o.r : contem) { r[r.length - 1] = e; sobra--; continue; }
        }
        r.push(o);
      }
      ops = semCobrirNoComeco(r);
    }
    if (ops.length > MAX_OPS) ops = semCobrirNoComeco(ops.slice(ops.length - MAX_OPS));
    return ops;
  }
  /* Passo 1 sem comparar todas com todas (milhares de pinceladas travariam a página a cada traço): as operações
     posteriores ficam numa grade pelo centro, em células do tamanho dos raios comuns; as muito grandes ("revelar
     tudo", pincel com o zoom afastado) ficam numa lista à parte, curta. Só quem tem raio maior contém outra, e com
     os dois raios até o tamanho da célula os centros caem em células vizinhas. */
  function semRedundantes(ops) {
    const raios = ops.map(o => o.r).sort((a, b) => a - b);
    const T = Math.max(1, raios[Math.floor(raios.length * 0.9)] || 1);
    const grade = new Map(), grandes = [], fica = [];
    for (let i = ops.length - 1; i >= 0; i--) {
      const a = ops[i], contem = b => Math.hypot(b.x - a.x, b.y - a.y) + a.r <= b.r;
      const cx = Math.floor(a.x / T), cy = Math.floor(a.y / T);
      let coberta = grandes.some(contem);
      if (!coberta && a.r <= T) {
        for (let dx = -1; dx <= 1 && !coberta; dx++) for (let dy = -1; dy <= 1 && !coberta; dy++) {
          const l = grade.get((cx + dx) + ',' + (cy + dy));
          if (l) coberta = l.some(contem);
        }
      }
      if (coberta) continue;
      fica.push(a);
      if (a.r > T) grandes.push(a);
      else { const k = cx + ',' + cy; if (grade.has(k)) grade.get(k).push(a); else grade.set(k, [a]); }
    }
    return fica.reverse();
  }
  // Cobrir antes de qualquer revelação não muda nada (tudo começa coberto).
  function semCobrirNoComeco(ops) { let i = 0; while (i < ops.length && ops[i].t === '-') i++; return i ? ops.slice(i) : ops; }
  function normOps(v) {
    const ops = [];
    for (const o of Array.isArray(v) ? v : []) {
      if (!ehObj(o) || (o.t !== '+' && o.t !== '-')) continue;
      const x = coord(o.x), y = coord(o.y), r = num(o.r, NaN);
      if (x == null || y == null || !(r > 0)) continue;
      ops.push({ t: o.t, x, y, r: arred(Math.min(r, MAX_COORD * 4)) });
    }
    return enxugarOps(semCobrirNoComeco(ops));
  }

  /* ---------------- normalização ---------------- */
  function pontos(v, min) {
    if (!Array.isArray(v)) return min ? null : [];
    const r = [];
    for (const p of v) {
      if (r.length >= MAX_PTS) break;
      const q = Array.isArray(p) ? [coord(p[0]), coord(p[1])] : ehObj(p) ? [coord(p.x), coord(p.y)] : [null, null];
      if (q[0] != null && q[1] != null) r.push(q);
    }
    return r.length >= min ? r : null;
  }
  const sigla = v => { const s = Array.from(texto(v, '', 40).trim().toUpperCase()).slice(0, 3).join(''); return s || 'GR'; };
  // um custo em cubos (de 0,1 a 9999, com uma casa); vazio ou inválido = nenhum (null)
  const custoOuNada = v => { if (v == null || v === '') return null; const n = num(v, NaN); return Number.isFinite(n) && n > 0 ? Math.round(limitar(n, 0.1, MAX_CUSTO) * 10) / 10 : null; };
  // os cubos por dia de um grupo (um grupo de antes tinha o ritmo, em km por dia)
  const cubosDoDia = o => { const n = num(o.cubos, NaN); return Number.isFinite(n) && n > 0 ? Math.round(limitar(n, 1, MAX_CUSTO) * 10) / 10 : (tem(RITMO_ANTIGO, o.ritmo) ? RITMO_ANTIGO[o.ritmo] : CUBOS_DIA); };
  /* A grade. Um mapa de antes (sem grade, com a escala em km) ganha a grade que dá a mesma escala, com 1 km = 1 cubo,
     escondida: nada muda na tela de quem já tinha o mapa. */
  function normGrade(v, escalaAntiga) {
    const g = ehObj(v) ? v : null;
    let tam = g ? num(g.tam, 0) : 0;
    if (!g) { const k = ehObj(escalaAntiga) ? num(escalaAntiga.kmPorUn, 0) : 0; if (k > 0) tam = CUBOS_HEX / k; }
    return {
      tam: tam > 0 ? arred(limitar(tam, 4, 20000)) : 0,
      x: g ? coord(g.x) || 0 : 0, y: g ? coord(g.y) || 0 : 0,
      orient: g && g.orient === 'deitado' ? 'deitado' : 'pe',
      on: !!g && sim(g.on),
      alfa: g ? Math.round(limitar(num(g.alfa, 0.35), 0.05, 1) * 100) / 100 : 0.35,
    };
  }
  // Os tipos de terreno. Sem a lista (mapa de antes), os padrões; uma lista vazia é a escolha do mestre.
  function normTerrenos(v) {
    if (!Array.isArray(v)) return copia(TERRENOS_PADRAO);
    const out = [], vistos = new Set();
    for (const t of v) {
      if (!ehObj(t) || out.length >= MAX_TER) continue;
      const id = idOk(t.id);
      if (!id || id.length > 12 || vistos.has(id)) continue;
      vistos.add(id);
      out.push({ id, nome: texto(t.nome, '', 40).trim() || 'Terreno', cor: cor(t.cor, '#9aa3b5'), custo: custoOuNada(t.custo) || CUBOS_HEX });
    }
    return out;
  }
  /* O terreno de cada hexágono: "q,r" → id do terreno, ou [id, custo] quando o mestre mudou o custo ali (id '' =
     sem terreno). Terreno que não existe mais some (o custo próprio fica); o que não diz nada sai. */
  function normHexes(v, terrenos) {
    const out = {};
    if (!ehObj(v)) return out;
    const ids = new Set(terrenos.map(t => t.id));
    let n = 0;
    for (const k of Object.keys(v)) {
      if (n >= MAX_HEX) break;
      const h = lerChaveHex(k);
      if (!h) continue;
      const x = v[k], tid = typeof x === 'string' ? x : Array.isArray(x) && typeof x[0] === 'string' ? x[0] : '';
      const t = ids.has(tid) ? tid : '', c = Array.isArray(x) ? custoOuNada(x[1]) : null;
      if (!t && c == null) continue;
      out[chaveHex(h)] = c == null ? t : [t, c];
      n++;
    }
    return out;
  }
  const idRef = v => idOk(v) || null;
  const escolha = (cat, v, padrao) => (tem(cat, v) ? v : padrao);
  // Um objeto do mapa com todos os campos do tipo, na mesma ordem sempre (o JSON sai igual para a mesma entrada).
  // null = inválido (tipo desconhecido, sem posição, linha curta). leve = aceita linha ainda curta (objNovo).
  function normObj(o, dia, leve) {
    if (!ehObj(o) || !tem(PREFIXO, o.k)) return null;
    const b = { id: idOk(o.id), k: o.k, nome: texto(o.nome), txt: texto(o.txt), nota: texto(o.nota), oculto: talvez(o.oculto) };
    const lugar = () => { const x = coord(o.x), y = coord(o.y); if (x == null || y == null) return false; b.x = x; b.y = y; return true; };
    switch (o.k) {
      case 'm':
        if (!lugar()) return null;
        return Object.assign(b, { ic: escolha(ICONES, o.ic, 'cidade'), cor: cor(o.cor, ''), rumor: sim(o.rumor), falso: sim(o.falso), liga: normLiga(o.liga) });
      case 'g':
        if (!lugar()) return null;
        return Object.assign(b, { cor: cor(o.cor, '#e6ab4f'), sigla: sigla(o.sigla), cubos: cubosDoDia(o), rota: idRef(o.rota), prog: arred(Math.max(0, num(o.prog, 0))) });
      case 'r': {
        const pts = pontos(o.pts, leve ? 0 : 3);
        if (!pts) return null;
        const enc = ehObj(o.enc) ? o.enc : {};
        const itens = (Array.isArray(enc.itens) ? enc.itens : []).filter(ehObj).slice(0, 200).map(it => ({ p: inteiro(it.p, 1, 1, 1e6), txt: texto(it.txt) }));
        return Object.assign(b, { pts, fac: idRef(o.fac), cor: cor(o.cor, ''), custo: custoOuNada(o.custo), enc: { chance: inteiro(enc.chance, 0, 0, 100), itens } });
      }
      case 'e': {
        if (!lugar()) return null;
        const ini = o.ini == null || o.ini === '' ? (dia == null ? null : dia) : inteiro(o.ini, dia == null ? 0 : dia, 0, 1e9);
        let fim = o.fim == null || o.fim === '' ? null : inteiro(o.fim, null, 0, 1e9);
        if (fim != null && ini != null && fim < ini) fim = ini;
        return Object.assign(b, { tipo: escolha(EVENTOS, o.tipo, 'guerra'), r: arred(limitar(num(o.r, 80), 1, MAX_COORD)), ini, fim,
          cresce: arred(limitar(num(o.cresce, 0), -MAX_COORD, MAX_COORD)), forca: inteiro(o.forca, 1, 1, 3) });
      }
      case 't': {
        const pts = pontos(o.pts, leve ? 0 : 2);
        if (!pts) return null;
        return Object.assign(b, { pts, via: escolha(VIAS, o.via, 'trilha') });
      }
      case 'f': {
        const pts = pontos(o.pts, leve ? 0 : 2);
        if (!pts) return null;
        return Object.assign(b, { pts, a: idRef(o.a), b: idRef(o.b), ativa: o.ativa === undefined ? true : sim(o.ativa) });
      }
    }
    return null;
  }
  function normCal(c) {
    c = ehObj(c) ? c : {};
    let meses = (Array.isArray(c.meses) ? c.meses : []).filter(ehObj).slice(0, 100)
      .map((m, i) => ({ nome: texto(m.nome).trim() || 'Mês ' + (i + 1), dias: diasDoMes(m) }));
    if (!meses.length) meses = copia(CAL_PADRAO.meses);
    return { dia: inteiro(c.dia, 0, 0, 1e9), ano0: inteiro(c.ano0, 1, -1e6, 1e6), era: texto(c.era), meses };
  }
  function normImg(v, larg, alt) {
    if (!ehObj(v) || typeof v.url !== 'string' || v.url.length > 2048 || !/^(https?:\/\/|idb:)/i.test(v.url)) return null;
    return { url: v.url, w: inteiro(v.w, inteiro(larg, 2000, 1, 100000), 1, 100000), h: inteiro(v.h, inteiro(alt, 1400, 1, 100000), 1, 100000) };
  }
  function normFaccoes(v) {
    const out = [], vistos = new Set(), crus = [];
    (Array.isArray(v) ? v : []).forEach((f, i) => {
      if (!ehObj(f) || out.length >= MAX_FAC) return;
      out.push({ id: unico(idOk(f.id) || 'fc_' + i, vistos), nome: texto(f.nome), cor: cor(f.cor, CORES[i % CORES.length]), txt: texto(f.txt), nota: texto(f.nota), oculta: talvez(f.oculta), rel: {} });
      crus.push(ehObj(f.rel) ? f.rel : {});
    });
    // Relação vale para os dois lados; se um lado só tem, vale para os dois; se discordam, vale o da facção que vem antes.
    const ids = new Set(out.map(f => f.id)), par = new Map(), chave = (a, b) => (a < b ? a + '\n' + b : b + '\n' + a);
    out.forEach((f, i) => {
      for (const k of Object.keys(crus[i])) {
        const r = crus[i][k];
        if (k === f.id || !ids.has(k) || !tem(RELACOES, r)) continue;
        if (!par.has(chave(f.id, k))) par.set(chave(f.id, k), r);
      }
    });
    for (const f of out) for (const g of out) if (g !== f && par.has(chave(f.id, g.id))) f.rel[g.id] = par.get(chave(f.id, g.id));
    return out;
  }
  function normalizar(x) {
    const m = ehObj(x) ? x : {};
    const img = normImg(m.img, m.larg, m.alt);
    const cal = normCal(m.cal);
    const nev = ehObj(m.nevoa) ? m.nevoa : {};
    const mapa = {
      v: 1, id: idOk(m.id) || novoId('mp'), nome: texto(m.nome, 'Mundo conhecido').trim() || 'Mapa sem nome', oculto: talvez(m.oculto),
      img, larg: img ? img.w : inteiro(m.larg, 2000, 100, 30000), alt: img ? img.h : inteiro(m.alt, 1400, 100, 30000),
      grade: normGrade(m.grade, m.escala), terrenos: null, hexes: null,
      cal, nevoa: { on: sim(nev.on), ops: normOps(nev.ops) },
      faccoes: normFaccoes(m.faccoes), objs: [],
    };
    mapa.terrenos = normTerrenos(m.terrenos);
    mapa.hexes = normHexes(m.hexes, mapa.terrenos);
    const vistos = new Set();
    (Array.isArray(m.objs) ? m.objs : []).forEach((o, i) => {
      if (mapa.objs.length >= MAX_OBJS) return;
      const n = normObj(o, cal.dia, false);
      if (!n) return;
      n.id = unico(n.id || PREFIXO[n.k] + '_' + i, vistos);
      mapa.objs.push(n);
    });
    // referências para o que não existe viram null
    const facs = new Set(mapa.faccoes.map(f => f.id)), rotas = new Map();
    for (const o of mapa.objs) if (o.k === 't') rotas.set(o.id, o);
    for (const o of mapa.objs) {
      if (o.k === 'r' && !facs.has(o.fac)) o.fac = null;
      if (o.k === 'f') { if (!facs.has(o.a)) o.a = null; if (!facs.has(o.b)) o.b = null; }
      if (o.k === 'g') {
        if (!rotas.has(o.rota)) o.rota = null;
        if (!o.rota) o.prog = 0;
      }
    }
    return mapa;
  }
  // Nunca lança: com qualquer coisa na entrada sai um mapa válido.
  function normalizarMapa(x) {
    try { return normalizar(x); } catch (e) {
      return { v: 1, id: novoId('mp'), nome: 'Mapa sem nome', oculto: false, img: null, larg: 2000, alt: 1400, grade: normGrade(null),
        terrenos: copia(TERRENOS_PADRAO), hexes: {}, cal: copia(CAL_PADRAO), nevoa: { on: false, ops: [] }, faccoes: [], objs: [] };
    }
  }

  /* ---------------- criação ---------------- */
  function mapaNovo(nome, o) {
    o = ehObj(o) ? o : {};
    const img = ehObj(o.img) ? o.img : null;
    return normalizarMapa({ v: 1, id: novoId('mp'), nome: typeof nome === 'string' && nome.trim() ? nome.trim() : 'Mundo conhecido', oculto: false,
      img, larg: img ? img.w : o.larg, alt: img ? img.h : o.alt, grade: null, terrenos: copia(TERRENOS_PADRAO), hexes: {}, cal: copia(CAL_PADRAO), nevoa: { on: false, ops: [] }, faccoes: [], objs: [] });
  }
  // Objeto novo com os padrões do tipo. Evento sem `ini` fica com null: ao entrar no mapa, começa "hoje".
  function objNovo(k, campos) {
    if (!tem(PREFIXO, k)) return null;
    const o = Object.assign({ id: novoId(PREFIXO[k]), k, nome: '', txt: '', nota: '', oculto: false }, copia(PADROES[k]), ehObj(campos) ? copia(campos) : {});
    o.k = k;
    if (!idOk(o.id)) o.id = novoId(PREFIXO[k]);
    return normObj(o, null, true) || o;
  }
  function faccaoNova(nome, c) {
    return { id: novoId('fc'), nome: texto(nome).trim() || 'Nova facção', cor: cor(c, CORES[0]), txt: '', nota: '', oculta: false, rel: {} };
  }

  /* ---------------- ajuste de escala (troca de imagem) ---------------- */
  /* Imagem nova de outro tamanho: tudo o que estava desenhado acompanha (fica no mesmo lugar relativo), e a grade
     também — os hexágonos continuam nos mesmos lugares, com o mesmo terreno, e as distâncias em cubos, as mesmas. */
  function escalarMapa(mapa, sx, sy) {
    const m = normalizarMapa(mapa);
    sx = num(sx, 1); sy = num(sy, 1);
    if (!(sx > 0) || !(sy > 0) || (sx === 1 && sy === 1)) return m;
    const s = Math.sqrt(sx * sy), P = p => [arred(p[0] * sx), arred(p[1] * sy)];
    for (const o of m.objs) {
      if ('x' in o) { o.x = arred(o.x * sx); o.y = arred(o.y * sy); }
      if (o.pts) o.pts = o.pts.map(P);
      if (o.k === 'e') { o.r = arred(o.r * s); o.cresce = arred(o.cresce * s); }
    }
    m.nevoa.ops = m.nevoa.ops.map(o => ({ t: o.t, x: arred(o.x * sx), y: arred(o.y * sy), r: arred(o.r * s) }));
    if (m.grade.tam > 0) m.grade.tam = arred(m.grade.tam * s);
    m.grade.x = arred(m.grade.x * sx); m.grade.y = arred(m.grade.y * sy);
    if (!m.img) { m.larg = Math.round(m.larg * sx); m.alt = Math.round(m.alt * sy); }
    return normalizarMapa(m);
  }

  /* ---------------- projeção pública ---------------- */
  /* O que os jogadores recebem. Tudo o que é só do mestre sai aqui — e nada além deste recorte vai para eles:
     notas, o "escondido" do mapa, objetos e facções escondidos, o "é falso" dos boatos, a tabela de encontros,
     eventos fora do dia de hoje (e o futuro dos de hoje: quando acabam, quanto crescem), os custos que o mestre deu
     a um hexágono ou a uma região, e o que a névoa cobre (menos os grupos: são os próprios jogadores) — inclusive o
     terreno dos hexágonos cobertos. */
  function projetar(mapa) {
    const m = normalizarMapa(mapa);                          // já é uma cópia
    const dia = m.cal.dia, nevoa = m.nevoa.on, ops = m.nevoa.ops;
    const coberto = (x, y) => nevoa && cobertoPor(ops, x, y);
    const todoCoberto = pts => nevoa && pts.every(p => cobertoPor(ops, p[0], p[1]));
    delete m.oculto;
    const hexes = {};
    for (const k of Object.keys(m.hexes)) {
      const v = m.hexes[k], t = typeof v === 'string' ? v : v[0], h = lerChaveHex(k);
      if (!t || !h || !temGrade(m)) continue;
      const c = centroHex(m, h.q, h.r);
      if (!coberto(c.x, c.y)) hexes[k] = t;
    }
    m.hexes = hexes;
    const escondidas = new Set(m.faccoes.filter(f => f.oculta).map(f => f.id));
    m.faccoes = m.faccoes.filter(f => !f.oculta);
    for (const f of m.faccoes) {
      delete f.nota;
      for (const k of Object.keys(f.rel)) if (escondidas.has(k)) delete f.rel[k];
    }
    const objs = [];
    for (const o of m.objs) {
      if (o.oculto) continue;
      delete o.nota;
      if (o.k === 'm') { delete o.falso; if (coberto(o.x, o.y)) continue; }
      else if (o.k === 'e') {
        if (!eventoAtivo(o, dia) || coberto(o.x, o.y)) continue;
        // o evento como ele está hoje: o fim planejado e o quanto ainda vai crescer são do mestre
        o.r = raioNoDia(o, dia); o.cresce = 0; o.fim = null;
      }
      else if (o.k === 'r') { delete o.enc; o.custo = null; if (escondidas.has(o.fac)) o.fac = null; if (todoCoberto(o.pts)) continue; }
      else if (o.k === 't') { if (todoCoberto(o.pts)) continue; }
      else if (o.k === 'f') { if (escondidas.has(o.a)) o.a = null; if (escondidas.has(o.b)) o.b = null; if (todoCoberto(o.pts)) continue; }
      objs.push(o);
    }
    const rotas = new Set(objs.filter(o => o.k === 't').map(o => o.id));
    for (const o of objs) if (o.k === 'g' && o.rota && !rotas.has(o.rota)) { o.rota = null; o.prog = 0; }
    m.objs = objs;
    return normalizarMapa(m);
  }

  const MundoNucleo = {
    ICONES, EVENTOS, CORES, VIAS, RELACOES, CAL_PADRAO, CUBOS_HEX, CUBOS_DIA, TERRENOS_PADRAO,
    novoId, mapaNovo, objNovo, faccaoNova, normalizarMapa,
    diasNoAno, dataDe, textoData,
    dist, compPolilinha, pontoNaPolilinha, maisPerto, dentroPoligono, centroide,
    eventoAtivo, raioNoDia, eventosDoDia,
    temGrade, hexDe, centroHex, cantosHex, distHex, chaveHex, lerChaveHex, linhaHex, caminhoHex, cubosDe, unidadesDeCubos,
    terrenoDe, hexInfo, custoHex, medirHex, viagem, ondeNoCaminho, andarUmDia, regiaoEm, sortearEncontro,
    nevoaCobre, projetar, copia, escalarMapa,
    LIMITES: { objs: MAX_OBJS, ops: MAX_OPS, texto: MAX_TXT, hexes: MAX_HEX, terrenos: MAX_TER },
  };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoNucleo;
  if (typeof window !== 'undefined') window.MundoNucleo = MundoNucleo;
})();
