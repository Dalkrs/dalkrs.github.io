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
   Roda no navegador (window.MundoDiplomacia) e no Node (testes). */
(() => {
  'use strict';
  const NN = () => (typeof window !== 'undefined' && window.MundoNucleo) || (typeof require === 'function' ? require('./nucleo.js') : null);
  const ehObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const VAZIA = { tratados: [], opin: [], vassalos: [] };
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

  const MundoDiplomacia = { diplDe, tiposDe, tipoDe, nomeDoTipo, tratadoDe, diaDe, hojeDia, ESTADOS, estadoDe, tratadosDe, tratadosEntre, opiniao, opTxt,
    vassalagemDe, vassalasDe, fechaCirculo, fluxosDaSemana, tratadosQueVencem, motivosQueVencem, aplicarDecisoes };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoDiplomacia;
  if (typeof window !== 'undefined') window.MundoDiplomacia = MundoDiplomacia;
})();
