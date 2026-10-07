// O auditor dos dados (tc/auditoria.js): ler os dados de cada rolagem, contar e dizer se cabe no acaso.
// Uso: node src/tests/auditoria.test.js
'use strict';
const A = require('../../tc/auditoria.js');
const D = require('../../tc/dice.js');
let n = 0, bad = 0;
const ok = (c, msg) => { n++; if (!c) { bad++; if (bad <= 30) console.log('FALHOU: ' + msg); } };
const j = x => JSON.stringify(x);
const eq = (a, b, msg) => ok(j(a) === j(b), msg + ' — esperado ' + j(b) + ', veio ' + j(a));
const perto = (a, b, tol) => Math.abs(a - b) <= tol;

/* um gerador com semente (mulberry32): o teste dá sempre o mesmo resultado */
function gerador(semente) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const dado = (rng, lados) => 1 + Math.floor(rng() * lados);
const varios = (rng, lados, quantos) => Array.from({ length: quantos }, () => [lados, dado(rng, lados)]);

/* ================= os dados de uma rolagem ================= */
eq(A.separar([[20, 14], [6, 6], [6, 1]]), { bons: [[20, 14], [6, 6], [6, 1]], ruins: [] }, 'separar: o que um dado pode mostrar é bom');
eq(A.separar([[20, 0], [20, 21], [20, 20]]), { bons: [[20, 20]], ruins: [[20, 0], [20, 21]] }, 'separar: 0 e 21 num d20 são impossíveis — ficam à parte, não somem');
eq(A.separar([[1, 1], [0, 0], [20, 1.5], ['20', 3], [20], null, [20, -1], [2e6, 5], 'x']), { bons: [], ruins: [] }, 'separar: dado de um lado, e o que não é um par de inteiros, não conta');
eq(A.separar('x'), { bons: [], ruins: [] }, 'separar: o que não é lista dá vazio');
eq(A.separar(Array.from({ length: 500 }, () => [6, 3])).bons.length, 200, 'separar: no máximo 200 dados por rolagem');

