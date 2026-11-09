/* ---------------------------------------------------------------
   6b6. OS OBJETOS DA FURTIVIDADE (lote 122) — para as casas grandes, os cofres, as fugas e os fundos de serviço.
     · casa nobre: a cômoda, a penteadeira, a escrivaninha (as três 2 × 1, de costas para a parede), o relógio de pé, o
       quadro na parede (que abre: o cofre atrás) e o lustre (com luz);
     · segurança: o cofre de parede, o sino de alarme, a casinha do cão, o fio com guizos (nasce escondido, como as
       armadilhas) e a grade da janela;
     · entradas e fugas: o alçapão (abre; leva a outro andar, como a escada), a escada de mão (1 × 2), a corda com gancho,
       a claraboia, a chaminé e a boca do cano de esgoto;
     · serviço: o cesto de roupa, o carrinho de mão, a pilha de lenha (2 × 1), o tonel (2 × 2) e a prateleira de vinhos
       (2 × 1, a da adega).
   def.tranca: o objeto que pode ter fechadura (o segundo clique do mestre cria a fechadura com gazuas no Escudo; ver
   10g8). Aqui e nos de antes que trancam (o baú, o cofre, o armário, a jaula).
   --------------------------------------------------------------- */
(() => {
  const { caixa, linha, grad, radial, hsh, MAD, PED, FER, chama, sombra } = Props.kit;
  const est = Props.kit.est;
  const reg = (id, def) => Props.registrar(id, def);
  const ABRE = [['fechado', 'Fechado'], ['aberto', 'Aberto']];
  const sombraR = (c, R, B, m) => { c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; caixa(c, -R + m * 0.1, -B + m * 0.12, R * 2 - m * 0.06, B * 2 - m * 0.08, m * 0.1); c.fill(); c.restore(); };
  const OURO = '#d6a64a';

  /* ---------------- casa nobre ---------------- */
  // a cômoda: as gavetas, de frente para baixo
  reg('comoda', {
    n: 'Cômoda', g: 'movel', size: 2, fw: 2, fh: 1, costas: 'n', tranca: true, estados: ABRE,
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B), x = -R + m * 0.06, y = -B, w = R * 2 - m * 0.12, h = Math.min(B * 2, m * 1.2);
      sombraR(c, R, h / 2 + m * 0.05, m);
      caixa(c, x, y, w, h, m * 0.06); c.fillStyle = grad(c, 0, y, 0, y + h, [MAD.cla, MAD.med]); c.fill(); linha(c, m * 0.07);
      c.fillStyle = 'rgba(255,230,190,0.12)'; c.fillRect(x + m * 0.05, y + m * 0.05, w - m * 0.1, m * 0.12);
      const n = Math.max(2, Math.round(w / (m * 0.9)));
      for (let i = 0; i < n; i++) {
        const gx = x + m * 0.12 + i * (w - m * 0.24) / n, gw = (w - m * 0.24) / n - m * 0.06, aberta = est() === 'aberto' && i === s % n;
        caixa(c, gx, y + h * 0.5 + (aberta ? m * 0.25 : 0), gw, h * 0.4, m * 0.04); c.fillStyle = aberta ? '#2a1a0e' : MAD.med; c.fill(); linha(c, m * 0.04);
        c.fillStyle = OURO; c.beginPath(); c.arc(gx + gw / 2, y + h * 0.7 + (aberta ? m * 0.25 : 0), m * 0.05, 0, TAU); c.fill();
      }
      // em cima: a caixinha de joias e o castiçal
      c.fillStyle = '#7a2f3a'; caixa(c, x + w * 0.15, y + m * 0.15, m * 0.32, m * 0.22, m * 0.04); c.fill(); linha(c, m * 0.03);
      c.fillStyle = '#e8e0cc'; c.beginPath(); c.arc(x + w * 0.78, y + m * 0.26, m * 0.09, 0, TAU); c.fill();
    },
  });
  // a penteadeira: o espelho (contra a parede), o banquinho na frente
  reg('penteadeira', {
    n: 'Penteadeira', g: 'movel', size: 2, fw: 2, fh: 1, costas: 'n',
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B), x = -R + m * 0.1, y = -B, w = R * 2 - m * 0.2, h = m * 0.95;
      sombraR(c, R * 0.95, h / 2 + m * 0.1, m);
      caixa(c, x, y, w, h, m * 0.08); c.fillStyle = grad(c, 0, y, 0, y + h, ['#c9a77a', '#9a7a52']); c.fill(); linha(c, m * 0.06);
      // o espelho oval
      c.fillStyle = grad(c, -m * 0.4, y, m * 0.4, y + m * 0.4, ['#cfe3ee', '#8fb1c4', '#e8f2f6']); c.beginPath(); c.ellipse(0, y + m * 0.22, w * 0.28, m * 0.18, 0, 0, TAU); c.fill();
      c.strokeStyle = OURO; c.lineWidth = m * 0.06; c.stroke();
      // os frascos e a escova
      for (let i = 0; i < 3; i++) { c.fillStyle = ['#b85a7a', '#5a8ab8', '#d6b44a'][i]; c.beginPath(); c.arc(x + w * (0.12 + i * 0.09), y + h * 0.7, m * 0.07, 0, TAU); c.fill(); }
      c.fillStyle = MAD.esc; caixa(c, x + w * 0.7, y + h * 0.6, m * 0.32, m * 0.1, m * 0.04); c.fill();
      // o banquinho
      c.fillStyle = '#7a2f3a'; c.beginPath(); c.ellipse(0, B - m * 0.38, m * 0.3, m * 0.24, 0, 0, TAU); c.fill(); linha(c, m * 0.04);
    },
  });
  // a escrivaninha: a mesa com as gavetas trancadas, os papéis, o tinteiro, a cadeira
  reg('escrivaninha', {
    n: 'Escrivaninha', g: 'movel', size: 2, fw: 2, fh: 1, costas: 'n', tranca: true, estados: ABRE,
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B), x = -R + m * 0.06, y = -B + m * 0.04, w = R * 2 - m * 0.12, h = m * 1.1;
      sombraR(c, R, h / 2 + m * 0.05, m);
      caixa(c, x, y, w, h, m * 0.06); c.fillStyle = grad(c, x, y, x + w, y + h, [MAD.med, MAD.esc]); c.fill(); linha(c, m * 0.07);
      c.fillStyle = '#3d5a3a'; caixa(c, x + w * 0.2, y + m * 0.12, w * 0.6, h * 0.7, m * 0.04); c.fill();            // o feltro verde
      c.save(); c.translate(x + w * 0.42, y + h * 0.42); c.rotate(-0.12); c.fillStyle = '#efe6cf'; c.fillRect(-m * 0.3, -m * 0.2, m * 0.6, m * 0.42);
      c.strokeStyle = 'rgba(60,50,40,0.5)'; c.lineWidth = m * 0.02; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(-m * 0.22, -m * 0.1 + k * m * 0.09); c.lineTo(m * 0.22, -m * 0.1 + k * m * 0.09); c.stroke(); } c.restore();
      c.fillStyle = '#16131a'; c.beginPath(); c.arc(x + w * 0.72, y + h * 0.3, m * 0.08, 0, TAU); c.fill();
      c.strokeStyle = '#efe6cf'; c.lineWidth = m * 0.03; c.beginPath(); c.moveTo(x + w * 0.72, y + h * 0.3); c.lineTo(x + w * 0.8, y + h * 0.08); c.stroke();
      if (est() === 'aberto') { c.fillStyle = '#2a1a0e'; caixa(c, x + w * 0.04, y + h - m * 0.05, w * 0.14, m * 0.3, m * 0.03); c.fill(); linha(c, m * 0.03); }
      // a cadeira
      c.fillStyle = MAD.med; caixa(c, -m * 0.3, B - m * 0.66, m * 0.6, m * 0.56, m * 0.1); c.fill(); linha(c, m * 0.04);
      c.fillStyle = '#7a2f3a'; caixa(c, -m * 0.22, B - m * 0.58, m * 0.44, m * 0.4, m * 0.08); c.fill();
    },
  });
  reg('relogioPe', {
    n: 'Relógio de pé', g: 'movel', size: 1, esconde: 'atrás do relógio',
    draw(c, R, t) {
      sombra(c, R, 0.62, 0.42);
      caixa(c, -R * 0.55, -R * 0.4, R * 1.1, R * 0.8, R * 0.1); c.fillStyle = grad(c, 0, -R * 0.4, 0, R * 0.4, [MAD.cla, MAD.esc]); c.fill(); linha(c, R * 0.07);
      c.fillStyle = '#efe6cf'; c.beginPath(); c.arc(0, -R * 0.05, R * 0.3, 0, TAU); c.fill(); c.strokeStyle = OURO; c.lineWidth = R * 0.06; c.stroke();
      const a = (t * 0.6) % TAU; c.strokeStyle = '#16131a'; c.lineWidth = R * 0.04; c.beginPath(); c.moveTo(0, -R * 0.05); c.lineTo(Math.cos(a) * R * 0.2, -R * 0.05 + Math.sin(a) * R * 0.2); c.moveTo(0, -R * 0.05); c.lineTo(R * 0.12, -R * 0.15); c.stroke();
      c.fillStyle = OURO; c.beginPath(); c.arc(Math.sin(t * 3) * R * 0.18, R * 0.3, R * 0.07, 0, TAU); c.fill();
    },
  });
  // o quadro na parede (as costas em cima): aberto, mostra o cofre escondido atrás
  reg('quadro', {
    n: 'Quadro (cofre atrás)', g: 'movel', size: 1, tranca: true, estados: [['fechado', 'Fechado'], ['aberto', 'Aberto (o cofre)']],
    draw(c, R, t, s) {
      const y = -R, h = R * 0.36;
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-R * 0.82, y + R * 0.06, R * 1.7, h);
      if (est() === 'aberto') {
        c.fillStyle = grad(c, 0, y, 0, y + R * 0.5, [FER.cla, FER.esc]); caixa(c, -R * 0.42, y, R * 0.84, R * 0.5, R * 0.06); c.fill(); linha(c, R * 0.05);
        c.fillStyle = OURO; c.beginPath(); c.arc(0, y + R * 0.25, R * 0.1, 0, TAU); c.fill();
        c.save(); c.translate(R * 0.85, y); c.rotate(0.9); c.fillStyle = OURO; c.fillRect(-R * 1.6, 0, R * 1.6, h * 0.5); c.restore();
        return;
      }
      c.fillStyle = OURO; caixa(c, -R * 0.85, y, R * 1.7, h, R * 0.04); c.fill(); linha(c, R * 0.05);
      c.fillStyle = ['#3a5a7a', '#6a3a3a', '#3d5a3a'][s % 3]; c.fillRect(-R * 0.75, y + R * 0.06, R * 1.5, h - R * 0.12);
      c.fillStyle = 'rgba(240,220,160,0.6)'; c.beginPath(); c.arc(-R * 0.3, y + h * 0.45, R * 0.08, 0, TAU); c.fill();
      c.fillStyle = 'rgba(40,60,40,0.8)'; c.beginPath(); c.moveTo(-R * 0.75, y + h - R * 0.06); c.lineTo(-R * 0.1, y + h * 0.35); c.lineTo(R * 0.4, y + h - R * 0.06); c.fill();
    },
  });
  reg('lustre', {
    n: 'Lustre', g: 'luz', size: 1, fogo: true, luz: { bright: 3, dim: 6, c: '#ffd9a0' },
    draw(c, R, t, s, ang) {
      c.strokeStyle = OURO; c.lineWidth = R * 0.07;
      c.beginPath(); c.arc(0, 0, R * 0.6, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, R * 0.3, 0, TAU); c.stroke();
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); c.lineTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6); c.stroke(); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.5; if (!Props.kit.apagado()) chama(c, Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6, R * 0.24, t, s + i, ang); else { c.fillStyle = '#efe6cf'; c.beginPath(); c.arc(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6, R * 0.07, 0, TAU); c.fill(); } }
      c.fillStyle = OURO; c.beginPath(); c.arc(0, 0, R * 0.12, 0, TAU); c.fill();
    },
  });

  /* ---------------- segurança ---------------- */
  reg('cofreParede', {
    n: 'Cofre de parede', g: 'furtiv', size: 1, tranca: true, estados: ABRE,
    draw(c, R) {
      const y = -R, h = R * 0.62;
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-R * 0.62, y + R * 0.06, R * 1.3, h);
      caixa(c, -R * 0.66, y, R * 1.32, h, R * 0.06); c.fillStyle = grad(c, 0, y, 0, y + h, [FER.cla, FER.esc]); c.fill(); linha(c, R * 0.06);
      if (est() === 'aberto') {
        c.fillStyle = '#0f0e12'; caixa(c, -R * 0.52, y + R * 0.06, R * 1.04, h - R * 0.14, R * 0.04); c.fill();
        c.fillStyle = OURO; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-R * 0.3 + i * R * 0.2, y + h - R * 0.2, R * 0.08, 0, TAU); c.fill(); }
      } else {
        c.strokeStyle = '#1a1a1e'; c.lineWidth = R * 0.03; c.strokeRect(-R * 0.52, y + R * 0.06, R * 1.04, h - R * 0.14);
        c.fillStyle = '#c9ced6'; c.beginPath(); c.arc(0, y + h * 0.48, R * 0.17, 0, TAU); c.fill(); linha(c, R * 0.04);
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.fillStyle = '#16131a'; c.fillRect(Math.cos(a) * R * 0.13 - R * 0.01, y + h * 0.48 + Math.sin(a) * R * 0.13 - R * 0.01, R * 0.02, R * 0.02); }
      }
    },
  });
  reg('sinoAlarme', {
    n: 'Sino de alarme', g: 'furtiv', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.5, 0.5);
      c.fillStyle = MAD.esc; c.fillRect(-R * 0.08, -R * 0.85, R * 0.16, R * 0.5);
      c.fillStyle = grad(c, -R * 0.5, 0, R * 0.5, 0, ['#e0b45a', '#a8792a']); c.beginPath(); c.moveTo(-R * 0.18, -R * 0.4); c.quadraticCurveTo(-R * 0.25, R * 0.1, -R * 0.5, R * 0.35); c.lineTo(R * 0.5, R * 0.35); c.quadraticCurveTo(R * 0.25, R * 0.1, R * 0.18, -R * 0.4); c.closePath(); c.fill(); linha(c, R * 0.06);
      c.fillStyle = '#6b4a1a'; c.beginPath(); c.arc(0, R * 0.42, R * 0.1, 0, TAU); c.fill();
      c.strokeStyle = '#c9b48a'; c.lineWidth = R * 0.04; c.beginPath(); c.moveTo(R * 0.1, R * 0.4); c.quadraticCurveTo(R * 0.5, R * 0.7, R * 0.3, R * 0.9); c.stroke();
    },
  });
  reg('casinhaCao', {
    n: 'Casinha do cão', g: 'furtiv', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.8, 0.7);
      c.fillStyle = '#7a4a2a'; caixa(c, -R * 0.75, -R * 0.65, R * 1.5, R * 1.25, R * 0.08); c.fill(); linha(c, R * 0.06);
      c.strokeStyle = 'rgba(30,15,5,0.6)'; c.lineWidth = R * 0.05; c.beginPath(); c.moveTo(0, -R * 0.65); c.lineTo(0, R * 0.6); c.stroke();
      c.fillStyle = '#1a0f08'; c.beginPath(); c.arc(0, R * 0.62, R * 0.32, Math.PI, 0); c.fill();
      c.fillStyle = '#e8dcc0'; c.save(); c.translate(R * 0.55, R * 0.7); c.rotate(0.6); caixa(c, -R * 0.2, -R * 0.06, R * 0.4, R * 0.12, R * 0.06); c.fill(); c.restore();      // o osso
      c.fillStyle = '#5a6b8c'; c.beginPath(); c.arc(-R * 0.6, R * 0.75, R * 0.14, 0, TAU); c.fill();       // a vasilha
    },
  });
  // o fio com guizos: a armadilha de barulho (nasce escondida, armada)
  reg('guizos', {
    n: 'Fio com guizos', g: 'perigo', size: 1, armadilha: true,
    draw(c, R, t, s) {
      const disp = est() === 'disparada';
      c.strokeStyle = 'rgba(220,210,180,0.85)'; c.lineWidth = R * 0.04; c.beginPath(); c.moveTo(-R, disp ? R * 0.5 : 0); c.quadraticCurveTo(0, disp ? R * 0.8 : R * 0.08, R, disp ? R * 0.4 : 0); c.stroke();
      for (let i = 0; i < 3; i++) { const x = -R * 0.5 + i * R * 0.5, y = disp ? R * 0.62 : R * 0.06; c.fillStyle = '#e0b45a'; c.beginPath(); c.arc(x, y + R * 0.12, R * 0.11, 0, TAU); c.fill(); linha(c, R * 0.03); c.fillStyle = '#3a2a0a'; c.fillRect(x - R * 0.06, y + R * 0.13, R * 0.12, R * 0.025); }
      c.fillStyle = MAD.esc; for (const x of [-R * 0.95, R * 0.95]) { c.beginPath(); c.arc(x, 0, R * 0.08, 0, TAU); c.fill(); }
    },
  });
  // a grade da janela (as costas em cima: na parede)
  reg('gradeJanela', {
    n: 'Grade da janela', g: 'furtiv', size: 1,
    draw(c, R) {
      const y = -R - R * 0.12, h = R * 0.3;
      c.strokeStyle = FER.esc; c.lineWidth = R * 0.08; c.strokeRect(-R * 0.85, y, R * 1.7, h);
      c.lineWidth = R * 0.06; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * R * 0.24, y); c.lineTo(i * R * 0.24, y + h); c.stroke(); }
    },
  });

  /* ---------------- entradas e fugas ---------------- */
  // o alçapão: fechado, as tábuas com a argola; aberto, o buraco escuro com a escada. Com t.cena, leva ao outro andar.
  reg('alcapao', {
    n: 'Alçapão', g: 'furtiv', size: 1, tranca: true, estados: ABRE,
    draw(c, R) {
      if (est() === 'aberto') {
        c.fillStyle = '#0a0a0c'; caixa(c, -R * 0.82, -R * 0.82, R * 1.64, R * 1.64, R * 0.06); c.fill();
        c.strokeStyle = MAD.cla; c.lineWidth = R * 0.08; c.beginPath(); c.moveTo(-R * 0.4, -R * 0.7); c.lineTo(-R * 0.4, R * 0.7); c.moveTo(R * 0.4, -R * 0.7); c.lineTo(R * 0.4, R * 0.7); c.stroke();
        c.lineWidth = R * 0.06; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(-R * 0.4, k * R * 0.28); c.lineTo(R * 0.4, k * R * 0.28); c.stroke(); }
        c.fillStyle = MAD.med; caixa(c, -R * 0.82, -R * 1.0, R * 1.64, R * 0.22, R * 0.04); c.fill(); linha(c, R * 0.04);
        return;
      }
      caixa(c, -R * 0.82, -R * 0.82, R * 1.64, R * 1.64, R * 0.06); c.fillStyle = MAD.med; c.fill(); linha(c, R * 0.07);
      c.strokeStyle = 'rgba(30,15,5,0.6)'; c.lineWidth = R * 0.04; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(-R * 0.82, k * R * 0.42); c.lineTo(R * 0.82, k * R * 0.42); c.stroke(); }
      c.strokeStyle = FER.med; c.lineWidth = R * 0.12; for (const y of [-R * 0.55, R * 0.55]) { c.beginPath(); c.moveTo(-R * 0.82, y); c.lineTo(R * 0.82, y); c.stroke(); }
      c.strokeStyle = FER.cla; c.lineWidth = R * 0.07; c.beginPath(); c.arc(R * 0.4, 0, R * 0.16, 0, TAU); c.stroke();
    },
  });
  reg('escadaMao', {
    n: 'Escada de mão', g: 'furtiv', size: 2, fw: 1, fh: 2,
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-R * 0.55 + m * 0.08, -B * 0.95 + m * 0.1, R * 1.1, B * 1.9); c.restore();
      c.strokeStyle = MAD.cla; c.lineWidth = m * 0.12;
      for (const x of [-R * 0.45, R * 0.45]) { c.beginPath(); c.moveTo(x, -B * 0.95); c.lineTo(x, B * 0.95); c.stroke(); }
      c.lineWidth = m * 0.09; for (let y = -B * 0.8; y <= B * 0.85; y += m * 0.36) { c.beginPath(); c.moveTo(-R * 0.45, y); c.lineTo(R * 0.45, y); c.stroke(); }
    },
  });
  reg('cordaGancho', {
    n: 'Corda com gancho', g: 'furtiv', size: 1,
    draw(c, R, t, s) {
      c.strokeStyle = '#b89a62'; c.lineWidth = R * 0.08;
      c.beginPath(); for (let k = 0; k < 3; k++) c.arc(R * 0.1, R * 0.25, R * (0.2 + k * 0.12), 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(R * 0.1, -R * 0.1); c.quadraticCurveTo(-R * 0.2, -R * 0.4, -R * 0.1, -R * 0.62); c.stroke();
      c.strokeStyle = FER.cla; c.lineWidth = R * 0.08;
      for (const a of [-2.4, -1.57, -0.7]) { c.beginPath(); c.moveTo(-R * 0.1, -R * 0.62); c.lineTo(-R * 0.1 + Math.cos(a) * R * 0.3, -R * 0.62 + Math.sin(a) * R * 0.3); c.stroke(); }
    },
  });
  reg('claraboia', {
    n: 'Claraboia', g: 'furtiv', size: 1, tranca: true, estados: ABRE,
    draw(c, R) {
      caixa(c, -R * 0.8, -R * 0.8, R * 1.6, R * 1.6, R * 0.06); c.fillStyle = FER.esc; c.fill(); linha(c, R * 0.06);
      if (est() === 'aberto') { c.fillStyle = '#0a0a0c'; c.fillRect(-R * 0.66, -R * 0.66, R * 1.32, R * 1.32); return; }
      c.fillStyle = grad(c, -R, -R, R, R, ['rgba(170,200,230,0.85)', 'rgba(90,120,160,0.85)']); c.fillRect(-R * 0.66, -R * 0.66, R * 1.32, R * 1.32);
      c.strokeStyle = FER.esc; c.lineWidth = R * 0.08; c.beginPath(); c.moveTo(0, -R * 0.66); c.lineTo(0, R * 0.66); c.moveTo(-R * 0.66, 0); c.lineTo(R * 0.66, 0); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = R * 0.04; c.beginPath(); c.moveTo(-R * 0.5, -R * 0.2); c.lineTo(-R * 0.2, -R * 0.5); c.stroke();
    },
  });
  reg('chamine', {
    n: 'Chaminé', g: 'furtiv', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.8, 0.8);
      caixa(c, -R * 0.72, -R * 0.72, R * 1.44, R * 1.44, R * 0.06); c.fillStyle = grad(c, -R, -R, R, R, ['#a0533a', '#6e3424']); c.fill(); linha(c, R * 0.06);
      c.strokeStyle = 'rgba(40,15,8,0.5)'; c.lineWidth = R * 0.04; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(-R * 0.72, k * R * 0.36); c.lineTo(R * 0.72, k * R * 0.36); c.stroke(); }
      c.fillStyle = '#0d0a0a'; caixa(c, -R * 0.42, -R * 0.42, R * 0.84, R * 0.84, R * 0.04); c.fill();
      c.fillStyle = `rgba(150,150,150,${0.25 + 0.15 * Math.sin(t * 2 + s)})`; c.beginPath(); c.arc(R * 0.1, -R * 0.1, R * 0.3, 0, TAU); c.fill();
    },
  });
  reg('canoEsgoto', {
    n: 'Boca do cano de esgoto', g: 'furtiv', size: 1,
    draw(c, R) {
      c.fillStyle = 'rgba(80,110,70,0.5)'; c.beginPath(); c.ellipse(0, R * 0.35, R * 0.7, R * 0.4, 0, 0, TAU); c.fill();
      c.fillStyle = grad(c, -R, -R, R, R, [PED.cla, PED.esc]); c.beginPath(); c.arc(0, -R * 0.2, R * 0.72, 0, TAU); c.fill(); linha(c, R * 0.05);
      c.fillStyle = '#08080a'; c.beginPath(); c.arc(0, -R * 0.2, R * 0.52, 0, TAU); c.fill();
      c.strokeStyle = FER.med; c.lineWidth = R * 0.07; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * R * 0.2, -R * 0.68); c.lineTo(i * R * 0.2, R * 0.28); c.stroke(); }
    },
  });

  /* ---------------- serviço e bagunça ---------------- */
  reg('cestoRoupa', {
    n: 'Cesto de roupa', g: 'furtiv', size: 1, esconde: 'no cesto de roupa',
    draw(c, R, t, s) {
      sombra(c, R, 0.72, 0.62);
      c.fillStyle = '#b8945a'; c.beginPath(); c.ellipse(0, 0, R * 0.72, R * 0.6, 0, 0, TAU); c.fill(); linha(c, R * 0.06);
      c.strokeStyle = 'rgba(90,60,25,0.6)'; c.lineWidth = R * 0.04; for (let k = 1; k < 4; k++) { c.beginPath(); c.ellipse(0, 0, R * 0.72 * k / 4, R * 0.6 * k / 4, 0, 0, TAU); c.stroke(); }
      for (let i = 0; i < 5; i++) { c.fillStyle = ['#e8e0cc', '#8a4a4a', '#4a6a8a', '#d8d0bc', '#6a7a4a'][i]; c.beginPath(); c.ellipse((hsh(s, i, 1) - 0.5) * R * 0.8, (hsh(s, i, 2) - 0.5) * R * 0.6, R * 0.26, R * 0.16, hsh(s, i, 3) * 3, 0, TAU); c.fill(); }
    },
  });
  reg('carrinhoMao', {
    n: 'Carrinho de mão', g: 'furtiv', size: 1,
    draw(c, R, t, s) {
      sombra(c, R, 0.8, 0.5);
      c.strokeStyle = MAD.esc; c.lineWidth = R * 0.09; c.beginPath(); c.moveTo(-R * 0.3, R * 0.2); c.lineTo(-R * 0.3, R * 0.95); c.moveTo(R * 0.3, R * 0.2); c.lineTo(R * 0.3, R * 0.95); c.stroke();
      c.fillStyle = grad(c, 0, -R * 0.7, 0, R * 0.3, [FER.cla, FER.esc]); c.beginPath(); c.moveTo(-R * 0.55, -R * 0.45); c.lineTo(R * 0.55, -R * 0.45); c.lineTo(R * 0.4, R * 0.3); c.lineTo(-R * 0.4, R * 0.3); c.closePath(); c.fill(); linha(c, R * 0.05);
      c.fillStyle = '#16131a'; c.beginPath(); c.ellipse(0, -R * 0.7, R * 0.2, R * 0.12, 0, 0, TAU); c.fill();
      c.fillStyle = '#7a5a3a'; c.beginPath(); c.arc(0, -R * 0.1, R * 0.22, 0, TAU); c.fill();
    },
  });
  reg('pilhaLenha', {
    n: 'Pilha de lenha', g: 'furtiv', size: 2, fw: 2, fh: 1, esconde: 'atrás da pilha de lenha',
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B);
      sombraR(c, R, B * 0.85, m);
      const n = Math.max(4, Math.round(R * 2 / (m * 0.42)));
      for (let j = 0; j < 2; j++) for (let i = 0; i < n - j; i++) {
        const x = -R + m * 0.22 + i * (R * 2 - m * 0.44) / (n - 1) + j * m * 0.2, y = -B * 0.25 + j * B * 0.5 - B * 0.25 + m * 0.4;
        c.fillStyle = '#7a5230'; c.beginPath(); c.arc(x, y, m * 0.2, 0, TAU); c.fill(); linha(c, m * 0.03);
        c.fillStyle = '#d9b07a'; c.beginPath(); c.arc(x, y, m * 0.13, 0, TAU); c.fill();
      }
    },
  });
  reg('tonel', {
    n: 'Tonel', g: 'furtiv', size: 2, esconde: 'atrás do tonel',
    draw(c, R, t, s) {
      sombra(c, R, 0.9, 0.9);
      c.fillStyle = grad(c, -R, -R, R, R, [MAD.cla, MAD.esc]); c.beginPath(); c.arc(0, 0, R * 0.88, 0, TAU); c.fill(); linha(c, R * 0.05);
      c.strokeStyle = FER.esc; c.lineWidth = R * 0.07; for (const r2 of [0.86, 0.6]) { c.beginPath(); c.arc(0, 0, R * r2, 0, TAU); c.stroke(); }
      c.strokeStyle = 'rgba(40,22,8,0.4)'; c.lineWidth = R * 0.025; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6); c.lineTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86); c.stroke(); }
      c.fillStyle = '#3a1a10'; c.beginPath(); c.arc(R * 0.25, -R * 0.2, R * 0.08, 0, TAU); c.fill();
    },
  });
  reg('prateleiraVinho', {
    n: 'Prateleira de vinhos', g: 'furtiv', size: 2, fw: 2, fh: 1, costas: 'n',
    draw(c, R, t, s, ang, tk, B) {
      B = B || R; const m = Math.min(R, B), x = -R + m * 0.04, y = -B, w = R * 2 - m * 0.08, h = Math.min(B * 2, m * 1.1);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x + m * 0.06, y + m * 0.08, w, h); c.restore();
      caixa(c, x, y, w, h, m * 0.04); c.fillStyle = MAD.esc; c.fill(); linha(c, m * 0.06);
      const n = Math.max(3, Math.round(w / (m * 0.34)));
      for (let j = 0; j < 2; j++) for (let i = 0; i < n; i++) {
        if (hsh(s, i, j + 4) < 0.15) continue;
        const bx = x + m * 0.18 + i * (w - m * 0.36) / (n - 1), by = y + h * (0.3 + j * 0.4);
        c.fillStyle = ['#3a1020', '#1a3a1a', '#2a1a10'][Math.floor(hsh(s, i, j) * 3)]; c.beginPath(); c.arc(bx, by, m * 0.13, 0, TAU); c.fill();
        c.fillStyle = '#d6c8a0'; c.beginPath(); c.arc(bx, by, m * 0.05, 0, TAU); c.fill();
      }
    },
  });

  // os de antes que trancam (o segundo clique do mestre cria a fechadura)
  for (const id of ['bau', 'cofre', 'armario', 'jaula', 'caixao']) if (Props.P[id]) Props.P[id].tranca = true;
})();
