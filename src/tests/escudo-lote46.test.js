// Os puzzles do lote 46 no Escudo do mestre, a página sozinha (fora de uma mesa): cada um dos doze tipos, resolvido no
// teste da prévia como os jogadores jogam (os toques, as letras, os pesos); o erro onde ele conta (o anagrama, o sudoku,
// a pedra falsa, a balança, os pares, a sequência); a dica no teste; o tema e as palavras do mestre; o tabuleiro com
// runas; o cronômetro (a conta e o puzzle travado quando acaba). TC_SCRATCH=<pasta> guarda capturas.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;

// o tabuleiro deslizante 3×3: o caminho mais curto até montar (busca em largura)
function resolverDeslizante(p, n) {
  const alvo = [...Array(n * n).keys()].join(','), ini = p.join(','), ant = new Map([[ini, null]]), fila = [ini];
  while (fila.length) {
    const s = fila.shift(); if (s === alvo) break;
    const a = s.split(',').map(Number), e = a.indexOf(n * n - 1), x = e % n, y = Math.floor(e / n);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const b = a.slice(), k = ny * n + nx; [b[e], b[k]] = [b[k], b[e]]; const t = b.join(',');
      if (!ant.has(t)) { ant.set(t, [s, k]); fila.push(t); }
    }
  }
  const toques = []; for (let s = alvo; ant.get(s); s = ant.get(s)[0]) toques.unshift(ant.get(s)[1]);
  return toques;
}

