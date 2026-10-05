// Barras negativas, barra que começa pela metade e as bolsas do personagem, numa mesa de verdade (projeto real):
// a ficha manda no token (piso e começo), o dano passa de zero, a cura total respeita o começo, e as poções e os
// itens das bolsas são usados na cena — pelo mestre e pelo jogador dono — avisando a mesa ao vivo.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const ficha = (nome, extra) => Object.assign({ nome, raca: 'Elfa da neve', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 5, fonte: 'total' }, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '' }, extra);
const selene = ficha('Selene', {
  recursos: [{ id: 'hp', nome: 'HP', fml: '100', piso: '10' }, { id: 'sp', nome: 'SP', fml: '40' }, { id: 'gelo', nome: 'Gelo de Selene', fml: '20', comeca: '4' }],
  bolsa: [{ id: 'p1', t: 'pocao', nome: 'Poção de cura', rec: 'hp', val: '30' }, { id: 'p2', t: 'pocao', nome: 'Elixir amargo', rec: 'hp', val: '-2d6', bk: 'FOR', bv: 4, bd: '3 turnos' }, { id: 'b1', t: 'bomba', nome: 'Bomba de fumaça', nota: 'Cega quem está na área por 1 turno.' }],
});
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  // (o mestre começa em outra aba: as Cenas só abrem já dentro da mesa, sem cenas guardadas neste navegador para oferecer)
  const M = (await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'cenas' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const cenasDe = async p => { let f = null; await ate(async () => { f = await quadro(p, /\/cenas\//); return f && await f.evaluate(() => !!window.__tc && !!__tc.Store.scene()); }); return f; };
  const estado = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id || 'pc_selene'); return l ? l.estado : null; }, id);
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const j = JSON.stringify;

  // ---------- a mesa, o jogador e a ficha dele ----------
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Bolsa E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  await M.locator('#tab-cenas').click();
  const C = await cenasDe(M);
  ok(await ate(async () => await C.evaluate(() => __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on())), 'o mestre abre as Cenas da mesa, com a ligação às fichas');
  const codigo = await codigoDaMesa(M);
  await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  const jogId = await J.evaluate(() => TC.conta.usuario.id);
  await M.evaluate(([f, uid]) => {
    const P = TC.dados.col('personagens'), sk = { arvores: [], pontos: {}, alocados: {} };
    P.gravar('pc_selene', { nome: 'Selene', ficha: f, skills: sk, estado: { rec: { hp: 5 }, qtd: { p1: 2, p2: 1, b1: 3 } }, dono_id: uid, vis: 'mestre', ordem: 0 });
    P.gravar('pc_ogro', { nome: 'Ogro', ficha: Object.assign({}, f, { nome: 'Ogro', bolsa: [{ id: 'x1', t: 'pocao', nome: 'Poção do ogro', rec: 'hp', val: '5' }] }), skills: sk, estado: { qtd: { x1: 1 } }, dono_id: null, vis: 'mesa', ordem: 1 });
  }, [selene, jogId]);
  ok(await ate(() => parado(M)), 'as duas fichas sobem para a mesa (a da jogadora e a de um NPC à mostra)');
  ok(await ate(async () => await C.evaluate(id => __tc.Store.S.players.some(p => p.id === id) && !!__tc.Fichas.get('pc_selene') && !!__tc.Fichas.get('pc_ogro'), jogId)), 'as Cenas do mestre veem o jogador e as fichas');

  // ---------- o token ligado leva da ficha o piso e o começo ----------
  const ids = await C.evaluate(() => {
    const u = __tc, sc = u.Store.scene();
    const a = u.newToken(sc, sc.cell * 3, sc.cell * 3, { name: 'Boneco' }), b = u.newToken(sc, sc.cell * 6, sc.cell * 3, { name: 'Outro' });
    u.Store.tx('Criar tokens', () => { u.Store.add('tokens', a); u.Store.add('tokens', b); });
    u.Fichas.link(u.Store.get('tokens', a.id), 'pc_selene'); u.Fichas.link(u.Store.get('tokens', b.id), 'pc_ogro');
    return { sel: a.id, ogro: b.id, cena: sc.id };
  });
  const barras = (f, id) => f.evaluate(id => __tc.Store.get('tokens', id).bars.map(b => ({ n: b.n, v: b.v, m: b.m, lo: b.lo || 0, st: b.st == null ? null : b.st })), id || ids.sel);
  const b0 = await barras(C);
  ok(j(b0) === j([{ n: 'HP', v: 5, m: 100, lo: 10, st: null }, { n: 'SP', v: 40, m: 40, lo: 0, st: null }, { n: 'Gelo de Selene', v: 4, m: 20, lo: 0, st: 4 }]), 'ligado: HP com piso 10 (da ficha), SP comum, e o Gelo de Selene começando em 4 de 20 — ' + j(b0));
  ok(await C.evaluate(([id, dono]) => { const tk = __tc.Store.get('tokens', id); return tk.name === 'Selene' && tk.owner === dono; }, [ids.sel, jogId]), 'o token passa a ser da jogadora dona da ficha');
  const bar = (i, txt, f, id) => (f || C).evaluate(([id, i, txt]) => { const u = __tc; return u.Act.barSet(u.Store.get('tokens', id), i, txt); }, [id || ids.sel, i, txt]);
  await bar(0, '-12');
  ok((await barras(C))[0].v === -7 && await ate(async () => (await estado(M)).rec.hp === -7 && await parado(M)), 'dano de 12 com 5 de HP: a barra do token vai a −7 e a ficha também');
  await C.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ids.sel); await w(400);
  ok(await C.locator('#hud-b0').evaluate(e => e.classList.contains('neg') && e.value === '-7') && await C.locator('#tk-b0-v').evaluate(e => e.classList.contains('neg')), 'na faixa e no painel, o valor negativo aparece em destaque');
  await foto(M, 'bolsa-1-barra-negativa');
  await bar(0, '-90');
  ok((await barras(C))[0].v === -10 && await ate(async () => (await estado(M)).rec.hp === -10), 'e não passa do piso (−10), no token e na ficha');
  await bar(2, '13');
  const curados = await C.evaluate(id => __tc.Act.fullHeal([__tc.Store.get('tokens', id)]), ids.sel);
  const b1 = await barras(C);
  ok(curados === 1 && b1[0].v === 100 && b1[2].v === 4, 'cura total: o HP negativo enche e o Gelo de Selene volta ao começo (13 → 4) — ' + j(b1.map(b => b.v)));
  ok(await ate(async () => { const e = await estado(M); return e.rec.hp === 100 && e.rec.gelo === 4 && await parado(M); }), 'e a ficha acompanha');
  // a ficha muda as opções da barra: o token acompanha
  await M.evaluate(() => { const P = TC.dados.col('personagens'), f = JSON.parse(JSON.stringify(P.pegar('pc_selene').ficha)); f.recursos[0].piso = '25'; f.recursos[2].comeca = 'MAX/2'; P.gravar('pc_selene', { ficha: f }); });
  ok(await ate(async () => { const b = await barras(C); return b[0].lo === 25 && b[2].st === 10; }), 'mudar na ficha o piso (25) e o começo (MAX/2 = 10) muda a barra do token');
  await M.evaluate(() => { const P = TC.dados.col('personagens'), f = JSON.parse(JSON.stringify(P.pegar('pc_selene').ficha)); f.recursos[0].piso = '10'; f.recursos[2].comeca = '4'; P.gravar('pc_selene', { ficha: f }); });
  ok(await ate(async () => { const b = await barras(C); return b[0].lo === 10 && b[2].st === 4 && await parado(M); }), '(de volta: piso 10, começo 4)');

  // ---------- a bolsa, pelo mestre ----------
  await bar(0, '20'); await ate(async () => (await estado(M)).rec.hp === 20);
  await C.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); }, ids.sel); await w(400);
  ok(await C.locator('#hud-bolsa').isVisible(), 'o token ligado a uma ficha com itens ganha o botão da bolsa na faixa');
  if (!(await C.locator('#tk-bolsa').isVisible())) { await C.locator('#s-ficha > summary').click(); await w(200); }
  ok(/Na bolsa: 3 poções · 3 bombas\./.test(await C.locator('#s-ficha').innerText()), 'o painel do token resume a bolsa: ' + ((await C.locator('#s-ficha').innerText()).match(/Na bolsa:[^\n]*/) || [''])[0]);
  await C.locator('#hud-bolsa').click(); await w(300);
  const linhas = () => C.locator('.bag .bag-r').evaluateAll(els => els.map(e => e.querySelector('.bag-n').textContent + ' ' + e.querySelector('.bag-q').textContent));
  ok(j(await linhas()) === j(['Poção de cura ×2', 'Elixir amargo ×1', 'Bomba de fumaça ×3']), 'a janela da bolsa lista os itens da ficha com as quantidades: ' + j(await linhas()));
  await foto(M, 'bolsa-2-janela');
  const feed = (p, txt) => p.locator('#feed .rol', { hasText: txt });
  // poção de valor fixo: mostra antes, aplica, avisa, e dá para desfazer
  await C.locator('#bag-u-p1').click(); await w(250);
  const previa = await C.locator('.bag-c').innerText();
  ok(/Usar Poção de cura\?/.test(previa) && /HP 20 → 50 \(\+30\)/.test(previa) && /sobra 1/.test(previa) && (await estado(M)).qtd.p1 === 2, 'a poção mostra antes o que vai acontecer, sem gastar nada ainda: ' + previa.replace(/\n/g, ' | '));
  await foto(M, 'bolsa-3-previa');
  await C.locator('#bag-no').click(); await w(200);
  ok(await C.locator('.bag-c').count() === 0 && (await estado(M)).qtd.p1 === 2, 'Cancelar fecha a prévia e nada muda');
  await C.locator('#bag-u-p1').click(); await w(200); await C.locator('#bag-ok-p1').click(); await w(400);
  ok(await ate(async () => { const e = await estado(M); return e.rec.hp === 50 && e.qtd.p1 === 1 && await parado(M); }), '"Usar agora": +30 de HP na ficha e uma poção a menos');
  ok((await barras(C))[0].v === 50 && j(await linhas()) === j(['Poção de cura ×1', 'Elixir amargo ×1', 'Bomba de fumaça ×3']), 'a barra do token e a janela acompanham na hora');
  ok(await ate(async () => (await feed(M, 'Selene · Poção de cura').count()) === 1), 'a mesa ao vivo recebe o aviso do uso');
  const carta = await feed(M, 'Selene · Poção de cura').first().innerText();
  ok(/usou Poção de cura/.test(carta) && /HP 20 → 50 \(\+30\)/.test(carta) && /resta 1/.test(carta) && (await feed(M, 'Selene · Poção de cura').first().locator('.or').innerText()) === 'Cenas', 'com o que aconteceu e a origem "Cenas": ' + carta.replace(/\n/g, ' | '));
  ok(/Poção de cura: HP 20 → 50/.test(await C.locator('.toast').last().innerText()), 'e um aviso na cena, com Desfazer');
  await C.locator('.toast .toast-a', { hasText: 'Desfazer' }).last().click(); await w(400);
  ok(await ate(async () => { const e = await estado(M); return e.rec.hp === 20 && e.qtd.p1 === 2 && await parado(M); }), 'Desfazer devolve a poção e o HP');
  ok((await barras(C))[0].v === 20 && await ate(async () => (await feed(M, 'desfeito: Poção de cura voltou para a bolsa').count()) === 1), 'no token também, e a mesa fica sabendo que foi desfeito');
  // bomba: um clique gasta e avisa; nada é aplicado
  await C.locator('#bag-u-b1').click(); await w(400);
  ok(await C.locator('.bag-c').count() === 0 && await ate(async () => { const e = await estado(M); return e.qtd.b1 === 2 && e.rec.hp === 20; }), 'a bomba não pede confirmação: um clique gasta uma (e nada mais muda)');
  ok(await ate(async () => (await feed(M, 'Selene · Bomba de fumaça').count()) === 1) && /usou Bomba de fumaça · restam 2/.test(await feed(M, 'Selene · Bomba de fumaça').first().innerText()), 'e avisa a mesa: ' + (await feed(M, 'Selene · Bomba de fumaça').first().innerText()).replace(/\n/g, ' | '));
  // poção com rolagem e bônus temporário
  const forAntes = await C.evaluate(id => __tc.Fichas.rolaveis(__tc.Store.get('tokens', id)).find(x => x[0] === 'FOR')[2], ids.sel);
  await C.locator('#bag-u-p2').click(); await w(250);
  const previa2 = await C.locator('.bag-c').innerText();
  ok(/HP 20 − 2d6, rolado na hora/.test(previa2) && /Força \+4 \(3 turnos\)/.test(previa2) && /é a última/.test(previa2), 'a poção de rolagem avisa que rola na hora e o bônus que dá: ' + previa2.replace(/\n/g, ' | '));
  await C.locator('#bag-ok-p2').click(); await w(400);
  ok(await ate(async () => { const e = await estado(M); return e.qtd.p2 === 0 && e.rec.hp >= 8 && e.rec.hp <= 18 && e.tmp && Object.keys(e.tmp).length === 1 && await parado(M); }), 'o elixir tira 2d6 de HP (fica entre 8 e 18), acaba, e põe um bônus temporário na ficha: ' + j(await estado(M)));
  const e2 = await estado(M), bonus = Object.values(e2.tmp)[0];
  ok(bonus.k === 'FOR' && bonus.v === 4 && bonus.d === '3 turnos' && bonus.n === 'Elixir amargo', 'o bônus guarda de onde veio, onde soma, quanto e a duração anotada: ' + j(bonus));
  ok(await C.evaluate(id => __tc.Fichas.rolaveis(__tc.Store.get('tokens', id)).find(x => x[0] === 'FOR')[2], ids.sel) === forAntes + 4, 'e a Força que o token rola já conta com ele (' + forAntes + ' → ' + (forAntes + 4) + ')');
  const carta2 = await (async () => { await ate(async () => (await feed(M, 'Selene · Elixir amargo').count()) === 1); return feed(M, 'Selene · Elixir amargo').first().innerText(); })();
  ok(/2d6 → \[\d, \d\] = \d+/.test(carta2) && /Força \+4 \(3 turnos\)/.test(carta2) && /era a última unidade/.test(carta2) && String(20 - e2.rec.hp) === (await feed(M, 'Selene · Elixir amargo').first().locator('.tot').innerText()).trim(), 'a mesa vê os dados, o total e o efeito: ' + carta2.replace(/\n/g, ' | '));
  ok(await C.locator('#bag-u-p2').isDisabled(), 'sem unidades, o botão de usar fica desligado');
  await M.keyboard.press('Escape'); await w(200);

  // ---------- a jogadora, na cena que está no ar ----------
  await C.locator('#airBtn').click(); await w(250);
  await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(300);
  let B = null;
  ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !__tc.Nuvem.semCena() && !!__tc.Store.get('tokens', id), ids.sel); }, 40000), 'a jogadora vê a cena que está no ar, com o token dela');
  const hpJ = (await estado(M)).rec.hp;
  ok(await ate(async () => { const b = await barras(B); return b[0].v === hpJ && b[0].lo === 10 && b[2].st === 4; }), 'as barras do token dela chegam com o piso e o começo: ' + j(await barras(B)));
  ok(await ate(async () => await B.evaluate(([a, o]) => { const u = __tc; return u.Fichas.podeBolsa(u.Store.get('tokens', a)) === true && u.Fichas.podeBolsa(u.Store.get('tokens', o)) === false; }, [ids.sel, ids.ogro])), 'ela pode abrir a bolsa do personagem dela; a do NPC (mesmo com a ficha à mostra), não');
  await B.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ids.sel); await w(500, J);
  ok(await B.locator('#hud-bolsa').isVisible() && await B.locator('#tk-bolsa').isVisible() && /Na bolsa: 2 poções · 2 bombas\./.test(await B.locator('#s-bag').innerText()), 'na faixa e no painel dela aparece a bolsa: ' + (await B.locator('#s-bag').innerText()).replace(/\n/g, ' | '));
  await B.locator('#tk-bolsa').click(); await w(300, J);
  await foto(J, 'bolsa-4-jogadora');
  await B.locator('#bag-u-p1').click(); await w(250, J);
  ok(new RegExp('HP ' + hpJ + ' → ' + (hpJ + 30) + ' \\(\\+30\\)').test(await B.locator('.bag-c').innerText()), 'a prévia dela usa o HP de agora: ' + (await B.locator('.bag-c').innerText()).replace(/\n/g, ' | '));
  await B.locator('#bag-ok-p1').click(); await w(400, J);
  ok(await ate(async () => { const e = await estado(M); return e.rec.hp === hpJ + 30 && e.qtd.p1 === 1; }, 15000), 'a poção usada pela jogadora chega à ficha (o mestre vê o HP ' + (hpJ + 30) + ' e uma poção a menos)');
  ok(await ate(async () => (await barras(C))[0].v === hpJ + 30, 15000), 'a barra do token, no mapa do mestre, acompanha a ficha');
  ok(await ate(async () => (await barras(B))[0].v === hpJ + 30, 20000), 'e volta para a jogadora na cena que ela vê');
  const daJogadora = feed(M, 'Selene · Poção de cura').filter({ has: M.locator('.it-h b', { hasText: 'Dalmo' }) });
  ok(await ate(async () => (await daJogadora.count()) === 1) && new RegExp('usou Poção de cura · HP ' + hpJ + ' → ' + (hpJ + 30)).test(await daJogadora.first().innerText()), 'a mesa ao vivo mostra o uso, em nome da jogadora: ' + (await daJogadora.first().innerText().catch(() => '(não chegou)')).replace(/\n/g, ' | '));
  // os dois ao mesmo tempo: a jogadora gasta uma bomba enquanto o mestre dá dano — as duas coisas valem
  await Promise.all([B.locator('#bag-u-b1').click(), bar(0, '-7')]);
  ok(await ate(async () => { const e = await estado(M); return e.qtd.b1 === 1 && e.rec.hp === hpJ + 23 && await parado(M) && await parado(J); }, 15000), 'bomba gasta pela jogadora e dano dado pelo mestre no mesmo instante: ficam os dois (bombas 1, HP ' + (hpJ + 23) + ') — ' + j(await estado(M)));
  ok(await ate(async () => { const e = await estado(J); return e.qtd.b1 === 1 && e.rec.hp === hpJ + 23; }, 15000), 'e a jogadora fica com o mesmo estado');
  await J.keyboard.press('Escape');
  // abaixo de zero, para quem é dono, com os números
  await bar(0, '-200');
  ok(await ate(async () => (await barras(B))[0].v === -10, 20000), 'o HP no piso chega à jogadora como −10');
  await B.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); }, ids.sel); await w(400, J);
  ok(await ate(async () => await B.locator('#hud-b0').evaluate(e => e.classList.contains('neg') && e.value === '-10')), 'e a faixa dela mostra o valor negativo em destaque');
  await foto(J, 'bolsa-5-jogadora-negativa');

  // ---------- limpeza ----------
  await apagarMesaTela(M, nomeMesa);
  const fora = t.errs.filter(e => !/status of (400|401|403|404|409)/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
