/* Tiny Cats · Mapa-múndi · a corte (lote 11): as contas dos personagens do mundo e das casas, sem página e sem DOM.
   O modelo (mapa.corte, normalizado no núcleo): os personagens (o nome, o gênero, a casa, a facção, o cargo na corte da
   facção, o nascimento e a morte pela data do mundo, os pais e os cônjuges, onde está, a ficha das Fichas, o que os
   jogadores sabem, a nota do mestre e se os jogadores conhecem), as casas (o nome, o brasão, o lema e o chefe) e os
   cargos da corte de cada facção (sem a lista guardada, os de começo).
   Aqui: os cargos de uma facção, a idade (hoje, ou na morte), a data em texto (só o ano, o mês e o ano, ou tudo), os
   pais, os filhos, os cônjuges, os descendentes (para não deixar ninguém ser antepassado de si mesmo), quem está num
   lugar (os vivos) e os membros de uma casa (os vivos primeiro); (parte 1b) a árvore da família de uma casa (onde fica
   cada pessoa, os casais e os filhos).
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
    arvoreDaCasa, ARVORE: { LAR, ALT, VAO, VAO_G } };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoCorte;
  if (typeof window !== 'undefined') window.MundoCorte = MundoCorte;
})();
