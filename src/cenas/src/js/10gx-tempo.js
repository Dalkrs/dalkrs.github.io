/* ---------------------------------------------------------------
   10gx. O TEMPO (lote 153) — o lugar envelhecido e as marcas do que aconteceu ali.
   O tempo: Novo, Usado (a poeira, as manchas, o desgaste), Abandonado (as teias, os móveis caídos, as luzes apagadas,
   o mato entrando pelas frestas) e Em ruínas (as paredes caídas que abrem passagens, o entulho, a natureza tomando
   conta). O que houve (um, ou nada): o incêndio (a fuligem, o chão queimado, os móveis de madeira que sumiram), o saque
   (os baús abertos, as portas arrombadas, os papéis no chão), a batalha (o sangue seco, as armas largadas, as
   barricadas, os corpos — ou os ossos, se faz tempo) e a inundação (as poças, a lama, a marca da água nas paredes).
   Tudo acontece na cena (não no plano): o mesmo código serve ao gerador (o bloco "O tempo", depois de criar) e ao
   "Envelhecer esta cena…" (que faz uma cópia, anos depois; a original fica como está). O fundo ganha uma camada
   pintada por cima (vira uma imagem nova); as paredes, os objetos e as luzes mudam; uma nota só do mestre diz há quanto
   tempo está assim, o que houve e uma pista que os jogadores podem achar.
   A prévia do gerador mostra a camada pintada (no plano, que tem as mesmas paredes e objetos).
   --------------------------------------------------------------- */
