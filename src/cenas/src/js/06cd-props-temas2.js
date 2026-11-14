/* ---------------------------------------------------------------
   6cd. OS OBJETOS DOS TEMAS, parte 2 (lote 158):
     · Ruínas antigas: a coluna quebrada caída, a estátua sem cabeça, o obelisco, o portal de pedra, o mosaico rachado,
       o altar com musgo e a escadaria partida;
     · Inverno e montanha: o boneco de neve, o trenó, o pinheiro nevado, o iglu, as estalactites de gelo, as pegadas na
       neve e o lago congelado;
     · Deserto e oásis: a tenda do deserto, o camelo, a palmeira, o tapete com almofadas, os jarros d'água, a caveira de
       boi e a duna;
     · Pântano e brejo: a cabana na palafita, o barco de junco, os juncos, a ponte de tábuas, o caldeirão da bruxa, o
       tronco podre e o sapo gigante;
     · Esgoto e subterrâneo: a grade de esgoto, os canos, o ninho de ratos, a passarela de ferro, a comporta, o monte
       de lixo e a escada de ferro.
   --------------------------------------------------------------- */
(() => {
  const { caixa, linha, grad, radial, hsh, MAD, PED, FER, chama, sombra, pedrinha } = Props.kit;
  const { bola, oval, ret, seg, poli, somb, brilho, mm } = Props.kitT;
  const reg = (id, def) => Props.registrar(id, def);
  const MUSGO = ['#3f6a34', '#5a8a44', '#7aa85a'];
  const musgo = (c, R, s, n, raio) => { for (let i = 0; i < n; i++) bola(c, (hsh(s, i, 11) - 0.5) * raio * 2, (hsh(s, i, 12) - 0.5) * raio * 2, R * (0.06 + hsh(s, i, 13) * 0.08), MUSGO[i % 3]); };

  /* ================= RUÍNAS ANTIGAS ================= */
  Props.grupo('ruinas', 'Ruínas antigas');
  // a coluna quebrada, caída no chão: o fuste com as caneluras, a base e os pedaços
  reg('colunaQuebrada', {
    n: 'Coluna caída', g: 'ruinas', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R * 0.9, b * 0.7, m);
      ret(c, -R * 0.7, -b * 0.55, R * 1.35, b * 1.1, m * 0.4, grad(c, 0, -b * 0.55, 0, b * 0.55, [PED.luz, PED.cla, PED.med]), m * 0.05);
      c.strokeStyle = 'rgba(70,74,82,0.45)'; c.lineWidth = m * 0.03; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(-R * 0.65, i * b * 0.18); c.lineTo(R * 0.6, i * b * 0.18); c.stroke(); }
      ret(c, -R * 0.95, -b * 0.75, R * 0.3, b * 1.5, m * 0.08, PED.cla, m * 0.05);
      poli(c, [[R * 0.62, -b * 0.55], [R * 0.75, -b * 0.2], [R * 0.68, b * 0.1], [R * 0.78, b * 0.55], [R * 0.62, b * 0.55]], PED.med, m * 0.04);
      pedrinha(c, R * 0.9, -b * 0.4, m * 0.12, s); pedrinha(c, R * 0.88, b * 0.45, m * 0.09, s + 1);
      musgo(c, R, s, 5, R * 0.4);
    },
  });
  // a estátua sem cabeça: o pedestal, o corpo com o manto e o pescoço partido
  reg('estatuaSemCabeca', {
    n: 'Estátua sem cabeça', g: 'ruinas', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.72, 0.72);
      ret(c, -R * 0.75, -R * 0.75, R * 1.5, R * 1.5, R * 0.08, grad(c, -R, -R, R, R, [PED.cla, PED.med]), R * 0.05);
      oval(c, 0, R * 0.05, R * 0.5, R * 0.42, 0, radial(c, -R * 0.15, -R * 0.15, R * 0.6, ['#d8d4c8', '#a8a498', '#7a776e']), R * 0.04);
      for (const k of [-1, 1]) oval(c, k * R * 0.42, 0, R * 0.14, R * 0.22, 0, '#b8b4a8', R * 0.03);
      bola(c, 0, -R * 0.12, R * 0.15, '#8a867a', R * 0.03); poli(c, [[-R * 0.1, -R * 0.15], [-R * 0.02, -R * 0.08], [R * 0.06, -R * 0.17], [R * 0.1, -R * 0.1]], '#6a665c');
      pedrinha(c, R * 0.55, R * 0.55, R * 0.15, s, { esc: '#5a564e', med: '#8a867a', cla: '#b8b4a8', luz: '#d8d4c8' });
      musgo(c, R, s, 4, R * 0.6);
    },
  });
  // o obelisco: a agulha de pedra com as inscrições, vista de cima (a ponta em pirâmide)
  reg('obelisco', {
    n: 'Obelisco', g: 'ruinas', size: 1,
    draw(c, R, t, s) {
      c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.moveTo(-R * 0.4, -R * 0.4); c.lineTo(R * 0.95, R * 0.75); c.lineTo(R * 0.6, R * 0.95); c.lineTo(-R * 0.4, R * 0.4); c.fill(); c.restore();
      ret(c, -R * 0.55, -R * 0.55, R * 1.1, R * 1.1, R * 0.04, PED.med, R * 0.05);
      poli(c, [[-R * 0.42, -R * 0.42], [R * 0.42, -R * 0.42], [0, 0]], PED.luz); poli(c, [[R * 0.42, -R * 0.42], [R * 0.42, R * 0.42], [0, 0]], PED.cla);
      poli(c, [[R * 0.42, R * 0.42], [-R * 0.42, R * 0.42], [0, 0]], PED.med); poli(c, [[-R * 0.42, R * 0.42], [-R * 0.42, -R * 0.42], [0, 0]], PED.cla);
      c.beginPath(); c.rect(-R * 0.42, -R * 0.42, R * 0.84, R * 0.84); linha(c, R * 0.04);
      c.strokeStyle = 'rgba(40,40,46,0.6)'; c.lineWidth = R * 0.025; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-R * 0.5 + i * R * 0.1, R * 0.5); c.lineTo(-R * 0.5 + i * R * 0.1, R * 0.44); c.stroke(); }
      musgo(c, R, s, 3, R * 0.5);
    },
  });
  // o portal de pedra: os dois pilares e a viga de cima (o arco antigo), com as runas apagadas
  reg('portalPedra', {
    n: 'Portal de pedra', g: 'ruinas', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R, b * 0.6, m);
      for (const k of [-1, 1]) ret(c, k * R * 0.72 - m * 0.28, -b * 0.6, m * 0.56, b * 1.2, m * 0.06, grad(c, 0, -b, 0, b, [PED.cla, PED.med]), m * 0.05);
      ret(c, -R * 0.98, -m * 0.25, R * 1.96, m * 0.5, m * 0.06, grad(c, 0, -m * 0.25, 0, m * 0.25, [PED.luz, PED.cla]), m * 0.05);
      c.strokeStyle = 'rgba(60,64,72,0.55)'; c.lineWidth = m * 0.03; for (let i = 0; i < 5; i++) { const x = -R * 0.45 + i * R * 0.22; c.beginPath(); c.moveTo(x, -m * 0.1); c.lineTo(x + m * 0.06, m * 0.1); c.lineTo(x + m * 0.12, -m * 0.05); c.stroke(); }
      musgo(c, R, s, 4, R * 0.8);
    },
  });
  // o mosaico rachado: o piso de ladrilhos coloridos (o sol no meio), com a rachadura e as peças soltas
  reg('mosaico', {
    n: 'Mosaico rachado', g: 'ruinas', size: 2,
    draw(c, R, t, s) {
      const cores = ['#c96a3a', '#d6a64a', '#3a6a8a', '#e8dcc0', '#8a3a3a'];
      c.save(); c.beginPath(); c.arc(0, 0, R * 0.95, 0, TAU); c.clip();
      const n = 10, q = R * 2 / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = -R + i * q, y = -R + j * q, d = Math.hypot(x + q / 2, y + q / 2) / R; if (hsh(s, i * n + j, 4) < 0.08) continue; c.fillStyle = cores[Math.floor(d * 5 + (i + j) % 2) % 5]; c.globalAlpha = 0.82; c.fillRect(x + q * 0.06, y + q * 0.06, q * 0.88, q * 0.88); }
      c.globalAlpha = 1; c.restore();
      c.strokeStyle = 'rgba(30,26,22,0.6)'; c.lineWidth = R * 0.03; c.beginPath(); c.arc(0, 0, R * 0.95, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(20,16,12,0.8)'; c.lineWidth = R * 0.035; c.beginPath(); c.moveTo(-R * 0.8, -R * 0.4); c.lineTo(-R * 0.3, -R * 0.1); c.lineTo(-R * 0.1, R * 0.3); c.lineTo(R * 0.4, R * 0.5); c.lineTo(R * 0.7, R * 0.4); c.stroke();
      musgo(c, R, s, 6, R * 0.8);
    },
  });
  // o altar com musgo: a laje de pedra, as velas apagadas e as oferendas velhas
  reg('altarMusgo', {
    n: 'Altar com musgo', g: 'ruinas', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.8, 0.6);
      ret(c, -R * 0.82, -R * 0.55, R * 1.64, R * 1.1, R * 0.06, grad(c, 0, -R * 0.55, 0, R * 0.55, [PED.luz, PED.cla]), R * 0.05);
      c.strokeStyle = 'rgba(60,64,72,0.5)'; c.lineWidth = R * 0.03; c.beginPath(); c.arc(0, 0, R * 0.28, 0, TAU); c.moveTo(-R * 0.28, 0); c.lineTo(R * 0.28, 0); c.moveTo(0, -R * 0.28); c.lineTo(0, R * 0.28); c.stroke();
      for (const x of [-R * 0.6, R * 0.6]) { bola(c, x, -R * 0.3, R * 0.08, '#e8dcc0', R * 0.02); bola(c, x, -R * 0.3, R * 0.025, '#2a2018'); }
      bola(c, R * 0.45, R * 0.28, R * 0.1, '#7a2f3a', R * 0.02);
      musgo(c, R, s, 9, R * 0.75);
    },
  });
  // a escadaria partida: os degraus que sobem e acabam no nada, com o entulho
  reg('escadariaPartida', {
    n: 'Escadaria partida', g: 'ruinas', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.9, 0.95);
      for (let i = 0; i < 6; i++) { const y = R * 0.85 - i * R * 0.3, w = R * (1.7 - (i > 3 ? (i - 3) * 0.4 : 0)); ret(c, -R * 0.85, y - R * 0.28, w, R * 0.3, R * 0.03, grad(c, 0, y - R * 0.28, 0, y, [i % 2 ? PED.luz : PED.cla, PED.med]), R * 0.025); }
      poli(c, [[R * 0.0, -R * 0.95], [R * 0.3, -R * 0.75], [R * 0.15, -R * 0.55], [R * 0.4, -R * 0.4], [-R * 0.05, -R * 0.35]], 'rgba(20,16,12,0.65)');
      for (let i = 0; i < 4; i++) pedrinha(c, R * (0.45 + hsh(s, i, 1) * 0.4), -R * (0.2 + hsh(s, i, 2) * 0.6), R * (0.07 + hsh(s, i, 3) * 0.06), s + i);
      musgo(c, R, s, 5, R * 0.7);
    },
  });

  /* ================= INVERNO E MONTANHA ================= */
  Props.grupo('inverno', 'Inverno e montanha');
  const NEVE = ['#ffffff', '#e8f0f8', '#c8d6e6'];
  // o boneco de neve: as três bolas, o nariz de cenoura, o cachecol e o chapéu
  reg('bonecoNeve', {
    n: 'Boneco de neve', g: 'inverno', size: 1,
    draw(c, R) {
      sombra(c, R, 0.6, 0.6);
      bola(c, 0, R * 0.2, R * 0.52, radial(c, -R * 0.15, 0, R * 0.6, NEVE), R * 0.03);
      bola(c, 0, -R * 0.15, R * 0.36, radial(c, -R * 0.1, -R * 0.25, R * 0.45, NEVE), R * 0.03);
      c.strokeStyle = '#b8322e'; c.lineWidth = R * 0.1; c.beginPath(); c.arc(0, -R * 0.15, R * 0.3, 0.5, 2.6); c.stroke(); seg(c, R * 0.2, R * 0.05, R * 0.32, R * 0.35, R * 0.08, '#b8322e');
      bola(c, 0, -R * 0.32, R * 0.24, '#22262c', R * 0.03); bola(c, 0, -R * 0.32, R * 0.15, '#3d434c');
      poli(c, [[-R * 0.04, -R * 0.06], [R * 0.04, -R * 0.06], [0, R * 0.12]], '#ee8a2a');
      for (const y of [R * 0.08, R * 0.25, R * 0.42]) bola(c, 0, y, R * 0.035, '#22262c');
      for (const k of [-1, 1]) seg(c, k * R * 0.45, R * 0.1, k * R * 0.85, -R * 0.15, R * 0.04, MAD.esc);
    },
  });
  // o trenó: as duas lâminas curvas, as tábuas e a carga amarrada
  reg('treno', {
    n: 'Trenó', g: 'inverno', size: 2, fw: 1, fh: 2, legado: { w: 0.5, h: 1 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.25)'; caixa(c, -R * 0.7, -B * 0.85, R * 1.6, B * 1.8, m * 0.2); c.fill(); c.restore();
      for (const k of [-1, 1]) { c.strokeStyle = FER.cla; c.lineWidth = m * 0.08; c.beginPath(); c.moveTo(k * R * 0.7, B * 0.85); c.lineTo(k * R * 0.7, -B * 0.6); c.quadraticCurveTo(k * R * 0.7, -B * 0.95, k * R * 0.4, -B * 0.95); c.stroke(); }
      for (let i = 0; i < 6; i++) ret(c, -R * 0.75, -B * 0.6 + i * B * 0.25, R * 1.5, B * 0.2, m * 0.03, i % 2 ? MAD.cla : MAD.med, m * 0.03);
      ret(c, -R * 0.5, -B * 0.2, R * 1.0, B * 0.75, m * 0.12, '#8a6a4a', m * 0.04);
      seg(c, -R * 0.55, B * 0.15, R * 0.55, B * 0.15, m * 0.05, '#c9a878'); seg(c, 0, -B * 0.25, 0, B * 0.6, m * 0.05, '#c9a878');
    },
  });
  // o pinheiro nevado: as camadas de galhos, com a neve por cima
  reg('pinheiroNevado', {
    n: 'Pinheiro nevado', g: 'inverno', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.85, 0.85, 0.15, 0.18);
      for (let k = 0; k < 4; k++) {
        const r = R * (0.9 - k * 0.2), n = 9 - k;
        c.beginPath(); for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * TAU + k * 0.3, rr = i % 2 ? r * 0.72 : r; if (i) c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        c.closePath(); c.fillStyle = ['#1e4a34', '#245a3e', '#2a6a48', '#327a52'][k]; c.fill(); linha(c, R * 0.025, 'rgba(10,30,20,0.6)');
        for (let i = 0; i < n; i++) { const a = i / n * TAU + k * 0.3 + 0.2; oval(c, Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75, r * 0.18, r * 0.1, a, 'rgba(250,252,255,0.9)'); }
      }
      bola(c, 0, 0, R * 0.12, '#fbfdff');
    },
  });
  // o iglu: a cúpula de blocos de gelo e a entrada (o túnel)
  reg('iglu', {
    n: 'Iglu', g: 'inverno', size: 2,
    draw(c, R) {
      sombra(c, R, 0.85, 0.85);
      ret(c, -R * 0.22, R * 0.4, R * 0.44, R * 0.55, R * 0.18, radial(c, 0, R * 0.6, R * 0.5, NEVE), R * 0.03);
      bola(c, 0, 0, R * 0.78, radial(c, -R * 0.25, -R * 0.3, R * 0.95, NEVE), R * 0.035);
      c.strokeStyle = 'rgba(130,160,190,0.6)'; c.lineWidth = R * 0.02;
      for (const r of [0.25, 0.5]) { c.beginPath(); c.arc(0, 0, R * r, 0, TAU); c.stroke(); }
      for (let k = 0; k < 3; k++) { const r0 = k * 0.25, r1 = r0 + 0.25, n = 4 + k * 4; for (let i = 0; i < n; i++) { const a = (i + (k % 2) * 0.5) / n * TAU; c.beginPath(); c.moveTo(Math.cos(a) * R * r0 * 1.0 + 0.0001, Math.sin(a) * R * r0); c.lineTo(Math.cos(a) * R * Math.min(0.78, r1), Math.sin(a) * R * Math.min(0.78, r1)); c.stroke(); } }
      ret(c, -R * 0.12, R * 0.75, R * 0.24, R * 0.18, R * 0.08, '#2a3a4a');
    },
  });
  // as estalactites de gelo: os pingentes pendurados (vistos de cima, como agulhas brilhando) e a poça congelada
  reg('estalactitesGelo', {
    n: 'Estalactites de gelo', g: 'inverno', size: 1, calma: true, luz: { bright: 0, dim: 1.5, c: '#bfe6ff' },
    draw(c, R, t, s) {
      oval(c, 0, R * 0.1, R * 0.75, R * 0.6, 0, 'rgba(190,225,250,0.55)');
      for (let i = 0; i < 7; i++) { const x = (hsh(s, i, 1) - 0.5) * R * 1.2, y = (hsh(s, i, 2) - 0.5) * R * 1.1, r = R * (0.1 + hsh(s, i, 3) * 0.12); poli(c, [[x, y - r * 2], [x + r, y], [x, y + r * 0.6], [x - r, y]], grad(c, x - r, y, x + r, y, ['#e8f6ff', '#9fd0f0', '#5a9ac8']), R * 0.02); }
      brilho(c, 0, 0, R * 0.7, '#bfe6ff', 0.3);
    },
  });
  // as pegadas na neve: a trilha de passos (de gente, de animal grande, ou de algo maior)
  reg('pegadas', {
    n: 'Pegadas na neve', g: 'inverno', size: 1,
    draw(c, R, t, s) {
      const tipo = s % 3;
      for (let i = 0; i < 5; i++) {
        const y = R * 0.85 - i * R * 0.42, x = (i % 2 ? 1 : -1) * R * (tipo === 2 ? 0.3 : 0.18);
        c.save(); c.translate(x, y);
        if (tipo === 1) { oval(c, 0, 0, R * 0.1, R * 0.12, 0, 'rgba(110,140,170,0.55)'); for (let j = 0; j < 4; j++) bola(c, (j - 1.5) * R * 0.07, -R * 0.15, R * 0.035, 'rgba(110,140,170,0.55)'); }
        else oval(c, 0, 0, R * (tipo === 2 ? 0.2 : 0.08), R * (tipo === 2 ? 0.28 : 0.16), 0, 'rgba(110,140,170,0.5)');
        c.restore();
      }
    },
  });
  // o lago congelado: o gelo azulado, as rachaduras e o buraco de pesca
  reg('lagoCongelado', {
    n: 'Lago congelado', g: 'inverno', size: 2,
    draw(c, R, t, s) {
      c.beginPath(); for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU, r = R * (0.85 + hsh(s, i % 12, 1) * 0.12); if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(r, 0); }
      c.closePath(); c.fillStyle = radial(c, -R * 0.2, -R * 0.2, R, ['#e6f4fc', '#b8daf0', '#8abde0']); c.fill(); linha(c, R * 0.03, 'rgba(240,248,255,0.9)');
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = R * 0.018;
      for (let i = 0; i < 5; i++) { const a = hsh(s, i, 3) * TAU; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.1, Math.sin(a) * R * 0.1); c.lineTo(Math.cos(a + 0.3) * R * 0.45, Math.sin(a + 0.3) * R * 0.45); c.lineTo(Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.75); c.stroke(); }
      bola(c, R * 0.3, R * 0.25, R * 0.12, '#2a5a7a', R * 0.02);
    },
  });

  /* ================= DESERTO E OÁSIS ================= */
  Props.grupo('deserto', 'Deserto e oásis');
  // a tenda do deserto: o pano listrado esticado nas estacas, com a entrada aberta
  reg('tendaDeserto', {
    n: 'Tenda do deserto', g: 'deserto', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.95, 0.85, 0.12, 0.15);
      const cores = [['#c84a3a', '#f0dcb0'], ['#3a5a8a', '#f0dcb0'], ['#7a4a2a', '#e8c890']][s % 3];
      poli(c, [[-R * 0.92, -R * 0.75], [0, -R * 0.55], [R * 0.92, -R * 0.75], [R * 0.85, R * 0.75], [0, R * 0.6], [-R * 0.85, R * 0.75]], cores[1], R * 0.04);
      c.save(); c.beginPath(); c.moveTo(-R * 0.92, -R * 0.75); c.lineTo(0, -R * 0.55); c.lineTo(R * 0.92, -R * 0.75); c.lineTo(R * 0.85, R * 0.75); c.lineTo(0, R * 0.6); c.lineTo(-R * 0.85, R * 0.75); c.closePath(); c.clip();
      c.fillStyle = cores[0]; for (let i = 0; i < 6; i++) c.fillRect(-R + i * R * 0.36, -R, R * 0.16, R * 2); c.restore();
      seg(c, 0, -R * 0.55, 0, R * 0.6, R * 0.04, 'rgba(60,30,10,0.6)');
      poli(c, [[-R * 0.2, R * 0.6], [0, R * 0.25], [R * 0.2, R * 0.6]], '#2a1a10');
      for (const [x, y] of [[-R * 0.92, -R * 0.75], [R * 0.92, -R * 0.75], [R * 0.85, R * 0.75], [-R * 0.85, R * 0.75]]) bola(c, x, y, R * 0.05, MAD.esc);
    },
  });
  // o camelo deitado: o corpo com as duas corcovas, o pescoço e a sela
  reg('camelo', {
    n: 'Camelo', g: 'deserto', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, vivo: true,
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B), cor = ['#c8955a', '#b8844a'], mx = Math.sin(t * 0.8) * m * 0.05;
      somb(c, R * 0.85, b * 0.7, m);
      oval(c, R * 0.05, 0, R * 0.65, b * 0.62, 0, radial(c, 0, -b * 0.2, R * 0.7, ['#ddb07a', cor[0], cor[1]]), m * 0.05);
      for (const x of [-R * 0.15, R * 0.3]) bola(c, x, 0, m * 0.3, '#d4a46a', m * 0.03);
      ret(c, -R * 0.05, -b * 0.55, R * 0.25, b * 1.1, m * 0.06, '#8a2a2a', m * 0.03);
      seg(c, -R * 0.55, 0, -R * 0.85, mx, m * 0.22, cor[0]);
      oval(c, -R * 0.88, mx, m * 0.24, m * 0.17, 0, cor[1], m * 0.03); bola(c, -R * 0.98, mx - m * 0.06, m * 0.03, '#1a1410');
      seg(c, R * 0.68, 0, R * 0.85, b * 0.2, m * 0.05, cor[1]);
    },
  });
  // a palmeira: as folhas longas em leque, os cocos e o tronco (só a coroa, vista de cima)
  reg('palmeira', {
    n: 'Palmeira', g: 'deserto', size: 2, vivo: true,
    draw(c, R, t, s) {
      sombra(c, R, 0.9, 0.9, 0.3, 0.35);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU + hsh(s, i, 1) * 0.3 + Math.sin(t * 0.7 + i) * 0.03, L = R * (0.75 + hsh(s, i, 2) * 0.22);
        c.save(); c.rotate(a);
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * 0.5, -L * 0.22, L, 0); c.quadraticCurveTo(L * 0.5, L * 0.22, 0, 0); c.fillStyle = i % 2 ? '#4f8a3e' : '#3f7a34'; c.fill(); linha(c, R * 0.02, 'rgba(20,50,20,0.6)');
        c.strokeStyle = 'rgba(200,230,150,0.5)'; c.lineWidth = R * 0.015; c.beginPath(); c.moveTo(0, 0); c.lineTo(L * 0.95, 0); c.stroke();
        c.restore();
      }
      for (let i = 0; i < 3; i++) bola(c, Math.cos(i * 2.1) * R * 0.1, Math.sin(i * 2.1) * R * 0.1, R * 0.08, '#6a4a22', R * 0.015);
      bola(c, 0, 0, R * 0.08, '#8a6a3a');
    },
  });
  // o tapete com almofadas: o tapete bordado, as almofadas e o bule de chá
  reg('tapeteAlmofadas', {
    n: 'Tapete com almofadas', g: 'deserto', size: 2,
    draw(c, R, t, s) {
      ret(c, -R * 0.92, -R * 0.75, R * 1.84, R * 1.5, R * 0.04, '#8a2a3a', R * 0.03);
      c.strokeStyle = '#d6a64a'; c.lineWidth = R * 0.04; c.strokeRect(-R * 0.8, -R * 0.63, R * 1.6, R * 1.26);
      c.save(); c.translate(0, 0); c.rotate(Math.PI / 4); c.strokeStyle = '#2f5a7a'; c.lineWidth = R * 0.05; c.strokeRect(-R * 0.3, -R * 0.3, R * 0.6, R * 0.6); c.restore();
      const cores = ['#d6a64a', '#2f5a7a', '#6a3a8a', '#c86a3a'];
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.3, x = Math.cos(a) * R * 0.62, y = Math.sin(a) * R * 0.5; ret(c, x - R * 0.2, y - R * 0.16, R * 0.4, R * 0.32, R * 0.12, cores[i], R * 0.025); bola(c, x, y, R * 0.04, 'rgba(255,240,200,0.6)'); }
      bola(c, 0, 0, R * 0.14, '#c9a24a', R * 0.025); seg(c, R * 0.12, -R * 0.02, R * 0.25, -R * 0.1, R * 0.04, '#c9a24a');
      for (const [x, y] of [[-R * 0.22, R * 0.15], [R * 0.2, R * 0.2]]) bola(c, x, y, R * 0.06, '#e8dcc0', R * 0.015);
    },
  });
  // os jarros d'água: as ânforas de barro grandes, com a tampa de pano
  reg('jarrosAgua', {
    n: 'Jarros d\'água', g: 'deserto', size: 1,
    draw(c, R, t, s) {
      for (const [x, y, r] of [[-R * 0.32, -R * 0.25, 0.36], [R * 0.35, -R * 0.1, 0.3], [-R * 0.05, R * 0.38, 0.3]]) {
        oval(c, x + R * 0.06, y + R * 0.08, R * r * 1.05, R * r * 1.05, 0, 'rgba(0,0,0,0.3)');
        bola(c, x, y, R * r, radial(c, x - R * r * 0.3, y - R * r * 0.3, R * r * 1.2, ['#e0a878', '#b8683a', '#7a3e1e']), R * 0.035);
        bola(c, x, y, R * r * 0.42, '#d8c8a0', R * 0.02); bola(c, x, y, R * r * 0.42, 'rgba(60,110,150,0.5)');
      }
    },
  });
  // a caveira de boi: o crânio comprido, os chifres curvos, meio enterrado na areia
  reg('caveiraBoi', {
    n: 'Caveira de boi', g: 'deserto', size: 1,
    draw(c, R) {
      oval(c, R * 0.05, R * 0.15, R * 0.6, R * 0.35, 0, 'rgba(200,160,100,0.5)');
      c.strokeStyle = '#e8dcc0'; c.lineWidth = R * 0.12; c.lineCap = 'round';
      for (const k of [-1, 1]) { c.beginPath(); c.moveTo(k * R * 0.2, -R * 0.25); c.quadraticCurveTo(k * R * 0.8, -R * 0.35, k * R * 0.85, -R * 0.75); c.stroke(); }
      c.strokeStyle = 'rgba(80,60,40,0.5)'; c.lineWidth = R * 0.03; for (const k of [-1, 1]) { c.beginPath(); c.moveTo(k * R * 0.2, -R * 0.25); c.quadraticCurveTo(k * R * 0.8, -R * 0.35, k * R * 0.85, -R * 0.75); c.stroke(); }
      poli(c, [[-R * 0.3, -R * 0.35], [R * 0.3, -R * 0.35], [R * 0.2, R * 0.2], [R * 0.1, R * 0.6], [-R * 0.1, R * 0.6], [-R * 0.2, R * 0.2]], radial(c, 0, -R * 0.1, R * 0.7, ['#f6eedc', '#e2d7bd', '#b0a284']), R * 0.035);
      for (const k of [-1, 1]) oval(c, k * R * 0.13, -R * 0.1, R * 0.08, R * 0.1, 0, '#1e1812');
      for (const k of [-1, 1]) oval(c, k * R * 0.05, R * 0.45, R * 0.03, R * 0.05, 0, '#3a2e22');
    },
  });
  // a duna: o monte de areia com a crista e as marcas do vento
  reg('duna', {
    n: 'Duna', g: 'deserto', size: 2,
    draw(c, R, t, s) {
      c.beginPath(); c.moveTo(-R * 0.95, R * 0.5); c.quadraticCurveTo(-R * 0.5, -R * 0.9, R * 0.2, -R * 0.6); c.quadraticCurveTo(R * 0.95, -R * 0.3, R * 0.9, R * 0.6); c.quadraticCurveTo(0, R * 0.95, -R * 0.95, R * 0.5);
      c.fillStyle = radial(c, -R * 0.2, -R * 0.4, R * 1.3, ['#f2d8a0', '#dcb878', '#b8925a']); c.fill();
      c.beginPath(); c.moveTo(-R * 0.6, -R * 0.2); c.quadraticCurveTo(0, -R * 0.55, R * 0.7, R * 0.2); c.quadraticCurveTo(R * 0.5, R * 0.6, -R * 0.2, R * 0.55); c.closePath(); c.fillStyle = 'rgba(150,110,60,0.35)'; c.fill();
      c.strokeStyle = 'rgba(255,240,200,0.6)'; c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(-R * 0.6, -R * 0.2); c.quadraticCurveTo(0, -R * 0.55, R * 0.7, R * 0.2); c.stroke();
      c.strokeStyle = 'rgba(130,95,50,0.35)'; c.lineWidth = R * 0.015; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-R * 0.8 + i * R * 0.1, R * 0.1 + i * R * 0.08); c.quadraticCurveTo(-R * 0.3 + i * R * 0.1, -R * 0.2 + i * R * 0.1, R * 0.1 + i * R * 0.1, -R * 0.3 + i * R * 0.12); c.stroke(); }
    },
  });

  /* ================= PÂNTANO E BREJO ================= */
  Props.grupo('pantano', 'Pântano e brejo');
  // a cabana na palafita: o telhado de palha, a varanda de tábuas e as estacas na água
  reg('palafita', {
    n: 'Cabana na palafita', g: 'pantano', size: 2,
    draw(c, R, t, s) {
      oval(c, 0, R * 0.1, R * 0.98, R * 0.9, 0, 'rgba(60,80,50,0.5)');
      for (const [x, y] of [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8], [0, 0.85]]) bola(c, x * R, y * R, R * 0.07, MAD.esc, R * 0.02);
      ret(c, -R * 0.78, -R * 0.78, R * 1.56, R * 1.56, R * 0.04, MAD.med, R * 0.035);
      c.strokeStyle = 'rgba(40,22,8,0.4)'; c.lineWidth = R * 0.015; for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(-R * 0.78 + i * R * 0.195, -R * 0.78); c.lineTo(-R * 0.78 + i * R * 0.195, R * 0.78); c.stroke(); }
      poli(c, [[-R * 0.6, -R * 0.65], [R * 0.6, -R * 0.65], [R * 0.6, R * 0.35], [-R * 0.6, R * 0.35]], grad(c, -R * 0.6, 0, R * 0.6, 0, ['#c8a85a', '#e2c87a', '#c8a85a']), R * 0.04);
      seg(c, 0, -R * 0.65, 0, R * 0.35, R * 0.04, '#9a7a3a');
      c.strokeStyle = 'rgba(120,90,40,0.5)'; c.lineWidth = R * 0.015; for (let i = 0; i < 10; i++) { const y = -R * 0.6 + i * R * 0.1; c.beginPath(); c.moveTo(-R * 0.58, y); c.lineTo(R * 0.58, y); c.stroke(); }
      ret(c, -R * 0.12, R * 0.35, R * 0.24, R * 0.43, R * 0.02, MAD.cla, R * 0.02);
    },
  });
  // o barco de junco: o casco de feixes amarrados, a vara e a lanterninha
  reg('barcoJunco', {
    n: 'Barco de junco', g: 'pantano', size: 2, fw: 1, fh: 2, legado: { w: 0.5, h: 1 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B);
      c.beginPath(); c.moveTo(0, -B * 0.95); c.quadraticCurveTo(R * 0.85, -B * 0.4, R * 0.7, B * 0.6); c.quadraticCurveTo(0, B * 1.05, -R * 0.7, B * 0.6); c.quadraticCurveTo(-R * 0.85, -B * 0.4, 0, -B * 0.95);
      c.fillStyle = grad(c, -R, 0, R, 0, ['#9a8a4a', '#c8b46a', '#9a8a4a']); c.fill(); linha(c, m * 0.05);
      c.strokeStyle = 'rgba(90,70,30,0.6)'; c.lineWidth = m * 0.03; for (const k of [-0.4, 0, 0.4]) { c.beginPath(); c.moveTo(k * R * 0.5, -B * 0.85); c.quadraticCurveTo(k * R * 1.4, 0, k * R * 0.9, B * 0.8); c.stroke(); }
      for (const y of [-B * 0.5, 0, B * 0.5]) seg(c, -R * 0.6, y, R * 0.6, y, m * 0.04, '#6a5020');
      seg(c, -R * 0.5, -B * 0.3, R * 0.7, B * 0.9, m * 0.05, MAD.esc);
    },
  });
  // os juncos: as touceiras de taboa com as espigas marrons (balançam ao vento)
  reg('juncos', {
    n: 'Juncos', g: 'pantano', size: 1, vivo: true,
    draw(c, R, t, s) {
      oval(c, 0, 0, R * 0.45, R * 0.4, 0, 'rgba(40,60,30,0.45)');
      for (let i = 0; i < 20; i++) {
        const x0 = (hsh(s, i, 1) - 0.5) * R * 0.5, y0 = (hsh(s, i, 2) - 0.5) * R * 0.5, a = hsh(s, i, 3) * TAU, L = R * (0.45 + hsh(s, i, 4) * 0.45), w = Math.sin(t * 1.4 + i) * R * 0.05;
        const x1 = x0 + Math.cos(a) * L + w, y1 = y0 + Math.sin(a) * L;
        c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + R * 0.08, (y0 + y1) / 2, x1, y1); c.lineWidth = R * 0.075; c.strokeStyle = 'rgba(20,40,10,0.6)'; c.lineCap = 'round'; c.stroke();
        c.lineWidth = R * 0.05; c.strokeStyle = ['#6a9a44', '#4a7a30', '#7aa850'][i % 3]; c.stroke();
        if (i % 3 === 0) oval(c, x1, y1, R * 0.11, R * 0.05, a, '#6a4020', R * 0.015);
      }
    },
  });
  // a ponte de tábuas: as tábuas tortas sobre as estacas (1 × 2)
  reg('ponteTabuas', {
    n: 'Ponte de tábuas', g: 'pantano', size: 2, fw: 1, fh: 2, legado: { w: 0.5, h: 1 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B);
      for (const k of [-1, 1]) for (const j of [-0.7, 0.7]) bola(c, k * R * 0.7, j * B, m * 0.1, MAD.esc);
      for (let i = 0; i < 8; i++) { const y = -B * 0.95 + i * B * 0.25; c.save(); c.translate(0, y + B * 0.1); c.rotate((hsh(s, i, 1) - 0.5) * 0.12); ret(c, -R * 0.75, -B * 0.1, R * 1.5, B * 0.2, m * 0.03, i % 2 ? MAD.cla : MAD.med, m * 0.03); c.restore(); }
      for (const k of [-1, 1]) seg(c, k * R * 0.55, -B * 0.9, k * R * 0.55, B * 0.9, m * 0.04, 'rgba(60,40,20,0.5)');
    },
  });
  // o caldeirão da bruxa: o caldeirão preto no fogo, o caldo verde borbulhando e os ossos em volta
  reg('caldeiraoBruxa', {
    n: 'Caldeirão da bruxa', g: 'pantano', size: 1, fogo: true, luz: { bright: 1, dim: 3, c: '#9aff7a' },
    draw(c, R, t, s, ang) {
      sombra(c, R, 0.62, 0.62);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; Props.kit.brasa(c, Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, R * 0.09, t, s + i); }
      bola(c, 0, 0, R * 0.55, '#1b1d22', R * 0.05);
      bola(c, 0, 0, R * 0.44, radial(c, 0, 0, R * 0.44, ['#c8ff8a', '#5ac83a', '#2a7a1e']));
      for (let i = 0; i < 4; i++) { const f = (t * 0.7 + i / 4) % 1, x = Math.cos(i * 2.3) * R * 0.25, y = Math.sin(i * 1.7) * R * 0.25; c.globalAlpha = 1 - f; bola(c, x, y, R * (0.04 + f * 0.08), '#e8ffc8'); c.globalAlpha = 1; }
      brilho(c, 0, 0, R * 0.8, '#9aff7a', 0.35);
      Props.kit.osso(c, R * 0.5, R * 0.75, R * 0.85, R * 0.55, R * 0.06);
    },
  });
  // o tronco podre: o tronco caído, oco, com o musgo, os cogumelos e a água parada
  reg('troncoPodre', {
    n: 'Tronco podre', g: 'pantano', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R * 0.9, b * 0.6, m);
      ret(c, -R * 0.9, -b * 0.5, R * 1.8, b, m * 0.4, grad(c, 0, -b * 0.5, 0, b * 0.5, ['#6a5a3a', '#4a3a24', '#3a2e1c']), m * 0.05);
      oval(c, -R * 0.88, 0, m * 0.18, b * 0.4, 0, '#2a1e12', m * 0.03); oval(c, -R * 0.88, 0, m * 0.1, b * 0.25, 0, '#120c06');
      c.strokeStyle = 'rgba(30,20,10,0.5)'; c.lineWidth = m * 0.03; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-R * 0.7 + i * R * 0.35, -b * 0.4); c.lineTo(-R * 0.5 + i * R * 0.35, b * 0.4); c.stroke(); }
      musgo(c, R, s, 8, R * 0.7);
      for (let i = 0; i < 3; i++) { const x = R * (0.2 + i * 0.2), y = -b * 0.45; bola(c, x, y, m * 0.1, '#d8c8a0', m * 0.02); bola(c, x, y, m * 0.05, '#b8a070'); }
    },
  });
  // o sapo gigante: o sapo enorme, verde e manchado, com o papo que enche e esvazia
  reg('sapoGigante', {
    n: 'Sapo gigante', g: 'pantano', size: 2, vivo: true,
    draw(c, R, t, s) {
      sombra(c, R, 0.85, 0.75);
      const papo = 1 + Math.max(0, Math.sin(t * 2.2)) * 0.2;
      for (const k of [-1, 1]) { oval(c, k * R * 0.6, R * 0.45, R * 0.32, R * 0.2, k * 0.6, '#3a6a2a', R * 0.03); for (let j = 0; j < 3; j++) bola(c, k * R * (0.78 + j * 0.06), R * (0.55 + j * 0.08), R * 0.05, '#4a7a34'); oval(c, k * R * 0.55, -R * 0.3, R * 0.2, R * 0.12, -k * 0.6, '#3a6a2a', R * 0.03); }
      oval(c, 0, R * 0.1, R * 0.62, R * 0.55, 0, radial(c, -R * 0.1, -R * 0.1, R * 0.7, ['#8ac85a', '#5a9a3a', '#3a6a2a']), R * 0.05);
      for (let i = 0; i < 6; i++) bola(c, (hsh(s, i, 1) - 0.5) * R * 0.8, (hsh(s, i, 2) - 0.3) * R * 0.7, R * 0.05, 'rgba(40,70,20,0.6)');
      oval(c, 0, -R * 0.42, R * 0.25 * papo, R * 0.15 * papo, 0, '#e8e0a8', R * 0.02);
      for (const k of [-1, 1]) { bola(c, k * R * 0.28, -R * 0.42, R * 0.15, '#6aa83e', R * 0.03); bola(c, k * R * 0.28, -R * 0.44, R * 0.09, '#e8c83a'); oval(c, k * R * 0.28, -R * 0.44, R * 0.025, R * 0.07, 0, '#1a1410'); }
    },
  });

  /* ================= ESGOTO E SUBTERRÂNEO ================= */
  Props.grupo('esgoto', 'Esgoto e subterrâneo');
  // a grade de esgoto: a grade quadrada de ferro no chão, a água escura correndo embaixo
  reg('gradeEsgoto', {
    n: 'Grade de esgoto', g: 'esgoto', size: 1, vivo: true,
    draw(c, R, t) {
      ret(c, -R * 0.75, -R * 0.75, R * 1.5, R * 1.5, R * 0.06, '#0e1210');
      c.save(); c.beginPath(); c.rect(-R * 0.7, -R * 0.7, R * 1.4, R * 1.4); c.clip(); c.strokeStyle = 'rgba(90,120,100,0.35)'; c.lineWidth = R * 0.04; for (let i = 0; i < 5; i++) { const y = -R * 0.7 + ((i * 0.3 + t * 0.2) % 1.5) * R; c.beginPath(); c.moveTo(-R * 0.7, y); c.quadraticCurveTo(0, y + R * 0.1, R * 0.7, y); c.stroke(); } c.restore();
      c.strokeStyle = FER.med; c.lineWidth = R * 0.09; c.strokeRect(-R * 0.72, -R * 0.72, R * 1.44, R * 1.44);
      c.lineWidth = R * 0.07; for (let i = 1; i < 5; i++) { const v = -R * 0.72 + i * R * 0.288; c.beginPath(); c.moveTo(v, -R * 0.72); c.lineTo(v, R * 0.72); c.stroke(); }
      c.strokeStyle = 'rgba(160,110,60,0.45)'; c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(-R * 0.72, R * 0.3); c.lineTo(-R * 0.4, R * 0.72); c.stroke();
    },
  });
  // os canos: dois canos grossos de cobre com as juntas, a válvula e o pingo
  reg('canos', {
    n: 'Canos', g: 'esgoto', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B);
      for (const [y, r] of [[-b * 0.45, 0.22], [b * 0.2, 0.17]]) {
        ret(c, -R, y - m * r, R * 2, m * r * 2, m * r, grad(c, 0, y - m * r, 0, y + m * r, ['#c88a5a', '#9a5a32', '#6a3a1e']), m * 0.04);
        for (const x of [-R * 0.55, R * 0.1, R * 0.7]) ret(c, x - m * 0.06, y - m * r * 1.2, m * 0.12, m * r * 2.4, m * 0.03, '#7a4a28', m * 0.025);
      }
      bola(c, -R * 0.2, -b * 0.45, m * 0.16, '#b8322e', m * 0.03); seg(c, -R * 0.33, -b * 0.45, -R * 0.07, -b * 0.45, m * 0.04, '#7a1a1a');
      const f = (t * 0.8) % 1; c.globalAlpha = 1 - f; bola(c, R * 0.45, b * 0.4 + f * m * 0.4, m * 0.04, '#9ab8a8'); c.globalAlpha = 1;
      oval(c, R * 0.45, b * 0.85, m * 0.18, m * 0.08, 0, 'rgba(70,90,80,0.6)');
    },
    vivo: true,
  });
  // o ninho de ratos: o monte de trapos e palha, os ratos e os olhinhos
  reg('ninhoRatos', {
    n: 'Ninho de ratos', g: 'esgoto', size: 1, vivo: true,
    draw(c, R, t, s) {
      oval(c, 0, 0, R * 0.65, R * 0.55, 0, radial(c, 0, 0, R * 0.65, ['#5a4a36', '#6a5840', '#4a3a28']), R * 0.03);
      c.strokeStyle = '#8a7a50'; c.lineWidth = R * 0.03; for (let i = 0; i < 10; i++) { const a = hsh(s, i, 1) * TAU, d = R * hsh(s, i, 2) * 0.5; c.beginPath(); c.moveTo(Math.cos(a) * d, Math.sin(a) * d); c.lineTo(Math.cos(a) * d + R * 0.2, Math.sin(a) * d + R * 0.05); c.stroke(); }
      for (let i = 0; i < 3; i++) {
        const a = t * 0.5 * (i % 2 ? 1 : -1) + i * 2.1, x = Math.cos(a) * R * 0.55, y = Math.sin(a) * R * 0.45;
        c.save(); c.translate(x, y); c.rotate(a + (i % 2 ? Math.PI / 2 : -Math.PI / 2));
        oval(c, 0, 0, R * 0.14, R * 0.08, 0, '#5a524a', R * 0.02); bola(c, R * 0.14, 0, R * 0.05, '#5a524a'); bola(c, R * 0.16, -R * 0.03, R * 0.015, '#ff4a3a');
        c.strokeStyle = '#c89a8a'; c.lineWidth = R * 0.015; c.beginPath(); c.moveTo(-R * 0.14, 0); c.quadraticCurveTo(-R * 0.3, R * 0.1, -R * 0.35, -R * 0.02); c.stroke();
        c.restore();
      }
      for (const [x, y] of [[-R * 0.1, -R * 0.05], [R * 0.15, R * 0.12]]) if (Math.sin(t * 1.3 + x) > -0.6) { bola(c, x, y, R * 0.025, '#ff6a4a'); bola(c, x + R * 0.06, y, R * 0.025, '#ff6a4a'); }
    },
  });
  // a passarela de ferro: a grade de chapa com os corrimãos (2 × 1)
  reg('passarela', {
    n: 'Passarela de ferro', g: 'esgoto', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B);
      ret(c, -R, -b * 0.8, R * 2, b * 1.6, m * 0.03, '#2a2e34', m * 0.03);
      c.strokeStyle = FER.cla; c.lineWidth = m * 0.025; for (let i = 0; i <= 14; i++) { const x = -R + i * R / 7; c.beginPath(); c.moveTo(x, -b * 0.8); c.lineTo(x, b * 0.8); c.stroke(); } for (let j = 0; j <= 4; j++) { const y = -b * 0.8 + j * b * 0.4; c.beginPath(); c.moveTo(-R, y); c.lineTo(R, y); c.stroke(); }
      for (const k of [-1, 1]) { seg(c, -R, k * b * 0.85, R, k * b * 0.85, m * 0.08, FER.med); for (const x of [-R * 0.9, 0, R * 0.9]) bola(c, x, k * b * 0.85, m * 0.07, FER.esc); }
    },
  });
  // a comporta: a porta de ferro rebitada na parede do canal, com a manivela
  reg('comporta', {
    n: 'Comporta', g: 'esgoto', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B);
      ret(c, -R + m * 0.04, -b, R * 2 - m * 0.08, b * 1.3, m * 0.05, grad(c, 0, -b, 0, b * 0.3, [FER.cla, FER.med]), m * 0.05);
      for (let i = 0; i < 7; i++) for (const y of [-b * 0.8, b * 0.1]) bola(c, -R * 0.85 + i * R * 0.28, y, m * 0.04, FER.luz);
      seg(c, -R * 0.9, -b * 0.35, R * 0.9, -b * 0.35, m * 0.03, 'rgba(20,20,20,0.5)');
      c.strokeStyle = '#a07020'; c.lineWidth = m * 0.04; c.beginPath(); c.moveTo(-R * 0.6, -b * 0.6); c.lineTo(-R * 0.2, -b * 0.1); c.stroke();
      c.strokeStyle = FER.esc; c.lineWidth = m * 0.07; c.beginPath(); c.arc(R * 0.6, -b * 0.35, m * 0.22, 0, TAU); c.stroke(); seg(c, R * 0.38, -b * 0.35, R * 0.82, -b * 0.35, m * 0.05, FER.esc); seg(c, R * 0.6, -b * 0.35 - m * 0.22, R * 0.6, -b * 0.35 + m * 0.22, m * 0.05, FER.esc);
    },
  });
  // o monte de lixo: os restos, os trapos, a garrafa quebrada e as moscas
  reg('lixo', {
    n: 'Monte de lixo', g: 'esgoto', size: 1, vivo: true,
    draw(c, R, t, s) {
      oval(c, 0, R * 0.05, R * 0.7, R * 0.55, 0, '#4a4234', R * 0.03);
      const cores = ['#6a5a40', '#7a6a50', '#5a6a5a', '#8a7a5a', '#3a3a30'];
      for (let i = 0; i < 12; i++) { const x = (hsh(s, i, 1) - 0.5) * R * 1.1, y = (hsh(s, i, 2) - 0.5) * R * 0.9; c.save(); c.translate(x, y); c.rotate(hsh(s, i, 3) * 3); ret(c, -R * 0.1, -R * 0.06, R * (0.12 + hsh(s, i, 4) * 0.12), R * 0.1, R * 0.02, cores[i % 5], R * 0.015); c.restore(); }
      c.save(); c.translate(R * 0.25, -R * 0.1); c.rotate(0.8); ret(c, -R * 0.14, -R * 0.05, R * 0.28, R * 0.1, R * 0.04, 'rgba(90,140,80,0.8)', R * 0.015); c.restore();
      Props.kit.osso(c, -R * 0.4, R * 0.2, -R * 0.1, R * 0.32, R * 0.05);
      for (let i = 0; i < 4; i++) bola(c, Math.cos(t * 3 + i * 1.6) * R * 0.4, -R * 0.2 + Math.sin(t * 4.3 + i) * R * 0.3, R * 0.025, '#111');
    },
  });
  // a escada de ferro: os degraus chumbados na parede, subindo para a tampa da rua
  reg('escadaFerro', {
    n: 'Escada de ferro', g: 'esgoto', size: 1, costas: 'n',
    draw(c, R) {
      ret(c, -R * 0.55, -R * 0.95, R * 1.1, R * 0.45, R * 0.05, PED.med, R * 0.04);
      bola(c, 0, -R * 0.72, R * 0.2, '#0e1210', R * 0.03);
      for (const k of [-1, 1]) seg(c, k * R * 0.35, -R * 0.75, k * R * 0.35, R * 0.75, R * 0.07, FER.cla);
      for (let i = 0; i < 6; i++) seg(c, -R * 0.35, -R * 0.55 + i * R * 0.25, R * 0.35, -R * 0.55 + i * R * 0.25, R * 0.055, FER.med);
    },
  });
})();
