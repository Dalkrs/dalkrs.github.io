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
    if (/^(Entre na sua conta|Dê um nome|Você |Código |Esta mesa|Só o mestre|Já existe|Digite |A senha |Diga |O cadastro |Não foi possível)/.test(m)) return m;
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
    const { data, error } = await cliente().from('mesa_membros').select('papel, nome, mesas(id, nome, criada_em)').eq('usuario_id', u.id);
    if (error) throw falha(error);
    return (data || []).filter(x => x.mesas).map(x => ({ id: x.mesas.id, nome: x.mesas.nome, papel: x.papel, criada: x.mesas.criada_em }))
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
  async function lerMembros(id) {
    const { data, error } = await cliente().from('mesa_membros').select('usuario_id, papel, nome, cor, visto_em').eq('mesa_id', id).order('entrou_em');
    if (error) throw error;
    return data || [];
  }
  mesas.abrir = async id => {
    const u = exigir();
    const { data: m, error } = await cliente().from('mesas').select('id, nome, dono_id').eq('id', id).maybeSingle();
    if (error) throw falha(error);
    if (!m) { guarda.gravar(CHAVE_MESA, null); throw new Error('Esta mesa não existe mais, ou você saiu dela.'); }
    const membros = await lerMembros(id).catch(e => { throw falha(e); });
    const eu = membros.find(x => x.usuario_id === u.id);
    if (!eu) throw new Error('Você não participa desta mesa.');
    let codigo = null;
    if (eu.papel === 'mestre') {
      const cv = await cliente().from('mesa_convites').select('codigo').eq('mesa_id', id).maybeSingle();
      codigo = cv.data ? cv.data.codigo : null;
    }
    aoVivo.parar(); dadosZerar();
    mesas.atual = { id: m.id, nome: m.nome, dono: m.dono_id === u.id, papel: eu.papel, meuNome: eu.nome, minhaCor: eu.cor, codigo, membros };
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
      const { data } = await cliente().from('mesas').select('nome').eq('id', a.id).maybeSingle();
      if (data && mesas.atual === a && data.nome && data.nome !== a.nome) { a.nome = data.nome; mesas.emit('muda', a); }
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
      const membros = await lerMembros(a.id);
      if (mesas.atual !== a) return;
      if (!membros.some(x => x.usuario_id === (conta.usuario && conta.usuario.id))) { mesas.esquecer(); mesas.emit('removido'); return; }
      a.membros = membros; mesas.emit('membros', membros);
    } catch (e) { /* sem rede: tenta de novo na próxima volta */ }
  }

  /* ---------------- mesa ao vivo ---------------- */
  const LIMITE = 300;          // linhas guardadas na tela
  const aoVivo = emissor({ itens: [], conectado: false, segredo: false });
  let mesaId = null, canal = null, relogio = 0, volta = 0, maxRev = 0, folga = 0, buscando = false;

  const online = m => !!(m && m.visto_em && (Date.now() + folga - Date.parse(m.visto_em)) < 75000);
  aoVivo.online = online;

  function aplicar(linha, silencioso) {
    if (!linha || linha.mesa_id !== mesaId) return;
    if (linha.rev > maxRev) maxRev = linha.rev;
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
  async function buscarNovos() {
    if (!mesaId || buscando) return;
    buscando = true;
    const id = mesaId;
    try {
      const { data, error } = await cliente().from('registro').select('*').eq('mesa_id', id).gt('rev', maxRev).order('rev').limit(200);
      if (!error && id === mesaId) for (const l of data || []) aplicar(l);
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
  async function carregarItens(id) {
    try {
      const { data, error } = await cliente().from('registro').select('*').eq('mesa_id', id).eq('apagado', false).order('criado_em', { ascending: false }).limit(200);
      if (error) throw error;
      if (mesaId !== id) return;
      for (const l of (data || []).reverse()) aplicar(l, true);
      const topo = await cliente().from('registro').select('rev').eq('mesa_id', id).order('rev', { ascending: false }).limit(1);
      if (topo.data && topo.data[0]) maxRev = Math.max(maxRev, topo.data[0].rev);
    } catch (e) { /* começa vazio; a leitura periódica completa depois */ }
  }
  aoVivo.iniciar = async id => {
    aoVivo.parar();
    mesaId = id; maxRev = 0; aoVivo.itens = [];
    aoVivo.segredo = guarda.ler('tinycats:segredo:' + id) === '1';
    await carregarItens(id);
    if (mesaId !== id) return;
    aoVivo.emit('reinicio');
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
    mesaId = null; aoVivo.itens = [];
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
    const { data, error } = await cliente().from('registro').insert(linha).select().single();
    if (error) {
      // a mesma rolagem publicada duas vezes (duelo que ganhou outra rodada, ou duas abas abertas): atualiza a que já existe
      if (error.code === '23505' && opt.id) {
        const up = await cliente().from('registro').update({ dados }).eq('mesa_id', a.id).eq('id', opt.id).select().maybeSingle();
        if (up.data) aplicar(up.data);
        return up.data;
      }
      throw falha(error, 'Não deu para enviar agora. Tente de novo.');
    }
    aplicar(data);
    return data;
  }
  aoVivo.fala = texto => gravar('fala', { texto: String(texto).slice(0, 1500) });
  aoVivo.acao = texto => gravar('acao', { texto: String(texto).slice(0, 1500) });
  aoVivo.rolagem = (dados, opt = {}) => gravar('rolagem', dados, { origem: opt.origem, id: opt.id, quem: opt.quem, secreta: opt.secreta == null ? aoVivo.segredo : opt.secreta });
  aoVivo.revelar = async id => {
    const a = mesas.atual; if (!a) return;
    const { data, error } = await cliente().from('registro').update({ secreta: false }).eq('mesa_id', a.id).eq('id', id).select().maybeSingle();
    if (error) throw falha(error);
    if (data) aplicar(data);
  };
  aoVivo.apagar = async id => {
    const a = mesas.atual; if (!a) return;
    const { data, error } = await cliente().from('registro').update({ apagado: true }).eq('mesa_id', a.id).eq('id', id).select().maybeSingle();
    if (error) throw falha(error);
    if (data) aplicar(data); else aplicar({ mesa_id: a.id, id, apagado: true, rev: 0 });
  };
  aoVivo.desfazerApagar = async id => {
    const a = mesas.atual; if (!a) return;
    const { data } = await cliente().from('registro').update({ apagado: false }).eq('mesa_id', a.id).eq('id', id).select().maybeSingle();
    if (data) aplicar(data);
  };
  /* O mestre limpa o painel inteiro — conversa e rolagens —, para todos. As linhas ficam marcadas como apagadas (as
     antigas também, para não voltarem ao recarregar). Devolve { n, desfazer }: desfazer traz de volta exatamente as
     linhas desta limpeza (todas levam a mesma hora de mudança), e não as que alguém já tinha apagado antes. */
  aoVivo.limpar = async () => {
    const a = mesas.atual;
    if (!a || a.papel !== 'mestre') throw new Error('Só o mestre limpa a mesa ao vivo.');
    const { data, error, count } = await cliente().from('registro').update({ apagado: true }, { count: 'exact' }).eq('mesa_id', a.id).eq('apagado', false).select('id,atualizado_em');
    if (error) throw falha(error, 'Não deu para limpar agora. Tente de novo.');
    const quando = data && data[0] ? data[0].atualizado_em : null, n = count == null ? (data || []).length : count;
    if (mesaId === a.id) { aoVivo.itens = []; aoVivo.emit('reinicio'); }
    return {
      n,
      desfazer: async () => {
        if (!quando) return 0;
        const r = await cliente().from('registro').update({ apagado: false }, { count: 'exact' }).eq('mesa_id', a.id).eq('apagado', true).eq('atualizado_em', quando);
        if (r.error) throw falha(r.error, 'Não deu para desfazer agora.');
        if (mesaId === a.id) { await carregarItens(a.id); if (mesaId === a.id) aoVivo.emit('reinicio'); }
        return r.count || 0;
      },
    };
  };
  aoVivo.definirSegredo = v => {
    aoVivo.segredo = !!v && !!mesas.atual && mesas.atual.papel === 'mestre';
    if (mesas.atual) guarda.gravar('tinycats:segredo:' + mesas.atual.id, aoVivo.segredo ? '1' : null);
    aoVivo.emit('segredo', aoVivo.segredo);
  };

  /* Monta o que a mesa mostra de uma rolagem: total em destaque, uma linha de como saiu e o veredito, se houver. */
  const D = () => TC.dice;
  const semTotal = s => String(s || '').replace(/^[-−]?\d+ · /, '');
  function deResultado(k, titulo, x, check) {
    const v = check ? D().verdict(x.total, check) : null;
    return { k, titulo: titulo || '', total: x.total, resumo: semTotal(D().summary(x)), veredito: v ? v.text : null, passou: v ? v.passed : null };
  }
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
      opt.id = String(d.id || '').slice(0, 60) || undefined;
      opt.quem = null;                       // o Rolador é a mesa de dados do mestre: sai sem personagem
    } else if (origem === 'ficha') {
      opt.quem = d.pc ? aoVivo.personagem(d.pc) : null;      // a ficha de onde a rolagem saiu
      // (uma disputa diz quem venceu: o veredito vem pronto da ficha; passou = venceu quem rolou, null = empate)
      const vd = typeof d.veredito === 'string' && d.veredito.trim() ? d.veredito.trim().slice(0, 160) : null;
      dados = { k: 'ficha', titulo: String(d.quem || '').slice(0, 120), total: typeof d.total === 'number' ? d.total : null, resumo: String(d.det || '').slice(0, 600), veredito: vd, passou: vd && typeof d.passou === 'boolean' ? d.passou : null };
      opt.id = d.id ? 'f_' + String(d.id).slice(0, 50) : undefined;
    } else if (origem === 'cena' && d.kind === 'iniciativa') {
      const b = Number(d.bonus) || 0;
      dados = { k: 'iniciativa', titulo: 'Iniciativa · ' + String(d.name || '?').slice(0, 80), total: d.total, resumo: '1d20 (' + d.d + ')' + (b ? (b > 0 ? ' + ' : ' − ') + Math.abs(b) : ''), veredito: null, passou: null };
      if (d.oculto) opt.secreta = true;      // token que os jogadores não veem: a iniciativa dele fica só com o mestre
      opt.quem = d.char ? aoVivo.personagem(d.char) : null;
    } else if (origem === 'cena' && d.kind === 'atributo') {
      opt.quem = d.char ? aoVivo.personagem(d.char) : null;
      dados = { k: 'fixa', titulo: (String(d.name || '?') + ' · ' + String(d.attrNome || d.attr || '')).slice(0, 120), total: d.total, resumo: semTotal(D().summary({ mode: 'fixa', atributo: d.atributo, fixa: d.fixa, dieValue: d.d, total: d.total })), veredito: null, passou: null };
      if (d.oculto) opt.secreta = true;
    } else if (origem === 'cena' && d.kind === 'uso') {
      // um item da bolsa usado pelo token (poção, bomba…): o título e o resumo vêm prontos da cena
      opt.quem = d.char ? aoVivo.personagem(d.char) : null;
      dados = { k: 'ficha', titulo: String(d.titulo || 'Bolsa').slice(0, 120), total: typeof d.total === 'number' ? d.total : null, resumo: String(d.resumo || '').slice(0, 600), veredito: null, passou: null };
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
    personagens: ['nome', 'dono_id', 'vis', 'ordem', 'ficha', 'skills', 'estado'],
    documentos: ['dono_id', 'vis', 'dados'],
  };
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
  const remendo = { diferenca, aplicar: juntar, compor, igual, colunas: JUNTAM.slice() };
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
    const c = cols[nome] = { nome, mesa: mesas.atual.id, doMestre: mesas.atual.papel === 'mestre', linhas: new Map(), maxRev: 0, sujos: new Map(), emVoo: new Map(), rems: new Map(), remsVoo: new Map(), reler: new Set(), relendo: new Set(), apagadas: new Map(), naSaida: new Set(), tempo: new Map(), falhas: 0, morta: false, buscando: false };
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
    const falta = k => r[k] === undefined || (r[k] === null && !!l && l[k] != null);
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
     do que ainda pode ver e tira da tela o resto. (O mestre vê tudo: para ele não há o que conferir.) */
  async function dadosConferir() {
    if (!mesas.atual || mesas.atual.papel === 'mestre') return;
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
  /* Grava campos de uma linha (cria se não existir). `de` identifica quem pediu, para não receber o próprio eco.
     O estado e as skills de um personagem entram como mudança: `mudas.estado` / `mudas.skills` (o que quem pediu
     mexeu, contado a partir do que ele tinha em mãos) ou, se a coluna veio inteira em `campos`, o que ela muda na
     que está aqui. */
  function dadosGravar(nome, id, campos, de, mudas) {
    const c = abrirCol(nome);
    let l = c.linhas.get(id);
    const suj = c.sujos.get(id) || new Set();
    campos = campos || {};
    if (campos.apagado) {
      if (!l) return null;
      c.linhas.delete(id); suj.add('apagado'); c.sujos.set(id, suj); largarFilas(c, id);
      dados.emit('muda', nome, { id, apagado: true }, 'local', de);
    } else {
      const nova = !l, comMuda = nome === 'personagens' && !nova;
      if (nova) { l = { mesa_id: c.mesa, id, rev: 0, apagado: false }; suj.add('*'); suj.delete('apagado'); }
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
    return { pronta: c.pronta, todas: () => [...c.linhas.values()], pegar: id => c.linhas.get(id) || null, gravar: (id, campos, de, mudas) => dadosGravar(nome, id, campos, de, mudas), apagar: (id, de) => dadosGravar(nome, id, { apagado: true }, de) };
  };
  dados.remendo = remendo;
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
  const resumoPc = l => ({ id: l.id, nome: l.nome || 'Sem nome', av: l.ficha && aoVivo.imagemValida(l.ficha.img) ? l.ficha.img : null });
  aoVivo.personagens = () => {
    const a = mesas.atual; if (!a || !conta.usuario) return [];
    const eu = conta.usuario.id;
    return linhasPcs().filter(l => a.papel === 'mestre' || l.dono_id === eu).sort((x, y) => ((x.ordem || 0) - (y.ordem || 0)) || (x.id < y.id ? -1 : 1)).map(resumoPc);
  };
  aoVivo.personagem = id => { const l = linhasPcs().find(x => x.id === id); return l ? resumoPc(l) : null; };
  aoVivo.como = () => {
    const a = mesas.atual; if (!a) return null;
    const esc = guarda.ler('tinycats:como:' + a.id);
    if (esc === '-') return null;                                   // escolheu falar sem personagem
    const lista = aoVivo.personagens(), p = lista.find(x => x.id === esc);
    if (p) return p;
    return a.papel === 'mestre' ? null : (lista[0] || null);         // o jogador fala com o personagem dele; o mestre, como mestre
  };
  aoVivo.falarComo = id => { const a = mesas.atual; if (!a) return; guarda.gravar('tinycats:como:' + a.id, id || '-'); aoVivo.emit('como', aoVivo.como()); };
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
