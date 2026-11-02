/* ---------------------------------------------------------------
   6b4. OBJETOS DO LOTE 61 — a vila em dia de feira, em festa, atacada ou abandonada (o entulho, o varal, a
   barricada, o palco, a mesa comprida) e as masmorras novas (o casulo, a fonte sagrada) com as armadilhas que nascem
   armadas e escondidas (a placa de pressão, os dardos da parede, o fosso com espetos e a lâmina de pêndulo). Mesmo
   jeito dos de 6b: visto de cima, num quadrado de lado 2R centrado no token, com as peças de Props.kit.
   --------------------------------------------------------------- */
(() => {
  const { caixa, sombra, linha, grad, radial, hsh, MAD, PED, FER, pedrinha, tabua } = Props.kit;
  const est = Props.kit.est;
  const reg = (id, def) => Props.registrar(id, def);
  Props.grupo('povo', 'Vila e festa');
  // a armadilha armada: a tampa disfarçada (o mestre a vê esmaecida; os jogadores, não)
  const coberta = (c, R, k, raio) => {
    c.save(); c.globalAlpha *= 0.9;
    c.fillStyle = 'rgba(92,72,40,0.55)'; c.beginPath(); c.ellipse(0, 0, R * raio, R * raio * 0.9, 0, 0, TAU); c.fill();
    c.setLineDash([R * 0.12, R * 0.08]); c.strokeStyle = 'rgba(230,171,79,0.8)'; c.lineWidth = R * 0.04; c.beginPath(); c.ellipse(0, 0, R * raio, R * raio * 0.9, 0, 0, TAU); c.stroke();
    c.restore();
  };

  /* ---------- Vila e festa ---------- */
  reg('escombros', {
    n: 'Escombros', g: 'povo', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.85, 0.7);
      for (let i = 0; i < 9; i++) {
        const x = (hsh(s, i, 1) - 0.5) * R * 1.3, y = (hsh(s, i, 2) - 0.5) * R * 1.2, w = R * (0.25 + hsh(s, i, 3) * 0.35);
        if (i % 3 === 0) { c.save(); c.translate(x, y); c.rotate(hsh(s, i, 4) * 3); caixa(c, -w, -w * 0.18, w * 2, w * 0.36, w * 0.05); c.fillStyle = hsh(s, i, 5) < 0.5 ? '#3a2614' : '#1c140c'; c.fill(); linha(c, R * 0.025); c.restore(); }
        else pedrinha(c, x, y, w * 0.6, s + i, PED);
      }
      c.fillStyle = 'rgba(20,16,12,0.35)'; c.beginPath(); c.ellipse(0, R * 0.1, R * 0.5, R * 0.3, 0, 0, TAU); c.fill();
    },
  });
  reg('varal', {
    n: 'Varal', g: 'povo', size: 2,
    draw(c, R, t, s) {
      const L = R * 0.85;
      for (const x of [-L, L]) { c.fillStyle = MAD.esc; c.beginPath(); c.arc(x, 0, R * 0.07, 0, TAU); c.fill(); linha(c, R * 0.02); }
      c.strokeStyle = '#d8ccb0'; c.lineWidth = R * 0.02; c.beginPath(); c.moveTo(-L, 0); c.quadraticCurveTo(0, R * 0.08, L, 0); c.stroke();
      const PANO = ['#e8e0cc', '#b8433a', '#3e6fa8', '#d9c27a', '#7a8f5a'];
      for (let i = 0; i < 5; i++) { const x = -L + (i + 0.6) * L * 0.36, w = R * (0.16 + hsh(s, i, 1) * 0.08), h = R * (0.22 + hsh(s, i, 2) * 0.2); c.fillStyle = PANO[Math.floor(hsh(s, i, 3) * PANO.length)]; c.fillRect(x - w / 2, R * 0.02, w, h); c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = R * 0.015; c.strokeRect(x - w / 2, R * 0.02, w, h); }
    },
  });
  reg('barricada', {
    n: 'Barricada', g: 'povo', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.95, 0.45, 0.06, 0.12);
      for (let i = 0; i < 4; i++) { const y = (i - 1.5) * R * 0.18, a = (hsh(s, i, 1) - 0.5) * 0.25; c.save(); c.rotate(a); caixa(c, -R * 0.9, y - R * 0.07, R * 1.8, R * 0.14, R * 0.04); c.fillStyle = grad(c, 0, y - R * 0.07, 0, y + R * 0.07, [MAD.cla, MAD.esc]); c.fill(); linha(c, R * 0.025); c.restore(); }
      for (const x of [-R * 0.55, R * 0.1, R * 0.62]) { caixa(c, x - R * 0.17, -R * 0.42, R * 0.34, R * 0.34, R * 0.04); c.fillStyle = MAD.med; c.fill(); linha(c, R * 0.025); }
      c.strokeStyle = '#2a1a0c'; c.lineWidth = R * 0.05; for (const x of [-R * 0.75, R * 0.75]) { c.beginPath(); c.moveTo(x, -R * 0.55); c.lineTo(x + R * 0.12, R * 0.5); c.stroke(); }
    },
  });
  reg('palco', {
    n: 'Palco', g: 'povo', size: 3,
    draw(c, R, t, s) {
      sombra(c, R, 0.95, 0.75, 0.05, 0.08);
      caixa(c, -R * 0.92, -R * 0.7, R * 1.84, R * 1.4, R * 0.04); c.fillStyle = MAD.med; c.fill(); linha(c, R * 0.03);
      c.strokeStyle = 'rgba(40,24,10,0.55)'; c.lineWidth = R * 0.012; for (let i = 1; i < 10; i++) { const y = -R * 0.7 + i * R * 0.14; c.beginPath(); c.moveTo(-R * 0.92, y); c.lineTo(R * 0.92, y); c.stroke(); }
      // a cortina no fundo e os degraus na frente
      c.fillStyle = '#7a2a2a'; c.fillRect(-R * 0.92, -R * 0.78, R * 1.84, R * 0.16); for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#5a1c1c' : '#9a3a34'; c.fillRect(-R * 0.92 + i * R * 0.153, -R * 0.78, R * 0.08, R * 0.16); }
      caixa(c, -R * 0.25, R * 0.7, R * 0.5, R * 0.18, R * 0.03); c.fillStyle = MAD.cla; c.fill(); linha(c, R * 0.02);
    },
  });
  reg('mesaLonga', {
    n: 'Mesa comprida', g: 'povo', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.95, 0.42, 0.05, 0.1);
      for (const y of [-R * 0.52, R * 0.52]) { caixa(c, -R * 0.9, y - R * 0.08, R * 1.8, R * 0.16, R * 0.04); c.fillStyle = MAD.esc; c.fill(); linha(c, R * 0.02); }
      caixa(c, -R * 0.95, -R * 0.3, R * 1.9, R * 0.6, R * 0.05); c.fillStyle = grad(c, 0, -R * 0.3, 0, R * 0.3, [MAD.luz, MAD.cla, MAD.med]); c.fill(); linha(c, R * 0.03);
      for (let i = 0; i < 6; i++) { const x = -R * 0.75 + i * R * 0.3, y = (i % 2 ? 1 : -1) * R * 0.1; c.fillStyle = i % 3 === 0 ? '#c9a24a' : '#e8e0cc'; c.beginPath(); c.arc(x, y, R * 0.08, 0, TAU); c.fill(); linha(c, R * 0.015); }
    },
  });

  /* ---------- Masmorra ---------- */
  reg('casulo', {
    n: 'Casulo', g: 'masmorra', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.6, 0.75);
      c.beginPath(); c.ellipse(0, 0, R * 0.48, R * 0.72, hsh(s, 1, 1) - 0.5, 0, TAU); c.fillStyle = radial(c, -R * 0.12, -R * 0.2, R * 0.8, ['#e8e2cf', '#bdb59a', '#7f7862']); c.fill(); linha(c, R * 0.03);
      c.strokeStyle = 'rgba(255,255,240,0.55)'; c.lineWidth = R * 0.02;
      for (let i = 0; i < 7; i++) { const a = hsh(s, i, 2) * TAU; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.45, Math.sin(a) * R * 0.65); c.lineTo(Math.cos(a + 2.4) * R * 0.45, Math.sin(a + 2.4) * R * 0.65); c.stroke(); }
      for (let i = 0; i < 4; i++) { const a = hsh(s, i, 3) * TAU; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.7); c.lineTo(Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98); c.stroke(); }
    },
  });
  reg('fonteSagrada', {
    n: 'Fonte sagrada', g: 'masmorra', size: 2, luz: { bright: 1, dim: 3, c: '#8fd8ff' }, calma: true,
    draw(c, R, t, s) {
      sombra(c, R, 0.9, 0.85);
      const lados = 8, poli = k => { c.beginPath(); for (let i = 0; i < lados; i++) { const a = i / lados * TAU + Math.PI / 8; (i ? c.lineTo : c.moveTo).call(c, Math.cos(a) * R * k, Math.sin(a) * R * k); } c.closePath(); };
      poli(0.9); c.fillStyle = grad(c, 0, -R, 0, R, [PED.luz, PED.med]); c.fill(); linha(c, R * 0.035);
      poli(0.68); c.fillStyle = radial(c, 0, 0, R * 0.7, ['#d8f4ff', '#5fb6e0', '#21557a']); c.fill(); linha(c, R * 0.025);
      c.strokeStyle = 'rgba(230,250,255,0.6)'; c.lineWidth = R * 0.02; for (const k of [0.22, 0.4]) { c.beginPath(); c.arc(0, 0, R * k, 0, TAU); c.stroke(); }
      c.fillStyle = PED.cla; c.beginPath(); c.arc(0, 0, R * 0.12, 0, TAU); c.fill(); linha(c, R * 0.02);
    },
  });
  reg('placaPressao', {
    n: 'Placa de pressão', g: 'perigo', size: 1, armadilha: true,
    draw(c, R, t, s) {
      if (est() === 'armada') { coberta(c, R, s, 0.6); return; }
      caixa(c, -R * 0.6, -R * 0.6, R * 1.2, R * 1.2, R * 0.05); c.fillStyle = grad(c, -R, -R, R, R, [PED.cla, PED.esc]); c.fill(); linha(c, R * 0.03);
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = R * 0.04; c.strokeRect(-R * 0.48, -R * 0.48, R * 0.96, R * 0.96);
      c.fillStyle = '#b8433a'; for (const [x, y] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) { c.beginPath(); c.arc(x * R, y * R, R * 0.05, 0, TAU); c.fill(); }
    },
  });
  reg('dardos', {
    n: 'Dardos da parede', g: 'perigo', size: 1, armadilha: true,
    draw(c, R, t, s) {
      if (est() === 'armada') { coberta(c, R, s, 0.45); return; }
      c.fillStyle = '#0c0a08'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-R * 0.75, (i - 1.5) * R * 0.3, R * 0.06, 0, TAU); c.fill(); }
      for (let i = 0; i < 4; i++) {
        const y = (i - 1.5) * R * 0.3 + (hsh(s, i, 1) - 0.5) * R * 0.1, x = R * (0.1 + hsh(s, i, 2) * 0.5);
        c.strokeStyle = FER.cla; c.lineWidth = R * 0.035; c.beginPath(); c.moveTo(x - R * 0.35, y); c.lineTo(x, y); c.stroke();
        c.fillStyle = '#c8b27a'; c.beginPath(); c.moveTo(x - R * 0.35, y); c.lineTo(x - R * 0.45, y - R * 0.06); c.lineTo(x - R * 0.45, y + R * 0.06); c.closePath(); c.fill();
      }
    },
  });
  reg('fossoEspetos', {
    n: 'Fosso com espetos', g: 'perigo', size: 2, armadilha: true,
    draw(c, R, t, s) {
      if (est() === 'armada') { coberta(c, R, s, 0.8); return; }
      caixa(c, -R * 0.8, -R * 0.8, R * 1.6, R * 1.6, R * 0.05); c.fillStyle = radial(c, 0, 0, R * 1.1, ['#060505', '#14100c', '#2e241a']); c.fill(); linha(c, R * 0.04);
      for (let i = 0; i < 16; i++) {
        const x = -R * 0.6 + (i % 4) * R * 0.4 + (hsh(s, i, 1) - 0.5) * R * 0.1, y = -R * 0.6 + Math.floor(i / 4) * R * 0.4 + (hsh(s, i, 2) - 0.5) * R * 0.1, r = R * 0.09;
        c.beginPath(); c.moveTo(x - r, y + r); c.lineTo(x, y - r * 1.3); c.lineTo(x + r, y + r); c.closePath(); c.fillStyle = grad(c, x - r, 0, x + r, 0, [FER.luz, FER.med, FER.esc]); c.fill();
      }
      // a tampa que se abriu (as duas folhas penduradas na beira)
      c.fillStyle = 'rgba(92,72,40,0.85)'; c.fillRect(-R * 0.8, -R * 0.92, R * 1.6, R * 0.12); c.fillRect(-R * 0.8, R * 0.8, R * 1.6, R * 0.12);
    },
  });
  reg('pendulo', {
    n: 'Lâmina de pêndulo', g: 'perigo', size: 1, armadilha: true,
    draw(c, R, t, s) {
      if (est() === 'armada') { c.save(); c.globalAlpha *= 0.85; c.setLineDash([R * 0.12, R * 0.08]); c.strokeStyle = 'rgba(230,171,79,0.8)'; c.lineWidth = R * 0.04; c.beginPath(); c.moveTo(-R * 0.9, 0); c.lineTo(R * 0.9, 0); c.stroke(); c.restore(); return; }
      c.strokeStyle = 'rgba(200,210,220,0.25)'; c.lineWidth = R * 0.5; c.beginPath(); c.arc(0, -R * 1.4, R * 1.5, Math.PI * 0.32, Math.PI * 0.68); c.stroke();
      c.save(); c.rotate(0.25);
      c.beginPath(); c.moveTo(-R * 0.75, -R * 0.06); c.quadraticCurveTo(0, R * 0.32, R * 0.75, -R * 0.06); c.lineTo(R * 0.6, -R * 0.14); c.quadraticCurveTo(0, R * 0.12, -R * 0.6, -R * 0.14); c.closePath();
      c.fillStyle = grad(c, 0, -R * 0.14, 0, R * 0.3, [FER.luz, FER.cla, FER.med]); c.fill(); linha(c, R * 0.03);
      c.fillStyle = FER.esc; c.fillRect(-R * 0.05, -R * 0.4, R * 0.1, R * 0.32);
      c.restore();
    },
  });
  void tabua; void MAD;
})();
