/* Tiny Cats · os minigames da Bancada (lote 142): alquimia, ferreiro e invenção, dois jeitos cada, seis níveis.
     Alquimia  · Caldeirão — mantenha o fogo na faixa até a poção pegar e ponha o ingrediente certo, na ordem da receita.
               · Destilar  — abra a válvula na medida, encha cada frasco até a marca e troque antes de passar.
     Ferreiro  · Forja     — aqueça o metal até a cor certa e martele no ponto marcado.
               · Têmpera   — mergulhe a lâmina na água na cor certa e afie no ritmo (as notas vermelhas não).
     Invenção  · Engrenagens — trave cada engrenagem quando o dente dela estiver no eixo.
               · Fiação    — gire as peças até a corrente sair da bateria e chegar em todas, antes da mola soltar.
   Níveis: Fácil, Médio, Difícil, Impossível, Absoluto, Lendário — mais passos, mais rápido, margem menor, tempo menor
   e, do Impossível para cima, as pegadinhas (o vento no fogo, a válvula que afrouxa, o ponto que anda, a nota falsa,
   a engrenagem que inverte, o fio que gira sozinho).
   TC.bancadaJogos.iniciar(el, { oficio, jeito, nivel, seed, aoFim(res), aoPasso(estado), vel }) → { parar, estado, acao }
   res: { ok, nota (0–100), erros, seg (os segundos usados), desistiu }. O jogo só desenha e conta: quem chama decide o
   que fazer com o resultado (a mesa ao vivo, o dano). */
