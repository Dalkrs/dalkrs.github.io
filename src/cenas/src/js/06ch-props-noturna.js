/* ---------------------------------------------------------------
   6ch. CASA NOTURNA (lote 180) — a casa de má fama (o bordel, a boate), para a cena de investigação e resgate. Serve
   para a casa fina (o veludo, o dourado) e para a pobre (o colchão no chão, as garrafas largadas). 20 objetos:
     · o salão e o bar: o divã de veludo, a poltrona de veludo, a mesinha com taças, o balcão de bebidas, o piano, o
       palco das dançarinas, o narguilé, o biombo de seda e a cortina de veludo;
     · os quartos: a cama com dossel, o colchão no chão, a bacia com o jarro e a cortina de contas;
     · a investigação: o livro-caixa da madame, o quadro de chaves dos quartos e as cartas dos clientes (o cofre, o
       alçapão e a estante que gira já existem);
     · a fachada e a rua: a lanterna vermelha, a placa da casa e a carruagem; e as garrafas largadas no chão.
   --------------------------------------------------------------- */
(() => {
  const { caixa, linha, grad, radial, hsh, MAD, PED, FER, chama, sombra } = Props.kit;
  const { bola, oval, ret, seg, poli, somb, brilho, mm } = Props.kitT;
  const reg = (id, def) => Props.registrar(id, def);
  const VEL = ['#8a1e2e', '#5a0e1a'], VEL2 = ['#3a1e5a', '#200e38'], OURO = '#d6a64a', OURO2 = '#8a6420';
  // a cor do veludo: vermelho ou roxo, pela semente
  const veludo = s => (s % 3 === 2 ? VEL2 : VEL);
  Props.grupo('noturna', 'Casa noturna');

  /* ---- o salão e o bar ---- */
  reg('diva', {
    n: 'Divã de veludo', g: 'noturna', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, tags: 'sofa sofá assento bordel salao salão',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B), [v1, v2] = veludo(s); somb(c, R, b, m);
      c.beginPath(); c.moveTo(-R * 0.95, b * 0.8); c.lineTo(-R * 0.95, -b * 0.3); c.quadraticCurveTo(-R * 0.95, -b * 0.95, -R * 0.55, -b * 0.85); c.lineTo(R * 0.95, -b * 0.5); c.lineTo(R * 0.95, b * 0.8); c.closePath();
      c.fillStyle = grad(c, 0, -b, 0, b, [v1, v2]); c.fill(); linha(c, m * 0.05);
      ret(c, -R * 0.75, -b * 0.35, R * 1.6, b * 1.05, m * 0.12, grad(c, 0, -b * 0.35, 0, b * 0.7, ['#b8384a', v1]), m * 0.03);
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = m * 0.02; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-R * 0.75 + i * R * 0.4, -b * 0.3); c.lineTo(-R * 0.75 + i * R * 0.4, b * 0.65); c.stroke(); }
      for (const [x, y] of [[-R * 0.5, -b * 0.55], [R * 0.6, -b * 0.4]]) bola(c, x, y, m * 0.06, OURO);
      ret(c, -R * 0.65, -b * 0.25, R * 0.3, b * 0.45, m * 0.1, OURO, m * 0.02);
    },
  });
  reg('poltronaVeludo', {
    n: 'Poltrona de veludo', g: 'noturna', size: 1, costas: 'n', tags: 'cadeira assento salao salão',
    draw(c, R, t, s) {
      const [v1, v2] = veludo(s); sombra(c, R, 0.7, 0.7);
      ret(c, -R * 0.7, -R * 0.75, R * 1.4, R * 1.45, R * 0.25, grad(c, 0, -R, 0, R, [v1, v2]), R * 0.05);
      ret(c, -R * 0.45, -R * 0.35, R * 0.9, R * 0.95, R * 0.15, grad(c, 0, -R * 0.35, 0, R * 0.6, ['#b8384a', v1]), R * 0.03);
      for (let i = 0; i < 3; i++) bola(c, -R * 0.3 + i * R * 0.3, -R * 0.55, R * 0.04, OURO);
      for (const k of [-1, 1]) bola(c, k * R * 0.6, R * 0.6, R * 0.07, OURO2);
    },
  });
  reg('mesinhaTacas', {
    n: 'Mesinha com taças', g: 'noturna', size: 1, tags: 'mesa bebida vinho taca taça',
    draw(c, R, t, s) {
      sombra(c, R, 0.5, 0.5);
      bola(c, 0, 0, R * 0.48, radial(c, -R * 0.15, -R * 0.15, R * 0.5, ['#5a3a2a', '#3a2418', '#24160e']), R * 0.04);
      c.strokeStyle = OURO; c.lineWidth = R * 0.03; c.beginPath(); c.arc(0, 0, R * 0.44, 0, TAU); c.stroke();
      for (const [x, y, cor] of [[-R * 0.18, -R * 0.12, '#8a1a2a'], [R * 0.2, -R * 0.05, '#c8a040'], [-R * 0.02, R * 0.22, '#8a1a2a']]) { bola(c, x, y, R * 0.1, 'rgba(230,240,250,0.6)', R * 0.015); bola(c, x, y, R * 0.06, cor); }
      ret(c, R * 0.1, R * 0.12, R * 0.12, R * 0.3, R * 0.05, '#2a4a2a', R * 0.015);
    },
  });
  reg('balcaoBebidas', {
    n: 'Balcão de bebidas', g: 'noturna', size: 3, fw: 3, fh: 1, costas: 'n', legado: { w: 1, h: 0.34 }, tags: 'bar balcao balcão garrafa bebida',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R, b, m);
      ret(c, -R + m * 0.04, -b, R * 2 - m * 0.08, b * 0.7, m * 0.04, MAD.esc, m * 0.04);
      const cores = ['#2a5a2a', '#6a2a1a', '#8a6a1a', '#2a3a6a', '#5a1a3a', '#c8b07a'];
      for (let i = 0; i < 11; i++) { const x = -R * 0.88 + i * R * 0.176; bola(c, x, -b * 0.62, b * 0.2, cores[(i + s) % 6], m * 0.025); bola(c, x - b * 0.05, -b * 0.68, b * 0.06, 'rgba(255,255,255,0.55)'); }
      ret(c, -R + m * 0.02, -b * 0.25, R * 2 - m * 0.04, b * 1.15, m * 0.08, grad(c, 0, -b * 0.25, 0, b, ['#7a4a2a', '#4a2a16']), m * 0.04);
      seg(c, -R * 0.98, -b * 0.22, R * 0.98, -b * 0.22, m * 0.05, OURO);
      for (let i = 0; i < 5; i++) { const x = -R * 0.7 + i * R * 0.35; bola(c, x, b * 0.35, b * 0.16, 'rgba(230,240,250,0.6)', m * 0.02); bola(c, x, b * 0.35, b * 0.09, i % 2 ? '#8a1a2a' : '#c8a040'); }
    },
  });
  reg('piano', {
    n: 'Piano', g: 'noturna', size: 2, costas: 'n', tags: 'musica música instrumento salao salão',
    draw(c, R) {
      sombra(c, R, 0.9, 0.85);
      ret(c, -R * 0.9, -R * 0.85, R * 1.8, R * 1.2, R * 0.08, grad(c, -R, -R, R, 0, ['#2a2026', '#120c10']), R * 0.04);
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(-R * 0.75, -R * 0.7); c.lineTo(R * 0.6, -R * 0.7); c.stroke();
      ret(c, -R * 0.82, R * 0.1, R * 1.64, R * 0.22, R * 0.02, '#f4f0e6', R * 0.02);
      for (let i = 0; i < 20; i++) { const x = -R * 0.82 + i * R * 0.082; seg(c, x, R * 0.1, x, R * 0.32, R * 0.006, 'rgba(0,0,0,0.4)'); if (i % 7 !== 2 && i % 7 !== 6) ret(c, x + R * 0.05, R * 0.1, R * 0.045, R * 0.13, 0, '#111'); }
      ret(c, -R * 0.4, R * 0.5, R * 0.8, R * 0.3, R * 0.06, VEL[0], R * 0.03);
      bola(c, R * 0.65, -R * 0.55, R * 0.1, '#efe6d0', R * 0.015);
    },
  });
  reg('palcoDanca', {
    n: 'Palco das dançarinas', g: 'noturna', size: 2, fogo: true, tags: 'palco danca dança show espetaculo espetáculo',
    draw(c, R, t, s, ang) {
      sombra(c, R, 0.95, 0.95);
      bola(c, 0, 0, R * 0.92, radial(c, -R * 0.2, -R * 0.2, R, ['#7a4a2a', '#5a3018', '#3a1e0e']), R * 0.04);
      c.strokeStyle = OURO; c.lineWidth = R * 0.04; c.beginPath(); c.arc(0, 0, R * 0.86, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = R * 0.015; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.85); c.stroke(); }
      const [v1, v2] = veludo(s);
      c.save(); c.beginPath(); c.arc(0, 0, R * 0.98, Math.PI * 1.05, Math.PI * 1.95); c.arc(0, 0, R * 0.78, Math.PI * 1.95, Math.PI * 1.05, true); c.closePath(); c.fillStyle = grad(c, 0, -R, 0, -R * 0.6, [v1, v2]); c.fill(); linha(c, R * 0.02); c.restore();
      for (let i = 0; i < 7; i++) { const a = Math.PI * (0.15 + i * 0.12), x = Math.cos(a) * R * 0.9, y = Math.sin(a) * R * 0.9; bola(c, x, y, R * 0.04, '#efe6d0'); chama(c, x, y, R * 0.08, t, s + i, ang); }
    },
  });
  reg('narguile', {
    n: 'Narguilé', g: 'noturna', size: 1, vivo: true, tags: 'fumo fumaca fumaça cachimbo',
    draw(c, R, t, s) {
      sombra(c, R, 0.45, 0.45);
      c.strokeStyle = '#3a6a5a'; c.lineWidth = R * 0.04; for (const a of [0.6, 2.4]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.2, Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.7); c.stroke(); bola(c, Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.7, R * 0.05, OURO); }
      bola(c, 0, 0, R * 0.32, radial(c, -R * 0.1, -R * 0.1, R * 0.35, ['#9fe0d0', '#3a8a7a', '#1a4a40']), R * 0.03);
      bola(c, 0, 0, R * 0.14, OURO, R * 0.02); bola(c, 0, 0, R * 0.07, '#c84a2a');
      for (let i = 0; i < 3; i++) { const f = (t * 0.3 + i / 3) % 1; c.globalAlpha = (1 - f) * 0.35; bola(c, Math.sin(f * 5 + i) * R * 0.2, -f * R * 0.8, R * (0.08 + f * 0.2), '#e8e8f0'); } c.globalAlpha = 1;
    },
  });
  reg('biomboSeda', {
    n: 'Biombo de seda', g: 'noturna', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, tags: 'biombo divisoria divisória esconder trocar',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B), cores = [['#c84a5a', '#f2d0a0'], ['#3a2a5a', '#d6a64a']][s % 2];
      for (let i = 0; i < 4; i++) { const x0 = -R + i * R * 0.5, y0 = (i % 2 ? 1 : -1) * b * 0.4, x1 = x0 + R * 0.5, y1 = -y0;
        poli(c, [[x0, y0 * 0.6 - b * 0.4], [x1, y1 * 0.6 - b * 0.4], [x1, y1 * 0.6 + b * 0.4], [x0, y0 * 0.6 + b * 0.4]], grad(c, x0, 0, x1, 0, [cores[0], i % 2 ? '#e8788a' : cores[0]]), m * 0.04);
        c.strokeStyle = cores[1]; c.lineWidth = m * 0.05; c.beginPath(); c.moveTo((x0 + x1) / 2 - R * 0.1, 0); c.quadraticCurveTo((x0 + x1) / 2, -b * 0.25, (x0 + x1) / 2 + R * 0.1, 0); c.stroke(); bola(c, (x0 + x1) / 2, b * 0.12, b * 0.08, cores[1]); }
      for (let i = 0; i <= 4; i++) seg(c, -R + i * R * 0.5, (i % 2 ? 1 : -1) * b * 0.24 - b * 0.45, -R + i * R * 0.5, (i % 2 ? 1 : -1) * b * 0.24 + b * 0.45, m * 0.08, MAD.esc);
    },
  });
  reg('cortinaVeludo', {
    n: 'Cortina de veludo', g: 'noturna', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 }, tags: 'cortina porta passagem esconder',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B), [v1, v2] = veludo(s);
      seg(c, -R, -b * 0.85, R, -b * 0.85, m * 0.08, OURO2);
      for (const k of [-1, 1]) { for (let i = 0; i < 5; i++) { const x = k * (R * 0.92 - i * R * 0.11); oval(c, x, -b * 0.25, R * 0.07, b * 0.62, 0, i % 2 ? v1 : v2); } seg(c, k * R * 0.55, -b * 0.1, k * R * 0.9, -b * 0.2, m * 0.06, OURO); }
      ret(c, -R * 0.45, -b * 0.8, R * 0.9, b * 0.2, m * 0.04, 'rgba(0,0,0,0.4)');
    },
  });

  /* ---- os quartos ---- */
  reg('camaDossel', {
    n: 'Cama com dossel', g: 'noturna', size: 2, costas: 'n', tags: 'cama quarto alcova cortinas',
    draw(c, R, t, s) {
      const [v1, v2] = veludo(s);
      sombra(c, R, 0.95, 0.95);
      ret(c, -R * 0.85, -R * 0.9, R * 1.7, R * 1.8, R * 0.06, MAD.esc, R * 0.04);
      ret(c, -R * 0.75, -R * 0.8, R * 1.5, R * 1.6, R * 0.08, '#efe2d0', R * 0.02);
      for (const k of [-1, 1]) ret(c, k * R * 0.35 - R * 0.3, -R * 0.72, R * 0.6, R * 0.32, R * 0.12, '#f8f0e4', R * 0.02);
      ret(c, -R * 0.75, -R * 0.15, R * 1.5, R * 0.95, R * 0.08, grad(c, 0, -R * 0.15, 0, R * 0.8, [v1, v2]), R * 0.025);
      c.save(); c.globalAlpha = 0.55; for (const k of [-1, 1]) { oval(c, k * R * 0.88, 0, R * 0.12, R * 0.9, 0, v1); } c.restore();
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bola(c, x * R * 0.88, y * R * 0.92, R * 0.08, OURO, R * 0.02);
    },
  });
  reg('colchaoChao', {
    n: 'Colchão no chão', g: 'noturna', size: 2, fw: 1, fh: 2, legado: { w: 0.5, h: 1 }, tags: 'cama quarto pobre palha',
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B);
      ret(c, -R * 0.85, -B * 0.9, R * 1.7, B * 1.8, m * 0.15, '#b8a888', m * 0.04);
      c.strokeStyle = 'rgba(90,70,40,0.4)'; c.lineWidth = m * 0.03; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(-R * 0.8, -B * 0.9 + i * B * 0.3); c.lineTo(R * 0.8, -B * 0.9 + i * B * 0.3); c.stroke(); }
      for (let i = 0; i < 3; i++) oval(c, (hsh(s, i, 1) - 0.5) * R, (hsh(s, i, 2) - 0.5) * B * 1.4, m * 0.2, m * 0.12, i, 'rgba(110,80,50,0.35)');
      poli(c, [[-R * 0.85, B * 0.1], [R * 0.85, -B * 0.05], [R * 0.7, B * 0.85], [-R * 0.8, B * 0.8]], '#6a3a3a', m * 0.03);
      ret(c, -R * 0.6, -B * 0.8, R * 1.2, B * 0.35, m * 0.1, '#d8ccb0', m * 0.02);
    },
  });
  reg('baciaJarro', {
    n: 'Bacia e jarro', g: 'noturna', size: 1, tags: 'agua água lavar quarto',
    draw(c, R) {
      sombra(c, R, 0.62, 0.55);
      ret(c, -R * 0.7, -R * 0.55, R * 1.4, R * 1.1, R * 0.06, MAD.cla, R * 0.04);
      bola(c, -R * 0.15, 0, R * 0.4, '#e8e4dc', R * 0.03); bola(c, -R * 0.15, 0, R * 0.3, radial(c, -R * 0.2, -R * 0.05, R * 0.3, ['#d8e8f0', '#9ab8c8']));
      bola(c, R * 0.42, -R * 0.2, R * 0.17, '#e8e4dc', R * 0.03); seg(c, R * 0.55, -R * 0.3, R * 0.65, -R * 0.38, R * 0.05, '#e8e4dc');
      ret(c, R * 0.2, R * 0.15, R * 0.4, R * 0.3, R * 0.04, '#f4ecf0', R * 0.015);
    },
  });
  reg('cortinaContas', {
    n: 'Cortina de contas', g: 'noturna', size: 1, costas: 'n', vivo: true, tags: 'cortina porta passagem miçangas',
    draw(c, R, t, s) {
      seg(c, -R * 0.95, -R * 0.85, R * 0.95, -R * 0.85, R * 0.08, MAD.esc);
      const cores = ['#c84a5a', '#d6a64a', '#a85ad8', '#e8e4dc'];
      for (let i = 0; i < 11; i++) { const x = -R * 0.85 + i * R * 0.17, bal = Math.sin(t * 1.5 + i * 0.6) * R * 0.04; for (let j = 0; j < 4; j++) bola(c, x + bal * j / 3, -R * 0.72 + j * R * 0.13, R * 0.045, cores[(i + j + s) % 4], R * 0.01); }
    },
  });

  /* ---- a investigação ---- */
  reg('livroCaixa', {
    n: 'Livro-caixa da madame', g: 'noturna', size: 1, tags: 'pista livro contas nomes registro investigar',
    draw(c, R, t, s) {
      sombra(c, R, 0.7, 0.55);
      c.save(); c.rotate(0.1);
      ret(c, -R * 0.72, -R * 0.5, R * 1.44, R * 1.0, R * 0.04, '#5a1a1a', R * 0.035);
      ret(c, -R * 0.66, -R * 0.45, R * 0.64, R * 0.9, R * 0.02, '#f0e6cc'); ret(c, R * 0.02, -R * 0.45, R * 0.64, R * 0.9, R * 0.02, '#f0e6cc');
      seg(c, 0, -R * 0.45, 0, R * 0.45, R * 0.02, 'rgba(0,0,0,0.3)');
      for (const x0 of [-R * 0.6, R * 0.08]) for (let i = 0; i < 7; i++) { const y = -R * 0.35 + i * R * 0.11; seg(c, x0, y, x0 + R * 0.32, y, R * 0.015, 'rgba(40,30,30,0.6)'); seg(c, x0 + R * 0.4, y, x0 + R * 0.52, y, R * 0.015, i === 4 ? '#a22' : 'rgba(40,30,30,0.6)'); }
      c.restore();
      seg(c, R * 0.3, R * 0.5, R * 0.75, R * 0.2, R * 0.03, '#f4f0e6');
    },
  });
  reg('quadroChaves', {
    n: 'Quadro de chaves dos quartos', g: 'noturna', size: 1, costas: 'n', tags: 'chave chaves quarto trancado pista',
    draw(c, R, t, s) {
      ret(c, -R * 0.85, -R * 0.95, R * 1.7, R * 0.75, R * 0.05, MAD.med, R * 0.04);
      for (let i = 0; i < 8; i++) { const x = -R * 0.68 + (i % 4) * R * 0.45, y = -R * 0.85 + Math.floor(i / 4) * R * 0.33; bola(c, x, y, R * 0.03, FER.cla);
        if (hsh(s, i, 1) > 0.25) { c.strokeStyle = OURO; c.lineWidth = R * 0.03; c.beginPath(); c.arc(x, y + R * 0.07, R * 0.05, 0, TAU); c.moveTo(x, y + R * 0.12); c.lineTo(x, y + R * 0.26); c.stroke(); }
        c.fillStyle = '#efe6d0'; c.font = `bold ${R * 0.1}px sans-serif`; c.textAlign = 'center'; c.fillText(String(i + 1), x + R * 0.14, y + R * 0.05); }
    },
  });
  reg('cartasClientes', {
    n: 'Cartas dos clientes', g: 'noturna', size: 1, tags: 'pista cartas segredo chantagem investigar',
    draw(c, R, t, s) {
      sombra(c, R, 0.62, 0.5);
      for (let i = 0; i < 5; i++) { c.save(); c.translate((hsh(s, i, 1) - 0.5) * R * 0.6, (hsh(s, i, 2) - 0.5) * R * 0.5); c.rotate((hsh(s, i, 3) - 0.5) * 1.2);
        ret(c, -R * 0.3, -R * 0.2, R * 0.6, R * 0.4, R * 0.02, ['#f2e8cf', '#f0dcdc', '#e8e0f0'][i % 3], R * 0.02);
        bola(c, 0, 0, R * 0.06, ['#a01818', '#3a2a6a', '#1a5a3a'][i % 3]); c.restore(); }
      seg(c, -R * 0.5, R * 0.45, R * 0.5, R * 0.45, R * 0.05, '#b8322e');
    },
  });

  /* ---- a fachada e a rua ---- */
  reg('lanternaVermelha', {
    n: 'Lanterna vermelha', g: 'noturna', size: 1, luz: { bright: 2, dim: 4, c: '#ff4a4a' }, fogo: true, tags: 'luz porta fachada sinal rua',
    draw(c, R, t, s, ang) {
      sombra(c, R, 0.4, 0.4, 0.25, 0.3);
      brilho(c, 0, 0, R * 0.95, '#ff4a4a', 0.45);
      ret(c, -R * 0.06, -R * 0.75, R * 0.12, R * 0.4, R * 0.03, FER.esc);
      bola(c, 0, 0, R * 0.36, radial(c, -R * 0.1, -R * 0.1, R * 0.4, ['#ffb0a0', '#e02a2a', '#7a0a0a']), R * 0.035);
      for (const k of [-1, 1]) seg(c, k * R * 0.2, -R * 0.3, k * R * 0.2, R * 0.3, R * 0.02, 'rgba(60,0,0,0.5)');
      chama(c, 0, R * 0.05, R * 0.14, t, s, ang);
      ret(c, -R * 0.18, R * 0.32, R * 0.36, R * 0.08, R * 0.02, OURO2);
    },
  });
  reg('placaCasa', {
    n: 'Placa da casa', g: 'noturna', size: 1, costas: 'n', tags: 'placa fachada nome rua',
    draw(c, R, t, s) {
      seg(c, -R * 0.75, -R * 0.85, R * 0.75, -R * 0.85, R * 0.06, FER.esc);
      for (const k of [-1, 1]) seg(c, k * R * 0.5, -R * 0.85, k * R * 0.5, -R * 0.55, R * 0.025, FER.cla);
      ret(c, -R * 0.75, -R * 0.6, R * 1.5, R * 0.62, R * 0.12, s % 2 ? '#3a1e3a' : '#5a1a1e', R * 0.04);
      c.strokeStyle = OURO; c.lineWidth = R * 0.025; caixa(c, -R * 0.65, -R * 0.52, R * 1.3, R * 0.46, R * 0.08); c.stroke();
      c.beginPath(); c.moveTo(-R * 0.15, -R * 0.29); c.bezierCurveTo(-R * 0.15, -R * 0.45, R * 0.0, -R * 0.42, 0, -R * 0.33); c.bezierCurveTo(0, -R * 0.42, R * 0.15, -R * 0.45, R * 0.15, -R * 0.29); c.lineTo(0, -R * 0.13); c.closePath(); c.fillStyle = OURO; c.fill();
    },
  });
  reg('carruagem', {
    n: 'Carruagem', g: 'noturna', size: 3, fw: 3, fh: 2, legado: { w: 1, h: 0.67 }, tags: 'carruagem cliente rua veiculo veículo cavalo',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R * 0.95, b * 0.85, m);
      for (const x of [-R * 0.45, R * 0.15]) for (const k of [-1, 1]) { ret(c, x - R * 0.1, k * b * 0.78 - m * 0.08, R * 0.2, m * 0.16, m * 0.05, '#2a1a10', m * 0.02); }
      ret(c, -R * 0.65, -b * 0.7, R * 1.0, b * 1.4, m * 0.15, grad(c, 0, -b, 0, b, ['#2a2a3a', '#14141e']), m * 0.04);
      ret(c, -R * 0.55, -b * 0.55, R * 0.8, b * 1.1, m * 0.1, '#3a3a50', m * 0.02);
      c.strokeStyle = OURO; c.lineWidth = m * 0.03; caixa(c, -R * 0.55, -b * 0.55, R * 0.8, b * 1.1, m * 0.1); c.stroke();
      for (const k of [-1, 1]) bola(c, R * 0.3, k * b * 0.55, m * 0.06, '#ffd88a');
      for (const k of [-1, 1]) seg(c, R * 0.35, k * b * 0.3, R * 0.98, k * b * 0.3, m * 0.05, MAD.med);
      ret(c, R * 0.42, -b * 0.25, R * 0.25, b * 0.5, m * 0.05, '#4a3a2a', m * 0.02);
    },
  });
  reg('garrafasChao', {
    n: 'Garrafas largadas', g: 'noturna', size: 1, tags: 'bebida garrafa sujeira bagunca bagunça pobre',
    draw(c, R, t, s) {
      oval(c, R * 0.1, R * 0.2, R * 0.35, R * 0.15, 0.3, 'rgba(120,30,40,0.45)');
      for (let i = 0; i < 5; i++) { const cor = ['#2a5a2a', '#5a2a1a', '#3a3a5a', '#7a6a2a', '#2a5a2a'][i]; c.save(); c.translate((hsh(s, i, 1) - 0.5) * R * 1.0, (hsh(s, i, 2) - 0.5) * R * 1.0); c.rotate(hsh(s, i, 3) * TAU);
        ret(c, -R * 0.32, -R * 0.12, R * 0.48, R * 0.24, R * 0.1, grad(c, 0, -R * 0.12, 0, R * 0.12, ['rgba(255,255,255,0.35)', cor]), R * 0.025); ret(c, -R * 0.32, -R * 0.12, R * 0.48, R * 0.24, R * 0.1, cor); ret(c, R * 0.14, -R * 0.05, R * 0.2, R * 0.1, R * 0.03, cor, R * 0.02); bola(c, -R * 0.15, -R * 0.05, R * 0.04, 'rgba(255,255,255,0.4)'); c.restore(); }
      bola(c, -R * 0.4, R * 0.35, R * 0.1, 'rgba(230,240,250,0.5)', R * 0.015);
    },
  });
})();
