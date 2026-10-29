// O Bestiário do clã (lote 36), sem mesa (cada um é o mestre de tudo; o livro fica neste navegador):
//   · a página sozinha: sem clã, o convite; o livro em branco e trancado; criar uma página (o nome, a legenda, a
//     descrição com a capitular, o que sabemos, as fraquezas, o saque) — ela nasce escondida do clã; mostrar a página,
//     revelar uma parte, Desfazer; liberar o livro; "Como o clã vê" (só o revelado, o resto borrado, sem botões);
//     o índice, as setas, a busca; editar a página que veio do Bestiário (fica marcado o que o mestre mudou); apagar
//     com Desfazer; o título; no celular, uma página embaixo da outra;
//   · na casca: a aba "Bestiário do clã" (no grupo Mundo); no Bestiário, as fraquezas e resistências do inimigo e
//     "Enviar ao livro do clã" (chega escondido; enviar de novo não apaga o que o mestre mudou no livro); o link da
//     gaveta abre o livro na página dele.
// (A lógica: livro-nucleo.test.js. O banco, quem lê e as anotações: livro.rede.test.js.)
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const CLAS = { 'cla:c:gar': { v: 1, nome: 'Garret', jogadores: true, ordem: 1, cargos: { lider: { nome: 'Líder', pai: null, ordem: 0, gente: [] } } },
  'cla:c:var': { v: 1, nome: 'Casa Varonil', jogadores: false, ordem: 2, cargos: { lider: { nome: 'Lorde', pai: null, ordem: 0, gente: [] } } } };

