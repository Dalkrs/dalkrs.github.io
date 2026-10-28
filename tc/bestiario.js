/* =======================================================================
   TC.bestiario — o Bestiário do mestre (lote 29): as contas, sem DOM.

   Cada inimigo é um documento "best:i:<id>" (só quem mestra lê): a ficha dele é uma ficha de NPC das Fichas (tier,
   level, os percentuais de cada atributo — "onde os pontos caem" —, as defesas, as barras com as fórmulas, a
   iniciativa), com as árvores equipadas e os nódulos de prioridade (o site distribui os pontos de cada tipo pelo
   caminho até eles), as tags, o comportamento (o texto e o lembrete curto que aparece na vez dele nas Cenas), o saque
   (as chances e as quantidades) e a imagem. As contas são as das fichas (TC.rules.calcular): nada aqui inventa regra.
   Os encontros guardados são "best:enc:<id>"; as tags criadas pelo mestre, "best:tags".

     navegador   <script src="tc/bestiario.js"></script> (depois de tc/rules.js e tc/dice.js) → window.TC.bestiario
     Node        const B = require('./tc/bestiario.js')

   Formato de um inimigo (normalizar devolve sempre assim):
     { v: 1, nome, tags: [texto], cor: '#rrggbb', img: 'https://…' | null, tam: 0.5 | 1 | 2 | 3 | 4,
       ficha: { tier, level, tiers: { FOR: 'A'…'E', … }, defesas: { DFF, DFM, BLQ }, defEsp: { FOGO: n, … },
                recursos: [{ id, nome, fml, comeca?, piso? }], ini: 'fórmula', lado: 'Inimigo' },
       skills: { arvores: [id], pontos: { idDoTipo: n }, prioridade: [idDoNódulo], sobra: true/false, alocados: {…},
                 texto: 'as skills escritas à mão' },
       comp: { texto, lembrete }, saque: { itens: [{ id, nome, chance (1–100), qtd ('1', '1d3'), tipo, cat? }], lapros: '2d6' },
       notas }
   ======================================================================= */
