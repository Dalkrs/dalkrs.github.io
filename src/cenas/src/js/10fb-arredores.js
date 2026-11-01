/* ---------------------------------------------------------------
   10fb. OS ARREDORES (lote 14, parte 14c)
   O Vilarejo, a Cidade (a cena completa), a Tribo, as Ruínas e o Porto com o chão em volta: uma escolha na janela
   (Nenhum, Pouco, Médio ou Muito: 0, 4, 8 ou 14 quadrados de cada lado). O lugar sai como sempre e fica no meio; em
   volta, o ANEL, feito com o motor dos biomas e o dos encontros:
   · o chão do bioma do lugar (com o hexágono do Mapa-múndi, o do hexágono, com os vizinhos nas bordas e a água deles),
     as manchas dos vizinhos longe do lugar (o lugar fica no chão principal; quando a paleta dele é outra, numa mancha
     dele) e a altura do chão (alta de onde o rio do lugar entra, baixa para onde ele sai);
   · o rio do lugar continuado da beira dele até a borda da cena, pelo relevo (com o hexágono, até os pontos do rio do
     mapa; sem rio no lugar e com o do mapa, o do mapa passa em volta do lugar); o mar do Porto e da Cidade com mar sai
     da beira deles (eles fazem a beira mais comprida);
   · os caminhos do lugar continuados até a borda (com o hexágono, até as pontas dos caminhos do mapa; a ponta do mapa
     que sobra junta no que já existe; o caminho do lugar que sobra acaba no campo), com as pontes onde cruzam o rio;
   · os morros e os penhascos longe do lugar e da água, a vegetação e os enfeites de cada bioma, a história e os achados
     raros, as marcas da guerra (com o cerco em volta do lugar) e a estação (nos lugares que a têm).
   O desenho: o anel inteiro, o lugar por cima (sem o chão de base dele: o chão é um só), as marcas da guerra no próprio
   lugar e a vinheta. A cena: o anel montado e o lugar montado e deslocado. Com Nenhum, o lugar é o de sempre.
   --------------------------------------------------------------- */
