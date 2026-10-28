// Bestiário numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre (Bruno), o Dalmo (dono da
// Selene) e a Lia em aparelhos separados:
//   · a aba Bestiário, só do mestre (depois da Oficina); o Dalmo não a vê, nem recebe os inimigos (vis = mestre);
//   · o mestre cria o Goblin pela janela, monta o encontro (dois) e puxa: as Cenas abrem com os dois tokens ligados ao
//     Bestiário (os números de lá);
//   · "Rolar o saque" no token, para a Selene: os itens de bolsa somam com o de mesmo nome, o equipamento entra
//     guardado, os lapros somam — e o Desfazer tira tudo; no chão: o baú, e "Entregar…" pelo painel dele (o baú sai;
//     o Desfazer o devolve);
//   · o banco (SQL 0024): o jogador não cria nem lê best:*; a Lia, auxiliar sem a aba Bestiário, também não; com a aba,
//     lê e escreve — e a aba aparece para ela; a aba Itens também é aceita.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const ficha = (nome, extra) => Object.assign({ nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 5, fonte: 'total' }, disputa: {}, estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '',
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }], bolsa: [{ id: 'b1', t: 'material', nome: 'Erva' }] }, extra);

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Lia'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1300, h: 880, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Lp = (await t.device({ name: 'lia', w: 1300, h: 880, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const abas = p => p.evaluate(() => [...document.querySelectorAll('.tab')].filter(x => !x.hidden).map(x => x.id.slice(4)).join(','));
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const linha = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? JSON.parse(JSON.stringify({ ficha: l.ficha, estado: l.estado })) : null; }, id);
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const errosDeFora = () => t.errs.filter(e => !/^\[sonda-/.test(e) || !/status of (400|401|403|409)/.test(e)).filter(e => !/status of (400|401|409)/.test(e));

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Bestiário E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    const mesa = await M.evaluate(() => TC.mesas.atual.id);
    await M.locator('#tab-cenas').click();
    let C = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && !!__tc.Store.scene() && __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on()); }, 40000), '(o mestre abre as Cenas da mesa)');
    const codigo = await codigoDaMesa(M);
    await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp);
    await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    const dalmo = await Dp.evaluate(() => TC.conta.usuario.id);
    await Lp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Lp);
    await loginTela(Lp, c.jog2, c.senha); await entrarMesaTela(Lp, codigo, 'Lia');
    const lia = await Lp.evaluate(() => TC.conta.usuario.id);
    ok(/,oficina,bestiario$/.test(await abas(M)) && !/bestiario/.test(await abas(Dp)), 'a aba Bestiário, só do mestre, depois da Oficina — ' + await abas(M));
    await M.evaluate(([f, uid]) => { TC.dados.col('personagens').gravar('pc_selene', { nome: 'Selene', ficha: f, skills: { arvores: [], pontos: {}, alocados: {} }, estado: { qtd: { b1: 1 }, lapros: 10 }, dono_id: uid, vis: 'mesa', ordem: 0 }); }, [ficha('Selene'), dalmo]);
    ok(await ate(() => parado(M)), '(a ficha da Selene, do Dalmo, sobe para a mesa)');

    // ---------- o mestre cria o goblin ----------
    let BF = null, gob = null;
    await passo('criar', async () => {
      await M.locator('#tab-bestiario').click();
      ok(await ate(async () => { BF = await quadro(M, /\/bestiario\//); return BF && await BF.evaluate(() => !!window.__best && __best.pronto && __best.naMesa); }, 40000), '(o Bestiário abre, na mesa)');
      await BF.locator('#btNovo').click(); await w(200);
      await BF.locator('#ed-nome').fill('Goblin batedor');
      await BF.locator('#ed-aba-numeros').click(); await w(120);
      await BF.locator('#ed-level').fill('4'); await BF.locator('#ed-level').press('Tab'); await w(120);
      await BF.locator('#ed-aba-comp').click(); await w(100);
      await BF.locator('#ed-lembrete').fill('Flanqueia; foge com 25% de HP');
      await BF.locator('#ed-aba-saque').click(); await w(100);
      for (const [i, nome, chance, qtd, tipo] of [[0, 'Erva', '100', '2', 'material'], [1, 'Adaga enferrujada', '100', '1', 'equip']]) {
        await BF.locator('#ed-sq-mais').click(); await w(100);
        await BF.locator('#ed-sq-n-' + i).fill(nome); await BF.locator('#ed-sq-n-' + i).press('Tab');
        await BF.locator('#ed-sq-c-' + i).fill(chance); await BF.locator('#ed-sq-c-' + i).press('Tab');
        await BF.locator('#ed-sq-q-' + i).fill(qtd); await BF.locator('#ed-sq-q-' + i).press('Tab');
        await BF.locator('#ed-sq-t-' + i).selectOption(tipo); await w(80);
      }
      await BF.locator('#ed-lapros').fill('5'); await BF.locator('#ed-lapros').press('Tab'); await w(100);
      await BF.locator('#ed-salvar').click(); await w(300);
      gob = await BF.evaluate(() => __best.sel);
      ok(await ate(async () => { const r = await M.evaluate(id => { const l = TC.dados.col('documentos').pegar('best:i:' + id); return l && !l.apagado ? { vis: l.vis, nome: l.dados.nome, sq: l.dados.saque.itens.length } : null; }, gob); return !!r && r.vis === 'mestre' && r.nome === 'Goblin batedor' && r.sq === 2 && await parado(M); }),
        'o goblin vai para a mesa, só do mestre (vis = mestre), com o saque');
      ok(await ate(async () => (await Dp.evaluate(() => TC.dados.col('documentos').todas().filter(l => String(l.id).startsWith('best:')).length)) === 0, 5000), 'o Dalmo não recebe o inimigo');
    });

    // ---------- o encontro, puxado para a cena ----------
    let toks = [];
    await passo('puxar', async () => {
      await BF.locator('.mais[data-mais="' + gob + '"]').click(); await BF.locator('.mais[data-mais="' + gob + '"]').click(); await w(150);
      await foto(M, 'best-rede-encontro');
      await BF.locator('#enc-puxar').click();
      ok(await ate(async () => { toks = await C.evaluate(() => __tc.Store.scene().tokens.filter(x => x.best).map(x => ({ id: x.id, n: x.name, best: x.best }))); return toks.length === 2; }), '“Puxar para a cena”: as Cenas abrem com os dois goblins');
      ok(await M.evaluate(() => document.querySelector('#tab-cenas').getAttribute('aria-selected')) === 'true' && j(toks.map(x => x.n)) === j(['Goblin batedor 1', 'Goblin batedor 2']) && toks.every(x => x.best === gob), 'na aba Cenas, numerados e ligados ao Bestiário — ' + j(toks.map(x => x.n)));
      const naTela = await C.evaluate(ids => { const u = __tc, [cw, ch] = u.Render.size(), v = u.App.view; return ids.every(id => { const k = u.Store.get('tokens', id); return k.x >= v.x && k.y >= v.y && k.x <= v.x + cw / v.z && k.y <= v.y + ch / v.z; }); }, toks.map(x => x.id));
      ok(naTela, 'os dois nascem dentro do que o mestre está vendo');
      const nums = await C.evaluate(id => __tc.Fichas.numeros(__tc.Store.get('tokens', id)), toks[0].id);
      const deLa = await BF.evaluate(id => __best.contas(id).numeros, gob);
      ok(!!nums && j(nums) === j(deLa), 'os números do token são os do Bestiário — ' + j(nums));
    });

    // ---------- o saque ----------
    const selene = () => linha(M, 'pc_selene');
    const resumo = l => ({ erva: l.estado.qtd.b1, bolsa: l.ficha.bolsa.length, adagas: (l.ficha.itens || []).filter(x => x.nome === 'Adaga enferrujada').length, lapros: l.estado.lapros });
    await passo('o saque para a Selene', async () => {
      await C.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, toks[0].id); await w(400);
      await C.locator('#tk-saque').click(); await w(300);
      ok(/2 × Erva/.test(await C.locator('.modal').innerText()) && /Adaga enferrujada/.test(await C.locator('.modal').innerText()), 'a janela do saque: 2 ervas e a adaga (100%)');
      await C.locator('#sq-para').selectOption('pc_selene'); await w(100);
      ok(/Entregar a Selene/.test(await C.locator('.modal .btn.primary').innerText()), 'escolhida a Selene, o botão diz');
      await foto(M, 'best-rede-saque');
      await C.locator('.modal .btn.primary').click();
      ok(await ate(async () => { const r = resumo(await selene()); return r.erva === 3 && r.bolsa === 1 && r.adagas === 1 && r.lapros === 15; }), 'a Selene recebe: as ervas somam com a dela (1 + 2), a adaga entra guardada, 10 + 5 lapros — ' + j(resumo(await selene())));
      ok((await selene()).ficha.itens.find(x => x.nome === 'Adaga enferrujada').equipado === false, '(a adaga entra guardada)');
      await C.locator('.toast button', { hasText: 'Desfazer' }).last().click();
      ok(await ate(async () => { const r = resumo(await selene()); return r.erva === 1 && r.bolsa === 1 && r.adagas === 0 && r.lapros === 10; }), 'o Desfazer tira o que entrou — ' + j(resumo(await selene())));
      ok(await ate(async () => resumo(await linha(Dp, 'pc_selene')).erva === 1), '(e o Dalmo vê a ficha dele como era)');
    });
    await passo('o saque no chão', async () => {
      await C.locator('#tk-saque').click(); await w(300);
      await C.locator('#sq-para').selectOption(''); await w(100);
      await C.locator('.modal .btn.primary').click(); await w(300);
      const bau = await C.evaluate(() => { const b = __tc.Store.scene().tokens.find(x => x.prop === 'bau' && x.saque); return b ? { id: b.id, saque: b.saque } : null; });
      ok(!!bau && bau.saque.lapros === 5 && bau.saque.itens.length === 2, 'no chão: o baú com o saque');
      await C.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, bau.id); await w(300);
      await C.locator('#pr-entregar').click(); await w(300);
      ok(await C.locator('#sq-para').inputValue() === 'pc_selene', 'do baú, “Entregar…” já vem com a Selene');
      await C.locator('.modal .btn.primary').click();
      ok(await ate(async () => { const r = resumo(await selene()); return r.erva === 3 && r.adagas === 1 && r.lapros === 15; }) && await C.evaluate(id => !__tc.Store.get('tokens', id), bau.id), 'a Selene pega o saque do chão, e o baú sai');
      await C.locator('.toast button', { hasText: 'Desfazer' }).last().click();
      ok(await ate(async () => { const r = resumo(await selene()); return r.erva === 1 && r.adagas === 0 && r.lapros === 10; }) && await ate(() => C.evaluate(id => !!__tc.Store.get('tokens', id), bau.id)), 'o Desfazer devolve o baú ao chão (e a ficha fica como era)');
    });

    // ---------- o banco ----------
    await passo('o banco', async () => {
      const sonda = async (email, nome) => { const d = await t.device({ name: 'sonda-' + nome }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, email, c.senha, nome); return d; };
      const sB = await sonda(c.mestre, 'Bruno'), sD = await sonda(c.jog1, 'Dalmo'), sL = await sonda(c.jog2, 'Lia');
      const ids = s => s.page.evaluate(async mesa => { const r = await sb.from('documentos').select('id').eq('mesa_id', mesa).like('id', 'best:%'); return r.error ? 'erro' : r.data.length; }, mesa);
      const criar = (s, id, vis) => s.page.evaluate(async ([mesa, id, vis]) => { const r = await sb.from('documentos').upsert({ mesa_id: mesa, id, vis, dados: { v: 1, nome: 'x' }, apagado: false }); return r.error ? 'recusado' : 'ok'; }, [mesa, id, vis]);
      const aux = abas_ => sB.page.evaluate(async ([mesa, u, a]) => { const r = await sb.rpc('definir_auxiliar', { p_mesa: mesa, p_usuario: u, p_auxiliar: true, p_abas: a }); return r.error ? r.error.message : r.data.abas.join(','); }, [mesa, lia, abas_]);
      try {
        ok(await ids(sB) >= 1 && await ids(sD) === 0, 'o mestre lê os inimigos; o Dalmo, nada');
        ok(await criar(sD, 'best:i:sb_dalmo', 'mestre') === 'recusado' && await criar(sD, 'best:i:sb_dalmo2', 'mesa') === 'recusado', 'o Dalmo não cria inimigos');
        ok(await aux(['cenas']) === 'cenas' && await ids(sL) === 0 && await criar(sL, 'best:i:sb_lia', 'mestre') === 'recusado', 'a Lia, auxiliar só das Cenas: não lê nem cria no Bestiário');
        ok(await aux(['cenas', 'bestiario', 'itens']) === 'cenas,bestiario,itens', 'o mestre libera para a Lia o Bestiário e os Itens (o banco aceita as duas abas)');
        ok(await ids(sL) >= 1 && await criar(sL, 'best:i:sb_lia', 'mestre') === 'ok' && await criar(sL, 'itens:sb_teste', 'mestre') === 'ok', 'com a aba, a Lia lê e cria no Bestiário (e nos Itens)');
        ok(await ate(async () => /bestiario/.test(await abas(Lp)), 30000), 'e a aba Bestiário aparece para ela — ' + await abas(Lp));
        const tudo = await sB.page.evaluate(async mesa => { const r = await sb.rpc('definir_auxiliar', { p_mesa: mesa, p_usuario: '00000000-0000-0000-0000-000000000000', p_auxiliar: true, p_abas: null }); return r.error ? r.error.message : 'ok'; }, mesa);
        ok(/não participa/.test(tudo), '(a função continua conferindo quem participa)');
      } finally { for (const s of [sB, sD, sL]) await s.ctx.close(); }
    });
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
