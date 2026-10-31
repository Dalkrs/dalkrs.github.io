/* Tiny Cats · as tropas das fichas (lote 40): a lógica pura (sem página). Roda igual no navegador (TC.tropas) e no Node
   (testes). Serve à aba Tropas das Fichas; no lote seguinte, ao Mapa-múndi (o exército ligado à ficha).
   A tropa de um personagem — a guarda pessoal dele — são unidades, cada uma uma carta: os números são do mestre (as
   tropas, o efetivo completo, o HP de cada soldado, o ATQ e a DEF, a veterania, as batalhas e as baixas, os magos, a
   cura, as quantidades dos suprimentos; e, da tropa, a moral e os mantimentos) e as escolhas são do jogador (o nome, a
   raça e a classe — das árvores da mesa —, o brasão, os equipamentos e os suprimentos — das listas do mestre, nas
   tabelas base das Fichas — e as informações; e, da tropa, o nome, o brasão e as informações).
   Onde mora: o documento "fichas:tropas:<id do personagem>" (o mestre cria; o dono do personagem é o dono do documento,
   e por isso só ele e quem mestra o recebem; o dono muda só as escolhas dele — o banco confere: ver
   supabase/migrations/0029_tropas.sql, privado.tropas_mestre, que faz a mesma conta de parteMestre daqui). Fora de uma
   mesa, na própria ficha (pc.tropas). */
