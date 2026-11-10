// A fechadura (lote 120): o núcleo (os cinco níveis, o sorteio do jeito, a prova, os erros e o que encerra) e, no Escudo
// do mestre sozinho, o teste jogável: girar a gazua até o ponto certo e abrir; forçar fora do ponto até quebrar; travar
// os pinos no alto; as opções (nível, jeito, atributo, gazuas, consequências).
const { start, checker } = require('./lib');
const E = require('../../tc/escudo.js'); require('../../tc/escudo-puzzles.js');
const F = require('../../tc/fechadura.js');
const { ok, end } = checker();
// ---- o núcleo ----
const jogo = (pz) => E.jogoNovo('h1', E.normHandout({ tipo: 'puzzle', nome: 'Porta', puzzle: Object.assign({ tipo: 'fechadura', seed: 7 }, pz) }));
ok(F.NIVEIS.map(n => n[1]).join(',') === 'Fácil,Médio,Difícil,Extremo,Absoluto', 'os cinco níveis');
const g = jogo({ nivel: 'facil', estilo: 'girar' }), pn = jogo({ nivel: 'absoluto', estilo: 'pinos' });
ok(g.pub.estilo === 'girar' && pn.pub.estilo === 'pinos' && pn.pub.pinos === 7, 'o jeito escolhido; o Absoluto tem 7 pinos');
const sorteados = new Set([...Array(30).keys()].map(s => jogo({ seed: s + 1 }).pub.estilo));
ok(sorteados.size === 2, 'no sorteio, saem os dois jeitos');
ok(!JSON.stringify(g.pub).includes(F.segredoDe(g).s), 'o segredo não vai à vista');
ok(E.confere(g, E.provaDoEstado(g, 'fim')) && !E.confere(g, 'outra'), 'a prova da fechadura aberta');
const e3 = jogo({ nivel: 'extremo', estilo: 'girar', gazuas: 2, cons: { quebra: true, barulho: true, emperra: true } });
let m = F.erro(e3, true, 1);
ok(m.q === 1 && m.b === 1 && !m.falhou, 'uma gazua quebrada: barulho, sem acabar');
e3.estado = Object.assign({}, e3.estado, m);
m = F.erro(e3, true, 1);
ok(m.falhou === 'gazuas', 'a última gazua quebrada encerra');
e3.estado = { q: 0, b: 2, e: 5 };
m = F.erro(e3, false, 1);
ok(m.alarme === 1 && m.falhou === 'emperrou', 'o alarme (3 de barulho no Extremo) e a fechadura emperrada (6 erros)');
ok(F.ajuda(0) === 1 && F.ajuda(50) === 1.5 && F.ajuda(500) === 2, 'o atributo alarga até o dobro');
// ---- a tela ----
(async () => {
  const t = await start();
  const { page: p } = await t.device({ name: 'fechadura', w: 1440, h: 950 });
  p.setDefaultTimeout(8000);
  const w = ms => p.waitForTimeout(ms);
  const ev = (fn, a) => p.evaluate(fn, a);
  const erros = [];
  p.on('pageerror', e => erros.push(String(e.message)));
  try {
    await p.goto(t.base + 'escudo/?debug'); await w(700);
    await p.click('[data-k="aba:handouts"]'); await w(150);
    await p.click('[data-k="h:novo:puzzle"]'); await w(200);
    const puz = await ev(() => __escudo.HO.sel);
    const tst = () => ev(id => { const t = __escudo.HO.testes[id]; return t ? JSON.parse(JSON.stringify(t.jogo)) : null; }, puz);
    const segredo = () => ev(id => __escudo.E.fechadura.segredoDe(__escudo.HO.testes[id].jogo), puz);
    await p.click('[data-k="pz:t:fechadura"]'); await w(300);
    ok(await p.locator('[data-k^="pz:niv:"]').count() === 5 && await p.locator('[data-k^="pz:cons:"]').count() === 4 && await p.locator('[data-k="pz:tempo"]').count() === 0, 'as opções da fechadura (sem o cronômetro de sempre)');
    await p.click('[data-k="pz:niv:facil"]'); await w(250);
    await p.click('[data-k="pz:est:girar"]'); await w(300);
    ok(await p.locator('.previa .fch-svg').count() === 1, 'o teste: a fechadura de girar');
    await p.selectOption('[data-k="pz:atr"]', ''); await w(250);
    // forçar fora do ponto: quebra
    const c = (await segredo()).c;
    const palco = p.locator('.previa .fch-palco');
    await palco.focus();
    const longe = c > 0 ? -80 : 80;
    for (let i = 0; i < Math.abs(longe) / 2; i++) await p.keyboard.press(longe < 0 ? 'ArrowLeft' : 'ArrowRight');
    await p.keyboard.down(' '); await w(2600); await p.keyboard.up(' '); await w(300);
    let jg = await tst();
    ok(jg.erros === 1 && jg.estado.q === 1 && jg.estado.b === 1, 'forçar fora do ponto quebra a gazua (um erro, barulho): ' + JSON.stringify(jg.estado));
    // (lote 134) o desgaste não volta: forçar aos pouquinhos, soltando entre um e outro, também quebra
    await palco.focus();
    for (let i = 0; i < 2; i++) { await p.keyboard.down(' '); await w(650); await p.keyboard.up(' '); await w(900); }
    const larg = await ev(() => Number(document.querySelector('.previa .fch-forca').getAttribute('width')));
    jg = await tst();
    ok(jg.estado.q === 1 && larg > 60, 'depois de soltar, a barra do desgaste continua onde parou (' + Math.round(larg) + ' de 120)');
    await p.keyboard.down(' '); await w(650); await p.keyboard.up(' '); await w(300);
    jg = await tst();
    ok(jg.estado.q === 2, 'a terceira forçada termina de gastar: a gazua quebra');
    ok(await ev(() => Number(document.querySelector('.previa .fch-forca').getAttribute('width'))) === 0, 'a gazua nova começa inteira');
    // ir ao ponto certo e girar
    await palco.focus();
    const passos = Math.round((c - longe) / 2);
    for (let i = 0; i < Math.abs(passos); i++) await p.keyboard.press(passos < 0 ? 'ArrowLeft' : 'ArrowRight');
    await p.keyboard.down(' '); await w(1300); await p.keyboard.up(' '); await w(300);
    jg = await tst();
    ok(!!jg.resolvido && await p.locator('.previa .fch.aberta').count() === 1, 'no ponto certo, o cilindro gira e a fechadura abre');
    await p.screenshot({ path: __dirname + '/_fch-girar.png' });
    // os pinos
    await p.click('[data-k="pz:est:pinos"]'); await w(400);
    const v = (await segredo()).v;
    ok(Array.isArray(v) && v.length === 3 && await p.locator('.previa .fch-col').count() === 3, 'os pinos: 3 no Fácil: ' + JSON.stringify(v) + ' ' + await p.locator('.previa .fch-col').count() + ' ' + await p.locator('.previa .fch').count());
    await p.locator('.previa .fch-palco').focus();
    for (let i = 0; i < v.length; i++) {
      await p.keyboard.press(' ');
      await w(Math.round(v[i] / 2) - 15);
      await p.keyboard.press(' ');
      await w(120);
    }
    await w(300);
    jg = await tst();
    ok(!!jg.resolvido, 'travar cada pino no alto abre: ' + JSON.stringify(jg.estado));
    // travar fora da hora: um erro (barulho)
    await p.click('[data-k="tst:recomecar"]'); await w(400);
    await p.locator('.previa .fch-palco').focus();
    await p.keyboard.press(' '); await w(40); await p.keyboard.press(' '); await w(300);
    jg = await tst();
    ok(jg.estado.e === 1 && jg.estado.b === 1, 'travar fora da hora: erro e barulho');
    await p.screenshot({ path: __dirname + '/_fch-pinos.png' });
    // (lote 134) no Extremo: travar quando o pino acaba de entrar na faixa verde vale; a faixa é a janela de verdade
    await p.click('[data-k="pz:niv:extremo"]'); await w(400);
    const v2 = (await segredo()).v;
    await p.locator('.previa .fch-palco').focus();
    const faixa = await ev(() => { const a = document.querySelector('.previa .fch-alvo'); return { top: parseFloat(a.style.top), h: parseFloat(a.style.height) }; });
    ok(Math.abs(faixa.h - (0.11 + 0.024) * 62 - 2) < 0.6, 'no Extremo, a faixa verde tem a altura da janela (' + faixa.h + 'px)');
    await p.keyboard.press(' ');
    // espera o pino entrar na faixa (o topo dele abaixo da linha de baixo da faixa) e trava logo
    await ev(([top, h]) => new Promise(res => { const pino = document.querySelector('.previa .fch-col .fch-pino'), col = pino.parentElement;
      const olha = () => { const y = pino.getBoundingClientRect().top - col.getBoundingClientRect().top; if (y <= top + h - 1) res(); else requestAnimationFrame(olha); }; olha(); }), [faixa.top, faixa.h]);
    await p.keyboard.press(' '); await w(250);
    jg = await tst();
    ok(await ev(() => document.querySelectorAll('.previa .fch-col.travado').length) === 1, 'travou ao encostar no verde: ' + JSON.stringify(jg.estado) + ' ' + JSON.stringify(v2));
    if (process.env.FOTOS) await p.locator('.previa .fch').screenshot({ path: process.env.FOTOS + '/fch-extremo.png' });
    ok(!erros.length, 'sem erros na página: ' + erros.join(' | '));
  } catch (e) { ok(false, 'falhou: ' + e.message); }
  await t.close(); end();
})();
