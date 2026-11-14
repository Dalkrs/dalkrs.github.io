/* ---------------------------------------------------------------
   10gc. FURTIVIDADE (lote 121) — os lugares para as missões de furtividade, no grupo "Furtividade" do "Gerar um
   lugar…": a mansão do nobre, a fortaleza, a guilda com o cofre, o acampamento inimigo, as casas e ruas (um quarteirão)
   e a torre de guarda. Cada um sai pronto para entrar escondido:
     · os guardas, com as rondas (as rotas tracejadas que só o mestre vê; ver 07i. RONDAS) e os postos fixos, cada um
       com o cone de visão; quantos, pela escolha "Guardas"; os de ronda, à noite, levam uma lanterna;
     · as luzes onde um guarda precisa (o portão, a porta, o corredor) e o escuro no resto: os cantos de sombra ficam
       marcados para o mestre (a marca "Esconderijo", oculta);
     · os esconderijos de verdade: o armário (dá para entrar), debaixo da cama, as moitas, os barris, as carroças;
     · as entradas que não são a porta da frente: a porta dos fundos trancada (com o nível da fechadura), a janela
       destrancada, a hera que sobe o muro, o bueiro (desce ao esgoto: uma Entrada oculta) e, às vezes, uma porta secreta;
     · o alvo da missão, já posto e marcado só para o mestre (o cofre, o documento, o prisioneiro, a pessoa, a relíquia);
     · os que dormem (os soldados nas camas do quartel, o chefe na tenda): tokens com a condição Adormecido.
   O plano é o mesmo dos outros lugares de fora (o kit de 10g9: as paredes, os objetos, o que se pinta no fundo), mais
   p.guardas, p.npcs e p.marcas. As salas de dentro são feitas numa grade de rótulos (predio): a parede entre duas salas
   é uma só, e a porta fica nela.
   --------------------------------------------------------------- */