const Arredores = (() => {
  const MO = Encontro.motor, B = Biomas, TAU = Math.PI * 2;
  const NIVEIS = [['nenhum', 'Nenhum', null, 'O lugar sozinho, como sempre'], ['pouco', 'Pouco', null, 'Uma faixa de uns 4 quadrados em volta'], ['medio', 'Médio', null, 'Uns 8 quadrados de cada lado'], ['muito', 'Muito', null, 'Uns 14 quadrados de cada lado: cabe mais (os acampamentos, a batalha)']];
  const LARG = { nenhum: 0, pouco: 4, medio: 8, muito: 14 };
  const NOME = { nenhum: 'Nenhum', pouco: 'Pouco', medio: 'Médio', muito: 'Muito' };
  const nivel = v => (typeof v === 'string' && LARG[v] != null ? v : 'medio');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const plural = (n, s, p) => n + ' ' + (n === 1 ? s : p || s + 's');
  const juntar = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
  const NORMAL = { n: [0, -1], s: [0, 1], o: [-1, 0], l: [1, 0] };
  const PELA = { n: 'pelo norte', s: 'pelo sul', o: 'pelo oeste', l: 'pelo leste' };

  /* ================= a conta ================= */
  // onde o segmento que sai de dentro (pIn) para fora (pOut) cruza a borda do retângulo W × H → [x, y, lado]
  function cruzaBorda(pIn, pOut, W, H) {
    const dx = pOut[0] - pIn[0], dy = pOut[1] - pIn[1];
    let tm = Infinity, lado = null;
    if (dx < 0) { const t = -pIn[0] / dx; if (t < tm) { tm = t; lado = 'o'; } }
    if (dx > 0) { const t = (W - pIn[0]) / dx; if (t < tm) { tm = t; lado = 'l'; } }
    if (dy < 0) { const t = -pIn[1] / dy; if (t < tm) { tm = t; lado = 'n'; } }
    if (dy > 0) { const t = (H - pIn[1]) / dy; if (t < tm) { tm = t; lado = 's'; } }
    if (!lado) return null;
    tm = clamp(tm, 0, 1);
    return [pIn[0] + dx * tm, pIn[1] + dy * tm, lado];
  }
  /* Onde uma linha do lugar (pts, no retângulo W × H dele) passa pela borda: o ponto, o lado, se ela sai (no sentido dos
     pontos: o rio vai da nascente para a foz), o pedaço de fora (da borda até a ponta, ou até voltar para dentro) e o
     pedaço de dentro junto da borda (um quadrado e meio; com hw, a meia largura da linha, também o que corre rente à beira,
    até uns oito quadrados: o desenho do lugar fica recortado nela, e o anel cobre o que passaria) →
    [{ x, y, lado, sai, fora, junta }] */
  function passagens(pts, W, H, hw) {
    const dentro = p => p[0] > 0 && p[1] > 0 && p[0] < W && p[1] < H, out = [];
    const rente = p => hw != null && Math.min(p[0], p[1], W - p[0], H - p[1]) < hw + 0.6;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], da = dentro(a), db = dentro(b);
      if (da === db) continue;
      const q = cruzaBorda(da ? a : b, da ? b : a, W, H);
      if (!q) continue;
      const sai = da && !db, fora = [[q[0], q[1]]], junta = [];
      if (sai) {
        for (let k = i; k < pts.length && !dentro(pts[k]); k++) fora.push(pts[k]);
        let L = 0;
        for (let k = i - 1, S = 0; k >= 0 && dentro(pts[k]) && (L < 1.6 || (rente(pts[k]) && S < 8)); k--) { if (junta.length) S += Math.hypot(pts[k][0] - junta[0][0], pts[k][1] - junta[0][1]); junta.unshift(pts[k]); L = Math.hypot(pts[k][0] - q[0], pts[k][1] - q[1]); }
      } else {
        for (let k = i - 1; k >= 0 && !dentro(pts[k]); k--) fora.push(pts[k]);
        let L = 0;
        for (let k = i, S = 0; k < pts.length && dentro(pts[k]) && (L < 1.6 || (rente(pts[k]) && S < 8)); k++) { if (junta.length) S += Math.hypot(pts[k][0] - junta[junta.length - 1][0], pts[k][1] - junta[junta.length - 1][1]); junta.push(pts[k]); L = Math.hypot(pts[k][0] - q[0], pts[k][1] - q[1]); }
      }
      out.push({ x: q[0], y: q[1], lado: q[2], sai, fora, junta });
    }
    return out;
  }
  const desloca = (pts, a) => pts.map(([x, y]) => [x + a, y + a]);
  // um retângulo de cantos redondos (a mancha do chão do lugar), em volta de R com a folga m
  function retRedondo(R, m) {
    const [x0, y0, x1, y1] = [R[0] - m, R[1] - m, R[2] + m, R[3] + m], r = Math.min(m * 1.6, (x1 - x0) / 3, (y1 - y0) / 3), out = [];
    for (const [cx, cy, a0] of [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]]) for (let k = 0; k <= 4; k++) { const an = a0 + k / 4 * Math.PI / 2; out.push([cx + Math.cos(an) * r, cy + Math.sin(an) * r]); }
    return out;
  }

  // a mancha do chão do lugar (quando a paleta dele é outra): uma clareira redonda e torta, do tamanho do lugar (os cantos
  // dele ficam no chão de fora, de beira macia)
  function manchaDoLugar(R, m, rnd) {
    const cx = (R[0] + R[2]) / 2, cy = (R[1] + R[3]) / 2, rx = (R[2] - R[0]) / 2 * 1.16 + m * 0.3, ry = (R[3] - R[1]) / 2 * 1.16 + m * 0.3;
    return MO.blob(rnd, cx, cy, rx, ry, 28, 0.16, (rnd() - 0.5) * 0.3);
  }

  // o que o anel pôs dentro do retângulo do lugar sai (as árvores, as pedras, os objetos, os desenhos e os itens deles; as
  // linhas que só passam, como o rio e o caminho na junta, ficam)
  function tirarDoLugar(P, R) {
    const den = (x, y) => x > R[0] + 0.1 && y > R[1] + 0.1 && x < R[2] - 0.1 && y < R[3] - 0.1;
    const tira = (arr, f) => { for (let i = arr.length - 1; i >= 0; i--) if (f(arr[i])) arr.splice(i, 1); };
    tira(P.arvores, a => den(a.x, a.y));
    tira(P.rochas, r => den(r.x, r.y));
    tira(P.objetos, o => den(o.x + (o.s || 1) / 2, o.y + (o.s || 1) / 2));
    for (const o of P.pintados) if (Array.isArray(o.itens)) o.itens = o.itens.filter(q => !den(q.x, q.y));
    tira(P.pintados, o => (Array.isArray(o.itens) && !o.itens.length) || (o.x != null && o.y != null && den(o.x, o.y)) || (o.a && o.b && den(o.a[0], o.a[1]) && den(o.b[0], o.b[1])) || (Array.isArray(o.pts) && o.pts.length && o.pts.every(q => den(q[0], q[1]))));
  }

  /* ================= o anel ================= */
  /* O plano do anel em volta do lugar pL (o adaptador ad diz o que o lugar tem); nv: o nível; o: as escolhas (estilo,
     seed, hex, guerra, estacao, arrHist, arrAchados). → o plano do motor (W + 2a × H + 2a), com o retângulo do lugar
     (R) bloqueado */
  function anel(pL, ad, nv, o) {
    const a = LARG[nv], W = pL.W, H = pL.H, W2 = W + 2 * a, H2 = H + 2 * a, N = W2 * H2;
    const estilo = Estilos.valido(o.estilo), seed = (Math.round(Number(o.seed)) >>> 0) || 1;
    const sT = (MO.sub(pL.sT || pL.seed || seed, 160) % 2147483000) + 1;
    const hex = HexCena.valida(o.hex), comHex = HexCena.aceita(hex);
    const bioL = ad.bioma(pL), palL = ad.pal(pL);
    const BB = B.BIO[comHex ? hex.ter : bioL] || B.BIO.campo, pal = BB.pal, ip = B.IDX[BB.id];
    const K = MO.contexto(W2, H2, BB.ter, 'arredores', estilo, 'trilha', sT, pal), P = K.P;
    const R = [a, a, a + W, a + H];
    const perto = (x, y, m) => x > R[0] - m && y > R[1] - m && x < R[2] + m && y < R[3] + m;
    const cel = (x, y) => clamp(Math.floor(y), 0, H2 - 1) * W2 + clamp(Math.floor(x), 0, W2 - 1);
    const nz = Tracado.ruido(MO.sub(sT, 5));
    const info = { rios: 0, caminhos: 0, pontes: 0, fim: 0 };
    // o lugar (bloqueado) e a faixa de um quadrado em volta (sem árvores)
    const bloquear = () => { for (let j = a; j < a + H; j++) for (let i = a; i < a + W; i++) K.pos(i, j, 3); };
    bloquear();
    for (let j = a - 1; j <= a + H; j++) for (let i = a - 1; i <= a + W; i++) if (K.at(i, j) === 0) K.pos(i, j, 5);
    // o que o lugar desenha além da beira dele (o mar e a praia do Porto, o lago das palafitas, as pontas do rio e dos
    // caminhos, as copas das árvores): a grade do anel sabe
    const marQ = new Uint8Array(N);                                    // (a água grande: o mar, o lago — onde o rio pode acabar)
    for (const f of ad.ocupa(pL)) {
      if (f.k === 'poli') { const pts = desloca(f.pts, a); K.marcaPoli(pts, f.v); if (f.v === 2 && f.mar) for (let q = 0; q < N; q++) if (K.occ[q] === 2 && MO.dentroPoli(pts, q % W2 + 0.5, Math.floor(q / W2) + 0.5)) marQ[q] = 1; }
      else if (f.k === 'linha') K.marcaLinha(desloca(f.pts, a), f.hw, f.v);
      else if (f.k === 'circ') K.marcaCirc(f.x + a, f.y + a, f.r, f.v);
    }
    // as linhas do lugar que passam pela beira dele (no anel)
    const LN = ad.linhas(pL), mv = q => Object.assign({}, q, { x: q.x + a, y: q.y + a, fora: desloca(q.fora, a), junta: desloca(q.junta, a) });
    const rioPass = [], camPass = [];
    LN.rios.forEach((r, k) => { for (const q of passagens(r.pts, W, H, r.hw)) rioPass.push(Object.assign(mv(q), { hw: r.hw, tipo: r.tipo || 'agua', k })); });
    // (o caminho do lugar fica recortado na beira dele: o anel continua cada um — menos o que sai junto de outro, do mesmo lado)
    LN.caminhos.forEach(c => { for (const q of passagens(c.pts, W, H, c.hw)) { const m = mv(q); if (camPass.some(z => z.lado === m.lado && Math.hypot(z.x - m.x, z.y - m.y) < 2.5)) continue; camPass.push(Object.assign(m, { hw: c.hw, tipo: c.tipo || 'trilha' })); } });

    /* ---- a altura (alta de onde o rio do lugar entra; com o hexágono, de onde o rio do mapa vem) ---- */
    const ent = rioPass.find(q => !q.sai && q.k === 0) || rioPass.find(q => !q.sai) || null, sai = rioPass.find(q => q.sai && q.k === 0) || rioPass.find(q => q.sai) || null;
    const vec = q => { const dx = q.x - W2 / 2, dy = q.y - H2 / 2, L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };
    const rr = mulberry((MO.sub(sT, 1) % 2147483000) + 1);
    const inc = ent || sai ? { de: ent ? vec(ent) : null, para: sai ? vec(sai) : null, k: 0.7 } : { de: Tracado.IDS[Math.floor(rr() * 8) % 8], para: null, k: 0.45 };
    let M = null, Ls = null, rh = null, alt;
    if (comHex) {
      M = HexCena.mapa(W2, H2, hex, BB.id, 'media');
      for (let j = a - 2; j < a + H + 2; j++) for (let i = a - 2; i < a + W + 2; i++) if (i >= 0 && j >= 0 && i < W2 && j < H2) { M.agua[j * W2 + i] = 0; M.bio[j * W2 + i] = ip; }
      Ls = HexCena.linhas(hex, W2, H2); rh = HexCena.rioDoMapa(Ls, M, W2, H2);
      alt = HexCena.altura(W2, H2, MO.sub(sT, 2), M, HexCena.distancia(W2, H2, q => M.agua[q] === 1), rh, inc);
    } else alt = B.alturas(W2, H2, MO.sub(sT, 2), inc);

    /* ---- o chão: os vizinhos (longe do lugar), o lugar no principal e a mancha dele ---- */
    let bio, vizs;
    if (comHex) { bio = M.bio; vizs = M.vizs.slice(); }
    else {
      vizs = B.vizinhosDe(Object.assign({}, BB, { viz: BB.viz.filter(v => !B.BIO[v].mar) }), 'media', rr);
      bio = B.mapaDosBiomas(W2, H2, MO.sub(sT, 3), BB, vizs, B.FRACAO.media * (N - W * H) / N, alt, null, { x: W2 / 2, y: H2 / 2, R: Math.hypot(W, H) / 2 + a });
    }
    for (let j = Math.max(0, a - 1); j < Math.min(H2, a + H + 1); j++) for (let i = Math.max(0, a - 1); i < Math.min(W2, a + W + 1); i++) bio[j * W2 + i] = ip;
    vizs = vizs.filter(v => bio.includes(B.IDX[v]));
    const bioEm = (x, y) => B.LISTA[bio[cel(x, y)]];
    P.biomas = [];
    if (palL && palL !== pal) P.biomas.push({ id: 'lugar', pal: palL, pts: [manchaDoLugar(R, Math.min(2.6, a * 0.45), mulberry((MO.sub(sT, 6) % 2147483000) + 1))] });
    for (const v of vizs) { const pts = B.manchasDe(W2, H2, bio, [v]).map(m => m.pts); if (pts.length) P.biomas.push({ id: v, pal: B.BIO[v].pal, pts }); }

    /* ---- a água dos vizinhos do hexágono (a praia, a água e a espuma) ---- */
    if (comHex && M.temAgua) {
      const ag = new Uint8Array(N);
      // (fora do lugar e do que ele põe além da beira: o mar e a praia do Porto, a trilha da costa)
      for (let q = 0; q < N; q++) { const i = q % W2, j = (q - i) / W2, v = K.occ[q]; ag[q] = M.agua[q] && !perto(i + 0.5, j + 0.5, 2) && (v === 0 || v === 4) ? 1 : 0; }
      for (const A of HexCena.aguas(W2, H2, { agua: ag })) {
        K.pinta(0, 'praia', { pts: A.praia }); K.marcaPoli(A.praia, 5);
        K.poeLago(A.pts, 'mar', -2, 2);
        K.pinta(1, 'aguaParada', { pts: A.pts, tipo: 'mar', semBeira: true });
        K.pinta(1, 'espuma', { pts: A.beira });
        for (const q of A.cel) marQ[q] = 1;
        info.agua = (info.agua || 0) + 1;
      }
      bloquear();
    }

    /* ---- o rio: o do lugar continuado até a borda (com o hexágono, até os pontos do rio do mapa); sem rio no lugar e
       com o do mapa, o do mapa passa em volta ---- */
    const borda = q => { const i = q % W2, j = (q - i) / W2; return i === 0 || j === 0 || i === W2 - 1 || j === H2 - 1; };
    const ladoQ = q => { const i = q % W2, j = (q - i) / W2, d = { n: j, s: H2 - 1 - j, o: i, l: W2 - 1 - i }; return Object.keys(d).reduce((m, k) => (d[k] < d[m] ? k : m), 'n'); };
    // (a borda do lado, perto do rumo de quem sai por ali: dentro da janela de uns a + 4 quadrados)
    const naJanela = (lado, x, y) => { const win = Math.max(5, a + 4); return q => { if (!borda(q) || K.occ[q] === 2 || K.occ[q] === 3 || ladoQ(q) !== lado) return false; const i = q % W2, j = (q - i) / W2; const t = lado === 'n' || lado === 's' ? i + 0.5 - x : j + 0.5 - y; return Math.abs(t) <= win && Math.min(i, j, W2 - 1 - i, H2 - 1 - j) >= 0 && (lado === 'n' || lado === 's' ? i >= 2 && i <= W2 - 3 : j >= 2 && j <= H2 - 3); }; };
    const ehRioQ = new Uint8Array(N);
    const marcaRio = (pts, hw) => { for (let k = 0; k < pts.length; k += 2) { const [x, y] = pts[k], rq = hw + 0.4; for (let j = Math.max(0, Math.floor(y - rq)); j <= Math.min(H2 - 1, Math.floor(y + rq)); j++) for (let i = Math.max(0, Math.floor(x - rq)); i <= Math.min(W2 - 1, Math.floor(x + rq)); i++) if (Math.hypot(i + 0.5 - x, j + 0.5 - y) <= rq) ehRioQ[j * W2 + i] = 1; } };
    // (o rio fica um pouco longe do lugar: até uns dois quadrados e meio, nos arredores maiores)
    const MR = clamp(a * 0.32, 1.3, 2.6);
    const custoRio = rev => (q, m, L) => {
      const v = K.occ[m], i = m % W2, j = (m - i) / W2;
      if (v === 3 || v === 7 || v === 8 || perto(i + 0.5, j + 0.5, MR)) return Infinity;
      const da = rev ? alt[q] - alt[m] : alt[m] - alt[q];
      return L * (1 + 9 * Math.max(0, da) + 1.6 * (rev ? 1 - alt[m] : alt[m]) + 0.65 * nz(i / 3.3, j / 3.3) + (Math.min(i, j, W2 - 1 - i, H2 - 1 - j) < 2 ? 1.5 : 0));
    };
    // o ponto de partida no anel: a ponta do pedaço de fora, levada para fora até dois quadrados do lugar
    const partida = (q, dist, doCruzamento) => { const e = doCruzamento ? [q.x, q.y] : q.fora[q.fora.length - 1], [nx, ny] = NORMAL[q.lado], d = q.lado === 'n' ? R[1] - e[1] : q.lado === 's' ? e[1] - R[3] : q.lado === 'o' ? R[0] - e[0] : e[0] - R[2]; const k = Math.max(0, (dist || 2.3) - d); return [e[0] + nx * k, e[1] + ny * k]; };
    const serpe = (pts, s, amp) => {
      const ser = B.serpentear(pts, 4, mulberry((s % 2147483000) + 1), amp, []);
      return ser.every(([x, y]) => !perto(x, y, 1.2) && x > -3 && y > -3 && x < W2 + 3 && y < H2 + 3) ? ser : pts;
    };
    const rios = [];
    // (o rio e os caminhos do lugar continuados têm as cores do lugar: a emenda na beira não aparece)
    const palDoLugar = palL && Paisagem.PAL[palL] ? palL : null;
    /* (o relevo do rio do lugar continuado — a água, com a fundura da do lugar: um só, de borda a borda) o pedaço de fora
       de cada passagem, da borda da cena até a ponta do pedaço do lugar de fora, junta com o relevo do rio do lugar num
       só (o do lugar sai dele: relevoTirado, os índices em pL.relevo) — sem a sobreposição das pontas, que dobra a cor */
    const LR = (pL.relevo || []).map((r, i) => ({ r, i })).filter(({ r }) => r.k === 'free' && (r.t === 'agua' || r.t === 'fosso') && Array.isArray(r.pts) && r.pts.length > 1);
    const relevoDe = r0 => LR.find(({ r }) => r.pts.some(([x1, y1]) => r0.pts.some(([x2, y2]) => Math.hypot(x1 - x2, y1 - y2) < 0.6))) || null;
    const pedacos = [];
    const poeRio = (pts, hw, tipo, k, corte) => {
      const def = tipo === 'lava' ? -1 : -1.2, rl = k >= 0 && LN.rios[k] ? relevoDe(LN.rios[k]) : null;
      const linha = K.poeRio(pts, hw, tipo, rl && Number.isFinite(rl.r.alt) ? rl.r.alt : def);
      if (k >= 0 && palDoLugar) P.aguas[P.aguas.length - 1].pal = palDoLugar;
      if (corte) {
        const rel = P.relevo[P.relevo.length - 1], i = linha.reduce((m, q, j) => (Math.hypot(q[0] - corte.p[0], q[1] - corte.p[1]) < Math.hypot(linha[m][0] - corte.p[0], linha[m][1] - corte.p[1]) ? j : m), 0);
        const parte = corte.sai ? linha.slice(i) : linha.slice(0, i + 1);
        if (parte.length > 1) { rel.pts = parte.filter((_, j) => j % 2 === 0 || j === parte.length - 1); pedacos.push({ rel, k, sai: corte.sai }); } else P.relevo.pop();
      }
      rios.push({ pts: linha, hw, tipo, k }); marcaRio(linha, hw);
    };
    const juntarRelevo = () => {
      LN.rios.forEach((r0, k) => {
        const rl = relevoDe(r0), en = pedacos.filter(x => x.k === k && !x.sai), sa = pedacos.filter(x => x.k === k && x.sai);
        if (!rl || en.length > 1 || sa.length > 1 || !(en.length + sa.length)) return;
        const pts = (en.length ? en[0].rel.pts : []).concat(desloca(rl.r.pts, a), sa.length ? sa[0].rel.pts : []);
        for (const x of en.concat(sa)) P.relevo.splice(P.relevo.indexOf(x.rel), 1);
        // (na cena e na prévia, a água do Vilarejo e da Cidade é a forte, a do motor a leve: o rio fica como a do lugar)
        P.relevo.push(Object.assign({ t: rl.r.t, alt: rl.r.alt, k: 'free', pts: pts.filter((q, j) => !j || Math.hypot(q[0] - pts[j - 1][0], q[1] - pts[j - 1][1]) > 0.05), sw: rl.r.sw }, ad.relevoForte ? { a: 0.55 } : rl.r.a != null ? { a: rl.r.a } : null));
        (P.relevoTirado = P.relevoTirado || []).push(rl.i);
      });
    };
    const hIni = comHex && rh ? rh.pIni : null, hFim = comHex && rh ? rh.pFim : null;
    rioPass.forEach((q, n) => {
      const S = partida(q, MR + 0.9), c0 = cel(S[0], S[1]), doMapa = q.k === 0 && (q.sai ? hFim : hIni);
      let alvo;
      if (doMapa) { const c = doMapa.cel; alvo = doMapa.borda && marQ[c] ? x => marQ[x] === 1 : x => x === c; }
      else { const j = naJanela(q.lado, q.x, q.y); alvo = q.sai ? x => j(x) || marQ[x] === 1 : j; }
      let cl = B.maisBarato(W2, H2, [c0], alvo, custoRio(!q.sai));
      if (!cl && !doMapa) cl = B.maisBarato(W2, H2, [c0], x => borda(x) && K.occ[x] !== 3, custoRio(!q.sai));
      if (!cl || !cl.length) { info.fim++; return; }
      const ult = cl[cl.length - 1], noMar = marQ[ult] === 1;
      // (no mar, no lago: a ponta entra uns dois quadrados na água, no rumo dele — saindo dali mesmo, o rumo do lado)
      const dentroDaAgua = () => { const a0 = cl[Math.max(0, cl.length - 4)], ax = a0 % W2 + 0.5, ay = Math.floor(a0 / W2) + 0.5, bx = ult % W2 + 0.5, by = Math.floor(ult / W2) + 0.5, L = Math.hypot(bx - ax, by - ay), [nx, ny] = NORMAL[q.lado]; return L > 0.5 ? [bx + (bx - ax) / L * 2.4, by + (by - ay) / L * 2.4] : [bx + nx * 2.4, by + ny * 2.4]; };
      let ext = B.linhaDe(W2, cl, null, noMar ? dentroDaAgua() : doMapa && doMapa.borda ? doMapa.fora : doMapa ? null : B.foraDa(ult, W2, H2));
      ext = serpe(ext, MO.sub(sT, 30 + n), 2.4);
      if (doMapa && doMapa.borda && !noMar) ext = B.prenderPontas(ext, W2, H2, null, doMapa);
      const meio = q.fora.slice(1).concat([S]);
      const linha = q.sai ? q.junta.concat([[q.x, q.y]], meio, ext.slice(1)) : ext.slice().reverse().concat(meio.slice().reverse(), [[q.x, q.y]], q.junta);
      poeRio(linha.filter((p, i, arr) => !i || Math.hypot(p[0] - arr[i - 1][0], p[1] - arr[i - 1][1]) > 0.05), q.hw, q.tipo, q.k, { p: q.fora[q.fora.length - 1], sai: q.sai });
    });
    juntarRelevo();
    info.rios = new Set(rios.map(r => r.k)).size;
    // (o rio do mapa, sem rio no lugar: em volta dele)
    if (comHex && rh && !rioPass.length) {
      const livre = c0 => { if (K.occ[c0] !== 3 && !perto(c0 % W2 + 0.5, Math.floor(c0 / W2) + 0.5, MR + 0.2)) return c0; let m = -1, dm = Infinity; for (let q = 0; q < N; q++) { const i = q % W2, j = (q - i) / W2; if (K.occ[q] === 3 || perto(i + 0.5, j + 0.5, MR + 0.2)) continue; const d = Math.hypot(i - c0 % W2, j - Math.floor(c0 / W2)); if (d < dm) { dm = d; m = q; } } return m; };
      const i0 = livre(rh.pIni.cel), f0 = rh.pFim ? livre(rh.pFim.cel) : -1;
      const alvo = rh.pFim && rh.pFim.borda && marQ[rh.pFim.cel] ? x => marQ[x] === 1 : f0 >= 0 ? x => x === f0 : x => borda(x) && x !== i0 && Math.hypot(x % W2 - i0 % W2, Math.floor(x / W2) - Math.floor(i0 / W2)) > Math.min(W2, H2) * 0.5;
      const cl = i0 >= 0 ? B.maisBarato(W2, H2, [i0], alvo, custoRio(false)) : null;
      if (cl && cl.length > 3) {
        const ult = cl[cl.length - 1], noMar = marQ[ult] === 1, a0 = cl[Math.max(0, cl.length - 4)], L0 = Math.hypot(ult % W2 - a0 % W2, Math.floor(ult / W2) - Math.floor(a0 / W2)) || 1;
        const naAgua = [ult % W2 + 0.5 + (ult % W2 - a0 % W2) / L0 * 2.4, Math.floor(ult / W2) + 0.5 + (Math.floor(ult / W2) - Math.floor(a0 / W2)) / L0 * 2.4];
        let pts = B.linhaDe(W2, cl, rh.pIni.borda && i0 === rh.pIni.cel ? rh.pIni.fora : null, noMar ? naAgua : rh.pFim && rh.pFim.borda && ult === rh.pFim.cel ? rh.pFim.fora : null);
        pts = serpe(pts, MO.sub(sT, 29), 3);
        pts = B.prenderPontas(pts, W2, H2, rh.pIni.borda && i0 === rh.pIni.cel ? rh.pIni : null, !noMar && rh.pFim && rh.pFim.borda && ult === rh.pFim.cel ? rh.pFim : null);
        poeRio(pts, 1.2, BB.agua === 'lava' ? 'lava' : 'agua', -1);
        info.rioDoMapa = true;
      }
    }
    bloquear();

    /* ---- os caminhos: os do lugar continuados até a borda; com o hexágono, até as pontas dos caminhos do mapa ---- */
    const passa = q => { const v = K.occ[q]; return !(v === 3 || v === 7 || v === 8 || (v === 2 && !ehRioQ[q])); };
    const nzC = Tracado.ruido(MO.sub(sT, 46));
    const custoCam = (q, m, L) => {
      if (!passa(m)) return Infinity;
      const v = K.occ[m], i = m % W2, j = (m - i) / W2;
      if (perto(i + 0.5, j + 0.5, 1.4)) return Infinity;
      let c = 1 + 12 * Math.abs(alt[m] - alt[q]) + 1.4 * nzC(i / 5, j / 5);
      if (ehRioQ[m]) c += 6;
      if (v === 5) c += 1;
      if (v === 6) c += 3.5;          // (lote 54: contorna o relevo)
      if (Math.min(i, j, W2 - 1 - i, H2 - 1 - j) < 2) c += 1.5;
      if (v === 1) c *= 0.55;
      return L * c;
    };
    const hwDe = t => (t === 'estrada' ? 1.35 : 0.75);
    const poeCaminho = (pts, tipo, hw, toco) => {
      const linha = MO.curva(pts);
      for (const x of rios.length ? Tracado.cruzamentos(linha, { rios: rios.map(r => ({ pts: r.pts, hw: r.hw })), lago: null }) : []) {
        if (perto(x.x, x.y, 2) || !K.dentro(x.x, x.y, 0.5) || P.pintados.some(o => o.k === 'ponte' && Math.hypot(o.x - x.x, o.y - x.y) < 3)) continue;
        K.ponte(x.x, x.y, x.rio.hw * 2 + 1.6, hw * 2 + 0.5, x.ang, x.rio.tipo === 'lava' ? 'pedra' : null, 1);
        info.pontes++;
      }
      // (todos os caminhos dos arredores com as cores do lugar: o que continua o dele e o do mapa que chega nele são um só)
      P.caminhos.push(Object.assign({ pts: linha, hw, tipo }, palDoLugar ? { pal: palDoLugar } : null));
      K.marcaLinha(linha, hw + 0.25, 1);
      if (toco) info.campo = (info.campo || 0) + 1; else info.caminhos++;
      return linha;
    };
    /* o começo de um caminho do lugar: o pedaço de dentro junto da beira (o desenho do lugar o cobre), a beira e a partida,
       reto para fora (o pedaço do caminho do lugar que passa da beira fica recortado: as voltas dele não entram) */
    const comeco = q => (q.junta.length ? (q.sai ? q.junta : q.junta.slice().reverse()) : [[q.x - NORMAL[q.lado][0] * 0.5, q.y - NORMAL[q.lado][1] * 0.5]]).concat([[q.x, q.y], partida(q, null, true)]);
    const livreC = c0 => { if (passa(c0) && !ehRioQ[c0] && !perto(c0 % W2 + 0.5, Math.floor(c0 / W2) + 0.5, 1.4)) return c0; let m = -1, dm = Infinity; const i0 = c0 % W2, j0 = Math.floor(c0 / W2); for (let q = 0; q < N; q++) { const i = q % W2, j = (q - i) / W2; if (!passa(q) || ehRioQ[q] || perto(i + 0.5, j + 0.5, 1.4)) continue; const d = Math.hypot(i - i0, j - j0); if (d < dm) { dm = d; m = q; } } return m; };
    const pontas = comHex ? HexCena.pontasDosCaminhos(Ls) : [];
    const ligar = (q, alvo, ate, tipo) => {
      const S = partida(q, null, true), cl = B.maisBarato(W2, H2, [cel(S[0], S[1])], alvo, custoCam);
      if (!cl || cl.length < 2) return false;
      const corte = ate ? cl.slice(0, ate) : cl, ult = corte[corte.length - 1];
      let ext = B.linhaDe(W2, corte, null, !ate && borda(ult) && !q.ponta ? B.foraDa(ult, W2, H2) : null);
      if (q.ponta && !ate) ext = B.prenderPontas(ext, W2, H2, null, q.ponta);
      // (o caminho do lugar continuado: do tipo e da largura dele — a emenda na beira não aparece)
      poeCaminho(comeco(q).concat(ext.slice(1)), q.tipo || tipo, clamp(q.hw || hwDe(tipo), 0.6, 1.5), !!ate);
      return true;
    };
    // (sem lugar na janela do lado — a água, a pedra —, por qualquer borda de terra)
    const bordaDeTerra = x => borda(x) && passa(x) && !ehRioQ[x];
    if (!comHex) for (const q of camPass) { if (!ligar(q, naJanela(q.lado, q.x, q.y), 0, q.tipo) && !ligar(q, bordaDeTerra, 0, q.tipo)) info.fim++; }
    else {
      // (os pares: a passagem do lugar e a ponta do mapa mais perto, do par mais perto para o mais longe)
      const pares = [];
      for (const q of camPass) for (const p of pontas) { const S = partida(q, null, true); pares.push([Math.hypot(S[0] - p.x, S[1] - p.y), q, p]); }
      pares.sort((x, y) => x[0] - y[0]);
      const usadaQ = new Set(), usadaP = new Set();
      for (const [, q, p] of pares) {
        if (usadaQ.has(q) || usadaP.has(p)) continue;
        usadaQ.add(q); usadaP.add(p);
        const c = livreC(p.cel);
        if (c < 0 || !ligar(Object.assign({}, q, { ponta: c === p.cel ? p : null }), x => x === c, 0, p.t === 'estrada' || q.tipo === 'estrada' ? 'estrada' : 'trilha')) info.fim++;
      }
      // (a ponta do mapa que sobrou: até o caminho que já existe — ou até a beira do lugar)
      for (const p of pontas) {
        if (usadaP.has(p)) continue;
        const c = livreC(p.cel);
        if (c < 0) continue;
        const juntoDoLugar = x => { const i = x % W2, j = (x - i) / W2; return perto(i + 0.5, j + 0.5, 2.6) && !perto(i + 0.5, j + 0.5, 1.4); };
        const cl = B.maisBarato(W2, H2, [c], x => x !== c && (K.occ[x] === 1 || juntoDoLugar(x)), custoCam);
        if (!cl || cl.length < 2) { info.fim++; continue; }
        let pts = B.linhaDe(W2, cl, c === p.cel ? p.fora : null, null);
        if (c === p.cel) pts = B.prenderPontas(pts, W2, H2, p, null);
        poeCaminho(pts, p.t, hwDe(p.t));
      }
      // (o caminho do lugar que sobrou: acaba no campo, um pouco para fora — sem lugar no rumo dele, para qualquer lado)
      const toco = Math.max(2, Math.round(a * 0.55 - 2.3)), longeQ = x => { const i = x % W2, j = (x - i) / W2; return passa(x) && !ehRioQ[x] && !perto(i + 0.5, j + 0.5, 2.3 + toco * 0.7); };
      for (const q of camPass) if (!usadaQ.has(q) && !ligar(q, naJanela(q.lado, q.x, q.y), toco, 'trilha') && !ligar(q, longeQ, toco, 'trilha')) info.fim++;
    }
    bloquear();

    /* ---- os patamares (o morro, o planalto, o paredão): longe do lugar, da água e da borda ---- */
    const dAg = HexCena.distancia(W2, H2, q => K.occ[q] === 2);
    const okP = q => { const i = q % W2, j = (q - i) / W2; return K.occ[q] === 0 && dAg[q] >= 2.5 && !perto(i + 0.5, j + 0.5, 3) && Math.min(i, j, W2 - 1 - i, H2 - 1 - j) >= (comHex ? 3 : 1); };
    const PT = B.patamares(W2, H2, alt, bio, okP);
    P.patamares = { morros: 0, planaltos: 0, paredoes: 0 };
    for (const pl of PT.planaltos) {
      const BP = B.BIO[pl.bio], cores = BP.rocha ? Paisagem.pedraDe(BP.pedra) : BP.morro;
      K.pinta(0, BP.rocha ? 'planalto' : 'morro', { pts: pl.pts, alt: pl.alt, cores });
      if (BP.rocha) K.marcaPoli(pl.pts, 6);
      P.relevo.push({ t: 'morro', alt: pl.alt, k: 'poly', pts: pl.pts });
      if (BP.rocha) P.patamares.planaltos++; else P.patamares.morros++;
    }
    for (const pd of PT.paredoes) { K.poePenhasco(pd.pts, pd.alt, Paisagem.pedraDe(B.BIO[pd.bio].pedra || 'rocha')); P.patamares.paredoes++; }
    bloquear();

    /* ---- a guerra e a história: o que havia antes da vegetação ---- */
    const GU = comHex && hex.guerra ? MarcasGuerra.escolha(hex.guerra, o.guerra) : null;
    const hist = MarcasGuerra.comHistoria(Historia.valida(o.arrHist), GU), comHist = hist.length > 0 || o.arrAchados === true;
    const A13 = comHist || GU ? Historia.antes(K) : null;

    /* ---- a vegetação e os enfeites de cada bioma ---- */
    const rV = mulberry((MO.sub(seed, 162) % 2147483000) + 1);
    const nb = Tracado.ruido(MO.sub(sT, 44)), EB = 1 / 6.5, bq = (x, y) => clamp((nb(x * EB, y * EB) - 0.42) / 0.22, 0, 1);
    const E = Estilos.de(estilo);
    const hsh = (i, j, k) => { let x = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1442695041) + (sT | 0); x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
    const bioJ = (x, y) => { const i = Math.floor(x * 2), j = Math.floor(y * 2); return bioEm(x + (hsh(i, j, 1) - 0.5) * 2.4, y + (hsh(i, j, 2) - 0.5) * 2.4); };
    const G = B.grupos(W2, H2, q => { const i = q % W2, j = (q - i) / W2; return K.at(i, j) === 0 && bioEm(i + 0.5, j + 0.5).mata && bq(i + 0.5, j + 0.5) > 0.62; });
    G.grupos.forEach((cl, g) => { if (cl.length < 10) return; const pts = B.contornoDe(cl, W2, H2, G.marca, g, 3, 0.75); if (pts) P.relevo.push({ t: 'mata', alt: 0, k: 'poly', pts }); });
    P.densBase = 1;
    P.dens = (x, y) => bioJ(x, y).dens * (0.25 + 1.75 * bq(x, y));
    P.esp = (x, y, rnd) => bioJ(x, y).arv(E, rnd, estilo);
    P.juncos = Math.max(0, ...[BB.id].concat(vizs).map(id => B.BIO[id].juncos || 0));
    MO.vegetacao(K, rV);
    P.arvores = P.arvores.filter(t => t.esp !== 'juncos' || (bioEm(t.x, t.y).juncos || 0) > 0);
    for (const t of P.arvores) { const b = bioEm(t.x, t.y); if (t.pal == null) t.pal = b.pal; if (t.neve == null) t.neve = !!b.neve; }
    for (let k = 0, tent = 0, n = Math.round((N - W * H) / 150); k < n && tent < 260; tent++) {
      const i = 1 + Math.floor(rV() * (W2 - 2)), j = 1 + Math.floor(rV() * (H2 - 2)), ids = bioEm(i + 0.5, j + 0.5).enf, id = ids[Math.floor(rV() * ids.length) % ids.length];
      if (K.objeto(id, i, j, Math.floor(rV() * 4) * 90, v => v === 0)) k++;
    }
    for (let t = 0, n = Math.round(N / 4); t < n; t++) {
      const x = 0.5 + rV() * (W2 - 1), y = 0.5 + rV() * (H2 - 1), b = bioEm(x, y);
      if (rV() >= b.pedrinhas / 192 || K.at(Math.floor(x), Math.floor(y)) !== 0) continue;
      P.rochas.push({ x, y, r: 0.25 + rV() * 0.3, cores: Paisagem.pedraDe(b.pedra || b.pal) }); K.pos(Math.floor(x), Math.floor(y), 4);
    }

    /* ---- a guerra (o cerco em volta do lugar) e a história, depois da vegetação ---- */
    const lugarG = { R, nome: (pL.nomeLugar || ''), muro: ad.muro ? ad.muro(pL, a) : null, portoes: ad.portoes ? ad.portoes(pL, a) : [], predios: ad.predios ? ad.predios(pL, a) : [], nivel: nv };
    const feitosG = GU ? MarcasGuerra.noLugar(K, A13, { g: GU, sT, evitar: [], lugar: lugarG }) : [];
    if (comHist) Historia.noLugar(K, A13, { historia: hist, achados: o.arrAchados === true, seed, sT, evitar: feitosG, bat: GU && GU.velha });
    // (nada do anel fica dentro do lugar: o que a história ou a guerra puseram passando da beira dele sai)
    tirarDoLugar(P, R);
    // (lote 13, parte 13c) a estação, nos lugares que a têm
    if (ad.estacao) Estacoes.noPlano(K, o.estacao);
    bloquear();
    delete P.dens; delete P.esp;
    P.marcas = {};
    if (comHex) P.hex = { k: hex.k, q: hex.q, r: hex.r, orient: hex.orient, viz: Object.assign({}, hex.viz), ter: hex.ter, nome: hex.nome, rios: Ls.rios.length, caminhos: Ls.caminhos.length, agua: info.agua || 0, rioDoMapa: !!rh, camDoMapa: Ls.caminhos.length > 0 };
    return Object.assign(P, { v: 1, lugar: 'arredores', nivel: nv, a, seed, sT, bioma: BB.id, vizinhos: vizs, R, info, comMarcas: true, occ: Array.from(K.occ) });
  }

  /* ================= o desenho, a prévia e a cena ================= */
  // o fundo: o anel inteiro (sem a vinheta), o lugar por cima (sem o chão de base), as marcas no lugar e a vinheta
  function pintar(p, c, ad) {
    const pA = p.anel, pL = p.lugar, a = p.a;
    const cv = MO.pintar(pA, c, { semVinheta: true, estacaoFora: ad.estacao && pA.estacao ? [a, a, a + pL.W, a + pL.H] : null });
    const g = cv.getContext('2d');
    g.globalAlpha = 1;
    ad.pintar(g, pL, c, a);
    if (pA.sobreLugar && pA.sobreLugar.length) { const rnd = mulberry((pA.seed ^ 0x3a5f19c7) >>> 0 || 5); for (const o of pA.sobreLugar) MO.pintaObjeto(g, o, c, rnd, pA); }
    Paisagem.acabamento(g, p.W * c, p.H * c, { sol: ['floresta', 'selva', 'pantano', 'corrompida'].includes(pA.terreno), seed: pA.seed, cor: true });      // (lote 25)
    Paisagem.vinheta(g, p.W, p.H, c, 0.22);
    return cv;
  }
  function previa(cv, p, maxW, maxH, op, ad) {
    const cell = Math.max(3, Math.floor(Math.min((maxW || 460) / p.W, (maxH || 330) / p.H)));
    const fundo = pintar(p, cell, ad);
    cv.width = fundo.width; cv.height = fundo.height;
    const g = cv.getContext('2d');
    g.drawImage(fundo, 0, 0);
    MO.previaSobre(g, p.anel, cell, op);
    g.save(); g.translate(p.a * cell, p.a * cell); ad.previaSobre(g, semRelevoTirado(p), cell, op); g.restore();
    return { cell };
  }
  // o lugar sem o relevo dos rios que o anel juntou no dele (um rio, um relevo só)
  const semRelevoTirado = p => { const t = p.anel.relevoTirado; return t && t.length ? Object.assign({}, p.lugar, { relevo: (p.lugar.relevo || []).filter((r, i) => !t.includes(i)) }) : p.lugar; };
  // o que a cena de rascunho do lugar ganhou vai para a cena, deslocado (d pixels)
  function deslocar(tmp, sc, d) {
    for (const t of tmp.tokens) { t.x += d; t.y += d; sc.tokens.push(t); }
    for (const w of tmp.walls) { w.x1 += d; w.y1 += d; w.x2 += d; w.y2 += d; sc.walls.push(w); }
    for (const l of tmp.lights) { l.x += d; l.y += d; sc.lights.push(l); }
    for (const s of tmp.shapes) { if (Array.isArray(s.pts)) s.pts = s.pts.map(v => v + d); if (s.x != null) { s.x += d; s.y += d; } sc.shapes.push(s); }
    for (const e of tmp.effects) { e.x += d; e.y += d; sc.effects.push(e); }
  }
  async function criar(L, ad, p, nome, ex) {
    ex = ex || {};
    const pL = p.lugar, pA = p.anel;
    const sc = newScene(String(nome || '').trim().slice(0, 60) || L.nomePadrao(pL));
    if (typeof ex.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(ex.id) && !Store.S.scenes[ex.id]) sc.id = ex.id;   // (o id que o Mapa-múndi já ligou ao marcador)
    sc.cols = p.W; sc.rows = p.H;
    sc.fog.dynamic = true; sc.fog.explored = true;
    const tom = TONES.find(t => t.id === ex.hora) || TONES[0];
    sc.tone = tom.id; sc.light = tom.light;
    sc.weather = { k: WEATHERS.some(w => w[0] === ex.clima) ? ex.clima : '', pow: 0.6 };
    sc.bgColor = (Paisagem.PAL[pA.pal] || Paisagem.PAL.campo).base; sc.bg.stretch = true;
    try { const cv = pintar(p, MO.resolucao(p.W, p.H), ad); const as = await Assets.fromCanvas(cv, 'bg', sc.name); sc.bg.asset = as.id; } catch (e) { console.error(e); }
    MO.montar(sc, pA, sc.cell, { relevo: ex.relevo !== false });
    const tmp = { tokens: [], walls: [], lights: [], shapes: [], effects: [], tone: sc.tone, light: sc.light, cell: sc.cell, cols: pL.W, rows: pL.H };
    ad.montar(tmp, semRelevoTirado(p), sc.cell, { relevo: ex.relevo !== false });
    deslocar(tmp, sc, p.a * sc.cell);
    normalizeScene(sc);
    Store.addScene(sc); Persist.scene(sc.id); Persist.meta();
    return sc;
  }
  // o resumo dos arredores (depois do resumo do lugar)
  function textoAnel(p) {
    const pA = p.anel, I = pA.info || {}, partes = ['os arredores ' + NOME[p.arredores] + ' (' + p.W + ' × ' + p.H + ' quadrados)'];
    const viz = (pA.vizinhos || []).filter(v => B.BIO[v]).map(v => B.BIO[v].n.toLowerCase());
    if (viz.length) partes.push('manchas de ' + juntar(viz));
    const pm = pA.patamares || {}, rel = [];
    if (pm.morros) rel.push(plural(pm.morros, 'morro'));
    if (pm.planaltos) rel.push(plural(pm.planaltos, 'planalto'));
    if (pm.paredoes) rel.push(plural(pm.paredoes, 'penhasco'));
    if (rel.length) partes.push(juntar(rel));
    if (I.rioDoMapa) partes.push('o rio do mapa passa em volta');
    else if (I.rios) partes.push(I.rios === 1 ? 'o rio segue até a borda' : 'os rios seguem até a borda');
    if (I.caminhos) partes.push(I.caminhos === 1 ? 'um caminho até a borda' : plural(I.caminhos, 'caminho') + ' pelos arredores');
    if (I.pontes) partes.push(plural(I.pontes, 'ponte'));
    if (I.campo) partes.push(I.campo === 1 ? 'um caminho do lugar acaba no campo (o mapa não tem caminho ali)' : I.campo + ' caminhos do lugar acabam no campo (o mapa não tem caminho ali)');
    if (pA.estacao) partes.push(Estacoes.texto(pA));
    if (pA.historia && pA.historia.length) partes.push('a história: ' + juntar(pA.historia.map(q => q.txt || q.n.toLowerCase())));
    if (pA.historiaFora && pA.historiaFora.length) partes.push('sem lugar para ' + juntar(pA.historiaFora.map(n => n.toLowerCase())) + (p.arredores !== 'muito' ? ' (com os arredores em Muito cabe mais)' : ''));
    if (pA.achado) partes.push('um achado raro (' + pA.achado.n.toLowerCase() + ')');
    partes.push(...MarcasGuerra.texto(pA));
    if (pA.hex) partes.push(HexCena.resumoTxt(pA.hex));
    return partes;
  }

  /* ================= a janela: o lugar com os arredores ================= */
  /* L: o lugar (a aba da janela); ad: o adaptador — { aceita(st), bioma(p), pal(p), extra(st, a, hex), ocupa(p),
     linhas(p), pintar(g, p, c, a), montar(sc, p, c, op), previaSobre(g, p, cell, op), estacao, muro, portoes, predios,
     preencherHex(st, hex), rioHex(st, hex) } */
  function envolver(L, ad) {
    const doLugar = p => (p && p.arredores ? p.lugar : p);
    const ativo = st => !!st && ad.aceita(st) && LARG[st.arredores] > 0;
    const lembrar = st => { App.opt.genArr = st.arredores; App.opt.arrHist = Historia.valida(st.arrHist); App.opt.arrAchados = st.arrAchados !== false; };
    const L2 = Object.assign({}, L, {
      aceitaArredores: true,
      padrao: () => Object.assign(L.padrao(), { arredores: nivel(App.opt.genArr), arrHist: Historia.valida(App.opt.arrHist), arrAchados: App.opt.arrAchados !== false }),
      controles(st, K, mudou, ctx) {
        const el = L.controles(st, K, mudou, ctx), { field, seg, toggle, note } = K;
        const ok = ad.aceita(st), linha = h('div', { class: 'ger-l ger-arr', id: 'ger-arr-linha' },
          field('Arredores', ok ? seg('ger-arredores', nivel(st.arredores), NIVEIS.map(([k, n, , d]) => [k, n, null, d]), v => { st.arredores = v; lembrar(st); mudou(true); }) : (n => { n.id = 'ger-arredores-nao'; return n; })(note('No mapa de bairros, os arredores não entram: só na cena completa.')), 'stack'));
        const extra = ativo(st) ? h('div', { class: 'ger-arr-hist', id: 'ger-arr-hist' },
          Historia.campo({ get historia() { return st.arrHist; }, set historia(v) { st.arrHist = v; } }, K, () => { lembrar(st); mudou(true); }, 'arr'),
          toggle('arr-achados', st.arrAchados !== false, v => { st.arrAchados = v; lembrar(st); mudou(true); }, 'Achados raros nos arredores: a semente decide, um em cada quatro lugares (só você vê o marcador)')) : null;
        // (logo depois da linha do Tamanho)
        const filhos = [...el.children], iT = filhos.findIndex(c => c.querySelector && c.querySelector('[id$="-tam"]')), ref = (iT >= 0 ? filhos[iT + 1] : el.children[1]) || null;
        el.insertBefore(linha, ref);
        if (extra) el.insertBefore(extra, ref);
        return el;
      },
      opcoesDe: st => Object.assign(L.opcoesDe(st), { arredores: nivel(st.arredores) }, Historia.valida(st.arrHist).length ? { arrHist: Historia.valida(st.arrHist) } : null, { arrAchados: st.arrAchados !== false }),
      aplicarOpcoes(st, o, op) {
        L.aplicarOpcoes(st, o, op);
        // (o modelo de antes dos arredores: o lugar sozinho, como era)
        if (typeof o.arredores === 'string' && LARG[o.arredores] != null) st.arredores = o.arredores; else if (op && op.modelo) st.arredores = 'nenhum';
        if (Array.isArray(o.arrHist) || (op && op.modelo)) st.arrHist = Historia.valida(o.arrHist);
        if (typeof o.arrAchados === 'boolean') st.arrAchados = o.arrAchados; else if (op && op.modelo) st.arrAchados = false;
      },
      gerar(st, comum) {
        if (!ativo(st)) return L.gerar(st, comum);
        const nv = nivel(st.arredores), a = LARG[nv], hex = comum && comum.hex ? HexCena.valida(comum.hex) : null;
        const pL = L.gerar(Object.assign({}, st, ad.extra ? ad.extra(st, a, hex) : null), comum);
        const pA = anel(pL, ad, nv, Object.assign({}, comum, { arrHist: st.arrHist, arrAchados: st.arrAchados !== false }));
        return { arredores: nv, a, W: pL.W + 2 * a, H: pL.H + 2 * a, lugar: pL, anel: pA, soltas: pL.soltas, lugarId: L.id };
      },
      previa: (cv, p, maxW, maxH, op) => (p && p.arredores ? previa(cv, p, maxW, maxH, op, ad) : L.previa(cv, p, maxW, maxH, op)),
      resumo: p => (p && p.arredores ? L.resumo(p.lugar).replace(/\.\s*$/, '') + ' · ' + textoAnel(p).join(' · ') + '.' : L.resumo(p)),
      partes: p => L.partes(doLugar(p)),
      parteEm: (p, x, y) => (p && p.arredores ? L.parteEm(p.lugar, x - p.a, y - p.a) : L.parteEm(p, x, y)),
      nomeDaParte: (p, parte) => L.nomeDaParte(doLugar(p), parte),
      formaDaParte: (p, parte) => {
        const fs = L.formaDaParte(doLugar(p), parte);
        if (!p || !p.arredores) return fs;
        const a = p.a;
        return fs.map(f => (f.k === 'circ' ? Object.assign({}, f, { x: f.x + a, y: f.y + a }) : Object.assign({}, f, { pts: desloca(f.pts, a) })));
      },
      travada: (p, parte) => L.travada(doLugar(p), parte),
      alternar: (p, parte, trava) => L.alternar(doLugar(p), parte, trava),
      quantasTravadas: p => L.quantasTravadas(doLugar(p)),
      baseDe: p => L.baseDe(doLugar(p)),
      travaDe: p => L.travaDe(doLugar(p)),
      nomePadrao: p => L.nomePadrao(doLugar(p)),
      criar: (p, nome, ex) => (p && p.arredores ? criar(L, ad, p, nome, ex) : L.criar(p, nome, ex)),
      feito: (sc, p) => L.feito(sc, doLugar(p)) + (p && p.arredores ? ' Os arredores (' + NOME[p.arredores] + ') vieram junto.' : ''),
      // (lote 14, parte 14c) o hexágono do Mapa-múndi: com os arredores (o chão dele vai em volta do lugar)
      aceitaHex: (st, hex) => HexCena.aceita(hex) && ativo(st),
      hexNaoTxt: (st, hex) => (!HexCena.aceita(hex) ? null : !ad.aceita(st) ? 'No mapa de bairros, o chão do hexágono não entra: só na cena completa.' : 'Com os arredores em Nenhum, o chão do hexágono não entra: escolha Pouco, Médio ou Muito.'),
      preencherHex: (st, hex) => { if (ad.preencherHex) ad.preencherHex(st, hex); },
    });
    return L2;
  }

  /* ================= os adaptadores dos lugares ================= */
  const DIRS_DO = (hex, W, H) => {
    const Ls = HexCena.linhas(hex, W || 100, H || 100), dir = p => HexCena.dirDe(p.x, p.y, W || 100, H || 100);
    const r0 = Ls.rios[0] || null, de = r0 && r0.ini.borda ? dir(r0.ini) : null, para = r0 ? (r0.fim.borda ? dir(r0.fim) : 'lago') : null;
    const portoes = Tracado.lista(HexCena.pontasDosCaminhos(Ls).map(dir));
    return { rio: !!r0, de, para: para === de ? null : para, portoes };
  };
  // o lugar vem preenchido pelo hexágono: o rio (ligado, de onde vem e para onde vai) e os portões nas direções dos caminhos
  const preencherTracado = (st, hex, comRio) => {
    const d = DIRS_DO(hex), t = st.t || (st.t = Tracado.padrao());
    if (comRio) st.rio = d.rio;
    if (d.rio) { t.rioDe = d.de; t.rioPara = d.para; }
    t.portoes = d.portoes.length ? d.portoes : null;
  };
  // o que um lugar do motor desenha além da beira (a água, os caminhos, a pedra, as manchas e os desenhos do chão, as copas)
  function ocupaMotor(p) {
    const out = [];
    for (const ag of p.aguas) out.push(ag.k === 'lago' ? { k: 'poli', pts: ag.pts, v: 2, mar: true } : { k: 'linha', pts: ag.pts, hw: ag.hw + 0.3, v: 2 });
    for (const cm of p.caminhos) out.push({ k: 'linha', pts: cm.pts, hw: cm.hw + 0.25, v: 1 });
    for (const m of p.massas) out.push({ k: 'poli', pts: m.pts, v: 3 });
    for (const m of p.chao) out.push({ k: 'poli', pts: m.pts, v: 5 });
    for (const o of p.pintados) if (o.pts && o.pts.length > 1 && (o.z === 0 || o.z === 1)) out.push(MO.LINHAS_PINTADAS[o.k] || o.k === 'quebraMar' ? { k: 'linha', pts: o.pts, hw: (o.larg || 1) / 2 + 0.3, v: 5 } : { k: 'poli', pts: o.pts, v: 5 });
    for (const t of p.arvores) out.push({ k: 'circ', x: t.x, y: t.y, r: Math.max(0.5, t.r * 0.8), v: 4 });
    for (const r of p.rochas) if (r.grande) out.push({ k: 'circ', x: r.x, y: r.y, r: r.r, v: 3 });
    return out;
  }
  const linhasMotor = p => ({ rios: p.aguas.filter(x => x.k === 'rio').map(x => ({ pts: x.pts, hw: x.hw, tipo: x.tipo })), caminhos: p.caminhos.map(c => ({ pts: c.pts, hw: c.hw, tipo: c.tipo })) });
  const contornoDe = k => { try { const c = Estilos.contorno(k); if (Array.isArray(c) && c.length >= 3) return c; } catch (e) { /* (a forma que o estilo não conhece: o retângulo) */ } return [[k.x, k.y], [k.x + k.w, k.y], [k.x + k.w, k.y + k.h], [k.x, k.y + k.h]]; };
  // (as moradias redondas da tribo — a tenda, a iurte, o iglu — queimam na forma delas)
  const REDONDA = { tenda: true, iurte: true, iglu: true };
  const prediosDe = (lista, a, aberto) => lista.map(k => {
    const redonda = !!REDONDA[k.desenho], pts = redonda ? MO.elipse(k.x + k.w / 2, k.y + k.h / 2, k.w / 2, k.h / 2, 18) : contornoDe(k);
    return Object.assign({ pts: desloca(pts, a), x: k.x + a, y: k.y + a, w: k.w, h: k.h, aberto: aberto != null ? aberto : !!k.aberto }, redonda ? { redonda: true } : null);
  });
  const motor = (extra, outro) => Object.assign({
    aceita: () => true,
    ocupa: ocupaMotor,
    linhas: linhasMotor,
    pintar: (g, p, c, a) => MO.pintar(p, c, { g, dx: a, dy: a, semChao: true, semVinheta: true, estacaoEm: p.estacao ? [0, 0, p.W, p.H] : null, recorteLinhas: [0, 0, p.W, p.H] }),
    montar: (sc, p, c, op) => MO.montar(sc, p, c, op),
    previaSobre: (g, p, cell, op) => MO.previaSobre(g, p, cell, op),
    predios: (p, a) => prediosDe(p.predios, a),
    // (o portão arrombado do forte, os portões da paliçada da tribo: onde o aríete fica, no cerco do próprio lugar)
    portoes: (p, a) => p.pintados.flatMap(o => (o.k === 'portaoQuebrado' ? [o] : o.k === 'palicada' ? o.portoes || (o.portao ? [o.portao] : []) : [])).map(q => ({ x: q.x + a, y: q.y + a })),
    estacao: true,
  }, extra, outro);
  const TER4 = { campo: 'campo', floresta: 'floresta', areia: 'deserto', neve: 'neve' };
  // (o Vilarejo e a Cidade) o rio, o afluente e o lago, que passam da beira deles
  const aguaDoLugar = p => [p.rio, p.afluente].filter(Boolean).map(r => ({ k: 'linha', pts: r.pts, hw: r.hw + 0.3, v: 2 })).concat(p.lago ? [{ k: 'poli', pts: p.lago, v: 2 }] : []);
  const AD = {
    vila: {
      aceita: () => true,
      bioma: p => TER4[p.terreno] || 'campo',
      pal: p => (Paisagem.PAL[p.terreno] ? p.terreno : 'campo'),
      ocupa: p => p.arvores.map(t => ({ k: 'circ', x: t.x, y: t.y, r: Math.max(0.5, t.r * 0.8), v: 4 })).concat(aguaDoLugar(p)),
      linhas: p => ({ rios: [p.rio, p.afluente].filter(Boolean).map(r => ({ pts: r.pts, hw: r.hw, tipo: 'agua' })), caminhos: p.ruas.map(r => ({ pts: r.pts, hw: r.hw, tipo: 'estrada' })) }),
      pintar: (g, p, c, a) => Vila.pintar(p, c, { g, dx: a, dy: a, semChao: true, semVinheta: true, recorte: true }),
      montar: (sc, p, c, op) => Vila.montar(sc, p, c, op),
      previaSobre: (g, p, cell, op) => Vila.previaSobre(g, p, cell, op),
      predios: (p, a) => prediosDe(p.casas, a, true),
      relevoForte: true,
      muro: (p, a) => (p.muro ? (p.muro.anel ? desloca(p.muro.anel, a) : [[p.muro.x1 + a, p.muro.y1 + a], [p.muro.x2 + a, p.muro.y1 + a], [p.muro.x2 + a, p.muro.y2 + a], [p.muro.x1 + a, p.muro.y2 + a]]) : null),
      portoes: (p, a) => (p.muro ? p.muro.portoes.map(g => ({ x: (g.x1 + g.x2) / 2 + a, y: (g.y1 + g.y2) / 2 + a })) : []),
      estacao: false,
      preencherHex: (st, hex) => preencherTracado(st, hex, true),
    },
    cidade: {
      aceita: st => st.modo !== 'bairros',
      bioma: p => TER4[p.terreno] || 'campo',
      pal: p => (Paisagem.PAL[p.terreno] ? p.terreno : 'campo'),
      extra: (st, a, hex) => (st.mar ? Object.assign({ alem: a + 7 }, hex ? { ladoMar: ladoDaAgua(hex) } : null) : null),
      ocupa: p => p.arvores.map(t => ({ k: 'circ', x: t.x, y: t.y, r: Math.max(0.5, t.r * 0.8), v: 4 })).concat(aguaDoLugar(p), p.mar ? [{ k: 'poli', pts: p.mar.poli, v: 2, mar: true }].concat((p.mar.praias || []).map(pts => ({ k: 'poli', pts, v: 5 }))) : []),
      linhas: p => ({ rios: [p.rio, p.afluente].filter(Boolean).map(r => ({ pts: r.pts, hw: r.hw, tipo: 'agua' })), caminhos: p.ruas.filter(r => r.k === 'principal').map(r => ({ pts: r.pts, hw: r.hw, tipo: 'estrada' })) }),
      pintar: (g, p, c, a) => Cidade.pintar(p, c, false, { g, dx: a, dy: a, semChao: true, semVinheta: true, recorte: true }),
      montar: (sc, p, c, op) => Cidade.montar(sc, p, c, op),
      previaSobre: (g, p, cell, op) => Cidade.previaSobre(g, p, cell, op),
      predios: (p, a) => prediosDe(p.predios, a, false),
      relevoForte: true,
      muro: (p, a) => (p.ring ? desloca(p.ring, a) : null),
      portoes: (p, a) => (p.portoes || []).map(g => ({ x: g.x + a, y: g.y + a })),
      estacao: false,
      preencherHex: (st, hex) => { preencherTracado(st, hex, true); if (st.mar && !ladoDaAgua(hex)) st.mar = false; },
    },
    // (nos lugares do motor, o terreno do plano já é o dos encontros: campo, floresta, deserto, neve, selva, pântano)
    tribo: motor({
      bioma: p => (B.BIO[p.terreno] ? p.terreno : 'floresta'),
      pal: p => p.pal,
      preencherHex: (st, hex) => preencherTracado(st, hex, false),
    }),
    ruinas: motor({
      bioma: p => (B.BIO[p.terreno] ? p.terreno : 'campo'),
      pal: p => p.pal,
    }),
    porto: motor({
      bioma: p => (B.BIO[p.terreno] ? p.terreno : 'campo'),
      pal: p => p.pal,
      extra: (st, a, hex) => Object.assign({ alem: a + 7 }, hex ? { ladoMar: ladoDaAgua(hex) } : null),
    }),
  };
  // o lado do mapa onde o hexágono tem água (o vizinho de água; o primeiro), para o mar do Porto e da Cidade
  function ladoDaAgua(hex) {
    const Ls = HexCena.LADOS[hex.orient];
    for (const L of Ls) if (hex.viz[L.d] === 'agua') return L.l;
    return null;
  }
  // (para o Traçado dos lugares) o rio e os portões que vêm do hexágono, em palavras, no lugar da rosa — com o rio ligado
  function notasHex(ctx, comRio) {
    const hx = ctx && ctx.hex ? ctx.hex : null;
    if (!hx) return null;
    const rio = comRio && hx.rios.length ? HexCena.rioTxt(hx) : '', cam = hx.caminhos.length ? HexCena.caminhosTxt(hx) : '';
    return { rioHex: rio ? 'O rio vem do hexágono do Mapa-múndi: ' + rio + '.' : null, portoesHex: cam ? 'Os portões ficam onde chegam os caminhos do hexágono do Mapa-múndi: ' + cam + '.' : null };
  }
  const LUGARES = { vila: envolver(Vila.LUGAR, AD.vila), cidade: envolver(Cidade.LUGAR, AD.cidade), tribo: envolver(Tribo.LUGAR, AD.tribo), ruinas: envolver(Ruinas.LUGAR, AD.ruinas), porto: envolver(Porto.LUGAR, AD.porto) };
  return { NIVEIS, LARG, nivel, passagens, cruzaBorda, anel, pintar, previa, criar, envolver, AD, LUGARES, ladoDaAgua, DIRS_DO, notasHex };
})();
