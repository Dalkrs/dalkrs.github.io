// (lote 107) O painel de barras do mundo novo (tc/barras-painel.js): as 20 barras (18 classes, Vampiro e Lobisomem), o
// disco de cada uma, as marcas, os ganhos, os patamares, o risco no máximo, a aba de habilidades (gastar, a barra que
// sobe, o patamar que o topo exige) e o pedido do que vai para o mapa.
const P = require('../../tc/barras-painel.js');
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FALHOU: ' + m); } };
const ator = b => ({ nome: 'Teste', dono: 'jogador', barras: [b], aba: 0, aberto: true, linhas: [], logar(t) { this.linhas.push(t); }, rodada: () => 1,
  alvos: [{ nome: 'Orc' }], aliados: [{ nome: 'Ana' }], fila: [], pedirMapa(sp, h) { this.fila.push({ sp, h }); } });

ok(P.BARRAS.length === 20, 'as 20 barras do mundo novo');
ok(P.barraDaArvore('a_kare_ma') === 'karema' && P.barraDaArvore({ id: 'outro', nome: 'Lobisomem' }) === 'lobisomem' && P.barraDaArvore('azavpm5qd8') === null, 'a ligação pela árvore (id e nome); as do mundo antigo não ligam mais');
for (const d of P.BARRAS) {
  try {
    const b = P.instancia(d.id, d.inicio, null, {}), a = ator(b);
    const html = P.painelHTML(a, { papel: 'jogador' }).html;
    ok(/pb-face/.test(html), d.id + ': o painel desenha');
    const ks = [...P.faceSVG(b).matchAll(/data-k="([^"]+)"/g)].map(m => m[1]);
    for (const k of ks) P.mexer(a, b, ctx => d.clique.call(d, b.s, k, ctx));
    for (const g of d.ganhos) { if (g.quando === 'agora') P.tocarAgora(a, b, g); else { b.cont[g.id] = 1; P.aplicar(a, b, g.quando); } }
    const antes = a.linhas.length;
    P.mexer(a, b, ctx => { ctx.v = d.max; });
    ok(a.linhas.length > antes, d.id + ': os patamares e o risco avisam na mesa');
    P.comecarTurno(a); P.terminarTurno(a); P.fimDoCombate(a, b, d.inicio);
    ok(d.inverso ? b.v === d.inicio : b.v === d.inicio, d.id + ': o fim do combate volta ao início');
  } catch (e) { ok(false, d.id + ': ' + e.message); }
}
// a aba de habilidades
{
  const b = P.instancia('druida', 8, null, {}), a = ator(b);
  b.habs = [{ nome: 'Forma do Urso de Casca', custo: 4 }, { nome: 'Floresta Instantânea', custo: 8 }, { nome: 'Topo', custo: 3, patamar: 15 }];
  ok(/data-hab="0"/.test(P.habsHTML(b)) && /pb-hab off/.test(P.habsHTML(b)), 'a lista das habilidades, com as que não dá para usar apagadas');
  P.usarHab(a, b, 0);
  ok(b.v === 4 && b.s.forma === 'urso' && b.s.turnos === 3, 'usar a Forma gasta 4 e veste a forma por 3 turnos');
  P.usarHab(a, b, 2);
  ok(b.v === 4 && /exige 15/.test(b.aviso), 'o topo pede o patamar 15');
  b.v = 10; P.usarHab(a, b, 1);
  ok(b.v === 2 && a.fila.length === 1 && a.fila[0].sp.fx === 'bosqueNirus' && a.fila[0].sp.r === 4, 'a Floresta Instantânea pede a área ao mapa');
}
{
  const b = P.instancia('alquimista', 0, null, {}), a = ator(b);
  b.habs = [{ nome: 'Bomba de Fogo', custo: 3, inverso: true }];
  P.usarHab(a, b, 0);
  ok(b.v === 2 && b.s.cinto === 3 && a.fila.length === 1, 'Alquimista: a Toxicidade sobe (o frasco preparado tira 1) e a bomba vai ao mapa');
  P.mexer(a, b, ctx => { ctx.v = 20; });
  P.comecarTurno(a);
  ok(b.v === 10, 'em 20, passa mal: perde o turno e a barra cai a 10');
}
{
  const b = P.instancia('samurai', 4, null, {}), a = ator(b), d = b.def;
  P.mexer(a, b, ctx => d.clique.call(d, b.s, 'vento', ctx));
  P.mexer(a, b, ctx => d.clique.call(d, b.s, 'trovao', ctx));
  ok(b.s.postura === 'trovao' && b.v === 5, 'Samurai: entrar no Vento, trocar para o Trovão (+1)');
  P.mexer(a, b, ctx => d.clique.call(d, b.s, 'petalas', ctx));
  ok(b.s.postura === 'trovao' && /Só uma troca/.test(b.aviso), 'só uma troca por turno');
}
console.log(`${n - bad} verificações passaram${bad ? ', ' + bad + ' falharam' : ''}`);
process.exit(bad ? 1 : 0);
