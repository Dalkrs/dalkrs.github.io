/* ---------------------------------------------------------------
   10f6. RUÍNAS — a aba Ruínas (lote 7, parte 4b-3b)
   Uma aba da janela "Gerar um lugar…", feita com o motor dos encontros (Encontro.motor). O que sobrou lá em cima,
   com a entrada da masmorra (um marcador de Entrada, oculto, que gera o nível 1 lá embaixo — pela Masmorra):
   · o templo caído: o estilóbato de lajes rachadas com a escadaria na frente, as colunas (de pé, quebradas ou caídas
     por cima da grama), a cela com as paredes em pedaços, o altar quebrado, as estátuas (uma tombada) e a escada da
     cripta;
   · a torre tombada: a base redonda de pé (com a porta e as brechas, a escada em caracol quebrada e a escada que desce)
     e o corpo da torre deitado no chão, em pedaços, até as ameias espalhadas;
   · o forte em ruínas: a muralha com as brechas (o adarve onde ela está de pé), as torres dos cantos (algumas caídas),
     o portão arrombado, o pátio com o poço, o alojamento sem teto, a torre de menagem (com a escada que desce) e a
     fogueira apagada de quem passou por ali;
   · o círculo de pedras: o paredão de rocha com a boca da caverna e, no descampado, o círculo de menires (uns caídos)
     com a pedra do altar no meio;
   · a boca da mina: o paredão com a entrada escorada, os trilhos até o monte de escória, o vagonete, o barracão.
   Duas chaves: a entrada da masmorra e o mato (a hera nas pedras, as árvores entrando nas ruínas). Nada sai escrito.
   --------------------------------------------------------------- */
