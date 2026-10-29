/* Tiny Cats · o Bestiário do clã (lote 36): a lógica pura (sem página, sem DOM). Roda igual no navegador
   (window.LivroNucleo) e no Node (testes).
   O livro de caça de um clã: as páginas que o mestre monta (à mão ou enviadas do Bestiário dele), o que o clã já
   descobriu de cada uma (o mestre revela parte por parte) e as anotações de quem é do clã.
   Os documentos da mesa (ver supabase/migrations/0027_livro_do_cla.sql):
     cla:livro:<clã>            a capa: { v, on (liberado para o clã), titulo } — só quem mestra o Clã
     cla:livro:<clã>:p:<pág>    uma página inteira, com o que o clã ainda não sabe — só quem mestra o Clã
     cla:lpub:<clã>             a capa que o clã vê (o banco monta; só existe com o livro liberado)
     cla:lpub:<clã>:p:<pág>     a página que o clã vê: só as partes reveladas (o banco monta; projetar() faz a mesma conta)
     cla:lpub:<clã>:n:<pág>     as anotações do clã na página (quem escreve é o banco, pela função livro_nota)
   Quem lê os cla:lpub: de um clã: quem tem personagem nos cargos dele (o banco confere a cada leitura). */
(() => {
  'use strict';
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const txt = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
  const linha = (v, max) => txt(v, max).replace(/\s+/g, ' ');
  const idCla = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : '');
  const idPag = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,61}$/.test(v) ? v : '');
  const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const sem = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /* ---------------- os documentos ---------------- */
  const PRE = 'cla:livro:', PRE_PUB = 'cla:lpub:';
  const idCapa = cla => PRE + cla, idPagina = (cla, pag) => PRE + cla + ':p:' + pag;
  const idCapaPub = cla => PRE_PUB + cla, idPaginaPub = (cla, pag) => PRE_PUB + cla + ':p:' + pag, idNotas = (cla, pag) => PRE_PUB + cla + ':n:' + pag;
  /* De um id de documento, o que ele é: { k: 'capa' | 'pag' | 'capaPub' | 'pagPub' | 'notas', cla, pag } ou null. */
  function qualDoc(id) {
    if (typeof id !== 'string') return null;
    const pub = id.startsWith(PRE_PUB), resto = pub ? id.slice(PRE_PUB.length) : id.startsWith(PRE) ? id.slice(PRE.length) : null;
    if (resto == null) return null;
    const p = resto.split(':');
    if (p.length === 1 && idCla(p[0])) return { k: pub ? 'capaPub' : 'capa', cla: p[0], pag: null };
    if (p.length === 3 && idCla(p[0]) && idPag(p[2])) {
      if (p[1] === 'p') return { k: pub ? 'pagPub' : 'pag', cla: p[0], pag: p[2] };
      if (p[1] === 'n' && pub) return { k: 'notas', cla: p[0], pag: p[2] };
    }
    return null;
  }

  /* ---------------- a página ---------------- */
  // as partes que o mestre revela (a página em si — o nome — é a primeira: sem ela, o clã nem sabe que ela existe)
  const PARTES = [['img', 'A ilustração'], ['desc', 'A descrição'], ['nums', 'O que sabemos'], ['fraq', 'Fraquezas e resistências'], ['saque', 'Deixa cair']];
  const TIPOS_FR = [['fraco', 'Fraqueza'], ['resiste', 'Resistência'], ['imune', 'Imunidade']];
  // o que vem do Bestiário do mestre (e se atualiza quando ele envia de novo — a não ser o que ele mudou no livro)
  const DO_BESTIARIO = ['nome', 'img', 'desc', 'nums', 'fraq', 'saque'];
  const MAX = { nome: 80, legenda: 140, desc: 3000, nums: 8, numN: 24, numV: 60, fraq: 12, fraqNome: 30, saque: 20, saqueNome: 60, titulo: 60 };
  const imgOk = v => (typeof v === 'string' && (/^https:\/\/[^\s"'<>]{1,600}$/i.test(v) || /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) ? v : null);
  function normFraq(l) {
    const out = [];
    for (const x of Array.isArray(l) ? l : []) {
      if (!ehObj(x)) continue;
      const nome = linha(x.nome, MAX.fraqNome);
      if (!nome || out.some(y => sem(y.nome) === sem(nome))) continue;
      out.push({ nome, tipo: TIPOS_FR.some(t => t[0] === x.tipo) ? x.tipo : 'fraco' });
      if (out.length >= MAX.fraq) break;
    }
    return out;
  }
  function normNums(l) {
    const out = [];
    for (const x of Array.isArray(l) ? l : []) {
      if (!ehObj(x)) continue;
      const n = linha(x.n, MAX.numN), v = linha(x.v, MAX.numV);
      if (!n && !v) continue;
      out.push({ n, v });
      if (out.length >= MAX.nums) break;
    }
    return out;
  }
  function normSaque(l) {
    const out = [];
    for (const x of Array.isArray(l) ? l : []) {
      const s = linha(typeof x === 'string' ? x : '', MAX.saqueNome);
      if (s && !out.some(y => sem(y) === sem(s))) out.push(s);
      if (out.length >= MAX.saque) break;
    }
    return out;
  }
  function normVer(v) {
    v = ehObj(v) ? v : {};
    const o = { pag: v.pag === true };
    for (const [k] of PARTES) o[k] = v[k] === true;
    return o;
  }
  function normPagina(p) {
    p = ehObj(p) ? p : {};
    const mao = {};
    if (ehObj(p.mao)) for (const k of DO_BESTIARIO) if (p.mao[k] === true) mao[k] = true;
    return {
      v: 1,
      nome: linha(p.nome, MAX.nome) || 'Criatura sem nome',
      img: imgOk(p.img),
      legenda: linha(p.legenda, MAX.legenda),
      desc: txt(p.desc, MAX.desc),
      nums: normNums(p.nums),
      fraq: normFraq(p.fraq),
      saque: normSaque(p.saque),
      de: typeof p.de === 'string' && /^best:i:[A-Za-z0-9_-]{1,60}$/.test(p.de) ? p.de : null,
      mao,
      ver: normVer(p.ver),
      enviado: typeof p.enviado === 'string' && !isNaN(Date.parse(p.enviado)) ? p.enviado : null,
    };
  }
  function novaPagina(nome) { return normPagina({ nome: nome || 'Nova criatura' }); }
  function normCapa(c) {
    c = ehObj(c) ? c : {};
    return { v: 1, on: c.on === true, titulo: linha(c.titulo, MAX.titulo) };
  }
  const tituloPadrao = nomeCla => (nomeCla ? 'Bestiário de ' + linha(nomeCla, 48) : 'Bestiário do clã');
  /* uma parte tem o que mostrar? (a parte vazia não aparece borrada para o clã: não há o que descobrir nela) */
  function temConteudo(p, k) {
    if (k === 'img') return !!(p.img || p.legenda);
    if (k === 'desc') return !!p.desc;
    return Array.isArray(p[k]) && p[k].length > 0;
  }

  /* O que o clã vê de uma página (a mesma conta que o banco faz, em privado.livro_pub): nada, com o livro trancado
     ou a página escondida; senão, o nome, cada parte revelada que tem conteúdo e, em "oc", as partes que existem mas
     o clã ainda não descobriu (na página elas aparecem como tinta borrada). */
  function projetar(pag, capa) {
    const c = normCapa(capa), p = normPagina(pag);
    if (!c.on || !p.ver.pag) return null;
    const o = { v: 1, nome: p.nome }, oc = [];
    for (const [k] of PARTES) {
      if (!temConteudo(p, k)) continue;
      if (!p.ver[k]) { oc.push(k); continue; }
      if (k === 'img') { o.img = p.img; o.legenda = p.legenda; } else o[k] = p[k];
    }
    o.oc = oc;
    return o;
  }
  function projetarCapa(capa) { const c = normCapa(capa); return c.on ? { v: 1, titulo: c.titulo } : null; }
  /* A página que o clã recebeu (do banco), limpa para a tela. */
  function normPub(x) {
    if (!ehObj(x) || x.oculto) return null;
    const o = { v: 1, nome: linha(x.nome, MAX.nome) || 'Criatura sem nome' };
    if ('img' in x || 'legenda' in x) { o.img = imgOk(x.img); o.legenda = linha(x.legenda, MAX.legenda); }
    if (typeof x.desc === 'string' && x.desc) o.desc = txt(x.desc, MAX.desc);
    if (Array.isArray(x.nums)) o.nums = normNums(x.nums);
    if (Array.isArray(x.fraq)) o.fraq = normFraq(x.fraq);
    if (Array.isArray(x.saque)) o.saque = normSaque(x.saque);
    o.oc = (Array.isArray(x.oc) ? x.oc : []).filter((k, i, a) => PARTES.some(p => p[0] === k) && a.indexOf(k) === i && !(k in o));
    return o;
  }

  /* ---------------- do Bestiário do mestre para o livro ---------------- */
  // os números de bater o olho: a vida arredondada, a iniciativa em palavras, o perigo de 1 a 5 pelo tier
  function vidaAprox(n) {
    n = Math.round(+n);
    if (!(n > 0)) return '';
    const p = n < 50 ? 5 : n < 500 ? 10 : 50;
    return '~' + Math.max(p, Math.round(n / p) * p);
  }
  function iniPalavra(v) {
    v = Math.round(+v) || 0;
    return v <= 0 ? 'Lenta' : v <= 3 ? 'Normal' : v <= 6 ? 'Rápida' : v <= 9 ? 'Muito rápida' : 'Relâmpago';
  }
  const PERIGO = { E: 1, D: 2, C: 3, B: 4, A: 5, S: 5 };
  const perigoDe = tier => PERIGO[tier] || 3;
  const bolinhas = n => '●'.repeat(Math.max(0, Math.min(5, n))) + '○'.repeat(5 - Math.max(0, Math.min(5, n)));
  /* A página que um inimigo do Bestiário vira. e: o inimigo (normalizado pelo TC.bestiario); contas: as contas dele
     (TC.bestiario.contas, ou null); bioma / tipo: as tags dele de cada grupo (habitat e tipo de criatura). */
  function deInimigo(e, contas, bioma, tipo) {
    e = ehObj(e) ? e : {};
    const nums = [];
    const barras = contas && Array.isArray(contas.barras) ? contas.barras : [];
    const hp = barras.find(b => b && /^(hp|vida|pv)$/i.test(String(b.n || '').trim())) || barras[0];
    if (hp && vidaAprox(hp.m)) nums.push({ n: 'Vida', v: vidaAprox(hp.m) });
    const ficha = ehObj(e.ficha) ? e.ficha : {};
    nums.push({ n: 'Perigo', v: bolinhas(perigoDe(ficha.tier)) });
    if (contas && typeof contas.ini === 'number') nums.push({ n: 'Iniciativa', v: iniPalavra(contas.ini) });
    if (bioma && bioma.length) nums.push({ n: 'Habitat', v: bioma.slice(0, 4).join(', ') });
    if (tipo && tipo.length) nums.push({ n: 'Tipo', v: tipo.slice(0, 3).join(', ') });
    const saque = [];
    const sq = ehObj(e.saque) ? e.saque : {};
    for (const it of Array.isArray(sq.itens) ? sq.itens : []) if (ehObj(it) && it.nome) saque.push(it.nome);
    for (const it of Array.isArray(ficha.itens) ? ficha.itens : []) if (ehObj(it) && it.nome && (it.chance == null ? 50 : +it.chance) > 0) saque.push(it.nome);
    const comp = ehObj(e.comp) ? e.comp : {};
    return { nome: linha(e.nome, MAX.nome) || 'Criatura sem nome', img: imgOk(e.img), desc: txt(comp.texto, MAX.desc), nums: normNums(nums), fraq: normFraq(e.fraq), saque: normSaque(saque) };
  }
  /* Enviar (de novo) do Bestiário: a página nova nasce com tudo escondido; a que já existe recebe o que veio, menos o
     que o mestre mudou no próprio livro (mao) — a legenda, a revelação e as anotações ficam como estão. */
  function receber(antes, veio, de, agora) {
    const base = antes ? normPagina(antes) : normPagina({ ver: {} });
    const out = Object.assign({}, base);
    for (const k of DO_BESTIARIO) if (!base.mao[k] || !antes) out[k] = veio[k];
    out.de = de || base.de;
    out.enviado = agora || new Date().toISOString();
    if (!antes) out.mao = {};
    return normPagina(out);
  }
  /* Depois de o mestre editar a página no livro: o que ele mudou, de tudo o que veio do Bestiário, fica marcado (mao). */
  function marcarMao(antes, depois) {
    const a = normPagina(antes), d = normPagina(depois), mao = Object.assign({}, a.mao);
    if (d.de) for (const k of DO_BESTIARIO) if (JSON.stringify(a[k]) !== JSON.stringify(d[k])) mao[k] = true;
    d.mao = mao;
    return d;
  }

  /* ---------------- as anotações ---------------- */
  const MAX_NOTA = 500, MAX_NOTAS = 60;
  function normNotas(d) {
    const out = [];
    for (const x of ehObj(d) && Array.isArray(d.notas) ? d.notas : []) {
      if (!ehObj(x) || typeof x.id !== 'string' || !x.id || typeof x.autor !== 'string') continue;
      const texto = txt(x.texto, MAX_NOTA);
      if (!texto) continue;
      out.push({ id: x.id.slice(0, 40), autor: x.autor, nome: linha(x.nome, 60) || 'Alguém do clã', texto, em: typeof x.em === 'string' ? x.em : null, ed: typeof x.ed === 'string' ? x.ed : null });
    }
    return out.slice(0, MAX_NOTAS);
  }
  // a letra de cada um: a mesma pessoa escreve sempre com a mesma (três letras de mão, pela conta da pessoa)
  const LETRAS = ['patrick', 'caveat', 'sombras'];
  function letraDe(autor) {
    let h = 0;
    for (const ch of String(autor || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return LETRAS[h % LETRAS.length];
  }

  /* ---------------- o índice ---------------- */
  const ordenar = l => l.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const letraDoIndice = nome => (sem(nome).replace(/[^a-z0-9]/g, '').charAt(0) || '#').toUpperCase();
  function indice(pags) {
    const out = [];
    pags.forEach((p, i) => { const l = letraDoIndice(p.nome); if (!out.length || out[out.length - 1].l !== l) out.push({ l, i }); });
    return out;
  }
  /* A busca do livro: pelo nome, pelo texto e pelas anotações. */
  function passa(p, notas, q) {
    const s = sem(q).trim();
    if (!s) return true;
    const campos = [p.nome, p.desc || '', p.legenda || '', ...(p.nums || []).map(x => x.n + ' ' + x.v), ...(p.fraq || []).map(x => x.nome), ...(p.saque || []), ...(notas || []).map(x => x.texto + ' ' + x.nome)];
    return campos.some(c => sem(c).includes(s));
  }

  const api = { PRE, PRE_PUB, PARTES, TIPOS_FR, DO_BESTIARIO, MAX, MAX_NOTA, MAX_NOTAS, LETRAS, idCla, idPag, uid, qualDoc,
    idCapa, idPagina, idCapaPub, idPaginaPub, idNotas, normPagina, novaPagina, normCapa, tituloPadrao, temConteudo, projetar, projetarCapa, normPub,
    vidaAprox, iniPalavra, perigoDe, bolinhas, deInimigo, receber, marcarMao, normNotas, letraDe, ordenar, letraDoIndice, indice, passa, normFraq };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.LivroNucleo = api;
})();
