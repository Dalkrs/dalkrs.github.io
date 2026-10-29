/* Tiny Cats · os encontros por bioma (lote 32): a conta pura (sem DOM). Roda igual no navegador (window.TC.encontros: o
   Escudo do mestre monta as tabelas; o Mapa-múndi sorteia) e no Node (testes).
   O documento da mesa:
     escudo:biomas   { v, sugerir: 'dia' | 'tempo' | 'nunca', tabelas: { <bioma>: { chance, itens: [item] } } }
   Cada item: { id, p (o peso), k, ref, dados, papel, raca, txt } — k diz o que é:
     'inimigo'   um inimigo do Bestiário (ref: o id dele), na quantidade dos dados ("1d4+1")
     'encontro'  um encontro guardado no Bestiário (ref: o id dele), com as quantidades dele
     'npc'       um NPC sorteado na hora (papel e raça, se escolhidos; vazios: qualquer)
     'evento'    um evento ou uma descoberta (txt)
     'nada'      nada acontece (para dar peso ao "nada")
   txt, nos outros, é uma nota curta (aparece junto do resultado).
   Onde o grupo está numa região do Mapa-múndi com a tabela dela preenchida, vale a da região; sem ela, a do bioma do
   hexágono (o desenho do terreno). */
(() => {
  'use strict';
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, p) => { const n = Number(v); return Number.isFinite(n) ? n : p; };
  const int = (v, p, a, b) => clamp(Math.round(num(v, p)), a, b);
  const linha = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 80);
  const idOk = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(v) && !(v in Object.prototype) ? v : null);
  const sem = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  let seq = 0;
  const novoId = () => { seq = (seq + 1) % 1296; return 'it' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5) + seq.toString(36); };

  /* Os biomas do Mapa-múndi (o que o desenho do terreno vira: ver BIOMA_DA_TEX, em mundo/nucleo.js) e as tags do
     Bestiário que combinam com cada um (a "Sugerir do Bestiário" puxa os inimigos com essas tags). */
  const BIOMAS = {
    campo: { nome: 'Campo e planície', tags: ['Planície', 'Campo'] },
    floresta: { nome: 'Floresta', tags: ['Floresta'] },
    montanha: { nome: 'Montanha', tags: ['Montanha', 'Caverna'] },
    pantano: { nome: 'Pântano', tags: ['Pântano'] },
    deserto: { nome: 'Deserto', tags: ['Deserto'] },
    neve: { nome: 'Neve e gelo', tags: ['Neve'] },
    agua: { nome: 'Mar, rio e lago', tags: ['Mar'] },
    selva: { nome: 'Selva', tags: ['Selva', 'Floresta'] },
    savana: { nome: 'Savana', tags: ['Savana', 'Planície'] },
    tundra: { nome: 'Tundra', tags: ['Tundra', 'Neve'] },
    lava: { nome: 'Lava e vulcão', tags: ['Lava', 'Vulcão', 'Montanha'] },
    cristais: { nome: 'Cristais', tags: ['Cristais', 'Caverna', 'Subterrâneo'] },
    corrompida: { nome: 'Terra corrompida', tags: ['Corrompida', 'Ruínas'] },
  };
  const ORDEM = Object.keys(BIOMAS);
  const TIPOS = { inimigo: 'Inimigos do Bestiário', encontro: 'Encontro guardado', npc: 'Um NPC sorteado', evento: 'Evento ou descoberta', nada: 'Nada acontece' };
  const SUGERIR = { dia: 'Uma vez por dia', tempo: 'A cada tempo de marcha', nunca: 'Nunca (só pelo botão)' };
  const DOC = 'escudo:biomas';
  const LIM_ITENS = 40;

  // dados de quantidade: "3", "1d4", "2d6+1", "1d3-1" (o resto não vale)
  const RE_DADOS = /^\s*(\d{1,2})\s*(?:d\s*(\d{1,3}))?\s*(?:([+-])\s*(\d{1,2}))?\s*$/i;
  function dadosOk(s) {
    const m = RE_DADOS.exec(String(s == null ? '' : s));
    if (!m) return null;
    const n = +m[1], f = m[2] ? +m[2] : 0, b = m[4] ? (m[3] === '-' ? -m[4] : +m[4]) : 0;
    if (f && (n < 1 || n > 20 || f < 2)) return null;
    if (!f && (n < 1 || n > 30)) return null;
    return { n, f, b, txt: f ? n + 'd' + f + (b ? (b > 0 ? '+' : '−') + Math.abs(b) : '') : String(n + b) };
  }
  // rola a quantidade (pelo menos 1, no máximo 30) → { n, rolagens: [números], txt: "1d4+1 = 2+1 = 3" }
  function rolarDados(s, rng) {
    const r = typeof rng === 'function' ? rng : Math.random, d = dadosOk(s) || { n: 1, f: 0, b: 0, txt: '1' };
    if (!d.f) return { n: clamp(d.n + d.b, 1, 30), rolagens: [], txt: d.txt };
    const rol = [];
    for (let i = 0; i < d.n; i++) rol.push(1 + Math.floor(r() * d.f));
    const soma = rol.reduce((a, b) => a + b, 0), tot = clamp(soma + d.b, 1, 30);
    return { n: tot, rolagens: rol, txt: d.txt + ' = ' + (rol.length > 1 ? rol.join('+') : rol[0]) + (d.b ? (d.b > 0 ? '+' : '−') + Math.abs(d.b) : '') + (rol.length > 1 || d.b ? ' = ' + tot : '') };
  }

  function normItem(it) {
    if (!ehObj(it) || !Object.prototype.hasOwnProperty.call(TIPOS, it.k)) return null;
    const o = { id: idOk(it.id) || novoId(), p: int(it.p, 1, 1, 1000), k: it.k, txt: linha(it.txt, it.k === 'evento' ? 400 : 160) };
    if (it.k === 'inimigo') { o.ref = idOk(it.ref); o.dados = dadosOk(it.dados) ? dadosOk(it.dados).txt.replace('−', '-') : '1'; }
    if (it.k === 'encontro') o.ref = idOk(it.ref);
    if (it.k === 'npc') { o.papel = linha(it.papel, 30) || ''; o.raca = idOk(it.raca) || ''; }
    return o;
  }
  function normTabela(t) {
    t = ehObj(t) ? t : {};
    const vistos = new Set(), itens = [];
    for (const x of Array.isArray(t.itens) ? t.itens : []) {
      const it = normItem(x);
      if (!it || itens.length >= LIM_ITENS) continue;
      while (vistos.has(it.id)) it.id = novoId();
      vistos.add(it.id); itens.push(it);
    }
    return { chance: int(t.chance, 0, 0, 100), itens };
  }
  function normBiomas(d) {
    d = ehObj(d) ? d : {};
    const t0 = ehObj(d.tabelas) ? d.tabelas : {}, tabelas = {};
    for (const b of ORDEM) if (ehObj(t0[b])) tabelas[b] = normTabela(t0[b]);
    return { v: 1, sugerir: Object.prototype.hasOwnProperty.call(SUGERIR, d.sugerir) ? d.sugerir : 'dia', tabelas };
  }
  const tabelaDe = (d, bioma) => (ehObj(d) && ehObj(d.tabelas) && ehObj(d.tabelas[bioma]) ? normTabela(d.tabelas[bioma]) : { chance: 0, itens: [] });
  // a tabela de uma região do Mapa-múndi "conta" quando tem chance ou resultados escritos
  const regiaoTemTabela = r => !!(ehObj(r) && ehObj(r.enc) && (int(r.enc.chance, 0, 0, 100) > 0 || (Array.isArray(r.enc.itens) && r.enc.itens.some(x => ehObj(x) && linha(x.txt, 400)))));

  /* O sorteio: o d100 contra a chance (com o extra dos eventos do mapa) e, se houve, um item pelo peso.
     → { houve, d100, chance, base, extra, item (o item normalizado) | null, peso, total } */
  function sortear(tab, rng, extra) {
    const r = typeof rng === 'function' ? rng : Math.random, t = normTabela(tab);
    const chance = clamp(t.chance + Math.round(num(extra, 0)), 0, 100);
    const d100 = clamp(1 + Math.floor(num(r(), 0) * 100), 1, 100), houve = d100 <= chance;
    const total = t.itens.reduce((s, x) => s + x.p, 0);
    let item = null;
    if (houve && total > 0) {
      let s = num(r(), 0) * total;
      for (const x of t.itens) { if (s < x.p) { item = x; break; } s -= x.p; }
      if (!item) item = t.itens[t.itens.length - 1];
    }
    return { houve, d100, chance, base: t.chance, extra: Math.round(num(extra, 0)), item, peso: item ? item.p : 0, total };
  }

  /* "Sugerir do Bestiário": os inimigos com as tags do bioma que ainda não estão na tabela → itens novos (o peso e os
     dados pelo tier: os mais fracos vêm em bando). inimigos: [{ id, e }] (o inimigo normalizado do Bestiário). */
  const DADOS_DO_TIER = { E: '1d6', D: '1d4', C: '1d3', B: '1d2', A: '1', S: '1' };
  const PESO_DO_TIER = { E: 4, D: 4, C: 3, B: 2, A: 1, S: 1 };
  function combina(e, bioma) {
    const B = BIOMAS[bioma];
    if (!B || !ehObj(e)) return false;
    const quer = new Set(B.tags.map(sem).concat([sem(B.nome)]));
    return (Array.isArray(e.tags) ? e.tags : []).some(t => quer.has(sem(t)));
  }
  function sugerirDoBestiario(tab, bioma, inimigos) {
    const t = normTabela(tab), ja = new Set(t.itens.filter(x => x.k === 'inimigo').map(x => x.ref));
    const out = [];
    for (const x of inimigos || []) {
      if (!x || !idOk(x.id) || ja.has(x.id) || !combina(x.e, bioma)) continue;
      const tier = x.e && x.e.ficha && x.e.ficha.tier;
      out.push(normItem({ k: 'inimigo', ref: x.id, dados: DADOS_DO_TIER[tier] || '1d3', p: PESO_DO_TIER[tier] || 2 }));
      if (t.itens.length + out.length >= LIM_ITENS) break;
    }
    return out;
  }
  // as chances de cada item, em % (o peso sobre o total) → Map(id → %)
  function porcentagens(tab) {
    const t = normTabela(tab), total = t.itens.reduce((s, x) => s + x.p, 0), out = new Map();
    for (const x of t.itens) out.set(x.id, total ? Math.round((x.p / total) * 1000) / 10 : 0);
    return out;
  }

  /* O resultado sorteado, pronto para mostrar: os inimigos (com a quantidade rolada), o encontro guardado, o NPC gerado
     na hora, o evento. ctx: { inimigo(id) → { nome, e } | null, encontro(id) → { nome, itens: [{ id, n }] } | null,
     npc (TC.npc), racas (escudo:racas), lugar, fac, rng }.
     → { k: 'inimigos' | 'npc' | 'evento' | 'nada' | 'falta' | 'vazio', linhas: [{ id, nome, n, dados }], nome (do
         encontro guardado), npc, texto (uma linha, para a mesa), nota } */
  const listaTexto = l => (l.length > 1 ? l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1] : l[0] || '');
  const textoLinhas = linhas => listaTexto(linhas.filter(x => x.n > 0).map(x => x.n + ' × ' + x.nome));
  function resolver(item, ctx) {
    ctx = ctx || {};
    const rng = typeof ctx.rng === 'function' ? ctx.rng : Math.random;
    const ini = id => (typeof ctx.inimigo === 'function' ? ctx.inimigo(id) : null);
    if (!item) return { k: 'vazio', linhas: [], texto: 'encontro (a tabela está sem resultados)', nota: '' };
    const nota = item.txt && item.k !== 'evento' ? item.txt : '';
    if (item.k === 'inimigo') {
      const x = item.ref ? ini(item.ref) : null;
      if (!x) return { k: 'falta', linhas: [], texto: 'um inimigo que não está mais no Bestiário', nota };
      const q = rolarDados(item.dados, rng);
      return { k: 'inimigos', linhas: [{ id: item.ref, nome: x.nome, n: q.n, dados: q.txt }], texto: q.n + ' × ' + x.nome, nota };
    }
    if (item.k === 'encontro') {
      const enc = item.ref && typeof ctx.encontro === 'function' ? ctx.encontro(item.ref) : null;
      const linhas = enc ? (enc.itens || []).map(y => { const x = ini(y.id); return x ? { id: y.id, nome: x.nome, n: clamp(Math.round(num(y.n, 1)), 1, 30), dados: '' } : null; }).filter(Boolean) : [];
      if (!enc || !linhas.length) return { k: 'falta', linhas: [], texto: 'um encontro que não está mais no Bestiário', nota };
      return { k: 'inimigos', nome: linha(enc.nome, 60), linhas, texto: linha(enc.nome, 60) + ': ' + textoLinhas(linhas), nota };
    }
    if (item.k === 'npc') {
      const N = ctx.npc;
      if (!N) return { k: 'falta', linhas: [], texto: 'um NPC', nota };
      const raca = N.escolherRaca(ctx.racas, item.raca || null, '', rng);
      const npc = N.gerar({ papel: item.papel || null, raca, lugar: ctx.lugar || null, fac: ctx.fac || null }, 1 + Math.floor(rng() * 2147483000));
      const ds = N.descricao(npc);
      return { k: 'npc', linhas: [], npc, texto: 'Alguém no caminho: ' + npc.nome + ' (' + ds.quem.charAt(0).toLowerCase() + ds.quem.slice(1) + ')', nota };
    }
    if (item.k === 'evento') return { k: 'evento', linhas: [], texto: item.txt || 'um evento (sem texto na tabela)', nota: '' };
    return { k: 'nada', linhas: [], texto: 'nada acontece', nota };
  }

  const api = { BIOMAS, ORDEM, TIPOS, SUGERIR, DOC, LIM_ITENS, DADOS_DO_TIER, PESO_DO_TIER, sem, idOk, dadosOk, rolarDados, normItem, normTabela, normBiomas, tabelaDe, regiaoTemTabela, sortear, combina, sugerirDoBestiario, porcentagens, novoId, resolver, textoLinhas, listaTexto };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.TC = window.TC || {}; window.TC.encontros = api; }
})();
