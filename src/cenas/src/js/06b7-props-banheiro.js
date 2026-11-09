/* ---------------------------------------------------------------
   6b7. O BANHEIRO (lote 125) — porque o personagem também precisa de onde tomar banho.
     a banheira (2 × 1, a de pés de leão, com a água), a latrina (o banco de madeira com a tampa), o lavatório (a bacia e
     o jarro no suporte), o espelho de parede, o toalheiro (com as toalhas) e o biombo de pano (2 × 1; 'biomboPano' — o 'biombo' é o oriental, do lote 54).
   O gerador põe o banheiro (o cômodo "banheiro") nas casas, na mansão e nas casas das ruas (10gc).
   --------------------------------------------------------------- */
(() => {
  const { caixa, linha, grad, radial, MAD, FER } = Props.kit;
  const reg = (id, def) => Props.registrar(id, def);
  Props.grupo('banho', 'Banheiro');
  const LOUCA = ['#f2efe6', '#d8d2c2'], AGUA = ['#9cc7dc', '#5f93b0', '#3f6f8c'], OURO = '#d6a64a';
  const sombraR = (c, R, B, m) => { c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; caixa(c, -R + m * 0.12, -B + m * 0.14, R * 2 - m * 0.1, B * 2 - m * 0.1, m * 0.3); c.fill(); c.restore(); };

  // a banheira: a louça comprida com a borda grossa, a água com o brilho que mexe, os pés de leão e a torneira
  reg('banheira', {
    n: 'Banheira', g: 'banho', size: 2, fw: 2, fh: 1,
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B), w = R * 2 - m * 0.12, h = B * 2 - m * 0.16;
      sombraR(c, R, B, m);
      for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.fillStyle = OURO; c.beginPath(); c.arc(px * (w / 2 - m * 0.18), py * (h / 2 - m * 0.06), m * 0.09, 0, TAU); c.fill(); }
      caixa(c, -w / 2, -h / 2, w, h, h * 0.48); c.fillStyle = grad(c, 0, -h / 2, 0, h / 2, LOUCA); c.fill(); linha(c, m * 0.06);
      caixa(c, -w / 2 + m * 0.16, -h / 2 + m * 0.16, w - m * 0.32, h - m * 0.32, (h - m * 0.32) * 0.48); c.fillStyle = radial(c, 0, 0, w / 2, AGUA); c.fill();
      c.strokeStyle = 'rgba(230,245,255,0.45)'; c.lineWidth = m * 0.03;
      for (let i = 0; i < 2; i++) { const r = m * (0.15 + (((t * 0.25) + i * 0.5) % 1) * 0.5); c.beginPath(); c.ellipse(-w * 0.12 + i * w * 0.2, 0, r * 1.6, r * 0.7, 0, 0, TAU); c.stroke(); }
      // a espuma e a torneira na cabeceira
      c.fillStyle = 'rgba(255,255,255,0.7)'; for (const [x, y, r] of [[0.28, -0.1, 0.1], [0.34, 0.08, 0.08], [0.22, 0.12, 0.06]]) { c.beginPath(); c.arc(w * x, h * y, m * r, 0, TAU); c.fill(); }
      c.fillStyle = OURO; caixa(c, -w / 2 + m * 0.04, -m * 0.08, m * 0.22, m * 0.16, m * 0.05); c.fill(); linha(c, m * 0.03);
    },
  });
  // a latrina: o banco de madeira com o buraco e a tampa, o balde do lado
  reg('latrina', {
    n: 'Latrina', g: 'banho', size: 1,
    draw(c, R) {
      sombraR(c, R * 0.8, R * 0.8, R);
      caixa(c, -R * 0.78, -R * 0.78, R * 1.56, R * 1.4, R * 0.1); c.fillStyle = grad(c, 0, -R, 0, R, [MAD.cla, MAD.med]); c.fill(); linha(c, R * 0.06);
      c.strokeStyle = 'rgba(60,35,12,0.45)'; c.lineWidth = R * 0.03; for (const y of [-0.3, 0.2]) { c.beginPath(); c.moveTo(-R * 0.75, R * y); c.lineTo(R * 0.75, R * y); c.stroke(); }
      c.fillStyle = '#1a120c'; c.beginPath(); c.ellipse(0, -R * 0.05, R * 0.3, R * 0.36, 0, 0, TAU); c.fill(); linha(c, R * 0.04);
      c.fillStyle = MAD.esc; caixa(c, -R * 0.62, -R * 0.74, R * 1.24, R * 0.26, R * 0.06); c.fill(); linha(c, R * 0.03);
      c.fillStyle = FER.med; c.beginPath(); c.arc(R * 0.62, R * 0.62, R * 0.2, 0, TAU); c.fill(); linha(c, R * 0.03);
    },
  });
  // o lavatório: o suporte de madeira, a bacia de louça com água e o jarro
  reg('lavatorio', {
    n: 'Lavatório', g: 'banho', size: 1,
    draw(c, R) {
      sombraR(c, R * 0.8, R * 0.7, R);
      caixa(c, -R * 0.8, -R * 0.7, R * 1.6, R * 1.3, R * 0.12); c.fillStyle = grad(c, 0, -R, 0, R, [MAD.luz || MAD.cla, MAD.med]); c.fill(); linha(c, R * 0.05);
      c.fillStyle = grad(c, -R * 0.5, 0, R * 0.5, 0, LOUCA); c.beginPath(); c.arc(-R * 0.12, -R * 0.05, R * 0.5, 0, TAU); c.fill(); linha(c, R * 0.04);
      c.fillStyle = radial(c, -R * 0.12, -R * 0.05, R * 0.38, AGUA); c.beginPath(); c.arc(-R * 0.12, -R * 0.05, R * 0.36, 0, TAU); c.fill();
      c.fillStyle = '#e8e2d2'; c.beginPath(); c.arc(R * 0.52, R * 0.32, R * 0.24, 0, TAU); c.fill(); linha(c, R * 0.04);
      c.strokeStyle = '#7a8ca0'; c.lineWidth = R * 0.05; c.beginPath(); c.arc(R * 0.52, R * 0.32, R * 0.14, 0, TAU); c.stroke();
    },
  });
  // o espelho de parede: a moldura dourada e o vidro com o reflexo
  reg('espelho', {
    n: 'Espelho', g: 'banho', size: 1,
    draw(c, R) {
      c.fillStyle = OURO; caixa(c, -R * 0.62, -R * 0.82, R * 1.24, R * 1.3, R * 0.5); c.fill(); linha(c, R * 0.05);
      c.fillStyle = grad(c, -R * 0.5, -R * 0.7, R * 0.5, R * 0.4, ['#e8f2f6', '#8fb1c4', '#cfe3ee']); caixa(c, -R * 0.48, -R * 0.68, R * 0.96, R * 1.02, R * 0.4); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = R * 0.06; c.beginPath(); c.moveTo(-R * 0.25, -R * 0.4); c.lineTo(R * 0.05, -R * 0.1); c.stroke();
    },
  });
  // o toalheiro: a barra e as toalhas penduradas
  reg('toalheiro', {
    n: 'Toalheiro', g: 'banho', size: 1,
    draw(c, R) {
      c.strokeStyle = MAD.esc; c.lineWidth = R * 0.1; c.lineCap = 'round'; c.beginPath(); c.moveTo(-R * 0.8, -R * 0.6); c.lineTo(R * 0.8, -R * 0.6); c.stroke();
      for (const [x, cor] of [[-0.45, '#c4dbe6'], [0.1, '#e6d2a8'], [0.55, '#c98a8a']]) {
        c.fillStyle = cor; caixa(c, R * x - R * 0.2, -R * 0.62, R * 0.4, R * 1.1, R * 0.06); c.fill(); linha(c, R * 0.03);
        c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(R * x - R * 0.2, R * 0.3); c.lineTo(R * x + R * 0.2, R * 0.3); c.stroke();
      }
    },
  });
  // o biombo: três folhas de pano esticado em moldura, em ziguezague
  reg('biomboPano', {
    n: 'Biombo de pano', g: 'banho', size: 2, fw: 2, fh: 1,
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B), w = R * 2 - m * 0.2, x0 = -w / 2, y = -m * 0.12;
      const pts = [[x0, y], [x0 + w / 3, y - m * 0.35], [x0 + w * 2 / 3, y], [x0 + w, y - m * 0.35]];
      c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); pts.forEach(([x, yy], i) => (i ? c.lineTo(x + m * 0.1, yy + m * 0.5) : c.moveTo(x + m * 0.1, yy + m * 0.5))); c.lineTo(x0 + w + m * 0.1, y + m * 0.55); c.lineTo(x0 + m * 0.1, y + m * 0.6); c.closePath(); c.fill();
      c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        c.strokeStyle = MAD.esc; c.lineWidth = m * 0.22; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
        c.strokeStyle = ['#c9b07a', '#b8865a', '#c9b07a'][i]; c.lineWidth = m * 0.13; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      }
      c.fillStyle = OURO; for (const [x, yy] of pts) { c.beginPath(); c.arc(x, yy, m * 0.09, 0, TAU); c.fill(); }
    },
  });
})();
