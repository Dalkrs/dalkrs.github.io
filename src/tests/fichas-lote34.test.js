// Fichas, lote 34 (sem mesa): as barras de raça, classe e linhagem são barras comuns.
//   · as contas (tc/barras.js e tc/rules.js): a barra de cada árvore (o guia de 28/10 pelo id, o que o mestre pôs na
//     Oficina, o texto), as que dividem a barra (as Oradoras), a ordem, o que os nós somam ao início (até 10);
//   · equipar a raça cria a barra comum depois do HP e do SP, com o aviso e o Desfazer; os nós somam ao início;
//   · a barra especial que veio da raça (do lote 28) vira a comum, guardando o valor de agora; o Desfazer devolve;
//   · a Bênção de Selene e a escola não criam barra; a barra acompanha o que o mestre muda na árvore;
//   · as outras fichas trocam também (uma vez só), num aviso só.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const B = require('../../tc/barras.js');
const j = JSON.stringify;

// ---------- as contas ----------
ok(Object.keys(B.PADRAO).length === 51, 'o guia: 37 raças, 12 classes e 2 linhagens (51)');
const forja = B.defDaArvore({ id: 'aaj23w9sif', categoria: 'raca', nodes: [] });
ok(forja.nome === 'Calor da Forja' && forja.min === 0 && forja.max === 20 && forja.inicio === 5 && forja.comb === 'inicio' && forja.de === 'guia', 'Anão da Forja (pelo id): Calor da Forja, 0 a 20, começa em 5 — ' + j(forja));
const comp = B.defDaArvore({ id: 'atrwp3vplm', categoria: 'raca', nodes: [] });
ok(comp.nome === 'Compasso' && comp.min === -10 && comp.max === 10 && comp.inicio === 0, 'a Dançarina: Compasso de −10 a 10, começa em 0');
const vamp = B.defDaArvore({ id: 'ayfvz27k70', categoria: 'linhagem', nodes: [] }), lic = B.defDaArvore({ id: 'a7va7rq14q', categoria: 'linhagem', nodes: [] });
ok(vamp.nome === 'Fome' && vamp.inicio === null && vamp.comb === 'fica' && lic.nome === 'Barra Bestial' && lic.comb === 'pergunta' && lic.inicio === 0, 'o Vampiro: a Fome (o combate não mexe); o Licantropo: a Barra Bestial (o mestre diz)');
ok(B.defDaArvore({ id: 'aq0onsk37x', categoria: 'outra', nodes: [{ pais: [], desc: 'Geada: máximo 20; começa com 4.' }] }) === null
  && B.defDaArvore({ id: 'aq0onsk37x', categoria: 'raca', nodes: [] }) === null
  && B.defDaArvore({ id: 'esc', categoria: 'escola', nodes: [{ pais: [], desc: 'Cinza: máximo 3.' }] }) === null, 'a Bênção de Selene e a escola: sem barra');
