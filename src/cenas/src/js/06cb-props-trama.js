/* ---------------------------------------------------------------
   6cb. A HISTÓRIA DA MISSÃO (lote 152) — os objetos dos passos: a chave (de ferro, caída no chão ou em cima de um móvel)
   e o diário (o caderno aberto, com a pena: a pista escrita, a combinação, a senha). A alavanca e o baú já existiam.
   O gerador (Trama) põe estes objetos escondidos dos jogadores, com o nome do passo e a nota do que eles abrem.
   --------------------------------------------------------------- */
(() => {
  const { linha, sombra, FER } = Props.kit;
  const TAU = Math.PI * 2;
  Props.grupo('trama', 'A história da missão');
  // a chave: a argola, a haste e os dentes (de ferro escuro, com o brilho)
  Props.registrar('chave', {
    n: 'Chave', g: 'trama', size: 1,
    draw(c, R) {
      sombra(c, R, 0.45, 0.3);
      c.save(); c.rotate(-0.5);
      c.lineCap = 'round';
      c.strokeStyle = '#2a2016'; c.lineWidth = R * 0.2;
      c.beginPath(); c.arc(-R * 0.42, 0, R * 0.22, 0, TAU); c.moveTo(-R * 0.2, 0); c.lineTo(R * 0.6, 0); c.moveTo(R * 0.42, 0); c.lineTo(R * 0.42, R * 0.2); c.moveTo(R * 0.58, 0); c.lineTo(R * 0.58, R * 0.24); c.stroke();
      c.strokeStyle = '#c9a24a'; c.lineWidth = R * 0.1;
      c.stroke();
      c.strokeStyle = 'rgba(255,240,190,0.7)'; c.lineWidth = R * 0.035;
      c.beginPath(); c.arc(-R * 0.42, 0, R * 0.22, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
      c.restore();
    },
  });
  // o diário: o caderno aberto (as duas páginas com as linhas), a capa de couro e a pena
  Props.registrar('diario', {
    n: 'Diário (a pista escrita)', g: 'trama', size: 1,
    draw(c, R) {
      sombra(c, R, 0.62, 0.48);
      c.fillStyle = '#5a2e1c'; c.beginPath(); c.roundRect(-R * 0.66, -R * 0.48, R * 1.32, R * 0.96, R * 0.08); c.fill(); linha(c, R * 0.05);
      for (const s of [-1, 1]) {
        c.fillStyle = '#efe2c2'; c.beginPath(); c.roundRect(s < 0 ? -R * 0.6 : R * 0.02, -R * 0.42, R * 0.58, R * 0.84, R * 0.04); c.fill();
        c.strokeStyle = 'rgba(90,60,30,0.55)'; c.lineWidth = R * 0.03;
        for (let i = 0; i < 5; i++) { const y = -R * 0.28 + i * R * 0.14, x0 = s < 0 ? -R * 0.52 : R * 0.1; c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + R * (i === 4 ? 0.26 : 0.42), y); c.stroke(); }
      }
      c.strokeStyle = '#3a2010'; c.lineWidth = R * 0.04; c.beginPath(); c.moveTo(0, -R * 0.44); c.lineTo(0, R * 0.44); c.stroke();
      // a pena
      c.strokeStyle = '#f4f0e6'; c.lineWidth = R * 0.09; c.lineCap = 'round'; c.beginPath(); c.moveTo(R * 0.2, R * 0.5); c.quadraticCurveTo(R * 0.55, R * 0.1, R * 0.8, -R * 0.42); c.stroke();
      c.strokeStyle = FER.esc; c.lineWidth = R * 0.03; c.beginPath(); c.moveTo(R * 0.2, R * 0.5); c.lineTo(R * 0.28, R * 0.38); c.stroke();
    },
  });
})();
