// Lote 5, parte 2, numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre e dois jogadores:
//  · as barras especiais (os antigos poderes divinos) no token, em bolinhas, indo e voltando da ficha;
//  · o cadeado dos ferimentos e o "revelar tudo / esconder tudo" dos relacionamentos, ficha por ficha;
//  · a poção com vários efeitos usada pela jogadora em OUTRA personagem (pelo caminho próprio do banco) e desfeita;
//  · os bônus "só nesta rolagem" na telinha de dados da mesa ao vivo;
//  · a poção usada pela jogadora num token sem ficha, na cena no ar (o mestre aplica: barra, sobrevida e condição);
//  · a mesa ao vivo fechada pelo mestre para um jogador, e aberta de novo.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const ficha = (nome, extra) => Object.assign({ nome, raca: 'Humana', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 5, fonte: 'total' }, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '' }, extra);
const selene = ficha('Selene', {
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '40' }], poderes: [{ id: 'pd1', nome: 'Poder divino', max: 3, atual: 1 }],
  bolsa: [{ id: 'px', t: 'pocao', nome: 'Elixir do grupo', fx: [{ k: 'barra', rec: 'hp', val: '30' }, { k: 'sob', rec: 'hp', val: '10' }, { k: 'bonus', bk: 'FOR', bv: 2, dur: 'descanso' }, { k: 'cond', c: 'bencao', r: 2 }] },
    { id: 'pd6', t: 'pocao', nome: 'Tônico', fx: [{ k: 'barra', rec: 'hp', val: '2d6' }] }],
});
const bia = ficha('Bia', { recursos: [{ id: 'vidaB', nome: 'hp', fml: '80' }] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Bia'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 860, seed: { 'tinycats:aba': 'fichas' } })).page;
  const K = (await t.device({ name: 'jogadora2', w: 1100, h: 820, seed: { 'tinycats:aba': 'fichas' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const linha = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? JSON.parse(JSON.stringify(l)) : null; }, id);
  const abrirFicha = async (f, nome, p) => { await f.locator('#lista .pc', { has: f.locator('.nm', { hasText: new RegExp('^' + nome + '$') }) }).click(); await w(400, p); };
  const feed = (p, txt) => p.locator('#feed .rol', { hasText: txt });
  const falar = async (p, texto) => { await p.locator('#msg').fill(texto); await p.locator('#msg').press('Enter'); };
  const j = JSON.stringify;
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  let apagada = false, nomeMesa = '';
  try {
    // ---------- a mesa, os dois jogadores e as fichas ----------
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    nomeMesa = 'Lote5 E2E ' + Date.now().toString(36);
    await criarMesaTela(M, nomeMesa, { semCodigo: true });
    const codigo = await codigoDaMesa(M);
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    await K.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, K);
    await loginTela(K, c.jog2, c.senha); await entrarMesaTela(K, codigo, 'Bia');
    const jogId = await J.evaluate(() => TC.conta.usuario.id), biaId = await K.evaluate(() => TC.conta.usuario.id);
    await M.evaluate(([fs, a, b]) => {
      const P = TC.dados.col('personagens'), sk = { arvores: [], pontos: {}, alocados: {} };
      P.gravar('pc_selene', { nome: 'Selene', ficha: fs[0], skills: sk, estado: { rec: { hp: 50 }, qtd: { px: 3, pd6: 1 } }, dono_id: a, vis: 'mesa', ordem: 0 });
      P.gravar('pc_bia', { nome: 'Bia', ficha: fs[1], skills: sk, estado: {}, dono_id: b, vis: 'mesa', ordem: 1 });
    }, [[selene, bia], jogId, biaId]);
    ok(await ate(() => parado(M)), '(as fichas da Selene, de Dalmo, e da Bia, da Bia, sobem para a mesa)');

    // ---------- barras especiais no token ----------
    await M.locator('#tab-cenas').click();
    let C = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Fichas.on() && !!__tc.Fichas.get('pc_selene')); }, 40000), 'o mestre abre as Cenas, com as fichas');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
    const ids = await C.evaluate(() => {
      const u = __tc, sc = u.Store.scene();
      const a = u.newToken(sc, sc.cell * 3, sc.cell * 3, { name: 'x' });
      const barril = u.newToken(sc, sc.cell * 6, sc.cell * 3, { name: 'Barril', bars: [u.cleanBar({ n: 'HP', c: '#d6524b', v: 5, m: 20, k: 'bar', on: true, vis: '' })] });
      u.Store.tx('Criar', () => { u.Store.add('tokens', a); u.Store.add('tokens', barril); });
      u.Fichas.link(u.Store.get('tokens', a.id), 'pc_selene');
      return { sel: a.id, barril: barril.id };
    });
    const barras = (f, id) => f.evaluate(id => __tc.Store.get('tokens', id).bars.map(b => ({ n: b.n, v: b.v, m: b.m, k: b.k, ref: b.ref || null, x: b.x || 0 })), id);
    let bs = await barras(C, ids.sel);
    ok(j(bs.map(b => [b.n, b.v, b.m, b.k, b.ref])) === j([['HP', 50, 100, 'bar', 'hp'], ['SP', 40, 40, 'bar', 'sp'], ['Poder divino', 1, 3, 'pts', 'pd:pd1']]), 'ligado à ficha, o token ganha também a barra especial, em bolinhas (1 de 3): ' + j(bs));
    await C.evaluate(id => { const u = __tc, tk = u.Store.get('tokens', id); u.Act.barSet(tk, 2, 3); }, ids.sel); await w(300);
    ok(await ate(async () => { const l = await linha(M, 'pc_selene'); return l.estado.pd && l.estado.pd.pd1 === 3 && l.ficha.poderes[0].atual === 1 && await parado(M); }), 'mexer nas bolinhas do token grava na ficha (no estado: 3), sem regravar a lista da ficha');
    await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_selene'); P.gravar('pc_selene', { estado: Object.assign({}, l.estado, { pd: { pd1: 0 } }) }); });
    ok(await ate(async () => (await barras(C, ids.sel))[2].v === 0), 'e mudar na ficha muda o token (0 de 3)');
    // (lote 6) a fadiga da ficha vai para o token: a pilha de 5 a 0, que todos veem
    const fadTok = () => C.evaluate(id => __tc.Store.get('tokens', id).fad, ids.sel);
    ok(await fadTok() === 5, 'a Selene é de um jogador: o token já leva a pilha de fadiga, cheia (5)');
    await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_selene'); P.gravar('pc_selene', { estado: Object.assign({}, l.estado, { fad: 2 }) }); });
    ok(await ate(async () => (await fadTok()) === 2), 'mudando na ficha (2), o token acompanha');
    ok(await C.evaluate(id => { const sc = __tc.Store.scene(), v = __tc.Proj.projetar(sc, __tc.Store.S.assets || {}, new Set()).v; const t = v.tokens.find(x => x.id === id); return t && t.fad === 2 && t.char === null; }, ids.sel), 'e a pilha vai para os jogadores mesmo quando eles não recebem a ficha (na cena que eles veem)');
    await C.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ids.sel); await w(400);
    ok(await ate(async () => (await C.locator('#tk-fad').innerText().catch(() => '')) === '2 de 5 · Muito cansado'), 'no painel do token, o mestre vê "2 de 5 · Muito cansado"');
    const antesP = { dis: await C.locator('#tk-fad-p').isDisabled(), vis: await C.locator('#tk-fad-p').isVisible() };
    await C.locator('#tk-fad-p').click(); await w(300);
    const naFicha = await ate(async () => { const l = await linha(M, 'pc_selene'); return l.estado.fad === 3 && await parado(M); });
    ok(naFicha && await ate(async () => (await fadTok()) === 3), 'o +1 do painel grava na ficha (3) e o token acompanha — ' + j({ antesP, naFicha, fad: (await linha(M, 'pc_selene')).estado.fad, tok: await fadTok(), toast: await C.locator('.toast').last().innerText().catch(() => '') }));
    await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_selene'), e = Object.assign({}, l.estado); delete e.fad; P.gravar('pc_selene', { estado: e }); });
    ok(await ate(async () => (await fadTok()) === 5), '(de volta: cheia)');
    await C.evaluate(() => __tc.setSel([]));

    // ---------- (lote 7) nos tokens selecionados: a Fadiga, o Conforto e a Sanidade de uma vez ----------
    {
      const bia = await C.evaluate(() => { const u = __tc, sc = u.Store.scene(), b = u.newToken(sc, sc.cell * 9, sc.cell * 3, { name: 'x' }); u.Store.tx('Criar', () => u.Store.add('tokens', b)); u.Fichas.link(u.Store.get('tokens', b.id), 'pc_bia'); return b.id; });
      // (as duas fichas prontas na cena — ligadas, de jogadores — antes de abrir a janela: com a máquina ocupada, a ligação
      // da Bia pode levar um instante)
      const prontas = await ate(() => C.evaluate(l => l.every(id => { const u = __tc, t = u.Store.get('tokens', id); return !!t && !!t.char && !!(u.Fichas.mente(t) || u.Fichas.fadiga(t)) && u.Fichas.deJogadorT(t); }), [ids.sel, bia]));
      await C.evaluate(l => __tc.setSel(l.map(id => ({ c: 'tokens', id }))), [ids.sel, bia, ids.barril]); await w(400);
      ok(prontas && await C.locator('#mt-mente').isVisible(), 'com tokens de fichas selecionados, o mestre tem "Fadiga, Conforto e Sanidade…"');
      await C.locator('#mt-mente').click(); await w(400);
      const md = C.locator('.modal');
      ok(await C.locator('#mm-list .area-row').count() === 2 && await C.locator('#mm-on-0').isChecked() && await C.locator('#mm-on-1').isChecked(),
        'a janela lista as duas fichas (o barril, sem ficha, fica de fora), as duas de jogadores, marcadas: ' + (await C.locator('#mm-list').innerText().catch(() => '?')).replace(/\s+/g, ' '));
      await C.locator('#mm-conf').fill('-10'); await C.locator('#mm-san').fill('-5'); await C.locator('#mm-fad').fill('-1'); await w(200);
      await C.locator('#mm-motivo').fill('A explosão no porão');
      const prev = (await C.locator('#mm-list').innerText()).replace(/\s+/g, ' ');
      ok(/Fadiga Descansado → Disposto · Conforto 50 → 40 · Sanidade 100 → 95/.test(prev), 'a lista mostra o antes e o depois de cada um: ' + prev);
      await md.locator('button', { hasText: 'Aplicar' }).click(); await w(500);
      const est = id => linha(M, id).then(l => l.estado || {});
      ok(await ate(async () => { const s = await est('pc_selene'), b = await est('pc_bia'); return s.conf === 40 && s.san === 95 && s.fad === 4 && b.conf === 40 && b.san === 95 && b.fad === 4 && await parado(M); }),
        'aplicado nas duas fichas (Conforto 40, Sanidade 95, Fadiga 4)');
      ok(await ate(async () => (await fadTok()) === 4), 'o token acompanha a fadiga nova');
      ok(await ate(async () => (await feed(J, 'Fadiga −1, Conforto −10, Sanidade −5 para Selene e Bia — A explosão no porão').count()) === 1), 'o motivo vai para a mesa ao vivo (o jogador vê)');
      const avisos = await C.locator('.toast').allInnerTexts();
      await C.locator('.toast', { hasText: 'Feito:' }).locator('button', { hasText: 'Desfazer' }).click(); await w(600);
      ok(await ate(async () => { const s = await est('pc_selene'), b = await est('pc_bia'); return s.conf === undefined && s.san === undefined && s.fad === undefined && b.conf === undefined && b.san === undefined && await parado(M); }),
        'o Desfazer do aviso volta as duas fichas como estavam (sem os valores anotados): ' + j([await est('pc_selene'), await est('pc_bia'), avisos]));
      await C.evaluate(id => { const u = __tc; u.setSel([]); u.Store.tx('Apagar', () => u.Store.del('tokens', id)); }, bia); await w(300);
    }

    // ---------- Fichas: relacionamentos de uma vez e o cadeado dos ferimentos ----------
    await M.locator('#tab-fichas').click(); await w(600);
    const F = await quadro(M, /\/fichas\//);
    await abrirFicha(F, 'Selene');
    const G = await quadro(J, /\/fichas\//);
    ok(await ate(async () => (await G.locator('#lista .pc .nm').allInnerTexts()).sort().join('|') === 'Bia|Selene'), 'o jogador recebe a ficha dele e a da Bia (aberta a todos): ' + (await G.locator('#lista .pc .nm').allInnerTexts()).join('|'));
    await abrirFicha(G, 'Selene', J);
    await F.locator('#ficha [data-abaficha="social"]').click(); await G.locator('#ficha [data-abaficha="social"]').click(); await w(300);
    // (as duas são personagens de jogadores na mesma mesa: a tela do mestre pode já ter criado a linha da Bia sozinha —
    //  aí ela não está mais no "+ Relacionamento com…", e não há o que acrescentar)
    await ate(async () => (await F.locator('#relNovo option', { hasText: 'Bia' }).count()) === 1 || (await F.locator('.relrow').count()) === 1);
    if (await F.locator('#relNovo option', { hasText: 'Bia' }).count()) await F.locator('#relNovo').selectOption({ label: 'Bia' }, { timeout: 4000 }).catch(() => {});
    await w(400);
    ok(await ate(async () => (await G.locator('.relrow').count()) === 1 && (await G.locator('.relrow.sovalor').count()) === 0), 'a Selene tem o relacionamento com a Bia (posto pelo mestre); o jogador o vê, com o valor');
    ok(await F.locator('[data-reltodos="esconder"]').isEnabled() && await F.locator('[data-reltodos="revelar"]').isDisabled() && await G.locator('[data-reltodos]').count() === 0, 'o mestre tem "Esconder tudo" (e "Revelar tudo" desligado: nada escondido); o jogador, nenhum dos dois');
    await F.locator('[data-reltodos="esconder"]').click(); await w(400);
    ok(await ate(async () => (await G.locator('.relrow.sovalor').count()) === 1), '"Esconder tudo": o jogador continua vendo o nome, mas não o valor');
    await F.locator('[data-reltodos="revelar"]').click(); await w(300);
    ok(await F.locator('[data-reltodossim]').isVisible() && /Revelar a Dalmo o valor escondido/.test(await F.locator('.reltodosconf').innerText()), '"Revelar tudo" pergunta antes: ' + (await F.locator('.reltodosconf').innerText()).replace(/\n/g, ' | '));
    await F.locator('[data-reltodossim]').click(); await w(400);
    ok(await ate(async () => (await G.locator('.relrow.sovalor').count()) === 0 && (await G.locator('.relrow').count()) === 1), 'confirmado, o jogador volta a ver o valor');
    await F.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(400);
    ok(await ate(async () => (await G.locator('.relrow.sovalor').count()) === 1), 'e o Desfazer esconde de novo, como estava');
    await F.locator('#ficha [data-abaficha="atributos"]').click(); await G.locator('#ficha [data-abaficha="atributos"]').click(); await w(300);
    // o cadeado dos ferimentos
    ok(await ate(async () => (await F.locator('#painelCorpo [data-fertrava]').count()) === 1 && (await G.locator('#painelCorpo [data-fertrava]').count()) === 0), 'só o mestre tem o cadeado dos ferimentos');
    await F.locator('#painelCorpo [data-fertrava]').click(); await w(400);
    ok(await ate(async () => { const l = await linha(M, 'pc_selene'); return l.estado.ferTrava === 1 && await parado(M); }) && await F.locator('#painelCorpo [data-fertrava]').getAttribute('aria-pressed') === 'true', 'travado: fica marcado na ficha');
    await F.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(400);
    ok(await ate(async () => { const l = await linha(M, 'pc_selene'); return !l.estado.ferTrava && await parado(M); }) && await F.locator('#painelCorpo [data-fertrava]').getAttribute('aria-pressed') === 'false', 'o Desfazer destrava');
    await F.locator('#painelCorpo [data-fertrava]').click(); await w(400);
    ok(await ate(async () => { const l = await linha(M, 'pc_selene'); return l.estado.ferTrava === 1 && await parado(M); }), '(travado de novo)');
    ok(await ate(async () => (await G.locator('#painelCorpo .tagseg', { hasText: 'travado pelo mestre' }).count()) === 1 && (await G.locator('#painelCorpo [data-fernovo]').count()) === 0), 'para o jogador: "travado pelo mestre", sem "+ Ferimento"');
    await F.locator('#painelCorpo [data-fertrava]').click(); await w(400);
    ok(await ate(async () => (await G.locator('#painelCorpo [data-fernovo]').count()) === 1), 'destravado, o jogador volta a poder marcar ferimentos');
    // "Personagem ativo": só o mestre marca; fica no estado da ficha
    ok(await F.locator('#f_ativo').isChecked() && await G.locator('#f_ativo').count() === 0, 'a ficha começa ativa; só o mestre tem a caixa "Personagem ativo"');
    await F.locator('#f_ativo').uncheck(); await w(400);
    ok(await ate(async () => { const l = await linha(M, 'pc_selene'); return l.estado.ativo === false && await parado(M); }) && (await F.locator('#lista .pc', { hasText: 'Selene' }).locator('.inativo').count()) === 1,
      'desmarcada: fica no estado da ficha (ativo: false), e a lista do mestre diz "inativo"');
    await F.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(400);
    ok(await ate(async () => { const l = await linha(M, 'pc_selene'); return l.estado.ativo !== false && await parado(M); }) && await F.locator('#f_ativo').isChecked() && (await F.locator('#lista .inativo').count()) === 0, 'Desfazer: ativa de novo');

    await F.locator('#ficha [data-abaficha="bolsas"]').click(); await G.locator('#ficha [data-abaficha="bolsas"]').click(); await w(300);
    // ---------- a poção em outra personagem (pelo caminho próprio do banco) ----------
    await G.locator('#painelBolsa [data-boluse="px"]').click(); await w(300, J);
    ok(await G.locator('[data-bolem="px"] option').count() === 2, 'na prévia, dá para escolher em quem: na Selene ou na Bia');
    await G.locator('[data-bolem="px"]').selectOption('pc_bia'); await w(300, J);
    const pv = (await G.locator('.bolconf').innerText()).replace(/\n/g, ' | ');
    ok(/hp 80 → 80 \(\+30\)/.test(pv) && /Sobrevida 10 em hp/.test(pv) && /Força \+2 \(até o próximo descanso\)/.test(pv) && /Abençoado \(2 rodadas\) — só pela cena/.test(pv), 'a prévia é a da Bia (a barra dela se chama "hp"): ' + pv);
    await G.locator('[data-bolsim="px"]').click(); await w(500, J);
    ok(await ate(async () => { const b = await linha(M, 'pc_bia'), s = await linha(M, 'pc_selene'); return b.estado.sob && b.estado.sob.vidaB === 10 && Object.values(b.estado.tmp || {}).some(x => x.k === 'FOR' && x.v === 2 && x.ate === 'descanso') && s.estado.qtd.px === 2; }),
      'a Bia recebe a sobrevida e o bônus até o descanso, e a bolsa da Selene perde uma — gravados juntos, pelo banco: ' + j((await linha(M, 'pc_bia')).estado));
    ok(await ate(async () => (await feed(M, 'Selene · Elixir do grupo em Bia').count()) === 1), 'a mesa ao vivo fica sabendo: "Selene · Elixir do grupo em Bia"');
    ok(await ate(async () => { const b = await linha(K, 'pc_bia'); return b && b.estado.sob && b.estado.sob.vidaB === 10; }), 'e a Bia vê a ficha dela mudar');
    await G.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(500, J);
    ok(await ate(async () => { const b = await linha(M, 'pc_bia'), s = await linha(M, 'pc_selene'); return !(b.estado.sob && b.estado.sob.vidaB) && !Object.keys(b.estado.tmp || {}).length && s.estado.qtd.px === 3; }), 'Desfazer: a Bia fica como estava e o elixir volta para a bolsa');
    // a outra jogadora não usa a bolsa da Selene, nem pelo banco
    const negado = await K.evaluate(async () => { try { await TC.dados.usarItemEm('pc_selene', 'px', 'pc_bia', { sob: { vidaB: 50 } }, false); return 'passou'; } catch (e) { return e.message; } });
    ok(/só usa itens da bolsa dos seus personagens/.test(negado), 'a Bia não usa a bolsa da Selene, nem chamando o banco direto: ' + negado);

    // ---------- bônus só nesta rolagem, na telinha de dados ----------
    ok(await ate(async () => !(await J.locator('#dados').isHidden()) && (await J.locator('#dadosBotoes button[data-k="FOR"]').count()) === 1), 'a telinha de dados do jogador está pronta');
    if (await J.locator('#dadosCorpo').isHidden()) { await J.locator('#dadosAbre').click(); await w(200, J); }
    await J.locator('#dadosPc').selectOption('pc_selene'); await w(200, J);
    await J.locator('#dadosMaisA').fill('5'); await J.locator('#dadosMaisR').fill('2'); await w(200, J);
    await foto(J, 'l5-telinha');
    {
      const tFor = await J.locator('#dadosBotoes button[data-k="FOR"]').getAttribute('title');
      const vFor = +(await J.locator('#dadosBotoes button[data-k="FOR"] b').innerText()), fFor = +((await J.locator('#dadosFixa').inputValue()) || 0);
      const v5 = vFor + 5, f5 = Math.min(fFor, v5), esperado = f5 >= v5 ? 'fixa total: ' + v5 + ' + 2' : '1d' + (v5 - f5) + (f5 ? ' + ' + f5 : '') + ' + 2';
      ok(tFor.endsWith(' — ' + esperado), 'o botão já diz o que vai rolar, com os dois bônus (' + esperado + '): ' + tFor);
    }
    await J.locator('#dadosBotoes button[data-k="FOR"]').click();
    ok(await ate(async () => (await feed(M, 'Selene · Força').count()) === 1) && /\+5 no atributo \(\d+ → \d+\) · \+2 no resultado/.test(await feed(M, 'Selene · Força').first().innerText()), 'a rolagem chega à mesa dizendo os dois bônus: ' + (await feed(M, 'Selene · Força').first().innerText()).replace(/\n/g, ' | '));
    ok(await J.locator('#dadosMaisA').inputValue() === '5' && await J.locator('#dadosMaisR').inputValue() === '2', '(lote 21) e os bônus ficam nos campos, para a próxima');
    // a iniciativa usa só o "+ resultado"
    await J.locator('#dadosMaisA').fill(''); await J.locator('#dadosMaisR').fill('3'); await w(200, J);
    ok(/\+ 3 \(o bônus no resultado\)/.test(await J.locator('#dadosBotoes button[data-k="INI"]').getAttribute('title')), 'o botão da iniciativa já diz o +3: ' + await J.locator('#dadosBotoes button[data-k="INI"]').getAttribute('title'));
    await J.locator('#dadosBotoes button[data-k="INI"]').click();
    {
      const ini = async () => { const u = await M.evaluate(() => TC.aoVivo.itens.filter(l => l.tipo === 'rolagem' && l.dados && l.dados.k === 'iniciativa').map(l => l.dados)); return u[u.length - 1] || null; };
      ok(await ate(async () => { const d = await ini(); if (!d) return false; const m = /^1d20 \((\d+)\)(?: ([+−]) (\d+))? · \+3 no resultado$/.exec(d.resumo || ''); return !!m && d.total === +m[1] + (m[2] === '−' ? -(+m[3]) : +(m[3] || 0)) + 3 && d.sis && d.sis.v === d.total; }),
        'a iniciativa chega à mesa com o +3 somado no total: ' + j(await ini()));
    }
    ok(await J.locator('#dadosMaisR').inputValue() === '3', '(lote 21) e o bônus fica');
    await J.locator('#dadosMaisX').click(); await w(200, J);
    ok(await J.locator('#dadosMaisR').inputValue() === '' && await J.locator('#dadosMaisX').isHidden(), 'o × zera os bônus');

    // ---------- a poção num token sem ficha, pela jogadora, na cena no ar ----------
    await M.locator('#tab-cenas').click(); await w(500);
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    await J.locator('#tab-cenas').click();
    let B = null;
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(([a, b]) => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !!__tc.Store.get('tokens', a) && !!__tc.Store.get('tokens', b), [ids.sel, ids.barril]); }, 40000), 'a jogadora vê a cena no ar, com o token dela e o barril');
    await B.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ids.sel); await w(400, J);
    if (!(await B.locator('#tk-bolsa').isVisible())) { await B.locator('#s-bag > summary').click().catch(() => {}); await w(200, J); }
    await B.locator('#tk-bolsa').click(); await w(300, J);
    ok(await B.locator('#bag-em').count() === 1, 'a bolsa dela tem "Em quem"');
    await B.locator('#bag-em').selectOption(ids.barril); await w(300, J);
    await B.locator('#bag-u-px').click(); await w(300, J);
    await foto(J, 'l5-bolsa-cena');
    const pb = (await B.locator('.bag-c').innerText()).replace(/\n/g, ' | ');
    ok(/Usar Elixir do grupo em Barril/.test(pb) && /HP \+30/.test(pb) && /Condição: Abençoado \(2 rodadas\)/.test(pb) && /o bônus não vale num token sem ficha/.test(pb) && !/5 →/.test(pb), 'a prévia no barril não mostra a vida dele, só o que muda: ' + pb);
    await B.locator('#bag-ok-px').click(); await w(500, J);
    ok(await ate(async () => { const b = (await barras(C, ids.barril))[0], tk = await C.evaluate(id => { const t = __tc.Store.get('tokens', id); return { conds: t.conds, ci: t.cinfo }; }, ids.barril); return b.v === 20 && b.x === 10 && tk.conds.includes('bencao') && tk.ci.bencao && tk.ci.bencao.d === 2; }, 25000),
      'o mestre aplica o pedido: o barril vai a 20 (o máximo), ganha 10 de sobrevida e fica Abençoado por 2 rodadas');
    ok(await ate(async () => (await linha(M, 'pc_selene')).estado.qtd.px === 2), 'e o elixir sai da bolsa da Selene');
    ok(await ate(async () => (await feed(M, 'Selene · Elixir do grupo em Barril').count()) === 1) && /HP \+30/.test(await feed(M, 'Selene · Elixir do grupo em Barril').first().innerText()), 'a mesa ao vivo mostra o uso, sem a vida do barril: ' + (await feed(M, 'Selene · Elixir do grupo em Barril').first().innerText()).replace(/\n/g, ' | '));
    await J.keyboard.press('Escape');

    // ---------- o mestre também usa a bolsa num token sem ficha (aplica na hora) ----------
    await C.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ids.sel); await w(400);
    if (!(await C.locator('#tk-bolsa').isVisible())) { await C.locator('#s-bag > summary').click().catch(() => {}); await w(200); }
    await C.locator('#tk-bolsa').click(); await w(300);
    await C.locator('#bag-em').selectOption(ids.barril); await w(300);
    await C.locator('#bag-u-px').click(); await w(300);
    await C.locator('#bag-ok-px').click(); await w(500);
    ok(await ate(async () => (await linha(M, 'pc_selene')).estado.qtd.px === 1 && (await feed(M, 'Selene · Elixir do grupo em Barril').count()) === 2), 'o mestre usa o elixir no barril: sai da bolsa e a mesa fica sabendo');
    {
      const t2 = (await feed(M, 'Selene · Elixir do grupo em Barril').last().innerText()).replace(/\n/g, ' | ');
      ok(/HP \+30/.test(t2) && /o bônus não vale num token sem ficha/.test(t2) && !/Força/.test(t2), 'num token sem ficha o bônus fica de fora, e o texto diz: ' + t2);
    }
    await M.keyboard.press('Escape');

    // ---------- pedidos forjados (pelo console, como faria quem quisesse burlar): o mestre confere e ignora ----------
    const oculto = await C.evaluate(() => {
      const u = __tc, sc = u.Store.scene();
      const o = u.newToken(sc, sc.cell * 9, sc.cell * 3, { name: 'Espião', hidden: true, bars: [u.cleanBar({ n: 'HP', c: '#d6524b', v: 5, m: 20, k: 'bar', on: true, vis: '' })] });
      u.Store.tx('Criar', () => u.Store.add('tokens', o));
      return o.id;
    });
    await w(1500);
    await B.evaluate(([barril, oc]) => {
      __tc.Nuvem.usarItem({ de: 'pc_selene', item: 'px', alvo: barril, rol: [30, null, null, null] });      // um "dado" onde o efeito é fixo
      __tc.Nuvem.usarItem({ de: 'pc_selene', item: 'pd6', alvo: barril, rol: [13] });                      // 2d6 não dá 13
      __tc.Nuvem.usarItem({ de: 'pc_selene', item: 'px', alvo: oc, rol: [null, null, null, null] });       // um token escondido
      __tc.Nuvem.usarItem({ de: 'pc_selene', item: 'nada', alvo: barril, rol: [] });                        // um item que não existe
    }, [ids.barril, oculto]);
    ok(await ate(() => B.evaluate(() => __tc.Nuvem.pendentes() === 0), 40000), '(o mestre recebe e responde os pedidos forjados do Dalmo)');
    await K.locator('#tab-cenas').click();
    let KC = null;
    ok(await ate(async () => { KC = await quadro(K, /\/cenas\//); return KC && await KC.evaluate(b => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !!__tc.Store.get('tokens', b), ids.barril); }, 40000), 'a Bia vê a cena no ar, com o barril');
    await KC.evaluate(b => __tc.Nuvem.usarItem({ de: 'pc_selene', item: 'px', alvo: b, rol: [null, null, null, null] }), ids.barril);      // a bolsa da Selene, não a dela
    ok(await ate(() => KC.evaluate(() => __tc.Nuvem.pendentes() === 0), 40000), '(e o da Bia)');
    ok(await ate(async () => { const s = await linha(M, 'pc_selene'); return s.estado.qtd.px === 1 && s.estado.qtd.pd6 === 1; }) && await C.evaluate(id => !(__tc.Store.get('tokens', id).conds || []).includes('bencao'), oculto),
      'nada passou: dado onde o efeito é fixo, 13 em 2d6, token escondido, item que não existe e a Bia usando a bolsa da Selene — a bolsa continua com 1 elixir e 1 tônico: ' + j((await linha(M, 'pc_selene')).estado.qtd));
    // (e o pedido certo, com o dado dentro da faixa, passa)
    await B.evaluate(b => __tc.Nuvem.usarItem({ de: 'pc_selene', item: 'pd6', alvo: b, rol: [7] }), ids.barril);
    ok(await ate(async () => (await linha(M, 'pc_selene')).estado.qtd.pd6 === 0, 40000), 'o pedido certo (7 em 2d6) passa: o tônico sai da bolsa');
    await K.locator('#tab-fichas').click(); await J.locator('#tab-fichas').click(); await w(300);

    // ---------- a mesa ao vivo fechada para a Bia ----------
    await M.locator('#btnConta').click(); await w(300);
    await M.locator('#membros .mb', { hasText: 'Bia' }).locator('button', { hasText: 'Permissões' }).click(); await w(350);
    await foto(M, 'l5-permissoes');
    ok(await M.locator('#pp-vivo').isChecked(), 'na janela de permissões, "Bia vê a mesa ao vivo" começa marcado');
    await M.locator('#pp-vivo').uncheck(); await M.locator('#pp-ok').click(); await w(500);
    ok(await ate(async () => await K.locator('#vivoFechado').isVisible()), 'a Bia vê o aviso: a mesa ao vivo está fechada para ela');
    await foto(K, 'l5-vivo-fechado');
    await falar(M, 'segredo do mestre');
    ok(await ate(async () => (await J.locator('#feed').innerText()).includes('segredo do mestre')), 'o Dalmo recebe a mensagem do mestre');
    await w(2500, K);
    ok(!(await K.locator('#feed').innerText()).includes('segredo do mestre') && !(await K.locator('#feed').innerText()).includes('Elixir do grupo'), 'a Bia não: nem essa, nem as linhas de antes');
    await falar(K, 'oi da Bia');
    ok(await ate(async () => (await K.locator('#feed').innerText()).includes('oi da Bia') && (await M.locator('#feed').innerText()).includes('oi da Bia')), 'o que a Bia escreve chega à mesa (e ela vê a própria linha)');
    await M.locator('#btnConta').click(); await w(300);
    ok(/sem mesa ao vivo/.test(await M.locator('#membros .mb', { hasText: 'Bia' }).innerText()), 'no menu do mestre, a Bia aparece "sem mesa ao vivo"');
    await M.locator('#membros .mb', { hasText: 'Bia' }).locator('button', { hasText: 'Permissões' }).click(); await w(350);
    await M.locator('#pp-vivo').check(); await M.locator('#pp-ok').click(); await w(500);
    ok(await ate(async () => !(await K.locator('#vivoFechado').isVisible()) && (await K.locator('#feed').innerText()).includes('segredo do mestre'), 25000), 'aberta de novo: o aviso some e a Bia recebe a conversa inteira');

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada && nomeMesa) { try { await M.keyboard.press('Escape'); await M.evaluate(async nome => { const a = TC.mesas.atual; if (a && a.nome === nome) await TC.mesas.apagar(); }, nomeMesa); } catch (e) { console.log('(a mesa de teste não pôde ser apagada: ' + String(e.message).split('\n')[0] + ')'); } }
  }
  const fora = t.errs.filter(e => !/status of (400|401|403|404|409)|WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
