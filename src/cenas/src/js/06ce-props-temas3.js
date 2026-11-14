/* ---------------------------------------------------------------
   6ce. OS OBJETOS DOS TEMAS, parte 3 (lote 158):
     · Acampamento militar e cerco: a tenda de comando, a paliçada, as estacas contra a cavalaria, os barris de pólvora,
       a torre de vigia de madeira, as bandeiras e o tambor de guerra (a mesa de guerra já existia, no Clã);
     · Portais e magia: o portal arcano, o círculo de teletransporte, a pedra flutuante, o pilar de energia, o orbe e as
       runas no chão;
     · Teatro e música: o palco com cortina, o alaúde, o tambor, a harpa, as cadeiras da plateia, a arara de figurinos e
       as máscaras;
     · Convés e porto: o leme, o canhão, as cordas enroladas, o mastro, a âncora, as redes de pesca, a carga amarrada e
       a prancha;
     · Natureza fantástica: o cogumelo gigante, o ninho gigante, os cristais no chão, a teia gigante, a flor carnívora,
       a toca e a árvore oca.
   --------------------------------------------------------------- */
(() => {
  const { caixa, linha, grad, radial, hsh, MAD, PED, FER, chama, sombra, pedrinha, folhas } = Props.kit;
  const { bola, oval, ret, seg, poli, somb, brilho, mm } = Props.kitT;
  const reg = (id, def) => Props.registrar(id, def);
  const LONA = ['#c8b88a', '#a8986a', '#7a6a48'];

  /* ================= ACAMPAMENTO MILITAR E CERCO ================= */
  Props.grupo('militar', 'Acampamento militar e cerco');
  // a tenda de comando: a lona grande de quatro águas, o mastro com a flâmula e a entrada com as abas abertas
  reg('tendaComando', {
    n: 'Tenda de comando', g: 'militar', size: 3, vivo: true,
    draw(c, R, t, s) {
      sombra(c, R, 0.95, 0.95, 0.1, 0.12);
      const cor = ['#8a2a2a', '#2a4a7a', '#3a5a2a'][s % 3];
      poli(c, [[-R * 0.9, -R * 0.9], [R * 0.9, -R * 0.9], [0, 0]], LONA[0], R * 0.025); poli(c, [[R * 0.9, -R * 0.9], [R * 0.9, R * 0.9], [0, 0]], LONA[1], R * 0.025);
      poli(c, [[R * 0.9, R * 0.9], [-R * 0.9, R * 0.9], [0, 0]], LONA[2], R * 0.025); poli(c, [[-R * 0.9, R * 0.9], [-R * 0.9, -R * 0.9], [0, 0]], LONA[1], R * 0.025);
      c.strokeStyle = cor; c.lineWidth = R * 0.06; c.strokeRect(-R * 0.9, -R * 0.9, R * 1.8, R * 1.8);
      poli(c, [[-R * 0.18, R * 0.9], [0, R * 0.5], [R * 0.18, R * 0.9]], '#2a2016');
      bola(c, 0, 0, R * 0.05, MAD.esc);
      const o = Math.sin(t * 3) * R * 0.04; poli(c, [[0, 0], [R * 0.35, -R * 0.06 + o], [R * 0.3, R * 0.04 + o], [0, R * 0.1]], cor, R * 0.015);
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { seg(c, x * R * 0.9, y * R * 0.9, x * R * 0.98, y * R * 0.98, R * 0.015, '#c9b48a'); bola(c, x * R * 0.98, y * R * 0.98, R * 0.025, MAD.esc); }
    },
  });
  // a paliçada: a fileira de toras de ponta, amarradas (2 × 1, encosta)
  reg('palicada', {
    n: 'Paliçada', g: 'militar', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B), n = 6, d = R * 2 / n;
      c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-R, -b * 0.25, R * 2, b * 0.9); c.restore();
      for (let i = 0; i < n; i++) { const x = -R + d / 2 + i * d; bola(c, x, -b * 0.35, d * 0.48, radial(c, x - d * 0.15, -b * 0.45, d * 0.6, [MAD.luz, MAD.cla, MAD.med]), m * 0.035); bola(c, x, -b * 0.35, d * 0.12, '#e0c08a'); }
      seg(c, -R, -b * 0.35, R, -b * 0.35, m * 0.04, '#6a5030');
    },
  });
  // as estacas contra a cavalaria: a trave com as lanças cruzadas em X, viradas para fora
  reg('cavalosFrisa', {
    n: 'Estacas contra cavalaria', g: 'militar', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R, b * 0.4, m);
      for (let i = 0; i < 5; i++) { const x = -R * 0.8 + i * R * 0.4; for (const k of [-1, 1]) { seg(c, x - k * m * 0.25, -b * 0.95, x + k * m * 0.25, b * 0.95, m * 0.08, MAD.cla); } bola(c, x - m * 0.25, -b * 0.95, m * 0.04, FER.cla); bola(c, x + m * 0.25, -b * 0.95, m * 0.04, FER.cla); }
      seg(c, -R * 0.95, 0, R * 0.95, 0, m * 0.18, MAD.med); seg(c, -R * 0.95, 0, R * 0.95, 0, m * 0.04, 'rgba(40,22,8,0.4)');
    },
  });
  // os barris de pólvora: os três barris com a marca e o rastilho
  reg('barrisPolvora', {
    n: 'Barris de pólvora', g: 'militar', size: 1,
    draw(c, R, t, s) {
      for (const [x, y] of [[-R * 0.32, -R * 0.28], [R * 0.33, -R * 0.2], [0, R * 0.35]]) {
        oval(c, x + R * 0.06, y + R * 0.08, R * 0.33, R * 0.33, 0, 'rgba(0,0,0,0.3)');
        bola(c, x, y, R * 0.32, radial(c, x - R * 0.1, y - R * 0.1, R * 0.4, [MAD.luz, MAD.cla, MAD.med]), R * 0.035);
        c.strokeStyle = FER.med; c.lineWidth = R * 0.035; c.beginPath(); c.arc(x, y, R * 0.24, 0, TAU); c.stroke();
        c.strokeStyle = '#1a1410'; c.lineWidth = R * 0.04; c.beginPath(); c.moveTo(x - R * 0.1, y - R * 0.1); c.lineTo(x + R * 0.1, y + R * 0.1); c.moveTo(x + R * 0.1, y - R * 0.1); c.lineTo(x - R * 0.1, y + R * 0.1); c.stroke();
      }
      c.strokeStyle = '#2a2016'; c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(0, R * 0.35); c.quadraticCurveTo(R * 0.5, R * 0.7, R * 0.85, R * 0.6); c.stroke();
    },
  });
  // a torre de vigia de madeira: a plataforma no alto (vista de cima), o parapeito e a escada
  reg('torreVigiaMadeira', {
    n: 'Torre de vigia de madeira', g: 'militar', size: 2,
    draw(c, R) {
      c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-R * 0.6, -R * 0.6, R * 1.6, R * 1.6); c.restore();
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) seg(c, x * R * 0.9, y * R * 0.9, x * R * 0.7, y * R * 0.7, R * 0.08, MAD.esc);
      ret(c, -R * 0.75, -R * 0.75, R * 1.5, R * 1.5, R * 0.04, MAD.cla, R * 0.04);
      c.strokeStyle = 'rgba(40,22,8,0.4)'; c.lineWidth = R * 0.015; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(-R * 0.75, -R * 0.75 + i * R * 0.25); c.lineTo(R * 0.75, -R * 0.75 + i * R * 0.25); c.stroke(); }
      c.strokeStyle = MAD.med; c.lineWidth = R * 0.1; c.strokeRect(-R * 0.7, -R * 0.7, R * 1.4, R * 1.4);
      ret(c, R * 0.3, R * 0.3, R * 0.3, R * 0.3, R * 0.02, '#1a1208');
      for (let i = 0; i < 3; i++) seg(c, R * 0.33, R * 0.36 + i * R * 0.09, R * 0.57, R * 0.36 + i * R * 0.09, R * 0.03, MAD.luz);
      bola(c, -R * 0.35, -R * 0.35, R * 0.12, '#3d434c', R * 0.02); Props.kit.brasa(c, -R * 0.35, -R * 0.35, R * 0.07, 1.3, 2);
    },
  });
  // as bandeiras: o mastro com as três flâmulas, tremulando
  reg('bandeiras', {
    n: 'Bandeiras', g: 'militar', size: 1, vivo: true,
    draw(c, R, t, s) {
      sombra(c, R, 0.3, 0.3);
      const cores = ['#b8322e', '#2f5a9a', '#d6a64a'];
      for (let i = 0; i < 3; i++) { const a = -0.5 + i * 0.5, o = Math.sin(t * 4 + i) * R * 0.06; c.save(); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(R * 0.4, -R * 0.1 + o, R * 0.85, o); c.quadraticCurveTo(R * 0.4, R * 0.15 + o, 0, R * 0.18); c.closePath(); c.fillStyle = cores[(s + i) % 3]; c.fill(); linha(c, R * 0.025); c.restore(); }
      bola(c, 0, 0, R * 0.12, MAD.esc, R * 0.03); bola(c, 0, 0, R * 0.05, '#d6a64a');
    },
  });
  // o tambor de guerra: o tambor grande de couro, com as cordas em zigue-zague e as baquetas
  reg('tamborGuerra', {
    n: 'Tambor de guerra', g: 'militar', size: 1,
    draw(c, R) {
      sombra(c, R, 0.65, 0.65);
      bola(c, 0, 0, R * 0.62, '#8a2a2a', R * 0.05);
      c.strokeStyle = '#e8d8b0'; c.lineWidth = R * 0.03; c.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * TAU, r = i % 2 ? R * 0.62 : R * 0.48; if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke();
      bola(c, 0, 0, R * 0.45, radial(c, -R * 0.1, -R * 0.1, R * 0.5, ['#f0e2c0', '#d8c49a', '#b8a070']), R * 0.03);
      for (const a of [0.6, 1.1]) { c.save(); c.rotate(a); seg(c, -R * 0.1, -R * 0.6, R * 0.05, R * 0.2, R * 0.06, MAD.cla); bola(c, -R * 0.1, -R * 0.6, R * 0.07, '#e8dcc0'); c.restore(); }
    },
  });

  /* ================= PORTAIS E MAGIA ================= */
  Props.grupo('portais', 'Portais e magia');
  // o portal arcano: o anel de pedra com as runas e o redemoinho de luz girando dentro
  reg('portalArcano', {
    n: 'Portal arcano', g: 'portais', size: 2, vivo: true, calma: true, luz: { bright: 2, dim: 5, c: '#a87aff' },
    draw(c, R, t, s) {
      const cor = ['#a87aff', '#5ad0ff', '#7aff9a'][s % 3];
      brilho(c, 0, 0, R * 1.0, cor, 0.5);
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { c.strokeStyle = cor; c.globalAlpha = 0.4; c.lineWidth = R * 0.06; c.beginPath(); for (let k = 0; k <= 30; k++) { const f = k / 30, a = f * 5 + t * 1.5 + i * Math.PI / 2, r = f * R * 0.62; if (k) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(0, 0); } c.stroke(); }
      c.restore(); c.globalAlpha = 1;
      bola(c, 0, 0, R * 0.12, '#ffffff');
      c.strokeStyle = PED.med; c.lineWidth = R * 0.2; c.beginPath(); c.arc(0, 0, R * 0.78, 0, TAU); c.stroke();
      c.strokeStyle = PED.cla; c.lineWidth = R * 0.12; c.stroke();
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; bola(c, Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78, R * 0.05, cor); }
    },
  });
  // o círculo de teletransporte: o círculo azul no chão, as runas que giram e o brilho que sobe
  reg('circuloTeleporte', {
    n: 'Círculo de teletransporte', g: 'portais', size: 2, vivo: true, calma: true, luz: { bright: 1, dim: 3, c: '#7ad8ff' },
    draw(c, R, t) {
      brilho(c, 0, 0, R * 0.95, '#7ad8ff', 0.3 + 0.15 * Math.sin(t * 2));
      c.strokeStyle = '#9fe8ff'; c.lineWidth = R * 0.04;
      for (const r of [0.9, 0.72, 0.35]) { c.beginPath(); c.arc(0, 0, R * r, 0, TAU); c.stroke(); }
      c.save(); c.rotate(t * 0.4); c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.moveTo(Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72); c.lineTo(Math.cos(a + 2) * R * 0.72, Math.sin(a + 2) * R * 0.72); } c.stroke();
      c.lineWidth = R * 0.025; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, x = Math.cos(a) * R * 0.81, y = Math.sin(a) * R * 0.81; c.beginPath(); c.moveTo(x - R * 0.03, y - R * 0.04); c.lineTo(x + R * 0.03, y); c.lineTo(x - R * 0.02, y + R * 0.04); c.stroke(); }
      c.restore();
    },
  });
  // a pedra flutuante: a rocha no ar, com a sombra lá embaixo e os pedregulhos girando
  reg('pedraFlutuante', {
    n: 'Pedra flutuante', g: 'portais', size: 1, vivo: true,
    draw(c, R, t, s) {
      const h = Math.sin(t * 1.2) * R * 0.08;
      oval(c, R * 0.25, R * 0.4, R * (0.42 - h / R), R * (0.25 - h / R * 0.5), 0, 'rgba(0,0,0,0.25)');
      pedrinha(c, 0, -R * 0.1 + h, R * 0.5, s);
      musgo2(c, R, s, h);
      for (let i = 0; i < 3; i++) { const a = t * 0.8 + i * TAU / 3; pedrinha(c, Math.cos(a) * R * 0.75, -R * 0.1 + h + Math.sin(a) * R * 0.3, R * 0.08, s + i); }
    },
  });
  function musgo2(c, R, s, h) { for (let i = 0; i < 4; i++) bola(c, (hsh(s, i, 5) - 0.5) * R * 0.5, -R * 0.35 + h + hsh(s, i, 6) * R * 0.2, R * 0.07, i % 2 ? '#4f8a3e' : '#3f7a34'); }
  // o pilar de energia: o cristal alto na base de metal, com os raios saindo dele
  reg('pilarEnergia', {
    n: 'Pilar de energia', g: 'portais', size: 1, vivo: true, calma: true, luz: { bright: 2, dim: 4, c: '#7af0ff' },
    draw(c, R, t, s) {
      sombra(c, R, 0.6, 0.6);
      poli(c, [[-R * 0.55, -R * 0.2], [-R * 0.2, -R * 0.55], [R * 0.2, -R * 0.55], [R * 0.55, -R * 0.2], [R * 0.55, R * 0.2], [R * 0.2, R * 0.55], [-R * 0.2, R * 0.55], [-R * 0.55, R * 0.2]], grad(c, -R, -R, R, R, [FER.cla, FER.esc]), R * 0.04);
      brilho(c, 0, 0, R * 0.9, '#7af0ff', 0.4 + 0.2 * Math.sin(t * 3));
      poli(c, [[0, -R * 0.42], [R * 0.24, 0], [0, R * 0.42], [-R * 0.24, 0]], grad(c, -R * 0.24, 0, R * 0.24, 0, ['#e8ffff', '#7af0ff', '#2a8aa8']), R * 0.03);
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(180,250,255,0.8)'; c.lineWidth = R * 0.025;
      for (let i = 0; i < 3; i++) { if (Math.sin(t * 7 + i * 2.3) < 0.3) continue; const a = i * 2.1 + Math.floor(t * 6) * 0.7; c.beginPath(); c.moveTo(0, 0); for (let k = 1; k <= 4; k++) c.lineTo(Math.cos(a + (hsh(Math.floor(t * 6), k, i) - 0.5)) * R * k * 0.22, Math.sin(a + (hsh(Math.floor(t * 6), k, i + 3) - 0.5)) * R * k * 0.22); c.stroke(); }
      c.restore();
    },
  });
  // o orbe: a esfera de luz que flutua e pulsa
  reg('orbe', {
    n: 'Orbe', g: 'portais', size: 1, vivo: true, calma: true, luz: { bright: 1, dim: 4, c: '#ffd77a' },
    draw(c, R, t, s) {
      const cor = ['#ffd77a', '#ff7ad8', '#7affb8', '#7ab8ff'][s % 4], h = Math.sin(t * 1.5) * R * 0.1;
      oval(c, R * 0.15, R * 0.4, R * 0.25, R * 0.12, 0, 'rgba(0,0,0,0.2)');
      brilho(c, 0, h, R * (0.9 + 0.1 * Math.sin(t * 3)), cor, 0.55);
      bola(c, 0, h, R * 0.28, radial(c, -R * 0.08, h - R * 0.08, R * 0.3, ['#ffffff', cor, cor]));
      for (let i = 0; i < 4; i++) { const a = t * 2 + i * TAU / 4; bola(c, Math.cos(a) * R * 0.45, h + Math.sin(a) * R * 0.2, R * 0.03, '#ffffff'); }
    },
  });
  // as runas no chão: as marcas gravadas que acendem uma depois da outra
  reg('runasChao', {
    n: 'Runas no chão', g: 'portais', size: 2, vivo: true, calma: true, luz: { bright: 0, dim: 2, c: '#ff9a5a' },
    draw(c, R, t, s) {
      const cor = ['#ff9a5a', '#9a7aff', '#5affc8'][s % 3];
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU + hsh(s, i, 1) * 0.4, d = R * (0.3 + hsh(s, i, 2) * 0.5), x = Math.cos(a) * d, y = Math.sin(a) * d, on = 0.5 + 0.5 * Math.sin(t * 1.5 - i * 0.9);
        c.save(); c.translate(x, y); c.rotate(hsh(s, i, 3) * 3);
        c.strokeStyle = 'rgba(40,30,30,0.7)'; c.lineWidth = R * 0.05; c.beginPath(); c.moveTo(-R * 0.1, -R * 0.12); c.lineTo(R * 0.02, R * 0.12); c.lineTo(R * 0.1, -R * 0.08); c.moveTo(-R * 0.06, 0); c.lineTo(R * 0.08, R * 0.02); c.stroke();
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = on; c.strokeStyle = cor; c.lineWidth = R * 0.03; c.stroke();
        c.restore();
        brilho(c, x, y, R * 0.22, cor, on * 0.4);
      }
    },
  });

  /* ================= TEATRO E MÚSICA ================= */
  Props.grupo('teatro', 'Teatro e música');
  // o palco com cortina: o tablado (3 × 2), a cortina vermelha dos lados e as velas da ribalta
  reg('palcoCortina', {
    n: 'Palco com cortina', g: 'teatro', size: 3, fw: 3, fh: 2, costas: 'n', legado: { w: 1, h: 0.67 }, fogo: true,
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R, b, m);
      ret(c, -R + m * 0.03, -b + m * 0.03, R * 2 - m * 0.06, b * 2 - m * 0.06, m * 0.04, grad(c, 0, -b, 0, b, [MAD.cla, MAD.med]), m * 0.035);
      c.strokeStyle = 'rgba(40,22,8,0.35)'; c.lineWidth = m * 0.012; for (let i = 1; i < 9; i++) { c.beginPath(); c.moveTo(-R + i * R * 0.222, -b); c.lineTo(-R + i * R * 0.222, b); c.stroke(); }
      ret(c, -R + m * 0.03, -b + m * 0.03, R * 2 - m * 0.06, m * 0.22, m * 0.03, '#6a1a22', m * 0.03);
      for (const k of [-1, 1]) { for (let i = 0; i < 4; i++) { const x = k * (R - m * 0.12 - i * m * 0.12); oval(c, x, -b * 0.15, m * 0.08, b * 0.8, 0, i % 2 ? '#9a2a34' : '#b8343e'); } c.beginPath(); c.rect(k > 0 ? R - m * 0.56 : -R + m * 0.04, -b + m * 0.2, m * 0.52, b * 1.5); linha(c, m * 0.02); seg(c, k * (R - m * 0.3), b * 0.2, k * (R - m * 0.45), b * 0.15, m * 0.04, '#d6a64a'); }
      for (let i = 0; i < 5; i++) { const x = -R * 0.6 + i * R * 0.3; bola(c, x, b - m * 0.12, m * 0.05, '#efe6d0'); chama(c, x, b - m * 0.12, m * 0.12, t, s + i, ang); }
    },
  });
  // o alaúde: o corpo de pera, a boca, o braço e a cabeça dobrada
  reg('alaude', {
    n: 'Alaúde', g: 'teatro', size: 1,
    draw(c, R) {
      c.save(); c.rotate(-0.6);
      oval(c, R * 0.06, R * 0.32, R * 0.36, R * 0.42, 0, 'rgba(0,0,0,0.3)');
      oval(c, 0, R * 0.25, R * 0.36, R * 0.42, 0, radial(c, -R * 0.1, R * 0.15, R * 0.5, ['#e8b878', '#c8884a', '#8a5a2a']), R * 0.035);
      bola(c, 0, R * 0.15, R * 0.1, '#2a1a0e'); c.strokeStyle = '#6a4a20'; c.lineWidth = R * 0.015; c.beginPath(); c.arc(0, R * 0.15, R * 0.13, 0, TAU); c.stroke();
      ret(c, -R * 0.05, -R * 0.6, R * 0.1, R * 0.52, R * 0.02, MAD.esc, R * 0.02);
      ret(c, -R * 0.07, -R * 0.82, R * 0.14, R * 0.24, R * 0.03, MAD.med, R * 0.02);
      for (let i = 0; i < 4; i++) seg(c, -R * 0.03 + i * R * 0.02, -R * 0.6, -R * 0.03 + i * R * 0.02, R * 0.45, R * 0.006, '#f4f0e6');
      c.restore();
    },
  });
  // o tambor: o tamborzinho de mão, com o couro e as fitas
  reg('tambor', {
    n: 'Tambor', g: 'teatro', size: 1,
    draw(c, R) {
      sombra(c, R, 0.5, 0.5);
      bola(c, 0, 0, R * 0.46, '#3a6a8a', R * 0.04);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; bola(c, Math.cos(a) * R * 0.46, Math.sin(a) * R * 0.46, R * 0.04, '#d6a64a'); }
      bola(c, 0, 0, R * 0.38, radial(c, -R * 0.1, -R * 0.1, R * 0.4, ['#f4ead0', '#dcc89a']), R * 0.02);
      seg(c, R * 0.4, R * 0.2, R * 0.75, R * 0.6, R * 0.05, '#b8322e'); seg(c, R * 0.35, R * 0.3, R * 0.6, R * 0.75, R * 0.05, '#f2d04a');
    },
  });
  // a harpa: a moldura triangular dourada e as cordas
  reg('harpa', {
    n: 'Harpa', g: 'teatro', size: 1,
    draw(c, R) {
      sombra(c, R, 0.5, 0.65);
      c.strokeStyle = '#c99a3a'; c.lineWidth = R * 0.1; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-R * 0.45, R * 0.7); c.lineTo(-R * 0.45, -R * 0.7); c.quadraticCurveTo(R * 0.2, -R * 0.75, R * 0.5, -R * 0.2); c.lineTo(-R * 0.45, R * 0.7); c.stroke();
      c.strokeStyle = '#8a6420'; c.lineWidth = R * 0.03; c.stroke();
      c.strokeStyle = 'rgba(250,245,230,0.85)'; c.lineWidth = R * 0.012;
      for (let i = 1; i < 8; i++) { const f = i / 8, y = -R * 0.7 + f * R * 1.4, x2 = -R * 0.45 + (1 - f) * R * 0.95 * (f < 0.5 ? 1 : 1); c.beginPath(); c.moveTo(-R * 0.45, y); c.lineTo(Math.min(x2, R * 0.45), y - (1 - f) * R * 0.12); c.stroke(); }
      bola(c, R * 0.5, -R * 0.2, R * 0.08, '#d6a64a', R * 0.02);
    },
  });
  // as cadeiras da plateia: a fileira de cadeiras (2 × 1)
  reg('cadeirasPlateia', {
    n: 'Cadeiras da plateia', g: 'teatro', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B);
      const q = Math.min(R * 0.21, b * 0.9);
      for (let i = 0; i < 4; i++) { const x = -R * 0.75 + i * R * 0.5; oval(c, x + q * 0.12, q * 0.15, q * 0.95, q * 0.95, 0, 'rgba(0,0,0,0.25)'); ret(c, x - q, -q * 0.75, q * 2, q * 1.7, q * 0.25, grad(c, 0, -q, 0, q, ['#b8343e', '#7a1e28']), m * 0.035); ret(c, x - q, -q * 0.98, q * 2, q * 0.45, q * 0.15, MAD.esc, m * 0.03); for (const k of [-1, 1]) ret(c, x + k * q * 0.85 - q * 0.15, -q * 0.6, q * 0.3, q * 1.4, q * 0.1, '#6a1a22'); }
    },
  });
  // a arara de figurinos: a barra com os cabides e as roupas coloridas
  reg('araraFigurinos', {
    n: 'Arara de figurinos', g: 'teatro', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B), cores = ['#8a2a6a', '#2a6a8a', '#d6a64a', '#3e7a3a', '#b8322e', '#5a3a8a'];
      somb(c, R, b * 0.7, m);
      for (let i = 0; i < 6; i++) { const x = -R * 0.8 + i * R * 0.32; c.save(); c.translate(x, 0); c.rotate((hsh(s, i, 1) - 0.5) * 0.3); poli(c, [[-R * 0.12, -b * 0.5], [R * 0.12, -b * 0.5], [R * 0.16, b * 0.6], [-R * 0.16, b * 0.6]], cores[(s + i) % 6], m * 0.025); seg(c, -R * 0.14, b * 0.45, R * 0.14, b * 0.45, m * 0.03, 'rgba(255,230,160,0.6)'); c.restore(); }
      seg(c, -R * 0.95, -b * 0.5, R * 0.95, -b * 0.5, m * 0.07, FER.cla);
      for (const k of [-1, 1]) bola(c, k * R * 0.95, -b * 0.5, m * 0.1, FER.esc);
    },
  });
  // as máscaras: a máscara alegre e a triste, com as fitas
  reg('mascaras', {
    n: 'Máscaras', g: 'teatro', size: 1,
    draw(c, R) {
      for (const [x, y, a, cor, triste] of [[-R * 0.25, -R * 0.1, -0.3, '#f4ecd8', false], [R * 0.28, R * 0.1, 0.3, '#2a2a3a', true]]) {
        c.save(); c.translate(x, y); c.rotate(a);
        oval(c, R * 0.05, R * 0.06, R * 0.36, R * 0.44, 0, 'rgba(0,0,0,0.3)');
        oval(c, 0, 0, R * 0.36, R * 0.44, 0, cor, R * 0.03);
        const olho = triste ? '#f4ecd8' : '#1a1410';
        for (const k of [-1, 1]) oval(c, k * R * 0.13, -R * 0.08, R * 0.08, R * 0.05, k * (triste ? -0.4 : 0.4), olho);
        c.strokeStyle = olho; c.lineWidth = R * 0.05; c.beginPath(); if (triste) c.arc(0, R * 0.3, R * 0.15, 3.6, 5.8); else c.arc(0, R * 0.08, R * 0.16, 0.4, 2.7); c.stroke();
        seg(c, R * 0.34, -R * 0.1, R * 0.55, -R * 0.2, R * 0.03, triste ? '#5a3a8a' : '#d6a64a');
        c.restore();
      }
    },
  });

  /* ================= CONVÉS E PORTO ================= */
  Props.grupo('conves', 'Convés e porto');
  // o leme: a roda de madeira com os oito punhos
  reg('leme', {
    n: 'Leme', g: 'conves', size: 1,
    draw(c, R) {
      sombra(c, R, 0.6, 0.6);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; seg(c, 0, 0, Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.85, R * 0.07, MAD.cla); bola(c, Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.85, R * 0.07, MAD.med, R * 0.02); }
      c.strokeStyle = MAD.med; c.lineWidth = R * 0.11; c.beginPath(); c.arc(0, 0, R * 0.58, 0, TAU); c.stroke(); c.strokeStyle = MAD.luz; c.lineWidth = R * 0.04; c.stroke();
      bola(c, 0, 0, R * 0.16, '#c9a24a', R * 0.03);
    },
  });
  // o canhão: o cano de ferro na carreta de madeira, com as balas empilhadas (2 × 1, a boca para a frente)
  reg('canhao', {
    n: 'Canhão', g: 'conves', size: 2, fw: 1, fh: 2, costas: 's', legado: { w: 0.5, h: 1 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; caixa(c, -R * 0.7, -B * 0.85, R * 1.55, B * 1.8, m * 0.15); c.fill(); c.restore();
      ret(c, -R * 0.75, -B * 0.1, R * 1.5, B * 0.95, m * 0.08, MAD.med, m * 0.04);
      for (const k of [-1, 1]) for (const y of [B * 0.1, B * 0.65]) bola(c, k * R * 0.8, y, m * 0.16, MAD.esc, m * 0.03);
      ret(c, -R * 0.38, -B * 0.95, R * 0.76, B * 1.5, m * 0.35, grad(c, -R * 0.4, 0, R * 0.4, 0, [FER.esc, FER.cla, FER.esc]), m * 0.04);
      bola(c, 0, -B * 0.9, m * 0.2, '#0a0a0c'); for (const y of [-B * 0.55, B * 0.1]) seg(c, -R * 0.4, y, R * 0.4, y, m * 0.06, FER.med);
      bola(c, 0, B * 0.6, m * 0.24, FER.med, m * 0.03);
    },
  });
  // as cordas enroladas: o rolo de corda grossa, em espiral
  reg('cordasEnroladas', {
    n: 'Cordas enroladas', g: 'conves', size: 1,
    draw(c, R) {
      sombra(c, R, 0.6, 0.6);
      bola(c, 0, 0, R * 0.62, '#b8985a', R * 0.03);
      c.strokeStyle = '#8a6a32'; c.lineWidth = R * 0.05; c.beginPath(); for (let k = 0; k <= 80; k++) { const a = k / 80 * TAU * 5, r = R * (0.08 + k / 80 * 0.52); if (k) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(r, 0); } c.stroke();
      c.strokeStyle = '#d8c08a'; c.lineWidth = R * 0.08; c.beginPath(); c.moveTo(R * 0.6, 0); c.quadraticCurveTo(R * 0.85, R * 0.3, R * 0.6, R * 0.75); c.stroke();
    },
  });
  // o mastro: o tronco redondo, o cesto de vigia e as cordas descendo para os lados
  reg('mastro', {
    n: 'Mastro', g: 'conves', size: 2,
    draw(c, R) {
      c.strokeStyle = 'rgba(140,110,60,0.7)'; c.lineWidth = R * 0.02; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98); c.stroke(); }
      c.save(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-R * 0.1, -R * 0.95, R * 0.2, R * 1.9); c.restore();
      seg(c, 0, -R * 0.95, 0, R * 0.95, R * 0.08, MAD.med);
      bola(c, 0, 0, R * 0.42, MAD.cla, R * 0.04); bola(c, 0, 0, R * 0.32, MAD.esc);
      bola(c, 0, 0, R * 0.16, radial(c, -R * 0.05, -R * 0.05, R * 0.2, [MAD.luz, MAD.med]), R * 0.03);
    },
  });
  // a âncora: o ferro com as duas unhas, a argola e a corrente
  reg('ancora', {
    n: 'Âncora', g: 'conves', size: 1,
    draw(c, R) {
      sombra(c, R, 0.55, 0.65);
      c.lineCap = 'round';
      c.strokeStyle = FER.esc; c.lineWidth = R * 0.16; c.beginPath(); c.moveTo(0, -R * 0.55); c.lineTo(0, R * 0.6); c.moveTo(-R * 0.3, -R * 0.3); c.lineTo(R * 0.3, -R * 0.3); c.moveTo(-R * 0.55, R * 0.25); c.quadraticCurveTo(0, R * 0.85, R * 0.55, R * 0.25); c.stroke();
      c.strokeStyle = FER.cla; c.lineWidth = R * 0.08; c.stroke();
      c.lineWidth = R * 0.07; c.strokeStyle = FER.med; c.beginPath(); c.arc(0, -R * 0.7, R * 0.14, 0, TAU); c.stroke();
      for (const k of [-1, 1]) poli(c, [[k * R * 0.55, R * 0.25], [k * R * 0.7, R * 0.1], [k * R * 0.48, R * 0.08]], FER.cla, R * 0.02);
      c.strokeStyle = '#5a5a60'; c.lineWidth = R * 0.03; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(R * 0.15 + i * R * 0.17, -R * 0.82 + (i % 2) * R * 0.04, R * 0.08, R * 0.05, 0, 0, TAU); c.stroke(); }
    },
  });
  // as redes de pesca: a rede estendida para secar, com as boias de cortiça
  reg('redesPesca', {
    n: 'Redes de pesca', g: 'conves', size: 2,
    draw(c, R, t, s) {
      c.save(); c.beginPath(); c.moveTo(-R * 0.9, -R * 0.7); c.quadraticCurveTo(0, -R * 0.95, R * 0.9, -R * 0.65); c.lineTo(R * 0.85, R * 0.75); c.quadraticCurveTo(0, R * 0.95, -R * 0.85, R * 0.7); c.closePath(); c.clip();
      c.strokeStyle = 'rgba(90,80,60,0.75)'; c.lineWidth = R * 0.018; for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(-R + i * R * 0.16, -R); c.lineTo(R + i * R * 0.16, R); c.stroke(); c.beginPath(); c.moveTo(R + i * R * 0.16, -R); c.lineTo(-R + i * R * 0.16, R); c.stroke(); }
      c.restore();
      for (let i = 0; i < 6; i++) { const f = i / 5, x = -R * 0.9 + f * R * 1.8, y = -R * 0.7 - Math.sin(f * Math.PI) * R * 0.2; bola(c, x, y, R * 0.07, '#c88a4a', R * 0.02); }
      bola(c, R * 0.3, R * 0.3, R * 0.1, '#9ab0c0', R * 0.02); oval(c, -R * 0.2, R * 0.4, R * 0.12, R * 0.05, 0.3, '#a8b8c8', R * 0.015);
    },
  });
  // a carga amarrada: os caixotes e os sacos sob a lona, com as cordas cruzadas
  reg('cargaAmarrada', {
    n: 'Carga amarrada', g: 'conves', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.92, 0.88);
      ret(c, -R * 0.85, -R * 0.8, R * 0.85, R * 0.8, R * 0.04, MAD.cla, R * 0.03); ret(c, R * 0.02, -R * 0.75, R * 0.8, R * 0.75, R * 0.04, MAD.med, R * 0.03);
      ret(c, -R * 0.8, R * 0.05, R * 0.75, R * 0.75, R * 0.2, '#c8b080', R * 0.03); ret(c, R * 0.05, R * 0.05, R * 0.8, R * 0.75, R * 0.04, MAD.cla, R * 0.03);
      c.save(); c.globalAlpha = 0.55; poli(c, [[-R * 0.9, -R * 0.85], [R * 0.1, -R * 0.8], [R * 0.2, R * 0.2], [-R * 0.85, R * 0.1]], '#6a7a5a'); c.restore();
      c.strokeStyle = '#d8c08a'; c.lineWidth = R * 0.045; c.beginPath(); c.moveTo(-R * 0.9, -R * 0.9); c.lineTo(R * 0.9, R * 0.9); c.moveTo(R * 0.9, -R * 0.9); c.lineTo(-R * 0.9, R * 0.9); c.moveTo(-R * 0.9, 0); c.lineTo(R * 0.9, 0); c.stroke();
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bola(c, x * R * 0.9, y * R * 0.9, R * 0.06, FER.med);
    },
  });
  // a prancha: a tábua comprida com as travessas, do cais para o navio (1 × 2)
  reg('prancha', {
    n: 'Prancha', g: 'conves', size: 2, fw: 1, fh: 2, legado: { w: 0.5, h: 1 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-R * 0.4, -B * 0.85, R * 0.95, B * 1.85); c.restore();
      ret(c, -R * 0.5, -B * 0.95, R, B * 1.9, m * 0.06, grad(c, -R * 0.5, 0, R * 0.5, 0, [MAD.cla, MAD.luz, MAD.cla]), m * 0.04);
      for (let i = 0; i < 7; i++) seg(c, -R * 0.5, -B * 0.8 + i * B * 0.27, R * 0.5, -B * 0.8 + i * B * 0.27, m * 0.06, MAD.med);
      for (const k of [-1, 1]) seg(c, k * R * 0.6, -B * 0.9, k * R * 0.6, B * 0.9, m * 0.03, '#c9b48a');
    },
  });

  /* ================= NATUREZA FANTÁSTICA ================= */
  Props.grupo('fantastica', 'Natureza fantástica');
  // o cogumelo gigante: o chapéu enorme com as pintas, que brilha de leve no escuro
  reg('cogumeloGigante', {
    n: 'Cogumelo gigante', g: 'fantastica', size: 2, calma: true, luz: { bright: 0, dim: 3, c: '#7ab8ff' },
    draw(c, R, t, s) {
      const cor = [['#c84a3a', '#8a2a20'], ['#5a7ad8', '#2a4a9a'], ['#9a5ad8', '#5a2a9a']][s % 3];
      oval(c, R * 0.15, R * 0.2, R * 0.85, R * 0.75, 0, 'rgba(0,0,0,0.3)');
      if (s % 3) brilho(c, 0, 0, R * 1.0, cor[0], 0.25);
      bola(c, 0, 0, R * 0.85, radial(c, -R * 0.25, -R * 0.3, R * 0.95, ['#ffffff', cor[0], cor[1]]), R * 0.04);
      for (let i = 0; i < 9; i++) { const a = hsh(s, i, 1) * TAU, d = R * (0.2 + hsh(s, i, 2) * 0.55); bola(c, Math.cos(a) * d, Math.sin(a) * d, R * (0.06 + hsh(s, i, 3) * 0.07), 'rgba(255,250,235,0.9)'); }
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = R * 0.02; c.beginPath(); c.arc(0, 0, R * 0.7, 0, TAU); c.stroke();
    },
  });
  // o ninho gigante: os galhos trançados, as penas e os ovos enormes
  reg('ninhoGigante', {
    n: 'Ninho gigante', g: 'fantastica', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.95, 0.95);
      c.lineCap = 'round';
      for (let i = 0; i < 40; i++) { const a = hsh(s, i, 1) * TAU, r = R * (0.6 + hsh(s, i, 2) * 0.35); seg(c, Math.cos(a) * r, Math.sin(a) * r, Math.cos(a + 0.6) * r, Math.sin(a + 0.6) * r, R * 0.06, i % 3 ? '#6a4a2a' : '#8a6a3a'); }
      bola(c, 0, 0, R * 0.6, radial(c, 0, 0, R * 0.6, ['#5a4028', '#7a5a34']));
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.5; oval(c, Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25, R * 0.2, R * 0.26, a, radial(c, Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2, R * 0.3, ['#ffffff', '#e8e0c8', '#b8b0a0']), R * 0.025); for (let j = 0; j < 3; j++) bola(c, Math.cos(a) * R * 0.25 + (hsh(s, i * 3 + j, 4) - 0.5) * R * 0.2, Math.sin(a) * R * 0.25 + (hsh(s, i * 3 + j, 5) - 0.5) * R * 0.25, R * 0.025, '#8a7a5a'); }
      for (let i = 0; i < 3; i++) { const a = hsh(s, i, 7) * TAU; oval(c, Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.75, R * 0.2, R * 0.05, a, '#d8c8b0'); }
    },
  });
  // os cristais no chão: as pontas de cristal saindo da pedra, brilhando
  reg('cristaisChao', {
    n: 'Cristais no chão', g: 'fantastica', size: 1, calma: true, luz: { bright: 1, dim: 3, c: '#e07aff' },
    draw(c, R, t, s) {
      const cor = [['#f4d8ff', '#c87aff', '#6a2a9a'], ['#d8f4ff', '#7ad0ff', '#2a6a9a'], ['#fff2d0', '#ffb84a', '#9a5a1a']][s % 3];
      pedrinha(c, 0, R * 0.15, R * 0.5, s);
      brilho(c, 0, 0, R * 0.95, cor[1], 0.35);
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.45, L = R * (0.45 + hsh(s, i, 1) * 0.4), x0 = Math.cos(a + Math.PI) * R * 0.1, y0 = R * 0.1, w = R * 0.1; c.save(); c.translate(x0, y0); c.rotate(a + Math.PI / 2); poli(c, [[-w, 0], [-w * 0.7, -L * 0.85], [0, -L], [w * 0.7, -L * 0.85], [w, 0]], grad(c, -w, 0, w, 0, cor), R * 0.02); c.restore(); }
    },
  });
  // a teia gigante: os fios esticados de canto a canto, os casulos e a aranha (às vezes)
  reg('teiaGigante', {
    n: 'Teia gigante', g: 'fantastica', size: 2,
    draw(c, R, t, s) {
      c.strokeStyle = 'rgba(235,235,240,0.75)'; c.lineWidth = R * 0.015;
      const n = 10;
      for (let i = 0; i < n; i++) { const a = i / n * TAU + hsh(s, i, 1) * 0.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98); c.stroke(); }
      for (let k = 1; k <= 7; k++) { c.beginPath(); for (let i = 0; i <= n; i++) { const a = (i % n) / n * TAU + hsh(s, i % n, 1) * 0.2, r = R * k * 0.13 * (0.92 + hsh(s, i % n, k) * 0.12); if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke(); }
      for (let i = 0; i < 2; i++) { const a = hsh(s, i, 9) * TAU; oval(c, Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, R * 0.1, R * 0.17, a, '#e8e4d8', R * 0.02); }
      if (s % 2) { bola(c, R * 0.1, -R * 0.05, R * 0.12, '#1a1418'); bola(c, R * 0.1, R * 0.1, R * 0.08, '#2a2028'); c.strokeStyle = '#1a1418'; c.lineWidth = R * 0.025; for (const k of [-1, 1]) for (let j = 0; j < 4; j++) { c.beginPath(); c.moveTo(R * 0.1, 0); c.lineTo(R * 0.1 + k * R * 0.25, -R * 0.2 + j * R * 0.13); c.lineTo(R * 0.1 + k * R * 0.32, -R * 0.12 + j * R * 0.15); c.stroke(); } bola(c, R * 0.06, -R * 0.1, R * 0.02, '#e83a3a'); bola(c, R * 0.14, -R * 0.1, R * 0.02, '#e83a3a'); }
    },
  });
  // a flor carnívora: a boca de pétalas com os dentes, que abre e fecha devagar
  reg('florCarnivora', {
    n: 'Flor carnívora', g: 'fantastica', size: 1, vivo: true,
    draw(c, R, t, s) {
      sombra(c, R, 0.62, 0.62);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; oval(c, Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, R * 0.3, R * 0.12, a, '#3f7a34', R * 0.02); }
      const ab = 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(t * 0.9));
      for (const k of [-1, 1]) {
        c.save(); c.scale(1, k);
        c.beginPath(); c.moveTo(-R * 0.4, 0); c.quadraticCurveTo(0, -R * (0.3 + ab), R * 0.4, 0); c.closePath(); c.fillStyle = radial(c, 0, -R * 0.2, R * 0.5, ['#ff8aa8', '#c83a5a', '#7a1a3a']); c.fill(); linha(c, R * 0.025);
        c.fillStyle = '#f8f4e8'; for (let j = 0; j < 5; j++) { const x = -R * 0.3 + j * R * 0.15; c.beginPath(); c.moveTo(x - R * 0.04, -R * 0.02); c.lineTo(x, -R * 0.12); c.lineTo(x + R * 0.04, -R * 0.02); c.fill(); }
        c.restore();
      }
      oval(c, 0, 0, R * 0.38, R * 0.04, 0, '#3a0a1a');
      for (let i = 0; i < 6; i++) bola(c, Math.cos(i) * R * 0.2, Math.sin(i * 1.7) * R * 0.25, R * 0.025, '#fff2a8');
    },
  });
  // a toca: o buraco na terra, com a terra revirada e as marcas de garra (o que mora lá não aparece)
  reg('toca', {
    n: 'Toca', g: 'fantastica', size: 1,
    draw(c, R, t, s) {
      oval(c, 0, R * 0.05, R * 0.75, R * 0.62, 0, radial(c, 0, 0, R * 0.75, ['#8a6a44', '#6a5032', '#5a4228']));
      for (let i = 0; i < 6; i++) { const a = hsh(s, i, 1) * TAU; pedrinha(c, Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.5, R * 0.08, s + i, { esc: '#3a2e20', med: '#6a5032', cla: '#8a6a44', luz: '#a8885a' }); }
      oval(c, 0, 0, R * 0.38, R * 0.3, 0, radial(c, 0, R * 0.05, R * 0.38, ['#000000', '#120c06', '#2a1e12']), R * 0.03);
      c.strokeStyle = 'rgba(40,28,16,0.7)'; c.lineWidth = R * 0.03; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(R * 0.45 + i * R * 0.08, -R * 0.45); c.lineTo(R * 0.35 + i * R * 0.08, -R * 0.2); c.stroke(); }
      for (const k of [-1, 1]) bola(c, k * R * 0.07, -R * 0.02, R * 0.025, Math.sin(t * 0.7 + s) > 0.85 ? '#ffd84a' : 'rgba(0,0,0,0)');
    },
    vivo: true,
  });
  // a árvore oca: o tronco largo, com o buraco no meio (dá para entrar) e as raízes grossas
  reg('arvoreOca', {
    n: 'Árvore oca', g: 'fantastica', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.95, 0.95, 0.12, 0.15);
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + hsh(s, i, 1) * 0.4; c.lineCap = 'round'; seg(c, Math.cos(a) * R * 0.45, Math.sin(a) * R * 0.45, Math.cos(a + 0.15) * R * 0.95, Math.sin(a + 0.15) * R * 0.95, R * 0.14, '#5a4028'); seg(c, Math.cos(a) * R * 0.45, Math.sin(a) * R * 0.45, Math.cos(a + 0.15) * R * 0.95, Math.sin(a + 0.15) * R * 0.95, R * 0.06, '#7a5a3a'); }
      bola(c, 0, 0, R * 0.62, radial(c, -R * 0.2, -R * 0.2, R * 0.7, ['#9a7a54', '#7a5a3a', '#5a4028']), R * 0.04);
      c.strokeStyle = 'rgba(40,28,16,0.45)'; c.lineWidth = R * 0.025; for (const r of [0.5, 0.42]) { c.beginPath(); c.arc(0, 0, R * r, 0, TAU); c.stroke(); }
      bola(c, 0, 0, R * 0.32, radial(c, 0, 0, R * 0.32, ['#000000', '#0e0a06', '#2a1e12']), R * 0.03);
      folhas(c, R * 0.5, -R * 0.55, R * 0.35, s, ['#2f6a34', '#4a8a44', '#6aa85a'], 4);
    },
  });
})();