const Tempo = (() => {
  const arr = v => (Array.isArray(v) ? v : []);
  const NIVEIS = [['novo', 'Novo'], ['usado', 'Usado'], ['abandonado', 'Abandonado'], ['ruinas', 'Em ruínas']];
  const EVENTOS = [['nada', 'Nada'], ['incendio', 'Incêndio'], ['saque', 'Saque'], ['batalha', 'Batalha'], ['inundacao', 'Inundação']];
  const NV = { novo: 0, usado: 1, abandonado: 2, ruinas: 3 };
  const LUGARES_OK = () => new Set(Furtividade.IDS.concat(['sobmedida', 'interior', 'masmorra', 'catacumbas', 'castelo', 'cemiterio']));
  const vale = L => !!L && LUGARES_OK().has(L.id);
  const limpa = o => ({ mascara: o && o.mascara ? o.mascara : null, proteger: o && Array.isArray(o.proteger) ? o.proteger : [], nivel: NIVEIS.some(x => x[0] === (o && o.nivel)) ? o.nivel : 'novo', evento: EVENTOS.some(x => x[0] === (o && o.evento)) ? o.evento : 'nada' });
  const prefs = () => limpa({ nivel: App.opt.tempoNivel, evento: App.opt.tempoEvento });
  const liga = o => o.nivel !== 'novo' || o.evento !== 'nada';

  const TEMPO_TXT = { usado: 'Em uso, mas gasto: anos sem reforma, poeira e marcas de uso.', abandonado: 'Abandonado há uns 20 ou 30 anos: teias, móveis caídos, as luzes apagadas, o mato entrando.', ruinas: 'Em ruínas há mais de um século: paredes caídas, entulho, a natureza tomando conta.' };
  const EVENTO_TXT = { incendio: 'Um incêndio passou por aqui.', saque: 'O lugar foi saqueado.', batalha: 'Houve uma luta aqui.', inundacao: 'A água subiu e tomou o lugar.' };
  const PISTAS = {
    incendio: ['A porta da saída foi trancada por fora: alguém quis que ninguém saísse.', 'O fogo começou em vários pontos ao mesmo tempo: não foi acidente.', 'Um lampião quebrado no chão, longe de qualquer mesa: alguém o jogou.'],
    saque: ['Os baús foram abertos com a chave, não arrombados: alguém de dentro ajudou.', 'Só um cômodo ficou intacto: o que procuravam não estava lá… ou ainda está.', 'Pegadas de botas iguais, de soldado, por toda parte.'],
    batalha: ['As barricadas estão do lado de dentro: quem morava aqui se defendia de alguém que entrou.', 'Uma das armas largadas tem o brasão de uma casa conhecida.', 'Só há corpos de um dos lados: os outros levaram os seus.'],
    inundacao: ['A marca da água na parede está na altura do peito: foi rápido.', 'As comportas (ou os canos) foram abertas de propósito.', 'Algo grande se arrastou pela lama depois que a água baixou.'],
    nada: ['Um diário esquecido conta os últimos dias de quem morava aqui.', 'Há um cômodo que alguém continua limpando: o lugar não está tão vazio quanto parece.', 'As marcas no chão mostram que alguém arrastou algo pesado para fora, não faz muito tempo.'],
  };
  // os objetos que o tempo não mexe: as passagens, as marcas do mestre, a história da missão, os portões
  const FIXOS = new Set(['escada', 'alcapao', 'entrada', 'saida', 'chegada', 'alvoMissao', 'portao', 'escadaMao', 'escadaPiscina', 'alavanca', 'chave', 'diario', 'pista', 'interesse', 'escombros', 'barricada', 'armas', 'corpo']);
  const MADEIRA = /mesa|cadeira|banco|cama|armario|estante|comoda|escrivaninha|bau|caixote|barril|prateleira|sofa|poltrona|aparador|atril|biombo|guarda|cabide/i;
  const PEQUENOS = /jarro|vela|calice|livro|garrafa|caneca|prato|vaso|sacos|flores|cesto|toalheiro|espelho|lampiao|candelabro/i;
  const mexe = (t, d) => !!(t && t.prop && d && !d.marca && !d.passagem && !FIXOS.has(t.prop) && !t.cena && !t.liga && !t.pz && !/^\d+ · /.test(t.name || ''));

  /* ---------------- o modelo (em quadrados): as paredes e os objetos, do plano ou da cena ---------------- */
  function doPlano(p) {
    return { W: p.W, H: p.H, paredes: arr(p.paredes).map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, k: w.k || 'wall', secret: !!w.secret })), objetos: arr(p.objetos).map(o => ({ id: o.id, x: o.x, y: o.y, fw: o.fw || o.s || 1, fh: o.fh || o.s || 1 })), mask: mascaraDe(p) };
  }
  function daCena(sc) {
    const c = sc.cell;
    return { W: sc.cols, H: sc.rows, paredes: (sc.walls || []).map(w => ({ x1: w.x1 / c, y1: w.y1 / c, x2: w.x2 / c, y2: w.y2 / c, k: w.k || 'wall', secret: !!w.secret, id: w.id })),
      objetos: (sc.tokens || []).filter(t => t.prop).map(t => { const [w, h] = tokWH(t); return { id: t.prop, x: t.x / c, y: t.y / c, fw: w, fh: h }; }) };
  }
  // o contorno de todas as paredes (as de fora não caem)
  function caixa(M) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const w of M.paredes) { x0 = Math.min(x0, w.x1, w.x2); y0 = Math.min(y0, w.y1, w.y2); x1 = Math.max(x1, w.x1, w.x2); y1 = Math.max(y1, w.y1, w.y2); }
    return { x0, y0, x1, y1 };
  }
  /* O que cai (Em ruínas): os vãos nas paredes de dentro (retas, de 3 quadrados ou mais) e as portas que somem.
     → { cortes: [{ i, t0, t1, cx, cy }], semPorta: [i] } (i: o índice da parede no modelo) */
  function planejar(M, o, seed) {
    const r = mulberry((seed >>> 0) ^ 0x7e3a9);
    const out = { cortes: [], semPorta: [] };
    if (o.nivel !== 'ruinas') return out;
    const B = caixa(M), naBeira = w => (w.x1 === w.x2 && (Math.abs(w.x1 - B.x0) < 0.6 || Math.abs(w.x1 - B.x1) < 0.6)) || (w.y1 === w.y2 && (Math.abs(w.y1 - B.y0) < 0.6 || Math.abs(w.y1 - B.y1) < 0.6));
    // (com a história da missão: as portas dela ficam, e nenhuma parede cai — senão o caminho dá a volta nos portões)
    const prot = arr(o.proteger), protegida = w => prot.some(q => [[q.x1, q.y1, q.x2, q.y2], [q.x2, q.y2, q.x1, q.y1]].some(([a, b, c2, d]) => Math.abs(w.x1 - a) < 0.05 && Math.abs(w.y1 - b) < 0.05 && Math.abs(w.x2 - c2) < 0.05 && Math.abs(w.y2 - d) < 0.05));
    M.paredes.forEach((w, i) => {
      if (protegida(w)) return;
      if (prot.length && w.k === 'wall') return;
      const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1), reta = w.x1 === w.x2 || w.y1 === w.y2;
      if (w.k === 'door' && !w.secret && r() < 0.45) { out.semPorta.push(i); return; }
      if (w.k !== 'wall' || !reta || L < 3 || naBeira(w) || r() > 0.35) return;
      const g = 1 + Math.floor(r() * 2), a = 1 + Math.floor(r() * Math.max(1, L - g - 1));
      const t0 = a / L, t1 = (a + g) / L, tm = (t0 + t1) / 2;
      out.cortes.push({ i, t0, t1, cx: w.x1 + (w.x2 - w.x1) * tm, cy: w.y1 + (w.y2 - w.y1) * tm, g });
    });
    return out;
  }

  /* O que é "dentro": as casas que não se alcançam da beira do mapa sem passar por uma parede, porta ou janela (a mureta
     e o muro baixo não contam: o jardim é fora). Sem nada dentro (um lugar aberto), vale o mapa todo. → Uint8Array W×H */
  const mascaraDe = p => (p && typeof p.grade === 'string' && p.grade.length === p.W * p.H ? Uint8Array.from(p.grade, ch => (ch === '0' ? 0 : 1)) : null);
  function dentro(M) {
    if (M.mask && M.mask.length === M.W * M.H) return M.mask;
    const W = M.W, H = M.H, V = Vigia.novo(W, H);
    for (const w of M.paredes) if (w.k !== 'mureta') Vigia.parede(V, w.x1, w.y1, w.x2, w.y2, false, true);
    const fora = new Uint8Array(W * H), fila = [];
    for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (!fora[y * W + x]) { fora[y * W + x] = 1; fila.push(y * W + x); }
    for (let y = 0; y < H; y++) for (const x of [0, W - 1]) if (!fora[y * W + x]) { fora[y * W + x] = 1; fila.push(y * W + x); }
    for (let i = 0; i < fila.length; i++) {
      const u = fila[i], x = u % W, y = (u - x) / W;
      const viz = [[1, 0, V.pV[y * (W + 1) + x + 1]], [-1, 0, V.pV[y * (W + 1) + x]], [0, 1, V.pH[(y + 1) * W + x]], [0, -1, V.pH[y * W + x]]];
      for (const [dx, dy, b] of viz) { const vx = x + dx, vy = y + dy; if (b || vx < 0 || vy < 0 || vx >= W || vy >= H) continue; const v = vy * W + vx; if (!fora[v]) { fora[v] = 1; fila.push(v); } }
    }
    const m = new Uint8Array(W * H); let n = 0;
    for (let k = 0; k < W * H; k++) if (!fora[k]) { m[k] = 1; n++; }
    if (n < 6) m.fill(1);
    return m;
  }

  /* ---------------- a camada pintada (por cima do fundo): k px por quadrado, a partir de (ox, oy) ---------------- */
  function pintar(g, M, pl, o, seed, k, ox, oy) {
    const r = mulberry((seed >>> 0) ^ 0x51ab3), nv = NV[o.nivel], ev = o.evento, W = M.W, H = M.H;
    const X = x => ox + x * k, Y = y => oy + y * k, rnd = (a, b) => a + r() * (b - a);
    // só dentro (as salas, os corredores): um ponto sorteado, e o teste de um ponto
    const D = dentro(M), cel = []; for (let q = 0; q < W * H; q++) if (D[q]) cel.push(q);
    const ehDentro = (x, y) => { const cx = Math.floor(x), cy = Math.floor(y); return cx >= 0 && cy >= 0 && cx < W && cy < H && D[cy * W + cx] === 1; };
    const ponto = () => { const q = cel[Math.floor(r() * cel.length)], x = q % W; return [x + r(), (q - x) / W + r()]; };
    const RX = () => ponto();
    g.save();
    // a poeira: tudo um pouco mais apagado e amarelado
    if (nv) { g.fillStyle = `rgba(${nv >= 3 ? '96,92,74' : '120,104,78'},${[0, 0.1, 0.18, 0.24][nv]})`; for (const q of cel) { const x = q % W; g.fillRect(X(x), Y((q - x) / W), k + 0.5, k + 0.5); } }
    const mancha = (x, y, raio, cor, a) => { const gr = g.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), raio * k); gr.addColorStop(0, `rgba(${cor},${a})`); gr.addColorStop(1, `rgba(${cor},0)`); g.fillStyle = gr; g.beginPath(); g.arc(X(x), Y(y), raio * k, 0, Math.PI * 2); g.fill(); };
    // os pontos ao longo das paredes (para a fuligem, o musgo, a marca da água)
    const aoLongo = (n, f) => { const ws = M.paredes.filter(w => w.k === 'wall'); if (!ws.length) return; for (let i = 0; i < n; i++) { const w = ws[Math.floor(r() * ws.length)], t = r(); const px = w.x1 + (w.x2 - w.x1) * t, py = w.y1 + (w.y2 - w.y1) * t; if (ehDentro(px - 0.5, py) || ehDentro(px + 0.5, py) || ehDentro(px, py - 0.5) || ehDentro(px, py + 0.5)) f(px, py, w); } };
    const area = cel.length, nArea = f => Math.round(area * f);
    // as manchas do uso e do tempo
    if (nv) for (let i = 0; i < nArea([0, 0.012, 0.025, 0.035][nv]); i++) mancha(...ponto(), rnd(0.6, 2.2), '58,42,24', rnd(0.12, 0.28));
    // as rachaduras
    if (nv >= 2) {
      g.strokeStyle = 'rgba(20,14,8,0.55)'; g.lineCap = 'round';
      for (let i = 0; i < nArea(nv >= 3 ? 0.01 : 0.004); i++) {
        let [x, y] = ponto(), a = rnd(0, Math.PI * 2);
        g.lineWidth = Math.max(1, k * 0.06); g.beginPath(); g.moveTo(X(x), Y(y));
        for (let s = 0; s < 6; s++) { a += rnd(-0.7, 0.7); x += Math.cos(a) * rnd(0.3, 0.8); y += Math.sin(a) * rnd(0.3, 0.8); g.lineTo(X(x), Y(y)); if (r() < 0.25) { g.moveTo(X(x), Y(y)); } }
        g.stroke();
      }
    }
    // as teias nos cantos (onde as paredes se encontram)
    if (nv >= 2) {
      const pontas = []; for (const w of M.paredes) if (w.k === 'wall') pontas.push([w.x1, w.y1], [w.x2, w.y2]);
      g.strokeStyle = 'rgba(235,235,235,0.38)'; g.lineWidth = Math.max(0.7, k * 0.025);
      for (const [px, py] of pontas) {
        if (r() > (nv >= 3 ? 0.12 : 0.2)) continue;
        if (![[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].some(([a, b]) => ehDentro(px + a, py + b))) continue;
        const R = rnd(0.6, 1.2) * k, a0 = Math.floor(r() * 4) * Math.PI / 2;
        for (let s = 0; s <= 4; s++) { const a = a0 + (s / 4) * Math.PI / 2; g.beginPath(); g.moveTo(X(px), Y(py)); g.lineTo(X(px) + Math.cos(a) * R, Y(py) + Math.sin(a) * R); g.stroke(); }
        for (let q = 1; q <= 3; q++) { g.beginPath(); for (let s = 0; s <= 4; s++) { const a = a0 + (s / 4) * Math.PI / 2, rr = R * q / 3.4; (s ? g.lineTo : g.moveTo).call(g, X(px) + Math.cos(a) * rr, Y(py) + Math.sin(a) * rr); } g.stroke(); }
      }
    }
    // o mato e o musgo entrando (rente às paredes) e os tufos no chão
    if (nv >= 2) {
      aoLongo(nv >= 3 ? nArea(0.03) : nArea(0.012), (x, y) => mancha(x + rnd(-0.4, 0.4), y + rnd(-0.4, 0.4), rnd(0.4, 1.1), nv >= 3 ? '64,96,40' : '70,90,46', rnd(0.3, 0.55)));
      g.strokeStyle = nv >= 3 ? 'rgba(96,140,58,0.8)' : 'rgba(110,130,70,0.7)'; g.lineWidth = Math.max(1, k * 0.05);
      for (let i = 0; i < nArea(nv >= 3 ? 0.02 : 0.006); i++) { const [x, y] = ponto(); for (let s = 0; s < 5; s++) { const a = -Math.PI / 2 + rnd(-0.8, 0.8); g.beginPath(); g.moveTo(X(x), Y(y)); g.lineTo(X(x) + Math.cos(a) * k * rnd(0.15, 0.35), Y(y) + Math.sin(a) * k * rnd(0.15, 0.35)); g.stroke(); } }
    }
    // o entulho (nos vãos das paredes caídas, e espalhado)
    const pedras = (x, y, n, esp) => { for (let i = 0; i < n; i++) { const px = x + rnd(-esp, esp), py = y + rnd(-esp, esp), s = rnd(0.12, 0.32) * k; const v = Math.round(rnd(88, 138)); g.fillStyle = `rgb(${v + 6},${v},${v - 10})`; g.beginPath(); for (let q = 0; q < 6; q++) { const a = q / 6 * Math.PI * 2 + rnd(-0.3, 0.3), rr = s * rnd(0.6, 1); (q ? g.lineTo : g.moveTo).call(g, X(px) + Math.cos(a) * rr, Y(py) + Math.sin(a) * rr); } g.closePath(); g.fill(); g.strokeStyle = 'rgba(20,16,10,0.6)'; g.lineWidth = 1; g.stroke(); } };
    for (const c of pl.cortes) { mancha(c.cx, c.cy, c.g * 0.9 + 0.4, '30,24,16', 0.45); pedras(c.cx, c.cy, 10 + c.g * 6, c.g * 0.6 + 0.3); }
    for (const i of pl.semPorta) { const w = M.paredes[i]; pedras((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2, 5, 0.45); }
    if (nv >= 3) for (let i = 0; i < nArea(0.006); i++) pedras(...ponto(), 6, 0.6);
    // o que houve
    if (ev === 'incendio') {
      aoLongo(nArea(0.03), (x, y) => mancha(x, y, rnd(0.8, 1.8), '14,10,8', rnd(0.35, 0.6)));
      for (let i = 0; i < nArea(0.01); i++) { const [x, y] = ponto(), R = rnd(0.8, 2); mancha(x, y, R * 1.25, '120,52,16', 0.22); mancha(x, y, R, '12,8,6', 0.7); }
      g.fillStyle = 'rgba(190,186,180,0.5)'; for (let i = 0; i < nArea(0.05); i++) { g.beginPath(); const [ax, ay] = ponto(); g.arc(X(ax), Y(ay), k * rnd(0.03, 0.08), 0, Math.PI * 2); g.fill(); }
    } else if (ev === 'inundacao') {
      aoLongo(nArea(0.03), (x, y) => mancha(x, y, rnd(0.5, 1), '40,52,48', rnd(0.3, 0.45)));
      for (let i = 0; i < nArea(0.012); i++) mancha(...ponto(), rnd(1, 2.4), '96,76,46', 0.4);
      for (let i = 0; i < nArea(0.014); i++) {
        const [x, y] = ponto(), rx = rnd(0.6, 1.6) * k, ry = rx * rnd(0.45, 0.8), a = rnd(0, Math.PI);
        g.fillStyle = 'rgba(70,98,112,0.55)'; g.beginPath(); g.ellipse(X(x), Y(y), rx, ry, a, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(200,225,235,0.45)'; g.lineWidth = Math.max(1, k * 0.04); g.beginPath(); g.ellipse(X(x) - rx * 0.2, Y(y) - ry * 0.25, rx * 0.5, ry * 0.35, a, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
      }
    } else if (ev === 'batalha') {
      const sangue = (x, y, s) => { mancha(x, y, s, '92,14,12', 0.55); g.fillStyle = 'rgba(96,12,10,0.6)'; for (let q = 0; q < 7; q++) { const a = rnd(0, Math.PI * 2), d = rnd(0.4, 1.3) * s; g.beginPath(); g.arc(X(x + Math.cos(a) * d), Y(y + Math.sin(a) * d), k * rnd(0.04, 0.12), 0, Math.PI * 2); g.fill(); } };
      for (let i = 0; i < nArea(0.008); i++) sangue(...ponto(), rnd(0.4, 1.1));
      if (nv >= 2) { g.strokeStyle = 'rgba(232,224,204,0.85)'; g.lineWidth = Math.max(1.5, k * 0.08); g.lineCap = 'round'; for (let i = 0; i < nArea(0.006); i++) { const [x, y] = ponto(); for (let q = 0; q < 3; q++) { const a = rnd(0, Math.PI), l = rnd(0.2, 0.45) * k, cx = X(x + rnd(-0.3, 0.3)), cy = Y(y + rnd(-0.3, 0.3)); g.beginPath(); g.moveTo(cx - Math.cos(a) * l, cy - Math.sin(a) * l); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.stroke(); } } }
    } else if (ev === 'saque') {
      for (let i = 0; i < nArea(0.02); i++) { const [x0, y0] = ponto(), x = X(x0), y = Y(y0), a = rnd(0, Math.PI); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = 'rgba(232,222,196,0.85)'; g.fillRect(-k * 0.18, -k * 0.13, k * 0.36, k * 0.26); g.strokeStyle = 'rgba(80,60,40,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-k * 0.12, -k * 0.04); g.lineTo(k * 0.12, -k * 0.04); g.moveTo(-k * 0.12, k * 0.04); g.lineTo(k * 0.08, k * 0.04); g.stroke(); g.restore(); }
      for (let i = 0; i < nArea(0.006); i++) { const [x, y] = ponto(); g.fillStyle = 'rgba(150,84,52,0.9)'; for (let q = 0; q < 4; q++) { g.beginPath(); const px = X(x + rnd(-0.3, 0.3)), py = Y(y + rnd(-0.3, 0.3)), s = k * rnd(0.06, 0.13); g.moveTo(px, py - s); g.lineTo(px + s, py + s * 0.6); g.lineTo(px - s * 0.8, py + s * 0.4); g.closePath(); g.fill(); } }
    }
    g.restore();
  }

  /* ---------------- na cena ---------------- */
  const corte = (w, t0, t1) => {
    const L = (a, b, t) => a + (b - a) * t, out = [];
    if (t0 > 0.02) out.push(Object.assign({}, w, { id: uid('wl'), x2: L(w.x1, w.x2, t0), y2: L(w.y1, w.y2, t0) }));
    if (t1 < 0.98) out.push(Object.assign({}, w, { id: uid('wl'), x1: L(w.x1, w.x2, t1), y1: L(w.y1, w.y2, t1) }));
    return out;
  };
  // espera a imagem do fundo carregar (ou desiste)
  function imgPronta(id) {
    const a = Store.S.assets[id];
    if (!a || !a.url) return Promise.resolve(null);
    return new Promise(ok => {
      const im = new Image();
      if (/^https?:/.test(a.url)) im.crossOrigin = 'anonymous';
      const t = setTimeout(() => ok(null), 30000);
      im.onload = () => { clearTimeout(t); ok(im); };
      im.onerror = () => { clearTimeout(t); ok(null); };
      im.src = a.url;
    });
  }
  async function aplicar(sc, o, seed) {
    o = limpa(o);
    if (!liga(o)) return '';
    seed = (Number(seed) >>> 0) || ((Math.random() * 2147483000) >>> 0) + 1;
    const r = mulberry(seed ^ 0x3c1d), c = sc.cell, nv = NV[o.nivel], ev = o.evento;
    const M = daCena(sc), pl = planejar(M, o, seed);
    if (o.mascara && o.mascara.length === M.W * M.H) M.mask = o.mascara;      // (a masmorra: o chão das salas e dos corredores, do plano)
    // o fundo: a camada pintada por cima, numa imagem nova
    if (sc.bg && sc.bg.asset) {
      try {
        const im = await imgPronta(sc.bg.asset);
        if (im) {
          const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
          const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
          const dw = sc.bg.stretch ? sc.cols * c : sc.cols * c * (sc.bg.scale || 1), kx = im.naturalWidth / (sc.bg.stretch ? sc.cols * c : dw);
          const ox = sc.bg.stretch ? 0 : -(sc.bg.dx || 0) * kx, oy = sc.bg.stretch ? 0 : -(sc.bg.dy || 0) * kx;
          pintar(g, M, pl, o, seed, c * kx, ox, oy);
          const a = await Assets.fromCanvas(cv, 'bg', sc.name);
          sc.bg = Object.assign({}, sc.bg, { asset: a.id });
        }
      } catch (e) { console.error(e); }
    }
    // as paredes: os vãos e as portas que sumiram
    const fora = new Set(pl.semPorta.map(i => M.paredes[i].id)), cortes = new Map(pl.cortes.map(x => [M.paredes[x.i].id, x]));
    const novas = [];
    for (const w of sc.walls) {
      if (fora.has(w.id)) continue;
      const k = cortes.get(w.id);
      if (k) novas.push(...corte(w, k.t0, k.t1)); else novas.push(w);
    }
    sc.walls = novas;
    for (const k of pl.cortes) if (Props.P.escombros && r() < 0.6) { const t = Props.novo(sc, 'escombros', Math.floor(k.cx - 0.5) * c, Math.floor(k.cy - 0.5) * c, 1, false); sc.tokens.push(t); }
    // as portas: no saque, as trancadas foram arrombadas; abandonado e em ruínas, muitas ficaram abertas
    const prot = o.proteger.map(q => [q.x1 * c, q.y1 * c, q.x2 * c, q.y2 * c]), pr = (a, b) => Math.abs(a - b) < c * 0.05;
    const protegida = w => prot.some(([a, b, c2, d]) => (pr(w.x1, a) && pr(w.y1, b) && pr(w.x2, c2) && pr(w.y2, d)) || (pr(w.x1, c2) && pr(w.y1, d) && pr(w.x2, a) && pr(w.y2, b)));
    for (const w of sc.walls) {
      if (w.k !== 'door' || w.secret || protegida(w)) continue;
      if (ev === 'saque' && w.locked) { w.locked = false; w.open = true; delete w.fech; continue; }
      if (nv >= 2 && r() < 0.4) { w.open = true; w.locked = false; }
    }
    // os objetos
    let tirados = 0, caidos = 0;
    const tirar = new Set();
    for (const t of sc.tokens) {
      const d = Props.P[t.prop];
      if (!mexe(t, d)) continue;
      if (d.luz && t.light && (nv >= 2 || ev === 'incendio' || ev === 'inundacao')) t.light = Object.assign({}, t.light, { on: false });
      const mad = MADEIRA.test(t.prop), peq = PEQUENOS.test(t.prop);
      const p = (ev === 'incendio' && mad ? 0.5 : 0) + (nv >= 3 ? 0.35 : nv === 2 ? 0.12 : 0) + (ev === 'saque' && peq ? 0.5 : 0) + (ev === 'inundacao' && peq ? 0.3 : 0);
      if (r() < Math.min(0.8, p)) { tirar.add(t.id); tirados++; continue; }
      // tombado: torto (os de um quadrado)
      if ((nv >= 2 || ev === 'batalha' || ev === 'inundacao') && !d.fw && (t.size || 1) <= 1 && r() < 0.3) { t.rot = ((t.rot || 0) + (r() < 0.5 ? -1 : 1) * (25 + Math.floor(r() * 50)) + 360) % 360; caidos++; }
      // o saque abre o que tranca
      if (ev === 'saque' && (d.tranca || (Props.estados(t.prop) || []).some(e => e[0] === 'aberto'))) { if ((Props.estados(t.prop) || []).some(e => e[0] === 'aberto')) t.est = 'aberto'; delete t.tranca; delete t.pz; }
    }
    sc.tokens = sc.tokens.filter(t => !tirar.has(t.id));
    if (nv >= 2 || ev === 'incendio' || ev === 'inundacao') sc.lights = (sc.lights || []).map(l => Object.assign({}, l, { on: false }));
    // as casas livres (para pôr as coisas novas)
    const ocup = new Set(); for (const t of sc.tokens) { const [w, h] = tokWH(t); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) ocup.add(Math.round(t.x / c + x) + ',' + Math.round(t.y / c + y)); }
    const B = caixa(M), livre = () => { for (let i = 0; i < 80; i++) { const x = Math.floor(B.x0 + 1 + r() * Math.max(1, B.x1 - B.x0 - 2)), y = Math.floor(B.y0 + 1 + r() * Math.max(1, B.y1 - B.y0 - 2)); if (isFinite(x) && isFinite(y) && !ocup.has(x + ',' + y)) { ocup.add(x + ',' + y); return [x, y]; } } return null; };
    const por = (id, n, hidden) => { for (let i = 0; i < n; i++) { const q = livre(); if (!q || !Props.P[id]) return; const t = Props.novo(sc, id, q[0] * c, q[1] * c, Props.P[id].size || 1, !!hidden); if (Props.P[id].size === 1 || !Props.P[id].fw) t.rot = Math.floor(r() * 8) * 45; sc.tokens.push(t); } };
    const area = sc.cols * sc.rows;
    if (nv >= 3) por('escombros', Math.max(2, Math.round(area / 260)));
    if (ev === 'batalha') { por('armas', Math.max(2, Math.round(area / 400))); por('barricada', 1 + (r() < 0.5 ? 1 : 0)); if (nv <= 1) por('corpo', 1 + Math.floor(r() * 2)); }
    if (ev === 'incendio' && nv >= 1) por('escombros', 1 + Math.floor(r() * 2));
    // a nota do mestre e a pista
    const pistas = PISTAS[ev] || PISTAS.nada, pista = pistas[Math.floor(r() * pistas.length)];
    const nota = [TEMPO_TXT[o.nivel], EVENTO_TXT[ev], 'Pista: ' + pista].filter(Boolean).join(' ');
    const q1 = livre(), q2 = livre();
    if (q1 && Props.P.interesse) { const t = Props.novo(sc, 'interesse', q1[0] * c, q1[1] * c, 1, true); t.name = 'O que houve aqui'; t.notes = nota; sc.tokens.push(t); }
    if (q2 && Props.P.pista) { const t = Props.novo(sc, 'pista', q2[0] * c, q2[1] * c, 1, true); t.name = 'Pista: o que houve'; t.notes = pista; sc.tokens.push(t); }
    sc.tempo = { nivel: o.nivel, evento: ev, nota };
    const partes = [o.nivel !== 'novo' ? NIVEIS.find(x => x[0] === o.nivel)[1].toLowerCase() : null, ev !== 'nada' ? 'depois de ' + ({ incendio: 'um incêndio', saque: 'um saque', batalha: 'uma batalha', inundacao: 'uma inundação' })[ev] : null].filter(Boolean);
    return `O tempo: ${partes.join(', ')}${pl.cortes.length ? ` (${pl.cortes.length} ${pl.cortes.length === 1 ? 'parede caída' : 'paredes caídas'})` : ''}. A nota "O que houve aqui" e a pista estão escondidas no mapa.`;
  }

  /* ---------------- o gerador: o bloco "O tempo" e a prévia ---------------- */
  function controles(K, mudou, o, set) {
    o = o || prefs();
    set = set || ((k, v) => { App.opt[k === 'nivel' ? 'tempoNivel' : 'tempoEvento'] = v; if (mudou) mudou(); });
    return h('div', { class: 'ger-tempo', id: 'ger-tempo' },
      K.field('O tempo', K.seg('ger-tempo-nivel', o.nivel, NIVEIS, v => set('nivel', v)), 'stack'),
      K.field('O que houve', K.seg('ger-tempo-evento', o.evento, EVENTOS, v => set('evento', v)), 'stack'),
      liga(o) ? K.note('Na cena, as paredes, os objetos e as luzes também mudam (a prévia mostra só o desenho). Uma nota e uma pista ficam escondidas no mapa, só para você.') : null);
  }
  const resumoBloco = () => { const o = prefs(); return liga(o) ? [o.nivel !== 'novo' ? NIVEIS.find(x => x[0] === o.nivel)[1] : null, o.evento !== 'nada' ? EVENTOS.find(x => x[0] === o.evento)[1] : null].filter(Boolean).join(', ').toLowerCase() : 'novo'; };
  // a prévia: a camada pintada sobre o plano
  function previa(g, p, cell, o) {
    o = limpa(o || prefs());
    if (!liga(o) || !p || !p.W) return;
    const M = doPlano(p), seed = (p.seed >>> 0) || 1;
    pintar(g, M, planejar(M, o, seed), o, seed, cell, 0, 0);
  }

  /* ---------------- "Envelhecer esta cena…": uma cópia, anos depois ---------------- */
  function abrirEnvelhecer() {
    if (!isGM()) return;
    const src = Store.scene();
    if (!src) return;
    const o = limpa({ nivel: 'abandonado', evento: 'nada' });
    let nome = src.name + ' — anos depois';
    const K = UI.kit;
    const corpo = h('div', { class: 'tempo-env' });
    const pintarC = () => corpo.replaceChildren(
      K.note('Faz uma cópia desta cena, envelhecida. A original fica como está.'),
      controles(K, null, o, (k, v) => { o[k] = v; pintarC(); }),
      K.field('Nome da cópia', h('input', { class: 'in', id: 'tempo-nome', value: nome, oninput: e => { nome = e.target.value; } }), 'stack'));
    pintarC();
    UI.modal({ title: 'Envelhecer esta cena', body: corpo, actions: [{ label: 'Cancelar' }, { label: 'Envelhecer', kind: 'primary', keep: true, run: () => {
      if (!liga(o)) { UI.toast('Escolha o tempo ou o que houve.'); return false; }
      const b = K.card() && K.card().querySelector('.modal-a .btn.primary');
      if (b) { b.disabled = true; b.textContent = 'Envelhecendo…'; }
      envelhecer(src.id, o, nome).then(sc => { UI.closeModal(); UI.switchScene(sc.id); }, e => { console.error(e); if (b) { b.disabled = false; b.textContent = 'Envelhecer'; } UI.toast('Não deu para envelhecer a cena.'); });
      return false;
    } }] });
  }
  async function envelhecer(id, o, nome) {
    const src = Store.S.scenes[id];
    const sc = clone(src);
    sc.id = uid('cena'); sc.name = (nome || src.name + ' — anos depois').trim().slice(0, 80); sc.explored = {}; delete sc.sample; delete sc.trama;
    const txt = await aplicar(sc, o, ((Math.random() * 2147483000) >>> 0) + 1);
    Store.addScene(sc);
    const mae = UI.maeDaCena(id); if (mae) UI.colocarCena(sc.id, 'm:' + mae);      // (fica na mesma família da original)
    Persist.scene(sc.id);
    UI.toast(`"${sc.name}" criada. ${txt}`, { long: true });
    return sc;
  }
  return { mascaraDe, NIVEIS, EVENTOS, prefs, vale, liga, aplicar, controles, resumoBloco, previa, abrirEnvelhecer, envelhecer, planejar, doPlano, daCena };
})();
