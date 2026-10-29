// O Escudo do mestre, a página sozinha (fora de uma mesa: tudo neste navegador):
//   · o roteiro — a sessão nova, os passos (escrever, marcar, a nota, mover, tirar com Desfazer), ligar um passo a um
//     relógio (o botão do passo avança o relógio), abrir a sessão, fechar com os passos que sobraram indo para a próxima e
//     o resumo;
//   · os relógios — criar (nome, gomos, tipo, cor, consequência, à vista, por dia), clicar num gomo, − e +, encher (o aviso
//     com a consequência);
//   · os handouts — a carta com um trecho escondido (o botão "Esconder o trecho selecionado"; a prévia com a mancha;
//     revelar), a imagem (subir, arrastar para esconder uma área, revelar), o puzzle (os sete tipos, cada um resolvido no
//     teste da prévia, com a resposta à vista do mestre; o erro na charada; a chave da cifra virando handout; a charada
//     escrita pelo mestre; o que acontece ao acertar e ao errar); entregar só numa mesa.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
function resolverLuzes(l, n) {
  const N = n * n, M = [];
  for (let i = 0; i < N; i++) { const row = Array(N + 1).fill(0); for (let k = 0; k < N; k++) { const x = k % n, y = Math.floor(k / n), xi = i % n, yi = Math.floor(i / n); if (Math.abs(x - xi) + Math.abs(y - yi) <= 1) row[k] = 1; } row[N] = l[i] === '1' ? 0 : 1; M.push(row); }
  let r = 0; const piv = [];
  for (let c = 0; c < N && r < N; c++) { let p = r; while (p < N && !M[p][c]) p++; if (p === N) continue; [M[r], M[p]] = [M[p], M[r]]; for (let i = 0; i < N; i++) if (i !== r && M[i][c]) for (let k = c; k <= N; k++) M[i][k] ^= M[r][k]; piv.push(c); r++; }
  const x = Array(N).fill(0); piv.forEach((c, i) => { x[c] = M[i][N]; }); return x;
}

