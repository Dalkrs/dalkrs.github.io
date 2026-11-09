/* ---------------------------------------------------------------
   6b5. OS OBJETOS COMPRIDOS (lote 121) — a cama, a estante, a mesa, o banco, o tapete, o balcão, o cocho, o tronco
   caído, a mesa de tortura, a lareira e a mesa comprida deixam de ser um quadrado de 2 × 2 com o desenho no meio: cada
   um tem a largura e o comprimento dele (fw × fh, em quadrados, de pé) e o desenho enche o retângulo que ele ocupa. A
   cama de solteiro (1 × 2) é do tamanho de um token deitado; a estante e o armário (2 × 1) ficam rentes à parede, sem
   vão atrás. E os novos: a cama de casal (2 × 2), o armário (abre e fecha, e dá para se esconder dentro) e a mesa de
   banquete (4 × 2). O mestre muda as medidas no painel do objeto.
   Cada desenho recebe R (a meia largura) e B (o meio comprimento): o retângulo vai de (−R, −B) a (R, B), de pé — as
   costas (o lado que vai na parede: a cabeceira da cama, o fundo da estante, a chaminé da lareira) ficam em cima.
   size: o lado do quadrado de antes (o que os geradores ainda pedem); fw × fh: as medidas de quem põe à mão.
   legado: a fração do quadrado que o desenho de antes ocupava (para encaixar os objetos das cenas de antes e os que os
   geradores pedem num quadrado — ver Props.encaixar).
   --------------------------------------------------------------- */
