// Cenas numa mesa de verdade (projeto real): as cenas e as imagens guardadas no banco, o mestre escolhendo a cena
// que está no ar, o jogador vendo só o que pode ver, e o que ele faz chegando ao mestre (e só o que ele pode fazer).
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const fs = require('fs');
const R = require('../../tc/rules.js');
const pcLia = { id: 'pc_lia', nome: 'Lia', raca: 'Humano', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null,
  poderes: [], skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 10, DFM: 4 }, rol: { fixa: 20, fonte: 'total' }, ultRol: null,
  disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [],
  recursos: [{ id: 'hp_lia', nome: 'HP', fml: 'VIT*8 + LVL*5' }, { id: 'sp_lia', nome: 'SP', fml: 'CAN*6 + LVL*3' }], notas: '' };
void R;

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'cenas', 'tinycats-tour': '1' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'cenas' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const semPendencia = p => p.evaluate(() => TC.dados.pendentes === 0);
  const docs = (p, pre) => p.evaluate(pre => TC.dados.col('documentos').todas().filter(l => l.id.startsWith(pre)).map(l => ({ id: l.id, vis: l.vis, dono: l.dono_id, rev: l.rev, kb: Math.round(JSON.stringify(l.dados).length / 1024) })), pre);
  const doc = (p, id) => p.evaluate(id => { const l = TC.dados.col('documentos').pegar(id); return l ? l.dados : null; }, id);
  // o programa das Cenas dentro da casca
  const cenasDe = async p => { let f = null; await ate(async () => { f = await quadro(p, /\/cenas\//); return f && await f.evaluate(() => !!window.__tc && !!__tc.Store.scene()); }); return f; };

  // ---------- antes da mesa: o mestre já tinha cenas guardadas neste navegador ----------
  await M.goto(t.base + 'cenas/?debug', { waitUntil: 'load' }); await w(1500);
  await M.evaluate(async () => {
    const u = __tc, sc = u.newScene('Taverna do Javali');
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; const g = cv.getContext('2d'); g.fillStyle = '#7a3b2e'; g.fillRect(0, 0, 96, 96); g.fillStyle = '#f2d16b'; g.fillRect(24, 24, 48, 48);
    const a = u.Assets.register(cv.toDataURL('image/png'), 96, 96, 'token', 'Taverneiro');
    sc.tokens.push(u.newToken(sc, 128, 128, { name: 'Taverneiro', img: a.id }), u.newToken(sc, 256, 128, { name: 'Bardo', owner: u.Store.S.players[0].id }));
    u.Store.addScene(sc); u.Persist.scene(sc.id); u.Persist.meta();
    await u.Persist.flush();
  });
  ok(await M.evaluate(() => __tc.Nuvem.modo() === 'local' && __tc.Store.S.order.length === 2 && __tc.Persist.status() === 'ok'), 'fora de uma mesa, as cenas ficam neste navegador (como sempre): a de exemplo e a Taverna');

  // ---------- o mestre abre a mesa: as cenas passam a ser as da mesa ----------
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cenas E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  const mesaId = await M.evaluate(() => TC.mesas.atual.id);
  let C = await cenasDe(M);
  ok(!!C && await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && !!__tc.Store.scene()); }), 'com a mesa aberta, as Cenas entram no modo da mesa (mestre)');
  ok(await C.evaluate(() => __tc.Store.S.order.length === 1 && __tc.Store.scene().name === 'Nova cena' && __tc.Store.scene().tokens.length === 0), 'a mesa nova começa com uma cena vazia (nada do navegador entra sozinho)');
  ok(await ate(async () => (await C.locator('.modal').count()) === 1 && /Trazer as suas cenas/.test(await C.locator('.modal-t').innerText())), 'e oferece trazer as cenas que este navegador guarda');
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  await foto(M, 'cenas-1-oferta');
  ok(await C.locator('.pick').count() === 2 && !(await C.locator('.pick input').nth(0).isChecked()) && await C.locator('.pick input').nth(1).isChecked(), 'a lista mostra as duas cenas; a de exemplo vem desmarcada, a Taverna marcada');
  // "Agora não" não perde nada: o painel continua lembrando, e a janela volta quando o mestre pedir
  await C.locator('.modal .btn', { hasText: 'Agora não' }).click(); await w(400);
  ok(await C.locator('.modal').count() === 0 && await C.locator('#localHint').isVisible() && /continuam guardadas neste navegador/.test(await C.locator('#localHint').innerText()), 'recusando por ora, o painel continua lembrando que as cenas estão no navegador');
  await C.locator('#localBring').click(); await w(400);
  ok(await C.locator('.modal').count() === 1 && /Trazer cenas deste navegador/.test(await C.locator('.modal-t').innerText()) && await C.locator('.pick').count() === 2, 'e o botão do lembrete abre a mesma escolha');
  await C.locator('.pick input').nth(0).check();
  await C.locator('.modal .btn.primary').click();
  ok(await ate(async () => (await C.locator('.modal').count()) === 0 && await C.evaluate(() => __tc.Store.S.order.length === 3), 40000), 'as duas cenas escolhidas entram na mesa');
  ok(await C.locator('#localHint').count() === 0, 'com cenas na mesa, o lembrete some');
  // (a cena vazia do começo fica: quem veio pelo lembrete pode já ter mexido nela; aqui o mestre a apaga)
  await C.evaluate(() => { const u = __tc, id = u.Store.S.order.find(x => u.Store.S.scenes[x].name === 'Nova cena'); u.Store.removeScene(id); u.Persist.removeScene(id); u.UI.switchScene(u.Store.S.order[0]); }); await w(400);
  ok(await ate(async () => await semPendencia(M), 30000), 'tudo sobe para o banco');
  const guardados = await docs(M, 'cena');
  ok(guardados.length === 5 && guardados.every(d => d.vis === 'mestre' && d.rev > 0) && guardados.filter(d => /:m$/.test(d.id)).length === 2 && guardados.filter(d => /:v$/.test(d.id)).length === 2 && guardados.some(d => d.id === 'cenas:indice'),
    'cada cena em dois documentos (mapa e parte viva), mais o índice — todos só do mestre: ' + JSON.stringify(guardados.map(d => d.id + ' ' + d.kb + 'KB')));
  const est = await C.evaluate(() => ({ nomes: __tc.Store.S.order.map(id => __tc.Store.S.scenes[id].name), atual: __tc.Store.scene().name, imgs: Object.values(__tc.Store.S.assets).map(a => a.url), save: __tc.Persist.status(), noAr: __tc.Nuvem.noAr(), fundo: __tc.Store.scene().bg.asset }));
  ok(est.nomes.join('|') === 'Cena de exemplo|Taverna do Javali' && est.atual === 'Cena de exemplo' && est.save === 'ok' && est.noAr === null, 'as cenas na ordem em que estavam, a primeira aberta, nenhuma no ar: ' + JSON.stringify(est.nomes));
  const base = await M.evaluate(() => TC_CONFIG.url + '/storage/v1/object/public/mesas/' + TC.mesas.atual.id + '/');
  ok(est.imgs.length === 2 && est.imgs.every(u => u.startsWith(base)) && !!est.fundo, 'as imagens (o mapa da cena de exemplo e o retrato do taverneiro) viraram arquivos na pasta da mesa');
  const naRede = await M.evaluate(async urls => Promise.all(urls.map(async u => { const r = await fetch(u); const b = await r.blob(); return [r.status, b.type, b.size > 300]; })), est.imgs);
  ok(naRede.every(x => x[0] === 200 && /^image\//.test(x[1]) && x[2]), 'e abrem pelo endereço do banco: ' + JSON.stringify(naRede));
  ok(await ate(async () => await C.evaluate(() => { const a = __tc.Store.S.assets[__tc.Store.scene().bg.asset]; return !!__tc.Assets.img(a.id); })), 'o mapa aparece na tela do mestre, vindo do banco');
  ok((await C.locator('#status').innerText()).includes('Salvo na mesa') && (await C.locator('#airBtn').innerText()).includes('Fora do ar'), 'o rodapé diz "Salvo na mesa" e a barra diz que a cena está fora do ar');
  await foto(M, 'cenas-2-trazidas');
  // as cenas do navegador continuam onde estavam
  ok(await C.evaluate(async () => { const rq = indexedDB.open('cenas-de-urgm', 1); const db = await new Promise(r => { rq.onsuccess = () => r(rq.result); }); const ks = await new Promise(r => { const q = db.transaction('kv').objectStore('kv').getAllKeys(); q.onsuccess = () => r(q.result); }); db.close(); return ks.filter(k => String(k).startsWith('scene:')).length === 2; }), 'as cenas do navegador não foram tocadas');

  // ---------- o jogador entra: sem cena no ar, não vê nada do mestre ----------
  const codigo = await codigoDaMesa(M);
  await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  const jogId = await J.evaluate(() => TC.conta.usuario.id);
  let B = null;
  ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && __tc.Nuvem.semCena()); }), 'o jogador abre as Cenas no modo da mesa (jogador), sem cena para ver');
  ok(await ate(async () => (await B.locator('#bannerText').count()) === 1 && /ainda não está mostrando nenhuma cena/.test(await B.locator('#bannerText').innerText())), 'e a faixa explica: o mestre ainda não está mostrando nenhuma cena');
  ok(await B.locator('#viewerSel').count() === 0 && await B.locator('#sceneBtn').count() === 0 && await B.locator('#airBtn').count() === 0 && await B.evaluate(() => __tc.App.viewer === __tc.Nuvem.eu() && !__tc.can('draw') && !__tc.can('ruler')), 'ele é ele mesmo (sem "Vendo como", sem menu de cenas) e, sem cena, não tem o que fazer no mapa');
  // (um segundo cliente, com a sessão do próprio jogador: pergunta direto ao banco, sem passar pelo programa)
  const vistoJ = await J.evaluate(async mesa => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave); const { data } = await a.from('documentos').select('id, vis').eq('mesa_id', mesa); return (data || []).map(d => d.id); }, mesaId);
  ok(vistoJ.every(id => !id.startsWith('cena')), 'o banco não entrega ao jogador nenhum documento das cenas do mestre: ' + JSON.stringify(vistoJ));
  // e não deixa o jogador criar documento nenhum com nome de coisa do mestre (a projeção ainda não existe: seria o primeiro a criá-la)
  const invasao = await J.evaluate(async ([mesa, eu]) => {
    const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave);
    const tenta = async (id, extra) => { const { error } = await a.from('documentos').insert(Object.assign({ mesa_id: mesa, id, dono_id: eu, vis: 'mesa', dados: { invasor: true } }, extra || {})); return error ? (error.code || 'erro') : 'entrou'; };
    const r = {};
    r.projecao = await tenta('cena:pub:m'); r.indice = await tenta('cenas:indice'); r.cena = await tenta('cena:invasora:m'); r.rolador = await tenta('rol:est'); r.mundo = await tenta('mundo:indice'); r.acampamento = await tenta('acampamento');
    r.pedidoDeOutro = await tenta('cena:pedido:00000000-0000-4000-8000-000000000000'); r.semDono = await tenta('cena:pedido:' + eu, { dono_id: null });
    r.proprio = await tenta('cena:pedido:' + eu, { vis: 'mestre', dados: { cena: null, lote: [] } });
    return r;
  }, [mesaId, jogId]);
  ok(['projecao', 'indice', 'cena', 'rolador', 'mundo', 'acampamento', 'pedidoDeOutro', 'semDono'].every(k => invasao[k] === '42501') && invasao.proprio === 'entrou',
    'o banco recusa: a projeção, o índice, uma cena, o estado do Rolador, o Mapa-múndi, o Acampamento, o pedido de outro jogador e um pedido sem dono; o pedido dele mesmo entra: ' + JSON.stringify(invasao));
  await foto(J, 'cenas-3-jogador-sem-cena');

  // ---------- o mestre prepara e põe a cena no ar ----------
  ok(await ate(async () => await C.evaluate(id => __tc.Store.S.players.some(p => p.id === id && p.name === 'Dalmo'), jogId)), 'o jogador que entrou na mesa aparece para o mestre como jogador das cenas');
  const ids = await C.evaluate(id => {
    const u = __tc, sc = u.Store.scene(), por = n => sc.tokens.find(t => t.name === n);
    u.Store.tx('preparar', () => {
      u.Store.upd('tokens', por('Dain X').id, { owner: id });
      u.Store.upd('tokens', por('Capitão').id, { notes: 'fraqueza-secreta-do-capitao', barVis: 'bar' });
      u.Store.upd('tokens', por('Bandido').id, { showName: false, barVis: 'none' });
    });
    return { cena: sc.id, dain: por('Dain X').id, cap: por('Capitão').id, arq: por('Arqueira').id, band: por('Bandido').id, astie: por('Astie').id, porta: sc.walls.find(x => x.k === 'door').id };
  }, jogId);
  // (o mestre está rolando "em segredo": o aviso de cena no ar é para os jogadores e chega do mesmo jeito)
  await M.evaluate(() => TC.aoVivo.definirSegredo(true));
  await C.locator('#airBtn').click(); await w(250);
  await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(300);
  ok((await C.locator('.toast').last().innerText()).includes('Os jogadores agora veem "Cena de exemplo"') && (await C.locator('#airBtn').innerText()).includes('No ar') && await C.locator('#airBtn.on').count() === 1, 'pôr no ar é um pedido do mestre, com aviso e Desfazer; a barra passa a dizer "No ar"');
  ok(await ate(async () => { const d = await docs(M, 'cena:pub:'); return d.length === 2 && d.every(x => x.vis === 'mesa' && x.rev > 0) && await semPendencia(M); }), 'a cena no ar ganha dois documentos que a mesa inteira lê (a projeção)');
  ok(await ate(async () => (await J.locator('#feed .rol', { hasText: 'Cena: Cena de exemplo' }).count()) === 1 && (await J.locator('#feed .rol', { hasText: 'Cena: Cena de exemplo' }).locator('.or').innerText()) === 'Cenas'), 'e a mesa ao vivo avisa os jogadores de que há cena para ver (mesmo com o mestre rolando "em segredo")');
  await M.evaluate(() => TC.aoVivo.definirSegredo(false));
  const pm = await doc(M, 'cena:pub:m'), pv = await doc(M, 'cena:pub:v'), texto = JSON.stringify([pm, pv]);
  ok(typeof pm.ver === 'string' && pm.ver.length >= 6 && pv.mv === pm.ver, 'as duas metades da projeção dizem que são do mesmo momento (versão do mapa ' + pm.ver + ')');
  const doMestre = await doc(M, 'cena:' + ids.cena + ':m');
  ok(Object.values(pm.imgs).length === 1 && Object.values(pm.imgs).every(a => a.name === '' && /^https:/.test(a.url)) && Object.values(doMestre.imgs).every(a => a.name !== '') && pm.lights.every(l => l.name === ''),
    'a projeção leva o endereço da imagem do mapa, mas não o nome do arquivo nem o nome das luzes (que ficam nos documentos do mestre)');
  ok(pv.tokens.length === 6 && !pv.tokens.some(x => x.id === ids.arq) && !texto.includes('Arqueira') && !texto.includes('fraqueza-secreta') && !texto.includes('Só ataca quando') && !texto.includes('"gm":true'),
    'a projeção não leva o token oculto, as anotações do mestre nem os desenhos só dele');
  const pCap = pv.tokens.find(x => x.id === ids.cap), pBand = pv.tokens.find(x => x.id === ids.band), pDain = pv.tokens.find(x => x.id === ids.dain);
  ok(pCap.bars[0].v === 100 && pCap.bars[0].m === 100 && pBand.name === '???' && pBand.bars.every(b => !b.on) && pDain.bars[0].v === 62 && pDain.bars[0].m === 80, 'barras do mestre: só a proporção (ou nada); nome escondido vira "???"; o token do jogador vai inteiro');

  // ---------- o jogador recebe a cena ----------
  ok(await ate(async () => await B.evaluate(id => !__tc.Nuvem.semCena() && __tc.Store.scene().id === id && __tc.Store.scene().tokens.length === 6, ids.cena)), 'a cena aparece sozinha para o jogador');
  const vj = await B.evaluate(ids => {
    const u = __tc, sc = u.Store.scene(), d = sc.tokens.find(x => x.id === ids.dain);
    return { nome: sc.name, oculto: sc.tokens.some(x => x.id === ids.arq), formasGm: sc.shapes.filter(s => s.gm).length, formas: sc.shapes.length, dono: d.owner === u.App.viewer, pode: u.can('moveToken', d), podeCap: u.can('moveToken', sc.tokens.find(x => x.id === ids.cap)),
      fundo: !!sc.bg.asset && /^https:/.test(u.Store.S.assets[sc.bg.asset].url), nev: sc.fog.dynamic, luzes: sc.lights.length, paredes: sc.walls.length, turnos: sc.turn.list.length, gm: u.App.viewer === 'gm', faixa: document.getElementById('banner').hidden };
  }, ids);
  ok(vj.nome === 'Cena de exemplo' && !vj.oculto && vj.formasGm === 0 && vj.formas === 1 && vj.fundo && vj.nev && vj.luzes === 1 && vj.paredes > 5 && !vj.gm, 'com o mapa (imagem do banco), as paredes, a luz e a névoa — sem o que é só do mestre: ' + JSON.stringify(vj));
  ok(vj.dono && vj.pode && !vj.podeCap && vj.faixa, 'ele é dono do Dain X: pode movê-lo, e só ele');
  ok(await ate(async () => await B.evaluate(() => { const a = __tc.Store.S.assets[__tc.Store.scene().bg.asset]; return !!__tc.Assets.img(a.id) && __tc.Render.stats.frames > 0 && !(__tc.Render.stats.fail > 0); })), 'o mapa desenha na tela do jogador');
  ok((await B.locator('#status').innerText()).includes('Ao vivo com a mesa'), 'o rodapé do jogador diz "Ao vivo com a mesa"');
  ok(!(await B.locator('#top').innerText()).includes('null') && !(await C.locator('#top').innerText()).includes('null') && (await B.locator('#top .scene-n').innerText()) === 'Cena de exemplo', 'a barra de cima do jogador mostra só o nome da cena');
  await foto(J, 'cenas-4-jogador-na-cena');

  // ---------- o jogador mexe no que é dele; o mestre recebe ----------
  const posAntes = await B.evaluate(id => { const x = __tc.Store.get('tokens', id); return [x.x, x.y]; }, ids.dain);
  await B.evaluate(id => { const u = __tc, x = u.Store.get('tokens', id); u.Store.tx('Mover', () => u.Store.upd('tokens', id, { x: x.x + 128, y: x.y - 64 })); }, ids.dain);
  ok(await ate(async () => await C.evaluate(([id, p]) => { const x = __tc.Store.get('tokens', id); return x.x === p[0] + 128 && x.y === p[1] - 64; }, [ids.dain, posAntes])), 'o jogador move o token dele e o movimento chega ao mapa do mestre');
  ok(await ate(async () => await B.evaluate(() => __tc.Nuvem.pendentes() === 0 && __tc.Persist.status() === 'ok')), 'o mestre confirma, e a fila do jogador esvazia');
  ok(!(await C.evaluate(() => __tc.Store.canUndo() && false)) && await C.evaluate(() => __tc.Persist.status() === 'ok'), 'no mestre, o movimento do jogador é salvo como qualquer mudança');
  // o que não é dele não vale, mesmo forçando por fora da tela
  await B.evaluate(ids => { const u = __tc; u.Store.tx('forçar', () => { u.Store.upd('tokens', ids.cap, { x: 0, y: 0 }); u.Store.upd('tokens', ids.dain, { name: 'Hackeado', hidden: true }); u.Store.scn({ perms: Object.assign({}, u.Store.scene().perms, { desenhar: true, portas: true }) }); }); }, ids);
  ok(await ate(async () => await B.evaluate(ids => { const u = __tc, c = u.Store.get('tokens', ids.cap), d = u.Store.get('tokens', ids.dain); return u.Nuvem.pendentes() === 0 && !(c.x === 0 && c.y === 0) && d.name === 'Dain X' && !d.hidden && !u.Store.scene().perms.desenhar; }, ids)), 'forçar o que não pode (mover o token do mestre, trocar nome, mudar as permissões) não vale: a tela dele volta ao que o mestre tem');
  ok(await C.evaluate(ids => { const u = __tc, c = u.Store.get('tokens', ids.cap), d = u.Store.get('tokens', ids.dain); return !(c.x === 0 && c.y === 0) && d.name === 'Dain X' && !d.hidden && !u.Store.scene().perms.desenhar; }, ids), 'e no mestre nada disso aconteceu');
  // barras do próprio token
  await B.evaluate(id => { const u = __tc, x = u.Store.get('tokens', id); u.Act.barSet(x, 0, '-12'); }, ids.dain);
  ok(await ate(async () => await C.evaluate(id => __tc.Store.get('tokens', id).bars[0].v === 50, ids.dain)), 'o jogador desconta 12 de Vida no token dele e o mestre vê 50');

  // ---------- o mestre mexe; o jogador vê ----------
  await C.evaluate(ids => { const u = __tc; u.Act.barSet(u.Store.get('tokens', ids.cap), 0, '-35'); u.Act.barSet(u.Store.get('tokens', ids.dain), 0, '+5'); }, ids);
  ok(await ate(async () => await B.evaluate(ids => { const u = __tc, c = u.Store.get('tokens', ids.cap), d = u.Store.get('tokens', ids.dain); return c.bars[0].v === 50 && c.bars[0].m === 100 && d.bars[0].v === 55 && d.bars[0].m === 80; }, ids)), 'dano no Capitão chega ao jogador só como proporção (50%); a cura no token dele, com o número (55/80)');
  // ---------- os dois mexem ao mesmo tempo nas barras do mesmo token: um não apaga o outro ----------
  ok(await ate(async () => await B.evaluate(() => __tc.Nuvem.pendentes() === 0) && await semPendencia(M) && await semPendencia(J)), '(tudo assentado antes de começar)');
  const verAntes = (await doc(M, 'cena:pub:m')).ver;
  // o mestre dá 20 de dano em Vida; o jogador, que ainda vê 55 na tela dele, gasta 10 de SP
  await C.evaluate(id => { const u = __tc; u.Act.barSet(u.Store.get('tokens', id), 0, '-20'); }, ids.dain);
  ok(await B.evaluate(id => { const u = __tc, t = u.Store.get('tokens', id); const antes = t.bars[0].v; u.Act.barSet(t, 1, '-10'); return antes === 55; }, ids.dain), '(o jogador mexe no SP ainda vendo a Vida em 55: o dano do mestre não tinha chegado)');
  ok(await ate(async () => await C.evaluate(id => { const b = __tc.Store.get('tokens', id).bars; return b[0].v === 35 && b[1].v === 14; }, ids.dain)), 'no mestre: a Vida fica em 35 (o dano dele não foi desfeito pelo pedido do jogador) e o SP vai a 14');
  ok(await ate(async () => await B.evaluate(id => { const u = __tc, b = u.Store.get('tokens', id).bars; return u.Nuvem.pendentes() === 0 && b[0].v === 35 && b[1].v === 14; }, ids.dain)), 'e o jogador termina vendo o mesmo: Vida 35, SP 14');
  // na mesma barra, ao mesmo tempo: as duas variações valem (−5 do mestre, −3 do jogador)
  await C.evaluate(id => { const u = __tc; u.Act.barSet(u.Store.get('tokens', id), 0, '-5'); }, ids.dain);
  await B.evaluate(id => { const u = __tc; u.Act.barSet(u.Store.get('tokens', id), 0, '-3'); }, ids.dain);
  ok(await ate(async () => await C.evaluate(id => __tc.Store.get('tokens', id).bars[0].v === 27, ids.dain) && await B.evaluate(id => __tc.Nuvem.pendentes() === 0 && __tc.Store.get('tokens', id).bars[0].v === 27, ids.dain)), 'na mesma barra, valem as duas variações: 35 − 5 − 3 = 27, nos dois');
  // desfazer do jogador: volta só o que ele fez
  await B.evaluate(() => __tc.Store.undo());
  ok(await ate(async () => await C.evaluate(id => __tc.Store.get('tokens', id).bars[0].v === 30, ids.dain) && await B.evaluate(id => __tc.Nuvem.pendentes() === 0 && __tc.Store.get('tokens', id).bars[0].v === 30, ids.dain)), 'o jogador desfaz o −3 dele: volta para 30 (o −5 do mestre continua)');
  // (de volta aos valores que o resto do teste espera)
  await C.evaluate(id => { const u = __tc; u.Act.barSet(u.Store.get('tokens', id), 0, '55'); u.Act.barSet(u.Store.get('tokens', id), 1, '24'); }, ids.dain);
  ok(await ate(async () => await B.evaluate(id => { const b = __tc.Store.get('tokens', id).bars; return b[0].v === 55 && b[1].v === 24; }, ids.dain) && await semPendencia(M)), '(barras de volta a 55 e 24)');
  // só os tokens mudaram: o mapa da projeção não foi regravado; mudando o mapa, a versão anda e a parte viva acompanha
  ok((await doc(M, 'cena:pub:m')).ver === verAntes && (await doc(M, 'cena:pub:v')).mv === verAntes, 'mexer só nos tokens não regrava o mapa da projeção (a versão dele continua ' + verAntes + ')');
  await C.evaluate(() => { const u = __tc; u.Store.tx('Hora do dia', () => u.Store.scn({ tone: 'entardecer' })); });
  ok(await ate(async () => { const a = await doc(M, 'cena:pub:m'), b = await doc(M, 'cena:pub:v'); return a.ver !== verAntes && b.mv === a.ver && a.tone === 'entardecer' && await semPendencia(M); }), 'mudando o mapa (a hora do dia), a versão muda e a parte viva diz que é desse mapa');
  ok(await ate(async () => await B.evaluate(() => __tc.Store.scene().tone === 'entardecer' && __tc.Store.scene().tokens.length === 6)), 'e o jogador recebe o par certo');

  await C.evaluate(ids => { const u = __tc; u.Store.tx('revelar', () => u.Store.upd('tokens', ids.arq, { hidden: false })); }, ids);
  ok(await ate(async () => await B.evaluate(id => __tc.Store.scene().tokens.some(x => x.id === id && x.name === 'Arqueira'), ids.arq)), 'o mestre revela a Arqueira e ela aparece para o jogador');
  await C.evaluate(ids => { const u = __tc; u.Store.tx('esconder', () => u.Store.upd('tokens', ids.arq, { hidden: true })); }, ids);
  ok(await ate(async () => await B.evaluate(id => !__tc.Store.scene().tokens.some(x => x.id === id), ids.arq)), 'esconde de novo e ela some');
  // portas: só com a permissão
  await B.evaluate(id => { const u = __tc; u.Store.tx('abrir', () => u.Store.upd('walls', id, { open: true })); }, ids.porta);
  ok(await ate(async () => await B.evaluate(id => __tc.Nuvem.pendentes() === 0 && !__tc.Store.get('walls', id).open, ids.porta)) && await C.evaluate(id => !__tc.Store.get('walls', id).open, ids.porta), 'sem a permissão de portas, a porta que o jogador tentou abrir continua fechada');
  await C.evaluate(() => { const u = __tc; u.Store.tx('Permissões', () => u.Store.scn({ perms: Object.assign({}, u.Store.scene().perms, { portas: true, desenhar: true }) })); });
  ok(await ate(async () => await B.evaluate(() => __tc.can('doors') && __tc.can('draw'))), 'o mestre libera portas e desenho, e o jogador passa a poder');
  await B.evaluate(id => { const u = __tc; u.Act.toggleDoor(u.Store.get('walls', id)); u.Store.tx('Desenhar', () => u.Store.add('shapes', { id: 'sh_do_jogador', k: 'rect', x: 64, y: 64, w: 128, h: 64, s: '#4fb8e0', sw: 4, f: null, a: 1, top: false, gm: false, lock: false, by: u.App.viewer })); }, ids.porta);
  ok(await ate(async () => await C.evaluate(([id, jog]) => { const u = __tc, s = u.Store.get('shapes', 'sh_do_jogador'); return u.Store.get('walls', id).open && !!s && s.by === jog && !s.gm; }, [ids.porta, jogId])), 'agora a porta abre e o desenho dele aparece no mapa do mestre, assinado por ele');

  // ---------- ping: quem está na cena vê ----------
  await C.evaluate(() => { __tc.App.pings.length = 0; }); await B.evaluate(() => { __tc.App.pings.length = 0; });
  await C.evaluate(() => __tc.Act.ping(300, 300));
  ok(await ate(async () => await B.evaluate(() => __tc.App.pings.some(p => p.x === 300 && p.y === 300 && p.n === 'Mestre'))), 'o ping do mestre aparece no mapa do jogador');
  const t0 = await B.evaluate(() => { __tc.Act.ping(512, 256); return __tc.App.pings.find(p => p.x === 512).t0; });
  ok(await ate(async () => await C.evaluate(() => __tc.App.pings.some(p => p.x === 512 && p.y === 256 && p.n === 'Dalmo'))), 'e o do jogador, no do mestre, com o nome dele');
  // (o ping some sozinho em três segundos; o que não pode é ele reaparecer para quem pingou quando a projeção volta)
  ok(await ate(async () => await J.evaluate(jog => { const d = TC.dados.col('documentos').pegar('cena:pub:v'); return !!d && (d.dados.pings || []).some(p => p.by === jog && p.x === 512); }, jogId)), 'o ping do jogador volta na projeção, para os outros jogadores verem');
  await w(600, J);
  ok(await B.evaluate(t0 => __tc.App.pings.every(p => p.x !== 512 || p.t0 === t0), t0), 'mas não reaparece em dobro para quem pingou');

  // ---------- ligar o token a uma ficha que é de um jogador: o jogador vira dono do token ----------
  await M.evaluate(([jog, pc]) => { TC.dados.col('personagens').gravar('pc_lia', { nome: 'Lia', dono_id: jog, vis: 'mesa', ordem: 1, ficha: pc, skills: {}, estado: {} }); }, [jogId, pcLia]);
  ok(await ate(async () => await C.evaluate(() => __tc.Fichas.on() && __tc.Fichas.chars().some(x => x.id === 'pc_lia'))), 'a ficha de um jogador aparece na lista das Cenas');
  const lig = await C.evaluate(id => { const u = __tc, r = u.Fichas.link(u.Store.get('tokens', id), 'pc_lia'), tk = u.Store.get('tokens', id); return { dono: r.dono, owner: tk.owner, char: tk.char, hp: tk.bars.some(b => b.n === 'HP' && b.ref) }; }, ids.astie);
  ok(lig.dono === 'Dalmo' && lig.owner === jogId && lig.char === 'pc_lia' && lig.hp, 'ligado à ficha da Lia, o token passa a ser do dono dela e pega as barras da ficha: ' + JSON.stringify(lig));
  ok(await ate(async () => await B.evaluate(id => { const u = __tc, tk = u.Store.get('tokens', id); return !!tk && tk.owner === u.App.viewer && u.can('moveToken', tk) && tk.bars.some(b => b.n === 'HP' && b.m > 0); }, ids.astie)), 'e o jogador passa a poder mover esse token também');

  // ---------- o que o jogador já explorou fica no aparelho dele ----------
  ok(await ate(async () => await B.evaluate(async cena => {
    const rq = indexedDB.open('tinycats-cenas-mesa', 1); const db = await new Promise(r => { rq.onsuccess = () => r(rq.result); });
    const ks = await new Promise(r => { const q = db.transaction('kv').objectStore('kv').getAllKeys(); q.onsuccess = () => r(q.result); }); db.close();
    return ks.some(k => String(k).endsWith(':' + cena)) && Object.keys(__tc.Store.scene().explored).length > 0;
  }, ids.cena), 15000), 'as áreas exploradas pelo jogador ficam guardadas no navegador dele');
  ok(!JSON.stringify(await doc(M, 'cena:pub:m')).includes('data:image') && !JSON.stringify(await doc(M, 'cena:' + ids.cena + ':m')).includes('data:image'), 'e não vão para o banco');

  // ---------- o mestre vai para outra cena; a que está no ar continua viva ----------
  await C.evaluate(() => __tc.UI.switchScene(__tc.Store.S.order[1])); await w(500);
  ok((await C.locator('#airBtn').innerText()).includes('No ar: Cena de exemplo') && await C.locator('#airBtn.other').count() === 1 && await C.evaluate(() => __tc.Store.scene().name === 'Taverna do Javali'), 'o mestre abre a Taverna para preparar; a barra avisa que os jogadores continuam na Cena de exemplo');
  await w(1500);
  ok(await B.evaluate(id => __tc.Store.scene().id === id, ids.cena), 'o jogador continua na cena que está no ar');
  const p2 = await B.evaluate(id => { const u = __tc, x = u.Store.get('tokens', id); u.Store.tx('Mover', () => u.Store.upd('tokens', id, { x: x.x + 64 })); return x.x; }, ids.dain);
  ok(await ate(async () => await C.evaluate(([cena, id, x]) => __tc.Store.S.scenes[cena].tokens.find(t => t.id === id).x === x, [ids.cena, ids.dain, p2])), 'e o que ele faz nela vale mesmo com o mestre em outra cena');
  ok(await ate(async () => await B.evaluate(() => __tc.Nuvem.pendentes() === 0)), '… e é confirmado');
  // a ficha do jogador muda (ele anota o HP na aba Fichas): o token dele na cena que está no ar acompanha, mesmo com o mestre em outra cena
  await J.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_lia'); P.gravar('pc_lia', { estado: Object.assign({}, l.estado || {}, { rec: { hp_lia: 7 } }) }); });
  ok(await ate(async () => await B.evaluate(id => { const b = __tc.Store.get('tokens', id).bars.find(x => x.n === 'HP'); return !!b && b.v === 7; }, ids.astie)), 'o HP anotado na ficha chega à barra do token na cena dos jogadores');
  await foto(M, 'cenas-5-mestre-outra-cena');

  // ---------- tirar do ar, desfazer ----------
  await C.locator('#airBtn').click(); await w(250);
  await C.locator('.menu-i', { hasText: 'Tirar a cena do ar' }).click(); await w(300);
  ok(await ate(async () => await B.evaluate(() => __tc.Nuvem.semCena())), 'o mestre tira a cena do ar e o jogador volta a não ver cena nenhuma');
  ok(await ate(async () => (await docs(M, 'cena:pub:')).length === 0 && await semPendencia(M)), 'os documentos da projeção saem do banco');
  await C.locator('.toast-a', { hasText: 'Desfazer' }).last().click(); await w(300);
  ok(await ate(async () => await B.evaluate(id => !__tc.Nuvem.semCena() && __tc.Store.scene().id === id, ids.cena)), 'Desfazer põe a cena de volta no ar');

  // ---------- fechar a página logo depois de mexer: a última mudança não fica para trás ----------
  ok(await ate(async () => await semPendencia(M) && await C.evaluate(() => __tc.Persist.status() === 'ok')), '(tudo salvo antes)');
  const tav = await C.evaluate(() => { const u = __tc, t = u.Store.scene().tokens.find(x => x.name === 'Taverneiro'); u.Store.tx('Mover', () => u.Store.upd('tokens', t.id, { x: 448, y: 320 })); return { cena: u.Store.scene().id, id: t.id, salvo: u.Persist.status() }; });
  ok(tav.salvo === 'saving' && await M.evaluate(() => TC.dados.pendentes === 0), '(o mestre move um token: a mudança ainda está no programa das Cenas, nem chegou à casca)');
  const saidasAntes = t.saidas.length;

  // ---------- recarregar: tudo continua lá ----------
  await M.reload({ waitUntil: 'load' });
  ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && __tc.Store.S.order.length === 2); }, 40000), 'o mestre recarrega a página e as cenas voltam do banco');
  const dep = await C.evaluate(ids => { const u = __tc, sc = u.Store.S.scenes[ids.cena], d = sc.tokens.find(t => t.id === ids.dain); return { atual: u.Store.scene().name, noAr: u.Nuvem.noAr(), vida: d.bars[0].v, dono: d.owner, porta: sc.walls.find(x => x.id === ids.porta).open, forma: sc.shapes.some(s => s.id === 'sh_do_jogador'), oculta: sc.tokens.find(t => t.id === ids.arq).hidden, notas: sc.tokens.find(t => t.id === ids.cap).notes, toks: sc.tokens.length }; }, ids);
  ok(dep.atual === 'Taverna do Javali' && dep.noAr === ids.cena && dep.vida === 55 && dep.dono === jogId && dep.porta && dep.forma && dep.oculta && dep.notas === 'fraqueza-secreta-do-capitao' && dep.toks === 7, 'como estavam: a cena aberta, a que está no ar, barras, dono, porta, o desenho do jogador, o token oculto e as anotações: ' + JSON.stringify(dep));
  ok(await ate(async () => await C.evaluate(tav => { const x = __tc.Store.S.scenes[tav.cena].tokens.find(k => k.id === tav.id); return x.x === 448 && x.y === 320; }, tav)), 'e o token movido um instante antes de recarregar está onde foi posto: a mudança subiu na saída');
  ok(t.saidas.length === saidasAntes, 'sem o navegador perguntar "sair da página?" (a mudança era pequena: sai garantida)');
  await J.reload({ waitUntil: 'load' });
  ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && __tc.Store.scene().id === id && __tc.Store.scene().tokens.length === 6, ids.cena); }, 40000), 'o jogador recarrega e cai de novo na cena que está no ar');
  ok(await B.evaluate(() => Object.keys(__tc.Store.scene().explored).length > 0), 'com o que ele já tinha explorado');

  // ---------- exportar numa mesa: o arquivo leva as imagens embutidas ----------
  await C.evaluate(id => __tc.UI.switchScene(id), ids.cena); await w(500);
  const [dl] = await Promise.all([M.waitForEvent('download', { timeout: 30000 }), (async () => { await C.locator('#moreBtn').click(); await w(200); await C.locator('.menu-i', { hasText: 'Exportar esta cena' }).click(); })()]);
  const arq = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  ok(arq.format === 'tinycats-cena' && arq.scene.tokens.length === 7 && Object.values(arq.assets).length >= 1 && Object.values(arq.assets).every(a => /^data:image\//.test(a.url)), 'exportar a cena da mesa gera um arquivo com as imagens embutidas (abre em qualquer lugar)');

  // ---------- importar um arquivo numa mesa: as imagens dele sobem para o banco ----------
  const antesImp = await C.evaluate(() => __tc.Store.S.order.length);
  await C.locator('#fileJson').setInputFiles({ name: 'cena.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(arq)) });
  ok(await ate(async () => await C.evaluate(n => __tc.Store.S.order.length === n + 1, antesImp), 40000), 'o mestre importa o arquivo na mesa e a cena entra');
  const imp = await C.evaluate(([cena, dain]) => { const u = __tc, sc = u.Store.scene(), d = sc.tokens.find(t => t.name === 'Dain X'); return { nome: sc.name, outra: sc.id !== cena, fundo: (u.Store.S.assets[sc.bg.asset] || {}).url || '', dono: d.owner, toks: sc.tokens.length, mesmoToken: d.id === dain }; }, [ids.cena, ids.dain]);
  ok(imp.nome === 'Cena de exemplo' && imp.outra && imp.fundo.startsWith(base) && imp.dono === jogId && imp.toks === 7, 'como uma cena nova da mesa: com o mapa no banco e o dono do token mantido (é participante desta mesa): ' + JSON.stringify(imp));
  ok(await ate(async () => (await docs(M, 'cena:' + (await C.evaluate(() => __tc.Store.scene().id)) + ':')).length === 2 && await semPendencia(M)), 'e guardada no banco como as outras');
  ok(await C.evaluate(id => __tc.Nuvem.noAr() === id, ids.cena) && await B.evaluate(id => __tc.Store.scene().id === id, ids.cena), 'importar não mexe no que os jogadores estão vendo');

  // ---------- esquecer o que foi explorado vale para os jogadores também ----------
  await C.evaluate(id => { const u = __tc; u.UI.switchScene(id); }, ids.cena); await w(400);
  await C.evaluate(() => { const u = __tc, sc = u.Store.scene(); u.Vision.resetExplored(sc); u.Nuvem.esquecerExplorado(sc); });
  ok(await ate(async () => await B.evaluate(() => (__tc.Store.scene().expSeq || 0) === 1)), 'o mestre manda esquecer as áreas exploradas e o aviso chega ao jogador');
  ok(await ate(async () => await B.evaluate(async cena => {
    const rq = indexedDB.open('tinycats-cenas-mesa', 1); const db = await new Promise(r => { rq.onsuccess = () => r(rq.result); });
    const todos = await new Promise(r => { const q = db.transaction('kv').objectStore('kv').openCursor(), o = []; q.onsuccess = () => { const c = q.result; if (c) { o.push([c.key, c.value]); c.continue(); } else r(o); }; }); db.close();
    const e = todos.find(x => String(x[0]).endsWith(':' + cena));
    return !!e && e[1].seq === 1;
  }, ids.cena), 15000), 'o navegador do jogador recomeça a memória do que foi explorado');

  // ---------- nova imagem direto na mesa ----------
  await C.evaluate(() => __tc.UI.switchScene(__tc.Store.S.order[1])); await w(400);
  const png = require('zlib');
  void png;
  await C.evaluate(async () => {
    const u = __tc, cv = document.createElement('canvas'); cv.width = 320; cv.height = 200; const g = cv.getContext('2d'); g.fillStyle = '#35507a'; g.fillRect(0, 0, 320, 200); g.fillStyle = '#e8c15a'; g.fillRect(40, 40, 120, 80);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const a = await u.Assets.fromFile(new File([blob], 'salão.png', { type: 'image/png' }), 'bg');
    u.Store.tx('Imagem de fundo', () => u.Store.scn({ bg: { asset: a.id, stretch: false, dx: 0, dy: 0, scale: 1 } }));
  });
  ok(await ate(async () => { const d = await doc(M, 'cena:' + (await C.evaluate(() => __tc.Store.scene().id)) + ':m'); return d && d.bg.asset && d.imgs[d.bg.asset] && d.imgs[d.bg.asset].url.startsWith(base) && d.imgs[d.bg.asset].name === 'salão' && await semPendencia(M); }), 'uma imagem nova escolhida pelo mestre vai para o Storage e a cena guarda o endereço dela');

  // ---------- um pedido malfeito não para a mesa ----------
  await C.evaluate(id => __tc.UI.switchScene(id), ids.cena); await w(400);
  ok(await ate(async () => await B.evaluate(() => __tc.Nuvem.pendentes() === 0) && await semPendencia(M) && await semPendencia(J)), '(tudo assentado)');
  const contaAntes = ((await doc(M, 'cena:pub:v')).ack || {})[jogId] || 0;
  await J.evaluate(([eu, cena, dain, n]) => {
    // (escrito direto no documento de pedidos do jogador, por fora do programa das Cenas)
    const ruim = JSON.parse('{"toString":1,"valueOf":1}');
    TC.dados.col('documentos').gravar('cena:pedido:' + eu, { dono_id: eu, vis: 'mestre', dados: { cena, lote: [{ n, ops: [
      { t: 'upd', c: 'tokens', id: dain, p: { bars: [{ n: 'Vida', v: ruim, x: ruim }], auras: [{ id: ruim, r: ruim }] }, b: { bars: [{ n: 'Vida', v: ruim }] } },
      { t: 'add', c: 'shapes', v: { id: 'sx_ruim', k: 'text', txt: ruim, x: ruim } }, ruim, null, 7,
      { t: 'upd', c: 'tokens', id: dain, p: { y: 704 } }] }, ruim, { n: ruim, ops: [] }] } });
  }, [jogId, ids.cena, ids.dain, contaAntes + 1]);
  ok(await ate(async () => await C.evaluate(id => __tc.Store.get('tokens', id).y === 704, ids.dain)), 'um pedido feito para dar erro em quem o lê é pulado, e o pedido de verdade que veio no mesmo lote vale');
  ok(await ate(async () => ((await doc(M, 'cena:pub:v')).ack || {})[jogId] === contaAntes + 1 && await C.evaluate(() => !__tc.Store.get('shapes', 'sx_ruim'))), 'a conta do jogador anda, e nada do que era malfeito entrou na cena');

  // ---------- o mestre com o site aberto em dois aparelhos: só um transmite a cena que está no ar ----------
  const M2 = (await t.device({ name: 'mestre-2', seed: { 'tinycats:aba': 'cenas', 'tinycats-tour': '1' } })).page;
  await M2.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, M2);
  await loginTela(M2, c.mestre, c.senha);
  await M2.locator('#m-lista button', { hasText: nomeMesa }).click();
  await M2.locator('#vivo').waitFor({ state: 'visible', timeout: 20000 });
  let C2 = null;
  ok(await ate(async () => { C2 = await quadro(M2, /\/cenas\//); return C2 && await C2.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && !!__tc.Store.S.scenes[id] && __tc.Nuvem.transmito(), ids.cena); }, 40000), 'o mestre abre a mesa num segundo aparelho: as cenas chegam, e é esse aparelho que passa a transmitir');
  ok(await ate(async () => await C.evaluate(id => !__tc.Nuvem.transmito() && __tc.Nuvem.noAr() === id, ids.cena)), 'o primeiro passa a acompanhar (a cena continua no ar)');
  const vidaEm = (F, id) => F.evaluate(([cena, id]) => __tc.Store.S.scenes[cena].tokens.find(k => k.id === id).bars[0].v, [ids.cena, id]);
  const vida0 = await vidaEm(C2, ids.dain);
  await B.evaluate(id => { const u = __tc; u.Act.barSet(u.Store.get('tokens', id), 0, '-4'); }, ids.dain);
  ok(await ate(async () => await vidaEm(C2, ids.dain) === vida0 - 4 && await vidaEm(C, ids.dain) === vida0 - 4 && await B.evaluate(([id, v]) => __tc.Nuvem.pendentes() === 0 && __tc.Store.get('tokens', id).bars[0].v === v, [ids.dain, vida0 - 4])), 'o jogador tira 4 de Vida: fica −4 nos dois aparelhos do mestre e na tela dele');
  await w(5000);
  ok(await vidaEm(C2, ids.dain) === vida0 - 4 && await vidaEm(C, ids.dain) === vida0 - 4 && await B.evaluate(([id, v]) => __tc.Store.get('tokens', id).bars[0].v === v, [ids.dain, vida0 - 4]), 'e continua assim depois de tudo assentar (o pedido não é aplicado duas vezes)');
  // o mestre mexe no primeiro aparelho: ele volta a transmitir
  const capX = await C.evaluate(id => { const u = __tc, k = u.Store.get('tokens', id); u.Store.tx('Mover', () => u.Store.upd('tokens', id, { x: k.x + 64 })); return u.Store.get('tokens', id).x; }, ids.cap);
  ok(await ate(async () => await C.evaluate(() => __tc.Nuvem.transmito()) && await C2.evaluate(() => !__tc.Nuvem.transmito())), 'o mestre mexe na cena no primeiro aparelho: ele assume a transmissão, e o segundo passa a acompanhar');
  ok(await ate(async () => await B.evaluate(([id, x]) => __tc.Store.get('tokens', id).x === x, [ids.cap, capX]) && await C2.evaluate(([cena, id, x]) => __tc.Store.S.scenes[cena].tokens.find(k => k.id === id).x === x, [ids.cena, ids.cap, capX])), 'o jogador vê a mudança, e o segundo aparelho também');
  ok(await ate(async () => { const a = await doc(M, 'cena:pub:m'), b = await doc(M, 'cena:pub:v'); return !!a && !!b && a.ver === b.mv && await semPendencia(M) && await semPendencia(M2); }), 'a projeção continua com as duas metades combinando');
  // o segundo aparelho assume de novo e é fechado: o primeiro assume sozinho quando um pedido do jogador fica sem resposta
  await C2.evaluate(([cena, id]) => { const u = __tc; u.UI.switchScene(cena); const k = u.Store.get('tokens', id); u.Store.tx('Mover', () => u.Store.upd('tokens', id, { x: k.x - 64 })); }, [ids.cena, ids.cap]);
  ok(await ate(async () => await C2.evaluate(() => __tc.Nuvem.transmito()) && await C.evaluate(() => !__tc.Nuvem.transmito()) && await semPendencia(M2) && await B.evaluate(([id, x]) => __tc.Store.get('tokens', id).x === x, [ids.cap, capX - 64])), 'o mestre mexe no segundo aparelho: a transmissão vai para ele');
  await M2.close();
  const dainX = await B.evaluate(id => { const u = __tc, k = u.Store.get('tokens', id); u.Store.tx('Mover', () => u.Store.upd('tokens', id, { x: k.x - 64 })); return u.Store.get('tokens', id).x; }, ids.dain);
  ok(await ate(async () => await C.evaluate(([id, x]) => __tc.Nuvem.transmito() && __tc.Store.get('tokens', id).x === x, [ids.dain, dainX]) && await B.evaluate(() => __tc.Nuvem.pendentes() === 0), 60000), 'o aparelho que transmitia foi fechado: o outro assume sozinho e aplica o pedido do jogador');

  // ---------- o mestre apaga a mesa ----------
  // (antes, o que o jogador acabou de fazer termina de subir: com a mesa apagada, o banco recusaria)
  await ate(async () => await semPendencia(J) && await semPendencia(M) && await B.evaluate(() => __tc.Nuvem.pendentes() === 0));
  await w(800, J);
  await ate(async () => await semPendencia(J));
  await apagarMesaTela(M, nomeMesa);
  ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'local' && __tc.Store.S.order.length === 2 && __tc.Store.S.order.map(id => __tc.Store.S.scenes[id].name).join('|') === 'Cena de exemplo|Taverna do Javali'); }, 30000), 'fora da mesa, as cenas do navegador estão como eram');
  // (esperados: a conta de teste que já existe, a recriação de um documento apagado, e o segundo cliente que o próprio teste abre)
  // (e as oito tentativas de invasão do jogador, que o banco recusou com 403)
  const recusas = t.errs.filter(e => /^\[jogador\].*status of 403/.test(e)).length;
  const fora = t.errs.filter(e => !/status of (400|401|409)|Multiple GoTrueClient instances/.test(e) && !/^\[jogador\].*status of 403/.test(e));
  if (fora.length || recusas !== 8) console.log('CONSOLE:\n' + t.errs.join('\n') + '\nRESPOSTAS DE ERRO:\n' + t.ruins.join('\n'));
  ok(fora.length === 0 && recusas === 8, 'sem erros inesperados no console (as 8 recusas do banco ao jogador são as do teste): ' + recusas);
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
