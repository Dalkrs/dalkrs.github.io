// As fechaduras de dedução (lote 207): o Perfil da chave e as Engrenagens. O núcleo (toda fechadura gerada tem
// solução; o perfil tem uma só, e com a pista falsa, uma só pista falsa; as engrenagens giram certo com a solução e
// travam com o erro), a aptidão no lugar do atributo e, no Escudo do mestre sozinho, o teste jogável.
const { start, checker } = require('./lib');
const E = require('../../tc/escudo.js'); require('../../tc/escudo-puzzles.js');
const F = require('../../tc/fechadura.js');
const D = require('../../tc/fechadura-deducao.js');
const { ok, end } = checker();
const mul = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---- o perfil: uma solução só (e, com a falsa, só uma combinação com exatamente uma pista errada) ----
{
  let unicas = 0, tot = 0, falsas = 0, tempoMax = 0;
  for (let n = 0; n < 5; n++) for (let s = 1; s <= 8; s++) {
    const t0 = Date.now(), x = D.gerarPerfil(mul(s * 101 + n), n); tempoMax = Math.max(tempoMax, Date.now() - t0);
    const N = x.pub.pinos, tot5 = Math.pow(5, N);
    let boas = 0, achou = null;
    for (let c = 0; c < tot5; c++) {
      const a = []; let y = c; for (let i = 0; i < N; i++) { a.push(1 + (y % 5)); y = Math.floor(y / 5); }
      const erradas = x.pub.pistas.filter(p => !D.vale(p, i => a[i], N)).length;
      if (erradas === (x.pub.falsa ? 1 : 0)) { boas++; achou = a; }
    }
    tot++;
    if (boas === 1 && achou.join() === x.sol.join()) unicas++;
    if (x.pub.falsa) falsas++;
  }
  ok(unicas === tot, 'o perfil sempre tem uma solução só, nos 5 níveis (' + unicas + ' de ' + tot + ')');
  ok(falsas === 16, 'no Extremo e no Absoluto, uma pista é falsa');
  ok(tempoMax < 3000, 'gerar o perfil é rápido o bastante (o pior: ' + tempoMax + ' ms)');
  const f = D.gerarPerfil(mul(5), 0);
  ok(D.conferirPerfil(f.pub, f.sol, f.sol, 0).ok && /de 4 pinos/.test(D.conferirPerfil(f.pub, f.sol, f.sol.map(v => (v % 5) + 1), 0).texto), 'o teste: certo abre; errado no Fácil diz quantos pinos estão certos');
  const g = D.gerarPerfil(mul(5), 4);
  ok(D.conferirPerfil(g.pub, g.sol, g.sol.map(v => (v % 5) + 1), 4).texto === 'Não abriu.', 'no Absoluto, o teste errado não conta nada');
}
// ---- as engrenagens: a solução gira certo; tirar uma engrenagem para; a regra nova de cada nível aparece ----
{
  let boas = 0, tot = 0;
  const viu = { cil2: false, duplo: false, presa: false, catraca: false, voltas: false };
  for (let n = 0; n < 5; n++) for (let s = 1; s <= 12; s++) {
    const x = D.gerarEngr(mul(s * 13 + n), n), pos = JSON.parse(JSON.stringify(x.sol));
    tot++;
    const g = D.girar(x.pub, pos);
    const k = Object.keys(pos)[0], sem = Object.assign({}, pos, { [k]: [null, null] });
    if (g.ok && !D.girar(x.pub, sem).ok) boas++;
    const cils = x.pub.eixos.filter(e => e.f && e.f.t === 'cilindro');
    if (n >= 2 && cils.length === 2) viu.cil2 = true;
    if (n >= 3 && x.pub.eixos.some(e => e.duplo)) viu.duplo = true;
    if (n >= 3 && x.pub.eixos.some(e => e.f && e.f.t === 'presa')) viu.presa = true;
    if (n === 4 && x.pub.eixos.some(e => e.f && e.f.t === 'catraca')) viu.catraca = true;
    if (n >= 3 && cils.some(e => e.f.quer.v && Math.abs(e.f.quer.v - 1) > 0.01)) viu.voltas = true;
    if (n < 3 && (x.pub.eixos.some(e => e.duplo || (e.f && (e.f.t === 'presa' || e.f.t === 'catraca'))))) viu.erro = true;
  }
  ok(boas === tot, 'as engrenagens: a solução abre e tirar uma engrenagem do caminho não abre (' + boas + ' de ' + tot + ')');
  ok(viu.cil2 && viu.duplo && viu.presa && viu.catraca && viu.voltas && !viu.erro, 'cada nível traz a regra dele: ' + JSON.stringify(viu));
  // o eixo duplo: as de trás só encostam nas de trás
  const pub = { eixos: [{ id: 'm', x: 2, y: 2, f: { t: 'manivela', r: 1.5, c: 0 } }, { id: 'a', x: 5, y: 2, duplo: 1 }, { id: 'c', x: 8, y: 2, f: { t: 'cilindro', r: 1.5, c: 1, quer: { d: 1, v: 1 } } }] };
  ok(D.girar(pub, { a: ['m', 'm'] }).ok, 'o eixo duplo: a da frente gira com a manivela, a de trás gira junto e move o cilindro de trás');
  ok(D.girar(pub, { a: ['m', null] }).motivo === 'parado', 'sem a de trás, o cilindro de trás não se mexe');
  const tri = { eixos: [{ id: 'm', x: 2, y: 2, f: { t: 'manivela', r: 1, c: 0 } }, { id: 'a', x: 4, y: 2 }, { id: 'b', x: 3, y: 2 + Math.sqrt(3) }, { id: 'c', x: 9, y: 2, f: { t: 'cilindro', r: 1, c: 0, quer: { d: 1 } } }] };
  ok(D.girar(tri, { a: ['p'], b: ['p'] }).motivo === 'trava', 'três engrenagens em triângulo travam');
  ok(D.girar(tri, { a: ['g'] }).motivo === 'bate', 'a engrenagem que se sobrepõe bate');
  ok(D.fracao(1.333) === '1 e 1/3 volta' && D.fracao(0.5) === 'meia volta' && D.fracao(2) === '2 voltas' && D.fracao(0.667) === '2/3 de volta', 'as voltas em texto');
}
// ---- a aptidão ----
ok(F.pontosApt(0) === 0 && F.pontosApt(1) === 1 && F.pontosApt(2) === 1 && F.pontosApt(3) === 2 && F.pontosApt(5) === 3 && F.pontosApt(12) === 3, 'a aptidão: 1–2 vale 1, 3–4 vale 2, 5 ou mais vale 3');
ok(F.multApt({ modo: 'ajuda' }, 5) === 2 && F.multApt({ modo: 'atrapalha' }, 5) === 0.5 && F.multApt({ modo: 'ajuda' }, 0) === 1, 'no Girar e nos Pinos, a aptidão alarga até o dobro; a desvantagem aperta até a metade');
const jogo = pz => E.jogoNovo('h1', E.normHandout({ tipo: 'puzzle', nome: 'Porta', puzzle: Object.assign({ tipo: 'fechadura', seed: 7 }, pz) }));
{
  const j = jogo({ estilo: 'perfil', nivel: 'medio', atr: 'DES', apt: { n: '  Gazua ', modo: 'x', tipo: 'y' } });
  ok(j.pub.apt && j.pub.apt.n === 'Gazua' && j.pub.apt.modo === 'ajuda' && j.pub.apt.tipo === 'pista' && j.pub.atr === '', 'a aptidão entra limpa e tira o atributo: ' + JSON.stringify(j.pub.apt));
  ok(!JSON.stringify(j.pub).includes(JSON.stringify(F.segredoDe(j).sol)), 'a solução não vai à vista');
  ok(jogo({ estilo: 'perfil' }).pub.atr === '', 'fechadura nova: sem atributo');
  ok(jogo({ estilo: 'girar', atr: 'DES' }).pub.atr === 'DES', 'a fechadura antiga continua com o atributo dela');
  const e = jogo({ estilo: 'engrenagens', nivel: 'facil', gazuas: 4, cons: { quebra: true } });
  ok(F.situacao(e, 2).restam === 2 && F.erro(e, true, 1, 1).falhou === 'gazuas', 'as gazuas de verdade (a desvantagem tira do começo)');
}

