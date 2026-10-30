// O painel de barras (lote 44), a lógica pura (tc/barras-painel.js): as 49 barras do guia, cada uma com a face, as
// abas, os toques e os ganhos; o que se guarda e volta; os limites da ficha; o teto da rodada; o fim do combate (zera,
// volta ao início da ficha, fica); a ligação com as árvores (pelo id da mesa, pelo nome; as 3 Oradoras numa barra só;
// a Bênção de Selene não cria barra); a lista para o mestre escolher no NPC sem ficha.
const { checker } = require('./lib');
const { ok, end } = checker();
const fs = require('fs'), path = require('path');
const PB = require('../../tc/barras-painel.js');
const j = JSON.stringify;

const fonte = fs.readFileSync(path.join(__dirname, '../../tc/barras-painel.js'), 'utf8');
ok(!/<\/script/i.test(fonte), 'o arquivo não tem "</script" (ele vai inteiro dentro da página de teste das Cenas)');
ok(!/Alegreya/.test(fonte), 'as faces usam as fontes do site (nenhuma "Alegreya" do protótipo)');

ok(PB.BARRAS.length === 49, '49 barras — ' + PB.BARRAS.length);
const ids = PB.BARRAS.map(d => d.id);
ok(new Set(ids).size === 49 && ids.every(id => PB.BARRA[id] && PB.BARRA[id].id === id), 'os ids não se repetem e o índice BARRA aponta para cada uma');
const cats = {}; for (const d of PB.BARRAS) cats[d.cat] = (cats[d.cat] || 0) + 1;
ok(cats.classe === 12 && Object.keys(cats).every(c => ['classe', 'raca', 'linhagem'].includes(c)), 'as categorias: 12 classes, e o resto raças e linhagens — ' + j(cats));
ok(PB.BARRAS.every(d => /^#[0-9A-Fa-f]{6}$/.test(d.cor) && d.barra && d.arvore && typeof d.face === 'function' && typeof d.linha === 'function' && typeof d.acoes === 'function' && Array.isArray(d.ganhos) && ['zera', 'inicio', 'fica'].includes(d.fim)),
  'toda barra tem cor, nome, árvore, face, linha de estado, ações, ganhos e o que faz no fim do combate');
ok(Object.keys(PB.ARVORES).length === 49 && ids.every(id => PB.ARVORES[id] && PB.ARVORES[id].length), 'toda barra tem a árvore dela na biblioteca da mesa');

// um personagem de mentira, que guarda o que vai para a mesa ao vivo
const linhas = [];
const ator = (id, v, o) => ({ nome: 'Teste', dono: 'jogador', barras: [PB.instancia(id, v, null, o)], aba: 0, aberto: true, logar: (m, c) => linhas.push([m, c]), rodada: () => 1 });

// as 49: desenhar (aberta, fechada), tocar em tudo o que o painel oferece, começar e terminar o turno, encerrar
const ruins = [], semFace = [];
const valores = h => {
  const ks = [...h.matchAll(/data-k="([^"]+)"/g)].map(m => m[1]);
  const as = [...h.matchAll(/<button[^>]*data-a="([^"_][^"]*)"[^>]*>/g)].map(m => [m[1], (m[0].match(/value="([^"]*)"/) || [])[1]]);
  const sels = [...h.matchAll(/<select[^>]*data-a="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)].map(m => [m[1], [...m[2].matchAll(/value="([^"]*)"/g)].map(x => x[1])]);
  return { ks: [...new Set(ks)], as, sels };
};
for (const d of PB.BARRAS) {
  try {
    const a = ator(d.id);
    const b = a.barras[0];
    const h1 = PB.painelHTML(a, { papel: 'jogador', desfazer: true, esconder: true });
    if (!/<svg/.test(h1.html) || /undefined|NaN/.test(h1.html)) semFace.push(d.id + ':aberta');
    a.aberto = false;
    const h0 = PB.painelHTML(a, {});
    if (h0.cls !== 'pb moeda' || /undefined|NaN/.test(h0.html)) semFace.push(d.id + ':moeda');
    a.aberto = true;
    // toques: as marcas da face, os botões e as escolhas
    for (let volta = 0; volta < 2; volta++) {
      const { ks, as, sels } = valores(PB.painelHTML(a, { papel: 'mestre' }).html);
      for (const k of ks) if (d.clique) PB.mexer(a, b, ctx => d.clique.call(d, b.s, k, ctx));
      for (const [ac, val] of as) if (d.acao) PB.mexer(a, b, ctx => d.acao.call(d, b.s, ac, ctx, val, { value: val, dataset: {} }));
      for (const [ac, vs] of sels) for (const val of vs.slice(0, 3)) if (d.acao) PB.mexer(a, b, ctx => d.acao.call(d, b.s, ac, ctx, val, { value: val, dataset: {} }));
    }
    for (const g of d.ganhos) {
      if (g.quando === 'agora') PB.tocarAgora(a, b, g);
      else b.cont[g.id] = g.tipo === 'tg' ? 1 : (g.max || 2);
    }
    PB.aplicar(a, b, 'inicio'); PB.aplicar(a, b, 'fim');
    PB.comecarTurno(a); PB.terminarTurno(a);
    const h2 = PB.painelHTML(a, { papel: 'jogador' });
    if (/undefined|NaN/.test(h2.html)) semFace.push(d.id + ':depois');
    const sel = PB.seloDe(a);
    if (!(sel.length === 1 && sel[0].id === d.id && sel[0].cor === d.cor && typeof sel[0].n === 'string')) ruins.push(d.id + ': selo ' + j(sel));
    PB.fimDoCombate(a, b, 3);
    if (b.v < (d.min) || b.v > d.max) ruins.push(d.id + ': fora do limite ' + b.v);
    if (d.fim === 'zera' && !d.aoFimCombate && b.v !== 0) ruins.push(d.id + ': não zerou');
    if (d.fim === 'inicio' && !d.aoFimCombate && b.v !== Math.max(d.min, Math.min(d.max, 3))) ruins.push(d.id + ': não voltou ao início da ficha (3) — ' + b.v);
  } catch (e) { ruins.push(d.id + ': ' + (e && e.message)); }
}
ok(ruins.length === 0, 'as 49 barras aguentam todos os toques, o turno e o fim do combate — ' + ruins.slice(0, 6).join(' | '));
ok(semFace.length === 0, 'as faces e o painel sempre desenham (sem "undefined" nem "NaN") — ' + semFace.slice(0, 6).join(' | '));
ok(linhas.length > 49 && linhas.every(([m, c]) => typeof m === 'string' && m && /^#/.test(c)), 'os toques escrevem linhas para a mesa, com a cor da barra (' + linhas.length + ')');

// o Samurai: a primeira postura não custa; a troca de família custa; o fim zera e sai da postura
{
  linhas.length = 0;
  const a = ator('samurai', 8), b = a.barras[0], d = b.def;
  PB.mexer(a, b, ctx => d.clique.call(d, b.s, 'alta', ctx));
  ok(b.s.atual === 'alta' && b.v === 8 && linhas.some(([m]) => /Teste entrou na Postura Alta/.test(m)), 'Samurai: a primeira postura do combate não custa (Postura 8, na Alta) — ' + j(linhas));
  PB.mexer(a, b, ctx => d.clique.call(d, b.s, 'baixa', ctx));
  ok(b.s.atual === 'baixa' && b.v === 2, 'a família oposta custa 6 (Postura 2, na Baixa) — ' + b.v + ' ' + b.s.atual);
  ok(PB.seloDe(a)[0].marca === '下', 'o selo do token mostra o kanji da postura');
  const g = PB.guardar(b);
  const b2 = PB.instancia('samurai', b.v, JSON.parse(j(g)));
  ok(b2.s.atual === 'baixa' && b2.s.ultima === 'alta' && b2.s.usouPrimeira === true && b2.v === 2, 'o que se guarda volta igual (a postura, a última, a primeira já usada)');
  PB.fimDoCombate(a, b);
  ok(b.v === 0 && b.s.atual === null && b.s.usouPrimeira === false, 'o fim do combate zera a Postura e sai da postura');
}

// o rodapé: "Fim do combate" (uma barra só) é do mestre; o jogador tem o olho que esconde; o Desfazer quando há o quê
{
  const a = ator('selene', 4);
  const hj = PB.painelHTML(a, { papel: 'jogador', esconder: true, desfazer: false }).html, hm = PB.painelHTML(a, { papel: 'mestre', desfazer: true }).html;
  ok(!/data-a="__fim"/.test(hj) && /data-a="__esconder"/.test(hj) && !/data-a="__desfazer"/.test(hj), 'o jogador: sem "Fim do combate" (vem com o Encerrar do mestre), com o olho; sem Desfazer até mexer');
  ok(/data-a="__fim"/.test(hm) && !/data-a="__esconder"/.test(hm) && /data-a="__desfazer"/.test(hm), 'o mestre: "Fim do combate" e o Desfazer, sem o olho');
  ok((hj.match(/data-sem-tags/g) || []).length >= 4 && !/class="pb-estado"[^>]*data-sem-tags/.test(hj), 'as abas, os botões e os ganhos ficam fora do glossário; a linha de estado, não');
}

// os limites da ficha e o teto da rodada
{
  const a = ator('samurai', 4, { min: 0, max: 6 }), b = a.barras[0];
  PB.mexer(a, b, ctx => { ctx.v = 50; });
  ok(b.v === 6, 'o máximo da ficha manda (6, não o 20 do guia)');
  const comTeto = PB.BARRAS.find(d => typeof d.teto === 'number' && d.ganhos.some(g => g.quando === 'agora' && g.v > 0 && !g.foraTeto && !g.max && !g.bloq));
  if (comTeto) {
    const a2 = ator(comTeto.id, 0), b2 = a2.barras[0], g = comTeto.ganhos.find(x => x.quando === 'agora' && x.v > 0 && !x.foraTeto && !x.max && !x.bloq);
    for (let i = 0; i < 20; i++) PB.tocarAgora(a2, b2, g);
    ok(b2.ganhoRodada === comTeto.teto && /Teto da rodada/.test(b2.aviso || '') || b2.ganhoRodada === comTeto.teto, comTeto.barra + ': os toques param no teto da rodada (' + comTeto.teto + ')');
    PB.comecarTurno(a2);
    ok(b2.ganhoRodada === 0, 'e o começo do turno zera o que entrou na rodada');
  } else ok(false, 'uma barra com teto e um toque "na hora" para testar');
}

// a ligação com as árvores
ok(PB.barraDaArvore('azavpm5qd8') === 'samurai' && PB.barraDaArvore({ id: 'atehaqx1sg' }) === 'selene' && PB.barraDaArvore('awbw94n05o') === 'rastoroni', 'pelo id da árvore na mesa');
ok(['aijv2xkz3l', 'a24nmazt4x', 'a0j41dk16b'].every(id => PB.barraDaArvore(id) === 'oradora'), 'as 3 Oradoras dividem a barra das Palavras');
ok(PB.barraDaArvore(PB.BENCAO_SELENE) === null && PB.barraDaArvore({ id: 'outra', nome: 'Bênção de Selene' }) === null, 'a Bênção de Selene não cria barra');
ok(PB.barraDaArvore({ id: 'zzz', nome: 'samurai' }) === 'samurai' && PB.barraDaArvore({ id: 'zzz', nome: 'Kitsune Karê Oradora da Lua' }) === 'oradora' && PB.barraDaArvore({ id: 'zzz', nome: 'Karê Dançarina' }) === 'danca',
  'pelo nome, para as árvores de outra mesa (sem acento, sem maiúscula; os nomes da Karê)');
ok(PB.barraDaArvore({ id: 'zzz', nome: 'Árvore Nova' }) === null && PB.barraDaArvore(null) === null && PB.barraDaArvore('') === null, 'uma árvore que não é do guia não tem barra');
ok(PB.BARRAS.every(d => PB.barraDaArvore({ id: 'qualquer', nome: d.arvore }) === d.id), 'o nome de cada árvore do guia leva à barra dela');

// a lista do mestre (NPC sem ficha)
const L = PB.lista();
const ordem = ['classe', 'raca', 'linhagem'];
ok(L.length === 49 && L.every((x, i) => i === 0 || ordem.indexOf(L[i - 1].cat) < ordem.indexOf(x.cat) || (L[i - 1].cat === x.cat && L[i - 1].arvore.localeCompare(x.arvore, 'pt-BR') <= 0)), 'a lista para o mestre: por categoria (classes, raças, linhagens) e por nome');

// os ícones soltos e o escape
ok(/^<svg/.test(PB.iconeSolto('samurai', '#fff', 20)) && /^<svg/.test(PB.svgIcone('samurai', 14)), 'o ícone de cada barra (para o selo do token)');
ok(PB.esc('<a "b">&') === '&lt;a &quot;b&quot;&gt;&amp;', 'o texto do nome vai escapado');
end();
