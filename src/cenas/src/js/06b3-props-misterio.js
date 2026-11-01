/* ---------------------------------------------------------------
   6b3. OS OBJETOS DO MISTÉRIO (lote 53) — a marca de pista (só do mestre: nasce oculta e leva a uma pista de um caso do
   Escudo; dois cliques a revelam e entregam a pista à mesa), o corpo coberto e os papéis espalhados da cena do crime.
   --------------------------------------------------------------- */
(() => {
  const { caixa, sombra, linha, grad, radial, MAD, tom } = Props.kit;
  const TAU = Math.PI * 2;
  Props.grupo('misterio', 'Mistério');

  // a marca de pista: um selo de cera âmbar com a lupa (marca: só o mestre a vê até ser revelada)
  Props.registrar('pista', {
    n: 'Marca de pista', g: 'misterio', size: 1, marca: true,
    draw(c, R) {
      sombra(c, R, 0.8, 0.8, 0.05, 0.08);
      c.fillStyle = radial(c, -R * 0.25, -R * 0.3, R * 1.1, ['#f2c46a', '#d8962e', '#8a5512']); c.beginPath();
      for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, rr = R * (i % 2 ? 0.78 : 0.86); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fill(); c.lineWidth = R * 0.05; c.strokeStyle = '#5a3608'; c.stroke();
      c.lineCap = 'round';
      c.strokeStyle = '#3a2204'; c.lineWidth = R * 0.12; c.beginPath(); c.arc(-R * 0.08, -R * 0.08, R * 0.3, 0, TAU); c.stroke();
      c.lineWidth = R * 0.15; c.beginPath(); c.moveTo(R * 0.15, R * 0.15); c.lineTo(R * 0.42, R * 0.42); c.stroke();
      c.fillStyle = 'rgba(255,248,220,0.55)'; c.beginPath(); c.arc(-R * 0.14, -R * 0.16, R * 0.1, 0, TAU); c.fill();
    },
  });
  // o corpo coberto por um lençol (sem sangue: o vulto sob o pano, um braço e o pé à mostra)
  Props.registrar('corpo', {
    n: 'Corpo coberto', g: 'misterio', size: 2,
    draw(c, R) {
      sombra(c, R, 0.86, 0.5, 0.04, 0.1);
      c.save(); c.rotate(-0.12);
      c.fillStyle = '#5f4a3a'; c.beginPath(); c.ellipse(R * 0.62, R * 0.28, R * 0.16, R * 0.07, 0.4, 0, TAU); c.fill();     // a mão
      c.fillStyle = '#3d2f26'; c.beginPath(); c.ellipse(-R * 0.86, R * 0.06, R * 0.1, R * 0.08, 0, 0, TAU); c.fill();        // o pé
      c.beginPath();
      c.moveTo(-R * 0.8, -R * 0.12); c.quadraticCurveTo(-R * 0.4, -R * 0.36, R * 0.1, -R * 0.3); c.quadraticCurveTo(R * 0.5, -R * 0.42, R * 0.8, -R * 0.2);
      c.quadraticCurveTo(R * 0.92, 0, R * 0.8, R * 0.2); c.quadraticCurveTo(R * 0.4, R * 0.34, 0, R * 0.26); c.quadraticCurveTo(-R * 0.5, R * 0.32, -R * 0.8, R * 0.14); c.closePath();
      c.fillStyle = grad(c, 0, -R * 0.4, 0, R * 0.34, ['#efe9dc', '#d6cebd', '#b9b09c']); c.fill(); linha(c, R * 0.03);
      c.strokeStyle = 'rgba(90,80,64,0.45)'; c.lineWidth = R * 0.025;
      for (const [a, b, d] of [[-0.5, -0.24, 0.42], [0.05, -0.22, 0.4], [0.45, -0.3, 0.44]]) { c.beginPath(); c.moveTo(a * R, b * R); c.quadraticCurveTo((a + 0.08) * R, (b + d / 2) * R, (a - 0.02) * R, (b + d) * R); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(R * 0.62, -R * 0.12, R * 0.12, R * 0.07, -0.2, 0, TAU); c.fill();     // a cabeça sob o pano
      c.restore();
    },
  });
  // os papéis espalhados (a escrivaninha revirada, o baú esvaziado)
  Props.registrar('papeis', {
    n: 'Papéis espalhados', g: 'misterio', size: 1,
    draw(c, R, t, s) {
      for (let i = 0; i < 6; i++) {
        const a = (i * 2.1 + (s || 0)) % TAU, d = R * (0.15 + (i % 3) * 0.22);
        c.save(); c.translate(Math.cos(a) * d, Math.sin(a) * d); c.rotate(a * 1.7);
        caixa(c, -R * 0.24, -R * 0.17, R * 0.48, R * 0.34, R * 0.02); c.fillStyle = i % 2 ? '#ece2c6' : '#e0d3b0'; c.fill(); linha(c, R * 0.015);
        c.strokeStyle = 'rgba(70,52,30,0.45)'; c.lineWidth = R * 0.018;
        for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-R * 0.17, -R * 0.08 + k * R * 0.08); c.lineTo(R * 0.14, -R * 0.08 + k * R * 0.08); c.stroke(); }
        c.restore();
      }
      c.fillStyle = tom(MAD.esc, -0.1); c.beginPath(); c.ellipse(R * 0.3, R * 0.42, R * 0.1, R * 0.05, 0.3, 0, TAU); c.fill();     // a tinta derramada
    },
  });
})();
