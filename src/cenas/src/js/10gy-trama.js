/* ---------------------------------------------------------------
   10gy. A HISTÓRIA DA MISSÃO (lote 152) — o mapa que conta uma história: uma corrente de passos até o alvo.
   Cada passo é um portão e o que o abre:
     · chave:      a porta trancada (difícil de arrombar); a chave está em outro cômodo;
     · pista:      a porta (ou o baú) com fechadura de segredo, que não se arromba; a combinação está num diário;
     · mecanismo:  a porta vira passagem secreta; a alavanca escondida em outro cômodo abre (o t.liga de sempre);
     · puzzle:     a porta (ou o baú) abre com um puzzle do Escudo (o Cadeado de símbolos ou as Placas de pressão);
                   a pista dele fica num diário.
   E, fora da conta, o atalho de volta: uma porta nova, perto do alvo, que só abre por dentro (o caminho da fuga).
   Como se acha o portão: pelo caminho da chegada até o que se quer, a porta que, trancada, separa os dois lados (o
   corte). Sem corte (as janelas e as outras portas dão a volta), o portão é um baú trancado em cima do que se quer.
   A corrente vai de trás para a frente: o alvo, o portão dele, a coisa que abre (no lado de cá), o portão dela… Para
   quem joga, o passo 1 é o último que o gerador fez.
   No plano (em quadrados): p.trama = { passos: [...], atalho }; as portas mudam no plano (a prévia e o fundo já saem
   certos). Na cena (aplicar): as portas ganham a fechadura, o segredo ou o puzzle; os objetos entram escondidos, com o
   nome do passo e a nota; sc.trama guarda a lista (a aba Guardas mostra, e o mestre marca o que já fizeram).
   --------------------------------------------------------------- */