const LEITURAS = [
  ['17 no d40 + 20 de fixa (atributo 60)', [[40, 17]], 'fixa pela mesa'],
  ['14 no d60, sem fixa (atributo 60)', [[60, 14]], 'fixa sem fixar'],
  ['Fixa total de 20, sem rolar dado (atributo 20)', [], 'fixa total: nenhum dado'],
  ['FOR 60 · 1d40 + 20 → dado 17', [[40, 17]], 'rolagem rápida da ficha'],
  ['FOR 60 base · 1d60 + 0 → dado 3', [[60, 3]], 'rolagem rápida, valor base, sem fixa'],
  ['FOR 60 · fixo em 60', [], 'rolagem rápida com fixa total'],
  ['Dain: FOR 60 (1d40 + 20, dado 17) = 37  ·  Goblin: valor 40 (1d35 + 5, dado 30) = 35', [[40, 17], [35, 30]], 'disputa: os dois lados'],
  ['Dain: FOR 60 (fixo em 60) = 60  ·  Goblin: valor 40 (1d35 + 5, dado 30) = 35', [[35, 30]], 'disputa com um lado de fixa total'],
  ['2d6+3  2d6 [4, 4] +3', [[6, 4], [6, 4]], 'dados livres da ficha'],
  ['1d20+2d4  1d20 [11] 2d4 [1, 4]', [[20, 11], [4, 1], [4, 4]], 'dados livres da ficha, duas partes'],
  ['Iniciativa · 1d20 (14) + 3', [[20, 14]], 'iniciativa pela ficha'],
  ['1d20 (9) − 2', [[20, 9]], 'iniciativa pelas cenas, bônus negativo'],
  ['Iniciativa · 1d20 (0) + 3', [[20, 0]], 'o zero que o botão da ficha já sorteou aparece como foi escrito'],
  ['2d6 + 3 → [4, 4] + 3', [[6, 4], [6, 4]], 'dados pela mesa'],
  ['1d20 → [20]', [[20, 20]], 'um dado só'],
  ['−1d4 + 2d6 → −[3] + [2, 5]', [[4, 3], [6, 2], [6, 5]], 'parte negativa'],
  ['usou Poção · 2d6 + 3 → [4, 2] + 3 = 9 · HP 10 → 19', [[6, 4], [6, 2]], 'poção com dados'],
  ['usou Elixir 1d8 · 2d6 + 3 → [4, 2] + 3 = 9 · HP 10 → 19', [[6, 4], [6, 2]], 'o nome do item pode ter "1d8": valem as partes da conta'],
  ['20d6 → [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, …]', [[6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6]], 'mais de 12 dados: os 12 que o painel mostra'],
  ['2d6 → [4]', [], 'lista que não bate com a conta: não lê'],
  ['3d6 → [4, 4, 4, 4]', [], 'idem, lista maior'],
  ['Dain 30 × 25 Goblin. Dain venceu por 5.', [], 'duelo do Rolador antigo: só totais'],
  ['usou Poção · HP 10 → 19', [], 'uso sem dado'],
  ['', [], 'vazio'],
];
for (const [texto, esperado, que] of LEITURAS) eq(A.doResumo(texto), esperado, 'doResumo — ' + que);
eq(A.doResumo(null), [], 'doResumo(null)');
eq(A.doResumo('Encontros → Lobos famintos (3 de 10)', true), [[10, 3]], 'sorteio de tabela: um dado do tamanho da tabela');
eq(A.doResumo('Encontros → Ruína (2 de 5) ao norte (7 de 12)', true), [[12, 7]], 'tabela: só vale o fim (o item pode ter parênteses)');
eq(A.doResumo('Encontros → Lobos famintos (3 de 10)', false), [], 'sem dizer que é tabela, "(3 de 10)" não é lido');
/* o que a biblioteca de dados escreve hoje é lido de volta igual — se o texto do painel mudar, este teste avisa */
{
  const rng = gerador(7);
  let certo = 0, total = 0;
  for (let i = 0; i < 300; i++) {
    const exprs = ['1d20', '2d6+3', '1d100-5', '3d8+1d4', '12d6', '1d2', '4d10+2d12+7'];
    const r = D.rollExpr(exprs[i % exprs.length]);
    const texto = D.summary({ mode: 'dados', expr: r.expr, terms: r.terms, total: r.total }).replace(/^[-−]?\d+ · /, '');
    total++; if (j(A.doResumo(texto)) === j(D.diceOf(r))) certo++;
    const a = 2 + Math.floor(rng() * 90), f = Math.floor(rng() * a);
    const x = D.rollFixa(a, f), t2 = D.summary({ mode: 'fixa', atributo: x.atributo, fixa: x.fixa, dieValue: x.dieValue, total: x.total }).replace(/^[-−]?\d+ · /, '');
    total++; if (j(A.separar(A.doResumo(t2)).bons) === j(D.diceOf(x))) certo++;
  }
  ok(certo === total, 'o texto que a mesa escreve (dados e fixa) é lido de volta como os dados que saíram: ' + certo + ' de ' + total);
}
eq(A.dadosDaLinha({ dd: [[20, 3]], resumo: '1d20 → [17]' }), { bons: [[20, 3]], ruins: [], lidos: false }, 'dadosDaLinha: os dados guardados valem antes do texto');
eq(A.dadosDaLinha({ dd: [], resumo: '1d20 → [17]' }), { bons: [[20, 17]], ruins: [], lidos: true }, 'dadosDaLinha: sem dados guardados, lê o texto');
eq(A.dadosDaLinha({ dados: { dd: [[6, 2]] } }), { bons: [[6, 2]], ruins: [], lidos: false }, 'dadosDaLinha: aceita a linha inteira do registro');
eq(A.dadosDaLinha({ dados: { resumo: 'Iniciativa · 1d20 (0) + 1' } }), { bons: [], ruins: [[20, 0]], lidos: true }, 'dadosDaLinha: valor impossível lido do texto vai para os ruins');
eq(A.dadosDaLinha({ k: 'tabela', origem: 'rolador', resumo: 'T → x (2 de 4)' }).bons, [[4, 2]], 'dadosDaLinha: tabela do Rolador');
eq(A.dadosDaLinha({ k: 'tabela', origem: 'mundo', resumo: 'T → x (2 de 4)' }).bons, [], 'dadosDaLinha: tabela de outro sistema não é lida do texto');
eq(A.dadosDaLinha(null), { bons: [], ruins: [], lidos: true }, 'dadosDaLinha(null)');

