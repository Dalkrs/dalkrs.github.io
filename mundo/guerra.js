/* Tiny Cats · Mapa-múndi · a guerra (lote 8, parte 6): o motor das batalhas, sem página e sem DOM.
   Os lados (a partir do grupo do Exército: as unidades, a moral, o comandante, os mantimentos), os bônus de cada lado
   (na escala do d20: os números, a qualidade, os tipos de tropa, a moral, o comandante, a magia, a distância, a
   fortificação, a fome e o que o mestre pôs), a batalha resumida (um d100 de cada lado) e a detalhada (um d20 de cada
   lado em cada momento: Abertura, Choque, Virada e Desfecho; momento-chave quando fica apertado ou sai 1 ou 20), o
   fim por recuo, rendição ou trégua, o depois da batalha (a prévia: tropas e HP, moral, mantimentos, a fortificação,
   a frente que anda e o hexágono) e o aplicar, os mantimentos de cada dia e os exércitos que se encontram.
   Tudo é conta: os dados vêm de quem chama (rng), e a mesma entrada dá a mesma saída. Roda no navegador
   (window.MundoGuerra) e no Node (testes). */
(() => {
  'use strict';
  const NN = () => (typeof window !== 'undefined' && window.MundoNucleo) || (typeof require === 'function' ? require('./nucleo.js') : null);
  const limitar = (n, a, b) => Math.min(b, Math.max(a, n));
  const soma = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
  const copia = x => JSON.parse(JSON.stringify(x));

  // os tamanhos do resultado (0 = empate) e quanto cada um mexe
  const TAMANHOS = ['Empate', 'Vitória apertada', 'Vitória', 'Vitória clara', 'Vitória esmagadora'];
  const PERDA_PERDEDOR = [0.06, 0.12, 0.22, 0.35, 0.5], PERDA_VENCEDOR = [0.06, 0.08, 0.07, 0.06, 0.04];
  const MORAL_PERDEDOR = [0, 1, 2, 3, 4], MORAL_VENCEDOR = [0, 0, 1, 1, 2];
  const DANO_ESTRUTURA = [0, 2, 4, 7, 10];
  const AVANCO = [0, 1, 2, 3, 4];                 // quantos hexágonos a frente anda, pelo tamanho da vitória
  const ORDEM_MOMENTOS = ['ab', 'ch', 'vi', 'de'];
  // o que cada momento soma (a resumida soma tudo, uma vez)
  const DO_MOMENTO = {
    ab: ['magia', 'distancia'],
    ch: ['numeros', 'qualidade', 'tipos', 'estrutura', 'fome'],
    vi: ['moral', 'comandante', 'herois'],
    de: ['numeros', 'moral', 'fome'],
    d100: ['numeros', 'qualidade', 'tipos', 'moral', 'comandante', 'herois', 'magia', 'distancia', 'estrutura', 'fome'],
  };
  const NOMES = { numeros: 'Números', qualidade: 'ATQ contra DEF', tipos: 'Tipos de tropa', moral: 'Moral', comandante: 'Comandante', herois: 'Heróis', magia: 'Magos',
    distancia: 'À distância', estrutura: 'Fortificação', fome: 'Sem mantimentos', mestre: 'Do mestre' };
  const BONUS_MESTRE = { tatica: 'Tática', terreno: 'Terreno', reforco: 'Reforço', magia: 'Magia', outro: 'Outro' };

  /* (lote 9) Os heróis: personagens com ficha (os do grupo, NPCs) que lutam junto. O bônus sugerido é a média de dois:
     +1 a cada 5 níveis (até +10, no nível 50) e +1 a cada 13 pontos do maior atributo (até +10); o mestre pode escrever
     outro. Somam na Virada (e na resumida), até +10 por lado. A ação heroica, num momento-chave: o herói rola um
     atributo da ficha contra a dificuldade que o mestre escolhe — passou, +5; passou pelo dobro, +10; falhou, −2 (fora
     do teto). Os ferimentos (no HP da ficha), pelo tamanho do resultado: quem perde, de 10% a 40% do HP máximo; quem
     vence, até 10%; empate ou trégua, 5%. */
  const MAX_HEROIS_BONUS = 10;
  function bonusSugerido(nivel, maiorAtr) {
    const a = Math.min(10, Math.max(0, Math.floor((Number(nivel) || 0) / 5))), b = Math.min(10, Math.max(0, Math.floor((Number(maiorAtr) || 0) / 13)));
    return Math.round((a + b) / 2);
  }
  function resultadoHeroico(total, dif) {
    const d = Math.max(1, Math.round(Number(dif) || 0)), t = Number(total) || 0;
    return t >= 2 * d ? 10 : t >= d ? 5 : -2;
  }
  const FERIDA_PERDEDOR = [5, 10, 20, 30, 40], FERIDA_VENCEDOR = [5, 10, 7, 5, 3];
  // quanto (em % do HP máximo) a batalha fere um herói do lado `quem`
  function feridaDoHeroi(fim, quem) {
    if (!fim || fim.como === 'tregua' || !fim.vence) return 5;
    const tam = limitar(Math.round(Number(fim.tam) || 0), 0, 4);
    return quem === fim.vence ? FERIDA_VENCEDOR[tam] : FERIDA_PERDEDOR[tam];
  }

  // um dado de n lados (rng: de 0 a 1)
  const rolar = (n, rng) => 1 + Math.floor(limitar((rng || Math.random)(), 0, 0.999999) * n);
  const log2 = x => Math.log(x) / Math.LN2;

  /* Um lado da batalha, a partir do grupo do Exército (o que entra na conta; o mapa não muda). As unidades sem tropas
     não lutam. força da unidade = tropas × (0,5 + 0,5 × HP/HP máx.): a unidade ferida luta pela metade, no pior caso. */
  function lado(mapa, g) {
    const exe = g && g.exe && !g.exe.pub ? g.exe : { cmd: { nome: '', b: 0 }, moral: 5, mant: 0, cons: null, fome: 0, unid: [] };
    const tipos = mapa && mapa.guerra ? mapa.guerra.tipos : [];
    const tipoDe = id => tipos.find(t => t.id === id) || null;
    const unid = exe.unid.filter(u => u.tropas > 0);
    const forcaU = u => u.tropas * (0.5 + 0.5 * (u.hpMax ? limitar(u.hp / u.hpMax, 0, 1) : 1));
    const atqU = u => u.atq + soma(u.equip || [], e => e.atq), defU = u => u.def + soma(u.equip || [], e => e.def);
    const F = soma(unid, forcaU);
    const media = f => (F > 0 ? soma(unid, u => forcaU(u) * f(u)) / F : 0);
    const share = new Map();
    for (const u of unid) share.set(u.tipo || '', (share.get(u.tipo || '') || 0) + (F > 0 ? forcaU(u) / F : 0));
    return {
      g: g ? g.id : null, nome: g ? (g.nome || 'Exército') : 'Lado', fac: g ? g.fac || null : null, x: g ? g.x : null, y: g ? g.y : null,
      cmd: exe.cmd.b || 0, cmdNome: exe.cmd.nome || '', moral: exe.moral, fome: exe.fome || 0, mant: exe.mant || 0,
      tropas: soma(unid, u => u.tropas), forca: F, atq: media(atqU), def: media(defU), magos: soma(unid, u => u.magos || 0), cerco: soma(unid, u => u.cerco || 0),
      dist: soma(unid.filter(u => { const t = tipoDe(u.tipo); return !!(t && t.dist); }), forcaU), share, tipos,
    };
  }

  // a vantagem por números: o lado maior ganha 4 a cada vez que dobra o outro (até 10); o menor, nada
  function numeros(fx, fy) {
    if (!(fx > 0)) return 0;
    if (!(fy > 0)) return 10;
    return fx <= fy ? 0 : Math.min(10, Math.round(4 * log2(fx / fy)));
  }
  /* Os bônus de X contra Y, componente por componente (na escala do d20). ctx: { estr: { lado, def, hp, hpMax } | null
     (a fortificação de quem defende), mestre: [{ lado, mom, tipo, v, txt }] (mom null = a batalha toda) }; quem: 'a'
     ou 'b' (o lado de X); mom: o momento (ou 'd100'). → [{ k, nome, v }] (só os que valem algo) */
  function bonus(X, Y, ctx, quem, mom) {
    const c = {
      numeros: () => numeros(X.forca, Y.forca),
      qualidade: () => limitar(Math.round(X.atq - Y.def), -6, 6),
      tipos: () => {
        let s = 0;
        for (const [ta, wa] of X.share) { const t = X.tipos.find(q => q.id === ta); if (!t) continue; for (const [tb, wb] of Y.share) s += wa * wb * (t.vant[tb] || 0); }
        return Math.round(s);
      },
      moral: () => X.moral - 5,
      comandante: () => X.cmd,
      magia: () => Math.min(6, Math.round(Math.sqrt(X.magos))),
      distancia: () => (X.dist > 0 && !(Y.dist > 0) ? 3 : Math.min(6, numeros(X.dist, Y.dist))),
      estrutura: () => {
        const e = ctx && ctx.estr;
        if (!e || e.lado !== quem) return 0;
        return Math.max(0, Math.round(e.def * (e.hpMax ? limitar(e.hp / e.hpMax, 0, 1) : 1)) - Y.cerco);
      },
      fome: () => -Math.min(3, X.fome),
      // (lote 9) os heróis do lado (o bônus de cada um: o da ficha, ou o que o mestre escreveu), até +10 por lado
      herois: () => limitar(Math.round(soma((ctx && ctx.herois && ctx.herois[quem]) || [], h => Number(h.v) || 0)), -MAX_HEROIS_BONUS, MAX_HEROIS_BONUS),
    };
    const out = [];
    for (const k of DO_MOMENTO[mom] || []) { const v = c[k](); if (v) out.push({ k, nome: NOMES[k], v }); }
    // (lote 9) as ações heroicas do momento (fora do teto dos heróis)
    for (const h of (ctx && ctx.acoes) || []) {
      if (h.lado !== quem || !h.v || h.mom !== mom) continue;
      out.push({ k: 'heroica', nome: 'Ação heroica' + (h.nome ? ' de ' + h.nome : ''), v: h.v });
    }
    for (const b of (ctx && ctx.mestre) || []) {
      if (b.lado !== quem || !b.v) continue;
      if (b.mom && mom !== 'd100' && b.mom !== mom) continue;
      out.push({ k: 'mestre', nome: (BONUS_MESTRE[b.tipo] || 'Do mestre') + (b.txt ? ': ' + b.txt : ''), v: b.v });
    }
    return out;
  }
  const total = bs => soma(bs, b => b.v);

  /* A batalha resumida: um d100 de cada lado, mais 5 vezes os bônus. A margem diz o tamanho: menos de 8, empate; até 24,
     apertada; até 49, vitória; até 79, clara; 80 ou mais, esmagadora. dados: [da, db] (rolar de novo com os mesmos, nos
     testes); sem eles, rng. */
  function tamanhoD100(m) { const a = Math.abs(m); return a < 8 ? 0 : a < 25 ? 1 : a < 50 ? 2 : a < 80 ? 3 : 4; }
  function resumida(A, B, ctx, rng, dados) {
    const ba = bonus(A, B, ctx, 'a', 'd100'), bb = bonus(B, A, ctx, 'b', 'd100');
    const da = dados ? dados[0] : rolar(100, rng), db = dados ? dados[1] : rolar(100, rng);
    const ta = da + 5 * total(ba), tb = db + 5 * total(bb), m = ta - tb, tam = tamanhoD100(m);
    return { da, db, ba, bb, ta, tb, m, tam, vence: tam ? (m > 0 ? 'a' : 'b') : null };
  }
  /* Um momento da detalhada: um d20 de cada lado, mais os bônus do momento. Momento-chave: a disputa ficou apertada
     (margem de 2 ou menos) ou saiu 1 ou 20 num dos dados. */
  function momento(k, A, B, ctx, rng, dados) {
    const ba = bonus(A, B, ctx, 'a', k), bb = bonus(B, A, ctx, 'b', k);
    const da = dados ? dados[0] : rolar(20, rng), db = dados ? dados[1] : rolar(20, rng);
    const ta = da + total(ba), tb = db + total(bb), m = ta - tb;
    return { k, da, db, ba, bb, ta, tb, m, chave: Math.abs(m) <= 2 || da === 1 || da === 20 || db === 1 || db === 20 };
  }
  // o placar da detalhada (a soma das margens) e o tamanho: menos de 4, empate; até 11, apertada; até 23, vitória; até 35, clara
  function tamanhoD20(p) { const a = Math.abs(p); return a < 4 ? 0 : a < 12 ? 1 : a < 24 ? 2 : a < 36 ? 3 : 4; }
  function fimDetalhada(moms) {
    const placar = soma(moms, m => m.m), tam = tamanhoD20(placar);
    return { placar, tam, vence: tam ? (placar > 0 ? 'a' : 'b') : null, como: 'dados' };
  }
  // parar a batalha: o recuo (quem recua perde, por pouco), a rendição (quem se rende perde, feio) e a trégua (ninguém)
  function parar(como, por) {
    const outro = por === 'a' ? 'b' : 'a';
    if (como === 'recuo') return { vence: outro, tam: 1, como, por };
    if (como === 'rendicao') return { vence: outro, tam: 3, como, por };
    return { vence: null, tam: 0, como: 'tregua', por: null };
  }
  // o texto do resultado: "Vitória clara de Exército do Norte"; "Empate"; "Trégua"; "Exército do Sul recuou"
  function textoFim(fim, nomeA, nomeB) {
    const nome = q => (q === 'a' ? nomeA : nomeB);
    if (fim.como === 'tregua') return 'Trégua: ninguém venceu';
    if (fim.como === 'recuo') return nome(fim.por) + ' recuou — ' + TAMANHOS[1].toLocaleLowerCase('pt-BR') + ' de ' + nome(fim.vence);
    if (fim.como === 'rendicao') return nome(fim.por) + ' se rendeu — ' + TAMANHOS[3].toLocaleLowerCase('pt-BR') + ' de ' + nome(fim.vence);
    return fim.vence ? TAMANHOS[fim.tam] + ' de ' + nome(fim.vence) : 'Empate: os dois lados recuam';
  }

  /* ---------------- o depois da batalha ---------------- */
  // quanto cada lado perde (em fração das tropas e do HP máx.)
  function perdas(fim) {
    if (fim.como === 'tregua') return { a: 0.03, b: 0.03 };
    if (!fim.vence) return { a: PERDA_PERDEDOR[0], b: PERDA_PERDEDOR[0] };
    const perde = fim.vence === 'a' ? 'b' : 'a', out = {};
    if (fim.como === 'recuo') { out[perde] = 0.1; out[fim.vence] = 0.03; }
    else if (fim.como === 'rendicao') { out[perde] = PERDA_PERDEDOR[3]; out[fim.vence] = 0.02; }
    else { out[perde] = PERDA_PERDEDOR[fim.tam]; out[fim.vence] = PERDA_VENCEDOR[fim.tam]; }
    return out;
  }
  function moralDepois(fim, quem, moral) {
    if (!fim.vence) return moral;
    if (quem === fim.vence) return limitar(moral + (fim.como === 'dados' ? MORAL_VENCEDOR[fim.tam] : fim.como === 'rendicao' ? 1 : 0), 0, 10);
    return limitar(moral - (fim.como === 'recuo' ? 1 : fim.como === 'rendicao' ? 3 : MORAL_PERDEDOR[fim.tam]), 0, 10);
  }
  // a distância de um ponto à polilinha, o ponto mais perto e a normal do trecho ali
  function pertoDaLinha(pts, x, y) {
    let m = null;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? limitar(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1) : 0;
      const px = ax + dx * t, py = ay + dy * t, d = Math.hypot(x - px, y - py);
      if (!m || d < m.d) { const L = Math.hypot(dx, dy) || 1; m = { d, x: px, y: py, nx: -dy / L, ny: dx / L }; }
    }
    return m;
  }
  // a linha com um ponto a cada passo (as pontas ficam)
  function densa(pts, passo) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / passo));
      for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
    }
    return out;
  }
  // tira os pontos que quase não mudam a linha (Douglas-Peucker), para o mapa não crescer à toa
  function enxuta(pts, eps) {
    if (pts.length < 3) return pts;
    const manter = new Uint8Array(pts.length), pilha = [[0, pts.length - 1]];
    manter[0] = manter[pts.length - 1] = 1;
    while (pilha.length) {
      const [a, b] = pilha.pop();
      let iM = -1, dM = eps;
      for (let i = a + 1; i < b; i++) { const p = pertoDaLinha([pts[a], pts[b]], pts[i][0], pts[i][1]); if (p.d > dM) { dM = p.d; iM = i; } }
      if (iM >= 0) { manter[iM] = 1; pilha.push([a, iM], [iM, b]); }
    }
    return pts.filter((_, i) => manter[i]);
  }
  /* A frente anda n hexágonos (de tamanho passo) na direção do ponto de quem perdeu, perto da batalha (no ponto (bx, by)
     anda tudo; a 4 hexágonos dali, nada). → os pontos novos (arredondados) */
  function frenteAnda(pts, bx, by, px, py, n, passo) {
    if (!Array.isArray(pts) || pts.length < 2 || !(n > 0) || !(passo > 0)) return pts;
    const ref = pertoDaLinha(pts, px, py);
    if (!ref) return pts;
    const sinal = (px - ref.x) * ref.nx + (py - ref.y) * ref.ny >= 0 ? 1 : -1, R = 4 * passo, D = n * passo;
    const out = densa(pts, passo / 2).map(([x, y]) => {
      const w = Math.max(0, 1 - Math.hypot(x - bx, y - by) / R);
      if (!w) return [x, y];
      const p = pertoDaLinha(pts, x, y);
      return [x + p.nx * sinal * D * w, y + p.ny * sinal * D * w];
    });
    return enxuta(out, passo * 0.08).map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
  }

  /* A prévia do depois. bat: { a: { g }, b: { g }, fim, estr: { m (id do marcador), lado } | null, hex: "q,r" | null,
     frente: { f (id), n } | null, hexEst: 'd' | 'c' | null }. → { lados: { a, b } (cada unidade antes e depois, a
     moral e os mantimentos), estr, frente, hex } — nada muda no mapa (aplicar faz). */
  function depois(mapa, bat) {
    const N = NN(), achar = id => (id ? mapa.objs.find(o => o.id === id) || null : null), p = perdas(bat.fim), out = { lados: {}, estr: null, frente: null, hex: null };
    for (const q of ['a', 'b']) {
      const g = achar(bat[q] && bat[q].g), exe = g && g.exe && !g.exe.pub ? g.exe : null;
      if (!exe) { out.lados[q] = null; continue; }
      const f = p[q] || 0, c = N.consumoDe(exe);
      out.lados[q] = {
        g: g.id, nome: g.nome || 'Exército', perda: f,
        unid: exe.unid.map(u => {
          // (a unidade acaba quando as tropas ou o HP chegam a zero: sai do exército ao aplicar)
          const tropas = u.tropas > 0 ? Math.max(0, Math.round(u.tropas * (1 - f))) : 0, hp = Math.max(0, u.hp - Math.round(u.hpMax * f));
          return { id: u.id, nome: u.nome, tropas0: u.tropas, tropas1: tropas, hp0: u.hp, hp1: hp, acaba: u.tropas > 0 && (tropas === 0 || hp === 0) };
        }),
        moral0: exe.moral, moral1: moralDepois(bat.fim, q, exe.moral), mant0: exe.mant, mant1: Math.max(0, exe.mant - c),
      };
    }
    // a fortificação de quem defende: o cerco de quem ataca sempre bate; vencendo, bate mais
    const m = bat.estr ? achar(bat.estr.m) : null;
    if (m && m.estr) {
      const atacante = bat.estr.lado === 'a' ? 'b' : 'a', ga = achar(bat[atacante] && bat[atacante].g);
      const cerco = ga && ga.exe && !ga.exe.pub ? soma(ga.exe.unid.filter(u => u.tropas > 0), u => u.cerco || 0) : 0;
      const dano = bat.fim.vence === atacante ? cerco * 2 + DANO_ESTRUTURA[bat.fim.tam] : cerco;
      out.estr = { m: m.id, nome: m.estr.nome || m.nome || 'Fortificação', hp0: m.estr.hp, hp1: Math.max(0, m.estr.hp - dano), hpMax: m.estr.hpMax, dano };
    }
    // a frente: anda para o lado de quem perdeu (fase nova hoje)
    const f = bat.frente ? achar(bat.frente.f) : null;
    if (f && f.k === 'f' && bat.fim.vence && bat.frente.n > 0) {
      const perde = bat.fim.vence === 'a' ? 'b' : 'a', gp = achar(bat[perde] && bat[perde].g), gv = achar(bat[bat.fim.vence] && bat[bat.fim.vence].g);
      const dia = mapa.cal.dia, pts0 = N.formaNoDia(f, dia), passo = N.temGrade(mapa) ? mapa.grade.tam : Math.max(10, (mapa.larg || 2000) / 50);
      const c = bat.hex && N.temGrade(mapa) ? (h => (h ? N.centroHex(mapa, h.q, h.r) : null))(N.lerChaveHex(bat.hex)) : null;
      const bx = c ? c.x : gp && gv ? (gp.x + gv.x) / 2 : null, by = c ? c.y : gp && gv ? (gp.y + gv.y) / 2 : null;
      // (o ponto de quem perdeu: o exército dele; sem ele, o lado oposto ao de quem venceu)
      const px = gp ? gp.x : gv ? 2 * bx - gv.x : null, py = gp ? gp.y : gv ? 2 * by - gv.y : null;
      if (bx != null && px != null) out.frente = { f: f.id, nome: f.nome || 'Frente', n: bat.frente.n, pts0, pts1: frenteAnda(pts0, bx, by, px, py, bat.frente.n, passo) };
    }
    if (bat.hex && bat.hexEst) out.hex = { k: bat.hex, est: bat.hexEst, antes: (mapa.guerra && mapa.guerra.hexes[bat.hex]) || null };
    return out;
  }
  /* Aplica a prévia no mapa (d: o rascunho de App.mudar) e guarda a batalha no histórico (reg: o registro dela). As
     unidades que acabaram saem; a frente ganha a fase de hoje. */
  function aplicar(d, prev, reg) {
    const N = NN(), achar = id => d.objs.find(o => o.id === id) || null;
    for (const q of ['a', 'b']) {
      const L = prev.lados[q], g = L && achar(L.g);
      if (!g || !g.exe) continue;
      const por = new Map(L.unid.map(u => [u.id, u]));
      g.exe.unid = g.exe.unid.filter(u => !(por.get(u.id) || {}).acaba).map(u => { const x = por.get(u.id); if (x) { u.tropas = x.tropas1; u.hp = x.hp1; } return u; });
      g.exe.moral = L.moral1; g.exe.mant = L.mant1;
    }
    if (prev.estr) { const m = achar(prev.estr.m); if (m && m.estr) m.estr.hp = prev.estr.hp1; }
    if (prev.frente) {
      const f = achar(prev.frente.f), dia = d.cal.dia;
      if (f) { f.fases = (f.fases || []).filter(x => x.dia !== dia).concat([{ dia, pts: prev.frente.pts1 }]).sort((a, b) => a.dia - b.dia); }
    }
    if (!d.guerra) d.guerra = { tipos: [], bats: [], hexes: {} };
    if (prev.hex) d.guerra.hexes[prev.hex.k] = prev.hex.est;
    if (reg) { d.guerra.bats.push(copia(reg)); const max = (N.LIMITES && N.LIMITES.batalhas) || 60; if (d.guerra.bats.length > max) d.guerra.bats.splice(0, d.guerra.bats.length - max); }
    return d;
  }

  /* ---------------- os mantimentos do dia ----------------
     Cada exército come pelo tamanho da tropa (ou o consumo que o mestre escolheu), por dia que passou. Acabou: a cada
     dia sem eles, a moral cai 1 (e a fome tira ATQ nas batalhas). → [{ g, nome, cons, mant0, mant1, fome0, fome1,
     moral0, moral1, dura }] — só os exércitos com unidades (a proposta do "Próximo dia"). */
  function mantimentosDoDia(mapa, dias) {
    const N = NN(), n = Math.max(1, Math.round(dias || 1)), out = [];
    for (const g of mapa.objs) {
      if (g.k !== 'g' || g.tipo !== 'exercito' || !g.exe || g.exe.pub || !g.exe.unid.some(u => u.tropas > 0)) continue;
      const e = g.exe, c = N.consumoDe(e);
      if (!(c > 0)) continue;
      const deram = Math.min(n, Math.floor(e.mant / c)), mant1 = Math.max(0, e.mant - c * n), semComer = n - deram;
      const fome1 = semComer > 0 ? e.fome + semComer : mant1 > 0 ? 0 : e.fome;
      const moral1 = limitar(e.moral - semComer, 0, 10);
      out.push({ g: g.id, nome: g.nome || 'Exército', cons: c, mant0: e.mant, mant1, fome0: e.fome, fome1, moral0: e.moral, moral1, dura: Math.floor(mant1 / c) });
    }
    return out;
  }

  /* Os exércitos que se encontram: dois grupos do tipo Exército a até 1 hexágono um do outro, de facções diferentes (ou
     sem facção). pass: id → os hexágonos por onde cada um passou ("q,r"), como em encontrosNoCaminho. → [[id, id]] */
  function confrontos(mapa, pass) {
    const N = NN();
    if (!N.temGrade(mapa)) return [];
    const exs = mapa.objs.filter(o => o.k === 'g' && o.tipo === 'exercito');
    const hexesDe = g => (pass && Array.isArray(pass[g.id]) ? pass[g.id] : (h => (h ? [h.q + ',' + h.r] : []))(N.hexDe(mapa, g.x, g.y))).map(N.lerChaveHex).filter(Boolean);
    const hs = new Map(exs.map(g => [g.id, hexesDe(g)])), out = [];
    for (let i = 0; i < exs.length; i++) for (let j = i + 1; j < exs.length; j++) {
      const a = exs[i], b = exs[j];
      if (a.fac && b.fac && a.fac === b.fac) continue;
      if (hs.get(a.id).some(p => hs.get(b.id).some(q => N.distHex(p, q) <= 1))) out.push([a.id, b.id]);
    }
    return out;
  }

  const MundoGuerra = {
    TAMANHOS, MOMENTOS: ORDEM_MOMENTOS, DO_MOMENTO, NOMES, BONUS_MESTRE, AVANCO, PERDA_PERDEDOR, PERDA_VENCEDOR,
    rolar, lado, numeros, bonus, total, resumida, momento, fimDetalhada, parar, textoFim, tamanhoD100, tamanhoD20,
    perdas, moralDepois, frenteAnda, depois, aplicar, mantimentosDoDia, confrontos,
    MAX_HEROIS_BONUS, bonusSugerido, resultadoHeroico, feridaDoHeroi, FERIDA_PERDEDOR, FERIDA_VENCEDOR,
  };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoGuerra;
  if (typeof window !== 'undefined') window.MundoGuerra = MundoGuerra;
})();
