/* Tiny Cats · Clã: a lógica pura (sem página, sem DOM). Roda igual no navegador (window.ClaNucleo) e no Node (testes).
   Os documentos da mesa (ver supabase/migrations/0018_cla.sql):
     cla:c:<id>    o clã inteiro (só quem mestra o Clã lê e escreve)
     cla:pub:<id>  o que a mesa vê dele — montado pelo banco a cada mudança no clã; aqui, projetar() faz a mesma conta
                   (para a página aberta sozinha e para os testes conferirem que as duas contas batem)
     cla:nomes     os nomes dos níveis das três escalas (de −5 a +5)
   Um clã: o nome, o lema, o brasão, a facção do Mapa-múndi (uma referência, opcional), se é o clã dos jogadores, o que os
   jogadores veem dele (no de NPC, parte por parte), a árvore de cargos (o líder no alto; cada cargo com uma ou mais
   pessoas, cada uma com o seu respeito dentro do clã), as construções, os recursos, o respeito no mundo, as relações com
   as facções e com os outros clãs, e o histórico. */
(() => {
  'use strict';

  /* ---------------- catálogos ---------------- */
  // os nomes de começo dos níveis, de −5 a +5 (o mestre renomeia: valem para a mesa toda)
  const ESCALAS = {
    mundo: ['Execrado', 'Odiado', 'Temido', 'Malvisto', 'Desconfiado', 'Desconhecido', 'Notado', 'Respeitado', 'Admirado', 'Honrado', 'Lendário'],
    rel: ['Inimigo mortal', 'Hostil', 'Rival', 'Tenso', 'Frio', 'Neutro', 'Cordial', 'Amigável', 'Parceiro', 'Aliado', 'Irmão de armas'],
    membro: ['Traidor', 'Desonrado', 'Suspeito', 'Malvisto', 'Questionado', 'Membro', 'Confiável', 'Respeitado', 'Estimado', 'Honrado', 'Venerado'],
  };
  const ESCALA_NOME = { mundo: 'Respeito no mundo', rel: 'Relações', membro: 'Respeito dos membros' };
  // as partes de um clã que o mestre mostra (ou não) aos jogadores, num clã de NPC
  const PARTES = [['cargos', 'Cargos e quem ocupa'], ['construcoes', 'Construções'], ['recursos', 'Recursos'], ['respeito', 'Respeito no mundo'], ['relacoes', 'Relações'], ['hist', 'Histórico']];
  const PARTE_NOME = Object.fromEntries(PARTES);
  // o brasão: a forma (numa caixa de 100×120), a divisão, duas cores e um símbolo — ou uma imagem
  const FORMAS = [
    ['escudo', 'Escudo', 'M6 6H94V58C94 92 50 114 50 114C50 114 6 92 6 58Z'],
    ['redondo', 'Redondo', 'M6 60A44 44 0 1 0 94 60A44 44 0 1 0 6 60Z'],
    ['losango', 'Losango', 'M50 4L96 60L50 116L4 60Z'],
    ['estandarte', 'Estandarte', 'M10 4H90V116L50 92L10 116Z'],
    ['flamula', 'Flâmula', 'M4 18L96 60L4 102Z'],
  ].map(([id, nome, d]) => ({ id, nome, d }));
  const DIVISOES = [['liso', 'Liso'], ['partido', 'Partido'], ['cortado', 'Cortado'], ['esquartelado', 'Esquartelado'], ['faixa', 'Faixa']];
  const CORES = ['#24305e', '#d9a441', '#8a2a2a', '#2f6b45', '#5b3f8a', '#c9ccd4', '#1b1b22', '#b8873e', '#3f7fbf', '#e8eaf0', '#7a3b1f', '#5f7f2a'];
  // símbolos do brasão além dos da Meditação (traços numa caixa de 24×24)
  const SIMB_EXTRA = [
    ['torre', 'Torre', 'M7 21V8h2V5h2v3h2V5h2v3h2v13zM5 21h14M10.5 21v-4h3v4M10.5 12h3'],
    ['machado', 'Machado', 'M6 21 15 8M13 4c3.5 0 6.5 2.5 7 6-3 0-5.5-1-7-3M13 4l2 4'],
    ['ancora', 'Âncora', 'M12 3a2 2 0 1 1 0 4 2 2 0 1 1 0-4M12 7v14M8 11h8M4 14c0 4 3.6 7 8 7s8-3 8-7'],
    ['martelo', 'Martelo', 'M5 21l9-9M12 4l8 8-3 3-8-8zM9 7l3-3'],
    ['arco', 'Arco', 'M6 3c7 3 10 9 9 18M6 3l9 18M3 9l9-1 1-5'],
    ['caveira', 'Caveira', 'M12 3c-4.4 0-8 3.1-8 7.5 0 2.5 1.2 4.1 3 5.2V19h10v-3.3c1.8-1.1 3-2.7 3-5.2C20 6.1 16.4 3 12 3zM9 11h.01M15 11h.01M10 19v2M14 19v2'],
    ['chama', 'Chama', 'M12 3c1.8 2.8 5 5.2 5 9.2a5 5 0 0 1-10 0c0-2.2 1.1-3.8 2.2-4.8.2 1.8 1 2.8 2.1 3 .2-2.8-.2-4.8.7-7.4z'],
    ['punho', 'Punho', 'M7 11V7a1.5 1.5 0 0 1 3 0v3M10 10V6a1.5 1.5 0 0 1 3 0v4M13 10V7a1.5 1.5 0 0 1 3 0v4M16 11V9a1.5 1.5 0 0 1 3 0v4c0 4-2.5 7-6.5 7S7 18 7 14v-3a1.5 1.5 0 0 1-2.5-1'],
  ].map(([id, nome, d]) => ({ id, nome, d }));
  // os ícones das construções
  const ICONES = [
    ['salao', 'Salão', 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6'],
    ['forja', 'Forja', 'M3 8h13c0 2.5 2 4 5 4v1h-6c-1.5 0-2.5 1-2.5 2.5V17h3v3H8v-3h3v-1.5C11 13.5 9.5 12 7 12c-2.2 0-4-1.8-4-4z'],
    ['torre', 'Torre', 'M8 21V9l4-5 4 5v12M6 21h12M10 13h4'],
    ['muralha', 'Muralha', 'M3 21V8h3v3h3V8h3v3h3V8h3v3h3V8v13zM10 21v-4h4v4'],
    ['templo', 'Templo', 'M3 21h18M5 21V11M9 21V11M15 21V11M19 21V11M3 11h18L12 4z'],
    ['biblioteca', 'Biblioteca', 'M4 5c3-1.5 5.5-1.5 8 0v14c-2.5-1.5-5-1.5-8 0zM12 5c2.5-1.5 5-1.5 8 0v14c-3-1.5-5.5-1.5-8 0'],
    ['quartel', 'Quartel', 'M4 4l11 11M20 4 9 15M6.5 16.5l-3 3M17.5 16.5l3 3M7 13l4 4M17 13l-4 4'],
    ['mercado', 'Mercado', 'M3 10l2-6h14l2 6M3 10h18M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 13v8h14v-8M10 21v-5h4v5'],
    ['estabulo', 'Estábulo', 'M6 4v8a6 6 0 0 0 12 0V4M6 4h3M15 4h3M6 9h2M16 9h2'],
    ['celeiro', 'Celeiro', 'M3 21V10l9-6 9 6v11zM8 21v-6h8v6M8 15l8 6M16 15l-8 6'],
    ['porto', 'Porto', 'M12 3a2 2 0 1 1 0 4 2 2 0 1 1 0-4M12 7v14M8 11h8M4 14c0 4 3.6 7 8 7s8-3 8-7'],
    ['mina', 'Mina', 'M3 8c5-4 13-4 18 0M12 5.5 5 21'],
    ['oficina', 'Oficina', 'M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1'],
    ['jardim', 'Jardim', 'M12 21v-8M12 13c0-4 2.5-7 7-7 0 4.5-3 7-7 7zM12 15c0-3-2-5.5-6-5.5 0 3.5 2.5 5.5 6 5.5zM7 21h10'],
    ['poco', 'Poço', 'M5 10h14M7 10V6h10v4M6 10v11h12V10M12 6V3M12 13v4'],
  ].map(([id, nome, d]) => ({ id, nome, d }));

  const MAX = {
    clas: 40, nome: 60, lema: 160, nomeCargo: 60, nomePessoa: 60, cargos: 60, gente: 30, construcoes: 40, nomeCons: 60,
    efeito: 1000, nivel: 99, custo: 8, recursos: 40, nomeRec: 40, qtd: 1000000000, relacoes: 60, motivo: 200,
    hist: 300, rhist: 200, txt: 300, nomeNivel: 30,
  };
  const JANELA = 60000;          // mudanças seguidas na mesma coisa, dentro de um minuto, viram uma linha só do histórico

  /* ---------------- apoio ---------------- */
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const tem = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  const copia = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
  function texto(v, max) {
    let s = typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
    s = s.replace(/\r\n?/g, '\n');
    if (s.length > max) { s = s.slice(0, max); if (/[\ud800-\udbff]$/.test(s)) s = s.slice(0, -1); }
    return s;
  }
  const linha = (v, max) => texto(texto(v, max * 4).replace(/\s+/g, ' ').trim(), max).trim();
  // o mesmo que o banco aceita num id de clã, de cargo, de pessoa (e nos outros ids daqui)
  const idOk = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) && v !== '__proto__' ? v : '');
  const pcOk = v => (typeof v === 'string' && v.length >= 1 && v.length <= 64 && !/[:@\s]/.test(v) && v !== '__proto__' ? v : '');
  const urlOk = v => (typeof v === 'string' && ((v.length <= 600 && /^https:\/\/[^\s"'<>]+$/i.test(v))
    || (v.length <= 3000000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v))) ? v : null);
  const corOk = v => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null);
  const instante = v => (typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v)) ? v : null);
  const inteiro = (v, def, min, max) => { const n = Number(v); return v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : def; };
  const nivel = v => inteiro(v, 0, -5, 5);
  let seq = 0;
  function novoId(pre) { seq = (seq + 1) % 1296; return pre + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + seq.toString(36); }
  function unico(id, vistos, pre) { let r = id || novoId(pre); while (vistos.has(r)) r = novoId(pre); vistos.add(r); return r; }
  const sinal = v => (v > 0 ? '+' + v : v < 0 ? '−' + -v : '0');

  // os símbolos do brasão: os da Meditação (quando ela está carregada) e mais alguns
  const MN = (typeof window !== 'undefined' && window.MeditacaoNucleo)
    || (typeof module === 'object' && module && typeof require === 'function' ? (() => { try { return require('../meditacao/nucleo.js'); } catch (e) { return null; } })() : null);
  const SIMBOLOS = new Map();
  if (MN) {
    for (const g of MN.GRUPOS || []) for (const s of g.itens) SIMBOLOS.set(s.id, { id: s.id, nome: s.nome, d: s.d });
    for (const s of MN.DESENHOS || []) if (!SIMBOLOS.has(s.id)) SIMBOLOS.set(s.id, { id: s.id, nome: s.nome, d: s.d });
  }
  for (const s of SIMB_EXTRA) if (!SIMBOLOS.has(s.id)) SIMBOLOS.set(s.id, s);
  const FORMA = new Map(FORMAS.map(f => [f.id, f])), DIVISAO = Object.fromEntries(DIVISOES), ICONE = new Map(ICONES.map(i => [i.id, i]));

  /* ---------------- os nomes dos níveis ---------------- */
  function normNomes(d) {
    d = ehObj(d) ? d : {};
    const out = { v: 1 };
    for (const esc of Object.keys(ESCALAS)) {
      const l = Array.isArray(d[esc]) ? d[esc] : [];
      out[esc] = ESCALAS[esc].map((def, i) => linha(l[i], MAX.nomeNivel) || def);
    }
    return out;
  }
  const nomeNivel = (nomes, esc, v) => normNomes(nomes)[esc][nivel(v) + 5];
  const nivelTxt = (nomes, esc, v) => sinal(nivel(v)) + ' · ' + nomeNivel(nomes, esc, v);

  /* ---------------- o brasão ---------------- */
  function normBrasao(b) {
    b = ehObj(b) ? b : {};
    const cores = Array.isArray(b.cores) ? b.cores.map(corOk) : [];
    return { forma: FORMA.has(b.forma) ? b.forma : 'escudo', div: tem(DIVISAO, b.div) ? b.div : 'partido',
      cores: [cores[0] || CORES[0], cores[1] || CORES[1]], simb: SIMBOLOS.has(b.simb) ? b.simb : null, img: urlOk(b.img) };
  }
  // o brasão de um clã novo: as cores mudam de um clã para o outro
  function brasaoNovo(i) {
    const n = Math.max(0, Math.trunc(Number(i) || 0)), a = CORES[(n * 2) % CORES.length], b = CORES[(n * 2 + 1) % CORES.length];
    return { forma: 'escudo', div: ['partido', 'cortado', 'esquartelado', 'faixa', 'liso'][n % 5], cores: [a, b], simb: ['lua', 'espada', 'lobo', 'coroa', 'estrela', 'torre'][n % 6], img: null };
  }
  /* O brasão desenhado (um <svg> em texto, só com números e cores conferidos aqui): a forma recortando a divisão nas
     duas cores, o contorno e o símbolo. `sufixo` deixa o id do recorte único na página. */
  function brasaoSvg(b, sufixo) {
    const x = normBrasao(b), f = FORMA.get(x.forma), [c1, c2] = x.cores, id = 'br' + String(sufixo || '0').replace(/[^A-Za-z0-9_-]/g, '');
    const div = {
      liso: `<rect width="100" height="120" fill="${c1}"/>`,
      partido: `<rect width="50" height="120" fill="${c1}"/><rect x="50" width="50" height="120" fill="${c2}"/>`,
      cortado: `<rect width="100" height="60" fill="${c1}"/><rect y="60" width="100" height="60" fill="${c2}"/>`,
      esquartelado: `<rect width="50" height="60" fill="${c1}"/><rect x="50" width="50" height="60" fill="${c2}"/><rect y="60" width="50" height="60" fill="${c2}"/><rect x="50" y="60" width="50" height="60" fill="${c1}"/>`,
      faixa: `<rect width="100" height="120" fill="${c1}"/><path d="M-10 18 18 -10 110 92 82 120Z" fill="${c2}"/>`,
    }[x.div];
    const s = x.simb && SIMBOLOS.get(x.simb);
    // o símbolo claro sobre o fundo escuro (e escuro quando o fundo todo é claro)
    const tinta = (x.div === 'liso' ? claro(c1) : claro(c1) && claro(c2)) ? '#1b1b22' : '#f6efe2';
    const simb = s ? `<g transform="${x.forma === 'flamula' ? 'translate(12 36)' : 'translate(26 28)'} scale(2)" fill="none" stroke="${tinta}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${s.d}"/></g>` : '';
    return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><clipPath id="${id}"><path d="${f.d}"/></clipPath></defs>`
      + `<g clip-path="url(#${id})">${div}${simb}</g><path d="${f.d}" fill="none" stroke="${mistura(c2, '#f3d9a4')}" stroke-width="4"/></svg>`;
  }
  function claro(c) { const n = parseInt(c.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return 0.299 * r + 0.587 * g + 0.114 * b > 150; }
  function mistura(a, b) { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); const m = s => Math.round((((x >> s) & 255) + ((y >> s) & 255)) / 2); return '#' + [16, 8, 0].map(s => m(s).toString(16).padStart(2, '0')).join(''); }

  /* ---------------- os cargos ---------------- */
  function normPessoa(p, vistos, semResp) {
    if (!ehObj(p)) return null;
    const pc = pcOk(p.pc) || null, nome = linha(p.nome, MAX.nomePessoa);
    if (!pc && !nome) return null;
    return { id: unico(idOk(p.id), vistos, 'ps'), pc, nome, resp: semResp ? null : nivel(p.resp) };
  }
  /* { lider: { nome, pai: null, ordem: 0, gente: [uma pessoa, no máximo] }, <id>: { nome, pai, ordem, gente } }.
     A árvore sai inteira: um cargo pendurado num que não existe (ou num ciclo) passa para debaixo do líder; ninguém
     aparece duas vezes. semResp: o clã de NPC, como os jogadores o recebem (sem o respeito de cada um). */
  function normCargos(c, semResp) {
    c = ehObj(c) ? c : {};
    const vistos = new Set(), out = {};
    const li = ehObj(c.lider) ? c.lider : {};
    out.lider = { nome: linha(li.nome, MAX.nomeCargo) || 'Líder', pai: null, ordem: 0,
      gente: (Array.isArray(li.gente) ? li.gente : []).map(p => normPessoa(p, vistos, semResp)).filter(Boolean).slice(0, 1) };
    let n = 0;
    for (const k of Object.keys(c)) {
      if (k === 'lider' || !idOk(k) || !ehObj(c[k]) || n >= MAX.cargos) continue;
      const x = c[k];
      out[k] = { nome: linha(x.nome, MAX.nomeCargo) || 'Cargo', pai: idOk(x.pai) || 'lider', ordem: inteiro(x.ordem, 0, 0, 100000),
        gente: (Array.isArray(x.gente) ? x.gente : []).map(p => normPessoa(p, vistos, semResp)).filter(Boolean).slice(0, MAX.gente) };
      n++;
    }
    for (const k of Object.keys(out)) {
      if (k === 'lider') continue;
      let p = out[k].pai, passos = 0;
      while (p !== 'lider' && out[p] && passos <= MAX.cargos + 1) { p = out[p].pai; passos++; }
      if (p !== 'lider') out[k].pai = 'lider';
    }
    return out;
  }
  // os cargos logo abaixo de um, na ordem (e, empatando, pelo nome)
  function filhos(cargos, pai) {
    return Object.keys(cargos).filter(k => k !== 'lider' && cargos[k].pai === pai)
      .sort((a, b) => cargos[a].ordem - cargos[b].ordem || cargos[a].nome.localeCompare(cargos[b].nome, 'pt-BR') || (a < b ? -1 : a > b ? 1 : 0));
  }
  function descendentes(cargos, id) {
    const out = new Set(), fila = [id];
    while (fila.length) { const x = fila.shift(); for (const f of filhos(cargos, x)) if (!out.has(f)) { out.add(f); fila.push(f); } }
    return out;
  }
  function arvore(cargos) { const c = normCargos(cargos), no = id => ({ id, cargo: c[id], filhos: filhos(c, id).map(no) }); return no('lider'); }
  // todas as pessoas, do líder para baixo: [{ pid, cargo, cargoNome, pessoa }]
  function membros(cargos) {
    const c = normCargos(cargos), out = [];
    const anda = id => { for (const p of c[id].gente) out.push({ pid: p.id, cargo: id, cargoNome: c[id].nome, pessoa: p }); for (const f of filhos(c, id)) anda(f); };
    anda('lider');
    return out;
  }
  const lider = cargos => normCargos(cargos).lider.gente[0] || null;
  const totalCargos = cargos => Object.keys(normCargos(cargos)).length - 1;
  function novoCargo(cargos, pai, nome) {
    const c = normCargos(cargos);
    if (!c[pai] || totalCargos(c) >= MAX.cargos) return null;
    const irmaos = filhos(c, pai), id = unico('', new Set(Object.keys(c)), 'cg');
    c[id] = { nome: linha(nome, MAX.nomeCargo) || 'Cargo novo', pai, ordem: irmaos.length ? c[irmaos[irmaos.length - 1]].ordem + 1 : 0, gente: [] };
    return { cargos: c, id };
  }
  function renomearCargo(cargos, id, nome) {
    const c = normCargos(cargos), n = linha(nome, MAX.nomeCargo);
    if (!c[id] || !n || c[id].nome === n) return null;
    c[id].nome = n;
    return c;
  }
  // põe o cargo debaixo de outro (pai), na posição pos entre os irmãos novos (sem pos: no fim)
  function moverCargo(cargos, id, pai, pos) {
    const c = normCargos(cargos);
    if (id === 'lider' || !c[id] || !c[pai] || pai === id || descendentes(c, id).has(pai)) return null;
    const irmaos = filhos(c, pai).filter(k => k !== id);
    const p = Math.max(0, Math.min(irmaos.length, pos == null ? irmaos.length : Math.trunc(Number(pos)) || 0));
    irmaos.splice(p, 0, id);
    c[id].pai = pai;
    irmaos.forEach((k, i) => { c[k].ordem = i; });
    return c;
  }
  // apagar um cargo: as pessoas dele saem do clã; os cargos de baixo sobem para o lugar dele
  function apagarCargo(cargos, id) {
    const c = normCargos(cargos);
    if (id === 'lider' || !c[id]) return null;
    const pai = c[id].pai, irmaos = filhos(c, pai), pos = irmaos.indexOf(id), meus = filhos(c, id);
    const nova = irmaos.slice(0, pos).concat(meus, irmaos.slice(pos + 1));
    for (const f of meus) c[f].pai = pai;
    delete c[id];
    nova.forEach((k, i) => { c[k].ordem = i; });
    return c;
  }
  // uma pessoa num cargo: um personagem da mesa (pc, com o nome dele de agora) ou só um nome
  function porPessoa(cargos, cargo, p) {
    const c = normCargos(cargos);
    if (!c[cargo] || !ehObj(p)) return null;
    if (c[cargo].gente.length >= (cargo === 'lider' ? 1 : MAX.gente)) return null;
    const pc = pcOk(p.pc) || null, nome = linha(p.nome, MAX.nomePessoa);
    if (!pc && !nome) return null;
    const vistos = new Set(membros(c).map(m => m.pid)), id = unico('', vistos, 'ps');
    c[cargo].gente.push({ id, pc, nome, resp: nivel(p.resp) });
    return { cargos: c, id };
  }
  function tirarPessoa(cargos, cargo, pid) {
    const c = normCargos(cargos);
    if (!c[cargo]) return null;
    const n = c[cargo].gente.length;
    c[cargo].gente = c[cargo].gente.filter(p => p.id !== pid);
    return c[cargo].gente.length === n ? null : c;
  }
  /* Passar a liderança: `nova` é uma pessoa do clã ({ pid }, que sai do cargo dela) ou alguém de fora ({ pc, nome }, que
     começa com respeito 0). O líder de antes vai para o cargo `antigoPara` (ou sai do clã, sem ele). */
  function passarLideranca(cargos, nova, antigoPara) {
    const c = normCargos(cargos), velho = c.lider.gente[0] || null;
    if (!ehObj(nova)) return null;
    let p = null;
    if (nova.pid) {
      if (velho && velho.id === nova.pid) return null;
      for (const k of Object.keys(c)) { const i = c[k].gente.findIndex(x => x.id === nova.pid); if (i >= 0) { p = c[k].gente.splice(i, 1)[0]; break; } }
      if (!p) return null;
    } else {
      const pc = pcOk(nova.pc) || null, nome = linha(nova.nome, MAX.nomePessoa);
      if (!pc && !nome) return null;
      p = { id: unico('', new Set(membros(c).map(m => m.pid)), 'ps'), pc, nome, resp: 0 };
    }
    c.lider.gente = [p];
    if (velho && antigoPara && antigoPara !== 'lider' && c[antigoPara] && c[antigoPara].gente.length < MAX.gente) c[antigoPara].gente.push(velho);
    return c;
  }
  /* O que mudou de uma árvore para a outra, cargo por cargo (o que o líder manda ao banco): { <id>: cargo | null }.
     O cargo de líder e o respeito de cada um ficam de fora (o líder não muda nenhum dos dois). */
  function diffCargos(antes, depois) {
    const a = normCargos(antes), d = normCargos(depois), out = {};
    const sem = x => JSON.stringify(Object.assign({}, x, { gente: x.gente.map(p => ({ id: p.id, pc: p.pc, nome: p.nome })) }));
    for (const k of new Set([...Object.keys(a), ...Object.keys(d)])) {
      if (k === 'lider') continue;
      if (!d[k]) { if (a[k]) out[k] = null; } else if (!a[k] || sem(a[k]) !== sem(d[k])) out[k] = Object.assign({}, d[k], { gente: d[k].gente.map(p => ({ id: p.id, pc: p.pc, nome: p.nome })) });
    }
    return out;
  }
  // aplica um "o que mudou" (como o banco faz: o respeito de quem já estava continua — ou o guardado de quem tinha
  // saído —; quem chega começa no 0)
  function aplicarDiff(cargos, mudar, guardado) {
    const c = normCargos(cargos), resp = new Map([...Object.entries(normGuardado(guardado)), ...membros(c).map(m => [m.pid, m.pessoa.resp])]);
    for (const k of Object.keys(ehObj(mudar) ? mudar : {})) {
      if (k === 'lider' || !idOk(k)) continue;
      if (mudar[k] == null) delete c[k];
      else if (ehObj(mudar[k])) c[k] = Object.assign({}, mudar[k], { gente: (Array.isArray(mudar[k].gente) ? mudar[k].gente : []).map(p => Object.assign({}, p, { resp: resp.has(p && p.id) ? resp.get(p.id) : 0 })) });
    }
    return normCargos(c);
  }

  /* ---------------- construções, recursos, respeito, relações ---------------- */
  function normCusto(l) {
    const out = [];
    for (const x of Array.isArray(l) ? l : []) {
      if (!ehObj(x) || out.length >= MAX.custo || !idOk(x.rec) || out.some(y => y.rec === x.rec)) continue;
      const qtd = inteiro(x.qtd, 0, 0, MAX.qtd);
      if (qtd > 0) out.push({ rec: x.rec, nome: linha(x.nome, MAX.nomeRec), qtd });
    }
    return out;
  }
  function normConstrucoes(l) {
    const out = [], vistos = new Set();
    for (const k of Array.isArray(l) ? l : []) {
      if (!ehObj(k) || out.length >= MAX.construcoes) continue;
      const prox = ehObj(k.prox) ? k.prox : {};
      out.push({ id: unico(idOk(k.id), vistos, 'ct'), nome: linha(k.nome, MAX.nomeCons) || 'Construção', ico: ICONE.has(k.ico) ? k.ico : 'salao',
        nivel: inteiro(k.nivel, 0, 0, MAX.nivel), efeito: texto(k.efeito, MAX.efeito), prox: { custo: normCusto(prox.custo), efeito: texto(prox.efeito, MAX.efeito) } });
    }
    return out;
  }
  function normMud(l) {
    const out = [];
    for (const x of Array.isArray(l) ? l : []) {
      if (!ehObj(x) || out.length >= MAX.custo) continue;
      const d = inteiro(x.d, 0, -MAX.qtd, MAX.qtd);
      if (d) out.push({ rec: idOk(x.rec) || null, n: linha(x.n, MAX.nomeRec) || 'Recurso', d });
    }
    return out;
  }
  function normRecursos(r) {
    r = ehObj(r) ? r : {};
    const lista = [], vistos = new Set();
    for (const x of Array.isArray(r.lista) ? r.lista : []) {
      if (!ehObj(x) || lista.length >= MAX.recursos) continue;
      lista.push({ id: unico(idOk(x.id), vistos, 'rc'), nome: linha(x.nome, MAX.nomeRec) || 'Recurso', qtd: inteiro(x.qtd, 0, 0, MAX.qtd) });
    }
    const hist = [];
    for (const e of Array.isArray(r.hist) ? r.hist : []) {
      if (!ehObj(e) || hist.length >= MAX.rhist) continue;
      const mud = normMud(e.mud);
      if (mud.length) hist.push({ em: instante(e.em), tipo: 'rec', mud, mot: linha(e.mot, MAX.motivo) });
    }
    return { lista, hist };
  }
  function normRespeito(r) {
    r = ehObj(r) ? r : {};
    const hist = [];
    for (const e of Array.isArray(r.hist) ? r.hist : []) {
      if (!ehObj(e) || hist.length >= MAX.rhist) continue;
      hist.push({ em: instante(e.em), tipo: 'resp', de: nivel(e.de), para: nivel(e.para), mot: linha(e.mot, MAX.motivo) });
    }
    return { v: nivel(r.v), hist };
  }
  function normRelacoes(l) {
    const out = [], vistos = new Set();
    for (const r of Array.isArray(l) ? l : []) {
      if (!ehObj(r) || out.length >= MAX.relacoes || (r.tipo !== 'faccao' && r.tipo !== 'cla') || !idOk(r.alvo)) continue;
      if (out.some(x => x.tipo === r.tipo && x.alvo === r.alvo)) continue;
      out.push({ id: unico(idOk(r.id), vistos, 'rl'), tipo: r.tipo, alvo: r.alvo, nome: linha(r.nome, MAX.nome), cor: corOk(r.cor), v: nivel(r.v) });
    }
    return out;
  }
  function normFaccao(f) {
    if (!ehObj(f) || !idOk(f.id)) return null;
    return { id: f.id, nome: linha(f.nome, MAX.nome) || 'Facção', cor: corOk(f.cor) };
  }
  // o histórico do clã: cada linha com o seu tipo (o que a mudança foi), para a página escrever o texto e o banco
  // saber de que parte ela fala
  function normHist(l) {
    const out = [];
    for (const e of Array.isArray(l) ? l : []) {
      if (!ehObj(e) || out.length >= MAX.hist) continue;
      const em = instante(e.em), mot = linha(e.mot, MAX.motivo);
      let x = null;
      if (e.tipo === 'rec') { const mud = normMud(e.mud); if (mud.length) x = { em, tipo: 'rec', mud, mot }; }
      else if (e.tipo === 'cons') x = { em, tipo: 'cons', nome: linha(e.nome, MAX.nomeCons) || 'Construção', nivel: inteiro(e.nivel, 1, 0, MAX.nivel), mud: normMud(e.mud), mot };
      else if (e.tipo === 'resp') x = { em, tipo: 'resp', de: nivel(e.de), para: nivel(e.para), mot };
      else if (e.tipo === 'rel' && (e.alvoTipo === 'cla' || e.alvoTipo === 'faccao') && idOk(e.alvo)) x = { em, tipo: 'rel', alvoTipo: e.alvoTipo, alvo: e.alvo, nome: linha(e.nome, MAX.nome), de: nivel(e.de), para: nivel(e.para), mot };
      else if (e.tipo === 'membro') x = { em, tipo: 'membro', pid: idOk(e.pid) || null, nome: linha(e.nome, MAX.nomePessoa) || 'Alguém', de: nivel(e.de), para: nivel(e.para), mot };
      else if (e.tipo === 'cargo' || e.tipo === 'texto') { const txt = linha(e.txt, MAX.txt); if (txt) x = { em, tipo: e.tipo, txt }; }
      if (x) out.push(x);
    }
    return out;
  }

  /* ---------------- o clã ---------------- */
  function normVer(v) { v = ehObj(v) ? v : {}; const out = { mostrar: v.mostrar === true }; for (const [k] of PARTES) out[k] = v[k] === true; return out; }
  // o respeito de quem saiu dos cargos pela função do líder (o banco guarda: se a pessoa voltar, volta com ele)
  function normGuardado(g) {
    const out = {};
    if (ehObj(g)) for (const k of Object.keys(g).sort().slice(0, 300)) if (idOk(k) && typeof g[k] === 'number' && Number.isFinite(g[k])) out[k] = nivel(g[k]);
    return out;
  }
  function normCla(d) {
    d = ehObj(d) ? d : {};
    return {
      v: 1, nome: linha(d.nome, MAX.nome) || 'Clã sem nome', lema: linha(d.lema, MAX.lema), ordem: inteiro(d.ordem, 0, 0, 100000),
      jogadores: d.jogadores === true, ver: normVer(d.ver), faccao: normFaccao(d.faccao), brasao: normBrasao(d.brasao),
      cargos: normCargos(d.cargos, false), construcoes: normConstrucoes(d.construcoes), recursos: normRecursos(d.recursos),
      respeito: normRespeito(d.respeito), relacoes: normRelacoes(d.relacoes), hist: normHist(d.hist), respGuardado: normGuardado(d.respGuardado),
    };
  }
  function claNovo(nome, i, jogadores) {
    return normCla({ nome: linha(nome, MAX.nome) || 'Clã novo', ordem: Math.max(0, Math.trunc(Number(i) || 0)), jogadores: !!jogadores, brasao: brasaoNovo(i),
      ver: { mostrar: false }, cargos: { lider: { nome: 'Líder', gente: [] } }, recursos: { lista: [], hist: [] }, respeito: { v: 0, hist: [] } });
  }
  // o que a mesa recebe (cla:pub:<id>), já conferido: null se os jogadores não veem o clã
  function normPub(d) {
    if (!ehObj(d) || d.oculto) return null;
    const jog = d.jogadores === true, vr = ehObj(d.ver) ? d.ver : {}, ver = {};
    for (const [k] of PARTES) ver[k] = vr[k] === true;
    return {
      v: 1, id: idOk(d.id), nome: linha(d.nome, MAX.nome) || 'Clã sem nome', lema: linha(d.lema, MAX.lema), ordem: inteiro(d.ordem, 0, 0, 100000),
      jogadores: jog, ver, faccao: normFaccao(d.faccao), brasao: normBrasao(d.brasao),
      cargos: ver.cargos ? normCargos(d.cargos, !jog) : null, construcoes: ver.construcoes ? normConstrucoes(d.construcoes) : null,
      recursos: ver.recursos ? normRecursos(d.recursos) : null, respeito: ver.respeito ? normRespeito(d.respeito) : null,
      relacoes: ver.relacoes ? normRelacoes(d.relacoes) : null, hist: ver.hist ? normHist(d.hist) : null,
    };
  }
  // a vista do mestre (o clã inteiro) com o mesmo jeito da dos jogadores, para as mesmas telas
  function comoVista(cla, id) { const c = normCla(cla), ver = {}; for (const [k] of PARTES) ver[k] = true; return Object.assign(c, { id: idOk(id), ver, verMestre: c.ver }); }

  /* A mesma conta do banco (privado.cla_pub, na 0018): cla e cada um de todos = { id, apagado, ...os dados do clã }.
     Devolve o documento cla:pub:<id> (sem conferir: é o que o banco gravaria). */
  const visivel = c => ehObj(c) && !c.apagado && (c.jogadores === true || (ehObj(c.ver) && c.ver.mostrar === true));
  function histVai(e, ver, jog, vistos) {
    switch (e.tipo) {
      case 'rec': return ver.recursos;
      case 'cons': return ver.construcoes;
      case 'resp': return ver.respeito;
      case 'rel': return ver.relacoes && (e.alvoTipo !== 'cla' || vistos.has(e.alvo));
      case 'cargo': return ver.cargos;
      case 'membro': return jog;
      default: return true;
    }
  }
  function projetar(cla, todos) {
    if (!visivel(cla)) return { v: 1, oculto: true };
    const d = cla, jog = d.jogadores === true, ver = ehObj(d.ver) ? d.ver : {};
    const vistos = new Map((Array.isArray(todos) ? todos : []).filter(visivel).map(c => [c.id, { nome: c.nome == null ? '' : c.nome, cor: ehObj(c.brasao) && Array.isArray(c.brasao.cores) && c.brasao.cores[0] != null ? c.brasao.cores[0] : null }]));
    const pub = { v: 1, id: d.id, jogadores: jog, nome: d.nome == null ? '' : d.nome, lema: d.lema == null ? '' : d.lema, brasao: d.brasao == null ? null : copia(d.brasao),
      faccao: d.faccao == null ? null : copia(d.faccao), ordem: d.ordem == null ? 0 : d.ordem, ver: {} };
    for (const [k] of PARTES) { const p = jog || ver[k] === true; pub.ver[k] = p; if (p && k in d) pub[k] = copia(d[k]); }
    if (Array.isArray(pub.relacoes)) pub.relacoes = pub.relacoes.filter(r => ehObj(r) && (r.tipo !== 'cla' || vistos.has(r.alvo))).map(r => (r.tipo === 'cla' ? Object.assign({}, r, vistos.get(r.alvo)) : r));
    if (Array.isArray(pub.hist)) pub.hist = pub.hist.filter(e => ehObj(e) && histVai(e, pub.ver, jog, vistos));
    if (!jog && ehObj(pub.cargos)) for (const k of Object.keys(pub.cargos)) {
      const c = pub.cargos[k];
      if (ehObj(c) && Array.isArray(c.gente)) c.gente = c.gente.map(p => { if (!ehObj(p)) return p; const q = Object.assign({}, p); delete q.resp; return q; });
    }
    return pub;
  }

  /* ---------------- mudanças com histórico ---------------- */
  /* A mesma coisa mudando de novo, dentro de um minuto (e sem um motivo diferente), junta-se à linha anterior — enquanto
     continua indo para o mesmo lado (+1, +1, +1, −1 é uma linha de +2; voltando ao que era, a linha some). Virando para
     o outro lado (+2 e depois −5), é outra mudança: outra linha. */
  function chaveHist(e) {
    if (e.tipo === 'rec') return e.mud.length === 1 ? 'rec:' + e.mud[0].rec : null;
    if (e.tipo === 'resp') return 'resp';
    if (e.tipo === 'rel') return 'rel:' + e.alvoTipo + ':' + e.alvo;
    if (e.tipo === 'membro') return e.pid ? 'membro:' + e.pid : null;
    return null;
  }
  function anotar(lista, e, max) {
    const l = Array.isArray(lista) ? lista.slice() : [], u = l[0], k = chaveHist(e);
    const perto = u && u.em && e.em && Date.parse(e.em) - Date.parse(u.em) >= 0 && Date.parse(e.em) - Date.parse(u.em) <= JANELA;
    if (u && k && chaveHist(u) === k && perto && (!e.mot || !u.mot || e.mot === u.mot)) {
      const antes = e.tipo === 'rec' ? u.mud[0].d : u.para - u.de, depois = e.tipo === 'rec' ? antes + e.mud[0].d : e.para - u.de;
      if (!depois) { l.shift(); return l; }
      if (Math.sign(depois) === Math.sign(antes)) {
        const m = Object.assign({}, u, { em: e.em, mot: u.mot || e.mot });
        if (e.tipo === 'rec') m.mud = [Object.assign({}, e.mud[0], { d: depois })]; else m.para = e.para;
        l[0] = m;
        return l;
      }
    }
    l.unshift(e);
    return l.slice(0, max);
  }
  function mudarRecurso(cla, rec, delta, mot, em) {
    const c = normCla(cla), r = c.recursos.lista.find(x => x.id === rec);
    if (!r) return null;
    const novo = Math.max(0, Math.min(MAX.qtd, r.qtd + Math.trunc(Number(delta) || 0))), d = novo - r.qtd;
    if (!d) return null;
    r.qtd = novo;
    const e = { em: instante(em), tipo: 'rec', mud: [{ rec: r.id, n: r.nome, d }], mot: linha(mot, MAX.motivo) };
    c.recursos.hist = anotar(c.recursos.hist, e, MAX.rhist);
    c.hist = anotar(c.hist, e, MAX.hist);
    return c;
  }
  const definirRecurso = (cla, rec, qtd, mot, em) => { const r = normCla(cla).recursos.lista.find(x => x.id === rec); return r ? mudarRecurso(cla, rec, inteiro(qtd, r.qtd, 0, MAX.qtd) - r.qtd, mot, em) : null; };
  function mudarRespeito(cla, para, mot, em) {
    const c = normCla(cla), de = c.respeito.v, p = nivel(para);
    if (p === de) return null;
    c.respeito.v = p;
    const e = { em: instante(em), tipo: 'resp', de, para: p, mot: linha(mot, MAX.motivo) };
    c.respeito.hist = anotar(c.respeito.hist, e, MAX.rhist);
    c.hist = anotar(c.hist, e, MAX.hist);
    return c;
  }
  // (nome: o nome de quem está do outro lado, para o histórico — o do clã, a página sabe)
  function mudarRelacao(cla, rel, para, mot, em, nome) {
    const c = normCla(cla), r = c.relacoes.find(x => x.id === rel), p = nivel(para);
    if (!r || r.v === p) return null;
    const e = { em: instante(em), tipo: 'rel', alvoTipo: r.tipo, alvo: r.alvo, nome: linha(nome, MAX.nome) || r.nome, de: r.v, para: p, mot: linha(mot, MAX.motivo) };
    r.v = p;
    c.hist = anotar(c.hist, e, MAX.hist);
    return c;
  }
  // (nome: o nome da pessoa como a página mostra — o do personagem, de agora)
  function mudarMembro(cla, pid, para, mot, em, nome) {
    const c = normCla(cla), p = nivel(para);
    for (const k of Object.keys(c.cargos)) {
      const x = c.cargos[k].gente.find(y => y.id === pid);
      if (!x) continue;
      if (x.resp === p) return null;
      const e = { em: instante(em), tipo: 'membro', pid, nome: linha(nome, MAX.nomePessoa) || x.nome || 'Alguém', de: x.resp, para: p, mot: linha(mot, MAX.motivo) };
      x.resp = p;
      c.hist = anotar(c.hist, e, MAX.hist);
      return c;
    }
    return null;
  }
  // o que falta para subir uma construção de nível: [{ rec, nome, qtd }] (vazio: dá para subir)
  function falta(cla, id) {
    const c = normCla(cla), k = c.construcoes.find(x => x.id === id);
    if (!k) return [];
    return k.prox.custo.map(x => { const r = c.recursos.lista.find(y => y.id === x.rec); return { rec: x.rec, nome: r ? r.nome : x.nome || 'Recurso', qtd: x.qtd - (r ? r.qtd : 0) }; }).filter(x => x.qtd > 0);
  }
  /* "Subir de nível": desconta o custo dos recursos, sobe o nível, o efeito novo (se o mestre escreveu um) passa a
     valer e o custo do próximo nível fica em branco (o mestre escreve). Vai para o histórico. → { ok, falta, cla } */
  function subirNivel(cla, id, em) {
    const c = normCla(cla), k = c.construcoes.find(x => x.id === id);
    if (!k || k.nivel >= MAX.nivel) return { ok: false, falta: [], cla: null };
    const f = falta(c, id);
    if (f.length) return { ok: false, falta: f, cla: null };
    const mud = [];
    for (const x of k.prox.custo) { const r = c.recursos.lista.find(y => y.id === x.rec); r.qtd -= x.qtd; mud.push({ rec: r.id, n: r.nome, d: -x.qtd }); }
    k.nivel += 1;
    if (k.prox.efeito.trim()) k.efeito = k.prox.efeito;
    k.prox = { custo: [], efeito: '' };
    const quando = instante(em), mot = k.nivel === 1 ? k.nome + ' foi construída' : k.nome + ' subiu para o nível ' + k.nivel;
    if (mud.length) c.recursos.hist = anotar(c.recursos.hist, { em: quando, tipo: 'rec', mud, mot }, MAX.rhist);
    c.hist = anotar(c.hist, { em: quando, tipo: 'cons', nome: k.nome, nivel: k.nivel, mud, mot: '' }, MAX.hist);
    return { ok: true, falta: [], cla: c };
  }

  /* ---------------- textos ---------------- */
  const qtdTxt = n => Number(n).toLocaleString('pt-BR');
  const custoTxt = (custo, recursos) => (custo || []).map(x => { const r = recursos && recursos.lista ? recursos.lista.find(y => y.id === x.rec) : null; return qtdTxt(x.qtd) + ' ' + (r ? r.nome : x.nome || 'Recurso'); }).join(' · ');
  const mudTxt = mud => (mud || []).map(x => (x.d > 0 ? '+' : '−') + qtdTxt(Math.abs(x.d)) + ' ' + x.n).join(', ');
  const comMotivo = (t, mot) => (mot ? t + ' — ' + mot : t);
  // o texto de uma linha do histórico (com os nomes dos níveis desta mesa)
  function histTxt(e, nomes) {
    switch (e.tipo) {
      case 'rec': return comMotivo(mudTxt(e.mud), e.mot) + '.';
      case 'cons': return (e.nivel <= 1 ? e.nome + ' foi construída' : e.nome + ' subiu para o nível ' + e.nivel) + (e.mud && e.mud.length ? ' (' + mudTxt(e.mud) + ')' : '') + '.';
      case 'resp': return comMotivo('Respeito no mundo: ' + sinal(e.para) + ' (' + nomeNivel(nomes, 'mundo', e.para) + ')', e.mot) + '.';
      case 'rel': return comMotivo('Relação com ' + (e.nome || (e.alvoTipo === 'cla' ? 'um clã' : 'uma facção')) + ': ' + sinal(e.para) + ' (' + nomeNivel(nomes, 'rel', e.para) + ')', e.mot) + '.';
      case 'membro': return comMotivo('Respeito de ' + e.nome + ' no clã: ' + sinal(e.para) + ' (' + nomeNivel(nomes, 'membro', e.para) + ')', e.mot) + '.';
      default: return e.txt || '';
    }
  }

  const ClaNucleo = {
    ESCALAS, ESCALA_NOME, PARTES, PARTE_NOME, FORMAS, DIVISOES, CORES, ICONES, MAX, SIMBOLOS, JANELA,
    novoId, sinal, normNomes, nomeNivel, nivelTxt, normBrasao, brasaoNovo, brasaoSvg,
    normCargos, filhos, descendentes, arvore, membros, lider, totalCargos, novoCargo, renomearCargo, moverCargo, apagarCargo,
    porPessoa, tirarPessoa, passarLideranca, diffCargos, aplicarDiff,
    normConstrucoes, normRecursos, normRespeito, normRelacoes, normFaccao, normHist, normVer, normCla, claNovo, normPub, comoVista,
    visivel, projetar, anotar, mudarRecurso, definirRecurso, mudarRespeito, mudarRelacao, mudarMembro, falta, subirNivel,
    custoTxt, mudTxt, histTxt, qtdTxt,
  };
  if (typeof module === 'object' && module && module.exports) module.exports = ClaNucleo;
  if (typeof window !== 'undefined') window.ClaNucleo = ClaNucleo;
})();
