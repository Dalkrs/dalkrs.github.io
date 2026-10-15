// Árvore de Habilidades, lote 6, numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre (Bruno), o
// Dalmo (dono da Selene) e a Lia (dona da Brisa) em aparelhos separados:
//   · o caminho trancado: o mestre tranca o "Membro de Selene" na Árvore; o pacote dos jogadores vai sem ele e sem a
//     Garra, que vem depois dele; a Árvore do Dalmo não os mostra;
//   · "Aberto para" a Selene: a cópia do ramo vai nas skills dela; a Árvore do Dalmo mostra o caminho; o aviso só para
//     ele chega à mesa ao vivo ("Só você e o mestre veem") — com a mesa ao vivo fechada, um aviso na tela leva até ela;
//     abrir e desfazer em seguida não avisa ninguém;
//   · o Dalmo aprende os nódulos do caminho (a cópia continua nas skills: quem a escreve é só o mestre); o bônus do
//     Membro entra na ficha;
//   · as contas entre chaves ({FOR*2 + 10}) e o custo de uso (15 SP · CAN/2 de Energia) com os números da ficha da
//     Selene, na Árvore do Dalmo e em "Passivas e Habilidades" (na ficha do mestre e na do Dalmo);
//   · o mestre muda a Garra: a cópia acompanha; fechar o caminho: some para o Dalmo, os nódulos ficam guardados e o
//     bônus deixa de contar (também na ficha do mestre, que tem a biblioteca inteira); abrir de novo: volta tudo;
//   · o banco (SQL 0015): a linha "para" alguém só quem mestra escreve, sempre em segredo; quem a lê é quem a escreveu
//     e quem a recebe — mesmo com a mesa ao vivo fechada para ele; ninguém muda para quem ela vai. A Lia, no site,
//     vê a dela e não a do Dalmo.
// SO=banco roda só a parte do banco, numa mesa criada direto pelo banco (é o que os mutantes do SQL usam).
// (Sem mesa — o editor, a cópia do ramo, as trancas umas dentro das outras — é o src/tests/arvore-lote6.test.js.)
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const R = require('../../tc/rules.js');
const { ok, end } = checker();
const no = (id, nome, pais, extra) => Object.assign({ id, pais, regra: 'e', nome, tipo: 'pequeno', forma: 'circulo', glifo: '', cor: '', natureza: '', usos: [], desc: '', exclusivo: '', escola: null, graus: [{ custos: { p1: 1 }, texto: '' }] }, extra);
const BIB = { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 20 }, { id: 'p2', nome: 'Lua', cor: '#9BB7C9', padrao: 5 }], naturezas: [], usos: [{ id: 'ativa', nome: 'Ativa', sigla: 'At' }],
  tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
  arvores: [{ id: 'a_kit', nome: 'Kitsune Lunar', categoria: 'classe', secreta: false, senha: '', nodes: [
    no('n_origem', 'Origem', [], { tipo: 'keystone', forma: 'hexagono', graus: [{ custos: {}, texto: '' }] }),
    no('n_corpo', 'Corpo da Raposa', ['n_origem']),
    no('n_membro', 'Membro de Selene', ['n_origem'], { tipo: 'notavel', usos: ['ativa'], desc: 'O corpo lembra a lua.', graus: [{ custos: { p1: 2 }, texto: '', bonus: { FOR: 2 } }] }),
    no('n_garra', 'Garra de Gelo', ['n_membro'], { usos: ['ativa'], desc: 'Causa {FOR*2 + 10} de dano.',
      graus: [{ custos: { p2: 1 }, texto: '', uso: [{ b: 'SP', v: '10' }] }, { custos: { p2: 2 }, texto: '+{floor(CAN/2)} de gelo', uso: [{ b: 'SP', v: '15' }, { b: 'Energia', v: 'CAN/2' }] }] }),
  ] }], cofres: [] };
const arvLocal = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4, biblioteca: BIB, personagens: [{ id: 'c_local', nome: 'Rascunho local', arvores: ['a_kit'], arvoreAtual: 'a_kit', pontos: { p1: 20, p2: 5 }, alocados: {}, ordemLivre: true }] });
const ficha = nome => ({ nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'C', AGI: 'C', VIT: 'D', CAN: 'B' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', itens: [],
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '60' }, { id: 'en', nome: 'Energia', fml: 'CAN*2' }, { id: 'fe', nome: 'Fé', fml: '10' }] });
// os números da Selene como as regras de sempre os calculam: sem a árvore (FOR0) e com o +2 do Membro (FOR1)
const VARS = R.calcular(Object.assign({}, ficha('Selene'), { id: 'pc_selene' }), R.cfgPadrao(), {}).vars;
const FOR0 = VARS.FOR, FOR1 = FOR0 + 2, MEIO = Math.floor(VARS.CAN / 2);

