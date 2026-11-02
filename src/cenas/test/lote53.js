// Bateria do lote 53 nas Cenas: a janela nova do gerador, a cena do crime e o mistério na cena (fora de uma mesa).
//   · a janela em três colunas: os lugares em grupos (Povoados, Natureza, Fortes e ruínas, Subterrâneo, Especiais), cada
//     um com o desenho; a prévia grande no meio; as escolhas em blocos que abrem e fecham, com o resumo no título;
//   · a aba Cena do crime: a mansão, a taverna, o beco, a cripta e a clareira, cada uma com o lugar do crime marcado;
//   · o bloco "Mistério": o corpo coberto (ou o lugar revirado) e as marcas de pista ocultas, cada uma com a pista nas
//     notas; dois cliques numa marca a revelam (com Desfazer); fora de uma mesa, o caso fica só na cena;
//   · os objetos novos (a marca de pista, o corpo coberto, os papéis espalhados) na paleta, no grupo Mistério.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const j = JSON.stringify;

(async () => {
  const t = await open({ w: 1440, h: 950 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  const foto = async (nome, clip) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png'), clip }); } };
  const G = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado)));
  const criar = async () => { await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 60000 }); await w(700); };
  const avisos = () => ev(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));

  /* ---------- a janela nova ---------- */
  await ev(() => __tc.Gerador.abrir('vila')); await w(900);
  const grupos = await page.locator('#ger-lugar .ger-rail-t').allInnerTexts();
  ok(j(grupos) === j(['Povoados', 'Natureza', 'Água e penhasco', 'Fortes e ruínas', 'Subterrâneo', 'Especiais']), 'os lugares em grupos: ' + j(grupos));
  const abas = await page.locator('#ger-lugar .seg-b').allInnerTexts();
  ok(j(abas) === j(['Vilarejo', 'Cidade', 'Tribo', 'Porto', 'Encontro', 'Região livre', 'Lago', 'Praia', 'Penhasco', 'Desfiladeiro', 'Castelo', 'Ruínas', 'Cemitério', 'Masmorra', 'Catacumbas', 'Cena do crime', 'Arena']), 'os dezessete lugares, na ordem dos grupos (lote 58: e os quatro de água e penhasco): ' + j(abas));
  ok(await page.locator('#ger-lugar .seg-b .ger-gl').count() === 17, 'cada lugar com o desenho dele');
  const blocos = await page.locator('.ger-bl > summary .ger-bl-t').allInnerTexts();
  ok(j(blocos) === j(['Vilarejo', 'Ambiente', 'Povoar', 'Mistério']), 'as escolhas em blocos: ' + j(blocos));
  ok(/comum · dia · sem clima/.test(await page.locator('#ger-bl-amb .ger-bl-r').innerText()) && /desligado/.test(await page.locator('#ger-bl-pov .ger-bl-r').innerText()), 'cada bloco com o resumo do que está escolhido');
  const lado = await ev(() => { const r = document.getElementById('ger-prev').getBoundingClientRect(), m = document.querySelector('.modal').getBoundingClientRect(); return { pw: Math.round(r.width), mw: Math.round(m.width) }; });
  ok(lado.pw >= 560 && lado.mw >= 1200, 'a prévia grande, no meio de uma janela larga: ' + j(lado));
  ok(await ev(() => document.activeElement && document.activeElement.id === 'ger-prev'), 'a janela abre com o foco na prévia (e não na semente)');
  await foto('l53-gerador-novo');
  await page.locator('#ger-lugar .seg-b', { hasText: 'Castelo' }).click(); await w(700);
  ok((await G()).plano.lugar === 'castelo' && await page.locator('#ger-lugar .seg-b.on').innerText() === 'Castelo', 'trocar de lugar pela coluna');

  /* ---------- a cena do crime ---------- */
  await page.locator('#ger-lugar .seg-b', { hasText: 'Cena do crime' }).click(); await w(700);
  for (const [k, nome] of [['taverna', 'Taverna'], ['beco', 'Beco'], ['cripta', 'Cripta'], ['clareira', 'Clareira da lua cheia'], ['mansao', 'Mansão']]) {
    await page.locator('#crime-cen .seg-b', { hasText: nome }).click(); await w(500);
    const E = await G();
    ok(E.plano.lugar === 'crime' && E.plano.cenario === k && Array.isArray(E.plano.cena) && E.plano.cena[0] > 0 && E.plano.cena[1] > 0 && E.plano.objetos.length > 8, 'a cena do crime: ' + nome + ' (o lugar do crime marcado: ' + j(E.plano.cena) + ')');
  }
  ok((await G()).plano.salas.length >= 5, 'a mansão: os cômodos (o salão, o escritório, a biblioteca, o quarto, a cozinha)');

  /* ---------- o mistério na cena ---------- */
  await page.locator('#ger-bl-mist summary').click().catch(() => {}); await w(200);
  await ev(() => { document.getElementById('ger-bl-mist').open = true; }); await w(150);
  await page.locator('.sw', { has: page.locator('#ger-mist-on') }).click(); await w(400);
  ok(await page.locator('#ger-mist-caso').count() === 1 && await page.locator('#ger-mist-tipo .seg-b').count() === 8, 'o bloco Mistério: o caso (sortear um novo) e os oito tipos');
  ok(/um caso novo/.test(await page.locator('#ger-bl-mist .ger-bl-r').innerText()), 'o resumo do bloco diz o que vai entrar');
  await page.locator('#ger-mist-tipo .seg-b', { hasText: 'Assassinato' }).click(); await w(300);
  await foto('l53-gerador-misterio');
  await criar();
  const c1 = await ev(() => { const sc = __tc.Store.scene(); return { nome: sc.name, corpo: sc.tokens.filter(k => k.prop === 'corpo').map(k => ({ h: k.hidden, n: k.name, notas: k.notes })), pistas: sc.tokens.filter(k => k.prop === 'pista').map(k => ({ id: k.id, h: k.hidden, n: k.name, notas: k.notes, m: k.mist, s: k.size })) }; });
  ok(c1.corpo.length === 1 && c1.corpo[0].h && /Quem foi: /.test(c1.corpo[0].notas), 'o corpo coberto, oculto, com a verdade nas notas (fora de uma mesa): ' + j(c1.corpo[0] && c1.corpo[0].n));
  ok(c1.pistas.length >= 6 && c1.pistas.every(p => p.h && p.m && p.m.c === null && /^p\d+$/.test(p.m.p) && /Dois cliques/.test(p.notas) && /^Pista: /.test(p.n)), 'as marcas de pista: ocultas, cada uma com a pista nas notas — ' + c1.pistas.length);
  ok(/Mistério: o caso novo/.test(await avisos()), 'o aviso conta o mistério: ' + (await avisos()).slice(0, 200));
  await foto('l53-cena-crime');
  // dois cliques numa marca: revelar (com Desfazer)
  const alvo = c1.pistas[0];
  const pt = await ev(id => { const t = __tc.Store.get('tokens', id), sc = __tc.Store.scene(), c = sc.cell; __tc.Render.centerOn && __tc.Render.centerOn(t.x, t.y); const [x, y] = __tc.Render.toScreen(t.x + t.size * c / 2, t.y + t.size * c / 2), r = __tc.Render.cv.getBoundingClientRect(); return { x: r.left + x, y: r.top + y }; }, alvo.id);
  await w(300);
  const pt2 = await ev(id => { const t = __tc.Store.get('tokens', id), c = __tc.Store.scene().cell; const [x, y] = __tc.Render.toScreen(t.x + t.size * c / 2, t.y + t.size * c / 2), r = __tc.Render.cv.getBoundingClientRect(); return { x: r.left + x, y: r.top + y }; }, alvo.id);
  await page.mouse.dblclick(pt2.x, pt2.y);
  await w(500);
  ok(await ev(id => __tc.Store.get('tokens', id).hidden === false, alvo.id), 'dois cliques na marca: a pista aparece para os jogadores');
  ok(/Marca revelada/.test(await avisos()), 'o aviso diz o que aconteceu: ' + (await avisos()).slice(-160));
  await page.locator('.toast', { hasText: 'Marca revelada' }).getByRole('button', { name: 'Desfazer' }).click(); await w(400);
  ok(await ev(id => __tc.Store.get('tokens', id).hidden === true, alvo.id), 'o Desfazer esconde de novo');

  /* ---------- num lugar qualquer ---------- */
  await ev(() => { __tc.App.opt.genMist = true; __tc.App.opt.genMistTipo = 'roubo'; __tc.Gerador.abrir('vila'); }); await w(900);
  await criar();
  const c2 = await ev(() => { const sc = __tc.Store.scene(); return { revirado: sc.tokens.filter(k => k.prop === 'papeis').length, corpo: sc.tokens.filter(k => k.prop === 'corpo').length, pistas: sc.tokens.filter(k => k.prop === 'pista').length }; });
  ok(c2.revirado === 1 && c2.corpo === 0 && c2.pistas >= 6, 'num vilarejo, um roubo: o lugar revirado (sem corpo) e as marcas de pista — ' + j(c2));
  await ev(() => { __tc.App.opt.genMist = false; });

  /* ---------- os objetos ---------- */
  const ps = await ev(() => ['pista', 'corpo', 'papeis'].map(k => __tc.Props.P[k] && __tc.Props.P[k].g));
  ok(j(ps) === j(['misterio', 'misterio', 'misterio']), 'os objetos novos, no grupo Mistério: ' + j(ps));

  const erros = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (erros.length) console.log('CONSOLE:\n' + erros.slice(0, 8).join('\n'));
  ok(!erros.length, 'sem erros no console');
  console.log((fails ? fails + ' de ' : '') + n + ' verificações ' + (fails ? 'falharam' : 'passaram'));
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