const Furtividade = (() => {
  const KIT = () => LugaresFora.kit;
  // (lote 146) o casarão com jardim: a casa grande (não é mansão), o jardim enorme com as estufas, a casa de ferramentas e o altar
  const IDS = ['mansao', 'casarao', 'fortaleza', 'guilda', 'acampamento', 'ruas', 'torre'];
  const NOMES = { sobmedida: 'Sob medida', mansao: 'Mansão do nobre', casarao: 'Casarão com jardim', fortaleza: 'Fortaleza', guilda: 'Guilda e cofre', acampamento: 'Acampamento inimigo', ruas: 'Casas e ruas', torre: 'Torre de guarda' };
  const CURTO = { mansao: 'Mansão', casarao: 'Casarão', fortaleza: 'Fortaleza', guilda: 'Guilda', acampamento: 'Acampamento', ruas: 'Ruas', torre: 'Torre' };
  const TAM = { pequeno: { n: 'Pequeno', k: 0.84 }, medio: { n: 'Médio', k: 1 }, grande: { n: 'Grande', k: 1.2 } };
  const GUARDAS = [['poucos', 'Poucos'], ['normal', 'Normal'], ['muitos', 'Muitos']];
  const ALVOS = {
    mansao: [['cofre', 'O cofre'], ['documento', 'Um documento'], ['pessoa', 'O senhor da casa'], ['artefato', 'Uma relíquia']],
    casarao: [['documento', 'Um documento'], ['cofre', 'O cofre do escritório'], ['pessoa', 'O dono da casa'], ['artefato', 'O que está na sala misteriosa']],
    fortaleza: [['prisioneiro', 'Um prisioneiro'], ['documento', 'As ordens'], ['cofre', 'O cofre do soldo'], ['pessoa', 'O comandante']],
    guilda: [['cofre', 'O cofre forte'], ['documento', 'O livro de contas'], ['artefato', 'Uma joia rara']],
    acampamento: [['prisioneiro', 'Os cativos'], ['documento', 'O mapa do chefe'], ['pessoa', 'O chefe'], ['cofre', 'O baú do saque']],
    ruas: [['documento', 'Uma carta'], ['pessoa', 'Uma pessoa'], ['cofre', 'Um baú escondido']],
    torre: [['artefato', 'O sinal de fogo'], ['prisioneiro', 'Um prisioneiro'], ['documento', 'A mensagem']],
  };
  const NIVEIS = ['facil', 'medio', 'dificil', 'extremo', 'absoluto'];
  const ROT = { n: 0, l: 90, s: 180, o: 270 };                       // o giro de quem fica de costas para a parede daquele lado
  const DIR = { n: 270, l: 0, s: 90, o: 180 };                       // o rumo do olhar, para aquele lado
  const dimsDe = (fw, fh, rot) => (((Math.round((rot || 0) / 90) % 4) + 4) % 2 ? [fh, fw] : [fw, fh]);

  /* ================= o plano e as peças ================= */
  function plano(lugar, W, H, seed, o) {
    const K = KIT().novoPlano(lugar, W, H, seed, { estilo: o.estilo || 'comum', estacao: o.estacao || 'verao', tamanho: o.tamanho, guardas: o.guardas, alvo: o.alvo });
    Object.assign(K.p, { guardas: [], npcs: [], marcas: [], furtivo: true });
    K.reserva = new Set();                                         // as casas que ficam livres (a frente das portas)
    K.livreR = (x, y, w, h) => { for (let j = 0; j < (h || 1); j++) for (let i = 0; i < (w || 1); i++) if (!K.livre(x + i, y + j) || K.reserva.has((x + i) + ',' + (y + j))) return false; return true; };
    // um objeto (comprido ou não) no canto (x, y), se couber
    K.poeR = (id, x, y, fw, fh, rot, o2) => {
      x = Math.floor(x); y = Math.floor(y);
      const [w, h] = dimsDe(fw, fh, rot);
      if (!K.livreR(x, y, w, h) || x < 0 || y < 0 || x + w > W || y + h > H) return false;
      K.ocupa(x, y, w, h);
      const ob = Object.assign({ id, x, y, s: Math.max(fw, fh) }, Props.P[id] && Props.P[id].fw ? { fw, fh } : null, rot ? { rot } : null, o2 || null);
      K.p.objetos.push(ob);
      return ob;
    };
    K.poe1 = (id, x, y, rot, o2) => K.poeR(id, x, y, 1, 1, rot, o2);
    K.guarda = (x, y, ronda, o2) => { K.p.guardas.push(Object.assign({ x, y, ronda }, o2 || {})); };
    K.marca = (id, x, y, n, notas) => { if (x < 0 || y < 0 || x >= W || y >= H) return; K.p.marcas.push({ id, x: Math.floor(x), y: Math.floor(y), n, notas: notas || '' }); };
    return K;
  }
  const embaralha = (r, l) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };

  /* ================= o prédio: as salas numa grade de rótulos =================
     cfg: { corredor (true/false), larg (do corredor), min/max (a largura das salas), papeis (na ordem de importância),
            fundos (os papéis que preferem a faixa de trás), resto (o papel das que sobram), frente ('s' ou 'n'),
            trancada (a porta da frente), extra (a chance de porta entre vizinhas), secreta (uma porta secreta),
            fundosPorta (a porta dos fundos), janelas, piso: papel → tipo de piso }
     → { salas (em quadrados da cena, com papel), corr, porta (a da frente: { x, y, fora: [x, y] }), fundos, portas } */
  function predio(K, x0, y0, w, h, cfg) {
    const { r, ri } = K, lab = new Int16Array(w * h).fill(-1), salas = [];
    const L = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? -2 : lab[j * w + i]);
    const marca = (q, k) => { for (let j = q.y; j < q.y + q.h; j++) for (let i = q.x; i < q.x + q.w; i++) lab[j * w + i] = k; };
    const larg = cfg.larg || 2, frente = cfg.frente || 's';
    let corr = null;
    if (cfg.corredor && h >= 9) {
      const cy = Math.floor((h - larg) / 2);
      corr = { x: 0, y: cy, w, h: larg, papel: 'corredor', faixa: 'c' };
      salas.push(corr); marca(corr, 0);
    }
    const faixas = corr ? [{ y: 0, h: corr.y, f: 'n' }, { y: corr.y + larg, h: h - corr.y - larg, f: 's' }] : [{ y: 0, h, f: 'x' }];
    for (const fx of faixas) {
      let x = 0;
      const mn = cfg.min || 4, mx = Math.max(mn, cfg.max || 7);
      while (x < w) {
        let lw = ri(mn, mx);
        if (w - (x + lw) < mn) lw = w - x;
        const q = { x, y: fx.y, w: lw, h: fx.h, papel: '', faixa: fx.f };
        salas.push(q); marca(q, salas.length - 1);
        x += lw;
      }
    }
    // os papéis: a entrada (a sala do meio da frente), depois os da lista, dos maiores aos menores
    const daFrente = salas.filter(q => q.faixa === (corr ? frente : 'x'));
    const meio = daFrente.find(q => q.x <= w / 2 && q.x + q.w > w / 2) || daFrente[0];
    meio.papel = cfg.entrada || 'vestibulo';
    const livres = () => salas.filter(q => !q.papel);
    for (const pp of cfg.papeis || []) {
      const l = livres();
      if (!l.length) break;
      const pref = (cfg.fundos || []).includes(pp) ? l.filter(q => q.faixa !== frente) : l;
      const lista = (pref.length ? pref : l).sort((a, b) => b.w * b.h - a.w * a.h);
      lista[0].papel = pp;
    }
    let k = 0;
    for (const q of livres()) q.papel = (cfg.resto || ['quarto'])[k++ % (cfg.resto || ['quarto']).length];

    // os trechos de parede: um por lado de quadrado, onde o rótulo muda
    const U = new Map();
    for (let x = 0; x <= w; x++) for (let j = 0; j < h; j++) { const a = L(x - 1, j), b = L(x, j); if (a !== b) U.set('v' + x + ',' + j, { x1: x0 + x, y1: y0 + j, x2: x0 + x, y2: y0 + j + 1, k: 'wall', a, b, v: true, p: j }); }
    for (let y = 0; y <= h; y++) for (let i = 0; i < w; i++) { const a = L(i, y - 1), b = L(i, y); if (a !== b) U.set('h' + i + ',' + y, { x1: x0 + i, y1: y0 + y, x2: x0 + i + 1, y2: y0 + y, k: 'wall', a, b, v: false, p: i }); }
    const entre = (A, B) => [...U.values()].filter(u => u.k === 'wall' && ((u.a === A && u.b === B) || (u.a === B && u.b === A))).sort((m, n) => (m.v === n.v ? (m.v ? m.x1 - n.x1 || m.p - n.p : m.y1 - n.y1 || m.p - n.p) : m.v ? -1 : 1));
    // uma porta no trecho do meio (fora das pontas)
    const porta = (lst, o) => {
      if (!lst.length) return null;
      const lo = lst.length >= 3 ? 1 : 0, hi = lst.length >= 3 ? lst.length - 2 : lst.length - 1, m = clamp(Math.floor((lo + hi) / 2) + ri(-1, 1), lo, hi), u = lst[m];
      u.k = 'door'; u.o = o || {};
      return u;
    };
    const portas = [], ligadas = new Set();
    const liga = (A, B, o) => { const u = porta(entre(A, B), o); if (u) { portas.push(u); ligadas.add(Math.min(A, B) + ':' + Math.max(A, B)); } return u; };
    if (corr) for (let i = 1; i < salas.length; i++) liga(i, 0, cfg.trancar && cfg.trancar.includes(salas[i].papel) ? { locked: true, fech: cfg.nivelSala || 'medio' } : null);
    else for (let i = 1; i < salas.length; i++) liga(i - 1, i, cfg.trancar && (cfg.trancar.includes(salas[i].papel) || cfg.trancar.includes(salas[i - 1].papel)) ? { locked: true, fech: cfg.nivelSala || 'medio' } : null);
    // as portas entre vizinhas da mesma faixa (outros caminhos)
    for (let i = 1; i < salas.length; i++) for (let j = i + 1; j < salas.length; j++) {
      if (ligadas.has(i + ':' + j) || salas[i].faixa !== salas[j].faixa || r() >= (cfg.extra == null ? 0.3 : cfg.extra)) continue;
      if (entre(i, j).length >= 2) liga(i, j);
    }
    // uma porta secreta, às vezes (entre duas salas que ainda não se ligam)
    if (cfg.secreta) {
      const pares = [];
      for (let i = 1; i < salas.length; i++) for (let j = i + 1; j < salas.length; j++) if (!ligadas.has(i + ':' + j) && entre(i, j).length >= 2) pares.push([i, j]);
      const par = pares.find(([i, j]) => [salas[i].papel, salas[j].papel].includes(cfg.secreta)) || pares[0];
      if (par) liga(par[0], par[1], { secret: true });
    }
    // a porta da frente e a dos fundos (para fora)
    const fora = (q, lado) => [...U.values()].filter(u => u.k === 'wall' && (u.a === salas.indexOf(q) || u.b === salas.indexOf(q)) && (u.a === -2 || u.b === -2) && (lado === 'n' ? !u.v && u.y1 === y0 : lado === 's' ? !u.v && u.y1 === y0 + h : lado === 'o' ? u.v && u.x1 === x0 : u.v && u.x1 === x0 + w)).sort((m, n) => m.p - n.p);
    const pf = cfg.portaFrente === false ? null : porta(fora(meio, frente), cfg.trancada ? { locked: true, fech: cfg.nivelFrente || 'medio' } : {});      // (lote 122: os andares de cima e o porão não têm)
    const out = { salas: [], corr: null, porta: null, fundos: null, portas: [], janelas: [] };
    // a casa de fora e a de dentro de uma porta, pelo lado da parede
    const lados = (u, lado) => (lado === 's' ? [[u.x1, u.y1], [u.x1, u.y1 - 1]] : lado === 'n' ? [[u.x1, u.y1 - 1], [u.x1, u.y1]] : lado === 'o' ? [[u.x1 - 1, u.y1], [u.x1, u.y1]] : [[u.x1, u.y1], [u.x1 - 1, u.y1]]);
    if (pf) { portas.push(pf); const [fo, de] = lados(pf, frente); out.porta = { x: pf.x1, y: pf.y1, fora: fo, dentro: de, lado: frente }; }
    if (cfg.fundosPorta !== false) {
      const tras = { s: 'n', n: 's', o: 'l', l: 'o' }[frente], cand = salas.filter(q => q !== meio && q !== corr && fora(q, tras).length >= 2);
      const qf = cand.find(q => (cfg.fundos || []).includes(q.papel)) || cand[Math.floor(r() * cand.length)];
      const u = qf ? porta(fora(qf, tras), { locked: true, fech: cfg.nivelFundos || 'facil' }) : null;
      if (u) { portas.push(u); out.fundos = { x: u.x1, y: u.y1, fora: lados(u, tras)[0], sala: qf, lado: tras }; }
    }
    // as janelas: uma (ou duas, na parede comprida) por sala, nas paredes de fora; uma das de trás fica destrancada
    if (cfg.janelas !== false) {
      for (const q of salas) {
        if (q === corr && !cfg.janelaCorredor) continue;
        for (const lado of embaralha(r, ['n', 's', 'o', 'l'])) {
          const l = fora(q, lado).filter((u, ix, a) => ix > 0 && ix < a.length - 1);
          if (!l.length) continue;
          const u = l[Math.floor(l.length / 2)];
          u.k = 'window'; u.o = {};
          out.janelas.push({ u, sala: q, lado });
          break;
        }
      }
      const tras = out.janelas.filter(j => j.lado !== frente);
      if (tras.length) { const j = tras[Math.floor(r() * tras.length)]; j.u.o = { open: false, locked: false, aberta: true }; out.janelaAberta = j; }
      for (const j of out.janelas) if (j !== out.janelaAberta) j.u.o = { locked: true };
    }
    // as paredes: os trechos de parede juntos (na mesma linha, um atrás do outro); as portas e janelas, um a um
    const vs = [...U.values()];
    const linha = (lst, vert) => {
      lst.sort((m, n) => (vert ? m.x1 - n.x1 || m.y1 - n.y1 : m.y1 - n.y1 || m.x1 - n.x1));
      let cur = null;
      const fecha = () => { if (cur) { K.parede(cur.x1, cur.y1, cur.x2, cur.y2, 'wall'); K.pinta('paredeFina', { x1: cur.x1, y1: cur.y1, x2: cur.x2, y2: cur.y2 }); cur = null; } };
      for (const u of lst) {
        if (u.k !== 'wall') { fecha(); K.parede(u.x1, u.y1, u.x2, u.y2, u.k, u.o); continue; }
        if (cur && (vert ? cur.x1 === u.x1 && cur.y2 === u.y1 : cur.y1 === u.y1 && cur.x2 === u.x1)) { cur.x2 = u.x2; cur.y2 = u.y2; }
        else { fecha(); cur = { x1: u.x1, y1: u.y1, x2: u.x2, y2: u.y2 }; }
      }
      fecha();
    };
    linha(vs.filter(u => u.v), true); linha(vs.filter(u => !u.v), false);
    // o piso de cada sala; as casas da frente das portas ficam livres
    for (const q of salas) {
      const a = { x: x0 + q.x, y: y0 + q.y, w: q.w, h: q.h, papel: q.papel, faixa: q.faixa };
      K.pinta('piso', { x: a.x, y: a.y, w: a.w, h: a.h, tipo: (cfg.piso && cfg.piso[q.papel]) || cfg.pisoBase || 'madeira' });
      out.salas.push(a);
      if (q === corr) out.corr = a;
      if (q === (out.fundos && out.fundos.sala)) out.fundos.sala = a;
    }
    for (const u of portas) {
      if (u.v) { K.reserva.add((u.x1 - 1) + ',' + u.y1); K.reserva.add(u.x1 + ',' + u.y1); }
      else { K.reserva.add(u.x1 + ',' + (u.y1 - 1)); K.reserva.add(u.x1 + ',' + u.y1); }
      out.portas.push({ x1: u.x1, y1: u.y1, x2: u.x2, y2: u.y2, o: u.o || {} });
    }
    K.ocupa(x0, y0, w, h);
    K.p.salas.push(...out.salas);
    return out;
  }

  /* ================= os móveis ================= */
  // (lote 148) a casa rica (a mansão, o casarão): a sala de estar com o sofá, o aparador e os vasos de planta
  const nobre = K => K.p.lugar === 'mansao' || K.p.lugar === 'casarao';
  // encostado numa parede da sala, de costas para ela (a cama, a estante, o armário, a lareira); n vezes
  function encosta(K, q, id, fw, fh, n, lados) {
    let feitos = 0;
    for (let k = 0; k < (n || 1); k++) {
      const cand = [];
      for (const lado of lados || ['n', 's', 'o', 'l']) {
        const rot = ROT[lado], [w, h] = dimsDe(fw, fh, rot);
        if (w > q.w || h > q.h) continue;
        if (lado === 'n' || lado === 's') for (let x = q.x; x + w <= q.x + q.w; x++) cand.push([x, lado === 'n' ? q.y : q.y + q.h - h, rot]);
        else for (let y = q.y; y + h <= q.y + q.h; y++) cand.push([lado === 'o' ? q.x : q.x + q.w - w, y, rot]);
      }
      const ok = embaralha(K.r, cand).find(([x, y, rot]) => K.poeR(id, x, y, fw, fh, rot));
      if (!ok) break;
      feitos++;
    }
    return feitos;
  }
  // num canto (ou junto da parede), 1 × 1
  function canto(K, q, id, o2) {
    const cs = [[q.x, q.y], [q.x + q.w - 1, q.y], [q.x, q.y + q.h - 1], [q.x + q.w - 1, q.y + q.h - 1]];
    for (const [x, y] of embaralha(K.r, cs)) { const ob = K.poe1(id, x, y, 0, o2); if (ob) return ob; }
    const borda = [];
    for (let x = q.x; x < q.x + q.w; x++) borda.push([x, q.y], [x, q.y + q.h - 1]);
    for (let y = q.y; y < q.y + q.h; y++) borda.push([q.x, y], [q.x + q.w - 1, y]);
    for (const [x, y] of embaralha(K.r, borda)) { const ob = K.poe1(id, x, y, 0, o2); if (ob) return ob; }
    return null;
  }
  // no meio da sala (o mais perto do meio que couber)
  function noMeio(K, q, id, fw, fh, rot, o2) {
    const [w, h] = dimsDe(fw, fh, rot), cx = q.x + (q.w - w) / 2, cy = q.y + (q.h - h) / 2, cand = [];
    for (let y = q.y; y + h <= q.y + q.h; y++) for (let x = q.x; x + w <= q.x + q.w; x++) cand.push([x, y]);
    cand.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
    for (const [x, y] of cand) { const ob = K.poeR(id, x, y, fw, fh, rot, o2); if (ob) return ob; }
    return null;
  }
  // as cadeiras (ou bancos) dos lados compridos de uma mesa, viradas para ela
  function cadeiras(K, m, id, max) {
    const [w, h] = dimsDe(m.fw || m.s, m.fh || m.s, m.rot), out = [];
    const lados = w >= h ? [[0, -1, 180], [0, h, 0]] : [[-1, 0, 90], [w, 0, 270]];
    for (const [dx, dy, rot] of lados) for (let k = 0; k < Math.max(w, h); k++) {
      if (out.length >= (max || 99)) return out;
      const x = m.x + (w >= h ? k : dx), y = m.y + (w >= h ? dy : k);
      const ob = K.poe1(id, x, y, (rot + 180) % 360);
      if (ob) out.push(ob);
    }
    return out;
  }
  // o tapete: pintado no fundo (fica por baixo de tudo e não ocupa)
  const tapete = (K, q, m) => { m = m == null ? 1 : m; if (q.w - 2 * m >= 2 && q.h - 2 * m >= 2) K.pinta('tapete', { x: q.x + m + 0.15, y: q.y + m + 0.15, w: q.w - 2 * m - 0.3, h: q.h - 2 * m - 0.3 }); };

  // os móveis de cada papel de sala (q: a sala, em quadrados da cena)
  const MOB = {
    vestibulo(K, q) { tapete(K, q, 1); canto(K, q, 'candelabro'); canto(K, q, 'estatua'); if (q.w >= 5) canto(K, q, 'candelabro'); encosta(K, q, 'banco', 2, 1, 1); if (nobre(K)) { canto(K, q, 'vasoGrande'); encosta(K, q, 'aparador', 2, 1, 1); } },
    salao(K, q) {
      tapete(K, q, 1);
      encosta(K, q, 'lareira', 2, 1, 1, ['n']);
      const big = q.w >= 8 && q.h >= 5, m = noMeio(K, q, big ? 'mesaBanquete' : 'mesa', big ? Math.min(6, q.w - 4) : 2, big ? 2 : 1, 0);
      if (m) cadeiras(K, m, 'cadeira', 12);
      canto(K, q, 'candelabro'); canto(K, q, 'estandarte'); canto(K, q, 'estandarte');
      if (nobre(K)) { encosta(K, q, 'aparador', 2, 1, 1); canto(K, q, 'vasoGrande'); canto(K, q, 'vasoGrande'); }      // (lote 148)
    },
    biblioteca(K, q) { encosta(K, q, 'estante', 2, 1, Math.max(2, Math.floor((q.w + q.h) / 3))); const m = noMeio(K, q, 'mesa', 2, 1, 0); if (m) cadeiras(K, m, 'cadeira', 2); canto(K, q, 'atril'); canto(K, q, 'vela'); },
    escritorio(K, q) { encosta(K, q, 'estante', 2, 1, 2); const m = noMeio(K, q, 'mesa', 2, 1, 0); if (m) cadeiras(K, m, 'cadeira', 1); encosta(K, q, 'armario', 2, 1, 1); canto(K, q, 'vela'); },
    quartoSenhor(K, q) { tapete(K, q, 1); encosta(K, q, 'camaCasal', 2, 2, 1, ['n', 'o', 'l']); encosta(K, q, 'armario', 2, 1, 1); canto(K, q, 'bau'); canto(K, q, 'vela'); if (nobre(K)) { canto(K, q, 'poltrona'); canto(K, q, 'vasoGrande'); } },
    quarto(K, q) { encosta(K, q, 'cama', 1, 2, 1); encosta(K, q, 'armario', 2, 1, 1); canto(K, q, 'bau'); if (K.r() < 0.6) canto(K, q, 'vela'); },
    criados(K, q) { encosta(K, q, 'cama', 1, 2, Math.max(2, Math.floor(q.w / 2))); canto(K, q, 'bau'); canto(K, q, 'vela'); },
    // (lote 148) a cozinha: o fogão a lenha, a pia e as panelas (sem lugar para o fogão, a lareira de antes)
    cozinha(K, q) { if (!encosta(K, q, 'fogao', 2, 1, 1)) encosta(K, q, 'lareira', 2, 1, 1); encosta(K, q, 'piaCozinha', 2, 1, 1); encosta(K, q, 'pilhaLenha', 2, 1, 1);      // (lote 125: a lenha do fogão)
      if (q.w * q.h >= 20) encosta(K, q, 'prateleiraPanelas', 2, 1, 1);
      const m = noMeio(K, q, 'mesa', 2, 1, 0); if (m) cadeiras(K, m, 'banco', 2); canto(K, q, 'barril'); canto(K, q, 'barril'); canto(K, q, 'jarro'); canto(K, q, 'sacos'); },
    despensa(K, q) { for (let i = 0; i < 3; i++) canto(K, q, 'barril'); canto(K, q, 'caixote'); canto(K, q, 'caixote'); canto(K, q, 'sacos'); encosta(K, q, 'estante', 2, 1, 1); },
    galeria(K, q) { tapete(K, q, 1); for (let i = 0; i < Math.max(2, Math.floor(q.w / 2)); i++) canto(K, q, 'estatua'); canto(K, q, 'candelabro'); },
    capela(K, q) { encosta(K, q, 'altar', 1, 1, 1, ['n']); for (let i = 0; i < 2; i++) noMeio(K, q, 'banco', 2, 1, 0); canto(K, q, 'vela'); canto(K, q, 'vela'); },
    corredor(K, q) {
      // os candelabros, de tantos em tantos quadrados, encostados de um lado
      for (let x = q.x + 2; x < q.x + q.w - 1; x += 7) { if (!K.poe1('candelabro', x, q.y)) K.poe1('candelabro', x, q.y + q.h - 1); }
      if (q.w >= 10) K.pinta('tapete', { x: q.x + 1, y: q.y + q.h / 2 - 0.45, w: q.w - 2, h: 0.9 });
      // (lote 125) às vezes, um fio com guizos atravessado no corredor (a armadilha: nasce escondido)
      if (q.w >= 6 && K.r() < 0.45) K.poe1('guizos', K.ri(q.x + 2, q.x + q.w - 3), q.y + Math.floor(q.h / 2));
    },
    // o quartel e a fortaleza
    dormitorio(K, q) { encosta(K, q, 'cama', 1, 2, Math.max(2, Math.floor((q.w + q.h) / 3)), ['n', 's']); canto(K, q, 'bau'); canto(K, q, 'bau'); },
    refeitorio(K, q) { const m = noMeio(K, q, q.w >= 7 ? 'mesaLonga' : 'mesa', q.w >= 7 ? Math.min(6, q.w - 2) : 2, q.w >= 7 ? 2 : 1, 0); if (m && m.id === 'mesa') cadeiras(K, m, 'banco', 2); canto(K, q, 'barril'); canto(K, q, 'braseiro'); },
    arsenal(K, q) { encosta(K, q, 'estante', 2, 1, 1); for (let i = 0; i < 3; i++) canto(K, q, 'armas'); canto(K, q, 'caixote'); canto(K, q, 'boneco'); },
    comandante(K, q) { encosta(K, q, 'cama', 1, 2, 1); const m = noMeio(K, q, 'mesaGuerra', 2, 2, 0) || noMeio(K, q, 'mesa', 2, 1, 0); if (m) cadeiras(K, m, 'cadeira', 2); canto(K, q, 'estandarte'); canto(K, q, 'braseiro'); },
    guarda(K, q) { const m = noMeio(K, q, 'mesa', 2, 1, 0); if (m) cadeiras(K, m, 'cadeira', 3); canto(K, q, 'armas'); canto(K, q, 'braseiro'); canto(K, q, 'bau'); },
    cela(K, q) { canto(K, q, 'grilhoes'); canto(K, q, 'feno'); canto(K, q, 'jarro'); },
    torre(K, q) { canto(K, q, 'braseiro'); canto(K, q, 'armas'); canto(K, q, 'barril'); },
    estabulo(K, q) { encosta(K, q, 'cocho', 2, 1, 2); for (let i = 0; i < 4; i++) canto(K, q, 'feno'); },
    // a guilda
    salaoPublico(K, q) { tapete(K, q, 1); encosta(K, q, 'balcao', Math.min(5, Math.max(2, q.w - 3)), 1, 1, ['n']); for (let i = 0; i < 2; i++) encosta(K, q, 'banco', 2, 1, 1, ['o', 'l']); canto(K, q, 'quadroMissoes'); canto(K, q, 'vela'); canto(K, q, 'vela'); },
    arquivo(K, q) { encosta(K, q, 'estante', 2, 1, Math.max(3, Math.floor((q.w + q.h) / 2))); canto(K, q, 'vela'); },
    cofreForte(K, q) { canto(K, q, 'cofre'); canto(K, q, 'cofre'); canto(K, q, 'bau'); canto(K, q, 'bau'); canto(K, q, 'lingotes'); canto(K, q, 'sacos'); },
    // (lote 125) o banheiro: a banheira (ou a tina), a latrina, o lavatório, o espelho e as toalhas
    banheiro(K, q) { if (!encosta(K, q, 'banheira', 2, 1, 1)) canto(K, q, 'tina'); canto(K, q, 'latrina'); canto(K, q, 'lavatorio'); canto(K, q, 'espelho'); canto(K, q, 'toalheiro'); if (q.w * q.h >= 16) encosta(K, q, 'biomboPano', 2, 1, 1); },
    adega(K, q) { encosta(K, q, 'prateleiraVinho', 2, 1, Math.max(2, Math.floor((q.w + q.h) / 3))); if (q.w >= 4 && q.h >= 4) noMeio(K, q, 'tonel', 2, 2, 0); canto(K, q, 'barril'); canto(K, q, 'barril'); canto(K, q, 'vela'); },
    vigia(K, q) { canto(K, q, 'armas'); canto(K, q, 'barril'); canto(K, q, 'lampiao'); },
    sotao(K, q) { canto(K, q, 'bau'); canto(K, q, 'caixote'); canto(K, q, 'caixote'); canto(K, q, 'cestoRoupa'); canto(K, q, 'chamine'); canto(K, q, 'alcapao', { n: 'O alçapão do telhado', est: 'fechado' }); if (K.r() < 0.5) canto(K, q, 'estatua'); },      // (lote 125: a chaminé e o alçapão)
    deposito(K, q) { for (let i = 0; i < 2; i++) canto(K, q, 'caixote'); canto(K, q, 'barril'); canto(K, q, 'sacos'); encosta(K, q, 'estante', 2, 1, 1); },
    // as casas da rua
    sala(K, q) {
      if (nobre(K)) { tapete(K, q, 1); encosta(K, q, 'sofa', 2, 1, 1); canto(K, q, 'poltrona'); canto(K, q, 'poltrona'); encosta(K, q, 'aparador', 2, 1, 1); canto(K, q, 'vasoGrande'); canto(K, q, 'vela'); return; }      // (lote 148) a sala de estar da casa rica
      const m = noMeio(K, q, 'mesa', 2, 1, 0); if (m) cadeiras(K, m, 'cadeira', 2); encosta(K, q, 'armario', 2, 1, 1); canto(K, q, 'bau'); canto(K, q, 'vela'); },
    entrada(K, q) { encosta(K, q, 'lareira', 2, 1, 1); const m = noMeio(K, q, 'mesa', 2, 1, 0); if (m) cadeiras(K, m, 'cadeira', 2); canto(K, q, 'barril'); },
    loja(K, q) { encosta(K, q, 'balcao', Math.min(4, Math.max(2, q.w - 3)), 1, 1, ['n']); encosta(K, q, 'estante', 2, 1, 2); canto(K, q, 'caixote'); canto(K, q, 'barril'); },
    // (lote 141) a base secreta: a sala de reunião (a mesa com o mapa), o laboratório e o túnel de fuga
    reuniao(K, q) { const m = noMeio(K, q, 'mesaGuerra', 2, 2, 0) || noMeio(K, q, 'mesa', 2, 1, 0); if (m) cadeiras(K, m, 'cadeira', 6); encosta(K, q, 'estante', 2, 1, 1); canto(K, q, 'candelabro'); canto(K, q, 'estandarte'); },
    laboratorio(K, q) { encosta(K, q, 'alambique', 2, 1, 1); canto(K, q, 'caldeirao'); encosta(K, q, 'estante', 2, 1, 1); canto(K, q, 'jarro'); canto(K, q, 'vela'); canto(K, q, 'bau'); },
    tunel(K, q) { canto(K, q, 'tunel', { n: 'O túnel de fuga', notas: 'Sai longe da casa (o mestre decide onde).' }); canto(K, q, 'escombros'); canto(K, q, 'caixote'); canto(K, q, 'lampiao'); },
    // (lote 146) a sala misteriosa (o círculo, o atril, as velas, o espelho coberto) e a sala secreta (neutra: o mestre decide)
    misteriosa(K, q) { noMeio(K, q, 'circulo', 2, 2, 0); canto(K, q, 'atril'); canto(K, q, 'vela'); canto(K, q, 'vela'); canto(K, q, 'vela'); encosta(K, q, 'espelho', 1, 1, 1); canto(K, q, 'estatua'); encosta(K, q, 'estante', 2, 1, 1); canto(K, q, 'bau'); },
    secreta(K, q) { encosta(K, q, 'estante', 2, 1, 2); const m = noMeio(K, q, 'mesa', 2, 1, 0); if (m) cadeiras(K, m, 'cadeira', 1); canto(K, q, 'bau'); canto(K, q, 'vela'); canto(K, q, 'vela'); canto(K, q, 'cofre'); },
    tenda(K, q) { canto(K, q, 'pele'); canto(K, q, 'pele'); canto(K, q, 'bau'); canto(K, q, 'armas'); const m = noMeio(K, q, 'mesa', 2, 1, 0); if (m) cadeiras(K, m, 'cadeira', 1); canto(K, q, 'braseiro'); },
  };
  const mobiliar = (K, q) => { const f = MOB[q.papel]; if (f) KIT().dentro(K, q, () => f(K, q)); else KIT().dentro(K, q, () => {}); };

  /* ================= os guardas, o alvo, as sombras e os esconderijos ================= */
  // quantos, pela escolha: [poucos, normal, muitos] → o número
  const qtd = (K, l) => l[{ poucos: 0, normal: 1, muitos: 2 }[K.p.guardas_ || 'normal']];
  // o posto: parado, olhando para o lado
  const posto = (K, x, y, lado, o2) => K.guarda(x, y, { pts: [], r: (o2 && o2.r) || 6, a: (o2 && o2.a) || 100, dir: typeof lado === 'number' ? lado : DIR[lado] }, Object.assign({ posto: true }, o2 || {}));
  // a ronda: os pontos (em quadrados), de ida e volta ou em círculo; começa no primeiro (ou no k-ésimo)
  function ronda(K, pts, modo, o2) {
    const k = (o2 && o2.k) || 0, [x, y] = pts[k % pts.length], nx = pts[(k + 1) % pts.length];
    K.guarda(x, y, { pts, i: (k + 1) % pts.length, s: 1, modo: modo || 'ida', passo: (o2 && o2.passo) || 3, r: (o2 && o2.r) || 6, a: (o2 && o2.a) || 90, dir: ((Math.round(deg(Math.atan2(nx[1] - y, nx[0] - x))) % 360) + 360) % 360 }, Object.assign({ luz: true }, o2 || {}));
  }
  // o retângulo em volta de um prédio, a d quadrados (para a ronda de fora), dentro de [lim]
  const volta = (b, d, lim) => {
    const x0 = Math.max(lim.x0, b.x - d), y0 = Math.max(lim.y0, b.y - d), x1 = Math.min(lim.x1, b.x + b.w - 1 + d), y1 = Math.min(lim.y1, b.y + b.h - 1 + d);
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  };
  // as luzes do plano: [x, y, alcance] (para achar os cantos escuros)
  function luzesDo(p) {
    const out = [];
    for (const o of p.objetos) { const d = Props.P[o.id]; if (d && d.luz) out.push([o.x + 0.5, o.y + 0.5, d.luz.dim + 0.5]); }
    for (const g of p.guardas) if (g.luz && g.ronda.pts.length) out.push([g.x + 0.5, g.y + 0.5, 4]);
    return out;
  }
  // os cantos de sombra: casas livres de fora (de area), longe das luzes, encostadas em algo (parede, moita, árvore)
  function sombras(K, n, area) {
    const L = luzesDo(K.p), cand = [];
    for (let y = area.y0; y <= area.y1; y++) for (let x = area.x0; x <= area.x1; x++) {
      if (!K.livreR(x, y, 1, 1)) continue;
      if (L.some(([lx, ly, r]) => Math.hypot(x + 0.5 - lx, y + 0.5 - ly) < r + 1)) continue;
      let viz = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!K.livre(x + dx, y + dy)) viz++;
      if (viz) cand.push([x, y, viz]);
    }
    const out = [];
    for (const c of embaralha(K.r, cand).sort((a, b) => b[2] - a[2])) {
      if (out.length >= n) break;
      if (out.some(([x, y]) => Math.hypot(x - c[0], y - c[1]) < 6)) continue;
      out.push(c);
      K.marca('esconderijo', c[0], c[1], 'Sombra', 'Canto escuro: longe das luzes, dá para esperar a ronda passar.');
    }
    return out.length;
  }
  // o alvo da missão, numa sala: o objeto (ou o token), e a marca do mestre ao lado
  const NOTA_ALVO = 'Alvo da missão.';
  function alvo(K, q, tipo, o2) {
    o2 = o2 || {};
    let ob = null;
    if (tipo === 'cofre') ob = canto(K, q, o2.id || 'cofre', { n: o2.n || 'O cofre', notas: NOTA_ALVO + ' ' + (o2.notas || 'Trancado.') });
    else if (tipo === 'documento') ob = canto(K, q, 'papeis', { n: o2.n || 'O documento', notas: NOTA_ALVO + ' ' + (o2.notas || '') });
    else if (tipo === 'artefato') ob = noMeio(K, q, o2.id || 'idolo', 1, 1, 0, { n: o2.n || 'A relíquia', notas: NOTA_ALVO + ' ' + (o2.notas || '') });
    else if (tipo === 'prisioneiro' || tipo === 'pessoa') {
      const livres = [];
      for (let y = q.y; y < q.y + q.h; y++) for (let x = q.x; x < q.x + q.w; x++) if (K.livreR(x, y, 1, 1)) livres.push([x, y]);
      const camas = tipo === 'pessoa' ? K.p.objetos.filter(o => (o.id === 'camaCasal' || o.id === 'cama') && o.x >= q.x && o.y >= q.y && o.x < q.x + q.w && o.y < q.y + q.h) : [];
      const [x, y] = camas.length ? [camas[0].x, camas[0].y + (camas[0].rot === 180 ? 1 : 0)] : livres.length ? livres[Math.floor(K.r() * livres.length)] : [q.x, q.y];
      K.p.npcs.push({ x, y, n: o2.n || (tipo === 'pessoa' ? 'O alvo' : 'Prisioneiro'), notas: NOTA_ALVO + ' ' + (o2.notas || ''), conds: tipo === 'pessoa' && camas.length ? ['adormecido'] : [], cor: tipo === 'pessoa' ? '#8a5aa8' : '#8f7a4a' });
      if (!camas.length) K.ocupa(x, y, 1, 1);
      ob = { x, y };
    }
    if (ob) {
      const viz = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].map(([dx, dy]) => [ob.x + dx, ob.y + dy]).find(([x, y]) => x >= q.x && y >= q.y && x < q.x + q.w && y < q.y + q.h && K.livreR(x, y, 1, 1));
      if (viz) K.marca('alvoMissao', viz[0], viz[1], 'Alvo da missão', (o2.n || '') + (o2.notas ? ': ' + o2.notas : ''));
      K.p.alvo = { tipo, n: o2.n, x: ob.x, y: ob.y };
    }
    return ob;
  }
  // um esconderijo de verdade (a moita, o barril, a carroça…): o objeto e a marca do mestre junto
  /* (lote 125) A grade da janela: por dentro das janelas do prédio (o retângulo dele), até n. */
  function gradear(K, rect, n) {
    let k = 0;
    const dentroR = (x, y) => x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h;
    for (const w of K.p.paredes) {
      if (k >= n) break;
      if (w.k !== 'window') continue;
      const hz = w.y1 === w.y2, x = Math.min(w.x1, w.x2), y = Math.min(w.y1, w.y2);
      const cand = hz ? [[x, y], [x, y - 1]] : [[x, y], [x - 1, y]];
      const c = cand.find(([cx, cy]) => dentroR(cx, cy));
      if (c && K.poe1('gradeJanela', c[0], c[1], 0, { n: 'A grade da janela' })) k++;
    }
    return k;
  }
  function esconderijo(K, x, y, id, nome, s) {
    const ob = s > 1 ? K.poeR(id, x, y, s, s, 0) : K.poe1(id, x, y);
    if (!ob) return null;
    const viz = [[0, s || 1], [s || 1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).find(([a, b]) => K.livreR(a, b, 1, 1));
    if (viz) K.marca('esconderijo', viz[0], viz[1], 'Esconderijo', nome);
    return ob;
  }
  // a escolha do alvo (o sorteio usa a semente)
  const alvoDe = (K, lugar, pedido) => (ALVOS[lugar].some(a => a[0] === pedido) ? pedido : ALVOS[lugar][Math.floor(K.r() * ALVOS[lugar].length)][0]);
  const nomeAlvo = (lugar, a) => (ALVOS[lugar].find(x => x[0] === a) || ALVOS[lugar][0])[1];
  // o muro em volta (trechos de um quadrado: dá para abrir o portão e a brecha), com o desenho
  function muro(K, x0, y0, x1, y1, tipo, gaps) {
    const ehGap = (horiz, a, k) => (gaps || []).some(g => g.horiz === horiz && g.a === a && k >= g.de && k < g.ate);
    const lado = (ax, ay, bx, by) => {
      const horiz = ay === by, L = horiz ? bx - ax : by - ay;
      for (let k = 0; k < L; k++) {
        const s = horiz ? [ax + k, ay, ax + k + 1, ay] : [ax, ay + k, ax, ay + k + 1];
        if (ehGap(horiz, horiz ? ay : ax, horiz ? ax + k : ay + k)) continue;
        K.parede(s[0], s[1], s[2], s[3], 'wall'); K.pinta(tipo || 'muro', { x1: s[0], y1: s[1], x2: s[2], y2: s[3] });
      }
    };
    lado(x0, y0, x1, y0); lado(x0, y1, x1, y1); lado(x0, y0, x0, y1); lado(x1, y0, x1, y1);
  }
  // o portão (dois quadrados, com o portão de ferro, que abre e fecha), no lado de baixo
  function portao(K, gx, y, id) { for (const x of [gx - 1, gx]) K.p.objetos.push({ id: id || 'portao', x, y: y - 0.5, s: 1 }); }
  // as árvores e as moitas numa faixa (o mato em volta)
  function mato(K, area, n, maxTenta) {
    let feitos = 0;
    for (let k = 0; k < (maxTenta || n * 6) && feitos < n; k++) {
      const x = K.ri(area.x0, area.x1), y = K.ri(area.y0, area.y1), arv = K.r() < 0.55;
      if (arv ? K.poeR('arvore', x, y, 2, 2, 0) : K.poe1(K.r() < 0.8 ? 'arbusto' : 'pedra', x, y)) feitos++;
    }
    return feitos;
  }

  /* ================= os andares (lote 122) =================
     Cada andar é um plano do mesmo tamanho do térreo (as cenas ficam alinhadas: quem desce aparece no mesmo lugar),
     com o prédio no mesmo retângulo e as escadas nas mesmas casas: com corredor, nas pontas dele; sem, nos cantos.
     Fora do prédio, o telhado de baixo (nos de cima) ou a rocha (no porão). */
  const NOME_ANDAR = n => PlantaAndares.nomeAndar(n);      // (lote 141: o 1º e o 2º porão)
  // as casas das escadas (as do térreo ficam reservadas já, antes dos móveis): sobe (térreo ↔ 1º), desce (térreo ↔
  // porão), sobe2 (1º ↔ 2º)
  // (lote 141) desce2: 1º ↔ 2º porão; com mais de 2 andares, sobe e sobe2 se revezam
  function escadas(K, B, rect, o) {
    const c = B.corr, E = c ? { sobe: [c.x + c.w - 1, c.y], desce: [c.x, c.y + c.h - 1], sobe2: [c.x, c.y], desce2: [c.x + c.w - 1, c.y + c.h - 1] }
      : { sobe: [rect.x + rect.w - 1, rect.y], desce: [rect.x, rect.y], sobe2: [rect.x + rect.w - 1, rect.y + rect.h - 1], desce2: [rect.x + rect.w - 1, rect.y + rect.h - 1] };
    if (o.cima > 0) K.reserva.add(E.sobe.join(','));
    if (o.porao) K.reserva.add(E.desce.join(','));
    return E;
  }
  const escadaObj = (x, y, para, de, oculto) => (oculto ? { id: 'alcapao', x, y, s: 1, para, n: 'Alçapão secreto: desce para a base', est: 'fechado', oculto: true }
    : { id: 'escada', x, y, s: 1, para, n: (para > de ? 'Escada que sobe: ' : 'Escada que desce: ') + NOME_ANDAR(para), rot: para > de ? 180 : 0 });
  function fazAndar(o, lugar, W, H, nivel, rect, cfg, escs) {
    const K = plano(lugar, W, H, KIT().sub(o.seed, 300 + nivel), o);
    K.p.guardas_ = o.guardas; K.p.nivel = nivel; K.p.fundo = nivel < 0 ? 'rocha' : 'telhado';
    for (const e of escs) K.reserva.add(e[0] + ',' + e[1]);
    const B = predio(K, rect.x, rect.y, rect.w, rect.h, Object.assign({ portaFrente: false, fundosPorta: false, janelas: nivel > 0, corredor: rect.h >= 9, larg: 2, min: 4, max: 7, extra: 0.25, pisoBase: nivel < 0 ? 'laje' : 'madeira' }, cfg));
    for (const q of B.salas) mobiliar(K, q);
    for (const e of escs) K.p.objetos.push(escadaObj(e[0], e[1], e[2], nivel, e[3]));
    return { K, B, nivel };
  }
  /* (lote 141) O 1º porão dividido: a parte comum (com a escada) à esquerda; a base secreta à direita, atrás de uma
     parede com a porta secreta (do lado da parte comum, ninguém vê o vão). */
  function fazPoraoDividido(o, lugar, W, H, nivel, rect, cfg, base, escs) {
    if (rect.w < 8) return fazAndar(o, lugar, W, H, nivel, rect, cfg, escs);
    const K = plano(lugar, W, H, KIT().sub(o.seed, 300 + nivel), o);
    K.p.guardas_ = o.guardas; K.p.nivel = nivel; K.p.fundo = 'rocha';
    for (const e of escs) K.reserva.add(e[0] + ',' + e[1]);
    // (lote 146) uma sala só na base (a "sala secreta"): ela fica com uma faixa estreita, inteira
    const so1 = base.length === 1, wl = so1 ? rect.w - clamp(Math.round(rect.w * 0.3), 4, 8) : clamp(Math.round(rect.w * 0.55), 4, rect.w - 4), xs = rect.x + wl, yd = rect.y + Math.floor(rect.h / 2);
    K.reserva.add((xs - 1) + ',' + yd); K.reserva.add(xs + ',' + yd);
    const comum = { portaFrente: false, fundosPorta: false, janelas: false, corredor: rect.h >= 9, larg: 2, min: 3, max: 6, extra: 0.25, pisoBase: 'laje' };
    const BL = predio(K, rect.x, rect.y, wl, rect.h, Object.assign({}, comum, cfg, { portaFrente: false, fundosPorta: false, janelas: false, secreta: null }));
    const BR = predio(K, xs, rect.y, rect.w - wl, rect.h, Object.assign({}, comum, { corredor: false, min: so1 ? rect.w - wl : 3, max: so1 ? rect.w - wl : 5, extra: 0.5, entrada: base[0], papeis: base.slice(1), resto: ['deposito'], trancar: ['cofreForte', 'cela'], nivelSala: 'dificil' }));
    // a linha entre as duas: tira as paredes das duas e põe uma só, com a porta secreta no meio
    const naLinha = w => w.x1 === xs && w.x2 === xs && Math.min(w.y1, w.y2) >= rect.y && Math.max(w.y1, w.y2) <= rect.y + rect.h;
    K.p.paredes = K.p.paredes.filter(w => !naLinha(w));
    K.p.pintados = K.p.pintados.filter(f => !(f.k === 'paredeFina' && naLinha(f)));
    K.parede(xs, rect.y, xs, yd, 'wall'); K.parede(xs, yd, xs, yd + 1, 'door', { secret: true }); K.parede(xs, yd + 1, xs, rect.y + rect.h, 'wall');
    K.pinta('paredeFina', { x1: xs, y1: rect.y, x2: xs, y2: rect.y + rect.h });
    K.marca('interesse', xs - 1, yd, 'Passagem secreta: a base', 'Uma parede falsa no porão: atrás dela fica a base secreta.');
    const B = { salas: BL.salas.concat(BR.salas), corr: BL.corr, portas: BL.portas.concat(BR.portas), janelas: [] };
    for (const q of B.salas) mobiliar(K, q);
    for (const e of escs) K.p.objetos.push(escadaObj(e[0], e[1], e[2], nivel, e[3]));
    return { K, B, nivel };
  }
  /* Os andares de um prédio: defs = { cima: [cfg do 1º, cfg do 2º], porao: cfg } (as cfg do predio); o térreo (Kt, Bt)
     ganha as escadas. → os andares todos, o térreo primeiro: [{ K, B, nivel }] */
  /* (lote 141) Até 5 andares em cima (as escadas sobe e sobe2 se revezam) e até 2 de porão; com a base secreta, o
     porão se divide (1 porão) ou o 2º porão é a base, com o alçapão escondido no 1º. As salas de cada andar vêm da
     escolha do mestre (o tema e os chips: a primeira é a da escada); o resto (as medidas, as trancas) vem de defs. */
  function andares(o, lugar, W, H, Kt, Bt, rect, E, defs) {
    const a = o.and || PlantaAndares.normalizar(null, catF(lugar), { cima: o.cima, porao: o.porao }), cat = catF(lugar);
    const L = defs.cima || [], N = L.length ? a.cima : 0, P = defs.porao ? a.porao : 0, F = [{ K: Kt, B: Bt, nivel: 0 }];
    const cfgCima = n => (n <= L.length - 1 ? L[n - 1] : n === N ? L[L.length - 1] : L[Math.max(0, L.length - 2)]);
    const comLista = (cfg, l) => (l && l.length ? Object.assign({}, cfg, { entrada: l[0], papeis: l.slice(1) }) : cfg);
    const pos = k => (k % 2 ? E.sobe : E.sobe2);                    // a escada entre o andar k − 1 e o k
    if (N) Kt.p.objetos.push(escadaObj(E.sobe[0], E.sobe[1], 1, 0));
    if (P) Kt.p.objetos.push(escadaObj(E.desce[0], E.desce[1], -1, 0));
    for (let n = 1; n <= N; n++) F.push(fazAndar(o, lugar, W, H, n, rect, comLista(cfgCima(n), PlantaAndares.salasDe(a, cat, n)), [[pos(n)[0], pos(n)[1], n - 1]].concat(n < N ? [[pos(n + 1)[0], pos(n + 1)[1], n + 1]] : [])));
    const base = PlantaAndares.salasDe(a, cat, 'base'), cfgBase = { entrada: base[0], papeis: base.slice(1), resto: ['deposito'], trancar: ['cofreForte', 'cela'], nivelSala: 'dificil' };
    if (P >= 1) {
      const escs = [[E.desce[0], E.desce[1], 0]].concat(P === 2 ? [[E.desce2[0], E.desce2[1], -2, a.base]] : []), cfg = comLista(defs.porao, PlantaAndares.salasDe(a, cat, -1));
      F.push(a.base && P === 1 ? fazPoraoDividido(o, lugar, W, H, -1, rect, cfg, base, escs) : fazAndar(o, lugar, W, H, -1, rect, cfg, escs));
    }
    if (P === 2) {
      const f = fazAndar(o, lugar, W, H, -2, rect, a.base ? Object.assign({}, defs.porao, cfgBase) : comLista(defs.porao, PlantaAndares.salasDe(a, cat, -2)), [[E.desce2[0], E.desce2[1], -1]]);
      if (a.base) f.K.marca('interesse', E.desce2[0], E.desce2[1], 'A base secreta', 'O 2º porão: só se chega pelo alçapão escondido no 1º porão.');
      F.push(f);
    }
    return F;
  }
  // a sala de um papel, no primeiro andar que tiver (na ordem pedida dos níveis) → { K, q } | null
  function salaEm(F, papel, ordem) {
    for (const n of ordem || F.map(f => f.nivel)) { const f = F.find(x => x.nivel === n); const q = f && f.B.salas.find(s2 => s2.papel === papel); if (q) return { K: f.K, q }; }
    return null;
  }
  // os guardas dos andares (o térreo já tem os dele): a ronda do corredor e um posto no meio; e o porão, um posto
  function guardasDosAndares(F, o) {
    for (const f of F) {
      if (f.nivel === 0) continue;
      const K = f.K, c = f.B.corr;
      if (c) {
        if (f.nivel === 1 || qtd(K, [0, 0, 1])) ronda(K, [[c.x + 1, c.y], [c.x + c.w - 2, c.y]], 'ida', { passo: 3, r: 6, a: 80 });
        const px = c.x + Math.floor(c.w / 2), py = c.y + c.h - 1;
        if (qtd(K, [0, 1, 1]) && f.nivel !== 2 && !K.p.guardas.some(g => g.x === px && g.y === py)) posto(K, px, py, f.nivel < 0 ? 'n' : 's', { r: 5 });
      } else if (qtd(K, [0, 1, 1]) || f.nivel === 1) {
        const q = f.B.salas.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0], x = q.x + Math.floor(q.w / 2), y = q.y + Math.floor(q.h / 2);
        if (K.livreR(x, y)) { K.ocupa(x, y, 1, 1); posto(K, x, y, 'n', { r: 5, a: 140 }); }
      }
    }
  }
  // o fim dos andares: o resumo de cada um e a lista no plano do térreo
  function fechaAndares(p, F, lugar, o) { p.andares = F.filter(f => f.nivel !== 0).map(f => { const q = fim(f.K.p, lugar, o); q.nomeAndar = NOME_ANDAR(f.nivel); return q; }); }
  // as escolhas dos andares (a janela): de cima 0 a 5, o porão (0 a 2) e a base secreta (lote 141)
  const ANDARES_OK = { sobmedida: true, mansao: true, casarao: true, fortaleza: true, guilda: true, ruas: true, torre: true };
  const T_CIMA = {
    nobres: { n: 'Quartos nobres', lista: ['sala', 'quartoSenhor', 'banheiro', 'escritorio', 'quarto', 'quarto'] },
    misterio: { n: 'Quartos e a sala misteriosa', lista: ['sala', 'misteriosa', 'quartoSenhor', 'banheiro', 'quarto', 'quarto'] },      // (lote 146)
    quartos: { n: 'Quartos', lista: ['quarto', 'banheiro', 'quarto', 'sala'] },
    servico: { n: 'Serviço', lista: ['cozinha', 'despensa', 'criados', 'deposito'] },
    trabalho: { n: 'Trabalho', lista: ['escritorio', 'arquivo', 'biblioteca', 'escritorio'] },
    luxo: { n: 'Luxo', lista: ['salao', 'galeria', 'biblioteca', 'banheiro', 'capela'] },
    quartel: { n: 'Quartel', lista: ['dormitorio', 'comandante', 'dormitorio', 'dormitorio'] },
    torreGuarda: { n: 'Guarda da torre', lista: ['dormitorio', 'deposito'] },
    vigia: { n: 'Alto da torre (o vigia)', lista: ['vigia'] },
    sotao: { n: 'Sótão', lista: ['sotao', 'criados', 'deposito'] },
    deposito: { n: 'Depósito', lista: ['deposito', 'deposito', 'despensa'] },
  };
  const T_PORAO = {
    adega: { n: 'Adega e despensa', lista: ['adega', 'deposito', 'despensa'] },
    celas: { n: 'Celas', lista: ['guarda', 'cela', 'cela', 'cela'] },
    tesouro: { n: 'Cofre forte', lista: ['guarda', 'cofreForte', 'deposito'] },
    deposito: { n: 'Depósito', lista: ['deposito', 'deposito', 'adega'] },
  };
  const PADRAO_CIMA = { mansao: 'nobres', casarao: 'misterio', fortaleza: 'quartel', guilda: 'trabalho', ruas: 'quartos', torre: 'torreGuarda' };
  const PADRAO_PORAO = { mansao: 'adega', casarao: 'adega', fortaleza: 'celas', guilda: 'tesouro', ruas: 'adega', torre: 'celas' };
  const catF = lugar => {
    const cima = Object.assign({}, T_CIMA);
    if (lugar !== 'torre') { delete cima.torreGuarda; delete cima.vigia; }
    return {
      salas: Object.keys(MOB).filter(k => !['corredor', 'tenda', 'torre', 'estabulo'].includes(k)), cima, porao: T_PORAO,
      base: ['reuniao', 'arsenal', 'dormitorio', 'laboratorio', 'cofreForte', 'cela', 'tunel', 'secreta'],      // (lote 146: e a sala secreta, neutra)
      padrao: (n, N) => (n < 0 ? PADRAO_PORAO[lugar] || 'adega' : N >= 2 && n === N ? (lugar === 'torre' ? 'vigia' : 'sotao') : PADRAO_CIMA[lugar] || 'quartos'),
    };
  };

  /* ================= a mansão do nobre ================= */
  function gerarMansao(o) {
    const k = TAM[o.tamanho].k, W = Math.round(44 * k), H = Math.round(34 * k), K = plano('mansao', W, H, o.seed, o), { p, r } = K;
    p.guardas_ = o.guardas;
    K.pinta('piso', { x: 0, y: H - 2, w: W, h: 2, tipo: 'calcada' });                         // a rua de fora
    const mx0 = 2, my0 = 2, mx1 = W - 2, my1 = H - 2, gx = Math.round(W / 2);
    // o prédio: no meio, mais para o fundo do terreno
    const bw = Math.round(W * 0.62), bh = Math.max(12, Math.round(H * 0.5)), bx = Math.floor((W - bw) / 2), by = my0 + 4;
    // a ronda de fora passa a 2 quadrados do prédio: nada fica nesse caminho
    const rota = volta({ x: bx, y: by, w: bw, h: bh }, 2, { x0: mx0 + 1, y0: my0 + 1, x1: mx1 - 2, y1: my1 - 2 });
    const caminhoRota = () => { const [[ax, ay], [bx2, , ], [, by2]] = [rota[0], rota[1], rota[2]]; for (let x = ax; x <= bx2; x++) { K.reserva.add(x + ',' + ay); K.reserva.add(x + ',' + by2); } for (let y = ay; y <= by2; y++) { K.reserva.add(ax + ',' + y); K.reserva.add(bx2 + ',' + y); } };
    caminhoRota();
    muro(K, mx0, my0, mx1, my1, 'muro', [{ horiz: true, a: my1, de: gx - 1, ate: gx + 1 }]);
    portao(K, gx, my1);
    K.pinta('caminho', { pts: [[gx, H - 0.5], [gx, by + bh + 0.5]], w: 2.2, tipo: 'terra' });
    for (let y = by + bh; y < my1; y++) for (const x of [gx - 1, gx]) K.reserva.add(x + ',' + y);
    // (lote 122) com andar de cima, os quartos e o escritório sobem; embaixo ficam as salas e o serviço
    const rect = { x: bx, y: by, w: bw, h: bh }, sobe = o.cima > 0;
    const B = predio(K, bx, by, bw, bh, Object.assign({ corredor: true, larg: 2, min: 4, max: 7, fundos: ['cozinha', 'despensa', 'criados'], trancada: true, nivelFrente: 'medio', fundosPorta: true, nivelFundos: 'facil', nivelSala: 'dificil', extra: 0.3, piso: { cozinha: 'laje', despensa: 'laje', capela: 'laje', banheiro: 'ladrilho' } },
      sobe ? { papeis: ['salao', 'cozinha', 'banheiro', 'biblioteca', 'galeria', 'despensa', 'capela'], resto: ['sala'], trancar: [], secreta: 'biblioteca' }
        : { papeis: ['salao', 'quartoSenhor', 'banheiro', 'escritorio', 'biblioteca', 'cozinha', 'galeria', 'despensa', 'criados'], resto: ['quarto', 'quarto', 'capela'], trancar: ['escritorio', 'quartoSenhor'], secreta: 'escritorio' }));
    const E = escadas(K, B, rect, o);
    for (const q of B.salas) mobiliar(K, q);
    // o jardim: as sebes junto do muro, as árvores nos cantos, a fonte e as estátuas na frente
    const frente = { x0: mx0 + 1, y0: by + bh + 3, x1: mx1 - 2, y1: my1 - 2 };
    if (frente.y1 - frente.y0 >= 2) {
      const fx = gx + (r() < 0.5 ? -6 : 4), fy = Math.round((frente.y0 + frente.y1) / 2) - 1;
      K.poeR('fonte', fx, fy, 2, 2, 0);
      for (const sx of [gx - 3, gx + 2]) K.poe1('estatua', sx, frente.y0);
    }
    for (let x = mx0 + 1; x < mx1 - 1; x += 1) { if (Math.abs(x - gx) <= 2) continue; if (r() < 0.55) K.poe1('arbusto', x, my1 - 1); if (r() < 0.45) K.poe1('arbusto', x, my0); }
    for (let y = my0 + 1; y < my1 - 1; y++) { if (r() < 0.45) K.poe1('arbusto', mx0, y); if (r() < 0.45) K.poe1('arbusto', mx1 - 1, y); }
    for (const [x, y] of [[mx0 + 1, my0 + 1], [mx1 - 3, my0 + 1], [mx0 + 1, my1 - 3], [mx1 - 3, my1 - 3]]) K.poeR('arvore', x, y, 2, 2, 0);
    for (let i = 0; i < 6; i++) K.poe1('flores', K.ri(mx0 + 2, mx1 - 3), K.ri(frente.y0, Math.max(frente.y0, frente.y1)));
    // as luzes: o portão, a porta da frente; o resto do jardim fica no escuro
    K.poe1('tocha', gx - 2, my1 - 1); K.poe1('tocha', gx + 1, my1 - 1);
    if (B.porta) { K.poe1('lampiao', B.porta.x - 2, B.porta.y); K.poe1('lampiao', B.porta.x + 2, B.porta.y); }
    // as entradas escondidas: a hera do muro (do lado de fora, nos fundos), o bueiro (no canto dos fundos)
    const hx = K.ri(mx0 + 3, mx1 - 4);
    K.p.objetos.push({ id: 'hera', x: hx, y: my0 - 1, s: 1, rot: 180 }); K.marca('interesse', hx + 1, my0 - 1, 'Entrada: a hera do muro', 'Dá para escalar o muro aqui (fora da vista do portão).');
    const bx2 = r() < 0.5 ? mx0 + 2 : mx1 - 3, byy = my0 + 1;
    if (K.poe1('bueiro', bx2, byy)) { K.p.entradas.push({ x: bx2, y: byy, n: 'O bueiro (desce ao esgoto)', gera: { t: 'masmorra', m: 'esgoto', n: 1, tam: 'pequeno', e: o.estilo || 'comum', s: (KIT().sub(o.seed, 91) % 2147483000) + 1 } }); }
    // (lote 122) os andares: os quartos em cima, o sótão, a adega embaixo
    const F = andares(o, 'mansao', W, H, K, B, rect, E, {
      cima: [{ entrada: 'sala', papeis: ['quartoSenhor', 'banheiro', 'escritorio', 'quarto', 'quarto'], resto: ['quarto'], piso: { banheiro: 'ladrilho' }, trancar: ['escritorio', 'quartoSenhor'], nivelSala: 'dificil', secreta: 'escritorio', janelaCorredor: true },
        { entrada: 'sotao', papeis: ['criados', 'criados'], resto: ['sotao'], trancar: [] }],
      porao: { entrada: 'adega', papeis: ['adega', 'cela', 'deposito'], resto: ['deposito'], trancar: ['cela'], nivelSala: 'medio' } });
    // a escada de mão no jardim, debaixo da janela destrancada do 1º andar
    const f1 = F.find(f => f.nivel === 1), ja = f1 && f1.B.janelaAberta;
    if (ja) {
      const u = ja.u, [lx, ly, rt] = ja.lado === 's' ? [u.x1, u.y1, 0] : ja.lado === 'n' ? [u.x1, u.y1 - 2, 0] : ja.lado === 'o' ? [u.x1 - 2, u.y1, 90] : [u.x1, u.y1, 90];
      if (K.livre(lx, ly) && K.livre(lx + (rt ? 1 : 0), ly + (rt ? 0 : 1))) { K.p.objetos.push({ id: 'escadaMao', x: lx, y: ly, s: 2, fw: 1, fh: 2, rot: rt }); K.ocupa(lx, ly, rt ? 2 : 1, rt ? 1 : 2); K.marca('interesse', lx + (rt ? 0 : 1), ly + (rt ? 1 : 0), 'Entrada: a janela do 1º andar', 'A escada de mão (dos jardineiros) chega até uma janela destrancada do 1º andar.'); }
    }
    // (lote 125) a casinha do cão no jardim, junto da casa
    for (const [x, y] of [[bx - 3, by + bh - 2], [bx + bw + 1, by + bh - 2], [bx - 3, by + 2], [bx + bw + 1, by + 2]]) if (K.poe1('casinhaCao', x, y, 0, { n: 'A casinha do cão', notas: 'O cão late para quem não conhece.' })) break;
    // os quadros na parede (um deles pode esconder o cofre) e a cômoda, a penteadeira, a escrivaninha
    for (const f of F) for (const q of f.B.salas) {
      if (q.papel === 'quartoSenhor') { encosta(f.K, q, 'penteadeira', 2, 1, 1); encosta(f.K, q, 'quadro', 1, 1, 1); }
      if (q.papel === 'escritorio') { encosta(f.K, q, 'escrivaninha', 2, 1, 1); encosta(f.K, q, 'quadro', 1, 1, 1); }
      if (q.papel === 'quarto' && f.K.r() < 0.5) encosta(f.K, q, 'comoda', 2, 1, 1);
      if (q.papel === 'sala' || q.papel === 'salao') { encosta(f.K, q, 'relogioPe', 1, 1, 1); canto(f.K, q, 'lustre'); }
    }
    // o alvo (no andar que tiver a sala)
    const a = alvoDe(K, 'mansao', o.alvo), sala = pap => salaEm(F, pap, [1, 0, 2, -1]) || { K, q: B.salas[1] };
    if (a === 'cofre') { const S2 = sala('escritorio'); alvo(S2.K, S2.q, 'cofre', { id: 'cofreParede', n: 'O cofre do senhor', notas: 'Atrás do quadro, trancado (fechadura difícil).' }); }
    else if (a === 'documento') { const S2 = sala('escritorio'); alvo(S2.K, S2.q, 'documento', { n: 'O documento', notas: 'Na escrivaninha do escritório (ou no cofre, se o mestre quiser).' }); }
    else if (a === 'pessoa') { const S2 = sala('quartoSenhor'); alvo(S2.K, S2.q, 'pessoa', { n: 'O senhor da casa', notas: 'Dormindo.' }); }
    else { const S2 = sala('galeria'); alvo(S2.K, S2.q, 'artefato', { id: 'calice', n: 'A relíquia', notas: 'Exposta na galeria.' }); }
    // os guardas: no portão, a ronda do jardim, a do corredor e o posto na porta do escritório
    posto(K, gx - 2, my1 - 2, 's', { r: 7 });
    if (qtd(K, [0, 1, 1])) posto(K, gx + 1, my1 - 2, 's', { r: 7 });
    ronda(K, rota, 'volta', { k: 0, passo: 4, r: 6 });
    if (qtd(K, [0, 0, 1])) ronda(K, rota, 'volta', { k: 2, passo: 4, r: 6 });
    if (B.corr) ronda(K, [[B.corr.x + 1, B.corr.y], [B.corr.x + B.corr.w - 2, B.corr.y]], 'ida', { passo: 3, r: 6, a: 80 });
    if (qtd(K, [0, 1, 1])) { const S2 = sala('escritorio'), f = F.find(x => x.K === S2.K), c = f && f.B.corr, e = S2.q; if (c) { const x = clamp(e.x + Math.floor(e.w / 2), c.x + 1, c.x + c.w - 2); posto(S2.K, x, e.faixa === 'n' ? c.y : c.y + c.h - 1, e.faixa === 'n' ? 'n' : 's', { r: 5 }); } }
    if (qtd(K, [0, 0, 1]) && B.fundos) posto(K, B.fundos.fora[0], B.fundos.fora[1] - 1, 'n', { r: 6 });
    guardasDosAndares(F, o);
    sombras(K, qtd(K, [3, 4, 4]), { x0: mx0 + 1, y0: my0 + 1, x1: mx1 - 2, y1: my1 - 2 });
    p.cena = B.porta ? [B.porta.x, B.porta.y - 2] : [gx, by + 2];
    p.chegada = [gx, H - 1];
    fechaAndares(p, F, 'mansao', o);
    return fim(p, 'mansao', o);
  }

  /* ================= (lote 146) o casarão com jardim =================
     A casa grande e bem arrumada (não é mansão) na frente do terreno, com o escritório; o jardim enorme atrás e do lado:
     as estufas (paredes de vidro, os canteiros dentro), a casa de ferramentas, o altar num canto quieto (no círculo de
     sebes), a fonte, os bancos, o poço, a horta e o pomar. O andar de cima (os quartos e a sala misteriosa) e o porão. */
  function gerarCasarao(o) {
    const k = TAM[o.tamanho].k, W = Math.round(60 * k), H = Math.round(46 * k), K = plano('casarao', W, H, o.seed, o), { p, r } = K;
    p.guardas_ = o.guardas;
    K.pinta('piso', { x: 0, y: H - 2, w: W, h: 2, tipo: 'calcada' });                         // a rua de fora
    const mx0 = 2, my0 = 2, mx1 = W - 2, my1 = H - 2, gx = Math.round(W * 0.3);
    // a casa: na frente do terreno, à esquerda; o jardim fica atrás (ao norte) e do lado (a leste)
    const bw = Math.round(W * 0.4), bh = Math.max(12, Math.round(H * 0.32)), bx = Math.max(mx0 + 4, gx - Math.round(bw / 2)), by = my1 - 5 - bh;
    const rect = { x: bx, y: by, w: bw, h: bh }, sobe = o.cima > 0;
    const rota = volta(rect, 2, { x0: mx0 + 1, y0: my0 + 1, x1: mx1 - 2, y1: my1 - 2 });
    { const [[ax, ay], [bx2], [, by2]] = [rota[0], rota[1], rota[2]]; for (let x = ax; x <= bx2; x++) { K.reserva.add(x + ',' + ay); K.reserva.add(x + ',' + by2); } for (let y = ay; y <= by2; y++) { K.reserva.add(ax + ',' + y); K.reserva.add(bx2 + ',' + y); } }
    muro(K, mx0, my0, mx1, my1, 'muro', [{ horiz: true, a: my1, de: gx - 1, ate: gx + 1 }]);
    portao(K, gx, my1);
    K.pinta('caminho', { pts: [[gx, H - 0.5], [gx, by + bh + 0.5]], w: 2.2, tipo: 'terra' });
    for (let y = by + bh; y < my1; y++) for (const x of [gx - 1, gx]) K.reserva.add(x + ',' + y);
    const B = predio(K, bx, by, bw, bh, Object.assign({ corredor: true, larg: 2, min: 4, max: 7, entrada: 'sala', fundos: ['cozinha', 'despensa'], trancada: true, nivelFrente: 'medio', fundosPorta: true, nivelFundos: 'facil', nivelSala: 'dificil', extra: 0.3, piso: { cozinha: 'laje', despensa: 'laje', banheiro: 'ladrilho' } },
      sobe ? { papeis: ['escritorio', 'salao', 'cozinha', 'banheiro', 'biblioteca', 'despensa'], resto: ['sala'], trancar: ['escritorio'] }
        : { papeis: ['escritorio', 'salao', 'quartoSenhor', 'banheiro', 'cozinha', 'biblioteca', 'despensa'], resto: ['quarto', 'misteriosa'], trancar: ['escritorio', 'quartoSenhor', 'misteriosa'] }));
    const E = escadas(K, B, rect, o);
    for (const q of B.salas) mobiliar(K, q);
    // os caminhos do jardim (de cascalho): da porta dos fundos à fonte, e dela às estufas, à casa de ferramentas e ao altar
    const fy = Math.round((my0 + by) / 2) - 1, fx = Math.round(bx + bw / 2) + 2;
    const fundos = B.fundos ? B.fundos.fora : [fx, by - 1];
    const caminho = pts => { K.pinta('caminho', { pts: pts.map(([x, y]) => [x + 0.5, y + 0.5]), w: 1.6, tipo: 'terra' }); for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [cx, cy] = pts[i], n = Math.max(Math.abs(cx - ax), Math.abs(cy - ay)); for (let s2 = 0; s2 <= n; s2++) K.reserva.add(Math.round(ax + (cx - ax) * s2 / (n || 1)) + ',' + Math.round(ay + (cy - ay) * s2 / (n || 1))); } };
    // as estufas: duas (três, no grande), em fileira no canto de cima à direita; a porta embaixo, no meio
    const ew = 9, eh = 6, ne = W >= 66 ? 3 : 2, ey = my0 + 3, estufas = [];
    for (let i = 0; i < ne; i++) {
      const ex = mx1 - 3 - ew - i * (ew + 2);
      const q = KIT().construcao(K, ex, ey, ew, eh, { lado: 's' }, 'terra', 'estufa', { k: 'mureta', vidro: true });      // (o vidro: barra a passagem, não a vista)
      KIT().dentro(K, q, () => {
        for (let x = ex; x + 2 <= ex + ew; x += 2) { K.poeR('canteiro', x, ey, 2, 1, 0); if (x + 2 <= ex + ew && Math.abs(x + 1 - (ex + Math.floor(ew / 2))) > 1) K.poeR('canteiro', x, ey + eh - 1, 2, 1, 0); }
        for (let x = ex + 1; x + 2 <= ex + ew - 1; x += 3) K.poeR('canteiro', x, ey + 2, 2, 1, 0);
        K.poe1('jarro', ex + ew - 1, ey + 3); K.poe1('carrinhoMao', ex, ey + 3);
      });
      K.ocupa(ex, ey, ew, eh);
      estufas.push(q);
      caminho([[ex + Math.floor(ew / 2), ey + eh], [ex + Math.floor(ew / 2), fy + 1]]);
    }
    K.marca('interesse', estufas[0].x + 1, estufas[0].y + eh, 'As estufas', 'Paredes de vidro: quem está dentro vê o jardim, e é visto. Os canteiros escondem quem se agacha.');
    // a casa de ferramentas: madeira, a porta para o caminho; dentro, a bancada, o carrinho, os sacos e o barril
    const tw = 6, th = 4, tx = mx1 - 2 - tw, ty = ey + eh + 4;
    const qt = KIT().construcao(K, tx, ty, tw, th, { lado: 'o' }, 'madeira', 'ferramentas');
    KIT().dentro(K, qt, () => { K.poeR('bancada', tx + 1, ty, 2, 1, 0); K.poe1('carrinhoMao', tx + tw - 1, ty + th - 1); K.poe1('sacos', tx + tw - 1, ty); K.poe1('barril', tx, ty + th - 1); K.poe1('caixote', tx + 3, ty + th - 1); K.poe1('lampiao', tx, ty); });
    K.ocupa(tx, ty, tw, th);
    caminho([[tx - 1, ty + Math.floor(th / 2)], [fx + 3, ty + Math.floor(th / 2)], [fx + 3, fy + 1]]);
    esconderijo(K, tx + 2, ty + 1, 'feno', 'Atrás da bancada, debaixo dos sacos');
    // o altar: no canto de cima à esquerda, num círculo de sebes, com a abertura para o caminho
    const ax = mx0 + 6, ay = my0 + 5;
    for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2, x = Math.round(ax + Math.cos(ang) * 4), y = Math.round(ay + Math.sin(ang) * 3.5); if (a >= 1 && a <= 3) continue; K.poe1('arbusto', x, y); }
    K.poe1('altar', ax, ay, 0, { n: 'O altar do jardim', notas: 'Um altar pequeno, de pedra, com flores frescas.' });
    K.poe1('vela', ax - 1, ay); K.poe1('vela', ax + 1, ay); K.poe1('estatua', ax, ay - 2); K.poe1('flores', ax - 1, ay + 1); K.poe1('flores', ax + 1, ay + 1); K.poe1('banco', ax - 1, ay + 2);
    caminho([[ax + 3, ay + 3], [ax + 3, fy + 1], [fx, fy + 1]]);
    K.marca('interesse', ax, ay + 1, 'O altar do jardim', 'No círculo de sebes: de fora, quase não se vê quem está dentro.');
    // a fonte no meio do jardim, os bancos e o caminho da porta dos fundos
    caminho([[fundos[0], fundos[1]], [fundos[0], fy + 1], [fx, fy + 1]]);
    // (lote 148) metade das vezes, a piscina no lugar da fonte: o deck de tábuas, a borda de pedra, as espreguiçadeiras
    const pw = 10, ph = 5, px = fx - Math.floor(pw / 2) + 1, py = fy - ph - 2;
    const cabe = () => { for (let y = py - 1; y < py + ph + 3; y++) for (let x = px - 1; x < px + pw + 1; x++) if (!K.livre(x, y) || K.reserva.has(x + ',' + y)) return false; return true; };
    if (r() < 0.5 && py - 1 > my0 + 1 && cabe()) {
      K.pinta('piso', { x: px - 1, y: py - 1, w: pw + 2, h: ph + 4, tipo: 'deck' });
      K.pinta('piscina', { x: px, y: py, w: pw, h: ph, borda: 0.5 });
      K.ocupa(px, py, pw, ph);
      K.p.objetos.push({ id: 'escadaPiscina', x: px + pw - 2, y: py + 1, s: 1 }, { id: 'boia', x: px + 2 + K.ri(0, pw - 5), y: py + 2, s: 1 });
      for (const x of [px, px + 2, px + pw - 3, px + pw - 1]) K.poeR('espreguicadeira', x, py + ph + 1, 1, 2, 0);
      K.poeR('guardaSol', px + Math.floor(pw / 2) - 1, py + ph + 1, 2, 2, 0);
      for (const [x, y] of [[px - 1, py - 1], [px + pw, py - 1]]) K.poe1('lampiao', x, y);
      K.marca('interesse', px, py + ph, 'A piscina', 'Quem entra na água faz barulho; dá para se esconder agachado atrás das espreguiçadeiras.');
    } else {
      K.poeR('fonte', fx, fy - 2, 2, 2, 0);
      for (const [x, y] of [[fx - 3, fy - 2], [fx + 3, fy - 2]]) K.poeR('banco', x, y, 2, 1, 90);
      for (const [x, y] of [[fx - 1, fy - 4], [fx + 2, fy - 4]]) K.poe1('estatua', x, y);
    }
    // a mesa de jardim com o guarda-sol, perto da casa
    { const mxj = bx + bw + 3, myj = by + 1; if (K.poeR('mesaJardim', mxj, myj, 2, 2, 0)) K.poeR('guardaSol', mxj + 2, myj, 2, 2, 0); }
    // os canteiros de flores dos dois lados dos caminhos (deixam o caminho livre)
    for (const c of p.pintados.filter(x => x.k === 'caminho' && x.w < 2)) for (let i = 1; i < c.pts.length; i++) {
      const [ax2, ay2] = c.pts[i - 1], [bx3, by3] = c.pts[i], n = Math.max(Math.abs(bx3 - ax2), Math.abs(by3 - ay2)), hz = Math.abs(bx3 - ax2) > Math.abs(by3 - ay2);
      for (let s2 = 1; s2 < n; s2 += 2) { const x = Math.floor(ax2 + (bx3 - ax2) * s2 / n), y = Math.floor(ay2 + (by3 - ay2) * s2 / n); if (r() < 0.6) K.poe1(r() < 0.7 ? 'flores' : 'arbusto', hz ? x : x - 2, hz ? y - 2 : y); if (r() < 0.6) K.poe1(r() < 0.7 ? 'flores' : 'arbusto', hz ? x : x + 2, hz ? y + 2 : y); }
    }
    K.poe1('poco', tx - 3, ty + th + 2);
    // a horta, ao lado das estufas
    for (let i = 0; i < 4; i++) K.poeR('canteiro', mx1 - 3 - ew * ne - 2 * ne + 2 + i * 3, ey + eh + 2, 2, 1, 0);
    // o pomar (do lado da casa) e as árvores soltas do jardim; as sebes junto do muro
    // o pomar: as árvores em fileiras (com um pouco de sorteio), do lado da casa
    for (let y = ty + th + 5; y < my1 - 3; y += 4) for (let x = bx + bw + 5; x < mx1 - 3; x += 4) if (r() < 0.8) K.poeR('arvore', x + K.ri(0, 1), y + K.ri(0, 1), 2, 2, 0);
    mato(K, { x0: mx0 + 2, y0: ay + 6, x1: bx - 2, y1: by + bh }, Math.round(5 * k));
    mato(K, { x0: mx0 + 12, y0: my0 + 2, x1: fx - 4, y1: fy - 3 }, Math.round(5 * k));
    mato(K, { x0: bx + bw + 3, y0: fy + 3, x1: tx - 4, y1: by + 4 }, Math.round(4 * k));
    for (let x = mx0 + 1; x < mx1 - 1; x += 1) { if (Math.abs(x - gx) <= 2) continue; if (r() < 0.5) K.poe1('arbusto', x, my1 - 1); }
    for (let y = my0 + 1; y < my1 - 1; y++) { if (r() < 0.35) K.poe1('arbusto', mx0, y); if (r() < 0.35) K.poe1('arbusto', mx1 - 1, y); }
    for (let i = 0; i < Math.round(10 * k); i++) K.poe1('flores', K.ri(mx0 + 2, mx1 - 3), K.ri(my0 + 2, my1 - 3));
    // as luzes: o portão e a porta da frente; o jardim fica no escuro (só a fonte tem um lampião)
    K.poe1('tocha', gx - 2, my1 - 1); K.poe1('tocha', gx + 1, my1 - 1);
    if (B.porta) { K.poe1('lampiao', B.porta.x - 2, B.porta.y); K.poe1('lampiao', B.porta.x + 2, B.porta.y); }
    K.poe1('lampiao', fx + 2, fy + 1);
    // as entradas: a hera do muro (nos fundos, atrás do altar), a escada de mão dos jardineiros
    const hx = K.ri(mx0 + 12, mx1 - 4 - ew * ne - 2 * ne);
    K.p.objetos.push({ id: 'hera', x: hx, y: my0 - 1, s: 1, rot: 180 }); K.marca('interesse', hx + 1, my0 - 1, 'Entrada: a hera do muro', 'Dá para escalar o muro aqui, nos fundos do jardim (longe do portão).');
    // os andares: em cima, os quartos e a sala misteriosa; o sótão; embaixo, a adega
    const F = andares(o, 'casarao', W, H, K, B, rect, E, {
      cima: [{ entrada: 'sala', papeis: ['misteriosa', 'quartoSenhor', 'banheiro', 'quarto', 'quarto'], resto: ['quarto'], piso: { banheiro: 'ladrilho' }, trancar: ['misteriosa', 'quartoSenhor'], nivelSala: 'dificil', janelaCorredor: true },
        { entrada: 'sotao', papeis: ['criados'], resto: ['sotao'], trancar: [] }],
      porao: { entrada: 'adega', papeis: ['adega', 'deposito', 'despensa'], resto: ['deposito'], trancar: [], nivelSala: 'medio' } });
    const f1 = F.find(f => f.nivel === 1), ja = f1 && f1.B.janelaAberta;
    if (ja) {
      const u = ja.u, [lx, ly, rt] = ja.lado === 's' ? [u.x1, u.y1, 0] : ja.lado === 'n' ? [u.x1, u.y1 - 2, 0] : ja.lado === 'o' ? [u.x1 - 2, u.y1, 90] : [u.x1, u.y1, 90];
      if (K.livre(lx, ly) && K.livre(lx + (rt ? 1 : 0), ly + (rt ? 0 : 1))) { K.p.objetos.push({ id: 'escadaMao', x: lx, y: ly, s: 2, fw: 1, fh: 2, rot: rt }); K.ocupa(lx, ly, rt ? 2 : 1, rt ? 1 : 2); K.marca('interesse', lx + (rt ? 0 : 1), ly + (rt ? 1 : 0), 'Entrada: a janela do 1º andar', 'A escada de mão dos jardineiros chega até uma janela destrancada do 1º andar.'); }
    }
    // os quadros, a escrivaninha e a penteadeira
    for (const f of F) for (const q of f.B.salas) {
      if (q.papel === 'quartoSenhor') { encosta(f.K, q, 'penteadeira', 2, 1, 1); encosta(f.K, q, 'quadro', 1, 1, 1); }
      if (q.papel === 'escritorio') { encosta(f.K, q, 'escrivaninha', 2, 1, 1); encosta(f.K, q, 'quadro', 1, 1, 1); }
      if (q.papel === 'sala' || q.papel === 'salao') { encosta(f.K, q, 'relogioPe', 1, 1, 1); canto(f.K, q, 'lustre'); }
    }
    // o alvo
    const a = alvoDe(K, 'casarao', o.alvo), sala = pap => salaEm(F, pap, [0, 1, 2, -1]) || { K, q: B.salas[1] };
    if (a === 'cofre') { const S2 = sala('escritorio'); alvo(S2.K, S2.q, 'cofre', { id: 'cofreParede', n: 'O cofre do escritório', notas: 'Atrás do quadro, trancado (fechadura difícil).' }); }
    else if (a === 'documento') { const S2 = sala('escritorio'); alvo(S2.K, S2.q, 'documento', { n: 'O documento', notas: 'Na escrivaninha do escritório.' }); }
    else if (a === 'pessoa') { const S2 = sala('quartoSenhor'); alvo(S2.K, S2.q, 'pessoa', { n: 'O dono da casa', notas: 'Dormindo.' }); }
    else { const S2 = salaEm(F, 'misteriosa', [1, 0, 2, -1]) || sala('biblioteca'); alvo(S2.K, S2.q, 'artefato', { id: 'calice', n: 'O objeto da sala misteriosa', notas: 'O mestre decide o que é.' }); }
    // os guardas: o portão, a ronda em volta da casa, a do jardim (das estufas ao altar) e a da casa
    posto(K, gx - 2, my1 - 2, 's', { r: 7 });
    if (qtd(K, [0, 1, 1])) posto(K, gx + 1, my1 - 2, 's', { r: 7 });
    ronda(K, rota, 'volta', { k: 0, passo: 4, r: 6 });
    ronda(K, [[ax + 6, fy + 1], [fx, fy + 1], [estufas[0].x + Math.floor(ew / 2), fy + 1], [tx - 1, ty + Math.floor(th / 2)]], 'ida', { passo: 4, r: 6 });
    if (qtd(K, [0, 0, 1])) ronda(K, rota, 'volta', { k: 2, passo: 4, r: 6 });
    if (B.corr) ronda(K, [[B.corr.x + 1, B.corr.y], [B.corr.x + B.corr.w - 2, B.corr.y]], 'ida', { passo: 3, r: 6, a: 80 });
    if (qtd(K, [0, 1, 1]) && B.fundos) posto(K, B.fundos.fora[0], B.fundos.fora[1] - 1, 'n', { r: 6 });
    guardasDosAndares(F, o);
    sombras(K, qtd(K, [4, 5, 6]), { x0: mx0 + 1, y0: my0 + 1, x1: mx1 - 2, y1: my1 - 2 });
    p.cena = B.porta ? [B.porta.x, B.porta.y - 2] : [gx, by + 2];
    p.chegada = [gx, H - 1];
    fechaAndares(p, F, 'casarao', o);
    return fim(p, 'casarao', o);
  }

  /* ================= (lote 150) o lugar sob medida =================
     Uma propriedade montada a partir de uma ficha (que a IA preenche com o texto do mestre, ou ele mesmo, na janela):
     o terreno (o tamanho, o muro), a casa (o porte e as salas do térreo; os andares e o porão pela escolha de sempre),
     os anexos do quintal (a piscina, as estufas, a casa de ferramentas, o altar, a fonte, a horta, o pomar, o poço, o
     estábulo, o canil, a mesa de jardim, o varal) e os guardas (ou nenhum). A casa fica na frente; os anexos se arrumam
     no quintal, cada um onde couber, ligados à porta dos fundos por caminhos de cascalho. */
  const ANEXOS = {
    piscina: { n: 'Piscina', w: 14, h: 9 }, estufa: { n: 'Estufa', w: 9, h: 6 }, ferramentas: { n: 'Casa de ferramentas', w: 6, h: 4 },
    altar: { n: 'Altar', w: 9, h: 8 }, fonte: { n: 'Fonte com bancos', w: 7, h: 5 }, horta: { n: 'Horta', w: 9, h: 3 }, pomar: { n: 'Pomar', w: 11, h: 8 },
    poco: { n: 'Poço', w: 2, h: 2 }, estabulo: { n: 'Estábulo', w: 8, h: 6 }, canil: { n: 'Canil', w: 3, h: 3 }, mesaJardim: { n: 'Mesa de jardim', w: 5, h: 3 }, varal: { n: 'Varal', w: 4, h: 3 },
  };
  const PORTES = [['simples', 'Simples'], ['boa', 'Boa'], ['nobre', 'Nobre']];
  const SALAS_TERREO = ['sala', 'cozinha', 'banheiro', 'quarto', 'quartoSenhor', 'escritorio', 'biblioteca', 'salao', 'despensa', 'criados', 'capela', 'galeria', 'vestibulo', 'deposito', 'loja', 'oficina', 'misteriosa', 'laboratorio', 'adega'];
  function specLimpa(s) {
    s = s && typeof s === 'object' ? s : {};
    const terreo = (Array.isArray(s.terreo) ? s.terreo : []).filter(x => SALAS_TERREO.includes(x) && MOB[x]).slice(0, 12);
    const anexos = [];
    for (const a of Array.isArray(s.anexos) ? s.anexos : []) { if (a && ANEXOS[a.t] && !anexos.some(b => b.t === a.t)) anexos.push({ t: a.t, n: clamp(Math.round(Number(a.n) || 1), 1, 4) }); }
    return { terreno: TAM[s.terreno] ? s.terreno : 'medio', muro: s.muro !== false, porte: PORTES.some(p => p[0] === s.porte) ? s.porte : 'boa',
      terreo: terreo.length ? terreo : ['sala', 'cozinha', 'banheiro', 'quarto', 'quarto'], anexos, guardas: ['nenhum', 'poucos', 'normal', 'muitos'].includes(s.guardas) ? s.guardas : 'nenhum' };
  }
  function gerarSobMedida(o) {
    const S = specLimpa(o.spec), k = { pequeno: 0.8, medio: 1, grande: 1.3 }[S.terreno];
    const nAnx = S.anexos.reduce((t, a) => t + ANEXOS[a.t].w * ANEXOS[a.t].h * a.n, 0);
    const W = Math.round(clamp(40 * k + Math.sqrt(nAnx) * 0.6, 30, 80)), H = Math.round(clamp(34 * k + Math.sqrt(nAnx) * 0.4, 26, 64));
    const K = plano('sobmedida', W, H, o.seed, o), { p, r } = K;
    p.guardas_ = S.guardas === 'nenhum' ? 'poucos' : S.guardas;
    K.pinta('piso', { x: 0, y: H - 2, w: W, h: 2, tipo: 'calcada' });
    const mx0 = 2, my0 = 2, mx1 = W - 2, my1 = H - 2;
    if (S.porte !== 'simples') K.pinta('piso', { x: mx0, y: my0, w: mx1 - mx0, h: my1 - my0, tipo: 'grama' });
    // a casa: o tamanho vem do número de salas
    const nS = S.terreo.length + 1, corredor = nS > 3;
    const bw = clamp(Math.round(corredor ? Math.ceil(nS / 2) * 5.5 : nS * 5.5), 8, Math.round(W * 0.55)), bh = corredor ? 13 : 7;
    const gx = Math.round(W * 0.3), bx = clamp(gx - Math.round(bw / 2), mx0 + 3, mx1 - bw - 3), by = my1 - 5 - bh, rect = { x: bx, y: by, w: bw, h: bh };
    const rota = volta(rect, 2, { x0: mx0 + 1, y0: my0 + 1, x1: mx1 - 2, y1: my1 - 2 });
    { const [[ax, ay], [bx2], [, by2]] = [rota[0], rota[1], rota[2]]; for (let x = ax; x <= bx2; x++) { K.reserva.add(x + ',' + ay); K.reserva.add(x + ',' + by2); } for (let y = ay; y <= by2; y++) { K.reserva.add(ax + ',' + y); K.reserva.add(bx2 + ',' + y); } }
    if (S.muro) { muro(K, mx0, my0, mx1, my1, 'muro', [{ horiz: true, a: my1, de: gx - 1, ate: gx + 1 }]); portao(K, gx, my1); }
    K.pinta('caminho', { pts: [[gx, H - 0.5], [gx, by + bh + 0.5]], w: 2.2, tipo: S.porte === 'simples' ? 'terra' : 'calcada' });
    for (let y = by + bh; y < my1; y++) for (const x of [gx - 1, gx]) K.reserva.add(x + ',' + y);
    const entrada = S.terreo.includes('sala') ? 'sala' : S.porte === 'nobre' ? 'vestibulo' : S.terreo[0];
    const papeis = S.terreo.slice(); const ie = papeis.indexOf(entrada); if (ie >= 0) papeis.splice(ie, 1);
    const piso = S.porte === 'nobre' ? { cozinha: 'ladrilho', banheiro: 'ladrilho', despensa: 'laje', sala: 'marmore', vestibulo: 'marmore', salao: 'marmore', galeria: 'marmore' } : { cozinha: 'laje', banheiro: 'ladrilho', despensa: 'laje' };
    const B = predio(K, bx, by, bw, bh, { corredor, larg: 2, min: 4, max: 7, entrada, papeis, fundos: ['cozinha', 'despensa', 'criados'], resto: [S.porte === 'simples' ? 'deposito' : 'sala'], trancada: S.guardas !== 'nenhum', fundosPorta: true, nivelFrente: 'medio', nivelFundos: 'facil', nivelSala: 'medio', extra: 0.3, piso, trancar: ['escritorio', 'misteriosa', 'laboratorio'].filter(x => papeis.includes(x)) });
    const E = escadas(K, B, rect, o);
    for (const q of B.salas) mobiliar(K, q);
    if (S.porte === 'nobre') for (const q of B.salas) { if (q.papel === 'sala' || q.papel === 'salao') { encosta(K, q, 'relogioPe', 1, 1, 1); canto(K, q, 'lustre'); } if (q.papel === 'escritorio') { encosta(K, q, 'escrivaninha', 2, 1, 1); encosta(K, q, 'quadro', 1, 1, 1); } }
    // os anexos: do maior ao menor, cada um no primeiro lugar livre do quintal (com 1 de folga), sorteado entre os que cabem
    const fundos = B.fundos ? B.fundos.fora : [bx + Math.floor(bw / 2), by - 1];
    const livreA = (x, y, w, h) => { for (let j = y - 1; j < y + h + 1; j++) for (let i = x - 1; i < x + w + 1; i++) { if (i < mx0 + 1 || j < my0 + 1 || i > mx1 - 2 || j > my1 - 2) return false; if (!K.livre(i, j) || K.reserva.has(i + ',' + j)) return false; } return true; };
    const lista = []; for (const a of S.anexos) for (let i = 0; i < a.n; i++) lista.push(a.t);
    lista.sort((a, b) => ANEXOS[b].w * ANEXOS[b].h - ANEXOS[a].w * ANEXOS[a].h);
    const postos = [], naoCouberam = [];
    // os caminhos: da porta dos fundos sobe até a faixa de cima da casa, anda por ela e desce (ou sobe) até o anexo; ficam
    // por baixo de tudo (no começo dos pintados)
    const espinha = by - 2;
    const caminho = (ax, ay, cx, cy) => {
      const pts = [[ax, ay], [ax, espinha], [cx, espinha], [cx, cy]];
      const i0 = p.pintados.findIndex(f => f.k === 'piso' && f.tipo === 'grama');      // por cima da grama, por baixo do resto
      p.pintados.splice(i0 + 1, 0, { k: 'caminho', pts: pts.map(([x, y]) => [x + 0.5, y + 0.5]), w: 1.6, tipo: 'terra' });
    };
    for (const t of lista) {
      const A = ANEXOS[t], cand = [];
      for (let y = my0 + 2; y + A.h <= my1 - 2; y++) for (let x = mx0 + 2; x + A.w <= mx1 - 2; x++) if (livreA(x, y, A.w, A.h)) cand.push([x, y]);
      if (!cand.length) { naoCouberam.push(A.n); continue; }
      // perto da casa os de uso (a mesa, o varal, o poço); longe, os quietos (o altar, o pomar); o resto, sorteado
      const d = ([x, y]) => Math.hypot(x + A.w / 2 - fundos[0], y + A.h / 2 - fundos[1]);
      cand.sort((a, b) => d(a) - d(b));
      const ix = ['mesaJardim', 'varal', 'poco', 'horta', 'canil'].includes(t) ? K.ri(0, Math.min(cand.length - 1, 6)) : ['altar', 'pomar'].includes(t) ? K.ri(Math.max(0, cand.length - 8), cand.length - 1) : K.ri(0, cand.length - 1);
      const [x, y] = cand[ix];
      const porta = fazAnexo(K, t, x, y, A.w, A.h, y + A.h <= espinha ? 's' : 'n');
      K.ocupa(x, y, A.w, A.h);
      if (porta) { caminho(fundos[0], fundos[1], porta[0], porta[1]); postos.push(porta); }
    }
    if (naoCouberam.length) p.naoCouberam = naoCouberam;
    // as sebes, as árvores e as flores
    if (S.porte !== 'simples') { for (let x = mx0 + 1; x < mx1 - 1; x++) { if (Math.abs(x - gx) <= 2) continue; if (r() < 0.5) K.poe1('arbusto', x, my1 - 1); } for (let y = my0 + 1; y < my1 - 1; y++) { if (r() < 0.3) K.poe1('arbusto', mx0, y); if (r() < 0.3) K.poe1('arbusto', mx1 - 1, y); } }
    mato(K, { x0: mx0 + 1, y0: my0 + 1, x1: mx1 - 2, y1: my1 - 2 }, Math.round((S.porte === 'simples' ? 4 : 7) * k));
    for (let i = 0; i < Math.round(8 * k); i++) K.poe1('flores', K.ri(mx0 + 2, mx1 - 3), K.ri(my0 + 2, my1 - 3));
    if (S.muro) { K.poe1('tocha', gx - 2, my1 - 1); K.poe1('tocha', gx + 1, my1 - 1); }
    if (B.porta) { K.poe1('lampiao', B.porta.x - 2, B.porta.y); K.poe1('lampiao', B.porta.x + 2, B.porta.y); }
    // os andares e o porão (a escolha de sempre)
    const F = andares(o, 'sobmedida', W, H, K, B, rect, E, {
      cima: [{ entrada: 'sala', papeis: ['quartoSenhor', 'banheiro', 'quarto'], resto: ['quarto'], piso: { banheiro: 'ladrilho' }, trancar: [], nivelSala: 'medio', janelaCorredor: true },
        { entrada: 'sotao', papeis: ['criados'], resto: ['sotao'], trancar: [] }],
      porao: { entrada: 'adega', papeis: ['adega', 'deposito', 'despensa'], resto: ['deposito'], trancar: [], nivelSala: 'medio' } });
    // os guardas (se tem)
    if (S.guardas !== 'nenhum') {
      if (S.muro) posto(K, gx - 2, my1 - 2, 's', { r: 7 });
      ronda(K, rota, 'volta', { k: 0, passo: 4, r: 6 });
      if (postos.length >= 2) ronda(K, postos.slice(0, 4), 'ida', { passo: 4, r: 6 });
      if (qtd(K, [0, 1, 1]) && B.corr) ronda(K, [[B.corr.x + 1, B.corr.y], [B.corr.x + B.corr.w - 2, B.corr.y]], 'ida', { passo: 3, r: 6, a: 80 });
      if (qtd(K, [0, 0, 1])) ronda(K, rota, 'volta', { k: 2, passo: 4, r: 6 });
      guardasDosAndares(F, o);
    } else for (const f of F) f.K.p.guardas.length = 0;
    sombras(K, 4, { x0: mx0 + 1, y0: my0 + 1, x1: mx1 - 2, y1: my1 - 2 });
    p.cena = B.porta ? [B.porta.x, B.porta.y - 2] : [gx, by + 2];
    p.chegada = [gx, H - 1];
    p.spec = S;
    fechaAndares(p, F, 'sobmedida', o);
    return fim(p, 'sobmedida', o);
  }
  // cada anexo, no retângulo dele → o ponto da porta (para o caminho e a ronda do jardim)
  function fazAnexo(K, t, x, y, w, h, lado) {
    const kit = KIT(), sul = lado !== 'n', pt = cx => [cx, sul ? y + h : y - 1];
    if (t === 'piscina') {
      K.pinta('piso', { x, y, w, h, tipo: 'deck' });
      const pw = w - 4, ph = h - 5, px = x + 2, py = y + 1;
      K.pinta('piscina', { x: px, y: py, w: pw, h: ph, borda: 0.5 });
      K.p.objetos.push({ id: 'escadaPiscina', x: px + pw - 2, y: py + 1, s: 1 }, { id: 'boia', x: px + 2 + K.ri(0, Math.max(0, pw - 5)), y: py + 1 + K.ri(0, Math.max(0, ph - 3)), s: 1 });
      for (const ex of [x + 1, x + 3, x + w - 4, x + w - 2]) K.p.objetos.push({ id: 'espreguicadeira', x: ex, y: y + h - 3, s: 2, fw: 1, fh: 2 });
      K.p.objetos.push({ id: 'guardaSol', x: x + Math.floor(w / 2) - 1, y: y + h - 3, s: 2 });
      K.p.objetos.push({ id: 'lampiao', x, y, s: 1 }, { id: 'lampiao', x: x + w - 1, y, s: 1 });
      K.marca('interesse', px, py + ph, 'A piscina', 'Quem entra na água faz barulho; agachado atrás das espreguiçadeiras, dá para se esconder.');
      return pt(x + Math.floor(w / 2));
    }
    if (t === 'estufa') {
      const q = kit.construcao(K, x, y, w, h, { lado: sul ? 's' : 'n' }, 'terra', 'estufa', { k: 'mureta', vidro: true });
      const yp = sul ? y + h - 1 : y, yo = sul ? y : y + h - 1;      // a fileira junto da porta deixa o meio livre
      kit.dentro(K, q, () => { for (let i = x; i + 2 <= x + w; i += 2) { K.poeR('canteiro', i, yo, 2, 1, 0); if (Math.abs(i + 1 - (x + Math.floor(w / 2))) > 1) K.poeR('canteiro', i, yp, 2, 1, 0); } for (let i = x + 1; i + 2 <= x + w - 1; i += 3) K.poeR('canteiro', i, y + 2, 2, 1, 0); K.poe1('jarro', x + w - 1, y + 3); });
      return pt(x + Math.floor(w / 2));
    }
    if (t === 'ferramentas' || t === 'estabulo') {
      const q = kit.construcao(K, x, y, w, h, { lado: sul ? 's' : 'n' }, 'madeira', t === 'estabulo' ? 'estabulo' : 'ferramentas');
      kit.dentro(K, q, () => {
        const yf = sul ? y : y + h - 1, yd = sul ? y + h - 1 : y;      // o fundo (longe da porta) e o lado da porta
        if (t === 'ferramentas') { K.poeR('bancada', x + 1, yf, 2, 1, sul ? 0 : 180); K.poe1('carrinhoMao', x + w - 1, yd); K.poe1('sacos', x + w - 1, yf); K.poe1('barril', x, yd); K.poe1('lampiao', x, yf); }
        else { K.poeR('cocho', x, yf, 2, 1, sul ? 0 : 180); K.poeR('cocho', x + 3, yf, 2, 1, sul ? 0 : 180); for (let i = 0; i < 4; i++) K.poe1('feno', x + K.ri(0, w - 1), y + K.ri(1, h - 2)); K.poe1('barril', x + w - 1, yf); }
      });
      return pt(x + Math.floor(w / 2));
    }
    if (t === 'altar') {
      const ax = x + Math.floor(w / 2), ay = y + Math.floor(h / 2);
      for (let a = 0; a < 16; a++) { if (sul ? a >= 3 && a <= 5 : a >= 11 && a <= 13) continue; const ang = a / 16 * Math.PI * 2; K.poe1('arbusto', Math.round(ax + Math.cos(ang) * (w / 2 - 0.5)), Math.round(ay + Math.sin(ang) * (h / 2 - 0.5))); }
      K.poe1('altar', ax, ay, 0, { n: 'O altar', notas: 'Um altar pequeno, de pedra.' }); K.poe1('vela', ax - 1, ay); K.poe1('vela', ax + 1, ay); K.poe1('estatua', ax, ay - 2); K.poe1('flores', ax - 1, ay + 1); K.poe1('flores', ax + 1, ay + 1);
      K.marca('interesse', ax, ay + 1, 'O altar', 'No círculo de sebes: de fora, quase não se vê quem está dentro.');
      return pt(ax);
    }
    if (t === 'fonte') { K.poeR('fonte', x + 2, y + 1, 2, 2, 0); K.poeR('banco', x, y + 1, 2, 1, 90); K.poeR('banco', x + w - 1, y + 1, 2, 1, 90); K.poe1('estatua', x + 1, y); K.poe1('estatua', x + w - 2, y); return pt(x + 3); }
    if (t === 'horta') { for (let i = x; i + 2 <= x + w; i += 3) { K.poeR('canteiro', i, y, 2, 1, 0); K.poeR('canteiro', i, y + 2, 2, 1, 0); } return pt(x + Math.floor(w / 2)); }
    if (t === 'pomar') { for (let j = y; j + 2 <= y + h; j += 4) for (let i = x; i + 2 <= x + w; i += 4) K.poeR('arvore', i + K.ri(0, 1), j + K.ri(0, 1), 2, 2, 0); return pt(x + Math.floor(w / 2)); }
    if (t === 'poco') { K.poe1('poco', x, y); K.poe1('jarro', x + 1, y + 1); return pt(x); }
    if (t === 'canil') { K.poeR('casinhaCao', x, y, 2, 2, 0); return pt(x + 1); }
    if (t === 'mesaJardim') { K.poeR('mesaJardim', x, y, 2, 2, 0); K.poeR('guardaSol', x + 3, y, 2, 2, 0); return pt(x + 1); }
    if (t === 'varal') { K.poeR('varal', x, y, 2, 2, 0); K.poe1('cestoRoupa', x + 3, y); return pt(x + 1); }
    return null;
  }

  /* ================= a fortaleza ================= */
  function gerarFortaleza(o) {
    const k = TAM[o.tamanho].k, W = Math.round(44 * k), H = Math.round(38 * k), K = plano('fortaleza', W, H, o.seed, o), { p, r } = K;
    p.guardas_ = o.guardas;
    const x0 = 3, y0 = 3, x1 = W - 3, y1 = H - 3, gx = Math.round(W / 2);
    K.pinta('piso', { x: x0, y: y0, w: x1 - x0, h: y1 - y0, tipo: 'calcada' });
    K.pinta('caminho', { pts: [[gx, H - 0.5], [gx, y1 + 0.5]], w: 2.2, tipo: 'terra' });
    // a brecha (uma das muralhas de trás, caída) e o portão
    const brecha = { horiz: true, a: y0, de: K.ri(x0 + 8, x1 - 9), ate: 0 }; brecha.ate = brecha.de + 1;
    muro(K, x0, y0, x1, y1, 'muralha', [{ horiz: true, a: y1, de: gx - 1, ate: gx + 1 }, brecha]);
    K.pinta('entulho', { x: brecha.de + 0.5, y: y0, r: 0.9 });
    portao(K, gx, y1, 'grade');
    for (let y = y1 - 3; y < y1; y++) for (const x of [gx - 1, gx]) K.reserva.add(x + ',' + y);
    // a ronda de dentro, junto das muralhas (a 1 quadrado)
    const rotaM = [[x0 + 1, y0 + 1], [x1 - 2, y0 + 1], [x1 - 2, y1 - 2], [x0 + 1, y1 - 2]];
    for (let x = x0 + 1; x <= x1 - 2; x++) { K.reserva.add(x + ',' + (y0 + 1)); K.reserva.add(x + ',' + (y1 - 2)); }
    for (let y = y0 + 1; y <= y1 - 2; y++) { K.reserva.add((x0 + 1) + ',' + y); K.reserva.add((x1 - 2) + ',' + y); }
    // as torres dos cantos: uma sala 3 × 3 com a porta para o pátio
    const torres = [];
    for (const [tx, ty, lado] of [[x0 + 2, y0 + 2, 's'], [x1 - 5, y0 + 2, 's'], [x0 + 2, y1 - 5, 'n'], [x1 - 5, y1 - 5, 'n']]) {
      const T = predio(K, tx, ty, 3, 3, { corredor: false, entrada: 'torre', frente: lado, janelas: true, fundosPorta: false, pisoBase: 'laje' });
      for (const q of T.salas) mobiliar(K, q);
      torres.push({ q: T.salas[0], lado });
    }
    // o quartel (no fundo), as celas (à direita), o estábulo (à esquerda)
    const qw = Math.round((x1 - x0) * 0.5), qh = 10, qx = Math.round(W / 2 - qw / 2), qy = y0 + 3;
    // (lote 122) com andar de cima, os dormitórios e o comandante sobem; o porão é a prisão de baixo
    const rectQ = { x: qx, y: qy, w: qw, h: qh };
    const Q = predio(K, qx, qy, qw, qh, Object.assign({ corredor: true, larg: 2, min: 4, max: 6, trancada: false, fundosPorta: true, nivelFundos: 'medio', nivelSala: 'dificil', extra: 0.25, piso: { refeitorio: 'laje', arsenal: 'laje' } },
      o.cima > 0 ? { papeis: ['refeitorio', 'arsenal', 'guarda', 'deposito'], resto: ['deposito'], trancar: ['arsenal'] } : { papeis: ['dormitorio', 'refeitorio', 'comandante', 'arsenal', 'dormitorio'], resto: ['deposito'], trancar: ['comandante', 'arsenal'] }));
    const EQ = escadas(K, Q, rectQ, o);
    for (const q of Q.salas) mobiliar(K, q);
    const cw = 9, ch = 9, cx = x1 - 3 - cw, cy = Math.max(Math.round(H / 2) - 2, qy + qh + 2);
    const C = predio(K, cx, cy, cw, ch, { corredor: true, larg: 2, entrada: 'guarda', frente: 's', min: 3, max: 3, resto: ['cela'], trancar: ['cela'], nivelSala: 'medio', janelas: false, fundosPorta: false, pisoBase: 'laje', extra: 0, trancada: true, nivelFrente: 'facil' });
    for (const q of C.salas) mobiliar(K, q);
    const ew = 8, eh = 6, ex = x0 + 3, ey = Math.max(Math.round(H / 2), qy + qh + 2);
    const E = predio(K, ex, ey, ew, eh, { corredor: false, entrada: 'estabulo', frente: 's', min: 8, max: 8, janelas: false, fundosPorta: false, pisoBase: 'terra' });
    for (const q of E.salas) mobiliar(K, q);
    // o pátio: o treino, o poço, as carroças e as pilhas de caixotes (esconderijos)
    const pc = { x: Math.round(W / 2) - 3, y: Math.round(H / 2) + 2 };
    K.poe1('boneco', pc.x, pc.y); K.poe1('alvo', pc.x + 3, pc.y); K.poe1('armas', pc.x + 5, pc.y);
    K.poe1('poco', pc.x - 3, pc.y + 4);
    esconderijo(K, x0 + 2, y1 - 8, 'carroca', 'Atrás da carroça', 2);
    esconderijo(K, x1 - 5, y1 - 9, 'caixote', 'Entre os caixotes');
    K.poe1('caixote', x1 - 4, y1 - 9); K.poe1('caixote', x1 - 5, y1 - 8);
    // (lote 125) o carrinho de mão, a lenha empilhada e o cão de guarda junto do portão
    K.poe1('carrinhoMao', x1 - 7, y1 - 8); K.poeR('pilhaLenha', x0 + 5, y1 - 9, 2, 1, 0) || K.poeR('pilhaLenha', x0 + 5, y1 - 11, 2, 1, 0);
    K.poe1('casinhaCao', gx + 3, y1 - 3, 0, { n: 'O cão de guarda', notas: 'Late para quem chega pelo portão.' }) || K.poe1('casinhaCao', gx - 4, y1 - 3, 0, { n: 'O cão de guarda' });
    // as luzes: o portão, as torres, a porta do quartel, as celas
    K.poe1('tocha', gx - 2, y1 - 1); K.poe1('tocha', gx + 1, y1 - 1);
    if (Q.porta) K.poe1('lampiao', Q.porta.x + 2, Q.porta.y);
    if (C.porta) K.poe1('tocha', C.porta.fora[0] - 1, C.porta.fora[1]);
    // o bueiro (o esgoto)
    const bx = x0 + 2, by = y0 + 7;
    if (K.poe1('bueiro', bx, by)) K.p.entradas.push({ x: bx, y: by, n: 'O bueiro (desce ao esgoto)', gera: { t: 'masmorra', m: 'esgoto', n: 1, tam: 'pequeno', e: o.estilo || 'comum', s: (KIT().sub(o.seed, 93) % 2147483000) + 1 } });
    K.marca('interesse', brecha.de, y0 - 1, 'Entrada: a brecha na muralha', 'A muralha caiu aqui: dá para passar pelo entulho, longe do portão.');
    // (lote 122) os andares do quartel: os dormitórios e o comandante em cima; a prisão de baixo no porão
    const F = andares(o, 'fortaleza', W, H, K, Q, rectQ, EQ, {
      cima: [{ entrada: 'dormitorio', papeis: ['comandante', 'dormitorio', 'dormitorio'], resto: ['dormitorio'], trancar: ['comandante'], nivelSala: 'dificil' },
        { entrada: 'sotao', papeis: ['arsenal', 'deposito'], resto: ['sotao'], trancar: ['arsenal'], nivelSala: 'medio' }],
      porao: { entrada: 'guarda', papeis: ['cela', 'cela', 'cela'], resto: ['cela'], trancar: ['cela'], nivelSala: 'medio' } });
    // o alvo (no andar que tiver a sala: a prisão de baixo primeiro, se houver)
    const a = alvoDe(K, 'fortaleza', o.alvo), cela = salaEm(F, 'cela', [-1]) || { K, q: C.salas.find(q => q.papel === 'cela') || C.salas[0] }, com = salaEm(F, 'comandante', [1, 0]) || { K, q: Q.salas[1] };
    if (a === 'prisioneiro') alvo(cela.K, cela.q, 'prisioneiro', { n: 'O prisioneiro', notas: 'Na cela trancada.' });
    else if (a === 'documento') alvo(com.K, com.q, 'documento', { n: 'As ordens', notas: 'Na sala do comandante.' });
    else if (a === 'cofre') alvo(com.K, com.q, 'cofre', { n: 'O cofre do soldo' });
    else alvo(com.K, com.q, 'pessoa', { n: 'O comandante', notas: 'Dormindo.' });
    // os guardas: o portão, as torres, a ronda das muralhas, a das celas; os soldados dormindo no quartel
    posto(K, gx - 2, y1 - 2, 's', { r: 8 }); posto(K, gx + 1, y1 - 2, 's', { r: 8 });
    torres.forEach((t, i) => { if (i < qtd(K, [2, 3, 4])) posto(K, t.q.x + 1, t.q.y + 1, i < 2 ? 'n' : 's', { r: 9, a: 120 }); });
    ronda(K, rotaM, 'volta', { k: 0, passo: 4, r: 7 });
    if (qtd(K, [0, 1, 1])) ronda(K, rotaM, 'volta', { k: 2, passo: 4, r: 7 });
    if (C.porta && qtd(K, [0, 1, 1])) posto(K, C.porta.fora[0] + 1, C.porta.fora[1], 's', { r: 6 });
    // os soldados dormindo nas camas dos dormitórios (em qualquer andar)
    let nd = 0;
    for (const f of F) {
      const camas = f.K.p.objetos.filter(ob => ob.id === 'cama' && f.B.salas.some(q => q.papel === 'dormitorio' && ob.x >= q.x && ob.x < q.x + q.w && ob.y >= q.y && ob.y < q.y + q.h));
      for (const c2 of camas) { if (nd >= qtd(K, [2, 4, 6])) break; nd++; f.K.p.npcs.push({ x: c2.x, y: c2.y + (c2.rot === 180 ? 1 : 0), n: 'Soldado dormindo ' + nd, notas: 'Dormindo. Um barulho perto acorda.', conds: ['adormecido'], cor: '#5a6b8c', inimigo: true }); }
    }
    guardasDosAndares(F, o);
    sombras(K, qtd(K, [3, 4, 4]), { x0: x0 + 1, y0: y0 + 1, x1: x1 - 2, y1: y1 - 2 });
    p.cena = [gx, Math.round(H / 2)];
    p.chegada = [gx, H - 1];
    fechaAndares(p, F, 'fortaleza', o);
    return fim(p, 'fortaleza', o);
  }

  /* ================= a guilda e o cofre ================= */
  function gerarGuilda(o) {
    const k = TAM[o.tamanho].k, W = Math.round(34 * k), H = Math.round(30 * k), K = plano('guilda', W, H, o.seed, o), { p, r } = K;
    p.guardas_ = o.guardas;
    K.pinta('piso', { x: 0, y: 0, w: W, h: H, tipo: 'calcada' });
    // a rua (embaixo) e o beco (em cima)
    const bx = 2, by = 4, bw = W - 4, bh = H - 10;
    // (lote 122) com porão, o cofre forte desce para ele; com andar de cima, o arquivo e o escritório do mestre sobem
    const rect = { x: bx, y: by, w: bw, h: bh }, tPap = ['escritorio', 'guarda'].concat(o.porao ? [] : ['cofreForte'], o.cima > 0 ? [] : ['arquivo'], ['escritorio']);
    const G = predio(K, bx, by, bw, bh, { corredor: true, larg: 2, min: 4, max: 7, entrada: 'salaoPublico', papeis: tPap, fundos: ['cofreForte', 'arquivo'], resto: ['deposito', 'quarto'], trancada: true, nivelFrente: 'dificil', fundosPorta: true, nivelFundos: 'medio', trancar: ['cofreForte', 'arquivo', 'escritorio'], nivelSala: 'medio', extra: 0.2, piso: { cofreForte: 'laje', guarda: 'laje', deposito: 'laje' } });
    const E = escadas(K, G, rect, o);
    for (const q of G.salas) mobiliar(K, q);
    const F = andares(o, 'guilda', W, H, K, G, rect, E, {
      cima: [{ entrada: 'escritorio', papeis: ['arquivo', 'biblioteca', 'escritorio'], resto: ['deposito'], trancar: ['arquivo', 'escritorio'], nivelSala: 'medio' },
        { entrada: 'sotao', papeis: ['deposito'], resto: ['sotao'], trancar: [] }],
      porao: { entrada: 'guarda', papeis: ['cofreForte', 'deposito'], resto: ['deposito'], trancar: ['cofreForte'], nivelSala: 'medio' } });
    // o cofre forte (no andar em que estiver): a porta da fechadura absoluta e as armadilhas na frente
    const fv = F.find(f => f.B.salas.some(q => q.papel === 'cofreForte')), vault = fv ? fv.B.salas.find(q => q.papel === 'cofreForte') : null, Kv = fv ? fv.K : K, Gv = fv ? fv.B : G;
    if (vault) {
      const pv = Gv.portas.find(d => Math.abs(d.x1 - (vault.x + vault.w / 2)) <= vault.w / 2 + 0.5 && (d.y1 === vault.y + vault.h || d.y1 === vault.y));
      if (pv) { const w0 = Kv.p.paredes.find(w => w.k === 'door' && w.x1 === pv.x1 && w.y1 === pv.y1 && w.x2 === pv.x2 && w.y2 === pv.y2); if (w0) { w0.locked = true; w0.fech = 'absoluto'; } }
      // a placa de pressão bem na frente da porta; os dardos do lado
      if (pv && Gv.corr) { const y = vault.faixa === 'n' ? Gv.corr.y : Gv.corr.y + Gv.corr.h - 1; Kv.p.objetos.push({ id: 'placaPressao', x: pv.x1, y, s: 1, armadilha: true }); if (pv.x1 + 1 < Gv.corr.x + Gv.corr.w) Kv.p.objetos.push({ id: 'dardos', x: pv.x1 + 1, y, s: 1, armadilha: true }); vault.portaX = pv.x1; }
      if (Kv !== K) canto(Kv, vault, 'sinoAlarme', { n: 'O sino do alarme', notas: 'Ligado à porta do cofre: se a fechadura falhar com barulho, ele toca.' });
    }
    // o porão: a boca do cano que dá no esgoto; o sótão: a claraboia
    const fp = F.find(f => f.nivel === -1);
    if (fp) { const dq = fp.B.salas.find(q => q.papel === 'deposito'); if (dq) { const cn = canto(fp.K, dq, 'canoEsgoto', { n: 'O cano do esgoto' }); if (cn) fp.K.p.entradas.push({ x: cn.x, y: cn.y, n: 'O cano (dá no esgoto)', gera: { t: 'masmorra', m: 'esgoto', n: 1, tam: 'pequeno', e: o.estilo || 'comum', s: (KIT().sub(o.seed, 96) % 2147483000) + 1 } }); } }
    const f2 = F.find(f => f.nivel === Math.max(...F.map(x => x.nivel)) && f.nivel > 0);
    if (f2) { const q = f2.B.salas.find(x => x.papel === 'sotao' || x.papel === 'arquivo') || f2.B.salas[0]; const cb = noMeio(f2.K, q, 'claraboia', 1, 1, 0, { n: 'A claraboia', est: 'fechado' }); if (cb) f2.K.marca('interesse', cb.x + 1 < q.x + q.w ? cb.x + 1 : cb.x - 1, cb.y, 'Entrada: a claraboia', 'Do telhado, a claraboia desce aqui (uma corda resolve).'); }
    // a rua: os lampiões; o beco: os barris, os caixotes, o lixo e o bueiro
    for (let x = 3; x < W - 3; x += 7) K.poe1('lampiao', x, H - 3);
    for (let i = 0; i < 4; i++) K.poe1(i % 2 ? 'caixote' : 'barril', K.ri(2, W - 3), K.ri(1, 2));
    esconderijo(K, K.ri(4, W - 6), 1, 'barril', 'Entre os barris do beco');
    const bbx = K.ri(3, W - 4);
    if (K.poe1('bueiro', bbx, 2)) K.p.entradas.push({ x: bbx, y: 2, n: 'O bueiro do beco (desce ao esgoto)', gera: { t: 'masmorra', m: 'esgoto', n: 1, tam: 'pequeno', e: o.estilo || 'comum', s: (KIT().sub(o.seed, 95) % 2147483000) + 1 } });
    gradear(K, { x: bx, y: by, w: bw, h: bh }, 4);          // (lote 125) as janelas do térreo da guilda, com grade
    const arq = G.salas.find(q => q.papel === 'arquivo');
    if (arq && !f2) K.marca('interesse', arq.x + 1, arq.y + 1, 'Entrada: a claraboia', 'Do telhado, a claraboia desce no arquivo (uma corda resolve).');
    // o alvo
    const a = alvoDe(K, 'guilda', o.alvo), arqF = salaEm(F, 'arquivo') || { K, q: G.salas[1] };
    if (a === 'cofre' && vault) alvo(Kv, vault, 'cofre', { n: 'O cofre forte', notas: 'A porta da sala tem fechadura absoluta; as armadilhas estão na frente.' });
    else if (a === 'documento') alvo(arqF.K, arqF.q, 'documento', { n: 'O livro de contas' });
    else alvo(vault ? Kv : K, vault || G.salas[1], 'artefato', { id: 'calice', n: 'A joia rara' });
    // os guardas: a porta da frente (fora), o corredor, a porta do cofre; o beco (muitos)
    if (G.porta) posto(K, G.porta.fora[0] + 1, G.porta.fora[1] + 1, 's', { r: 6 });
    if (G.corr) ronda(K, [[G.corr.x + 1, G.corr.y + 1], [G.corr.x + G.corr.w - 2, G.corr.y + 1]], 'ida', { passo: 3, r: 6, a: 80 });
    if (vault && Gv.corr && qtd(K, [0, 1, 1])) { const x = clamp((vault.portaX != null ? vault.portaX : vault.x + 1) - 2, Gv.corr.x + 1, Gv.corr.x + Gv.corr.w - 2); posto(Kv, x, vault.faixa === 'n' ? Gv.corr.y + 1 : Gv.corr.y, vault.faixa === 'n' ? 'n' : 's', { r: 5 }); }
    if (qtd(K, [0, 0, 1])) ronda(K, [[2, 2], [W - 3, 2]], 'ida', { passo: 3, r: 6 });
    if (qtd(K, [0, 1, 1])) ronda(K, [[2, H - 4], [W - 3, H - 4]], 'ida', { passo: 4, r: 7 });
    const gq = G.salas.find(q => q.papel === 'guarda');
    if (gq) { const c2 = K.p.objetos.find(ob => ob.id === 'cadeira' && ob.x >= gq.x && ob.x < gq.x + gq.w && ob.y >= gq.y && ob.y < gq.y + gq.h); if (c2) K.p.npcs.push({ x: c2.x, y: c2.y, n: 'Guarda cochilando', notas: 'Cochilando na cadeira: acorda com barulho.', conds: ['adormecido'], cor: '#5a6b8c', inimigo: true }); }
    guardasDosAndares(F, o);
    sombras(K, qtd(K, [2, 3, 3]), { x0: 1, y0: 1, x1: W - 2, y1: H - 2 });
    p.cena = G.porta ? [G.porta.x, G.porta.y - 2] : [Math.round(W / 2), Math.round(H / 2)];
    p.chegada = [Math.round(W / 2), H - 1];
    fechaAndares(p, F, 'guilda', o);
    return fim(p, 'guilda', o);
  }

  /* ================= o acampamento inimigo ================= */
  function gerarAcampamento(o) {
    const k = TAM[o.tamanho].k, W = Math.round(46 * k), H = Math.round(38 * k), K = plano('acampamento', W, H, o.seed, o), { p, r } = K;
    p.guardas_ = o.guardas;
    const cx = Math.round(W / 2), cy = Math.round(H / 2), rx = Math.round(W * 0.32), ry = Math.round(H * 0.3);
    const dentro = (x, y, m) => ((x + 0.5 - cx) / (rx + (m || 0))) ** 2 + ((y + 0.5 - cy) / (ry + (m || 0))) ** 2 <= 1;
    // a trilha (de baixo até o meio) e a ronda em volta (na beira da clareira)
    K.pinta('caminho', { pts: [[cx, H - 0.5], [cx, cy + 2]], w: 2, tipo: 'terra' });
    for (let y = cy; y < H; y++) for (const x of [cx - 1, cx]) K.reserva.add(x + ',' + y);
    const rota = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; rota.push([clamp(Math.round(cx + Math.cos(a) * (rx - 1)) - 0, 1, W - 2), clamp(Math.round(cy + Math.sin(a) * (ry - 1)), 1, H - 2)]); }
    for (let i = 0; i < rota.length; i++) { const [ax, ay] = rota[i], [bx, by] = rota[(i + 1) % rota.length]; for (let s = 0, n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)); s <= n; s++) K.reserva.add(Math.round(ax + (bx - ax) * s / Math.max(1, n)) + ',' + Math.round(ay + (by - ay) * s / Math.max(1, n))); }
    // a tenda do chefe (com a cortina na entrada), no fundo
    const tw = 7, th = 6, tx = cx - Math.floor(tw / 2), ty = cy - ry + 5;
    const T = predio(K, tx, ty, tw, th, { corredor: false, entrada: 'tenda', frente: 's', min: 7, max: 7, janelas: false, fundosPorta: false, pisoBase: 'madeira' });
    for (const w of K.p.paredes) if (w.k === 'door' && w.x1 >= tx && w.x1 <= tx + tw && w.y1 === ty + th) w.k = 'veil';
    for (const q of T.salas) mobiliar(K, q);
    // as fogueiras e as barracas em volta delas
    const fogos = [[cx - Math.round(rx * 0.45), cy + 1], [cx + Math.round(rx * 0.45), cy + 1]];
    if (o.tamanho !== 'pequeno') fogos.push([cx, cy + Math.round(ry * 0.55)]);
    for (const [fx, fy] of fogos) { K.poe1('fogueira', fx, fy); K.poe1('tripe', fx + 1, fy); }
    let barracas = 0;
    for (let i = 0; i < 40 && barracas < qtd(K, [4, 6, 8]); i++) {
      const a = K.r() * TAU, d = 0.55 + K.r() * 0.35, x = Math.round(cx + Math.cos(a) * rx * d) - 1, y = Math.round(cy + Math.sin(a) * ry * d) - 1;
      if (!dentro(x, y, -1) || !dentro(x + 1, y + 1, -1)) continue;
      if (K.poeR('barraca', x, y, 2, 2, 0)) { barracas++; K.poe1('sacoDormir', x + 2, y + 1); }
    }
    // os cativos (nas jaulas), as carroças, os caixotes, a lenha
    const jx = cx + Math.round(rx * 0.6), jy = cy - Math.round(ry * 0.35), jaulas = [];
    for (let i = 0; i < 3; i++) { const ob = K.poe1('jaula', jx + i, jy); if (ob) jaulas.push(ob); }
    esconderijo(K, cx - Math.round(rx * 0.75), cy - 2, 'carroca', 'Debaixo da carroça', 2);
    esconderijo(K, cx + Math.round(rx * 0.2), cy + Math.round(ry * 0.75) - 1, 'caixote', 'Atrás dos caixotes');
    K.poe1('lenha', cx - Math.round(rx * 0.2), cy - 1);
    K.poe1('carrinhoMao', cx + Math.round(rx * 0.3), cy - 2); K.poeR('pilhaLenha', cx - Math.round(rx * 0.2) + 1, cy - 2, 2, 1, 0);      // (lote 125)
    // a mata em volta (fora da clareira): as árvores e as moitas (as moitas são esconderijos)
    for (let k2 = 0; k2 < W * H; k2++) {
      const x = K.ri(0, W - 2), y = K.ri(0, H - 2);
      if (dentro(x, y, 1) || (Math.abs(x - cx) <= 1 && y > cy)) continue;
      if (K.r() < 0.45) K.poeR('arvore', x, y, 2, 2, 0); else if (K.r() < 0.5) K.poe1('arbusto', x, y);
    }
    // as luzes: as fogueiras; as tochas da entrada
    K.poe1('tocha', cx - 2, cy + ry - 1); K.poe1('tocha', cx + 1, cy + ry - 1);
    K.marca('interesse', cx, 1, 'Entrada: a trilha do mato', 'Uma trilha de caça chega pelos fundos, sem passar pela entrada vigiada.');
    // o alvo
    const a = alvoDe(K, 'acampamento', o.alvo), tq = T.salas[0];
    if (a === 'prisioneiro' && jaulas.length) {
      jaulas.forEach((j, i) => K.p.npcs.push({ x: j.x, y: j.y, n: 'Cativo ' + (i + 1), notas: NOTA_ALVO + ' Preso na jaula (trancada).', conds: [], cor: '#8f7a4a' }));
      K.marca('alvoMissao', jaulas[0].x, jaulas[0].y + 1, 'Alvo da missão', 'Os cativos, nas jaulas.'); K.p.alvo = { tipo: 'prisioneiro', n: 'Os cativos', x: jaulas[0].x, y: jaulas[0].y };
    } else if (a === 'documento') alvo(K, tq, 'documento', { n: 'O mapa do chefe' });
    else if (a === 'pessoa') { K.p.npcs.push({ x: tq.x + 1, y: tq.y + 1, n: 'O chefe', notas: NOTA_ALVO + ' Dormindo na tenda.', conds: ['adormecido'], cor: '#8a5aa8', inimigo: true }); K.marca('alvoMissao', tq.x + 2, tq.y + 1, 'Alvo da missão', 'O chefe, dormindo.'); K.p.alvo = { tipo: 'pessoa', n: 'O chefe', x: tq.x + 1, y: tq.y + 1 }; }
    else alvo(K, tq, 'cofre', { id: 'bau', n: 'O baú do saque', notas: 'Trancado.' });
    // os guardas: a entrada, a ronda da beira; os que estão junto do fogo; os que dormem nas barracas
    posto(K, cx - 2, cy + ry - 2, 's', { r: 7 }); if (qtd(K, [0, 1, 1])) posto(K, cx + 1, cy + ry - 2, 's', { r: 7 });
    ronda(K, rota, 'volta', { k: 0, passo: 4, r: 6 });
    if (qtd(K, [0, 0, 1])) ronda(K, rota, 'volta', { k: 8, passo: 4, r: 6 });
    fogos.slice(0, qtd(K, [1, 2, 3])).forEach(([fx, fy]) => { const x = fx, y = fy + 1; if (K.livreR(x, y)) { K.ocupa(x, y, 1, 1); posto(K, x, y, 'n', { r: 5, a: 140, n: 'Bandido junto do fogo' }); } });
    K.p.objetos.filter(ob => ob.id === 'sacoDormir').slice(0, qtd(K, [2, 3, 5])).forEach((s2, i) => K.p.npcs.push({ x: s2.x, y: s2.y, n: 'Bandido dormindo ' + (i + 1), notas: 'Dormindo.', conds: ['adormecido'], cor: '#8f3d4a', inimigo: true }));
    sombras(K, qtd(K, [3, 4, 5]), { x0: 1, y0: 1, x1: W - 2, y1: H - 2 });
    p.cena = [cx, cy];
    p.chegada = [cx, H - 1];
    return fim(p, 'acampamento', o);
  }

  /* ================= as casas e as ruas (um quarteirão, de noite) ================= */
  function gerarRuas(o) {
    const k = TAM[o.tamanho].k, W = Math.round(44 * k), H = Math.round(36 * k), K = plano('ruas', W, H, o.seed, o), { p, r } = K;
    p.guardas_ = o.guardas;
    K.pinta('piso', { x: 0, y: 0, w: W, h: H, tipo: 'calcada' });
    // as ruas: a de baixo (larga) e a do meio (atravessada); os becos entre as casas
    const ry = Math.round(H / 2) - 2, rua = { y0: ry, y1: ry + 3 }, vx = Math.round(W / 2) - 1;
    const blocos = [{ x0: 1, y0: 1, x1: vx - 2, y1: ry - 2 }, { x0: vx + 3, y0: 1, x1: W - 2, y1: ry - 2 }, { x0: 1, y0: rua.y1 + 2, x1: vx - 2, y1: H - 2 }, { x0: vx + 3, y0: rua.y1 + 2, x1: W - 2, y1: H - 2 }];
    const casas = [];
    for (const b of blocos) {
      // as casas de cada bloco, lado a lado, com a porta para a rua; um beco de 2 entre elas
      let x = b.x0;
      const frente = b.y0 < ry ? 's' : 'n', hh = Math.min(9, b.y1 - b.y0 - 1), yy = frente === 's' ? b.y1 - hh + 1 : b.y0;
      while (x + 6 <= b.x1) {
        const cw = Math.min(K.ri(6, 9), b.x1 - x + 1);
        const C = predio(K, x, yy, cw, hh, { corredor: false, entrada: K.r() < 0.3 ? 'loja' : 'entrada', frente, min: 3, max: 5, papeis: ['banheiro', 'quarto', 'sala'], resto: ['quarto'], trancada: true, nivelFrente: 'facil', fundosPorta: true, nivelFundos: 'facil', extra: 0.4, piso: { loja: 'madeira', banheiro: 'ladrilho' } });
        C.rect = { x, y: yy, w: cw, h: hh };
        casas.push(C);
        x += cw + 2;
      }
    }
    // a casa do alvo: a maior (com as escadas reservadas antes dos móveis: os andares são dela)
    const alvoC = casas.slice().sort((a2, b2) => b2.salas.reduce((s, q) => s + q.w * q.h, 0) - a2.salas.reduce((s, q) => s + q.w * q.h, 0))[0];
    const EC = alvoC ? escadas(K, alvoC, alvoC.rect, o) : null;
    for (const C of casas) for (const q of C.salas) mobiliar(K, q);
    // a pracinha com a fonte, no cruzamento; os lampiões das ruas
    K.poeR('fonte', vx, ry + 1, 2, 2, 0);
    for (let x = 3; x < W - 3; x += 8) { K.poe1('lampiao', x, rua.y0 - 1) || K.poe1('lampiao', x + 1, rua.y0 - 1); }
    for (let y = 3; y < H - 3; y += 9) K.poe1('lampiao', vx - 1, y);
    // os becos: barris, caixotes e lixo (esconderijos)
    for (let i = 0; i < 8; i++) { const C = casas[Math.floor(r() * casas.length)]; if (!C) break; const b = C.salas[C.salas.length - 1], x = b.x + b.w, y = K.ri(b.y, b.y + b.h - 1); if (i < 3) esconderijo(K, x, y, i % 2 ? 'caixote' : 'barril', 'No beco, atrás dos barris'); else if (i === 4) K.poe1('carrinhoMao', x, y); else if (i === 6) K.poeR('pilhaLenha', x, y, 2, 1, 90) || K.poe1('barril', x, y); else K.poe1(i % 2 ? 'caixote' : 'barril', x, y); }      // (lote 125: o carrinho de mão e a lenha)
    const bbx = vx + 2, bby = rua.y1 + 1;
    if (K.poe1('bueiro', bbx, bby)) K.p.entradas.push({ x: bbx, y: bby, n: 'O bueiro (desce ao esgoto)', gera: { t: 'masmorra', m: 'esgoto', n: 1, tam: 'pequeno', e: o.estilo || 'comum', s: (KIT().sub(o.seed, 97) % 2147483000) + 1 } });
    // a casa do alvo: os andares (os quartos em cima, o sótão, a adega)
    let F = [{ K, B: alvoC, nivel: 0 }];
    if (alvoC) {
      F = andares(o, 'ruas', W, H, K, alvoC, alvoC.rect, EC, {
        cima: [{ entrada: 'quarto', papeis: ['banheiro', 'quarto', 'sala'], resto: ['quarto'], piso: { banheiro: 'ladrilho' }, corredor: false, min: 3, max: 5, extra: 0.4, trancar: [] }, { entrada: 'sotao', papeis: [], resto: ['sotao'], corredor: false, min: 3, max: 6, trancar: [] }],
        porao: { entrada: 'adega', papeis: ['deposito'], resto: ['adega'], corredor: false, min: 3, max: 5, trancar: [] } });
      for (const w of K.p.paredes) if (w.k === 'door' && alvoC.porta && w.x1 === alvoC.porta.x && w.y1 === alvoC.porta.y) w.fech = 'dificil';
      const a = alvoDe(K, 'ruas', o.alvo), S2 = salaEm(F, 'quarto', [1, 0]) || { K, q: alvoC.salas[alvoC.salas.length - 1] }, q = S2.q;
      if (a === 'pessoa') alvo(S2.K, q, 'pessoa', { n: 'A pessoa', notas: 'Dormindo em casa.' });
      else if (a === 'cofre') alvo(S2.K, q, 'cofre', { id: 'bau', n: 'O baú escondido', notas: 'Debaixo da cama, trancado.' });
      else alvo(S2.K, q, 'documento', { n: 'A carta' });
      const fp = F.find(f => f.nivel === -1);
      if (fp) { const aq = fp.B.salas.find(x => x.papel === 'adega') || fp.B.salas[0], cn = canto(fp.K, aq, 'canoEsgoto', { n: 'O cano do esgoto' }); if (cn) fp.K.p.entradas.push({ x: cn.x, y: cn.y, n: 'O cano (dá no esgoto)', gera: { t: 'masmorra', m: 'esgoto', n: 1, tam: 'pequeno', e: o.estilo || 'comum', s: (KIT().sub(o.seed, 98) % 2147483000) + 1 } }); }
      if (alvoC.porta) K.marca('interesse', alvoC.porta.fora[0] + 1, alvoC.porta.fora[1], 'A casa do alvo', 'A maior do quarteirão: a porta tem fechadura difícil; os fundos dão para o beco.');
    }
    // a ronda da guarda da cidade: a rua do meio e a de baixo; o vigia da praça
    const rota = [[2, rua.y0], [W - 3, rua.y0], [W - 3, rua.y1], [2, rua.y1]];
    ronda(K, [[2, rua.y1], [W - 3, rua.y1]], 'ida', { passo: 4, r: 7 });
    if (qtd(K, [0, 1, 1])) ronda(K, [[vx - 1, 1], [vx - 1, H - 2]], 'ida', { passo: 4, r: 7 });
    if (qtd(K, [0, 0, 1])) ronda(K, rota, 'volta', { k: 2, passo: 4, r: 7 });
    posto(K, vx + 2, ry + 2, 'l', { r: 6, a: 120, n: 'Vigia da praça' });
    guardasDosAndares(F, o);
    sombras(K, qtd(K, [3, 4, 5]), { x0: 1, y0: 1, x1: W - 2, y1: H - 2 });
    p.cena = [vx, ry + 1];
    p.chegada = [1, rua.y0 + 1];
    fechaAndares(p, F, 'ruas', o);
    return fim(p, 'ruas', o);
  }

  /* ================= a torre de guarda ================= */
  function gerarTorre(o) {
    const k = TAM[o.tamanho].k, W = Math.round(30 * k), H = Math.round(30 * k), K = plano('torre', W, H, o.seed, o), { p, r } = K;
    p.guardas_ = o.guardas;
    const m = 3, x0 = m, y0 = m, x1 = W - m, y1 = H - m, gx = Math.round(W / 2);
    // a paliçada (muro baixo de madeira) e o portão
    muro(K, x0, y0, x1, y1, 'muro', [{ horiz: true, a: y1, de: gx - 1, ate: gx + 1 }]);
    portao(K, gx, y1);
    K.pinta('caminho', { pts: [[gx, H - 0.5], [gx, Math.round(H / 2) + 4]], w: 2, tipo: 'terra' });
    for (let y = Math.round(H / 2) + 4; y < y1; y++) for (const x of [gx - 1, gx]) K.reserva.add(x + ',' + y);
    // a torre: no meio, duas salas (a da guarda e o depósito); a escada sobe ao alto
    const tw = Math.max(8, Math.round(W * 0.32)), th = tw, tx = gx - Math.floor(tw / 2), ty = Math.round(H / 2) - Math.floor(th / 2) - 1;
    const rota = volta({ x: tx, y: ty, w: tw, h: th }, 2, { x0: x0 + 1, y0: y0 + 1, x1: x1 - 2, y1: y1 - 2 });
    for (const [ax, ay] of rota) K.reserva.add(ax + ',' + ay);
    for (let x = rota[0][0]; x <= rota[1][0]; x++) { K.reserva.add(x + ',' + rota[0][1]); K.reserva.add(x + ',' + rota[2][1]); }
    for (let y = rota[0][1]; y <= rota[2][1]; y++) { K.reserva.add(rota[0][0] + ',' + y); K.reserva.add(rota[1][0] + ',' + y); }
    const T = predio(K, tx, ty, tw, th, { corredor: false, entrada: 'guarda', frente: 's', min: Math.ceil(tw / 2), max: Math.ceil(tw / 2), papeis: ['deposito'], trancada: true, nivelFrente: 'medio', fundosPorta: false, trancar: ['deposito'], nivelSala: 'medio', pisoBase: 'laje', extra: 0 });
    const rectT = { x: tx, y: ty, w: tw, h: th }, ET = escadas(K, T, rectT, o);
    for (const q of T.salas) mobiliar(K, q);
    const gq = T.salas.find(q => q.papel === 'guarda') || T.salas[0];
    const esc = o.cima > 0 ? null : canto(K, gq, 'escada', { n: 'A escada (sobe ao alto da torre)', notas: 'Do alto, o vigia vê o terreno todo.' });
    // (lote 122) os andares da torre: o dormitório da guarda, e no alto a sala do vigia com o sinal de fogo; embaixo, a cela
    const half = Math.ceil(tw / 2);
    const F = andares(o, 'torre', W, H, K, T, rectT, ET, {
      cima: [{ entrada: 'dormitorio', papeis: ['deposito'], corredor: false, min: half, max: half, trancar: [] }, { entrada: 'vigia', corredor: false, min: tw, max: tw, trancar: [] }],
      porao: { entrada: 'deposito', papeis: ['cela'], corredor: false, min: half, max: half, trancar: ['cela'], nivelSala: 'medio' } });
    const fTopo = o.cima >= 2 ? F.find(f => f.nivel === o.cima) : null;      // (lote 141: o andar mais alto)
    // o pátio: o estábulo pequeno, a lenha, o poço; o sinal de fogo (num estrado alto)
    K.poe1('poco', x0 + 2, y1 - 3); K.poe1('lenha', x1 - 3, y1 - 3); K.poe1('lenha', x1 - 4, y1 - 3);
    esconderijo(K, x0 + 2, y0 + 2, 'feno', 'No monte de feno');
    // o sinal de fogo: no alto da torre (com o 2º andar) ou num estrado alto no pátio
    const KS = fTopo ? fTopo.K : K, qTopo = fTopo ? fTopo.B.salas[0] : null;
    let sx = x1 - 4, sy = y0 + 2, sinal = null;
    if (qTopo) { sinal = noMeio(KS, qTopo, 'braseiro', 1, 1, 0, { n: 'O sinal de fogo', notas: 'Aceso, avisa as outras torres.' }); if (sinal) { sx = sinal.x; sy = sinal.y; } }
    else { p.relevo.push({ t: 'plataforma', alt: 2, k: 'rect', x: sx - 0.5, y: sy - 0.5, w: 2, h: 2 }); sinal = K.poe1('braseiro', sx, sy, 0, { n: 'O sinal de fogo', notas: 'Aceso, avisa as outras torres.' }); }
    // (lote 125) a corda com gancho, presa numa janela de cima, do lado de fora: outra entrada
    for (const [x, y] of [[tx + tw, ty + 1], [tx - 1, ty + 1], [tx + tw, ty + th - 2]]) if (K.poe1('cordaGancho', x, y, 0, { n: 'A corda com gancho' })) { K.marca('interesse', x, y, 'Entrada: a corda', 'Uma corda com gancho, presa numa janela de cima: dá para subir por fora.'); break; }
    // as luzes: o portão e a porta
    K.poe1('tocha', gx - 2, y1 - 1); K.poe1('tocha', gx + 1, y1 - 1);
    if (T.porta) K.poe1('lampiao', T.porta.x + 2, T.porta.y);
    K.marca('interesse', x0 - 1, Math.round(H / 2), 'Entrada: por cima da paliçada', 'A paliçada é baixa deste lado, longe do portão: dá para pular.');
    // o alvo
    const a = alvoDe(K, 'torre', o.alvo), dep = salaEm(F, 'cela', [-1]) || { K, q: T.salas.find(q => q.papel === 'deposito') || gq };
    if (a === 'prisioneiro') alvo(dep.K, dep.q, 'prisioneiro', { n: 'O prisioneiro', notas: dep.K === K ? 'No depósito trancado.' : 'Na cela do porão.' });
    else if (a === 'documento') alvo(K, gq, 'documento', { n: 'A mensagem', notas: 'Sobre a mesa da guarda.' });
    else if (sinal) { KS.marca('alvoMissao', sx - 1, sy, 'Alvo da missão', 'Apagar (ou acender) o sinal de fogo.'); sinal.notas = NOTA_ALVO + ' ' + sinal.notas; p.alvo = { tipo: 'artefato', n: 'O sinal de fogo', x: sx, y: sy }; }
    // os guardas: o vigia do alto (vê longe), a porta, a ronda em volta
    if (KS.livreR(sx, sy + 1)) { KS.ocupa(sx, sy + 1, 1, 1); posto(KS, sx, sy + 1, 's', { r: 12, a: 140, n: 'Vigia do sinal' }); }
    if (T.porta) posto(K, T.porta.fora[0] + 1, T.porta.fora[1], 's', { r: 6 });
    ronda(K, rota, 'volta', { k: 0, passo: 3, r: 6 });
    if (qtd(K, [0, 0, 1])) ronda(K, rota, 'volta', { k: 2, passo: 3, r: 6 });
    if (qtd(K, [0, 1, 1])) { const c2 = K.p.objetos.find(ob => ob.id === 'cadeira' && ob.x >= gq.x && ob.x < gq.x + gq.w && ob.y >= gq.y && ob.y < gq.y + gq.h); if (c2) K.p.npcs.push({ x: c2.x, y: c2.y, n: 'Guarda de folga', notas: 'Jogando dados: distraído.', conds: [], cor: '#5a6b8c', inimigo: true }); }
    void esc;
    guardasDosAndares(F.filter(f => f !== fTopo), o);
    sombras(K, qtd(K, [2, 3, 4]), { x0: x0 + 1, y0: y0 + 1, x1: x1 - 2, y1: y1 - 2 });
    p.cena = [gx, ty + th + 2];
    p.chegada = [gx, H - 1];
    fechaAndares(p, F, 'torre', o);
    return fim(p, 'torre', o);
  }

  // o fim de todo plano: o resumo do que entrou
  function fim(p, lugar, o) {
    delete p.guardas_;
    if (!p.andares) p.andares = [];
    p.lugar = lugar; p.tamanho = o.tamanho; p.guardasOp = o.guardas; p.alvoOp = o.alvo || 'sorteio';
    return p;
  }
  const GERA = { sobmedida: gerarSobMedida, mansao: gerarMansao, casarao: gerarCasarao, fortaleza: gerarFortaleza, guilda: gerarGuilda, acampamento: gerarAcampamento, ruas: gerarRuas, torre: gerarTorre };
  function gerar(lugar, o) {
    o = Object.assign({}, o);
    o.tamanho = TAM[o.tamanho] ? o.tamanho : 'medio';
    o.guardas = GUARDAS.some(g => g[0] === o.guardas) ? o.guardas : 'normal';
    o.seed = (Math.round(Number(o.seed)) >>> 0) || 1;
    // (lote 141) a escolha dos andares (o de antes, cima 0–2 e porão sim/não, ainda vale)
    o.and = ANDARES_OK[lugar] ? PlantaAndares.normalizar(o.and, catF(lugar), { cima: o.cima, porao: o.porao }) : PlantaAndares.normalizar(null, catF(lugar));
    o.cima = o.and.cima; o.porao = o.and.porao > 0;
    return GERA[lugar](o);
  }

  /* ================= a prévia ================= */
  function previa(cv, p, maxW, maxH) {
    const cell = Math.max(5, Math.floor(Math.min((maxW || 460) / p.W, (maxH || 330) / p.H)));
    const f = KIT().pintar(p, cell);
    cv.width = f.width; cv.height = f.height;
    const g = cv.getContext('2d'); g.drawImage(f, 0, 0);
    g.lineCap = 'round';
    for (const w of p.paredes) { g.strokeStyle = w.secret ? '#c79bff' : w.k === 'door' ? (w.locked ? '#ffb36b' : '#7fd1ff') : w.k === 'window' ? '#bff3ff' : w.k === 'veil' ? '#e3b6ff' : 'rgba(255,236,200,0.85)'; g.lineWidth = Math.max(1.5, cell * (w.k === 'wall' ? 0.12 : 0.24)); g.beginPath(); g.moveTo(w.x1 * cell, w.y1 * cell); g.lineTo(w.x2 * cell, w.y2 * cell); g.stroke(); }
    for (const o of p.objetos) if (Props.P[o.id]) Props.desenhar(g, o.id, o.x, o.y, o.fw || o.s || 1, o.fh || o.s || 1, o.rot, cell);
    // as rotas e os guardas (os pontos vermelhos); os que dormem e o alvo
    for (const gd of p.guardas) {
      const pts = gd.ronda.pts;
      if (pts.length > 1) { g.strokeStyle = 'rgba(240,92,78,0.75)'; g.lineWidth = Math.max(1, cell * 0.12); g.setLineDash([cell * 0.4, cell * 0.3]); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo((x + 0.5) * cell, (y + 0.5) * cell) : g.moveTo((x + 0.5) * cell, (y + 0.5) * cell))); if (gd.ronda.modo === 'volta') g.closePath(); g.stroke(); g.setLineDash([]); }
      g.fillStyle = '#f05c4e'; g.strokeStyle = '#2a0c08'; g.lineWidth = 1.5; g.beginPath(); g.arc((gd.x + 0.5) * cell, (gd.y + 0.5) * cell, cell * 0.42, 0, TAU); g.fill(); g.stroke();
    }
    for (const n of p.npcs) { g.fillStyle = n.inimigo ? '#9aa6c4' : '#c99aff'; g.beginPath(); g.arc((n.x + 0.5) * cell, (n.y + 0.5) * cell, cell * 0.36, 0, TAU); g.fill(); }
    for (const mk of p.marcas) { if (mk.id === 'esconderijo') { g.strokeStyle = '#9fb3d9'; g.lineWidth = 1.5; g.setLineDash([3, 2]); g.beginPath(); g.arc((mk.x + 0.5) * cell, (mk.y + 0.5) * cell, cell * 0.4, 0, TAU); g.stroke(); g.setLineDash([]); } else if (mk.id === 'alvoMissao') { g.fillStyle = '#ffd34d'; g.beginPath(); g.arc((mk.x + 0.5) * cell, (mk.y + 0.5) * cell, cell * 0.45, 0, TAU); g.fill(); g.strokeStyle = '#7a1e14'; g.lineWidth = 2; g.stroke(); } }
    for (const e of p.entradas) { g.fillStyle = '#e6ab4f'; g.strokeStyle = '#3a2508'; g.lineWidth = 2; g.beginPath(); g.arc((e.x + 0.5) * cell, (e.y + 0.5) * cell, cell * 0.45, 0, TAU); g.fill(); g.stroke(); }
    // (lote 122) os andares: miniaturas do prédio de cada um, no canto de cima (com o nome)
    const And = (p.andares || []).slice().sort((a, b) => b.nivel - a.nivel);
    if (And.length) {
      const sal = p.salas.length ? p.salas : [{ x: 0, y: 0, w: p.W, h: p.H }];
      const bx0 = Math.min(...And.map(a => Math.min(...a.salas.map(q => q.x)))), by0 = Math.min(...And.map(a => Math.min(...a.salas.map(q => q.y))));
      const bx1 = Math.max(...And.map(a => Math.max(...a.salas.map(q => q.x + q.w)))), by1 = Math.max(...And.map(a => Math.max(...a.salas.map(q => q.y + q.h))));
      void sal;
      const bw = bx1 - bx0, bh = by1 - by0, k = Math.max(2, Math.floor(Math.min(cv.width * 0.22 / bw, cv.height * 0.9 / And.length / (bh + 3))));
      And.forEach((a, i) => {
        const f2 = KIT().pintar(a, k), x = cv.width - bw * k - 6, y = 6 + i * (bh * k + 18);
        g.fillStyle = 'rgba(10,10,14,0.85)'; g.fillRect(x - 4, y - 4, bw * k + 8, bh * k + 20);
        g.drawImage(f2, bx0 * k, by0 * k, bw * k, bh * k, x, y + 12, bw * k, bh * k);
        for (const w of a.paredes) { g.strokeStyle = w.k === 'door' ? (w.locked ? '#ffb36b' : '#7fd1ff') : w.k === 'window' ? '#bff3ff' : 'rgba(255,236,200,0.8)'; g.lineWidth = Math.max(1, k * 0.2); g.beginPath(); g.moveTo(x + (w.x1 - bx0) * k, y + 12 + (w.y1 - by0) * k); g.lineTo(x + (w.x2 - bx0) * k, y + 12 + (w.y2 - by0) * k); g.stroke(); }
        for (const o2 of a.objetos) if (o2.id === 'escada') { g.fillStyle = '#e6ab4f'; g.fillRect(x + (o2.x - bx0) * k, y + 12 + (o2.y - by0) * k, k, k); }
        for (const gd of a.guardas) { g.fillStyle = '#f05c4e'; g.beginPath(); g.arc(x + (gd.x - bx0 + 0.5) * k, y + 12 + (gd.y - by0 + 0.5) * k, Math.max(1.5, k * 0.45), 0, TAU); g.fill(); }
        g.fillStyle = '#f3ead2'; g.font = '600 11px system-ui, sans-serif'; g.textBaseline = 'top'; g.fillText(a.nomeAndar[0].toUpperCase() + a.nomeAndar.slice(1), x, y - 1);
      });
    }
    return { cell };
  }
  const nomeDe = p => NOMES[p.lugar] || 'Furtividade';
  function resumo(p) {
    const And = p.andares || [], todos = [p].concat(And), soma = f => todos.reduce((m, q) => m + f(q), 0);
    const n = p.guardas.length, ng = soma(q => q.guardas.length), rondas = soma(q => q.guardas.filter(g => g.ronda.pts.length > 1).length), dorme = soma(q => q.npcs.filter(x => (x.conds || []).includes('adormecido')).length);
    const esc = soma(q => q.marcas.filter(m => m.id === 'esconderijo').length), entr = soma(q => q.marcas.filter(m => m.id === 'interesse').length + q.entradas.length + q.paredes.filter(w => w.secret || (w.k === 'window' && w.aberta)).length);
    const pl = (k, um, varios) => k + ' ' + (k === 1 ? um : varios);
    // o alvo pode estar num andar
    const alv = todos.map(q => q.alvo).find(Boolean);
    return [nomeDe(p), p.W + ' × ' + p.H + ' quadrados', And.length ? 'térreo + ' + And.slice().sort((a, b) => b.nivel - a.nivel).map(a => a.nomeAndar).join(', ') + ' (' + (And.length + 1) + ' cenas ligadas pelas escadas)' : '', `${pl(ng, 'guarda', 'guardas')}${ng > n ? ' (' + (ng - n) + ' nos andares)' : ''}, ${rondas} de ronda`, dorme ? `${dorme} dormindo` : '', pl(esc, 'esconderijo ou sombra', 'esconderijos e sombras'), pl(entr, 'entrada escondida', 'entradas escondidas'), alv ? 'alvo: ' + (alv.n || '').toLowerCase() : ''].filter(Boolean).join(' · ') + '.';
  }

  /* ================= a cena ================= */
  // o guarda: do Bestiário (um humanoide que seja guarda, soldado, sentinela…), senão um token com o nome
  function bestiarioGuardas() {
    const lista = typeof Fichas !== 'undefined' && Fichas.listaBest ? Fichas.listaBest() : [];
    const hum = lista.filter(e => (e.tags || []).includes('Humanoide') && !(e.tags || []).some(t => ['Chefe', 'Elite'].includes(t)));
    const nomeOk = hum.filter(e => /guard|soldad|sentinel|vigia|mercen|bandid|capang/i.test(e.nome || e.n || e.name || ''));
    return nomeOk.length ? nomeOk : hum;
  }
  /* A cena de um plano (o térreo ou um andar). ids: o nível → o id da cena (para as escadas). */
  async function montar(sc, p, ex, tom, ids) {
    sc.cols = p.W; sc.rows = p.H;
    const c = sc.cell, andar = p.nivel != null && p.nivel !== 0;
    sc.fog.dynamic = true; sc.fog.explored = true;
    sc.tone = tom.id; sc.light = tom.light;
    sc.weather = { k: !andar && WEATHERS.some(w => w[0] === ex.clima) ? ex.clima : '', pow: 0.6 };
    sc.bgColor = p.fundo ? '#16151a' : KIT().palDe(p.estilo, p.estacao).base; sc.bg.stretch = true;
    try { const cv = KIT().pintar(p, KIT().res(p.W, p.H)); const a = await Assets.fromCanvas(cv, 'bg', sc.name); sc.bg.asset = a.id; } catch (e) { console.error(e); }
    for (const w of p.paredes) {
      if (Math.hypot(w.x2 - w.x1, w.y2 - w.y1) < 0.05) continue;
      const k2 = w.secret ? 'door' : (w.k || 'wall');
      sc.walls.push(Object.assign({ id: uid('wl'), k: k2, x1: w.x1 * c, y1: w.y1 * c, x2: w.x2 * c, y2: w.y2 * c, open: !!w.open, locked: !!w.locked, secret: !!w.secret }, w.fech ? { fech: w.fech } : null));
    }
    for (const o of p.objetos) if (Props.P[o.id]) {
      const t = Props.novo(sc, o.id, o.x * c, o.y * c, o.s || 1, !!o.armadilha || !!Props.P[o.id].marca || !!o.oculto);      // (lote 141: o alçapão da base, escondido)
      if (o.rot) t.rot = o.rot;
      if (o.fw) { t.fw = o.fw; t.fh = o.fh; t.size = Math.max(o.fw, o.fh); t.x = o.x * c; t.y = o.y * c; delete t.q0; }
      if (o.n) t.name = o.n;
      if (o.notas) t.notes = o.notas;
      if (o.est) t.est = o.est;
      if (o.para != null && ids[o.para]) t.cena = ids[o.para];            // (lote 122) a escada leva ao outro andar
      sc.tokens.push(t);
    }
    if (ex.relevo !== false) for (const rr of p.relevo) sc.shapes.push(Object.assign(Estilos.terrenoNaCena(rr, c, 0, 0), { a: 0.3 }));
    for (const e of p.entradas) { const t = Props.novo(sc, 'entrada', e.x * c, e.y * c, 1, true); t.name = e.n; t.gera = Object.assign({}, e.gera); sc.tokens.push(t); }
    for (const m of p.marcas) { const t = Props.novo(sc, m.id, m.x * c, m.y * c, 1, true); t.name = m.n; t.notes = m.notas || ''; sc.tokens.push(t); }
    // os guardas (com a ronda) e os que dormem, do Bestiário quando houver
    const best = bestiarioGuardas(), conta = new Map(), noite = sc.light !== 'claro';
    const novoGuarda = (x, y, nome0, k2) => {
      let t = null;
      if (best.length && typeof Fichas !== 'undefined' && Fichas.novoTokenBest) { const e = best[k2 % best.length]; try { t = Fichas.novoTokenBest(sc, e.id, x * c, y * c, { hidden: false }); } catch (err) { t = null; } }
      if (!t) t = newToken(sc, x * c, y * c, { name: nome0 || 'Guarda', color: '#5a6b8c' });
      if (nome0) t.name = nome0;
      const base = t.name; conta.set(base, (conta.get(base) || 0) + 1);
      return t;
    };
    p.guardas.forEach((g, i) => {
      const t = novoGuarda(g.x, g.y, g.n || (g.posto ? 'Sentinela' : 'Guarda'), i);
      t.hidden = false;
      t.ronda = Rondas.novaRonda(g.ronda);
      t.vis = Object.assign({}, t.vis, { on: false });
      if (g.luz && noite && g.ronda.pts.length > 1) t.light = { on: true, bright: 1.5, dim: 4, c: '#ffd59a', fl: true };
      t.notes = (t.notes ? t.notes + '\n' : '') + (g.posto ? 'De posto.' : 'Faz a ronda.') + ' Mude a rota no painel (bloco "Guarda").';
      sc.tokens.push(t);
    });
    for (const n of p.npcs) {
      const t = n.inimigo ? novoGuarda(n.x, n.y, n.n, 7) : newToken(sc, n.x * c, n.y * c, { name: n.n, color: n.cor || '#8a5aa8' });
      t.name = n.n; t.hidden = false; t.conds = (n.conds || []).filter(id => COND_BY_ID[id]);
      t.vis = Object.assign({}, t.vis, { on: false });
      t.notes = (n.notas || '').slice(0, 2000);
      sc.tokens.push(t);
    }
    // os nomes repetidos ganham número
    const vistos = new Map();
    for (const t of sc.tokens) if (!t.prop && (conta.get(t.name) || 0) > 1) { vistos.set(t.name, (vistos.get(t.name) || 0) + 1); t.name = (t.name.slice(0, 54) + ' ' + vistos.get(t.name)).trim(); }
    if (p.chegada && Props.P.chegada) { const t = Props.novo(sc, 'chegada', p.chegada[0] * c, (p.chegada[1] - 1) * c, 1, true); sc.tokens.push(t); }
    normalizeScene(sc);
  }
  /* (lote 122) A cena do térreo e, com andares, uma cena para cada um (o mesmo tamanho: ficam alinhadas), ligadas pelas
     escadas; o andar de cada cena (sc.nivel) põe a ordem na barra de andares. → a cena do térreo */
  async function criar(p, nome, ex) {
    ex = ex || {};
    const base = String(nome || '').trim().slice(0, 60) || nomeDe(p);
    // de noite: com a hora em Dia (a de começo), a cena sai de Noite; Entardecer e Breu valem como escolhidos
    const tom = TONES.find(t => t.id === (ex.horaLivre ? ex.hora : ex.hora && ex.hora !== 'dia' ? ex.hora : 'noite')) || TONES[0];      // (lote 150: o sob medida usa a hora escolhida)
    const planos = [p].concat(Array.isArray(p.andares) ? p.andares : []), multi = planos.length > 1;
    const cenas = planos.map((q, i) => newScene(i ? (base.slice(0, 40) + ' — ' + (q.nomeAndar || 'andar')).slice(0, 60) : base));
    if (typeof ex.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(ex.id) && !Store.S.scenes[ex.id]) cenas[0].id = ex.id;
    const ids = {};
    planos.forEach((q, i) => { ids[q.nivel || 0] = cenas[i].id; });
    for (let i = 0; i < planos.length; i++) { await montar(cenas[i], planos[i], ex, tom, ids); if (multi) cenas[i].nivel = planos[i].nivel || 0; }
    // na lista, de baixo para cima (o porão, o térreo, os de cima)
    const ordem = cenas.map((sc, i) => [sc, planos[i].nivel || 0]).sort((a, b) => a[1] - b[1]);
    for (const [sc] of ordem) { Store.addScene(sc); Persist.scene(sc.id); }
    Persist.meta();
    return cenas[0];
  }

  /* ================= as abas da janela ================= */
  const semPartes = { partes: () => [], parteEm: () => null, nomeDaParte: () => '', formaDaParte: () => [], travada: () => false, alternar: (p, parte, trava) => trava, quantasTravadas: () => 0, baseDe: () => null, travaDe: () => null };
  const NOTAS = {
    mansao: 'O muro com o portão vigiado, o jardim escuro (com a ronda em volta da casa), a casa com o corredor, o escritório trancado, a porta dos fundos, a janela destrancada, a hera do muro e o bueiro.',
    fortaleza: 'As muralhas com as torres (um vigia em cada), o portão com a grade, a ronda junto das muralhas, o quartel com os soldados dormindo, as celas trancadas, a brecha na muralha e o bueiro.',
    guilda: 'A rua na frente, o beco atrás, o salão, os escritórios, o arquivo (com a claraboia) e o cofre forte: fechadura absoluta e armadilhas na porta.',
    acampamento: 'A clareira no mato: as fogueiras, as barracas (com quem dorme), a tenda do chefe, as jaulas dos cativos, a ronda na beira da clareira e a trilha dos fundos.',
    ruas: 'Um quarteirão de noite: as casas trancadas, os becos, os lampiões, a pracinha com a fonte, a guarda da cidade fazendo a ronda e a casa do alvo.',
    torre: 'A paliçada com o portão, a torre (a sala da guarda e o depósito trancado), o vigia no alto do sinal de fogo e a ronda em volta.',
  };
  const LUGARES = {};
  for (const id of IDS) {
    const pre = 'fur' + id.charAt(0).toUpperCase() + id.slice(1);
    LUGARES[id] = Object.assign({ id, n: CURTO[id], aceitaEstacao: true, furtivo: true,
      // (lote 122) os andares: de cima (0 a 2) e o porão; o acampamento não tem
      // (lote 141) os andares: até 5 em cima, até 2 de porão, a base secreta e as salas de cada andar (guardado por lugar)
      padrao: () => { const o = App.opt; return { tamanho: TAM[o[pre + 'Tam']] ? o[pre + 'Tam'] : 'medio', guardas: GUARDAS.some(g => g[0] === o.furGuardas) ? o.furGuardas : 'normal', alvo: ALVOS[id].some(a => a[0] === o[pre + 'Alvo']) ? o[pre + 'Alvo'] : 'sorteio', and: PlantaAndares.normalizar(o[pre + 'And'], catF(id), { cima: [0, 1, 2].includes(o.furCima) ? o.furCima : 1, porao: o.furPorao !== false }) }; },
      controles(st, K, mudou) {
        const muda = (k, v) => { st[k] = v; App.opt[pre + 'Tam'] = st.tamanho; App.opt.furGuardas = st.guardas; App.opt[pre + 'Alvo'] = st.alvo; mudou(true); };
        return h('div', { class: 'ger-c' },
          K.field('Tamanho', K.seg('fur-tam', st.tamanho, Object.keys(TAM).map(k => [k, TAM[k].n]), v => muda('tamanho', v)), 'stack'),
          K.field('Guardas', K.seg('fur-guardas', st.guardas, GUARDAS, v => muda('guardas', v)), 'stack'),
          K.field('O alvo da missão', K.seg('fur-alvo', st.alvo, [['sorteio', 'Sortear']].concat(ALVOS[id]), v => muda('alvo', v)), 'stack'),
          ANDARES_OK[id] ? h('details', { class: 'sec and-sec', id: 'fur-and-sec', open: true }, h('summary', { text: 'Andares e porão' }),
            PlantaAndares.ui(st.and = PlantaAndares.normalizar(st.and, catF(id), { cima: st.cima, porao: st.porao }), catF(id), a => { st.and = a; App.opt[pre + 'And'] = JSON.parse(JSON.stringify(a)); mudou(true); }, 'fur')) : null);
      },
      opcoesDe: st => ({ tamanho: st.tamanho, guardas: st.guardas, alvo: st.alvo, and: st.and ? JSON.parse(JSON.stringify(st.and)) : null }),
      aplicarOpcoes(st, o) { if (TAM[o.tamanho]) st.tamanho = o.tamanho; if (GUARDAS.some(g => g[0] === o.guardas)) st.guardas = o.guardas; if (o.alvo === 'sorteio' || ALVOS[id].some(a => a[0] === o.alvo)) st.alvo = o.alvo; if (o.and || [0, 1, 2].includes(o.cima)) st.and = PlantaAndares.normalizar(o.and, catF(id), { cima: o.cima, porao: o.porao }); },
      gerar: (st, comum) => gerar(id, Object.assign({}, st, { seed: comum && comum.seed, estilo: comum && comum.estilo, estacao: comum && comum.estacao })),
      previa, resumo, nomePadrao: nomeDe,
      criar: (p, nome, ex) => criar(p, nome, ex),
      relevoTxt: 'Com relevo',
      dica: '"Gerar outro" sorteia outro lugar, com as mesmas escolhas. Na prévia: os guardas em vermelho (com a rota tracejada), o alvo em amarelo, os esconderijos tracejados.',
      nota: NOTAS[id] + (ANDARES_OK[id] ? ' Com andares, cada andar e o porão viram uma cena (do mesmo tamanho), ligadas pelas escadas.' : '') + ' Sai uma cena nova, de noite (com a hora em Dia; Entardecer e Breu valem como escolhidos): só você vê as rotas, os cones de visão e as marcas; "Avançar rondas" (no grupo Mestre, à esquerda) faz os guardas andarem.',
      feito: sc => `"${sc.name}" criada: os guardas estão nos postos e nas rondas. "Avançar rondas" (no grupo Mestre, à esquerda, ou no botão direito) faz eles andarem.` }, semPartes);
  }
  /* (lote 150) o lugar sob medida, na janela: a ficha (o terreno, a casa, os anexos, os guardas) e os andares de sempre */
  const NOME_SALA = x => (x === 'oficina' ? 'Oficina' : PlantaAndares.NOMES[x] || x);
  const LUGAR_SOB = Object.assign({ id: 'sobmedida', n: 'Sob medida', aceitaEstacao: true,
    padrao: () => { const sp = specLimpa(App.opt.sobSpec); return { spec: sp, and: PlantaAndares.normalizar(App.opt.sobAnd, catF('sobmedida')), titulo: '', notas: '', fora: [] }; },
    controles(st, K, mudou) {
      const S = st.spec, muda = fn => { fn(S); st.spec = specLimpa(S); App.opt.sobSpec = JSON.parse(JSON.stringify(st.spec)); mudou(true); };
      const chips = h('div', { class: 'and-chips', id: 'sob-terreo' }, S.terreo.map((x, i) => h('span', { class: 'and-chip' }, NOME_SALA(x),
        h('button', { type: 'button', class: 'and-x', 'aria-label': 'Tirar ' + NOME_SALA(x), onclick: () => muda(s => { s.terreo.splice(i, 1); }) }, '×'))));
      const mais = h('select', { class: 'in', id: 'sob-mais', 'aria-label': 'Pôr uma sala no térreo', onchange: e => { const v = e.target.value; if (v) muda(s => { s.terreo.push(v); }); } },
        h('option', { value: '', text: '+ sala' }), ...SALAS_TERREO.filter(x => MOB[x]).map(x => h('option', { value: x, text: NOME_SALA(x) })));
      const anexos = Object.keys(ANEXOS).map(tp => { const a = S.anexos.find(b => b.t === tp);
        return h('div', { class: 'sob-anx' }, K.toggle('sob-a-' + tp, !!a, on => muda(s => { s.anexos = on ? s.anexos.concat([{ t: tp, n: 1 }]) : s.anexos.filter(b => b.t !== tp); }), ANEXOS[tp].n),
          a && !['piscina', 'pomar', 'altar'].includes(tp) ? K.stepper('sob-n-' + tp, a.n, 1, 4, v => muda(s => { s.anexos.find(b => b.t === tp).n = v; }), 'Quantas: ' + ANEXOS[tp].n) : null); });
      return h('div', { class: 'ger-c' }, ...[
        st.titulo || st.notas ? h('div', { class: 'sob-ia', id: 'sob-ia' }, st.notas ? K.note('Notas para o mestre: ' + st.notas) : null, st.fora && st.fora.length ? K.note('O gerador ainda não faz: ' + st.fora.join('; ') + '.') : null) : null,
        K.field('Terreno', K.seg('sob-terreno', S.terreno, Object.keys(TAM).map(k => [k, TAM[k].n]), v => muda(s => { s.terreno = v; })), 'stack'),
        K.toggle('sob-muro', S.muro, v => muda(s => { s.muro = v; }), 'Muro em volta, com o portão'),
        K.field('A casa', K.seg('sob-porte', S.porte, PORTES, v => muda(s => { s.porte = v; })), 'stack'),
        K.field('As salas do térreo', h('div', {}, chips, mais), 'stack'),
        h('details', { class: 'sec and-sec', id: 'sob-and-sec', open: !!(st.and.cima || st.and.porao) }, h('summary', { text: 'Andares e porão' }),
          PlantaAndares.ui(st.and, catF('sobmedida'), a => { st.and = a; App.opt.sobAnd = JSON.parse(JSON.stringify(a)); mudou(true); }, 'sob')),
        K.field('No quintal', h('div', { class: 'sob-anxs' }, anexos), 'stack'),
        K.field('Guardas', K.seg('sob-guardas', S.guardas, [['nenhum', 'Nenhum']].concat(GUARDAS), v => muda(s => { s.guardas = v; })), 'stack')].filter(Boolean));
    },
    opcoesDe: st => ({ spec: JSON.parse(JSON.stringify(st.spec)), and: JSON.parse(JSON.stringify(st.and)) }),
    aplicarOpcoes(st, o) {
      if (!o || typeof o !== 'object') return;
      if (o.spec) st.spec = specLimpa(o.spec);
      if (o.and) st.and = PlantaAndares.normalizar(o.and, catF('sobmedida'));
      if (typeof o.notas === 'string') st.notas = o.notas.slice(0, 1200);
      if (Array.isArray(o.fora)) st.fora = o.fora.filter(x => typeof x === 'string').map(x => x.slice(0, 120)).slice(0, 8);
      if (typeof o.titulo === 'string') st.titulo = o.titulo;
    },
    gerar: (st, comum) => gerar('sobmedida', { spec: st.spec, and: st.and, tamanho: st.spec.terreno, guardas: st.spec.guardas === 'nenhum' ? 'poucos' : st.spec.guardas, seed: comum && comum.seed, estilo: comum && comum.estilo, estacao: comum && comum.estacao }),
    previa, nomePadrao: p => (p.spec && p.spec.porte === 'nobre' ? 'Casa nobre' : 'Casa') + ' com quintal',
    resumo: p => resumo(p).replace(/^Sob medida/, 'Sob medida') + (p.naoCouberam ? ` Não couberam no quintal: ${p.naoCouberam.join(', ')} (aumente o terreno).` : ''),
    criar: (p, nome, ex) => criar(p, nome, Object.assign({}, ex, { horaLivre: true })),
    relevoTxt: 'Com relevo',
    dica: 'A ficha do lado direito é o lugar: mude as salas, os anexos e os andares. "Descrever com a IA" preenche a ficha a partir de um texto.',
    nota: 'Uma casa com o terreno em volta, montada a partir da ficha: a casa na frente, os anexos no quintal (ligados por caminhos), os andares e o porão como você escolher, com ou sem guardas. A hora do dia é a escolhida.',
    feito: sc => `"${sc.name}" criada.`,
  }, { partes: () => [], parteEm: () => null, nomeDaParte: () => '', formaDaParte: () => [], travada: () => false, alternar: (p, parte, trava) => trava, quantasTravadas: () => 0, baseDe: () => null, travaDe: () => null });
  const ehFurtivo = id => IDS.includes(id);
  return { IDS, NOMES, LUGARES, ALVOS, TAM, GUARDAS, gerar, previa, resumo, criar, predio, ehFurtivo, catF, LUGAR_SOB, ANEXOS, SALAS_TERREO, PORTES, specLimpa };
})();