(function (root) {
  'use strict';
  const R = () => (root.TC && root.TC.rules) || (typeof require === 'function' ? require('./rules.js') : null);
  const Dd = () => (root.TC && root.TC.dice) || (typeof require === 'function' ? require('./dice.js') : null);
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const txt = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 200);
  const num = (v, pad) => { const n = typeof v === 'string' ? (v.trim() === '' ? NaN : +v.replace(',', '.')) : +v; return isFinite(n) ? n : pad; };
  const inteiro = (v, lo, hi, pad) => Math.max(lo, Math.min(hi, Math.round(num(v, pad))));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const idOk = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(s);
  const PRE = 'best:i:', PRE_ENC = 'best:enc:', TAGS = 'best:tags', L_LOCAL = 'tinycats:bestiario:local';
  const TIERS = ['S', 'A', 'B', 'C', 'D', 'E'], LETRAS = ['A', 'B', 'C', 'D', 'E'], TAMANHOS = [0.5, 1, 2, 3, 4];
  const CORES = ['#8f3d4a', '#4a6a8f', '#5a7a3a', '#7a5a3a', '#6a4a8a', '#8a6a2a', '#3a7a7a', '#7a3a6a'];
  /* As tags que vêm prontas, em quatro grupos (o mestre cria outras; a Facção / região traz também as facções e as
     regiões do Mapa-múndi). */
  const TAG_GRUPOS = [
    { id: 'bioma', nome: 'Bioma / lugar', tags: ['Floresta', 'Caverna', 'Cidade', 'Pântano', 'Montanha', 'Deserto', 'Planície', 'Mar', 'Neve', 'Masmorra', 'Ruínas', 'Subterrâneo'] },
    { id: 'tipo', nome: 'Tipo de criatura', tags: ['Fera', 'Humanoide', 'Morto-vivo', 'Demônio', 'Elemental', 'Constructo', 'Dragão', 'Inseto', 'Planta', 'Espírito', 'Aberração', 'Gigante'] },
    { id: 'papel', nome: 'Papel no combate', tags: ['Lacaio', 'Elite', 'Chefe', 'Suporte', 'Atirador', 'Tanque', 'Assassino', 'Conjurador', 'Líder'] },
    { id: 'faccao', nome: 'Facção / região', tags: [] },
  ];
  const TIPOS_SAQUE = [['material', 'Material'], ['pocao', 'Poção'], ['bomba', 'Bomba'], ['runa', 'Runa'], ['municao', 'Munição'], ['equip', 'Equipamento']];
  const DIFICULDADES = [['facil', 'Fácil'], ['medio', 'Médio'], ['duro', 'Duro'], ['mortal', 'Mortal']];

  /* ---------------- normalizar ---------------- */
  function recursoLimpo(r) {
    if (!ehObj(r)) return null;
    const o = { id: idOk(r.id) ? r.id : uid(), nome: txt(r.nome, 30) || 'Barra', fml: txt(r.fml, 200) };
    if (txt(r.comeca, 200)) o.comeca = txt(r.comeca, 200);
    if (txt(r.piso, 200)) o.piso = txt(r.piso, 200);
    return o;
  }
  function recursosPadrao() {
    const p = R() ? R().personagemPadrao('x') : null;
    return (p ? p.recursos : [{ nome: 'HP', fml: 'VIT*8 + LVL*5' }, { nome: 'SP', fml: 'CAN*6 + LVL*3' }]).map(r => ({ id: uid(), nome: r.nome, fml: r.fml }));
  }
  function fichaLimpa(f) {
    f = ehObj(f) ? f : {};
    const tiers = {};
    const t0 = ehObj(f.tiers) ? f.tiers : {}, pad = { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' };
    for (const k of ['FOR', 'DES', 'VIT', 'CAN', 'AGI']) tiers[k] = LETRAS.includes(t0[k]) ? t0[k] : pad[k];
    const defesas = {};
    for (const k of ['DFF', 'DFM', 'BLQ']) defesas[k] = inteiro(ehObj(f.defesas) ? f.defesas[k] : 0, -999, 9999, 0);
    const defEsp = {};
    if (ehObj(f.defEsp)) for (const k in f.defEsp) { if (/^[A-Z]{2,10}$/.test(k)) { const v = inteiro(f.defEsp[k], -999, 9999, 0); if (v) defEsp[k] = v; } }
    const rec = Array.isArray(f.recursos) ? f.recursos.map(recursoLimpo).filter(Boolean).slice(0, 8) : null;
    return { tier: TIERS.includes(f.tier) ? f.tier : 'C', level: inteiro(f.level, 1, 99, 1), tiers, defesas, defEsp,
      recursos: rec || recursosPadrao(), ini: txt(f.ini, 200), lado: txt(f.lado, 20) || 'Inimigo' };
  }
  function normalizar(e) {
    e = ehObj(e) ? e : {};
    const sk = ehObj(e.skills) ? e.skills : {}, comp = ehObj(e.comp) ? e.comp : {}, sq = ehObj(e.saque) ? e.saque : {};
    const pontos = {};
    if (ehObj(sk.pontos)) for (const k in sk.pontos) if (idOk(k)) pontos[k] = inteiro(sk.pontos[k], 0, 9999, 0);
    const alocados = {};
    if (ehObj(sk.alocados)) for (const k in sk.alocados) if (idOk(k)) { const g = inteiro(sk.alocados[k], 0, 99, 0); if (g > 0) alocados[k] = g; }
    const tags = [];
    for (const t of Array.isArray(e.tags) ? e.tags : []) { const s = txt(t, 40); if (s && !tags.some(x => x.toLowerCase() === s.toLowerCase())) tags.push(s); if (tags.length >= 20) break; }
    return {
      v: 1, nome: txt(e.nome, 80) || 'Inimigo sem nome', tags,
      cor: typeof e.cor === 'string' && /^#[0-9a-f]{6}$/i.test(e.cor) ? e.cor : CORES[0],
      img: typeof e.img === 'string' && (/^https:\/\/[^\s"'<>]+$/i.test(e.img) || /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(e.img)) ? e.img : null,
      tam: TAMANHOS.includes(num(e.tam, 1)) ? num(e.tam, 1) : 1,
      ficha: fichaLimpa(e.ficha),
      skills: { arvores: (Array.isArray(sk.arvores) ? sk.arvores : []).filter(idOk).slice(0, 12), pontos, prioridade: (Array.isArray(sk.prioridade) ? sk.prioridade : []).filter(idOk).slice(0, 60),
        sobra: sk.sobra === true, alocados, texto: String(sk.texto == null ? '' : sk.texto).slice(0, 4000) },
      comp: { texto: String(comp.texto == null ? '' : comp.texto).slice(0, 4000), lembrete: txt(comp.lembrete, 160) },
      saque: { itens: (Array.isArray(sq.itens) ? sq.itens : []).filter(ehObj).slice(0, 30).map(x => ({ id: idOk(x.id) ? x.id : uid(), nome: txt(x.nome, 80) || 'Item',
        chance: inteiro(x.chance, 1, 100, 100), qtd: txt(x.qtd, 20) || '1', tipo: TIPOS_SAQUE.some(t => t[0] === x.tipo) ? x.tipo : 'material', cat: idOk(x.cat) ? x.cat : null })),
        lapros: txt(sq.lapros, 30) },
      notas: String(e.notas == null ? '' : e.notas).slice(0, 4000),
    };
  }
  function novo(nome, extra) { return normalizar(Object.assign({ nome: nome || 'Novo inimigo', cor: CORES[Math.floor(Math.random() * CORES.length)] }, extra || {})); }

  /* ---------------- as contas da ficha ---------------- */
  // a ficha do inimigo como uma ficha das Fichas (para TC.rules.calcular e companhia)
  function pcDe(e, id) {
    const p = R().personagemPadrao(e.nome, id ? 'best:' + id : 'best');
    return Object.assign(p, JSON.parse(JSON.stringify(e.ficha)), { nome: e.nome, skills: { arvores: e.skills.arvores, pontos: e.skills.pontos, alocados: e.skills.alocados } });
  }
  const skillsDe = e => ({ arvores: e.skills.arvores, pontos: e.skills.pontos, alocados: e.skills.alocados });
  // a linha "de mentira" que as Cenas usam como se fosse a ficha de um personagem (sem estado: as barras moram no token)
  const linhaDe = (e, id) => ({ id: 'best:' + id, nome: e.nome, ficha: Object.assign(JSON.parse(JSON.stringify(e.ficha)), { nome: e.nome }), skills: skillsDe(e), estado: {}, best: true });
  const ROLAVEIS = ['FOR', 'DES', 'VIT', 'CAN', 'AGI', 'ESQ', 'FUR', 'PER', 'EMB', 'DFF', 'DFM', 'BLQ'];
  /* Tudo o que se mostra e se rola: os atributos (com o que a árvore soma), as defesas, as barras (o máximo, o começo e
     o piso), a iniciativa e o "poder" (os pontos do level com o tier, para medir o encontro). */
  function contas(e, cfg, bib) {
    const Rr = R(), cf = cfg || Rr.cfgPadrao();
    const pc = pcDe(e), extra = { arvore: Rr.bonusDaArvore(skillsDe(e), bib || null) };
    const c = Rr.calcular(pc, cf, extra);
    const rolaveis = ROLAVEIS.map(k => [k, Rr.NOMES[k] || k, Math.max(0, Math.round(Rr.valorDoAtributo(c, k, 'total') || 0))]);
    const val = k => (rolaveis.find(x => x[0] === k) || [0, 0, 0])[2];
    const barras = c.recursos.filter(r => r.max != null && isFinite(r.max)).map(r => ({ id: r.id, n: r.nome, m: r.max, v: r.inicio != null ? r.inicio : r.max, lo: r.min < 0 ? -r.min : 0, st: r.inicio != null && r.inicio !== r.max ? r.inicio : null }));
    let ini = 0;
    if (e.ficha.ini) { try { const v = Rr.iniciativa(pc, cf, extra); ini = v && isFinite(v.val) ? Math.round(v.val) : 0; } catch (er) { ini = 0; } }   // (sem fórmula: 0, como o token de sempre)
    const defesas = {};
    for (const k in c.def) defesas[k] = Math.round(Number(c.def[k]) || 0);
    for (const k in c.defEsp) defesas[k] = Math.round(Number(c.defEsp[k]) || 0);
    return { c, rolaveis, barras, ini, defesas, poder: Math.round(c.total || 0), numeros: { FOR: val('FOR'), CAN: val('CAN'), DFF: val('DFF'), DFM: val('DFM'), ESQ: val('ESQ') } };
  }

  /* ---------------- a árvore: o site distribui ----------------
     Os pontos de cada tipo (os da biblioteca: o padrão do tipo, ou o que o mestre escreveu) vão primeiro para os
     nódulos de prioridade, na ordem: o caminho até cada um (pela regra do nódulo — "e": todos os de antes; "ou": um
     deles, o que custar menos) e depois os graus dele, enquanto der. Com "sobra", o que restar vai para os nódulos que já
     dá para pegar, os mais baratos primeiro. Um nódulo de um grupo exclusivo fecha os outros do grupo. Nada de nódulo
     de árvore que não está equipada. → { alocados, gastos, sobra, faltou: [nomes de prioridade que não couberam] } */
  const grausDe = n => (Array.isArray(n.graus) && n.graus.length ? n.graus : [{ custos: {}, texto: '' }]);
  const custoDoGrau = (n, g) => (ehObj(grausDe(n)[g - 1] && grausDe(n)[g - 1].custos) ? grausDe(n)[g - 1].custos : {});
  const grupoEx = n => String(n.exclusivo || '').trim().toLowerCase();
  function indice(bib, arvores) {
    const porId = new Map(), arvDe = new Map();
    for (const a of (bib && Array.isArray(bib.arvores) ? bib.arvores : [])) {
      if (!a || !arvores.includes(a.id)) continue;
      for (const n of Array.isArray(a.nodes) ? a.nodes : []) if (n && idOk(n.id)) { porId.set(n.id, n); arvDe.set(n.id, a); }
    }
    return { porId, arvDe };
  }
  function pontosDe(e, bib) {
    const out = {};
    for (const pl of (bib && Array.isArray(bib.pools) ? bib.pools : [])) if (pl && idOk(pl.id)) out[pl.id] = e.skills.pontos[pl.id] != null ? e.skills.pontos[pl.id] : Math.max(0, Math.round(num(pl.padrao, 0)));
    return out;
  }
  function distribuir(e, bib) {
    const I = indice(bib, e.skills.arvores), total = pontosDe(e, bib), resta = Object.assign({}, total), al = {};
    const cabe = custo => Object.keys(custo).every(k => !(num(custo[k], 0) > 0) || (resta[k] || 0) >= num(custo[k], 0));
    const pagar = (custo, m) => { for (const k in custo) if (num(custo[k], 0) > 0) resta[k] = (resta[k] || 0) - m * num(custo[k], 0); };
    const fechado = (n, mapa) => { const g = grupoEx(n); return !!g && [...I.porId.values()].some(x => x !== n && grupoEx(x) === g && mapa[x.id] > 0); };
    const somaCusto = n => Object.values(custoDoGrau(n, 1)).reduce((s, v) => s + Math.max(0, num(v, 0)), 0);
    // tenta deixar o nódulo com pelo menos o grau 1, com o caminho; tudo ou nada (numa cópia), devolve se conseguiu
    function garantir(id, mapa, resto, pilha) {
      const n = I.porId.get(id);
      if (!n) return false;
      if (mapa[id] > 0) return true;
      if (pilha.has(id) || pilha.size > 80) return false;
      pilha.add(id);
      const pais = (Array.isArray(n.pais) ? n.pais : []).filter(p => I.porId.has(p));
      if (pais.length) {
        if (n.regra === 'ou') {
          if (!pais.some(p => mapa[p] > 0)) {
            const ord = pais.slice().sort((a, b) => somaCusto(I.porId.get(a)) - somaCusto(I.porId.get(b)));
            let ok = false;
            for (const p of ord) { const m2 = Object.assign({}, mapa), r2 = Object.assign({}, resto); if (garantir(p, m2, r2, new Set(pilha))) { Object.assign(mapa, m2); Object.assign(resto, r2); ok = true; break; } }
            if (!ok) return false;
          }
        } else for (const p of pais) if (!garantir(p, mapa, resto, pilha)) return false;
      }
      if (fechado(n, mapa)) return false;
      const custo = custoDoGrau(n, 1);
      if (!Object.keys(custo).every(k => !(num(custo[k], 0) > 0) || (resto[k] || 0) >= num(custo[k], 0))) return false;
      for (const k in custo) if (num(custo[k], 0) > 0) resto[k] = (resto[k] || 0) - num(custo[k], 0);
      mapa[id] = 1;
      return true;
    }
    const subir = n => { while ((al[n.id] || 0) < grausDe(n).length) { const c = custoDoGrau(n, (al[n.id] || 0) + 1); if (!cabe(c)) break; pagar(c, 1); al[n.id] = (al[n.id] || 0) + 1; } };
    const faltou = [];
    for (const id of e.skills.prioridade) {
      const n = I.porId.get(id);
      if (!n) continue;
      const m2 = Object.assign({}, al), r2 = Object.assign({}, resta);
      if (garantir(id, m2, r2, new Set())) { for (const k in al) delete al[k]; Object.assign(al, m2); for (const k in resta) delete resta[k]; Object.assign(resta, r2); subir(n); }
      else faltou.push(n.nome || id);
    }
    if (e.skills.sobra) {
      for (let volta = 0; volta < 400; volta++) {
        const livres = [...I.porId.values()].filter(n => !(al[n.id] > 0) && !fechado(n, al)).filter(n => {
          const pais = (Array.isArray(n.pais) ? n.pais : []).filter(p => I.porId.has(p));
          return !pais.length || (n.regra === 'ou' ? pais.some(p => al[p] > 0) : pais.every(p => al[p] > 0));
        }).filter(n => cabe(custoDoGrau(n, 1))).sort((a, b) => somaCusto(a) - somaCusto(b));
        if (!livres.length) break;
        const n = livres[0]; pagar(custoDoGrau(n, 1), 1); al[n.id] = 1;
      }
    }
    const gastos = {};
    for (const k in total) gastos[k] = total[k] - (resta[k] || 0);
    return { alocados: al, gastos, sobra: resta, total, faltou };
  }
  // o resumo das skills (os cartões): o que foi pego, com o grau, a árvore e o uso (Ativa, Passiva…)
  function skills(e, bib) {
    const I = indice(bib, e.skills.arvores), usos = new Map(((bib && bib.usos) || []).filter(ehObj).map(u => [u.id, u]));
    const out = [];
    for (const [id, g] of Object.entries(e.skills.alocados)) {
      const n = I.porId.get(id);
      if (!n || !(g > 0)) continue;
      const graus = grausDe(n), gr = Math.min(g, graus.length), tx = graus[gr - 1] && graus[gr - 1].texto;
      out.push({ id, nome: txt(n.nome, 80) || 'Nódulo', grau: gr, graus: graus.length, arvore: txt((I.arvDe.get(id) || {}).nome, 60), usos: (Array.isArray(n.usos) ? n.usos : []).map(u => usos.get(u)).filter(Boolean).map(u => u.sigla || u.nome),
        texto: String(tx || n.desc || '').slice(0, 600) });
    }
    return out;
  }

  /* ---------------- o encontro ----------------
     A dificuldade é só uma sugestão: o poder dos inimigos (os pontos do level com o tier, somados, um por cópia) contra o
     dos personagens do grupo (os mesmos pontos). Até 60%: Fácil; até 100%: Médio; até 150%: Duro; acima: Mortal.
     inimigos: [{ e, n }]; grupo: [ficha] (tier e level). → { k, nome, inimigos, grupo, razao } ou null (sem grupo) */
  function poderDe(ficha, cfg) {
    const cf = cfg || R().cfgPadrao(), tab = cf.niveis || [], lvl = Math.max(1, Math.round(num(ficha && ficha.level, 1)));
    const linha = tab.find(r => +r.lvl === lvl) || (tab.length ? (lvl > +tab[tab.length - 1].lvl ? tab[tab.length - 1] : tab[0]) : { pts: 0 });   // (como nas fichas: acima da tabela, o último)
    const mult = ((cf.tiersPersonagem || []).find(x => x.t === (ficha && ficha.tier)) || { m: 1 }).m;
    return Math.round(num(linha.pts, 0) * num(mult, 1));
  }
  function dificuldade(inimigos, grupo, cfg) {
    const pi = (inimigos || []).reduce((s, x) => s + poderDe(x.e.ficha, cfg) * Math.max(0, Math.round(num(x.n, 1))), 0);
    const pg = (grupo || []).reduce((s, f) => s + poderDe(f, cfg), 0);
    if (!(pg > 0) || !(pi > 0)) return null;
    const r = pi / pg, k = r <= 0.6 ? 'facil' : r <= 1 ? 'medio' : r <= 1.5 ? 'duro' : 'mortal';
    return { k, nome: DIFICULDADES.find(d => d[0] === k)[1], inimigos: pi, grupo: pg, razao: Math.round(r * 100) };
  }

  /* ---------------- o saque ----------------
     Cada item cai pela chance dele (1d100 ≤ chance) com a quantidade rolada; os lapros, pelos dados. rng: um sorteio de
     0 a 1 (para os testes). → { itens: [{ nome, qtd, tipo, cat, chance, d100 }], lapros, rolagens: [texto] } */
  function rolarSaque(e, rng) {
    const D = Dd(), sorte = typeof rng === 'function' ? rng : Math.random, out = { itens: [], lapros: 0, rolagens: [] };
    const qtdDe = expr => { const s = String(expr || '1').trim(); if (/^\d+$/.test(s)) return +s; const r = D ? D.rollExpr(s) : null; return r && r.ok ? Math.max(0, Math.round(r.total)) : 1; };
    for (const it of e.saque.itens) {
      const d = 1 + Math.floor(sorte() * 100);
      out.rolagens.push(it.nome + ': ' + d + (d <= it.chance ? ' ≤ ' : ' > ') + it.chance + '%');
      if (d > it.chance) continue;
      const q = qtdDe(it.qtd);
      if (q > 0) out.itens.push({ nome: it.nome, qtd: q, tipo: it.tipo, cat: it.cat, chance: it.chance, d100: d });
    }
    if (e.saque.lapros) { const r = D ? D.rollExpr(e.saque.lapros) : null; out.lapros = r && r.ok ? Math.max(0, Math.round(r.total)) : Math.max(0, Math.round(num(e.saque.lapros, 0))); if (out.lapros) out.rolagens.push('Lapros: ' + out.lapros); }
    return out;
  }

  /* ---------------- as tags ---------------- */
  // os grupos com as tags que vêm prontas, as criadas pelo mestre (best:tags: { grupos: { idDoGrupo: [tag] } }) e as
  // facções e regiões do Mapa-múndi (lugares: [nome]); "Outras": as que estão nos inimigos e em grupo nenhum
  function gruposDeTags(criadas, lugares, inimigos) {
    const cr = ehObj(criadas) && ehObj(criadas.grupos) ? criadas.grupos : {};
    const out = TAG_GRUPOS.map(g => ({ id: g.id, nome: g.nome, tags: [] }));
    const poe = (g, t) => { const s = txt(t, 40); if (s && !out.some(x => x.tags.some(y => y.toLowerCase() === s.toLowerCase()))) g.tags.push(s); };
    for (const g of out) {
      for (const t of (TAG_GRUPOS.find(x => x.id === g.id) || {}).tags || []) poe(g, t);
      for (const t of Array.isArray(cr[g.id]) ? cr[g.id] : []) poe(g, t);
      if (g.id === 'faccao') for (const t of lugares || []) poe(g, t);
    }
    const outras = { id: 'outras', nome: 'Outras', tags: [] };
    out.push(outras);
    for (const e of inimigos || []) for (const t of e.tags || []) poe(outras, t);
    return outras.tags.length ? out : out.slice(0, -1);
  }
  // o inimigo passa no filtro? (busca no nome, nas tags e no comportamento; tags: todas as escolhidas — uma de cada
  // grupo basta dentro do grupo)
  function passa(e, busca, tagsPorGrupo) {
    const sem = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const q = sem(busca).trim();
    if (q && !sem([e.nome, e.tags.join(' '), e.comp.lembrete, e.notas].join(' ')).includes(q)) return false;
    for (const g in tagsPorGrupo || {}) {
      const ts = tagsPorGrupo[g];
      if (ts && ts.length && !ts.some(t => e.tags.some(x => x.toLowerCase() === t.toLowerCase()))) return false;
    }
    return true;
  }
  const iniciais = nome => String(nome || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || '?';

  const api = { PRE, PRE_ENC, TAGS, L_LOCAL, TIERS, LETRAS, TAMANHOS, CORES, TAG_GRUPOS, TIPOS_SAQUE, DIFICULDADES, ROLAVEIS,
    normalizar, novo, recursosPadrao, pcDe, linhaDe, contas, pontosDe, distribuir, skills, poderDe, dificuldade, rolarSaque, gruposDeTags, passa, iniciais, uid, idOk };
  (root.TC || (root.TC = {})).bestiario = api;
  if (typeof window !== 'undefined' && window && window !== root) (window.TC || (window.TC = root.TC)).bestiario = api;
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