const mao = B.defDaArvore({ id: 'aaj23w9sif', categoria: 'raca', barraDef: { nome: 'Calor', max: 25, inicio: 6, enche: 'golpes' }, nodes: [] });
ok(mao.nome === 'Calor' && mao.max === 25 && mao.inicio === 6 && mao.de === 'arvore' && B.defDaArvore({ id: 'aaj23w9sif', categoria: 'raca', barraDef: { nenhuma: true }, nodes: [] }) === null, 'o que o mestre pôs na árvore vale (e "não cria barra" também)');
const txt = B.defDaArvore({ id: 'x1', categoria: 'classe', nodes: [{ pais: [], desc: 'Fúria (barra): máximo 10; começa em 0.' }] });
ok(txt.nome === 'Fúria' && txt.max === 10 && txt.inicio === 0 && txt.de === 'texto', 'sem o guia: o texto da árvore — ' + j(txt));
const arvs = { o1: { id: 'aijv2xkz3l', nome: 'Oradora · Paciência', categoria: 'raca', nodes: [] }, o2: { id: 'a24nmazt4x', nome: 'Oradora · Rast', categoria: 'raca', nodes: [] }, cl: { id: 'aasemzgk9a', nome: 'Bárbaro', categoria: 'classe', nodes: [] }, ra: { id: 'aaj23w9sif', nome: 'Anão da Forja', categoria: 'raca', nodes: [] } };
const porId = id => Object.values(arvs).find(a => a.id === id) || null;
const dp = B.doPersonagem(['aasemzgk9a', 'aijv2xkz3l', 'a24nmazt4x', 'aaj23w9sif'], porId);
ok(j(dp.map(b => b.nome + ':' + b.arvs.length)) === j(['Palavras:2', 'Calor da Forja:1', 'Ira:1']), 'as raças antes da classe; as duas Oradoras dividem as Palavras — ' + j(dp.map(b => b.nome)));
const ord = B.ordenar([{ id: 'x', nome: 'Energia' }, { id: 'c', nome: 'Ira', arvs: ['a'], cat: 'classe' }, { id: 'h', nome: 'HP' }, { id: 's', nome: 'SP' }, { id: 'r', nome: 'Veio', arvs: ['b'], cat: 'raca' }]);
ok(j(ord.map(r => r.nome)) === j(['Energia', 'HP', 'SP', 'Veio', 'Ira']), 'a ordem: depois do HP e do SP, a raça e depois a classe — ' + j(ord.map(r => r.nome)));
ok(R.inicioDoGrau({ texto: '+1 de Calor inicial' }) === 1 && R.inicioDoGrau({ texto: '+4 Palavras iniciais' }) === 4 && R.inicioDoGrau({ texto: 'Começa com +2 de Dívida (a inicial nunca passa de 4).' }) === null && R.inicioDoGrau({ ini: 0, texto: '+4 de X inicial' }) === 0 && R.inicioDoGrau({ ini: 3, texto: '' }) === 3,
  'o que o grau soma ao início: do texto ("+1 de Calor inicial"), ou o número posto no grau (0 vale nada)');
{
  const bib = { arvores: [{ id: 'aaj23w9sif', categoria: 'raca', nodes: [{ id: 'f1', graus: [{ texto: '+1 de Calor inicial' }, { texto: '+2 de Calor inicial' }, { texto: '+4 de Calor inicial' }] }] },
    { id: 'kk', categoria: 'raca', nodes: [{ id: 'k1', graus: [{ texto: '+4 de Geada inicial' }] }] }] };
  const conta = (al, comeca, ids) => { const pc = Object.assign(R.personagemPadrao('X'), { recursos: [{ id: 'b', nome: 'Barra', fml: '20', comeca, arvs: ids }] }); const r = R.calcular(pc, R.cfgPadrao(), { arvore: R.bonusDaArvore({ arvores: ['aaj23w9sif', 'kk'], alocados: al }, bib) }).recursos[0]; return r.inicio + '/' + (r.iniArv || 0); };
  ok(conta({ f1: 2 }, '5', ['aaj23w9sif']) === '7/2' && conta({ f1: 3 }, '5', ['aaj23w9sif']) === '9/4', 'os nós somam ao início: o 2º grau +2 (7), o 3º +4 (9, não 12)');
  ok(conta({ f1: 3 }, '8', ['aaj23w9sif']) === '10/4' && conta({ k1: 1 }, '20', ['kk']) === '20/4', 'o início não passa de 10 (8 + 4 = 10); a barra que já começa acima disso fica (20)');
  ok(conta({ f1: 1, k1: 1 }, '5', ['aaj23w9sif', 'kk']) === '9/4', 'a barra de duas árvores: o maior dos nós (+4), não a soma');
}

