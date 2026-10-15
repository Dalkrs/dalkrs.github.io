// Bateria do lote 6 (parte 3b, as Cenas), no navegador, sem o site:
//   · Shift+F: a rolagem geral (quem rola, o atributo, a fixa de cada linha, "Rolar tudo", quem tirou mais);
//   · as pastas da lista de cenas (a janela "Organizar em pastas", o menu, abrir e fechar, guardar neste navegador);
//   · o gerador de vilarejo (a janela, a prévia, "Gerar outro", a cena que sai, e as regras do plano em muitos sorteios);
//   · na janelinha E, o item complementar ("com Espada…", ou "sem efeito").
// (O pedido da rolagem geral aos jogadores, numa mesa de verdade, está no src/tests/cenas-lote6.rede.test.js.)
const path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;                         // (as fotos só saem com FOTOS=pasta)

(async () => {
  const t = await open({});
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const tecla = async k => { await page.keyboard.press(k); await w(220); };
  const longe = async () => { const b = await page.locator('#cv').boundingBox(); await page.mouse.move(b.x + 8, b.y + b.height - 8); await w(100); };
  const foto = async nome => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const j = JSON.stringify;

  // ================= Shift+F: a rolagem geral =================
  const ids = await ev(() => {
    const u = __tc, sc = u.newScene('Rolagem geral'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
    u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }];
    const c = sc.cell, o = {};
    u.Store.tx('prep', () => {
      for (const [nm, x, extra] of [['Ana', 2, { owner: 'p1' }], ['Ogro', 6, {}], ['Lobo', 10, {}], ['Espião', 14, { hidden: true }]]) { const k = u.newToken(sc, x * c, 3 * c, Object.assign({ name: nm }, extra)); u.Store.add('tokens', k); o[nm] = k.id; }
      const barril = u.Props.novo(sc, 'barril', 4 * c, 7 * c, 1, false); u.Store.add('tokens', barril); o.barril = barril.id;
    });
    u.Render.fit(); u.setSel([]); u.UI.openTab('sel');
    return o;
  });
  await w(300); await longe();
  ok(await page.locator('#sel-geral').count() === 1, 'com nada selecionado, o painel oferece "Rolagem geral…"');
  const cenaAntes = await ev(() => JSON.stringify(__tc.Store.scene().tokens)), passosAntes = await ev(() => __tc.Store.canUndo());
  await tecla('Shift+F');
  ok(await page.locator('.modal-t').innerText().catch(() => '') === 'Rolagem geral', 'Shift+F abre a janela da rolagem geral');
  const opcoes = await page.locator('#ger-quem option').allInnerTexts();
  ok(j(opcoes) === j(['Os personagens dos jogadores (0)', 'Todos os tokens da cena (4)']) && await page.locator('#ger-quem').inputValue() === 'todos', 'sem seleção: escolhe quem rola — os personagens dos jogadores ou todos os tokens (o objeto de cenário fica de fora): ' + j(opcoes));
  ok(await page.locator('#ger-lista li').count() === 4 && /Espião \(oculto\)/.test(await page.locator('#ger-lista').innerText()), 'a lista: os quatro tokens, o oculto marcado');
  ok(await page.locator('#ger-atr .chip').count() === 12 && await page.locator('#ger-atr .chip.on').innerText() === 'PER', 'os doze atributos para escolher; começa em Percepção');
  ok(await page.locator('#ger-pedir').count() === 0 && (await page.locator('#ger-tudo').innerText()) === 'Rolar tudo', 'fora de uma mesa não há pedido aos jogadores: o botão é "Rolar tudo"');
  await page.locator('#ger-a-FOR').click(); await w();
  ok(await page.locator('#ger-atr .chip.on').innerText() === 'FOR' && await ev(() => __tc.App.opt.gerAtr) === 'FOR', 'escolher Força (e a janela lembra da escolha)');
  // a fixa de cada linha e o valor (os tokens sem ficha pedem um valor)
  await page.locator('#ger-val-0').fill('30'); await page.locator('#ger-val-0').press('Tab'); await w();
  await page.locator('#ger-fx-0').fill('20'); await page.locator('#ger-fx-0').press('Tab'); await w();
  await page.locator('#ger-on-3').uncheck({ force: true }); await w();
  ok((await page.locator('#ger-conta').innerText()) === '3 de 4 marcados' && (await page.locator('#ger-como-3').count()) === 0, 'desmarcar o Espião: ele fica de fora');
  await foto('01-rolagem-geral');
  await page.locator('#ger-rolar-1').click(); await w(200);
  ok(/^rolou \d+ \(\d+ no d40\)$/.test(await page.locator('#ger-como-1').innerText()) && (await page.locator('#ger-tudo').innerText()) === 'Rolar por quem falta', 'rolar uma linha só (o Ogro, valor 40, sem fixa); o botão passa a "Rolar por quem falta": ' + await page.locator('#ger-como-1').innerText());
  await page.locator('#ger-tudo').click(); await w(250);
  const comos = await page.locator('#ger-lista .atq-como').allInnerTexts();
  const ana = await page.locator('#ger-como-0').innerText(), m = /^rolou (\d+) \((\d+) no d10 \+ 20\)$/.exec(ana);
  ok(!!m && +m[1] >= 21 && +m[1] <= 30 && +m[1] === +m[2] + 20, 'a Ana rola o valor 30 fixando 20: 1d10 + 20 — ' + ana);
  ok(comos.filter(x => x.startsWith('rolou')).length === 3 && await page.locator('#ger-tudo').count() === 0, 'rolar por quem falta: os três marcados rolaram, e o botão some');
  const tots = await page.locator('#ger-lista .area-res.ger-tot').allInnerTexts();
  const resumo = await page.locator('#ger-resumo').innerText(), esperado = 'Do maior para o menor: ' + [['Ana', +tots[0]], ['Ogro', +tots[1]], ['Lobo', +tots[2]]].sort((p, q) => q[1] - p[1]).map(x => x[0] + ' ' + x[1]).join(' · ');
  ok(resumo === esperado, 'a janela diz quem tirou mais, do maior para o menor: ' + resumo);
  await page.locator('#ger-de-novo-1').click(); await w();
  ok((await page.locator('#ger-como-1').innerText()) === 'falta rolar' && /\(faltam 1\)/.test(await page.locator('#ger-resumo').innerText()), '"Descartar" faz a linha esperar de novo (e o resumo diz que falta uma)');
  ok(await ev(() => JSON.stringify(__tc.Store.scene().tokens)) === cenaAntes && await ev(() => __tc.Store.canUndo()) === passosAntes && await page.locator('#undoBtn').isDisabled() === !passosAntes, 'nada muda na cena (nem entra no desfazer)');
  await page.locator('.modal .btn.primary', { hasText: 'Fechar' }).click(); await w();
  ok(await page.locator('.modal').count() === 0, '"Fechar" fecha a janela');
  // com tokens selecionados: os selecionados
  await ev(i => __tc.setSel([i.Ogro, i.Lobo].map(id => ({ c: 'tokens', id }))), ids); await w(200);
  ok(await page.locator('#mt-geral').count() === 1, 'com vários selecionados, o painel também tem "Rolagem geral…"');
  await page.locator('#mt-geral').click(); await w(250);
  ok(await page.locator('#ger-quem').inputValue() === 'sel' && await page.locator('#ger-lista li').count() === 2 && (await page.locator('#ger-quem option').first().innerText()) === 'Os selecionados (2)', 'com seleção: "Os selecionados (2)", já escolhidos');
  await page.locator('#ger-quem').selectOption('todos'); await w();
  ok(await page.locator('#ger-lista li').count() === 4, 'trocar para "Todos os tokens da cena" refaz a lista');
  await page.keyboard.press('Escape'); await w();
  ok(await page.locator('.modal').count() === 0, 'Esc fecha');
  // o jogador não abre
  await ev(() => { __tc.UI.setViewer('p1'); }); await w(250); await clearToasts();
  await tecla('Shift+F');
  ok(await page.locator('.modal').count() === 0 && /A rolagem geral é do mestre/.test(await toasts()), 'o jogador aperta Shift+F: a mesa explica que a rolagem geral é do mestre');
  await ev(() => { __tc.UI.setViewer('gm'); }); await w(250);
  await page.locator('#moreBtn').click(); await w(200);
  await page.locator('.menu-i', { hasText: 'Atalhos de teclado' }).click(); await w(250);
  ok(/Shift\+F\s+Rolagem geral/.test(await page.locator('.modal dl.keys').innerText()), 'a janela de atalhos tem o Shift+F');
  await page.keyboard.press('Escape'); await w();

  // ================= as pastas da lista de cenas =================
  const cenas = await ev(() => {
    const u = __tc, o = {};
    for (const nm of ['Taverna', 'Floresta', 'Castelo', 'Ponte']) { const sc = u.newScene(nm); u.Store.addScene(sc); u.Persist.scene(sc.id); o[nm] = sc.id; }
    u.Persist.meta();
    return o;
  });
  const menu = async () => { await page.locator('#sceneBtn').click(); await w(200); const s = (await page.locator('.menu').innerText()).replace(/\n/g, ' | '); await page.keyboard.press('Escape'); await w(80); return s; };
  ok(/^CENAS \| .*Taverna \| Floresta \| Castelo \| Ponte/.test(await menu()) && /Organizar em pastas…/.test(await menu()), 'sem pastas, a lista é como sempre; o menu tem "Organizar em pastas…"');
  await page.locator('#sceneBtn').click(); await w(200);
  await page.locator('.menu-i', { hasText: 'Organizar em pastas' }).click(); await w(250);
  ok(await page.locator('.modal-t').innerText() === 'Organizar em pastas' && await page.locator('.org-p').count() === 1 && /Sem pasta/.test(await page.locator('.org-p').first().innerText()), 'a janela começa só com "Sem pasta"');
  await page.locator('#org-nova').click(); await w(200);
  await page.locator('#dlg-in').fill('  Lugares   do mundo  '); await page.locator('.modal .btn.primary').click(); await w(300);
  const pa1 = await ev(() => __tc.Store.S.pastas.lista[0] && __tc.Store.S.pastas.lista[0].id);
  ok(!!pa1 && await ev(() => __tc.Store.S.pastas.lista[0].nome) === 'Lugares do mundo' && await page.locator('#org-p-' + pa1).count() === 1 && /Pasta "Lugares do mundo" criada/.test(await toasts()), 'Nova pasta: pergunta o nome e volta à janela, com a pasta nova (o nome arrumado)');
  await page.locator('#org-c-' + cenas.Floresta).dragTo(page.locator('#org-p-' + pa1)); await w(300);
  ok(await ev(([id, pa]) => __tc.Store.S.pastas.de[id] === pa, [cenas.Floresta, pa1]) && /"Floresta" foi para a pasta Lugares do mundo/.test(await toasts()), 'arrastar a Floresta para a pasta põe a cena nela');
  await page.locator('#org-s-' + cenas.Castelo).selectOption(pa1); await w(300);
  ok(await ev(([id, pa]) => __tc.Store.S.pastas.de[id] === pa, [cenas.Castelo, pa1]) && await page.locator('#org-p-' + pa1 + ' .org-c').count() === 2, 'ou escolher a pasta na lista ao lado da cena (o Castelo)');
  await foto('02-organizar-em-pastas');
  await page.locator('.modal .btn.primary', { hasText: 'Pronto' }).click(); await w(200);
  let lista = await menu();
  ok(/CENAS \| .*Taverna \| Ponte \| Lugares do mundo \| 2 \| Floresta \| Castelo/.test(lista), 'no menu: as cenas soltas, depois a pasta (com quantas tem) e as cenas dela: ' + lista);
  await page.locator('#sceneBtn').click(); await w(200);
  await page.locator('#mp-' + pa1).click(); await w(200);
  lista = (await page.locator('.menu').innerText()).replace(/\n/g, ' | ');
  ok(await page.locator('.menu').count() === 1 && !/Floresta/.test(lista) && (await page.locator('#mp-' + pa1).getAttribute('aria-expanded')) === 'false', 'um clique na pasta fecha (o menu continua aberto): ' + lista);
  await page.keyboard.press('Escape'); await w(80);
  ok(!/Floresta/.test(await menu()) && (await ev(() => localStorage.getItem('tinycats:cenas:pastas-fechadas') || '')).includes(pa1), 'fechada, fica fechada (lembrado neste aparelho)');
  await page.locator('#sceneBtn').click(); await w(200); await page.locator('#mp-' + pa1).click(); await w(150); await page.keyboard.press('Escape'); await w(80);
  // a cena ligada a um marcador do Mapa-múndi ganha o ícone do mundo
  await ev(id => { __tc.Nuvem.noMundo = () => ({ [id]: ['Urgm', 'Porto'] }); }, cenas.Floresta);
  await page.locator('#sceneBtn').click(); await w(200);
  ok(await page.locator('.menu-i', { hasText: 'Floresta' }).locator('.menu-m').count() === 1 && (await page.locator('.menu-i', { hasText: 'Floresta' }).locator('.menu-m').getAttribute('title')) === 'No Mapa-múndi: Urgm, Porto' && await page.locator('.menu-i', { hasText: 'Taverna' }).locator('.menu-m').count() === 0, 'a cena que um marcador do Mapa-múndi abre ganha o ícone do mundo (a dica diz quais)');
  await foto('03-menu-com-pastas');
  await page.keyboard.press('Escape'); await w(80);
  // renomear e apagar a pasta (com Desfazer)
  await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Organizar em pastas' }).click(); await w(250);
  await page.locator('#org-ren-' + pa1).click(); await w(200);
  await page.locator('#dlg-in').fill('Mundo'); await page.locator('.modal .btn.primary').click(); await w(300);
  ok(await ev(() => __tc.Store.S.pastas.lista[0].nome) === 'Mundo' && await page.locator('.modal-t').innerText() === 'Organizar em pastas', 'renomear a pasta (e a janela volta)');
  await clearToasts();
  await page.locator('#org-del-' + pa1).click(); await w(300);
  ok(await ev(() => __tc.Store.S.pastas.lista.length) === 0 && await ev(() => Object.keys(__tc.Store.S.pastas.de).length) === 0 && /Pasta "Mundo" apagada; as 2 cenas dela voltaram para "Sem pasta"/.test(await toasts()), 'apagar a pasta: as cenas voltam para "Sem pasta" (as cenas não são apagadas)');
  ok(await ev(id => !!__tc.Store.S.scenes[id], cenas.Floresta), '(a Floresta continua lá)');
  await page.locator('.toast-a', { hasText: 'Desfazer' }).last().click(); await w(300);
  ok(await ev(([id, pa]) => __tc.Store.S.pastas.lista.length === 1 && __tc.Store.S.pastas.de[id] === pa, [cenas.Floresta, pa1]) && await page.locator('#org-p-' + pa1 + ' .org-c').count() === 2, 'Desfazer devolve a pasta com as duas cenas');
  await page.locator('.modal .btn.primary', { hasText: 'Pronto' }).click(); await w(150);
  // duplicar fica na mesma pasta; apagar tira da pasta
  await ev(id => __tc.UI.switchScene(id), cenas.Castelo); await w(200);
  await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Duplicar esta cena' }).click(); await w(300);
  const copia = await ev(() => __tc.Store.S.current);
  ok(await ev(([id, pa]) => __tc.Store.S.pastas.de[id] === pa && __tc.Store.S.scenes[id].name === 'Castelo (cópia)', [copia, pa1]), 'a cópia de uma cena fica na mesma pasta');
  await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Apagar esta cena' }).click(); await w(200);
  await page.locator('.modal .btn.danger, .modal .btn.primary').last().click(); await w(300);
  ok(await ev(id => !__tc.Store.S.scenes[id] && !(id in __tc.Store.S.pastas.de), copia), 'apagar a cena tira ela da pasta');
  // guardado neste navegador: as pastas continuam depois de recarregar
  await ev(() => __tc.Persist.flush()); await w(600);
  await page.reload({ waitUntil: 'load' }); await w(1200);
  ok(await ev(([id, pa]) => __tc.Store.S.pastas.lista.length === 1 && __tc.Store.S.pastas.lista[0].nome === 'Mundo' && __tc.Store.S.pastas.de[id] === pa, [cenas.Floresta, pa1]), 'recarregando a página, as pastas continuam (guardadas neste navegador, com as cenas)');

  // ================= o gerador de vilarejo =================
  await page.locator('#sceneBtn').click(); await w(200);
  await page.locator('.menu-i', { hasText: 'Gerar um vilarejo' }).click(); await w(500);
  ok(await page.locator('.modal-t').innerText() === 'Gerar um vilarejo' && await page.locator('#vila-prev').count() === 1, 'a janela do vilarejo abre, com a prévia');
  const nome0 = await page.locator('#vila-nome').inputValue(), res0 = await page.locator('#vila-resumo').innerText();
  ok(/^Aldeia de /.test(nome0) && /^5 casas · \d+ móveis · 28 × 20 quadrados · rio com ponte\.$/.test(res0) && await page.locator('#vila-casas-n').innerText() === '5', 'começa numa aldeia de 5 casas, com rio: ' + nome0 + ' · ' + res0);
  const desenhou = () => ev(() => {
    const c = document.getElementById('vila-prev'), k = document.createElement('canvas'); k.width = c.width; k.height = c.height;
    const g = k.getContext('2d', { willReadFrequently: true }); g.drawImage(c, 0, 0);
    const d = g.getImageData(0, 0, k.width, k.height).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return c.width + 'x' + c.height + ':' + s;
  });
  const prev0 = await desenhou();
  await page.locator('#vila-outro').click(); await w(300);
  ok(await desenhou() !== prev0, '"Gerar outro" sorteia outro vilarejo (a prévia muda)');
  await page.locator('#vila-nome').fill('Vila do Teste'); await w(50);
  await page.locator('#vila-tam button', { hasText: 'Vila' }).click(); await w(300);
  ok(await page.locator('#vila-casas-n').innerText() === '10' && /40 × 28 quadrados/.test(await page.locator('#vila-resumo').innerText()) && await page.locator('#vila-nome').inputValue() === 'Vila do Teste', 'a vila: 10 casas, 40 × 28 quadrados; o nome que você escreveu fica');
  await page.locator('#vila-casas-plus').click(); await w(250);
  await page.locator('#vila-muro').check({ force: true }); await w(250);
  await page.locator('#vila-ter button', { hasText: 'Neve' }).click(); await w(250);
  const res1 = await page.locator('#vila-resumo').innerText(), nc = +(/^(\d+) casas?/.exec(res1) || [])[1];
  ok(await page.locator('#vila-casas-n').innerText() === '11' && nc >= 1 && nc <= 11 && (nc === 11 || res1.includes(`(couberam ${nc} das 11)`)) && /paliçada com [34] portões/.test(res1), 'mais uma casa (11), com paliçada, na neve; se não couberem todas, o resumo diz: ' + res1);
  await foto('04-gerar-vilarejo');
  const antes = await ev(() => __tc.Store.S.order.length);
  await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await w(2500);
  const vila = await ev(() => {
    const sc = __tc.Store.scene();
    return { nome: sc.name, cols: sc.cols, rows: sc.rows, fog: sc.fog.dynamic, bg: !!sc.bg.asset, paredes: sc.walls.filter(x => x.k === 'wall').length, portas: sc.walls.filter(x => x.k === 'door' && !x.open).length, portoes: sc.walls.filter(x => x.k === 'door' && x.open).length,
      textos: sc.shapes.filter(s => s.k === 'text').map(s => s.txt), moveis: sc.tokens.filter(k => k.prop).length, poco: sc.tokens.filter(k => k.prop === 'poco').length, lamp: sc.tokens.filter(k => k.prop === 'lampiao').length, n: __tc.Store.S.order.length };
  });
  ok(vila.n === antes + 1 && vila.nome === 'Vila do Teste' && vila.cols === 40 && vila.rows === 28 && vila.fog === true && vila.bg, 'sai uma cena nova, com o nome escolhido, do tamanho da vila, com o fundo pintado e as paredes barrando a visão: ' + j(vila).slice(0, 200));
  ok(vila.portas === vila.textos.length && vila.textos.length === nc && vila.textos.every(x => /^(Casa|Taverna|Capela|Templo|Santuário|Ferraria|Armazém) /.test(x)) && vila.paredes >= vila.textos.length * 4, 'cada casa: as paredes, uma porta (fechada) e o nome em cima — ' + vila.textos.length + ' casas, ' + vila.paredes + ' paredes');
  ok((vila.portoes === 3 || vila.portoes === 4) && vila.poco === 1 && vila.lamp === 4 && vila.moveis > vila.textos.length, 'a paliçada com os portões abertos, o poço e os quatro lampiões da praça, e os móveis: ' + j({ portoes: vila.portoes, moveis: vila.moveis }));
  ok(/"Vila do Teste" criada: \d+ casas, com paredes, portas, móveis e nomes\. Tudo é editável\./.test(await toasts()), 'o aviso diz o que saiu');
  await foto('05-vilarejo-na-cena');
  // as regras do plano, em muitos sorteios
  const regras = await ev(() => {
    const V = __tc.Vila, erros = [], vistos = { casas: 0, moveis: 0 };
    const distSeg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0; return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
    const dist = (pts, x, y) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, distSeg(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return d; };
    for (let s = 1; s <= 60; s++) {
      const o = { tamanho: s % 2 ? 'aldeia' : 'vila', terreno: ['campo', 'floresta', 'areia', 'neve'][s % 4], rio: s % 3 !== 0, muralha: s % 5 < 2, casas: 99, seed: s * 7919 };
      const p = V.gerar(o), T = V.TAMANHOS[p.tamanho];
      if (JSON.stringify(p) !== JSON.stringify(V.gerar(o))) erros.push(s + ': o mesmo sorteio deu outro vilarejo');
      if (p.casas.length > T.casas[1] || p.casas.length < 1) erros.push(s + ': casas ' + p.casas.length);
      const reg = p.muro ? [3, 3, p.W - 3, p.H - 3] : [1, 1, p.W - 1, p.H - 1];
      p.casas.forEach((k, i) => {
        vistos.casas++;
        if (k.x < reg[0] || k.y < reg[1] || k.x + k.w > reg[2] || k.y + k.h > reg[3]) erros.push(s + ': casa fora da área ' + JSON.stringify(k).slice(0, 80));
        for (const k2 of p.casas.slice(i + 1)) if (k.x < k2.x + k2.w + 1 && k2.x < k.x + k.w + 1 && k.y < k2.y + k2.h + 1 && k2.y < k.y + k.h + 1) erros.push(s + ': duas casas grudadas');
        for (let jj = k.y; jj < k.y + k.h; jj++) for (let ii = k.x; ii < k.x + k.w; ii++) {
          const cx = ii + 0.5, cy = jj + 0.5;
          if (p.ruas.some(r => dist(r.pts, cx, cy) <= r.hw + 0.25) || Math.hypot(cx - p.praca.x, cy - p.praca.y) <= p.praca.r + 0.3) erros.push(s + ': casa em cima da rua');
          if (p.rio && dist(p.rio.pts, cx, cy) <= p.rio.hw + 0.6) erros.push(s + ': casa dentro do rio');
        }
        const pt = k.porta, ladoOk = { n: pt.y1 === k.y && pt.y2 === k.y, s: pt.y1 === k.y + k.h && pt.y2 === k.y + k.h, o: pt.x1 === k.x && pt.x2 === k.x, l: pt.x1 === k.x + k.w && pt.x2 === k.x + k.w }[pt.lado];
        const larg = Math.abs(pt.x2 - pt.x1) + Math.abs(pt.y2 - pt.y1), dentroDoLado = pt.lado === 'n' || pt.lado === 's' ? pt.x1 > k.x && pt.x2 < k.x + k.w : pt.y1 > k.y && pt.y2 < k.y + k.h;
        if (!ladoOk || larg !== 1 || !dentroDoLado) erros.push(s + ': porta torta ' + JSON.stringify(pt));
        const ocup = new Set();
        for (const mv of k.moveis) {
          vistos.moveis++;
          if (mv.x < k.x || mv.y < k.y || mv.x + mv.s > k.x + k.w || mv.y + mv.s > k.y + k.h) erros.push(s + ': móvel fora da casa');
          for (let b = 0; b < mv.s; b++) for (let a = 0; a < mv.s; a++) { const key = (mv.x + a) + ',' + (mv.y + b); if (ocup.has(key)) erros.push(s + ': um móvel em cima do outro'); ocup.add(key); }
        }
        // a passagem da porta fica livre
        const pi = pt.lado === 'l' ? k.x + k.w - 1 : pt.lado === 'o' ? k.x : pt.x1, pj = pt.lado === 's' ? k.y + k.h - 1 : pt.lado === 'n' ? k.y : pt.y1;
        if (ocup.has(pi + ',' + pj)) erros.push(s + ': móvel na frente da porta');
      });
      if (p.muro && p.muro.portoes.some(g => g.x1 !== g.x2 && g.y1 !== g.y2)) erros.push(s + ': portão torto');
    }
    return { erros: erros.slice(0, 6), n: erros.length, vistos };
  });
  ok(regras.n === 0, 'em 60 sorteios (aldeia e vila, os quatro terrenos, com e sem rio e paliçada): o mesmo sorteio dá o mesmo vilarejo; casas dentro da área, sem grudar, fora da rua, da praça e do rio; uma porta de um quadrado em cada, no lado certo; móveis dentro, sem um em cima do outro e sem tapar a porta — ' + j(regras));

  // ================= E: o item complementar =================
  await ev(() => {
    const u = __tc, sc = u.Store.scene(), k = u.newToken(sc, 2 * sc.cell, 2 * sc.cell, { name: 'Selene' });
    u.Store.tx('prep', () => u.Store.add('tokens', k)); u.Store.tx('ligar', () => u.Store.upd('tokens', k.id, { char: 'pc_sel' }));
    const F = u.Fichas;
    F.podeEquipar = t => !!t && t.char === 'pc_sel';
    F.itens = t => (t && t.char === 'pc_sel' ? [
      { id: 'b', nome: 'Bainha de Selene', on: true, troca: '', reliquia: false, req: 'Espada de gelo', ativo: true, bon: [{ rot: 'DEF F', v: 1 }] },
      { id: 'l', nome: 'Luva da Geada', on: true, troca: '', reliquia: false, req: 'Espada do Gelo II', ativo: false, bon: [{ rot: 'DES', v: 1 }] },
      { id: 'x', nome: 'Elmo', on: false, troca: '', reliquia: false, req: '', ativo: false, bon: [] }] : []);
    u.setSel([{ c: 'tokens', id: k.id }]);
  });
  await longe(); await tecla('e');
  const req = await page.locator('#epop .eq-req').evaluateAll(cs => cs.map(c => c.innerText.trim() + (c.classList.contains('falta') ? ' [falta]' : '')));
  ok(j(req) === j(['com Espada de gelo', 'sem efeito · precisa de Espada do Gelo II [falta]']), 'na janelinha E, o complementar diz com o que funciona — e "sem efeito" quando está equipado sem ele: ' + j(req));
  ok(j(await page.locator('#epop .eq-n b').allInnerTexts()) === j(['Bainha de Selene', 'Luva da Geada', 'Elmo']), '(os nomes inteiros: o "com…" vai numa linha só dele)');
  await foto('06-equipamentos-complementares');
  await page.keyboard.press('Escape'); await w();

  const inesperados = t.errs.filter(e => !/favicon/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(!inesperados.length, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