const Ruinas = (() => {
  const TAU = Math.PI * 2, MO = Encontro.motor;
  const TIPOS = [['templo', 'Templo caído'], ['torre', 'Torre tombada'], ['forte', 'Forte em ruínas'], ['circulo', 'Círculo de pedras'], ['mina', 'Boca da mina']];
  const NOME = { templo: 'Templo caído', torre: 'Torre tombada', forte: 'Forte em ruínas', circulo: 'Círculo de pedras', mina: 'Boca da mina' };
  const DICA = {
    templo: 'O estilóbato com a escadaria, as colunas (de pé, quebradas, caídas), a cela em pedaços, o altar quebrado — e a escada da cripta',
    torre: 'A base redonda de pé, com a escada que desce, e o corpo da torre deitado no chão, em pedaços',
    forte: 'A muralha com as brechas, as torres dos cantos, o portão arrombado, o pátio, o alojamento e a torre de menagem',
    circulo: 'O círculo de menires com a pedra do altar e o paredão de rocha com a boca da caverna',
    mina: 'O paredão com a entrada escorada da mina, os trilhos, o vagonete, o monte de escória e o barracão',
  };
  // o nível de baixo que a entrada de cada lugar gera (a Masmorra)
  const MASMORRA = { templo: 'cripta', torre: 'pedra', forte: 'pedra', circulo: 'caverna', mina: 'mina' };
  const ENTRADA_TXT = { templo: 'a escada da cripta', torre: 'a escada que desce, na base', forte: 'a escada que desce, na torre de menagem', circulo: 'a boca da caverna', mina: 'a entrada da mina' };
  const TAMANHOS = { pequeno: { n: 'Pequeno', W: 36, H: 28 }, medio: { n: 'Médio', W: 44, H: 34 }, grande: { n: 'Grande', W: 52, H: 40 } };
  const TERRENOS_R = [['campo', 'Campo'], ['floresta', 'Floresta'], ['areia', 'Deserto'], ['neve', 'Neve']];
  const TER_DE = { campo: 'campo', floresta: 'floresta', areia: 'deserto', neve: 'neve' };
  // a pedra das ruínas em cada terreno: [clara, média, escura, a junta]
  const PEDRA = { campo: ['#b1ab9f', '#938d82', '#6f6a61', '#4a463f'], floresta: ['#a6a598', '#87877a', '#66665b', '#43443b'], areia: ['#d8be92', '#bea276', '#957b56', '#6c573a'], neve: ['#cdd1d5', '#adb2b7', '#868b91', '#5f6369'] };
  const ROCHA = { campo: ['#9a958b', '#77736a', '#4f4c46'], floresta: ['#8e8d82', '#6c6c62', '#474840'], areia: ['#c9a670', '#a5834f', '#6d5434'], neve: ['#bfc6cc', '#929aa2', '#626a72'] };
  const OPOSTO = { s: 'n', n: 's', o: 'l', l: 'o' };
  const DIR = { s: [0, 1], n: [0, -1], o: [-1, 0], l: [1, 0] };

  /* ================= o plano (conta pura) ================= */
  // a trava: a semente do traçado; vale enquanto o lugar e o tamanho forem os mesmos (as chaves e o terreno não mexem nele)
  function limparTrava(t, o) {
    if (!t || typeof t !== 'object' || t.tipo !== o.tipo || t.tamanho !== o.tamanho) return null;
    const s = Math.round(Number(t.s));
    return Number.isFinite(s) && s >= 1 && s <= 2147483647 ? { s } : null;
  }
  // o eixo do lugar: "frente" é o lado do mapa para onde a frente olha (a escadaria, o portão, o descampado); u corre ao
  // longo da frente e v vai da frente para o fundo
  function eixo(fr, cx, cy) {
    const [dx, dy] = DIR[fr], vx = -dx, vy = -dy, ux = -vy, uy = vx;      // (v: para dentro, do lado da frente para o fundo)
    return { fr, cx, cy, ux, uy, vx, vy, pt: (u, v) => [cx + ux * u + vx * v, cy + uy * u + vy * v], ang: Math.atan2(vy, vx) };
  }
  // os pontos de um polígono regular (a torre, a coluna)
  const roda = (cx, cy, r, n, a0) => { const out = []; for (let k = 0; k < n; k++) { const a = (a0 || 0) + (k / n) * TAU; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return out; };
  // um trecho de parede em ruína: em pé (parede, tapa a visão), baixo (mureta: deixa ver, não deixa passar) ou caído
  // (nada, só o entulho pintado); o desenho junto
  function trechoDeParede(C, a, b, estado, esp) {
    const { K, P } = C;
    if (estado === 'cai') { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; K.pinta(2, 'entulhoRuina', { x: m[0], y: m[1], r: Math.max(0.8, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.45), cores: C.pedra }); return; }
    P.paredes.push({ k: estado === 'pe' ? 'wall' : 'mureta', x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
    K.pinta(2, 'paredeRuina', { a, b, esp: esp || 0.5, alta: estado === 'pe', cores: C.pedra });
    K.marcaLinha([a, b], (esp || 0.5) / 2 + 0.05, 3, true);
  }
  // as paredes de uma volta (ou de um lado), em pedaços: cada pedaço em pé, baixo ou caído; as aberturas (a porta) ficam
  function paredeEmPedacos(C, pts, op) {
    const { K } = C;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 0.05) continue;
      const n = Math.max(1, Math.round(L / (op.pedaco || 2.2)));
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n, p0 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], p1 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
        const m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
        if (op.abertura && op.abertura(m)) continue;
        const sorte = K.rT();
        trechoDeParede(C, p0, p1, sorte < (op.pe == null ? 0.55 : op.pe) ? 'pe' : sorte < (op.pe == null ? 0.8 : op.pe + 0.25) ? 'baixo' : 'cai', op.esp);
      }
    }
  }
  // a coluna: de pé (o desenho, o obstáculo e as paredes de visão), quebrada (o toco) ou caída (deitada para fora)
  function coluna(C, x, y, rr, estado, angCai) {
    const { K, P } = C;
    if (estado === 'pe') {
      K.pinta(2, 'colunaRuina', { x, y, r: rr, cores: C.pedra, hera: K.rT() < 0.35 && C.com.mato });
      K.marcaCirc(x, y, rr, 3, true);
      K.visaoPoli(roda(x, y, rr * 0.92, 8, 0.2));
      P.cobertura.push({ x, y, r: rr });
    } else if (estado === 'toco') {
      K.pinta(2, 'tocoColuna', { x, y, r: rr, cores: C.pedra });
      K.marcaCirc(x, y, rr * 0.8, 3, true);
      P.relevo.push({ t: 'plataforma', alt: 0.8, k: 'ell', x: x - rr, y: y - rr, w: rr * 2, h: rr * 2 });
    } else {
      // caída: os tambores em fila, a partir da base
      const L = 3.6 + K.rT() * 1.4, ux = Math.cos(angCai), uy = Math.sin(angCai), fim = [x + ux * L, y + uy * L];
      K.pinta(2, 'colunaCaida', { x, y, ang: angCai, L, r: rr, cores: C.pedra, hera: K.rT() < 0.4 && C.com.mato });
      K.marcaLinha([[x, y], fim], rr * 0.85, 4, true);
      P.relevo.push({ t: 'plataforma', alt: 0.8, k: 'free', pts: [[x, y], [x + ux * L * 0.5, y + uy * L * 0.5], fim], sw: rr * 1.8 });
    }
  }
  // a escada que desce (o buraco escuro com os degraus) e a Entrada da masmorra nela; o lugar dela fica reservado mesmo
  // sem a chave (o chão livre), para a chave não mexer no resto do lugar
  function escadaQueDesce(C, x, y, lado) {
    const { K, P } = C;
    for (let j = y; j < y + 2; j++) for (let i = x; i < x + 2; i++) K.pos(i, j, 1);
    C.entrada = [lado === 'o' ? x + 1 : x, lado === 'n' ? y + 1 : y];
    if (!C.com.masmorra) return;
    K.pinta(2, 'escadaDesce', { x, y, w: 2, h: 2, lado, cores: C.pedra });
    P.relevo.push({ t: 'fosso', alt: -1.5, k: 'rect', x: x + 0.15, y: y + 0.15, w: 1.7, h: 1.7 });
  }

  /* ---- o templo caído ---- */
  function templo(C) {
    const { K, P, W, H, tamanho } = C, r = K.r;
    const fr = K.pick(['s', 'n', 'o', 'l']), deitado = fr === 'n' || fr === 's';
    const [larg, prof] = { pequeno: [9, 13], medio: [11, 16], grande: [13, 19] }[tamanho];
    const w = deitado ? larg : prof, h = deitado ? prof : larg;
    const x0 = Math.round(W / 2 - w / 2 + r(-2, 2)), y0 = Math.round(H / 2 - h / 2 + r(-1.5, 1.5));
    const E = eixo(fr, x0 + w / 2, y0 + h / 2), meiaL = larg / 2, meiaP = prof / 2;
    // o estilóbato (1 m) e a escadaria na frente (meio metro, dois de fundo)
    const base = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
    K.marcaPoli(base, 5, true);
    K.pinta(1, 'lajes', { x: x0, y: y0, w, h, cores: C.pedra, rachas: true });
    P.relevo.push({ t: 'plataforma', alt: 1, k: 'rect', x: x0, y: y0, w, h });
    const esc = [E.pt(-meiaL + 1, -meiaP - 2), E.pt(meiaL - 1, -meiaP - 2), E.pt(meiaL - 1, -meiaP), E.pt(-meiaL + 1, -meiaP)];
    const ex0 = Math.min(...esc.map(p => p[0])), ey0 = Math.min(...esc.map(p => p[1])), ex1 = Math.max(...esc.map(p => p[0])), ey1 = Math.max(...esc.map(p => p[1]));
    K.marcaPoli(esc, 1, true);
    K.pinta(1, 'degraus', { x: ex0, y: ey0, w: ex1 - ex0, h: ey1 - ey0, lado: fr, n: 4, cores: C.pedra });
    P.relevo.push({ t: 'plataforma', alt: 0.5, k: 'rect', x: ex0, y: ey0, w: ex1 - ex0, h: ey1 - ey0 });
    // as colunas do peristilo: de duas em duas casas, recuadas, em volta; umas quebradas, umas caídas para fora
    const cols = [];
    for (let u = -meiaL + 1; u <= meiaL - 1 + 1e-6; u += 2) { cols.push([u, -meiaP + 1, 'frente']); cols.push([u, meiaP - 1, 'fundo']); }
    for (let v = -meiaP + 3; v <= meiaP - 3 + 1e-6; v += 2) { cols.push([-meiaL + 1, v, 'lado']); cols.push([meiaL - 1, v, 'lado']); }
    for (const [u, v] of cols) {
      const [x, y] = E.pt(u, v), s = K.rT(), estado = s < 0.55 ? 'pe' : s < 0.82 ? 'toco' : 'cai';
      // (caem para fora do templo: na direção do centro para a coluna)
      const ang = Math.atan2(y - E.cy, x - E.cx) + r(-0.4, 0.4);
      coluna(C, x, y, 0.45, estado, ang);
    }
    // a cela: as paredes em pedaços (a porta de dois no meio da frente), o altar quebrado no fundo, as estátuas
    const cu = meiaL - 2.6, cv0 = -meiaP + 3.6, cv1 = meiaP - 2.4;
    const cela = [E.pt(-cu, cv0), E.pt(-cu, cv1), E.pt(cu, cv1), E.pt(cu, cv0), E.pt(-cu, cv0)];
    const porta = E.pt(0, cv0);
    K.pinta(1, 'lajes', { pts: cela.slice(0, 4), cores: C.pedra, escuro: true });
    paredeEmPedacos(C, cela, { pedaco: 2.2, esp: 0.55, abertura: m => Math.hypot(m[0] - porta[0], m[1] - porta[1]) < 1.15 });
    const [ax, ay] = E.pt(0, cv1 - 1.2);
    K.objeto('altar', Math.floor(ax), Math.floor(ay), { s: 0, n: 180, o: 90, l: 270 }[fr], v => v === 5 || v === 0 || v === 1);
    K.pinta(2, 'cacos', { x: ax + r(-0.8, 0.8), y: ay + r(0.3, 0.9), r: 0.9, cores: C.pedra });
    const [s1x, s1y] = E.pt(-cu + 1.2, cv0 + 1.4), [s2x, s2y] = E.pt(cu - 1.2, cv0 + 1.4);
    K.objeto('estatua', Math.floor(s1x), Math.floor(s1y), { s: 0, n: 180, o: 90, l: 270 }[fr], v => v === 5 || v === 0);
    K.pinta(2, 'estatuaCaida', { x: s2x, y: s2y, ang: r(0, TAU), cores: C.pedra });
    K.marcaCirc(s2x, s2y, 0.8, 4, true);
    // a escada da cripta, na cela, entre a porta e o altar
    { const [qx, qy] = E.pt(0, (cv0 + cv1) / 2 + 0.6); escadaQueDesce(C, Math.round(qx - 1), Math.round(qy - 1), OPOSTO[fr]); }
    // o frontão caído na frente, no chão, e o entulho em volta
    const [fx, fy] = E.pt(r(-meiaL * 0.6, meiaL * 0.6), -meiaP - 4.2);
    if (K.dentro(fx, fy, 2)) {
      const tri = [[fx - 1.8, fy + 0.7], [fx + 1.8, fy + 0.7], [fx, fy - 0.9]].map(([px, py]) => { const a = r(-0.6, 0.6), dx = px - fx, dy = py - fy; return [fx + dx * Math.cos(a) - dy * Math.sin(a), fy + dx * Math.sin(a) + dy * Math.cos(a)]; });
      K.pinta(2, 'frontao', { pts: tri, cores: C.pedra });
      K.marcaPoli(tri, 3, true); K.visaoPoli(tri);
      P.relevo.push({ t: 'plataforma', alt: 1.2, k: 'poly', pts: tri });
    }
    for (let k = 0; k < 6; k++) { const [x, y] = E.pt(r(-meiaL - 3, meiaL + 3), r(-meiaP - 3, meiaP + 3)); if (K.dentro(x, y, 1)) K.pinta(1, 'entulhoRuina', { x, y, r: r(0.5, 1.1), cores: C.pedra }); }
    // a trilha da frente até a borda do mapa
    const [tx, ty] = E.pt(0, -meiaP - 2.4), borda = fr === 's' ? [tx, H + 1] : fr === 'n' ? [tx, -1] : fr === 'o' ? [-1, ty] : [W + 1, ty];
    K.poeCaminho([borda, [(borda[0] + tx) / 2 + r(-2, 2), (borda[1] + ty) / 2 + r(-2, 2)], [tx, ty]], 'trilha');
    P.tracado.push({ k: 'poli', pts: base });
    K.foco(E.cx, E.cy);
    return { fr, caixa: [x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1] };
  }

  /* ---- a torre tombada ---- */
  function torre(C) {
    const { K, P, W, H, tamanho } = C, r = K.r;
    const R = { pequeno: 2.8, medio: 3.3, grande: 3.8 }[tamanho], Lb = R * 5.2;
    // a direção da queda (uma das oito, com lugar), a base do outro lado
    const angs = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
    let ang = 0, cx = W / 2, cy = H / 2;
    const emb = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const k = Math.floor(K.rT() * (i + 1)); [b[i], b[k]] = [b[k], b[i]]; } return b; };
    for (const a of emb(angs)) {
      const bx = W / 2 - Math.cos(a) * Lb * 0.45, by = H / 2 - Math.sin(a) * Lb * 0.45, fx = bx + Math.cos(a) * (R + Lb), fy = by + Math.sin(a) * (R + Lb);
      if (bx > R + 3 && by > R + 3 && bx < W - R - 3 && by < H - R - 3 && fx > 2 && fy > 2 && fx < W - 2 && fy < H - 2) { ang = a; cx = bx; cy = by; break; }
    }
    const ux = Math.cos(ang), uy = Math.sin(ang);
    // a base: a volta de pedra (vinte trechos), a porta do lado de onde se chega (o oposto da queda), duas brechas
    const n = 20, aPorta = ang + Math.PI + r(-0.5, 0.5), pts = roda(cx, cy, R, n, aPorta + Math.PI / n);
    pts.push(pts[0]);
    K.marcaCirc(cx, cy, R - 0.5, 5, true);
    K.pinta(1, 'chaoRedondo', { x: cx, y: cy, r: R - 0.2, cores: C.pedra });
    const brechas = [aPorta + r(1.6, 2.4), aPorta - r(1.6, 2.4)];
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[i + 1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], am = Math.atan2(m[1] - cy, m[0] - cx);
      const dif = x => Math.abs(Math.atan2(Math.sin(am - x), Math.cos(am - x)));
      if (dif(aPorta) < 0.5) continue;                                     // a porta (arrombada: três trechos, larga)
      if (brechas.some(x => dif(x) < 0.2)) { trechoDeParede(C, a, b, K.rT() < 0.5 ? 'cai' : 'baixo', 0.8); continue; }
      trechoDeParede(C, a, b, 'pe', 0.8);
    }
    K.pinta(2, 'caracol', { x: cx, y: cy, r: R - 0.9, a0: aPorta + Math.PI * 0.6, cores: C.pedra });
    P.relevo.push({ t: 'plataforma', alt: 2, k: 'free', pts: roda(cx, cy, R - 0.9, 7, aPorta + Math.PI * 0.6).slice(0, 4), sw: 0.9 });
    escadaQueDesce(C, Math.round(cx - 1 + Math.cos(aPorta + Math.PI) * 0.6), Math.round(cy - 1 + Math.sin(aPorta + Math.PI) * 0.6), null);
    // o corpo deitado: os pedaços do cilindro em fila (cada um tapa a visão, com dois metros), as ameias no fim
    const nP = Math.max(3, Math.round(Lb / 3.3));
    for (let k = 0; k < nP; k++) {
      const d = R + 1.7 + k * 3.35 + r(-0.2, 0.2), lat = r(-0.4, 0.4), px = cx + ux * d - uy * lat, py = cy + uy * d + ux * lat;
      const L = r(2.5, 3.1), larg = R * 1.75 * (1 - k * 0.04), a = ang + r(-0.18, 0.18);
      const ret = Estilos.retangulo(px, py, L, larg, a);
      K.pinta(2, 'tamborTorre', { x: px, y: py, L, larg, ang: a, cores: C.pedra, hera: K.rT() < 0.45 && C.com.mato });
      K.marcaPoli(ret, 3, true); K.visaoPoli(ret);
      P.relevo.push({ t: 'plataforma', alt: 2, k: 'poly', pts: ret });
      P.cobertura.push({ x: px, y: py, r: larg / 2 });
    }
    const fimD = R + 1.7 + nP * 3.35, fx = cx + ux * fimD, fy = cy + uy * fimD;
    K.pinta(2, 'ameias', { x: fx, y: fy, ang, r: R * 1.1, n: 10, cores: C.pedra });
    K.marcaCirc(fx, fy, R * 0.7, 4, true);
    for (let k = 0; k < 7; k++) { const a = r(0, TAU), d = r(R + 0.5, R + 4); K.pinta(1, 'entulhoRuina', { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: r(0.4, 0.9), cores: C.pedra }); }
    // a trilha até a porta
    const [px0, py0] = [cx + Math.cos(aPorta) * (R + 1.2), cy + Math.sin(aPorta) * (R + 1.2)];
    const lado = Math.abs(Math.cos(aPorta)) > Math.abs(Math.sin(aPorta)) ? (Math.cos(aPorta) > 0 ? 'l' : 'o') : Math.sin(aPorta) > 0 ? 's' : 'n';
    const borda = lado === 's' ? [px0, H + 1] : lado === 'n' ? [px0, -1] : lado === 'o' ? [-1, py0] : [W + 1, py0];
    K.poeCaminho([borda, [(borda[0] + px0) / 2, (borda[1] + py0) / 2], [px0, py0]], 'trilha');
    P.tracado.push({ k: 'circ', x: cx, y: cy, r: R + 0.6 }, { k: 'linha', pts: [[cx + ux * R, cy + uy * R], [fx, fy]], hw: R * 0.9 });
    K.foco(cx, cy);
    return { fr: lado };
  }

  /* ---- o forte em ruínas ---- */
  function forte(C) {
    const { K, P, W, H, tamanho } = C, r = K.r;
    const fr = K.pick(['s', 'n', 'o', 'l']), deitado = fr === 'n' || fr === 's';
    const [larg, prof] = { pequeno: [22, 16], medio: [28, 20], grande: [34, 24] }[tamanho];
    const w = Math.min(W - 6, deitado ? larg : prof), h = Math.min(H - 6, deitado ? prof : larg);
    const x0 = Math.round(W / 2 - w / 2), y0 = Math.round(H / 2 - h / 2);
    const E = eixo(fr, x0 + w / 2, y0 + h / 2), meiaL = (deitado ? w : h) / 2, meiaP = (deitado ? h : w) / 2;
    K.marcaPoli([[x0 + 0.5, y0 + 0.5], [x0 + w - 0.5, y0 + 0.5], [x0 + w - 0.5, y0 + h - 0.5], [x0 + 0.5, y0 + h - 0.5]], 5, true);
    K.pinta(0, 'patio', { x: x0, y: y0, w, h });
    // as torres dos cantos (r 2): de pé (a volta de pedra, 6 m) ou caídas (o monte de entulho)
    const cantos = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], RT = 2;
    const caidas = new Set();
    for (let k = 0; k < 4; k++) if (K.rT() < 0.3) caidas.add(k);
    cantos.forEach(([x, y], k) => {
      if (caidas.has(k)) { K.pinta(2, 'monteEntulho', { x, y, r: RT + 0.4, cores: C.pedra }); K.marcaCirc(x, y, RT, 3, true); P.relevo.push({ t: 'plataforma', alt: 1.5, k: 'ell', x: x - RT, y: y - RT, w: RT * 2, h: RT * 2 }); return; }
      const pts = roda(x, y, RT, 12, 0.2); pts.push(pts[0]);
      for (let i = 0; i < 12; i++) trechoDeParede(C, pts[i], pts[i + 1], 'pe', 0.7);
      K.pinta(2, 'topoTorre', { x, y, r: RT, cores: C.pedra });
      K.marcaCirc(x, y, RT, 3, true);
      P.relevo.push({ t: 'plataforma', alt: 6, k: 'ell', x: x - RT + 0.3, y: y - RT + 0.3, w: RT * 2 - 0.6, h: RT * 2 - 0.6 });
    });
    // a muralha: os quatro lados entre as torres, com as brechas; o portão no meio da frente
    const lados = [[cantos[0], cantos[1]], [cantos[1], cantos[2]], [cantos[2], cantos[3]], [cantos[3], cantos[0]]];
    const portao = E.pt(0, -meiaP);
    for (const [a, b] of lados) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      const t0 = RT, t1 = L - RT;
      // a brecha (uma por lado, às vezes): três a quatro casas, longe das torres
      const brecha = K.rT() < 0.6 ? (() => { const c = r(t0 + 3, t1 - 3), m = r(1.5, 2); return [c - m, c + m]; })() : null;
      const naFrente = MO.distLinha([a, b], portao[0], portao[1]) < 0.01;
      const cortes = [];
      if (brecha) cortes.push(brecha);
      if (naFrente) { const tp = (portao[0] - a[0]) * ux + (portao[1] - a[1]) * uy; cortes.push([tp - 1.6, tp + 1.6]); }
      cortes.sort((p, q) => p[0] - q[0]);
      let t = t0;
      const pedaco = (s0, s1) => { if (s1 - s0 < 0.3) return; const p0 = [a[0] + ux * s0, a[1] + uy * s0], p1 = [a[0] + ux * s1, a[1] + uy * s1]; trechoDeParede(C, p0, p1, 'pe', 1); P.relevo.push({ t: 'plataforma', alt: 4, k: 'free', pts: [p0, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], p1], sw: 1 }); };
      for (const [c0, c1] of cortes) { pedaco(t, c0); t = c1; }
      pedaco(t, t1);
      if (brecha) { const m = (brecha[0] + brecha[1]) / 2; K.pinta(2, 'monteEntulho', { x: a[0] + ux * m, y: a[1] + uy * m, r: (brecha[1] - brecha[0]) / 2 + 0.5, cores: C.pedra }); P.relevo.push({ t: 'plataforma', alt: 1, k: 'free', pts: [[a[0] + ux * brecha[0], a[1] + uy * brecha[0]], [a[0] + ux * brecha[1], a[1] + uy * brecha[1]]], sw: 1.6 }); }
    }
    // o portão arrombado (as folhas caídas)
    K.pinta(2, 'portaoQuebrado', { x: portao[0], y: portao[1], ang: E.ang });
    // a torre de menagem (sete por sete) no fundo, com a porta para o pátio e uma brecha; a escada que desce dentro dela
    // (a menagem fica do lado de lá do alojamento: lu é o lado do alojamento)
    const lu = K.rT() < 0.5 ? -1 : 1;
    const km = 3.5, [kx, ky] = E.pt(-lu * r(0.5, meiaL * 0.3), meiaP - km - 1.6);
    const kpts = [[kx - km, ky - km], [kx + km, ky - km], [kx + km, ky + km], [kx - km, ky + km], [kx - km, ky - km]];
    const kPorta = E.pt((kx - E.cx) * E.ux + (ky - E.cy) * E.uy, meiaP - 2 * km - 1.6);
    K.marcaPoli(kpts.slice(0, 4), 5, true);
    K.pinta(1, 'lajes', { pts: kpts.slice(0, 4), cores: C.pedra, escuro: true });
    paredeEmPedacos(C, kpts, { pedaco: 2.4, esp: 0.8, pe: 0.75, abertura: m => Math.hypot(m[0] - kPorta[0], m[1] - kPorta[1]) < 1.3 });
    escadaQueDesce(C, Math.round(kx - 1), Math.round(ky - 1 + 0.5), OPOSTO[fr]);
    // o alojamento sem teto: as paredes baixas num lado do pátio, com a porta; dentro, o entulho e as armas largadas
    // (o alojamento: comprido ao longo do lado da muralha; a porta no lado que dá para o meio do pátio)
    const [bx, by] = E.pt(lu * (meiaL - 4.2), 0), comp = Math.min(9, meiaP * 2 - 6), bw = deitado ? 5 : comp, bh = deitado ? comp : 5;
    const bpts = [[bx - bw / 2, by - bh / 2], [bx + bw / 2, by - bh / 2], [bx + bw / 2, by + bh / 2], [bx - bw / 2, by + bh / 2], [bx - bw / 2, by - bh / 2]];
    const bPorta = [bx - lu * E.ux * 2.5, by - lu * E.uy * 2.5];
    paredeEmPedacos(C, bpts, { pedaco: 1.8, esp: 0.5, pe: 0.15, abertura: m => Math.hypot(m[0] - bPorta[0], m[1] - bPorta[1]) < 1.2 });
    K.pinta(1, 'entulhoRuina', { x: bx, y: by, r: 1, cores: C.pedra });
    K.objetoPerto('armas', bx, by, 2, v => v === 5 || v === 0);
    // o poço no pátio, na metade da frente, do lado da menagem; a fogueira apagada de quem passou por ali, com os barris
    // (no pátio mesmo: nem dentro da menagem, nem dentro do alojamento, nem na boca do portão)
    const noPatio = (x, y) => {
      const u = (x - E.cx) * E.ux + (y - E.cy) * E.uy, v = (x - E.cx) * E.vx + (y - E.cy) * E.vy, uk = (kx - E.cx) * E.ux + (ky - E.cy) * E.uy;
      return !(Math.abs(u - uk) < km + 1.2 && v > meiaP - 2 * km - 4.4) && !(Math.abs(u - lu * (meiaL - 4.2)) < 3.7 && Math.abs(v) < comp / 2 + 1.2) && !(Math.abs(u) < 2.6 && v < -meiaP + 2.6);
    };
    const [wx, wy] = E.pt(-lu * meiaL * 0.35, -meiaP * 0.45);
    if (noPatio(Math.floor(wx) + 0.5, Math.floor(wy) + 0.5)) K.objeto('poco', Math.floor(wx), Math.floor(wy), 0, v => v === 5 || v === 0);
    // (num lugar livre do pátio, perto de onde se quer: nada de fogueira em cima da escada ou das paredes)
    let fogo = null;
    for (let k = 0; k < 40 && !fogo; k++) { const [gx, gy] = E.pt(lu * r(-1, 3), -meiaP * 0.15 + r(-2.5, 2.5)); if (noPatio(gx, gy) && K.livreCirc(gx, gy, 1.1, v => v === 5)) fogo = [gx, gy]; }
    if (fogo) {
      K.pinta(1, 'fogueiraApagada', { x: fogo[0], y: fogo[1] });
      K.marcaCirc(fogo[0], fogo[1], 0.8, 4, true);
      for (let k = 0; k < 2; k++) K.objetoPerto(K.rT() < 0.5 ? 'barril' : 'caixote', fogo[0], fogo[1], 2.5, v => v === 5 || v === 0);
    }
    // a trilha até o portão
    const [tx, ty] = E.pt(0, -meiaP - 1.2), borda = fr === 's' ? [tx, H + 1] : fr === 'n' ? [tx, -1] : fr === 'o' ? [-1, ty] : [W + 1, ty];
    K.poeCaminho([borda, [tx, ty]], 'trilha');
    P.tracado.push({ k: 'poli', pts: cantos });
    K.foco(E.cx, E.cy);
    return { fr };
  }

  /* ---- o paredão com a boca (o círculo de pedras, a boca da mina) ---- */
  // o paredão de rocha num dos lados do mapa, com a beira torta e o entalhe da boca no meio; devolve a boca
  function paredao(C, larguraBoca, fundoBoca) {
    const { K, W, H } = C, r = K.r;
    const lado = K.pick(['n', 's', 'o', 'l']), deitado = lado === 'n' || lado === 's', L = deitado ? W : H, D = (deitado ? H : W) * r(0.26, 0.32);
    // (a beira do paredão: em coordenadas t ao longo do lado e d para dentro do mapa a partir da borda)
    const P2 = (t, d) => (lado === 'n' ? [t, d] : lado === 's' ? [t, H - d] : lado === 'o' ? [d, t] : [W - d, t]);
    const tb = L / 2 + r(-L * 0.15, L * 0.15), beira = [], ond = [r(0, TAU), r(0, TAU)];
    for (let t = -1; t <= L + 1; t += 1) {
      let d = D + Math.sin(t * 0.35 + ond[0]) * 1.2 + Math.sin(t * 0.13 + ond[1]) * 1.6;
      // o entalhe da boca: a beira entra no paredão
      const dt = Math.abs(t - tb);
      if (dt <= larguraBoca / 2) d -= fundoBoca; else if (dt <= larguraBoca / 2 + 1) d -= fundoBoca * (larguraBoca / 2 + 1 - dt);
      beira.push(P2(t, d));
    }
    const pts = beira.concat([P2(L + 1, -1), P2(-1, -1)]);
    K.poePenhasco(pts, 8, C.rocha);
    const dBoca = D - fundoBoca + Math.sin(tb * 0.35 + ond[0]) * 1.2 + Math.sin(tb * 0.13 + ond[1]) * 1.6;
    const a = P2(tb, dBoca - 1), b = P2(tb, dBoca);
    return { lado, P2, tb, dBoca, D, frente: OPOSTO[lado], boca: P2(tb, dBoca - 0.5), dentro: Math.atan2(a[1] - b[1], a[0] - b[0]) };
  }

  /* ---- o círculo de pedras ---- */
  function circulo(C) {
    const { K, P, W, H, tamanho } = C, r = K.r;
    const pd = paredao(C, 3, 3.2);
    // a boca da caverna: o escuro no entalhe, o arco de rocha; a Entrada lá no fundo
    K.pinta(3, 'bocaCaverna', { x: pd.boca[0], y: pd.boca[1], ang: pd.dentro, larg: 3.2, cores: C.rocha });
    { const [ex, ey] = pd.P2(pd.tb, pd.dBoca + 0.4); C.entrada = [Math.floor(ex), Math.floor(ey)]; K.pos(Math.floor(ex), Math.floor(ey), 1); }
    // o círculo: no descampado, longe do paredão e das bordas
    const Rc = { pequeno: 4.2, medio: 5, grande: 5.8 }[tamanho], [cx, cy] = pd.P2(pd.tb + r(-6, 6), pd.D + Rc + 4.5 + r(0, 3));
    const ccx = clamp(cx, Rc + 2.5, W - Rc - 2.5), ccy = clamp(cy, Rc + 2.5, H - Rc - 2.5);
    K.marcaCirc(ccx, ccy, Rc + 1, 5, true);
    K.pinta(0, 'gramaPisada', { x: ccx, y: ccy, r: Rc + 1.2 });
    const nM = Math.round(Rc * 2.2), a0 = r(0, TAU);
    for (let k = 0; k < nM; k++) {
      const a = a0 + (k / nM) * TAU, x = ccx + Math.cos(a) * Rc, y = ccy + Math.sin(a) * Rc;
      if (K.rT() < 0.2) {
        // caído: deitado para fora
        const ret = Estilos.retangulo(x + Math.cos(a) * 0.7, y + Math.sin(a) * 0.7, 1.9, 0.75, a + r(-0.3, 0.3));
        K.pinta(2, 'menirCaido', { pts: ret, cores: C.rocha });
        K.marcaPoli(ret, 3, true);
        P.relevo.push({ t: 'plataforma', alt: 0.6, k: 'poly', pts: ret });
      } else {
        const ret = Estilos.retangulo(x, y, 0.95, 0.6, a + Math.PI / 2 + r(-0.15, 0.15));
        K.pinta(2, 'menir', { pts: ret, x, y, cores: C.rocha, hera: K.rT() < 0.3 && C.com.mato });
        K.marcaPoli(ret, 3, true); K.visaoPoli(ret);
        P.cobertura.push({ x, y, r: 0.6 });
      }
    }
    // a pedra do altar no meio, com as velas e as flores
    const alt = Estilos.retangulo(ccx, ccy, 2.4, 1.3, r(0, Math.PI));
    K.pinta(2, 'pedraAltar', { pts: alt, cores: C.rocha });
    K.marcaPoli(alt, 3, true);
    P.relevo.push({ t: 'plataforma', alt: 0.8, k: 'poly', pts: alt });
    K.objetoPerto('vela', ccx, ccy, 2, v => v === 5);
    K.objetoPerto('flores', ccx, ccy, 2.2, v => v === 5);
    // as pedras grandes ao pé do paredão
    for (let k = 0; k < 4; k++) { const [x, y] = pd.P2(r(2, (pd.lado === 'n' || pd.lado === 's' ? W : H) - 2), pd.D + r(1, 2.5)); if (Math.abs(x - pd.boca[0]) + Math.abs(y - pd.boca[1]) > 4 && K.livreCirc(x, y, 1)) K.pedraGrande(x, y, r(0.7, 1.1), C.rocha); }
    // o caminho: da borda do descampado, passando pelo círculo, até a boca
    const [bx, by] = pd.P2(pd.tb + r(-8, 8), (pd.lado === 'n' || pd.lado === 's' ? H : W) + 1);
    K.poeCaminho([[bx, by], [ccx + r(-2, 2), ccy + Rc + 1.5], pd.P2(pd.tb, pd.dBoca + 1.5)], 'trilha');
    P.tracado.push({ k: 'circ', x: ccx, y: ccy, r: Rc + 1 });
    K.foco(ccx, ccy);
    return { fr: pd.frente };
  }

  /* ---- a boca da mina ---- */
  function mina(C) {
    const { K, P, W, H } = C, r = K.r;
    const pd = paredao(C, 2.4, 2.6);
    K.pinta(3, 'portalMina', { x: pd.boca[0], y: pd.boca[1], ang: pd.dentro, larg: 2.6 });
    { const [ex, ey] = pd.P2(pd.tb, pd.dBoca + 0.4); C.entrada = [Math.floor(ex), Math.floor(ey)]; K.pos(Math.floor(ex), Math.floor(ey), 1); }
    // os trilhos da boca até o monte de escória, com o vagonete
    const dEsc = pd.dBoca + r(7, 10), tEsc = pd.tb + r(-5, 5), trilho = [pd.P2(pd.tb, pd.dBoca - 0.5), pd.P2(pd.tb, pd.dBoca + 2.5), pd.P2((pd.tb + tEsc) / 2, (pd.dBoca + dEsc) / 2), pd.P2(tEsc, dEsc - 1.6)];
    K.pinta(1, 'trilhoMina', { pts: trilho });
    K.marcaLinha(trilho, 0.6, 1, false);
    const [ex2, ey2] = pd.P2(tEsc, dEsc + 0.6);
    K.pinta(2, 'escoria', { x: ex2, y: ey2, r: 2.3 });
    K.marcaCirc(ex2, ey2, 2, 3, true);
    P.relevo.push({ t: 'plataforma', alt: 1.5, k: 'ell', x: ex2 - 2.2, y: ey2 - 2.2, w: 4.4, h: 4.4 });
    const [vx, vy] = trilho[2];
    K.pinta(2, 'vagoneteRuina', { x: vx, y: vy, ang: Math.atan2(trilho[3][1] - trilho[1][1], trilho[3][0] - trilho[1][0]) });
    // o barracão (fechado, com a Entrada), ao lado; os lampiões, os barris, as ferramentas, a lenha
    const lado = K.rT() < 0.5 ? -1 : 1, [hx, hy] = pd.P2(pd.tb + lado * r(5.5, 7.5), pd.D + r(2.5, 3.5)), dei = pd.lado === 'n' || pd.lado === 's';
    const hw = dei ? 5 : 4, hh = dei ? 4 : 5;
    K.predio({ tipo: 'casa', x: Math.round(hx - hw / 2), y: Math.round(hy - hh / 2), w: hw, h: hh, lado: pd.frente, aberto: false, interior: 'casa' });
    const [lx, ly] = pd.P2(pd.tb + 1.8, pd.dBoca + 0.8);
    K.objeto('lampiao', Math.floor(lx), Math.floor(ly), 0);
    for (let k = 0; k < 3; k++) K.objetoPerto(K.rT() < 0.5 ? 'barril' : 'caixote', hx, hy + 3, 3);
    K.pinta(2, 'lenha', { x: hx + 3.2 * lado, y: hy, ang: 0 });
    // o caminho até o pátio da mina
    const [bx, by] = pd.P2(pd.tb + r(-8, 8), (dei ? H : W) + 1);
    K.poeCaminho([[bx, by], pd.P2(pd.tb + r(-3, 3), pd.dBoca + 5), pd.P2(pd.tb, pd.dBoca + 1.8)], 'trilha');
    P.tracado.push({ k: 'poli', pts: [pd.P2(pd.tb - 3, pd.dBoca - 1), pd.P2(pd.tb + 3, pd.dBoca - 1), pd.P2(pd.tb + 3, pd.dBoca + 3), pd.P2(pd.tb - 3, pd.dBoca + 3)] });
    K.foco(...pd.P2(pd.tb, pd.dBoca + 4));
    return { fr: pd.frente };
  }

  const LUGARES_R = { templo, torre, forte, circulo, mina };
  function gerar(o) {
    o = o || {};
    const tipo = TIPOS.some(t => t[0] === o.tipo) ? o.tipo : 'templo';
    const tamanho = TAMANHOS[o.tamanho] ? o.tamanho : 'medio', T = TAMANHOS[tamanho], W = T.W, H = T.H;
    const terreno = TERRENOS_R.some(t => t[0] === o.terreno) ? o.terreno : o.terreno === 'deserto' ? 'areia' : 'campo';
    const estilo = Estilos.valido(o.estilo), seed = (Math.round(Number(o.seed)) >>> 0) || 1;
    const com = { masmorra: o.masmorra !== false, mato: o.mato !== false };
    const trava = limparTrava(o.trava, { tipo, tamanho });
    const sT = trava ? trava.s : (MO.sub(seed, 1) % 2147483000) + 1;
    const K = MO.contexto(W, H, TER_DE[terreno], 'ruinas', estilo, 'trilha', sT, terreno), P = K.P;
    const C = { K, P, W, H, tipo, tamanho, terreno, estilo, seed, com, pedra: PEDRA[terreno], rocha: ROCHA[terreno], entrada: null };
    P.paredes = [];
    LUGARES_R[tipo](C);
    // a entrada da masmorra: o marcador de Entrada (oculto), que gera o nível 1 (o tipo de baixo vem do lugar)
    const entradas = [];
    if (com.masmorra && C.entrada) entradas.push({ x: C.entrada[0], y: C.entrada[1], gera: { t: 'masmorra', m: MASMORRA[tipo], n: 1, tam: tamanho, e: estilo, s: (MO.sub(sT, 70) % 2147483000) + 1 } });
    // o mato: com a chave, a hera nas pedras e as árvores chegando perto; sem ela, as ruínas ficam limpas em volta
    const rV = mulberry((MO.sub(seed, 2) % 2147483000) + 1);
    if (!com.mato) P.dens = (x, y) => (Math.hypot(x - P.foco[0], y - P.foco[1]) < Math.min(W, H) * 0.45 ? 0.25 : 1);
    if (terreno === 'areia') P.densBase = 0.02;
    // (nas pedras: não no telhado do barracão)
    const noPredio = (x, y) => P.predios.some(q => x > q.x - 0.6 && x < q.x + q.w + 0.6 && y > q.y - 0.6 && y < q.y + q.h + 0.6);
    if (com.mato) for (let k = 0, n = Math.round(W * H / 60); k < n; k++) { const x = 1 + rV() * (W - 2), y = 1 + rV() * (H - 2), v = K.at(Math.floor(x), Math.floor(y)), rr = 0.5 + rV() * 0.9; if ((v === 3 || v === 5) && !noPredio(x, y)) K.pinta(3, 'hera', { x, y, r: rr, neve: terreno === 'neve', seco: terreno === 'areia' }); }
    MO.vegetacao(K, rV);
    MO.enfeites(K, rV);
    P.marcas = {};
    delete P.dens; delete P.esp;
    return Object.assign(P, { v: 1, lugar: 'ruinas', tipo, seed, sT, tamanho, com, entradas, travaTracado: !!trava, comMarcas: false, sitPedida: null, occ: Array.from(K.occ) });
  }

  /* ================= os desenhos ================= */
  const tom = (h, f) => Estilos.tom(h, f);
  const caminhoPts = (g, pts, c, fechar) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); if (fechar) g.closePath(); };
  // uma pedra lavrada (o bloco com a face clara, a quina escura e a sombra)
  function bloco(g, x, y, w, h, c, cores, rnd, ang) {
    g.save(); g.translate(x * c, y * c); if (ang) g.rotate(ang);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-w * c / 2 + c * 0.06, -h * c / 2 + c * 0.08, w * c, h * c);
    g.fillStyle = cores[Math.floor(rnd() * 2)]; g.fillRect(-w * c / 2, -h * c / 2, w * c, h * c);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(-w * c / 2, -h * c / 2, w * c, Math.max(1, h * c * 0.22));
    g.strokeStyle = cores[3]; g.lineWidth = Math.max(1, c * 0.035); g.strokeRect(-w * c / 2, -h * c / 2, w * c, h * c);
    g.restore();
  }
  const PR = {
    // as lajes do chão (o estilóbato, a cela, a menagem): grandes, desencontradas, rachadas, umas faltando (a terra aparece)
    lajes(g, o, c, rnd) {
      g.save();
      const x0 = o.pts ? Math.min(...o.pts.map(p => p[0])) : o.x, y0 = o.pts ? Math.min(...o.pts.map(p => p[1])) : o.y;
      const x1 = o.pts ? Math.max(...o.pts.map(p => p[0])) : o.x + o.w, y1 = o.pts ? Math.max(...o.pts.map(p => p[1])) : o.y + o.h;
      if (o.pts) { caminhoPts(g, o.pts, c, true); g.clip(); } else { g.beginPath(); g.rect(x0 * c, y0 * c, (x1 - x0) * c, (y1 - y0) * c); g.clip(); }
      g.fillStyle = o.escuro ? tom(o.cores[2], -0.1) : o.cores[2]; g.fillRect(x0 * c, y0 * c, (x1 - x0) * c, (y1 - y0) * c);
      for (let j = Math.floor(y0); j < y1; j++) {
        const des = (j % 2) * 0.5;
        for (let i = Math.floor(x0) - 1; i < x1; i++) {
          if (rnd() < 0.07) { g.fillStyle = '#5a4c36'; g.globalAlpha = 0.7; g.fillRect((i + des) * c, j * c, c, c); g.globalAlpha = 1; continue; }   // (a laje que falta)
          g.fillStyle = tom(o.escuro ? o.cores[1] : o.cores[0], (rnd() - 0.5) * 0.12 - (o.escuro ? 0.06 : 0));
          g.fillRect((i + des) * c + c * 0.04, j * c + c * 0.04, c * 0.92, c * 0.92);
          if (o.rachas && rnd() < 0.18) { g.strokeStyle = 'rgba(40,34,26,0.55)'; g.lineWidth = Math.max(1, c * 0.025); g.beginPath(); g.moveTo((i + des + rnd()) * c, j * c); g.lineTo((i + des + rnd()) * c, (j + 0.5) * c); g.lineTo((i + des + rnd()) * c, (j + 1) * c); g.stroke(); }
        }
      }
      g.restore();
      if (!o.pts) { g.save(); g.strokeStyle = o.cores[3]; g.lineWidth = Math.max(1.5, c * 0.08); g.strokeRect(o.x * c, o.y * c, o.w * c, o.h * c); g.restore(); }
    },
    // os degraus da escadaria (claros, cada um com a sombra do de cima)
    degraus(g, o, c, rnd) {
      const vert = o.lado === 'n' || o.lado === 's', n = o.n || 4;
      g.save();
      for (let k = 0; k < n; k++) {
        const t = k / n, f = -0.12 + t * 0.2;
        g.fillStyle = tom(o.cores[0], f + (rnd() - 0.5) * 0.04);
        let rx, ry, rw, rh;
        if (o.lado === 's') { rx = o.x; ry = o.y + (n - 1 - k) * o.h / n; rw = o.w; rh = o.h / n; }
        else if (o.lado === 'n') { rx = o.x; ry = o.y + k * o.h / n; rw = o.w; rh = o.h / n; }
        else if (o.lado === 'l') { rx = o.x + (n - 1 - k) * o.w / n; ry = o.y; rw = o.w / n; rh = o.h; }
        else { rx = o.x + k * o.w / n; ry = o.y; rw = o.w / n; rh = o.h; }
        g.fillRect(rx * c, ry * c, rw * c + 0.5, rh * c + 0.5);
        g.strokeStyle = 'rgba(30,26,20,0.45)'; g.lineWidth = Math.max(1, c * 0.03); g.strokeRect(rx * c, ry * c, rw * c, rh * c);
      }
      void vert;
      g.restore();
    },
    colunaRuina(g, o, c, rnd) {
      const x = o.x * c, y = o.y * c, R = o.r * c;
      g.save();
      g.fillStyle = 'rgba(0,0,0,0.38)'; g.beginPath(); g.arc(x + R * 0.3, y + R * 0.38, R * 1.05, 0, TAU); g.fill();
      const gr = g.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R * 1.1); gr.addColorStop(0, tom(o.cores[0], 0.1)); gr.addColorStop(1, o.cores[2]);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
      // as caneluras (os gomos da coluna)
      g.strokeStyle = 'rgba(40,36,30,0.35)'; g.lineWidth = Math.max(1, c * 0.02);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * R * 0.55, y + Math.sin(a) * R * 0.55); g.lineTo(x + Math.cos(a) * R * 0.97, y + Math.sin(a) * R * 0.97); g.stroke(); }
      g.strokeStyle = o.cores[3]; g.lineWidth = Math.max(1, c * 0.04); g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
      if (o.hera) PR.hera(g, { x: o.x + o.r * 0.3, y: o.y - o.r * 0.2, r: o.r * 0.9 }, c, rnd);
      g.restore();
    },
    tocoColuna(g, o, c, rnd) {
      const x = o.x * c, y = o.y * c, R = o.r * c;
      g.save();
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(x + R * 0.2, y + R * 0.25, R, 0, TAU); g.fill();
      g.fillStyle = o.cores[1]; g.beginPath();
      for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU, d = R * (0.82 + rnd() * 0.2); k ? g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d) : g.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
      g.closePath(); g.fill(); g.strokeStyle = o.cores[3]; g.lineWidth = Math.max(1, c * 0.035); g.stroke();
      g.fillStyle = o.cores[2]; g.beginPath(); g.arc(x - R * 0.15, y - R * 0.1, R * 0.35, 0, TAU); g.fill();
      for (let k = 0; k < 4; k++) { const a = rnd() * TAU, d = R * (1.2 + rnd() * 0.8); g.fillStyle = o.cores[rnd() < 0.5 ? 1 : 2]; g.fillRect(x + Math.cos(a) * d - c * 0.08, y + Math.sin(a) * d - c * 0.06, c * 0.16, c * 0.12); }
      g.restore();
    },
    // a coluna caída: os tambores deitados em fila, um pouco desencontrados
    colunaCaida(g, o, c, rnd) {
      g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang);
      const n = Math.max(3, Math.round(o.L / 0.9)), lt = o.L / n;
      for (let k = 0; k < n; k++) {
        const x = k * lt + lt / 2, dy = (rnd() - 0.5) * 0.12 * c, a = (rnd() - 0.5) * 0.12;
        g.save(); g.translate(x * c, dy); g.rotate(a);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-lt * c / 2 + c * 0.06, -o.r * c + c * 0.1, lt * c * 0.94, o.r * 2 * c);
        const gr = g.createLinearGradient(0, -o.r * c, 0, o.r * c); gr.addColorStop(0, tom(o.cores[0], 0.12)); gr.addColorStop(0.5, o.cores[1]); gr.addColorStop(1, o.cores[2]);
        g.fillStyle = gr; g.fillRect(-lt * c / 2, -o.r * c, lt * c * 0.94, o.r * 2 * c);
        g.strokeStyle = o.cores[3]; g.lineWidth = Math.max(1, c * 0.03); g.strokeRect(-lt * c / 2, -o.r * c, lt * c * 0.94, o.r * 2 * c);
        g.strokeStyle = 'rgba(40,36,30,0.3)'; for (let f = -0.6; f <= 0.6; f += 0.3) { g.beginPath(); g.moveTo(-lt * c / 2, f * o.r * c); g.lineTo(lt * c * 0.44, f * o.r * c); g.stroke(); }
        g.restore();
      }
      // o capitel no fim (o bloco quadrado)
      bloco(g, (o.L + 0.25) / 1, 0, 0.9, 0.9, c, o.cores, rnd, 0.3);
      g.restore();
      if (o.hera) PR.hera(g, { x: o.x + Math.cos(o.ang) * o.L * 0.5, y: o.y + Math.sin(o.ang) * o.L * 0.5, r: 0.8 }, c, rnd);
    },
    // um trecho de parede em ruína: os blocos assentados (a alta, com a crista clara; a baixa, só a fiada de baixo)
    paredeRuina(g, o, c, rnd) {
      const [a, b] = [o.a, o.b], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      g.save(); g.translate(a[0] * c, a[1] * c); g.rotate(ang);
      const e = o.esp * c;
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(c * 0.05, -e / 2 + c * 0.1, L * c, e);
      g.fillStyle = o.alta ? o.cores[1] : tom(o.cores[1], -0.1); g.fillRect(0, -e / 2, L * c, e);
      let u = 0;
      while (u < L - 0.05) {
        const l = Math.min(L - u, 0.35 + rnd() * 0.45);
        g.fillStyle = tom(o.cores[rnd() < 0.5 ? 0 : 1], (rnd() - 0.5) * 0.1 - (o.alta ? 0 : 0.08));
        g.fillRect(u * c + 1, -e / 2 + 1, l * c - 2, e - 2);
        u += l;
      }
      if (o.alta) { g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, -e / 2, L * c, Math.max(1, e * 0.2)); }
      g.strokeStyle = o.cores[3]; g.lineWidth = Math.max(1, c * 0.035); g.strokeRect(0, -e / 2, L * c, e);
      g.restore();
    },
    // o entulho: os blocos caídos espalhados
    entulhoRuina(g, o, c, rnd) {
      const n = Math.round(4 + o.r * 6);
      for (let k = 0; k < n; k++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * o.r, s = 0.15 + rnd() * 0.32; bloco(g, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, s * 1.3, s, c, o.cores, rnd, rnd() * 3); }
    },
    monteEntulho(g, o, c, rnd) {
      g.save();
      const gr = g.createRadialGradient(o.x * c, o.y * c, 0, o.x * c, o.y * c, o.r * c); gr.addColorStop(0, tom(o.cores[1], 0.05)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c, 0, TAU); g.fill();
      g.restore();
      PR.entulhoRuina(g, { x: o.x, y: o.y, r: o.r * 0.85, cores: o.cores }, c, rnd);
    },
    cacos(g, o, c, rnd) { PR.entulhoRuina(g, { x: o.x, y: o.y, r: o.r * 0.6, cores: o.cores }, c, rnd); },
    estatuaCaida(g, o, c, rnd) {
      g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(c * 0.08, c * 0.1, c * 0.85, c * 0.35, 0, 0, TAU); g.fill();
      g.fillStyle = o.cores[0];
      g.beginPath(); g.ellipse(0, 0, c * 0.7, c * 0.28, 0, 0, TAU); g.fill();                       // (o corpo deitado)
      g.beginPath(); g.arc(c * 0.82, 0, c * 0.2, 0, TAU); g.fill();                                  // (a cabeça, solta)
      g.fillStyle = o.cores[1]; g.fillRect(-c * 0.95, -c * 0.3, c * 0.3, c * 0.6);                   // (a base quebrada)
      g.strokeStyle = o.cores[3]; g.lineWidth = Math.max(1, c * 0.03); g.beginPath(); g.ellipse(0, 0, c * 0.7, c * 0.28, 0, 0, TAU); g.stroke();
      g.restore();
      void rnd;
    },
    // a escada que desce: o buraco escuro na pedra, com os degraus sumindo no escuro
    escadaDesce(g, o, c, rnd) {
      const lado = o.lado || 'n', n = 5;
      g.save();
      g.fillStyle = o.cores[3]; g.fillRect((o.x - 0.12) * c, (o.y - 0.12) * c, (o.w + 0.24) * c, (o.h + 0.24) * c);
      for (let k = 0; k < n; k++) {
        const f = -0.15 - (k / n) * 0.7;
        g.fillStyle = tom(o.cores[1], f);
        let rx, ry, rw, rh;
        if (lado === 'n') { rx = o.x; ry = o.y + (n - 1 - k) * o.h / n; rw = o.w; rh = o.h / n; }
        else if (lado === 's') { rx = o.x; ry = o.y + k * o.h / n; rw = o.w; rh = o.h / n; }
        else if (lado === 'o') { rx = o.x + (n - 1 - k) * o.w / n; ry = o.y; rw = o.w / n; rh = o.h; }
        else { rx = o.x + k * o.w / n; ry = o.y; rw = o.w / n; rh = o.h; }
        g.fillRect(rx * c, ry * c, rw * c + 0.5, rh * c + 0.5);
      }
      const gr = lado === 'n' ? g.createLinearGradient(0, (o.y + o.h) * c, 0, o.y * c) : lado === 's' ? g.createLinearGradient(0, o.y * c, 0, (o.y + o.h) * c) : lado === 'o' ? g.createLinearGradient((o.x + o.w) * c, 0, o.x * c, 0) : g.createLinearGradient(o.x * c, 0, (o.x + o.w) * c, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.75)');
      g.fillStyle = gr; g.fillRect(o.x * c, o.y * c, o.w * c, o.h * c);
      g.strokeStyle = o.cores[3]; g.lineWidth = Math.max(1.5, c * 0.06); g.strokeRect(o.x * c, o.y * c, o.w * c, o.h * c);
      g.restore();
      void rnd;
    },
    frontao(g, o, c) {
      g.save();
      g.save(); g.translate(c * 0.12, c * 0.16); caminhoPts(g, o.pts, c, true); g.fillStyle = 'rgba(0,0,0,0.38)'; g.fill(); g.restore();
      caminhoPts(g, o.pts, c, true); g.fillStyle = o.cores[0]; g.fill();
      g.strokeStyle = o.cores[3]; g.lineWidth = Math.max(1, c * 0.05); g.stroke();
      // o friso e os relevos gastos
      const [a, b, t] = o.pts, m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      g.strokeStyle = 'rgba(60,52,40,0.45)'; g.lineWidth = Math.max(1, c * 0.03);
      for (const f of [0.3, 0.55]) { g.beginPath(); g.moveTo((a[0] + (t[0] - a[0]) * f) * c, (a[1] + (t[1] - a[1]) * f) * c); g.lineTo((b[0] + (t[0] - b[0]) * f) * c, (b[1] + (t[1] - b[1]) * f) * c); g.stroke(); }
      g.fillStyle = 'rgba(60,52,40,0.35)'; g.beginPath(); g.arc((m[0] * 0.6 + t[0] * 0.4) * c, (m[1] * 0.6 + t[1] * 0.4) * c, c * 0.25, 0, TAU); g.fill();
      g.restore();
    },
    chaoRedondo(g, o, c, rnd) {
      g.save(); g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c, 0, TAU); g.clip();
      PR.lajes(g, { x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2, cores: o.cores, escuro: true, rachas: true }, c, rnd);
      g.restore();
    },
    // a escada em caracol quebrada, encostada na parede de dentro (os degraus em leque, até onde a parede ruiu)
    caracol(g, o, c, rnd) {
      g.save();
      for (let k = 0; k < 9; k++) {
        const a = o.a0 + k * 0.32, x = o.x + Math.cos(a) * o.r, y = o.y + Math.sin(a) * o.r;
        bloco(g, x, y, 0.85, 0.42, c, [tom(o.cores[0], -k * 0.03), o.cores[1], o.cores[2], o.cores[3]], rnd, a + Math.PI / 2);
      }
      g.restore();
    },
    // um pedaço do corpo da torre deitado: o cilindro de pedra (as fiadas atravessadas, a sombra, a crista)
    tamborTorre(g, o, c, rnd) {
      g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang);
      const L = o.L * c, Wd = o.larg * c;
      g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(-L / 2 + c * 0.15, -Wd / 2 + c * 0.25, L, Wd);
      const gr = g.createLinearGradient(0, -Wd / 2, 0, Wd / 2); gr.addColorStop(0, tom(o.cores[0], 0.12)); gr.addColorStop(0.45, o.cores[1]); gr.addColorStop(1, tom(o.cores[2], -0.1));
      g.fillStyle = gr; g.fillRect(-L / 2, -Wd / 2, L, Wd);
      // as fiadas de pedra (atravessadas) e as juntas desencontradas
      g.strokeStyle = o.cores[3]; g.lineWidth = Math.max(1, c * 0.03);
      const nf = Math.max(3, Math.round(o.L / 0.45));
      for (let k = 1; k < nf; k++) { const x = -L / 2 + k * L / nf; g.beginPath(); g.moveTo(x, -Wd / 2); g.lineTo(x, Wd / 2); g.stroke(); }
      for (let k = 0; k < nf; k++) for (let f = -0.5 + (k % 2) * 0.2; f < 0.5; f += 0.4) { const x = -L / 2 + k * L / nf, y = f * Wd; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L / nf, y); g.stroke(); }
      // as pontas quebradas (o miolo escuro de cascalho)
      g.fillStyle = '#3d3830';
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * L / 2, 0, c * 0.22, Wd / 2 * 0.85, 0, 0, TAU); g.fill(); }
      g.strokeStyle = o.cores[3]; g.lineWidth = Math.max(1, c * 0.05); g.strokeRect(-L / 2, -Wd / 2, L, Wd);
      g.restore();
      // (as lascas caem dos lados do pedaço, e não para a frente nem para trás: nada de pedra voando para dentro da base)
      for (let k = 0; k < 5; k++) { const a = o.ang + (k % 2 ? 1 : -1) * Math.PI / 2 + (rnd() - 0.5) * 1.2, d = o.larg * 0.5 + 0.25 + rnd() * 0.8; bloco(g, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, 0.35, 0.25, c, o.cores, rnd, rnd() * 3); }
      if (o.hera) PR.hera(g, { x: o.x, y: o.y, r: o.larg * 0.45 }, c, rnd);
    },
    // as ameias espalhadas no fim da queda (os merlões inteiros, tombados em leque)
    ameias(g, o, c, rnd) {
      for (let k = 0; k < (o.n || 10); k++) { const a = o.ang + (rnd() - 0.5) * 1.8, d = rnd() * o.r; bloco(g, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, 0.75, 0.5, c, o.cores, rnd, a + (rnd() - 0.5)); }
      PR.entulhoRuina(g, { x: o.x, y: o.y, r: o.r * 0.8, cores: o.cores }, c, rnd);
    },
    // o pátio de terra batida do forte
    patio(g, o, c, rnd) {
      g.save(); g.fillStyle = 'rgba(110,92,64,0.35)'; g.fillRect(o.x * c, o.y * c, o.w * c, o.h * c);
      for (let k = 0, n = Math.round(o.w * o.h * 1.5); k < n; k++) { g.globalAlpha = 0.15 + rnd() * 0.2; g.fillStyle = rnd() < 0.5 ? '#7a6648' : '#5e4e36'; g.beginPath(); g.arc((o.x + rnd() * o.w) * c, (o.y + rnd() * o.h) * c, c * (0.08 + rnd() * 0.3), 0, TAU); g.fill(); }
      g.restore();
    },
    // o topo de uma torre de canto (a plataforma com a borda de ameias, umas faltando)
    topoTorre(g, o, c, rnd) {
      const x = o.x * c, y = o.y * c, R = o.r * c;
      g.save();
      g.fillStyle = o.cores[1]; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
      g.fillStyle = tom(o.cores[2], -0.05); g.beginPath(); g.arc(x, y, R * 0.7, 0, TAU); g.fill();
      for (let k = 0; k < 12; k++) { if (rnd() < 0.3) continue; const a = (k / 12) * TAU + 0.13; bloco(g, o.x + Math.cos(a) * o.r * 0.86, o.y + Math.sin(a) * o.r * 0.86, 0.45, 0.32, c, o.cores, rnd, a + Math.PI / 2); }
      g.restore();
    },
    portaoQuebrado(g, o, c, rnd) {
      g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang);
      // as duas folhas de madeira caídas, uma para dentro e uma de lado
      for (const [dx, dy, a] of [[0.9, 0.6, 0.5], [-1.1, 1.3, -1.2]]) {
        g.save(); g.translate(dx * c, dy * c); g.rotate(a + (rnd() - 0.5) * 0.3);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-c * 0.75 + 3, -c * 0.32 + 4, c * 1.5, c * 0.64);
        g.fillStyle = '#5c4026'; g.fillRect(-c * 0.75, -c * 0.32, c * 1.5, c * 0.64);
        g.strokeStyle = '#2e2012'; g.lineWidth = Math.max(1, c * 0.03); for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * c * 0.3, -c * 0.32); g.lineTo(k * c * 0.3, c * 0.32); g.stroke(); }
        g.strokeStyle = '#3c3c40'; g.lineWidth = Math.max(1, c * 0.06); g.beginPath(); g.moveTo(-c * 0.75, -c * 0.12); g.lineTo(c * 0.75, -c * 0.12); g.moveTo(-c * 0.75, c * 0.14); g.lineTo(c * 0.75, c * 0.14); g.stroke();
        g.restore();
      }
      g.restore();
    },
    gramaPisada(g, o, c, rnd) {
      g.save();
      const gr = g.createRadialGradient(o.x * c, o.y * c, 0, o.x * c, o.y * c, o.r * c); gr.addColorStop(0, 'rgba(120,104,70,0.35)'); gr.addColorStop(0.8, 'rgba(120,104,70,0.18)'); gr.addColorStop(1, 'rgba(120,104,70,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(o.x * c, o.y * c, o.r * c, 0, TAU); g.fill();
      g.restore();
      void rnd;
    },
    // o menir: a pedra alta vista de cima (o topo claro, a sombra comprida)
    menir(g, o, c, rnd) {
      g.save();
      g.save(); g.translate(c * 0.35, c * 0.45); caminhoPts(g, o.pts, c, true); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fill(); g.restore();
      caminhoPts(g, o.pts, c, true);
      const gr = g.createLinearGradient(o.pts[0][0] * c, o.pts[0][1] * c, o.pts[2][0] * c, o.pts[2][1] * c); gr.addColorStop(0, tom(o.cores[0], 0.08)); gr.addColorStop(1, o.cores[2]);
      g.fillStyle = gr; g.fill(); g.strokeStyle = tom(o.cores[2], -0.3); g.lineWidth = Math.max(1, c * 0.04); g.stroke();
      // os sinais gastos riscados na pedra
      g.strokeStyle = 'rgba(40,36,30,0.45)'; g.lineWidth = Math.max(1, c * 0.025);
      g.beginPath(); g.moveTo((o.x - 0.15) * c, (o.y - 0.1) * c); g.lineTo((o.x + 0.15) * c, (o.y + 0.1) * c); g.moveTo((o.x + 0.12) * c, (o.y - 0.12) * c); g.lineTo((o.x - 0.05) * c, (o.y + 0.05) * c); g.stroke();
      g.restore();
      if (o.hera) PR.hera(g, { x: o.x, y: o.y, r: 0.45 }, c, rnd);
    },
    menirCaido(g, o, c) {
      g.save();
      g.save(); g.translate(c * 0.1, c * 0.14); caminhoPts(g, o.pts, c, true); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill(); g.restore();
      caminhoPts(g, o.pts, c, true); g.fillStyle = o.cores[1]; g.fill(); g.strokeStyle = tom(o.cores[2], -0.3); g.lineWidth = Math.max(1, c * 0.04); g.stroke();
      g.restore();
    },
    pedraAltar(g, o, c) {
      g.save();
      g.save(); g.translate(c * 0.15, c * 0.2); caminhoPts(g, o.pts, c, true); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fill(); g.restore();
      caminhoPts(g, o.pts, c, true); g.fillStyle = tom(o.cores[0], 0.05); g.fill(); g.strokeStyle = tom(o.cores[2], -0.3); g.lineWidth = Math.max(1.5, c * 0.05); g.stroke();
      // o rego do meio, escuro (o que escorria por ali)
      const [a, b, cc, d] = o.pts, m1 = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2], m2 = [(b[0] + cc[0]) / 2, (b[1] + cc[1]) / 2];
      g.strokeStyle = 'rgba(70,30,26,0.55)'; g.lineWidth = Math.max(1, c * 0.07); g.beginPath(); g.moveTo(m1[0] * c, m1[1] * c); g.lineTo(m2[0] * c, m2[1] * c); g.stroke();
      g.restore();
    },
    // a boca da caverna: o escuro entrando na rocha, o arco de pedra e as pedras soltas na soleira
    bocaCaverna(g, o, c, rnd) {
      g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang);
      const Lg = o.larg * c;
      const gr = g.createLinearGradient(-c * 0.6, 0, c * 1.6, 0); gr.addColorStop(0, 'rgba(10,8,8,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(c * 0.4, 0, c * 1.3, Lg / 2, 0, 0, TAU); g.fill();
      g.strokeStyle = tom(o.cores[2], -0.2); g.lineWidth = Math.max(2, c * 0.2); g.beginPath(); g.ellipse(c * 0.4, 0, c * 1.3, Lg / 2, 0, Math.PI * 0.55, Math.PI * 1.45); g.stroke();
      for (let k = 0; k < 7; k++) { g.fillStyle = o.cores[k % 3]; g.beginPath(); g.arc(-c * (0.5 + rnd() * 0.6), (rnd() - 0.5) * Lg * 0.9, c * (0.1 + rnd() * 0.15), 0, TAU); g.fill(); }
      g.restore();
    },
    // a entrada da mina: o escuro com a armação de madeira (os dois esteios e a verga), os trilhos entrando
    portalMina(g, o, c, rnd) {
      g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang);
      const Lg = o.larg * c;
      g.fillStyle = '#050404'; g.fillRect(-c * 0.3, -Lg / 2, c * 1.8, Lg);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-c * 0.45 + 3, -Lg / 2 - c * 0.25 + 4, c * 0.4, Lg + c * 0.5);
      g.fillStyle = '#6b4a2c'; g.fillRect(-c * 0.45, -Lg / 2 - c * 0.25, c * 0.4, Lg + c * 0.5);           // (a verga)
      for (const s of [-1, 1]) { g.fillStyle = '#5a3d22'; g.fillRect(-c * 0.5, s * Lg / 2 - c * 0.15, c * 1.6, c * 0.3); }   // (os esteios)
      g.strokeStyle = '#2e2012'; g.lineWidth = Math.max(1, c * 0.03); g.strokeRect(-c * 0.45, -Lg / 2 - c * 0.25, c * 0.4, Lg + c * 0.5);
      g.restore();
      void rnd;
    },
    trilhoMina(g, o, c) {
      const pts = o.pts; if (!pts || pts.length < 2) return;
      g.save();
      for (let k = 1; k < pts.length; k++) {
        const [x1, y1] = pts[k - 1], [x2, y2] = pts[k], L = Math.hypot(x2 - x1, y2 - y1); if (L < 0.01) continue;
        const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
        g.strokeStyle = '#4a3522'; g.lineWidth = c * 0.13;
        for (let t = 0; t <= L; t += 0.45) { const x = x1 + ux * t, y = y1 + uy * t; g.beginPath(); g.moveTo((x - uy * 0.4) * c, (y + ux * 0.4) * c); g.lineTo((x + uy * 0.4) * c, (y - ux * 0.4) * c); g.stroke(); }
        for (const off of [-0.26, 0.26]) { g.strokeStyle = '#2a2a2c'; g.lineWidth = Math.max(1.5, c * 0.07); g.beginPath(); g.moveTo((x1 - uy * off) * c, (y1 + ux * off) * c); g.lineTo((x2 - uy * off) * c, (y2 + ux * off) * c); g.stroke(); g.strokeStyle = '#8a8c90'; g.lineWidth = Math.max(1, c * 0.025); g.stroke(); }
      }
      g.restore();
    },
    escoria(g, o, c, rnd) {
      g.save();
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse((o.x + 0.25) * c, (o.y + 0.3) * c, o.r * c, o.r * 0.8 * c, 0, 0, TAU); g.fill();
      const gr = g.createRadialGradient((o.x - o.r * 0.3) * c, (o.y - o.r * 0.3) * c, 0, o.x * c, o.y * c, o.r * c); gr.addColorStop(0, '#8a857c'); gr.addColorStop(1, '#4a4640');
      g.fillStyle = gr; g.beginPath(); g.ellipse(o.x * c, o.y * c, o.r * c, o.r * 0.8 * c, 0, 0, TAU); g.fill();
      for (let k = 0; k < 40; k++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * o.r * 0.9; g.fillStyle = rnd() < 0.5 ? '#5e5a52' : '#9a958b'; g.beginPath(); g.arc((o.x + Math.cos(a) * d) * c, (o.y + Math.sin(a) * d * 0.8) * c, c * (0.05 + rnd() * 0.1), 0, TAU); g.fill(); }
      g.restore();
    },
    vagoneteRuina(g, o, c, rnd) {
      g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang + 0.3);
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(-c * 0.5 + 3, -c * 0.34 + 4, c, c * 0.68);
      g.fillStyle = '#4a4c50'; g.fillRect(-c * 0.5, -c * 0.34, c, c * 0.68);
      g.fillStyle = '#6a4a2e'; g.fillRect(-c * 0.42, -c * 0.26, c * 0.84, c * 0.52);
      for (let k = 0; k < 7; k++) { g.fillStyle = rnd() < 0.5 ? '#5e5348' : '#77695a'; g.beginPath(); g.arc((rnd() - 0.5) * c * 0.6, (rnd() - 0.5) * c * 0.36, c * 0.08, 0, TAU); g.fill(); }
      g.strokeStyle = '#1c1c1e'; g.lineWidth = Math.max(1, c * 0.04); g.strokeRect(-c * 0.5, -c * 0.34, c, c * 0.68);
      g.restore();
    },
    // a hera: as folhas miúdas, em tufos, por cima das pedras (na neve, o musgo seco e a geada)
    hera(g, o, c, rnd) {
      g.save();
      const cores = o.neve ? ['#7d8a6a', '#a3ad92', '#e8eef2'] : o.seco ? ['#8a7a3a', '#a8955a', '#6e6230'] : ['#3f6b2c', '#5a8a3a', '#2e5222'];
      for (let k = 0, n = Math.round(10 + o.r * 14); k < n; k++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * o.r; g.globalAlpha = 0.75; g.fillStyle = cores[Math.floor(rnd() * cores.length)]; g.beginPath(); g.ellipse((o.x + Math.cos(a) * d) * c, (o.y + Math.sin(a) * d) * c, c * 0.09, c * 0.06, rnd() * 3, 0, TAU); g.fill(); }
      g.restore();
    },
  };
  Object.assign(MO.PINTORES, { lajes: PR.lajes, degraus: PR.degraus, colunaRuina: PR.colunaRuina, tocoColuna: PR.tocoColuna, colunaCaida: PR.colunaCaida, paredeRuina: PR.paredeRuina,
    entulhoRuina: PR.entulhoRuina, monteEntulho: PR.monteEntulho, cacos: PR.cacos, estatuaCaida: PR.estatuaCaida, escadaDesce: PR.escadaDesce, frontao: PR.frontao, chaoRedondo: PR.chaoRedondo,
    caracol: PR.caracol, tamborTorre: PR.tamborTorre, ameias: PR.ameias, patio: PR.patio, topoTorre: PR.topoTorre, portaoQuebrado: PR.portaoQuebrado, gramaPisada: PR.gramaPisada,
    menir: PR.menir, menirCaido: PR.menirCaido, pedraAltar: PR.pedraAltar, bocaCaverna: PR.bocaCaverna, portalMina: PR.portalMina, trilhoMina: PR.trilhoMina, escoria: PR.escoria,
    vagoneteRuina: PR.vagoneteRuina, hera: PR.hera });

  /* ================= a cena, a prévia e o lugar (a janela do gerador) ================= */
  const nomePadrao = p => NOME[p.tipo] || 'Ruínas';
  const criar = (p, nome, ex) => MO.criarPlano(p, nome, ex, nomePadrao);
  function resumo(p) {
    const partes = [(TIPOS.find(t => t[0] === p.tipo) || TIPOS[0])[1], p.W + ' × ' + p.H + ' quadrados'];
    if (p.entradas && p.entradas.length) partes.push(ENTRADA_TXT[p.tipo] + ' (a masmorra embaixo: ' + { cripta: 'a cripta', pedra: 'a masmorra de pedra', caverna: 'a caverna', mina: 'a mina' }[MASMORRA[p.tipo]] + ')');
    if (p.com && p.com.mato) partes.push('com o mato');
    return partes.join(' · ') + '.';
  }
  const lembrar = st => { App.opt.ruiTipo = st.tipo; App.opt.ruiTam = st.tamanho; App.opt.ruiTer = st.terreno; App.opt.ruiMas = st.masmorra; App.opt.ruiMato = st.mato; };
  function padrao() {
    const o = App.opt;
    return { tipo: TIPOS.some(t => t[0] === o.ruiTipo) ? o.ruiTipo : 'templo', tamanho: TAMANHOS[o.ruiTam] ? o.ruiTam : 'medio', terreno: TERRENOS_R.some(t => t[0] === o.ruiTer) ? o.ruiTer : 'campo', masmorra: o.ruiMas !== false, mato: o.ruiMato !== false };
  }
  function controles(st, K, mudou) {
    const { field, seg, toggle } = K;
    // (o lugar e o tamanho trocam o traçado: soltam a trava; o terreno e as chaves não mexem nele)
    const muda = (campo, v, soltar) => { st[campo] = v; lembrar(st); mudou(true, soltar ? { soltar: true } : undefined); };
    return h('div', { class: 'ger-c' },
      field('Lugar', seg('rui-tipo', st.tipo, TIPOS.map(([k, n]) => [k, n, null, DICA[k]]), v => muda('tipo', v, true)), 'stack'),
      h('div', { class: 'ger-l' },
        field('Tamanho', seg('rui-tam', st.tamanho, Object.keys(TAMANHOS).map(k => [k, TAMANHOS[k].n, null, TAMANHOS[k].W + ' × ' + TAMANHOS[k].H + ' quadrados']), v => muda('tamanho', v, true)), 'stack'),
        field('Terreno', seg('rui-ter', st.terreno, TERRENOS_R.map(([k, n]) => [k, n]), v => muda('terreno', v)), 'stack')),
      toggle('rui-mas', st.masmorra, v => muda('masmorra', v), 'A entrada da masmorra (' + ENTRADA_TXT[st.tipo] + ': dois cliques nela geram o nível 1 lá embaixo)'),
      toggle('rui-mato', st.mato, v => muda('mato', v), 'O mato tomando conta (a hera nas pedras)'));
  }
  const opcoesDe = st => ({ tipo: st.tipo, tamanho: st.tamanho, terreno: st.terreno, masmorra: !!st.masmorra, mato: !!st.mato });
  function aplicarOpcoes(st, o) {
    if (TIPOS.some(t => t[0] === o.tipo)) st.tipo = o.tipo;
    if (TAMANHOS[o.tamanho]) st.tamanho = o.tamanho;
    if (TERRENOS_R.some(t => t[0] === o.terreno)) st.terreno = o.terreno;
    else if (o.terreno === 'deserto') st.terreno = 'areia';
    for (const k of ['masmorra', 'mato']) if (typeof o[k] === 'boolean') st[k] = o[k];
    lembrar(st);
  }
  const partes = p => (p.tracado.length ? ['tracado'] : []);
  function parteEm(p, x, y) {
    for (const f of p.tracado) {
      if (f.k === 'linha' && MO.distLinha(f.pts, x, y) <= f.hw + 0.5) return 'tracado';
      if (f.k === 'poli' && MO.dentroPoli(f.pts, x, y)) return 'tracado';
      if (f.k === 'circ' && Math.hypot(x - f.x, y - f.y) <= f.r) return 'tracado';
    }
    return null;
  }
  const nomeDaParte = () => 'o traçado (as ruínas, o paredão e a trilha)';
  const formaDaParte = (p, parte) => (parte === 'tracado' ? p.tracado.map(f => (f.k === 'linha' ? { k: 'linha', pts: f.pts, hw: f.hw } : f.k === 'circ' ? { k: 'circ', x: f.x, y: f.y, r: f.r } : { k: 'poli', pts: f.pts })) : []);
  const travada = (p, parte) => parte === 'tracado' && !!p.travaTracado;
  const travaDe = p => (p.travaTracado ? { tipo: p.tipo, tamanho: p.tamanho, s: p.sT } : null);
  function alternar(p, parte, trava) {
    if (parte !== 'tracado') return trava;
    p.travaTracado = !p.travaTracado;
    return travaDe(p);
  }
  const quantasTravadas = p => (p.travaTracado ? 1 : 0);
  const baseDe = () => null;
  const LUGAR = { id: 'ruinas', n: 'Ruínas', padrao, controles, opcoesDe, aplicarOpcoes, gerar: (st, comum) => gerar(Object.assign({}, st, comum)), previa: MO.previa, resumo, partes, parteEm, nomeDaParte, formaDaParte, travada, alternar, quantasTravadas, baseDe, travaDe, nomePadrao, criar,
    relevoTxt: 'Com relevo e formas (o estilóbato, as colunas caídas, os pedaços da torre, o adarve, os menires, o paredão)',
    dica: 'Clique nas ruínas da prévia para travar o traçado: "Gerar outro" troca só as árvores, as pedras e os enfeites.',
    nota: 'Sai uma cena nova: as ruínas (as paredes que ainda estão de pé tapam a visão; as baixas deixam ver e não deixam passar; as colunas e os pedaços grandes também tapam), o relevo e, com a chave, a entrada da masmorra — um marcador de Entrada, oculto: dois cliques nele geram o nível 1 lá embaixo (a cripta embaixo do templo, a caverna atrás da boca, a mina…). Nada sai escrito; tudo continua editável; as cenas que já existem não mudam.',
    feito: (sc, p) => `"${sc.name}" criada: ${resumo(p).replace(/\.$/, '')}. Tudo é editável.` };
  return { TIPOS, TAMANHOS, TERRENOS_R, MASMORRA, gerar, resumo, criar, nomePadrao, limparTrava, travaDe, LUGAR };
})();
