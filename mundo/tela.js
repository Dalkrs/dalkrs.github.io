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
  // (lote 29) os ícones do mapa, menores: o desenho do marcador, do grupo e do selo do evento a 72% (o marcador, de 28 para
  // uns 20 px na tela); os nomes continuam do mesmo tamanho. E os carimbos também ficam do mesmo tamanho na tela em
  // qualquer zoom (PX_CARIMBO: Pequeno, Médio, Grande, Enorme, em px).
  const ICO = 0.72;
  const PX_CARIMBO = { 24: 16, 40: 22, 64: 30, 100: 40 };
  const pxDoTam = t => PX_CARIMBO[t] || Math.round(limitar(Number(t) || 40, 8, 400) * 0.55);
  const OPT_PADRAO = { ic: 'cidade', rumor: false, tipo: 'guerra', via: 'trilha', a: null, b: null, pincel: 'revelar', raio: 60, oculto: false, ter: 'fl', terModo: 'ter', custo: 10, hexPincel: 0,
    terPincel: '', pinTer: 'fl', pinRaio: 24, freModo: 'linha', des: 'carimbo', carimbo: 'arvore', carTam: 40, fonte: 'mapa', txtTam: 28, estilo: 'rio', linNivel: 2,
    tipoGrupo: '', zonaTipo: 'tempestade',                                  // (lote 7, parte 5b) o tipo do grupo novo: '' (grupo), caravana, patrulha, exército
    setaFac: null, zAj: 'por', recPin: '', recQtd: 1 };                      // (lote 17) a seta (a facção), o ajuste da zona, o recurso do pincel
  // a largura de cada desenho de linha, em pixels da tela, para Fina, Média, Larga e Bem larga (no rio: a da foz)
  const LARGURAS = { rio: [6, 12, 20, 32], estrada: [2, 3.5, 5, 8], trilha: [1.5, 2.5, 4, 6] };
  const CAMADA = { r: 'reg', f: 'fre', t: 'rot', e: 'eve', m: 'mar', g: 'gru', z: 'zon', l: 'lin', c: 'car', x: 'txt', a: 'set' };
  const APAGADO = { m: 'Marcador apagado.', g: 'Grupo apagado.', r: 'Região apagada.', e: 'Evento apagado.', t: 'Rota apagada.', f: 'Frente apagada.',
    z: 'Zona de guerra apagada.', l: 'Linha apagada.', c: 'Carimbo apagado.', x: 'Texto apagado.', a: 'Seta apagada.' };
  // rótulos do desfazer em minúsculas, como os do painel e do App ("Desfazer: novo marcador")
  const NOVO = { m: 'novo marcador', g: 'novo grupo', r: 'nova região', e: 'novo evento', t: 'nova rota', f: 'nova frente',
    z: 'nova zona de guerra', l: 'nova linha', c: 'novo carimbo', x: 'novo texto', a: 'nova seta' };
  // o que só se escolhe ao soltar (arrastar por cima ainda anda pelo mapa): áreas, linhas e os enfeites
  const LARGOS = new Set(['r', 't', 'f', 'z', 'l', 'c', 'x', 'a']);
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
    { id: 'w', nome: 'Caneta', tecla: 'W' },                    // (lote 17) o desenho de agora, que todos veem (também quem joga)
  ];
  const SEPARA_DEPOIS = new Set(['sel', 'f', 'd']);
  /* (lote 26) Para quem mestra, o trilho em grupos com nome: o que se usa na sessão (mexer nos grupos, eventos, os
     ícones no mapa, a régua e a caneta), o que se traça (regiões, rotas, frentes) e o preparo (terreno, desenho, névoa).
     As teclas são as de sempre. */
  const GRUPOS_TRILHO = [['Sessão', ['sel', 'g', 'e', 'm', 'd', 'w']], ['Traçar', ['r', 't', 'f']], ['Preparar', ['h', 'p', 'n']]];
  const COMO_ANTES = (() => { try { return localStorage.getItem('tinycats:testes-tudo-aberto') === '1'; } catch (e) { return false; } })();
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
    w: '<path d="M14.5 3.5l4 4L8 18l-4.5 1 1-4.5z"/><path d="M12.5 5.5l4 4M13 21c1.8-1.2 3.4-1.2 5.2 0 .9.6 1.8.6 2.8 0"/>',
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
  // (lote 7, parte 5a) "Animar os eventos" (o painel guarda, neste navegador): ligado de começo
  const animarEventos = () => { try { const v = JSON.parse(localStorage.getItem('tinycats:mundo:painel') || 'null'); return !(v && v.animar === false); } catch (e) { return true; } };
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
  // a distância de p até a borda de um polígono
  function distBorda(p, pts) {
    let d = Infinity;
    for (let i = 0, k = pts.length - 1; i < pts.length; k = i++) {
      const [ax, ay] = pts[k], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2)) : 0;
      d = Math.min(d, Math.hypot(p[0] - ax - dx * t, p[1] - ay - dy * t));
    }
    return d;
  }
  /* (lote 6) O nome de uma região que tem outras dentro (o Reino com os Condados): dentro dela e fora das de dentro, no
     ponto mais longe das bordas — senão os nomes se encavalam. */
  function pontoDoNomeLivre(pts, buracos) {
    const c = pontoDoNome(pts);
    if (!buracos.length || !buracos.some(b => N().dentroPoligono(c, b))) return c;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const passo = Math.max(x1 - x0, y1 - y0) / 24;
    let melhor = null, dm = -1;
    if (!(passo > 0)) return c;
    for (let x = x0 + passo / 2; x < x1; x += passo) for (let y = y0 + passo / 2; y < y1; y += passo) {
      const p = [x, y];
      if (!N().dentroPoligono(p, pts) || buracos.some(b => N().dentroPoligono(p, b))) continue;
      const d = Math.min(distBorda(p, pts), ...buracos.map(b => distBorda(p, b)));
      if (d > dm) { dm = d; melhor = p; }
    }
    return melhor || c;
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
  // a forma de hoje (a zona de guerra e a frente — lote 8, parte 6 — mudam com as fases; o resto tem uma forma só)
  const comFases = o => (o.k === 'z' || o.k === 'f') && Array.isArray(o.fases);
  function formaDe(o, dia) { try { return comFases(o) ? N().formaNoDia(o, dia == null ? diaDaVista() : dia) : o.pts; } catch (e) { return o.pts; } }
  // os pontos que o mestre ajusta agora: os da fase de hoje (zona, frente) ou os do objeto
  function ptsEditaveis(o) {
    if (!comFases(o)) return o.pts;
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
        if (comFases(o)) for (const f of o.fases) for (const q of f.pts || []) p(q[0], q[1]);
      } else if (Number.isFinite(o.x)) p(o.x, o.y);
    }
    return x0 <= x1 ? { x0, y0, x1, y1 } : null;
  }
  function deslocar(o, dx, dy) {
    if (Number.isFinite(o.x) && Number.isFinite(o.y)) { o.x = um(o.x + dx); o.y = um(o.y + dy); }
    const mover = pts => pts.map(q => [um(q[0] + dx), um(q[1] + dy)]);
    if (Array.isArray(o.pts)) o.pts = mover(o.pts);
    if (comFases(o)) o.fases = o.fases.map(f => ({ dia: f.dia, pts: mover(f.pts || []) }));   // todas as fases andam juntas
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
  let pegando = null;                            // (lote 7, parte 5b) { ok, dica } enquanto escolherPonto() espera um clique
  let cursor = null;                             // onde o ponteiro está, em unidades do mapa
  let ultimoClique = null, tLongo = 0, ultimoMenu = 0, tMovendo = 0;

  const podeEditar = () => { try { return !!(App && App.podeEditar()); } catch (e) { return false; } };
  const mestreVe = () => !!(App && App.papel === 'mestre' && !App.comoJogador);
  // (lote 17) a caneta é de todos (quem joga também desenha), com um mapa aberto
  const podeRabiscar = () => { try { return !!(App && App.podeRabiscar && App.podeRabiscar()); } catch (e) { return false; } };
  function ferramenta() {
    if (medindo) return 'd';
    const f = App && App.ferramenta;
    return podeEditar() && VALIDAS.has(f) ? f : f === 'w' && podeRabiscar() ? 'w' : 'sel';
  }
  const selecao = () => (Array.isArray(App.sel) ? App.sel : []).filter(id => indice.has(id));
  /* (lote 8, parte 4) As camadas deste aparelho (camadas.js): o que está numa camada escondida não se desenha; o que
     está numa travada aparece, mas o clique passa por ele (não se escolhe nem se mexe pelo mapa). Criar numa camada
     escondida ou travada só avisa, com o botão que resolve. */
  const Cam = () => window.MundoCamadas || null;
  const camVisivel = id => { const c = Cam(); return !c || c.visivel(id); };
  const camLivre = id => { const c = Cam(); return !c || c.livre(id); };
  function camadaDaFerramenta(f) {
    switch (f) {
      case 'm': case 'g': return 'lugares';
      case 'r': return 'regioes';
      case 'e': return 'eventos';
      case 't': return 'rotas';
      case 'f': return opt('freModo') === 'perigo' ? 'perigos' : 'guerra';
      case 'h': return 'terreno';
      case 'p': return modoDesenho() === 'linha' ? 'linhas' : 'enfeites';
      case 'w': return 'desenhos';
    }
    return null;
  }
  // true: a camada não está livre (o aviso já foi mostrado)
  function camadaParada(cam) {
    if (!cam || camLivre(cam)) return false;
    Cam().avisar(cam);
    return true;
  }
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
    // (no meio do zoom, o canvas escala como imagem; lote 24: no meio do arrasto também — repinta quando a mão para)
    if (hexDados && V.z === zAplicado) { if (mundoEl.classList.contains('movendo')) hexDepois = true; else pintarHexVista(); }
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
  /* (lote 29) Os carimbos têm o mesmo tamanho na tela em qualquer zoom: com o zoom afastado, os que cairiam um em cima do
     outro (a floresta espalhada vira um borrão) saem da vista — os maiores ficam, e o escolhido nunca sai. Ao aproximar,
     voltam. */
  function arrumarCarimbos(z, escolhidos) {
    const lista = [];
    for (const o of C.car.children) { const f = o.lastElementChild; if (f && f.__x !== undefined && f.__px) lista.push([o, f, escolhidos.has(o.getAttribute('data-id'))]); }
    lista.sort((a, b) => (b[2] - a[2]) || (b[1].__px - a[1].__px));
    const CEL = 48, grade = new Map();
    for (const [o, f, sel] of lista) {
      const x = f.__x * z, y = f.__y * z, r = f.__px / 2, cx = Math.floor(x / CEL), cy = Math.floor(y / CEL);
      let bate = false;
      if (!sel) for (let i = cx - 1; i <= cx + 1 && !bate; i++) for (let j = cy - 1; j <= cy + 1 && !bate; j++) {
        const l = grade.get(i + ':' + j);
        if (l) for (const b of l) if (Math.hypot(b[0] - x, b[1] - y) < (b[2] + r) * 0.55) { bate = true; break; }
      }
      if (bate !== !!o.__junto) { o.__junto = bate; o.classList.toggle('car-junto', bate); }
      if (!bate) { const k = cx + ':' + cy; if (!grade.has(k)) grade.set(k, []); grade.get(k).push([x, y, r]); }
    }
  }
  function arrumarRotulos() {
    if (!svg || !M) return;
    const escolhidos = new Set((App && App.sel) || []), z = zAplicado || V.z, CEL = 96, grade = new Map();
    if (C.car) arrumarCarimbos(z, escolhidos);
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
      if (f && f.__x !== undefined) ocupar([f.__x * z - 11, f.__y * z - 11, f.__x * z + 11, f.__y * z + 11]);    // (lote 29: os ícones menores)
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
    tMovendo = setTimeout(() => { if (!g && !pinca && mundoEl) { mundoEl.classList.remove('movendo'); if (!tAssentar) quieto(false); if (hexDepois) { hexDepois = false; pintarHexVista(); } } }, 180);
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
    if (g && (g.tipo === 'mover' || g.tipo === 'alca' || g.tipo === 'pincel' || g.tipo === 'hexpincel' || g.tipo === 'pintura' || g.tipo === 'carimbos' || g.tipo === 'rabisco')) { adiado = true; return; }
    adiado = false;
    const m = safeVista();
    M = m;
    pintarTrilho();
    palco.className = 'palco ' + (podeEditar() || ferramenta() === 'w' ? 't-' + ferramenta() : 't-ver') + (g && g.tipo === 'pan' ? ' pan' : '');
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
    ctxAtual = { m, dia: (m.cal && m.cal.dia) || 0, fac, mestre: mestreVe(), fb: escalaBandeira(), marHex: marDoMapa(m), refCar: refCarimbos(m) };
    desenharObjetos(m, ctxAtual);
    desenharHexGuerra(m);
    // (lote 17) a zona de guerra automática, as rotas por mar, as setas das marchas, os recursos dos hexágonos e a caneta
    for (const [nome, fn] of [['zona', () => desenharZonaAuto(m, ctxAtual)], ['mar', () => desenharMar(m, ctxAtual)], ['setas', () => desenharSetasDosGrupos(m, ctxAtual)],
      ['recursos', () => desenharRecursosHex(m)], ['caneta', () => desenharRabiscos(m)]]) { try { fn(); } catch (e) { if (!avisouErro) { avisouErro = true; console.error('Mapa-múndi: não deu para desenhar ' + nome + '.', e); } } }
    pintarCaneta();
    // As animações (pulso dos eventos, marcha das frentes) repintam o SVG a cada quadro, fora da placa de vídeo.
    // Poucas, dão vida ao mapa; muitas, gastam a bateria e travam o resto: acima da conta, ficam paradas.
    svg.classList.toggle('sem-pulso', C.eve.getElementsByClassName('eve-pulso').length + C.zon.getElementsByClassName('zona-pulsa').length > 24);
    svg.classList.toggle('sem-marcha', C.fre.getElementsByClassName('frente-anda').length > 12);
    // (lote 7, parte 5a) os desenhos animados dos eventos: com "Animar os eventos" desligado neste aparelho, ou muitos, param
    svg.classList.toggle('sem-anima', !animarEventos() || C.eve.getElementsByClassName('eve-anim').length > 120);
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
      mundoEl.insertBefore(pintEl, hexCv || svg);           // (por baixo do terreno de cada hexágono)
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
    // (lote 8) a camada Terreno escondida neste aparelho: o desenho fica guardado, só não aparece
    if (tem && !camVisivel('terreno')) { if (pintEl) pintEl.hidden = true; return; }
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
    // (lote 6) a lavoura: fileiras de ponta a ponta (horizontais, emendam sem costura)
    if (tex === 'lavoura') {
      for (const y of [4, 20, 36, 52]) {
        x.fillStyle = misturar(cor, '#000000', 0.16); x.globalAlpha = 0.4; x.fillRect(0, y, 64, 7);
        x.globalAlpha = 0.8; x.strokeStyle = esc; x.lineWidth = 1; x.beginPath(); x.moveTo(0, y); x.lineTo(64, y); x.moveTo(0, y + 7); x.lineTo(64, y + 7); x.stroke();
      }
      x.globalAlpha = 1;
    }
    const n = { mato: 9, arvores: 7, colinas: 4, montes: 4, juncos: 6, areia: 40, neve: 14, ondas: 4, pedras: 8,
      ruinas: 4, lava: 5, cristais: 6, selva: 10, savana: 6, tundra: 7, corrompida: 5,
      raso: 5, fundo: 4, desfiladeiro: 3, geleira: 5, morta: 6, oasis: 2, charneca: 8, devastada: 5 }[tex] || 0, pos = [];     // (lote 17: os oito novos)
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
        // (lote 6) os terrenos novos
        case 'ruinas': x.fillStyle = cla; x.beginPath(); x.moveTo(-2.5, 5); x.lineTo(-2.5, -5); x.lineTo(-0.8, -6.5); x.lineTo(0.8, -4.6); x.lineTo(2.5, -5.6); x.lineTo(2.5, 5); x.closePath(); x.fill(); x.stroke(); linhas([-4.5, 5, 4.5, 5]); break;
        case 'lava': x.lineWidth = 3; x.strokeStyle = '#ff7a1a'; x.globalAlpha = 0.5; linhas([-7, 2, -2, -1], [-2, -1, 1, 2.5], [1, 2.5, 6, -3]); x.lineWidth = 1.1; x.strokeStyle = '#ffd166'; x.globalAlpha = 1; linhas([-7, 2, -2, -1], [-2, -1, 1, 2.5], [1, 2.5, 6, -3]); break;
        case 'cristais': x.fillStyle = cla; x.beginPath(); x.moveTo(-3.5, 4); x.lineTo(-4.5, -2); x.lineTo(-2.5, -7); x.lineTo(-0.8, -2); x.lineTo(-1.2, 4); x.closePath(); x.fill(); x.stroke();
          x.beginPath(); x.moveTo(0, 4); x.lineTo(1, -1); x.lineTo(3.5, -4.5); x.lineTo(4, 0); x.lineTo(2.5, 4); x.closePath(); x.fill(); x.stroke(); break;
        case 'selva': x.fillStyle = misturar(cor, '#000000', 0.25); x.beginPath(); x.arc(-3, 1, 4, 0, 7); x.arc(3, 1, 4, 0, 7); x.fill(); x.fillStyle = misturar(cor, '#000000', 0.12); x.beginPath(); x.arc(0, -2, 4.6, 0, 7); x.fill(); x.stroke(); x.fillStyle = cla; x.beginPath(); x.arc(-1.2, -3.4, 1.5, 0, 7); x.fill(); break;
        case 'savana': x.strokeStyle = misturar(cor, '#6b4a1b', 0.45); linhas([-3, 1, -1.5, -2.5], [0, 1.5, 0.3, -3.5], [3, 1, 1.8, -2.5]); break;
        case 'tundra': x.fillStyle = misturar(cor, '#2f4a35', 0.55); x.beginPath(); x.arc(-2, 0, 2.2, 0, 7); x.arc(2, 0, 2.2, 0, 7); x.arc(0, -2, 2.5, 0, 7); x.fill(); x.fillStyle = '#ffffff'; x.globalAlpha = 0.6; x.beginPath(); x.ellipse(5, 5, 4, 1.6, 0, 0, 7); x.fill(); x.globalAlpha = 1; break;
        case 'corrompida': x.lineWidth = 3; x.strokeStyle = '#b25cff'; x.globalAlpha = 0.45; linhas([-6, -3, -1, 0], [-1, 0, 2, -2], [2, -2, 6, 3]); x.lineWidth = 1; x.strokeStyle = '#241228'; x.globalAlpha = 1; linhas([-6, -3, -1, 0], [-1, 0, 2, -2], [2, -2, 6, 3]); x.fillStyle = '#d7a6ff'; x.beginPath(); x.arc(-3, 4, 0.9, 0, 7); x.fill(); break;
        // (lote 17) os oito novos
        case 'raso': x.strokeStyle = cla; x.lineWidth = 1.1; x.beginPath(); x.arc(0, 0, 3.6, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); x.beginPath(); x.arc(0, 0, 6, Math.PI * 1.2, Math.PI * 1.8); x.stroke(); x.fillStyle = esc; x.globalAlpha = 0.35; x.beginPath(); x.arc(4, 3, 0.9, 0, 7); x.arc(-3, 3.5, 0.7, 0, 7); x.fill(); x.globalAlpha = 1; break;
        case 'fundo': x.strokeStyle = misturar(cor, '#ffffff', 0.2); x.lineWidth = 1.6; x.beginPath(); x.moveTo(-10, 0); x.quadraticCurveTo(-5, -5, 0, 0); x.quadraticCurveTo(5, 5, 10, 0); x.stroke(); x.strokeStyle = esc; x.lineWidth = 1; x.beginPath(); x.moveTo(-7, 5); x.quadraticCurveTo(-3.5, 2, 0, 5); x.stroke(); break;
        case 'desfiladeiro': x.lineWidth = 3.2; x.strokeStyle = misturar(cor, '#000000', 0.5); linhas([-9, -4, -3, 0], [-3, 0, 2, -2.5], [2, -2.5, 9, 3]); x.lineWidth = 1; x.strokeStyle = cla; linhas([-9, -6.2, -3, -2.2], [-3, -2.2, 2, -4.7], [2, -4.7, 9, 0.8]); break;
        case 'geleira': x.fillStyle = '#ffffff'; x.globalAlpha = 0.5; x.beginPath(); x.moveTo(-6, 2); x.lineTo(-1, -4); x.lineTo(5, -1); x.lineTo(1, 4); x.closePath(); x.fill(); x.globalAlpha = 1; x.strokeStyle = misturar('#5f8fb0', cor, 0.15); x.lineWidth = 0.9; linhas([-6, 2, -1, -4], [-1, -4, 5, -1], [-1, -4, 0, 1]); break;
        case 'morta': x.strokeStyle = misturar(cor, '#000000', 0.5); x.lineWidth = 1.3; linhas([0, 5, 0, -5], [0, -1, -3.5, -4], [0, 1, 3, -3], [-2, -3, -3, -5.5], [1.8, -1.8, 3.5, -5]); break;
        case 'oasis': x.fillStyle = '#4f9fd0'; x.globalAlpha = 0.75; x.beginPath(); x.ellipse(0, 4, 6, 2.2, 0, 0, 7); x.fill(); x.globalAlpha = 1; x.strokeStyle = misturar(cor, '#3a2a10', 0.5); x.lineWidth = 1.2; linhas([0, 3, 1, -5]);
          x.fillStyle = misturar(cor, '#1d4a22', 0.55); x.beginPath(); x.ellipse(-2, -5, 3.5, 1.2, -0.4, 0, 7); x.ellipse(3.6, -5, 3.5, 1.2, 0.4, 0, 7); x.fill(); break;
        case 'charneca': x.strokeStyle = misturar(cor, '#3a2a3a', 0.45); linhas([-3, 1, -1.5, -1.5], [0, 1.5, 0.3, -2], [3, 1, 1.8, -1.5]); x.fillStyle = '#c08cbb'; x.beginPath(); x.arc(-1.5, -2, 1, 0, 7); x.arc(1.8, -2, 1, 0, 7); x.arc(0.3, -2.6, 0.9, 0, 7); x.fill(); break;
        case 'devastada': x.lineWidth = 1.2; x.strokeStyle = '#2a1f18'; linhas([-6, -2, -1, 1], [-1, 1, 3, -1], [3, -1, 7, 2]); x.fillStyle = '#e0702a'; x.globalAlpha = 0.7; x.beginPath(); x.arc(-3, 3, 0.9, 0, 7); x.arc(4, -3, 0.7, 0, 7); x.fill(); x.globalAlpha = 1; break;
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
  // (lote 7) a força da tinta do terreno — a mesma para o desenho à mão e para os hexágonos pintados (aba Terreno)
  const forcaDaTinta = m => { const a = Number(m && m.pintura ? m.pintura.alfa : 1); return Number.isFinite(a) ? limitar(a, 0.1, 1) : 1; };
  function desenharGrade(m) {
    // (lote 7) As linhas da grade e a tinta dos hexágonos pintados são coisas separadas: esconder a grade ("Mostrar a
    // grade" desligado) tira só as linhas — a tinta continua no mapa, para todos.
    // (lote 8) a camada Grade escondida neste aparelho tira as linhas (menos enquanto a ferramenta Terreno está em uso, como
    // com "Mostrar a grade" desligado); a camada Terreno escondida tira a tinta dos hexágonos
    const gr = m.grade || {}, ferr = usandoTerreno(), tem = temGrade(m), linhas = tem && (!!gr.on || ferr) && (ferr || camVisivel('grade')), ter = camVisivel('terreno');
    C.hex.style.display = linhas ? '' : 'none';
    if (!tem) { if (hexCv) hexCv.hidden = true; return; }
    if (hexCv) { hexCv.hidden = !hexDados || !ter; hexCv.style.opacity = String(forcaDaTinta(m)); }
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
    const chaveT = JSON.stringify([m.hexes, m.terrenos, gr.tam, gr.x, gr.y, gr.orient, gr.des, custo, L, A]);
    if (chaveT === hexChave) { pintarHexVista(); return; }
    hexChave = chaveT;
    const por = new Map(), custos = [];
    let nada = '';
    for (const k of Object.keys(m.hexes || {})) {
      const v = m.hexes[k], t = typeof v === 'string' ? v : Array.isArray(v) ? v[0] : '', hx = N().lerChaveHex(k);
      if (!hx) continue;
      if (t === '-') { if (custo) nada += caminho(N().cantosHex(m, hx.q, hx.r), true); }        // "sem terreno", por cima do desenho
      else if (t) { if (!por.has(t)) por.set(t, []); por.get(t).push(hx); }
      if (Array.isArray(v) && v[1] != null) custos.push([hx, v[1]]);
    }
    // a cor e o desenho de cada hexágono vão no canvas; aqui, por cima, o "sem terreno" e os custos do mestre
    prepararHexes(m, por);
    if (hexDados && ter) { hexCv.hidden = false; pintarHexVista(); }
    const frag = document.createDocumentFragment();
    if (nada) frag.append(s('path', { class: 'hex-nada', d: nada }));
    // o custo próprio de cada hexágono, para o mestre, enquanto ele pinta o terreno
    if (custo) for (const [hx, c] of custos) {
      const p = N().centroHex(m, hx.q, hx.r), fx = fixo(p.x, p.y, 'hex-custo');
      fx.append(s('text', { y: 4, 'text-anchor': 'middle', 'font-size': 11, texto: num(c, 1) }));
      frag.append(fx);
    }
    hexTer.replaceChildren(frag);
  }

  /* (lote 6) O terreno pintado hexágono por hexágono, num canvas entre a pintura à mão e as camadas do mapa.
     (lote 7) A tinta é a mesma do Pincel livre — a cor e a textura do terreno, cobrindo a imagem (com a força da tinta
     da aba Terreno) —, com as bordas macias entre um terreno e outro; de perto, com "Desenho em cada hexágono", cada
     um ganha o desenho do terreno — as árvores da floresta, os picos da montanha, as fileiras da lavoura… —, variado
     de um hexágono para o outro (a semente é o lugar dele: o mesmo hexágono sai sempre igual). Não são carimbos: não
     contam como objetos. Refeito só quando o terreno, a grade ou o tamanho do mapa mudam. */
  let hexCv = null, hexCtx = null, hexDados = null, hexFeito = null, hexVersao = 0, hexDepois = false;
  // O desenho dos hexágonos é feito na resolução da tela (como o resto do mapa fica nítido em qualquer zoom): o
  // canvas cobre só a parte à vista do terreno pintado, com uma margem, e é refeito quando o zoom para ou quando a
  // vista sai do que já foi desenhado. Um teto de pixels guarda a memória (o celular de tela muito densa conta 2).
  const MAX_PX_HEX = 6e6;          // (lote 24: era 12 milhões — pesado demais para o aparelho dos jogadores)
  const dprHex = () => Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  function garantirHexCanvas() {
    if (!hexCv) {
      hexCv = h('canvas', { class: 'hex-desenho', 'aria-hidden': 'true' });
      mundoEl.insertBefore(hexCv, svg);
      hexCtx = hexCv.getContext('2d');
    }
    return !!hexCtx;
  }
  // (lote 7) a máscara de um tipo de terreno (refeita a cada pintura, do tamanho do canvas dos hexágonos) e a textura
  // dele nela; o desfoque da borda só onde o navegador sabe desfocar no canvas (sem ele, a borda fica reta)
  const FILTRO_OK = typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;
  let mascaraCv = null;
  const texturasHex = new Map();
  let trabalhoCv = null;
  function trabalhoHex(w, hh) {
    if (!trabalhoCv) trabalhoCv = document.createElement('canvas');
    if (trabalhoCv.width !== w || trabalhoCv.height !== hh) { trabalhoCv.width = w; trabalhoCv.height = hh; }
    return trabalhoCv;
  }
  function mascaraHex(w, hh) {
    if (!mascaraCv) mascaraCv = document.createElement('canvas');
    if (mascaraCv.width !== w || mascaraCv.height !== hh) { mascaraCv.width = w; mascaraCv.height = hh; }
    return mascaraCv;
  }
  // (lote 8) liso: só a cor e as manchas, sem os desenhos da textura — de perto, quando cada hexágono já tem o seu desenho
  // (os da textura, de outro tamanho, embolavam com eles)
  function texturaHex(ctx, t, k, liso) {
    const unid = limitar(Math.max(L, A) / 26, 16, 800), px = Math.round(limitar(unid * k, 24, 192));
    const tex = liso ? 'liso' : t.tex || 'liso', chave = [t.cor, tex, px, unid].join('|');
    let pat = texturasHex.get(chave);
    if (pat) return pat;
    pat = ctx.createPattern(ladrilho(t.cor, tex, px), 'repeat');
    try { pat.setTransform(new DOMMatrix([unid / px, 0, 0, unid / px, 0, 0])); } catch (e) { /* sem setTransform: o ladrilho fica do tamanho dos pixels */ }
    if (texturasHex.size > 80) texturasHex.clear();
    texturasHex.set(chave, pat);
    return pat;
  }
  function limparHexCanvas() {
    hexDados = null; hexFeito = null;
    if (!hexCv) return;
    hexCv.hidden = true;
    hexCv.width = hexCv.height = 1;                                  // (devolve a memória)
    hexCv.dataset.ters = '';
  }
  // O terreno pintado (a cada mudança dele): por tipo, os hexágonos com o centro de cada um, e a caixa de todos.
  // porTer: id do terreno → [{ q, r }]
  function prepararHexes(m, porTer) {
    const ters = new Map((m.terrenos || []).map(t => [t.id, t])), lista = [], R = m.grade.tam / Math.sqrt(3) + 1;
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const [tid, hs] of porTer) {
      const t = ters.get(tid);
      if (!t) continue;
      let semT = 7;
      for (const ch of String(t.tex || '') + tid) semT = (semT * 31 + ch.charCodeAt(0)) % 2147483647;
      const pts = hs.map(x => {
        const c = N().centroHex(m, x.q, x.r);
        bx0 = Math.min(bx0, c.x - R); by0 = Math.min(by0, c.y - R); bx1 = Math.max(bx1, c.x + R); by1 = Math.max(by1, c.y + R);
        return { q: x.q, r: x.r, x: c.x, y: c.y };
      });
      lista.push({ t, semT, hs: pts });
    }
    if (!lista.length || !garantirHexCanvas()) { limparHexCanvas(); return; }
    hexDados = { m, lista, R, u: m.grade.tam / 2, des: m.grade.des !== false, caixa: [bx0, by0, bx1, by1], n: ++hexVersao };
    hexFeito = null;
    hexCv.dataset.ters = lista.map(x => x.t.id + ':' + x.hs.length).join(',');
    hexCv.dataset.des = hexDados.des ? '1' : '0';
  }
  /* (lote 24) O desenho dos hexágonos, mais leve:
     · numa escala "de degrau" (de √2 em √2) e, quando cabe (e sem os desenhos de cada hexágono), cobrindo todo o terreno
       pintado — dar zoom dentro do mesmo degrau ou arrastar o mapa não repinta nada (o canvas acompanha o mapa);
     · a máscara de cada terreno numa resolução menor (o desfoque da borda macia era o que mais pesava) e a textura num
       canvas de trabalho, só no retângulo em que aquele terreno aparece;
     · um desenho grande é feito em partes, alguns milissegundos por quadro, num canvas fora da tela: o mapa continua
       respondendo, e o desenho novo entra inteiro quando fica pronto (o de antes fica à vista até lá). */
  let hexTrabalho = 0, hexPedido = null;
  const HEX_GRANDE = 2500;                 // hexágonos à vista a partir dos quais o desenho é feito em partes
  function pintarHexVista() {
    const d = hexDados;
    if (!d || !hexCv || hexCv.hidden || !palco) return;
    const zv = zAplicado || V.z, t = tamanho();
    if (!t.w || !t.h || !(zv > 0)) return;
    const z = Math.pow(2, Math.ceil(Math.log2(zv) * 2 - 1e-9) / 2);
    const [bx0, by0, bx1, by1] = d.caixa;
    // a parte à vista do terreno pintado (nada à vista: o que já está desenhado fica como está)
    const vx0 = Math.max(bx0, -V.x / V.z), vy0 = Math.max(by0, -V.y / V.z), vx1 = Math.min(bx1, (t.w - V.x) / V.z), vy1 = Math.min(by1, (t.h - V.y) / V.z);
    if (!(vx1 > vx0 && vy1 > vy0)) return;
    const dpr = dprHex(), cobre = f => f && f.n === d.n && f.z === z && f.dpr === dpr && vx0 >= f.x0 - 1e-6 && vy0 >= f.y0 - 1e-6 && vx1 <= f.x1 + 1e-6 && vy1 <= f.y1 + 1e-6;
    if (cobre(hexFeito) || cobre(hexPedido)) return;
    const comDesenhos = d.des && d.m.grade.tam * z >= 12;          // (de perto, cada hexágono ganha o seu desenho)
    const tudo = !comDesenhos && (bx1 - bx0) * (by1 - by0) * (z * dpr) * (z * dpr) <= MAX_PX_HEX;
    const mw = (t.w / zv) * 0.4, mh = (t.h / zv) * 0.4;
    const x0 = tudo ? bx0 : Math.max(bx0, vx0 - mw), y0 = tudo ? by0 : Math.max(by0, vy0 - mh), x1 = tudo ? bx1 : Math.min(bx1, vx1 + mw), y1 = tudo ? by1 : Math.min(by1, vy1 + mh);
    let k = z * dpr;
    if ((x1 - x0) * (y1 - y0) * k * k > MAX_PX_HEX) k = Math.sqrt(MAX_PX_HEX / ((x1 - x0) * (y1 - y0)));
    const w = Math.max(1, Math.ceil((x1 - x0) * k)), hh = Math.max(1, Math.ceil((y1 - y0) * k));
    const R = d.R, perto = p => p.x > x0 - R && p.x < x1 + R && p.y > y0 - R && p.y < y1 + R;
    let nVista = 0; for (const { hs } of d.lista) for (const p of hs) if (perto(p)) nVista++;
    const grande = nVista > (comDesenhos ? HEX_GRANDE / 3 : HEX_GRANDE);
    const job = ++hexTrabalho, feito = { n: d.n, z, dpr, x0, y0, x1, y1 };
    hexPedido = grande ? feito : null;
    // o canvas em que se desenha: o da tela (desenho pequeno, de uma vez) ou um fora da tela (o grande, em partes)
    const alvo = grande ? foraHex(w, hh) : hexCv;
    const mostrar = () => {
      if (hexCv.width !== w || hexCv.height !== hh) { hexCv.width = w; hexCv.height = hh; }
      const st = hexCv.style;
      st.left = x0 + 'px'; st.top = y0 + 'px'; st.width = (w / k) + 'px'; st.height = (hh / k) + 'px';
    };
    if (!grande) mostrar();
    const passos = passosHex(d, alvo.getContext('2d'), { x0, y0, k, w, hh, R, perto, comDesenhos });
    const fim = () => {
      if (grande) { mostrar(); hexCtx.setTransform(1, 0, 0, 1, 0, 0); hexCtx.globalCompositeOperation = 'source-over'; hexCtx.globalAlpha = 1; hexCtx.clearRect(0, 0, w, hh); hexCtx.drawImage(alvo, 0, 0); }
      hexFeito = feito; hexPedido = null;
      hexCv.dataset.x0 = String(x0); hexCv.dataset.y0 = String(y0); hexCv.dataset.k = String(k);
      hexCv.dataset.liso = comDesenhos ? '1' : '0';                     // (lote 8) de perto, a tinta sem os desenhos da textura
    };
    if (!grande) { while (!passos.next().done) { /* tudo de uma vez */ } fim(); return; }
    const tique = () => {
      if (job !== hexTrabalho || hexDados !== d) return;             // outro desenho foi pedido: este para
      const t0 = performance.now();
      while (performance.now() - t0 < 12) { if (passos.next().done) { fim(); return; } }
      requestAnimationFrame(tique);
    };
    requestAnimationFrame(tique);
  }
  let foraCv = null;
  function foraHex(w, hh) {
    if (!foraCv) foraCv = document.createElement('canvas');
    if (foraCv.width !== w || foraCv.height !== hh) { foraCv.width = w; foraCv.height = hh; }
    return foraCv;
  }
  // os passos do desenho (um gerador: o desenho pequeno roda todos de uma vez; o grande, alguns por quadro)
  function* passosHex(d, c, o) {
    const { x0, y0, k, w, hh, R, perto, comDesenhos } = o;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, w, hh);
    // (lote 7) a tinta: para cada tipo de terreno, os hexágonos dele numa máscara maior e desfocada, cheia com a textura
    // do terreno — onde dois terrenos se encontram, um se mistura com o outro (a borda macia), sem fresta. Depois, a volta
    // de toda a área pintada recorta a tinta (com a borda macia dela, mais curta): por fora, a tinta não avança.
    const macio = FILTRO_OK ? limitar(d.m.grade.tam * k * 0.3, 0, 14) : 0, comBorda = macio >= 0.75;
    const sm = comBorda ? limitar(1.25 / macio, 0.12, 1) : 1, ks = k * sm;
    const mw2 = Math.max(1, Math.ceil(w * sm)), mh2 = Math.max(1, Math.ceil(hh * sm));
    const mc = mascaraHex(mw2, mh2), mx = mc.getContext('2d'), tc = trabalhoHex(w, hh), tx = tc.getContext('2d');
    const limpar = () => { mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'source-over'; mx.filter = 'none'; mx.globalAlpha = 1; mx.clearRect(0, 0, mw2, mh2); mx.setTransform(ks, 0, 0, ks, -x0 * ks, -y0 * ks); };
    // enche a máscara com os hexágonos à vista (a borda alargada e o desfoque em pixels da resolução cheia);
    // devolve a caixa deles (unidades do mapa) ou null
    const encher = (lista, alarga, desfoque) => {
      if (desfoque >= 0.5) mx.filter = 'blur(' + Math.max(0.3, desfoque * sm).toFixed(2) + 'px)';
      mx.fillStyle = '#fff'; mx.strokeStyle = '#fff'; mx.lineJoin = 'round'; mx.lineCap = 'round'; mx.lineWidth = (alarga * 2) / k;
      mx.beginPath();
      let bx = Infinity, by = Infinity, bX = -Infinity, bY = -Infinity;
      for (const p of lista) if (perto(p)) { hexNoCaminho(mx, d.m, p.q, p.r, p.x, p.y); if (p.x < bx) bx = p.x; if (p.y < by) by = p.y; if (p.x > bX) bX = p.x; if (p.y > bY) bY = p.y; }
      const algum = bx !== Infinity;
      if (algum) { mx.fill(); if (alarga > 0) mx.stroke(); }
      mx.filter = 'none';
      if (!algum) return null;
      const folga = R + (alarga + desfoque * 2 + 2) / k;
      return [bx - folga, by - folga, bX + folga, bY + folga];
    };
    // a caixa (unidades do mapa) em pixels do canvas, presa a ele
    const emPx = cx => { const px0 = limitar(Math.floor((cx[0] - x0) * k), 0, w), py0 = limitar(Math.floor((cx[1] - y0) * k), 0, hh), px1 = limitar(Math.ceil((cx[2] - x0) * k), 0, w), py1 = limitar(Math.ceil((cx[3] - y0) * k), 0, hh); return px1 > px0 && py1 > py0 ? [px0, py0, px1 - px0, py1 - py0] : null; };
    let algumTer = false;
    for (const { t, hs } of d.lista) {
      if (!hs.some(perto)) continue;
      limpar();
      const cx = encher(hs, comBorda ? macio * 1.6 : 0, comBorda ? macio : 0), r = cx && emPx(cx);
      if (!r) continue;
      algumTer = true;
      const [px, py, pw, ph] = r;
      tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'source-over'; tx.globalAlpha = 1; tx.imageSmoothingEnabled = true;
      tx.clearRect(px, py, pw, ph);
      tx.drawImage(mc, px * sm, py * sm, pw * sm, ph * sm, px, py, pw, ph);
      tx.globalCompositeOperation = 'source-in';
      tx.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
      tx.fillStyle = texturaHex(tx, t, k, comDesenhos);
      tx.fillRect(cx[0], cx[1], cx[2] - cx[0], cx[3] - cx[1]);
      tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'source-over';
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
      c.drawImage(tc, px, py, pw, ph, px, py, pw, ph);
      yield;
    }
    if (algumTer && comBorda) {
      limpar();
      encher(d.lista.flatMap(x => x.hs), 0, macio * 0.55);
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-in'; c.imageSmoothingEnabled = true;
      c.drawImage(mc, 0, 0, mw2, mh2, 0, 0, mw2 / sm, mh2 / sm);
      c.globalCompositeOperation = 'source-over';
      yield;
    }
    // o desenho de cada um (de longe, com os hexágonos miúdos na tela, fica só a textura)
    if (comDesenhos) {
      let n = 0;
      for (const { t, semT, hs } of d.lista) for (const p of hs) {
        if (!perto(p)) continue;
        c.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
        desenhoDoHex(c, d.m, p, p.x, p.y, d.u, t.tex || 'liso', t.cor, ((p.q * 73856093) ^ (p.r * 19349663) ^ semT) >>> 0);
        if (++n % 150 === 0) yield;
      }
    }
    c.globalAlpha = 1;
  }
  /* (lote 24) O hexágono no caminho: os cantos saem do centro já guardado (p.x, p.y) e de seis deslocamentos iguais para
     todos (feitos uma vez por grade), e o caminho volta ao primeiro canto com uma linha — sem o closePath, que num caminho
     de milhares de hexágonos deixava o navegador muito lento. */
  let cantosGrade = null, cantosChave = '';
  function deslocamentosHex(m) {
    const g = m.grade || {}, ch = g.tam + '|' + g.orient;
    if (ch !== cantosChave) {
      const s0 = (Number(g.tam) || 0) / Math.sqrt(3), a0 = g.orient === 'deitado' ? 0 : -30;
      cantosGrade = []; for (let i = 0; i < 6; i++) { const a = (a0 + 60 * i) * Math.PI / 180; cantosGrade.push([s0 * Math.cos(a), s0 * Math.sin(a)]); }
      cantosChave = ch;
    }
    return cantosGrade;
  }
  function hexNoCaminho(c, m, q, r, cx, cy) {
    if (cx == null) { const cs = N().cantosHex(m, q, r); c.moveTo(cs[0][0], cs[0][1]); for (let i = 1; i < cs.length; i++) c.lineTo(cs[i][0], cs[i][1]); c.lineTo(cs[0][0], cs[0][1]); return; }
    const d = deslocamentosHex(m);
    c.moveTo(cx + d[0][0], cy + d[0][1]);
    for (let i = 1; i < 6; i++) c.lineTo(cx + d[i][0], cy + d[i][1]);
    c.lineTo(cx + d[0][0], cy + d[0][1]);
  }
  /* A composição do terreno num hexágono (centro cx, cy; u = o raio de dentro dele). Tudo cabe num círculo de 0,8 u
     (a lavoura, que vai de borda a borda, fica presa ao hexágono). */
  function desenhoDoHex(c, m, hx, cx, cy, u, tex, cor, sem0) {
    let sem = sem0 % 2147483647 || 1;
    const rnd = () => (sem = (sem * 16807) % 2147483647) / 2147483647;
    const esc = misturar(cor, '#000000', 0.42), som = misturar(cor, '#000000', 0.2), cla = misturar(cor, '#ffffff', 0.35), lw = Math.max(u * 0.045, 0.5);
    const P = (dx, dy) => [cx + dx * u, cy + dy * u];
    const ponto = raio => { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * raio; return [Math.cos(a) * r, Math.sin(a) * r]; };
    // n lugares (em unidades de u) espalhados sem amontoar, de cima para baixo (o de baixo fica na frente)
    const espalhar = (n, raio) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        let melhor = null, dm = -1;
        for (let t = 0; t < 7; t++) { const p = ponto(raio); let d = Infinity; for (const q of out) d = Math.min(d, Math.hypot(p[0] - q[0], p[1] - q[1])); if (d > dm) { dm = d; melhor = p; } }
        out.push(melhor);
      }
      return out.sort((a, b) => a[1] - b[1]);
    };
    const tra = (cor0, larg, alfa) => { c.strokeStyle = cor0; c.lineWidth = larg; c.globalAlpha = alfa == null ? 0.92 : alfa; c.stroke(); };
    const enche = (cor0, alfa) => { c.fillStyle = cor0; c.globalAlpha = alfa == null ? 0.92 : alfa; c.fill(); };
    const circ = (x, y, r) => { c.beginPath(); c.arc(x, y, Math.max(r, 0.01), 0, Math.PI * 2); };
    const poli = (pts, fechar) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); if (fechar) c.closePath(); };
    const tufo = (x, y, s, cor0) => {           // capim: três folhas
      c.beginPath(); c.moveTo(x - s * 0.7, y); c.lineTo(x - s * 1.05, y - s * 1.15); c.moveTo(x, y); c.lineTo(x + s * 0.1, y - s * 1.6); c.moveTo(x + s * 0.7, y); c.lineTo(x + s * 1.1, y - s * 1.1);
      tra(cor0, lw);
    };
    // uma rachadura que se divide: brilho largo por baixo, o miolo fino por cima
    const rachadura = (x0, y0, passos, brilho, miolo, largB) => {
      const ramos = [[x0, y0, rnd() * Math.PI * 2, passos]];
      while (ramos.length) {
        let [x, y, a, n] = ramos.pop();
        const pts = [[x, y]];
        for (let i = 0; i < n; i++) {
          a += (rnd() - 0.5) * 1.1; x += Math.cos(a) * u * 0.16; y += Math.sin(a) * u * 0.16;
          if (Math.hypot(x - cx, y - cy) > u * 0.82) break;
          pts.push([x, y]);
          if (rnd() < 0.22 && ramos.length < 3) ramos.push([x, y, a + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.5), Math.max(1, n - i - 2)]);
        }
        if (pts.length < 2) continue;
        c.lineCap = 'round'; c.lineJoin = 'round';
        poli(pts); tra(brilho, lw * largB, 0.45);
        poli(pts); tra(miolo, lw * 0.9, 0.95);
      }
    };
    c.lineCap = 'round'; c.lineJoin = 'round';
    switch (tex) {
      case 'mato': {
        for (const [dx, dy] of espalhar(4 + Math.floor(rnd() * 3), 0.72)) tufo(cx + dx * u, cy + dy * u, u * (0.09 + rnd() * 0.05), esc);
        if (rnd() < 0.5) { const [dx, dy] = ponto(0.6); circ(cx + dx * u, cy + dy * u, u * 0.035); enche(misturar(cor, '#fff2a8', 0.7)); }
        break;
      }
      case 'arvores': {
        for (const [dx, dy] of espalhar(3 + Math.floor(rnd() * 3), 0.58)) {
          const [x, y] = P(dx, dy), r = u * (0.19 + rnd() * 0.08);
          c.beginPath(); c.moveTo(x, y + r * 0.5); c.lineTo(x, y + r * 1.3); tra(esc, lw * 1.2);
          if (rnd() < 0.35) {                    // um pinheiro
            poli([[x, y - r * 1.35], [x - r * 0.95, y + r * 0.75], [x + r * 0.95, y + r * 0.75]], true); enche(som); tra(esc, lw);
            poli([[x, y - r * 1.35], [x - r * 0.35, y - r * 0.2], [x + r * 0.05, y - r * 0.35]], true); enche(cla, 0.55);
          } else {
            circ(x, y, r); enche(som); tra(esc, lw);
            circ(x - r * 0.3, y - r * 0.32, r * 0.38); enche(cla, 0.7);
          }
        }
        break;
      }
      case 'colinas': {
        const n = 2 + (rnd() < 0.3 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const x = cx + ((i - (n - 1) / 2) * 0.5 + (rnd() - 0.5) * 0.15) * u, y = cy + (0.3 - (i % 2) * 0.32 + (rnd() - 0.5) * 0.1) * u;
          const w = u * (0.5 + rnd() * 0.18), hg = w * (0.5 + rnd() * 0.2);
          c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y - hg * 2, x + w, y); c.closePath(); enche(som, 0.75);
          c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y - hg * 2, x + w, y); tra(esc, lw);
          c.beginPath(); c.moveTo(x - w * 0.55, y - hg * 0.55); c.quadraticCurveTo(x - w * 0.3, y - hg * 0.9, x - w * 0.05, y - hg * 0.95); tra(cla, lw, 0.8);
        }
        break;
      }
      case 'montes': {
        const pico = (x, yb, H, W, neve) => {
          const sx = x + (rnd() - 0.5) * W * 0.3, sy = yb - H;
          poli([[x - W, yb], [sx - W * 0.35, sy + H * 0.45], [sx, sy], [sx + W * 0.4, sy + H * 0.5], [x + W, yb]], true); enche(som);
          poli([[sx, sy], [sx + W * 0.4, sy + H * 0.5], [x + W, yb], [sx + W * 0.08, yb], [sx + W * 0.12, sy + H * 0.55]], true); enche(esc, 0.55);
          if (neve) { poli([[sx, sy], [sx - W * 0.24, sy + H * 0.3], [sx - W * 0.08, sy + H * 0.24], [sx + W * 0.04, sy + H * 0.32], [sx + W * 0.22, sy + H * 0.26]], true); enche('#f3f5f7', 0.95); }
          poli([[x - W, yb], [sx - W * 0.35, sy + H * 0.45], [sx, sy], [sx + W * 0.4, sy + H * 0.5], [x + W, yb]]); tra(esc, lw * 1.1);
        };
        if (rnd() < 0.55) { const lado = rnd() < 0.5 ? -1 : 1; pico(cx + lado * u * 0.42, cy + u * 0.32, u * (0.5 + rnd() * 0.15), u * 0.36, rnd() < 0.4); }
        pico(cx + (rnd() - 0.5) * u * 0.2, cy + u * 0.5, u * (0.85 + rnd() * 0.2), u * (0.52 + rnd() * 0.12), rnd() < 0.65);
        break;
      }
      case 'juncos': {
        for (let i = 0; i < 2; i++) {
          const [dx, dy] = ponto(0.45), rx = u * (0.22 + rnd() * 0.14);
          c.beginPath(); c.ellipse(cx + dx * u, cy + dy * u, rx, rx * 0.42, 0, 0, Math.PI * 2); enche(misturar(cor, '#3b6d9c', 0.5), 0.7);
          c.beginPath(); c.ellipse(cx + dx * u, cy + dy * u, rx * 0.6, rx * 0.2, 0, Math.PI * 1.1, Math.PI * 1.9); tra(cla, lw * 0.8, 0.7);
        }
        for (const [dx, dy] of espalhar(3, 0.66)) {
          const [x, y] = P(dx, dy), s = u * (0.16 + rnd() * 0.06);
          for (let k = -1.5; k <= 1.5; k += 1) {
            const bx = x + k * s * 0.28, tx = bx + k * s * 0.22, ty = y - s * (1.3 + rnd() * 0.5);
            c.beginPath(); c.moveTo(bx, y); c.quadraticCurveTo(bx, y - s * 0.6, tx, ty); tra(esc, lw);
            if (Math.abs(k) < 1) { c.beginPath(); c.ellipse(tx, ty + s * 0.12, s * 0.08, s * 0.2, 0, 0, Math.PI * 2); enche('#6b4a2b'); }
          }
        }
        break;
      }
      case 'areia': {
        for (let i = 0; i < 2; i++) {
          const x = cx + (i ? 0.2 : -0.25) * u + (rnd() - 0.5) * 0.2 * u, y = cy + (i ? 0.3 : -0.12) * u, w = u * (0.38 + rnd() * 0.12);
          c.beginPath(); c.moveTo(x - w, y + w * 0.1); c.quadraticCurveTo(x - w * 0.15, y - w * 0.55, x + w * 0.7, y - w * 0.02); c.quadraticCurveTo(x, y + w * 0.12, x - w, y + w * 0.1); enche(cla, 0.7);
          c.beginPath(); c.moveTo(x - w, y + w * 0.1); c.quadraticCurveTo(x - w * 0.15, y - w * 0.55, x + w * 0.7, y - w * 0.02); tra(esc, lw);
        }
        for (let i = 0; i < 7; i++) { const [dx, dy] = ponto(0.75); circ(cx + dx * u, cy + dy * u, u * 0.022); enche(esc, 0.55); }
        break;
      }
      case 'neve': {
        for (let i = 0; i < 2; i++) {
          const [dx, dy] = ponto(0.4), w = u * (0.32 + rnd() * 0.12), x = cx + dx * u, y = cy + dy * u + u * 0.15;
          c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y - w * 0.8, x + w, y); c.closePath(); enche('#ffffff', 0.55);
          c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y - w * 0.8, x + w, y); tra(misturar(cor, '#5b7a96', 0.55), lw * 0.9, 0.8);
        }
        for (const [dx, dy] of espalhar(4, 0.72)) {
          const [x, y] = P(dx, dy), s = u * 0.07;
          c.beginPath(); for (let a = 0; a < 3; a++) { const an = a * Math.PI / 3; c.moveTo(x - Math.cos(an) * s, y - Math.sin(an) * s); c.lineTo(x + Math.cos(an) * s, y + Math.sin(an) * s); }
          tra(misturar('#9fb6c9', cor, 0.2), lw * 0.8);
        }
        break;
      }
      case 'ondas': {
        for (const [dx, dy] of espalhar(3 + Math.floor(rnd() * 2), 0.6)) {
          const [x, y] = P(dx, dy), w = u * (0.17 + rnd() * 0.06);
          c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w / 2, y - w * 0.5, x, y); c.quadraticCurveTo(x + w / 2, y + w * 0.5, x + w, y); tra(cla, lw * 1.25);
        }
        break;
      }
      case 'pedras': {
        for (const [dx, dy] of espalhar(3 + Math.floor(rnd() * 3), 0.66)) {
          const [x, y] = P(dx, dy), r = u * (0.08 + rnd() * 0.08), n = 6, pts = [];
          for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rnd() * 0.4, rr = r * (0.75 + rnd() * 0.4); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75]); }
          poli(pts, true); enche(som); tra(esc, lw);
          c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.35); c.lineTo(x + r * 0.2, y - r * 0.55); tra(cla, lw * 0.9, 0.8);
        }
        break;
      }
      case 'lavoura': {
        const ang = [0, Math.PI / 3, -Math.PI / 3][Math.floor(rnd() * 3)] + (rnd() - 0.5) * 0.12, sp = u * (0.24 + rnd() * 0.06);
        c.save();
        c.beginPath(); hexNoCaminho(c, m, hx.q, hx.r); c.clip();
        c.translate(cx, cy); c.rotate(ang);
        for (let i = -6; i <= 6; i++) {
          const y = i * sp;
          if (i % 2 === 0) { c.fillStyle = som; c.globalAlpha = 0.35; c.fillRect(-u * 1.3, y, u * 2.6, sp * 0.5); }
          c.beginPath(); c.moveTo(-u * 1.3, y); c.lineTo(u * 1.3, y); tra(esc, lw * 0.7, 0.75);
          for (let x = -u * 1.2 + (i % 2) * sp * 0.3; x < u * 1.2; x += sp * 0.6) { circ(x, y + sp * 0.25, u * 0.022); enche(esc, 0.6); }
        }
        c.restore();
        break;
      }
      case 'ruinas': {
        for (const [dx, dy] of espalhar(2, 0.42)) {
          const [x, y] = P(dx, dy + 0.25), w = u * 0.16, H = u * (0.34 + rnd() * 0.3);
          poli([[x - w / 2, y], [x - w / 2, y - H], [x - w / 6, y - H - u * 0.07], [x + w / 6, y - H + u * 0.03], [x + w / 2, y - H - u * 0.02], [x + w / 2, y]], true); enche(cla); tra(esc, lw);
          c.beginPath(); c.moveTo(x - w * 0.7, y); c.lineTo(x + w * 0.7, y); tra(esc, lw * 1.3);
        }
        // um muro caído: blocos em degrau
        const x0 = cx + (rnd() - 0.6) * u * 0.5, y0 = cy + u * (0.45 + rnd() * 0.1), b = u * 0.11;
        for (let i = 0; i < 4; i++) { const hh = b * (i === 1 ? 2 : i === 2 ? 1.5 : 1); c.beginPath(); c.rect(x0 + i * b * 1.05, y0 - hh, b, hh); enche(som); tra(esc, lw * 0.8); }
        for (let i = 0; i < 4; i++) { const [dx, dy] = ponto(0.7); circ(cx + dx * u, cy + dy * u, u * 0.03); enche(esc, 0.7); }
        break;
      }
      case 'lava': {
        for (let i = 0; i < 2; i++) { const [dx, dy] = ponto(0.5); c.beginPath(); c.ellipse(cx + dx * u, cy + dy * u, u * 0.26, u * 0.14, rnd() * 3, 0, Math.PI * 2); enche(misturar(cor, '#000000', 0.45), 0.5); }
        for (let i = 0; i < 2 + (rnd() < 0.5 ? 1 : 0); i++) { const [dx, dy] = ponto(0.45); rachadura(cx + dx * u, cy + dy * u, 4, '#ff7a1a', '#ffd166', 3.2); }
        for (let i = 0; i < 2; i++) { const [dx, dy] = ponto(0.6); circ(cx + dx * u, cy + dy * u, u * 0.055); enche('#ff8a2a', 0.75); tra('#ffd166', lw * 0.7, 0.9); }
        break;
      }
      case 'cristais': {
        for (const [dx, dy] of espalhar(2, 0.42)) {
          const bx = cx + dx * u, by = cy + (dy + 0.3) * u, n = 3;
          for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + (i - 1) * 0.55 + (rnd() - 0.5) * 0.3, L0 = u * (0.28 + rnd() * 0.24) * (i === 1 ? 1.25 : 1), wd = L0 * 0.3;
            const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, ox = bx + (i - 1) * u * 0.07;
            const b1 = [ox + px * wd / 2, by + py * wd / 2], b2 = [ox - px * wd / 2, by - py * wd / 2];
            const s1 = [b1[0] + ux * L0 * 0.75, b1[1] + uy * L0 * 0.75], s2 = [b2[0] + ux * L0 * 0.75, b2[1] + uy * L0 * 0.75], tp = [ox + ux * L0, by + uy * L0];
            poli([b1, s1, tp, s2, b2], true); enche(cla, 0.95); tra(esc, lw);
            c.beginPath(); c.moveTo(tp[0], tp[1]); c.lineTo(ox + ux * L0 * 0.1, by + uy * L0 * 0.1); tra(misturar(cor, '#ffffff', 0.7), lw * 0.7, 0.85);
          }
        }
        { const [dx, dy] = ponto(0.5), x = cx + dx * u, y = cy + dy * u, s = u * 0.08; c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); tra('#ffffff', lw * 0.8, 0.9); }
        break;
      }
      case 'selva': {
        const escura = misturar(cor, '#000000', 0.25);
        for (const [dx, dy] of espalhar(5 + Math.floor(rnd() * 3), 0.6)) {
          const [x, y] = P(dx, dy), r = u * (0.17 + rnd() * 0.08);
          circ(x - r * 0.45, y + r * 0.1, r * 0.75); enche(escura);
          circ(x + r * 0.45, y + r * 0.1, r * 0.75); enche(escura);
          circ(x, y - r * 0.3, r * 0.85); enche(som); tra(esc, lw * 0.9);
          circ(x - r * 0.25, y - r * 0.5, r * 0.3); enche(cla, 0.6);
        }
        if (rnd() < 0.6) {                        // uma palmeira
          const [dx, dy] = ponto(0.4), x = cx + dx * u, y = cy + dy * u + u * 0.3, H = u * 0.55, tx = x + u * 0.08, ty = y - H;
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + u * 0.12, y - H * 0.5, tx, ty); tra('#6b4a2b', lw * 1.4);
          for (let i = 0; i < 5; i++) { const a = -Math.PI + i * (Math.PI / 4) + (rnd() - 0.5) * 0.3; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + Math.cos(a) * u * 0.2, ty + Math.sin(a) * u * 0.2 - u * 0.08, tx + Math.cos(a) * u * 0.3, ty + Math.sin(a) * u * 0.3 + u * 0.06); tra(misturar(cor, '#1f4d26', 0.4), lw * 1.6); }
        }
        break;
      }
      case 'savana': {
        const capim = misturar(cor, '#6b4a1b', 0.45);
        for (const [dx, dy] of espalhar(4, 0.72)) tufo(cx + dx * u, cy + dy * u, u * (0.08 + rnd() * 0.04), capim);
        if (rnd() < 0.75) {                       // uma acácia de copa chata
          const [dx, dy] = ponto(0.3), x = cx + dx * u, y = cy + dy * u + u * 0.25;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - u * 0.28); c.moveTo(x, y - u * 0.18); c.lineTo(x - u * 0.16, y - u * 0.36); c.moveTo(x, y - u * 0.2); c.lineTo(x + u * 0.18, y - u * 0.38); tra('#5a3d22', lw * 1.2);
          c.beginPath(); c.ellipse(x, y - u * 0.42, u * 0.36, u * 0.1, 0, 0, Math.PI * 2); enche(misturar(cor, '#3f5f2a', 0.6)); tra(esc, lw * 0.9);
        } else { const [dx, dy] = ponto(0.4); circ(cx + dx * u, cy + dy * u, u * 0.12); enche(misturar(cor, '#3f5f2a', 0.55)); tra(esc, lw * 0.8); }
        break;
      }
      case 'tundra': {
        for (let i = 0; i < 2; i++) { const [dx, dy] = ponto(0.55); c.beginPath(); c.ellipse(cx + dx * u, cy + dy * u, u * (0.2 + rnd() * 0.1), u * 0.08, (rnd() - 0.5) * 0.4, 0, Math.PI * 2); enche('#ffffff', 0.65); }
        for (const [dx, dy] of espalhar(3 + Math.floor(rnd() * 2), 0.68)) {
          const [x, y] = P(dx, dy), r = u * 0.085, verde = misturar(cor, '#2f4a35', 0.6);
          circ(x - r, y, r); enche(verde); circ(x + r, y, r); enche(verde); circ(x, y - r * 0.8, r * 1.1); enche(verde); tra(esc, lw * 0.7, 0.7);
        }
        for (let i = 0; i < 3; i++) { const [dx, dy] = ponto(0.7); tufo(cx + dx * u, cy + dy * u, u * 0.05, esc); }
        break;
      }
      case 'corrompida': {
        for (let i = 0; i < 2 + (rnd() < 0.5 ? 1 : 0); i++) { const [dx, dy] = ponto(0.45); rachadura(cx + dx * u, cy + dy * u, 4, '#b25cff', '#241228', 3.4); }
        for (const [dx, dy] of espalhar(2 + Math.floor(rnd() * 2), 0.6)) {
          const [x, y] = P(dx, dy + 0.2), H = u * (0.3 + rnd() * 0.25), w = u * 0.07, lado = rnd() < 0.5 ? -1 : 1;
          c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x + lado * w * 0.8, y - H * 0.6, x + lado * w * 1.6, y - H); c.quadraticCurveTo(x + lado * w * 0.2, y - H * 0.5, x + w, y); c.closePath(); enche('#2a1f2e', 0.9);
        }
        for (let i = 0; i < 5; i++) { const [dx, dy] = ponto(0.75); circ(cx + dx * u, cy + dy * u, u * 0.028); enche('#d7a6ff', 0.85); }
        break;
      }
      // (lote 17) os oito novos
      case 'raso': {
        for (const [dx, dy] of espalhar(2 + Math.floor(rnd() * 2), 0.55)) { const [x, y] = P(dx, dy), r = u * (0.12 + rnd() * 0.06); c.beginPath(); c.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.9); tra(cla, lw * 1.1); c.beginPath(); c.arc(x, y, r * 1.7, Math.PI * 1.2, Math.PI * 1.8); tra(cla, lw, 0.6); }
        for (let i = 0; i < 4; i++) { const [dx, dy] = ponto(0.7); circ(cx + dx * u, cy + dy * u, u * (0.025 + rnd() * 0.02)); enche(esc, 0.4); }
        break;
      }
      case 'fundo': {
        for (const [dx, dy] of espalhar(3 + Math.floor(rnd() * 2), 0.6)) {
          const [x, y] = P(dx, dy), w = u * (0.2 + rnd() * 0.06);
          c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w / 2, y - w * 0.6, x, y); c.quadraticCurveTo(x + w / 2, y + w * 0.6, x + w, y); tra(misturar(cor, '#ffffff', 0.25), lw * 1.3);
          c.beginPath(); c.moveTo(x - w * 0.6, y + w * 0.45); c.quadraticCurveTo(x - w * 0.3, y + w * 0.15, x, y + w * 0.45); tra(esc, lw * 0.9, 0.7);
        }
        break;
      }
      case 'desfiladeiro': {
        const a0 = rnd() * Math.PI, pts = [];
        for (let i = 0; i <= 5; i++) { const t = i / 5 - 0.5, desvio = (rnd() - 0.5) * 0.25; pts.push([cx + Math.cos(a0) * t * 1.5 * u - Math.sin(a0) * desvio * u, cy + Math.sin(a0) * t * 1.5 * u + Math.cos(a0) * desvio * u]); }
        c.save(); c.beginPath(); hexNoCaminho(c, m, hx.q, hx.r); c.clip();
        poli(pts); tra(misturar(cor, '#000000', 0.55), u * 0.16, 0.85);
        poli(pts.map(p => [p[0] - u * 0.06, p[1] - u * 0.06])); tra(cla, lw, 0.8);
        c.restore();
        for (const [dx, dy] of espalhar(2, 0.6)) { const [x, y] = P(dx, dy); poli([[x - u * 0.12, y + u * 0.08], [x, y - u * 0.14], [x + u * 0.12, y + u * 0.08]], true); enche(som, 0.8); tra(esc, lw); }
        break;
      }
      case 'geleira': {
        for (const [dx, dy] of espalhar(2 + Math.floor(rnd() * 2), 0.5)) {
          const [x, y] = P(dx, dy), r = u * (0.18 + rnd() * 0.08);
          poli([[x - r, y + r * 0.4], [x - r * 0.2, y - r * 0.7], [x + r, y - r * 0.2], [x + r * 0.3, y + r * 0.7]], true); enche('#ffffff', 0.55); tra(misturar('#5f8fb0', cor, 0.15), lw);
          c.beginPath(); c.moveTo(x - r * 0.2, y - r * 0.7); c.lineTo(x, y + r * 0.1); tra(misturar('#5f8fb0', cor, 0.15), lw * 0.8, 0.8);
        }
        break;
      }
      case 'morta': {
        for (const [dx, dy] of espalhar(2 + Math.floor(rnd() * 2), 0.5)) {
          const [x, y] = P(dx, dy), H = u * (0.46 + rnd() * 0.14);
          c.beginPath(); c.moveTo(x, y + H * 0.5); c.lineTo(x, y - H * 0.5);
          c.moveTo(x, y); c.lineTo(x - H * 0.35, y - H * 0.35); c.moveTo(x, y + H * 0.1); c.lineTo(x + H * 0.32, y - H * 0.25);
          c.moveTo(x - H * 0.2, y - H * 0.2); c.lineTo(x - H * 0.28, y - H * 0.5); c.moveTo(x + H * 0.18, y - H * 0.13); c.lineTo(x + H * 0.34, y - H * 0.45);
          tra(misturar(cor, '#000000', 0.6), lw * 1.6);
        }
        break;
      }
      case 'oasis': {
        c.beginPath(); c.ellipse(cx, cy + u * 0.15, u * 0.38, u * 0.16, 0, 0, Math.PI * 2); enche('#4f9fd0', 0.85); tra(misturar('#4f9fd0', '#000000', 0.35), lw);
        for (const lado of [-1, 1]) {
          const x = cx + lado * u * 0.32, y = cy - u * 0.05, H = u * 0.38;
          c.beginPath(); c.moveTo(x, y + H * 0.35); c.quadraticCurveTo(x + lado * H * 0.1, y - H * 0.2, x - lado * H * 0.05, y - H * 0.6); tra(misturar(cor, '#3a2a10', 0.55), lw * 1.4);
          for (const a of [-2.6, -1.9, -1.2, -0.5]) { c.beginPath(); c.moveTo(x - lado * H * 0.05, y - H * 0.6); c.quadraticCurveTo(x - lado * H * 0.05 + Math.cos(a) * H * 0.3, y - H * 0.6 + Math.sin(a) * H * 0.3 - H * 0.08, x - lado * H * 0.05 + Math.cos(a) * H * 0.45, y - H * 0.6 + Math.sin(a) * H * 0.45 + H * 0.12); tra(misturar(cor, '#1d4a22', 0.6), lw * 1.2); }
        }
        break;
      }
      case 'charneca': {
        for (const [dx, dy] of espalhar(5 + Math.floor(rnd() * 3), 0.72)) {
          const x = cx + dx * u, y = cy + dy * u, sz = u * (0.08 + rnd() * 0.04);
          tufo(x, y, sz, misturar(cor, '#3a2a3a', 0.45));
          circ(x - sz * 0.6, y - sz * 1.1, sz * 0.32); enche('#c08cbb', 0.95); circ(x + sz * 0.6, y - sz * 1.05, sz * 0.3); enche('#c08cbb', 0.95);
        }
        break;
      }
      case 'devastada': {
        for (let i = 0; i < 2 + (rnd() < 0.5 ? 1 : 0); i++) { const [dx, dy] = ponto(0.45); rachadura(cx + dx * u, cy + dy * u, 4, '#6b4a33', '#1f1712', 2.4); }
        for (let i = 0; i < 3; i++) { const [dx, dy] = ponto(0.6); const x = cx + dx * u, y = cy + dy * u; c.beginPath(); c.ellipse(x, y, u * 0.09, u * 0.05, 0, 0, Math.PI * 2); enche('#2a211b', 0.6); }
        for (let i = 0; i < 4; i++) { const [dx, dy] = ponto(0.7); circ(cx + dx * u, cy + dy * u, u * 0.024); enche('#ef8a3a', 0.85); }
        break;
      }
      default: break;                            // liso: só a cor
    }
    c.globalAlpha = 1;
  }

  /* (lote 8, parte 6) Os hexágonos destruídos (cinza de cinzas, com rachaduras) e corrompidos (roxo escuro, com veios
     que brilham), na camada Guerra. Os riscos saem da chave do hexágono: o desenho não pula ao repintar. */
  let hexgChave = '';
  function desenharHexGuerra(m) {
    const hs = m.guerra && m.guerra.hexes ? m.guerra.hexes : {}, ks = Object.keys(hs), vis = camVisivel('guerra');
    const chave = vis && temGrade(m) ? JSON.stringify(m.grade) + JSON.stringify(hs) : '';
    if (chave === hexgChave) return;
    hexgChave = chave;
    C.hexg.replaceChildren();
    if (!chave || !ks.length) return;
    const tam = m.grade.tam;
    for (const k of ks) {
      let h0, cs;
      try { h0 = N().lerChaveHex(k); cs = h0 ? N().cantosHex(m, h0.q, h0.r) : null; } catch (e) { cs = null; }
      if (!cs || cs.length < 6) continue;
      const est = hs[k], c = N().centroHex(m, h0.q, h0.r), rnd = sorteadorDe(k + est), gk = s('g', { class: 'hexg hexg-' + est, 'data-hex': k });
      gk.append(s('polygon', { class: 'hexg-fundo', points: cs.map(q => um(q.x != null ? q.x : q[0]) + ',' + um(q.y != null ? q.y : q[1])).join(' ') }));
      // as rachaduras (ou os veios): do meio para fora, quebrando um pouco
      for (let i = 0; i < 5; i++) {
        const a0 = rnd() * Math.PI * 2, pts = [[c.x, c.y]];
        let x = c.x, y = c.y, a = a0;
        for (let j = 0; j < 3; j++) { a += (rnd() - 0.5) * 1.1; const d = tam * (0.12 + rnd() * 0.1); x += Math.cos(a) * d; y += Math.sin(a) * d; pts.push([x, y]); }
        gk.append(s('path', { class: 'hexg-risco', d: 'M' + pts.map(q => um(q[0]) + ' ' + um(q[1])).join(' L'), 'stroke-width': um(tam * (est === 'c' ? 0.035 : 0.028)) }));
      }
      if (est === 'c') for (let i = 0; i < 4; i++) { const a = rnd() * Math.PI * 2, d = rnd() * tam * 0.3; gk.append(s('circle', { class: 'hexg-brilho', cx: um(c.x + Math.cos(a) * d), cy: um(c.y + Math.sin(a) * d), r: um(tam * (0.025 + rnd() * 0.03)) })); }
      C.hexg.append(gk);
    }
  }

  /* objetos: cada um vira um <g data-id>; a chave diz quando precisa reconstruir */
  // (lote 8) a bandeira de uma facção entra na chave: o clã que muda o brasão (ou deixa a facção) redesenha o que a mostra
  const chaveBr = (ctx, id) => { if (!id) return ''; const br = brasaoDaFac(ctx, id); return br ? '|' + JSON.stringify(br) + nomeFac(ctx, id) : ''; };
  function chaveDe(o, ctx) {
    let extra = (ctx.mestre ? 'M' : 'J') + ctx.fb;
    if (o.mis && o.mis.ref && ctx.mestre) extra += '|mis' + JSON.stringify(App.missaoDaFicha ? App.missaoDaFicha(o.mis.ref) : null);
    if (o.k === 'r') { const fid = facEfetiva(ctx.m, o), f = fid && ctx.fac.get(fid); extra += (f ? f.cor : '') + '|' + (o.pai || '') + '|' + JSON.stringify(filhasDe(ctx.m, o)) + chaveBr(ctx, fid) + '|' + JSON.stringify(modoDe(ctx, o)) + (o.ocup ? '|oc' + corOcup(ctx, o) : ''); }
    else if (o.k === 'g') extra += '|' + JSON.stringify(bolinhasDe(ctx, o)) + chaveBr(ctx, o.fac) + (o.desc && ctx.mestre && N().descansandoAgora && N().descansandoAgora(ctx.m, o) ? '|zz' : '');
    else if (o.k === 'f') { const a = o.a && ctx.fac.get(o.a), b = o.b && ctx.fac.get(o.b); extra += (a ? a.cor : '') + '/' + (b ? b.cor : '') + '|' + faseNoDia(o, ctx.dia) + chaveBr(ctx, o.a) + chaveBr(ctx, o.b); }
    else if (o.k === 't') extra += '|' + andadoDe(ctx.m, o) + '|mar' + trechosDeMar(ctx, o.pts).join(',');
    else if (o.k === 'a') { const f = o.fac && ctx.fac.get(o.fac); extra += (f ? f.cor : ''); }
    else if (o.k === 'e') extra += '|' + eventoAtivo(o, ctx.dia) + '|' + raioNoDia(o, ctx.dia);
    else if (o.k === 'c' && !(o.px > 0)) extra += '|rc' + ctx.refCar;
    else if (o.k === 'z') { const a = o.a && ctx.fac.get(o.a), b = o.b && ctx.fac.get(o.b); extra += (a ? a.cor : '') + '/' + (b ? b.cor : '') + '|' + zonaAtiva(o, ctx.dia) + '|' + faseNoDia(o, ctx.dia) + chaveBr(ctx, o.a) + chaveBr(ctx, o.b); }
    return JSON.stringify(o) + extra;
  }
  let avisouErro = false;
  function desenharObjetos(m, ctx) {
    const vistos = new Set(), por = { lin: [], car: [], reg: [], zon: [], nreg: [], txt: [], fre: [], rot: [], set: [], eve: [], mar: [], gru: [] }, Cm = Cam();
    for (const o of m.objs || []) {
      const cam = CAMADA[o.k];
      if (!cam || !o.id) continue;
      const camada = Cm ? Cm.deObj(o) : null;
      if (camada && !Cm.visivel(camada)) continue;              // (lote 8) camada escondida neste aparelho: nem se desenha
      let r = recs.get(o.id), chave;
      try {
        chave = chaveDe(o, ctx);
        if (!r || r.chave !== chave) {
          const el = construir(o, ctx);
          if (r) { r.el.remove(); if (r.el2) r.el2.remove(); }
          r = { el, el2: el.__ico || null, cam2: el.__cam2 || 'mar', chave };      // el2: o selo do evento (na camada dos ícones) ou o nome da região (nreg)
          recs.set(o.id, r);
        }
      } catch (e) {
        if (!avisouErro) { avisouErro = true; console.error('Mapa-múndi: não deu para desenhar um objeto.', o, e); }
        continue;
      }
      vistos.add(o.id);
      // (lote 8) camada travada: à vista, mas o clique passa (o CSS tira o ponteiro de tudo o que está dentro)
      const trav = !!(camada && Cm.travada(camada));
      if (r.trav !== trav) { r.trav = trav; r.el.classList.toggle('trava', trav); if (r.el2) r.el2.classList.toggle('trava', trav); }
      por[cam].push(r.el);
      if (r.el2) por[r.cam2].push(r.el2);
    }
    for (const [id, r] of recs) if (!vistos.has(id)) { r.el.remove(); if (r.el2) r.el2.remove(); recs.delete(id); }
    // (lote 6) a região de dentro (o Condado) fica por cima da de fora (o Reino), na área e no nome
    if (m.objs && m.objs.some(o => o.k === 'r' && o.pai)) {
      const nivel = new Map(), fundo = o => { let n = 0, p = o; while (p && p.pai && n < 12) { p = (m.objs || []).find(x => x.id === p.pai); n++; } return n; };
      for (const o of m.objs) if (o.k === 'r') nivel.set(o.id, fundo(o));
      const porNivel = lista => lista.map((el, i) => [el, nivel.get(el.getAttribute('data-id')) || 0, i]).sort((a, b) => (a[1] - b[1]) || (a[2] - b[2])).map(x => x[0]);
      por.reg = porNivel(por.reg); por.nreg = porNivel(por.nreg);
    }
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
      case 'm': marcador(g0, o, ctx); break;
      case 'g': grupo(g0, o, ctx); break;
      case 'z': zona(g0, o, ctx); break;
      case 'l': linhaGeo(g0, o); break;
      case 'c': carimbo(g0, o, ctx); break;
      case 'x': textoLivre(g0, o); break;
      case 'a': seta(g0, o, ctx); break;
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
  /* (lote 8) A bandeira do clã ligado a uma facção — ou, sem clã, a bandeira própria dela (lote 10) —: o brasão
     (desenhado pelo núcleo do Clã, ou a imagem, quando é do banco), com largura w, centrado em (x, y), num grupo de
     tamanho fixo na tela. null: a facção não tem bandeira. */
  let seqBandeira = 0;
  function brasaoDaFac(ctx, id) {
    if (!id) return null;
    const f = ctx && ctx.fac ? ctx.fac.get(id) : null;
    return (f && f.br) || (App && typeof App.brasaoDe === 'function' ? App.brasaoDe(id) : null);
  }
  /* (lote 9) O tamanho das bandeiras, neste aparelho (a aba Facções): pequenas (as de antes), médias (de começo) ou
     grandes — para quem enxerga melhor maiores. */
  const ESC_BAND = { p: 1, m: 1.4, g: 1.9 };
  function escalaBandeira() {
    try { const v = JSON.parse(localStorage.getItem('tinycats:mundo:painel') || 'null'); return ESC_BAND[v && v.band] || ESC_BAND.m; } catch (e) { return ESC_BAND.m; }
  }
  /* (lote 9) A missão como ela aparece: o nome, a situação (para o mestre, a da missão ligada nas Fichas; na projeção, a
     que veio pronta) e se só o mestre a vê. → { t, e, so, perdida } ou null */
  function missaoNaTela(o, ctx) {
    const mi = o && o.mis;
    if (!mi) return null;
    if (mi.ref && ctx.mestre) {
      const f = App.missaoDaFicha ? App.missaoDaFicha(mi.ref) : null;
      if (!f) return { t: mi.t || 'Missão que saiu das Fichas', e: 'ativa', so: true, perdida: true };
      return { t: f.t || mi.t || 'Missão', e: f.e, so: !mi.ver || !!f.oculta };
    }
    const e = mi.e === 'feita' || mi.e === 'falhou' ? mi.e : mi.ok ? 'feita' : 'ativa';
    return { t: mi.t || 'Missão', e, so: !!ctx.mestre && !mi.ver };
  }
  // a marca no ícone: "!" (ativa), ✓ (concluída) ou ✕ (falhou); a que só o mestre vê, tracejada. O nome vai na dica.
  function marcaMissao(o, ctx, x, y) {
    const mi = missaoNaTela(o, ctx);
    if (!mi) return null;
    const g = s('g', { class: 'missao m-' + mi.e + (mi.so ? ' so-mestre' : '') + (mi.perdida ? ' perdida' : ''), transform: 'translate(' + d3(x) + ' ' + d3(y) + ') scale(1.15)' });
    g.append(s('title', { texto: 'Missão: ' + mi.t + (mi.e === 'feita' ? ' (concluída)' : mi.e === 'falhou' ? ' (falhou)' : '') + (mi.so ? ' · só você vê' : '') }));
    g.append(s('circle', { class: 'mis-bola', r: 8.5 }));
    if (mi.e === 'feita') g.append(s('path', { class: 'mis-sinal', d: 'M-3.8 0.2l2.6 2.6 5-5.2' }));
    else if (mi.e === 'falhou') g.append(s('path', { class: 'mis-sinal', d: 'M-3 -3l6 6M3 -3l-6 6' }));
    else g.append(s('path', { class: 'mis-sinal', d: 'M0 -4.6v4.4' }), s('circle', { class: 'mis-ponto', cy: 3.7, r: 1.4 }));
    return g;
  }
  function bandeira(br, x, y, w, dica) {
    if (!br) return null;
    const hgt = w * 1.2, g = s('g', { class: 'bandeira', transform: 'translate(' + d3(x - w / 2) + ' ' + d3(y - hgt / 2) + ')' });
    if (dica) g.append(s('title', { texto: dica }));
    if (br.img && /^https:\/\//.test(br.img)) {
      g.append(s('image', { href: br.img, width: d3(w), height: d3(hgt), preserveAspectRatio: 'xMidYMid meet' }));
      return g;
    }
    const C = window.ClaNucleo;
    if (!C || typeof C.brasaoSvg !== 'function') return null;
    let markup = '';
    try { markup = C.brasaoSvg(br, 'mb' + (++seqBandeira)); } catch (e) { return null; }
    const tmp = s('g');
    tmp.innerHTML = markup;                                   // o desenho do núcleo do Clã: só números e cores conferidos lá
    const el = tmp.firstElementChild;
    if (!el) return null;
    el.setAttribute('width', d3(w)); el.setAttribute('height', d3(hgt));
    g.append(el);
    return g;
  }
  const nomeFac = (ctx, id) => { const f = id && ctx && ctx.fac ? ctx.fac.get(id) : null; return f ? f.nome || 'Facção' : ''; };
  function regiao(g0, o, ctx) {
    if (!Array.isArray(o.pts) || o.pts.length < 3) return;
    g0.classList.add('regiao');
    const fid = facEfetiva(ctx.m, o), f = fid ? ctx.fac.get(fid) : null, md = modoDe(ctx, o);
    // (lote 10) o modo do mapa deste aparelho pinta a região (Clima, Perigo) ou tira o preenchimento (Terreno)
    const cor = md && md.cor ? md.cor : o.pai && o.cor ? o.cor : f ? f.cor : (o.cor || '');
    g0.append(s('path', { class: 'reg' + (cor ? '' : ' semfac') + (o.pai ? ' subreg' : '') + (md ? ' m-' + md.modo + (md.zero ? ' m-zero' : '') : ''), d: caminho(o.pts, true), fill: cor || null, stroke: cor || null }));
    // (lote 12, parte 12b) a ocupada: listras na cor de quem ocupa (cinza, se os jogadores não sabem quem), por cima da
    // cor da dona — só no modo Político (os outros modos pintam a região do jeito deles)
    if (o.ocup && !md) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const p of o.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      const W = um(limitar(Math.hypot(x1 - x0, y1 - y0) / 22, 3, 500)), pid = idSvg('oc-', o.id);
      g0.append(s('defs', null, s('pattern', { id: pid, patternUnits: 'userSpaceOnUse', width: W, height: W, patternTransform: 'rotate(45)' }, s('rect', { width: um(W * 0.36), height: W, fill: corOcup(ctx, o) }))),
        s('path', { class: 'reg-ocup', 'data-ocup': o.ocup.fac || '', d: caminho(o.pts, true), fill: `url(#${pid})` }));
    }
    // o nome vai na camada de cima (nreg): a área fica por baixo das estradas e dos carimbos, mas o nome não some sob eles
    if (o.nome) {
      const c = pontoDoNomeLivre(o.pts, filhasDe(ctx.m, o)), fx = fixo(c[0], c[1]), g1 = s('g', { class: g0.getAttribute('class'), 'data-id': o.id });
      // (lote 8) a bandeira do clã da facção, em cima do nome (a da região de dentro só quando a facção é outra)
      const bw = 15 * ctx.fb, by = -7 - 0.6 * bw;                    // (lote 9: o tamanho deste aparelho; a base fica no lugar)
      const bf = !o.pai || (o.fac && o.fac === fid) ? bandeira(brasaoDaFac(ctx, fid), 0, by, bw, 'Bandeira de ' + nomeFac(ctx, fid)) : null;
      if (bf) fx.append(bf);
      { const mk = marcaMissao(o, ctx, bf ? bw / 2 + 11 : 0, bf ? by : -15); if (mk) fx.append(mk); }       // (lote 9) a missão
      fx.append(rotulo(String(o.nome).toLocaleUpperCase('pt-BR'), 4, 'rotulo rotulo-reg' + (o.pai ? ' rotulo-subreg' : '')));
      g1.append(fx);
      g0.__ico = g1; g0.__cam2 = 'nreg';
    } else if (o.mis) {
      // (lote 9) a região sem nome: a marca da missão no ponto onde o nome iria
      const mk = marcaMissao(o, ctx, 0, 0);
      if (mk) { const c = pontoDoNomeLivre(o.pts, filhasDe(ctx.m, o)), fx = fixo(c[0], c[1]), g1 = s('g', { class: g0.getAttribute('class'), 'data-id': o.id }); fx.append(mk); g1.append(fx); g0.__ico = g1; g0.__cam2 = 'nreg'; }
    }
  }
  function corFac(ctx, id) { const f = id ? ctx.fac.get(id) : null; return f ? f.cor : '#9aa3b5'; }
  // (lote 12, parte 12b) a cor das listras da ocupada: a de quem ocupa; sem a facção (os jogadores não a conhecem), cinza
  const corOcup = (ctx, o) => (o.ocup && o.ocup.fac ? corFac(ctx, o.ocup.fac) : '#6b7385');
  // (lote 10) como a região se pinta no modo do mapa deste aparelho: null (o Político) ou { modo, cor }
  function modoDe(ctx, o) { const C = Cam(); try { return C && typeof C.modoDaRegiao === 'function' ? C.modoDaRegiao(ctx.m, o, !!ctx.mestre) : null; } catch (e) { return null; } }
  // as áreas das regiões que ficam dentro desta (para o nome dela não cair em cima delas)
  const filhasDe = (m, o) => ((m && m.objs) || []).filter(x => x.k === 'r' && x.pai === o.id && Array.isArray(x.pts) && x.pts.length >= 3).map(x => x.pts);
  // a facção que vale para a região: a dela, ou a da região de fora (núcleo antigo: a dela)
  function facEfetiva(m, o) { try { return N().facDaRegiao ? N().facDaRegiao(m, o) : o.fac; } catch (e) { return o.fac; } }
  function frente(g0, o, ctx) {
    const pts = formaDe(o, ctx.dia);                         // (lote 8, parte 6) a linha de hoje (as fases)
    if (!Array.isArray(pts) || pts.length < 2) return;
    g0.classList.add('fre');
    const d = caminho(pts), anda = o.ativa !== false ? ' frente-anda' : '';
    g0.append(
      s('path', { class: 'fre-a' + anda, d, stroke: corFac(ctx, o.a) }),
      s('path', { class: 'fre-b' + anda, d, stroke: corFac(ctx, o.b) }),
      s('path', { class: 'fre-hit', d }));
    // (lote 8) as bandeiras dos dois lados, no meio da linha (em cima do nome)
    const fw = 13 * ctx.fb, fdx = fw / 2 + 4.5, fy = -20.2 - 0.6 * fw;     // (lote 9: o tamanho deste aparelho)
    const ba = bandeira(brasaoDaFac(ctx, o.a), -fdx, fy, fw, nomeFac(ctx, o.a)), bb = bandeira(brasaoDaFac(ctx, o.b), fdx, fy, fw, nomeFac(ctx, o.b));
    if (o.nome || ba || bb) { const c = meioDe(pts), fx = fixo(c[0], c[1]); if (ba) fx.append(ba); if (bb) fx.append(bb); if (o.nome) fx.append(rotulo(o.nome, -10, 'rotulo rotulo-linha')); g0.append(fx); }
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
    if (o.esc) { g0.classList.add('rota-esc'); return; }   // (lote 7, parte 5b) escondida: aparece fina ao selecionar
    const d = caminho(o.pts), via = /^[a-z]+$/.test(o.via || '') ? ' via-' + o.via : '';
    g0.append(s('path', { class: 'rot-fundo', d }), s('path', { class: 'rot' + via, d }));
    const andou = andadoDe(ctx.m, o);
    if (andou > 0) g0.append(s('path', { class: 'rot-andado' + via, d: caminho(trecho(o.pts, andou)) }));
    // (lote 17) a travessia por mar (de um porto a outro ligado a ele): a linha azul das ondas por cima
    for (const i of trechosDeMar(ctx, o.pts)) g0.append(s('path', { class: 'rot-mar', d: caminho([o.pts[i], o.pts[i + 1]]) }));
    g0.append(s('path', { class: 'rot-hit', d }));
    if (o.nome) { const c = meioDe(o.pts), fx = fixo(c[0], c[1]); fx.append(rotulo(o.nome, -10, 'rotulo rotulo-linha')); g0.append(fx); }
  }
  /* (lote 7, parte 5a) O desenho de cada evento novo dentro da área dele (em unidades do mapa: acompanha o zoom), com a
     animação leve (devagar; em pausa enquanto se mexe no mapa; parada com "Animar os eventos" desligado neste aparelho,
     com muitas na tela, num evento fora da data e para quem pediu menos movimento). Os sorteios saem do id do evento: o
     desenho não pula ao repintar. */
  function sorteadorDe(txt) { let h = 2166136261; for (const ch of String(txt || 'e')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
  function arteEvento(g0, o, cor, r) {
    const T = o.tipo, cx = o.x, cy = o.y, rnd = sorteadorDe(o.id + T), P = (a, d) => [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
    const dentro = f => { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * (f || 0.8); return P(a, d); };
    const atraso = i => `animation-delay:${(i * 0.55 + rnd() * 0.4).toFixed(2)}s`;
    const add = el => { el.classList.add('eve-arte'); g0.append(el); return el; };
    const linhaS = (pts, at) => s('polyline', Object.assign({ points: pts.map(p => um(p[0]) + ',' + um(p[1])).join(' '), fill: 'none', 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, at));
    const estrela = (x, y, t, at) => s('path', Object.assign({ d: `M${um(x)} ${um(y - t)}L${um(x + t * 0.25)} ${um(y - t * 0.25)}L${um(x + t)} ${um(y)}L${um(x + t * 0.25)} ${um(y + t * 0.25)}L${um(x)} ${um(y + t)}L${um(x - t * 0.25)} ${um(y + t * 0.25)}L${um(x - t)} ${um(y)}L${um(x - t * 0.25)} ${um(y - t * 0.25)}Z` }, at));
    const grad = (id, c, a) => s('defs', null, s('radialGradient', { id }, s('stop', { offset: '0%', 'stop-color': c, 'stop-opacity': a }), s('stop', { offset: '100%', 'stop-color': c, 'stop-opacity': 0 })));
    switch (T) {
      case 'meteoros':
        for (let i = 0; i < 6; i++) { const [x, y] = dentro(0.75), L = r * 0.4; add(linhaS([[x - L * 0.5, y - L * 0.5], [x + L * 0.5, y + L * 0.5]], { class: 'eve-anim eve-risca', stroke: '#ffd59a', 'stroke-width': 2.5, pathLength: 100, style: atraso(i) })); }
        for (let i = 0; i < 3; i++) { const [x, y] = dentro(0.6); add(s('circle', { cx: um(x), cy: um(y), r: um(r * 0.04), fill: '#3a2a1e', 'fill-opacity': 0.45 })); }
        break;
      case 'tribulacao':
        for (let i = 0; i < 3; i++) { const [x, y] = dentro(0.6), L = r * 0.32; add(linhaS([[x, y - L], [x - L * 0.25, y - L * 0.1], [x + L * 0.15, y], [x - L * 0.1, y + L]], { class: 'eve-anim eve-raio', stroke: '#fff3a0', 'stroke-width': 3, style: `animation-delay:${(i * 1.3).toFixed(1)}s` })); }
        break;
      case 'eclipse': {
        const id = idSvg('eg-', o.id);
        add(grad(id, '#0b0a14', 0.75));
        add(s('circle', { cx: um(cx), cy: um(cy), r: um(r), fill: `url(#${id})` }));
        add(s('circle', { class: 'eve-anim eve-respira', cx: um(cx), cy: um(cy), r: um(r * 0.32), fill: '#0b0a14', stroke: '#f6e7a0', 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke' }));
        break;
      }
      case 'luaSangue': {
        const id = idSvg('ls-', o.id), R = r * 0.34;
        add(grad(id, '#b3261e', 0.45));
        add(s('circle', { cx: um(cx), cy: um(cy), r: um(r), fill: `url(#${id})` }));
        add(s('path', { class: 'eve-anim eve-respira', d: `M${um(cx + R * 0.3)} ${um(cy - R)}A${um(R)} ${um(R)} 0 1 0 ${um(cx + R * 0.95)} ${um(cy + R * 0.55)}A${um(R * 0.8)} ${um(R * 0.8)} 0 0 1 ${um(cx + R * 0.3)} ${um(cy - R)}Z`, fill: '#c0392b', 'fill-opacity': 0.55 }));
        break;
      }
      case 'inverno':
        for (let i = 0; i < 14; i++) { const [x, y] = dentro(0.75); add(s('circle', { class: 'eve-anim eve-neva', cx: um(x), cy: um(y - r * 0.2), r: um(r * 0.025), fill: '#ffffff', style: atraso(i) })); }
        break;
      case 'seca':
        for (let i = 0; i < 6; i++) { const [x, y] = dentro(0.7), pts = [[x, y]]; let a = rnd() * Math.PI * 2; for (let k = 0; k < 3; k++) { a += (rnd() - 0.5) * 1.4; const p = pts[pts.length - 1]; pts.push([p[0] + Math.cos(a) * r * 0.12, p[1] + Math.sin(a) * r * 0.12]); } add(linhaS(pts, { stroke: '#6b4e24', 'stroke-opacity': 0.55, 'stroke-width': 2 })); }
        break;
      case 'terremoto':
        for (let i = 0; i < 3; i++) { let a = rnd() * Math.PI * 2; const pts = [[cx, cy]]; for (let k = 1; k <= 4; k++) { a += (rnd() - 0.5) * 0.9; pts.push(P(a, r * 0.2 * k)); } add(linhaS(pts, { stroke: '#3a2a1a', 'stroke-opacity': 0.6, 'stroke-width': 3 })); }
        break;
      case 'erupcao':
        for (let i = 0; i < 5; i++) { const [x, y] = dentro(0.25); add(s('circle', { class: 'eve-anim eve-sobe', cx: um(x), cy: um(y), r: um(r * 0.09), fill: '#5c534c', style: atraso(i) })); }
        break;
      case 'assombracao':
        for (let i = 0; i < 4; i++) { const [x, y] = dentro(0.6); add(s('ellipse', { class: 'eve-anim eve-flutua', cx: um(x), cy: um(y), rx: um(r * 0.12), ry: um(r * 0.2), fill: '#e3ecff', style: atraso(i) })); }
        break;
      case 'reino':
        add(s('circle', { class: 'eve-anim eve-gira', cx: um(cx), cy: um(cy), r: um(r * 0.55), fill: 'none', stroke: cor, 'stroke-width': 2.5, 'stroke-dasharray': '10 8', 'vector-effect': 'non-scaling-stroke' }));
        for (let i = 0; i < 5; i++) { const [x, y] = dentro(0.7); add(estrela(x, y, r * 0.07, { class: 'eve-anim eve-brilha', fill: '#f3ecff', style: atraso(i) })); }
        break;
      case 'seita': {
        const gg = add(s('g', { class: 'eve-anim eve-gira' }));
        gg.append(s('circle', { cx: um(cx), cy: um(cy), r: um(r * 0.6), fill: 'none', stroke: cor, 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke' }));
        for (let i = 0; i < 8; i++) { const [x, y] = P((i / 8) * Math.PI * 2, r * 0.6); gg.append(linhaS([[x - r * 0.04, y - r * 0.05], [x + r * 0.04, y + r * 0.05]], { stroke: cor, 'stroke-width': 2.5 })); }
        break;
      }
      case 'bandidos':
        add(s('circle', { class: 'eve-anim eve-gira', cx: um(cx), cy: um(cy), r: um(r * 0.82), fill: 'none', stroke: '#2a1a10', 'stroke-opacity': 0.55, 'stroke-width': 3, 'stroke-dasharray': '4 12', 'vector-effect': 'non-scaling-stroke' }));
        break;
      case 'cerco':
        for (let i = 0; i < 10; i++) { const [x, y] = P((i / 10) * Math.PI * 2, r * 0.76), t = r * 0.07; add(s('path', { d: `M${um(x - t)} ${um(y + t * 0.7)}L${um(x)} ${um(y - t)}L${um(x + t)} ${um(y + t * 0.7)}Z`, fill: '#e8dcc0', stroke: '#3a2a1a', 'stroke-width': 1.2, 'vector-effect': 'non-scaling-stroke' })); }
        add(s('circle', { cx: um(cx), cy: um(cy), r: um(r * 0.5), fill: 'none', stroke: cor, 'stroke-width': 2, 'stroke-dasharray': '3 6', 'vector-effect': 'non-scaling-stroke' }));
        break;
      case 'ponte': {
        const t = r * 0.35;
        add(linhaS([[cx - t, cy - t], [cx + t, cy + t]], { stroke: '#7a1f17', 'stroke-width': 5, 'stroke-opacity': 0.75 }));
        add(linhaS([[cx + t, cy - t], [cx - t, cy + t]], { stroke: '#7a1f17', 'stroke-width': 5, 'stroke-opacity': 0.75 }));
        break;
      }
      case 'caravana': case 'peregrinacao': case 'migracao': {
        const a = rnd() * Math.PI;
        add(linhaS([P(a + Math.PI, r * 0.8), P(a, r * 0.8)], { class: 'eve-anim eve-flui', stroke: T === 'migracao' ? '#5a2a10' : '#5a4220', 'stroke-opacity': 0.6, 'stroke-width': 3 }));
        break;
      }
      case 'dragao': {
        const w = r * 0.5, x = cx - w / 2, y = cy;
        add(s('path', { class: 'eve-anim eve-plana', d: `M${um(x)} ${um(y)}C${um(x + w * 0.3)} ${um(y - w * 0.5)} ${um(x + w * 0.5)} ${um(y - w * 0.2)} ${um(x + w * 0.5)} ${um(y)}C${um(x + w * 0.5)} ${um(y - w * 0.2)} ${um(x + w * 0.7)} ${um(y - w * 0.5)} ${um(x + w)} ${um(y)}C${um(x + w * 0.7)} ${um(y - w * 0.15)} ${um(x + w * 0.3)} ${um(y - w * 0.15)} ${um(x)} ${um(y)}Z`, fill: '#120a08' }));
        break;
      }
      case 'torneio': case 'coroacao': case 'leilao': case 'colheita':
        for (let i = 0; i < 5; i++) { const [x, y] = dentro(0.7); add(estrela(x, y, r * 0.06, { class: 'eve-anim eve-brilha', fill: T === 'colheita' ? '#f2e6a0' : '#fff2c0', style: atraso(i) })); }
        break;
      case 'cacada':
        add(s('circle', { class: 'eve-anim eve-respira', cx: um(cx), cy: um(cy), r: um(r * 0.45), fill: 'none', stroke: '#5a2a10', 'stroke-width': 2.5, 'stroke-opacity': 0.7, 'vector-effect': 'non-scaling-stroke' }));
        break;
      case 'golpe':
        for (let i = 0; i < 3; i++) { const [x, y] = dentro(0.5), L = r * 0.25; add(linhaS([[x - L * 0.5, y + L * 0.5], [x + L * 0.5, y - L * 0.5]], { stroke: '#7a1f17', 'stroke-width': 3, 'stroke-opacity': 0.6 })); }
        break;
    }
  }
  function evento(g0, o, ctx) {
    const def = defEvento(o.tipo), cor = def.cor || '#f0786e';
    const ativo = eventoAtivo(o, ctx.dia), r = raioNoDia(o, ctx.dia);
    g0.classList.add('eve');
    if (!ativo) g0.classList.add('inativo');
    if (r > 0) {
      const forca = limitar(Math.round(o.forca) || 1, 1, 3);
      g0.append(s('circle', { class: 'eve-area', cx: um(o.x), cy: um(o.y), r: um(r), fill: cor, stroke: cor, style: `fill-opacity:${[0.1, 0.16, 0.24][forca - 1]}` }));
      arteEvento(g0, o, cor, r);
      if (ativo) for (const b of ['', ' b']) g0.append(s('circle', { class: 'eve-pulso' + b, cx: um(o.x), cy: um(o.y), r: um(r), stroke: cor, 'pointer-events': 'none' }));
    }
    // O selo (tamanho fixo na tela) vai na camada dos ícones, com os marcadores: para quem vê a névoa fechada ela fica
    // por cima dela, e um evento perto da borda de uma clareira não aparece meio coberto. A área fica embaixo.
    const g1 = s('g', { class: g0.getAttribute('class'), 'data-id': o.id });
    const fx = fixo(o.x, o.y);
    const arte = s('g', { class: 'ico-arte', transform: 'scale(' + ICO + ')' });          // (lote 29) o desenho, menor
    fx.append(
      s('title', { texto: (o.nome ? o.nome + ' · ' : '') + def.nome + (ativo ? '' : ' (fora da data de hoje)') }),
      s('circle', { class: 'alvo', r: 16, fill: 'transparent' }), arte);
    arte.append(s('path', { class: 'selo', d: 'M0 -17L17 0L0 17L-17 0Z', fill: cor, 'stroke-linejoin': 'round' }), glifo(def, 17));
    { const mk = marcaMissao(o, ctx, -13, -13); if (mk) arte.append(mk); }     // (lote 9) a missão
    fx.append(rotulo(o.nome || def.nome, 26));
    g1.append(fx);
    g0.__ico = g1;
  }
  function marcador(g0, o, ctx) {
    const def = defIcone(o.ic), cor = o.cor || def.cor || '#e6ab4f';
    g0.classList.add('mar');
    if (o.rumor) g0.classList.add('rumor');
    if (o.falso) g0.classList.add('falso');
    const fx = fixo(o.x, o.y);
    // (lote 12, parte 12e) o lugar cercado: um anel tracejado na cor de quem cerca (cinza, se os jogadores não sabem quem)
    const cerc = o.cerco ? (o.cerco.fac ? corFac(ctx, o.cerco.fac) : '#6b7385') : null, nCerco = o.cerco ? (o.cerco.fac ? nomeFac(ctx, o.cerco.fac) : '') : '';
    const arte = s('g', { class: 'ico-arte', transform: 'scale(' + ICO + ')' });          // (lote 29) o desenho, menor (os nomes não)
    fx.append(
      s('title', { texto: (o.nome ? o.nome + ' · ' : '') + def.nome + (o.rumor ? ' (boato)' : '') + (o.cerco ? ' · cercado' + (nCerco ? ' por ' + nCerco : '') : '') }),
      s('circle', { class: 'alvo', r: 16, fill: 'transparent' }), arte);
    arte.append(...[
      cerc ? s('circle', { class: 'cerco-anel', r: 18.5, stroke: cerc, 'data-cerco': o.cerco.fac || '' }) : null,
      s('circle', { class: 'selo', r: 14, fill: cor }),
      glifo(def, 19)].filter(Boolean));
    if (o.rumor) arte.append(s('circle', { class: 'rumor-bola', cx: 12, cy: -12, r: 7.5, fill: '#2b3243', stroke: '#f3ead2' }), s('text', { class: 'interroga', x: 12, y: -8, 'text-anchor': 'middle', 'font-size': 11, texto: '?' }));
    if (o.falso) arte.append(s('path', { class: 'risco', d: 'M-12 12L12 -12' }));
    { const mk = marcaMissao(o, ctx, -12, -12); if (mk) arte.append(mk); }     // (lote 9) a missão, em cima à esquerda
    if (o.desc) arte.append(s('g', { class: 'pdesc-selo', transform: 'translate(-12 12)' }, s('title', { texto: 'Ponto de descanso (os grupos do mundo dormem aqui)' }),
      s('circle', { class: 'pdesc-bola', r: 7.5 }), s('path', { class: 'pdesc-lua', d: 'M1.6 -4.2a4.4 4.4 0 1 0 2.8 6.6 3.6 3.6 0 1 1-2.8-6.6z' })));     // (lote 9)
    // marcador com atalho (abre uma cena, outro mapa ou o acampamento): uma setinha no canto de baixo
    if (o.liga) { g0.classList.add('com-liga'); arte.append(s('circle', { class: 'liga-bola', cx: 12, cy: 12, r: 7 }), s('path', { class: 'liga-seta', d: 'M9.5 14.5l5-5M11 9.5h3.5V13' })); }
    if (o.nome) fx.append(rotulo(o.nome, 26));
    g0.append(fx);
  }
  /* (lote 6) As bolinhas da travessia: o hexágono seguinte custa mais do que o grupo anda num tempo — quantos tempos
     ele pede e quantos já foram andados. O mestre conta na hora (o mapa dele tem os custos); quem joga recebe pronto
     (bol, na projeção). → [feitas, total] ou null */
  function bolinhasDe(ctx, o) {
    if (Array.isArray(o.bol)) return o.bol;
    if (!ctx.mestre || !N().bolinhas) return null;
    try { const b = N().bolinhas(ctx.m, o); return b ? [b.feitas, b.total] : null; } catch (e) { return null; }
  }
  const MAX_BOL = 12;
  /* (lote 6) A honra do grupo: um selo junto do token, no estilo que o mestre escolheu. Quanto maior, mais enfeitado
     (o aro dourado, os louros, os raios); negativa, mais escuro e rachado. Arte própria, numa caixa 24×24: .hb é o
     corpo (na cor da honra), .hk é a tinta escura, .hd são os detalhes em traço, .hg as pedras. */
  const SELOS = {
    elmo: '<path class="hb" d="M6 21V11.6C6 6.9 8.7 3.6 12 3.6s6 3.3 6 8V21z"/><path class="hk" d="M6.7 11h10.6v1.9H6.7z"/><path class="hd" d="M12 3.6V11M12 12.9V21M8.4 15.6h1.3M8.4 18h1.3M14.3 15.6h1.3M14.3 18h1.3"/>',
    kabuto: '<path class="hg" d="M8.7 7 6.2 2.4c1.7.1 3.2 1.4 3.8 3.8zM15.3 7l2.5-4.6c-1.7.1-3.2 1.4-3.8 3.8z"/><path class="hb" d="M6.2 13.4c0-4 2.6-7 5.8-7s5.8 3 5.8 7zM3.4 13.4h17.2l-2 5.4H5.4z"/><path class="hd" d="M4.6 16h14.8M12 6.4v7"/>',
    katana: '<path class="hb" d="M21 3c-1.3 3.9-4.9 8.7-9.9 12.1l-2.2-2.2C13.9 9.6 17.9 5.6 21 3z"/><path class="hg" d="M6.9 14.7a2.4 2.4 0 1 0 4.8 0 2.4 2.4 0 1 0-4.8 0z"/><path class="hk" d="M9.4 16.3 4.4 21.3 2.7 19.6 7.7 14.6z"/><path class="hd" d="M18.6 6.3l-6.7 7.2M6.9 17.4l1.4 1.4M5.6 18.7l1.4 1.4"/>',
    turbante: '<path class="hb" d="M4.2 15.6c0-5.2 3.5-9.1 7.8-9.1s7.8 3.9 7.8 9.1c-2.4 1.4-5 2-7.8 2s-5.4-.6-7.8-2z"/><path class="hd" d="M5.4 12.3c2.6 1.5 10.6 1.5 13.2 0M6.6 9.5c2.4 1.2 8.4 1.2 10.8 0M11.3 6.7c-.9 2.4-1.1 5.6-.5 9.3"/><path class="hg" d="M12.6 11.3c.6-3 2.4-5.4 5-6.6-.6 2.6-2.4 5-5 6.6zM13.6 12.8a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 1 1 3.2 0z"/>',
    coroa: '<path class="hb" d="M4 17.4 3 7.9l4.6 3.8L12 4.6l4.4 7.1L21 7.9l-1 9.5zM4 17.4h16v2.9H4z"/><path class="hg" d="M4.1 7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 1 1 2.2 0zM13.1 4.6a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 1 1 2.2 0zM22.1 7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 1 1 2.2 0zM13 18.85a1 1 0 1 1-2 0 1 1 0 1 1 2 0z"/><path class="hd" d="M7 18.85h1.4M15.6 18.85H17"/>',
    escudo: '<path class="hb" d="M5 3.8h14v7.4c0 5-3.1 8.3-7 9.6-3.9-1.3-7-4.6-7-9.6z"/><path class="hd" d="M12 3.8v16.6M5 10h14"/><path class="hg" d="M13.7 10a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 1 1 3.4 0z"/>',
    cajado: '<path class="hb" d="M3.6 20.6 13.5 8.1l1.9 1.5L5.5 22.1z"/><path class="hk" d="M9.3 13.2l1.9 1.5-.9 1.1-1.9-1.5z"/><path class="hd" d="M13.6 9.6c-1.1-2.4-.2-5.3 2.2-6.6M20.2 9.4c-.6 1.8-2.1 3.1-4 3.5"/><path class="hg" d="M20.4 6.2a3.6 3.6 0 1 1-7.2 0 3.6 3.6 0 1 1 7.2 0z"/>',
    mascara: '<path class="hb" d="M12 2.8c4.2 0 7.2 3.2 7.2 8.2 0 5.6-3.3 10.2-7.2 10.2S4.8 16.6 4.8 11c0-5 3-8.2 7.2-8.2z"/><path class="hk" d="M7.4 10.1l3.6.9-3.3 1.6zM16.6 10.1l-3.6.9 3.3 1.6zM9.6 16.3h4.8L12 18z"/><path class="hd" d="M12 3.6v4.4M6.9 14.1l1.7.9M17.1 14.1l-1.7.9"/>',
  };
  /* a cor do corpo pela honra: do aço (0) ao ouro (+5) e daí ao ouro claro, quase branco (+10); negativa, cada vez mais
     escura (lote 8: até −10, quase preta) */
  const COR_HONRA = { '-10': '#141210', '-9': '#1b1815', '-8': '#221f1b', '-7': '#2a2622', '-6': '#332f2a', '-5': '#3d3833', '-4': '#4f4943', '-3': '#615a53', '-2': '#7a736b', '-1': '#8f8981', 0: '#b9bbbe',
    1: '#c5a26b', 2: '#d3ad58', 3: '#ddb64e', 4: '#e7c04a', 5: '#f0cb4c', 6: '#f3d362', 7: '#f6db7c', 8: '#f9e399', 9: '#fbecb9', 10: '#fff5d8' };
  const RACHAS = ['M9 4.5l2.2 3.4-1.6 2.2 2 3.1', 'M16.2 8.6l-1.9 2.1.8 2.5-1.7 2.2', 'M7 13.6l2 1.3-.4 2.6 1.6 1.8', 'M13.2 16.8l1.2-1.9 2.4.2 1.1-2', 'M5.6 6.8l1.6 1.4-.2 2.2'];
  const HONRA_MAX = 10;
  function seloDeHonra(o) {
    const v = Math.max(-HONRA_MAX, Math.min(HONRA_MAX, Math.round(Number(o.honra) || 0))), est = SELOS[o.estilo];
    if (!est) return null;
    const g = s('g', { class: 'honra' + (v > 0 ? ' h-pos' : v < 0 ? ' h-neg' : '') + ' h' + (v < 0 ? 'm' + -v : v), transform: 'translate(23 -13)' });
    g.append(s('title', { texto: 'Honra ' + (v > 0 ? '+' + v : v < 0 ? '−' + -v : '0') + ' · ' + ((N().HONRA || {})[o.estilo] || '') }));
    // (lote 8) +9: o halo, um anel claro bem por fora
    if (v >= 9) g.append(s('circle', { class: 'hon-halo', r: 19.5 }));
    // (lote 8) +6: uma segunda volta de raios, curtos, entre os de +5
    if (v >= 6) {
      let d = '';
      for (let i = 0; i < 12; i++) { const a = ((i + 0.5) / 12) * Math.PI * 2, b = a + 0.1, c0 = a - 0.1; d += 'M' + d3(Math.cos(c0) * 11) + ' ' + d3(Math.sin(c0) * 11) + 'L' + d3(Math.cos(a) * 14.5) + ' ' + d3(Math.sin(a) * 14.5) + 'L' + d3(Math.cos(b) * 11) + ' ' + d3(Math.sin(b) * 11) + 'Z'; }
      g.append(s('path', { class: 'hon-raios2', d }));
    }
    // (lote 8) +7: as asas, dos dois lados
    if (v >= 7) g.append(s('path', { class: 'hon-asa', d: 'M-10 -2c-4-1-8 0-11 3 3 0 5 1 6 2-2 0-4 1-5 3 3-1 6-1 8 0M10 -2c4-1 8 0 11 3-3 0-5 1-6 2 2 0 4 1 5 3-3-1-6-1-8 0' }));
    // os raios (+5), por trás de tudo
    if (v >= 5) {
      let d = '';
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, b = a + 0.13, c0 = a - 0.13; d += 'M' + d3(Math.cos(c0) * 11) + ' ' + d3(Math.sin(c0) * 11) + 'L' + d3(Math.cos(a) * 16.5) + ' ' + d3(Math.sin(a) * 16.5) + 'L' + d3(Math.cos(b) * 11) + ' ' + d3(Math.sin(b) * 11) + 'Z'; }
      g.append(s('path', { class: 'hon-raios', d }));
    }
    // os louros (+3: metade; +4 e +5: inteiros)
    if (v >= 3) {
      const ramo = lado => {
        let d = '';
        for (let i = 0; i < 4; i++) { const a = Math.PI * (0.62 + i * 0.16), x = lado * Math.cos(a) * -12.6, y = Math.sin(a) * 12.6; d += 'M' + d3(x) + ' ' + d3(y) + 'c' + d3(lado * -1.6) + ' -2.4 ' + d3(lado * -0.4) + ' -4.4 ' + d3(lado * 1.6) + ' -4.6c.4 2 -.2 3.6 ' + d3(lado * -1.6) + ' 4.6z'; }
        return d;
      };
      g.append(s('path', { class: 'hon-louro', d: ramo(1) + (v >= 4 ? ramo(-1) : '') }));
    }
    g.append(s('circle', { class: 'hon-fundo', r: 10.5 }));
    if (v > 0) g.append(s('circle', { class: 'hon-aro', r: 10.5, 'stroke-width': d3(0.9 + Math.min(v, 5) * 0.35 + Math.max(0, v - 5) * 0.12) }));
    // (lote 8) +8: as pedras no aro (quatro); +10: a estrela no alto
    if (v >= 8) for (const [x, y] of [[0, -10.5], [10.5, 0], [0, 10.5], [-10.5, 0]]) if (!(v >= 10 && y < 0)) g.append(s('circle', { class: 'hon-pedra', cx: x, cy: y, r: 1.6 }));
    if (v >= 10) g.append(s('path', { class: 'hon-estrela', d: 'M0 -15.6l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z' }));
    // (lote 8) −8: a brasa em volta, escura e avermelhada; −7: as correntes, atravessando
    if (v <= -8) g.append(s('circle', { class: 'hon-brasa', r: 12.2 }));
    const ic = molde(est);                       // markup fixo daqui
    ic.setAttribute('class', 'hon-ico');
    ic.setAttribute('transform', 'translate(-8.9 -8.9) scale(0.74)');
    for (const p of ic.querySelectorAll('.hb')) p.style.fill = COR_HONRA[v];
    const rachas = { 2: 1, 3: 2, 4: 3, 5: 3, 6: 4, 7: 4, 8: 5, 9: 5, 10: 5 }[-v] || 0;
    if (rachas) ic.append(s('path', { class: 'hon-racha', d: RACHAS.slice(0, rachas).join('') }));
    if (v <= -4) ic.append(s('path', { class: 'hon-lasca', d: 'M17.5 3.2l3.4.4-1 3.6z' }));
    if (v <= -9) ic.append(s('path', { class: 'hon-lasca', d: 'M3.4 18.6l3.2 2.6-3.6.6z' }));          // (lote 8) −9: outra lasca
    g.append(ic);
    if (v <= -7) g.append(s('path', { class: 'hon-corrente', d: 'M-12.5 -7.5l25 15M-12.5 7.5l25 -15M-9 -5.4a1.8 1.2 31 1 0 3.1 1.9M5.9 3.5a1.8 1.2 31 1 0 3.1 1.9M-9 5.4a1.8 1.2 -31 1 1 3.1 -1.9M5.9 -3.5a1.8 1.2 -31 1 1 3.1 -1.9' }));
    // o número, num botãozinho embaixo
    // (lote 8: com dois algarismos, o botãozinho fica mais largo e a letra um pouco menor — o "+10" não embola)
    const t = v > 0 ? '+' + v : v < 0 ? '−' + -v : '0', largo = Math.abs(v) >= 10;
    g.append(s('rect', { class: 'hon-num-fundo', x: largo ? -9.6 : -7, y: 8.6, width: largo ? 19.2 : 14, height: 9.6, rx: 4.8 }), s('text', { class: 'hon-num', x: 0, y: 16.1, 'text-anchor': 'middle', 'font-size': largo ? 7.8 : 8.5, texto: t }));
    return g;
  }
  /* (lote 15) A força do exército, para o mestre: quantos soldados ele tem (de qualquer tipo: a soma das tropas das unidades
     que lutam), e — quando há — quantos magos e quantas máquinas de cerco. null se não há o que contar (ou se não é o
     exército completo: o que os jogadores recebem vem sem as unidades). */
  function forcaDoExercito(o) {
    const exe = o && o.tipo === 'exercito' && o.exe && !o.exe.pub && Array.isArray(o.exe.unid) ? o.exe : null;
    if (!exe) return null;
    let tropas = 0, magos = 0, maq = 0;
    for (const u of exe.unid) {
      if (!u || !(Number(u.tropas) > 0)) continue;
      tropas += Math.round(Number(u.tropas) || 0); magos += Math.max(0, Math.round(Number(u.magos) || 0));
      if (u.maq && typeof u.maq === 'object') for (const k of Object.keys(u.maq)) maq += Math.max(0, Math.round(Number(u.maq[k]) || 0));
    }
    return tropas > 0 || magos > 0 || maq > 0 ? { tropas, magos, maq } : null;
  }
  // 850 · 1,2 mil · 12 mil · 1,5 mi
  function numCurto(n) {
    if (n < 1000) return String(n);
    const um1 = x => (Math.floor(x * 10) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    if (n < 10000) return um1(n / 1000) + ' mil';
    if (n < 1e6) return Math.floor(n / 1000).toLocaleString('pt-BR') + ' mil';
    return um1(n / 1e6) + ' mi';
  }
  const FORCA_Y = -25;                            // (lote 29: o token menor; era −31)
  function seloDaForca(o, f) {
    const nT = numCurto(f.tropas), itens = [{ k: 'tropas', t: nT, w: Math.max(14, nT.length * 5.1 + 8) }];
    if (f.magos > 0) itens.push({ k: 'magos', t: numCurto(f.magos), w: 0 });
    if (f.maq > 0) itens.push({ k: 'maq', t: numCurto(f.maq), w: 0 });
    for (const it of itens) if (!it.w) it.w = it.t.length * 4.6 + 13;
    const gap = 2, W = itens.reduce((sm, it) => sm + it.w, 0) + gap * (itens.length - 1);
    const fmtN = n => n.toLocaleString('pt-BR');
    const g = s('g', { class: 'forca', transform: 'translate(0 ' + FORCA_Y + ')' });
    g.append(s('title', { texto: fmtN(f.tropas) + (f.tropas === 1 ? ' soldado' : ' soldados') + (f.magos ? ' · ' + fmtN(f.magos) + (f.magos === 1 ? ' mago' : ' magos') : '') + (f.maq ? ' · ' + fmtN(f.maq) + (f.maq === 1 ? ' máquina de cerco' : ' máquinas de cerco') : '') + ' (só o mestre vê)' }));
    let x = -W / 2;
    for (const it of itens) {
      const sel = s('g', { class: 'forca-' + it.k, transform: 'translate(' + d3(x) + ' 0)' });
      sel.append(s('rect', { class: 'forca-fundo', x: 0, y: -5.5, width: d3(it.w), height: 11, rx: 5.5, style: it.k === 'tropas' ? 'stroke:' + (o.cor || '#e6ab4f') : null }));
      if (it.k === 'tropas') sel.append(s('text', { class: 'forca-n', x: d3(it.w / 2), y: 3.1, 'text-anchor': 'middle', 'font-size': 8.6, texto: it.t }));
      else {
        // o desenho: a estrela do mago; a roda da máquina de cerco
        sel.append(it.k === 'magos' ? s('path', { class: 'forca-ico', d: 'M6 -3.6l.9 2.7 2.7.9-2.7.9L6 3.6l-.9-2.7L2.4 0l2.7-.9z' })
          : s('path', { class: 'forca-ico roda', d: 'M6 -3.1a3.1 3.1 0 1 0 0 6.2a3.1 3.1 0 1 0 0-6.2zM6 -3.1v6.2M2.9 0h6.2' }));
        sel.append(s('text', { class: 'forca-n', x: 10.6, y: 3, 'font-size': 7.8, texto: it.t }));
      }
      g.append(sel);
      x += it.w + gap;
    }
    return g;
  }
  function grupo(g0, o, ctx) {
    g0.classList.add('gru');
    const fx = fixo(o.x, o.y), bol = ctx ? bolinhasDe(ctx, o) : null;
    const forca = ctx && ctx.mestre ? forcaDoExercito(o) : null;
    if (bol) {
      // uma fileira em cima do token: as cheias são os tempos andados; com muitas, as primeiras e a conta
      // (lote 15: com a força do exército em cima do token, a fileira sobe para acima dela)
      const [feitas, total] = bol, n = Math.min(total, MAX_BOL), passo = 8.5, x0 = -((n - 1) * passo) / 2, cor = o.cor || '#e6ab4f';
      const gb = s('g', { class: 'bolinhas', transform: 'translate(0 ' + (forca ? FORCA_Y - 13 : -23) + ')' });
      gb.append(s('title', { texto: 'Atravessando: ' + feitas + ' de ' + total + ' tempos de marcha' }));
      for (let i = 0; i < n; i++) gb.append(s('circle', { class: 'bol' + (i < feitas ? ' feita' : ''), cx: d3(x0 + i * passo), cy: 0, r: 3.3, style: i < feitas ? 'fill:' + cor : 'stroke:' + cor }));
      if (total > MAX_BOL) gb.append(s('text', { class: 'bol-conta', x: d3(x0 + n * passo + 2), y: 3.5, 'font-size': 10, texto: feitas + '/' + total }));
      fx.append(gb);
    }
    const arte = s('g', { class: 'ico-arte', transform: 'scale(' + ICO + ')' });          // (lote 29) o token, menor (o nome, a força e a bandeira não)
    fx.append(
      s('title', { texto: o.nome || 'Grupo' }),
      s('circle', { class: 'alvo', r: 17, fill: 'transparent' }), arte);
    arte.append(
      s('circle', { class: 'grupo-anel', r: 19.5 }),
      s('circle', { class: 'grupo-base', r: 15, fill: o.cor || '#e6ab4f' }));
    // (lote 7, parte 5b) a caravana, a patrulha e o exército: o desenho do tipo no lugar da sigla
    const TG = o.tipo ? dicionario('TIPOS_GRUPO')[o.tipo] : null;
    if (TG) { g0.classList.add('gru-mundo', 'gru-' + o.tipo); const gl = glifo(TG, 19); gl.classList.add('gru-glifo'); if (clara(o.cor || '#e6ab4f')) gl.classList.add('escura'); arte.append(gl); }
    else arte.append(s('text', { class: 'sigla' + (clara(o.cor || '#e6ab4f') ? ' escura' : ''), y: 4.3, 'text-anchor': 'middle', 'font-size': 11.5, texto: String(o.sigla || '').slice(0, 3) }));
    const selo = seloDeHonra(o);
    if (selo) { selo.setAttribute('transform', 'translate(' + d3(23 * ICO + 2) + ' ' + d3(-13 * ICO) + ') scale(0.85)'); fx.append(selo); }   // (lote 29: junto do token menor)
    // (lote 8) a bandeira do clã da facção do grupo, do lado esquerdo do token
    const gw = 12 * ctx.fb, bg = bandeira(brasaoDaFac(ctx, o.fac), -(21.5 * ICO + gw / 2), -12 * ICO + (ctx.fb - 1) * 2.5, gw, nomeFac(ctx, o.fac));   // (lote 9: o tamanho deste aparelho)
    if (bg) fx.append(bg);
    { const mk = marcaMissao(o, ctx, 15, 15); if (mk) arte.append(mk); }       // (lote 9) a missão, embaixo à direita
    // (lote 9) descansando (o próximo tempo cai no descanso dele): "zZ" embaixo à esquerda — só o mestre
    if (o.desc && ctx.mestre && N().descansandoAgora && N().descansandoAgora(ctx.m, o)) {
      const jn = N().janelaDeDescanso(o, (ctx.m.cal && ctx.m.cal.tpd) || 10);
      arte.append(s('g', { class: 'dorme', transform: 'translate(-15 15) scale(1.15)' }, s('title', { texto: 'Descansando (do ' + jn.de + 'º ao ' + jn.ate + 'º tempo)' }),
        s('circle', { class: 'dorme-bola', r: 8.5 }), s('text', { class: 'dorme-z', x: -0.5, y: 3.6, 'text-anchor': 'middle', 'font-size': 9.5, texto: 'zZ' })));
    }
    if (forca) fx.append(seloDaForca(o, forca));
    if (o.nome) fx.append(rotulo(o.nome, 29));
    g0.append(fx);
  }
  // id seguro para o SVG (o padrão das listras, o caminho do nome)
  const idSvg = (pre, id) => pre + String(id).replace(/[^A-Za-z0-9_-]/g, '_');
  /* Zona de guerra: a área das duas facções, em listras com as duas cores; enquanto ativa, pulsa devagar. A forma é
     a do dia que está na tela (as fases mudam a área com o tempo). */
  function zona(g0, o, ctx) {
    const pts = formaDe(o, ctx.dia);
    if (!Array.isArray(pts) || pts.length < 3) return;
    const Zp = o.tipo && o.tipo !== 'guerra' ? dicionario('ZONAS')[o.tipo] : null;
    if (Zp) { zonaDePerigo(g0, o, ctx, pts, Zp); return; }
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
    // (lote 8) as bandeiras dos dois lados, em cima do nome
    const zw = 14 * ctx.fb, zdx = zw / 2 + 4, zy = -7.6 - 0.6 * zw;          // (lote 9: o tamanho deste aparelho)
    const ba = bandeira(brasaoDaFac(ctx, o.a), -zdx, zy, zw, nomeFac(ctx, o.a)), bb = bandeira(brasaoDaFac(ctx, o.b), zdx, zy, zw, nomeFac(ctx, o.b));
    if (o.nome || ba || bb) { const c = pontoDoNome(pts), fx = fixo(c[0], c[1]); if (ba) fx.append(ba); if (bb) fx.append(bb); if (o.nome) fx.append(rotulo(String(o.nome).toLocaleUpperCase('pt-BR'), 4, 'rotulo rotulo-reg')); g0.append(fx); }
  }
  /* (lote 7, parte 5c) A zona de perigo: a área na cor do tipo, com listras finas e a borda tracejada; enquanto acontece,
     pulsa devagar (como a de guerra). */
  function zonaDePerigo(g0, o, ctx, pts, Zp) {
    const ativa = zonaAtiva(o, ctx.dia), cor = Zp.cor || '#9aa3b5';
    g0.classList.add('zon', 'zon-perigo', 'zp-' + o.tipo);
    if (!ativa) g0.classList.add('inativa');
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const W = um(limitar(Math.hypot(x1 - x0, y1 - y0) / 30, 3, 400)), pid = idSvg('zp-', o.id), d = caminho(pts, true);
    g0.append(
      s('defs', null, s('pattern', { id: pid, patternUnits: 'userSpaceOnUse', width: W, height: W, patternTransform: 'rotate(-35)' },
        s('rect', { width: W, height: W, fill: cor, 'fill-opacity': 0.18 }), s('rect', { width: um(W * 0.22), height: W, fill: cor, 'fill-opacity': 0.55 }))),
      s('path', { class: 'zona zona-perigo' + (ativa ? ' zona-pulsa' : ''), d, fill: `url(#${pid})` }),
      s('path', { class: 'zona-borda zona-borda-perigo', d, stroke: cor }));
    const c = pontoDoNome(pts), fx = fixo(c[0], c[1]);
    fx.append(rotulo(String(o.nome || Zp.nome).toLocaleUpperCase('pt-BR'), 4, 'rotulo rotulo-reg'));
    g0.append(fx);
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
      // (o nome vai claro, com um toque da cor da linha, e contorno escuro — como os outros nomes do mapa, nos dois
      //  temas. A cor vai no estilo da própria letra: como atributo, a regra geral "svg text" do CSS passava por cima)
      const t = s('text', { class: 'nome-linha' + (o.estilo === 'rio' ? ' rio-nome' : ''), 'text-anchor': 'middle' });
      t.style.fill = misturar(cor, '#f6efe0', 0.74);
      t.__w = o.estilo === 'rio' ? w * 0.55 : w * 1.1;
      t.append(s('textPath', { href: '#' + pid, startOffset: '50%', texto: curto(String(o.nome), 60) }));
      ajustarNomeLinha(t, zAplicado || V.z);
      g0.append(t);
    }
  }
  function ajustarNomeLinha(t, z) {
    t.setAttribute('font-size', (14 / z).toFixed(3));
    t.setAttribute('dy', (-((t.__w || 0) + 5 / z)).toFixed(3));
    // (o contorno vai no estilo da própria letra: como atributo, a regra geral "svg text" do CSS — o contorno de 3,2 px dos
    //  nomes de tamanho fixo — passava por cima dele, e de perto um contorno de 3,2 unidades do mapa engolia letras de
    //  1,75: o nome virava um amontoado)
    t.style.strokeWidth = (3 / z).toFixed(3) + 'px';
  }
  // os desenhos (carimbos) vêm do núcleo como markup fixo; um molde de cada, clonado
  function molde(markup) {
    let m0 = moldes.get(markup);
    if (!m0) { m0 = s('g'); m0.innerHTML = markup || ''; moldes.set(markup, m0); }     // markup fixo do núcleo
    return m0.cloneNode(true);
  }
  /* (lote 29) O tamanho do carimbo na tela, em px — o mesmo em qualquer zoom. O carimbo novo guarda o dele (px); o de antes
     (só com o tamanho em unidades do mapa) fica em volta do Médio, maior ou menor conforme o tamanho dele perto dos outros
     carimbos do mapa (ref: a mediana), para a montanha continuar maior que a árvore. */
  function refCarimbos(m) {
    const ts = (m.objs || []).filter(o => o.k === 'c' && !(o.px > 0)).map(o => Number(o.tam) || 40).sort((a, b) => a - b);
    return ts.length ? ts[Math.floor(ts.length / 2)] : 40;
  }
  function pxCarimbo(o, ctx) {
    if (o.px > 0) return limitar(Math.round(o.px), 8, 96);
    const ref = (ctx && ctx.refCar) || 40;
    return Math.round(PX_CARIMBO[40] * limitar((Number(o.tam) || 40) / ref, 0.7, 1.6));
  }
  // Carimbo: o desenho numa caixa de t × t px na tela, com o centro no ponto (virado, se pedido). Não cresce com o zoom.
  function carimbo(g0, o, ctx) {
    const def = defCarimbo(o.ic), t = pxCarimbo(o, ctx), k = t / 24;
    g0.classList.add('car');
    const fx = fixo(o.x, o.y, 'car-fx');
    fx.__px = t;
    const arte = molde(def.svg);
    arte.setAttribute('class', 'carimbo');
    arte.setAttribute('style', 'color:' + (o.cor || def.cor || '#5d9a4e'));
    arte.setAttribute('transform', `translate(${d3(o.vira ? t / 2 : -t / 2)} ${d3(-t / 2)}) scale(${(o.vira ? -k : k).toFixed(5)} ${k.toFixed(5)})`);
    fx.append(s('rect', { class: 'alvo', x: d3(-t / 2), y: d3(-t / 2), width: t, height: t, fill: 'transparent' }), arte);
    if (o.nome) fx.append(rotulo(o.nome, d3(t / 2 + 14)));
    g0.append(fx);
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
        fx.append(s('circle', { class: 'sel-anel', r: o.k === 'g' ? 19 : 17 }));          // (lote 29: os ícones menores)
        C.sel.append(fx);
        const rh = o.k === 'e' ? raioNoDia(o, diaDaVista()) : 0;           // a borda que aparece hoje, não a do primeiro dia
        if (rh > 0 && ids.length === 1) C.sel.append(s('circle', { class: 'sel-anel', cx: um(o.x), cy: um(o.y), r: um(rh) }));
      }
    }
    // (lote 7, parte 5b) quem anda por uma rota (o grupo do mundo, o evento que anda): a rota fina no sentido de agora e as
    // bandeirinhas das paradas; a prévia do traçado pedido no painel
    if (ids.length === 1 && unico && unico.rota && (unico.k === 'g' || unico.k === 'e') && podeEditar()) desenharRotaDe(unico);
    if (App.previaRota && Array.isArray(App.previaRota.pts) && App.previaRota.pts.length > 1) C.sel.append(s('path', { class: 'sel-rota previa', d: caminho(App.previaRota.pts) }));
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
  function desenharRotaDe(o) {
    const rt = indice.get(o.rota);
    if (!rt || !Array.isArray(rt.pts) || rt.pts.length < 2) return;
    let pts = rt.pts;
    if (o.modo === 'circuito') pts = pts.concat([pts[0]]);
    else if (o.sentido === -1) pts = pts.slice().reverse();          // (indo e voltando, ou — lote 9 — voltando pela mesma rota)
    C.sel.append(s('path', { class: 'sel-rota', d: caminho(pts) }));
    // a seta do sentido, no fim do caminho de agora
    const a = pts[pts.length - 2], b = pts[pts.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI, fs = fixo(b[0], b[1]);
    fs.append(s('path', { class: 'sel-rota-seta', d: 'M-9 -6L0 0L-9 6', transform: 'rotate(' + d3(ang) + ')' }));
    C.sel.append(fs);
    (Array.isArray(o.paradas) ? o.paradas : []).forEach((p, i) => {
      const fx = fixo(p.x, p.y);
      fx.append(s('g', { class: 'parada', 'data-parada': String(i) }, s('title', { texto: 'Parada ' + (i + 1) }), s('path', { class: 'parada-mastro', d: 'M0 0V-20' }), s('path', { class: 'parada-flamula', d: 'M0 -20L11 -16L0 -12Z' }), s('circle', { class: 'parada-pe', r: 2.6 })));
      C.sel.append(fx);
    });
    // (lote 9) os pontos de descanso do grupo: a lua, na rota
    (Array.isArray(o.pdesc) ? o.pdesc : []).forEach((p, i) => {
      const fx = fixo(p.x, p.y);
      fx.append(s('g', { class: 'pdesc-selo', 'data-pdesc': String(i), transform: 'translate(0 -12)' }, s('title', { texto: 'Ponto de descanso ' + (i + 1) }),
        s('circle', { class: 'pdesc-bola', r: 7.5 }), s('path', { class: 'pdesc-lua', d: 'M1.6 -4.2a4.4 4.4 0 1 0 2.8 6.6 3.6 3.6 0 1 1-2.8-6.6z' })));
      C.sel.append(fx);
    });
  }
  // O contorno de um carimbo ou de um texto escolhido: a caixa dele (o texto gira junto).
  function anelDoEnfeite(o) {
    const z = zAplicado || V.z, folga = 3 / z;
    if (o.k === 'c') { const t = pxCarimbo(o, ctxAtual) / 2 + 3, fx = fixo(o.x, o.y); fx.append(s('rect', { class: 'sel-anel', x: d3(-t), y: d3(-t), width: d3(2 * t), height: d3(2 * t) })); return fx; }   // (lote 29: na tela)
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
      fx.append(rotulo('raio: ' + textoDistancia(M, g.r).split(' · ')[0], -14, 'rotulo regua-txt'));
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
      carimbo(el, { id: 'fantasma', x: cursor.x, y: cursor.y, ic: opt('carimbo'), tam: tamCarimbo(), px: pxCarimboNovo(), cor: '', vira: false, nome: '' });
      c.append(el);
    }
    // a ferramenta Terreno: os hexágonos que o pincel pega, embaixo do cursor (lote 17: e o ajuste da zona de guerra)
    else if ((ferramenta() === 'h' || (ferramenta() === 'f' && opt('freModo') === 'ajuste')) && cursor && podeEditar() && temGrade(M) && !(g && g.toque)) {
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
  const pxCarimboNovo = () => pxDoTam(Number(opt('carTam')) || 40);                    // (lote 29) o carimbo novo: px na tela
  const tamCarimbo = () => pxCarimboNovo() / V.z;
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
    const c = { x: um(limitar(q.x, 0, L)), y: um(limitar(q.y, 0, A)), ic: opt('carimbo'), tam: um(tam), px: Math.round(tam * V.z), vira };
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
    if (camadaParada('enfeites')) return;                     // (lote 8) camada escondida ou travada
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
    if (ferramenta() === 'f') return opt('zAj') === 'tira' ? '#05070c' : opt('zAj') === 'auto' ? '#9aa3b5' : '#c0503a';     // (lote 17) o ajuste da zona
    const modo = opt('terModo'), t = terrenoEscolhido();
    return modo === 'ter' ? (t ? t.cor : '#9aa3b5') : modo === 'custo' ? '#e6ab4f' : modo === 'rec' ? '#f2c14e' : '#05070c';
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
    if (ferramenta() === 'f') { aplicarAjusteZona(chaves); return; }                 // (lote 17) a zona de guerra
    if (opt('terModo') === 'rec' || opt('terModo') === 'semrec') { aplicarRecursoHex(chaves); return; }     // (lote 17) os recursos
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
    let de = i.de === 'hex' ? ' (custo próprio)' : i.de === 'regiao' ? ' (da região ' + ((i.regiao.nome || '').trim() || 'sem nome') + ')' : i.de === 'base' ? ' (sem terreno)' : '';
    // (lote 7, parte 5a) os eventos de hoje que pesam ali: os cubos a mais e o que fecha a passagem
    if (i.extra) de = de ? de.slice(0, -1) + '; +' + num(i.extra, 1) + ' dos eventos)' : ' (+' + num(i.extra, 1) + ' dos eventos)';
    const fecha = i.fechado ? M.objs.find(o => o.id === i.fechado) : null;
    // (lote 17) com a economia ligada, o que o hexágono produz por semana (o terreno e o que o pincel pôs)
    let prod = '';
    if (ecoLigada(M) && mestreVe()) {
      const tr = (i.terreno && M.eco.ter[i.terreno.id]) || {}, hr = (M.eco.hexr || {})[hx.q + ',' + hx.r] || {}, ids = [...new Set(Object.keys(tr).concat(Object.keys(hr)))];
      if (ids.length) prod = ' Produz por semana: ' + ids.map(id => { const r = M.eco.rec.find(x => x.id === id); return (r ? r.nome : id) + ' ' + num((tr[id] || 0) + (hr[id] || 0), 1) + (hr[id] ? ' (' + num(hr[id], 1) + ' do pincel)' : ''); }).join(', ') + '.';
    }
    return 'Aqui: ' + (i.terreno ? i.terreno.nome + (i.desenho ? ' (do desenho)' : '') : 'sem terreno') + ' · ' + num(i.custo, 1) + ' cubos' + de + '.'
      + (fecha ? ' Fechado: "' + N().nomeEvento(fecha) + '".' : '') + prod;
  }

  /* ---------------- (lote 17) a zona de guerra automática, as setas, o mar, os recursos e a caneta ---------------- */
  const VIZ6 = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const j0 = x => JSON.stringify(x);
  // os segmentos [[x, y], [x, y]] emendados em linhas (as pontas que se tocam viram uma só)
  function encadear(segs) {
    const ch = p => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10), por = new Map(), usado = new Uint8Array(segs.length), out = [];
    segs.forEach((sg, i) => { for (const p of sg) { const k = ch(p); if (!por.has(k)) por.set(k, []); por.get(k).push(i); } });
    const prox = p => { for (const i of por.get(ch(p)) || []) if (!usado[i]) return i; return -1; };
    for (let i = 0; i < segs.length; i++) {
      if (usado[i]) continue;
      usado[i] = 1;
      const l = [segs[i][0], segs[i][1]];
      for (let j = prox(l[l.length - 1]); j >= 0; j = prox(l[l.length - 1])) { usado[j] = 1; const sg = segs[j]; l.push(ch(sg[0]) === ch(l[l.length - 1]) ? sg[1] : sg[0]); }
      for (let j = prox(l[0]); j >= 0; j = prox(l[0])) { usado[j] = 1; const sg = segs[j]; l.unshift(ch(sg[0]) === ch(l[0]) ? sg[1] : sg[0]); }
      out.push(l);
    }
    return out;
  }
  // o lado que dois hexágonos vizinhos dividem (os dois cantos em comum)
  function ladoComum(m, a, b) {
    const ca = N().cantosHex(m, a.q, a.r), cb = N().cantosHex(m, b.q, b.r), tol = Math.max(0.01, (m.grade.tam || 1) * 0.02), out = [];
    for (const p of ca) if (cb.some(q => Math.abs(q[0] - p[0]) < tol && Math.abs(q[1] - p[1]) < tol)) out.push(p);
    return out.length === 2 ? out : null;
  }
  /* A zona de guerra automática (camada Guerra): os hexágonos listrados nas cores de quem controla e de contra quem, a
     borda da zona tracejada e a linha do front (as duas cores, andando, como a frente de batalha). O mestre conta ela
     (MundoNucleo.zonaDeGuerra); quem joga recebe pronta na projeção (guerra.zauto). */
  let zagChave = null, zagFonte = null, zagRapida = '';
  // a zona que vale aqui: a pronta da projeção (quem joga, "ver como jogador") ou a conta do mestre; e de onde ela veio
  function zonaParaDesenhar(m, ctx) {
    if (!camVisivel('guerra') || !temGrade(m)) return null;
    const za = m.guerra && m.guerra.zauto;
    if (za) return { fonte: za, z: () => ({ h: Object.keys(za.h).map(k => [k, za.h[k][0], za.h[k][1], za.h[k][2]]), f: za.f }) };
    if (!ctx.mestre || !N().zonaDeGuerra) return null;
    const z = N().zonaDeGuerra(m);
    return z ? { fonte: z, z: () => ({ h: [...z.h].map(([k, x]) => [k, x.a, x.b, x.o ? 1 : 0]), f: z.f }) } : null;
  }
  function desenharZonaAuto(m, ctx) {
    const zf = zonaParaDesenhar(m, ctx);
    // (a conta do mestre fica guardada por mapa: com o mesmo objeto, a mesma grade e as mesmas cores, nada a refazer)
    const cores = (m.faccoes || []).map(f => f.id + f.cor).join('|'), rapida = j0([m.grade, cores]);
    if (zf && zf.fonte === zagFonte && rapida === zagRapida) return;
    zagFonte = zf ? zf.fonte : null; zagRapida = rapida;
    const z = zf ? zf.z() : null;
    const ids = z ? [...new Set(z.h.flatMap(x => [x[1], x[2]]).concat(z.f.flatMap(x => [x[2], x[3]])))] : [];
    const chave = z ? j0([m.grade, z, ids.map(id => corFac(ctx, id))]) : '';
    if (chave === zagChave) return;
    zagChave = chave;
    C.zag.replaceChildren();
    if (!z || !(z.h.length || z.f.length)) return;
    const defs = s('defs'), pares = new Map(), W = um(limitar(m.grade.tam * 0.3, 2, 400));
    const padrao = (a, b) => {
      const k = (a || '') + '|' + (b || '');
      if (!pares.has(k)) {
        const ca = a ? corFac(ctx, a) : '#8a7a5e', cb0 = b ? corFac(ctx, b) : misturar(ca, '#000000', 0.45), cb = cb0 === ca ? misturar(ca, '#000000', 0.45) : cb0, id = 'zag-p' + pares.size;
        defs.append(s('pattern', { id, patternUnits: 'userSpaceOnUse', width: W, height: W, patternTransform: 'rotate(45)' },
          s('rect', { width: um(W / 2), height: W, fill: ca }), s('rect', { x: um(W / 2), width: um(W / 2), height: W, fill: cb })));
        pares.set(k, { id, d: '' });
      }
      return pares.get(k);
    };
    const naZona = new Set(z.h.map(x => x[0])), borda = [];
    for (const [k, a, b] of z.h) {
      const h0 = N().lerChaveHex(k);
      if (!h0) continue;
      padrao(a, b).d += caminho(N().cantosHex(m, h0.q, h0.r), true);
      for (const [dq, dr] of VIZ6) {
        const hn = { q: h0.q + dq, r: h0.r + dr };
        if (naZona.has(hn.q + ',' + hn.r)) continue;
        const l = ladoComum(m, h0, hn);
        if (l) borda.push(l);
      }
    }
    C.zag.append(defs);
    for (const x of pares.values()) C.zag.append(s('path', { class: 'zag-hex', d: x.d, fill: 'url(#' + x.id + ')' }));
    if (borda.length) C.zag.append(s('path', { class: 'zag-borda', d: encadear(borda).map(l => caminho(l)).join('') }));
    // a linha do front: por par de facções, as duas cores andando
    const porPar = new Map();
    for (const [k1, k2, a, b] of z.f) {
      const h1 = N().lerChaveHex(k1), h2 = N().lerChaveHex(k2), l = h1 && h2 ? ladoComum(m, h1, h2) : null;
      if (!l) continue;
      const k = (a || '') + '|' + (b || '');
      if (!porPar.has(k)) porPar.set(k, { a, b, segs: [] });
      porPar.get(k).segs.push(l);
    }
    for (const x of porPar.values()) {
      const d = encadear(x.segs).map(l => caminho(l)).join('');
      C.zag.append(s('path', { class: 'fre-a frente-anda zag-front', d, stroke: corFac(ctx, x.a) }), s('path', { class: 'fre-b frente-anda zag-front', d, stroke: corFac(ctx, x.b) }));
    }
  }

  /* As rotas por mar: a linha tracejada entre dois portos ligados, com os dias (camada Rotas); a travessia de uma rota
     por ela fica azul (trechosDeMar). */
  function marDoMapa(m) {
    const out = new Set();
    try { for (const L of N().ligacoesMar ? N().ligacoesMar(m) : []) if (L.ka && L.kb) { out.add(L.ka + '|' + L.kb); out.add(L.kb + '|' + L.ka); } } catch (e) { /* núcleo antigo */ }
    return out;
  }
  function trechosDeMar(ctx, pts) {
    const out = [];
    if (!ctx || !ctx.marHex || !ctx.marHex.size || !Array.isArray(pts) || !temGrade(ctx.m)) return out;
    const hk = p => { const hx = N().hexDe(ctx.m, p[0], p[1]); return hx ? hx.q + ',' + hx.r : ''; };
    for (let i = 0; i + 1 < pts.length; i++) { const a = hk(pts[i]), b = hk(pts[i + 1]); if (a !== b && ctx.marHex.has(a + '|' + b)) out.push(i); }
    return out;
  }
  let mlanChave = null;
  function desenharMar(m) {
    const ls = camVisivel('rotas') && N().ligacoesMar ? N().ligacoesMar(m) : [];
    const it = ls.map(L => { const a = indice.get(L.a), b = indice.get(L.b); return a && b ? [L.d, a.x, a.y, b.x, b.y] : null; }).filter(Boolean);
    const chave = JSON.stringify(it);
    if (chave === mlanChave) return;
    mlanChave = chave;
    C.mlan.replaceChildren();
    for (const [d, ax, ay, bx, by] of it) {
      C.mlan.append(s('path', { class: 'mar-rota', d: caminho([[ax, ay], [bx, by]]) }));
      const fx = fixo((ax + bx) / 2, (ay + by) / 2);
      fx.append(rotulo(d === 1 ? '1 dia de mar' : d + ' dias de mar', 18, 'rotulo rotulo-mar'));  // embaixo da linha: em cima fica o nome da rota que passa por ela
      C.mlan.append(fx);
    }
  }

  /* As setas de ofensiva: a livre (o objeto da seta, que o mestre desenha com a ferramenta Frente) e a da marcha
     planejada de um grupo (da posição dele até o fim da rota), curvas, na cor da facção, andando. */
  function curva(pts) {
    if (pts.length < 3) return caminho(pts);
    let d = 'M' + um(pts[0][0]) + ' ' + um(pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += 'C' + um(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + um(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + um(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + um(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + um(p2[0]) + ' ' + um(p2[1]);
    }
    return d;
  }
  function desenharSeta(g0, pts, cor, nome) {
    const d = curva(pts), n = pts.length, fim = pts[n - 1], ant = pts[n - 2];
    g0.append(s('path', { class: 'set-fundo', d }), s('path', { class: 'set-linha set-anda', d, stroke: cor }));
    const ang = Math.atan2(fim[1] - ant[1], fim[0] - ant[0]) * 180 / Math.PI, fx = fixo(fim[0], fim[1]);
    fx.append(s('path', { class: 'set-ponta', d: 'M6 0L-11 -10L-7 0L-11 10Z', fill: cor, transform: 'rotate(' + um(ang) + ')' }));
    g0.append(fx);
    if (nome) { const c = meioDe(pts), f2 = fixo(c[0], c[1]); f2.append(rotulo(nome, -12, 'rotulo rotulo-linha')); g0.append(f2); }
  }
  const corDaSeta = (ctx, fac, cor0) => (fac && ctx.fac.get(fac) ? corFac(ctx, fac) : cor0 || '#c0503a');
  function seta(g0, o, ctx) {
    if (!Array.isArray(o.pts) || o.pts.length < 2) return;
    g0.classList.add('set');
    desenharSeta(g0, o.pts, o.cor || corDaSeta(ctx, o.fac, ''), o.nome);
    g0.append(s('path', { class: 'set-hit', d: curva(o.pts) }));
  }
  let setgChave = null;
  function desenharSetasDosGrupos(m, ctx) {
    const lista = [];
    if (camVisivel('guerra')) for (const o of m.objs || []) {
      if (o.k !== 'g') continue;
      let pts = Array.isArray(o.sp) ? o.sp : null;
      if (!pts && ctx.mestre && o.seta && N().setaDaMarcha) { try { pts = N().setaDaMarcha(m, o); } catch (e) { pts = null; } }
      if (pts && pts.length >= 2) lista.push([o.id, pts, corDaSeta(ctx, o.fac, o.cor || '#e6ab4f')]);
    }
    const chave = JSON.stringify(lista);
    if (chave === setgChave) return;
    setgChave = chave;
    C.setg.replaceChildren();
    for (const [id, pts, cor] of lista) { const g1 = s('g', { class: 'setg', 'data-de': id }); desenharSeta(g1, pts, cor, ''); C.setg.append(g1); }
  }

  /* O ajuste da zona de guerra (a ferramenta Frente, "Ajustar a zona"): pôr, tirar, ou voltar ao automático. */
  function aplicarAjusteZona(chaves) {
    const modo = opt('zAj') === 'tira' ? 'tira' : opt('zAj') === 'auto' ? 'auto' : 'por';
    const rot = modo === 'por' ? 'pôr hexágonos na zona de guerra' : modo === 'tira' ? 'tirar hexágonos da zona de guerra' : 'voltar hexágonos da zona ao automático';
    App.mudar(rot, d => {
      if (!d.guerra || typeof d.guerra !== 'object') d.guerra = { tipos: [], bats: [], hexes: {} };
      const z = d.guerra.zona && typeof d.guerra.zona === 'object' ? d.guerra.zona : {}, antes = JSON.stringify([z.add || [], z.tira || []]);
      const add = new Set(z.add || []), tira = new Set(z.tira || []);
      for (const k of chaves) { add.delete(k); tira.delete(k); if (modo === 'por') add.add(k); else if (modo === 'tira') tira.add(k); }
      const nz = Object.assign({}, z);
      if (add.size) nz.add = [...add]; else delete nz.add;
      if (tira.size) nz.tira = [...tira]; else delete nz.tira;
      if (JSON.stringify([nz.add || [], nz.tira || []]) === antes) return false;
      if (Object.keys(nz).length) d.guerra.zona = nz; else delete d.guerra.zona;
    });
  }

  /* Os recursos por hexágono (a ferramenta Terreno, "Recurso…"): o pincel põe um recurso e quanto ele dá por semana em
     cada hexágono (soma com o do terreno, na conta da região); "Tirar os recursos" limpa. Enquanto o pincel está nesse
     modo, cada hexágono com recurso mostra o que tem. */
  const ecoLigada = m => !!(m && m.eco && m.eco.on && Array.isArray(m.eco.rec) && m.eco.rec.length);
  function recDoPincel() { const e = M && M.eco; return e && Array.isArray(e.rec) ? e.rec.find(r => r.id === opt('recPin')) || e.rec[0] || null : null; }
  const qtdDoPincel = () => { const n = Math.round(Number(opt('recQtd')) * 10) / 10; return Number.isFinite(n) ? limitar(n, -9999, 9999) : 1; };
  function aplicarRecursoHex(chaves) {
    const rec = recDoPincel(), tirar = opt('terModo') === 'semrec', qtd = qtdDoPincel();
    if (!ecoLigada(M) || !rec) { App.toast('Ligue a economia na aba Reinos para pôr recursos nos hexágonos.'); return; }
    const lim = (N().LIMITES && N().LIMITES.hexes) || 20000;
    let passou = false;
    App.mudar(tirar ? 'tirar os recursos dos hexágonos' : 'pôr ' + rec.nome + ' nos hexágonos', d => {
      if (!d.eco || typeof d.eco !== 'object') return false;
      const hr = d.eco.hexr && typeof d.eco.hexr === 'object' ? Object.assign({}, d.eco.hexr) : {}, antes = JSON.stringify(hr);
      for (const k of chaves) {
        if (tirar) { delete hr[k]; continue; }
        const t = Object.assign({}, hr[k] || {});
        if (qtd) t[rec.id] = qtd; else delete t[rec.id];
        if (Object.keys(t).length) hr[k] = t; else delete hr[k];
      }
      if (JSON.stringify(hr) === antes) return false;
      if (Object.keys(hr).length > lim) { passou = true; return false; }
      if (Object.keys(hr).length) d.eco.hexr = hr; else delete d.eco.hexr;
    });
    if (passou) App.toast('O mapa chegou ao limite de ' + num(lim, 0) + ' hexágonos com recurso. Nada mudou.');
  }
  let hexrChave = null;
  function desenharRecursosHex(m) {
    const on = mestreVe() && podeEditar() && ferramenta() === 'h' && modoTerreno() === 'hex' && (opt('terModo') === 'rec' || opt('terModo') === 'semrec') && ecoLigada(m) && temGrade(m);
    const hr = on && m.eco.hexr ? m.eco.hexr : null, ks = hr ? Object.keys(hr).slice(0, 800) : [];
    const chave = hr ? JSON.stringify([m.grade, ks.map(k => [k, hr[k]]), m.eco.rec.map(r => [r.id, r.nome, r.cor])]) : '';
    if (chave === hexrChave) return;
    hexrChave = chave;
    C.hexr.replaceChildren();
    for (const k of ks) {
      const h0 = N().lerChaveHex(k);
      if (!h0) continue;
      const c = N().centroHex(m, h0.q, h0.r), fx = fixo(c.x, c.y), ids = Object.keys(hr[k]);
      ids.slice(0, 3).forEach((id, i) => {
        const r = m.eco.rec.find(x => x.id === id), n = hr[k][id], y = (i - (Math.min(3, ids.length) - 1) / 2) * 13;
        fx.append(s('circle', { class: 'hexr-bola', cx: -15, cy: um(y), r: 4.5, fill: r ? r.cor : '#9aa3b5' }),
          s('text', { class: 'hexr-txt', x: -8, y: um(y + 4), 'font-size': 11, texto: (n > 0 ? '+' : '') + num(n, 1) + ' ' + curto(r ? r.nome : id, 12) }));
      });
      C.hexr.append(fx);
    }
  }

  /* ---- a caneta (para todos): o traço de agora, que todos na mesa veem ----
     Duas canetas: a que some em poucos segundos e a que fica até alguém limpar ("Limpar desenhos", do mestre, apaga a de
     todos; quem joga limpa a dele). Cada pessoa tem a cor dela. Quem guarda e manda é o App (mundo.js); aqui só o gesto e
     o desenho. O traço vai sendo mandado enquanto é desenhado (a cada pouco), para os outros verem ao vivo. */
  let canetaBt = null, rabVivo = null, rabChave = null, rabTempo = 0;
  function montarCaneta() {
    const caixa = palco && palco.querySelector('.zoom');
    if (!caixa || canetaBt) return;
    canetaBt = h('button', { type: 'button', class: 'ib caneta-bt', id: 'zCaneta', title: 'Caneta (W): desenhar no mapa para todos verem', 'aria-label': 'Caneta', 'aria-pressed': 'false', hidden: true });
    const ic = s('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
    ic.innerHTML = ICONE_FERRAMENTA.w;                           // desenho fixo, sem texto de ninguém
    canetaBt.append(ic);
    canetaBt.addEventListener('click', () => { if (App && podeRabiscar()) App.usarFerramenta(App.ferramenta === 'w' ? 'sel' : 'w'); });
    caixa.prepend(canetaBt);
  }
  function pintarCaneta() {
    if (!canetaBt) return;
    canetaBt.hidden = !podeRabiscar();
    canetaBt.setAttribute('aria-pressed', String(ferramenta() === 'w'));
  }
  function comecarRabisco(gg) {
    gg.cor = App.minhaCor ? App.minhaCor() : '#e6ab4f';
    gg.some = !(App.rabModo && App.rabModo() === 'fica');
    gg.id = 'rb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    gg.ultEnvio = performance.now();
    if (rabVivo) rabVivo.remove();
    rabVivo = s('path', { class: 'rab rab-vivo', stroke: gg.cor, d: caminho(gg.pts) + 'l0.01 0' });
    C.rab.append(rabVivo);
  }
  const tracoDe = gg => ({ id: gg.id, c: gg.cor, s: gg.some, p: simplificar(gg.pts, 0.7 / V.z).map(q => [um(q[0]), um(q[1])]) });
  function maisRabisco(gg, p) {
    const ult = gg.pts[gg.pts.length - 1], q = [um(limitar(p.x, 0, L)), um(limitar(p.y, 0, A))];
    if (Math.hypot((q[0] - ult[0]) * V.z, (q[1] - ult[1]) * V.z) < 2.5 || gg.pts.length >= 2000) return;
    gg.pts.push(q);
    if (rabVivo) rabVivo.setAttribute('d', caminho(gg.pts));
    const agora = performance.now();
    if (agora - gg.ultEnvio > 700 && App.rabiscar) { gg.ultEnvio = agora; gg.mandou = true; App.rabiscar(tracoDe(gg), true); }
  }
  function fimRabisco(gg, p) {
    if (p) maisRabisco(gg, p);
    if (gg.pts.length === 1) gg.pts.push([um(gg.pts[0][0] + 0.2 / V.z), gg.pts[0][1]]);       // (um toque: um ponto)
    if (App.rabiscar) App.rabiscar(tracoDe(gg), false);
    if (rabVivo) { rabVivo.remove(); rabVivo = null; }
    rabChave = null;
  }
  function largarRabisco(gg) {
    if (rabVivo) { rabVivo.remove(); rabVivo = null; }
    if (gg.mandou && App.tirarRabisco) App.tirarRabisco(gg.id);
  }
  function desenharRabiscos(m) {
    clearTimeout(rabTempo);
    const lista = camVisivel('desenhos') && App.rabiscosDe ? App.rabiscosDe(m.id) : [];
    const chave = JSON.stringify(lista.map(t => [t.id, t.c, t.p.length, t.s ? 1 : 0]));
    if (chave !== rabChave) {
      rabChave = chave;
      const vivo = rabVivo;
      C.rab.replaceChildren();
      for (const t of lista) {
        const el = s('path', { class: 'rab' + (t.s ? ' rab-some' : ''), stroke: t.c, d: caminho(t.p) + (t.p.length < 3 ? 'l0.01 0' : '') });
        if (t.s) el.style.animationDelay = (-Math.max(0, t.idade || 0) / 1000).toFixed(2) + 's';
        C.rab.append(el);
      }
      if (vivo) C.rab.append(vivo);
    }
    const prox = lista.filter(t => t.s).reduce((mn, t) => Math.min(mn, t.resta), Infinity);
    if (prox < Infinity) rabTempo = setTimeout(agendar, Math.max(60, prox + 40));
  }
  function optsCaneta() {
    const modo = App.rabModo ? App.rabModo() : 'some', mestra = App.papel === 'mestre' && !App.comoJogador;
    optsEl.append(...[['some', 'Some em segundos', 'O traço apaga sozinho em poucos segundos'], ['fica', 'Fica até limpar', 'O traço fica no mapa até alguém limpar']]
      .map(([v, tx, dica]) => chip({ 'aria-pressed': String(modo === v), title: dica, onclick: () => { if (App.rabModo) App.rabModo(v); desenharOpts(true); atualizarDica(); } }, tx)));
    const cores = App.coresCaneta ? App.coresCaneta() : [], minha = App.minhaCor ? App.minhaCor() : '';
    if (cores.length) {
      const caixa = h('span', { class: 'chip cores-caneta', role: 'group', 'aria-label': 'A cor da sua caneta' });
      for (const c of cores) caixa.append(h('button', { type: 'button', class: 'cor-caneta', title: 'Esta cor', 'aria-label': 'Cor ' + c, 'aria-pressed': String(c === minha), style: 'background:' + c,
        onclick: () => { if (App.mudarCor) App.mudarCor(c); desenharOpts(true); } }));
      optsEl.append(caixa);
    }
    const meus = App.rabiscosMeus ? App.rabiscosMeus(M.id) : 0, todos = App.rabiscosDe ? App.rabiscosDe(M.id).length : 0;
    optsEl.append(
      chip({ title: 'Desfazer o seu último traço', disabled: !meus, onclick: () => App.desfazerRabisco(M.id) }, 'Desfazer o meu último'),
      chip({ title: 'Apagar os seus traços neste mapa', disabled: !meus, onclick: () => App.limparRabiscos(M.id, false) }, 'Limpar os meus'));
    if (mestra) optsEl.append(chip({ class: 'chip per', title: 'Apagar os traços de todos neste mapa (o aviso deixa desfazer)', disabled: !todos, onclick: () => App.limparRabiscos(M.id, true) }, 'Limpar desenhos'));
  }

  /* ---- trilho, opções e dica ---- */
  function montarTrilho() {
    railEl.replaceChildren();
    const ordem = COMO_ANTES ? FERRAMENTAS.map(f => [null, f]) : GRUPOS_TRILHO.flatMap(([g, ids]) => ids.map((id, i) => [i === 0 ? g : null, FERRAMENTAS.find(f => f.id === id)]));
    for (const [grupo, f] of ordem) {
      if (grupo) { if (railEl.childNodes.length) railEl.append(h('hr')); railEl.append(h('span', { class: 'rail-g', 'aria-hidden': 'true', texto: grupo })); }
      const b = h('button', { type: 'button', class: 'tool', 'data-f': f.id, 'aria-pressed': 'false', title: `${f.nome} (${f.tecla})`, 'aria-label': f.nome, 'aria-keyshortcuts': f.tecla });
      const ic = s('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
      ic.innerHTML = ICONE_FERRAMENTA[f.id];                 // desenho fixo, sem texto de ninguém
      b.append(ic);
      b.addEventListener('click', () => { if (App && (podeEditar() || (f.id === 'w' && podeRabiscar()))) App.usarFerramenta(f.id); });
      railEl.append(b);
      if (COMO_ANTES && SEPARA_DEPOIS.has(f.id)) railEl.append(h('hr'));
    }
  }
  function pintarTrilho() {
    if (!railEl) return;
    const f = ferramenta(), editar = podeEditar();
    for (const b of railEl.querySelectorAll('.tool')) {
      b.setAttribute('aria-pressed', String(b.dataset.f === f));
      b.disabled = !editar && b.dataset.f !== 'sel' && !(b.dataset.f === 'w' && podeRabiscar());
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
      f === 'h' && M ? [temGrade(M), (M.terrenos || []).map(t => [t.id, t.nome, t.cor]), !!(M.pintura && M.pintura.ops && M.pintura.ops.length), ecoLigada(M) ? M.eco.rec.map(r => [r.id, r.nome, r.cor]) : null] : null,
      // (lote 17) a caneta: os traços de quem desenha (para os botões), a cor e a caneta escolhidas
      f === 'w' && M && App.rabiscosMeus ? [App.rabiscosMeus(M.id), (App.rabiscosDe(M.id) || []).length, App.minhaCor(), App.rabModo(), podeRabiscar(), App.papel, !!App.comoJogador] : null]);
    if (!forcar && chave === optsChave) return;
    optsChave = chave;
    // não derruba um seletor aberto: quem está escolhendo termina antes
    if (!forcar && optsEl.contains(document.activeElement) && document.activeElement.tagName === 'SELECT') { optsChave = null; return; }
    optsEl.replaceChildren();
    if (!editar) { if (f === 'w' && M && podeRabiscar()) optsCaneta(); return; }       // (lote 17) quem joga também tem a caneta
    const reabrir = () => desenharOpts(true);
    // trocar o modo de uma ferramenta (o desenho por pontos que estava pela metade fica para trás)
    const trocarModo = (nome, v) => { porOpt(nome, v); rasc = null; reabrir(); atualizarDica(); desenharRascunho(); };
    const chips = (nome, atual, lista) => lista.map(([v, tx, dica]) => chip({ 'aria-pressed': String(atual === v), title: dica, onclick: () => trocarModo(nome, v) }, tx));
    if (f === 'm') {
      const def = defIcone(opt('ic'));
      optsEl.append(
        chip({ 'aria-haspopup': 'menu', title: 'Escolher o ícone do novo marcador', onclick: ev => abrirIcones(ev.currentTarget) }, miniSelo(def, def.cor || '#e6ab4f'), def.nome),
        chip({ 'aria-pressed': String(!!opt('rumor')), title: 'Os jogadores veem o marcador como boato', onclick: () => { porOpt('rumor', !opt('rumor')); reabrir(); } }, 'É boato'));
    } else if (f === 'g') {
      // (lote 7, parte 5b) o tipo: o grupo de sempre, ou um grupo do mundo (nasce escondido dos jogadores)
      const TG = dicionario('TIPOS_GRUPO');
      optsEl.append(seletor('Tipo', TG[opt('tipoGrupo')] ? opt('tipoGrupo') : '', [['', 'Grupo']].concat(Object.keys(TG).map(k => [k, TG[k].nome])), v => { porOpt('tipoGrupo', v); atualizarDica(); }));
    } else if (f === 'e') {
      const E = dicionario('EVENTOS');
      optsEl.append(seletor('Evento', opt('tipo'), Object.keys(E).map(k => [k, E[k].nome]), v => porOpt('tipo', v)));
    } else if (f === 't') {
      const Vi = dicionario('VIAS');
      optsEl.append(seletor('Via', opt('via'), Object.keys(Vi).map(k => [k, Vi[k].nome]), v => porOpt('via', v)));
    } else if (f === 'f') {
      const lista = [['', 'Sem facção']].concat(facs.map(x => [x[0], x[1] || 'Facção sem nome']));
      const val = id => (id && facs.some(x => x[0] === id) ? id : '');
      // (lote 7, parte 5c) a zona de perigo: o tipo, no lugar dos lados
      const fm = opt('freModo'), Z = dicionario('ZONAS');
      const modo = fm === 'zona' ? 'zona' : fm === 'perigo' && Z.frio ? 'perigo' : fm === 'seta' ? 'seta' : fm === 'ajuste' ? 'ajuste' : 'linha';
      optsEl.append(...chips('freModo', modo, [['linha', 'Linha de frente', 'Uma linha de combate entre duas facções'], ['zona', 'Zona de guerra', 'A área em guerra entre duas facções (pode mudar com o tempo)']]
        .concat(Z.frio ? [['perigo', 'Zona de perigo', 'Uma área que cansa, desconforta ou assusta quem passa o dia dentro: tempestade, praga, frio extremo, terra amaldiçoada, território de monstro']] : [])
        // (lote 17) a seta de ofensiva e o ajuste da zona de guerra automática
        .concat([['seta', 'Seta de ofensiva', 'Uma seta curva, na cor da facção, que mostra para onde vai o ataque'], ['ajuste', 'Ajustar a zona', 'Pinte para pôr ou tirar hexágonos da zona de guerra automática']])));
      if (modo === 'perigo') optsEl.append(seletor('Tipo', Z[opt('zonaTipo')] && opt('zonaTipo') !== 'guerra' ? opt('zonaTipo') : 'tempestade', Object.keys(Z).filter(k => k !== 'guerra').map(k => [k, Z[k].nome]), v => { porOpt('zonaTipo', v); atualizarDica(); }));
      else if (modo === 'seta') optsEl.append(seletor('Facção', val(opt('setaFac')), lista, v => porOpt('setaFac', v || null)));
      else if (modo === 'ajuste') {
        const aj = opt('zAj') === 'tira' ? 'tira' : opt('zAj') === 'auto' ? 'auto' : 'por';
        optsEl.append(...chips('zAj', aj, [['por', 'Pôr na zona', 'Os hexágonos pintados entram na zona de guerra'], ['tira', 'Tirar da zona', 'Os hexágonos pintados saem da zona de guerra'],
          ['auto', 'Automático', 'Os hexágonos pintados voltam a seguir a conta automática']]),
          seletor('Tamanho', String(limitar(Math.round(Number(opt('hexPincel')) || 0), 0, 2)), [['0', '1 hexágono'], ['1', '7 hexágonos'], ['2', '19 hexágonos']], v => { porOpt('hexPincel', Number(v)); desenharRascunho(); }));
        if (M.guerra && M.guerra.zona && M.guerra.zona.off) optsEl.append(chip({ class: 'chip pri', title: 'A zona automática está desligada (aba Guerra)', onclick: () => abrirAba('guerra') }, 'A zona está desligada…'));
      }
      else optsEl.append(
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
        const comRec = ecoLigada(M), t = terrenoEscolhido(), modo = ['ter', 'nada', 'desenho', 'custo', 'semcusto'].concat(comRec ? ['rec', 'semrec'] : []).includes(opt('terModo')) ? opt('terModo') : 'ter';
        const sel = h('select', { 'aria-label': 'O que o pincel faz' });
        for (const x of M.terrenos || []) sel.append(h('option', { value: 'ter:' + x.id, texto: x.nome }));
        // (lote 17) os recursos por hexágono (com a economia ligada): somam aos do terreno
        const modos = [['nada', 'Sem terreno'], temDesenho ? ['desenho', 'Seguir o desenho'] : null, ['custo', 'Custo próprio…'], ['semcusto', 'Tirar o custo próprio'],
          comRec ? ['rec', 'Recurso…'] : null, comRec ? ['semrec', 'Tirar os recursos'] : null].filter(Boolean);
        for (const [v, tx] of modos) sel.append(h('option', { value: v, texto: tx }));
        sel.value = modo === 'ter' ? (t ? 'ter:' + t.id : 'nada') : modo === 'desenho' && !temDesenho ? 'nada' : modo;
        sel.addEventListener('change', () => {
          const v = sel.value;
          if (v.startsWith('ter:')) { porOpt('terModo', 'ter'); porOpt('ter', v.slice(4)); } else porOpt('terModo', v);
          reabrir(); atualizarDica(); desenharRascunho();
        });
        optsEl.append(h('label', { class: 'chip', title: 'O que o pincel pinta nos hexágonos' },
          h('span', { class: 'amostra', style: 'background:' + (modo === 'ter' && t ? t.cor : modo === 'custo' ? '#e6ab4f' : modo === 'rec' ? ((recDoPincel() || {}).cor || '#f2c14e') : 'transparent') }), h('span', { texto: 'Pincel' }), sel));
        if (modo === 'rec') {
          const r = recDoPincel(), sr = h('select', { 'aria-label': 'O recurso que o pincel põe' });
          for (const x of M.eco.rec) sr.append(h('option', { value: x.id, texto: x.nome }));
          sr.value = r ? r.id : '';
          sr.addEventListener('change', () => { porOpt('recPin', sr.value); reabrir(); atualizarDica(); });
          const qi = h('input', { type: 'number', min: -9999, max: 9999, step: 1, value: String(qtdDoPincel()), 'aria-label': 'Quanto o hexágono produz por semana', class: 'num' });
          qi.addEventListener('change', () => { const n = Number(String(qi.value).replace(',', '.')); if (Number.isFinite(n)) porOpt('recQtd', Math.round(limitar(n, -9999, 9999) * 10) / 10); qi.value = String(qtdDoPincel()); atualizarDica(); });
          optsEl.append(h('label', { class: 'chip', title: 'O recurso que o hexágono produz por semana, além do terreno' }, h('span', { texto: 'Recurso' }), sr),
            h('label', { class: 'chip', title: 'Quanto, por semana (0 tira este recurso)' }, qi, h('span', { texto: 'por semana' })));
        }
        if (modo === 'custo') {
          const ci = h('input', { type: 'number', min: 0.1, max: 9999, step: 0.5, value: String(Number(opt('custo')) || 10), 'aria-label': 'Custo próprio, em cubos por hexágono', class: 'num' });
          ci.addEventListener('change', () => { const n = Number(String(ci.value).replace(',', '.')); if (Number.isFinite(n) && n > 0) porOpt('custo', Math.round(limitar(n, 0.1, 9999) * 10) / 10); ci.value = String(opt('custo')); atualizarDica(); });
          optsEl.append(h('label', { class: 'chip', title: 'Quantos cubos custa atravessar estes hexágonos' }, h('span', { texto: 'Custo' }), ci, h('span', { texto: 'cubos' })));
        }
        optsEl.append(seletor('Tamanho', String(limitar(Math.round(Number(opt('hexPincel')) || 0), 0, 2)), [['0', '1 hexágono'], ['1', '7 hexágonos'], ['2', '19 hexágonos']], v => { porOpt('hexPincel', Number(v)); desenharRascunho(); }));
      }
    } else if (f === 'w') {
      optsCaneta();                                             // (lote 17) a caneta
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
    if ((f in NOVO && !(f === 'f' && opt('freModo') === 'ajuste')) || f === 'p') optsEl.append(chip({ 'aria-pressed': String(!!opt('oculto')), title: 'O que você criar agora já nasce escondido dos jogadores',
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
    // (lote 17) a caneta, para todos
    if (ferramenta() === 'w') {
      const fica = App.rabModo && App.rabModo() === 'fica';
      return (tq ? 'Arraste o dedo para desenhar' : 'Arraste para desenhar') + ': todos na mesa veem na hora. ' + (fica ? 'Esta caneta fica até alguém limpar.' : 'Esta caneta some sozinha em poucos segundos.')
        + (tq ? '' : ' Esc volta para Selecionar.');
    }
    if (App.papel === 'mestre' && App.comoJogador) return 'Vendo como jogador: assim os jogadores veem o mapa. Nada aqui muda o mapa.';
    if (!podeEditar()) return tq ? 'Toque num lugar para ler sobre ele. Arraste para andar; pince para aproximar.' : 'Clique num lugar para ler sobre ele. Arraste para andar pelo mapa; a roda do mouse aproxima.';
    // (lote 7, parte 5b) um clique pedido pelo painel (a parada na rota)
    if (pegando) return pegando.dica + (tq ? '' : ' Esc cancela.');
    const f = ferramenta(), n = rasc ? rasc.pts.length : 0;
    // no celular a dica é curta e sem teclas: os chips de cima fazem o papel do Enter, do Backspace e do Esc
    const fim = tq ? '' : ' Backspace tira o último ponto; Esc cancela.';
    switch (f) {
      case 'm': return `${Cl} no mapa para pôr o marcador.` + (tq ? '' : ' Esc volta para Selecionar.');
      case 'g': {
        const TG = dicionario('TIPOS_GRUPO')[opt('tipoGrupo')];
        return (TG ? `${Cl} no mapa para pôr a ${TG.nome.toLocaleLowerCase('pt-BR')} (nasce escondida dos jogadores).` : `${Cl} no mapa para pôr o grupo.`) + (tq ? '' : ' Esc volta para Selecionar.');
      }
      case 'e': return `${Cl} para pôr o evento, ou arraste para escolher o tamanho da área.` + (tq ? '' : ' Esc volta para Selecionar.');
      case 'r':
        if (!n) return `${Cl} para pôr o primeiro ponto da região.`;
        if (n < 3) return `${Cl} para pôr mais pontos (uma região tem pelo menos 3).` + fim;
        return tq ? 'Toque para mais pontos, ou no primeiro ponto para fechar.' : 'Clique para mais pontos. Clique no primeiro ponto ou aperte Enter para fechar.' + fim;
      case 't': case 'f': {
        // (lote 17) o ajuste da zona automática e a seta de ofensiva
        if (f === 'f' && opt('freModo') === 'ajuste') {
          if (!temGrade(M)) return 'A zona de guerra automática precisa da grade de hexágonos (aba Terreno).';
          const aj = opt('zAj') === 'tira' ? 'tirar da zona de guerra' : opt('zAj') === 'auto' ? 'que voltem a seguir a zona automática' : 'pôr na zona de guerra';
          return 'Arraste sobre os hexágonos para ' + aj + '.' + (tq ? '' : ' Cada traço é um passo de desfazer.');
        }
        if (f === 'f' && opt('freModo') === 'seta') {
          if (!n) return `${Cl} para pôr o começo da seta (a ponta fica no último ponto).`;
          return tq ? 'Toque para mais pontos (a seta faz a curva); toque de novo no último para terminar.' : 'Clique para mais pontos (a seta faz a curva por eles). Duplo clique ou Enter termina.' + fim;
        }
        if (f === 'f' && (opt('freModo') === 'zona' || opt('freModo') === 'perigo')) {
          const Zp = opt('freModo') === 'perigo' ? dicionario('ZONAS')[opt('zonaTipo')] : null;
          if (!n) return Zp ? `${Cl} para pôr o primeiro ponto da zona de perigo (${Zp.nome.toLocaleLowerCase('pt-BR')}).` : `${Cl} para pôr o primeiro ponto da zona de guerra (as cores vêm dos lados A e B).`;
          if (n < 3) return `${Cl} para pôr mais pontos (uma zona tem pelo menos 3).` + fim;
          return tq ? 'Toque para mais pontos, ou no primeiro ponto para fechar.' : 'Clique para mais pontos. Clique no primeiro ponto ou aperte Enter para fechar.' + fim;
        }
        // (lote 7, parte 5b) a rota de uma caravana (ou de um evento que anda): ela vai para o começo da rota
        if (f === 't' && App.rotaPara && !n) return `A rota de "${App.rotaPara.nome}": ${Cl.toLocaleLowerCase('pt-BR')} onde ela começa (${App.rotaPara.k === 'e' ? 'o evento vai' : 'o grupo vai'} para lá) e nos pontos do caminho.` + (tq ? '' : ' Duplo clique ou Enter termina; Esc cancela.');
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
        const r0 = modo === 'rec' ? recDoPincel() : null;
        const o = modo === 'rec' ? (r0 ? 'Arraste sobre os hexágonos para que produzam ' + num(qtdDoPincel(), 1) + ' de ' + r0.nome + ' por semana, além do terreno (0 tira).' : 'Ligue a economia na aba Reinos para pôr recursos.')
          : modo === 'semrec' ? 'Arraste sobre os hexágonos para tirar os recursos que o pincel pôs (o do terreno fica).'
          : modo === 'nada' ? 'Arraste sobre os hexágonos para tirar o terreno.' : modo === 'desenho' ? 'Arraste sobre os hexágonos para que voltem a seguir o desenho à mão.' : modo === 'custo' ? 'Arraste sobre os hexágonos para que custem ' + num(Number(opt('custo')) || 0, 1) + ' cubos.'
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
    if (Cam() && camadaParada(Cam().deObj(Object.assign({}, campos, { k })))) return null;     // (lote 8) camada escondida ou travada
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
    if (k === 'g') {
      const tg = opt('tipoGrupo'), campos = N().camposDoTipo ? N().camposDoTipo(tg) : {};
      return criar('g', Object.assign({ x: q.x, y: q.y }, campos, extra), { caravana: 'nova caravana', patrulha: 'nova patrulha', exercito: 'novo exército' }[campos.tipo]);
    }
    if (k === 'e') return criar('e', Object.assign({ x: q.x, y: q.y, tipo: opt('tipo'), r: RAIO_EVENTO, ini: (App.mapa.cal && App.mapa.cal.dia) || 0, peso: N().pesoPadrao(opt('tipo')) }, extra));
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
    if (f === 'f') return opt('freModo') === 'zona' || opt('freModo') === 'perigo' ? 'z' : opt('freModo') === 'seta' ? 'a' : opt('freModo') === 'ajuste' ? null : 'f';
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
    // (lote 7, parte 5b) "Desenhar a rota" no painel de um grupo do mundo (ou de um evento que anda): a rota nasce escondida
    // no mapa (e dos jogadores) e já é dele, que vai para o começo dela — um passo de desfazer só
    if (k === 't' && App.rotaPara) {
      const alvo = App.rotaPara;
      App.rotaPara = null;
      let id = null;
      App.mudar('desenhar a rota de "' + alvo.nome + '"', d => {
        const o = (d.objs || []).find(x => x.id === alvo.id);
        if (!o) return false;
        const rt = N().objNovo('t', Object.assign({ esc: true, oculto: true, nome: 'Rota de ' + alvo.nome }, campos));
        if (!rt) return false;
        d.objs.push(rt);
        o.rota = rt.id; o.prog = 0; o.x = rt.pts[0][0]; o.y = rt.pts[0][1]; delete o.sentido; delete o.espera;
        id = o.id;
      });
      if (App.ferramenta !== 'sel') App.usarFerramenta('sel');
      if (id) { App.selecionar([id]); if (painelVisivel()) abrirAba('selecao'); }
      desenharRascunho(); desenharOpts(); atualizarDica();
      return;
    }
    if (k === 'f' || k === 'z') { campos.a = opt('a') || null; campos.b = opt('b') || null; }
    if (k === 'a') campos.fac = (M.faccoes || []).some(x => x.id === opt('setaFac')) ? opt('setaFac') : null;     // (lote 17) a seta: a facção
    if (k === 'z') campos.ini = (App.mapa.cal && App.mapa.cal.dia) || 0;
    // (lote 7, parte 5c) a zona de perigo: o tipo (sem lados); os números de começo do tipo valem até o mestre mudar
    if (k === 'z' && opt('freModo') === 'perigo') {
      const Z = dicionario('ZONAS'), tp = Z[opt('zonaTipo')] && opt('zonaTipo') !== 'guerra' ? opt('zonaTipo') : 'tempestade';
      campos.tipo = tp; campos.a = null; campos.b = null;
      rot = 'nova zona de perigo';
    }
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
    // (lote 8) a ferramenta cria numa camada escondida ou travada neste aparelho: o clique só avisa (arrastar ainda anda pelo mapa)
    { const cam = editar ? camadaDaFerramenta(f) : null; if (cam && !camLivre(cam)) { comecar(e, 'parado', { cam }); return; } }
    // (lote 17) a caneta: o traço de agora, que todos veem
    if (f === 'w') {
      if (!podeRabiscar()) return;
      if (!camVisivel('desenhos')) { camadaParada('desenhos'); return; }
      comecar(e, 'rabisco', { ultEnvio: 0, id: null });
      g.pts = [[um(g.p0.x), um(g.p0.y)]];
      comecarRabisco(g);
      return;
    }
    if (f === 'm' || f === 'g') { comecar(e, 'por'); return; }
    // (lote 17) a zona de guerra: o pincel do ajuste (pôr, tirar, voltar ao automático)
    if (f === 'f' && opt('freModo') === 'ajuste') {
      if (!temGrade(M)) { App.toast('A zona automática precisa da grade de hexágonos: defina na aba Terreno.'); abrirAba('terreno'); return; }
      comecar(e, 'hexpincel', { hexes: new Map(), ult: null });
      C.tra.replaceChildren();
      C.tra.setAttribute('class', 'c-tra hexes');
      cursor = g.p0; pintarHex(g.p0); desenharRascunho();
      return;
    }
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
      if (g.tipo !== 'pincel' && g.tipo !== 'hexpincel' && g.tipo !== 'pintura' && g.tipo !== 'rabisco' && Math.hypot(dx, dy) < (g.toque ? 10 : 4)) return;
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
      case 'rabisco': maisRabisco(g, p); break;
      case 'carimbos': espalhar(p); break;
      case 'regua': regua.b = p; desenharRascunho(); atualizarDica(); break;
    }
  }
  // Passou do limite de um clique: decide o que o arrasto vira.
  function comecouArrastar() {
    const editar = podeEditar();
    if (g.tipo === 'fundo' || g.tipo === 'por' || g.tipo === 'ponto' || g.tipo === 'texto' || g.tipo === 'parado') { g.tipo = 'pan'; palco.classList.add('pan'); return; }
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
    finally { if (adiado || gg.tipo === 'mover' || gg.tipo === 'alca' || gg.tipo === 'pincel' || gg.tipo === 'hexpincel' || gg.tipo === 'pintura' || gg.tipo === 'carimbos' || gg.tipo === 'rabisco') redesenhar(); }
  }
  function terminarGesto(gg, p, e) {
    const editar = podeEditar();
    // (lote 7, parte 5b) o clique que o painel pediu (escolherPonto): vai para quem pediu, e nada mais acontece
    if (pegando && (gg.tipo === 'fundo' || gg.tipo === 'objeto')) { const pg = pegando; pegando = null; palco.classList.remove('pegando'); atualizarDica(); pg.ok(p); return; }
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
      case 'parado':
        camadaParada(gg.cam);
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
      case 'rabisco':
        fimRabisco(gg, p);
        break;
      case 'carimbos':
        C.tra.replaceChildren();
        if (!gg.moveu) { const q = preso(gg.p0); gg.lista = dentroDoMapa(gg.p0, 2) ? [{ x: q.x, y: q.y, ic: opt('carimbo'), tam: um(tamCarimbo()), px: pxCarimboNovo(), vira: false }] : []; }
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
    if (gg.tipo === 'rabisco') largarRabisco(gg);
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
      // (lote 8, parte 6) o hexágono daqui: destruído ou corrompido (a camada Guerra)
      const GP = window.MundoGuerraPainel, hx = GP && GP.menuHex ? GP.menuHex([p.x != null ? p.x : p[0], p.y != null ? p.y : p[1]]) : [];
      if (hx.length) itens.push(h('hr'), ...hx.map(([t, fn]) => item(t, fn)));
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
      if (Cam() && Cam().aberto()) { Cam().fechar(true); e.preventDefault(); return; }       // (lote 8) a janelinha das camadas
      if (medindo) { cancelarMedida(); e.preventDefault(); return; }
      if (pegando) { cancelarPonto(); e.preventDefault(); return; }
      if (rasc) { cancelarRascunho(); e.preventDefault(); if (App.rotaPara) { App.rotaPara = null; App.usarFerramenta('sel'); } return; }
      if (regua) { regua = null; desenharRascunho(); atualizarDica(); e.preventDefault(); return; }
      // numa ferramenta de criar, Esc volta para Selecionar (como a dica promete); em Selecionar, limpa a seleção
      if ((editar || ferramenta() === 'w') && App.ferramenta !== 'sel') { App.usarFerramenta('sel'); e.preventDefault(); return; }
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
    if (/^[1-9]$/.test(k) && window.MundoPainel && MundoPainel.abaPorNumero) { e.preventDefault(); MundoPainel.abaPorNumero(+k); return; }   // (lote 26) as abas do painel
    if (lk === 'c' && !e.repeat && Cam()) { e.preventDefault(); Cam().alternar(true); return; }    // (lote 8) as camadas (para todos)
    if ((editar || (POR_TECLA[lk] === 'w' && podeRabiscar())) && POR_TECLA[lk] && !e.repeat) { e.preventDefault(); App.usarFerramenta(POR_TECLA[lk]); }
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
  /* (lote 7, parte 5b) Esperar um clique no mapa (a parada na rota): a dica diz o que fazer; Esc, outra ferramenta ou
     outro pedido cancelam (null). Arrastar continua andando pelo mapa. */
  function escolherPonto(dica) {
    if (pegando) cancelarPonto();
    if (!App || !M || !palco) return Promise.resolve(null);
    return new Promise(ok => {
      rasc = null;
      pegando = { ok, dica: String(dica || 'Clique no mapa.') };
      if (App.ferramenta !== 'sel') App.usarFerramenta('sel');
      palco.classList.add('pegando');
      atualizarDica();
    });
  }
  function cancelarPonto() {
    if (!pegando) return;
    const pg = pegando;
    pegando = null;
    if (palco) palco.classList.remove('pegando');
    atualizarDica();
    pg.ok(null);
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
    // (a região fica por baixo de tudo — das estradas, dos rios e dos carimbos —; o nome dela, por cima deles: nreg)
    // (lote 17) zag: a zona de guerra automática; mlan: as rotas por mar; set e setg: as setas (as livres e as das marchas);
    // hexr: os recursos dos hexágonos (com o pincel); rab: a caneta
    for (const n of ['hex', 'reg', 'lin', 'car', 'hexg', 'zon', 'zag', 'nreg', 'txt', 'fre', 'rot', 'mlan', 'set', 'setg', 'eve', 'hexr', 'mar', 'nev', 'tra', 'gru', 'rab', 'sel', 'rasc']) { C[n] = s('g', { class: 'c-' + n }); svg.append(C[n]); }
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
    // (lote 8) as camadas: o botão na caixa do zoom e a janelinha; mudou alguma, redesenha
    if (Cam()) Cam().iniciar(App, palco);
    App.on('camadas', agendar);
    montarCaneta();                                                 // (lote 17) o botão da caneta, na caixa do zoom (para todos)
    App.on('rabiscos', agendar);

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
      if (pegando && App.ferramenta !== 'sel') cancelarPonto();
      if (App.rotaPara && App.ferramenta !== 't') App.rotaPara = null;
      if (g) cancelarGesto();
      fecharMenus();
      agendar();
      // (lote 8) a ferramenta cria numa camada escondida ou travada neste aparelho: avisa já (o clique também avisará)
      if (podeEditar()) camadaParada(camadaDaFerramenta(f));
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
    escolherPonto,
    cancelarPonto,
    ferramentas: FERRAMENTAS.map(f => ({ id: f.id, nome: f.nome, tecla: f.tecla })),
    get zoom() { return V.z; },
    set zoom(z) { if (palco) zoomNoMeio(z / V.z); },
  };
})();
