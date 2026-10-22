/* ---------------------------------------------------------------
   7c. PROJEÇÃO — a cena como ela vai para o banco e para os jogadores
   Tudo aqui é função pura (sem tela, sem banco), para poder ser testado sozinho.

   Numa mesa, cada cena do mestre fica em dois documentos (só ele lê):
     cena:<id>:m ... o mapa: grade, fundo, luz, névoa, permissões, paredes, luzes, desenhos
     cena:<id>:v ... o que muda a toda hora durante o jogo: tokens, efeitos, turnos, miras
   A cena que está "no ar" tem mais dois, que a mesa inteira lê:
     cena:pub:m, cena:pub:v ... a mesma cena, sem o que é só do mestre (projetar)
   E cada jogador tem um, que só ele e o mestre leem:
     cena:pedido:<jogador> ... o que ele fez no mapa e ainda falta o mestre aplicar

   O programa do mestre é quem manda na cena: recebe os pedidos, confere se o jogador podia (validar),
   aplica, e a projeção nova leva o resultado para todo mundo. O jogador vê o que fez na hora; quando a
   projeção chega, a tela dele acerta as diferenças (diferenca).
   --------------------------------------------------------------- */
const Proj = (() => {
  const COLS = ['tokens', 'shapes', 'walls', 'lights', 'effects', 'fogOps'];
  const VIVO = ['tokens', 'effects', 'turn', 'targets'];
  const FORA = ['explored', 'imgs', 'ack', 'pings'];                 // nunca são campos da cena
  const FORMAS = ['free', 'line', 'rect', 'ell', 'poly', 'text'];
  const FX_FORMAS = ['circ', 'quad', 'rect', 'cone', 'line'];
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  /* O que vem de um jogador pode ser qualquer coisa. Número é só o que já é número (converter um objeto estranho
     em número ou em texto pode dar erro, e um erro aqui pararia os pedidos de todos). */
  const nu = v => (typeof v === 'number' ? v : NaN);
  const num = (v, a, b, padrao) => { const n = nu(v); return isFinite(n) ? clamp(n, a, b) : padrao; };
  const cor = (v, padrao) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : padrao);
  // Um resumo do conteúdo (texto → número em base 36): muda quando o conteúdo muda. Serve de "versão" do mapa.
  function resumo(texto) {
    let a = 0xdeadbeef, b = 0x41c6ce57;
    for (let i = 0; i < texto.length; i++) { const c = texto.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); }
    a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
    b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
    return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36);
  }
  // Um id que pode vir de fora (de um jogador, de um arquivo): curto, sem caracteres estranhos e nunca o nome de algo
  // que todo objeto já tem ("__proto__", "constructor", "toString"…), que confundiria quem guarda coisas por id.
  const idOk = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(v) && !(v in Object.prototype);
  const tem = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  // Id de cena: além disso, não pode ser uma das palavras que os documentos da mesa já usam (cena:pub:…, cena:pedido:…).
  const idCena = v => idOk(v) && v !== 'pub' && v !== 'pedido';

  // Igualdade de conteúdo, sem ligar para a ordem das chaves (o banco devolve os objetos com as chaves reordenadas).
  function igual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a == null && b == null;        // null e undefined: os dois são "sem valor"
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!igual(a[i], b[i])) return false;
      return true;
    }
    for (const k in a) if (a[k] !== undefined && !igual(a[k], b[k])) return false;
    for (const k in b) if (b[k] !== undefined && a[k] === undefined) return false;
    return true;
  }

  // As imagens que uma parte da cena usa: { id: { url, w, h, kind, name } } — só as que estão guardadas no banco.
  // Para os jogadores (publico), sem o nome: o nome do arquivo pode dizer o que o mestre escondeu ("Dragão.png").
  function imgsDe(ids, assets, publico) {
    const o = {};
    for (const id of ids) {
      const a = id && assets ? assets[id] : null;
      if (a && /^https:\/\//.test(a.url || '')) o[id] = { url: a.url, w: a.w || 0, h: a.h || 0, kind: a.kind || '', name: publico ? '' : a.name || '' };
    }
    return o;
  }

  /* ---- a cena do mestre, em duas partes ---- */
  function partes(sc, assets) {
    const m = {}, v = { id: sc.id };
    for (const k in sc) {
      if (k === 'explored') continue;                                 // o que cada um já explorou fica no aparelho de cada um
      (VIVO.includes(k) ? v : m)[k] = sc[k];
    }
    m.imgs = imgsDe([sc.bg && sc.bg.asset], assets);
    v.imgs = imgsDe(sc.tokens.map(t => t.img), assets);
    return { m, v };
  }
  // O caminho de volta: uma cena nova (cópia), pronta para normalizeScene.
  function juntar(m, v) {
    const sc = {};
    for (const k in m || {}) if (!FORA.includes(k)) sc[k] = clone(m[k]);
    for (const k of VIVO) if (v && v[k] !== undefined) sc[k] = clone(v[k]);
    for (const c of COLS) if (!Array.isArray(sc[c])) sc[c] = [];
    sc.explored = {};
    return sc;
  }

  /* ---- a cena como os jogadores recebem ---- */
  // Barra de um token do mestre: com números, só a proporção, ou nada — conforme a regra de quem não é dono.
  // A sobrevida vai também quando só a proporção vai: em proporção (x, para a barrinha) e em pontos (xn, para o escudo).
  function barraPublica(b, modo) {
    if (modo === 'num') return b;
    if (modo === 'none' || !b.on || !(b.m > 0)) return { n: 'Barra', c: b.c, k: 'bar', on: false, vis: '', v: 0, m: 0 };     // nem o nome vai
    // só a proporção — e, abaixo de zero, a proporção da parte negativa (quanto do piso já foi), sem os números
    const o = b.v < 0 && barLo(b) > 0 ? { n: b.n, c: b.c, k: b.k, on: true, vis: b.vis, v: -Math.round(1000 * clamp(-b.v / barLo(b), 0, 1)) / 10, m: 100, lo: 100 }
      : { n: b.n, c: b.c, k: b.k, on: true, vis: b.vis, v: Math.round(1000 * clamp(b.v / b.m, 0, 1)) / 10, m: 100 };
    const x = barX(b);
    if (x > 0) { o.x = Math.max(0.1, Math.round(1000 * x / b.m) / 10); o.xn = x; }
    if (barPod(b) > 0) o.pod = Math.max(0.1, Math.round(1000 * barPod(b) / b.m) / 10);      // (lote 8) a ponta podre, em proporção
    if (barMapa(b) === 'passar') o.mapa = 'passar';                                          // (lote 15) a barra que só aparece ao passar o mouse
    return o;
  }
  // `jogadores`: os ids dos jogadores da mesa (Set). Token cujo dono não está mais na mesa conta como do mestre.
  function tokenPublico(t, jogadores, grupos) {
    const o = clone(t);
    o.notes = '';                                                     // anotações são só do mestre
    delete o.cena; delete o.gera;                                     // (lote 7) aonde o objeto leva, também
    /* (lote 8) o Clone: quem é cópia é só do mestre. Os do mesmo grupo (o real e as cópias) vão com a mesma marca, que
       não diz qual é o real — é o que deixa o anel da vez (e o clique na ordem) ir em todos. */
    delete o.clone;
    const g = grupos && grupos.get(t.clone || t.id);
    if (g) o.cg = g; else delete o.cg;
    /* (lote 9) o gêmeo de um Duplicado: para os jogadores, igual ao original — sem a marca de quem ele copia e sem a
       condição Duplicado (só o mestre a vê) */
    delete o.dup;
    if (Array.isArray(o.conds) && o.conds.includes('duplicado')) {
      o.conds = o.conds.filter(c => c !== 'duplicado');
      if (o.cinfo && o.cinfo.duplicado) { o.cinfo = Object.assign({}, o.cinfo); delete o.cinfo.duplicado; }
    }
    const deJogador = t.owner === '*' || (!!t.owner && (!jogadores || jogadores.has(t.owner)));
    if (!deJogador) {
      o.owner = null;
      if (t.showName === false) o.name = '???';
      o.bars = t.bars.map(b => barraPublica(b, b.vis || t.barVis));
      o.auras = (t.auras || []).filter(a => a.pub).map(a => clone(a));
      o.char = null; o.ini = 0; o.inis = [];                          // (nem a iniciativa de cada turno de um chefe)
      delete o.st;                                                    // os números do token são do mestre e do dono
      o.vis = { on: false, range: 0, dark: 0 };                       // o que o token do mestre enxerga não é da conta dos jogadores
    }
    return o;
  }
  // Porta secreta: para os jogadores é uma parede comum.
  const paredePublica = w => (w.secret ? { id: w.id, k: 'wall', x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, open: false, locked: false, secret: false } : w);
  function turnoPublico(sc, fora, nomes) {
    const tn = sc.turn || {};
    if (!sc.perms || !sc.perms.turnos || !Array.isArray(tn.list)) return { on: false, round: 1, cur: null, list: [] };
    // a faixa de um grupo vai só com os tokens que os jogadores veem; se todos estão ocultos, ela não vai.
    // A linha invisível (lote 6) não vai; na vez dela, os jogadores só ficam sabendo que o turno está com o mestre.
    const list = tn.list.filter(e => !e.inv && !(e.token && fora.has(e.token)) && !(Array.isArray(e.toks) && e.toks.length && e.toks.every(id => fora.has(id) || !nomes.has(id)))).map(e => {
      const o = { id: e.id, token: e.token || null, name: e.token ? (nomes.get(e.token) || '???') : e.name, init: e.init == null ? null : e.init, roll: null, k: e.k || 1, bonus: 0, grp: e.grp || null };
      if (!e.token && Array.isArray(e.toks)) o.toks = e.toks.filter(id => !fora.has(id) && nomes.has(id));
      if (e.reac) o.reac = true;
      return o;
    });
    // (a vez de um token oculto não aponta para ninguém: os jogadores não ficam sabendo que há mais alguém na ordem)
    const o = { on: !!tn.on, round: tn.round || 1, cur: list.some(e => e.id === tn.cur) ? tn.cur : null, list };
    if (o.on && tn.list.some(e => e.id === tn.cur && e.inv)) o.mestre = true;
    return o;
  }
  function projetar(sc, assets, jogadores) {
    const fora = new Set(sc.tokens.filter(t => t.hidden).map(t => t.id));
    const grupos = new Map();                                         // (lote 8) id do real → a marca do grupo do Clone
    for (const t of sc.tokens) if (t.clone && !grupos.has(t.clone)) grupos.set(t.clone, 'cg' + resumo(sc.id + ':' + t.clone));
    const tokens = sc.tokens.filter(t => !t.hidden).map(t => tokenPublico(t, jogadores, grupos));
    const nomes = new Map(tokens.map(t => [t.id, t.name]));
    const m = {};
    for (const k in sc) if (k !== 'explored' && k !== 'gerado' && !VIVO.includes(k)) m[k] = sc[k];       // (com que semente o mapa de bairros foi feito: só do mestre)
    m.walls = sc.walls.map(paredePublica);
    m.lights = sc.lights.map(l => Object.assign({}, l, { name: '' }));           // o nome que o mestre deu à luz é dele
    m.shapes = sc.shapes.filter(s => !s.gm);
    m.imgs = imgsDe([sc.bg && sc.bg.asset], assets, true);
    const v = {
      id: sc.id, tokens,
      effects: sc.effects.filter(e => !e.gm && !(e.token && fora.has(e.token))).map(e => Object.assign({}, e, { apply: null })),
      turn: turnoPublico(sc, fora, nomes),
      targets: (sc.targets || []).filter(x => !fora.has(x.t)),
      imgs: imgsDe(tokens.map(t => t.img), assets, true),
    };
    return { m, v };
  }

  /* ---- o que um jogador pediu: vale? ----
     Barras, condições e auras viajam como "como estava → como ficou" (op.b guarda o "como estava"). O mestre aplica
     só a diferença por cima do que ele tem agora: se nesse meio-tempo ele deu dano em Vida e o jogador gastou SP,
     as duas coisas valem. */
  const DO_TOKEN = { x: 'mover', y: 'mover', bars: 'barras', conds: 'condicoes', cinfo: 'condicoes', auras: 'auras', post: 'condicoes' };
  const MAX_FORMAS = 150, MAX_EFEITOS = 40, MAX_PONTOS = 3000, MAX_AURAS = 12;      // por jogador, por cena
  const MAX_PESO_FORMAS = 120000;                    // e o tamanho de todos os desenhos de um jogador numa cena, em caracteres
  const r1 = n => Math.round(n * 10) / 10;
  /* Barras: o jogador só mexe no valor e na sobrevida das barras que existem e estão em uso (é o que a tela dele
     deixa). Com a base, vale a variação (−12 continua −12 sobre o valor de agora); sem ela, o valor pedido.
     O resultado não passa do maior entre o máximo da barra, o valor que o mestre tem e o valor que o jogador
     ficou vendo: uma cura somada a outra não estoura o máximo, mas quem digitou um valor acima dele fica com ele. */
  function fundirBarras(atual, base, novo) {
    if (!Array.isArray(novo)) return null;
    let mudou = false;
    const out = atual.map((b, i) => {
      const n = novo[i], a = Array.isArray(base) ? base[i] : null;
      // a barra saiu do lugar nesse meio-tempo (o mestre tirou ou trocou a ordem): o pedido não se aplica a ela
      if (!ehObj(n) || !b.on || (ehObj(a) && a.n !== b.n) || (typeof n.n === 'string' && n.n !== b.n)) return b;
      const o = Object.assign({}, b);
      const nv = nu(n.v), av = ehObj(a) ? nu(a.v) : NaN;
      if (isFinite(nv)) {
        const alvo = isFinite(av) ? b.v + (nv - av) : nv;
        const teto = barPod(b) > 0 ? barTeto(b) : Math.min(999999, Math.max(b.m, b.v, nv));         // (lote 8: nem acima do teto da ferida permanente)
        const v = clamp(r1(alvo), -barLo(b), teto);      // (a barra que pode ficar negativa desce até o piso dela)
        if (v !== b.v && (isFinite(av) ? nv !== av : true)) o.v = v;
      }
      const nx = Math.max(0, nu(n.x) || 0), ax = ehObj(a) ? Math.max(0, nu(a.x) || 0) : NaN;
      if (isFinite(ax) ? nx !== ax : nx !== barX(b)) {
        const x = clamp(r1(isFinite(ax) ? barX(b) + (nx - ax) : nx), 0, 99999);
        if (x > 0) o.x = x; else delete o.x;
      }
      if (o.v !== b.v || barX(o) !== barX(b)) mudou = true;
      return o;
    });
    return mudou ? out : null;
  }
  function fundirConds(atual, base, novo) {
    // (lote 8) a Ferida permanente e o Clone são do mestre: o pedido de um jogador não as põe nem as tira
    const limpa = lista => Array.from(new Set((Array.isArray(lista) ? lista : []).filter(c => tem(COND_BY_ID, c) && !COND_JANELA.has(c))));
    const n = limpa(novo);
    if (!Array.isArray(base)) return n.concat((atual || []).filter(c => COND_JANELA.has(c)));
    const b = limpa(base), tirar = new Set(b.filter(c => !n.includes(c)));
    const out = atual.filter(c => !tirar.has(c));
    for (const c of n) if (!b.includes(c) && !out.includes(c)) out.push(c);
    return out;
  }
  function cinfoLimpo(x) {
    const out = {};
    if (!ehObj(x)) return out;
    for (const id in x) {
      if (!tem(COND_BY_ID, id) || !ehObj(x[id])) continue;
      const o = {};
      for (const k of ['n', 'd', 'd0']) { const n = Math.round(nu(x[id][k]) || 0); if (n > 0) o[k] = Math.min(n, 999); }
      if (Object.keys(o).length) out[id] = o;
    }
    return out;
  }
  function fundirCinfo(atual, base, novo) {
    const n = cinfoLimpo(novo);
    if (!ehObj(base)) { for (const id of COND_JANELA) { if (atual && atual[id]) n[id] = atual[id]; else delete n[id]; } return n; }
    const b = cinfoLimpo(base), out = Object.assign({}, atual);
    for (const c of CONDS) {
      if (COND_JANELA.has(c.id)) continue;                             // (lote 8: a Ferida e o Clone são do mestre)
      if (igual(b[c.id], n[c.id])) continue;                           // o jogador não mexeu nesta
      if (n[c.id]) out[c.id] = n[c.id]; else delete out[c.id];
    }
    return out;
  }
  function auraLimpa(a, pub) {
    if (!ehObj(a)) return null;
    return { id: idOk(a.id) ? a.id : uid('au'), k: ['circ', 'quad', 'cone'].includes(a.k) ? a.k : 'circ', r: num(a.r, 0.5, 60, 2), c: cor(a.c, '#e6ab4f'), a: num(a.a, 0.05, 0.8, 0.2), ang: num(a.ang, 10, 340, 60), dir: num(a.dir, 0, 360, 0), pub };
  }
  // Auras, por id. "Os jogadores veem esta aura" é escolha do mestre: a que já existe mantém a dela; a nova nasce visível.
  function fundirAuras(atual, base, novo) {
    if (!Array.isArray(novo)) return null;
    const pubDe = id => { const x = atual.find(a => a.id === id); return x ? x.pub !== false : true; };
    const n = novo.slice(0, MAX_AURAS).map(a => auraLimpa(a, ehObj(a) ? pubDe(a.id) : true)).filter(Boolean);
    if (!Array.isArray(base)) return n;
    const eraDele = new Map(base.filter(ehObj).map(a => [a.id, a])), ficou = new Map(n.map(a => [a.id, a]));
    const out = [];
    for (const a of atual) {
      if (eraDele.has(a.id) && !ficou.has(a.id)) continue;                                  // ele tirou
      const nova = ficou.get(a.id);
      out.push(nova && eraDele.has(a.id) && !igual(auraLimpa(eraDele.get(a.id), a.pub !== false), nova) ? nova : a);   // ele mexeu nesta (ou não)
    }
    for (const a of n) if (!eraDele.has(a.id) && !out.some(x => x.id === a.id) && out.length < MAX_AURAS) out.push(a);   // ele criou
    return out;
  }
  // (os pontos entram com uma casa decimal e dentro de um limite: um traço não pesa mais do que precisa)
  /* O mesmo "juntar", para o que o MESTRE fez num aparelho dele e é refeito por cima da cena que chegou de outro: sem
     os limites dos jogadores. O que ele mudou vale (nome, máximo, quem vê, barras e auras novas, visíveis ou não); o
     que ele não tocou fica como chegou; valor e sobrevida mudados nos dois lados valem pela variação. */
  function juntarBarrasMestre(atual, base, novo) {
    if (!Array.isArray(novo)) return atual;
    if (!Array.isArray(base) || !Array.isArray(atual) || igual(atual, base)) return novo;      // lá ninguém mexeu: vale o daqui, inteiro
    const porNome = (lista, n) => lista.find(x => ehObj(x) && x.n === n);
    const out = [];
    for (const nb of novo) {
      if (!ehObj(nb)) continue;
      const a = porNome(atual, nb.n), b = porNome(base, nb.n);
      if (!b) { out.push(nb); continue; }                    // criada (ou renomeada) aqui: como ficou aqui
      if (!a) { if (!igual(nb, b)) out.push(nb); continue; } // tirada lá: sai, a não ser que tenha sido mudada aqui
      const o = {};
      for (const k of new Set(Object.keys(a).concat(Object.keys(b), Object.keys(nb)))) {
        if (k === 'v' || k === 'x') continue;
        const val = igual(nb[k], b[k]) ? a[k] : nb[k];        // não mexida aqui: como chegou; mexida aqui: a daqui
        if (val !== undefined) o[k] = val;
      }
      const tres = (n, bb, aa, piso) => (n === bb ? aa : aa === bb ? n : Math.max(piso, r1(aa + (n - bb))));
      o.v = tres(nu(nb.v) || 0, nu(b.v) || 0, nu(a.v) || 0, -barLo(o));
      const x = tres(barX(nb), barX(b), barX(a), 0);
      if (x > 0) o.x = x;
      out.push(o);
    }
    for (const a of atual) if (ehObj(a) && !porNome(base, a.n) && !porNome(novo, a.n)) out.push(a);      // criada lá: entra
    return out;
  }
  function juntarAurasMestre(atual, base, novo) {
    if (!Array.isArray(novo)) return atual;
    if (!Array.isArray(base) || !Array.isArray(atual) || igual(atual, base)) return novo;
    const B = new Map(base.filter(ehObj).map(a => [a.id, a])), N = new Map(novo.filter(ehObj).map(a => [a.id, a])), out = [];
    for (const a of atual) {
      if (!ehObj(a)) continue;
      const b = B.get(a.id), n = N.get(a.id);
      if (b && !n) continue;                                 // tirada aqui
      out.push(n && b && !igual(n, b) ? n : a);              // mudada aqui: a daqui; senão, como chegou
    }
    for (const n of novo) if (ehObj(n) && !B.has(n.id) && !out.some(x => x.id === n.id)) out.push(n);      // criada aqui, como o mestre a fez
    return out;
  }
  const pontos = (p, max) => (Array.isArray(p) && p.length >= 2 && p.length <= (max || 6000) && p.length % 2 === 0 && p.every(n => typeof n === 'number' && isFinite(n)) ? p.map(n => r1(clamp(n, -1e5, 1e5))) : null);
  // Uma forma desenhada por um jogador: só os campos de forma, com ele como autor e nunca "só do mestre".
  function formaLimpa(v, quem) {
    if (!ehObj(v) || !idOk(v.id) || !FORMAS.includes(v.k)) return null;
    const o = { id: v.id, k: v.k, s: cor(v.s, '#f2c14e'), sw: num(v.sw, 0, 200, 4), f: v.f ? cor(v.f, null) : null, a: num(v.a, 0.05, 1, 1), top: !!v.top, gm: false, lock: !!v.lock, by: quem };
    if (v.k === 'text') { o.x = num(v.x, -1e5, 1e5, 0); o.y = num(v.y, -1e5, 1e5, 0); o.txt = (typeof v.txt === 'string' ? v.txt : '').slice(0, 600); o.fs = num(v.fs, 6, 400, 28); if (!o.txt.trim()) return null; }
    else if (v.k === 'rect' || v.k === 'ell') { o.x = num(v.x, -1e5, 1e5, 0); o.y = num(v.y, -1e5, 1e5, 0); o.w = num(v.w, 0, 1e5, 0); o.h = num(v.h, 0, 1e5, 0); }
    else { o.pts = pontos(v.pts, MAX_PONTOS); if (!o.pts) return null; if (v.k === 'line') o.arrow = !!v.arrow; }
    return o;
  }
  // Um remendo numa forma que já existe: a forma continua do mesmo tipo e com o mesmo autor; só passam os campos dela.
  function remendoForma(s, p) {
    if (!ehObj(p)) return null;
    const novo = formaLimpa(Object.assign({}, s, p, { id: s.id, k: s.k }), s.by), q = {};
    if (!novo) return null;
    for (const k in p) if (tem(novo, k) && k !== 'id' && k !== 'by' && k !== 'gm' && k !== 'k') q[k] = novo[k];
    return Object.keys(q).length ? q : null;
  }
  // Quanto pesam os desenhos de um jogador nesta cena (sem contar o de id `menos`): o limite é por jogador.
  const pesoDasFormas = (sc, quem, menos) => sc.shapes.reduce((t, s) => (s.by === quem && s.id !== menos ? t + JSON.stringify(s).length : t), 0);
  function efeitoLimpo(v, quem, sc) {
    if (!ehObj(v) || !idOk(v.id) || !FX_FORMAS.includes(v.k) || !tem(FX.P, v.fx)) return null;      // só os efeitos da biblioteca
    // preso a um token: só a um dele (ou de todos), como a tela do jogador deixa
    const tk = v.token ? sc.tokens.find(t => t.id === v.token && !t.hidden && (t.owner === quem || t.owner === '*')) : null;
    const dur = Math.round(num(v.dur, 0, 99, 0)), pr = FX.P[v.fx];
    const o = {
      id: v.id, fx: v.fx, k: v.k, x: num(v.x, -1e5, 1e5, 0), y: num(v.y, -1e5, 1e5, 0), r: num(v.r, 0.5, 60, 2), w: num(v.w, 0.25, 60, 1), rw: num(v.rw, 0.5, 120, 3), rh: num(v.rh, 0.5, 120, 2),
      ang: num(v.ang, 10, 340, 60), dir: num(v.dir, 0, 360, 0), pow: num(v.pow, 0.1, 1, 0.8), token: tk ? tk.id : null, gm: false, by: quem,
      seed: Math.round(num(v.seed, 1, 99999, 1)), dur, dur0: dur ? Math.round(num(v.dur0, dur, 99, dur)) : 0, at: dur && typeof v.at === 'string' && sc.turn.list.some(e => e.id === v.at) ? v.at : null, apply: null,
    };
    // (lote 7) o portal do jogador: a saída (e nunca preso a token); a muralha: os pontos de vida; a zona de condição: a
    // condição dela, para a pergunta do começo da vez (na Distorção do tempo, Lento ou Acelerado)
    if (pr.portal) { o.k = 'circ'; o.token = null; if (typeof v.x2 === 'number' && typeof v.y2 === 'number') { o.x2 = num(v.x2, -1e5, 1e5, 0); o.y2 = num(v.y2, -1e5, 1e5, 0); } }
    if (pr.pv > 0) { o.pvm = Math.round(num(v.pvm, 1, 9999, pr.pv)); o.pv = Math.round(num(v.pv, 0, o.pvm, o.pvm)); }
    if (pr.cond) { const q = v.apply && v.apply.cond && v.apply.cond.id; o.apply = { bar: '', amt: '', cond: { id: (pr.conds || [pr.cond]).includes(q) ? q : pr.cond, n: 0, d: 0 }, skip: [] }; }
    return o;
  }
  function remendoEfeito(e, p, sc) {
    if (!ehObj(p)) return null;
    const novo = efeitoLimpo(Object.assign({}, e, p, { id: e.id }), e.by, sc), q = {};
    if (!novo) return null;
    for (const k in p) if (tem(novo, k) && k !== 'id' && k !== 'by' && k !== 'gm' && k !== 'apply') q[k] = novo[k];
    return Object.keys(q).length ? q : null;
  }
  /* Uma operação pedida pelo jogador `quem`, conferida contra a cena `sc` como ela está agora. Devolve a operação
     que o mestre aplica (uma cópia limpa, só com o que o jogador pode mexer) ou null. */
  function validar(op, quem, sc) {
    if (!ehObj(op) || !sc || !quem) return null;
    const p = sc.perms || {};
    if (op.c === 'tokens') {
      if (op.t !== 'upd' || !ehObj(op.p)) return null;                // criar e apagar tokens é com o mestre
      const t = sc.tokens.find(x => x.id === op.id);
      if (!t || t.hidden || !(t.owner === quem || t.owner === '*')) return null;
      const q = {}, base = ehObj(op.b) ? op.b : {};
      for (const k in op.p) {
        if (!tem(DO_TOKEN, k) || !p[DO_TOKEN[k]]) continue;
        const val = op.p[k];
        if (k === 'x' || k === 'y') {
          if (t.locked || typeof val !== 'number' || !isFinite(val)) continue;
          q[k] = clamp(val, 0, Math.max(0, (k === 'x' ? sc.cols : sc.rows) * sc.cell - t.size * sc.cell));
        } else if (k === 'bars') { const nb = fundirBarras(t.bars, base.bars, val); if (nb) q.bars = nb; }
        else if (k === 'conds') { if (Array.isArray(val)) { const nc = fundirConds(t.conds, base.conds, val); if (!igual(nc, t.conds)) q.conds = nc; } }
        else if (k === 'cinfo') { const ni = fundirCinfo(t.cinfo || {}, base.cinfo, val); if (!igual(ni, t.cinfo || {})) q.cinfo = ni; }
        else if (k === 'auras') { const na = fundirAuras(t.auras || [], base.auras, val); if (na && !igual(na, t.auras || [])) q.auras = na; }
        else if (k === 'post') { if (typeof val === 'boolean' && val !== !!t.post) q.post = val; }      // (a postura: liga ou desliga)
      }
      // contador de uma condição que não está mais no token não fica sobrando
      if (q.conds || q.cinfo) { const conds = q.conds || t.conds, ci = Object.assign({}, q.cinfo || t.cinfo || {}); let tirou = false; for (const id in ci) if (!conds.includes(id)) { delete ci[id]; tirou = true; } if (tirou || q.cinfo) q.cinfo = ci; }
      return Object.keys(q).length ? { t: 'upd', c: 'tokens', id: t.id, p: q } : null;
    }
    if (op.c === 'shapes') {
      if (!p.desenhar) return null;
      if (op.t === 'add') {
        const v = formaLimpa(op.v, quem);
        if (!v || sc.shapes.some(s => s.id === v.id) || sc.shapes.filter(s => s.by === quem).length >= MAX_FORMAS) return null;
        if (pesoDasFormas(sc, quem) + JSON.stringify(v).length > MAX_PESO_FORMAS) return null;
        return { t: 'add', c: 'shapes', v };
      }
      /* A ordem dos desenhos (trazer para frente, enviar para trás): vale se for só uma troca de lugar dos desenhos
         que o jogador vê. Os que são só do mestre (e que ele nem recebe) ficam exatamente onde estão. */
      if (op.t === 'ord') {
        const ids = Array.isArray(op.ids) ? op.ids.filter(id => typeof id === 'string') : [], vistos = sc.shapes.filter(s => !s.gm).map(s => s.id);
        if (ids.length !== vistos.length || new Set(ids).size !== ids.length || !ids.every(id => vistos.includes(id))) return null;
        let i = 0;
        const nova = sc.shapes.map(s => (s.gm ? s.id : ids[i++]));
        return nova.every((id, k) => id === sc.shapes[k].id) ? null : { t: 'ord', c: 'shapes', ids: nova };
      }
      const s = sc.shapes.find(x => x.id === op.id);
      if (!s || s.by !== quem || s.gm) return null;
      if (op.t === 'del') return { t: 'del', c: 'shapes', id: s.id };
      if (op.t === 'upd') {
        const q = remendoForma(s, op.p);
        if (!q || pesoDasFormas(sc, quem, s.id) + JSON.stringify(Object.assign({}, s, q)).length > MAX_PESO_FORMAS) return null;
        return { t: 'upd', c: 'shapes', id: s.id, p: q };
      }
      return null;
    }
    if (op.c === 'effects') {
      if (!p.efeitos) return null;
      if (op.t === 'add') {
        const v = efeitoLimpo(op.v, quem, sc);
        if (!v || sc.effects.some(e => e.id === v.id) || sc.effects.filter(e => e.by === quem).length >= MAX_EFEITOS) return null;
        return { t: 'add', c: 'effects', v };
      }
      const e = sc.effects.find(x => x.id === op.id);
      if (!e || e.by !== quem || e.gm) return null;
      if (op.t === 'del') return { t: 'del', c: 'effects', id: e.id };
      if (op.t === 'upd') { const q = remendoEfeito(e, op.p, sc); return q ? { t: 'upd', c: 'effects', id: e.id, p: q } : null; }
      return null;
    }
    if (op.c === 'walls') {
      if (op.t !== 'upd' || !p.portas || !ehObj(op.p) || typeof op.p.open !== 'boolean') return null;
      const w = sc.walls.find(x => x.id === op.id);
      if (!w || !isOpening(w) || w.secret || w.locked || w.open === op.p.open) return null;
      return { t: 'upd', c: 'walls', id: w.id, p: { open: op.p.open } };
    }
    if (op.t === 'scn' && ehObj(op.p) && Array.isArray(op.p.targets)) {
      if (!p.mira) return null;
      // a mira de cada um é de cada um: o pedido só troca as dele
      const dele = [], vistos = new Set();
      for (const x of op.p.targets) {
        if (!ehObj(x) || x.by !== quem || vistos.has(x.t) || !sc.tokens.some(t => t.id === x.t && !t.hidden)) continue;
        vistos.add(x.t); dele.push({ by: quem, t: x.t });
      }
      const novo = sc.targets.filter(x => x.by !== quem).concat(dele);
      return igual(novo, sc.targets) ? null : { t: 'scn', p: { targets: novo } };
    }
    return null;
  }

  /* ---- do que está na tela para o que deveria estar ---- */
  // As operações que levam a cena `a` até a cena `b` (as duas inteiras). Tudo o que entra é cópia.
  function diferenca(a, b) {
    const ops = [], p = {};
    for (const k of new Set(Object.keys(a).concat(Object.keys(b)))) {
      if (COLS.includes(k) || k === 'explored' || k === 'id') continue;
      if (!igual(a[k], b[k])) p[k] = clone(b[k]);
    }
    if (Object.keys(p).length) ops.push({ t: 'scn', p });
    for (const c of COLS) {
      const A = a[c] || [], B = b[c] || [];
      const emA = new Map(A.map(o => [o.id, o])), emB = new Set(B.map(o => o.id));
      const seq = [];
      for (const o of A) { if (emB.has(o.id)) seq.push(o.id); else ops.push({ t: 'del', c, id: o.id }); }
      B.forEach((o, i) => {
        const de = emA.get(o.id);
        if (!de) { ops.push({ t: 'add', c, v: clone(o), i }); seq.splice(Math.min(i, seq.length), 0, o.id); return; }
        const q = {};
        for (const k of new Set(Object.keys(de).concat(Object.keys(o)))) if (!igual(de[k], o[k])) q[k] = clone(o[k]);
        if (Object.keys(q).length) ops.push({ t: 'upd', c, id: o.id, p: q });
      });
      if (seq.some((id, i) => id !== B[i].id)) ops.push({ t: 'ord', c, ids: B.map(o => o.id) });
    }
    return ops;
  }
  /* Aplica operações numa cena solta (fora do Store). É como o jogador repõe, por cima da projeção que chegou, o que
     ele fez e o mestre ainda não aplicou — e como o programa do mestre refaz, por cima da cena que chegou de outro
     aparelho dele, o que tinha sido feito aqui (`comoMestre`: sem os limites dos jogadores). */
  function aplicarEm(sc, ops, comoMestre) {
    for (const op of ops || []) {
      if (!ehObj(op)) continue;
      if (op.t === 'scn') { for (const k in op.p || {}) sc[k] = clone(op.p[k]); continue; }
      if (!COLS.includes(op.c)) continue;
      const arr = sc[op.c];
      if (!Array.isArray(arr)) continue;
      if (op.t === 'add') { if (ehObj(op.v) && !arr.some(o => o.id === op.v.id)) arr.splice(op.i == null ? arr.length : clamp(op.i, 0, arr.length), 0, clone(op.v)); }
      else if (op.t === 'del') { const i = arr.findIndex(o => o.id === op.id); if (i >= 0) arr.splice(i, 1); }
      else if (op.t === 'upd') {
        const o = arr.find(x => x.id === op.id);
        if (!o) continue;
        // barras, condições e auras com o "como estava": entra só a diferença, como o mestre vai fazer (ver validar)
        const base = op.c === 'tokens' && ehObj(op.b) ? op.b : {};
        for (const k in op.p || {}) {
          const val = op.p[k];
          if (k === 'bars' && Array.isArray(base.bars) && Array.isArray(o.bars)) {
            if (comoMestre) o.bars = clone(juntarBarrasMestre(o.bars, base.bars, val));
            else { const nb = fundirBarras(o.bars, base.bars, val); if (nb) o.bars = nb; }
          } else if (k === 'conds' && Array.isArray(base.conds) && Array.isArray(o.conds) && Array.isArray(val)) o.conds = fundirConds(o.conds, base.conds, val);
          else if (k === 'cinfo' && ehObj(base.cinfo)) o.cinfo = fundirCinfo(o.cinfo || {}, base.cinfo, val);
          else if (k === 'auras' && Array.isArray(base.auras) && Array.isArray(val)) o.auras = comoMestre ? clone(juntarAurasMestre(o.auras || [], base.auras, val)) : fundirAuras(o.auras || [], base.auras, val);
          else o[k] = clone(val);
        }
      }
      else if (op.t === 'ord' && Array.isArray(op.ids)) {
        const por = new Map(arr.map(o => [o.id, o])), nova = op.ids.map(id => por.get(id)).filter(Boolean);
        for (const o of arr) if (!op.ids.includes(o.id)) nova.push(o);
        arr.length = 0; arr.push(...nova);
      }
    }
    return sc;
  }

  /* ---- o índice das cenas da mesa ---- */
  /* As pastas da lista de cenas (lote 6), só do mestre: { lista: [{ id, nome }], de: { idDaCena: idDaPasta } }. Cena
     sem pasta (ou numa pasta que não existe mais) fica fora de todas.
     (lote 7) As famílias de cenas: mae: { idDaFilha: idDaMãe } (cidade → bairro → casa). Sem voltas — uma cena não
     fica dentro dela mesma nem de uma cena que está dentro dela (a que fecharia a volta sai) — e com até MAX_NIVEIS
     níveis (a mãe de todas é o primeiro). A família fica na pasta da mãe de todas. */
  const MAX_PASTAS = 40, MAX_NIVEIS = 6;
  function normPastas(p) {
    p = ehObj(p) ? p : {};
    const lista = [], vistos = new Set();
    for (const x of Array.isArray(p.lista) ? p.lista : []) {
      if (lista.length >= MAX_PASTAS || !ehObj(x) || typeof x.id !== 'string' || !/^pa_[A-Za-z0-9]{1,24}$/.test(x.id) || vistos.has(x.id)) continue;
      const nome = String(x.nome == null ? '' : x.nome).replace(/\s+/g, ' ').trim().slice(0, 40);
      if (!nome) continue;
      vistos.add(x.id); lista.push({ id: x.id, nome });
    }
    const de = {};
    if (ehObj(p.de)) for (const k of Object.keys(p.de)) if (idCena(k) && vistos.has(p.de[k])) de[k] = p.de[k];
    const mae = {};
    if (ehObj(p.mae)) for (const k of Object.keys(p.mae)) {
      const m = p.mae[k];
      if (!idCena(k) || !idCena(m) || k === m) continue;
      let x = m, volta = false;
      for (let n = 0; x && n < 64; n++) { if (x === k) { volta = true; break; } x = mae[x]; }
      if (!volta) mae[k] = m;
    }
    for (const k of Object.keys(mae)) { let x = k, n = 0; while (mae[x] && n < 64) { x = mae[x]; n++; } if (n >= MAX_NIVEIS) delete mae[k]; }
    return { lista, de, mae };
  }
  /* (lote 7) Os modelos do gerador de lugares, só do mestre (no índice): [{ id, nome, lugar, o, seed, trava }]. Aqui
     só a forma e o tamanho; o gerador confere o resto quando usa o modelo. */
  const MAX_MODELOS = 30;
  function normModelos(lista) {
    const out = [], vistos = new Set();
    for (const x of Array.isArray(lista) ? lista : []) {
      if (out.length >= MAX_MODELOS || !ehObj(x) || typeof x.id !== 'string' || !/^md_[A-Za-z0-9]{1,24}$/.test(x.id) || vistos.has(x.id)) continue;
      const nome = String(x.nome == null ? '' : x.nome).replace(/\s+/g, ' ').trim().slice(0, 40);
      const lugar = typeof x.lugar === 'string' && /^[a-z]{1,16}$/.test(x.lugar) ? x.lugar : null;
      if (!nome || !lugar || !ehObj(x.o)) continue;
      let o, trava;
      try { o = JSON.parse(JSON.stringify(x.o)); trava = ehObj(x.trava) ? JSON.parse(JSON.stringify(x.trava)) : null; } catch (e) { continue; }
      if (JSON.stringify(o).length > 4000 || (trava && JSON.stringify(trava).length > 20000)) continue;
      const seed = Math.round(Number(x.seed));
      vistos.add(x.id);
      out.push({ id: x.id, nome, lugar, o, seed: seed >= 1 && seed <= 2147483647 ? seed : 1, trava });
    }
    return out;
  }
  function normIndice(d) {
    d = ehObj(d) ? d : {};
    const ordem = Array.from(new Set((Array.isArray(d.ordem) ? d.ordem : []).filter(idCena)));
    const prefs = ehObj(d.prefs) ? d.prefs : {};
    return {
      v: 1, ordem, atual: idCena(d.atual) ? d.atual : null, noAr: idCena(d.noAr) ? d.noAr : null,
      tx: idOk(d.tx) ? d.tx : null,                         // qual aparelho do mestre está transmitindo a cena que está no ar
      prefs: { barDefaults: Array.isArray(prefs.barDefaults) && prefs.barDefaults.length ? prefs.barDefaults.slice(0, MAX_BARS).map(cleanBar) : null, modelos: normModelos(prefs.modelos) },
      pastas: normPastas(d.pastas),
    };
  }

  /* ---- cenas que vêm de fora da mesa (do navegador, de um arquivo) ---- */
  const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  // De quem era cada coisa lá → quem é aqui: jogador com o mesmo nome de um participante da mesa continua dono.
  function mapaDeDonos(jogadoresDeLa, membros) {
    const mapa = {};
    for (const p of jogadoresDeLa || []) {
      if (!p || !p.id) continue;
      const par = (membros || []).find(m => m.id === p.id) || (membros || []).find(m => semAcento(m.name) === semAcento(p.name));
      mapa[p.id] = par ? par.id : null;
    }
    return mapa;
  }
  // Troca os donos numa cena (cópia já feita por quem chama). Quem não tem par na mesa passa a ser do mestre.
  function trocarDonos(sc, mapa, membros) {
    const ids = new Set((membros || []).map(m => m.id));
    const novo = id => (id == null || id === '*' ? id : ids.has(id) ? id : (mapa && mapa[id]) || null);
    for (const t of sc.tokens || []) t.owner = novo(t.owner);
    for (const s of sc.shapes || []) s.by = novo(s.by) === '*' ? null : novo(s.by);
    for (const e of sc.effects || []) e.by = novo(e.by) === '*' ? null : novo(e.by);
    sc.targets = (sc.targets || []).map(x => ({ by: x.by === 'gm' ? 'gm' : novo(x.by), t: x.t })).filter(x => x.by);
    sc.explored = {};
    return sc;
  }

  return { COLS, VIVO, MAX_NIVEIS, igual, imgsDe, partes, juntar, projetar, validar, diferenca, aplicarEm, normIndice, normPastas, normModelos, mapaDeDonos, trocarDonos, idOk, idCena, resumo };
})();
