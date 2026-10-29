/* Tiny Cats · a corrupção das fichas (lote 37): a lógica pura (sem página). Roda igual no navegador (TC.corrupcao) e
   no Node (testes). Serve às Fichas (a ficha, o retrato, o painel do mestre) e às Cenas (a aura do token).
   Três corrupções — vampírica, licantropa e demoníaca —, em cinco estágios. A vampírica e a licantropa crescem com os
   pontos que o personagem gastou na árvore de linhagem que o mestre escolheu (os cortes dos estágios são da mesa, um
   jogo por tipo, nas configurações das Fichas), mais o ajuste do mestre; a demoníaca é só à mão.
   Onde mora: o documento "fichas:corr:<id do personagem>" (só o mestre escreve; tem o dono do personagem como dono, e
   por isso só o dono e quem mestra o recebem — ver supabase/migrations/0028_corrupcao.sql). Fora de uma mesa, na
   própria ficha (pc.corr). Não muda conta nenhuma: é o que se vê. */
(() => {
  'use strict';
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const inteiro = (v, a, b, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
  const idOk = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);

  const TIPOS = {
    vamp: { nome: 'Vampírica', curto: 'vampírica', estagios: ['Pálido', 'Sedento', 'Noturno', 'Cria da Noite', 'Senhor da Noite'], cor: '#b3122e', escura: '#5a0f1c' },
    lica: { nome: 'Licantropa', curto: 'licantropa', estagios: ['Inquieto', 'Faro', 'Garras', 'Fera', 'Lua Eterna'], cor: '#d08a3a', escura: '#5a3214' },
    demo: { nome: 'Demoníaca', curto: 'demoníaca', estagios: ['Marcado', 'Tentado', 'Pactuado', 'Possuído', 'Danado'], cor: '#ff6a1a', escura: '#3a0d05', manual: true },
  };
  const ORDEM = ['vamp', 'lica', 'demo'];
  const MAX = 5, AJUSTE = 5;
  const CORTES_PADRAO = [3, 8, 15, 25, 40];
  const PRE = 'fichas:corr:';
  const docId = pcId => PRE + pcId;
  const pcDoDoc = id => (typeof id === 'string' && id.startsWith(PRE) && idOk(id.slice(PRE.length)) ? id.slice(PRE.length) : null);

  /* a corrupção de um personagem: { v, tipo (vamp | lica | demo | null), arv (a árvore que conta), ajuste (−5…+5,
     soma nos estágios da vampírica e da licantropa), estagio (0…5: o da demoníaca, à mão) } */
  function normConf(d) {
    d = ehObj(d) ? d : {};
    const tipo = ORDEM.includes(d.tipo) ? d.tipo : null;
    return { v: 1, tipo, arv: idOk(d.arv) ? d.arv : null, ajuste: inteiro(d.ajuste, -AJUSTE, AJUSTE, 0), estagio: inteiro(d.estagio, 0, MAX, 0) };
  }
  // os cortes: cinco números de pontos, sempre subindo (o que não serve volta ao de começo)
  function normCortes(l) {
    if (!Array.isArray(l) || l.length !== MAX) return CORTES_PADRAO.slice();
    const out = [];
    for (const x of l) { const n = inteiro(x, 1, 9999, NaN); if (!Number.isFinite(n) || (out.length && n <= out[out.length - 1])) return CORTES_PADRAO.slice(); out.push(n); }
    return out;
  }
  const cortesDe = (cfg, tipo) => normCortes(ehObj(cfg) && ehObj(cfg.corr) ? cfg.corr[tipo] : null);

  /* os pontos gastos numa árvore: a soma dos custos (de todos os tipos de ponto) dos graus que o personagem tem */
  function gastoNaArvore(skills, bib, arvId) {
    if (!arvId || !ehObj(skills) || !ehObj(bib) || !Array.isArray(bib.arvores)) return 0;
    const a = bib.arvores.find(x => x && x.id === arvId);
    if (!a || !Array.isArray(a.nodes)) return 0;
    const al = ehObj(skills.alocados) ? skills.alocados : {};
    let s = 0;
    for (const n of a.nodes) {
      if (!n || !(al[n.id] > 0) || !Array.isArray(n.graus)) continue;
      const g = Math.min(Math.round(al[n.id]), n.graus.length);
      for (let k = 0; k < g; k++) { const c = n.graus[k] && n.graus[k].custos; if (ehObj(c)) for (const p in c) { const v = Number(c[p]); if (v > 0) s += v; } }
    }
    return s;
  }
  // as árvores que dá para escolher: as de linhagem primeiro (as equipadas na frente), depois as outras
  function arvoresParaEscolher(bib, skills) {
    const lista = ehObj(bib) && Array.isArray(bib.arvores) ? bib.arvores.filter(a => a && idOk(a.id)) : [];
    const eq = new Set(ehObj(skills) && Array.isArray(skills.arvores) ? skills.arvores : []);
    const peso = a => (a.categoria === 'linhagem' ? 0 : 2) + (eq.has(a.id) ? 0 : 1);
    return lista.slice().sort((a, b) => peso(a) - peso(b) || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')).map(a => ({ id: a.id, nome: String(a.nome || 'Árvore'), linhagem: a.categoria === 'linhagem', equipada: eq.has(a.id) }));
  }
  /* a árvore de começo para um tipo: a de linhagem equipada cujo nome lembra o tipo (Vampiro, Lobisomem…), senão a
     primeira de linhagem equipada */
  const PISTAS = { vamp: /vamp|sangue|noite|morcego/i, lica: /lic|lobo|lobis|fera|bestial|lua/i, demo: /dem[oô]n|infern|pacto|diab/i };
  function arvorePadrao(bib, skills, tipo) {
    const l = arvoresParaEscolher(bib, skills).filter(a => a.linhagem && a.equipada);
    return (l.find(a => PISTAS[tipo] && PISTAS[tipo].test(a.nome)) || l[0] || { id: null }).id;
  }

  /* O estado de agora: null (sem corrupção) ou { tipo, nomeTipo, n (0…5), nome (o do estágio; '' no 0), pts (gastos na
     árvore), cortes, prox (os pontos do próximo estágio, ou null), manual (a demoníaca), base (o estágio só pelos pontos) } */
  function estado(conf, skills, bib, cfg) {
    const c = normConf(conf);
    if (!c.tipo) return null;
    const T = TIPOS[c.tipo];
    if (T.manual) return { tipo: c.tipo, nomeTipo: T.nome, n: c.estagio, nome: c.estagio ? T.estagios[c.estagio - 1] : '', pts: null, cortes: null, prox: null, manual: true, base: c.estagio, ajuste: 0 };
    const cortes = cortesDe(cfg, c.tipo), pts = gastoNaArvore(skills, bib, c.arv);
    const base = cortes.filter(x => pts >= x).length;
    const n = Math.max(0, Math.min(MAX, base + c.ajuste));
    return { tipo: c.tipo, nomeTipo: T.nome, n, nome: n ? T.estagios[n - 1] : '', pts, cortes, prox: base < MAX ? cortes[base] : null, manual: false, base, ajuste: c.ajuste };
  }
  // o texto curto do estágio: "Vampírica · estágio 2 (Sedento)"
  const rotulo = e => (!e ? '' : 'Corrupção ' + TIPOS[e.tipo].curto + (e.n ? ': ' + e.nome + ' (estágio ' + e.n + ' de ' + MAX + ')' : ': ainda adormecida'));

  const api = { TIPOS, ORDEM, MAX, AJUSTE, CORTES_PADRAO, PRE, docId, pcDoDoc, normConf, normCortes, cortesDe, gastoNaArvore, arvoresParaEscolher, arvorePadrao, estado, rotulo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.TC = window.TC || {}; window.TC.corrupcao = api; }
})();