(async () => {
  const t = await start();
  const foto = async (P, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };

  // ---------------- a página sozinha ----------------
  const { page: P } = await t.device({ name: 'livro', w: 1440, h: 900 });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const toasts = () => E(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ '));
  const doc = id => E(id => __livro.doc(id), id);
  const txt = sel => P.locator(sel).innerText();
  await P.goto(t.base + 'livro/?debug', { waitUntil: 'load' }); await w(600);

  await passo('sem clã', async () => {
    ok(await E(() => __livro.pronto && !__livro.naMesa && __livro.mestre) && /Ainda não há clã na mesa/.test(await txt('#semLivro')) && await P.locator('#livro').isHidden(),
      'sem clã, o convite para criar um na aba Clã (sem livro)');
  });
  await passo('o livro em branco', async () => {
    await E(c => { localStorage.setItem('tinycats:cla:local', JSON.stringify(c)); __livro.lerLocal(); }, CLAS); await w(150);
    ok(await P.locator('#livro').isVisible() && /Um livro em branco/.test(await txt('#pagEsq')) && /\+ Página/.test(await txt('#pagDir')) && (await txt('#contagem')) === '0 páginas',
      'com o clã, o livro abre em branco, com o caminho para a primeira página');
    ok(/Bestiário de Garret \(trancado\)/.test(await P.locator('#escolha option').first().innerText()) && await P.locator('#escolha option').count() === 2 && /está trancado: só você o vê/.test(await txt('#aviso')),
      'um livro para cada clã (o do Garret primeiro), trancado: o aviso diz que só você o vê');
    ok(await P.locator('#btEditar').isDisabled() && await P.locator('#btDesfazer').isDisabled(), 'sem página, nada a editar nem a desfazer');
  });

  await passo('criar uma página', async () => {
    await P.locator('#btNova').click(); await w(150);
    ok(await P.locator('#dlg[open]').isVisible() && /Uma página nova/.test(await txt('#dlg-tit')) && await P.locator('#ed-apagar').count() === 0, 'a janela da página nova (sem "Apagar")');
    await P.locator('#ed-nome').fill('Lobo da Névoa');
    await P.locator('#ed-legenda').fill('Avistado na Floresta de Merunê, na terceira lua.');
    await P.locator('#ed-desc').fill('Caça em bando nas manhãs de neblina, espreitando viajantes.\n\nSome no nevoeiro quando ferido.');
    await P.locator('#ed-num-mais').click(); await P.locator('#ed-num-n-0').fill('Vida'); await P.locator('#ed-num-v-0').fill('~120');
    await P.locator('#ed-num-mais').click(); await P.locator('#ed-num-n-1').fill('Iniciativa'); await P.locator('#ed-num-v-1').fill('Rápida');
    await P.locator('#ed-fr-mais').click(); await P.locator('#ed-fr-n-0').fill('Fogo');
    await P.locator('#ed-fr-mais').click(); await P.locator('#ed-fr-n-1').fill('Gelo'); await P.locator('#ed-fr-t-1').selectOption('imune');
    await P.locator('#ed-sq-mais').click(); await P.locator('#ed-sq-0').fill('Pele de névoa');
    ok(await P.locator('#ed-ver input:checked').count() === 0, 'a página nova: nada marcado em "O que o clã vê"');
    await P.locator('#ed-salvar').click(); await w(200);
    const L = await E(() => __livro.livro());
    const p = L && L.pags[0] && await doc('cla:livro:gar:p:' + L.pags[0].id);
    ok(!!p && p.nome === 'Lobo da Névoa' && j(p.nums) === j([{ n: 'Vida', v: '~120' }, { n: 'Iniciativa', v: 'Rápida' }]) && j(p.fraq) === j([{ nome: 'Fogo', tipo: 'fraco' }, { nome: 'Gelo', tipo: 'imune' }]) && j(p.saque) === j(['Pele de névoa'])
      && Object.values(p.ver).every(v => v === false), 'a página guardada, com tudo escondido do clã: ' + j(p));
    ok(/entrou no livro \(escondida do clã\)/.test(await toasts()) && /Esta página está escondida do clã/.test(await txt('[data-k="faixa"]')), 'o aviso, e a faixa do mestre: "escondida do clã"');
    ok((await txt('#nome')) === 'Lobo da Névoa' && (await P.locator('.capitular b').innerText()) === 'C' && /aça em bando/.test(await txt('#pagDir')) && /Some no nevoeiro/.test(await txt('#pagDir'))
      && await P.locator('.quadro dt').count() === 2 && await P.locator('.fr.fraco').count() === 1 && await P.locator('.fr.imune').count() === 1 && /Pele de névoa/.test(await txt('.saque')),
      'a página: o nome, a capitular, dois parágrafos, o que sabemos, a fraqueza (fogo) e a imunidade (gelo), o que deixa cair');
    ok(/Avistado na Floresta de Merunê/.test(await txt('.legenda')) && /ainda sem desenho/.test(await txt('.foto')), 'a legenda a lápis, e a foto ainda sem desenho');
    ok(await P.locator('.tg').count() === 5 && await P.locator('.parte.escondida').count() === 4 && await P.locator('.ilus.escondida').count() === 1, 'no modo do mestre, cada parte com o botão de revelar (escondidas, com a borda do mestre)');
  });

  let pag = null;
  await passo('mostrar e revelar', async () => {
    pag = (await E(() => __livro.livro())).pags[0].id;
    await P.locator('[data-k="ver-pag"]').click(); await w(150);
    ok((await doc('cla:livro:gar:p:' + pag)).ver.pag === true && /O clã vê esta página \(com 5 partes escondidas\)/.test(await txt('[data-k="faixa"]')), '"Mostrar ao clã": a página aparece (as partes, ainda escondidas)');
    await P.locator('[data-revelar="fraq"]').click(); await w(150);
    ok((await doc('cla:livro:gar:p:' + pag)).ver.fraq === true && (await P.locator('[data-revelar="fraq"]').getAttribute('aria-pressed')) === 'true' && /Revelado ao clã: Fraquezas e resistências/.test(await toasts()),
      'revelar as fraquezas: o botão vira "O clã vê"');
    await P.locator('#btDesfazer').click(); await w(150);
    ok((await doc('cla:livro:gar:p:' + pag)).ver.fraq === false && (await doc('cla:livro:gar:p:' + pag)).ver.pag === true, 'Desfazer: as fraquezas voltam a ficar escondidas (a página continua à mostra)');
    await P.locator('[data-revelar="img"]').click(); await P.locator('[data-revelar="nums"]').click(); await w(150);
  });

  await passo('liberar e ver como o clã', async () => {
    await P.locator('#liberar').check(); await w(150);
    ok(j(await doc('cla:livro:gar')) === j({ v: 1, on: true, titulo: 'Bestiário de Garret' }) && await P.locator('#aviso').isHidden() && !/trancado/.test(await P.locator('#escolha option').first().innerText()), 'liberar o livro: a capa com o título de começo; o aviso some');
    // uma segunda página, escondida
    await E(() => __livro.gravarDoc('cla:livro:gar:p:aranha', { v: 1, nome: 'Aranha de Cinzas', desc: 'Tece teias de brasa.', ver: { pag: false }, mao: {} })); await E(() => __livro.pintar()); await w(100);
    await P.locator('#vistas [data-vista="cla"]').click(); await w(200);
    ok((await txt('#contagem')) === '1 página que o clã vê' && (await txt('#nome')) === 'Lobo da Névoa', '"Como o clã vê": só a página mostrada (a Aranha, escondida, não)');
    ok(await P.locator('.tg').count() === 0 && await P.locator('[data-k="faixa"]').count() === 0 && await P.locator('#btNova').isDisabled() && await P.locator('#btEditar').isDisabled(), 'sem os botões do mestre');
    ok(await P.locator('.quadro dt').count() === 2 && await P.locator('[data-parte="fraq"] .borrado').count() === 1 && await P.locator('[data-parte="saque"] .borrado').count() === 1 && await P.locator('[data-parte="desc"] .borrado').count() === 1
      && await P.locator('.capitular').count() === 0 && /ainda não sabe/i.test(await txt('#pagDir')), 'o que sabemos (revelado) aparece; a descrição, as fraquezas e o saque, borrados (sem o conteúdo)');
    ok(!/Fogo|Pele de névoa|Caça em bando/.test(await E(() => document.getElementById('pagDir').innerText)), 'o texto escondido não está na página do clã');
    await foto(P, 'livro-cla');
    await P.locator('#vistas [data-vista="mestre"]').click(); await w(150);
  });

  await passo('folhear e buscar', async () => {
    ok(j(await P.locator('#indice button').allInnerTexts()) === j(['A', 'L']) && (await P.locator('#indice [aria-current="true"]').innerText()) === 'L', 'o índice: A (Aranha) e L (Lobo), no L');
    await P.locator('#indice [data-letra="A"]').click(); await w(120);
    ok((await txt('#nome')) === 'Aranha de Cinzas' && await P.locator('#btAnt').isDisabled() && (await txt('#numEsq')) === '1', 'a letra A abre a Aranha (a primeira: "Anterior" desligado)');
    await P.keyboard.press('ArrowRight'); await w(120);
    ok((await txt('#nome')) === 'Lobo da Névoa' && await P.locator('#btProx').isDisabled() && (await txt('#numDir')) === '4', 'a seta para a direita vira a página');
    await P.keyboard.press('ArrowLeft'); await w(120);
    await P.locator('#busca').fill('nevoa'); await w(150);
    ok(await P.locator('#achados button').count() === 1 && /Lobo da Névoa/.test(await txt('#achados')), 'a busca acha "nevoa" (sem acento) no Lobo');
    await P.locator('#busca').press('Enter'); await w(150);
    ok((await txt('#nome')) === 'Lobo da Névoa' && await P.locator('#achados').isHidden(), 'Enter abre a página achada');
  });

  await passo('a página que veio do Bestiário', async () => {
    await E(() => __livro.gravarDoc('cla:livro:gar:p:blobo', { v: 1, nome: 'Lobo Cinzento', desc: 'Do Bestiário.', nums: [{ n: 'Vida', v: '~60' }], de: 'best:i:lobo', enviado: '2026-10-29T03:00:00.000Z', ver: { pag: true }, mao: {} })); await E(() => __livro.pintar());
    await P.locator('#busca').fill('cinzento'); await P.locator('#busca').press('Enter'); await w(150);
    await P.locator('#btEditar').click(); await w(150);
    ok(/Veio do seu Bestiário \(enviada em 29\/10\/2026\)/.test(await txt('#dlg .veio')), 'a janela diz que a página veio do Bestiário');
    await P.locator('#ed-desc').fill('Escrito no livro.'); await P.locator('#ed-salvar').click(); await w(150);
    const p = await doc('cla:livro:gar:p:blobo');
    ok(p.desc === 'Escrito no livro.' && j(p.mao) === j({ desc: true }), 'o que o mestre mudou no livro fica marcado (para enviar de novo não apagar): ' + j(p.mao));
    await P.locator('#btEditar').click(); await w(150);
    await P.locator('#ed-apagar').click(); await w(150);
    ok(await doc('cla:livro:gar:p:blobo') === null && /saiu do livro/.test(await toasts()), 'apagar a página (pela janela)');
    await P.locator('#btDesfazer').click(); await w(150);
    ok((await doc('cla:livro:gar:p:blobo') || {}).desc === 'Escrito no livro.' && (await txt('#nome')) === 'Lobo Cinzento', 'Desfazer: a página volta, aberta');
  });

  await passo('o título', async () => {
    await P.locator('#btTitulo').click(); await w(120);
    await P.locator('#pt-txt').fill('Caderno de caça do Garret'); await P.locator('#pt-ok').click(); await w(150);
    ok((await doc('cla:livro:gar')).titulo === 'Caderno de caça do Garret' && /Caderno de caça do Garret/.test(await P.locator('#escolha option').first().innerText()), 'o título do livro muda (com Desfazer)');
    await foto(P, 'livro-mestre');
  });

  await passo('o celular', async () => {
    await P.setViewportSize({ width: 400, height: 860 }); await w(250);
    const r = await E(() => { const e = document.getElementById('pagEsq').getBoundingClientRect(), d = document.getElementById('pagDir').getBoundingClientRect(); return { larg: document.documentElement.scrollWidth, abaixo: d.top >= e.bottom - 2, idx: getComputedStyle(document.getElementById('indice')).flexDirection }; });
    ok(r.larg <= 400 && r.abaixo && r.idx === 'row', 'no celular: uma página embaixo da outra, o índice em linha e sem rolagem para o lado: ' + j(r));
    await foto(P, 'livro-celular');
    await P.setViewportSize({ width: 1440, height: 900 });
  });

  // ---------------- na casca: a aba e o Bestiário do mestre ----------------
  const { page: C } = await t.device({ name: 'casca', w: 1440, h: 900, seed: { 'tinycats:cla:local': j(CLAS), 'tinycats:aba': 'bestiario' } });
  const wc = ms => C.waitForTimeout(ms);
  await C.goto(t.base + '?debug', { waitUntil: 'load' }); await wc(1800);
  await passo('a aba', async () => {
    ok(await C.locator('#tab-livro').isVisible() && (await C.locator('#tab-livro').innerText()) === 'Bestiário do clã' && (await C.locator('#tab-livro').evaluate(el => el.closest('.grupo').dataset.g)) === 'mundo'
      && await C.locator('#tab-bestiario').isVisible(), 'a aba "Bestiário do clã", no grupo Mundo (e o Bestiário de sempre, do mestre)');
  });
  const B = C.frame({ url: /\/bestiario\// });
  await passo('as fraquezas no Bestiário', async () => {
    await B.evaluate(() => __best.gravarDoc('best:i:lobo', { v: 1, nome: 'Lobo da Névoa', tags: ['Floresta', 'Fera'], ficha: { tier: 'C', level: 3 }, comp: { texto: 'Caça em bando.' }, saque: { itens: [{ nome: 'Pele de névoa', chance: 60 }] } }));
    await B.evaluate(() => __best.pintar()); await wc(200);
    await B.locator('.carta[data-best="lobo"]').click(); await wc(200);
    await B.locator('#g-editar').click(); await wc(200);
    await B.locator('#ed-aba-comp').click(); await wc(150);
    await B.locator('#ed-fr-mais').click(); await B.locator('#ed-fr-n-0').fill('Fogo'); await B.locator('#ed-fr-n-0').press('Tab');
    await B.locator('#ed-fr-mais').click(); await B.locator('#ed-fr-n-1').fill('Prata'); await B.locator('#ed-fr-n-1').press('Tab'); await B.locator('#ed-fr-t-1').selectOption('resiste');
    await B.locator('#ed-salvar').click(); await wc(200);
    const e = await B.evaluate(() => __best.doc('best:i:lobo'));
    ok(j(e.fraq) === j([{ nome: 'Fogo', tipo: 'fraco' }, { nome: 'Prata', tipo: 'resiste' }]), 'as fraquezas e resistências do inimigo, na aba Comportamento: ' + j(e.fraq));
    ok(/Fogo \(fraqueza\)/.test(await B.locator('#g-fraq').innerText()) && /Prata \(resistência\)/.test(await B.locator('#g-fraq').innerText()), 'e na gaveta');
  });
  await passo('enviar ao livro do clã', async () => {
    await B.locator('#g-livro').click(); await wc(200);
    ok(await B.locator('#lv-cla option').count() === 2 && /Chega escondido do clã/.test(await B.locator('#lv-info').innerText()) && /trancado/.test(await B.locator('#lv-info').innerText()),
      'a janela: o livro de qual clã, e o aviso de que chega escondido (e o livro ainda trancado)');
    ok(/Perigo/.test(await B.locator('#lv-previa').innerText()) && /Fogo, Prata/.test(await B.locator('#lv-previa').innerText()) && /Pele de névoa/.test(await B.locator('#lv-previa').innerText()), 'a prévia do que vai');
    await B.locator('#lv-enviar').click(); await wc(250);
    const lv = await C.evaluate(() => JSON.parse(localStorage.getItem('tinycats:livro:local')).docs['cla:livro:gar:p:blobo']);
    ok(!!lv && lv.nome === 'Lobo da Névoa' && lv.de === 'best:i:lobo' && Object.values(lv.ver).every(v => v === false) && j(lv.fraq) === j([{ nome: 'Fogo', tipo: 'fraco' }, { nome: 'Prata', tipo: 'resiste' }]) && lv.desc === 'Caça em bando.'
      && lv.nums.some(n => n.n === 'Perigo' && n.v === '●●●○○') && lv.nums.some(n => n.n === 'Habitat' && n.v === 'Floresta'), 'a página no livro do Garret: escondida, com os números aproximados, as fraquezas e o saque: ' + j(lv));
    ok(/entrou no livro de Garret, escondido do clã/.test(await B.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' '))) && /No livro de Garret/.test(await B.locator('#g-nolivro').innerText()),
      'o aviso, e a gaveta diz em que livro ele está');
    // o mestre escreve no livro; enviar de novo não apaga
    await C.evaluate(() => { const d = JSON.parse(localStorage.getItem('tinycats:livro:local')); const p = d.docs['cla:livro:gar:p:blobo']; p.desc = 'Escrito no livro.'; p.mao = { desc: true }; p.ver.pag = true; p.legenda = 'Visto em Merunê'; localStorage.setItem('tinycats:livro:local', JSON.stringify(d)); });
    await B.evaluate(() => { const e = __best.doc('best:i:lobo'); e.saque.itens.push({ id: 'x2', nome: 'Presa longa', chance: 30, qtd: '1', tipo: 'material' }); __best.gravarDoc('best:i:lobo', e); __best.pintar(); }); await wc(150);
    await B.locator('#g-livro').click(); await wc(150);
    ok(/já está neste livro/.test(await B.locator('#lv-info').innerText()), 'de novo: a janela diz que ele já está no livro');
    await B.locator('#lv-enviar').click(); await wc(250);
    const lv2 = await C.evaluate(() => JSON.parse(localStorage.getItem('tinycats:livro:local')).docs['cla:livro:gar:p:blobo']);
    ok(lv2.desc === 'Escrito no livro.' && lv2.legenda === 'Visto em Merunê' && lv2.ver.pag === true && j(lv2.saque) === j(['Pele de névoa', 'Presa longa']), 'enviar de novo: o saque novo chega; o texto do livro, a legenda e o que o clã vê ficam');
  });
  await passo('abrir o livro pela gaveta', async () => {
    await B.locator('#g-nolivro [data-livro="gar"]').click();
    let L = null, abriu = false;
    for (let k = 0; k < 40 && !abriu; k++) {
      await wc(300);
      L = C.frame({ url: /\/livro\// });
      try { abriu = !!L && (await L.locator('#nome').count()) === 1 && (await L.locator('#nome').innerText()) === 'Lobo da Névoa'; } catch (e) { abriu = false; }
    }
    const sel = await C.locator('#tab-livro').getAttribute('aria-selected'), dir = L ? await L.locator('#pagDir').innerText() : '';
    ok(sel === 'true' && abriu && /scrito no livro/.test(dir) && (await L.locator('.capitular b').innerText()) === 'E',
      'o link da gaveta abre a aba Bestiário do clã, na página do Lobo');
    await foto(C, 'livro-casca');
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
