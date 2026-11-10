/* =======================================================================
   TC.lembretes — a checklist do mestre (lote 131). Lógica pura (Node e navegador).

   Uma vez por dia (o dia de verdade, no relógio de quem usa), na primeira vez que quem mestra entra na mesa, aparece a
   lista do que vale conferir: as fichas, as aptidões, os relacionamentos, o descanso longo, as cenas… Cada item tem um
   atalho para a aba certa, e alguns mostram o que está pendente ("2 aptidões prontas para subir").
   O mestre marca o que fez (as marcas valem para aquele dia) e pode mudar a lista: renomear, tirar, criar itens e
   voltar à lista de costume.

   Onde fica: o documento escudo:lembretes (só quem mestra), { itens: [{ id, t, ir, k }], feitos: { dia, ids: [] } }.
   Sem `itens`, vale a lista de costume (PADRAO).

     navegador   <script src="tc/lembretes.js"></script> → window.TC.lembretes
     Node        const L = require('./tc/lembretes.js')
   ======================================================================= */
(function (root) {
  'use strict';
  const DOC = 'escudo:lembretes';
  const LIM = Object.freeze({ texto: 120, itens: 30 });
  // as abas para onde um item pode levar (o id é o da aba do site)
  const ATALHOS = Object.freeze([
    { id: '', nome: 'Nenhuma' }, { id: 'fichas', nome: 'Fichas' }, { id: 'missoes', nome: 'Missões' }, { id: 'cenas', nome: 'Cenas' },
    { id: 'escudo', nome: 'Escudo do mestre' }, { id: 'mundo', nome: 'Mapa-múndi' }, { id: 'acampamento', nome: 'Bases' },
    { id: 'jornal', nome: 'Jornal' }, { id: 'cla', nome: 'Clã' }, { id: 'bestiario', nome: 'Bestiário' }, { id: 'itens', nome: 'Itens' },
    { id: 'oficina', nome: 'Oficina' }, { id: 'rolador', nome: 'Rolador' }]);
  /* k: o que o item conta (o site sabe calcular): 'aptidoes' (as prontas para subir), 'descanso' (o descanso longo do
     dia do mundo ainda não aconteceu) */
  const PADRAO = Object.freeze([
    { id: 'fichas', t: 'Atualizar as fichas (Vida, XP, itens ganhos)', ir: 'fichas' },
    { id: 'aptidoes', t: 'Dar XP nas aptidões que foram usadas', ir: 'fichas', k: 'aptidoes' },
    { id: 'relacoes', t: 'Atualizar relacionamentos e reputação', ir: 'fichas' },
    { id: 'descanso', t: 'Dar descanso longo, se o grupo descansou', ir: 'acampamento', k: 'descanso' },
    { id: 'missoes', t: 'Conferir as missões (o que terminou, o que é novo)', ir: 'missoes' },
    { id: 'tempo', t: 'Passar o tempo no Mapa-múndi (dias de viagem)', ir: 'mundo' },
    { id: 'luas', t: 'Olhar as luas: a Lua do olho subiu?', ir: 'mundo' },
    { id: 'cenas', t: 'Revisar as cenas da próxima sessão', ir: 'cenas' },
    { id: 'plano', t: 'Revisar o planejamento no Escudo do mestre', ir: 'escudo' },
    { id: 'jornal', t: 'Escrever o resumo da última sessão no Jornal', ir: 'jornal' },
  ].map(Object.freeze));
  const KS = ['aptidoes', 'descanso'];
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const idOk = k => typeof k === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(k);
  const txt = x => String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, LIM.texto);

  // o dia de hoje no relógio de quem usa: "2026-11-10"
  function hoje(d) {
    const x = d instanceof Date ? d : new Date();
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }
  function umItem(x) {
    if (!ehObj(x) || !idOk(x.id)) return null;
    const t = txt(x.t);
    if (!t) return null;
    const o = { id: x.id, t, ir: ATALHOS.some(a => a.id === x.ir) ? x.ir : '' };
    if (KS.includes(x.k)) o.k = x.k;
    return o;
  }
  // os itens que valem (os do documento, ou os de costume)
  function itensDe(dados) {
    if (!ehObj(dados) || !Array.isArray(dados.itens)) return PADRAO.map(x => Object.assign({}, x));
    const out = [], vistos = new Set();
    for (const x of dados.itens) { const i = umItem(x); if (i && !vistos.has(i.id) && out.length < LIM.itens) { vistos.add(i.id); out.push(i); } }
    return out;
  }
  // os ids marcados hoje (as marcas de outro dia não valem)
  function feitosDe(dados, dia) {
    const f = ehObj(dados) && ehObj(dados.feitos) ? dados.feitos : null;
    return f && f.dia === dia && Array.isArray(f.ids) ? f.ids.filter(idOk) : [];
  }
  // marcar / desmarcar um item hoje → os dados novos (não altera o que recebeu)
  function marcar(dados, dia, id, sim) {
    const d = ehObj(dados) ? JSON.parse(JSON.stringify(dados)) : {};
    const ids = new Set(feitosDe(d, dia));
    if (sim) ids.add(id); else ids.delete(id);
    d.feitos = { dia, ids: [...ids].filter(x => itensDe(d).some(i => i.id === x)) };
    return d;
  }
  // a lista nova (do editor) → os dados novos; null volta à lista de costume
  function comItens(dados, itens) {
    const d = ehObj(dados) ? JSON.parse(JSON.stringify(dados)) : {};
    if (itens == null) delete d.itens;
    else d.itens = itensDe({ itens });
    if (d.feitos && Array.isArray(d.feitos.ids)) d.feitos.ids = d.feitos.ids.filter(x => itensDe(d).some(i => i.id === x));
    return d;
  }
  /* O que fica pendente, para o número ao lado do item: { aptidoes: quantas prontas para subir (de fichas:segredos,
     apt[personagem]), descanso: true se o descanso longo do dia do mundo não aconteceu }. A casca calcula o descanso;
     aqui só as aptidões (com TC.aptidoes). */
  function contaAptidoes(segredos, A, vivos) {
    const apt = ehObj(segredos) && ehObj(segredos.apt) ? segredos.apt : {};
    let n = 0;
    for (const pc of Object.keys(apt)) if (!vivos || vivos.has(pc)) n += A && A.prontas ? A.prontas(apt[pc]).length : 0;
    return n;
  }
  function pendente(item, contas) {
    if (!item || !item.k || !contas) return '';
    if (item.k === 'aptidoes') { const n = contas.aptidoes || 0; return n ? (n === 1 ? '1 aptidão pronta para subir' : n + ' aptidões prontas para subir') : ''; }
    if (item.k === 'descanso') return contas.descanso ? 'ainda não houve descanso longo hoje no mundo' : '';
    return '';
  }
  // abre sozinha? só uma vez por dia (o dia de verdade) e por mesa, neste aparelho
  const deveAbrir = (vistoEm, dia) => vistoEm !== dia;

  const API = { DOC, LIM, ATALHOS, PADRAO, hoje, itensDe, feitosDe, marcar, comItens, contaAptidoes, pendente, deveAbrir };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { root.TC = root.TC || {}; root.TC.lembretes = API; }
})(typeof window !== 'undefined' ? window : globalThis);
