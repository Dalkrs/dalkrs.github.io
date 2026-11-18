// (lote 184) Na Árvore, numa mesa: os pontos que vieram das conquistas do jogador (a coluna conq do personagem, que o
// banco calcula) somam no que sobra para gastar e aparecem na bolsa com a origem. Aqui a mesa é imitada: ArvoreMesa diz
// que está ativa e entrega a coluna conq do personagem.
const { start, checker } = require('./lib');
const { ok, end } = checker();
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'arvore-conquistas' });
  const w = ms => P.waitForTimeout(ms);
  await P.goto(t.base + 'arvore/', { waitUntil: 'load' }); await w(1500);
  const E = (fn, a) => P.evaluate(fn, a);
  const pid = await E(() => bib().pools[0].id);
  const antes = await E(id => restantes(doc.personagens[0], id), pid);
  await E(id => { ArvoreMesa.ativo = () => true; ArvoreMesa.nivelDe = () => null; ArvoreMesa.conqDe = () => ({ pontos: { [id]: 2 }, origem: [{ c: 'cq_fantasma', nome: 'Fantasma', pool: id, n: 1 }, { c: 'cq_um_de_nos', nome: 'Um de Nós', pool: id, n: 1 }], titulos: [] }); }, pid);
  ok(await E(id => restantes(doc.personagens[0], id), pid) === antes + 2, 'os 2 pontos de conquista somam no que sobra: ' + antes + ' → ' + await E(id => restantes(doc.personagens[0], id), pid));
  ok(await E(() => { ui.modo = 'jogador'; return /Fantasma \+1, Um de Nós \+1/.test(painelJogador()); }), 'a bolsa mostra de onde vieram');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
