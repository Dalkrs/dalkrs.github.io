// A busca rápida (lote 7, parte 6) numa mesa de verdade (banco local de ensaio ou o projeto real):
//   · quem joga acha só o que pode abrir: o personagem dele e as fichas que os jogadores veem (o NPC escondido, não), o
//     que os jogadores veem no Mapa-múndi (o marcador e a facção escondidos, não), as receitas que o personagem dele
//     descobriu (as outras, não), o Jornal publicado (o rascunho, não) — e nenhuma cena;
//   · escolher leva direto (o marcador selecionado no mapa dele, a receita descoberta, a matéria);
//   · quem mestra acha tudo: a cena (e vai até ela), o escondido do mapa, as receitas, o rascunho.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const j = JSON.stringify;
const pc = (id, nome, extra) => Object.assign({ id, nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 5, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null,
  poderes: [], skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 20, fonte: 'total' }, ultRol: null,
  disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [], bolsa: [],
  recursos: [{ id: 'hp' + id, nome: 'HP', fml: 'VIT*8 + LVL*5' }], notas: '', estado: {} }, extra || {});
const local = j({ v: 1, cfg: R.cfgPadrao(), situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [],
  personagens: [pc('pc_dain', 'Dáin Escudo', { itens: [{ id: 'i1', nome: 'Escudo de carvalho', equipado: true, bonus: { VIT: 3 } }] }), pc('npc_ogro', 'Ogro da Ponte'), pc('npc_bram', 'Taverneiro Bram')] });