{
  // o descanso: a barra que começa em 5 volta a 5 no longo; a Fome (o combate e o descanso não mexem) fica
  const pc = Object.assign(R.personagemPadrao('V'), { recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'f', nome: 'Fome', fml: '20', comeca: '', arvs: ['ayfvz27k70'], comb: 'fica' }, { id: 'c', nome: 'Calor', fml: '20', comeca: '5', arvs: ['x'], comb: 'inicio' }] });
  const rs = R.resumo(pc, R.cfgPadrao(), {}, { rec: { hp: 40, f: 6, c: 12 } });
  ok(rs.recursos[1].fica === true && !('fica' in rs.recursos[2]) && !('fica' in rs.recursos[0]), 'as regras marcam a barra que fica (fica: true) — e só ela');
  const N = require('../../acampamento/nucleo.js');
  const p = N.planejar(N.normalizar({ provisoes: [{ id: 'pao', nome: 'Pão', qtd: 9 }] }), 'longo', [{ id: 'v', nome: 'Vampira', recursos: rs.recursos, san: null, conf: null, poderes: [] }]);
  const l = p.linhas[0].recursos.map(r => r.nome + ' ' + r.de + '→' + r.para);
  ok(j(l) === j(['HP 40→100', 'Fome 6→6', 'Calor 12→5']), 'no descanso longo: o HP enche, o Calor volta ao começo (5), a Fome fica — ' + j(l));
}

// ---------- a página ----------
const no = (id, nome, pais, desc, graus) => ({ id, nome, tipo: pais.length ? 'notavel' : 'keystone', pais, usos: [], desc, graus: graus || [{ custos: pais.length ? { p1: 1 } : {}, texto: '' }] });
const bib = { nome: 'Bib', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 10 }], usos: [], naturezas: [],
  arvores: [
    { id: 'aaj23w9sif', nome: 'Anão da Forja', categoria: 'raca', nodes: [no('f0', 'Calor da Forja', [], 'Anões.\n\nCalor da Forja: máximo 20; começa com 5.'),
      no('f1', 'Fornalha Acesa', ['f0'], 'Começa com mais Calor.', [{ custos: { p1: 1 }, texto: '+1 de Calor inicial' }, { custos: { p1: 1 }, texto: '+2 de Calor inicial' }, { custos: { p1: 1 }, texto: '+4 de Calor inicial' }])] },
    { id: 'aasemzgk9a', nome: 'Bárbaro', categoria: 'classe', nodes: [no('b0', 'Ira do Bárbaro', [], 'Ira (barra): máximo 20; começa em 0 e volta a 0 no fim do combate.')] },
    { id: 'aijv2xkz3l', nome: 'Oradora · Paciência', categoria: 'raca', nodes: [no('o1', 'Oradora', [], 'Reza.')] },
    { id: 'a24nmazt4x', nome: 'Oradora · Rast', categoria: 'raca', nodes: [no('o2', 'Rast', [], 'Dor.')] },
    { id: 'aq0onsk37x', nome: 'Bênção de Selene', categoria: 'outra', nodes: [no('s1', 'Luar', [], 'x\n\nGeada: máximo 20; começa com 4.')] },
    { id: 'a5ufrdl1er', nome: 'Yanato', categoria: 'escola', nodes: [no('y1', 'Cinza', [], 'Frascos: máximo 3.')] },
    { id: 'ayfvz27k70', nome: 'Vampiro', categoria: 'linhagem', nodes: [no('v1', 'Fome', [], 'Fome: máximo 20.')] }] };
const pc = (id, nome, extra) => Object.assign(R.personagemPadrao(nome), { id, nome, level: 8, recursos: [{ id: 'hp' + id, nome: 'HP', fml: '100' }, { id: 'sp' + id, nome: 'SP', fml: '50' }, { id: 'en' + id, nome: 'Energia', fml: '10' }] }, extra);
const dain = pc('pc_dain', 'Dain', { arvVistas: [], barrasArv: 1, skills: { arvores: [], pontos: { p1: 10 }, alocados: {} } });
// a Lia é de antes: a raça já estava, com a barra especial do lote 28 (Calor da Forja, 7 agora)
const lia = pc('pc_lia', 'Lia', { arvVistas: ['aaj23w9sif'], poderes: [{ id: 'pa_aaj23w9sif', nome: 'Calor da Forja', max: 20, atual: 0, inicio: 5 }], estado: { pd: { pa_aaj23w9sif: 7 } },
  skills: { arvores: ['aaj23w9sif'], pontos: { p1: 10 }, alocados: { f0: 1 } } });
