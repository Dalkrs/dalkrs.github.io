/* ---------------------------------------------------------------
   6b9. A BASE SECRETA (lote 141) — os objetos que faltavam para o porão escondido:
     · a bancada de alquimia (2 × 1, de costas para a parede): os frascos coloridos, o alambique de cobre e a chama;
     · o túnel de fuga (1 × 1): a boca do túnel escorada com tábuas, para sair longe da casa.
   O gerador põe a base no porão (o "Gerar o interior" e a Furtividade, 10g e 10gc).
   --------------------------------------------------------------- */
(() => {
  const { caixa, linha, grad, radial, hsh, MAD, PED } = Props.kit;
  const reg = (id, def) => Props.registrar(id, def);
  Props.grupo('base', 'Base secreta');

  // a bancada de alquimia: o tampo de madeira, os frascos coloridos (que brilham de leve), o alambique e a chama
  reg('alambique', {
    n: 'Bancada de alquimia', g: 'base', size: 2, fw: 2, fh: 1, costas: 'n',
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B), x = -R + m * 0.04, y = -B + m * 0.04, w = R * 2 - m * 0.08, h = B * 2 - m * 0.12;
      c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x + m * 0.06, y + m * 0.08, w, h); c.restore();
      caixa(c, x, y, w, h, m * 0.06); c.fillStyle = grad(c, 0, y, 0, y + h, [MAD.cla, MAD.med]); c.fill(); linha(c, m * 0.06);
      // o alambique de cobre: a bojuda, o pescoço e o cano até o frasco
      const ax = x + w * 0.22, ay = y + h * 0.5;
      c.fillStyle = radial(c, ax - m * 0.08, ay - m * 0.08, m * 0.36, ['#f0b27a', '#b5652e', '#6b3412']); c.beginPath(); c.arc(ax, ay, m * 0.32, 0, TAU); c.fill(); linha(c, m * 0.04);
      c.strokeStyle = '#a0572a'; c.lineWidth = m * 0.07; c.beginPath(); c.moveTo(ax + m * 0.2, ay - m * 0.2); c.quadraticCurveTo(ax + m * 0.6, ay - m * 0.55, ax + m * 0.85, ay - m * 0.1); c.stroke();
      // a chama embaixo
      const p = 0.75 + 0.25 * Math.sin(t * 7 + s);
      c.fillStyle = `rgba(255,170,60,${0.55 * p})`; c.beginPath(); c.arc(ax, ay + m * 0.34, m * 0.12 * p, 0, TAU); c.fill();
      // os frascos: verdes, roxos, azuis
      const cores = ['#62d27a', '#b26ad8', '#5aa8e8', '#e8d45a'];
      for (let i = 0; i < 5; i++) {
        const fx = x + w * (0.48 + i * 0.1), fy = y + h * (0.32 + (i % 2) * 0.34), r = m * (0.1 + hsh(s, i, 2) * 0.05);
        c.fillStyle = 'rgba(230,240,245,0.75)'; c.beginPath(); c.arc(fx, fy, r * 1.2, 0, TAU); c.fill(); linha(c, m * 0.025);
        c.fillStyle = cores[Math.floor(hsh(s, i, 5) * cores.length)]; c.globalAlpha = 0.65 + 0.3 * Math.sin(t * 2 + i); c.beginPath(); c.arc(fx, fy + r * 0.2, r * 0.85, 0, TAU); c.fill(); c.globalAlpha = 1;
      }
      // o livro aberto na ponta
      c.fillStyle = '#efe4c4'; caixa(c, x + w * 0.86, y + h * 0.18, w * 0.11, h * 0.6, m * 0.02); c.fill(); linha(c, m * 0.025);
    },
  });
  // o túnel de fuga: a boca escura, escorada com as tábuas, e a terra em volta
  reg('tunel', {
    n: 'Túnel de fuga', g: 'base', size: 1,
    draw(c, R) {
      c.fillStyle = 'rgba(70,52,32,0.85)'; c.beginPath(); c.ellipse(0, R * 0.05, R * 0.95, R * 0.88, 0, 0, TAU); c.fill();
      c.fillStyle = radial(c, 0, R * 0.1, R * 0.7, ['#000000', '#120c08', '#2a1e12']); c.beginPath(); c.ellipse(0, R * 0.1, R * 0.62, R * 0.55, 0, 0, TAU); c.fill();
      c.strokeStyle = MAD.esc; c.lineWidth = R * 0.14; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-R * 0.66, R * 0.55); c.lineTo(-R * 0.6, -R * 0.45); c.lineTo(R * 0.6, -R * 0.45); c.lineTo(R * 0.66, R * 0.55); c.stroke();
      c.strokeStyle = MAD.med; c.lineWidth = R * 0.06; c.beginPath(); c.moveTo(-R * 0.6, -R * 0.45); c.lineTo(R * 0.6, -R * 0.45); c.stroke();
      c.fillStyle = PED.med;
      for (const [x, y, r] of [[-0.8, -0.6, 0.12], [0.78, -0.55, 0.1], [0.7, 0.75, 0.13], [-0.75, 0.78, 0.1]]) { c.beginPath(); c.arc(R * x, R * y, R * r, 0, TAU); c.fill(); }
      c.lineCap = 'butt';
    },
  });
})();