const materia = (id, tit) => ({ id, tit, txt: 'Texto de ' + tit + '.', ass: '', dest: false });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { urgm_calc_atributos_v1: local, 'tinycats:aba': 'fichas' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'jornal' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const semPendencia = p => p.evaluate(() => TC.dados.pendentes === 0);
  // a busca de uma página: abre (se preciso), digita e devolve os nomes achados e o texto da lista
  async function buscar(p, txt) {
    if ((await p.locator('dialog.busca[open]').count()) === 0) { await p.click('#btnBusca'); await p.waitForTimeout(200); }
    await p.fill('#buscaQ', txt);
    await ate(async () => !/Carregando…/.test(await p.locator('#buscaLista').innerText()), 15000);
    await p.waitForTimeout(150);
    return { nomes: await p.locator('#buscaLista .bu-r b').allInnerTexts(), subs: await p.locator('#buscaLista .bu-r small').allInnerTexts(), texto: await p.locator('#buscaLista').innerText() };
  }
  async function escolher(p, txt, nome) {
    await buscar(p, txt);
    await p.locator('#buscaLista .bu-r').filter({ has: p.locator('b', { hasText: nome }) }).first().click();
    await p.waitForTimeout(400);
  }
  let nomeMesa = null;
  try {
    // ---------- a mesa, as fichas e o jogador ----------
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    nomeMesa = 'Busca E2E ' + Date.now().toString(36);
    const codigo = await criarMesaTela(M, nomeMesa);
    let F = null;
    ok(await ate(async () => { F = await quadro(M, /\/fichas\//); return F && (await F.locator('#ofertaSim').count()) === 1; }), '(a mesa nova oferece trazer as fichas)');
    await F.locator('#ofertaSim').click(); await w(600);
    ok(await ate(async () => await M.evaluate(() => TC.dados.col('personagens').todas().length === 3 && TC.dados.pendentes === 0)), '(as três fichas sobem)');
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    const jogId = await J.evaluate(() => TC.conta.usuario.id);
    ok(await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), '(o jogador entra na mesa)');
    await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(500);
    await M.evaluate(() => TC.dados.col('personagens').gravar('npc_bram', { vis: 'mesa' }));
    ok(await ate(async () => { const l = await M.evaluate(() => [TC.dados.col('personagens').pegar('pc_dain'), TC.dados.col('personagens').pegar('npc_bram')]); return l[0].dono_id === jogId && l[1].vis === 'mesa' && await semPendencia(M); }),
      '(o Dáin é do jogador; o Taverneiro Bram, visível para os jogadores; o Ogro continua escondido)');

    // ---------- o Mapa-múndi: o que os jogadores veem e o que não ----------
    await M.locator('#tab-mundo').click();
    let W = null;
    ok(await ate(async () => { W = await quadro(M, /\/mundo\//); return W && await W.evaluate(() => !!window.__mundo && __mundo.App.pronto && __mundo.App.naMesa && __mundo.App.papel === 'mestre'); }), '(o mestre abre o Mapa-múndi da mesa)');
    const ids = await W.evaluate(() => {
      const { App, N } = __mundo, out = {};
      App.criarMapa('Urgm');
      App.mudar('montar', m => {
        const vila = Object.assign(N.objNovo('m', { x: 300, y: 200 }), { nome: 'Vila do Dain' }), covil = Object.assign(N.objNovo('m', { x: 700, y: 500 }), { nome: 'Covil das Sombras', oculto: true });
        const f1 = N.faccaoNova('Guilda dos Ratos', 0), f2 = Object.assign(N.faccaoNova('Culto Oculto', 1), { oculta: true });
        m.objs.push(vila, covil); m.faccoes.push(f1, f2);
        out.vila = vila.id; out.mapa = m.id;
      });
      App.mostrarAosJogadores(out.mapa);
      return out;
    });
    ok(await ate(async () => await M.evaluate(id => { const d = TC.dados.col('documentos'), p = d.pegar('mundo:pub:' + id); return !!(p && p.dados && p.dados.objs.length === 1) && TC.dados.pendentes === 0; }, ids.mapa)),
      '(o mapa mostrado aos jogadores: só a vila; o covil escondido)');

    // ---------- uma cena, o Jornal e as receitas ----------
    await M.locator('#tab-cenas').click();
    let C = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.on()); }, 30000), '(o mestre abre as Cenas da mesa)');
    const cena = await C.evaluate(() => { const sc = __tc.newScene('Taverna do Javali'); __tc.Store.addScene(sc); __tc.Persist.scene(sc.id); __tc.Persist.meta(); return sc.id; });
    await M.evaluate(([pub, ras, jog]) => {
      const D = TC.dados.col('documentos');
      D.gravar('jornal:pub', { dados: pub, vis: 'mesa' });
      D.gravar('jornal:rascunho', { dados: ras, vis: 'mestre' });
      D.gravar('medit:receitas', { dados: { v: 1, lista: [{ id: 'rc_chama', nome: 'Chama interior', seq: [], efeito: 'Aquece.', onde: null, quem: null }, { id: 'rc_vento', nome: 'Vento leste', seq: [], efeito: '', onde: null, quem: null }] }, vis: 'mestre' });
      D.gravar('medit:achados:pc_dain', { dados: { v: 1, lib: 0, feitas: 0, achadas: [{ id: 'rc_chama', nome: 'Chama interior', efeito: 'Aquece.', em: '2026-10-17T12:00:00.000Z', amb: null }], reg: [] }, vis: 'mestre', dono_id: jog });
    }, [{ nome: 'O Arauto', clima: { t: '', frase: '' }, materias: [materia('mt1', 'Dragão visto em Urgm')], notas: [], cartas: [], data: '', em: '2026-10-17T12:00:00.000Z', n: 1 },
      { nome: 'O Arauto', clima: { t: '', frase: '' }, materias: [materia('mt1', 'Dragão visto em Urgm'), materia('mt2', 'O golpe no palácio')], notas: [], cartas: [] }, jogId]);
    ok(await ate(async () => await M.evaluate(id => { const D = TC.dados.col('documentos'); return !!D.pegar('cena:' + id + ':m') && !!D.pegar('medit:achados:pc_dain') && TC.dados.pendentes === 0; }, cena)), '(a cena, o Jornal e as receitas na mesa)');

    // ---------- quem joga ----------
    ok(await ate(async () => await J.evaluate(() => { const D = TC.dados.col('documentos'); return !!D.pegar('medit:achados:pc_dain') && !!D.pegar('jornal:pub'); })), '(chega ao jogador o que é dele)');
    let r = await buscar(J, '');
    ok(/o que os jogadores veem no Mapa-múndi/.test(r.texto) && /as receitas que seus personagens descobriram/.test(r.texto) && !/as cenas/.test(r.texto), 'a dica, do jeito de quem joga (sem as cenas): ' + r.texto);
    r = await buscar(J, 'dain');
    ok(r.nomes[0] === 'Dáin Escudo' && r.subs[0] === 'Seu personagem' && r.nomes.includes('Vila do Dain') && r.nomes.includes('Escudo de carvalho'), 'quem joga acha o personagem dele (e o item), e a vila do mapa mostrado: ' + j(r.nomes));
    r = await buscar(J, 'tavern');
    ok(j(r.nomes) === j(['Taverneiro Bram']), 'o NPC que os jogadores veem, sim; a cena, não: ' + j(r.nomes));
    const nada = async q => /Nada com/.test((await buscar(J, q)).texto);
    ok(await nada('ogro') && await nada('covil') && await nada('culto') && await nada('vento') && await nada('golpe') && await nada('javali'),
      'o que é escondido dele não aparece: o NPC escondido, o marcador e a facção escondidos, a receita que ele não descobriu, o rascunho do Jornal, a cena');
    r = await buscar(J, 'chama');
    ok(j(r.nomes) === j(['Chama interior']) && r.subs[0] === 'Descoberta por Dáin Escudo', 'a receita que o personagem dele descobriu: ' + j(r.subs));
    ok((await buscar(J, 'guilda')).nomes.includes('Guilda dos Ratos') && (await buscar(J, 'dragao')).nomes.includes('Dragão visto em Urgm'), 'a facção que os jogadores veem e a matéria publicada');
    await escolher(J, 'vila', 'Vila do Dain');
    let JW = null;
    ok(await ate(async () => { JW = await quadro(J, /\/mundo\//); return JW && await JW.evaluate(id => window.__mundo && __mundo.App.pronto && (__mundo.App.sel || []).join() === id, ids.vila); }),
      'escolher a vila: o Mapa-múndi do jogador abre com ela selecionada');
    await escolher(J, 'chama', 'Chama interior');
    let JM = null;
    ok(await ate(async () => { JM = await quadro(J, /\/meditacao\//); return JM && (await JM.locator('[data-achada="rc_chama"]').count()) === 1 && /achado/.test(await JM.locator('[data-achada="rc_chama"]').getAttribute('class')); }, 15000),
      'escolher a receita: a Meditação do jogador, com a receita descoberta marcada');
    await escolher(J, 'dragao', 'Dragão visto em Urgm');
    let JJ = null;
    ok(await ate(async () => { JJ = await quadro(J, /\/jornal\//); return JJ && /achado/.test(await JJ.locator('#leitura [data-mat="mt1"]').getAttribute('class') || ''); }, 15000), 'escolher a matéria: o Jornal, com ela marcada');

    // ---------- quem mestra ----------
    r = await buscar(M, 'tavern');
    ok(r.nomes.includes('Taverna do Javali') && r.nomes.includes('Taverneiro Bram'), 'quem mestra acha a cena (e o NPC): ' + j(r.nomes));
    ok((await buscar(M, 'covil')).nomes.includes('Covil das Sombras') && (await buscar(M, 'culto')).nomes.includes('Culto Oculto') && (await buscar(M, 'vento')).nomes.includes('Vento leste') && (await buscar(M, 'golpe')).nomes.includes('O golpe no palácio') && (await buscar(M, 'ogro')).nomes.includes('Ogro da Ponte'),
      'e o escondido: o marcador e a facção escondidos, as receitas, o rascunho, o NPC escondido');
    await M.keyboard.press('Escape'); await w(200);
    await M.locator('#tab-jornal').click(); await w(500);
    await escolher(M, 'javali', 'Taverna do Javali');
    ok(await ate(async () => await C.evaluate(id => __tc.Store.S.current === id, cena)) && await M.evaluate(() => (document.querySelector('.tab[aria-selected="true"]') || {}).id) === 'tab-cenas', 'escolher a cena: as Cenas abrem nela');
  } catch (e) {
    console.log(String((e && e.message) || e).slice(0, 1200));
    ok(false, 'o teste parou: ' + String((e && e.message) || e).split('\n')[0]);
  } finally {
    // (a janela da busca, se ficou aberta, sai da frente antes de apagar a mesa)
    if ((await M.locator('dialog.busca[open]').count().catch(() => 0)) > 0) await M.keyboard.press('Escape').catch(() => {});
    if (nomeMesa) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste:', e.message); } }
    const erros = (t.errs || []).filter(e => !/^\[prep\]/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/status of (400|401|403|409)/.test(e));
    if (erros.length) console.log(erros.slice(0, 8).join('\n'));
    ok(erros.length === 0, 'sem erros inesperados no console');
    await t.close();
    end();
  }
})().catch(e => { console.error(e); process.exit(1); });
