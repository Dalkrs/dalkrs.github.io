// As palavras da Meditação (lote 45) numa mesa de verdade, com o mestre (Bruno), o Dalmo (dono da Selene) e a Lia
// (dona da Brisa):
//   · o mestre dá a palavra “Æthra” à Selene pela tela ("Dar uma palavra…"): ela vai para medit:palavras:pc_selene, com
//     o Dalmo de dono; o aviso vai para a mesa ao vivo em segredo, só para o Dalmo (a Lia não vê);
//   · o Dalmo vê a palavra no dicionário e nos pilares; anota e favorita (na prática); a Lia não lê o dicionário dele;
//   · o banco (SQL 0031): o Dalmo não muda o próprio dicionário, nem a Lia; uma receita com a palavra; o Dalmo acerta
//     Sol → “Æthra”; a palavra que ele não tem (e a escrita errada) não valem; a Selene passa para a Lia e o
//     dicionário vai junto.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const ficha = nome => ({ nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'C', AGI: 'C', VIT: 'D', CAN: 'B' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', itens: [],
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Lia'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1400, h: 900, seed: { 'tinycats:aba': 'meditacao', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1300, h: 880, seed: { 'tinycats:aba': 'meditacao', 'tinycats-tour': '1' } })).page;
  const Lp = (await t.device({ name: 'lia', w: 1200, h: 800, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const pronta = (f, mestre) => f.evaluate(m => !!window.__medit && __medit.pronto && __medit.naMesa && __medit.mestre === m, mestre);
  const docF = (f, id) => f.evaluate(id => __medit.doc(id), id);
  const feed = p => p.evaluate(() => [...document.querySelectorAll('#feed .it')].map(x => x.textContent.replace(/\s+/g, ' ')).join(' ¶ '));
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  // (o banco direto: uma sonda por pessoa, numa página vazia com o cliente do banco)
  const sonda = async (email, nome) => { const d = await t.device({ name: 'sonda-' + nome }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, email, c.senha, nome); return d.page; };
  const rpc = (p, f, a) => p.evaluate(async ([f, a]) => { const r = await sb.rpc(f, a); return r.error ? r.error.message : 'ok ' + JSON.stringify(r.data); }, [f, a]).catch(e => 'erro ' + e.message);
  const mudar = (p, mesa, id, campos) => p.evaluate(async ([mesa, id, campos]) => { const r = await sb.from('documentos').update(campos).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'recusado: ' + r.error.message : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, id, campos]);
  const ler = (p, mesa, id) => p.evaluate(async ([mesa, id]) => { const r = await sb.from('documentos').select('dados, dono_id').eq('mesa_id', mesa).eq('id', id).maybeSingle(); return r.error ? 'erro' : r.data; }, [mesa, id]);

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Palavras E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false, mesa = null, MM = null, MD = null, dalmo = null, lia = null, sB = null, sD = null, sL = null;
  try {
    await passo('a mesa', async () => {
      mesa = await M.evaluate(() => TC.mesas.atual.id);
      await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp);
      await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
      dalmo = await Dp.evaluate(() => TC.conta.usuario.id);
      await Lp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Lp);
      await loginTela(Lp, c.jog2, c.senha); await entrarMesaTela(Lp, codigo, 'Lia');
      lia = await Lp.evaluate(() => TC.conta.usuario.id);
      await M.evaluate(([d, l, fs, fb]) => {
        const P = TC.dados.col('personagens');
        P.gravar('pc_selene', { nome: 'Selene', ficha: fs, skills: {}, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 });
        P.gravar('pc_brisa', { nome: 'Brisa', ficha: fb, skills: {}, estado: {}, dono_id: l, vis: 'mesa', ordem: 1 });
      }, [dalmo, lia, ficha('Selene'), ficha('Brisa')]);
      ok(await ate(() => parado(M)), '(a Selene, do Dalmo, e a Brisa, da Lia)');
      sB = await sonda(c.mestre, 'Bruno'); sD = await sonda(c.jog1, 'Dalmo'); sL = await sonda(c.jog2, 'Lia');
      ok(await ate(async () => { MM = await quadro(M, /\/meditacao\//); return MM && await pronta(MM, true); }, 40000), '(o mestre abre a Meditação)');
    });

    await passo('o mestre dá a palavra', async () => {
      await MM.evaluate(() => __medit.pintar());
      if (await MM.locator('[data-k="m:pc"]').inputValue() !== 'pc_selene') { await MM.locator('[data-k="m:pc"]').selectOption('pc_selene'); await w(300); }
      await MM.locator('[data-k="pal:dar"]').click(); await w(250);
      await MM.locator('[data-k="dp:p"]').fill('Æthra'); await MM.locator('[data-k="dp:s"]').fill('A luz que vem antes do sol');
      await MM.locator('[data-k="dp:sim"]').click(); await w(400);
      ok(await ate(async () => { const r = await ler(sB, mesa, 'medit:palavras:pc_selene'); return r && r.dono_id === dalmo && r.dados.lista.length === 1 && r.dados.lista[0].k === 'aethra' && await parado(M); }),
        'a palavra vai para medit:palavras:pc_selene, com o Dalmo de dono — ' + j(await ler(sB, mesa, 'medit:palavras:pc_selene')));
      ok(await ate(async () => /Palavra nova: “Æthra”/.test(await feed(Dp)), 20000), 'o Dalmo recebe o aviso na mesa ao vivo');
      await w(1500, Lp);
      ok(!/Æthra/.test(await feed(Lp)), 'a Lia não vê o aviso (vai em segredo, só para o Dalmo)');
      await foto(Dp, 'l45-rede-aviso');
    });

    await passo('o Dalmo e o dicionário', async () => {
      ok(await ate(async () => { MD = await quadro(Dp, /\/meditacao\//); return MD && await pronta(MD, false); }, 40000), '(o Dalmo abre a Meditação)');
      ok(await ate(async () => /Æthra/.test(await MD.locator('#painel').innerText()) && /A luz que vem antes do sol/.test(await MD.locator('#painel').innerText())), 'o Dalmo vê a palavra no dicionário, com o sentido');
      const id = (await docF(MD, 'medit:palavras:pc_selene')).lista[0].id;
      await MD.locator(`[data-k="pal:nota:${id}"]`).fill('Funciona ao amanhecer'); await MD.locator(`[data-k="pal:nota:${id}"]`).dispatchEvent('change'); await w(300, Dp);
      await MD.locator(`[data-k="pal:fav:${id}"]`).click(); await w(400, Dp);
      ok(await ate(async () => { const r = await ler(sB, mesa, 'medit:pratica:pc_selene'); return r && r.dados.pal && r.dados.pal[id] && r.dados.pal[id].n === 'Funciona ao amanhecer' && r.dados.pal[id].f === true; }),
        'a nota e a estrela do Dalmo vão para a prática da Selene (o mestre lê)');
      ok(await ler(sL, mesa, 'medit:palavras:pc_selene') === null, 'a Lia não lê o dicionário da Selene');
      ok(/recusado/.test(await mudar(sD, mesa, 'medit:palavras:pc_selene', { dados: { v: 1, lista: [{ p: 'Inventada', k: 'inventada' }] } })), 'o Dalmo não muda o próprio dicionário (o banco recusa)');
      ok(await mudar(sL, mesa, 'medit:palavras:pc_selene', { dados: {} }) === 'nada', 'nem a Lia');
      await foto(Dp, 'l45-rede-dicionario');
    });

    await passo('a receita com a palavra', async () => {
      await M.evaluate(() => { const D = TC.dados.col('documentos'); D.gravar('medit:receitas', { dados: { v: 1, lista: [{ id: 'rc_alvorada', nome: 'Alvorada interior', seq: ['sol', 'w.aethra'], efeito: 'O calor do primeiro sol.', onde: null, quem: null }] }, vis: 'mestre' }); });
      ok(await ate(() => parado(M)), '(a receita Sol → “Æthra”)');
      ok(/^ok/.test(await rpc(sD, 'meditacao_entrar', { p_mesa: mesa, p_pc: 'pc_selene', p_entrar: true })), '(o Dalmo entra na meditação)');
      ok(/^ok/.test(await rpc(sB, 'meditacao_liberar', { p_mesa: mesa, p_pc: 'pc_selene', p_mais: 3 })), '(o mestre libera tentativas)');
      ok(/não está no dicionário/.test(await rpc(sD, 'meditacao_tentar', { p_mesa: mesa, p_pc: 'pc_selene', p_seq: ['sol', 'w.kaen'] })), 'uma palavra que a Selene não tem não vale');
      ok(/Há um símbolo que não existe/.test(await rpc(sD, 'meditacao_tentar', { p_mesa: mesa, p_pc: 'pc_selene', p_seq: ['sol', 'w.Æthra'] })), 'a palavra escrita fora da chave também não');
      const r = await rpc(sD, 'meditacao_tentar', { p_mesa: mesa, p_pc: 'pc_selene', p_seq: ['sol', 'w.aethra'] });
      ok(/"res":"achou"/.test(r) && /Alvorada interior/.test(r), 'Sol → “Æthra”: a Selene descobre a receita — ' + r);
      ok(await ate(async () => /Usada em: Alvorada interior/.test(await MD.locator('#painel').innerText())), 'no dicionário do Dalmo, a palavra mostra onde foi usada');
    });

    await passo('a Selene muda de dono', async () => {
      await M.evaluate(l => { const P = TC.dados.col('personagens'); P.gravar('pc_selene', { dono_id: l }); }, lia);
      ok(await ate(async () => { const r = await ler(sB, mesa, 'medit:palavras:pc_selene'); return r && r.dono_id === lia && await parado(M); }), 'o dicionário passa para a Lia, com a Selene');
      ok(await ate(async () => { const r = await ler(sL, mesa, 'medit:palavras:pc_selene'); return r && r.dados.lista.length === 1; }), 'a Lia agora lê o dicionário');
    });

    await ate(async () => await M.evaluate(() => TC.dados.pendentes === 0));
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|403|409)/.test(e) && !(/^\[sonda-/.test(e) && /status of/.test(e)));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
