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

  /* ---- O catálogo ---- */
  const G = [
    { id: 'luz', n: 'Luzes' },
    { id: 'movel', n: 'Móveis e baús' },
    { id: 'natureza', n: 'Natureza' },
    { id: 'perigo', n: 'Perigos e marcos' },
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
    // (lote 7) os marcadores de passagem: levam a outra cena (dois cliques, só para o mestre); nascem ocultos dos jogadores
    entrada: { n: 'Entrada', g: 'perigo', size: 1, passagem: 'entra', draw(c, R) { marcaPassagem(c, R, true); } },
    saida: { n: 'Saída', g: 'perigo', size: 1, passagem: 'sai', draw(c, R) { marcaPassagem(c, R, false); } },
  };
  const ORDER = Object.keys(P);

  // Desenha o objeto do token t (já sabendo que ele é um objeto) no lugar dele, girado. tm: o tempo, em segundos.
  function draw(c, t, sc, tm) {
    const def = P[t.prop];
    if (!def) return;
    const s = t.size * sc.cell, R = s / 2, ang = rad(t.rot || 0), semente = (hashStr(t.id) % 997) + 1;
    c.save();
    c.translate(t.x + R, t.y + R); c.rotate(ang);
    def.draw(c, R, tm, semente, ang);
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
    const t = newToken(sc, x, y, { name: def.n, size: size || def.size || 1, shape: 'quad', bars: [], barVis: 'none', showName: false, prop: id, rot: 0, hidden: !!hidden || !!def.passagem });
    t.vis = { on: false, range: 0, dark: 0 };
    t.color = '#3a3226';
    if (def.luz) t.light = { on: true, bright: def.luz.bright, dim: def.luz.dim, c: def.luz.c, fl: true };
    return t;
  }
  return { P, G, ORDER, draw, thumb, isProp, temFogo, novo };
})();
