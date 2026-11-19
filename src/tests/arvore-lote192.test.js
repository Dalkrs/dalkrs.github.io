// (lote 192) O preço na Árvore, para quem joga: a plaquinha com o custo no nódulo que dá para pegar (liberado, com
// ou sem pontos), o preço no botão de comprar, "Falta 1 ponto de … — custa 3, você tem 2." e "Grátis" no custo 0.
const { start, checker } = require('./lib');
const { ok, end } = checker();
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'arvore-lote192' });
  const w = ms => P.waitForTimeout(ms);
  await P.goto(t.base + 'arvore/', { waitUntil: 'load' }); await w(1500);
  const E = (fn, a) => P.evaluate(fn, a);
  await E(() => trocarModo('jogador')); await w(400);
  // a Origem (grátis) primeiro, para liberar os filhos
  await E(async () => { const p = personagemAtual(), a = arvoreVisivel(); const raiz = a.nodes.find(n => estadoNo(p, n) === 'disp'); await subirGrau(raiz.id); }); await w(300);
  const info = await E(() => {
    const p = personagemAtual(), a = arvoreVisivel(), pl = bib().pools[0];
    const disp = a.nodes.filter(n => estadoNo(p, n) === 'disp' && (n.graus[0].custos[pl.id] || 0) > 0);
    const placas = [...document.querySelectorAll('#nos g.no')].filter(g => g.querySelector('g.preco')).map(g => g.dataset.id);
    return { disp: disp.map(n => n.id), placas, on: a.nodes.filter(n => estadoNo(p, n) === 'on').length };
  });
  ok(info.disp.length > 0 && JSON.stringify(info.disp.sort()) === JSON.stringify(info.placas.sort()), 'os liberados com custo têm a plaquinha, e só eles: ' + info.placas.length);
  // o botão com o preço
  const bt = await E(id => { selecionado = id; pintarPainel(); desenhar(); return document.querySelector('#btSubir').textContent; }, info.disp[0]);
  ok(/Alocar · −\d+ (pontos?|\S+)/.test(bt), 'o botão diz o preço: ' + bt);
  // sem pontos: os números e a plaquinha vazada
  const caro = await E(id => {
    const p = personagemAtual(), pl = bib().pools[0], n = porId.get(id);
    n.graus[0].custos[pl.id] = restantes(p, pl.id) + 1; desenhar();
    return { est: estadoNo(p, n), txt: faltaTexto(p, n, 1), placa: !!document.querySelector(`#nos g.no[data-id="${id}"] g.preco.caro`) };
  }, info.disp[0]);
  ok(caro.est === 'caro' && /^Falta 1 ponto.* — custa \d+, você tem \d+\.$/.test(caro.txt), 'sem pontos, o texto tem os números: ' + caro.txt);
  ok(caro.placa, 'e a plaquinha fica vazada, em vermelho');
  ok(await E(() => custoTexto({})) === 'Grátis', 'custo 0: "Grátis"');
  await E(id => { const pl = bib().pools[0]; porId.get(id).graus[0].custos[pl.id] = 0; desenhar(); }, info.disp[0]);
  ok(await E(id => !document.querySelector(`#nos g.no[data-id="${id}"] g.preco`), info.disp[0]), 'grátis: sem plaquinha');
  if (process.env.FOTO) await P.screenshot({ path: process.env.FOTO });
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
