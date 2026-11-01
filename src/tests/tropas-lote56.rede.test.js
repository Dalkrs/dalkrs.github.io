// As tropas do lote 56 numa mesa de verdade (o banco local de ensaio), com o mestre (Bruno) e o Dalmo (dono da Selene):
//   · a veterania vai até 5: a Lendária (★) e a Mítica (★★), com as estrelas na carta;
//   · as perícias da unidade (de 0 a 10): o mestre dá os pontos ("Pontos…"), a carta mostra os tracinhos e o dado
//     rola 1d20 + os pontos (no registro da mesa);
//   · o banco (SQL 0034): sem a chave do mestre, o Dalmo não muda os pontos; com "Os jogadores distribuem os pontos das
//     perícias" ligada, muda (e só eles: os números continuam do mestre); na tela, o Dalmo ganha o "Pontos…";
//   · o nascimento de um soldado com nome, na janela do calendário do mundo (o mapa principal): a idade no chip.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const jo = o => (o && typeof o === 'object' ? j(Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {})) : j(o));   // (o banco guarda as chaves noutra ordem)
const ficha = nome => ({ nome, raca: 'Humana', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 8, tiers: { FOR: 'A', DES: 'C', AGI: 'C', VIT: 'D', CAN: 'B' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', itens: [],
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '60' }] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const errosDeFora = () => t.errs.filter(e => !/^\[sonda-/.test(e) || !/status of (400|401|403|409)/.test(e)).filter(e => !/status of (400|401|409)/.test(e));
  const M = (await t.device({ name: 'mestre', w: 1440, h: 1000, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1440, h: 1000, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const foto = async (loc, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await loc.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const abrirSelene = f => f.evaluate(() => { S.sel = 'pc_selene'; render(); });
  const docM = () => M.evaluate(() => { const l = TC.dados.col('documentos').pegar('fichas:tropas:pc_selene'); return l && !l.apagado ? { dados: JSON.parse(JSON.stringify(l.dados)), dono: l.dono_id } : null; });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Tropas 55 ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false;
  const sondas = [];
  try {
    const mesa = await M.evaluate(() => TC.mesas.atual.id);
    await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp);
    await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    const dalmo = await Dp.evaluate(() => TC.conta.usuario.id);
    await M.evaluate(([d, fs]) => {
      TC.dados.col('personagens').gravar('pc_selene', { nome: 'Selene', ficha: fs, skills: {}, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 });
      // um mapa-múndi com o calendário (o dia de hoje: 1 de Alvorada do ano 412)
      TC.dados.col('documentos').gravar('mundo:mapa:m55', { dados: { v: 1, id: 'm55', nome: 'Merunê', cal: { dia: 0, ano0: 412 } }, vis: 'mestre' });
      TC.dados.col('documentos').gravar('mundo:pub:m55', { dados: { v: 1, id: 'm55', nome: 'Merunê', cal: { dia: 0, ano0: 412 } }, vis: 'mesa' });
    }, [dalmo, ficha('Selene')]);
    ok(await ate(() => parado(M)), '(a Selene, do Dalmo, e um mapa com o calendário)');

    let FM = null;
    ok(await ate(async () => { FM = await quadro(M, /\/fichas\//); return FM && await FM.evaluate(() => typeof FichasTropas !== 'undefined' && FichasMesa.ativo() && S.personagens.some(p => p.id === 'pc_selene')); }, 40000), '(o mestre abre as Fichas)');
    await abrirSelene(FM); await w(300);
    await FM.locator('[data-trcriar]').click(); await w(400);
    let d0 = null;
    ok(await ate(async () => { d0 = await docM(); return !!d0 && d0.dados.unid.length >= 1; }) && await ate(() => parado(M)), '"+ Tropas": a tropa da Selene');
    const ua = d0.dados.unid[0].id;
    const carta = f => f.locator('#tropasAba .tr-carta[data-trunid="' + ua + '"]');

    /* ---------- a veterania até Mítica ---------- */
    await carta(FM).locator('[data-trnum]').click(); await w(250);
    const ops = await FM.locator('.tr-janela [data-trn="vet"] option').allInnerTexts();
    ok(ops.length === 5 && /Lendária/.test(ops[3]) && /Mítica/.test(ops[4]), 'a veterania vai de 1 a 5: ' + j(ops));
    await FM.locator('.tr-janela [data-trn="tropas"]').fill('180'); await FM.locator('.tr-janela [data-trn="vet"]').selectOption('5');
    await FM.locator('.tr-janela [data-jok]').click();
    ok(await ate(async () => { const u = (await docM()).dados.unid.find(x => x.id === ua); return u.vet === 5 && u.tropas === 180; }) && await ate(() => parado(M)), 'o mestre põe 180 soldados Míticos');
    ok(await ate(async () => await carta(FM).locator('svg.tr-est path.on').count() === 2), 'a carta mostra as duas estrelas da Mítica');

    /* ---------- as perícias: o mestre dá os pontos e rola ---------- */
    ok(/Nenhuma treinada ainda/.test(await carta(FM).locator('.tr-pers').innerText()), 'a carta começa sem perícias treinadas');
    await carta(FM).locator('[data-trper]').click(); await w(250);
    ok(await FM.locator('[data-trperv]').count() === 8, 'a janela dos pontos com as oito perícias de começo');
    await FM.locator('[data-trperv="pr_rastreio"]').fill('7'); await FM.locator('[data-trperv="pr_emboscada"]').fill('3'); await FM.locator('[data-trperv="pr_cerco"]').fill('14');
    await FM.locator('[data-trperok]').click();
    ok(await ate(async () => j((await docM()).dados.unid.find(x => x.id === ua).per) === j({ pr_rastreio: 7, pr_emboscada: 3, pr_cerco: 10 })) && await ate(() => parado(M)),
      'o mestre dá Rastreio 7, Emboscada 3 e Cerco 14 (fica 10, o teto)');
    ok(await ate(async () => await carta(FM).locator('.tr-per').count() === 3 && await carta(FM).locator('.tr-per').first().locator('.tr-pips i.on').count() >= 3), 'a carta mostra as três treinadas, com os tracinhos');
    await carta(FM).locator('[data-trperrolar$="|pr_rastreio"]').click(); await w(300);
    const aviso = await FM.evaluate(() => [...document.querySelectorAll('.toast, #toasts *, .aviso')].map(x => x.innerText).join(' '));
    ok(/rolou Rastreio: \d+ \(d20 \d+ \+7\)/.test(aviso), 'o d20 de Rastreio: 1d20 + 7 — ' + aviso.slice(0, 120));
    await FM.evaluate(() => document.getElementById('tropasAba').scrollIntoView()); await w(300);
    await foto(carta(FM), 'l55-pericias');

    /* ---------- o banco: os pontos do jogador só com a chave do mestre ---------- */
    const sonda = async (email, nome) => { const d = await t.device({ name: 'sonda-' + nome }); sondas.push(d); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, email, c.senha, nome); return d.page; };
    const sD = await sonda(c.jog1, 'Dalmo');
    const ler = id => sD.evaluate(async ([mesa, id]) => { const r = await sb.from('documentos').select('dados').eq('mesa_id', mesa).eq('id', id).maybeSingle(); return r.error || !r.data ? null : r.data; }, [mesa, id]);
    const mudar = dados => sD.evaluate(async ([mesa, dados]) => { const r = await sb.from('documentos').update({ dados }).eq('mesa_id', mesa).eq('id', 'fichas:tropas:pc_selene').select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, dados]);
    const comPer = async (per, tropas) => { const d = (await ler('fichas:tropas:pc_selene')).dados; const u = d.unid.find(x => x.id === ua); u.per = per; if (tropas) u.tropas = tropas; return d; };
    ok(await mudar(await comPer({ pr_rastreio: 10 })) === 'recusado', 'sem a chave do mestre, o Dalmo não muda os pontos das perícias (recusado)');
    await FM.evaluate(() => abrirCfg()); await w(400);
    await FM.locator('[data-trcperjog]').check(); await w(300);
    ok(await ate(async () => await M.evaluate(() => { const l = TC.dados.col('documentos').pegar('fichas:cfg'); return !!(l && l.dados.v && l.dados.v.tropas && l.dados.v.tropas.perJog); })) && await ate(() => parado(M)),
      'o mestre liga "Os jogadores distribuem os pontos das perícias" (nas tabelas base)');
    await FM.evaluate(() => { const v = document.querySelector('.modal[data-cfg]'); if (v) v.remove(); render(); }); await w(300);
    ok(await mudar(await comPer({ pr_rastreio: 9, pr_cacada: 2 }, 9999)) === 'recusado', 'com a chave ligada, os números continuam do mestre (9999 soldados: recusado)');
    ok(await mudar(await comPer({ pr_rastreio: 9, pr_cacada: 2 })) === 'ok', 'e os pontos das perícias, agora, o Dalmo muda');
    ok(await ate(async () => jo((await docM()).dados.unid.find(x => x.id === ua).per) === jo({ pr_rastreio: 9, pr_cacada: 2 })), 'o mestre recebe os pontos do Dalmo');

    /* ---------- o Dalmo na tela: "Pontos…" e o nascimento de um soldado ---------- */
    let FD = null;
    ok(await ate(async () => { FD = await quadro(Dp, /\/fichas\//); return FD && await FD.evaluate(() => typeof FichasTropas !== 'undefined' && FichasMesa.ativo() && S.personagens.some(p => p.id === 'pc_selene')); }, 40000), '(o Dalmo abre as Fichas)');
    await abrirSelene(FD); await w(400, Dp);
    await FD.locator('[data-abaficha="tropas"]').click(); await w(300, Dp);
    ok(await ate(async () => await carta(FD).locator('[data-trper]').count() === 1 && await carta(FD).locator('[data-trnum]').count() === 0), 'o Dalmo tem o "Pontos…" (e não os números)');
    await carta(FD).locator('[data-trper]').click(); await w(250, Dp);
    await FD.locator('[data-trperv="pr_pontaria"]').fill('5'); await FD.locator('[data-trperok]').click();
    ok(await ate(async () => (await docM()).dados.unid.find(x => x.id === ua).per.pr_pontaria === 5), 'o Dalmo dá 5 em Pontaria pela tela, e o mestre recebe');
    ok(!(await Dp.evaluate(() => TC.dados.erro || null)), 'nenhuma gravação do Dalmo foi recusada');

    await carta(FD).locator('[data-tresc]').click(); await w(300, Dp);
    await FD.locator('[data-trsdnovo]').click(); await w(150, Dp);
    await FD.locator('[data-trsd]').last().locator('[data-sdnome]').fill('Corvo');
    await FD.locator('[data-trsd]').last().locator('[data-sdnasc]').click(); await w(300, Dp);
    ok(await FD.locator('.tcc').isVisible() && /Alvorada/.test(await FD.locator('.tcc-mes b').innerText()), 'a janela do calendário abre no mês de hoje do mapa (Alvorada)');
    await FD.locator('.tcc [data-c="ano"]').fill('390'); await FD.locator('.tcc [data-c="ano"]').dispatchEvent('change'); await w(120, Dp);
    await FD.locator('.tcc [data-c="mes+"]').click(); await w(100, Dp);
    await FD.locator('.tcc-dia[data-d="5"]').click(); await w(120, Dp);
    ok(/5 de Degelo, ano 390/.test(await FD.locator('.tcc-diz').innerText()) && /21 anos/.test(await FD.locator('.tcc-diz').innerText()), 'a data e a idade: ' + (await FD.locator('.tcc-diz').innerText()).replace(/\s+/g, ' '));
    await FD.locator('.tcc [data-c="ok"]').click(); await w(200, Dp);
    ok(/21 anos/.test(await FD.locator('[data-trsd]').last().locator('[data-sdnasc]').innerText()), 'o botão do soldado mostra a idade');
    await FD.locator('.tr-janela [data-jok]').click();
    ok(await ate(async () => { const s = (await docM()).dados.unid.find(x => x.id === ua).sold || []; const x = s.find(y => y.nome === 'Corvo'); return x && jo(x.nasc) === jo({ d: 5, m: 1, a: 390 }); }), 'o Corvo nasceu em 5 de Degelo, 390 (o mestre recebe)');
    ok(await ate(async () => /Corvo/.test(await carta(FD).innerText()) && /21/.test(await carta(FD).locator('.tr-chips').last().innerText())), 'o chip do Corvo, com a idade');
    await FD.evaluate(() => document.getElementById('tropasAba').scrollIntoView()); await w(300, Dp);
    await foto(carta(FD), 'l55-veterania');

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
