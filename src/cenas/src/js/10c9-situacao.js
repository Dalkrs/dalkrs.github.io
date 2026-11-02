/* ---------------------------------------------------------------
   10c9. A SITUAÇÃO DOS POVOADOS (lote 61) — o que acontece no vilarejo e na cidade, e quanto há pelo chão.
   Uma conta pura, com o sorteio dela (o resto do lugar não muda): depois que o gerador arruma as ruas e os prédios,
   aplicar() põe por cima a situação escolhida —
   · dia de feira: as barracas, as carroças, os caixotes, as frutas e os sacos pela praça e pelas ruas; as bandeirinhas;
   · festa: a fogueira na praça, as mesas compridas, o palco, os barris e as bandeirinhas cruzando as ruas;
   · atacada: as casas queimadas (o chão de cinza, os buracos nas paredes, o fogo que ainda arde em algumas), as
     barricadas nas ruas, a carroça virada, o entulho e a fumaça;
   · abandonada: todas as casas em ruína (as portas arrombadas, os buracos), o mato tomando as ruas, os tocos, os
     arbustos, o entulho e nenhuma luz acesa —
   e os detalhes pelo chão (pouco, normal ou muito): no "muito", as carroças nas ruas, os barris e os caixotes nas
   portas, os varais nos fundos, a lenha, o feno, as cercas e um poço a mais; no "pouco", menos enfeites. O "normal"
   com a situação normal não faz nada (o lugar sai igual a antes).
   O gerador passa a vista dele (V): { W, H, seed, casas: [{ x, y, w, h, porta, tipo }], ruas: [{ pts, hw }], praca,
   livre(i, j) (a casa está livre de tudo?), naRua(i, j), dentro(i, j) }.
   --------------------------------------------------------------- */
