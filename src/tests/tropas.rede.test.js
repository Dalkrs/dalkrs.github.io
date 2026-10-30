// As tropas (lote 40) numa mesa de verdade (o banco local de ensaio), com o mestre (Bruno), o Dalmo (dono da Selene)
// e a Lia (dona da Brisa), em aparelhos separados:
//   · o mestre dá uma tropa à Selene nas Fichas ("+ Tropas") e mexe nos números (uma unidade nova, as tropas, a
//     veterania);
//   · o banco: a tropa chega ao Dalmo (é dele) e não à Lia; o Dalmo muda as escolhas, mas não os números, nem a
//     visibilidade, nem apaga; ninguém além de quem mestra cria uma tropa (SQL 0029);
//   · o Dalmo vê a aba Tropas da Selene, sem as ferramentas do mestre, e escolhe o nome, a raça, a classe e os
//     equipamentos de uma unidade — o mestre vê na hora; a Lia, que também vê a ficha da Selene, não tem a aba;
//   · o mestre registra uma batalha: o Dalmo vê as baixas, e as escolhas dele continuam;
//   · a ficha passa para a Lia: a tropa vai junto (o Dalmo deixa de recebê-la).
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const ficha = nome => ({ nome, raca: 'Humana', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 8, tiers: { FOR: 'A', DES: 'C', AGI: 'C', VIT: 'D', CAN: 'B' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', itens: [],
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '60' }] });
const BIB = { nome: 'b', pools: [{ id: 'p', nome: 'Pontos', padrao: 0 }], usos: [], arvores: [
  { id: 'ar_humano', nome: 'Humano', categoria: 'raca', nodes: [] }, { id: 'ar_elfo', nome: 'Elfo', categoria: 'raca', nodes: [] },
  { id: 'cl_guerreiro', nome: 'Guerreiro', categoria: 'classe', nodes: [] }] };

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Lia'); await d.ctx.close(); }
  const errosDeFora = () => t.errs.filter(e => !/^\[sonda-/.test(e) || !/status of (400|401|403|409)/.test(e)).filter(e => !/status of (400|401|409)/.test(e));
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1440, h: 1000, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Lp = (await t.device({ name: 'lia', w: 1360, h: 900, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const abrirSelene = f => f.evaluate(() => { S.sel = 'pc_selene'; render(); });
  const docM = () => M.evaluate(() => { const l = TC.dados.col('documentos').pegar('fichas:tropas:pc_selene'); return l && !l.apagado ? { dados: JSON.parse(JSON.stringify(l.dados)), dono: l.dono_id, vis: l.vis } : null; });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Tropas E2E ' + Date.now().toString(36);
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
      P.gravar('pc_selene', { nome: 'Selene', ficha: fs, skills: {}, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 });
      P.gravar('pc_brisa', { nome: 'Brisa', ficha: fb, skills: {}, estado: {}, dono_id: l, vis: 'mesa', ordem: 1 });
    }, [dalmo, lia, ficha('Selene'), ficha('Brisa'), BIB]);
    ok(await ate(() => parado(M)), '(a Selene, do Dalmo; a Brisa, da Lia — as duas à mostra para a mesa; as árvores de raça e de classe)');

    // ---------------- o mestre dá a tropa e mexe nos números ----------------
    let FM = null;
    ok(await ate(async () => { FM = await quadro(M, /\/fichas\//); return FM && await FM.evaluate(() => typeof FichasTropas !== 'undefined' && FichasMesa.ativo() && S.personagens.some(p => p.id === 'pc_selene')); }, 40000), '(o mestre abre as Fichas)');
    await abrirSelene(FM); await w(300);
    await FM.locator('[data-trcriar]').click(); await w(300);
    await FM.locator('[data-trnova]').click(); await w(300);
    let d0 = null;
    ok(await ate(async () => { d0 = await docM(); return !!d0 && d0.dados.unid.length === 2 && d0.dono === dalmo && d0.vis === 'mestre'; }) && await ate(() => parado(M)),
      '"+ Tropas" e "+ Unidade": o documento da tropa da Selene, com o Dalmo como dono, fora da mesa, com duas unidades');
    const ua = d0.dados.unid[0].id, ub = d0.dados.unid[1].id;
    await FM.locator('#tropasAba .tr-carta[data-trunid="' + ua + '"] [data-trnum]').click(); await w(250);
    await FM.locator('.tr-janela [data-trn="tropas"]').fill('250'); await FM.locator('.tr-janela [data-trn="vet"]').selectOption('3');
    await FM.locator('.tr-janela [data-jok]').click();
    ok(await ate(async () => { const d = await docM(); const u = d.dados.unid.find(x => x.id === ua); return u.tropas === 250 && u.vet === 3; }) && await ate(() => parado(M)), 'o mestre muda os números: 250 soldados, Elite');

    // ---------------- o banco ----------------
    const sonda = async (email, nome) => { const d = await t.device({ name: 'sonda-' + nome }); sondas.push(d); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, email, c.senha, nome); return d.page; };
    const sD = await sonda(c.jog1, 'Dalmo'), sL = await sonda(c.jog2, 'Lia');
    const ler = (s, id) => s.evaluate(async ([mesa, id]) => { const r = await sb.from('documentos').select('dados, dono_id, vis').eq('mesa_id', mesa).eq('id', id).maybeSingle(); return r.error || !r.data ? null : r.data; }, [mesa, id]);
    const mudar = (s, id, campos) => s.evaluate(async ([mesa, id, campos]) => { const r = await sb.from('documentos').update(campos).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, id, campos]);
    const criar = (s, linha) => s.evaluate(async ([mesa, linha]) => { const r = await sb.from('documentos').insert(Object.assign({ mesa_id: mesa, dados: {}, apagado: false }, linha)); return r.error ? 'recusado' : 'ok'; }, [mesa, linha]);
    const doBanco = await ler(sD, 'fichas:tropas:pc_selene');
    ok(!!doBanco && doBanco.dados.unid.length === 2 && await ler(sL, 'fichas:tropas:pc_selene') === null, 'a tropa da Selene chega ao Dalmo (o dono) e não à Lia');
    const comNumeros = JSON.parse(JSON.stringify(doBanco.dados)); comNumeros.unid[0].tropas = 9999;
    ok(await mudar(sD, 'fichas:tropas:pc_selene', { dados: comNumeros }) === 'recusado' && (await ler(sD, 'fichas:tropas:pc_selene')).dados.unid[0].tropas === 250, 'o Dalmo não muda os números (9999 soldados: recusado)');
    const semUnid = JSON.parse(JSON.stringify(doBanco.dados)); semUnid.unid.pop();
    ok(await mudar(sD, 'fichas:tropas:pc_selene', { dados: semUnid }) === 'recusado', 'nem tira uma unidade');
    const moral = JSON.parse(JSON.stringify(doBanco.dados)); moral.moral = 10;
    ok(await mudar(sD, 'fichas:tropas:pc_selene', { dados: moral }) === 'recusado', 'nem a moral');
    ok(await mudar(sD, 'fichas:tropas:pc_selene', { vis: 'mesa' }) === 'recusado' && await mudar(sD, 'fichas:tropas:pc_selene', { apagado: true }) === 'recusado', 'nem mostra a tropa para a mesa, nem a apaga');
    const soNome = JSON.parse(JSON.stringify(doBanco.dados)); soNome.unid[1].nome = 'Arqueiros do Bosque'; soNome.unid[1].equip = ['eq_arco'];
    ok(await mudar(sD, 'fichas:tropas:pc_selene', { dados: soNome }) === 'ok' && (await ler(sD, 'fichas:tropas:pc_selene')).dados.unid[1].nome === 'Arqueiros do Bosque', 'as escolhas (o nome e o equipamento de uma unidade), sim');
    ok(await criar(sL, { id: 'fichas:tropas:pc_brisa', vis: 'mestre', dono_id: lia, dados: { v: 1, unid: [{ id: 'x', tropas: 9000, vet: 3 }] } }) === 'recusado'
      && await criar(sD, { id: 'fichas:tropas:pc_selene2', vis: 'mestre', dono_id: dalmo, dados: { v: 1, unid: [] } }) === 'recusado', 'nenhum jogador cria uma tropa (a Lia para a Brisa, o Dalmo outra)');
    ok(await ate(async () => (await docM()).dados.unid[1].nome === 'Arqueiros do Bosque'), 'o mestre recebe a escolha do Dalmo');

    // ---------------- o que cada um vê ----------------
    let FD = null, FL = null;
    ok(await ate(async () => { FD = await quadro(Dp, /\/fichas\//); return FD && await FD.evaluate(() => typeof FichasTropas !== 'undefined' && FichasMesa.ativo() && S.personagens.some(p => p.id === 'pc_selene')); }, 40000), '(o Dalmo abre as Fichas)');
    await abrirSelene(FD); await w(400, Dp);
    await FD.locator('[data-abaficha="tropas"]').click(); await w(300, Dp);
    ok(await FD.locator('#tropasAba .tr-carta').count() === 2 && await FD.locator('#tropasAba [data-trnum], #tropasAba [data-trnova], #tropasAba [data-trbatalha], #tropasAba [data-trvet], #tropasAba [data-trdispensar], [data-trcriar]').count() === 0
      && /Os números são do mestre/.test(await FD.locator('.tr-faixa').innerText()) && await FD.locator('#tropasAba [data-tresc]').count() === 2,
      'o Dalmo vê a aba Tropas da Selene (as duas cartas), sem as ferramentas do mestre, com "Editar o que é seu" em cada carta');
    await FD.locator('#tropasAba .tr-carta[data-trunid="' + ua + '"] [data-tresc]').click(); await w(300, Dp);
    const J = FD.locator('.tr-janela');
    await J.locator('[data-trnome]').fill('Lanças de Merunê'); await J.locator('[data-trraca]').selectOption('ar_humano'); await J.locator('[data-trclasse]').selectOption('cl_guerreiro');
    await J.locator('[data-treq="eq_lanca"]').check(); await J.locator('[data-mforma="redondo"]').click();
    await J.locator('[data-jok]').click(); await w(300, Dp);
    ok(await ate(async () => { const d = await docM(); const u = d.dados.unid.find(x => x.id === ua); return u.nome === 'Lanças de Merunê' && u.raca === 'ar_humano' && u.classe === 'cl_guerreiro' && j(u.equip) === j(['eq_lanca']) && u.bras.forma === 'redondo' && u.tropas === 250 && u.vet === 3; }),
      'o Dalmo escolhe o nome, a raça, a classe, o equipamento e o brasão das Lanças — o mestre recebe, com os números como estavam');
    ok(await ate(async () => /Lanças de Merunê/.test(await FM.locator('#tropasAba').innerText())), 'a carta do mestre mostra o nome novo na hora');
    const errosDalmo = await Dp.evaluate(() => TC.dados.erro || null);
    ok(!errosDalmo, 'nenhuma gravação do Dalmo foi recusada: ' + errosDalmo);
    ok(await ate(async () => { FL = await quadro(Lp, /\/fichas\//); return FL && await FL.evaluate(() => typeof FichasTropas !== 'undefined' && FichasMesa.ativo() && S.personagens.some(p => p.id === 'pc_selene')); }, 40000), '(a Lia abre as Fichas)');
    await abrirSelene(FL); await w(400, Lp);
    ok(/Selene/.test(await FL.locator('#f_nome').inputValue()) && await FL.locator('[data-abaficha="tropas"], #tropasAba, [data-trcriar]').count() === 0, 'a Lia vê a ficha da Selene sem a aba Tropas');

    // ---------------- a batalha do mestre chega ao Dalmo ----------------
    await FM.locator('[data-trbatalha]').click(); await w(250);
    await FM.locator('.tr-janela [data-trbt]').fill('Cerco de Ostra'); await FM.locator('.tr-janela [data-trbx="' + ua + '"]').fill('41');
    await FM.locator('.tr-janela [data-jok]').click();
    ok(await ate(async () => /209/.test(await FD.locator('#tropasAba .tr-carta[data-trunid="' + ua + '"]').innerText()) && /Cerco de Ostra/.test(await FD.locator('.tr-diario').innerText())),
      'o mestre registra o Cerco de Ostra (41 baixas): o Dalmo vê 209 soldados e a linha no diário');
    ok(/Lanças de Merunê/.test(await FD.locator('#tropasAba').innerText()) && /Arqueiros do Bosque/.test(await FD.locator('#tropasAba').innerText()), 'e as escolhas dele continuam');
    await FD.evaluate(() => document.getElementById('tropasAba').scrollIntoView()); await w(300, Dp);
    await foto(Dp, 'tropas-rede-dalmo');

    // ---------------- a ficha muda de dono ----------------
    await FM.locator('[data-abaficha="atributos"]').click(); await w(200);
    await FM.locator('#f_dono').selectOption(lia);
    ok(await ate(async () => (await docM()).dono === lia) && await ate(() => parado(M)), 'a Selene passa para a Lia: a tropa vai junto (o dono do documento muda)');
    ok(await ate(async () => !!(await ler(sL, 'fichas:tropas:pc_selene')) && await ler(sD, 'fichas:tropas:pc_selene') === null), 'agora a Lia recebe a tropa, e o Dalmo não');

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
