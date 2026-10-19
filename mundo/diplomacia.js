/* Tiny Cats · Mapa-múndi · a diplomacia (lote 11, parte 3): as contas dos tratados e da opinião entre as facções, sem
   página e sem DOM.
   O modelo (mapa.dipl, normalizado no núcleo): os tipos de tratado (sem a lista guardada, os de começo), os tratados
   (o tipo, as partes — duas ou mais facções —, o começo, o prazo, se é público, os termos, a nota do mestre e a data
   em que foi encerrado) e a opinião de cada facção sobre cada outra (os motivos, cada um com o valor e um prazo).
   Aqui: o dia de uma data do mundo (para comparar com hoje), o estado de um tratado hoje (em vigor, vencido, ainda
   não começou, encerrado), os tratados de uma facção e entre duas, a opinião (a soma dos motivos, de −100 a +100, e os
   motivos que já venceram).
   (parte 3b) A vassalagem (a suserana de cada vassala, desde quando, e o tributo por semana) e as trocas por semana de
   cada tratado: o que vai de uma facção para outra numa semana (fluxosDaSemana, para a prévia da semana), os tratados
   e os motivos de opinião que vencem nela, e as decisões do mestre na prévia (encerrar, renovar, tirar o motivo).
   (parte 3c) Os motivos de guerra de cada facção (e as sugestões pelos pretendentes dos títulos), declarar a guerra (a
   relação vira Guerra; os tratados escolhidos acabam), fazer a paz (a relação sai de Guerra; nasce um tratado de paz) e
   as notícias para o rascunho do Jornal (a guerra, a paz, o tratado assinado).
   Roda no navegador (window.MundoDiplomacia) e no Node (testes). */
