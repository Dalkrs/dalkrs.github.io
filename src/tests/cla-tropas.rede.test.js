// As tropas do clã e os soldados com nome (lote 42) numa mesa de verdade (o banco local de ensaio), com o mestre
// (Bruno), o Dalmo (dono da Selene, que lidera o Clã Garret) e a Lia (dona da Brisa, Marechal do clã):
//   · na aba Clã, o mestre cadastra as tropas escolhendo quem lidera (a Brisa, a Selene): cada uma é a tropa da ficha
//     de quem lidera, com o clã dentro; quem já lidera uma tropa do clã não aparece de novo;
//   · o banco: o líder do clã (o Dalmo) recebe as tropas do clã, só para ler; a Lia, só a dela; ninguém além de quem
//     mestra muda para quem a tropa vai (SQL 0025/0030); a Lia salva os soldados com nome da tropa dela (SQL 0030);
//   · o salão: a aba Tropas — o Dalmo vê as duas, com as unidades; a Lia, a dela;
//   · a liderança passa para a Brisa: as tropas passam a ir para a Lia; "Tirar do clã" — a tropa sai do clã (fica na
//     ficha) e deixa de ir para o líder; "Abrir na ficha" abre as Fichas na aba Tropas.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const C = require('../../cla/nucleo.js');
const { ok, end } = checker();
const j = JSON.stringify;
const ficha = nome => ({ nome, raca: 'Humana', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 6, tiers: { FOR: 'A', DES: 'C', AGI: 'C', VIT: 'D', CAN: 'B' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', itens: [],
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '60' }] });
const BIB = { nome: 'b', pools: [{ id: 'p', nome: 'Pontos', padrao: 0 }], usos: [], arvores: [{ id: 'ar_elfo', nome: 'Elfo', categoria: 'raca', nodes: [] }, { id: 'cl_arq', nome: 'Arqueiro', categoria: 'classe', nodes: [] }] };
const claDe = lider => C.normCla({ v: 1, nome: 'Clã Garret', jogadores: true, ver: {}, brasao: { forma: 'escudo', div: 'cortado', cores: ['#5b3f8a', '#e8eaf0'], simb: 'lobo' },
  cargos: { lider: { nome: 'Líder', gente: [{ id: 'ps_l', pc: lider, nome: '', resp: 0 }] }, cg_m: { nome: 'Marechal', pai: 'lider', ordem: 1, gente: [{ id: 'ps_m', pc: lider === 'pc_selene' ? 'pc_brisa' : 'pc_selene', nome: '', resp: 0 }] } } });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Lia'); await d.ctx.close(); }
  const errosDeFora = () => t.errs.filter(e => !/^\[prep\]/.test(e) && !/^\[sonda-/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/status of (400|401|403|409)/.test(e));
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'cla', 'tinycats-tour': '1', 'tinycats:cla:tudo': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1440, h: 950, seed: { 'tinycats:aba': 'cla', 'tinycats-tour': '1' } })).page;
  const Lp = (await t.device({ name: 'lia', w: 1360, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const docM = id => M.evaluate(id => { const l = TC.dados.col('documentos').pegar(id); return l && !l.apagado ? JSON.parse(JSON.stringify({ dados: l.dados, dono: l.dono_id, para: l.para || null })) : null; }, id);

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Tropas Cla E2E ' + Date.now().toString(36);
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
    await M.evaluate(([d, l, fs, fb, cla, bib]) => {
      const P = TC.dados.col('personagens'), D = TC.dados.col('documentos');
      D.gravar('arvore:biblioteca', { dados: bib, vis: 'mestre' }); D.gravar('arvore:pacote', { dados: bib, vis: 'mesa' });
      P.gravar('pc_selene', { nome: 'Selene', ficha: fs, skills: {}, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 });
      P.gravar('pc_brisa', { nome: 'Brisa', ficha: fb, skills: {}, estado: {}, dono_id: l, vis: 'mesa', ordem: 1 });
      D.gravar('cla:c:cl_garret', { dados: cla, vis: 'mestre' });
    }, [dalmo, lia, ficha('Selene'), ficha('Brisa'), claDe('pc_selene'), BIB]);
    ok(await ate(() => parado(M)), '(a Selene, do Dalmo, lidera o Clã Garret; a Brisa, da Lia, é a Marechal)');

    // ---------------- o mestre cadastra as tropas ----------------
    let K = null;
    ok(await ate(async () => { K = await quadro(M, /\/cla\//); return K && await K.evaluate(() => !!window.__cla && __cla.pronto && __cla.naMesa && __cla.mestre); }, 40000), '(o mestre abre o Clã)');
    const sec = K.locator('[data-k="sec:tropas"]');
    ok(await ate(async () => (await sec.count()) === 1 && /Nenhuma tropa ainda/.test(await sec.innerText())), 'no clã, "Tropas do clã": nenhuma ainda, com "+ Tropa"');
    const cadastrar = async pc => {
      await K.locator('[data-k="tr:nova"]').click(); await w(300);
      await K.locator('#dlg [data-k="tr:lider"]').selectOption(pc); await K.locator('#dlg [data-k="dl:sim"]').click(); await w(500);
    };
    await cadastrar('pc_brisa');
    let db = null;
    ok(await ate(async () => { db = await docM('fichas:tropas:pc_brisa'); return !!db && db.dados.cla === 'cl_garret' && db.dono === lia && j(db.para) === j([dalmo]) && db.dados.unid.length === 1; }) && await ate(() => parado(M)),
      '+ Tropa (a Brisa): a tropa nasce na ficha dela, com o clã dentro, a Lia como dona e o Dalmo (o líder do clã) na lista de quem recebe: ' + j(db && { cla: db.dados.cla, para: db.para }));
    await cadastrar('pc_selene');
    ok(await ate(async () => { const d = await docM('fichas:tropas:pc_selene'); return !!d && d.dados.cla === 'cl_garret' && d.dono === dalmo; }) && await ate(() => parado(M)), '+ Tropa (a Selene): a tropa dela, no clã');
    ok(await ate(async () => (await sec.locator('.tropa-cla').count()) === 2 && /Guarda de Brisa\s*liderada por Brisa/.test(await sec.innerText())), 'as duas tropas na lista do clã (liderada por…)');
    await K.locator('[data-k="tr:nova"]').click(); await w(300);
    ok(await ate(async () => /já lideram uma tropa deste clã/.test(await M.evaluate(() => [...document.querySelectorAll('iframe')].map(f => { try { return f.contentDocument.body.innerText; } catch (e) { return ''; } }).join(' ')))), 'quem já lidera uma tropa do clã não aparece de novo (sem ninguém: o aviso)');
    await K.evaluate(() => document.querySelector('[data-k="sec:tropas"]').scrollIntoView({ block: 'center' })); await w(300);
    await foto(M, 'tropas-cla-mestre');

    // ---------------- o banco ----------------
    const sonda = async (email, nome) => { const d = await t.device({ name: 'sonda-' + nome }); sondas.push(d); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, email, c.senha, nome); return d.page; };
    const sD = await sonda(c.jog1, 'Dalmo'), sL = await sonda(c.jog2, 'Lia');
    const ler = (s, id) => s.evaluate(async ([mesa, id]) => { const r = await sb.from('documentos').select('dados, para').eq('mesa_id', mesa).eq('id', id).maybeSingle(); return r.error || !r.data ? null : r.data; }, [mesa, id]);
    const mudar = (s, id, campos) => s.evaluate(async ([mesa, id, campos]) => { const r = await sb.from('documentos').update(campos).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, id, campos]);
    ok(!!(await ler(sD, 'fichas:tropas:pc_brisa')) && !!(await ler(sD, 'fichas:tropas:pc_selene')), 'o Dalmo (o líder do clã) recebe as duas tropas do clã');
    ok(!!(await ler(sL, 'fichas:tropas:pc_brisa')) && await ler(sL, 'fichas:tropas:pc_selene') === null, 'a Lia recebe só a dela');
    const brisa = (await ler(sL, 'fichas:tropas:pc_brisa')).dados;
    const outra = JSON.parse(JSON.stringify(brisa)); outra.unid[0].nome = 'Do Dalmo';
    ok(await mudar(sD, 'fichas:tropas:pc_brisa', { dados: outra }) !== 'ok', 'o Dalmo não muda a tropa da Brisa (só lê)');
    ok(await mudar(sD, 'fichas:tropas:pc_selene', { para: [dalmo, lia] }) === 'recusado' && await mudar(sL, 'fichas:tropas:pc_brisa', { para: null }) === 'recusado', 'ninguém além de quem mestra muda para quem a tropa vai');
    const comSold = JSON.parse(JSON.stringify(brisa)); comSold.unid[0].sold = [{ id: 'sd_1', nome: 'Ilya', raca: 'ar_elfo', racaN: 'Elfo', classe: 'cl_arq', classeN: 'Arqueiro' }];
    ok(await mudar(sL, 'fichas:tropas:pc_brisa', { dados: comSold }) === 'ok', 'a Lia salva um soldado com nome na tropa dela (escolha do jogador: SQL 0030)');
    const comNum = JSON.parse(JSON.stringify(comSold)); comNum.unid[0].tropas = 5000;
    ok(await mudar(sL, 'fichas:tropas:pc_brisa', { dados: comNum }) === 'recusado', 'mas não os números (a tranca de sempre)');
    const semCla = JSON.parse(JSON.stringify(comSold)); delete semCla.cla;
    ok(await mudar(sL, 'fichas:tropas:pc_brisa', { dados: semCla }) === 'recusado', 'nem tira a tropa do clã (o clã é do mestre)');

    // ---------------- o salão: a aba Tropas ----------------
    let KD = null, KL = null;
    ok(await ate(async () => { KD = await quadro(Dp, /\/cla\//); return KD && await KD.evaluate(() => !!window.__cla && __cla.pronto && __cla.naMesa && !__cla.mestre); }, 40000), '(o Dalmo abre o Clã)');
    ok(await ate(async () => (await KD.locator('#abas [data-aba="tropas"]').count()) === 1), 'o Dalmo tem a aba Tropas no salão do clã');
    await KD.locator('#abas [data-aba="tropas"]').click(); await w(400, Dp);
    const verD = KD.locator('[data-k="ver:tropas"]');
    ok(await ate(async () => (await verD.locator('.tropa-ver').count()) === 2 && /Você lidera o clã/.test(await verD.innerText()) && /Ilya|1 com nome/.test(await verD.innerText()) && (await verD.locator('[data-k^="tr:tirar"]').count()) === 0),
      'o Dalmo vê as duas tropas do clã, com as unidades (e o soldado com nome da Lia), sem poder tirar nada');
    await foto(Dp, 'tropas-cla-dalmo');
    await Lp.locator('#tab-cla').click(); await w(500, Lp);
    ok(await ate(async () => { KL = await quadro(Lp, /\/cla\//); return KL && await KL.evaluate(() => !!window.__cla && __cla.pronto && __cla.naMesa); }, 40000), '(a Lia abre o Clã)');
    ok(await ate(async () => (await KL.locator('#abas [data-aba="tropas"]').count()) === 1), 'a Lia também tem a aba Tropas (a tropa dela é do clã)');
    await KL.locator('#abas [data-aba="tropas"]').click(); await w(400, Lp);
    ok(await ate(async () => { const v = KL.locator('[data-k="ver:tropas"]'); return (await v.locator('.tropa-ver').count()) === 1 && /A sua tropa/.test(await v.innerText()) && /liderada por Brisa \(você\)/.test(await v.innerText()); }), 'a Lia vê só a dela ("A sua tropa", liderada por Brisa — você)');

    // ---------------- os soldados nas Fichas (a Lia) ----------------
    await Lp.locator('#tab-fichas').click(); await w(500, Lp);
    let FL = null;
    ok(await ate(async () => { FL = await quadro(Lp, /\/fichas\//); return FL && await FL.evaluate(() => typeof FichasTropas !== 'undefined' && FichasMesa.ativo() && S.personagens.some(p => p.id === 'pc_brisa') && FichasTropas.tem(S.personagens.find(p => p.id === 'pc_brisa'))); }, 40000), '(a Lia abre as Fichas)');
    await FL.evaluate(() => { S.sel = 'pc_brisa'; S.abaFicha = 'tropas'; render(); }); await w(400, Lp);
    ok(/Tropa do clã\s*Clã Garret/.test(await FL.locator('.tr-faixa').innerText()) && /Ilya\s*Elfo Arqueiro/.test(await FL.locator('#tropasAba .tr-carta').first().innerText()), 'na ficha da Brisa: "Tropa do clã Clã Garret" e o soldado Ilya (Elfo Arqueiro)');
    await FL.locator('#tropasAba .tr-carta').first().locator('[data-tresc]').click(); await w(300, Lp);
    await FL.locator('.tr-janela [data-trsdnovo]').click(); await w(100, Lp);
    await FL.locator('.tr-janela [data-trsd]').nth(1).locator('[data-sdnome]').fill('Tomas');
    await FL.locator('.tr-janela [data-jok]').click();
    ok(await ate(async () => { const d = await docM('fichas:tropas:pc_brisa'); return d && d.dados.unid[0].sold.map(x => x.nome).join() === 'Ilya,Tomas'; }) && !(await Lp.evaluate(() => TC.dados.erro || null)), 'a Lia põe o Tomas pelas Fichas: o mestre recebe, sem recusa do banco');

    // ---------------- a liderança muda; tirar do clã; abrir na ficha ----------------
    await M.evaluate(cla => { TC.dados.col('documentos').gravar('cla:c:cl_garret', { dados: cla, vis: 'mestre' }); }, claDe('pc_brisa'));
    ok(await ate(async () => { const a = await docM('fichas:tropas:pc_selene'), b = await docM('fichas:tropas:pc_brisa'); return j(a.para) === j([lia]) && j(b.para) === j([lia]); }) && await ate(() => parado(M)),
      'a Brisa passa a liderar o clã: as tropas passam a ir para a Lia (o Clã do mestre acerta a lista)');
    ok(await ate(async () => !!(await ler(sL, 'fichas:tropas:pc_selene')) && await ler(sD, 'fichas:tropas:pc_brisa') === null), 'agora a Lia recebe a tropa da Selene, e o Dalmo deixa de receber a da Brisa');
    await K.locator('[data-k="tr:tirar:pc_selene"]').click(); await w(500);
    ok(await ate(async () => { const a = await docM('fichas:tropas:pc_selene'); return a && !a.dados.cla && a.para === null && a.dados.unid.length === 1; }) && await ate(() => parado(M)), '"Tirar do clã": a tropa da Selene sai do clã (fica na ficha) e deixa de ir para o líder');
    ok(await ate(async () => await ler(sL, 'fichas:tropas:pc_selene') === null && !!(await ler(sD, 'fichas:tropas:pc_selene'))), 'a Lia deixa de receber a tropa da Selene; o Dalmo continua com a dele');
    await K.locator('[data-k="tr:abrir:pc_brisa"]').click();
    let FM = null;
    ok(await ate(async () => { FM = await quadro(M, /\/fichas\//); return FM && await FM.evaluate(() => S.sel === 'pc_brisa' && S.abaFicha === 'tropas' && !!document.getElementById('tropasAba')); }, 40000), '"Abrir na ficha": as Fichas abrem na aba Tropas da Brisa');

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } catch (e) {
    ok(false, 'parou: ' + String((e && e.message) || e).split('\n')[0]);
  } finally {
    for (const d of sondas) { try { await d.ctx.close(); } catch (e) { /* já fechada */ } }
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
