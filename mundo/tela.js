/* Tiny Cats · Mapa-múndi · a tela.
   O mapa no meio: zoom e arrasto (roda, pinça, botões), o fundo (imagem ou papel em branco), o desenho à mão do
   terreno (um <canvas>) e, por cima, um SVG com as camadas (grade, linhas, carimbos, regiões, zonas de guerra,
   textos, frentes, rotas, eventos, marcadores, névoa, grupos, seleção, rascunho e régua).
   Também o trilho de ferramentas, as opções da ferramenta (#opts), a dica (#dica), os gestos e os atalhos.
   Nada aqui muda o mapa direto: tudo passa por App.mudar, um passo de desfazer por gesto. O que está no meio de
   um gesto (arrastar, pincelar, desenhar) é desenhado provisoriamente e só vira mudança ao soltar. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const MASCARA = 'mundoNevoaMascara';
  const Z_MAX = 8;
  const RAIO_EVENTO = 80;                         // raio de um evento posto com um clique (unidades do mapa)
  const OPT_PADRAO = { ic: 'cidade', rumor: false, tipo: 'guerra', via: 'trilha', a: null, b: null, pincel: 'revelar', raio: 60, oculto: false, ter: 'fl', terModo: 'ter', custo: 10, hexPincel: 0,
    terPincel: '', pinTer: 'fl', pinRaio: 24, freModo: 'linha', des: 'carimbo', carimbo: 'arvore', carTam: 40, fonte: 'mapa', txtTam: 28, estilo: 'rio', linNivel: 2 };
  // a largura de cada desenho de linha, em pixels da tela, para Fina, Média, Larga e Bem larga (no rio: a da foz)
  const LARGURAS = { rio: [6, 12, 20, 32], estrada: [2, 3.5, 5, 8], trilha: [1.5, 2.5, 4, 6] };
  const CAMADA = { r: 'reg', f: 'fre', t: 'rot', e: 'eve', m: 'mar', g: 'gru', z: 'zon', l: 'lin', c: 'car', x: 'txt' };
  const APAGADO = { m: 'Marcador apagado.', g: 'Grupo apagado.', r: 'Região apagada.', e: 'Evento apagado.', t: 'Rota apagada.', f: 'Frente apagada.',
    z: 'Zona de guerra apagada.', l: 'Linha apagada.', c: 'Carimbo apagado.', x: 'Texto apagado.' };
  // rótulos do desfazer em minúsculas, como os do painel e do App ("Desfazer: novo marcador")
  const NOVO = { m: 'novo marcador', g: 'novo grupo', r: 'nova região', e: 'novo evento', t: 'nova rota', f: 'nova frente',
    z: 'nova zona de guerra', l: 'nova linha', c: 'novo carimbo', x: 'novo texto' };
  // o que só se escolhe ao soltar (arrastar por cima ainda anda pelo mapa): áreas, linhas e os enfeites
  const LARGOS = new Set(['r', 't', 'f', 'z', 'l', 'c', 'x']);
  // as fontes dos textos livres (Grenze e IM Fell English vêm do Google Fonts, no index.html)
  const FONTE_CSS = { mapa: "'Grenze', Georgia, serif", classica: "'IM Fell English', Georgia, 'Times New Roman', serif", simples: "'Atkinson Hyperlegible Next', system-ui, sans-serif" };
  const TINTA = '#2a2118';                        // a tinta escura dos carimbos e dos textos de mapa

  const FERRAMENTAS = [
    { id: 'sel', nome: 'Selecionar', tecla: 'V' },
    { id: 'm', nome: 'Marcador', tecla: 'M' },
    { id: 'g', nome: 'Grupo', tecla: 'G' },
    { id: 'r', nome: 'Região', tecla: 'R' },
    { id: 'e', nome: 'Evento', tecla: 'E' },
    { id: 't', nome: 'Rota', tecla: 'T' },
    { id: 'f', nome: 'Frente', tecla: 'F' },
    { id: 'h', nome: 'Terreno', tecla: 'H' },
    { id: 'p', nome: 'Desenho', tecla: 'P' },
    { id: 'n', nome: 'Névoa', tecla: 'N' },
    { id: 'd', nome: 'Régua', tecla: 'D' },
  ];
  const SEPARA_DEPOIS = new Set(['sel', 'f']);
  const POR_TECLA = Object.fromEntries(FERRAMENTAS.map(f => [f.tecla.toLowerCase(), f.id]));
  const VALIDAS = new Set(FERRAMENTAS.map(f => f.id));
  // ícones do trilho: traço simples numa caixa 24×24, na cor do botão
  const ICONE_FERRAMENTA = {
    sel: '<path d="M6 3.5 18.5 12l-5.7 1.5L10 19.5z"/>',
    m: '<path d="M12 21s-6.5-5.7-6.5-10.6a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21z"/><circle cx="12" cy="10.4" r="2.3"/>',
    g: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.4 2.4-6 5.5-6s5.5 2.6 5.5 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.6 14.3c2.8.2 4.9 2.5 4.9 5.7"/>',
    r: '<path d="M4.5 8 11 3.5l8.5 4-1.5 9.5-8.5 3.5-5-6z"/>',
    e: '<circle cx="12" cy="12" r="2.6"/><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M5.6 18.4l2.5-2.5M15.9 8.1l2.5-2.5"/>',
    t: '<path d="M4.5 19c3.5 0 4.5-4.5 8-4.5s3.5-6 7-6" stroke-dasharray="2.6 3.2"/><circle cx="4.5" cy="19" r="1.7"/><circle cx="19.5" cy="8.5" r="1.7"/>',
    f: '<path d="M4 4l10.5 10.5M12 17l5-5M15.5 15.5l4 4M20 4 9.5 14.5M7 12l5 5M8.5 15.5l-4 4"/>',
    h: '<path d="M12 2.8l7.9 4.6v9.2L12 21.2l-7.9-4.6V7.4z"/><path d="M7.4 15.6l3.1-4.6 2 3 1.3-1.7 2.8 3.3"/>',
    p: '<path d="M14.6 4.4l5 5L9.2 19.8l-5.6.6.6-5.6z"/><path d="M12.6 6.4l5 5"/>',
    n: '<path d="M7 18.5h10.5a4 4 0 0 0 .4-8 5.6 5.6 0 0 0-10.7-1.2A4.6 4.6 0 0 0 7 18.5z"/>',
    d: '<path d="M3.5 16.5 16.5 3.5l4 4-13 13z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  };

  let App = null;
  const N = () => (App && App.N) || window.MundoNucleo;

  /* ---- ajudantes de DOM ---- */
  function s(tag, attrs, ...filhos) {
    const el = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'texto') el.textContent = v; else el.setAttribute(k, v);
    }
    for (const f of filhos) if (f) el.append(f);
    return el;
  }
  function h(tag, attrs, ...filhos) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'texto') el.textContent = v;
      else if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const f of filhos) if (f !== null && f !== undefined && f !== false) el.append(f);
    return el;
  }
  const um = v => Math.round(v * 10) / 10;
  const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
  const toqueGrosso = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
  const semMovimento = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const num = (v, casas) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: casas });
  const curto = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t);
  // cor clara pede letra escura (a sigla do grupo fica legível em qualquer cor)
  function clara(cor) {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(cor || '').trim());
    if (!m) return true;
    const x = m[1].length === 3 ? m[1].replace(/./g, c => c + c) : m[1];
    const [r, g, b] = [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
  }

  /* ---- geometria só para desenhar (a regra do mundo fica no núcleo) ---- */
  function caminho(pts, fechar) {
    if (!pts.length) return '';
    return 'M' + pts.map(p => um(p[0]) + ' ' + um(p[1])).join('L') + (fechar ? 'Z' : '');
  }
  function centroDe(pts) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n], c = x0 * y1 - x1 * y0;
      a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
    }
    if (Math.abs(a) < 1e-6) return pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
    return [cx / (3 * a), cy / (3 * a)];
  }
  /* Onde vai o nome da região: o centro de massa, se ele cai dentro dela. Numa região côncava (um "C" em volta de
     uma baía) ele pode cair fora, em cima da vizinha: aí vai no meio do trecho mais largo de dentro, na mesma altura
     (ou na altura do meio). Dentro e fora pela regra par-ímpar, a mesma do núcleo e do preenchimento. */
  function pontoDoNome(pts) {
    const c = centroDe(pts);
    if (N().dentroPoligono(c, pts)) return c;
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    for (const y of [c[1], (y0 + y1) / 2]) {
      const xs = [];
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xa, ya] = pts[i], [xb, yb] = pts[j];
        if ((ya > y) !== (yb > y)) xs.push(xa + (y - ya) * (xb - xa) / (yb - ya));
      }
      xs.sort((a, b) => a - b);
      let melhor = null;
      for (let k = 0; k + 1 < xs.length; k += 2) if (!melhor || xs[k + 1] - xs[k] > melhor[1] - melhor[0]) melhor = [xs[k], xs[k + 1]];
      if (melhor) return [(melhor[0] + melhor[1]) / 2, y];
    }
    return c;
  }
  function comprimento(pts) { let t = 0; for (let i = 1; i < pts.length; i++) t += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return t; }
  // o trecho da polilinha do começo até o comprimento s (o caminho já andado)
  function trecho(pts, sAte) {
    const r = [pts[0]];
    let falta = sAte;
    for (let i = 1; i < pts.length && falta > 0; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], d = Math.hypot(x1 - x0, y1 - y0);
      if (d <= falta) { r.push(pts[i]); falta -= d; } else { const t = falta / d; r.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]); falta = 0; }
    }
    return r;
  }
  function meioDe(pts) {
    const t = trecho(pts, comprimento(pts) / 2);
    return t[t.length - 1];
  }
  // a forma de hoje (a zona de guerra muda com as fases; o resto tem uma forma só)
  function formaDe(o, dia) { try { return o.k === 'z' ? N().formaNoDia(o, dia == null ? diaDaVista() : dia) : o.pts; } catch (e) { return o.pts; } }
  // os pontos que o mestre ajusta agora: os da fase de hoje (zona) ou os do objeto
  function ptsEditaveis(o) {
    if (o.k !== 'z' || !Array.isArray(o.fases)) return o.pts;
    let i = -1;
    try { i = N().faseNoDia(o, diaDaVista()); } catch (e) { /* núcleo antigo: sem fases */ }
    return i >= 0 ? o.fases[i].pts : o.pts;
  }
  const fechada = k => k === 'r' || k === 'z';
  function centroObj(o) {
    if (Number.isFinite(o.x) && Number.isFinite(o.y)) return [o.x, o.y];
    const pts = formaDe(o);
    if (Array.isArray(pts) && pts.length) return fechada(o.k) ? centroDe(pts) : meioDe(pts);
    return null;
  }
  function caixaDe(objs) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const p = (x, y) => { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; };
    for (const o of objs) {
      if (Array.isArray(o.pts)) {
        for (const q of o.pts) p(q[0], q[1]);
        if (o.k === 'z' && Array.isArray(o.fases)) for (const f of o.fases) for (const q of f.pts || []) p(q[0], q[1]);
      } else if (Number.isFinite(o.x)) p(o.x, o.y);
    }
    return x0 <= x1 ? { x0, y0, x1, y1 } : null;
  }
  function deslocar(o, dx, dy) {
    if (Number.isFinite(o.x) && Number.isFinite(o.y)) { o.x = um(o.x + dx); o.y = um(o.y + dy); }
    const mover = pts => pts.map(q => [um(q[0] + dx), um(q[1] + dy)]);
    if (Array.isArray(o.pts)) o.pts = mover(o.pts);
    if (o.k === 'z' && Array.isArray(o.fases)) o.fases = o.fases.map(f => ({ dia: f.dia, pts: mover(f.pts || []) }));   // todas as fases andam juntas
  }

  /* ---- o que está no núcleo, lido na hora (pode faltar algo num núcleo antigo: a tela não quebra por isso) ---- */
  const dicionario = nome => (N() && N()[nome]) || {};
  function defIcone(k) { const I = dicionario('ICONES'); return I[k] || I.cidade || I[Object.keys(I)[0]] || { nome: 'Lugar', cor: '#e6ab4f', svg: '' }; }
  function defEvento(k) { const E = dicionario('EVENTOS'); return E[k] || E[Object.keys(E)[0]] || { nome: 'Evento', cor: '#f0786e', svg: '' }; }
  function defCarimbo(k) { const C0 = dicionario('CARIMBOS'); return C0[k] || C0.arvore || C0[Object.keys(C0)[0]] || { nome: 'Carimbo', cor: '#5d9a4e', svg: '' }; }
  function defLinha(k) { const L0 = dicionario('LINHAS'); return L0[k] || L0.rio || { nome: 'Linha', cor: '#4f86c0' }; }
  // uma cor mais escura (ou mais clara) que a outra: a margem do rio, o contorno, a tinta do nome
  function misturar(cor, alvo, t) {
    const a = /^#[0-9a-f]{6}$/i.test(cor) ? parseInt(cor.slice(1), 16) : 0x888888, b = parseInt(alvo.slice(1), 16);
    const c = sh => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t));
    return '#' + [16, 8, 0].map(sh => c(sh).toString(16).padStart(2, '0')).join('');
  }
  function eventoAtivo(o, dia) { try { return !!N().eventoAtivo(o, dia); } catch (e) { return true; } }
  function raioNoDia(o, dia) { try { const r = N().raioNoDia(o, dia); return Number.isFinite(r) ? Math.max(0, r) : o.r; } catch (e) { return o.r; } }
  function zonaAtiva(o, dia) { try { return !!N().zonaAtiva(o, dia); } catch (e) { return true; } }
  function faseNoDia(o, dia) { try { return N().faseNoDia(o, dia); } catch (e) { return -1; } }
  // a distância do mundo é em cubos, e é a grade de hexágonos que diz quantas unidades do mapa dá um cubo
  function temGrade(m) { return !!(m && m.grade && m.grade.tam > 0); }
  function cubosDe(m, u) { try { const c = N().cubosDe(m, u); return Number.isFinite(c) ? c : 0; } catch (e) { return 0; } }
  const plHex = n => (Math.round(n * 10) / 10 === 1 ? '1 hexágono' : num(n, n < 10 ? 1 : 0) + ' hexágonos');
  // "12 cubos · 2,4 hexágonos" (sem grade: em unidades do mapa)
  function textoDistancia(m, u) {
    if (!temGrade(m)) return num(u, 0) + ' unidades';
    const c = cubosDe(m, u);
    return num(c, c < 10 ? 1 : 0) + ' cubos · ' + plHex(c / 5);
  }
  // A régua na grade: hexágonos em linha reta, os cubos disso e quanto dá pelo terreno de cada hexágono.
  function medidaHex(m, a, b) { try { return temGrade(m) ? N().medirHex(m, a, b) : null; } catch (e) { return null; } }
  function textoRegua(m, a, b) {
    const r = medidaHex(m, a, b);
    if (!r) return textoDistancia(m, Math.hypot(b.x - a.x, b.y - a.y));
    return plHex(r.hexes) + ' · ' + num(r.cubos, 0) + ' cubos' + (Math.abs(r.terreno - r.cubos) > 1e-9 ? ' · pelo terreno: ' + num(r.terreno, 1) + ' cubos' : '');
  }
  function opt(nome) { const o = App && App.opt; return o && o[nome] !== undefined ? o[nome] : OPT_PADRAO[nome]; }
  const diaDaVista = () => (ctxAtual ? ctxAtual.dia : (M && M.cal && M.cal.dia) || 0);
  function porOpt(nome, v) { if (!App.opt) App.opt = Object.assign({}, OPT_PADRAO); App.opt[nome] = v; }

  /* ---- estado da tela ---- */
  const V = { x: 0, y: 0, z: 1 };               // a vista: deslocamento na tela (px) e zoom
  let palco, mundoEl, optsEl, dicaEl, railEl, zTxt, svg, fundoEl = null, fundoChave = null;
  const C = {};                                  // camadas do SVG
  let mascara, mascBase, mascOps, nevRect;
  const GRADE = 'mundoGradeHex';
  let gradePat = null, gradePath = null, gradeRect = null, hexTer = null, hexChave = null;
  let M = null, indice = new Map(), ctxAtual = null;   // o mapa desenhado no último quadro (App.vista())
  let mapaId = null, L = 0, A = 0, zAplicado = 0;
  const recs = new Map();                        // id → { el, chave }: só reconstrói o objeto que mudou
  let nevRef = null;
  let qTudo = 0, qVista = 0, adiado = false, precisaCaber = false, tamPalco = null;
  let optsChave = null, menuEl = null;
  let g = null;                                  // gesto em andamento (um ponteiro de cada vez)
  let pinca = null;                              // dois dedos: zoom e arrasto juntos
  const toques = new Map();
  let espaco = false;
  let rasc = null;                               // região/rota/frente sendo desenhada: { k, pts }
  let regua = null;                              // { a, b, manter }
  let medindo = null;                            // { ok, ant } enquanto medir() espera
  let cursor = null;                             // onde o ponteiro está, em unidades do mapa
  let ultimoClique = null, tLongo = 0, ultimoMenu = 0, tMovendo = 0;

  const podeEditar = () => { try { return !!(App && App.podeEditar()); } catch (e) { return false; } };
  const mestreVe = () => !!(App && App.papel === 'mestre' && !App.comoJogador);
  function ferramenta() {
    if (medindo) return 'd';
    const f = App && App.ferramenta;
    return podeEditar() && VALIDAS.has(f) ? f : 'sel';
  }
  const selecao = () => (Array.isArray(App.sel) ? App.sel : []).filter(id => indice.has(id));
  const objEditavel = id => (App.mapa && Array.isArray(App.mapa.objs) ? App.mapa.objs.find(o => o.id === id) : null) || null;

  /* ---- a vista: deslocamento e zoom ---- */
  function tamanho() { const r = palco.getBoundingClientRect(); return { w: r.width, h: r.height, x: r.left, y: r.top }; }
  function zoomCaber() {
    const t = tamanho();
    if (!L || !A || !t.w || !t.h) return 1;
    const marg = t.w < 520 ? 12 : 28;
    return Math.max(0.005, Math.min((t.w - 2 * marg) / L, (t.h - 2 * marg) / A));
  }
  const zMin = () => Math.max(0.005, Math.min(0.5, zoomCaber() * 0.5));
  const limitarZ = z => limitar(z, zMin(), Z_MAX);

  function paraMundo(cx, cy) {
    if (!palco) return { x: 0, y: 0 };
    const r = palco.getBoundingClientRect();
    return { x: (cx - r.left - V.x) / V.z, y: (cy - r.top - V.y) / V.z };
  }
  function zoomEm(cx, cy, z) {
    z = limitarZ(z);
    if (!Number.isFinite(z) || z === V.z) return;
    const t = tamanho(), sx = cx - t.x, sy = cy - t.y;
    V.x = sx - (sx - V.x) * z / V.z; V.y = sy - (sy - V.y) * z / V.z; V.z = z;
    agendarVista();
  }
  function zoomNoMeio(fator) { const t = tamanho(); zoomEm(t.x + t.w / 2, t.y + t.h / 2, V.z * fator); }
  function caber() {
    const m = M || (App && safeVista());
    if (!m || !palco) return;
    if (m.larg !== L || m.alt !== A) { L = m.larg; A = m.alt; }
    const t = tamanho();
    if (!t.w || !t.h) { precisaCaber = true; return; }
    precisaCaber = false;
    V.z = limitar(zoomCaber(), 0.005, Z_MAX);
    V.x = (t.w - L * V.z) / 2; V.y = (t.h - A * V.z) / 2;
    aplicarVista(true);
  }
  // Centraliza um ponto ou um objeto. Uma região maior que a tela também afasta o zoom até caber.
  function centrar(alvo) {
    if (!palco || !alvo) return;
    if (typeof alvo === 'string') alvo = indice.get(alvo) || objEditavel(alvo);
    if (!alvo) return;
    const c = centroObj(alvo);
    if (!c) return;
    const t = tamanho();
    let z = V.z;
    if (Array.isArray(alvo.pts)) {
      const b = caixaDe([alvo]);
      if (b) { const cab = Math.min((t.w * 0.8) / Math.max(1, b.x1 - b.x0), (t.h * 0.8) / Math.max(1, b.y1 - b.y0)); if (cab < z) z = limitarZ(cab); }
    } else if (alvo.k === 'e') {
      const r = raioNoDia(alvo, diaDaVista());                     // a área como está hoje (cresce e encolhe)
      if (r > 0) { const cab = Math.min(t.w, t.h) * 0.4 / r; if (cab < z) z = limitarZ(cab); }
    }
    const fim = { x: t.w / 2 - c[0] * z, y: t.h / 2 - c[1] * z, z };
    if (semMovimento()) { Object.assign(V, fim); aplicarVista(true); return; }
    const ini = { x: V.x, y: V.y, z: V.z }, t0 = performance.now(), dur = 260;
    const passo = agora => {
      const k = Math.min(1, (agora - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      // interpola o zoom na escala logarítmica e o ponto central em unidades do mapa: o alvo vem reto para o meio
      const z1 = ini.z * Math.pow(fim.z / ini.z, e);
      const cx0 = (t.w / 2 - ini.x) / ini.z, cy0 = (t.h / 2 - ini.y) / ini.z;
      const cx = cx0 + (c[0] - cx0) * e, cy = cy0 + (c[1] - cy0) * e;
      V.z = z1; V.x = t.w / 2 - cx * z1; V.y = t.h / 2 - cy * z1;
      aplicarVista(k >= 1);
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  const tf = (x, y) => `translate(${um(x * 100) / 100} ${um(y * 100) / 100}) scale(${1 / (zAplicado || V.z)})`;
  // Grupo de tamanho constante na tela: dentro dele, 1 unidade = 1 px. O zoom só reescreve o transform.
  function fixo(x, y, cls) {
    const el = s('g', { class: 'fixo' + (cls ? ' ' + cls : '') });
    el.__x = x; el.__y = y;
    el.setAttribute('transform', tf(x, y));
    return el;
  }
  // O #mundo segue a vista na hora. A escala do SVG (zAplicado) só alcança o zoom quando ele para: no meio da roda,
  // da pinça ou de uma animação o mapa inteiro escala como uma imagem, sem repintar 300 objetos a cada quadro (os
  // ícones crescem ou encolhem um instante); 140 ms depois tudo volta ao tamanho certo, nítido.
  let tAssentar = 0;
  function aplicarVista(assentar) {
    if (!mundoEl) return;
    mundoEl.style.transform = `translate(${V.x}px, ${V.y}px) scale(${V.z})`;
    if (V.z !== zAplicado) {
      if (assentar || !zAplicado) aplicarEscala();
      else { clearTimeout(tAssentar); tAssentar = setTimeout(() => aplicarVista(true), 140); }
    }
    if (zTxt) zTxt.textContent = (V.z < 0.1 ? num(V.z * 100, 1) : Math.round(V.z * 100)) + '%';
  }
  function aplicarEscala() {
    clearTimeout(tAssentar); tAssentar = 0;
    zAplicado = V.z;
    // O SVG fica no tamanho da tela e desfaz a escala do #mundo: assim o vector-effect (contorno fino) e os
    // textos valem em pixels de verdade — o Chromium não leva a escala CSS de fora em conta no non-scaling-stroke.
    svg.setAttribute('width', Math.max(1, L * V.z));
    svg.setAttribute('height', Math.max(1, A * V.z));
    svg.style.transform = `scale(${1 / V.z})`;
    for (const el of svg.getElementsByClassName('fixo')) el.setAttribute('transform', tf(el.__x, el.__y));
    for (const el of svg.getElementsByClassName('nome-linha')) ajustarNomeLinha(el, V.z);
    if (gradePath) gradePath.setAttribute('stroke-width', (1.2 / V.z).toFixed(4));
    arrumarRotulos();
    if (!g) desenharSelecao();
    desenharRascunho();
    if (!g && !pinca) { mundoEl.classList.remove('movendo'); quieto(false); }
  }
  // Rótulos que se cobrem ficam ilegíveis. Com o zoom afastado, mostra os mais importantes (o que está escolhido,
  // grupos, marcadores, eventos, regiões, linhas) e esconde os que cairiam em cima deles; ao aproximar, voltam.
  // O nome escondido continua no painel e na dica do mouse.
  function arrumarRotulos() {
    if (!svg || !M) return;
    const escolhidos = new Set((App && App.sel) || []), z = zAplicado || V.z, CEL = 96, grade = new Map();
    const ocupar = (caixa) => {
      for (let cx = Math.floor(caixa[0] / CEL); cx <= Math.floor(caixa[2] / CEL); cx++) for (let cy = Math.floor(caixa[1] / CEL); cy <= Math.floor(caixa[3] / CEL); cy++) {
        const k = cx + ':' + cy;
        if (!grade.has(k)) grade.set(k, []);
        grade.get(k).push(caixa);
      }
    };
    // os ícones (marcador, grupo, selo de evento) vêm antes: nome nenhum se escreve por cima de um ícone
    for (const cam of ['gru', 'mar', 'eve']) for (const o of C[cam].children) {
      const f = o.lastElementChild;
      if (f && f.__x !== undefined) ocupar([f.__x * z - 15, f.__y * z - 15, f.__x * z + 15, f.__y * z + 15]);
    }
    const primeiro = [], resto = [];
    for (const cam of ['gru', 'mar', 'eve', 'reg', 'rot', 'fre']) {
      const lista = C[cam].getElementsByClassName('rotulo');
      for (let i = lista.length - 1; i >= 0; i--) {         // os desenhados por cima têm a vez
        const el = lista[i];
        if (el.__id === undefined) { const o = el.closest('[data-id]'); el.__id = o ? o.getAttribute('data-id') : ''; }
        (escolhidos.has(el.__id) ? primeiro : resto).push(el);
      }
    }
    for (const el of primeiro.concat(resto)) {
      const pai = el.parentNode;
      if (!pai || pai.__x === undefined) continue;
      if (!el.__w) { const w = el.__oculto ? 0 : el.getComputedTextLength(); el.__w = w > 0 ? w : 0; }
      const w = el.__w || el.textContent.length * 7.5, dy = Number(el.getAttribute('y')) || 0;
      const x0 = pai.__x * z - w / 2 - 3, x1 = x0 + w + 6, y0 = pai.__y * z + dy - 12, y1 = y0 + 16;
      const cx0 = Math.floor(x0 / CEL), cx1 = Math.floor(x1 / CEL), cy0 = Math.floor(y0 / CEL), cy1 = Math.floor(y1 / CEL);
      let bate = false;
      for (let cx = cx0; cx <= cx1 && !bate; cx++) for (let cy = cy0; cy <= cy1 && !bate; cy++) {
        const caixas = grade.get(cx + ':' + cy);
        if (caixas) for (const b of caixas) if (x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]) { bate = true; break; }
      }
      const esconder = bate && !escolhidos.has(el.__id);
      if (esconder !== !!el.__oculto) { el.__oculto = esconder; el.style.display = esconder ? 'none' : ''; }
      if (!esconder) ocupar([x0, y0, x1, y1]);
    }
  }
  function agendarVista() {
    // durante o movimento o #mundo vira camada própria (desliza sem repintar) e as animações param; ao parar,
    // volta a ficar nítido
    if (mundoEl && !mundoEl.classList.contains('movendo')) { mundoEl.classList.add('movendo'); quieto(true); }
    soltarMovendo();
    if (!qVista) qVista = requestAnimationFrame(() => { qVista = 0; aplicarVista(); });
  }
  function soltarMovendo() {
    clearTimeout(tMovendo);
    tMovendo = setTimeout(() => { if (!g && !pinca && mundoEl) { mundoEl.classList.remove('movendo'); if (!tAssentar) quieto(false); } }, 180);
  }
  // animações em pausa enquanto a pessoa mexe no mapa: o quadro sai só com o que ela está fazendo
  function quieto(sim) { if (svg) svg.classList.toggle('quieto', !!sim); }
  function agendar() { if (!qTudo) qTudo = requestAnimationFrame(() => { qTudo = 0; redesenhar(); }); }
  function safeVista() { try { return App.vista(); } catch (e) { console.error(e); return null; } }

  /* ---- desenho ---- */
  function redesenhar() {
    if (qTudo) { cancelAnimationFrame(qTudo); qTudo = 0; }
    if (!App || !svg) return;
    // no meio de um arrasto o provisório manda; o resto espera o gesto acabar
    if (g && (g.tipo === 'mover' || g.tipo === 'alca' || g.tipo === 'pincel' || g.tipo === 'hexpincel' || g.tipo === 'pintura' || g.tipo === 'carimbos')) { adiado = true; return; }
    adiado = false;
    const m = safeVista();
    M = m;
    pintarTrilho();
    palco.className = 'palco ' + (podeEditar() ? 't-' + ferramenta() : 't-ver') + (g && g.tipo === 'pan' ? ' pan' : '');
    if (!m) {
      mundoEl.hidden = true; indice = new Map();
      desenharOpts(); atualizarDica();
      return;
    }
    mundoEl.hidden = false;
    indice = new Map((m.objs || []).map(o => [o.id, o]));
    if (m.id !== mapaId) {                     // outro mapa: limpa tudo e enquadra
      mapaId = m.id; rasc = null; regua = null; g = null; App.gesto = false;
      for (const r of recs.values()) { r.el.remove(); if (r.el2) r.el2.remove(); }
      recs.clear(); nevRef = null;
      L = m.larg; A = m.alt; zAplicado = 0;
      caber();
    } else if (m.larg !== L || m.alt !== A) { L = m.larg; A = m.alt; zAplicado = 0; caber(); }
    svg.setAttribute('viewBox', `0 0 ${L} ${A}`);
    aplicarVista(!tAssentar);
    desenharFundo(m);
    desenharPintura(m);
    desenharGrade(m);
    const fac = new Map((m.faccoes || []).map(f => [f.id, f]));
    ctxAtual = { m, dia: (m.cal && m.cal.dia) || 0, fac, mestre: mestreVe() };
    desenharObjetos(m, ctxAtual);
    // As animações (pulso dos eventos, marcha das frentes) repintam o SVG a cada quadro, fora da placa de vídeo.
    // Poucas, dão vida ao mapa; muitas, gastam a bateria e travam o resto: acima da conta, ficam paradas.
    svg.classList.toggle('sem-pulso', C.eve.getElementsByClassName('eve-pulso').length + C.zon.getElementsByClassName('zona-pulsa').length > 24);
    svg.classList.toggle('sem-marcha', C.fre.getElementsByClassName('frente-anda').length > 12);
    // Para quem vê a névoa fechada (jogador, "ver como jogador"), marcadores e selos vão por cima dela: só chega aqui o
    // que está à mostra (a projeção tira o que ela cobre), e perto da borda de uma clareira eles ficariam cortados.
    // O mestre vê a névoa translúcida por cima deles: sabe o que está coberto.
    const icAcima = !mestreVe();
    if (C.mar.__acima !== icAcima) { C.mar.__acima = icAcima; svg.insertBefore(C.mar, icAcima ? C.tra : C.nev); }
    desenharNevoa(m);
    desenharSelecao();
    desenharRascunho();
    arrumarRotulos();
    desenharOpts();
    atualizarDica();
  }

  function desenharFundo(m) {
    const chave = m.img && m.img.url ? 'img:' + m.img.url : 'papel';
    if (chave !== fundoChave) {
      fundoChave = chave;
      if (fundoEl) fundoEl.remove();
      if (chave === 'papel') fundoEl = h('div', { class: 'papel' });
      else {
        const img = fundoEl = h('img', { alt: '', draggable: 'false', decoding: 'async' });
        const pedido = chave;
        const falhou = () => {
          if (fundoChave !== pedido || fundoEl !== img) return;
          const p = h('div', { class: 'papel' });
          p.style.width = img.style.width; p.style.height = img.style.height;
          img.replaceWith(p); fundoEl = p;
          if (App.toast) App.toast('Não deu para abrir a imagem do mapa. Por enquanto aparece o papel em branco.');
        };
        img.addEventListener('error', falhou);
        let pr;
        try { pr = Promise.resolve(App.urlImagem(m.img)); } catch (e) { pr = Promise.reject(e); }
        pr.then(url => { if (fundoChave === pedido && fundoEl === img) { if (url) img.src = url; else falhou(); } }, falhou);
      }
      mundoEl.insertBefore(fundoEl, mundoEl.firstChild);          // por baixo de tudo (do desenho à mão também)
    }
    fundoEl.style.width = L + 'px';
    fundoEl.style.height = A + 'px';
  }

  /* ---- o desenho à mão do terreno ----
     Um <canvas> entre a imagem e o SVG, do tamanho do mapa (até uns 4 milhões de pixels: um mapa enorme fica um pouco
     macio de perto). As pinceladas valem em ordem: a tinta tem a textura do terreno e a borda macia; a borracha tira
     o que já estava pintado. Só é refeito quando o desenho (ou os tipos de terreno) mudam. */
  let pintEl = null, pintCtx = null, pintChave = null, pintK = 1;
  const texturas = new Map();
  function garantirPintura() {
    if (!pintEl) {
      pintEl = h('canvas', { class: 'pintura', 'aria-hidden': 'true' });
      mundoEl.insertBefore(pintEl, svg);
      pintCtx = pintEl.getContext('2d');
    }
    const k = Math.min(2, 4096 / Math.max(L, A, 1), Math.sqrt(4e6 / Math.max(1, L * A)));
    const w = Math.max(1, Math.round(L * k)), hh = Math.max(1, Math.round(A * k));
    if (pintEl.width !== w || pintEl.height !== hh) { pintEl.width = w; pintEl.height = hh; pintChave = null; }
    pintK = w / Math.max(1, L);
    pintEl.style.width = L + 'px';
    pintEl.style.height = A + 'px';
    return !!pintCtx;
  }
  function chaveDaPintura(m) {
    const ops = m.pintura.ops, u = ops[ops.length - 1];
    let n = 0;
    for (const op of ops) n += op.pts.length;
    return [ops.length, n, u.t, u.r, String(u.pts[0]), String(u.pts[u.pts.length - 1]), L, A, JSON.stringify((m.terrenos || []).map(t => [t.id, t.cor, t.tex]))].join('|');
  }
  function desenharPintura(m, forcar) {
    const p = m && m.pintura, tem = !!(p && Array.isArray(p.ops) && p.ops.length);
    if (!tem) {
      // (sem desenho: limpa também o que uma prévia deixou, para o próximo traço começar do zero)
      if (pintEl) { pintEl.hidden = true; if (pintCtx) { pintCtx.setTransform(1, 0, 0, 1, 0, 0); pintCtx.clearRect(0, 0, pintEl.width, pintEl.height); } }
      pintChave = null;
      return;
    }
    if (!garantirPintura()) return;
    pintEl.hidden = false;
    pintEl.style.opacity = String(p.alfa == null ? 1 : p.alfa);
    const chave = chaveDaPintura(m);
    if (!forcar && chave === pintChave) return;
    pintChave = chave;
    pintCtx.setTransform(1, 0, 0, 1, 0, 0);
    pintCtx.globalCompositeOperation = 'source-over';
    pintCtx.clearRect(0, 0, pintEl.width, pintEl.height);
    const ters = new Map((m.terrenos || []).map(t => [t.id, t]));
    for (const op of p.ops) tracar(op, ters, true);
  }
  // Uma pincelada (ou um trecho dela, enquanto pinta: sem a borda macia, que somaria nas emendas).
  function tracar(op, ters, macio, trecho) {
    const c = pintCtx, t = op.t ? ters.get(op.t) : null, P = trecho || op.pts;
    if (!c || (op.t && !t) || !P || !P.length) return;
    c.save();
    c.setTransform(pintK, 0, 0, pintK, 0, 0);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const linha = () => { c.beginPath(); c.moveTo(P[0][0], P[0][1]); if (P.length === 1) c.lineTo(P[0][0] + 0.01, P[0][1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); };
    c.globalCompositeOperation = t ? 'source-over' : 'destination-out';
    if (macio) {
      c.strokeStyle = t ? t.cor : '#000';
      c.globalAlpha = t ? 0.16 : 0.3; c.lineWidth = op.r * 2.5; linha(); c.stroke();
      c.globalAlpha = t ? 0.3 : 0.5; c.lineWidth = op.r * 2.22; linha(); c.stroke();
    }
    c.globalAlpha = 1; c.strokeStyle = t ? texturaDe(t) : '#000'; c.lineWidth = op.r * 2; linha(); c.stroke();
    c.restore();
  }
  // A textura de um terreno: um ladrilho que se repete, de 1/26 do mapa (o desenho miúdo acompanha o tamanho do mapa).
  function texturaDe(t) {
    const unid = limitar(Math.max(L, A) / 26, 16, 800), px = Math.round(limitar(unid * pintK, 24, 192));
    const chave = [t.cor, t.tex, px, unid].join('|');
    let pat = texturas.get(chave);
    if (pat) return pat;
    pat = pintCtx.createPattern(ladrilho(t.cor, t.tex || 'liso', px), 'repeat');
    try { pat.setTransform(new DOMMatrix([unid / px, 0, 0, unid / px, 0, 0])); } catch (e) { /* sem setTransform: o ladrilho fica do tamanho dos pixels */ }
    if (texturas.size > 80) texturas.clear();
    texturas.set(chave, pat);
    return pat;
  }
  // O ladrilho (desenhado numa caixa de 64 e escalado): a cor do terreno, manchas de aquarela e o desenho da textura,
  // espalhado sem amontoar e repetido nas bordas, para emendar sem costura.
  function ladrilho(cor, tex, T) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = T;
    const x = cv.getContext('2d'), esc = misturar(cor, '#000000', 0.32), cla = misturar(cor, '#ffffff', 0.28);
    let sem = 7;
    for (const ch of tex) sem = (sem * 31 + ch.charCodeAt(0)) % 2147483647;
    const rnd = () => (sem = (sem * 16807) % 2147483647) / 2147483647;
    x.fillStyle = cor; x.fillRect(0, 0, T, T);
    x.scale(T / 64, T / 64);
    x.lineCap = 'round'; x.lineJoin = 'round';
    const em = (px, py, fn) => { for (const dx of [-64, 0, 64]) for (const dy of [-64, 0, 64]) { x.save(); x.translate(px + dx, py + dy); fn(); x.restore(); } };
    for (let i = 0; i < 6; i++) {
      const px = rnd() * 64, py = rnd() * 64, r = 8 + rnd() * 14, c0 = rnd() < 0.5 ? esc : cla;
      em(px, py, () => { x.fillStyle = c0; x.globalAlpha = 0.08; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill(); });
    }
    x.globalAlpha = 1;
    const n = { mato: 9, arvores: 7, colinas: 4, montes: 4, juncos: 6, areia: 40, neve: 14, ondas: 4, pedras: 8 }[tex] || 0, pos = [];
    for (let i = 0; i < n; i++) {
      let melhor = null, dm = -1;
      for (let k = 0; k < 8; k++) {
        const p = [rnd() * 64, rnd() * 64];
        let d = Infinity;
        for (const q of pos) for (const dx of [-64, 0, 64]) for (const dy of [-64, 0, 64]) d = Math.min(d, Math.hypot(p[0] - q[0] - dx, p[1] - q[1] - dy));
        if (d > dm) { dm = d; melhor = p; }
      }
      pos.push(melhor);
    }
    const linhas = (...segs) => { x.beginPath(); for (const [a, b, c, d] of segs) { x.moveTo(a, b); x.lineTo(c, d); } x.stroke(); };
    for (const [px, py] of pos) em(px, py, () => {
      x.strokeStyle = esc; x.fillStyle = esc; x.lineWidth = 1.3;
      switch (tex) {
        case 'mato': linhas([-3, 1, -1.5, -2], [0, 1.5, 0, -3], [3, 1, 1.5, -2]); break;
        case 'arvores': x.fillStyle = misturar(cor, '#000000', 0.18); x.beginPath(); x.arc(0, 0, 4.6, 0, 7); x.fill(); x.stroke(); x.fillStyle = cla; x.beginPath(); x.arc(-1.4, -1.6, 1.6, 0, 7); x.fill(); break;
        case 'colinas': x.beginPath(); x.moveTo(-8, 3); x.quadraticCurveTo(0, -7, 8, 3); x.stroke(); x.beginPath(); x.moveTo(-3, 0); x.quadraticCurveTo(0, -2.5, 2, -1); x.stroke(); break;
        case 'montes': x.fillStyle = misturar(cor, '#000000', 0.2); x.beginPath(); x.moveTo(-8, 5); x.lineTo(0, -7); x.lineTo(8, 5); x.closePath(); x.fill(); x.stroke();
          x.fillStyle = cla; x.beginPath(); x.moveTo(0, -7); x.lineTo(-3, -2.5); x.lineTo(0, -3.5); x.lineTo(2.2, -2.2); x.closePath(); x.fill(); break;
        case 'juncos': linhas([-3, 3, -3.5, -3], [0, 3, 0, -5], [3, 3, 3.6, -2.5], [-6, 4, 6, 4]); break;
        case 'areia': x.globalAlpha = 0.55; x.beginPath(); x.arc(0, 0, 0.7, 0, 7); x.fill(); x.globalAlpha = 1; break;
        case 'neve': x.strokeStyle = misturar('#9fb6c9', cor, 0.2); x.lineWidth = 1; linhas([-2.5, 0, 2.5, 0], [0, -2.5, 0, 2.5]); break;
        case 'ondas': x.strokeStyle = cla; x.lineWidth = 1.4; x.beginPath(); x.moveTo(-9, 0); x.quadraticCurveTo(-4.5, -4, 0, 0); x.quadraticCurveTo(4.5, 4, 9, 0); x.stroke(); break;
        case 'pedras': x.fillStyle = misturar(cor, '#000000', 0.15); x.beginPath(); x.moveTo(-3, 2); x.lineTo(-2, -2); x.lineTo(1.5, -2.5); x.lineTo(3.2, 1); x.lineTo(1, 2.6); x.closePath(); x.fill(); x.stroke(); break;
      }
    });
    return cv;
  }
  // a linha da pincelada, mais leve (Douglas-Peucker): tira os pontos que quase não mudam o traço
  function simplificar(pts, eps) {
    if (pts.length < 3) return pts;
    const manter = new Uint8Array(pts.length), pilha = [[0, pts.length - 1]];
    manter[0] = manter[pts.length - 1] = 1;
    const dseg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy, t = l2 ? limitar(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2, 0, 1) : 0; return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };
    while (pilha.length) {
      const [a, b] = pilha.pop();
      let iMax = -1, dMax = eps;
      for (let i = a + 1; i < b; i++) { const d = dseg(pts[i], pts[a], pts[b]); if (d > dMax) { dMax = d; iMax = i; } }
      if (iMax >= 0) { manter[iMax] = 1; pilha.push([a, iMax], [iMax, b]); }
    }
    return pts.filter((_, i) => manter[i]);
  }

  /* A grade de hexágonos: um <pattern> que se repete (barato com qualquer tamanho de mapa), por cima da tinta do
     terreno de cada hexágono. Aparece com "mostrar a grade" (aba Terreno) e, para o mestre, enquanto ele usa a
     ferramenta Terreno. */
  const d3 = v => Math.round(v * 1000) / 1000;
  function caminhoDaGrade(gr) {
    // um ladrilho com dois hexágonos (em pé: W × 3s; deitado: o mesmo com x e y trocados); as duas bordas de cada
    // linha que cai na emenda entram, para ela não sair com meia espessura
    const s0 = gr.tam / Math.sqrt(3), W = gr.tam, dt = gr.orient === 'deitado';
    const P = (x, y) => (dt ? d3(y) + ' ' + d3(x) : d3(x) + ' ' + d3(y));
    const d = 'M' + P(0, 0) + 'L' + P(W / 2, s0 / 2) + 'L' + P(W, 0) + 'M' + P(W / 2, s0 / 2) + 'L' + P(W / 2, 1.5 * s0)
      + 'M' + P(0, 2 * s0) + 'L' + P(W / 2, 1.5 * s0) + 'L' + P(W, 2 * s0) + 'M' + P(0, 2 * s0) + 'L' + P(0, 3 * s0) + 'M' + P(W, 2 * s0) + 'L' + P(W, 3 * s0);
    return { d, w: dt ? 3 * s0 : W, h: dt ? W : 3 * s0, x: dt ? gr.x - s0 : gr.x, y: dt ? gr.y : gr.y - s0 };
  }
  const usandoTerreno = () => podeEditar() && ferramenta() === 'h';
  function desenharGrade(m) {
    const gr = m.grade || {}, ferr = usandoTerreno(), mostrar = temGrade(m) && (!!gr.on || ferr);
    C.hex.style.display = mostrar ? '' : 'none';
    if (!mostrar) return;
    const cg = caminhoDaGrade(gr), chaveG = [cg.d, cg.w, cg.h, cg.x, cg.y].join('|');
    if (gradePat.__chave !== chaveG) {
      gradePat.__chave = chaveG;
      for (const [k, v] of [['x', cg.x], ['y', cg.y], ['width', cg.w], ['height', cg.h]]) gradePat.setAttribute(k, d3(v));
      gradePath.setAttribute('d', cg.d);
    }
    gradePath.setAttribute('stroke-width', (1.2 / (zAplicado || V.z)).toFixed(4));
    gradeRect.setAttribute('width', L); gradeRect.setAttribute('height', A);
    gradeRect.style.opacity = String(ferr ? Math.max(gr.alfa || 0, 0.5) : gr.alfa);
    // a tinta: um path por tipo de terreno, refeito só quando o terreno ou a grade mudam
    const custo = ferr && mestreVe();
    const chaveT = JSON.stringify([m.hexes, m.terrenos, gr.tam, gr.x, gr.y, gr.orient, custo]);
    if (chaveT === hexChave) return;
    hexChave = chaveT;
    const por = new Map(), custos = [];
    let nada = '';
    for (const k of Object.keys(m.hexes || {})) {
      const v = m.hexes[k], t = typeof v === 'string' ? v : Array.isArray(v) ? v[0] : '', hx = N().lerChaveHex(k);
      if (!hx) continue;
      if (t === '-') { if (custo) nada += caminho(N().cantosHex(m, hx.q, hx.r), true); }        // "sem terreno", por cima do desenho
      else if (t) por.set(t, (por.get(t) || '') + caminho(N().cantosHex(m, hx.q, hx.r), true));
      if (Array.isArray(v) && v[1] != null) custos.push([hx, v[1]]);
    }
    const frag = document.createDocumentFragment();
    for (const t of m.terrenos || []) { const d = por.get(t.id); if (d) frag.append(s('path', { class: 'hex-ter', d, fill: t.cor, 'data-ter': t.id })); }
    if (nada) frag.append(s('path', { class: 'hex-nada', d: nada }));
    // o custo próprio de cada hexágono, para o mestre, enquanto ele pinta o terreno
    if (custo) for (const [hx, c] of custos) {
      const p = N().centroHex(m, hx.q, hx.r), fx = fixo(p.x, p.y, 'hex-custo');
      fx.append(s('text', { y: 4, 'text-anchor': 'middle', 'font-size': 11, texto: num(c, 1) }));
      frag.append(fx);
    }
    hexTer.replaceChildren(frag);
  }

  /* objetos: cada um vira um <g data-id>; a chave diz quando precisa reconstruir */
  function chaveDe(o, ctx) {
    let extra = ctx.mestre ? 'M' : 'J';
    if (o.k === 'r') { const f = o.fac && ctx.fac.get(o.fac); extra += f ? f.cor : ''; }
    else if (o.k === 'f') { const a = o.a && ctx.fac.get(o.a), b = o.b && ctx.fac.get(o.b); extra += (a ? a.cor : '') + '/' + (b ? b.cor : ''); }
    else if (o.k === 't') extra += '|' + andadoDe(ctx.m, o);
    else if (o.k === 'e') extra += '|' + eventoAtivo(o, ctx.dia) + '|' + raioNoDia(o, ctx.dia);
    else if (o.k === 'z') { const a = o.a && ctx.fac.get(o.a), b = o.b && ctx.fac.get(o.b); extra += (a ? a.cor : '') + '/' + (b ? b.cor : '') + '|' + zonaAtiva(o, ctx.dia) + '|' + faseNoDia(o, ctx.dia); }
    return JSON.stringify(o) + extra;
  }
  let avisouErro = false;
  function desenharObjetos(m, ctx) {
    const vistos = new Set(), por = { lin: [], car: [], reg: [], zon: [], txt: [], fre: [], rot: [], eve: [], mar: [], gru: [] };
    for (const o of m.objs || []) {
      const cam = CAMADA[o.k];
      if (!cam || !o.id) continue;
      let r = recs.get(o.id), chave;
      try {
        chave = chaveDe(o, ctx);
        if (!r || r.chave !== chave) {
          const el = construir(o, ctx);
          if (r) { r.el.remove(); if (r.el2) r.el2.remove(); }
          r = { el, el2: el.__ico || null, chave };                // el2: o selo do evento, na camada dos ícones
          recs.set(o.id, r);
        }
      } catch (e) {
        if (!avisouErro) { avisouErro = true; console.error('Mapa-múndi: não deu para desenhar um objeto.', o, e); }
        continue;
      }
      vistos.add(o.id);
      por[cam].push(r.el);
      if (r.el2) por.mar.push(r.el2);
    }
    for (const [id, r] of recs) if (!vistos.has(id)) { r.el.remove(); if (r.el2) r.el2.remove(); recs.delete(id); }
    for (const cam in por) ordenar(C[cam], por[cam]);
  }
  // Põe os filhos na ordem pedida mexendo só no que saiu do lugar (mover um nó reinicia as animações dele).
  function ordenar(pai, lista) {
    let atual = pai.firstChild;
    for (const el of lista) {
      if (el === atual) { atual = atual.nextSibling; continue; }
      pai.insertBefore(el, atual);
    }
    while (atual) { const prox = atual.nextSibling; atual.remove(); atual = prox; }
  }

  function construir(o, ctx) {
    const g0 = s('g', { class: 'obj', 'data-id': o.id });
    if (o.oculto) g0.classList.add('oculto');
    switch (o.k) {
      case 'r': regiao(g0, o, ctx); break;
      case 'f': frente(g0, o, ctx); break;
      case 't': rota(g0, o, ctx); break;
      case 'e': evento(g0, o, ctx); break;
      case 'm': marcador(g0, o); break;
      case 'g': grupo(g0, o); break;
      case 'z': zona(g0, o, ctx); break;
      case 'l': linhaGeo(g0, o); break;
      case 'c': carimbo(g0, o); break;
      case 'x': textoLivre(g0, o); break;
    }
    return g0;
  }
  function rotulo(texto, y, cls) {
    return s('text', { class: cls || 'rotulo', y, 'text-anchor': 'middle', 'font-size': 12.5, texto: curto(String(texto), 48) });
  }
  const moldes = new Map();
  function glifo(def, tam) {
    let molde = moldes.get(def.svg);
    if (!molde) { molde = s('g'); molde.innerHTML = def.svg || ''; moldes.set(def.svg, molde); }  // markup fixo do núcleo
    const el = molde.cloneNode(true);
    el.setAttribute('class', 'glifo');
    el.setAttribute('transform', `translate(${-tam / 2} ${-tam / 2}) scale(${tam / 24})`);
    return el;
  }
  function regiao(g0, o, ctx) {
    if (!Array.isArray(o.pts) || o.pts.length < 3) return;
    g0.classList.add('regiao');
    const f = o.fac ? ctx.fac.get(o.fac) : null, cor = f ? f.cor : (o.cor || '');
    g0.append(s('path', { class: 'reg' + (cor ? '' : ' semfac'), d: caminho(o.pts, true), fill: cor || null, stroke: cor || null }));
    if (o.nome) {
      const c = pontoDoNome(o.pts), fx = fixo(c[0], c[1]);
      fx.append(rotulo(String(o.nome).toLocaleUpperCase('pt-BR'), 4, 'rotulo rotulo-reg'));
      g0.append(fx);
    }
  }
  function corFac(ctx, id) { const f = id ? ctx.fac.get(id) : null; return f ? f.cor : '#9aa3b5'; }
  function frente(g0, o, ctx) {
    if (!Array.isArray(o.pts) || o.pts.length < 2) return;
    g0.classList.add('fre');
    const d = caminho(o.pts), anda = o.ativa !== false ? ' frente-anda' : '';
    g0.append(
      s('path', { class: 'fre-a' + anda, d, stroke: corFac(ctx, o.a) }),
      s('path', { class: 'fre-b' + anda, d, stroke: corFac(ctx, o.b) }),
      s('path', { class: 'fre-hit', d }));
    if (o.nome) { const c = meioDe(o.pts), fx = fixo(c[0], c[1]); fx.append(rotulo(o.nome, -10, 'rotulo rotulo-linha')); g0.append(fx); }
  }
  // até onde os grupos desta rota já andaram (em unidades ao longo dela): o ponto da rota mais perto do mais adiantado
  function andadoDe(m, rt) {
    let s0 = 0;
    for (const o of m.objs || []) {
      if (o.k !== 'g' || o.rota !== rt.id || !(o.prog > 0)) continue;
      try { const q = N().maisPerto(rt.pts, [o.x, o.y]); if (q && q.s > s0) s0 = q.s; } catch (e) { /* núcleo antigo: sem o trecho andado */ }
    }
    return s0 > 0 ? um(s0) : 0;
  }
  function rota(g0, o, ctx) {
    if (!Array.isArray(o.pts) || o.pts.length < 2) return;
    g0.classList.add('rota');
    const d = caminho(o.pts), via = /^[a-z]+$/.test(o.via || '') ? ' via-' + o.via : '';
    g0.append(s('path', { class: 'rot-fundo', d }), s('path', { class: 'rot' + via, d }));
    const andou = andadoDe(ctx.m, o);
    if (andou > 0) g0.append(s('path', { class: 'rot-andado' + via, d: caminho(trecho(o.pts, andou)) }));
    g0.append(s('path', { class: 'rot-hit', d }));
    if (o.nome) { const c = meioDe(o.pts), fx = fixo(c[0], c[1]); fx.append(rotulo(o.nome, -10, 'rotulo rotulo-linha')); g0.append(fx); }
  }
  function evento(g0, o, ctx) {
    const def = defEvento(o.tipo), cor = def.cor || '#f0786e';
    const ativo = eventoAtivo(o, ctx.dia), r = raioNoDia(o, ctx.dia);
    g0.classList.add('eve');
    if (!ativo) g0.classList.add('inativo');
    if (r > 0) {
      const forca = limitar(Math.round(o.forca) || 1, 1, 3);
      g0.append(s('circle', { class: 'eve-area', cx: um(o.x), cy: um(o.y), r: um(r), fill: cor, stroke: cor, style: `fill-opacity:${[0.1, 0.16, 0.24][forca - 1]}` }));
      if (ativo) for (const b of ['', ' b']) g0.append(s('circle', { class: 'eve-pulso' + b, cx: um(o.x), cy: um(o.y), r: um(r), stroke: cor, 'pointer-events': 'none' }));
    }
    // O selo (tamanho fixo na tela) vai na camada dos ícones, com os marcadores: para quem vê a névoa fechada ela fica
    // por cima dela, e um evento perto da borda de uma clareira não aparece meio coberto. A área fica embaixo.
    const g1 = s('g', { class: g0.getAttribute('class'), 'data-id': o.id });
    const fx = fixo(o.x, o.y);
    fx.append(
      s('title', { texto: (o.nome ? o.nome + ' · ' : '') + def.nome + (ativo ? '' : ' (fora da data de hoje)') }),
      s('circle', { class: 'alvo', r: 20, fill: 'transparent' }),
      s('path', { class: 'selo', d: 'M0 -17L17 0L0 17L-17 0Z', fill: cor, 'stroke-linejoin': 'round' }),
      glifo(def, 17));
    fx.append(rotulo(o.nome || def.nome, 31));
    g1.append(fx);
    g0.__ico = g1;
  }
  function marcador(g0, o) {
    const def = defIcone(o.ic), cor = o.cor || def.cor || '#e6ab4f';
    g0.classList.add('mar');
    if (o.rumor) g0.classList.add('rumor');
    if (o.falso) g0.classList.add('falso');
    const fx = fixo(o.x, o.y);
    fx.append(
      s('title', { texto: (o.nome ? o.nome + ' · ' : '') + def.nome + (o.rumor ? ' (boato)' : '') }),
      s('circle', { class: 'alvo', r: 20, fill: 'transparent' }),
      s('circle', { class: 'selo', r: 14, fill: cor }),
      glifo(def, 19));
    if (o.rumor) fx.append(s('circle', { class: 'rumor-bola', cx: 12, cy: -12, r: 7.5, fill: '#2b3243', stroke: '#f3ead2' }), s('text', { class: 'interroga', x: 12, y: -8, 'text-anchor': 'middle', 'font-size': 11, texto: '?' }));
    if (o.falso) fx.append(s('path', { class: 'risco', d: 'M-12 12L12 -12' }));
    // marcador com atalho (abre uma cena, outro mapa ou o acampamento): uma setinha no canto de baixo
    if (o.liga) { g0.classList.add('com-liga'); fx.append(s('circle', { class: 'liga-bola', cx: 12, cy: 12, r: 7 }), s('path', { class: 'liga-seta', d: 'M9.5 14.5l5-5M11 9.5h3.5V13' })); }
    if (o.nome) fx.append(rotulo(o.nome, 30));
    g0.append(fx);
  }
  function grupo(g0, o) {
    g0.classList.add('gru');
    const fx = fixo(o.x, o.y);
    fx.append(
      s('title', { texto: o.nome || 'Grupo' }),
      s('circle', { class: 'alvo', r: 22, fill: 'transparent' }),
      s('circle', { class: 'grupo-anel', r: 19.5 }),
      s('circle', { class: 'grupo-base', r: 15, fill: o.cor || '#e6ab4f' }),
      s('text', { class: 'sigla' + (clara(o.cor || '#e6ab4f') ? ' escura' : ''), y: 4.3, 'text-anchor': 'middle', 'font-size': 11.5, texto: String(o.sigla || '').slice(0, 3) }));
    if (o.nome) fx.append(rotulo(o.nome, 35));
    g0.append(fx);
  }
  // id seguro para o SVG (o padrão das listras, o caminho do nome)
  const idSvg = (pre, id) => pre + String(id).replace(/[^A-Za-z0-9_-]/g, '_');
  /* Zona de guerra: a área das duas facções, em listras com as duas cores; enquanto ativa, pulsa devagar. A forma é
     a do dia que está na tela (as fases mudam a área com o tempo). */
  function zona(g0, o, ctx) {
    const pts = formaDe(o, ctx.dia);
    if (!Array.isArray(pts) || pts.length < 3) return;
    const ativa = zonaAtiva(o, ctx.dia), ca = corFac(ctx, o.a), cb0 = corFac(ctx, o.b), cb = cb0 === ca ? misturar(ca, '#000000', 0.4) : cb0;
    g0.classList.add('zon');
    if (!ativa) g0.classList.add('inativa');
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const W = um(limitar(Math.hypot(x1 - x0, y1 - y0) / 18, 3, 600)), pid = idSvg('zg-', o.id), d = caminho(pts, true);
    g0.append(
      s('defs', null, s('pattern', { id: pid, patternUnits: 'userSpaceOnUse', width: W, height: W, patternTransform: 'rotate(45)' },
        s('rect', { width: um(W / 2), height: W, fill: ca }), s('rect', { x: um(W / 2), width: um(W / 2), height: W, fill: cb }))),
      s('path', { class: 'zona' + (ativa ? ' zona-pulsa' : ''), d, fill: `url(#${pid})` }),
      s('path', { class: 'zona-borda', d, stroke: ca }),
      s('path', { class: 'zona-borda b', d, stroke: cb }));
    if (o.nome) { const c = pontoDoNome(pts), fx = fixo(c[0], c[1]); fx.append(rotulo(String(o.nome).toLocaleUpperCase('pt-BR'), 4, 'rotulo rotulo-reg')); g0.append(fx); }
  }
  /* Linha do mapa (geografia): suave, passando por todos os pontos. O rio engrossa da nascente até a foz; a estrada é
     tracejada e a trilha, pontilhada, as duas com um fundo claro por baixo. O nome vai ao longo da linha, sempre da
     esquerda para a direita, no tamanho dos outros nomes (refeito a cada zoom). */
  function linhaGeo(g0, o) {
    if (!Array.isArray(o.pts) || o.pts.length < 2) return;
    const def = defLinha(o.estilo), cor = o.cor || def.cor, w = Math.max(0.5, Number(o.larg) || 1);
    g0.classList.add('lin', 'lin-' + o.estilo);
    let centro = o.pts;
    try { centro = N().suavizar(o.pts, Math.max(1, w * 0.8)); } catch (e) { /* núcleo antigo: a linha reta */ }
    const d = caminho(centro);
    if (o.estilo === 'rio') {
      let cont = [];
      try { cont = N().contornoRio(o.pts, w, o.id); } catch (e) { /* núcleo antigo */ }
      g0.append(cont.length ? s('path', { class: 'rio', d: caminho(cont, true), fill: cor, stroke: misturar(cor, '#000000', 0.35) })
        : s('path', { class: 'lin-traco', d, stroke: cor, 'stroke-width': um(w) }));
    } else {
      const est = o.estilo === 'estrada';
      g0.append(s('path', { class: 'lin-fundo', d, 'stroke-width': um(w * 1.9) }),
        s('path', { class: 'lin-traco', d, stroke: cor, 'stroke-width': um(w), 'stroke-dasharray': est ? um(w * 2.6) + ' ' + um(w * 1.5) : '0.01 ' + um(w * 2.2), 'stroke-linecap': est ? 'butt' : 'round' }));
    }
    g0.append(s('path', { class: 'lin-hit', d }));
    if (o.nome) {
      const ida = centro[centro.length - 1][0] >= centro[0][0], pid = idSvg('ln-', o.id);
      g0.append(s('path', { id: pid, class: 'lin-guia', d: ida ? d : caminho(centro.slice().reverse()) }));
      const t = s('text', { class: 'nome-linha' + (o.estilo === 'rio' ? ' rio-nome' : ''), fill: misturar(cor, '#000000', 0.45), 'text-anchor': 'middle' });
      t.__w = o.estilo === 'rio' ? w * 0.55 : w * 1.1;
      t.append(s('textPath', { href: '#' + pid, startOffset: '50%', texto: curto(String(o.nome), 60) }));
      ajustarNomeLinha(t, zAplicado || V.z);
      g0.append(t);
    }
  }
  function ajustarNomeLinha(t, z) {
    t.setAttribute('font-size', (14 / z).toFixed(3));
    t.setAttribute('dy', (-((t.__w || 0) + 5 / z)).toFixed(3));
    t.setAttribute('stroke-width', (2.4 / z).toFixed(3));
  }
  // os desenhos (carimbos) vêm do núcleo como markup fixo; um molde de cada, clonado
  function molde(markup) {
    let m0 = moldes.get(markup);
    if (!m0) { m0 = s('g'); m0.innerHTML = markup || ''; moldes.set(markup, m0); }     // markup fixo do núcleo
    return m0.cloneNode(true);
  }
  // Carimbo: o desenho na caixa tam × tam, com o centro no ponto (virado, se pedido). Cresce e encolhe com o mapa.
  function carimbo(g0, o) {
    const def = defCarimbo(o.ic), t = Math.max(1, Number(o.tam) || 40), x0 = o.x - t / 2, y0 = o.y - t / 2, k = t / 24;
    g0.classList.add('car');
    const arte = molde(def.svg);
    arte.setAttribute('class', 'carimbo');
    arte.setAttribute('style', 'color:' + (o.cor || def.cor || '#5d9a4e'));
    arte.setAttribute('transform', `translate(${um(o.vira ? x0 + t : x0)} ${um(y0)}) scale(${(o.vira ? -k : k).toFixed(5)} ${k.toFixed(5)})`);
    g0.append(s('rect', { class: 'alvo', x: um(x0), y: um(y0), width: um(t), height: um(t), fill: 'transparent' }), arte);
    if (o.nome) { const fx = fixo(o.x, o.y + t / 2); fx.append(rotulo(o.nome, 14)); g0.append(fx); }
  }
  /* Texto livre: as letras crescem e encolhem com o mapa (é parte do desenho). Cor escura de mapa, com um halo claro
     (ou o contrário, numa cor clara); pode girar e ter várias linhas. */
  function textoLivre(g0, o) {
    const linhas = String(o.nome || '').split('\n').slice(0, 12), tam = Math.max(1, Number(o.tam) || 28), cor = o.cor || TINTA;
    const halo = clara(cor) ? 'rgba(20,16,10,.72)' : 'rgba(246,239,224,.85)';
    g0.classList.add('txt');
    const st = 'font-family:' + (FONTE_CSS[o.fonte] || FONTE_CSS.mapa) + ';fill:' + cor + ';stroke:' + halo + ';stroke-width:' + um(tam * 0.14) + 'px'
      + (o.fonte === 'classica' ? ';font-style:italic' : '') + (o.esp ? ';letter-spacing:' + o.esp + 'em' : '');
    const t = s('text', { class: 'texto-livre', x: um(o.x), y: um(o.y), 'text-anchor': 'middle', 'font-size': um(tam), style: st,
      transform: o.rot ? `rotate(${o.rot} ${um(o.x)} ${um(o.y)})` : null });
    const n = linhas.length;
    linhas.forEach((l, i) => t.append(s('tspan', { x: um(o.x), dy: i ? '1.15em' : (0.35 - (n - 1) * 0.575).toFixed(3) + 'em', texto: l || ' ' })));
    g0.append(t);
  }

  /* névoa: tudo coberto, e as operações em ordem por cima. Operações seguidas do mesmo tipo viram um path só
     (círculos no mesmo sentido se somam), então 2000 pinceladas viram poucos nós na máscara. */
  const circulo = (x, y, r) => `M${um(x - r)} ${um(y)}a${um(r)} ${um(r)} 0 1 0 ${um(2 * r)} 0a${um(r)} ${um(r)} 0 1 0 ${um(-2 * r)} 0Z`;
  function desenharNevoa(m) {
    const nv = m.nevoa || {}, ops = Array.isArray(nv.ops) ? nv.ops : [];
    const pincelando = ferramenta() === 'n' && podeEditar();
    const mostrar = !!nv.on || pincelando;
    C.nev.style.display = mostrar ? '' : 'none';
    if (!g || (g.tipo !== 'pincel' && g.tipo !== 'hexpincel')) C.tra.replaceChildren();
    if (!mostrar) return;
    for (const el of [mascara, mascBase, nevRect]) { el.setAttribute('x', 0); el.setAttribute('y', 0); el.setAttribute('width', L); el.setAttribute('height', A); }
    // mestre vê através (translúcida); jogador e "ver como jogador", opaca. Desligada, só uma sombra enquanto pinta.
    nevRect.setAttribute('opacity', mestreVe() ? (nv.on ? 0.55 : 0.3) : 1);
    const chave = ops.length + ':' + L + 'x' + A;
    if (nevRef === ops && mascOps.__chave === chave) return;
    nevRef = ops; mascOps.__chave = chave;
    const frag = document.createDocumentFragment();
    let tipo = null, d = '';
    const fecha = () => { if (d) frag.append(s('path', { d, fill: tipo === '+' ? '#000' : '#fff' })); d = ''; };
    for (const op of ops) {
      if (!op || !(op.r > 0)) continue;
      if (op.t !== tipo) { fecha(); tipo = op.t; }
      d += circulo(op.x, op.y, op.r);
    }
    fecha();
    mascOps.replaceChildren(frag);
  }

  /* seleção e alças */
  function desenharSelecao(prov) {
    C.sel.replaceChildren();
    C.sel.removeAttribute('transform');
    if (!M) return;
    const ids = selecao();
    if (!ids.length) return;
    const editar = podeEditar() && ferramenta() === 'sel';
    let unico = null;
    for (const id of ids) {
      const o = prov && prov.id === id ? prov : indice.get(id);
      if (!o) continue;
      unico = o;
      if (Array.isArray(o.pts)) {
        const pts = formaDe(o);
        if (Array.isArray(pts) && pts.length > 1) C.sel.append(s('path', { class: 'sel-anel', d: caminho(pts, fechada(o.k)) }));
      } else if (o.k === 'c' || o.k === 'x') {
        C.sel.append(anelDoEnfeite(o));
      } else {
        const fx = fixo(o.x, o.y);
        fx.append(s('circle', { class: 'sel-anel', r: o.k === 'g' ? 25 : 22 }));
        C.sel.append(fx);
        const rh = o.k === 'e' ? raioNoDia(o, diaDaVista()) : 0;           // a borda que aparece hoje, não a do primeiro dia
        if (rh > 0 && ids.length === 1) C.sel.append(s('circle', { class: 'sel-anel', cx: um(o.x), cy: um(o.y), r: um(rh) }));
      }
    }
    if (ids.length !== 1 || !editar || !unico) return;
    const o = unico;
    // a alça do raio nunca fica em cima do selo (raio 0 ainda dá para puxar)
    if (o.k === 'e') { C.sel.append(alca('raio', 0, o.x + Math.max(raioNoDia(o, diaDaVista()), 30 / V.z), o.y)); return; }
    if (!Array.isArray(o.pts)) return;
    const pts = ptsEditaveis(o), n = pts.length, fecha = fechada(o.k);
    for (let i = 0; i < (fecha ? n : n - 1); i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      // o ponto do meio só aparece se o lado tem espaço na tela para ele
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) * V.z > 34) C.sel.append(alca('meio', i, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2));
    }
    pts.forEach((p, i) => C.sel.append(alca('v', i, p[0], p[1])));
  }
  // O contorno de um carimbo ou de um texto escolhido: a caixa dele (o texto gira junto).
  function anelDoEnfeite(o) {
    const z = zAplicado || V.z, folga = 3 / z;
    if (o.k === 'c') { const t = (Number(o.tam) || 40) / 2 + folga; return s('rect', { class: 'sel-anel', x: um(o.x - t), y: um(o.y - t), width: um(2 * t), height: um(2 * t) }); }
    let b = null;
    try { const r = recs.get(o.id), el = r && r.el.querySelector('text'); if (el) b = el.getBBox(); } catch (e) { /* ainda não desenhado */ }
    if (!b || !(b.width > 0)) {
      const linhas = String(o.nome || ' ').split('\n'), tam = Number(o.tam) || 28, w = Math.max(...linhas.map(l => l.length)) * tam * 0.55, hh = linhas.length * tam * 1.15;
      b = { x: o.x - w / 2, y: o.y - hh / 2, width: w, height: hh };
    }
    return s('rect', { class: 'sel-anel', x: um(b.x - folga), y: um(b.y - folga), width: um(b.width + 2 * folga), height: um(b.height + 2 * folga),
      transform: o.rot ? `rotate(${o.rot} ${um(o.x)} ${um(o.y)})` : null });
  }
  function alca(tipo, i, x, y) {
    const fx = fixo(x, y);
    fx.setAttribute('data-alca', tipo); fx.setAttribute('data-i', i);
    fx.append(s('circle', { class: 'alca-alvo', r: toqueGrosso() ? 16 : 11, fill: 'transparent' }), s('circle', { class: 'alca' + (tipo === 'meio' ? ' meio' : ''), r: tipo === 'meio' ? 4.5 : 6.5 }));
    return fx;
  }

  /* rascunho: a linha sendo desenhada, o raio do evento, a régua, o pincel */
  function desenharRascunho() {
    const c = C.rasc;
    if (!c) return;
    c.replaceChildren();
    if (!M) return;
    if (rasc && rasc.pts.length) {
      const pts = rasc.pts.slice();
      if (cursor && !(g && g.toque)) pts.push([cursor.x, cursor.y]);
      c.append(s('path', { class: 'rasc' + (fechada(rasc.k) ? '' : ' linha'), d: caminho(pts, fechada(rasc.k)) }));
      rasc.pts.forEach((p, i) => {
        const fecha = i === 0 && fechada(rasc.k) && rasc.pts.length >= 3;
        const fx = fixo(p[0], p[1]);
        fx.append(s('circle', { class: 'rasc-ponto' + (fecha ? ' fecha' : ''), r: fecha ? 7 : 4.5 }));
        c.append(fx);
      });
    }
    if (g && g.tipo === 'evento' && g.moveu && g.r > 0) {
      c.append(s('circle', { class: 'rasc', cx: um(g.p0.x), cy: um(g.p0.y), r: um(g.r) }));
      const fx = fixo(g.p0.x, g.p0.y);
      fx.append(rotulo('raio: ' + textoDistancia(M, g.r).split(' · ')[0], -14));
      c.append(fx);
    }
    if (regua) {
      const { a, b } = regua, u = Math.hypot(b.x - a.x, b.y - a.y);
      // na grade, os hexágonos por onde a régua passa (medindo a grade, não: ela ainda vai mudar)
      const mh = medindo ? null : medidaHex(M, a, b);
      if (mh && mh.linha.length <= 600) { let d = ''; for (const hx of mh.linha) d += caminho(N().cantosHex(M, hx.q, hx.r), true); c.append(s('path', { class: 'regua-hex', d })); }
      c.append(s('line', { class: 'regua', x1: um(a.x), y1: um(a.y), x2: um(b.x), y2: um(b.y) }));
      for (const p of [a, b]) { const fx = fixo(p.x, p.y); fx.append(s('circle', { class: 'regua-ponta', r: 4.5 })); c.append(fx); }
      if (u * V.z > 4) {
        const fx = fixo((a.x + b.x) / 2, (a.y + b.y) / 2);
        fx.append(rotulo(medindo ? num(u, 0) + ' unidades do mapa' : textoRegua(M, a, b), -12, 'rotulo regua-txt'));
        c.append(fx);
      }
    }
    if (ferramenta() === 'n' && cursor && podeEditar() && !(g && g.toque)) {
      c.append(s('circle', { class: 'pincel', cx: um(cursor.x), cy: um(cursor.y), r: um(raioPincel()) }));
    }
    // o pincel livre: o círculo embaixo do cursor; o carimbo: uma prévia clarinha onde ele vai cair
    if (ferramenta() === 'h' && modoTerreno() === 'livre' && cursor && podeEditar() && !(g && g.toque)) {
      c.append(s('circle', { class: 'pincel', cx: um(cursor.x), cy: um(cursor.y), r: um(raioLivre()) }));
    } else if (ferramenta() === 'p' && modoDesenho() === 'carimbo' && cursor && podeEditar() && !g && !toqueGrosso()) {
      const el = s('g', { class: 'car previa fantasma' });
      carimbo(el, { id: 'fantasma', x: cursor.x, y: cursor.y, ic: opt('carimbo'), tam: tamCarimbo(), cor: '', vira: false, nome: '' });
      c.append(el);
    }
    // a ferramenta Terreno: os hexágonos que o pincel pega, embaixo do cursor
    else if (ferramenta() === 'h' && cursor && podeEditar() && temGrade(M) && !(g && g.toque)) {
      const hx = N().hexDe(M, cursor.x, cursor.y);
      let d = '';
      for (const x of hexesDoPincel(hx)) d += caminho(N().cantosHex(M, x.q, x.r), true);
      c.append(s('path', { class: 'pincel-hex', d }));
    }
  }
  // O tamanho do pincel é em pixels da tela: afastar o zoom pinta áreas maiores, aproximar dá precisão.
  const raioPincel = () => limitar(Number(opt('raio')) || 60, 4, 400) / V.z;

  /* ---- a ferramenta Terreno, à mão livre: pinceladas com a textura do terreno (ou a borracha) ----
     Sem escolha feita, com a grade vale "por hexágono" (o que já havia) e sem a grade, "pincel livre". */
  const modoTerreno = () => (opt('terPincel') === 'livre' || opt('terPincel') === 'hex' ? opt('terPincel') : M && temGrade(M) ? 'hex' : 'livre');
  function pinTerreno() { const ts = (M && M.terrenos) || []; return ts.find(t => t.id === opt('pinTer')) || ts[0] || null; }
  const raioLivre = () => limitar(Number(opt('pinRaio')) || 24, 2, 400) / V.z;
  // enquanto arrasta: o trecho novo vai direto para o canvas (a pincelada inteira, com a borda macia, vem ao soltar)
  function pintarAoVivo(p) {
    const ult = g.pts[g.pts.length - 1], q = [Math.round(p.x), Math.round(p.y)];
    if (ult && Math.hypot(q[0] - ult[0], q[1] - ult[1]) < Math.max(0.5, g.r * 0.25)) return;
    g.pts.push(q);
    tracar({ t: g.t, r: g.r }, g.ters, false, ult ? [ult, q] : [q]);
  }
  function gravarPincelada(gg) {
    const pts = simplificar(gg.pts, Math.max(0.5, gg.r * 0.15)), lim = N().LIMITES || {}, maxP = lim.pontosPintura || 60000, maxN = lim.pinceladas || 4000;
    const op = { t: gg.t, r: um(gg.r), pts };
    let cheio = false;
    const ok = App.mudar(gg.t ? 'pintar à mão' : 'apagar o desenho', d => {
      if (!d.pintura || typeof d.pintura !== 'object') d.pintura = { alfa: 1, ops: [] };
      if (!Array.isArray(d.pintura.ops)) d.pintura.ops = [];
      if (!gg.t && !d.pintura.ops.length) return false;                       // borracha sem nada pintado
      let n = pts.length;
      for (const o of d.pintura.ops) n += (o.pts || []).length;
      if (n > maxP || d.pintura.ops.length >= maxN) { cheio = true; return false; }
      d.pintura.ops.push(op);
    });
    if (cheio) App.toast('O desenho à mão chegou ao limite deste mapa. Nada mudou. (Desfazer ou "Apagar o desenho", na aba Terreno, libera espaço.)');
    if (ok === false || cheio) desenharPintura(M, true);
  }

  /* ---- a ferramenta Desenho: carimbos, textos e linhas ---- */
  const tamCarimbo = () => limitar(Number(opt('carTam')) || 40, 8, 400) / V.z;
  // arrastando: um carimbo a cada passo, um pouco fora da linha e de tamanhos um pouco diferentes (fica natural)
  function espalhar(p) {
    const tam = tamCarimbo(), passo = tam * 0.85;
    if (!g.ult) { g.ult = [g.p0.x, g.p0.y]; previaCarimbo(g.p0, tam, false); }
    let d = Math.hypot(p.x - g.ult[0], p.y - g.ult[1]);
    while (d >= passo && g.lista.length < 300) {
      const k = passo / d, q = [g.ult[0] + (p.x - g.ult[0]) * k, g.ult[1] + (p.y - g.ult[1]) * k];
      g.ult = q;
      previaCarimbo({ x: q[0] + (Math.random() - 0.5) * tam * 0.35, y: q[1] + (Math.random() - 0.5) * tam * 0.35 }, tam * (0.85 + Math.random() * 0.3), Math.random() < 0.3);
      d = Math.hypot(p.x - g.ult[0], p.y - g.ult[1]);
    }
  }
  function previaCarimbo(q, tam, vira) {
    if (!dentroDoMapa(q, 2)) return;
    const c = { x: um(limitar(q.x, 0, L)), y: um(limitar(q.y, 0, A)), ic: opt('carimbo'), tam: um(tam), vira };
    g.lista.push(c);
    const el = s('g', { class: 'obj car previa' });
    carimbo(el, Object.assign({ id: 'previa', nome: '', cor: '' }, c));
    C.tra.append(el);
  }
  // Os carimbos de um clique ou de um arrasto: um passo de desfazer. A ferramenta continua (carimbar é repetitivo).
  function porCarimbos(lista) {
    const lim = (N().LIMITES && N().LIMITES.objs) || 2000, ids = [];
    let cheio = false;
    App.mudar(lista.length === 1 ? NOVO.c : 'espalhar ' + lista.length + ' carimbos', d => {
      if (!Array.isArray(d.objs)) d.objs = [];
      if (d.objs.length + lista.length > lim) { cheio = true; return false; }
      for (const c of lista) { const o = N().objNovo('c', Object.assign({ oculto: !!opt('oculto') }, c)); if (o) { d.objs.push(o); ids.push(o.id); } }
      if (!ids.length) return false;
    });
    if (cheio) { App.toast('O mapa chegou ao limite de ' + num(lim, 0) + ' objetos. Nada mudou.'); return; }
    if (ids.length) App.selecionar(ids);
  }
  // O texto: o painel pergunta o que escrever; ele aparece no ponto, no tamanho escolhido (em pixels da tela).
  function novoTexto(q) {
    const P = window.MundoPainel;
    const campos = { x: q.x, y: q.y, fonte: opt('fonte'), tam: um(limitar(Number(opt('txtTam')) || 28, 6, 400) / V.z) };
    if (P && typeof P.novoTexto === 'function') P.novoTexto(campos);
  }

  /* ---- a ferramenta Terreno: pinta o terreno (ou o custo próprio) de hexágono em hexágono ---- */
  function terrenoEscolhido() { const ts = (M && M.terrenos) || []; return ts.find(t => t.id === opt('ter')) || ts[0] || null; }
  // o hexágono do meio e, com o pincel maior, os vizinhos (1, 7 ou 19 hexágonos)
  function hexesDoPincel(hx) {
    const r = limitar(Math.round(Number(opt('hexPincel')) || 0), 0, 2), out = [];
    for (let dq = -r; dq <= r; dq++) for (let dr = Math.max(-r, -dq - r); dr <= Math.min(r, -dq + r); dr++) out.push({ q: hx.q + dq, r: hx.r + dr });
    return out;
  }
  function corDoPincel() {
    const modo = opt('terModo'), t = terrenoEscolhido();
    return modo === 'ter' ? (t ? t.cor : '#9aa3b5') : modo === 'custo' ? '#e6ab4f' : '#05070c';
  }
  function pintarHex(p) {
    const hx = N().hexDe(M, p.x, p.y);
    if (!hx) return;
    const linha = g.ult ? N().linhaHex(g.ult, hx) : [hx], cor = corDoPincel(), meio = (M.grade.tam || 0) / 2;
    g.ult = hx;
    for (const c0 of linha) for (const x of hexesDoPincel(c0)) {
      const k = x.q + ',' + x.r;
      if (g.hexes.has(k) || !dentroDoMapa(N().centroHex(M, x.q, x.r), meio)) continue;
      g.hexes.set(k, x);
      C.tra.append(s('path', { d: caminho(N().cantosHex(M, x.q, x.r), true), fill: cor }));     // a prévia, numa camada à parte
    }
  }
  function aplicarPincelHex(chaves) {
    const modo = opt('terModo'), t = terrenoEscolhido(), custo = limitar(Number(opt('custo')) || 0, 0.1, 9999);
    if (modo === 'ter' && !t) { App.toast('Este mapa não tem tipos de terreno. Crie um na aba Terreno.'); return; }
    const lim = (N().LIMITES && N().LIMITES.hexes) || 20000;
    const rot = modo === 'ter' ? 'pintar o terreno' : modo === 'nada' ? 'tirar o terreno' : modo === 'desenho' ? 'seguir o desenho' : modo === 'custo' ? 'dar custo próprio aos hexágonos' : 'tirar o custo próprio';
    // "sem terreno" onde o desenho à mão dá um terreno precisa vencer o desenho ('-'); onde não dá, só tira o do hexágono
    let pint = null;
    try { pint = N().terrenoPintado(App.mapa); } catch (e) { pint = new Map(); }
    let passou = false;
    App.mudar(rot, d => {
      if (!d.hexes || typeof d.hexes !== 'object') d.hexes = {};
      for (const k of chaves) {
        const v = d.hexes[k], tid = typeof v === 'string' ? v : Array.isArray(v) ? v[0] : '';
        let nt = tid, nc = Array.isArray(v) ? v[1] : null;
        if (modo === 'ter') nt = t.id; else if (modo === 'nada') nt = pint.has(k) ? '-' : ''; else if (modo === 'desenho') nt = ''; else if (modo === 'custo') nc = custo; else nc = null;
        if (!nt && nc == null) delete d.hexes[k]; else d.hexes[k] = nc == null ? nt : [nt, nc];
      }
      if (Object.keys(d.hexes).length > lim) { passou = true; return false; }
    });
    if (passou) App.toast('O mapa chegou ao limite de ' + num(lim, 0) + ' hexágonos com terreno ou custo próprio. Nada mudou.');
  }
  // o que há no hexágono embaixo do cursor (para a dica)
  function sobOCursor(p) {
    const hx = N().hexDe(M, p.x, p.y);
    if (!hx) return '';
    const i = N().hexInfo(M, hx.q, hx.r);
    const de = i.de === 'hex' ? ' (custo próprio)' : i.de === 'regiao' ? ' (da região ' + ((i.regiao.nome || '').trim() || 'sem nome') + ')' : i.de === 'base' ? ' (sem terreno)' : '';
    return 'Aqui: ' + (i.terreno ? i.terreno.nome + (i.desenho ? ' (do desenho)' : '') : 'sem terreno') + ' · ' + num(i.custo, 1) + ' cubos' + de + '.';
  }

  /* ---- trilho, opções e dica ---- */
  function montarTrilho() {
    railEl.replaceChildren();
    for (const f of FERRAMENTAS) {
      const b = h('button', { type: 'button', class: 'tool', 'data-f': f.id, 'aria-pressed': 'false', title: `${f.nome} (${f.tecla})`, 'aria-label': f.nome, 'aria-keyshortcuts': f.tecla });
      const ic = s('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
      ic.innerHTML = ICONE_FERRAMENTA[f.id];                 // desenho fixo, sem texto de ninguém
      b.append(ic);
      b.addEventListener('click', () => { if (App && podeEditar()) App.usarFerramenta(f.id); });
      railEl.append(b);
      if (SEPARA_DEPOIS.has(f.id)) railEl.append(h('hr'));
    }
  }
  function pintarTrilho() {
    if (!railEl) return;
    const f = ferramenta(), editar = podeEditar();
    for (const b of railEl.querySelectorAll('.tool')) {
      b.setAttribute('aria-pressed', String(b.dataset.f === f));
      b.disabled = !editar && b.dataset.f !== 'sel';
    }
  }

  function chip(attrs, ...filhos) { return h(attrs.tag || 'button', Object.assign({ type: attrs.tag ? null : 'button', class: 'chip' }, attrs, { tag: null }), ...filhos); }
  function miniSelo(def, cor) {
    const el = s('svg', { width: 20, height: 20, viewBox: '-12 -12 24 24', 'aria-hidden': 'true' });
    el.append(s('circle', { class: 'selo', r: 11, fill: cor }), glifo(def, 15));
    return el;
  }
  function seletor(rotuloTxt, valor, opcoes, aoMudar) {
    const sel = h('select', { 'aria-label': rotuloTxt });
    for (const [v, t] of opcoes) sel.append(h('option', { value: v, texto: t }));
    sel.value = valor;
    sel.addEventListener('change', () => aoMudar(sel.value));
    return h('label', { class: 'chip' }, h('span', { texto: rotuloTxt }), sel);
  }
  function desenharOpts(forcar) {
    if (!optsEl) return;
    const f = ferramenta(), editar = podeEditar() && !!M;
    const facs = M ? (M.faccoes || []).map(x => [x.id, x.nome, x.cor]) : [];
    const chave = JSON.stringify([f, editar, App.opt || null, facs, rasc ? rasc.pts.length : -1, M && M.nevoa ? !!M.nevoa.on : null, !!medindo,
      f === 'h' && M ? [temGrade(M), (M.terrenos || []).map(t => [t.id, t.nome, t.cor]), !!(M.pintura && M.pintura.ops && M.pintura.ops.length)] : null]);
    if (!forcar && chave === optsChave) return;
    optsChave = chave;
    // não derruba um seletor aberto: quem está escolhendo termina antes
    if (!forcar && optsEl.contains(document.activeElement) && document.activeElement.tagName === 'SELECT') { optsChave = null; return; }
    optsEl.replaceChildren();
    if (!editar) return;
    const reabrir = () => desenharOpts(true);
    // trocar o modo de uma ferramenta (o desenho por pontos que estava pela metade fica para trás)
    const trocarModo = (nome, v) => { porOpt(nome, v); rasc = null; reabrir(); atualizarDica(); desenharRascunho(); };
    const chips = (nome, atual, lista) => lista.map(([v, tx, dica]) => chip({ 'aria-pressed': String(atual === v), title: dica, onclick: () => trocarModo(nome, v) }, tx));
    if (f === 'm') {
      const def = defIcone(opt('ic'));
      optsEl.append(
        chip({ 'aria-haspopup': 'menu', title: 'Escolher o ícone do novo marcador', onclick: ev => abrirIcones(ev.currentTarget) }, miniSelo(def, def.cor || '#e6ab4f'), def.nome),
        chip({ 'aria-pressed': String(!!opt('rumor')), title: 'Os jogadores veem o marcador como boato', onclick: () => { porOpt('rumor', !opt('rumor')); reabrir(); } }, 'É boato'));
    } else if (f === 'e') {
      const E = dicionario('EVENTOS');
      optsEl.append(seletor('Evento', opt('tipo'), Object.keys(E).map(k => [k, E[k].nome]), v => porOpt('tipo', v)));
    } else if (f === 't') {
      const Vi = dicionario('VIAS');
      optsEl.append(seletor('Via', opt('via'), Object.keys(Vi).map(k => [k, Vi[k].nome]), v => porOpt('via', v)));
    } else if (f === 'f') {
      const lista = [['', 'Sem facção']].concat(facs.map(x => [x[0], x[1] || 'Facção sem nome']));
      const val = id => (id && facs.some(x => x[0] === id) ? id : '');
      optsEl.append(
        ...chips('freModo', opt('freModo') === 'zona' ? 'zona' : 'linha', [['linha', 'Linha de frente', 'Uma linha de combate entre duas facções'], ['zona', 'Zona de guerra', 'A área em guerra entre duas facções (pode mudar com o tempo)']]),
        seletor('Lado A', val(opt('a')), lista, v => porOpt('a', v || null)),
        seletor('Lado B', val(opt('b')), lista, v => porOpt('b', v || null)));
    } else if (f === 'p') {
      const md = modoDesenho();
      optsEl.append(...chips('des', md, [['carimbo', 'Carimbo', 'Árvores, montanhas, ondas… (arraste para espalhar vários)'], ['texto', 'Texto', 'Um texto livre no mapa'], ['linha', 'Rio e estrada', 'Rios, estradas e trilhas']]));
      if (md === 'carimbo') {
        const def = defCarimbo(opt('carimbo'));
        optsEl.append(
          chip({ 'aria-haspopup': 'menu', title: 'Escolher o carimbo', onclick: ev => abrirCarimbos(ev.currentTarget) }, miniCarimbo(def), def.nome),
          seletor('Tamanho', String(opt('carTam')), [['24', 'Pequeno'], ['40', 'Médio'], ['64', 'Grande'], ['100', 'Enorme']], v => { porOpt('carTam', Number(v)); desenharRascunho(); }));
      } else if (md === 'texto') {
        const F = dicionario('FONTES');
        optsEl.append(
          seletor('Letra', opt('fonte'), Object.keys(F).map(k => [k, F[k].nome]), v => porOpt('fonte', v)),
          seletor('Tamanho', String(opt('txtTam')), [['16', 'Pequeno'], ['24', 'Médio'], ['36', 'Grande'], ['56', 'Enorme']], v => porOpt('txtTam', Number(v))));
      } else {
        const Li = dicionario('LINHAS');
        optsEl.append(
          seletor('Linha', opt('estilo'), Object.keys(Li).map(k => [k, Li[k].nome]), v => porOpt('estilo', v)),
          seletor('Largura', String(limitar(Math.round(Number(opt('linNivel')) || 2), 1, 4)), [['1', 'Fina'], ['2', 'Média'], ['3', 'Larga'], ['4', 'Bem larga']], v => porOpt('linNivel', Number(v))));
      }
    } else if (f === 'h') {
      const livre = modoTerreno() === 'livre', temDesenho = !!(M.pintura && M.pintura.ops && M.pintura.ops.length);
      optsEl.append(...chips('terPincel', livre ? 'livre' : 'hex', [['livre', 'Pincel livre', 'Pinta à mão, com a textura do terreno; o terreno de cada hexágono vem do desenho'], ['hex', 'Por hexágono', 'Pinta (ou corrige) hexágono por hexágono']]));
      if (livre) {
        const t = pinTerreno(), borracha = opt('pinTer') === '-' || !t;
        const sel = h('select', { 'aria-label': 'Com o que o pincel pinta' });
        for (const x of M.terrenos || []) sel.append(h('option', { value: x.id, texto: x.nome }));
        sel.append(h('option', { value: '-', texto: 'Borracha' }));
        sel.value = borracha ? '-' : t.id;
        sel.addEventListener('change', () => { porOpt('pinTer', sel.value); reabrir(); atualizarDica(); });
        const faixa = h('input', { type: 'range', min: 4, max: 160, step: 2, value: limitar(Number(opt('pinRaio')) || 24, 4, 160), 'aria-label': 'Tamanho do pincel livre' });
        faixa.addEventListener('input', () => { porOpt('pinRaio', Number(faixa.value)); desenharRascunho(); });
        optsEl.append(
          h('label', { class: 'chip', title: 'O terreno que o pincel pinta, ou a borracha' }, h('span', { class: 'amostra', style: 'background:' + (borracha ? 'transparent' : t.cor) }), h('span', { texto: 'Pincel' }), sel),
          h('label', { class: 'chip', title: 'Tamanho do pincel na tela' }, h('span', { texto: 'Tamanho' }), faixa));
      } else if (!temGrade(M)) optsEl.append(chip({ class: 'chip pri', title: 'A grade de hexágonos fica na aba Terreno', onclick: () => abrirAba('terreno') }, 'Definir a grade de hexágonos…'));
      else {
        const t = terrenoEscolhido(), modo = ['ter', 'nada', 'desenho', 'custo', 'semcusto'].includes(opt('terModo')) ? opt('terModo') : 'ter';
        const sel = h('select', { 'aria-label': 'O que o pincel faz' });
        for (const x of M.terrenos || []) sel.append(h('option', { value: 'ter:' + x.id, texto: x.nome }));
        const modos = [['nada', 'Sem terreno'], temDesenho ? ['desenho', 'Seguir o desenho'] : null, ['custo', 'Custo próprio…'], ['semcusto', 'Tirar o custo próprio']].filter(Boolean);
        for (const [v, tx] of modos) sel.append(h('option', { value: v, texto: tx }));
        sel.value = modo === 'ter' ? (t ? 'ter:' + t.id : 'nada') : modo === 'desenho' && !temDesenho ? 'nada' : modo;
        sel.addEventListener('change', () => {
          const v = sel.value;
          if (v.startsWith('ter:')) { porOpt('terModo', 'ter'); porOpt('ter', v.slice(4)); } else porOpt('terModo', v);
          reabrir(); atualizarDica(); desenharRascunho();
        });
        optsEl.append(h('label', { class: 'chip', title: 'O que o pincel pinta nos hexágonos' },
          h('span', { class: 'amostra', style: 'background:' + (modo === 'ter' && t ? t.cor : modo === 'custo' ? '#e6ab4f' : 'transparent') }), h('span', { texto: 'Pincel' }), sel));
        if (modo === 'custo') {
          const ci = h('input', { type: 'number', min: 0.1, max: 9999, step: 0.5, value: String(Number(opt('custo')) || 10), 'aria-label': 'Custo próprio, em cubos por hexágono', class: 'num' });
          ci.addEventListener('change', () => { const n = Number(String(ci.value).replace(',', '.')); if (Number.isFinite(n) && n > 0) porOpt('custo', Math.round(limitar(n, 0.1, 9999) * 10) / 10); ci.value = String(opt('custo')); atualizarDica(); });
          optsEl.append(h('label', { class: 'chip', title: 'Quantos cubos custa atravessar estes hexágonos' }, h('span', { texto: 'Custo' }), ci, h('span', { texto: 'cubos' })));
        }
        optsEl.append(seletor('Tamanho', String(limitar(Math.round(Number(opt('hexPincel')) || 0), 0, 2)), [['0', '1 hexágono'], ['1', '7 hexágonos'], ['2', '19 hexágonos']], v => { porOpt('hexPincel', Number(v)); desenharRascunho(); }));
      }
    } else if (f === 'n') {
      const p = opt('pincel') === 'cobrir' ? 'cobrir' : 'revelar';
      const faixa = h('input', { type: 'range', min: 10, max: 240, step: 5, value: limitar(Number(opt('raio')) || 60, 10, 240), 'aria-label': 'Tamanho do pincel' });
      faixa.addEventListener('input', () => { porOpt('raio', Number(faixa.value)); desenharRascunho(); });
      optsEl.append(
        chip({ 'aria-pressed': String(p === 'revelar'), title: 'O pincel abre a névoa', onclick: () => { porOpt('pincel', 'revelar'); reabrir(); atualizarDica(); } }, 'Revelar'),
        chip({ 'aria-pressed': String(p === 'cobrir'), title: 'O pincel fecha a névoa de novo', onclick: () => { porOpt('pincel', 'cobrir'); reabrir(); atualizarDica(); } }, 'Cobrir'),
        h('label', { class: 'chip', title: 'Tamanho do pincel na tela' }, h('span', { texto: 'Pincel' }), faixa));
    }
    // o que for criado com esta opção já nasce escondido: um segredo preparado num mapa que os jogadores estão vendo
    // não aparece para eles no meio do caminho (antes de dar tempo de marcar "Esconder")
    if (f in NOVO || f === 'p') optsEl.append(chip({ 'aria-pressed': String(!!opt('oculto')), title: 'O que você criar agora já nasce escondido dos jogadores',
      onclick: () => { porOpt('oculto', !opt('oculto')); reabrir(); } }, 'Criar escondido'));
    // medindo para a escala: no celular não há Esc, então um botão
    if (medindo) optsEl.append(chip({ title: 'Cancelar a medida (Esc)', onclick: () => cancelarMedida() }, 'Cancelar a medida'));
    if (rasc && rasc.pts.length && tipoDoRasc()) {
      const k = rasc.k, min = fechada(k) ? 3 : 2;
      optsEl.append(
        chip({ class: 'chip pri', disabled: rasc.pts.length < min, title: 'Terminar (Enter)', onclick: () => terminarRascunho() }, k === 'r' ? 'Fechar a região' : k === 'z' ? 'Fechar a zona' : 'Terminar'),
        chip({ title: 'Tirar o último ponto (Backspace)', onclick: () => tirarPonto() }, 'Tirar o último ponto'),
        chip({ title: 'Cancelar (Esc)', onclick: () => cancelarRascunho() }, 'Cancelar'));
    }
  }
  function abrirIcones(botao) {
    fecharMenus();
    const I = dicionario('ICONES'), atual = opt('ic');
    const grade = h('div', { class: 'grade' });
    for (const k of Object.keys(I)) {
      const ic = s('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
      ic.innerHTML = I[k].svg || '';                         // markup fixo do núcleo
      grade.append(h('button', { type: 'button', title: I[k].nome, 'aria-label': I[k].nome, 'aria-pressed': String(k === atual), onclick: () => {
        porOpt('ic', k); fecharMenus(); desenharOpts(true);
        const novo = optsEl.querySelector('[aria-haspopup]');           // o chip foi refeito: o foco volta para ele
        if (novo) novo.focus();
      } }, ic));
    }
    const r = botao.getBoundingClientRect();
    mostrarMenu(h('div', { class: 'menu menu-icones', role: 'dialog', 'aria-label': 'Ícone do marcador' }, grade), r.left, r.bottom + 6);
  }

  // um carimbo pequeno, para os chips e a grade de escolher
  function miniCarimbo(def, tam) {
    const el = s('svg', { width: tam || 18, height: tam || 18, viewBox: '0 0 24 24', 'aria-hidden': 'true' });
    const g1 = molde(def.svg);
    g1.setAttribute('class', 'carimbo');
    g1.setAttribute('style', 'color:' + (def.cor || '#5d9a4e'));
    el.append(g1);
    return el;
  }
  function abrirCarimbos(botao) {
    fecharMenus();
    const C0 = dicionario('CARIMBOS'), atual = opt('carimbo');
    const grade = h('div', { class: 'grade' });
    for (const k of Object.keys(C0)) {
      grade.append(h('button', { type: 'button', title: C0[k].nome, 'aria-label': C0[k].nome, 'aria-pressed': String(k === atual), onclick: () => {
        porOpt('carimbo', k); fecharMenus(); desenharOpts(true);
        const novo = optsEl.querySelector('[aria-haspopup]');
        if (novo) novo.focus();
      } }, miniCarimbo(C0[k], 26)));
    }
    const r = botao.getBoundingClientRect();
    mostrarMenu(h('div', { class: 'menu menu-icones', role: 'dialog', 'aria-label': 'Carimbo' }, grade), r.left, r.bottom + 6);
  }

  function atualizarDica() {
    if (!dicaEl) return;
    const t = textoDica();
    dicaEl.textContent = t;
    dicaEl.hidden = !t;
  }
  function textoDica() {
    if (!M) return '';
    const tq = toqueGrosso(), Cl = tq ? 'Toque' : 'Clique';
    if (medindo) {
      const u = regua ? Math.hypot(regua.b.x - regua.a.x, regua.b.y - regua.a.y) : 0;
      return u > 0 ? num(u, 0) + ' unidades do mapa. Solte para usar esta medida.' : 'Arraste sobre uma distância que você conhece no mapa (alguns hexágonos da imagem, por exemplo).' + (tq ? '' : ' Esc cancela.');
    }
    if (App.papel === 'mestre' && App.comoJogador) return 'Vendo como jogador: assim os jogadores veem o mapa. Nada aqui muda o mapa.';
    if (!podeEditar()) return tq ? 'Toque num lugar para ler sobre ele. Arraste para andar; pince para aproximar.' : 'Clique num lugar para ler sobre ele. Arraste para andar pelo mapa; a roda do mouse aproxima.';
    const f = ferramenta(), n = rasc ? rasc.pts.length : 0;
    // no celular a dica é curta e sem teclas: os chips de cima fazem o papel do Enter, do Backspace e do Esc
    const fim = tq ? '' : ' Backspace tira o último ponto; Esc cancela.';
    switch (f) {
      case 'm': return `${Cl} no mapa para pôr o marcador.` + (tq ? '' : ' Esc volta para Selecionar.');
      case 'g': return `${Cl} no mapa para pôr o grupo.` + (tq ? '' : ' Esc volta para Selecionar.');
      case 'e': return `${Cl} para pôr o evento, ou arraste para escolher o tamanho da área.` + (tq ? '' : ' Esc volta para Selecionar.');
      case 'r':
        if (!n) return `${Cl} para pôr o primeiro ponto da região.`;
        if (n < 3) return `${Cl} para pôr mais pontos (uma região tem pelo menos 3).` + fim;
        return tq ? 'Toque para mais pontos, ou no primeiro ponto para fechar.' : 'Clique para mais pontos. Clique no primeiro ponto ou aperte Enter para fechar.' + fim;
      case 't': case 'f': {
        if (f === 'f' && opt('freModo') === 'zona') {
          if (!n) return `${Cl} para pôr o primeiro ponto da zona de guerra (as cores vêm dos lados A e B).`;
          if (n < 3) return `${Cl} para pôr mais pontos (uma zona tem pelo menos 3).` + fim;
          return tq ? 'Toque para mais pontos, ou no primeiro ponto para fechar.' : 'Clique para mais pontos. Clique no primeiro ponto ou aperte Enter para fechar.' + fim;
        }
        if (!n) return `${Cl} para pôr o começo ${f === 't' ? 'da rota' : 'da frente de batalha'}.`;
        return tq ? 'Toque para mais pontos; toque de novo no último para terminar.' : 'Clique para mais pontos. Duplo clique ou Enter termina.' + fim;
      }
      case 'p': {
        const md = modoDesenho();
        if (md === 'carimbo') return `${Cl} para pôr ${defCarimbo(opt('carimbo')).nome.toLocaleLowerCase('pt-BR')}; arraste para espalhar vários.` + (tq ? '' : ' Cada clique ou traço é um passo de desfazer.');
        if (md === 'texto') return `${Cl} onde vai o texto.` + (tq ? '' : ' Esc volta para Selecionar.');
        const qual = { rio: 'do rio (a nascente; ele engrossa até o último ponto, a foz)', estrada: 'da estrada', trilha: 'da trilha' }[opt('estilo')] || 'da linha';
        if (!n) return `${Cl} para pôr o começo ${qual}.`;
        return tq ? 'Toque para mais pontos; toque de novo no último para terminar.' : 'Clique para mais pontos (a linha passa por todos, suave). Duplo clique ou Enter termina.' + fim;
      }
      case 'n': {
        const nv = M.nevoa || {};
        const base = opt('pincel') === 'cobrir' ? 'Arraste para cobrir com névoa.' : 'Arraste para revelar o mapa.';
        return base + (nv.on ? (tq ? '' : ' Cada traço é um passo de desfazer.') : ' A névoa está desligada (aba Mapa): os jogadores ainda veem tudo.');
      }
      case 'd':
        if (regua) { const u = Math.hypot(regua.b.x - regua.a.x, regua.b.y - regua.a.y); if (u > 0) return textoRegua(M, regua.a, regua.b) + '. Nada é gravado.'; }
        return 'Arraste para medir uma distância. Nada é gravado.' + (temGrade(M) ? '' : ' Sem a grade de hexágonos (aba Terreno), a medida sai em unidades do mapa.');
      case 'h': {
        if (modoTerreno() === 'livre') {
          const t = pinTerreno(), borracha = opt('pinTer') === '-' || !t, sob = cursor && !tq && temGrade(M) ? sobOCursor(cursor) : '';
          return (borracha ? 'Arraste para apagar o desenho à mão.' : 'Arraste para pintar à mão: ' + t.nome + '.') + (sob ? ' ' + sob : '')
            + (temGrade(M) ? '' : ' Com a grade de hexágonos, cada hexágono ganha o terreno do desenho.') + (tq ? '' : ' Cada traço é um passo de desfazer.');
        }
        if (!temGrade(M)) return 'Defina a grade de hexágonos primeiro (aba Terreno).';
        const modo = opt('terModo'), t = terrenoEscolhido();
        const o = modo === 'nada' ? 'Arraste sobre os hexágonos para tirar o terreno.' : modo === 'desenho' ? 'Arraste sobre os hexágonos para que voltem a seguir o desenho à mão.' : modo === 'custo' ? 'Arraste sobre os hexágonos para que custem ' + num(Number(opt('custo')) || 0, 1) + ' cubos.'
          : modo === 'semcusto' ? 'Arraste sobre os hexágonos para tirar o custo próprio (volta o do terreno).' : 'Arraste sobre os hexágonos para pintar: ' + (t ? t.nome : 'terreno') + '.';
        const sob = cursor && !tq ? sobOCursor(cursor) : '';
        return o + (sob ? ' ' + sob : '') + (tq ? '' : ' Cada traço é um passo de desfazer.');
      }
    }
    const sel = selecao();
    if (sel.length) {
      const o = sel.length === 1 ? indice.get(sel[0]) : null;
      if (tq) return 'Arraste para mover. Toque longo: mais opções.' + (o && Array.isArray(o.pts) ? ' Arraste os pontos para ajustar.' : o && o.k === 'e' ? ' A alça na borda muda o raio.' : '');
      const ajuste = o && Array.isArray(o.pts) ? ' Arraste os pontos para ajustar; o ponto do meio cria outro; duplo clique num ponto o tira.' : o && o.k === 'e' ? ' A alça na borda muda o raio.' : '';
      return 'Arraste para mover · Delete apaga · setas ajustam (Shift: 10) · Esc limpa a seleção.' + ajuste;
    }
    return tq ? 'Toque para escolher; arraste o fundo para andar. Toque longo: mais opções.'
      : 'Clique para selecionar (Shift soma) e arraste para mover. Arraste o fundo para andar pelo mapa; botão direito: mais opções.';
  }

  /* ---- mudanças no mapa (sempre por App.mudar) ---- */
  function dentroDoMapa(p, folga) { const f = folga || 0; return p.x >= -f && p.y >= -f && p.x <= L + f && p.y <= A + f; }
  const preso = p => ({ x: um(limitar(p.x, 0, L)), y: um(limitar(p.y, 0, A)) });
  function abrirAba(id) { try { if (window.MundoPainel && MundoPainel.abrirAba) MundoPainel.abrirAba(id); } catch (e) { console.error(e); } }
  function painelVisivel() { const sd = document.getElementById('side'); return !!(sd && sd.offsetParent !== null && !sd.classList.contains('fechado')); }
  function criar(k, campos, rotulo) {
    if (!podeEditar()) return null;
    let id = null;
    App.mudar(rotulo || NOVO[k], d => {
      const o = N().objNovo(k, Object.assign({ oculto: !!opt('oculto') }, campos));   // "Criar escondido" nas opções
      if (!o) return false;
      if (!Array.isArray(d.objs)) d.objs = [];
      d.objs.push(o); id = o.id;
    });
    if (App.ferramenta !== 'sel') App.usarFerramenta('sel');     // criou: volta para Selecionar, sem surpresa
    if (id) {
      App.selecionar([id]);
      if (painelVisivel()) abrirAba('selecao');                   // no celular o painel não abre sozinho por cima do mapa
    }
    return id;
  }
  function criarEm(k, p, extra) {
    if (!dentroDoMapa(p, 2)) return null;
    const q = preso(p);
    if (k === 'm') return criar('m', Object.assign({ x: q.x, y: q.y, ic: opt('ic'), rumor: !!opt('rumor') }, extra));
    if (k === 'g') return criar('g', Object.assign({ x: q.x, y: q.y }, extra));
    if (k === 'e') return criar('e', Object.assign({ x: q.x, y: q.y, tipo: opt('tipo'), r: RAIO_EVENTO, ini: (App.mapa.cal && App.mapa.cal.dia) || 0 }, extra));
    return null;
  }
  function limitarDelta(objs, dx, dy) {
    const b = caixaDe(objs);
    if (!b) return [dx, dy];
    if (b.x1 - b.x0 <= L) dx = limitar(dx, Math.min(-b.x0, 0), Math.max(L - b.x1, 0));
    if (b.y1 - b.y0 <= A) dy = limitar(dy, Math.min(-b.y0, 0), Math.max(A - b.y1, 0));
    return [dx, dy];
  }
  function moverSelecao(ids, dx, dy) {
    const objs = ids.map(objEditavel).filter(Boolean);
    if (!objs.length) return false;
    [dx, dy] = limitarDelta(objs, dx, dy);
    if (!dx && !dy) return false;
    const conj = new Set(objs.map(o => o.id));
    App.mudar(conj.size === 1 ? 'mover' : `mover ${conj.size} objetos`, d => { for (const o of d.objs) if (conj.has(o.id)) deslocar(o, dx, dy); });
    return true;
  }
  function apagar(ids) {
    if (!podeEditar()) return 0;
    const objs = ids.map(objEditavel).filter(Boolean);
    if (!objs.length) return 0;
    const conj = new Set(objs.map(o => o.id)), rot = objs.length === 1 ? 'apagar' : `apagar ${objs.length} objetos`;
    if (!App.mudar(rot, d => { d.objs = d.objs.filter(o => !conj.has(o.id)); })) return 0;
    App.selecionar([]);
    // o "Desfazer" do aviso só desfaz se o passo de cima ainda é este (senão desfaria outra coisa, como no painel)
    const passo = typeof App.passoAtual === 'function' ? App.passoAtual() : null;
    App.toast(objs.length === 1 ? APAGADO[objs[0].k] || 'Apagado.' : `${objs.length} objetos apagados.`, 'Desfazer', () => {
      if (passo != null && App.passoAtual() !== passo) { App.toast('Já houve outra mudança depois. Use o botão Desfazer, lá em cima.'); return; }
      App.desfazer();
    });
    return objs.length;
  }
  function duplicar(ids) {
    if (!podeEditar()) return;
    const desl = um(24 / V.z), novos = [];
    App.mudar(ids.length === 1 ? 'duplicar' : `duplicar ${ids.length} objetos`, d => {
      for (const id of ids) {
        const o = d.objs.find(x => x.id === id);
        if (!o) continue;
        const c = N().copia(o);
        c.id = N().objNovo(o.k, {}).id;
        deslocar(c, desl, desl);
        d.objs.push(c); novos.push(c.id);
      }
      if (!novos.length) return false;
    });
    if (novos.length) App.selecionar(novos);
  }
  function trazerParaFrente(ids) {
    if (!podeEditar()) return;
    const conj = new Set(ids);
    App.mudar('trazer para frente', d => {
      const vao = d.objs.filter(o => conj.has(o.id));
      if (!vao.length) return false;
      d.objs = d.objs.filter(o => !conj.has(o.id)).concat(vao);
    });
  }
  function aplicarAlca(o, a, p) {
    const q = preso(p);
    if (a.tipo === 'raio') {
      // a alça está na borda de hoje; o raio guardado é o do primeiro dia (o evento cresce ou encolhe a partir dele)
      const dias = Math.max(0, diaDaVista() - (Number.isFinite(o.ini) ? o.ini : 0));
      o.r = um(Math.max(1, Math.hypot(p.x - o.x, p.y - o.y) - (o.cresce || 0) * dias));
      return;
    }
    if (!Array.isArray(o.pts)) return;
    const pts = ptsEditaveis(o);                                // (zona de guerra: a forma da fase de hoje)
    if (a.tipo === 'v') pts[a.i] = [q.x, q.y];
    else if (a.tipo === 'meio') pts.splice(a.i + 1, 0, [q.x, q.y]);
  }
  function tirarVertice(id, i) {
    const o = objEditavel(id);
    if (!o || !Array.isArray(o.pts)) return;
    const min = fechada(o.k) ? 3 : 2;
    if (ptsEditaveis(o).length <= min) { App.toast(o.k === 'r' ? 'Uma região precisa de pelo menos 3 pontos.' : o.k === 'z' ? 'Uma zona precisa de pelo menos 3 pontos.' : 'Uma linha precisa de pelo menos 2 pontos.'); return; }
    App.mudar('tirar o ponto', d => { const x = d.objs.find(y => y.id === id); if (!x) return false; const px = ptsEditaveis(x); if (px.length <= min) return false; px.splice(i, 1); });
  }

  /* desenho de região, rota, frente, zona de guerra e linha (rio, estrada, trilha), ponto a ponto */
  const modoDesenho = () => (['carimbo', 'texto', 'linha'].includes(opt('des')) ? opt('des') : 'carimbo');
  function tipoDoRasc() {
    const f = ferramenta();
    if (f === 'r' || f === 't') return f;
    if (f === 'f') return opt('freModo') === 'zona' ? 'z' : 'f';
    if (f === 'p' && modoDesenho() === 'linha') return 'l';
    return null;
  }
  function adicionarPonto(p, toque) {
    const k = tipoDoRasc();
    if (!k) return;
    if (!dentroDoMapa(p, 2)) return;
    const q = preso(p);
    if (!rasc || rasc.k !== k) rasc = { k, pts: [] };
    const pts = rasc.pts, raio = toque ? 18 : 9, min = fechada(k) ? 3 : 2;
    const perto = r => Math.hypot((r[0] - q.x) * V.z, (r[1] - q.y) * V.z) < raio;
    if (fechada(k) && pts.length >= 3 && perto(pts[0])) { terminarRascunho(); return; }
    // clicar de novo no último ponto (o segundo clique de um duplo clique) termina
    if (pts.length && perto(pts[pts.length - 1])) { if (pts.length >= min) terminarRascunho(); return; }
    pts.push([q.x, q.y]);
    desenharRascunho(); desenharOpts(); atualizarDica();
  }
  function terminarRascunho() {
    if (!rasc) return;
    const { k, pts } = rasc, min = fechada(k) ? 3 : 2;
    if (pts.length < min) { App.toast(k === 'r' ? 'Uma região precisa de pelo menos 3 pontos.' : k === 'z' ? 'Uma zona precisa de pelo menos 3 pontos.' : 'Uma linha precisa de pelo menos 2 pontos.'); return; }
    rasc = null;
    const campos = { pts: pts.map(q => q.slice()) };
    let rot = null;
    if (k === 't') campos.via = opt('via');
    if (k === 'f' || k === 'z') { campos.a = opt('a') || null; campos.b = opt('b') || null; }
    if (k === 'z') campos.ini = (App.mapa.cal && App.mapa.cal.dia) || 0;
    if (k === 'l') {
      campos.estilo = opt('estilo');
      const ls = LARGURAS[campos.estilo] || LARGURAS.rio;
      campos.larg = um(Math.max(0.5, ls[limitar(Math.round(Number(opt('linNivel')) || 2), 1, 4) - 1] / V.z));     // em pixels da tela, como o pincel
      rot = { rio: 'novo rio', estrada: 'nova estrada', trilha: 'nova trilha' }[campos.estilo] || null;
    }
    criar(k, campos, rot);
    desenharRascunho(); desenharOpts(); atualizarDica();
  }
  function tirarPonto() {
    if (!rasc) return;
    rasc.pts.pop();
    if (!rasc.pts.length) rasc = null;
    desenharRascunho(); desenharOpts(); atualizarDica();
  }
  function cancelarRascunho() { rasc = null; desenharRascunho(); desenharOpts(); atualizarDica(); }

  /* ---- gestos ---- */
  function idDoAlvo(alvo) {
    const el = alvo && alvo.closest ? alvo.closest('[data-id]') : null;
    return el && svg.contains(el) ? el.getAttribute('data-id') : null;
  }
  function ehDuplo(e, quem) {
    const agora = performance.now(), u = ultimoClique;
    const duplo = !!(u && u.quem === quem && agora - u.t < 420 && Math.hypot(e.clientX - u.x, e.clientY - u.y) < 12);
    ultimoClique = duplo ? null : { t: agora, x: e.clientX, y: e.clientY, quem };
    return duplo;
  }
  function comecar(e, tipo, extra) {
    quieto(true);
    g = Object.assign({ tipo, pid: e.pointerId, sx: e.clientX, sy: e.clientY, p0: paraMundo(e.clientX, e.clientY), moveu: false, toque: e.pointerType !== 'mouse', shift: e.shiftKey, alt: e.altKey, vx: V.x, vy: V.y }, extra);
    App.gesto = true;
    try { palco.setPointerCapture(e.pointerId); } catch (er) { /* sem captura, o gesto segue enquanto o ponteiro estiver no palco */ }
  }
  function aoApertar(e) {
    if (!App || !M) return;
    if (e.target.closest && e.target.closest('.opts, .zoom, .vazio, .dica')) return;
    fecharMenus();
    if (e.pointerType === 'touch') {
      toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (toques.size === 2) { cancelarGesto(); comecarPinca(); return; }
      if (toques.size > 2 || pinca) return;
    }
    if (g) return;                                  // já tem um gesto: um segundo botão não começa outro
    if (e.button !== 0 && e.button !== 1) return;   // o botão direito é do menu
    if (e.button === 0 && e.ctrlKey && /Mac/i.test(navigator.platform || '')) return;   // Ctrl+clique no Mac também
    const f = ferramenta(), editar = podeEditar();
    if (regua && regua.manter) { regua = null; desenharRascunho(); }
    if (e.button === 1 || espaco) { comecar(e, 'pan'); palco.classList.add('pan'); return; }
    if (e.pointerType === 'touch' && f === 'sel' && editar) agendarToqueLongo(e);   // o jogador não tem menu
    if (f === 'sel') {
      const a = editar && e.target.closest ? e.target.closest('[data-alca]') : null;
      if (a && C.sel.contains(a)) {
        const id = selecao()[0];
        if (id) { comecar(e, 'alca', { idObj: id, alca: { tipo: a.getAttribute('data-alca'), i: Number(a.getAttribute('data-i')) || 0 } }); return; }
      }
      const id = idDoAlvo(e.target);
      if (id) {
        const o = indice.get(id) || {};
        const area = LARGOS.has(o.k) || !!(e.target.classList && e.target.classList.contains('eve-area'));
        const jaSel = (App.sel || []).includes(id);
        // um ponto (marcador, grupo, selo) se pega ao apertar; área e linha só se escolhem ao soltar, para que
        // arrastar por cima de uma região ou de uma estrada ainda ande pelo mapa (depois de escolhidas, arrastam)
        if (!area && !jaSel && !e.shiftKey) App.selecionar([id]);
        comecar(e, 'objeto', { idObj: id, area, jaSel });
        return;
      }
      comecar(e, 'fundo');
      return;
    }
    if (f === 'm' || f === 'g') { comecar(e, 'por'); return; }
    if (f === 'r' || f === 't' || f === 'f') { comecar(e, 'ponto'); return; }
    if (f === 'e') { comecar(e, 'evento', { r: 0 }); return; }
    if (f === 'n') {
      comecar(e, 'pincel', { ops: [] });
      C.tra.setAttribute('class', 'c-tra' + (opt('pincel') === 'cobrir' ? ' cobre' : ''));
      cursor = g.p0; pincelar(g.p0); desenharRascunho(); return;
    }
    if (f === 'd') { comecar(e, 'regua'); regua = { a: g.p0, b: g.p0 }; desenharRascunho(); return; }
    if (f === 'p') {
      const modo = modoDesenho();
      if (modo === 'carimbo') { comecar(e, 'carimbos', { lista: [], ult: null }); C.tra.replaceChildren(); C.tra.setAttribute('class', 'c-tra'); return; }
      comecar(e, modo === 'texto' ? 'texto' : 'ponto');
      return;
    }
    if (f === 'h' && modoTerreno() === 'livre') {
      const borracha = opt('pinTer') === '-', t = borracha ? null : pinTerreno();
      if (!borracha && !t) { App.toast('Este mapa não tem tipos de terreno. Crie um na aba Terreno.'); abrirAba('terreno'); return; }
      if (!garantirPintura()) return;
      pintEl.hidden = false;
      if (!(M.pintura && M.pintura.ops && M.pintura.ops.length)) pintEl.style.opacity = String((M.pintura && M.pintura.alfa) || 1);
      comecar(e, 'pintura', { t: t ? t.id : '', r: raioLivre(), pts: [], ters: new Map((M.terrenos || []).map(x => [x.id, x])) });
      cursor = g.p0; pintarAoVivo(g.p0); desenharRascunho();
      return;
    }
    if (f === 'h') {
      if (!temGrade(M)) { App.toast('Defina a grade de hexágonos primeiro, na aba Terreno.'); abrirAba('terreno'); return; }
      comecar(e, 'hexpincel', { hexes: new Map(), ult: null });
      C.tra.replaceChildren();
      C.tra.setAttribute('class', 'c-tra hexes');
      cursor = g.p0; pintarHex(g.p0); desenharRascunho();
    }
  }
  function aoMover(e) {
    if (!App || !M) return;
    if (e.pointerType === 'touch' && toques.has(e.pointerId)) {
      toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinca) { moverPinca(); return; }
    }
    const p = paraMundo(e.clientX, e.clientY);
    if (!g) {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        cursor = p;
        if (rasc || ferramenta() === 'n' || ferramenta() === 'p') desenharRascunho();
        else if (ferramenta() === 'h') { desenharRascunho(); atualizarDica(); }
      }
      return;
    }
    if (e.pointerId !== g.pid) return;
    cursor = p;
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    if (!g.moveu) {
      if (g.tipo !== 'pincel' && g.tipo !== 'hexpincel' && g.tipo !== 'pintura' && Math.hypot(dx, dy) < (g.toque ? 10 : 4)) return;
      g.moveu = true;
      clearTimeout(tLongo);
      comecouArrastar();
    }
    switch (g.tipo) {
      case 'pan': V.x = g.vx + dx; V.y = g.vy + dy; agendarVista(); break;
      case 'mover': {
        let ddx = p.x - g.p0.x, ddy = p.y - g.p0.y;
        [ddx, ddy] = limitarDelta(g.objs, ddx, ddy);
        g.dx = ddx; g.dy = ddy;
        moverProvisorio(g);
        break;
      }
      case 'alca': alcaProvisoria(p); break;
      case 'evento': g.r = Math.hypot(p.x - g.p0.x, p.y - g.p0.y); desenharRascunho(); break;
      case 'pincel': pincelar(p); desenharRascunho(); break;
      case 'hexpincel': pintarHex(p); desenharRascunho(); break;
      case 'pintura': pintarAoVivo(p); desenharRascunho(); break;
      case 'carimbos': espalhar(p); break;
      case 'regua': regua.b = p; desenharRascunho(); atualizarDica(); break;
    }
  }
  // Passou do limite de um clique: decide o que o arrasto vira.
  function comecouArrastar() {
    const editar = podeEditar();
    if (g.tipo === 'fundo' || g.tipo === 'por' || g.tipo === 'ponto' || g.tipo === 'texto') { g.tipo = 'pan'; palco.classList.add('pan'); return; }
    if (g.tipo === 'objeto') {
      if (!editar || (g.area && !g.jaSel)) { g.tipo = 'pan'; palco.classList.add('pan'); return; }
      let ids = selecao();
      if (!ids.includes(g.idObj)) { ids = g.shift ? ids.concat(g.idObj) : [g.idObj]; App.selecionar(ids); }
      const objs = ids.map(objEditavel).filter(Boolean);
      g.tipo = 'mover'; g.ids = objs.map(o => o.id); g.objs = objs; g.dx = 0; g.dy = 0;
      desenharSelecao();
    }
  }
  function moverProvisorio(gg) {
    const t = `translate(${um(gg.dx)} ${um(gg.dy)})`;
    for (const id of gg.ids) { const r = recs.get(id); if (r) { r.el.setAttribute('transform', t); if (r.el2) r.el2.setAttribute('transform', t); } }
    C.sel.setAttribute('transform', t);
  }
  function soltarProvisorio(gg) {
    for (const id of gg.ids || []) { const r = recs.get(id); if (r) { r.el.removeAttribute('transform'); if (r.el2) r.el2.removeAttribute('transform'); } }
    C.sel.removeAttribute('transform');
  }
  function alcaProvisoria(p) {
    const o = objEditavel(g.idObj);
    if (!o) return;
    const c = N().copia(o);
    aplicarAlca(c, g.alca, p);
    g.prov = c; g.p = p;
    const r = recs.get(o.id);
    if (r && ctxAtual) {
      const el = construir(c, ctxAtual);
      r.el.replaceWith(el); r.el = el; r.chave = null;
      if (r.el2 && el.__ico) { r.el2.replaceWith(el.__ico); r.el2 = el.__ico; }
    }
    desenharSelecao(c);
  }
  function pincelar(p) {
    const r = raioPincel(), t = opt('pincel') === 'cobrir' ? '-' : '+', ops = g.ops;
    const por = q => {
      const op = { t, x: um(q.x), y: um(q.y), r: um(r) };
      ops.push(op);
      // a prévia do traço vai numa camada à parte: mexer na máscara a cada movimento repintaria o mapa inteiro
      C.tra.append(s('circle', { cx: op.x, cy: op.y, r: op.r }));
    };
    const ult = ops[ops.length - 1];
    if (!ult) { por(p); return; }
    // pontos espaçados de meio raio: o traço fica contínuo sem encher a máscara
    const passo = Math.max(r / 2, 0.5), d = Math.hypot(p.x - ult.x, p.y - ult.y);
    if (d < passo) return;
    const n = Math.min(200, Math.floor(d / passo));
    for (let i = 1; i <= n; i++) { const k = (i * passo) / d; por({ x: ult.x + (p.x - ult.x) * k, y: ult.y + (p.y - ult.y) * k }); }
  }
  function aoSoltar(e) {
    if (e.pointerType === 'touch') {
      toques.delete(e.pointerId);
      if (pinca) { if (toques.size < 2) { pinca = null; soltarMovendo(); } return; }
    }
    clearTimeout(tLongo);
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') cursor = null;   // o dedo não fica pairando sobre o mapa
    if (!g || e.pointerId !== g.pid) return;
    if (e.type === 'pointercancel') { cancelarGesto(); return; }
    const gg = g;
    g = null;
    App.gesto = false;
    palco.classList.remove('pan');
    if (!mundoEl.classList.contains('movendo')) quieto(false);
    const p = paraMundo(e.clientX, e.clientY);
    if (gg.tipo === 'pan') soltarMovendo();
    try { terminarGesto(gg, p, e); }
    finally { if (adiado || gg.tipo === 'mover' || gg.tipo === 'alca' || gg.tipo === 'pincel' || gg.tipo === 'hexpincel' || gg.tipo === 'pintura' || gg.tipo === 'carimbos') redesenhar(); }
  }
  function terminarGesto(gg, p, e) {
    const editar = podeEditar();
    switch (gg.tipo) {
      case 'fundo':
        if (!gg.shift && (App.sel || []).length) App.selecionar([]);
        break;
      case 'objeto': {
        const duplo = ehDuplo(e, gg.idObj);
        const sel = App.sel || [];
        if (gg.shift) App.selecionar(sel.includes(gg.idObj) ? sel.filter(x => x !== gg.idObj) : sel.concat(gg.idObj));
        else if (!(sel.length === 1 && sel[0] === gg.idObj)) App.selecionar([gg.idObj]);
        if (duplo) abrirAba('selecao');
        break;
      }
      case 'mover':
        soltarProvisorio(gg);                          // o redesenho logo abaixo põe cada um no lugar novo
        if (editar && (gg.dx || gg.dy)) moverSelecao(gg.ids, gg.dx, gg.dy);
        break;
      case 'alca': {
        const a = gg.alca, id = gg.idObj;
        if (!gg.moveu) {
          const duplo = ehDuplo(e, 'alca:' + id + ':' + a.tipo + a.i);
          if (a.tipo === 'v' && (duplo || gg.alt)) tirarVertice(id, a.i);
          else if (a.tipo === 'meio') {
            const o = objEditavel(id);
            if (o && o.pts) { const po = ptsEditaveis(o), n = po.length, q0 = po[a.i], q1 = po[(a.i + 1) % n]; App.mudar('novo ponto', d => { const x = d.objs.find(y => y.id === id); if (!x) return false; ptsEditaveis(x).splice(a.i + 1, 0, [um((q0[0] + q1[0]) / 2), um((q0[1] + q1[1]) / 2)]); }); }
          }
          break;
        }
        if (!editar) break;
        App.mudar(a.tipo === 'raio' ? 'mudar o raio' : a.tipo === 'meio' ? 'novo ponto' : 'mover o ponto', d => {
          const o = d.objs.find(x => x.id === id);
          if (!o) return false;
          aplicarAlca(o, a, gg.p || p);
        });
        break;
      }
      case 'por':
        criarEm(ferramenta(), p);
        break;
      case 'evento':
        if (gg.moveu && gg.r * V.z >= 6) criarEm('e', gg.p0, { r: um(gg.r) });
        else criarEm('e', gg.p0);
        desenharRascunho();
        break;
      case 'ponto':
        adicionarPonto(p, gg.toque);
        break;
      case 'pincel':
        if (editar && gg.ops.length) {
          const t = gg.ops[0].t, ops = gg.ops;
          App.mudar(t === '+' ? 'revelar a névoa' : 'cobrir com névoa', d => {
            if (!d.nevoa || typeof d.nevoa !== 'object') d.nevoa = { on: false, ops: [] };
            if (!Array.isArray(d.nevoa.ops)) d.nevoa.ops = [];
            for (const op of ops) d.nevoa.ops.push(op);
          });
        }
        break;
      case 'hexpincel':
        C.tra.replaceChildren();
        if (editar && gg.hexes.size) aplicarPincelHex([...gg.hexes.keys()]);
        break;
      case 'pintura':
        if (editar && gg.pts.length) gravarPincelada(gg);
        else desenharPintura(M, true);
        break;
      case 'carimbos':
        C.tra.replaceChildren();
        if (!gg.moveu) { const q = preso(gg.p0); gg.lista = dentroDoMapa(gg.p0, 2) ? [{ x: q.x, y: q.y, ic: opt('carimbo'), tam: um(tamCarimbo()), vira: false }] : []; }
        if (editar && gg.lista.length) porCarimbos(gg.lista);
        break;
      case 'texto':
        if (editar && dentroDoMapa(p, 2)) novoTexto(preso(p));
        break;
      case 'regua': {
        regua.b = p;
        const u = Math.hypot(regua.b.x - regua.a.x, regua.b.y - regua.a.y);
        if (u * V.z < 3) { regua = null; desenharRascunho(); atualizarDica(); break; }
        if (medindo) {
          const m = medindo;
          medindo = null;
          regua.manter = true;                          // a linha fica à vista enquanto o painel pergunta os km
          if (App.ferramenta !== m.ant) App.usarFerramenta(m.ant); else agendar();
          m.ok(u);
        }
        desenharRascunho(); atualizarDica();
        break;
      }
    }
  }
  // Desiste do gesto sem gravar nada e desfaz o provisório.
  function cancelarGesto() {
    clearTimeout(tLongo);
    if (!g) return;
    if (g.setas) { soltarSetas(); return; }                                   // o que as setas andaram foi de propósito
    const gg = g;
    g = null;
    App.gesto = false;
    palco.classList.remove('pan');
    if (!mundoEl.classList.contains('movendo')) quieto(false);
    if (gg.tipo === 'regua') regua = null;
    if (gg.tipo === 'hexpincel' || gg.tipo === 'carimbos') C.tra.replaceChildren();
    if (gg.tipo === 'pintura') desenharPintura(M, true);             // tira a prévia do traço que não vai ser gravado
    if (gg.tipo === 'mover') soltarProvisorio(gg);
    if (gg.tipo === 'pan') soltarMovendo();
    redesenhar();
    desenharRascunho();
  }

  /* pinça (dois dedos) */
  function comecarPinca() {
    const [a, b] = [...toques.values()];
    pinca = { d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), z0: V.z, w: paraMundo((a.x + b.x) / 2, (a.y + b.y) / 2) };
  }
  function moverPinca() {
    const [a, b] = [...toques.values()];
    if (!a || !b) return;
    const t = tamanho(), z = limitarZ(pinca.z0 * Math.hypot(a.x - b.x, a.y - b.y) / pinca.d0);
    const mx = (a.x + b.x) / 2 - t.x, my = (a.y + b.y) / 2 - t.y;
    V.z = z; V.x = mx - pinca.w.x * z; V.y = my - pinca.w.y * z;
    agendarVista();
  }

  /* toque longo = botão direito */
  function agendarToqueLongo(e) {
    clearTimeout(tLongo);
    const x = e.clientX, y = e.clientY, alvo = e.target;
    tLongo = setTimeout(() => {
      if (!g || g.moveu || toques.size !== 1 || rasc) return;
      const id = idDoAlvo(alvo), p = paraMundo(x, y);
      if (!id && !dentroDoMapa(p, 0)) return;
      cancelarGesto();
      ultimoMenu = Date.now();
      abrirMenuMapa(x, y, id, p);
    }, 550);
  }

  /* ---- menus ---- */
  function fecharMenus() { if (menuEl) { menuEl.remove(); menuEl = null; } }
  function mostrarMenu(el, x, y) {
    fecharMenus();
    menuEl = el;
    el.style.left = '0px'; el.style.top = '0px'; el.style.visibility = 'hidden';
    document.body.append(el);
    const r = el.getBoundingClientRect();
    el.style.left = Math.round(limitar(x, 8, Math.max(8, innerWidth - r.width - 8))) + 'px';
    el.style.top = Math.round(limitar(y, 8, Math.max(8, innerHeight - r.height - 8))) + 'px';
    el.style.visibility = '';
    const primeiro = el.querySelector('button[aria-pressed="true"]') || el.querySelector('button');
    if (primeiro) primeiro.focus({ preventScroll: true });
  }
  function abrirMenuMapa(x, y, id, p) {
    if (!podeEditar() || rasc) return;
    const item = (texto, fn, cls) => h('button', { type: 'button', role: 'menuitem', class: cls || null, texto, onclick: () => { fecharMenus(); fn(); } });
    let itens;
    if (id) {
      if (!(App.sel || []).includes(id)) App.selecionar([id]);
      const ids = (App.sel || []).includes(id) ? selecao() : [id];
      const varios = ids.length > 1;
      itens = [
        item('Editar', () => abrirAba('selecao')),
        item('Centralizar', () => centrar(indice.get(id))),
        item(varios ? `Duplicar os ${ids.length}` : 'Duplicar', () => duplicar(ids)),
        item('Trazer para frente', () => trazerParaFrente(ids)),
        h('hr'),
        item(varios ? `Apagar os ${ids.length}` : 'Apagar', () => apagar(ids), 'per'),
      ];
    } else {
      if (!dentroDoMapa(p, 0)) return;
      itens = [
        item('Novo marcador aqui', () => criarEm('m', p)),
        item('Novo grupo aqui', () => criarEm('g', p)),
        item('Novo evento aqui', () => criarEm('e', p)),
        item('Novo texto aqui', () => novoTexto(preso(p))),
      ];
    }
    mostrarMenu(h('div', { class: 'menu', role: 'menu', 'aria-label': 'Opções do mapa' }, ...itens), x, y);
  }

  /* ---- teclado ---- */
  function emCampo(el) {
    if (!el || !el.tagName) return false;
    if (el.isContentEditable) return true;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
    if (el.tagName !== 'INPUT') return false;
    return !/^(checkbox|radio|button|submit|reset|color|file)$/i.test(el.type);
  }
  function aoTeclar(e) {
    if (!App || !M) return;
    if (menuEl) {
      if (e.key === 'Escape') { e.preventDefault(); fecharMenus(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const bs = [...menuEl.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
        if (bs.length) { e.preventDefault(); const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1; bs[(i + d + bs.length) % bs.length].focus(); }
        return;
      }
      if (menuEl.contains(document.activeElement)) return;
    }
    if (document.querySelector('dialog[open]')) return;
    const alvo = e.target && e.target.nodeType === 1 ? e.target : document.activeElement;
    if (emCampo(alvo)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key, lk = k.length === 1 ? k.toLowerCase() : k, editar = podeEditar();
    const emControle = alvo && alvo.closest && alvo.closest('button, a, input, [role="tab"], [role="menuitem"]');
    const noPainel = alvo && alvo.closest && alvo.closest('#side, .menu');
    if (k === ' ' || e.code === 'Space') {
      // num botão do painel o espaço aperta o botão; no trilho e nas opções, segurar o espaço anda pelo mapa
      if (noPainel || (emControle && !alvo.closest('#rail, .opts'))) return;
      e.preventDefault();
      if (!espaco) { espaco = true; palco.style.cursor = 'grab'; }
      return;
    }
    if (k === 'Escape') {
      if (g) { cancelarGesto(); e.preventDefault(); return; }
      if (medindo) { cancelarMedida(); e.preventDefault(); return; }
      if (rasc) { cancelarRascunho(); e.preventDefault(); return; }
      if (regua) { regua = null; desenharRascunho(); atualizarDica(); e.preventDefault(); return; }
      // numa ferramenta de criar, Esc volta para Selecionar (como a dica promete); em Selecionar, limpa a seleção
      if (editar && App.ferramenta !== 'sel') { App.usarFerramenta('sel'); e.preventDefault(); return; }
      if ((App.sel || []).length) { App.selecionar([]); e.preventDefault(); }
      return;
    }
    if (k === 'Enter') {
      if (emControle) return;
      if (rasc) { e.preventDefault(); terminarRascunho(); }
      return;
    }
    // Com o foco no painel (num botão, no seletor de cor…) as teclas são do painel: Delete não apaga o que está
    // escolhido no mapa, e quem digita achando que está num campo não troca a ferramenta nem dá zoom sem perceber.
    if (noPainel && k !== 'Escape') return;
    if (k === 'Backspace' || k === 'Delete') {
      // desenhando uma linha, as duas tiram o último ponto (e nunca apagam o que estava escolhido antes)
      if (rasc) { e.preventDefault(); tirarPonto(); return; }
      if (editar && ferramenta() === 'sel' && selecao().length && !g) { e.preventDefault(); apagar(selecao()); }
      return;
    }
    if (k.startsWith('Arrow')) {
      if (alvo && alvo.type === 'range') return;
      const dx = k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0, dy = k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0;
      e.preventDefault();
      const ids = g && g.setas ? g.ids : selecao(), passo = e.shiftKey ? 10 : 1;
      if (editar && ids.length && (!g || g.setas)) {
        if (e.repeat || g) setaSegurada(ids, dx * passo, dy * passo);
        else moverSelecao(ids, dx * passo, dy * passo);
      } else if (!g) { V.x -= dx * 80; V.y -= dy * 80; agendarVista(); }     // sem seleção, as setas andam pelo mapa
      return;
    }
    if (k === '+' || k === '=') { zoomNoMeio(1.25); return; }
    if (k === '-' || k === '_') { zoomNoMeio(1 / 1.25); return; }
    if (k === '0') { caber(); return; }
    if (editar && POR_TECLA[lk] && !e.repeat) { e.preventDefault(); App.usarFerramenta(POR_TECLA[lk]); }
  }
  function aoSoltarTecla(e) {
    if (e.key === ' ' || e.code === 'Space') { espaco = false; palco.style.cursor = ''; }
    if (e.key && e.key.startsWith('Arrow')) soltarSetas();
  }
  /* Segurar a seta: o objeto anda na tela e vira UM passo de desfazer ao soltar a tecla (como no arrasto). Uma
     mudança por repetição do teclado encheria a pilha (100 passos) e empurraria para fora o que veio antes. */
  let tSetas = 0;
  function setaSegurada(ids, dx, dy) {
    if (!g) {
      const objs = ids.map(objEditavel).filter(Boolean);
      if (!objs.length) return;
      g = { tipo: 'mover', setas: true, ids: objs.map(o => o.id), objs, dx: 0, dy: 0 };
      App.gesto = true;
    }
    [g.dx, g.dy] = limitarDelta(g.objs, g.dx + dx, g.dy + dy);
    moverProvisorio(g);
    clearTimeout(tSetas); tSetas = setTimeout(soltarSetas, 800);          // se o "soltar" da tecla se perder
  }
  function soltarSetas() {
    clearTimeout(tSetas);
    if (!g || !g.setas) return;
    const gg = g;
    g = null; App.gesto = false;
    soltarProvisorio(gg);
    if (podeEditar() && (gg.dx || gg.dy)) moverSelecao(gg.ids, gg.dx, gg.dy);
    redesenhar();
  }

  /* ---- medir com a régua (o painel usa para definir a escala) ---- */
  function cancelarMedida() {
    if (!medindo) return;
    const m = medindo;
    medindo = null; regua = null;
    m.ok(null);
    if (App.ferramenta !== m.ant) App.usarFerramenta(m.ant); else agendar();
  }
  function medir() {
    if (medindo) { const m = medindo; medindo = null; m.ok(null); }
    if (!App || !M) return Promise.resolve(null);
    return new Promise(ok => {
      const ant = VALIDAS.has(App.ferramenta) && App.ferramenta !== 'd' ? App.ferramenta : 'sel';
      rasc = null; regua = null;
      medindo = { ok, ant };
      if (App.ferramenta !== 'd' && podeEditar()) App.usarFerramenta('d');
      else agendar();
    });
  }

  /* ---- partida ---- */
  function iniciar(app) {
    if (App) return;
    App = app;
    palco = document.getElementById('palco');
    mundoEl = document.getElementById('mundo');
    optsEl = document.getElementById('opts');
    dicaEl = document.getElementById('dica');
    railEl = document.getElementById('rail');
    zTxt = document.getElementById('zTxt');

    svg = s('svg', { class: 'camadas', xmlns: NS, width: 1, height: 1 });
    svg.style.transformOrigin = '0 0';
    mascara = s('mask', { id: MASCARA, maskUnits: 'userSpaceOnUse', maskContentUnits: 'userSpaceOnUse' });
    mascBase = s('rect', { fill: '#fff' });
    mascOps = s('g');
    mascara.append(mascBase, mascOps);
    gradePath = s('path', { class: 'grade-linha', fill: 'none' });
    gradePat = s('pattern', { id: GRADE, patternUnits: 'userSpaceOnUse', width: 1, height: 1 }, gradePath);
    svg.append(s('defs', null, mascara, gradePat));
    for (const n of ['hex', 'lin', 'car', 'reg', 'zon', 'txt', 'fre', 'rot', 'eve', 'mar', 'nev', 'tra', 'gru', 'sel', 'rasc']) { C[n] = s('g', { class: 'c-' + n }); svg.append(C[n]); }
    hexTer = s('g', { class: 'hex-tinta' });
    gradeRect = s('rect', { class: 'grade', x: 0, y: 0, fill: `url(#${GRADE})` });
    C.hex.append(hexTer, gradeRect);
    nevRect = s('rect', { class: 'nevoa', mask: `url(#${MASCARA})` });
    C.nev.append(nevRect);
    mundoEl.append(svg);
    montarTrilho();

    palco.addEventListener('pointerdown', aoApertar);
    palco.addEventListener('pointermove', aoMover);
    palco.addEventListener('pointerup', aoSoltar);
    palco.addEventListener('pointercancel', aoSoltar);
    // perdeu o ponteiro sem soltar (outra janela tomou o foco, por exemplo): desiste do gesto sem gravar
    palco.addEventListener('lostpointercapture', e => { if (g && e.pointerId === g.pid) cancelarGesto(); });
    palco.addEventListener('pointerleave', e => { if (!g && e.pointerType !== 'touch') { cursor = null; desenharRascunho(); } });
    palco.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });   // sem a rolagem automática do botão do meio
    // dois cliques num marcador com atalho seguem o atalho (abrem a cena, o mapa ou o acampamento)
    palco.addEventListener('dblclick', e => {
      if (!M || App.ferramenta !== 'sel' || (e.target.closest && e.target.closest('.opts, .zoom, .vazio'))) return;
      // (o gesto captura o ponteiro, então o alvo do evento é o palco: quem está embaixo do cursor é achado pelo ponto)
      const id = idDoAlvo(document.elementFromPoint(e.clientX, e.clientY) || e.target), o = id ? M.objs.find(x => x.id === id) : null;
      if (o && o.k === 'm' && o.liga && window.MundoPainel && MundoPainel.seguirLiga) { e.preventDefault(); MundoPainel.seguirLiga(o); }
    });
    palco.addEventListener('contextmenu', e => {
      if (e.target.closest && e.target.closest('.opts, .zoom, .vazio')) return;
      e.preventDefault();
      if (Date.now() - ultimoMenu < 900 || g) return;      // o toque longo já abriu
      abrirMenuMapa(e.clientX, e.clientY, idDoAlvo(e.target), paraMundo(e.clientX, e.clientY));
    });
    palco.addEventListener('wheel', e => {
      if (!M || (e.target.closest && e.target.closest('.opts, .vazio'))) return;
      e.preventDefault();
      fecharMenus();
      const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
      zoomEm(e.clientX, e.clientY, V.z * Math.exp(-limitar(dy, -300, 300) * (e.ctrlKey ? 0.01 : 0.0018)));
    }, { passive: false });
    // fecha o menu ao tocar fora dele
    document.addEventListener('pointerdown', e => { if (menuEl && !menuEl.contains(e.target)) fecharMenus(); }, true);
    window.addEventListener('keydown', aoTeclar);
    window.addEventListener('keyup', aoSoltarTecla);
    window.addEventListener('blur', () => { espaco = false; if (palco) palco.style.cursor = ''; fecharMenus(); soltarSetas(); });
    window.addEventListener('resize', fecharMenus);

    const bt = (id, fn) => { const b = document.getElementById(id); if (b) b.addEventListener('click', fn); };
    bt('zMenos', () => zoomNoMeio(1 / 1.25));
    bt('zMais', () => zoomNoMeio(1.25));
    bt('zCabe', () => caber());

    // o palco muda de tamanho (painel abre e fecha, celular gira): mantém o mesmo ponto no meio
    if (window.ResizeObserver) new ResizeObserver(() => {
      const t = tamanho();
      // escondido (outra aba da casca: a moldura fica com display none) o palco mede 0×0: guarda o último tamanho de
      // verdade, senão a volta somaria meia tela ao deslocamento a cada troca de aba
      if (!t.w || !t.h) return;
      if (tamPalco && !precisaCaber) { V.x += (t.w - tamPalco.w) / 2; V.y += (t.h - tamPalco.h) / 2; aplicarVista(); }
      tamPalco = { w: t.w, h: t.h };
      if (precisaCaber) caber();
    }).observe(palco);

    App.on('muda', agendar);
    App.on('sel', agendar);
    App.on('papel', agendar);
    App.on('vista', agendar);
    App.on('mapas', agendar);
    App.on('ferramenta', () => {
      const f = ferramenta();
      if (rasc && rasc.k !== tipoDoRasc()) rasc = null;
      if (f !== 'd' && regua && !regua.manter) regua = null;
      if (medindo && App.ferramenta !== 'd') { const m = medindo; medindo = null; m.ok(null); }
      if (g) cancelarGesto();
      fecharMenus();
      agendar();
    });
    redesenhar();
  }

  window.MundoTela = {
    iniciar,
    redesenhar,
    centrar,
    caber,
    paraMundo,
    medir,
    ferramentas: FERRAMENTAS.map(f => ({ id: f.id, nome: f.nome, tecla: f.tecla })),
    get zoom() { return V.z; },
    set zoom(z) { if (palco) zoomNoMeio(z / V.z); },
  };
})();
