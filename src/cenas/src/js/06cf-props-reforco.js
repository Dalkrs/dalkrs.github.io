/* ---------------------------------------------------------------
   6cf. OS OBJETOS QUE REFORÇAM AS CATEGORIAS FRACAS (lote 179) — 29 objetos:
     · Mistério (+5): a lupa com as anotações, as pegadas de sangue, a faca ensanguentada, a carta rasgada e o frasco
       de veneno;
     · Base secreta (+5): o mapa com alfinetes, as caixas de contrabando, a mesa dos planos, a estante que gira e o saco
       de ouro roubado;
     · A história da missão (+3): a carta com selo, o medalhão e o mapa do tesouro;
     · Mercado e cidade (+3): a balança, a banca de peixe e os rolos de tecido;
     · Templo e cripta (+3): o sino, o púlpito e as oferendas;
     · Forja e oficina (+3): a armadura no suporte, a roda de oleiro e o tear;
     · Oriental (+3): a mesa baixa de chá, a ponte em arco e o jardim de pedras;
     · Portões e cortinas (+2): o portão de madeira e a balista;
     · Vila e festa (+2): o mastro de fitas e as bandeirolas.
   def.tags: as palavras a mais para a busca do painel de Objetos (além do nome).
   --------------------------------------------------------------- */
