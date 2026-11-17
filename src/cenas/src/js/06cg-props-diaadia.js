/* ---------------------------------------------------------------
   6cg. DIA A DIA (lote 179) — 21 objetos comuns que servem em qualquer mapa: a floreira, o bebedouro, o mourão, o
   cavalo, o gato, o banco de pedra, o poste de lampião, a placa de direção, o muro baixo, a porteira, a tina de lavar,
   o toco com o machado, a pilha de pedras, o cesto, a roda de carroça, os vasinhos de ervas, o forno de barro, o
   banquinho, a cadeira de balanço, os degraus de pedra e a ponte de madeira.
   --------------------------------------------------------------- */
(() => {
  const { caixa, linha, grad, radial, hsh, MAD, PED, FER, chama, sombra, pedrinha, folhas, brasa } = Props.kit;
  const { bola, oval, ret, seg, poli, somb, brilho, mm } = Props.kitT;
  const reg = (id, def) => Props.registrar(id, def);
  const FLOR = ['#e84a5a', '#f2c42a', '#f4f0f8', '#a85ad8', '#ff8a3a'];
  Props.grupo('diaadia', 'Dia a dia');

  reg('floreira', {
    n: 'Floreira de janela', g: 'diaadia', size: 2, fw: 2, fh: 1, costas: 'n', legado: { w: 1, h: 0.5 }, tags: 'flores planta vaso janela',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B);
      ret(c, -R * 0.92, -b * 0.95, R * 1.84, b * 1.3, m * 0.08, grad(c, 0, -b, 0, b * 0.4, [MAD.cla, MAD.med]), m * 0.05);
      ret(c, -R * 0.84, -b * 0.8, R * 1.68, b * 1.0, m * 0.06, '#5a3a22');
      for (let i = 0; i < 9; i++) { const x = -R * 0.8 + i * R * 0.2, y = -b * 0.35 + (i % 2) * b * 0.3; oval(c, x, y, b * 0.32, b * 0.2, i, '#3f7a34'); bola(c, x + b * 0.06, y - b * 0.1, b * 0.2, FLOR[(i + s) % 5], m * 0.02); bola(c, x + b * 0.06, y - b * 0.1, b * 0.07, '#f2d04a'); }
    },
  });
  reg('bebedouro', {
    n: 'Bebedouro de cavalos', g: 'diaadia', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, tags: 'agua água cavalo cocho estabulo estábulo',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R * 0.9, b * 0.6, m);
      ret(c, -R * 0.9, -b * 0.6, R * 1.8, b * 1.2, m * 0.1, PED.med, m * 0.05);
      ret(c, -R * 0.78, -b * 0.42, R * 1.56, b * 0.84, m * 0.06, grad(c, 0, -b * 0.4, 0, b * 0.4, ['#5a8ab0', '#2a5a80']));
      c.strokeStyle = 'rgba(220,240,255,0.5)'; c.lineWidth = m * 0.02; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-R * 0.6 + i * R * 0.5, -b * 0.1); c.quadraticCurveTo(-R * 0.45 + i * R * 0.5, -b * 0.25, -R * 0.3 + i * R * 0.5, -b * 0.1); c.stroke(); }
    },
  });
  reg('mourao', {
    n: 'Mourão de amarrar', g: 'diaadia', size: 1, tags: 'cavalo poste corda estabulo estábulo',
    draw(c, R) {
      sombra(c, R, 0.8, 0.3);
      for (const k of [-1, 1]) bola(c, k * R * 0.7, 0, R * 0.22, radial(c, k * R * 0.65, -R * 0.05, R * 0.25, [MAD.luz, MAD.med]), R * 0.04);
      ret(c, -R * 0.75, -R * 0.12, R * 1.5, R * 0.24, R * 0.08, MAD.cla, R * 0.04);
      c.strokeStyle = '#c9b48a'; c.lineWidth = R * 0.04; c.beginPath(); c.moveTo(-R * 0.1, 0); c.quadraticCurveTo(0, R * 0.45, R * 0.2, R * 0.7); c.stroke();
    },
  });
  reg('cavalo', {
    n: 'Cavalo', g: 'diaadia', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, vivo: true, tags: 'animal montaria estabulo estábulo',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B), cor = [['#8a5a32', '#5a3a1e'], ['#e8dcc8', '#b8a890'], ['#3a2e26', '#1e1812'], ['#b8783a', '#7a4a1e']][s % 4], cab = Math.sin(t * 0.7) * m * 0.06;
      somb(c, R * 0.85, b * 0.6, m);
      oval(c, R * 0.85, 0, R * 0.14, m * 0.08, 0, cor[1]);
      oval(c, R * 0.05, 0, R * 0.62, b * 0.55, 0, radial(c, 0, -b * 0.2, R * 0.7, [cor[0], cor[0], cor[1]]), m * 0.04);
      ret(c, -R * 0.05, -b * 0.5, R * 0.3, b, m * 0.08, '#6a3a1e', m * 0.03);
      oval(c, -R * 0.62, cab, R * 0.18, m * 0.17, 0, cor[0], m * 0.03);
      oval(c, -R * 0.88, cab, R * 0.14, m * 0.13, 0, cor[0], m * 0.03);
      seg(c, -R * 0.48, cab, -R * 0.75, cab, m * 0.06, cor[1]);
      for (const k of [-1, 1]) oval(c, -R * 0.72, cab + k * m * 0.12, m * 0.05, m * 0.03, 0, cor[1]);
    },
  });
  reg('gato', {
    n: 'Gato', g: 'diaadia', size: 1, vivo: true, tags: 'animal bichano',
    draw(c, R, t, s) {
      const cor = [['#e8a050', '#b8702a'], ['#3a3a3e', '#1e1e22'], ['#f0ece4', '#c8c0b0'], ['#8a8a8e', '#5a5a5e']][s % 4], rabo = Math.sin(t * 1.2) * 0.4;
      sombra(c, R, 0.5, 0.45);
      c.strokeStyle = cor[1]; c.lineWidth = R * 0.08; c.lineCap = 'round'; c.beginPath(); c.moveTo(R * 0.25, R * 0.15); c.quadraticCurveTo(R * 0.55, R * 0.4 + rabo * R * 0.2, R * 0.35 + rabo * R * 0.2, R * 0.55); c.stroke();
      oval(c, R * 0.05, R * 0.05, R * 0.32, R * 0.26, 0.4, radial(c, 0, 0, R * 0.35, [cor[0], cor[1]]), R * 0.03);
      bola(c, -R * 0.25, -R * 0.15, R * 0.17, cor[0], R * 0.03);
      for (const k of [-1, 1]) poli(c, [[-R * 0.25 + k * R * 0.14, -R * 0.24], [-R * 0.25 + k * R * 0.05, -R * 0.4], [-R * 0.25 + k * R * 0.02, -R * 0.22]], cor[1]);
      if (Math.sin(t * 0.5 + s) > -0.7) for (const k of [-1, 1]) oval(c, -R * 0.25 + k * R * 0.07, -R * 0.15, R * 0.025, R * 0.035, 0, '#b8d84a');
    },
  });
  reg('bancoPedra', {
    n: 'Banco de pedra', g: 'diaadia', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, tags: 'assento praca praça jardim',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B); somb(c, R * 0.9, b * 0.45, m);
      for (const k of [-1, 1]) ret(c, k * R * 0.65 - m * 0.15, -b * 0.5, m * 0.3, b, m * 0.04, PED.med, m * 0.03);
      ret(c, -R * 0.92, -b * 0.42, R * 1.84, b * 0.84, m * 0.08, grad(c, 0, -b * 0.4, 0, b * 0.4, [PED.luz, PED.cla]), m * 0.04);
      c.strokeStyle = 'rgba(60,64,72,0.3)'; c.lineWidth = m * 0.02; c.beginPath(); c.moveTo(-R * 0.2, -b * 0.4); c.lineTo(-R * 0.1, b * 0.1); c.stroke();
    },
  });
  reg('posteLampiao', {
    n: 'Poste de lampião', g: 'diaadia', size: 1, luz: { bright: 3, dim: 5, c: '#ffd88a' }, fogo: true, tags: 'luz rua iluminacao iluminação',
    draw(c, R, t, s, ang) {
      sombra(c, R, 0.3, 0.3, 0.3, 0.3);
      bola(c, 0, 0, R * 0.2, FER.esc, R * 0.03);
      brilho(c, 0, 0, R * 0.9, '#ffd88a', 0.4);
      poli(c, [[-R * 0.32, 0], [0, -R * 0.32], [R * 0.32, 0], [0, R * 0.32]], '#3d434c', R * 0.035);
      bola(c, 0, 0, R * 0.18, radial(c, 0, 0, R * 0.2, ['#fff8d0', '#ffd060', '#c88a20']));
      chama(c, 0, R * 0.03, R * 0.14, t, s, ang);
      bola(c, 0, 0, R * 0.06, FER.esc);
    },
  });
  reg('placaDirecao', {
    n: 'Placa de direção', g: 'diaadia', size: 1, tags: 'placa estrada caminho seta cidade',
    draw(c, R, t, s) {
      sombra(c, R, 0.7, 0.35);
      for (const [a, cor, y] of [[-0.25, MAD.luz, -R * 0.25], [0.3, MAD.cla, R * 0.12], [-0.1, MAD.cla, R * 0.45]]) {
        c.save(); c.translate(0, y); c.rotate(a); const d = (y > 0 ? -1 : 1);
        poli(c, [[-R * 0.6 * d, -R * 0.13], [R * 0.5 * d, -R * 0.13], [R * 0.72 * d, 0], [R * 0.5 * d, R * 0.13], [-R * 0.6 * d, R * 0.13]], cor, R * 0.03);
        seg(c, -R * 0.35 * d, 0, R * 0.35 * d, 0, R * 0.025, 'rgba(50,30,10,0.55)');
        c.restore();
      }
      bola(c, 0, 0, R * 0.1, MAD.esc, R * 0.02);
    },
  });
  reg('muroPedra', {
    n: 'Muro baixo de pedra', g: 'diaadia', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, tags: 'cerca muro mureta divisa',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-R, -b * 0.15, R * 2, b * 0.75); c.restore();
      ret(c, -R, -b * 0.35, R * 2, b * 0.7, m * 0.1, PED.esc);
      for (let i = 0; i < 9; i++) { const x = -R * 0.88 + i * R * 0.22; pedrinha(c, x, (hsh(s, i, 1) - 0.5) * b * 0.25, m * (0.2 + hsh(s, i, 2) * 0.08), s + i); }
      for (let i = 0; i < 3; i++) bola(c, -R * 0.6 + i * R * 0.6, -b * 0.2, m * 0.07, '#4f8a3e');
    },
  });
  reg('porteira', {
    n: 'Porteira', g: 'diaadia', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, tags: 'portao portão cerca fazenda curral',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B);
      const e = b * 0.6;
      for (const k of [-1, 1]) bola(c, k * R * 0.92, 0, b * 0.45, radial(c, k * R * 0.9, -b * 0.1, b * 0.5, [MAD.luz, MAD.med]), m * 0.05);
      for (const y of [-e, 0, e]) seg(c, -R * 0.8, y, R * 0.8, y, b * 0.2, MAD.cla);
      seg(c, -R * 0.8, e, R * 0.8, -e, b * 0.17, MAD.med);
      for (const x of [-R * 0.8, R * 0.8]) seg(c, x, -e * 1.1, x, e * 1.1, b * 0.2, MAD.med);
      c.strokeStyle = FER.cla; c.lineWidth = b * 0.08; c.beginPath(); c.arc(R * 0.8, 0, b * 0.3, -1, 1); c.stroke();
    },
  });
  reg('tinaLavar', {
    n: 'Tina de lavar roupa', g: 'diaadia', size: 1, tags: 'roupa lavar agua água tanque',
    draw(c, R, t, s) {
      sombra(c, R, 0.65, 0.65);
      bola(c, 0, 0, R * 0.62, MAD.med, R * 0.05);
      c.strokeStyle = FER.med; c.lineWidth = R * 0.05; c.beginPath(); c.arc(0, 0, R * 0.56, 0, TAU); c.stroke();
      bola(c, 0, 0, R * 0.48, radial(c, 0, 0, R * 0.48, ['#d8e4ec', '#a8c0d0']));
      for (let i = 0; i < 6; i++) bola(c, (hsh(s, i, 1) - 0.5) * R * 0.6, (hsh(s, i, 2) - 0.5) * R * 0.6, R * (0.05 + hsh(s, i, 3) * 0.06), 'rgba(255,255,255,0.85)');
      c.save(); c.rotate(0.5); ret(c, -R * 0.3, -R * 0.12, R * 0.4, R * 0.24, R * 0.06, '#5a7aa8', R * 0.02); c.restore();
      ret(c, R * 0.25, -R * 0.55, R * 0.25, R * 0.5, R * 0.03, MAD.cla, R * 0.02);
    },
  });
  reg('tocoMachado', {
    n: 'Toco com machado', g: 'diaadia', size: 1, tags: 'lenha rachar madeira machado',
    draw(c, R, t, s) {
      for (let i = 0; i < 4; i++) { c.save(); c.translate((hsh(s, i, 1) - 0.5) * R * 1.3, (hsh(s, i, 2) - 0.5) * R * 1.3); c.rotate(hsh(s, i, 3) * 3); poli(c, [[-R * 0.15, -R * 0.06], [R * 0.15, -R * 0.08], [R * 0.13, R * 0.08], [-R * 0.15, R * 0.06]], MAD.cla, R * 0.02); c.restore(); }
      sombra(c, R, 0.5, 0.5);
      bola(c, 0, 0, R * 0.45, radial(c, -R * 0.1, -R * 0.1, R * 0.5, [MAD.luz, MAD.cla, MAD.med]), R * 0.04);
      c.strokeStyle = 'rgba(60,32,12,0.4)'; c.lineWidth = R * 0.02; for (const r of [0.12, 0.25, 0.37]) { c.beginPath(); c.arc(0, 0, R * r, 0, TAU); c.stroke(); }
      c.save(); c.rotate(-0.7); seg(c, 0, 0, R * 0.8, 0, R * 0.08, MAD.esc); poli(c, [[-R * 0.1, -R * 0.2], [R * 0.08, -R * 0.1], [R * 0.08, R * 0.1], [-R * 0.1, R * 0.2]], FER.cla, R * 0.025); c.restore();
    },
  });
  reg('pilhaPedras', {
    n: 'Pilha de pedras', g: 'diaadia', size: 1, tags: 'pedra entulho obra marco',
    draw(c, R, t, s) {
      sombra(c, R, 0.7, 0.6);
      for (let i = 0; i < 8; i++) { const a = i * 2.4, d = i < 6 ? R * 0.38 : R * 0.1; pedrinha(c, Math.cos(a) * d, Math.sin(a) * d, R * (0.2 + hsh(s, i, 1) * 0.1), s + i); }
    },
  });
  reg('cesto', {
    n: 'Cesto de vime', g: 'diaadia', size: 1, tags: 'cesta vime colheita pao pão',
    draw(c, R, t, s) {
      sombra(c, R, 0.55, 0.5);
      bola(c, 0, 0, R * 0.52, '#b8925a', R * 0.04);
      c.strokeStyle = 'rgba(110,80,40,0.6)'; c.lineWidth = R * 0.025; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2); c.lineTo(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5); c.stroke(); }
      for (const r of [0.3, 0.4]) { c.beginPath(); c.arc(0, 0, R * r, 0, TAU); c.stroke(); }
      const tipo = s % 3;
      for (let i = 0; i < 5; i++) { const x = Math.cos(i * 1.3) * R * 0.2, y = Math.sin(i * 1.3) * R * 0.2; if (tipo === 0) bola(c, x, y, R * 0.13, '#c84a3a', R * 0.015); else if (tipo === 1) oval(c, x, y, R * 0.16, R * 0.1, i, '#d8a868', R * 0.015); else bola(c, x, y, R * 0.12, '#f0e8d8', R * 0.015); }
    },
  });
  reg('rodaCarroca', {
    n: 'Roda de carroça', g: 'diaadia', size: 1, tags: 'roda carroca carroça oficina',
    draw(c, R) {
      sombra(c, R, 0.62, 0.62);
      c.strokeStyle = MAD.esc; c.lineWidth = R * 0.14; c.beginPath(); c.arc(0, 0, R * 0.6, 0, TAU); c.stroke();
      c.strokeStyle = FER.med; c.lineWidth = R * 0.05; c.beginPath(); c.arc(0, 0, R * 0.67, 0, TAU); c.stroke();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; seg(c, Math.cos(a) * R * 0.12, Math.sin(a) * R * 0.12, Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, R * 0.06, MAD.cla); }
      bola(c, 0, 0, R * 0.14, MAD.med, R * 0.03); bola(c, 0, 0, R * 0.05, FER.esc);
    },
  });
  reg('vasinhosErvas', {
    n: 'Vasinhos de ervas', g: 'diaadia', size: 1, tags: 'planta vaso tempero horta',
    draw(c, R, t, s) {
      for (const [x, y] of [[-R * 0.35, -R * 0.3], [R * 0.35, -R * 0.25], [0, R * 0.32]]) {
        oval(c, x + R * 0.05, y + R * 0.06, R * 0.26, R * 0.26, 0, 'rgba(0,0,0,0.3)');
        bola(c, x, y, R * 0.25, '#b8683a', R * 0.03); bola(c, x, y, R * 0.19, '#5a3a22');
        folhas(c, x, y, R * 0.2, s + Math.round(x * 7), ['#3f7a34', '#5a9a44', '#7ab85a'], 5);
      }
    },
  });
  reg('fornoBarro', {
    n: 'Forno de barro', g: 'diaadia', size: 2, fogo: true, luz: { bright: 1, dim: 3, c: '#ff9a48' }, tags: 'forno pao pão cozinha fogo',
    draw(c, R, t, s, ang) {
      sombra(c, R, 0.85, 0.85);
      bola(c, 0, -R * 0.05, R * 0.75, radial(c, -R * 0.25, -R * 0.3, R * 0.85, ['#e8b888', '#c88a5a', '#8a5a32']), R * 0.04);
      c.strokeStyle = 'rgba(100,60,30,0.35)'; c.lineWidth = R * 0.02; for (const r of [0.3, 0.55]) { c.beginPath(); c.arc(0, -R * 0.05, R * r, 0, TAU); c.stroke(); }
      bola(c, 0, -R * 0.05, R * 0.12, '#3a2a1e', R * 0.02);
      ret(c, -R * 0.28, R * 0.45, R * 0.56, R * 0.4, R * 0.12, '#1a1210', R * 0.03);
      for (let i = 0; i < 3; i++) brasa(c, -R * 0.15 + i * R * 0.15, R * 0.68, R * 0.06, t, s + i);
      chama(c, 0, R * 0.7, R * 0.2, t, s, ang);
    },
  });
  reg('banquinho', {
    n: 'Banquinho', g: 'diaadia', size: 1, tags: 'assento cadeira banco tamborete',
    draw(c, R) {
      sombra(c, R, 0.4, 0.4);
      for (const a of [0.8, 2.9, 5]) bola(c, Math.cos(a) * R * 0.28, Math.sin(a) * R * 0.28, R * 0.06, MAD.esc);
      bola(c, 0, 0, R * 0.36, radial(c, -R * 0.1, -R * 0.1, R * 0.4, [MAD.luz, MAD.cla, MAD.med]), R * 0.04);
      c.strokeStyle = 'rgba(60,32,12,0.35)'; c.lineWidth = R * 0.02; c.beginPath(); c.arc(0, 0, R * 0.22, 0, TAU); c.stroke();
    },
  });
  reg('cadeiraBalanco', {
    n: 'Cadeira de balanço', g: 'diaadia', size: 1, vivo: true, costas: 'n', tags: 'assento cadeira varanda',
    draw(c, R, t) {
      const b = Math.sin(t * 1.3) * R * 0.04;
      sombra(c, R, 0.55, 0.6);
      c.save(); c.translate(0, b);
      for (const k of [-1, 1]) { c.strokeStyle = MAD.esc; c.lineWidth = R * 0.07; c.beginPath(); c.moveTo(k * R * 0.42, -R * 0.75); c.quadraticCurveTo(k * R * 0.52, 0, k * R * 0.42, R * 0.75); c.stroke(); }
      ret(c, -R * 0.4, -R * 0.15, R * 0.8, R * 0.62, R * 0.08, '#9a5a3a', R * 0.035);
      ret(c, -R * 0.4, -R * 0.6, R * 0.8, R * 0.38, R * 0.06, MAD.cla, R * 0.035);
      for (let i = 0; i < 4; i++) seg(c, -R * 0.28 + i * R * 0.19, -R * 0.58, -R * 0.28 + i * R * 0.19, -R * 0.24, R * 0.03, MAD.med);
      c.restore();
    },
  });
  reg('degrausPedra', {
    n: 'Degraus de pedra', g: 'diaadia', size: 2, fw: 2, fh: 1, legado: { w: 1, h: 0.5 }, tags: 'escada degrau subida',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B);
      for (let i = 0; i < 3; i++) { const y = b - (i + 1) * b * 0.66; ret(c, -R * 0.95, y, R * 1.9, b * 0.66, m * 0.04, grad(c, 0, y, 0, y + b * 0.66, [i === 2 ? PED.luz : PED.cla, PED.med]), m * 0.03); seg(c, -R * 0.95, y + b * 0.66, R * 0.95, y + b * 0.66, m * 0.04, 'rgba(0,0,0,0.3)'); }
    },
  });
  reg('ponteMadeira', {
    n: 'Ponte de madeira', g: 'diaadia', size: 3, fw: 3, fh: 1, legado: { w: 1, h: 0.34 }, tags: 'ponte rio riacho travessia',
    draw(c, R, t, s, ang, tk, B) {
      const [b, m] = mm(R, B);
      c.save(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-R, -b * 0.4, R * 2, b * 1.1); c.restore();
      for (let i = 0; i < 15; i++) { const x = -R + i * R * 2 / 15; ret(c, x + m * 0.01, -b * 0.75, R * 2 / 15 - m * 0.02, b * 1.5, m * 0.02, i % 2 ? MAD.cla : MAD.med, m * 0.02); }
      for (const k of [-1, 1]) { seg(c, -R, k * b * 0.82, R, k * b * 0.82, m * 0.08, MAD.esc); for (let i = 0; i < 4; i++) bola(c, -R * 0.95 + i * R * 0.63, k * b * 0.82, m * 0.08, MAD.med, m * 0.02); }
    },
  });
})();