// ---- a tela ----
(async () => {
  const t = await start();
  const { page: p } = await t.device({ name: 'fech-deducao', w: 1366, h: 768 });
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
    ok(await p.locator('[data-k^="pz:est:"]').count() === 5, 'cinco escolhas de jogo: sorteio, girar, pinos, perfil, engrenagens');
    // ---------- o perfil ----------
    await p.click('[data-k="pz:niv:medio"]'); await w(250);
    await p.click('[data-k="pz:est:perfil"]'); await w(400);
    ok(await p.locator('.previa .fpf-grade').count() === 1 && await p.locator('.previa .fpf-pistas li').count() >= 5, 'o perfil da chave: a grade e as pistas');
    let sol = (await segredo()).sol;
    const N = sol.length;
    const casa = (i, h) => p.locator('.previa .fpf-c').nth((5 - h) * N + i);
    // errado de propósito: todos na altura errada
    for (let i = 0; i < N; i++) await casa(i, (sol[i] % 5) + 1).click();
    await p.click('.previa [data-k="fch:testar"]'); await w(300);
    let jg = await tst();
    ok(jg.estado.q === 1 && jg.estado.b === 1 && /Não abriu: 0 de 5 pinos/.test(await p.locator('.previa .fch-msg').textContent()), 'o teste errado quebra a gazua e, no Médio, diz quantos estavam certos: ' + await p.locator('.previa .fch-msg').textContent());
    await casa(0, 3).click({ button: 'right' }); await w(100);
    await p.locator('.previa .fpf-pistas li').first().click(); await w(100);
    ok(await p.locator('.previa .fpf-pistas li.riscada').count() === 1, 'riscar uma pista');
    for (let i = 0; i < N; i++) await casa(i, sol[i]).click();
    if (process.env.FOTOS) await p.locator('.previa .fch').screenshot({ path: process.env.FOTOS + '/fch-perfil.png' });
    await p.click('.previa [data-k="fch:testar"]'); await w(400);
    jg = await tst();
    ok(!!jg.resolvido && await p.locator('.previa .fch.aberta').count() === 1, 'as alturas certas abrem');
    // ---------- a aptidão: pista e teste extra ----------
    await p.fill('[data-k="pz:apt"]', 'Gazua'); await p.press('[data-k="pz:apt"]', 'Tab'); await w(400);
    ok(await p.locator('[data-k^="pz:aptm:"]').count() === 2 && await p.locator('[data-k^="pz:aptt:"]').count() === 2, 'a aptidão: ajuda ou atrapalha; pista ou teste extra');
    ok(await p.locator('.previa .fpf-c.travado.cheio').count() >= 2, 'com a pista (nível 3 no teste: 2), dois pinos já vêm certos: ' + await p.locator('.previa .fpf-c.travado.cheio').count());
    ok(/Gazua 3 \(\+2 peças certas\)/.test(await p.locator('.previa .fch-info').textContent()), 'a linha de cima mostra a aptidão: ' + await p.locator('.previa .fch-info').textContent());
    await p.click('[data-k="pz:aptt:teste"]'); await w(400);
    sol = (await segredo()).sol;
    for (let i = 0; i < N; i++) await casa(i, (sol[i] % 5) + 1).click();
    await p.click('.previa [data-k="fch:testar"]'); await w(300);
    await p.click('.previa [data-k="fch:testar"]'); await w(300);
    jg = await tst();
    ok(!jg.estado.q && jg.estado.l === 2 && /de graça/.test(await p.locator('.previa .fch-msg').textContent()), 'dois testes errados de graça: a gazua aguenta');
    await p.click('.previa [data-k="fch:testar"]'); await w(300);
    jg = await tst();
    ok(jg.estado.q === 1, 'o terceiro quebra');
    await p.click('[data-k="pz:aptm:atrapalha"]'); await w(400);
    ok(/gazuas: 3 de 5/.test(await p.locator('.previa .fch-info').textContent()), 'a desvantagem (nível 3: 2) tira duas gazuas do começo: ' + await p.locator('.previa .fch-info').textContent());
    await p.fill('[data-k="pz:apt"]', ''); await p.press('[data-k="pz:apt"]', 'Tab'); await w(300);
    // ---------- as engrenagens ----------
    await p.click('[data-k="pz:niv:dificil"]'); await w(250);
    await p.click('[data-k="pz:est:engrenagens"]'); await w(400);
    ok(await p.locator('.previa .feg-svg').count() === 1 && await p.locator('.previa .feg-cilindro').count() === 2, 'as engrenagens: no Difícil, dois cilindros');
    sol = (await segredo()).sol;
    const clicarEixo = async (id, vezes, botao) => {
      const pt = await ev(([id]) => { const e = __escudo.HO.testes[Object.keys(__escudo.HO.testes)[0]].jogo.pub.jogo.eixos.find(x => x.id === id); const svg = document.querySelector('.previa .feg-svg'), m = svg.getScreenCTM(); return { x: m.a * e.x + m.e, y: m.d * e.y + m.f }; }, [id]);
      for (let k = 0; k < vezes; k++) { await p.mouse.click(pt.x, pt.y, botao ? { button: botao } : undefined); await w(60); }
    };
    // a primeira engrenagem do caminho no tamanho errado (se couber): girar → não abre
    const tams = (await tst()).pub.jogo.tam;
    for (const k of Object.keys(sol)) await clicarEixo(k, 1 + tams.indexOf(sol[k][0]));
    let pos = await ev(() => document.querySelectorAll('.previa .feg-livre').length);
    ok(pos === Object.keys(sol).length, 'clicar no eixo põe e troca a engrenagem (' + pos + ' postas)');
    const primeiro = Object.keys(sol)[0];
    await clicarEixo(primeiro, 1, 'right');
    await p.click('.previa [data-k="fch:testar"]'); await w(2200);
    jg = await tst();
    ok(jg.estado.q === 1 && /Não abriu\. /.test(await p.locator('.previa .fch-msg').textContent()), 'sem uma engrenagem, não abre (e no Difícil diz o porquê): ' + await p.locator('.previa .fch-msg').textContent());
    await clicarEixo(primeiro, 1 + tams.indexOf(sol[primeiro][0]));
    if (process.env.FOTOS) await p.locator('.previa .fch').screenshot({ path: process.env.FOTOS + '/fch-engrenagens.png' });
    await p.click('.previa [data-k="fch:testar"]'); await w(500);
    const girando = await ev(() => [...document.querySelectorAll('.previa .feg-svg g[transform]')].some(g => /rotate\((?!0\))/.test(g.getAttribute('transform'))));
    await w(1800);
    jg = await tst();
    ok(girando && !!jg.resolvido && await p.locator('.previa .fch.aberta').count() === 1, 'com a solução, a manivela gira tudo e abre');
    // o Absoluto: catraca, presa e eixo duplo na tela
    await p.click('[data-k="tst:recomecar"]').catch(() => {}); await w(200);
    await p.click('[data-k="pz:niv:absoluto"]'); await w(500);
    ok(await p.locator('.previa .feg-catraca').count() === 1 && await p.locator('.previa .feg-presa').count() >= 1 && await p.locator('.previa .feg-eixo.duplo').count() === 1 && await p.locator('.previa [data-k="feg:cam:1"]').count() === 1,
      'no Absoluto: a catraca, a enferrujada, o eixo duplo e o botão da camada de trás: ' + [await p.locator('.previa .feg-catraca').count(), await p.locator('.previa .feg-presa').count(), await p.locator('.previa .feg-eixo.duplo').count(), await p.locator('.previa [data-k="feg:cam:1"]').count()]);
    if (process.env.FOTOS) await p.locator('.previa .fch').screenshot({ path: process.env.FOTOS + '/fch-engr-absoluto.png' });
    // (ao vivo) o mestre vê o perfil que o jogador monta
    await ev(() => {
      const subs = [];
      window.TC.mesas = Object.assign({}, window.TC.mesas, { atual: { id: '00000000-0000-0000-0000-000000000001' } });
      window.TC.aoVivo = Object.assign({}, window.TC.aoVivo, { leve: { assinar(t, fn) { subs.push([t, fn]); return () => {}; }, pronto: () => true, enviar(t, m) { subs.filter(x => x[0] === t).forEach(x => x[1](JSON.parse(JSON.stringify(m)))); return true; } } });
      const E = window.TC.escudo, PUI = window.TC.pistasUI;
      const jg = E.jogoNovo('hvp', E.normHandout({ tipo: 'puzzle', nome: 'Porta', puzzle: { tipo: 'fechadura', seed: 3, nivel: 'facil', estilo: 'perfil' } }));
      const caixa = document.createElement('div'); caixa.id = 'vivo-pf';
      const a = document.createElement('div'); a.className = 'jog'; const b = document.createElement('div'); b.className = 'mes';
      a.append(...[].concat(PUI.puzzle(jg, { chave: 'jog:', jogar: () => Promise.resolve() })));
      b.append(...[].concat(PUI.puzzle(jg, { chave: 'vivo:', soVer: true })));
      caixa.append(a, b); document.body.prepend(caixa);
    });
    await w(300);
    await p.locator('#vivo-pf .jog .fpf-c').nth(0).click(); await w(500);
    ok(await p.locator('#vivo-pf .mes .fpf-c.cheio').count() === 5, 'ao vivo: o mestre vê o pino que o jogador pôs');
    ok(!erros.length, 'sem erros na página: ' + erros.join(' | '));
  } catch (e) { ok(false, 'falhou: ' + e.message); }
  await t.close(); end();
})();