(() => {
  const { caixa, linha, grad, radial, hsh, MAD, PED, FER, tabua, chama, brasa } = Props.kit;
  const est = Props.kit.est;
  const reg = (id, def) => Props.registrar(id, def);
  const CONT = 'rgba(14,10,6,0.85)';
  // a sombra do retângulo no chão (a luz vem do alto, à esquerda)
  const sombraR = (c, R, B, m) => { c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; caixa(c, -R + m * 0.1, -B + m * 0.12, R * 2 - m * 0.06, B * 2 - m * 0.08, m * 0.12); c.fill(); c.restore(); };
  const base = (def, id) => Object.assign({}, Props.P[id] || {}, def);
  const PANOS = [['#a8473a', '#7d2f27', '#c8705f'], ['#3f5f8a', '#2c4566', '#6d8db5'], ['#5d7a3e', '#41592a', '#86a35f'], ['#7a5a8a', '#583f66', '#a184b0']];

  /* ---------- a cama (solteiro, 1 × 2) e a de casal (2 × 2) ---------- */
  function cama(c, R, t, s, ang, tk, B) {
    B = B || R;
    const m = Math.min(R, B), mg = m * 0.06, x = -R + mg, y = -B + mg, w = R * 2 - mg * 2, h = B * 2 - mg * 2, pano = PANOS[s % PANOS.length];
    sombraR(c, R, B, m);
    caixa(c, x, y, w, h, m * 0.1); c.fillStyle = grad(c, x, 0, x + w, 0, [MAD.cla, MAD.med]); c.fill(); linha(c, m * 0.08);
    // a cabeceira (na parede) e o lençol
    caixa(c, x, y, w, m * 0.22, m * 0.08); c.fillStyle = grad(c, 0, y, 0, y + m * 0.22, [MAD.cla, MAD.esc]); c.fill(); linha(c, m * 0.05);
    caixa(c, x + m * 0.1, y + m * 0.24, w - m * 0.2, h - m * 0.32, m * 0.12); c.fillStyle = '#e9e0cf'; c.fill();
    // os travesseiros (dois na de casal)
    const n = w / h > 0.75 ? 2 : 1, pw = (w - m * 0.3) / n - m * 0.08;
    for (let i = 0; i < n; i++) {
      const px = x + m * 0.15 + i * (pw + m * 0.08);
      caixa(c, px, y + m * 0.32, pw, m * 0.62, m * 0.2); c.fillStyle = radial(c, px + pw / 2, y + m * 0.6, pw * 0.7, ['#ffffff', '#e2dccf']); c.fill(); linha(c, m * 0.04, 'rgba(90,80,60,0.6)');
    }
    // o cobertor, com a dobra
    const yc = y + m * 1.08, hc = y + h - m * 0.08 - yc;
    if (hc > m * 0.3) {
      caixa(c, x + m * 0.1, yc, w - m * 0.2, hc, m * 0.14); c.fillStyle = grad(c, 0, yc, 0, yc + hc, [pano[0], pano[1]]); c.fill();
      caixa(c, x + m * 0.1, yc, w - m * 0.2, m * 0.24, m * 0.1); c.fillStyle = pano[2]; c.fill();
      c.strokeStyle = 'rgba(255,220,200,0.22)'; c.lineWidth = m * 0.04;
      for (let k = 1, nk = Math.max(2, Math.round(hc / (m * 0.45))); k < nk; k++) { const yy = yc + m * 0.24 + (hc - m * 0.24) * k / nk; c.beginPath(); c.moveTo(x + m * 0.18, yy); c.lineTo(x + w - m * 0.18, yy); c.stroke(); }
    }
    caixa(c, x, y, w, h, m * 0.1); linha(c, m * 0.08);
  }
  reg('cama', base({ n: 'Cama', g: 'movel', size: 2, fw: 1, fh: 2, costas: 'n', legado: { w: 0.55, h: 0.93 }, esconde: 'debaixo da cama', draw: cama }, 'cama'));
  reg('camaCasal', { n: 'Cama de casal', g: 'movel', size: 2, fw: 2, fh: 2, costas: 'n', esconde: 'debaixo da cama', draw: cama });

  /* ---------- a estante (2 × 1), rente à parede ---------- */
  reg('estante', base({
    n: 'Estante', g: 'movel', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 0.95, h: 0.31 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R;
      const m = Math.min(R, B), x = -R + m * 0.04, y = -B, w = R * 2 - m * 0.08, h = Math.min(B * 2, m * 1.25);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x + m * 0.06, y + m * 0.08, w, h); c.restore();
      caixa(c, x, y, w, h, m * 0.06); c.fillStyle = MAD.esc; c.fill(); linha(c, m * 0.08);
      // as lombadas, viradas para a frente (para baixo); uma divisória a cada quadrado
      const cores = ['#7d2f27', '#2f5a7d', '#3d6b3a', '#a0782a', '#5a3d7d', '#8a4a2a', '#2a5a5a', '#9a3a4a'];
      let bx = x + m * 0.1;
      for (let i = 0; bx < x + w - m * 0.14; i++) {
        const bw = m * (0.16 + hsh(s, i, 1) * 0.13), bh = h * (0.55 + hsh(s, i, 2) * 0.3), lw = Math.min(bw, x + w - m * 0.1 - bx);
        if (hsh(s, i, 7) < 0.08) { bx += bw * 1.6; continue; }                 // um vão na prateleira
        c.fillStyle = cores[Math.floor(hsh(s, i, 3) * cores.length)];
        c.fillRect(bx, y + h - m * 0.1 - bh, lw, bh);
        c.fillStyle = 'rgba(255,230,160,0.35)'; c.fillRect(bx + lw * 0.25, y + h - m * 0.1 - bh * 0.7, lw * 0.5, m * 0.04);
        bx += bw + m * 0.02;
      }
      c.fillStyle = MAD.esc;
      for (let k = 1, n = Math.round(R / m); k < n; k++) c.fillRect(x + w * k / n - m * 0.04, y, m * 0.08, h);
      caixa(c, x, y, w, h, m * 0.06); linha(c, m * 0.08);
    },
  }, 'estante'));

  /* ---------- o armário (2 × 1): abre e fecha; dá para se esconder dentro ---------- */
  reg('armario', {
    n: 'Armário', g: 'movel', size: 2, fw: 2, fh: 1, costas: 'n', esconde: 'dentro do armário', estados: [['fechado', 'Fechado'], ['aberto', 'Aberto']],
    draw(c, R, t, s, ang, tk, B) {
      B = B || R;
      const m = Math.min(R, B), x = -R + m * 0.04, y = -B, w = R * 2 - m * 0.08, h = Math.min(B * 2 - m * 0.06, m * 1.6);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.32)'; c.fillRect(x + m * 0.08, y + m * 0.1, w, h); c.restore();
      caixa(c, x, y, w, h, m * 0.06); c.fillStyle = grad(c, x, y, x, y + h, [MAD.cla, MAD.med]); c.fill(); linha(c, m * 0.08);
      if (est() === 'aberto') {
        // por dentro: o escuro, a vara e as roupas penduradas; as portas abertas para a frente
        caixa(c, x + m * 0.12, y + m * 0.1, w - m * 0.24, h - m * 0.25, m * 0.04); c.fillStyle = '#1a120b'; c.fill();
        c.strokeStyle = FER.cla; c.lineWidth = m * 0.05; c.beginPath(); c.moveTo(x + m * 0.2, y + h * 0.4); c.lineTo(x + w - m * 0.2, y + h * 0.4); c.stroke();
        const roupas = ['#6b2f2a', '#2f4f6b', '#5a5a3a', '#4a2f5a', '#7a6a4a'];
        for (let i = 0, n = Math.max(3, Math.round(w / (m * 0.4))); i < n; i++) { const rx = x + m * 0.3 + (w - m * 0.6) * i / Math.max(1, n - 1); c.fillStyle = roupas[(s + i) % roupas.length]; caixa(c, rx - m * 0.12, y + h * 0.4, m * 0.24, h * 0.45, m * 0.05); c.fill(); }
        // as portas abertas: duas folhas curtas, abertas para a frente
        for (const sx of [-1, 1]) { const L2 = Math.min(w / 2, m * 0.9); c.save(); c.translate(sx < 0 ? x : x + w, y + h); c.rotate(sx * 0.6); caixa(c, sx < 0 ? 0 : -L2, -m * 0.07, L2, m * 0.14, m * 0.03); c.fillStyle = MAD.med; c.fill(); linha(c, m * 0.04); c.restore(); }
      } else {
        // as duas portas, com os puxadores
        c.strokeStyle = CONT; c.lineWidth = m * 0.05; c.beginPath(); c.moveTo(0, y + m * 0.08); c.lineTo(0, y + h - m * 0.08); c.stroke();
        for (const sx of [-1, 1]) {
          caixa(c, sx < 0 ? x + m * 0.14 : m * 0.1, y + m * 0.14, w / 2 - m * 0.24, h - m * 0.28, m * 0.05); c.strokeStyle = 'rgba(40,22,8,0.45)'; c.lineWidth = m * 0.04; c.stroke();
          c.fillStyle = '#d6a64a'; c.beginPath(); c.arc(sx * m * 0.14, y + h * 0.55, m * 0.06, 0, TAU); c.fill(); linha(c, m * 0.02);
        }
      }
    },
  });

  /* ---------- a mesa (2 × 1; as de antes, 2 × 2) e a mesa de banquete (4 × 2) ---------- */
  function mesa(c, R, t, s, ang, tk, B, banquete) {
    B = B || R;
    const m = Math.min(R, B), mg = m * 0.12, x = -R + mg, y = -B + mg, w = R * 2 - mg * 2, h = B * 2 - mg * 2, deitada = w >= h;
    sombraR(c, R, B, m);
    caixa(c, x, y, w, h, m * 0.1); c.fillStyle = MAD.med; c.fill();
    const n = Math.max(3, Math.round((deitada ? h : w) / (m * 0.32)));
    for (let i = 0; i < n; i++) {
      if (deitada) tabua(c, x + m * 0.04, y + m * 0.04 + i * (h - m * 0.08) / n, w - m * 0.08, (h - m * 0.08) / n - m * 0.015, s + i);
      else tabua(c, x + m * 0.04 + i * (w - m * 0.08) / n, y + m * 0.04, (w - m * 0.08) / n - m * 0.015, h - m * 0.08, s + i);
    }
    if (banquete) {
      // a toalha no meio, de ponta a ponta, e os castiçais
      c.save(); c.globalAlpha = 0.92;
      if (deitada) { caixa(c, x - m * 0.04, -h * 0.28, w + m * 0.08, h * 0.56, m * 0.05); } else { caixa(c, -w * 0.28, y - m * 0.04, w * 0.56, h + m * 0.08, m * 0.05); }
      c.fillStyle = '#efe6d2'; c.fill(); c.strokeStyle = '#c9a24a'; c.lineWidth = m * 0.04; c.stroke(); c.restore();
    }
    caixa(c, x, y, w, h, m * 0.1); linha(c, m * 0.07);
    // os pratos e as canecas, um lugar a cada quadrado (dos dois lados compridos)
    const L = deitada ? w : h, k = Math.max(1, Math.round(L / (m * 2)));
    for (let i = 0; i < k; i++) for (const lado of (deitada ? h : w) >= m * 2.6 || banquete ? [-1, 1] : [hsh(s, i, 9) < 0.5 ? -1 : 1]) {
      if (!banquete && hsh(s, i * 2 + lado, 4) < 0.35) continue;
      const a = -L / 2 + L * (i + 0.5) / k, b = lado * ((deitada ? h : w) / 2 - m * 0.42), px = deitada ? a : b, py = deitada ? b : a;
      c.fillStyle = '#d9d2c2'; c.beginPath(); c.arc(px, py, m * 0.26, 0, TAU); c.fill(); linha(c, m * 0.03, 'rgba(60,50,40,0.7)');
      c.fillStyle = hsh(s, i, lado + 3) < 0.5 ? '#c4bba8' : '#9a6a3a'; c.beginPath(); c.arc(px, py, m * 0.15, 0, TAU); c.fill();
      if (hsh(s, i, lado + 5) < 0.6) { const qx = px + (deitada ? m * 0.36 : 0), qy = py + (deitada ? 0 : m * 0.36); c.fillStyle = MAD.esc; c.beginPath(); c.arc(qx, qy, m * 0.13, 0, TAU); c.fill(); linha(c, m * 0.03); c.fillStyle = '#6b3a12'; c.beginPath(); c.arc(qx, qy, m * 0.08, 0, TAU); c.fill(); }
    }
    if (banquete) for (let i = 1; i < k; i++) { const a = -L / 2 + L * i / k, px = deitada ? a : 0, py = deitada ? 0 : a; c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(px, py, m * 0.12, 0, TAU); c.fill(); linha(c, m * 0.03); chama(c, px, py, m * 0.2, t, s + i, ang); }
  }
  reg('mesa', base({ n: 'Mesa', g: 'movel', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 1 }, draw: (c, R, t, s, a, tk, B) => mesa(c, R, t, s, a, tk, B, false) }, 'mesa'));
  reg('mesaBanquete', { n: 'Mesa de banquete', g: 'movel', size: 4, fw: 4, fh: 2, draw: (c, R, t, s, a, tk, B) => mesa(c, R, t, s, a, tk, B, true) });

  /* ---------- o banco (2 × 1; os de antes, 1 × 1) ---------- */
  reg('banco', base({
    n: 'Banco', g: 'movel', size: 1, fw: 2, fh: 1, legado: { w: 1, h: 1 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R;
      const m = Math.min(R, B), d = B * 0.76;
      c.save(); c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(-R * 0.98, -d * 0.4, R * 1.96, d * 1.05); c.restore();
      for (const xx of [-R + m * 0.38, R - m * 0.38]) { caixa(c, xx - m * 0.09, -d * 0.63, m * 0.18, d * 1.26, m * 0.04); c.fillStyle = MAD.esc; c.fill(); }
      if (R / m > 1.6) { caixa(c, -m * 0.09, -d * 0.63, m * 0.18, d * 1.26, m * 0.04); c.fillStyle = MAD.esc; c.fill(); }
      tabua(c, -R, -d * 0.5, R * 2, d * 0.49, s);
      tabua(c, -R, d * 0.01, R * 2, d * 0.49, s + 1);
      c.strokeStyle = CONT; c.lineWidth = m * 0.045; c.beginPath(); c.moveTo(-R, -d * 0.5); c.lineTo(R, -d * 0.5); c.moveTo(-R, d * 0.5); c.lineTo(R, d * 0.5); c.stroke();
    },
  }, 'banco'));

  /* ---------- o tapete (3 × 2; os de antes, do tamanho que eram) ---------- */
  reg('tapete', base({
    n: 'Tapete', g: 'movel', size: 2, fw: 3, fh: 2, legado: { w: 1, h: 1 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R;
      const m = Math.min(R, B), w = R * 2 - m * 0.16, hh = B * 2 - m * 0.16, pal = [['#7a2430', '#c8963e', '#2a3c5c'], ['#244a5c', '#d9b25a', '#6b2f2a'], ['#5b3a1f', '#e0c27a', '#2f4f3a']][s % 3];
      c.save(); c.globalAlpha = 0.96;
      caixa(c, -w / 2, -hh / 2, w, hh, m * 0.04); c.fillStyle = pal[0]; c.fill();
      c.strokeStyle = pal[1]; c.lineWidth = m * 0.07; c.strokeRect(-w / 2 + m * 0.14, -hh / 2 + m * 0.14, w - m * 0.28, hh - m * 0.28);
      c.lineWidth = m * 0.03; c.strokeRect(-w / 2 + m * 0.26, -hh / 2 + m * 0.26, w - m * 0.52, hh - m * 0.52);
      // o medalhão do meio e as franjas nas pontas (as do lado comprido)
      c.fillStyle = pal[2]; c.beginPath(); c.moveTo(0, -hh * 0.3); c.lineTo(w * 0.22, 0); c.lineTo(0, hh * 0.3); c.lineTo(-w * 0.22, 0); c.closePath(); c.fill();
      c.strokeStyle = pal[1]; c.lineWidth = m * 0.035; c.stroke();
      c.fillStyle = pal[1]; c.beginPath(); c.arc(0, 0, m * 0.08, 0, TAU); c.fill();
      c.strokeStyle = '#e8dcc0'; c.lineWidth = m * 0.025;
      if (w >= hh) { for (let y = -hh / 2 + m * 0.06; y < hh / 2; y += m * 0.1) for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * w / 2, y); c.lineTo(sx * (w / 2 + m * 0.07), y); c.stroke(); } }
      else { for (let x = -w / 2 + m * 0.06; x < w / 2; x += m * 0.1) for (const sy of [-1, 1]) { c.beginPath(); c.moveTo(x, sy * hh / 2); c.lineTo(x, sy * (hh / 2 + m * 0.07)); c.stroke(); } }
      c.restore();
    },
  }, 'tapete'));

  /* ---------- o balcão (2 × 1; os de antes, 1 × 1, em fileira) ---------- */
  reg('balcao', base({
    n: 'Balcão', g: 'movel', size: 1, fw: 2, fh: 1, legado: { w: 1, h: 1 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R;
      const m = Math.min(R, B), d = B * 0.78;
      c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-R, -d * 0.8, R * 2, d * 2); c.restore();
      c.fillStyle = MAD.esc; c.fillRect(-R, -d, R * 2, d * 2);
      for (let i = 0; i < 4; i++) tabua(c, -R, -d + m * 0.04 + i * d * 0.37, R * 2, d * 0.35, s + i, { esc: MAD.esc, med: '#8a5a2e', cla: '#b07a44', luz: MAD.luz });
      c.fillStyle = grad(c, 0, d * 0.54, 0, d, ['#5e3a1c', '#2e1a0b']); c.fillRect(-R, d * 0.54, R * 2, d * 0.46);
      c.fillStyle = 'rgba(255,225,170,0.18)'; c.fillRect(-R, -d, R * 2, m * 0.05);
      c.strokeStyle = CONT; c.lineWidth = m * 0.05; c.beginPath(); c.moveTo(-R, -d); c.lineTo(R, -d); c.moveTo(-R, d); c.lineTo(R, d); c.stroke();
      // as canecas em cima
      for (let i = 0, n = Math.max(1, Math.round(R / m)); i < n; i++) {
        if (hsh(s, i, 3) < 0.45) continue;
        const x = -R + (R * 2) * (i + 0.3 + hsh(s, i, 1) * 0.4) / n;
        c.fillStyle = '#d9d2c2'; c.beginPath(); c.arc(x, -d * 0.25, m * 0.16, 0, TAU); c.fill(); linha(c, m * 0.03, 'rgba(60,50,40,0.7)');
        c.fillStyle = '#6b3a12'; c.beginPath(); c.arc(x, -d * 0.25, m * 0.09, 0, TAU); c.fill();
      }
    },
  }, 'balcao'));

  /* ---------- o cocho, o tronco caído e a mesa de tortura ---------- */
  reg('cocho', base({
    n: 'Cocho', g: 'movel', size: 2, fw: 2, fh: 1, legado: { w: 0.94, h: 0.36 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R;
      const m = Math.min(R, B), w = R * 2 - m * 0.16, h = B * 2 * 0.8;
      sombraR(c, R, B * 0.85, m);
      caixa(c, -w / 2, -h / 2, w, h, m * 0.16); c.fillStyle = MAD.med; c.fill(); linha(c, m * 0.08);
      const agua = s % 2 === 0;
      caixa(c, -w / 2 + m * 0.18, -h / 2 + m * 0.18, w - m * 0.36, h - m * 0.36, m * 0.1);
      c.fillStyle = agua ? grad(c, 0, -h / 2, 0, h / 2, ['#5d93b8', '#3a6a8c']) : grad(c, 0, -h / 2, 0, h / 2, ['#d8b65a', '#a8862f']); c.fill();
      if (agua) { c.strokeStyle = 'rgba(230,245,255,0.45)'; c.lineWidth = m * 0.05; c.beginPath(); c.moveTo(-w * 0.25, -m * 0.08); c.lineTo(-w * 0.1, -m * 0.08); c.moveTo(w * 0.1, m * 0.1); c.lineTo(w * 0.28, m * 0.1); c.stroke(); }
    },
  }, 'cocho'));
  reg('tronco', base({
    n: 'Tronco caído', g: 'natureza', size: 2, fw: 2, fh: 1, legado: { w: 0.9, h: 0.25 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R;
      const deitado = R >= B, L = (deitado ? R : B) * 2 * 0.96, e = Math.min(R, B) * 2 * 0.62;
      c.save(); if (!deitado) c.rotate(Math.PI / 2);
      const m = e / 1.24, w = L, h = e, x = -w / 2, y = -h / 2;
      c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(m * 0.06, m * 0.14, w / 2, h / 2, 0, 0, TAU); c.fill(); c.restore();
      caixa(c, x, y, w, h, h * 0.5); c.fillStyle = grad(c, 0, y, 0, y + h, ['#7a5230', '#5a3a1e', '#3d2712']); c.fill();
      c.save(); caixa(c, x, y, w, h, h * 0.5); c.clip();
      c.strokeStyle = 'rgba(25,14,5,0.55)'; c.lineWidth = m * 0.05;
      for (let i = 0, n = Math.round(w / (m * 0.4)); i < n; i++) { const xx = x + w * (0.05 + i / n); c.beginPath(); c.moveTo(xx, y); c.bezierCurveTo(xx + m * 0.1, y + h * 0.3, xx - m * 0.1, y + h * 0.7, xx + m * 0.03, y + h); c.stroke(); }
      c.restore();
      caixa(c, x, y, w, h, h * 0.5); linha(c, m * 0.06);
      c.fillStyle = '#d9b07a'; c.beginPath(); c.ellipse(x + w - h * 0.3, 0, h * 0.28, h * 0.48, 0, 0, TAU); c.fill(); linha(c, m * 0.04);
      c.strokeStyle = 'rgba(120,80,40,0.7)'; c.lineWidth = m * 0.03;
      for (const k of [0.33, 0.66]) { c.beginPath(); c.ellipse(x + w - h * 0.3, 0, h * 0.28 * k, h * 0.48 * k, 0, 0, TAU); c.stroke(); }
      c.fillStyle = 'rgba(110,160,80,0.6)'; c.beginPath(); c.ellipse(x + w * 0.3, y + h * 0.3, m * 0.4, m * 0.14, 0, 0, TAU); c.fill();
      c.restore();
    },
  }, 'tronco'));
  const tortura0 = Props.P.mesaTortura && Props.P.mesaTortura.draw;
  if (tortura0) reg('mesaTortura', base({
    fw: 1, fh: 2, legado: { w: 0.475, h: 0.85 },
    // o desenho de antes (pensado para 0,95 × 1,7 de um quadrado de lado 2R), esticado para o retângulo
    draw(c, R, t, s, ang, tk, B) { B = B || R; c.save(); c.scale((R * 2 * 0.9) / (0.95 * B), (B * 2 * 0.9) / (1.7 * B)); tortura0(c, B, t, s, ang, tk); c.restore(); },
  }, 'mesaTortura'));

  /* ---------- a lareira (2 × 1), a chaminé na parede ---------- */
  reg('lareira', base({
    fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R;
      const m = Math.min(R, B), x = -R + m * 0.04, w = R * 2 - m * 0.08, y = -B;
      c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x + m * 0.08, y + m * 0.1, w, B * 1.7); c.restore();
      // o corpo de pedra (encostado na parede, em cima) e a boca do fogo, virada para baixo
      caixa(c, x, y, w, B * 1.45, m * 0.08); c.fillStyle = grad(c, 0, y, 0, y + B * 1.45, [PED.cla, PED.med]); c.fill(); linha(c, m * 0.07);
      for (let j = 0; j < 3; j++) for (let i = 0, n = Math.round(w / (m * 0.42)); i < n; i++) { c.fillStyle = `rgba(30,30,36,${0.12 + hsh(s, i, j) * 0.18})`; c.fillRect(x + m * 0.05 + i * (w / n) + (j % 2) * m * 0.18, y + m * 0.06 + j * m * 0.3, w / n - m * 0.06, m * 0.24); }
      const bw = Math.min(w * 0.62, m * 2.4), by = y + B * 0.5;
      caixa(c, -bw / 2, by, bw, B * 0.95, m * 0.1); c.fillStyle = PED.esc; c.fill(); linha(c, m * 0.06);
      c.fillStyle = '#160b05'; caixa(c, -bw / 2 + m * 0.14, by + m * 0.1, bw - m * 0.28, B * 0.95 - m * 0.2, m * 0.08); c.fill();
      for (let i = 0; i < 10; i++) brasa(c, -bw * 0.36 + hsh(s, i, 2) * bw * 0.72, by + B * 0.35 + hsh(s, i, 3) * B * 0.4, m * (0.06 + hsh(s, i, 4) * 0.05), t, i);
      chama(c, -bw * 0.12, by + B * 0.8, m * 0.5, t, s + 1, ang);
      chama(c, bw * 0.13, by + B * 0.78, m * 0.56, t, s + 2, ang);
      // a pedra da frente (o borralho)
      caixa(c, -bw / 2 - m * 0.16, B - m * 0.26, bw + m * 0.32, m * 0.22, m * 0.06); c.fillStyle = PED.med; c.fill(); linha(c, m * 0.05);
    },
  }, 'lareira'));

  /* ---------- (lote 121) a furtividade: a hera do muro, o bueiro e as marcas do mestre ---------- */
  Props.grupo('furtiv', 'Furtividade');
  // a hera que sobe o muro (as costas na parede, em cima): dá para escalar
  reg('hera', {
    n: 'Hera (dá para escalar)', g: 'furtiv', size: 1,
    draw(c, R, t, s) {
      c.strokeStyle = '#2f4a22'; c.lineWidth = R * 0.08; c.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const x0 = -R * 0.8 + k * R * 0.52;
        c.beginPath(); c.moveTo(x0, -R); for (let i = 1; i <= 5; i++) c.lineTo(x0 + Math.sin(i * 1.7 + s + k) * R * 0.18, -R + i * R * 0.3 * (0.6 + hsh(s, k, 1) * 0.5)); c.stroke();
      }
      for (let i = 0; i < 26; i++) {
        const x = (hsh(s, i, 2) - 0.5) * R * 1.8, y = -R + hsh(s, i, 3) * hsh(s, i, 4) * R * 1.7, r = R * (0.1 + hsh(s, i, 5) * 0.08);
        c.fillStyle = ['#3f6b2a', '#4f7f32', '#35592a', '#5d8c3a'][i % 4];
        c.beginPath(); c.ellipse(x, y, r, r * 0.7, hsh(s, i, 6) * 3, 0, TAU); c.fill();
      }
    },
  });
  // a grade do bueiro (o esgoto embaixo)
  reg('bueiro', {
    n: 'Bueiro', g: 'furtiv', size: 1,
    draw(c, R, t, s) {
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.arc(R * 0.05, R * 0.08, R * 0.8, 0, TAU); c.fill();
      c.fillStyle = grad(c, -R, -R, R, R, [FER.cla, FER.esc]); c.beginPath(); c.arc(0, 0, R * 0.78, 0, TAU); c.fill(); linha(c, R * 0.06);
      c.fillStyle = '#0c0d10'; c.beginPath(); c.arc(0, 0, R * 0.62, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.arc(0, 0, R * 0.62, 0, TAU); c.clip();
      c.strokeStyle = FER.med; c.lineWidth = R * 0.11;
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * R * 0.19, -R); c.lineTo(i * R * 0.19, R); c.stroke(); }
      c.restore();
    },
  });
  // as marcas do mestre (nascem ocultas): o esconderijo (ou o canto de sombra) e o alvo da missão
  reg('esconderijo', {
    n: 'Esconderijo', g: 'furtiv', size: 1, marca: true,
    draw(c, R) {
      c.fillStyle = 'rgba(20,24,36,0.82)'; c.beginPath(); c.arc(0, 0, R * 0.8, 0, TAU); c.fill();
      c.setLineDash([R * 0.18, R * 0.12]); c.strokeStyle = '#9fb3d9'; c.lineWidth = R * 0.08; c.stroke(); c.setLineDash([]);
      c.strokeStyle = '#d8e2f5'; c.lineWidth = R * 0.08; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-R * 0.45, 0); c.quadraticCurveTo(0, -R * 0.42, R * 0.45, 0); c.quadraticCurveTo(0, R * 0.42, -R * 0.45, 0); c.stroke();
      c.beginPath(); c.arc(0, 0, R * 0.14, 0, TAU); c.fillStyle = '#d8e2f5'; c.fill();
      c.strokeStyle = '#f0786e'; c.beginPath(); c.moveTo(-R * 0.45, -R * 0.38); c.lineTo(R * 0.45, R * 0.38); c.stroke();
    },
  });
  reg('alvoMissao', {
    n: 'Alvo da missão', g: 'furtiv', size: 1, marca: true,
    draw(c, R) {
      for (const [r, cor] of [[0.82, '#b8322a'], [0.6, '#f3ead2'], [0.38, '#b8322a'], [0.16, '#f3ead2']]) { c.fillStyle = cor; c.beginPath(); c.arc(0, 0, R * r, 0, TAU); c.fill(); }
      c.strokeStyle = 'rgba(20,10,6,0.85)'; c.lineWidth = R * 0.06; c.beginPath(); c.arc(0, 0, R * 0.82, 0, TAU); c.stroke();
    },
  });

  // onde mais dá para se esconder (o painel do objeto diz)
  for (const [id, onde] of [['arbusto', 'na moita'], ['barril', 'atrás do barril'], ['caixote', 'atrás dos caixotes'], ['carroca', 'debaixo da carroça'], ['feno', 'no feno'], ['cortina', 'atrás da cortina'], ['barraca', 'dentro da barraca'], ['biombo', 'atrás do biombo'], ['estatua', 'atrás da estátua']]) if (Props.P[id]) Props.P[id].esconde = onde;

  /* ---------- a mesa comprida da festa (com os bancos dos dois lados) ---------- */
  if (Props.P.mesaLonga) reg('mesaLonga', base({
    fw: 4, fh: 2, legado: { w: 0.95, h: 0.6 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R;
      const deitada = R >= B, L = deitada ? R : B, E = deitada ? B : R, m = Math.min(R, B);
      c.save(); if (!deitada) c.rotate(Math.PI / 2);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(-L * 0.96, -E * 0.8, L * 1.96, E * 1.7); c.restore();
      for (const y of [-E * 0.78, E * 0.78]) { caixa(c, -L * 0.94, y - E * 0.13, L * 1.88, E * 0.26, m * 0.06); c.fillStyle = MAD.esc; c.fill(); linha(c, m * 0.03); }
      caixa(c, -L * 0.97, -E * 0.5, L * 1.94, E, m * 0.08); c.fillStyle = grad(c, 0, -E * 0.5, 0, E * 0.5, [MAD.luz, MAD.cla, MAD.med]); c.fill(); linha(c, m * 0.05);
      for (let i = 0, n = Math.max(4, Math.round(L / (m * 0.32))); i < n; i++) { const x = -L * 0.85 + i * (L * 1.7) / (n - 1), y = (i % 2 ? 1 : -1) * E * 0.22; c.fillStyle = i % 3 === 0 ? '#c9a24a' : '#e8e0cc'; c.beginPath(); c.arc(x, y, m * 0.13, 0, TAU); c.fill(); linha(c, m * 0.025); }
      c.restore();
    },
  }, 'mesaLonga'));
})();