/* ================= as contas ================= */
// valores de tabela do qui-quadrado
ok(perto(A.pQui(3.841, 1), 0.05, 2e-4) && perto(A.pQui(16.919, 9), 0.05, 2e-4) && perto(A.pQui(21.666, 9), 0.01, 1e-4) && perto(A.pQui(30.144, 19), 0.05, 2e-4) && perto(A.pQui(43.82, 19), 0.001, 5e-5),
  'pQui confere com a tabela: ' + [A.pQui(3.841, 1), A.pQui(16.919, 9), A.pQui(21.666, 9), A.pQui(30.144, 19), A.pQui(43.82, 19)].map(x => x.toFixed(5)).join(' '));
ok(A.pQui(0, 9) === 1 && A.pQui(5, 0) === 1 && A.pQui(-1, 3) === 1 && A.pQui(1e4, 9) < 1e-100 && perto(A.pQui(9, 9), 0.4373, 1e-3) && perto(A.pQui(99, 99), 0.4812, 2e-3), 'pQui nas pontas e no meio');
{
  let mono = true, ant = 1;
  for (let x = 0.5; x < 80; x += 0.5) { const p = A.pQui(x, 12); if (!(p <= ant + 1e-12) || !(p >= 0)) mono = false; ant = p; }
  ok(mono, 'pQui só desce quando a diferença cresce');
}
eq(A.contarFaces([[6, 1], [6, 6], [6, 6], [20, 3]], 6), { n: 3, obs: [1, 0, 0, 0, 0, 2], esp: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5] }, 'contarFaces: só o dado pedido');
{
  // d20 em 10 faixas: duas faces por faixa
  const todas = Array.from({ length: 20 }, (_, i) => [20, i + 1]);
  const f = A.emFaixas(todas, 10);
  ok(f.n === 20 && f.obs.every(x => x === 2) && f.esp.every(x => perto(x, 2, 1e-9)), 'emFaixas: um d20 espalha duas faces por faixa');
  // d6 em 10 faixas: não espalha por igual — e o esperado sabe disso
  const d6 = A.emFaixas(Array.from({ length: 6 }, (_, i) => [6, i + 1]), 10);
  eq(d6.obs, [1, 1, 0, 1, 0, 1, 1, 0, 1, 0], 'emFaixas: as seis faces do d6 caem em seis das dez faixas');
  ok(d6.obs.every((o, i) => perto(d6.esp[i], o, 1e-9)), 'emFaixas: e o esperado de cada faixa é exatamente a parte das faces que cai nela');
  // qualquer tamanho: o esperado soma o número de dados, e cada face cai na faixa certa
  let certo = true;
  for (const L of [2, 3, 7, 10, 13, 37, 100, 101, 999, 5000, 5001, 7001, 100000]) {
    const e = A.emFaixas([[L, 1]], 10).esp;
    if (!perto(e.reduce((a, b) => a + b, 0), 1, 1e-9)) certo = false;
    if (L <= 7001) {                                           // confere com a contagem face a face
      const cont = new Array(10).fill(0);
      for (let v = 1; v <= L; v++) cont[Math.min(9, Math.floor((v - 1) * 10 / L))]++;
      if (!cont.every((c, i) => perto(c / L, e[i], 1e-12))) certo = false;
    }
  }
  ok(certo, 'emFaixas: para qualquer tamanho de dado, o esperado bate com a contagem face a face (inclusive nos dados enormes)');
}

