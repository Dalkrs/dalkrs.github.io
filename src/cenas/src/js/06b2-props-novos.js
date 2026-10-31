/* ---------------------------------------------------------------
   6b2. OBJETOS NOVOS (lote 48) — o mercado e a cidade, o templo e a cripta, a forja e a oficina, o oriental e os
   portões. Mesmo jeito dos de 6b: visto de cima, num quadrado de lado 2R centrado no token, com as peças de Props.kit.
   Os portões (o portão de ferro, a grade levadiça e a cortina) têm estado (fechado, aberto) e, fechados, barram como
   uma porta, uma janela ou uma cortina da cena: Props.paredes dá o trecho, e 03b-walls o junta às paredes.
   --------------------------------------------------------------- */
(() => {
  const { caixa, sombra, linha, grad, radial, hsh, MAD, PED, FER, chama, brasa, pedrinha, tabua, folhas, osso, cranio, tom } = Props.kit;
  const est = Props.kit.est;
  const R_ = (P, id, def) => Props.registrar(id, def);
  const reg = (id, def) => R_(null, id, def);
  const PANO = ['#b8433a', '#e8d9b0', '#3e6fa8', '#5f8f4a', '#d39a2e'];
  const listras = (c, x, y, w, h, cores, n) => { const lw = w / n; for (let i = 0; i < n; i++) { c.fillStyle = cores[i % cores.length]; c.fillRect(x + i * lw, y, lw + 0.5, h); } };

  Props.grupo('mercado', 'Mercado e cidade');
  Props.grupo('templo', 'Templo e cripta');
  Props.grupo('forja', 'Forja e oficina');
  Props.grupo('oriental', 'Oriental');
  Props.grupo('portao', 'Portões e cortinas');

  /* ---------- Mercado e cidade ---------- */
  reg('barracaFeira', {
    n: 'Barraca de feira', g: 'mercado', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.92, 0.78, 0.08, 0.1);
      // o balcão com a mercadoria, embaixo do toldo
      caixa(c, -R * 0.85, R * 0.1, R * 1.7, R * 0.6, R * 0.05); c.fillStyle = grad(c, 0, R * 0.1, 0, R * 0.7, [MAD.cla, MAD.esc]); c.fill(); linha(c, R * 0.04);
      for (let i = 0; i < 7; i++) { const x = -R * 0.7 + i * R * 0.23; c.fillStyle = ['#d8452e', '#e6b23a', '#6aa84f', '#8a4fb0'][(i + s) % 4]; c.beginPath(); c.arc(x, R * 0.38, R * 0.09, 0, Math.PI * 2); c.fill(); }
      // o toldo listrado
      c.save(); caixa(c, -R * 0.95, -R * 0.9, R * 1.9, R * 0.95, R * 0.06); c.clip();
      listras(c, -R * 0.95, -R * 0.9, R * 1.9, R * 0.95, [PANO[s % 5], '#f1e6c8'], 8);
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(-R * 0.95, -R * 0.1, R * 1.9, R * 0.15);
      c.restore();
      caixa(c, -R * 0.95, -R * 0.9, R * 1.9, R * 0.95, R * 0.06); linha(c, R * 0.04);
      for (const x of [-0.92, 0.92]) { c.fillStyle = MAD.esc; c.beginPath(); c.arc(x * R, R * 0.05, R * 0.06, 0, Math.PI * 2); c.fill(); }
    },
  });
  reg('frutas', {
    n: 'Caixote de frutas', g: 'mercado', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.72, 0.6, 0.08, 0.1);
      const w = R * 1.4, h = R * 1.0;
      caixa(c, -w / 2, -h / 2, w, h, R * 0.05); c.fillStyle = grad(c, 0, -h / 2, 0, h / 2, ['#c79b62', '#8a5f32']); c.fill(); linha(c, R * 0.05);
      const cor = ['#d8452e', '#f0a32e', '#7cb342', '#9c3d8e'][s % 4];
      for (let i = 0; i < 12; i++) { const x = -w / 2 + R * 0.18 + (i % 4) * (w - R * 0.36) / 3, y = -h / 2 + R * 0.2 + Math.floor(i / 4) * (h - R * 0.4) / 2;
        c.fillStyle = radial(c, x - R * 0.04, y - R * 0.05, R * 0.18, [tom(cor, 0.35), cor, tom(cor, -0.35)]); c.beginPath(); c.arc(x, y, R * 0.15, 0, Math.PI * 2); c.fill(); }
    },
  });
  reg('placaLoja', {
    n: 'Placa de loja', g: 'mercado', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.6, 0.3, 0.06, -0.1);
      c.strokeStyle = FER.esc; c.lineWidth = R * 0.08; c.lineCap = 'round'; c.beginPath(); c.moveTo(-R * 0.8, -R * 0.75); c.lineTo(R * 0.8, -R * 0.75); c.stroke();
      for (const x of [-0.45, 0.45]) { c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(x * R, -R * 0.75); c.lineTo(x * R, -R * 0.42); c.stroke(); }
      caixa(c, -R * 0.62, -R * 0.45, R * 1.24, R * 0.9, R * 0.12); c.fillStyle = grad(c, 0, -R * 0.45, 0, R * 0.45, [MAD.luz, MAD.med]); c.fill(); linha(c, R * 0.05);
      // o símbolo da loja: uma caneca, um pão ou uma espada
      const k = s % 3; c.fillStyle = '#2a1a0c'; c.strokeStyle = '#2a1a0c'; c.lineWidth = R * 0.07;
      if (k === 0) { caixa(c, -R * 0.2, -R * 0.2, R * 0.32, R * 0.42, R * 0.04); c.fill(); c.beginPath(); c.arc(R * 0.14, 0, R * 0.12, -1.3, 1.3); c.stroke(); }
      else if (k === 1) { c.beginPath(); c.ellipse(0, 0, R * 0.36, R * 0.18, 0, 0, Math.PI * 2); c.fill(); }
      else { c.beginPath(); c.moveTo(-R * 0.3, R * 0.25); c.lineTo(R * 0.3, -R * 0.25); c.stroke(); c.beginPath(); c.moveTo(-R * 0.25, R * 0.05); c.lineTo(-R * 0.05, R * 0.25); c.stroke(); }
    },
  });
  reg('fonte', {
    n: 'Fonte da praça', g: 'mercado', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.95, 0.95, 0.04, 0.06);
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; pedrinha(c, Math.cos(a) * R * 0.82, Math.sin(a) * R * 0.82, R * 0.16, s + i); }
      c.fillStyle = radial(c, 0, 0, R * 0.8, ['#6fb0d8', '#3f86c2', '#2a5f8f']); c.beginPath(); c.arc(0, 0, R * 0.72, 0, Math.PI * 2); c.fill();
      // as ondinhas que se mexem
      c.strokeStyle = 'rgba(220,240,255,0.55)'; c.lineWidth = R * 0.025;
      for (let k = 0; k < 3; k++) { const r = R * (0.25 + ((t * 0.25 + k / 3) % 1) * 0.45); c.globalAlpha = 1 - (r / (R * 0.7)); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
      c.globalAlpha = 1;
      c.fillStyle = grad(c, -R * 0.2, 0, R * 0.2, 0, [PED.luz, PED.med]); c.beginPath(); c.arc(0, 0, R * 0.2, 0, Math.PI * 2); c.fill(); linha(c, R * 0.03);
      c.fillStyle = '#cfe9ff'; c.beginPath(); c.arc(0, 0, R * 0.07, 0, Math.PI * 2); c.fill();
    },
  });
  reg('carrinho', {
    n: 'Carrinho de mão', g: 'mercado', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.6, 0.75, 0.06, 0.08);
      for (const x of [-0.18, 0.18]) { c.strokeStyle = MAD.esc; c.lineWidth = R * 0.07; c.lineCap = 'round'; c.beginPath(); c.moveTo(x * R, R * 0.2); c.lineTo(x * R * 2.4, R * 0.9); c.stroke(); }
      c.beginPath(); c.moveTo(-R * 0.5, -R * 0.55); c.lineTo(R * 0.5, -R * 0.55); c.lineTo(R * 0.36, R * 0.35); c.lineTo(-R * 0.36, R * 0.35); c.closePath();
      c.fillStyle = grad(c, 0, -R * 0.55, 0, R * 0.35, [MAD.cla, MAD.esc]); c.fill(); linha(c, R * 0.05);
      for (let i = 0; i < 5; i++) pedrinha(c, (hsh(s, i, 1) - 0.5) * R * 0.6, -R * 0.2 + (hsh(s, i, 2) - 0.5) * R * 0.4, R * 0.12, s + i);
      c.fillStyle = FER.esc; caixa(c, -R * 0.1, -R * 0.85, R * 0.2, R * 0.32, R * 0.05); c.fill();
    },
  });
  reg('sacos', {
    n: 'Sacos de grãos', g: 'mercado', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.8, 0.7, 0.08, 0.1);
      for (const [x, y, r] of [[-0.35, -0.25, 0.42], [0.35, -0.2, 0.4], [0, 0.35, 0.44]]) {
        c.beginPath(); c.ellipse(x * R, y * R, r * R, r * R * 0.9, 0, 0, Math.PI * 2); c.fillStyle = radial(c, x * R - R * 0.1, y * R - R * 0.1, r * R * 1.3, ['#e2cc94', '#c4a668', '#8f7444']); c.fill(); linha(c, R * 0.035);
        c.strokeStyle = '#6a5230'; c.lineWidth = R * 0.04; c.beginPath(); c.moveTo(x * R - R * 0.08, y * R - r * R * 0.6); c.lineTo(x * R + R * 0.08, y * R - r * R * 0.6); c.stroke();
      }
    },
  });

  /* ---------- Templo e cripta ---------- */
  reg('sarcofago', {
    n: 'Sarcófago', g: 'templo', size: 2, estados: [['fechado', 'Fechado'], ['aberto', 'Aberto']],
    draw(c, R, t, s) {
      sombra(c, R, 0.55, 0.95, 0.06, 0.06);
      const w = R * 0.95, h = R * 1.8;
      caixa(c, -w / 2, -h / 2, w, h, R * 0.08); c.fillStyle = grad(c, -w / 2, 0, w / 2, 0, [PED.med, PED.luz, PED.med]); c.fill(); linha(c, R * 0.05);
      if (est() === 'aberto') {
        c.fillStyle = 'rgba(10,8,8,0.92)'; caixa(c, -w / 2 + R * 0.1, -h / 2 + R * 0.1, w - R * 0.2, h - R * 0.2, R * 0.05); c.fill();
        osso(c, -R * 0.1, -R * 0.4, R * 0.08, R * 0.3, R * 0.06); cranio(c, 0, -R * 0.62, R * 0.14);
        c.save(); c.translate(w * 0.62, R * 0.15); c.rotate(0.25); caixa(c, -w / 2, -h / 2, w, h, R * 0.08); c.fillStyle = grad(c, -w / 2, 0, w / 2, 0, [PED.cla, PED.luz]); c.fill(); linha(c, R * 0.04); c.restore();
      } else {
        // a figura entalhada na tampa
        c.fillStyle = 'rgba(60,60,70,0.35)'; c.beginPath(); c.arc(0, -h * 0.32, R * 0.16, 0, Math.PI * 2); c.fill();
        caixa(c, -R * 0.2, -h * 0.22, R * 0.4, h * 0.62, R * 0.12); c.fill();
        c.strokeStyle = 'rgba(40,40,46,0.55)'; c.lineWidth = R * 0.03; caixa(c, -w / 2 + R * 0.08, -h / 2 + R * 0.08, w - R * 0.16, h - R * 0.16, R * 0.05); c.stroke();
      }
    },
  });
  reg('bancoIgreja', {
    n: 'Banco de igreja', g: 'templo', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.95, 0.4, 0.05, 0.1);
      caixa(c, -R * 0.95, -R * 0.15, R * 1.9, R * 0.4, R * 0.05); c.fillStyle = grad(c, 0, -R * 0.15, 0, R * 0.25, [MAD.cla, MAD.esc]); c.fill(); linha(c, R * 0.04);
      caixa(c, -R * 0.95, -R * 0.38, R * 1.9, R * 0.18, R * 0.04); c.fillStyle = MAD.med; c.fill(); linha(c, R * 0.04);
      for (const x of [-0.95, 0.95]) { caixa(c, x * R - R * 0.06, -R * 0.42, R * 0.12, R * 0.72, R * 0.04); c.fillStyle = MAD.esc; c.fill(); }
    },
  });
  reg('vitral', {
    n: 'Luz do vitral', g: 'templo', size: 2,
    draw(c, R, t, s) {
      // a luz colorida que o vitral joga no chão
      c.save(); c.globalCompositeOperation = 'lighter';
      const cores = ['rgba(220,60,60,0.28)', 'rgba(60,120,230,0.28)', 'rgba(240,200,60,0.28)', 'rgba(80,190,110,0.28)'];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        c.fillStyle = cores[(i + j + s) % 4];
        c.beginPath(); const x = -R * 0.8 + i * R * 0.4, y = -R * 0.9 + j * R * 0.6;
        c.moveTo(x, y); c.lineTo(x + R * 0.38, y + R * 0.05); c.lineTo(x + R * 0.48, y + R * 0.62); c.lineTo(x + R * 0.08, y + R * 0.58); c.closePath(); c.fill();
      }
      c.restore();
      c.strokeStyle = 'rgba(20,16,10,0.35)'; c.lineWidth = R * 0.02; c.strokeRect(-R * 0.82, -R * 0.92, R * 1.7, R * 1.85);
    },
  });
  reg('pia', {
    n: 'Pia de água benta', g: 'templo', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.62, 0.62);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.fillStyle = PED.cla; c.beginPath(); c.arc(Math.cos(a) * R * 0.52, Math.sin(a) * R * 0.52, R * 0.16, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = grad(c, -R * 0.6, -R * 0.6, R * 0.6, R * 0.6, [PED.luz, PED.med]); c.beginPath(); c.arc(0, 0, R * 0.6, 0, Math.PI * 2); c.fill(); linha(c, R * 0.04);
      c.fillStyle = radial(c, 0, 0, R * 0.42, ['#cfe9ff', '#7fb6dc', '#4f86b0']); c.beginPath(); c.arc(0, 0, R * 0.42, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 1.6 + s); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(-R * 0.12, -R * 0.12, R * 0.07, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    },
  });
  reg('nichoOssos', {
    n: 'Nicho de ossos', g: 'templo', size: 1,
    draw(c, R, t, s) {
      caixa(c, -R * 0.95, -R * 0.95, R * 1.9, R * 0.6, R * 0.04); c.fillStyle = grad(c, 0, -R * 0.95, 0, -R * 0.35, [PED.esc, PED.med]); c.fill(); linha(c, R * 0.04);
      for (let i = 0; i < 3; i++) { const x = -R * 0.62 + i * R * 0.62; c.fillStyle = '#121014'; caixa(c, x - R * 0.26, -R * 0.88, R * 0.52, R * 0.46, R * 0.18); c.fill(); cranio(c, x, -R * 0.62, R * 0.15); }
      for (let i = 0; i < 6; i++) { const x = (hsh(s, i, 1) - 0.5) * R * 1.4, y = R * 0.1 + hsh(s, i, 2) * R * 0.6, a = hsh(s, i, 3) * Math.PI; osso(c, x - Math.cos(a) * R * 0.25, y - Math.sin(a) * R * 0.1, x + Math.cos(a) * R * 0.25, y + Math.sin(a) * R * 0.1, R * 0.07); }
    },
  });
  reg('incensario', {
    n: 'Incensário', g: 'templo', size: 1, fogo: true, luz: { bright: 1, dim: 3, c: '#ffcf8a' },
    draw(c, R, t, s) {
      sombra(c, R, 0.45, 0.45);
      c.fillStyle = grad(c, -R * 0.4, -R * 0.4, R * 0.4, R * 0.4, ['#e0b45a', '#9a7228']); c.beginPath(); c.arc(0, 0, R * 0.4, 0, Math.PI * 2); c.fill(); linha(c, R * 0.04);
      c.fillStyle = '#5a3e14'; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * R * 0.26, Math.sin(a) * R * 0.26, R * 0.04, 0, Math.PI * 2); c.fill(); }
      brasa(c, 0, 0, R * 0.12, t, s);
    },
  });

  /* ---------- Forja e oficina ---------- */
  reg('fole', {
    n: 'Fole', g: 'forja', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.55, 0.75);
      const ab = 0.85 + 0.15 * Math.sin(t * 1.4 + s);
      c.beginPath(); c.moveTo(0, -R * 0.85); c.lineTo(R * 0.5 * ab, R * 0.3); c.lineTo(-R * 0.5 * ab, R * 0.3); c.closePath(); c.fillStyle = grad(c, -R * 0.5, 0, R * 0.5, 0, ['#5a3420', '#8a5530', '#5a3420']); c.fill(); linha(c, R * 0.04);
      c.strokeStyle = 'rgba(30,16,8,0.6)'; c.lineWidth = R * 0.025; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-R * 0.5 * ab * i / 4, -R * 0.85 + R * 1.15 * i / 4); c.lineTo(R * 0.5 * ab * i / 4, -R * 0.85 + R * 1.15 * i / 4); c.stroke(); }
      caixa(c, -R * 0.08, R * 0.3, R * 0.16, R * 0.55, R * 0.04); c.fillStyle = MAD.esc; c.fill(); linha(c, R * 0.03);
      c.fillStyle = FER.med; caixa(c, -R * 0.06, -R * 0.98, R * 0.12, R * 0.2, R * 0.03); c.fill();
    },
  });
  reg('tina', {
    n: 'Tina de têmpera', g: 'forja', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.75, 0.75);
      c.fillStyle = grad(c, -R, 0, R, 0, [MAD.esc, MAD.cla, MAD.esc]); c.beginPath(); c.arc(0, 0, R * 0.75, 0, Math.PI * 2); c.fill(); linha(c, R * 0.05);
      for (const r of [0.75, 0.6]) { c.strokeStyle = FER.esc; c.lineWidth = R * 0.05; c.beginPath(); c.arc(0, 0, R * r, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = radial(c, 0, 0, R * 0.58, ['#4f7a96', '#2f526a', '#1f3a4c']); c.beginPath(); c.arc(0, 0, R * 0.56, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(200,225,240,0.35)'; c.lineWidth = R * 0.02; const r = R * (0.15 + ((t * 0.2) % 1) * 0.38); c.beginPath(); c.arc(R * 0.1, -R * 0.05, r, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = FER.cla; c.lineWidth = R * 0.07; c.lineCap = 'round'; c.beginPath(); c.moveTo(R * 0.2, R * 0.1); c.lineTo(R * 0.95, -R * 0.4); c.stroke();
    },
  });
  reg('bancada', {
    n: 'Bancada de ferramentas', g: 'forja', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.95, 0.5, 0.05, 0.08);
      caixa(c, -R * 0.95, -R * 0.45, R * 1.9, R * 0.9, R * 0.05); c.fillStyle = grad(c, 0, -R * 0.45, 0, R * 0.45, [MAD.luz, MAD.med]); c.fill(); linha(c, R * 0.04);
      c.strokeStyle = 'rgba(60,35,12,0.4)'; c.lineWidth = R * 0.02; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-R * 0.95, -R * 0.45 + i * R * 0.225); c.lineTo(R * 0.95, -R * 0.45 + i * R * 0.225); c.stroke(); }
      // o martelo, as tenazes e a lima
      c.strokeStyle = MAD.esc; c.lineWidth = R * 0.07; c.lineCap = 'round'; c.beginPath(); c.moveTo(-R * 0.7, R * 0.2); c.lineTo(-R * 0.3, -R * 0.15); c.stroke();
      c.fillStyle = FER.cla; caixa(c, -R * 0.42, -R * 0.3, R * 0.28, R * 0.16, R * 0.03); c.fill(); linha(c, R * 0.02);
      c.strokeStyle = FER.med; c.lineWidth = R * 0.04; c.beginPath(); c.moveTo(R * 0.1, R * 0.25); c.lineTo(R * 0.45, -R * 0.25); c.moveTo(R * 0.2, R * 0.28); c.lineTo(R * 0.5, -R * 0.2); c.stroke();
      c.strokeStyle = FER.luz; c.lineWidth = R * 0.05; c.beginPath(); c.moveTo(R * 0.65, R * 0.25); c.lineTo(R * 0.85, -R * 0.25); c.stroke();
    },
  });
  reg('rebolo', {
    n: 'Pedra de amolar', g: 'forja', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.7, 0.55);
      caixa(c, -R * 0.65, -R * 0.2, R * 1.3, R * 0.4, R * 0.05); c.fillStyle = MAD.med; c.fill(); linha(c, R * 0.04);
      c.save(); c.translate(0, 0); c.rotate(t * 2.5 + s);
      c.fillStyle = radial(c, 0, 0, R * 0.5, [PED.luz, PED.cla, PED.med]); c.beginPath(); c.ellipse(0, 0, R * 0.48, R * 0.48, 0, 0, Math.PI * 2); c.fill(); linha(c, R * 0.04);
      c.strokeStyle = 'rgba(40,40,46,0.4)'; c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(-R * 0.4, 0); c.lineTo(R * 0.4, 0); c.stroke();
      c.restore();
      c.fillStyle = FER.esc; c.beginPath(); c.arc(0, 0, R * 0.08, 0, Math.PI * 2); c.fill();
    },
  });
  reg('lingotes', {
    n: 'Lingotes', g: 'forja', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.7, 0.6);
      const cor = ['#b8bcc4', '#d9a441', '#b87333'][s % 3];
      const peca = (x, y) => { c.beginPath(); c.moveTo(x - R * 0.3, y + R * 0.12); c.lineTo(x - R * 0.22, y - R * 0.12); c.lineTo(x + R * 0.22, y - R * 0.12); c.lineTo(x + R * 0.3, y + R * 0.12); c.closePath(); c.fillStyle = grad(c, 0, y - R * 0.12, 0, y + R * 0.12, [tom(cor, 0.4), tom(cor, -0.25)]); c.fill(); linha(c, R * 0.03); };
      for (const [x, y] of [[-0.32, 0.3], [0.32, 0.3], [0, 0.3], [-0.16, 0], [0.16, 0], [0, -0.3]]) peca(x * R, y * R);
    },
  });
  reg('carvao', {
    n: 'Monte de carvão', g: 'forja', size: 1, fogo: true, luz: { bright: 1.5, dim: 4, c: '#ff6a2a' },
    draw(c, R, t, s) {
      sombra(c, R, 0.75, 0.65);
      for (let i = 0; i < 22; i++) { const a = hsh(s, i, 1) * Math.PI * 2, d = Math.sqrt(hsh(s, i, 2)) * R * 0.62; pedrinha(c, Math.cos(a) * d, Math.sin(a) * d * 0.85, R * 0.12, s + i, { luz: '#4a4a4e', cla: '#2c2c30', med: '#141416', esc: '#000' }); }
      for (let i = 0; i < 8; i++) brasa(c, (hsh(s, i, 6) - 0.5) * R * 0.9, (hsh(s, i, 7) - 0.5) * R * 0.75, R * 0.06, t, i + s);
    },
  });

  /* ---------- Oriental ---------- */
  reg('torii', {
    n: 'Torii', g: 'oriental', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.95, 0.3, 0.04, 0.08);
      for (const x of [-0.65, 0.65]) { c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(x * R, 0, R * 0.14, 0, Math.PI * 2); c.fill(); c.fillStyle = '#c8302a'; c.beginPath(); c.arc(x * R, 0, R * 0.1, 0, Math.PI * 2); c.fill(); }
      c.beginPath(); c.moveTo(-R * 1.0, -R * 0.2); c.quadraticCurveTo(0, -R * 0.08, R * 1.0, -R * 0.2); c.lineTo(R * 0.95, R * 0.02); c.quadraticCurveTo(0, R * 0.12, -R * 0.95, R * 0.02); c.closePath();
      c.fillStyle = '#1e1a18'; c.fill(); linha(c, R * 0.03);
      caixa(c, -R * 0.82, R * 0.12, R * 1.64, R * 0.14, R * 0.03); c.fillStyle = '#c8302a'; c.fill(); linha(c, R * 0.03);
    },
  });
  reg('tatame', {
    n: 'Tatame', g: 'oriental', size: 2,
    draw(c, R, t, s) {
      const meia = (x, y, w, h) => { caixa(c, x, y, w, h, R * 0.02); c.fillStyle = grad(c, x, y, x + w, y + h, ['#cdbb7a', '#b3a060']); c.fill(); c.strokeStyle = '#3e5a3a'; c.lineWidth = R * 0.06; c.stroke();
        c.strokeStyle = 'rgba(90,80,40,0.25)'; c.lineWidth = R * 0.01; for (let i = 1; i < 10; i++) { c.beginPath(); c.moveTo(x + w * i / 10, y); c.lineTo(x + w * i / 10, y + h); c.stroke(); } };
      meia(-R * 0.95, -R * 0.95, R * 0.95, R * 1.9); meia(0, -R * 0.95, R * 0.95, R * 0.95); meia(0, 0, R * 0.95, R * 0.95);
    },
  });
  reg('bonsai', {
    n: 'Bonsai', g: 'oriental', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.6, 0.5);
      caixa(c, -R * 0.55, -R * 0.35, R * 1.1, R * 0.7, R * 0.08); c.fillStyle = grad(c, 0, -R * 0.35, 0, R * 0.35, ['#4a6a8a', '#2a4058']); c.fill(); linha(c, R * 0.04);
      c.fillStyle = '#5a4030'; c.fillRect(-R * 0.45, -R * 0.25, R * 0.9, R * 0.5);
      c.strokeStyle = '#4a2e1a'; c.lineWidth = R * 0.08; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, R * 0.1); c.quadraticCurveTo(-R * 0.3, -R * 0.1, R * 0.15, -R * 0.35); c.stroke();
      const vd = ['#2f5a2a', '#4a7a3a', '#6a9a4a']; folhas(c, -R * 0.25, -R * 0.35, R * 0.3, s, vd, 6); folhas(c, R * 0.25, -R * 0.5, R * 0.28, s + 3, vd, 6);
    },
  });
  reg('gongo', {
    n: 'Gongo', g: 'oriental', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.85, 0.3, 0.04, 0.05);
      c.strokeStyle = MAD.esc; c.lineWidth = R * 0.12; c.lineCap = 'round'; c.beginPath(); c.moveTo(-R * 0.85, R * 0.1); c.lineTo(-R * 0.85, -R * 0.75); c.lineTo(R * 0.85, -R * 0.75); c.lineTo(R * 0.85, R * 0.1); c.stroke();
      c.fillStyle = radial(c, -R * 0.12, -R * 0.12, R * 0.6, ['#f6d27a', '#c8962e', '#7a5414']); c.beginPath(); c.arc(0, -R * 0.12, R * 0.52, 0, Math.PI * 2); c.fill(); linha(c, R * 0.04);
      c.strokeStyle = 'rgba(90,60,10,0.6)'; c.lineWidth = R * 0.03; c.beginPath(); c.arc(0, -R * 0.12, R * 0.3, 0, Math.PI * 2); c.stroke();
    },
  });
  reg('biombo', {
    n: 'Biombo', g: 'oriental', size: 2,
    draw(c, R, t, s) {
      sombra(c, R, 0.95, 0.25, 0.04, 0.1);
      const pts = [[-R * 0.95, R * 0.05], [-R * 0.48, -R * 0.12], [0, R * 0.05], [R * 0.48, -R * 0.12], [R * 0.95, R * 0.05]];
      for (let i = 0; i < 4; i++) {
        const [a, b] = [pts[i], pts[i + 1]];
        c.beginPath(); c.moveTo(a[0], a[1] - R * 0.08); c.lineTo(b[0], b[1] - R * 0.08); c.lineTo(b[0], b[1] + R * 0.08); c.lineTo(a[0], a[1] + R * 0.08); c.closePath();
        c.fillStyle = i % 2 ? '#efe4c8' : '#e2d4b0'; c.fill(); c.strokeStyle = '#2a1a10'; c.lineWidth = R * 0.04; c.stroke();
      }
    },
  });
  reg('lanternaPedra', {
    n: 'Lanterna de pedra', g: 'oriental', size: 1, fogo: true, luz: { bright: 2, dim: 5, c: '#ffd59a' },
    draw(c, R, t, s, ang) {
      sombra(c, R, 0.6, 0.6);
      c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.75); } c.closePath();
      c.fillStyle = grad(c, -R, -R, R, R, [PED.luz, PED.med]); c.fill(); linha(c, R * 0.04);
      c.fillStyle = '#1a1612'; caixa(c, -R * 0.3, -R * 0.3, R * 0.6, R * 0.6, R * 0.06); c.fill();
      chama(c, 0, R * 0.12, R * 0.4, t, s, ang);
      c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); } c.closePath(); c.fillStyle = PED.cla; c.globalAlpha = 0.35; c.fill(); c.globalAlpha = 1;
    },
  });

  /* ---------- Portões e cortinas (com estado; fechados, barram) ---------- */
  const ESTP = [['fechado', 'Fechado'], ['aberto', 'Aberto']];
  reg('portao', {
    n: 'Portão de ferro', g: 'portao', size: 1, estados: ESTP, parede: 'door',
    draw(c, R, t, s) {
      const ab = est() === 'aberto';
      for (const x of [-1, 1]) { c.fillStyle = PED.med; caixa(c, x * R - R * 0.12, -R * 0.14, R * 0.24, R * 0.28, R * 0.04); c.fill(); linha(c, R * 0.03); }
      const folha = (lado) => {
        c.save(); c.translate(lado * R * 0.92, 0); if (ab) c.rotate(lado * -1.35);
        const w = R * 0.92 * -lado;
        c.strokeStyle = FER.esc; c.lineWidth = R * 0.08; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.stroke();
        c.strokeStyle = FER.cla; c.lineWidth = R * 0.04; c.stroke();
        for (let i = 1; i < 5; i++) { c.fillStyle = FER.esc; c.beginPath(); c.arc(w * i / 5, 0, R * 0.05, 0, Math.PI * 2); c.fill(); }
        c.restore();
      };
      folha(-1); folha(1);
    },
  });
  reg('grade', {
    n: 'Grade levadiça', g: 'portao', size: 1, estados: ESTP, parede: 'window',
    draw(c, R, t, s) {
      const ab = est() === 'aberto';
      for (const x of [-1, 1]) { c.fillStyle = PED.med; caixa(c, x * R - R * 0.14, -R * 0.2, R * 0.28, R * 0.4, R * 0.04); c.fill(); linha(c, R * 0.03); }
      if (ab) { c.fillStyle = 'rgba(20,20,24,0.55)'; c.fillRect(-R * 0.86, -R * 0.06, R * 1.72, R * 0.12); c.strokeStyle = 'rgba(230,171,79,0.5)'; c.setLineDash([R * 0.1, R * 0.08]); c.lineWidth = R * 0.03; c.strokeRect(-R * 0.86, -R * 0.06, R * 1.72, R * 0.12); c.setLineDash([]); return; }
      c.fillStyle = FER.esc; c.fillRect(-R * 0.86, -R * 0.1, R * 1.72, R * 0.2);
      for (let i = 0; i < 8; i++) { const x = -R * 0.78 + i * R * 0.223; c.fillStyle = FER.cla; c.beginPath(); c.arc(x, 0, R * 0.065, 0, Math.PI * 2); c.fill(); linha(c, R * 0.02); }
    },
  });
  reg('cortina', {
    n: 'Cortina', g: 'portao', size: 1, estados: ESTP, parede: 'veil', cores: true,
    draw(c, R, t, s, ang, tok) {
      const ab = est() === 'aberto', cor = Props.coresDe(tok)[0];
      c.strokeStyle = FER.esc; c.lineWidth = R * 0.05; c.beginPath(); c.moveTo(-R, -R * 0.12); c.lineTo(R, -R * 0.12); c.stroke();
      const pano = (x0, x1) => {
        c.beginPath(); c.moveTo(x0, -R * 0.12); const n = 6;
        for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; c.lineTo(x, (i % 2 ? R * 0.12 : R * 0.02)); }
        c.lineTo(x1, -R * 0.12); c.closePath(); c.fillStyle = grad(c, x0, 0, x1, 0, [tom(cor, 0.2), cor, tom(cor, -0.3)]); c.fill(); linha(c, R * 0.03);
      };
      if (ab) { pano(-R, -R * 0.62); pano(R * 0.62, R); } else pano(-R, R);
    },
  });

  /* Os trechos que os portões fechados (e abertos) põem na cena: { x1, y1, x2, y2, k, open, prop } — ao longo do
     objeto, pelo meio dele, girando com ele. */
  Props.paredes = sc => {
    const out = [];
    for (const t of sc.tokens) {
      const d = t.prop ? Props.P[t.prop] : null;
      if (!d || !d.parede) continue;
      const s = t.size * sc.cell, R = s / 2, cx = t.x + R, cy = t.y + R, a = (t.rot || 0) * Math.PI / 180, ux = Math.cos(a) * R, uy = Math.sin(a) * R;
      out.push({ id: 'pp_' + t.id, x1: cx - ux, y1: cy - uy, x2: cx + ux, y2: cy + uy, k: d.parede, open: Props.estado(t) === 'aberto', prop: t.id });
    }
    return out;
  };
  Props.assinatura = sc => { let k = ''; for (const t of sc.tokens) { const d = t.prop ? Props.P[t.prop] : null; if (d && d.parede) k += t.id + ':' + t.x + ',' + t.y + ',' + (t.rot || 0) + ',' + t.size + ',' + (t.est || '') + ';'; } return k; };
})();
