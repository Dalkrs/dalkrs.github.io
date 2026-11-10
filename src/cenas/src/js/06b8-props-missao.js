/* ---------------------------------------------------------------
   6b8. O MARCADOR DE MISSÃO (lote 129) — o brasão com "!", ligado a uma missão da aba Missões (t.mq). Nasce oculto (só o
   mestre vê) até ele revelar. O desenho segue o que a missão é:
     · principal: dourado; secundária: azul-prata; ainda sem missão (ou a missão foi apagada): cinza, com "?";
     · o objetivo opcional de uma missão: menor, claro, com a borda tracejada na cor da missão de que ele faz parte;
     · cumprida: apagadinho, com o ✓ verde; falhou: apagadinho, com o ✕ vermelho; a missão ainda oculta (nos rascunhos
       do mestre): o "?" no lugar do "!".
   t.mq = { id, oid?, t, tp, ot?, e, op? } — a cópia do que a missão é agora (MissaoCenas.sincronizar acerta); é o que
   os jogadores recebem na projeção (sem o título, enquanto a missão está oculta).
   --------------------------------------------------------------- */
(() => {
  const TAU = Math.PI * 2;
  Props.grupo('missao', 'Missões');
  const COR = {
    principal: { a: '#f8d978', b: '#d49a24', c: '#8a5a0c', borda: '#4a2e04', tinta: '#3a2604' },
    secundaria: { a: '#e6eef7', b: '#9fb6d2', c: '#5a7596', borda: '#22324a', tinta: '#1d2b3c' },
    nenhuma: { a: '#d6d3cc', b: '#9c978c', c: '#6a665e', borda: '#34322d', tinta: '#2a2824' },
  };
  // o brasão (escudo de ponta), centrado, com meia largura r
  function brasao(c, r) {
    c.beginPath();
    c.moveTo(-r, -r * 0.95);
    c.lineTo(r, -r * 0.95);
    c.lineTo(r, -r * 0.1);
    c.quadraticCurveTo(r * 0.95, r * 0.7, 0, r * 1.08);
    c.quadraticCurveTo(-r * 0.95, r * 0.7, -r, -r * 0.1);
    c.closePath();
  }
  function exclamacao(c, r, cor, interroga) {
    c.fillStyle = cor;
    if (interroga) {
      c.font = `800 ${r * 1.25}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('?', 0, r * 0.05);
      return;
    }
    c.beginPath(); c.moveTo(-r * 0.17, -r * 0.62); c.lineTo(r * 0.17, -r * 0.62); c.lineTo(r * 0.09, r * 0.22); c.lineTo(-r * 0.09, r * 0.22); c.closePath(); c.fill();
    c.beginPath(); c.arc(0, r * 0.5, r * 0.13, 0, TAU); c.fill();
  }
  function selo(c, R, ok) {
    const x = R * 0.55, y = R * 0.55, r = R * 0.3;
    c.globalAlpha = 1;
    c.fillStyle = ok ? '#2f8a4a' : '#b8322a'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = r * 0.28; c.lineCap = 'round'; c.beginPath();
    if (ok) { c.moveTo(x - r * 0.45, y); c.lineTo(x - r * 0.1, y + r * 0.38); c.lineTo(x + r * 0.5, y - r * 0.38); }
    else { c.moveTo(x - r * 0.38, y - r * 0.38); c.lineTo(x + r * 0.38, y + r * 0.38); c.moveTo(x + r * 0.38, y - r * 0.38); c.lineTo(x - r * 0.38, y + r * 0.38); }
    c.stroke();
  }
  /* Desenha o marcador. mq: o que ele mostra; demo: a prévia do catálogo (a principal). */
  function desenhar(c, R, mq, demo) {
    const k = mq && mq.id && mq.e !== 'sumiu' ? (mq.tp === 'principal' ? 'principal' : 'secundaria') : demo ? 'principal' : 'nenhuma';
    const p = COR[k], op = !!(mq && mq.oid), e = mq && mq.e, fim = e === 'feita' || e === 'falhou';
    const r = R * (op ? 0.58 : 0.74);
    c.save();
    if (fim) c.globalAlpha = 0.55;
    // a sombra
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(R * 0.04, R * 0.82, r * 0.8, r * 0.18, 0, 0, TAU); c.fill();
    c.translate(0, -R * 0.04);
    brasao(c, r);
    if (op) { c.fillStyle = '#f6efdc'; c.fill(); }
    else { const g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, p.a); g.addColorStop(0.55, p.b); g.addColorStop(1, p.c); c.fillStyle = g; c.fill(); }
    c.lineJoin = 'round';
    if (op) { c.setLineDash([r * 0.32, r * 0.18]); c.strokeStyle = k === 'principal' ? '#c48a12' : k === 'secundaria' ? '#4f6f96' : p.c; c.lineWidth = r * 0.2; c.stroke(); c.setLineDash([]); }
    else { c.strokeStyle = p.borda; c.lineWidth = r * 0.12; c.stroke(); brasao(c, r * 0.8); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = r * 0.06; c.stroke(); }
    exclamacao(c, r, op ? (k === 'principal' ? '#8a5a0c' : k === 'secundaria' ? '#2c4566' : p.tinta) : p.tinta, !mq ? !demo : !mq.id || e === 'oculta' || e === 'sumiu');
    c.restore();
    if (e === 'feita') selo(c, R, true);
    else if (e === 'falhou') selo(c, R, false);
  }
  Props.registrar('missao', {
    n: 'Marcador de missão', g: 'missao', size: 1, marca: true,
    draw(c, R, tm, s, ang, tk) { c.save(); c.rotate(-ang); desenhar(c, R, tk ? tk.mq : null, !tk); c.restore(); },
  });
})();
