/* ---------------------------------------------------------------
   10fa. AS MARCAS DA GUERRA (lote 14, parte 14b)
   Na cena do hexágono do Mapa-múndi (a Região livre e o Encontro), o que a guerra deixou ali (mundo/nucleo.js,
   guerraDoHex), cada coisa com o seu botão na janela:
   · a batalha fresca (até 7 dias): o chão pisado, os caídos discretos (as silhuetas e as manchas escuras, sem sangue à
     mostra, com o pano na cor do lado), as armas e os escudos nas cores dos lados, as flechas fincadas, os cavalos, os
     buracos das pedras, o estandarte de quem venceu fincado e o de quem perdeu caído; no dia e no seguinte, as brasas
     ainda acesas (a zona e a luz); depois, os corvos; do terceiro dia em diante, as covas — com menos caídos e menos
     armas a cada dia (os mortos enterrados, as armas recolhidas). Com mais de 7 dias, ela vira a Batalha antiga da
     história do lugar (com o nome e as cores dela);
   · o hexágono destruído (o chão queimado com as cinzas, as árvores carbonizadas, os tocos e a casa queimada) ou
     corrompido (a terra roxa com os veios que brilham, as árvores mortas e os cristais negros);
   · o acampamento de cada exército (até dois): as tendas em roda da tenda do comando, nas cores da facção, as fogueiras
     acesas, o estandarte, as provisões e as máquinas de cerco paradas — mais tropas, mais tendas e fogueiras (até 16
     tendas; o que não cabe na cena fica de fora, e o resumo diz);
   · o cerco do lugar que fica no hexágono: a trincheira com as estacas e as máquinas viradas para o lugar (do lado
     dele, além da trincheira), o acampamento de quem cerca atrás delas e, entre a trincheira e o lugar, as flechas e os
     buracos dos tiros de lá.
   Tudo entra depois da vegetação (como a história do lugar), com o sorteio dele, longe da borda (a borda fica como a do
   vizinho) e do meio da situação; cada coisa ganha o marcador oculto do mestre, com o nome do que é. Sem guerra no
   hexágono, nada muda.
   --------------------------------------------------------------- */
