/* ---------------------------------------------------------------
   10f5. PORTO — a vila de pescadores e o porto grande, à beira-mar (lote 7, parte 4b)
   Uma aba da janela "Gerar um lugar…", feita com o motor dos encontros (Encontro.motor). O mar fica num lado do mapa.
   A VILA DE PESCADORES: a beira ondulada, a praia (de seixos na neve) e a espuma; os píeres de tábuas entrando no mar
   (o do meio com a cabeça em T, ou comprido, com o barco de pesca grande atracado); a ponta de pedras com o farol; os
   barcos pequenos amarrados, soltos na água e puxados para a areia; a trilha da beira, as casas de frente para o mar
   (e, nas maiores, mais fileiras atrás de outras trilhas), a taverna, o armazém do peixe, a capela e a loja; o mercado
   do peixe na areia (as barracas, as redes estendidas, os secadores). O PORTO GRANDE: o cais de pedra com os cabeços;
   os molhes de pedra; os navios grandes atracados ao longo do cais ou ao lado dos molhes; o quebra-mar com o farol na
   ponta; a fileira dos armazéns, das tavernas, da loja e das casas de frente para o cais, e outras atrás das ruas, com
   o templo e o quartel da guarda; os lampiões do cais; os guindastes, a carga, os barris e os caixotes.
   Cada navio grande é um lugar (10f3): o convés com a amurada (mureta: deixa ver, não deixa passar), a prancha até o
   cais ou o píer e a escotilha com a Entrada (dois cliques geram o porão e as cabines). Os barcos pequenos são desenho.
   Os prédios são fechados, cada um com a Entrada na porta (o interior: 10g).
   O traçado (o mar, a beira, as ruas, os píeres, os molhes, os lugares dos navios e os prédios) tem o sorteio dele e não
   depende das chaves: ligar ou desligar os navios, o farol ou o mercado só põe ou tira essas coisas. Os barcos pequenos,
   o mercado e as árvores têm cada um o seu sorteio.
   --------------------------------------------------------------- */
