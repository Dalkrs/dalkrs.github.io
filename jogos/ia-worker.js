/* Tiny Cats · Jogos de Tabuleiro (lote 167): o computador pensa aqui, fora da página (a tela não trava enquanto ele pensa).
   Pedido: { n, jogo, lances: [ids], nivel } → resposta: { n, id } (o lance escolhido) | { n, erro } */
importScripts('../tc/jogos-xadrez.js?v=1', '../tc/jogos-damas.js?v=1', '../tc/jogos-tablut.js?v=1', '../tc/jogos-ia.js?v=1');
self.onmessage = ev => {
  const q = ev.data || {};
  try {
    const J = self.TC.jogos[q.jogo];
    let e = J.inicial();
    for (const id of q.lances || []) { const m = J.lancePorId(e, id); if (!m) break; e = J.jogar(e, m); }
    const r = self.TC.jogos.ia.escolher(J, e, q.nivel);
    self.postMessage({ n: q.n, id: r ? r.lance.id : null });
  } catch (e) {
    self.postMessage({ n: q.n, erro: String((e && e.message) || e) });
  }
};
