// Lote 5, parte 3, numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre e dois jogadores:
//  · o mestre deixa um jogador mexer no acampamento (Permissões…), e tira de novo;
//  · o jogador com o acampamento muda as provisões (e desfaz), mas não o que é do mestre — nem chamando o banco direto;
//  · o mestre e o jogador mexendo ao mesmo tempo: as duas mudanças ficam (o acampamento é gravado conferindo a versão);
//  · a outra jogadora, sem a permissão, continua só vendo (e o banco não aceita mudança dela);
//  · o mestre muda a Sanidade e o Conforto pelo cartão (e desfaz só aquilo);
//  · o momento com corações, Sanidade, Conforto e emoção, e o desfazer dele;
//  · as linhas de relação para o jogador: só o que está aberto.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const ficha = (nome, extra) => Object.assign({ nome, raca: 'Humana', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 5, fonte: 'total' }, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 }, estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '',
  recursos: [{ id: 'hp', nome: 'HP', fml: '100' }] }, extra);

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await entrar(d.page, c.jog2, c.senha, 'Bia'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'acampamento', 'tinycats-tour': '1' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 860, seed: { 'tinycats:aba': 'acampamento' } })).page;
  const K = (await t.device({ name: 'jogadora2', w: 1100, h: 820, seed: { 'tinycats:aba': 'acampamento' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const linha = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? JSON.parse(JSON.stringify(l)) : null; }, id);
  const doc = p => p.evaluate(() => { const d = TC.dados.col('documentos').pegar('acampamento'); return d ? JSON.parse(JSON.stringify(d.dados)) : null; });
  const j = JSON.stringify;
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  // uma gravação direta no banco, como faria quem quisesse burlar a tela (a sessão é a da pessoa naquele aparelho)
  const direto = (p, mesa, mexer, id = 'acampamento') => p.evaluate(async ([mesa, mexer, id]) => {
    const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave);
    const r0 = await a.from('documentos').select('dados').eq('mesa_id', mesa).eq('id', id).maybeSingle();
    const dados = Object.assign({}, r0.data ? r0.data.dados : {}, mexer);
    const r = await a.from('documentos').update({ dados }).eq('mesa_id', mesa).eq('id', id).select('id');
    return { n: (r.data || []).length, erro: r.error ? r.error.message : null };
  }, [mesa, mexer, id]);
  // o acampamento como está no banco, lido por fora do programa
  const doBanco = (p, mesa) => p.evaluate(async mesa => {
    const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave);
    const r = await a.from('documentos').select('dados').eq('mesa_id', mesa).eq('id', 'acampamento').maybeSingle();
    return r.data ? r.data.dados : null;
  }, mesa);
  /* Segura no caminho a próxima gravação do acampamento deste aparelho, até soltar(): assim ela chega ao banco depois
     da do outro, partindo da versão de antes — o que acontece quando os dois gravam no mesmo instante e a do outro
     chega primeiro. */
  const segurar = async p => {
    let soltar = null; const solta = new Promise(r => { soltar = r; });
    const st = { preso: false };
    const fn = async route => { const q = route.request(); if (!st.preso && q.method() === 'PATCH' && q.url().includes('id=eq.acampamento')) { st.preso = true; await solta; } await route.continue(); };
    await p.route('**/rest/v1/documentos**', fn);
    return { preso: () => st.preso, soltar: async () => { soltar(); await p.waitForTimeout(150); await p.unroute('**/rest/v1/documentos**', fn); } };
  };
  // dar a permissão chamando o banco direto (só o mestre da mesa pode)
  const dar = (p, mesa, quem) => p.evaluate(async ([mesa, quem]) => {
    const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave);
    const r = await a.rpc('acamp_do_jogador', { p_mesa: mesa, p_usuario: quem, p_pode: true });
    return r.error ? r.error.message : 'deu';
  }, [mesa, quem]);
  let apagada = false, nomeMesa = '';
  try {
    // ---------- a mesa, os dois jogadores e as fichas ----------
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    nomeMesa = 'Acamp Jogadores ' + Date.now().toString(36);
    await criarMesaTela(M, nomeMesa, { semCodigo: true });
    const codigo = await codigoDaMesa(M), mesaId = await M.evaluate(() => TC.mesas.atual.id);
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    await K.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, K);
    await loginTela(K, c.jog2, c.senha); await entrarMesaTela(K, codigo, 'Bia');
    const jogId = await J.evaluate(() => TC.conta.usuario.id), biaId = await K.evaluate(() => TC.conta.usuario.id);

    // ---------- a permissão antes de o acampamento existir na mesa: o Dalmo espera o mestre abri-lo ----------
    // (sem fichas, o Acampamento aberto do mestre ainda não gravou nada: o documento não existe)
    await M.evaluate(id => TC.mesas.acampDoJogador(id, true), jogId);
    let B0 = null;
    ok(await ate(async () => { B0 = await quadro(J, /\/acampamento\//); return B0 && await B0.evaluate(() => !!window.__acamp && __acamp.pronto && __acamp.modo === 'mesa') && (await B0.locator('#acamp-espera').count()) === 1; }, 40000),
      'com a permissão, mas sem o acampamento na mesa, o Dalmo vê o aviso de que o mestre ainda não o abriu');
    ok(await B0.evaluate(() => !__acamp.edita()) && (await doc(M)) === null, 'e, enquanto isso, não mexe em nada (quem cria o acampamento é o mestre)');
    await M.evaluate(id => TC.mesas.acampDoJogador(id, false), jogId);
    ok(await ate(async () => (await B0.locator('#acamp-espera').count()) === 0), '(o mestre tira a permissão de novo: o aviso some)');

    await M.evaluate(([a, b]) => {
      const P = TC.dados.col('personagens'), sk = { arvores: [], pontos: {}, alocados: {} };
      // (um documento da mesa que não é o acampamento, para conferir que a permissão não vale para ele)
      TC.dados.col('documentos').gravar('teste:mesa', { dados: { v: 1 }, vis: 'mesa' });
      P.gravar('pc_dain', { nome: 'Dain', ficha: Object.assign(JSON.parse(a.f), { nome: 'Dain' }), skills: sk, estado: { san: 60, conf: 40, rels: { r1: { alvo: 'pc_lia', nome: 'Lia', v: 20, o: 0 } } }, dono_id: a.id, vis: 'mesa', ordem: 0 });
      P.gravar('pc_lia', { nome: 'Lia', ficha: Object.assign(JSON.parse(a.f), { nome: 'Lia' }), skills: sk, estado: { san: 90, conf: 70, rels: { r2: { alvo: 'pc_dain', nome: 'Dain', v: -10, o: 0 } } }, dono_id: b, vis: 'mesa', ordem: 1 });
    }, [{ f: j(ficha('x')), id: jogId }, biaId]);
    ok(await ate(() => parado(M)), '(as fichas do Dain, de Dalmo, e da Lia, da Bia, sobem para a mesa)');

    // ---------- o acampamento do mestre ----------
    let A = null;
    ok(await ate(async () => { A = await quadro(M, /\/acampamento\//); return A && await A.evaluate(() => !!window.__acamp && __acamp.pronto && __acamp.modo === 'mesa' && __acamp.papel === 'mestre'); }, 40000), 'o mestre abre o Acampamento');
    ok(await ate(async () => { const d = await doc(M); return d && d.presentes.length === 2 && await parado(M); }), 'os personagens dos jogadores entram na roda, e o acampamento fica na mesa');
    await A.evaluate(() => __acamp.mudar('preparar', c => { c.provisoes = [{ id: 'pao', nome: 'Pão', qtd: 6 }]; }));
    ok(await ate(async () => { const d = await doc(M); return d.provisoes.length === 1 && await parado(M); }), '(o mestre guarda 6 pães)');

    // ---------- os jogadores, de início, só veem ----------
    let B = null, Kb = null;
    ok(await ate(async () => { B = await quadro(J, /\/acampamento\//); return B && await B.evaluate(() => !!window.__acamp && __acamp.pronto && __acamp.papel === 'jogador' && __acamp.camp.provisoes.length === 1); }, 40000), 'o Dalmo abre o Acampamento e recebe o da mesa');
    ok(await ate(async () => { Kb = await quadro(K, /\/acampamento\//); return Kb && await Kb.evaluate(() => !!window.__acamp && __acamp.pronto && __acamp.camp.provisoes.length === 1); }, 40000), 'a Bia também');
    await B.locator('#tab-provisoes').click(); await w(300, J);
    ok(await B.locator('#pv-novo').count() === 0 && await B.locator('#btDesfazer').isHidden() && await B.evaluate(() => !__acamp.edita()), 'sem a permissão, o Dalmo não muda nada');

    // ---------- o mestre dá o acampamento ao Dalmo ----------
    await M.locator('#btnConta').click(); await w(300);
    await M.locator('#membros .mb', { hasText: 'Dalmo' }).locator('button', { hasText: 'Permissões' }).click(); await w(350);
    ok(await M.locator('#pp-acamp').count() === 1 && !(await M.locator('#pp-acamp').isChecked()), 'na janela de permissões, "Dalmo mexe no acampamento" começa desmarcado');
    await foto(M, 'p3-permissoes');
    await M.locator('#pp-acamp').check(); await M.locator('#pp-ok').click(); await w(500);
    ok(await ate(async () => (await M.locator('.toast', { hasText: 'Dalmo agora mexe no acampamento' }).count()) === 1), 'o mestre salva: "Dalmo agora mexe no acampamento" (com Desfazer)');
    ok(await ate(async () => await B.evaluate(() => __acamp.edita()) && (await B.locator('#pv-novo').count()) === 1, 35000), 'na tela do Dalmo, o acampamento passa a ser editável');
    ok(await ate(async () => (await B.locator('#toasts .toast', { hasText: 'O mestre deixou você mexer no acampamento' }).count()) === 1), 'e ele fica sabendo');
    // os bônus do acampamento continuam do mestre: na aba Grupo, o Dalmo os vê sem poder mudar
    await A.evaluate(() => __acamp.mudar('um bônus', c => { c.bonus.push({ id: 'bn_moral', nome: 'Moral alta' }); }));
    await B.locator('#tab-grupo').click(); await w(300, J);
    ok(await ate(async () => (await B.locator('#bn-n-bn_moral').count()) === 1) && await B.locator('#bn-n-bn_moral').evaluate(e => e.readOnly), 'na aba Grupo, o bônus "Moral alta" do mestre aparece para o Dalmo, sem dar para mudar');
    await B.locator('#tab-provisoes').click(); await w(300, J);
    await M.locator('#btnConta').click(); await w(300);
    ok(/mexe no acampamento/.test(await M.locator('#membros .mb', { hasText: 'Dalmo' }).innerText()), 'no menu do mestre, o Dalmo aparece "mexe no acampamento"');
    await M.keyboard.press('Escape'); await w(200);

    // ---------- o Dalmo muda as provisões (e desfaz) ----------
    await B.locator('#pv-novo').click(); await w(200, J);
    await J.keyboard.type('Queijo'); await J.keyboard.press('Enter'); await w(500, J);
    ok(await ate(async () => { const d = await doc(M); return d.provisoes.some(p => p.nome === 'Queijo'); }), 'o Dalmo põe "Queijo" nas provisões, e chega ao mestre');
    ok(await B.locator('#btDesfazer').isVisible() && await B.locator('#hora').isHidden() && await B.locator('#nome').evaluate(e => e.readOnly), 'ele tem o desfazer, mas não a hora nem o nome do acampamento');
    await B.locator('#btDesfazer').click(); await w(400, J);
    ok(await ate(async () => { const d = await doc(M); return !d.provisoes.some(p => p.nome === 'Queijo') && d.provisoes.length === 2; }), 'o desfazer dele volta um passo de cada vez: primeiro o nome…');
    await B.locator('#btDesfazer').click(); await w(400, J);
    ok(await ate(async () => { const d = await doc(M); return d.provisoes.length === 1 && d.provisoes[0].nome === 'Pão'; }), '…depois a provisão nova (para todos)');
    // o que é do mestre, nem pelo banco
    const hora = await direto(J, mesaId, { hora: 'amanhecer' });
    ok(hora.n === 0 && /Só o mestre muda isso no acampamento \(hora\)/.test(hora.erro || ''), 'mudar a hora chamando o banco direto: recusado — ' + j(hora));
    const prov = await direto(J, mesaId, { provisoes: [{ id: 'pao', nome: 'Pão', qtd: 7, ef: { conf: 0, san: 0, rec: 0 }, fx: [] }] });
    ok(prov.n === 1 && !prov.erro, 'já as provisões, ele grava (é a parte dele) — ' + j(prov));
    ok(await ate(async () => (await doc(M)).provisoes[0].qtd === 7), '(o mestre vê os 7 pães)');
    // a parte do mestre, pela tela: o site do Dalmo recusa antes de chegar ao banco
    ok(await B.evaluate(() => __acamp.mudar('o clima', c => { c.clima = 'neve'; })) === false && (await B.locator('#toasts .toast', { hasText: 'Só o mestre muda isso no acampamento.' }).count()) === 1,
      'mudar o clima pela tela: o site do Dalmo recusa, com o aviso');
    // e pelo banco, cada uma das partes do mestre
    const partes = { nome: 'Outro nome', fundo: { url: 'https://exemplo.com/f.png' }, cena: 'cena_x', presentes: [], autoVistos: [], roda: [], regras: {}, bonus: [], emo: { pc_dain: 'alegre' }, lugar: 'caverna', clima: 'neve' };
    const aceitas = [];
    for (const [k, v] of Object.entries(partes)) { const r = await direto(J, mesaId, { [k]: v }); if (!(r.n === 0 && new RegExp('Só o mestre muda isso no acampamento \\(' + k + '\\)').test(r.erro || ''))) aceitas.push(k + ': ' + j(r)); }
    ok(aceitas.length === 0, 'o banco recusa cada parte do mestre: o nome, o fundo, a cena, quem está, a roda, as regras, os bônus, as emoções, o lugar e o clima' + (aceitas.length ? ' — ' + aceitas.join(' | ') : ''));
    // a permissão é só do acampamento, e só o mestre a dá
    const outro = await direto(J, mesaId, { v: 2 }, 'teste:mesa');
    ok(outro.n === 0, 'com a permissão do acampamento, o Dalmo não mexe em outro documento da mesa — ' + j(outro));
    const daBia = await dar(K, mesaId, biaId), doDalmo = await dar(J, mesaId, biaId);
    ok(/Só o mestre da mesa dá o acampamento a alguém/.test(daBia) && /Só o mestre da mesa dá o acampamento a alguém/.test(doDalmo), 'nem a Bia se dá a permissão, nem o Dalmo a dá a ela — ' + j([daBia, doDalmo]));
    // o acampamento como a versão de antes do site o gravava (sem o lugar, o clima, as áreas…): o Dalmo grava a parte
    // dele sem tocar nas do mestre (que o site arrumaria diferente, e o banco recusaria)
    const velho = await M.evaluate(async mesa => {
      const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave);
      const r0 = await a.from('documentos').select('dados').eq('mesa_id', mesa).eq('id', 'acampamento').maybeSingle();
      const dados = Object.assign({}, r0.data.dados); for (const k of ['lugar', 'clima', 'verCaravana', 'area', 'comer']) delete dados[k];
      const r = await a.from('documentos').update({ dados }).eq('mesa_id', mesa).eq('id', 'acampamento').select('id');
      return { n: (r.data || []).length, erro: r.error ? r.error.message : null };
    }, mesaId);
    ok(velho.n === 1 && await ate(async () => { const e = await doc(J); return !!e && !('clima' in e) && !('lugar' in e); }), '(o acampamento fica como a versão de antes o gravava, e chega assim ao Dalmo) — ' + j(velho));
    await B.evaluate(() => __acamp.mudar('o mel', c => { c.provisoes.push({ id: 'mel', nome: 'Mel', qtd: 2 }); }));
    ok(await ate(async () => { const d = await doc(M); return d.provisoes.some(p => p.id === 'mel') && !('clima' in d) && !('lugar' in d) && await parado(J); }),
      'nesse acampamento, o Dalmo põe o Mel nas provisões, e o lugar e o clima continuam como o mestre deixou — ' + j(Object.keys(await doc(M))));
    // a Bia, sem a permissão: nem pela tela, nem pelo banco
    await Kb.locator('#tab-provisoes').click(); await w(300, K);
    ok(await Kb.locator('#pv-novo').count() === 0 && await Kb.evaluate(() => !__acamp.edita()), 'a Bia continua só vendo');
    const bia = await direto(K, mesaId, { provisoes: [] });
    ok(bia.n === 0, 'e o banco não aceita mudança dela: ' + j(bia));

    // ---------- o mestre e o Dalmo ao mesmo tempo ----------
    // (cada um grava conferindo a versão: o que chega depois junta a mudança dele à do outro, em vez de passar por cima)
    let preso = await segurar(M);
    await A.evaluate(() => __acamp.mudar('a hora', c => { c.hora = 'entardecer'; }));
    ok(await ate(async () => preso.preso()), '(a gravação do mestre fica presa no caminho)');
    await B.evaluate(() => __acamp.mudar('rações', c => { c.provisoes[0].qtd = 9; }));
    ok(await ate(async () => (await doBanco(J, mesaId)).provisoes[0].qtd === 9), '(a do Dalmo chega primeiro ao banco)');
    await preso.soltar();
    ok(await ate(async () => { const d = await doc(M), e = await doc(J), b = await doBanco(K, mesaId); return d.hora === 'entardecer' && d.provisoes[0].qtd === 9 && e.hora === 'entardecer' && e.provisoes[0].qtd === 9 && b.hora === 'entardecer' && b.provisoes[0].qtd === 9 && await parado(M) && await parado(J); }),
      'o mestre muda a hora e o Dalmo as rações no mesmo instante, e a do mestre chega depois: as duas mudanças ficam, para os dois — ' + j([(await doc(M)).hora, (await doc(M)).provisoes[0].qtd]));
    preso = await segurar(J);
    await B.evaluate(() => __acamp.mudar('rações', c => { c.provisoes[0].qtd = 10; }));
    ok(await ate(async () => preso.preso()), '(agora a gravação do Dalmo fica presa)');
    await A.evaluate(() => __acamp.mudar('a hora', c => { c.hora = 'amanhecer'; }));
    ok(await ate(async () => (await doBanco(M, mesaId)).hora === 'amanhecer'), '(a do mestre chega primeiro)');
    await preso.soltar();
    ok(await ate(async () => { const d = await doc(M), e = await doc(J), b = await doBanco(K, mesaId); return d.hora === 'amanhecer' && d.provisoes[0].qtd === 10 && e.hora === 'amanhecer' && e.provisoes[0].qtd === 10 && b.hora === 'amanhecer' && b.provisoes[0].qtd === 10 && await parado(M) && await parado(J); }),
      'e ao contrário, com a do Dalmo chegando depois: as duas ficam também — ' + j([(await doc(M)).hora, (await doc(M)).provisoes[0].qtd]));
    // o desfazer do Dalmo volta só o passo dele: o que o mestre mexeu depois fica
    await A.evaluate(() => __acamp.mudar('anotar no diário', c => { c.diario.unshift({ id: 'di_mestre', t: Date.now(), texto: 'Nota do mestre' }); }));
    ok(await ate(async () => await B.evaluate(() => __acamp.camp.diario.some(d => d.id === 'di_mestre'))), '(o mestre anota no diário, e chega ao Dalmo)');
    await B.locator('#btDesfazer').click({ timeout: 8000 }); await w(500, J);
    ok(await ate(async () => { const d = await doc(M); return d.provisoes[0].qtd === 9 && d.diario.some(x => x.id === 'di_mestre') && d.hora === 'amanhecer' && await parado(J); }),
      'o Dalmo desfaz as últimas rações (de 10 para 9), e a nota do mestre e a hora ficam — ' + j([(await doc(M)).provisoes[0].qtd, (await doc(M)).diario.map(x => x.id), (await doc(M)).hora]));

    // ---------- o mestre tira a permissão (e o "Desfazer" do aviso a devolve) ----------
    await M.locator('#btnConta').click(); await w(300);
    await M.locator('#membros .mb', { hasText: 'Dalmo' }).locator('button', { hasText: 'Permissões' }).click(); await w(350);
    ok(await M.locator('#pp-acamp').isChecked(), 'na janela de permissões, a caixa do acampamento agora vem marcada');
    await M.locator('#pp-acamp').uncheck(); await M.locator('#pp-ok').click();
    await M.locator('.toast', { hasText: 'Dalmo não mexe mais no acampamento' }).locator('button', { hasText: 'Desfazer' }).click({ timeout: 8000 });
    ok(await ate(async () => (await M.locator('.toast', { hasText: 'Desfeito: Dalmo ficou como estava' }).count()) === 1 && await M.evaluate(id => TC.mesas.atual.membros.find(x => x.usuario_id === id).acamp, jogId)),
      '"Desfazer", no aviso do mestre, devolve a permissão ao Dalmo');
    await M.evaluate(id => TC.mesas.acampDoJogador(id, false), jogId);
    ok(await ate(async () => !(await B.evaluate(() => __acamp.edita())) && (await B.locator('#pv-novo').count()) === 0, 35000), 'tirada a permissão, a tela do Dalmo volta a ser só de ver');
    const depois = await direto(J, mesaId, { provisoes: [] });
    ok(depois.n === 0, 'e o banco volta a recusar: ' + j(depois));

    // ---------- a Sanidade e o Conforto pelo cartão (o mestre) ----------
    await A.locator('#tab-grupo').click(); await w(200);
    await A.locator('#pc-pc_dain').click(); await w(300);
    ok(await A.locator('#mt-san-pc_dain').inputValue() === '60' && await A.locator('#mt-conf-pc_dain').inputValue() === '40', 'no cartão do Dain, o mestre vê a Sanidade (60) e o Conforto (40) para mudar');
    await A.locator('#mt-san-pc_dain-p').click(); await w(150); await A.locator('#mt-san-pc_dain-p').click(); await w(300);
    await A.locator('#mt-conf-pc_dain').fill('25'); await A.locator('#mt-conf-pc_dain').press('Enter'); await w(400);
    ok(await ate(async () => { const l = await linha(M, 'pc_dain'); return l.estado.san === 62 && l.estado.conf === 25 && await parado(M); }), 'dois cliques no + (62) e o Conforto digitado (25): na ficha');
    ok(await ate(async () => { const l = await linha(J, 'pc_dain'); return l.estado.san === 62 && l.estado.conf === 25; }), 'e a ficha do Dalmo mostra');
    // nesse meio-tempo o Dalmo (o dono) deixa o Dain calmo: o desfazer do mestre não leva isso junto
    await J.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_dain'); P.gravar('pc_dain', { estado: Object.assign({}, l.estado, { emo: 'calmo' }) }); });
    ok(await ate(async () => (await linha(M, 'pc_dain')).estado.emo === 'calmo' && await A.evaluate(() => (__acamp.pessoa('pc_dain') || {}).emo === 'calmo')), '(o Dalmo deixa o Dain calmo, e o mestre recebe)');
    await A.locator('#btDesfazer').click(); await w(400);
    ok(await ate(async () => { const l = await linha(M, 'pc_dain'); return l.estado.conf === 40 && l.estado.san === 62 && l.estado.emo === 'calmo' && await parado(M); }), 'o desfazer volta só o Conforto (a emoção que o Dalmo pôs fica)');
    await A.locator('#btDesfazer').click(); await w(400);
    ok(await ate(async () => { const l = await linha(M, 'pc_dain'); return l.estado.san === 60 && l.estado.emo === 'calmo'; }), 'e o seguinte, a Sanidade (os dois cliques foram um passo só)');
    await A.locator('#mt-conf-pc_dain').fill('150'); await A.locator('#mt-conf-pc_dain').press('Enter'); await w(400);
    ok(await ate(async () => (await linha(M, 'pc_dain')).estado.conf === 100), 'digitar 150 no Conforto deixa em 100, o máximo');
    await A.locator('#btDesfazer').click(); await w(400);
    ok(await ate(async () => (await linha(M, 'pc_dain')).estado.conf === 40 && await parado(M)), '(desfeito: 40 de novo)');

    // ---------- o momento: corações, Sanidade, Conforto e emoção ----------
    await A.locator('#btMomento').click(); await w(400);
    ok(await A.locator('dialog[open] table.momento').count() === 1, 'o momento mostra uma tabela, uma coluna para cada um');
    await A.locator('#mo-a').selectOption('pc_dain'); await w(150); await A.locator('#mo-b').selectOption('pc_lia'); await w(150);
    await A.locator('#mo-da').fill('10'); await A.locator('#mo-da').press('Tab'); await w(150);
    await A.locator('#mo-ha').fill('2'); await A.locator('#mo-ha').press('Tab'); await w(150);
    await A.locator('#mo-sa').fill('-5'); await A.locator('#mo-sa').press('Tab'); await w(150);
    await A.locator('#mo-cb').fill('8'); await A.locator('#mo-cb').press('Tab'); await w(150);
    await A.locator('#mo-ea').selectOption('alegre'); await w(150);
    await A.locator('#mo-txt').fill('Conversaram até tarde.'); await w(150);
    const prevM = (await A.locator('dialog[open]').innerText()).replace(/\s+/g, ' ');
    ok(/20 → \+30/.test(prevM) && /— → ♥ 2/.test(prevM) && /60 → 55/.test(prevM) && /70 → 78/.test(prevM), 'a prévia mostra o que muda em cada um: ' + prevM.slice(0, 300));
    await foto(M, 'p3-momento');
    await A.locator('#mo-ok').click(); await w(600);
    ok(await ate(async () => { const d = await linha(M, 'pc_dain'), l = await linha(M, 'pc_lia'); return d.estado.rels.r1.v === 30 && d.estado.rels.r1.rom === 2 && d.estado.san === 55 && d.estado.emo === 'alegre' && l.estado.rels.r2.v === -5 && l.estado.conf === 78 && await parado(M); }),
      'registrado: o Dain sente +30 e 2 corações pela Lia, Sanidade 55, alegre; a Lia passa a −5 e Conforto 78 — ' + j([(await linha(M, 'pc_dain')).estado, (await linha(M, 'pc_lia')).estado]));
    const dia = (await doc(M)).diario[0].texto;
    ok(/Momento entre Dain e Lia: Conversaram até tarde\./.test(dia) && /♥ Dain → Lia \+2/.test(dia) && /Sanidade de Dain −5/.test(dia) && /Dain: alegre/.test(dia) && /Conforto de Lia \+8/.test(dia), 'o diário conta tudo: ' + dia);
    ok(await ate(async () => (await doc(M)).roda.find(r => r.id === 'pc_dain').emo === 'alegre'), 'a aura nova vai para a roda (quem não vê a ficha a vê por ela)');
    await A.locator('#btDesfazer').click(); await w(500);
    ok(await ate(async () => { const d = await linha(M, 'pc_dain'), l = await linha(M, 'pc_lia'); return d.estado.rels.r1.v === 20 && d.estado.rels.r1.rom == null && d.estado.san === 60 && d.estado.emo === 'calmo' && l.estado.conf === 70 && l.estado.rels.r2.v === -10; }), 'o desfazer volta os dois como estavam (o Dain, calmo de novo)');

    // ---------- as linhas de relação, para o jogador: só o que está aberto ----------
    await B.evaluate(() => __acamp.selecionar('pc_dain')); await w(400, J);
    ok(await ate(async () => (await B.locator('#linhas g[data-para="pc_lia"] .meia.pos').count()) === 1 && (await B.locator('#linhas g[data-para="pc_lia"] .meia.neg').count()) === 1), 'o Dalmo escolhe o Dain: a linha até a Lia, verde do lado dele (+20) e vermelha do dela (−10)');
    await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_lia'); P.gravar('pc_lia', { estado: Object.assign({}, l.estado, { rels: { r2: Object.assign({}, l.estado.rels.r2, { oc: true, v: 0 }) } }) }); });
    ok(await ate(async () => (await B.locator('#linhas g[data-para="pc_lia"] .meia').count()) === 1 && (await B.locator('#linhas g[data-para="pc_lia"] .meia.neg').count()) === 0, 30000), 'o valor da Lia escondido pelo mestre: a metade dela some para o Dalmo');
    await A.evaluate(() => __acamp.selecionar('pc_dain')); await w(400);
    ok(await ate(async () => (await A.locator('#linhas g[data-para="pc_lia"] .meia').count()) === 2), 'o mestre, escolhendo o Dain, continua vendo as duas metades (também a da Lia, escondida dos jogadores)');

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada && nomeMesa) { try { await M.keyboard.press('Escape'); await M.evaluate(async nome => { const a = TC.mesas.atual; if (a && a.nome === nome) await TC.mesas.apagar(); }, nomeMesa); } catch (e) { console.log('(a mesa de teste não pôde ser apagada: ' + String(e.message).split('\n')[0] + ')'); } }
  }
  const fora = t.errs.filter(e => !/status of (400|401|403|404|409)|WebSocket|realtime|ERR_|Failed to load resource|Só o mestre muda isso|Multiple GoTrueClient/i.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
