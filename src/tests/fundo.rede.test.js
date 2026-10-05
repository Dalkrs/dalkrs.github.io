// O programa das Cenas do mestre em segundo plano, numa mesa de verdade (projeto real).
// Quem aplica na cena o que os jogadores fazem, e quem acerta os tokens pelas fichas, é o programa das Cenas do
// mestre. Antes, ele só rodava depois de o mestre abrir a aba Cenas: recarregando a página em outra aba (Fichas),
// a cena ficava parada para todo mundo — a poção curava a ficha e a barra do token não acompanhava. E, ao abrir as
// Cenas depois, os tokens não eram acertados pelo que tinha mudado nas fichas nesse meio-tempo.
//   · com a mesa aberta, as Cenas do mestre abrem em segundo plano, em qualquer aba (só se a mesa já tem cenas);
//   · ao abrir a mesa, os tokens são acertados pelas fichas como estão agora;
//   · em segundo plano, a página não toma a transmissão de outro aparelho do mestre que esteja transmitindo.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const ficha = (nome, extra) => Object.assign({ nome, raca: 'Elfa da neve', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 5, fonte: 'total' }, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '' }, extra);
const selene = ficha('Selene', { recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '40' }], bolsa: [{ id: 'p1', t: 'pocao', nome: 'Poção de cura', rec: 'hp', val: '5' }] });
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const dM = await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } }), M = dM.page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'cenas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const cenasDe = async p => { let f = null; await ate(async () => { f = await quadro(p, /\/cenas\//); return f && await f.evaluate(() => !!window.__tc && !!__tc.Store.scene()); }, 30000); return f; };
  const fichasDe = async p => { let f = null; await ate(async () => { f = await quadro(p, /\/fichas\//); return f && await f.evaluate(() => typeof S !== 'undefined' && !!document.querySelector('#f_nome')); }, 30000); return f; };
  const hpFicha = p => p.evaluate(() => { const l = TC.dados.col('personagens').pegar('pc_selene'); return l && l.estado && l.estado.rec ? l.estado.rec.hp : null; });
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const docs = p => p.evaluate(() => TC.dados.col('documentos').todas().filter(d => !d.apagado).map(d => d.id).sort());
  const escondida = (p, id) => p.evaluate(id => { const f = document.getElementById('f-' + id); return f ? f.hidden : null; }, id);
  const usarNaFicha = async p => {
    const F = await fichasDe(p);
    const b = F.locator('#ficha [data-boluse="p1"]'); await b.scrollIntoViewIfNeeded(); await b.click(); await p.waitForTimeout(300);
    const sim = F.locator('#ficha [data-bolsim="p1"]'); if (await sim.count()) { await sim.click(); await p.waitForTimeout(300); }
  };

  // ---------- mesa nova, sem cenas: nada abre sozinho, nada é criado ----------
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Fundo E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  await w(7000);
  ok(await M.evaluate(() => location.hash) === '#/fichas' && !M.frame({ url: /\/cenas\// }) && !(await docs(M)).some(id => id.startsWith('cena')), 'numa mesa que ainda não tem cenas, as Cenas não abrem sozinhas e nenhuma cena é criada: ' + JSON.stringify(await docs(M)));

  // ---------- o mestre monta a cena; o jogador entra ----------
  await M.locator('#tab-cenas').click();
  let C = await cenasDe(M);
  ok(await ate(async () => await C.evaluate(() => __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on())), 'o mestre abre as Cenas da mesa');
  const codigo = await codigoDaMesa(M);
  await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  const jogId = await J.evaluate(() => TC.conta.usuario.id);
  await M.evaluate(([f, uid]) => { TC.dados.col('personagens').gravar('pc_selene', { nome: 'Selene', ficha: f, skills: { arvores: [], pontos: {}, alocados: {} }, estado: { rec: { hp: 10 }, qtd: { p1: 30 } }, dono_id: uid, vis: 'mestre', ordem: 0 }); }, [selene, jogId]);
  ok(await ate(() => parado(M)) && await ate(async () => await C.evaluate(id => !!__tc.Fichas.get('pc_selene') && __tc.Store.S.players.some(p => p.id === id), jogId)), 'a ficha da jogadora sobe para a mesa, e as Cenas do mestre veem a jogadora');
  const ids = await C.evaluate(() => { const u = __tc, sc = u.Store.scene(); const a = u.newToken(sc, sc.cell * 3, sc.cell * 3, { name: 'Boneco' }); u.Store.tx('Criar', () => u.Store.add('tokens', a)); u.Fichas.link(u.Store.get('tokens', a.id), 'pc_selene'); return { tok: a.id, cena: sc.id }; });
  ok(await C.evaluate(([id, dono]) => __tc.Store.get('tokens', id).owner === dono, [ids.tok, jogId]), 'o token ligado à ficha dela passa a ser dela');
  const barra = f => f.evaluate(([cena, id]) => { const sc = __tc.Store.S.scenes[cena] || __tc.Store.scene(), tk = sc && sc.tokens.find(k => k.id === id); return tk ? tk.bars[0].v : null; }, [ids.cena, ids.tok]);
  const xDe = f => f.evaluate(([cena, id]) => { const sc = __tc.Store.S.scenes[cena] || __tc.Store.scene(), tk = sc && sc.tokens.find(k => k.id === id); return tk ? tk.x : null; }, [ids.cena, ids.tok]);
  await C.locator('#airBtn').click(); await w(250);
  await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(300);
  let B = null;
  ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !!__tc.Store.get('tokens', id), ids.tok); }, 40000) && await barra(B) === 10, 'a jogadora vê a cena no ar, com o token dela em 10 de HP');
  ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok')), '(tudo salvo)');

  // ---------- o mestre recarrega a página estando nas Fichas ----------
  await M.locator('#tab-fichas').click(); await w(600);
  await M.reload({ waitUntil: 'load' });
  ok(await ate(async () => { C = await quadro(M, /\/cenas\//, 4); return !!C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on()); }, 30000) && await M.evaluate(() => location.hash) === '#/fichas' && await escondida(M, 'cenas') === true && await escondida(M, 'fichas') === false,
    'recarregando nas Fichas, as Cenas do mestre abrem sozinhas em segundo plano (escondidas; a aba continua sendo Fichas)');
  ok(await ate(async () => await C.evaluate(() => __tc.Nuvem.transmito()), 8000), 'e passam a transmitir a cena no ar (quem transmitia era esta mesma página, antes de recarregar)');
  await J.locator('#tab-fichas').click(); await w(700, J);
  await usarNaFicha(J);
  ok(await ate(async () => (await hpFicha(M)) === 15) && await ate(async () => (await barra(C)) === 15) && await ate(async () => (await barra(B)) === 15), 'a jogadora usa uma poção pela ficha: a ficha vai a 15, e a barra do token acompanha — no mapa do mestre (em segundo plano) e na cena que ela vê');
  ok(await M.frames().length === 3 && J.frames().filter(f => /\/cenas\//.test(f.url())).length === 1 && (await J.evaluate(() => document.querySelectorAll('iframe').length)) === 2, '(o jogador só tem as abas que ele mesmo abriu: nada em segundo plano para ele)');
  // o que a jogadora faz NA CENA também anda: mover o token é um pedido, e quem aplica é o programa do mestre
  await J.locator('#tab-cenas').click(); await w(700, J);
  B = await quadro(J, /\/cenas\//);
  const x1 = await B.evaluate(id => { const u = __tc, k = u.Store.get('tokens', id); u.Store.tx('Mover', () => u.Store.upd('tokens', id, { x: k.x + 64 })); return u.Store.get('tokens', id).x; }, ids.tok);
  ok(await ate(async () => (await xDe(C)) === x1 && await B.evaluate(() => __tc.Nuvem.pendentes() === 0), 30000), 'a jogadora move o token dela: o mestre (nas Fichas) aplica o pedido, e a fila dela esvazia');
  await usarNaFicha(M);
  ok(await ate(async () => (await hpFicha(J)) === 20) && await ate(async () => (await barra(B)) === 20), 'o mestre usa uma poção pela ficha: a jogadora vê a barra do token ir a 20');
  // ao vir para as Cenas, a página se ajeita: o painel aberto (tela larga), o mapa enquadrado
  await M.locator('#tab-cenas').click(); await w(1200);
  const vista = await C.evaluate(() => ({ lado: __tc.App.sideOpen, z: __tc.App.view.z, larg: innerWidth, painel: !document.querySelector('#side').hidden }));
  ok(await escondida(M, 'cenas') === false && vista.lado === true && vista.painel && vista.z > 0.1 && vista.larg > 900, 'o mestre vem para as Cenas: o mapa aparece enquadrado e com o painel aberto, como se tivesse sido aberto agora: ' + JSON.stringify(vista));
  ok(await barra(C) === 20 && await C.evaluate(() => __tc.Nuvem.transmito()), 'e continua transmitindo, com o token em 20');

  // ---------- mudou na ficha com o mestre fora: ao abrir a mesa, o token é acertado ----------
  ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok')), '(tudo salvo antes de o mestre sair)');
  await M.goto(t.base + 'src/tests/vazio.html', { waitUntil: 'load' });
  await J.locator('#tab-fichas').click(); await w(700, J);
  await usarNaFicha(J);
  ok(await ate(async () => (await hpFicha(J)) === 25 && await parado(J)), 'com o mestre fora do site, a jogadora usa outra poção: a ficha vai a 25');
  await w(4000, J);
  ok(await barra(B) === 20, 'sem o mestre, a barra do token espera (20): quem a acerta é o programa dele');
  await M.goto(t.base + '?debug#/cenas', { waitUntil: 'load' });
  C = await cenasDe(M);
  ok(await ate(async () => (await barra(C)) === 25, 20000) && await ate(async () => (await barra(B)) === 25, 20000), 'o mestre abre a mesa (direto nas Cenas): o token é acertado pela ficha como está agora (25), para ele e para a jogadora');

  // ---------- outro aparelho do mestre, aberto nas Fichas: não toma a transmissão ----------
  const M2 = (await t.device({ name: 'mestre-2', seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  await M2.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, M2);
  await loginTela(M2, c.mestre, c.senha);
  await M2.locator('#m-lista button', { hasText: nomeMesa }).click();
  await M2.locator('#vivo').waitFor({ state: 'visible', timeout: 20000 });
  let C2 = null;
  ok(await ate(async () => { C2 = await quadro(M2, /\/cenas\//, 4); return !!C2 && await C2.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && !!__tc.Store.S.scenes[id] && __tc.Fichas.on(), ids.cena); }, 40000) && await escondida(M2, 'cenas') === true, 'num segundo aparelho, aberto nas Fichas, as Cenas também abrem em segundo plano');
  await w(5000, M2);
  ok(await C.evaluate(() => __tc.Nuvem.transmito()) && await C2.evaluate(() => !__tc.Nuvem.transmito()), 'mas esse aparelho só acompanha: quem transmite continua sendo o primeiro, onde o mestre está com a cena aberta');
  await usarNaFicha(J);
  ok(await ate(async () => (await barra(C)) === 30 && (await barra(B)) === 30) && await ate(async () => (await barra(C2)) === 30, 25000), 'a poção seguinte acerta o token pelo primeiro aparelho, e o segundo recebe a cena já acertada (30)');
  ok(await C.evaluate(() => __tc.Nuvem.transmito()) && await C2.evaluate(() => !__tc.Nuvem.transmito()), '(e a transmissão não trocou de mãos por causa disso)');
  await M2.locator('#tab-cenas').click();
  ok(await ate(async () => await C2.evaluate(() => __tc.Nuvem.transmito()) && await C.evaluate(() => !__tc.Nuvem.transmito()), 20000), 'o mestre vem para as Cenas no segundo aparelho: é ele que passa a transmitir (é onde o mestre está agora)');
  await M2.close();

  // ---------- limpeza ----------
  await M.locator('#tab-cenas').click().catch(() => {});
  await apagarMesaTela(M, nomeMesa);
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
