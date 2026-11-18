// (lote 107) O painel de barras do mundo novo (tc/barras-painel.js): as 20 barras (18 classes, Vampiro e Lobisomem), o
// disco de cada uma, as marcas, os ganhos, os patamares, o risco no máximo, a aba de habilidades (gastar, a barra que
// sobe, o patamar que o topo exige) e o pedido do que vai para o mapa.
const P = require('../../tc/barras-painel.js');
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FALHOU: ' + m); } };
const ator = b => ({ nome: 'Teste', dono: 'jogador', barras: [b], aba: 0, aberto: true, linhas: [], logar(t) { this.linhas.push(t); }, rodada: () => 1,
  alvos: [{ nome: 'Orc' }], aliados: [{ nome: 'Ana' }], fila: [], pedirMapa(sp, h) { this.fila.push({ sp, h }); } });

ok(P.BARRAS.length === 22, 'as 22 barras do mundo novo (lote 118: o Malho do Ferreiro; lote 173: as Caudas da Kitsune)');
{ // (lote 182) o botão ◆ das passivas e a lista à esquerda
  const b = P.instancia('ninja', 3, null, {}), at = { chave: 'x', nome: 'Dain', dono: 'jogador', barras: [b], aba: 0, aberto: true, linhas: [], rodada: () => 1, logar(){},
    passivas: [{ arv: 'Kitsune', cat: 'raca', itens: [{ nome: 'Pé Leve', grau: 2, tipo: 'passiva', desc: 'Anda sem som.\nNo nível 2: E sem rastro.' }] }, { arv: 'Ninja', cat: 'classe', itens: [{ nome: 'Lâmina Fina', grau: 1, tipo: 'melhoria', desc: '+1 tier.' }] }] };
  const h0 = P.painelHTML(at, { papel: 'jogador' }).html;
  ok(/data-a="__passivas"/.test(h0) && /<small>2<\/small>/.test(h0) && !/pb-pass"/.test(h0), '(lote 182) o botão mostra quantas passivas; a lista começa fechada');
  at.passAberto = true;
  const h1 = P.painelHTML(at, { papel: 'jogador' }).html;
  ok(/class="pb-pass"/.test(h1) && /Kitsune <small>Raça<\/small>/.test(h1) && /Pé Leve <small>nível 2<\/small>/.test(h1) && /No nível 2: E sem rastro/.test(h1) && /melhoria/.test(h1), '(lote 182) aberta: separada por árvore, com o nível e a descrição');
  at.passivas = [];
  ok(!/__passivas/.test(P.painelHTML(at, { papel: 'jogador' }).html), '(lote 182) sem passivas (o NPC sem ficha), sem botão');
}
{ // (lote 173) as Caudas da Kitsune: o poder do yokai guardado numa cauda
  const C = require('../../tc/caudas.js');
  ok(P.barraDaArvore('a_kitsune') === 'kitsune' && P.BARRA.kitsune.fim === 'fica', '(lote 173) a árvore da Kitsune liga a barra Caudas, que fica como está no fim do combate');
  const g = { s: { caudas: [null, { p: { y: 'Kappa', n: 'Pele de Água', e: 'Defesa tier II por 2 turnos', a: true } }] } };
  const b = P.instancia('kitsune', 3, g, { min: 0, max: 5 }), log = [];
  const marcas = P.BARRA.kitsune.dica ? P.BARRA.kitsune.dica(b.s, 'c1') : '';
  ok(/Pele de Água/.test(marcas) && /podre/.test(marcas), '(lote 174) a cauda 2 mostra o poder e que está podre: ' + marcas.replace(/<[^>]+>/g, ''));
  P.BARRA.kitsune.clique(b.s, 'c1', { nome: 'Dain', log: t => log.push(t), v: 3 });
  const c1 = C.norm(b.s.caudas)[1];
  ok(!c1.p && /Dain usa Pele de Água \(Kappa\), da cauda 2/.test(log.join(' ')) && /volta a servir/.test(log.join(' ')), '(lote 174) tocar a cauda usa o poder, e a cauda podre volta a servir: ' + log.join(' '));
  const novo = C.naFicha({ rec: { x: 1 }, pb: { kitsune: { s: { caudas: b.s.caudas }, c: {}, u: {}, g: 0 } } }, C.mudar(b.s.caudas, { t: 'guardar', i: 0, p: { n: 'Grito', y: 'Tengu', a: true } }).caudas);
  ok(novo.podre && novo.podre.ba_a_kitsune === 1 && C.bibDaFicha(novo).some(p => p.n === 'Grito'), '(lote 174) a cauda podre vira o podre da barra Caudas, e o poder entra na biblioteca');
  ok(C.daFicha(novo)[0].p.n === 'Grito' && novo.rec.x === 1, '(lote 173) a ficha e o painel usam o mesmo lugar (estado.pb.kitsune.s.caudas)');
}
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
    ok(a.linhas.length > antes || !(d.patamares || []).length, d.id + ': os patamares e o risco avisam na mesa (a Kitsune não tem)');
    P.comecarTurno(a); P.terminarTurno(a); P.fimDoCombate(a, b, d.inicio);
    ok(d.fim === 'fica' ? b.v === d.max : b.v === d.inicio, d.id + (d.fim === 'fica' ? ': o fim do combate deixa como está (as Caudas)' : ': o fim do combate volta ao início'));
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
// (lote 118) o Ferreiro: Quebrar soma até −tier III no mesmo alvo
{ const b = P.BARRAS.find(x => x.id === 'ferreiro'), a = ator(b), s = b.estado();
  const ctx = { nome: 'Teste', ator: a, log: t => a.logar(t), ganhar() {}, perder() {}, definir() {}, aviso() {} };
  for (let i = 0; i < 4; i++) b.acao(s, 'quebrar', ctx, 'Orc');
  ok(b && s.quebrados.length === 1 && s.quebrados[0].k === 3, 'Ferreiro: Quebrar soma até −tier III — ' + JSON.stringify(s.quebrados));
  b.acao(s, 'consertado', ctx); ok(!s.quebrados.length, 'Ferreiro: limpar as quebras'); }
console.log(`${n - bad} verificações passaram${bad ? ', ' + bad + ' falharam' : ''}`);
process.exit(bad ? 1 : 0);
