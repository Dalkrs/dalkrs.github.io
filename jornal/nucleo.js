/* Tiny Cats · Jornal: a lógica pura (sem página, sem DOM). Roda igual no navegador (window.JornalNucleo) e no Node
   (testes).
   Um jornal só para a mesa: uma página, sempre atualizada. Quem mestra o Jornal escreve num rascunho e publica; os
   jogadores leem o publicado e mandam cartas. Os documentos da mesa:
     jornal:rascunho            o rascunho (só quem mestra o Jornal vê)
     jornal:pub                 o publicado (a mesa toda lê)
     jornal:cartas:<jogador>    as cartas de um jogador (ele escreve; só ele e quem mestra veem)
     jornal:resp:<jogador>      o que aconteceu com cada carta dele: saiu no jornal ou não saiu (quem mestra escreve;
                                o jogador lê — é o dono do documento, para só ele e quem mestra verem)
   Texto com marcação simples: **negrito** e _itálico_ (também *itálico*); uma linha em branco separa os parágrafos. */
(() => {
  'use strict';

  /* ---------------- catálogos e limites ---------------- */
  // O clima do dia, no alto do jornal: um ícone (traço numa caixa 24×24) e o nome.
  const CLIMAS = {
    sol: { nome: 'Ensolarado', svg: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>' },
    nublado: { nome: 'Nublado', svg: '<path d="M7 18.5a4.2 4.2 0 0 1-.4-8.4A5.6 5.6 0 0 1 17.4 9a4.3 4.3 0 0 1 .3 8.6z"/>' },
    chuva: { nome: 'Chuva', svg: '<path d="M7 14.5a4 4 0 0 1-.4-8A5.4 5.4 0 0 1 17 5.6a4.1 4.1 0 0 1 .3 8.2"/><path d="M8.5 17l-1 2.6M12.5 17l-1 2.6M16.5 17l-1 2.6"/>' },
    tempestade: { nome: 'Tempestade', svg: '<path d="M7 14a4 4 0 0 1-.4-8A5.4 5.4 0 0 1 17 5.1a4.1 4.1 0 0 1 .3 8.2"/><path d="M12.5 12.5 10 17h3.4l-2.2 4.4"/>' },
    neve: { nome: 'Neve', svg: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.6 4.6 12 7l2.4-2.4M9.6 19.4 12 17l2.4 2.4"/>' },
    nevoa: { nome: 'Névoa', svg: '<path d="M4 8.5h16M3 12.5h13M7 16.5h14M5 20h9"/>' },
    vento: { nome: 'Ventania', svg: '<path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7"/>' },
    calor: { nome: 'Calor', svg: '<path d="M12 3c1.6 2 1.6 3.6 0 5.6s-1.6 3.6 0 5.6M7 5.5c1.2 1.6 1.2 2.9 0 4.5s-1.2 2.9 0 4.5M17 5.5c1.2 1.6 1.2 2.9 0 4.5s-1.2 2.9 0 4.5M5 20h14"/>' },
    frio: { nome: 'Frio', svg: '<path d="M12 3v10.5M9.5 5.5H12M9.5 8.5H12M9.5 11.5H12"/><circle cx="12" cy="17" r="3.6"/><path d="M12 13.5v3.5"/>' },
  };
  const MAX = {
    nome: 80, frase: 120, titulo: 160, assinatura: 80, materia: 8000, nota: 600, carta: 1500,
    materias: 30, notas: 40, cartasNoJornal: 30, cartasDoJogador: 60,
  };

  /* ---------------- apoio ---------------- */
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const tem = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  function texto(v, max) {
    let s = typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
    s = s.replace(/\r\n?/g, '\n');
    if (s.length > max) { s = s.slice(0, max); if (/[\ud800-\udbff]$/.test(s)) s = s.slice(0, -1); }
    return s;
  }
  const linha = (v, max) => texto(v, max).replace(/\s+/g, ' ').trim();
  const idOk = v => (typeof v === 'string' && v.length <= 80 && /^[A-Za-z0-9_:.-]+$/.test(v) && v !== '__proto__' ? v : '');
  let seq = 0;
  function novoId(pre) { seq = (seq + 1) % 1296; return pre + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + seq.toString(36); }
  function unico(id, vistos, pre) { let r = id || novoId(pre); while (vistos.has(r)) r = novoId(pre); vistos.add(r); return r; }
  const instante = v => (typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v)) ? v : null);

  /* ---------------- o jornal (rascunho e publicado) ---------------- */
  function normMaterias(v) {
    const out = [], vistos = new Set();
    for (const m of Array.isArray(v) ? v : []) {
      if (!ehObj(m) || out.length >= MAX.materias) continue;
      out.push({ id: unico(idOk(m.id), vistos, 'mt'), tit: linha(m.tit, MAX.titulo), txt: texto(m.txt, MAX.materia), ass: linha(m.ass, MAX.assinatura), dest: m.dest === true });
    }
    return out;
  }
  function normNotas(v) {
    const out = [], vistos = new Set();
    for (const n of Array.isArray(v) ? v : []) {
      if (!ehObj(n) || out.length >= MAX.notas) continue;
      out.push({ id: unico(idOk(n.id), vistos, 'nt'), txt: texto(n.txt, MAX.nota) });
    }
    return out;
  }
  /* As cartas que estão no jornal: o texto (que quem mestra pode corrigir) e a assinatura como vão sair; de: o jogador
     que mandou e ref: a carta dele (as duas, para dizer a ele que a carta saiu). */
  function normCartasDoJornal(v) {
    const out = [], vistos = new Set();
    for (const c of Array.isArray(v) ? v : []) {
      if (!ehObj(c) || out.length >= MAX.cartasNoJornal) continue;
      out.push({ id: unico(idOk(c.id), vistos, 'cj'), de: idOk(c.de) || null, ref: idOk(c.ref) || null, ass: linha(c.ass, MAX.assinatura), txt: texto(c.txt, MAX.carta) });
    }
    return out;
  }
  // mapa: o mapa do Mapa-múndi de onde vem a data do mundo (null: sem data)
  function normJornal(d) {
    d = ehObj(d) ? d : {};
    const cl = ehObj(d.clima) ? d.clima : {};
    return {
      v: 1,
      nome: linha(d.nome, MAX.nome) || 'O Arauto',
      mapa: idOk(d.mapa) || null,
      clima: { t: tem(CLIMAS, cl.t) ? cl.t : '', frase: linha(cl.frase, MAX.frase) },
      materias: normMaterias(d.materias),
      notas: normNotas(d.notas),
      cartas: normCartasDoJornal(d.cartas),
    };
  }
  /* O publicado: o jornal como saiu, com a data do mundo daquele dia (em palavras; os jogadores não precisam do mapa),
     quando saiu (em: a hora de verdade, que diz ao jogador que há edição nova) e quantas vezes já saiu (n). */
  function normPub(d) {
    d = ehObj(d) ? d : {};
    const j = normJornal(d), n = Number(d.n);
    return Object.assign(j, { data: linha(d.data, 120), em: instante(d.em), n: Number.isFinite(n) && n > 0 ? Math.min(1e9, Math.floor(n)) : 0 });
  }
  const vazioPub = p => !p || !p.em;
  // Publicar: o rascunho vira o publicado (o anterior só dá o número). → o publicado novo
  function publicar(rascunho, anterior, dataDoMundo, quando) {
    const j = normJornal(rascunho), a = normPub(anterior);
    return Object.assign(j, { data: linha(dataDoMundo, 120), em: instante(quando) || new Date().toISOString(), n: a.n + 1 });
  }
  // O rascunho tem o que ainda não saiu? (compara só o conteúdo do jornal)
  function mudouDesde(rascunho, pub) {
    const a = normJornal(rascunho), b = normJornal(pub);
    return JSON.stringify(a) !== JSON.stringify(b);
  }

  /* ---------------- as cartas dos jogadores ---------------- */
  // A assinatura: o nome de um personagem do jogador (pc: o id dele) ou anônima (null).
  function normAss(a) {
    if (!ehObj(a)) return null;
    const nome = linha(a.nome, MAX.assinatura);
    return nome ? { pc: idOk(a.pc) || null, nome } : null;
  }
  function normCartas(d) {
    d = ehObj(d) ? d : {};
    const out = [], vistos = new Set();
    for (const c of Array.isArray(d.cartas) ? d.cartas : []) {
      if (!ehObj(c) || out.length >= MAX.cartasDoJogador) continue;
      const txt = texto(c.txt, MAX.carta);
      if (!txt.trim()) continue;
      out.push({ id: unico(idOk(c.id), vistos, 'ca'), txt, ass: normAss(c.ass), em: instante(c.em) });
    }
    return { cartas: out };
  }
  // O que aconteceu com cada carta: 'saiu' (no jornal) ou 'nao' (não saiu); sem nada, esperando quem mestra.
  function normResp(d) {
    d = ehObj(d) ? d : {};
    const st = {};
    if (ehObj(d.st)) for (const k of Object.keys(d.st)) if (idOk(k) && (d.st[k] === 'saiu' || d.st[k] === 'nao') && Object.keys(st).length < 500) st[k] = d.st[k];
    return { st };
  }
  const assTxt = a => (a && a.nome ? a.nome : 'Anônima');
  /* Uma carta nova (no documento do jogador). → { ok, cartas, carta } ou { ok: false, msg } */
  function mandarCarta(doc, txt, ass, quando) {
    const d = normCartas(doc), t = texto(txt, MAX.carta);
    if (!t.trim()) return { ok: false, msg: 'Escreva a carta primeiro.' };
    if (String(txt).length > MAX.carta) return { ok: false, msg: 'A carta passa de ' + MAX.carta + ' letras.' };
    if (d.cartas.length >= MAX.cartasDoJogador) return { ok: false, msg: 'Você já mandou ' + MAX.cartasDoJogador + ' cartas; retire uma que não saiu para mandar outra.' };
    const carta = { id: novoId('ca'), txt: t, ass: normAss(ass), em: instante(quando) || new Date().toISOString() };
    d.cartas.push(carta);
    return { ok: true, cartas: d, carta };
  }
  // A situação de uma carta para quem mandou: 'esperando', 'saiu' ou 'nao'
  const situacao = (resp, id) => { const s = normResp(resp).st[id]; return s === 'saiu' || s === 'nao' ? s : 'esperando'; };
  /* Todas as cartas da mesa, para quem mestra: cada uma com quem mandou, a situação e se já está no rascunho.
     docs: [{ de: id do jogador, cartas: documento das cartas, resp: documento das respostas }] */
  function caixaDeCartas(docs, rascunho) {
    const no = new Set(normJornal(rascunho).cartas.filter(c => c.ref).map(c => c.de + '/' + c.ref)), out = [];
    for (const x of Array.isArray(docs) ? docs : []) {
      const de = idOk(x && x.de);
      if (!de) continue;
      const st = normResp(x.resp).st;
      for (const c of normCartas(x.cartas).cartas) out.push(Object.assign({}, c, { de, st: st[c.id] || 'esperando', noRascunho: no.has(de + '/' + c.id) }));
    }
    return out.sort((a, b) => String(a.em || '').localeCompare(String(b.em || '')));
  }
  // Pôr uma carta no rascunho (o texto e a assinatura como o jogador mandou; quem mestra corrige depois). → o rascunho
  function porNoJornal(rascunho, de, carta) {
    const j = normJornal(rascunho);
    if (!carta || j.cartas.some(c => c.de === de && c.ref === carta.id) || j.cartas.length >= MAX.cartasNoJornal) return j;
    j.cartas.push({ id: novoId('cj'), de: idOk(de) || null, ref: idOk(carta.id) || null, ass: assTxt(carta.ass), txt: texto(carta.txt, MAX.carta) });
    return j;
  }
  /* Ao publicar, as cartas que estão no jornal saíram: → { de: { idDaCarta: 'saiu' } } (o que gravar em cada resp) */
  function saidasAoPublicar(pub) {
    const out = {};
    for (const c of normJornal(pub).cartas) if (c.de && c.ref) (out[c.de] = out[c.de] || {})[c.ref] = 'saiu';
    return out;
  }

  /* ---------------- o texto, com marcação simples ---------------- */
  /* → [[{ t, b, i }]]: parágrafos, cada um uma lista de trechos (negrito, itálico). Uma quebra de linha simples dentro
     do parágrafo vira { br: true }. O que não fecha fica como está (um asterisco solto é só um asterisco). */
  function marcacao(txt) {
    const ps = String(txt || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(p => p.replace(/^\n+|\n+$/g, '')).filter(p => p.trim());
    return ps.map(p => {
      const out = [];
      const linhas = p.split('\n');
      linhas.forEach((ln, k) => {
        if (k) out.push({ br: true });
        trechos(ln, out);
      });
      return out;
    });
  }
  function trechos(s, out) {
    // **negrito**, _itálico_ ou *itálico* (o marcador colado ao texto: "2 * 3" não vira itálico)
    const re = /\*\*(?=\S)([\s\S]*?\S)\*\*|_(?=\S)([^_]*?\S)_(?![A-Za-zÀ-ÿ0-9])|\*(?=\S)([^*]*?\S)\*/g;
    let i = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > 0 && m[0][0] === '_' && /[A-Za-zÀ-ÿ0-9]/.test(s[m.index - 1])) continue;   // nome_com_traço não é itálico
      if (m.index > i) out.push({ t: s.slice(i, m.index), b: false, i: false });
      if (m[1] !== undefined) {
        // dentro do negrito, pode haver itálico
        const dentro = [];
        trechos(m[1], dentro);
        for (const x of dentro) out.push(x.br ? x : { t: x.t, b: true, i: x.i });
      } else out.push({ t: m[2] !== undefined ? m[2] : m[3], b: false, i: true });
      i = m.index + m[0].length;
    }
    if (i < s.length) out.push({ t: s.slice(i), b: false, i: false });
  }
  // Envolver o trecho escolhido com a marcação (os botões N e I do editor). → { txt, ini, fim } (o trecho de dentro)
  function envolver(txt, ini, fim, marca) {
    const s = String(txt || ''), a = Math.max(0, Math.min(ini, fim)), b = Math.min(s.length, Math.max(ini, fim));
    const dentro = s.slice(a, b) || (marca === '**' ? 'negrito' : 'itálico');
    return { txt: s.slice(0, a) + marca + dentro + marca + s.slice(b), ini: a + marca.length, fim: a + marca.length + dentro.length };
  }

  /* ---------------- (lote 16) os aniversários do mundo ----------------
     No dia do mundo do jornal: quem faz aniversário hoje e nos próximos dias. pcs: [{ nome, aniv: { d, m, a? } }] (o
     aniversário da ficha, no calendário do mundo); dataDe(k): a data do mundo k dias depois de hoje — { ano, mes,
     diaMes, nomeMes } (do Mapa-múndi). → { hoje: [{ nome, idade }], logo: [{ nome, idade, k, data }], texto } ou null
     (ninguém). O texto é a nota pronta: "Hoje é aniversário de Ana (faz 23 anos) e de Bia. Nos próximos dias: Caio
     (amanhã, 13 de Degelo)." */
  const DIAS_ANIV = 7;
  const listaE = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
  function aniversarios(pcs, dataDe, dias) {
    const n = Math.max(1, Math.min(31, Math.round(+dias || DIAS_ANIV))), hoje = [], logo = [];
    const lista = (Array.isArray(pcs) ? pcs : []).filter(p => ehObj(p) && ehObj(p.aniv) && Number.isFinite(+p.aniv.d) && Number.isFinite(+p.aniv.m) && p.aniv.d !== null && p.aniv.m !== null);
    if (!lista.length || typeof dataDe !== 'function') return null;
    for (let k = 0; k < n; k++) {
      const d = dataDe(k);
      if (!ehObj(d)) continue;
      for (const p of lista) {
        if (Math.round(+p.aniv.m) !== d.mes || Math.round(+p.aniv.d) !== d.diaMes) continue;
        const a = p.aniv.a, idade = a != null && a !== '' && Number.isFinite(+a) ? d.ano - Math.round(+a) : null;
        const x = { nome: linha(p.nome, MAX.nome) || 'Sem nome', idade };
        if (k) logo.push(Object.assign(x, { k, data: d.diaMes + ' de ' + linha(d.nomeMes, 60) })); else hoje.push(x);
      }
    }
    if (!hoje.length && !logo.length) return null;
    const anos = i => (i == null || i < 0 ? '' : ' (faz ' + i + (i === 1 ? ' ano)' : ' anos)'));
    const partes = [];
    if (hoje.length) partes.push('Hoje é aniversário ' + listaE(hoje.map(x => 'de ' + x.nome + anos(x.idade))) + '.');
    if (logo.length) partes.push((hoje.length ? 'Nos próximos dias: ' : 'Aniversários nos próximos dias: ') + listaE(logo.map(x => x.nome + ' (' + (x.k === 1 ? 'amanhã, ' : '') + x.data + ')')) + '.');
    return { hoje, logo, texto: partes.join(' ').slice(0, MAX.nota) };
  }

  const JornalNucleo = {
    CLIMAS, MAX, novoId, aniversarios,
    normJornal, normPub, vazioPub, publicar, mudouDesde,
    normCartas, normResp, assTxt, mandarCarta, situacao, caixaDeCartas, porNoJornal, saidasAoPublicar,
    marcacao, envolver,
  };
  if (typeof module === 'object' && module && module.exports) module.exports = JornalNucleo;
  if (typeof window !== 'undefined') window.JornalNucleo = JornalNucleo;
})();
