/* ---------------------------------------------------------------
   10f8. ESTAÇÕES — a primavera, o verão, o outono e o inverno nos lugares de fora (lote 13, parte 13c)
   Uma escolha da janela "Gerar um lugar…" para a Região livre, o Encontro, a Tribo, as Ruínas e o Porto. O verão é o
   lugar de sempre: o plano e o desenho não mudam. Só os chãos que têm estação mudam — o campo, a floresta, o pântano e
   a montanha nas quatro; a tundra e a terra corrompida, no inverno —; o deserto, a savana, a selva, a neve, a lava, os
   cristais e o mar ficam iguais o ano todo (num chão misto, cada mancha segue o bioma dela).
   · na primavera: o verde mais novo, as flores no chão e as árvores floridas;
   · no outono: as copas amarelas, laranja e vermelhas (os pinheiros ficam verdes) e as folhas caídas no chão;
   · no inverno: a neve fina no chão, nas copas, nas pedras, nos penhascos e nos telhados (só enfeita: não é zona), as
     árvores de folha quase sem folhas — e a água parada e rasa (o lago, a poça, a água do pântano) vira gelo: dá para
     andar nele, e a zona Gelado diz que escorrega. O rio, o mar, a fonte quente, o lodo e a lava não congelam.
   O desenho da estação tem o sorteio dele: o mesmo lugar, em outra estação, fica com as mesmas árvores, pedras e
   caminhos, só com as cores e os enfeites da estação.
   --------------------------------------------------------------- */
