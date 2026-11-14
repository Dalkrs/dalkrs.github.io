/* ---------------------------------------------------------------
   6cc. OS OBJETOS DOS TEMAS, parte 1 (lote 158) — cinco categorias novas, para o mestre pôr à mão e para o gerador
   ("Objetos do tema"):
     · Taverna e estalagem: a chopeira, a mesa de jogo, o palco do bardo, o quadro de avisos, a lareira com espeto,
       o beliche da estalagem, o cachorro dormindo e a bandeja de canecas;
     · Escola de magia: o globo celeste, o telescópio, o quadro de runas, o cristal de vidência, a pilha de livros, os
       pergaminhos voando, o suporte das varinhas e a carteira do aluno;
     · Prisão e interrogatório: a gaiola suspensa, o tronco de castigo, a roda, a mesa de interrogatório, o cepo, o balde,
       o catre e o molho de chaves;
     · Fazenda e celeiro: o arado, o galinheiro, o espantalho, a colmeia, o moinho de mão, o chiqueiro, as ferramentas e
       as abóboras;
     · Treino e arena: o cavalete de armas, o ringue, o pódio, a arquibancada, os pesos, o poste com escudos e o tapete
       de luta.
   Props.kitT: os ajudantes de desenho que as partes 2 e 3 (06cd, 06ce) também usam.
   def.vivo: o desenho se mexe sozinho (o mapa fica animado, como com o fogo, mas sem fumaça).
   --------------------------------------------------------------- */