const Trama = (() => {
  const arr = v => (Array.isArray(v) ? v : []);
  const LUGARES_OK = () => new Set(Furtividade.IDS.concat(['sobmedida', 'masmorra', 'catacumbas', 'ruinas', 'exemplo']));
  const TAMS = [['curta', 'Curta (1–2)'], ['media', 'Média (3)'], ['longa', 'Longa (4–5)']];
  const TIPOS = [['chave', 'Chave e fechadura'], ['pista', 'Pista escrita'], ['mecanismo', 'Mecanismo'], ['puzzle', 'Puzzle do Escudo'], ['atalho', 'Atalho de volta']];
  const prefs = () => {
    const o = App.opt, t = o.tramaTipos && typeof o.tramaTipos === 'object' ? o.tramaTipos : {};
    const tipos = {}; for (const [k] of TIPOS) tipos[k] = t[k] !== false;
    return { on: o.tramaOn === true, tam: TAMS.some(x => x[0] === o.tramaTam) ? o.tramaTam : 'media', tipos };
  };
  // vale para este lugar (o sob medida, só com guardas)
  const vale = (L, op) => !!L && LUGARES_OK().has(L.id) && !(L.id === 'sobmedida' && op && op.spec && op.spec.guardas === 'nenhum');

  const SALA_NOME = { entrada: 'a entrada', descida: 'a sala da descida', tesouro: 'a sala do tesouro', salao: 'o salão', guarda: 'a sala da guarda', biblioteca: 'a biblioteca', poco: 'a sala do poço', deposito: 'o depósito',
    nichos: 'a sala dos nichos', ossario: 'o ossário', desabado: 'a sala desabada', corredor: 'o corredor', estufa: 'a estufa', ferramentas: 'o depósito de ferramentas', torre: 'a torre', estabulo: 'o estábulo', salaoPublico: 'o salão de atendimento', tenda: 'a tenda', trono: 'a sala do trono', altar: 'a sala do altar', celas: 'as celas', arsenal: 'o arsenal' };
  const comArtigo = n => { const f = /^(sala|cozinha|despensa|biblioteca|galeria|capela|cela|adega|loja|forja|sala)/i.test(n) || /a$/.test(n.split(' ')[0]); return (f ? 'a ' : 'o ') + n.charAt(0).toLowerCase() + n.slice(1); };

  /* ---------------- o modelo do plano: as paredes que barram o passo e as portas (por aresta) ---------------- */
  function modelo(p) {
    const W = p.W, H = p.H;
    const M = { W, H, pV: new Uint8Array((W + 1) * H), pH: new Uint8Array(W * (H + 1)), dV: new Int32Array((W + 1) * H), dH: new Int32Array(W * (H + 1)) };
    arr(p.paredes).forEach((w, i) => {
      const k = w.k || 'wall', barra = k === 'wall' || k === 'mureta', porta = k === 'door' && !w.secret;
      if (!barra && !porta) return;
      if (Math.hypot(w.x2 - w.x1, w.y2 - w.y1) < 0.01) return;
      // a aresta entre dois quadrados vizinhos fecha quando a parede cruza a linha entre os centros deles
      const x0 = Math.max(0, Math.floor(Math.min(w.x1, w.x2)) - 1), x1 = Math.min(W - 1, Math.ceil(Math.max(w.x1, w.x2)) + 1);
      const y0 = Math.max(0, Math.floor(Math.min(w.y1, w.y2)) - 1), y1 = Math.min(H - 1, Math.ceil(Math.max(w.y1, w.y2)) + 1);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (x + 1 < W && cruza(w, x + 0.5, y + 0.5, x + 1.5, y + 0.5)) { const k2 = y * (W + 1) + x + 1; if (barra) M.pV[k2] = 1; else M.dV[k2] = i + 1; }
        if (y + 1 < H && cruza(w, x + 0.5, y + 0.5, x + 0.5, y + 1.5)) { const k2 = (y + 1) * W + x; if (barra) M.pH[k2] = 1; else M.dH[k2] = i + 1; }
      }
    });
    return M;
  }
  // a parede w cruza o trecho (ax, ay)–(bx, by)?
  function cruza(w, ax, ay, bx, by) {
    const d = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
    const d1 = d(w.x1, w.y1, w.x2, w.y2, ax, ay), d2 = d(w.x1, w.y1, w.x2, w.y2, bx, by), d3 = d(ax, ay, bx, by, w.x1, w.y1), d4 = d(ax, ay, bx, by, w.x2, w.y2);
    return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9) || Math.abs(d3) <= 1e-9 || Math.abs(d4) <= 1e-9);
  }
  // a aresta entre (x, y) e o vizinho (só os 4 lados): { barra, porta (índice + 1) }
  function aresta(M, x, y, dx, dy) {
    if (dx) { const k = y * (M.W + 1) + (dx > 0 ? x + 1 : x); return [M.pV[k], M.dV[k]]; }
    const k = (dy > 0 ? y + 1 : y) * M.W + x; return [M.pH[k], M.dH[k]];
  }
  const VIZ = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // a busca em largura de `de`, com as portas fechadas (B); → { dist (Int32, −1 fora), pai, porta (a porta usada para chegar) }
  function busca(M, de, B, ocup) {
    const { W, H } = M, N = W * H, dist = new Int32Array(N).fill(-1), pai = new Int32Array(N).fill(-1), porta = new Int32Array(N);
    const s = de[1] * W + de[0]; dist[s] = 0;
    const fila = [s];
    for (let qi = 0; qi < fila.length; qi++) {
      const u = fila[qi], ux = u % W, uy = (u - ux) / W;
      for (const [dx, dy] of VIZ) {
        const vx = ux + dx, vy = uy + dy;
        if (vx < 0 || vy < 0 || vx >= W || vy >= H) continue;
        const v = vy * W + vx;
        if (dist[v] >= 0 || (ocup && ocup[v] === 2)) continue;
        const [b, d] = aresta(M, ux, uy, dx, dy);
        if (b || (d && B.has(d))) continue;
        dist[v] = dist[u] + 1; pai[v] = u; porta[v] = d; fila.push(v);
      }
    }
    return { dist, pai, porta };
  }
  // as portas no caminho de `de` até t (da mais perto de t para trás)
  function portasNoCaminho(bs, W, t) {
    const out = [];
    for (let v = t; v !== -1 && bs.pai[v] !== -1; v = bs.pai[v]) if (bs.porta[v] && !out.includes(bs.porta[v])) out.push(bs.porta[v]);
    return out;
  }
  // as casas ocupadas pelos objetos (1: tem coisa em cima — não serve para pôr o item; 2: nem dá para passar não conta)
  function ocupacao(p) {
    const o = new Uint8Array(p.W * p.H);
    for (const ob of p.objetos || []) {
      const fw = ob.fw || ob.s || 1, fh = ob.fh || ob.s || 1;
      for (let y = Math.floor(ob.y); y < Math.floor(ob.y) + fh; y++) for (let x = Math.floor(ob.x); x < Math.floor(ob.x) + fw; x++) if (x >= 0 && y >= 0 && x < p.W && y < p.H) o[y * p.W + x] = 1;
    }
    for (const g of p.guardas || []) if (g.x >= 0 && g.y >= 0 && g.x < p.W && g.y < p.H) o[g.y * p.W + g.x] = 1;
    return o;
  }
  const salaEm = (p, x, y) => arr(p.salas).find(q => x >= q.x && y >= q.y && x < q.x + q.w && y < q.y + q.h && q.papel !== 'corredor') || null;
  function nomeDaSala(q) {
    if (!q || !q.papel) return null;
    if (SALA_NOME[q.papel]) return SALA_NOME[q.papel];
    const n = PlantaAndares.NOMES[q.papel];
    return n ? comArtigo(n) : null;
  }
  // o móvel colado na casa (para dizer onde a coisa está: "no escritório, perto da escrivaninha")
  const FORA_MOVEL = new Set(['arbusto', 'arvore', 'flores', 'pedra', 'rocha', 'grama', 'cogumelos', 'tocha', 'vela', 'lampiao', 'candelabro', 'escada', 'portao', 'chegada', 'interesse']);
  function movelPerto(p, x, y) {
    let best = null, bd = 9;
    for (const o of arr(p.objetos)) {
      if (FORA_MOVEL.has(o.id) || !Props.P[o.id] || Props.P[o.id].marca) continue;
      const fw = o.fw || o.s || 1, fh = o.fh || o.s || 1, dx = Math.max(o.x - x, 0, x - (o.x + fw - 1)), dy = Math.max(o.y - y, 0, y - (o.y + fh - 1)), d = Math.max(dx, dy);
      if (d <= 1 && d < bd) { bd = d; best = o; }
    }
    return best ? (best.n || Props.P[best.id].n).toLowerCase() : null;
  }
  const ondeTxt = (p, x, y) => {
    const n = nomeDaSala(salaEm(p, x, y)), m = movelPerto(p, x, y);
    if (n) return 'n' + n + (m ? ' (perto: ' + m + ')' : '');
    return m ? 'perto de: ' + m : arr(p.salas).length ? 'do lado de fora' : 'no meio do lugar';
  };

  /* ---------------- de onde se chega e o que se quer ---------------- */
  function pontas(p) {
    const W = p.W, H = p.H, cl = (x, y) => [clamp(Math.floor(x), 0, W - 1), clamp(Math.floor(y), 0, H - 1)];
    const meio = q => cl(q.x + q.w / 2, q.y + q.h / 2);
    const sala = papel => arr(p.salas).find(q => q.papel === papel);
    let de = null, para = null, alvoTxt = null;
    if (Array.isArray(p.chegada)) de = cl(p.chegada[0], p.chegada[1] - 1);
    else if (sala('entrada')) de = meio(sala('entrada'));
    else if (arr(p.entradas).length) { const e = p.entradas[0]; de = cl(e.x, e.y); }
    else de = cl(W / 2, H - 2);
    const mk = arr(p.marcas).find(m => m.id === 'alvoMissao'), av = p.alvo && typeof p.alvo === 'object' && isFinite(p.alvo.x) ? p.alvo : null;
    if (mk) { para = cl(mk.x, mk.y); alvoTxt = (av && av.n) || mk.n || 'o alvo'; }
    else if (av) { para = cl(av.x, av.y); alvoTxt = av.n || 'o alvo'; }
    else if (sala('tesouro')) { para = meio(sala('tesouro')); alvoTxt = 'o tesouro'; }
    else if (sala('descida')) { para = meio(sala('descida')); alvoTxt = 'a descida'; }
    else {
      // o alvo num andar: a escada (o "até" diz o andar)
      const and = arr(p.andares).find(a => (a.alvo && typeof a.alvo === 'object') || arr(a.marcas).some(m => m.id === 'alvoMissao'));
      const esc = arr(p.objetos).find(o => o.id === 'escada' || o.id === 'alcapao') || (!arr(p.salas).length ? arr(p.objetos).find(o => o.id === 'altar') : null);
      if (esc) { para = cl(esc.x, esc.y); alvoTxt = esc.id === 'altar' ? 'o altar' : and ? 'a escada (o alvo está n' + (and.nivel < 0 ? 'o ' : 'o ') + (and.nomeAndar || 'outro andar') + ')' : 'a escada'; }
    }
    if (!para) {
      const qs = arr(p.salas).filter(q => q.papel !== 'corredor');
      if (qs.length) { const q = qs.slice().sort((a, b) => Math.hypot(b.x - de[0], b.y - de[1]) - Math.hypot(a.x - de[0], a.y - de[1]))[0]; para = meio(q); alvoTxt = 'o fundo do lugar'; }
      else { para = cl(W / 2, 2); alvoTxt = 'o fundo do lugar'; }
    }
    return { de, para, alvoTxt: String(alvoTxt).replace(/^O /, 'o ').replace(/^A /, 'a ').replace(/^Os /, 'os ') };
  }

  /* ---------------- a corrente ---------------- */
  function tecer(p, pr) {
    delete p.trama;
    pr = pr || prefs();
    const tipos = Object.keys(pr.tipos).filter(k => pr.tipos[k] && k !== 'atalho');
    if (!tipos.length && !pr.tipos.atalho) return p;
    const r = mulberry((Math.imul((p.seed || 7) >>> 0, 2654435761) ^ 0x5eed7a) >>> 0);
    for (let i = 0; i < 7; i++) r();
    const pick = l => l[Math.floor(r() * l.length)];
    const N = pr.tam === 'curta' ? 1 + (r() < 0.5 ? 1 : 0) : pr.tam === 'longa' ? 4 + (r() < 0.5 ? 1 : 0) : 3;
    const M = modelo(p), W = p.W, ocup = ocupacao(p);
    const { de, para, alvoTxt } = pontas(p);
    const B = new Set(), usadas = new Set(), passos = [];
    let alvo = para, alvoNome = alvoTxt, alvoObj = 'alvo';
    // a casa onde vai a coisa: alcançável, longe da chegada (mas não colada no alvo), livre e, se der, numa sala
    // (com salas, só dentro delas; sem salas, longe da beira; perto de um móvel vale mais)
    const temSalas = arr(p.salas).some(q => q.papel !== 'corredor');
    function casaPara(bs, evita) {
      let max = 0; for (let k = 0; k < bs.dist.length; k++) if (bs.dist[k] > max) max = bs.dist[k];
      const cand = [];
      for (let k = 0; k < bs.dist.length; k++) {
        const d = bs.dist[k]; if (d < 0 || ocup[k] || evita.has(k)) continue;
        const x = k % W, y = (k - x) / W;
        if (x < 2 || y < 2 || x > W - 3 || y > p.H - 3) continue;
        if (Math.abs(x - de[0]) + Math.abs(y - de[1]) < 4) continue;
        if (temSalas && !salaEm(p, x, y)) continue;
        cand.push([k, d / Math.max(1, max) * 0.7 + (movelPerto(p, x, y) ? 0.5 : 0) + r() * 0.5]);
      }
      if (!cand.length) return null;
      cand.sort((a, b) => b[1] - a[1]);
      const k = cand[Math.floor(r() * Math.min(cand.length, 6))][0];
      return [k % W, Math.floor(k / W)];
    }
    const evita = new Set([para[1] * W + para[0], de[1] * W + de[0]]);
    for (let i = 0; i < N && tipos.length; i++) {
      const bs = busca(M, de, B, null), t = alvo[1] * W + alvo[0];
      if (bs.dist[t] < 0) break;
      let tipo = pick(tipos);
      // o corte: a porta do caminho que, fechada, separa a chegada do que se quer
      let porta = 0;
      if (tipo !== 'pistaBau') for (const d of portasNoCaminho(bs, W, t)) {
        if (usadas.has(d)) continue;
        const B2 = new Set(B); B2.add(d);
        const b2 = busca(M, de, B2, null);
        if (b2.dist[t] < 0) { let n = 0; for (let k = 0; k < b2.dist.length; k++) if (b2.dist[k] >= 0) n++; if (n > 12) { porta = d; break; } }
      }
      if (!porta && tipo === 'mecanismo') tipo = tipos.filter(x => x !== 'mecanismo').length ? pick(tipos.filter(x => x !== 'mecanismo')) : 'chave';
      if (porta) { B.add(porta); usadas.add(porta); }
      const bs2 = porta ? busca(M, de, B, null) : bs;
      const casa = casaPara(bs2, evita);
      if (!casa) { if (porta) B.delete(porta); break; }
      evita.add(casa[1] * W + casa[0]);
      const w = porta ? p.paredes[porta - 1] : null;
      const passo = { tipo, alvo: alvo.slice(), alvoNome, alvoObj, item: casa, itemOnde: ondeTxt(p, casa[0], casa[1]) };
      if (w) {
        // o lado de lá da porta (o que a chegada não alcança com ela fechada): o nome da sala
        const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2, vert = Math.abs(w.x2 - w.x1) < Math.abs(w.y2 - w.y1);
        const lados = vert ? [[Math.round(mx) - 1, Math.floor(my)], [Math.round(mx), Math.floor(my)]] : [[Math.floor(mx), Math.round(my) - 1], [Math.floor(mx), Math.round(my)]];
        const la = lados.find(([x, y]) => x >= 0 && y >= 0 && x < W && y < p.H && bs2.dist[y * W + x] < 0) || lados[1];
        const sn = nomeDaSala(salaEm(p, la[0], la[1]));
        passo.porta = { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 };
        passo.portaNome = tipo === 'mecanismo' ? 'a passagem secreta' + (sn ? ' para ' + sn : '') : 'a porta' + (sn ? ' d' + sn : ' de fora');
        if (tipo === 'mecanismo') { w.secret = true; w.locked = false; delete w.fech; }
        else { w.locked = true; w.fech = tipo === 'chave' ? 'dificil' : 'absoluto'; w.secret = false; }
      } else {
        // o baú trancado em cima do que se quer (ao lado, se a casa estiver ocupada)
        let bx = alvo[0], by = alvo[1];
        if (alvoObj === 'alvo' && ocup[by * W + bx]) { for (const [dx, dy] of VIZ) { const x = bx + dx, y = by + dy; if (x >= 0 && y >= 0 && x < W && y < p.H && !ocup[y * W + x] && bs.dist[y * W + x] >= 0) { bx = x; by = y; break; } } }
        ocup[by * W + bx] = 1;
        passo.bau = [bx, by];
        const sb = nomeDaSala(salaEm(p, bx, by));
        passo.portaNome = 'o baú trancado' + (sb ? ' n' + sb : '');
      }
      if (tipo === 'puzzle') passo.puzzle = r() < 0.5 ? 'cadeado' : 'placas';
      ocup[casa[1] * W + casa[0]] = 1;
      passos.push(passo);
      alvo = casa; alvoObj = tipo === 'chave' ? 'chave' : tipo === 'mecanismo' ? 'alavanca' : 'diario';
      alvoNome = alvoObj === 'chave' ? 'a chave' : alvoObj === 'alavanca' ? 'a alavanca' : 'o diário';
    }
    // os números para quem joga: o primeiro é o último que entrou
    passos.reverse().forEach((s, i) => { s.n = i + 1; });
    passos.forEach((s, i) => { if (i && passos[i - 1].bau) s.itemOnde = 'dentro do baú do passo ' + i; });
    passos.forEach((s, i) => { s.atras = i + 1 < passos.length ? `${s.alvoNome} (o passo ${i + 2})` : s.alvoNome; });
    // o atalho de volta: uma porta nova perto do alvo (na parede), para um lado que a chegada alcança sem os portões
    let atalho = null;
    if (pr.tipos.atalho) {
      const daC = busca(M, de, B, null), doA = busca(M, para, new Set(), null);
      let best = null;
      const qA = salaEm(p, para[0], para[1]);
      for (let y = 0; y < p.H; y++) for (let x = 0; x < W; x++) {
        const k = y * W + x;
        if (doA.dist[k] < 0 || doA.dist[k] > 8 || (qA && salaEm(p, x, y) !== qA && doA.dist[k] > 3)) continue;
        for (const [dx, dy] of VIZ) {
          const vx = x + dx, vy = y + dy;
          if (vx < 0 || vy < 0 || vx >= W || vy >= p.H) continue;
          const [b, d] = aresta(M, x, y, dx, dy);
          if (!b || d) continue;
          const v = vy * W + vx;
          if (daC.dist[v] < 0 || ocup[v] || ocup[k]) continue;
          // a volta tem que poupar caminho: longe pelo caminho de dentro, perto pelo atalho
          const ganho = (daC.dist[k] < 0 ? 999 : daC.dist[k]) - daC.dist[v];
          if (ganho < 6) continue;
          const s = ganho - doA.dist[k] * 2 + r() * 2;
          if (!best || s > best.s) best = { s, x, y, dx, dy };
        }
      }
      if (best && cortar(p, best)) atalho = { x: best.x, y: best.y, dx: best.dx, dy: best.dy, porta: best.porta, onde: ondeTxt(p, best.x, best.y) };
    }
    if (!passos.length && !atalho) { p.trama = { passos: [], atalho: null, de, para, alvoTxt, falhou: true }; return p; }
    p.trama = { passos, atalho, de, para, alvoTxt, pedidos: N };
    return p;
  }
  // abre uma porta de um quadrado na parede reta que passa pela aresta (o atalho): divide a parede em duas
  function cortar(p, a) {
    const vert = a.dx !== 0, gx = vert ? (a.dx > 0 ? a.x + 1 : a.x) : a.x, gy = vert ? a.y : (a.dy > 0 ? a.y + 1 : a.y);
    const i = p.paredes.findIndex(w => (w.k || 'wall') === 'wall' && (vert ? (w.x1 === gx && w.x2 === gx && Math.min(w.y1, w.y2) <= gy && Math.max(w.y1, w.y2) >= gy + 1) : (w.y1 === gy && w.y2 === gy && Math.min(w.x1, w.x2) <= gx && Math.max(w.x1, w.x2) >= gx + 1)));
    if (i < 0) return false;
    const w = p.paredes[i], novo = [];
    if (vert) { const y0 = Math.min(w.y1, w.y2), y1 = Math.max(w.y1, w.y2); if (gy > y0) novo.push(Object.assign({}, w, { y1: y0, y2: gy })); if (y1 > gy + 1) novo.push(Object.assign({}, w, { y1: gy + 1, y2: y1 })); }
    else { const x0 = Math.min(w.x1, w.x2), x1 = Math.max(w.x1, w.x2); if (gx > x0) novo.push(Object.assign({}, w, { x1: x0, x2: gx })); if (x1 > gx + 1) novo.push(Object.assign({}, w, { x1: gx + 1, x2: x1 })); }
    const porta = vert ? { x1: gx, y1: gy, x2: gx, y2: gy + 1 } : { x1: gx, y1: gy, x2: gx + 1, y2: gy };
    p.paredes.splice(i, 1, ...novo, Object.assign({ k: 'door', locked: true, fech: 'absoluto', atalho: true }, porta));
    a.porta = porta;
    return true;
  }

  /* ---------------- os textos ---------------- */
  const PUZ = { cadeado: 'Cadeado de símbolos', placas: 'Placas de pressão' };
  const ITEM = { chave: 'A chave', pista: 'O diário', puzzle: 'O diário', mecanismo: 'A alavanca' };
  function textoPasso(s) {
    const oque = s.portaNome, guarda = s.alvoNome;
    const abre = { chave: `${cap(oque)} está ${s.bau ? 'trancado' : 'trancada'} (difícil de arrombar). A chave está ${s.itemOnde}.`,
      pista: `${cap(oque)} tem fechadura de segredo: não dá para arrombar. A combinação está anotada num diário, ${s.itemOnde}.`,
      mecanismo: `${cap(oque)} parece parede. A alavanca escondida ${s.itemOnde} abre.`,
      puzzle: `${cap(oque)} abre com o puzzle "${PUZ[s.puzzle]}". A pista dele está num diário, ${s.itemOnde}.` }[s.tipo];
    return abre + ` ${s.bau ? 'Dentro dele' : 'Atrás dela'}: ${s.atras || guarda}.`;
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const textoAtalho = a => `Atalho de volta: uma porta ${a.onde}, perto do alvo, que só abre por dentro (de fora, nem com gazua). É o caminho da fuga.`;
  function resumo(p) {
    const t = p && p.trama;
    if (!t) return '';
    const n = t.passos.length;
    if (t.falhou) return ' A história: não deu neste mapa (o caminho até o alvo está fechado). Gere outro.';
    return ` A história: ${n ? n + (n === 1 ? ' passo' : ' passos') + ' até ' + t.alvoTxt : 'sem passos'}${t.pedidos && n < t.pedidos ? ' (o mapa só deu para ' + n + ')' : ''}${t.atalho ? ', com o atalho de volta' : ''}.`;
  }

  /* ---------------- a prévia: os números (o portão com o cadeado, a coisa que abre) ---------------- */
  function desenhar(g, p, cell) {
    const t = p && p.trama;
    if (!t) return;
    g.save();
    const ponto = (x, y, txt, cor, quad) => {
      const cx = (x + 0.5) * cell, cy = (y + 0.5) * cell, R = Math.max(7, cell * 0.55);
      g.fillStyle = cor; g.strokeStyle = '#1a1208'; g.lineWidth = 2; g.beginPath();
      if (quad) g.rect(cx - R, cy - R, R * 2, R * 2); else g.arc(cx, cy, R, 0, TAU);
      g.fill(); g.stroke();
      g.fillStyle = '#1a1208'; g.font = `700 ${Math.round(R * 1.2)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, cx, cy + 1);
    };
    const meioPorta = s => (s.porta ? [(s.porta.x1 + s.porta.x2) / 2 - 0.5, (s.porta.y1 + s.porta.y2) / 2 - 0.5] : s.bau);
    for (const s of t.passos) {
      const [gx, gy] = meioPorta(s);
      g.strokeStyle = 'rgba(255,214,90,0.85)'; g.lineWidth = Math.max(1.5, cell * 0.12); g.setLineDash([cell * 0.4, cell * 0.3]);
      g.beginPath(); g.moveTo((s.item[0] + 0.5) * cell, (s.item[1] + 0.5) * cell); g.lineTo((gx + 0.5) * cell, (gy + 0.5) * cell); g.stroke(); g.setLineDash([]);
    }
    for (const s of t.passos) { const [gx, gy] = meioPorta(s); ponto(gx, gy, String(s.n), '#ffb36b', true); ponto(s.item[0], s.item[1], String(s.n), '#ffd34d', false); }
    if (t.atalho) { const a = t.atalho.porta; ponto((a.x1 + a.x2) / 2 - 0.5, (a.y1 + a.y2) / 2 - 0.5, 'A', '#7fe0a0', true); }
    g.restore();
  }

  /* ---------------- na cena ---------------- */
  function aplicar(sc, p) {
    const t = p && p.trama;
    if (!t || t.falhou) return '';
    const c = sc.cell, perto = (a, b) => Math.abs(a - b) < c * 0.05;
    const achaParede = q => sc.walls.find(w => (perto(w.x1, q.x1 * c) && perto(w.y1, q.y1 * c) && perto(w.x2, q.x2 * c) && perto(w.y2, q.y2 * c)) || (perto(w.x1, q.x2 * c) && perto(w.y1, q.y2 * c) && perto(w.x2, q.x1 * c) && perto(w.y2, q.y1 * c)));
    const lista = [];
    let puzzles = 0, semMesa = 0;
    for (const s of t.passos) {
      const txt = textoPasso(s), item = { chave: 'chave', pista: 'diario', puzzle: 'diario', mecanismo: 'alavanca' }[s.tipo];
      const ids = [];
      let parede = null, bau = null, pz = null;
      if (s.porta) { parede = achaParede(s.porta); if (parede) ids.push(parede.id); }
      if (s.bau) {
        bau = Props.novo(sc, 'bau', s.bau[0] * c, s.bau[1] * c, 1, false);
        bau.name = 'Baú trancado (passo ' + s.n + ')'; bau.notes = txt; bau.tranca = s.tipo === 'chave' ? 'dificil' : 'absoluto';
        sc.tokens.push(bau); ids.push(bau.id);
      }
      if (s.tipo === 'puzzle') {
        pz = EscudoCenas.criarPuzzle ? EscudoCenas.criarPuzzle(s.puzzle, PUZ[s.puzzle] + ': ' + s.portaNome + ' (' + sc.name + ')') : null;
        if (pz) { puzzles++; if (parede) Object.assign(parede, { pz, pzOk: undefined }); if (bau) bau.pz = pz; } else semMesa++;
      }
      const tk = Props.novo(sc, item, s.item[0] * c, s.item[1] * c, 1, true);
      tk.name = s.n + ' · ' + ITEM[s.tipo] + (s.tipo === 'chave' ? ' (' + s.portaNome.replace(/^o baú trancado.*/, 'o baú') + ')' : '');
      tk.notes = 'Passo ' + s.n + '. ' + txt + (s.tipo === 'puzzle' && !pz ? ' (Ligue o puzzle pelo painel da porta, com a mesa aberta.)' : '');
      if (s.tipo === 'mecanismo' && parede) tk.liga = parede.id;
      sc.tokens.push(tk); ids.push(tk.id);
      lista.push({ n: s.n, tipo: s.tipo, txt, ids });
    }
    if (t.atalho) {
      const parede = achaParede(t.atalho.porta), ids = [];
      if (parede) ids.push(parede.id);
      const a = t.atalho.porta, mk = Props.novo(sc, 'interesse', Math.min(a.x1, a.x2) * c, Math.min(a.y1, a.y2) * c, 1, true);
      mk.name = 'Atalho de volta'; mk.notes = textoAtalho(t.atalho);
      sc.tokens.push(mk); ids.push(mk.id);
      lista.push({ n: 0, tipo: 'atalho', txt: textoAtalho(t.atalho), ids });
    }
    lista.sort((a, b) => (a.n || 99) - (b.n || 99));
    sc.trama = { alvo: t.alvoTxt, passos: lista, feitos: [] };
    const np = t.passos.length;
    return `A história: ${np} ${np === 1 ? 'passo' : 'passos'}${t.atalho ? ' e o atalho de volta' : ''} (os objetos estão escondidos; a lista fica na aba Guardas).` +
      (puzzles ? ` ${puzzles === 1 ? 'Um puzzle novo' : puzzles + ' puzzles novos'} no Escudo.` : '') + (semMesa ? ' Os puzzles se ligam pelo painel da porta, com a mesa aberta.' : '');
  }

  /* ---------------- os controles (no "Gerar um lugar…") ---------------- */
  function controles(K, mudou) {
    const pr = prefs(), set = (k, v) => { App.opt[k] = v; if (mudou) mudou(); };
    const setTipo = (k, v) => { const t = Object.assign({}, pr.tipos, { [k]: v }); App.opt.tramaTipos = t; if (mudou) mudou(); };
    return h('div', { class: 'ger-trama', id: 'ger-trama' },
      K.toggle('ger-trama-on', pr.on, v => set('tramaOn', v), 'Contar uma história: os passos até o alvo'),
      pr.on ? h('div', { class: 'ger-pov-op' },
        K.field('Quantos passos', K.seg('ger-trama-tam', pr.tam, TAMS, v => set('tramaTam', v)), 'stack'),
        ...TIPOS.map(([k, n]) => K.toggle('ger-trama-' + k, pr.tipos[k], v => setTipo(k, v), n)),
        K.note('Na prévia: o quadrado laranja é o portão, o círculo amarelo é o que abre, com o número do passo. "A" é o atalho de volta.')) : null);
  }
  const resumoBloco = () => { const pr = prefs(); return pr.on ? ({ curta: 'curta', media: 'média', longa: 'longa' })[pr.tam] : 'desligada'; };

  /* ---------------- a aba Guardas: a lista, e o mestre marca o que já fizeram ---------------- */
  function secao(K, sc) {
    const t = sc && sc.trama;
    if (!t || !Array.isArray(t.passos) || !t.passos.length) return null;
    const feitos = new Set(Array.isArray(t.feitos) ? t.feitos : []);
    const marcar = (n, on) => { const f = new Set(feitos); if (on) f.add(n); else f.delete(n); Store.tx('A história: passo', () => Store.scn({ trama: Object.assign({}, t, { feitos: [...f] }) })); UI.refresh(); };
    const ver = s => { const tk = s.ids.map(id => Store.get('tokens', id)).find(Boolean); if (!tk) return; setSel([{ c: 'tokens', id: tk.id }]); const [cx, cy] = tokC(tk, sc); Render.centerOn(cx, cy); };
    return K.sec('s-gd-trama', 'A história' + (t.alvo ? ': até ' + t.alvo : ''), true,
      h('ul', { class: 'list gd-trama' }, t.passos.map((s, i) => h('li', { class: 'gd-tr' + (feitos.has(s.n || 'A' + i) ? ' feito' : '') },
        K.toggle('gd-tr-' + (s.n || 'a'), feitos.has(s.n || 'A' + i), on => marcar(s.n || 'A' + i, on), s.n ? 'Passo ' + s.n : 'Atalho'),
        h('button', { type: 'button', class: 'li-m gd-tr-t', title: 'Mostrar no mapa', onclick: () => ver(s), text: s.txt })))),
      K.note('Os objetos dos passos estão escondidos dos jogadores: revele quando eles acharem.'));
  }
  const TAU = Math.PI * 2;
  return { nomeSala: nomeDaSala, TAMS, TIPOS, prefs, vale, tecer, resumo, desenhar, aplicar, controles, resumoBloco, secao, pontas, modelo, busca };
})();
