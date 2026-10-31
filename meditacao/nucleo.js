/* Tiny Cats · Meditação: a lógica pura (sem página, sem DOM). Roda igual no navegador (window.MeditacaoNucleo) e no
   Node (testes).
   Os documentos da mesa (ver supabase/migrations/0017_meditacao.sql):
     medit:cena                  o lugar: ambiente, hora, clima, a imagem do mestre (a mesa lê; quem mestra escreve)
     medit:quem                  quem está meditando agora (a mesa lê; escrito pelo banco, ao entrar e sair)
     medit:simbolos              os símbolos prontos que o mestre escondeu e os que ele criou (a mesa lê)
     medit:receitas              as receitas dos pilares (só quem mestra a Meditação)
     medit:treino                as barras de treinamento de cada personagem (só quem mestra)
     medit:pratica:<personagem>  objeto, mantra, representação e a imagem meditando (o dono escreve; ele e quem mestra veem)
     medit:achados:<personagem>  tentativas liberadas e feitas, receitas descobertas e o registro (escrito pelo banco)
     medit:palavras:<personagem> (lote 45) as palavras que o mestre deu ao personagem: o dicionário dele (quem mestra
                                 escreve; o dono e quem mestra veem — ver a 0031). A nota e a estrela do jogador em cada
                                 palavra moram na prática (pal).
   O panteão é o da ficha (ficha.panteao): um campo só, nos dois lugares. */
