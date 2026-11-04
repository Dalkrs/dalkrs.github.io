// Lote 74, o Clã numa mesa de verdade: o líder (Dalmo) cuida dos recursos, das construções e dos membros; o cofre de
// lapros (pôr da ficha, o líder paga um membro, o mestre põe do nada; quem não é líder não tira); o mestre desfaz a
// última mudança do líder.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const ficha = (nome, extra) => Object.assign({ nome, raca: 'Humana', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 5, fonte: 'total' }, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '',
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }] }, extra);
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Bia'); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'cla', 'tinycats-tour': '1' };
  const M = (await t.device({ name: 'mestre', seed })).page;
  const J = (await t.device({ name: 'jogador', seed })).page;
  const K = (await t.device({ name: 'jogadora2', seed })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 80; i++) { const f = p.frame({ url: re }); if (f) return f; await w(250, p); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await w(300); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const cla = () => M.evaluate(() => { const l = TC.dados.col('documentos').pegar('cla:c:lam'); return l ? JSON.parse(JSON.stringify(l.dados)) : null; });
  const cofre = p => p.evaluate(() => { const l = TC.dados.col('documentos').pegar('cla:cofre:lam'); return l ? JSON.parse(JSON.stringify(l.dados.v)) : null; });
  const lapros = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l && l.estado ? l.estado.lapros || 0 : null; }, id);
  const pedir = (p, op, args) => p.evaluate(([op, args]) => TC.dados.cla(op, args).then(() => 'ok', e => e.message), [op, args]);
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cla 74 E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    for (const [P, conta, nome] of [[J, c.jog1, 'Dalmo'], [K, c.jog2, 'Bia']]) { await P.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, P); await loginTela(P, conta, c.senha); await entrarMesaTela(P, codigo, nome); }
    const dalmo = await J.evaluate(() => TC.conta.usuario.id), bia = await K.evaluate(() => TC.conta.usuario.id);
    await M.evaluate(([f, a, b]) => {
      const P = TC.dados.col('personagens');
      P.gravar('pc_dain', { nome: 'Dain', ficha: Object.assign(JSON.parse(f), { nome: 'Dain' }), skills: {}, estado: { lapros: 100 }, dono_id: a, vis: 'mesa', ordem: 0 });
      P.gravar('pc_lia', { nome: 'Lia', ficha: Object.assign(JSON.parse(f), { nome: 'Lia' }), skills: {}, estado: { lapros: 50 }, dono_id: b, vis: 'mesa', ordem: 1 });
      TC.dados.col('documentos').gravar('cla:c:lam', { vis: 'mestre', dados: { v: 1, nome: 'Lâmina', jogadores: true,
        cargos: { lider: { nome: 'Líder', gente: [{ id: 'p1', pc: 'pc_dain', nome: '', resp: 0 }] }, bat: { nome: 'Batedores', pai: 'lider', ordem: 0, gente: [{ id: 'p2', pc: 'pc_lia', nome: '', resp: 0 }] } },
        recursos: { lista: [{ id: 'rc_m', nome: 'Madeira', qtd: 10 }], hist: [] },
        construcoes: [{ id: 'ct_f', nome: 'Forja', nivel: 0, efeito: '', prox: { custo: [{ rec: 'rc_m', nome: 'Madeira', qtd: 4 }], efeito: 'Armas melhores' } }],
        respeito: { v: 0, hist: [] }, relacoes: [], hist: [] } });
    }, [j(ficha('x')), dalmo, bia]);
    ok(await ate(() => M.evaluate(() => TC.dados.pendentes === 0)), '(o clã dos jogadores, com o Dain no cargo de líder e a Lia nos Batedores)');
    let CJ = null;
    ok(await ate(async () => { CJ = await quadro(J, /\/cla\//); return CJ && await CJ.evaluate(() => !!window.__cla && __cla.pronto && __cla.naMesa); }, 40000), '(o Dalmo abre o Clã)');

    await passo('o líder cuida dos recursos e das construções', async () => {
      await CJ.locator('[data-aba="rec"]').click(); await w(400, J);
      ok(await ate(() => CJ.locator('[data-k="rec:mais:rc_m"]').isVisible(), 8000), 'no Cofre, o líder tem os botões dos recursos');
      await CJ.locator('[data-k="rec:mais:rc_m"]').click();
      ok(await ate(async () => { const x = await cla(); return x.recursos.lista[0].qtd === 11 && x.hist.some(e => e.tipo === 'lider' && /Dain \(líder\)/.test(e.txt)); }), 'somar 1 de Madeira chega ao clã, com o nome do líder no histórico');
      await CJ.locator('[data-aba="cons"]').click(); await w(400, J);
      ok(await ate(() => CJ.locator('[data-k="cons:sobe:ct_f"]').isEnabled(), 8000), 'em Construções, “Subir” para o líder');
      await CJ.locator('[data-k="cons:sobe:ct_f"]').click();
      ok(await ate(async () => { const x = await cla(); return x.construcoes[0].nivel === 1 && x.recursos.lista[0].qtd === 7; }), 'subir a Forja desconta 4 de Madeira do cofre (11 → 7)');
    });

    await passo('o líder anota um membro', async () => {
      await CJ.locator('[data-aba="membros"]').click(); await w(400, J);
      await CJ.locator('[data-k="rol:novo"]').click(); await w(300, J);
      await CJ.locator('#dlg [data-k="dl:nome"]').fill('Oswin'); await CJ.locator('#dlg [data-k="dl:sim"]').click();
      ok(await ate(async () => { const x = await cla(); return x.membros && x.membros.avulsos.some(p => p.nome === 'Oswin'); }), 'o membro novo (Oswin) entra no rol');
    });

    await passo('(lote 75) os números e o Ver | Editar do líder', async () => {
      const nums = (await CJ.locator('#numeros').innerText()).replace(/\s+/g, ' ');
      ok(/membros/.test(nums) && /lapros no cofre/.test(nums) && /\b7\b/.test(nums) && await CJ.locator('[data-k="num:rec:madeira_q1"]').count() === 1 && /1 construções/.test(nums), 'os números do clã no alto: ' + nums);
      ok(await CJ.locator('[data-k="lider-editar"]').getAttribute('aria-pressed') === 'true', '(nos testes, o líder já começa no Editar)');
      await CJ.locator('[data-k="lider-ver"]').click(); await w(300, J);
      ok(!(await CJ.locator('[data-k="rol:novo"]').count()) && await CJ.locator('.rol-cartoes .mbc').count() >= 2, 'no Ver, o rol em cartões, sem os botões de editar');
      if (process.env.FOTOS) await J.screenshot({ path: process.env.FOTOS + '/l75-lider-ver.png' });
      await CJ.locator('[data-k="lider-editar"]').click(); await w(300, J);
      ok(await CJ.locator('[data-k="rol:novo"]').isVisible(), 'no Editar, os botões voltam');
    });

    await passo('o que é só do mestre', async () => {
      const r = await pedir(J, 'lider', { cla: 'lam', partes: { relacoes: [] }, txt: 'x' });
      ok(/o resto é com o mestre/.test(r), 'as relações (e o resto) continuam só do mestre: ' + r);
      const r2 = await pedir(K, 'lider', { cla: 'lam', partes: { recursos: { lista: [], hist: [] } }, txt: 'x' });
      ok(/Só quem ocupa o cargo de líder/.test(r2), 'quem não é o líder não mexe: ' + r2);
    });

    await passo('o cofre de lapros', async () => {
      let CK = null;
      ok(await ate(async () => { CK = await quadro(K, /\/cla\//); return CK && await CK.evaluate(() => !!window.__cla && __cla.pronto); }, 40000), '(a Bia abre o Clã)');
      await CK.locator('[data-aba="rec"]').click(); await w(400, K);
      ok(!(await CK.locator('[data-k="lider-modo"]').count()), '(lote 75) quem não lidera não tem o Ver | Editar');
      ok(await CK.locator('[data-k="cofre:por"]').isVisible() && !(await CK.locator('[data-k="cofre:pagar"]').count()), 'a Bia (membro) põe, mas não paga');
      await CK.locator('[data-k="cofre:por"]').click(); await w(300, K);
      await CK.locator('#dlg [data-k="dl:qtd"]').fill('30'); await CK.locator('#dlg [data-k="dl:sim"]').click();
      ok(await ate(async () => (await cofre(M) || {}).q === 30 && await lapros(M, 'pc_lia') === 20), 'a Lia põe 30: sai da ficha (50 → 20) e entra no cofre (30)');
      const r = await pedir(K, 'cofre', { cla: 'lam', pc: 'pc_lia', qtd: -10 });
      ok(/Só o líder/.test(r), 'e não tira do cofre: ' + r);
      await CJ.locator('[data-aba="rec"]').click(); await w(400, J);
      await CJ.locator('[data-k="cofre:pagar"]').click(); await w(300, J);
      await CJ.locator('#dlg [data-k="dl:pc"]').selectOption('pc_lia'); await CJ.locator('#dlg [data-k="dl:qtd"]').fill('12'); await CJ.locator('#dlg [data-k="dl:nota"]').fill('a escolta');
      await CJ.locator('#dlg [data-k="dl:sim"]').click();
      ok(await ate(async () => (await cofre(M) || {}).q === 18 && await lapros(M, 'pc_lia') === 32), 'o líder paga 12 à Lia (o cofre 30 → 18; a Lia 20 → 32)');
      const cf = await cofre(K);
      ok(cf.ext[0].q === -12 && cf.ext[0].quem === 'Lia' && cf.ext[0].por === 'Dain' && cf.ext[0].nota === 'a escolta', 'o extrato, que todos veem: ' + j(cf.ext[0]));
      const r2 = await pedir(M, 'cofre', { cla: 'lam', pc: null, qtd: 200, nota: 'o saque da cripta' });
      ok(r2 === 'ok' && (await cofre(M)).q === 218 && (await cofre(M)).ext[0].quem === 'O mestre', 'o mestre põe 200 do nada (“O mestre” no extrato)');
      if (process.env.FOTOS) await J.screenshot({ path: process.env.FOTOS + '/l74-cofre.png' });
      const r3 = await M.evaluate(() => TC.dados.col('documentos').gravar('cla:cofre:lam', { dados: { v: { q: 99999, ext: [] } } }));
      ok(await ate(async () => (await cofre(M)).q === 218, 10000), 'gravar o cofre direto não vale (o banco recusa)');
    });

    await passo('o mestre desfaz a última mudança do líder', async () => {
      let CM = null;
      ok(await ate(async () => { CM = await quadro(M, /\/cla\//); return CM && await CM.evaluate(() => !!window.__cla && __cla.pronto && __cla.mestre); }, 40000), '(o mestre abre o Clã)');
      await CM.evaluate(() => __cla.irAba('obras')); await w(500);
      ok(await ate(() => CM.locator('[data-k="lider-ult"]').isVisible(), 8000), 'em Cofre e obras: a última mudança do líder, com Desfazer');
      await CM.locator('[data-k="lider-desfazer"]').click(); await w(300);
      await CM.locator('#dlg [data-k="dl:sim"]').click();
      ok(await ate(async () => { const x = await cla(); return !x.membros.avulsos.some(p => p.nome === 'Oswin'); }), 'desfeito: o Oswin sai do rol (a última mudança do líder)');
    });
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)|Multiple GoTrueClient|Não deu para salvar|O cofre do clã só muda/i.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