(() => {
  'use strict';
  const W = typeof window !== 'undefined' ? window : globalThis;
  W.TC = W.TC || {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;

  const NIVEIS = Object.freeze([['facil', 'Fácil'], ['medio', 'Médio'], ['dificil', 'Difícil'], ['impossivel', 'Impossível'], ['absoluto', 'Absoluto'], ['lendario', 'Lendário']]);
  const nivDe = k => Math.max(0, NIVEIS.findIndex(n => n[0] === k));
  const OFICIOS = Object.freeze([
    ['alquimia', 'Alquimia', [['caldeirao', 'Caldeirão'], ['destilar', 'Destilar']]],
    ['ferreiro', 'Ferreiro', [['forja', 'Forja'], ['tempera', 'Têmpera']]],
    ['invencao', 'Invenção', [['engrenagens', 'Engrenagens'], ['fiacao', 'Fiação']]],
  ]);
  const oficioDe = k => OFICIOS.find(o => o[0] === k) || null;
  const nomeOficio = k => (oficioDe(k) || [k, k])[1];
  const jeitosDe = k => (oficioDe(k) || [0, 0, []])[2];
  const nomeJeito = k => { for (const o of OFICIOS) for (const j of o[2]) if (j[0] === k) return j[1]; return k; };
  const jeitoValido = (of, j) => jeitosDe(of).some(x => x[0] === j);
  // o tempo limite (segundos; 0 = sem pressa) e os erros que dá para cometer, por nível
  const TEMPO = [0, 150, 120, 100, 80, 60], ERROS = [6, 5, 4, 3, 3, 2];
  function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ================= os seis jogos =================
     Cada um: { ajuda, botoes: [[id, rótulo]], passos (quantos), init(J), passo(J, dt), desenho(J, g), tecla(J, k, desce),
     toque(J, x, y, desce), acao(J, id) }. J: { L (o nível 0–5), r (o sorteio), s (o estado do jogo), erro(txt),
     avanca(), fim(ok), msg(txt), seg } */
  const INGR = [
    { n: 'Raiz', c: '#8a5a2b', f: 'raiz' }, { n: 'Folha', c: '#4caf50', f: 'folha' }, { n: 'Cristal', c: '#4aa3e8', f: 'losango' },
    { n: 'Cogumelo', c: '#d0453a', f: 'cogumelo' }, { n: 'Pena', c: '#e8e8e8', f: 'pena' }, { n: 'Sal', c: '#b8b2a6', f: 'quadrado' },
    { n: 'Flor', c: '#e57ab8', f: 'flor' }, { n: 'Olho de sapo', c: '#e8c84a', f: 'olho' },
    // (as pegadinhas: a mesma cor, outra forma)
    { n: 'Gota azul', c: '#4aa3e8', f: 'gota' }, { n: 'Erva', c: '#4caf50', f: 'raiz' }, { n: 'Fungo', c: '#d0453a', f: 'quadrado' },
  ];
  function desenhaIngr(g, ing, x, y, r) {
    g.save(); g.translate(x, y); g.fillStyle = ing.c; g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 2;
    g.beginPath();
    switch (ing.f) {
      case 'raiz': g.moveTo(-r * 0.2, -r); g.quadraticCurveTo(r * 0.5, 0, -r * 0.1, r); g.lineTo(r * 0.15, r * 0.3); g.quadraticCurveTo(r * 0.7, -r * 0.2, r * 0.1, -r); break;
      case 'folha': g.ellipse(0, 0, r * 0.55, r, 0.6, 0, TAU); break;
      case 'losango': g.moveTo(0, -r); g.lineTo(r * 0.7, 0); g.lineTo(0, r); g.lineTo(-r * 0.7, 0); g.closePath(); break;
      case 'cogumelo': g.arc(0, -r * 0.1, r * 0.8, Math.PI, 0); g.lineTo(r * 0.25, -r * 0.1); g.lineTo(r * 0.25, r); g.lineTo(-r * 0.25, r); g.lineTo(-r * 0.25, -r * 0.1); g.closePath(); break;
      case 'pena': g.ellipse(0, 0, r * 0.3, r, -0.4, 0, TAU); break;
      case 'quadrado': g.rect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4); break;
      case 'flor': for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.moveTo(Math.cos(a) * r * 0.55 + r * 0.35, Math.sin(a) * r * 0.55); g.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.35, 0, TAU); } break;
      case 'olho': g.arc(0, 0, r * 0.8, 0, TAU); break;
      case 'gota': g.moveTo(0, -r); g.quadraticCurveTo(r * 0.9, r * 0.3, 0, r); g.quadraticCurveTo(-r * 0.9, r * 0.3, 0, -r); break;
      default: g.arc(0, 0, r * 0.7, 0, TAU);
    }
    g.fill(); g.stroke();
    if (ing.f === 'olho') { g.fillStyle = '#111'; g.beginPath(); g.ellipse(0, 0, r * 0.2, r * 0.5, 0, 0, TAU); g.fill(); }
    g.restore();
  }
  const caixaTxt = (g, txt, x, y, cor, tam, al) => { g.fillStyle = cor || '#e8eaf0'; g.font = `600 ${tam || 15}px "Atkinson Hyperlegible Next", system-ui, sans-serif`; g.textAlign = al || 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y); };
  const barraV = (g, x, y, w, h, v, cor, fundo) => { g.fillStyle = fundo || 'rgba(255,255,255,.08)'; g.fillRect(x, y, w, h); g.fillStyle = cor; g.fillRect(x, y + h * (1 - v), w, h * v); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); };
  // a cor do metal pelo calor: escuro → vermelho → laranja → amarelo → branco
  function corDoMetal(h) {
    const P = [[0, [60, 60, 66]], [0.3, [130, 30, 20]], [0.5, [214, 70, 20]], [0.7, [255, 150, 30]], [0.85, [255, 225, 90]], [1, [255, 255, 235]]];
    for (let i = 1; i < P.length; i++) if (h <= P[i][0]) { const [a, ca] = P[i - 1], [b, cb] = P[i], t = (h - a) / (b - a); return `rgb(${ca.map((v, k) => Math.round(v + (cb[k] - v) * t)).join(',')})`; }
    return 'rgb(255,255,235)';
  }

  const JOGOS = {
    // ---------------- Alquimia · Caldeirão ----------------
    caldeirao: {
      ajuda: 'Segure Espaço (ou o botão "Atiçar o fogo") para esquentar; solte para esfriar. Mantenha o ponteiro na faixa verde até o círculo encher; aí escolha o ingrediente da vez (ou tecle 1 a 5). Ferver demais explode; o fogo apagado também conta como erro.',
      botoes: [['atiçar', 'Atiçar o fogo (Espaço)']],
      passos: L => [3, 4, 5, 6, 7, 8][L],
      init(J) {
        const L = J.L, r = J.r, n = this.passos(L), base = INGR.slice(0, 8);
        const receita = Array.from({ length: n }, () => base[Math.floor(r() * base.length)]);
        J.s = { t: 0.35, alvo: 0.55, larg: [0.15, 0.11, 0.08, 0.06, 0.045, 0.035][L], ring: 0, segura: [2.2, 2.6, 3, 3.4, 3.8, 4.2][L], aq: false, receita, i: 0, fase: 'fogo', esc: [], ruido: 0, ruidoV: 0, vento: 0, ventoEm: 3 + r() * 4, flash: 0 };
        this.novoAlvo(J);
      },
      novoAlvo(J) { const s = J.s; s.alvo = 0.35 + J.r() * 0.4; s.ring = 0; s.fase = 'fogo'; },
      escolhas(J) {
        const s = J.s, certo = s.receita[s.i], r = J.r, L = J.L, k = L >= 3 ? 5 : 4, op = [certo];
        // (as pegadinhas: do Impossível para cima, um ingrediente da mesma cor e outra forma)
        if (L >= 3) { const falso = INGR.slice(8).find(x => x.c === certo.c) || INGR.find(x => x.c === certo.c && x !== certo); if (falso) op.push(falso); }
        while (op.length < k) { const x = INGR[Math.floor(r() * 8)]; if (!op.includes(x)) op.push(x); }
        for (let i = op.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [op[i], op[j]] = [op[j], op[i]]; }
        return op;
      },
      passo(J, dt) {
        const s = J.s, L = J.L, r = J.r;
        s.ruidoV += (r() - 0.5) * dt * [0.5, 0.7, 0.9, 1.1, 1.3, 1.5][L]; s.ruidoV *= 0.96;
        s.t += (s.aq ? 0.32 : -0.2) * dt + s.ruidoV * dt;
        // (o vento no fogo: do Impossível para cima, de tempos em tempos, um sopro)
        if (L >= 3) { s.ventoEm -= dt; if (s.ventoEm <= 0) { s.vento = (r() < 0.5 ? -1 : 1) * [0, 0, 0, 0.18, 0.22, 0.26][L]; s.ventoEm = 3 + r() * 4; J.msg('Um sopro de vento no fogo!'); } }
        if (s.vento) { const d = Math.sign(s.vento) * Math.min(Math.abs(s.vento), dt * 0.5); s.t += d; s.vento -= d; if (Math.abs(s.vento) < 0.001) s.vento = 0; }
        if (s.t >= 1) { s.t = 0.6; s.ring = Math.max(0, s.ring - 0.5); s.flash = 1; J.erro('A poção ferveu demais e espirrou!', 2); }
        if (s.t <= 0) { s.t = 0.25; J.erro('O fogo apagou.'); }
        s.flash = Math.max(0, s.flash - dt * 2);
        const dentro = Math.abs(s.t - s.alvo) <= s.larg;
        if (s.fase === 'fogo') { s.ring = clamp(s.ring + (dentro ? dt / s.segura : -dt / (s.segura * 2)), 0, 1); if (s.ring >= 1) { s.fase = 'pegar'; s.esc = this.escolhas(J); } }
      },
      escolher(J, k) {
        const s = J.s;
        if (s.fase !== 'pegar' || !s.esc[k]) return;
        if (s.esc[k] === s.receita[s.i]) { s.i++; J.avanca(); if (s.i >= s.receita.length) J.fim(true); else this.novoAlvo(J); }
        else { s.t = Math.min(0.97, s.t + 0.18); J.erro('Ingrediente errado: a poção borbulhou.'); }
      },
      tecla(J, k, desce) { if (k === ' ') J.s.aq = desce; else if (desce && /^[1-5]$/.test(k)) this.escolher(J, Number(k) - 1); },
      acao(J, id, desce) { if (id === 'atiçar') J.s.aq = desce; },
      toque(J, x, y, desce) {
        const s = J.s;
        if (desce && s.fase === 'pegar') { const n = s.esc.length; for (let i = 0; i < n; i++) { const cx = 320 + (i - (n - 1) / 2) * 78; if (Math.hypot(x - cx, y - 300) < 32) { this.escolher(J, i); return; } } }
      },
      desenho(J, g) {
        const s = J.s;
        // a receita, em cima
        caixaTxt(g, 'Receita', 24, 22, '#a6aec0', 13, 'left');
        s.receita.forEach((ing, i) => { const x = 110 + i * 46; g.globalAlpha = i < s.i ? 0.35 : 1; desenhaIngr(g, ing, x, 24, 14); if (i === s.i) { g.strokeStyle = '#e6ab4f'; g.lineWidth = 2; g.strokeRect(x - 20, 4, 40, 40); } g.globalAlpha = 1; });
        // o caldeirão e o fogo
        const cx = 300, cy = 175;
        g.fillStyle = `rgba(255,${Math.round(120 + 100 * (1 - s.t))},40,${0.25 + s.t * 0.6})`;
        for (let i = 0; i < 7; i++) { const fx = cx - 60 + i * 20, fh = 24 + s.t * 40 + Math.sin(Date.now() / 90 + i) * 6; g.beginPath(); g.moveTo(fx - 9, cy + 82); g.quadraticCurveTo(fx, cy + 82 - fh, fx + 9, cy + 82); g.fill(); }
        g.fillStyle = '#2b2e36'; g.beginPath(); g.ellipse(cx, cy + 20, 92, 66, 0, 0, Math.PI); g.lineTo(cx - 92, cy + 20); g.fill();
        g.fillStyle = s.flash ? '#fff4d0' : `hsl(${150 - s.t * 120}, 60%, ${30 + s.t * 20}%)`; g.beginPath(); g.ellipse(cx, cy + 20, 86, 20, 0, 0, TAU); g.fill();
        for (let i = 0; i < 1 + Math.round(s.t * 8); i++) { g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(cx - 60 + ((i * 37 + Date.now() / 20) % 120), cy + 18 - ((Date.now() / 12 + i * 23) % 14), 3 + (i % 3), 0, TAU); g.fill(); }
        // o termômetro com a faixa
        const tx = 470, ty = 60, th = 190;
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(tx, ty, 26, th);
        g.fillStyle = 'rgba(111,191,143,.45)'; g.fillRect(tx, ty + th * (1 - s.alvo - s.larg), 26, th * s.larg * 2);
        g.fillStyle = '#e8eaf0'; g.fillRect(tx - 6, ty + th * (1 - clamp(s.t, 0, 1)) - 2, 38, 4);
        caixaTxt(g, 'calor', tx + 13, ty - 12, '#a6aec0', 12);
        // o círculo que enche
        g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 8; g.beginPath(); g.arc(560, 160, 34, 0, TAU); g.stroke();
        g.strokeStyle = '#6fbf8f'; g.beginPath(); g.arc(560, 160, 34, -Math.PI / 2, -Math.PI / 2 + TAU * s.ring); g.stroke();
        caixaTxt(g, s.fase === 'pegar' ? 'Agora!' : Math.round(s.ring * 100) + '%', 560, 160, '#e8eaf0', 14);
        if (s.fase === 'pegar') {
          caixaTxt(g, 'Qual vai agora? (1 a ' + s.esc.length + ')', 320, 262, '#e6ab4f', 14);
          const n = s.esc.length; s.esc.forEach((ing, i) => { const x = 320 + (i - (n - 1) / 2) * 78; g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.arc(x, 300, 30, 0, TAU); g.fill(); desenhaIngr(g, ing, x, 300, 18); caixaTxt(g, String(i + 1), x + 24, 280, '#a6aec0', 11); });
        }
      },
    },
    // ---------------- Alquimia · Destilar ----------------
    destilar: {
      ajuda: 'Setas ↑ ↓ (ou arraste a válvula) abrem e fecham. Encha o frasco até a marca dourada e aperte Espaço (ou "Trocar o frasco") para trocar. Válvula aberta demais ferve o alambique; passar da boca do frasco derrama.',
      botoes: [['menos', 'Fechar −'], ['mais', 'Abrir +'], ['trocar', 'Trocar o frasco (Espaço)']],
      passos: L => [2, 3, 4, 5, 6, 7][L],
      init(J) {
        const L = J.L;
        J.s = { v: 0, cheio: 0, marca: 0.7, tol: [0.08, 0.06, 0.045, 0.035, 0.025, 0.018][L], vmax: [0.9, 0.8, 0.7, 0.62, 0.55, 0.5][L], ferve: 0, gotas: [], acc: 0, feitos: 0, notas: [], solto: 0, mexeu: false, arrasta: false };
        this.novoFrasco(J);
      },
      novoFrasco(J) { const s = J.s; s.cheio = 0; s.marca = 0.55 + J.r() * 0.3; s.mexeu = false; },
      trocar(J) {
        const s = J.s, d = Math.abs(s.cheio - s.marca);
        if (d <= s.tol) { s.notas.push(100 - 40 * d / s.tol); s.feitos++; J.avanca(); J.msg('Na medida!'); if (s.feitos >= this.passos(J.L)) { J.fim(true); return; } }
        else { s.notas.push(0); J.erro(s.cheio < s.marca ? 'O frasco ficou pela metade.' : 'Passou da marca.'); }
        this.novoFrasco(J);
      },
      passo(J, dt) {
        const s = J.s, L = J.L;
        // (a válvula que afrouxa sozinha, do Impossível para cima; e a marca que muda de lugar no Absoluto e no Lendário)
        if (L >= 3) s.v = clamp(s.v + dt * [0, 0, 0, 0.04, 0.06, 0.08][L], 0, 1);
        if (L >= 4 && !s.mexeu && s.cheio > 0.3) { s.mexeu = true; s.marca = clamp(s.marca + (J.r() < 0.5 ? -1 : 1) * 0.1, 0.4, 0.9); J.msg('A marca do frasco mudou!'); }
        const taxa = s.v * [7, 8, 9, 10, 11, 12][L];
        s.acc += taxa * dt;
        while (s.acc >= 1) { s.acc -= 1; s.gotas.push({ y: 0 }); }
        for (const gt of s.gotas) gt.y += dt * 260;
        const caiu = s.gotas.filter(gt => gt.y >= 150).length;
        s.gotas = s.gotas.filter(gt => gt.y < 150);
        s.cheio += caiu * 0.022;
        if (s.cheio >= 1) { s.notas.push(0); J.erro('O frasco transbordou!'); this.novoFrasco(J); }
        s.ferve = clamp(s.ferve + (s.v > s.vmax ? dt * 0.6 : -dt * 0.3), 0, 1);
        if (s.ferve >= 1) { s.ferve = 0; s.v = s.vmax * 0.5; J.erro('O alambique ferveu e espirrou.'); }
      },
      tecla(J, k, desce) { if (!desce) return; if (k === 'ArrowUp' || k === 'ArrowRight') J.s.v = clamp(J.s.v + 0.08, 0, 1); else if (k === 'ArrowDown' || k === 'ArrowLeft') J.s.v = clamp(J.s.v - 0.08, 0, 1); else if (k === ' ') this.trocar(J); },
      acao(J, id, desce) { if (!desce) return; if (id === 'mais') J.s.v = clamp(J.s.v + 0.1, 0, 1); else if (id === 'menos') J.s.v = clamp(J.s.v - 0.1, 0, 1); else if (id === 'trocar') this.trocar(J); },
      toque(J, x, y, desce, move) {
        const s = J.s;
        if (desce && x > 60 && x < 220 && y > 40 && y < 300) s.arrasta = true;
        if (!desce && !move) s.arrasta = false;
        if (s.arrasta && (desce || move)) s.v = clamp(1 - (y - 60) / 220, 0, 1);
      },
      desenho(J, g) {
        const s = J.s;
        // a válvula (uma régua vertical)
        caixaTxt(g, 'Válvula', 140, 30, '#a6aec0', 13);
        barraV(g, 120, 60, 40, 220, s.v, '#4aa3e8');
        g.fillStyle = 'rgba(240,120,110,.35)'; g.fillRect(120, 60, 40, 220 * (1 - s.vmax));
        caixaTxt(g, 'ferve', 140, 296, '#f0786e', 11);
        // o alambique e as gotas
        g.fillStyle = '#b5652e'; g.beginPath(); g.arc(330, 70, 40, 0, TAU); g.fill();
        g.strokeStyle = '#a0572a'; g.lineWidth = 8; g.beginPath(); g.moveTo(360, 50); g.quadraticCurveTo(420, 40, 420, 100); g.stroke();
        g.fillStyle = `rgba(240,120,110,${s.ferve})`; g.beginPath(); g.arc(330, 70, 44, 0, TAU); g.fill();
        g.fillStyle = '#8fd0ff'; for (const gt of s.gotas) { g.beginPath(); g.arc(420, 110 + gt.y, 4, 0, TAU); g.fill(); }
        // o frasco
        const fx = 380, fy = 260, fw = 80, fh = 0;
        void fh;
        g.strokeStyle = '#d8e6ee'; g.lineWidth = 3; g.strokeRect(fx, 150, fw, 110);
        g.fillStyle = 'rgba(143,208,255,.65)'; g.fillRect(fx + 2, fy - 108 * clamp(s.cheio, 0, 1), fw - 4, 108 * clamp(s.cheio, 0, 1));
        const my = fy - 108 * s.marca;
        g.fillStyle = 'rgba(230,171,79,.3)'; g.fillRect(fx - 8, my - 108 * s.tol, fw + 16, 216 * s.tol);
        g.strokeStyle = '#e6ab4f'; g.lineWidth = 2; g.beginPath(); g.moveTo(fx - 10, my); g.lineTo(fx + fw + 10, my); g.stroke();
        caixaTxt(g, 'Frasco ' + (s.feitos + 1) + ' de ' + this.passos(J.L), fx + fw / 2, 290, '#a6aec0', 13);
        // os frascos prontos
        s.notas.forEach((n, i) => { g.fillStyle = n > 0 ? '#6fbf8f' : '#f0786e'; g.fillRect(500 + (i % 4) * 26, 160 + Math.floor(i / 4) * 34, 18, 26); });
      },
    },
    // ---------------- Ferreiro · Forja ----------------
    forja: {
      ajuda: 'Segure Espaço (ou "Aquecer") para pôr o metal no fogo; solte para trazer à bigorna. Com o metal na cor da faixa, clique (ou Enter) quando o martelo passar no ponto marcado. Frio demais trinca, quente demais queima.',
      botoes: [['aquecer', 'Aquecer (Espaço)'], ['martelar', 'Martelar (Enter)']],
      passos: L => [4, 5, 7, 9, 11, 13][L],
      init(J) {
        const L = J.L;
        J.s = { h: 0.2, lo: 0.55, larg: [0.35, 0.28, 0.22, 0.17, 0.13, 0.1][L], aq: false, m: 0, dir: 1, vel: [0.5, 0.65, 0.8, 1, 1.2, 1.4][L], ponto: 0.5, raio: [0.1, 0.08, 0.06, 0.05, 0.04, 0.03][L], golpes: 0, faisca: 0, notas: [] };
        this.novoPonto(J);
      },
      novoPonto(J) { const s = J.s; s.ponto = 0.15 + J.r() * 0.7; s.lo = 0.5 + J.r() * Math.max(0.02, 0.85 - 0.5 - s.larg); },
      martelar(J) {
        const s = J.s;
        if (s.aq) { J.msg('O metal está no fogo: solte para martelar.'); return; }
        const hi = s.lo + s.larg;
        if (s.h < s.lo) { J.erro('Frio demais: o metal trincou.'); return; }
        if (s.h > hi + 0.05) { J.erro('Quente demais: o metal queimou.'); return; }
        const d = Math.abs(s.m - s.ponto);
        if (d > s.raio) { J.erro('O golpe pegou fora do ponto.'); return; }
        s.notas.push(100 - 40 * d / s.raio); s.golpes++; s.faisca = 1; J.avanca();
        if (s.golpes >= this.passos(J.L)) J.fim(true); else this.novoPonto(J);
      },
      passo(J, dt) {
        const s = J.s, L = J.L;
        s.h = clamp(s.h + (s.aq ? 0.35 : -[0.06, 0.07, 0.08, 0.1, 0.12, 0.15][L]) * dt, 0, 1);
        // o martelo vai e volta; (do Absoluto para cima, a velocidade muda)
        const vel = s.vel * (L >= 4 ? 0.75 + 0.5 * (0.5 + 0.5 * Math.sin(Date.now() / 700)) : 1);
        s.m += s.dir * vel * dt; if (s.m > 1) { s.m = 1; s.dir = -1; } if (s.m < 0) { s.m = 0; s.dir = 1; }
        // (o ponto que anda, do Impossível para cima)
        if (L >= 3) s.ponto = clamp(s.ponto + Math.sin(Date.now() / 900) * dt * [0, 0, 0, 0.08, 0.12, 0.16][L], 0.1, 0.9);
        s.faisca = Math.max(0, s.faisca - dt * 3);
      },
      tecla(J, k, desce) { if (k === ' ') J.s.aq = desce; else if (desce && k === 'Enter') this.martelar(J); },
      acao(J, id, desce) { if (id === 'aquecer') J.s.aq = desce; else if (id === 'martelar' && desce) this.martelar(J); },
      toque(J, x, y, desce) { if (desce && y > 120 && y < 260 && x > 120) this.martelar(J); },
      desenho(J, g) {
        const s = J.s;
        // a forja (à esquerda) e a bigorna
        g.fillStyle = '#3a2a22'; g.fillRect(20, 150, 90, 110);
        g.fillStyle = s.aq ? '#ff9a3c' : '#a8441e'; g.beginPath(); g.ellipse(65, 160, 38, 12, 0, 0, TAU); g.fill();
        caixaTxt(g, 'forja', 65, 276, '#a6aec0', 12);
        g.fillStyle = '#3d434c'; g.fillRect(150, 210, 360, 40); g.fillRect(200, 250, 260, 30);
        // a lâmina, na cor do calor
        const bx = s.aq ? 40 : 160, bw = s.aq ? 50 : 340;
        g.fillStyle = corDoMetal(s.h); g.fillRect(bx, 186, bw, 22);
        if (!s.aq) {
          // o ponto e o martelo
          g.fillStyle = 'rgba(230,171,79,.35)'; g.fillRect(160 + 340 * (s.ponto - s.raio), 176, 340 * s.raio * 2, 42);
          const mx = 160 + 340 * s.m;
          g.fillStyle = '#9aa3ae'; g.fillRect(mx - 14, 120, 28, 40); g.fillStyle = '#7a4b26'; g.fillRect(mx - 3, 80, 6, 44);
          if (s.faisca) { g.fillStyle = `rgba(255,220,120,${s.faisca})`; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.fillRect(mx + Math.cos(a) * 30 * (1 - s.faisca + 0.3), 196 + Math.sin(a) * 18, 3, 3); } }
        }
        // a régua das cores, com a faixa
        const rx = 160, rw = 340;
        for (let i = 0; i < rw; i++) { g.fillStyle = corDoMetal(i / rw); g.fillRect(rx + i, 300, 1, 14); }
        g.strokeStyle = '#6fbf8f'; g.lineWidth = 2; g.strokeRect(rx + rw * s.lo, 296, rw * s.larg, 22);
        g.fillStyle = '#e8eaf0'; g.fillRect(rx + rw * s.h - 1, 292, 3, 30);
        caixaTxt(g, 'a cor certa', rx + rw * (s.lo + s.larg / 2), 334, '#6fbf8f', 12);
        caixaTxt(g, 'Golpes: ' + s.golpes + ' de ' + this.passos(J.L), 560, 40, '#a6aec0', 13);
      },
    },
    // ---------------- Ferreiro · Têmpera ----------------
    tempera: {
      ajuda: 'Primeiro a têmpera: a lâmina esfria sozinha; aperte Espaço (ou "Mergulhar") quando a cor estiver na faixa. Depois, afiar: aperte Espaço quando cada nota chegar na linha. As notas vermelhas são falsas: deixe passar.',
      botoes: [['bater', 'Mergulhar / Afiar (Espaço)']],
      passos: L => 1 + [8, 10, 12, 14, 16, 18][L],
      init(J) {
        const L = J.L;
        J.s = { fase: 'tempera', h: 1, lo: 0.4 + J.r() * 0.25, larg: [0.12, 0.09, 0.07, 0.05, 0.04, 0.03][L], cai: [0.12, 0.15, 0.18, 0.22, 0.26, 0.3][L], notas: [], acertos: [], janela: [0.18, 0.15, 0.12, 0.095, 0.075, 0.06][L], vel: [160, 190, 220, 250, 280, 310][L], t: 0, total: [8, 10, 12, 14, 16, 18][L], saiu: 0, vapor: 0, linha: 520 };
      },
      bater(J) {
        const s = J.s;
        if (s.fase === 'tempera') {
          if (s.h >= s.lo && s.h <= s.lo + s.larg) { s.fase = 'afiar'; s.vapor = 1; s.acertos.push(100); J.avanca(); J.msg('Tssss! A têmpera pegou.'); this.semear(J); }
          else { J.erro(s.h > s.lo + s.larg ? 'Quente demais: a lâmina empenou.' : 'Fria demais: não temperou.'); s.h = 1; }
          return;
        }
        // afiar: a nota mais perto da linha
        let melhor = null, d = Infinity;
        for (const n of s.notas) if (!n.feita) { const e = Math.abs(n.x - s.linha); if (e < d) { d = e; melhor = n; } }
        const tol = s.janela * s.vel;
        if (!melhor || d > tol) { J.erro('Afiou fora do ritmo.'); return; }
        melhor.feita = true;
        if (melhor.falsa) { J.erro('Essa nota era falsa!'); return; }
        s.acertos.push(100 - 40 * d / tol); J.avanca();
      },
      semear(J) {
        const s = J.s, L = J.L, r = J.r;
        let x = -40;
        for (let i = 0; i < s.total; i++) {
          x -= (L >= 4 && r() < 0.3 ? 0.5 : 1) * (130 + r() * 60);
          s.notas.push({ x, falsa: false });
          // (as falsas, do Impossível para cima)
          if (L >= 3 && r() < [0, 0, 0, 0.18, 0.24, 0.3][L]) { x -= 70 + r() * 40; s.notas.push({ x, falsa: true }); }
        }
      },
      passo(J, dt) {
        const s = J.s;
        s.vapor = Math.max(0, s.vapor - dt);
        if (s.fase === 'tempera') { s.h -= s.cai * dt; if (s.h <= 0.05) { J.erro('A lâmina esfriou sem temperar.'); s.h = 1; } return; }
        for (const n of s.notas) n.x += s.vel * dt;
        for (const n of s.notas) if (!n.feita && n.x > s.linha + s.janela * s.vel) { n.feita = true; if (!n.falsa) J.erro('Deixou passar uma nota.'); }
        if (s.notas.every(n => n.feita)) J.fim(true);
      },
      tecla(J, k, desce) { if (desce && (k === ' ' || k === 'Enter')) this.bater(J); },
      acao(J, id, desce) { if (desce && id === 'bater') this.bater(J); },
      toque(J, x, y, desce) { if (desce && y > 60) this.bater(J); },
      desenho(J, g) {
        const s = J.s;
        if (s.fase === 'tempera') {
          g.fillStyle = '#244c66'; g.fillRect(380, 200, 200, 90); g.fillStyle = 'rgba(143,208,255,.4)'; g.fillRect(380, 200, 200, 14);
          caixaTxt(g, 'a água', 480, 300, '#a6aec0', 12);
          g.fillStyle = corDoMetal(s.h); g.beginPath(); g.moveTo(80, 160); g.lineTo(330, 160); g.lineTo(360, 172); g.lineTo(330, 184); g.lineTo(80, 184); g.fill();
          g.fillStyle = '#5a3b1e'; g.fillRect(40, 162, 40, 20);
          const rx = 80, rw = 480;
          for (let i = 0; i < rw; i++) { g.fillStyle = corDoMetal(i / rw); g.fillRect(rx + i, 60, 1, 16); }
          g.strokeStyle = '#6fbf8f'; g.lineWidth = 2; g.strokeRect(rx + rw * s.lo, 56, rw * s.larg, 24);
          g.fillStyle = '#e8eaf0'; g.fillRect(rx + rw * s.h - 1, 52, 3, 32);
          caixaTxt(g, 'Mergulhe na cor da faixa', 320, 110, '#e6ab4f', 15);
          return;
        }
        if (s.vapor) { g.fillStyle = `rgba(230,240,245,${s.vapor * 0.5})`; g.beginPath(); g.arc(480, 200, 80 * (1.5 - s.vapor), 0, TAU); g.fill(); }
        caixaTxt(g, 'Afiar no ritmo', 320, 40, '#e6ab4f', 15);
        g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(20, 150, 600, 60);
        g.fillStyle = 'rgba(111,191,143,.35)'; g.fillRect(s.linha - s.janela * s.vel, 150, s.janela * s.vel * 2, 60);
        g.fillStyle = '#e8eaf0'; g.fillRect(s.linha - 1, 140, 3, 80);
        for (const n of s.notas) { if (n.feita || n.x < 0 || n.x > 640) continue; g.fillStyle = n.falsa ? '#f0786e' : '#e6ab4f'; g.beginPath(); g.moveTo(n.x, 160); g.lineTo(n.x + 14, 180); g.lineTo(n.x, 200); g.lineTo(n.x - 14, 180); g.fill(); }
        // a pedra de amolar
        g.fillStyle = '#7d879c'; g.beginPath(); g.arc(320, 290, 40, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 3; g.beginPath(); g.moveTo(320, 290); g.lineTo(320 + Math.cos(Date.now() / 120) * 36, 290 + Math.sin(Date.now() / 120) * 36); g.stroke();
      },
    },
    // ---------------- Invenção · Engrenagens ----------------
    engrenagens: {
      ajuda: 'Cada engrenagem gira com um dente dourado. Aperte Espaço (ou clique, ou "Travar") quando o dente da engrenagem da vez passar pela linha do eixo, em cima. Errar faz barulho e, nos níveis altos, solta a que já estava travada.',
      botoes: [['travar', 'Travar (Espaço)']],
      passos: L => [3, 4, 5, 6, 7, 8][L],
      init(J) {
        const L = J.L, r = J.r, n = this.passos(L);
        J.s = { eng: Array.from({ length: n }, (_, i) => ({ a: r() * TAU, v: (0.35 + r() * 0.25 + L * 0.13) * TAU * (i % 2 ? -1 : 1), presa: false, raio: 30 + (i % 3) * 6 })), i: 0, jan: [24, 18, 13, 10, 8, 6][L] * Math.PI / 180, solta: [0, 0, 0.3, 0.5, 0.7, 1][L], notas: [], inverteEm: 2 + r() * 3 };
      },
      travar(J) {
        const s = J.s, e = s.eng[s.i];
        if (!e) return;
        // o dente em cima: o ângulo −90°
        let d = ((e.a + Math.PI / 2) % TAU + TAU) % TAU; if (d > Math.PI) d = TAU - d;
        if (d <= s.jan) { e.presa = true; s.notas.push(100 - 40 * d / s.jan); s.i++; J.avanca(); if (s.i >= s.eng.length) J.fim(true); return; }
        J.erro('Fora do eixo: a engrenagem rangeu.');
        if (s.i > 0 && J.r() < s.solta) { s.i--; s.eng[s.i].presa = false; s.notas.pop(); J.volta(); J.msg('A engrenagem de antes soltou!'); }
      },
      passo(J, dt) {
        const s = J.s, L = J.L;
        // (do Impossível para cima, a engrenagem da vez inverte de vez em quando)
        if (L >= 3) { s.inverteEm -= dt; if (s.inverteEm <= 0) { const e = s.eng[s.i]; if (e) e.v = -e.v; s.inverteEm = [9, 9, 9, 4, 3, 2.2][L] + J.r() * 2; } }
        for (const e of s.eng) if (!e.presa) e.a += e.v * dt * (L >= 4 ? 0.8 + 0.4 * (0.5 + 0.5 * Math.sin(Date.now() / 500)) : 1);
      },
      tecla(J, k, desce) { if (desce && (k === ' ' || k === 'Enter')) this.travar(J); },
      acao(J, id, desce) { if (desce && id === 'travar') this.travar(J); },
      toque(J, x, y, desce) { if (desce) this.travar(J); },
      desenho(J, g) {
        const s = J.s, n = s.eng.length, passo = Math.min(76, 560 / n), x0 = 320 - (n - 1) * passo / 2;
        g.strokeStyle = 'rgba(230,171,79,.6)'; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(20, 130); g.lineTo(620, 130); g.stroke(); g.setLineDash([]);
        caixaTxt(g, 'o eixo', 40, 118, '#e6ab4f', 12, 'left');
        s.eng.forEach((e, i) => {
          const R = Math.max(14, Math.min(e.raio, passo * 0.45 - 7)), cx = x0 + i * passo, cy = 130 + R + 6;
          g.save(); g.translate(cx, cy); g.rotate(e.a);
          g.fillStyle = e.presa ? '#6fbf8f' : i === s.i ? '#c9a24a' : '#626a76';
          g.beginPath(); for (let k = 0; k < 10; k++) { const a0 = k / 10 * TAU, a1 = (k + 0.5) / 10 * TAU; g.lineTo(Math.cos(a0) * R, Math.sin(a0) * R); g.lineTo(Math.cos(a0) * (R + 7), Math.sin(a0) * (R + 7)); g.lineTo(Math.cos(a1) * (R + 7), Math.sin(a1) * (R + 7)); g.lineTo(Math.cos(a1) * R, Math.sin(a1) * R); } g.closePath(); g.fill();
          g.fillStyle = '#1f2431'; g.beginPath(); g.arc(0, 0, R * 0.3, 0, TAU); g.fill();
          g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(R - 4, 0, 6, 0, TAU); g.fill();
          g.restore();
          if (i === s.i) caixaTxt(g, '▼', cx, 106, '#e6ab4f', 16);
        });
        // a mola (o tempo)
        caixaTxt(g, 'Travadas: ' + s.i + ' de ' + n, 320, 320, '#a6aec0', 13);
      },
    },
    // ---------------- Invenção · Fiação ----------------
    fiacao: {
      ajuda: 'Clique numa peça para girar (ou mova com as setas e gire com Espaço). Ligue a bateria (à esquerda) a todas as peças, sem ponta solta, antes da mola soltar. Do Impossível para cima, uma faísca gira peças sozinha.',
      botoes: [],
      passos: () => 1,
      tempo: [240, 180, 150, 130, 110, 90],
      init(J) {
        const L = J.L, r = J.r, n = [4, 5, 6, 7, 8, 9][L];
        // a árvore que liga todas as casas (o labirinto); cada casa guarda as saídas (bits: 1 cima, 2 direita, 4 baixo, 8 esquerda)
        const sai = new Array(n * n).fill(0), visto = new Array(n * n).fill(false), fonte = Math.floor(n / 2) * n;
        const pilha = [fonte]; visto[fonte] = true;
        const viz = c => { const x = c % n, y = Math.floor(c / n), l = []; if (y > 0) l.push([c - n, 1, 4]); if (x < n - 1) l.push([c + 1, 2, 8]); if (y < n - 1) l.push([c + n, 4, 1]); if (x > 0) l.push([c - 1, 8, 2]); return l; };
        while (pilha.length) {
          const c = pilha[Math.floor(r() * pilha.length)], ls = viz(c).filter(v => !visto[v[0]]);
          if (!ls.length) { pilha.splice(pilha.indexOf(c), 1); continue; }
          const [d, a, b] = ls[Math.floor(r() * ls.length)];
          sai[c] |= a; sai[d] |= b; visto[d] = true; pilha.push(d);
        }
        const giro = sai.map(() => Math.floor(r() * 4));
        J.s = { n, sai, giro, fonte, cur: fonte, giros: 0, faisca: [0, 0, 0, 7, 5, 3.5][L], faiscaEm: 6, brilho: -1, liga: [] };
        if (this.resolvido(J)) J.s.giro[(fonte + 1) % (n * n)] = (J.s.giro[(fonte + 1) % (n * n)] + 1) % 4;
        this.contar(J);
      },
      rot: (b, k) => { for (let i = 0; i < k; i++) b = ((b << 1) | (b >> 3)) & 15; return b; },
      bits(J, c) { return this.rot(J.s.sai[c], J.s.giro[c]); },
      contar(J) {
        const s = J.s, n = s.n, lig = new Array(n * n).fill(false), fila = [s.fonte]; lig[s.fonte] = true;
        while (fila.length) {
          const c = fila.shift(), b = this.bits(J, c), x = c % n, y = Math.floor(c / n);
          const ir = [[1, c - n, y > 0, 4], [2, c + 1, x < n - 1, 8], [4, c + n, y < n - 1, 1], [8, c - 1, x > 0, 2]];
          for (const [m, d, ok, volta] of ir) if (ok && (b & m) && (this.bits(J, d) & volta) && !lig[d]) { lig[d] = true; fila.push(d); }
        }
        s.liga = lig;
      },
      resolvido(J) {
        const s = J.s, n = s.n;
        for (let c = 0; c < n * n; c++) {
          const b = this.bits(J, c), x = c % n, y = Math.floor(c / n);
          if ((b & 1) && !(y > 0 && (this.bits(J, c - n) & 4))) return false;
          if ((b & 2) && !(x < n - 1 && (this.bits(J, c + 1) & 8))) return false;
          if ((b & 4) && !(y < n - 1 && (this.bits(J, c + n) & 1))) return false;
          if ((b & 8) && !(x > 0 && (this.bits(J, c - 1) & 2))) return false;
        }
        this.contar(J);
        return s.liga.every(Boolean);
      },
      girar(J, c) {
        const s = J.s;
        s.giro[c] = (s.giro[c] + 1) % 4; s.giros++;
        this.contar(J);
        if (this.resolvido(J)) { J.avanca(); J.fim(true); }
      },
      passo(J, dt) {
        const s = J.s;
        if (s.faisca) { s.faiscaEm -= dt; if (s.faiscaEm <= 0) { s.faiscaEm = s.faisca + J.r() * 2; const lst = s.giro.map((_, i) => i).filter(i => i !== s.cur); const c = lst[Math.floor(J.r() * lst.length)]; s.giro[c] = (s.giro[c] + 1) % 4; s.brilho = c; this.contar(J); J.msg('Uma faísca girou uma peça!'); } }
      },
      tecla(J, k, desce) {
        if (!desce) return;
        const s = J.s, n = s.n, x = s.cur % n, y = Math.floor(s.cur / n);
        if (k === 'ArrowUp' && y > 0) s.cur -= n; else if (k === 'ArrowDown' && y < n - 1) s.cur += n;
        else if (k === 'ArrowLeft' && x > 0) s.cur -= 1; else if (k === 'ArrowRight' && x < n - 1) s.cur += 1;
        else if (k === ' ' || k === 'Enter') this.girar(J, s.cur);
      },
      acao() {},
      geo(J) { const n = J.s.n, lado = Math.floor(300 / n); return { n, lado, x0: 320 - (n * lado) / 2, y0: 30 }; },
      toque(J, x, y, desce) {
        if (!desce) return;
        const { n, lado, x0, y0 } = this.geo(J), i = Math.floor((x - x0) / lado), j = Math.floor((y - y0) / lado);
        if (i >= 0 && j >= 0 && i < n && j < n) { J.s.cur = j * n + i; this.girar(J, j * n + i); }
      },
      desenho(J, g) {
        const s = J.s, { n, lado, x0, y0 } = this.geo(J);
        for (let c = 0; c < n * n; c++) {
          const x = x0 + (c % n) * lado, y = y0 + Math.floor(c / n) * lado, b = this.bits(J, c), m = lado / 2;
          g.fillStyle = c === s.brilho ? 'rgba(255,211,77,.25)' : 'rgba(255,255,255,.05)'; g.fillRect(x + 1, y + 1, lado - 2, lado - 2);
          g.strokeStyle = s.liga[c] ? '#ffd34d' : '#626a76'; g.lineWidth = Math.max(3, lado * 0.16); g.lineCap = 'round';
          g.beginPath();
          if (b & 1) { g.moveTo(x + m, y + m); g.lineTo(x + m, y); }
          if (b & 2) { g.moveTo(x + m, y + m); g.lineTo(x + lado, y + m); }
          if (b & 4) { g.moveTo(x + m, y + m); g.lineTo(x + m, y + lado); }
          if (b & 8) { g.moveTo(x + m, y + m); g.lineTo(x, y + m); }
          g.stroke();
          g.fillStyle = s.liga[c] ? '#ffd34d' : '#7d879c'; g.beginPath(); g.arc(x + m, y + m, lado * 0.1, 0, TAU); g.fill();
          if (c === s.cur) { g.strokeStyle = '#e8eaf0'; g.lineWidth = 2; g.strokeRect(x + 2, y + 2, lado - 4, lado - 4); }
        }
        const fy = y0 + Math.floor(s.fonte / n) * lado;
        g.fillStyle = '#6fbf8f'; g.fillRect(x0 - 26, fy + lado * 0.2, 20, lado * 0.6); caixaTxt(g, '⚡', x0 - 16, fy + lado / 2, '#1d1503', 14);
        caixaTxt(g, 'Ligadas: ' + s.liga.filter(Boolean).length + ' de ' + n * n, 320, 345, '#a6aec0', 13);
      },
    },
  };

  /* ================= o jogo na tela ================= */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) { const v = attrs[k]; if (v == null || v === false) continue; if (k.startsWith('on')) el[k] = v; else if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else el.setAttribute(k, v === true ? '' : v); }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    return el;
  }
  function iniciar(el, o) {
    o = o || {};
    const jeito = JOGOS[o.jeito] ? o.jeito : jeitosDe(o.oficio)[0] ? jeitosDe(o.oficio)[0][0] : 'caldeirao';
    const G = JOGOS[jeito], L = nivDe(o.nivel), vel = Number(o.vel) > 0 ? Number(o.vel) : 1;
    const tempo = (G.tempo || TEMPO)[L], maxErros = ERROS[L], passos = G.passos(L);
    const J = { L, r: mulberry((Number(o.seed) >>> 0) || 1), s: null, erros: 0, feitos: 0, seg: 0, acabou: false, ultimaMsg: '', msgAte: 0 };
    let res = null;
    const info = h('div', { class: 'bj-info' }), msgEl = h('p', { class: 'bj-msg', role: 'status', 'aria-live': 'polite' });
    const cv = h('canvas', { class: 'bj-cv', width: 640, height: 360, tabindex: '0', 'aria-label': 'O minigame: ' + nomeJeito(jeito) + '. ' + G.ajuda });
    const bts = h('div', { class: 'bj-bts' });
    const fimEl = h('div', { class: 'bj-fim', hidden: true });
    const raiz = h('div', { class: 'bj', 'data-jeito': jeito }, info, h('div', { class: 'bj-palco' }, cv, fimEl), msgEl, bts, h('p', { class: 'bj-ajuda', text: G.ajuda }));
    el.replaceChildren(raiz);
    const g = cv.getContext('2d');
    J.msg = txt => { J.ultimaMsg = txt; J.msgAte = J.seg + 2.5; msgEl.textContent = txt; };
    J.erro = (txt, peso) => { if (J.acabou) return; J.erros += peso || 1; J.msg(txt + (J.erros >= maxErros ? '' : ' (' + J.erros + ' de ' + maxErros + ' erros)')); if (J.erros >= maxErros) J.fim(false, 'erros'); };
    J.avanca = () => { J.feitos++; };
    J.volta = () => { J.feitos = Math.max(0, J.feitos - 1); };
    J.fim = (ok, motivo) => {
      if (J.acabou) return;
      J.acabou = true;
      const prog = clamp(J.feitos / passos, 0, 1), sobra = tempo ? clamp(1 - J.seg / tempo, 0, 1) : 0.5;
      const notas = ((J.s && (J.s.acertos || J.s.notas)) || []).filter(x => typeof x === 'number' && Number.isFinite(x)), media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 80;
      const nota = ok ? Math.round(clamp(50 + media * 0.3 + sobra * 15 + (1 - J.erros / maxErros) * 10, 50, 100))
        : Math.round(clamp(prog * 45 + (motivo === 'desistiu' ? 0 : 4), 0, 49));
      res = { ok: !!ok, nota, erros: J.erros, seg: Math.round(J.seg), motivo: ok ? 'feito' : motivo || 'erros', desistiu: motivo === 'desistiu' };
      parar();
      fimEl.hidden = false;
      fimEl.replaceChildren(h('b', { text: ok ? 'Deu certo!' : 'Não deu.' }), h('span', { text: 'Nota ' + nota + '/100' + (ok ? '' : motivo === 'tempo' ? ' · o tempo acabou' : motivo === 'desistiu' ? ' · desistiu' : ' · erros demais') }));
      raiz.classList.add(ok ? 'ok' : 'falhou');
      try { if (o.aoFim) o.aoFim(res); } catch (e) { console.error(e); }
    };
    G.init(J);
    // os botões
    for (const [id, rot] of G.botoes) {
      const b = h('button', { type: 'button', class: 'btn bj-b', 'data-acao': id, text: rot });
      const solta = ev => { if (ev) ev.preventDefault(); if (!J.acabou) G.acao(J, id, false); };
      b.addEventListener('pointerdown', ev => { ev.preventDefault(); if (!J.acabou) G.acao(J, id, true); });
      b.addEventListener('pointerup', solta); b.addEventListener('pointerleave', solta);
      b.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && !ev.repeat) { ev.preventDefault(); if (!J.acabou) G.acao(J, id, true); } });
      b.addEventListener('keyup', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); if (!J.acabou) G.acao(J, id, false); } });
      bts.append(b);
    }
    bts.append(h('span', { class: 'grow' }), h('button', { type: 'button', class: 'btn per bj-desistir', text: 'Desistir', onclick: () => J.fim(false, 'desistiu') }));
    const pos = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * 640 / r.width, (ev.clientY - r.top) * 360 / r.height]; };
    cv.addEventListener('pointerdown', ev => { cv.focus(); if (J.acabou) return; const [x, y] = pos(ev); G.toque(J, x, y, true, false); });
    cv.addEventListener('pointermove', ev => { if (J.acabou || !(ev.buttons & 1)) return; const [x, y] = pos(ev); G.toque(J, x, y, false, true); });
    cv.addEventListener('pointerup', ev => { if (J.acabou) return; const [x, y] = pos(ev); G.toque(J, x, y, false, false); });
    const teclas = { ' ': 1, Enter: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };
    cv.addEventListener('keydown', ev => { if (!teclas[ev.key] || J.acabou) return; ev.preventDefault(); if (ev.repeat && (ev.key === ' ' || ev.key === 'Enter')) return; G.tecla(J, ev.key, true); });
    cv.addEventListener('keyup', ev => { if (!teclas[ev.key] || J.acabou) return; ev.preventDefault(); G.tecla(J, ev.key, false); });
    // o laço
    let rodando = true, antes = 0, raf = 0, vivoEm = 0;
    function quadro(t) {
      if (!rodando) return;
      const dt = antes ? clamp((t - antes) / 1000, 0, 0.05) * vel : 0;
      antes = t;
      passo(dt);
      raf = requestAnimationFrame(quadro);
    }
    function passo(dt) {
      if (J.acabou) return;
      J.seg += dt;
      G.passo(J, dt);
      if (tempo && J.seg >= tempo && !J.acabou) { J.fim(false, 'tempo'); return; }
      if (J.msgAte && J.seg > J.msgAte) { msgEl.textContent = ''; J.msgAte = 0; }
      desenhar();
      if (o.aoPasso && J.seg - vivoEm > 1) { vivoEm = J.seg; try { o.aoPasso(estado()); } catch (e) { /* opcional */ } }
    }
    function desenhar() {
      g.clearRect(0, 0, 640, 360);
      g.fillStyle = '#12151d'; g.fillRect(0, 0, 640, 360);
      G.desenho(J, g);
      const restam = tempo ? Math.max(0, Math.ceil(tempo - J.seg)) : null;
      info.replaceChildren(h('b', { text: nomeOficio(o.oficio) + ' · ' + nomeJeito(jeito) }), h('span', { class: 'bj-niv', text: NIVEIS[L][1] }),
        h('span', { text: 'Passos ' + Math.min(J.feitos, passos) + '/' + passos }), h('span', { class: J.erros ? 'bj-erros' : '', text: 'Erros ' + J.erros + '/' + maxErros }),
        h('span', { class: restam != null && restam <= 10 ? 'bj-pressa' : '', text: restam == null ? 'Sem pressa' : 'Tempo ' + restam + 's' }));
    }
    function parar() { rodando = false; cancelAnimationFrame(raf); }
    const estado = () => ({ jeito, nivel: NIVEIS[L][0], feitos: J.feitos, passos, erros: J.erros, maxErros, seg: Math.round(J.seg), tempo, acabou: J.acabou, res, s: J.s });
    desenhar();
    raf = requestAnimationFrame(quadro);
    setTimeout(() => { try { cv.focus({ preventScroll: true }); } catch (e) { /* ok */ } }, 30);
    return {
      parar, estado, raiz,
      // (para os testes e para a tela do mestre: avançar o tempo, apertar, e o jogo por dentro)
      passo: dt => passo(dt), acao: (id, desce) => G.acao(J, id, desce !== false), tecla: (k, desce) => G.tecla(J, k, desce !== false), toque: (x, y, desce) => G.toque(J, x, y, desce !== false, false),
      jogo: G, J,
    };
  }

  W.TC.bancadaJogos = { NIVEIS, OFICIOS, TEMPO, ERROS, nivDe, oficioDe, nomeOficio, jeitosDe, nomeJeito, jeitoValido, iniciar, JOGOS, corDoMetal };
  if (typeof module !== 'undefined') module.exports = W.TC.bancadaJogos;
})();
