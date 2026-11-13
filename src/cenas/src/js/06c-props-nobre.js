/* ---------------------------------------------------------------
   6c. A CASA NOBRE (lote 148) — os objetos da casa bonita, da cozinha e do quintal com piscina:
     · a sala: o sofá (2 × 1), a poltrona, o aparador (2 × 1, com a fruteira e o castiçal) e o vaso grande com a planta;
     · a cozinha: o fogão a lenha (2 × 1, aceso, com a panela), a pia de pedra (2 × 1, com a bacia e o jarro) e a
       prateleira das panelas (2 × 1, de cobre, penduradas);
     · o quintal: a espreguiçadeira (1 × 2), o guarda-sol (2 × 2, visto de cima), a mesa de jardim (2 × 2, com as
       cadeiras), a escadinha da piscina e a boia.
   A piscina em si é pintada no fundo (o "piscina" do 10g9: a borda de pedra e a água). O primeiro uso foi a casa nobre
   com piscina, feita à mão para o Bruno; depois o gerador passou a pôr estes objetos (10g e 10gc).
   --------------------------------------------------------------- */
(() => {
  const { caixa, linha, grad, radial, hsh, MAD, PED, chama } = Props.kit;
  const reg = (id, def) => Props.registrar(id, def);
  Props.grupo('nobre', 'Casa nobre e quintal');
  const OURO = '#d6a64a', VINHO = ['#9a3442', '#6e2030'], AZUL = ['#3d6a96', '#274a6e'];
  const sombraR = (c, R, B, m) => { c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; caixa(c, -R + m * 0.12, -B + m * 0.14, R * 2 - m * 0.1, B * 2 - m * 0.1, m * 0.25); c.fill(); c.restore(); };

  // o sofá: o encosto (atrás, encostado na parede), os braços, as três almofadas e as almofadinhas
  reg('sofa', {
    n: 'Sofá', g: 'nobre', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B), x = -R + m * 0.06, y = -B + m * 0.06, w = R * 2 - m * 0.12, h = B * 2 - m * 0.16;
      sombraR(c, R, B, m);
      caixa(c, x, y, w, h, m * 0.22); c.fillStyle = grad(c, 0, y, 0, y + h, VINHO); c.fill(); linha(c, m * 0.06);
      caixa(c, x, y, w, h * 0.32, m * 0.18); c.fillStyle = VINHO[1]; c.fill(); linha(c, m * 0.04);              // o encosto
      for (const bx of [x, x + w - m * 0.3]) { caixa(c, bx, y + h * 0.18, m * 0.3, h * 0.82, m * 0.12); c.fillStyle = VINHO[1]; c.fill(); linha(c, m * 0.04); }
      const n = 3, aw = (w - m * 0.6) / n;
      for (let i = 0; i < n; i++) { caixa(c, x + m * 0.3 + i * aw + m * 0.03, y + h * 0.36, aw - m * 0.06, h * 0.56, m * 0.1); c.fillStyle = grad(c, 0, y + h * 0.36, 0, y + h, ['#b0434f', VINHO[0]]); c.fill(); linha(c, m * 0.03); }
      c.fillStyle = OURO; for (const px of [0.24, 0.76]) { c.save(); c.translate(x + w * px, y + h * 0.36); c.rotate(px < 0.5 ? -0.3 : 0.3); caixa(c, -m * 0.16, -m * 0.12, m * 0.32, m * 0.24, m * 0.06); c.fill(); linha(c, m * 0.025); c.restore(); }
    },
  });
  // a poltrona: o mesmo estofado, de um lugar só
  reg('poltrona', {
    n: 'Poltrona', g: 'nobre', size: 1, costas: 'n',
    draw(c, R) {
      const m = R, x = -R * 0.82, y = -R * 0.85, w = R * 1.64, h = R * 1.7;
      sombraR(c, R * 0.85, R * 0.85, m);
      caixa(c, x, y, w, h, m * 0.3); c.fillStyle = grad(c, 0, y, 0, y + h, VINHO); c.fill(); linha(c, m * 0.06);
      caixa(c, x, y, w, h * 0.34, m * 0.24); c.fillStyle = VINHO[1]; c.fill(); linha(c, m * 0.04);
      for (const bx of [x, x + w - m * 0.32]) { caixa(c, bx, y + h * 0.2, m * 0.32, h * 0.8, m * 0.14); c.fillStyle = VINHO[1]; c.fill(); linha(c, m * 0.04); }
      caixa(c, x + m * 0.34, y + h * 0.38, w - m * 0.68, h * 0.55, m * 0.12); c.fillStyle = '#b0434f'; c.fill(); linha(c, m * 0.03);
    },
  });
  // o aparador: o móvel baixo de madeira escura, com a fruteira, o castiçal e o livro
  reg('aparador', {
    n: 'Aparador', g: 'nobre', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B), x = -R + m * 0.06, y = -B, w = R * 2 - m * 0.12, h = Math.min(B * 2, m * 1.1);
      sombraR(c, R, h / 2 + m * 0.05, m);
      caixa(c, x, y, w, h, m * 0.06); c.fillStyle = grad(c, 0, y, 0, y + h, [MAD.med, MAD.esc]); c.fill(); linha(c, m * 0.07);
      c.strokeStyle = OURO; c.lineWidth = m * 0.03; c.strokeRect(x + m * 0.1, y + m * 0.1, w - m * 0.2, h - m * 0.2);
      // a fruteira
      const fx = x + w * 0.3, fy = y + h * 0.5;
      c.fillStyle = '#d8d2c2'; c.beginPath(); c.arc(fx, fy, m * 0.3, 0, TAU); c.fill(); linha(c, m * 0.03);
      for (const [dx, dy, cor] of [[-0.1, -0.08, '#d9442e'], [0.1, -0.05, '#e8b030'], [0, 0.1, '#6aa83e'], [-0.12, 0.1, '#7a2f8a']]) { c.fillStyle = cor; c.beginPath(); c.arc(fx + m * dx, fy + m * dy, m * 0.1, 0, TAU); c.fill(); }
      // o castiçal (com a chama)
      const cx = x + w * 0.72, cy = y + h * 0.5;
      c.fillStyle = OURO; c.beginPath(); c.arc(cx, cy, m * 0.14, 0, TAU); c.fill(); linha(c, m * 0.03);
      c.fillStyle = '#efe6d0'; c.beginPath(); c.arc(cx, cy, m * 0.06, 0, TAU); c.fill();
      if (chama) chama(c, cx, cy - m * 0.02, m * 0.18, t, s, ang);
      c.fillStyle = '#3b5a78'; caixa(c, x + w * 0.86, y + h * 0.25, m * 0.2, h * 0.5, m * 0.02); c.fill(); linha(c, m * 0.02);
    },
  });
  // o vaso grande com a planta (as folhas largas, vistas de cima)
  reg('vasoGrande', {
    n: 'Vaso com planta', g: 'nobre', size: 1,
    draw(c, R, t, s) {
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(R * 0.08, R * 0.1, R * 0.62, 0, TAU); c.fill();
      c.fillStyle = radial(c, -R * 0.15, -R * 0.15, R * 0.65, ['#d9a07a', '#a8623c', '#6e3a20']); c.beginPath(); c.arc(0, 0, R * 0.58, 0, TAU); c.fill(); linha(c, R * 0.05);
      c.fillStyle = '#3b2a1c'; c.beginPath(); c.arc(0, 0, R * 0.44, 0, TAU); c.fill();
      const verdes = ['#3f8a44', '#4f9a4a', '#62b45a', '#2f7238'];
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU + hsh(s, i, 1) * 0.5 + Math.sin(t * 0.8 + i) * 0.04, d = R * (0.5 + hsh(s, i, 2) * 0.3);
        c.fillStyle = verdes[i % verdes.length]; c.beginPath(); c.ellipse(Math.cos(a) * d * 0.55, Math.sin(a) * d * 0.55, d * 0.55, d * 0.2, a, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(20,50,20,0.5)'; c.lineWidth = R * 0.025; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * d, Math.sin(a) * d); c.stroke();
      }
    },
  });

  // o fogão a lenha: o bloco de ferro e tijolo, a chapa com as duas bocas (a panela numa) e o fogo aceso na frente
  reg('fogao', {
    n: 'Fogão a lenha', g: 'nobre', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 }, fogo: true, luz: { bright: 2, dim: 5, c: '#ff9a48' },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B), x = -R + m * 0.06, y = -B + m * 0.04, w = R * 2 - m * 0.12, h = B * 2 - m * 0.1;
      sombraR(c, R, B, m);
      caixa(c, x, y, w, h, m * 0.08); c.fillStyle = grad(c, 0, y, 0, y + h, ['#a25a3c', '#7a3e28']); c.fill(); linha(c, m * 0.06);   // o tijolo
      c.strokeStyle = 'rgba(50,20,10,0.4)'; c.lineWidth = m * 0.025;
      for (let j = 1; j < 4; j++) { c.beginPath(); c.moveTo(x, y + h * j / 4); c.lineTo(x + w, y + h * j / 4); c.stroke(); }
      caixa(c, x + m * 0.12, y + m * 0.1, w - m * 0.24, h * 0.62, m * 0.05); c.fillStyle = grad(c, 0, y, 0, y + h * 0.7, ['#3d434c', '#22262c']); c.fill(); linha(c, m * 0.04);   // a chapa
      const b1 = x + w * 0.3, b2 = x + w * 0.68, by = y + h * 0.38;
      c.strokeStyle = '#626a76'; c.lineWidth = m * 0.04; for (const bx of [b1, b2]) { c.beginPath(); c.arc(bx, by, m * 0.22, 0, TAU); c.stroke(); }
      // a panela de ferro na boca da direita, com a sopa
      c.fillStyle = '#1b1d22'; c.beginPath(); c.arc(b2, by, m * 0.28, 0, TAU); c.fill(); linha(c, m * 0.03);
      c.fillStyle = '#b8873a'; c.beginPath(); c.arc(b2, by, m * 0.2, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.arc(b2 - m * 0.05 + Math.sin(t * 2) * m * 0.03, by - m * 0.04, m * 0.05, 0, TAU); c.fill();
      // a boca do fogo, na frente
      c.fillStyle = '#120a06'; caixa(c, x + w * 0.38, y + h * 0.74, w * 0.24, h * 0.22, m * 0.04); c.fill();
      if (chama) chama(c, x + w * 0.5, y + h * 0.92, m * 0.22, t, s, ang);
    },
  });
  // a pia de pedra: a bancada, a bacia com a água, o jarro e os pratos secando
  reg('piaCozinha', {
    n: 'Pia de cozinha', g: 'nobre', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B), x = -R + m * 0.06, y = -B + m * 0.04, w = R * 2 - m * 0.12, h = B * 2 - m * 0.1;
      sombraR(c, R, B, m);
      caixa(c, x, y, w, h, m * 0.08); c.fillStyle = grad(c, 0, y, 0, y + h, [PED.luz, PED.cla]); c.fill(); linha(c, m * 0.06);
      const bx = x + w * 0.32, by = y + h * 0.48;
      caixa(c, bx - m * 0.5, by - m * 0.36, m, m * 0.72, m * 0.2); c.fillStyle = PED.med; c.fill(); linha(c, m * 0.04);
      caixa(c, bx - m * 0.4, by - m * 0.27, m * 0.8, m * 0.54, m * 0.16); c.fillStyle = radial(c, bx, by, m * 0.5, ['#9cc7dc', '#5f93b0']); c.fill();
      c.strokeStyle = 'rgba(230,245,255,0.5)'; c.lineWidth = m * 0.025; const rr = m * (0.08 + ((t * 0.3) % 1) * 0.2); c.beginPath(); c.ellipse(bx, by, rr * 1.4, rr, 0, 0, TAU); c.stroke();
      // o jarro e a pilha de pratos
      c.fillStyle = radial(c, 0, 0, m * 0.3, ['#d9a07a', '#a8623c']); c.beginPath(); c.arc(x + w * 0.7, y + h * 0.42, m * 0.2, 0, TAU); c.fill(); linha(c, m * 0.03);
      for (let i = 0; i < 3; i++) { c.fillStyle = i % 2 ? '#e8e2d2' : '#f4efe4'; c.beginPath(); c.arc(x + w * 0.86 - i * m * 0.03, y + h * 0.55 - i * m * 0.04, m * 0.17, 0, TAU); c.fill(); linha(c, m * 0.02); }
    },
  });
  // a prateleira das panelas: a tábua na parede, as panelas e as conchas de cobre penduradas
  reg('prateleiraPanelas', {
    n: 'Prateleira de panelas', g: 'nobre', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 },
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B), x = -R + m * 0.06, y = -B, w = R * 2 - m * 0.12, h = m * 0.4;
      sombraR(c, R, h / 2 + m * 0.3, m);
      caixa(c, x, y, w, h, m * 0.04); c.fillStyle = grad(c, 0, y, 0, y + h, [MAD.cla, MAD.med]); c.fill(); linha(c, m * 0.05);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const px = x + w * (i + 0.5) / n, py = y + h + m * (0.3 + (i % 2) * 0.12), r = m * (0.18 + hsh(s, i, 1) * 0.08);
        c.strokeStyle = '#8a5a2e'; c.lineWidth = m * 0.03; c.beginPath(); c.moveTo(px, y + h * 0.6); c.lineTo(px, py - r); c.stroke();
        c.fillStyle = radial(c, px - r * 0.3, py - r * 0.3, r * 1.3, ['#f0b27a', '#c47a3a', '#7a3e18']); c.beginPath(); c.arc(px, py, r, 0, TAU); c.fill(); linha(c, m * 0.025);
        if (i % 2) { c.fillStyle = '#7a3e18'; caixa(c, px + r * 0.8, py - m * 0.03, m * 0.3, m * 0.06, m * 0.02); c.fill(); }
      }
    },
  });

  // a espreguiçadeira: a armação de madeira, o colchonete listrado e a toalha
  reg('espreguicadeira', {
    n: 'Espreguiçadeira', g: 'nobre', size: 2, fw: 1, fh: 2,
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B), x = -R + m * 0.12, y = -B + m * 0.08, w = R * 2 - m * 0.24, h = B * 2 - m * 0.16;
      sombraR(c, R * 0.9, B, m);
      caixa(c, x, y, w, h, m * 0.12); c.fillStyle = MAD.med; c.fill(); linha(c, m * 0.05);
      c.save(); caixa(c, x + m * 0.1, y + m * 0.1, w - m * 0.2, h - m * 0.2, m * 0.1); c.clip();
      for (let i = 0, n = 8; i < n; i++) { c.fillStyle = i % 2 ? '#f2efe6' : AZUL[0]; c.fillRect(x, y + h * i / n, w, h / n + 1); }
      c.restore();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = m * 0.04; c.beginPath(); c.moveTo(x, y + h * 0.3); c.lineTo(x + w, y + h * 0.3); c.stroke();   // a dobra do encosto
      c.fillStyle = '#e8c84a'; caixa(c, x + w * 0.2, y + h * 0.55, w * 0.6, h * 0.22, m * 0.06); c.fill(); linha(c, m * 0.02);                           // a toalha
    },
  });
  // o guarda-sol, visto de cima: os gomos de pano, de duas cores, e a ponta no meio
  reg('guardaSol', {
    n: 'Guarda-sol', g: 'nobre', size: 2,
    draw(c, R, t, s) {
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.arc(R * 0.12, R * 0.14, R * 0.94, 0, TAU); c.fill();
      const n = 8;
      for (let i = 0; i < n; i++) {
        const a0 = i / n * TAU + Math.sin(t * 0.6) * 0.01, a1 = (i + 1) / n * TAU;
        c.fillStyle = i % 2 ? '#f2efe6' : '#c8423a'; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a0) * R * 0.9, Math.sin(a0) * R * 0.9); c.lineTo(Math.cos(a1) * R * 0.9, Math.sin(a1) * R * 0.9); c.closePath(); c.fill();
      }
      c.strokeStyle = 'rgba(60,20,16,0.5)'; c.lineWidth = R * 0.025;
      for (let i = 0; i < n; i++) { const a = i / n * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); c.stroke(); }
      linha(c, R * 0.03);
      c.fillStyle = OURO; c.beginPath(); c.arc(0, 0, R * 0.07, 0, TAU); c.fill(); linha(c, R * 0.02);
    },
  });
  // a mesa de jardim: o tampo redondo de ferro trabalhado, as quatro cadeiras em volta, a jarra e os copos
  reg('mesaJardim', {
    n: 'Mesa de jardim', g: 'nobre', size: 2,
    draw(c, R, t, s) {
      const ferro = ['#e8e4dc', '#bfb9ae'];
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + Math.PI / 4, cx = Math.cos(a) * R * 0.66, cy = Math.sin(a) * R * 0.66;
        c.save(); c.translate(cx, cy); c.rotate(a + Math.PI / 2);
        c.fillStyle = 'rgba(0,0,0,0.25)'; caixa(c, -R * 0.2, -R * 0.16, R * 0.44, R * 0.36, R * 0.06); c.fill();
        caixa(c, -R * 0.22, -R * 0.18, R * 0.44, R * 0.36, R * 0.06); c.fillStyle = grad(c, 0, -R * 0.2, 0, R * 0.2, ferro); c.fill(); linha(c, R * 0.03);
        caixa(c, -R * 0.22, R * 0.12, R * 0.44, R * 0.08, R * 0.03); c.fillStyle = ferro[1]; c.fill(); linha(c, R * 0.02);
        c.restore();
      }
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(R * 0.06, R * 0.08, R * 0.46, 0, TAU); c.fill();
      c.fillStyle = radial(c, -R * 0.1, -R * 0.1, R * 0.5, ferro); c.beginPath(); c.arc(0, 0, R * 0.44, 0, TAU); c.fill(); linha(c, R * 0.03);
      c.strokeStyle = 'rgba(120,110,95,0.6)'; c.lineWidth = R * 0.015; for (const rr of [0.34, 0.24]) { c.beginPath(); c.arc(0, 0, R * rr, 0, TAU); c.stroke(); }
      c.fillStyle = 'rgba(200,230,240,0.85)'; c.beginPath(); c.arc(0, 0, R * 0.1, 0, TAU); c.fill(); linha(c, R * 0.015);
      c.fillStyle = '#e8b030'; c.beginPath(); c.arc(0, 0, R * 0.065, 0, TAU); c.fill();
      for (const [dx, dy] of [[-0.24, -0.1], [0.22, 0.14]]) { c.fillStyle = 'rgba(220,240,250,0.8)'; c.beginPath(); c.arc(R * dx, R * dy, R * 0.055, 0, TAU); c.fill(); linha(c, R * 0.012); }
    },
  });
  // a escadinha da piscina: os dois corrimãos curvos e os degraus
  reg('escadaPiscina', {
    n: 'Escadinha da piscina', g: 'nobre', size: 1,
    draw(c, R) {
      const inox = ['#e6ecf0', '#9aa6ae'];
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = R * 0.16; c.lineCap = 'round';
      for (const sx of [-0.45, 0.45]) { c.beginPath(); c.moveTo(R * sx + R * 0.06, -R * 0.8); c.lineTo(R * sx + R * 0.06, R * 0.75); c.stroke(); }
      for (let i = 0; i < 3; i++) { c.fillStyle = grad(c, 0, -R * 0.1, 0, R * 0.1, inox); caixa(c, -R * 0.45, -R * 0.15 + i * R * 0.35, R * 0.9, R * 0.12, R * 0.04); c.fill(); linha(c, R * 0.02); }
      c.strokeStyle = inox[0]; c.lineWidth = R * 0.11;
      for (const sx of [-0.45, 0.45]) { c.beginPath(); c.moveTo(R * sx, -R * 0.85); c.quadraticCurveTo(R * sx, -R * 0.5, R * sx, -R * 0.3); c.lineTo(R * sx, R * 0.7); c.stroke(); }
      c.strokeStyle = 'rgba(60,70,80,0.6)'; c.lineWidth = R * 0.03;
      for (const sx of [-0.45, 0.45]) { c.beginPath(); c.moveTo(R * sx + R * 0.05, -R * 0.85); c.lineTo(R * sx + R * 0.05, R * 0.7); c.stroke(); }
      c.lineCap = 'butt';
    },
  });
  // a boia: o anel listrado boiando (mexe de leve)
  reg('boia', {
    n: 'Boia', g: 'nobre', size: 1,
    draw(c, R, t, s) {
      const dx = Math.sin(t * 0.9 + s) * R * 0.05, dy = Math.cos(t * 0.7 + s) * R * 0.05;
      c.fillStyle = 'rgba(0,30,50,0.25)'; c.beginPath(); c.arc(dx + R * 0.06, dy + R * 0.08, R * 0.7, 0, TAU); c.fill();
      for (let i = 0; i < 8; i++) { c.strokeStyle = i % 2 ? '#f4efe4' : '#e05a3a'; c.lineWidth = R * 0.3; c.beginPath(); c.arc(dx, dy, R * 0.5, i / 8 * TAU, (i + 1) / 8 * TAU); c.stroke(); }
      c.strokeStyle = 'rgba(40,20,10,0.5)'; c.lineWidth = R * 0.03; for (const rr of [0.35, 0.65]) { c.beginPath(); c.arc(dx, dy, R * rr, 0, TAU); c.stroke(); }
    },
  });
})();