const Situacao = (() => {
  const SITS = [['normal', 'Normal'], ['feira', 'Dia de feira'], ['festa', 'Festa'], ['atacada', 'Atacada'], ['abandonada', 'Abandonada']];
  const DETALHES = [['pouco', 'Pouco'], ['normal', 'Normal'], ['muito', 'Muito']];
  const NOTA = {
    normal: '',
    feira: 'Dia de feira: barracas, carroças e mercadoria pela praça e pelas ruas, com as bandeirinhas.',
    festa: 'Festa: a fogueira na praça, as mesas compridas, o palco e as bandeirinhas cruzando as ruas.',
    atacada: 'Atacada: casas queimadas (com buracos nas paredes e fogo em algumas), barricadas nas ruas, entulho e fumaça.',
    abandonada: 'Abandonada: as casas em ruína, as portas arrombadas, o mato nas ruas e nenhuma luz acesa.',
  };
  const valida = s => (SITS.some(x => x[0] === s) ? s : 'normal');
  const detalhe = d => (DETALHES.some(x => x[0] === d) ? d : 'normal');
  const nada = (sit, det) => valida(sit) === 'normal' && detalhe(det) === 'normal';
  const tamDe = id => (typeof Props !== 'undefined' && Props.P[id] ? Props.P[id].size || 1 : 1);

  /* ---- a conta ---- */
  function aplicar(V, sit, det) {
    sit = valida(sit); det = detalhe(det);
    const out = { k: sit, det, itens: [], chao: [], formas: [], ruinas: {}, semLuz: sit === 'abandonada' };
    if (nada(sit, det)) return out;
    const { W, H } = V, rnd = mulberry(((V.seed ^ 0x3d1f7a9b) >>> 0) || 11);
    const ent = (a, b) => a + rnd() * (b - a), pick = a => a[Math.floor(rnd() * a.length) % a.length];
    const mult = det === 'pouco' ? 0.5 : det === 'muito' ? 1.8 : 1;
    const oc = new Uint8Array(W * H);
    const livre = (i, j, s, naRua) => {
      for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) {
        const x = i + a, y = j + b;
        if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || oc[y * W + x] || !V.dentro(x, y)) return false;
        if (naRua ? !V.naRua(x, y) : !V.livre(x, y)) return false;
      }
      return true;
    };
    const poe = (id, i, j, s, extra) => { s = s || tamDe(id); for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < W && y < H) oc[y * W + x] = 1; } out.itens.push(Object.assign({ id, x: i, y: j, s }, extra || null)); return true; };
    // a frente das portas fica livre
    for (const k of V.casas) { const pt = k.porta; if (!pt) continue; const mx = Math.floor((pt.x1 + pt.x2) / 2 - (pt.lado === 'o' ? 1 : 0) + (pt.lado === 'n' || pt.lado === 's' ? -0.5 : 0)), my = Math.floor((pt.y1 + pt.y2) / 2 - (pt.lado === 'n' ? 1 : 0) + (pt.lado === 'o' || pt.lado === 'l' ? -0.5 : 0)); if (mx >= 0 && my >= 0 && mx < W && my < H) oc[my * W + mx] = 2; }
    // procurar um lugar: perto(i, j) diz se serve; tent tentativas sorteadas pelo mapa (ou numa caixa)
    const procura = (id, perto, op) => {
      op = op || {}; const s = op.s || tamDe(id), cx = op.caixa;
      for (let t = 0; t < (op.tent || 220); t++) {
        const i = cx ? Math.floor(cx[0] + rnd() * (cx[2] - cx[0])) : 1 + Math.floor(rnd() * (W - 1 - s)), j = cx ? Math.floor(cx[1] + rnd() * (cx[3] - cx[1])) : 1 + Math.floor(rnd() * (H - 1 - s));
        if (livre(i, j, s, op.naRua) && (!perto || perto(i, j, s))) return poe(id, i, j, s, op.extra);
      }
      return false;
    };
    const P = V.praca;
    const pertoDaPraca = (dmin, dmax) => (i, j, s) => { if (!P) return true; const d = Math.hypot(i + s / 2 - P.x, j + s / 2 - P.y); return d >= P.r + dmin && d <= P.r + dmax; };
    const caixaPraca = P ? [P.x - P.r - 7, P.y - P.r - 7, P.x + P.r + 7, P.y + P.r + 7] : null;
    // na beira de uma rua (encostado nela, sem estar nela)
    const naBeira = (i, j, s) => { for (let b = -1; b <= s; b++) for (let a = -1; a <= s; a++) if ((a < 0 || b < 0 || a >= s || b >= s) && V.naRua(i + a, j + b)) return true; return false; };
    // pontos ao longo das ruas, longe da praça
    const aoLongo = (passo) => { const pts = []; for (const ru of V.ruas) for (let k = 2; k < ru.pts.length - 2; k += passo) pts.push({ x: ru.pts[k][0], y: ru.pts[k][1], a: Math.atan2(ru.pts[k + 1][1] - ru.pts[k - 1][1], ru.pts[k + 1][0] - ru.pts[k - 1][0]), hw: ru.hw }); return pts; };
    const casas = V.casas.length, n = (base, porCasa) => Math.max(0, Math.round((base + casas * porCasa) * mult));
    const bandeiras = (pares, chave) => { if (typeof Estilos === 'undefined' || !Estilos.bandeirinhas) return; pares.forEach(([a, b], i) => out.formas.push(...Estilos.bandeirinhas(a, b, V.estilo, chave + i))); };
    const atravessa = (q, folga) => [[q.x - Math.sin(q.a) * (q.hw + folga), q.y + Math.cos(q.a) * (q.hw + folga)], [q.x + Math.sin(q.a) * (q.hw + folga), q.y - Math.cos(q.a) * (q.hw + folga)]];

    if (sit === 'feira') {
      for (let k = 0; k < n(2, 0.35); k++) procura('barracaFeira', P ? pertoDaPraca(0.4, 4.5) : naBeira, { caixa: caixaPraca, tent: 260 }) || procura('barracaFeira', naBeira);
      for (let k = 0; k < n(1, 0.12); k++) procura('carroca', naBeira, { tent: 260 });
      for (const id of ['frutas', 'sacos', 'carrinho', 'caixote', 'barril', 'frutas', 'sacos', 'jarro']) for (let k = 0; k < Math.max(1, Math.round(mult * (casas > 10 ? 2 : 1))); k++) procura(id, P ? pertoDaPraca(0.2, 5) : naBeira, { caixa: caixaPraca });
      if (P) { const m = 4; const pts = []; for (let k = 0; k < m; k++) { const a = k / m * TAU + 0.4; pts.push([P.x + Math.cos(a) * (P.r + 0.4), P.y + Math.sin(a) * (P.r + 0.4)]); } bandeiras([[pts[0], pts[2]], [pts[1], pts[3]]], 'feira'); }
      out.chao.push(...aoLongo(9).slice(0, n(2, 0.2)).map(q => ({ k: 'lama', x: q.x + ent(-0.5, 0.5), y: q.y + ent(-0.5, 0.5), r: ent(0.6, 1.1) })));
    } else if (sit === 'festa') {
      if (P) {
        // a fogueira grande num lado da praça (o poço fica no meio), as mesas em volta, o palco na beira
        let fog = false;
        for (let t = 0; t < 60 && !fog; t++) { const a = rnd() * TAU, d = P.r * ent(0.35, 0.6), i = Math.floor(P.x + Math.cos(a) * d - 0.5), j = Math.floor(P.y + Math.sin(a) * d - 0.5); if (livre(i, j, 1, true) || livre(i, j, 1)) fog = poe('fogueira', i, j, 1); }
        procura('palco', pertoDaPraca(0.2, 6), { caixa: [P.x - P.r - 10, P.y - P.r - 10, P.x + P.r + 10, P.y + P.r + 10], tent: 700 }) || procura('palco', null, { tent: 900 });
        for (let k = 0; k < n(2, 0.2); k++) procura('mesaLonga', pertoDaPraca(0.2, 4), { caixa: caixaPraca, tent: 300 });
        for (const id of ['barril', 'barril', 'lanterna', 'jarro']) procura(id, pertoDaPraca(0.2, 5), { caixa: caixaPraca });
      }
      for (let k = 0; k < n(1, 0.1); k++) procura('mesaLonga', naBeira, { tent: 200 });
      // as bandeirinhas: cruzando as ruas, de longe em longe
      bandeiras(aoLongo(7).filter(q => !P || Math.hypot(q.x - P.x, q.y - P.y) > P.r + 1.5).slice(0, n(4, 0.4)).map(q => atravessa(q, 0.6)), 'festa');
      if (P) { const pts = []; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; pts.push([P.x + Math.cos(a) * (P.r + 0.3), P.y + Math.sin(a) * (P.r + 0.3)]); } bandeiras([[pts[0], pts[3]], [pts[1], pts[4]], [pts[2], pts[5]]], 'praca'); }
    } else if (sit === 'atacada' || sit === 'abandonada') {
      const queima = sit === 'atacada';
      V.casas.forEach((k, idx) => {
        const vai = queima ? rnd() < 0.45 : true;
        if (!vai) return;
        const r = { queimada: queima, buracos: buracosDe(k, rnd, queima ? 2 : 1 + Math.floor(rnd() * 2)), aberta: true };
        out.ruinas[idx] = r;
        // o entulho dentro (e, na queimada, o fogo que ainda arde em algumas)
        const dentro = (i, j, s) => i >= k.x && j >= k.y && i + s <= k.x + k.w && j + s <= k.y + k.h;
        const caixa = [k.x, k.y, k.x + k.w, k.y + k.h];
        if (queima && rnd() < 0.5) procura('fogueira', dentro, { caixa, tent: 40, extra: { incendio: true } });
        for (let m = 0; m < (queima ? 2 : 1); m++) procura('escombros', dentro, { caixa, tent: 30 });
        if (queima) out.chao.push({ k: 'cinzas', x: k.x + k.w / 2, y: k.y + k.h / 2, r: Math.max(k.w, k.h) * 0.75 });
      });
      for (let k = 0; k < n(2, 0.25); k++) procura('escombros', naBeira, { tent: 200 });
      if (queima) {
        // as barricadas atravessadas nas ruas (na própria rua), a carroça virada, a fumaça
        for (const q of aoLongo(11).slice(0, n(2, 0.15))) { const i = Math.floor(q.x - 1), j = Math.floor(q.y - 1); if (livre(i, j, 2, true)) poe('barricada', i, j, 2, { rot: Math.round(((q.a * 180 / Math.PI) + 90 + 360) % 180) }); }
        procura('carroca', naBeira, { tent: 200, extra: { rot: 90 } });
        for (const idx of Object.keys(out.ruinas).slice(0, n(2, 0.1))) { const k = V.casas[idx]; out.chao.push({ k: 'fumaca', x: k.x + k.w / 2 + ent(-0.5, 0.5), y: k.y + k.h / 2 + ent(-0.5, 0.5), r: ent(1.6, 2.6) }); }
      } else {
        for (const q of aoLongo(4)) if (rnd() < 0.55) out.chao.push({ k: 'mato', x: q.x + ent(-q.hw, q.hw), y: q.y + ent(-q.hw, q.hw), r: ent(0.5, 1.3) });
        for (const id of ['toco', 'arbusto', 'arbusto', 'toco', 'cogumelos']) for (let k = 0; k < Math.max(1, Math.round(mult * casas / 6)); k++) procura(id, null, { tent: 80 });
      }
    }
    // os detalhes pelo chão (o "muito"): as carroças, os barris e caixotes nas portas, os varais, a lenha, o feno e as cercas
    if (det === 'muito' && sit !== 'abandonada') {
      for (let k = 0; k < Math.max(1, Math.round(casas / 6)); k++) procura('carroca', naBeira, { tent: 200 });
      for (const k of V.casas) {
        if (!k.porta || rnd() < 0.45) continue;
        const pt = k.porta, dx = pt.lado === 'o' ? -1 : pt.lado === 'l' ? 1 : 0, dy = pt.lado === 'n' ? -1 : pt.lado === 's' ? 1 : 0;
        const mx = (pt.x1 + pt.x2) / 2, my = (pt.y1 + pt.y2) / 2;
        for (const sd of [1.6, -1.6]) { const i = Math.floor(mx + dx * 0.5 + dy * sd - (dx < 0 ? 0.5 : 0)), j = Math.floor(my + dy * 0.5 + dx * sd - (dy < 0 ? 0.5 : 0)); if (livre(i, j, 1)) { poe(pick(['barril', 'caixote', 'lenha', 'jarro']), i, j, 1); break; } }
      }
      const fundo = (i, j, s) => !naBeira(i, j, s);
      for (let k = 0; k < Math.max(1, Math.round(casas / 4)); k++) procura('varal', fundo, { tent: 160 });
      for (const id of ['lenha', 'feno', 'lenha', 'feno', 'cerca', 'cerca', 'cerca', 'poco']) procura(id, id === 'poco' ? (i, j, s) => !P || Math.hypot(i - P.x, j - P.y) > P.r + 6 : fundo, { tent: 120 });
    }
    return out;
  }
  // os buracos nas paredes de uma casa (um quadrado cada, no meio de um lado sem a porta)
  function buracosDe(k, rnd, n) {
    const out = [], lados = ['n', 's', 'o', 'l'].filter(l => !k.porta || l !== k.porta.lado);
    for (let t = 0; t < n && lados.length; t++) {
      const lado = lados.splice(Math.floor(rnd() * lados.length) % lados.length, 1)[0], len = lado === 'n' || lado === 's' ? k.w : k.h;
      if (len < 3) continue;
      const d = 1 + Math.floor(rnd() * (len - 2)), L = len >= 5 && rnd() < 0.4 ? 2 : 1;
      if (lado === 'n') out.push({ x1: k.x + d, y1: k.y, x2: k.x + d + L, y2: k.y });
      else if (lado === 's') out.push({ x1: k.x + d, y1: k.y + k.h, x2: k.x + d + L, y2: k.y + k.h });
      else if (lado === 'o') out.push({ x1: k.x, y1: k.y + d, x2: k.x, y2: k.y + d + L });
      else out.push({ x1: k.x + k.w, y1: k.y + d, x2: k.x + k.w, y2: k.y + d + L });
    }
    return out;
  }
  /* As paredes de uma casa com a ruína: os buracos tirados das retas; a porta (arrombada) aberta. segs: as de
     Estilos.paredesDaCasa. → [{ k, x1, y1, x2, y2, open? }] */
  function paredes(segs, r) {
    if (!r) return segs;
    const out = [];
    for (const s of segs) {
      if (s.k === 'door') { out.push(Object.assign({}, s, r.aberta ? { open: true } : null)); continue; }
      const horiz = Math.abs(s.y1 - s.y2) < 1e-6, vert = Math.abs(s.x1 - s.x2) < 1e-6;
      const furos = (r.buracos || []).filter(b => (horiz && Math.abs(b.y1 - s.y1) < 1e-6 && Math.abs(b.y2 - s.y1) < 1e-6) || (vert && Math.abs(b.x1 - s.x1) < 1e-6 && Math.abs(b.x2 - s.x1) < 1e-6));
      if (!furos.length || (!horiz && !vert)) { out.push(s); continue; }
      const a0 = horiz ? Math.min(s.x1, s.x2) : Math.min(s.y1, s.y2), b0 = horiz ? Math.max(s.x1, s.x2) : Math.max(s.y1, s.y2);
      let pecas = [[a0, b0]];
      for (const f of furos) { const fa = horiz ? Math.min(f.x1, f.x2) : Math.min(f.y1, f.y2), fb = horiz ? Math.max(f.x1, f.x2) : Math.max(f.y1, f.y2); pecas = pecas.flatMap(([a, b]) => (fb <= a || fa >= b ? [[a, b]] : [[a, fa], [fb, b]].filter(([u, v]) => v - u > 0.05))); }
      for (const [a, b] of pecas) out.push(horiz ? { k: s.k, x1: a, y1: s.y1, x2: b, y2: s.y1 } : { k: s.k, x1: s.x1, y1: a, x2: s.x1, y2: b });
    }
    return out;
  }

  /* ---- o desenho ---- */
  // por baixo das casas: a lama da feira, a cinza, o mato nas ruas
  function pintarChao(g, S, c, rnd) {
    if (!S) return;
    for (const m of S.chao) {
      const x = m.x * c, y = m.y * c, r = m.r * c;
      if (m.k === 'lama') { g.fillStyle = 'rgba(60,44,28,0.35)'; g.beginPath(); g.ellipse(x, y, r, r * 0.65, rnd() * 3, 0, TAU); g.fill(); }
      else if (m.k === 'cinzas') { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(20,16,14,0.55)'); gr.addColorStop(1, 'rgba(20,16,14,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      else if (m.k === 'mato') { for (let i = 0; i < 9; i++) { const a = rnd() * TAU, d = rnd() * r; g.fillStyle = rnd() < 0.5 ? 'rgba(70,96,48,0.75)' : 'rgba(96,120,58,0.7)'; g.beginPath(); g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, c * (0.15 + rnd() * 0.22), c * (0.1 + rnd() * 0.15), rnd() * 3, 0, TAU); g.fill(); } }
    }
  }
  // por cima das casas: a casa queimada (o carvão, as vigas caídas), os buracos (o entulho na beira) e a fumaça
  function pintarSobre(g, S, casas, c, rnd) {
    if (!S) return;
    for (const idx of Object.keys(S.ruinas)) {
      const k = casas[idx], r = S.ruinas[idx];
      if (!k) continue;
      if (r.queimada) {
        g.save(); g.beginPath(); g.rect(k.x * c, k.y * c, k.w * c, k.h * c); g.clip();
        g.fillStyle = 'rgba(18,13,10,0.55)'; g.fillRect(k.x * c, k.y * c, k.w * c, k.h * c);
        for (let i = 0; i < k.w * k.h * 2; i++) { g.fillStyle = rnd() < 0.7 ? 'rgba(8,6,5,0.5)' : 'rgba(150,60,20,0.35)'; g.beginPath(); g.arc((k.x + rnd() * k.w) * c, (k.y + rnd() * k.h) * c, c * (0.1 + rnd() * 0.3), 0, TAU); g.fill(); }
        g.strokeStyle = '#140d08'; g.lineWidth = c * 0.16; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const x0 = k.x + rnd() * k.w, y0 = k.y + rnd() * k.h, a = rnd() * Math.PI, L = 1 + rnd() * 2; g.beginPath(); g.moveTo(x0 * c, y0 * c); g.lineTo((x0 + Math.cos(a) * L) * c, (y0 + Math.sin(a) * L) * c); g.stroke(); }
        g.restore();
      }
      for (const b of r.buracos) {
        const horiz = Math.abs(b.y1 - b.y2) < 1e-6, L = horiz ? Math.abs(b.x2 - b.x1) : Math.abs(b.y2 - b.y1);
        for (let i = 0; i < L * 6; i++) {
          const t = rnd(), x = (horiz ? Math.min(b.x1, b.x2) + t * L : b.x1 + (rnd() - 0.5) * 0.7) * c, y = (horiz ? b.y1 + (rnd() - 0.5) * 0.7 : Math.min(b.y1, b.y2) + t * L) * c;
          g.fillStyle = rnd() < 0.5 ? '#5a554e' : '#3a2a1c'; g.beginPath(); g.arc(x, y, c * (0.06 + rnd() * 0.1), 0, TAU); g.fill();
        }
        // (o pedaço de parede que caiu: o chão aparece)
        g.strokeStyle = 'rgba(80,70,58,0.9)'; g.lineWidth = c * 0.26; g.lineCap = 'butt'; g.beginPath(); g.moveTo(b.x1 * c, b.y1 * c); g.lineTo(b.x2 * c, b.y2 * c); g.stroke();
      }
    }
    for (const m of S.chao) if (m.k === 'fumaca') {
      for (let i = 0; i < 7; i++) { const x = (m.x + (rnd() - 0.3) * m.r) * c, y = (m.y - rnd() * m.r) * c, r = c * (0.5 + rnd() * m.r * 0.5); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(70,66,64,0.32)'); gr.addColorStop(1, 'rgba(70,66,64,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    }
  }
  // na cena: os objetos (a fogueira do incêndio com a luz), as formas (as bandeirinhas)
  function montar(sc, S, c) {
    if (!S) return;
    for (const it of S.itens) if (Props.P[it.id]) { const t = Props.novo(sc, it.id, it.x * c, it.y * c, it.s, false); if (it.rot) t.rot = it.rot; if (it.incendio) t.name = 'Incêndio'; sc.tokens.push(t); }
    for (const f of S.formas) sc.shapes.push(Estilos.formaNaCena(f, c, 0, 0));
  }
  // o resumo, embaixo da prévia
  function resumo(S) {
    if (!S || (S.k === 'normal' && S.det === 'normal')) return '';
    const q = [];
    if (S.k !== 'normal') q.push((SITS.find(x => x[0] === S.k) || [])[1].toLowerCase());
    const nr = Object.keys(S.ruinas).length;
    if (nr) q.push((S.k === 'atacada' ? nr + (nr === 1 ? ' casa queimada' : ' casas queimadas') : nr + (nr === 1 ? ' casa em ruína' : ' casas em ruína')));
    if (S.det !== 'normal') q.push((S.det === 'muito' ? 'muitos' : 'poucos') + ' detalhes pelo chão');
    return ' · ' + q.join(', ');
  }
  // (o bairro recortado da cidade) a situação deslocada: o que cai dentro; as ruínas dos prédios que ficaram (velhos: os
  // índices antigos, na ordem nova)
  function mover(S, x0, y0, W, H, velhos) {
    const dentro = (x, y) => x >= -1 && y >= -1 && x <= W && y <= H;
    const ruinas = {};
    velhos.forEach((v, novo) => { const r = S.ruinas[v]; if (r) ruinas[novo] = Object.assign({}, r, { buracos: r.buracos.map(b => ({ x1: b.x1 - x0, y1: b.y1 - y0, x2: b.x2 - x0, y2: b.y2 - y0 })) }); });
    return Object.assign({}, S, {
      itens: S.itens.map(it => Object.assign({}, it, { x: it.x - x0, y: it.y - y0 })).filter(it => it.x >= 0 && it.y >= 0 && it.x + it.s <= W && it.y + it.s <= H),
      chao: S.chao.map(m => Object.assign({}, m, { x: m.x - x0, y: m.y - y0 })).filter(m => dentro(m.x, m.y)),
      formas: S.formas.map(f => Estilos.moverRelevo(f, -x0, -y0)).filter(f => { const [a, b, c2, d] = Estilos.caixaDe(f); return a >= 0 && b >= 0 && c2 <= W && d <= H; }),
      ruinas,
    });
  }
  // o "pouco": metade dos enfeites (os de sempre) fica, pelo sorteio da situação
  function reduzir(lista, seed) { const r = mulberry(((seed ^ 0x6a09e667) >>> 0) || 5); return lista.filter(() => r() < 0.5); }
  return { SITS, DETALHES, NOTA, valida, detalhe, nada, aplicar, paredes, pintarChao, pintarSobre, montar, resumo, reduzir, buracosDe, mover };
})();
