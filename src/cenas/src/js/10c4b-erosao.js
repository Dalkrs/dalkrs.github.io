/* ---------------------------------------------------------------
   10c4b. A EROSÃO (lote 156) — a água da chuva gasta o chão.
   · No terreno (a Região livre e o Encontro): gotas caem no mapa de alturas, descem pela encosta, arrancam terra onde
     correm rápido e largam onde param (os leques de areia na boca dos vales). Os morros ficam com as encostas riscadas,
     os rios acham os vales. A altura mexida vale para o que vem depois (os patamares, os biomas, a água); a prévia e o
     fundo ganham o sombreado do relevo (a luz do noroeste) e o tom da areia onde ela se juntou.
   · Na caverna: a água que escorreu pelas galerias arredonda as paredes, abre bolsões e alarga os túneis.
   A força: leve, média, forte. Erosao.com(forca, fn): o que gerar dentro de fn usa a erosão (o Biomas.alturas pergunta);
   o mapa gasto fica guardado para o plano (Erosao.MAPAS), para o sombreado.
   --------------------------------------------------------------- */
const Erosao = (() => {
  const FORCAS = [['nada', 'Nenhuma'], ['leve', 'Leve'], ['media', 'Média'], ['forte', 'Forte']];
  const GOTAS = { leve: 0.5, media: 1, forte: 1.8 };          // gotas por casa da grade
  const forca = v => (GOTAS[v] ? v : null);
  let atual = null, ultimo = null;
  const MAPAS = new WeakMap();

  /* A erosão hidráulica, numa grade de alturas (0 a 1). Devolve dep (o quanto se depositou em cada casa). */
  function hidraulica(alt, W, H, f, seed) {
    const n = GOTAS[f];
    if (!n || W < 4 || H < 4) return null;
    const r = mulberry(((seed >>> 0) ^ 0xe705a0) || 1), dep = new Float32Array(W * H);
    // a escala: as alturas vão de 0 a 1; o mapa tem dezenas de casas — a encosta "de verdade" é a diferença × 8
    const ESC = 8, INERCIA = 0.3, CAP = 4, MIN_ENC = 0.01, ERODE = 0.35, DEPOS = 0.3, EVAP = 0.02, GRAV = 4, RAIO = 1;
    const h = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, k = j * W + i; return { a: alt[k] * ESC, gx: ((alt[k + 1] - alt[k]) * (1 - v) + (alt[k + W + 1] - alt[k + W]) * v) * ESC, gy: ((alt[k + W] - alt[k]) * (1 - u) + (alt[k + W + 1] - alt[k + 1]) * u) * ESC, h: ((alt[k] * (1 - u) + alt[k + 1] * u) * (1 - v) + (alt[k + W] * (1 - u) + alt[k + W + 1] * u) * v) * ESC }; };
    // tirar (com um pincel de raio 1: a casa e as vizinhas) e pôr (nas 4 casas em volta, pelo peso)
    const tira = (x, y, q) => { const ci = Math.floor(x), cj = Math.floor(y); let soma = 0; const l = []; for (let j = cj - RAIO; j <= cj + RAIO + 1; j++) for (let i = ci - RAIO; i <= ci + RAIO + 1; i++) { if (i < 0 || j < 0 || i >= W || j >= H) continue; const w = Math.max(0, RAIO + 1 - Math.hypot(i - x, j - y)); if (w > 0) { l.push([j * W + i, w]); soma += w; } } for (const [k, w] of l) { const d = q * w / soma / ESC; alt[k] -= d; dep[k] -= d; } };
    const poe = (x, y, q) => { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, k = j * W + i, d = q / ESC; alt[k] += d * (1 - u) * (1 - v); alt[k + 1] += d * u * (1 - v); alt[k + W] += d * (1 - u) * v; alt[k + W + 1] += d * u * v; dep[k] += d * (1 - u) * (1 - v); dep[k + 1] += d * u * (1 - v); dep[k + W] += d * (1 - u) * v; dep[k + W + 1] += d * u * v; };
    const total = Math.round(W * H * n);
    for (let g = 0; g < total; g++) {
      let x = 1 + r() * (W - 3), y = 1 + r() * (H - 3), dx = 0, dy = 0, vel = 1, agua = 1, sed = 0;
      for (let passo = 0; passo < 40; passo++) {
        const a = h(x, y);
        dx = dx * INERCIA - a.gx * (1 - INERCIA); dy = dy * INERCIA - a.gy * (1 - INERCIA);
        const L = Math.hypot(dx, dy);
        if (L < 1e-6) break;
        dx /= L; dy /= L;
        const nx = x + dx, ny = y + dy;
        if (nx < 1 || ny < 1 || nx >= W - 2 || ny >= H - 2) break;
        const dh = h(nx, ny).h - a.h, cap = Math.max(-dh, MIN_ENC) * vel * agua * CAP;
        if (sed > cap || dh > 0) { const q = dh > 0 ? Math.min(dh, sed) : (sed - cap) * DEPOS; sed -= q; poe(x, y, q); }
        else { const q = Math.min((cap - sed) * ERODE, -dh); tira(x, y, q); sed += q; }
        vel = Math.sqrt(Math.max(0, vel * vel + dh * -GRAV)) || 0.2;
        agua *= 1 - EVAP;
        x = nx; y = ny;
      }
    }
    for (let q = 0; q < alt.length; q++) alt[q] = clamp(alt[q], 0, 1);
    return dep;
  }
  // o gancho do Biomas.alturas: com a erosão pedida, gasta e guarda (o último mapa, para o plano)
  // (a erosão roda numa grade 3 vezes mais fina — os sulcos ficam finos — e volta para a grade do mapa misturada com a de
  // antes: o desenho grande do lugar continua, com as encostas gastas)
  const MISTURA = { leve: 0.35, media: 0.55, forte: 0.75 };
  function naAltura(alt, W, H, seed) {
    if (!atual) return;
    const F = 3, W3 = W * F, H3 = H * F, A = new Float32Array(W3 * H3);
    for (let j = 0; j < H3; j++) for (let i = 0; i < W3; i++) {
      const x = clamp((i + 0.5) / F - 0.5, 0, W - 1.001), y = clamp((j + 0.5) / F - 0.5, 0, H - 1.001), a = Math.floor(x), c = Math.floor(y), u = x - a, v = y - c, k = c * W + a;
      A[j * W3 + i] = (alt[k] * (1 - u) + alt[Math.min(k + 1, alt.length - 1)] * u) * (1 - v) + (alt[Math.min(k + W, alt.length - 1)] * (1 - u) + alt[Math.min(k + W + 1, alt.length - 1)] * u) * v;
    }
    const A0 = Float32Array.from(A), dep = hidraulica(A, W3, H3, atual, seed);
    const m = MISTURA[atual];
    for (let q = 0; q < A.length; q++) A[q] = A0[q] + (A[q] - A0[q]) * m;
    // de volta para a grade do mapa (a média de cada 3 × 3)
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let s2 = 0; for (let b = 0; b < F; b++) for (let a = 0; a < F; a++) s2 += A[(j * F + b) * W3 + i * F + a]; alt[j * W + i] = clamp(s2 / (F * F), 0, 1); }
    ultimo = { W: W3, H: H3, alt: A, dep };
  }
  // gerar com a erosão: o plano que sai leva o mapa gasto (para o sombreado)
  function com(f, fn) {
    const a0 = atual; atual = forca(f); ultimo = null;
    try { const p = fn(); if (atual && ultimo && p && typeof p === 'object') { MAPAS.set(p, ultimo); p.erosao = atual; } return p; }
    finally { atual = a0; }
  }

  /* O sombreado do relevo (a luz do noroeste) e a areia que se juntou: pintado por cima (g), com k px por casa. */
  function sombrear(g, p, k, ox, oy) {
    const m = p && MAPAS.get(p);
    if (!m) return;
    const { W, H, alt, dep } = m, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'), img = c.createImageData(W, H), E = W > 90 ? 22 : 9;
    let dmax = 0; if (dep) for (let q = 0; q < dep.length; q++) dmax = Math.max(dmax, dep[q]);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const q = j * W + i, a = alt[q], ax = alt[j * W + Math.min(W - 1, i + 1)] - alt[j * W + Math.max(0, i - 1)], ay = alt[Math.min(H - 1, j + 1) * W + i] - alt[Math.max(0, j - 1) * W + i];
      const luz = clamp(-(ax + ay) * E * 0.7, -1, 1);       // de cima à esquerda: as encostas viradas para lá clareiam
      const o = q * 4;
      if (luz >= 0) { img.data[o] = 255; img.data[o + 1] = 246; img.data[o + 2] = 220; img.data[o + 3] = Math.round(luz * 38); }
      else { img.data[o] = 18; img.data[o + 1] = 14; img.data[o + 2] = 30; img.data[o + 3] = Math.round(-luz * 60); }
      void a;
    }
    c.putImageData(img, 0, 0);
    g.save(); g.imageSmoothingEnabled = true; g.drawImage(cv, ox || 0, oy || 0, W * k, H * k);
    // a areia: onde a água largou o que trazia
    if (dep && dmax > 0) {
      const cv2 = document.createElement('canvas'); cv2.width = W; cv2.height = H;
      const c2 = cv2.getContext('2d'), im2 = c2.createImageData(W, H);
      let dmin = 0; for (let q = 0; q < dep.length; q++) dmin = Math.min(dmin, dep[q]);
      for (let q = 0; q < dep.length; q++) {
        const o = q * 4, v = dep[q] / dmax, u = dmin < 0 ? dep[q] / dmin : 0;
        if (v > 0.15) { im2.data[o] = 214; im2.data[o + 1] = 190; im2.data[o + 2] = 140; im2.data[o + 3] = Math.round(Math.min(1, (v - 0.15) * 1.6) * 120); }
        else if (u > 0.3) { im2.data[o] = 48; im2.data[o + 1] = 36; im2.data[o + 2] = 26; im2.data[o + 3] = Math.round(Math.min(1, (u - 0.3) * 1.6) * 80); }      // os sulcos: onde a água arrancou
      }
      c2.putImageData(im2, 0, 0);
      g.drawImage(cv2, ox || 0, oy || 0, W * k, H * k);
    }
    g.restore();
  }
  // o fundo de uma cena já criada (depois de criar, pelo gerador): a mesma camada, numa imagem nova
  async function noFundo(sc, p) {
    if (!MAPAS.get(p) || !sc.bg || !sc.bg.asset) return false;
    const a = Store.S.assets[sc.bg.asset];
    if (!a || !a.url) return false;
    const im = await new Promise(ok => { const i = new Image(); if (/^https?:/.test(a.url)) i.crossOrigin = 'anonymous'; const t = setTimeout(() => ok(null), 30000); i.onload = () => { clearTimeout(t); ok(i); }; i.onerror = () => { clearTimeout(t); ok(null); }; i.src = a.url; });
    if (!im) return false;
    const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
    const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    const m = MAPAS.get(p);
    sombrear(g, p, cv.width / m.W, 0, 0);
    const b = await Assets.fromCanvas(cv, 'bg', sc.name);
    sc.bg = Object.assign({}, sc.bg, { asset: b.id });
    return true;
  }

  /* A caverna gasta pela água: aberto (1: chão) numa grade W×H; a margem de 2 fica rocha. As paredes arredondam (a rocha
     cercada de chão cai), aparecem bolsões rente às galerias e os túneis alargam por onde a água desceu. */
  function caverna(aberto, W, H, f, r) {
    const n = { leve: 1, media: 2, forte: 3 }[f];
    if (!n) return 0;
    const dentro = (i, j) => i >= 2 && j >= 2 && i < W - 2 && j < H - 2;
    let abertos = 0;
    const viz8 = (i, j) => { let c = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if ((a || b) && aberto[(j + b) * W + i + a]) c++; return c; };
    for (let it = 0; it < n; it++) {
      const novo = [];
      for (let j = 2; j < H - 2; j++) for (let i = 2; i < W - 2; i++) {
        const k = j * W + i;
        if (aberto[k]) continue;
        const v = viz8(i, j);
        // a rocha cercada cai; a da beira, às vezes (a água lambendo a parede)
        if (v >= 5 || (v >= 3 && r() < 0.18 * n) || (v >= 1 && r() < 0.03 * n)) novo.push(k);
      }
      for (const k of novo) { aberto[k] = 1; abertos++; }
    }
    // os bolsões: gotas que descem rente às paredes e cavam no fim
    const bolsoes = Math.round(W * H / 220 * n);
    for (let b = 0; b < bolsoes; b++) {
      let i = 2 + Math.floor(r() * (W - 4)), j = 2 + Math.floor(r() * (H - 4));
      if (!aberto[j * W + i]) continue;
      for (let s = 0; s < 8; s++) { const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(r() * 4)]; const a = i + d[0], c = j + d[1]; if (!dentro(a, c)) break; i = a; j = c; if (!aberto[j * W + i]) { aberto[j * W + i] = 1; abertos++; if (r() < 0.5) break; } }
    }
    return abertos;
  }
  return { FORCAS, forca, hidraulica, naAltura, com, sombrear, noFundo, caverna, MAPAS, get atual() { return atual; } };
})();
