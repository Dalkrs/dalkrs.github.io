// A corrupção (lote 37) numa mesa de verdade (o banco local de ensaio), com o mestre (Bruno), o Dalmo (dono da Selene)
// e a Lia (dona da Brisa), em aparelhos separados:
//   · o mestre escolhe a corrupção vampírica da Selene nas Fichas (a árvore de linhagem dela vem escolhida);
//   · o banco: o documento da corrupção chega ao Dalmo (é dele) e não à Lia; só quem mestra o muda (SQL 0028);
//   · o Dalmo vê o efeito na ficha da Selene, sem o painel do mestre; a Lia, que também vê a ficha da Selene, não vê
//     corrupção nenhuma; quando o mestre sobe o estágio, a ficha do Dalmo pulsa e avisa;
//   · nas Cenas, a aura do token da Selene existe para o mestre e para o Dalmo, e não para a Lia.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const ficha = nome => ({ nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'C', AGI: 'C', VIT: 'D', CAN: 'B' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', itens: [],
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '60' }] });
const BIB = { nome: 'b', pools: [{ id: 'lin', nome: 'Linhagem', padrao: 0 }], usos: [], arvores: [
  { id: 'av', nome: 'Linhagem do Vampiro', categoria: 'linhagem', nodes: [{ id: 'r', nome: 'Sangue', pais: [], graus: [{ custos: { lin: 3 } }, { custos: { lin: 5 } }, { custos: { lin: 7 } }, { custos: { lin: 10 } }, { custos: { lin: 15 } }] }] }] };

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Lia'); await d.ctx.close(); }
  const errosDeFora = () => t.errs.filter(e => !/^\[sonda-/.test(e) || !/status of (400|401|403|409)/.test(e)).filter(e => !/status of (400|401|409)/.test(e));
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1440, h: 900, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Lp = (await t.device({ name: 'lia', w: 1360, h: 900, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const abrirSelene = f => f.evaluate(() => { S.sel = 'pc_selene'; render(); });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Corrupção E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false;
  const sondas = [];
  try {
    const mesa = await M.evaluate(() => TC.mesas.atual.id);
    await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp);
    await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    const dalmo = await Dp.evaluate(() => TC.conta.usuario.id);
    await Lp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Lp);
    await loginTela(Lp, c.jog2, c.senha); await entrarMesaTela(Lp, codigo, 'Lia');
    const lia = await Lp.evaluate(() => TC.conta.usuario.id);
    await M.evaluate(([d, l, fs, fb, bib]) => {
      const P = TC.dados.col('personagens'), D = TC.dados.col('documentos');
      D.gravar('arvore:biblioteca', { dados: bib, vis: 'mestre' }); D.gravar('arvore:pacote', { dados: bib, vis: 'mesa' });
      P.gravar('pc_selene', { nome: 'Selene', ficha: fs, skills: { arvores: ['av'], pontos: {}, alocados: { r: 2 } }, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 });
      P.gravar('pc_brisa', { nome: 'Brisa', ficha: fb, skills: {}, estado: {}, dono_id: l, vis: 'mesa', ordem: 1 });
    }, [dalmo, lia, ficha('Selene'), ficha('Brisa'), BIB]);
    ok(await ate(() => parado(M)), '(a Selene, do Dalmo, com 8 pontos na Linhagem do Vampiro; a Brisa, da Lia — as duas à mostra para a mesa)');

    // ---------------- o mestre escolhe a corrupção, nas Fichas ----------------
    let FM = null;
    ok(await ate(async () => { FM = await quadro(M, /\/fichas\//); return FM && await FM.evaluate(() => typeof FichasCorr !== 'undefined' && FichasMesa.ativo() && S.personagens.some(p => p.id === 'pc_selene')); }, 40000), '(o mestre abre as Fichas)');
    await abrirSelene(FM); await w(300);
    await FM.locator('#corrBarra [data-corrtipo="vamp"]').click();
    ok(await ate(async () => { const d = await M.evaluate(() => { const l = TC.dados.col('documentos').pegar('fichas:corr:pc_selene'); return l ? { dados: l.dados, dono: l.dono_id, vis: l.vis } : null; }); return !!d && d.dados.tipo === 'vamp' && d.dados.arv === 'av' && d.dono === dalmo && d.vis === 'mestre'; }) && await ate(() => parado(M)),
      'o mestre escolhe Vampírica: o documento da corrupção da Selene, com o Dalmo como dono, fora da mesa');

    // ---------------- o banco ----------------
    const sonda = async (email, nome) => { const d = await t.device({ name: 'sonda-' + nome }); sondas.push(d); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, email, c.senha, nome); return d.page; };
    const sD = await sonda(c.jog1, 'Dalmo'), sL = await sonda(c.jog2, 'Lia');
    const ler = (s, id) => s.evaluate(async ([mesa, id]) => { const r = await sb.from('documentos').select('dados, dono_id').eq('mesa_id', mesa).eq('id', id).maybeSingle(); return r.error || !r.data ? null : r.data; }, [mesa, id]);
    const mudar = (s, id, campos) => s.evaluate(async ([mesa, id, campos]) => { const r = await sb.from('documentos').update(campos).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, id, campos]);
    const criar = (s, linha) => s.evaluate(async ([mesa, linha]) => { const r = await sb.from('documentos').insert(Object.assign({ mesa_id: mesa, dados: {}, apagado: false }, linha)); return r.error ? 'recusado' : 'ok'; }, [mesa, linha]);
    ok(((await ler(sD, 'fichas:corr:pc_selene')) || { dados: {} }).dados.tipo === 'vamp' && await ler(sL, 'fichas:corr:pc_selene') === null, 'a corrupção da Selene chega ao Dalmo (o dono) e não à Lia');
    ok(await mudar(sD, 'fichas:corr:pc_selene', { dados: { v: 1, tipo: null } }) === 'recusado' && ((await ler(sD, 'fichas:corr:pc_selene')) || { dados: {} }).dados.tipo === 'vamp',
      'o Dalmo não tira a corrupção (só quem mestra as Fichas muda)');
    ok(await criar(sL, { id: 'fichas:corr:pc_brisa', vis: 'mestre', dono_id: lia, dados: { v: 1, tipo: 'demo', estagio: 5 } }) === 'recusado', 'a Lia não cria uma corrupção para a Brisa');

    // ---------------- o que cada um vê ----------------
    let FD = null, FL = null;
    ok(await ate(async () => { FD = await quadro(Dp, /\/fichas\//); return FD && await FD.evaluate(() => typeof FichasCorr !== 'undefined' && FichasMesa.ativo() && S.personagens.some(p => p.id === 'pc_selene')); }, 40000), '(o Dalmo abre as Fichas)');
    await abrirSelene(FD); await w(400, Dp);
    ok(await ate(async () => /corr-vamp/.test(await FD.evaluate(() => document.getElementById('ficha').className))) && await FD.locator('#corrBarra').count() === 0 && /Vampírica · Sedento/.test(await FD.locator('.corr-chip').innerText()),
      'o Dalmo vê a Selene corrompida (Sedento, estágio 2), sem o painel do mestre');
    ok(await ate(async () => { FL = await quadro(Lp, /\/fichas\//); return FL && await FL.evaluate(() => typeof FichasCorr !== 'undefined' && FichasMesa.ativo() && S.personagens.some(p => p.id === 'pc_selene')); }, 40000), '(a Lia abre as Fichas)');
    await abrirSelene(FL); await w(400, Lp);
    ok(/Selene/.test(await FL.locator('#f_nome').inputValue()) && !/corr-/.test(await FL.evaluate(() => document.getElementById('ficha').className)) && await FL.locator('.corr-chip, .corr-fx, #corrBarra').count() === 0,
      'a Lia vê a ficha da Selene sem corrupção nenhuma');
    // o mestre sobe o estágio: a ficha do Dalmo pulsa e avisa
    await FM.locator('#corrBarra [data-corrpm="1"]').click();
    ok(await ate(async () => /Noturno/.test(await FD.locator('.corr-chip').innerText())) && await ate(async () => /A corrupção avança: Noturno/.test(await FD.evaluate(() => document.body.innerText))),
      'o mestre sobe um estágio: o Dalmo vê "Noturno" e o aviso "A corrupção avança"');
    await foto(Dp, 'corr-rede-dalmo');

    // ---------------- a aura nas Cenas ----------------
    const auraEm = async p => {
      const tab = p.locator('#tab-cenas'); await tab.click();
      let f = null;
      if (!await ate(async () => { f = await quadro(p, /\/cenas\//); return f && await f.evaluate(() => !!window.__tc && !!__tc.Fichas); }, 40000)) return 'sem cenas';
      let r = null;
      // (o que roda na página não enxerga as funções daqui: o JSON.stringify vai escrito lá dentro)
      await ate(async () => { r = await f.evaluate(() => JSON.stringify(__tc.Fichas.corrDoTok({ char: 'pc_selene' }))); return r !== 'null'; }, 8000);
      return r;
    };
    const aM = await auraEm(M), aD = await auraEm(Dp), aL = await auraEm(Lp);
    ok(/"tipo":"vamp","n":3/.test(aM) && /"tipo":"vamp","n":3/.test(aD) && aL === 'null', 'a aura do token da Selene: para o mestre e para o Dalmo (vampírica, estágio 3); para a Lia, nada — ' + j([aM, aD, aL]));

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    for (const d of sondas) { try { await d.ctx.close(); } catch (e) { /* já fechada */ } }
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
