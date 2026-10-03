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
  const deSessao = s => {
    const u = s && s.user;
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
    conta.usuario = null;
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
    aoVivo.parar();
    mesas.atual = { id: m.id, nome: m.nome, dono: m.dono_id === u.id, papel: eu.papel, meuNome: eu.nome, minhaCor: eu.cor, codigo, membros };
    guarda.gravar(CHAVE_MESA, id);
    mesas.emit('muda', mesas.atual);
    await aoVivo.iniciar(id);
    return mesas.atual;
  };
  mesas.fechar = () => {
    aoVivo.parar();
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
  mesas.apagar = async () => {          // o dono apaga a mesa inteira
    const a = mesas.atual; if (!a) return;
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
    recarregarMembros();
  }
  aoVivo.iniciar = async id => {
    aoVivo.parar();
    mesaId = id; maxRev = 0; aoVivo.itens = [];
    aoVivo.segredo = guarda.ler('tinycats:segredo:' + id) === '1';
    try {
      const { data, error } = await cliente().from('registro').select('*').eq('mesa_id', id).eq('apagado', false).order('criado_em', { ascending: false }).limit(200);
      if (error) throw error;
      for (const l of (data || []).reverse()) aplicar(l, true);
      const topo = await cliente().from('registro').select('rev').eq('mesa_id', id).order('rev', { ascending: false }).limit(1);
      if (topo.data && topo.data[0]) maxRev = Math.max(maxRev, topo.data[0].rev);
    } catch (e) { /* começa vazio; a leitura periódica completa depois */ }
    if (mesaId !== id) return;
    aoVivo.emit('reinicio');
    try {
      canal = cliente().channel('mesa-' + id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'registro', filter: 'mesa_id=eq.' + id }, p => { if (p.new && p.new.id) aplicar(p.new); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mesa_membros', filter: 'mesa_id=eq.' + id }, () => { clearTimeout(aoVivo._m); aoVivo._m = setTimeout(recarregarMembros, 400); })
        .subscribe(st => { const c = st === 'SUBSCRIBED'; if (c !== aoVivo.conectado) { aoVivo.conectado = c; aoVivo.emit('estado', c); if (c) buscarNovos(); } });
    } catch (e) { canal = null; }
    // Rede de segurança: sem o tempo real, lê a cada 3 s; com ele, confere a cada 30 s. A presença vai a cada 25 s.
    volta = 0;
    relogio = setInterval(() => {
      volta++;
      if (!aoVivo.conectado || volta % 10 === 0) buscarNovos();
      if (volta % 8 === 0) presenca();
    }, 3000);
    presenca();
  };
  aoVivo.parar = () => {
    clearInterval(relogio); relogio = 0;
    if (canal) { try { cliente().removeChannel(canal); } catch (e) { /* já fechado */ } canal = null; }
    mesaId = null; aoVivo.itens = [];
    if (aoVivo.conectado) { aoVivo.conectado = false; aoVivo.emit('estado', false); }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && mesaId) { buscarNovos(); presenca(); } });

  async function gravar(tipo, dados, opt = {}) {
    const a = mesas.atual; if (!a) throw new Error('Abra uma mesa primeiro.');
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
  aoVivo.rolagem = (dados, opt = {}) => gravar('rolagem', dados, { origem: opt.origem, id: opt.id, secreta: opt.secreta == null ? aoVivo.segredo : opt.secreta });
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
    } else if (origem === 'ficha') {
      dados = { k: 'ficha', titulo: String(d.quem || '').slice(0, 120), total: typeof d.total === 'number' ? d.total : null, resumo: String(d.det || '').slice(0, 600), veredito: null, passou: null };
      opt.id = d.id ? 'f_' + String(d.id).slice(0, 50) : undefined;
    } else if (origem === 'cena' && d.kind === 'iniciativa') {
      const b = Number(d.bonus) || 0;
      dados = { k: 'iniciativa', titulo: 'Iniciativa · ' + String(d.name || '?').slice(0, 80), total: d.total, resumo: '1d20 (' + d.d + ')' + (b ? (b > 0 ? ' + ' : ' − ') + Math.abs(b) : ''), veredito: null, passou: null };
      if (d.oculto) opt.secreta = true;      // token que os jogadores não veem: a iniciativa dele fica só com o mestre
    }
    if (!dados) return null;
    return aoVivo.rolagem(dados, opt);
  };

  TC.conta = conta; TC.mesas = mesas; TC.aoVivo = aoVivo; TC.erroPt = erroPt;
})();
