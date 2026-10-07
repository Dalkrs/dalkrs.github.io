/* Tiny Cats · Árvore de Habilidades na mesa.
   Com a página aberta dentro do site e uma mesa aberta:
     · a biblioteca de árvores é da mesa: o mestre edita a original (documento "arvore:biblioteca", só dele) e os
       jogadores recebem o pacote (documento "arvore:pacote"), com as escolas secretas trancadas, sem arquivo no meio;
     · os personagens são os da mesa: as árvores equipadas, os pontos e os nódulos escolhidos ficam no personagem
       (a mesma informação que a ficha mostra na aba Skills).
   O aplicativo continua trabalhando com o documento inteiro de sempre (a variável doc) e gravando no navegador;
   este arquivo monta esse documento a partir da mesa antes de abrir, manda para a mesa o que mudou depois de cada
   gravação e aplica o que chega dos outros. Sem mesa, nada daqui age. */
const ArvoreMesa = (() => {
  'use strict';
  const LOCAL = 'urgm.arvore.v4';                 // onde o aplicativo guarda tudo sem mesa
  const TESTE = 'teste_local';                    // personagem de rascunho do mestre: não vai para a mesa
  const j = JSON.stringify;
  let st = null, P = null, D = null, ativo = false, adiado = 0, publicar = 0;
  let sombra = { bib: null, pcs: new Map() };     // o que a mesa já tem, para mandar só o que mudou

  const mestre = () => !!st && st.papel === 'mestre';
  const mestraFichas = () => { const T = window.TC && window.TC.ponte; return T && typeof T.mestra === 'function' ? T.mestra('fichas') : mestre(); };
  const meuNome = () => { const m = (st.membros || []).find(x => x.id === st.eu); return m ? m.nome : 'jogador'; };
  const lerLocal = chave => { try { const v = JSON.parse(localStorage.getItem(chave) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } };
  const dadosDe = id => { const d = D.pegar(id); return d && d.dados && typeof d.dados === 'object' ? d.dados : null; };
  const skillsDe = p => ({ arvores: p.arvores || [], pontos: p.pontos || {}, alocados: p.alocados || {} });
  const meus = () => P.todas().filter(l => mestre() || l.dono_id === st.eu).sort((a, b) => (a.ordem - b.ordem) || (a.id < b.id ? -1 : 1));
  const bibVazia = () => ({ nome: 'Árvores de Habilidade', arvores: [], cofres: [] });

  function daLinha(l, antigo) {
    const s = l.skills || {};
    return { id: l.id, nome: l.nome || 'Personagem', arvores: Array.isArray(s.arvores) ? s.arvores.slice() : [], arvoreAtual: antigo ? antigo.arvoreAtual || null : null,
      pontos: Object.assign({}, s.pontos || {}), alocados: Object.assign({}, s.alocados || {}), ordemLivre: true };
  }
  // A biblioteca que esta pessoa enxerga: o mestre, a original; o jogador, o pacote publicado.
  function bibDaMesa() {
    const b = mestre() ? dadosDe('arvore:biblioteca') : dadosDe('arvore:pacote');
    if (!b) return null;
    const c = JSON.parse(j(b));
    if (!mestre()) { delete c.formato; delete c.versao; }
    return c;
  }
  function fotografar() {
    sombra.pcs = new Map();
    for (const l of meus()) sombra.pcs.set(l.id, { nome: l.nome || '', skills: j(skillsDe(daLinha(l))) });
  }

  /* Antes de o aplicativo abrir: decide o modo e, na mesa, deixa pronto no navegador o documento montado a partir dela. */
  async function preparar() {
    if (!window.TC || !TC.ponte) return false;
    st = await TC.ponte.pronta;
    if (!TC.dados.disponivel()) return false;
    P = TC.dados.col('personagens'); D = TC.dados.col('documentos');
    await Promise.all([P.pronta, D.pronta]);
    ativo = true;
    const m = st.mesa.id;
    CHAVE_DOC = 'tinycats:arvore:' + m; CHAVE_UI = CHAVE_DOC + ':ui'; CHAVE_HIST = CHAVE_DOC + ':hist'; CHAVE_SENHAS = CHAVE_DOC + ':senhas';
    const tela = lerLocal(CHAVE_DOC) || {};
    const velhos = new Map((tela.personagens || []).map(p => [p.id, p]));
    const bibl = bibDaMesa() || (mestre() ? (tela.biblioteca || null) : null);
    const pers = meus().map(l => daLinha(l, velhos.get(l.id)));
    if (!pers.length && mestre() && velhos.get(TESTE)) pers.push(velhos.get(TESTE));
    // Mesa sem biblioteca ainda: o mestre começa com a árvore de exemplo (só sobe quando ele mexer); o jogador, vazio.
    const d = { biblioteca: bibl || (mestre() ? bibliotecaInicial() : bibVazia()), personagens: pers };
    try {
      localStorage.setItem(CHAVE_DOC, j(d));
      localStorage.removeItem(CHAVE_HIST);         // o desfazer não atravessa sessões na mesa (o documento pode ter mudado por fora)
      const u = lerLocal(CHAVE_UI) || {};
      if (!mestre()) u.modo = 'jogador';
      localStorage.setItem(CHAVE_UI, j(u));
    } catch (e) { /* sem espaço no navegador: abre do zero e a mesa continua valendo */ }
    document.documentElement.classList.add('na-mesa', mestre() ? 'papel-mestre' : 'papel-jogador');
    return true;
  }
  function falhou(e) {
    document.body.insertAdjacentHTML('afterbegin', '<div style="margin:16px;padding:14px;border:1px solid var(--perigo-borda);border-radius:8px;background:var(--perigo-fundo);color:var(--texto)" role="alert"><strong>Não deu para abrir as árvores da mesa.</strong> <span></span> <button class="btn" type="button">Tentar de novo</button></div>');
    const box = document.body.firstElementChild;
    box.querySelector('span').textContent = (e && e.message) || '';
    box.querySelector('button').onclick = () => location.reload();
  }

  /* Quando não há personagem: o mestre ganha um de rascunho (fica só neste navegador); o jogador, o dele de verdade. */
  function personagemInicial() {
    if (!ativo) return null;
    const p = personagemNovo(mestre() ? 'Rascunho (só neste navegador)' : 'Personagem de ' + meuNome(), bib());
    if (mestre()) p.id = TESTE;
    return p;
  }

  /* Depois de cada gravação no navegador: manda para a mesa só o que mudou. */
  function depoisDeSalvar() {
    if (!ativo) return;
    if (mestre()) {
      const b = bib(), jb = j(b);
      if (sombra.bib !== jb) {
        sombra.bib = jb;
        D.gravar('arvore:biblioteca', { dados: JSON.parse(jb), vis: 'mestre' });
        clearTimeout(publicar);
        publicar = setTimeout(publicarPacote, 1200);
      }
    }
    const vistos = new Set();
    doc.personagens.forEach((p, i) => {
      if (p.id === TESTE) return;
      vistos.add(p.id);
      const ant = sombra.pcs.get(p.id), sk = skillsDe(p), js = j(sk), campos = {};
      // (personagem sem dono é coisa de quem mestra as Fichas; o mestre auxiliar que mestra só a Árvore cria o dele)
      if (!ant) Object.assign(campos, { nome: p.nome, skills: sk, ficha: {}, estado: {}, dono_id: mestre() && mestraFichas() ? null : st.eu, vis: 'mestre', ordem: 5000 + i });
      else { if (ant.nome !== p.nome) campos.nome = p.nome; if (ant.skills !== js) campos.skills = sk; }
      // (as skills vão como "o que mudou desde o que esta tela tinha": o que outra pessoa mexeu nesse meio-tempo — os
      //  pontos que o mestre deu, por exemplo — não é desfeito)
      if (Object.keys(campos).length) P.gravar(p.id, campos, ant && campos.skills !== undefined ? { skills: JSON.parse(ant.skills) } : undefined);
      sombra.pcs.set(p.id, { nome: p.nome, skills: js });
    });
  }
  /* O pacote dos jogadores é montado um instante depois de cada mudança na biblioteca. Se a página fechou nesse
     instante, ele ficou para trás: o banco numera as gravações (rev), e a do pacote tem de ser a mais nova.
     Devolve true se o pacote estava para trás (e manda montar de novo). */
  function conferirPacote() {
    if (!ativo || !mestre() || !dadosDe('arvore:biblioteca')) return false;
    const lb = D.pegar('arvore:biblioteca'), lp = D.pegar('arvore:pacote');
    if (dadosDe('arvore:pacote') && (lp.rev || 0) >= (lb.rev || 0)) return false;
    publicarPacote();
    return true;
  }
  // O que os jogadores recebem: a biblioteca sem os segredos, com as escolas secretas trancadas por senha.
  async function publicarPacote() {
    if (!ativo || !mestre()) return;
    try { const r = await montarPacote(); D.gravar('arvore:pacote', { dados: r.pacote, vis: 'mesa' }); }
    catch (e) { console.warn('Não deu para publicar o pacote das árvores:', e); }
  }

  /* Quem está digitando: o cursor num campo em que algo foi escrito desde que ele ganhou o cursor. Com o cursor só
     parado num campo, ninguém está digitando — e a busca não conta em nenhum caso (ela só filtra o que aparece). */
  const eCampo = a => !!a && /^(INPUT|TEXTAREA)$/.test(a.tagName || '');
  document.addEventListener('input', e => { if (eCampo(e.target)) e.target.__mexido = true; }, true);
  document.addEventListener('focusout', e => { if (e.target) e.target.__mexido = false; }, true);
  const digitando = () => { const a = document.activeElement; return eCampo(a) && a.id !== 'busca' && !!a.__mexido; };
  /* Onde o cursor está, para devolvê-lo ao mesmo campo (ou botão) depois de redesenhar: pelo id, ou pelas classes e
     data-… do elemento (e, havendo vários iguais, pelo lugar na fila). */
  function cursorDe() {
    const a = document.activeElement, nada = () => {};
    if (!a || !/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(a.tagName || '') || typeof CSS === 'undefined' || !CSS.escape) return nada;
    let sel, i = 0;
    if (a.id) sel = '#' + CSS.escape(a.id);
    else {
      const cls = Array.from(a.classList).map(c => '.' + CSS.escape(c)).join('');
      const ds = Array.from(a.attributes).filter(x => x.name.indexOf('data-') === 0).map(x => '[' + x.name + '="' + CSS.escape(x.value) + '"]').join('');
      if (!cls && !ds) return nada;
      sel = a.tagName.toLowerCase() + cls + ds;
      i = Math.max(0, Array.prototype.indexOf.call(document.querySelectorAll(sel), a));
    }
    let ini = null, fim = null;
    try { ini = a.selectionStart; fim = a.selectionEnd; } catch (e) { /* campo sem cursor de texto */ }
    return () => {
      const l = document.querySelectorAll(sel), n = l[i] || l[0];
      if (!n || n === document.activeElement || n.disabled) return;
      n.focus({ preventScroll: true });
      if (ini != null) { try { n.setSelectionRange(ini, fim); } catch (e) { /* campo de número */ } }
    };
  }

  /* Chegou mudança da mesa (outra pessoa, outra aba, outro aparelho). */
  function remoto() {
    if (!ativo) return;
    clearTimeout(adiado);
    /* Não troca o chão de quem está digitando, nem de quem está numa janela: o que chegou espera. Com o cursor só
       parado num campo, entra na hora — senão quem deixasse o cursor num campo (o total de pontos, a busca) deixaria
       de ver o que os outros fazem até clicar fora, e mexeria numa árvore que já não é a de agora. */
    const ocupado = (typeof modalAberto === 'function' && modalAberto()) || (typeof dialogoAberto === 'function' && dialogoAberto()) || digitando();
    if (ocupado) { adiado = setTimeout(remoto, 900); return; }
    if (sujo) salvarJa();                                           // primeiro sobe o que acabou de ser feito aqui
    const visAntes = (() => { try { const a = arvoreVisivel(); return a ? a.id : null; } catch (e) { return null; } })();
    let mudou = false, trocouBib = false;
    // personagens
    const linhas = meus(), ids = new Set(linhas.map(l => l.id));
    for (const l of linhas) {
      const i = doc.personagens.findIndex(p => p.id === l.id), novo = daLinha(l, i >= 0 ? doc.personagens[i] : null), js = j(skillsDe(novo)), ant = sombra.pcs.get(l.id);
      if (ant && i >= 0 && ant.nome === novo.nome && ant.skills === js) continue;
      if (i >= 0) doc.personagens[i] = novo; else doc.personagens.push(novo);
      sombra.pcs.set(l.id, { nome: novo.nome, skills: js }); mudou = true;
    }
    for (let i = doc.personagens.length - 1; i >= 0; i--) {
      const p = doc.personagens[i];
      if (p.id === TESTE ? ids.size > 0 : !ids.has(p.id) && sombra.pcs.has(p.id)) { doc.personagens.splice(i, 1); sombra.pcs.delete(p.id); mudou = true; }
    }
    // biblioteca
    const b = bibDaMesa();
    if (b) {
      const jb = j(b);
      if (mestre() ? sombra.bib !== jb : sombra.pacote !== jb) {
        if (mestre()) sombra.bib = jb; else sombra.pacote = jb;
        doc.biblioteca = b; mudou = true; trocouBib = true;
      }
    }
    if (!mudou) return;
    const fim = () => {
      const volta = cursorDe();
      normalizarDoc(); if (trocouBib) podarTodos(); else indexar();
      garantirSelecoes();                          // (o nódulo selecionado continua selecionado, se ainda existe)
      if (mestre()) sombra.bib = j(bib());
      try { localStorage.setItem(CHAVE_DOC, j(doc)); } catch (e) { /* a mesa continua valendo */ }
      pilhaDesfazer.length = 0; pilhaRefazer.length = 0; atualizarHistorico();    // o desfazer não volta por cima do que veio de fora
      pintarTudo();
      // a câmera só se mexe se a árvore à vista passou a ser outra (a mesma árvore, mudada, continua onde a pessoa a deixou)
      const vis = (() => { try { return arvoreVisivel(); } catch (e) { return null; } })();
      if (trocouBib && (!vis || vis.id !== visAntes)) centralizar();
      desenhar();
      volta();
    };
    if (trocouBib && !mestre()) reabrirGuardadas().then(fim, fim); else fim();
  }

  /* Desfazer, dentro da mesa, só volta o que é de quem está desfazendo: o mestre editando a biblioteca volta a
     biblioteca; quem está distribuindo pontos volta o personagem aberto. O resto fica como está agora. */
  function restringir(antigo) {
    if (!ativo) return antigo;
    const agora = JSON.parse(j(doc));
    if (ui.modo === 'mestre' && mestre()) { agora.biblioteca = antigo.biblioteca; return agora; }
    const a = (antigo.personagens || []).find(p => p.id === ui.personagem), i = agora.personagens.findIndex(p => p.id === ui.personagem);
    if (a && i >= 0) agora.personagens[i] = Object.assign({}, a, { nome: agora.personagens[i].nome });
    return agora;
  }

  function depoisDeAbrir() {
    if (!ativo) return;
    fotografar();
    sombra.bib = mestre() ? (dadosDe('arvore:biblioteca') ? j(bib()) : null) : null;
    sombra.pacote = mestre() ? null : (bibDaMesa() ? j(bibDaMesa()) : null);
    // o que o aplicativo ajustou ao abrir (personagem criado, poda) sobe agora
    if (mestre() && sombra.bib === null && dadosDe('arvore:biblioteca') === null) { sombra.bib = j(bib()); oferecerLocal(); }
    depoisDeSalvar();
    // (confere de novo daqui a pouco: uma gravação feita no instante em que a página fechou pode chegar depois)
    if (!conferirPacote()) setTimeout(conferirPacote, 6000);
    P.aoMudar(remoto); D.aoMudar(l => { if (l.id === 'arvore:biblioteca' || l.id === 'arvore:pacote') remoto(); });
    if (!mestre()) reabrirGuardadas().then(r => { if (r && r.length) { normalizarDoc(); indexar(); garantirSelecoes(); pintarTudo(); desenhar(); } }, () => {});
  }
  // A mesa ainda não tem biblioteca e este navegador tem uma: oferece trazê-la.
  function oferecerLocal() {
    const local = lerLocal(LOCAL), chave = 'tinycats:arvore:oferta:' + st.mesa.id;
    const n = local && local.biblioteca && Array.isArray(local.biblioteca.arvores) ? local.biblioteca.arvores.length : 0;
    if (!n) return;
    try { if (localStorage.getItem(chave)) return; } catch (e) { /* segue */ }
    const box = document.createElement('div');
    box.className = 'mesa-oferta';
    box.innerHTML = '<span></span> <button class="btn ouro" type="button" id="ofertaSim"></button> <button class="btn" type="button" id="ofertaNao">Começar do zero</button>';
    box.querySelector('span').textContent = 'Esta mesa ainda não tem árvores. Neste navegador há ' + n + (n === 1 ? ' árvore guardada.' : ' árvores guardadas.');
    box.querySelector('#ofertaSim').textContent = n === 1 ? 'Trazer a árvore para a mesa' : 'Trazer as ' + n + ' árvores para a mesa';
    const fechar = () => { box.remove(); try { localStorage.setItem(chave, '1'); } catch (e) { /* tudo bem */ } };
    box.querySelector('#ofertaSim').onclick = () => {
      fechar();
      registrar('trazer as árvores deste navegador');
      doc.biblioteca = JSON.parse(j(local.biblioteca));
      normalizarDoc(); podarTodos(); garantirSelecoes(); selecionado = null;
      salvar(); pintarTudo(); centralizar(); desenhar();
      aviso('As árvores deste navegador agora são as da mesa. Os jogadores recebem a versão deles em instantes.', 'ok', 6000);
    };
    box.querySelector('#ofertaNao').onclick = fechar;
    document.getElementById('app').prepend(box);
  }

  return { preparar, falhou, personagemInicial, depoisDeSalvar, depoisDeAbrir, restringir, ativo: () => ativo, mestre };
})();