(() => {
  const { caixa, linha, grad, radial, hsh, MAD, PED, FER, chama, sombra, pedrinha, folhas } = Props.kit;
  const { bola, oval, ret, seg, poli, somb, brilho, mm } = Props.kitT;
  const reg = (id, def) => Props.registrar(id, def);
  const PAPEL = '#efe6d0', SANGUE = '#8a1a1a', OURO = '#e2b842';

  /* ================= MISTÉRIO ================= */
  // a lupa sobre as anotações
  reg('lupa', {
    n: 'Lupa e anotações', g: 'misterio', size: 1, tags: 'investigar detetive pista',
    draw(c, R, t, s) {
      sombra(c, R, 0.65, 0.5);
      c.save(); c.rotate(-0.15); ret(c, -R * 0.6, -R * 0.45, R * 1.1, R * 0.85, R * 0.03, PAPEL, R * 0.025);
      for (let i = 0; i < 6; i++) seg(c, -R * 0.5, -R * 0.33 + i * R * 0.12, R * (0.1 + hsh(s, i, 1) * 0.3), -R * 0.33 + i * R * 0.12, R * 0.02, 'rgba(60,40,20,0.55)');
      c.strokeStyle = '#a33'; c.lineWidth = R * 0.03; c.beginPath(); c.arc(-R * 0.15, R * 0.1, R * 0.12, 0, TAU); c.stroke(); c.restore();
      seg(c, R * 0.25, R * 0.2, R * 0.7, R * 0.65, R * 0.1, MAD.esc);
      bola(c, R * 0.1, R * 0.05, R * 0.27, 'rgba(190,225,250,0.45)'); c.strokeStyle = '#c99a3a'; c.lineWidth = R * 0.07; c.beginPath(); c.arc(R * 0.1, R * 0.05, R * 0.27, 0, TAU); c.stroke();
      bola(c, R * 0.02, -R * 0.04, R * 0.06, 'rgba(255,255,255,0.7)');
    },
  });
  // as pegadas de sangue: os passos vermelhos indo embora
  reg('pegadasSangue', {
    n: 'Pegadas de sangue', g: 'misterio', size: 1, tags: 'crime rastro trilha',
    draw(c, R, t, s) {
      for (let i = 0; i < 5; i++) {
        const y = R * 0.8 - i * R * 0.4, x = (i % 2 ? 1 : -1) * R * 0.17, a = 1 - i * 0.17;
        c.save(); c.translate(x, y); c.globalAlpha = a;
        oval(c, 0, 0, R * 0.08, R * 0.13, 0, SANGUE); oval(c, 0, R * 0.17, R * 0.06, R * 0.06, 0, SANGUE);
        c.restore();
      }
      c.globalAlpha = 1; oval(c, -R * 0.1, R * 0.9, R * 0.22, R * 0.08, 0, 'rgba(120,20,20,0.7)');
    },
  });
  // a faca ensanguentada
  reg('facaCrime', {
    n: 'Faca ensanguentada', g: 'misterio', size: 1, tags: 'crime arma assassinato',
    draw(c, R) {
      oval(c, R * 0.1, R * 0.15, R * 0.4, R * 0.2, 0.3, 'rgba(120,20,20,0.65)');
      c.save(); c.rotate(-0.6);
      poli(c, [[-R * 0.05, -R * 0.08], [R * 0.6, -R * 0.03], [R * 0.7, 0], [R * 0.6, R * 0.04], [-R * 0.05, R * 0.08]], grad(c, 0, -R * 0.1, 0, R * 0.1, [FER.luz, FER.cla]), R * 0.025);
      poli(c, [[R * 0.25, -R * 0.03], [R * 0.6, -R * 0.03], [R * 0.7, 0], [R * 0.6, R * 0.04], [R * 0.3, R * 0.06]], 'rgba(140,20,20,0.85)');
      ret(c, -R * 0.12, -R * 0.14, R * 0.07, R * 0.28, R * 0.02, FER.med, R * 0.02);
      ret(c, -R * 0.6, -R * 0.07, R * 0.48, R * 0.14, R * 0.05, MAD.esc, R * 0.025);
      c.restore();
    },
  });
  // a carta rasgada: os pedaços de papel, um com a assinatura
  reg('cartaRasgada', {
    n: 'Carta rasgada', g: 'misterio', size: 1, tags: 'pista papel bilhete',
    draw(c, R, t, s) {
      for (let i = 0; i < 4; i++) {
        c.save(); c.translate((hsh(s, i, 1) - 0.5) * R * 0.8, (hsh(s, i, 2) - 0.5) * R * 0.8); c.rotate(hsh(s, i, 3) * 3);
        poli(c, [[-R * 0.22, -R * 0.2], [R * 0.18, -R * 0.23], [R * 0.24, R * 0.05], [R * 0.1, R * 0.2], [-R * 0.2, R * 0.18]], PAPEL, R * 0.02);
        for (let j = 0; j < 3; j++) seg(c, -R * 0.14, -R * 0.1 + j * R * 0.08, R * 0.1, -R * 0.1 + j * R * 0.08, R * 0.015, 'rgba(40,40,70,0.6)');
        c.restore();
      }
      bola(c, R * 0.3, R * 0.35, R * 0.08, '#a33', R * 0.015);
    },
  });
  // o frasco de veneno: o vidrinho verde com a caveira e a poça
  reg('frascoVeneno', {
    n: 'Frasco de veneno', g: 'misterio', size: 1, tags: 'crime alquimia pocao poção',
    draw(c, R) {
      oval(c, R * 0.25, R * 0.3, R * 0.32, R * 0.16, 0, 'rgba(110,200,80,0.45)');
      c.save(); c.rotate(1.2);
      oval(c, 0, R * 0.08, R * 0.3, R * 0.24, 0, radial(c, -R * 0.1, 0, R * 0.35, ['#c8ff9a', '#4aa82a', '#1e5a14']), R * 0.03);
      ret(c, -R * 0.08, -R * 0.4, R * 0.16, R * 0.25, R * 0.03, '#3a6a2a', R * 0.02); ret(c, -R * 0.1, -R * 0.5, R * 0.2, R * 0.12, R * 0.03, MAD.med, R * 0.02);
      bola(c, 0, R * 0.08, R * 0.09, '#f4efe2'); bola(c, -R * 0.03, R * 0.06, R * 0.02, '#111'); bola(c, R * 0.03, R * 0.06, R * 0.02, '#111');
      c.restore();
    },
  });

  /* ================= BASE SECRETA ================= */
  // o mapa na parede, com os alfinetes e os fios
  reg('mapaParede', {
    n: 'Mapa com alfinetes', g: 'base', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 }, tags: 'plano quadro investigacao',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B), h = b * 1.5;
      ret(c, -R + m * 0.05, -b, R * 2 - m * 0.1, h, m * 0.04, MAD.esc, m * 0.04);
      ret(c, -R + m * 0.12, -b + m * 0.06, R * 2 - m * 0.24, h - m * 0.12, m * 0.02, '#d8c49a');
      c.strokeStyle = 'rgba(90,70,40,0.5)'; c.lineWidth = m * 0.02; c.beginPath(); c.moveTo(-R * 0.8, -b + h * 0.6); c.quadraticCurveTo(-R * 0.2, -b + h * 0.2, R * 0.3, -b + h * 0.55); c.quadraticCurveTo(R * 0.6, -b + h * 0.8, R * 0.85, -b + h * 0.3); c.stroke();
      const pts = [0, 1, 2, 3].map(i => [-R * 0.7 + i * R * 0.45 + (hsh(s, i, 1) - 0.5) * R * 0.2, -b + h * (0.25 + hsh(s, i, 2) * 0.5)]);
      c.strokeStyle = '#c22'; c.lineWidth = m * 0.02; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
      pts.forEach(([x, y], i) => bola(c, x, y, m * 0.05, ['#e33', '#33e', '#ec3', '#3c3'][i], m * 0.01));
    },
  });
  // as caixas de contrabando: os caixotes com a marca queimada, uma aberta com as garrafas
  reg('caixasContrabando', {
    n: 'Caixas de contrabando', g: 'base', size: 2, tags: 'caixote carga roubado',
    draw(c, R, t, s) {
      sombra(c, R, 0.92, 0.9);
      for (const [x, y, w] of [[-R * 0.9, -R * 0.85, 0.9], [R * 0.05, -R * 0.75, 0.82], [-R * 0.7, R * 0.08, 0.85]]) {
        ret(c, x, y, R * w, R * w * 0.85, R * 0.04, grad(c, x, y, x + R * w, y + R * w, [MAD.cla, MAD.med]), R * 0.03);
        c.strokeStyle = 'rgba(40,22,8,0.5)'; c.lineWidth = R * 0.02; c.strokeRect(x + R * 0.06, y + R * 0.06, R * w - R * 0.12, R * w * 0.85 - R * 0.12);
        c.strokeStyle = 'rgba(30,16,6,0.7)'; c.lineWidth = R * 0.03; c.beginPath(); c.arc(x + R * w / 2, y + R * w * 0.42, R * 0.1, 0, TAU); c.moveTo(x + R * w / 2 - R * 0.1, y + R * w * 0.42); c.lineTo(x + R * w / 2 + R * 0.1, y + R * w * 0.42); c.stroke();
      }
      ret(c, R * 0.15, R * 0.15, R * 0.75, R * 0.7, R * 0.04, '#2a1a0e', R * 0.03);
      for (let i = 0; i < 6; i++) bola(c, R * (0.28 + (i % 3) * 0.22), R * (0.32 + Math.floor(i / 3) * 0.3), R * 0.09, ['#3a6a3a', '#6a3a1a', '#3a4a6a'][i % 3], R * 0.015);
    },
  });
  // a mesa dos planos: a planta do lugar, a vela e as moedinhas marcando os guardas
  reg('mesaPlanos', {
    n: 'Mesa dos planos', g: 'base', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, luz: { bright: 1, dim: 2, c: '#ffcf80' }, fogo: true, tags: 'plano assalto mapa',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R, b, m);
      ret(c, -R + m * 0.05, -b + m * 0.05, R * 2 - m * 0.1, b * 2 - m * 0.1, m * 0.05, grad(c, 0, -b, 0, b, [MAD.cla, MAD.med]), m * 0.04);
      ret(c, -R * 0.7, -b * 0.7, R * 1.1, b * 1.4, m * 0.02, '#c8d8e8', m * 0.02);
      c.strokeStyle = '#2a4a8a'; c.lineWidth = m * 0.02; c.strokeRect(-R * 0.6, -b * 0.55, R * 0.45, b * 0.6); c.strokeRect(-R * 0.15, -b * 0.55, R * 0.4, b * 1.1); c.strokeRect(-R * 0.6, b * 0.05, R * 0.45, b * 0.5);
      for (let i = 0; i < 3; i++) bola(c, -R * 0.45 + i * R * 0.25, -b * 0.2 + (i % 2) * b * 0.4, m * 0.05, '#c33');
      bola(c, R * 0.7, 0, m * 0.1, '#efe6d0', m * 0.02); chama(c, R * 0.7, 0, m * 0.18, t, s, ang);
    },
  });
  // a estante que gira: a estante com os livros e a fresta escura de um lado (a passagem)
  reg('estanteSecreta', {
    n: 'Estante que gira (passagem)', g: 'base', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 }, tags: 'passagem secreta porta livros',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B), h = b * 1.5;
      poli(c, [[R * 0.75, -b], [R * 0.98, -b + h * 0.2], [R * 0.98, -b + h]], '#0a0806');
      c.save(); c.translate(-R * 0.05, -b); c.rotate(0.06);
      ret(c, -R * 0.9, 0, R * 1.75, h, m * 0.04, MAD.esc, m * 0.04);
      const cores = ['#7a2f3a', '#2f4a7a', '#3e6a3a', '#6a4a1e', '#5a2f6a', '#8a6a2a'];
      for (let r = 0; r < 2; r++) for (let i = 0; i < 12; i++) { const x = -R * 0.85 + i * R * 0.14, y = m * 0.06 + r * h * 0.47; ret(c, x, y, R * 0.11, h * 0.4, m * 0.01, cores[(i + r * 3 + s) % 6]); }
      c.restore();
      seg(c, R * 0.75, -b, R * 0.98, -b + h, m * 0.02, 'rgba(255,220,140,0.4)');
    },
  });
  // o saco de ouro roubado: o saco aberto e as moedas derramadas
  reg('sacoOuro', {
    n: 'Saco de ouro roubado', g: 'base', size: 1, tags: 'dinheiro moedas tesouro',
    draw(c, R, t, s) {
      sombra(c, R, 0.55, 0.5);
      oval(c, -R * 0.1, -R * 0.05, R * 0.45, R * 0.42, 0, radial(c, -R * 0.25, -R * 0.2, R * 0.55, ['#c8a878', '#9a7a4a', '#6a5030']), R * 0.035);
      bola(c, -R * 0.1, -R * 0.05, R * 0.2, OURO, R * 0.02);
      for (let i = 0; i < 10; i++) { const x = R * (0.05 + hsh(s, i, 1) * 0.6), y = R * (0.05 + hsh(s, i, 2) * 0.55); oval(c, x, y, R * 0.08, R * 0.065, hsh(s, i, 3), radial(c, x - R * 0.02, y - R * 0.02, R * 0.09, ['#fff2a0', OURO, '#a8801a']), R * 0.012); }
      seg(c, -R * 0.35, -R * 0.35, -R * 0.15, -R * 0.42, R * 0.04, '#5a3a1a');
    },
  });

  /* ================= A HISTÓRIA DA MISSÃO ================= */
  reg('cartaSelo', {
    n: 'Carta com selo', g: 'trama', size: 1, tags: 'pista mensagem nobre',
    draw(c, R) {
      sombra(c, R, 0.62, 0.45);
      c.save(); c.rotate(-0.12);
      ret(c, -R * 0.62, -R * 0.42, R * 1.24, R * 0.84, R * 0.03, '#f2e8cf', R * 0.03);
      poli(c, [[-R * 0.62, -R * 0.42], [0, R * 0.05], [R * 0.62, -R * 0.42]], 'rgba(200,180,140,0.5)', R * 0.02);
      bola(c, 0, R * 0.02, R * 0.16, radial(c, -R * 0.04, -R * 0.02, R * 0.18, ['#e05050', '#a01818', '#6a0a0a']), R * 0.02);
      c.strokeStyle = 'rgba(255,200,200,0.5)'; c.lineWidth = R * 0.02; c.beginPath(); c.arc(0, R * 0.02, R * 0.08, 0, TAU); c.stroke();
      c.restore();
    },
  });
  reg('medalhao', {
    n: 'Medalhão', g: 'trama', size: 1, calma: true, luz: { bright: 0, dim: 1, c: '#ffe08a' }, tags: 'joia colar pista tesouro',
    draw(c, R) {
      c.strokeStyle = '#c99a3a'; c.lineWidth = R * 0.03; c.beginPath(); for (let i = 0; i <= 20; i++) { const a = -0.3 - i / 20 * 2.6, r = R * 0.6; if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8 - R * 0.1); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.8 - R * 0.1); } c.stroke();
      brilho(c, R * 0.15, R * 0.25, R * 0.5, '#ffe08a', 0.3);
      bola(c, R * 0.15, R * 0.25, R * 0.3, radial(c, R * 0.05, R * 0.15, R * 0.35, ['#fff2b0', '#d6a64a', '#8a6420']), R * 0.035);
      bola(c, R * 0.15, R * 0.25, R * 0.12, '#2a6a8a', R * 0.02); bola(c, R * 0.11, R * 0.21, R * 0.04, 'rgba(255,255,255,0.7)');
    },
  });
  reg('mapaTesouro', {
    n: 'Mapa do tesouro', g: 'trama', size: 1, tags: 'pista tesouro caminho',
    draw(c, R) {
      sombra(c, R, 0.7, 0.55);
      ret(c, -R * 0.68, -R * 0.5, R * 1.36, R * 1.0, R * 0.04, radial(c, 0, 0, R * 0.9, ['#f0dcae', '#d8b880', '#a8885a']), R * 0.03);
      for (const k of [-1, 1]) oval(c, k * R * 0.68, 0, R * 0.07, R * 0.5, 0, '#c8a878', R * 0.02);
      c.strokeStyle = '#7a4a2a'; c.lineWidth = R * 0.025; c.setLineDash([R * 0.06, R * 0.05]); c.beginPath(); c.moveTo(-R * 0.45, R * 0.3); c.quadraticCurveTo(-R * 0.1, -R * 0.35, R * 0.1, R * 0.05); c.quadraticCurveTo(R * 0.25, R * 0.3, R * 0.35, -R * 0.15); c.stroke(); c.setLineDash([]);
      c.strokeStyle = '#b8221e'; c.lineWidth = R * 0.05; c.beginPath(); c.moveTo(R * 0.27, -R * 0.23); c.lineTo(R * 0.43, -R * 0.07); c.moveTo(R * 0.43, -R * 0.23); c.lineTo(R * 0.27, -R * 0.07); c.stroke();
      for (let i = 0; i < 3; i++) poli(c, [[-R * 0.5 + i * R * 0.12, -R * 0.15], [-R * 0.44 + i * R * 0.12, -R * 0.3], [-R * 0.38 + i * R * 0.12, -R * 0.15]], 'rgba(90,60,30,0.6)');
    },
  });

  /* ================= MERCADO E CIDADE ================= */
  reg('balanca', {
    n: 'Balança', g: 'mercado', size: 1, tags: 'feira peso comercio comércio',
    draw(c, R) {
      sombra(c, R, 0.75, 0.4);
      ret(c, -R * 0.12, -R * 0.12, R * 0.24, R * 0.24, R * 0.04, MAD.med, R * 0.025);
      seg(c, -R * 0.75, 0, R * 0.75, 0, R * 0.05, '#b08a3a');
      for (const k of [-1, 1]) { bola(c, k * R * 0.6, 0, R * 0.26, radial(c, k * R * 0.55, -R * 0.05, R * 0.3, ['#f0d080', '#c99a3a', '#8a6420']), R * 0.03); }
      for (let i = 0; i < 3; i++) bola(c, -R * 0.62 + (i - 1) * R * 0.08, (i % 2) * R * 0.05, R * 0.06, '#c84a3a');
      ret(c, R * 0.52, -R * 0.08, R * 0.16, R * 0.16, R * 0.02, FER.med, R * 0.015);
    },
  });
  reg('bancaPeixe', {
    n: 'Banca de peixe', g: 'mercado', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, tags: 'feira comida peixaria porto',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R, b, m);
      ret(c, -R + m * 0.05, -b + m * 0.05, R * 2 - m * 0.1, b * 2 - m * 0.1, m * 0.06, MAD.med, m * 0.04);
      ret(c, -R + m * 0.15, -b + m * 0.15, R * 2 - m * 0.3, b * 2 - m * 0.3, m * 0.04, '#dfe8ee');
      for (let i = 0; i < 7; i++) { const x = -R * 0.75 + i * R * 0.25, y = (i % 2 ? 0.2 : -0.2) * b; c.save(); c.translate(x, y); c.rotate((hsh(s, i, 1) - 0.5) * 0.8);
        oval(c, 0, 0, R * 0.14, m * 0.1, 0, grad(c, 0, -m * 0.1, 0, m * 0.1, ['#c8d8e0', '#7a8a9a']), m * 0.015); poli(c, [[R * 0.12, 0], [R * 0.2, -m * 0.08], [R * 0.2, m * 0.08]], '#7a8a9a'); bola(c, -R * 0.08, -m * 0.02, m * 0.02, '#111'); c.restore(); }
    },
  });
  reg('rolosTecido', {
    n: 'Rolos de tecido', g: 'mercado', size: 1, tags: 'feira pano loja costura',
    draw(c, R, t, s) {
      sombra(c, R, 0.8, 0.6);
      const cores = [['#c84a5a', '#8a2a3a'], ['#3a6aa8', '#1e3a6a'], ['#d6a64a', '#8a6420'], ['#5a8a4a', '#2a4a2a']];
      for (let i = 0; i < 4; i++) { const y = -R * 0.6 + i * R * 0.38, [a, b] = cores[(i + s) % 4]; ret(c, -R * 0.75, y, R * 1.5, R * 0.34, R * 0.17, grad(c, 0, y, 0, y + R * 0.34, [a, b]), R * 0.025); oval(c, R * 0.75, y + R * 0.17, R * 0.06, R * 0.16, 0, b, R * 0.015); bola(c, R * 0.75, y + R * 0.17, R * 0.03, MAD.esc); }
    },
  });

  /* ================= TEMPLO E CRIPTA ================= */
  reg('sinoTemplo', {
    n: 'Sino do templo', g: 'templo', size: 2, tags: 'sino igreja campanario',
    draw(c, R) {
      sombra(c, R, 0.85, 0.85);
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bola(c, x * R * 0.78, y * R * 0.78, R * 0.1, MAD.esc, R * 0.02);
      seg(c, -R * 0.78, -R * 0.78, R * 0.78, R * 0.78, R * 0.07, MAD.med); seg(c, R * 0.78, -R * 0.78, -R * 0.78, R * 0.78, R * 0.07, MAD.med);
      bola(c, 0, 0, R * 0.55, radial(c, -R * 0.15, -R * 0.2, R * 0.6, ['#f0d080', '#c08a2a', '#6a4810']), R * 0.04);
      c.strokeStyle = 'rgba(90,60,10,0.6)'; c.lineWidth = R * 0.03; c.beginPath(); c.arc(0, 0, R * 0.42, 0, TAU); c.stroke();
      bola(c, 0, 0, R * 0.12, '#5a3a0a', R * 0.02);
    },
  });
  reg('pulpito', {
    n: 'Púlpito', g: 'templo', size: 1, costas: 's', tags: 'igreja sermao sermão padre',
    draw(c, R) {
      sombra(c, R, 0.62, 0.62);
      poli(c, [[-R * 0.6, -R * 0.35], [-R * 0.3, -R * 0.65], [R * 0.3, -R * 0.65], [R * 0.6, -R * 0.35], [R * 0.6, R * 0.5], [-R * 0.6, R * 0.5]], grad(c, 0, -R * 0.65, 0, R * 0.5, [MAD.luz, MAD.med]), R * 0.05);
      ret(c, -R * 0.45, -R * 0.5, R * 0.9, R * 0.45, R * 0.04, MAD.esc, R * 0.03);
      ret(c, -R * 0.3, -R * 0.45, R * 0.6, R * 0.35, R * 0.02, PAPEL, R * 0.02); seg(c, 0, -R * 0.45, 0, -R * 0.1, R * 0.02, 'rgba(60,40,20,0.5)');
      seg(c, -R * 0.15, R * 0.05, R * 0.15, R * 0.05, R * 0.06, '#d6a64a'); seg(c, 0, -R * 0.05, 0, R * 0.3, R * 0.06, '#d6a64a');
      ret(c, -R * 0.3, R * 0.5, R * 0.6, R * 0.3, R * 0.03, MAD.cla, R * 0.03);
    },
  });
  reg('oferendas', {
    n: 'Oferendas', g: 'templo', size: 1, fogo: true, luz: { bright: 0.5, dim: 2, c: '#ffcf80' }, tags: 'altar velas flores frutas',
    draw(c, R, t, s, ang) {
      sombra(c, R, 0.7, 0.6);
      ret(c, -R * 0.7, -R * 0.55, R * 1.4, R * 1.1, R * 0.08, '#e8dcc0', R * 0.03);
      for (let i = 0; i < 3; i++) { const x = -R * 0.45 + i * R * 0.45; bola(c, x, -R * 0.3, R * 0.06, '#f4efe2'); chama(c, x, -R * 0.3, R * 0.14, t, s + i, ang); }
      bola(c, -R * 0.25, R * 0.15, R * 0.18, '#c84a3a', R * 0.02); bola(c, -R * 0.05, R * 0.25, R * 0.14, '#e8b84a', R * 0.02);
      for (let i = 0; i < 5; i++) bola(c, R * 0.3 + Math.cos(i * 1.26) * R * 0.12, R * 0.2 + Math.sin(i * 1.26) * R * 0.12, R * 0.07, i % 2 ? '#f0a0b8' : '#fff4f8');
      bola(c, R * 0.3, R * 0.2, R * 0.05, '#e8c84a');
    },
  });

  /* ================= FORJA E OFICINA ================= */
  reg('armaduraSuporte', {
    n: 'Armadura no suporte', g: 'forja', size: 1, tags: 'armadura cavaleiro ferreiro arma',
    draw(c, R) {
      sombra(c, R, 0.62, 0.55);
      bola(c, 0, R * 0.5, R * 0.18, MAD.esc);
      oval(c, 0, R * 0.05, R * 0.48, R * 0.38, 0, grad(c, -R * 0.5, 0, R * 0.5, 0, [FER.med, FER.luz, FER.med]), R * 0.04);
      for (const k of [-1, 1]) oval(c, k * R * 0.5, -R * 0.05, R * 0.18, R * 0.15, 0, FER.cla, R * 0.03);
      seg(c, 0, -R * 0.25, 0, R * 0.38, R * 0.025, 'rgba(40,40,46,0.6)');
      bola(c, 0, -R * 0.38, R * 0.22, radial(c, -R * 0.06, -R * 0.45, R * 0.25, [FER.luz, FER.cla, FER.med]), R * 0.03);
      seg(c, -R * 0.12, -R * 0.38, R * 0.12, -R * 0.38, R * 0.03, '#1a1a20');
      poli(c, [[-R * 0.03, -R * 0.6], [R * 0.03, -R * 0.6], [0, -R * 0.85]], '#b8322e');
    },
  });
  reg('rodaOleiro', {
    n: 'Roda de oleiro', g: 'forja', size: 1, vivo: true, tags: 'barro ceramica cerâmica pote artesao artesão',
    draw(c, R, t) {
      sombra(c, R, 0.65, 0.65);
      ret(c, -R * 0.7, -R * 0.15, R * 0.35, R * 0.5, R * 0.05, MAD.med, R * 0.03);
      bola(c, R * 0.1, 0, R * 0.55, MAD.cla, R * 0.04);
      c.save(); c.translate(R * 0.1, 0); c.rotate(t * 2.5);
      bola(c, 0, 0, R * 0.42, '#8a7a6a', R * 0.02); seg(c, -R * 0.4, 0, R * 0.4, 0, R * 0.02, 'rgba(0,0,0,0.25)');
      c.restore();
      bola(c, R * 0.1, 0, R * 0.25, radial(c, R * 0.03, -R * 0.07, R * 0.3, ['#e0a878', '#b8683a', '#7a3e1e']), R * 0.03);
      bola(c, R * 0.1, 0, R * 0.12, '#5a2e14');
    },
  });
  reg('tear', {
    n: 'Tear', g: 'forja', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, tags: 'tecido pano costura fiar',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R, b, m);
      for (const k of [-1, 1]) ret(c, k * R * 0.88 - m * 0.1, -b * 0.9, m * 0.2, b * 1.8, m * 0.04, MAD.med, m * 0.03);
      for (const y of [-b * 0.75, b * 0.75]) ret(c, -R * 0.9, y - m * 0.08, R * 1.8, m * 0.16, m * 0.08, MAD.cla, m * 0.03);
      c.strokeStyle = 'rgba(240,230,210,0.85)'; c.lineWidth = m * 0.015; for (let i = 0; i < 22; i++) { const x = -R * 0.75 + i * R * 0.07; c.beginPath(); c.moveTo(x, -b * 0.7); c.lineTo(x, b * 0.7); c.stroke(); }
      ret(c, -R * 0.75, -b * 0.1, R * 1.5, b * 0.8, m * 0.02, grad(c, -R, 0, R, 0, ['#8a2a3a', '#c84a5a', '#d6a64a']));
      c.strokeStyle = 'rgba(0,0,0,0.2)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-R * 0.75, -b * 0.05 + i * b * 0.13); c.lineTo(R * 0.75, -b * 0.05 + i * b * 0.13); c.stroke(); }
      oval(c, R * 0.3, -b * 0.3, R * 0.18, m * 0.06, 0, MAD.luz, m * 0.02);
    },
  });

  /* ================= ORIENTAL ================= */
  reg('mesaCha', {
    n: 'Mesa baixa de chá', g: 'oriental', size: 1, tags: 'cha chá mesa almofada',
    draw(c, R) {
      for (const [x, y] of [[0, -0.75], [0, 0.75], [-0.75, 0], [0.75, 0]]) ret(c, x * R - R * 0.2, y * R - R * 0.2, R * 0.4, R * 0.4, R * 0.1, '#7a2a2a', R * 0.02);
      sombra(c, R, 0.55, 0.55);
      ret(c, -R * 0.5, -R * 0.5, R, R, R * 0.05, grad(c, -R * 0.5, -R * 0.5, R * 0.5, R * 0.5, ['#5a2a1a', '#3a1a10']), R * 0.04);
      bola(c, -R * 0.1, -R * 0.05, R * 0.15, '#e8e4d8', R * 0.02); seg(c, R * 0.03, -R * 0.1, R * 0.15, -R * 0.2, R * 0.03, '#e8e4d8');
      for (const [x, y] of [[R * 0.25, R * 0.2], [-R * 0.25, R * 0.25]]) { bola(c, x, y, R * 0.07, '#e8e4d8', R * 0.015); bola(c, x, y, R * 0.045, '#8a9a4a'); }
    },
  });
  reg('ponteArco', {
    n: 'Ponte em arco', g: 'oriental', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, tags: 'ponte jardim lago rio',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.25)'; caixa(c, -R * 0.9, -b * 0.4, R * 1.9, b * 1.2, m * 0.1); c.fill(); c.restore();
      ret(c, -R * 0.95, -b * 0.55, R * 1.9, b * 1.1, m * 0.15, grad(c, -R, 0, R, 0, ['#8a3a2a', '#c85a3a', '#8a3a2a']), m * 0.04);
      c.strokeStyle = 'rgba(40,10,5,0.45)'; c.lineWidth = m * 0.02; for (let i = 1; i < 10; i++) { const x = -R * 0.95 + i * R * 0.19; c.beginPath(); c.moveTo(x, -b * 0.5); c.lineTo(x, b * 0.5); c.stroke(); }
      for (const k of [-1, 1]) { seg(c, -R * 0.95, k * b * 0.55, R * 0.95, k * b * 0.55, m * 0.07, '#b8322e'); for (let i = 0; i < 5; i++) bola(c, -R * 0.9 + i * R * 0.45, k * b * 0.55, m * 0.06, '#d6a64a'); }
    },
  });
  reg('jardimPedras', {
    n: 'Jardim de pedras', g: 'oriental', size: 2, tags: 'zen areia jardim pedra',
    draw(c, R, t, s) {
      ret(c, -R * 0.95, -R * 0.95, R * 1.9, R * 1.9, R * 0.04, '#e8e0cc', R * 0.03);
      const pedras = [[-R * 0.35, -R * 0.3, 0.22], [R * 0.4, R * 0.3, 0.17], [R * 0.3, -R * 0.45, 0.1]];
      c.strokeStyle = 'rgba(150,140,120,0.6)'; c.lineWidth = R * 0.015;
      for (let i = 0; i < 12; i++) { const y = -R * 0.9 + i * R * 0.16; c.beginPath(); c.moveTo(-R * 0.92, y); c.lineTo(R * 0.92, y); c.stroke(); }
      for (const [x, y, r] of pedras) { for (let k = 1; k <= 3; k++) { c.beginPath(); c.arc(x, y, R * (r + k * 0.07), 0, TAU); c.fillStyle = '#e8e0cc'; c.fill(); c.stroke(); } }
      for (const [x, y, r] of pedras) pedrinha(c, x, y, R * r, s + Math.round(x));
      bola(c, R * 0.42, R * 0.28, R * 0.05, '#4f8a3e');
    },
  });

  /* ================= PORTÕES E CORTINAS ================= */
  reg('portaoMadeira', {
    n: 'Portão de madeira', g: 'portao', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, tags: 'porta portao entrada muralha',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B);
      const e = b * 0.55;
      for (const k of [-1, 1]) ret(c, k * R * 0.5 - R * 0.47, -e, R * 0.94, e * 2, m * 0.06, grad(c, 0, -e, 0, e, [MAD.cla, MAD.med]), m * 0.05);
      c.strokeStyle = 'rgba(40,22,8,0.5)'; c.lineWidth = m * 0.04; for (let i = 1; i < 8; i++) { const x = -R + i * R * 0.25; c.beginPath(); c.moveTo(x, -e); c.lineTo(x, e); c.stroke(); }
      for (const x of [-R * 0.7, -R * 0.25, R * 0.25, R * 0.7]) ret(c, x - m * 0.12, -e * 1.1, m * 0.24, e * 2.2, m * 0.04, FER.med, m * 0.03);
      for (const k of [-1, 1]) bola(c, k * R * 0.95, 0, b * 0.7, PED.med, m * 0.05);
      bola(c, -R * 0.08, 0, m * 0.06, FER.cla); bola(c, R * 0.08, 0, m * 0.06, FER.cla);
    },
  });
  reg('balista', {
    n: 'Balista', g: 'portao', size: 2, tags: 'cerco arma muralha defesa',
    draw(c, R) {
      sombra(c, R, 0.85, 0.85);
      ret(c, -R * 0.3, -R * 0.3, R * 0.6, R * 0.6, R * 0.05, MAD.esc, R * 0.03);
      ret(c, -R * 0.1, -R * 0.9, R * 0.2, R * 1.6, R * 0.05, grad(c, -R * 0.1, 0, R * 0.1, 0, [MAD.cla, MAD.luz, MAD.cla]), R * 0.03);
      c.strokeStyle = MAD.med; c.lineWidth = R * 0.1; c.beginPath(); c.moveTo(-R * 0.85, -R * 0.2); c.quadraticCurveTo(0, -R * 0.75, R * 0.85, -R * 0.2); c.stroke();
      c.strokeStyle = '#e8dcc0'; c.lineWidth = R * 0.02; c.beginPath(); c.moveTo(-R * 0.85, -R * 0.2); c.lineTo(0, R * 0.35); c.lineTo(R * 0.85, -R * 0.2); c.stroke();
      seg(c, 0, R * 0.35, 0, -R * 0.95, R * 0.04, MAD.esc); poli(c, [[-R * 0.07, -R * 0.85], [0, -R * 1.0], [R * 0.07, -R * 0.85]], FER.cla);
      bola(c, 0, R * 0.55, R * 0.12, FER.med, R * 0.02);
    },
  });

  /* ================= VILA E FESTA ================= */
  reg('mastroFitas', {
    n: 'Mastro de fitas', g: 'povo', size: 2, vivo: true, tags: 'festa danca dança festival',
    draw(c, R, t) {
      const cores = ['#e84a5a', '#f2c42a', '#3a8ad8', '#4ab85a', '#a85ad8', '#ff8a3a'];
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * 0.5, x = Math.cos(a) * R * 0.85, y = Math.sin(a) * R * 0.85; c.strokeStyle = cores[i]; c.lineWidth = R * 0.045; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Math.cos(a + 0.4) * R * 0.5, Math.sin(a + 0.4) * R * 0.5, x, y); c.stroke(); bola(c, x, y, R * 0.06, cores[i]); }
      bola(c, 0, 0, R * 0.14, MAD.cla, R * 0.03); bola(c, 0, 0, R * 0.08, '#d6a64a');
      for (let i = 0; i < 6; i++) bola(c, Math.cos(i) * R * 0.15, Math.sin(i) * R * 0.15, R * 0.04, i % 2 ? '#fff' : '#f0a0b8');
    },
  });
  reg('bandeirolas', {
    n: 'Bandeirolas', g: 'povo', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, vivo: true, tags: 'festa junina enfeite festival',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B), cores = ['#e84a5a', '#f2c42a', '#3a8ad8', '#4ab85a', '#a85ad8'];
      for (const k of [-1, 1]) bola(c, k * R * 0.95, 0, m * 0.1, MAD.esc);
      c.strokeStyle = '#6a5a40'; c.lineWidth = m * 0.02; c.beginPath(); c.moveTo(-R * 0.95, 0); c.quadraticCurveTo(0, b * 0.5, R * 0.95, 0); c.stroke();
      for (let i = 0; i < 9; i++) { const f = (i + 0.5) / 9, x = -R * 0.95 + f * R * 1.9, y = b * 0.5 * 4 * f * (1 - f) * 0.5, o = Math.sin(t * 3 + i) * m * 0.04;
        poli(c, [[x - R * 0.09, y - b * 0.3], [x + R * 0.09, y - b * 0.3], [x + o, y + b * 0.75]], cores[(i + s) % 5], m * 0.03); }
    },
  });
})();
