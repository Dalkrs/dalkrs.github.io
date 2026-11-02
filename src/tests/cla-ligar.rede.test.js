// Clã (lote 60) numa mesa de verdade (o banco local de ensaio), com o mestre: os membros ligados às fichas e às tropas.
//   · "Das fichas…": escolher um grupo das Fichas (ou uma campanha) e trazer as fichas marcadas, ligadas;
//   · "Das tropas…": os soldados com nome das tropas do clã viram membros ligados (o nome, a raça, a classe);
//   · ligado de verdade: mudar o nome no clã muda o soldado na tropa (um Desfazer volta os dois); mudar o soldado na
//     tropa (como as Fichas fazem) o clã acompanha; o soldado que sai da tropa solta a ligação (o membro fica);
//   · "Tropa…": um membro anotado vira soldado com nome de uma unidade da tropa do clã.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const C = require('../../cla/nucleo.js');
const { ok, end } = checker();
const j = JSON.stringify;
const ficha = (nome, grupo) => ({ nome, raca: 'Humana', lado: 'Aliado', grupo, tags: [], tier: 'C', level: 6, tiers: { FOR: 'A', DES: 'C', AGI: 'C', VIT: 'D', CAN: 'B' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', itens: [],
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '60' }] });
const BIB = { nome: 'b', pools: [{ id: 'p', nome: 'Pontos', padrao: 0 }], usos: [], arvores: [{ id: 'ar_elfo', nome: 'Elfo', categoria: 'raca', nodes: [] }, { id: 'cl_arq', nome: 'Arqueiro', categoria: 'classe', nodes: [] }] };
const CLA = C.normCla({ v: 1, nome: 'Clã Garret', jogadores: true, ver: {}, brasao: { forma: 'escudo', div: 'cortado', cores: ['#5b3f8a', '#e8eaf0'], simb: 'lobo' }, cargos: { lider: { nome: 'Líder', gente: [] } } });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const errosDeFora = () => t.errs.filter(e => !/^\[prep\]/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/status of (400|401|403|409)/.test(e));
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'cla', 'tinycats-tour': '1', 'tinycats:cla:tudo': '1' } })).page;
  const w = ms => M.waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = () => M.evaluate(() => TC.dados.pendentes === 0);
  const foto = async (alvo, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await alvo.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const docM = id => M.evaluate(id => { const l = TC.dados.col('documentos').pegar(id); return l && !l.apagado ? JSON.parse(JSON.stringify(l.dados)) : null; }, id);
  const membros = async () => C.membrosDe(await docM('cla:c:cl_garret')).map(m => ({ pid: m.pid, pc: m.pessoa.pc, nome: m.pessoa.nome, d: m.dados }));
  const soldados = async () => { const d = await docM('fichas:tropas:pc_nyx'); return d ? d.unid[0].sold : []; };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Ligar Cla E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa);
  let apagada = false;
  try {
    await M.evaluate(([fs, fb, fn, cla, bib]) => {
      const P = TC.dados.col('personagens'), D = TC.dados.col('documentos');
      D.gravar('arvore:biblioteca', { dados: bib, vis: 'mestre' }); D.gravar('arvore:pacote', { dados: bib, vis: 'mesa' });
      P.gravar('pc_selene', { nome: 'Selene', ficha: fs, skills: {}, estado: {}, dono_id: null, vis: 'mesa', ordem: 0 });
      P.gravar('pc_brisa', { nome: 'Brisa', ficha: fb, skills: {}, estado: {}, dono_id: null, vis: 'mesa', ordem: 1 });
      P.gravar('pc_nyx', { nome: 'Nyx', ficha: fn, skills: {}, estado: {}, dono_id: null, vis: 'mesa', ordem: 2 });
      D.gravar('cla:c:cl_garret', { dados: cla, vis: 'mestre' });
    }, [ficha('Selene', 'Vanguarda'), ficha('Brisa', 'Vanguarda'), ficha('Nyx', ''), CLA, BIB]);
    ok(await ate(parado), '(Selene e Brisa no grupo Vanguarda; Nyx sem grupo; o Clã Garret vazio)');
    let K = null;
    ok(await ate(async () => { K = await quadro(M, /\/cla\//); return K && await K.evaluate(() => !!window.__cla && __cla.pronto && __cla.naMesa && __cla.mestre); }, 40000), '(o mestre abre o Clã)');
    const clicar = async sel => { await K.locator(sel).click(); await w(300); };

    // ---------------- Das fichas: o grupo ----------------
    ok(await ate(async () => (await K.locator('[data-k="rol:fichas"]').count()) === 1), 'o botão "Das fichas…" no cartão Membros');
    await clicar('[data-k="rol:fichas"]');
    const fontes = await K.locator('#dlg [data-k="dl:fonte"] option').allInnerTexts();
    ok(fontes.includes('Grupo: Vanguarda (2)') && fontes.some(f => /^Sem grupo/.test(f)) && fontes.some(f => /^Todas as fichas \(3\)/.test(f)), 'de onde: os grupos das Fichas e todas — ' + j(fontes));
    await K.locator('#dlg [data-k="dl:fonte"]').selectOption('g:Vanguarda'); await w(150);
    ok(/2 de 2 marcados/.test(await K.locator('#dlg').innerText()), 'o grupo Vanguarda: as duas fichas marcadas');
    await foto(K.locator('#dlg'), 'l60-fichas-grupo');
    await clicar('#dlg [data-k="dl:sim"]');
    ok(await ate(async () => j((await membros()).map(m => m.pc).sort()) === j(['pc_brisa', 'pc_selene'])), 'Selene e Brisa entram no clã, ligadas às fichas');

    // ---------------- a tropa do clã, com soldados ----------------
    await clicar('[data-k="tr:nova"]');
    await K.locator('#dlg [data-k="tr:lider"]').selectOption('pc_nyx'); await clicar('#dlg [data-k="dl:sim"]');
    ok(await ate(async () => { const d = await docM('fichas:tropas:pc_nyx'); return d && d.cla === 'cl_garret'; }) && await ate(parado), '(a tropa da Nyx, no clã)');
    await M.evaluate(() => { const D = TC.dados.col('documentos'), l = D.pegar('fichas:tropas:pc_nyx'), x = JSON.parse(JSON.stringify(l.dados));
      x.unid[0].sold = [{ id: 'sd_ilya', nome: 'Ilya', raca: 'ar_elfo', racaN: 'Elfo', classe: 'cl_arq', classeN: 'Arqueiro' }, { id: 'sd_kel', nome: 'Kel', racaN: 'Anão' }];
      D.gravar('fichas:tropas:pc_nyx', { dados: x }, null, { cas: true }); });
    ok(await ate(async () => (await soldados()).length === 2) && await ate(parado), '(dois soldados com nome: Ilya e Kel)');

    // ---------------- Das tropas ----------------
    ok(await ate(async () => (await K.locator('[data-k="rol:tropas"]').count()) === 1), 'o botão "Das tropas…" (o clã tem soldados com nome)');
    await clicar('[data-k="rol:tropas"]');
    ok(/Ilya/.test(await K.locator('#dlg').innerText()) && /Kel/.test(await K.locator('#dlg').innerText()), 'a lista: os soldados da tropa do clã');
    await K.locator('#dlg [data-k="sd:1"]').uncheck(); await w(100);
    await foto(K.locator('#dlg'), 'l60-das-tropas');
    await clicar('#dlg [data-k="dl:sim"]');
    let ilya = null;
    ok(await ate(async () => { ilya = (await membros()).find(m => m.nome === 'Ilya'); return ilya && ilya.d.sold && ilya.d.sold.sd === 'sd_ilya' && ilya.d.raca === 'ar_elfo' && ilya.d.classeN === 'Arqueiro'; }),
      'Ilya vira membro, ligado ao soldado, com a raça e a classe: ' + j(ilya));
    ok(await ate(async () => /soldado · /.test(await K.locator(`.rol-ed[data-rol="${ilya.pid}"]`).innerText())), 'no rol, o selo "soldado · <unidade>"');

    // ---------------- ligado: o clã muda a tropa ----------------
    await K.locator(`[data-k="rol:nome:${ilya.pid}"]`).fill('Ilya Vern'); await K.locator(`[data-k="rol:nome:${ilya.pid}"]`).press('Tab'); await w(400);
    ok(await ate(async () => (await soldados())[0].nome === 'Ilya Vern') && (await membros()).find(m => m.pid === ilya.pid).nome === 'Ilya Vern', 'mudar o nome no clã muda o soldado na tropa');
    await K.evaluate(() => __cla.desfazer()); await w(500);
    ok(await ate(async () => (await soldados())[0].nome === 'Ilya' && (await membros()).find(m => m.pid === ilya.pid).nome === 'Ilya'), 'um Desfazer volta os dois');
    await ate(parado);

    // ---------------- ligado: a tropa muda o clã ----------------
    await M.evaluate(() => { const D = TC.dados.col('documentos'), l = D.pegar('fichas:tropas:pc_nyx'), x = JSON.parse(JSON.stringify(l.dados)); x.unid[0].sold[0].classe = null; x.unid[0].sold[0].classeN = 'Batedor'; D.gravar('fichas:tropas:pc_nyx', { dados: x }, null, { cas: true }); });
    ok(await ate(async () => { const m = (await membros()).find(y => y.pid === ilya.pid); return m.d.classeN === 'Batedor' && !m.d.classe; }), 'o soldado muda nas Fichas (a classe): o clã acompanha');
    await ate(parado);

    // ---------------- Tropa…: um membro vira soldado ----------------
    await clicar('[data-k="rol:novo"]'); await K.locator('#dlg [data-k="dl:nome"]').fill('Tomas'); await clicar('#dlg [data-k="dl:sim"]');
    let tomas = null;
    ok(await ate(async () => { tomas = (await membros()).find(m => m.nome === 'Tomas'); return !!tomas; }), '(Tomas, anotado)');
    ok(await ate(async () => (await K.locator(`[data-k="rol:tropa:${tomas.pid}"]`).count()) === 1), 'o membro anotado tem "Tropa…"');
    await clicar(`[data-k="rol:tropa:${tomas.pid}"]`);
    await clicar('#dlg [data-k="dl:sim"]');
    ok(await ate(async () => { const s = (await soldados()).find(x => x.nome === 'Tomas'), m = (await membros()).find(y => y.pid === tomas.pid); return s && m.d.sold && m.d.sold.sd === s.id; }), 'Tomas vira soldado com nome da unidade, ligado ao membro');
    ok(j((await soldados()).map(x => x.nome)) === j(['Ilya', 'Kel', 'Tomas']) && j((await membros()).map(x => x.nome)) === j(['Brisa', 'Selene', 'Ilya', 'Tomas']), 'os outros soldados e membros ficam como estavam');
    await ate(parado);
    await K.evaluate(() => document.querySelector('[data-k="sec:rol"]').scrollIntoView({ block: 'center' })); await w(300);
    await foto(K.locator('[data-k="sec:rol"]'), 'l60-rol-ligado');

    // ---------------- o soldado sai da tropa ----------------
    await M.evaluate(() => { const D = TC.dados.col('documentos'), l = D.pegar('fichas:tropas:pc_nyx'), x = JSON.parse(JSON.stringify(l.dados)); x.unid[0].sold = x.unid[0].sold.filter(s => s.nome !== 'Tomas'); D.gravar('fichas:tropas:pc_nyx', { dados: x }, null, { cas: true }); });
    ok(await ate(async () => { const m = (await membros()).find(y => y.pid === tomas.pid); return m && !m.d.sold; }), 'o soldado tirado da tropa solta a ligação; o Tomas continua no clã');
    await ate(parado);

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } catch (e) {
    ok(false, 'parou: ' + String((e && e.message) || e).split('\n')[0]);
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
