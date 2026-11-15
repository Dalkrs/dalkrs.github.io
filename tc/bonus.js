/* Tiny Cats · os bônus da conta (lote 163)
   O que o jogador ganha por zerar uma campanha. É da conta dele nesta mesa, não de uma ficha: passa de campanha para
   campanha. Cada bônus tem uma cor (dourado, vermelho, azul, cinza, roxo) e um tamanho (supremo, grande, médio,
   pequeno); o que ele dá é combinado com o mestre — o site só conta. O jogador gasta (o bônus some); o mestre dá e tira.
   Fica no documento "bonus:<id da conta>" (vis 'mestre', dono = o jogador): só ele e quem mestra veem. O banco
   (0045) não deixa o jogador aumentar nada — só gastar.
   dados = { n: { "vermelho:grande": 2, … }, hist: [{ em, q: 'deu'|'tirou'|'gastou', cor, tam, qt, nota, por }] } */
(function (raiz) {
  'use strict';
  const CORES = Object.freeze([
    { k: 'dourado', nome: 'Dourado', pl: 'dourados', cor: '#E3B341' },
    { k: 'vermelho', nome: 'Vermelho', pl: 'vermelhos', cor: '#E0605E' },
    { k: 'azul', nome: 'Azul', pl: 'azuis', cor: '#5B9BF0' },
    { k: 'cinza', nome: 'Cinza', pl: 'cinza', cor: '#9AA5B1' },
    { k: 'roxo', nome: 'Roxo', pl: 'roxos', cor: '#A779D9' },
  ]);
  const TAMANHOS = Object.freeze([
    { k: 'supremo', nome: 'Supremo', pl: 'supremos', px: 22 },
    { k: 'grande', nome: 'Grande', pl: 'grandes', px: 18 },
    { k: 'medio', nome: 'Médio', pl: 'médios', px: 14 },
    { k: 'pequeno', nome: 'Pequeno', pl: 'pequenos', px: 10 },
  ]);
  const LIM = Object.freeze({ qt: 999, hist: 200, nota: 140 });
  const PRE = 'bonus:';
  const idDoc = uid => PRE + String(uid || '');
  const donoDoDoc = id => (typeof id === 'string' && id.startsWith(PRE) ? id.slice(PRE.length) : null);
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const cor = k => CORES.find(c => c.k === k) || null;
  const tam = k => TAMANHOS.find(t => t.k === k) || null;
  const chave = (c, t) => c + ':' + t;
  const nomeDe = (c, t, qt) => {
    const C = cor(c), T = tam(t); if (!C || !T) return '';
    const n = Number(qt) || 1;
    return n > 1 ? n + ' bônus ' + C.pl + ' ' + T.pl : 'Bônus ' + C.nome.toLowerCase() + ' ' + T.nome.toLowerCase();
  };
  const int = (v, a, b) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.max(a, Math.min(b, x)) : a; };

  function norm(d) {
    const n = {}, src = ehObj(d) && ehObj(d.n) ? d.n : {};
    for (const C of CORES) for (const T of TAMANHOS) { const v = int(src[chave(C.k, T.k)], 0, LIM.qt); if (v) n[chave(C.k, T.k)] = v; }
    const hist = (ehObj(d) && Array.isArray(d.hist) ? d.hist : []).filter(x => ehObj(x) && cor(x.cor) && tam(x.tam) && ['deu', 'tirou', 'gastou'].includes(x.q))
      .map(x => ({ em: String(x.em || ''), q: x.q, cor: x.cor, tam: x.tam, qt: int(x.qt, 1, LIM.qt), nota: String(x.nota || '').slice(0, LIM.nota), por: String(x.por || '') }))
      .slice(-LIM.hist);
    return { n, hist };
  }
  const qtd = (d, c, t) => norm(d).n[chave(c, t)] || 0;
  const total = d => Object.values(norm(d).n).reduce((a, b) => a + b, 0);
  // a lista do que tem, na ordem das cores e dos tamanhos: [{ cor, tam, qt }]
  const lista = d => { const n = norm(d).n, out = []; for (const C of CORES) for (const T of TAMANHOS) { const v = n[chave(C.k, T.k)]; if (v) out.push({ cor: C.k, tam: T.k, qt: v }); } return out; };

  /* Muda: op = { q: 'deu'|'tirou'|'gastou', cor, tam, qt, nota, por, em } → { ok, dados, erro } (sem mexer no de antes).
     "deu" pode vir com vários: op.itens = [{ cor, tam, qt }] (o que se dá ao zerar a campanha). */
  function mudar(d, op) {
    const D = norm(d), em = op && op.em ? String(op.em) : new Date().toISOString(), por = String((op && op.por) || ''), nota = String((op && op.nota) || '').trim().slice(0, LIM.nota);
    if (!op || !['deu', 'tirou', 'gastou'].includes(op.q)) return { ok: false, erro: 'O que fazer com o bônus?' };
    const itens = (Array.isArray(op.itens) ? op.itens : [op]).map(x => ({ cor: x && x.cor, tam: x && x.tam, qt: int(x && x.qt != null ? x.qt : 1, 0, LIM.qt) })).filter(x => x.qt > 0);
    if (!itens.length) return { ok: false, erro: 'Nenhum bônus escolhido.' };
    for (const x of itens) {
      if (!cor(x.cor) || !tam(x.tam)) return { ok: false, erro: 'Cor ou tamanho desconhecido.' };
      const k = chave(x.cor, x.tam), tem = D.n[k] || 0;
      if (op.q === 'deu') D.n[k] = Math.min(LIM.qt, tem + x.qt);
      else {
        if (tem < x.qt) return { ok: false, erro: tem ? 'Só há ' + tem + ' desse bônus.' : 'Não há esse bônus.' };
        D.n[k] = tem - x.qt; if (!D.n[k]) delete D.n[k];
      }
      D.hist.push({ em, q: op.q, cor: x.cor, tam: x.tam, qt: x.qt, nota, por });
    }
    D.hist = D.hist.slice(-LIM.hist);
    return { ok: true, dados: D };
  }
  // "Gastou 1 bônus vermelho grande — nota"
  const textoHist = h => (h.q === 'deu' ? 'Ganhou ' : h.q === 'tirou' ? 'O mestre tirou ' : 'Gastou ') + nomeDe(h.cor, h.tam, h.qt).replace(/^Bônus/, '1 bônus').replace(/^(\d+) bônus/, '$1 bônus') + (h.nota ? ' — ' + h.nota : '');

  const api = { CORES, TAMANHOS, LIM, PRE, idDoc, donoDoDoc, cor, tam, chave, nomeDe, norm, qtd, total, lista, mudar, textoHist };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (raiz) { raiz.TC = raiz.TC || {}; raiz.TC.bonus = api; }
})(typeof window !== 'undefined' ? window : null);