const Porto = (() => {
  const TAU = Math.PI * 2, MO = Encontro.motor;
  const TIPOS = [['vila', 'Vila de pescadores'], ['porto', 'Porto grande']];
  const TAMANHOS = {
    pequeno: { n: 'Pequeno', vila: { W: 40, H: 32, casas: 6 }, porto: { W: 54, H: 42, casas: 9, navios: 1 } },
    medio: { n: 'Médio', vila: { W: 46, H: 36, casas: 9 }, porto: { W: 62, H: 48, casas: 13, navios: 2 } },
    grande: { n: 'Grande', vila: { W: 52, H: 40, casas: 12 }, porto: { W: 70, H: 54, casas: 18, navios: 3 } },
  };
  // os terrenos (os nomes são os da Vila e da Cidade: o deserto é 'areia'), a paleta do chão e o terreno dos encontros
  // (as árvores e os enfeites)
  const TERRENOS_P = [['campo', 'Campo'], ['floresta', 'Floresta'], ['areia', 'Deserto'], ['neve', 'Neve']];
  const PAL_DE = { campo: 'campo', floresta: 'floresta', areia: 'areia', neve: 'neve' }, TER_DE = { campo: 'campo', floresta: 'floresta', areia: 'deserto', neve: 'neve' };
  const DIR = { s: [0, 1], n: [0, -1], o: [-1, 0], l: [1, 0] };
  const NOME = { vila: 'Vila de pescadores', porto: 'Porto' };
  // os prédios: as medidas possíveis (a frente × o fundo, em quadrados) e os especiais de cada lugar — os que ficam de
  // frente para o mar (na primeira fileira) e os de dentro; os outros são casas
  const MEDIDAS = {
    vila: { casa: [[4, 3], [4, 4], [5, 4], [3, 4]], armazem: [[6, 4], [6, 5]], taverna: [[5, 5], [6, 4]], loja: [[4, 4], [5, 4]], templo: [[5, 5], [4, 5]] },
    porto: { casa: [[4, 4], [5, 4], [4, 5], [5, 5]], armazem: [[7, 5], [8, 5], [6, 6]], taverna: [[6, 5], [7, 5]], loja: [[5, 4], [4, 4]], templo: [[6, 6], [5, 6]], quartel: [[7, 5], [8, 5]] },
  };
  const FUNDO_MAX = { vila: 5, porto: 6 };
  const ESPECIAIS = {
    vila: { frente: ['taverna', 'armazem'], dentro: ['templo', 'loja'] },
    pequeno: { frente: ['armazem', 'taverna', 'armazem', 'loja'], dentro: ['templo'] },
    medio: { frente: ['armazem', 'taverna', 'armazem', 'loja', 'armazem'], dentro: ['templo', 'taverna', 'quartel'] },
    grande: { frente: ['armazem', 'taverna', 'armazem', 'loja', 'armazem', 'armazem'], dentro: ['templo', 'taverna', 'quartel', 'loja'] },
  };
  // a praia de seixos (na neve) e a ponta de pedras da vila
  const SEIXOS = ['#9aa0a6', '#8a9096', '#b0b5ba', '#7a8088', '#c4c9cd'];
  const PONTA = ['#8d887e', '#7a756c', '#9a958b', '#6e6a62'];

  /* ================= o plano (conta pura) ================= */
  // a trava: só a semente do traçado; ela vale enquanto o lugar e o tamanho forem os mesmos (as chaves não mexem nele)
  function limparTrava(t, o) {
    if (!t || typeof t !== 'object' || t.tipo !== o.tipo || t.tamanho !== o.tamanho) return null;
    const s = Math.round(Number(t.s));
    return Number.isFinite(s) && s >= 1 && s <= 2147483647 ? { s } : null;
  }

  function gerar(o) {
    o = o || {};
    const tipo = o.tipo === 'porto' ? 'porto' : 'vila', porto = tipo === 'porto';
    const tamanho = TAMANHOS[o.tamanho] ? o.tamanho : 'medio', T = TAMANHOS[tamanho][tipo], W = T.W, H = T.H;
    const terreno = TERRENOS_P.some(t => t[0] === o.terreno) ? o.terreno : o.terreno === 'deserto' ? 'areia' : 'campo', pal = PAL_DE[terreno];
    const estilo = Estilos.valido(o.estilo), seed = (Math.round(Number(o.seed)) >>> 0) || 1;
    const com = { navios: o.navios !== false, farol: o.farol !== false, mercado: o.mercado !== false };
    const trava = limparTrava(o.trava, { tipo, tamanho });
    const sT = trava ? trava.s : (MO.sub(seed, 1) % 2147483000) + 1;
    const K = MO.contexto(W, H, TER_DE[terreno], 'porto', estilo, porto ? 'estrada' : 'trilha', sT, pal), P = K.P, { r, ri } = K;
    // os sorteios do resto, cada um no seu: as árvores e os enfeites, os barcos pequenos, o mercado
    const sorteio = k => mulberry((MO.sub(seed, k) % 2147483000) + 1), rV = sorteio(2), rB = sorteio(3), rM = sorteio(4);
    const ent = (g, a, b) => a + g() * (b - a);
    P.paredes = [];

    /* ---- o mar: o lado (u aponta para ele), a beira (sa = 0) e a medida ao longo dela (sv) ---- */
    // (lote 14, parte 14c: o lado do mar pode vir do hexágono do Mapa-múndi — o sorteio corre do mesmo jeito)
    const lado0 = K.pick(['s', 'n', 'o', 'l']), ladoM = DIR[o.ladoMar] ? o.ladoMar : lado0, [ux, uy] = DIR[ladoM], vx = -uy, vy = ux, deitado = !ux;
    const Du = deitado ? H : W, Dv = deitado ? W : H;
    const fundo = Math.round(Du * (porto ? 0.36 : deitado ? 0.4 : 0.34)), terra = Du - fundo;
    const B0 = [W / 2 + ux * (Du / 2 - fundo), H / 2 + uy * (Du / 2 - fundo)];
    const pt = (sv, sa) => [B0[0] + vx * sv + ux * sa, B0[1] + vy * sv + uy * sa];
    const saDe = (x, y) => (x - B0[0]) * ux + (y - B0[1]) * uy;
    // a caixa (em quadrados da cena) entre v0..v1 ao longo da beira e a0..a1 na direção do mar
    const caixa = (v0, v1, a0, a1) => { const p = pt(v0, a0), q = pt(v1, a1); return { x: Math.round(Math.min(p[0], q[0])), y: Math.round(Math.min(p[1], q[1])), w: Math.round(Math.abs(q[0] - p[0])), h: Math.round(Math.abs(q[1] - p[1])) }; };
    const poliDe = q => [[q.x, q.y], [q.x + q.w, q.y], [q.x + q.w, q.y + q.h], [q.x, q.y + q.h]];
    // (a beira passa das bordas do mapa: o desenho do raso só aparece junto dela; lote 14, parte 14c — com os arredores,
    // ela vai até a borda da cena: alem)
    const F = Math.max(7, Number(o.alem) || 0), Lv = Dv / 2 + F;
    // a ponta do farol (o quebra-mar no porto, a ponta de pedras na vila) fica num dos lados; os píeres não chegam lá
    const ladoF = r() < 0.5 ? -1 : 1, reserva = 8;
    const vMin = -Dv / 2 + (ladoF < 0 ? reserva : 2), vMax = Dv / 2 - (ladoF > 0 ? reserva : 2);
    const fase = r(0, TAU), fase2 = r(0, TAU), onda = r(0.6, 1);
    const costa = porto ? () => 0 : sv => Math.sin(sv * 0.21 + fase) * onda + Math.sin(sv * 0.07 + fase2) * 0.7;
    const beira = [];
    for (let sv = -Lv; sv <= Lv + 0.01; sv += 1) beira.push(pt(sv, costa(sv)));
    K.poeLago(beira.concat([pt(Lv, fundo + F), pt(-Lv, fundo + F)]), 'mar', -2);
    P.mar = { lado: ladoM, fundo };

    /* ---- a beira de terra: o cais de pedra (porto) ou a praia (vila) ---- */
    if (porto) {
      const pts = [pt(-Lv, -6), pt(Lv, -6), pt(Lv, 0), pt(-Lv, 0)];
      K.marcaPoli(pts, 5, true);
      K.pinta(1, 'caisPorto', { pts, a: pt(-Lv, 0), b: pt(Lv, 0), ux, uy });
      P.tracado.push({ k: 'poli', pts });
    } else {
      const areia = [];
      for (let sv = -Lv; sv <= Lv + 0.01; sv += 1) areia.push(pt(sv, costa(sv) + 0.6));
      for (let sv = Lv; sv >= -Lv - 0.01; sv -= 1) areia.push(pt(sv, costa(sv) - 2.4 - (1 + Math.sin(sv * 0.33 + fase2)) * 0.5));
      if (terreno === 'neve') K.mancha(areia, SEIXOS, { pedrisco: ['#f4f8fb', '#5d646c'] }); else K.pinta(0, 'praia', { pts: areia });
      K.marcaPoli(areia, 5);
    }
    K.pinta(1, 'espuma', { pts: porto ? beira.map(([x, y]) => [x + ux * 0.3, y + uy * 0.3]) : beira });

    /* ---- as ruas e as fileiras de prédios ---- */
    // a primeira fileira, de frente para o mar (do outro lado da trilha da beira, ou do cais); as outras, cada uma atrás
    // de uma rua, enquanto couber
    const hwR = porto ? 1.35 : 0.75, fMax = FUNDO_MAX[tipo];
    const filas = [{ frente: -7, rua: porto ? null : -5.4 }];
    for (;;) {
      const atras = filas[filas.length - 1].frente - fMax, rua = atras - 0.65 - hwR, frente = Math.floor(rua - hwR - 0.25);
      if (frente - fMax < -terra + 1.5) break;
      filas.push({ frente, rua });
    }
    const ultima = filas.length > 1 ? filas[filas.length - 1].rua : null;
    if (!porto) K.poeCaminho([pt(-Lv, -5.4), pt(Lv, -5.4)]);
    // (as ruas de trás: com os arredores, acabam na beira do lugar — só a da praia e o cais seguem pela costa)
    const Li = o.alem ? Dv / 2 - 0.5 : Lv;
    for (const f of filas.slice(1)) K.poeCaminho([pt(-Li, f.rua), pt(Li, f.rua)]);
    // as travessas, da beira até a última rua; uma delas segue até a borda do mapa (a estrada que sai do lugar)
    const nT = Math.max(1, Math.round(Dv / (porto ? 22 : 24))), travessas = [];
    for (let i = 0; i < nT; i++) travessas.push(Math.round(-Dv / 2 + (i + 0.5 + r(-0.15, 0.15)) * Dv / nT));
    const saida = Math.floor(r(0, nT)) % nT;
    travessas.forEach((sv, i) => { if (i === saida || ultima != null) K.poeCaminho([pt(sv, porto ? -6 : -5.4), pt(sv, i === saida ? -terra - 1 : ultima)]); });

    /* ---- os píeres (vila: de tábuas) e os molhes (porto: de pedra), com os lugares dos navios ---- */
    // (os lugares dos navios saem sempre do mesmo jeito; os navios só atracam neles quando a chave pede)
    const pieres = [], vagas = [];
    const molhe = (sv, Lp) => pieres.push({ k: 'molhe', sv, Lp });
    if (porto && deitado) {
      // a beira deitada: os navios ao longo do cais, um atrás do outro, com um molhe entre eles e nas pontas
      const n = T.navios, B = 6, L = Math.min(ri(18, 22), Math.floor((vMax - vMin - 2 - (n - 1) * 5) / n));
      let s = Math.round(vMin + 1 + (vMax - vMin - 2 - (n * L + (n - 1) * 5)) / 2);
      if (s - 4 >= vMin) molhe(s - 2.5, ri(6, 9));
      for (let i = 0; i < n; i++) {
        vagas.push({ v0: s, v1: s + L, a0: 1, a1: 1 + B, proa: r() < 0.5 ? 'l' : 'o', alvo: pt(s + L / 2, -1) });
        s += L;
        if (i < n - 1) { molhe(s + 2.5, ri(7, 10)); s += 5; }
      }
      if (vMax - s >= 4) molhe(s + 2.5, ri(6, 9));
    } else if (porto) {
      // a beira em pé: os molhes saem na horizontal, cada navio ao lado do seu, com a proa para o mar; mais um molhe,
      // menor, para os barcos (do lado oposto ao do farol)
      const n = T.navios, B = 6, Lp = Math.round(fundo * 0.7), L = clamp(Lp - 1, 12, 20);
      let s = Math.round(vMin + (vMax - vMin - (13 * n + 2)) / 2);
      if (ladoF > 0) { molhe(s + 1.5, Math.round(Lp * 0.7)); s += 5; }
      for (let i = 0; i < n; i++) {
        molhe(s + 1.5, Lp);
        vagas.push({ v0: s + 4, v1: s + 4 + B, a0: 1, a1: 1 + L, proa: ladoM, alvo: pt(s + 1.5, L / 2) });
        s += 13;
      }
      if (ladoF < 0) molhe(s + 0.5, Math.round(Lp * 0.7));
    } else {
      // a vila: o píer do meio na enseada (onde a beira recua), com o barco de pesca grande; os outros, de tábuas, dos
      // dois lados, longe do barco: com a beira deitada, o barco fica na cabeça em T (os vizinhos a oito quadrados ou
      // mais); em pé, ao lado do píer (do lado do barco, a nove ou mais; do outro, a cinco)
      const nP = tamanho === 'grande' ? 4 : 3, meio0 = Math.round((vMin + vMax) / 2 + r(-2, 2)), ladoB = r() < 0.5 ? -1 : 1;
      let c = meio0;
      for (let d = -3; d <= 3; d++) if (costa(meio0 + d) < costa(c)) c = meio0 + d;
      pieres.push({ k: 'tabuas', sv: c, Lp: ri(5, 7), principal: true });
      const lado0 = r() < 0.5 ? -1 : 1, dist = s => (deitado ? 8 : s === ladoB ? 9 : 5), ultimo = { '-1': c, 1: c };
      for (let k = 1; k <= 3; k++) for (const s of [lado0, -lado0]) {
        const sv = ultimo[s] + s * ((k === 1 ? dist(s) : Math.max(7, dist(s))) + ri(0, 1));
        if (pieres.length < nP && sv >= vMin + 1 && sv <= vMax - 1) { pieres.push({ k: 'tabuas', sv, Lp: ri(5, 7) }); ultimo[s] = sv; }
      }
      const q = pieres[0], c0 = costa(q.sv);
      if (deitado) {
        // a cabeça em T na ponta, e o barco atracado nela, do lado do mar
        q.Lp = clamp(Math.floor(fundo - 8.5 - c0), 3, 6); q.cabeca = 3;
        const L = 12, B = 5, a0 = Math.ceil(c0 + q.Lp + 2);
        vagas.push({ v0: q.sv - L / 2, v1: q.sv + L / 2, a0, a1: a0 + B, proa: r() < 0.5 ? 'l' : 'o', alvo: pt(q.sv, c0 + q.Lp) });
      } else {
        // o píer comprido, e o barco atracado ao lado dele, com a proa para o mar
        const L = clamp(Math.round(fundo - 3.5), 10, 13), B = 5;
        const v0 = ladoB > 0 ? q.sv + 2 : q.sv - 2 - B, v1 = v0 + B;
        let cmax = -9; for (let s = v0; s <= v1 + 0.01; s += 0.5) cmax = Math.max(cmax, costa(s));
        const a0 = Math.ceil(cmax + 1.2), a1 = Math.min(a0 + L, fundo);
        q.Lp = Math.max(q.Lp, Math.min(Math.round(a1 - c0 - 1), fundo - 2));
        vagas.push({ v0, v1, a0, a1, proa: ladoM, alvo: pt(q.sv, (a0 + a1) / 2) });
      }
    }
    for (const q of pieres) {
      if (q.k === 'molhe') {
        const m = caixa(q.sv - 1.5, q.sv + 1.5, 0, q.Lp);
        q.rr = m;
        K.pinta(1, 'molhe', m);
        K.marcaPoli(poliDe(m), 1, true);
        P.relevo.push({ t: 'plataforma', alt: 0.5, k: 'rect', x: m.x, y: m.y, w: m.w, h: m.h });
        P.tracado.push({ k: 'poli', pts: poliDe(m) });
      } else {
        const c0 = costa(q.sv);
        K.poePassarela([pt(q.sv, c0 - 1.5), pt(q.sv, c0 + q.Lp)], 2, 0.5);
        if (q.cabeca) K.poePassarela([pt(q.sv - q.cabeca, c0 + q.Lp), pt(q.sv + q.cabeca, c0 + q.Lp)], 2, 0.5);
      }
    }

    /* ---- a ponta do farol: o quebra-mar (porto) ou a ponta de pedras (vila); o farol, quando a chave pede ---- */
    const sv0 = ladoF * (Dv / 2 - (porto ? 2.5 : 3.5));
    let farol;
    if (porto) {
      const linha = MO.curva([pt(sv0, -1), pt(sv0, fundo * 0.45), pt(sv0 - ladoF * 3, fundo * 0.72)]);
      K.pinta(1, 'quebraMar', { pts: linha, larg: 2.6 });
      K.marcaLinha(linha, 1.3, 1, true);
      P.relevo.push({ t: 'plataforma', alt: 1, k: 'free', pts: linha.filter((_, i) => i % 2 === 0 || i === linha.length - 1), sw: 2.6 });
      P.tracado.push({ k: 'linha', pts: linha, hw: 1.3 });
      const fim = linha[linha.length - 1];
      farol = { x: fim[0], y: fim[1], r: 1.5 };
    } else {
      const c0 = pt(sv0, costa(sv0) + 1.2);
      K.mancha(MO.blob(K.rT, c0[0], c0[1], 3.1, 2.9, 12, 0.2), PONTA, { pedrisco: ['#d8d4cc', '#55524b'] });
      K.marcaCirc(c0[0], c0[1], 1.6, 5, true);
      for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + r(-0.2, 0.2), d = r(1.9, 2.5); K.pedraGrande(c0[0] + Math.cos(a) * d, c0[1] + Math.sin(a) * d, r(0.6, 0.95), Paisagem.pedraDe(terreno === 'neve' ? 'neve' : 'mar')); }
      farol = { x: c0[0], y: c0[1], r: 1.3 };
    }
    P.tracado.push({ k: 'circ', x: farol.x, y: farol.y, r: farol.r + 1 });
    if (com.farol) {
      K.marcaCirc(farol.x, farol.y, farol.r + 0.2, 3, true);
      K.pinta(3, 'farol', farol);
      P.relevo.push({ t: 'plataforma', alt: 10, k: 'ell', x: farol.x - farol.r, y: farol.y - farol.r, w: farol.r * 2, h: farol.r * 2 });
      K.visaoPoli(MO.elipse(farol.x, farol.y, farol.r * 0.95, farol.r * 0.95, 10));
      K.luz(farol.x, farol.y, 14, '#ffe6a0', 6);
      P.cobertura.push({ x: farol.x, y: farol.y, r: farol.r });
    }
    P.farol = com.farol ? farol : null;

    /* ---- os prédios: fileira por fileira, de frente para a rua (a porta do lado do mar) ---- */
    const esp = porto ? ESPECIAIS[tamanho] : ESPECIAIS.vila, listaF = esp.frente.slice(), listaD = esp.dentro.slice(), MED = MEDIDAS[tipo];
    const cabe = q => {
      if (q.x < 1 || q.y < 1 || q.x + q.w > W - 1 || q.y + q.h > H - 1) return false;
      for (let j = q.y - 1; j <= q.y + q.h; j++) for (let i = q.x - 1; i <= q.x + q.w; i++) {
        const v = K.at(i, j), dentro = i >= q.x && i < q.x + q.w && j >= q.y && j < q.y + q.h;
        if (dentro ? v !== 0 : v === 3 || v === 2 || v === 9) return false;
      }
      return true;
    };
    filas.forEach((f, n) => {
      let sv = Math.round(-Dv / 2 + 1 + r(0, 2));
      while (sv < Dv / 2 - 3 && P.predios.length < T.casas) {
        const lista = n === 0 ? (listaF.length || filas.length > 1 ? listaF : listaD) : (listaD.length ? listaD : listaF);
        const resta = T.casas - P.predios.length, especial = lista.length > 0 && (r() < (porto ? 0.55 : 0.35) || resta <= listaF.length + listaD.length);
        const tp = especial ? lista[0] : 'casa', ops = MED[tp], [frente, fundoK] = ops[Math.floor(r(0, ops.length)) % ops.length];
        const recuo = !porto && r() < 0.35 ? 1 : 0, q = caixa(sv, sv + frente, f.frente - recuo - fundoK, f.frente - recuo);
        if (cabe(q)) {
          if (especial) lista.shift();
          K.predio({ tipo: tp, x: q.x, y: q.y, w: q.w, h: q.h, lado: ladoM, aberto: false, interior: tp });
          sv += frente + (porto ? ri(1, 2) : ri(1, 3));
        } else sv += 1;
      }
    });

    /* ---- os navios grandes, nos lugares deles, com a prancha até a terra ---- */
    // a prancha vai da abertura do meio da amurada (do lado do cais, do molhe ou do píer) até onde a água acaba
    const aberturaX = (q, proa) => { const uAb = Math.round(q.w * 0.44); return proa === 'o' ? q.x + q.w - uAb : q.x + uAb; };
    const prancha = (q, vg) => {
      const ax = aberturaX(q, vg.proa), dir = vg.alvo[1] < q.y + q.h / 2 ? -1 : 1, y0 = dir < 0 ? q.y : q.y + q.h;
      const agua = y => { const j = Math.floor(y + dir * 0.5); return K.at(Math.floor(ax), j) === 2 || K.at(Math.floor(ax) - 1, j) === 2; };
      let y1 = y0;
      for (let k = 0; k < 5 && agua(y1); k++) y1 += dir;
      return { ax, y0, y1, dir, ok: Math.abs(y1 - y0) >= 0.9 && Math.abs(y1 - y0) <= 4 };
    };
    const pranchas = [];
    for (const vg of vagas) {
      const q = caixa(vg.v0, vg.v1, vg.a0, vg.a1);
      vg.caixa = q; vg.pr = prancha(q, vg);
      if (!com.navios || q.x < 0 || q.y < 0 || q.x + q.w > W || q.y + q.h > H) continue;
      let livre = true;
      for (let j = q.y; j < q.y + q.h && livre; j++) for (let i = q.x; i < q.x + q.w; i++) if (K.at(i, j) !== 2) { livre = false; break; }
      if (!livre) continue;
      const n = K.navio({ L: q.w, B: q.h, x: q.x, y: q.y, proa: vg.proa === 'o' ? 'o' : 'l', seed: (MO.sub(sT, 40 + P.navios.length) % 2147483000) + 1 });
      // o convés: uma plataforma sem altura por cima do mar (debaixo dos castelos, que vêm depois)
      P.relevo.splice(P.relevo.length - n.relevo.length, 0, { t: 'plataforma', alt: 0, k: 'poly', pts: n.casco });
      const pr = vg.pr;
      if (!pr.ok) continue;
      const fim = pr.y1 + pr.dir * 0.6;
      K.marcaLinha([[pr.ax, pr.y0], [pr.ax, fim]], 0.55, 1, true);
      K.pinta(3, 'prancha', { x1: pr.ax, y1: pr.y0 - pr.dir * 0.3, x2: pr.ax, y2: fim });
      P.relevo.push({ t: 'plataforma', alt: 0, k: 'free', pts: [[pr.ax, pr.y0], [pr.ax, fim]], sw: 0.7 });
      pranchas.push({ x: pr.ax, y1: pr.y0, y2: fim });
    }
    // os lampiões do cais (porto)
    if (porto) for (let i = 0, n = Math.max(3, Math.round(Dv / 9)); i < n; i++) { const [x, y] = pt(-Dv / 2 + (i + 0.5) * Dv / n, -5.2); K.objeto('lampiao', Math.floor(x), Math.floor(y), 0, v => v === 5); }

    /* ---- o resto: os barcos pequenos, o gelo, o mercado, as árvores ---- */
    // (os barcos e o gelo não caem nos lugares dos navios, com ou sem navio: ligar os navios não muda os barcos)
    const nasVagas = (x, y, m) => vagas.some(vg => vg.caixa && x > vg.caixa.x - m && x < vg.caixa.x + vg.caixa.w + m && y > vg.caixa.y - m && y < vg.caixa.y + vg.caixa.h + m);
    const naAgua = v => v === 2;
    const poeBarco = (x, y, ang, L) => {
      const ca = Math.cos(ang), sn = Math.sin(ang);
      for (const t of [-0.42, 0, 0.42]) { const bx = x + ca * L * t, by = y + sn * L * t; if (nasVagas(bx, by, 1) || !K.livreCirc(bx, by, 0.75, naAgua)) return false; }
      K.pinta(2, 'barco', { x, y, ang, L });
      for (const t of [-0.3, 0.3]) K.marcaCirc(x + ca * L * t, y + sn * L * t, 0.55, 4, true);
      return true;
    };
    for (const q of pieres) {
      if (rB() < 0.3) continue;
      const lado = rB() < 0.5 ? -1 : 1, L = ent(rB, 2.6, 3.3), c0 = q.k === 'molhe' ? 0 : costa(q.sv);
      const [x, y] = pt(q.sv + lado * (q.k === 'molhe' ? 2.6 : 2.1), c0 + ent(rB, 2.2, Math.max(2.4, q.Lp - 1.6)));
      poeBarco(x, y, Math.atan2(uy, ux) + ent(rB, -0.15, 0.15), L);
    }
    for (let i = 0, n = porto ? 3 : 2; i < 50 && n > 0; i++) { const [x, y] = pt(ent(rB, -Dv / 2 + 3, Dv / 2 - 3), ent(rB, 3, fundo - 2)); if (poeBarco(x, y, rB() * TAU, ent(rB, 2.6, 3.4))) n--; }
    if (!porto) for (let i = 0, n = 3; i < 50 && n > 0; i++) {
      const sv = ent(rB, -Dv / 2 + 3, Dv / 2 - 3), [x, y] = pt(sv, costa(sv) - 1.1);
      // (longe do píer do meio: ali ficam as barracas do peixe)
      if (Math.abs(sv - pieres[0].sv) < 7 || !K.livreCirc(x, y, 1, v => v === 5)) continue;
      K.pinta(2, 'barco', { x, y, ang: Math.atan2(uy, ux) + ent(rB, -0.5, 0.5), L: ent(rB, 2.6, 3.2) });
      K.marcaCirc(x, y, 0.9, 4, true); n--;
    }
    if (terreno === 'neve') for (let i = 0, n = 9; i < 60 && n > 0; i++) {
      const [x, y] = pt(ent(rB, -Dv / 2, Dv / 2), ent(rB, 2.5, fundo + 1)), rr = ent(rB, 0.5, 1.3);
      if (nasVagas(x, y, 1.5) || !K.livreCirc(x, y, rr, naAgua)) continue;
      K.pinta(1, 'gelo', { pts: MO.blob(rB, x, y, rr, rr * ent(rB, 0.6, 0.9), 7, 0.45, rB() * TAU) }); n--;
    }
    // o mercado: no porto, um guindaste junto de cada lugar de navio, a carga, os barris e os caixotes no cais; na vila,
    // as barracas do peixe junto do píer do meio, as redes, os secadores e os barris na areia
    if (com.mercado) {
      const noChao = v => v === 5, noCaisOuMolhe = v => v === 5 || v === 1;
      const lugarNaFaixa = (a0, a1, rr, ok) => { for (let t = 0; t < 200; t++) { const sv = ent(rM, -Dv / 2 + 2, Dv / 2 - 2), [x, y] = pt(sv, ent(rM, a0, a1) + costa(sv)); if (K.livreCirc(x, y, rr, ok)) return [x, y]; } return null; };
      if (porto) {
        for (const vg of vagas) {
          const q = vg.caixa, pr = vg.pr, ys = pr.y1 + pr.dir * 1.4;
          for (const dx of rM() < 0.5 ? [-2.6, 2.6] : [2.6, -2.6]) {
            const x = pr.ax + dx;
            if (!K.livreCirc(x, ys, 0.8, noCaisOuMolhe)) continue;
            K.pinta(3, 'guindaste', { x, y: ys, ang: Math.atan2(q.y + q.h / 2 - ys, pr.ax - x) });
            K.marcaCirc(x, ys, 0.75, 3, true); break;
          }
        }
        for (let i = 0, n = tamanho === 'grande' ? 5 : tamanho === 'medio' ? 4 : 3; i < n; i++) { const c = lugarNaFaixa(-4.6, -1.2, 0.95, noChao); if (c) { K.pinta(2, 'carga', { x: c[0], y: c[1], ang: Math.floor(rM() * 4) * Math.PI / 2, v: Math.floor(rM() * 3) }); K.marcaCirc(c[0], c[1], 0.9, 4, true); } }
        for (let i = 0, n = tamanho === 'grande' ? 9 : 6; i < n; i++) { const c = lugarNaFaixa(-4.6, -0.8, 0.5, noChao); if (c) K.objeto(rM() < 0.5 ? 'barril' : 'caixote', Math.floor(c[0]), Math.floor(c[1]), Math.floor(rM() * 4) * 90, noChao); }
      } else {
        const q = pieres.find(p2 => p2.principal) || pieres[0], c0 = costa(q.sv);
        let nb = 0;
        for (const d of [-2.6, 2.6, -5, 5]) { const [x, y] = pt(q.sv + d, c0 - 1.7); if (nb < 3 && K.livreCirc(x, y, 0.75, noChao)) { nb++; K.pinta(2, 'barracaPeixe', { x, y, ang: Math.atan2(ux, -uy), cor: Math.floor(rM() * 3) }); K.marcaCirc(x, y, 0.75, 4, true); } }
        for (let i = 0; i < 3; i++) { const c = lugarNaFaixa(-2.5, -0.9, 1.05, noChao); if (c) { K.pinta(2, 'redes', { x: c[0], y: c[1], ang: Math.atan2(vy, vx) }); K.marcaCirc(c[0], c[1], 1, 4, true); } }
        for (let i = 0; i < 2; i++) { const c = lugarNaFaixa(-2.5, -0.9, 0.9, noChao); if (c) { K.pinta(2, 'peixes', { x: c[0], y: c[1], ang: Math.atan2(vy, vx) }); K.marcaCirc(c[0], c[1], 0.85, 4, true); } }
        for (let i = 0; i < 4; i++) { const c = lugarNaFaixa(-2.4, -0.8, 0.5, noChao); if (c) K.objeto(rM() < 0.5 ? 'barril' : 'caixote', Math.floor(c[0]), Math.floor(c[1]), Math.floor(rM() * 4) * 90, noChao); }
      }
    }
    // as árvores: poucas no meio das casas, mais para dentro; no deserto, as palmeiras
    const fimDasCasas = filas[filas.length - 1].frente - fMax;
    P.dens = (x, y) => (saDe(x, y) > fimDasCasas - 1.5 ? 0.25 : 1);
    if (terreno === 'areia') { P.esp = 'palmeira'; P.densBase = 0.03; }
    MO.vegetacao(K, rV);
    MO.enfeites(K, rV);
    P.marcas = {};
    K.foco(...pt(0, -3));
    delete P.dens; delete P.esp;
    Estacoes.noPlano(K, o.estacao);                                  // (lote 13, parte 13c) a estação: no inverno, a água parada congela
    return Object.assign(P, { v: 1, lugar: 'porto', tipo, seed, sT, tamanho, com, ladoMar: ladoM, pieres: pieres.map(q => ({ k: q.k, sv: q.sv, Lp: q.Lp })), vagas: vagas.map(vg => vg.caixa), pranchas,
      travaTracado: !!trava, comMarcas: false, sitPedida: null, occ: Array.from(K.occ) });
  }

  /* ================= os desenhos ================= */
  // (o desenho do cais, dos molhes, do quebra-mar, do farol, da prancha, do guindaste, da carga, das redes, do secador
  // de peixe, da barraca do peixe e do gelo fica na Paisagem: a Cidade com mar usa os mesmos)
  const PZ = Paisagem;
  Object.assign(MO.PINTORES, { caisPorto: PZ.cais, molhe: PZ.molhe, quebraMar: PZ.quebraMar, farol: PZ.farol, prancha: PZ.prancha, guindaste: PZ.guindaste, carga: PZ.carga, redes: PZ.redes, peixes: PZ.peixes, barracaPeixe: PZ.barracaPeixe, gelo: PZ.gelo });

  /* ================= a cena, a prévia e o lugar (a janela do gerador) ================= */
  const nomePadrao = p => NOME[p.tipo] || 'Porto';
  const criar = (p, nome, ex) => MO.criarPlano(p, nome, ex, nomePadrao);
  function resumo(p) {
    const n = p.predios.length, partes = [(TIPOS.find(t => t[0] === p.tipo) || TIPOS[0])[1] + ' · ' + n + (n === 1 ? ' prédio' : ' prédios'), p.W + ' × ' + p.H + ' quadrados'];
    if (p.navios.length) partes.push(p.tipo === 'vila' ? 'o barco de pesca atracado' : p.navios.length === 1 ? 'um navio atracado' : p.navios.length + ' navios atracados');
    if (p.farol) partes.push(p.tipo === 'vila' ? 'o farol na ponta de pedras' : 'o farol no quebra-mar');
    if (p.estacao) partes.push(Estacoes.texto(p));                // (lote 13, parte 13c) a estação
    return partes.join(' · ') + '.';
  }
  const lembrar = st => { App.opt.porTipo = st.tipo; App.opt.porTam = st.tamanho; App.opt.porTer = st.terreno; App.opt.porNav = st.navios; App.opt.porFarol = st.farol; App.opt.porMerc = st.mercado; };
  function padrao() {
    const o = App.opt;
    return { tipo: o.porTipo === 'porto' ? 'porto' : 'vila', tamanho: TAMANHOS[o.porTam] ? o.porTam : 'medio', terreno: TERRENOS_P.some(t => t[0] === o.porTer) ? o.porTer : 'campo', navios: o.porNav !== false, farol: o.porFarol !== false, mercado: o.porMerc !== false };
  }
  function controles(st, K, mudou) {
    const { field, seg, toggle } = K;
    // (o lugar e o tamanho trocam o traçado: soltam a trava; o terreno e as chaves não mexem nele)
    const muda = (campo, v, soltar) => { st[campo] = v; lembrar(st); mudou(true, soltar ? { soltar: true } : undefined); };
    const tam = k => TAMANHOS[k][st.tipo], vila = st.tipo === 'vila';
    return h('div', { class: 'ger-c' },
      field('Lugar', seg('por-tipo', st.tipo, TIPOS.map(([k, n]) => [k, n, null, k === 'vila' ? 'A praia, os píeres de tábuas, as casas dos pescadores e o barco de pesca' : 'O cais de pedra, os molhes, os armazéns e os navios grandes atracados']), v => muda('tipo', v, true)), 'stack'),
      h('div', { class: 'ger-l' },
        field('Tamanho', seg('por-tam', st.tamanho, Object.keys(TAMANHOS).map(k => [k, TAMANHOS[k].n, null, 'Até ' + tam(k).casas + ' prédios' + (vila ? '' : ' e ' + tam(k).navios + (tam(k).navios === 1 ? ' navio' : ' navios')) + ' · ' + tam(k).W + ' × ' + tam(k).H + ' quadrados']), v => muda('tamanho', v, true)), 'stack'),
        field('Terreno', seg('por-ter', st.terreno, TERRENOS_P.map(([k, n]) => [k, n]), v => muda('terreno', v)), 'stack')),
      toggle('por-nav', st.navios, v => muda('navios', v), vila ? 'O barco de pesca atracado (um lugar: dois cliques na escotilha geram o porão)' : 'Os navios atracados (cada um é um lugar: dois cliques na escotilha geram o porão e as cabines)'),
      toggle('por-farol', st.farol, v => muda('farol', v), vila ? 'O farol, na ponta de pedras' : 'O farol, na ponta do quebra-mar'),
      toggle('por-merc', st.mercado, v => muda('mercado', v), vila ? 'O mercado do peixe (as barracas na areia, as redes e os secadores)' : 'O movimento do cais (os guindastes, a carga, os barris e os caixotes)'));
  }
  const opcoesDe = st => ({ tipo: st.tipo, tamanho: st.tamanho, terreno: st.terreno, navios: !!st.navios, farol: !!st.farol, mercado: !!st.mercado });
  function aplicarOpcoes(st, o) {
    if (o.tipo === 'vila' || o.tipo === 'porto') st.tipo = o.tipo;
    if (TAMANHOS[o.tamanho]) st.tamanho = o.tamanho;
    if (TERRENOS_P.some(t => t[0] === o.terreno)) st.terreno = o.terreno;
    else if (o.terreno === 'deserto') st.terreno = 'areia';
    for (const k of ['navios', 'farol', 'mercado']) if (typeof o[k] === 'boolean') st[k] = o[k];
    lembrar(st);
  }
  // a parte que trava: o traçado inteiro (o mar, a beira, as ruas, os píeres e os molhes, os navios e os prédios)
  const partes = p => (p.tracado.length ? ['tracado'] : []);
  function parteEm(p, x, y) {
    for (const f of p.tracado) {
      if (f.k === 'linha' && MO.distLinha(f.pts, x, y) <= f.hw + 0.5) return 'tracado';
      if (f.k === 'poli' && MO.dentroPoli(f.pts, x, y)) return 'tracado';
      if (f.k === 'circ' && Math.hypot(x - f.x, y - f.y) <= f.r) return 'tracado';
    }
    return null;
  }
  const nomeDaParte = () => 'o traçado (o mar, a beira, as ruas, os píeres, os navios e os prédios)';
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
  // (lote 13, parte 13c: aceitaEstacao — a janela mostra a Estação e passa a escolhida)
  const LUGAR = { aceitaEstacao: true, id: 'porto', n: 'Porto', padrao, controles, opcoesDe, aplicarOpcoes, gerar: (st, comum) => gerar(Object.assign({}, st, comum)), previa: MO.previa, resumo, partes, parteEm, nomeDaParte, formaDaParte, travada, alternar, quantasTravadas, baseDe, travaDe, nomePadrao, criar,
    relevoTxt: 'Com relevo e formas (o mar, os píeres e os molhes, o quebra-mar, os conveses e o farol)',
    dica: 'Clique no traçado da prévia (o mar, a beira, as ruas, os píeres, os prédios) para travar: "Gerar outro" troca só os barcos pequenos, o mercado e as árvores.',
    nota: 'Sai uma cena nova: o mar com a beira, os píeres, os prédios fechados (cada um com um marcador de Entrada na porta, só seu: dois cliques geram o interior) e os navios grandes atracados — cada um é um lugar: o convés com a amurada (deixa ver, não deixa passar), a prancha até a terra e a escotilha (dois cliques geram o porão e as cabines). Os barcos pequenos são desenho. Nada sai escrito; tudo continua editável; as cenas que já existem não mudam.',
    feito: (sc, p) => `"${sc.name}" criada: ${resumo(p).replace(/\.$/, '')}. Tudo é editável.` };
  return { TIPOS, TAMANHOS, TERRENOS_P, gerar, resumo, criar, nomePadrao, limparTrava, travaDe, LUGAR };
})();
