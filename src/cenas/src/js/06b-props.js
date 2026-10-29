/* ---------------------------------------------------------------
   6b. OBJETOS DE CENÁRIO — tochas, fogueiras, móveis, árvores, armadilhas…
   Um objeto é um token com `prop` (o id do desenho): anda, gira, se esconde e se apaga como um token, mas não tem
   barras, condições, nome à mostra nem visão, e fica fora da ordem de turnos e das áreas de dano. As luzes (tocha,
   lampião, vela, fogueira, braseiro) carregam uma luz que tremula. Cada desenho é feito aqui, com formas simples,
   visto de cima, num quadrado de lado 2R centrado no token (R = metade do lado).
   --------------------------------------------------------------- */
const Props = (() => {
  const hsh = (i, k, s) => { const v = Math.sin(i * 127.1 + k * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
  const MAD = { esc: '#4a2c15', med: '#7a4b26', cla: '#a06a38', luz: '#c9905a' };
  const PED = { esc: '#4b4f57', med: '#727781', cla: '#979ca6', luz: '#bcc1c9' };
  const FER = { esc: '#22262c', med: '#3d434c', cla: '#626a76', luz: '#9aa3ae' };
  const CONTORNO = 'rgba(14,10,6,0.85)';

  function caixa(c, x, y, w, h, r) {
    const q = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + q, y); c.lineTo(x + w - q, y); c.quadraticCurveTo(x + w, y, x + w, y + q); c.lineTo(x + w, y + h - q);
    c.quadraticCurveTo(x + w, y + h, x + w - q, y + h); c.lineTo(x + q, y + h); c.quadraticCurveTo(x, y + h, x, y + h - q);
    c.lineTo(x, y + q); c.quadraticCurveTo(x, y, x + q, y); c.closePath();
  }
  // sombra suave no chão, um pouco para baixo e à direita (a luz vem do alto, à esquerda)
  function sombra(c, R, rx, ry, dx, dy) {
    c.save(); c.fillStyle = 'rgba(0,0,0,0.30)';
    c.beginPath(); c.ellipse((dx == null ? 0.08 : dx) * R, (dy == null ? 0.1 : dy) * R, rx * R, ry * R, 0, 0, TAU); c.fill();
    c.restore();
  }
  function linha(c, w, cor) { c.lineWidth = w; c.strokeStyle = cor || CONTORNO; c.lineJoin = c.lineCap = 'round'; c.stroke(); }
  function grad(c, x0, y0, x1, y1, cores) { const g = c.createLinearGradient(x0, y0, x1, y1); cores.forEach((cor, i) => g.addColorStop(i / (cores.length - 1), cor)); return g; }
  function radial(c, x, y, r, cores) { const g = c.createRadialGradient(x, y, 0, x, y, r); cores.forEach((cor, i) => g.addColorStop(i / (cores.length - 1), cor)); return g; }

  /* Chama que tremula, desenhada sempre "de pé" na tela (desfaz a rotação do objeto). (x, y) é a base dela; a é o
     tamanho. k separa as chamas de um mesmo objeto, para não tremularem juntas. */
  function chama(c, x, y, a, t, k, ang) {
    const f = Math.sin(t * 9.3 + k * 3.7) * 0.5 + Math.sin(t * 14.1 + k * 1.9) * 0.3 + Math.sin(t * 4.7 + k * 5.3) * 0.2;
    const alt = a * (1 + f * 0.14), larg = a * 0.5 * (1 - f * 0.05), bal = f * a * 0.1;
    c.save();
    c.translate(x, y); c.rotate(-ang);
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = radial(c, 0, -alt * 0.35, alt * 1.25, ['rgba(255,190,90,0.42)', 'rgba(255,140,40,0.14)', 'rgba(255,110,20,0)']);
    c.beginPath(); c.arc(0, -alt * 0.35, alt * 1.25, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over';
    const gota = (w, hh, sw) => { c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-w, -hh * 0.15, -w * 0.7, -hh * 0.62, sw, -hh); c.bezierCurveTo(w * 0.7, -hh * 0.62, w, -hh * 0.15, 0, 0); c.closePath(); };
    c.fillStyle = grad(c, 0, 0, 0, -alt, ['#e2380f', '#ff7a1a', '#ffb347']);
    gota(larg, alt, bal); c.fill();
    c.fillStyle = grad(c, 0, 0, 0, -alt * 0.6, ['#ffc95e', '#fff4c6']);
    gota(larg * 0.5, alt * 0.6, bal * 0.6); c.fill();
    c.restore();
  }
  function brasa(c, x, y, r, t, k) {
    const p = 0.6 + 0.4 * Math.sin(t * (2 + hsh(k, 1, 3) * 3) + k * 2.1);
    c.fillStyle = `rgba(255,${Math.round(90 + 90 * p)},${Math.round(30 * p)},${0.55 + 0.45 * p})`;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  function pedrinha(c, x, y, r, k, cores) {
    const p = cores || PED;
    c.beginPath();
    for (let i = 0; i <= 7; i++) { const a = i / 7 * TAU, rr = r * (0.82 + hsh(k, i, 9) * 0.3); if (i) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9); else c.moveTo(x + rr, y); }
    c.closePath();
    c.fillStyle = radial(c, x - r * 0.3, y - r * 0.35, r * 1.4, [p.luz, p.cla, p.med]); c.fill();
    linha(c, r * 0.16, 'rgba(20,20,24,0.7)');
  }
  function tabua(c, x, y, w, h, k, cores) {
    const m = cores || MAD;
    caixa(c, x, y, w, h, Math.min(w, h) * 0.12);
    c.fillStyle = grad(c, x, y, x, y + h, [m.cla, m.med]); c.fill();
    // veios
    c.save(); caixa(c, x, y, w, h, Math.min(w, h) * 0.12); c.clip();
    c.strokeStyle = 'rgba(40,22,8,0.35)'; c.lineWidth = Math.max(0.5, h * 0.06);
    for (let i = 0; i < 3; i++) { const yy = y + h * (0.25 + i * 0.25) + (hsh(k, i, 4) - 0.5) * h * 0.1; c.beginPath(); c.moveTo(x + w * 0.05, yy); c.bezierCurveTo(x + w * 0.35, yy - h * 0.12, x + w * 0.6, yy + h * 0.12, x + w * 0.95, yy); c.stroke(); }
    c.restore();
    caixa(c, x, y, w, h, Math.min(w, h) * 0.12); linha(c, Math.min(w, h) * 0.08);
  }
  function folhas(c, x, y, r, k, cores, n) {
    for (let i = 0; i < n; i++) {
      const a = hsh(k, i, 2) * TAU, d = r * (0.15 + hsh(k, i, 3) * 0.55), rr = r * (0.35 + hsh(k, i, 5) * 0.25);
      const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d;
      c.fillStyle = radial(c, cx - rr * 0.3, cy - rr * 0.35, rr * 1.3, [cores[2], cores[1], cores[0]]);
      c.beginPath(); c.arc(cx, cy, rr, 0, TAU); c.fill();
    }
  }

  // (lote 39) o osso (a haste e as duas pontas), o crânio de frente, o tom mais claro ou mais escuro de uma cor e as cores
  // do objeto (as do clã, quando ele veio da sede; senão, as de sempre)
  function osso(c, x1, y1, x2, y2, w) {
    c.save(); c.lineCap = 'round';
    c.strokeStyle = '#cfc3a6'; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1), px = -Math.sin(a) * w * 0.55, py = Math.cos(a) * w * 0.55;
    c.fillStyle = '#e2d7bd';
    for (const [x, y] of [[x1, y1], [x2, y2]]) for (const k of [-1, 1]) { c.beginPath(); c.arc(x + px * k, y + py * k, w * 0.62, 0, TAU); c.fill(); }
    c.restore();
  }
  function cranio(c, x, y, r) {
    c.save();
    c.fillStyle = radial(c, x - r * 0.3, y - r * 0.35, r * 1.5, ['#f4ecd8', '#e2d7bd', '#b0a284']);
    c.beginPath(); c.ellipse(x, y - r * 0.1, r, r * 0.9, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(x - r * 0.56, y + r * 0.4); c.lineTo(x - r * 0.42, y + r * 0.95); c.lineTo(x + r * 0.42, y + r * 0.95); c.lineTo(x + r * 0.56, y + r * 0.4); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(70,60,45,0.75)'; c.lineWidth = r * 0.08; c.beginPath(); c.ellipse(x, y - r * 0.1, r, r * 0.9, 0, 0, TAU); c.stroke();
    c.fillStyle = '#1e1812';
    for (const k of [-1, 1]) { c.beginPath(); c.ellipse(x + k * r * 0.38, y + r * 0.05, r * 0.24, r * 0.28, 0, 0, TAU); c.fill(); }
    c.beginPath(); c.moveTo(x, y + r * 0.32); c.lineTo(x - r * 0.1, y + r * 0.55); c.lineTo(x + r * 0.1, y + r * 0.55); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(40,32,24,0.8)'; c.lineWidth = r * 0.06;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * r * 0.14, y + r * 0.68); c.lineTo(x + i * r * 0.14, y + r * 0.92); c.stroke(); }
    c.restore();
  }
  const tom = (hex, f) => { const n = parseInt(hex.slice(1), 16), ch = k => { const v = (n >> k) & 255; return Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))); }; return '#' + [16, 8, 0].map(k => ch(k).toString(16).padStart(2, '0')).join(''); };
  const claro = hex => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150; };
  const CORES_PADRAO = ['#24305e', '#d9a441'];
  const coresDe = tok => (tok && Array.isArray(tok.cores) && tok.cores.length === 2 ? tok.cores : CORES_PADRAO);

  // (lote 7) o marcador de passagem: um selo redondo com uma porta e a seta, para dentro (entrada) ou para fora (saída)
  function marcaPassagem(c, R, entra) {
    sombra(c, R, 0.8, 0.8, 0.05, 0.08);
    c.fillStyle = radial(c, -R * 0.2, -R * 0.25, R * 1.1, ['#34404f', '#1f2833', '#151b23']); c.beginPath(); c.arc(0, 0, R * 0.82, 0, TAU); c.fill();
    c.lineWidth = R * 0.09; c.strokeStyle = '#e6ab4f'; c.stroke();
    const x0 = -R * 0.46, x1 = R * 0.04, y0 = -R * 0.42, y1 = R * 0.46, rr = (x1 - x0) / 2;
    c.beginPath(); c.moveTo(x0, y1); c.lineTo(x0, y0 + rr); c.arc((x0 + x1) / 2, y0 + rr, rr, Math.PI, 0); c.lineTo(x1, y1); c.closePath();
    c.fillStyle = grad(c, x0, 0, x1, 0, [MAD.luz, MAD.med]); c.fill(); linha(c, R * 0.05);
    c.fillStyle = '#f3d28a'; c.beginPath(); c.arc(x1 - R * 0.1, (y0 + y1) / 2 + R * 0.1, R * 0.05, 0, TAU); c.fill();
    const ya = R * 0.1, [de, ate] = entra ? [R * 0.62, R * 0.16] : [R * 0.14, R * 0.6], dir = Math.sign(ate - de);
    c.strokeStyle = '#f6e7c4'; c.fillStyle = '#f6e7c4'; c.lineWidth = R * 0.1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(de, ya); c.lineTo(ate - dir * R * 0.08, ya); c.stroke();
    c.beginPath(); c.moveTo(ate + dir * R * 0.06, ya); c.lineTo(ate - dir * R * 0.14, ya - R * 0.15); c.lineTo(ate - dir * R * 0.14, ya + R * 0.15); c.closePath(); c.fill();
  }

  /* (lote 7, parte 4b) Os marcadores do encontro, só do mestre: a chegada (a bandeira verde) e a emboscada (as duas
     adagas cruzadas no vermelho). Nascem ocultos dos jogadores. */
  function marcaEncontro(c, R, chegada) {
    sombra(c, R, 0.8, 0.8, 0.05, 0.08);
    c.fillStyle = radial(c, -R * 0.2, -R * 0.25, R * 1.1, chegada ? ['#4fae6a', '#2f7f48', '#1d5532'] : ['#d0574a', '#a8352c', '#6e1e18']); c.beginPath(); c.arc(0, 0, R * 0.82, 0, TAU); c.fill();
    c.lineWidth = R * 0.08; c.strokeStyle = '#f6e7c4'; c.stroke();
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (chegada) {
      c.strokeStyle = '#f6e7c4'; c.lineWidth = R * 0.09; c.beginPath(); c.moveTo(-R * 0.28, R * 0.48); c.lineTo(-R * 0.28, -R * 0.5); c.stroke();
      c.fillStyle = '#f6e7c4'; c.beginPath(); c.moveTo(-R * 0.24, -R * 0.5); c.quadraticCurveTo(R * 0.1, -R * 0.62, R * 0.46, -R * 0.4); c.quadraticCurveTo(R * 0.12, -R * 0.24, -R * 0.24, -R * 0.08); c.closePath(); c.fill();
    } else {
      for (const s of [-1, 1]) {
        c.save(); c.rotate(s * Math.PI / 4);
        c.fillStyle = '#e8edf2'; c.beginPath(); c.moveTo(0, -R * 0.56); c.lineTo(R * 0.08, -R * 0.08); c.lineTo(-R * 0.08, -R * 0.08); c.closePath(); c.fill();
        c.fillStyle = '#c9a24a'; c.fillRect(-R * 0.17, -R * 0.08, R * 0.34, R * 0.07);
        c.fillStyle = '#5a3a22'; c.fillRect(-R * 0.045, -R * 0.01, R * 0.09, R * 0.36);
        c.restore();
      }
    }
  }
  // (lote 13) o marcador do ponto de interesse da Região livre, só do mestre: a estrela de quatro pontas no dourado
  function marcaInteresse(c, R) {
    sombra(c, R, 0.8, 0.8, 0.05, 0.08);
    c.fillStyle = radial(c, -R * 0.2, -R * 0.25, R * 1.1, ['#f0c66a', '#c08a2e', '#7a5418']); c.beginPath(); c.arc(0, 0, R * 0.82, 0, TAU); c.fill();
    c.lineWidth = R * 0.08; c.strokeStyle = '#f6e7c4'; c.stroke();
    c.fillStyle = '#fff8e6'; c.beginPath();
    for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, r = i % 2 ? R * 0.17 : R * 0.56; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill();
    c.fillStyle = '#c08a2e'; c.beginPath(); c.arc(0, 0, R * 0.09, 0, TAU); c.fill();
  }

  // (lote 22) o ponto de reforço: o portão roxo com as setas que saem (os tokens guardados nascem dele)
  function marcaReforco(c, R) {
    sombra(c, R, 0.8, 0.8, 0.05, 0.08);
    c.fillStyle = radial(c, -R * 0.2, -R * 0.25, R * 1.1, ['#9a74d6', '#6a46a8', '#3e2470']); c.beginPath(); c.arc(0, 0, R * 0.82, 0, TAU); c.fill();
    c.lineWidth = R * 0.08; c.strokeStyle = '#f0e4ff'; c.stroke();
    // o arco do portão
    c.lineWidth = R * 0.09; c.lineCap = 'round'; c.strokeStyle = '#f0e4ff';
    c.beginPath(); c.moveTo(-R * 0.3, R * 0.42); c.lineTo(-R * 0.3, -R * 0.05); c.arc(0, -R * 0.05, R * 0.3, Math.PI, 0); c.lineTo(R * 0.3, R * 0.42); c.stroke();
    // as setas para fora
    c.fillStyle = '#f0e4ff';
    for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * R * 0.62, R * 0.12); c.lineTo(sx * R * 0.44, -R * 0.02); c.lineTo(sx * R * 0.44, R * 0.26); c.closePath(); c.fill(); }
  }
  // (lote 13, parte 13c) o achado raro: a moeda de ouro com o brilho de quatro pontas
  function marcaAchado(c, R) {
    sombra(c, R, 0.8, 0.8, 0.05, 0.08);
    c.fillStyle = radial(c, -R * 0.2, -R * 0.25, R * 1.1, ['#fff0b8', '#e6b43a', '#8a5a12']); c.beginPath(); c.arc(0, 0, R * 0.82, 0, TAU); c.fill();
    c.lineWidth = R * 0.08; c.strokeStyle = '#5a3a0a'; c.stroke();
    c.fillStyle = '#fffbe8'; c.beginPath();
    for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, r = i % 2 ? R * 0.12 : R * 0.6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill();
    c.fillStyle = '#e6b43a'; c.beginPath(); c.arc(0, 0, R * 0.1, 0, TAU); c.fill();
  }

  /* ---- O catálogo ---- */
  const G = [
    { id: 'luz', n: 'Luzes' },
    { id: 'movel', n: 'Móveis e baús' },
    { id: 'natureza', n: 'Natureza' },
    { id: 'perigo', n: 'Perigos e marcos' },
    // (lote 39)
    { id: 'masmorra', n: 'Masmorra e chefe' },
    { id: 'cla', n: 'Clã e sede' },
    { id: 'linhagem', n: 'Linhagens' },
    { id: 'viagem', n: 'Viagem e acampamento' },
  ];
  const P = {
    /* ---------- Luzes ---------- */
    fogueira: {
      n: 'Fogueira', g: 'luz', size: 1, fogo: true, luz: { bright: 5, dim: 10, c: '#ff9d4d' },
      draw(c, R, t, s, ang) {
        sombra(c, R, 0.86, 0.8, 0.05, 0.06);
        c.fillStyle = radial(c, 0, 0, R * 0.7, ['#2a1408', '#1a0d06', 'rgba(26,13,6,0)']); c.beginPath(); c.arc(0, 0, R * 0.72, 0, TAU); c.fill();
        for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + 0.3; pedrinha(c, Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72, R * 0.17, s + i); }
        // lenha cruzada
        for (let i = 0; i < 4; i++) {
          c.save(); c.rotate(i / 4 * Math.PI + 0.4);
          caixa(c, -R * 0.5, -R * 0.075, R * 1.0, R * 0.15, R * 0.07); c.fillStyle = grad(c, 0, -R * 0.075, 0, R * 0.075, [MAD.cla, MAD.esc]); c.fill(); linha(c, R * 0.03);
          c.fillStyle = '#e8b06a'; c.beginPath(); c.ellipse(R * 0.5, 0, R * 0.03, R * 0.07, 0, 0, TAU); c.fill();
          c.restore();
        }
        for (let i = 0; i < 10; i++) brasa(c, (hsh(s, i, 1) - 0.5) * R * 0.75, (hsh(s, i, 2) - 0.5) * R * 0.75, R * (0.03 + hsh(s, i, 3) * 0.04), t, i);
        chama(c, -R * 0.14, R * 0.12, R * 0.62, t, 1, ang);
        chama(c, R * 0.16, R * 0.14, R * 0.55, t, 2, ang);
        chama(c, 0, R * 0.2, R * 0.8, t, 3, ang);
      },
    },
    tocha: {
      n: 'Tocha de parede', g: 'luz', size: 1, fogo: true, luz: { bright: 4, dim: 8, c: '#ffc477' },
      draw(c, R, t, s, ang) {
        // a placa presa na parede (em cima) e o cabo que sai dela
        sombra(c, R, 0.2, 0.42, 0.05, -0.3);
        caixa(c, -R * 0.32, -R * 0.98, R * 0.64, R * 0.2, R * 0.05); c.fillStyle = grad(c, 0, -R, 0, -R * 0.78, [FER.cla, FER.esc]); c.fill(); linha(c, R * 0.04);
        for (const x of [-0.2, 0.2]) { c.fillStyle = FER.luz; c.beginPath(); c.arc(x * R, -R * 0.88, R * 0.035, 0, TAU); c.fill(); }
        caixa(c, -R * 0.07, -R * 0.82, R * 0.14, R * 0.36, R * 0.03); c.fillStyle = FER.med; c.fill(); linha(c, R * 0.03);
        caixa(c, -R * 0.1, -R * 0.5, R * 0.2, R * 0.62, R * 0.08); c.fillStyle = grad(c, -R * 0.1, 0, R * 0.1, 0, [MAD.cla, MAD.esc]); c.fill(); linha(c, R * 0.035);
        c.fillStyle = '#3a2412'; caixa(c, -R * 0.13, R * 0.02, R * 0.26, R * 0.16, R * 0.05); c.fill();
        chama(c, 0, R * 0.1, R * 0.72, t, s, ang);
      },
    },
    lampiao: {
      n: 'Lampião', g: 'luz', size: 1, fogo: true, luz: { bright: 6, dim: 12, c: '#ffe2ad' },
      draw(c, R, t, s, ang) {
        sombra(c, R, 0.5, 0.48);
        const f = 0.85 + 0.15 * Math.sin(t * 7 + s);
        c.save(); c.globalCompositeOperation = 'lighter';
        c.fillStyle = radial(c, 0, 0, R * 0.95, [`rgba(255,214,140,${0.35 * f})`, 'rgba(255,170,80,0.08)', 'rgba(255,150,60,0)']); c.beginPath(); c.arc(0, 0, R * 0.95, 0, TAU); c.fill();
        c.restore();
        // armação de seis lados, com o vidro aceso
        const hex = r => { c.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * TAU + Math.PI / 6; if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); };
        hex(R * 0.48); c.fillStyle = FER.esc; c.fill(); linha(c, R * 0.05);
        hex(R * 0.38); c.fillStyle = radial(c, 0, 0, R * 0.4, ['#fff6d2', `rgba(255,${Math.round(196 * f)},110,1)`, '#d98a2e']); c.fill();
        c.strokeStyle = FER.med; c.lineWidth = R * 0.05;
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R * 0.46, Math.sin(a) * R * 0.46); c.stroke(); }
        c.fillStyle = FER.cla; c.beginPath(); c.arc(0, 0, R * 0.13, 0, TAU); c.fill(); linha(c, R * 0.03);
        c.strokeStyle = FER.luz; c.lineWidth = R * 0.045; c.beginPath(); c.arc(0, 0, R * 0.2, -Math.PI * 0.85, -Math.PI * 0.15); c.stroke();
      },
    },
    vela: {
      n: 'Velas', g: 'luz', size: 1, fogo: true, luz: { bright: 1, dim: 2.5, c: '#ffd9a0' },
      draw(c, R, t, s, ang) {
        sombra(c, R, 0.55, 0.45);
        c.fillStyle = grad(c, 0, -R * 0.5, 0, R * 0.5, [FER.cla, FER.esc]); c.beginPath(); c.ellipse(0, R * 0.05, R * 0.55, R * 0.42, 0, 0, TAU); c.fill(); linha(c, R * 0.04);
        const velas = [[-0.24, 0.1, 0.17], [0.2, 0.16, 0.15], [0.0, -0.12, 0.19]];
        velas.forEach(([x, y, r], i) => {
          c.fillStyle = radial(c, (x - r * 0.3) * R, (y - r * 0.3) * R, r * R * 1.3, ['#fffbef', '#f1e2c2', '#cbb48c']);
          c.beginPath(); c.arc(x * R, y * R, r * R, 0, TAU); c.fill(); linha(c, R * 0.025, 'rgba(90,70,40,0.8)');
          c.fillStyle = '#f7ecd2'; c.beginPath(); c.arc((x + r * 0.55) * R, (y + r * 0.4) * R, r * R * 0.32, 0, TAU); c.fill();     // um pingo de cera
        });
        velas.forEach(([x, y, r], i) => chama(c, x * R, y * R, R * (0.28 + r), t, s + i * 7, ang));
      },
    },
    braseiro: {
      n: 'Braseiro', g: 'luz', size: 1, fogo: true, luz: { bright: 4, dim: 8, c: '#ff8a3d' },
      draw(c, R, t, s, ang) {
        sombra(c, R, 0.78, 0.74);
        for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + Math.PI / 2; c.fillStyle = FER.esc; c.beginPath(); c.arc(Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78, R * 0.1, 0, TAU); c.fill(); linha(c, R * 0.03); }
        c.fillStyle = grad(c, 0, -R * 0.7, 0, R * 0.7, [FER.luz, FER.med, FER.esc]); c.beginPath(); c.arc(0, 0, R * 0.7, 0, TAU); c.fill(); linha(c, R * 0.05);
        c.fillStyle = '#1b0e08'; c.beginPath(); c.arc(0, 0, R * 0.56, 0, TAU); c.fill();
        c.save(); c.beginPath(); c.arc(0, 0, R * 0.56, 0, TAU); c.clip();
        for (let i = 0; i < 16; i++) { const a = hsh(s, i, 7) * TAU, d = R * 0.5 * Math.sqrt(hsh(s, i, 8)); brasa(c, Math.cos(a) * d, Math.sin(a) * d, R * (0.06 + hsh(s, i, 9) * 0.05), t, i); }
        c.restore();
        // os rebites da borda
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.fillStyle = FER.luz; c.beginPath(); c.arc(Math.cos(a) * R * 0.63, Math.sin(a) * R * 0.63, R * 0.03, 0, TAU); c.fill(); }
        chama(c, -R * 0.12, R * 0.12, R * 0.45, t, s + 1, ang);
        chama(c, R * 0.15, R * 0.05, R * 0.5, t, s + 2, ang);
      },
    },

    // (lote 7) a lanterna de papel dos lugares orientais: luz quente e suave, vermelha, laranja ou branca
    lanterna: {
      n: 'Lanterna de papel', g: 'luz', size: 1, luz: { bright: 3, dim: 7, c: '#ffb878' },
      draw(c, R, t, s) {
        sombra(c, R, 0.5, 0.5);
        const f = 0.88 + 0.12 * Math.sin(t * 3 + s);
        c.save(); c.globalCompositeOperation = 'lighter';
        c.fillStyle = radial(c, 0, 0, R * 0.95, [`rgba(255,170,110,${0.32 * f})`, 'rgba(255,120,60,0.08)', 'rgba(255,100,40,0)']); c.beginPath(); c.arc(0, 0, R * 0.95, 0, TAU); c.fill();
        c.restore();
        const cor = ['#c8352a', '#d9662f', '#f0e6cf'][s % 3];
        c.fillStyle = radial(c, -R * 0.12, -R * 0.15, R * 0.6, ['#ffe3b0', cor, cor === '#f0e6cf' ? '#c9b48e' : '#7a1a14']); c.beginPath(); c.arc(0, 0, R * 0.46, 0, TAU); c.fill(); linha(c, R * 0.04);
        // as varetas do papel (vistas de cima, em roda) e a tampa preta
        c.strokeStyle = 'rgba(60,20,10,0.45)'; c.lineWidth = R * 0.025;
        for (const k of [0.18, 0.3, 0.4]) { c.beginPath(); c.arc(0, 0, R * k, 0, TAU); c.stroke(); }
        c.fillStyle = '#1d1a18'; c.beginPath(); c.arc(0, 0, R * 0.13, 0, TAU); c.fill();
        c.fillStyle = '#e8c56a'; c.beginPath(); c.arc(0, 0, R * 0.04, 0, TAU); c.fill();
      },
    },
    /* ---------- Móveis e baús ---------- */
    bau: {
      n: 'Baú', g: 'movel', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.82, 0.6, 0.08, 0.14);
        const w = R * 1.6, h = R * 1.1, x = -w / 2, y = -h / 2;
        caixa(c, x, y, w, h, R * 0.1); c.fillStyle = grad(c, 0, y, 0, y + h, [MAD.luz, MAD.cla, MAD.med]); c.fill();
        c.save(); caixa(c, x, y, w, h, R * 0.1); c.clip();
        c.strokeStyle = 'rgba(50,28,10,0.55)'; c.lineWidth = R * 0.03;
        for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x, y + h * i / 4); c.lineTo(x + w, y + h * i / 4); c.stroke(); }
        // as cintas de ferro
        for (const fx of [0.18, 0.82]) { c.fillStyle = grad(c, x + w * fx - R * 0.08, 0, x + w * fx + R * 0.08, 0, [FER.cla, FER.esc]); c.fillRect(x + w * fx - R * 0.08, y, R * 0.16, h); }
        c.restore();
        caixa(c, x, y, w, h, R * 0.1); linha(c, R * 0.06);
        c.fillStyle = '#d6a64a'; caixa(c, -R * 0.12, y + h - R * 0.3, R * 0.24, R * 0.26, R * 0.04); c.fill(); linha(c, R * 0.03);
        c.fillStyle = '#3a2410'; c.beginPath(); c.arc(0, y + h - R * 0.19, R * 0.035, 0, TAU); c.fill();
      },
    },
    mesa: {
      n: 'Mesa', g: 'movel', size: 2,
      draw(c, R, t, s) {
        sombra(c, R, 0.95, 0.62, 0.05, 0.08);
        const w = R * 1.84, h = R * 1.1, x = -w / 2, y = -h / 2;
        caixa(c, x, y, w, h, R * 0.06); c.fillStyle = MAD.med; c.fill();
        const n = 5;
        for (let i = 0; i < n; i++) tabua(c, x + R * 0.03, y + R * 0.03 + i * (h - R * 0.06) / n, w - R * 0.06, (h - R * 0.06) / n - R * 0.01, s + i);
        caixa(c, x, y, w, h, R * 0.06); linha(c, R * 0.04);
        // uma caneca e um prato
        c.fillStyle = '#d9d2c2'; c.beginPath(); c.arc(-R * 0.4, -R * 0.08, R * 0.16, 0, TAU); c.fill(); linha(c, R * 0.02, 'rgba(60,50,40,0.7)');
        c.fillStyle = '#c4bba8'; c.beginPath(); c.arc(-R * 0.4, -R * 0.08, R * 0.1, 0, TAU); c.fill();
        c.fillStyle = MAD.esc; c.beginPath(); c.arc(R * 0.42, R * 0.12, R * 0.1, 0, TAU); c.fill(); linha(c, R * 0.02);
        c.fillStyle = '#6b3a12'; c.beginPath(); c.arc(R * 0.42, R * 0.12, R * 0.065, 0, TAU); c.fill();
      },
    },
    cadeira: {
      n: 'Cadeira', g: 'movel', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.55, 0.55, 0.06, 0.1);
        tabua(c, -R * 0.5, -R * 0.38, R, R * 0.9, s);
        caixa(c, -R * 0.56, -R * 0.62, R * 1.12, R * 0.26, R * 0.08); c.fillStyle = grad(c, 0, -R * 0.62, 0, -R * 0.36, [MAD.cla, MAD.esc]); c.fill(); linha(c, R * 0.05);
        for (const x of [-0.42, 0.42]) { c.fillStyle = MAD.esc; c.beginPath(); c.arc(x * R, R * 0.43, R * 0.06, 0, TAU); c.fill(); }
      },
    },
    cama: {
      n: 'Cama', g: 'movel', size: 2,
      draw(c, R, t, s) {
        sombra(c, R, 0.62, 0.95, 0.06, 0.06);
        const w = R * 1.1, h = R * 1.86, x = -w / 2, y = -h / 2;
        caixa(c, x, y, w, h, R * 0.06); c.fillStyle = grad(c, x, 0, x + w, 0, [MAD.cla, MAD.med]); c.fill(); linha(c, R * 0.05);
        caixa(c, x + R * 0.06, y + R * 0.06, w - R * 0.12, h - R * 0.12, R * 0.08); c.fillStyle = '#e9e0cf'; c.fill();
        // travesseiro
        caixa(c, x + R * 0.14, y + R * 0.12, w - R * 0.28, R * 0.36, R * 0.12); c.fillStyle = radial(c, 0, y + R * 0.25, w * 0.5, ['#ffffff', '#e2dccf']); c.fill(); linha(c, R * 0.025, 'rgba(90,80,60,0.6)');
        // cobertor, com a dobra
        caixa(c, x + R * 0.06, y + h * 0.36, w - R * 0.12, h * 0.6, R * 0.08); c.fillStyle = grad(c, 0, y + h * 0.36, 0, y + h, ['#a8473a', '#7d2f27']); c.fill();
        caixa(c, x + R * 0.06, y + h * 0.36, w - R * 0.12, R * 0.16, R * 0.06); c.fillStyle = '#c8705f'; c.fill();
        c.strokeStyle = 'rgba(255,220,200,0.25)'; c.lineWidth = R * 0.025;
        for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x + R * 0.1, y + h * (0.45 + i * 0.12)); c.lineTo(x + w - R * 0.1, y + h * (0.45 + i * 0.12)); c.stroke(); }
        caixa(c, x, y, w, h, R * 0.06); linha(c, R * 0.05);
      },
    },
    barril: {
      n: 'Barril', g: 'movel', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.72, 0.7);
        c.fillStyle = radial(c, -R * 0.2, -R * 0.25, R * 0.95, [MAD.luz, MAD.cla, MAD.med]); c.beginPath(); c.arc(0, 0, R * 0.7, 0, TAU); c.fill();
        c.save(); c.beginPath(); c.arc(0, 0, R * 0.7, 0, TAU); c.clip();
        c.strokeStyle = 'rgba(50,28,10,0.55)'; c.lineWidth = R * 0.03;
        for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * R * 0.2, -R); c.lineTo(i * R * 0.2, R); c.stroke(); }
        c.restore();
        for (const r of [0.7, 0.52]) { c.strokeStyle = FER.med; c.lineWidth = R * 0.08; c.beginPath(); c.arc(0, 0, r * R - R * 0.04, 0, TAU); c.stroke(); }
        c.beginPath(); c.arc(0, 0, R * 0.7, 0, TAU); linha(c, R * 0.05);
        c.fillStyle = '#2a1708'; c.beginPath(); c.arc(R * 0.18, -R * 0.12, R * 0.06, 0, TAU); c.fill();     // a rolha
      },
    },
    caixote: {
      n: 'Caixote', g: 'movel', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.7, 0.7, 0.1, 0.12);
        const w = R * 1.36;
        caixa(c, -w / 2, -w / 2, w, w, R * 0.06); c.fillStyle = grad(c, -w / 2, -w / 2, w / 2, w / 2, ['#c79b62', '#9a6c3a']); c.fill();
        c.save(); caixa(c, -w / 2, -w / 2, w, w, R * 0.06); c.clip();
        c.strokeStyle = 'rgba(60,35,12,0.45)'; c.lineWidth = R * 0.025;
        for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(-w / 2, -w / 2 + w * i / 5); c.lineTo(w / 2, -w / 2 + w * i / 5); c.stroke(); }
        c.restore();
        // moldura e a travessa em X
        c.strokeStyle = '#7a5128'; c.lineWidth = R * 0.14; c.lineCap = 'butt';
        caixa(c, -w / 2 + R * 0.07, -w / 2 + R * 0.07, w - R * 0.14, w - R * 0.14, R * 0.02); c.stroke();
        c.beginPath(); c.moveTo(-w / 2 + R * 0.12, -w / 2 + R * 0.12); c.lineTo(w / 2 - R * 0.12, w / 2 - R * 0.12); c.stroke();
        caixa(c, -w / 2, -w / 2, w, w, R * 0.06); linha(c, R * 0.05);
        for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.fillStyle = FER.cla; c.beginPath(); c.arc(x * (w / 2 - R * 0.07), y * (w / 2 - R * 0.07), R * 0.03, 0, TAU); c.fill(); }
      },
    },
    estante: {
      n: 'Estante', g: 'movel', size: 2,
      draw(c, R, t, s) {
        sombra(c, R, 0.95, 0.4, 0.04, 0.0);
        const w = R * 1.9, h = R * 0.62, x = -w / 2, y = -h / 2;
        caixa(c, x, y, w, h, R * 0.04); c.fillStyle = MAD.esc; c.fill(); linha(c, R * 0.05);
        // as lombadas, de frente para baixo
        let bx = x + R * 0.06;
        const cores = ['#7d2f27', '#2f5a7d', '#3d6b3a', '#a0782a', '#5a3d7d', '#8a4a2a', '#2a5a5a', '#9a3a4a'];
        for (let i = 0; bx < x + w - R * 0.1; i++) {
          const bw = R * (0.09 + hsh(s, i, 1) * 0.07), bh = h * (0.62 + hsh(s, i, 2) * 0.28);
          c.fillStyle = cores[Math.floor(hsh(s, i, 3) * cores.length)];
          c.fillRect(bx, y + h - R * 0.05 - bh, Math.min(bw, x + w - R * 0.06 - bx), bh);
          c.fillStyle = 'rgba(255,230,160,0.35)'; c.fillRect(bx + bw * 0.25, y + h - R * 0.05 - bh * 0.7, bw * 0.5, R * 0.02);
          bx += bw + R * 0.012;
        }
        caixa(c, x, y, w, h, R * 0.04); linha(c, R * 0.05);
      },
    },

    // (lote 7) os móveis dos estilos: a almofada, o tapete, o jarro de barro e a bigorna
    almofada: {
      n: 'Almofada', g: 'movel', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.62, 0.62, 0.06, 0.08);
        const cores = [['#8e2f3c', '#c2505f'], ['#2f5f6e', '#4f8fa0'], ['#6b4a8e', '#9572b8'], ['#a0742a', '#d0a24a']][s % 4];
        c.save(); c.rotate(0.12);
        caixa(c, -R * 0.55, -R * 0.55, R * 1.1, R * 1.1, R * 0.28); c.fillStyle = radial(c, -R * 0.15, -R * 0.2, R * 1.0, [cores[1], cores[0]]); c.fill(); linha(c, R * 0.05);
        c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = R * 0.03;
        c.beginPath(); c.moveTo(-R * 0.42, -R * 0.42); c.lineTo(R * 0.42, R * 0.42); c.moveTo(R * 0.42, -R * 0.42); c.lineTo(-R * 0.42, R * 0.42); c.stroke();
        c.fillStyle = '#e9d39a'; c.beginPath(); c.arc(0, 0, R * 0.07, 0, TAU); c.fill();
        for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.arc(x * R * 0.6, y * R * 0.6, R * 0.06, 0, TAU); c.fill(); }
        c.restore();
      },
    },
    tapete: {
      n: 'Tapete', g: 'movel', size: 2,
      draw(c, R, t, s) {
        const w = R * 1.9, hh = R * 1.25, pal = [['#7a2430', '#c8963e', '#2a3c5c'], ['#244a5c', '#d9b25a', '#6b2f2a'], ['#5b3a1f', '#e0c27a', '#2f4f3a']][s % 3];
        c.save(); c.globalAlpha = 0.96;
        caixa(c, -w / 2, -hh / 2, w, hh, R * 0.04); c.fillStyle = pal[0]; c.fill();
        c.strokeStyle = pal[1]; c.lineWidth = R * 0.06; c.strokeRect(-w / 2 + R * 0.12, -hh / 2 + R * 0.12, w - R * 0.24, hh - R * 0.24);
        c.lineWidth = R * 0.025; c.strokeRect(-w / 2 + R * 0.22, -hh / 2 + R * 0.22, w - R * 0.44, hh - R * 0.44);
        // o medalhão do meio e as franjas nas pontas
        c.fillStyle = pal[2]; c.beginPath(); c.moveTo(0, -hh * 0.3); c.lineTo(w * 0.22, 0); c.lineTo(0, hh * 0.3); c.lineTo(-w * 0.22, 0); c.closePath(); c.fill();
        c.strokeStyle = pal[1]; c.lineWidth = R * 0.03; c.stroke();
        c.fillStyle = pal[1]; c.beginPath(); c.arc(0, 0, R * 0.07, 0, TAU); c.fill();
        c.strokeStyle = '#e8dcc0'; c.lineWidth = R * 0.02;
        for (let y = -hh / 2 + R * 0.06; y < hh / 2; y += R * 0.09) for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * w / 2, y); c.lineTo(sx * (w / 2 + R * 0.07), y); c.stroke(); }
        c.restore();
      },
    },
    jarro: {
      n: 'Jarro de barro', g: 'movel', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.56, 0.56, 0.07, 0.09);
        c.fillStyle = radial(c, -R * 0.15, -R * 0.18, R * 0.75, ['#d98f5a', '#b5643a', '#7a3c1f']); c.beginPath(); c.arc(0, 0, R * 0.5, 0, TAU); c.fill(); linha(c, R * 0.05);
        c.strokeStyle = 'rgba(250,230,200,0.35)'; c.lineWidth = R * 0.04; c.beginPath(); c.arc(0, 0, R * 0.38, 0, TAU); c.stroke();
        c.fillStyle = '#5a2a12'; c.beginPath(); c.arc(0, 0, R * 0.2, 0, TAU); c.fill(); linha(c, R * 0.04, 'rgba(40,18,6,0.9)');
        c.fillStyle = 'rgba(20,8,2,0.8)'; c.beginPath(); c.arc(0, 0, R * 0.13, 0, TAU); c.fill();
      },
    },
    bigorna: {
      n: 'Bigorna', g: 'movel', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.7, 0.62, 0.06, 0.08);
        c.fillStyle = radial(c, 0, 0, R * 0.6, [MAD.luz, MAD.cla, MAD.med]); c.beginPath(); c.arc(0, 0, R * 0.55, 0, TAU); c.fill(); linha(c, R * 0.04);
        c.strokeStyle = 'rgba(60,35,12,0.45)'; c.lineWidth = R * 0.025; for (const k of [0.2, 0.35, 0.46]) { c.beginPath(); c.arc(0, 0, R * k, 0, TAU); c.stroke(); }
        c.beginPath(); c.moveTo(-R * 0.5, -R * 0.2); c.lineTo(R * 0.3, -R * 0.2); c.quadraticCurveTo(R * 0.85, -R * 0.12, R * 0.92, 0); c.quadraticCurveTo(R * 0.85, R * 0.12, R * 0.3, R * 0.2); c.lineTo(-R * 0.5, R * 0.2); c.closePath();
        c.fillStyle = grad(c, 0, -R * 0.2, 0, R * 0.2, [FER.luz, FER.cla, FER.med]); c.fill(); linha(c, R * 0.05);
        c.fillStyle = 'rgba(255,255,255,0.18)'; caixa(c, -R * 0.42, -R * 0.12, R * 0.6, R * 0.08, R * 0.03); c.fill();
      },
    },
    // (lote 7) o banco (vários em fila viram um banco comprido) e o balcão (a frente, mais escura, fica para baixo;
    // vários em fila viram o balcão da taverna ou da loja)
    banco: {
      n: 'Banco', g: 'movel', size: 1,
      draw(c, R, t, s) {
        c.save(); c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(-R * 0.98, -R * 0.3, R * 1.96, R * 0.8); c.restore();
        // os pés (aparecem um pouco além do assento) e as duas tábuas do assento
        for (const x of [-0.62, 0.62]) { caixa(c, x * R - R * 0.09, -R * 0.48, R * 0.18, R * 0.96, R * 0.04); c.fillStyle = MAD.esc; c.fill(); }
        tabua(c, -R, -R * 0.38, R * 2, R * 0.37, s);
        tabua(c, -R, R * 0.01, R * 2, R * 0.37, s + 1);
        c.strokeStyle = CONTORNO; c.lineWidth = R * 0.045; c.beginPath(); c.moveTo(-R, -R * 0.38); c.lineTo(R, -R * 0.38); c.moveTo(-R, R * 0.38); c.lineTo(R, R * 0.38); c.stroke();
      },
    },
    balcao: {
      n: 'Balcão', g: 'movel', size: 1,
      draw(c, R, t, s) {
        c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-R, -R * 0.62, R * 2, R * 1.56); c.restore();
        // o tampo de tábuas (de comprido) e a frente, mais escura (o lado de quem pede)
        c.fillStyle = MAD.esc; c.fillRect(-R, -R * 0.78, R * 2, R * 1.56);
        for (let i = 0; i < 4; i++) tabua(c, -R, -R * 0.75 + i * R * 0.29, R * 2, R * 0.27, s + i, { esc: MAD.esc, med: '#8a5a2e', cla: '#b07a44', luz: MAD.luz });
        c.fillStyle = grad(c, 0, R * 0.42, 0, R * 0.78, ['#5e3a1c', '#2e1a0b']); c.fillRect(-R, R * 0.42, R * 2, R * 0.36);
        c.fillStyle = 'rgba(255,225,170,0.18)'; c.fillRect(-R, -R * 0.78, R * 2, R * 0.05);
        c.strokeStyle = CONTORNO; c.lineWidth = R * 0.05; c.beginPath(); c.moveTo(-R, -R * 0.78); c.lineTo(R, -R * 0.78); c.moveTo(-R, R * 0.78); c.lineTo(R, R * 0.78); c.stroke();
        // às vezes, uma caneca em cima
        if (s % 3 === 0) { const x = R * (hsh(s, 1, 2) - 0.5) * 1.2; c.fillStyle = '#d9d2c2'; c.beginPath(); c.arc(x, -R * 0.2, R * 0.14, 0, TAU); c.fill(); linha(c, R * 0.025, 'rgba(60,50,40,0.7)'); c.fillStyle = '#6b3a12'; c.beginPath(); c.arc(x, -R * 0.2, R * 0.08, 0, TAU); c.fill(); }
      },
    },
    // (lote 7, parte 4b) a pele estendida no chão (onde se dorme nas tendas da tribo): a parda, a branca e a malhada
    pele: {
      n: 'Pele', g: 'movel', size: 1,
      draw(c, R, t, s) {
        const k = s % 3, cor = [['#6e4a2c', '#9a6c44', '#b88a5a'], ['#c9c2b4', '#e2ddd2', '#f4f1ea'], ['#7d756a', '#a39a8c', '#c2b9aa']][k];
        const contorno = () => {
          c.beginPath(); c.moveTo(0, -R * 0.86);
          const pts = [[R * 0.22, -R * 0.62], [R * 0.72, -R * 0.78], [R * 0.5, -R * 0.36], [R * 0.6, R * 0.1], [R * 0.86, R * 0.62], [R * 0.36, R * 0.5], [R * 0.12, R * 0.86], [-R * 0.12, R * 0.86], [-R * 0.36, R * 0.5], [-R * 0.86, R * 0.62], [-R * 0.6, R * 0.1], [-R * 0.5, -R * 0.36], [-R * 0.72, -R * 0.78], [-R * 0.22, -R * 0.62]];
          for (const [x, y] of pts) c.lineTo(x * (0.94 + 0.06 * hsh(s, x * 10, 3)), y);
          c.closePath();
        };
        c.save(); c.translate(R * 0.06, R * 0.08); contorno(); c.fillStyle = 'rgba(0,0,0,0.28)'; c.fill(); c.restore();
        contorno(); c.fillStyle = radial(c, 0, 0, R * 0.9, [cor[2], cor[1], cor[0]]); c.fill(); linha(c, R * 0.04, 'rgba(40,26,14,0.8)');
        // o pelo (risquinhos) e, na malhada, as manchas
        c.strokeStyle = k === 1 ? 'rgba(150,140,125,0.55)' : 'rgba(40,26,14,0.4)'; c.lineWidth = Math.max(0.6, R * 0.025);
        for (let i = 0; i < 22; i++) { const a = hsh(s, i, 7) * TAU, d = hsh(s, i, 8) * R * 0.55, x = Math.cos(a) * d * 0.8, y = Math.sin(a) * d; c.beginPath(); c.moveTo(x, y); c.lineTo(x + R * 0.07, y + R * 0.12); c.stroke(); }
        if (k === 2) { c.fillStyle = 'rgba(50,44,38,0.55)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse((hsh(s, i, 9) - 0.5) * R * 0.8, (hsh(s, i, 10) - 0.5) * R * 1.1, R * 0.1, R * 0.07, hsh(s, i, 11) * 3, 0, TAU); c.fill(); } }
      },
    },
    // (lote 7, parte 4b) as armas no suporte (na tenda do chefe da tribo): as lanças encostadas, a trave e o escudo redondo
    armas: {
      n: 'Armas', g: 'movel', size: 1,
      draw(c, R) {
        sombra(c, R, 0.86, 0.62, 0.08, 0.12);
        // as lanças encostadas no suporte (o cabo e a ponta de ferro)
        for (const [x, a] of [[-0.46, -0.16], [-0.1, 0.05], [0.26, 0.2]]) {
          c.save(); c.translate(x * R, R * 0.7); c.rotate(a);
          c.lineCap = 'round'; c.strokeStyle = MAD.esc; c.lineWidth = R * 0.11; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -R * 1.18); c.stroke();
          c.strokeStyle = MAD.cla; c.lineWidth = R * 0.06; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -R * 1.18); c.stroke();
          c.beginPath(); c.moveTo(0, -R * 1.52); c.lineTo(R * 0.1, -R * 1.2); c.lineTo(-R * 0.1, -R * 1.2); c.closePath(); c.fillStyle = grad(c, -R * 0.1, 0, R * 0.1, 0, [FER.luz, FER.med]); c.fill(); linha(c, R * 0.03);
          c.restore();
        }
        // a trave do suporte, com os dois pés
        caixa(c, -R * 0.86, -R * 0.1, R * 1.72, R * 0.2, R * 0.06); c.fillStyle = grad(c, 0, -R * 0.1, 0, R * 0.1, [MAD.luz, MAD.esc]); c.fill(); linha(c, R * 0.035);
        for (const x of [-0.8, 0.8]) { c.fillStyle = MAD.esc; c.beginPath(); c.arc(x * R, 0, R * 0.12, 0, TAU); c.fill(); linha(c, R * 0.03); }
        // o escudo redondo, encostado no pé (a madeira, a faixa pintada e o umbo de ferro)
        c.fillStyle = radial(c, R * 0.5, R * 0.45, R * 0.4, [MAD.luz, MAD.med, MAD.esc]); c.beginPath(); c.arc(R * 0.52, R * 0.5, R * 0.36, 0, TAU); c.fill(); linha(c, R * 0.04);
        c.strokeStyle = '#a8321e'; c.lineWidth = R * 0.07; c.beginPath(); c.arc(R * 0.52, R * 0.5, R * 0.25, 0, TAU); c.stroke();
        c.fillStyle = FER.cla; c.beginPath(); c.arc(R * 0.52, R * 0.5, R * 0.1, 0, TAU); c.fill(); linha(c, R * 0.025);
      },
    },
    /* (lote 30) os da Casa do clã: a lareira e a fornalha (com fogo e luz), o estandarte, o feno, o cocho e a escada.
       Como os outros móveis de encostar, a frente fica para baixo (a parede, em cima). */
    lareira: {
      n: 'Lareira', g: 'luz', size: 2, fogo: true, luz: { bright: 4, dim: 9, c: '#ff9a48' },
      draw(c, R, t, s, ang) {
        sombra(c, R, 0.98, 0.5, 0.04, -0.2);
        // a chaminé de pedra (encostada na parede, em cima) e a boca do fogo, para baixo
        caixa(c, -R * 0.96, -R * 0.96, R * 1.92, R * 0.86, R * 0.06); c.fillStyle = grad(c, 0, -R * 0.96, 0, -R * 0.1, [PED.cla, PED.med]); c.fill(); linha(c, R * 0.05);
        for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) { c.fillStyle = `rgba(30,30,36,${0.12 + hsh(s, i, j) * 0.18})`; c.fillRect(-R * 0.92 + i * R * 0.37 + (j % 2) * R * 0.18, -R * 0.92 + j * R * 0.27, R * 0.33, R * 0.23); }
        caixa(c, -R * 0.62, -R * 0.12, R * 1.24, R * 0.62, R * 0.08); c.fillStyle = PED.esc; c.fill(); linha(c, R * 0.05);
        c.fillStyle = '#160b05'; caixa(c, -R * 0.48, -R * 0.06, R * 0.96, R * 0.46, R * 0.06); c.fill();
        for (let i = 0; i < 10; i++) brasa(c, -R * 0.38 + hsh(s, i, 2) * R * 0.76, R * 0.08 + hsh(s, i, 3) * R * 0.26, R * (0.04 + hsh(s, i, 4) * 0.04), t, i);
        chama(c, -R * 0.15, R * 0.32, R * 0.38, t, s + 1, ang);
        chama(c, R * 0.16, R * 0.3, R * 0.42, t, s + 2, ang);
        // a pedra da frente (o borralho)
        caixa(c, -R * 0.78, R * 0.5, R * 1.56, R * 0.2, R * 0.06); c.fillStyle = PED.med; c.fill(); linha(c, R * 0.04);
      },
    },
    fornalha: {
      n: 'Fornalha', g: 'luz', size: 2, fogo: true, luz: { bright: 4, dim: 8, c: '#ff7a2e' },
      draw(c, R, t, s, ang) {
        sombra(c, R, 0.92, 0.84, 0.06, 0.08);
        // o forno de tijolos, redondo, com a boca para baixo e o fole ao lado
        c.fillStyle = radial(c, -R * 0.2, -R * 0.25, R * 1.0, ['#9a5a3a', '#7a3f26', '#4e2716']); c.beginPath(); c.arc(0, -R * 0.08, R * 0.8, 0, TAU); c.fill(); linha(c, R * 0.06);
        c.strokeStyle = 'rgba(40,16,6,0.45)'; c.lineWidth = R * 0.03; for (const k of [0.32, 0.55]) { c.beginPath(); c.arc(0, -R * 0.08, R * k, 0, TAU); c.stroke(); }
        c.fillStyle = '#140804'; c.beginPath(); c.arc(0, -R * 0.08, R * 0.3, 0, TAU); c.fill();
        for (let i = 0; i < 8; i++) { const a = hsh(s, i, 5) * TAU, d = R * 0.22 * Math.sqrt(hsh(s, i, 6)); brasa(c, Math.cos(a) * d, -R * 0.08 + Math.sin(a) * d, R * 0.05, t, i); }
        chama(c, 0, R * 0.02, R * 0.36, t, s + 3, ang);
        caixa(c, -R * 0.3, R * 0.6, R * 0.6, R * 0.26, R * 0.05); c.fillStyle = '#3a1e10'; c.fill(); linha(c, R * 0.04);
        c.save(); c.translate(R * 0.82, R * 0.55); c.rotate(-0.5);
        caixa(c, -R * 0.14, -R * 0.3, R * 0.28, R * 0.6, R * 0.08); c.fillStyle = MAD.cla; c.fill(); linha(c, R * 0.03);
        c.restore();
      },
    },
    estandarte: {
      n: 'Estandarte', g: 'movel', size: 1, cores: true,
      draw(c, R, t, s, ang, tok) {
        sombra(c, R, 0.62, 0.5, 0.06, 0.12);
        // o pano pendurado (visto de cima, um pouco inclinado), a trave e o pé de pedra
        // (lote 39) com as cores do clã quando ele veio da sede (ou as que o mestre escolheu); senão, uma das quatro
        const cores = tok && Array.isArray(tok.cores) && tok.cores.length === 2 ? tok.cores : [['#8a2a2a', '#d9a441'], ['#24305e', '#c9ccd4'], ['#2f6b45', '#d9a441'], ['#5b3f8a', '#e8eaf0']][s % 4];
        c.beginPath(); c.moveTo(-R * 0.62, -R * 0.62); c.lineTo(R * 0.62, -R * 0.62); c.lineTo(R * 0.62, R * 0.5); c.lineTo(0, R * 0.78); c.lineTo(-R * 0.62, R * 0.5); c.closePath();
        c.fillStyle = cores[0]; c.fill(); linha(c, R * 0.05);
        c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(-R * 0.18, -R * 0.6, R * 0.22, R * 1.2);
        c.strokeStyle = cores[1]; c.lineWidth = R * 0.07; c.beginPath(); c.moveTo(-R * 0.5, -R * 0.46); c.lineTo(R * 0.5, -R * 0.46); c.stroke();
        c.fillStyle = cores[1]; c.beginPath(); c.arc(0, R * 0.06, R * 0.22, 0, TAU); c.fill(); linha(c, R * 0.03, 'rgba(20,12,6,0.6)');
        if (tok && tok.bras && tok.bras.s) { try { const sp = new Path2D(tok.bras.s), k = R * 0.3 / 24; c.save(); c.translate(-12 * k, R * 0.06 - 12 * k); c.scale(k, k); c.strokeStyle = cores[0]; c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(sp); c.restore(); } catch (e) { /* (sem o símbolo) */ } }
        caixa(c, -R * 0.76, -R * 0.74, R * 1.52, R * 0.14, R * 0.05); c.fillStyle = MAD.esc; c.fill(); linha(c, R * 0.03);
      },
    },
    feno: {
      n: 'Feno', g: 'movel', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.86, 0.66, 0.08, 0.1);
        caixa(c, -R * 0.84, -R * 0.62, R * 1.68, R * 1.24, R * 0.18); c.fillStyle = grad(c, 0, -R * 0.62, 0, R * 0.62, ['#e6c46a', '#c9a24a', '#a8822f']); c.fill(); linha(c, R * 0.05);
        c.strokeStyle = 'rgba(120,88,30,0.6)'; c.lineWidth = Math.max(0.6, R * 0.025);
        for (let i = 0; i < 24; i++) { const x = -R * 0.76 + hsh(s, i, 1) * R * 1.52, y = -R * 0.54 + hsh(s, i, 2) * R * 1.08, a = (hsh(s, i, 3) - 0.5) * 0.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * R * 0.28, y + Math.sin(a) * R * 0.28); c.stroke(); }
        // as duas cordas
        c.strokeStyle = '#6b4a22'; c.lineWidth = R * 0.07; for (const x of [-0.36, 0.36]) { c.beginPath(); c.moveTo(x * R, -R * 0.62); c.lineTo(x * R, R * 0.62); c.stroke(); }
      },
    },
    cocho: {
      n: 'Cocho', g: 'movel', size: 2,
      draw(c, R, t, s) {
        sombra(c, R, 0.96, 0.42, 0.04, 0.06);
        // o cocho de madeira, comprido, com água (ou ração) dentro
        caixa(c, -R * 0.94, -R * 0.36, R * 1.88, R * 0.72, R * 0.1); c.fillStyle = MAD.med; c.fill(); linha(c, R * 0.05);
        const agua = s % 2 === 0;
        caixa(c, -R * 0.82, -R * 0.24, R * 1.64, R * 0.48, R * 0.06);
        c.fillStyle = agua ? grad(c, 0, -R * 0.24, 0, R * 0.24, ['#5d93b8', '#3a6a8c']) : grad(c, 0, -R * 0.24, 0, R * 0.24, ['#d8b65a', '#a8862f']); c.fill();
        if (agua) { c.strokeStyle = 'rgba(230,245,255,0.45)'; c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(-R * 0.5, -R * 0.06); c.lineTo(-R * 0.2, -R * 0.06); c.moveTo(R * 0.2, R * 0.08); c.lineTo(R * 0.55, R * 0.08); c.stroke(); }
      },
    },
    escada: {
      n: 'Escada', g: 'movel', size: 1,
      draw(c, R, t, s) {
        // os degraus, do mais claro (em cima) ao mais escuro (embaixo): a escada que desce ou sobe para o outro andar
        c.save(); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-R * 0.9, -R * 0.9, R * 1.8, R * 1.8); c.restore();
        for (let i = 0; i < 5; i++) {
          const y = -R * 0.9 + i * R * 0.36, k = 1 - i * 0.15;
          caixa(c, -R * 0.84, y, R * 1.68, R * 0.32, R * 0.04); c.fillStyle = `rgb(${Math.round(150 * k)},${Math.round(104 * k)},${Math.round(62 * k)})`; c.fill(); linha(c, R * 0.03);
        }
        c.strokeStyle = MAD.esc; c.lineWidth = R * 0.08; c.beginPath(); c.moveTo(-R * 0.9, -R * 0.9); c.lineTo(-R * 0.9, R * 0.9); c.moveTo(R * 0.9, -R * 0.9); c.lineTo(R * 0.9, R * 0.9); c.stroke();
      },
    },
    /* ---------- Natureza ---------- */
    arvore: {
      n: 'Árvore', g: 'natureza', size: 2,
      draw(c, R, t, s) {
        sombra(c, R, 0.92, 0.88, 0.12, 0.14);
        const bal = Math.sin(t * 0.8 + s) * R * 0.015;
        c.save(); c.translate(bal, 0);
        folhas(c, 0, 0, R * 0.9, s, ['#1f4a22', '#2f6b2e', '#4f8f3e'], 9);
        folhas(c, -R * 0.08, -R * 0.1, R * 0.62, s + 7, ['#2b5e2a', '#3f8038', '#6aab4e'], 7);
        folhas(c, -R * 0.14, -R * 0.18, R * 0.34, s + 13, ['#3f8038', '#5c9d48', '#8cc56a'], 5);
        c.restore();
      },
    },
    arbusto: {
      n: 'Arbusto', g: 'natureza', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.8, 0.72, 0.08, 0.12);
        folhas(c, 0, 0, R * 0.78, s, ['#2a5226', '#3b7234', '#5f9a4a'], 8);
        folhas(c, -R * 0.1, -R * 0.12, R * 0.42, s + 3, ['#3b7234', '#58924a', '#7fb862'], 5);
        for (let i = 0; i < 6; i++) { const a = hsh(s, i, 4) * TAU, d = R * (0.2 + hsh(s, i, 5) * 0.4); c.fillStyle = '#b8243a'; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, R * 0.055, 0, TAU); c.fill(); }
      },
    },
    pedra: {
      n: 'Pedra', g: 'natureza', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.8, 0.66, 0.1, 0.14);
        const pts = [];
        for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, r = R * (0.62 + hsh(s, i, 1) * 0.2); pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.82]); }
        c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
        c.fillStyle = radial(c, -R * 0.25, -R * 0.3, R * 1.1, [PED.luz, PED.cla, PED.med, PED.esc]); c.fill();
        linha(c, R * 0.05, 'rgba(20,20,24,0.8)');
        // as faces e uma rachadura
        c.strokeStyle = 'rgba(30,30,36,0.45)'; c.lineWidth = R * 0.03;
        c.beginPath(); c.moveTo(pts[1][0] * 0.5, pts[1][1] * 0.5); c.lineTo(-R * 0.05, R * 0.05); c.lineTo(pts[5][0] * 0.6, pts[5][1] * 0.6); c.stroke();
        c.beginPath(); c.moveTo(-R * 0.05, R * 0.05); c.lineTo(pts[7][0] * 0.55, pts[7][1] * 0.55); c.stroke();
        c.fillStyle = 'rgba(110,150,80,0.55)'; c.beginPath(); c.ellipse(R * 0.25, R * 0.25, R * 0.16, R * 0.09, 0.5, 0, TAU); c.fill();      // musgo
      },
    },
    tronco: {
      n: 'Tronco caído', g: 'natureza', size: 2,
      draw(c, R, t, s) {
        sombra(c, R, 0.95, 0.34, 0.04, 0.12);
        const w = R * 1.8, h = R * 0.5, x = -w / 2, y = -h / 2;
        caixa(c, x, y, w, h, h * 0.5); c.fillStyle = grad(c, 0, y, 0, y + h, ['#7a5230', '#5a3a1e', '#3d2712']); c.fill();
        c.save(); caixa(c, x, y, w, h, h * 0.5); c.clip();
        c.strokeStyle = 'rgba(25,14,5,0.55)'; c.lineWidth = R * 0.03;
        for (let i = 0; i < 9; i++) { const xx = x + w * (0.08 + i * 0.1); c.beginPath(); c.moveTo(xx, y); c.bezierCurveTo(xx + R * 0.06, y + h * 0.3, xx - R * 0.06, y + h * 0.7, xx + R * 0.02, y + h); c.stroke(); }
        c.restore();
        caixa(c, x, y, w, h, h * 0.5); linha(c, R * 0.04);
        // a ponta cortada, com os anéis
        c.fillStyle = '#d9b07a'; c.beginPath(); c.ellipse(x + w - h * 0.3, 0, h * 0.28, h * 0.48, 0, 0, TAU); c.fill(); linha(c, R * 0.03);
        c.strokeStyle = 'rgba(120,80,40,0.7)'; c.lineWidth = R * 0.02;
        for (const k of [0.33, 0.66]) { c.beginPath(); c.ellipse(x + w - h * 0.3, 0, h * 0.28 * k, h * 0.48 * k, 0, 0, TAU); c.stroke(); }
        c.fillStyle = 'rgba(110,160,80,0.6)'; c.beginPath(); c.ellipse(x + w * 0.3, y + h * 0.3, R * 0.22, R * 0.08, 0, 0, TAU); c.fill();
      },
    },
    toco: {
      n: 'Toco', g: 'natureza', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.7, 0.66);
        // raízes: cada uma de um tamanho, afinando para a ponta
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * TAU + (hsh(s, i, 1) - 0.5) * 0.9, L = R * (0.78 + hsh(s, i, 2) * 0.2), w = R * (0.1 + hsh(s, i, 3) * 0.05), cv = (hsh(s, i, 4) - 0.5) * R * 0.3;
          c.save(); c.rotate(a);
          const tip = w * 0.38;
          c.beginPath(); c.moveTo(R * 0.3, -w); c.quadraticCurveTo(R * 0.6, -w * 0.7 + cv, L, cv * 0.6 - tip); c.arc(L, cv * 0.6, tip, -Math.PI / 2, Math.PI / 2); c.quadraticCurveTo(R * 0.6, w * 0.7 + cv, R * 0.3, w); c.closePath();
          c.fillStyle = grad(c, 0, -w, 0, w, ['#6b4a28', '#4a2f17']); c.fill(); linha(c, R * 0.03);
          c.restore();
        }
        c.fillStyle = '#4a2f17'; c.beginPath(); c.arc(0, 0, R * 0.56, 0, TAU); c.fill(); linha(c, R * 0.05);
        c.fillStyle = radial(c, 0, 0, R * 0.47, ['#e2bd86', '#c99a5e']); c.beginPath(); c.arc(0, 0, R * 0.47, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(120,80,40,0.65)'; c.lineWidth = R * 0.022;
        for (const k of [0.2, 0.42, 0.66, 0.86]) { c.beginPath(); c.arc(R * 0.03, -R * 0.02, R * 0.47 * k, 0, TAU); c.stroke(); }
        c.strokeStyle = 'rgba(60,35,12,0.6)'; c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(R * 0.05, 0); c.lineTo(R * 0.4, R * 0.18); c.stroke();
      },
    },
    cogumelos: {
      n: 'Cogumelos', g: 'natureza', size: 1,
      draw(c, R, t, s) {
        const cogu = [[-0.3, 0.2, 0.3, '#c0392b'], [0.25, -0.15, 0.36, '#c0392b'], [0.32, 0.38, 0.2, '#a0682a'], [-0.28, -0.32, 0.18, '#a0682a']];
        sombra(c, R, 0.72, 0.62, 0.08, 0.12);
        for (const [x, y, r, cor] of cogu) {
          c.fillStyle = radial(c, (x - r * 0.3) * R, (y - r * 0.35) * R, r * R * 1.3, [cor === '#c0392b' ? '#ef6b5a' : '#c99a5e', cor, cor === '#c0392b' ? '#7d1d14' : '#6b4320']);
          c.beginPath(); c.arc(x * R, y * R, r * R, 0, TAU); c.fill(); linha(c, R * 0.03);
          if (cor === '#c0392b') for (let i = 0; i < 5; i++) { const a = hsh(s, i + x * 10, 1) * TAU, d = r * R * (0.3 + hsh(s, i + y * 10, 2) * 0.5); c.fillStyle = '#fff4e6'; c.beginPath(); c.arc(x * R + Math.cos(a) * d, y * R + Math.sin(a) * d, r * R * 0.13, 0, TAU); c.fill(); }
        }
      },
    },

    flores: {
      n: 'Flores', g: 'natureza', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.78, 0.7, 0.05, 0.08);
        folhas(c, 0, 0, R * 0.8, s, ['#2c4a25', '#3c6331', '#4f7c3c'], 8);
        const cores = [['#f2c94c', '#f6e7a1'], ['#e85d75', '#f7b2bf'], ['#9b7bd8', '#d1c2f2'], ['#f2f2f2', '#ffffff'], ['#ef8a3c', '#f9c79a']];
        for (let i = 0; i < 9; i++) {
          const a = hsh(s, i, 7) * TAU, d = R * (0.1 + hsh(s, i, 8) * 0.55), [c1, c2] = cores[(s + i) % cores.length];
          const x = Math.cos(a) * d, y = Math.sin(a) * d, r = R * (0.08 + hsh(s, i, 9) * 0.05);
          c.fillStyle = c1; for (let k = 0; k < 5; k++) { const b = k / 5 * TAU; c.beginPath(); c.arc(x + Math.cos(b) * r, y + Math.sin(b) * r, r * 0.7, 0, TAU); c.fill(); }
          c.fillStyle = c2; c.beginPath(); c.arc(x, y, r * 0.5, 0, TAU); c.fill();
        }
      },
    },
    /* ---------- Perigos e marcos ---------- */
    armadilha: {
      n: 'Armadilha de urso', g: 'perigo', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.72, 0.62);
        c.strokeStyle = FER.med; c.lineWidth = R * 0.05; c.beginPath(); c.moveTo(R * 0.55, R * 0.1); c.bezierCurveTo(R * 0.85, R * 0.3, R * 0.7, R * 0.7, R * 0.9, R * 0.9); c.stroke();     // a corrente
        for (const sgn of [-1, 1]) {
          c.save(); c.scale(1, sgn);
          c.beginPath(); c.arc(0, 0, R * 0.6, Math.PI * 1.08, Math.PI * 1.92); c.arc(0, 0, R * 0.42, Math.PI * 1.92, Math.PI * 1.08, true); c.closePath();
          c.fillStyle = grad(c, 0, -R * 0.6, 0, 0, [FER.luz, FER.med]); c.fill(); linha(c, R * 0.035);
          // os dentes
          c.fillStyle = '#cfd6de';
          for (let i = 0; i < 7; i++) { const a = Math.PI * (1.15 + i * 0.1); c.beginPath(); c.moveTo(Math.cos(a - 0.04) * R * 0.42, Math.sin(a - 0.04) * R * 0.42); c.lineTo(Math.cos(a) * R * 0.27, Math.sin(a) * R * 0.27); c.lineTo(Math.cos(a + 0.04) * R * 0.42, Math.sin(a + 0.04) * R * 0.42); c.closePath(); c.fill(); }
          c.restore();
        }
        c.fillStyle = grad(c, 0, -R * 0.18, 0, R * 0.18, [FER.cla, FER.esc]); c.beginPath(); c.arc(0, 0, R * 0.17, 0, TAU); c.fill(); linha(c, R * 0.03);
        for (const sgn of [-1, 1]) { c.fillStyle = FER.esc; c.beginPath(); c.arc(sgn * R * 0.62, 0, R * 0.08, 0, TAU); c.fill(); linha(c, R * 0.025); }
      },
    },
    estacas: {
      n: 'Estacas', g: 'perigo', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.8, 0.72);
        c.fillStyle = 'rgba(60,40,20,0.55)'; c.beginPath(); c.ellipse(0, 0, R * 0.8, R * 0.72, 0, 0, TAU); c.fill();
        const pts = [];
        for (let i = 0; i < 9; i++) pts.push([(hsh(s, i, 1) - 0.5) * R * 1.25, (hsh(s, i, 2) - 0.5) * R * 1.1]);
        pts.sort((a, b) => a[1] - b[1]);
        for (const [x, y] of pts) {
          const r = R * 0.16;
          c.beginPath(); c.moveTo(x - r, y + r * 0.7); c.lineTo(x, y - r * 1.4); c.lineTo(x + r, y + r * 0.7); c.closePath();
          c.fillStyle = grad(c, x - r, 0, x + r, 0, [MAD.luz, MAD.cla, MAD.esc]); c.fill(); linha(c, R * 0.025);
          c.fillStyle = '#e8dcc0'; c.beginPath(); c.moveTo(x - r * 0.3, y - r * 0.5); c.lineTo(x, y - r * 1.4); c.lineTo(x + r * 0.3, y - r * 0.5); c.closePath(); c.fill();
        }
      },
    },
    buraco: {
      n: 'Buraco', g: 'perigo', size: 2,
      draw(c, R, t, s) {
        const pts = [];
        for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = R * (0.7 + hsh(s, i, 1) * 0.18); pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.86]); }
        const contorno = k => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x * k, y * k) : c.moveTo(x * k, y * k))); c.closePath(); };
        contorno(1.08); c.fillStyle = 'rgba(70,50,30,0.6)'; c.fill();
        contorno(1); c.fillStyle = radial(c, R * 0.05, R * 0.08, R * 0.9, ['#000000', '#07060a', '#1c150f', '#3a2c1e']); c.fill();
        linha(c, R * 0.04, 'rgba(30,20,10,0.9)');
        for (let i = 0; i < 7; i++) { const [x, y] = pts[Math.floor(hsh(s, i, 5) * pts.length)]; pedrinha(c, x * 1.05, y * 1.05, R * (0.06 + hsh(s, i, 6) * 0.05), s + i, PED); }
      },
    },
    estatua: {
      n: 'Estátua', g: 'perigo', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.8, 0.8, 0.12, 0.14);
        caixa(c, -R * 0.78, -R * 0.78, R * 1.56, R * 1.56, R * 0.06); c.fillStyle = grad(c, -R, -R, R, R, [PED.luz, PED.cla, PED.med]); c.fill(); linha(c, R * 0.05);
        caixa(c, -R * 0.62, -R * 0.62, R * 1.24, R * 1.24, R * 0.05); c.strokeStyle = 'rgba(40,40,46,0.4)'; c.lineWidth = R * 0.03; c.stroke();
        // a figura em pé sobre o pedestal, de frente (como se vê uma estátua): a cabeça, o manto e a espada erguida
        const pedra = (x, y) => radial(c, x - R * 0.15, y - R * 0.2, R * 0.9, [PED.luz, PED.cla, PED.med]);
        c.fillStyle = 'rgba(30,30,36,0.25)'; c.beginPath(); c.ellipse(R * 0.04, R * 0.5, R * 0.36, R * 0.1, 0, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(-R * 0.14, -R * 0.26); c.lineTo(R * 0.14, -R * 0.26); c.quadraticCurveTo(R * 0.3, R * 0.1, R * 0.34, R * 0.52); c.lineTo(-R * 0.34, R * 0.52); c.quadraticCurveTo(-R * 0.3, R * 0.1, -R * 0.14, -R * 0.26); c.closePath();
        c.fillStyle = pedra(0, 0); c.fill(); linha(c, R * 0.035);
        c.strokeStyle = 'rgba(40,40,46,0.45)'; c.lineWidth = R * 0.02;
        for (const x of [-0.12, 0, 0.12]) { c.beginPath(); c.moveTo(x * R * 0.7, -R * 0.1); c.lineTo(x * R * 1.9, R * 0.5); c.stroke(); }       // as dobras do manto
        // o braço e a espada
        c.save(); c.translate(R * 0.3, -R * 0.04); c.rotate(0.32);
        caixa(c, -R * 0.035, -R * 0.62, R * 0.07, R * 0.5, R * 0.03); c.fillStyle = PED.luz; c.fill(); linha(c, R * 0.025);
        caixa(c, -R * 0.12, -R * 0.14, R * 0.24, R * 0.05, R * 0.02); c.fillStyle = PED.cla; c.fill(); linha(c, R * 0.02);
        c.restore();
        c.strokeStyle = PED.med; c.lineWidth = R * 0.07; c.lineCap = 'round'; c.beginPath(); c.moveTo(R * 0.12, -R * 0.2); c.lineTo(R * 0.27, -R * 0.08); c.stroke();
        c.fillStyle = pedra(0, -R * 0.4); c.beginPath(); c.arc(0, -R * 0.38, R * 0.14, 0, TAU); c.fill(); linha(c, R * 0.03);
      },
    },
    // (lote 7) a coluna de pedra, vista de cima: a base quadrada, o fuste redondo com as caneluras
    coluna: {
      n: 'Coluna', g: 'perigo', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.86, 0.86, 0.14, 0.16);
        caixa(c, -R * 0.8, -R * 0.8, R * 1.6, R * 1.6, R * 0.08); c.fillStyle = grad(c, -R, -R, R, R, [PED.cla, PED.med, PED.esc]); c.fill(); linha(c, R * 0.05);
        caixa(c, -R * 0.66, -R * 0.66, R * 1.32, R * 1.32, R * 0.06); c.fillStyle = grad(c, -R, -R, R, R, [PED.luz, PED.cla, PED.med]); c.fill(); linha(c, R * 0.03, 'rgba(40,40,46,0.5)');
        c.fillStyle = radial(c, -R * 0.18, -R * 0.2, R * 0.75, [PED.luz, PED.cla, PED.med]); c.beginPath(); c.arc(0, 0, R * 0.52, 0, TAU); c.fill(); linha(c, R * 0.04);
        c.strokeStyle = 'rgba(40,40,46,0.35)'; c.lineWidth = R * 0.025;
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); c.lineTo(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5); c.stroke(); }
        c.beginPath(); c.arc(0, 0, R * 0.28, 0, TAU); c.stroke();
      },
    },
    placa: {
      n: 'Placa', g: 'perigo', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.62, 0.3, 0.06, 0.16);
        caixa(c, -R * 0.6, -R * 0.32, R * 1.2, R * 0.48, R * 0.06); c.fillStyle = grad(c, 0, -R * 0.32, 0, R * 0.16, [MAD.luz, MAD.cla]); c.fill(); linha(c, R * 0.05);
        c.strokeStyle = 'rgba(60,35,12,0.7)'; c.lineWidth = R * 0.04;
        for (const [y, w] of [[-0.18, 0.8], [-0.05, 0.6], [0.06, 0.7]]) { c.beginPath(); c.moveTo(-R * w / 2, y * R); c.lineTo(R * w / 2, y * R); c.stroke(); }
        c.fillStyle = MAD.esc; c.beginPath(); c.arc(0, R * 0.38, R * 0.1, 0, TAU); c.fill(); linha(c, R * 0.03);
        for (const x of [-0.5, 0.5]) { c.fillStyle = FER.cla; c.beginPath(); c.arc(x * R, -R * 0.08, R * 0.03, 0, TAU); c.fill(); }
      },
    },
    tumulo: {
      n: 'Túmulo', g: 'perigo', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.6, 0.82, 0.08, 0.1);
        caixa(c, -R * 0.42, -R * 0.15, R * 0.84, R * 0.98, R * 0.3); c.fillStyle = 'rgba(80,58,36,0.85)'; c.fill();       // a terra
        c.fillStyle = 'rgba(110,150,70,0.5)'; c.beginPath(); c.ellipse(-R * 0.2, R * 0.55, R * 0.14, R * 0.06, 0, 0, TAU); c.fill();
        // a lápide
        c.beginPath(); c.moveTo(-R * 0.5, -R * 0.2); c.lineTo(-R * 0.5, -R * 0.62); c.quadraticCurveTo(-R * 0.5, -R * 0.95, 0, -R * 0.95); c.quadraticCurveTo(R * 0.5, -R * 0.95, R * 0.5, -R * 0.62); c.lineTo(R * 0.5, -R * 0.2); c.closePath();
        c.fillStyle = grad(c, -R * 0.5, 0, R * 0.5, 0, [PED.luz, PED.cla, PED.med]); c.fill(); linha(c, R * 0.05);
        c.strokeStyle = 'rgba(40,40,46,0.6)'; c.lineWidth = R * 0.05;
        c.beginPath(); c.moveTo(0, -R * 0.82); c.lineTo(0, -R * 0.36); c.moveTo(-R * 0.18, -R * 0.66); c.lineTo(R * 0.18, -R * 0.66); c.stroke();
      },
    },
    poco: {
      n: 'Poço', g: 'perigo', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.86, 0.82);
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; pedrinha(c, Math.cos(a) * R * 0.66, Math.sin(a) * R * 0.66, R * 0.2, s + i); }
        const ond = 0.5 + 0.5 * Math.sin(t * 1.2 + s);
        c.fillStyle = radial(c, 0, 0, R * 0.5, ['#0b1a24', '#123247', '#081018']); c.beginPath(); c.arc(0, 0, R * 0.5, 0, TAU); c.fill();
        c.strokeStyle = `rgba(160,210,240,${0.12 + 0.1 * ond})`; c.lineWidth = R * 0.03; c.beginPath(); c.arc(0, 0, R * (0.18 + 0.1 * ond), 0, TAU); c.stroke();
        // a trave e o balde
        caixa(c, -R * 0.95, -R * 0.07, R * 1.9, R * 0.14, R * 0.05); c.fillStyle = grad(c, 0, -R * 0.07, 0, R * 0.07, [MAD.cla, MAD.esc]); c.fill(); linha(c, R * 0.03);
        c.strokeStyle = '#c9a66b'; c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(R * 0.1, 0); c.lineTo(R * 0.1, R * 0.16); c.stroke();
        c.fillStyle = MAD.med; caixa(c, -R * 0.02, R * 0.14, R * 0.24, R * 0.2, R * 0.04); c.fill(); linha(c, R * 0.025);
      },
    },
    altar: {
      n: 'Altar', g: 'perigo', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.86, 0.6, 0.08, 0.12);
        caixa(c, -R * 0.85, -R * 0.52, R * 1.7, R * 1.04, R * 0.06); c.fillStyle = grad(c, 0, -R * 0.52, 0, R * 0.52, [PED.luz, PED.cla, PED.med]); c.fill(); linha(c, R * 0.05);
        // a toalha com a runa
        caixa(c, -R * 0.4, -R * 0.52, R * 0.8, R * 1.04, R * 0.02); c.fillStyle = '#5a2a6a'; c.fill();
        c.strokeStyle = '#e6c26a'; c.lineWidth = R * 0.035;
        c.beginPath(); c.arc(0, 0, R * 0.2, 0, TAU); c.moveTo(0, -R * 0.3); c.lineTo(0, R * 0.3); c.moveTo(-R * 0.17, -R * 0.1); c.lineTo(R * 0.17, R * 0.1); c.stroke();
        for (const x of [-0.65, 0.65]) { c.fillStyle = '#f1e2c2'; c.beginPath(); c.arc(x * R, -R * 0.25, R * 0.09, 0, TAU); c.fill(); linha(c, R * 0.02, 'rgba(90,70,40,0.8)'); }
      },
    },
    runa: {
      n: 'Pedra rúnica', g: 'perigo', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.6, 0.74, 0.08, 0.1);
        c.beginPath(); c.moveTo(-R * 0.4, R * 0.7); c.lineTo(-R * 0.5, -R * 0.3); c.quadraticCurveTo(-R * 0.35, -R * 0.82, 0, -R * 0.82); c.quadraticCurveTo(R * 0.4, -R * 0.8, R * 0.48, -R * 0.25); c.lineTo(R * 0.42, R * 0.7); c.closePath();
        c.fillStyle = grad(c, -R * 0.5, 0, R * 0.5, 0, [PED.luz, PED.cla, PED.med, PED.esc]); c.fill(); linha(c, R * 0.05);
        const br = 0.55 + 0.25 * Math.sin(t * 1.5 + s);
        c.strokeStyle = `rgba(120,200,255,${br})`; c.lineWidth = R * 0.05; c.lineCap = 'round';
        c.beginPath();
        c.moveTo(-R * 0.12, -R * 0.55); c.lineTo(-R * 0.12, R * 0.05); c.moveTo(-R * 0.12, -R * 0.4); c.lineTo(R * 0.12, -R * 0.55); c.moveTo(-R * 0.12, -R * 0.25); c.lineTo(R * 0.12, -R * 0.4);
        c.moveTo(-R * 0.18, R * 0.2); c.lineTo(R * 0.18, R * 0.5); c.moveTo(R * 0.18, R * 0.2); c.lineTo(-R * 0.18, R * 0.5);
        c.stroke();
      },
    },
    // (lote 7, parte 4b) o totem da tribo, visto de cima: o poste entalhado com os anéis pintados e a ave de asas abertas
    totem: {
      n: 'Totem', g: 'perigo', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.86, 0.5, 0.1, 0.14);
        const V = '#a8321e', P2 = '#1e1a16', T = '#2f9a8c', C = '#e6d4a8';
        // as asas (de um lado ao outro), com as penas em degraus
        c.beginPath(); c.moveTo(-R * 0.92, -R * 0.08);
        for (let i = 0; i <= 6; i++) { const x = -R * 0.92 + i * R * 0.3; c.lineTo(x, -R * 0.24 - (i % 2) * R * 0.08); }
        c.lineTo(R * 0.92, -R * 0.08); c.lineTo(R * 0.7, R * 0.18); c.lineTo(-R * 0.7, R * 0.18); c.closePath();
        c.fillStyle = grad(c, 0, -R * 0.3, 0, R * 0.2, [V, '#7a2214']); c.fill(); linha(c, R * 0.045);
        c.strokeStyle = P2; c.lineWidth = R * 0.04;
        for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * R * 0.3, -R * 0.12); c.lineTo(sx * R * 0.8, -R * 0.05); c.stroke(); c.fillStyle = T; c.beginPath(); c.arc(sx * R * 0.58, R * 0.04, R * 0.07, 0, TAU); c.fill(); }
        // o poste, com os anéis
        c.fillStyle = radial(c, -R * 0.08, -R * 0.1, R * 0.5, [C, '#b89a62', '#6b4a2b']); c.beginPath(); c.arc(0, 0, R * 0.36, 0, TAU); c.fill(); linha(c, R * 0.045);
        for (const [rr, cor] of [[0.28, P2], [0.2, V], [0.12, T]]) { c.strokeStyle = cor; c.lineWidth = R * 0.05; c.beginPath(); c.arc(0, 0, R * rr, 0, TAU); c.stroke(); }
        // o bico da ave, virado para a frente
        c.beginPath(); c.moveTo(-R * 0.12, R * 0.26); c.quadraticCurveTo(0, R * 0.7, R * 0.12, R * 0.26); c.closePath(); c.fillStyle = '#e8b04a'; c.fill(); linha(c, R * 0.035);
      },
    },
    /* ================= (lote 39) os objetos novos ================= */
    /* ---------- Masmorra e chefe ---------- */
    jaula: {
      n: 'Jaula', g: 'masmorra', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.86, 0.86, 0.08, 0.1);
        const w = R * 1.62, x = -w / 2;
        // a palha do chão, lá dentro, e (às vezes) o que sobrou de quem ficou preso
        caixa(c, x, x, w, w, R * 0.06); c.fillStyle = '#4e4030'; c.fill();
        c.save(); caixa(c, x, x, w, w, R * 0.06); c.clip();
        c.lineWidth = R * 0.035; c.lineCap = 'round';
        for (let i = 0; i < 18; i++) { const px = x + hsh(s, i, 1) * w, py = x + hsh(s, i, 2) * w, a = hsh(s, i, 3) * Math.PI; c.strokeStyle = i % 2 ? '#a88a4a' : '#7a6234'; c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * R * 0.3, py + Math.sin(a) * R * 0.3); c.stroke(); }
        if (s % 3 === 0) cranio(c, R * 0.18, R * 0.22, R * 0.2);
        c.restore();
        // as grades vistas de cima: as barras de pé (os pontos) e as de cima, cruzadas
        c.lineCap = 'butt';
        for (let i = 1; i < 6; i++) {
          const u = x + i * w / 6;
          c.strokeStyle = FER.esc; c.lineWidth = R * 0.08; c.beginPath(); c.moveTo(u, x); c.lineTo(u, -x); c.stroke();
          c.strokeStyle = FER.luz; c.lineWidth = R * 0.025; c.beginPath(); c.moveTo(u - R * 0.02, x); c.lineTo(u - R * 0.02, -x); c.stroke();
        }
        for (const v of [-0.28, 0.28]) { c.strokeStyle = FER.med; c.lineWidth = R * 0.09; c.beginPath(); c.moveTo(x, v * w); c.lineTo(-x, v * w); c.stroke(); }
        caixa(c, x, x, w, w, R * 0.06); c.lineWidth = R * 0.13; c.strokeStyle = FER.med; c.stroke(); linha(c, R * 0.035);
        for (const [a, b] of [[x, x], [-x, x], [x, -x], [-x, -x]]) { c.fillStyle = FER.luz; c.beginPath(); c.arc(a, b, R * 0.07, 0, TAU); c.fill(); }
        // o cadeado, na portinhola de baixo
        caixa(c, -R * 0.12, -x - R * 0.12, R * 0.24, R * 0.22, R * 0.04); c.fillStyle = '#c9a24a'; c.fill(); linha(c, R * 0.03);
      },
    },
    grilhoes: {
      n: 'Grilhões na parede', g: 'masmorra', size: 1,
      draw(c, R, t, s) {
        // a placa presa na parede (em cima) e as duas correntes que descem, com as argolas
        sombra(c, R, 0.5, 0.42, 0.05, -0.15);
        caixa(c, -R * 0.55, -R * 0.98, R * 1.1, R * 0.2, R * 0.05); c.fillStyle = grad(c, 0, -R, 0, -R * 0.78, [FER.cla, FER.esc]); c.fill(); linha(c, R * 0.04);
        for (const x of [-0.4, 0, 0.4]) { c.fillStyle = FER.luz; c.beginPath(); c.arc(x * R, -R * 0.88, R * 0.035, 0, TAU); c.fill(); }
        for (const sx of [-1, 1]) {
          const x0 = sx * R * 0.3, y0 = -R * 0.78, x1 = sx * R * (0.36 + hsh(s, sx + 2, 1) * 0.08), y1 = R * (0.22 + hsh(s, sx + 2, 2) * 0.12), n = 7;
          for (let k = 0; k < n; k++) {
            const f = (k + 0.5) / n, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
            c.strokeStyle = FER.esc; c.lineWidth = R * 0.07; c.beginPath(); c.ellipse(x, y, k % 2 ? R * 0.05 : R * 0.09, k % 2 ? R * 0.09 : R * 0.05, 0, 0, TAU); c.stroke();
            c.strokeStyle = FER.cla; c.lineWidth = R * 0.03; c.stroke();
          }
          c.strokeStyle = FER.esc; c.lineWidth = R * 0.12; c.beginPath(); c.arc(x1, y1 + R * 0.2, R * 0.17, 0, TAU); c.stroke();
          c.strokeStyle = FER.luz; c.lineWidth = R * 0.04; c.beginPath(); c.arc(x1, y1 + R * 0.2, R * 0.17, Math.PI * 1.1, Math.PI * 1.7); c.stroke();
        }
      },
    },
    mesaTortura: {
      n: 'Mesa de tortura', g: 'masmorra', size: 2,
      draw(c, R, t, s) {
        sombra(c, R, 0.62, 0.95, 0.06, 0.06);
        const w = R * 0.95, h = R * 1.7, x = -w / 2, y = -h / 2;
        caixa(c, x, y, w, h, R * 0.06); c.fillStyle = MAD.med; c.fill();
        for (let i = 0; i < 3; i++) tabua(c, x + R * 0.03 + i * (w - R * 0.06) / 3, y + R * 0.03, (w - R * 0.06) / 3 - R * 0.015, h - R * 0.06, s + i);
        caixa(c, x, y, w, h, R * 0.06); linha(c, R * 0.04);
        // as manchas de sangue velho
        for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(80,8,14,0.6)'; c.beginPath(); c.ellipse(x + w * (0.2 + hsh(s, i, 1) * 0.6), y + h * (0.25 + hsh(s, i, 2) * 0.5), R * (0.08 + hsh(s, i, 3) * 0.1), R * 0.06, hsh(s, i, 4) * 3, 0, TAU); c.fill(); }
        // os dois rolos (em cima e embaixo), com as manivelas, e as cordas até as correias
        for (const [yy, dir] of [[y - R * 0.04, -1], [y + h + R * 0.04, 1]]) {
          caixa(c, x - R * 0.14, yy - R * 0.1, w + R * 0.28, R * 0.2, R * 0.09); c.fillStyle = grad(c, 0, yy - R * 0.1, 0, yy + R * 0.1, [MAD.cla, MAD.esc]); c.fill(); linha(c, R * 0.03);
          c.strokeStyle = FER.med; c.lineWidth = R * 0.06; c.lineCap = 'round';
          c.beginPath(); c.moveTo(x + w + R * 0.14, yy); c.lineTo(x + w + R * 0.3, yy); c.lineTo(x + w + R * 0.3, yy - dir * R * 0.18); c.stroke();
          c.strokeStyle = '#b89a62'; c.lineWidth = R * 0.03;
          for (const sx of [-0.25, 0.25]) { c.beginPath(); c.moveTo(sx * w, yy); c.lineTo(sx * w * 0.9, yy - dir * R * 0.32); c.stroke(); }
        }
        for (const yy of [y + R * 0.32, y + h - R * 0.32]) {
          c.fillStyle = '#4a2c18'; c.fillRect(x + R * 0.08, yy - R * 0.06, w - R * 0.16, R * 0.12);
          for (const sx of [-0.25, 0.25]) { c.fillStyle = FER.luz; c.fillRect(sx * w - R * 0.05, yy - R * 0.07, R * 0.1, R * 0.14); }
        }
      },
    },
    alavanca: {
      n: 'Alavanca', g: 'masmorra', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.55, 0.62);
        caixa(c, -R * 0.42, -R * 0.58, R * 0.84, R * 1.16, R * 0.08); c.fillStyle = grad(c, 0, -R * 0.58, 0, R * 0.58, [PED.cla, PED.med, PED.esc]); c.fill(); linha(c, R * 0.05);
        for (const [a, b] of [[-0.3, -0.46], [0.3, -0.46], [-0.3, 0.46], [0.3, 0.46]]) { c.fillStyle = FER.luz; c.beginPath(); c.arc(a * R, b * R, R * 0.045, 0, TAU); c.fill(); }
        caixa(c, -R * 0.08, -R * 0.38, R * 0.16, R * 0.76, R * 0.06); c.fillStyle = '#121214'; c.fill();
        // a alavanca: puxada para cima ou para baixo (cada uma de um jeito)
        const cima = s % 2 === 0, ey = cima ? -R * 0.78 : R * 0.78;
        c.strokeStyle = FER.esc; c.lineWidth = R * 0.15; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, cima ? -R * 0.12 : R * 0.12); c.lineTo(R * 0.1, ey); c.stroke();
        c.strokeStyle = FER.cla; c.lineWidth = R * 0.07; c.stroke();
        c.fillStyle = radial(c, R * 0.06, ey - R * 0.05, R * 0.2, ['#f08070', '#b0302a', '#5a1008']); c.beginPath(); c.arc(R * 0.1, ey, R * 0.16, 0, TAU); c.fill(); linha(c, R * 0.035);
      },
    },
    tronoOssos: {
      n: 'Trono de ossos', g: 'masmorra', size: 2,
      draw(c, R, t, s) {
        sombra(c, R, 0.82, 0.82, 0.06, 0.1);
        // o encosto: os ossos de pé, em leque, e o crânio grande no alto
        for (let i = -4; i <= 4; i++) { const a = -Math.PI / 2 + i * 0.16; osso(c, i * R * 0.1, -R * 0.38, Math.cos(a) * R * 0.85 + i * R * 0.04, -R * 0.38 + Math.sin(a) * R * 0.55, R * 0.07); }
        // o assento (o veludo vermelho gasto) e os braços de osso
        caixa(c, -R * 0.55, -R * 0.4, R * 1.1, R * 0.92, R * 0.12); c.fillStyle = grad(c, 0, -R * 0.4, 0, R * 0.52, ['#6a1e24', '#3a0c10']); c.fill(); linha(c, R * 0.05);
        c.strokeStyle = 'rgba(255,200,200,0.12)'; c.lineWidth = R * 0.03; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-R * 0.48, -R * 0.4 + i * R * 0.23); c.lineTo(R * 0.48, -R * 0.4 + i * R * 0.23); c.stroke(); }
        for (const sx of [-1, 1]) { osso(c, sx * R * 0.7, -R * 0.5, sx * R * 0.7, R * 0.55, R * 0.1); cranio(c, sx * R * 0.7, R * 0.66, R * 0.15); }
        cranio(c, 0, -R * 0.74, R * 0.24);
      },
    },
    cranios: {
      n: 'Pilha de crânios', g: 'masmorra', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.82, 0.72);
        c.fillStyle = 'rgba(40,30,20,0.45)'; c.beginPath(); c.ellipse(0, R * 0.05, R * 0.8, R * 0.62, 0, 0, TAU); c.fill();
        for (let i = 0; i < 5; i++) { const a = hsh(s, i, 5) * TAU, d = R * (0.45 + hsh(s, i, 6) * 0.3); osso(c, Math.cos(a) * d - Math.cos(a + 1) * R * 0.25, Math.sin(a) * d - Math.sin(a + 1) * R * 0.25, Math.cos(a) * d + Math.cos(a + 1) * R * 0.25, Math.sin(a) * d + Math.sin(a + 1) * R * 0.25, R * 0.06); }
        const pos = [[-0.38, 0.28, 0.21], [0.02, 0.36, 0.21], [0.4, 0.26, 0.2], [-0.2, 0.0, 0.21], [0.22, 0.02, 0.21], [0.0, -0.3, 0.22]];
        pos.forEach(([x, y, r], i) => cranio(c, (x + (hsh(s, i, 7) - 0.5) * 0.06) * R, (y + (hsh(s, i, 8) - 0.5) * 0.05) * R, r * R));
      },
    },
    cristal: {
      n: 'Cristal que brilha', g: 'masmorra', size: 1, calma: true, luz: { bright: 2, dim: 5, c: '#9fd8ff' },
      draw(c, R, t, s) {
        const cor = [['#c6e9ff', '#5fa8e0', '#2a5a8f'], ['#e6ccff', '#9a6ae0', '#4a2a8f'], ['#c8ffe0', '#4fc48a', '#1f6a4a']][s % 3];
        c.save(); c.globalCompositeOperation = 'lighter';
        c.fillStyle = radial(c, 0, 0, R * 0.98, [cor[1] + '66', cor[1] + '22', cor[1] + '00']); c.beginPath(); c.arc(0, 0, R * 0.98, 0, TAU); c.fill();
        c.restore();
        pedrinha(c, 0, R * 0.28, R * 0.42, s);
        const lascas = [[-0.55, 0.62], [-0.2, 0.86], [0.18, 0.78], [0.5, 0.58], [0, 0.5]];
        lascas.forEach(([da, L], i) => {
          const a = -Math.PI / 2 + da + (hsh(s, i, 1) - 0.5) * 0.2, bx = (hsh(s, i, 2) - 0.5) * R * 0.3, by = R * 0.3, tx = bx + Math.cos(a) * L * R, ty = by + Math.sin(a) * L * R, px = -Math.sin(a) * R * 0.12, py = Math.cos(a) * R * 0.12;
          c.beginPath(); c.moveTo(bx + px, by + py); c.lineTo(tx + px * 0.5, ty + py * 0.5); c.lineTo(tx, ty); c.lineTo(tx - px * 0.5, ty - py * 0.5); c.lineTo(bx - px, by - py); c.closePath();
          c.fillStyle = grad(c, bx, by, tx, ty, [cor[2], cor[1], cor[0]]); c.fill(); linha(c, R * 0.025, 'rgba(255,255,255,0.55)');
          c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = R * 0.02; c.beginPath(); c.moveTo(bx + px * 0.3, by + py * 0.3); c.lineTo(tx, ty); c.stroke();
        });
      },
    },
    caldeirao: {
      n: 'Caldeirão', g: 'masmorra', size: 1, fogo: true, luz: { bright: 2, dim: 5, c: '#8fe07a' },
      draw(c, R, t, s, ang) {
        sombra(c, R, 0.8, 0.76);
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 0.2; brasa(c, Math.cos(a) * R * 0.74, Math.sin(a) * R * 0.74, R * 0.07, t, i); }
        chama(c, -R * 0.62, R * 0.4, R * 0.32, t, s + 1, ang); chama(c, R * 0.6, R * 0.44, R * 0.3, t, s + 2, ang);
        for (const sx of [-1, 1]) { c.strokeStyle = FER.esc; c.lineWidth = R * 0.07; c.beginPath(); c.arc(sx * R * 0.66, 0, R * 0.14, -Math.PI / 2, Math.PI / 2, sx < 0); c.stroke(); }
        c.fillStyle = radial(c, -R * 0.2, -R * 0.25, R * 0.9, ['#55585e', '#26272b', '#111214']); c.beginPath(); c.arc(0, 0, R * 0.66, 0, TAU); c.fill(); linha(c, R * 0.05);
        c.strokeStyle = FER.cla; c.lineWidth = R * 0.07; c.beginPath(); c.arc(0, 0, R * 0.58, 0, TAU); c.stroke();
        c.fillStyle = radial(c, 0, 0, R * 0.54, ['#d6ffa8', '#6ad05a', '#2a7a2a']); c.beginPath(); c.arc(0, 0, R * 0.52, 0, TAU); c.fill();
        // as bolhas que sobem e estouram
        for (let i = 0; i < 7; i++) {
          const f = ((t || 0) * 0.7 + hsh(s, i, 1)) % 1, a = hsh(s, i, 2) * TAU, d = hsh(s, i, 3) * R * 0.38;
          c.strokeStyle = `rgba(230,255,210,${0.85 * (1 - f)})`; c.lineWidth = R * 0.025; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, R * (0.03 + f * 0.09), 0, TAU); c.stroke();
        }
      },
    },
    /* ---------- Clã e sede (cores: as do brasão do clã, quando o objeto vem da sede; o mestre troca no painel) ---------- */
    brasao: {
      n: 'Brasão na parede', g: 'cla', size: 1, cores: true,
      draw(c, R, t, s, ang, tok) {
        const [c1, c2] = coresDe(tok), b = (tok && tok.bras) || null;
        sombra(c, R, 0.62, 0.66, 0.05, -0.05);
        // o gancho na parede (em cima) e o escudo pendurado
        c.fillStyle = FER.esc; c.fillRect(-R * 0.08, -R * 0.98, R * 0.16, R * 0.14);
        const k = R * 1.5 / 100;
        c.save(); c.translate(-R * 0.75, -R * 0.88); c.scale(k, k);
        let forma = null;
        try { forma = new Path2D((b && b.f) || 'M6 6H94V58C94 92 50 114 50 114C50 114 6 92 6 58Z'); } catch (e) { forma = null; }
        if (forma) {
          c.save(); c.clip(forma);
          const div = (b && b.div) || 'partido';
          c.fillStyle = c1; c.fillRect(0, 0, 100, 120);
          c.fillStyle = c2;
          if (div === 'partido') c.fillRect(50, 0, 50, 120);
          else if (div === 'cortado') c.fillRect(0, 60, 100, 60);
          else if (div === 'esquartelado') { c.fillRect(50, 0, 50, 60); c.fillRect(0, 60, 50, 60); }
          else if (div === 'faixa') { c.beginPath(); c.moveTo(-10, 18); c.lineTo(18, -10); c.lineTo(110, 92); c.lineTo(82, 120); c.closePath(); c.fill(); }
          if (b && b.s) {
            try {
              const sp = new Path2D(b.s);
              c.save(); c.translate(b.fl ? 12 : 26, b.fl ? 36 : 28); c.scale(2, 2);
              c.strokeStyle = claro(c1) && (div === 'liso' || claro(c2)) ? '#1b1b22' : '#f6efe2'; c.lineWidth = 1.8; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(sp);
              c.restore();
            } catch (e) { /* (um símbolo que não desenha: fica sem) */ }
          }
          c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(0, 0, 100, 40);
          c.restore();
          c.lineWidth = 5; c.strokeStyle = '#c9a24a'; c.stroke(forma);
          c.lineWidth = 1.5; c.strokeStyle = CONTORNO; c.stroke(forma);
        }
        c.restore();
      },
    },
    mesaGuerra: {
      n: 'Mesa de guerra', g: 'cla', size: 2, cores: true,
      draw(c, R, t, s, ang, tok) {
        const [c1, c2] = coresDe(tok);
        sombra(c, R, 0.95, 0.68, 0.05, 0.08);
        const w = R * 1.84, h = R * 1.2, x = -w / 2, y = -h / 2;
        caixa(c, x, y, w, h, R * 0.06); c.fillStyle = MAD.med; c.fill();
        for (let i = 0; i < 5; i++) tabua(c, x + R * 0.03, y + R * 0.03 + i * (h - R * 0.06) / 5, w - R * 0.06, (h - R * 0.06) / 5 - R * 0.01, s + i);
        caixa(c, x, y, w, h, R * 0.06); linha(c, R * 0.04);
        // o mapa aberto: o pergaminho, a costa, o rio, as montanhas
        c.save(); c.rotate(-0.05);
        caixa(c, -R * 0.72, -R * 0.46, R * 1.44, R * 0.92, R * 0.03); c.fillStyle = '#dccca2'; c.fill(); linha(c, R * 0.025, '#8a6a3a');
        c.strokeStyle = '#5a7a90'; c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(-R * 0.72, -R * 0.1); c.bezierCurveTo(-R * 0.4, -R * 0.3, -R * 0.3, R * 0.1, -R * 0.05, R * 0.46); c.stroke();
        c.strokeStyle = '#8a6a3a'; c.lineWidth = R * 0.025;
        for (const [mx, my] of [[0.25, -0.25], [0.38, -0.18], [0.5, -0.28], [0.2, 0.2]]) { c.beginPath(); c.moveTo((mx - 0.06) * R, my * R + R * 0.05); c.lineTo(mx * R, my * R - R * 0.05); c.lineTo((mx + 0.06) * R, my * R + R * 0.05); c.stroke(); }
        // as bandeirinhas: as do clã e as do inimigo
        const band = (bx, by, cor) => { c.strokeStyle = '#2a1a0e'; c.lineWidth = R * 0.02; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by - R * 0.16); c.stroke(); c.fillStyle = cor; c.beginPath(); c.moveTo(bx, by - R * 0.16); c.lineTo(bx + R * 0.13, by - R * 0.11); c.lineTo(bx, by - R * 0.06); c.closePath(); c.fill(); linha(c, R * 0.012); };
        band(-R * 0.45, R * 0.05, c1); band(-R * 0.2, -R * 0.2, c1); band(-R * 0.35, R * 0.32, c2);
        band(R * 0.4, R * 0.08, '#8a2a2a'); band(R * 0.55, -R * 0.15, '#8a2a2a');
        c.restore();
        // a adaga cravada no canto e a vela
        c.strokeStyle = FER.luz; c.lineWidth = R * 0.05; c.lineCap = 'round'; c.beginPath(); c.moveTo(R * 0.62, R * 0.38); c.lineTo(R * 0.8, R * 0.5); c.stroke();
        c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(R * 0.6, R * 0.37, R * 0.05, 0, TAU); c.fill();
        c.fillStyle = '#f1e2c2'; c.beginPath(); c.arc(-R * 0.78, -R * 0.42, R * 0.08, 0, TAU); c.fill(); linha(c, R * 0.02, 'rgba(90,70,40,0.8)');
      },
    },
    quadroMissoes: {
      n: 'Quadro de missões', g: 'cla', size: 1, cores: true,
      draw(c, R, t, s, ang, tok) {
        const [c1, c2] = coresDe(tok);
        // o quadro na parede (em cima): a madeira, a faixa com as cores do clã, os papéis pregados
        sombra(c, R, 0.85, 0.42, 0.05, -0.3);
        caixa(c, -R * 0.92, -R * 0.98, R * 1.84, R * 1.12, R * 0.06); c.fillStyle = grad(c, 0, -R, 0, R * 0.14, [MAD.cla, MAD.med]); c.fill(); linha(c, R * 0.05);
        c.fillStyle = c1; c.fillRect(-R * 0.86, -R * 0.93, R * 1.72, R * 0.17);
        c.fillStyle = c2; c.fillRect(-R * 0.86, -R * 0.78, R * 1.72, R * 0.04);
        const papeis = [[-0.55, -0.48], [-0.05, -0.5], [0.48, -0.46], [-0.32, -0.12], [0.22, -0.14]];
        papeis.forEach(([px, py], i) => {
          c.save(); c.translate(px * R, py * R); c.rotate((hsh(s, i, 1) - 0.5) * 0.35);
          c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-R * 0.19 + R * 0.03, -R * 0.15 + R * 0.04, R * 0.38, R * 0.3);
          c.fillStyle = i === 2 ? '#e8d8b0' : '#f1e7cc'; c.fillRect(-R * 0.19, -R * 0.15, R * 0.38, R * 0.3);
          c.strokeStyle = 'rgba(70,50,30,0.55)'; c.lineWidth = R * 0.015;
          for (let l = 0; l < 3; l++) { c.beginPath(); c.moveTo(-R * 0.13, -R * 0.05 + l * R * 0.07); c.lineTo(R * (0.13 - hsh(s, i * 3 + l, 2) * 0.1), -R * 0.05 + l * R * 0.07); c.stroke(); }
          c.fillStyle = i % 2 ? '#c8452f' : c2; c.beginPath(); c.arc(0, -R * 0.11, R * 0.035, 0, TAU); c.fill();
          c.restore();
        });
      },
    },
    cofre: {
      n: 'Cofre', g: 'cla', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.8, 0.8, 0.08, 0.12);
        const w = R * 1.5, x = -w / 2;
        caixa(c, x, x, w, w, R * 0.1); c.fillStyle = grad(c, x, x, -x, -x, [FER.luz, FER.cla, FER.esc]); c.fill(); linha(c, R * 0.06);
        caixa(c, x + R * 0.15, x + R * 0.15, w - R * 0.3, w - R * 0.3, R * 0.06); c.fillStyle = FER.med; c.fill(); linha(c, R * 0.03, FER.esc);
        for (let i = 0; i < 12; i++) { const f = (i % 3 + 0.5) / 3, lado = Math.floor(i / 3), px = lado === 0 ? x + f * w : lado === 1 ? -x - R * 0.07 : lado === 2 ? -x - f * w : x + R * 0.07, py = lado === 0 ? x + R * 0.07 : lado === 1 ? x + f * w : lado === 2 ? -x - R * 0.07 : -x - f * w; c.fillStyle = FER.luz; c.beginPath(); c.arc(px, py, R * 0.035, 0, TAU); c.fill(); }
        for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { c.fillStyle = '#c9a24a'; c.beginPath(); c.moveTo(a * -x, b * -x); c.lineTo(a * (-x - R * 0.24), b * -x); c.lineTo(a * -x, b * (-x - R * 0.24)); c.closePath(); c.fill(); }
        // o disco do segredo e a manivela
        c.fillStyle = radial(c, -R * 0.05, -R * 0.05, R * 0.3, ['#e8eaee', FER.cla, FER.esc]); c.beginPath(); c.arc(0, 0, R * 0.26, 0, TAU); c.fill(); linha(c, R * 0.03);
        c.strokeStyle = FER.esc; c.lineWidth = R * 0.02; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2); c.lineTo(Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25); c.stroke(); }
        c.strokeStyle = '#c9a24a'; c.lineWidth = R * 0.07; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(R * 0.17, -R * 0.1); c.stroke();
      },
    },
    trofeu: {
      n: 'Troféu de caça', g: 'cla', size: 1,
      draw(c, R, t, s) {
        // a placa na parede (em cima) e a cabeça empalhada que sai dela: um cervo ou um javali
        sombra(c, R, 0.7, 0.5, 0.05, -0.12);
        caixa(c, -R * 0.36, -R * 0.98, R * 0.72, R * 0.34, R * 0.12); c.fillStyle = grad(c, 0, -R, 0, -R * 0.64, [MAD.luz, MAD.med]); c.fill(); linha(c, R * 0.04);
        const cervo = s % 2 === 0;
        if (cervo) {
          c.strokeStyle = '#ddd0b0'; c.lineCap = 'round';
          for (const sx of [-1, 1]) {
            c.lineWidth = R * 0.07; c.beginPath(); c.moveTo(sx * R * 0.14, -R * 0.62); c.quadraticCurveTo(sx * R * 0.55, -R * 0.7, sx * R * 0.85, -R * 0.35); c.stroke();
            c.lineWidth = R * 0.05;
            for (const [f, l] of [[0.35, 0.22], [0.6, 0.25], [0.85, 0.18]]) { const px = sx * R * (0.14 + 0.71 * f), py = -R * (0.62 - 0.27 * f * f) - R * 0.04; c.beginPath(); c.moveTo(px, py); c.lineTo(px + sx * R * 0.06, py - l * R); c.stroke(); }
          }
        }
        c.fillStyle = grad(c, 0, -R * 0.7, 0, R * 0.2, cervo ? ['#9a7448', '#6e4e2e'] : ['#5a4a3a', '#3a2e24']);
        c.beginPath(); c.moveTo(-R * 0.24, -R * 0.66); c.quadraticCurveTo(-R * 0.3, -R * 0.1, -R * 0.12, R * 0.22); c.quadraticCurveTo(0, R * 0.32, R * 0.12, R * 0.22); c.quadraticCurveTo(R * 0.3, -R * 0.1, R * 0.24, -R * 0.66); c.closePath(); c.fill(); linha(c, R * 0.04);
        c.fillStyle = '#1a120c'; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * R * 0.14, -R * 0.28, R * 0.045, 0, TAU); c.fill(); }
        c.fillStyle = cervo ? '#2a1c12' : '#6a4a3a'; c.beginPath(); c.ellipse(0, R * 0.18, R * 0.1, R * 0.07, 0, 0, TAU); c.fill();
        if (!cervo) for (const sx of [-1, 1]) { c.strokeStyle = '#efe6d0'; c.lineWidth = R * 0.05; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx * R * 0.1, R * 0.12); c.quadraticCurveTo(sx * R * 0.3, R * 0.15, sx * R * 0.26, -R * 0.05); c.stroke(); }
      },
    },
    boneco: {
      n: 'Boneco de treino', g: 'cla', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.75, 0.55);
        // os braços (a trave), o corpo de palha amarrado e a cabeça de saco com o alvo pintado
        caixa(c, -R * 0.86, -R * 0.12, R * 1.72, R * 0.24, R * 0.08); c.fillStyle = grad(c, 0, -R * 0.12, 0, R * 0.12, [MAD.cla, MAD.esc]); c.fill(); linha(c, R * 0.04);
        c.strokeStyle = '#c9a85a'; c.lineWidth = R * 0.035; c.lineCap = 'round';
        for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(sx * R * 0.86, (i - 1.5) * R * 0.06); c.lineTo(sx * R * (0.95 + hsh(s, i, sx + 2) * 0.05), (i - 1.5) * R * 0.1); c.stroke(); }
        c.fillStyle = radial(c, -R * 0.12, -R * 0.12, R * 0.6, ['#e0c27a', '#c9a85a', '#8a6a2a']); c.beginPath(); c.arc(0, 0, R * 0.46, 0, TAU); c.fill(); linha(c, R * 0.04);
        c.strokeStyle = 'rgba(120,90,40,0.6)'; c.lineWidth = R * 0.02;
        for (let i = 0; i < 14; i++) { const a = hsh(s, i, 4) * TAU, d = R * (0.1 + hsh(s, i, 5) * 0.3); c.beginPath(); c.moveTo(Math.cos(a) * d, Math.sin(a) * d); c.lineTo(Math.cos(a) * (d + R * 0.12), Math.sin(a) * (d + R * 0.12)); c.stroke(); }
        c.strokeStyle = '#6b4a2b'; c.lineWidth = R * 0.05; c.beginPath(); c.arc(0, 0, R * 0.36, 0, TAU); c.stroke();
        c.fillStyle = radial(c, -R * 0.05, -R * 0.05, R * 0.25, ['#efe0bc', '#d8c49a', '#a8946a']); c.beginPath(); c.arc(0, 0, R * 0.22, 0, TAU); c.fill(); linha(c, R * 0.03);
        c.strokeStyle = '#8a2a2a'; c.lineWidth = R * 0.04; c.beginPath(); c.arc(0, 0, R * 0.12, 0, TAU); c.stroke();
        c.beginPath(); c.moveTo(-R * 0.06, -R * 0.06); c.lineTo(R * 0.06, R * 0.06); c.moveTo(R * 0.06, -R * 0.06); c.lineTo(-R * 0.06, R * 0.06); c.stroke();
      },
    },
    alvo: {
      n: 'Alvo de arco', g: 'cla', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.82, 0.82);
        c.strokeStyle = MAD.esc; c.lineWidth = R * 0.08; c.lineCap = 'round';
        for (const a of [Math.PI * 0.75, Math.PI * 0.25]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92); c.stroke(); }
        for (const [r, cor] of [[0.8, '#b8985a'], [0.72, '#efe6d2'], [0.57, '#2a3a5a'], [0.42, '#efe6d2'], [0.28, '#b8352a'], [0.13, '#e6b84a']]) { c.fillStyle = cor; c.beginPath(); c.arc(0, 0, r * R, 0, TAU); c.fill(); }
        c.beginPath(); c.arc(0, 0, R * 0.8, 0, TAU); linha(c, R * 0.04);
        c.strokeStyle = 'rgba(120,90,40,0.5)'; c.lineWidth = R * 0.02; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72); c.lineTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); c.stroke(); }
        // as flechas cravadas (vistas de frente: o cabo e as penas)
        for (let i = 0; i < 3; i++) {
          const a = hsh(s, i, 1) * TAU, d = R * hsh(s, i, 2) * 0.5, x = Math.cos(a) * d, y = Math.sin(a) * d;
          c.strokeStyle = '#efe6d2'; c.lineWidth = R * 0.03;
          for (let k = 0; k < 3; k++) { const b = k / 3 * TAU + a; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(b) * R * 0.1, y + Math.sin(b) * R * 0.1); c.stroke(); }
          c.fillStyle = MAD.esc; c.beginPath(); c.arc(x, y, R * 0.04, 0, TAU); c.fill();
        }
      },
    },
    atril: {
      n: 'Atril com o livro', g: 'cla', size: 1, cores: true,
      draw(c, R, t, s, ang, tok) {
        const [c1, c2] = coresDe(tok);
        sombra(c, R, 0.72, 0.68);
        caixa(c, -R * 0.66, -R * 0.52, R * 1.32, R * 1.0, R * 0.08); c.fillStyle = grad(c, 0, -R * 0.52, 0, R * 0.48, [MAD.luz, MAD.cla, MAD.med]); c.fill(); linha(c, R * 0.05);
        caixa(c, -R * 0.66, R * 0.36, R * 1.32, R * 0.12, R * 0.04); c.fillStyle = MAD.esc; c.fill();
        // o livro aberto: a capa nas cores do clã, as páginas, a fita
        c.save(); c.rotate(-0.04);
        caixa(c, -R * 0.56, -R * 0.42, R * 1.12, R * 0.78, R * 0.05); c.fillStyle = c1; c.fill(); linha(c, R * 0.03);
        for (const sx of [-1, 1]) {
          c.fillStyle = '#efe4c8'; c.beginPath(); c.moveTo(0, -R * 0.36); c.quadraticCurveTo(sx * R * 0.26, -R * 0.42, sx * R * 0.5, -R * 0.36); c.lineTo(sx * R * 0.5, R * 0.3); c.quadraticCurveTo(sx * R * 0.26, R * 0.24, 0, R * 0.3); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(70,50,30,0.5)'; c.lineWidth = R * 0.015;
          for (let l = 0; l < 6; l++) { const yy = -R * 0.22 + l * R * 0.08; c.beginPath(); c.moveTo(sx * R * 0.08, yy); c.lineTo(sx * R * 0.42, yy); c.stroke(); }
        }
        c.strokeStyle = 'rgba(40,24,12,0.7)'; c.lineWidth = R * 0.025; c.beginPath(); c.moveTo(0, -R * 0.36); c.lineTo(0, R * 0.3); c.stroke();
        c.fillStyle = c2; c.fillRect(R * 0.04, R * 0.2, R * 0.06, R * 0.3);
        c.restore();
      },
    },
    /* ---------- Linhagens ---------- */
    caixao: {
      n: 'Caixão', g: 'linhagem', size: 2,
      draw(c, R, t, s) {
        sombra(c, R, 0.55, 0.95, 0.06, 0.06);
        const L = R * 1.84, E = R * 0.96;
        const forma = k => { c.beginPath(); c.moveTo(-E * 0.3 * k, -L / 2 * k); c.lineTo(E * 0.3 * k, -L / 2 * k); c.lineTo(E / 2 * k, -L * 0.24 * k); c.lineTo(E * 0.36 * k, L / 2 * k); c.lineTo(-E * 0.36 * k, L / 2 * k); c.lineTo(-E / 2 * k, -L * 0.24 * k); c.closePath(); };
        forma(1); c.fillStyle = grad(c, -E / 2, 0, E / 2, 0, ['#2a180e', '#3e2618', '#22140c']); c.fill(); linha(c, R * 0.05);
        const aberto = s % 3 === 0;
        if (aberto) {
          // aberto: o veludo vermelho lá dentro e a tampa empurrada de lado
          forma(0.84); c.fillStyle = radial(c, 0, -L * 0.15, L * 0.5, ['#8a1a2a', '#5a0f1c', '#2a060c']); c.fill();
          c.save(); c.translate(E * 0.42, R * 0.12); c.rotate(0.16);
          forma(0.9); c.fillStyle = grad(c, -E / 2, 0, E / 2, 0, ['#5a3a24', '#3e2618']); c.fill(); linha(c, R * 0.04);
          c.restore();
        } else {
          forma(0.84); c.fillStyle = grad(c, -E / 2, 0, E / 2, 0, ['#4e3222', '#5e3e2a', '#3e2618']); c.fill(); linha(c, R * 0.025, 'rgba(120,80,50,0.6)');
          c.strokeStyle = '#c4c8d0'; c.lineWidth = R * 0.07; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -L * 0.3); c.lineTo(0, L * 0.18); c.moveTo(-E * 0.2, -L * 0.14); c.lineTo(E * 0.2, -L * 0.14); c.stroke();
        }
        for (const sy of [-0.1, 0.25]) for (const sx of [-1, 1]) { c.fillStyle = '#c9a24a'; c.fillRect(sx * E * 0.5 - (sx > 0 ? 0 : R * 0.08), sy * L - R * 0.05, R * 0.08, R * 0.1); }
      },
    },
    calice: {
      n: 'Cálice de sangue', g: 'linhagem', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.62, 0.62);
        c.fillStyle = radial(c, -R * 0.2, -R * 0.2, R * 0.8, [PED.luz, PED.cla, PED.esc]); c.beginPath(); c.arc(0, 0, R * 0.6, 0, TAU); c.fill(); linha(c, R * 0.04);
        for (let i = 0; i < 9; i++) { const a = hsh(s, i, 1) * TAU, d = R * (0.25 + hsh(s, i, 2) * 0.5); c.fillStyle = '#6e0f1c'; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, R * (0.025 + hsh(s, i, 3) * 0.04), 0, TAU); c.fill(); }
        c.fillStyle = grad(c, -R * 0.3, -R * 0.3, R * 0.3, R * 0.3, ['#f8d880', '#c08a2e', '#7a5418']); c.beginPath(); c.arc(0, 0, R * 0.32, 0, TAU); c.fill(); linha(c, R * 0.035);
        c.fillStyle = radial(c, -R * 0.06, -R * 0.06, R * 0.26, ['#c8202e', '#7a0a14', '#3a0206']); c.beginPath(); c.arc(0, 0, R * 0.24, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(255,200,200,0.5)'; c.lineWidth = R * 0.025; c.beginPath(); c.arc(0, 0, R * 0.17, Math.PI * 1.1, Math.PI * 1.5); c.stroke();
        for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; c.fillStyle = '#b3122e'; c.beginPath(); c.arc(Math.cos(a) * R * 0.28, Math.sin(a) * R * 0.28, R * 0.035, 0, TAU); c.fill(); }
      },
    },
    candelabro: {
      n: 'Candelabro', g: 'linhagem', size: 1, fogo: true, luz: { bright: 2, dim: 5, c: '#ffb8a0' },
      draw(c, R, t, s, ang) {
        sombra(c, R, 0.7, 0.7);
        c.strokeStyle = FER.esc; c.lineWidth = R * 0.07; c.lineCap = 'round';
        const pts = [];
        for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i / 5 * TAU; pts.push([Math.cos(a) * R * 0.56, Math.sin(a) * R * 0.56]); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Math.cos(a + 0.4) * R * 0.3, Math.sin(a + 0.4) * R * 0.3, pts[i][0], pts[i][1]); c.stroke(); }
        c.fillStyle = radial(c, -R * 0.04, -R * 0.04, R * 0.2, [FER.luz, FER.med, FER.esc]); c.beginPath(); c.arc(0, 0, R * 0.16, 0, TAU); c.fill(); linha(c, R * 0.03);
        pts.forEach(([x, y], i) => {
          c.fillStyle = FER.med; c.beginPath(); c.arc(x, y, R * 0.12, 0, TAU); c.fill();
          c.fillStyle = radial(c, x - R * 0.03, y - R * 0.03, R * 0.12, ['#c8384a', '#8a1424', '#4a0810']); c.beginPath(); c.arc(x, y, R * 0.085, 0, TAU); c.fill();
          c.fillStyle = '#9a1a2a'; c.beginPath(); c.arc(x + R * 0.07, y + R * 0.05, R * 0.03, 0, TAU); c.fill();
        });
        pts.forEach(([x, y], i) => chama(c, x, y, R * 0.3, t, s + i * 5, ang));
      },
    },
    ossada: {
      n: 'Ossada', g: 'linhagem', size: 1,
      draw(c, R, t, s) {
        c.fillStyle = 'rgba(40,28,18,0.35)'; c.beginPath(); c.ellipse(0, R * 0.05, R * 0.8, R * 0.7, 0.3, 0, TAU); c.fill();
        c.save(); c.rotate((hsh(s, 1, 1) - 0.5) * 0.8);
        // a espinha, as costelas, a bacia e o crânio
        c.strokeStyle = '#d8ccb0'; c.lineWidth = R * 0.07; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-R * 0.02, -R * 0.5); c.quadraticCurveTo(R * 0.08, 0, 0, R * 0.48); c.stroke();
        c.lineWidth = R * 0.045;
        for (let i = 0; i < 5; i++) { const y = -R * 0.38 + i * R * 0.14, l = R * (0.42 - i * 0.04); for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(R * 0.02, y); c.quadraticCurveTo(sx * l, y - R * 0.02, sx * l * 0.85, y + R * 0.2); c.stroke(); } }
        c.fillStyle = '#e2d7bd'; c.beginPath(); c.ellipse(0, R * 0.5, R * 0.24, R * 0.12, 0, 0, TAU); c.fill(); linha(c, R * 0.02, 'rgba(90,80,60,0.7)');
        cranio(c, -R * 0.06, -R * 0.68, R * 0.2);
        c.restore();
        for (let i = 0; i < 3; i++) { const a = hsh(s, i, 3) * TAU, d = R * (0.55 + hsh(s, i, 4) * 0.2), b = hsh(s, i, 5) * Math.PI; osso(c, Math.cos(a) * d - Math.cos(b) * R * 0.18, Math.sin(a) * d - Math.sin(b) * R * 0.18, Math.cos(a) * d + Math.cos(b) * R * 0.18, Math.sin(a) * d + Math.sin(b) * R * 0.18, R * 0.05); }
      },
    },
    garras: {
      n: 'Marcas de garra', g: 'linhagem', size: 1,
      draw(c, R, t, s) {
        c.save(); c.rotate(-0.45 + hsh(s, 1, 1) * 0.5);
        for (let k = 0; k < 4; k++) {
          const x = (k - 1.5) * R * 0.25, L = R * (0.72 + hsh(s, k, 2) * 0.18);
          c.beginPath(); c.moveTo(x - R * 0.1, -L); c.quadraticCurveTo(x + R * 0.06, 0, x + R * 0.12, L); c.quadraticCurveTo(x - R * 0.02, 0, x - R * 0.1, -L); c.closePath();
          c.fillStyle = '#140d08'; c.fill();
          c.beginPath(); c.moveTo(x - R * 0.04, -L * 0.8); c.quadraticCurveTo(x + R * 0.09, 0, x + R * 0.14, L * 0.85); c.strokeStyle = 'rgba(190,170,140,0.45)'; c.lineWidth = R * 0.03; c.stroke();
        }
        c.strokeStyle = '#5a4a3a'; c.lineWidth = R * 0.025; c.lineCap = 'round';
        for (let i = 0; i < 7; i++) { const x = (hsh(s, i, 6) - 0.5) * R * 1.3, y = (hsh(s, i, 7) - 0.5) * R * 1.4, a = hsh(s, i, 8) * TAU; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * R * 0.14, y + Math.sin(a) * R * 0.14); c.stroke(); }
        c.restore();
      },
    },
    totemLobo: {
      n: 'Totem do lobo', g: 'linhagem', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.65, 0.65);
        // as tiras de pele e as penas presas no poste
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * TAU + 0.3, x1 = Math.cos(a) * R * 0.85, y1 = Math.sin(a) * R * 0.85;
          c.strokeStyle = i % 2 ? '#6a5a4a' : '#8a7a68'; c.lineWidth = R * 0.12; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Math.cos(a + 0.3) * R * 0.5, Math.sin(a + 0.3) * R * 0.5, x1, y1); c.stroke();
          if (i % 2 === 0) { c.fillStyle = '#e0d8c8'; c.beginPath(); c.ellipse(x1, y1, R * 0.12, R * 0.05, a, 0, TAU); c.fill(); }
        }
        c.fillStyle = radial(c, -R * 0.1, -R * 0.1, R * 0.5, [MAD.luz, MAD.cla, MAD.esc]); c.beginPath(); c.arc(0, 0, R * 0.36, 0, TAU); c.fill(); linha(c, R * 0.04);
        c.strokeStyle = '#8a2a2a'; c.lineWidth = R * 0.05; c.beginPath(); c.arc(0, 0, R * 0.3, 0, TAU); c.stroke();
        // o crânio do lobo, com o focinho para a frente
        c.fillStyle = '#e6dcc2';
        c.beginPath(); c.ellipse(0, -R * 0.08, R * 0.22, R * 0.2, 0, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(-R * 0.13, -R * 0.02); c.lineTo(-R * 0.07, R * 0.45); c.lineTo(R * 0.07, R * 0.45); c.lineTo(R * 0.13, -R * 0.02); c.closePath(); c.fill(); linha(c, R * 0.025, 'rgba(90,80,60,0.8)');
        c.fillStyle = '#1a120c'; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * R * 0.1, -R * 0.06, R * 0.06, R * 0.04, sx * 0.4, 0, TAU); c.fill(); }
        c.fillStyle = '#ffffff'; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * R * 0.08, R * 0.32); c.lineTo(sx * R * 0.05, R * 0.44); c.lineTo(sx * R * 0.11, R * 0.38); c.closePath(); c.fill(); }
      },
    },
    circulo: {
      n: 'Círculo de invocação', g: 'linhagem', size: 2, fogo: true, luz: { bright: 2, dim: 6, c: '#ff5a3a' },
      draw(c, R, t, s, ang) {
        const f = 0.78 + 0.22 * Math.sin((t || 0) * 2.2 + s);
        c.save(); c.globalCompositeOperation = 'lighter';
        c.fillStyle = radial(c, 0, 0, R * 0.98, [`rgba(255,70,30,${0.3 * f})`, 'rgba(255,40,10,0.08)', 'rgba(255,40,10,0)']); c.beginPath(); c.arc(0, 0, R * 0.98, 0, TAU); c.fill();
        c.restore();
        c.fillStyle = 'rgba(20,4,4,0.55)'; c.beginPath(); c.arc(0, 0, R * 0.3, 0, TAU); c.fill();
        c.strokeStyle = '#c2361a'; c.lineWidth = R * 0.05; c.beginPath(); c.arc(0, 0, R * 0.9, 0, TAU); c.stroke();
        c.lineWidth = R * 0.03; c.beginPath(); c.arc(0, 0, R * 0.74, 0, TAU); c.stroke();
        c.strokeStyle = `rgba(255,120,70,${0.9 * f})`; c.lineWidth = R * 0.035; c.lineJoin = 'round';
        c.beginPath(); for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + (i * 2 / 5) * TAU, x = Math.cos(a) * R * 0.74, y = Math.sin(a) * R * 0.74; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
        // as runas entre os dois círculos
        c.strokeStyle = '#ffb070'; c.lineWidth = R * 0.02; c.lineCap = 'round';
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.13, x = Math.cos(a) * R * 0.82, y = Math.sin(a) * R * 0.82, k = Math.floor(hsh(s, i, 1) * 3); c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2); c.beginPath(); if (k === 0) { c.moveTo(-R * 0.04, -R * 0.04); c.lineTo(R * 0.04, R * 0.04); c.moveTo(R * 0.04, -R * 0.04); c.lineTo(0, 0); } else if (k === 1) { c.moveTo(0, -R * 0.05); c.lineTo(0, R * 0.05); c.moveTo(-R * 0.04, 0); c.lineTo(R * 0.04, -R * 0.03); } else { c.arc(0, 0, R * 0.035, 0, Math.PI); c.moveTo(0, -R * 0.05); c.lineTo(0, 0); } c.stroke(); c.restore(); }
        // as velas nas cinco pontas
        for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i / 5 * TAU, x = Math.cos(a) * R * 0.74, y = Math.sin(a) * R * 0.74; c.fillStyle = '#2a1a1a'; c.beginPath(); c.arc(x, y, R * 0.06, 0, TAU); c.fill(); chama(c, x, y, R * 0.18, t, s + i * 3, ang); }
      },
    },
    idolo: {
      n: 'Ídolo demoníaco', g: 'linhagem', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.78, 0.78);
        c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; c.lineTo(Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78); } c.closePath();
        c.fillStyle = grad(c, 0, -R * 0.78, 0, R * 0.78, [PED.med, PED.esc]); c.fill(); linha(c, R * 0.04);
        // os chifres, a cabeça de pedra escura e os olhos em brasa
        for (const sx of [-1, 1]) {
          c.beginPath(); c.moveTo(sx * R * 0.18, -R * 0.2); c.quadraticCurveTo(sx * R * 0.75, -R * 0.35, sx * R * 0.62, -R * 0.85); c.quadraticCurveTo(sx * R * 0.55, -R * 0.45, sx * R * 0.3, -R * 0.02); c.closePath();
          c.fillStyle = grad(c, sx * R * 0.2, 0, sx * R * 0.65, -R * 0.8, ['#3a2a24', '#5a463a', '#d8c8a0']); c.fill(); linha(c, R * 0.03);
        }
        c.fillStyle = radial(c, -R * 0.1, -R * 0.12, R * 0.5, ['#6a5a5a', '#3a2e2e', '#1e1818']); c.beginPath(); c.arc(0, 0, R * 0.4, 0, TAU); c.fill(); linha(c, R * 0.04);
        c.save(); c.globalCompositeOperation = 'lighter';
        for (const sx of [-1, 1]) { c.fillStyle = radial(c, sx * R * 0.14, -R * 0.02, R * 0.16, ['rgba(255,140,60,0.9)', 'rgba(255,60,20,0.35)', 'rgba(255,40,10,0)']); c.beginPath(); c.arc(sx * R * 0.14, -R * 0.02, R * 0.16, 0, TAU); c.fill(); }
        c.restore();
        c.fillStyle = '#ffd08a'; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * R * 0.14, -R * 0.02, R * 0.05, R * 0.025, 0, 0, TAU); c.fill(); }
        c.strokeStyle = '#120c0c'; c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(-R * 0.14, R * 0.18); c.quadraticCurveTo(0, R * 0.26, R * 0.14, R * 0.18); c.stroke();
      },
    },
    /* ---------- Viagem e acampamento ---------- */
    barraca: {
      n: 'Barraca', g: 'viagem', size: 2,
      draw(c, R, t, s) {
        const cor = ['#b8a27a', '#8a9a6a', '#a87a5a', '#7a8aa0'][s % 4], w = R * 1.36, h = R * 1.66;
        sombra(c, R, 0.86, 0.95, 0.08, 0.08);
        // as cordas e as estacas
        c.strokeStyle = '#b89a62'; c.lineWidth = R * 0.02;
        for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x0 = a * w / 2, y0 = b * h * 0.42, x1 = a * R * 0.96, y1 = b * R * 0.94; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.fillStyle = MAD.esc; c.beginPath(); c.arc(x1, y1, R * 0.035, 0, TAU); c.fill(); }
        // as duas águas do pano (uma no sol, outra na sombra) e a cumeeira
        c.fillStyle = tom(cor, -0.18); c.fillRect(-w / 2, -h / 2, w / 2, h);
        c.fillStyle = tom(cor, 0.08); c.fillRect(0, -h / 2, w / 2, h);
        c.strokeStyle = 'rgba(40,30,20,0.25)'; c.lineWidth = R * 0.02;
        for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(-w / 2, -h / 2 + i * h / 5); c.lineTo(w / 2, -h / 2 + i * h / 5); c.stroke(); }
        c.strokeStyle = tom(cor, -0.35); c.lineWidth = R * 0.05; c.beginPath(); c.moveTo(0, -h / 2); c.lineTo(0, h / 2); c.stroke();
        c.beginPath(); c.rect(-w / 2, -h / 2, w, h); linha(c, R * 0.04);
        // a entrada aberta, embaixo
        c.fillStyle = '#241a10'; c.beginPath(); c.moveTo(-w * 0.2, h / 2); c.lineTo(0, h / 2 - R * 0.38); c.lineTo(w * 0.2, h / 2); c.closePath(); c.fill();
        for (const sy of [-1, 1]) { c.fillStyle = MAD.cla; c.beginPath(); c.arc(0, sy * h / 2, R * 0.05, 0, TAU); c.fill(); }
      },
    },
    carroca: {
      n: 'Carroça', g: 'viagem', size: 2,
      draw(c, R, t, s) {
        sombra(c, R, 0.75, 0.95, 0.06, 0.06);
        // os varais (para o cavalo), as rodas e a caixa de tábuas
        c.strokeStyle = MAD.esc; c.lineWidth = R * 0.07; c.lineCap = 'round';
        for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * R * 0.4, -R * 0.55); c.lineTo(sx * R * 0.22, -R * 0.98); c.stroke(); }
        c.beginPath(); c.moveTo(-R * 0.24, -R * 0.92); c.lineTo(R * 0.24, -R * 0.92); c.stroke();
        for (const sx of [-1, 1]) { caixa(c, sx * R * 0.72 - R * 0.09, -R * 0.12, R * 0.18, R * 0.62, R * 0.06); c.fillStyle = grad(c, 0, -R * 0.12, 0, R * 0.5, [MAD.cla, MAD.esc]); c.fill(); c.lineWidth = R * 0.05; c.strokeStyle = FER.med; c.stroke(); }
        const w = R * 1.24, h = R * 1.42, x = -w / 2, y = -R * 0.6;
        caixa(c, x, y, w, h, R * 0.05); c.fillStyle = MAD.med; c.fill();
        for (let i = 0; i < 4; i++) tabua(c, x + R * 0.04 + i * (w - R * 0.08) / 4, y + R * 0.04, (w - R * 0.08) / 4 - R * 0.02, h - R * 0.08, s + i);
        caixa(c, x, y, w, h, R * 0.05); c.lineWidth = R * 0.08; c.strokeStyle = MAD.esc; c.stroke(); linha(c, R * 0.03);
        // a carga: os sacos e um barrilzinho
        for (const [px, py] of [[-0.25, -0.2], [0.18, -0.25], [-0.15, 0.25]]) { c.fillStyle = radial(c, (px - 0.06) * R, (py - 0.06) * R, R * 0.3, ['#e0ceA0', '#c8b48a', '#8a7a5a']); c.beginPath(); c.ellipse(px * R, py * R, R * 0.22, R * 0.17, px, 0, TAU); c.fill(); linha(c, R * 0.025); c.fillStyle = '#6b4a2b'; c.beginPath(); c.arc(px * R + R * 0.14, py * R, R * 0.03, 0, TAU); c.fill(); }
        c.fillStyle = radial(c, R * 0.24, R * 0.4, R * 0.25, [MAD.luz, MAD.cla, MAD.med]); c.beginPath(); c.arc(R * 0.3, R * 0.45, R * 0.18, 0, TAU); c.fill(); linha(c, R * 0.03);
      },
    },
    cerca: {
      n: 'Cerca', g: 'viagem', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.96, 0.22, 0.05, 0.12);
        for (const y of [-R * 0.17, R * 0.07]) { caixa(c, -R, y, R * 2, R * 0.11, R * 0.04); c.fillStyle = grad(c, 0, y, 0, y + R * 0.11, [MAD.cla, MAD.esc]); c.fill(); linha(c, R * 0.025); }
        for (const x of [-0.86, 0, 0.86]) { c.fillStyle = radial(c, (x - 0.04) * R, -R * 0.04, R * 0.16, [MAD.luz, MAD.cla, MAD.esc]); c.beginPath(); c.arc(x * R, 0, R * 0.13, 0, TAU); c.fill(); linha(c, R * 0.03); }
      },
    },
    sacoDormir: {
      n: 'Saco de dormir', g: 'viagem', size: 1,
      draw(c, R, t, s) {
        const cor = ['#6a7a4a', '#8a5a3a', '#4a5a7a'][s % 3];
        sombra(c, R, 0.46, 0.9, 0.06, 0.06);
        caixa(c, -R * 0.42, -R * 0.88, R * 0.84, R * 1.76, R * 0.32); c.fillStyle = grad(c, -R * 0.42, 0, R * 0.42, 0, [tom(cor, 0.1), cor, tom(cor, -0.2)]); c.fill(); linha(c, R * 0.04);
        c.strokeStyle = 'rgba(20,20,10,0.25)'; c.lineWidth = R * 0.02; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(-R * 0.38, -R * 0.5 + i * R * 0.24); c.lineTo(R * 0.38, -R * 0.5 + i * R * 0.24); c.stroke(); }
        caixa(c, -R * 0.42, -R * 0.88, R * 0.84, R * 0.5, R * 0.3); c.fillStyle = tom(cor, 0.18); c.fill(); linha(c, R * 0.03);
        c.fillStyle = '#ddd2b8'; c.beginPath(); c.ellipse(0, -R * 0.62, R * 0.26, R * 0.16, 0, 0, TAU); c.fill(); linha(c, R * 0.02, 'rgba(90,80,60,0.6)');
      },
    },
    mochila: {
      n: 'Mochila e mantimentos', g: 'viagem', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.8, 0.7);
        // o cantil, o saquinho e a mochila (com a manta enrolada em cima)
        c.fillStyle = radial(c, R * 0.5, R * 0.42, R * 0.3, ['#c8a070', '#8a6a42', '#5a4228']); c.beginPath(); c.ellipse(R * 0.55, R * 0.45, R * 0.2, R * 0.26, 0.4, 0, TAU); c.fill(); linha(c, R * 0.03);
        c.fillStyle = '#3a2a1a'; c.beginPath(); c.arc(R * 0.62, R * 0.24, R * 0.05, 0, TAU); c.fill();
        c.fillStyle = radial(c, -R * 0.55, R * 0.5, R * 0.25, ['#d8c49a', '#b89a6a', '#7a6242']); c.beginPath(); c.arc(-R * 0.55, R * 0.52, R * 0.18, 0, TAU); c.fill(); linha(c, R * 0.03);
        caixa(c, -R * 0.42, -R * 0.45, R * 0.84, R * 0.92, R * 0.18); c.fillStyle = grad(c, 0, -R * 0.45, 0, R * 0.47, ['#8a5a32', '#6a4224']); c.fill(); linha(c, R * 0.045);
        caixa(c, -R * 0.42, -R * 0.45, R * 0.84, R * 0.42, R * 0.16); c.fillStyle = '#7a4e2a'; c.fill(); linha(c, R * 0.03);
        c.fillStyle = '#c9a24a'; c.fillRect(-R * 0.06, -R * 0.08, R * 0.12, R * 0.08);
        for (const sx of [-0.22, 0.22]) { c.fillStyle = '#4a2c18'; c.fillRect(sx * R - R * 0.04, -R * 0.45, R * 0.08, R * 0.92); }
        caixa(c, -R * 0.55, -R * 0.72, R * 1.1, R * 0.26, R * 0.13); c.fillStyle = grad(c, 0, -R * 0.72, 0, -R * 0.46, ['#8a9a6a', '#5a6a42']); c.fill(); linha(c, R * 0.035);
      },
    },
    tripe: {
      n: 'Panela no tripé', g: 'viagem', size: 1, fogo: true, luz: { bright: 3, dim: 6, c: '#ff9d4d' },
      draw(c, R, t, s, ang) {
        sombra(c, R, 0.85, 0.8, 0.05, 0.06);
        c.fillStyle = radial(c, 0, 0, R * 0.6, ['#2a1408', '#1a0d06', 'rgba(26,13,6,0)']); c.beginPath(); c.arc(0, 0, R * 0.62, 0, TAU); c.fill();
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; pedrinha(c, Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, R * 0.14, s + i); }
        for (let i = 0; i < 8; i++) brasa(c, (hsh(s, i, 1) - 0.5) * R * 0.6, (hsh(s, i, 2) - 0.5) * R * 0.6, R * 0.05, t, i);
        chama(c, -R * 0.12, R * 0.16, R * 0.5, t, s + 1, ang); chama(c, R * 0.14, R * 0.18, R * 0.45, t, s + 2, ang);
        // o tripé (as três pernas), a corrente e a panela com o ensopado
        c.strokeStyle = MAD.esc; c.lineWidth = R * 0.07; c.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i / 3 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95); c.stroke(); }
        c.fillStyle = radial(c, -R * 0.08, -R * 0.08, R * 0.36, ['#4a4c52', '#26272b', '#111214']); c.beginPath(); c.arc(0, 0, R * 0.3, 0, TAU); c.fill(); linha(c, R * 0.035);
        c.fillStyle = radial(c, 0, 0, R * 0.24, ['#c08a4a', '#8a5a2a', '#5a3a1a']); c.beginPath(); c.arc(0, 0, R * 0.22, 0, TAU); c.fill();
        c.fillStyle = '#e8d8a0'; c.beginPath(); c.arc(-R * 0.06, R * 0.04, R * 0.04, 0, TAU); c.arc(R * 0.08, -R * 0.06, R * 0.035, 0, TAU); c.fill();
      },
    },
    lenha: {
      n: 'Lenha empilhada', g: 'viagem', size: 1,
      draw(c, R, t, s) {
        sombra(c, R, 0.86, 0.72, 0.06, 0.1);
        const tora = (x, y, l, r, k) => {
          caixa(c, x - l / 2, y - r, l, r * 2, r); c.fillStyle = grad(c, 0, y - r, 0, y + r, [MAD.cla, MAD.med, MAD.esc]); c.fill(); linha(c, R * 0.025);
          c.strokeStyle = 'rgba(40,22,8,0.4)'; c.lineWidth = R * 0.015; c.beginPath(); c.moveTo(x - l * 0.35, y - r * 0.3); c.lineTo(x + l * 0.3, y - r * 0.2); c.stroke();
          c.fillStyle = '#d8a868'; c.beginPath(); c.ellipse(x + l / 2 - r * 0.2, y, r * 0.3, r * 0.92, 0, 0, TAU); c.fill(); linha(c, R * 0.015);
          c.strokeStyle = 'rgba(120,70,30,0.6)'; c.beginPath(); c.ellipse(x + l / 2 - r * 0.2, y, r * 0.15, r * 0.5, 0, 0, TAU); c.stroke();
        };
        for (let i = 0; i < 4; i++) tora(-R * 0.1 + (hsh(s, i, 1) - 0.5) * R * 0.15, -R * 0.5 + i * R * 0.28, R * 1.3, R * 0.13, s + i);
        for (let i = 0; i < 2; i++) tora(R * 0.05, -R * 0.36 + i * R * 0.28, R * 1.1, R * 0.13, s + i + 9);
        // o machado cravado no cepo, ao lado
        c.fillStyle = radial(c, R * 0.6, R * 0.6, R * 0.3, ['#c9905a', '#8a5a2a', '#5a3a1a']); c.beginPath(); c.arc(R * 0.62, R * 0.66, R * 0.24, 0, TAU); c.fill(); linha(c, R * 0.03);
        c.strokeStyle = MAD.esc; c.lineWidth = R * 0.05; c.lineCap = 'round'; c.beginPath(); c.moveTo(R * 0.62, R * 0.66); c.lineTo(R * 0.3, R * 0.95); c.stroke();
        c.fillStyle = FER.luz; c.beginPath(); c.moveTo(R * 0.55, R * 0.58); c.lineTo(R * 0.75, R * 0.5); c.lineTo(R * 0.72, R * 0.74); c.closePath(); c.fill(); linha(c, R * 0.02);
      },
    },
    bote: {
      n: 'Bote', g: 'viagem', size: 2,
      draw(c, R, t, s) {
        sombra(c, R, 0.6, 0.95, 0.06, 0.06);
        const casco = k => { c.beginPath(); c.moveTo(0, -R * 0.95 * k); c.quadraticCurveTo(R * 0.5 * k, -R * 0.55 * k, R * 0.48 * k, -R * 0.05 * k); c.lineTo(R * 0.4 * k, R * 0.86 * k); c.lineTo(-R * 0.4 * k, R * 0.86 * k); c.lineTo(-R * 0.48 * k, -R * 0.05 * k); c.quadraticCurveTo(-R * 0.5 * k, -R * 0.55 * k, 0, -R * 0.95 * k); c.closePath(); };
        // os remos, para fora dos dois lados
        for (const sx of [-1, 1]) { c.strokeStyle = MAD.cla; c.lineWidth = R * 0.05; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx * R * 0.3, R * 0.1); c.lineTo(sx * R * 0.95, R * 0.45); c.stroke(); c.fillStyle = MAD.cla; c.beginPath(); c.ellipse(sx * R * 0.92, R * 0.43, R * 0.14, R * 0.06, sx * 0.5, 0, TAU); c.fill(); linha(c, R * 0.02); }
        casco(1); c.fillStyle = grad(c, -R * 0.5, 0, R * 0.5, 0, [MAD.med, MAD.cla, MAD.med]); c.fill(); linha(c, R * 0.06);
        casco(0.86); c.fillStyle = grad(c, 0, -R, 0, R, [tom(MAD.med, -0.1), MAD.esc]); c.fill();
        c.save(); casco(0.86); c.clip(); c.strokeStyle = 'rgba(20,10,4,0.4)'; c.lineWidth = R * 0.02; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * R * 0.11, -R); c.lineTo(i * R * 0.11, R); c.stroke(); } c.restore();
        for (const y of [-R * 0.1, R * 0.48]) { caixa(c, -R * 0.42, y - R * 0.07, R * 0.84, R * 0.14, R * 0.03); c.fillStyle = MAD.luz; c.fill(); linha(c, R * 0.02); }
        c.strokeStyle = '#a08a5c'; c.lineWidth = R * 0.03; c.beginPath(); c.arc(0, -R * 0.62, R * 0.1, 0, TAU); c.stroke();
      },
    },
    // (lote 7) os marcadores de passagem: levam a outra cena (dois cliques, só para o mestre); nascem ocultos dos jogadores
    entrada: { n: 'Entrada', g: 'perigo', size: 1, passagem: 'entra', draw(c, R) { marcaPassagem(c, R, true); } },
    saida: { n: 'Saída', g: 'perigo', size: 1, passagem: 'sai', draw(c, R) { marcaPassagem(c, R, false); } },
    // (lote 7, parte 4b) os marcadores do encontro gerado: só do mestre (nascem ocultos)
    chegada: { n: 'Chegada', g: 'perigo', size: 1, marca: true, draw(c, R) { marcaEncontro(c, R, true); } },
    emboscada: { n: 'Emboscada', g: 'perigo', size: 1, marca: true, draw(c, R) { marcaEncontro(c, R, false); } },
    // (lote 13) o ponto de interesse da Região livre: só do mestre (nasce oculto), com o nome do que há ali
    interesse: { n: 'Ponto de interesse', g: 'perigo', size: 1, marca: true, draw(c, R) { marcaInteresse(c, R); } },
    // (lote 13, parte 13c) o achado raro (a Região livre e o Encontro): só do mestre (nasce oculto), com o nome do que é
    achado: { n: 'Achado raro', g: 'perigo', size: 1, marca: true, draw(c, R) { marcaAchado(c, R); } },
    // (lote 22) o ponto de reforço: só do mestre (nasce oculto); guarda tokens que nascem dele numa rodada, numa fase ou na hora
    reforco: { n: 'Ponto de reforço', g: 'perigo', size: 1, marca: true, draw(c, R) { marcaReforco(c, R); } },
  };
  const ORDER = Object.keys(P);

  // Desenha o objeto do token t (já sabendo que ele é um objeto) no lugar dele, girado. tm: o tempo, em segundos.
  function draw(c, t, sc, tm) {
    const def = P[t.prop];
    if (!def) return;
    const s = t.size * sc.cell, R = s / 2, ang = rad(t.rot || 0), semente = (hashStr(t.id) % 997) + 1;
    c.save();
    c.translate(t.x + R, t.y + R); c.rotate(ang);
    def.draw(c, R, tm, semente, ang, t);
    c.restore();
  }
  // Miniatura para a escolha do objeto
  function thumb(cv, id, tm) {
    const def = P[id], g = cv.getContext('2d'), w = cv.width;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, cv.height);
    if (!def) return;
    g.save(); g.translate(w / 2, cv.height / 2);
    def.draw(g, w * 0.46, tm || 1.3, 7, 0);
    g.restore();
  }
  const isProp = t => !!t && !!t.prop && !!P[t.prop];
  // Algum objeto com fogo na cena? (o mapa fica se mexendo, para as chamas tremularem)
  const temFogo = sc => sc.tokens.some(t => t.prop && P[t.prop] && P[t.prop].fogo && !t.hidden);
  /* Um token novo para o objeto `id`, em (x, y): sem barras, sem nome à mostra, sem visão; a luz, se o objeto tem
     uma, já acesa e tremulando. */
  function novo(sc, id, x, y, size, hidden) {
    const def = P[id];
    // (o marcador de passagem é do mestre: nasce sempre oculto dos jogadores)
    const t = newToken(sc, x, y, { name: def.n, size: size || def.size || 1, shape: 'quad', bars: [], barVis: 'none', showName: false, prop: id, rot: 0, hidden: !!hidden || !!def.passagem || !!def.marca });
    t.vis = { on: false, range: 0, dark: 0 };
    t.color = '#3a3226';
    if (def.luz) t.light = Object.assign({ on: true, bright: def.luz.bright, dim: def.luz.dim, c: def.luz.c }, def.calma ? {} : { fl: true });          // (lote 39: o cristal brilha parado)
    return t;
  }
  return { P, G, ORDER, draw, thumb, isProp, temFogo, novo, coresDe };
})();
