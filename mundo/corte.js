/* Tiny Cats · Mapa-múndi · a corte (lote 11): as contas dos personagens do mundo e das casas, sem página e sem DOM.
   O modelo (mapa.corte, normalizado no núcleo): os personagens (o nome, o gênero, a casa, a facção, o cargo na corte da
   facção, o nascimento e a morte pela data do mundo, os pais e os cônjuges, onde está, a ficha das Fichas, o que os
   jogadores sabem, a nota do mestre e se os jogadores conhecem), as casas (o nome, o brasão, o lema e o chefe) e os
   cargos da corte de cada facção (sem a lista guardada, os de começo).
   Aqui: os cargos de uma facção, a idade (hoje, ou na morte), a data em texto (só o ano, o mês e o ano, ou tudo), os
   pais, os filhos, os cônjuges, os descendentes (para não deixar ninguém ser antepassado de si mesmo), quem está num
   lugar (os vivos) e os membros de uma casa (os vivos primeiro).
   Roda no navegador (window.MundoCorte) e no Node (testes). */
(() => {
  'use strict';
  const NN = () => (typeof window !== 'undefined' && window.MundoNucleo) || (typeof require === 'function' ? require('./nucleo.js') : null);
  const ehObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const VAZIA = { pessoas: [], casas: [], cargos: {} };
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

  const MundoCorte = { corteDe, pessoaDe, casaDe, vivo, cargosDe, cargoDe, hoje, idadeDe, dataTxt, paisDe, conjugesDe, filhosDe, descendentesDe, quemEsta, membrosDe, laco };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoCorte;
  if (typeof window !== 'undefined') window.MundoCorte = MundoCorte;
})();