const MarcasGuerra = (() => {
  const TAU = Math.PI * 2, MO = Encontro.motor;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const FRESCA = 7, MARGEM = 2.5, MARGEM_LUGAR = 1.6;           // (lote 14, parte 14c: nos arredores de um lugar, a borda fica mais perto)
  // as perdas pelo tamanho da vitória (as de mundo/guerra.js): quem perde e quem vence
  const PERDA_P = [0.06, 0.12, 0.22, 0.35, 0.5], PERDA_V = [0.06, 0.08, 0.07, 0.06, 0.04];
  const juntar = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
  const plural = (n, s, p) => n + ' ' + (n === 1 ? s : p || s + 's');
  const milhar = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const quando = d => (d <= 0 ? 'hoje' : d === 1 ? 'ontem' : 'há ' + d + ' dias');
  const nomeBat = b => b.nome || 'Batalha: ' + b.a.nome + ' × ' + b.b.nome;
  const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const NA_DIR = { n: 'ao norte', ne: 'a nordeste', l: 'a leste', se: 'a sudeste', s: 'ao sul', so: 'a sudoeste', o: 'a oeste', no: 'a noroeste' };

  /* ================= o que vem do hexágono, e a escolha da janela ================= */
  /* As marcas que o hexágono traz (gu: a guerra dele, já conferida — HexCena.validaGuerra), cada uma com o botão da
     janela: [{ k, n (o texto), dica, on (ligada de começo: o exército escondido no mapa começa desligado) }] */
  function itens(gu) {
    const out = [];
    if (!gu) return out;
    if (gu.bat) {
      const b = gu.bat, velha = b.dias > FRESCA;
      out.push({ k: 'bat', n: nomeBat(b) + ' (' + quando(b.dias) + ')' + (velha ? ': vira a Batalha antiga' : ''), on: true,
        dica: velha ? 'Mais de 7 dias: entra como a Batalha antiga da história do lugar (as armas enferrujadas, os ossos, o túmulo e o estandarte rasgado nas cores dela)'
          : 'O campo de batalha: o chão pisado, os caídos discretos (silhuetas e manchas escuras, sem sangue), as armas, as flechas e os estandartes' + (b.dias <= 1 ? '; as brasas ainda acesas' : '; menos caídos a cada dia') });
    }
    if (gu.marca) out.push({ k: 'marca', n: gu.marca === 'd' ? 'Hexágono destruído' : 'Hexágono corrompido', on: true,
      dica: gu.marca === 'd' ? 'O chão queimado com as cinzas, as árvores carbonizadas, os tocos e a casa queimada' : 'A terra roxa com os veios que brilham, as árvores mortas e os cristais negros' });
    (gu.exes || []).forEach((e, i) => out.push({ k: 'exe' + i, n: 'Acampamento: ' + e.nome + ' (' + milhar(e.tropas) + ' tropas)' + (e.oculto ? ' · escondido no mapa' : ''), on: !e.oculto,
      dica: 'As tendas em roda da tenda do comando, nas cores ' + (e.fac ? 'da facção (' + e.fac + ')' : 'do exército') + ', as fogueiras acesas e o estandarte; mais tropas, mais tendas (até 16)' + (e.maq ? '; as máquinas de cerco paradas' : '') + (e.oculto ? '. Ele está escondido dos jogadores no mapa: começa desligado.' : '') }));
    if (gu.cerco) out.push({ k: 'cerco', n: 'Cerco de ' + gu.cerco.nome + ' (' + (gu.cerco.dias ? 'há ' + plural(gu.cerco.dias, 'dia') : 'começou hoje') + ')', on: true,
      dica: gu.cerco.aqui ? 'Em volta do lugar: a trincheira com as estacas, ' + (gu.cerco.maq ? 'as máquinas viradas para ele' + (gu.cerco.maq.ariete ? ', o aríete diante do portão' : '') : 'o posto de quem cerca') + ' e as flechas dos tiros de lá (com os arredores)'
        : 'A trincheira com as estacas e ' + (gu.cerco.maq ? 'as máquinas viradas para o lugar' : 'os postos de quem cerca') + ' (o lugar fica além da trincheira, fora da cena)' });
    return out;
  }
  const padrao = gu => itens(gu).filter(x => x.on).map(x => x.k);
  // as chaves que valem (sem a escolha: as de começo)
  const valida = (gu, sel) => { const ks = itens(gu).map(x => x.k); return Array.isArray(sel) ? ks.filter(k => sel.includes(k)) : padrao(gu); };
  /* A escolha no que o gerador usa: { bat (a fresca), velha (a de mais de 7 dias: vai para a história), marca, exes,
     cerco } — ou null sem nada */
  function escolha(gu, sel) {
    if (!gu) return null;
    const ks = valida(gu, sel), out = {};
    if (gu.bat && ks.includes('bat')) { if (gu.bat.dias > FRESCA) out.velha = gu.bat; else out.bat = gu.bat; }
    if (gu.marca && ks.includes('marca')) out.marca = gu.marca;
    const exes = (gu.exes || []).filter((e, i) => ks.includes('exe' + i));
    if (exes.length) out.exes = exes;
    if (gu.cerco && ks.includes('cerco')) out.cerco = gu.cerco;
    return Object.keys(out).length ? out : null;
  }
  // a história do lugar com a batalha antiga (a de mais de 7 dias) junto da que o mestre escolheu
  const comHistoria = (hist, G) => (G && G.velha && !hist.includes('batalha') ? Historia.valida(hist.concat(['batalha'])) : hist);

  /* ================= as marcas no lugar ================= */
  const TENDA = { l: 1.9, w: 1.4 }, R1 = 4.0, R2 = 6.5;
  // a primeira roda (até 8 tendas, menor no acampamento pequeno) e a segunda (mais 15); o raio do acampamento inteiro
  const raio1 = n => clamp((Math.min(n, 8) + 1.3) * 0.374, 2.9, R1);
  const raioCamp = n => (n <= 8 ? raio1(n) : R2) + 1.3;
  // as tendas pelas tropas: 3 com 50, 8 com 450, 11 com 1.500, 16 (o teto) com uns 6.000
  const tendasDe = t => clamp(Math.round(3 + 1.7 * Math.log2(Math.max(1, t) / 50)), 3, 16);
  const tirar = (arr, f) => { for (let i = arr.length - 1; i >= 0; i--) if (f(arr[i], i)) arr.splice(i, 1); };
  const caixa = pts => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };
  // (lote 14, parte 14c) a volta em torno do retângulo R, a d dele, com os cantos de raio rc: um ponto a cada meio quadrado
  function anelEmVolta(R, d, rc) {
    const x0 = R[0] - d, y0 = R[1] - d, x1 = R[2] + d, y1 = R[3] + d, r = Math.min(rc, (x1 - x0) / 2, (y1 - y0) / 2), out = [];
    const reta = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 0.5)); for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); };
    const arco = (cx, cy, a0) => { const n = Math.max(2, Math.round(r * Math.PI / 2 / 0.5)); for (let k = 0; k < n; k++) { const a = a0 + k / n * Math.PI / 2; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    reta([x0 + r, y0], [x1 - r, y0]); arco(x1 - r, y0 + r, -Math.PI / 2);
    reta([x1, y0 + r], [x1, y1 - r]); arco(x1 - r, y1 - r, 0);
    reta([x1 - r, y1], [x0 + r, y1]); arco(x0 + r, y1 - r, Math.PI / 2);
    reta([x0, y1 - r], [x0, y0 + r]); arco(x0 + r, y0 + r, Math.PI);
    return out;
  }
  const ARVORE = s => s !== 'juncos' && s !== 'cacto' && s !== 'cristal' && s !== 'cristalNegro' && s !== 'flor' && s !== 'cogumelo';
  const QUEIMA = { arbusto: true, flores: true, cogumelos: true };

  /* A guerra num lugar já com a vegetação. A: o que havia antes dela (Historia.antes); op: { g (a escolha), sT, evitar:
     [[x, y, r]] (o meio da situação, os pontos de interesse, a chegada) }. → as áreas que ela usou ([x, y, r]: a história
     fica longe delas). No plano: guerra (os marcadores) e guerraInfo (o que entrou, para o resumo). */
  function noLugar(K, A, op) {
    const { W, H, P } = K, g = op && op.g, MG = op && op.lugar ? MARGEM_LUGAR : MARGEM, LG = op && op.lugar ? op.lugar : null;
    if (!g || !A || (P.cavernas && P.cavernas.length) || K.terreno === 'agua' || P.aguaToda) return [];
    const rG = mulberry((MO.sub(op.sT || 1, 150) % 2147483000) + 1);
    const evitar = (op.evitar || []).slice(), feitos = [], I = { exes: [], fora: [] };
    P.guerra = [];
    const vento = rG() * TAU;                                    // (os estandartes tremulam todos para o mesmo lado)
    const ruim = v => v === 2 || v === 3 || v === 7 || v === 8 || v === 9 || v === 10;
    const livreQ = (i, j) => i >= 0 && j >= 0 && i < W && j < H && A.occ[j * W + i] === 0 && (K.at(i, j) === 0 || K.at(i, j) === 4);
    // o círculo cabe: dentro da margem, sem nada ruim (a água, a pedra, o abismo) e com até tol dele ocupado (o caminho…)
    const cabe = (x, y, R, tol) => {
      if (x - R < MG || y - R < MG || x + R > W - MG || y + R > H - MG) return false;
      let n = 0, mal = 0;
      for (let j = Math.floor(y - R); j <= Math.floor(y + R); j++) for (let i = Math.floor(x - R); i <= Math.floor(x + R); i++) {
        if (Math.hypot(i + 0.5 - x, j + 0.5 - y) > R) continue;
        n++;
        if (ruim(K.at(i, j))) return false;
        if (!livreQ(i, j)) mal++;
      }
      return n > 0 && mal <= n * tol;
    };
    const longe = (x, y, f, R) => evitar.every(([ex, ey, er]) => Math.hypot(x - ex, y - ey) >= (er + R) * f);
    /* um lugar para o círculo de raio R, longe do que há para evitar (se não houver, cada vez mais perto): sem alvo, o
       primeiro sorteado; com alvo, o mais perto dele — e chegar mais perto do que há para evitar custa (12 quadrados por
       toda a folga), para o acampamento de quem cerca ficar atrás das máquinas e não do outro lado da cena */
    const lugar = (R, tol, alvo, extra) => {
      let melhor = null, dm = Infinity;
      for (const f of [1, 0.7, 0.45]) {
        for (let k = 0; k < 240; k++) {
          const x = R + MG + rG() * (W - 2 * (R + MG)), y = R + MG + rG() * (H - 2 * (R + MG));
          if (!longe(x, y, f, R) || !cabe(x, y, R, tol) || (extra && !extra(x, y))) continue;
          if (!alvo) return [x, y];
          const d = Math.hypot(x - alvo[0], y - alvo[1]) + (1 - f) * 12;
          if (d < dm) { dm = d; melhor = [x, y]; }
        }
      }
      return melhor;
    };
    // a área sai limpa: as árvores, as pedrinhas e os enfeites que a vegetação pôs nela
    const limpar = dentro => {
      tirar(P.arvores, (a, i) => i >= A.arv && dentro(a.x, a.y));
      tirar(P.rochas, (r, i) => i >= A.roc && dentro(r.x, r.y));
      tirar(P.objetos, (o, i) => i >= A.obj && dentro(o.x + (o.s || 1) / 2, o.y + (o.s || 1) / 2));
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (A.occ[j * W + i] === 0 && K.at(i, j) === 4 && dentro(i + 0.5, j + 0.5)) K.pos(i, j, 0);
    };
    /* as casas livres de uma área (o que a situação usa fica de fora) ficam com TMP enquanto a marca é montada (as tendas,
       as fogueiras e os caídos só vão nelas); fechar() as passa a 5 (a área da marca: sem árvores) */
    const TMP = 11, ehTmp = v => v === TMP;
    const abrir = dentro => { for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (A.occ[j * W + i] === 0 && K.at(i, j) === 0 && dentro(i + 0.5, j + 0.5)) K.pos(i, j, TMP); };
    const fechar = () => { for (let q = 0; q < W * H; q++) if (K.occ[q] === TMP) K.occ[q] = 5; };
    const rectLivre = (pts, ok) => { const [x0, y0, x1, y1] = caixa(pts); for (let j = Math.floor(y0); j <= Math.floor(y1); j++) for (let i = Math.floor(x0); i <= Math.floor(x1); i++) if (MO.dentroPoli(pts, i + 0.5, j + 0.5) && !ok(K.at(i, j))) return false; return true; };
    const objPerto = (id, x, y, r0, r1, ok) => { for (let k = 0; k < 30; k++) { const an = rG() * TAU, d = r0 + rG() * (r1 - r0); if (K.objeto(id, Math.floor(x + Math.cos(an) * d), Math.floor(y + Math.sin(an) * d), Math.floor(rG() * 4) * 90, ok)) return true; } return false; };
    // o marcador oculto do mestre (de pé ao lado; cx, cy, R: o meio e o tamanho da marca)
    const marca = (k, n, x, y, cx, cy, R) => { const [i, j] = MO.lugarDePe(K, clamp(x, 0.6, W - 0.6), clamp(y, 0.6, H - 0.6)); P.guerra.push({ k, n, x: i, y: j, cx: +cx.toFixed(2), cy: +cy.toFixed(2), R: +R.toFixed(2) }); };
    const gauss = () => { let u = 0; while (u === 0) u = rG(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rG()); };
    const r2 = v => +v.toFixed(2);

    /* ---- uma máquina de cerco (o desenho, o obstáculo e o lugar de esconder) ---- */
    const RAIO_MAQ = { catapulta: 1.15, trabuco: 1.55, ariete: 1.35 };
    const maquina = (tipo, x, y, ang, c1) => {
      K.pinta(2, tipo, { x: r2(x), y: r2(y), ang: +ang.toFixed(3), c1 });
      K.marcaCirc(x, y, RAIO_MAQ[tipo] * 0.8, 3, true);
      P.cobertura.push({ x, y, r: RAIO_MAQ[tipo] * 0.8 });
      if (tipo !== 'ariete') K.pinta(1, 'municao', { x: r2(x - Math.cos(ang) * (RAIO_MAQ[tipo] + 0.5) + Math.cos(ang + Math.PI / 2) * 0.7), y: r2(y - Math.sin(ang) * (RAIO_MAQ[tipo] + 0.5) + Math.sin(ang + Math.PI / 2) * 0.7), n: 5 + Math.floor(rG() * 4) });
    };
    // (a máquina não fica em cima do caminho: nenhuma casa dele debaixo dela)
    const semCaminho = (x, y, R) => { for (let j = Math.floor(y - R); j <= Math.floor(y + R); j++) for (let i = Math.floor(x - R); i <= Math.floor(x + R); i++) if (Math.hypot(i + 0.5 - x, j + 0.5 - y) <= R && K.at(i, j) === 1) return false; return true; };
    const listaDeMaq = (mq, max) => { const out = []; for (const t of ['trabuco', 'catapulta']) for (let k = 0; k < Math.min(2, (mq && mq[t]) || 0); k++) out.push(t); return out.slice(0, max); };
    /* (lote 14, parte 14c) as casas do próprio lugar que queimaram (o destruído): umas quatro em cada dez (de uma a seis),
       com a fuligem; as fechadas (com o telhado), as duas primeiras desabadas — o chão de cinzas, as vigas e a chaminé; nas
       abertas, o chão chamuscado. Vão por cima do desenho do lugar (sobreLugar), com o marcador do mestre nas três
       primeiras. → quantas */
    function queimarNoLugar(Lg) {
      const ps = Lg.predios.slice();
      for (let i = ps.length - 1; i > 0; i--) { const k = Math.floor(rG() * (i + 1)); [ps[i], ps[k]] = [ps[k], ps[i]]; }
      const n = clamp(Math.round(ps.length * 0.4), 1, 6), lista = ps.slice(0, n), sobre = P.sobreLugar = P.sobreLugar || [];
      let desabadas = 0;
      lista.forEach((k, i) => {
        const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
        if (!k.aberto && !k.redonda && desabadas < 2) { sobre.push({ z: 2, k: 'casaQueimada', x: r2(cx), y: r2(cy), w: k.w, h: k.h, ang: 0, ch: [r2(k.x + 0.7), r2(k.y + 0.7)] }); desabadas++; }
        else sobre.push({ z: 3, k: 'fuligem', pts: k.pts.map(q => [r2(q[0]), r2(q[1])]) });
        if (k.aberto || k.redonda) sobre.push({ z: 1, k: 'chamusco', itens: [{ x: r2(cx + (rG() - 0.5) * k.w * 0.3), y: r2(cy + (rG() - 0.5) * k.h * 0.3), r: +clamp(Math.min(k.w, k.h) * 0.32, 0.6, 1.6).toFixed(2) }] });
        if (i < 3) P.guerra.push({ k: 'casa', n: 'Casa queimada', x: Math.floor(cx), y: Math.floor(cy), cx: r2(cx), cy: r2(cy), R: r2(Math.max(k.w, k.h) / 2) });
      });
      return lista.length;
    }

    /* ---- o acampamento: e (o exército), x, y (o meio), n (as tendas), frente (para onde abre), parar (as máquinas
       paradas atrás) ---- */
    function acampamento(e, x, y, n, frente, parar, quer, deCerco) {
      const R = raioCamp(n), c1 = e.cores[0], c2 = e.cores[1];
      limpar((px, py) => Math.hypot(px - x, py - y) <= R + 0.6);
      K.mancha(MO.blob(rG, x, y, R * 0.95, R * 0.88, 16, 0.18, rG() * TAU), ['#7d6c50', '#6a5a42', '#8c7c60', '#5e5038'], { a: 0.3 });
      abrir((px, py) => Math.hypot(px - x, py - y) <= R);
      // a tenda do comando no meio, o estandarte e a fogueira grande na frente
      K.pinta(2, 'pavilhao', { x: r2(x), y: r2(y), r: 1.55, c1, c2, ang: +vento.toFixed(3) });
      K.marcaCirc(x, y, 1.45, 3, true);
      K.visaoPoli(MO.elipse(x, y, 1.4, 1.4, 8));
      P.cobertura.push({ x, y, r: 1.5 });
      // (no acampamento pequeno, a roda fica perto da tenda do comando: a fogueira vai na entrada e as provisões, fora)
      const r1 = raio1(n), largo = r1 >= 3.25, ab = frente + 1.05, rb = Math.min(2.3, r1 - 0.85);
      K.pinta(3, 'estandarte', { x: r2(x + Math.cos(ab) * rb), y: r2(y + Math.sin(ab) * rb), ang: +vento.toFixed(3), c1, c2 });
      let fogos = 0;
      const fogo = (fx, fy) => { if (K.objeto('fogueira', Math.floor(fx), Math.floor(fy), 0, ehTmp)) { fogos++; return true; } return false; };
      // (a grande, na frente: se o lugar dela está ocupado — o caminho que passa —, um pouco para o lado)
      const rf = largo ? 2.6 : r1 + 0.1;
      [0, 0.3, -0.3, 0.6, -0.6].some(da => fogo(x + Math.cos(frente + da) * rf, y + Math.sin(frente + da) * rf));
      // as tendas em roda (a primeira, depois a segunda), com a porta para dentro; a entrada (a frente) fica aberta
      let tendas = 0;
      for (const r of [r1, R2]) {
        if (tendas >= n || (r === R2 && n <= 8)) break;
        const slots = Math.floor(TAU * r / 2.35), passo = TAU / slots;
        // (de trás para a frente, um de cada lado: a roda que não enche fica parelha)
        const ordem = Array.from({ length: slots }, (_, s) => frente + passo * (s + 0.5)).sort((a1, a2) => Math.abs(Math.atan2(Math.sin(a1 - frente - Math.PI), Math.cos(a1 - frente - Math.PI))) - Math.abs(Math.atan2(Math.sin(a2 - frente - Math.PI), Math.cos(a2 - frente - Math.PI))));
        for (const a of ordem) {
          if (tendas >= n) break;
          if (Math.abs(Math.atan2(Math.sin(a - frente), Math.cos(a - frente))) < 0.42) continue;
          const tx = x + Math.cos(a) * r, ty = y + Math.sin(a) * r, ang = a + Math.PI / 2;
          if (!rectLivre(Estilos.retangulo(tx, ty, TENDA.l + 0.3, TENDA.w + 0.3, ang), ehTmp)) continue;
          K.pinta(2, 'tendaGuerra', { x: r2(tx), y: r2(ty), ang: +ang.toFixed(3), l: TENDA.l, w: TENDA.w, c1, c2 });
          const fp = Estilos.retangulo(tx, ty, TENDA.l, TENDA.w, ang);
          K.marcaPoli(fp, 3, true);
          K.visaoPoli(fp);
          P.cobertura.push({ x: tx, y: ty, r: 0.9 });
          tendas++;
        }
      }
      // as outras fogueiras (entre a tenda do comando e as tendas; no grande, também entre as rodas) e as provisões
      const nFog = clamp(Math.round(n / 3.5), 1, 5);
      if (largo) for (let k = 1, tent = 0; fogos < nFog && tent < 30; tent++, k++) {
        const fora = n > 8 && k % 2 === 0, a = frente + Math.PI + (k % 4 < 2 ? 1 : -1) * (0.5 + 0.55 * Math.floor(k / 2)), r = fora ? (R1 + R2) / 2 : 2.55;
        fogo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      else for (const da of [0.32, -0.32, 0.7, -0.7]) if (fogos < nFog) fogo(x + Math.cos(frente + da) * (r1 + 0.7), y + Math.sin(frente + da) * (r1 + 0.7));
      if (!fogos && objPerto('fogueira', x, y, 1.9, raioCamp(n) - 0.6, ehTmp)) fogos++;
      for (const id of ['barril', 'caixote', 'caixote', 'armas'].concat(n >= 8 ? ['barril', 'caixote'] : [])) objPerto(id, x, y, largo ? 2.1 : r1 + 0.75, largo ? 2.8 : r1 + 1.15, ehTmp);
      if (n >= 6 && largo) { const a = frente + Math.PI * 0.6; K.pinta(1, 'lenha', { x: r2(x + Math.cos(a) * 2.6 - 0.8), y: r2(y + Math.sin(a) * 2.6 - 0.3), w: 1.6, h: 0.7 }); }
      // as estacas na frente do acampamento grande
      if (n >= 10) for (const d of [-0.75, -0.3, 0.3, 0.75]) { const a = frente + d; K.objeto('estacas', Math.floor(x + Math.cos(a) * (R + 0.2)), Math.floor(y + Math.sin(a) * (R + 0.2)), 0, v => v === 0 || v === 6); }
      fechar();
      // as máquinas de cerco paradas, atrás (fora da roda)
      let paradas = 0;
      for (const t of parar ? listaDeMaq(e.maq, 2) : []) {
        for (const da of paradas ? [0.55, -0.55, 0.95, -0.95] : [0, 0.4, -0.4]) {
          const a = frente + Math.PI + da, mx = x + Math.cos(a) * (R + 1.6), my = y + Math.sin(a) * (R + 1.6);
          if (!cabe(mx, my, RAIO_MAQ[t], 0.25) || !semCaminho(mx, my, RAIO_MAQ[t])) continue;
          limpar((px, py) => Math.hypot(px - mx, py - my) <= RAIO_MAQ[t] + 0.5);
          maquina(t, mx, my, a, c1);
          feitos.push([mx, my, RAIO_MAQ[t] + 0.6]); evitar.push([mx, my, RAIO_MAQ[t] + 0.6]);
          paradas++;
          break;
        }
      }
      marca('acampamento', 'Acampamento: ' + e.nome + ' (' + milhar(e.tropas) + ' tropas' + (e.fac ? ', ' + e.fac : '') + ')', x + 1.9, y + 0.4, x, y, R);
      feitos.push([x, y, R + 0.5]); evitar.push([x, y, R + 1.5]);
      I.exes.push({ nome: e.nome, tendas, quer: quer || n, fogos, maq: paradas, lado: deCerco ? 'cerco' : null });
      return tendas;
    }
    // o acampamento de e, perto de alvo (ou sorteado): do tamanho das tropas; sem lugar, cada vez menor (até 3 tendas)
    function poeAcampamento(e, alvo, frenteDe, parar, deCerco, extra) {
      const quer = tendasDe(e.tropas);
      for (const n of [quer, Math.round(quer * 0.7), Math.round(quer * 0.5), 3].filter((v, i, a) => v >= 3 && a.indexOf(v) === i)) {
        const R = raioCamp(n), l = lugar(R, 0.18, alvo, (x, y) => cabe(x, y, 2.2, 0) && (!extra || extra(x, y)));
        if (!l) continue;
        acampamento(e, l[0], l[1], n, frenteDe(l[0], l[1]), parar, quer, deCerco);
        return true;
      }
      I.fora.push('o acampamento “' + e.nome + '”');
      return false;
    }

    /* ---- o cerco: no lado da cena que fica para o lugar (o eixo mais forte, medido no hexágono), a trincheira de ponta
       a ponta, paralela a ele; as máquinas atrás dela, viradas para lá (o aríete na frente); entre ela e a borda, as
       flechas e os buracos dos tiros de lá ---- */
    const camps = (g.exes || []).slice(), exeCerco = g.cerco ? camps.find(e => e.lado === 'cerco') : null;
    /* ---- (lote 14, parte 14c) o cerco em volta do próprio lugar (a cena é o lugar cercado, no meio dos arredores): a
       trincheira em anel, a uns dois quadrados da beira dele (com as passagens nos caminhos), as estacas do lado de lá,
       as máquinas atrás dela viradas para o lugar, o aríete diante de um portão, as flechas e os buracos dos tiros entre
       a trincheira e o lugar e, mais para fora, o acampamento de quem cerca (ou o posto) ---- */
    if (g.cerco && g.cerco.aqui && LG) {
      const c = g.cerco, R = LG.R, cx = (R[0] + R[2]) / 2, cy = (R[1] + R[3]) / 2, dT = 2.3;
      const dentroR = (x, y, m) => x >= m && y >= m && x <= W - m && y <= H - m;
      // o ponto mais perto do retângulo do lugar e a direção para ele (para dentro)
      const paraDentro = (x, y) => { const nx = clamp(x, R[0], R[2]), ny = clamp(y, R[1], R[3]), dx = nx - x, dy = ny - y, L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };
      const volta = anelEmVolta(R, dT, 2.4);
      const pecas = [];
      let atual = [];
      for (const q of volta) { const v = K.at(Math.floor(q[0]), Math.floor(q[1])); if (dentroR(q[0], q[1], MG + 0.5) && !ruim(v) && v !== 1) atual.push(q); else { if (atual.length > 3) pecas.push(atual); atual = []; } }
      if (atual.length > 3) { if (pecas.length && volta.indexOf(pecas[0][0]) === 0 && atual[atual.length - 1] === volta[volta.length - 1]) pecas[0] = atual.concat(pecas[0]); else pecas.push(atual); }
      const feitas = { catapulta: 0, trabuco: 0, ariete: 0 };
      let arieteNoLugar = false;
      if (!pecas.length) I.fora.push('o cerco de ' + c.nome);
      else {
        limpar((x, y) => pecas.some(pc => MO.distLinha(pc, x, y) <= 1.7));
        for (const pc of pecas) {
          K.pinta(1, 'trincheira', { pts: pc.map(q => [r2(q[0]), r2(q[1])]), larg: 0.85, ds: pc.map(q => paraDentro(q[0], q[1]).map(v => +v.toFixed(3))) });
          K.marcaLinha(pc, 0.55, 6);
          P.relevo.push({ t: 'fosso', alt: -1, k: 'free', pts: pc.filter((_, i) => i % 2 === 0 || i === pc.length - 1), sw: 0.85 });
          for (let i = 2; i < pc.length - 1; i += 6) { const [ux, uy] = paraDentro(pc[i][0], pc[i][1]); K.objeto('estacas', Math.floor(pc[i][0] + ux * 1.35), Math.floor(pc[i][1] + uy * 1.35), 0, v => v === 0 || v === 6 || v === 5); }
          for (let i = 0; i < pc.length; i += 4) { evitar.push([pc[i][0], pc[i][1], 2.2]); feitos.push([pc[i][0], pc[i][1], 2]); }
        }
        // as máquinas, atrás da trincheira (pela volta, espalhadas), viradas para o meio do lugar
        const todos = pecas.flat(), lista = listaDeMaq(c.maq, Math.max(1, Math.min(4, Math.floor(todos.length / 14))));
        lista.forEach((tp, k) => {
          for (let t = 0; t < 12; t++) {
            const q = todos[Math.floor(((k + 0.5) / lista.length + (t ? (rG() - 0.5) * 0.18 : 0)) * todos.length) % todos.length], [ux, uy] = paraDentro(q[0], q[1]);
            const back = [3.2, 2.8, 3.8][t % 3], mx = q[0] - ux * back, my = q[1] - uy * back;
            if (!cabe(mx, my, RAIO_MAQ[tp], 0.3) || !semCaminho(mx, my, RAIO_MAQ[tp])) continue;
            limpar((x, y) => Math.hypot(x - mx, y - my) <= RAIO_MAQ[tp] + 0.5);
            maquina(tp, mx, my, Math.atan2(cy - my, cx - mx), c.cores[0]);
            evitar.push([mx, my, RAIO_MAQ[tp] + 0.8]); feitos.push([mx, my, RAIO_MAQ[tp] + 0.5]);
            feitas[tp]++;
            break;
          }
        });
        // o aríete: diante do portão (dentro do retângulo do lugar, ele vai por cima do desenho dele)
        if (c.maq && c.maq.ariete && (LG.portoes || []).length) {
          const gt = LG.portoes[Math.floor(rG() * LG.portoes.length) % LG.portoes.length], dx = gt.x - cx, dy = gt.y - cy, L = Math.hypot(dx, dy) || 1, mx = gt.x + dx / L * 1.5, my = gt.y + dy / L * 1.5;
          const o = { z: 2, k: 'ariete', x: r2(mx), y: r2(my), ang: +Math.atan2(-dy, -dx).toFixed(3), c1: c.cores[0] };
          if (mx > R[0] && my > R[1] && mx < R[2] && my < R[3]) { (P.sobreLugar = P.sobreLugar || []).push(o); arieteNoLugar = true; }
          else if (cabe(mx, my, 1.0, 0.5)) { P.pintados.push(o); K.marcaCirc(mx, my, RAIO_MAQ.ariete * 0.8, 3, true); }
          if (arieteNoLugar || P.pintados.includes(o)) feitas.ariete++;
        }
        // entre a trincheira e o lugar: as flechas e os buracos dos tiros de lá
        const flechas = [], buracos = [];
        for (let k = 0, n = 4 + Math.floor(rG() * 4); k < n; k++) {
          const q = todos[Math.floor(rG() * todos.length) % todos.length], [ux, uy] = paraDentro(q[0], q[1]), f = 0.7 + rG() * 0.9, fx = q[0] + ux * f, fy = q[1] + uy * f, v = K.at(Math.floor(fx), Math.floor(fy));
          if (dentroR(fx, fy, MG) && !ruim(v)) flechas.push({ x: r2(fx), y: r2(fy), ang: +(Math.atan2(-uy, -ux) + (rG() - 0.5) * 0.6).toFixed(2), n: 3 + Math.floor(rG() * 4) });
        }
        for (let k = 0; k < (c.dias >= 2 ? 1 + (c.dias >= 6 ? 1 : 0) : 0); k++) {
          const q = todos[Math.floor(rG() * todos.length) % todos.length], [ux, uy] = paraDentro(q[0], q[1]), fx = q[0] - ux * 1.6, fy = q[1] - uy * 1.6, v = K.at(Math.floor(fx), Math.floor(fy));
          if (dentroR(fx, fy, MG + 0.5) && (v === 0 || v === 4)) buracos.push({ x: r2(fx), y: r2(fy), r: +(0.55 + rG() * 0.25).toFixed(2) });
        }
        if (flechas.length) K.pinta(2, 'flechas', { itens: flechas });
        if (buracos.length) K.pinta(1, 'buracoGuerra', { itens: buracos });
        // o estandarte de quem cerca, fincado atrás da trincheira, e o marcador do mestre
        const q0 = todos[Math.floor(rG() * todos.length) % todos.length], [u0, v0] = paraDentro(q0[0], q0[1]);
        K.pinta(3, 'estandarte', { x: r2(q0[0] - u0 * 1.8), y: r2(q0[1] - v0 * 1.8), ang: +vento.toFixed(3), c1: c.cores[0], c2: c.cores[1] });
        marca('cerco', 'Cerco de ' + c.nome + ' (' + (c.dias ? 'há ' + plural(c.dias, 'dia') : 'começou hoje') + (c.fac ? ', ' + c.fac : '') + ')', q0[0] - u0 * 2.6, q0[1] - v0 * 2.6, q0[0], q0[1], 3);
        // quem cerca: o acampamento mais para fora; sem o exército na cena (ou sem lugar), o posto
        let posto = !exeCerco;
        const longeDoLugar = (x, y) => { const [ux, uy] = paraDentro(x, y), nx = clamp(x, R[0], R[2]), ny = clamp(y, R[1], R[3]); void ux; void uy; return Math.hypot(x - nx, y - ny) >= dT + 2.5; };
        if (exeCerco) {
          camps.splice(camps.indexOf(exeCerco), 1);
          if (!poeAcampamento(exeCerco, null, (x, y) => Math.atan2(cy - y, cx - x), false, true, longeDoLugar)) posto = true;
        }
        if (posto) {
          const l = lugar(2.8, 0.25, null, (x, y) => cabe(x, y, 1.6, 0) && longeDoLugar(x, y));
          if (l) {
            const [ox, oy] = l, an = Math.atan2(cy - oy, cx - ox), px = -Math.sin(an), py = Math.cos(an);
            limpar((x, y) => Math.hypot(x - ox, y - oy) <= 3.2);
            abrir((x, y) => Math.hypot(x - ox, y - oy) <= 2.8);
            for (const sg of [-1, 1]) {
              const ex = ox + px * sg * 1.3, ey = oy + py * sg * 1.3, at = an + Math.PI / 2, fp = Estilos.retangulo(ex, ey, TENDA.l, TENDA.w, at);
              if (!rectLivre(fp, ehTmp)) continue;
              K.pinta(2, 'tendaGuerra', { x: r2(ex), y: r2(ey), ang: +at.toFixed(3), l: TENDA.l, w: TENDA.w, c1: c.cores[0], c2: c.cores[1] });
              K.marcaPoli(fp, 3, true); K.visaoPoli(fp); P.cobertura.push({ x: ex, y: ey, r: 0.9 });
            }
            K.objeto('fogueira', Math.floor(ox + Math.cos(an) * 1.3), Math.floor(oy + Math.sin(an) * 1.3), 0, ehTmp);
            fechar();
            feitos.push([ox, oy, 3]); evitar.push([ox, oy, 3.5]);
          } else posto = false;
        }
        I.cerco = { nome: c.nome, dir: null, emVolta: true, maq: feitas, pecas: pecas.length };
        if (posto) I.cerco.posto = true;
        if (arieteNoLugar) I.cerco.arieteNoPortao = true;
      }
    } else if (g.cerco && LG) {
      // (nos arredores de um lugar que não é o cercado: o cerco do outro lugar do hexágono fica fora da cena)
      I.outroCerco = g.cerco.nome;
    } else if (g.cerco) {
      const c = g.cerco, du = c.u - 0.5, dv = c.v - 0.5;
      const lado = Math.hypot(du, dv) < 0.08 ? ['n', 'l', 's', 'o'][Math.floor(rG() * 4) % 4] : Math.abs(du) >= Math.abs(dv) ? (du > 0 ? 'l' : 'o') : (dv > 0 ? 's' : 'n');
      const ang = { l: 0, s: Math.PI / 2, o: Math.PI, n: -Math.PI / 2 }[lado], dx = Math.round(Math.cos(ang)), dy = Math.round(Math.sin(ang)), px = -dy, py = dx, IN = MG + 2.8;
      const deLado = lado === 'l' || lado === 'o', comp = deLado ? H : W, ao = clamp((deLado ? c.v : c.u) * comp, comp * 0.32, comp * 0.68);
      const T = lado === 'l' ? [W - IN, ao] : lado === 'o' ? [IN, ao] : lado === 'n' ? [ao, IN] : [ao, H - IN];
      const dentroR = (x, y, m) => x >= m && y >= m && x <= W - m && y <= H - m;
      let s1 = 0, s2 = 0;
      while (s1 < 9.5 && dentroR(T[0] - px * (s1 + 0.5), T[1] - py * (s1 + 0.5), MG + 0.6)) s1 += 0.5;
      while (s2 < 9.5 && dentroR(T[0] + px * (s2 + 0.5), T[1] + py * (s2 + 0.5), MG + 0.6)) s2 += 0.5;
      const Lm = Math.max(s1, s2, 1), linha = [];
      // (as pontas um pouco mais perto do lugar: o arco em volta dele)
      for (let s = -s1; s <= s2 + 1e-9; s += 0.5) { const b = 0.8 * (s / Lm) ** 2; linha.push([T[0] + px * s + dx * b, T[1] + py * s + dy * b]); }
      // os pedaços: a trincheira para na água, na pedra, no caminho (a passagem fica) e perto do meio da situação
      const pecas = [];
      let atual = [];
      for (const q of linha) { const v = K.at(Math.floor(q[0]), Math.floor(q[1])); if (!ruim(v) && v !== 1 && longe(q[0], q[1], 0.5, 0)) atual.push(q); else { if (atual.length > 3) pecas.push(atual); atual = []; } }
      if (atual.length > 3) pecas.push(atual);
      if (!pecas.length) I.fora.push('o cerco de ' + c.nome);
      else {
        limpar((x, y) => pecas.some(pc => MO.distLinha(pc, x, y) <= 1.7));
        for (const pc of pecas) {
          K.pinta(1, 'trincheira', { pts: pc.map(q => [r2(q[0]), r2(q[1])]), larg: 0.85, d: [dx, dy] });
          K.marcaLinha(pc, 0.55, 6);
          P.relevo.push({ t: 'fosso', alt: -1, k: 'free', pts: pc.filter((_, i) => i % 2 === 0 || i === pc.length - 1), sw: 0.85 });
          // as estacas, do lado do lugar
          for (let i = 2; i < pc.length - 1; i += 6) K.objeto('estacas', Math.floor(pc[i][0] + dx * 1.35), Math.floor(pc[i][1] + dy * 1.35), 0, v => v === 0 || v === 6);
          for (let i = 0; i < pc.length; i += 4) { evitar.push([pc[i][0], pc[i][1], 2.2]); feitos.push([pc[i][0], pc[i][1], 2]); }
        }
        // as máquinas, atrás da trincheira e viradas para o lugar (o aríete, na frente dela)
        const span = s1 + s2 - 2, atras = listaDeMaq(c.maq, Math.max(1, Math.min(4, Math.floor(span / 3.4)))), feitas = { catapulta: 0, trabuco: 0, ariete: 0 };
        atras.forEach((tp, k) => {
          const s = -s1 + 1 + span * (k + 0.5) / atras.length;
          for (const back of [3.3, 4.3, 2.7, 5.3]) {
            const mx = T[0] + px * s - dx * back, my = T[1] + py * s - dy * back;
            if (!cabe(mx, my, RAIO_MAQ[tp], 0.3) || !semCaminho(mx, my, RAIO_MAQ[tp])) continue;
            limpar((x, y) => Math.hypot(x - mx, y - my) <= RAIO_MAQ[tp] + 0.5);
            maquina(tp, mx, my, ang, c.cores[0]);
            evitar.push([mx, my, RAIO_MAQ[tp] + 0.8]); feitos.push([mx, my, RAIO_MAQ[tp] + 0.5]);
            feitas[tp]++;
            break;
          }
        });
        if (c.maq && c.maq.ariete) {
          for (let k = 0; k < 10; k++) {
            const s = (rG() - 0.5) * span * 0.7, mx = T[0] + px * s + dx * 1.9, my = T[1] + py * s + dy * 1.9;
            if (!dentroR(mx, my, MG + 0.8) || !cabe(mx, my, 1.0, 0.5) || !semCaminho(mx, my, RAIO_MAQ.ariete)) continue;
            limpar((x, y) => Math.hypot(x - mx, y - my) <= 1.8);
            maquina('ariete', mx, my, ang, c.cores[0]);
            feitas.ariete++;
            break;
          }
        }
        // entre a trincheira e o lugar: as flechas e os buracos dos tiros de lá
        const flechas = [], buracos = [];
        for (let k = 0; k < 3 + Math.floor(rG() * 3); k++) {
          const s = -s1 + rG() * (s1 + s2), f = 1.6 + rG() * 1.5, fx = T[0] + px * s + dx * f, fy = T[1] + py * s + dy * f, v = K.at(Math.floor(fx), Math.floor(fy));
          if (dentroR(fx, fy, MG) && !ruim(v)) flechas.push({ x: r2(fx), y: r2(fy), ang: +(ang + Math.PI + (rG() - 0.5) * 0.6).toFixed(2), n: 3 + Math.floor(rG() * 4) });
        }
        for (let k = 0; k < (c.dias >= 2 ? 1 + (c.dias >= 6 ? 1 : 0) : 0); k++) {
          const s = -s1 + 1 + rG() * span, fx = T[0] + px * s + dx * 2.4, fy = T[1] + py * s + dy * 2.4, v = K.at(Math.floor(fx), Math.floor(fy));
          if (dentroR(fx, fy, MG + 0.5) && (v === 0 || v === 4)) buracos.push({ x: r2(fx), y: r2(fy), r: +(0.55 + rG() * 0.25).toFixed(2) });
        }
        if (flechas.length) K.pinta(2, 'flechas', { itens: flechas });
        if (buracos.length) K.pinta(1, 'buracoGuerra', { itens: buracos });
        // o estandarte de quem cerca, fincado atrás da trincheira
        K.pinta(3, 'estandarte', { x: r2(T[0] - dx * 1.7 + px * (rG() - 0.5) * 2), y: r2(T[1] - dy * 1.7 + py * (rG() - 0.5) * 2), ang: +vento.toFixed(3), c1: c.cores[0], c2: c.cores[1] });
        // (no texto, o rumo de verdade do lugar)
        const dir = Math.hypot(du, dv) < 0.08 ? lado : Tracado.maisPerto(Math.atan2(dv, du));
        marca('cerco', 'Cerco de ' + c.nome + ' (' + (c.dias ? 'há ' + plural(c.dias, 'dia') : 'começou hoje') + (c.fac ? ', ' + c.fac : '') + '): o lugar fica ' + NA_DIR[dir], T[0] - dx * 2.6, T[1] - dy * 2.6, T[0], T[1], 3);
        // quem cerca: o acampamento atrás das máquinas; sem o exército na cena, um posto (duas tendas e a fogueira)
        let posto = !exeCerco;
        if (exeCerco) {
          camps.splice(camps.indexOf(exeCerco), 1);
          const n0 = tendasDe(exeCerco.tropas), alvo = [T[0] - dx * (raioCamp(n0) + 5), T[1] - dy * (raioCamp(n0) + 5)];
          // (sem lugar nem para o pequeno: fica o posto)
          if (!poeAcampamento(exeCerco, alvo, () => ang, false, true)) posto = true;
        }
        if (posto) {
          const l = lugar(2.8, 0.25, [T[0] - dx * 6.5, T[1] - dy * 6.5], (x, y) => cabe(x, y, 1.6, 0));
          if (l) {
            const [ox, oy] = l;
            limpar((x, y) => Math.hypot(x - ox, y - oy) <= 3.2);
            abrir((x, y) => Math.hypot(x - ox, y - oy) <= 2.8);
            for (const s of [-1, 1]) {
              const ex = ox + px * s * 1.3, ey = oy + py * s * 1.3, an = ang + Math.PI / 2, fp = Estilos.retangulo(ex, ey, TENDA.l, TENDA.w, an);
              if (!rectLivre(fp, ehTmp)) continue;
              K.pinta(2, 'tendaGuerra', { x: r2(ex), y: r2(ey), ang: +an.toFixed(3), l: TENDA.l, w: TENDA.w, c1: c.cores[0], c2: c.cores[1] });
              K.marcaPoli(fp, 3, true); K.visaoPoli(fp); P.cobertura.push({ x: ex, y: ey, r: 0.9 });
            }
            K.objeto('fogueira', Math.floor(ox + dx * 1.3), Math.floor(oy + dy * 1.3), 0, ehTmp);
            fechar();
            feitos.push([ox, oy, 3]); evitar.push([ox, oy, 3.5]);
          } else posto = false;
        }
        I.cerco = { nome: c.nome, dir, maq: feitas, pecas: pecas.length };
        if (posto) I.cerco.posto = true;
      }
    }
    /* ---- a batalha fresca ---- */
    if (g.bat) {
      const b = g.bat, tam = clamp(b.tam, 0, 4), perdaP = PERDA_P[tam], perdaV = PERDA_V[tam];
      const esc = b.tropas == null ? 1 : clamp(Math.log10(Math.max(10, b.tropas)) / 3, 0.6, 1.4);
      const n0 = Math.round(clamp(6 + 22 * (perdaP + perdaV) * esc, 6, 26)), fase = b.dias <= 1 ? 0 : b.dias <= 4 ? 1 : 2;
      const R0 = clamp(3.2 + n0 * 0.12, 3.5, 6) * (camps.length ? 0.85 : 1);     // (com acampamentos para pôr, um pouco menor)
      let l = null, R = R0;
      for (const f of [1, 0.8, 0.62]) { R = R0 * f; l = lugar(R * 1.25, 0.35, null); if (l) break; }
      if (!l) I.fora.push('o campo de batalha');
      else {
        const [cx, cy] = l, an = rG() * Math.PI, rx = R * 1.25, ry = R * 0.8, ca = Math.cos(an), sa = Math.sin(an);
        const loc = (x, y) => { const ddx = x - cx, ddy = y - cy; return [ddx * ca + ddy * sa, -ddx * sa + ddy * ca]; };
        const glob = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];
        const dentro = (x, y) => { const [u, v] = loc(x, y); return (u / rx) ** 2 + (v / ry) ** 2 <= 1; };
        limpar((x, y) => { const [u, v] = loc(x, y); return (u / (rx + 0.6)) ** 2 + (v / (ry + 0.6)) ** 2 <= 1; });
        const chao = MO.blob(rG, cx, cy, rx, ry, 16, 0.3, an);
        K.mancha(chao, ['#5c4b38', '#4a3c2c', '#6e5c46', '#3f3428'], { a: 0.4, pedrisco: ['#3a3026', '#7a6a54'] });
        abrir(dentro);
        const lados = [b.a, b.b], perde = b.vence === 'a' ? 1 : b.vence === 'b' ? 0 : -1;
        const pPerde = perde < 0 ? 0.5 : clamp(perdaP / (perdaP + perdaV), 0.5, 0.92);
        const usados = [];
        // (só nas casas do campo: as livres e o caminho — o que a situação usa fica de fora)
        const pode = (x, y, d) => { const v = K.at(Math.floor(x), Math.floor(y)); return dentro(x, y) && (v === TMP || v === 1) && usados.every(q => Math.hypot(q[0] - x, q[1] - y) >= d); };
        // um ponto do lado (0: o de a, do lado de cima da linha; 1: o de b): mais perto da linha do choque
        const ponto = (lado, d) => { for (let k = 0; k < 40; k++) { const u = (rG() * 2 - 1) * rx * 0.92, v = (lado ? 1 : -1) * (Math.abs(gauss()) * ry * 0.42 + ry * 0.05), [x, y] = glob(u, v); if (pode(x, y, d)) { usados.push([x, y]); return [x, y]; } } return null; };
        const ladoDe = () => (perde < 0 ? (rG() < 0.5 ? 0 : 1) : rG() < pPerde ? perde : 1 - perde);
        const nCaidos = Math.max(2, Math.round(n0 * [1, 0.6, 0.3][fase])), caidos = [], armas = [];
        const TIPOS = ['espada', 'espada', 'lanca', 'lanca', 'machado', 'escudo', 'escudo', 'elmo'];
        for (let k = 0; k < nCaidos; k++) {
          const lado = ladoDe(), p = ponto(lado, 0.75);
          if (!p) continue;
          const C = lados[lado].cores;
          caidos.push({ x: r2(p[0]), y: r2(p[1]), ang: +(rG() * TAU).toFixed(2), c1: C[0], c2: C[1], v: Math.floor(rG() * 3) % 3 });
          if (rG() < [0.75, 0.5, 0.3][fase]) { const a = rG() * TAU, d = 0.55 + rG() * 0.4, x = p[0] + Math.cos(a) * d, y = p[1] + Math.sin(a) * d; if (pode(x, y, 0.35)) armas.push({ x: r2(x), y: r2(y), ang: +(rG() * TAU).toFixed(2), t: TIPOS[Math.floor(rG() * TIPOS.length) % TIPOS.length], c1: C[0], c2: C[1] }); }
        }
        // as armas soltas (as que ninguém recolheu ainda)
        for (let k = 0, n = Math.round(n0 * [0.4, 0.25, 0.12][fase]); k < n; k++) { const lado = ladoDe(), p = ponto(lado, 0.5); if (p) armas.push({ x: r2(p[0]), y: r2(p[1]), ang: +(rG() * TAU).toFixed(2), t: TIPOS[Math.floor(rG() * TIPOS.length) % TIPOS.length], c1: lados[lado].cores[0], c2: lados[lado].cores[1] }); }
        // os cavalos (as batalhas grandes)
        const cavalos = [];
        for (let k = 0, n = n0 >= 12 && tam >= 1 ? (n0 >= 18 ? 2 : 1) - (fase === 2 ? 1 : 0) : 0; k < n; k++) { const lado = ladoDe(), p = ponto(lado, 1.6); if (p) cavalos.push({ x: r2(p[0]), y: r2(p[1]), ang: +(rG() * TAU).toFixed(2), c1: lados[lado].cores[0] }); }
        // as flechas fincadas e os buracos das pedras
        const flechas = [], buracos = [];
        for (let k = 0, n = 2 + Math.floor(rG() * 3); k < n; k++) { const p = ponto(rG() < 0.5 ? 0 : 1, 0.6); if (p) flechas.push({ x: r2(p[0]), y: r2(p[1]), ang: +(an + (rG() < 0.5 ? 1 : -1) * Math.PI / 2 + (rG() - 0.5) * 0.5).toFixed(2), n: 3 + Math.floor(rG() * 4) }); }
        for (let k = 0, n = tam >= 3 ? 2 : tam >= 1 ? 1 : 0; k < n; k++) { const p = ponto(rG() < 0.5 ? 0 : 1, 1.4); if (p) buracos.push({ x: r2(p[0]), y: r2(p[1]), r: +(0.5 + rG() * 0.3).toFixed(2) }); }
        if (buracos.length) K.pinta(1, 'buracoGuerra', { itens: buracos });
        if (cavalos.length) K.pinta(2, 'cavaloCaido', { itens: cavalos });
        if (caidos.length) K.pinta(2, 'caidos', { itens: caidos });
        if (armas.length) K.pinta(2, 'armasCaidas', { itens: armas });
        if (flechas.length) K.pinta(2, 'flechas', { itens: flechas });
        // os estandartes: o de quem venceu fincado na frente; o de quem perdeu, caído (no empate, os dois caídos)
        for (const lado of [0, 1]) {
          const C = lados[lado].cores, sg = lado ? 1 : -1, venceu = perde >= 0 && lado !== perde;
          const [x, y] = glob((rG() - 0.5) * rx * 0.6, sg * ry * (venceu ? 0.2 : 0.45));
          if (venceu) K.pinta(3, 'estandarte', { x: r2(x), y: r2(y), ang: +vento.toFixed(3), c1: C[0], c2: C[1] });
          else if (pode(x, y, 0.3)) K.pinta(2, 'estandarteCaido', { x: r2(x), y: r2(y), ang: +(rG() * TAU).toFixed(2), c1: C[0], c2: C[1] });
        }
        // as covas (do terceiro dia em diante), na beira do campo, uma ao lado da outra
        let covas = 0;
        if (b.dias >= 3) {
          const nc = b.dias >= 5 ? 2 + (n0 >= 16 ? 1 : 0) : 1, sg = rG() < 0.5 ? 1 : -1, u0 = (rG() - 0.5) * rx * 0.5, lista = [];
          for (let k = 0; k < nc; k++) { const [x, y] = glob(u0 + (k - (nc - 1) / 2) * 1.5, sg * ry * 0.78); if (pode(x, y, 0.9)) { usados.push([x, y]); lista.push({ x: r2(x), y: r2(y), ang: +(an + Math.PI / 2).toFixed(3) }); } }
          if (lista.length) { K.pinta(1, 'covas', { itens: lista }); covas = lista.length; }
        }
        // os corvos (do dia seguinte até o quinto)
        if (b.dias >= 1 && b.dias <= 5) {
          const lista = [], perto = caidos.concat(cavalos);
          for (let k = 0, n = 3 + Math.floor(rG() * 4); k < n && perto.length; k++) { const q = perto[Math.floor(rG() * perto.length) % perto.length], a = rG() * TAU, d = 0.5 + rG() * 0.5; lista.push({ x: r2(q.x + Math.cos(a) * d), y: r2(q.y + Math.sin(a) * d), ang: +(rG() * TAU).toFixed(2) }); }
          if (lista.length) K.pinta(3, 'corvos', { itens: lista });
        }
        // as brasas ainda acesas (no dia e no seguinte): a zona, a luz e o chão chamuscado
        let brasas = 0;
        if (fase === 0) {
          const nb = 1 + (n0 >= 14 ? 1 : 0) + (b.dias === 0 ? 1 : 0), lista = [];
          for (let k = 0; k < nb; k++) { const p = ponto(rG() < 0.5 ? 0 : 1, 1.2); if (!p) continue; const r = +(0.9 + rG() * 0.45).toFixed(2); lista.push({ x: r2(p[0]), y: r2(p[1]), r }); K.zona('brasas', r2(p[0]), r2(p[1]), { r }); K.luz(r2(p[0]), r2(p[1]), 3, '#ff8a3a', 0.5); brasas++; }
          if (lista.length) K.pinta(1, 'chamusco', { itens: lista });
        }
        fechar();
        marca('batalha', 'Campo de batalha: ' + nomeBat(b) + ' (' + quando(b.dias) + ')', cx + 1.4, cy + 0.4, cx, cy, rx);
        feitos.push([cx, cy, rx + 0.5]); evitar.push([cx, cy, rx + 1]);
        I.bat = { nome: nomeBat(b), dias: b.dias, caidos: caidos.length, covas, brasas };
      }
    }

    /* ---- os acampamentos (os outros): um longe do outro, abertos para o meio da cena (dois de facções diferentes: um
       virado para o outro) ---- */
    camps.forEach((e, i) => {
      const outro = i > 0 && I.exes.length ? P.guerra.find(q => q.k === 'acampamento') : null;
      const alvo = outro ? [W - outro.cx, H - outro.cy] : null;
      poeAcampamento(e, alvo, (x, y) => (outro ? Math.atan2(outro.cy - y, outro.cx - x) : Math.atan2(H / 2 - y, W / 2 - x)), true);
    });

    /* ---- o hexágono destruído ou corrompido: as manchas por cima do que é do chão (também sob o acampamento) ---- */
    if (g.marca) {
      const d = g.marca === 'd', nM = W * H >= 1100 ? 3 : 2, manchas = [];
      // (quase sem água, mais da metade de chão que se pisa e sem cair em cima do meio da situação; sem lugar, menores)
      for (let k = 0; k < nM; k++) {
        const R0 = clamp(Math.min(W, H) * (0.17 + rG() * 0.08), 3.2, 7), fy = 0.7 + rG() * 0.25;
        let l = null, R = R0, melhor = null;
        for (const f of [1, 0.75, 0.55]) {
          R = R0 * f;
          const ry = R * fy;
          for (let t = 0; t < 70 && !l; t++) {
            const x = R + MG + 0.5 + rG() * (W - 2 * (R + MG + 0.5)), y = R + MG + 0.5 + rG() * (H - 2 * (R + MG + 0.5));
            if (manchas.some(m => Math.hypot(x - m.x, y - m.y) < (R + m.R) * 0.75) || !evitar.every(([ex, ey, er]) => Math.hypot(x - ex, y - ey) >= er * 0.5)) continue;
            let n = 0, ag = 0, duro = 0;
            for (let j = Math.floor(y - ry - 1); j <= Math.floor(y + ry + 1); j++) for (let i = Math.floor(x - R - 1); i <= Math.floor(x + R + 1); i++) { n++; const v = K.at(i, j); if (v === 2 || v === 8) ag++; else if (v === 3 || v === 7 || v === 9 || v === 10) duro++; }
            if (ag <= n * 0.03 && duro <= n * 0.35) l = [x, y];
            // (o melhor que não serviu: onde nada cabe — a encosta, o desfiladeiro —, a mancha vai nele, menor)
            else if (ag <= n * 0.1 && (!melhor || duro / n < melhor.d)) melhor = { x, y, d: duro / n, R };
          }
          if (l) break;
        }
        if (!l && melhor && !manchas.length) { l = [melhor.x, melhor.y]; R = melhor.R; }
        if (!l) continue;
        const pts = MO.blob(rG, l[0], l[1], R, R * fy, 16, 0.38, rG() * TAU);
        manchas.push({ x: l[0], y: l[1], R, pts });
      }
      if (!manchas.length) I.fora.push(d ? 'o chão queimado' : 'a terra corrompida');
      else {
        const naMancha = (x, y) => manchas.some(m => MO.dentroPoli(m.pts, x, y));
        // (por cima do chão, das plantações e do caminho: a terra queimada ou corrompida cobre tudo o que é do chão)
        for (const m of manchas) K.pinta(1, 'arrasado', { pts: m.pts.map(q => [r2(q[0]), r2(q[1])]), t: g.marca });
        // (no destruído, as construções da situação ficam com a fuligem)
        if (d) for (const k of P.predios) if (naMancha(k.x + k.w / 2, k.y + k.h / 2)) K.pinta(3, 'fuligem', { pts: Estilos.contorno(k).map(q => [r2(q[0]), r2(q[1])]) });
        // as árvores: carbonizadas (no destruído) ou mortas e roxas (no corrompido); os arbustos e as flores, queimados
        for (const a of P.arvores) if (ARVORE(a.esp) && naMancha(a.x, a.y)) { if (d) a.esp = 'queimada'; else { a.esp = 'morta'; a.pal = 'corrompida'; a.neve = false; } }
        tirar(P.objetos, (o, i) => { if (i < A.obj || !QUEIMA[o.id] || !naMancha(o.x + 0.5, o.y + 0.5)) return false; if (K.at(o.x, o.y) === 4 && A.occ[o.y * W + o.x] === 0) K.pos(o.x, o.y, 0); return true; });
        let casas = 0, cristais = 0;
        // (lote 14, parte 14c) nos arredores de um lugar: as casas dele queimam (por cima do desenho dele, na cena)
        const doLugar = d && LG && (LG.predios || []).length ? queimarNoLugar(LG) : 0;
        if (d) {
          for (const m of manchas) for (let k = 0; k < 2; k++) objPerto('toco', m.x, m.y, 0.5, m.R * 0.8, v => v === 0);
          // a casa queimada (uma; duas no grande), dentro de uma mancha
          for (let k = 0, n = doLugar ? 0 : W * H >= 1100 ? 2 : 1; k < n; k++) {
            const m = manchas[k % manchas.length];
            let l = null;
            for (let t = 0; t < 120 && !l; t++) { const a = rG() * TAU, rr = rG() * m.R * 0.75, x = m.x + Math.cos(a) * rr, y = m.y + Math.sin(a) * rr; if (cabe(x, y, 2.3, 0.15) && longe(x, y, t < 60 ? 0.7 : 0.45, 2.3)) l = [x, y]; }
            if (!l) continue;
            const [hx, hy] = l, w = 3 + Math.floor(rG() * 2), hh = 2.4 + Math.floor(rG() * 2) * 0.6, ang = (rG() - 0.5) * 0.5;
            limpar((x, y) => Math.hypot(x - hx, y - hy) <= 2.8);
            const fp = Estilos.retangulo(hx, hy, w, hh, ang), ch = fp[Math.floor(rG() * 4) % 4], chx = hx + (ch[0] - hx) * 0.78, chy = hy + (ch[1] - hy) * 0.78;
            K.pinta(2, 'casaQueimada', { x: r2(hx), y: r2(hy), w, h: hh, ang: +ang.toFixed(3), ch: [r2(chx), r2(chy)] });
            K.marcaPoli(fp, 5);
            if (K.at(Math.floor(chx), Math.floor(chy)) !== 1) K.pos(Math.floor(chx), Math.floor(chy), 3);
            P.cobertura.push({ x: chx, y: chy, r: 0.6 });
            marca('casa', 'Casa queimada', hx + w / 2 + 0.6, hy, hx, hy, Math.max(w, hh) / 2);
            evitar.push([hx, hy, 3.2]); feitos.push([hx, hy, 3]);
            casas++;
          }
        } else {
          // os veios que brilham e os cristais negros (com a luz roxa)
          for (const m of manchas) {
            const linhas = [];
            for (let k = 0, n = 3 + Math.floor(rG() * 3); k < n; k++) {
              let a = rG() * TAU, x = m.x + (rG() - 0.5) * m.R * 0.4, y = m.y + (rG() - 0.5) * m.R * 0.4;
              const pts = [[r2(x), r2(y)]];
              for (let s = 0; s < 4; s++) { a += (rG() - 0.5) * 1.1; const L = m.R * (0.15 + rG() * 0.14); x += Math.cos(a) * L; y += Math.sin(a) * L; if (!MO.dentroPoli(m.pts, x, y)) break; pts.push([r2(x), r2(y)]); }
              if (pts.length > 1) linhas.push(pts);
            }
            if (linhas.length) K.pinta(1, 'veios', { linhas });
            for (let k = 0, n = 1 + (m.R > 5 ? 1 : 0); k < n; k++) {
              for (let t = 0; t < 30; t++) {
                const a = rG() * TAU, rr = rG() * m.R * 0.7, x = m.x + Math.cos(a) * rr, y = m.y + Math.sin(a) * rr, i = Math.floor(x), j = Math.floor(y);
                if (!MO.dentroPoli(m.pts, x, y) || K.at(i, j) !== 0) continue;
                K.pinta(2, 'cristais', { x: r2(i + 0.5), y: r2(j + 0.5), r: +(0.45 + rG() * 0.35).toFixed(2), cor: 'negro' });
                K.pos(i, j, 4);
                K.luz(r2(i + 0.5), r2(j + 0.5), 3, '#b06cf0', 0.4);
                cristais++;
                break;
              }
            }
          }
        }
        const mm = manchas.reduce((a, b) => (b.R > a.R ? b : a));
        if (!d) marca('corrompida', 'Terra corrompida (o hexágono corrompido)', mm.x + 1, mm.y + 0.5, mm.x, mm.y, mm.R);
        else if (!casas) marca('queimado', 'Terra arrasada (o hexágono destruído)', mm.x + 1, mm.y + 0.5, mm.x, mm.y, mm.R);
        I.marca = { t: g.marca, manchas: manchas.length, casas: casas + doLugar, cristais };
        if (doLugar) I.marca.noLugar = doLugar;
      }
    }
    if (!P.guerra.length) delete P.guerra;
    if (!I.fora.length) delete I.fora;
    if (!I.exes.length) delete I.exes;
    if (Object.keys(I).length && LG) I.arredores = LG.nivel || 'medio';          // (lote 14, parte 14c: o resumo diz o que cabe com mais arredores)
    if (Object.keys(I).length) P.guerraInfo = I;
    return feitos;
  }

  /* ================= o resumo ================= */
  function texto(p) {
    const I = p.guerraInfo, partes = [];
    if (!I) return partes;
    // (lote 14, parte 14c: nos arredores de um lugar, o que cabe mais é com os arredores em Muito)
    const maior = I.arredores ? I.arredores === 'muito' : p.tamanho === 'grande', comoCabe = I.arredores ? 'com os arredores em Muito cabe mais' : 'no tamanho Grande cabe mais';
    if (I.cerco) {
      const c = I.cerco, mq = [];
      for (const [k, s, pl] of [['catapulta', 'catapulta'], ['trabuco', 'trabuco'], ['ariete', 'aríete']]) if (c.maq[k]) mq.push(k === 'ariete' && c.arieteNoPortao ? (c.maq[k] === 1 ? 'o aríete no portão' : plural(c.maq[k], s, pl)) : plural(c.maq[k], s, pl));
      if (c.emVolta) partes.push('o cerco de ' + c.nome + ': ' + juntar(['a trincheira em volta'].concat(mq, c.posto ? ['o posto de quem cerca'] : [])));
      else partes.push('o cerco de ' + c.nome + ' (o lugar fica ' + NA_DIR[c.dir] + '): ' + juntar(['a trincheira'].concat(mq, c.posto ? ['o posto de quem cerca'] : [])));
    }
    for (const e of I.exes || []) {
      const menos = e.tendas < e.quer;
      partes.push('o acampamento ' + (e.lado === 'cerco' ? 'de quem cerca ' : '') + '“' + e.nome + '” (' + (menos ? e.tendas + ' das ' + e.quer + ' tendas' : plural(e.tendas, 'tenda')) + ' e ' + plural(e.fogos, 'fogueira') +
        (e.maq ? ', com ' + plural(e.maq, 'máquina de cerco parada', 'máquinas de cerco paradas') : '') + (menos ? '; ' + (maior ? 'não cabe mais' : comoCabe) : '') + ')');
    }
    if (I.bat) partes.push('o campo de batalha (' + I.bat.nome + ', ' + quando(I.bat.dias) + ')' + (I.bat.brasas ? ' com as brasas ainda acesas' : I.bat.covas ? ' com ' + (I.bat.covas === 1 ? 'a cova' : 'as covas') : ''));
    if (I.marca) {
      const nl = I.marca.noLugar || 0, fora = I.marca.casas - nl;
      partes.push(I.marca.t === 'd' ? 'o chão queimado do hexágono destruído' + (nl ? (nl === 1 ? ' e uma casa do lugar queimada' : ' e ' + nl + ' casas do lugar queimadas') : fora ? (fora === 1 ? ' e a casa queimada' : ' e ' + fora + ' casas queimadas') : '') : 'a terra corrompida do hexágono' + (I.marca.cristais ? ' com os cristais negros' : ''));
    }
    if (I.outroCerco) partes.push('o cerco de ' + I.outroCerco + ' fica fora da cena (o lugar cercado é outro, no mesmo hexágono)');
    if (I.fora) partes.push('sem lugar para ' + juntar(I.fora) + ' (' + (I.arredores ? 'os arredores não comportam' : 'a cena não comporta') + (!maior ? '; ' + comoCabe : '') + ')');
    return partes;
  }

  /* ================= a janela ================= */
  // os botões das marcas (várias juntas), no bloco do hexágono; aoMudar(novas chaves)
  function campo(gu, sel, kit, aoMudar) {
    const its = itens(gu);
    if (!its.length) return null;
    const on = valida(gu, sel);
    const bts = h('div', { class: 'seg', role: 'group', id: 'ger-guerra', 'aria-label': 'Marcas da guerra (várias juntas)' }, its.map(x => h('button', {
      type: 'button', class: 'seg-b' + (on.includes(x.k) ? ' on' : ''), 'aria-pressed': String(on.includes(x.k)), title: x.dica, 'data-guerra': x.k,
      onclick: () => aoMudar(its.map(y => y.k).filter(k => (k === x.k ? !on.includes(k) : on.includes(k)))),
    }, x.n)));
    const notas = [];
    if (gu.maisExes) notas.push(gu.maisExes === 1 ? 'Mais um exército no hexágono fica de fora (cabem dois acampamentos).' : 'Mais ' + gu.maisExes + ' exércitos no hexágono ficam de fora (cabem dois acampamentos).');
    if (gu.dentro && gu.cerco) notas.push((gu.dentro === 1 ? 'Um exército está' : gu.dentro + ' exércitos estão') + ' dentro de ' + gu.cerco.nome + ': não acampa fora.');
    const out = h('div', { class: 'ger-guerra', id: 'ger-guerra-bloco' }, kit.field('Marcas da guerra', bts, 'stack'));
    if (notas.length) { const n = kit.note(notas.join(' ')); n.id = 'ger-guerra-nota'; out.appendChild(n); }
    return out;
  }

  /* ================= o desenho ================= */
  const MAD = ['#7a5532', '#4e3420', '#9a7048'], ACO = ['#c9ccd0', '#8a9096', '#5c6268'];
  const sombra = (g, x, y, rx, ry, a) => { g.globalAlpha = a == null ? 0.3 : a; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); g.globalAlpha = 1; };
  // os caídos: as silhuetas deitadas (x, y: o meio; ang: da cabeça para os pés), discretas — a mancha escura embaixo, sem
  // sangue à mostra, o corpo em tons apagados e o pano na cor do lado (c1)
  function caidos(g, o, c, rnd) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    for (const q of o.itens || []) {
      g.save(); g.translate(q.x * c, q.y * c); g.rotate(q.ang || 0);
      // a mancha escura, irregular
      g.globalAlpha = 0.32; g.fillStyle = '#231a15'; g.beginPath(); g.ellipse(c * 0.02, c * 0.03, c * 0.5, c * 0.27, 0.15, 0, TAU); g.fill();
      g.globalAlpha = 0.22; g.beginPath(); g.ellipse(-c * 0.12 + rnd() * c * 0.1, c * 0.12, c * 0.24, c * 0.14, rnd() * 3, 0, TAU); g.fill();
      g.globalAlpha = 0.9;
      const corpo = q.v === 0 ? '#5a5b60' : q.v === 1 ? '#5a4836' : Estilos.tom(q.c1, -0.45), esc = '#2e2925';
      // as pernas
      const pe = rnd() < 0.5 ? 1 : -1;
      g.strokeStyle = esc; g.lineWidth = Math.max(1.2, c * 0.1);
      g.beginPath(); g.moveTo(c * 0.06, -c * 0.07); g.lineTo(c * 0.42, -c * (0.1 + pe * 0.06)); g.stroke();
      g.beginPath(); g.moveTo(c * 0.06, c * 0.07); g.lineTo(c * 0.4, c * (0.16 - pe * 0.05)); g.stroke();
      // os braços (um esticado, o outro dobrado)
      g.strokeStyle = Estilos.tom(corpo, -0.2); g.lineWidth = Math.max(1, c * 0.085);
      g.beginPath(); g.moveTo(-c * 0.2, -c * 0.12); g.lineTo(-c * 0.42, -c * 0.32); g.stroke();
      g.beginPath(); g.moveTo(-c * 0.2, c * 0.12); g.lineTo(-c * 0.05, c * 0.27); g.lineTo(c * 0.08, c * 0.22); g.stroke();
      // o tronco e o pano na cor do lado
      g.fillStyle = corpo; g.beginPath(); g.ellipse(-c * 0.08, 0, c * 0.2, c * 0.15, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(15,12,10,0.55)'; g.lineWidth = Math.max(1, c * 0.025); g.stroke();
      g.fillStyle = Estilos.tom(q.c1, -0.15); g.globalAlpha = 0.85; g.fillRect(-c * 0.12, -c * 0.13, c * 0.09, c * 0.26); g.globalAlpha = 0.9;
      // a cabeça (com o elmo ou sem)
      g.fillStyle = q.v === 0 ? '#6d6f74' : '#3a2e26'; g.beginPath(); g.arc(-c * 0.36, 0, c * 0.1, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(15,12,10,0.55)'; g.lineWidth = Math.max(1, c * 0.02); g.stroke();
      g.restore();
    }
    g.restore();
  }
  // as armas caídas (fresquinhas): a espada, a lança, o machado, o escudo redondo nas cores do lado e o elmo
  function armasCaidas(g, o, c) {
    g.save(); g.lineCap = 'round';
    const C = c * 1.35;
    for (const q of o.itens || []) {
      g.save(); g.translate(q.x * c, q.y * c); g.rotate(q.ang || 0);
      g.globalAlpha = 0.28; g.fillStyle = '#000'; g.beginPath(); g.ellipse(C * 0.04, C * 0.05, C * 0.38, C * 0.11, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
      if (q.t === 'escudo') {
        const R = C * 0.24;
        g.fillStyle = q.c1; g.beginPath(); g.arc(0, 0, R, -Math.PI / 2, Math.PI / 2); g.closePath(); g.fill();
        g.fillStyle = q.c2; g.beginPath(); g.arc(0, 0, R, Math.PI / 2, Math.PI * 1.5); g.closePath(); g.fill();
        g.strokeStyle = ACO[1]; g.lineWidth = Math.max(1, C * 0.04); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
        g.fillStyle = ACO[0]; g.beginPath(); g.arc(0, 0, R * 0.25, 0, TAU); g.fill();
      } else if (q.t === 'elmo') {
        const R = C * 0.16, gr = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
        gr.addColorStop(0, '#e2e5e8'); gr.addColorStop(1, ACO[2]);
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
        g.fillStyle = 'rgba(20,20,24,0.75)'; g.fillRect(-R * 0.6, -R * 0.1, R * 1.2, R * 0.2);
      } else if (q.t === 'lanca') {
        g.strokeStyle = MAD[0]; g.lineWidth = Math.max(1.5, C * 0.06); g.beginPath(); g.moveTo(-C * 0.55, 0); g.lineTo(C * 0.4, 0); g.stroke();
        g.fillStyle = ACO[0]; g.beginPath(); g.moveTo(C * 0.4, -C * 0.07); g.lineTo(C * 0.64, 0); g.lineTo(C * 0.4, C * 0.07); g.closePath(); g.fill();
      } else if (q.t === 'machado') {
        g.strokeStyle = MAD[1]; g.lineWidth = Math.max(1, C * 0.06); g.beginPath(); g.moveTo(-C * 0.35, 0); g.lineTo(C * 0.3, 0); g.stroke();
        g.fillStyle = ACO[1]; g.beginPath(); g.moveTo(C * 0.22, -C * 0.02); g.quadraticCurveTo(C * 0.32, -C * 0.24, C * 0.42, -C * 0.2); g.lineTo(C * 0.36, C * 0.04); g.closePath(); g.fill();
      } else {
        g.strokeStyle = ACO[2]; g.lineWidth = Math.max(1.5, C * 0.09); g.beginPath(); g.moveTo(-C * 0.1, 0); g.lineTo(C * 0.55, 0); g.stroke();
        g.strokeStyle = ACO[0]; g.lineWidth = Math.max(1, C * 0.05); g.beginPath(); g.moveTo(-C * 0.1, 0); g.lineTo(C * 0.55, 0); g.stroke();
        g.strokeStyle = '#8a6a3a'; g.lineWidth = Math.max(1, C * 0.05); g.beginPath(); g.moveTo(-C * 0.1, -C * 0.13); g.lineTo(-C * 0.1, C * 0.13); g.stroke();
        g.strokeStyle = MAD[1]; g.lineWidth = Math.max(1, C * 0.06); g.beginPath(); g.moveTo(-C * 0.1, 0); g.lineTo(-C * 0.28, 0); g.stroke();
      }
      g.restore();
    }
    g.restore();
  }
  // as flechas fincadas no chão (cada grupo: n flechas, inclinadas para o lado de onde vieram)
  function flechas(g, o, c, rnd) {
    g.save(); g.lineCap = 'round';
    for (const q of o.itens || []) for (let k = 0; k < (q.n || 4); k++) {
      const x = (q.x + (rnd() - 0.5) * 0.8) * c, y = (q.y + (rnd() - 0.5) * 0.8) * c, a = (q.ang || 0) + (rnd() - 0.5) * 0.5, L = c * (0.26 + rnd() * 0.1), ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
      g.globalAlpha = 0.3; g.strokeStyle = '#000'; g.lineWidth = Math.max(1, c * 0.035); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L * 1.4 + c * 0.05, y + Math.sin(a) * L * 1.4 + c * 0.06); g.stroke(); g.globalAlpha = 1;
      g.strokeStyle = '#6e5232'; g.lineWidth = Math.max(1, c * 0.035); g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = '#ece6d6'; g.lineWidth = Math.max(1, c * 0.03);
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - Math.cos(a + s * 0.5) * c * 0.1, ey - Math.sin(a + s * 0.5) * c * 0.1); g.stroke(); }
    }
    g.restore();
  }
  // os cavalos caídos, deitados de lado (discretos), com a manta na cor do lado
  function cavaloCaido(g, o, c, rnd) {
    g.save(); g.lineCap = 'round';
    for (const q of o.itens || []) {
      g.save(); g.translate(q.x * c, q.y * c); g.rotate(q.ang || 0);
      g.globalAlpha = 0.3; g.fillStyle = '#231a15'; g.beginPath(); g.ellipse(c * 0.05, c * 0.1, c * 0.95, c * 0.48, 0, 0, TAU); g.fill(); g.globalAlpha = 0.92;
      const pelo = ['#5a4030', '#4a3a30', '#6a5040'][Math.floor(rnd() * 3) % 3], esc = Estilos.tom(pelo, -0.35);
      // as pernas, para fora
      g.strokeStyle = esc; g.lineWidth = Math.max(1.2, c * 0.1);
      for (const [x0, a] of [[-0.45, 1.2], [-0.3, 1.5], [0.35, 1.4], [0.5, 1.1]]) { g.beginPath(); g.moveTo(x0 * c, c * 0.18); g.lineTo(x0 * c + Math.cos(a) * c * 0.5, c * 0.18 + Math.sin(a) * c * 0.5); g.stroke(); }
      // o corpo, o pescoço, a cabeça e o rabo
      g.fillStyle = pelo; g.beginPath(); g.ellipse(0, 0, c * 0.75, c * 0.32, 0, 0, TAU); g.fill();
      g.strokeStyle = pelo; g.lineWidth = Math.max(2, c * 0.22); g.beginPath(); g.moveTo(-c * 0.6, -c * 0.05); g.lineTo(-c * 0.95, -c * 0.2); g.stroke();
      g.fillStyle = esc; g.beginPath(); g.ellipse(-c * 1.08, -c * 0.24, c * 0.2, c * 0.1, -0.35, 0, TAU); g.fill();
      g.strokeStyle = '#2a201a'; g.lineWidth = Math.max(1, c * 0.06); g.beginPath(); g.moveTo(c * 0.72, 0); g.quadraticCurveTo(c * 0.95, c * 0.05, c * 1.05, c * 0.25); g.stroke();
      // a manta e a sela
      g.fillStyle = Estilos.tom(q.c1, -0.2); g.globalAlpha = 0.85; g.fillRect(-c * 0.15, -c * 0.3, c * 0.4, c * 0.42); g.globalAlpha = 0.92;
      g.fillStyle = '#3a2a1c'; g.fillRect(-c * 0.08, -c * 0.24, c * 0.24, c * 0.28);
      g.restore();
    }
    g.restore();
  }
  // os buracos rasos das pedras e dos tiros: a terra jogada em volta, o fundo escuro e às vezes a pedra
  function buracoGuerra(g, o, c, rnd) {
    g.save();
    for (const q of o.itens || []) {
      const X = q.x * c, Y = q.y * c, R = (q.r || 0.6) * c;
      g.globalAlpha = 0.45; g.fillStyle = '#5e4a34';
      for (let k = 0; k < 9; k++) { const a = rnd() * TAU, d = R * (1 + rnd() * 0.5); g.beginPath(); g.ellipse(X + Math.cos(a) * d, Y + Math.sin(a) * d, R * 0.28, R * 0.18, a, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      const gr = g.createRadialGradient(X, Y, R * 0.1, X, Y, R);
      gr.addColorStop(0, '#16110d'); gr.addColorStop(0.7, '#2e241b'); gr.addColorStop(1, 'rgba(70,54,38,0.6)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(X, Y, R, R * 0.85, 0, 0, TAU); g.fill();
      if (rnd() < 0.6) { g.fillStyle = '#8d8a84'; g.beginPath(); g.arc(X + R * 0.25, Y - R * 0.1, R * 0.32, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(X + R * 0.17, Y - R * 0.18, R * 0.12, 0, TAU); g.fill(); }
    }
    g.restore();
  }
  // a bandeira (o pano) nas duas cores, de L × A, saindo do mastro para x+, com a ponta em rabo de andorinha
  function pano(g, L, A, c1, c2, onda) {
    const d = A * 0.12 * onda;
    g.beginPath(); g.moveTo(0, -A / 2); g.quadraticCurveTo(L * 0.5, -A / 2 - d, L, -A / 2 + d * 0.5); g.lineTo(L * 0.82, 0); g.lineTo(L, A / 2 + d * 0.5); g.quadraticCurveTo(L * 0.5, A / 2 - d, 0, A / 2); g.closePath();
    g.fillStyle = c1; g.fill();
    g.save(); g.clip(); g.fillStyle = c2; g.fillRect(0, 0, L, A); g.restore();
    g.strokeStyle = 'rgba(20,14,10,0.6)'; g.lineWidth = Math.max(1, A * 0.06); g.stroke();
  }
  // o estandarte fincado (visto de cima): a sombra do mastro, a base e o pano tremulando para o lado do vento (ang)
  function estandarte(g, o, c) {
    const X = o.x * c, Y = o.y * c;
    g.save(); g.lineCap = 'round';
    g.globalAlpha = 0.28; g.strokeStyle = '#000'; g.lineWidth = Math.max(1.5, c * 0.07); g.beginPath(); g.moveTo(X, Y); g.lineTo(X + c * 0.9, Y + c * 1.1); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = '#3a2a1c'; g.beginPath(); g.arc(X, Y, c * 0.1, 0, TAU); g.fill();
    g.translate(X, Y); g.rotate(o.ang || 0);
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.save(); g.translate(c * 0.12, c * 0.14); pano(g, c * 1.05, c * 0.6, '#000', '#000', 1); g.restore(); g.globalAlpha = 1;
    pano(g, c * 1.05, c * 0.6, o.c1 || '#8a7a5e', o.c2 || '#4e4434', 1);
    g.fillStyle = '#d8b25a'; g.beginPath(); g.arc(0, 0, c * 0.08, 0, TAU); g.fill();
    g.restore();
  }
  // o estandarte caído: o mastro no chão e o pano amarrotado, nas cores do lado
  function estandarteCaido(g, o, c) {
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0); g.lineCap = 'round';
    g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(-c * 0.85, -c * 0.02, c * 1.8, c * 0.42); g.globalAlpha = 1;
    g.strokeStyle = '#5a3e26'; g.lineWidth = Math.max(1.5, c * 0.07); g.beginPath(); g.moveTo(-c * 0.95, 0); g.lineTo(c * 0.85, 0); g.stroke();
    g.beginPath(); g.moveTo(c * 0.15, 0); g.lineTo(c * 0.85, c * 0.02); g.lineTo(c * 0.78, c * 0.3); g.lineTo(c * 0.6, c * 0.22); g.lineTo(c * 0.45, c * 0.42); g.lineTo(c * 0.28, c * 0.3); g.lineTo(c * 0.18, c * 0.36); g.closePath();
    g.fillStyle = o.c1 || '#8a7a5e'; g.globalAlpha = 0.95; g.fill();
    g.save(); g.clip(); g.fillStyle = o.c2 || '#4e4434'; g.fillRect(c * 0.1, c * 0.2, c * 0.8, c * 0.3); g.restore();
    g.globalAlpha = 0.5; g.strokeStyle = 'rgba(20,14,10,0.7)'; g.lineWidth = Math.max(1, c * 0.025); g.beginPath(); g.moveTo(c * 0.35, c * 0.05); g.lineTo(c * 0.42, c * 0.3); g.moveTo(c * 0.6, c * 0.04); g.lineTo(c * 0.55, c * 0.2); g.stroke();
    g.restore();
  }
  // as covas: o monte de terra fresca e, na cabeceira, a espada fincada com o elmo
  function covas(g, o, c, rnd) {
    g.save(); g.lineCap = 'round';
    for (const q of o.itens || []) {
      g.save(); g.translate(q.x * c, q.y * c); g.rotate(q.ang || 0);
      sombra(g, c * 0.08, c * 0.1, c * 0.62, c * 0.3);
      const gr = g.createLinearGradient(0, -c * 0.28, 0, c * 0.28); gr.addColorStop(0, '#7a5e40'); gr.addColorStop(1, '#4a3826');
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, c * 0.6, c * 0.27, 0, 0, TAU); g.fill();
      g.fillStyle = '#5e4630'; for (let k = 0; k < 7; k++) { g.beginPath(); g.arc((rnd() - 0.5) * c * 0.9, (rnd() - 0.5) * c * 0.35, c * (0.03 + rnd() * 0.04), 0, TAU); g.fill(); }
      // a espada fincada (a guarda em cruz) e o elmo pendurado
      g.strokeStyle = ACO[1]; g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.moveTo(-c * 0.72, -c * 0.16); g.lineTo(-c * 0.72, c * 0.16); g.stroke();
      g.strokeStyle = MAD[1]; g.lineWidth = Math.max(1, c * 0.06); g.beginPath(); g.moveTo(-c * 0.72, 0); g.lineTo(-c * 0.88, 0); g.stroke();
      g.fillStyle = ACO[2]; g.beginPath(); g.arc(-c * 0.72, 0, c * 0.1, 0, TAU); g.fill();
      g.restore();
    }
    g.restore();
  }
  // os corvos no chão (pequenos e pretos)
  function corvos(g, o, c) {
    g.save();
    for (const q of o.itens || []) {
      g.save(); g.translate(q.x * c, q.y * c); g.rotate(q.ang || 0);
      sombra(g, c * 0.03, c * 0.04, c * 0.13, c * 0.07, 0.25);
      g.fillStyle = '#15151a'; g.beginPath(); g.ellipse(0, 0, c * 0.12, c * 0.065, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(c * 0.12, 0, c * 0.045, 0, TAU); g.fill();
      g.fillStyle = '#2a2a33'; g.beginPath(); g.moveTo(-c * 0.04, -c * 0.05); g.lineTo(-c * 0.2, -c * 0.02); g.lineTo(-c * 0.04, c * 0.03); g.closePath(); g.fill();
      g.fillStyle = '#5a5040'; g.beginPath(); g.moveTo(c * 0.16, -c * 0.015); g.lineTo(c * 0.21, 0); g.lineTo(c * 0.16, c * 0.015); g.closePath(); g.fill();
      g.restore();
    }
    g.restore();
  }
  // o chão chamuscado das brasas (a zona desenha o fogo; isto é o chão)
  function chamusco(g, o, c, rnd) {
    g.save();
    for (const q of o.itens || []) {
      const X = q.x * c, Y = q.y * c, R = (q.r || 1) * c, gr = g.createRadialGradient(X, Y, R * 0.1, X, Y, R * 1.15);
      gr.addColorStop(0, 'rgba(18,12,8,0.85)'); gr.addColorStop(0.65, 'rgba(30,22,16,0.55)'); gr.addColorStop(1, 'rgba(30,22,16,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(X, Y, R * 1.15, 0, TAU); g.fill();
      g.fillStyle = '#1a1310'; for (let k = 0; k < 4; k++) { g.save(); g.translate(X + (rnd() - 0.5) * R, Y + (rnd() - 0.5) * R); g.rotate(rnd() * 3); g.fillRect(-R * 0.3, -R * 0.05, R * 0.6, R * 0.1); g.restore(); }
    }
    g.restore();
  }
  // a tenda do exército (x, y: o meio; l × w, ang): as duas águas de lona puxando para a cor da facção, a faixa na
  // cumeeira (c1), a porta na ponta e a flâmula (c1, c2)
  function tendaGuerra(g, o, c) {
    const L = (o.l || 1.9) * c, Wd = (o.w || 1.4) * c, lona = mix('#cdbb94', o.c1 || '#8a7a5e', 0.3);
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    g.globalAlpha = 0.35; g.fillStyle = '#000'; g.fillRect(-L / 2 + c * 0.14, -Wd / 2 + c * 0.18, L, Wd); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(70,55,35,0.75)'; g.lineWidth = Math.max(1, c * 0.025);
    for (const [px, py] of [[-L / 2, -Wd / 2], [L / 2, -Wd / 2], [-L / 2, Wd / 2], [L / 2, Wd / 2]]) { g.beginPath(); g.moveTo(px, py); g.lineTo(px * 1.18, py * 1.4); g.stroke(); g.fillStyle = MAD[1]; g.fillRect(px * 1.18 - 1.5, py * 1.4 - 1.5, 3, 3); }
    g.fillStyle = Estilos.tom(lona, 0.12); g.fillRect(-L / 2, -Wd / 2, L, Wd / 2);
    g.fillStyle = Estilos.tom(lona, -0.16); g.fillRect(-L / 2, 0, L, Wd / 2);
    g.fillStyle = o.c1 || '#8a7a5e'; g.fillRect(-L / 2, -Wd * 0.07, L, Wd * 0.14);
    g.strokeStyle = Estilos.tom(lona, -0.45); g.lineWidth = Math.max(1, c * 0.04); g.strokeRect(-L / 2, -Wd / 2, L, Wd);
    // a porta (a aba aberta na ponta de x+)
    g.fillStyle = 'rgba(30,22,14,0.7)'; g.beginPath(); g.moveTo(L / 2, -Wd * 0.28); g.lineTo(L / 2 - c * 0.28, 0); g.lineTo(L / 2, Wd * 0.28); g.closePath(); g.fill();
    // a flâmula na outra ponta
    g.translate(-L / 2, 0); g.rotate(-0.4);
    pano(g, c * 0.42, c * 0.2, o.c1 || '#8a7a5e', o.c2 || '#4e4434', 0.5);
    g.restore();
  }
  // a tenda do comando (redonda, vista de cima): os gomos nas duas cores, a franja, as cordas, o pináculo e a flâmula
  function pavilhao(g, o, c) {
    const X = o.x * c, Y = o.y * c, R = (o.r || 1.5) * c, c1 = o.c1 || '#8a7a5e', c2 = o.c2 || '#4e4434';
    g.save();
    g.globalAlpha = 0.35; g.fillStyle = '#000'; g.beginPath(); g.arc(X + c * 0.2, Y + c * 0.25, R, 0, TAU); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(70,55,35,0.7)'; g.lineWidth = Math.max(1, c * 0.025);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + 0.2; g.beginPath(); g.moveTo(X + Math.cos(a) * R, Y + Math.sin(a) * R); g.lineTo(X + Math.cos(a) * R * 1.32, Y + Math.sin(a) * R * 1.32); g.stroke(); g.fillStyle = MAD[1]; g.fillRect(X + Math.cos(a) * R * 1.32 - 1.5, Y + Math.sin(a) * R * 1.32 - 1.5, 3, 3); }
    const n = 12;
    for (let k = 0; k < n; k++) {
      const a0 = k / n * TAU, a1 = (k + 1) / n * TAU, luz = 0.12 * Math.cos((a0 + a1) / 2 + 2.3);
      g.fillStyle = Estilos.tom(k % 2 ? c1 : mix(c2, '#ffffff', 0.15), luz);
      g.beginPath(); g.moveTo(X, Y); g.arc(X, Y, R, a0, a1); g.closePath(); g.fill();
    }
    g.strokeStyle = 'rgba(20,14,10,0.55)'; g.lineWidth = Math.max(1, c * 0.035); g.beginPath(); g.arc(X, Y, R, 0, TAU); g.stroke();
    // a franja em volta
    g.fillStyle = c2; for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; g.beginPath(); g.arc(X + Math.cos(a) * R * 0.97, Y + Math.sin(a) * R * 0.97, R * 0.08, 0, TAU); g.fill(); }
    g.fillStyle = '#d8b25a'; g.beginPath(); g.arc(X, Y, R * 0.12, 0, TAU); g.fill();
    g.translate(X, Y); g.rotate(o.ang || 0);
    pano(g, R * 0.55, R * 0.26, c1, c2, 0.6);
    g.restore();
  }
  // a armação de madeira (a base das máquinas): as duas vigas dos lados, as travessas e as rodas
  function armacao(g, L, Wd, c, rodas) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-L / 2 + c * 0.12, -Wd / 2 + c * 0.15, L, Wd);
    if (rodas) for (const [x, y] of [[-L * 0.32, -Wd / 2], [L * 0.32, -Wd / 2], [-L * 0.32, Wd / 2], [L * 0.32, Wd / 2]]) { g.fillStyle = '#2e1f10'; g.fillRect(x - c * 0.22, y - c * 0.08, c * 0.44, c * 0.16); g.fillStyle = MAD[0]; g.fillRect(x - c * 0.18, y - c * 0.05, c * 0.36, c * 0.1); }
    g.fillStyle = MAD[1];
    for (const y of [-Wd / 2 + c * 0.08, Wd / 2 - c * 0.08]) g.fillRect(-L / 2, y - c * 0.08, L, c * 0.16);
    for (const x of [-L * 0.45, 0, L * 0.4]) g.fillRect(x - c * 0.06, -Wd / 2, c * 0.12, Wd);
    g.strokeStyle = '#2e1f10'; g.lineWidth = Math.max(1, c * 0.025); g.strokeRect(-L / 2, -Wd / 2, L, Wd);
  }
  // a catapulta (virada para x+): a armação, o braço com a concha para trás e a trave de parada
  function catapulta(g, o, c) {
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0); g.lineCap = 'round';
    armacao(g, c * 1.8, c * 1.2, c, true);
    g.strokeStyle = MAD[2]; g.lineWidth = Math.max(1.5, c * 0.12); g.beginPath(); g.moveTo(c * 0.4, -c * 0.6); g.lineTo(c * 0.4, c * 0.6); g.stroke();
    g.strokeStyle = MAD[0]; g.lineWidth = Math.max(1.5, c * 0.13); g.beginPath(); g.moveTo(c * 0.25, 0); g.lineTo(-c * 0.75, 0); g.stroke();
    g.fillStyle = MAD[1]; g.beginPath(); g.ellipse(-c * 0.82, 0, c * 0.2, c * 0.17, 0, 0, TAU); g.fill();
    g.fillStyle = '#6e6a64'; g.beginPath(); g.arc(-c * 0.82, 0, c * 0.11, 0, TAU); g.fill();
    g.strokeStyle = '#3a3a3e'; g.lineWidth = Math.max(1, c * 0.05); g.beginPath(); g.moveTo(c * 0.25, -c * 0.45); g.lineTo(c * 0.25, c * 0.45); g.stroke();
    g.fillStyle = o.c1 || '#8a7a5e'; g.fillRect(-c * 0.15, -c * 0.62, c * 0.3, c * 0.1);
    g.restore();
  }
  // o trabuco (virado para x+): a armação grande, as duas torres, o braço comprido, o contrapeso e a funda
  function trabuco(g, o, c) {
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0); g.lineCap = 'round';
    armacao(g, c * 2.4, c * 1.6, c, true);
    g.fillStyle = MAD[2]; for (const y of [-c * 0.55, c * 0.55]) g.fillRect(-c * 0.3, y - c * 0.12, c * 0.6, c * 0.24);
    g.strokeStyle = MAD[0]; g.lineWidth = Math.max(2, c * 0.15); g.beginPath(); g.moveTo(c * 0.45, 0); g.lineTo(-c * 1.35, 0); g.stroke();
    g.fillStyle = '#4a4a4e'; g.fillRect(c * 0.3, -c * 0.32, c * 0.5, c * 0.64); g.strokeStyle = '#26262a'; g.lineWidth = Math.max(1, c * 0.03); g.strokeRect(c * 0.3, -c * 0.32, c * 0.5, c * 0.64);
    g.strokeStyle = '#8a7650'; g.lineWidth = Math.max(1, c * 0.03); g.beginPath(); g.moveTo(-c * 1.35, 0); g.quadraticCurveTo(-c * 1.5, c * 0.25, -c * 1.2, c * 0.35); g.stroke();
    g.fillStyle = o.c1 || '#8a7a5e'; g.fillRect(-c * 0.25, -c * 0.82, c * 0.5, c * 0.12);
    g.restore();
  }
  // o aríete coberto (virado para x+): o telhado de couro e tábuas, as rodas e a ponta de ferro da tora
  function ariete(g, o, c) {
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    const L = c * 2.4, Wd = c * 1.3;
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.fillRect(-L / 2 + c * 0.14, -Wd / 2 + c * 0.18, L, Wd);
    for (const [x, y] of [[-L * 0.3, -Wd / 2], [L * 0.3, -Wd / 2], [-L * 0.3, Wd / 2], [L * 0.3, Wd / 2]]) { g.fillStyle = '#2e1f10'; g.fillRect(x - c * 0.22, y - c * 0.08, c * 0.44, c * 0.16); }
    // a tora, saindo na frente com a ponta de ferro
    g.fillStyle = MAD[0]; g.fillRect(L / 2 - c * 0.2, -c * 0.13, c * 0.55, c * 0.26);
    g.fillStyle = ACO[2]; g.beginPath(); g.moveTo(L / 2 + c * 0.35, -c * 0.17); g.lineTo(L / 2 + c * 0.55, 0); g.lineTo(L / 2 + c * 0.35, c * 0.17); g.closePath(); g.fill();
    // o telhado: as duas águas (o couro molhado contra o fogo) e a cumeeira
    g.fillStyle = '#6a4e36'; g.fillRect(-L / 2, -Wd / 2, L, Wd / 2);
    g.fillStyle = '#54402c'; g.fillRect(-L / 2, 0, L, Wd / 2);
    g.strokeStyle = 'rgba(30,20,12,0.6)'; g.lineWidth = Math.max(1, c * 0.025);
    for (let k = 1; k < 6; k++) { const x = -L / 2 + L * k / 6; g.beginPath(); g.moveTo(x, -Wd / 2); g.lineTo(x, Wd / 2); g.stroke(); }
    g.fillStyle = o.c1 || '#8a7a5e'; g.fillRect(-L / 2, -c * 0.06, L, c * 0.12);
    g.strokeStyle = '#2e1f10'; g.lineWidth = Math.max(1, c * 0.035); g.strokeRect(-L / 2, -Wd / 2, L, Wd);
    g.restore();
  }
  // a pilha de pedras de atirar
  function municao(g, o, c, rnd) {
    g.save();
    for (let k = 0; k < (o.n || 6); k++) {
      const x = (o.x + (rnd() - 0.5) * 0.7) * c, y = (o.y + (rnd() - 0.5) * 0.5) * c, r = c * (0.12 + rnd() * 0.06);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(x + r * 0.3, y + r * 0.35, r, 0, TAU); g.fill();
      const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); gr.addColorStop(0, '#b4b0a8'); gr.addColorStop(1, '#6e6a64');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    g.restore();
  }
  // a trincheira: a vala escura e, do lado de cá (o contrário de d, o lado do lugar), o monte da terra tirada
  // (lote 14, parte 14c: ds — a direção do lugar em cada ponto, na trincheira em volta dele)
  function trincheira(g, o, c, rnd) {
    const pts = o.pts || [], d0 = o.d || [1, 0], L = (o.larg || 0.85) * c, dd = i => (o.ds && o.ds[i]) || d0;
    if (pts.length < 2) return;
    const linha = (off, w, cor, a) => { g.globalAlpha = a; g.strokeStyle = cor; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => { const d = dd(i), X = (x + d[0] * off) * c, Y = (y + d[1] * off) * c; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke(); };
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    linha(-0.75, c * 0.7, '#8a7254', 0.9);
    linha(-0.78, c * 0.36, '#a08a68', 0.6);
    linha(0, L + c * 0.18, '#3a2c1e', 0.85);
    linha(0, L, '#21180f', 0.95);
    linha(0.05, L * 0.35, '#120d08', 0.6);
    g.globalAlpha = 0.8; g.fillStyle = '#6a5438';
    for (let i = 0; i < pts.length; i += 1) { const [x, y] = pts[i], d = dd(i); g.beginPath(); g.arc((x - d[0] * (0.6 + rnd() * 0.4)) * c, (y - d[1] * (0.6 + rnd() * 0.4)) * c, c * (0.05 + rnd() * 0.06), 0, TAU); g.fill(); }
    g.restore();
  }
  // a casa queimada: o alicerce de pedra, o chão de cinzas, as vigas carbonizadas, o entulho e a chaminé de pé
  function casaQueimada(g, o, c, rnd) {
    const w = (o.w || 3.5) * c, hh = (o.h || 2.6) * c;
    g.save(); g.translate(o.x * c, o.y * c); g.rotate(o.ang || 0);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-w / 2 + c * 0.1, -hh / 2 + c * 0.12, w, hh);
    g.fillStyle = '#2a2622'; g.fillRect(-w / 2, -hh / 2, w, hh);
    g.fillStyle = '#4a4440'; for (let k = 0; k < 14; k++) { g.globalAlpha = 0.5; g.beginPath(); g.ellipse((rnd() - 0.5) * w * 0.9, (rnd() - 0.5) * hh * 0.9, c * (0.15 + rnd() * 0.3), c * (0.1 + rnd() * 0.2), rnd() * 3, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    // o alicerce (com falhas)
    g.strokeStyle = '#6e6a62'; g.lineWidth = c * 0.2; g.setLineDash([c * 0.9, c * 0.25, c * 0.5, c * 0.35]); g.strokeRect(-w / 2, -hh / 2, w, hh); g.setLineDash([]);
    // o canto de parede que ficou de pé
    g.strokeStyle = '#4a4642'; g.lineWidth = c * 0.26; g.lineCap = 'square'; g.beginPath(); g.moveTo(-w / 2, -hh / 2 + hh * 0.45); g.lineTo(-w / 2, -hh / 2); g.lineTo(-w / 2 + w * 0.4, -hh / 2); g.stroke();
    // as vigas carbonizadas
    for (let k = 0; k < 5; k++) { g.save(); g.translate((rnd() - 0.5) * w * 0.7, (rnd() - 0.5) * hh * 0.6); g.rotate(rnd() * Math.PI); g.fillStyle = k % 2 ? '#1a1410' : '#2a1e16'; g.fillRect(-w * 0.28, -c * 0.08, w * 0.56, c * 0.16); g.fillStyle = '#ff7a2a'; g.globalAlpha = 0.25; g.fillRect(w * 0.1, -c * 0.03, w * 0.06, c * 0.06); g.globalAlpha = 1; g.restore(); }
    g.fillStyle = '#7a756c'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc((rnd() - 0.5) * w, (rnd() - 0.5) * hh, c * (0.06 + rnd() * 0.08), 0, TAU); g.fill(); }
    g.restore();
    // a chaminé (de pé: a pedra e a boca preta)
    if (o.ch) {
      const X = o.ch[0] * c, Y = o.ch[1] * c, s = c * 0.42;
      g.save(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X - s + c * 0.15, Y - s + c * 0.2, s * 2, s * 2);
      g.fillStyle = '#7a746a'; g.fillRect(X - s, Y - s, s * 2, s * 2); g.strokeStyle = '#3a3630'; g.lineWidth = Math.max(1, c * 0.03); g.strokeRect(X - s, Y - s, s * 2, s * 2);
      g.fillStyle = '#141110'; g.fillRect(X - s * 0.5, Y - s * 0.5, s, s);
      g.restore();
    }
  }
  // os veios da terra corrompida: as rachaduras que brilham em roxo
  function veios(g, o, c) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [w, cor, a] of [[0.34, '#a45ae6', 0.22], [0.14, '#c890ff', 0.6], [0.05, '#f0dcff', 0.95]]) {
      g.globalAlpha = a; g.strokeStyle = cor; g.lineWidth = Math.max(1, c * w);
      for (const l of o.linhas || []) { g.beginPath(); l.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); g.stroke(); }
    }
    g.restore();
  }
  // a terra arrasada (o hexágono destruído: a cinza; o corrompido: a terra roxa), de beira macia, por cima do chão
  // (numa tela à parte, para o caminho continuar à mostra: ele é tirado da mancha antes dela ir para o fundo)
  function arrasado(g, o, c, rnd, p) {
    const pts = o.pts || [];
    if (pts.length < 3) return;
    const [x0, y0, x1, y1] = caixa(pts), m = 1.5, ox = Math.floor((x0 - m) * c), oy = Math.floor((y0 - m) * c);
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil((x1 + m) * c) - ox); cv.height = Math.max(1, Math.ceil((y1 + m) * c) - oy);
    const og = cv.getContext('2d');
    og.translate(-ox, -oy);
    if (o.t === 'c') Paisagem.mancha(og, pts, c, rnd, ['#3b2a46', '#2a1f33', '#4c3758', '#24192c'], { a: 0.66, pedrisco: ['#7a4aa0', '#1a1020'] });
    else {
      Paisagem.mancha(og, pts, c, rnd, ['#3d3833', '#2c2825', '#4c463f', '#5c564e'], { a: 0.68, pedrisco: ['#8a8580', '#1e1b18', '#5e5852'] });
      // os riscos de carvão (o que queimou no chão)
      og.save(); og.beginPath(); pts.forEach(([x, y], i) => (i ? og.lineTo(x * c, y * c) : og.moveTo(x * c, y * c))); og.closePath(); og.clip();
      og.globalAlpha = 0.55; og.strokeStyle = '#15110e'; og.lineCap = 'round'; og.lineWidth = Math.max(1, c * 0.07);
      for (let k = 0, n = Math.round((x1 - x0) * (y1 - y0) * 0.35); k < n; k++) { const x = (x0 + rnd() * (x1 - x0)) * c, y = (y0 + rnd() * (y1 - y0)) * c, a = rnd() * TAU, l = c * (0.2 + rnd() * 0.35); og.beginPath(); og.moveTo(x, y); og.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); og.stroke(); }
      og.restore();
    }
    og.globalCompositeOperation = 'destination-out'; og.globalAlpha = 1; og.strokeStyle = '#000'; og.lineCap = 'round'; og.lineJoin = 'round';
    for (const cm of (p && p.caminhos) || []) { og.lineWidth = (cm.hw * 2 + 0.25) * c; og.beginPath(); cm.pts.forEach(([x, y], i) => (i ? og.lineTo(x * c, y * c) : og.moveTo(x * c, y * c))); og.stroke(); }
    g.drawImage(cv, ox, oy);
  }
  // a fuligem no telhado da construção que pegou fogo
  function fuligem(g, o, c, rnd) {
    const pts = o.pts || [];
    if (pts.length < 3) return;
    g.save(); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); g.closePath(); g.clip();
    g.globalAlpha = 0.5; g.fillStyle = '#1a1512'; g.fill();
    const [x0, y0, x1, y1] = caixa(pts);
    g.globalAlpha = 0.45; g.fillStyle = '#0e0b09';
    for (let k = 0, n = Math.round((x1 - x0) * (y1 - y0) * 0.8); k < n; k++) { g.beginPath(); g.ellipse((x0 + rnd() * (x1 - x0)) * c, (y0 + rnd() * (y1 - y0)) * c, c * (0.2 + rnd() * 0.4), c * (0.12 + rnd() * 0.2), rnd() * 3, 0, TAU); g.fill(); }
    g.restore();
  }
  Object.assign(MO.PINTORES, { arrasado, fuligem, caidos, armasCaidas, flechas, cavaloCaido, buracoGuerra, estandarte, estandarteCaido, covas, corvos, chamusco, tendaGuerra, pavilhao, catapulta, trabuco, ariete, municao, trincheira, casaQueimada, veios });

  return { FRESCA, itens, padrao, valida, escolha, comHistoria, tendasDe, noLugar, texto, campo };
})();
