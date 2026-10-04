// Acampamento numa mesa de verdade (projeto real): a roda com os personagens dos jogadores, o descanso que mexe nas
// fichas (barras, Sanidade, Conforto, poderes) e gasta provisões, o Desfazer, o momento entre dois personagens,
// a imagem de fundo no banco — e o jogador vendo tudo sem poder mexer.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const pc = (id, nome, lvl, estado) => ({ id, nome, raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: lvl, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null,
  poderes: [{ id: 'pw' + id, nome: 'Cura', atual: 0, max: 2 }], skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 20, fonte: 'total' }, ultRol: null,
  disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [],
  recursos: [{ id: 'hp' + id, nome: 'HP', fml: 'VIT*8 + LVL*5' }, { id: 'sp' + id, nome: 'SP', fml: 'CAN*6 + LVL*3' }], notas: '', estado });
const local = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_dain', 'Dain X', 5, { rec: { hppc_dain: 40 }, san: 60, conf: 30 }), pc('pc_lia', 'Lia', 3, {}), pc('pc_ogro', 'Ogro', 6, { rec: { hppc_ogro: 10 } })], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { urgm_calc_atributos_v1: local, 'tinycats:aba': 'fichas' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'acampamento' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 16000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const linha = (p, id) => p.evaluate(id => TC.dados.col('personagens').pegar(id), id);
  const doc = p => p.evaluate(() => { const d = TC.dados.col('documentos').pegar('acampamento'); return d ? { vis: d.vis, dados: d.dados, rev: d.rev } : null; });
  const semPendencia = p => p.evaluate(() => TC.dados.pendentes === 0);

  // ---------- o mestre monta a mesa ----------
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Acampamento E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let F = null;
  ok(await ate(async () => { F = await quadro(M, /\/fichas\//); return F && (await F.locator('#ofertaSim').count()) === 1; }), 'a mesa nova oferece trazer as fichas');
  await F.locator('#ofertaSim').click(); await w(600);
  ok(await ate(async () => await M.evaluate(() => TC.dados.col('personagens').todas().length === 3 && TC.dados.pendentes === 0)), 'as três fichas sobem');
  const mesaId = await M.evaluate(() => TC.mesas.atual.id);
  await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  const jogId = await J.evaluate(() => TC.conta.usuario.id);
  ok(await ate(async () => (await F.locator('#f_dono option').allInnerTexts()).join('|').includes('Dalmo')), 'o jogador entra na mesa');
  await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(500);
  ok(await ate(async () => { const l = await linha(M, 'pc_dain'); return l.dono_id === jogId && await semPendencia(M); }), 'o Dain X é entregue ao jogador');

  // ---------- o acampamento do mestre ----------
  await M.locator('#tab-acampamento').click();
  let A = null;
  ok(await ate(async () => { A = await quadro(M, /\/acampamento\//); return A && await A.evaluate(() => !!window.__acamp && __acamp.pronto && __acamp.modo === 'mesa' && __acamp.papel === 'mestre'); }), 'o mestre abre o Acampamento da mesa');
  ok(await ate(async () => await A.evaluate(() => __acamp.camp.presentes.join() === 'pc_dain')), 'o personagem do jogador entra na roda sozinho');
  ok(await A.locator('#btMomento').isVisible(), 'na mesa, há o botão "Momento…"');
  await A.locator('#chamar').selectOption({ label: 'Ogro' }); await w(400);
  await A.evaluate(() => __acamp.mudar('preparar', c => { c.nome = 'Clareira do Vau'; c.provisoes = [{ id: 'pao', nome: 'Pão de viagem', qtd: 6 }]; c.melhorias = [{ id: 'fogao', nome: 'Fogão de pedra', desc: '', on: true, ef: { conf: 5, san: 0, rec: 0, prov: 0 } }]; }));
  ok(await ate(async () => { const d = await doc(M); return d && d.vis === 'mesa' && d.rev > 0 && d.dados.roda.length === 2 && d.dados.roda[0].dono === jogId && await semPendencia(M); }), 'o acampamento fica guardado na mesa, com a roda (nome, imagem e dono de cada um)');

  // ---------- o jogador vê, sem poder mexer ----------
  let B = null;
  ok(await ate(async () => { B = await quadro(J, /\/acampamento\//); return B && await B.evaluate(() => !!window.__acamp && __acamp.pronto && __acamp.papel === 'jogador' && __acamp.camp.nome === 'Clareira do Vau'); }), 'o jogador abre o Acampamento e recebe o da mesa');
  ok(await ate(async () => (await B.locator('#roda .pers').count()) === 2), 'ele vê a roda inteira: o personagem dele e o Ogro');
  ok(await B.locator('#roda .pers', { hasText: 'Dain X' }).locator('.b').count() === 4 && await B.locator('#roda .pers', { hasText: 'Ogro' }).locator('.b').count() === 0, 'com as barras só do personagem dele (a ficha do Ogro não é dele para ver)');
  ok(await B.locator('#acoes').isHidden() && await B.locator('#btDesfazer').isHidden() && await B.locator('#hora').isHidden() && await B.locator('#nome').evaluate(el => el.readOnly), 'sem os botões de descanso, a hora, o desfazer, nem como mudar o nome');
  await B.locator('#tab-provisoes').click(); await w(300, J);
  ok((await B.locator('#pane').innerText()).includes('6 rações guardadas') && await B.locator('#pv-novo').count() === 0 && await B.locator('#pane input:not([readonly]):not([disabled])').count() === 0, 'vê as provisões, mas não as edita');
  const invasor = await J.evaluate(async mesa => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave); const r = await a.from('documentos').update({ dados: { nome: 'invadido' } }).eq('mesa_id', mesa).eq('id', 'acampamento').select('id'); return { n: (r.data || []).length, erro: r.error ? r.error.message : null }; }, mesaId);
  ok(invasor.n === 0, 'e o banco não aceita mudança dele no acampamento: ' + JSON.stringify(invasor));

  // ---------- descanso longo: mexe nas fichas ----------
  await A.locator('#btLongo').click(); await w(400);
  const previa = (await A.locator('dialog[open]').innerText()).replace(/\s+/g, ' ');
  ok(previa.includes('gasta 2 de 6 rações') && /HP 40 → (\d+)\/\1/.test(previa) && previa.includes('60 → 65') && previa.includes('30 → 45') && previa.includes('Cura 0 → 2'), 'a prévia mostra o que vai mudar em cada ficha: ' + previa.slice(0, 260));
  const hpCheio = +/HP 40 → (\d+)\//.exec(previa)[1];
  await A.locator('#ds-ok').click(); await w(500);
  ok(await ate(async () => { const l = await linha(M, 'pc_dain'); return l.estado.rec.hppc_dain === hpCheio && l.estado.san === 65 && l.estado.conf === 45 && l.ficha.poderes[0].atual === 2 && await semPendencia(M); }), 'descansando, a ficha do Dain fica com HP cheio, Sanidade 65, Conforto 45 e o poder de volta');
  ok(await ate(async () => { const l = await linha(M, 'pc_ogro'); return l.estado.rec.hppc_ogro > 10 && l.estado.san === undefined && l.estado.conf === undefined; }), 'o Ogro recupera o HP e não ganha Sanidade nem Conforto (a ficha dele não usa)');
  ok(await ate(async () => { const d = await doc(M); return d.dados.provisoes[0].qtd === 4 && d.dados.diario.length === 1; }), 'as rações saem e o diário registra');
  ok(await ate(async () => (await M.locator('#feed .rol', { hasText: 'Descanso longo: 2 descansaram' }).count()) === 1), 'a mesa ao vivo avisa do descanso');
  ok(await M.locator('#feed .rol', { hasText: 'Descanso longo' }).locator('.or').innerText() === 'Acampamento', 'com a origem "Acampamento"');
  ok(await ate(async () => (await J.locator('#feed .rol', { hasText: 'Descanso longo: 2 descansaram' }).count()) === 1), 'e o jogador também recebe o aviso');
  ok(await ate(async () => { const l = await linha(J, 'pc_dain'); return l.estado.rec.hppc_dain === hpCheio && l.estado.san === 65; }), 'a ficha do jogador muda na tela dele');
  ok(await ate(async () => await B.evaluate(() => __acamp.camp.provisoes[0].qtd === 4)), 'e o acampamento dele mostra as rações que sobraram');

  // ---------- desfazer o descanso ----------
  ok(await A.locator('#btDesfazer').isEnabled() && (await A.locator('#btDesfazer').getAttribute('title')).includes('o descanso longo'), 'o botão Desfazer do acampamento aponta para o descanso');
  await A.locator('#btDesfazer').click(); await w(500);
  ok(await ate(async () => { const l = await linha(M, 'pc_dain'), o = await linha(M, 'pc_ogro'), d = await doc(M); return l.estado.rec.hppc_dain === 40 && l.estado.san === 60 && l.estado.conf === 30 && l.ficha.poderes[0].atual === 0 && o.estado.rec.hppc_ogro === 10 && d.dados.provisoes[0].qtd === 6 && d.dados.diario.length === 0 && await semPendencia(M); }), 'o Desfazer devolve as fichas, as rações e o diário como estavam');
  ok(await ate(async () => (await linha(J, 'pc_dain')).estado.rec.hppc_dain === 40), 'e o jogador vê a ficha de volta');
  ok(await ate(async () => (await M.locator('#feed .rol', { hasText: 'Desfeito: o descanso longo' }).count()) === 1), 'a mesa ao vivo avisa que foi desfeito');

  // ---------- um momento entre dois personagens ----------
  await M.locator('#tab-fichas').click(); await w(500);
  await F.locator('#lista .pc', { has: F.locator('.nm', { hasText: /^Lia$/ }) }).click(); await w(300);
  await F.locator('#f_dono').selectOption({ label: 'Dalmo' }); await w(600);
  await M.locator('#tab-acampamento').click(); await w(500);
  ok(await ate(async () => await A.evaluate(() => __acamp.camp.presentes.includes('pc_lia'))), 'a Lia, agora de um jogador, entra na roda sozinha');
  await A.locator('#btMomento').click(); await w(400);
  await A.locator('#mo-a').selectOption('pc_dain'); await w(150); await A.locator('#mo-b').selectOption('pc_lia'); await w(150);
  await A.locator('#mo-da').fill('8'); await A.locator('#mo-da').press('Tab'); await w(150);
  await A.locator('#mo-db').fill('-3'); await A.locator('#mo-db').press('Tab'); await w(150);
  await A.locator('#mo-txt').fill('Dain dividiu a última ração; Lia desconfiou do gesto.'); await w(100);
  await A.locator('#mo-ok').click(); await w(500);
  ok(await ate(async () => { const a = await linha(M, 'pc_dain'), b = await linha(M, 'pc_lia'); const ra = (a.estado.rel || []).find(e => e.alvo === 'pc_lia'), rb = (b.estado.rel || []).find(e => e.alvo === 'pc_dain'); return ra && ra.v === 8 && rb && rb.v === -3 && await semPendencia(M); }), 'o momento mexe no Relacionamento de cada um pelo outro (+8 e −3)');
  ok(await ate(async () => { const d = await doc(M); return d.dados.diario.length === 1 && d.dados.diario[0].texto.includes('Momento entre Dain X e Lia') && d.dados.diario[0].texto.includes('Dain X → Lia +8'); }), 'entra no diário');
  ok(await ate(async () => (await J.locator('#feed .rol', { hasText: 'Dain dividiu a última ração' }).count()) === 1), 'e na mesa ao vivo');

  // ---------- a imagem de fundo vai para o banco ----------
  await A.evaluate(async () => {
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360;
    const cx = cv.getContext('2d'); cx.fillStyle = '#243a2c'; cx.fillRect(0, 0, 640, 360);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'fundo.png', { type: 'image/png' }));
    const arq = document.querySelector('#arq'); arq.files = dt.files; arq.dispatchEvent(new Event('change', { bubbles: true }));
  });
  ok(await ate(async () => { const d = await doc(M); return d.dados.fundo && d.dados.fundo.url.startsWith('https://kzvhiuhbnsfkmhhgvqlm.supabase.co/storage/v1/object/public/mesas/' + mesaId + '/'); }, 25000), 'o fundo escolhido pelo mestre fica guardado no banco');
  ok(await ate(async () => (await B.locator('#cena16 img.fundo').count()) === 1 && await B.locator('#cena16 img.fundo').evaluate(el => el.naturalWidth === 640)), 'e aparece para o jogador');

  if (process.env.FOTOS) { await M.screenshot({ path: process.env.FOTOS + '/acamp-mestre.png' }); await J.locator('#tab-acampamento').click(); await w(400, J); await B.locator('#tab-grupo').click(); await w(300, J); await J.screenshot({ path: process.env.FOTOS + '/acamp-jogador.png' }); }
  await apagarMesaTela(M, nomeMesa);
  const errs = t.errs.filter(e => !/^\[prep\]/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/status of (400|401|403|409)/.test(e));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  ok(errs.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
