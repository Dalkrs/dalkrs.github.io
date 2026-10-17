/* ---------------------------------------------------------------
   10f. CIDADE — o gerador de cidade (lote 7)
   Duas maneiras: a CENA COMPLETA, grande, tudo na escala de batalha (a muralha com torres e portões, a praça com a
   fonte, as ruas principais dos portões à praça, as ruas de bairro, o rio com as pontes, o templo de frente para a
   praça, a casa do senhor no pátio murado com jardim, o quartel com o pátio de treino, o largo do mercado com as
   barracas, e as casas de cada bairro com os telhados do estilo); e o MAPA DE BAIRROS, a mesma cidade vista de longe
   (cada quadrado vale dois), com o tom de cada bairro e um marcador por bairro — dois cliques no marcador geram o
   bairro, recortado da cidade, numa cena filha. Cada prédio tem um marcador de Entrada (oculto) na porta: dois cliques
   geram o interior (10g). Nada sai escrito.
   O plano (gerar) é uma conta pura, sorteada pela semente. Ele usa três sorteios separados — o traçado (a muralha, a
   praça, as ruas, o rio e os prédios grandes), os prédios comuns e as árvores —, para que travar o traçado mantenha
   tudo isso e sorteie só os prédios comuns; um prédio comum travado fica igual, e o traçado desvia dele.
   --------------------------------------------------------------- */
