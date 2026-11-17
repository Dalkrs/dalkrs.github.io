/* ---------------------------------------------------------------
   6ci. AS VELAS DE COR E O POLE DANCE (lote 181).
   · Em Luzes: a vela de cor (uma vela grossa no castiçal), o grupo de velas de cor (velas de alturas diferentes) e o
     candelabro de cor. A cor da chama e a da luz mudam no painel do objeto (seção Luz: "Cor da chama"; a luz vai junto,
     a não ser que se ligue "A luz numa cor diferente da chama"). A cor da cera e a do metal, na seção Cores.
     Valem para todo objeto com fogo: a cor da chama é t.chamaCor, que o desenho de qualquer chama usa (06b, chama()).
   · Na Casa noturna: a barra de pole dance (a barra de metal na base redonda) e o palco com a barra (o palco redondo, a
     barra no meio e as luzinhas em volta).
   --------------------------------------------------------------- */
(() => {
  const { caixa, linha, grad, radial, hsh, MAD, FER, chama, sombra } = Props.kit;
  const { bola, oval, ret, seg, poli, brilho } = Props.kitT;
  const reg = (id, def) => Props.registrar(id, def);
  const CERAS = ['#efe6d0', '#b8283a', '#2a2a2e', '#6a3a9a', '#2a6a4a', '#d6a64a'];
  // a cera e o metal: os do painel (Cores) ou, sem escolha, pela semente
  const coresVela = (tk, s) => (tk && Array.isArray(tk.cores) && tk.cores.length === 2 ? tk.cores : [CERAS[s % CERAS.length], '#c99a3a']);
  const escurece = (hx, f) => { const n = parseInt(String(hx).slice(1), 16); if (isNaN(n)) return hx; const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => Math.round(v * (1 - f))); return `rgb(${c[0]},${c[1]},${c[2]})`; };
  // o brilho da chama no chão, na cor da chama (ou no laranja de sempre)
  const halo = (c, x, y, r) => { if (Props.kit.apagado()) return; brilho(c, x, y, r, Props.kit.chamaCor() || '#ffb050', 0.3); };
  // uma vela vista de cima: o círculo da cera, a borda derretida, o pavio e a chama
  function vela(c, x, y, r, cera, t, k, ang) {
    bola(c, x + r * 0.25, y + r * 0.3, r * 1.05, 'rgba(0,0,0,0.25)');
    bola(c, x, y, r, radial(c, x - r * 0.3, y - r * 0.3, r * 1.2, ['#ffffff', cera, escurece(cera, 0.35)]), r * 0.12);
    for (let i = 0; i < 3; i++) { const a = hsh(k, i, 7) * TAU; oval(c, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.22, r * 0.14, a, cera); }
    bola(c, x, y, r * 0.12, '#2a2018');
    chama(c, x, y, r * 1.4, t, k, ang);
  }

  reg('velaCor', {
    n: 'Vela de cor', g: 'luz', size: 1, fogo: true, cores: true, luz: { bright: 1, dim: 3, c: '#ffcf80' }, tags: 'vela chama cor luz castical castiçal',
    draw(c, R, t, s, ang, tk) {
      const [cera, metal] = coresVela(tk, s);
      sombra(c, R, 0.45, 0.45);
      halo(c, 0, 0, R * 0.9);
      bola(c, 0, 0, R * 0.42, radial(c, -R * 0.12, -R * 0.12, R * 0.45, ['#fff2c0', metal, escurece(metal, 0.45)]), R * 0.035);
      seg(c, R * 0.35, R * 0.1, R * 0.62, R * 0.32, R * 0.07, metal);
      vela(c, 0, 0, R * 0.22, cera, t, s, ang);
    },
  });
  reg('velasCor', {
    n: 'Grupo de velas de cor', g: 'luz', size: 1, fogo: true, cores: true, luz: { bright: 1.5, dim: 3.5, c: '#ffcf80' }, tags: 'velas chama cor altar luz',
    draw(c, R, t, s, ang, tk) {
      const [cera] = coresVela(tk, s);
      halo(c, 0, 0, R * 1.0);
      const pos = [[-R * 0.35, -R * 0.2, 0.2], [R * 0.3, -R * 0.3, 0.17], [R * 0.05, R * 0.25, 0.22], [-R * 0.4, R * 0.4, 0.14], [R * 0.45, R * 0.3, 0.13], [-R * 0.02, -R * 0.55, 0.12]];
      for (let i = 0; i < pos.length; i++) { const [x, y, r] = pos[i]; vela(c, x, y, R * r, i % 2 ? cera : escurece(cera, 0.12), t, s + i, ang); }
    },
  });
  reg('candelabroCor', {
    n: 'Candelabro de cor', g: 'luz', size: 1, fogo: true, cores: true, luz: { bright: 2, dim: 4, c: '#ffcf80' }, tags: 'candelabro velas chama cor luz',
    draw(c, R, t, s, ang, tk) {
      const [cera, metal] = coresVela(tk, s);
      sombra(c, R, 0.6, 0.6);
      halo(c, 0, 0, R * 1.0);
      c.strokeStyle = metal; c.lineWidth = R * 0.06;
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Math.cos(a + 0.4) * R * 0.3, Math.sin(a + 0.4) * R * 0.3, Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6); c.stroke(); }
      bola(c, 0, 0, R * 0.17, radial(c, -R * 0.05, -R * 0.05, R * 0.2, ['#fff2c0', metal, escurece(metal, 0.45)]), R * 0.025);
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5, x = Math.cos(a) * R * 0.6, y = Math.sin(a) * R * 0.6; bola(c, x, y, R * 0.13, metal, R * 0.02); vela(c, x, y, R * 0.09, cera, t, s + i, ang); }
      vela(c, 0, 0, R * 0.1, cera, t, s + 9, ang);
    },
  });

  /* ---- o pole dance ---- */
  const CROMO = ['#ffffff', '#d8dce4', '#8a909c', '#4a505a'];
  function barra(c, x, y, r) {
    bola(c, x + r * 0.6, y + r * 0.7, r * 1.1, 'rgba(0,0,0,0.35)');
    bola(c, x, y, r, radial(c, x - r * 0.35, y - r * 0.35, r * 1.2, CROMO), r * 0.12);
    bola(c, x - r * 0.3, y - r * 0.3, r * 0.25, 'rgba(255,255,255,0.9)');
  }
  reg('poleBarra', {
    n: 'Barra de pole dance', g: 'noturna', size: 1, tags: 'pole dance barra danca dança palco show',
    draw(c, R) {
      sombra(c, R, 0.62, 0.62);
      bola(c, 0, 0, R * 0.58, radial(c, -R * 0.15, -R * 0.15, R * 0.6, ['#5a5e68', '#2a2e36', '#14161c']), R * 0.04);
      c.strokeStyle = 'rgba(220,225,235,0.5)'; c.lineWidth = R * 0.025; c.beginPath(); c.arc(0, 0, R * 0.45, 0, TAU); c.stroke();
      for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.6; bola(c, Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, R * 0.035, '#8a909c'); }
      barra(c, 0, 0, R * 0.13);
    },
  });
  reg('palcoPole', {
    n: 'Palco com a barra', g: 'noturna', size: 2, vivo: true, calma: true, luz: { bright: 1, dim: 3, c: '#ff6ab8' }, tags: 'pole dance palco barra danca dança show luzes',
    draw(c, R, t, s, ang, tk) {
      sombra(c, R, 0.95, 0.95);
      // a cor das luzinhas: a "Cor da luz" do painel (a luz que o palco joga no mapa)
      const lc = tk && tk.light && /^#[0-9a-f]{6}$/i.test(tk.light.c || '') ? tk.light.c : '', cor = lc || ['#ff6ab8', '#a87aff', '#ff4a4a'][s % 3];
      bola(c, 0, 0, R * 0.92, radial(c, -R * 0.2, -R * 0.25, R, ['#4a4a56', '#24242e', '#121218']), R * 0.04);
      if (!Props.kit.apagado()) brilho(c, 0, 0, R * 0.8, cor.length === 7 ? cor : '#ff6ab8', 0.28 + 0.08 * Math.sin(t * 1.5));
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = R * 0.015; for (const r of [0.35, 0.6]) { c.beginPath(); c.arc(0, 0, R * r, 0, TAU); c.stroke(); }
      c.strokeStyle = '#c9a24a'; c.lineWidth = R * 0.04; c.beginPath(); c.arc(0, 0, R * 0.86, 0, TAU); c.stroke();
      // as luzinhas em volta: acendem em roda
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU, x = Math.cos(a) * R * 0.86, y = Math.sin(a) * R * 0.86, on = Props.kit.apagado() ? 0 : 0.5 + 0.5 * Math.sin(t * 3 - i * 0.8);
        bola(c, x, y, R * 0.04, '#3a3a40');
        if (on > 0.05) { c.save(); c.globalAlpha = on; bola(c, x, y, R * 0.045, '#fff4d0'); c.restore(); brilho(c, x, y, R * 0.12, cor.length === 7 ? cor : '#ff6ab8', on * 0.5); }
      }
      barra(c, 0, 0, R * 0.08);
    },
  });
})();