(async () => {
  const t = await start();
  const { page: p } = await t.device({ name: 'escudo46', w: 1440, h: 950 });
  p.setDefaultTimeout(8000);
  const w = ms => p.waitForTimeout(ms);
  const ev = (fn, a) => p.evaluate(fn, a);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const foto = async nome => { if (process.env.TC_SCRATCH) { require('fs').mkdirSync(path.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.locator('.previa').screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  await p.goto(t.base + 'escudo/?debug'); await w(700);
  await p.click('[data-k="aba:handouts"]'); await w(150);
  await p.click('[data-k="h:novo:puzzle"]'); await w(200);
  const puz = await ev(() => __escudo.HO.sel);
  const tst = () => ev(id => { const t = __escudo.HO.testes[id]; return t ? JSON.parse(JSON.stringify(t.jogo)) : null; }, puz);
  const m = () => ev(id => { const h = __escudo.A.handout(id); return JSON.parse(JSON.stringify(__escudo.E.montarPuzzle(h.puzzle, h.img, h.imgAr))); }, puz);
  const resolvido = async () => { for (let i = 0; i < 30; i++) { if (await p.locator('.previa .pz.resolvido').count()) return true; await w(100); } return false; };
  const clicar = async k => { await p.click('[data-k="' + k + '"]'); await w(40); };
  const tipo = async (tp, dif) => { await p.click('[data-k="pz:t:' + tp + '"]'); await w(300); if (dif) { await p.click('[data-k="pz:d:' + dif + '"]'); await w(300); } };
  const erros = async () => (await tst()).erros;
  const X = fn => ev(fn);

  await passo('os grupos novos', async () => {
    const txt = await p.locator('.tipos-pz').textContent();
    ok(['Palavras', 'Caminhos', 'Lógica', 'Memória e sequência'].every(g => txt.includes(g)) && await p.locator('[data-k^="pz:t:"]').count() === 19, 'os quatro grupos novos e os 19 tipos de puzzle');
  });

  await passo('palavras cruzadas', async () => {
    await tipo('cruzadas', 'medio');
    ok(await p.locator('.previa .cz-c').count() > 20 && await p.locator('[data-k="pz:tema"]').count() === 1, 'a grade e o tema das palavras');
    await p.selectOption('[data-k="pz:tema"]', 'mar'); await w(300);
    const mm = await m(), jg = await tst();
    ok((await ev(id => __escudo.A.handout(id).puzzle.tema, puz)) === 'mar' && mm.seg.pals.length === 7, 'o tema do Mar, com 7 palavras — ' + mm.seg.pals.join(', '));
    // a dica no teste: uma letra
    await clicar('tst:dica'); await w(200);
    ok(Object.keys((await tst()).estado).some(k => /^d\d+$/.test(k)), 'a dica no teste revela uma letra');
    for (let i = 0; i < mm.seg.sol.length; i++) if (jg.pub.mask[i] === '.' && !(i in jg.pub.dadas) && !(await tst()).estado['d' + i]) await p.fill('[data-k="tst:c' + i + '"]', mm.seg.sol[i]);
    ok(await resolvido(), 'as palavras certas resolvem');
    await foto('l46-cruzadas');
  });

  await passo('as palavras do mestre', async () => {
    await clicar('pz:minhas'); await w(300);
    await p.fill('[data-k="pz:palavras"]', 'Espada — Lâmina longa\nEscudo — Para o golpe\nElmo — Protege a cabeça\nAdaga — Lâmina curta\nMaça — Arma de pancada');
    await p.press('[data-k="pz:palavras"]', 'Tab'); await w(300);
    const pl = await ev(id => __escudo.A.handout(id).puzzle.palavras, puz);
    ok(pl && pl.length === 5 && pl[0].p === 'Espada' && pl[0].d === 'Lâmina longa', 'as palavras escritas pelo mestre, com as dicas — ' + j(pl && pl[0]));
    const mm = await m();
    ok(mm.seg.pals.every(x => ['Espada', 'Escudo', 'Elmo', 'Adaga', 'Maça'].includes(x)), 'a grade usa só as palavras dele');
    await clicar('pz:banco-pal'); await w(300);
  });

  await passo('caça-palavras', async () => {
    await tipo('caca', 'dificil');
    const mm = await m();
    for (const [a, b] of mm.seg.pos) { await clicar('tst:g' + a); await clicar('tst:g' + b); }
    ok(await resolvido(), 'achar as palavras (a primeira e a última letra de cada) resolve — ' + mm.pub.lista.length + ' palavras');
    await foto('l46-caca');
  });

  await passo('anagrama', async () => {
    await tipo('anagrama', 'medio');
    await p.fill('[data-k="tst:r0"]', 'zzzz'); await clicar('tst:ok0'); await w(200);
    ok(await erros() === 1, 'a palavra errada conta como erro');
    await clicar('tst:dica'); await w(200);
    ok(/Começa com/.test(await p.locator('.previa .pz-anagrama').innerText()), 'a dica: o começo de uma palavra');
    const mm = await m();
    for (let i = 0; i < mm.seg.ks.length; i++) { await p.fill('[data-k="tst:r' + i + '"]', mm.seg.pals[i].toLowerCase()); await clicar('tst:ok' + i); await w(100); }
    ok(await resolvido(), 'as palavras certas (com acento ou sem) resolvem');
  });

  await passo('labirinto', async () => {
    await tipo('labirinto', 'dificil');
    ok(await p.locator('.previa .lb-c.nevoa').count() > 20, 'no difícil, a névoa: só se vê por onde já passaram');
    await clicar('tst:dica'); await w(200);
    ok((await tst()).estado.t && (await tst()).estado.t.length > 0, 'a dica: os próximos passos');
    const jg = await tst();
    const cam = await ev(([pub, de]) => __escudo.E.mais.caminhoLab(pub, de, pub.fim), [jg.pub, jg.estado.p]);
    for (const c of cam.slice(1)) await clicar('tst:m' + c);
    ok(await resolvido(), 'andar casa a casa até a saída resolve (' + (cam.length - 1) + ' passos)');
    await foto('l46-labirinto');
  });

  await passo('espelhos de luz', async () => {
    await tipo('espelhos', 'medio');
    const mm = await m(), jg = await tst();
    // (a luz pode chegar ao cristal antes do último espelho: outro caminho também vale)
    for (let k = 0; k < mm.seg.sol.length; k++) { if ((await tst()).resolvido) break; if (jg.estado.o[k] !== mm.seg.sol[k]) await clicar('tst:e' + k); }
    ok(await resolvido(), 'girar os espelhos certos leva a luz ao cristal');
    await foto('l46-espelhos');
  });

  await passo('ligar os fios', async () => {
    await tipo('fios', 'medio');
    const mm = await m();
    for (const cam of mm.seg.caminhos) for (const c of cam) await clicar('tst:c' + c);
    ok(await resolvido(), 'ligar cada par, casa a casa, resolve');
    await foto('l46-fios');
  });

  await passo('sudoku de runas', async () => {
    await tipo('sudoku', 'medio');
    const mm = await m(), jg = await tst(), dadas = jg.pub.dadas.split(',').map(Number);
    const vazias = dadas.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
    // tudo preenchido, uma errada: "Conferir" conta um erro
    for (const i of vazias) { await clicar('tst:s' + i); await clicar('tst:r' + (i === vazias[0] ? (mm.seg.sol[i] % 6) + 1 : mm.seg.sol[i])); }
    await clicar('tst:conferir'); await w(200);
    ok(await erros() === 1, 'a grade cheia que não fecha: "Conferir" conta um erro');
    await clicar('tst:s' + vazias[0]); await clicar('tst:r' + mm.seg.sol[vazias[0]]);
    ok(await resolvido(), 'a runa certa resolve');
    await foto('l46-sudoku');
  });

  await passo('a pedra falsa', async () => {
    await tipo('falsa', 'dificil');
    const jg = await tst(), s = await ev(j0 => __escudo.E.mais.segredoFalsa(j0), jg);
    await clicar('tst:p0'); await clicar('tst:p1'); await clicar('tst:p1');
    await clicar('tst:pesar'); await w(150);
    ok(((await tst()).estado.pes || []).length === 1 && await p.locator('.previa .fa-hist li').count() === 1, 'uma pesagem (a pedra 1 contra a 2), no histórico');
    const errada = s.f === 0 ? 1 : 0;
    await clicar('tst:apontar'); await clicar('tst:p' + errada); await clicar('tst:pesada'); await w(200);
    ok(await erros() === 1 && !((await tst()).estado.pes || []).length, 'apontar a errada conta um erro, e as pesagens recomeçam');
    await clicar('tst:apontar'); await clicar('tst:p' + s.f); await clicar(s.d > 0 ? 'tst:pesada' : 'tst:leve');
    ok(await resolvido(), 'a falsa (e se é mais pesada ou mais leve) resolve');
    await foto('l46-falsa');
  });

  await passo('equilibrar os pratos', async () => {
    await tipo('equilibrar', 'medio');
    await clicar('tst:soltar'); await w(200);
    ok(await erros() === 1, 'soltar a balança sem equilibrar conta um erro');
    const mm = await m();
    for (const i of Object.keys(mm.seg.sol)) { await clicar('tst:w' + i); if (mm.seg.sol[i] === 'e') await clicar('tst:w' + i); }
    await clicar('tst:soltar');
    ok(await resolvido(), 'com os pesos certos, soltar resolve — ' + mm.pub.obj.join('+'));
    await foto('l46-equilibrar');
  });

  await passo('tabuleiro deslizante', async () => {
    await tipo('deslizante', 'facil');
    ok(await p.locator('[data-k="pz:modo:runas"][aria-pressed="true"]').count() === 1 && await p.locator('.previa .ds-ordem').count() === 1, 'com runas (e a ordem à vista)');
    const jg = await tst();
    for (const k of resolverDeslizante(jg.estado.p, jg.pub.n)) await clicar('tst:d' + k);
    ok(await resolvido(), 'deslizar até montar resolve');
    await foto('l46-deslizante');
  });

  await passo('pares', async () => {
    await tipo('pares', 'medio');
    const jg = await tst(), c = await ev(j0 => __escudo.E.mais.cartasPares(j0), jg);
    // ver duas diferentes (a primeira vez não conta); errar de novo com uma já vista conta
    const a = 0, b = c.findIndex((x, i) => x !== c[0]);
    await clicar('tst:c' + a); await clicar('tst:c' + b); await w(150);
    ok(await erros() === 0, 'a primeira vez que vira duas diferentes não conta');
    const d = c.findIndex((x, i) => i !== a && i !== b && x !== c[a] && x !== c[b]);
    await clicar('tst:c' + d); await clicar('tst:c' + b); await w(150);
    ok(await erros() === 1, 'errar com uma carta já vista conta um erro');
    const feitos = new Set();
    for (let i = 0; i < c.length; i++) { if (feitos.has(i)) continue; const k = c.findIndex((x, z) => z !== i && x === c[i]); feitos.add(i); feitos.add(k); await clicar('tst:c' + i); await clicar('tst:c' + k); }
    ok(await resolvido(), 'achar todos os pares resolve');
  });

  await passo('repetir a sequência', async () => {
    await tipo('sequencia', 'facil');
    const jg = await tst(), s = await ev(j0 => __escudo.E.mais.seqDe(j0), jg);
    await clicar('tst:r' + ((s[0] + 1) % jg.pub.k)); await w(150);
    ok(await erros() === 1, 'tocar a runa errada conta um erro');
    await clicar('tst:ver'); await w(300);
    ok(await p.locator('.previa .sq-r.aceso').count() === 1, '"Ver a sequência" acende as runas, uma de cada vez');
    for (let r = 1; r <= jg.pub.L; r++) for (let i = 0; i < r; i++) await clicar('tst:r' + s[i]);
    ok(await resolvido(), 'repetir até o fim resolve (' + jg.pub.L + ' rodadas)');
    await foto('l46-sequencia');
  });

  await passo('o cronômetro', async () => {
    await tipo('labirinto', 'facil');
    await p.selectOption('[data-k="pz:tempo"]', '5'); await w(300);
    ok((await ev(id => __escudo.A.handout(id).puzzle.tempo, puz)) === 5 && /^Falta [45]:\d\d$/.test(await p.locator('.previa [data-k="tst:tempo"]').innerText()), 'cinco minutos: a conta aparece no puzzle');
    await ev(id => { const t = __escudo.HO.testes[id]; t.jogo.estado.t0 = new Date(Date.now() - 6 * 60000).toISOString(); __escudo.pintar(); }, puz); await w(1300);
    ok(/O tempo acabou/.test(await p.locator('.previa [data-k="tst:tempo"]').innerText()) && await p.locator('.previa .pz.esgotado').count() === 1 && await p.locator('.previa [data-k^="tst:ir"]').count() === 0,
      'acabado o tempo, o puzzle trava');
    await foto('l46-cronometro');
    await p.selectOption('[data-k="pz:tempo"]', '0'); await w(300);
    ok(await p.locator('.previa [data-k="tst:tempo"]').count() === 0, '"Sem tempo" tira a conta');
  });

  const fora = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  ok(fora.length === 0, 'sem erros no console: ' + fora.slice(0, 3).join(' | '));
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