/* ---- dado honesto, dado viciado, poucas rolagens ---- */
{
  const rng = gerador(2026);
  const honesto = varios(rng, 20, 4000);
  const c = A.conferir(honesto, 20);
  ok(c.modo === 'faces' && c.n === 4000 && c.analise.gl === 19 && c.veredito.nivel === 'ok' && /Dentro do esperado/.test(c.veredito.titulo), '4.000 rolagens de um d20 honesto: dentro do esperado (p = ' + c.analise.p.toFixed(3) + ')');
  ok(c.rotulos.length === 20 && c.rotulos[0] === '1' && c.rotulos[19] === '20' && c.analise.barras.every(b => perto(b.esp, 200, 1e-9) && b.de < 200 && b.ate > 200), 'cada face tem o seu esperado (200) e o intervalo em que costuma ficar');
  ok(Math.abs(c.altura.z) < 2 && perto(c.altura.media, 0.5, 0.02) && /dentro do que o acaso produz/.test(A.textoDaAltura(c.altura)), 'e a altura média fica perto de 50%: ' + A.textoDaAltura(c.altura));

  // viciado: o 20 sai o dobro das outras faces
  const viciado = Array.from({ length: 4000 }, () => { const v = 1 + Math.floor(rng() * 21); return [20, v > 20 ? 20 : v]; });
  const cv = A.conferir(viciado, 20);
  ok(cv.veredito.nivel === 'fora' && cv.analise.piores[0].i === 19 && /o 20 saiu \d+ vezes/.test(cv.veredito.texto) && /1 a cada/.test(cv.veredito.texto), 'um d20 em que o 20 sai o dobro: fora do esperado, e o texto diz qual face — ' + cv.veredito.texto);
  ok(cv.altura.z > 3 && /bem acima do comum/.test(A.textoDaAltura(cv.altura)), 'e a altura média denuncia para que lado: ' + A.textoDaAltura(cv.altura));

  // o defeito que o botão de iniciativa da ficha tinha: 0 a 19 em vez de 1 a 20
  const torto = Array.from({ length: 3000 }, () => [20, Math.floor(rng() * 20)]);
  const s = A.separar(torto, 5000), ct = A.conferir(s.bons, 20);
  ok(s.ruins.length > 100 && s.ruins.every(x => x[1] === 0) && ct.veredito.nivel === 'fora' && ct.analise.barras[19].obs === 0 && /o 20 saiu 0 vezes/.test(ct.veredito.texto),
    'um d20 que sorteia de 0 a 19: os zeros aparecem como impossíveis (' + s.ruins.length + ') e a falta do 20 é apontada — ' + ct.veredito.texto);

  // poucas rolagens: não julga
  const poucas = A.conferir(varios(rng, 20, 30), 20);
  ok(poucas.veredito.nivel === 'pouco' && /poucas rolagens/.test(poucas.veredito.titulo) && /cerca de 100/.test(poucas.veredito.texto), 'com 30 rolagens de d20, o auditor diz que ainda é cedo (e quantas faltam): ' + poucas.veredito.texto);
  const nada = A.conferir([], 20);
  ok(nada.veredito.nivel === 'nada' && nada.n === 0, 'sem rolagens, diz que não há o que conferir');
  ok(A.textoDaAltura(A.alturaMedia([])) === '', 'e não inventa altura média');

  // dados de vários tamanhos juntos (como as rolagens com fixa): 10 faixas
  const mistura = Array.from({ length: 3000 }, () => { const L = 2 + Math.floor(rng() * 99); return [L, dado(rng, L)]; });
  const cm = A.conferir(mistura, null);
  ok(cm.modo === 'faixas' && cm.rotulos.length === 10 && cm.rotulos[0] === '0–10%' && cm.rotulos[9] === '90–100%' && cm.veredito.nivel === 'ok' && perto(cm.analise.barras.reduce((a, b) => a + b.esp, 0), 3000, 1e-6),
    'dados de tamanhos misturados, honestos: dentro do esperado nas 10 faixas (p = ' + cm.analise.p.toFixed(3) + ')');
  // os mesmos dados, mas quem rola "ajuda": 1 em cada 6 resultados baixos é rolado de novo
  const ajudado = mistura.map(([L, v]) => (v <= L / 2 && rng() < 1 / 6 ? [L, dado(rng, L)] : [L, v]));
  const ca = A.conferir(ajudado, null);
  ok(ca.veredito.nivel === 'fora' && ca.veredito.porAltura && ca.altura.z > 3 && /caíram mais alto do que deviam: em \d+,\d% da altura do dado/.test(ca.veredito.texto),
    'quem rola de novo 1 em cada 6 resultados baixos aparece — pela altura média, mesmo que nenhuma faixa destoe sozinha: ' + ca.veredito.texto);
  // o contrário: resultados puxados para baixo
  const azarado = mistura.map(([L, v]) => (v > L / 2 && rng() < 1 / 6 ? [L, dado(rng, L)] : [L, v]));
  ok(/caíram mais baixo do que deviam/.test(A.conferir(azarado, null).veredito.texto), 'e o lado contrário também é dito: ' + A.conferir(azarado, null).veredito.titulo);
  // poucas rolagens, mas todas altas: as faces ainda não dá para julgar; a altura já diz
  const sortudo = Array.from({ length: 40 }, () => [20, 13 + dado(rng, 7)]);
  const cs = A.conferir(sortudo, 20);
  ok(cs.analise.minEsp < 5 && cs.veredito.nivel === 'fora' && cs.veredito.porAltura && !cs.veredito.porFaces, '40 rolagens de d20, todas de 14 para cima: mesmo sendo poucas, a altura média acusa — ' + cs.veredito.texto.slice(0, 150));
  ok(A.conferir(varios(rng, 20, 40), 20).veredito.nivel === 'pouco', 'e 40 rolagens honestas continuam sendo "poucas para julgar"');
  ok(/perto de \d+,\d\)/.test(A.conferir(Array.from({ length: 4010 }, () => { const v = 1 + Math.floor(rng() * 23); return [20, v > 20 ? 7 : v]; }), 20).veredito.texto), 'os números do texto vêm com vírgula');

  // um dado grande sozinho: faixas com as faces de cada uma
  const d37 = A.conferir(varios(rng, 37, 2000), 37);
  ok(d37.modo === 'faixas' && d37.rotulos[0] === '1–4' && d37.rotulos[9] === '35–37' && d37.veredito.nivel === 'ok', 'um d37: dez faixas, rotuladas com as faces (' + d37.rotulos.join(' ') + ')');
  let rot = true;
  for (const L of [31, 37, 40, 99, 100, 250]) {
    const r = A.conferir([[L, 1]], L).rotulos.map(x => x.split('–').map(Number));
    for (let v = 1; v <= L; v++) { const b = Math.min(9, Math.floor((v - 1) * 10 / L)); if (!(v >= r[b][0] && v <= r[b][1])) rot = false; }
    if (r[0][0] !== 1 || r[9][1] !== L) rot = false;
  }
  ok(rot, 'o rótulo de cada faixa cobre exatamente as faces que caem nela');
}