(() => {
  'use strict';
  const NN = () => (typeof window !== 'undefined' && window.MundoNucleo) || (typeof require === 'function' ? require('./nucleo.js') : null);
  const CC = () => (typeof window !== 'undefined' && window.MundoCorte) || (typeof require === 'function' ? require('./corte.js') : null);
  const ehObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const VAZIA = { tratados: [], opin: [], vassalos: [], motivosGuerra: [] };
  const diplDe = m => (ehObj(m) && ehObj(m.dipl) ? m.dipl : VAZIA);
  const tiposDe = m => (Array.isArray(diplDe(m).tipos) ? diplDe(m).tipos : NN().TIPOS_TRATADO);
  const tipoDe = (m, t) => (t && t.tipo ? tiposDe(m).find(x => x.id === t.tipo) || null : null);
  const nomeDoTipo = (m, t) => { const x = tipoDe(m, t); return x ? x.nome : 'Tratado'; };
  const tratadoDe = (m, id) => (id ? diplDe(m).tratados.find(t => t.id === id) || null : null);
  /* O dia de uma data do mundo ({ a, m, d }), contado como o dia do mapa (cal.dia): para comparar com hoje. ate: o
     último dia do período (sem o mês, o fim do ano; sem o dia, o fim do mês); sem ate, o primeiro. null sem a data. */
  function diaDe(m, dt, ate) {
    if (!ehObj(dt) || !Number.isFinite(dt.a)) return null;
    const N = NN(), cal = m && m.cal, meses = cal && Array.isArray(cal.meses) && cal.meses.length ? cal.meses : N.CAL_PADRAO.meses;
    const dias = x => Math.max(1, Math.round(Number(x.dias) || 30)), total = meses.reduce((s, x) => s + dias(x), 0);
    const ano0 = cal && Number.isFinite(cal.ano0) ? cal.ano0 : 1, mi = dt.m != null && meses[dt.m] ? dt.m : ate ? meses.length - 1 : 0;
    let dia = (dt.a - ano0) * total;
    for (let i = 0; i < mi; i++) dia += dias(meses[i]);
    return dia + (dt.d != null ? dt.d - 1 : ate ? dias(meses[mi]) - 1 : 0);
  }
  const hojeDia = m => (ehObj(m) && ehObj(m.cal) && Number.isFinite(m.cal.dia) ? m.cal.dia : 0);
  // o estado de um tratado hoje: 'encerrado', 'vencido' (passou do prazo), 'futuro' (ainda não começou) ou 'ativo'
  const ESTADOS = { ativo: 'em vigor', vencido: 'vencido', futuro: 'ainda não começou', encerrado: 'encerrado' };
  function estadoDe(m, t) {
    if (!t) return '';
    if (t.enc) return 'encerrado';
    const hj = hojeDia(m);
    if (t.fim && hj > diaDe(m, t.fim, true)) return 'vencido';
    if (t.ini && hj < diaDe(m, t.ini, false)) return 'futuro';
    return 'ativo';
  }
  // os tratados de uma facção (sem ela, todos) e os entre duas, na ordem da lista
  const tratadosDe = (m, fid) => diplDe(m).tratados.filter(t => !fid || t.partes.includes(fid));
  const tratadosEntre = (m, a, b) => diplDe(m).tratados.filter(t => t.partes.includes(a) && t.partes.includes(b));
  /* A opinião de uma facção sobre outra: a soma dos motivos (de −100 a +100) e os motivos (cada um com vencido: o prazo
     dele já passou — ele continua contando até o mestre tirar). */
  function opiniao(m, de, sobre) {
    const o = diplDe(m).opin.find(x => x.de === de && x.sobre === sobre) || null, hj = hojeDia(m);
    const motivos = o ? o.motivos.map(x => Object.assign({}, x, { vencido: !!x.ate && hj > diaDe(m, x.ate, true) })) : [];
    return { total: Math.max(-100, Math.min(100, motivos.reduce((s, x) => s + x.v, 0))), motivos };
  }
  const opTxt = n => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');

  /* ---------------- (parte 3b) a vassalagem e as trocas por semana ---------------- */
  // a vassalagem de uma facção ({ vas, sus, desde, trib }; null se ela não é vassala) e as vassalas de uma suserana
  const vassalagemDe = (m, fid) => (fid ? diplDe(m).vassalos.find(x => x.vas === fid) || null : null);
  const vassalasDe = (m, fid) => diplDe(m).vassalos.filter(x => x.sus === fid);
  // dar esta suserana a esta vassala fecharia um círculo? (a suserana já é vassala dela, direto ou pela cadeia)
  function fechaCirculo(m, vas, sus) {
    for (let p = sus; p; p = (vassalagemDe(m, p) || {}).sus) if (p === vas) return true;
    return false;
  }
  /* O que vai de uma facção para outra numa semana (do dia de ao dia ate): o tributo de cada vassala (com a vassalagem
     começada até o fim da semana) e as trocas de cada tratado que valeu na semana (não encerrado, começado até o fim
     dela, com o prazo depois do começo dela). → [{ id ('trib:' + a vassala, 'troca:' + o tratado + ':' + a posição),
     tipo ('trib' | 'troca'), de, para, rec, q, ref (o tratado; null no tributo) }], o tributo primeiro */
  function fluxosDaSemana(m, de, ate) {
    const d = diplDe(m), out = [];
    for (const x of d.vassalos) if (x.trib && !(x.desde && diaDe(m, x.desde, false) > ate)) out.push({ id: 'trib:' + x.vas, tipo: 'trib', de: x.vas, para: x.sus, rec: x.trib.rec, q: x.trib.q, ref: null });
    for (const t of d.tratados) {
      if (t.enc || (t.ini && diaDe(m, t.ini, false) > ate) || (t.fim && diaDe(m, t.fim, true) < de)) continue;
      t.trocas.forEach((y, i) => out.push({ id: 'troca:' + t.id + ':' + i, tipo: 'troca', de: y.de, para: y.para, rec: y.rec, q: y.q, ref: t.id }));
    }
    return out;
  }
  // os tratados que vencem numa semana (o prazo cai nela; os encerrados, não) e os motivos de opinião que vencem nela
  const naSemana = (k, de, ate) => k != null && k >= de && k <= ate;
  const tratadosQueVencem = (m, de, ate) => diplDe(m).tratados.filter(t => !t.enc && naSemana(diaDe(m, t.fim, true), de, ate));
  function motivosQueVencem(m, de, ate) {
    const out = [];
    for (const o of diplDe(m).opin) for (const x of o.motivos) if (naSemana(diaDe(m, x.ate, true), de, ate)) out.push({ de: o.de, sobre: o.sobre, id: x.id, txt: x.txt, v: x.v });
    return out;
  }
  /* As decisões da prévia da semana (do dia de ao dia ate), no rascunho (o mapa de App.mudar): dec.tratados ({ id:
     'encerrar' | { a, m, d } (o prazo novo: renovar até ele) }) e dec.motivos ([{ de, sobre, id }]: os que o mestre tirou),
     só os que vencem nesta semana; o resto fica como está. O tratado encerrado aqui acaba no prazo dele. → quantas coisas
     mudaram */
  function aplicarDecisoes(m, dec, de, ate) {
    if (!ehObj(m) || !ehObj(m.dipl) || !ehObj(dec)) return 0;
    const trat = ehObj(dec.tratados) ? dec.tratados : {}, tirar = new Set((Array.isArray(dec.motivos) ? dec.motivos : []).filter(ehObj).map(r => r.de + '>' + r.sobre + '>' + r.id));
    let n = 0;
    for (const t of tratadosQueVencem(m, de, ate)) {
      const x = trat[t.id];
      if (x === 'encerrar') t.enc = Object.assign({}, t.fim);
      else if (ehObj(x) && Number.isFinite(x.a)) t.fim = Object.assign({}, x);
      else continue;
      n++;
    }
    for (const o of m.dipl.opin) {
      const antes = o.motivos.length;
      o.motivos = o.motivos.filter(x => !(tirar.has(o.de + '>' + o.sobre + '>' + x.id) && naSemana(diaDe(m, x.ate, true), de, ate)));
      n += antes - o.motivos.length;
    }
    m.dipl.opin = m.dipl.opin.filter(o => o.motivos.length);
    return n;
  }

  /* ---------------- (parte 3c) os motivos de guerra, a guerra e a paz ---------------- */
  const facDe = (m, id) => (ehObj(m) && Array.isArray(m.faccoes) && id ? m.faccoes.find(f => f.id === id) || null : null);
  // os motivos de guerra de uma facção (contra uma, ou contra todas) e um pelo id
  const motivosGuerraDe = (m, de, contra) => diplDe(m).motivosGuerra.filter(x => x.de === de && (!contra || x.contra === contra));
  const motivoGuerraDe = (m, id) => (id ? diplDe(m).motivosGuerra.find(x => x.id === id) || null : null);
  /* As sugestões pelos pretendentes: cada pretendente vivo de um título, da facção dele contra o reino do título (quando
     são duas facções), sem as que já estão na lista (da mesma facção, pelo mesmo título e o mesmo pretendente). → [{ de,
     contra, tit, p, txt }] */
  function sugestoesDeGuerra(m) {
    const C = CC(), usados = new Set(diplDe(m).motivosGuerra.map(x => x.de + '>' + x.tit + '>' + x.p)), out = [];
    for (const t of C.corteDe(m).titulos) for (const x of t.pret) {
      const q = C.pessoaDe(m, x.p);
      if (!q || !C.vivo(q) || !q.fac || !t.fac || q.fac === t.fac || usados.has(q.fac + '>' + t.id + '>' + q.id)) continue;
      out.push({ de: q.fac, contra: t.fac, tit: t.id, p: q.id, txt: q.nome + ' pretende ' + C.nomeDoTitulo(m, t) + (x.mot ? ' (' + x.mot + ')' : '') });
    }
    return out;
  }
  // os tratados entre duas facções que ainda valem ou vão valer (nem encerrados, nem vencidos)
  const tratadosVivosEntre = (m, a, b) => tratadosEntre(m, a, b).filter(t => estadoDe(m, t) === 'ativo' || estadoDe(m, t) === 'futuro');
  /* Declarar a guerra, no rascunho (o mapa de App.mudar): a relação entre as duas vira Guerra (dos dois lados) e os
     tratados escolhidos (encerrar: os ids; só os entre as duas, ainda abertos) acabam na data dt. → quantos tratados
     acabaram; -1 se uma das facções não existe */
  function declararGuerra(m, de, contra, encerrar, dt) {
    const fa = facDe(m, de), fb = facDe(m, contra);
    if (!fa || !fb || de === contra) return -1;
    fa.rel[contra] = 'guerra'; fb.rel[de] = 'guerra';
    const ids = new Set(encerrar || []);
    let n = 0;
    for (const t of ehObj(m.dipl) ? m.dipl.tratados : []) if (ids.has(t.id) && !t.enc && t.partes.includes(de) && t.partes.includes(contra)) { t.enc = Object.assign({}, dt); n++; }
    return n;
  }
  /* Fazer a paz, no rascunho: a relação sai de Guerra (rel: 'tensao'; senão, neutra) e o tratado de paz (t: { id, tipo, ini,
     fim, pub, txt }) entra na diplomacia, entre as duas. → o tratado novo, ou null se uma das facções não existe */
  function fazerPaz(m, a, b, rel, t) {
    const fa = facDe(m, a), fb = facDe(m, b);
    if (!fa || !fb || a === b) return null;
    if (rel === 'tensao') { fa.rel[b] = 'tensao'; fb.rel[a] = 'tensao'; } else { delete fa.rel[b]; delete fb.rel[a]; }
    if (!ehObj(m.dipl)) m.dipl = { tratados: [], opin: [], vassalos: [], motivosGuerra: [] };
    const novo = { id: t.id, tipo: t.tipo || null, partes: [a, b], ini: t.ini || null, fim: t.fim || null, pub: !!t.pub, txt: t.txt || '', nota: '', enc: null, trocas: [] };
    m.dipl.tratados.push(novo);
    return novo;
  }
  // os nomes em texto ("Aldar", "Aldar e Vale", "Aldar, Vale e Ilhas"), o nome de uma facção e o texto sem o ponto final
  const juntarNomes = l => (l.length <= 1 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
  const nomeFac = (m, id) => { const f = facDe(m, id); return f ? String(f.nome || '').trim() || 'Facção sem nome' : 'uma facção'; };
  const semPonto = x => String(x || '').trim().replace(/[.!?…]+$/, '');
  /* As notícias para o rascunho do Jornal (o mestre revisa lá antes de publicar): a guerra declarada (com o motivo e os
     tratados que acabaram, se houver), a paz (com o tratado) e o tratado assinado. → { tit, txt } (com o **negrito** do
     Jornal) */
  function noticiaGuerra(m, de, contra, motivo, encerrados, dt) {
    const a = nomeFac(m, de), b = nomeFac(m, contra), partes = [a + ' declarou guerra a ' + b + ' (' + CC().dataTxt(m, dt) + ').'];
    if (semPonto(motivo)) partes.push('**O motivo:** ' + semPonto(motivo) + '.');
    if (encerrados.length) partes.push('**Os tratados que acabaram:** ' + encerrados.join(', ') + '.');
    return { tit: a + ' declara guerra a ' + b, txt: partes.join('\n\n') };
  }
  function noticiaPaz(m, a, b, t) {
    const nomes = juntarNomes([a, b].map(id => nomeFac(m, id))), partes = [nomes + ' fizeram a paz (' + CC().dataTxt(m, t.ini) + ').'];
    partes.push('**O tratado:** ' + nomeDoTipo(m, t) + (t.fim ? ', até ' + CC().dataTxt(m, t.fim) : ', sem prazo') + '.');
    if (t.txt) partes.push(t.txt);
    return { tit: nomes + ' fazem a paz', txt: partes.join('\n\n') };
  }
  function noticiaTratado(m, t) {
    const nomes = juntarNomes(t.partes.map(id => nomeFac(m, id))), tipo = tipoDe(m, t);
    const partes = [nomes + ' assinaram um tratado' + (tipo ? ' de ' + tipo.nome : '') + (t.ini ? ' (' + CC().dataTxt(m, t.ini) + ')' : '') + '.'];
    if (t.fim) partes.push('**Até:** ' + CC().dataTxt(m, t.fim) + '.');
    if (t.txt) partes.push(t.txt);
    return { tit: nomes + ' assinam um tratado', txt: partes.join('\n\n') };
  }

  const MundoDiplomacia = { diplDe, tiposDe, tipoDe, nomeDoTipo, tratadoDe, diaDe, hojeDia, ESTADOS, estadoDe, tratadosDe, tratadosEntre, opiniao, opTxt,
    vassalagemDe, vassalasDe, fechaCirculo, fluxosDaSemana, tratadosQueVencem, motivosQueVencem, aplicarDecisoes,
    motivosGuerraDe, motivoGuerraDe, sugestoesDeGuerra, tratadosVivosEntre, declararGuerra, fazerPaz, juntarNomes, noticiaGuerra, noticiaPaz, noticiaTratado };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoDiplomacia;
  if (typeof window !== 'undefined') window.MundoDiplomacia = MundoDiplomacia;
})();