(() => {
  'use strict';

  /* ---------------- catálogos ---------------- */
  const AMBIENTES = [['templo', 'Templo na montanha'], ['montanha', 'Montanha'], ['floresta', 'Floresta'], ['cachoeira', 'Cachoeira'],
    ['caverna', 'Caverna'], ['jardim', 'Jardim'], ['deserto', 'Deserto'], ['ceu', 'Céu estrelado']];
  const HORAS = [['manha', 'Manhã'], ['tarde', 'Tarde'], ['por', 'Pôr do sol'], ['noite', 'Noite'], ['madrugada', 'Madrugada']];
  // o clima é o da lista do Jornal (os nomes e os ícones vêm de JornalNucleo.CLIMAS); '' é céu limpo
  const CLIMAS = ['sol', 'nublado', 'chuva', 'tempestade', 'neve', 'nevoa', 'vento', 'calor', 'frio'];
  const AMB_NOME = Object.fromEntries(AMBIENTES), HORA_NOME = Object.fromEntries(HORAS);

  /* Os símbolos prontos, em quatro grupos (um traço numa caixa 24×24). O mestre esconde os que a mesa não usa e cria
     os dele (com um destes desenhos, ou um dos DESENHOS abaixo, ou uma imagem). */
  const GRUPOS = [
    { id: 'el', nome: 'Elementos', itens: [
      ['fogo', 'Fogo', 'M12 3c1.8 2.8 5 5.2 5 9.2a5 5 0 0 1-10 0c0-2.2 1.1-3.8 2.2-4.8.2 1.8 1 2.8 2.1 3 .2-2.8-.2-4.8.7-7.4z'],
      ['agua', 'Água', 'M12 3.5c2.9 3.8 6 7.2 6 10.6a6 6 0 0 1-12 0c0-3.4 3.1-6.8 6-10.6z'],
      ['terra', 'Terra', 'M3 19.5h18M4.5 19.5 10 10l3.2 5.2 2.1-3 4.2 7.3'],
      ['ar', 'Ar', 'M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7'],
      ['raio', 'Raio', 'M13.5 2.5 5.5 13.5h6l-1 8 8-11h-6z'],
      ['gelo', 'Gelo', 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.6 4.6 12 7l2.4-2.4M9.6 19.4 12 17l2.4 2.4'],
      ['luz', 'Luz', 'M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1'],
      ['sombra', 'Sombra', 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 1 1 0-5M4 20 20 4'],
    ] },
    { id: 'as', nome: 'Astros', itens: [
      ['sol', 'Sol', 'M12 7a5 5 0 1 1 0 10 5 5 0 1 1 0-10M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1'],
      ['lua', 'Lua', 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z'],
      ['estrela', 'Estrela', 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'],
      ['cometa', 'Cometa', 'M16 12a4 4 0 1 1 0 8 4 4 0 1 1 0-8M13 13.2 4 4.2M15.6 12.1 9.5 6M11.9 15.6 5.8 9.5'],
      ['eclipse', 'Eclipse', 'M10 4a8 8 0 1 1 0 16 8 8 0 1 1 0-16M14 5.2a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 1 1 0-13.6'],
    ] },
    { id: 'an', nome: 'Animais e espíritos', itens: [
      ['serpente', 'Serpente', 'M5 19c2.5 1.5 5.5 1 6-1.5s-2-4 .5-6 6-.5 7-3-1.5-4-3.5-3.5-3 1.5-2.5 2.5M16.8 5.2h.01'],
      ['lobo', 'Lobo', 'M5 4l3 4h8l3-4v8l-3 5-4 3-4-3-3-5zM9.5 12h.01M14.5 12h.01M11 15.5h2'],
      ['corvo', 'Corvo', 'M3 13c3-1 5-4 9-4 2 0 3-2 5-2l4 1-3 2c0 4-3 7-8 7-3 0-5-1-7-4zM16.5 9.4h.01M8 17l-2 4M11 17.4 10 21'],
      ['raposa', 'Raposa', 'M4 4l4 5h8l4-5-1 8-7 8-7-8zM9 12.5h.01M15 12.5h.01'],
      ['dragao', 'Dragão', 'M3 15c4-1 6.5-6 9.5-9.5.2 4 2 6 5 6l3.5-1-2.8 4.2C16.4 17.6 13.6 19 10 19H5zM14.5 9.6h.01'],
      ['coruja', 'Coruja', 'M6 5l3 2h6l3-2v9a6 6 0 0 1-12 0zM9.5 9.5a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 1 1 0-3.2M14.5 9.5a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 1 1 0-3.2M11 14.5h2l-1 1.4z'],
    ] },
    { id: 'ru', nome: 'Runas e glifos', itens: [
      ['g1', 'Glifo I', 'M8 3v18M8 5.5l8 4-8 4'],
      ['g2', 'Glifo II', 'M6 3l12 18M18 3 6 21'],
      ['g3', 'Glifo III', 'M12 3v18M6.5 7.5 12 13l5.5-5.5'],
      ['g4', 'Glifo IV', 'M5 21V3l7 6 7-6v18'],
      ['g5', 'Glifo V', 'M12 3 5 12l7 9 7-9z'],
      ['g6', 'Glifo VI', 'M8 3v18M16 3v18M8 9l8 6'],
    ] },
  ].map(g => ({ id: g.id, nome: g.nome, itens: g.itens.map(([id, nome, d]) => ({ id, nome, d })) }));
  // mais desenhos, para os símbolos que o mestre cria
  const DESENHOS = [
    ['chave', 'Chave', 'M8 15a4 4 0 1 1 0-8 4 4 0 1 1 0 8M11.5 11H21M18 11v3M15 11v2'],
    ['coroa', 'Coroa', 'M4 18h16M4 18 3 7l5 4 4-6 4 6 5-4-1 11'],
    ['espada', 'Espada', 'M14.5 3H21v6.5L10 20.5 3.5 14zM6.5 17.5 3 21M5 12l7 7'],
    ['escudo', 'Escudo', 'M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6z'],
    ['olho', 'Olho', 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM12 9a3 3 0 1 1 0 6 3 3 0 1 1 0-6'],
    ['mao', 'Mão', 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4a1.5 1.5 0 0 1 3 0v6M14 10V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6 7s-5-2-6.5-4.5L3 13.5a1.5 1.5 0 0 1 2.6-1.4L8 15'],
    ['arvore', 'Árvore', 'M12 21v-6M12 15c-4 0-7-2.5-7-6a7 7 0 0 1 14 0c0 3.5-3 6-7 6zM9 21h6'],
    ['flor', 'Flor', 'M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 1 1 0-5M12 9.5C11 6 12 3 12 3s1 3 0 6.5M14.5 12c3.5-1 6.5 0 6.5 0s-3 1-6.5 0M12 14.5c1 3.5 0 6.5 0 6.5s-1-3 0-6.5M9.5 12C6 13 3 12 3 12s3-1 6.5 0'],
    ['onda', 'Onda', 'M2 9c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1M2 15c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1'],
    ['espiral', 'Espiral', 'M12 12a1.5 1.5 0 1 1 1.5 1.5A3 3 0 1 1 10.5 9 4.5 4.5 0 1 1 7.5 15 6 6 0 1 1 18 12'],
    ['coracao', 'Coração', 'M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z'],
    ['ampulheta', 'Ampulheta', 'M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9'],
    ['livro', 'Livro', 'M4 5c3-1.5 5.5-1.5 8 0v14c-2.5-1.5-5-1.5-8 0zM12 5c2.5-1.5 5-1.5 8 0v14c-3-1.5-5.5-1.5-8 0'],
    ['sino', 'Sino', 'M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4'],
    ['mascara', 'Máscara', 'M3 7c6-2 12-2 18 0 0 7-3.5 11-9 11S3 14 3 7zM8.5 11h2M13.5 11h2'],
    ['pena', 'Pena', 'M20 4C11 4 6 9 5 19l3-3M20 4c0 7-5 11-12 12M9 15l5-5'],
  ].map(([id, nome, d]) => ({ id, nome, d }));
  const PRONTOS = new Map();
  for (const g of GRUPOS) for (const s of g.itens) PRONTOS.set(s.id, Object.assign({ grupo: g.id }, s));
  const DESENHO = new Map([...DESENHOS, ...PRONTOS.values()].map(x => [x.id, x.d]));

  const MAX = {
    pilares: 5, minPilares: 2, quem: 40, receitas: 200, nomeReceita: 120, efeito: 4000, meus: 60, nomeSimbolo: 40,
    barras: 30, nomeBarra: 60, maxBarra: 999, objeto: 120, mantra: 300, rep: 1000, achadas: 500, registro: 200,
    palavras: 300, palavra: 40, sentido: 300, notaPal: 600,
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
  // o mesmo que o banco aceita num símbolo (e num id de personagem, de receita, de barra)
  const idOk = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) && v !== '__proto__' ? v : '');
  /* (lote 45) Uma palavra nos pilares vai como "w." + a chave dela: a palavra sem acento, em minúsculas, com hífen no
     lugar do espaço (até 38 letras). O banco confere do mesmo jeito (meditacao_tentar, na 0031). */
  const PAL = 'w.';
  const chavePalavra = v => String(v == null ? '' : v).toLowerCase().replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ß/g, 'ss').replace(/[øð]/g, 'o').replace(/þ/g, 'th').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 38).replace(/-+$/, '');
  const palOk = v => (typeof v === 'string' && /^w\.[a-z0-9-]{1,38}$/.test(v) ? v : '');
  const itemOk = v => idOk(v) || palOk(v);
  const ehPalavra = id => typeof id === 'string' && id.startsWith(PAL) && !!palOk(id);
  const pcOk = v => (typeof v === 'string' && v.length >= 1 && v.length <= 64 && !/[:@\s]/.test(v) && v !== '__proto__' ? v : '');
  // uma imagem: o endereço (https) de uma imagem enviada à mesa, ou, fora de uma mesa, a própria imagem embutida
  const urlOk = v => (typeof v === 'string' && ((v.length <= 600 && /^https:\/\/[^\s"'<>]+$/i.test(v))
    || (v.length <= 3000000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v))) ? v : null);
  const instante = v => (typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v)) ? v : null);
  const inteiro = (v, def, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : def; };
  let seq = 0;
  function novoId(pre) { seq = (seq + 1) % 1296; return pre + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + seq.toString(36); }
  function unico(id, vistos, pre) { let r = id || novoId(pre); while (vistos.has(r)) r = novoId(pre); vistos.add(r); return r; }

  /* ---------------- a cena ---------------- */
  // (o que não é um ambiente, uma hora ou um clima conhecido vale como o de começo — o banco confere do mesmo jeito)
  function normCena(d) {
    d = ehObj(d) ? d : {};
    return {
      v: 1,
      amb: tem(AMB_NOME, d.amb) ? d.amb : 'templo',
      hora: tem(HORA_NOME, d.hora) ? d.hora : 'por',
      clima: CLIMAS.includes(d.clima) ? d.clima : '',
      img: urlOk(d.img),
    };
  }
  // quem está meditando: ids de personagem, sem repetir, na ordem em que entraram
  function normQuem(d) {
    d = ehObj(d) ? d : {};
    const quem = [];
    for (const p of Array.isArray(d.quem) ? d.quem : []) { const id = pcOk(p); if (id && !quem.includes(id) && quem.length < MAX.quem) quem.push(id); }
    return { v: 1, quem };
  }
  const meditando = (quem, pc) => normQuem(quem).quem.includes(pc);

  /* ---------------- os símbolos ---------------- */
  function normSimbolos(d) {
    d = ehObj(d) ? d : {};
    const ocultos = [], meus = [], vistos = new Set();
    for (const id of Array.isArray(d.ocultos) ? d.ocultos : []) if (PRONTOS.has(id) && !ocultos.includes(id)) ocultos.push(id);
    for (const s of Array.isArray(d.meus) ? d.meus : []) {
      if (!ehObj(s) || meus.length >= MAX.meus) continue;
      const nome = linha(s.nome, MAX.nomeSimbolo);
      if (!nome) continue;
      const id = unico(idOk(s.id) && !PRONTOS.has(s.id) ? s.id : '', vistos, 'sm');
      const img = urlOk(s.img), des = DESENHO.has(s.des) ? s.des : null;
      meus.push({ id, nome, des: img ? null : des || 'espiral', img });
    }
    return { v: 1, ocultos, meus };
  }
  // Um símbolo pelo id (pronto ou do mestre): { id, nome, d } ou { id, nome, img }; um que não existe mais: '?'.
  // (lote 45) Uma palavra ("w.chave"): { id, nome (a palavra, como o mestre escreveu, se pals a tem), palavra: chave }.
  function simbolo(simb, id, pals) {
    if (ehPalavra(id)) {
      const k = id.slice(PAL.length), t = pals instanceof Map ? pals.get(k) : ehObj(pals) && tem(pals, k) ? pals[k] : null;
      return { id, nome: typeof t === 'string' && t ? t : k, palavra: k, grupo: 'pal' };
    }
    const p = PRONTOS.get(id);
    if (p) return { id, nome: p.nome, d: p.d, grupo: p.grupo };
    const m = normSimbolos(simb).meus.find(x => x.id === id);
    if (m) return m.img ? { id, nome: m.nome, img: m.img, grupo: 'meus' } : { id, nome: m.nome, d: DESENHO.get(m.des), grupo: 'meus' };
    return { id, nome: '?', d: 'M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4M12 17.5h.01', grupo: null, sumiu: true };
  }
  /* Os grupos de símbolos para os pilares: os prontos que não estão escondidos e os do mestre ("Do mestre").
     comOcultos: para quem mestra, que vê também os escondidos (marcados). */
  function grupos(simb, comOcultos) {
    const s = normSimbolos(simb), oc = new Set(s.ocultos), out = [];
    for (const g of GRUPOS) {
      const itens = g.itens.filter(x => comOcultos || !oc.has(x.id)).map(x => Object.assign({ oculto: oc.has(x.id) }, x));
      if (itens.length) out.push({ id: g.id, nome: g.nome, itens });
    }
    if (s.meus.length) out.push({ id: 'meus', nome: 'Do mestre', itens: s.meus.map(m => simbolo(s, m.id)) });
    return out;
  }
  const seqTxt = (simb, seq, pals) => (Array.isArray(seq) ? seq : []).map(id => { const x = simbolo(simb, id, pals); return x.palavra ? '“' + x.nome + '”' : x.nome; }).join(' → ');

  /* ---------------- (lote 45) as palavras ---------------- */
  // O dicionário de um personagem: { v, lista: [{ id, p (a palavra), k (a chave), s (o sentido), n (a nota do mestre), em }] },
  // sem duas com a mesma chave.
  function normPalavras(d) {
    d = ehObj(d) ? d : {};
    const lista = [], vistos = new Set(), chaves = new Set();
    for (const x of Array.isArray(d.lista) ? d.lista : []) {
      if (!ehObj(x) || lista.length >= MAX.palavras) continue;
      const p = linha(x.p, MAX.palavra), k = chavePalavra(p);
      if (!k || chaves.has(k)) continue;
      chaves.add(k);
      lista.push({ id: unico(idOk(x.id), vistos, 'pw'), p, k, s: texto(x.s, MAX.sentido).trim(), n: texto(x.n, MAX.notaPal).trim(), em: instante(x.em) });
    }
    return { v: 1, lista };
  }
  // chave → a palavra, juntando vários dicionários (para mostrar as palavras dos pilares e das receitas)
  function mapaPalavras(...docs) {
    const m = new Map();
    for (const d of docs) for (const x of normPalavras(d).lista) if (!m.has(x.k)) m.set(x.k, x.p);
    return m;
  }
  const temPalavra = (pals, k) => normPalavras(pals).lista.some(x => x.k === k);
  // As palavras de uma sequência que o dicionário não tem (chaves).
  const palavrasFora = (pals, seq) => (Array.isArray(seq) ? seq : []).filter(ehPalavra).map(id => id.slice(PAL.length)).filter(k => !temPalavra(pals, k));
  /* Onde uma palavra já foi usada (pelo registro do personagem): quantas tentativas a levaram e as receitas descobertas
     com ela (os nomes, sem repetir). */
  function usosDaPalavra(ach, k) {
    const id = PAL + k, a = normAchados(ach), receitas = [];
    let tentativas = 0;
    for (const r of a.reg) {
      if (r.tipo !== 'tentou' || !r.seq.includes(id)) continue;
      tentativas++;
      if (r.res && r.nome && !receitas.includes(r.nome)) receitas.push(r.nome);
    }
    return { tentativas, receitas };
  }

  /* ---------------- as receitas ---------------- */
  function normSeq(v) {
    const out = [];
    for (const id of Array.isArray(v) ? v : []) { const x = itemOk(id); if (x && out.length < MAX.pilares) out.push(x); }
    return out;
  }
  function normReceitas(d) {
    d = ehObj(d) ? d : {};
    const lista = [], vistos = new Set();
    for (const r of Array.isArray(d.lista) ? d.lista : []) {
      if (!ehObj(r) || lista.length >= MAX.receitas) continue;
      const quem = Array.isArray(r.quem) ? [...new Set(r.quem.map(pcOk).filter(Boolean))].slice(0, 100) : null;
      lista.push({
        id: unico(idOk(r.id), vistos, 'rc'),
        nome: linha(r.nome, MAX.nomeReceita) || 'Receita sem nome',
        seq: normSeq(r.seq),
        efeito: texto(r.efeito, MAX.efeito),
        onde: tem(AMB_NOME, r.onde) ? r.onde : null,
        quem: quem && quem.length ? quem : null,
      });
    }
    return { v: 1, lista };
  }
  const receitaPronta = r => !!r && r.seq.length >= MAX.minPilares;
  // A receita que casa com a tentativa (a primeira), do jeito que o banco confere (meditacao_tentar): a mesma
  // sequência, na ordem; valendo naquele ambiente; para aquele personagem.
  function receitaQueCasa(rec, seq, amb, pc) {
    const s = normSeq(seq), alvo = JSON.stringify(s);
    if (s.length < MAX.minPilares) return null;
    return normReceitas(rec).lista.find(r => JSON.stringify(r.seq) === alvo && (!r.onde || r.onde === amb) && (!r.quem || r.quem.includes(pc))) || null;
  }
  // Duas receitas com a mesma sequência que podem valer ao mesmo tempo: só a primeira seria achada.
  function repetidas(rec) {
    const l = normReceitas(rec).lista, out = [];
    l.forEach((a, i) => {
      for (let k = 0; k < i; k++) {
        const b = l[k];
        if (JSON.stringify(a.seq) !== JSON.stringify(b.seq) || !receitaPronta(a)) continue;
        if (a.onde && b.onde && a.onde !== b.onde) continue;
        if (a.quem && b.quem && !a.quem.some(p => b.quem.includes(p))) continue;
        out.push({ id: a.id, antes: b.id }); break;
      }
    });
    return out;
  }

  /* ---------------- o treinamento ---------------- */
  function normBarra(b, vistos) {
    const max = inteiro(b.max, 10, 1, MAX.maxBarra), n = inteiro(b.n, 0, 0, max);
    return { id: unico(idOk(b.id), vistos, 'tb'), nome: linha(b.nome, MAX.nomeBarra) || 'Treinamento', max, n, cheia: n >= max ? instante(b.cheia) : null };
  }
  function normTreino(d) {
    d = ehObj(d) ? d : {};
    const pcs = {};
    if (ehObj(d.pcs)) for (const k of Object.keys(d.pcs)) {
      const pc = pcOk(k);
      if (!pc || !Array.isArray(d.pcs[k])) continue;
      const vistos = new Set(), l = d.pcs[k].filter(ehObj).slice(0, MAX.barras).map(b => normBarra(b, vistos));
      if (l.length) pcs[pc] = l;
    }
    return { v: 1, pcs };
  }
  // Somar (ou tirar) pontos numa barra; cheia, guarda quando encheu. → o documento novo (ou null se nada mudou)
  function somarTreino(treino, pc, id, delta, quando) {
    const t = normTreino(treino), l = t.pcs[pc], b = l && l.find(x => x.id === id);
    if (!b) return null;
    const n = Math.max(0, Math.min(b.max, b.n + Math.trunc(Number(delta) || 0)));
    if (n === b.n) return null;
    b.n = n;
    b.cheia = n >= b.max ? (b.cheia || instante(quando) || new Date().toISOString()) : null;
    return t;
  }

  /* ---------------- a prática e o que a meditação guardou ---------------- */
  function normPratica(d) {
    d = ehObj(d) ? d : {};
    const out = { v: 1, objeto: linha(d.objeto, MAX.objeto), mantra: linha(d.mantra, MAX.mantra), rep: texto(d.rep, MAX.rep), img: urlOk(d.img) };
    // (lote 45) a nota e a estrela do jogador em cada palavra do dicionário: { id da palavra: { n, f } } (só as que têm algo)
    if (ehObj(d.pal)) {
      const pal = {};
      let n = 0;
      for (const k of Object.keys(d.pal)) {
        const x = d.pal[k], id = idOk(k);
        if (!id || !ehObj(x) || n >= MAX.palavras) continue;
        const nota = texto(x.n, MAX.notaPal).trim(), f = x.f === true;
        if (!nota && !f) continue;
        pal[id] = f ? { n: nota, f: true } : { n: nota }; n++;
      }
      if (n) out.pal = pal;
    }
    return out;
  }
  function normAchados(d) {
    d = ehObj(d) ? d : {};
    const feitas = inteiro(d.feitas, 0, 0, 100000), lib = Math.max(feitas, inteiro(d.lib, 0, 0, 100000));
    const achadas = [];
    for (const a of Array.isArray(d.achadas) ? d.achadas : []) {
      if (!ehObj(a) || !idOk(a.id) || achadas.some(x => x.id === a.id) || achadas.length >= MAX.achadas) continue;
      achadas.push({ id: a.id, nome: linha(a.nome, MAX.nomeReceita) || 'Receita', efeito: texto(a.efeito, MAX.efeito), em: instante(a.em), amb: tem(AMB_NOME, a.amb) ? a.amb : null });
    }
    const reg = [];
    for (const r of Array.isArray(d.reg) ? d.reg : []) {
      if (!ehObj(r) || (r.tipo !== 'entrou' && r.tipo !== 'tentou') || reg.length >= MAX.registro) continue;
      reg.push({ em: instante(r.em), tipo: r.tipo, amb: tem(AMB_NOME, r.amb) ? r.amb : null, hora: tem(HORA_NOME, r.hora) ? r.hora : null,
        clima: CLIMAS.includes(r.clima) ? r.clima : '', seq: r.tipo === 'tentou' ? normSeq(r.seq) : null, res: r.tipo === 'tentou' && idOk(r.res) ? r.res : null,
        nome: r.tipo === 'tentou' ? linha(r.nome, MAX.nomeReceita) : '', por: r.por === 'mestre' ? 'mestre' : 'dono' });
    }
    return { lib, feitas, achadas, reg };
  }
  const liberada = ach => { const a = normAchados(ach); return a.lib > a.feitas; };
  const ultimaTentativa = ach => normAchados(ach).reg.find(r => r.tipo === 'tentou') || null;

  /* Fora de uma mesa (a página sozinha), o que o banco faz é feito aqui, do mesmo jeito: entrar, liberar e tentar.
     Recebem e devolvem os documentos (sem mexer nos de entrada). */
  const agora = q => instante(q) || new Date().toISOString();
  function localEntrar(quem, cena, ach, pc, entrar, quando, porMestre) {
    const q = normQuem(quem), c = normCena(cena), a = normAchados(ach), estava = q.quem.includes(pc);
    if (entrar && !estava) {
      if (q.quem.length >= MAX.quem) return { ok: false, msg: 'Já há gente demais meditando nesta cena.' };
      q.quem.push(pc);
      a.reg.unshift({ em: agora(quando), tipo: 'entrou', amb: c.amb, hora: c.hora, clima: c.clima, seq: null, res: null, nome: '', por: porMestre ? 'mestre' : 'dono' });
      a.reg = a.reg.slice(0, MAX.registro);
    } else if (!entrar) q.quem = q.quem.filter(x => x !== pc);
    return { ok: true, quem: q, achados: a };
  }
  function localLiberar(ach, mais) {
    const a = normAchados(ach);
    a.lib = Math.max(a.feitas, Math.min(a.feitas + 5, a.lib + (Math.trunc(Number(mais)) || 1)));
    return a;
  }
  function localTentar(quem, cena, ach, rec, pc, seq, quando, pals) {
    const c = normCena(cena), a = normAchados(ach), s = normSeq(seq);
    if (!normQuem(quem).quem.includes(pc)) return { ok: false, msg: 'O personagem não está meditando.' };
    if (s.length < MAX.minPilares || s.length !== (Array.isArray(seq) ? seq.length : 0)) return { ok: false, msg: 'Ponha de 2 a 5 símbolos ou palavras nos pilares.' };
    if (palavrasFora(pals, s).length) return { ok: false, msg: 'Uma das palavras não está no dicionário do personagem.' };
    if (a.lib <= a.feitas) return { ok: false, msg: 'O mestre ainda não liberou uma tentativa.' };
    const r = receitaQueCasa(rec, s, c.amb, pc), em = agora(quando);
    let nova = false;
    if (r && !a.achadas.some(x => x.id === r.id)) { nova = true; a.achadas.push({ id: r.id, nome: r.nome, efeito: r.efeito, em, amb: c.amb }); }
    a.feitas++;
    a.reg.unshift({ em, tipo: 'tentou', amb: c.amb, hora: c.hora, clima: c.clima, seq: s, res: r ? r.id : null, nome: r ? r.nome : '', por: 'dono' });
    a.reg = a.reg.slice(0, MAX.registro);
    return { ok: true, achados: a, res: r ? { res: 'achou', nova, id: r.id, nome: r.nome, efeito: r.efeito } : { res: 'nada' } };
  }

  const MeditacaoNucleo = {
    AMBIENTES, HORAS, CLIMAS, AMB_NOME, HORA_NOME, GRUPOS, DESENHOS, MAX, novoId,
    normCena, normQuem, meditando, normSimbolos, simbolo, grupos, seqTxt,
    PAL, chavePalavra, palOk, ehPalavra, normPalavras, mapaPalavras, temPalavra, palavrasFora, usosDaPalavra,
    normReceitas, receitaPronta, receitaQueCasa, repetidas,
    normTreino, somarTreino, normPratica, normAchados, liberada, ultimaTentativa,
    localEntrar, localLiberar, localTentar,
  };
  if (typeof module === 'object' && module && module.exports) module.exports = MeditacaoNucleo;
  if (typeof window !== 'undefined') window.MeditacaoNucleo = MeditacaoNucleo;
})();