/* ---- a régua não acusa à toa: dados honestos passam do limite de 5% em cerca de 5% das vezes (ou menos) ---- */
{
  const rng = gerador(99);
  let a5 = 0, a1 = 0, m5 = 0, m1 = 0;
  const N = 600;
  for (let i = 0; i < N; i++) {
    const v = A.conferir(varios(rng, 20, 1000), 20).veredito;
    if (v.nivel === 'atencao' || v.nivel === 'fora') a5++; if (v.nivel === 'fora') a1++;
    const mis = Array.from({ length: 800 }, () => { const L = 2 + Math.floor(rng() * 60); return [L, dado(rng, L)]; });
    const vm = A.conferir(mis, null).veredito;
    if (vm.nivel === 'atencao' || vm.nivel === 'fora') m5++; if (vm.nivel === 'fora') m1++;
  }
  ok(a5 / N > 0.015 && a5 / N < 0.085 && a1 / N < 0.03, 'd20 honesto, com as duas perguntas juntas: o auditor estranha em ' + (100 * a5 / N).toFixed(1) + '% das conferências (o combinado é 5%) e acusa em ' + (100 * a1 / N).toFixed(1) + '% (o combinado é 1%)');
  ok(m5 / N < 0.085 && m1 / N < 0.03, 'dados misturados honestos: estranha em ' + (100 * m5 / N).toFixed(1) + '% e acusa em ' + (100 * m1 / N).toFixed(1) + '%');
}