// o Kai e a Mei: outras fichas de antes (trocam quando as Fichas abrem, num aviso só)
const kai = pc('pc_kai', 'Kai', { arvVistas: ['aasemzgk9a'], poderes: [{ id: 'pa_aasemzgk9a', nome: 'Ira', max: 20, atual: 3 }], skills: { arvores: ['aasemzgk9a'], pontos: { p1: 10 }, alocados: {} } });
const mei = pc('pc_mei', 'Mei', { arvVistas: ['aijv2xkz3l', 'a24nmazt4x'], skills: { arvores: ['aijv2xkz3l', 'a24nmazt4x'], pontos: { p1: 10 }, alocados: {} } });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [dain, lia, kai, mei], situacoes: [], tabelas: [], log: [], bib, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [], skillsUI: { equipar: true, distribuir: true } });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas-l34', w: 1300, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const foto = async nome => { if (process.env.FOTOS) await P.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const ficha = id => P.evaluate(id => { const p = S.personagens.find(x => x.id === id); const c = calcular(p);
    return { rec: p.recursos.map(r => ({ id: r.id, nome: r.nome, fml: r.fml, comeca: r.comeca, piso: r.piso, arvs: r.arvs, comb: r.comb })), ini: c.recursos.map(r => r.nome + ':' + r.inicio + (r.iniArv ? '+' + r.iniArv : '')),
      pd: (p.poderes || []).map(x => x.id), estRec: (p.estado && p.estado.rec) || {}, estPd: (p.estado && p.estado.pd) || {}, marca: p.barrasArv }; }, id);
  const abrir = async id => { await P.evaluate(id => { S.sel = id; render(); }, id); await w(350); };
  const aba = async k => { await P.locator('#ficha [data-abaficha="' + k + '"]').click(); await w(300); };
  const equipar = async (arv, on) => { const c = P.locator('[data-skarv="' + arv + '"]'); if ((await c.isChecked()) !== on) await c.click(); await w(450); };
  const aviso = () => P.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ '));
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1400);

  await passo('as outras fichas', async () => {
    const a = await aviso();
    ok(/As barras de raça, classe e linhagem agora são barras comuns, depois do HP e do SP, em 3 fichas/.test(a) && /Lia \(Calor da Forja\)/.test(a) && /Kai \(Ira\)/.test(a) && /Mei \(Palavras\)/.test(a), 'as Fichas abrem: as outras três trocam, num aviso só — ' + a);
    const k = await ficha('pc_kai'), m = await ficha('pc_mei'), l = await ficha('pc_lia');
    ok(j(k.rec.map(r => r.nome)) === j(['HP', 'SP', 'Ira', 'Energia']) && k.pd.length === 0 && k.estRec.pa_aasemzgk9a === 3, 'o Kai: a Ira especial (3) virou a barra comum, depois do HP e do SP, com o 3 — ' + j(k));
    ok(m.rec.filter(r => r.nome === 'Palavras').length === 1 && j(m.rec.find(r => r.nome === 'Palavras').arvs) === j(['aijv2xkz3l', 'a24nmazt4x']), 'a Mei (duas Oradoras): uma barra Palavras só, das duas');
    ok(l.estRec.pa_aasemzgk9a === undefined && l.estRec.pa_aaj23w9sif === 7 && l.pd.length === 0, 'a Lia: o Calor da Forja ficou com o 7');
    await foto('l34-fichas-aviso');
    await P.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(400);
    const k2 = await ficha('pc_kai');
    ok(j(k2.pd) === j(['pa_aasemzgk9a']) && !k2.rec.some(r => r.nome === 'Ira') && k2.estPd.pa_aasemzgk9a === undefined && k2.marca === 1, 'o Desfazer devolve a Ira especial (e a ficha lembra: não troca de novo sozinha)');
    await P.evaluate(() => render()); await w(300);
    ok((await ficha('pc_kai')).pd.length === 1, 'e não volta a trocar');
  });
  await passo('equipar a raça', async () => {
    await aba('skills');
    await equipar('aaj23w9sif', true);
    const f = await ficha('pc_dain'), a = await aviso();
    ok(j(f.rec.map(r => r.nome)) === j(['HP', 'SP', 'Calor da Forja', 'Energia']), 'o Calor da Forja entra depois do HP e do SP — ' + j(f.rec.map(r => r.nome)));
    const cf = f.rec.find(r => r.nome === 'Calor da Forja');
    ok(cf.fml === '20' && cf.comeca === '5' && j(cf.arvs) === j(['aaj23w9sif']) && cf.comb === 'inicio' && f.pd.length === 0, 'uma barra comum: máximo 20, começa em 5, da raça — ' + j(cf));
    ok(/A barra Calor da Forja chegou da raça Anão da Forja \(0 a 20, começa em 5\)\./.test(a) && /Desfazer/.test(a), 'o aviso diz o que veio — ' + a);
    await P.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(400);
    ok(!(await ficha('pc_dain')).rec.some(r => r.nome === 'Calor da Forja'), 'o Desfazer tira a barra');
    await equipar('aaj23w9sif', false); await equipar('aaj23w9sif', true);
    ok((await ficha('pc_dain')).rec.some(r => r.nome === 'Calor da Forja'), 'tirar a raça e pôr de novo traz a barra de novo');
  });
  await passo('os nós somam ao início', async () => {
    await P.evaluate(() => { const p = S.personagens.find(x => x.id === 'pc_dain'); p.skills.alocados = { f0: 1, f1: 3 }; save(); render(); }); await w(300);
    const f = await ficha('pc_dain');
    ok(f.ini.includes('Calor da Forja:9+4'), 'Fornalha Acesa no 3º grau: começa em 9 (5 + 4) — ' + j(f.ini));
    await aba('atributos');
    const h = await P.locator('.barra-arv').first().innerText();
    ok(/Barra da raça Anão da Forja\. Começa o combate em 9 \(5 \+ 4 dos nós\)\./.test(h), 'o quadro dos recursos diz de onde vem e onde começa — ' + h);
    await P.locator('.barra-arv').first().scrollIntoViewIfNeeded(); await foto('l34-fichas-barra');
  });
  await passo('a Bênção, a escola e a linhagem', async () => {
    await aba('skills');
    await equipar('aq0onsk37x', true); await equipar('a5ufrdl1er', true);
    const f = await ficha('pc_dain');
    ok(f.pd.length === 0 && f.rec.length === 4, 'a Bênção de Selene e a escola (Yanato) não criam barra nenhuma — ' + j(f.rec.map(r => r.nome)) + ' ' + j(f.pd));
    await equipar('ayfvz27k70', true);
    const v = (await ficha('pc_dain')).rec.find(r => r.nome === 'Fome');
    ok(v && v.comeca === '' && v.comb === 'fica', 'a linhagem Vampiro: a Fome (o combate não mexe nela) — ' + j(v));
  });
  await passo('a árvore muda na Oficina', async () => {
    await P.evaluate(() => { const a = S.bib.arvores.find(x => x.id === 'aaj23w9sif'); a.barraDef = { nome: 'Calor da Forja', max: 25, inicio: 6, comb: 'inicio' }; save(); render(); }); await w(300);
    const cf = (await ficha('pc_dain')).rec.find(r => r.arvs && r.arvs.includes('aaj23w9sif'));
    ok(cf.fml === '25' && cf.comeca === '6', 'o mestre mudou a barra na árvore (máximo 25, começa em 6): a ficha acompanha — ' + j(cf));
  });
  ok(t.errs.length === 0, 'sem erros no console' + (t.errs.length ? ': ' + t.errs.slice(0, 3).join(' | ') : ''));
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
