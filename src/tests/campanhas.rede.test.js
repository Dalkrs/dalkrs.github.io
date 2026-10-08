// As campanhas, no banco de verdade (projeto real). Três contas: o mestre e dois jogadores.
//   · só o mestre da mesa organiza: cria, renomeia, ordena, encerra, diz quem participa, apaga a que está vazia;
//   · a PRIMEIRA campanha pode receber o que a mesa já tinha, de uma vez (fichas, conversa, acampamento, missões do
//     grupo, cenas, mapas, jogadores) — e as linhas da conversa não contam como "mexidas";
//   · o jogador só recebe o que é das campanhas de que participa, e o que é do mundo (sem campanha);
//   · numa campanha encerrada, o jogador só consulta;
//   · quem mestra (o mestre, o auxiliar mestrando) vê todas; o auxiliar não organiza.
// A parte da tela (o seletor, a janela das campanhas, cada sistema) está mais abaixo, no mesmo arquivo.
const { start, checker, espiarBanco } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  const SO = process.env.SO || '';                      // SO=tela: só a parte da tela · SO=banco: só a do banco
  const abre = async name => { const d = await t.device({ name }); await d.page.goto(t.base + 'src/tests/vazio.html', { waitUntil: 'load' }); return d.page; };
  const [M, A, J] = [await abre('mestre'), await abre('jogador A'), await abre('jogador J')];
  const em = await entrar(M, c.mestre, c.senha, 'Bruno'), ea = await entrar(A, c.jog1, c.senha, 'Dalmo'), ej = await entrar(J, c.jog2, c.senha, 'Visitante');
  ok(em.uid && ea.uid && ej.uid, 'as três contas entram');
  if (SO !== 'tela') {
  const nomeMesa = 'Campanhas E2E ' + Date.now().toString(36);
  const cm = await M.evaluate(async nome => {
    const r = await sb.rpc('criar_mesa', { p_nome: nome, p_meu_nome: 'Bruno' });
    if (r.error) return { erro: r.error.message };
    const cv = await sb.from('mesa_convites').select('codigo').eq('mesa_id', r.data.id).single();
    return { mesa: r.data.id, codigo: cv.data && cv.data.codigo };
  }, nomeMesa);
  ok(cm.mesa && cm.codigo, 'o mestre cria a mesa — ' + (cm.erro || cm.mesa));
  const mesa = cm.mesa, codigo = cm.codigo;
  try {
    for (const [p, nome] of [[A, 'Dalmo'], [J, 'Visitante']]) {
      const r = await p.evaluate(async ([codigo, nome]) => { const x = await sb.rpc('entrar_na_mesa', { p_codigo: codigo, p_meu_nome: nome }); return x.error ? x.error.message : null; }, [codigo, nome]);
      ok(!r, nome + ' entra na mesa pelo código' + (r ? ' — ' + r : ''));
    }
    // ---------- a mesa de antes das campanhas ----------
    const prep = await M.evaluate(async ([mesa, a, j]) => {
      const erros = [];
      const p = await sb.from('personagens').insert([
        { mesa_id: mesa, id: 'pc_a', nome: 'Selene', dono_id: a, vis: 'mesa', ficha: { nome: 'Selene', grupo: 'Heróis' }, estado: {} },
        { mesa_id: mesa, id: 'pc_j', nome: 'Dain', dono_id: j, vis: 'mesa', ficha: { nome: 'Dain', grupo: 'Heróis' }, estado: {} },
        { mesa_id: mesa, id: 'npc_pub', nome: 'Guarda', dono_id: null, vis: 'mesa', ficha: { nome: 'Guarda', grupo: '' }, estado: {} },
        { mesa_id: mesa, id: 'npc_esc', nome: 'Vilão', dono_id: null, vis: 'mestre', ficha: { nome: 'Vilão', grupo: '' }, estado: {} },
      ]);
      if (p.error) erros.push('fichas: ' + p.error.message);
      const doc = (id, vis, dados) => ({ mesa_id: mesa, id, vis, dados });
      const d = await sb.from('documentos').insert([
        doc('acampamento', 'mesa', { nome: 'Acampamento velho', provisoes: [{ id: 'p1', nome: 'Ração', qtd: 7 }] }),
        doc('fichas:missoes', 'mesa', { v: { m1: { t: 'Achar o farol', e: 'ativa' } } }),
        doc('fichas:grupos', 'mesa', { v: ['Heróis'] }),
        doc('fichas:segredos', 'mestre', { v: { mis: { g: { s1: { t: 'Trair o barão', e: 'ativa' } }, p: { pc_a: { s2: { t: 'Carta', e: 'ativa' } } } }, rel: { npc_pub: { r1: { v: 30 } } } } }),
        doc('fichas:cfg', 'mesa', { v: { base: 1 } }),
        doc('cenas:indice', 'mestre', { v: 1, ordem: ['c1'], atual: 'c1', noAr: 'c1', tx: 'ap1', prefs: {} }),
        doc('cena:c1:m', 'mestre', { v: 1, name: 'Guarita' }), doc('cena:c1:v', 'mestre', { tokens: [] }),
        doc('cena:pub:m', 'mesa', { id: 'c1', name: 'Guarita' }), doc('cena:pub:v', 'mesa', { id: 'c1', tokens: [] }),
        doc('mundo:mapa:x', 'mestre', { v: 1, id: 'x', nome: 'Mundo' }), doc('mundo:pub:x', 'mesa', { v: 1, id: 'x', nome: 'Mundo' }), doc('mundo:indice', 'mesa', { mapas: [{ id: 'x', nome: 'Mundo' }], mostrado: 'x' }),
        doc('arvore:pacote', 'mesa', { arvores: [] }),
      ]);
      if (d.error) erros.push('documentos: ' + d.error.message);
      const r = await sb.from('registro').insert([
        { mesa_id: mesa, id: 'm_1', tipo: 'fala', secreta: false, dados: { texto: 'boa noite' } },
        { mesa_id: mesa, id: 'r_sec', tipo: 'rolagem', secreta: true, dados: { k: 'tabela', titulo: 'segredo', total: 3 } },
      ]);
      if (r.error) erros.push('registro: ' + r.error.message);
      return erros;
    }, [mesa, ea.uid, ej.uid]);
    ok(prep.length === 0, 'o mestre monta a mesa: fichas, documentos de cada sistema e conversa' + (prep.length ? ' — ' + prep.join(' · ') : ''));
    for (const [p, quem] of [[A, 'Dalmo'], [J, 'Visitante']]) {
      const r = await p.evaluate(async ([mesa, quem]) => { const x = await sb.from('registro').insert({ mesa_id: mesa, id: 'm_' + quem, tipo: 'fala', secreta: false, dados: { texto: 'oi, sou ' + quem } }); return x.error ? x.error.message : null; }, [mesa, quem]);
      ok(!r, quem + ' fala na mesa ao vivo (ainda sem campanha)' + (r ? ' — ' + r : ''));
    }
    // o que cada um lê agora
    const ver = p => p.evaluate(async mesa => {
      const col = async (tb, cols) => { const r = await sb.from(tb).select(cols).eq('mesa_id', mesa); return r.error ? 'erro: ' + r.error.message : r.data; };
      const o = {};
      const camps = await col('campanhas', 'id,nome,ordem,encerrada'); o.campanhas = Array.isArray(camps) ? camps.sort((x, y) => x.ordem - y.ordem).map(x => x.nome + (x.encerrada ? ' (encerrada)' : '')).join(' | ') : camps;
      const mem = await col('campanha_membros', 'campanha_id,usuario_id'); o.participacoes = Array.isArray(mem) ? mem.length : mem;
      const fs = await col('personagens', 'id,campanha'); o.fichas = Array.isArray(fs) ? fs.map(x => x.id).sort().join(',') : fs;
      const ds = await col('documentos', 'id,apagado'); o.docs = Array.isArray(ds) ? ds.filter(x => !x.apagado).map(x => x.id).sort() : ds;
      const rs = await col('registro', 'id,campanha'); o.conversa = Array.isArray(rs) ? rs.map(x => x.id).sort().join(',') : rs;
      return o;
    }, mesa);
    let vm = await ver(M), va = await ver(A), vj = await ver(J);
    ok(vm.campanhas === '' && va.campanhas === '' && vm.participacoes === 0, 'a mesa começa sem campanha nenhuma');
    ok(va.fichas === 'npc_pub,pc_a,pc_j' && va.conversa === 'm_1,m_Dalmo,m_Visitante' && va.docs.includes('acampamento') && va.docs.includes('cena:pub:m') && !va.docs.includes('fichas:segredos'), 'sem campanhas, o jogador vê o que via: ' + JSON.stringify(va));

    // ---------- só o mestre organiza ----------
    const rpc = (p, nome, args) => p.evaluate(async ([nome, args]) => { const r = await sb.rpc(nome, args); return r.error ? { erro: r.error.message } : { ok: r.data }; }, [nome, args]);
    let r = await rpc(A, 'campanha_criar', { p_mesa: mesa, p_nome: 'Do jogador' });
    ok(/Só o mestre da mesa organiza as campanhas/.test(r.erro || ''), 'o jogador não cria campanha: "' + r.erro + '"');
    const naMao = await A.evaluate(async mesa => { const i = await sb.from('campanhas').insert({ mesa_id: mesa, id: 'cfalsa', nome: 'Na mão' }); const m = await sb.from('campanha_membros').insert({ mesa_id: mesa, campanha_id: 'cfalsa', usuario_id: (await sb.auth.getUser()).data.user.id }); return [i.error ? 'recusado' : 'ACEITO', m.error ? 'recusado' : 'ACEITO']; }, mesa);
    ok(naMao.join() === 'recusado,recusado', 'nem escreve direto nas tabelas das campanhas: ' + naMao.join());
    r = await rpc(M, 'campanha_criar', { p_mesa: mesa, p_nome: '   ' });
    ok(/Dê um nome à campanha/.test(r.erro || ''), 'campanha sem nome: "' + r.erro + '"');

    // ---------- a primeira campanha recebe o que a mesa já tinha ----------
    const antes = await M.evaluate(async mesa => (await sb.from('registro').select('id,rev,atualizado_em,campanha').eq('mesa_id', mesa).order('id')).data, mesa);
    r = await rpc(M, 'campanha_criar', { p_mesa: mesa, p_nome: '  Geração do Dain  ', p_adotar: true });
    const C1 = r.ok && r.ok.id;
    ok(r.ok && /^c[0-9a-f]{9}$/.test(C1) && r.ok.nome === 'Geração do Dain' && r.ok.encerrada === false, 'o mestre cria a primeira campanha, levando o que a mesa tinha: ' + JSON.stringify(r.ok || r.erro));
    const depois = await M.evaluate(async mesa => {
      const fs = (await sb.from('personagens').select('id,campanha').eq('mesa_id', mesa).order('id')).data;
      const rs = (await sb.from('registro').select('id,rev,atualizado_em,campanha').eq('mesa_id', mesa).order('id')).data;
      const ds = (await sb.from('documentos').select('id,apagado,campanhas,dados,vis').eq('mesa_id', mesa).order('id')).data;
      const ms = (await sb.from('campanha_membros').select('campanha_id,usuario_id').eq('mesa_id', mesa)).data;
      return { fs, rs, ds, ms };
    }, mesa);
    ok(depois.fs.length === 4 && depois.fs.every(x => x.campanha === C1), 'as quatro fichas passam para a campanha (inclusive a escondida)');
    ok(depois.rs.length === antes.length && depois.rs.every(x => x.campanha === C1), 'a conversa inteira passa para a campanha (a secreta do mestre também)');
    ok(depois.rs.every((x, i) => x.rev === antes[i].rev && x.atualizado_em === antes[i].atualizado_em), 'e nenhuma linha da conversa conta como "mexida": revisão e hora ficam as de antes');
    const D = id => depois.ds.find(x => x.id === id);
    const umPor = base => { const n = D(base + '@' + C1), v = D(base); return !!n && !n.apagado && JSON.stringify(n.campanhas) === JSON.stringify([C1]) && !!v && v.apagado === true && JSON.stringify(n.dados) === JSON.stringify(v.dados) && n.vis === 'mesa'; };
    ok(umPor('acampamento') && umPor('fichas:missoes') && umPor('fichas:grupos'), 'o acampamento, as missões do grupo e a ordem dos grupos viram os da campanha (nome@campanha), e os antigos saem: ' + JSON.stringify(depois.ds.filter(x => /@/.test(x.id)).map(x => x.id)));
    const seg = D('fichas:segredos').dados.v;
    ok(!seg.mis.g && seg.mis.gc && JSON.stringify(seg.mis.gc[C1]) === '{"s1":{"e":"ativa","t":"Trair o barão"}}' && seg.mis.p.pc_a.s2.t === 'Carta' && seg.rel.npc_pub.r1.v === 30, 'as missões do grupo que o mestre esconde também passam (o resto dos segredos fica como estava): ' + JSON.stringify(seg.mis));
    const deCamp = ids => ids.every(id => JSON.stringify(D(id).campanhas) === JSON.stringify([C1])), doMundo = ids => ids.every(id => JSON.stringify(D(id).campanhas) === '[]');
    ok(deCamp(['cena:c1:m', 'cena:c1:v', 'cena:pub:m', 'cena:pub:v', 'mundo:mapa:x', 'mundo:pub:x']), 'as cenas (e a que está no ar) e os mapas passam para a campanha');
    ok(doMundo(['cenas:indice', 'mundo:indice', 'arvore:pacote', 'fichas:cfg', 'fichas:segredos']), 'o que é da mesa inteira (índices, árvores, tabelas base, segredos) continua sem campanha');
    ok(JSON.stringify(D('mundo:indice').dados) === JSON.stringify({ mapas: [], mostrado: 'x' }), 'o índice dos mapas (que a mesa inteira lê) deixa de ter o nome do mapa que virou da campanha — e continua dizendo qual está sendo mostrado: ' + JSON.stringify(D('mundo:indice').dados));
    ok(depois.ms.length === 2 && depois.ms.every(x => x.campanha_id === C1) && depois.ms.map(x => x.usuario_id).sort().join() === [ea.uid, ej.uid].sort().join(), 'os dois jogadores passam a participar dela; o mestre não precisa');
    va = await ver(A);
    ok(va.campanhas === 'Geração do Dain' && va.participacoes === 2 && va.fichas === 'npc_pub,pc_a,pc_j' && va.conversa === 'm_1,m_Dalmo,m_Visitante' && va.docs.includes('acampamento@' + C1) && !va.docs.includes('acampamento'),
      'para o jogador nada some: continua vendo as fichas, a conversa e o acampamento, agora da campanha — ' + JSON.stringify(va));
    const quantas = p => p.evaluate(async mesa => { const r = await sb.from('mesas').select('campanhas').eq('id', mesa).maybeSingle(); return r.error ? r.error.message : r.data && r.data.campanhas; }, mesa);
    ok(await quantas(A) === 1, 'a mesa diz a todos quantas campanhas tem (quem não participa de nenhuma fica sabendo que elas existem): ' + await quantas(A));
    const mexerNaConta = await M.evaluate(async mesa => { const r = await sb.from('mesas').update({ campanhas: 7 }).eq('id', mesa).select('campanhas'); return r.error ? 'recusado' : JSON.stringify(r.data); }, mesa);
    ok(mexerNaConta === 'recusado', 'e essa conta ninguém escreve à mão, nem o mestre: ' + mexerNaConta);

    // ---------- uma segunda campanha: nasce vazia ----------
    r = await rpc(M, 'campanha_criar', { p_mesa: mesa, p_nome: 'Geração 2', p_adotar: true });
    ok(/Só a primeira campanha da mesa recebe/.test(r.erro || ''), 'só a primeira recebe o que a mesa tinha: "' + r.erro + '"');
    r = await rpc(M, 'campanha_criar', { p_mesa: mesa, p_nome: 'Geração 2' });
    const C2 = r.ok && r.ok.id;
    ok(!!C2 && C2 !== C1 && r.ok.ordem > 1, 'a segunda campanha nasce depois da primeira, vazia: ' + JSON.stringify(r.ok || r.erro));
    ok(await quantas(J) === 2, 'a conta de campanhas da mesa acompanha: ' + await quantas(J));
    r = await rpc(M, 'campanha_desfazer', { p_mesa: mesa, p_id: C1 });
    ok(/enquanto a mesa tem uma só/.test(r.erro || ''), 'com duas campanhas, não dá para "desfazer as campanhas" (mostraria a uns o que é dos outros): "' + r.erro + '"');
    r = await rpc(A, 'campanha_desfazer', { p_mesa: mesa, p_id: C1 });
    ok(/Só o mestre da mesa organiza/.test(r.erro || ''), 'e o jogador nunca desfaz: "' + r.erro + '"');
    vj = await ver(J);
    ok(vj.campanhas === 'Geração do Dain', 'o jogador só vê a campanha de que participa: ' + vj.campanhas);
    vm = await ver(M);
    ok(vm.campanhas === 'Geração do Dain | Geração 2', 'o mestre vê as duas, na ordem: ' + vm.campanhas);

    // ---------- quem participa de quê; o que cada um recebe ----------
    r = await rpc(A, 'campanha_participa', { p_mesa: mesa, p_id: C2, p_usuario: ea.uid, p_sim: true });
    ok(/Só o mestre da mesa organiza/.test(r.erro || ''), 'o jogador não se põe numa campanha: "' + r.erro + '"');
    r = await rpc(M, 'campanha_participa', { p_mesa: mesa, p_id: C2, p_usuario: em.uid, p_sim: true });
    ok(/já vê todas as campanhas/.test(r.erro || ''), 'o mestre não entra em campanha: "' + r.erro + '"');
    r = await rpc(M, 'campanha_participa', { p_mesa: mesa, p_id: C2, p_usuario: '00000000-0000-4000-8000-000000000000', p_sim: true });
    ok(/não participa desta mesa/.test(r.erro || ''), 'nem quem não está na mesa: "' + r.erro + '"');
    // o Visitante sai da primeira e entra na segunda; a ficha dele vai junto; há uma ficha e um documento do mundo
    await rpc(M, 'campanha_participa', { p_mesa: mesa, p_id: C1, p_usuario: ej.uid, p_sim: false });
    await rpc(M, 'campanha_participa', { p_mesa: mesa, p_id: C2, p_usuario: ej.uid, p_sim: true });
    const mover = await M.evaluate(async ([mesa, C2]) => {
      const e = [];
      const a = await sb.from('personagens').update({ campanha: C2 }).eq('mesa_id', mesa).eq('id', 'pc_j').select('id'); if (a.error || !a.data.length) e.push('mover pc_j: ' + (a.error ? a.error.message : 'nada'));
      const b = await sb.from('personagens').insert({ mesa_id: mesa, id: 'npc_mundo', nome: 'Mercador', vis: 'mesa', ficha: { nome: 'Mercador' }, estado: {} }); if (b.error) e.push('npc do mundo: ' + b.error.message);
      const c = await sb.from('personagens').insert({ mesa_id: mesa, id: 'npc_g2', nome: 'Lobo', vis: 'mesa', campanha: C2, ficha: { nome: 'Lobo' }, estado: {} }); if (c.error) e.push('npc da G2: ' + c.error.message);
      const d = await sb.from('documentos').insert([
        { mesa_id: mesa, id: 'acampamento@' + C2, vis: 'mesa', dados: { nome: 'Acampamento novo' } },                       // (sem dizer a campanha: o nome diz)
        { mesa_id: mesa, id: 'mundo:pub:dois', vis: 'mesa', dados: { nome: 'Mapa das duas' }, campanhas: [C2, 'outra'] },
        { mesa_id: mesa, id: 'mundo:pub:mundo', vis: 'mesa', dados: { nome: 'Mapa do mundo' } },
      ]); if (d.error) e.push('documentos: ' + d.error.message);
      const f = await sb.from('registro').insert({ mesa_id: mesa, id: 'm_g2', tipo: 'fala', secreta: false, campanha: C2, dados: { texto: 'começa a geração 2' } }); if (f.error) e.push('conversa da G2: ' + f.error.message);
      const g = await sb.from('registro').insert({ mesa_id: mesa, id: 'm_mundo', tipo: 'fala', secreta: false, dados: { texto: 'aviso geral' } }); if (g.error) e.push('conversa do mundo: ' + g.error.message);
      const forcado = ((await sb.from('documentos').select('campanhas').eq('mesa_id', mesa).eq('id', 'acampamento@' + C2).maybeSingle()).data || {}).campanhas;
      return { e, forcado };
    }, [mesa, C2]);
    ok(mover.e.length === 0, 'o mestre passa a ficha do Visitante para a segunda campanha e cria coisas dela e do mundo' + (mover.e.length ? ' — ' + mover.e.join(' · ') : ''));
    ok(JSON.stringify(mover.forcado) === JSON.stringify([C2]), 'o documento "nome@campanha" é sempre só daquela campanha, mesmo que quem o grava não diga: ' + JSON.stringify(mover.forcado));
    va = await ver(A); vj = await ver(J); vm = await ver(M);
    ok(va.campanhas === 'Geração do Dain' && va.fichas === 'npc_mundo,npc_pub,pc_a' && va.conversa === 'm_1,m_Dalmo,m_Visitante,m_mundo', 'quem está na primeira: as fichas e a conversa dela e as do mundo — não as da segunda: ' + JSON.stringify([va.fichas, va.conversa]));
    ok(va.docs.includes('acampamento@' + C1) && !va.docs.includes('acampamento@' + C2) && va.docs.includes('cena:pub:m') && va.docs.includes('mundo:pub:x') && !va.docs.includes('mundo:pub:dois') && va.docs.includes('mundo:pub:mundo') && va.docs.includes('fichas:cfg'),
      'e os documentos dela e os do mundo: ' + JSON.stringify(va.docs));
    ok(vj.campanhas === 'Geração 2' && vj.fichas === 'npc_g2,npc_mundo,pc_j' && vj.conversa === 'm_g2,m_mundo', 'quem está na segunda: as fichas e a conversa dela e as do mundo — nem a própria fala antiga, que ficou na primeira: ' + JSON.stringify([vj.fichas, vj.conversa]));
    ok(vj.docs.includes('acampamento@' + C2) && !vj.docs.includes('acampamento@' + C1) && !vj.docs.includes('cena:pub:m') && !vj.docs.includes('mundo:pub:x') && vj.docs.includes('mundo:pub:dois') && vj.docs.includes('mundo:pub:mundo') && !vj.docs.includes('fichas:missoes@' + C1),
      'e os documentos dela (o mapa que é de duas campanhas também) e os do mundo: ' + JSON.stringify(vj.docs));
    ok(vj.participacoes === 1 && va.participacoes === 1 && vm.participacoes === 2, 'cada jogador vê quem participa das campanhas dele; o mestre, de todas');
    ok(vm.fichas === 'npc_esc,npc_g2,npc_mundo,npc_pub,pc_a,pc_j' && vm.conversa === 'm_1,m_Dalmo,m_Visitante,m_g2,m_mundo,r_sec', 'o mestre vê tudo, de todas: ' + JSON.stringify([vm.fichas, vm.conversa]));

    // ---------- o que o jogador pode e não pode ----------
    const tenta = (p, o) => p.evaluate(async ([mesa, C1, C2, o]) => {
      const uid = (await sb.auth.getUser()).data.user.id, n = o.n, out = {};
      const ins = async (tb, linha) => { const r = await sb.from(tb).insert(Object.assign({ mesa_id: mesa }, linha)); return r.error ? 'recusado' : 'ok'; };
      const upd = async (tb, id, campos) => { const r = await sb.from(tb).update(campos).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? 'recusado: ' + r.error.message : r.data.length ? 'ok' : 'nada'; };
      out.falarNaMinha = await ins('registro', { id: 'f1_' + n, tipo: 'fala', secreta: false, campanha: o.minha, dados: { texto: 'na minha' } });
      out.falarNaOutra = await ins('registro', { id: 'f2_' + n, tipo: 'fala', secreta: false, campanha: o.outra, dados: { texto: 'na outra' } });
      out.falarNoMundo = await ins('registro', { id: 'f3_' + n, tipo: 'fala', secreta: false, dados: { texto: 'no mundo' } });
      out.ondeFicou = ((await sb.from('registro').select('campanha').eq('mesa_id', mesa).eq('id', 'f3_' + n).maybeSingle()).data || { campanha: 'não gravou' }).campanha;
      out.fichaNaMinha = await ins('personagens', { id: 'n1_' + n, nome: 'Nova', dono_id: uid, vis: 'mestre', campanha: o.minha, ficha: {} });
      out.fichaNaOutra = await ins('personagens', { id: 'n2_' + n, nome: 'Nova', dono_id: uid, vis: 'mestre', campanha: o.outra, ficha: {} });
      out.fichaNoMundo = await ins('personagens', { id: 'n3_' + n, nome: 'Nova', dono_id: uid, vis: 'mestre', ficha: {} });
      out.mudarDeCampanha = await upd('personagens', o.ficha, { campanha: o.outra });
      out.irParaOMundo = await upd('personagens', o.ficha, { campanha: null });
      out.mexerNaMinha = await upd('personagens', o.ficha, { ficha: { nome: 'mexida ' + n } });
      const ped = await sb.from('documentos').upsert({ mesa_id: mesa, id: 'cena:pedido:' + uid, dono_id: uid, vis: 'mestre', dados: { cena: null, lote: [] }, campanhas: [o.outra] }).select('campanhas');
      out.pedido = ped.error ? 'recusado: ' + ped.error.message : JSON.stringify(ped.data[0].campanhas);
      const ped2 = await sb.from('documentos').update({ campanhas: [o.outra] }).eq('mesa_id', mesa).eq('id', 'cena:pedido:' + uid).select('campanhas');
      out.pedidoDepois = ped2.error ? 'recusado: ' + ped2.error.message : JSON.stringify((ped2.data[0] || {}).campanhas);
      out.moverLinha = await upd('registro', 'f1_' + n, { campanha: o.outra });
      return out;
    }, [mesa, C1, C2, o]);
    let ta = await tenta(A, { n: 'a1', minha: C1, outra: C2, ficha: 'pc_a' });
    ok(ta.falarNaMinha === 'ok' && ta.falarNaOutra === 'recusado' && ta.falarNoMundo === 'ok', 'o jogador fala na campanha dele; na dos outros, não: ' + JSON.stringify([ta.falarNaMinha, ta.falarNaOutra, ta.falarNoMundo]));
    ok(ta.ondeFicou === C1, 'e a fala que ele manda sem dizer a campanha (um aparelho ainda com a versão anterior do site) fica na campanha dele, não no mundo: ' + ta.ondeFicou);
    ok(ta.fichaNaMinha === 'ok' && ta.fichaNaOutra === 'recusado' && ta.fichaNoMundo === 'ok', 'cria ficha dele na campanha dele ou no mundo; na dos outros, não: ' + JSON.stringify([ta.fichaNaMinha, ta.fichaNaOutra, ta.fichaNoMundo]));
    ok(/Só o mestre troca/.test(ta.mudarDeCampanha) && /Só o mestre troca/.test(ta.irParaOMundo) && ta.mexerNaMinha === 'ok', 'mexe na ficha dele, mas não a muda de campanha: ' + JSON.stringify([ta.mudarDeCampanha, ta.irParaOMundo, ta.mexerNaMinha]));
    ok(ta.pedido === '[]' || /recusado/.test(ta.pedido), 'o pedido dele para a cena não ganha campanha por conta dele: ' + ta.pedido);
    ok(/Só o mestre troca/.test(ta.pedidoDepois), 'nem depois de criado: ' + ta.pedidoDepois);
    ok(/recusado/.test(ta.moverLinha), 'e uma linha da conversa não muda de campanha: ' + ta.moverLinha);

    // ---------- campanha encerrada: o jogador só consulta ----------
    r = await rpc(A, 'campanha_mudar', { p_mesa: mesa, p_id: C1, p_encerrada: true });
    ok(/Só o mestre da mesa organiza/.test(r.erro || ''), 'o jogador não encerra campanha: "' + r.erro + '"');
    r = await rpc(M, 'campanha_mudar', { p_mesa: mesa, p_id: C1, p_encerrada: true });
    ok(r.ok && r.ok.encerrada === true && r.ok.nome === 'Geração do Dain', 'o mestre encerra a primeira campanha: ' + JSON.stringify(r.ok || r.erro));
    ta = await tenta(A, { n: 'a2', minha: C1, outra: C2, ficha: 'pc_a' });
    ok(ta.falarNaMinha === 'recusado' && ta.fichaNaMinha === 'recusado' && ta.mexerNaMinha === 'nada', 'encerrada: o jogador não fala, não cria ficha e não mexe na dele ali — ' + JSON.stringify([ta.falarNaMinha, ta.fichaNaMinha, ta.mexerNaMinha]));
    ok(ta.falarNoMundo === 'recusado' && ta.ondeFicou === 'não gravou', 'nem pela fala sem campanha (que seria dela): ' + JSON.stringify([ta.falarNoMundo, ta.ondeFicou]));
    va = await ver(A);
    ok(va.campanhas === 'Geração do Dain (encerrada)' && va.fichas.includes('pc_a') && va.conversa.includes('m_1'), 'mas continua lendo tudo dela: ' + JSON.stringify([va.campanhas, va.fichas]));
    // encerrada é para todos: o mestre também só consulta a conversa, as fichas, o acampamento e as missões dela
    const mestreNaEncerrada = await M.evaluate(async ([mesa, C1, C2]) => {
      const n = x => (x.error ? 'recusado' : (x.data || []).length);
      const fala = await sb.from('registro').insert({ mesa_id: mesa, id: 'm_enc', tipo: 'fala', secreta: false, campanha: C1, dados: { texto: 'nota do mestre' } });
      const ficha = await sb.from('personagens').update({ nome: 'Guarda velho' }).eq('mesa_id', mesa).eq('id', 'npc_pub').select('id');
      const nova = await sb.from('personagens').insert({ mesa_id: mesa, id: 'npc_enc', nome: 'Novo', vis: 'mesa', campanha: C1, ficha: {}, estado: {} });
      const tirar = await sb.from('personagens').update({ campanha: null }).eq('mesa_id', mesa).eq('id', 'npc_pub').select('id');
      const por = await sb.from('personagens').update({ campanha: C1 }).eq('mesa_id', mesa).eq('id', 'npc_mundo').select('id');
      const acamp = await sb.from('documentos').update({ dados: { nome: 'mexido' } }).eq('mesa_id', mesa).eq('id', 'acampamento@' + C1).select('id');
      const missoes = await sb.from('documentos').upsert({ mesa_id: mesa, id: 'fichas:missoes@' + C1, vis: 'mesa', dados: { v: {} } }).select('id');
      // (um documento "dela" que ainda não existia: também não nasce; na campanha aberta, nasce)
      const novoDoc = await sb.from('documentos').insert({ mesa_id: mesa, id: 'acampamento:nota@' + C1, vis: 'mesa', dados: { v: 1 } });
      const novoDocAberta = await sb.from('documentos').insert({ mesa_id: mesa, id: 'acampamento:nota@' + C2, vis: 'mesa', dados: { v: 1 } });
      const linha = await sb.from('registro').update({ apagado: true }).eq('mesa_id', mesa).eq('id', 'm_1').select('id');
      const cena = await sb.from('documentos').update({ dados: { v: 1, name: 'Guarita arrumada' } }).eq('mesa_id', mesa).eq('id', 'cena:c1:m').select('id');
      const mapa = await sb.from('documentos').update({ dados: { v: 1, id: 'x', nome: 'Mundo arrumado' } }).eq('mesa_id', mesa).eq('id', 'mundo:mapa:x').select('id');
      const mundo = await sb.from('personagens').update({ nome: 'Mercador velho' }).eq('mesa_id', mesa).eq('id', 'npc_mundo').select('id');
      return { fala: fala.error ? 'recusado' : 'ok', ficha: n(ficha), nova: nova.error ? 'recusado' : 'ok', tirar: n(tirar), por: n(por), acamp: n(acamp), missoes: n(missoes), linha: n(linha), cena: n(cena), mapa: n(mapa), mundo: n(mundo),
        novoDoc: novoDoc.error ? 'recusado' : 'ok', novoDocAberta: novoDocAberta.error ? 'recusado: ' + novoDocAberta.error.message : 'ok' };
    }, [mesa, C1, C2]);
    ok(mestreNaEncerrada.fala === 'recusado' && mestreNaEncerrada.linha === 0, 'encerrada, nem o mestre escreve nem apaga na conversa dela: ' + JSON.stringify(mestreNaEncerrada));
    ok(mestreNaEncerrada.ficha === 0 && mestreNaEncerrada.nova === 'recusado' && mestreNaEncerrada.tirar === 0 && mestreNaEncerrada.por === 'recusado', 'nem mexe nas fichas dela, cria ficha nela, tira ficha dela ou põe ficha nela');
    ok(mestreNaEncerrada.acamp === 0 && mestreNaEncerrada.missoes === 'recusado', 'nem mexe no acampamento e nas missões do grupo dela');
    ok(mestreNaEncerrada.novoDoc === 'recusado' && mestreNaEncerrada.novoDocAberta === 'ok', 'nem cria um documento novo dela (na campanha aberta, cria): ' + JSON.stringify([mestreNaEncerrada.novoDoc, mestreNaEncerrada.novoDocAberta]));
    ok(mestreNaEncerrada.cena === 1 && mestreNaEncerrada.mapa === 1 && mestreNaEncerrada.mundo === 1, 'as cenas e os mapas dela continuam com o mestre (é o preparo dele), e o que é do mundo não tem nada com isso');
    // (o dano e a cura que o token leva para a ficha gravam por uma função própria, que confere por conta dela)
    r = await rpc(M, 'barras_do_token', { p_mesa: mesa, p_id: 'npc_pub', p_rec: { hp: 1 } });
    ok(/Esta campanha está encerrada: as fichas dela são só para consulta\./.test(r.erro || ''), 'nem leva dano ou cura do token para uma ficha dela: "' + r.erro + '"');
    r = await rpc(M, 'barras_do_token', { p_mesa: mesa, p_id: 'npc_mundo', p_rec: { hp: 1 } });
    ok(!r.erro, 'pelo token, a ficha do mundo continua recebendo: ' + JSON.stringify(r));
    r = await rpc(M, 'campanha_mudar', { p_mesa: mesa, p_id: C1, p_encerrada: false, p_nome: 'Geração do Dain X' });
    ok(r.ok && r.ok.encerrada === false && r.ok.nome === 'Geração do Dain X', 'reabrir e renomear de uma vez: ' + JSON.stringify(r.ok || r.erro));
    ta = await tenta(A, { n: 'a3', minha: C1, outra: C2, ficha: 'pc_a' });
    ok(ta.falarNaMinha === 'ok' && ta.mexerNaMinha === 'ok', 'reaberta, o jogador volta a jogar nela: ' + JSON.stringify([ta.falarNaMinha, ta.mexerNaMinha]));
    r = await rpc(M, 'campanha_mudar', { p_mesa: mesa, p_id: C1, p_nome: '   ' });
    ok(/^Dê um nome à campanha\.$/.test(r.erro || ''), 'renomear para um nome em branco: "' + r.erro + '"');
    r = await rpc(M, 'campanha_mudar', { p_mesa: mesa, p_id: 'cnaoexiste', p_nome: 'x' });
    ok(/não existe mais/.test(r.erro || ''), 'campanha que não existe: "' + r.erro + '"');

    // ---------- quem não entrou na conta nem chega às funções das campanhas ----------
    const semConta = await M.evaluate(async ([mesa, C1]) => {
      const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave, { auth: { persistSession: false, storageKey: 'anon-campanhas' } });
      const u = '00000000-0000-0000-0000-000000000000', out = {};
      for (const [f, args] of [['campanha_criar', { p_mesa: mesa, p_nome: 'x' }], ['campanha_mudar', { p_mesa: mesa, p_id: C1, p_nome: 'x' }], ['campanha_ordenar', { p_mesa: mesa, p_ids: [C1] }],
        ['campanha_participa', { p_mesa: mesa, p_id: C1, p_usuario: u, p_sim: true }], ['campanha_apagar', { p_mesa: mesa, p_id: C1 }], ['campanha_desfazer', { p_mesa: mesa, p_id: C1 }]]) {
        const r = await a.rpc(f, args); out[f] = r.error ? r.error.code : 'passou';
      }
      const t = await a.from('campanhas').select('id'), m2 = await a.from('campanha_membros').select('campanha_id');
      out.tabelas = [t.error ? 'erro' : t.data.length, m2.error ? 'erro' : m2.data.length];
      return out;
    }, [mesa, C1]);
    ok(['campanha_criar', 'campanha_mudar', 'campanha_ordenar', 'campanha_participa', 'campanha_apagar', 'campanha_desfazer'].every(f => semConta[f] === '42501') && semConta.tabelas.every(x => x === 'erro' || x === 0),
      'sem conta: as funções das campanhas nem chegam a rodar (sem permissão), e as tabelas não entregam nada — ' + JSON.stringify(semConta));

    // ---------- a ordem ----------
    r = await rpc(M, 'campanha_ordenar', { p_mesa: mesa, p_ids: [C2, C1] });
    vm = await ver(M);
    ok(r.ok === 2 && vm.campanhas === 'Geração 2 | Geração do Dain X', 'o mestre troca a ordem da lista: ' + vm.campanhas);
    r = await rpc(A, 'campanha_ordenar', { p_mesa: mesa, p_ids: [C1, C2] });
    ok(/Só o mestre da mesa organiza/.test(r.erro || ''), 'o jogador, não: "' + r.erro + '"');
    // (a ordem dita só em parte: as que faltam ficam depois das que foram ditas)
    r = await rpc(M, 'campanha_ordenar', { p_mesa: mesa, p_ids: [C1] });
    const ordens = await M.evaluate(async mesa => Object.fromEntries((await sb.from('campanhas').select('id,ordem').eq('mesa_id', mesa)).data.map(x => [x.id, x.ordem])), mesa);
    ok(r.ok === 1 && ordens[C1] < ordens[C2], 'dizendo só a primeira, as outras ficam depois dela: ' + JSON.stringify(ordens));
    await rpc(M, 'campanha_ordenar', { p_mesa: mesa, p_ids: [C2, C1] });

    const semDizer = (p, id) => p.evaluate(async ([mesa, id]) => { const r = await sb.from('registro').insert({ mesa_id: mesa, id, tipo: 'fala', secreta: false, dados: { texto: 'sem dizer a campanha' } }).select('campanha').maybeSingle(); return r.error ? 'recusado: ' + r.error.message : r.data ? r.data.campanha : 'sem leitura'; }, [mesa, id]);
    // ---------- o mestre auxiliar: vê todas enquanto mestra; não organiza ----------
    await rpc(M, 'definir_auxiliar', { p_mesa: mesa, p_usuario: ea.uid, p_auxiliar: true });
    ok(await semDizer(A, 'v_aux') === null, 'a fala sem campanha de quem está mestrando — o auxiliar, que participa de uma só — fica no mundo, como a do mestre');
    va = await ver(A);
    ok(va.campanhas === 'Geração 2 | Geração do Dain X' && va.participacoes === 2 && va.fichas.includes('npc_g2') && va.fichas.includes('npc_esc') && va.conversa.includes('m_g2') && va.docs.includes('acampamento@' + C2), 'o auxiliar, mestrando, vê todas as campanhas e o que é delas: ' + JSON.stringify([va.campanhas, va.fichas]));
    for (const [nome, args] of [['campanha_criar', { p_mesa: mesa, p_nome: 'Do auxiliar' }], ['campanha_mudar', { p_mesa: mesa, p_id: C2, p_nome: 'x' }], ['campanha_ordenar', { p_mesa: mesa, p_ids: [C1] }], ['campanha_participa', { p_mesa: mesa, p_id: C2, p_usuario: ea.uid, p_sim: true }], ['campanha_apagar', { p_mesa: mesa, p_id: C2 }], ['campanha_desfazer', { p_mesa: mesa, p_id: C2 }]]) {
      r = await rpc(A, nome, args);
      ok(/Só o mestre da mesa organiza/.test(r.erro || ''), 'o auxiliar não organiza campanhas (' + nome + '): "' + r.erro + '"');
    }
    /* …nem passa ficha, cena ou mapa de uma campanha para outra: isso é organizar as campanhas. Dentro delas, mestra:
       mexe nas fichas e nas cenas, cria ficha e cena na campanha, e regrava a projeção (que acompanha a cena no ar). */
    const aux = await A.evaluate(async ([mesa, C1, C2]) => {
      const u = async (tb, id, campos) => { const r = await sb.from(tb).update(campos).eq('mesa_id', mesa).eq('id', id).select('id'); return r.error ? r.error.message : r.data.length ? 'ok' : 'nada'; };
      const out = {};
      out.ficha = await u('personagens', 'npc_pub', { campanha: C2 });
      out.fichaParaOMundo = await u('personagens', 'npc_pub', { campanha: null });
      out.fichaDoMundo = await u('personagens', 'npc_mundo', { campanha: C1 });
      out.cena = await u('documentos', 'cena:c1:m', { campanhas: [C2] });
      out.mapa = await u('documentos', 'mundo:mapa:x', { campanhas: [C1, C2] });
      out.mapaParaOMundo = await u('documentos', 'mundo:mapa:x', { campanhas: [] });
      out.mexerNaFicha = await u('personagens', 'npc_pub', { estado: { nota: 'pelo auxiliar' } });
      out.mexerNaCena = await u('documentos', 'cena:c1:m', { dados: { v: 1, name: 'Guarita' } });
      const n = await sb.from('personagens').insert({ mesa_id: mesa, id: 'npc_aux', nome: 'Do auxiliar', vis: 'mestre', campanha: C2, ficha: {}, estado: {} }); out.criarFicha = n.error ? n.error.message : 'ok';
      const c = await sb.from('documentos').insert({ mesa_id: mesa, id: 'cena:aux:m', vis: 'mestre', dados: { v: 1, name: 'Do auxiliar' }, campanhas: [C2] }); out.criarCena = c.error ? c.error.message : 'ok';
      out.projecaoDaCena = await u('documentos', 'cena:pub:m', { campanhas: [C2] }); out.projecaoDaCenaDeVolta = await u('documentos', 'cena:pub:m', { campanhas: [C1] });
      out.projecaoDoMapa = await u('documentos', 'mundo:pub:x', { campanhas: [C1, C2] }); out.projecaoDoMapaDeVolta = await u('documentos', 'mundo:pub:x', { campanhas: [C1] });
      return out;
    }, [mesa, C1, C2]);
    const SO_O_MESTRE = /^Só o mestre da mesa passa fichas, cenas e mapas de uma campanha para outra\.$/;
    ok(['ficha', 'fichaParaOMundo', 'fichaDoMundo', 'cena', 'mapa', 'mapaParaOMundo'].every(k => SO_O_MESTRE.test(aux[k])), 'o auxiliar não passa ficha, cena nem mapa de uma campanha para outra — nem para o mundo, nem do mundo: ' + JSON.stringify([aux.ficha, aux.fichaDoMundo, aux.cena, aux.mapa]));
    ok(aux.mexerNaFicha === 'ok' && aux.mexerNaCena === 'ok' && aux.criarFicha === 'ok' && aux.criarCena === 'ok', 'dentro da campanha ele mestra: mexe nas fichas e nas cenas dela, e cria ficha e cena nela — ' + JSON.stringify([aux.mexerNaFicha, aux.mexerNaCena, aux.criarFicha, aux.criarCena]));
    ok(aux.projecaoDaCena === 'ok' && aux.projecaoDaCenaDeVolta === 'ok' && aux.projecaoDoMapa === 'ok' && aux.projecaoDoMapaDeVolta === 'ok', 'e a projeção — o que os jogadores recebem da cena no ar e do mapa —, que acompanha a campanha deles, ele regrava: ' + JSON.stringify([aux.projecaoDaCena, aux.projecaoDoMapa]));
    // (o mestre passa, como sempre; e apaga o que o auxiliar criou, para o resto do teste seguir como estava)
    const arruma = await M.evaluate(async ([mesa, C1, C2]) => {
      const e = [];
      const a = await sb.from('documentos').update({ campanhas: [C2] }).eq('mesa_id', mesa).eq('id', 'cena:aux:m').select('id'); if (a.error || !a.data.length) e.push('o mestre passar a cena: ' + (a.error ? a.error.message : 'nada'));
      for (const [tb, id] of [['personagens', 'npc_aux'], ['documentos', 'cena:aux:m']]) { const r = await sb.from(tb).update({ apagado: true }).eq('mesa_id', mesa).eq('id', id).select('id'); if (r.error || !r.data.length) e.push('apagar ' + id); }
      return e;
    }, [mesa, C1, C2]);
    ok(arruma.length === 0, '(o mestre apaga o que o auxiliar criou)' + (arruma.length ? ' — ' + arruma.join(' · ') : ''));
    await rpc(A, 'auxiliar_jogar', { p_mesa: mesa, p_jogando: true });
    va = await ver(A);
    ok(va.campanhas === 'Geração do Dain X' && !va.fichas.includes('npc_g2') && !va.fichas.includes('npc_esc') && !va.conversa.includes('m_g2'), 'jogando como jogador, volta a ver só a campanha de que participa: ' + JSON.stringify([va.campanhas, va.fichas]));
    await rpc(M, 'definir_auxiliar', { p_mesa: mesa, p_usuario: ea.uid, p_auxiliar: false });

    // ---------- a linha que chega sem campanha (de um aparelho com a versão anterior do site) ----------
    ok(await semDizer(A, 'v_uma') === C1 && await semDizer(J, 'v_j') === C2, 'de quem joga numa campanha só, fica nela');
    await rpc(M, 'campanha_participa', { p_mesa: mesa, p_id: C2, p_usuario: ea.uid, p_sim: true });
    ok(await semDizer(A, 'v_duas') === null, 'de quem joga em duas, fica no mundo (não há como saber de qual seria)');
    await rpc(M, 'campanha_participa', { p_mesa: mesa, p_id: C2, p_usuario: ea.uid, p_sim: false });
    ok(await semDizer(M, 'v_mestre') === null, 'e a do mestre também (ele não é "de" campanha nenhuma)');

    // ---------- apagar: só a campanha que não guarda nada ----------
    /* O que a campanha deixa para trás quando é apagada: uma ficha dela já apagada (que era aberta aos jogadores dela),
       a projeção já apagada de um mapa dela, e a projeção da cena no ar, se ainda dizia ser dela (o aparelho do mestre
       não chegou a regravar). Nada disso pode passar a ser "do mundo": seria entregue a todos os jogadores da mesa. */
    const restos = await M.evaluate(async ([mesa, C2]) => {
      const e = [];
      const a = await sb.from('personagens').insert({ mesa_id: mesa, id: 'npc_morto', nome: 'Vilão da Geração 2', vis: 'mesa', campanha: C2, ficha: { nome: 'Vilão da Geração 2', segredo: 'trai o grupo' }, estado: {} }); if (a.error) e.push(a.error.message);
      const b = await sb.from('personagens').update({ apagado: true }).eq('mesa_id', mesa).eq('id', 'npc_morto').select('id'); if (b.error || !b.data.length) e.push('apagar a ficha');
      const c = await sb.from('documentos').insert({ mesa_id: mesa, id: 'mundo:pub:morto', vis: 'mesa', dados: { nome: 'Mapa da Geração 2' }, campanhas: [C2] }); if (c.error) e.push(c.error.message);
      const d = await sb.from('documentos').update({ apagado: true }).eq('mesa_id', mesa).eq('id', 'mundo:pub:morto').select('id'); if (d.error || !d.data.length) e.push('apagar o mapa');
      const f = await sb.from('documentos').update({ campanhas: [C2] }).eq('mesa_id', mesa).eq('id', 'cena:pub:v').select('id'); if (f.error || !f.data.length) e.push('a projeção da cena');
      return e;
    }, [mesa, C2]);
    ok(restos.length === 0, '(uma ficha e um mapa já apagados da segunda campanha, e a projeção da cena no ar ainda dizendo ser dela)' + (restos.length ? ' — ' + restos.join(' · ') : ''));
    const restosPara = p => p.evaluate(async mesa => {
      const f = (await sb.from('personagens').select('id,campanha,vis,apagado').eq('mesa_id', mesa).eq('id', 'npc_morto')).data || [];
      const d = (await sb.from('documentos').select('id,campanhas,apagado').eq('mesa_id', mesa).in('id', ['mundo:pub:morto', 'cena:pub:v', 'cena:pub:m']).order('id')).data || [];
      return { ficha: f.map(x => [x.campanha, x.vis, x.apagado].join('/')).join(), docs: d.map(x => x.id + '=' + JSON.stringify(x.campanhas)).join(' ') };
    }, mesa);
    r = await rpc(M, 'campanha_apagar', { p_mesa: mesa, p_id: C2 });
    ok(/ainda tem fichas/.test(r.erro || ''), 'campanha com fichas não se apaga: "' + r.erro + '"');
    await M.evaluate(async ([mesa, C2]) => { await sb.from('personagens').update({ campanha: null }).eq('mesa_id', mesa).eq('campanha', C2).eq('apagado', false); }, [mesa, C2]);
    r = await rpc(M, 'campanha_apagar', { p_mesa: mesa, p_id: C2 });
    ok(/ainda tem conversa/.test(r.erro || ''), 'nem com conversa: "' + r.erro + '"');
    await M.evaluate(async ([mesa, C2]) => { await sb.from('registro').update({ apagado: true }).eq('mesa_id', mesa).eq('campanha', C2); }, [mesa, C2]);
    r = await rpc(M, 'campanha_apagar', { p_mesa: mesa, p_id: C2 });
    ok(/ainda tem cenas ou mapas/.test(r.erro || ''), 'nem com um mapa dela: "' + r.erro + '"');
    await M.evaluate(async ([mesa, C2]) => { await sb.from('documentos').update({ campanhas: ['outra'] }).eq('mesa_id', mesa).eq('id', 'mundo:pub:dois'); }, [mesa, C2]);
    r = await rpc(M, 'campanha_apagar', { p_mesa: mesa, p_id: C2 });
    ok(r.ok === true, 'sem fichas, sem conversa à vista, sem cenas nem mapas: apaga — ' + JSON.stringify(r));
    const sobrou = await M.evaluate(async ([mesa, C2]) => {
      const cs = (await sb.from('campanhas').select('id').eq('mesa_id', mesa)).data.map(x => x.id), ms = (await sb.from('campanha_membros').select('campanha_id').eq('mesa_id', mesa)).data.map(x => x.campanha_id);
      const rg = (await sb.from('registro').select('id').eq('mesa_id', mesa).eq('campanha', C2)).data.length, ac = (await sb.from('documentos').select('apagado').eq('mesa_id', mesa).eq('id', 'acampamento@' + C2).single()).data.apagado;
      const pj = (await sb.from('personagens').select('campanha').eq('mesa_id', mesa).eq('id', 'pc_j').single()).data.campanha;
      return { cs, ms, rg, ac, pj };
    }, [mesa, C2]);
    ok(sobrou.cs.join() === C1 && sobrou.ms.every(x => x === C1) && sobrou.rg === 0 && sobrou.ac === true && sobrou.pj === null, 'a campanha, as participações, a conversa já apagada e o acampamento dela vão embora; a ficha que tinha saído fica no mundo: ' + JSON.stringify(sobrou));
    const rm = await restosPara(M), ra = await restosPara(A), rj = await restosPara(J);
    ok(rm.ficha === '/mestre/true' && rm.docs === `cena:pub:m=["${C1}"] cena:pub:v=["${C2}"] mundo:pub:morto=["${C2}"]`, 'o que ela deixou não passa a ser do mundo: a ficha apagada fica só com o mestre, e os documentos continuam dizendo de quem eram — ' + JSON.stringify(rm));
    ok(ra.ficha === '' && ra.docs === `cena:pub:m=["${C1}"]` && rj.ficha === '' && rj.docs === '', 'e nenhum jogador recebe esses restos (nem a projeção que ainda dizia ser dela): ' + JSON.stringify([ra, rj]));
    // (o aparelho do mestre, quando transmite de novo, regrava a projeção com a campanha da cena que está no ar)
    await M.evaluate(async ([mesa, C1]) => { await sb.from('documentos').update({ campanhas: [C1] }).eq('mesa_id', mesa).eq('id', 'cena:pub:v'); }, [mesa, C1]);
    ok((await restosPara(A)).docs === `cena:pub:m=["${C1}"] cena:pub:v=["${C1}"]`, 'regravada pelo mestre com a campanha certa, a projeção volta a chegar a quem é dela');
    r = await rpc(M, 'campanha_apagar', { p_mesa: mesa, p_id: C1 });
    ok(/ainda tem fichas/.test(r.erro || ''), 'a primeira, cheia, continua lá: "' + r.erro + '"');
    vj = await ver(J);
    ok(vj.campanhas === '' && vj.fichas === 'npc_g2,npc_mundo,pc_j' && vj.conversa.includes('m_mundo'), 'o jogador que ficou sem campanha vê o que é do mundo: ' + JSON.stringify([vj.campanhas, vj.fichas, vj.conversa]));

    ok(await quantas(J) === 1, 'quem está sem campanha sabe que a mesa tem campanhas: ' + await quantas(J));

    // ---------- desfazer as campanhas: com uma só, tudo volta a ser da mesa ----------
    const foto = () => M.evaluate(async mesa => {
      const fs = (await sb.from('personagens').select('id,campanha').eq('mesa_id', mesa).order('id')).data;
      const rs = (await sb.from('registro').select('id,rev,atualizado_em,campanha').eq('mesa_id', mesa).order('id')).data;
      const ds = (await sb.from('documentos').select('id,apagado,campanhas,dados,vis').eq('mesa_id', mesa).order('id')).data;
      const cs = (await sb.from('campanhas').select('id').eq('mesa_id', mesa)).data.length, ms = (await sb.from('campanha_membros').select('usuario_id').eq('mesa_id', mesa)).data.length;
      return { fs, rs, ds, cs, ms };
    }, mesa);
    // (uma projeção que não está aberta aos jogadores não entra no índice refeito)
    await M.evaluate(async mesa => { await sb.from('documentos').insert({ mesa_id: mesa, id: 'mundo:pub:esc', vis: 'mestre', dados: { nome: 'Antes de todos' } }); }, mesa);
    const f0 = await foto();
    r = await rpc(M, 'campanha_desfazer', { p_mesa: mesa, p_id: C1 });
    ok(r.ok === true, 'com uma campanha só, o mestre desfaz as campanhas: ' + JSON.stringify(r));
    const f1 = await foto(), D0 = id => f0.ds.find(x => x.id === id), D1 = id => f1.ds.find(x => x.id === id);
    ok(f1.cs === 0 && f1.ms === 0 && await quantas(A) === 0, 'a campanha e as participações somem, e a mesa volta a dizer que não tem campanhas');
    ok(f1.fs.length === f0.fs.length && f1.fs.every(x => x.campanha === null), 'as fichas voltam a não ter campanha');
    ok(f1.rs.length === f0.rs.length && f1.rs.every((x, i) => x.campanha === null && x.rev === f0.rs[i].rev && x.atualizado_em === f0.rs[i].atualizado_em), 'a conversa também — e, de novo, sem contar como "mexida"');
    const voltou = base => { const n = D1(base), v = D1(base + '@' + C1), era = D0(base + '@' + C1); return !!n && n.apagado === false && JSON.stringify(n.campanhas) === '[]' && !!v && v.apagado === true && !!era && JSON.stringify(n.dados) === JSON.stringify(era.dados); };
    ok(voltou('acampamento') && voltou('fichas:missoes') && voltou('fichas:grupos'), 'o acampamento, as missões do grupo e a ordem dos grupos da campanha voltam a ser os da mesa, com o que tinham: ' + JSON.stringify(f1.ds.filter(x => !x.apagado).map(x => x.id)));
    const seg2 = D1('fichas:segredos').dados.v;
    ok(seg2.mis.g && seg2.mis.g.s1 && seg2.mis.g.s1.t === 'Trair o barão' && !(seg2.mis.gc && seg2.mis.gc[C1]) && seg2.mis.p.pc_a.s2.t === 'Carta', 'as missões escondidas do grupo voltam para onde estavam: ' + JSON.stringify(seg2.mis));
    ok(['cena:c1:m', 'cena:c1:v', 'cena:pub:m', 'cena:pub:v', 'mundo:mapa:x', 'mundo:pub:x'].every(id => JSON.stringify(D1(id).campanhas) === '[]'), 'as cenas e os mapas deixam de ter campanha');
    // (mundo:pub:dois ficou, mais acima, numa campanha que não existe: continua fora do índice; mundo:pub:mundo sempre foi do mundo)
    ok(JSON.stringify(D1('mundo:indice').dados) === JSON.stringify({ mapas: [{ id: 'mundo', nome: 'Mapa do mundo' }, { id: 'x', nome: 'Mundo' }], mostrado: 'x' }), 'e o índice dos mapas volta a ter o nome de todos os que os jogadores podem abrir: ' + JSON.stringify(D1('mundo:indice').dados));
    va = await ver(A); vj = await ver(J);
    const abertas = s => s.split(',').filter(x => !/^n\d_/.test(x)).join(',');      // (sem as fichas escondidas que o Dalmo criou para ele mais acima)
    ok(va.campanhas === '' && vj.campanhas === '' && abertas(va.fichas) === abertas(vj.fichas) && va.fichas.includes('pc_a') && va.fichas.includes('pc_j') && !va.fichas.includes('npc_esc') && va.conversa.includes('m_1') && va.conversa === vj.conversa && va.docs.includes('acampamento') && va.docs.includes('cena:pub:m'),
      'e os jogadores voltam a ver tudo junto, como antes das campanhas: ' + JSON.stringify([va.fichas, va.conversa]));
    r = await rpc(M, 'campanha_criar', { p_mesa: mesa, p_nome: 'De novo', p_adotar: true });
    const C3 = r.ok && r.ok.id;
    const f2 = await foto();
    ok(!!C3 && f2.cs === 1 && f2.ms === 2 && f2.fs.every(x => x.campanha === C3) && f2.ds.some(x => x.id === 'acampamento@' + C3 && !x.apagado), 'depois de desfeitas, a "primeira campanha" pode ser criada outra vez, levando tudo: ' + JSON.stringify(r.ok || r.erro));

    // ---------- desfazer numa mesa que não tinha índice de mapas: ele passa a existir ----------
    await M.evaluate(async mesa => { await sb.from('documentos').update({ apagado: true }).eq('mesa_id', mesa).eq('id', 'mundo:indice'); }, mesa);
    r = await rpc(M, 'campanha_desfazer', { p_mesa: mesa, p_id: C3 });
    const f3 = await foto(), indiceNovo = f3.ds.find(x => x.id === 'mundo:indice');
    ok(r.ok === true && !!indiceNovo && indiceNovo.apagado === false && indiceNovo.vis === 'mesa' && JSON.stringify(indiceNovo.dados.mapas.map(x => x.id)) === '["mundo","x"]', 'desfeitas numa mesa sem índice de mapas (só havia mapas de campanha), o índice passa a existir, com os mapas que os jogadores podem abrir: ' + JSON.stringify(indiceNovo && indiceNovo.dados));
    r = await rpc(M, 'campanha_criar', { p_mesa: mesa, p_nome: 'Outra vez', p_adotar: true });
    const C4 = r.ok && r.ok.id;
    ok(!!C4, '(a primeira campanha é criada mais uma vez)');

    // ---------- o limite: 40 campanhas por mesa ----------
    const cheia = await M.evaluate(async mesa => {
      const ids = []; let erro = null;
      for (let i = 0; i < 45 && !erro; i++) { const x = await sb.rpc('campanha_criar', { p_mesa: mesa, p_nome: 'Extra ' + (i + 1) }); if (x.error) erro = x.error.message; else ids.push(x.data.id); }
      const total = (await sb.from('campanhas').select('id').eq('mesa_id', mesa)).data.length, conta = (await sb.from('mesas').select('campanhas').eq('id', mesa).single()).data.campanhas;
      for (const id of ids) await sb.rpc('campanha_apagar', { p_mesa: mesa, p_id: id });
      const depois = (await sb.from('campanhas').select('id').eq('mesa_id', mesa)).data.length;
      return { criadas: ids.length, erro, total, conta, depois };
    }, mesa);
    ok(cheia.total === 40 && cheia.conta === 40 && cheia.criadas === 39 && /^Esta mesa já tem 40 campanhas\./.test(cheia.erro || '') && cheia.depois === 1, 'a mesa tem no máximo 40 campanhas (a 41ª é recusada, com o motivo); apagadas as vazias, volta a ter uma: ' + JSON.stringify(cheia));

    // ---------- quem sai da mesa sai das campanhas ----------
    await A.evaluate(async mesa => { const uid = (await sb.auth.getUser()).data.user.id; await sb.from('mesa_membros').delete().eq('mesa_id', mesa).eq('usuario_id', uid); }, mesa);
    const part = await M.evaluate(async ([mesa, a]) => { const d = (await sb.from('campanha_membros').select('usuario_id').eq('mesa_id', mesa)).data; return { total: d.length, dele: d.filter(x => x.usuario_id === a).length }; }, [mesa, ea.uid]);
    ok(part.total === 1 && part.dele === 0, 'quem sai da mesa deixa de participar das campanhas dela: ' + JSON.stringify(part));
  } finally {
    const x = await M.evaluate(async mesa => { const r = await sb.from('mesas').delete().eq('id', mesa).select('id'); return r.error ? r.error.message : (r.data || []).length; }, mesa).catch(e => String(e.message).split('\n')[0]);
    ok(x === 1, 'a mesa de teste é apagada no fim (e as campanhas vão junto): ' + x);
  }
  }
  if (SO !== 'banco') {
  /* ===================== a tela ===================== */
  const novo = async (name, o) => { const d = await t.device(Object.assign({ name }, o)); await espiarBanco(d.ctx); d.page.setDefaultTimeout(15000); return d.page; };
  const TM = await novo('tela-mestre'), TA = await novo('tela-A', { w: 1280, h: 860 }), TJ = await novo('tela-J', { w: 1280, h: 860 });
  const w = (ms, p) => (p || TM).waitForTimeout(ms);
  const ate = async (fn, ms = 15000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* a página está abrindo de novo */ } if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 250)); } };
  const feed = p => p.locator('#feed');
  const noFeed = (p, texto, ms) => ate(async () => (await feed(p).innerText()).includes(texto), ms);
  const foraDoFeed = async (p, texto) => !(await feed(p).innerText()).includes(texto);
  const avisos = async p => (await p.locator('#toasts .toast').allInnerTexts()).join(' | ');
  const comAviso = (p, re, ms) => ate(async () => re.test(await avisos(p)), ms);
  const semAvisos = p => p.evaluate(() => document.getElementById('toasts').replaceChildren());
  const falar = async (p, texto) => { await p.locator('#msg').fill(texto); await p.locator('#msg').press('Enter'); };
  const abrirMenu = async p => { if (await p.locator('#menu').isHidden()) await p.locator('#btnConta').click(); await p.locator('#menu').waitFor({ state: 'visible' }); await p.waitForTimeout(200); };
  const fecharMenu = async p => { if (await p.locator('#menu').isVisible()) await p.keyboard.press('Escape'); await p.waitForTimeout(150); };
  const estado = p => p.evaluate(() => { const a = TC.mesas.atual; return a ? { vista: a.campanha, lista: a.campanhas.map(c => c.nome + (c.encerrada ? ' (encerrada)' : '')), ids: a.campanhas.map(c => c.id), tem: a.temCampanhas } : null; });
  const barra = async p => ((await p.locator('#contaCamp').count()) ? (await p.locator('#contaCamp').innerText()).trim() : '');
  const noBanco = (fn, arg) => TM.evaluate(fn, arg);                       // (pelo cliente do banco do mestre, por fora do programa)
  // uma aba do site: clica e devolve a moldura dela
  const aba = async (p, id) => {
    await p.locator('#tab-' + id).click();
    let f = null;
    await ate(async () => { f = p.frames().find(x => x !== p.mainFrame() && new RegExp('/' + id + '/').test(x.url())) || null; return !!f; });
    await p.waitForTimeout(1200);
    return p.frames().find(x => x !== p.mainFrame() && new RegExp('/' + id + '/').test(x.url())) || f;
  };

  // ---------- a mesa de antes das campanhas ----------
  // (?debug: cada sistema deixa à mão o que o teste precisa olhar por dentro — o acampamento aberto, por exemplo)
  await TM.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(TM, c.mestre, c.senha);
  const nomeT = 'Campanhas Tela ' + Date.now().toString(36);
  const codigoT = await criarMesaTela(TM, nomeT);
  for (const [p, email, nome] of [[TA, c.jog1, 'Dalmo'], [TJ, c.jog2, 'Visitante']]) { await p.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(p, email, c.senha); await entrarMesaTela(p, codigoT, nome); }
  const mesaT = await TM.evaluate(() => TC.mesas.atual.id);
  try {
    const semente = await noBanco(async ([mesa, a, j]) => {
      const r = await window.__sb.from('personagens').insert([
        { mesa_id: mesa, id: 'pc_a', nome: 'Selene', dono_id: a, vis: 'mesa', ordem: 1, ficha: { nome: 'Selene', grupo: 'Heróis' }, estado: {} },
        { mesa_id: mesa, id: 'pc_j', nome: 'Dain', dono_id: j, vis: 'mesa', ordem: 2, ficha: { nome: 'Dain', grupo: 'Heróis' }, estado: {} },
        { mesa_id: mesa, id: 'npc_pub', nome: 'Guarda', vis: 'mesa', ordem: 3, ficha: { nome: 'Guarda', grupo: 'Vila' }, estado: {} },
        { mesa_id: mesa, id: 'npc_esc', nome: 'Vilão', vis: 'mestre', ordem: 4, ficha: { nome: 'Vilão', grupo: 'Vila' }, estado: {} },
      ]);
      return r.error ? r.error.message : null;
    }, [mesaT, ea.uid, ej.uid]);
    ok(!semente, 'a mesa da tela começa com quatro fichas, em dois grupos' + (semente ? ' — ' + semente : ''));
    await falar(TM, 'boa noite, mesa'); await falar(TA, 'oi, sou o Dalmo'); await falar(TJ, 'oi, sou o Visitante');
    // (os três falam um logo depois do outro, mal entraram: ninguém fica sem ver a fala de ninguém)
    const chegou = [];
    for (const p of [TM, TA, TJ]) for (const x of ['boa noite, mesa', 'oi, sou o Dalmo', 'oi, sou o Visitante']) chegou.push(await noFeed(p, x, 20000));
    ok(chegou.every(Boolean), 'a conversa de antes das campanhas chega a todos, inteira — ' + JSON.stringify(chegou));

    // ---------- sem campanhas: o mestre vê o convite para criar a primeira; o jogador, nada ----------
    await abrirMenu(TM);
    ok(await TM.locator('#mn-camp').isVisible() && /ainda não tem campanhas/.test(await TM.locator('#mn-semcamp').innerText()) && (await TM.locator('#mn-campanhas').innerText()).trim() === 'Criar a primeira campanha…', 'sem campanhas, o menu do mestre explica e oferece criar a primeira');
    ok(await barra(TM) === '' && await TM.evaluate(n => { const b = document.getElementById('btnConta'); return [...b.childNodes].every(x => x.nodeType === 1) && b.textContent === n + 'Mestre'; }, nomeT),
      'e a barra não mostra campanha nenhuma: só o nome da mesa e o papel — ' + JSON.stringify(await TM.locator('#btnConta').evaluate(b => b.textContent)));
    await abrirMenu(TA);
    ok(await TA.locator('#mn-camp').count() === 0, 'o jogador não vê nada sobre campanhas enquanto a mesa não tem nenhuma');
    await fecharMenu(TA);

    // ---------- a primeira campanha: a lista do que vai passar, e só passa depois do OK ----------
    await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    ok(await TM.locator('#cp-lista').count() === 0 && (await TM.locator('#cp-criar').innerText()).trim() === 'Continuar', 'a janela das campanhas, vazia, pede o nome da primeira');
    /* A lista diz, pelo nome, quem passa a participar — e não pode ser a de memória: quem entrou na mesa agora há pouco,
       e este aparelho ainda não sabia, também passa. (Aqui a memória do aparelho é posta um passo atrás, sem o Visitante.) */
    await w(1500);
    await TM.evaluate(() => { const a = TC.mesas.atual; a.membros = a.membros.filter(m => m.nome !== 'Visitante'); });
    await TM.locator('#cp-nome').fill('Geração do Dain'); await TM.locator('#cp-criar').click();
    await TM.locator('#f-primeira').waitFor();
    ok(await ate(async () => !(await TM.locator('#cp-ok').isDisabled())), 'antes de criar, a lista do que vai passar para ela');
    const previa = (await TM.locator('#cp-previa li').allInnerTexts()).join(' | ');
    ok(/4 fichas, em 2 grupos/.test(previa) && /conversa e as rolagens da mesa ao vivo \(3 linhas\)/.test(previa) && /Passam a participar: Dalmo, Visitante/.test(previa), 'a lista diz as fichas, os grupos, a conversa e quem passa a participar (lido de novo na hora): ' + previa);
    ok(await noBanco(async mesa => (await window.__sb.from('campanhas').select('id').eq('mesa_id', mesa)).data.length, mesaT) === 0, 'e nada mudou no banco antes do OK');
    await TM.locator('#cp-ok').click();
    ok(await comAviso(TM, /Campanha Geração do Dain criada, com o que a mesa já tinha\./), 'criada: o aviso diz e oferece desfazer — ' + await avisos(TM));
    ok(await ate(async () => (await barra(TM)) === 'Geração do Dain'), 'a barra do mestre passa a mostrar a campanha em vista');
    // (os dois aparelhos percebem sozinhos, em instantes: o aviso de cada um fica uns segundos na tela)
    const avisados = await Promise.all([TA, TJ].map(p => comAviso(p, /O mestre colocou você na campanha Geração do Dain\./, 25000)));
    ok(avisados.every(Boolean), 'os dois jogadores são avisados de que agora participam da campanha: ' + JSON.stringify(avisados));
    for (const [p, quem] of [[TA, 'Dalmo'], [TJ, 'Visitante']]) {
      ok(await ate(async () => (await barra(p)) === 'Geração do Dain', 25000), quem + ' passa a ver a campanha na barra, sem recarregar');
      ok(await noFeed(p, 'boa noite, mesa') && await noFeed(p, 'oi, sou o Dalmo') && await noFeed(p, 'oi, sou o Visitante'), quem + ' continua vendo a conversa inteira, agora da campanha');
    }
    let C1 = (await estado(TM)).vista;
    const doBanco = () => noBanco(async mesa => {
      const sb = window.__sb, fs = (await sb.from('personagens').select('id,campanha').eq('mesa_id', mesa).order('id')).data, rs = (await sb.from('registro').select('id,campanha').eq('mesa_id', mesa)).data;
      const ds = (await sb.from('documentos').select('id,campanhas,apagado').eq('mesa_id', mesa)).data.filter(x => !x.apagado), ms = (await sb.from('campanha_membros').select('campanha_id,usuario_id').eq('mesa_id', mesa)).data;
      return { fichas: fs.map(x => x.id + ':' + (x.campanha || 'mundo')).join(','), conversa: [...new Set(rs.map(x => x.campanha || 'mundo'))].join(','), linhas: rs.length, docs: ds.map(x => x.id).sort(), membros: ms.length };
    }, mesaT);
    let b = await doBanco();
    ok(b.fichas === ['npc_esc', 'npc_pub', 'pc_a', 'pc_j'].map(x => x + ':' + C1).join(',') && b.conversa === C1 && b.linhas === 3 && b.membros === 2, 'no banco: as fichas, a conversa e os dois jogadores são da campanha — ' + JSON.stringify(b));

    // ---------- desfazer (pelo aviso): a mesa volta a ser como era ----------
    await TM.locator('#toasts .toast button', { hasText: 'Desfazer' }).click();
    ok(await comAviso(TM, /Desfeito: a mesa voltou a ser como era, sem campanhas\./), 'o "Desfazer" do aviso desfaz a criação');
    ok(await ate(async () => (await barra(TM)) === '' && (await estado(TM)).lista.length === 0), 'a barra do mestre fica sem campanha');
    b = await doBanco();
    ok(b.fichas === 'npc_esc:mundo,npc_pub:mundo,pc_a:mundo,pc_j:mundo' && b.conversa === 'mundo' && b.linhas === 3 && b.membros === 0, 'no banco tudo voltou a ser da mesa inteira — ' + JSON.stringify(b));
    for (const [p, quem] of [[TA, 'Dalmo'], [TJ, 'Visitante']]) {
      ok(await ate(async () => (await barra(p)) === '' && (await estado(p)).tem === false, 25000), quem + ' deixa de ver campanha na barra');
      ok(await noFeed(p, 'boa noite, mesa') && await noFeed(p, 'oi, sou o Visitante'), quem + ' continua vendo a conversa');
    }

    // ---------- de novo, para ficar; e a segunda campanha, que nasce vazia ----------
    await semAvisos(TM);
    await abrirMenu(TM); await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    await TM.locator('#cp-nome').fill('Geração do Dain'); await TM.locator('#cp-criar').click();
    await TM.locator('#f-primeira').waitFor(); await ate(async () => !(await TM.locator('#cp-ok').isDisabled()));
    await TM.locator('#cp-ok').click();
    ok(await ate(async () => (await barra(TM)) === 'Geração do Dain'), 'a primeira campanha é criada de novo');
    C1 = (await estado(TM)).vista;
    ok(await ate(async () => (await barra(TA)) === 'Geração do Dain' && (await barra(TJ)) === 'Geração do Dain', 25000), 'e os jogadores voltam a participar dela');
    await semAvisos(TM);

    // ---------- renomear, com o "Desfazer" do aviso (que se clica com a janela das campanhas ainda aberta) ----------
    await abrirMenu(TM); await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    await TM.locator('#cp-lista [data-a="renomear"]').click(); await TM.locator('#cr-nome').waitFor();
    ok(await TM.locator('#cr-nome').inputValue() === 'Geração do Dain', 'renomear abre com o nome de agora');
    await TM.locator('#cr-nome').fill('  A primeira geração  '); await TM.locator('#cr-ok').click();
    ok(await comAviso(TM, /A campanha agora se chama A primeira geração\./) && await ate(async () => (await barra(TM)) === 'A primeira geração'), 'renomeada (sem os espaços das pontas): a barra acompanha');
    ok(await TM.locator('#f-camps').isVisible() && /A primeira geração/.test(await TM.locator('#cp-lista .cpl').first().innerText()), 'e a janela das campanhas continua aberta, com o nome novo');
    ok(await ate(async () => (await barra(TA)) === 'A primeira geração', 25000), 'o jogador vê o nome novo');
    await TM.locator('#toasts .toast button', { hasText: 'Desfazer' }).click();
    ok(await comAviso(TM, /A campanha voltou a se chamar Geração do Dain\./) && await ate(async () => (await barra(TM)) === 'Geração do Dain' && /Geração do Dain/.test(await TM.locator('#cp-lista .cpl').first().innerText())), 'o "Desfazer" do aviso devolve o nome (com a janela aberta)');
    await TM.locator('#cp-lista [data-a="renomear"]').click(); await TM.locator('#cr-nome').waitFor();
    await TM.locator('#cr-nome').fill('   '); await TM.locator('#cr-ok').click(); await w(400);
    ok(await TM.locator('#cr-nome').count() === 1 && (await barra(TM)) === 'Geração do Dain', 'um nome em branco não é aceito');
    await TM.locator('dialog[open] .btn', { hasText: 'Voltar' }).click(); await TM.locator('#f-camps').waitFor();

    // ---------- "Desfazer as campanhas…" pela janela — e voltar atrás, com os jogadores que ela tinha ----------
    await semAvisos(TM);
    await TM.locator('#cp-lista [data-a="jogadores"]').click(); await TM.locator('#f-jogadores').waitFor();
    await TM.locator(`#cj-lista input[data-u="${ej.uid}"]`).uncheck(); await TM.locator('#cj-ok').click();
    ok(await comAviso(TM, /Visitante não participa mais da campanha Geração do Dain\./) && await ate(async () => /1 jogador\b/.test(await TM.locator('#cp-lista .cpl').first().innerText())), 'o Visitante sai da campanha (ela fica com 1 jogador)');
    await semAvisos(TM);
    await TM.locator('#cp-lista [data-a="desfazer"]').click();
    ok(await ate(async () => /Voltar a mesa ao que era antes das campanhas\?/.test(await TM.locator('dialog[open] h2').innerText())) && /Nada é apagado, e todos os jogadores voltam a ver tudo junto/.test(await TM.locator('dialog[open] p').first().innerText()), '"Desfazer as campanhas…" pede confirmação e diz o que acontece');
    await TM.locator('dialog[open] button[type="submit"]').click();
    ok(await comAviso(TM, /A mesa voltou a ser como era, sem campanhas\./) && await ate(async () => (await barra(TM)) === '' && (await estado(TM)).lista.length === 0), 'desfeitas: a mesa fica sem campanhas');
    ok(await ate(async () => (await estado(TJ)).tem === false && (await barra(TJ)) === '', 25000) && await noFeed(TJ, 'boa noite, mesa'), 'e o Visitante, que tinha ficado de fora, volta a ver a conversa da mesa');
    await TM.locator('#toasts .toast button', { hasText: 'Desfazer' }).click();
    ok(await comAviso(TM, /Desfeito: a campanha Geração do Dain voltou, com o que a mesa tem\./, 20000) && await ate(async () => (await barra(TM)) === 'Geração do Dain'), 'o "Desfazer" traz a campanha de volta');
    C1 = (await estado(TM)).vista;
    b = await doBanco();
    ok(b.membros === 1 && b.fichas === ['npc_esc', 'npc_pub', 'pc_a', 'pc_j'].map(x => x + ':' + C1).join(',') && b.conversa === C1, 'com o que a mesa tem — e só com quem participava antes (o Visitante continua de fora): ' + JSON.stringify(b));
    ok(await ate(async () => (await barra(TA)) === 'Geração do Dain' && (await barra(TJ)) === '' && (await estado(TJ)).tem === true, 25000), 'o Dalmo volta a vê-la; o Visitante fica sem campanha');
    await abrirMenu(TM); await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    await TM.locator('#cp-lista [data-a="jogadores"]').click(); await TM.locator('#f-jogadores').waitFor();
    await TM.locator(`#cj-lista input[data-u="${ej.uid}"]`).check(); await TM.locator('#cj-ok').click();
    ok(await comAviso(TM, /Visitante agora participa da campanha Geração do Dain\./) && await ate(async () => (await barra(TJ)) === 'Geração do Dain', 25000), 'o mestre coloca o Visitante de volta');
    await TM.keyboard.press('Escape'); await w(300);
    await semAvisos(TM); await semAvisos(TA); await semAvisos(TJ);
    await abrirMenu(TM);
    ok((await TM.locator('#mn-campanhas').innerText()).trim() === 'Campanhas…' && await TM.locator('#mn-camp .cv').count() === 1 && /em vista/.test(await TM.locator('#mn-camp .cv').first().innerText()), 'o menu do mestre mostra a campanha em vista e o botão "Campanhas…"');
    await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    ok(await TM.locator('#cp-lista .cpl').count() === 1 && /em vista · 2 jogadores/.test(await TM.locator('#cp-lista .cpl').first().innerText()) && await TM.locator('#cp-lista [data-a="desfazer"]').count() === 1 && await TM.locator('#cp-lista [data-a="apagar"]').count() === 0,
      'a janela lista a campanha (em vista, 2 jogadores); com uma só, oferece "Desfazer as campanhas…" no lugar de apagar');
    await TM.locator('#cp-nome').fill('Geração 2'); await TM.locator('#cp-criar').click();
    ok(await comAviso(TM, /Campanha Geração 2 criada\. Ela começa vazia/), 'a segunda campanha: ' + await avisos(TM));
    ok(await ate(async () => (await TM.locator('#cp-lista .cpl').count()) === 2), 'a janela passa a listar as duas');
    const linhas2 = await TM.locator('#cp-lista .cpl').allInnerTexts();
    ok(/Geração do Dain/.test(linhas2[0]) && /Geração 2/.test(linhas2[1]) && /0 jogadores/.test(linhas2[1]) && await TM.locator('#cp-lista [data-a="apagar"]').count() === 2 && await TM.locator('#cp-lista [data-a="desfazer"]').count() === 0,
      'na ordem em que foram criadas; a nova sem jogadores; com duas, cada uma tem "Apagar…" (e não há mais "Desfazer as campanhas…")');
    const C2 = (await estado(TM)).ids.find(x => x !== C1);
    ok((await estado(TM)).vista === C1 && await barra(TM) === 'Geração do Dain', 'criar outra campanha não troca a que está em vista');
    await w(7000);
    ok((await estado(TA)).lista.join() === 'Geração do Dain' && (await estado(TJ)).lista.join() === 'Geração do Dain', 'os jogadores não ficam sabendo da campanha de que não participam');

    // ---------- a ordem ----------
    await TM.locator('#cp-lista .cpl').nth(1).locator('[data-a="subir"]').click();
    ok(await ate(async () => /Geração 2/.test((await TM.locator('#cp-lista .cpl').allInnerTexts())[0])), 'a seta sobe a campanha na lista');
    ok(await TM.locator('#cp-lista .cpl').nth(0).locator('[data-a="subir"]').isDisabled() && await TM.locator('#cp-lista .cpl').nth(1).locator('[data-a="descer"]').isDisabled(), 'a primeira não sobe e a última não desce');
    await TM.locator('#cp-lista .cpl').nth(0).locator('[data-a="descer"]').click();
    ok(await ate(async () => /Geração do Dain/.test((await TM.locator('#cp-lista .cpl').allInnerTexts())[0])), 'e desce de volta');

    // ---------- quem participa: o Visitante entra também na segunda ----------
    await semAvisos(TM);
    await TM.locator(`#cp-lista .cpl[data-camp="${C2}"] [data-a="jogadores"]`).click(); await TM.locator('#f-jogadores').waitFor();
    ok(await TM.locator('#cj-lista input[type="checkbox"]').count() === 2 && await TM.locator('#cj-lista input:checked').count() === 0, 'a janela dos jogadores lista os dois, nenhum marcado');
    await TM.locator(`#cj-lista input[data-u="${ej.uid}"]`).check(); await TM.locator('#cj-ok').click();
    ok(await comAviso(TM, /Visitante agora participa da campanha Geração 2\./), 'salvar diz quem entrou (com desfazer): ' + await avisos(TM));
    ok(await ate(async () => /1 jogador\b/.test(await TM.locator(`#cp-lista .cpl[data-camp="${C2}"]`).innerText())), 'e a lista mostra 1 jogador na segunda');
    await TM.keyboard.press('Escape'); await w(300);
    ok(await comAviso(TJ, /O mestre colocou você na campanha Geração 2\./, 25000), 'o Visitante é avisado: ' + await avisos(TJ));
    ok(await ate(async () => (await estado(TJ)).lista.join(' | ') === 'Geração do Dain | Geração 2') && (await estado(TJ)).vista === C1, 'ele passa a ver as duas — e continua na que estava');
    ok((await estado(TA)).lista.join() === 'Geração do Dain', 'o Dalmo continua só com a dele');
    await abrirMenu(TJ);
    ok(/^campanha em vista$/i.test((await TJ.locator('#mn-camp .rot').innerText()).trim()) && await TJ.locator('#mn-camp .cv').count() === 2 && await TJ.locator('#mn-campanhas').count() === 0, 'o menu do Visitante deixa escolher entre as duas (e não tem "Campanhas…": organizar é do mestre)');

    // ---------- trocar a campanha em vista: cada uma tem a sua conversa ----------
    await TJ.locator(`#mn-camp .cv[data-camp="${C2}"]`).click();
    ok(await comAviso(TJ, /Agora você vê a campanha Geração 2\./) && await ate(async () => (await barra(TJ)) === 'Geração 2'), 'o Visitante passa a ver a Geração 2');
    ok(await ate(async () => foraDoFeed(TJ, 'boa noite, mesa')), 'a conversa da outra campanha sai da tela dele');
    await falar(TJ, 'começa a geração 2');
    ok(await noFeed(TJ, 'começa a geração 2'), 'ele fala na Geração 2');
    await w(7000);
    ok(await foraDoFeed(TA, 'começa a geração 2') && await foraDoFeed(TM, 'começa a geração 2'), 'a fala não aparece para quem está com a outra campanha em vista (nem para o mestre)');
    await abrirMenu(TM); await TM.locator(`#mn-camp .cv[data-camp="${C2}"]`).click();
    ok(await ate(async () => (await barra(TM)) === 'Geração 2') && await noFeed(TM, 'começa a geração 2') && await foraDoFeed(TM, 'boa noite, mesa'), 'o mestre troca para a Geração 2 e vê a conversa dela (e só ela)');
    await falar(TM, 'bem-vindos à geração 2');
    ok(await noFeed(TJ, 'bem-vindos à geração 2'), 'e o que ele diz lá chega ao Visitante');
    b = await doBanco();
    ok(b.linhas === 5 && b.conversa.split(',').sort().join() === [C1, C2].sort().join(), 'no banco, cada fala ficou na campanha em que foi dita');
    ok((await estado(TA)).vista === C1 && await foraDoFeed(TA, 'bem-vindos à geração 2'), 'e nada disso chegou ao Dalmo');
    // a campanha em vista é lembrada neste aparelho
    await TJ.reload({ waitUntil: 'load' });
    ok(await ate(async () => (await barra(TJ)) === 'Geração 2', 25000) && await noFeed(TJ, 'começa a geração 2'), 'recarregando, o Visitante volta na campanha que tinha em vista');

    // ---------- Fichas: a lista em blocos, com a campanha em vista em cima ----------
    await abrirMenu(TM); await TM.locator(`#mn-camp .cv[data-camp="${C1}"]`).click();
    ok(await ate(async () => (await barra(TM)) === 'Geração do Dain') && await noFeed(TM, 'boa noite, mesa'), 'o mestre volta à Geração do Dain (e à conversa dela)');
    const blocosDe = f => f.evaluate(() => [...document.querySelectorAll('#lista > .bloco')].map(b => ({ camp: b.dataset.bloco, nome: b.querySelector('.bloconome').textContent.trim(), n: b.querySelector('.blocohd .cnt').textContent.trim(),
      tag: ((b.querySelector('.blocotag') || {}).textContent || '').trim(), aberto: !b.querySelector('.blocoitens').hidden, fichas: [...b.querySelectorAll('.pc .nm')].map(x => x.textContent.trim()).sort().join(',') })));
    let F = await aba(TM, 'fichas');
    ok(await ate(async () => (await F.locator('#lista .pc').count()) === 4), 'as Fichas do mestre abrem com as quatro fichas');
    let bl = await blocosDe(F);
    ok(bl.map(x => x.nome).join(' | ') === 'Geração do Dain | Do mundo | Geração 2' && bl[0].tag === 'em vista' && bl[0].aberto && bl[0].n === '4' && !bl[1].aberto && !bl[2].aberto && bl[1].n === '0' && bl[2].n === '0',
      'a lista vem em blocos: a campanha em vista aberta, em cima; o mundo e a outra campanha, recolhidos — ' + JSON.stringify(bl.map(x => [x.nome, x.n, x.tag, x.aberto])));
    ok(bl[0].fichas === 'Dain,Guarda,Selene,Vilão', 'no bloco da campanha em vista, as fichas dela: ' + bl[0].fichas);
    // "+ Grupo": o grupo novo é da campanha em vista (a pergunta diz qual), e fica na lista de grupos dela
    let perguntaGrupo = '';
    TM.once('dialog', d => { perguntaGrupo = d.message(); d.accept('Batedores').catch(() => {}); });
    await F.locator('#btnGrupo').click(); await w(500);
    ok(/^Nome do grupo \(na campanha Geração do Dain\):$/.test(perguntaGrupo) && await F.locator(`#lista .bloco[data-bloco="${C1}"] [data-sec="Batedores"]`).count() === 1 && await F.locator('#lista .bloco[data-bloco=""] [data-sec="Batedores"]').count() === 0,
      '"+ Grupo" pergunta o nome dizendo a campanha, e o grupo nasce no bloco dela: "' + perguntaGrupo + '"');
    ok(await ate(async () => {
      const d = await noBanco(async ([mesa, c1]) => (await window.__sb.from('documentos').select('id,dados,apagado').eq('mesa_id', mesa).in('id', ['fichas:grupos', 'fichas:grupos@' + c1])).data, [mesaT, C1]);
      const da = d.find(x => x.id === 'fichas:grupos@' + C1), doMundo = d.find(x => x.id === 'fichas:grupos');
      return !!da && !da.apagado && da.dados.v.includes('Batedores') && !(doMundo && !doMundo.apagado && (doMundo.dados.v || []).includes('Batedores'));
    }), 'no banco, o grupo novo está na lista de grupos da campanha (não na do mundo)');
    // (um bloco ainda sem ninguém, aberto, tem onde soltar: a primeira ficha do mundo chega lá arrastada, com o mouse de verdade)
    await F.locator('#lista [data-btoggle=""]').click(); await w(250);
    const alvoVazio = F.locator('#lista .bloco[data-bloco=""] [data-lista] .vazio');
    ok(await alvoVazio.count() === 1 && /^arraste alguém pra cá: quem é do mundo aparece em todas as campanhas$/.test((await alvoVazio.innerText()).trim()), 'aberto, o bloco "Do mundo" (vazio) tem onde soltar uma ficha, e diz o que isso quer dizer');
    {
      const de = await F.locator('#lista [data-grab="npc_esc"]').boundingBox(), para = await alvoVazio.boundingBox();
      await TM.mouse.move(de.x + de.width / 2, de.y + de.height / 2); await TM.mouse.down();
      await TM.mouse.move(de.x + de.width / 2, de.y + de.height / 2 + 6, { steps: 2 });
      await TM.mouse.move(para.x + para.width / 2, para.y + para.height / 2, { steps: 12 });
      await w(120); await TM.mouse.up(); await w(400);
    }
    ok(await ate(async () => /^Vilão passou para o mundo \(aparece em todas as campanhas\)\./.test(await F.locator('.toast').innerText())) && await ate(async () => { b = await doBanco(); return b.fichas.includes('npc_esc:mundo'); }),
      'o Vilão, arrastado para lá, passa para o mundo (com aviso e desfazer): ' + await F.locator('.toast').innerText().catch(() => '(sem aviso)'));
    await F.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(400);
    ok(await ate(async () => { b = await doBanco(); return b.fichas.includes('npc_esc:' + C1); }) && (await blocosDe(F))[0].fichas === 'Dain,Guarda,Selene,Vilão', '"Desfazer" o devolve à campanha: ' + b.fichas);
    await F.locator('#lista [data-btoggle=""]').click(); await w(200);

    // ---------- passar um grupo para outra campanha e desfazer: ele volta, com as fichas e o lugar na lista de grupos ----------
    const gruposNoBanco = () => noBanco(async ([mesa, c1, c2]) => { const d = (await window.__sb.from('documentos').select('id,dados,apagado').eq('mesa_id', mesa).in('id', ['fichas:grupos@' + c1, 'fichas:grupos@' + c2])).data || []; const de = id => { const x = d.find(y => y.id === id); return x && !x.apagado ? x.dados.v : []; }; return [de('fichas:grupos@' + c1), de('fichas:grupos@' + c2)]; }, [mesaT, C1, C2]);
    const gruposAntes = JSON.stringify(await gruposNoBanco());
    await F.locator(`#lista .bloco[data-bloco="${C1}"] [data-gcamp="Vila"]`).click();
    await F.locator('.modal #pgOk').waitFor();
    await F.locator(`.modal [name="pgdest"][value="${C2}"]`).check(); await w(250);
    await F.locator('.modal #pgOk').click();
    ok(await ate(async () => { b = await doBanco(); return b.fichas.includes('npc_esc:' + C2) && b.fichas.includes('npc_pub:' + C2); }) && await ate(async () => { const g = await gruposNoBanco(); return !g[0].includes('Vila') && g[1].includes('Vila'); }),
      'o grupo Vila passa para a Geração 2, com as duas fichas dele, e muda de lista de grupos: ' + b.fichas);
    await F.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(400);
    ok(await ate(async () => { b = await doBanco(); return b.fichas === ['npc_esc', 'npc_pub', 'pc_a', 'pc_j'].map(x => x + ':' + C1).join(','); }) && (await blocosDe(F))[0].fichas === 'Dain,Guarda,Selene,Vilão',
      '"Desfazer" devolve as fichas do grupo à campanha de onde saíram: ' + b.fichas);
    ok(await ate(async () => JSON.stringify(await gruposNoBanco()) === gruposAntes), 'e as listas de grupos das duas campanhas voltam a ser as de antes: ' + JSON.stringify(await gruposNoBanco()));

    // ---------- passar um grupo para outra campanha: as fichas vão junto, e a casca pergunta por quem ficou de fora ----------
    await F.locator(`#lista .bloco[data-bloco="${C1}"] [data-gcamp="Heróis"]`).click();
    await F.locator('.modal #pgOk').waitFor();
    const destinos = await F.locator('.modal [name="pgdest"]').evaluateAll(rs => rs.map(r => r.value + ':' + r.closest('label').innerText.trim().split('\n')[0]));
    ok(destinos.length === 2 && /^:Do mundo/.test(destinos[0]) && destinos[1] === C2 + ':Geração 2', 'passar o grupo: os destinos são o mundo e a outra campanha — ' + JSON.stringify(destinos));
    await F.locator(`.modal [name="pgdest"][value="${C2}"]`).check(); await w(250);
    await F.locator('.modal #pgOk').click();
    ok(await ate(async () => /O grupo Heróis passou para a campanha Geração 2\./.test(await F.locator('.toast').innerText())), 'o aviso das Fichas diz para onde o grupo foi (com desfazer)');
    ok(await ate(async () => /Incluir Dalmo na campanha Geração 2\?/.test(await TM.locator('dialog[open] h2').innerText())), 'a casca pergunta se é para incluir o Dalmo (dono de uma ficha do grupo, que não participa dela)');
    ok(/A ficha Selene é dessa campanha, mas Dalmo não participa dela/.test(await TM.locator('dialog[open] p').first().innerText()), 'e diz o que acontece se ele ficar de fora: ' + await TM.locator('dialog[open] p').first().innerText());
    await TM.locator('dialog[open] .btn', { hasText: 'Cancelar' }).click(); await w(400);
    ok(await ate(async () => { b = await doBanco(); return b.fichas === `npc_esc:${C1},npc_pub:${C1},pc_a:${C2},pc_j:${C2}`; }), 'no banco, as duas fichas do grupo passaram para a Geração 2: ' + b.fichas);
    ok(b.docs.includes('fichas:grupos@' + C2), 'e a Geração 2 passa a ter o grupo na lista de grupos dela: ' + JSON.stringify(b.docs.filter(x => /^fichas:grupos/.test(x))));
    bl = await blocosDe(F);
    ok(bl[0].fichas === 'Guarda,Vilão' && bl[2].fichas === 'Dain,Selene', 'na tela do mestre, cada ficha no bloco da campanha dela: ' + JSON.stringify(bl.map(x => [x.nome, x.fichas])));
    // o Dalmo ficou de fora da Geração 2: da campanha, vê só a ficha dele
    let FA = await aba(TA, 'fichas');
    ok(await ate(async () => (await FA.locator('#lista .pc').count()) === 2, 25000), 'o Dalmo, que não participa da Geração 2, fica com duas fichas na lista');
    let blA = await blocosDe(FA);
    ok(blA.map(x => x.nome).join(' | ') === 'Geração do Dain | Outra campanha' && blA[0].fichas === 'Guarda' && blA[1].fichas === 'Selene',
      'a aberta da campanha dele e a ficha dele mesmo (num bloco "Outra campanha") — não a do Dain, que foi junto com o grupo; e nenhum bloco vazio (o do mundo, sem fichas, nem aparece para o jogador): ' + JSON.stringify(blA.map(x => [x.nome, x.fichas])));

    // ---------- o mestre coloca o Dalmo na Geração 2 (pela janela das campanhas) ----------
    await semAvisos(TM); await semAvisos(TA);
    await abrirMenu(TM); await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    await TM.locator(`#cp-lista .cpl[data-camp="${C2}"] [data-a="jogadores"]`).click(); await TM.locator('#f-jogadores').waitFor();
    ok(await TM.locator(`#cj-lista input[data-u="${ej.uid}"]`).isChecked() && !(await TM.locator(`#cj-lista input[data-u="${ea.uid}"]`).isChecked()), 'a janela dos jogadores da Geração 2 mostra o Visitante marcado e o Dalmo não');
    await TM.locator(`#cj-lista input[data-u="${ea.uid}"]`).check(); await TM.locator('#cj-ok').click();
    ok(await comAviso(TM, /Dalmo agora participa da campanha Geração 2\./), 'salvar: ' + await avisos(TM));
    await TM.keyboard.press('Escape'); await w(300);
    ok(await comAviso(TA, /O mestre colocou você na campanha Geração 2\./, 25000), 'o Dalmo é avisado: ' + await avisos(TA));
    FA = await aba(TA, 'fichas');
    ok(await ate(async () => { blA = await blocosDe(FA); return blA.length === 2 && blA[1].nome === 'Geração 2' && blA[1].fichas === 'Dain,Selene'; }, 25000), 'e agora vê o grupo inteiro, no bloco da Geração 2: ' + JSON.stringify(blA.map(x => [x.nome, x.fichas])));

    // ---------- dar uma ficha de campanha a quem não participa dela: a casca pergunta, e o mestre inclui ----------
    await semAvisos(TM);
    await abrirMenu(TM); await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    await TM.locator(`#cp-lista .cpl[data-camp="${C1}"] [data-a="jogadores"]`).click(); await TM.locator('#f-jogadores').waitFor();
    await TM.locator(`#cj-lista input[data-u="${ej.uid}"]`).uncheck(); await TM.locator('#cj-ok').click();
    ok(await comAviso(TM, /Visitante não participa mais da campanha Geração do Dain\./), 'o mestre tira o Visitante da Geração do Dain: ' + await avisos(TM));
    await TM.keyboard.press('Escape'); await w(300);
    ok(await ate(async () => (await estado(TJ)).lista.join() === 'Geração 2', 25000), 'o Visitante fica só com a Geração 2');
    await semAvisos(TM);
    F = await aba(TM, 'fichas');
    await F.locator('#lista .pc', { hasText: 'Guarda' }).click(); await w(400);
    const donos = (await F.locator('#f_dono option').allInnerTexts()).map(x => x.trim());
    ok(donos.includes('Dalmo') && donos.includes('Visitante — fora desta campanha'), 'em "Jogador que controla", quem não participa da campanha da ficha aparece marcado: ' + JSON.stringify(donos));
    await F.locator('#f_dono').selectOption({ label: 'Visitante — fora desta campanha' });
    ok(await ate(async () => /Incluir Visitante na campanha Geração do Dain\?/.test(await TM.locator('dialog[open] h2').innerText())), 'dar a ficha a ele faz a casca perguntar se é para incluí-lo na campanha');
    await TM.locator('dialog[open] button[type="submit"]').click();
    ok(await comAviso(TM, /Visitante agora participa da campanha Geração do Dain\./), 'com o "Incluir", ele passa a participar (com desfazer): ' + await avisos(TM));
    ok(await ate(async () => (await estado(TJ)).lista.join(' | ') === 'Geração do Dain | Geração 2', 25000), 'e a campanha volta à lista dele');
    ok(await ate(async () => { b = await doBanco(); return b.membros === 4; }), 'no banco: os dois jogadores, nas duas campanhas');

    // ---------- campanha encerrada: só consulta, para todos ----------
    const acampDe = async p => { let f = null; await ate(async () => { f = p.frames().find(x => x !== p.mainFrame() && /\/acampamento\//.test(x.url())) || null; return !!f && await f.evaluate(() => !!window.__acamp && __acamp.pronto); }, 25000); return f; };
    /* O Acampamento do mestre já está aberto quando a campanha é encerrada: ele tem de passar a "só consulta" sem ninguém
       recarregar nada (a casca abre os sistemas de novo quando uma campanha é encerrada ou reaberta). */
    await TM.locator('#tab-acampamento').click();
    ok(await (await acampDe(TM)).evaluate(() => __acamp.modo === 'mesa' && __acamp.papel === 'mestre'), '(o Acampamento da Geração do Dain está aberto na tela do mestre, e ele o mestra)');
    await semAvisos(TM);
    await abrirMenu(TM); await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    await TM.locator(`#cp-lista .cpl[data-camp="${C1}"] [data-a="encerrar"]`).click();
    ok(await ate(async () => /Encerrar a campanha Geração do Dain\?/.test(await TM.locator('dialog[open] h2').innerText())) && /só para consulta — para os jogadores e para você/.test(await TM.locator('dialog[open] p').first().innerText()), 'encerrar pede confirmação e diz o que muda');
    await TM.locator('dialog[open] button[type="submit"]').click();
    ok(await comAviso(TM, /Campanha Geração do Dain encerrada: agora é só para consulta\./), 'encerrada (com desfazer): ' + await avisos(TM));
    ok(await ate(async () => (await barra(TM)) === 'Geração do Dain (encerrada)'), 'a barra do mestre diz que a campanha em vista está encerrada');
    ok(await ate(async () => { const f = await acampDe(TM); return !!f && await f.evaluate(() => __acamp.papel === 'jogador' && /Campanha encerrada: só consulta/.test(document.getElementById('salvo').textContent)); }, 25000),
      'o Acampamento dela, que já estava aberto na tela do mestre, passa a ser só para consulta — sem ninguém recarregar nada');
    ok(await TM.locator('#msg').isDisabled() && /Campanha encerrada: só consulta\. Para jogar nela de novo, reabra em Campanhas…/.test(await TM.locator('#dicaFechada').innerText()), 'a conversa dela fica travada para o mestre, com o motivo e o caminho para reabrir');
    // (o que chegaria por outro caminho — a rolagem de uma ficha, do Rolador, de um token; limpar a conversa — o núcleo recusa na hora, e diz por quê)
    const recusasDoNucleo = await TM.evaluate(async () => { const t = async f => { try { await f(); return 'foi'; } catch (e) { return e.message; } }; return [await t(() => TC.aoVivo.fala('fala fora de hora')), await t(() => TC.aoVivo.rolagem({ expr: '1d6', total: 3, dados: [3] })), await t(() => TC.aoVivo.limpar())]; });
    ok(recusasDoNucleo.length === 3 && recusasDoNucleo.every(x => /^Esta campanha está encerrada: só consulta\. Para mexer nela, o mestre a reabre no menu da mesa\.$/.test(x)), 'e uma fala, uma rolagem ou uma limpeza mandadas por outro caminho são recusadas na hora, com o motivo: ' + JSON.stringify(recusasDoNucleo));
    ok(await ate(async () => (await barra(TA)) === 'Geração do Dain (encerrada)' && await TA.locator('#msg').isDisabled(), 25000) && (await TA.locator('#dicaFechada').innerText()).trim() === 'Campanha encerrada: só consulta.', 'e para o jogador que está nela (sem o caminho de reabrir, que é do mestre)');
    ok(await noFeed(TA, 'boa noite, mesa'), 'o jogador continua lendo a conversa da campanha encerrada');
    F = await aba(TM, 'fichas');
    ok(await ate(async () => { bl = await blocosDe(F); return bl.length === 3 && bl[0].tag === 'encerrada'; }), 'nas Fichas, o bloco dela aparece como encerrado');
    await F.locator('#lista .pc', { hasText: 'Guarda' }).click(); await w(500);
    ok(await F.locator('#f_nome').isDisabled() && /Campanha encerrada: esta ficha é só para consulta\. Para mexer nela, reabra a campanha/.test(await F.locator('.so-consulta').innerText()), 'e a ficha dela abre só para consulta, para o mestre também');
    ok(await F.locator(`#lista .bloco[data-bloco="${C1}"] [data-gcamp]`).count() === 0, 'os grupos dela não têm como ser passados adiante');
    // (as missões dela — as do grupo e as da ficha — também: sem botão de criar, e com o motivo)
    await F.locator('#ficha [data-sub="missoes"]').click(); await w(300);
    const missoesFechadas = { novas: await F.locator('#blocoMissoes [data-misnova]').count(), texto: (await F.locator('#blocoMissoes').innerText()).replace(/\s+/g, ' ') };
    ok(missoesFechadas.novas === 0 && /campanha encerrada: só consulta/i.test(missoesFechadas.texto), 'as missões da campanha encerrada são só para consulta (não há como criar missão do grupo nem da ficha): ' + missoesFechadas.texto.slice(0, 160));
    // ("Apagar dados", com a campanha encerrada em vista, não leva ficha nenhuma — e diz por quê)
    await F.locator('button', { hasText: 'Apagar dados' }).first().click(); await w(300);
    const dscEncerrada = (await F.locator('.flushitem', { hasText: 'Personagens' }).innerText()).replace(/\s+/g, ' ');
    ok(/^Personagens nenhuma ficha: a campanha Geração do Dain está encerrada, e as fichas dela não se apagam/.test(dscEncerrada), '"Apagar dados" não leva as fichas de uma campanha encerrada, e diz por quê: ' + dscEncerrada);
    // (…e, confirmado até o fim mesmo assim, não apaga nenhuma: nem tenta — nada chega a ser recusado pelo núcleo)
    await TM.evaluate(() => { window.__recusadas = []; TC.dados.on('recusado', (nome, id) => window.__recusadas.push(nome + ':' + id)); });
    const vivasDaC1 = () => noBanco(async ([mesa, c1]) => ((await window.__sb.from('personagens').select('id,apagado').eq('mesa_id', mesa).eq('campanha', c1)).data || []).filter(x => !x.apagado).map(x => x.id).sort().join(','), [mesaT, C1]);
    const antesDeApagar = await vivasDaC1(), naTelaAntes = (await blocosDe(F))[0].fichas;
    await F.locator('[data-alvo="personagens"]').check(); await F.locator('#flushNext').click(); await w(300);
    await F.locator('#f2Palavra').fill('APAGAR'); await F.locator('#f2Go').click(); await w(2500);
    ok(antesDeApagar.split(',').length >= 2 && await vivasDaC1() === antesDeApagar && (await blocosDe(F))[0].fichas === naTelaAntes && (await TM.evaluate(() => window.__recusadas)).length === 0,
      'confirmado até o fim, nenhuma ficha da campanha encerrada some — nem da tela, nem do banco — e nada chega a ser recusado: ' + JSON.stringify([antesDeApagar, await vivasDaC1(), await TM.evaluate(() => window.__recusadas)]));
    // (na Árvore, o personagem novo não tem como nascer na campanha encerrada: nasce no mundo, como nas Fichas — não fica só no navegador)
    await TM.locator('#tab-arvore').click();
    let ARV = null;
    await ate(async () => { ARV = TM.frames().find(x => x !== TM.mainFrame() && /\/arvore\//.test(x.url())) || null; return !!ARV && await ARV.evaluate(() => typeof ArvoreMesa === 'object' && ArvoreMesa.ativo() && typeof doc === 'object' && !!doc); }, 25000);
    const semCasa = await ARV.evaluate(() => { registrar('novo personagem'); const p = personagemNovo('Sem campanha', bib()); doc.personagens.push(p); ui.personagem = p.id; salvar(); pintarTudo(); return p.id; });
    const linhaSemCasa = () => noBanco(async ([mesa, id]) => (await window.__sb.from('personagens').select('id,campanha').eq('mesa_id', mesa).eq('id', id).maybeSingle()).data, [mesaT, semCasa]);
    ok(await ate(async () => { const l = await linhaSemCasa(); return !!l && l.campanha === null; }) && await TM.evaluate(() => TC.dados.pendentes === 0 && !TC.dados.erro), 'na Árvore, o personagem criado com a campanha encerrada em vista nasce no mundo (e é gravado: não fica só no navegador): ' + JSON.stringify(await linhaSemCasa()));
    await noBanco(async ([mesa, id]) => { await window.__sb.from('personagens').update({ apagado: true }).eq('mesa_id', mesa).eq('id', id); }, [mesaT, semCasa]);
    await w(1200);
    // reabrir
    await semAvisos(TM);
    await abrirMenu(TM); await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    ok(/encerrada/.test(await TM.locator(`#cp-lista .cpl[data-camp="${C1}"]`).innerText()) && await TM.locator(`#cp-lista .cpl[data-camp="${C1}"] [data-a="reabrir"]`).count() === 1, 'na janela das campanhas ela aparece encerrada, com "Reabrir"');
    await TM.locator(`#cp-lista .cpl[data-camp="${C1}"] [data-a="reabrir"]`).click();
    ok(await comAviso(TM, /Campanha Geração do Dain reaberta: dá para jogar nela de novo\./), 'reaberta: ' + await avisos(TM));
    await TM.keyboard.press('Escape'); await w(300);
    ok(await ate(async () => (await barra(TA)) === 'Geração do Dain' && !(await TA.locator('#msg').isDisabled()), 25000), 'o jogador volta a poder falar nela');
    await falar(TA, 'voltamos!');
    ok(await noFeed(TM, 'voltamos!'), 'e a fala chega ao mestre');

    // ---------- cada campanha tem o seu acampamento ----------
    await TM.locator('#tab-acampamento').click();
    let AC = await acampDe(TM);
    ok(await AC.evaluate(() => __acamp.modo === 'mesa' && __acamp.papel === 'mestre'), 'o mestre abre o Acampamento da Geração do Dain');
    await AC.evaluate(() => __acamp.mudar('preparar', c => { c.nome = 'Clareira do Dain'; }));
    ok(await ate(async () => { b = await doBanco(); return b.docs.includes('acampamento@' + C1) && !b.docs.includes('acampamento'); }), 'o acampamento fica guardado como o da campanha: ' + JSON.stringify(b.docs.filter(x => /^acampamento/.test(x))));
    await abrirMenu(TM); await TM.locator(`#mn-camp .cv[data-camp="${C2}"]`).click();
    ok(await ate(async () => (await barra(TM)) === 'Geração 2'), 'o mestre passa para a Geração 2');
    AC = await acampDe(TM);
    ok(await ate(async () => await AC.evaluate(() => __acamp.camp.nome !== 'Clareira do Dain')), 'o acampamento dela é outro (não traz o nome do primeiro)');
    await AC.evaluate(() => __acamp.mudar('preparar', c => { c.nome = 'Vau da Geração 2'; }));
    ok(await ate(async () => { b = await doBanco(); return b.docs.includes('acampamento@' + C1) && b.docs.includes('acampamento@' + C2); }), 'e fica guardado à parte: ' + JSON.stringify(b.docs.filter(x => /^acampamento/.test(x))));
    await TJ.locator('#tab-acampamento').click();
    const ACJ = await acampDe(TJ);
    ok(await ate(async () => await ACJ.evaluate(() => __acamp.papel === 'jogador' && __acamp.camp.nome === 'Vau da Geração 2'), 25000), 'o Visitante, com a Geração 2 em vista, vê o acampamento dela');
    await TA.locator('#tab-acampamento').click();
    const ACA = await acampDe(TA);
    ok(await ate(async () => await ACA.evaluate(() => __acamp.camp.nome === 'Clareira do Dain'), 25000), 'e o Dalmo, com a Geração do Dain em vista, o da dele');

    // ---------- uma campanha vazia: criar, desfazer pelo aviso; criar de novo e apagar ----------
    await semAvisos(TM);
    await abrirMenu(TM); await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    await TM.locator('#cp-nome').fill('Engano'); await TM.locator('#cp-criar').click();
    ok(await ate(async () => (await TM.locator('#cp-lista .cpl').count()) === 3), 'uma terceira campanha, criada por engano');
    await TM.locator('#toasts .toast button', { hasText: 'Desfazer' }).click();
    ok(await comAviso(TM, /Desfeito: a campanha Engano não existe mais\./) && await ate(async () => (await TM.locator('#cp-lista .cpl').count()) === 2), 'o "Desfazer" do aviso a tira da lista');
    await TM.locator('#cp-nome').fill('Vazia'); await TM.locator('#cp-criar').click();
    ok(await ate(async () => (await TM.locator('#cp-lista .cpl').count()) === 3), 'outra, para apagar pela janela');
    await semAvisos(TM);
    await TM.locator('#cp-lista .cpl', { hasText: 'Vazia' }).locator('[data-a="apagar"]').click();
    ok(await ate(async () => /Apagar a campanha Vazia\?/.test(await TM.locator('dialog[open] h2').innerText())), 'apagar pede confirmação');
    await TM.locator('dialog[open] button[type="submit"]').click();
    ok(await comAviso(TM, /Campanha Vazia apagada\./) && await ate(async () => (await estado(TM)).lista.length === 2), 'a campanha vazia é apagada');
    // a que tem fichas não se apaga: o banco diz o motivo, e ele aparece na janela
    await abrirMenu(TM); await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
    await TM.locator(`#cp-lista .cpl[data-camp="${C2}"] [data-a="apagar"]`).click();
    await TM.locator('dialog[open] button[type="submit"]').click();
    ok(await ate(async () => /Esta campanha ainda tem fichas/.test(await TM.locator('dialog[open] .err').innerText())), 'apagar uma campanha com fichas: a janela mostra o motivo — ' + await TM.locator('dialog[open] .err').innerText());
    await TM.keyboard.press('Escape'); await w(300);

    // ---------- quem fica sem campanha vê só o que é do mundo ----------
    await semAvisos(TA);
    for (const cid of [C1, C2]) {
      await abrirMenu(TM); await TM.locator('#mn-campanhas').click(); await TM.locator('#f-camps').waitFor();
      await TM.locator(`#cp-lista .cpl[data-camp="${cid}"] [data-a="jogadores"]`).click(); await TM.locator('#f-jogadores').waitFor();
      await TM.locator(`#cj-lista input[data-u="${ea.uid}"]`).uncheck(); await TM.locator('#cj-ok').click(); await w(600);
      await TM.keyboard.press('Escape'); await w(300);
    }
    ok(await ate(async () => { const e = await estado(TA); return e.lista.length === 0 && e.tem === true && e.vista === null; }, 25000), 'tirado das duas campanhas, o Dalmo fica sem campanha (mas sabe que a mesa tem campanhas)');
    ok(/não participa mais de (uma das campanhas|nenhuma campanha) desta mesa/.test(await avisos(TA)) || await comAviso(TA, /não participa mais de nenhuma campanha desta mesa: por enquanto, vê só o que é do mundo\./, 12000), 'e é avisado: ' + await avisos(TA));
    ok(await barra(TA) === '', 'a barra dele fica sem campanha');
    await abrirMenu(TA);
    ok(/O mestre ainda não colocou você em nenhuma campanha desta mesa/.test(await TA.locator('#mn-semcamp').innerText()), 'o menu dele explica: ' + await TA.locator('#mn-semcamp').innerText());
    await fecharMenu(TA);
    ok(await ate(async () => foraDoFeed(TA, 'boa noite, mesa')), 'a conversa das campanhas sai da tela dele');
    await abrirMenu(TM);
    ok(/sem campanha/.test(await TM.locator(`#membros .mb[data-m="${ea.uid}"]`).innerText()), 'no menu do mestre, o Dalmo aparece como "sem campanha"');
    await fecharMenu(TM);
    await falar(TA, 'alguém aí?');
    ok(await noFeed(TA, 'alguém aí?') && await noFeed(TM, 'alguém aí?') && await noFeed(TJ, 'alguém aí?'), 'o que ele diz vai para o mundo: chega a todos, em qualquer campanha');
  } finally {
    const x = await TM.evaluate(async mesa => { const r = await window.__sb.from('mesas').delete().eq('id', mesa).select('id'); return r.error ? r.error.message : (r.data || []).length; }, mesaT).catch(e => String(e.message).split('\n')[0]);
    ok(x === 1, 'a mesa da tela é apagada no fim: ' + x);
  }
  }
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