const Cidade = (() => {
  const TAMANHOS = {
    pequena: { n: 'Pequena', W: 64, H: 46, predios: [16, 36], padrao: 26, praca: 4, hw: 1.25, anel: false, passoX: [14, 17], passoY: [12, 15] },
    media: { n: 'Média', W: 80, H: 56, predios: [24, 60], padrao: 42, praca: 4.5, hw: 1.5, anel: true, passoX: [15, 18], passoY: [13, 16] },
    grande: { n: 'Grande', W: 96, H: 68, predios: [36, 100], padrao: 70, praca: 5, hw: 1.5, anel: true, passoX: [15, 19], passoY: [13, 17] },
  };
  const MODOS = [['completa', 'Cena completa'], ['bairros', 'Mapa de bairros']];
  const TERRENOS_C = [['campo', 'Campo'], ['floresta', 'Floresta'], ['areia', 'Deserto'], ['neve', 'Neve']];
  // os bairros: o nome (para as dicas), o nome curto (para o nome da cena do bairro) e o tom (no mapa de bairros)
  const BAIRROS = {
    centro: { n: 'o centro', curto: 'centro', tom: 'rgba(235,195,90,0.22)' },
    nobres: { n: 'o bairro nobre', curto: 'bairro nobre', tom: 'rgba(170,120,225,0.22)' },
    mercado: { n: 'o mercado', curto: 'mercado', tom: 'rgba(245,150,60,0.22)' },
    pobres: { n: 'o bairro pobre', curto: 'bairro pobre', tom: 'rgba(150,105,65,0.26)' },
    quartel: { n: 'o quartel', curto: 'quartel', tom: 'rgba(225,80,70,0.22)' },
    rio: { n: 'a beira-rio', curto: 'beira-rio', tom: 'rgba(70,140,225,0.22)' },
  };
  const LETRA = { centro: 'c', nobres: 'n', mercado: 'm', pobres: 'p', quartel: 'q', rio: 'r' };
  const DA_LETRA = { c: 'centro', n: 'nobres', m: 'mercado', p: 'pobres', q: 'quartel', r: 'rio' };
  // o lote de cada bairro: a frente e o fundo (em quadrados) e o espaço até o vizinho
  const LOTES = {
    centro: { w: [5, 7], h: [5, 6], gap: 1 },
    nobres: { w: [6, 8], h: [5, 7], gap: 2 },
    mercado: { w: [4, 6], h: [4, 5], gap: 0 },
    pobres: { w: [3, 4], h: [3, 4], gap: 0 },
    quartel: { w: [4, 6], h: [4, 5], gap: 1 },
    rio: { w: [5, 7], h: [4, 6], gap: 1 },
  };
  const NOME_TIPO = { casa: 'a casa', loja: 'a loja', taverna: 'a taverna', ferraria: 'a ferraria', armazem: 'o armazém', templo: 'o templo', senhor: 'a casa do senhor', quartel: 'o quartel' };
  const TIPOS_C = Object.keys(NOME_TIPO);
  const GRANDES = ['templo', 'senhor', 'quartel'];
  const TIPO_DO_BAIRRO = { centro: ['loja', 'casa', 'loja'], nobres: ['casa'], mercado: ['loja', 'casa', 'loja', 'armazem'], pobres: ['casa'], quartel: ['casa', 'ferraria'], rio: ['armazem', 'casa', 'armazem'] };

  const num = v => typeof v === 'number' && Number.isFinite(v);
  const distSeg = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };
  const distLinha = (pts, x, y) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, distSeg(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return d; };
  const dentroPoli = (poli, x, y) => { let d = false; for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) { const [xi, yi] = poli[i], [xj, yj] = poli[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; };
  // uma curva suave de a até b, passando perto de m (pontos a cada meio quadrado)
  function curva(a, m, b) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L * 2)), out = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * m[0] + t * t * b[0], u * u * a[1] + 2 * u * t * m[1] + t * t * b[1]]); }
    return out;
  }
  const reta = (a, b) => curva(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b);
  // as sementes de cada sorteio, tiradas da semente do lugar
  const sub = (seed, k) => (((Math.imul(seed ^ 0x5bd1e995, 0x01000193 + k * 0x9e3779b1) >>> 0) ^ (k * 0x85ebca6b)) >>> 0) || (k + 1);
  // a porta no meio de um lado
  function portaNoLado(x, y, w, h, lado) {
    const len = lado === 'n' || lado === 's' ? w : h, d = clamp(Math.floor(len / 2), 1, Math.max(1, len - 2));
    if (lado === 'n') return { lado, x1: x + d, y1: y, x2: x + d + 1, y2: y };
    if (lado === 's') return { lado, x1: x + d, y1: y + h, x2: x + d + 1, y2: y + h };
    if (lado === 'o') return { lado, x1: x, y1: y + d, x2: x, y2: y + d + 1 };
    return { lado, x1: x + w, y1: y + d, x2: x + w, y2: y + d + 1 };
  }
  // a casa logo do lado de fora de uma porta (ou portão) e o passo para fora
  const foraDaPorta = pt => [pt.lado === 'o' ? pt.x1 - 1 : pt.x1, pt.lado === 'n' ? pt.y1 - 1 : pt.y1];
  const passoPraFora = pt => [pt.lado === 'o' ? -1 : pt.lado === 'l' ? 1 : 0, pt.lado === 'n' ? -1 : pt.lado === 's' ? 1 : 0];
  // o lado que dá para (ax, ay)
  const ladoPara = (x, y, w, h, ax, ay) => { const dx = ax - (x + w / 2), dy = ay - (y + h / 2); return Math.abs(dx) / w > Math.abs(dy) / h ? (dx < 0 ? 'o' : 'l') : (dy < 0 ? 'n' : 's'); };
  const formaDoEstilo = (estilo, tipo, w, h) => ((estilo === 'elfico' || (estilo === 'anao' && tipo !== 'casa')) && tipo !== 'quartel' && w >= 5 && h >= 5 ? 'oct' : 'ret');

  /* As partes travadas que chegam de fora (um modelo, a janela): o traçado (a semente dele) e os prédios comuns (cópias). */
  function limparTrava(t, W, H) {
    if (!t || typeof t !== 'object') return { ruas: null, predios: [] };
    const ruas = Number.isInteger(t.ruas) && t.ruas > 0 && t.ruas <= 4294967295 ? t.ruas : null;
    const lado = l => typeof l === 'string' && l.length === 1 && 'nsol'.includes(l);
    const predios = [];
    for (const k of Array.isArray(t.predios) ? t.predios.slice(0, 40) : []) {
      if (!k || !TIPOS_C.includes(k.tipo) || GRANDES.includes(k.tipo) || ![k.x, k.y, k.w, k.h].every(Number.isInteger) || k.w < 2 || k.h < 2 || k.w > 12 || k.h > 12 || k.x < 0 || k.y < 0 || k.x + k.w > W || k.y + k.h > H) continue;
      if (!k.porta || !lado(k.porta.lado)) continue;
      predios.push({ tipo: k.tipo, x: k.x, y: k.y, w: k.w, h: k.h, porta: portaNoLado(k.x, k.y, k.w, k.h, k.porta.lado), estilo: typeof k.estilo === 'string' ? k.estilo : null });
    }
    return { ruas, predios };
  }

  /* ================= o plano (conta pura) ================= */
  function gerar(o) {
    o = o || {};
    const tam = TAMANHOS[o.tamanho] ? o.tamanho : 'media', T = TAMANHOS[tam];
    const terreno = TERRENOS_C.some(x => x[0] === o.terreno) ? o.terreno : 'campo', estilo = Estilos.valido(o.estilo);
    const W = T.W, H = T.H, seed = (Math.round(Number(o.seed)) >>> 0) || 1;
    const comRio = !!o.rio, muralha = o.muralha !== false;
    const want = clamp(Math.round(Number(o.predios) || T.padrao), T.predios[0], T.predios[1]);
    const modo = o.modo === 'bairros' ? 'bairros' : 'completa';
    const trava = limparTrava(o.trava, W, H), base = o.base && typeof o.base === 'object' ? o.base : {};
    // 1) o traçado: o travado; senão, um que deixe caber os prédios travados (até 20 tentativas; depois, o da tela)
    const cabeNoTracado = (E, k) => { for (let j = k.y; j < k.y + k.h; j++) for (let i = k.x; i < k.x + k.w; i++) if (E.occ[j * W + i] !== 0) return false; const [fi, fj] = foraDaPorta(k.porta), v = fi >= 0 && fj >= 0 && fi < W && fj < H ? E.occ[fj * W + fi] : 9; return v === 0 || v === 1 || v === 10; };
    let sRuas = trava.ruas, E = null;
    if (sRuas) E = tracado(sRuas);
    else {
      for (let k = 0; k < 20 && !E; k++) { const s = sub(seed, 1 + 100 * k), e = tracado(s); if (trava.predios.every(q => cabeNoTracado(e, q))) { sRuas = s; E = e; } }
      if (!E && Number.isInteger(base.sRuas) && base.sRuas > 0) { sRuas = base.sRuas; E = tracado(sRuas); }
      if (!E) { sRuas = sub(seed, 1); E = tracado(sRuas); }
    }
    function tracado(sR) {
      const rnd = mulberry(sR), r = (a, b) => a + rnd() * (b - a), ri = (a, b) => Math.floor(r(a, b + 1)), pick = a => a[Math.floor(rnd() * a.length) % a.length];
      // a muralha: um octógono a três quadrados da borda, com os cantos cortados
      const mg = 3, cc = Math.round(Math.min(W, H) * 0.14);
      const ring = muralha ? [[mg + cc, mg], [W - mg - cc, mg], [W - mg, mg + cc], [W - mg, H - mg - cc], [W - mg - cc, H - mg], [mg + cc, H - mg], [mg, H - mg - cc], [mg, mg + cc]] : null;
      const dentroDaCidade = (x, y) => (ring ? dentroPoli(ring, x, y) && ring.every((p, i) => distSeg(x, y, p[0], p[1], ring[(i + 1) % 8][0], ring[(i + 1) % 8][1]) > 1.2) : x > 1.5 && y > 1.5 && x < W - 1.5 && y < H - 1.5);
      const praca = { x: W / 2 + r(-2, 2), y: H / 2 + r(-1.5, 1.5), r: T.praca };
      // os portões (um em cada lado; na cidade pequena, às vezes três) e as ruas principais, do portão à praça
      const lados = ['n', 's', 'o', 'l'];
      if (tam === 'pequena' && rnd() < 0.5) lados.splice(Math.floor(rnd() * 4) % 4, 1);
      const portoes = [], ruas = [];
      for (const lado of lados) {
        const t = r(0.38, 0.62), x = lado === 'o' ? (ring ? mg : -1) : lado === 'l' ? (ring ? W - mg : W + 1) : W * t, y = lado === 'n' ? (ring ? mg : -1) : lado === 's' ? (ring ? H - mg : H + 1) : H * t;
        const fora = [lado === 'o' ? -1 : lado === 'l' ? W + 1 : x, lado === 'n' ? -1 : lado === 's' ? H + 1 : y];
        if (ring) portoes.push({ lado, x, y });
        const ang = Math.atan2(praca.y - y, praca.x - x), meio = [(x + praca.x) / 2 - Math.sin(ang) * r(-3, 3), (y + praca.y) / 2 + Math.cos(ang) * r(-3, 3)];
        ruas.push({ k: 'principal', hw: T.hw, pts: reta(fora, [x, y]).concat(curva([x, y], meio, [praca.x, praca.y]).slice(1)) });
      }
      // o anel, por dentro da muralha (nas cidades maiores)
      if (ring && T.anel) {
        const cx = W / 2, cy = H / 2, pts = ring.map(([x, y]) => { const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy); return [x + dx / d * 3.2, y + dy / d * 3.2]; });
        const anel = [];
        for (let i = 0; i < 8; i++) { const seg = reta(pts[i], pts[(i + 1) % 8]); anel.push(...(i ? seg.slice(1) : seg)); }
        ruas.push({ k: 'anel', hw: 1, pts: anel });
      }
      // o rio: de cima a baixo, longe da praça
      let rio = null, rioX = null;
      if (comRio) {
        const rw = 1.7, opc = [W * 0.2, W * 0.8].filter(x => Math.abs(x - praca.x) > praca.r + rw + 6);
        const xr0 = (opc.length ? pick(opc) : W * 0.8) + r(-1.5, 1.5), C = r(1, 2.2), N = r(H * 0.8, H * 1.3), Hh = r(0, Math.PI * 2);
        rioX = y => xr0 + C * Math.sin(2 * Math.PI * y / N + Hh);
        const pts = [];
        for (let y = -1; y <= H + 1; y += 0.5) pts.push([rioX(y), y]);
        rio = { pts, hw: rw };
      }
      // a ocupação: 0 livre · 1 rua ou praça · 2 rio · 3 prédio · 4 árvore · 5 muralha · 6 fora da cidade · 7 pátio ·
      // 8 quintal · 10 a frente de uma porta (fica livre, para passar)
      const occ = new Uint8Array(W * H);
      const at = (i, j) => (i >= 0 && j >= 0 && i < W && j < H ? occ[j * W + i] : 9);
      const pos = (i, j, v) => { if (i >= 0 && j >= 0 && i < W && j < H) occ[j * W + i] = v; };
      const marcarEm = (arr, pts, R, v, vale) => {
        for (let k = 1; k < pts.length; k++) {
          const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
          const i0 = Math.max(0, Math.floor(Math.min(ax, bx) - R - 1)), i1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + R + 1));
          const j0 = Math.max(0, Math.floor(Math.min(ay, by) - R - 1)), j1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + R + 1));
          for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if ((!vale || vale(arr[j * W + i])) && distSeg(i + 0.5, j + 0.5, ax, ay, bx, by) <= R) arr[j * W + i] = v;
        }
      };
      const marcar = (pts, R, v, vale) => marcarEm(occ, pts, R, v, vale);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const cx = i + 0.5, cy = j + 0.5;
        if (!dentroDaCidade(cx, cy)) pos(i, j, ring && (dentroPoli(ring, cx, cy) || ring.some((p, k) => distSeg(cx, cy, p[0], p[1], ring[(k + 1) % 8][0], ring[(k + 1) % 8][1]) <= 1.2)) ? 5 : 6);
      }
      if (rio) marcar(rio.pts, rio.hw + 0.6, 2, v => v === 0 || v === 6);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (occ[j * W + i] === 0 && Math.hypot(i + 0.5 - praca.x, j + 0.5 - praca.y) <= praca.r + 0.3) pos(i, j, 1);
      for (const ru of ruas) marcar(ru.pts, ru.hw + 0.25, 1, v => v === 0 || (ru.k === 'principal' && v === 6));
      // os bairros: o centro, a beira-rio e os quatro quadrantes (numa ordem sorteada)
      const quad = ['nobres', 'mercado', 'pobres', 'quartel'];
      for (let i = quad.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)) % (i + 1); [quad[i], quad[k]] = [quad[k], quad[i]]; }
      const perto = new Uint8Array(W * H);
      if (rio) marcarEm(perto, rio.pts, rio.hw + 6, 1);
      const bairroDe = (x, y) => {
        if (Math.hypot(x - praca.x, y - praca.y) < praca.r + 7) return 'centro';
        const i = Math.floor(x), j = Math.floor(y);
        if (rio && i >= 0 && j >= 0 && i < W && j < H && perto[j * W + i]) return 'rio';
        const a = Math.atan2(y - praca.y, x - praca.x);
        return quad[(Math.floor(((a + Math.PI) / (Math.PI / 2))) % 4 + 4) % 4];
      };
      // os grandes (o templo, os pátios, o largo do mercado), antes das ruas de bairro, que desviam deles
      const grandes = [], patios = [], barracas = [];
      let largo = null;
      const cabe = (x, y, w, h, gap) => {
        if (x < 0 || y < 0 || x + w > W || y + h > H) return false;
        for (let j = y - gap; j < y + h + gap; j++) for (let i = x - gap; i < x + w + gap; i++) {
          const v = at(i, j), dentro = i >= x && i < x + w && j >= y && j < y + h;
          if (dentro ? v !== 0 : v === 3 || v === 7) return false;
        }
        // (um prédio travado veio de uma cidade em que ele já respeitava os grandes: aqui basta não cair em cima dele)
        return trava.predios.every(q => x + w <= q.x || q.x + q.w <= x || y + h <= q.y || q.y + q.h <= y);
      };
      const ocupar = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) pos(i, j, v); };
      // da porta para fora, até a rua (ou até 8 casas): fica livre
      const caminho = pt => { let [i, j] = foraDaPorta(pt); const [dx, dy] = passoPraFora(pt); for (let k = 0; k < 8 && at(i, j) === 0; k++, i += dx, j += dy) pos(i, j, 10); };
      const ruaPerto = (x, y) => { let melhor = null, d = Infinity; for (const ru of ruas) for (const p of ru.pts) { const q = Math.hypot(p[0] - x, p[1] - y); if (q < d) { d = q; melhor = p; } } return melhor || [praca.x, praca.y]; };
      {
        const [tw, th] = pick([[9, 7], [7, 9], [8, 8]]);
        let feito = false;
        for (let dd = 0; dd < 4 && !feito; dd++) for (let k = 0; k < 32 && !feito; k++) {
          const a = (k / 32) * Math.PI * 2, d = praca.r + 1 + dd + Math.max(tw, th) / 2;
          const x = Math.round(praca.x + Math.cos(a) * d - tw / 2), y = Math.round(praca.y + Math.sin(a) * d - th / 2);
          if (cabe(x, y, tw, th, 1)) { const porta = portaNoLado(x, y, tw, th, ladoPara(x, y, tw, th, praca.x, praca.y)); grandes.push({ tipo: 'templo', x, y, w: tw, h: th, porta, bairro: 'centro' }); ocupar(x, y, tw, th, 3); caminho(porta); feito = true; }
        }
      }
      const patio = (bairro, pw, ph, tipo, bw, bh) => {
        for (let k = 0; k < 600; k++) {
          const x = ri(2, W - pw - 2), y = ri(2, H - ph - 2);
          if (bairroDe(x + pw / 2, y + ph / 2) !== bairro || !cabe(x, y, pw, ph, 1)) continue;
          const [rx, ry] = ruaPerto(x + pw / 2, y + ph / 2), portao = portaNoLado(x, y, pw, ph, ladoPara(x, y, pw, ph, rx, ry));
          ocupar(x, y, pw, ph, 7);
          const bx = portao.lado === 'o' ? x + pw - bw - 1 : portao.lado === 'l' ? x + 1 : x + Math.floor((pw - bw) / 2);
          const by = portao.lado === 'n' ? y + ph - bh - 1 : portao.lado === 's' ? y + 1 : y + Math.floor((ph - bh) / 2);
          ocupar(bx, by, bw, bh, 3);
          grandes.push({ tipo, x: bx, y: by, w: bw, h: bh, porta: portaNoLado(bx, by, bw, bh, portao.lado), bairro });
          patios.push({ tipo, x, y, w: pw, h: ph, portao });
          caminho(portao);
          return true;
        }
        return false;
      };
      patio('nobres', tam === 'pequena' ? 13 : 15, tam === 'pequena' ? 11 : 13, 'senhor', tam === 'pequena' ? 7 : 8, tam === 'pequena' ? 6 : 7);
      patio('quartel', tam === 'pequena' ? 13 : 15, tam === 'pequena' ? 10 : 11, 'quartel', tam === 'pequena' ? 9 : 10, 4);
      // o cemitério, junto do templo (do lado de trás ou de um lado, a um quadrado dele): o muro baixo, o portão para a
      // rua mais perto e as lápides em fileiras
      const tp = grandes.find(k => k.tipo === 'templo');
      if (tp) {
        const cw = tam === 'pequena' ? 6 : 7, ch = 5, atras = { n: 's', s: 'n', o: 'l', l: 'o' }[tp.porta.lado];
        for (const lado of [atras].concat(['n', 's', 'o', 'l'].filter(l => l !== atras && l !== tp.porta.lado))) {
          const horiz = lado === 'n' || lado === 's', w2 = horiz ? cw : ch, h2 = horiz ? ch : cw;
          const x = horiz ? Math.round(tp.x + (tp.w - w2) / 2) : lado === 'o' ? tp.x - w2 - 1 : tp.x + tp.w + 1;
          const y = horiz ? (lado === 'n' ? tp.y - h2 - 1 : tp.y + tp.h + 1) : Math.round(tp.y + (tp.h - h2) / 2);
          if (!cabe(x, y, w2, h2, 1)) continue;
          const [rx, ry] = ruaPerto(x + w2 / 2, y + h2 / 2), portao = portaNoLado(x, y, w2, h2, ladoPara(x, y, w2, h2, rx, ry));
          ocupar(x, y, w2, h2, 7);
          // as lápides: fileiras de dois em dois quadrados, fora do caminho que vem do portão
          const tumulos = [], [gi, gj] = foraDaPorta(portao), [gx, gy] = passoPraFora(portao), dentroI = gi - gx, dentroJ = gj - gy;
          for (let j = y + 1; j < y + h2 - 1; j += 2) for (let i = x + 1; i < x + w2 - 1; i += 2) {
            const noCaminho = gx !== 0 ? j === dentroJ : i === dentroI;
            if (!noCaminho && rnd() < 0.85) tumulos.push({ x: i, y: j });
          }
          patios.push({ tipo: 'cemiterio', x, y, w: w2, h: h2, portao, tumulos });
          caminho(portao);
          break;
        }
      }
      for (let k = 0; k < 600 && !largo; k++) {
        const lw = tam === 'pequena' ? 8 : 10, lh = tam === 'pequena' ? 7 : 8, x = ri(2, W - lw - 2), y = ri(2, H - lh - 2);
        if (bairroDe(x + lw / 2, y + lh / 2) !== 'mercado' || !cabe(x, y, lw, lh, 1)) continue;
        // o palco de madeira (os pregões, os bardos, a forca), num canto do largo: as barracas não caem nele
        const palco = { x: rnd() < 0.5 ? x + 1 : x + lw - 4, y: rnd() < 0.5 ? y + 1 : y + lh - 3, w: 3, h: 2 };
        largo = { x, y, w: lw, h: lh, palco };
        ocupar(x, y, lw, lh, 7);
        const noPalco = (bx, by) => bx < palco.x + palco.w + 0.5 && bx + 2.5 > palco.x && by < palco.y + palco.h + 0.5 && by + 2 > palco.y;
        for (let j = 1; j + 2 <= lh; j += 3) for (let i = 1; i + 2 <= lw; i += 3) if (rnd() < 0.85) { const b = { x: x + i, y: y + j, w: 2, h: 1.5, cor: ri(0, 5) }; if (!noPalco(b.x, b.y)) barracas.push(b); }
      }
      // as ruas de bairro: uma grade torta (cai um pedaço aqui e ali) que não passa pelos grandes nem pelos travados
      const x0 = ring ? mg + 2 : 2, x1 = ring ? W - mg - 2 : W - 2, y0 = ring ? mg + 2 : 2, y1 = ring ? H - mg - 2 : H - 2;
      const xs = [], ys = [];
      for (let x = x0 + ri(T.passoX[0], T.passoX[1]); x < x1 - 4; x += ri(T.passoX[0], T.passoX[1])) xs.push(x + r(-0.8, 0.8));
      for (let y = y0 + ri(T.passoY[0], T.passoY[1]); y < y1 - 4; y += ri(T.passoY[0], T.passoY[1])) ys.push(y + r(-0.8, 0.8));
      const cortes = [y0].concat(ys, [y1]), cortesX = [x0].concat(xs, [x1]);
      const bloqueia = ([x, y]) => {
        if (trava.predios.some(q => x > q.x - 0.5 && x < q.x + q.w + 0.5 && y > q.y - 0.5 && y < q.y + q.h + 0.5)) return true;
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const v = at(Math.floor(x) + a, Math.floor(y) + b); if (v === 3 || v === 7) return true; }
        return false;
      };
      // (onde a rua bate num prédio grande, num pátio ou num prédio travado, ela para e continua do outro lado)
      const tenta = pts => {
        let pedaco = [];
        const fecha = () => { if (pedaco.length >= 7) { ruas.push({ k: 'rua', hw: 1, pts: pedaco }); marcar(pedaco, 1.25, 1, v => v === 0); } pedaco = []; };
        for (const pt of pts) { if (bloqueia(pt)) fecha(); else pedaco.push(pt); }
        fecha();
      };
      for (const x of xs) for (let i = 1; i < cortes.length; i++) if (rnd() > 0.12) tenta(reta([x + r(-0.5, 0.5), cortes[i - 1]], [x + r(-0.5, 0.5), cortes[i]]));
      for (const y of ys) for (let i = 1; i < cortesX.length; i++) if (rnd() > 0.12) tenta(reta([cortesX[i - 1], y + r(-0.5, 0.5)], [cortesX[i], y + r(-0.5, 0.5)]));
      // as pontes: onde o rio cruza uma rua
      const pontes = [];
      if (rio) for (const ru of ruas) for (let i = 1; i < ru.pts.length; i++) {
        const [ax, ay] = ru.pts[i - 1], [bx, by] = ru.pts[i], fa = ax - rioX(ay), fb = bx - rioX(by);
        if ((fa <= 0) !== (fb <= 0)) {
          const t = fa / (fa - fb), x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
          if (!pontes.some(p => Math.hypot(p.x - x, p.y - y) < 3)) pontes.push({ x, y, ang: Math.atan2(by - ay, bx - ax), comp: 2 * rio.hw + 1.6, larg: 2 * ru.hw + 0.5 });
        }
      }
      return { occ, ring, praca, portoes, ruas, rio, pontes, grandes, patios, largo, barracas, bairroDe, quad };
    }
    const { occ, ring, praca, portoes, ruas, rio, pontes, patios, largo, barracas, bairroDe, quad } = E;
    const at = (i, j) => (i >= 0 && j >= 0 && i < W && j < H ? occ[j * W + i] : 9);
    const pos = (i, j, v) => { if (i >= 0 && j >= 0 && i < W && j < H) occ[j * W + i] = v; };
    const ocupar = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) pos(i, j, v); };
    const predios = E.grandes.map(k => Object.assign({}, k, { forma: formaDoEstilo(estilo, k.tipo, k.w, k.h) }));
    // 2) os prédios comuns (outro sorteio): primeiro os travados; depois, de frente para a rua — cada casa livre encostada
    //    numa rua é um lugar possível para a frente de um prédio; as ruas principais e a praça enchem primeiro
    const rnd = mulberry(sub(seed, 3)), r = (a, b) => a + rnd() * (b - a), ri = (a, b) => Math.floor(r(a, b + 1)), pick = a => a[Math.floor(rnd() * a.length) % a.length];
    let soltas = 0;
    const livre = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (at(i, j) !== 0) return false; return true; };
    // a frente da porta fica livre (outro prédio não tapa)
    const frente = pt => { const [i, j] = foraDaPorta(pt); if (at(i, j) === 0) pos(i, j, 10); };
    const portaLivre = pt => { const [i, j] = foraDaPorta(pt), v = at(i, j); return v === 0 || v === 1 || v === 10; };
    for (const q of trava.predios) {
      if (predios.length >= want || !livre(q.x, q.y, q.w, q.h) || !portaLivre(q.porta)) { soltas++; continue; }
      const k = { tipo: q.tipo, x: q.x, y: q.y, w: q.w, h: q.h, porta: Object.assign({}, q.porta), bairro: bairroDe(q.x + q.w / 2, q.y + q.h / 2), forma: formaDoEstilo(estilo, q.tipo, q.w, q.h), trava: true };
      predios.push(k); ocupar(k.x, k.y, k.w, k.h, 3); frente(k.porta);
    }
    const cabe = (x, y, w, h, gap) => {
      if (x < 0 || y < 0 || x + w > W || y + h > H) return false;
      for (let j = y - gap; j < y + h + gap; j++) for (let i = x - gap; i < x + w + gap; i++) {
        const v = at(i, j), dentro = i >= x && i < x + w && j >= y && j < y + h;
        if (dentro ? v !== 0 : v === 3 || v === 7) return false;
      }
      return true;
    };
    const principal = new Uint8Array(W * H);
    for (const ru of ruas) if (ru.k === 'principal') {
      const R = ru.hw + 1.6;
      for (let k = 1; k < ru.pts.length; k++) {
        const [ax, ay] = ru.pts[k - 1], [bx, by] = ru.pts[k];
        for (let j = Math.max(0, Math.floor(Math.min(ay, by) - R - 1)); j <= Math.min(H - 1, Math.ceil(Math.max(ay, by) + R + 1)); j++)
          for (let i = Math.max(0, Math.floor(Math.min(ax, bx) - R - 1)); i <= Math.min(W - 1, Math.ceil(Math.max(ax, bx) + R + 1)); i++) if (distSeg(i + 0.5, j + 0.5, ax, ay, bx, by) <= R) principal[j * W + i] = 1;
      }
    }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (Math.hypot(i + 0.5 - praca.x, j + 0.5 - praca.y) <= praca.r + 2) principal[j * W + i] = 1;
    const DIR = { n: [0, -1], s: [0, 1], o: [-1, 0], l: [1, 0] }, frentes = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (at(i, j) !== 0) continue;
      for (const lado of ['n', 's', 'o', 'l']) { const [dx, dy] = DIR[lado]; if (at(i + dx, j + dy) === 1) frentes.push({ i, j, lado, pr: principal[j * W + i] }); }
    }
    for (let i = frentes.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)) % (i + 1); [frentes[i], frentes[k]] = [frentes[k], frentes[i]]; }
    frentes.sort((a, b) => b.pr - a.pr);
    const especiais = ['taverna', 'taverna', 'ferraria', 'armazem', 'armazem'].concat(tam === 'pequena' ? [] : ['armazem', 'ferraria']);
    for (const k of predios) { const i = especiais.indexOf(k.tipo); if (i >= 0) especiais.splice(i, 1); }
    for (const fr of frentes) {
      if (predios.length >= want) break;
      if (at(fr.i, fr.j) !== 0) continue;
      const b = bairroDe(fr.i + 0.5, fr.j + 0.5), L = LOTES[b], frente0 = ri(L.w[0], L.w[1]), fundo0 = ri(L.h[0], L.h[1]);
      const horiz = fr.lado === 'n' || fr.lado === 's';
      let feito = null;
      for (const [frente, fundo] of [[frente0, fundo0], [frente0, fundo0 - 1], [frente0 - 1, fundo0], [frente0 - 1, fundo0 - 1], [frente0, fundo0 - 2]]) {
        if (frente < Math.max(3, L.w[0] - 1) || fundo < Math.max(3, L.h[0] - 1)) continue;
        const w = horiz ? frente : fundo, h = horiz ? fundo : frente;
        for (const d of [0, -1, 1, -2, 2]) {
          const x = horiz ? fr.i - Math.floor(frente / 2) + d : fr.lado === 'o' ? fr.i : fr.i - fundo + 1;
          const y = horiz ? (fr.lado === 'n' ? fr.j : fr.j - fundo + 1) : fr.j - Math.floor(frente / 2) + d;
          if (cabe(x, y, w, h, L.gap) && portaLivre(portaNoLado(x, y, w, h, fr.lado))) { feito = [x, y, w, h]; break; }
        }
        if (feito) break;
      }
      if (!feito) continue;
      const [x, y, w, h] = feito, tipo = especiais.length && b !== 'nobres' && rnd() < 0.4 ? especiais.shift() : pick(TIPO_DO_BAIRRO[b]);
      const porta = portaNoLado(x, y, w, h, fr.lado);
      predios.push({ tipo, x, y, w, h, porta, bairro: b, forma: formaDoEstilo(estilo, tipo, w, h) });
      ocupar(x, y, w, h, 3); frente(porta);
    }
    // os pátios: o laguinho no jardim da casa do senhor; a torre de vigia e os alvos de tiro no pátio do quartel (no canto
    // mais longe do prédio). As casas deles ficam ocupadas (as árvores do jardim não caem em cima)
    const rp = mulberry(sub(sRuas, 7));                   // (do traçado: travar o traçado mantém os pátios como estão)
    for (const pt of patios) {
      const k = predios.find(q => q.tipo === pt.tipo && q.x >= pt.x && q.y >= pt.y && q.x + q.w <= pt.x + pt.w && q.y + q.h <= pt.y + pt.h);
      if (!k) continue;
      // os quatro cantos de dentro do pátio, do mais longe do prédio para o mais perto
      const cantos = [[pt.x + 1, pt.y + 1], [pt.x + pt.w - 1, pt.y + 1], [pt.x + 1, pt.y + pt.h - 1], [pt.x + pt.w - 1, pt.y + pt.h - 1]].sort((a, b) => Math.hypot(b[0] - k.x - k.w / 2, b[1] - k.y - k.h / 2) - Math.hypot(a[0] - k.x - k.w / 2, a[1] - k.y - k.h / 2));
      const livreNoPatio = (x, y, w, h) => { for (let j = Math.floor(y); j < Math.ceil(y + h); j++) for (let i = Math.floor(x); i < Math.ceil(x + w); i++) if (at(i, j) !== 7 || (i >= k.x - 1 && i < k.x + k.w + 1 && j >= k.y - 1 && j < k.y + k.h + 1)) return false; return true; };
      if (pt.tipo === 'senhor') {
        // o maior laguinho que couber num canto (do mais longe do prédio para o mais perto)
        const grande = rp() < 0.5;
        busca: for (const [w, h] of grande ? [[4, 3], [3, 3], [3, 2], [2, 2]] : [[3, 3], [4, 2], [3, 2], [2, 2]]) for (const [cx, cy] of cantos) {
          const x = cx < pt.x + pt.w / 2 ? cx : cx - w, y = cy < pt.y + pt.h / 2 ? cy : cy - h;
          if (livreNoPatio(x, y, w, h)) { pt.lago = { x: x + 0.15, y: y + 0.15, w: w - 0.3, h: h - 0.3 }; ocupar(x, y, w, h, 8); break busca; }
        }
      } else {
        for (const [cx, cy] of cantos) {
          const x = cx < pt.x + pt.w / 2 ? cx : cx - 2, y = cy < pt.y + pt.h / 2 ? cy : cy - 2;
          if (livreNoPatio(x, y, 2, 2)) { pt.torre = { x, y, w: 2, h: 2 }; ocupar(x, y, 2, 2, 8); break; }
        }
        // os alvos: em fila, ao longo do lado mais comprido do pátio, do lado oposto ao prédio
        const deitado = pt.w >= pt.h, alvos = [];
        for (let n = 0; n < 3; n++) {
          const t = (n + 1) / 4, x = deitado ? pt.x + pt.w * t : (k.x + k.w / 2 < pt.x + pt.w / 2 ? pt.x + pt.w - 1.2 : pt.x + 1.2), y = deitado ? (k.y + k.h / 2 < pt.y + pt.h / 2 ? pt.y + pt.h - 1.2 : pt.y + 1.2) : pt.y + pt.h * t;
          if (livreNoPatio(x - 0.5, y - 0.5, 1, 1) && !(pt.torre && Math.abs(x - pt.torre.x - 1) < 2 && Math.abs(y - pt.torre.y - 1) < 2)) { alvos.push({ x, y }); ocupar(Math.floor(x), Math.floor(y), 1, 1, 8); }
        }
        pt.alvos = alvos;
      }
    }
    // 3) os quintais, nos fundos dos lotes (longe das ruas): a horta com os canteiros, o terreiro com a lenha e o feno, e
    //    o jardim (no bairro nobre). Só desenho, no fundo; outro sorteio
    const rq = mulberry(sub(seed, 5)), quintais = [];
    const longeDaRua = (x, y, w, h) => { for (let j = y - 1; j <= y + h; j++) for (let i = x - 1; i <= x + w; i++) { const v = at(i, j); if (v === 1 || v === 2 || v === 5 || v === 6 || v === 9) return false; } return true; };
    for (let j = 1; j < H - 3; j++) for (let i = 1; i < W - 3; i++) {
      if (at(i, j) !== 0 || rq() > 0.3) continue;
      const w = 2 + Math.floor(rq() * 3), h = 2 + Math.floor(rq() * 2);
      if (!livre(i, j, w, h) || !longeDaRua(i, j, w, h)) continue;
      const b = bairroDe(i + w / 2, j + h / 2), k = b === 'nobres' ? 'jardim' : b === 'mercado' || b === 'rio' ? (rq() < 0.6 ? 'terreiro' : 'horta') : rq() < 0.65 ? 'horta' : 'terreiro';
      quintais.push({ x: i, y: j, w, h, k }); ocupar(i, j, w, h, 8);
    }
    // 4) as árvores (os jardins dos nobres, o pátio da casa do senhor, os fundos, fora da muralha) e os postes das ruas
    //    principais e da praça
    const ra = mulberry(sub(seed, 4)), rr = (a, b) => a + ra() * (b - a);
    const Est = Estilos.de(estilo), especie = Est.arvore[terreno], arvores = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const v = at(i, j), cx = i + 0.5, cy = j + 0.5;
      if (v !== 0 && v !== 6 && v !== 7) continue;
      let encosta = false;
      for (let b = -1; b <= 1 && !encosta; b++) for (let a = -1; a <= 1 && !encosta; a++) { const w2 = at(i + a, j + b); if (w2 === 3 || w2 === 1 || w2 === 5 || w2 === 2) encosta = true; }
      if (encosta) continue;
      const noJardim = v === 7 && patios.some(pt => pt.tipo === 'senhor' && cx > pt.x + 0.8 && cx < pt.x + pt.w - 0.8 && cy > pt.y + 0.8 && cy < pt.y + pt.h - 0.8);
      if (v === 7 && !noJardim) continue;
      const pr = (v === 6 ? 0.16 : noJardim ? 0.25 : bairroDe(cx, cy) === 'nobres' ? 0.14 : 0.07) * Est.dens * (terreno === 'floresta' ? 1.5 : terreno === 'areia' ? 0.5 : 1);
      if (ra() < pr) { arvores.push({ x: cx + rr(-0.25, 0.25), y: cy + rr(-0.25, 0.25), r: rr(0.6, 1.15) }); pos(i, j, 4); }
    }
    const postes = [];
    for (const ru of ruas) if (ru.k === 'principal') for (let s = 4; s < ru.pts.length - 4; s += 18) {
      const p = ru.pts[s], q = ru.pts[s + 1], ang = Math.atan2(q[1] - p[1], q[0] - p[0]), lado = (s / 18) % 2 ? 1 : -1;
      const x = Math.floor(p[0] - Math.sin(ang) * lado * (ru.hw + 0.6)), y = Math.floor(p[1] + Math.cos(ang) * lado * (ru.hw + 0.6));
      if (at(x, y) === 0 || at(x, y) === 4) { postes.push({ x, y }); pos(x, y, 4); }
    }
    // quatro na praça, em volta da fonte
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, d = Math.max(2, praca.r - 1); postes.push({ x: Math.floor(praca.x + Math.cos(a) * d), y: Math.floor(praca.y + Math.sin(a) * d) }); }
    // a grade dos bairros (uma letra por casa), para o desenho e o mapa de bairros
    let grade = '';
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const v = at(i, j); grade += v === 5 ? '#' : v === 6 ? '.' : LETRA[bairroDe(i + 0.5, j + 0.5)]; }
    // os píeres de madeira no rio (dentro da muralha), de um lado e do outro
    const pieres = [];
    if (rio) for (let k = 6; k < rio.pts.length - 6; k += 16) {
      const [x, y] = rio.pts[k], lado = (k / 16) % 2 ? 1 : -1;
      if (!ring || dentroPoli(ring, x, y)) pieres.push({ x: x + lado * (rio.hw - 0.2) - (lado < 0 ? 1.4 : 0), y: y - 0.3, w: 1.4, h: 0.6 });
    }
    const p0 = { estilo, rio: rio ? { pts: rio.pts, hw: rio.hw } : null, ring, portoes, praca, pontes, largo, patios, pieres, postes };
    return { v: 1, lugar: 'cidade', modo, seed, sRuas, tamanho: tam, terreno, estilo, especie, poste: Est.poste, rio: p0.rio, comRio, muralha, W, H, pedidos: want,
      travaRuas: !!trava.ruas, soltas, ring, portoes, ruas, praca, pontes, largo, barracas, patios, pieres, predios, quintais, arvores, postes, bairros: { quad, grade },
      relevo: relevoDe(p0), formas: formasDe(p0) };
  }
  /* ================= o relevo e as formas ================= */
  const retangulo = Estilos.retangulo;
  // o fosso de cada estilo (o tipo de terreno e a fundura, em metros): com água no comum e no oriental; seco e fundo no
  // anão; uma vala no nórdico; o desértico e o élfico não têm
  const FOSSO = { comum: ['agua', -2], oriental: ['agua', -2], anao: ['fosso', -4], nordico: ['fosso', -2] };
  const MADEIRA = ['oriental', 'nordico', 'elfico'];      // (as pontes de madeira; nos outros estilos, são de pedra)
  // os trechos da muralha entre os portões (em cada lado do octógono, cortado onde há portão)
  function trechosDaMuralha(ring, portoes, folga) {
    const out = [], R = ring.concat([ring[0]]);
    for (let i = 0; i < ring.length; i++) {
      const a = R[i], b = R[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      const cortes = portoes.map(v => ({ t: (v.x - a[0]) * ux + (v.y - a[1]) * uy, d: Math.abs((v.x - a[0]) * uy - (v.y - a[1]) * ux) })).filter(q => q.d < 0.6 && q.t > 0 && q.t < L).map(q => q.t).sort((m, n) => m - n);
      let t0 = 0;
      for (const t of cortes) { if (t - folga > t0) out.push([[a[0] + ux * t0, a[1] + uy * t0], [a[0] + ux * (t - folga), a[1] + uy * (t - folga)]]); t0 = t + folga; }
      if (L > t0) out.push([[a[0] + ux * t0, a[1] + uy * t0], b]);
    }
    return out;
  }
  /* O relevo da cidade (áreas de terreno com altura, em quadrados; a de cima vale onde se sobrepõem): o rio (água, 2 m
     de fundura), o fosso e as pontes dos portões, o adarve da muralha (a 6 m) e as torres (a 9 m), as pontes de
     madeira (2 m acima da água), os píeres, a fonte da praça, o palco do mercado, a torre de vigia do quartel (6 m) e
     o laguinho do jardim do senhor. */
  function relevoDe(p) {
    const est = Estilos.valido(p.estilo), out = [];
    if (p.rio) out.push({ t: 'agua', alt: -2, k: 'free', pts: p.rio.pts.filter((_, i) => i % 2 === 0), sw: p.rio.hw * 2 });
    if (p.ring) {
      const f = FOSSO[est], cx = p.ring.reduce((s2, q) => s2 + q[0], 0) / p.ring.length, cy = p.ring.reduce((s2, q) => s2 + q[1], 0) / p.ring.length;
      const fora = p.ring.map(([x, y]) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1; return [x + dx / d * 1.7, y + dy / d * 1.7]; });
      if (f) out.push({ t: f[0], alt: f[1], k: 'free', pts: fora.concat([fora[0]]), sw: 1.2 });
      for (const [a, b] of trechosDaMuralha(p.ring, p.portoes, 1.8)) out.push({ t: 'plataforma', alt: 6, k: 'free', pts: [a, b], sw: 0.7 });
      if (f) for (const g of p.portoes) {
        // a ponte do portão, por cima do fosso: do pé da muralha até passar o fosso
        const nx = g.lado === 'o' ? -1 : g.lado === 'l' ? 1 : 0, ny = g.lado === 'n' ? -1 : g.lado === 's' ? 1 : 0;
        let d = 1.7;
        for (let i = 0; i < p.ring.length; i++) { const A = fora[i], B = fora[(i + 1) % fora.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1; const dd = Math.abs((g.x - A[0]) * (B[1] - A[1]) - (g.y - A[1]) * (B[0] - A[0])) / L; const a0 = p.ring[i], b0 = p.ring[(i + 1) % p.ring.length], L0 = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]) || 1; if (Math.abs((g.x - a0[0]) * (b0[1] - a0[1]) - (g.y - a0[1]) * (b0[0] - a0[0])) / L0 < 0.6) d = dd; }
        out.push({ t: 'plataforma', alt: 0.5, k: 'poly', pts: retangulo(g.x + nx * d, g.y + ny * d, 2.4, 2.8, Math.atan2(ny, nx)) });
      }
      for (const [x, y] of p.ring) out.push({ t: 'plataforma', alt: 9, k: 'ell', x: x - 1.2, y: y - 1.2, w: 2.4, h: 2.4 });
      for (const g of p.portoes) { const horiz = g.lado === 'n' || g.lado === 's'; for (const sn of [-1, 1]) { const x = g.x + (horiz ? sn * 2.4 : 0), y = g.y + (horiz ? 0 : sn * 2.4); out.push({ t: 'plataforma', alt: 9, k: 'ell', x: x - 0.85, y: y - 0.85, w: 1.7, h: 1.7 }); } }
    }
    if (MADEIRA.includes(est)) for (const b of p.pontes) out.push({ t: 'plataforma', alt: 2, k: 'poly', pts: retangulo(b.x, b.y, b.comp, b.larg, b.ang) });
    for (const q of p.pieres || []) out.push({ t: 'plataforma', alt: 0.5, k: 'rect', x: q.x, y: q.y, w: q.w, h: q.h });
    { const R = Math.min(1.4, p.praca.r * 0.35); out.push({ t: 'agua', alt: -0.5, k: 'ell', x: p.praca.x - R, y: p.praca.y - R, w: 2 * R, h: 2 * R }); }
    if (p.largo && p.largo.palco) { const q = p.largo.palco; out.push({ t: 'plataforma', alt: 1.5, k: 'rect', x: q.x, y: q.y, w: q.w, h: q.h }); }
    for (const pt of p.patios) {
      if (pt.torre) out.push({ t: 'plataforma', alt: 6, k: 'rect', x: pt.torre.x, y: pt.torre.y, w: pt.torre.w, h: pt.torre.h });
      if (pt.lago) out.push({ t: 'agua', alt: -1, k: 'ell', x: pt.lago.x, y: pt.lago.y, w: pt.lago.w, h: pt.lago.h });
    }
    return out;
  }
  // As formas (desenhos de enfeite, travados): as bandeirinhas cruzando a praça e o largo do mercado; os alvos de tiro
  // do quartel.
  function formasDe(p) {
    const est = Estilos.valido(p.estilo), out = [];
    const d = Math.max(2, p.praca.r - 1), lamp = [0, 1, 2, 3].map(k => { const a = Math.PI / 4 + k * Math.PI / 2; return [Math.floor(p.praca.x + Math.cos(a) * d) + 0.5, Math.floor(p.praca.y + Math.sin(a) * d) + 0.5]; });
    out.push(...Estilos.bandeirinhas(lamp[0], lamp[2], est, 'praca1'), ...Estilos.bandeirinhas(lamp[1], lamp[3], est, 'praca2'));
    if (p.largo) { const l = p.largo; out.push(...Estilos.bandeirinhas([l.x + 0.4, l.y + 0.4], [l.x + l.w - 0.4, l.y + l.h - 0.4], est, 'largo')); }
    for (const pt of p.patios) for (const a of pt.alvos || []) {
      out.push({ k: 'ell', x: a.x - 0.42, y: a.y - 0.42, w: 0.84, h: 0.84, f: '#d9c38a', s: '#5a3a1a', sw: 0.05 });
      out.push({ k: 'ell', x: a.x - 0.27, y: a.y - 0.27, w: 0.54, h: 0.54, f: '#b3262b', s: '#f1e9d8', sw: 0.04 });
      out.push({ k: 'ell', x: a.x - 0.1, y: a.y - 0.1, w: 0.2, h: 0.2, f: '#e9c24a', s: null, sw: 0 });
    }
    return out;
  }
  /* ================= o fundo pintado ================= */
  // as cores de cada estilo para a muralha (pedra, reboco, troncos, barro, pedra clara com hera, pedra escura)
  const MURO = { comum: ['#6e6a62', '#8a857b', '#4f4b45'], oriental: ['#e8e2d3', '#f4efe3', '#2f3846'], nordico: ['#6b4a2b', '#7a5532', '#3b2814'], desertico: ['#c9a46a', '#d8b98a', '#9c7448'], elfico: ['#c8cfc0', '#dde3d4', '#5d8a55'], anao: ['#4b4f57', '#5e646e', '#2f3238'] };
  const TOM_BAIRRO = { c: null, n: 'rgba(90,150,70,0.18)', m: 'rgba(170,140,100,0.16)', p: 'rgba(100,75,45,0.22)', q: 'rgba(130,100,70,0.2)', r: 'rgba(80,90,70,0.12)', '#': null, '.': null };
  const LETRA_BAIRRO = { c: 'centro', n: 'nobres', m: 'mercado', p: 'pobres', q: 'quartel', r: 'rio' };
  /* Pinta a cidade toda, com c pixels por quadrado. bairros: true pinta também o tom de cada bairro (o mapa de bairros). */
  function pintar(p, c, bairros) {
    const W = p.W * c, H = p.H * c, pal = Vila.PAL[p.terreno] || Vila.PAL.campo, est = Estilos.valido(p.estilo);
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(W)); cv.height = Math.max(1, Math.round(H));
    const g = cv.getContext('2d'), rnd = mulberry((p.seed ^ 0x2545f491) >>> 0 || 9), TAU2 = Math.PI * 2;
    const linha = pts => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); };
    // o chão
    g.fillStyle = pal.base; g.fillRect(0, 0, W, H);
    for (let i = 0, n = Math.round(p.W * p.H * 0.6); i < n; i++) {
      const rr = (0.5 + rnd() * 1.6) * c;
      g.globalAlpha = 0.1 + rnd() * 0.12; g.fillStyle = pal.manchas[i % pal.manchas.length];
      g.beginPath(); g.ellipse(rnd() * W, rnd() * H, rr, rr * (0.5 + rnd() * 0.6), rnd() * Math.PI, 0, TAU2); g.fill();
    }
    g.globalAlpha = 1;
    // fora da muralha: as roças (retângulos com os sulcos), longe dos caminhos
    if (p.ring && p.terreno !== 'areia') {
      for (let i = 0; i < 26; i++) {
        const fx = rnd() * p.W, fy = rnd() * p.H, fw = 3 + rnd() * 5, fh = 2 + rnd() * 4, ang = (rnd() - 0.5) * 0.5;
        if (dentroPoli(p.ring, fx, fy) || p.ruas.some(ru => ru.k === 'principal' && distLinha(ru.pts, fx, fy) < Math.max(fw, fh) / 2 + 2)) continue;
        g.save(); g.translate(fx * c, fy * c); g.rotate(ang);
        g.globalAlpha = 0.55; g.fillStyle = p.terreno === 'neve' ? '#d3dbe2' : ['#7a6a3a', '#8c7b42', '#6d7a3a', '#9a8a4c'][i % 4]; g.fillRect(-fw * c / 2, -fh * c / 2, fw * c, fh * c);
        g.globalAlpha = 0.3; g.strokeStyle = '#3d3220'; g.lineWidth = Math.max(1, c * 0.04);
        for (let yy = -fh / 2 + 0.3; yy < fh / 2; yy += 0.35) { g.beginPath(); g.moveTo(-fw * c / 2, yy * c); g.lineTo(fw * c / 2, yy * c); g.stroke(); }
        g.restore();
      }
      g.globalAlpha = 1;
    }
    // o chão de cada bairro (gramado nos nobres, terra no bairro pobre e no quartel)
    const gr = p.bairros.grade;
    for (let j = 0; j < p.H; j++) for (let i = 0; i < p.W; i++) {
      const t = TOM_BAIRRO[gr[j * p.W + i]];
      if (t) { g.fillStyle = t; g.fillRect(i * c, j * c, c + 0.5, c + 0.5); }
    }
    // os quintais: a horta (os canteiros com as fileiras), o terreiro (a lenha empilhada e o feno) e o jardim
    for (const q of p.quintais || []) Estilos.quintal(g, q, c, rnd);
    // o rio, com o cais na beira-rio
    if (p.rio) {
      const pts = p.rio.pts, hw = p.rio.hw;
      g.lineJoin = 'round'; g.lineCap = 'butt';
      linha(pts); g.strokeStyle = pal.margem; g.lineWidth = (hw * 2 + 0.8) * c; g.stroke();
      linha(pts); g.strokeStyle = pal.agua[0]; g.lineWidth = hw * 2 * c; g.stroke();
      linha(pts); g.strokeStyle = pal.agua[1]; g.lineWidth = hw * 1.3 * c; g.stroke();
      g.globalAlpha = 0.5; linha(pts); g.strokeStyle = pal.agua[2]; g.lineWidth = hw * 0.5 * c; g.stroke(); g.globalAlpha = 1;
      // os píeres de madeira, de um lado e do outro
      for (const q of p.pieres || []) {
        g.fillStyle = '#5b3f22'; g.fillRect(q.x * c, q.y * c, q.w * c, q.h * c);
        g.fillStyle = '#8a6238'; for (let s = 0; s < 4; s++) g.fillRect(q.x * c + s * 0.35 * c + 1, (q.y + 0.05) * c, 0.3 * c - 2, (q.h - 0.1) * c);
      }
    }
    // as ruas: as principais de pedra (com as pedrinhas), as de bairro mais estreitas; o anel
    const corRua = Estilos.corDaRua(est, pal);
    g.lineJoin = 'round'; g.lineCap = 'round';
    for (const ru of p.ruas.slice().sort((a, b) => (a.k === 'principal') - (b.k === 'principal'))) {
      linha(ru.pts); g.strokeStyle = corRua[0]; g.lineWidth = (ru.hw * 2 + 0.35) * c; g.stroke();
      linha(ru.pts); g.strokeStyle = corRua[1]; g.lineWidth = ru.hw * 2 * c; g.stroke();
      if (ru.k === 'principal') {
        g.globalAlpha = 0.4; g.fillStyle = corRua[2];
        for (let k = 0; k < ru.pts.length; k += 1) { const [x, y] = ru.pts[k]; for (let s = 0; s < 3; s++) { g.beginPath(); g.arc((x + (rnd() - 0.5) * ru.hw * 1.8) * c, (y + (rnd() - 0.5) * ru.hw * 1.8) * c, c * 0.11, 0, TAU2); g.fill(); } }
        g.globalAlpha = 1;
      } else { g.globalAlpha = 0.35; linha(ru.pts); g.strokeStyle = corRua[2]; g.lineWidth = ru.hw * 0.7 * c; g.stroke(); g.globalAlpha = 1; }
    }
    // a praça, com a fonte no meio
    Estilos.praca(g, p.praca, c, rnd, est);
    {
      const x = p.praca.x * c, y = p.praca.y * c, R = Math.min(1.4, p.praca.r * 0.35) * c;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(x + c * 0.1, y + c * 0.12, R + c * 0.25, 0, TAU2); g.fill();
      g.fillStyle = MURO[est][1]; g.beginPath(); g.arc(x, y, R + c * 0.25, 0, TAU2); g.fill();
      g.fillStyle = pal.agua[1]; g.beginPath(); g.arc(x, y, R, 0, TAU2); g.fill();
      g.strokeStyle = 'rgba(230,245,250,0.6)'; g.lineWidth = Math.max(1, c * 0.04);
      for (const f of [0.35, 0.65]) { g.beginPath(); g.arc(x, y, R * f, 0, TAU2); g.stroke(); }
      g.fillStyle = MURO[est][0]; g.beginPath(); g.arc(x, y, R * 0.25, 0, TAU2); g.fill();
    }
    // as pontes
    for (const b of p.pontes) {
      g.save(); g.translate(b.x * c, b.y * c); g.rotate(b.ang);
      const L = b.comp * c, Wd = b.larg * c, pedra = est === 'anao' || est === 'desertico' || est === 'comum';
      g.fillStyle = pedra ? '#4b4f57' : '#5b3f22'; g.fillRect(-L / 2 - c * 0.1, -Wd / 2 - c * 0.15, L + c * 0.2, Wd + c * 0.3);
      for (let xx = -L / 2; xx < L / 2; xx += c * 0.33) { const s = rnd(); g.fillStyle = pedra ? (s < 0.5 ? '#8a857b' : '#7a756c') : s < 0.5 ? '#8a6238' : '#946b3f'; g.fillRect(xx + 1, -Wd / 2, c * 0.33 - 2, Wd); }
      g.fillStyle = est === 'oriental' ? '#a8302a' : pedra ? '#3d4148' : '#3d2914'; g.fillRect(-L / 2, -Wd / 2 - c * 0.15, L, c * 0.15); g.fillRect(-L / 2, Wd / 2, L, c * 0.15);
      g.restore();
    }
    // os pátios: o jardim da casa do senhor (gramado, caminhos, canteiros) e o pátio de treino do quartel; o muro em volta
    for (const pt of p.patios) {
      const x = pt.x * c, y = pt.y * c, w = pt.w * c, hh = pt.h * c;
      if (pt.tipo === 'cemiterio') {
        // a grama escura, o caminho de terra do portão até o fundo, os ciprestes nos cantos
        g.fillStyle = '#3f5a34'; g.fillRect(x, y, w, hh);
        for (let i = 0; i < pt.w * pt.h * 0.8; i++) { g.globalAlpha = 0.25; g.fillStyle = rnd() < 0.5 ? '#4f6b3f' : '#2f4628'; g.beginPath(); g.arc(x + rnd() * w, y + rnd() * hh, c * (0.12 + rnd() * 0.25), 0, TAU2); g.fill(); }
        g.globalAlpha = 1;
        const pg = pt.portao, horiz = pg.lado === 'n' || pg.lado === 's';
        g.fillStyle = 'rgba(140,115,80,0.7)';
        if (horiz) g.fillRect((pg.x1 + 0.1) * c, y, c * 0.8, hh); else g.fillRect(x, (pg.y1 + 0.1) * c, w, c * 0.8);
        for (const [cx, cy] of [[x + c * 0.6, y + c * 0.6], [x + w - c * 0.6, y + c * 0.6], [x + c * 0.6, y + hh - c * 0.6], [x + w - c * 0.6, y + hh - c * 0.6]]) {
          g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx + c * 0.1, cy + c * 0.12, c * 0.32, c * 0.32, 0, 0, TAU2); g.fill();
          g.fillStyle = '#2c4a2c'; g.beginPath(); g.arc(cx, cy, c * 0.32, 0, TAU2); g.fill(); g.fillStyle = '#3d6b3a'; g.beginPath(); g.arc(cx - c * 0.07, cy - c * 0.08, c * 0.18, 0, TAU2); g.fill();
        }
      } else if (pt.tipo === 'senhor') {
        g.fillStyle = '#4f7a3f'; g.fillRect(x, y, w, hh);
        g.strokeStyle = '#c9b48e'; g.lineWidth = c * 0.7; g.beginPath(); g.moveTo(x + w / 2, y + hh * 0.1); g.lineTo(x + w / 2, y + hh * 0.9); g.moveTo(x + w * 0.1, y + hh / 2); g.lineTo(x + w * 0.9, y + hh / 2); g.stroke();
        for (let i = 0; i < 40; i++) { g.fillStyle = ['#f2c94c', '#e85d75', '#ffffff', '#9b7bd8'][i % 4]; g.beginPath(); g.arc(x + rnd() * w, y + rnd() * hh, c * 0.08, 0, TAU2); g.fill(); }
      } else {
        g.fillStyle = '#7a6a4f'; g.fillRect(x, y, w, hh);
        for (let i = 0; i < pt.w * pt.h * 0.6; i++) { g.globalAlpha = 0.25; g.fillStyle = rnd() < 0.5 ? '#8c7b5c' : '#5f523c'; g.beginPath(); g.arc(x + rnd() * w, y + rnd() * hh, c * (0.1 + rnd() * 0.3), 0, TAU2); g.fill(); }
        g.globalAlpha = 1;
        // os bonecos de treino
        for (let i = 0; i < 4; i++) {
          const bx = x + w * (0.2 + 0.2 * i), by = y + hh * (pt.portao.lado === 'n' ? 0.3 : 0.75);
          g.strokeStyle = '#4a3220'; g.lineWidth = c * 0.12; g.beginPath(); g.moveTo(bx - c * 0.35, by); g.lineTo(bx + c * 0.35, by); g.stroke();
          g.fillStyle = '#c9a66b'; g.beginPath(); g.arc(bx, by, c * 0.22, 0, TAU2); g.fill();
        }
      }
      // o laguinho do jardim (as pedras em volta, as folhas de lírio) e a torre de vigia do quartel (o piso, os postes, a escada)
      if (pt.lago) {
        const q = pt.lago, ex = (q.x + q.w / 2) * c, ey = (q.y + q.h / 2) * c;
        g.fillStyle = 'rgba(30,50,25,0.5)'; g.beginPath(); g.ellipse(ex, ey, q.w * c / 2 + c * 0.2, q.h * c / 2 + c * 0.2, 0, 0, TAU2); g.fill();
        const ga = g.createRadialGradient(ex - c * 0.3, ey - c * 0.3, c * 0.2, ex, ey, Math.max(q.w, q.h) * c / 2);
        ga.addColorStop(0, pal.agua[2]); ga.addColorStop(0.55, pal.agua[1]); ga.addColorStop(1, pal.agua[0]);
        g.fillStyle = ga; g.beginPath(); g.ellipse(ex, ey, q.w * c / 2, q.h * c / 2, 0, 0, TAU2); g.fill();
        for (let i = 0; i < 14; i++) { const an = i / 14 * TAU2; g.fillStyle = i % 2 ? '#8a857b' : '#a29d92'; g.beginPath(); g.arc(ex + Math.cos(an) * q.w * c / 2, ey + Math.sin(an) * q.h * c / 2, c * 0.13, 0, TAU2); g.fill(); }
        for (let i = 0; i < 3; i++) { const lx = ex + (rnd() - 0.5) * q.w * c * 0.6, ly = ey + (rnd() - 0.5) * q.h * c * 0.5; g.fillStyle = '#4f8a32'; g.beginPath(); g.arc(lx, ly, c * 0.17, 0.3, TAU2 - 0.3); g.lineTo(lx, ly); g.fill(); if (i === 0) { g.fillStyle = '#f7d4e0'; g.beginPath(); g.arc(lx + c * 0.06, ly - c * 0.04, c * 0.06, 0, TAU2); g.fill(); } }
      }
      if (pt.torre) {
        const q = pt.torre, x0 = q.x * c, y0 = q.y * c, w0 = q.w * c, h0 = q.h * c;
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x0 + c * 0.35, y0 + c * 0.45, w0, h0);
        g.fillStyle = '#5b3f22'; g.fillRect(x0, y0, w0, h0);
        for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#8a6238' : '#946b3f'; g.fillRect(x0 + c * 0.1, y0 + c * 0.1 + i * (h0 - c * 0.2) / 6, w0 - c * 0.2, (h0 - c * 0.2) / 6 - 1); }
        g.strokeStyle = '#3d2914'; g.lineWidth = Math.max(1.5, c * 0.1); g.strokeRect(x0 + c * 0.05, y0 + c * 0.05, w0 - c * 0.1, h0 - c * 0.1);
        g.fillStyle = '#2e1f10'; for (const [px, py] of [[x0, y0], [x0 + w0, y0], [x0, y0 + h0], [x0 + w0, y0 + h0]]) g.fillRect(px - c * 0.14, py - c * 0.14, c * 0.28, c * 0.28);
      }
      // o muro do pátio (com o vão do portão)
      const cor = MURO[est], lw = Math.max(2, c * 0.35);
      const L = Estilos.paredesDaCasa({ x: pt.x, y: pt.y, w: pt.w, h: pt.h, forma: 'ret', porta: Object.assign({}, pt.portao, pt.portao.lado === 'n' || pt.portao.lado === 's' ? { x1: pt.portao.x1 - 1, x2: pt.portao.x2 + 1 } : { y1: pt.portao.y1 - 1, y2: pt.portao.y2 + 1 }), janelas: [] });
      for (const s of L) if (s.k === 'wall') { g.strokeStyle = cor[2]; g.lineWidth = lw + 2; g.beginPath(); g.moveTo(s.x1 * c, s.y1 * c); g.lineTo(s.x2 * c, s.y2 * c); g.stroke(); g.strokeStyle = cor[0]; g.lineWidth = lw; g.stroke(); }
    }
    // o largo do mercado, o palco de madeira (com os degraus) e as barracas (os toldos listrados)
    if (p.largo) {
      const l = p.largo;
      g.fillStyle = 'rgba(150,130,100,0.55)'; g.fillRect(l.x * c, l.y * c, l.w * c, l.h * c);
      if (l.palco) {
        const q = l.palco, x0 = q.x * c, y0 = q.y * c, w0 = q.w * c, h0 = q.h * c, cima = q.y + q.h / 2 > l.y + l.h / 2;
        g.fillStyle = 'rgba(0,0,0,0.32)'; g.fillRect(x0 + c * 0.15, y0 + c * 0.2, w0, h0);
        g.fillStyle = '#5b3f22'; g.fillRect(x0, y0, w0, h0);
        for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#a07a4a' : '#b08756'; g.fillRect(x0 + c * 0.06, y0 + c * 0.06 + i * (h0 - c * 0.12) / 5, w0 - c * 0.12, (h0 - c * 0.12) / 5 - 1); }
        g.strokeStyle = '#3d2914'; g.lineWidth = Math.max(1, c * 0.06); g.strokeRect(x0, y0, w0, h0);
        // os degraus, no lado de dentro do largo
        const sy = cima ? y0 - c * 0.5 : y0 + h0;
        for (let i = 0; i < 2; i++) { g.fillStyle = i ? '#8a6238' : '#946b3f'; g.fillRect(x0 + w0 / 2 - c * 0.5, cima ? sy + i * c * 0.25 : sy + i * c * 0.25, c, c * 0.24); }
      }
      const CORES = [['#c8452f', '#f1e2c2'], ['#2f6f8c', '#f1e2c2'], ['#d9a23a', '#7a2f2a'], ['#5b8c3a', '#f1e2c2'], ['#8e2f3c', '#e9d39a'], ['#6b4a8e', '#f1e2c2']];
      for (const b of p.barracas) {
        const [c1, c2] = CORES[b.cor % CORES.length], x = b.x * c, y = b.y * c, w = b.w * c, hh = b.h * c;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + c * 0.12, y + c * 0.15, w, hh);
        for (let s = 0; s < 6; s++) { g.fillStyle = s % 2 ? c2 : c1; g.fillRect(x + s * w / 6, y, w / 6 + 0.5, hh); }
        g.strokeStyle = 'rgba(40,20,10,0.6)'; g.lineWidth = Math.max(1, c * 0.04); g.strokeRect(x, y, w, hh);
      }
    }
    // os prédios: os telhados do estilo
    p.predios.forEach((k, i) => Estilos.telhado(g, k, c, rnd, est, (hashStr(p.seed + ':' + i) >>> 0) % 997));
    // na porta das lojas, dos armazéns e das ferrarias: caixotes, barris e sacos (pintados, de enfeite)
    for (const k of p.predios) {
      if (!['loja', 'armazem', 'ferraria'].includes(k.tipo)) continue;
      const pt = k.porta, dx = pt.lado === 'o' ? -1 : pt.lado === 'l' ? 1 : 0, dy = pt.lado === 'n' ? -1 : pt.lado === 's' ? 1 : 0;
      const mx = (pt.x1 + pt.x2) / 2 + dx * 0.4, my = (pt.y1 + pt.y2) / 2 + dy * 0.4, tx = dy ? 1 : 0, ty = dx ? 1 : 0;
      for (const [lado, n] of [[-1, 1 + Math.floor(rnd() * 2)], [1, Math.floor(rnd() * 2)]]) for (let m = 0; m < n; m++) {
        const ox = (mx + tx * lado * (1 + m * 0.55)) * c, oy = (my + ty * lado * (1 + m * 0.55)) * c, qual = rnd();
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(ox + c * 0.05, oy + c * 0.06, c * 0.24, 0, TAU2); g.fill();
        if (qual < 0.4) { g.fillStyle = '#a87a45'; g.fillRect(ox - c * 0.2, oy - c * 0.2, c * 0.4, c * 0.4); g.strokeStyle = '#6b4a24'; g.lineWidth = Math.max(1, c * 0.04); g.strokeRect(ox - c * 0.2, oy - c * 0.2, c * 0.4, c * 0.4); g.beginPath(); g.moveTo(ox - c * 0.2, oy - c * 0.2); g.lineTo(ox + c * 0.2, oy + c * 0.2); g.stroke(); }
        else if (qual < 0.75) { g.fillStyle = '#8a5a2e'; g.beginPath(); g.arc(ox, oy, c * 0.22, 0, TAU2); g.fill(); g.strokeStyle = '#3d434c'; g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.arc(ox, oy, c * 0.16, 0, TAU2); g.stroke(); }
        else { g.fillStyle = '#d8c79e'; g.beginPath(); g.ellipse(ox, oy, c * 0.2, c * 0.16, rnd(), 0, TAU2); g.fill(); g.strokeStyle = '#9c8a60'; g.lineWidth = Math.max(1, c * 0.03); g.stroke(); }
      }
    }
    // a muralha: a faixa grossa com as ameias, as torres nos cantos e as torrinhas dos portões
    if (p.ring) {
      const cor = MURO[est], lw = 1.15 * c, ring = p.ring.concat([p.ring[0]]);
      const vaos = p.portoes.map(pt => [pt.x, pt.y]);
      // a faixa (com os vãos dos portões)
      const trecho = (a, b) => { g.beginPath(); g.moveTo(a[0] * c, a[1] * c); g.lineTo(b[0] * c, b[1] * c); g.strokeStyle = cor[2]; g.lineWidth = lw + c * 0.25; g.stroke(); g.strokeStyle = cor[0]; g.lineWidth = lw; g.stroke(); g.strokeStyle = cor[1]; g.lineWidth = lw * 0.35; g.stroke(); };
      g.lineCap = 'butt';
      for (let i = 0; i < 8; i++) {
        const a = ring[i], b = ring[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
        const cortes = vaos.map(v => ({ t: (v[0] - a[0]) * ux + (v[1] - a[1]) * uy, d: Math.abs((v[0] - a[0]) * uy - (v[1] - a[1]) * ux) })).filter(q => q.d < 0.6 && q.t > 0 && q.t < L).map(q => q.t).sort((m, n) => m - n);
        let t0 = 0;
        for (const t of cortes) { if (t - 1.8 > t0) trecho([a[0] + ux * t0, a[1] + uy * t0], [a[0] + ux * (t - 1.8), a[1] + uy * (t - 1.8)]); t0 = t + 1.8; }
        if (L > t0) trecho([a[0] + ux * t0, a[1] + uy * t0], b);
      }
      // as torres
      const torre = (x, y, R) => {
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x * c + c * 0.2, y * c + c * 0.25, R * c, 0, TAU2); g.fill();
        g.fillStyle = cor[2]; g.beginPath(); g.arc(x * c, y * c, R * c, 0, TAU2); g.fill();
        const gt = g.createRadialGradient(x * c - R * c * 0.3, y * c - R * c * 0.35, R * c * 0.1, x * c, y * c, R * c * 0.92);
        gt.addColorStop(0, cor[1]); gt.addColorStop(1, cor[0]);
        g.fillStyle = gt; g.beginPath(); g.arc(x * c, y * c, R * c * 0.85, 0, TAU2); g.fill();
      };
      for (const [x, y] of p.ring) torre(x, y, 1.5);
      for (const pt of p.portoes) {
        const horiz = pt.lado === 'n' || pt.lado === 's';
        for (const s of [-1, 1]) torre(pt.x + (horiz ? s * 2.4 : 0), pt.y + (horiz ? 0 : s * 2.4), 1.05);
      }
    }
    // as árvores
    for (const a of p.arvores) Estilos.arvore(g, a, c, rnd, p.especie || 'folhosa', pal, p.terreno === 'neve');
    g.globalAlpha = 1;
    // o mapa de bairros: o tom de cada bairro, por cima, e a linha entre um bairro e outro
    if (bairros) {
      const TOM = { c: BAIRROS.centro.tom, n: BAIRROS.nobres.tom, m: BAIRROS.mercado.tom, p: BAIRROS.pobres.tom, q: BAIRROS.quartel.tom, r: BAIRROS.rio.tom };
      for (let j = 0; j < p.H; j++) for (let i = 0; i < p.W; i++) { const t = TOM[gr[j * p.W + i]]; if (t) { g.fillStyle = t; g.fillRect(i * c, j * c, c + 0.5, c + 0.5); } }
      g.strokeStyle = 'rgba(255,245,220,0.55)'; g.lineWidth = Math.max(1, c * 0.12); g.setLineDash([c * 0.5, c * 0.35]);
      g.beginPath();
      for (let j = 0; j < p.H; j++) for (let i = 0; i < p.W; i++) {
        const a = gr[j * p.W + i];
        if (!TOM[a]) continue;
        if (i + 1 < p.W && TOM[gr[j * p.W + i + 1]] && gr[j * p.W + i + 1] !== a) { g.moveTo((i + 1) * c, j * c); g.lineTo((i + 1) * c, (j + 1) * c); }
        if (j + 1 < p.H && TOM[gr[(j + 1) * p.W + i]] && gr[(j + 1) * p.W + i] !== a) { g.moveTo(i * c, (j + 1) * c); g.lineTo((i + 1) * c, (j + 1) * c); }
      }
      g.stroke(); g.setLineDash([]);
    }
    // um escurecido de leve nas bordas
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.24)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    return cv;
  }

  /* ================= as partes que travam (a janela do gerador) ================= */
  // o traçado ('ruas': as ruas, a praça, o rio e os prédios grandes) ou um prédio comum ('p<n>')
  function parteEm(p, x, y) {
    for (let i = 0; i < p.predios.length; i++) {
      const k = p.predios[i];
      if (x >= k.x - 0.15 && x <= k.x + k.w + 0.15 && y >= k.y - 0.15 && y <= k.y + k.h + 0.15) return GRANDES.includes(k.tipo) ? 'ruas' : 'p' + i;
    }
    if (p.patios.some(pt => x >= pt.x && x <= pt.x + pt.w && y >= pt.y && y <= pt.y + pt.h) || (p.largo && x >= p.largo.x && x <= p.largo.x + p.largo.w && y >= p.largo.y && y <= p.largo.y + p.largo.h)) return 'ruas';
    if (Math.hypot(x - p.praca.x, y - p.praca.y) <= p.praca.r + 0.4 || p.ruas.some(ru => distLinha(ru.pts, x, y) <= ru.hw + 0.35) || (p.rio && distLinha(p.rio.pts, x, y) <= p.rio.hw + 0.5)) return 'ruas';
    return null;
  }
  const partes = p => ['ruas'].concat(p.predios.map((k, i) => (GRANDES.includes(k.tipo) ? null : 'p' + i)).filter(Boolean));
  const nomeDaParte = (p, parte) => (parte === 'ruas' ? 'o traçado (as ruas, a praça, o rio e os prédios grandes)' : /^p\d+$/.test(parte) && p.predios[+parte.slice(1)] ? NOME_TIPO[p.predios[+parte.slice(1)].tipo] : 'esta parte');
  function formaDaParte(p, parte) {
    if (parte === 'ruas') return [{ k: 'circ', x: p.praca.x, y: p.praca.y, r: p.praca.r }].concat(p.ruas.filter(ru => ru.k === 'principal').map(ru => ({ k: 'linha', pts: ru.pts, hw: ru.hw })), p.predios.filter(k => GRANDES.includes(k.tipo)).map(k => ({ k: 'poli', pts: Estilos.contorno(k) })));
    const k = /^p\d+$/.test(parte) ? p.predios[+parte.slice(1)] : null;
    return k ? [{ k: 'poli', pts: Estilos.contorno(k) }] : [];
  }
  const travada = (p, parte) => (parte === 'ruas' ? !!p.travaRuas : /^p\d+$/.test(parte) && p.predios[+parte.slice(1)] ? !!p.predios[+parte.slice(1)].trava : false);
  const snap = (k, est) => ({ tipo: k.tipo, x: k.x, y: k.y, w: k.w, h: k.h, porta: Object.assign({}, k.porta), estilo: est });
  function alternar(p, parte, trava) {
    const t = { ruas: (trava && trava.ruas) || null, predios: ((trava && trava.predios) || []).slice() };
    if (parte === 'ruas') { p.travaRuas = !p.travaRuas; t.ruas = p.travaRuas ? p.sRuas : null; }
    else if (/^p\d+$/.test(parte) && p.predios[+parte.slice(1)] && !GRANDES.includes(p.predios[+parte.slice(1)].tipo)) {
      const k = p.predios[+parte.slice(1)], mesma = q => q.x === k.x && q.y === k.y && q.w === k.w && q.h === k.h;
      k.trava = !k.trava;
      t.predios = t.predios.filter(q => !mesma(q));
      if (k.trava) t.predios.push(snap(k, p.estilo));
    }
    return t;
  }
  const quantasTravadas = p => (p.travaRuas ? 1 : 0) + p.predios.filter(k => k.trava).length;
  const baseDe = p => ({ sRuas: p.sRuas });
  const travaDe = p => { const t = { ruas: p.travaRuas ? p.sRuas : null, predios: p.predios.filter(k => k.trava).map(k => snap(k, p.estilo)) }; return t.ruas || t.predios.length ? t : null; };

  /* ================= a cena ================= */
  const ADJ = est => (Estilos.ADJ[est] ? ' ' + Estilos.ADJ[est] : '');
  const nomePadrao = p => (p.modo === 'bairros' ? 'Cidade' + ADJ(p.estilo) + ' (bairros)' : 'Cidade' + ADJ(p.estilo));
  // a resolução do fundo: até 64 pixels por quadrado, sem passar de uns 11 milhões de pixels
  const resolucao = (W, H) => Math.max(16, Math.min(64, Math.floor(Math.sqrt(11e6 / (W * H)))));
  // o marcador de Entrada na porta de um prédio (oculto; dois cliques geram o interior)
  function marcador(sc, k, c, est, semente) {
    const pt = k.porta, mx = (pt.x1 + pt.x2) / 2, my = (pt.y1 + pt.y2) / 2;
    const dx = pt.lado === 'o' ? -1 : pt.lado === 'l' ? 1 : 0, dy = pt.lado === 'n' ? -1 : pt.lado === 's' ? 1 : 0;
    const t = Props.novo(sc, 'entrada', (mx + dx * 0.55 - 0.5) * c, (my + dy * 0.55 - 0.5) * c, 1, true);
    t.size = 0.75; t.x += c * 0.125; t.y += c * 0.125;
    t.gera = { t: k.tipo, w: k.w, h: k.h, p: pt.lado, e: est, s: semente, f: k.forma === 'oct' ? 'oct' : 'ret' };
    return t;
  }
  /* As paredes e os marcadores de uma cidade (inteira ou recortada): o contorno de cada prédio (fechado: entra-se pelo
     marcador), o muro dos pátios com o portão aberto, a muralha com os portões abertos, os postes. À noite, um lampião
     ao lado da porta da taverna, do templo, da casa do senhor e do quartel, e tochas nos portões. No bairro recortado,
     o que passa da borda é cortado nela (e o prédio cuja porta ficou de fora não ganha marcador). */
  function montar(sc, p, c, op) {
    const W = p.W, H = p.H;
    // o pedaço do segmento que fica dentro da cena (Liang-Barsky), ou null
    const corta = (x1, y1, x2, y2) => {
      let t0 = 0, t1 = 1;
      const dx = x2 - x1, dy = y2 - y1;
      for (const [pp, qq] of [[-dx, x1], [dx, W - x1], [-dy, y1], [dy, H - y1]]) {
        if (pp === 0) { if (qq < 0) return null; continue; }
        const t = qq / pp;
        if (pp < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
      }
      if (t1 - t0 < 1e-6) return null;
      return [x1 + dx * t0, y1 + dy * t0, x1 + dx * t1, y1 + dy * t1];
    };
    const parede = (x1, y1, x2, y2, k, extra) => {
      const s = p.recorte ? corta(x1, y1, x2, y2) : [x1, y1, x2, y2];
      if (!s || Math.hypot(s[2] - s[0], s[3] - s[1]) < 0.05) return;
      sc.walls.push(Object.assign({ id: uid('wl'), k: k || 'wall', x1: s[0] * c, y1: s[1] * c, x2: s[2] * c, y2: s[3] * c, open: false, locked: false }, extra || null));
    };
    const dentro = (x, y) => x >= 0 && y >= 0 && x <= W - 1 && y <= H - 1;
    const noite = sc.tone === 'noite' || sc.tone === 'breu', poste = Props.P[p.poste] ? p.poste : 'lampiao';
    const objeto = (id, x, y) => { if (dentro(x, y) && Props.P[id]) sc.tokens.push(Props.novo(sc, id, x * c, y * c, 1, false)); };
    p.predios.forEach((k, i) => {
      for (const s of Estilos.paredesDaCasa(Object.assign({}, k, { porta: null, janelas: [] }))) parede(s.x1, s.y1, s.x2, s.y2);
      const pt = k.porta, mx = (pt.x1 + pt.x2) / 2, my = (pt.y1 + pt.y2) / 2;
      if (!(mx > 0.2 && my > 0.2 && mx < W - 0.2 && my < H - 0.2)) return;
      sc.tokens.push(marcador(sc, k, c, p.estilo, (sub(p.seed, 50 + i) % 2147483000) + 1));
      // à noite, o lampião ao lado da porta (do lado de fora)
      if (noite && ['taverna', 'templo', 'senhor', 'quartel'].includes(k.tipo)) {
        const lx = pt.lado === 'o' ? k.x - 1 : pt.lado === 'l' ? k.x + k.w : Math.max(pt.x1, pt.x2);
        const ly = pt.lado === 'n' ? k.y - 1 : pt.lado === 's' ? k.y + k.h : Math.max(pt.y1, pt.y2);
        objeto(poste, lx, ly);
      }
    });
    for (const pt of p.patios) {
      for (const l of pt.tumulos || []) objeto('tumulo', l.x, l.y);
      const g = pt.portao, largo = g.lado === 'n' || g.lado === 's' ? { x1: g.x1 - 1, x2: g.x2 + 1 } : { y1: g.y1 - 1, y2: g.y2 + 1 };
      for (const s of Estilos.paredesDaCasa({ x: pt.x, y: pt.y, w: pt.w, h: pt.h, forma: 'ret', porta: Object.assign({}, g, largo), janelas: [] })) parede(s.x1, s.y1, s.x2, s.y2, s.k, s.k === 'door' ? { open: true } : null);
    }
    if (p.ring) {
      const ring = p.ring.concat([p.ring[0]]);
      for (let i = 0; i < 8; i++) {
        const a = ring[i], b = ring[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
        const cortes = p.portoes.map(v => ({ t: (v.x - a[0]) * ux + (v.y - a[1]) * uy, d: Math.abs((v.x - a[0]) * uy - (v.y - a[1]) * ux) })).filter(q => q.d < 0.6 && q.t > 0 && q.t < L).map(q => q.t).sort((m, n) => m - n);
        let t0 = 0;
        for (const t of cortes) {
          if (t - 1.8 > t0) parede(a[0] + ux * t0, a[1] + uy * t0, a[0] + ux * (t - 1.8), a[1] + uy * (t - 1.8));
          parede(a[0] + ux * (t - 1.8), a[1] + uy * (t - 1.8), a[0] + ux * (t + 1.8), a[1] + uy * (t + 1.8), 'door', { open: true });
          t0 = t + 1.8;
        }
        if (L > t0) parede(a[0] + ux * t0, a[1] + uy * t0, b[0], b[1]);
      }
      // à noite, as tochas dos portões (por dentro, uma de cada lado)
      if (noite) for (const g of p.portoes) {
        const horiz = g.lado === 'n' || g.lado === 's', dentroX = g.lado === 'o' ? 1 : g.lado === 'l' ? -1 : 0, dentroY = g.lado === 'n' ? 1 : g.lado === 's' ? -1 : 0;
        for (const s of [-1, 1]) objeto('tocha', Math.floor(g.x + (horiz ? s * 2.6 : dentroX * 1.2)), Math.floor(g.y + (horiz ? dentroY * 1.2 : s * 2.6)));
      }
    }
    for (const l of p.postes) objeto(poste, l.x, l.y);
    // o relevo (as áreas de terreno, com a altura) e as formas de enfeite (travadas: arte de fundo)
    if (!op || op.relevo !== false) {
      for (const r of p.relevo || []) sc.shapes.push(Estilos.terrenoNaCena(r, c, 0, 0));
      for (const f of p.formas || []) sc.shapes.push(Estilos.formaNaCena(f, c, 0, 0));
    }
  }
  // os dados com que o mapa de bairros refaz a cidade (para recortar um bairro)
  // (o traçado vai sempre pela semente dele: refazer a cidade dá a mesma, mesmo quando um prédio travado não coube)
  const geradoDe = (p, o) => ({ lugar: 'cidade', o: Object.assign({}, o, { modo: 'bairros' }), seed: p.seed, trava: Object.assign({ predios: [] }, travaDe(p), { ruas: p.sRuas }) });
  /* Monta a cena do plano. ex: { hora, clima, o } — a hora, o clima e as escolhas (o mapa de bairros as guarda). */
  async function criar(p, nome, ex) {
    ex = ex || {};
    const bairros = p.modo === 'bairros';
    const sc = newScene(String(nome || '').trim().slice(0, 60) || nomePadrao(p));
    if (ex && typeof ex.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(ex.id) && !Store.S.scenes[ex.id]) sc.id = ex.id;   // (o id que o Mapa-múndi já ligou ao marcador)
    const tom = TONES.find(t => t.id === ex.hora) || TONES[0];
    sc.tone = tom.id; sc.light = tom.light;
    sc.weather = { k: WEATHERS.some(w => w[0] === ex.clima) ? ex.clima : '', pow: 0.6 };
    sc.bgColor = (Vila.PAL[p.terreno] || Vila.PAL.campo).base;
    sc.bg.stretch = true;
    if (bairros) {
      // a cidade vista de longe: cada quadrado vale dois (3 m); um marcador em cada bairro
      sc.cols = Math.ceil(p.W / 2); sc.rows = Math.ceil(p.H / 2); sc.grid.unit = 3;
      sc.fog.dynamic = false;
      try { const cv = pintar(p, resolucao(sc.cols, sc.rows) / 2, true); const a = await Assets.fromCanvas(cv, 'bg', sc.name); sc.bg.asset = a.id; } catch (e) { console.error(e); }
      for (const [b, info] of Object.entries(BAIRROS)) {
        const L = LETRA[b], cel = [];
        for (let j = 0; j < p.H; j++) for (let i = 0; i < p.W; i++) if (p.bairros.grade[j * p.W + i] === L) cel.push([i, j]);
        if (!cel.length) continue;
        // no meio do bairro (a casa dele mais perto do centro das casas dele)
        const mx = cel.reduce((s, q) => s + q[0], 0) / cel.length, my = cel.reduce((s, q) => s + q[1], 0) / cel.length;
        const [ci, cj] = cel.reduce((m, q) => (Math.hypot(q[0] - mx, q[1] - my) < Math.hypot(m[0] - mx, m[1] - my) ? q : m));
        const t = Props.novo(sc, 'entrada', Math.floor(ci / 2) * sc.cell, Math.floor(cj / 2) * sc.cell, 1, true);
        t.name = 'Entrada: ' + info.curto; t.gera = { b };
        sc.tokens.push(t);
      }
      // o relevo, na escala do mapa (cada quadrado vale dois)
      if (ex.relevo !== false) for (const r of p.relevo || []) sc.shapes.push(Estilos.terrenoNaCena(Estilos.moverRelevo(r, 0, 0, 0.5), sc.cell, 0, 0));
      sc.gerado = geradoDe(p, ex.o || {});
    } else {
      sc.cols = p.W; sc.rows = p.H;
      sc.fog.dynamic = true; sc.fog.explored = true;
      try { const cv = pintar(p, resolucao(p.W, p.H), false); const a = await Assets.fromCanvas(cv, 'bg', sc.name); sc.bg.asset = a.id; } catch (e) { console.error(e); }
      montar(sc, p, sc.cell, { relevo: ex.relevo !== false });
    }
    normalizeScene(sc);
    Store.addScene(sc); Persist.scene(sc.id); Persist.meta();
    return sc;
  }

  /* ================= o bairro, recortado da cidade ================= */
  /* O pedaço da cidade que é o bairro b: a caixa das casas dele, com três quadrados de folga, e tudo o que cai nela
     (deslocado para começar em 0). O que fica com um pedaço dentro (um prédio, um pátio) entra inteiro no plano; o
     desenho e as paredes param na borda da cena. */
  function recorte(p, b) {
    const L = LETRA[b];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let j = 0; j < p.H; j++) for (let i = 0; i < p.W; i++) if (p.bairros.grade[j * p.W + i] === L) { x0 = Math.min(x0, i); y0 = Math.min(y0, j); x1 = Math.max(x1, i + 1); y1 = Math.max(y1, j + 1); }
    if (!Number.isFinite(x0)) return null;
    x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 3); x1 = Math.min(p.W, x1 + 3); y1 = Math.min(p.H, y1 + 3);
    const W = x1 - x0, H = y1 - y0, mv = ([x, y]) => [x - x0, y - y0];
    const dentro = (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
    const toca = q => q.x < x1 && q.x + q.w > x0 && q.y < y1 && q.y + q.h > y0;
    const cai = r => { const [a, b, c2, d] = Estilos.caixaDe(r); return a < W && c2 > 0 && b < H && d > 0; };
    // as formas (que não são cortadas na borda): só as que cabem inteiras; o cordão de bandeirinhas, inteiro ou nada
    const inteira = f => { const [a, b, c2, d] = Estilos.caixaDe(f); return a >= 0 && b >= 0 && c2 <= W && d <= H; };
    const movidas = (p.formas || []).map(f => Estilos.moverRelevo(f, -x0, -y0)), gruposFora = new Set(movidas.filter(f => f.g && !inteira(f)).map(f => f.g));
    const formasNoRecorte = movidas.filter(f => (f.g ? !gruposFora.has(f.g) : inteira(f)));
    const desloca = q => Object.assign({}, q, { x: q.x - x0, y: q.y - y0 });
    const lado = s => ({ lado: s.lado, x1: s.x1 - x0, y1: s.y1 - y0, x2: s.x2 - x0, y2: s.y2 - y0 });
    let grade = '';
    for (let j = y0; j < y1; j++) grade += p.bairros.grade.slice(j * p.W + x0, j * p.W + x1);
    return Object.assign({}, p, {
      W, H, recorte: { x0, y0, b }, modo: 'completa',
      ring: p.ring ? p.ring.map(mv) : null, portoes: p.portoes.map(g => Object.assign({}, g, { x: g.x - x0, y: g.y - y0 })),
      ruas: p.ruas.map(ru => Object.assign({}, ru, { pts: ru.pts.map(mv) })), praca: Object.assign({}, p.praca, { x: p.praca.x - x0, y: p.praca.y - y0 }),
      rio: p.rio ? { pts: p.rio.pts.map(mv), hw: p.rio.hw } : null, pontes: p.pontes.map(desloca),
      largo: p.largo && toca(p.largo) ? Object.assign(desloca(p.largo), { palco: p.largo.palco ? desloca(p.largo.palco) : null }) : null,
      barracas: p.barracas.filter(toca).map(desloca),
      patios: p.patios.filter(toca).map(q => Object.assign(desloca(q), { portao: lado(q.portao), lago: q.lago ? desloca(q.lago) : undefined, torre: q.torre ? desloca(q.torre) : undefined, alvos: (q.alvos || []).map(desloca), tumulos: (q.tumulos || []).map(desloca) })),
      predios: p.predios.filter(toca).map(k => Object.assign(desloca(k), { porta: lado(k.porta) })),
      quintais: (p.quintais || []).filter(toca).map(desloca),
      arvores: p.arvores.filter(a => a.x > x0 - 1.5 && a.x < x1 + 1.5 && a.y > y0 - 1.5 && a.y < y1 + 1.5).map(desloca),
      postes: p.postes.filter(l => dentro(l.x, l.y)).map(desloca),
      pieres: (p.pieres || []).filter(toca).map(desloca),
      relevo: (p.relevo || []).map(r => Estilos.moverRelevo(r, -x0, -y0)).filter(cai),
      formas: formasNoRecorte,
      bairros: { quad: p.bairros.quad, grade },
    });
  }
  /* Gera a cena de um bairro a partir do marcador dele no mapa de bairros: o plano é refeito com o que a cena guardou
     (sc.gerado), o bairro é recortado e vira uma cena filha do mapa, com a Saída de volta e o marcador já ligado. */
  async function criarBairro(fora, t, nome) {
    const g = fora.gerado, p0 = gerar(Object.assign({}, g.o, { seed: g.seed, trava: g.trava, modo: 'completa' })), p = recorte(p0, t.gera.b);
    if (!p) throw new Error('esse bairro não existe mais nesta cidade');
    const sc = newScene(String(nome || '').trim().slice(0, 60) || `${fora.name} — ${BAIRROS[t.gera.b].curto}`);
    sc.cols = p.W; sc.rows = p.H; sc.tone = fora.tone; sc.light = fora.light; sc.weather = Object.assign({}, fora.weather);
    sc.fog.dynamic = true; sc.fog.explored = true; sc.bg.stretch = true;
    sc.bgColor = (Vila.PAL[p.terreno] || Vila.PAL.campo).base;
    const cv = pintar(p, resolucao(p.W, p.H), false), a = await Assets.fromCanvas(cv, 'bg', sc.name); sc.bg.asset = a.id;
    montar(sc, p, sc.cell, { relevo: !(g.o && g.o.relevo === false) });
    // a Saída de volta: na praça, ao lado da fonte (se a praça cai no bairro); senão, na beira do recorte mais perto dela
    const naPraca = p.praca.x > 1 && p.praca.y > 1 && p.praca.x < p.W - 1 && p.praca.y < p.H - 1;
    const sx = clamp(Math.round(p.praca.x - 0.5 + (naPraca ? Math.max(2, p.praca.r - 1.2) : 0)), 1, p.W - 2), sy = clamp(Math.round(p.praca.y - 0.5), 1, p.H - 2);
    const s = Props.novo(sc, 'saida', sx * sc.cell, sy * sc.cell, 1, true);
    s.cena = fora.id; sc.tokens.push(s);
    normalizeScene(sc);
    Store.addScene(sc); Persist.scene(sc.id);
    UI.porNaFamilia(sc.id, fora.id); UI.herdarCampanha(sc.id, fora.id);
    return { sc, p };
  }
  // A janela do bairro: a prévia do pedaço da cidade e o nome; "Criar a cena" gera, liga o marcador e vai para lá.
  function abrirBairro(t) {
    const fora = Store.scene(), g = fora && fora.gerado;
    if (!isGM() || !g || g.lugar !== 'cidade' || !t || !t.gera || !BAIRROS[t.gera.b]) { UI.toast('Este marcador não sabe de que cidade ele é.'); return; }
    const K = UI.kit, { field, note } = K;
    let p = null;
    try { p = recorte(gerar(Object.assign({}, g.o, { seed: g.seed, trava: g.trava, modo: 'completa' })), t.gera.b); } catch (e) { console.error(e); }
    if (!p) { UI.toast('Esse bairro não existe mais nesta cidade.'); return; }
    const cv = h('canvas', { class: 'ger-cv', id: 'bai-prev', width: 460, height: 330, 'aria-label': 'Prévia do bairro' });
    try {
      const pc = Math.max(4, Math.floor(Math.min(460 / p.W, 330 / p.H))), fundo = pintar(p, pc, false), g2 = cv.getContext('2d');
      cv.width = fundo.width; cv.height = fundo.height; g2.drawImage(fundo, 0, 0);
      if (!(g.o && g.o.relevo === false)) Estilos.relevoNaPrevia(g2, p.relevo, p.formas, pc, 1.5);
    } catch (e) { console.error(e); }
    const inNome = h('input', { id: 'bai-nome', class: 'in', type: 'text', maxlength: 60, autocomplete: 'off', value: `${fora.name} — ${BAIRROS[t.gera.b].curto}`, 'aria-label': 'Nome da cena' });
    UI.modal({
      title: 'Gerar ' + BAIRROS[t.gera.b].n, wide: true,
      body: h('div', { class: 'ger' }, cv, h('p', { class: 'note', id: 'bai-resumo', text: `${p.predios.length} ${p.predios.length === 1 ? 'prédio' : 'prédios'} · ${p.W} × ${p.H} quadrados, na escala de batalha (1,5 m).` }), field('Nome da cena', inNome, 'stack'),
        note('Sai uma cena nova com este pedaço da cidade, do jeito que ele está no mapa: as paredes de cada prédio, o marcador de Entrada na porta (dois cliques geram o interior) e a Saída de volta para o mapa. A cena fica dentro do mapa, na lista de cenas.')),
      actions: [{ label: 'Cancelar' }, {
        label: 'Criar a cena', kind: 'primary', keep: true, run: () => {
          const b = UI.kit.card() && UI.kit.card().querySelector('.modal-a .btn.primary');
          if (b) { b.disabled = true; b.textContent = 'Criando…'; }
          criarBairro(fora, t, inNome.value).then(({ sc }) => {
            UI.closeModal();
            if (Store.S.current === fora.id && Store.get('tokens', t.id)) UI.ligarObjeto(t, sc.id);
            UI.switchScene(sc.id);
            UI.toast(`"${sc.name}" criada, dentro de "${fora.name}". A Saída leva de volta ao mapa.`, { long: true });
          }, err => { console.error(err); if (b) { b.disabled = false; b.textContent = 'Criar a cena'; } UI.toast('Não deu para criar a cena: ' + ((err && err.message) || 'falha ao guardar o fundo') + '.'); });
          return false;
        },
      }],
    });
  }

  /* ================= a prévia e o lugar, para a janela do gerador ================= */
  function resumo(p) {
    const n = p.predios.length;
    return `${n} ${n === 1 ? 'prédio' : 'prédios'}` + (n < p.pedidos ? ` (couberam ${n} dos ${p.pedidos})` : '') + ` · ${p.W} × ${p.H} quadrados` + (p.modo === 'bairros' ? ` (no mapa, ${Math.ceil(p.W / 2)} × ${Math.ceil(p.H / 2)})` : '') +
      (p.ring ? ' · muralha com ' + p.portoes.length + ' portões' : '') + (p.rio ? ' · rio com ' + p.pontes.length + (p.pontes.length === 1 ? ' ponte' : ' pontes') : '') + '.';
  }
  function previa(cv, p, maxW, maxH, op) {
    const cell = Math.max(3, Math.floor(Math.min((maxW || 460) / p.W, (maxH || 330) / p.H)));
    const fundo = pintar(p, cell, p.modo === 'bairros');
    cv.width = fundo.width; cv.height = fundo.height;
    const g = cv.getContext('2d');
    g.drawImage(fundo, 0, 0);
    if (!op || op.relevo !== false) Estilos.relevoNaPrevia(g, p.relevo, p.modo === 'bairros' ? [] : p.formas, cell, 1.5);
    return { cell };
  }
  function padrao() {
    const o = App.opt;
    const st = { modo: MODOS.some(m => m[0] === o.cidModo) ? o.cidModo : 'completa', tamanho: TAMANHOS[o.cidTam] ? o.cidTam : 'media', terreno: TERRENOS_C.some(x => x[0] === o.cidTer) ? o.cidTer : 'campo', rio: o.cidRio != null ? !!o.cidRio : true, muralha: o.cidMuro != null ? !!o.cidMuro : true, predios: 0 };
    st.predios = TAMANHOS[st.tamanho].padrao;
    return st;
  }
  const lembrar = st => { App.opt.cidModo = st.modo; App.opt.cidTam = st.tamanho; App.opt.cidTer = st.terreno; App.opt.cidRio = st.rio; App.opt.cidMuro = st.muralha; };
  function controles(st, K, mudou) {
    const { field, seg, toggle, stepper } = K, T = TAMANHOS[st.tamanho];
    return h('div', { class: 'ger-c' },
      field('Como', seg('cid-modo', st.modo, MODOS.map(([k, n]) => [k, n, null, k === 'completa' ? 'Uma cena grande, com a cidade inteira na escala de batalha' : 'A cidade vista de longe; cada bairro vira uma cena quando você quiser']), v => { st.modo = v; lembrar(st); mudou(true); }), 'stack'),
      h('div', { class: 'ger-l' },
        field('Tamanho', seg('cid-tam', st.tamanho, Object.keys(TAMANHOS).map(k => [k, TAMANHOS[k].n, null, TAMANHOS[k].W + ' × ' + TAMANHOS[k].H + ' quadrados']), v => { st.tamanho = v; st.predios = TAMANHOS[v].padrao; lembrar(st); mudou(true, { soltar: true }); }), 'stack'),
        field('Terreno', seg('cid-ter', st.terreno, TERRENOS_C.map(([k, n]) => [k, n]), v => { st.terreno = v; lembrar(st); mudou(true); }), 'stack')),
      h('div', { class: 'ger-l' },
        field('Prédios', stepper('cid-pred', st.predios, T.predios[0], T.predios[1], v => { st.predios = v; mudou(true); }, 'Quantos prédios'), 'stack'),
        toggle('cid-rio', st.rio, v => { st.rio = v; lembrar(st); mudou(true); }, 'Com rio (e pontes)'),
        toggle('cid-muro', st.muralha, v => { st.muralha = v; lembrar(st); mudou(true); }, 'Com muralha (portões abertos)')));
  }
  const opcoesDe = st => ({ modo: st.modo, tamanho: st.tamanho, terreno: st.terreno, rio: !!st.rio, muralha: !!st.muralha, predios: st.predios });
  function aplicarOpcoes(st, o) {
    if (MODOS.some(m => m[0] === o.modo)) st.modo = o.modo;
    if (TAMANHOS[o.tamanho]) st.tamanho = o.tamanho;
    if (TERRENOS_C.some(x => x[0] === o.terreno)) st.terreno = o.terreno;
    if (typeof o.rio === 'boolean') st.rio = o.rio;
    if (typeof o.muralha === 'boolean') st.muralha = o.muralha;
    const T = TAMANHOS[st.tamanho];
    st.predios = clamp(Math.round(Number(o.predios) || T.padrao), T.predios[0], T.predios[1]);
    lembrar(st);
  }
  const LUGAR = { id: 'cidade', n: 'Cidade', padrao, controles, opcoesDe, aplicarOpcoes, gerar: (st, comum) => gerar(Object.assign({}, st, comum)), previa, resumo, partes, parteEm, nomeDaParte, formaDaParte, travada, alternar, quantasTravadas, baseDe, travaDe, nomePadrao,
    criar: (p, nome, ex) => criar(p, nome, ex),
    dica: 'Clique numa parte da prévia (um prédio, ou as ruas e a praça — o traçado) para travar: ela fica igual quando você gera outro.',
    nota: 'Cena completa: a cidade inteira numa cena grande, com as paredes de cada prédio e um marcador de Entrada (só seu) na porta de cada um — dois cliques nele geram o interior. Mapa de bairros: a cidade vista de longe, com um marcador em cada bairro — dois cliques geram o bairro, recortado da cidade, numa cena dentro do mapa. Nada sai escrito; tudo continua editável.',
    feito: (sc, p) => (p.modo === 'bairros' ? `"${sc.name}" criada: o mapa, com um marcador em cada bairro (dois cliques geram o bairro).` : `"${sc.name}" criada: ${p.predios.length} prédios, cada um com o marcador de Entrada na porta (dois cliques geram o interior).`) };
  return { TAMANHOS, MODOS, BAIRROS, NOME_TIPO, GRANDES, gerar, pintar, montar, criar, recorte, criarBairro, abrirBairro, limparTrava, parteEm, alternar, travada, travaDe, LUGAR };
})();
