// O mestre auxiliar, no banco de verdade (projeto real). Três contas: o mestre, quem vira auxiliar e um jogador.
//   · só o mestre nomeia (e tira) o auxiliar e escolhe as abas dele; ninguém se nomeia sozinho;
//   · mestrando, o auxiliar recebe e mexe no que é do mestre — só nas abas liberadas;
//   · sem a aba Fichas não recebe ficha escondida nem os segredos, não troca dono/visibilidade nem apaga; a ficha que
//     os jogadores veem ele mexe;
//   · não administra: não renomeia a mesa, não vê nem troca o código de convite, não tira ninguém, não nomeia;
//   · jogando como jogador, o banco o trata como jogador — e ele volta a mestrar quando quiser;
//   · sai da mesa (ou é tirado) como qualquer jogador; quem volta pelo código volta jogador.
// A parte da tela (menu da mesa, botão de jogar/mestrar, abas) está mais abaixo, no mesmo arquivo.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  const abre = async name => { const d = await t.device({ name }); await d.page.goto(t.base + 'src/tests/vazio.html', { waitUntil: 'load' }); return d.page; };
  const SO = process.env.SO || '';                      // SO=tela: só a parte da tela · SO=banco: só a do banco
  const [M, A, J] = [await abre('mestre'), await abre('auxiliar'), await abre('jogador')];
  const em = await entrar(M, c.mestre, c.senha, 'Bruno'), ea = await entrar(A, c.jog1, c.senha, 'Dalmo'), ej = await entrar(J, c.jog2, c.senha, 'Visitante');
  ok(em.uid && ea.uid && ej.uid, 'as três contas entram');
  const nomeMesa = 'Auxiliar E2E ' + Date.now().toString(36);
  if (SO !== 'tela') {
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
    // ---------- o que o mestre guarda na mesa: fichas e um documento de cada aba ----------
    const DOCS = [
      ['cenas:indice', 'mestre'], ['cena:c1:m', 'mestre'], ['cena:pub:m', 'mesa'], ['mundo:mapa:x', 'mestre'], ['mundo:pub:x', 'mesa'], ['acampamento', 'mesa'],
      ['fichas:segredos', 'mestre'], ['fichas:cfg', 'mesa'], ['arvore:biblioteca', 'mestre'], ['arvore:pacote', 'mesa'], ['rol:h:1', 'mestre'], ['outro:x', 'mestre'],
    ];
    const prep = await M.evaluate(async ([mesa, aux, docs]) => {
      const erros = [];
      const p = await sb.from('personagens').insert([
        { mesa_id: mesa, id: 'pc_aux', nome: 'Selene', dono_id: aux, vis: 'mesa', ficha: { nome: 'Selene' }, estado: { rec: { hp: 10 } } },
        { mesa_id: mesa, id: 'npc_pub', nome: 'Guarda', vis: 'mesa', ficha: { nome: 'Guarda' }, estado: { rec: { hp: 20 } } },
        { mesa_id: mesa, id: 'npc_esc', nome: 'Vilão', vis: 'mestre', ficha: { nome: 'Vilão', recursos: [{ id: 'hp', nome: 'HP', fml: '50' }, { id: 'sp', nome: 'SP', fml: '20' }] }, estado: { rec: { sp: 20 }, outra: 'coisa' } },
      ]);
      if (p.error) erros.push('fichas: ' + p.error.message);
      const d = await sb.from('documentos').insert(docs.map(([id, vis]) => ({ mesa_id: mesa, id, vis, dados: { v: 1, de: id } })));
      if (d.error) erros.push('documentos: ' + d.error.message);
      const r = await sb.from('registro').insert([
        { mesa_id: mesa, id: 'm_pub', tipo: 'fala', secreta: false, dados: { texto: 'boa noite' } },      // (numa lista, toda linha leva as mesmas colunas)
        { mesa_id: mesa, id: 'r_sec', tipo: 'rolagem', secreta: true, dados: { k: 'tabela', titulo: 'segredo do mestre', total: 3 } },
      ]);
      if (r.error) erros.push('registro: ' + r.error.message);
      return erros;
    }, [mesa, ea.uid, DOCS]);
    ok(prep.length === 0, 'o mestre guarda três fichas, um documento de cada aba e duas linhas na mesa ao vivo' + (prep.length ? ' — ' + prep.join(' · ') : ''));

    // O que uma pessoa enxerga e consegue fazer agora. Cada tentativa de escrita usa um nome próprio (n), para uma
    // rodada não esbarrar no que a outra deixou.
    let rodada = 0;
    const sonda = async (p, o = {}) => p.evaluate(async ([mesa, n, o]) => {
      const uid = (await sb.auth.getUser()).data.user.id;
      const ids = async tb => { const r = await sb.from(tb).select('id').eq('mesa_id', mesa); return r.error ? 'erro: ' + r.error.message : r.data.map(x => x.id).sort(); };
      const mudou = r => (r.error ? 'recusado: ' + r.error.message : (r.data || []).length ? 'ok' : 'nada');
      const criou = r => (r.error ? 'recusado' : 'ok');
      const out = { uid, docs: await ids('documentos'), fichas: await ids('personagens'), registro: await ids('registro') };
      const eu = await sb.from('mesa_membros').select('papel, jogando, abas').eq('mesa_id', mesa).eq('usuario_id', uid).maybeSingle();
      out.eu = eu.data ? eu.data.papel + (eu.data.jogando ? ' jogando' : '') + ' [' + eu.data.abas.join(',') + ']' : 'fora';
      // documentos: editar o do mestre e criar um novo, em cada aba
      out.editar = {}; out.criar = {};
      for (const [aba, id, novo] of [['cenas', 'cena:c1:m', 'cena:n' + n + ':m'], ['mundo', 'mundo:mapa:x', 'mundo:mapa:n' + n], ['acampamento', 'acampamento', 'acampamento@n' + n], ['fichas', 'fichas:segredos', 'fichas:n' + n],
        ['arvore', 'arvore:biblioteca', 'arvore:n' + n], ['rolador', 'rol:h:1', 'rol:h:n' + n], ['outro', 'outro:x', 'outro:n' + n]]) {
        out.editar[aba] = mudou(await sb.from('documentos').update({ dados: { v: 2, por: uid, n } }).eq('mesa_id', mesa).eq('id', id).select('id'));
        out.criar[aba] = criou(await sb.from('documentos').insert({ mesa_id: mesa, id: novo, vis: 'mestre', dados: { v: 1 } }));
      }
      // fichas
      out.estadoPub = mudou(await sb.rpc('personagem_juntar', { p_mesa: mesa, p_id: 'npc_pub', p_coluna: 'estado', p_mudas: [{ rec: { hp: 20 - n } }] }).then(r => (r.error ? r : { data: r.data && r.data.length ? r.data : [] })));
      out.fichaPub = mudou(await sb.from('personagens').update({ ficha: { nome: 'Guarda', n } }).eq('mesa_id', mesa).eq('id', 'npc_pub').select('id'));
      out.fichaEsc = mudou(await sb.from('personagens').update({ ficha: { nome: 'Vilão', n } }).eq('mesa_id', mesa).eq('id', 'npc_esc').select('id'));
      out.esconderPub = mudou(await sb.from('personagens').update({ vis: 'mestre' }).eq('mesa_id', mesa).eq('id', 'npc_pub').select('id'));
      if (out.esconderPub === 'ok') await sb.from('personagens').update({ vis: 'mesa' }).eq('mesa_id', mesa).eq('id', 'npc_pub');
      out.tomarPub = mudou(await sb.from('personagens').update({ dono_id: uid }).eq('mesa_id', mesa).eq('id', 'npc_pub').select('id'));
      if (out.tomarPub === 'ok') await sb.from('personagens').update({ dono_id: null }).eq('mesa_id', mesa).eq('id', 'npc_pub');
      out.apagarPub = mudou(await sb.from('personagens').update({ apagado: true }).eq('mesa_id', mesa).eq('id', 'npc_pub').select('id'));
      if (out.apagarPub === 'ok') await sb.from('personagens').update({ apagado: false }).eq('mesa_id', mesa).eq('id', 'npc_pub');
      out.criarNpc = criou(await sb.from('personagens').insert({ mesa_id: mesa, id: 'npc_n' + n + '_' + uid.slice(0, 4), nome: 'NPC novo', vis: 'mestre', ficha: {} }));
      // mesa ao vivo
      out.rolarSecreta = criou(await sb.from('registro').insert({ mesa_id: mesa, id: 'sec_' + n + '_' + uid.slice(0, 4), tipo: 'rolagem', secreta: true, dados: { k: 'tabela', titulo: 'secreta', total: 1 } }));
      out.mexerNaDoOutro = mudou(await sb.from('registro').update({ dados: { texto: 'boa noite (' + n + ')' } }).eq('mesa_id', mesa).eq('id', 'm_pub').select('id'));
      // administrar
      out.renomear = mudou(await sb.from('mesas').update({ nome: o.nome + ' x' }).eq('id', mesa).select('id'));
      if (out.renomear === 'ok') await sb.from('mesas').update({ nome: o.nome }).eq('id', mesa);
      const cv = await sb.from('mesa_convites').select('codigo').eq('mesa_id', mesa);
      out.verCodigo = cv.error ? 'recusado' : cv.data.length ? 'ok' : 'nada';
      out.tirar = o.outro ? mudou(await sb.from('mesa_membros').delete().eq('mesa_id', mesa).eq('usuario_id', o.outro).select('usuario_id')) : '-';
      out.nomear = o.outro ? criou(await sb.rpc('definir_auxiliar', { p_mesa: mesa, p_usuario: o.outro, p_auxiliar: true })) : '-';
      out.nomearASi = criou(await sb.rpc('definir_auxiliar', { p_mesa: mesa, p_usuario: uid, p_auxiliar: true, p_abas: ['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador'] }));
      out.papelNaMao = criou(await sb.from('mesa_membros').update({ papel: 'mestre' }).eq('mesa_id', mesa).eq('usuario_id', uid));
      out.abasNaMao = criou(await sb.from('mesa_membros').update({ abas: ['fichas'] }).eq('mesa_id', mesa).eq('usuario_id', uid));
      out.modoNaMao = criou(await sb.from('mesa_membros').update({ jogando: false }).eq('mesa_id', mesa).eq('usuario_id', uid));
      // imagens: a pasta da mesa
      const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), ch => ch.charCodeAt(0));
      const caminho = mesa + '/teste_' + n + '_' + uid.slice(0, 4) + '.png';
      const up = await sb.storage.from('mesas').upload(caminho, new Blob([png], { type: 'image/png' }), { contentType: 'image/png', upsert: false });
      out.subirNaPasta = up.error ? 'recusado' : 'ok';
      const li = await sb.storage.from('mesas').list(mesa, { limit: 100 });
      out.verPasta = li.error ? 'recusado' : (li.data || []).filter(x => x.id).length;
      if (!up.error) await sb.storage.from('mesas').remove([caminho]);
      return out;
    }, [mesa, ++rodada, Object.assign({ nome: nomeMesa }, o)]);
    const tem = (l, ...ids) => Array.isArray(l) && ids.every(id => l.includes(id));
    const semNenhum = (l, ...ids) => Array.isArray(l) && ids.every(id => !l.includes(id));
    const abasDe = (s, campo) => Object.keys(s[campo]).filter(k => s[campo][k] === 'ok').sort().join(',');
    const DO_MESTRE = ['cenas:indice', 'cena:c1:m', 'mundo:mapa:x', 'fichas:segredos', 'arvore:biblioteca', 'rol:h:1', 'outro:x'], DA_MESA = ['cena:pub:m', 'mundo:pub:x', 'acampamento', 'fichas:cfg', 'arvore:pacote'];
    const comoJogador = (s, quem) => {
      ok(tem(s.docs, ...DA_MESA) && semNenhum(s.docs, ...DO_MESTRE), quem + ': dos documentos, só os que a mesa toda vê — ' + JSON.stringify(s.docs));
      ok(tem(s.fichas, 'npc_pub', 'pc_aux') && semNenhum(s.fichas, 'npc_esc'), quem + ': das fichas, só as visíveis — ' + JSON.stringify(s.fichas));
      ok(tem(s.registro, 'm_pub') && semNenhum(s.registro, 'r_sec'), quem + ': da mesa ao vivo, não a rolagem secreta do mestre');
      ok(abasDe(s, 'editar') === '' && abasDe(s, 'criar') === '', quem + ': não edita nem cria documento de mestre em aba nenhuma — ' + JSON.stringify([s.editar, s.criar]));
      ok(s.fichaEsc === 'nada' && s.esconderPub !== 'ok' && s.tomarPub !== 'ok' && s.apagarPub !== 'ok' && s.criarNpc === 'recusado', quem + ': não mexe em ficha escondida, não esconde, não toma, não apaga, não cria NPC — ' + JSON.stringify([s.fichaEsc, s.esconderPub, s.tomarPub, s.apagarPub, s.criarNpc]));
      ok(s.rolarSecreta === 'recusado' && s.mexerNaDoOutro === 'nada', quem + ': não rola em segredo nem mexe na linha dos outros — ' + JSON.stringify([s.rolarSecreta, s.mexerNaDoOutro]));
      ok(s.subirNaPasta === 'recusado' && s.verPasta === 0, quem + ': não envia imagem para a pasta da mesa nem a lista — ' + JSON.stringify([s.subirNaPasta, s.verPasta]));
    };
    const naoAdministra = (s, quem) => {
      ok(s.renomear === 'nada' && s.verCodigo === 'nada' && s.tirar === 'nada' && s.nomear === 'recusado', quem + ': não renomeia a mesa, não vê o código, não tira ninguém, não nomeia — ' + JSON.stringify([s.renomear, s.verCodigo, s.tirar, s.nomear]));
      ok(s.nomearASi === 'recusado' && s.papelNaMao === 'recusado' && s.abasNaMao === 'recusado' && s.modoNaMao === 'recusado', quem + ': não se nomeia nem muda o próprio papel, as abas ou o modo direto na tabela — ' + JSON.stringify([s.nomearASi, s.papelNaMao, s.abasNaMao, s.modoNaMao]));
    };

    // ---------- antes de tudo: os dois são jogadores ----------
    let s = await sonda(A, { outro: ej.uid });
    ok(s.eu === 'jogador []', 'quem entra pelo código é jogador, sem abas: ' + s.eu);
    comoJogador(s, 'jogador'); naoAdministra(s, 'jogador');
    ok(s.estadoPub === 'nada' && s.fichaPub === 'nada', 'jogador: não mexe na ficha pública que não é dele — ' + JSON.stringify([s.estadoPub, s.fichaPub]));
    const jogar0 = await A.evaluate(async mesa => { const r = await sb.rpc('auxiliar_jogar', { p_mesa: mesa, p_jogando: true }); return r.error ? r.error.message : 'ACEITO'; }, mesa);
    ok(/não é mestre auxiliar/.test(jogar0), 'jogador comum não tem o que alternar: "' + jogar0 + '"');

    // ---------- o mestre nomeia, com duas abas ----------
    const nomear = (quem, sim, abas) => M.evaluate(async ([mesa, quem, sim, abas]) => { const r = await sb.rpc('definir_auxiliar', abas === undefined ? { p_mesa: mesa, p_usuario: quem, p_auxiliar: sim } : { p_mesa: mesa, p_usuario: quem, p_auxiliar: sim, p_abas: abas }); return r.error ? { erro: r.error.message } : r.data; }, [mesa, quem, sim, abas]);
    let n1 = await nomear(ea.uid, true, ['rolador', 'cenas', 'cenas', 'inventada']);
    ok(n1.papel === 'auxiliar' && n1.jogando === false && JSON.stringify(n1.abas) === '["cenas","rolador"]', 'o mestre nomeia o auxiliar com as abas pedidas (na ordem de sempre, sem repetir, sem nome inventado): ' + JSON.stringify(n1));
    s = await sonda(A, { outro: ej.uid });
    ok(s.eu === 'auxiliar [cenas,rolador]', 'o auxiliar vê o próprio papel: ' + s.eu);
    ok(tem(s.docs, 'cenas:indice', 'cena:c1:m', 'rol:h:1', ...DA_MESA) && semNenhum(s.docs, 'mundo:mapa:x', 'fichas:segredos', 'arvore:biblioteca', 'outro:x'), 'auxiliar (Cenas e Rolador): recebe os documentos de mestre dessas abas, e só delas — ' + JSON.stringify(s.docs));
    ok(abasDe(s, 'editar') === 'cenas,rolador' && abasDe(s, 'criar') === 'cenas,rolador', 'auxiliar (Cenas e Rolador): edita e cria nessas abas, e só nelas — ' + JSON.stringify([s.editar, s.criar]));
    ok(tem(s.fichas, 'npc_pub', 'pc_aux') && semNenhum(s.fichas, 'npc_esc'), 'sem a aba Fichas, a ficha escondida não chega: ' + JSON.stringify(s.fichas));
    ok(s.estadoPub === 'ok' && s.fichaPub === 'ok', 'mestrando, ele mexe na ficha que os jogadores veem (barras e o resto) — ' + JSON.stringify([s.estadoPub, s.fichaPub]));
    ok(s.fichaEsc === 'nada' && /Só o mestre/.test(s.esconderPub) && /Só o mestre/.test(s.tomarPub) && /Só o mestre/.test(s.apagarPub) && s.criarNpc === 'recusado', 'sem a aba Fichas: não mexe na escondida, não esconde, não toma, não apaga, não cria NPC — ' + JSON.stringify([s.fichaEsc, s.esconderPub, s.tomarPub, s.apagarPub, s.criarNpc]));
    ok(s.rolarSecreta === 'ok' && s.mexerNaDoOutro === 'ok', 'mestrando, rola em segredo e mexe na linha dos outros — ' + JSON.stringify([s.rolarSecreta, s.mexerNaDoOutro]));
    ok(semNenhum(s.registro, 'r_sec'), 'a rolagem secreta do mestre continua só do mestre');
    ok(s.subirNaPasta === 'ok' && s.verPasta >= 1, 'mestrando, envia imagem para a pasta da mesa — ' + JSON.stringify([s.subirNaPasta, s.verPasta]));
    naoAdministra(s, 'auxiliar');
    // o mestre não vê a secreta do auxiliar (cada um vê só as suas)
    const secM = await M.evaluate(async mesa => (await sb.from('registro').select('id').eq('mesa_id', mesa).eq('secreta', true)).data.map(x => x.id), mesa);
    ok(secM.length === 1 && secM[0] === 'r_sec', 'a rolagem secreta do auxiliar é só dele: o mestre vê só a própria — ' + JSON.stringify(secM));
    // as barras de uma ficha escondida, pelo token ("às cegas"): só quem mestra as Cenas; só as barras que a ficha tem
    const barras = (p, id, rec, sob) => p.evaluate(async ([mesa, id, rec, sob]) => { const r = await sb.rpc('barras_do_token', { p_mesa: mesa, p_id: id, p_rec: rec, p_sob: sob }); return r.error ? { erro: r.error.message } : { linhas: (r.data || []).length, chaves: r.data && r.data[0] ? Object.keys(r.data[0]).sort().join(',') : '' }; }, [mesa, id, rec, sob]);
    const estadoDoVilao = () => M.evaluate(async mesa => (await sb.from('personagens').select('estado').eq('mesa_id', mesa).eq('id', 'npc_esc').single()).data.estado, mesa);
    let b1 = await barras(A, 'npc_esc', { hp: 37, inventada: 9, sp: 'muito' }, { hp: 4, sp: 0 });
    let ev = await estadoDoVilao();
    ok(b1.linhas === 1 && b1.chaves === 'rev,rev_ant', 'o auxiliar (com as Cenas, sem as Fichas) leva à ficha escondida as barras do token — e não recebe nada da ficha de volta: ' + JSON.stringify(b1));
    ok(ev.rec.hp === 37 && ev.rec.sp === 20 && !('inventada' in ev.rec) && ev.sob.hp === 4 && !('sp' in ev.sob) && ev.outra === 'coisa', 'só entram as barras que a ficha tem, com número; o resto do estado fica como estava — ' + JSON.stringify(ev));
    b1 = await barras(A, 'npc_esc', { hp: -5 }, { hp: 0 });
    ev = await estadoDoVilao();
    ok(ev.rec.hp === -5 && !('hp' in ev.sob), 'barra negativa vale; sobrevida zerada sai — ' + JSON.stringify(ev));
    b1 = await barras(A, 'nao_existe', { hp: 1 }, null);
    ok(b1.linhas === 0, 'ficha que não existe: nada acontece — ' + JSON.stringify(b1));
    b1 = await barras(A, 'npc_esc', [1, 2], null);
    ok(/inválida/.test(b1.erro || ''), 'pedido malfeito é recusado: "' + b1.erro + '"');
    b1 = await barras(J, 'npc_esc', { hp: 1 }, null);
    ok(/Só o mestre/.test(b1.erro || ''), 'o jogador não usa esse caminho: "' + b1.erro + '"');
    ok((await estadoDoVilao()).rec.hp === -5, '(e a ficha não mudou)');
    // o jogador comum não ganhou nada com isso
    s = await sonda(J, { outro: ea.uid });
    comoJogador(s, 'o outro jogador'); naoAdministra(s, 'o outro jogador');

    // ---------- jogando como jogador ----------
    const jogar = v => A.evaluate(async ([mesa, v]) => { const r = await sb.rpc('auxiliar_jogar', { p_mesa: mesa, p_jogando: v }); return r.error ? { erro: r.error.message } : r.data; }, [mesa, v]);
    let j1 = await jogar(true);
    ok(j1.papel === 'auxiliar' && j1.jogando === true && j1.abas.length === 2, 'o auxiliar passa a jogar como jogador (e continua auxiliar, com as abas): ' + JSON.stringify([j1.papel, j1.jogando, j1.abas]));
    s = await sonda(A, { outro: ej.uid });
    ok(s.eu === 'auxiliar jogando [cenas,rolador]', '(o papel dele agora: ' + s.eu + ')');
    comoJogador(s, 'auxiliar jogando'); naoAdministra(s, 'auxiliar jogando');
    b1 = await barras(A, 'npc_esc', { hp: 2 }, null);
    ok(/Só o mestre/.test(b1.erro || ''), 'auxiliar jogando: não leva barras à ficha pelo token — "' + b1.erro + '"');
    ok(s.estadoPub === 'nada' && s.fichaPub === 'nada', 'auxiliar jogando: não mexe mais na ficha pública que não é dele — ' + JSON.stringify([s.estadoPub, s.fichaPub]));
    const dele = await A.evaluate(async mesa => { const r = await sb.from('personagens').update({ ficha: { nome: 'Selene', ok: 1 } }).eq('mesa_id', mesa).eq('id', 'pc_aux').select('id'); return (r.data || []).length; }, mesa);
    ok(dele === 1, 'auxiliar jogando: a ficha dele continua dele');
    j1 = await jogar(false);
    ok(j1.jogando === false, 'e volta a mestrar quando quer');
    s = await sonda(A, { outro: ej.uid });
    ok(abasDe(s, 'editar') === 'cenas,rolador' && s.rolarSecreta === 'ok', 'de volta: mestra de novo as abas dele — ' + abasDe(s, 'editar'));

    // ---------- todas as abas ----------
    n1 = await nomear(ea.uid, true);
    ok(JSON.stringify(n1.abas) === '["cenas","mundo","acampamento","fichas","arvore","rolador"]', 'sem lista, o auxiliar fica com todas as abas: ' + JSON.stringify(n1.abas));
    s = await sonda(A, { outro: ej.uid });
    ok(tem(s.docs, ...DA_MESA, 'cenas:indice', 'cena:c1:m', 'mundo:mapa:x', 'fichas:segredos', 'arvore:biblioteca', 'rol:h:1') && semNenhum(s.docs, 'outro:x'), 'com todas as abas, recebe tudo o que é de alguma aba (o que não é de aba nenhuma fica só com o mestre) — ' + JSON.stringify(s.docs));
    ok(abasDe(s, 'editar') === 'acampamento,arvore,cenas,fichas,mundo,rolador' && abasDe(s, 'criar') === 'acampamento,arvore,cenas,fichas,mundo,rolador', 'e edita e cria em todas — ' + JSON.stringify([s.editar, s.criar]));
    ok(tem(s.fichas, 'npc_esc') && s.fichaEsc === 'ok' && s.esconderPub === 'ok' && s.tomarPub === 'ok' && s.apagarPub === 'ok' && s.criarNpc === 'ok', 'com a aba Fichas: recebe a escondida, esconde, troca o dono, apaga e cria NPC — ' + JSON.stringify([s.fichaEsc, s.esconderPub, s.tomarPub, s.apagarPub, s.criarNpc]));
    naoAdministra(s, 'auxiliar com todas as abas');
    // manter o modo ao trocar as abas
    await jogar(true);
    n1 = await nomear(ea.uid, true, ['mundo']);
    ok(n1.jogando === true && JSON.stringify(n1.abas) === '["mundo"]', 'trocar as abas de quem está jogando não o tira do modo jogador: ' + JSON.stringify([n1.jogando, n1.abas]));
    await jogar(false);
    s = await sonda(A, { outro: ej.uid });
    ok(abasDe(s, 'editar') === 'mundo' && tem(s.docs, 'mundo:mapa:x') && semNenhum(s.docs, 'cenas:indice', 'rol:h:1'), 'as abas tiradas deixam de chegar na hora: ' + abasDe(s, 'editar') + ' — ' + JSON.stringify(s.docs));
    b1 = await barras(A, 'npc_esc', { hp: 3 }, null);
    ok(/Só o mestre/.test(b1.erro || '') && (await estadoDoVilao()).rec.hp === -5, 'sem a aba Cenas, as barras pelo token também não: "' + b1.erro + '"');

    // ---------- sem aba nenhuma: ainda mestra a mesa ao vivo e as fichas visíveis ----------
    n1 = await nomear(ea.uid, true, []);
    ok(n1.papel === 'auxiliar' && n1.abas.length === 0, 'dá para nomear sem aba nenhuma');
    s = await sonda(A, { outro: ej.uid });
    ok(abasDe(s, 'editar') === '' && semNenhum(s.docs, ...DO_MESTRE) && s.rolarSecreta === 'ok' && s.estadoPub === 'ok', 'sem aba nenhuma: nenhum documento de mestre; ainda rola em segredo e mexe nas barras das fichas visíveis — ' + JSON.stringify([abasDe(s, 'editar'), s.rolarSecreta, s.estadoPub]));

    // ---------- o mestre não vira auxiliar; o auxiliar não nomeia ----------
    const noMestre = await nomear(em.uid, true);
    ok(/não vira auxiliar/.test(noMestre.erro || ''), 'o mestre da mesa não vira auxiliar: "' + noMestre.erro + '"');
    const mJoga = await M.evaluate(async mesa => { const r = await sb.rpc('auxiliar_jogar', { p_mesa: mesa, p_jogando: true }); return r.error ? r.error.message : 'ACEITO'; }, mesa);
    ok(/não é mestre auxiliar/.test(mJoga), 'o mestre não tem modo jogador: "' + mJoga + '"');
    const deFora = await nomear('00000000-0000-4000-8000-000000000000', true);
    ok(/não participa/.test(deFora.erro || ''), 'nomear quem não está na mesa: "' + deFora.erro + '"');

    // ---------- tirar de auxiliar ----------
    n1 = await nomear(ea.uid, false);
    ok(n1.papel === 'jogador' && n1.jogando === false && n1.abas.length === 0, 'o mestre tira de auxiliar: volta a ser jogador, sem abas — ' + JSON.stringify([n1.papel, n1.jogando, n1.abas]));
    s = await sonda(A, { outro: ej.uid });
    comoJogador(s, 'ex-auxiliar'); naoAdministra(s, 'ex-auxiliar');

    // ---------- sair e ser tirado ----------
    await nomear(ea.uid, true);
    const saiu = await A.evaluate(async mesa => { const uid = (await sb.auth.getUser()).data.user.id; const r = await sb.from('mesa_membros').delete().eq('mesa_id', mesa).eq('usuario_id', uid).select('usuario_id'); return (r.data || []).length; }, mesa);
    ok(saiu === 1, 'o auxiliar pode sair da mesa');
    const volta = await A.evaluate(async ([mesa, codigo]) => { await sb.rpc('entrar_na_mesa', { p_codigo: codigo, p_meu_nome: 'Dalmo' }); const uid = (await sb.auth.getUser()).data.user.id; const r = await sb.from('mesa_membros').select('papel, jogando, abas').eq('mesa_id', mesa).eq('usuario_id', uid).single(); return r.data; }, [mesa, codigo]);
    ok(volta && volta.papel === 'jogador' && volta.abas.length === 0, 'quem volta pelo código volta jogador: ' + JSON.stringify(volta));
    await nomear(ej.uid, true);
    const tirado = await M.evaluate(async ([mesa, quem]) => { const r = await sb.from('mesa_membros').delete().eq('mesa_id', mesa).eq('usuario_id', quem).select('usuario_id'); return (r.data || []).length; }, [mesa, ej.uid]);
    ok(tirado === 1, 'o mestre tira um auxiliar da mesa');
    const fora = await J.evaluate(async mesa => { const d = await sb.from('documentos').select('id').eq('mesa_id', mesa); const p = await sb.from('personagens').select('id').eq('mesa_id', mesa); const r = await sb.rpc('auxiliar_jogar', { p_mesa: mesa, p_jogando: false }); return [(d.data || []).length, (p.data || []).length, r.error ? 'recusado' : 'ACEITO']; }, mesa);
    ok(fora[0] === 0 && fora[1] === 0 && fora[2] === 'recusado', 'quem foi tirado não lê mais nada da mesa: ' + JSON.stringify(fora));
    const mestreSai = await M.evaluate(async mesa => { const uid = (await sb.auth.getUser()).data.user.id; const r = await sb.from('mesa_membros').delete().eq('mesa_id', mesa).eq('usuario_id', uid).select('usuario_id'); return (r.data || []).length; }, mesa);
    ok(mestreSai === 0, 'o mestre continua sem poder "sair" da própria mesa');
  } finally {
    const r = await M.evaluate(async mesa => {
      // (as imagens de teste já foram apagadas uma a uma; aqui vai a mesa)
      const x = await sb.from('mesas').delete().eq('id', mesa).select('id');
      return x.error ? x.error.message : (x.data || []).length;
    }, mesa).catch(e => String(e.message).split('\n')[0]);
    ok(r === 1, 'a mesa de teste é apagada no fim: ' + r);
  }
  }
  if (SO !== 'banco') {

  // =====================================================================================================
  // A TELA: o menu da mesa do mestre, o que o auxiliar vê e o botão de jogar como jogador / voltar a mestrar
  // =====================================================================================================
  for (const p of [M, A, J]) await p.context().close();
  const semTour = { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' };
  const TM = (await t.device({ name: 'mestre (tela)', seed: semTour })).page;
  const TA = (await t.device({ name: 'auxiliar (tela)', w: 1300, h: 860, seed: semTour })).page;
  const TJ = (await t.device({ name: 'jogador (tela)', w: 1100, h: 800, seed: semTour })).page;
  const w = (ms, p) => (p || TM).waitForTimeout(ms);
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* a página está recarregando as abas */ } if (Date.now() - t0 > ms) return false; await TM.waitForTimeout(400); } };
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const avisos = p => p.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const abas = p => p.evaluate(() => [...document.querySelectorAll('.tab')].filter(x => !x.hidden).map(x => x.innerText.trim()).join(','));
  const menu = async p => { if (await p.locator('#menu').isHidden()) { await p.locator('#btnConta').click(); await p.waitForTimeout(350); } };
  const fecharMenu = async p => { if (await p.locator('#menu').isVisible()) { await p.keyboard.press('Escape'); await p.waitForTimeout(200); } };
  const eu = p => p.evaluate(() => { const a = TC.mesas.atual; return a ? { cargo: a.cargo, papel: a.papel, jogando: a.jogando, abas: a.abas.join(','), chip: document.getElementById('btnConta').innerText.replace(/\s+/g, ' ') } : null; });
  const fichasQueVejo = p => p.evaluate(async () => { const c = TC.dados.col('personagens'); await c.pronta; return c.todas().map(l => l.id).sort().join(','); });
  const docsQueVejo = p => p.evaluate(async () => { const c = TC.dados.col('documentos'); await c.pronta; return c.todas().map(l => l.id).sort().join(','); });
  const papelNaAba = async (p, aba, re) => { await p.locator('#tab-' + aba).click(); const f = await quadro(p, re); if (!f) return null; await f.waitForFunction(() => window.TC && TC.ponte && TC.ponte.estado && TC.ponte.estado.mesa, null, { timeout: 20000 }); return f.evaluate(() => { const e = TC.ponte.estado; return { papel: e.papel, cargo: e.cargo, jogando: e.jogando, v: e.v, mestra: Object.keys(e.mestra || {}).filter(k => e.mestra[k]).sort().join(','), fn: [TC.ponte.mestra('cenas'), TC.ponte.mestra('fichas')] }; }); };
  await TM.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(TM, c.mestre, c.senha);
  const nomeTela = 'Auxiliar na tela ' + Date.now().toString(36);
  const cod2 = await criarMesaTela(TM, nomeTela, { semCodigo: false });
  let apagada = false;
  try {
    await TA.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, TA);
    await loginTela(TA, c.jog1, c.senha); await entrarMesaTela(TA, cod2, 'Dalmo');
    await TJ.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, TJ);
    await loginTela(TJ, c.jog2, c.senha); await entrarMesaTela(TJ, cod2, 'Visitante');
    const auxId = await TA.evaluate(() => TC.conta.usuario.id);
    // o mestre guarda duas fichas (uma escondida) e um documento do Rolador
    await TM.evaluate(uid => {
      const P = TC.dados.col('personagens'), D = TC.dados.col('documentos'), base = { skills: { arvores: [], pontos: {}, alocados: {} }, estado: {} };
      // (fichas inteiras, como as que a página das Fichas cria: ela conta com todos os campos)
      const ficha = nome => ({ nome, raca: 'Elfa da neve', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
        defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], itens: [], notas: '', recursos: [{ id: 'hp', nome: 'HP', fml: '100' }] });
      P.gravar('pc_aux', Object.assign({}, base, { nome: 'Selene', ficha: ficha('Selene'), dono_id: uid, vis: 'mesa', ordem: 0 }));
      P.gravar('npc_esc', Object.assign({}, base, { nome: 'Vilão', ficha: ficha('Vilão'), dono_id: null, vis: 'mestre', ordem: 1 }));
      P.gravar('npc_pub', Object.assign({}, base, { nome: 'Guarda', ficha: ficha('Guarda'), dono_id: null, vis: 'mesa', ordem: 2 }));
      D.gravar('rol:h:teste', { dono_id: null, vis: 'mestre', dados: { v: 1 } });
    }, auxId);
    ok(await ate(() => TM.evaluate(() => TC.dados.pendentes === 0)), '(o mestre guardou as fichas e o documento)');
    ok(await ate(() => TM.evaluate(() => TC.mesas.atual.membros.length === 3)), 'o mestre vê os três participantes');
    // …e põe numa cena um token ligado à ficha escondida (o Vilão), com a barra de HP dela
    await TM.locator('#tab-cenas').click();
    let CM = null;
    ok(await ate(async () => { CM = await quadro(TM, /\/cenas\//); return CM && await CM.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on() && !!__tc.Fichas.get('npc_esc')); }, 40000), '(o mestre está nas Cenas, com as fichas)');
    if (await CM.locator('.modal').count()) { await TM.keyboard.press('Escape'); await w(300); }
    const [vilao, selene] = await CM.evaluate(() => __tc.Combate.trazer(['npc_esc', 'pc_aux'], 0, 0));
    const donoDe = (f, id) => f.evaluate(id => { const u = __tc, k = u.Store.get('tokens', id), p = u.Store.S.players.find(x => x.id === k.owner) || null, q = u.Fichas.donoQueJoga(k); return { dono: p ? p.name : null, mestrando: !!(p && p.gm), joga: q ? q.name : null }; }, id);
    ok(!!selene && JSON.stringify(await donoDe(CM, selene)) === '{"dono":"Dalmo","mestrando":false,"joga":"Dalmo"}', 'o token da personagem do Dalmo nasce dele: ' + JSON.stringify(await donoDe(CM, selene)));
    const hpDoToken = (f, id) => f.evaluate(id => { const k = __tc.Store.get('tokens', id), b = k && k.bars.find(x => x.ref === 'hp'); return b ? b.v : null; }, id);
    ok(!!vilao && await hpDoToken(CM, vilao) === 100, 'o token do Vilão nasce ligado à ficha escondida, com HP 100');
    ok(await ate(async () => await TM.evaluate(() => TC.dados.pendentes === 0) && await CM.evaluate(() => __tc.Persist.status() === 'ok')), '(a cena foi salva)');
    await TM.locator('#tab-fichas').click(); await w(300);

    // ---------- o menu do mestre ----------
    await menu(TM);
    const linhas0 = await TM.evaluate(() => [...document.querySelectorAll('#membros .mb')].map(l => ({ nome: l.querySelector('span').textContent, papel: l.querySelector('small').textContent, botoes: [...l.querySelectorAll('button')].map(b => b.textContent).join('|') })));
    ok(linhas0.length === 3 && linhas0[0].papel === 'mestre' && linhas0[0].botoes === '' && linhas0[1].botoes === 'Papel…|Tirar' && linhas0[2].botoes === 'Papel…|Tirar', 'no menu do mestre, cada jogador tem "Papel…" e "Tirar"; o próprio mestre, nada — ' + JSON.stringify(linhas0));
    await TM.locator('#membros .mb', { hasText: 'Dalmo' }).locator('button', { hasText: 'Papel' }).click(); await w(350);
    const jan0 = await TM.evaluate(() => ({ titulo: document.querySelector('#f-papel h2').textContent, jog: document.getElementById('pp-jog').checked, aux: document.getElementById('pp-aux').checked, travado: document.getElementById('pp-abas').disabled, marcadas: [...document.querySelectorAll('#pp-abas input')].filter(x => x.checked).length }));
    ok(jan0.titulo === 'Papel de Dalmo' && jan0.jog && !jan0.aux && jan0.travado && jan0.marcadas === 6, 'a janela abre em "Jogador", com as abas esperando (todas marcadas, travadas) — ' + JSON.stringify(jan0));
    await TM.locator('#pp-aux').check(); await w(150);
    ok(await TM.evaluate(() => !document.getElementById('pp-abas').disabled), 'ao escolher "Mestre auxiliar", as abas destravam');
    await TM.locator('dialog .btn', { hasText: 'Cancelar' }).click(); await w(300);
    ok(await TM.evaluate(() => TC.mesas.atual.membros.every(m => m.cargo !== 'auxiliar')), 'Cancelar não muda nada');
    await menu(TM);
    await TM.locator('#membros .mb', { hasText: 'Dalmo' }).locator('button', { hasText: 'Papel' }).click(); await w(350);
    await TM.locator('#pp-aux').check(); await TM.locator('#pp-rolador').uncheck(); await TM.locator('#pp-fichas').uncheck(); await w(150);
    await TM.locator('#pp-ok').click();
    ok(await ate(async () => /Dalmo agora é mestre auxiliar\./.test(await avisos(TM))), 'salvar avisa: "' + await avisos(TM) + '"');
    ok(await TM.locator('dialog[open]').count() === 0, '(a janela fecha)');
    await menu(TM);
    ok(await TM.locator('#membros .mb', { hasText: 'Dalmo' }).locator('small').innerText() === 'auxiliar', 'na lista, Dalmo aparece como auxiliar');
    await fecharMenu(TM);

    // a ficha e o token do auxiliar continuam dele enquanto ele mestra; só a defesa é que não é pedida a ele
    ok(await ate(async () => (await donoDe(CM, selene)).mestrando === true), 'nas Cenas do mestre, o Dalmo continua dono do token dele, agora marcado como quem está mestrando');
    ok(JSON.stringify(await donoDe(CM, selene)) === '{"dono":"Dalmo","mestrando":true,"joga":null}', 'e, enquanto ele mestra, não é a ele que se pede a defesa: ' + JSON.stringify(await donoDe(CM, selene)));
    await TM.locator('#tab-cenas').click(); await w(400);
    const ataqueEm = async id => {
      await CM.evaluate(id => { __tc.Luta.ataque([__tc.Store.get('tokens', id)]); }, id); await w(350);
      await CM.locator('#at-dano').fill('10');
      if (await CM.locator('#at-d-DFF').getAttribute('aria-pressed') !== 'true') await CM.locator('#at-d-DFF').click();     // (a janela lembra a defesa da última vez)
      await w(150);
      await CM.locator('#at-modo button', { hasText: 'Rola a defesa' }).click(); await w(250);
      const o = { pedir: await CM.locator('#at-pedir').isDisabled(), rolar: (await CM.locator('#at-rolar-0').innerText()).trim() };
      await TM.keyboard.press('Escape'); await w(300);
      return o;
    };
    let at = await ataqueEm(selene);
    ok(at.pedir === true && at.rolar === 'Rolar', 'na janela de ataque do mestre, o personagem de quem está mestrando é rolado pelo mestre (não há a quem pedir): ' + JSON.stringify(at));
    await TM.locator('#tab-fichas').click(); await w(300);
    const FM = await quadro(TM, /\/fichas\//);
    ok(await ate(() => FM.evaluate(() => typeof S === 'object' && S.personagens.some(p => p.id === 'pc_aux') && typeof render === 'function')), '(as Fichas do mestre estão abertas)');
    const donoNaFicha = () => FM.evaluate(() => { S.sel = 'pc_aux'; render(); const d = document.querySelector('#f_dono'); return d ? { escolhido: d.selectedOptions[0].textContent, opcoes: [...d.options].map(o => o.textContent).join('|') } : null; });
    let df = await donoNaFicha();
    ok(df && df.escolhido === 'Dalmo (mestre auxiliar)' && !/saiu da mesa/.test(df.opcoes), 'na ficha, "Jogador que controla" continua dizendo Dalmo (mestre auxiliar) — e não que ele saiu da mesa: ' + JSON.stringify(df));

    // ---------- o auxiliar fica sabendo (sem recarregar a página) ----------
    ok(await ate(async () => (await eu(TA)).cargo === 'auxiliar'), 'o auxiliar percebe a nomeação em poucos segundos');
    let e1 = await eu(TA);
    ok(e1.papel === 'mestre' && e1.abas === 'cenas,mundo,acampamento,arvore' && /Mestre auxiliar/.test(e1.chip), 'ele passa a mestrar as abas liberadas, e o botão da mesa diz "Mestre auxiliar" — ' + JSON.stringify(e1));
    ok(/Você agora é mestre auxiliar desta mesa/.test(await avisos(TA)), 'e recebe o aviso: "' + await avisos(TA) + '"');
    ok(await abas(TA) === 'Cenas,Mapa-múndi,Acampamento,Fichas,Árvore', 'sem a aba Rolador liberada, ela não aparece para ele: ' + await abas(TA));
    ok(await fichasQueVejo(TA) === 'npc_pub,pc_aux', 'sem a aba Fichas, a ficha escondida não chega ao aparelho dele: ' + await fichasQueVejo(TA));
    ok(await ate(() => TA.evaluate(() => !!document.getElementById('f-cenas')), 15000), 'com a aba Cenas, as Cenas dele abrem em segundo plano (ele está nas Fichas), como as do mestre');
    const auditor = await TA.evaluate(() => TC.aoVivo.historico().then(() => 'ABRIU', e => e.message));
    ok(/Só o mestre abre o auditor/.test(auditor), 'sem a aba Rolador, o auditor dos dados não abre para ele: "' + auditor + '"');
    ok(!/rol:h:teste/.test(await docsQueVejo(TA)), 'nem o documento do Rolador: ' + await docsQueVejo(TA));
    let pc = await papelNaAba(TA, 'cenas', /\/cenas\//);
    ok(pc && pc.papel === 'mestre' && pc.cargo === 'auxiliar' && pc.v === 4 && pc.mestra === 'acampamento,arvore,cenas,mundo' && pc.fn[0] === true && pc.fn[1] === false, 'as Cenas o recebem como mestre (e sabem o que ele mestra, aba por aba) — ' + JSON.stringify(pc));
    // o token ligado à ficha escondida: ele vê o token (é da cena), não a ficha — e o dano que dá vai para ela mesmo assim
    const CA = await quadro(TA, /\/cenas\//);
    ok(await ate(() => CA.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && !!__tc.Store.get('tokens', id), vilao), 30000), 'nas Cenas do auxiliar, o token do Vilão está lá');
    if (await CA.locator('.modal').count()) { await TA.keyboard.press('Escape'); await w(300, TA); }
    const visto = await CA.evaluate(id => { const u = __tc, k = u.Store.get('tokens', id); return { ficha: !!u.Fichas.get(k.char), escondida: u.Fichas.escondida(k), todas: u.Fichas.vejoTodas(), hp: k.bars.find(b => b.ref === 'hp').v }; }, vilao);
    ok(!visto.ficha && visto.escondida && !visto.todas && visto.hp === 100, 'a ficha dele não chega ao auxiliar (escondida), mas a barra do token, sim — ' + JSON.stringify(visto));
    await CA.evaluate(id => __tc.setSel([{ c: 'tokens', id }]), vilao); await w(400, TA);
    const painel = await CA.evaluate(() => { const s = document.getElementById('tk-char'); return { opcao: s ? s.options[s.selectedIndex].textContent : null, nota: [...document.querySelectorAll('#panel .note, .note')].map(x => x.textContent).find(x => /esconde dos jogadores/.test(x)) || null }; });
    ok(painel.opcao === '(ficha escondida)' && /Deixe-o ligado/.test(painel.nota || ''), 'o painel do token diz que a ficha é escondida (e não que "saiu da mesa") — ' + JSON.stringify(painel));
    await CA.evaluate(id => { const u = __tc, k = u.Store.get('tokens', id); u.Store.tx('Dano', () => u.Store.upd('tokens', id, { bars: k.bars.map(b => (b.ref === 'hp' ? Object.assign({}, b, { v: 63 }) : b)) })); }, vilao);
    ok(await ate(() => TM.evaluate(() => { const l = TC.dados.col('personagens').pegar('npc_esc'); return !!l && !!l.estado && !!l.estado.rec && l.estado.rec.hp === 63; })), 'o dano que o auxiliar deu no token chega à ficha escondida (o mestre vê o HP em 63)');
    ok(await ate(async () => await hpDoToken(CM, vilao) === 63), 'e o token, no aparelho do mestre, fica em 63');
    await w(6000);
    ok(await hpDoToken(CM, vilao) === 63 && await hpDoToken(CA, vilao) === 63, 'e continua em 63 depois de alguns segundos, nos dois aparelhos (a ficha não desfaz o que o auxiliar fez)');
    ok(await fichasQueVejo(TA) === 'npc_pub,pc_aux', '(a ficha escondida continua sem chegar a ele)');
    // o mestre esconde uma ficha que estava à vista: ela deixa de chegar ao auxiliar (que não tem a aba Fichas), sem recarregar nada
    await TM.evaluate(() => { TC.dados.col('personagens').gravar('npc_pub', { vis: 'mestre' }); });
    ok(await ate(async () => await fichasQueVejo(TA) === 'pc_aux', 30000), 'a ficha que o mestre escondeu some do aparelho do auxiliar em alguns segundos: ' + await fichasQueVejo(TA));
    // o Acampamento, com a aba dele e sem a das Fichas: o momento (que mexe nos relacionamentos) fica de fora
    await TA.locator('#tab-acampamento').click();
    const AA = await quadro(TA, /\/acampamento\//);
    ok(await ate(() => AA.evaluate(() => !!document.getElementById('btMomento') && !document.getElementById('btMomento').hidden)), '(o Acampamento do auxiliar abriu, com a parte do mestre)');
    await AA.locator('#btMomento').click(); await w(400, TA);
    const avisoAcamp = await AA.evaluate(() => [...document.querySelectorAll('.toast, #toast, [role="status"]')].map(x => x.textContent).join(' ¶ '));
    ok(/O momento mexe nos relacionamentos, que são das Fichas/.test(avisoAcamp), 'no Acampamento, sem a aba Fichas, o "Momento" explica por que não abre: "' + avisoAcamp.slice(0, 160) + '"');
    let pf = await papelNaAba(TA, 'fichas', /\/fichas\//);
    ok(pf && pf.papel === 'jogador' && pf.cargo === 'auxiliar', 'as Fichas, sem a aba liberada, o recebem como jogador — ' + JSON.stringify(pf));
    ok(await TA.locator('#segredo').count() === 1, 'mestrando, ele tem o "Em segredo" da mesa ao vivo');
    await menu(TA);
    const mA = await TA.evaluate(() => ({ codigo: !!document.getElementById('codigo'), renomear: !!document.getElementById('mn-renomear'), limpar: !!document.getElementById('mn-limpar'), botoes: document.querySelectorAll('#membros .ac').length,
      modo: (document.getElementById('mn-modo') || {}).textContent, texto: (document.getElementById('mn-aux') || {}).innerText, sair: [...document.querySelectorAll('#menu .lk')].some(b => b.textContent === 'Sair desta mesa'), apagar: [...document.querySelectorAll('#menu .lk')].some(b => /Apagar esta mesa/.test(b.textContent)) }));
    ok(!mA.codigo && !mA.renomear && mA.botoes === 0 && !mA.apagar, 'o menu do auxiliar não tem código de convite, renomear, apagar nem os botões dos participantes — ' + JSON.stringify(mA));
    ok(mA.limpar && mA.sair && mA.modo === 'Jogar como jogador' && /Você mestra: Cenas, Mapa-múndi, Acampamento, Árvore/.test(mA.texto) && /Fichas, Rolador/.test(mA.texto), 'tem limpar a mesa ao vivo, sair da mesa e o botão de jogar como jogador, com as abas dele por extenso');

    // ---------- jogar como jogador ----------
    await TA.locator('#mn-modo').click(); await w(350, TA);
    ok(/Jogar como jogador\?/.test(await TA.locator('dialog h2').innerText()) && /continua mestre auxiliar/.test(await TA.locator('dialog p').innerText()), 'o botão pergunta antes, explicando o que muda');
    await TA.locator('dialog .btn', { hasText: 'Cancelar' }).click(); await w(300, TA);
    ok((await eu(TA)).jogando === false, 'Cancelar deixa como estava');
    await TA.locator('#segredo').click(); await w(200, TA);
    ok(await TA.evaluate(() => TC.aoVivo.segredo === true), '(ele liga o "Em segredo")');
    await menu(TA); await TA.locator('#mn-modo').click(); await w(350, TA);
    await TA.locator('dialog .btn.pri').click();
    ok(await ate(async () => (await eu(TA)).jogando === true), 'confirmando, ele passa a jogar como jogador');
    ok(await TA.evaluate(() => TC.aoVivo.segredo === false), 'o "Em segredo" que estava ligado não vai junto: jogador não rola em segredo');
    e1 = await eu(TA);
    ok(e1.cargo === 'auxiliar' && e1.papel === 'jogador' && /Auxiliar · jogando/.test(e1.chip), 'continua auxiliar, agora com papel de jogador — ' + JSON.stringify(e1));
    ok(/Você está jogando como jogador\./.test(await avisos(TA)), '(aviso: "' + await avisos(TA) + '")');
    pc = await papelNaAba(TA, 'cenas', /\/cenas\//);
    ok(pc && pc.papel === 'jogador' && pc.jogando === true && pc.mestra === '', 'as Cenas foram abertas de novo, e agora o recebem como jogador — ' + JSON.stringify(pc));
    const CJ = await quadro(TA, /\/cenas\//);
    ok(await ate(() => CJ.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'jogador')), 'e rodam como as de um jogador (não ficou o programa de mestre aberto por baixo)');
    ok(await TA.locator('#segredo').count() === 0, 'jogando, o "Em segredo" some');
    await menu(TA);
    const mJ = await TA.evaluate(() => ({ limpar: !!document.getElementById('mn-limpar'), modo: (document.getElementById('mn-modo') || {}).textContent, rot: document.querySelector('#mn-aux .rot').textContent }));
    ok(!mJ.limpar && mJ.modo === 'Voltar a mestrar' && /jogando como jogador/i.test(mJ.rot), 'o menu dele agora oferece "Voltar a mestrar" (e não limpa a mesa ao vivo) — ' + JSON.stringify(mJ));
    await fecharMenu(TA);
    // o mestre e o outro jogador veem o modo dele
    ok(await ate(() => TM.evaluate(() => TC.mesas.atual.membros.some(m => m.cargo === 'auxiliar' && m.jogando && m.papel === 'jogador'))), 'o mestre fica sabendo que o auxiliar está jogando');
    await menu(TM);
    ok(await TM.locator('#membros .mb', { hasText: 'Dalmo' }).locator('small').innerText() === 'auxiliar · jogando', 'e a lista do mestre diz "auxiliar · jogando"');
    await fecharMenu(TM);
    ok(await ate(async () => JSON.stringify(await donoDe(CM, selene)) === '{"dono":"Dalmo","mestrando":false,"joga":"Dalmo"}'), 'jogando como jogador, a defesa do personagem dele volta a ser pedida a ele: ' + JSON.stringify(await donoDe(CM, selene)));
    await TM.locator('#tab-cenas').click(); await w(400);
    at = await ataqueEm(selene);
    ok(at.pedir === false && at.rolar === 'Rolar por ele', 'e a janela de ataque do mestre volta a oferecer o pedido ("Rolar por ele" é a saída): ' + JSON.stringify(at));
    await TM.locator('#tab-fichas').click(); await w(300);
    await menu(TA); await TA.locator('#mn-modo').click(); await w(350, TA);
    await TA.locator('dialog .btn.pri').click();
    ok(await ate(async () => { const x = await eu(TA); return x.jogando === false && x.papel === 'mestre'; }), 'e ele volta a mestrar quando quer');
    ok(await ate(async () => { const f = await quadro(TA, /\/cenas\//, 8); return !!f && await f.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre'); }), 'com as Cenas dele rodando de novo como as de quem mestra');
    ok(/Você voltou a mestrar\./.test(await avisos(TA)), '(aviso: "' + await avisos(TA) + '")');

    // ---------- o mestre muda as abas; o aviso tem Desfazer ----------
    await w(9000);                                         // (os avisos antigos saem da tela)
    await menu(TM);
    await TM.locator('#membros .mb', { hasText: 'Dalmo' }).locator('button', { hasText: 'Papel' }).click(); await w(350);
    const jan1 = await TM.evaluate(() => ({ aux: document.getElementById('pp-aux').checked, marcadas: [...document.querySelectorAll('#pp-abas input')].filter(x => x.checked).map(x => x.id.slice(3)).join(',') }));
    ok(jan1.aux && jan1.marcadas === 'cenas,mundo,acampamento,arvore', 'a janela abre com o que ele é hoje: auxiliar, com as quatro abas — ' + JSON.stringify(jan1));
    await TM.locator('#pp-rolador').check(); await TM.locator('#pp-fichas').check(); await w(150);
    await TM.locator('#pp-ok').click();
    ok(await ate(async () => /As abas de Dalmo foram atualizadas\./.test(await avisos(TM))), 'trocar as abas avisa: "' + await avisos(TM) + '"');
    ok(await ate(async () => (await eu(TA)).abas === 'cenas,mundo,acampamento,fichas,arvore,rolador'), 'o auxiliar recebe as abas novas');
    ok(/O mestre mudou as abas que você mestra/.test(await avisos(TA)), '(aviso dele: "' + await avisos(TA) + '")');
    ok(await abas(TA) === 'Cenas,Mapa-múndi,Acampamento,Fichas,Árvore,Rolador', 'o Rolador aparece para ele: ' + await abas(TA));
    ok(await fichasQueVejo(TA) === 'npc_esc,npc_pub,pc_aux' && /rol:h:teste/.test(await docsQueVejo(TA)), 'e as fichas escondidas e o documento do Rolador passam a chegar: ' + await fichasQueVejo(TA));
    pf = await papelNaAba(TA, 'fichas', /\/fichas\//);
    ok(pf && pf.papel === 'mestre', 'as Fichas agora o recebem como mestre — ' + JSON.stringify(pf));
    await TM.locator('.toast button', { hasText: 'Desfazer' }).click();
    ok(await ate(async () => (await eu(TA)).abas === 'cenas,mundo,acampamento,arvore'), '"Desfazer", no aviso do mestre, devolve as abas de antes');
    ok(await ate(async () => await abas(TA) === 'Cenas,Mapa-múndi,Acampamento,Fichas,Árvore' && await fichasQueVejo(TA) === 'pc_aux'), 'e o que tinha passado a chegar deixa de chegar: ' + await abas(TA) + ' · ' + await fichasQueVejo(TA));

    // ---------- o outro jogador: vê quem é auxiliar, e não tem botão nenhum ----------
    ok(await ate(() => TJ.evaluate(() => TC.mesas.atual.membros.some(m => m.cargo === 'auxiliar'))), '(o outro jogador também fica sabendo)');
    await menu(TJ);
    const mO = await TJ.evaluate(() => ({ botoes: document.querySelectorAll('#membros .ac').length, aux: !!document.getElementById('mn-aux'), papeis: [...document.querySelectorAll('#membros .mb small')].map(x => x.textContent).join('|') }));
    ok(mO.botoes === 0 && !mO.aux && mO.papeis === 'mestre|auxiliar|', 'o jogador vê quem é o auxiliar, sem botão de papel e sem o bloco do auxiliar — ' + JSON.stringify(mO));
    await fecharMenu(TJ);
    ok(await TJ.evaluate(() => document.getElementById('quem').innerText.replace(/\s+/g, ' ')) === 'Bruno mestre Dalmo auxiliar Visitante' || await TJ.evaluate(() => /Dalmo auxiliar/.test(document.getElementById('quem').innerText.replace(/\s+/g, ' '))), 'na faixa de quem está na mesa, o auxiliar aparece como auxiliar');

    // ---------- de volta a jogador ----------
    await w(9000);
    await menu(TM);
    await TM.locator('#membros .mb', { hasText: 'Dalmo' }).locator('button', { hasText: 'Papel' }).click(); await w(350);
    await TM.locator('#pp-jog').check(); await w(150);
    ok(await TM.evaluate(() => document.getElementById('pp-abas').disabled), '(voltando a "Jogador", as abas travam)');
    await TM.locator('#pp-ok').click();
    ok(await ate(async () => /Dalmo voltou a ser jogador\./.test(await avisos(TM))), 'tirar de auxiliar avisa: "' + await avisos(TM) + '"');
    ok(await ate(async () => (await eu(TA)).cargo === 'jogador'), 'ele volta a ser jogador');
    e1 = await eu(TA);
    ok(e1.papel === 'jogador' && e1.abas === '' && /Jogador/.test(e1.chip) && /Você voltou a ser jogador nesta mesa/.test(await avisos(TA)), 'com o papel, o botão e o aviso de jogador — ' + JSON.stringify(e1));
    await menu(TA);
    ok(await TA.locator('#mn-aux').count() === 0 && await TA.locator('#mn-limpar').count() === 0, 'e o menu dele volta a ser o de jogador');
    await fecharMenu(TA);
    ok(await ate(() => TM.evaluate(() => TC.dados.pendentes === 0)), '(tudo salvo)');
    await TM.locator('#tab-fichas').click(); await w(400);
    await apagarMesaTela(TM, nomeTela); apagada = true;
  } finally {
    if (!apagada) { try { await TM.keyboard.press('Escape'); await TM.evaluate(async () => { if (TC.mesas.atual) await TC.mesas.apagar(); }); } catch (e) { console.log('(a mesa de teste não pôde ser apagada: ' + String(e.message).split('\n')[0] + ')'); } }
  }
  }
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
