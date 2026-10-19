/* Tiny Cats · Mapa-múndi · a corte (lote 11): as contas dos personagens do mundo e das casas, sem página e sem DOM.
   O modelo (mapa.corte, normalizado no núcleo): os personagens (o nome, o gênero, a casa, a facção, o cargo na corte da
   facção, o nascimento e a morte pela data do mundo, os pais e os cônjuges, onde está, a ficha das Fichas, o que os
   jogadores sabem, a nota do mestre e se os jogadores conhecem), as casas (o nome, o brasão, o lema e o chefe) e os
   cargos da corte de cada facção (sem a lista guardada, os de começo).
   Aqui: os cargos de uma facção, a idade (hoje, ou na morte), a data em texto (só o ano, o mês e o ano, ou tudo), os
   pais, os filhos, os cônjuges, os descendentes (para não deixar ninguém ser antepassado de si mesmo), quem está num
   lugar (os vivos) e os membros de uma casa (os vivos primeiro); (parte 1b) a árvore da família de uma casa (onde fica
   cada pessoa, os casais e os filhos); (parte 2a) os títulos (os graus, o nome do título e o de quem tem, os títulos de
   alguém e de uma terra, o maior junto do nome, o governante de uma facção, a maioridade).
   Roda no navegador (window.MundoCorte) e no Node (testes). */
