/* ---------------------------------------------------------------
   6b8. OS MARCADORES (lote 129) — sete objetos do grupo Missões: o brasão com "!" (o Marcador de missão) e os medalhões
   com o escudo, a caveira, a espada, o veneno (as bolinhas), o pergaminho e a estrela. Cada um nasce oculto (só o mestre
   vê) até ele revelar, e serve de dois jeitos (t.mq):
     · ligado a uma missão da aba Missões (ou a um objetivo opcional dela): { id, oid?, t, tp, ot?, e, op? } — a cópia
       que MissaoCenas.sincronizar acerta. A cor é a do tipo: principal, dourado; secundária, azul-prata; o opcional,
       claro com a borda tracejada na cor da missão; cumprida, apagadinho com ✓; falhou, com ✕; a missão ainda oculta (nos
       rascunhos), "?" no "!"; a apagada, cinza;
     · só com um nome: { n } — a cor própria do símbolo.
   O nome (ou o da missão, ou o do objetivo) vai escrito em cima do marcador; quem joga vê quando ele é revelado (a missão
   ainda oculta vai sem nome).
   --------------------------------------------------------------- */
(() => {
  const TAU = Math.PI * 2;
  Props.grupo('missao', 'Missões');
  // as cores do tipo da missão (e do marcador sem nada)
  const TIPO = {
    principal: { a: '#f8d978', b: '#d49a24', c: '#8a5a0c', borda: '#4a2e04', tinta: '#3a2604', op: '#c48a12', opTinta: '#8a5a0c' },
    secundaria: { a: '#e6eef7', b: '#9fb6d2', c: '#5a7596', borda: '#22324a', tinta: '#1d2b3c', op: '#4f6f96', opTinta: '#2c4566' },
    nenhuma: { a: '#d6d3cc', b: '#9c978c', c: '#6a665e', borda: '#34322d', tinta: '#2a2824' },
  };
  // os símbolos: o nome, a cor própria (o medalhão e o desenho) e o desenho
  const SIMB = {
    missao: { n: 'Marcador de missão', cor: { a: '#f6a35e', b: '#d4692a', c: '#8a3a10', borda: '#3a1604', tinta: '#2a1004' } },
    escudo: { n: 'Escudo', cor: { a: '#c8584a', b: '#8a2a22', c: '#5a1812', borda: '#2a0a06', tinta: '#e6eaf0', furo: '#7a8494' } },
    caveira: { n: 'Caveira', cor: { a: '#5a5460', b: '#2c2830', c: '#1a171d', borda: '#0d0b0f', tinta: '#ece4cf', furo: '#1a171d' } },
    espada: { n: 'Espada', cor: { a: '#d9dee6', b: '#9aa3b0', c: '#5e6672', borda: '#2a2f38', tinta: '#2a2f38', furo: '#8a2a2a' } },
    veneno: { n: 'Veneno', cor: { a: '#6a5a7c', b: '#3a2d48', c: '#241a2e', borda: '#120c18', tinta: '#7ee35a', furo: '#d9ffcf' } },
    pergaminho: { n: 'Pergaminho', cor: { a: '#c99a5e', b: '#8a5f30', c: '#5a3c1a', borda: '#2e1e0a', tinta: '#f6ead0', furo: '#6a4a24' } },
    estrela: { n: 'Estrela', cor: { a: '#5a7ac0', b: '#2c4680', c: '#1a2a52', borda: '#0c1530', tinta: '#ffd75a', furo: '#b8860b' } },
  };
  // o brasão (o "!"), centrado, com meia largura r
  function brasao(c, r) {
    c.beginPath();
    c.moveTo(-r, -r * 0.95); c.lineTo(r, -r * 0.95); c.lineTo(r, -r * 0.1);
    c.quadraticCurveTo(r * 0.95, r * 0.7, 0, r * 1.08);
    c.quadraticCurveTo(-r * 0.95, r * 0.7, -r, -r * 0.1);
    c.closePath();
  }
  function exclamacao(c, r, cor, interroga) {
    c.fillStyle = cor;
    if (interroga) { c.font = `800 ${r * 1.25}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, r * 0.05); return; }
    c.beginPath(); c.moveTo(-r * 0.17, -r * 0.62); c.lineTo(r * 0.17, -r * 0.62); c.lineTo(r * 0.09, r * 0.22); c.lineTo(-r * 0.09, r * 0.22); c.closePath(); c.fill();
    c.beginPath(); c.arc(0, r * 0.5, r * 0.13, 0, TAU); c.fill();
  }
  /* Os desenhos, dentro do medalhão de raio r: cor (o desenho) e furo (os detalhes: os olhos da caveira, o cabo da
     espada, as linhas do pergaminho). */
  const GLIFO = {
    escudo(c, r, cor, furo) {
      const s = r * 0.62; brasao(c, s); c.fillStyle = cor; c.fill();
      c.lineWidth = r * 0.07; c.strokeStyle = furo; c.stroke();
      c.beginPath(); c.moveTo(0, -s * 0.8); c.lineTo(0, s * 0.85); c.moveTo(-s * 0.8, -s * 0.2); c.lineTo(s * 0.8, -s * 0.2); c.stroke();
    },
    caveira(c, r, cor, furo) {
      c.fillStyle = cor;
      c.beginPath(); c.arc(0, -r * 0.12, r * 0.5, Math.PI * 0.9, Math.PI * 2.1); c.lineTo(r * 0.32, r * 0.42); c.lineTo(-r * 0.32, r * 0.42); c.closePath(); c.fill();
      c.fillRect(-r * 0.24, r * 0.38, r * 0.48, r * 0.16);
      c.fillStyle = furo;
      for (const x of [-r * 0.2, r * 0.2]) { c.beginPath(); c.ellipse(x, -r * 0.08, r * 0.13, r * 0.15, 0, 0, TAU); c.fill(); }
      c.beginPath(); c.moveTo(0, r * 0.12); c.lineTo(-r * 0.07, r * 0.26); c.lineTo(r * 0.07, r * 0.26); c.closePath(); c.fill();
      c.lineWidth = r * 0.04; c.strokeStyle = furo;
      for (const x of [-r * 0.08, r * 0.08]) { c.beginPath(); c.moveTo(x, r * 0.38); c.lineTo(x, r * 0.54); c.stroke(); }
    },
    espada(c, r, cor, furo) {
      c.save(); c.rotate(Math.PI / 4);
      c.fillStyle = cor;
      c.beginPath(); c.moveTo(0, -r * 0.78); c.lineTo(r * 0.11, -r * 0.6); c.lineTo(r * 0.11, r * 0.22); c.lineTo(-r * 0.11, r * 0.22); c.lineTo(-r * 0.11, -r * 0.6); c.closePath(); c.fill();
      c.fillRect(-r * 0.36, r * 0.22, r * 0.72, r * 0.11);
      c.fillStyle = furo; c.fillRect(-r * 0.07, r * 0.33, r * 0.14, r * 0.32);
      c.fillStyle = cor; c.beginPath(); c.arc(0, r * 0.72, r * 0.1, 0, TAU); c.fill();
      c.restore();
    },
    veneno(c, r, cor, furo) {
      for (const [x, y, k] of [[-r * 0.18, r * 0.18, 0.3], [r * 0.26, -r * 0.08, 0.22], [-r * 0.12, -r * 0.38, 0.15], [r * 0.2, r * 0.42, 0.12]]) {
        c.fillStyle = cor; c.beginPath(); c.arc(x, y, r * k, 0, TAU); c.fill();
        c.fillStyle = furo; c.beginPath(); c.arc(x - r * k * 0.35, y - r * k * 0.35, r * k * 0.28, 0, TAU); c.fill();
      }
    },
    pergaminho(c, r, cor, furo) {
      c.fillStyle = cor; c.fillRect(-r * 0.36, -r * 0.5, r * 0.72, r * 1.0);
      c.fillStyle = furo;
      for (const y of [-r * 0.5, r * 0.5]) { c.beginPath(); c.ellipse(0, y, r * 0.48, r * 0.12, 0, 0, TAU); c.fill(); }
      c.strokeStyle = furo; c.lineWidth = r * 0.05;
      for (const y of [-r * 0.24, -r * 0.06, r * 0.12, r * 0.28]) { c.beginPath(); c.moveTo(-r * 0.24, y); c.lineTo(r * 0.24, y); c.stroke(); }
    },
    estrela(c, r, cor, furo) {
      c.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.27 : r * 0.66; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fillStyle = cor; c.fill(); c.lineWidth = r * 0.05; c.strokeStyle = furo; c.stroke();
    },
  };
  function selo(c, R, ok) {
    const x = R * 0.55, y = R * 0.55, r = R * 0.3;
    c.globalAlpha = 1;
    c.fillStyle = ok ? '#2f8a4a' : '#b8322a'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = r * 0.28; c.lineCap = 'round'; c.beginPath();
    if (ok) { c.moveTo(x - r * 0.45, y); c.lineTo(x - r * 0.1, y + r * 0.38); c.lineTo(x + r * 0.5, y - r * 0.38); }
    else { c.moveTo(x - r * 0.38, y - r * 0.38); c.lineTo(x + r * 0.38, y + r * 0.38); c.moveTo(x + r * 0.38, y - r * 0.38); c.lineTo(x - r * 0.38, y + r * 0.38); }
    c.stroke();
  }
  // o nome escrito em cima do marcador
  function rotulo(c, R, txt) {
    if (!txt) return;
    const t = txt.length > 30 ? txt.slice(0, 29) + '…' : txt, fs = Math.max(9, R * 0.42);
    c.save(); c.globalAlpha = 1;
    c.font = `700 ${fs}px "Atkinson Hyperlegible Next", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.lineJoin = 'round'; c.lineWidth = fs * 0.32; c.strokeStyle = 'rgba(12,10,8,0.88)'; c.strokeText(t, 0, -R * 0.92);
    c.fillStyle = '#fbf6ea'; c.fillText(t, 0, -R * 0.92);
    c.restore();
  }
  /* Desenha o marcador do símbolo k. mq: o que ele mostra; demo: a prévia do catálogo (o "!" dourado; os outros, na cor
     deles). */
  function desenhar(c, R, k, mq, demo) {
    const S = SIMB[k] || SIMB.missao, ehMis = k === 'missao';
    const ligado = !!(mq && mq.id), sumiu = ligado && mq.e === 'sumiu';
    const tipo = ligado && !sumiu ? (mq.tp === 'principal' ? 'principal' : 'secundaria') : null;
    const op = !!(ligado && mq.oid && !sumiu), e = ligado ? mq.e : null, fim = e === 'feita' || e === 'falhou';
    // a cor: a do tipo (ligado), cinza (apagada; o "!" sem nada) ou a do símbolo
    const P = tipo ? TIPO[tipo] : sumiu || (ehMis && !demo && !(mq && mq.n)) ? TIPO.nenhuma : demo && ehMis ? TIPO.principal : S.cor;
    const r = R * (op ? 0.58 : 0.74);
    c.save();
    if (fim) c.globalAlpha = 0.55;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(R * 0.04, R * 0.82, r * 0.8, r * 0.18, 0, 0, TAU); c.fill();
    c.translate(0, -R * 0.04);
    // o corpo: o brasão do "!" ou o medalhão dos outros
    const corpo = s => { if (ehMis) brasao(c, s); else { c.beginPath(); c.arc(0, 0, s, 0, TAU); } };
    corpo(r);
    if (op) { c.fillStyle = '#f6efdc'; c.fill(); }
    else { const g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, P.a); g.addColorStop(0.55, P.b); g.addColorStop(1, P.c); c.fillStyle = g; c.fill(); }
    c.lineJoin = 'round';
    if (op) { c.setLineDash([r * 0.32, r * 0.18]); c.strokeStyle = TIPO[tipo].op; c.lineWidth = r * 0.2; c.stroke(); c.setLineDash([]); }
    else { c.strokeStyle = P.borda; c.lineWidth = r * 0.12; c.stroke(); corpo(r * 0.8); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = r * 0.06; c.stroke(); }
    // o desenho: ligado a uma missão, de uma cor só (a tinta do tipo); solto, nas cores do símbolo
    const tinta = op ? TIPO[tipo].opTinta : P.tinta, furo = tipo || sumiu ? (op ? '#f6efdc' : P.b) : (P.furo || P.c);
    if (ehMis) exclamacao(c, r, tinta, demo ? false : !mq ? true : ligado ? e === 'oculta' || sumiu : !mq.n);
    else GLIFO[k](c, r, tinta, furo);
    c.restore();
    if (e === 'feita') selo(c, R, true);
    else if (e === 'falhou') selo(c, R, false);
    // o nome em cima: o da missão (ou do objetivo) ou o que o mestre deu
    if (!demo && mq) rotulo(c, R, ligado ? (sumiu ? '' : mq.oid ? mq.ot || '' : mq.t || '') : mq.n || '');
  }
  for (const k of Object.keys(SIMB)) Props.registrar(k === 'missao' ? 'missao' : 'mq' + k[0].toUpperCase() + k.slice(1), {
    n: k === 'missao' ? SIMB[k].n : 'Marcador: ' + SIMB[k].n.toLowerCase(), g: 'missao', size: 1, marca: true, simb: k,
    draw(c, R, tm, s, ang, tk) { c.save(); c.rotate(-ang); desenhar(c, R, k, tk ? tk.mq : null, !tk); c.restore(); },
  });
})();