// O banco (SQL 0015): quem escreve e quem lê a linha "para" alguém. avId: o aviso que o mestre mandou para o Dalmo.
async function sondarBanco(t, c, mesa, dalmo, lia, avId) {
  const sonda = async (email, nome) => { const d = await t.device({ name: 'sonda-' + nome }); await d.page.goto(t.base + 'src/tests/vazio.html'); const r = await entrar(d.page, email, c.senha, nome); return { d, p: d.page, uid: r.uid }; };
  const sB = await sonda(c.mestre, 'Bruno'), sD = await sonda(c.jog1, 'Dalmo'), sL = await sonda(c.jog2, 'Lia');
  const ler = s => s.p.evaluate(async mesa => { const r = await sb.from('registro').select('id, para, secreta').eq('mesa_id', mesa); return r.error ? [] : r.data; }, mesa);
  const inserir = (s, linha) => s.p.evaluate(async ([mesa, linha]) => { const r = await sb.from('registro').insert(Object.assign({ mesa_id: mesa, tipo: 'rolagem', dados: { k: 'tabela', titulo: 'teste', total: null } }, linha)); return r.error ? 'recusado' : 'ok'; }, [mesa, linha]);
  const mudar = (s, id, campos) => s.p.evaluate(async ([mesa, id, campos]) => { const r = await sb.from('registro').update(campos).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'recusado' : (r.data || []).length ? 'ok' : 'nada'; }, [mesa, id, campos]);
  const rpc = (s, f, a) => s.p.evaluate(async ([f, a]) => { const r = await sb.rpc(f, a); return r.error ? r.error.message : 'ok'; }, [f, a]);
  try {
    {
      const vD = await ler(sD), vL = await ler(sL);
      ok(vD.some(l => l.id === avId && l.para === dalmo && l.secreta === true) && !vL.some(l => l.para), 'no banco: o Dalmo lê o aviso para ele; a Lia não lê nenhuma linha "para" alguém');
    }
    ok(await inserir(sL, { id: 'pl_1', secreta: true, para: dalmo }) === 'recusado' && await inserir(sD, { id: 'pl_2', secreta: false, para: lia }) === 'recusado', 'quem joga não escreve uma linha "para" alguém (nem em segredo, nem às claras)');
    ok(await inserir(sB, { id: 'pm_1', secreta: false, para: lia }) === 'recusado', 'nem o mestre às claras: a linha "para" alguém vai sempre em segredo');
    ok(await inserir(sB, { id: 'pm_2', secreta: true, para: lia }) === 'ok', 'o mestre manda uma para a Lia');
    ok((await ler(sL)).some(l => l.id === 'pm_2') && !(await ler(sD)).some(l => l.id === 'pm_2'), 'a Lia a lê; o Dalmo, não');
    ok(await inserir(sB, { id: 'pm_3', secreta: true }) === 'ok' && !(await ler(sL)).some(l => l.id === 'pm_3') && !(await ler(sD)).some(l => l.id === 'pm_3'), '(a linha em segredo sem "para" continua só do mestre)');
    ok(await mudar(sL, 'pm_2', { dados: { k: 'tabela', titulo: 'mexi' } }) !== 'ok' && await mudar(sB, 'pm_2', { para: dalmo }) === 'recusado', 'quem recebe não mexe na linha, e ninguém muda para quem ela vai (nem o mestre)');
    ok(await inserir(sB, { id: 'pub_1', secreta: false }) === 'ok' && await rpc(sB, 'vivo_do_jogador', { p_mesa: mesa, p_usuario: dalmo, p_fechado: true }) === 'ok', '(o mestre escreve uma linha para todos e fecha a mesa ao vivo para o Dalmo)');
    {
      const vD = await ler(sD), vL = await ler(sL);
      ok(vD.some(l => l.id === avId) && !vD.some(l => l.id === 'pub_1') && vL.some(l => l.id === 'pub_1'), 'com a mesa ao vivo fechada para ele, o Dalmo continua lendo o aviso que é para ele (e não o que é de todos, que a Lia lê)');
    }
    ok(await rpc(sB, 'vivo_do_jogador', { p_mesa: mesa, p_usuario: dalmo, p_fechado: false }) === 'ok', '(o mestre abre de novo)');
    // o mestre auxiliar que mestra também manda (e, jogando como jogador, não)
    ok(await rpc(sB, 'definir_auxiliar', { p_mesa: mesa, p_usuario: dalmo, p_auxiliar: true, p_abas: ['arvore'] }) === 'ok' && await inserir(sD, { id: 'pa_1', secreta: true, para: lia }) === 'ok' && (await ler(sL)).some(l => l.id === 'pa_1'),
      'o Dalmo, mestre auxiliar, manda uma linha só para a Lia (e ela a lê)');
    ok(await rpc(sD, 'auxiliar_jogar', { p_mesa: mesa, p_jogando: true }) === 'ok' && await inserir(sD, { id: 'pa_2', secreta: true, para: lia }) === 'recusado', 'jogando como jogador, não manda');
    ok(await rpc(sB, 'definir_auxiliar', { p_mesa: mesa, p_usuario: dalmo, p_auxiliar: false }) === 'ok', '(o Dalmo volta a ser jogador)');
  } finally {
    for (const s of [sB, sD, sL]) await s.d.ctx.close();
  }
}

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Lia'); await d.ctx.close(); }
  if (process.env.SO === 'banco') {
    // só o banco: a mesa, os dois jogadores e o aviso para o Dalmo, direto pelo banco
    const d = await t.device({ name: 'banco' }); await d.page.goto(t.base + 'src/tests/vazio.html');
    const um = async (email, nome, codigo) => d.page.evaluate(async ([email, senha, nome, codigo]) => {
      const e = await sb.auth.signInWithPassword({ email, password: senha }); if (e.error) return { erro: e.error.message };
      const uid = e.data.user.id;
      if (!codigo) {
        const r = await sb.rpc('criar_mesa', { p_nome: 'Árvore L6 banco ' + Date.now().toString(36), p_meu_nome: nome }); if (r.error) return { erro: r.error.message };
        const cv = await sb.from('mesa_convites').select('codigo').eq('mesa_id', r.data.id).single();
        return { uid, mesa: r.data.id, codigo: cv.data && cv.data.codigo };
      }
      const r = await sb.rpc('entrar_na_mesa', { p_codigo: codigo, p_meu_nome: nome }); return r.error ? { erro: r.error.message } : { uid };
    }, [email, c.senha, nome, codigo || null]);
    const b = await um(c.mestre, 'Bruno'), dj = await um(c.jog1, 'Dalmo', b.codigo), lj = await um(c.jog2, 'Lia', b.codigo);
    ok(b.mesa && dj.uid && lj.uid, '(a mesa e os dois jogadores, direto pelo banco) ' + JSON.stringify([b.erro, dj.erro, lj.erro]));
    const av = await d.page.evaluate(async ([email, senha, mesa, para]) => {
      await sb.auth.signInWithPassword({ email, password: senha });
      const r = await sb.from('registro').insert({ mesa_id: mesa, id: 'av_1', tipo: 'rolagem', origem: 'arvore', secreta: true, para, dados: { k: 'tabela', titulo: 'Caminho novo na árvore', total: null } });
      return r.error ? r.error.message : 'ok';
    }, [c.mestre, c.senha, b.mesa, dj.uid]);
    ok(av === 'ok', 'o mestre manda o aviso só para o Dalmo — ' + av);
    try { await sondarBanco(t, c, b.mesa, dj.uid, lj.uid, 'av_1'); }
    finally { await d.page.evaluate(async mesa => { await sb.from('mesas').delete().eq('id', mesa); }, b.mesa); await d.ctx.close(); }
    const fora = t.errs.filter(e => !/status of (400|401|403|409)/.test(e));
    if (fora.length) console.log('CONSOLE:\n' + fora.join('\n'));
    ok(fora.length === 0, 'sem erros inesperados no console');
    await t.close(); end(); return;
  }
  const M = (await t.device({ name: 'mestre', seed: { 'urgm.arvore.v4': arvLocal, 'tinycats:aba': 'arvore', 'tinycats-tour': '1' } })).page;
  const J = (await t.device({ name: 'dalmo', w: 1300, h: 860, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const skillsNa = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? JSON.parse(JSON.stringify(l.skills || {})) : null; }, id);
  const naTela = f => f.evaluate(() => [...document.querySelectorAll('#nos .no')].map(g => g.dataset.id).sort().join(','));
  const selecionar = async (f, id) => { await f.evaluate(id => { selecionado = id; pintarPainel(); desenhar(); }, id); await f.waitForTimeout(200); };
  const linhasPara = (p, uid) => p.evaluate(uid => TC.aoVivo.itens.filter(l => l.para === uid).map(l => ({ id: l.id, secreta: l.secreta, origem: l.origem, titulo: l.dados && l.dados.titulo, resumo: l.dados && l.dados.resumo })), uid);
  const toasts = p => p.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const pacoteNos = p => p.evaluate(() => { const d = TC.dados.col('documentos').pegar('arvore:pacote'); return d ? d.dados.arvores[0].nodes.map(n => n.id).join() : null; });
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };

  // ---------- a mesa: o mestre traz a árvore deste navegador ----------
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Árvore L6 E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  let apagada = false;
  try {
    let A = null;
    ok(await ate(async () => { A = await quadro(M, /\/arvore\//); return A && (await A.locator('#ofertaSim').count()) === 1; }, 40000), '(a Árvore oferece trazer a árvore do navegador)');
    await A.locator('#ofertaSim').click();
    ok(await ate(async () => await M.evaluate(() => { const D = TC.dados.col('documentos'); return !!D.pegar('arvore:biblioteca') && !!D.pegar('arvore:pacote') && TC.dados.pendentes === 0; })), '(a biblioteca e o pacote dos jogadores sobem para a mesa)');

    // ---------- os jogadores entram; o mestre entrega as fichas ----------
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    const dalmo = await J.evaluate(() => TC.conta.usuario.id);
    let lia = null;
    {
      const d3 = await t.device({ name: 'lia', seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } });
      await d3.page.goto(t.base + '?debug', { waitUntil: 'load' }); await d3.page.waitForTimeout(1200);
      await loginTela(d3.page, c.jog2, c.senha); await entrarMesaTela(d3.page, codigo, 'Lia');
      lia = await d3.page.evaluate(() => TC.conta.usuario.id);
      await d3.ctx.close();
    }
    const SK = { arvores: ['a_kit'], pontos: { p1: 20, p2: 5 }, alocados: {} };
    await M.evaluate(([fs, sk, d, l]) => {
      const P = TC.dados.col('personagens');
      P.gravar('pc_selene', { nome: 'Selene', ficha: fs[0], skills: sk, estado: {}, dono_id: d, vis: 'mesa', ordem: 0 });
      P.gravar('pc_brisa', { nome: 'Brisa', ficha: fs[1], skills: sk, estado: {}, dono_id: l, vis: 'mesa', ordem: 1 });
    }, [[ficha('Selene'), ficha('Brisa')], SK, dalmo, lia]);
    ok(await ate(() => parado(M)), '(as fichas da Selene, do Dalmo, e da Brisa, da Lia, sobem para a mesa)');
    ok(await ate(() => A.evaluate(() => doc.personagens.map(p => p.id).sort().join() === 'pc_brisa,pc_selene')), '(a Árvore do mestre tem os dois personagens da mesa)');
    // (o Dalmo fecha a mesa ao vivo: o aviso que vier tem de levar até ela)
    await J.locator('#vivoX').click(); await w(200, J);

    // ---------- trancar o caminho ----------
    await A.evaluate(() => { if (ui.modo !== 'mestre') trocarModo('mestre'); });
    await selecionar(A, 'n_membro');
    await A.locator('#eTranca').check(); await w(300);
    ok(await A.evaluate(() => porId.get('n_membro').tranca === true) && await A.locator('#abertoPara [data-abrir]').count() === 2 && /O dono recebe um aviso só para ele na mesa ao vivo\./.test(await A.locator('#abertoPara .nota').innerText()),
      'o mestre tranca o "Membro de Selene": "Aberto para" com os dois personagens da mesa (a nota diz que o dono recebe um aviso)');
    ok(await ate(async () => await pacoteNos(J) === 'n_origem,n_corpo', 30000), 'o pacote dos jogadores vai sem o caminho trancado (o Membro e a Garra, que vem depois dele): ' + await pacoteNos(J));
    ok(await M.evaluate(() => { const b = TC.dados.col('documentos').pegar('arvore:biblioteca').dados; return b.arvores[0].nodes.length === 4 && b.arvores[0].nodes.find(n => n.id === 'n_membro').tranca === true; }), '(a biblioteca do mestre continua com tudo, com a marca de trancado)');
    await J.locator('#tab-arvore').click();
    let B = null;
    ok(await ate(async () => { B = await quadro(J, /\/arvore\//); return B && await B.evaluate(() => typeof doc === 'object' && ui.modo === 'jogador' && !!personagemAtual() && personagemAtual().id === 'pc_selene'); }, 40000), '(o Dalmo abre a Árvore, na Selene)');
    ok(await ate(async () => await naTela(B) === 'n_corpo,n_origem'), 'na Árvore do Dalmo, o caminho não aparece: ' + await naTela(B));

    // ---------- abrir para a Selene ----------
    await selecionar(A, 'n_membro');
    await A.locator('[data-abrir="pc_selene"]').check(); await w(300);
    ok(/Caminho “Membro de Selene” aberto para Selene\./.test(await A.locator('#dica').innerText()), 'o mestre abre o caminho para a Selene: ' + await A.locator('#dica').innerText());
    ok(await ate(async () => { const s = await skillsNa(M, 'pc_selene'); return !!(s.ramos && s.ramos.n_membro) && s.ramos.n_membro.nodes.map(n => n.id).join() === 'n_membro,n_garra' && await parado(M); }), 'a cópia do ramo vai nas skills da Selene, na mesa (o Membro e a Garra)');
    ok(!(await skillsNa(M, 'pc_brisa')).ramos, '(a Brisa continua sem)');
    ok(await ate(async () => await naTela(B) === 'n_corpo,n_garra,n_membro,n_origem', 30000), 'a Árvore do Dalmo mostra o caminho na Selene: ' + await naTela(B));
    // o aviso só para o Dalmo
    ok(await ate(async () => (await linhasPara(M, dalmo)).length === 1, 15000), '(alguns segundos depois, o aviso vai para a mesa ao vivo)');
    const [av] = await linhasPara(M, dalmo);
    ok(av.secreta === true && av.origem === 'arvore' && av.titulo === 'Caminho novo na árvore: Membro de Selene' && av.resumo === 'O mestre abriu este caminho para Selene. Ele está na aba Árvore.', 'o aviso: em segredo, endereçado ao Dalmo — ' + JSON.stringify(av));
    {
      const li = M.locator('#feed [data-id="' + av.id + '"]');
      ok(await ate(async () => (await li.count()) === 1) && /Só você e Dalmo veem/.test(await li.innerText()) && await li.locator('button', { hasText: 'Mostrar à mesa' }).count() === 0, 'na mesa ao vivo do mestre: "Só você e Dalmo veem" (sem "Mostrar à mesa")');
    }
    ok(await ate(async () => (await linhasPara(J, dalmo)).some(l => l.id === av.id), 30000), 'o Dalmo recebe o aviso');
    ok(await ate(async () => /Caminho novo na árvore: Membro de Selene/.test(await toasts(J)), 8000) && await J.locator('#toasts .toast button', { hasText: 'Abrir a mesa ao vivo' }).count() === 1, 'com a mesa ao vivo fechada, um aviso na tela leva até ela: ' + await toasts(J));
    await J.locator('#toasts .toast button', { hasText: 'Abrir a mesa ao vivo' }).click(); await w(500, J);
    {
      const li = J.locator('#feed [data-id="' + av.id + '"]');
      const tx = (await li.innerText()).replace(/\s+/g, ' ');
      ok(await J.locator('#vivo').isVisible() && tx.includes('Caminho novo na árvore: Membro de Selene') && tx.includes('Só você e o mestre veem') && await li.locator('button').count() === 0, 'na mesa ao vivo do Dalmo: o aviso, "Só você e o mestre veem": ' + tx);
    }
    await foto(J, 'arvore6-rede-01-aviso');
    // a casca só manda o aviso de quem mestra, para alguém da mesa que não ele mesmo
    {
      const bruno = await M.evaluate(() => TC.conta.usuario.id);
      await A.evaluate(eu => { for (const para of ['00000000-0000-4000-8000-000000000000', eu]) TC.ponte.publicar('arvore', { kind: 'abriu', para, titulo: 'teste', resumo: 'teste' }); }, bruno);
      await B.evaluate(l => { TC.ponte.publicar('arvore', { kind: 'abriu', para: l, titulo: 'teste', resumo: 'teste' }); }, lia);
      await w(2500);
      const daArvore = await M.evaluate(() => TC.aoVivo.itens.filter(l => l.origem === 'arvore').length), erros = (await toasts(M)) + ' ¶ ' + (await toasts(J));
      ok(daArvore === 1 && !/O aviso para o jogador não foi/.test(erros), 'a casca não manda o aviso para quem não está na mesa nem para o próprio mestre — e o jogador não manda aviso nenhum (' + daArvore + ' da Árvore)');
    }
    // abrir e desfazer logo: o aviso não vai
    await selecionar(A, 'n_membro');
    await A.locator('[data-abrir="pc_brisa"]').check(); await w(300);
    await A.evaluate(() => desfazer()); await w(300);
    ok(await A.locator('[data-abrir="pc_brisa"]:checked').count() === 0 && !(await A.evaluate(() => doc.personagens.find(p => p.id === 'pc_brisa').ramos)), 'abrir para a Brisa e desfazer em seguida: fechado de novo');
    await w(4500);
    ok(await ate(() => parado(M)) && (await linhasPara(M, lia)).length === 0 && !(await skillsNa(M, 'pc_brisa')).ramos, 'e a Lia não recebe aviso nenhum (o mestre desfez antes de ele sair)');

    // ---------- o Dalmo aprende o caminho ----------
    await B.evaluate(async () => { await subirGrau('n_origem'); await subirGrau('n_membro'); await subirGrau('n_garra'); await subirGrau('n_garra'); }); await w(600, J);
    ok(await B.evaluate(() => { const p = personagemAtual(); return p.alocados.n_membro === 1 && p.alocados.n_garra === 2; }), 'o Dalmo aprende o Membro e os dois graus da Garra');
    ok(await ate(async () => { const s = await skillsNa(M, 'pc_selene'); return s.alocados.n_membro === 1 && s.alocados.n_garra === 2 && !!s.ramos && !!s.ramos.n_membro; }), 'na mesa, as escolhas dele ficam guardadas — e a cópia do caminho continua nas skills (quem a escreve é só o mestre)');
    await B.evaluate(() => desfazer()); await w(500, J);
    ok(await B.evaluate(() => { const p = personagemAtual(); return p.alocados.n_garra === 1 && !!p.ramos && !!p.ramos.n_membro; }) && await naTela(B) === 'n_corpo,n_garra,n_membro,n_origem', 'o Desfazer do Dalmo volta um grau, e o caminho continua aberto');
    await B.evaluate(() => refazer()); await w(500, J);
    // os ramos são do mestre: um caminho "aberto" à mão no aparelho do Dalmo não chega à mesa
    // (depois de mexer nos ramos, ele desce um grau da Garra: quando a mesa tiver o grau novo, tem também o que subiu antes)
    await B.evaluate(() => { const p = personagemAtual(); p.ramos = Object.assign({}, p.ramos, { n_corpo: { a: 'a_kit', nodes: [], defs: {} } }); salvar(); indexar(); pintarTudo(); }); await w(800, J);
    await B.evaluate(async () => { await descerGrau('n_garra'); }); await w(300, J);
    ok(await ate(async () => { const s = await skillsNa(M, 'pc_selene'); return s.alocados.n_garra === 1 && await parado(J); }) && await (async () => { const s = await skillsNa(M, 'pc_selene'); return !!s.ramos.n_membro && !s.ramos.n_corpo; })(),
      'um caminho "aberto" à mão no aparelho do Dalmo não chega à mesa (quem escreve os ramos é o mestre)');
    await B.evaluate(async () => { await subirGrau('n_garra'); });
    ok(await ate(async () => (await skillsNa(M, 'pc_selene')).alocados.n_garra === 2), '(e ele volta a Garra ao grau 2)');

    // ---------- as contas e o custo de uso, com a ficha da Selene ----------
    await selecionar(B, 'n_garra');
    ok(await ate(async () => (await B.locator('#descJog').innerText()) === `Causa ${FOR1 * 2 + 10} de dano.`, 15000), 'na Árvore do Dalmo, a conta da descrição vira o número da Selene (FOR ' + FOR1 + ', com o +2 do Membro): ' + await B.locator('#descJog').innerText());
    ok(await B.locator('#descJog .conta').getAttribute('title') === `Conta: FOR*2 + 10 · FOR ${FOR1}`, 'passando o mouse, a conta: ' + await B.locator('#descJog .conta').getAttribute('title'));
    {
      const gl = (await B.locator('.graus-lista').innerText()).replace(/\s+/g, ' ');
      ok(gl.includes('Lua: 1 · uso: 10 SP') && gl.includes(`Lua: 2 — +${MEIO} de gelo · uso: 15 SP · ${MEIO} Energia`), 'cada grau, com o texto e o custo de uso no número dela (CAN ' + VARS.CAN + '): ' + gl);
    }
    await foto(J, 'arvore6-rede-02-contas');

    // ---------- a ficha: o bônus e "Passivas e Habilidades" ----------
    await M.locator('#tab-fichas').click();
    let F = null;
    ok(await ate(async () => { F = await quadro(M, /\/fichas\//); return F && (await F.locator('#lista .pc').count()) === 2 && await F.evaluate(() => !!S.bib); }, 40000), '(o mestre abre as Fichas)');
    const forNaFicha = () => F.evaluate(() => calcular(S.personagens.find(p => p.id === 'pc_selene')).tot.FOR);
    ok(await ate(async () => await forNaFicha() === FOR1), 'na ficha do mestre, a Força da Selene ganha o +2 do Membro (o nódulo do caminho aberto): ' + await forNaFicha());
    await F.locator('#lista .pc', { has: F.locator('.nm', { hasText: /^Selene$/ }) }).click(); await w(400);
    await F.locator('#ficha [data-sub="habs"]').click(); await w(400);
    const habsEm = f => f.locator('#habsDaArvore .habrow.daarv').evaluateAll(l => l.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    const confereHabs = (habs, onde) => {
      const garra = habs.find(x => x.includes('Garra de Gelo')) || '';
      ok(habs.length === 3 && habs.some(x => x.includes('Membro de Selene')) && garra.includes(`Causa ${FOR1 * 2 + 10} de dano.`) && garra.includes(`+${MEIO} de gelo`) && garra.includes(`Custo de uso: 15 SP · ${MEIO} Energia`),
        onde + ', "Passivas e Habilidades" traz o que veio do caminho, com as contas e o custo de uso no número da Selene: ' + JSON.stringify(habs));
    };
    confereHabs(await habsEm(F), 'na ficha do mestre');
    ok(await F.locator('#habsDaArvore [data-habarv="n_garra"] .habtexto > .conta').getAttribute('title') === `Conta: FOR*2 + 10 · FOR ${FOR1}`, '(passando o mouse, a conta)');
    await foto(M, 'arvore6-rede-03-ficha');
    // na ficha do Dalmo também
    await J.locator('#tab-fichas').click();
    let FJ = null;
    ok(await ate(async () => { FJ = await quadro(J, /\/fichas\//); return FJ && (await FJ.locator('#lista .pc', { has: FJ.locator('.nm', { hasText: /^Selene$/ }) }).count()) === 1; }, 40000), '(o Dalmo abre as Fichas)');
    await FJ.locator('#lista .pc', { has: FJ.locator('.nm', { hasText: /^Selene$/ }) }).click(); await w(400, J);
    await FJ.locator('#ficha [data-sub="habs"]').click(); await w(400, J);
    confereHabs(await habsEm(FJ), 'na ficha do Dalmo');
    ok(await FJ.evaluate(() => calcular(S.personagens.find(p => p.id === 'pc_selene')).tot.FOR) === FOR1, '(e a Força dele também tem o +2)');
    await J.locator('#tab-arvore').click(); await w(500, J);

    // ---------- o mestre muda a Garra: a cópia acompanha ----------
    await M.locator('#tab-arvore').click(); await w(800);
    await selecionar(A, 'n_garra');
    ok((await A.locator('#barrasDaMesa option').evaluateAll(l => l.map(o => o.value))).join() === 'Energia,Fé,HP,SP', 'no custo de uso, o editor sugere as barras das fichas da mesa (Energia, Fé, HP, SP)');
    await A.locator('#eDesc').fill('Causa {FOR*3} de dano gélido.'); await A.locator('#eDesc').press('Tab'); await w(300);
    ok(await ate(async () => { const s = await skillsNa(M, 'pc_selene'); return s.ramos.n_membro.nodes.find(n => n.id === 'n_garra').desc === 'Causa {FOR*3} de dano gélido.' && await parado(M); }), 'o mestre muda a descrição da Garra: a cópia nas skills da Selene acompanha');
    ok(await ate(async () => (await B.locator('#descJog').innerText()) === `Causa ${FOR1 * 3} de dano gélido.`, 30000), 'e o Dalmo vê a nova, com o número da Selene: ' + await B.locator('#descJog').innerText());

    // ---------- fechar o caminho: some, os nódulos ficam guardados, o bônus deixa de contar ----------
    await selecionar(A, 'n_membro');
    await A.locator('[data-abrir="pc_selene"]').uncheck(); await w(300);
    ok(/Caminho “Membro de Selene” fechado para Selene\. Os 2 nódulos que ele tinha ali ficam guardados e voltam se o caminho abrir de novo\./.test(await A.locator('#dica').innerText()), 'o mestre fecha o caminho da Selene: ' + await A.locator('#dica').innerText());
    ok(await ate(async () => await naTela(B) === 'n_corpo,n_origem', 30000), 'o caminho some da Árvore do Dalmo');
    ok(await ate(async () => { const s = await skillsNa(M, 'pc_selene'); return !s.ramos && s.alocados.n_membro === 1 && s.alocados.n_garra === 2 && await parado(M); }), 'na mesa: a cópia sai das skills, e as escolhas dele ficam guardadas');
    await M.locator('#tab-fichas').click(); await w(600);
    ok(await ate(async () => await forNaFicha() === FOR0), 'na ficha do mestre (que tem a biblioteca inteira, com o caminho), o +2 do Membro deixa de contar: ' + await forNaFicha());
    ok(await ate(async () => (await F.locator('#habsDaArvore .habrow.daarv').count()) === 1), '(e "Passivas e Habilidades" fica só com a Origem)');
    await F.locator('#ficha [data-sub="skills"]').click(); await w(400);
    ok((await F.locator('#ficha').innerText()).includes('2 de ramo trancado'), 'a aba Skills diz que há 2 nódulos num caminho trancado');

    // ---------- abrir de novo: volta tudo ----------
    await M.locator('#tab-arvore').click(); await w(600);
    await selecionar(A, 'n_membro');
    await A.locator('[data-abrir="pc_selene"]').check(); await w(300);
    ok(await ate(async () => await naTela(B) === 'n_corpo,n_garra,n_membro,n_origem', 30000) && await B.evaluate(() => { const p = personagemAtual(); return p.alocados.n_membro === 1 && p.alocados.n_garra === 2; }), 'abrir de novo: o caminho volta para o Dalmo, com o que ele tinha aprendido');
    ok(await ate(async () => (await linhasPara(M, dalmo)).length === 2, 15000), '(e o Dalmo recebe um aviso novo)');
    await M.locator('#tab-fichas').click(); await w(600);
    ok(await ate(async () => await forNaFicha() === FOR1), 'e o bônus volta a contar na ficha');
    await M.locator('#tab-arvore').click(); await w(300);
    // as regras da mesa mandam arredondar para cima: a conta da Árvore do Dalmo acompanha, sozinha
    {
      const V2 = R.calcular(Object.assign({}, ficha('Selene'), { id: 'pc_selene' }), Object.assign(R.cfgPadrao(), { arredondar: 'ceil' }), { arvore: { FOR: 2 } }).vars, CIMA = Math.ceil(V2.CAN / 2);
      await selecionar(B, 'n_garra');
      ok(await ate(async () => (await B.locator('.graus-lista').innerText()).includes(`${MEIO} Energia`)), '(a Garra, aberta de novo, com o custo de antes)');
      await M.evaluate(() => { TC.dados.col('documentos').gravar('fichas:cfg', { dados: { v: Object.assign(TC.rules.cfgPadrao(), { arredondar: 'ceil' }) }, vis: 'mesa' }); });
      ok(CIMA !== MEIO && await ate(async () => (await B.locator('.graus-lista').innerText()).includes(`${CIMA} Energia`), 30000), 'as regras da mesa passam a arredondar para cima: o custo na Árvore do Dalmo acompanha sozinho (' + CIMA + ' Energia)');
    }

    // ---------- o banco: quem escreve e quem lê a linha "para" alguém ----------
    // (o Dalmo termina o que tinha para subir e fecha o site: a sonda faz dele mestre auxiliar por um instante)
    ok(await ate(async () => await J.evaluate(() => TC.dados.pendentes === 0)), '(o que o Dalmo fez está no banco)');
    await J.context().close();
    await sondarBanco(t, c, await M.evaluate(() => TC.mesas.atual.id), dalmo, lia, av.id);
    // a Lia, no site: a linha dela, e não a do Dalmo
    {
      const d4 = await t.device({ name: 'lia2', seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } }), L = d4.page;
      await L.goto(t.base + '?debug', { waitUntil: 'load' }); await L.waitForTimeout(1200);
      await loginTela(L, c.jog2, c.senha); await entrarMesaTela(L, codigo, 'Lia');
      const li = L.locator('#feed [data-id="pm_2"]');
      ok(await ate(async () => (await li.count()) === 1) && (await li.innerText()).includes('Só você e o mestre veem') && await L.evaluate(id => !TC.aoVivo.itens.some(l => l.id === id), av.id), 'a Lia, no site: vê a linha que é para ela ("Só você e o mestre veem"), e não a do Dalmo');
      await d4.ctx.close();
    }

    // (antes de apagar a mesa, o que falta subir termina de subir)
    await ate(async () => await M.evaluate(() => TC.dados.pendentes === 0));
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  // (as recusas da sonda do banco aparecem no console dela como respostas de erro: são o que se esperava)
  const fora = t.errs.filter(e => !/^\[sonda-/.test(e) || !/status of (400|401|403|409)/.test(e)).filter(e => !/status of (400|401|409)/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.join('\n') + '\nRESPOSTAS DE ERRO:\n' + t.ruins.join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