(() => {
  'use strict';
  const NN = () => (typeof window !== 'undefined' && window.MundoNucleo) || (typeof require === 'function' ? require('./nucleo.js') : null);
  const ehObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const VAZIA = { pessoas: [], casas: [], cargos: {}, titulos: [] };
  // a corte do mapa (sem ela, uma vazia)
  const corteDe = m => (ehObj(m) && ehObj(m.corte) ? m.corte : VAZIA);
  const pessoaDe = (m, id) => (id ? corteDe(m).pessoas.find(p => p.id === id) || null : null);
  const casaDe = (m, id) => (id ? corteDe(m).casas.find(c => c.id === id) || null : null);
  const vivo = p => !!p && !p.morte;
  // os cargos da corte de uma facção: os que o mestre guardou, ou os de começo (sem facção, nenhum)
  function cargosDe(m, fid) {
    if (!fid) return [];
    const c = corteDe(m).cargos;
    return Array.isArray(c[fid]) ? c[fid] : NN().CARGOS_INICIAIS;
  }
  const cargoDe = (m, p) => (p && p.cargo ? cargosDe(m, p.fac).find(c => c.id === p.cargo) || null : null);
  // a data de hoje no formato dos personagens: { a, m, d }
  function hoje(m) {
    const N = NN(), d = N.dataDe(m && m.cal, m && m.cal ? m.cal.dia : 0);
    return { a: d.ano, m: d.mes, d: d.diaMes };
  }
  /* A idade em anos: hoje, ou na morte (sem saber o mês ou o dia de uma das duas datas, só pelos anos). null sem o
     nascimento; negativa: ainda não nasceu. */
  function idadeDe(m, p) {
    if (!p || !p.nasc) return null;
    const ref = p.morte || hoje(m), n = p.nasc;
    let anos = ref.a - n.a;
    if (n.m != null && ref.m != null && (ref.m < n.m || (ref.m === n.m && n.d != null && ref.d != null && ref.d < n.d))) anos--;
    return anos;
  }
  // a data em texto: "14 de Degelo, ano 312", "Degelo do ano 312" ou "ano 312" ('' sem a data)
  function dataTxt(m, dt) {
    if (!ehObj(dt) || !Number.isFinite(dt.a)) return '';
    const cal = m && m.cal, meses = cal && Array.isArray(cal.meses) && cal.meses.length ? cal.meses : NN().CAL_PADRAO.meses;
    const era = cal && typeof cal.era === 'string' && cal.era.trim() ? ' ' + cal.era.trim() : '';
    const mes = dt.m != null && meses[dt.m] ? String(meses[dt.m].nome || 'Mês ' + (dt.m + 1)) : '';
    return (mes ? (dt.d ? dt.d + ' de ' + mes + ', ano ' : mes + ' do ano ') : 'ano ') + dt.a + era;
  }
  const paisDe = (m, p) => (p ? p.pais.map(id => pessoaDe(m, id)).filter(Boolean) : []);
  const conjugesDe = (m, p) => (p ? p.conj.map(id => pessoaDe(m, id)).filter(Boolean) : []);
  // os filhos (na ordem da lista)
  const filhosDe = (m, p) => (p ? corteDe(m).pessoas.filter(q => q.pais.includes(p.id)) : []);
  // os descendentes de alguém (os filhos, os netos…): um Set de ids
  function descendentesDe(m, id) {
    const out = new Set(), fila = [id];
    while (fila.length) {
      const x = fila.shift();
      for (const q of corteDe(m).pessoas) if (q.pais.includes(x) && !out.has(q.id)) { out.add(q.id); fila.push(q.id); }
    }
    return out;
  }
  // quem está num lugar (um marcador ou um grupo): só os vivos
  const quemEsta = (m, objId) => (objId ? corteDe(m).pessoas.filter(p => vivo(p) && p.onde && p.onde.id === objId) : []);
  // os membros de uma casa (os vivos primeiro, cada grupo na ordem da lista); casaId null: os sem casa
  function membrosDe(m, casaId) {
    const l = corteDe(m).pessoas.filter(p => (p.casa || null) === (casaId || null));
    return l.filter(vivo).concat(l.filter(p => !vivo(p)));
  }
  // o rótulo de um laço pelo gênero: pai/mãe, filho/filha, marido/esposa (sem o gênero, o neutro)
  const LACOS = { pai: { h: 'pai', m: 'mãe', '': 'pai ou mãe', o: 'pai ou mãe' }, filho: { h: 'filho', m: 'filha', '': 'filho ou filha', o: 'filho ou filha' },
    conj: { h: 'marido', m: 'esposa', '': 'cônjuge', o: 'cônjuge' } };
  const laco = (tipo, p) => (LACOS[tipo] || {})[(p && p.gen) || ''] || '';

  /* ---------------- (parte 2a) os títulos ----------------
     Os graus (do maior para o menor: os guardados, ou os de começo), o nome do título ("Ducado de Valmor": o grau e o
     "de quê" — o escrito, ou "de" + o nome da terra; sem grau, o nome livre), o de quem tem ("Duquesa de Valmor", pelo
     gênero; sem a forma, a de homem), os títulos de alguém (do maior grau para o menor; os sem grau por último), o
     maior junto do nome ("Ana, Duquesa de Valmor"), os títulos de uma terra, o governante de uma facção (quem tem o
     maior título preso a ela) e a maioridade (o titular menor de idade). */
  const titulosDaCorte = m => corteDe(m).titulos || [];
  const tituloDe = (m, id) => (id ? titulosDaCorte(m).find(t => t.id === id) || null : null);
  const grausDe = m => (Array.isArray(corteDe(m).graus) ? corteDe(m).graus : NN().GRAUS_INICIAIS);
  const grauDe = (m, t) => (t && t.grau ? grausDe(m).find(g => g.id === t.grau) || null : null);
  // a terra do título: a região, o marcador ou a facção (null: sem terra, ou ela não existe)
  function terraDe(m, t) {
    const pr = t && t.preso;
    if (!pr || !ehObj(m)) return null;
    if (pr.t === 'f') return (Array.isArray(m.faccoes) ? m.faccoes : []).find(f => f.id === pr.id) || null;
    return (Array.isArray(m.objs) ? m.objs : []).find(o => o.id === pr.id && o.k === pr.t) || null;
  }
  // o nome da terra (a região e a facção: o nome escrito; o marcador sem nome: o do ícone)
  function nomeDaTerra(m, t) {
    const x = terraDe(m, t);
    if (!x) return '';
    const n = String(x.nome || '').trim();
    if (n || t.preso.t !== 'm') return n;
    const I = NN().ICONES;
    return (I[x.ic] || I.cidade).nome;
  }
  // o "de quê": o escrito pelo mestre, ou "de" + o nome da terra ('' sem os dois)
  function deQue(m, t) {
    if (t.de) return t.de;
    const n = nomeDaTerra(m, t);
    return n ? 'de ' + n : '';
  }
  const comDe = (base, d) => base + (d ? ' ' + d : '');
  function nomeDoTitulo(m, t) {
    if (!t) return '';
    const g = grauDe(m, t);
    return g ? comDe(g.nome, deQue(m, t)) : t.nome || 'Título sem nome';
  }
  // a forma de quem tem o grau, pelo gênero (sem ela, a de homem; sem nenhuma, o nome do grau)
  const formaDoGrau = (g, gen) => (gen === 'm' ? g.m : gen === 'o' ? g.o : g.h) || g.h || g.m || g.nome;
  function tituloDoTitular(m, t, p) {
    if (!t) return '';
    const g = grauDe(m, t);
    return g ? comDe(formaDoGrau(g, p ? p.gen : ''), deQue(m, t)) : t.nome || 'Título sem nome';
  }
  // a ordem dos graus (o maior primeiro; sem grau, por último; empate: a ordem da lista)
  function porGrau(m, l) {
    const gs = grausDe(m), ordem = new Map(titulosDaCorte(m).map((t, i) => [t.id, i]));
    const pos = t => { const i = t.grau ? gs.findIndex(g => g.id === t.grau) : -1; return i < 0 ? gs.length : i; };
    return l.slice().sort((a, b) => pos(a) - pos(b) || ordem.get(a.id) - ordem.get(b.id));
  }
  const titulosDe = (m, pid) => (pid ? porGrau(m, titulosDaCorte(m).filter(t => t.tit === pid)) : []);
  const maiorTituloDe = (m, pid) => titulosDe(m, pid)[0] || null;
  function nomeComTitulo(m, p) {
    if (!p) return '';
    const t = maiorTituloDe(m, p.id);
    return t ? p.nome + ', ' + tituloDoTitular(m, t, p) : p.nome;
  }
  // os títulos presos a uma terra (tipo: 'r', 'm' ou 'f'), do maior para o menor
  const titulosDaTerra = (m, tipo, id) => (id ? porGrau(m, titulosDaCorte(m).filter(t => t.preso && t.preso.t === tipo && t.preso.id === id)) : []);
  // o governante de uma facção: quem tem o maior título preso a ela → { titulo, pessoa } ou null
  function governanteDe(m, fid) {
    for (const t of titulosDaTerra(m, 'f', fid)) { const p = pessoaDe(m, t.tit); if (p) return { titulo: t, pessoa: p }; }
    return null;
  }
  const maioridadeDe = m => (Number.isInteger(corteDe(m).maior) ? corteDe(m).maior : NN().MAIORIDADE);
  // menor de idade: vivo, já nascido e abaixo da maioridade (sem o nascimento, não se sabe: não)
  function menorDeIdade(m, p) {
    const i = idadeDe(m, p);
    return vivo(p) && i != null && i >= 0 && i < maioridadeDe(m);
  }
  // os títulos em que alguém aparece: os que tem, de que é herdeiro escolhido, regente ou pretendente
  function papeisNosTitulos(m, pid) {
    const l = titulosDaCorte(m);
    return { tem: titulosDe(m, pid), herdeiro: porGrau(m, l.filter(t => t.herd === pid)), regente: porGrau(m, l.filter(t => t.reg === pid)),
      pretende: porGrau(m, l.filter(t => t.pret.some(x => x.p === pid))).map(t => ({ titulo: t, mot: t.pret.find(x => x.p === pid).mot })) };
  }

  /* ---------------- (parte 2b) a sucessão ----------------
     A regra de um título (a dele, a do reino dele, ou a de começo: primogenitura, homens e mulheres por igual) e a linha
     de sucessão: o herdeiro escolhido na frente (vivo); "o mestre escolhe", só ele. Na antiguidade, os vivos da casa do
     titular, do mais velho para o mais novo (sem ninguém na casa, como na primogenitura). Na primogenitura (e na
     partilha), os filhos do titular do mais velho para o mais novo (na ultimogenitura, do mais novo), cada um com a linha
     dele (os netos…) antes do irmão seguinte; depois, subindo pela árvore: os pais (vivos, herdam) e os outros
     descendentes deles (os irmãos, os sobrinhos), os avós (os tios, os primos)… O gênero: homens primeiro (ou mulheres
     primeiro) em cada leva de irmãos; só homens (ou só mulheres) — a linha só passa por eles. Os mortos não herdam, mas
     a linha passa por eles (os filhos herdam no lugar). Sem titular, a linha sai do último titular de antes que está na
     corte. */
  const regraDe = (m, t) => (t && t.regra) || regraDoReino(m, t && t.fac);
  function regraDoReino(m, fid) {
    const rs = corteDe(m).regras;
    return (fid && ehObj(rs) && rs[fid]) || NN().REGRA_PADRAO;
  }
  // a regra em texto curto: "Primogenitura · por igual", "Antiguidade · só homens", "O mestre escolhe"
  const GEN_CURTO = { igual: 'por igual', homens: 'homens primeiro', sohomens: 'só homens', mulheres: 'mulheres primeiro', somulheres: 'só mulheres' };
  function textoRegra(r) {
    const N = NN();
    if (!r || !N.FORMAS_SUC[r.forma]) return '';
    return r.forma === 'eletiva' ? N.FORMAS_SUC.eletiva : N.FORMAS_SUC[r.forma] + ' · ' + (GEN_CURTO[r.gen] || GEN_CURTO.igual);
  }
  // a ordem de nascimento (o mais velho primeiro; maisNovo: o contrário); sem o nascimento, depois, na ordem da lista
  function porIdade(m, l, maisNovo) {
    const ordem = new Map(corteDe(m).pessoas.map((p, i) => [p.id, i]));
    const chave = p => (p.nasc ? [p.nasc.a, p.nasc.m == null ? -1 : p.nasc.m, p.nasc.d == null ? 0 : p.nasc.d] : null);
    return l.slice().sort((a, b) => {
      const x = chave(a), y = chave(b);
      if (x && y) { for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return maisNovo ? y[i] - x[i] : x[i] - y[i]; }
      else if (x || y) return x ? -1 : 1;
      return ordem.get(a.id) - ordem.get(b.id);
    });
  }
  const ehHomem = p => p.gen === 'h', ehMulher = p => p.gen === 'm';
  function peloGenero(l, gen) {
    if (gen === 'sohomens') return l.filter(ehHomem);
    if (gen === 'somulheres') return l.filter(ehMulher);
    if (gen === 'homens') return l.filter(ehHomem).concat(l.filter(p => !ehHomem(p)));
    if (gen === 'mulheres') return l.filter(ehMulher).concat(l.filter(p => !ehMulher(p)));
    return l;
  }
  // o laço com o titular, para a linha: u = quantas gerações acima, d = quantas abaixo a partir dali
  const SUC_LACOS = { filho: ['filho', 'filha'], neto: ['neto', 'neta'], bisneto: ['bisneto', 'bisneta'], pai: ['pai', 'mãe'], avo: ['avô', 'avó'],
    irmao: ['irmão', 'irmã'], sobrinho: ['sobrinho', 'sobrinha'], tio: ['tio', 'tia'], primo: ['primo', 'prima'] };
  function lacoNaLinha(p, u, d) {
    const k = u === 0 ? [null, 'filho', 'neto', 'bisneto'][d] : d === 0 ? [null, 'pai', 'avo'][u] : u === 1 ? [null, 'irmao', 'sobrinho'][d] : u === 2 ? [null, 'tio', 'primo'][d] : null;
    if (!k) return u === 0 ? 'descendente' : 'parente';
    const [a, b] = SUC_LACOS[k];
    return p.gen === 'h' ? a : p.gen === 'm' ? b : a + ' ou ' + b;
  }
  // → [{ id, por }] (por: o laço com o titular, "herdeiro escolhido" ou "da casa"), até max (8)
  function linhaDeSucessao(m, t, max) {
    const lim = max || 8, out = [], vistos = new Set(), regra = regraDe(m, t);
    const por = (p, rot) => { if (out.length < lim && !out.some(x => x.id === p.id)) out.push({ id: p.id, por: rot }); };
    if (!t) return out;
    const he = pessoaDe(m, t.herd);
    if (he && vivo(he) && he.id !== t.tit) por(he, he.gen === 'm' ? 'herdeira escolhida' : 'herdeiro escolhido');
    if (regra.forma === 'eletiva') return out;
    let raiz = pessoaDe(m, t.tit);
    for (let i = t.hist.length - 1; i >= 0 && !raiz; i--) raiz = pessoaDe(m, t.hist[i].p);
    if (!raiz) return out;
    if (regra.forma === 'antig' && raiz.casa) {
      const l = peloGenero(porIdade(m, corteDe(m).pessoas.filter(q => q.casa === raiz.casa && q.id !== raiz.id && vivo(q))), regra.gen);
      if (l.length) { for (const q of l) por(q, 'da casa'); return out; }
    }
    const filhos = p => peloGenero(porIdade(m, filhosDe(m, p), regra.forma === 'ultimo'), regra.gen);
    const desce = (p, u, d) => {
      for (const f of filhos(p)) {
        if (out.length >= lim) return;
        if (vistos.has(f.id)) continue;
        vistos.add(f.id);
        if (vivo(f)) por(f, lacoNaLinha(f, u, d));
        desce(f, u, d + 1);
      }
    };
    vistos.add(raiz.id);
    desce(raiz, 0, 1);
    let nivel = [raiz];
    for (let u = 1; u <= 6 && out.length < lim; u++) {
      const pais = [];
      for (const q of nivel) for (const a of peloGenero(paisDe(m, q), regra.gen)) if (!vistos.has(a.id) && !pais.includes(a)) pais.push(a);
      if (!pais.length) break;
      for (const a of pais) { vistos.add(a.id); if (vivo(a)) por(a, lacoNaLinha(a, u, 0)); desce(a, u, 1); }
      nivel = pais;
    }
    return out;
  }
  /* A sucessão de alguém (que morreu): cada título dele (do maior para o menor), com a regra, a linha e o herdeiro de
     começo (o primeiro da linha; na partilha, os títulos divididos entre os filhos vivos — o maior com o mais velho —,
     menos os que têm herdeiro escolhido) e o regente de começo (o herdeiro menor de idade: um dos pais dele, vivo); e,
     se ele era o chefe de uma casa, o novo chefe (quem herda o maior título, se for da casa; senão, o mais velho dela).
     → { pessoa, itens: [{ titulo, regra, linha, herdeiro, regente }], casa: { casa, chefe } | null } ou null */
  function sucessaoDe(m, pid) {
    const p = pessoaDe(m, pid);
    if (!p) return null;
    const itens = titulosDe(m, pid).map(t => { const regra = regraDe(m, t), linha = linhaDeSucessao(m, t, 8); return { titulo: t, regra, linha, herdeiro: linha[0] ? linha[0].id : null, regente: null }; });
    const livres = itens.filter(x => x.regra.forma === 'partilha' && !(pessoaDe(m, x.titulo.herd) && vivo(pessoaDe(m, x.titulo.herd))));
    if (livres.length > 1) {
      const filhos = peloGenero(porIdade(m, filhosDe(m, p)), livres[0].regra.gen).filter(vivo);
      if (filhos.length) livres.forEach((x, i) => { x.herdeiro = filhos[i % filhos.length].id; });
    }
    for (const x of itens) {
      const h = pessoaDe(m, x.herdeiro);
      if (h && menorDeIdade(m, h)) { const ps = paisDe(m, h).filter(q => vivo(q) && q.id !== pid); x.regente = ps[0] ? ps[0].id : null; }
    }
    const casa = corteDe(m).casas.find(c => c.chefe === pid) || null;
    let chefe = null;
    if (casa) {
      const h0 = itens[0] ? pessoaDe(m, itens[0].herdeiro) : null;
      if (h0 && h0.casa === casa.id && vivo(h0)) chefe = h0.id;
      else { const l = porIdade(m, corteDe(m).pessoas.filter(q => q.casa === casa.id && q.id !== pid && vivo(q))); chefe = l[0] ? l[0].id : null; }
    }
    return { pessoa: p, itens, casa: casa ? { casa, chefe } : null };
  }
  /* Aplica a sucessão na corte c (uma cópia do mapa, dentro do Desfazer): cada título de pid escolhido vai para o
     herdeiro (ou fica vago) desde a data, com o regente; pid vai para os titulares de antes (desde quando tinha, até a
     data; cheia a lista, sai o mais antigo); a casa de que ele era o chefe ganha o novo chefe. escolhas: [{ titulo,
     herdeiro, regente }]; chefe: o novo chefe (undefined: não mexe). → quantos títulos mudaram */
  function aplicarSucessao(c, pid, escolhas, chefe, data) {
    const p = c.pessoas.find(x => x.id === pid), lim = (NN().LIMITES || {}).titularesAntes || 40;
    let n = 0;
    for (const e of escolhas) {
      const t = c.titulos.find(x => x.id === e.titulo);
      if (!t || t.tit !== pid) continue;
      t.hist.push({ p: pid, nome: p ? p.nome : '', de: t.desde || null, ate: data || null });
      while (t.hist.length > lim) t.hist.shift();
      t.tit = e.herdeiro || null;
      t.desde = t.tit ? data || null : null;
      t.reg = t.tit && e.regente && e.regente !== t.tit ? e.regente : null;
      if (t.herd && t.herd === t.tit) t.herd = null;
      n++;
    }
    if (chefe !== undefined) { const casa = c.casas.find(x => x.chefe === pid); if (casa) casa.chefe = chefe || null; }
    return n;
  }

  /* ---------------- (parte 1b) a árvore da família de uma casa ----------------
     Quem entra: os membros da casa e os cônjuges deles (os de outra casa também). A geração de cada um sai dos pais (a
     de cima é a 0); quem casou com alguém da casa e não tem os pais na árvore fica na geração do cônjuge. Em cada
     geração, cada membro vem com os cônjuges de fora logo ao lado; os filhos ficam na ordem do meio dos pais (o primeiro
     da lista desempata). → { nos: [{ id, x, y }] (o canto de cima, à esquerda), casais: [[a, b]], filhos: [{ pais: [a, b?],
     id }], larg, alt } — vazia sem ninguém. LAR/ALT: o tamanho de cada caixa; os vãos entre elas. */
  const LAR = 156, ALT = 48, VAO = 26, VAO_G = 64;
  function arvoreDaCasa(m, casaId) {
    const todas = corteDe(m).pessoas, ordem = new Map(todas.map((p, i) => [p.id, i]));
    const membros = todas.filter(p => casaId && p.casa === casaId), dentro = new Set(membros.map(p => p.id));
    for (const p of membros) for (const id of p.conj) dentro.add(id);
    const ps = todas.filter(p => dentro.has(p.id)), por = new Map(ps.map(p => [p.id, p]));
    const vazia = { nos: [], casais: [], filhos: [], larg: 0, alt: 0 };
    if (!ps.length) return vazia;
    const paisDentro = p => p.pais.filter(id => por.has(id));
    // a geração: pelos pais (ninguém é antepassado de si mesmo: a subida termina); o cônjuge sem pais na árvore, a do outro
    const g = new Map();
    const geracao = (p, pilha) => {
      if (g.has(p.id)) return g.get(p.id);
      if (pilha.has(p.id)) return 0;
      pilha.add(p.id);
      const pp = paisDentro(p), v = pp.length ? 1 + Math.max(...pp.map(id => geracao(por.get(id), pilha))) : 0;
      pilha.delete(p.id);
      g.set(p.id, v);
      return v;
    };
    for (const p of ps) geracao(p, new Set());
    for (let volta = 0; volta < ps.length; volta++) {
      let mudou = false;
      for (const p of ps) {
        if (paisDentro(p).length) continue;
        const cs = p.conj.filter(id => por.has(id)).map(id => g.get(id));
        if (cs.length) { const alvo = Math.max(...cs); if (alvo > g.get(p.id)) { g.set(p.id, alvo); mudou = true; } }
      }
      if (!mudou) break;
    }
    // cada geração em unidades: um (o da casa, ou quem tem os pais na árvore) e, logo ao lado, os cônjuges de fora dela
    const deFora = p => !paisDentro(p).length && p.casa !== casaId;
    const nG = Math.max(...ps.map(p => g.get(p.id))) + 1, x = new Map(), linhas = [];
    for (let k = 0; k < nG; k++) {
      const daqui = ps.filter(p => g.get(p.id) === k), usados = new Set(), unidades = [];
      for (const p of daqui) {
        if (usados.has(p.id) || (deFora(p) && p.conj.some(id => por.has(id) && g.get(id) === k && !deFora(por.get(id))))) continue;
        const u = [p];
        usados.add(p.id);
        for (const id of p.conj) { const q = por.get(id); if (q && !usados.has(q.id) && g.get(q.id) === k && deFora(q)) { u.push(q); usados.add(q.id); } }
        unidades.push(u);
      }
      for (const p of daqui) if (!usados.has(p.id)) { unidades.push([p]); usados.add(p.id); }
      // a ordem: o meio dos pais (na geração de cima); sem pais na árvore, a ordem da lista
      const meio = u => { const pp = paisDentro(u[0]).filter(id => x.has(id)); return pp.length ? pp.reduce((s, id) => s + x.get(id), 0) / pp.length : null; };
      unidades.sort((a, b) => { const ma = meio(a), mb = meio(b); if (ma != null && mb != null && ma !== mb) return ma - mb; if ((ma == null) !== (mb == null)) return ma == null ? -1 : 1; return ordem.get(a[0].id) - ordem.get(b[0].id); });
      let i = 0;
      for (const u of unidades) for (const p of u) { x.set(p.id, i++); }
      linhas.push(i);
    }
    const nos = ps.map(p => ({ id: p.id, x: x.get(p.id) * (LAR + VAO), y: g.get(p.id) * (ALT + VAO_G) }));
    const casais = [], vistos = new Set();
    for (const p of ps) for (const id of p.conj) {
      if (!por.has(id)) continue;
      const k = p.id < id ? p.id + '|' + id : id + '|' + p.id;
      if (vistos.has(k)) continue;
      vistos.add(k);
      casais.push(x.get(p.id) <= x.get(id) ? [p.id, id] : [id, p.id]);
    }
    const filhos = ps.filter(p => paisDentro(p).length).map(p => ({ pais: paisDentro(p).slice().sort((a, b) => x.get(a) - x.get(b)), id: p.id }));
    return { nos, casais, filhos, larg: Math.max(...linhas) * (LAR + VAO) - VAO, alt: nG * (ALT + VAO_G) - VAO_G };
  }

  const MundoCorte = { corteDe, pessoaDe, casaDe, vivo, cargosDe, cargoDe, hoje, idadeDe, dataTxt, paisDe, conjugesDe, filhosDe, descendentesDe, quemEsta, membrosDe, laco,
    arvoreDaCasa, ARVORE: { LAR, ALT, VAO, VAO_G },
    tituloDe, grausDe, grauDe, terraDe, nomeDaTerra, deQue, nomeDoTitulo, formaDoGrau, tituloDoTitular, porGrau, titulosDe, maiorTituloDe, nomeComTitulo, titulosDaTerra,
    governanteDe, maioridadeDe, menorDeIdade, papeisNosTitulos,
    regraDe, regraDoReino, textoRegra, porIdade, peloGenero, lacoNaLinha, linhaDeSucessao, sucessaoDe, aplicarSucessao };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoCorte;
  if (typeof window !== 'undefined') window.MundoCorte = MundoCorte;
})();