(() => {
  'use strict';
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const inteiro = (v, a, b, d) => { const n = Math.round(Number(v)); return v !== null && v !== '' && Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
  const idOk = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);
  // (lote 41) os ids do Mapa-múndi (as unidades, os tipos de tropa, as máquinas, os mapas, os grupos): a regra de lá
  const idMapa = v => typeof v === 'string' && v.length <= 80 && /^[A-Za-z0-9_:.-]+$/.test(v) && v !== '__proto__';
  // uma linha de texto (sem quebras nem caracteres de controle) e um texto de várias linhas
  const linha = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const textoLongo = (v, max) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '');
  const corOk = v => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null);

  const PRE = 'fichas:tropas:';
  const docId = pcId => PRE + pcId;
  const pcDoDoc = id => (typeof id === 'string' && id.startsWith(PRE) && idOk(id.slice(PRE.length)) ? id.slice(PRE.length) : null);
  const MAX = { unid: 40, tropas: 1e7, hpT: 1e6, atr: 99, lista: 40, equipUnid: 6, suprUnid: 6, suprQ: 1e6, diario: 40, nome: 60, info: 400, titulo: 80, det: 200, raca: 40, magos: 1e7, mant: 1e9, bat: 9999, bonus: 10, sold: 50 };

  /* ---------------- a veterania ---------------- */
  const VET = [null, { n: 1, nome: 'Recruta' }, { n: 2, nome: 'Veterana' }, { n: 3, nome: 'Elite' }];
  const nomeVet = n => (VET[inteiro(n, 1, 3, 1)] || VET[1]).nome;
  // a média de veterania com uma casa ("2,1"), e o nome que ela tem
  const vetDaMedia = m => (m == null ? null : m < 1.5 ? 1 : m < 2.5 ? 2 : 3);
  const fmtMedia = m => (m == null ? '—' : m.toFixed(1).replace('.', ','));

  /* ---------------- as listas do mestre (nas tabelas base das Fichas: cfg.tropas) ---------------- */
  const EQUIP_PADRAO = [
    { id: 'eq_lanca', nome: 'Lança longa', atq: 2, def: 0 }, { id: 'eq_espada', nome: 'Espada e escudo', atq: 1, def: 1 },
    { id: 'eq_arco', nome: 'Arco composto', atq: 3, def: 0 }, { id: 'eq_torre', nome: 'Escudo de torre', atq: 0, def: 3 },
    { id: 'eq_couro', nome: 'Armadura de couro', atq: 0, def: 1 }, { id: 'eq_malha', nome: 'Cota de malha', atq: 0, def: 2 },
  ];
  const SUPR_PADRAO = [
    { id: 'sp_racoes', nome: 'Rações', desc: 'Comida para os dias de marcha.' }, { id: 'sp_agua', nome: 'Água', desc: 'Odres e barris.' },
    { id: 'sp_flechas', nome: 'Flechas', desc: 'Aljavas cheias para os arqueiros.' }, { id: 'sp_ataduras', nome: 'Ataduras', desc: 'Para os feridos depois da luta.' },
    { id: 'sp_remedios', nome: 'Remédios', desc: 'Ervas e poções simples.' }, { id: 'sp_ferramentas', nome: 'Ferramentas', desc: 'Pás, cordas e martelos para o acampamento.' },
  ];
  const VET_BONUS_PADRAO = { 2: 1, 3: 2 };
  const MAX_EQUIP_PADRAO = 2;
  /* (lote 41) o comandante pela ficha: o atributo que dá o bônus de comando do exército (no d20) e o divisor —
     floor(valor ÷ divisor), até ±20. '' = sem conta (o mestre escreve o bônus no mapa). */
  const ATR_CMD = [['FOR', 'Força'], ['DES', 'Destreza'], ['VIT', 'Vitalidade'], ['CAN', 'Canalização'], ['AGI', 'Agilidade'], ['ESQ', 'Esquiva'], ['FUR', 'Furtividade'],
    ['PER', 'Percepção'], ['EMB', 'Embate'], ['DFF', 'Defesa Física'], ['DFM', 'Defesa Mágica'], ['BLQ', 'Bloqueio']];
  const CMD_PADRAO = { atr: 'EMB', div: 3 };
  const nomeAtr = k => (ATR_CMD.find(x => x[0] === k) || [k, k])[1];
  const peloAtr = k => (k === 'EMB' || k === 'BLQ' ? 'pelo ' : 'pela ') + nomeAtr(k);
  const bonusDeComando = (valor, cmd) => (cmd && cmd.atr && Number.isFinite(Number(valor)) ? Math.max(-20, Math.min(20, Math.floor(Number(valor) / Math.max(1, cmd.div || 1)))) : null);
  function normLista(l, comNumeros) {
    const out = [], vistos = new Set();
    for (const x of Array.isArray(l) ? l : []) {
      if (!ehObj(x) || out.length >= MAX.lista || !idOk(x.id) || vistos.has(x.id)) continue;
      vistos.add(x.id);
      const nome = linha(x.nome, MAX.nome) || (comNumeros ? 'Equipamento' : 'Suprimento');
      out.push(comNumeros ? { id: x.id, nome, atq: inteiro(x.atq, -MAX.atr, MAX.atr, 0), def: inteiro(x.def, -MAX.atr, MAX.atr, 0) } : { id: x.id, nome, desc: linha(x.desc, MAX.det) });
    }
    return out;
  }
  /* as listas que valem: as do mestre (uma lista vazia é vazia mesmo) ou, sem elas, as de começo */
  function normCfg(cfg) {
    const t = ehObj(cfg) && ehObj(cfg.tropas) ? cfg.tropas : {};
    const vb = ehObj(t.vet) ? t.vet : VET_BONUS_PADRAO;
    const cm = ehObj(t.cmd) ? t.cmd : CMD_PADRAO;
    return {
      equip: Array.isArray(t.equip) ? normLista(t.equip, true) : EQUIP_PADRAO.map(x => Object.assign({}, x)),
      supr: Array.isArray(t.supr) ? normLista(t.supr, false) : SUPR_PADRAO.map(x => Object.assign({}, x)),
      vet: { 2: inteiro(vb[2], 0, MAX.bonus, VET_BONUS_PADRAO[2]), 3: inteiro(vb[3], 0, MAX.bonus, VET_BONUS_PADRAO[3]) },
      maxEquip: inteiro(t.maxEquip, 1, MAX.equipUnid, MAX_EQUIP_PADRAO),
      cmd: { atr: cm.atr === '' ? '' : ATR_CMD.some(x => x[0] === cm.atr) ? cm.atr : CMD_PADRAO.atr, div: inteiro(cm.div, 1, 10, CMD_PADRAO.div) },
    };
  }
  let seq = 0;
  const novoId = pre => pre + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + ((seq = (seq + 1) % 1296)).toString(36);

  /* ---------------- o brasão (o do montador do clã: forma, divisão, duas cores, símbolo — sem imagem) ---------------- */
  const CN = () => (typeof window !== 'undefined' && window.ClaNucleo) || CN_NODE;
  const CN_NODE = typeof module === 'object' && module && typeof require === 'function' ? (() => { try { return require('../cla/nucleo.js'); } catch (e) { return null; } })() : null;
  // (sem o ClaNucleo: as mesmas listas de lá — lote 45: mais formas e divisões)
  const FORMAS_ID = ['escudo', 'redondo', 'losango', 'estandarte', 'flamula', 'bandeira', 'cauda', 'gonfalao', 'pendao', 'oval', 'hexagono', 'triangular'],
    DIVS_ID = ['liso', 'partido', 'cortado', 'esquartelado', 'faixa', 'contrafaixa', 'pala', 'travessa', 'cruz', 'aspa', 'asna', 'chefe', 'base', 'ondado', 'gironado', 'xadrez'];
  function normBras(b) {
    if (!ehObj(b)) return null;
    const c = CN();
    if (c && c.normBrasao) { const x = c.normBrasao(b); return { forma: x.forma, div: x.div, cores: x.cores.slice(0, 2), simb: x.simb || null }; }
    const cores = Array.isArray(b.cores) ? b.cores.map(corOk) : [];
    return { forma: FORMAS_ID.includes(b.forma) ? b.forma : 'escudo', div: DIVS_ID.includes(b.div) ? b.div : 'partido', cores: [cores[0] || '#24305e', cores[1] || '#d9a441'], simb: idOk(b.simb) ? b.simb : null };
  }
  // o brasão de começo de uma unidade (as cores mudam de uma para a outra)
  const PALETA = ['#24305e', '#d9a441', '#8a2a2a', '#2f6b45', '#5b3f8a', '#c9ccd4', '#1b1b22', '#b8873e', '#3f7fbf', '#e8eaf0', '#7a3b1f', '#5f7f2a'];
  function brasNovo(i) {
    const n = Math.max(0, Math.trunc(Number(i) || 0));
    return { forma: 'escudo', div: DIVS_ID[(n + 1) % 5], cores: [PALETA[(n * 2) % 12], PALETA[(n * 2 + 1) % 12]], simb: ['espada', 'lua', 'torre', 'estrela', 'lobo', 'coroa'][n % 6] };
  }

  /* ---------------- a tropa ---------------- */
  // as chaves que são do jogador (o resto é do mestre). A conta do banco (privado.tropas_mestre) tira as mesmas.
  const TOPO_JOGADOR = ['nome', 'bras', 'info'];
  const UNID_JOGADOR = ['nome', 'raca', 'racaN', 'classe', 'classeN', 'bras', 'equip', 'supr', 'info', 'sold'];
  const listaDeIds = (l, max) => { const out = []; for (const x of Array.isArray(l) ? l : []) if (idOk(x) && !out.includes(x) && out.length < max) out.push(x); return out; };
  function normSuprQ(v) {
    const out = {};
    for (const k of ehObj(v) ? Object.keys(v).slice(0, MAX.lista * 2) : []) { const n = inteiro(v[k], 0, MAX.suprQ, 0); if (idOk(k) && n) out[k] = n; }
    return out;
  }
  /* (lote 42) os soldados com nome de uma unidade (os que importam: não precisa ser um por tropa), até 50: { id, nome,
     raca, racaN, classe, classeN } — a raça e a classe como as da unidade (a árvore da mesa, ou o nome) */
  function normSold(l) {
    const out = [], vistos = new Set();
    for (const x of Array.isArray(l) ? l : []) {
      if (!ehObj(x) || out.length >= MAX.sold) continue;
      const nome = linha(x.nome, MAX.nome), racaN = linha(x.racaN, MAX.raca), classeN = linha(x.classeN, MAX.raca), raca = idOk(x.raca) ? x.raca : null, classe = idOk(x.classe) ? x.classe : null;
      if (!nome && !raca && !racaN && !classe && !classeN) continue;
      let id = idOk(x.id) ? x.id : novoId('sd');
      while (vistos.has(id)) id = novoId('sd');
      vistos.add(id);
      out.push({ id, nome: nome || 'Soldado', raca, racaN, classe, classeN });
    }
    return out;
  }
  // as máquinas de cerco de uma unidade (do Mapa-múndi): { tipo: quantas }, sem os zeros
  function normMaq(v) {
    const out = {};
    for (const k of ehObj(v) ? Object.keys(v).slice(0, 80) : []) { const n = inteiro(v[k], 0, 1e4, 0); if (idMapa(k) && n) out[k] = n; }
    return out;
  }
  function normUnid(u, i, vistos) {
    u = ehObj(u) ? u : {};
    let id = idMapa(u.id) ? u.id : 'un_' + i;
    while (vistos.has(id)) id = novoId('un');
    vistos.add(id);
    const tropas = inteiro(u.tropas, 0, MAX.tropas, 100), hpT = inteiro(u.hpT, 1, MAX.hpT, 10);
    const out = {
      id,
      // do mestre
      tropas, cheio: Math.max(tropas, inteiro(u.cheio, 0, MAX.tropas, tropas)), hpT, fer: tropas > 0 ? inteiro(u.fer, 0, hpT - 1, 0) : 0,
      atq: inteiro(u.atq, -MAX.atr, MAX.atr, 0), def: inteiro(u.def, -MAX.atr, MAX.atr, 0), vet: inteiro(u.vet, 1, 3, 1),
      bat: inteiro(u.bat, 0, MAX.bat, 0), baixas: inteiro(u.baixas, 0, MAX.tropas, 0), magos: inteiro(u.magos, 0, MAX.magos, 0), cura: inteiro(u.cura, 0, 100, 0),
      suprQ: normSuprQ(u.suprQ),
      // do jogador
      nome: linha(u.nome, MAX.nome) || 'Unidade ' + (i + 1), raca: idOk(u.raca) ? u.raca : null, racaN: linha(u.racaN, MAX.raca),
      classe: idOk(u.classe) ? u.classe : null, classeN: linha(u.classeN, MAX.raca), bras: normBras(u.bras) || brasNovo(i),
      equip: listaDeIds(u.equip, MAX.equipUnid), supr: listaDeIds(u.supr, MAX.suprUnid), info: textoLongo(u.info, MAX.info), sold: normSold(u.sold),
    };
    if (idMapa(u.tipo)) out.tipo = u.tipo;                   // (o tipo de tropa do Mapa-múndi, quando ligada: guardado como veio)
    if (ehObj(u.maq)) { const m = normMaq(u.maq); if (Object.keys(m).length) out.maq = m; }
    return out;
  }
  const RESULTADOS = { v: 'vitória', d: 'derrota', e: 'empate' };
  const TIPOS_DIARIO = ['form', 'bat', 'vet', 'unid', 'nota'];
  function normDiario(l) {
    const out = [], vistos = new Set();
    for (const e of Array.isArray(l) ? l : []) {
      if (!ehObj(e) || out.length >= MAX.diario) continue;
      const t = linha(e.t, MAX.titulo);
      if (!t) continue;
      let id = idOk(e.id) ? e.id : novoId('dr');
      while (vistos.has(id)) id = novoId('dr');
      vistos.add(id);
      const em = typeof e.em === 'string' && !isNaN(Date.parse(e.em)) ? new Date(e.em).toISOString() : new Date(0).toISOString();
      const x = { id, em, k: TIPOS_DIARIO.includes(e.k) ? e.k : 'nota', t };
      const dj = linha(e.dj, 40); if (dj) x.dj = dj;
      if (RESULTADOS[e.r]) x.r = e.r;
      const b = inteiro(e.b, 0, MAX.tropas, 0); if (b) x.b = b;
      const det = linha(e.x, MAX.det); if (det) x.x = det;
      out.push(x);
    }
    return out;
  }
  /* A tropa: { v, nome, bras, info (do jogador); moral (0–10; 5 é firme), mant (o estoque de mantimentos), cons (o
     consumo por dia; null: pelo tamanho, uma ração por 100 soldados), unid[], diario[] (do mestre) }. null: sem tropa. */
  function norm(d) {
    if (!ehObj(d)) return null;
    const vistos = new Set();
    return Object.assign({
      v: 1, nome: linha(d.nome, MAX.nome) || 'Tropa', bras: normBras(d.bras) || brasNovo(0), info: textoLongo(d.info, MAX.info),
      moral: inteiro(d.moral, 0, 10, 5), mant: inteiro(d.mant, 0, MAX.mant, 0), cons: d.cons == null || d.cons === '' ? null : inteiro(d.cons, 1, MAX.tropas, null),
      unid: (Array.isArray(d.unid) ? d.unid : []).slice(0, MAX.unid).map((u, i) => normUnid(u, i, vistos)),
      diario: normDiario(d.diario),
    }, ehObj(d.lig) && normLig(d.lig) ? { lig: normLig(d.lig) } : {}, idOk(d.cla) ? { cla: d.cla } : {});      // (lote 42) cla: o clã da tropa
  }
  /* (lote 41) A ligação com um exército do Mapa-múndi (quem escreve é o Mapa-múndi de quem mestra): { mapa (o id), mn
     (o nome do mapa), g (o id do grupo), nome (o do exército), cmd (a ficha do comandante), auto (o bônus de comando
     pela ficha) } */
  function normLig(l) {
    if (!ehObj(l) || !idMapa(l.mapa) || !idMapa(l.g)) return null;
    const x = { mapa: l.mapa, g: l.g, nome: linha(l.nome, 80), mn: linha(l.mn, 80) };
    if (idMapa(l.cmd)) x.cmd = l.cmd;
    if (l.auto === true) x.auto = true;
    return x;
  }
  /* A parte do mestre (o que o jogador não pode mudar): a tropa sem as chaves do jogador. É a mesma conta do banco. */
  function parteMestre(d) {
    const x = ehObj(d) ? Object.assign({}, d) : {};
    for (const k of TOPO_JOGADOR) delete x[k];
    x.unid = (Array.isArray(x.unid) ? x.unid : []).map(u => { const y = ehObj(u) ? Object.assign({}, u) : u; if (ehObj(y)) for (const k of UNID_JOGADOR) delete y[k]; return y; });
    return x;
  }
  /* As escolhas do jogador numa tropa crua (sem mexer no resto: o banco confere que a parte do mestre ficou igual).
     esc = { nome?, bras?, info? } para a tropa, ou, com unidId, { nome, raca, racaN, classe, classeN, bras, equip, supr, info }. */
  function comEscolhas(cru, unidId, esc) {
    const d = JSON.parse(JSON.stringify(ehObj(cru) ? cru : {}));
    esc = ehObj(esc) ? esc : {};
    if (!unidId) {
      if ('nome' in esc) d.nome = linha(esc.nome, MAX.nome) || 'Tropa';
      if ('bras' in esc) d.bras = normBras(esc.bras) || brasNovo(0);
      if ('info' in esc) d.info = textoLongo(esc.info, MAX.info);
      return d;
    }
    const u = (Array.isArray(d.unid) ? d.unid : []).find(x => ehObj(x) && x.id === unidId);
    if (!u) return null;
    const i = d.unid.indexOf(u);
    if ('nome' in esc) u.nome = linha(esc.nome, MAX.nome) || 'Unidade ' + (i + 1);
    if ('raca' in esc) u.raca = idOk(esc.raca) ? esc.raca : null;
    if ('racaN' in esc) u.racaN = linha(esc.racaN, MAX.raca);
    if ('classe' in esc) u.classe = idOk(esc.classe) ? esc.classe : null;
    if ('classeN' in esc) u.classeN = linha(esc.classeN, MAX.raca);
    if ('bras' in esc) u.bras = normBras(esc.bras) || brasNovo(i);
    if ('equip' in esc) u.equip = listaDeIds(esc.equip, MAX.equipUnid);
    if ('supr' in esc) u.supr = listaDeIds(esc.supr, MAX.suprUnid);
    if ('info' in esc) u.info = textoLongo(esc.info, MAX.info);
    if ('sold' in esc) u.sold = normSold(esc.sold);
    return d;
  }
  // (lote 42) a raça e a classe de um soldado ("Humano Guerreiro")
  const quemESold = (x, bib) => [nomeDaArvore(bib, x.raca) || x.racaN || '', nomeDaArvore(bib, x.classe) || x.classeN || ''].filter(Boolean).join(' ');
  const escolhasDaUnid = u => { const o = {}; for (const k of UNID_JOGADOR) o[k] = JSON.parse(JSON.stringify(u[k] === undefined ? null : u[k])); return o; };
  const escolhasDaTropa = d => { const o = {}; for (const k of TOPO_JOGADOR) o[k] = JSON.parse(JSON.stringify(d[k] === undefined ? null : d[k])); return o; };

  // uma tropa nova (o mestre cria): uma unidade de recrutas, e a primeira linha do diário
  function nova(nomePc, quando, dataJogo) {
    const d = norm({ nome: nomePc ? 'Guarda de ' + linha(nomePc, MAX.nome - 9) : 'Tropa', bras: brasNovo(0), moral: 5, mant: 0, unid: [unidadeNova(0)], diario: [] });
    d.diario = normDiario([{ k: 'form', t: 'A tropa foi formada.', em: quando || new Date().toISOString(), dj: dataJogo || '' }]);
    return d;
  }
  function unidadeNova(i) {
    return normUnid({ id: novoId('un'), nome: 'Unidade ' + (i + 1), tropas: 100, cheio: 100, hpT: 10, vet: 1, bras: brasNovo(i) }, i, new Set());
  }

  /* ---------------- as contas ---------------- */
  const nomeDaArvore = (bib, id) => { const a = id && ehObj(bib) && Array.isArray(bib.arvores) ? bib.arvores.find(x => x && x.id === id) : null; return a ? linha(a.nome, MAX.raca) : ''; };
  // a raça e a classe de uma unidade: o nome da árvore da mesa (ou o nome guardado, quando a árvore sumiu)
  const racaDe = (u, bib) => nomeDaArvore(bib, u.raca) || u.racaN || '';
  const classeDe = (u, bib) => nomeDaArvore(bib, u.classe) || u.classeN || '';
  // as árvores que dá para escolher: as da categoria (raca, classe), por nome
  function arvoresDe(bib, cat) {
    return (ehObj(bib) && Array.isArray(bib.arvores) ? bib.arvores : []).filter(a => a && idOk(a.id) && a.categoria === cat)
      .map(a => ({ id: a.id, nome: linha(a.nome, MAX.raca) || 'Árvore' })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  /* Uma unidade, com as contas: hp e hpCheio (as tropas inteiras do efetivo completo), o bônus dos equipamentos e da
     veterania, o ATQ e a DEF que valem, os equipamentos e os suprimentos (os da lista do mestre que ainda existem). */
  function contaUnid(u, cf) {
    const eqs = u.equip.map(id => cf.equip.find(e => e.id === id)).filter(Boolean);
    const sps = u.supr.map(id => cf.supr.find(s => s.id === id)).filter(Boolean).map(s => Object.assign({ q: u.suprQ[s.id] || 0 }, s));
    const eqAtq = eqs.reduce((s, e) => s + e.atq, 0), eqDef = eqs.reduce((s, e) => s + e.def, 0), vb = u.vet > 1 ? cf.vet[u.vet] || 0 : 0;
    const hp = Math.max(0, u.tropas * u.hpT - u.fer), hpCheio = Math.max(u.cheio, u.tropas) * u.hpT;
    return { u, eqs, sps, eqAtq, eqDef, vb, atq: u.atq + eqAtq + vb, def: u.def + eqDef + vb, hp, hpCheio, desfalque: u.tropas < u.cheio, vazia: u.tropas <= 0, nomeVet: nomeVet(u.vet) };
  }
  /* A tropa inteira: { tropas, unidades (com soldados), vetMedia (a média das unidades com soldados; com uma casa),
     vetN (1–3) e vetNome, consumo (por dia), dias (de mantimentos; null sem consumo), cartas[] (contaUnid de cada uma) } */
  function calc(d, cfg) {
    const x = norm(d);
    if (!x) return null;
    const cf = normCfg(cfg), cartas = x.unid.map(u => contaUnid(u, cf));
    const vivas = x.unid.filter(u => u.tropas > 0), tropas = vivas.reduce((s, u) => s + u.tropas, 0);
    const base = vivas.length ? vivas : x.unid;
    const vetMedia = base.length ? Math.round(base.reduce((s, u) => s + u.vet, 0) / base.length * 10) / 10 : null;
    const consumo = x.cons != null ? x.cons : tropas > 0 ? Math.ceil(tropas / 100) : 0;
    return { d: x, cf, cartas, tropas, unidades: vivas.length, vetMedia, vetN: vetDaMedia(vetMedia), vetNome: vetMedia == null ? '' : nomeVet(vetDaMedia(vetMedia)), consumo, dias: consumo > 0 ? Math.floor(x.mant / consumo) : null };
  }
  /* Uma batalha registrada pelo mestre: as baixas de cada unidade ({ id: quantas }) saem das tropas; cada unidade que
     tinha soldados ganha uma batalha; uma linha no diário. → a tropa nova (normalizada) */
  function registrarBatalha(d, bat, quando, dataJogo) {
    const x = norm(d);
    if (!x || !ehObj(bat)) return x;
    const bx = ehObj(bat.baixas) ? bat.baixas : {}, partes = [];
    let total = 0;
    for (const u of x.unid) {
      if (u.tropas <= 0) continue;
      const n = Math.min(u.tropas, inteiro(bx[u.id], 0, MAX.tropas, 0));
      u.bat = Math.min(MAX.bat, u.bat + 1);
      if (n) { u.tropas -= n; u.baixas = Math.min(MAX.tropas, u.baixas + n); total += n; partes.push(u.nome + ' −' + n); if (u.tropas <= 0) u.fer = 0; }
    }
    if (bat.moral != null && bat.moral !== '') x.moral = inteiro(bat.moral, 0, 10, x.moral);
    x.diario = normDiario([{ k: 'bat', t: linha(bat.t, MAX.titulo) || 'Batalha', r: RESULTADOS[bat.r] ? bat.r : undefined, b: total, x: partes.join(' · '), em: quando || new Date().toISOString(), dj: dataJogo || '' }].concat(x.diario));
    return x;
  }
  // uma linha nova no diário (no alto)
  function noDiario(d, e, quando, dataJogo) {
    const x = norm(d);
    if (!x) return x;
    x.diario = normDiario([Object.assign({}, e, { em: quando || new Date().toISOString(), dj: dataJogo || '' })].concat(x.diario));
    return x;
  }

  /* ---------------- (lote 41) a mesma tropa no Mapa-múndi ----------------
     Ligada a um exército (o grupo do tipo Exército: g.exe), a tropa da ficha e o exército são a mesma: o que é comum —
     o nome, a moral, os mantimentos, o consumo e, de cada unidade (pelo id), o nome, o tipo, as tropas, o HP de cada
     soldado, a ferida, o ATQ, a DEF, os magos, a cura, as máquinas, a veterania e os equipamentos (os da ficha, que o
     jogador escolhe, viram os do mapa) — muda nos dois. O que é só da ficha (a raça, a classe, o brasão, os
     suprimentos e as quantidades, as informações, o efetivo completo, as batalhas e as baixas, o diário) e o que é só
     do mapa (a fome, o comandante, os heróis, a unidade escondida) fica onde está. Quem faz as contas e grava é o
     Mapa-múndi de quem mestra (mundo/mundo.js). */
  const equipDoMapa = (ids, cf) => ids.map(id => cf.equip.find(e => e.id === id)).filter(Boolean).map(e => ({ nome: e.nome, atq: e.atq, def: e.def }));
  const unidComum = u => ({ id: u.id, nome: u.nome, tipo: u.tipo || null, tropas: u.tropas, hpT: u.hpT, fer: u.fer, atq: u.atq, def: u.def, magos: u.magos, cura: u.cura, maq: u.maq || {}, vet: u.vet, equip: u.equip });
  function comumDaTropa(d, cfg) {
    const x = norm(d);
    if (!x) return null;
    const cf = normCfg(cfg);
    return { nome: x.nome, moral: x.moral, mant: x.mant, cons: x.cons, unid: x.unid.map(u => unidComum(Object.assign({}, u, { equip: equipDoMapa(u.equip, cf) }))) };
  }
  function comumDoExe(g) {
    const e = ehObj(g) && ehObj(g.exe) && !g.exe.pub ? g.exe : null;
    if (!e) return null;
    // (a mesma régua da ficha: o que ela não guarda não conta — o nome até 60 letras, os números nos limites dela)
    const x = norm({ nome: g.nome, moral: e.moral, mant: e.mant, cons: e.cons, unid: (Array.isArray(e.unid) ? e.unid : []).map(u => Object.assign({}, u, { equip: [] })) });
    return { nome: x.nome, moral: x.moral, mant: x.mant, cons: x.cons, unid: x.unid.map((u, i) => unidComum(Object.assign({}, u, {
      equip: (Array.isArray(e.unid[i] && e.unid[i].equip) ? e.unid[i].equip : []).filter(ehObj).slice(0, 12).map(q => ({ nome: linha(q.nome, 80) || 'Equipamento', atq: inteiro(q.atq, -MAX.atr, MAX.atr, 0), def: inteiro(q.def, -MAX.atr, MAX.atr, 0) })) }))) };
  }
  const iguais = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  /* A tropa da ficha como o exército está agora (o mapa mudou): as unidades do mapa, na ordem dele; a unidade que já
     existia guarda o que é só da ficha; a nova (criada no mapa) nasce com o efetivo cheio e com os equipamentos da lista
     que têm o nome dos dela. lig: a ligação (o mapa, o exército). → a tropa nova (normalizada) */
  function tropaComExe(cru, g, lig, cfg) {
    const c = comumDoExe(g);
    if (!c) return norm(cru);
    const cf = normCfg(cfg), base = norm(cru) || norm({ nome: c.nome, unid: [], diario: [] }), velhas = new Map(base.unid.map(u => [u.id, u]));
    const unid = c.unid.map((x, i) => {
      const v = velhas.get(x.id), u = Object.assign({}, v || { cheio: x.tropas, bras: brasNovo(i), supr: [], info: '' }, x);
      u.equip = v ? v.equip : x.equip.map(q => (cf.equip.find(e => e.nome === q.nome) || {}).id).filter(Boolean);
      if (v) { u.raca = v.raca; u.racaN = v.racaN; u.classe = v.classe; u.classeN = v.classeN; }
      return u;
    });
    return norm(Object.assign({}, base, { nome: c.nome, moral: c.moral, mant: c.mant, cons: c.cons, unid, lig: lig || base.lig }));
  }
  /* O exército como a tropa da ficha está agora (a ficha mudou): o nome, a moral, os mantimentos e as unidades (cada uma
     guarda o que é só do mapa). → o grupo novo (o Mapa-múndi normaliza) */
  function exeComTropa(g, cru, cfg) {
    const c = comumDaTropa(cru, cfg);
    if (!c || !ehObj(g) || !ehObj(g.exe) || g.exe.pub) return g;
    const velhas = new Map((Array.isArray(g.exe.unid) ? g.exe.unid : []).filter(ehObj).map(u => [u.id, u]));
    const unid = c.unid.map(x => { const u = Object.assign({}, velhas.get(x.id) || {}, x); if (!(u.vet > 1)) delete u.vet; return u; });
    return Object.assign({}, g, { nome: c.nome, exe: Object.assign({}, g.exe, { moral: c.moral, mant: c.mant, cons: c.cons, unid }) });
  }
  // a ficha e o exército já são a mesma tropa?
  const mesmaTropa = (cru, g, cfg) => { const a = comumDaTropa(cru, cfg), b = comumDoExe(g); return !!a && !!b && iguais(a, b); };
  /* Uma batalha do Mapa-múndi na tropa ligada: { t (o nome), r ('v' | 'd' | 'e', para este lado), lutaram [ids],
     perdas { id: quantas }, acabaram [nomes] }: cada unidade que lutou ganha uma batalha e as baixas; uma linha no diário. */
  function comBatalhaDoMapa(cru, b, quando, dataJogo) {
    const x = norm(cru);
    if (!x || !ehObj(b)) return x;
    const lutaram = Array.isArray(b.lutaram) ? b.lutaram : [], perdas = ehObj(b.perdas) ? b.perdas : {}, partes = [];
    let total = 0;
    for (const u of x.unid) {
      if (!lutaram.includes(u.id)) continue;
      u.bat = Math.min(MAX.bat, u.bat + 1);
      const n = inteiro(perdas[u.id], 0, MAX.tropas, 0);
      if (n) { u.baixas = Math.min(MAX.tropas, u.baixas + n); total += n; partes.push(u.nome + ' −' + n); }
    }
    for (const nome of Array.isArray(b.acabaram) ? b.acabaram : []) { const nm = linha(nome, MAX.nome); if (nm) partes.push(nm + ' foi destruída'); }
    for (const id of Object.keys(perdas)) if (!x.unid.some(u => u.id === id) && lutaram.includes(id)) total += inteiro(perdas[id], 0, MAX.tropas, 0);
    const id = typeof b.id === 'string' ? b.id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) : '';
    x.diario = normDiario([{ id: id || undefined, k: 'bat', t: linha(b.t, MAX.titulo) || 'Batalha', r: RESULTADOS[b.r] ? b.r : undefined, b: total, x: partes.join(' · '), em: quando || new Date().toISOString(), dj: dataJogo || '' }].concat(x.diario.filter(e => !id || e.id !== id)));
    return x;
  }

  const api = { PRE, docId, pcDoDoc, MAX, VET, nomeVet, vetDaMedia, fmtMedia, EQUIP_PADRAO, SUPR_PADRAO, VET_BONUS_PADRAO, MAX_EQUIP_PADRAO, RESULTADOS,
    TOPO_JOGADOR, UNID_JOGADOR, normCfg, normLista, normBras, brasNovo, norm, normUnid, normDiario, parteMestre, comEscolhas, escolhasDaUnid, escolhasDaTropa,
    nova, unidadeNova, novoId, racaDe, classeDe, arvoresDe, contaUnid, calc, registrarBatalha, noDiario,
    normSold, quemESold, ATR_CMD, CMD_PADRAO, nomeAtr, peloAtr, bonusDeComando, normLig, comumDaTropa, comumDoExe, tropaComExe, exeComTropa, mesmaTropa, comBatalhaDoMapa, idMapa };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.TC = window.TC || {}; window.TC.tropas = api; }
})();
