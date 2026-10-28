// Itens numa mesa de verdade (banco local de ensaio ou o projeto real): o mestre (Bruno) e o Dalmo (dono da Selene).
//   · o mestre monta, pela aba Itens, o catálogo e a loja do Ferreiro, em Vashka (um marcador do Mapa-múndi), com a
//     poção (25, estoque 3) e a espada (80, sem fim); o grupo da Selene (no mapa, ligado à ficha dela) está longe;
//   · o grupo anda até o hexágono de Vashka: o banco anota a Selene na loja e a aba Loja aparece para o Dalmo (com o
//     aviso); ele compra 2 poções (os lapros saem da ficha, a poção entra na bolsa, o estoque baixa), não consegue a
//     espada (faltam lapros) e desfaz; compra uma de novo; o mestre vê as compras no Jornal (a desfeita, riscada);
//   · o grupo sai de Vashka: a aba some, e o banco recusa a compra de longe;
//   · a bancada do Acampamento: a receita sem teste faz a poção; a com teste que falha perde as ervas, tira HP e manda a
//     condição — o mestre (nas Cenas, com o token da Selene) recebe Envenenado no token; o Desfazer devolve.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const ficha = nome => ({ nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 0, fonte: 'total' }, disputa: {}, estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '',
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }], bolsa: [{ id: 'b1', t: 'material', nome: 'Erva' }] });
const mapa = (gx, gy) => ({ v: 1, id: 'mp_teste', nome: 'Mundo de teste', grade: { x: 0, y: 0, on: true, tam: 10, orient: 'pe' },
  objs: [{ k: 'm', id: 'mc_vashka', nome: 'Vashka', x: 100, y: 100, ic: 'cidade' }, { k: 'g', id: 'gr_selene', x: gx, y: gy, cor: '#e6ab4f', sigla: 'GR', pcs: ['pc_selene'] }] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1300, h: 880, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const abas = p => p.evaluate(() => [...document.querySelectorAll('.tab')].filter(x => !x.hidden).map(x => x.id.slice(4)).join(','));
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const sel = () => M.evaluate(() => { const l = TC.dados.col('personagens').pegar('pc_selene'); return l ? JSON.parse(JSON.stringify({ ficha: l.ficha, estado: l.estado })) : null; });
  const loja = () => M.evaluate(() => { const l = TC.dados.col('documentos').todas().find(x => String(x.id).startsWith('itens:loja:') && !x.apagado); return l ? JSON.parse(JSON.stringify({ id: l.id, dados: l.dados, vis: l.vis })) : null; });
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const toastsDe = p => p.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ '));
  const errosDeFora = () => t.errs.filter(e => !/^\[sonda-/.test(e) || !/status of (400|401|403|409)/.test(e)).filter(e => !/status of (400|401|409)/.test(e));
  const moverGrupo = (x, y) => M.evaluate(m => { TC.dados.col('documentos').gravar('mundo:mapa:mp_teste', { dados: m, vis: 'mestre' }); }, mapa(x, y));
  const resumo = s => { const b = s.ficha.bolsa.find(x => x.nome === 'Poção de cura'); return { lapros: s.estado.lapros, pocoes: b ? s.estado.qtd[b.id] || 0 : 0, ervas: s.estado.qtd.b1, hp: s.estado.rec ? s.estado.rec.hp : undefined }; };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Itens E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    const mesa = await M.evaluate(() => TC.mesas.atual.id);
    const codigo = await codigoDaMesa(M);
    await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp);
    await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    const dalmo = await Dp.evaluate(() => TC.conta.usuario.id);
    ok(/,bestiario,itens,escudo$/.test(await abas(M)) && !/itens|loja/.test(await abas(Dp)), 'a aba Itens, do mestre (depois do Bestiário); o Dalmo não vê nem a Itens nem a Loja — ' + await abas(M));
    await M.evaluate(([f, uid]) => { TC.dados.col('personagens').gravar('pc_selene', { nome: 'Selene', ficha: f, skills: { arvores: [], pontos: {}, alocados: {} }, estado: { qtd: { b1: 7 }, lapros: 100 }, dono_id: uid, vis: 'mesa', ordem: 0 }); }, [ficha('Selene'), dalmo]);
    await moverGrupo(300, 300);
    ok(await ate(() => parado(M)), '(a ficha da Selene, do Dalmo, e o mapa, com o grupo dela longe de Vashka)');

    // ---------- o mestre: o catálogo e a loja ----------
    let IF = null;
    await passo('a loja', async () => {
      await M.locator('#tab-itens').click();
      ok(await ate(async () => { IF = await quadro(M, /\/itens\//); return IF && await IF.evaluate(() => !!window.__itens && __itens.pronto && __itens.naMesa); }, 40000), '(a aba Itens abre, na mesa)');
      const criar = async (nome, tipo, preco, extra) => {
        await IF.locator('#btNovo').click(); await w(200);
        await IF.locator('#it-nome').fill(nome); await IF.locator('#it-tipo [data-v="' + tipo + '"]').click(); await w(100);
        await IF.locator('#it-preco').fill(String(preco)); await IF.locator('#it-preco').press('Tab');
        if (extra) await extra();
        await IF.locator('#dl-ok').click(); await w(250);
      };
      await criar('Poção de cura', 'pocao', 25, async () => { await IF.locator('#it-fx-mais').click(); await w(100); });
      await criar('Espada curta', 'equip', 80, async () => { await IF.locator('#it-b-FOR').fill('3'); await IF.locator('#it-b-FOR').press('Tab'); });
      await IF.locator('#aba-lojas').click(); await w(150);
      await IF.locator('#btNovo').click(); await w(200);
      await IF.locator('#lj-nome').fill('Ferreiro de Vashka'); await IF.locator('#lj-nome').press('Tab');
      ok(/A aba Loja aparece para quem tem um personagem num grupo parado no hexágono deste lugar/.test(await IF.locator('#dlg').innerText()), 'a janela da loja explica quando ela aparece (o mapa tem a grade)');
      await IF.locator('#lj-lugar').selectOption('mc_vashka');
      const ids = await IF.evaluate(() => { const c = __itens.catalogo().itens; return [c.find(x => x.nome === 'Poção de cura').id, c.find(x => x.nome === 'Espada curta').id]; });
      await IF.locator('#lj-add').selectOption(ids[0]); await w(120);
      await IF.locator('#lj-add').selectOption(ids[1]); await w(120);
      await IF.locator('#lj-est-0').fill('3'); await IF.locator('#lj-est-0').press('Tab');
      await IF.locator('#dl-ok').click(); await w(300);
      ok(await ate(async () => { const l = await loja(); return !!l && l.vis === 'mesa' && l.dados.lugar && l.dados.lugar.marcador === 'mc_vashka' && !(l.dados.aqui && l.dados.aqui.length) && await parado(M); }), 'a loja vai para a mesa (a mesa lê), em Vashka — e o banco diz que ninguém está perto — ' + j(await loja()));
      ok(/ninguém por perto/.test(await IF.locator('[data-loja]').innerText()), 'a linha da loja diz: ninguém por perto');
    });

    // ---------- o grupo chega a Vashka ----------
    let LF = null;
    await passo('chegar', async () => {
      await moverGrupo(101, 99);
      ok(await ate(async () => { const l = await loja(); return !!l && j(l.dados.aqui) === j(['pc_selene']); }), 'o grupo da Selene para no hexágono de Vashka: o banco a anota na loja');
      ok(await ate(async () => /,loja/.test(await abas(Dp))), 'a aba Loja aparece para o Dalmo — ' + await abas(Dp));
      ok(await ate(async () => /Uma loja por perto: Ferreiro de Vashka\./.test(await toastsDe(Dp)), 8000), 'com o aviso "Uma loja por perto"');
      ok(await ate(async () => /perto: Selene/.test(await IF.locator('[data-loja]').innerText())), 'e o mestre vê: perto, a Selene');
      await Dp.locator('#tab-loja').click();
      ok(await ate(async () => { LF = await quadro(Dp, /\/loja\//); return LF && await LF.evaluate(() => !!window.__loja && __loja.pronto && __loja.lojas().length === 1); }, 40000), '(a Loja abre para o Dalmo, com o Ferreiro)');
      ok(/Ferreiro de Vashka/.test(await LF.locator('#meio').innerText()) && /100 lapros/.test(await LF.locator('.quem').innerText()), 'a loja: o nome e os lapros da Selene (100)');
      await foto(Dp, 'itens-rede-loja');
    });

    // ---------- comprar ----------
    await passo('comprar', async () => {
      const pot = await LF.locator('.carta', { hasText: 'Poção de cura' }), espada = LF.locator('.carta', { hasText: 'Espada curta' });
      await pot.locator('button[aria-label="Um a mais"]').click(); await w(100, Dp);
      ok(/Comprar · 50/.test(await pot.locator('[data-comprar]').innerText()) && /3 na loja/.test(await pot.innerText()), 'duas poções: "Comprar · 50" (3 na loja)');
      await pot.locator('[data-comprar]').click();
      ok(await ate(async () => j(resumo(await sel())) === j({ lapros: 50, pocoes: 2, ervas: 7, hp: undefined })), 'compra: 100 − 50 lapros, 2 poções na bolsa da Selene — ' + j(resumo(await sel())));
      ok(await ate(async () => (await loja()).dados.itens[0].estoque === 1), 'o estoque da loja baixa (3 → 1)');
      ok(await ate(async () => /Selene comprou 2 × Poção de cura por 50 lapros \(ficam 50\)\./.test(await toastsDe(LF))), 'o aviso da compra, com Desfazer');
      ok(await ate(async () => (await espada.locator('[data-comprar]').isDisabled()) && /Faltam 30 lapros\./.test(await espada.innerText())), 'a espada (80): não dá — "Faltam 30 lapros."');
      await LF.locator('.toast button', { hasText: 'Desfazer' }).last().click();
      ok(await ate(async () => j(resumo(await sel())) === j({ lapros: 100, pocoes: 0, ervas: 7, hp: undefined }) && (await loja()).dados.itens[0].estoque === 3), 'o Desfazer: os lapros voltam, a poção sai, o estoque volta');
      await w(500, Dp);
      await LF.locator('.carta', { hasText: 'Poção de cura' }).locator('[data-comprar]').click();
      ok(await ate(async () => resumo(await sel()).pocoes === 1 && resumo(await sel()).lapros === 75), 'compra uma de novo (75 lapros)');
    });

    // ---------- o Jornal do mestre ----------
    await passo('o jornal', async () => {
      await M.locator('#tab-jornal').click();
      let JF = null;
      ok(await ate(async () => { JF = await quadro(M, /\/jornal\//); return JF && (await JF.locator('#sec-compras').count()) === 1; }, 40000), 'o Jornal do mestre tem as compras');
      const txt = await JF.locator('#sec-compras').innerText();
      ok(/Selene · Ferreiro de Vashka/.test(txt) && /Comprou Poção de cura por 25 lapros\./.test(txt) && /Comprou 2 × Poção de cura por 50 lapros\./.test(txt) && await JF.locator('#sec-compras .desfeita').count() === 1, 'as duas compras, a desfeita riscada — ' + txt.replace(/\n/g, ' | '));
      await JF.locator('#sec-compras').scrollIntoViewIfNeeded(); await foto(M, 'itens-rede-jornal');
    });

    // ---------- sair de Vashka ----------
    await passo('sair', async () => {
      await moverGrupo(300, 300);
      ok(await ate(async () => !/loja/.test(await abas(Dp))), 'o grupo sai de Vashka: a aba Loja some para o Dalmo');
      const sD = await t.device({ name: 'sonda-Dalmo' }); await sD.page.goto(t.base + 'src/tests/vazio.html'); await entrar(sD.page, c.jog1, c.senha, 'Dalmo');
      const lj = (await loja()).id.slice(11), it = (await loja()).dados.itens[0].id;
      const r = await sD.page.evaluate(async a => { const x = await sb.rpc('itens_comprar', a); return x.error ? x.error.message : 'foi'; }, { p_mesa: mesa, p_loja: lj, p_item: it, p_qtd: 1, p_pc: 'pc_selene' });
      ok(/não está perto desta loja/.test(r), 'comprar pelo banco de longe: recusado — ' + r);
      const r2 = await sD.page.evaluate(async a => { const x = await sb.from('documentos').upsert({ mesa_id: a, id: 'itens:loja:sb_falsa', vis: 'mesa', dados: { nome: 'x' }, apagado: false }); return x.error ? 'recusado' : 'foi'; }, mesa);
      ok(r2 === 'recusado', 'o jogador não cria loja');
      await sD.ctx.close();
    });

    // ---------- o Mapa-múndi: os personagens do grupo ----------
    await passo('o mapa', async () => {
      await M.locator('#tab-mundo').click();
      let W = null;
      ok(await ate(async () => { W = await quadro(M, /\/mundo\//); return !!W && await W.evaluate(() => !!window.__mundo && __mundo.App.pronto && __mundo.App.naMesa && __mundo.App.papel === 'mestre'); }, 40000), '(o mestre abre o Mapa-múndi)');
      ok(await W.evaluate(() => __mundo.App.trocarMapa('mp_teste')) === true, '(o mapa de teste)');
      await W.evaluate(() => __mundo.App.selecionar(['gr_selene'])); await w(300);
      await W.evaluate(() => { const b = document.getElementById('tab-selecao'); if (b && b.getAttribute('aria-selected') !== 'true') b.click(); }); await w(400);
      ok(await ate(async () => (await W.locator('[data-k="o:gr_selene:pcs"]').count()) === 1), 'o painel do grupo tem "Personagens deste grupo"');
      const cx = W.locator('[data-k="o:gr_selene:pc:pc_selene"]');
      ok(await cx.isChecked(), 'a Selene vem marcada (o grupo é o dela)');
      await cx.uncheck(); await w(600);
      ok(await ate(async () => await M.evaluate(() => { const d = TC.dados.col('documentos').pegar('mundo:mapa:mp_teste'); const g = d && d.dados.objs.find(o => o.id === 'gr_selene'); return !!g && !g.pcs; })), 'desmarcar tira a Selene do grupo (no mapa da mesa)');
      await cx.check(); await w(600);
      ok(await ate(async () => await M.evaluate(() => { const d = TC.dados.col('documentos').pegar('mundo:mapa:mp_teste'); const g = d && d.dados.objs.find(o => o.id === 'gr_selene'); return !!g && Array.isArray(g.pcs) && g.pcs.join() === 'pc_selene'; })), 'marcar põe de volta');
      await foto(M, 'itens-rede-mapa');
    });

    // ---------- a bancada ----------
    await passo('a bancada', async () => {
      await M.evaluate(([p]) => {
        const D = TC.dados.col('documentos');
        D.gravar('itens:rec:rc_simples', { vis: 'mesa', dados: { v: 1, nome: 'Poção simples', ingredientes: [{ nome: 'Erva', t: 'material', qtd: 2 }], resultado: { item: p, qtd: 1 }, teste: null, falha: { perde: true, dano: [], conds: [] } } });
        D.gravar('itens:rec:rc_dificil', { vis: 'mesa', dados: { v: 1, nome: 'Poção difícil', ingredientes: [{ nome: 'Erva', t: 'material', qtd: 3 }], resultado: { item: p, qtd: 1 }, teste: { atr: 'CAN', dif: 999 }, falha: { perde: true, dano: [{ barra: 'HP', val: '5' }], conds: [{ c: 'veneno', r: 3 }] } } });
      }, [{ id: 'it_pot', t: 'pocao', nome: 'Poção de cura', nota: '', preco: 25, fx: [] }]);
      // o mestre abre o Acampamento (a Selene entra nele) e as Cenas, com o token dela
      await M.locator('#tab-acampamento').click();
      ok(await ate(async () => { const a = await quadro(M, /\/acampamento\//); return !!a && await M.evaluate(() => { const d = TC.dados.col('documentos').pegar('acampamento'); return !!d && !d.apagado && Array.isArray(d.dados.presentes) && d.dados.presentes.includes('pc_selene'); }); }, 40000), '(o mestre abre o Acampamento: a Selene está nele)');
      await M.locator('#tab-cenas').click();
      let C = null;
      ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && !!__tc.Store.scene() && __tc.Fichas.on() && !!__tc.Fichas.get('pc_selene')); }, 40000), '(as Cenas do mestre, com a ficha da Selene)');
      const tok = await C.evaluate(() => __tc.Combate.trazer(['pc_selene'], 200, 200)[0]);
      // o Dalmo, no Acampamento: a Bancada
      await Dp.locator('#tab-acampamento').click();
      let A = null;
      ok(await ate(async () => { A = await quadro(Dp, /\/acampamento\//); return !!A && (await A.locator('#tab-bancada').count()) === 1; }, 40000), '(o Dalmo abre o Acampamento: a aba Bancada)');
      await A.locator('#tab-bancada').click(); await w(400, Dp);
      ok(await ate(async () => (await A.locator('[data-rec]').count()) === 2), 'as duas receitas na bancada');
      const simples = A.locator('[data-rec="rc_simples"]'), dificil = A.locator('[data-rec="rc_dificil"]');
      ok(/2 × Erva · tem 7/.test(await simples.innerText()) && /sem teste/.test(await simples.innerText()) && /teste de Canalização Mágica .* contra 999/.test(await dificil.innerText()) && /Se falhar: perde os ingredientes, HP −5, Envenenado \(3 rodadas\)\./.test(await dificil.innerText()), 'cada receita: os ingredientes (o que a bolsa tem), o teste e o que a falha faz');
      await foto(Dp, 'itens-rede-bancada');
      await simples.locator('button', { hasText: 'Fazer' }).click(); await w(250, Dp);
      await A.locator('#banc-ok').click();
      ok(await ate(async () => j(resumo(await sel())) === j({ lapros: 75, pocoes: 2, ervas: 5, hp: undefined })), 'a receita sem teste: 2 ervas saem, a poção entra — ' + j(resumo(await sel())));
      await A.locator('#tab-bancada').click(); await w(300, Dp);
      await A.locator('[data-rec="rc_dificil"] button', { hasText: 'Fazer' }).click(); await w(250, Dp);
      ok(/Rolar e fazer/.test(await A.locator('#banc-ok').innerText()) && await A.locator('#banc-dispensa').count() === 0, 'com teste: "Rolar e fazer" (o jogador não dispensa o teste)');
      await A.locator('#banc-ok').click();
      ok(await ate(async () => { const r = resumo(await sel()); return r.ervas === 2 && r.pocoes === 2 && r.hp === 95; }), 'falhou: perde 3 ervas e o HP vai de 100 a 95 — ' + j(resumo(await sel())));
      ok(await ate(async () => await C.evaluate(id => __tc.Store.get('tokens', id).conds.includes('veneno') && __tc.Store.get('tokens', id).cinfo.veneno.d === 3, tok)), 'a condição chega às Cenas do mestre: Envenenado (3 rodadas) no token da Selene');
      ok(await ate(async () => /Selene falhou na bancada: Envenenado \(3 rodadas\) no token\./.test(await C.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ ')))), 'o mestre vê o aviso, com Desfazer');
      ok(await ate(async () => /Selene tentou fazer Poção de cura e falhou/.test(await toastsDe(A))), 'o Dalmo vê o resultado');
      await A.locator('.toast button', { hasText: 'Desfazer' }).last().click();
      ok(await ate(async () => { const r = resumo(await sel()); return r.ervas === 5 && (r.hp === undefined || r.hp === 100); }), 'o Desfazer do Dalmo devolve as ervas e o HP (cheio de novo) — ' + j(resumo(await sel())));
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