(async () => {
  const t = await start();
  const { page: p } = await t.device({ name: 'escudo', w: 1440, h: 900 });
  const w = ms => p.waitForTimeout(ms);
  const foto = async nome => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(t.base + 'escudo/?debug'); await w(700);
  ok(await ev(() => !!window.__escudo && __escudo.pronto && !__escudo.naMesa), '(o Escudo abre fora de uma mesa)');

  let sid = null, rid = null;
  await passo('o roteiro', async () => {
    await p.click('[data-k="aba:roteiro"]');
    ok(await p.locator('text=O roteiro').count() > 0, 'sem sessão: o convite para criar a primeira');
    await p.click('[data-k="sessao:nova"]'); await w(200);
    sid = await ev(() => __escudo.selS);
    ok(!!sid && await p.inputValue('[data-k="s:nome"]') === 'Sessão 1', 'a sessão nova: “Sessão 1”, já aberta no editor');
    for (const s of ['A caravana chega a Vashka', 'Emboscada na ponte', 'O jantar no castelo']) { await p.fill('[data-k="s:novo"]', s); await p.press('[data-k="s:novo"]', 'Enter'); await w(120); }
    const passos = await ev(id => __escudo.A.sessao(id).passos.map(x => x.txt), sid);
    ok(j(passos) === j(['A caravana chega a Vashka', 'Emboscada na ponte', 'O jantar no castelo']), 'três passos, escritos com Enter: ' + j(passos));
    const ids = await ev(id => __escudo.A.sessao(id).passos.map(x => x.id), sid);
    await p.click('[data-k="p:' + ids[2] + ':sobe"]'); await w(120);
    ok(j(await ev(id => __escudo.A.sessao(id).passos.map(x => x.txt), sid)) === j(['A caravana chega a Vashka', 'O jantar no castelo', 'Emboscada na ponte']), 'subir um passo');
    await p.click('[data-k="p:' + ids[1] + ':nota"]'); await w(100);
    await p.fill('[data-k="p:' + ids[1] + ':nota-txt"]', 'Os bandidos estão sob a ponte.'); await w(150);
    ok(await ev(([s, i]) => __escudo.A.sessao(s).passos.find(x => x.id === i).nota, [sid, ids[1]]) === 'Os bandidos estão sob a ponte.', 'a nota do passo (só o mestre vê)');
    await p.click('[data-k="p:' + ids[2] + ':tirar"]'); await w(150);
    ok(await ev(id => __escudo.A.sessao(id).passos.length, sid) === 2, 'tirar um passo');
    await p.click('[data-k="desfazer"]'); await w(150);
    ok(await ev(id => __escudo.A.sessao(id).passos.length, sid) === 3, 'o Desfazer devolve o passo');
    await p.fill('[data-k="p:' + ids[0] + ':txt"]', 'A caravana chega a Vashka ao entardecer'); await w(150);
    ok(await ev(([s, i]) => __escudo.A.sessao(s).passos.find(x => x.id === i).txt, [sid, ids[0]]) === 'A caravana chega a Vashka ao entardecer', 'escrever no passo');
  });

  await passo('os relógios', async () => {
    await p.click('[data-k="aba:relogios"]'); await w(150);
    await p.click('[data-k="relogio:novo"]'); await w(200);
    await p.fill('[data-k="re:nome"]', 'O culto desperta');
    await p.click('[data-k="re:g8"]'); await p.click('[data-k="re:croxo"]');
    await p.fill('[data-k="re:cons"]', 'O Devorador acorda e a cidade fecha os portões.');
    await p.click('[data-k="re:vista"]');
    await p.selectOption('[data-k="re:dia"]', '2');
    await p.click('[data-k="re:ok"]'); await w(200);
    rid = await ev(() => __escudo.A.relogios()[0].id);
    const r = await ev(id => __escudo.A.relogio(id), rid);
    ok(r.nome === 'O culto desperta' && r.gomos === 8 && r.cor === 'roxo' && r.vista && r.porDia === 2 && r.cheio === 0 && /Devorador/.test(r.consequencia), 'o relógio novo, como foi preenchido: ' + j(r));
    await p.locator('[data-k="r:' + rid + '"] svg [data-gomo="3"]').click(); await w(150);
    ok(await ev(id => __escudo.A.relogio(id).cheio, rid) === 4, 'clicar no 4º gomo enche até ali');
    await p.click('[data-k="r:' + rid + ':menos"]'); await w(120);
    ok(await ev(id => __escudo.A.relogio(id).cheio, rid) === 3, '− volta um gomo');
    await foto('escudo-relogios');
    await p.locator('[data-k="r:' + rid + '"] svg [data-gomo="7"]').click(); await w(200);
    ok(await ev(id => __escudo.A.relogio(id).cheio, rid) === 8 && await p.locator('.toast', { hasText: 'O culto desperta encheu! O Devorador acorda' }).count() === 1, 'cheio: o aviso diz a consequência (com Desfazer)');
    ok(await p.locator('[data-k="r:' + rid + '"].cheio .cons').count() === 1, 'o relógio cheio mostra a consequência');
    await p.click('[data-k="desfazer"]'); await w(150);
    ok(await ev(id => __escudo.A.relogio(id).cheio, rid) === 3, 'o Desfazer esvazia de novo');
    // (lote 32) apagar pela janela do relógio: a confirmação fica aberta até a resposta (antes, ela sumia sozinha)
    await p.click('[data-k="relogio:novo"]'); await w(200);
    await p.fill('[data-k="re:nome"]', 'A vela acaba'); await p.click('[data-k="re:ok"]'); await w(200);
    const vela = await ev(() => __escudo.A.relogios().find(x => x.r.nome === 'A vela acaba').id);
    await p.click('[data-k="r:' + vela + ':editar"]'); await w(200);
    await p.click('[data-k="re:apagar"]'); await w(300);
    ok(await p.locator('dialog[open] [data-k="dl:sim"]').count() === 1, '“Apagar” na janela do relógio pede a confirmação (e ela fica aberta)');
    await p.click('dialog[open] [data-k="dl:sim"]'); await w(250);
    ok(!(await ev(id => !!__escudo.A.relogio(id), vela)) && await ev(() => __escudo.A.relogios().length) === 1, 'confirmado: o relógio sai');
    await p.click('[data-k="desfazer"]'); await w(200);
    ok(await ev(id => !!__escudo.A.relogio(id), vela), 'o Desfazer devolve o relógio');
    await p.click('[data-k="r:' + vela + ':editar"]'); await w(200);
    await p.click('[data-k="re:apagar"]'); await w(300);
    await p.click('dialog[open] [data-k="dl:sim"]'); await w(250);
    ok(!(await ev(id => !!__escudo.A.relogio(id), vela)), '(e sai de novo, para seguir)');
  });

  await passo('ligar o passo ao relógio', async () => {
    await p.click('[data-k="aba:roteiro"]'); await w(150);
    const pid = await ev(id => __escudo.A.sessao(id).passos[2].id, sid);
    await p.click('[data-k="p:' + pid + ':ligar"]'); await w(200);
    await p.click('[data-k="lg:relogio"]'); await w(100);
    await p.click('[data-k="lg:op0"]'); await w(200);
    ok(j(await ev(([s, i]) => __escudo.A.sessao(s).passos.find(x => x.id === i).liga, [sid, pid])) === j({ k: 'relogio', id: rid, n: 1 }), 'o passo ligado ao relógio');
    ok(/O culto desperta/.test(await p.locator('[data-k="p:' + pid + ':liga"]').innerText()) && /\+1 gomo/.test(await p.locator('[data-k="p:' + pid + ':ir"]').innerText()), 'o chip com o nome e o botão “+1 gomo”');
    await p.click('[data-k="s:abrir"]'); await w(200);
    ok(await ev(id => __escudo.A.sessao(id).estado, sid) === 'aberta' && await p.locator('[data-k="s:fechar"]').count() === 1, 'abrir a sessão: em jogo');
    await p.click('[data-k="p:' + pid + ':ir"]'); await w(150);
    ok(await ev(id => __escudo.A.relogio(id).cheio, rid) === 4, 'o botão do passo avança o relógio');
    const ids = await ev(id => __escudo.A.sessao(id).passos.map(x => x.id), sid);
    await p.click('[data-k="p:' + ids[0] + ':feito"]'); await w(150);
    await foto('escudo-roteiro');
    await p.click('[data-k="s:fechar"]'); await w(200);
    ok(await p.locator('dialog[open] [data-k^="fc:"][type="checkbox"]').count() === 2, 'fechar: os dois passos que não aconteceram, marcados para a próxima');
    await p.locator('dialog[open] [data-k="fc:' + ids[1] + '"]').uncheck();
    await p.click('[data-k="fc:ok"]'); await w(250);
    const s = await ev(id => __escudo.A.sessao(id), sid), todas = await ev(() => __escudo.A.sessoes().map(x => ({ n: x.s.n, passos: x.s.passos.map(y => y.txt) })));
    ok(s.estado === 'fechada' && /\*\*Sessão 1\*\*/.test(s.resumo) && /O que aconteceu:\n- A caravana chega a Vashka ao entardecer/.test(s.resumo) && /Relógios:\n- O culto desperta: 3 → 4 de 8/.test(s.resumo) && /Ficou para depois:/.test(s.resumo),
      'fechada, com o resumo (o que aconteceu, o relógio que andou, o que ficou): ' + j(s.resumo));
    ok(todas.length === 2 && j(todas[1].passos) === j(['Emboscada na ponte']) && s.passos.length === 2, 'o passo marcado foi para a Sessão 2 (o desmarcado ficou): ' + j(todas));
    await foto('escudo-resumo');
    ok(await p.locator('[data-k="s:jornal"]').count() === 1, 'o resumo tem “Levar ao Jornal”');
    await p.click('[data-k="desfazer"]'); await w(200);
    ok(await ev(id => __escudo.A.sessao(id).estado, sid) === 'aberta' && await ev(() => __escudo.A.sessoes().length) === 1, 'o Desfazer reabre a sessão e tira a Sessão 2');
  });

  let carta = null, img = null;
  await passo('a carta', async () => {
    await p.click('[data-k="aba:handouts"]'); await w(150);
    await p.click('[data-k="h:novo:carta"]'); await w(200);
    carta = await ev(() => __escudo.HO.sel);
    await p.fill('[data-k="h:nome"]', 'A carta do barão');
    await p.fill('[data-k="h:texto"]', 'Caro amigo,\n\nA chave está no poço da praça. Venha à meia-noite.'); await w(200);
    await ev(() => { const ta = document.querySelector('[data-k="h:texto"]'); const a = ta.value.indexOf('no poço da praça'); ta.focus(); ta.setSelectionRange(a, a + 16); });
    await p.click('[data-k="h:esconder"]'); await w(200);
    const x = await ev(id => __escudo.A.handout(id), carta);
    ok(x.texto.includes('{{no poço da praça}}') && x.nome === 'A carta do barão', 'o trecho selecionado ficou entre {{ e }}');
    ok(await p.locator('.previa .mancha').count() === 1 && !(await p.locator('.previa').innerText()).includes('poço'), 'a prévia: o trecho é uma mancha (o texto não aparece)');
    await p.click('[data-k="h:papel:bilhete"]'); await w(100);
    ok(await p.locator('.previa .ho-bilhete').count() === 1, 'o papel muda a prévia (bilhete)');
    await foto('escudo-carta');
    await p.click('[data-k^="h:tr:"]'); await w(200);
    ok(await p.locator('.previa .mancha').count() === 0 && (await p.locator('.previa').innerText()).includes('no poço da praça'), 'revelar: o trecho aparece');
    ok(await p.locator('[data-k="h:entregar"]').isDisabled(), 'fora de uma mesa não há a quem entregar');
  });

  await passo('a imagem', async () => {
    await p.click('[data-k="h:novo:imagem"]'); await w(200);
    img = await ev(() => __escudo.HO.sel);
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-k="h:img"]')]);
    await fc.setFiles(path.join(__dirname, 'shot-casca-400.png'));
    let deu = false; for (let i = 0; i < 30 && !deu; i++) { await w(150); deu = await ev(id => !!__escudo.A.handout(id).img, img); }
    ok(deu && await ev(id => /^data:image\/jpeg/.test(__escudo.A.handout(id).img) && Math.abs(__escudo.A.handout(id).imgAr - 0.5) < 0.01, img), 'a imagem fica neste navegador (com a proporção)');
    for (let i = 0; i < 30 && !(await ev(() => { const i = document.querySelector('[data-k="h:img-ed"] img'); return !!i && i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().height > 100; })); i++) await w(100);
    const bb = await p.locator('[data-k="h:img-ed"]').boundingBox();
    await p.mouse.move(bb.x + bb.width * 0.2, bb.y + bb.height * 0.2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.7, bb.y + bb.height * 0.45, { steps: 6 }); await p.mouse.up(); await w(200);
    const a = await ev(id => __escudo.A.handout(id).areas, img);
    ok(a.length === 1 && Math.abs(a[0].x - 0.2) < 0.03 && Math.abs(a[0].w - 0.5) < 0.04 && !a[0].rev, 'arrastar sobre a imagem esconde uma área: ' + j(a));
    ok(await p.locator('.previa .img-ed .area').count() === 1, 'a prévia cobre a área');
    await foto('escudo-imagem');
    await p.click('[data-k="h:area:' + a[0].id + ':rev"]'); await w(200);
    ok(await ev(id => __escudo.A.handout(id).areas[0].rev, img) && await p.locator('.previa .img-ed .area').count() === 0, 'revelar a área');
  });

  // o puzzle: cada tipo, resolvido no teste da prévia
  const tst = () => ev(id => { const t = __escudo.HO.testes[id]; return t ? JSON.parse(JSON.stringify(t.jogo)) : null; }, puz);
  let puz = null;
  const resolvido = async () => { for (let i = 0; i < 20; i++) { if (await p.locator('.previa .pz.resolvido').count()) return true; await w(100); } return false; };
  await passo('o puzzle', async () => {
    await p.click('[data-k="h:novo:puzzle"]'); await w(200);
    puz = await ev(() => __escudo.HO.sel);
    ok(await ev(id => __escudo.A.handout(id).puzzle.tipo === 'charada', puz) && await p.locator('.previa .pz-charada').count() === 1, 'o puzzle novo: uma charada fácil, com o teste na prévia');
    ok((await p.locator('.previa [data-k="tst:resposta"]').innerText()).startsWith('Resposta (só você vê):'), 'a resposta, só para o mestre');
    // a charada: errar e acertar
    await p.fill('[data-k="tst:resp"]', 'batata'); await p.click('[data-k="tst:responder"]'); await w(200);
    ok((await tst()).erros === 1 && await p.locator('.toast', { hasText: 'Errou (no teste)' }).count() > 0, 'a charada: errar conta (no teste)');
    const resp = await ev(id => { const h = __escudo.A.handout(id); return __escudo.E.CHARADAS[h.puzzle.idx].r[0]; }, puz);
    await p.fill('[data-k="tst:resp"]', resp.toUpperCase() + '!'); await p.click('[data-k="tst:responder"]');
    ok(await resolvido(), 'a charada: a resposta certa (de qualquer jeito escrita) resolve');
    // a charada escrita pelo mestre
    await p.click('[data-k="pz:propria"]'); await w(200);
    await p.fill('[data-k="pz:cp"]', 'O que tem dentes e guarda a porta?'); await p.press('[data-k="pz:cp"]', 'Tab');
    await p.fill('[data-k="pz:cr"]', 'a fechadura, tranca'); await p.press('[data-k="pz:cr"]', 'Tab'); await w(200);
    const pr = await ev(id => __escudo.A.handout(id).puzzle.propria, puz);
    ok(pr && pr.p === 'O que tem dentes e guarda a porta?' && j(pr.r) === j(['a fechadura', 'tranca']), 'a charada escrita pelo mestre: ' + j(pr));
    await p.fill('[data-k="tst:resp"]', 'Fechadura'); await p.click('[data-k="tst:responder"]');
    ok(await resolvido(), '…e o teste aceita a resposta dele');
    // a cifra (runas): preencher a chave
    await p.click('[data-k="pz:t:cifra"]'); await w(300);
    const cf = await ev(id => { const h = __escudo.A.handout(id); const m = __escudo.E.montarPuzzle(h.puzzle); return { letras: m.letras, dadas: m.pub.dadas, msg: h.puzzle.msg, metodo: m.pub.metodo }; }, puz);
    ok(cf.metodo === 'runas' && !!cf.msg && await p.locator('.previa .cf-s.runa').count() > 3, 'a cifra: de runas, com uma mensagem sorteada');
    for (const i of Object.keys(cf.letras)) if (!(i in cf.dadas)) { await p.fill('[data-k="tst:c' + i + '"]', cf.letras[i]); }
    ok(await resolvido(), 'a cifra: com a chave certa, a mensagem aparece e resolve');
    await foto('escudo-cifra');
    await p.click('[data-k="pz:chave"]'); await w(200);
    ok(await ev(() => __escudo.A.handouts().some(x => /^A chave de/.test(x.h.nome) && x.h.tipo === 'carta' && / = [A-Z]/.test(x.h.texto)), null), '“Criar a chave como handout”: uma carta com a chave');
    await ev(id => { __escudo.HO.selecionar(id); __escudo.pintar(); }, puz); await w(200);
    // as runas que acendem
    await p.click('[data-k="pz:t:luzes"]'); await w(300);
    let jg = await tst();
    for (const [i, v] of resolverLuzes(jg.estado.l, jg.pub.n).entries()) if (v) { await p.click('[data-k="tst:l' + i + '"]'); await w(40); }
    ok(await resolvido(), 'as runas: acender todas resolve');
    // as alavancas
    await p.click('[data-k="pz:t:alavancas"]'); await w(300);
    jg = await tst();
    const sol = await ev(pub => { for (let b = 0; b < (1 << pub.n); b++) { const est = {}; for (let i = 0; i < pub.n; i++) est['a' + i] = (b >> i) & 1 ? '1' : '0'; if (__escudo.E.gradesDe(pub, est) === '1'.repeat(pub.m)) return est; } return null; }, jg.pub);
    for (let i = 0; i < jg.pub.n; i++) if (sol['a' + i] === '1') { await p.click('[data-k="tst:a' + i + '"]'); await w(40); }
    ok(await resolvido(), 'as alavancas: todas as grades abertas resolve');
    // o cadeado: tentar errado, depois girar até a resposta
    await p.click('[data-k="pz:t:cadeado"]'); await w(300);
    const comb = await ev(id => __escudo.E.montarPuzzle(__escudo.A.handout(id).puzzle).resposta.split(',').map(Number), puz);
    if (comb.some(x => x !== 0)) { await p.click('[data-k="tst:abrir"]'); await w(150); ok((await tst()).erros === 1, 'o cadeado: tentar a combinação errada conta um erro'); }
    for (let i = 0; i < comb.length; i++) for (let k = 0; k < comb[i]; k++) { await p.click('[data-k="tst:d' + i + '-"]'); await w(25); }
    await p.click('[data-k="tst:abrir"]');
    ok(await resolvido(), 'o cadeado: a combinação certa abre');
    await foto('escudo-cadeado');
    // as placas
    await p.click('[data-k="pz:t:placas"]'); await w(300);
    const ordem = await ev(id => __escudo.E.montarPuzzle(__escudo.A.handout(id).puzzle).resposta.split(',').map(Number), puz);
    for (const i of ordem) { await p.click('[data-k="tst:p' + i + '"]'); await w(40); }
    ok(await resolvido(), 'as placas: a ordem certa resolve');
    // o quebra-cabeça (precisa de imagem)
    await p.click('[data-k="pz:t:imagem"]'); await w(300);
    ok(await p.locator('.previa').innerText().then(x => /Escolha a imagem/.test(x)), 'o quebra-cabeça sem imagem pede a imagem');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-k="h:img"]')]);
    await fc.setFiles(path.join(__dirname, 'shot-casca-400.png'));
    for (let i = 0; i < 30 && !(await ev(id => !!__escudo.A.handout(id).img, puz)); i++) await w(150);
    await w(300);
    for (let n = 0; n < 40; n++) {
      jg = await tst();
      const pos = jg.estado.p, i = pos.findIndex((x, k) => x !== k);
      if (i < 0) break;
      const k = pos.indexOf(i);
      await p.click('[data-k="tst:q' + i + '"]'); await p.click('[data-k="tst:q' + k + '"]'); await w(40);
    }
    ok(await resolvido(), 'o quebra-cabeça: trocando as peças até o lugar certo, resolve');
    // dificuldade e sortear outro
    await p.click('[data-k="pz:d:dificil"]'); await w(300);
    ok(await ev(id => __escudo.A.handout(id).puzzle.dif === 'dificil', puz) && (await tst()).pub.n === 5, 'difícil: 5×5 peças');
    const s0 = await ev(id => __escudo.A.handout(id).puzzle.seed, puz);
    await p.click('[data-k="pz:sortear"]'); await w(200);
    ok(await ev(([id, s]) => __escudo.A.handout(id).puzzle.seed !== s, [puz, s0]), '“Sortear outro”: outra semente');
  });

  await passo('o que acontece ao acertar e ao errar', async () => {
    await p.click('[data-k="pz:t:placas"]'); await w(300);
    await p.click('[data-k="lg:entregar"]'); await w(200);
    await p.locator('dialog[open] .opcoes button', { hasText: 'A carta do barão' }).click(); await w(200);
    ok(j(await ev(id => __escudo.A.handout(id).liga.acerto, puz)) === j([{ k: 'entregar', h: carta }]), 'ao acertar: entregar a carta');
    await p.selectOption('[data-k="lg:erro"]', rid); await w(200);
    ok(j(await ev(id => __escudo.A.handout(id).liga.erro, puz)) === j({ relogio: rid, gomos: 1 }), 'ao errar: o relógio anda 1 gomo');
    await foto('escudo-puzzle-ligacoes');
  });

  ok(await ev(() => __escudo.pilha().length) > 20, 'cada mudança foi um passo do Desfazer');
  const erros = t.errs;
  if (erros.length) console.log('CONSOLE:\n' + erros.slice(0, 12).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close(); end();
})();
