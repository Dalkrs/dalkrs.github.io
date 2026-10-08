/* Tiny Cats · núcleo do site: conta, mesas e mesa ao vivo.
   Usado pela casca (index.html). Depende de supabase.js, config.js e dice.js, carregados antes.

   TC.conta   — quem está usando (e-mail e senha no Supabase)
   TC.mesas   — mesas de que a pessoa participa; criar, entrar com código, abrir uma
   TC.aoVivo  — o registro da mesa aberta: rolagens e conversa, na hora

   O tempo real do Supabase (WebSocket) entrega as novidades na hora; como algumas redes bloqueiam WebSocket,
   há também uma leitura periódica que garante que nada se perde (ela só fica mais lenta: alguns segundos). */
(() => {
  'use strict';
  const TC = (window.TC = window.TC || {});
  const CFG = window.TC_CONFIG || {};

  function emissor(obj) {
    const fs = {};
    obj.on = (ev, fn) => { (fs[ev] = fs[ev] || []).push(fn); return () => { fs[ev] = (fs[ev] || []).filter(f => f !== fn); }; };
    obj.emit = (ev, ...a) => { for (const f of (fs[ev] || []).slice()) { try { f(...a); } catch (e) { console.error(e); } } };
    return obj;
  }
  const guarda = {
    ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    gravar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } },
  };
  const novoId = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* ---------------- cliente ---------------- */
  let sb = null;
  const temNuvem = () => !!(window.supabase && CFG.url && CFG.chave);
  function cliente() {
    if (!sb) sb = window.supabase.createClient(CFG.url, CFG.chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    return sb;
  }

  /* Erros em português. O que o banco escreve (código errado, mesa cheia…) já chega em português e passa inteiro. */
  function erroPt(e, padrao) {
    const m = String((e && (e.message || e.error_description || e.erro)) || e || '');
    if (/^(Entre na sua conta|Dê um nome|Você |Código |Esta mesa|Esta campanha|Só o mestre|Só a primeira |Só dá para |Já existe|Digite |A senha |Diga |O cadastro |Não foi possível|Essa pessoa |O mestre da mesa )/.test(m)) return m;
    if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/Email not confirmed/i.test(m)) return 'Esta conta ainda não foi confirmada.';
    if (/Failed to fetch|NetworkError|Load failed|ERR_|network/i.test(m)) return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
    if (/row-level security|permission denied/i.test(m)) return 'Você não tem permissão para fazer isso nesta mesa.';
    if (/duplicate key/i.test(m)) return 'Isso já estava registrado.';
    return padrao || 'Não deu certo agora. Tente de novo.';
  }
  const falha = (e, padrao) => { const x = new Error(erroPt(e, padrao)); x.original = e; return x; };

  /* ---------------- conta ---------------- */
  const conta = emissor({ usuario: null, pronta: null, disponivel: temNuvem });
  let passe = null, passeAte = 0;   // o passe da sessão de agora e até quando vale (o envio de saída não pode esperar por ele)
  const deSessao = s => {
    const u = s && s.user;
    passe = u && s.access_token ? s.access_token : null;
    passeAte = passe ? Number(s.expires_at) || 0 : 0;
    return u ? { id: u.id, email: u.email || '', nome: (u.user_metadata && u.user_metadata.nome) || (u.email || '').split('@')[0] } : null;
  };
  conta.pronta = (async () => {
    if (!temNuvem()) return null;
    try {
      const { data } = await cliente().auth.getSession();
      conta.usuario = deSessao(data && data.session);
    } catch (e) { conta.usuario = null; }
    cliente().auth.onAuthStateChange((ev, s) => {
      // nada de chamar o Supabase aqui dentro (trava): só anota e avisa depois
      const u = deSessao(s), antes = conta.usuario ? conta.usuario.id : null;
      conta.usuario = u;
      if ((u ? u.id : null) !== antes) setTimeout(() => conta.emit('muda', u), 0);
    });
    return conta.usuario;
  })();
  conta.entrar = async (email, senha) => {
    const { data, error } = await cliente().auth.signInWithPassword({ email: String(email).trim(), password: senha });
    if (error) throw falha(error, 'Não deu para entrar agora. Tente de novo.');
    conta.usuario = deSessao(data && data.session);
    return conta.usuario;
  };
  conta.criar = async (email, senha, nome) => {
    let r, corpo = null;
    try {
      r = await fetch(CFG.url + '/functions/v1/criar-conta', { method: 'POST', headers: { 'content-type': 'application/json', apikey: CFG.chave }, body: JSON.stringify({ email, senha, nome }) });
      corpo = await r.json().catch(() => null);
    } catch (e) { throw falha(e); }
    if (!r.ok) throw falha(corpo && corpo.erro, 'Não foi possível criar a conta agora. Tente de novo.');
    return conta.entrar(email, senha);
  };
  conta.sair = async () => {
    mesas.fechar();
    try { await cliente().auth.signOut(); } catch (e) { /* sem rede: a sessão local some do mesmo jeito */ }
    conta.usuario = null; passe = null; passeAte = 0;
  };

  /* ---------------- mesas ---------------- */
  const CHAVE_MESA = 'tinycats:mesa';
  const mesas = emissor({ atual: null });
  const exigir = () => { if (!conta.usuario) throw new Error('Entre na sua conta primeiro.'); return conta.usuario; };

  mesas.lista = async () => {
    const u = exigir();
    const { data, error } = await cliente().from('mesa_membros').select('papel, jogando, nome, mesas(id, nome, criada_em)').eq('usuario_id', u.id);
    if (error) throw falha(error);
    return (data || []).filter(x => x.mesas).map(x => { const m = membroDe(x); return { id: x.mesas.id, nome: x.mesas.nome, papel: m.papel, cargo: m.cargo, jogando: m.jogando, criada: x.mesas.criada_em }; })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  };
  mesas.criar = async (nome, meuNome) => {
    const u = exigir();
    const { data, error } = await cliente().rpc('criar_mesa', { p_nome: nome, p_meu_nome: meuNome || u.nome });
    if (error) throw falha(error, 'Não deu para criar a mesa agora.');
    return mesas.abrir(data.id);
  };
  mesas.entrarComCodigo = async (codigo, meuNome) => {
    const u = exigir();
    const { data, error } = await cliente().rpc('entrar_na_mesa', { p_codigo: codigo, p_meu_nome: meuNome || u.nome });
    if (error) throw falha(error, 'Não deu para entrar na mesa agora.');
    return mesas.abrir(data.id);
  };
  /* Os participantes, como o site os usa. `cargo` é o que o banco guarda: 'mestre', 'auxiliar' ou 'jogador'. `papel` é
     o que a pessoa está fazendo agora: o auxiliar que está mestrando conta como 'mestre'; o que está jogando como
     jogador, como 'jogador'. É pelo `papel` que os sistemas decidem o que mostrar; pelo `cargo`, quem administra.
     `abas`: as abas que o auxiliar mestra (o mestre mestra todas; o jogador, nenhuma). */
  const ABAS_DE_MESTRE = ['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador'];
  function membroDe(x) {
    const cargo = x.papel === 'mestre' || x.papel === 'auxiliar' ? x.papel : 'jogador', jogando = cargo === 'auxiliar' && !!x.jogando;
    return { usuario_id: x.usuario_id, nome: x.nome, cor: x.cor, visto_em: x.visto_em, cargo, jogando,
      abas: cargo === 'auxiliar' && Array.isArray(x.abas) ? ABAS_DE_MESTRE.filter(a => x.abas.includes(a)) : [],
      papel: cargo === 'mestre' || (cargo === 'auxiliar' && !jogando) ? 'mestre' : 'jogador' };
  }
  async function lerMembros(id) {
    const { data, error } = await cliente().from('mesa_membros').select('usuario_id, papel, nome, cor, visto_em, jogando, abas').eq('mesa_id', id).order('entrou_em');
    if (error) throw error;
    return (data || []).map(membroDe);
  }
  /* As campanhas da mesa que esta pessoa vê — quem mestra, todas; o jogador, as de que participa —, na ordem do mestre,
     e quem participa de cada uma ({ usuário: [campanhas] }). Num banco de antes das campanhas, não há nenhuma. */
  const semEsquema = e => /does not exist|schema cache|Could not find/i.test(String((e && e.message) || '')) || /^(42P01|42703|PGRST20\d)$/.test(String((e && e.code) || ''));
  const SEM_CAMPANHAS = { lista: [], de: {}, ligadas: false };
  // (ligadas: o banco desta mesa já tem as campanhas — quem diz é a linha da mesa, que nesse caso traz a conta delas)
  async function lerCampanhas(id, ligadas) {
    if (!ligadas) return SEM_CAMPANHAS;
    const [c, p] = await Promise.all([
      cliente().from('campanhas').select('id, nome, ordem, encerrada').eq('mesa_id', id),
      cliente().from('campanha_membros').select('campanha_id, usuario_id').eq('mesa_id', id),
    ]);
    if (c.error || p.error) { if (semEsquema(c.error || p.error)) return SEM_CAMPANHAS; throw c.error || p.error; }
    const lista = (c.data || []).map(x => ({ id: x.id, nome: x.nome, ordem: Number(x.ordem) || 0, encerrada: !!x.encerrada })).sort((a, b) => (a.ordem - b.ordem) || (a.id < b.id ? -1 : 1));
    const de = {};
    for (const x of p.data || []) (de[x.usuario_id] = de[x.usuario_id] || []).push(x.campanha_id);
    return { lista, de, ligadas: true };
  }
  const comCampanhas = (membros, camps) => { for (const x of membros) x.campanhas = (camps.de[x.usuario_id] || []).filter(id => camps.lista.some(c => c.id === id)).sort(); return membros; };
  /* O que decide o que eu posso ver: o cargo, se estou jogando, as abas e — para quem não está mestrando — as campanhas
     de que participo. Quando isso muda, a mesa é aberta de novo. */
  const meuJeito = m => [m.cargo, m.jogando ? 1 : 0, (m.abas || []).join(','), m.papel === 'mestre' ? '' : (m.campanhas || []).join(',')].join('|');
  /* A campanha em vista neste aparelho: a que a pessoa escolheu por último nesta mesa; sem isso (ou se ela já não
     está na lista), a primeira em que ainda se joga; sem nenhuma aberta, a primeira. Mesa sem campanhas: nenhuma. */
  const CHAVE_VISTA = 'tinycats:campanha:';
  function escolherVista(a) {
    const l = a.campanhas || [], salva = guarda.ler(CHAVE_VISTA + a.id);
    const c = l.find(x => x.id === salva) || l.find(x => !x.encerrada) || l[0];
    return c ? c.id : null;
  }
  mesas.abrir = async id => {
    const u = exigir();
    // (a linha inteira: num banco que já tem as campanhas ela traz `campanhas`, a conta de quantas a mesa tem)
    const { data: m, error } = await cliente().from('mesas').select('*').eq('id', id).maybeSingle();
    if (error) throw falha(error);
    if (!m) { guarda.gravar(CHAVE_MESA, null); throw new Error('Esta mesa não existe mais, ou você saiu dela.'); }
    const [membros, camps] = await Promise.all([lerMembros(id), lerCampanhas(id, 'campanhas' in m)]).catch(e => { throw falha(e); });
    comCampanhas(membros, camps);
    const eu = membros.find(x => x.usuario_id === u.id);
    if (!eu) throw new Error('Você não participa desta mesa.');
    let codigo = null;
    if (eu.cargo === 'mestre') {                             // (o código de convite é de quem administra a mesa)
      const cv = await cliente().from('mesa_convites').select('codigo').eq('mesa_id', id).maybeSingle();
      codigo = cv.data ? cv.data.codigo : null;
    }
    aoVivo.parar(); dadosZerar();
    /* campanhas: as que vejo ([{ id, nome, ordem, encerrada }]) · campanha: a em vista (id) · temCampanhas: a mesa tem
       campanhas, mesmo que eu não participe de nenhuma (aí só vejo o que é do mundo) */
    mesas.atual = { id: m.id, nome: m.nome, dono: m.dono_id === u.id, papel: eu.papel, cargo: eu.cargo, jogando: eu.jogando, abas: eu.abas.slice(), meuNome: eu.nome, minhaCor: eu.cor, codigo, membros,
      campanhas: camps.lista, campanha: null, temCampanhas: camps.lista.length > 0 || (Number(m.campanhas) || 0) > 0, campanhasLigadas: camps.ligadas, jeito: meuJeito(eu) };      // (campanhasLigadas: o banco desta mesa já tem as campanhas)
    mesas.atual.campanha = escolherVista(mesas.atual);
    guarda.gravar(CHAVE_MESA, id);
    mesas.emit('muda', mesas.atual);
    aoVivo.iniciar(id);      // o registro carrega em segundo plano: a mesa já está aberta e a janela pode fechar
    return mesas.atual;
  };
  mesas.fechar = () => {
    aoVivo.parar(); dadosZerar();
    if (mesas.atual) { mesas.atual = null; mesas.emit('muda', null); }
  };
  mesas.esquecer = () => { guarda.gravar(CHAVE_MESA, null); mesas.fechar(); };
  mesas.ultima = () => guarda.ler(CHAVE_MESA);
  /* Quem mestra o quê. O mestre mestra todas as abas; o auxiliar, enquanto está mestrando, as que o mestre liberou;
     o jogador (e o auxiliar que está jogando como jogador), nenhuma. Administrar a mesa — o código de convite, tirar
     gente, renomear, nomear auxiliares — é só do mestre. */
  mesas.abasDeMestre = ABAS_DE_MESTRE.slice();
  mesas.mestra = aba => { const a = mesas.atual; return !!a && (a.cargo === 'mestre' || (a.cargo === 'auxiliar' && !a.jogando && a.abas.includes(aba))); };
  mesas.administra = () => !!mesas.atual && mesas.atual.cargo === 'mestre';
  /* O mestre nomeia um mestre auxiliar (ou o devolve a jogador) e diz que abas ele mestra. Sem lista de abas, todas. */
  mesas.definirAuxiliar = async (usuarioId, auxiliar, abas) => {
    const a = mesas.atual; if (!a) return null;
    const args = { p_mesa: a.id, p_usuario: usuarioId, p_auxiliar: !!auxiliar };
    if (auxiliar && Array.isArray(abas)) args.p_abas = abas.filter(x => ABAS_DE_MESTRE.includes(x));
    const { data, error } = await cliente().rpc('definir_auxiliar', args);
    if (error) throw falha(error, 'Não deu para mudar o papel agora. Tente de novo.');
    await recarregarMembros();
    return data ? membroDe(data) : null;
  };
  /* O auxiliar alterna entre mestrar e jogar como jogador. Vale para a conta dele, em todos os aparelhos: o banco passa
     a tratá-lo como jogador (ou de novo como quem mestra), e a mesa é aberta outra vez, com o que ele pode ver agora. */
  let reabrindo = false;
  mesas.jogar = async jogando => {
    const a = mesas.atual; if (!a) return null;
    if (a.cargo !== 'auxiliar') throw new Error('Você não é mestre auxiliar desta mesa.');
    reabrindo = true;
    try {
      const { error } = await cliente().rpc('auxiliar_jogar', { p_mesa: a.id, p_jogando: !!jogando });
      if (error) throw falha(error, 'Não deu para trocar agora. Tente de novo.');
      return await mesas.abrir(a.id);
    } finally { reabrindo = false; }
  };
  /* A casca diz aqui o que fazer logo antes de a mesa ser aberta de novo por causa de uma mudança de papel (entregar o
     que os sistemas ainda seguravam). */
  mesas.antesDeReabrir = null;

  /* ---- campanhas ----
     A mesa é um mundo; cada campanha tem os jogadores, os grupos de fichas, a conversa, o acampamento, as missões do
     grupo, as cenas e os mapas dela. O que não é de nenhuma campanha é "do mundo" e aparece em todas. Cada aparelho
     tem uma campanha em vista (mesas.atual.campanha): é nela que a pessoa está jogando ou mestrando agora. */
  /* "Campanha em evidência": onde se escolhe um personagem (ou uma cena, um mapa), o que é da campanha em vista vem
     primeiro, depois o que é do mundo (sem campanha) e por fim o das outras campanhas. Devolve os grupos que têm
     alguém, nessa ordem: [{ id, nome, vista, itens }] (id '' = do mundo; vista: é o grupo em evidência). Numa mesa sem
     campanhas, um grupo só, sem nome. (A mesma conta está em tc/ponte.js, para os sistemas.) */
  function agruparPorCampanha(itens, campDe, vista, lista) {
    itens = itens || []; lista = lista || [];
    if (!lista.length && !itens.some(x => campDe(x))) return itens.length ? [{ id: '', nome: '', vista: true, itens: itens.slice() }] : [];
    const por = new Map(), out = [];
    for (const x of itens) { const c = campDe(x) || ''; if (!por.has(c)) por.set(c, []); por.get(c).push(x); }
    const nomeDe = id => { const c = lista.find(y => y.id === id); return c ? c.nome + (c.encerrada ? ' (encerrada)' : '') : 'Outra campanha'; };
    const poe = (id, nome, v) => { if (por.has(id)) { out.push({ id, nome, vista: v, itens: por.get(id) }); por.delete(id); } };
    if (vista) poe(vista, nomeDe(vista), true);
    poe('', 'Do mundo', !vista);
    for (const c of lista) poe(c.id, nomeDe(c.id), false);
    for (const id of [...por.keys()]) poe(id, nomeDe(id), false);
    return out;
  }
  TC.agruparPorCampanha = agruparPorCampanha;
  mesas.porCampanha = (itens, campDe) => { const a = mesas.atual; return agruparPorCampanha(itens, campDe, a ? a.campanha : null, a ? a.campanhas : []); };
  const ENCERRADA = 'Esta campanha está encerrada: só consulta. Para mexer nela, o mestre a reabre no menu da mesa.';
  mesas.campanha = () => { const a = mesas.atual; return (a && a.campanha && a.campanhas.find(c => c.id === a.campanha)) || null; };
  // a campanha tal está encerrada? (a conversa, as fichas, o acampamento e as missões do grupo dela são só para consulta)
  mesas.encerrada = id => { const a = mesas.atual; return !!id && !!a && a.campanhas.some(c => c.id === id && c.encerrada); };
  /* Troca a campanha em vista neste aparelho: a conversa da mesa ao vivo passa a ser a dela, e a casca abre as abas de
     novo (cada sistema mostra o que é dela). */
  mesas.verCampanha = id => {
    const a = mesas.atual; if (!a) return null;
    if (!a.campanhas.some(c => c.id === id)) throw new Error('Esta campanha não existe mais.');
    if (a.campanha !== id) { a.campanha = id; guarda.gravar(CHAVE_VISTA + a.id, id); aoVivo.recarregar(); mesas.emit('muda', a); }
    return mesas.campanha();
  };
  /* Organizar as campanhas — criar, renomear, encerrar ou reabrir, ordenar, dizer quem participa, apagar — é só do
     mestre da mesa (o banco confere). Depois de cada mudança, a lista e o que mudou nos dados da mesa são lidos de novo. */
  async function organizar(funcao, args, padrao) {
    const a = mesas.atual; if (!a) throw new Error('Abra uma mesa primeiro.');
    const { data, error } = await cliente().rpc(funcao, Object.assign({ p_mesa: a.id }, args));
    if (error) throw falha(error, semEsquema(error) ? 'As campanhas ainda não estão ligadas no banco desta mesa.' : padrao || 'Não deu para mudar as campanhas agora. Tente de novo.');
    if (mesas.atual === a) { await recarregarMembros(); buscarNovos(); dadosBuscar(); }
    return data;
  }
  /* Com `adotar`, a PRIMEIRA campanha da mesa recebe o que a mesa já tinha: as fichas, a conversa, o acampamento, as
     missões do grupo, as cenas e os mapas; e quem já joga na mesa passa a participar dela. */
  mesas.criarCampanha = (nome, adotar) => organizar('campanha_criar', { p_nome: String(nome || ''), p_adotar: !!adotar }, 'Não deu para criar a campanha agora. Tente de novo.');
  mesas.mudarCampanha = (id, o) => organizar('campanha_mudar', { p_id: id, p_nome: o && o.nome != null ? String(o.nome) : null, p_encerrada: o && o.encerrada != null ? !!o.encerrada : null });
  mesas.ordenarCampanhas = ids => organizar('campanha_ordenar', { p_ids: ids });
  mesas.participar = (id, usuarioId, sim) => organizar('campanha_participa', { p_id: id, p_usuario: usuarioId, p_sim: !!sim });
  mesas.apagarCampanha = id => organizar('campanha_apagar', { p_id: id });                // (só a que não guarda nada)
  mesas.desfazerCampanhas = id => organizar('campanha_desfazer', { p_id: id });           // (só com uma campanha: tudo volta a ser da mesa)
  mesas.novoCodigo = async () => {
    const a = mesas.atual; if (!a) return null;
    const { data, error } = await cliente().rpc('novo_codigo', { p_mesa: a.id });
    if (error) throw falha(error);
    a.codigo = data; mesas.emit('muda', a);
    return data;
  };
  mesas.sair = async () => {            // jogador sai da mesa
    const a = mesas.atual, u = exigir(); if (!a) return;
    const { error } = await cliente().from('mesa_membros').delete().eq('mesa_id', a.id).eq('usuario_id', u.id);
    if (error) throw falha(error);
    mesas.esquecer();
  };
  // Ler de novo quem participa da mesa (e as campanhas): para a janela que vai dizer nomes não ficar um passo atrás.
  mesas.conferirMembros = () => recarregarMembros();
  mesas.tirar = async usuarioId => {    // mestre tira um jogador
    const a = mesas.atual; if (!a) return;
    const { error } = await cliente().from('mesa_membros').delete().eq('mesa_id', a.id).eq('usuario_id', usuarioId);
    if (error) throw falha(error);
    await recarregarMembros();
  };
  mesas.renomear = async nome => {       // o mestre troca o nome da mesa; devolve o nome que ficou
    const a = mesas.atual; if (!a) return null;
    const novo = String(nome || '').trim().slice(0, 80);
    if (!novo) throw new Error('Dê um nome à mesa.');
    const { data, error } = await cliente().from('mesas').update({ nome: novo }).eq('id', a.id).select('nome').maybeSingle();
    if (error || !data) throw falha(error, 'Só o mestre pode renomear a mesa.');
    a.nome = data.nome; mesas.emit('muda', a);
    return data.nome;
  };
  // O nome da mesa pode ter sido trocado pelo mestre em outro aparelho: quem está com ela aberta acompanha.
  async function conferirNome() {
    const a = mesas.atual; if (!a) return;
    try {
      const { data } = await cliente().from('mesas').select('*').eq('id', a.id).maybeSingle();
      if (!data || mesas.atual !== a) return;
      // (quem não participa de nenhuma campanha fica sabendo por aqui que a mesa passou a ter — ou deixou de ter — campanhas)
      const tem = a.campanhas.length > 0 || (Number(data.campanhas) || 0) > 0, ligadas = 'campanhas' in data;
      if ((data.nome && data.nome !== a.nome) || tem !== a.temCampanhas || ligadas !== a.campanhasLigadas) { if (data.nome) a.nome = data.nome; a.temCampanhas = tem; a.campanhasLigadas = ligadas; mesas.emit('muda', a); }
    } catch (e) { /* sem rede: a próxima volta confere */ }
  }
  /* Os arquivos da mesa (imagens de mapas, tokens e retratos) ficam numa pasta com o id dela. Apagar a mesa leva a
     pasta junto — antes de apagar a mesa, porque depois dela ninguém mais tem permissão sobre a pasta. */
  async function apagarArquivos(id) {
    const balde = cliente().storage.from('mesas');
    const fila = [id], vistas = new Set(fila);            // a pasta da mesa e as de dentro (os retratos dos jogadores: <mesa>/j/<jogador>/)
    while (fila.length) {
      const pasta = fila.shift();
      for (let volta = 0; volta < 100; volta++) {
        const { data, error } = await balde.list(pasta, { limit: 100 });
        if (error || !data || !data.length) break;
        for (const x of data) if (x && x.name && !x.id && !vistas.has(pasta + '/' + x.name)) { vistas.add(pasta + '/' + x.name); fila.push(pasta + '/' + x.name); }     // (pasta não tem id)
        const nomes = data.filter(x => x && x.name && x.id).map(x => pasta + '/' + x.name);
        if (!nomes.length) break;
        const r = await balde.remove(nomes);
        if (r.error || !(r.data || []).length) break;     // nada saiu: não insiste
      }
    }
  }
  mesas.apagar = async () => {          // o dono apaga a mesa inteira
    const a = mesas.atual; if (!a) return;
    if (!a.dono) throw new Error('Só quem criou a mesa pode apagá-la.');
    try { await apagarArquivos(a.id); } catch (e) { /* os arquivos que sobrarem não impedem de apagar a mesa */ }
    const { data, error } = await cliente().from('mesas').delete().eq('id', a.id).select('id');
    if (error || !data || !data.length) throw falha(error, 'Só quem criou a mesa pode apagá-la.');
    mesas.esquecer();
  };
  async function recarregarMembros() {
    const a = mesas.atual; if (!a) return;
    try {
      const [membros, camps] = await Promise.all([lerMembros(a.id), lerCampanhas(a.id, a.campanhasLigadas)]);
      if (mesas.atual !== a) return;
      comCampanhas(membros, camps);
      const eu = membros.find(x => x.usuario_id === (conta.usuario && conta.usuario.id));
      if (!eu) { mesas.esquecer(); mesas.emit('removido'); return; }
      /* O meu papel mudou — o mestre me nomeou auxiliar, mexeu nas minhas abas ou me devolveu a jogador; ou eu mesmo
         alternei entre mestrar e jogar em outro aparelho —, ou mudaram as campanhas de que participo. O que posso ver é
         outro: a mesa é aberta de novo. */
      if (meuJeito(eu) !== a.jeito) {
        if (reabrindo) return;
        reabrindo = true;
        const antes = { cargo: a.cargo, jogando: a.jogando, abas: a.abas.slice(), campanhas: a.campanhas.map(c => c.id) };
        try {
          /* A mesa reabre na campanha que a pessoa estava vendo: quem vira auxiliar (e passa a ver todas), ou entra em
             mais uma, não é levado para outra campanha sem pedir. */
          if (a.campanha) guarda.gravar(CHAVE_VISTA + a.id, a.campanha);
          if (typeof mesas.antesDeReabrir === 'function') { try { mesas.antesDeReabrir(); } catch (e) { console.error(e); } }
          const nova = await mesas.abrir(a.id);
          mesas.emit('permissao', antes, { cargo: nova.cargo, jogando: nova.jogando, abas: nova.abas.slice(), campanhas: nova.campanhas.map(c => c.id) });
        } finally { reabrindo = false; }
        return;
      }
      a.membros = membros; mesas.emit('membros', membros);
      /* As campanhas mudaram (o mestre criou, renomeou, encerrou, reordenou ou apagou uma)? A lista acompanha; se a que
         estava em vista saiu, outra entra no lugar — e a conversa da mesa ao vivo passa a ser a dela. */
      const jAntes = JSON.stringify(a.campanhas), vistaAntes = a.campanha, tinha = a.temCampanhas;
      a.campanhas = camps.lista;
      if (a.papel === 'mestre') a.temCampanhas = camps.lista.length > 0;      // (quem mestra vê todas: a lista diz tudo)
      else if (camps.lista.length) a.temCampanhas = true;
      if (!a.campanhas.some(c => c.id === a.campanha)) a.campanha = escolherVista(a);
      if (JSON.stringify(a.campanhas) !== jAntes || a.campanha !== vistaAntes || a.temCampanhas !== tinha) {
        if (a.campanha !== vistaAntes) aoVivo.recarregar();
        mesas.emit('campanhas', a.campanhas);
        mesas.emit('muda', a);
      }
    } catch (e) { /* sem rede: tenta de novo na próxima volta */ }
  }

  /* ---------------- mesa ao vivo ---------------- */
  const LIMITE = 300;          // linhas guardadas na tela
  const aoVivo = emissor({ itens: [], conectado: false, segredo: false });
  let mesaId = null, canal = null, canalCamp = null, relogio = 0, volta = 0, maxRev = 0, folga = 0, buscando = false;

  const online = m => !!(m && m.visto_em && (Date.now() + folga - Date.parse(m.visto_em)) < 75000);
  aoVivo.online = online;
  /* Há quanto tempo (ms) uma linha do registro chegou à mesa — foi escrita ou, se era secreta, mostrada —, pelo
     relógio do banco (o do aparelho pode estar errado). */
  aoVivo.idade = l => { const t = l ? Date.parse(l.atualizado_em || l.criado_em || '') : NaN; return isFinite(t) ? Math.max(0, Date.now() + folga - t) : 0; };

  /* Cada campanha tem a sua conversa. O painel mostra as linhas da campanha em vista e as "do mundo" (sem campanha);
     numa mesa sem campanhas, todas são do mundo. Quem mestra recebe do banco as linhas de todas as campanhas: as das
     outras não entram aqui. */
  const vista = () => (mesas.atual && mesas.atual.campanha) || null;
  const daVista = q => { const c = vista(); return c ? q.or('campanha.is.null,campanha.eq.' + c) : q; };
  /* `avulsa`: a linha chegou sozinha — é a volta de uma gravação daqui —, não numa leitura em ordem nem pelo aviso em
     tempo real. Uma linha assim não diz nada sobre as outras: não empurra a marca de "até onde já li" (maxRev). Se
     empurrasse, a leitura seguinte pularia o que os outros escreveram logo antes e este aparelho ainda não leu — quem
     falasse assim que abre a mesa, logo depois de outra pessoa, ficava sem ver a fala dela. */
  function aplicar(linha, silencioso, avulsa) {
    if (!linha || linha.mesa_id !== mesaId) return;
    if (!avulsa && linha.rev > maxRev) maxRev = linha.rev;
    if (linha.campanha && linha.campanha !== vista()) return;
    const i = aoVivo.itens.findIndex(x => x.id === linha.id);
    if (linha.apagado) { if (i >= 0) { aoVivo.itens.splice(i, 1); if (!silencioso) aoVivo.emit('saiu', linha); } return; }
    if (i >= 0) {
      if (aoVivo.itens[i].rev >= linha.rev) return;
      aoVivo.itens[i] = linha; if (!silencioso) aoVivo.emit('item', linha, false);
      return;
    }
    aoVivo.itens.push(linha);
    aoVivo.itens.sort((a, b) => (a.criado_em < b.criado_em ? -1 : a.criado_em > b.criado_em ? 1 : 0));
    if (aoVivo.itens.length > LIMITE) aoVivo.itens.splice(0, aoVivo.itens.length - LIMITE);
    if (!silencioso) aoVivo.emit('item', linha, true);
  }
  /* A leitura periódica pede "o que tem revisão maior que a última que vi". Mas duas linhas escritas no mesmo instante
     podem aparecer no banco fora de ordem: a de revisão menor fica visível depois da de revisão maior, que a leitura
     já passou — e ficaria para trás para sempre (a rolagem de um jogador que nunca aparece no painel de outro).
     Então a faixa da leitura anterior é conferida de novo, só com o nome e a revisão de cada linha, e a que não
     estiver aqui é lida inteira. (Só há o que conferir quando algo chegou na leitura anterior.) */
  let anterior = null;             // até onde ia o registro antes da última leitura
  let leitura = 0;                 // muda quando o painel recomeça (outra mesa, outra campanha em vista): o que estava sendo lido antes não vale mais
  async function buscarNovos() {
    if (!mesaId || buscando) return;
    buscando = true;
    const id = mesaId, de = maxRev, minhaLeitura = leitura;
    try {
      const { data, error } = await daVista(cliente().from('registro').select('*').eq('mesa_id', id).gt('rev', de)).order('rev').limit(200);
      const vale = () => id === mesaId && leitura === minhaLeitura;            // (a mesa não fechou, e a campanha em vista não mudou no meio)
      if (!error && vale()) for (const l of data || []) aplicar(l);
      if (!error && vale() && anterior != null && anterior < de) {
        const leve = await daVista(cliente().from('registro').select('id,rev,apagado').eq('mesa_id', id).gt('rev', anterior).lte('rev', de)).limit(1000);
        if (!leve.error && vale()) {
          const faltam = (leve.data || []).filter(x => { const l = aoVivo.itens.find(y => y.id === x.id); return l ? (l.rev || 0) < x.rev : !x.apagado; }).map(x => x.id);
          if (faltam.length) {
            const r = await cliente().from('registro').select('*').eq('mesa_id', id).in('id', faltam.slice(0, 200));
            if (!r.error && vale()) for (const l of (r.data || []).sort((a, b) => a.rev - b.rev)) aplicar(l);
          }
        }
      }
      if (!error && vale()) anterior = de;
    } catch (e) { /* sem rede: a próxima volta tenta de novo */ }
    buscando = false;
  }
  async function presenca() {
    if (!mesaId || document.hidden) return;
    try {
      const { data } = await cliente().rpc('marcar_presenca', { p_mesa: mesaId });
      if (data) folga = Date.parse(data) - Date.now();
    } catch (e) { /* idem */ }
    recarregarMembros(); conferirNome();
  }
  // As últimas linhas do painel, lidas do banco.
  /* A revisão mais alta é lida ANTES das linhas, e é dela que a leitura periódica parte: o que alguém escrever
     enquanto as linhas são lidas tem revisão maior e chega na primeira leitura periódica. (Lida depois, uma linha
     escrita entre uma leitura e a outra ficava com revisão "já vista" sem nunca ter sido lida.) A primeira leitura
     periódica ainda confere de novo a faixa das últimas linhas: uma que estivesse sendo escrita no instante em que
     a mesa abriu pode ter revisão menor que a mais alta. */
  async function carregarItens(id) {
    const minhaLeitura = leitura;
    try {
      const topo = await cliente().from('registro').select('rev').eq('mesa_id', id).order('rev', { ascending: false }).limit(1);
      const { data, error } = await daVista(cliente().from('registro').select('*').eq('mesa_id', id).eq('apagado', false)).order('criado_em', { ascending: false }).limit(200);
      if (error) throw error;
      if (mesaId !== id || leitura !== minhaLeitura) return;
      for (const l of (data || []).reverse()) aplicar(l, true);
      const ate = topo.error ? null : topo.data && topo.data[0] ? topo.data[0].rev : 0;
      if (ate != null) maxRev = ate;                         // (sem a revisão mais alta, vale a maior das linhas lidas)
      const recentes = (data || []).map(l => l.rev).sort((a, b) => b - a);
      anterior = ate != null && recentes.length ? Math.min(ate, recentes[Math.min(recentes.length, 20) - 1]) - 1 : null;
    } catch (e) { /* começa vazio; a leitura periódica completa depois */ }
  }
  /* A campanha em vista mudou: o painel recomeça, com a conversa dela. */
  aoVivo.recarregar = async () => {
    const id = mesaId; if (!id) return;
    const minha = ++leitura;
    maxRev = 0; anterior = null; aoVivo.itens = [];
    aoVivo.emit('reinicio');
    await carregarItens(id);
    if (mesaId === id && leitura === minha) aoVivo.emit('reinicio');
  };
  aoVivo.iniciar = async id => {
    aoVivo.parar();
    mesaId = id; maxRev = 0; anterior = null; aoVivo.itens = []; leitura++;
    // (o "em segredo" lembrado só vale para quem está mestrando: o auxiliar que passou a jogar como jogador não rola em segredo)
    aoVivo.segredo = guarda.ler('tinycats:segredo:' + id) === '1' && !!mesas.atual && mesas.atual.papel === 'mestre';
    await carregarItens(id);
    if (mesaId !== id) return;
    aoVivo.emit('reinicio');
    /* As campanhas e quem participa delas têm um canal só delas: num banco de antes das campanhas essas tabelas não
       existem, e o pedido de avisos delas não pode derrubar os avisos do resto. */
    if (mesas.atual && mesas.atual.campanhasLigadas) try {
      canalCamp = cliente().channel('mesa-camp-' + id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'campanhas', filter: 'mesa_id=eq.' + id }, () => { clearTimeout(aoVivo._m); aoVivo._m = setTimeout(recarregarMembros, 400); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'campanha_membros', filter: 'mesa_id=eq.' + id }, () => { clearTimeout(aoVivo._m); aoVivo._m = setTimeout(recarregarMembros, 400); })
        .subscribe();
    } catch (e) { canalCamp = null; }
    try {
      canal = cliente().channel('mesa-' + id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'registro', filter: 'mesa_id=eq.' + id }, p => {
          if (!p.new || !p.new.id) return;
          // (uma linha grande que só mudou de estado — revelada, desapagada — chega sem o conteúdo: é lida do banco)
          if (!p.new.apagado && (p.new.dados === undefined || (p.errors && p.errors.length))) { buscarNovos(); return; }
          aplicar(p.new);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mesas', filter: 'id=eq.' + id }, () => conferirNome())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mesa_membros', filter: 'mesa_id=eq.' + id }, () => { clearTimeout(aoVivo._m); aoVivo._m = setTimeout(recarregarMembros, 400); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'personagens', filter: 'mesa_id=eq.' + id }, p => doTempoReal('personagens', p))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'documentos', filter: 'mesa_id=eq.' + id }, p => doTempoReal('documentos', p))
        .subscribe(st => { const c = st === 'SUBSCRIBED'; if (c !== aoVivo.conectado) { aoVivo.conectado = c; aoVivo.emit('estado', c); if (c) { buscarNovos(); dadosBuscar(); } } });
    } catch (e) { canal = null; }
    // Rede de segurança: sem o tempo real, lê a cada 3 s; com ele, confere a cada 30 s. A presença vai a cada 25 s.
    volta = 0;
    relogio = setInterval(() => {
      volta++;
      if (!aoVivo.conectado || volta % 10 === 0) { buscarNovos(); dadosBuscar(); }
      if (volta % 3 === 0) dadosConferir();
      if (volta % 8 === 0) presenca();
      else if (!aoVivo.conectado && volta % 2 === 0) recarregarMembros();   // sem tempo real, quem entrou aparece em poucos segundos
    }, 3000);
    presenca();
  };
  aoVivo.parar = () => {
    clearInterval(relogio); relogio = 0;
    if (canal) { try { cliente().removeChannel(canal); } catch (e) { /* já fechado */ } canal = null; }
    if (canalCamp) { try { cliente().removeChannel(canalCamp); } catch (e) { /* já fechado */ } canalCamp = null; }
    mesaId = null; aoVivo.itens = []; leitura++;
    if (aoVivo.conectado) { aoVivo.conectado = false; aoVivo.emit('estado', false); }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && mesaId) { buscarNovos(); dadosBuscar(); presenca(); } });

  async function gravar(tipo, dados, opt = {}) {
    const a = mesas.atual; if (!a) throw new Error('Abra uma mesa primeiro.');
    // Quem aparece na linha: o personagem de quem a rolagem é (ficha, token) ou aquele com que a pessoa fala na mesa.
    const quem = opt.quem !== undefined ? opt.quem : aoVivo.como();
    if (quem && (quem.nome || quem.av)) {
      dados = Object.assign({}, dados);
      if (quem.nome) dados.como = String(quem.nome).slice(0, 80);
      if (aoVivo.imagemValida(quem.av)) dados.av = quem.av;
    }
    const linha = { mesa_id: a.id, id: opt.id || novoId(tipo === 'rolagem' ? 'r' : 'm'), tipo, origem: opt.origem || 'mesa', secreta: !!opt.secreta && a.papel === 'mestre', dados };
    // a linha é da campanha em vista (numa mesa sem campanhas, de nenhuma); numa campanha encerrada ninguém escreve
    if (mesas.encerrada(a.campanha)) throw new Error(ENCERRADA);
    if (a.campanha) linha.campanha = a.campanha;
    const { data, error } = await cliente().from('registro').insert(linha).select().single();
    if (error) {
      // a mesma rolagem publicada duas vezes (duelo que ganhou outra rodada, ou duas abas abertas): atualiza a que já existe
      if (error.code === '23505' && opt.unico) throw new Error(opt.unico);     // (essa linha só existe uma vez: a primeira vale)
      if (error.code === '23505' && opt.id) {
        const up = await cliente().from('registro').update({ dados }).eq('mesa_id', a.id).eq('id', opt.id).select().maybeSingle();
        if (up.data) aplicar(up.data, false, true);
        return up.data;
      }
      throw falha(error, 'Não deu para enviar agora. Tente de novo.');
    }
    aplicar(data, false, true);
    return data;
  }
  aoVivo.fala = texto => gravar('fala', { texto: String(texto).slice(0, 1500) });
  aoVivo.acao = texto => gravar('acao', { texto: String(texto).slice(0, 1500) });
  aoVivo.rolagem = (dados, opt = {}) => gravar('rolagem', dados, { origem: opt.origem, id: opt.id, quem: opt.quem, unico: opt.unico, secreta: opt.secreta == null ? aoVivo.segredo : opt.secreta });
  aoVivo.revelar = async id => {
    const a = mesas.atual; if (!a) return;
    const { data, error } = await cliente().from('registro').update({ secreta: false }).eq('mesa_id', a.id).eq('id', id).select().maybeSingle();
    if (error) throw falha(error);
    if (data) aplicar(data, false, true);
  };
  aoVivo.apagar = async id => {
    const a = mesas.atual; if (!a) return;
    const { data, error } = await cliente().from('registro').update({ apagado: true }).eq('mesa_id', a.id).eq('id', id).select().maybeSingle();
    if (error) throw falha(error);
    if (data) aplicar(data, false, true); else aplicar({ mesa_id: a.id, id, apagado: true, rev: 0 }, false, true);
  };
  aoVivo.desfazerApagar = async id => {
    const a = mesas.atual; if (!a) return;
    const { data } = await cliente().from('registro').update({ apagado: false }).eq('mesa_id', a.id).eq('id', id).select().maybeSingle();
    if (data) aplicar(data, false, true);
  };
  /* O mestre limpa o painel inteiro — conversa e rolagens —, para todos. As linhas ficam marcadas como apagadas (as
     antigas também, para não voltarem ao recarregar). Devolve { n, desfazer }: desfazer traz de volta exatamente as
     linhas desta limpeza (todas levam a mesma hora de mudança), e não as que alguém já tinha apagado antes. */
  aoVivo.limpar = async () => {
    const a = mesas.atual;
    if (!a || a.papel !== 'mestre') throw new Error('Só o mestre limpa a mesa ao vivo.');
    if (mesas.encerrada(a.campanha)) throw new Error(ENCERRADA);
    // (com campanhas, sai o que este painel mostra: a conversa da campanha em vista e a que é do mundo)
    /* (a campanha vai entre as colunas devolvidas: o filtro "desta campanha ou de nenhuma" é conferido também sobre o
        que a gravação devolve, e sem a coluna ali o banco recusa o pedido inteiro) */
    const { data, error, count } = await daVista(cliente().from('registro').update({ apagado: true }, { count: 'exact' }).eq('mesa_id', a.id).eq('apagado', false)).select('id,atualizado_em' + (vista() ? ',campanha' : ''));
    if (error) throw falha(error, 'Não deu para limpar agora. Tente de novo.');
    const quando = data && data[0] ? data[0].atualizado_em : null, n = count == null ? (data || []).length : count;
    if (mesaId === a.id) { aoVivo.itens = []; aoVivo.emit('reinicio'); }
    return {
      n,
      desfazer: async () => {
        if (!quando) return 0;
        const r = await cliente().from('registro').update({ apagado: false }, { count: 'exact' }).eq('mesa_id', a.id).eq('apagado', true).eq('atualizado_em', quando);      // (todas as linhas de uma limpeza levam a mesma hora)
        if (r.error) throw falha(r.error, 'Não deu para desfazer agora.');
        if (mesaId === a.id) { await carregarItens(a.id); if (mesaId === a.id) aoVivo.emit('reinicio'); }
        return r.count || 0;
      },
    };
  };
  // quantas linhas à vista a conversa sem campanha tem (é o que a primeira campanha da mesa recebe)
  aoVivo.contarDoMundo = async () => {
    const a = mesas.atual; if (!a) return 0;
    let q = cliente().from('registro').select('id', { count: 'exact', head: true }).eq('mesa_id', a.id).eq('apagado', false);
    if (a.campanhasLigadas) q = q.is('campanha', null);
    const { count, error } = await q;
    if (error) throw falha(error);
    return count || 0;
  };
  aoVivo.definirSegredo = v => {
    aoVivo.segredo = !!v && !!mesas.atual && mesas.atual.papel === 'mestre';
    if (mesas.atual) guarda.gravar('tinycats:segredo:' + mesas.atual.id, aoVivo.segredo ? '1' : null);
    aoVivo.emit('segredo', aoVivo.segredo);
  };

  /* Todas as rolagens da mesa, da mais antiga para a mais nova, para o auditor do mestre: de cada linha, só o que o
     auditor usa. Entram também as que foram limpas do painel (foram roladas do mesmo jeito). */
  aoVivo.historico = async (opt = {}) => {
    const a = mesas.atual;
    if (!a) throw new Error('Abra uma mesa primeiro.');
    if (!mesas.mestra('rolador')) throw new Error('Só o mestre abre o auditor dos dados.');
    const out = [], LIMITE_LINHAS = opt.limite || 20000, PAGINA = 1000;
    for (let de = 0; de < LIMITE_LINHAS; de += PAGINA) {
      const { data, error } = await cliente().from('registro')
        .select('id,autor_id,autor_nome,origem,secreta,apagado,criado_em,k:dados->>k,titulo:dados->>titulo,total:dados->total,resumo:dados->>resumo,dd:dados->dd')
        .eq('mesa_id', a.id).eq('tipo', 'rolagem').order('criado_em').order('id').range(de, de + PAGINA - 1);
      if (error) throw falha(error, 'Não deu para ler as rolagens da mesa agora.');
      for (const l of data || []) out.push(l);
      if (!data || data.length < PAGINA) break;
    }
    return out;
  };

  /* Monta o que a mesa mostra de uma rolagem: total em destaque, uma linha de como saiu e o veredito, se houver. */
  const D = () => TC.dice;
  const semTotal = s => String(s || '').replace(/^[-−]?\d+ · /, '');
  /* Cada rolagem guarda também os dados que sorteou, um a um — dd: [[lados, valor], …] —, para o auditor do mestre
     conferir quantas vezes saiu cada face. Aqui só se confere a forma (pares de inteiros, no máximo 60): se um valor
     não cabe no dado (um defeito de quem sorteou), é o auditor que tem de ver isso — não é para sumir aqui. */
  function limparDd(dd) {
    const out = [];
    if (!Array.isArray(dd)) return out;
    for (const p of dd) {
      if (out.length >= 60) break;
      if (Array.isArray(p) && p.length === 2 && Number.isSafeInteger(p[0]) && Number.isSafeInteger(p[1]) && p[0] >= 1 && p[0] <= 1000000 && p[1] >= 0 && p[1] <= 1000000) out.push([p[0], p[1]]);
    }
    return out;
  }
  const comDd = (dados, dd) => { const l = limparDd(dd); if (l.length) dados.dd = l; return dados; };
  function deResultado(k, titulo, x, check) {
    const v = check ? D().verdict(x.total, check) : null;
    return comDd({ k, titulo: titulo || '', total: x.total, resumo: semTotal(D().summary(x)), veredito: v ? v.text : null, passou: v ? v.passed : null }, D().diceOf(x));
  }
  /* As rolagens da telinha de dados da mesa ao vivo (sem digitar comando). `pc`: o personagem de quem é a rolagem
     ({ id, nome, av }), que aparece ao lado de quem rolou.
       rolarAtributo  um atributo com a regra da fixa → { ok, total, die, dieValue, fixa } | { ok:false, error }
       rolarIniciativa  1d20 + o bônus de iniciativa da ficha. A linha leva um recado para as Cenas do mestre
                      (sis: { t:'ini', c, v, d, b }): lá, o mestre pode anotar o valor na ordem de turnos. */
  aoVivo.rolarAtributo = async (pc, rotulo, valor, fixa) => {
    const v = Math.max(0, Math.round(Number(valor) || 0));
    const r = D().rollFixa(v, Math.min(Math.max(0, Math.round(Number(fixa) || 0)), v));
    if (!r.ok) return r;
    const d = deResultado('fixa', ((pc && pc.nome ? pc.nome + ' · ' : '') + String(rotulo || '')).slice(0, 120), { mode: 'fixa', atributo: r.atributo, fixa: r.fixa, dieValue: r.dieValue, total: r.total });
    await aoVivo.rolagem(d, { quem: pc || null });
    return r;
  };
  aoVivo.rolarIniciativa = async (pc, bonus) => {
    const b = Math.max(-99, Math.min(99, Math.round(Number(bonus) || 0))), dado = D().randInt(20), total = dado + b;
    const d = comDd({ k: 'iniciativa', titulo: ('Iniciativa · ' + ((pc && pc.nome) || '?')).slice(0, 120), total, resumo: '1d20 (' + dado + ')' + (b ? (b > 0 ? ' + ' : ' − ') + Math.abs(b) : ''), veredito: null, passou: null }, [[20, dado]]);
    if (pc && pc.id) d.sis = { t: 'ini', c: String(pc.id).slice(0, 64), v: total, d: dado, b };
    await aoVivo.rolagem(d, { quem: pc || null });
    return { ok: true, total, d: dado, bonus: b };
  };

  /* ---- o pedido de defesa (o "ataque com defesa" das Cenas) ----
     O mestre pede, pela janela do ataque, que os jogadores rolem a defesa dos personagens deles. O pedido é uma linha
     da mesa ao vivo (dados.k = 'pedido', dados.pd = { rot: nome do ataque, defs: chaves das defesas que se somam,
     alvos: [{ c: id do personagem, n: nome }], fim? }). Cada jogador responde pelo cartão do pedido: a casca dele
     soma as defesas da própria ficha, rola com a regra da fixa e escreve uma rolagem comum com o recado
     sis = { t: 'rd', p: id da linha do pedido, c, v: total, a: defesa, f: fixa, d: dado }. O valor da defesa não
     viaja no pedido: cada um calcula o seu. Quando o mestre aplica ou cancela, o pedido ganha pd.fim; sem isso, ele
     expira sozinho em 10 minutos. Quem confere a resposta (de quem é, se cabe na defesa) é a janela do mestre. */
  const PEDIDO_MS = 10 * 60 * 1000;
  const chavesDeDefesa = () => { const R = TC.rules; return R && R.DEFESAS && R.CHAVES_ESP ? R.DEFESAS.map(x => x.k).concat(R.CHAVES_ESP) : []; };
  // "Física + Fogo", na ordem da ficha
  aoVivo.nomeDasDefesas = chaves => {
    const R = TC.rules, quer = new Set(Array.isArray(chaves) ? chaves : []);
    if (!R || !R.DEFESAS || !R.DEFESAS_ESP) return '';
    return R.DEFESAS.filter(x => quer.has(x.k)).map(x => String(x.nome).replace(/^Defesa\s+/i, '')).concat(R.DEFESAS_ESP.filter(x => quer.has(x.k)).map(x => x.nome)).join(' + ');
  };
  const curto = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
  aoVivo.pedirDefesa = async d => {
    const a = mesas.atual;
    if (!a) throw new Error('Abra uma mesa primeiro.');
    if (a.papel !== 'mestre') throw new Error('Só o mestre pede a defesa.');
    const validas = chavesDeDefesa(), defs = [], alvos = [];
    for (const k of (d && Array.isArray(d.defs) ? d.defs : [])) if (typeof k === 'string' && validas.includes(k) && !defs.includes(k)) defs.push(k);
    for (const x of (d && Array.isArray(d.alvos) ? d.alvos : [])) {
      if (alvos.length >= 40 || !x || typeof x.c !== 'string' || !x.c || x.c.length > 64 || alvos.some(y => y.c === x.c)) continue;
      alvos.push({ c: x.c, n: curto(x.n, 60) || '?' });
    }
    if (!defs.length || !alvos.length) throw new Error('O pedido veio vazio: escolha a defesa e quem defende.');
    const rot = curto(d.rot, 40), nome = aoVivo.nomeDasDefesas(defs);
    // (o título e o resumo servem a quem ainda não recarregou o site: lá o pedido aparece como um aviso comum)
    const dados = { k: 'pedido', titulo: 'Rolem a defesa' + (rot ? ' · ' + rot : ''), total: null, resumo: ('Defesa ' + nome + '. Para: ' + alvos.map(x => x.n).join(', ') + '.').slice(0, 600), veredito: null, passou: null, pd: { rot, defs, alvos } };
    return gravar('rolagem', dados, { origem: 'cena', quem: null, secreta: false });
  };
  // 'aberto' | 'aplicado' | 'cancelado' | 'expirado' (ou null, se a linha não é um pedido)
  aoVivo.estadoDoPedido = l => {
    const pd = l && l.dados && l.dados.k === 'pedido' ? l.dados.pd : null;
    if (!pd || typeof pd !== 'object' || !Array.isArray(pd.alvos) || !Array.isArray(pd.defs)) return null;
    if (pd.fim === 'aplicado' || pd.fim === 'cancelado') return pd.fim;
    const t = Date.parse(l.criado_em || '');
    return isFinite(t) && Date.now() + folga - t > PEDIDO_MS ? 'expirado' : 'aberto';
  };
  /* As respostas que já chegaram a um pedido: { idDoPersonagem: linha } — de cada personagem, a primeira rolagem
     escrita pelo dono dele ou pelo mestre. */
  aoVivo.respostasDoPedido = l => {
    const out = {}, a = mesas.atual;
    if (!a || !l) return out;
    const mestres = new Set((a.membros || []).filter(m => m.papel === 'mestre').map(m => m.usuario_id));
    const donos = new Map(linhasPcs().map(p => [p.id, p.dono_id]));
    for (const x of aoVivo.itens) {
      const s = x.dados && x.dados.sis;
      if (!s || s.t !== 'rd' || s.p !== l.id || typeof s.c !== 'string' || out[s.c] || x.secreta) continue;
      if (!(mestres.has(x.autor_id) || (donos.get(s.c) && donos.get(s.c) === x.autor_id))) continue;
      out[s.c] = x;
    }
    return out;
  };
  // um identificador curto e estável para "a resposta deste autor, por este personagem, a este pedido"
  function resumoCurto(texto) {
    let a = 0xdeadbeef, b = 0x41c6ce57;
    for (let i = 0; i < texto.length; i++) { const c = texto.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); }
    a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
    b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
    return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36);
  }
  /* O jogador (ou o mestre, por um personagem) rola a defesa pedida. `valor` é a soma das defesas do personagem,
     calculada por quem chama a partir da ficha; `fixa`, quanto fixar. Devolve { ok, total, die, dieValue, fixa }. */
  aoVivo.responderDefesa = async (l, charId, valor, fixa) => {
    const a = mesas.atual;
    if (!a || !conta.usuario) throw new Error('Abra uma mesa primeiro.');
    const est = aoVivo.estadoDoPedido(l);
    if (est !== 'aberto') throw new Error(est === 'expirado' ? 'Este pedido já expirou.' : 'Este pedido já foi encerrado.');
    const pd = l.dados.pd, alvo = pd.alvos.find(x => x && x.c === charId), pc = linhasPcs().find(x => x.id === charId);
    if (!alvo || !pc) throw new Error('Esse personagem não está neste pedido.');
    if (!(a.papel === 'mestre' || pc.dono_id === conta.usuario.id)) throw new Error('Esse personagem não é seu.');
    const v = Math.max(0, Math.round(Number(valor) || 0)), f = Math.min(Math.max(0, Math.round(Number(fixa) || 0)), v);
    let r = { ok: true, atributo: v, fixa: f, die: 0, dieValue: 0, total: 0 };
    if (v >= 1) { r = D().rollFixa(v, f); if (!r.ok) throw new Error(r.error); }
    const nome = aoVivo.nomeDasDefesas(pd.defs), titulo = ((pc.nome || alvo.n || '?') + ' · Defesa' + (nome ? ' (' + nome + ')' : '')).slice(0, 120);
    const dados = v >= 1 ? deResultado('fixa', titulo, { mode: 'fixa', atributo: r.atributo, fixa: r.fixa, dieValue: r.dieValue, total: r.total })
      : { k: 'fixa', titulo, total: 0, resumo: 'A defesa está em 0: nada a rolar', veredito: null, passou: null };
    dados.sis = { t: 'rd', p: l.id, c: charId, v: r.total, a: r.atributo, f: r.fixa, d: r.dieValue };
    await aoVivo.rolagem(dados, { quem: resumoPc(pc), secreta: false, id: 'rd' + resumoCurto(l.id + '|' + charId + '|' + conta.usuario.id), unico: 'Essa defesa já foi rolada.' });
    return r;
  };
  // O mestre encerra o pedido: 'aplicado' (o ataque foi aplicado) ou 'cancelado'.
  aoVivo.encerrarPedido = async (id, fim) => {
    const a = mesas.atual;
    if (!a || a.papel !== 'mestre' || typeof id !== 'string' || !id) return null;
    let l = aoVivo.itens.find(x => x.id === id);
    if (!l) { const r = await cliente().from('registro').select('*').eq('mesa_id', a.id).eq('id', id).maybeSingle(); l = r.data || null; }
    if (!l || aoVivo.estadoDoPedido(l) == null || l.dados.pd.fim) return null;
    const dados = Object.assign({}, l.dados, { pd: Object.assign({}, l.dados.pd, { fim: fim === 'aplicado' ? 'aplicado' : 'cancelado' }) });
    const { data, error } = await cliente().from('registro').update({ dados }).eq('mesa_id', a.id).eq('id', id).select().maybeSingle();
    if (error) throw falha(error, 'Não deu para encerrar o pedido agora.');
    if (data) aplicar(data, false, true);
    return data;
  };

  /* Uma linha digitada no chat: fala, ação ou comando (/r, /fixa, /me, /ajuda). Devolve { ok } | { erro } | { ajuda }. */
  aoVivo.comando = async texto => {
    const c = D().command(texto);
    if (c.type === 'chat') { if (!c.text) return { ok: true }; await aoVivo.fala(c.text); return { ok: true }; }
    if (c.type === 'me') { await aoVivo.acao(c.text); return { ok: true }; }
    if (c.type === 'ajuda') return { ajuda: D().HELP };
    if (c.type === 'erro') return { erro: c.message };
    if (c.type === 'dados') {
      const r = D().rollExpr(c.expr);
      if (!r.ok) return { erro: r.error };
      await aoVivo.rolagem(deResultado('dados', '', { mode: 'dados', expr: r.expr, terms: r.terms, total: r.total }, c.check));
      return { ok: true };
    }
    if (c.type === 'fixa') {
      const r = D().rollFixa(c.atributo, c.fixa);
      if (!r.ok) return { erro: r.error };
      await aoVivo.rolagem(deResultado('fixa', '', { mode: 'fixa', atributo: r.atributo, fixa: r.fixa, dieValue: r.dieValue, total: r.total }, c.check));
      return { ok: true };
    }
    return { erro: 'Não entendi. Escreva /ajuda para ver os comandos.' };
  };
  /* Uma rolagem que veio de um dos sistemas (pela ponte). Cada um manda do seu jeito; aqui vira a linha da mesa. */
  aoVivo.deSistema = async (origem, d) => {
    if (!mesas.atual || !d || typeof d !== 'object') return null;
    let dados = null, opt = { origem };
    if (origem === 'rolador' && d.type === 'roll') {
      const v = d.check && d.total != null ? D().verdict(d.total, d.check) : null;
      dados = { k: d.mode, titulo: String(d.title || '').slice(0, 120), total: d.total == null ? null : d.total, resumo: semTotal(D().summary(d)).slice(0, 600), veredito: v ? v.text : null, passou: v ? v.passed : null, cor: d.color || null };
      comDd(dados, D().diceOf(d));
      opt.id = String(d.id || '').slice(0, 60) || undefined;
      opt.quem = null;                       // o Rolador é a mesa de dados do mestre: sai sem personagem
    } else if (origem === 'ficha') {
      opt.quem = d.pc ? aoVivo.personagem(d.pc) : null;      // a ficha de onde a rolagem saiu
      // (uma disputa diz quem venceu: o veredito vem pronto da ficha; passou = venceu quem rolou, null = empate)
      const vd = typeof d.veredito === 'string' && d.veredito.trim() ? d.veredito.trim().slice(0, 160) : null;
      dados = { k: 'ficha', titulo: String(d.quem || '').slice(0, 120), total: typeof d.total === 'number' ? d.total : null, resumo: String(d.det || '').slice(0, 600), veredito: vd, passou: vd && typeof d.passou === 'boolean' ? d.passou : null };
      comDd(dados, d.dd);                    // os dados que a ficha sorteou, um a um
      opt.id = d.id ? 'f_' + String(d.id).slice(0, 50) : undefined;
    } else if (origem === 'cena' && d.kind === 'iniciativa') {
      const b = Number(d.bonus) || 0;
      dados = { k: 'iniciativa', titulo: 'Iniciativa · ' + String(d.name || '?').slice(0, 80), total: d.total, resumo: '1d20 (' + d.d + ')' + (b ? (b > 0 ? ' + ' : ' − ') + Math.abs(b) : ''), veredito: null, passou: null };
      comDd(dados, [[20, d.d]]);
      if (d.oculto) opt.secreta = true;      // token que os jogadores não veem: a iniciativa dele fica só com o mestre
      opt.quem = d.char ? aoVivo.personagem(d.char) : null;
    } else if (origem === 'cena' && d.kind === 'atributo') {
      opt.quem = d.char ? aoVivo.personagem(d.char) : null;
      dados = { k: 'fixa', titulo: (String(d.name || '?') + ' · ' + String(d.attrNome || d.attr || '')).slice(0, 120), total: d.total, resumo: semTotal(D().summary({ mode: 'fixa', atributo: d.atributo, fixa: d.fixa, dieValue: d.d, total: d.total })), veredito: null, passou: null };
      comDd(dados, D().diceOf({ mode: 'fixa', atributo: d.atributo, fixa: d.fixa, dieValue: d.d }));
      if (d.oculto) opt.secreta = true;
    } else if (origem === 'cena' && d.kind === 'disputa') {
      // disputa entre dois tokens: o título, o resumo e o veredito vêm prontos (passou = venceu o primeiro lado; null = empate)
      const vd = typeof d.veredito === 'string' && d.veredito.trim() ? d.veredito.trim().slice(0, 160) : null;
      dados = { k: 'ficha', titulo: String(d.titulo || 'Disputa').slice(0, 120), total: null, resumo: String(d.resumo || '').slice(0, 600), veredito: vd, passou: vd && typeof d.passou === 'boolean' ? d.passou : null };
      comDd(dados, d.dd);
      opt.quem = null;
      if (d.oculto) opt.secreta = true;      // um dos dois lados é um token que os jogadores não veem
    } else if (origem === 'cena' && d.kind === 'defesa') {
      // a defesa que o mestre rolou por um token, num ataque com defesa
      opt.quem = d.char ? aoVivo.personagem(d.char) : null;
      dados = { k: 'fixa', titulo: (String(d.name || '?') + ' · Defesa' + (d.defNome ? ' (' + String(d.defNome) + ')' : '')).slice(0, 120), total: d.total, resumo: semTotal(D().summary({ mode: 'fixa', atributo: d.atributo, fixa: d.fixa, dieValue: d.d, total: d.total })), veredito: null, passou: null };
      comDd(dados, D().diceOf({ mode: 'fixa', atributo: d.atributo, fixa: d.fixa, dieValue: d.d }));
      if (d.oculto) opt.secreta = true;
      // rolada no lugar de um jogador, com o pedido em aberto: vale como a resposta dele (e todos veem, como veriam a dele)
      else if (typeof d.pedido === 'string' && d.pedido && typeof d.alvo === 'string' && d.alvo) {
        dados.sis = { t: 'rd', p: d.pedido.slice(0, 64), c: d.alvo.slice(0, 64), v: d.total, a: d.atributo, f: d.fixa, d: d.d };
        opt.secreta = false;
      }
    } else if (origem === 'cena' && d.kind === 'uso') {
      // um item da bolsa usado pelo token (poção, bomba…): o título e o resumo vêm prontos da cena
      opt.quem = d.char ? aoVivo.personagem(d.char) : null;
      dados = { k: 'ficha', titulo: String(d.titulo || 'Bolsa').slice(0, 120), total: typeof d.total === 'number' ? d.total : null, resumo: String(d.resumo || '').slice(0, 600), veredito: null, passou: null };
      comDd(dados, d.dd);                    // (uma poção que rola dados)
      if (d.oculto) opt.secreta = true;
    }
    if (!dados) return null;
    return aoVivo.rolagem(dados, opt);
  };

  /* ---------------- dados compartilhados da mesa ---------------- */
  /* Personagens e documentos da mesa aberta. A casca guarda uma cópia na memória, entrega aos sistemas (pela ponte)
     e manda para o banco só os campos que mudaram. O que ainda não subiu continua valendo aqui até subir;
     se a rede cair, tenta de novo sozinho. Cada linha: { id, ...campos, rev }. */
  const TABELAS = {
    personagens: ['nome', 'dono_id', 'vis', 'ordem', 'ficha', 'skills', 'estado', 'campanha'],
    documentos: ['dono_id', 'vis', 'dados', 'campanhas'],
  };
  /* A campanha de um personagem (uma, ou nenhuma: do mundo) e as de um documento (uma lista; vazia: do mundo). Num banco
     de antes das campanhas essas colunas não existem — a linha que chega sem elas não "chegou incompleta". */
  const OPCIONAIS = ['campanha', 'campanhas'];
  /* Campanha encerrada: as fichas dela e os documentos "dela" (nome@campanha: o acampamento, as missões do grupo) são só
     para consulta — o banco recusa, do mestre também. Aqui a gravação nem sai: quem pediu recebe um aviso e a linha de
     volta, como está, para a tela dele voltar atrás. */
  function trancada(nome, id, l, campos) {
    if (nome === 'personagens') return mesas.encerrada(l ? l.campanha : null) || (campos.campanha != null && mesas.encerrada(campos.campanha));
    const i = String(id).indexOf('@');
    return i > 0 && mesas.encerrada(String(id).slice(i + 1));
  }
  const dados = emissor({ pendentes: 0, erro: null });
  let cols = {};

  /* ---- o estado atual e as skills de um personagem viajam como diferença ----
     O estado (pontos das barras, sobrevida, bolsas, bônus temporários, moedas…) é mexido por mais de uma pessoa ao
     mesmo tempo: o mestre pelo token, o jogador pela ficha. As skills também: o mestre dá pontos enquanto o jogador
     gasta os dele na árvore. Por isso essas duas colunas não sobem inteiras ("o meu por cima do seu"): sobe só o
     que mudou, e o banco junta. O formato é o "JSON Merge Patch" (RFC 7396): objeto se junta chave por chave, null
     apaga a chave, qualquer outro valor (número, texto, lista) troca o que havia. */
  const JUNTAM = ['estado', 'skills'];                 // as colunas de `personagens` que viajam assim
  const RPC_JUNTAR = 'personagem_juntar';              // (p_mesa, p_id, p_coluna, p_mudas) → { rev, rev_ant }
  const ehMapa = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const proprio = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const chavesDe = o => Object.keys(o).filter(k => k !== '__proto__');
  const copiar = x => (x && typeof x === 'object' ? JSON.parse(JSON.stringify(x)) : x);
  function igual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a == b;           // (sem valor é sem valor: null e "não veio" são a mesma coisa)
    if (typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => igual(x, b[i]));
    const ka = Object.keys(a).filter(k => a[k] !== undefined), kb = Object.keys(b).filter(k => b[k] !== undefined);
    return ka.length === kb.length && ka.every(k => proprio(b, k) && igual(a[k], b[k]));
  }
  /* O que muda de `base` para `novo` → a mudança, ou null se nada muda. (Sem valor — null ou ausente — é a mesma coisa.) */
  function diferenca(base, novo) {
    const b = ehMapa(base) ? base : {}, n = ehMapa(novo) ? novo : {}, out = {};
    let tem = false;
    for (const k of chavesDe(n)) {
      const vn = n[k], vb = proprio(b, k) ? b[k] : undefined;
      if (vn == null) continue;
      if (ehMapa(vn) && ehMapa(vb)) { const d = diferenca(vb, vn); if (d) { out[k] = d; tem = true; } }
      else if (!igual(vn, vb)) { out[k] = copiar(vn); tem = true; }
    }
    for (const k of chavesDe(b)) if (b[k] != null && (!proprio(n, k) || n[k] == null)) { out[k] = null; tem = true; }
    return tem ? out : null;
  }
  /* `alvo` com a mudança aplicada (um objeto novo; o que recebeu não é alterado). */
  function juntar(alvo, muda) {
    if (!ehMapa(muda)) return muda;
    const out = {};
    if (ehMapa(alvo)) for (const k of chavesDe(alvo)) out[k] = alvo[k];
    for (const k of chavesDe(muda)) {
      if (muda[k] == null) delete out[k];
      else out[k] = juntar(out[k], muda[k]);
    }
    return out;
  }
  /* Duas mudanças seguidas numa só — quando dá. Não dá quando a segunda põe um objeto onde a primeira tinha apagado
     ou posto um valor simples (juntas, deixariam de apagar o que a primeira apagou): aí vão as duas, em ordem. */
  function compor(a, b) {
    const out = {};
    for (const k of chavesDe(a)) out[k] = a[k];
    for (const k of chavesDe(b)) {
      const va = proprio(a, k) ? a[k] : undefined, vb = b[k];
      if (ehMapa(vb) && va !== undefined && !ehMapa(va)) return null;
      if (ehMapa(vb) && ehMapa(va)) { const j = compor(va, vb); if (!j) return null; out[k] = j; }
      else out[k] = vb;
    }
    return out;
  }
  /* Junta em três vias o que duas pessoas fizeram ao mesmo documento, a partir de onde as duas partiram (`base`):
       · o que só uma delas mudou fica como ela deixou;
       · objetos se juntam chave por chave;
       · listas de objetos com `id` (os tokens, os desenhos, as paredes de uma cena…) se juntam objeto por objeto, e
         listas de nomes sem repetição (a ordem das cenas, as condições de um token), nome por nome; a ordem é a de
         quem mexeu na ordem — se as duas mexeram, a daqui —, e o que a outra incluiu entra logo depois do vizinho
         que tinha lá;
       · no resto (número, texto, lista de números ou de pontos), se as duas mexeram, vale o daqui (`meu`).
     "Sem valor" (a chave que saiu, o objeto que foi apagado) é um valor como os outros: quem apagou, apagou. */
  // Uma lista que dá para juntar item por item: de objetos com `id` ('ids') ou de nomes ('nomes'), sem repetição.
  const tipoDaLista = l => (!Array.isArray(l) ? null : !l.length ? 'vazia'
    : l.every(x => typeof x === 'string' && x !== '') ? (new Set(l).size === l.length ? 'nomes' : null)
    : l.every(x => ehMapa(x) && (typeof x.id === 'string' || typeof x.id === 'number') && x.id !== '') ? (new Set(l.map(x => x.id)).size === l.length ? 'ids' : null) : null);
  const chaveDoItem = x => (typeof x === 'string' ? x : x.id);
  function juntar3(base, meu, deles, fundo = 0) {
    if (igual(meu, deles)) return meu;
    if (igual(meu, base)) return deles;
    if (igual(deles, base)) return meu;
    if (fundo < 16 && ehMapa(meu) && ehMapa(deles)) {
      const b = ehMapa(base) ? base : {}, out = {};
      for (const k of new Set([...chavesDe(deles), ...chavesDe(meu)])) {
        const v = juntar3(proprio(b, k) ? b[k] : undefined, proprio(meu, k) ? meu[k] : undefined, proprio(deles, k) ? deles[k] : undefined, fundo + 1);
        if (v !== undefined) out[k] = v;
      }
      return out;
    }
    const tm = tipoDaLista(meu), td = tipoDaLista(deles), tb = base == null ? 'vazia' : tipoDaLista(base);
    const tipo = tm && td && tb ? [tm, td, tb].find(x => x !== 'vazia') || null : null;
    if (fundo < 16 && tipo && [tm, td, tb].every(x => x === 'vazia' || x === tipo)) {
      const mapa = l => new Map((l || []).map(x => [chaveDoItem(x), x])), B = mapa(base), M = mapa(meu), T = mapa(deles), fica = new Map();
      for (const k of new Set([...T.keys(), ...M.keys()])) {
        const v = juntar3(B.get(k), M.get(k), T.get(k), fundo + 1);
        if (v != null) fica.set(k, v);
      }
      // a ordem dos que as três versões têm: mexi nela? então vale a daqui; senão, a de lá
      const comuns = l => (l || []).map(chaveDoItem).filter(k => B.has(k) && M.has(k) && T.has(k)).join('\n');
      const guia = comuns(meu) !== comuns(base) || comuns(deles) === comuns(base) ? meu : deles, outra = guia === meu ? deles : meu;
      const ordem = guia.map(chaveDoItem).filter(k => fica.has(k)), tem = new Set(ordem);
      outra.forEach((x, i) => {
        const k = chaveDoItem(x);
        if (!fica.has(k) || tem.has(k)) return;
        let pos = 0;                                          // logo depois do vizinho de antes que ele tinha na outra lista
        for (let n = i - 1; n >= 0; n--) { const q = ordem.indexOf(chaveDoItem(outra[n])); if (q >= 0) { pos = q + 1; break; } }
        ordem.splice(pos, 0, k); tem.add(k);
      });
      return ordem.map(k => fica.get(k));
    }
    return meu;
  }
  const remendo = { diferenca, aplicar: juntar, compor, igual, juntar3, colunas: JUNTAM.slice() };
  /* As filas (c.rems: o que ainda vai subir; c.remsVoo: o que está subindo agora) são por linha e por coluna. */
  const kq = (col, id) => col + '\n' + id;
  const temFila = (c, col, id) => c.rems.has(kq(col, id)) || c.remsVoo.has(kq(col, id));
  const largarFilas = (c, id) => { for (const col of JUNTAM) c.rems.delete(kq(col, id)); };
  // a mudança entra na fila da linha (junta-se à última, quando dá)
  function empilhar(c, id, col, muda) {
    const k = kq(col, id), fila = c.rems.get(k) || [];
    const junto = fila.length ? compor(fila[fila.length - 1], muda) : null;
    if (junto) fila[fila.length - 1] = junto; else fila.push(muda);
    c.rems.set(k, fila);
  }
  // a coluna como veio do banco, com as mudanças daqui que ainda não subiram (as que estão a caminho e as da fila)
  function refazer(c, id, col, doBanco) {
    let e = ehMapa(doBanco) ? doBanco : {};
    for (const m of c.remsVoo.get(kq(col, id)) || []) e = juntar(e, m);
    for (const m of c.rems.get(kq(col, id)) || []) e = juntar(e, m);
    return e;
  }
  /* Os documentos da mesa são escritos pelo mestre e não têm dono. O único documento com dono que vale é o pedido
     do próprio dono para a cena que está no ar (é a única coisa que o banco deixa um jogador criar). Qualquer outro
     documento com dono não é entregue a nenhum sistema. */
  const aceita = (nome, r) => nome !== 'documentos' || r.dono_id == null || r.id === 'cena:pedido:' + r.dono_id;
  function dadosZerar() {
    for (const k in cols) {
      const c = cols[k];
      /* O que ainda não tinha subido sobe agora (a mesa está fechando; o envio segue o caminho dele mesmo assim).
         A linha que já tinha um envio a caminho manda o que mudou depois quando esse envio voltar (uma última volta). */
      c.fechando = true;                                    // (daqui em diante nada é gravado "conferindo a versão": ver enviarComVersao)
      for (const id of [...c.sujos.keys()]) enviarLinha(c, id);
      c.morta = true; for (const t of c.tempo.values()) clearTimeout(t);
    }
    cols = {};
    if (dados.pendentes) { dados.pendentes = 0; dados.emit('pendentes', 0); }
  }
  function contarPendentes() {
    let n = 0;
    for (const k in cols) n += cols[k].sujos.size + cols[k].emVoo.size;
    if (n !== dados.pendentes) { dados.pendentes = n; dados.emit('pendentes', n); }
  }
  /* Uma linha apagada sai do espelho, e com ela vai a revisão que servia para recusar o que chegasse mais velho. Por
     isso fica anotada a revisão em que ela foi apagada: dali em diante a linha só volta por uma revisão MAIOR que
     essa (alguém a recriou). Uma leitura que saiu do banco antes de a linha ser apagada e chegou depois — a periódica
     que demorou, ou a de uma linha sozinha — não a traz de volta. */
  function enterrar(c, id, rev) { if (rev > (c.apagadas.get(id) || 0)) c.apagadas.set(id, rev); }
  function abrirCol(nome) {
    if (!TABELAS[nome]) throw new Error('Coleção desconhecida: ' + nome);
    if (!mesas.atual) throw new Error('Abra uma mesa primeiro.');
    if (cols[nome]) return cols[nome];
    // (rems / remsVoo: as mudanças do estado e das skills de cada personagem que ainda vão subir / que estão subindo agora)
    // (reler: as linhas a ler de novo, inteiras, porque outra pessoa mexeu nelas junto com uma gravação daqui)
    // (apagadas: a revisão em que cada linha foi apagada — ver enterrar)
    const c = cols[nome] = { nome, mesa: mesas.atual.id, doMestre: mesas.atual.papel === 'mestre', linhas: new Map(), maxRev: 0, sujos: new Map(), emVoo: new Map(), rems: new Map(), remsVoo: new Map(), reler: new Set(), relendo: new Set(), apagadas: new Map(), naSaida: new Set(), cas: new Set(), bases: new Map(), tempo: new Map(), falhas: 0, morta: false, buscando: false };
    c.pronta = (async () => {
      for (let de = 0; ; de += 1000) {
        const { data, error } = await cliente().from(nome).select('*').eq('mesa_id', c.mesa).order('rev').range(de, de + 999);
        if (error) throw falha(error, 'Não deu para ler os dados da mesa.');
        for (const l of data) { if (l.rev > c.maxRev) c.maxRev = l.rev; if (l.apagado) enterrar(c, l.id, l.rev); else if (aceita(nome, l) && !c.linhas.has(l.id)) c.linhas.set(l.id, l); }
        if (data.length < 1000) break;
      }
      return true;
    })();
    c.pronta.catch(() => { if (cols[nome] === c) delete cols[nome]; });   // falhou: a próxima abertura tenta de novo
    return c;
  }
  /* O aviso em tempo real de uma mudança nem sempre traz a linha inteira: as colunas grandes que NÃO mudaram ficam
     de fora (numa ficha, quem muda só os pontos atuais faz o aviso chegar sem a ficha e sem a árvore), e uma linha
     de mais de 1 MB chega só com as colunas pequenas. Uma linha assim não é aplicada como veio — a ficha apareceria
     em branco na tela, e o que fosse gravado em seguida iria por cima da de verdade: ela é lida inteira do banco.
     (Vale o mesmo, por segurança, se uma coluna que aqui tem conteúdo chegar vazia.) */
  function doTempoReal(nome, p) {
    const r = p && p.new;
    if (!r || !r.id) return;
    const c = cols[nome], l = c ? c.linhas.get(r.id) : null;
    const falta = k => !OPCIONAIS.includes(k) && (r[k] === undefined || (r[k] === null && !!l && l[k] != null));
    if ((p.errors && p.errors.length) || TABELAS[nome].some(falta)) { buscarLinha(nome, r.id); return; }
    dadosRemoto(nome, r);
  }
  async function buscarLinha(nome, id) {
    const c = cols[nome];
    if (!c || c.morta) return;
    try {
      const { data, error } = await cliente().from(nome).select('*').eq('mesa_id', c.mesa).eq('id', id).maybeSingle();
      if (!error && data && !c.morta) dadosRemoto(nome, data, 'avulsa');
    } catch (e) { /* sem rede: a leitura periódica traz depois */ }
  }
  /* Uma linha que veio do banco (tempo real ou leitura periódica). `modo`:
       'avulsa'  a linha foi lida sozinha (não numa leitura em ordem de revisão);
       'relida'  idem, e de propósito: vale mesmo estando na revisão que já está aqui (ver relerLinha).
     Uma linha lida sozinha não diz nada sobre as outras: ela não empurra a marca de "até onde já li" (maxRev). Se
     empurrasse, a leitura periódica pularia o que outras linhas ganharam antes dela e este aparelho ainda não leu. */
  function dadosRemoto(nome, r, modo) {
    const c = cols[nome];
    if (!c || c.morta || r.mesa_id !== c.mesa) return;
    if (!modo && r.rev > c.maxRev) c.maxRev = r.rev;
    if (!aceita(nome, r)) return;
    const l = c.linhas.get(r.id), meus = new Set([...(c.sujos.get(r.id) || []), ...(c.emVoo.get(r.id) || [])]);
    if (l && (modo === 'relida' ? l.rev > r.rev : l.rev >= r.rev)) return;
    if (r.apagado) {
      enterrar(c, r.id, r.rev);
      if (meus.has('*')) return;                 // acabei de recriar aqui: a minha versão sobe
      if (l) { c.linhas.delete(r.id); dados.emit('muda', nome, { id: r.id, apagado: true }, 'remota', null); }
      return;
    }
    if (meus.has('apagado')) return;             // apaguei aqui e ainda não subiu
    const foiApagada = c.apagadas.get(r.id);
    if (foiApagada != null) { if (r.rev <= foiApagada) return; c.apagadas.delete(r.id); }      // mais velha que o apagar: não volta
    const n = Object.assign({}, r);
    if (l) for (const k of meus) if (k !== '*' && k in l) n[k] = l[k];
    /* O estado (e as skills) de um personagem não é "o daqui por cima": é o que chegou, com as mudanças daqui que
       ainda não subiram refeitas por cima. Quem mexeu em outra barra, lá, aparece aqui na hora. */
    if (l && nome === 'personagens' && !meus.has('*')) for (const col of JUNTAM) if (meus.has(col) && temFila(c, col, r.id)) n[col] = refazer(c, r.id, col, r[col]);
    c.linhas.set(r.id, n);
    // nada mudou para quem usa a linha (é a volta de algo que já estava aqui): só a revisão anda
    if (l && TABELAS[nome].every(k => igual(n[k], l[k]))) return;
    dados.emit('muda', nome, n, 'remota', null);
  }
  /* As duas voltas abaixo esperam a rede no meio do caminho; nesse meio-tempo a mesa pode ser fechada ou trocada
     (e `cols` passa a ser outro). Por isso andam sobre as coleções que existiam quando a volta começou. */
  async function dadosBuscar() {
    for (const c of Object.values(cols)) {
      const nome = c.nome;
      if (c.morta || c.buscando) continue;
      c.buscando = true;
      try {
        await c.pronta;
        const de = c.maxRev;
        const { data, error } = await cliente().from(nome).select('*').eq('mesa_id', c.mesa).gt('rev', de).order('rev').limit(500);
        if (!error && !c.morta) for (const r of data || []) dadosRemoto(nome, r);
        /* Duas gravações feitas no mesmo instante podem aparecer no banco fora de ordem: a de revisão menor fica
           visível depois da de revisão maior, que a leitura anterior já tinha passado. Então a faixa da leitura
           anterior é conferida de novo, só com o nome e a revisão de cada linha; a que estiver à frente da daqui é
           lida inteira. (Só há o que conferir quando algo mudou desde a leitura anterior.) */
        if (!error && !c.morta && c.anterior != null && c.anterior < de) {
          const leve = await cliente().from(nome).select('id,rev,apagado').eq('mesa_id', c.mesa).gt('rev', c.anterior).lte('rev', de).limit(1000);
          if (!leve.error && !c.morta) for (const x of leve.data || []) {
            const l = c.linhas.get(x.id);
            if (l ? (l.rev || 0) < x.rev : !x.apagado && !c.sujos.has(x.id) && !c.emVoo.has(x.id)) buscarLinha(nome, x.id);
          }
        }
        if (!error) c.anterior = de;
        if (!c.morta) for (const id of [...c.reler]) relerLinha(c, id);      // (as que ficaram por reler: sem rede na hora, por exemplo)
      } catch (e) { /* sem rede: a próxima volta tenta de novo */ }
      c.buscando = false;
    }
  }
  /* O que deixou de ser visível para o jogador (o mestre escondeu a ficha, ou passou para outra pessoa) não chega
     como mudança: o banco simplesmente para de mostrar a linha. Então, de tempos em tempos, o jogador confere a lista
     do que ainda pode ver e tira da tela o resto. (O mestre vê tudo: para ele não há o que conferir. O auxiliar, mesmo
     mestrando, pode não ter todas as abas: confere como os jogadores.) */
  async function dadosConferir() {
    if (!mesas.atual || mesas.atual.cargo === 'mestre') return;
    for (const c of Object.values(cols)) {
      const nome = c.nome;
      if (c.morta || c.conferindo) continue;
      c.conferindo = true;
      try {
        await c.pronta;
        const ate = c.maxRev;                                 // o que chegar depois disto ainda não está na lista: fica
        const { data, error } = await cliente().from(nome).select('id').eq('mesa_id', c.mesa).eq('apagado', false).limit(5000);
        if (!error && !c.morta && data.length < 5000) {
          const vivos = new Set(data.map(r => r.id));
          for (const [id, l] of [...c.linhas]) {
            if (vivos.has(id) || c.sujos.has(id) || c.emVoo.has(id) || !l.rev || l.rev > ate) continue;
            c.linhas.delete(id);
            dados.emit('muda', nome, { id, apagado: true }, 'remota', null);
          }
        }
      } catch (e) { /* sem rede: a próxima volta confere */ }
      c.conferindo = false;
    }
  }
  function agendar(c, id, ms) {
    clearTimeout(c.tempo.get(id));
    c.tempo.set(id, setTimeout(() => { c.tempo.delete(id); enviarLinha(c, id); }, ms));
  }
  /* A linha inteira, como vai para o banco. Um documento escrito pelo mestre vai sempre sem dono: se já existir no
     banco um documento com esse nome e com dono (que nenhum sistema lê), ele volta a ser do mestre. */
  function linhaInteira(c, id, l) {
    const o = { mesa_id: c.mesa, id, apagado: false };
    for (const k of TABELAS[c.nome]) if (l[k] !== undefined) o[k] = l[k];
    if (c.nome === 'documentos' && c.doMestre && o.dono_id === undefined) o.dono_id = null;
    return o;
  }
  /* Uma gravação deu certo e o banco devolveu a revisão nova (rev) e a que a linha tinha logo antes (rev_ant).
     A linha daqui passa a estar na revisão nova (o que chegar de mais antigo que ela já não vale). Mas "tenho tudo
     até aqui" só é verdade se a linha estava, no banco, na revisão que este aparelho conhecia. Se não estava, outra
     pessoa mexeu nela nesse meio-tempo — em outra coluna, ou em outra chave do estado — e o aviso dessa mudança,
     que tem revisão mais antiga que a minha, seria descartado: a linha é lida de novo, inteira. */
  const REV = 'rev,rev_ant';
  const MAX_MUDAS = 200;                       // mudanças de estado num envio só (o banco recusa mais que isso)
  // (certas, em enviarLinha: as respostas que já passaram por aqui — a do estado passa assim que chega)
  function assentar(c, id, d) {
    const agora = c.linhas.get(id);
    if (!agora || !d) return;
    const ant = d.rev_ant == null ? null : Number(d.rev_ant), sabia = agora.rev || 0;
    if (d.rev > sabia) agora.rev = d.rev;
    /* Relê quando: (1) a linha estava em outra revisão quando esta gravação chegou (alguém mexeu antes dela); ou
       (2) já chegou aqui uma revisão mais nova que a desta gravação (alguém mexeu depois dela, enquanto a resposta
       não vinha — e, na tela, o que estava "a caminho" ficou por cima do que o outro fez). */
    if (d.rev < sabia || (ant != null && ant !== sabia)) relerLinha(c, id);
  }
  /* Lê a linha inteira e a aplica mesmo que a revisão seja a que já está aqui (o que está aqui é só o que este
     aparelho gravou; o que veio do banco tem também o que os outros gravaram). Se a leitura sair mais velha que uma
     gravação daqui que chegou depois, lê de novo. Sem rede, fica marcada e a volta periódica tenta outra vez. */
  async function relerLinha(c, id) {
    c.reler.add(id);
    if (c.relendo.has(id)) return;                    // (já há uma leitura desta linha a caminho)
    c.relendo.add(id);
    try {
      for (let i = 0; i < 3 && c.reler.has(id) && !c.morta; i++) {
        const r = await cliente().from(c.nome).select('*').eq('mesa_id', c.mesa).eq('id', id).maybeSingle();
        if (r.error) return;
        const l = c.linhas.get(id);
        if (c.morta || !l || !r.data) { c.reler.delete(id); return; }
        if (r.data.rev >= (l.rev || 0)) { c.reler.delete(id); dadosRemoto(c.nome, r.data, 'relida'); return; }
      }
    } catch (e) { /* sem rede: fica marcada para a volta periódica */ } finally { c.relendo.delete(id); }
  }
  async function enviarLinha(c, id, ultima) {
    if ((c.morta && !ultima) || c.emVoo.has(id)) return;
    const campos = c.sujos.get(id);
    if (!campos) return;
    const voando = new Set(campos);                    // os campos que estão a caminho (o que chega do banco não passa por cima deles)
    c.sujos.delete(id); c.emVoo.set(id, voando);
    const l = c.linhas.get(id);
    if (c.nome === 'documentos' && l && !campos.has('*') && campos.has('dados') && c.cas.has(id) && c.bases.has(id) && !c.fechando && !c.morta) { enviarComVersao(c, id, campos, voando, l); return; }
    // as mudanças (do estado, das skills) que vão agora, por coluna (o que passar do limite vai na volta seguinte)
    const indo = {};
    for (const col of JUNTAM) {
      const k = kq(col, id), fila = c.rems.get(k) || [], vai = fila.splice(0, MAX_MUDAS);
      if (fila.length) c.rems.set(k, fila); else c.rems.delete(k);
      if (vai.length) { indo[col] = vai; c.remsVoo.set(k, vai); }
    }
    const tb = () => cliente().from(c.nome), certas = [], subiu = new Set();      // subiu: os campos que já chegaram ao banco
    let r = null;
    try {
      if (!l && campos.has('*')) r = { data: { rev: 0 } };                         // criada e apagada antes de subir: nada a fazer
      else if (!l) r = await tb().update({ apagado: true }).eq('mesa_id', c.mesa).eq('id', id).select(REV).maybeSingle();
      else {
        const inteira = () => linhaInteira(c, id, l);
        if (campos.has('*')) {
          r = await tb().insert(inteira()).select(REV).single();
          if (r.error && r.error.code === '23505') r = await tb().update(inteira()).eq('mesa_id', c.mesa).eq('id', id).select(REV).maybeSingle();
        } else {
          // o estado e as skills vão como mudança (o banco junta), um pedido por coluna; os outros campos, como estão
          const o = {}; for (const k of campos) if (!indo[k]) o[k] = l[k];
          for (const col of JUNTAM) {
            if (!indo[col] || (r && (r.error || !r.data))) continue;       // (um pedido que falhou, ou a linha não existe: para aqui)
            const e = await cliente().rpc(RPC_JUNTAR, { p_mesa: c.mesa, p_id: id, p_coluna: col, p_mudas: indo[col] });
            r = e.error ? { error: e.error } : { data: (Array.isArray(e.data) ? e.data[0] : e.data) || null };
            /* A coluna chegou ao banco. Daqui em diante ela já não está "a caminho": o que vier do banco a traz
               como ficou lá (com o que os outros mexeram), e é essa que vale — mesmo que os outros campos desta
               linha ainda estejam subindo. A linha passa já à revisão dessa gravação. */
            if (!r.error && r.data) { certas.push(r.data); subiu.add(col); c.remsVoo.delete(kq(col, id)); voando.delete(col); if (!c.morta) assentar(c, id, r.data); }
          }
          if ((!r || (!r.error && r.data)) && Object.keys(o).length) r = await tb().update(o).eq('mesa_id', c.mesa).eq('id', id).select(REV).maybeSingle();
          if (!r.error && !r.data) r = await tb().insert(inteira()).select(REV).single();   // a linha não existia no banco
        }
      }
    } catch (e) { r = { error: e }; }
    c.emVoo.delete(id);
    const voltam = {};                                       // por coluna, as mudanças que não chegaram
    for (const col of JUNTAM) { const k = kq(col, id); if (r.error && c.remsVoo.has(k)) voltam[col] = c.remsVoo.get(k); c.remsVoo.delete(k); }
    if (c.morta) { if (!r.error && !ultima && c.sujos.has(id)) enviarLinha(c, id, true); return; }
    if (r.error) {
      // volta para a fila (junto com o que mudou nesse meio-tempo) e tenta de novo, cada vez mais devagar
      const de_novo = c.sujos.get(id) || new Set(); for (const k of campos) if (!subiu.has(k)) de_novo.add(k); c.sujos.set(id, de_novo);
      for (const col in voltam) c.rems.set(kq(col, id), voltam[col].concat(c.rems.get(kq(col, id)) || []));
      const semPermissao = /row-level security|permission denied|Só o mestre/i.test(String(r.error.message || ''));
      dados.erro = erroPt(r.error, 'Não deu para salvar na mesa agora.');
      if (semPermissao) { c.sujos.delete(id); largarFilas(c, id); dados.emit('recusado', c.nome, id, dados.erro); }   // não adianta insistir (e não é falha de rede)
      else { c.falhas = Math.min(c.falhas + 1, 6); agendar(c, id, 2000 * Math.pow(2, c.falhas)); }
      dados.emit('erro', dados.erro);
    } else {
      c.falhas = 0; dados.erro = null;
      if (!l && r.data && r.data.rev) enterrar(c, id, r.data.rev);      // (foi um apagar: a linha só volta por uma revisão maior que esta)
      if (!certas.includes(r.data)) assentar(c, id, r.data);
      for (const col of JUNTAM) if (c.rems.has(kq(col, id))) { const s = c.sujos.get(id) || new Set(); s.add(col); c.sujos.set(id, s); }      // sobrou mudança para a volta seguinte
      if (c.sujos.has(id)) agendar(c, id, 300);
    }
    contarPendentes();
  }
  /* Um documento gravado "conferindo a versão": a gravação só vale se ele ainda está, no banco, na revisão de que este
     aparelho partiu. Se outra pessoa gravou antes — o mestre e o mestre auxiliar na mesma cena, no mesmo instante —,
     o que está lá é lido, junta-se a ele o que foi feito aqui (juntar3) e a gravação vai de novo. Sem isso a daqui
     passaria por cima da dela, e o que ela fez sumiria para todos. O sistema recebe o documento juntado como uma
     mudança que veio de fora, e refaz por cima dele o que ainda tiver por salvar. */
  async function enviarComVersao(c, id, campos, voando, l) {
    const tb = () => cliente().from(c.nome), base = c.bases.get(id), o = {};
    for (const k of campos) o[k] = l[k];
    let r = null, erro = null, deles = null;
    try {
      r = await tb().update(o).eq('mesa_id', c.mesa).eq('id', id).eq('rev', base.rev).select(REV).maybeSingle();
      if (r.error) erro = r.error;
      else if (!r.data) {
        // nada mudou no banco: ou o documento não está mais na revisão que este aparelho conhecia, ou não existe
        const la = await tb().select('*').eq('mesa_id', c.mesa).eq('id', id).maybeSingle();
        if (la.error) erro = la.error;
        else if (la.data) deles = la.data;
        else { r = await tb().insert(linhaInteira(c, id, l)).select(REV).single(); if (r.error) erro = r.error; }
      }
    } catch (e) { erro = e; }
    c.emVoo.delete(id);
    if (c.morta) {
      // a mesa fechou enquanto a gravação ia: o que não valeu, e o que mudou depois, vai agora do jeito simples
      if (erro) return;
      if (deles) { const s = c.sujos.get(id) || new Set(); for (const k of campos) s.add(k); c.sujos.set(id, s); }
      if (c.sujos.has(id)) enviarLinha(c, id, true);
      return;
    }
    if (erro) {
      const de_novo = c.sujos.get(id) || new Set(); for (const k of campos) de_novo.add(k); c.sujos.set(id, de_novo);
      const semPermissao = /row-level security|permission denied|Só o mestre/i.test(String(erro.message || ''));
      dados.erro = erroPt(erro, 'Não deu para salvar na mesa agora.');
      if (semPermissao) { c.sujos.delete(id); c.bases.delete(id); dados.emit('recusado', c.nome, id, dados.erro); }
      else { c.falhas = Math.min(c.falhas + 1, 6); agendar(c, id, 2000 * Math.pow(2, c.falhas)); }
      dados.emit('erro', dados.erro);
    } else if (deles) {
      juntarComODeLa(c, id, deles, voando);
    } else {
      c.falhas = 0; dados.erro = null;
      // o que acabou de ser gravado passa a ser o ponto de partida do que este aparelho ainda tem por mandar
      const falta = c.sujos.get(id);
      if (falta && falta.has('dados')) c.bases.set(id, { rev: r.data.rev, dados: o.dados }); else c.bases.delete(id);
      assentar(c, id, r.data);
      if (c.sujos.has(id)) agendar(c, id, 300);
    }
    contarPendentes();
  }
  /* A gravação daqui não valeu: no banco está `deles`, que outra pessoa gravou. O documento daqui passa a ser o dela
     com o que foi feito aqui juntado; se isso muda alguma coisa, é o que vai na gravação seguinte. */
  function juntarComODeLa(c, id, deles, voando) {
    const l = c.linhas.get(id), base = c.bases.get(id), pend = c.sujos.get(id) || new Set();
    if (deles.apagado) {
      // o documento foi apagado por outra pessoa: o que foi feito aqui em cima dele não tem mais onde ficar
      c.sujos.delete(id); c.bases.delete(id); enterrar(c, id, deles.rev);
      if (l) { c.linhas.delete(id); dados.emit('muda', c.nome, { id, apagado: true }, 'remota', null); }
      return;
    }
    if (!l) return;                                          // (apagado aqui nesse meio-tempo: o apagar segue o caminho dele)
    const junto = juntar3(base ? base.dados : undefined, l.dados, deles.dados), n = Object.assign({}, deles, { dados: junto });
    for (const k of new Set([...voando, ...pend])) if (k !== 'dados' && k !== '*' && k !== 'apagado' && k in l) { n[k] = l[k]; pend.add(k); }     // as outras colunas daqui continuam por subir
    c.linhas.set(id, n);
    c.bases.set(id, { rev: deles.rev, dados: deles.dados });
    if (!igual(junto, deles.dados)) pend.add('dados');       // (se o que foi feito aqui já está lá, não há o que regravar)
    if (pend.size) { c.sujos.set(id, pend); agendar(c, id, 60); } else { c.sujos.delete(id); c.bases.delete(id); }
    c.falhas = 0; dados.erro = null;
    dados.juntados = (dados.juntados || 0) + 1;              // (quantas vezes isso aconteceu: para os testes e para quem investigar)
    dados.emit('muda', c.nome, n, 'remota', null);
  }
  /* Grava campos de uma linha (cria se não existir). `de` identifica quem pediu, para não receber o próprio eco.
     O estado e as skills de um personagem entram como mudança: `mudas.estado` / `mudas.skills` (o que quem pediu
     mexeu, contado a partir do que ele tinha em mãos) ou, se a coluna veio inteira em `campos`, o que ela muda na
     que está aqui. */
  function dadosGravar(nome, id, campos, de, mudas, opt) {
    const c = abrirCol(nome);
    let l = c.linhas.get(id);
    const suj = c.sujos.get(id) || new Set();
    campos = campos || {};
    // (num banco de antes das campanhas essas colunas não existem: o que viesse nelas faria a gravação inteira falhar)
    if (!mesas.atual.campanhasLigadas && OPCIONAIS.some(k => campos[k] !== undefined)) { campos = Object.assign({}, campos); for (const k of OPCIONAIS) delete campos[k]; }
    if (trancada(nome, id, l, campos)) {
      dados.emit('recusado', nome, id, ENCERRADA);
      dados.emit('muda', nome, l || { id, apagado: true }, 'remota', null);
      return l || null;
    }
    /* opt.cas: este documento é gravado conferindo a versão (ver enviarComVersao). O ponto de partida é o documento
       como está aqui antes desta mudança — se já não há outra mudança dele por subir (aí o ponto de partida é o dela). */
    if (nome === 'documentos' && opt && opt.cas && l && !campos.apagado && campos.dados !== undefined) {
      c.cas.add(id);
      const indo = c.emVoo.get(id);
      if (!c.bases.has(id)) c.bases.set(id, suj.has('dados') || suj.has('*') || (indo && (indo.has('dados') || indo.has('*'))) ? { rev: l.rev || 0, dados: undefined } : { rev: l.rev || 0, dados: l.dados });
    }
    if (campos.apagado) {
      if (!l) return null;
      c.bases.delete(id);
      c.linhas.delete(id); suj.add('apagado'); c.sujos.set(id, suj); largarFilas(c, id);
      dados.emit('muda', nome, { id, apagado: true }, 'local', de);
    } else {
      const nova = !l, comMuda = nome === 'personagens' && !nova;
      if (nova) {
        l = { mesa_id: c.mesa, id, rev: 0, apagado: false }; suj.add('*'); suj.delete('apagado');
        /* O documento novo nasce aqui como vai nascer no banco: de campanha nenhuma — ou, o "nome@campanha", só dela.
           Sem isso a volta da própria gravação (que traz a coluna) pareceria uma mudança feita por outra pessoa. */
        if (nome === 'documentos' && mesas.atual.campanhasLigadas) { const i = String(id).indexOf('@'); l.campanhas = i > 0 ? [String(id).slice(i + 1)] : []; }
      }
      else l = Object.assign({}, l);
      let mudou = nova;
      for (const k of TABELAS[nome]) if (campos[k] !== undefined && !(comMuda && JUNTAM.includes(k))) { l[k] = campos[k]; suj.add(k); mudou = true; }
      if (nome === 'personagens') for (const col of JUNTAM) {
        const m = mudas && ehMapa(mudas[col]) ? copiar(mudas[col]) : comMuda && campos[col] !== undefined ? diferenca(l[col], campos[col]) : null;
        if (m && Object.keys(m).length) {
          l[col] = juntar(l[col], m); suj.add(col); mudou = true;
          if (!suj.has('*')) empilhar(c, id, col, m);       // a linha que ainda vai inteira já leva a coluna como ficou
        }
      }
      if (!mudou) return l;                                 // (igual ao que já estava aqui: nada a gravar)
      c.linhas.set(id, l); c.sujos.set(id, suj);
      dados.emit('muda', nome, l, 'local', de);
    }
    agendar(c, id, 500);
    contarPendentes();
    return l;
  }
  dados.col = nome => {
    const c = abrirCol(nome);
    return { pronta: c.pronta, todas: () => [...c.linhas.values()], pegar: id => c.linhas.get(id) || null, gravar: (id, campos, de, mudas, opt) => dadosGravar(nome, id, campos, de, mudas, opt), apagar: (id, de) => dadosGravar(nome, id, { apagado: true }, de) };
  };
  dados.remendo = remendo;
  /* As barras de uma ficha que não chega a este aparelho: o mestre auxiliar mestrando as Cenas sem a aba Fichas, num
     token ligado a uma ficha escondida dos jogadores. Vão só o valor atual e a sobrevida, por um caminho próprio do
     banco (que confere se quem pede mestra as Cenas e só aceita as barras que a ficha tem). */
  dados.barrasDoToken = async (id, rec, sob) => {
    const a = mesas.atual; if (!a) return null;
    const { data, error } = await cliente().rpc('barras_do_token', { p_mesa: a.id, p_id: String(id), p_rec: rec || {}, p_sob: sob || null });
    if (error) throw falha(error, 'Não deu para levar as barras à ficha agora.');
    return (Array.isArray(data) ? data[0] : data) || null;
  };
  /* Manda agora o que está na fila (ao fechar a página, por exemplo). */
  dados.descarregar = () => { for (const k in cols) for (const id of [...cols[k].sujos.keys()]) { clearTimeout(cols[k].tempo.get(id)); cols[k].tempo.delete(id); enviarLinha(cols[k], id); } };
  /* Manda agora e espera subir, até `ms` (antes de fechar ou trocar de mesa, ou de sair da conta). Devolve true se
     subiu tudo. Não trava: se algo não sobe (sem rede, por exemplo), segue depois do prazo. */
  dados.esvaziar = ms => new Promise(ok => {
    const t0 = Date.now();
    dados.descarregar();
    (function olhar() {
      if (!dados.pendentes) return ok(true);
      if (Date.now() - t0 >= (ms || 0)) return ok(false);
      setTimeout(olhar, 80);
    })();
  });
  /* ---- a página está fechando ----
     Um envio comum não sai a tempo: antes de cada um a biblioteca do banco faz uma pequena espera, e a página some
     antes. Aqui o envio é feito à mão, na hora, e marcado para o navegador terminá-lo mesmo depois de a página
     fechar ("keepalive"). O navegador só garante isso para pouco conteúdo (64 KB, somando tudo o que está indo):
     o que não couber segue pelo caminho comum, sem garantia. */
  let pesoNoAr = 0;
  const LIMITE_SAIDA = 60000;
  function enviarNaSaida(c, id) {
    if (c.morta || c.emVoo.has(id) || typeof fetch !== 'function') return false;
    // sem rede, com envios falhando ou com o passe vencido, mandar assim não garante nada: melhor o navegador perguntar
    if (!passe || (passeAte && Date.now() / 1000 > passeAte - 10) || c.falhas > 0 || (typeof navigator !== 'undefined' && navigator.onLine === false)) return false;
    const campos = c.sujos.get(id);
    if (!campos) return true;
    const l = c.linhas.get(id), filtro = '?mesa_id=eq.' + encodeURIComponent(c.mesa) + '&id=eq.' + encodeURIComponent(id) + '&select=' + REV;
    if (!l && campos.has('*')) { c.sujos.delete(id); largarFilas(c, id); return true; }     // criada e apagada antes de subir: nada a fazer
    const mudas = {};                                                               // por coluna, o que vai como mudança
    for (const col of JUNTAM) { const f = c.rems.get(kq(col, id)); if (f && f.length) mudas[col] = f; }
    if (Object.keys(mudas).some(col => mudas[col].length > MAX_MUDAS)) return false;   // (coisa demais acumulada: segue pelo caminho comum)
    // os pedidos desta linha: um só, ou mais de um quando o estado ou as skills (que vão como mudança) saem com outros campos
    const pedidos = [];
    if (!l) pedidos.push(['PATCH', c.nome + filtro, 'return=representation', { apagado: true }]);
    else if (campos.has('*')) pedidos.push(['POST', c.nome + '?on_conflict=mesa_id,id&select=' + REV, 'resolution=merge-duplicates,return=representation', linhaInteira(c, id, l)]);   // linha nova: cria (ou, se já existir, troca)
    else {
      const o = {}; for (const k of campos) if (!mudas[k]) o[k] = l[k];
      for (const col in mudas) pedidos.push(['POST', 'rpc/' + RPC_JUNTAR, '', { p_mesa: c.mesa, p_id: id, p_coluna: col, p_mudas: mudas[col] }]);
      if (Object.keys(o).length) pedidos.push(['PATCH', c.nome + filtro, 'return=representation', o]);
    }
    let peso = 0;
    try { for (const p of pedidos) { p[3] = JSON.stringify(p[3]); peso += new TextEncoder().encode(p[3]).length; } } catch (e) { return false; }
    if (pesoNoAr + peso > LIMITE_SAIDA) return false;
    let idas;
    try {
      idas = pedidos.map(([metodo, caminho, prefer, texto]) => {
        const headers = { apikey: CFG.chave, Authorization: 'Bearer ' + passe, 'Content-Type': 'application/json' };
        if (prefer) headers.Prefer = prefer;
        return fetch(CFG.url + '/rest/v1/' + caminho, { method: metodo, keepalive: true, body: texto, headers });
      });
    } catch (e) { return false; }
    c.sujos.delete(id); c.emVoo.set(id, campos); c.naSaida.add(id); pesoNoAr += peso;
    for (const col of JUNTAM) { const k = kq(col, id); c.rems.delete(k); if (mudas[col]) c.remsVoo.set(k, mudas[col]); }
    // (o que vem depois só acontece se a página, afinal, não fechou)
    // (null: não chegou · 'ok': chegou, mas a resposta não pôde ser lida · lista: as linhas mudadas, com a revisão)
    Promise.all(idas.map(p => p.then(r => (r.ok ? r.json().then(x => x, () => 'ok') : null), () => null))).then(voltas => {
      pesoNoAr -= peso; c.emVoo.delete(id); c.naSaida.delete(id);
      const iam = {};
      for (const col of JUNTAM) { const k = kq(col, id); if (c.remsVoo.has(k)) iam[col] = c.remsVoo.get(k); c.remsVoo.delete(k); }
      if (c.morta) return;
      if (voltas.some(v => !v)) {
        // algum pedido não chegou: volta tudo para a fila (mandar de novo o que já tinha chegado não muda nada)
        const de_novo = c.sujos.get(id) || new Set(); for (const k of campos) de_novo.add(k); c.sujos.set(id, de_novo);
        for (const col in iam) c.rems.set(kq(col, id), iam[col].concat(c.rems.get(kq(col, id)) || []));
        c.falhas = Math.min(c.falhas + 1, 6); agendar(c, id, 1500);
      } else {
        for (const linhas of voltas) if (Array.isArray(linhas) && linhas[0]) { if (!l) enterrar(c, id, linhas[0].rev); assentar(c, id, linhas[0]); }
        if (voltas.some(v => Array.isArray(v) && !v.length) && l) { const de_novo = c.sujos.get(id) || new Set(); de_novo.add('*'); c.sujos.set(id, de_novo); }   // a linha não existia no banco: vai inteira
        if (c.sujos.has(id)) agendar(c, id, 300);
      }
      contarPendentes();
    });
    return true;
  }
  /* Manda agora tudo o que está na fila, do jeito que sobrevive ao fechamento da página. Devolve quantas linhas
     ficaram sem essa garantia (grandes demais, ou já a caminho pelo envio comum): é quando vale perguntar antes de sair. */
  dados.sair = () => {
    let semGarantia = 0;
    for (const c of Object.values(cols)) {
      for (const id of c.emVoo.keys()) if (!c.naSaida.has(id)) semGarantia++;
      for (const id of [...c.sujos.keys()]) {
        clearTimeout(c.tempo.get(id)); c.tempo.delete(id);
        if (c.emVoo.has(id)) continue;                       // (já contada: a parte dela que está indo não tem garantia)
        if (!enviarNaSaida(c, id)) { semGarantia++; enviarLinha(c, id); }
      }
    }
    contarPendentes();
    return semGarantia;
  };
  window.addEventListener('pagehide', () => dados.sair());

  /* ---------------- quem fala: o personagem que aparece na mesa ao vivo ---------------- */
  /* Cada pessoa escolhe com que personagem fala (a imagem dele aparece ao lado do nome). O jogador escolhe entre os
     personagens que controla; o mestre, entre todos — ou nenhum (fala como mestre). A escolha fica neste navegador,
     por mesa. Só vale como imagem o que está guardado na pasta desta mesa. */
  const imgBase = () => CFG.url + '/storage/v1/object/public/mesas/';
  aoVivo.imagemValida = u => typeof u === 'string' && u.length < 500 && !!mesas.atual && u.startsWith(imgBase() + mesas.atual.id + '/');
  function linhasPcs() { const c = cols.personagens; return c && !c.morta && mesas.atual && c.mesa === mesas.atual.id ? [...c.linhas.values()] : []; }
  const resumoPc = l => ({ id: l.id, nome: l.nome || 'Sem nome', av: l.ficha && aoVivo.imagemValida(l.ficha.img) ? l.ficha.img : null, camp: l.campanha || null });
  /* Os personagens com que a pessoa pode falar e rolar: o jogador, os que ele controla; quem mestra, todos. Com
     campanhas, primeiro os da campanha em vista, depois os do mundo, depois os das outras. */
  aoVivo.personagens = () => {
    const a = mesas.atual; if (!a || !conta.usuario) return [];
    const eu = conta.usuario.id, peso = l => (!l.campanha ? 1 : l.campanha === a.campanha ? 0 : 2);
    return linhasPcs().filter(l => a.papel === 'mestre' || l.dono_id === eu).sort((x, y) => (peso(x) - peso(y)) || ((x.ordem || 0) - (y.ordem || 0)) || (x.id < y.id ? -1 : 1)).map(resumoPc);
  };
  aoVivo.personagem = id => { const l = linhasPcs().find(x => x.id === id); return l ? resumoPc(l) : null; };
  // (a escolha é guardada por mesa e por campanha em vista: quem joga em duas campanhas tem um personagem em cada)
  const chaveComo = a => 'tinycats:como:' + a.id + (a.campanha ? '@' + a.campanha : '');
  aoVivo.como = () => {
    const a = mesas.atual; if (!a) return null;
    const esc = guarda.ler(chaveComo(a));
    if (esc === '-') return null;                                   // escolheu falar sem personagem
    const lista = aoVivo.personagens(), p = lista.find(x => x.id === esc);
    if (p) return p;
    return a.papel === 'mestre' ? null : (lista[0] || null);         // o jogador fala com o personagem dele; o mestre, como mestre
  };
  aoVivo.falarComo = id => { const a = mesas.atual; if (!a) return; guarda.gravar(chaveComo(a), id || '-'); aoVivo.emit('como', aoVivo.como()); };
  dados.on('muda', col => { if (col === 'personagens') aoVivo.emit('como', aoVivo.como()); });

  /* ---------------- imagens da mesa ---------------- */
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  const arquivos = {
    /* Envia uma imagem para a pasta da mesa e devolve o endereço público dela. */
    async subir(blob) {
      const a = mesas.atual;
      if (!a) throw new Error('Abra uma mesa primeiro.');
      if (!blob || !EXT[blob.type]) throw new Error('Envie uma imagem JPG, PNG ou WebP.');
      if (blob.size > 15 * 1024 * 1024) throw new Error('A imagem passa de 15 MB. Diminua e tente de novo.');
      // o mestre guarda na pasta da mesa; o jogador, na pasta dele dentro dela (o banco só aceita assim)
      const pasta = a.papel === 'mestre' ? a.id : a.id + '/j/' + conta.usuario.id;
      const caminho = pasta + '/' + novoId('img') + '.' + EXT[blob.type];
      const { error } = await cliente().storage.from('mesas').upload(caminho, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
      if (error) throw falha(error, 'Não deu para enviar a imagem agora.');
      return cliente().storage.from('mesas').getPublicUrl(caminho).data.publicUrl;
    },
    /* Apaga uma imagem enviada antes (quando ela é trocada). Se não der, tudo bem: fica só ocupando espaço. */
    async apagar(url) {
      const m = /\/object\/public\/mesas\/(.+)$/.exec(String(url || ''));
      if (!m || !mesas.atual || !m[1].startsWith(mesas.atual.id + '/')) return;
      try { await cliente().storage.from('mesas').remove([decodeURIComponent(m[1])]); } catch (e) { /* fica */ }
    },
  };

  /* Rolagens que vêm do mapa-múndi (encontros sorteados, por exemplo) entram na mesa como as outras. */
  const deSistemaAntes = aoVivo.deSistema;
  aoVivo.deSistema = async (origem, d) => {
    // O Mapa-múndi (encontros sorteados) e o Acampamento (descansos, momentos) mandam um título e um resumo.
    if ((origem === 'mundo' || origem === 'acampamento') && d && typeof d === 'object' && mesas.atual) {
      const padrao = origem === 'mundo' ? 'Mapa-múndi' : 'Acampamento';
      // (o encontro do Mapa-múndi acompanha o "em segredo" do mestre; descanso e momento do Acampamento são da mesa toda)
      return aoVivo.rolagem({ k: 'tabela', titulo: String(d.titulo || padrao).slice(0, 120), total: null, resumo: String(d.resumo || '').slice(0, 600), veredito: null, passou: null }, { origem, quem: null, secreta: d.secreta ? true : origem === 'acampamento' ? false : undefined });
    }
    // As Cenas também avisam a mesa (o mestre pôs uma cena no ar): só o mestre pode.
    if (origem === 'cena' && d && d.kind === 'aviso' && mesas.atual) {
      if (mesas.atual.papel !== 'mestre') return null;
      return aoVivo.rolagem({ k: 'tabela', titulo: String(d.titulo || 'Cenas').slice(0, 120), total: null, resumo: String(d.resumo || '').slice(0, 600), veredito: null, passou: null }, { origem, quem: null, secreta: false });     // é um aviso para os jogadores: nunca "em segredo"
    }
    return deSistemaAntes(origem, d);
  };

  TC.conta = conta; TC.mesas = mesas; TC.aoVivo = aoVivo; TC.dados = dados; TC.arquivos = arquivos; TC.erroPt = erroPt;
})();
