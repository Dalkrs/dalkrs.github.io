// Bateria do lote 141 (as Cenas): os andares nos geradores de prédio — o "Gerar o interior" e a Furtividade fazem até
// 5 andares em cima e até 2 de porão; a base secreta no porão (1 porão: ele se divide, atrás de uma parede secreta; 2:
// o 2º porão é a base, com o alçapão escondido no 1º); o mestre escolhe o tema e as salas (chips) de cada andar.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const j = x => JSON.stringify(x);
(async () => {
  const t = await open({ w: 1440, h: 900 });
  const { page } = t, ev = (fn, a) => page.evaluate(fn, a), w = ms => page.waitForTimeout(ms || 200);
  const BASE_I = ['reuniao', 'arsenal', 'dormitorio', 'laboratorio', 'cofre', 'cela', 'tunel'];

  // ---- o interior: as contas ----
  const r = await ev(BASE_I => {
    const I = __tc.Interior, o = {};
    const todos = p => [p].concat(p.andares || []);
    // as escadas casam: cada uma tem a de volta no mesmo lugar, no outro andar
    const casam = p => { const T = todos(p); return T.every(q => (q.escadas || []).every(e => { const d = T.find(x => x.nivel === e.para); return d && d.escadas.some(f => f.x === e.x && f.y === e.y && f.para === q.nivel); })); };
    const p1 = I.gerar({ tipo: 'casa', w: 6, h: 5, seed: 3, estilo: 'comum', andares: { cima: 5, porao: 2, base: true } });
    o.niveis = todos(p1).map(q => q.nivel).sort((a, b) => a - b);
    o.casam = casam(p1);
    o.mesmas = todos(p1).every(q => q.W === p1.W && q.H === p1.H);
    const b2 = p1.andares.find(q => q.nivel === -2), p1m = p1.andares.find(q => q.nivel === -1);
    o.base2 = b2.salas.map(q => q.papel);
    o.oculto = p1m.escadas.filter(e => e.oculto).map(e => e.para);
    o.portas = todos(p1).filter(q => q.porta).map(q => q.nivel);
    o.janelasPorao = p1m.janelas.length + b2.janelas.length;
    o.livres = todos(p1).every(q => (q.escadas || []).every(e => q.salas.every(s => s.moveis.every(m => !(e.x >= m.x && e.x < m.x + (m.fw || m.s) && e.y >= m.y && e.y < m.y + (m.fh || m.s))))));
    // 1 porão com a base: ele se divide (a parede secreta) e a base fica do outro lado
    const p2 = I.gerar({ tipo: 'senhor', w: 8, h: 7, seed: 5, estilo: 'comum', andares: { cima: 0, porao: 1, base: true } });
    const pm = p2.andares[0];
    o.div = { secretas: pm.paredes.filter(x => x.secreta).length, base: pm.salas.filter(q => q.base).map(q => q.papel), comum: pm.salas.filter(q => !q.base).map(q => q.papel), casam: casam(p2) };
    // as salas escolhidas: o tema e a lista do mestre
    const p3 = I.gerar({ tipo: 'casa', w: 8, h: 7, seed: 9, estilo: 'comum', andares: { cima: 2, porao: 1, temas: { 1: 'trabalho' }, salas: { 2: ['biblioteca', 'galeria'], '-1': ['cela', 'adega'] } } });
    o.lista = p3.andares.map(q => [q.nivel, q.salas.map(s => s.papel)]);
    // sem andares: igual ao de antes
    const p4 = I.gerar({ tipo: 'casa', w: 6, h: 5, seed: 3, estilo: 'comum' }), p5 = I.gerar({ tipo: 'casa', w: 6, h: 5, seed: 3, estilo: 'comum', andares: { cima: 0, porao: 0 } });
    o.igual = j0(p4) === j0(p5) && !p4.andares;
    function j0(x) { return JSON.stringify(x); }
    return o;
  }, BASE_I);
  ok(j(r.niveis) === j([-2, -1, 0, 1, 2, 3, 4, 5]) && r.mesmas, 'a casa com 5 andares e 2 porões: 8 plantas do mesmo tamanho — ' + j(r.niveis));
  ok(r.casam && r.livres, 'as escadas casam (a de volta fica no mesmo lugar do outro andar) e nenhum móvel cai em cima delas');
  ok(r.base2.length && r.base2.every(x => BASE_I.includes(x)) && j(r.oculto) === j([-2]), 'com 2 porões e a base: o 2º porão é a base, e a descida para ela é um alçapão escondido — ' + j(r.base2));
  ok(j(r.portas) === j([0]) && r.janelasPorao === 0, 'só o térreo tem porta para a rua; o porão não tem janelas');
  ok(r.div.secretas === 1 && r.div.base.length >= 1 && r.div.base.every(x => BASE_I.includes(x)) && r.div.comum.length >= 1 && r.div.casam, 'com 1 porão e a base: ele se divide, com a parede secreta — ' + j(r.div));
  const l1 = r.lista.find(x => x[0] === 1)[1], l2 = r.lista.find(x => x[0] === 2)[1], lp = r.lista.find(x => x[0] === -1)[1];
  ok(l1[0] === 'escritorio' && l2[0] === 'biblioteca' && l2.includes('galeria') && lp[0] === 'cela' && lp.includes('adega'), 'o tema (Trabalho) e as listas do mestre viram as salas — ' + j(r.lista));
  ok(r.igual, 'sem andares, a planta sai igual à de antes');

  // ---- o interior: a janela e as cenas ----
  const ids = await ev(() => { const u = __tc, sc = u.newScene('Mapa'); u.Store.addScene(sc); u.Persist.scene(sc.id); u.UI.switchScene(sc.id); const tk = u.Props.novo(u.Store.scene(), 'entrada', 6 * 64, 6 * 64, 1, false); u.Store.tx('x', () => u.Store.add('tokens', tk)); u.Interior.abrir(u.Store.get('tokens', tk.id)); return { cena: sc.id, tk: tk.id }; });
  await w(500);
  ok(await page.locator('#int-and-sec').count() === 1 && await page.locator('#int-cima').count() === 1, 'a janela do interior tem "Andares e porão"');
  await page.locator('#int-and-sec > summary').click(); await w(150);
  await page.locator('#int-cima button', { hasText: /^2$/ }).click(); await w(250);
  await page.locator('#int-porao button', { hasText: '2 andares' }).click(); await w(250);
  await page.locator('.sw', { has: page.locator('#int-base') }).click(); await w(250);
  ok(await page.locator('#int-l-c2').count() === 1 && await page.locator('#int-l-c1').count() === 1 && await page.locator('#int-l-p1').count() === 1 && await page.locator('#int-l-base').count() === 1 && await page.locator('#int-l-p2').count() === 0, 'cada andar ganha uma linha; o 2º porão vira a "Base secreta"');
  await page.locator('#int-tema-c1').selectOption('trabalho'); await w(250);
  ok(/Escritório/.test(await page.locator('#int-l-c1').innerText()), 'o tema preenche as salas do andar');
  const antes = await page.locator('#int-l-base .and-chip').count();
  await page.locator('#int-l-base .and-x').first().click(); await w(250);
  await page.locator('#int-mais-c1').selectOption('banheiro'); await w(250);
  ok(await page.locator('#int-l-base .and-chip').count() === antes - 1 && /Banheiro/.test(await page.locator('#int-l-c1').innerText()), 'o × tira uma sala; o "+ sala" põe');
  ok(/térreo \+ 2 andares em cima, 2 porões \(com a base secreta\) \(5 cenas/.test(await page.locator('#ger-resumo').innerText()), 'o resumo diz os andares — ' + await page.locator('#ger-resumo').innerText());
  await page.locator('#int-ver button', { hasText: '2º porão' }).click(); await w(250);
  ok(await page.locator('#int-ver .seg-b.on').innerText() === '2º porão', 'a prévia mostra um andar de cada vez');
  await page.locator('.modal .btn.primary').click(); await w(1500);
  const c = await ev(([cena, tk]) => {
    const u = __tc, S = u.Store.S, sc = u.Store.scene(), fam = Object.keys(S.scenes).filter(id => S.pastas.mae[id] === cena).map(id => S.scenes[id]);
    const porNivel = {}; for (const x of fam) porNivel[x.nivel] = x;
    const esc = fam.flatMap(x => x.tokens.filter(t => t.cena && (t.prop === 'escada' || t.prop === 'alcapao')).map(t => ({ de: x.nivel, para: S.scenes[t.cena] && S.scenes[t.cena].nivel, hid: !!t.hidden, prop: t.prop })));
    const secreta = fam.some(x => x.walls.some(wl => wl.secret));
    const saida = fam.filter(x => x.tokens.some(t => t.prop === 'saida')).map(x => x.nivel);
    return { nivelAtual: sc.nivel, n: fam.length, niveis: fam.map(x => x.nivel).sort((a, b) => a - b), esc, secreta, saida, ligado: S.scenes[cena].tokens.find(t => t.id === tk).cena === sc.id, nomes: fam.map(x => x.name) };
  }, [ids.cena, ids.tk]);
  ok(c.n === 5 && j(c.niveis) === j([-2, -1, 0, 1, 2]) && c.nivelAtual === 0 && c.ligado, 'saem 5 cenas (uma por andar), dentro do mapa; a Entrada leva ao térreo — ' + j(c.nomes));
  ok(c.esc.length === 8 && c.esc.every(e => Math.abs(e.para - e.de) === 1) && c.esc.filter(e => e.hid).length === 1 && c.esc.find(e => e.hid).prop === 'alcapao' && c.esc.find(e => e.hid).para === -2, 'as escadas levam ao andar vizinho; a da base é um alçapão escondido — ' + j(c.esc));
  ok(j(c.saida) === j([0]), 'a Saída só no térreo');
  // 1 porão com a base: a parede secreta vira uma porta secreta na cena
  const d = await ev(async () => { const u = __tc, I = u.Interior, p = I.gerar({ tipo: 'casa', w: 8, h: 7, seed: 4, estilo: 'comum', andares: { porao: 1, base: true } }); const sc = await I.criar(p, 'Teste', null, {}); const S = u.Store.S, por = Object.values(S.scenes).find(x => x.nivel === -1 && x.name.startsWith('Teste')); return { sec: por.walls.filter(wl => wl.secret && wl.k === 'door').length, base: por.tokens.filter(t => ['mesaGuerra', 'alambique', 'cofre', 'tunel', 'grilhoes', 'armas', 'cama', 'estante'].includes(t.prop)).length, prim: sc.nivel }; });
  ok(d.sec === 1 && d.base >= 1 && d.prim === 0, 'com 1 porão, a base fica atrás de uma porta secreta (só o mestre vê) — ' + j(d));

  // ---- a Furtividade ----
  const f = await ev(async () => {
    const u = __tc, F = u.Furtividade, L = F.LUGARES.mansao, S = u.Store.S, antes = new Set(S.order), o = {};
    const p = L.gerar({ tamanho: 'medio', guardas: 'normal', alvo: 'sorteio', and: { cima: 5, porao: 2, base: true } }, { seed: 21, estilo: 'comum' });
    o.planos = [p].concat(p.andares).map(q => q.nivel || 0).sort((a, b) => a - b);
    const sc = await L.criar(p, 'Mansão teste', { hora: 'dia' });
    const novas = S.order.filter(x => !antes.has(x)).map(x => S.scenes[x]);
    o.niveis = novas.map(x => x.nivel).sort((a, b) => a - b);
    o.alinhadas = novas.every(x => x.cols === sc.cols && x.rows === sc.rows);
    const base = novas.find(x => x.nivel === -2), p1 = novas.find(x => x.nivel === -1);
    o.alc = p1.tokens.filter(t => t.prop === 'alcapao' && t.cena === base.id).map(t => t.hidden);
    o.baseSalas = (p.andares.find(q => q.nivel === -2).salas || []).map(q => q.papel);
    o.esc = novas.every(x => x.tokens.filter(t => t.cena && (t.prop === 'escada' || t.prop === 'alcapao')).every(t => { const d = S.scenes[t.cena]; return d && Math.abs(d.nivel - x.nivel) === 1 && d.tokens.some(b => b.cena === x.id && b.x === t.x && b.y === t.y); }));
    // 1 porão com a base: a parede secreta, sem parede dobrada na linha
    const q = F.gerar('guilda', { tamanho: 'medio', seed: 8, and: { porao: 1, base: true } }), pm = q.andares.find(x => x.nivel === -1);
    const sec = pm.paredes.filter(x => x.secret);
    o.div = { sec: sec.length, linha: sec.length ? pm.paredes.filter(x => x.x1 === sec[0].x1 && x.x2 === sec[0].x1).length : 0, base: pm.salas.filter(s => ['reuniao', 'arsenal', 'dormitorio', 'laboratorio', 'cofreForte', 'cela', 'tunel'].includes(s.papel)).length, marca: pm.marcas.some(m => /Passagem secreta/.test(m.n)) };
    // as salas do mestre na Furtividade
    const r2 = F.gerar('mansao', { tamanho: 'medio', seed: 8, and: { cima: 1, salas: { 1: ['biblioteca', 'galeria', 'banheiro'] } } });
    o.lista = r2.andares[0].salas.map(s => s.papel);
    // o de antes (cima/porao) ainda vale
    const v = F.gerar('mansao', { tamanho: 'medio', seed: 8, cima: 2, porao: true });
    o.velho = [v].concat(v.andares).map(x => x.nivel || 0).sort((a, b) => a - b);
    return o;
  });
  ok(j(f.planos) === j([-2, -1, 0, 1, 2, 3, 4, 5]) && j(f.niveis) === j(f.planos) && f.alinhadas, 'a mansão com 5 andares e 2 porões: 8 cenas alinhadas — ' + j(f.niveis));
  ok(j(f.alc) === j([true]) && f.baseSalas.includes('reuniao') && f.esc, 'o alçapão para a base fica escondido; as escadas casam — ' + j(f.baseSalas));
  ok(f.div.sec === 1 && f.div.base >= 1 && f.div.marca, 'com 1 porão, a base fica atrás da parede secreta (com a marca para o mestre) — ' + j(f.div));
  ok(['biblioteca', 'galeria', 'banheiro'].every(x => f.lista.includes(x)), 'as salas do mestre valem na Furtividade — ' + j(f.lista));
  ok(j(f.velho) === j([-1, 0, 1, 2]), 'a escolha de antes (2 andares e porão) continua valendo');
  // a janela da Furtividade
  await ev(async () => { __tc.Gerador.abrir('mansao'); await new Promise(r2 => setTimeout(r2, 500)); });
  await page.locator('#fur-cima button', { hasText: /^4$/ }).click(); await w(400);
  ok(await page.locator('#fur-l-c4').count() === 1 && await page.locator('#fur-tema-c4').inputValue() === 'sotao' && await page.locator('#fur-tema-c1').inputValue() === 'nobres', 'na Furtividade, os 4 andares com os temas de sempre (o último é o sótão)');
  await page.locator('#fur-porao button', { hasText: '1 andar' }).click(); await w(400);
  await page.locator('.sw', { has: page.locator('#fur-base') }).click(); await w(400);
  ok(await page.locator('#fur-l-p1').count() === 1 && await page.locator('#fur-l-base').count() === 1 && /cenas ligadas pelas escadas/.test(await page.locator('.modal').innerText()), 'com a base e 1 porão: a parte comum e a base, cada uma com as suas salas');
  await page.keyboard.press('Escape'); await w(200);
  const errs = t.errs.filter(e => !/favicon/.test(e));
  ok(!errs.length, 'sem erros no console: ' + errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