(() => {
  const { caixa, linha, grad, radial, hsh, MAD, PED, FER, chama, sombra } = Props.kit;
  const reg = (id, def) => Props.registrar(id, def);
  /* ---- os ajudantes ---- */
  const T = {
    bola(c, x, y, r, cor, lw) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); c.fillStyle = cor; c.fill(); if (lw) linha(c, lw); },
    oval(c, x, y, rx, ry, a, cor, lw) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), a || 0, 0, TAU); c.fillStyle = cor; c.fill(); if (lw) linha(c, lw); },
    ret(c, x, y, w, h, r, cor, lw) { caixa(c, x, y, w, h, r); c.fillStyle = cor; c.fill(); if (lw) linha(c, lw); },
    seg(c, x1, y1, x2, y2, w, cor) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = w; c.strokeStyle = cor; c.lineCap = 'round'; c.stroke(); },
    poli(c, pts, cor, lw) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = cor; c.fill(); if (lw) linha(c, lw); },
    // a sombra de um objeto retangular (R × B: as metades)
    somb(c, R, B, m) { c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; caixa(c, -R + m * 0.12, -B + m * 0.14, R * 2 - m * 0.1, B * 2 - m * 0.1, m * 0.2); c.fill(); c.restore(); },
    // o brilho (somado: clareia o que está embaixo)
    brilho(c, x, y, r, cor, a) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a == null ? 0.6 : a; c.fillStyle = radial(c, x, y, r, [cor, cor + '55', cor + '00']); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore(); },
    // as medidas de um comprido: B (a metade da altura) e m (o lado menor)
    mm(R, B) { B = B || R; return [B, Math.min(R, B)]; },
  };
  Props.kitT = T;
  const { bola, oval, ret, seg, poli, somb, brilho, mm } = T;
  const CANECA = '#c9a24a', ESPUMA = '#f6f0dc';

  /* ================= TAVERNA E ESTALAGEM ================= */
  Props.grupo('taverna', 'Taverna e estalagem');
  // a chopeira: dois barris deitados no cavalete, com as torneiras viradas para a frente
  reg('chopeira', {
    n: 'Chopeira', g: 'taverna', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R, b, m);
      ret(c, -R + m * 0.05, -b + m * 0.1, R * 2 - m * 0.1, b * 2 - m * 0.2, m * 0.06, MAD.esc, m * 0.05);
      for (const k of [-1, 1]) {
        const cx = k * R * 0.48, w = R * 0.82, h = b * 1.6;
        ret(c, cx - w / 2, -h / 2, w, h, m * 0.35, grad(c, cx - w / 2, 0, cx + w / 2, 0, [MAD.med, MAD.luz, MAD.med]), m * 0.05);
        for (const f of [0.18, 0.5, 0.82]) seg(c, cx - w / 2 + w * f, -h / 2 + m * 0.04, cx - w / 2 + w * f, h / 2 - m * 0.04, m * 0.07, FER.med);
        ret(c, cx - m * 0.08, h / 2 - m * 0.06, m * 0.16, m * 0.2, m * 0.03, '#b08a3a', m * 0.025);      // a torneira
      }
    },
  });
  // a mesa de jogo: a mesa redonda, as cartas espalhadas, os dados e as moedas
  reg('mesaJogo', {
    n: 'Mesa de jogo', g: 'taverna', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.8, 0.78);
      bola(c, 0, 0, R * 0.8, radial(c, -R * 0.2, -R * 0.25, R, [MAD.luz, MAD.cla, MAD.med]), R * 0.06);
      bola(c, 0, 0, R * 0.62, '#2f5a3a'); linha(c, R * 0.03, 'rgba(0,0,0,0.3)');
      for (let i = 0; i < 5; i++) { c.save(); c.translate((hsh(s, i, 1) - 0.5) * R * 0.7, (hsh(s, i, 2) - 0.5) * R * 0.7); c.rotate(hsh(s, i, 3) * 3); ret(c, -R * 0.1, -R * 0.14, R * 0.2, R * 0.28, R * 0.03, i % 2 ? '#f4efe2' : '#efe6d0', R * 0.02); c.fillStyle = i % 2 ? '#b3262e' : '#222'; c.fillRect(-R * 0.03, -R * 0.03, R * 0.06, R * 0.06); c.restore(); }
      for (const [x, y] of [[R * 0.3, -R * 0.15], [R * 0.15, R * 0.3]]) { ret(c, x - R * 0.07, y - R * 0.07, R * 0.14, R * 0.14, R * 0.03, '#f8f4ea', R * 0.02); bola(c, x, y, R * 0.025, '#222'); }
      for (let i = 0; i < 4; i++) bola(c, -R * 0.35 + i * R * 0.03, R * 0.2 - i * R * 0.02, R * 0.07, '#e2b842', R * 0.015);
    },
  });
  // o palco do bardo: o tablado de madeira, o banquinho, o alaúde e o chapéu das moedas
  reg('palcoBardo', {
    n: 'Palco do bardo', g: 'taverna', size: 2,
    draw(c, R) {
      sombra(c, R, 0.95, 0.95);
      ret(c, -R * 0.92, -R * 0.92, R * 1.84, R * 1.84, R * 0.08, grad(c, 0, -R, 0, R, [MAD.cla, MAD.med]), R * 0.04);
      c.strokeStyle = 'rgba(40,22,8,0.4)'; c.lineWidth = R * 0.015; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(-R * 0.92, -R * 0.92 + i * R * 0.307); c.lineTo(R * 0.92, -R * 0.92 + i * R * 0.307); c.stroke(); }
      bola(c, -R * 0.1, -R * 0.25, R * 0.2, MAD.esc, R * 0.03);
      c.save(); c.translate(R * 0.3, -R * 0.1); c.rotate(0.6);
      oval(c, 0, R * 0.12, R * 0.2, R * 0.26, 0, MAD.luz, R * 0.025); bola(c, 0, R * 0.1, R * 0.06, '#2a1a0e'); ret(c, -R * 0.035, -R * 0.42, R * 0.07, R * 0.38, R * 0.02, MAD.esc, R * 0.015);
      c.restore();
      oval(c, -R * 0.45, R * 0.5, R * 0.2, R * 0.16, 0, '#5a3a6e', R * 0.025); for (let i = 0; i < 3; i++) bola(c, -R * 0.5 + i * R * 0.05, R * 0.5, R * 0.04, '#e2b842');
    },
  });
  // o quadro de avisos: a tábua com os papéis pregados (os cartazes de procurado)
  reg('quadroAvisos', {
    n: 'Quadro de avisos', g: 'taverna', size: 1, costas: 'n',
    draw(c, R, t, s) {
      ret(c, -R * 0.85, -R * 0.85, R * 1.7, R * 0.6, R * 0.06, MAD.med, R * 0.05);
      for (let i = 0; i < 5; i++) { const x = -R * 0.75 + i * R * 0.3, y = -R * 0.8 + hsh(s, i, 2) * R * 0.1; c.save(); c.translate(x + R * 0.12, y + R * 0.2); c.rotate((hsh(s, i, 1) - 0.5) * 0.3); ret(c, -R * 0.12, -R * 0.18, R * 0.24, R * 0.34, R * 0.02, i === 2 ? '#e8d49a' : '#efe6d0', R * 0.02); seg(c, -R * 0.07, -R * 0.05, R * 0.07, -R * 0.05, R * 0.02, '#6b5a40'); seg(c, -R * 0.07, R * 0.03, R * 0.05, R * 0.03, R * 0.02, '#6b5a40'); bola(c, 0, -R * 0.15, R * 0.025, '#a33'); c.restore(); }
    },
  });
  // a lareira com espeto: a pedra, o fogo e o leitão girando no espeto
  reg('lareiraEspeto', {
    n: 'Lareira com espeto', g: 'taverna', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 }, fogo: true, luz: { bright: 3, dim: 6, c: '#ff9a48' },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R, b, m);
      ret(c, -R + m * 0.04, -b + m * 0.04, R * 2 - m * 0.08, b * 2 - m * 0.08, m * 0.08, grad(c, 0, -b, 0, b, [PED.cla, PED.med]), m * 0.06);
      ret(c, -R * 0.62, -b + m * 0.2, R * 1.24, b * 1.4, m * 0.1, '#1a1210', m * 0.04);
      for (let i = 0; i < 5; i++) Props.kit.brasa(c, -R * 0.4 + i * R * 0.2, b * 0.25, m * 0.09, t, s + i);
      chama(c, -R * 0.2, b * 0.35, m * 0.45, t, s, ang); chama(c, R * 0.2, b * 0.35, m * 0.4, t, s + 3, ang);
      seg(c, -R * 0.75, -b * 0.1, R * 0.75, -b * 0.1, m * 0.06, FER.cla);
      oval(c, 0, -b * 0.1, R * 0.36, m * 0.24, 0, grad(c, 0, -b * 0.4, 0, b * 0.2, ['#d08a4a', '#8a4a20']), m * 0.04);
      bola(c, R * 0.82, -b * 0.1, m * 0.08, FER.esc);
    },
  });
  // o beliche da estalagem: as duas camas (vistas de cima, a de cima por cima), o cobertor de lã
  reg('beliche', {
    n: 'Beliche', g: 'taverna', size: 2, fw: 1, fh: 2, costas: 'o', legado: { w: 0.5, h: 1 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.35)'; caixa(c, -R + m * 0.2, -B + m * 0.2, R * 2 - m * 0.1, B * 2 - m * 0.1, m * 0.1); c.fill(); c.restore();
      ret(c, -R + m * 0.06, -B + m * 0.04, R * 2 - m * 0.12, B * 2 - m * 0.08, m * 0.06, MAD.esc, m * 0.06);
      ret(c, -R + m * 0.16, -B + m * 0.12, R * 2 - m * 0.32, B * 2 - m * 0.24, m * 0.08, '#d9ccb0', m * 0.03);
      ret(c, -R + m * 0.22, -B + m * 0.2, R * 2 - m * 0.44, m * 0.45, m * 0.1, '#f2ead6', m * 0.025);
      ret(c, -R + m * 0.16, -B + m * 0.8, R * 2 - m * 0.32, B * 2 - m * 0.92, m * 0.08, grad(c, 0, -B, 0, B, ['#8a4a3a', '#6a3428']), m * 0.03);
      c.strokeStyle = 'rgba(240,220,180,0.35)'; c.lineWidth = m * 0.05; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-R + m * 0.2, -B + m * 0.8 + i * (B * 2 - m * 0.92) / 4); c.lineTo(R - m * 0.2, -B + m * 0.8 + i * (B * 2 - m * 0.92) / 4); c.stroke(); }
      for (const k of [-1, 1]) for (const j of [-1, 1]) bola(c, k * (R - m * 0.1), j * (B - m * 0.1), m * 0.08, MAD.med, m * 0.02);
    },
  });
  // o cachorro dormindo, enrolado (respira devagar)
  reg('cachorro', {
    n: 'Cachorro dormindo', g: 'taverna', size: 1, vivo: true,
    draw(c, R, t, s) {
      const cor = [['#c8955a', '#9a6a38'], ['#5a4a3e', '#3a2e26'], ['#e8dcc4', '#bba98a']][s % 3], r = 1 + Math.sin(t * 1.6) * 0.025;
      sombra(c, R, 0.7, 0.6);
      c.save(); c.scale(r, r);
      oval(c, 0, R * 0.05, R * 0.62, R * 0.5, 0, radial(c, -R * 0.2, -R * 0.1, R * 0.8, [cor[0], cor[1]]), R * 0.05);
      oval(c, R * 0.28, R * 0.28, R * 0.35, R * 0.13, -0.5, cor[1]);      // o rabo enrolado
      oval(c, -R * 0.3, -R * 0.22, R * 0.27, R * 0.23, 0.3, cor[0], R * 0.04);
      oval(c, -R * 0.48, -R * 0.2, R * 0.14, R * 0.08, 0.4, cor[1]); oval(c, -R * 0.16, -R * 0.38, R * 0.12, R * 0.07, -0.4, cor[1]);
      seg(c, -R * 0.38, -R * 0.2, -R * 0.3, -R * 0.18, R * 0.025, '#1a1410'); bola(c, -R * 0.53, -R * 0.08, R * 0.04, '#1a1410');
      c.restore();
    },
  });
  // a bandeja de canecas: a bandeja de madeira e as canecas com a espuma
  reg('canecas', {
    n: 'Bandeja de canecas', g: 'taverna', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.7, 0.55);
      ret(c, -R * 0.72, -R * 0.55, R * 1.44, R * 1.1, R * 0.12, grad(c, 0, -R * 0.55, 0, R * 0.55, [MAD.luz, MAD.med]), R * 0.05);
      for (let i = 0; i < 5; i++) { const x = -R * 0.42 + (i % 3) * R * 0.42 + (i > 2 ? R * 0.21 : 0), y = i > 2 ? R * 0.2 : -R * 0.18; bola(c, x, y, R * 0.18, CANECA, R * 0.03); bola(c, x, y, R * 0.13, ESPUMA); seg(c, x + R * 0.17, y, x + R * 0.26, y, R * 0.05, '#8a6a2a'); }
    },
  });

  /* ================= ESCOLA DE MAGIA ================= */
  Props.grupo('escola', 'Escola de magia');
  // o globo celeste: os anéis de bronze em volta da esfera das estrelas (giram devagar)
  reg('globoCeleste', {
    n: 'Globo celeste', g: 'escola', size: 1, vivo: true,
    draw(c, R, t) {
      sombra(c, R, 0.6, 0.6);
      bola(c, 0, 0, R * 0.42, radial(c, -R * 0.15, -R * 0.15, R * 0.5, ['#4a6aa8', '#1e2c58', '#0e1430']), R * 0.04);
      for (let i = 0; i < 7; i++) bola(c, Math.cos(i * 2.1 + t * 0.3) * R * 0.28, Math.sin(i * 1.7) * R * 0.3, R * 0.025, '#f6e8a8');
      c.strokeStyle = '#c99a3a'; c.lineWidth = R * 0.06;
      for (const [a, k] of [[t * 0.25, 0.35], [t * 0.25 + 1.6, 0.2], [0.4, 1]]) { c.beginPath(); c.ellipse(0, 0, R * 0.7, R * 0.7 * Math.abs(Math.cos(a)) * k + R * 0.05, 0.4 + k, 0, TAU); c.stroke(); }
      bola(c, 0, 0, R * 0.07, '#e6c060', R * 0.02);
    },
  });
  // o telescópio no tripé, apontado para o alto
  reg('telescopio', {
    n: 'Telescópio', g: 'escola', size: 1,
    draw(c, R) {
      sombra(c, R, 0.55, 0.55);
      for (const a of [0.6, 2.6, 4.4]) seg(c, 0, 0, Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7, R * 0.07, MAD.esc);
      c.save(); c.rotate(-0.7);
      ret(c, -R * 0.75, -R * 0.13, R * 1.5, R * 0.26, R * 0.1, grad(c, 0, -R * 0.13, 0, R * 0.13, ['#e0b45a', '#9a6a22']), R * 0.04);
      ret(c, R * 0.55, -R * 0.17, R * 0.24, R * 0.34, R * 0.06, '#7a4e18', R * 0.03);
      bola(c, R * 0.8, 0, R * 0.12, '#9fd8ff'); bola(c, -R * 0.78, 0, R * 0.06, '#2a2a3a');
      c.restore();
      bola(c, 0, 0, R * 0.11, FER.med, R * 0.03);
    },
  });
  // o quadro de runas: a lousa escura na parede, com os círculos e as runas de giz
  reg('quadroRunas', {
    n: 'Quadro de runas', g: 'escola', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B), h = Math.min(b * 2, m * 0.7);
      ret(c, -R + m * 0.04, -b, R * 2 - m * 0.08, h, m * 0.05, MAD.esc, m * 0.05);
      ret(c, -R + m * 0.12, -b + m * 0.08, R * 2 - m * 0.24, h - m * 0.16, m * 0.03, '#26332e');
      c.strokeStyle = 'rgba(240,240,230,0.75)'; c.lineWidth = m * 0.025;
      c.beginPath(); c.arc(-R * 0.45, -b + h / 2, h * 0.3, 0, TAU); c.moveTo(-R * 0.45 + h * 0.18, -b + h / 2); c.arc(-R * 0.45, -b + h / 2, h * 0.18, 0, TAU); c.stroke();
      for (let i = 0; i < 6; i++) { const x = -R * 0.05 + i * R * 0.16, y = -b + h * (0.35 + (i % 2) * 0.25); c.beginPath(); c.moveTo(x, y - h * 0.1); c.lineTo(x + R * 0.05, y + h * 0.08); c.lineTo(x + R * 0.09, y - h * 0.06); c.stroke(); }
      ret(c, R * 0.55, -b + h - m * 0.08, m * 0.18, m * 0.06, m * 0.02, '#f4f0e6');
    },
  });
  // o cristal de vidência: a bola de cristal no pedestal, com a névoa girando dentro
  reg('cristalVidencia', {
    n: 'Cristal de vidência', g: 'escola', size: 1, vivo: true, calma: true, luz: { bright: 1, dim: 3, c: '#b89cff' },
    draw(c, R, t) {
      sombra(c, R, 0.55, 0.55);
      poli(c, [[-R * 0.5, R * 0.3], [0, -R * 0.2], [R * 0.5, R * 0.3], [0, R * 0.55]], grad(c, 0, -R * 0.2, 0, R * 0.55, [MAD.luz, MAD.esc]), R * 0.04);
      brilho(c, 0, 0, R * 0.95, '#b89cff', 0.45);
      bola(c, 0, 0, R * 0.45, radial(c, -R * 0.15, -R * 0.15, R * 0.5, ['#f4ecff', '#a888e8', '#4a2a8f']), R * 0.04);
      c.save(); c.globalAlpha = 0.55; for (let i = 0; i < 3; i++) oval(c, Math.cos(t * 0.8 + i * 2) * R * 0.14, Math.sin(t * 0.8 + i * 2) * R * 0.14, R * 0.18, R * 0.07, t + i, '#ffffff'); c.restore();
      bola(c, -R * 0.15, -R * 0.17, R * 0.07, 'rgba(255,255,255,0.85)');
    },
  });
  // a pilha de livros: os livros grossos, uns sobre os outros, e um aberto
  reg('pilhaLivros', {
    n: 'Pilha de livros', g: 'escola', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.62, 0.55);
      const cores = ['#7a2f3a', '#2f4a7a', '#3e6a3a', '#6a4a1e', '#5a2f6a'];
      for (let i = 0; i < 4; i++) { c.save(); c.rotate((hsh(s, i, 1) - 0.5) * 0.6); const w = R * (1.1 - i * 0.12), h = R * (0.8 - i * 0.08); ret(c, -w / 2, -h / 2 - i * R * 0.04, w, h, R * 0.05, cores[(s + i) % 5], R * 0.04); ret(c, -w / 2 + R * 0.04, h / 2 - R * 0.12 - i * R * 0.04, w - R * 0.08, R * 0.08, R * 0.02, '#efe6d0'); c.restore(); }
      seg(c, -R * 0.15, -R * 0.1, R * 0.15, -R * 0.1, R * 0.03, '#d6a64a');
    },
  });
  // os pergaminhos voando: três rolos abertos que flutuam em volta (o feitiço que lê sozinho)
  reg('pergaminhosVoando', {
    n: 'Pergaminhos voando', g: 'escola', size: 1, vivo: true, calma: true, luz: { bright: 0.5, dim: 2, c: '#ffe7a8' },
    draw(c, R, t, s) {
      for (let i = 0; i < 3; i++) {
        const a = t * 0.6 + i * TAU / 3, x = Math.cos(a) * R * 0.45, y = Math.sin(a) * R * 0.45 + Math.sin(t * 2 + i) * R * 0.06;
        c.save(); c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x + R * 0.15, y + R * 0.25, R * 0.22, R * 0.08, 0, 0, TAU); c.fill(); c.restore();
        c.save(); c.translate(x, y); c.rotate(a + Math.sin(t + i) * 0.3);
        ret(c, -R * 0.2, -R * 0.13, R * 0.4, R * 0.26, R * 0.02, '#efe2c2', R * 0.02);
        for (const k of [-1, 1]) oval(c, k * R * 0.2, 0, R * 0.04, R * 0.15, 0, '#c9a878', R * 0.015);
        for (let j = 0; j < 3; j++) seg(c, -R * 0.13, -R * 0.06 + j * R * 0.06, R * 0.12, -R * 0.06 + j * R * 0.06, R * 0.015, 'rgba(90,60,30,0.6)');
        c.restore();
      }
      brilho(c, 0, 0, R * 0.3, '#ffe7a8', 0.3);
    },
  });
  // o suporte das varinhas: o bloco de madeira com os furos e as varinhas de pé
  reg('suporteVarinhas', {
    n: 'Suporte de varinhas', g: 'escola', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.62, 0.42);
      ret(c, -R * 0.7, -R * 0.35, R * 1.4, R * 0.7, R * 0.1, grad(c, 0, -R * 0.35, 0, R * 0.35, [MAD.luz, MAD.med]), R * 0.05);
      const pontas = ['#9fd8ff', '#ff9a6a', '#b8ff9a', '#e6b8ff', '#fff2a0'];
      for (let i = 0; i < 5; i++) { const x = -R * 0.5 + i * R * 0.25, y = (i % 2 ? 0.1 : -0.1) * R; seg(c, x, y, x + R * 0.18, y - R * 0.55, R * 0.06, i % 2 ? MAD.esc : '#e8dcc0'); bola(c, x + R * 0.18, y - R * 0.55, R * 0.05, pontas[i]); bola(c, x, y, R * 0.06, '#1e140c'); }
    },
  });
  // a carteira do aluno: a mesinha inclinada com o tinteiro e o caderno
  reg('carteira', {
    n: 'Carteira de aluno', g: 'escola', size: 1,
    draw(c, R) {
      sombra(c, R, 0.75, 0.6);
      ret(c, -R * 0.75, -R * 0.55, R * 1.5, R * 0.8, R * 0.06, grad(c, 0, -R * 0.55, 0, R * 0.25, [MAD.cla, MAD.med]), R * 0.05);
      ret(c, -R * 0.45, R * 0.4, R * 0.9, R * 0.38, R * 0.08, MAD.esc, R * 0.04);
      ret(c, -R * 0.5, -R * 0.42, R * 0.6, R * 0.45, R * 0.03, '#efe2c2', R * 0.02);
      for (let j = 0; j < 4; j++) seg(c, -R * 0.44, -R * 0.33 + j * R * 0.1, -R * 0.0, -R * 0.33 + j * R * 0.1, R * 0.015, 'rgba(60,40,20,0.5)');
      bola(c, R * 0.42, -R * 0.3, R * 0.11, '#1a1a2a', R * 0.02); seg(c, R * 0.42, -R * 0.3, R * 0.62, -R * 0.62, R * 0.04, '#f4f0e6');
    },
  });

  /* ================= PRISÃO E INTERROGATÓRIO ================= */
  Props.grupo('prisao', 'Prisão e interrogatório');
  // a gaiola suspensa: a gaiola redonda pendurada pela corrente (balança um pouco), a sombra no chão
  reg('gaiolaSuspensa', {
    n: 'Gaiola suspensa', g: 'prisao', size: 1, vivo: true,
    draw(c, R, t) {
      const bal = Math.sin(t * 0.9) * R * 0.06;
      c.save(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.arc(R * 0.25, R * 0.3, R * 0.62, 0, TAU); c.fill(); c.restore();
      c.save(); c.translate(bal, 0);
      bola(c, 0, 0, R * 0.68, 'rgba(30,26,22,0.35)');
      c.strokeStyle = FER.esc; c.lineWidth = R * 0.07; c.beginPath(); c.arc(0, 0, R * 0.68, 0, TAU); c.stroke();
      c.lineWidth = R * 0.045; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R * 0.68, Math.sin(a) * R * 0.68); c.stroke(); }
      c.beginPath(); c.arc(0, 0, R * 0.36, 0, TAU); c.stroke();
      bola(c, 0, 0, R * 0.12, FER.cla, R * 0.03);
      c.restore();
    },
  });
  // o tronco de castigo: a prancha com os três buracos (a cabeça e as mãos) nos dois postes
  reg('troncoCastigo', {
    n: 'Tronco de castigo', g: 'prisao', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R, b * 0.5, m);
      ret(c, -R * 0.9, -m * 0.28, R * 1.8, m * 0.56, m * 0.08, grad(c, 0, -m * 0.28, 0, m * 0.28, [MAD.cla, MAD.med]), m * 0.05);
      seg(c, -R * 0.9, 0, R * 0.9, 0, m * 0.025, 'rgba(30,16,6,0.6)');
      for (const [x, r] of [[-R * 0.45, 0.12], [0, 0.18], [R * 0.45, 0.12]]) bola(c, x, 0, m * r, '#1e140c');
      for (const k of [-1, 1]) bola(c, k * R * 0.95, 0, m * 0.16, MAD.esc, m * 0.04);
      for (const k of [-1, 1]) ret(c, k * R * 0.7 - m * 0.06, -m * 0.34, m * 0.12, m * 0.12, m * 0.02, FER.cla, m * 0.02);
    },
  });
  // a roda de tortura: a roda grande de madeira com os raios e as correntes
  reg('rodaTortura', {
    n: 'Roda de tortura', g: 'prisao', size: 2,
    draw(c, R) {
      sombra(c, R, 0.85, 0.85);
      c.strokeStyle = MAD.esc; c.lineWidth = R * 0.14; c.beginPath(); c.arc(0, 0, R * 0.78, 0, TAU); c.stroke();
      c.strokeStyle = MAD.med; c.lineWidth = R * 0.09; c.stroke();
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; seg(c, 0, 0, Math.cos(a) * R * 0.74, Math.sin(a) * R * 0.74, R * 0.07, MAD.cla); }
      bola(c, 0, 0, R * 0.16, FER.med, R * 0.04);
      c.strokeStyle = FER.cla; c.lineWidth = R * 0.03; for (const a of [0.8, 2.4, 4, 5.5]) { c.beginPath(); c.arc(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6, R * 0.08, 0, TAU); c.stroke(); }
      for (let i = 0; i < 3; i++) bola(c, R * (0.1 + i * 0.12), R * 0.92 - i * R * 0.02, R * 0.06, 'rgba(110,20,20,0.7)');
    },
  });
  // a mesa de interrogatório: a mesa, as duas cadeiras de frente, o lampião, os papéis e as algemas
  reg('mesaInterrogatorio', {
    n: 'Mesa de interrogatório', g: 'prisao', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R * 0.7, b * 0.7, m);
      for (const k of [-1, 1]) ret(c, k * R * 0.88 - m * 0.22, -m * 0.22, m * 0.44, m * 0.44, m * 0.08, MAD.esc, m * 0.04);
      ret(c, -R * 0.62, -b * 0.75, R * 1.24, b * 1.5, m * 0.06, grad(c, 0, -b, 0, b, [MAD.cla, MAD.med]), m * 0.05);
      ret(c, -R * 0.42, -b * 0.45, m * 0.45, m * 0.55, m * 0.02, '#efe6d0', m * 0.02); ret(c, -R * 0.36, -b * 0.4, m * 0.45, m * 0.55, m * 0.02, '#f4efe2', m * 0.02);
      c.strokeStyle = FER.cla; c.lineWidth = m * 0.05; for (const x of [R * 0.05, R * 0.25]) { c.beginPath(); c.arc(x, b * 0.15, m * 0.11, 0, TAU); c.stroke(); } seg(c, R * 0.16, b * 0.15, R * 0.14, b * 0.15, m * 0.04, FER.cla);
      bola(c, R * 0.42, -b * 0.25, m * 0.14, '#3d434c', m * 0.03); brilho(c, R * 0.42, -b * 0.25, m * 0.45, '#ffcf80', 0.5); bola(c, R * 0.42, -b * 0.25, m * 0.06, '#ffe7a8');
    },
  });
  // o cepo: o toco grosso, com o machado cravado
  reg('cepo', {
    n: 'Cepo do carrasco', g: 'prisao', size: 1,
    draw(c, R) {
      sombra(c, R, 0.62, 0.6);
      bola(c, 0, 0, R * 0.58, radial(c, -R * 0.15, -R * 0.15, R * 0.6, [MAD.luz, MAD.cla, MAD.med]), R * 0.05);
      c.strokeStyle = 'rgba(60,32,12,0.45)'; c.lineWidth = R * 0.025; for (const r of [0.15, 0.3, 0.45]) { c.beginPath(); c.arc(0, 0, R * r, 0, TAU); c.stroke(); }
      oval(c, R * 0.1, R * 0.1, R * 0.2, R * 0.12, 0.3, 'rgba(110,20,20,0.6)');
      c.save(); c.rotate(-0.5); seg(c, -R * 0.05, 0, R * 0.85, 0, R * 0.09, MAD.esc);
      poli(c, [[-R * 0.15, -R * 0.25], [R * 0.12, -R * 0.12], [R * 0.12, R * 0.12], [-R * 0.15, R * 0.25]], grad(c, -R * 0.15, 0, R * 0.12, 0, [FER.luz, FER.med]), R * 0.03);
      c.restore();
    },
  });
  // o balde de madeira, com a água suja
  reg('balde', {
    n: 'Balde', g: 'prisao', size: 1,
    draw(c, R) {
      sombra(c, R, 0.48, 0.45);
      bola(c, 0, 0, R * 0.42, MAD.med, R * 0.05);
      c.strokeStyle = FER.med; c.lineWidth = R * 0.05; for (const r of [0.42, 0.34]) { c.beginPath(); c.arc(0, 0, R * r, 0, TAU); c.stroke(); }
      bola(c, 0, 0, R * 0.3, radial(c, 0, 0, R * 0.3, ['#7a7458', '#4a4636']));
      c.strokeStyle = FER.cla; c.lineWidth = R * 0.04; c.beginPath(); c.arc(0, 0, R * 0.55, -2.6, -0.5); c.stroke();
    },
  });
  // o catre: a tábua da cela, com a palha e o cobertor puído
  reg('catre', {
    n: 'Catre', g: 'prisao', size: 2, fw: 1, fh: 2, costas: 'o', legado: { w: 0.5, h: 1 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; caixa(c, -R + m * 0.2, -B + m * 0.15, R * 2 - m * 0.2, B * 2 - m * 0.2, m * 0.08); c.fill(); c.restore();
      ret(c, -R + m * 0.12, -B + m * 0.08, R * 2 - m * 0.24, B * 2 - m * 0.16, m * 0.05, grad(c, -R, 0, R, 0, [MAD.cla, MAD.med]), m * 0.05);
      c.strokeStyle = '#d9c070'; c.lineWidth = m * 0.03; for (let i = 0; i < 14; i++) { const x = -R * 0.6 + hsh(s, i, 1) * R * 1.2, y = -B * 0.8 + hsh(s, i, 2) * B * 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + m * 0.2 * (hsh(s, i, 3) - 0.5), y + m * 0.2); c.stroke(); }
      poli(c, [[-R * 0.75, B * 0.05], [R * 0.75, -B * 0.05], [R * 0.75, B * 0.85], [-R * 0.75, B * 0.85]], '#6a5a48', m * 0.03);
      seg(c, -R * 0.3, B * 0.3, R * 0.2, B * 0.5, m * 0.03, 'rgba(30,24,18,0.5)');
    },
  });
  // o molho de chaves no gancho (o carcereiro esquece aqui)
  reg('molhoChaves', {
    n: 'Molho de chaves', g: 'prisao', size: 1, costas: 'n',
    draw(c, R) {
      ret(c, -R * 0.12, -R * 0.9, R * 0.24, R * 0.2, R * 0.04, FER.med, R * 0.03);
      c.strokeStyle = FER.cla; c.lineWidth = R * 0.06; c.beginPath(); c.arc(0, -R * 0.35, R * 0.28, 0, TAU); c.stroke();
      for (let i = 0; i < 4; i++) { const a = 0.6 + i * 0.6; c.save(); c.translate(Math.cos(a) * R * 0.28, -R * 0.35 + Math.sin(a) * R * 0.28); c.rotate(a - Math.PI / 2); c.strokeStyle = '#c9a24a'; c.lineWidth = R * 0.07; c.beginPath(); c.arc(0, R * 0.06, R * 0.07, 0, TAU); c.moveTo(0, R * 0.13); c.lineTo(0, R * 0.48); c.moveTo(0, R * 0.42); c.lineTo(R * 0.1, R * 0.42); c.stroke(); c.restore(); }
    },
  });

  /* ================= FAZENDA E CELEIRO ================= */
  Props.grupo('fazenda', 'Fazenda e celeiro');
  // o arado: os dois cabos, a lâmina de ferro e a terra revirada atrás
  reg('arado', {
    n: 'Arado', g: 'fazenda', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B);
      c.strokeStyle = 'rgba(70,46,24,0.55)'; c.lineWidth = m * 0.1; for (const y of [-0.3, 0, 0.3]) { c.beginPath(); c.moveTo(-R * 0.95, y * b); c.lineTo(-R * 0.15, y * b); c.stroke(); }
      seg(c, -R * 0.1, 0, R * 0.95, 0, m * 0.12, MAD.med);
      for (const k of [-1, 1]) seg(c, -R * 0.2, 0, -R * 0.7, k * b * 0.55, m * 0.08, MAD.cla);
      poli(c, [[-R * 0.05, -m * 0.25], [R * 0.3, 0], [-R * 0.05, m * 0.25]], grad(c, -R * 0.05, 0, R * 0.3, 0, [FER.luz, FER.med]), m * 0.03);
      bola(c, R * 0.95, 0, m * 0.09, FER.esc);
    },
  });
  // o galinheiro: a casinha de madeira com o telhado, o cercado de tela e as galinhas ciscando
  reg('galinheiro', {
    n: 'Galinheiro', g: 'fazenda', size: 2, vivo: true,
    draw(c, R, t, s) {
      sombra(c, R, 0.95, 0.95);
      ret(c, -R * 0.92, -R * 0.92, R * 1.84, R * 1.84, R * 0.05, 'rgba(150,120,70,0.35)');
      c.strokeStyle = 'rgba(200,200,190,0.6)'; c.lineWidth = R * 0.012; for (let i = 0; i <= 12; i++) { const v = -R * 0.92 + i * R * 0.153; c.beginPath(); c.moveTo(v, -R * 0.92); c.lineTo(v, R * 0.92); c.moveTo(-R * 0.92, v); c.lineTo(R * 0.92, v); c.stroke(); }
      c.strokeStyle = MAD.med; c.lineWidth = R * 0.05; c.strokeRect(-R * 0.92, -R * 0.92, R * 1.84, R * 1.84);
      ret(c, -R * 0.9, -R * 0.9, R * 0.9, R * 0.75, R * 0.04, grad(c, -R * 0.9, 0, 0, 0, ['#9a4a2a', '#c86a3a']), R * 0.04);
      seg(c, -R * 0.45, -R * 0.9, -R * 0.45, -R * 0.15, R * 0.04, '#6a2e18');
      for (let i = 0; i < 4; i++) {
        const x = (hsh(s, i, 1) - 0.2) * R * 1.2 + Math.sin(t * 0.7 + i) * R * 0.1, y = (hsh(s, i, 2) - 0.1) * R * 1.1, bica = Math.sin(t * 3 + i * 2) > 0.6 ? R * 0.05 : 0;
        oval(c, x, y, R * 0.13, R * 0.1, i, i % 2 ? '#f4efe2' : '#b8662e', R * 0.02); bola(c, x + R * 0.1, y - R * 0.04 + bica, R * 0.06, i % 2 ? '#f4efe2' : '#b8662e'); bola(c, x + R * 0.1, y - R * 0.09 + bica, R * 0.03, '#d22');
      }
      for (let i = 0; i < 8; i++) bola(c, R * 0.1 + hsh(s, i, 5) * R * 0.7, R * 0.2 + hsh(s, i, 6) * R * 0.6, R * 0.018, '#e8c84a');
    },
  });
  // o espantalho: a cruz de madeira, a camisa de retalhos e o chapéu de palha
  reg('espantalho', {
    n: 'Espantalho', g: 'fazenda', size: 1, vivo: true,
    draw(c, R, t) {
      sombra(c, R, 0.7, 0.3, 0.2, 0.25);
      const b = Math.sin(t * 1.2) * 0.05;
      c.save(); c.rotate(b);
      seg(c, -R * 0.85, 0, R * 0.85, 0, R * 0.08, MAD.med);
      poli(c, [[-R * 0.6, -R * 0.15], [R * 0.6, -R * 0.15], [R * 0.4, R * 0.35], [-R * 0.4, R * 0.35]], '#8a6a4a', R * 0.04);
      ret(c, -R * 0.2, -R * 0.05, R * 0.2, R * 0.18, R * 0.02, '#4a6a8a'); ret(c, R * 0.1, R * 0.05, R * 0.18, R * 0.15, R * 0.02, '#a84a3a');
      c.strokeStyle = '#d9c070'; c.lineWidth = R * 0.04; for (const k of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(k * R * 0.85, 0); c.lineTo(k * R * 0.98, (i - 1) * R * 0.1); c.stroke(); }
      oval(c, 0, -R * 0.12, R * 0.38, R * 0.36, 0, '#d9b45a', R * 0.04); bola(c, 0, -R * 0.12, R * 0.2, '#c99a3a', R * 0.025);
      c.restore();
    },
  });
  // a colmeia: a casinha de palha trançada e as abelhas em volta
  reg('colmeia', {
    n: 'Colmeia', g: 'fazenda', size: 1, vivo: true,
    draw(c, R, t, s) {
      sombra(c, R, 0.55, 0.55);
      bola(c, 0, 0, R * 0.5, radial(c, -R * 0.15, -R * 0.15, R * 0.55, ['#f0cf7a', '#c9963a', '#8a5e1e']), R * 0.05);
      c.strokeStyle = 'rgba(110,70,20,0.6)'; c.lineWidth = R * 0.035; for (const r of [0.15, 0.27, 0.39]) { c.beginPath(); c.arc(0, 0, R * r, 0, TAU); c.stroke(); }
      for (let i = 0; i < 6; i++) { const a = t * (1.5 + hsh(s, i, 1)) + i, x = Math.cos(a) * R * (0.6 + 0.2 * Math.sin(t * 2 + i)), y = Math.sin(a * 1.3) * R * 0.7; bola(c, x, y, R * 0.04, '#2a2010'); bola(c, x + R * 0.02, y, R * 0.03, '#f2c42a'); }
    },
  });
  // o moinho de mão: as duas mós de pedra, o cabo e a farinha
  reg('moinhoMao', {
    n: 'Moinho de mão', g: 'fazenda', size: 1,
    draw(c, R) {
      sombra(c, R, 0.62, 0.6);
      oval(c, R * 0.1, R * 0.15, R * 0.6, R * 0.55, 0, 'rgba(240,236,224,0.85)');
      bola(c, 0, 0, R * 0.55, radial(c, -R * 0.15, -R * 0.15, R * 0.6, [PED.luz, PED.cla, PED.med]), R * 0.05);
      bola(c, 0, 0, R * 0.42, PED.cla, R * 0.03); bola(c, 0, 0, R * 0.09, '#3a3a40');
      seg(c, R * 0.28, -R * 0.1, R * 0.28, -R * 0.45, R * 0.09, MAD.med);
    },
  });
  // o chiqueiro: o cercadinho de toras, a lama e o porco
  reg('chiqueiro', {
    n: 'Chiqueiro', g: 'fazenda', size: 2, vivo: true,
    draw(c, R, t, s) {
      ret(c, -R * 0.9, -R * 0.9, R * 1.8, R * 1.8, R * 0.1, '#6a5030');
      oval(c, R * 0.1, R * 0.15, R * 0.6, R * 0.42, 0.3, '#4a3820');
      ret(c, R * 0.35, -R * 0.75, R * 0.45, R * 0.28, R * 0.05, MAD.med, R * 0.03);
      const x = -R * 0.25 + Math.sin(t * 0.4) * R * 0.1;
      oval(c, x, R * 0.05, R * 0.38, R * 0.26, 0, '#f0a8a8', R * 0.035); oval(c, x - R * 0.4, R * 0.05, R * 0.13, R * 0.12, 0, '#f0a8a8', R * 0.03); oval(c, x - R * 0.5, R * 0.05, R * 0.06, R * 0.07, 0, '#e08a8a', R * 0.02);
      for (const k of [-1, 1]) oval(c, x - R * 0.36, R * 0.05 + k * R * 0.11, R * 0.05, R * 0.04, 0, '#e08a8a');
      c.strokeStyle = '#e08a8a'; c.lineWidth = R * 0.03; c.beginPath(); c.arc(x + R * 0.42, R * 0.05, R * 0.06, 0, 5); c.stroke();
      c.strokeStyle = MAD.cla; c.lineWidth = R * 0.08; c.strokeRect(-R * 0.9, -R * 0.9, R * 1.8, R * 1.8);
      for (const [px, py] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) bola(c, px * R * 0.9, py * R * 0.9, R * 0.08, MAD.esc);
    },
  });
  // as ferramentas encostadas: o forcado, o ancinho e a pá
  reg('ferramentasFazenda', {
    n: 'Ferramentas da roça', g: 'fazenda', size: 1, costas: 'n',
    draw(c, R) {
      for (const [x, a] of [[-R * 0.5, -0.15], [0, 0.05], [R * 0.5, 0.2]]) { c.save(); c.translate(x, R * 0.1); c.rotate(a); seg(c, 0, R * 0.7, 0, -R * 0.55, R * 0.07, MAD.cla); c.restore(); }
      c.save(); c.translate(-R * 0.5, R * 0.1); c.rotate(-0.15); for (const k of [-1, 0, 1]) seg(c, k * R * 0.1, -R * 0.55, k * R * 0.1, -R * 0.85, R * 0.035, FER.cla); seg(c, -R * 0.1, -R * 0.55, R * 0.1, -R * 0.55, R * 0.04, FER.cla); c.restore();
      c.save(); c.translate(0, R * 0.1); c.rotate(0.05); seg(c, -R * 0.2, -R * 0.6, R * 0.2, -R * 0.6, R * 0.05, FER.cla); for (let i = 0; i < 5; i++) seg(c, -R * 0.18 + i * R * 0.09, -R * 0.6, -R * 0.18 + i * R * 0.09, -R * 0.72, R * 0.025, FER.cla); c.restore();
      c.save(); c.translate(R * 0.5, R * 0.1); c.rotate(0.2); poli(c, [[-R * 0.14, -R * 0.55], [R * 0.14, -R * 0.55], [R * 0.1, -R * 0.9], [-R * 0.1, -R * 0.9]], FER.med, R * 0.025); c.restore();
    },
  });
  // as abóboras: três abóboras laranja com as folhas e a rama
  reg('aboboras', {
    n: 'Abóboras', g: 'fazenda', size: 1,
    draw(c, R, t, s) {
      for (let i = 0; i < 4; i++) oval(c, (hsh(s, i, 1) - 0.5) * R * 1.3, (hsh(s, i, 2) - 0.5) * R * 1.3, R * 0.28, R * 0.18, hsh(s, i, 3) * 3, i % 2 ? '#3f7a34' : '#4f8a3e');
      for (const [x, y, r] of [[-R * 0.3, -R * 0.15, 0.32], [R * 0.32, R * 0.05, 0.27], [-R * 0.05, R * 0.4, 0.22]]) {
        bola(c, x, y, R * r, radial(c, x - R * r * 0.3, y - R * r * 0.3, R * r * 1.2, ['#ffb85a', '#e8782a', '#a8481a']), R * 0.03);
        c.strokeStyle = 'rgba(120,50,10,0.45)'; c.lineWidth = R * 0.02; for (const k of [0.4, 0.75]) { c.beginPath(); c.ellipse(x, y, R * r * k, R * r, 0, 0, TAU); c.stroke(); }
        ret(c, x - R * 0.03, y - R * 0.04, R * 0.06, R * 0.08, R * 0.02, '#5a6a2a');
      }
    },
  });

  /* ================= TREINO E ARENA ================= */
  Props.grupo('treino', 'Treino e arena');
  // o cavalete de armas: a armação de madeira com as lanças, as espadas e o machado de pé
  reg('cavaleteArmas', {
    n: 'Cavalete de armas', g: 'treino', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R, b * 0.6, m);
      ret(c, -R * 0.95, -b * 0.55, R * 1.9, m * 0.22, m * 0.05, MAD.med, m * 0.04); ret(c, -R * 0.95, b * 0.2, R * 1.9, m * 0.22, m * 0.05, MAD.med, m * 0.04);
      for (let i = 0; i < 6; i++) {
        const x = -R * 0.78 + i * R * 0.31;
        if (i % 3 === 0) { seg(c, x, -b * 0.95, x, b * 0.9, m * 0.06, MAD.cla); poli(c, [[x - m * 0.08, -b * 0.8], [x, -b * 1.05], [x + m * 0.08, -b * 0.8]], FER.luz, m * 0.02); }
        else if (i % 3 === 1) { seg(c, x, -b * 0.75, x, b * 0.75, m * 0.09, FER.luz); seg(c, x - m * 0.12, b * 0.45, x + m * 0.12, b * 0.45, m * 0.06, '#c9a24a'); }
        else { seg(c, x, -b * 0.85, x, b * 0.85, m * 0.06, MAD.esc); poli(c, [[x, -b * 0.75], [x + m * 0.25, -b * 0.9], [x + m * 0.25, -b * 0.4], [x, -b * 0.5]], FER.cla, m * 0.02); }
      }
    },
  });
  // o ringue: o tablado com as cordas e os quatro postes (3 × 3)
  reg('ringue', {
    n: 'Ringue', g: 'treino', size: 3,
    draw(c, R) {
      sombra(c, R, 0.98, 0.98);
      ret(c, -R * 0.95, -R * 0.95, R * 1.9, R * 1.9, R * 0.04, grad(c, 0, -R, 0, R, ['#c9b48a', '#a8946a']), R * 0.03);
      c.strokeStyle = 'rgba(80,60,30,0.25)'; c.lineWidth = R * 0.01; for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(-R * 0.95, -R * 0.95 + i * R * 0.237); c.lineTo(R * 0.95, -R * 0.95 + i * R * 0.237); c.stroke(); }
      for (const [k, cor] of [[0.82, '#b8322e'], [0.74, '#f4efe2']]) { c.strokeStyle = cor; c.lineWidth = R * 0.025; c.strokeRect(-R * k, -R * k, R * k * 2, R * k * 2); }
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bola(c, x * R * 0.82, y * R * 0.82, R * 0.07, MAD.esc, R * 0.02);
    },
  });
  // o pódio: os três degraus (o do meio mais alto), com os números
  reg('podio', {
    n: 'Pódio', g: 'treino', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R, b, m);
      const blocos = [[-R * 0.95, '#a8acb4', '2', 0.7], [-R * 0.32, '#d6a64a', '1', 1], [R * 0.32, '#b0703a', '3', 0.55]];
      for (const [x, cor, n, alt] of blocos) {
        ret(c, x, -b * 0.85, R * 0.63, b * 1.7, m * 0.05, grad(c, x, 0, x + R * 0.63, 0, [PED.luz, PED.cla]), m * 0.04);
        bola(c, x + R * 0.315, 0, m * 0.25 * alt + m * 0.08, cor, m * 0.03);
        c.fillStyle = '#2a2016'; c.font = `bold ${m * 0.32}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n, x + R * 0.315, m * 0.02);
      }
    },
  });
  // a arquibancada: os três degraus de madeira (3 × 1), vistos de cima, com o público ralo
  reg('arquibancada', {
    n: 'Arquibancada', g: 'treino', size: 3, fw: 3, fh: 1, costas: 'n', legado: { w: 1, h: 0.34 },
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R, b, m);
      for (let i = 0; i < 3; i++) { const y = -b + i * b * 0.66; ret(c, -R + m * 0.04, y, R * 2 - m * 0.08, b * 0.66, m * 0.03, i % 2 ? MAD.med : MAD.cla, m * 0.035); }
      for (let i = 0; i < 4; i++) { const x = -R * 0.8 + hsh(s, i, 1) * R * 1.6, y = -b * 0.7 + Math.floor(hsh(s, i, 2) * 3) * b * 0.66; bola(c, x, y, m * 0.13, ['#8a4a3a', '#3a5a8a', '#5a7a3a', '#7a5a2a'][i], m * 0.02); bola(c, x, y, m * 0.07, '#e0b896'); }
    },
  });
  // os pesos: a barra com as duas pedras redondas e os halteres no chão
  reg('pesos', {
    n: 'Pesos', g: 'treino', size: 1,
    draw(c, R) {
      sombra(c, R, 0.8, 0.5);
      seg(c, -R * 0.75, -R * 0.2, R * 0.75, -R * 0.2, R * 0.07, FER.cla);
      for (const k of [-1, 1]) bola(c, k * R * 0.65, -R * 0.2, R * 0.26, radial(c, k * R * 0.6, -R * 0.3, R * 0.3, [PED.luz, PED.med, PED.esc]), R * 0.04);
      for (const x of [-R * 0.3, R * 0.3]) { seg(c, x - R * 0.15, R * 0.45, x + R * 0.15, R * 0.45, R * 0.05, FER.med); for (const k of [-1, 1]) bola(c, x + k * R * 0.17, R * 0.45, R * 0.09, FER.esc, R * 0.02); }
    },
  });
  // o poste com escudos: o poste de madeira e os escudos pintados pendurados nele
  reg('posteEscudos', {
    n: 'Poste com escudos', g: 'treino', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.6, 0.6);
      const cores = [['#b8322e', '#f2d04a'], ['#2f5a9a', '#f4efe2'], ['#3e7a3a', '#d6a64a']];
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.3, x = Math.cos(a) * R * 0.48, y = Math.sin(a) * R * 0.48, [c1, c2] = cores[(s + i) % 3]; bola(c, x, y, R * 0.3, c1, R * 0.04); c.save(); c.beginPath(); c.arc(x, y, R * 0.3, 0, TAU); c.clip(); c.fillStyle = c2; c.fillRect(x - R * 0.04, y - R * 0.3, R * 0.08, R * 0.6); c.restore(); bola(c, x, y, R * 0.07, FER.cla, R * 0.02); }
      bola(c, 0, 0, R * 0.17, radial(c, -R * 0.05, -R * 0.05, R * 0.2, [MAD.luz, MAD.med]), R * 0.04);
    },
  });
  // o tapete de luta: a lona acolchoada, o círculo no meio e as marcas dos pés
  reg('tapeteLuta', {
    n: 'Tapete de luta', g: 'treino', size: 2,
    draw(c, R) {
      ret(c, -R * 0.94, -R * 0.94, R * 1.88, R * 1.88, R * 0.1, grad(c, -R, -R, R, R, ['#5a7a9a', '#3e5a7a']), R * 0.035);
      c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = R * 0.015; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-R * 0.94 + i * R * 0.47, -R * 0.94); c.lineTo(-R * 0.94 + i * R * 0.47, R * 0.94); c.stroke(); }
      c.strokeStyle = '#f2d04a'; c.lineWidth = R * 0.05; c.beginPath(); c.arc(0, 0, R * 0.6, 0, TAU); c.stroke();
      for (const k of [-1, 1]) seg(c, k * R * 0.2, -R * 0.1, k * R * 0.2, R * 0.1, R * 0.06, '#f4efe2');
    },
  });
})();