/* ================= a mesa inteira ================= */
{
  const rng = gerador(5);
  const linhas = [];
  const linha = (autor, nome, extra) => linhas.push(Object.assign({ id: 'r' + linhas.length, autor_id: autor, autor_nome: nome, origem: 'mesa', criado_em: '2026-10-05T12:00:00Z' }, extra));
  for (let i = 0; i < 300; i++) linha('u1', 'Bruno', { dd: [[20, dado(rng, 20)]] });
  for (let i = 0; i < 200; i++) linha('u2', 'Dalmo', { resumo: dado(rng, 40) + ' no d40 + 20 de fixa (atributo 60)' });
  linha('u2', 'Dalmo', { resumo: 'Iniciativa · 1d20 (0) + 2', origem: 'ficha' });
  linha('u1', 'Bruno', { resumo: 'A cena está no ar', k: 'tabela', origem: 'cena' });
  linha('u1', 'Bruno', { k: 'tabela', origem: 'rolador', resumo: 'Encontros → Lobos (3 de 10)' });
  // o pedido de defesa mora no registro, mas não é rolagem (nem conta como "sem dado"); a defesa rolada a pedido e a disputa das Cenas, sim
  linha('u1', 'Bruno', { k: 'pedido', origem: 'cena', resumo: 'Defesa Mágica + Fogo. Para: R2d2 (3), Dain.' });
  linhas.push({ id: 'px', autor_id: 'u1', autor_nome: 'Bruno', origem: 'cena', dados: { k: 'pedido', resumo: 'Defesa Física. Para: 1d20 (7).' } });
  const antesDoCombate = linhas.length;
  linhas.push(null, 'x');
  const m = A.juntar(linhas);
  {
    const extra = linhas.slice(0, antesDoCombate).concat([
      { id: 'd1', autor_id: 'u2', autor_nome: 'Dalmo', origem: 'mesa', k: 'fixa', resumo: '4 no d7 + 3 de fixa (atributo 10)', dd: [[7, 4]] },
      { id: 'd2', autor_id: 'u1', autor_nome: 'Bruno', origem: 'cena', k: 'ficha', resumo: 'Selene: AGI 13 (1d13 + 0, dado 8) = 8  ·  Goblin: DEF F 12 (fixo em 12) = 12' },
      { id: 'd3', autor_id: 'u1', autor_nome: 'Bruno', origem: 'cena', k: 'tabela', resumo: 'Dano 30 · defesa: Mágica + Fogo. Selene −20 HP (defesa 10, rolada); Orc: nada passou (defesa 31).' },
    ]);
    const m2 = A.juntar(extra);
    ok(m2.total === m.total + 3 && m2.rolagens.length === m.rolagens.length + 2 && m2.semDado === m.semDado + 1 && m2.impossiveis.length === m.impossiveis.length, 'juntar: a defesa rolada e a disputa das Cenas entram na conta; o aviso do ataque fica como "sem dado": ' + [m2.total, m2.rolagens.length, m2.semDado].join(' · '));
    eq(A.dadosDaLinha(extra[extra.length - 2]).bons, [[13, 8]], 'a disputa das Cenas, lida do texto: só o lado que rolou dado');
  }
  ok(m.total === 503 && m.rolagens.length === 501 && m.semDado === 2 && m.lidasDoTexto === 201, 'juntar: ' + m.total + ' linhas, ' + m.rolagens.length + ' com dado, ' + m.semDado + ' sem, ' + m.lidasDoTexto + ' lidas do texto');
  ok(m.impossiveis.length === 1 && m.impossiveis[0].nome === 'Dalmo' && m.impossiveis[0].origem === 'ficha' && j(m.impossiveis[0].dado) === '[20,0]', 'juntar: o dado impossível fica listado, com quem rolou e de onde');
  eq(m.pessoas.map(p => [p.nome, p.n]), [['Bruno', 301], ['Dalmo', 200]], 'juntar: quantos dados cada pessoa rolou');
  eq(m.tamanhos, [{ lados: 20, n: 300 }, { lados: 40, n: 200 }, { lados: 10, n: 1 }], 'juntar: os tamanhos de dado que apareceram, do mais rolado ao menos');
  ok(A.recortar(m.rolagens, {}).length === 501 && A.recortar(m.rolagens, { pessoa: 'u2' }).length === 200 && A.recortar(m.rolagens, { lados: 20 }).length === 300 && A.recortar(m.rolagens, { pessoa: 'u1', lados: 10 }).length === 1 && A.recortar(m.rolagens, { pessoa: 'u9' }).length === 0, 'recortar: por pessoa e por tamanho');
  const cb = A.conferir(A.recortar(m.rolagens, { pessoa: 'u1', lados: 20 }), 20);
  ok(cb.n === 300 && cb.veredito.nivel === 'ok', 'a conferência do d20 do Bruno: ' + cb.veredito.titulo);
  eq(A.juntar(null), { rolagens: [], total: 0, semDado: 0, impossiveis: [], lidasDoTexto: 0, pessoas: [], tamanhos: [] }, 'juntar(null): tudo vazio');
}

console.log(bad ? `${n - bad} verificações passaram, ${bad} falharam` : `${n} verificações passaram`);
process.exit(bad ? 1 : 0);