const Estacoes = (() => {
  const TAU = Math.PI * 2, MO = Encontro.motor, PS = Paisagem;
  const LISTA = [['primavera', 'Primavera'], ['verao', 'Verão'], ['outono', 'Outono'], ['inverno', 'Inverno']];
  const EM = { primavera: 'na primavera', verao: 'no verão', outono: 'no outono', inverno: 'no inverno' };
  const valida = v => (LISTA.some(e => e[0] === v) ? v : 'verao');
  // as estações de cada chão (pela paleta): as quatro, ou só o inverno
  const DO_CHAO = { campo: 'todas', floresta: 'todas', pantano: 'todas', rocha: 'todas', tundra: 'inverno', corrompida: 'inverno' };
  const tem = (pal, est) => { const v = DO_CHAO[pal]; return est !== 'verao' && (v === 'todas' || (v === 'inverno' && est === 'inverno')); };
  // as copas da estação (a árvore de folha): o verde novo, as três do outono, os galhos de inverno quase sem folha
  Object.assign(PS.PAL, {
    estPrimavera: Object.assign({}, PS.PAL.campo, { copa: ['#3e6e34', '#4e843e', '#60984a'], luz: '#9ccc6e' }),
    estOutonoLaranja: Object.assign({}, PS.PAL.campo, { copa: ['#a8541c', '#c46e26', '#dc8e3a'], luz: '#f0b45a' }),
    estOutonoVermelho: Object.assign({}, PS.PAL.campo, { copa: ['#8a2a1a', '#a83a22', '#c4502c'], luz: '#e07a4a' }),
    estOutonoAmarelo: Object.assign({}, PS.PAL.campo, { copa: ['#9a8420', '#b8a02c', '#d2ba40'], luz: '#ecd66a' }),
    estInverno: Object.assign({}, PS.PAL.campo, { copa: ['#5c6359', '#6a7166', '#788073'], luz: '#a4ab9e' }),
  });
  const OUTONO = ['estOutonoLaranja', 'estOutonoVermelho', 'estOutonoAmarelo'];
  const CORES_FOLHA = ['#c46e26', '#dc8e3a', '#a83a22', '#c4502c', '#b8a02c', '#d2ba40', '#8a5a2a', '#7a4a22'];
  const CORES_FLOR = ['#f2c94c', '#ffffff', '#e85d75', '#9b7bd8', '#f4a6c0', '#ffd27a'];
  // um número de 0 a 1 que só depende do lugar (x, y) e de k: a mesma árvore, a mesma escolha
  const hash = (x, y, k) => { let h = Math.imul(Math.round(x * 97) | 0, 374761393) + Math.imul(Math.round(y * 89) | 0, 668265263) + Math.imul(k | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const folhosa = esp => !esp || esp === 'folhosa';
  const tirar = (arr, f) => { for (let i = arr.length - 1; i >= 0; i--) if (f(arr[i])) arr.splice(i, 1); };
  const palEm = (P, x, y) => { for (const b of P.biomas || []) if (b.pts.some(pts => MO.dentroPoli(pts, x, y))) return b.pal; return P.pal; };

  /* ================= o plano ================= */
  /* O lago de água (o de sempre, a poça) vira gelo: as casas de água viram chão (de andar, que escorrega), a fundura sai,
     a segunda demão também vira gelo, a lama da beira some e a zona Gelado cobre o lago (um círculo no meio e uns
     menores pelas pontas). → quantas casas */
  function congelar(K, a) {
    const { W, H, P } = K, [x0, y0, x1, y1] = PS.caixa(a.pts), cel = [];
    for (let j = Math.max(0, Math.floor(y0)); j <= Math.min(H - 1, Math.floor(y1)); j++) for (let i = Math.max(0, Math.floor(x0)); i <= Math.min(W - 1, Math.floor(x1)); i++) {
      if (!MO.dentroPoli(a.pts, i + 0.5, j + 0.5)) continue;
      cel.push([i + 0.5, j + 0.5]);
      if (K.at(i, j) === 2) K.pos(i, j, 5);
    }
    a.tipo = 'gelo';
    for (const o of P.pintados) if (o.k === 'aguaParada' && o.tipo === 'agua' && o.pts === a.pts) o.tipo = 'gelo';
    tirar(P.relevo, r => r.t === 'agua' && r.k === 'poly' && r.pts === a.pts);
    const [cx, cy] = cel.length ? [cel.reduce((s, q) => s + q[0], 0) / cel.length, cel.reduce((s, q) => s + q[1], 0) / cel.length] : PS.centro(a.pts);
    const rr = Math.sqrt(Math.max(1, cel.length) / Math.PI);
    tirar(P.zonas, z => z.fx === 'lama' && Math.hypot(z.x - cx, z.y - cy) <= rr + (z.r || 1) + 1);
    K.zona('gelado', +cx.toFixed(2), +cy.toFixed(2), { r: +Math.max(1, rr * 0.95).toFixed(2) });
    // (as pontas: as casas mais longe do meio, longe umas das outras)
    const pontas = [];
    for (const q of cel.slice().sort((p, s) => Math.hypot(s[0] - cx, s[1] - cy) - Math.hypot(p[0] - cx, p[1] - cy) || p[0] - s[0] || p[1] - s[1])) {
      if (pontas.length >= 3 || Math.hypot(q[0] - cx, q[1] - cy) < rr * 0.9) break;
      if (pontas.every(p => Math.hypot(p[0] - q[0], p[1] - q[1]) > rr)) pontas.push(q);
    }
    for (const q of pontas) K.zona('gelado', +((q[0] + cx) / 2).toFixed(2), +((q[1] + cy) / 2).toFixed(2), { r: +Math.max(1.2, rr * 0.6).toFixed(2) });
    return cel.length;
  }
  /* O plano na estação (depois de tudo, antes dos marcadores): a estação fica marcada no plano (no verão, nada muda);
     no inverno, a água parada e rasa dos chãos com estação vira gelo. */
  function noPlano(K, est) {
    est = valida(est);
    if (est === 'verao') return;
    const { W, H, P } = K;
    P.estacao = est;
    P.estacaoMuda = [P.pal].concat((P.biomas || []).map(b => b.pal)).some(pal => tem(pal, est));
    if (est !== 'inverno') return;
    let n = 0;
    for (const a of P.aguas) {
      if (a.k !== 'lago' || a.tipo !== 'agua') continue;
      const [cx, cy] = PS.centro(a.pts);
      if (tem(a.pal || palEm(P, cx, cy), 'inverno') && congelar(K, a)) n++;
    }
    // a água rasa do pântano, por todo o mapa: o gelo e a zona cobrindo tudo (a lama congela junto)
    if (P.aguaToda && P.aguaToda.tipo === 'agua' && tem(P.pal, 'inverno')) {
      P.aguaToda = Object.assign({}, P.aguaToda, { tipo: 'gelo' });
      tirar(P.zonas, z => z.fx === 'lama');
      K.zona('gelado', W / 2, H / 2, { r: Math.ceil(Math.hypot(W, H) / 2) + 1 });
      n++;
    }
    if (n) P.gelos = n;
  }
  // o que o resumo diz da estação
  function texto(p) {
    if (!p || !p.estacao || p.estacao === 'verao') return '';
    if (p.estacaoMuda === false) return EM[p.estacao] + ' (este chão não muda com a estação)';
    return EM[p.estacao] + (p.gelos ? ', com a água congelada' : '');
  }

  /* ================= o desenho ================= */
  // uma forma borrada (a sombra de um contorno levado para longe): a máscara de beira macia das manchas
  function borrado(g, polis, c, b) {
    const longe = g.canvas.width + g.canvas.height + 64;
    g.save(); g.shadowColor = '#000'; g.shadowBlur = Math.max(2, c * b); g.shadowOffsetX = longe; g.fillStyle = '#000';
    g.translate(-longe, 0);
    for (const pts of polis) { PS.suave(g, pts, c); g.fill(); }
    g.restore();
  }
  /* O pintor da estação de um plano (p.estacao) em c pixels por quadrado, com o sorteio dele (o resto do desenho fica
     igual ao do verão). → { chao, geloRaso, palDaArvore, naArvore, naPedra, nosPenhascos, nosTelhados } */
  function pintor(p, c) {
    const est = valida(p.estacao), W = p.W, H = p.H, rE = mulberry(((p.seed ^ 0x5eaa50f1) >>> 0) || 7);
    const base = tem(p.pal, est), outras = (p.biomas || []).filter(b => b.pal !== p.pal);
    const fora = outras.filter(b => !tem(b.pal, est)).flatMap(b => b.pts), dentro = outras.filter(b => tem(b.pal, est)).flatMap(b => b.pts);
    const algum = base || dentro.length > 0;
    const vale = (x, y) => tem(palEm(p, x, y), est);
    // o que vai no chão: o tom da estação e os enfeites (as flores, as folhas, a neve fina)
    function noChao(g) {
      const w = W * c, h = H * c;
      g.save();
      if (est === 'primavera') {
        g.globalAlpha = 0.07; g.fillStyle = '#8fd65a'; g.fillRect(0, 0, w, h);
        for (let i = 0, n = Math.round(W * H * 0.22); i < n; i++) {
          const x = rE() * w, y = rE() * h, cor = CORES_FLOR[Math.floor(rE() * CORES_FLOR.length) % CORES_FLOR.length], m = 2 + Math.floor(rE() * 4);
          g.fillStyle = cor;
          for (let k = 0; k < m; k++) { g.globalAlpha = 0.8 + rE() * 0.2; g.beginPath(); g.arc(x + (rE() - 0.5) * c * 0.7, y + (rE() - 0.5) * c * 0.7, c * (0.045 + rE() * 0.04), 0, TAU); g.fill(); }
        }
      } else if (est === 'outono') {
        g.globalAlpha = 0.1; g.fillStyle = '#d08a2a'; g.fillRect(0, 0, w, h);
        const folha = (x, y) => { g.globalAlpha = 0.75 + rE() * 0.25; g.fillStyle = CORES_FOLHA[Math.floor(rE() * CORES_FOLHA.length) % CORES_FOLHA.length]; g.beginPath(); g.ellipse(x, y, c * (0.07 + rE() * 0.05), c * (0.035 + rE() * 0.025), rE() * Math.PI, 0, TAU); g.fill(); };
        for (let i = 0, n = Math.round(W * H * 1.1); i < n; i++) folha(rE() * w, rE() * h);
        // (debaixo das árvores de folha, mais folhas)
        for (const a of p.arvores) if (folhosa(a.esp) && vale(a.x, a.y)) for (let k = 0; k < 12; k++) { const an = rE() * TAU, d = Math.sqrt(rE()) * a.r * 1.5; folha((a.x + Math.cos(an) * d) * c, (a.y + Math.sin(an) * d) * c); }
      } else if (est === 'inverno') {
        // (a neve fina: um véu claro e, por cima, os montinhos de beira macia; o brilho miúdo)
        g.globalAlpha = 0.3; g.fillStyle = '#eef3f8'; g.fillRect(0, 0, w, h);
        g.globalAlpha = 1;
        for (let i = 0, n = Math.round(W * H * 0.4); i < n; i++) {
          const x = rE() * w, y = rE() * h, rr = c * (0.6 + rE() * 1.3), gr = g.createRadialGradient(x, y, 0, x, y, rr), a = 0.18 + rE() * 0.22;
          gr.addColorStop(0, 'rgba(250,252,255,' + a.toFixed(3) + ')'); gr.addColorStop(0.6, 'rgba(246,249,252,' + (a * 0.55).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(246,249,252,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
        }
        g.fillStyle = '#ffffff';
        for (let i = 0, n = Math.round(W * H * 1.2); i < n; i++) { g.globalAlpha = 0.35 + rE() * 0.35; g.beginPath(); g.arc(rE() * w, rE() * h, c * (0.015 + rE() * 0.03), 0, TAU); g.fill(); }
      }
      g.restore();
    }
    return {
      // o chão (antes da água e dos caminhos): só onde o bioma tem a estação, com a beira macia nas manchas
      chao(g) {
        if (!algum) return;
        if (base && !fora.length) { noChao(g); return; }
        const cv = document.createElement('canvas'); cv.width = g.canvas.width; cv.height = g.canvas.height;
        const o = cv.getContext('2d');
        noChao(o);
        o.globalCompositeOperation = base ? 'destination-out' : 'destination-in';
        borrado(o, base ? fora : dentro, c, 1.3);
        g.drawImage(cv, 0, 0);
      },
      // a água rasa do pântano congelada: a camada de gelo por cima, com as placas, as rachaduras e a geada
      geloRaso(g) {
        const w = W * c, h = H * c;
        g.save();
        g.globalAlpha = 0.62; g.fillStyle = '#cfe4ee'; g.fillRect(0, 0, w, h);
        for (let i = 0, n = Math.round(W * H * 0.12); i < n; i++) { g.globalAlpha = 0.16; g.fillStyle = '#8fb8cf'; const rr = c * (0.6 + rE() * 1.5); g.beginPath(); g.ellipse(rE() * w, rE() * h, rr, rr * 0.6, rE() * 3, 0, TAU); g.fill(); }
        for (let i = 0, n = Math.round(W * H * 0.05) + 4; i < n; i++) {
          let x = rE() * W, y = rE() * H, an = rE() * TAU;
          g.globalAlpha = 0.5; g.strokeStyle = '#6d98b4'; g.lineWidth = Math.max(1, c * 0.035); g.beginPath(); g.moveTo(x * c, y * c);
          for (let k = 0; k < 5; k++) { an += (rE() - 0.5) * 1.2; x += Math.cos(an) * (0.4 + rE() * 0.9); y += Math.sin(an) * (0.4 + rE() * 0.9); g.lineTo(x * c, y * c); }
          g.stroke(); g.globalAlpha = 0.45; g.strokeStyle = '#f4fbff'; g.lineWidth = Math.max(0.6, c * 0.015); g.stroke();
        }
        g.globalAlpha = 0.55; g.fillStyle = '#ffffff';
        for (let i = 0, n = Math.round(W * H * 0.6); i < n; i++) { g.beginPath(); g.arc(rE() * w, rE() * h, Math.max(0.6, c * 0.025), 0, TAU); g.fill(); }
        g.restore();
      },
      // a paleta da copa na estação (só a árvore de folha muda de cor; as outras ficam como são)
      palDaArvore(a, pal) {
        if (!folhosa(a.esp) || !tem(pal, est)) return pal;
        if (est === 'primavera') return 'estPrimavera';
        if (est === 'inverno') return 'estInverno';
        const u = hash(a.x, a.y, 3);
        return u < 0.34 ? OUTONO[0] : u < 0.66 ? OUTONO[1] : u < 0.88 ? OUTONO[2] : pal;
      },
      // por cima da árvore: a neve nas copas (no inverno), as flores (na primavera, em parte das árvores de folha)
      naArvore(g, a, pal, temNeve) {
        if (!tem(pal, est)) return;
        const x = a.x * c, y = a.y * c, R = a.r * c, esp = a.esp;
        g.save();
        if (est === 'inverno' && !temNeve) {
          g.fillStyle = '#f4f8fb';
          if (esp === 'pinheiro') for (let i = 0; i < 7; i++) { const an = rE() * TAU, d = R * (0.3 + rE() * 0.6); g.globalAlpha = 0.85; g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, R * 0.1, 0, TAU); g.fill(); }
          else if (folhosa(esp) || esp === 'elfica' || esp === 'oriental') {
            // (a neve assentada no alto das copas: os montinhos claros, mais do lado da luz)
            for (let i = 0; i < 9; i++) { const an = rE() * TAU, d = Math.sqrt(rE()) * R * 0.6, px = x + Math.cos(an) * d - R * 0.12, py = y + Math.sin(an) * d - R * 0.14, rr = R * (0.13 + rE() * 0.15); g.globalAlpha = 0.75 + rE() * 0.2; g.fillStyle = i % 3 ? '#f4f8fb' : '#e2eaf0'; g.beginPath(); g.arc(px, py, rr, 0, TAU); g.fill(); }
          } else if (esp === 'rocha') { g.globalAlpha = 0.85; g.beginPath(); g.ellipse(x - R * 0.12, y - R * 0.2, R * 0.48, R * 0.3, -0.3, 0, TAU); g.fill(); }
        } else if (est === 'primavera' && folhosa(esp) && hash(a.x, a.y, 5) < 0.45) {
          const rosa = hash(a.x, a.y, 6) < 0.5;
          for (let i = 0; i < 13; i++) { const an = rE() * TAU, d = Math.sqrt(rE()) * R * 0.78; g.globalAlpha = 0.9; g.fillStyle = i % 3 === 0 ? '#ffffff' : rosa ? '#f4a6c0' : '#fff3f7'; g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, Math.max(1, R * 0.065), 0, TAU); g.fill(); }
        }
        g.restore();
      },
      // a neve em cima da pedra (no inverno): uma capa clara do lado de cima, dentro do contorno dela
      naPedra(g, r, pts) {
        if (est !== 'inverno' || !pts || !vale(r.x, r.y)) return;
        g.save(); g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px * c, py * c) : g.moveTo(px * c, py * c))); g.closePath(); g.clip();
        g.globalAlpha = 0.85; g.fillStyle = '#f4f8fb'; g.beginPath(); g.ellipse((r.x - r.r * 0.1) * c, (r.y - r.r * 0.38) * c, r.r * 0.78 * c, r.r * 0.5 * c, -0.2, 0, TAU); g.fill();
        g.restore();
      },
      // a neve fina no alto dos penhascos e dos planaltos de pedra
      nosPenhascos(g) {
        if (est !== 'inverno') return;
        for (const m of p.massas || []) {
          const [cx, cy] = PS.centro(m.pts);
          if (!vale(cx, cy)) continue;
          g.save(); PS.suave(g, m.pts, c); g.clip();
          g.globalAlpha = 0.3; g.fillStyle = '#f4f8fb'; g.fillRect(0, 0, W * c, H * c);
          const [x0, y0, x1, y1] = PS.caixa(m.pts);
          for (let i = 0, n = Math.round((x1 - x0) * (y1 - y0) * 0.8); i < n; i++) { const rr = c * (0.2 + rE() * 0.5); g.globalAlpha = 0.18 + rE() * 0.2; g.beginPath(); g.ellipse((x0 + rE() * (x1 - x0)) * c, (y0 + rE() * (y1 - y0)) * c, rr, rr * 0.6, rE() * 3, 0, TAU); g.fill(); }
          g.restore();
        }
      },
      // a neve nos telhados (as construções fechadas)
      nosTelhados(g) {
        if (est !== 'inverno') return;
        for (const k of p.predios || []) {
          if (k.aberto || !vale(k.x + k.w / 2, k.y + k.h / 2)) continue;
          const cont = Estilos.contorno(k);
          g.save(); g.beginPath(); cont.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); g.closePath(); g.clip();
          g.globalAlpha = 0.42; g.fillStyle = '#f4f8fb'; g.fillRect(k.x * c - c, k.y * c - c, (k.w + 2) * c, (k.h + 2) * c);
          for (let i = 0, n = Math.round(k.w * k.h * 1.2); i < n; i++) { g.globalAlpha = 0.3 + rE() * 0.3; g.beginPath(); g.arc((k.x + rE() * k.w) * c, (k.y + rE() * k.h) * c, c * (0.08 + rE() * 0.14), 0, TAU); g.fill(); }
          g.restore();
        }
      },
    };
  }
  return { LISTA, EM, valida, tem, DO_CHAO, noPlano, congelar, texto, pintor };
})();
