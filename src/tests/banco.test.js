// O banco de verdade (projeto Tiny Cats no Supabase): contas, mesas, convites, registro, regras de acesso e tempo real.
// Três aparelhos: o mestre, um jogador que entra na mesa e um jogador de fora.
const { start, checker } = require('./lib');
const { contas, entrar } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  const abre = async name => { const d = await t.device({ name }); await d.page.goto(t.base + 'src/tests/vazio.html', { waitUntil: 'load' }); return d.page; };
  const [M, J, F] = [await abre('mestre'), await abre('jog1'), await abre('fora')];
  const w = ms => M.waitForTimeout(ms);

  // --- contas ---
  const em = await entrar(M, c.mestre, c.senha, 'Bruno'), ej = await entrar(J, c.jog1, c.senha, 'Dalmo'), ef = await entrar(F, c.jog2, c.senha, 'Visitante');
  ok([200, 409].includes(em.criar) && !em.erro && em.uid, 'mestre: conta criada (ou já existia) e sessão aberta — ' + JSON.stringify(em));
  ok(!ej.erro && ej.uid, 'jogador: sessão aberta'); ok(!ef.erro && ef.uid, 'jogador de fora: sessão aberta');
  const rep = await M.evaluate(async ([email, senha]) => (await fetch(TC_CONFIG.url + '/functions/v1/criar-conta', { method: 'POST', headers: { 'content-type': 'application/json', apikey: TC_CONFIG.chave }, body: JSON.stringify({ email, senha, nome: 'X' }) })).status, [c.mestre, c.senha]);
  ok(rep === 409, 'criar conta com e-mail repetido é recusado (409): ' + rep);
  const senhaErrada = await F.evaluate(async email => { const { error } = await supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password: 'senha-errada-123' }); return error ? error.message : null; }, c.mestre);
  ok(!!senhaErrada, 'senha errada não entra: ' + senhaErrada);

  // --- sem conta: nada ---
  const anon = await M.evaluate(async () => {
    const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave, { auth: { persistSession: false, storageKey: 'anon-teste' } });
    const m = await a.from('mesas').select('*'); const r = await a.from('registro').select('*'); const f = await a.rpc('criar_mesa', { p_nome: 'x' });
    return { mesas: m.error ? 'erro' : m.data.length, registro: r.error ? 'erro' : r.data.length, criar: f.error ? 'erro' : 'ok' };
  });
  ok(anon.mesas !== undefined && (anon.mesas === 'erro' || anon.mesas === 0) && (anon.registro === 'erro' || anon.registro === 0) && anon.criar === 'erro', 'sem conta: não lê mesas nem registro e não cria mesa — ' + JSON.stringify(anon));

  // --- mesa ---
  const nomeMesa = 'Mesa de teste ' + Date.now();
  const cm = await M.evaluate(async nome => {
    const r = await sb.rpc('criar_mesa', { p_nome: nome, p_meu_nome: 'Bruno' });
    if (r.error) return { erro: r.error.message };
    const cv = await sb.from('mesa_convites').select('codigo').eq('mesa_id', r.data.id).single();
    const mb = await sb.from('mesa_membros').select('*').eq('mesa_id', r.data.id);
    return { mesa: r.data, codigo: cv.data && cv.data.codigo, membros: mb.data };
  }, nomeMesa);
  ok(cm.mesa && cm.mesa.nome === nomeMesa, 'mestre cria a mesa — ' + (cm.erro || cm.mesa.id));
  ok(/^[A-Z2-9]{6}$/.test(cm.codigo || ''), 'a mesa nasce com código de convite de 6 caracteres: ' + cm.codigo);
  ok(cm.membros && cm.membros.length === 1 && cm.membros[0].papel === 'mestre' && cm.membros[0].nome === 'Bruno', 'quem cria é o mestre da mesa');
  const mesa = cm.mesa.id, codigo = cm.codigo;

  const antes = await J.evaluate(async mesa => {
    const m = await sb.from('mesas').select('*').eq('id', mesa); const mb = await sb.from('mesa_membros').select('*').eq('mesa_id', mesa);
    const rg = await sb.from('registro').insert({ mesa_id: mesa, id: 'x_fora', tipo: 'fala', dados: { texto: 'oi' } });
    const ruim = await sb.rpc('entrar_na_mesa', { p_codigo: 'ZZZZZZ', p_meu_nome: 'Dalmo' });
    return { mesas: m.data.length, membros: mb.data.length, escrever: rg.error ? 'recusado' : 'ACEITO', codigoRuim: ruim.error ? ruim.error.message : 'ACEITO' };
  }, mesa);
  ok(antes.mesas === 0 && antes.membros === 0, 'quem não entrou não vê a mesa nem os membros');
  ok(antes.escrever === 'recusado', 'quem não entrou não escreve no registro');
  ok(/não encontrado/.test(antes.codigoRuim), 'código errado: "' + antes.codigoRuim + '"');

  const entrou = await J.evaluate(async ([mesa, codigo]) => {
    const r = await sb.rpc('entrar_na_mesa', { p_codigo: codigo.slice(0, 3).toLowerCase() + '-' + codigo.slice(3).toLowerCase(), p_meu_nome: 'Dalmo' });
    const de_novo = await sb.rpc('entrar_na_mesa', { p_codigo: codigo, p_meu_nome: 'Outro nome' });
    const m = await sb.from('mesas').select('*').eq('id', mesa); const mb = await sb.from('mesa_membros').select('*').eq('mesa_id', mesa).order('entrou_em');
    const cv = await sb.from('mesa_convites').select('*').eq('mesa_id', mesa);
    const papel = await sb.from('mesa_membros').update({ papel: 'mestre' }).eq('mesa_id', mesa).eq('usuario_id', (await sb.auth.getUser()).data.user.id);
    const nome = await sb.from('mesa_membros').update({ nome: 'Dalmo F.' }).eq('mesa_id', mesa).eq('usuario_id', (await sb.auth.getUser()).data.user.id).select();
    const alheio = await sb.from('mesa_membros').update({ nome: 'Hackeado' }).eq('mesa_id', mesa).eq('papel', 'mestre').select();
    const renomear = await sb.from('mesas').update({ nome: 'Tomada' }).eq('id', mesa).select();
    const apagar = await sb.from('mesas').delete().eq('id', mesa).select();
    const trocar = await sb.rpc('novo_codigo', { p_mesa: mesa });
    return { erro: r.error && r.error.message, de_novo: de_novo.error && de_novo.error.message, mesas: m.data.length, membros: mb.data.map(x => x.papel + ':' + x.nome), convites: cv.data ? cv.data.length : 'erro',
      papel: papel.error ? 'recusado' : 'ACEITO', nome: nome.data && nome.data[0] && nome.data[0].nome, alheio: (alheio.data || []).length, renomear: (renomear.data || []).length, apagar: (apagar.data || []).length, trocar: trocar.error ? 'recusado' : 'ACEITO' };
  }, [mesa, codigo]);
  ok(!entrou.erro && entrou.mesas === 1, 'jogador entra com o código (minúsculas e hífen aceitos) — ' + (entrou.erro || 'ok'));
  ok(!entrou.de_novo && entrou.membros.length === 2, 'entrar de novo não duplica: ' + entrou.membros.join(', '));
  ok(entrou.membros[1].startsWith('jogador:'), 'quem entra pelo código é jogador');
  ok(entrou.convites === 0, 'jogador não vê o código de convite');
  ok(entrou.papel === 'recusado', 'jogador não consegue se promover a mestre');
  ok(entrou.nome === 'Dalmo F.', 'jogador troca o próprio nome na mesa');
  ok(entrou.alheio === 0, 'jogador não troca o nome do mestre');
  ok(entrou.renomear === 0 && entrou.apagar === 0, 'jogador não renomeia nem apaga a mesa');
  ok(entrou.trocar === 'recusado', 'jogador não troca o código de convite');

  // --- registro + tempo real ---
  const assinar = (page, mesa) => page.evaluate(mesa => new Promise(res => {
    window.eventos = [];
    window.canal = sb.channel('teste-' + mesa).on('postgres_changes', { event: '*', schema: 'public', table: 'registro', filter: 'mesa_id=eq.' + mesa }, p => window.eventos.push({ ev: p.eventType, id: p.new && p.new.id, secreta: p.new && p.new.secreta, texto: p.new && p.new.dados && p.new.dados.texto }))
      .subscribe(st => { if (st === 'SUBSCRIBED') res('ok'); if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') res(st); });
  }), mesa);
  const [sj, sf, sm] = await Promise.all([assinar(J, mesa), assinar(F, mesa), assinar(M, mesa)]);
  const ws = sj === 'ok' && sm === 'ok';   // o proxy deste ambiente não aceita WebSocket; lá fora, abre
  if (!ws) console.log('aviso: sem WebSocket neste ambiente (' + sj + '); as verificações de tempo real foram puladas');
  await w(1500);

  const escreve = await J.evaluate(async mesa => {
    const a = await sb.from('registro').insert({ mesa_id: mesa, id: 'm_jog_1', tipo: 'fala', dados: { texto: 'cheguei' }, autor_nome: 'Impostor', autor_id: '00000000-0000-0000-0000-000000000000' }).select().single();
    const s = await sb.from('registro').insert({ mesa_id: mesa, id: 'r_jog_secreta', tipo: 'rolagem', secreta: true, dados: { total: 20 } });
    return { erro: a.error && a.error.message, autor: a.data && a.data.autor_nome, meu: a.data && a.data.autor_id === (await sb.auth.getUser()).data.user.id, secreta: s.error ? 'recusada' : 'ACEITA' };
  }, mesa);
  ok(!escreve.erro && escreve.autor === 'Dalmo F.' && escreve.meu, 'jogador escreve; o nome e o autor vêm da mesa, não do que ele mandou — ' + (escreve.erro || escreve.autor));
  ok(escreve.secreta === 'recusada', 'jogador não rola em segredo');

  const mestre = await M.evaluate(async mesa => {
    const a = await sb.from('registro').insert({ mesa_id: mesa, id: 'r_aberta', tipo: 'rolagem', origem: 'rolador', dados: { total: 28, texto: 'aberta' } }).select().single();
    const b = await sb.from('registro').insert({ mesa_id: mesa, id: 'r_secreta', tipo: 'rolagem', secreta: true, dados: { total: 7, texto: 'secreta' } }).select().single();
    return { a: a.error && a.error.message, b: b.error && b.error.message, rev: a.data && b.data && b.data.rev > a.data.rev };
  }, mesa);
  ok(!mestre.a && !mestre.b && mestre.rev, 'mestre grava uma rolagem aberta e uma secreta; a revisão cresce');
  await w(2500);
  const ve = async page => page.evaluate(async mesa => ({ linhas: ((await sb.from('registro').select('id').eq('mesa_id', mesa).order('criado_em')).data || []).map(x => x.id), ao_vivo: (window.eventos || []).map(e => e.ev + ':' + e.id) }), mesa);
  let vj = await ve(J), vf = await ve(F), vm = await ve(M);
  ok(vj.linhas.join() === 'm_jog_1,r_aberta', 'jogador lê a fala e a rolagem aberta, não a secreta: ' + vj.linhas.join());
  ok(vm.linhas.join() === 'm_jog_1,r_aberta,r_secreta', 'mestre lê tudo: ' + vm.linhas.join());
  ok(vf.linhas.length === 0, 'quem está fora não lê nada');
  if (ws) ok(vj.ao_vivo.includes('INSERT:r_aberta') && !vj.ao_vivo.some(e => e.includes('r_secreta')), 'ao vivo: jogador recebe a aberta e NÃO a secreta — ' + vj.ao_vivo.join(' '));
  if (ws) ok(vm.ao_vivo.includes('INSERT:m_jog_1') && vm.ao_vivo.includes('INSERT:r_secreta'), 'ao vivo: mestre recebe a fala do jogador e a própria secreta — ' + vm.ao_vivo.join(' '));
  if (ws) ok(vf.ao_vivo.length === 0, 'ao vivo: quem está fora não recebe nada');

  const mexe = await J.evaluate(async mesa => {
    const a = await sb.from('registro').update({ dados: { total: 99 } }).eq('mesa_id', mesa).eq('id', 'r_aberta').select();
    const b = await sb.from('registro').update({ apagado: true }).eq('mesa_id', mesa).eq('id', 'r_secreta').select();
    const c = await sb.from('registro').update({ secreta: true }).eq('mesa_id', mesa).eq('id', 'm_jog_1').select();
    const d = await sb.from('registro').update({ autor_nome: 'Outro', tipo: 'sistema' }).eq('mesa_id', mesa).eq('id', 'm_jog_1').select();
    const e = await sb.from('registro').update({ dados: { texto: 'cheguei (editado)' } }).eq('mesa_id', mesa).eq('id', 'm_jog_1').select();
    const f = await sb.from('registro').delete().eq('mesa_id', mesa).eq('id', 'm_jog_1').select();
    return { alheia: (a.data || []).length, secreta: (b.data || []).length, virarSecreta: c.error ? 'recusado' : (c.data || []).length, autor: d.error ? 'recusado' : 'ACEITO', propria: e.data && e.data[0] && e.data[0].dados.texto, apagarDeVez: f.error ? 'recusado' : (f.data || []).length };
  }, mesa);
  ok(mexe.alheia === 0 && mexe.secreta === 0, 'jogador não altera rolagem dos outros');
  ok(mexe.virarSecreta === 'recusado' || mexe.virarSecreta === 0, 'jogador não torna secreta a própria linha: ' + mexe.virarSecreta);
  ok(mexe.autor === 'recusado', 'ninguém troca o autor ou o tipo de uma linha');
  ok(mexe.propria === 'cheguei (editado)', 'jogador corrige a própria fala');
  ok(mexe.apagarDeVez === 'recusado' || mexe.apagarDeVez === 0, 'apagar de vez não existe (só marcar como apagado)');

  const revela = await M.evaluate(async mesa => { const r = await sb.from('registro').update({ secreta: false }).eq('mesa_id', mesa).eq('id', 'r_secreta').select(); return r.error ? r.error.message : r.data.length; }, mesa);
  ok(revela === 1, 'mestre revela a rolagem secreta — ' + revela);
  await w(2500);
  vj = await ve(J);
  ok(vj.linhas.includes('r_secreta'), 'depois de revelada, o jogador lê a rolagem');
  if (ws) ok(vj.ao_vivo.includes('UPDATE:r_secreta'), 'ao vivo: a revelação chega ao jogador — ' + vj.ao_vivo.join(' '));

  // --- presença ---
  const pres = await J.evaluate(async mesa => { const r = await sb.rpc('marcar_presenca', { p_mesa: mesa }); const mb = await sb.from('mesa_membros').select('nome,visto_em').eq('mesa_id', mesa); return { erro: r.error && r.error.message, hora: r.data, vistos: mb.data.filter(x => x.visto_em).length }; }, mesa);
  ok(!pres.erro && !!pres.hora && pres.vistos === 2, 'presença: o jogador marca que está online e vê quem mais está — ' + JSON.stringify(pres));
  const presFora = await F.evaluate(async mesa => { const r = await sb.rpc('marcar_presenca', { p_mesa: mesa }); return r.error ? r.error.message : 'ACEITO'; }, mesa);
  ok(/não participa/.test(presFora), 'presença: quem está fora não marca — ' + presFora);

  // --- código novo, sair, remover ---
  const novo = await M.evaluate(async mesa => { const r = await sb.rpc('novo_codigo', { p_mesa: mesa }); return r.error ? r.error.message : r.data; }, mesa);
  ok(/^[A-Z2-9]{6}$/.test(novo) && novo !== codigo, 'mestre troca o código: ' + novo);
  const velho = await F.evaluate(async codigo => { const r = await sb.rpc('entrar_na_mesa', { p_codigo: codigo, p_meu_nome: 'Visitante' }); return r.error ? r.error.message : 'ENTROU'; }, codigo);
  ok(/não encontrado/.test(velho), 'o código antigo deixa de valer');
  const f2 = await F.evaluate(async ([mesa, novo]) => { const r = await sb.rpc('entrar_na_mesa', { p_codigo: novo, p_meu_nome: 'Visitante' }); const mb = await sb.from('mesa_membros').select('nome,cor').eq('mesa_id', mesa); return { erro: r.error && r.error.message, n: mb.data.length, cores: mb.data.map(x => x.cor) }; }, [mesa, novo]);
  ok(!f2.erro && f2.n === 3 && new Set(f2.cores).size === 3, 'o terceiro entra com o código novo e cada um tem uma cor: ' + JSON.stringify(f2));
  const tira = await M.evaluate(async ([mesa, uid]) => { const r = await sb.from('mesa_membros').delete().eq('mesa_id', mesa).eq('usuario_id', uid).select(); const eu = await sb.from('mesa_membros').delete().eq('mesa_id', mesa).eq('papel', 'mestre').select(); return { tirou: (r.data || []).length, mestre: (eu.data || []).length }; }, [mesa, ef.uid]);
  ok(tira.tirou === 1, 'mestre tira um jogador da mesa');
  ok(tira.mestre === 0, 'o mestre não sai da própria mesa (só apagando a mesa)');
  const sai = await J.evaluate(async mesa => { const uid = (await sb.auth.getUser()).data.user.id; const r = await sb.from('mesa_membros').delete().eq('mesa_id', mesa).eq('usuario_id', uid).select(); const m = await sb.from('mesas').select('id').eq('id', mesa); return { saiu: (r.data || []).length, ve: m.data.length }; }, mesa);
  ok(sai.saiu === 1 && sai.ve === 0, 'jogador sai da mesa e deixa de vê-la');

  // --- limpeza: o dono apaga a mesa e tudo dela vai junto ---
  const fim = await M.evaluate(async mesa => { const r = await sb.from('mesas').delete().eq('id', mesa).select(); const rg = await sb.from('registro').select('id').eq('mesa_id', mesa); return { apagou: (r.data || []).length, resto: (rg.data || []).length }; }, mesa);
  ok(fim.apagou === 1 && fim.resto === 0, 'o dono apaga a mesa; o registro vai junto');

  if (t.errs.length) console.log('CONSOLE:\n' + t.errs.join('\n'));
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
