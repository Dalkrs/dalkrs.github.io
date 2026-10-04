/* Tiny Cats · Mapa-múndi: o aplicativo (window.Mundo).
   Guarda o mapa aberto, o desfazer, a seleção e a ferramenta; salva no navegador (sem mesa) ou na mesa (dentro da
   casca, com uma mesa aberta); manda aos jogadores só a projeção pública; e aplica o que chega de fora sem atropelar
   quem está no meio de um gesto ou digitando.
   É o último script da página: monta o App, carrega os mapas e só então chama MundoTela.iniciar e MundoPainel.iniciar.

   Na mesa, cada mapa é o documento "mundo:mapa:<id>" (só o mestre lê); o que os jogadores recebem é
   "mundo:pub:<id>" (a projeção) e "mundo:indice" (quais mapas existem para eles e qual está sendo mostrado). */
(() => {
  'use strict';
  const N = window.MundoNucleo;
  const j = JSON.stringify;
  const $ = id => document.getElementById(id);
  const CHAVE = 'tinycats:mundo:v1';                 // { atual, mapas: { [id]: Mapa } } — sem mesa
  const PRE_MAPA = 'mundo:mapa:', PRE_PUB = 'mundo:pub:', INDICE = 'mundo:indice';
  const FERRAMENTAS = ['sel', 'm', 'g', 'r', 'e', 't', 'f', 'n', 'd'];
  const MAX_DESFAZER = 100;
  const ESPERA = { local: 400, fora: 900 };
  const DEBUG = /[?&]debug(?:[=&]|$)/.test(location.search);
  // a mesma regra de id do núcleo: o que não passa nela ganharia um id novo a cada leitura
  const idValido = k => typeof k === 'string' && k.length <= 80 && /^[A-Za-z0-9_:.-]+$/.test(k) && k !== '__proto__';

  /* Monta um elemento: h('button', { class: 'btn', onclick }, 'texto', outroElemento). Texto sempre entra como texto. */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.style.cssText = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c);
    return el;
  }
  const guarda = {
    ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    gravar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  };

  /* ---------------- o App ---------------- */
  const ouvintes = {};
  let modo = 'local';                                // 'local' | 'mesa'
  let D = null;                                      // documentos da mesa (TC.dados)
  let jAtual = null;                                 // JSON do mapa aberto, para comparar sem custo
  let pilhaDesfazer = [], pilhaRefazer = [], contaPasso = 0;   // cada passo tem um número: o "Desfazer" de um aviso confere se é o dele
  let comoJog = false, cacheVista = { de: null, v: null };

  const App = {
    N,
    papel: 'mestre', naMesa: false, mesa: null, eu: null,
    mapa: null, mapas: [], mostrado: null,
    sel: [], ferramenta: 'sel',
    // opções das ferramentas; oculto = o que for criado já nasce escondido dos jogadores (para preparar um segredo
    // num mapa que eles estão vendo, sem que ele apareça no meio do caminho)
    opt: { ic: 'cidade', rumor: false, tipo: 'guerra', via: 'trilha', a: null, b: null, pincel: 'revelar', raio: 60, oculto: false },
    gesto: false,                                    // a tela liga durante um arrasto ou desenho
    salvo: { estado: 'ok', texto: '' },
    pronto: false,

    on(ev, fn) { (ouvintes[ev] = ouvintes[ev] || []).push(fn); return () => { ouvintes[ev] = (ouvintes[ev] || []).filter(f => f !== fn); }; },
    emit(ev, ...a) { for (const f of (ouvintes[ev] || []).slice()) { try { f(...a); } catch (e) { console.error(e); } } },

    // O que desenhar: o jogador vê o que recebeu; o mestre "vendo como jogador" vê a projeção do próprio mapa.
    vista() {
      if (!App.mapa) return null;
      if (App.papel !== 'mestre' || !comoJog) return App.mapa;
      if (cacheVista.de !== App.mapa) cacheVista = { de: App.mapa, v: N.projetar(App.mapa) };
      return cacheVista.v;
    },
    podeEditar() { return App.papel === 'mestre' && !comoJog && !!App.mapa; },

    /* Toda mudança no mapa passa por aqui: fn mexe num rascunho (ou devolve false para desistir); o resultado é
       normalizado e, se mudou de fato, vira um passo de desfazer e é gravado logo depois. */
    mudar(rotulo, fn) { return App.podeEditar() ? mudarMapa(rotulo, fn) : false; },
    desfazer() {
      if (!App.podeEditar() || !pilhaDesfazer.length) return false;
      const p = pilhaDesfazer.pop();
      pilhaRefazer.push({ rotulo: p.rotulo, json: jAtual, n: p.n });
      trocarConteudo(JSON.parse(p.json), p.json, { origem: 'desfazer', rotulo: p.rotulo });
      agendarGravacao();
      return true;
    },
    refazer() {
      if (!App.podeEditar() || !pilhaRefazer.length) return false;
      const p = pilhaRefazer.pop();
      pilhaDesfazer.push({ rotulo: p.rotulo, json: jAtual, n: p.n });
      trocarConteudo(JSON.parse(p.json), p.json, { origem: 'refazer', rotulo: p.rotulo });
      agendarGravacao();
      return true;
    },
    podeDesfazer() { return App.podeEditar() && pilhaDesfazer.length > 0; },
    podeRefazer() { return App.podeEditar() && pilhaRefazer.length > 0; },
    rotuloDesfazer() { return pilhaDesfazer.length ? pilhaDesfazer[pilhaDesfazer.length - 1].rotulo : ''; },
    rotuloRefazer() { return pilhaRefazer.length ? pilhaRefazer[pilhaRefazer.length - 1].rotulo : ''; },
    // o passo que o próximo desfazer (ou refazer) vai mexer: 0 = nenhum. Quem oferece "Desfazer" num aviso guarda
    // este número logo depois da mudança e só desfaz se ele ainda estiver no topo (senão desfaria outra coisa).
    passoAtual() { return pilhaDesfazer.length ? pilhaDesfazer[pilhaDesfazer.length - 1].n : 0; },
    passoRefazer() { return pilhaRefazer.length ? pilhaRefazer[pilhaRefazer.length - 1].n : 0; },

    selecionar(ids, somar = false) {
      const v = App.vista(), existe = new Set(v ? v.objs.map(o => o.id) : []);
      const lista = (Array.isArray(ids) ? ids : ids == null ? [] : [ids]).filter(id => existe.has(id));
      let nova;
      if (somar) {
        nova = App.sel.slice();
        for (const id of lista) {
          const i = nova.indexOf(id);
          if (i < 0) nova.push(id); else if (lista.length === 1) nova.splice(i, 1);     // Shift num já selecionado tira
        }
      } else nova = [...new Set(lista)];
      if (j(nova) === j(App.sel)) return;
      App.sel = nova;
      App.emit('sel', nova);
    },
    usarFerramenta(f) {
      if (!FERRAMENTAS.includes(f)) return;
      if (f !== 'sel' && !App.podeEditar()) f = 'sel';
      if (f === App.ferramenta) return;
      App.ferramenta = f;
      App.emit('ferramenta', f);
    },

    trocarMapa, criarMapa, duplicarMapa, renomearMapa, apagarMapa,
    definirImagem, urlImagem, mostrarAosJogadores, esconderMapa, publicarNaMesa,
    exportar, importar,
    salvarJa,

    // Versões mínimas: o painel troca pelas de verdade em iniciar().
    toast(texto) { console.info('[Mapa-múndi] ' + texto); },
    confirmar(o) { o = o || {}; return Promise.resolve(window.confirm([o.titulo, o.texto].filter(Boolean).join('\n\n'))); },
  };
  // "Ver como jogador": não edita enquanto isso; a tela redesenha a projeção.
  Object.defineProperty(App, 'comoJogador', {
    enumerable: true,
    get: () => comoJog,
    set(v) {
      v = !!v && App.papel === 'mestre';
      if (v === comoJog) return;
      comoJog = v;
      if (v && App.ferramenta !== 'sel') { App.ferramenta = 'sel'; App.emit('ferramenta', 'sel'); }
      podarSel();
      App.emit('vista', v);
      App.emit('muda', { origem: 'vista' });
    },
  });
  window.Mundo = App;
  if (DEBUG) window.__mundo = { App, N, get Tela() { return window.MundoTela; }, get Painel() { return window.MundoPainel; }, salvarJa, idb: () => idb };

  /* ---------------- o mapa aberto ---------------- */
  function mudarMapa(rotulo, fn) {
    if (!App.mapa || typeof fn !== 'function') return false;
    let rasc = N.copia(App.mapa), r;
    try { r = fn(rasc); } catch (e) { console.error(e); App.toast('Não deu para fazer isso agora.'); return false; }
    if (r === false) return false;
    if (r && typeof r === 'object' && Array.isArray(r.objs)) rasc = r;              // fn que devolve o mapa pronto também vale
    const novo = N.normalizarMapa(rasc);
    novo.id = App.mapa.id;                                                         // o id do mapa não muda por aqui
    const jn = j(novo);
    if (jn === jAtual) return false;                                               // nada mudou: nem passo, nem gravação
    pilhaDesfazer.push({ rotulo: String(rotulo || ''), json: jAtual, n: ++contaPasso });
    if (pilhaDesfazer.length > MAX_DESFAZER) pilhaDesfazer.shift();
    pilhaRefazer = [];
    trocarConteudo(novo, jn, { origem: 'local', rotulo: String(rotulo || '') });
    agendarGravacao();
    return true;
  }
  function trocarConteudo(novo, jn, info) {
    const antes = App.mapa;
    App.mapa = novo; jAtual = jn;
    podarSel();
    if (!antes || !novo || antes.nome !== novo.nome || antes.oculto !== novo.oculto) { if (atualizarLista()) App.emit('mapas', App.mapas); }
    App.emit('muda', info);
  }
  // Abre outro mapa (ou nenhum): desfazer e seleção recomeçam.
  function abrir(m, emitir = true) {
    App.mapa = m; jAtual = m ? j(m) : null;
    pilhaDesfazer = []; pilhaRefazer = [];
    const tinhaSel = App.sel.length > 0;
    App.sel = [];
    // a "sombra" é o que está guardado deste mapa agora: a próxima gravação compara com ela para ver se outra aba
    // ou outro aparelho mexeu nele nesse meio-tempo
    if (m && App.papel === 'mestre') {
      if (modo === 'local') { const cru = lerLocal().mapas[m.id]; sombraLocal = cru ? j(N.normalizarMapa(Object.assign({}, cru, { id: m.id }))) : null; }
      else { const d = docMapa(m.id); if (d) sombraDoc.set(m.id, j(d)); }
    }
    if (m) lembrarAtual(m.id);
    atualizarLista();
    if (!emitir) return;
    if (tinhaSel) App.emit('sel', App.sel);
    App.emit('mapas', App.mapas);
    App.emit('muda', { origem: 'troca' });
  }
  function podarSel() {
    if (!App.sel.length) return;
    const v = App.vista(), existe = new Set(v ? v.objs.map(o => o.id) : []);
    const nova = App.sel.filter(id => existe.has(id));
    if (nova.length !== App.sel.length) { App.sel = nova; App.emit('sel', nova); }
  }
  function resumo(d, id) {
    const n = N.normalizarMapa({ nome: d && d.nome, oculto: d && d.oculto });       // só o nome e o "escondido", do jeito normalizado
    return { id, nome: n.nome, oculto: n.oculto };
  }
  // A lista do seletor de mapas. O mapa aberto vale como está agora (pode ainda não ter sido gravado).
  function atualizarLista() {
    let lista;
    if (modo === 'local') {
      const est = lerLocal();
      for (const [id, m] of pendentes) est.mapas[id] = m;                        // os que não couberam no navegador
      lista = Object.keys(est.mapas).map(id => resumo(est.mapas[id], id));
    }
    else if (App.papel === 'mestre') lista = docsMapas().map(l => resumo(l.dados, l.id.slice(PRE_MAPA.length)));
    else lista = lerIndice().mapas.map(m => ({ id: m.id, nome: m.nome, oculto: false }));
    if (App.mapa && App.papel === 'mestre') {
      const i = lista.findIndex(x => x.id === App.mapa.id), r = { id: App.mapa.id, nome: App.mapa.nome, oculto: App.mapa.oculto };
      if (i >= 0) lista[i] = r; else lista.push(r);
    }
    if (App.papel === 'mestre') lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || (a.id < b.id ? -1 : 1));
    const mudou = j(lista) !== j(App.mapas);
    App.mapas = lista;
    return mudou;
  }
  function carregarMapa(id) {
    if (modo === 'local') {
      if (pendentes.has(id)) return N.copia(pendentes.get(id));                    // a versão daqui, que ainda não coube
      const est = lerLocal();
      return est.mapas[id] ? N.normalizarMapa(Object.assign({}, est.mapas[id], { id })) : null;
    }
    return App.papel === 'mestre' ? docMapa(id) : docPub(id);
  }
  function lembrarAtual(id) {
    if (App.papel !== 'mestre') return;
    if (modo === 'mesa') { guarda.gravar('tinycats:mundo:atual:' + App.mesa.id, id); return; }
    const est = lerLocal();
    if (est.atual === id || !est.mapas[id]) return;
    est.atual = id;
    gravarEstado(est);
  }

  /* ---------------- trocar, criar, apagar ---------------- */
  function trocarMapa(id) {
    if (App.mapa && App.mapa.id === id) return true;
    salvarJa();
    const m = id ? carregarMapa(id) : null;
    if (!m) {
      App.toast(App.papel === 'mestre' ? 'Este mapa não existe mais.' : 'Este mapa ainda não chegou. Tente de novo em instantes.');
      if (atualizarLista()) App.emit('mapas', App.mapas);
      return false;
    }
    abrir(m);
    return true;
  }
  /* Põe um mapa novo na coleção (navegador ou mesa) e abre. Na mesa, o que entra (criado, importado, duplicado) começa
     escondido dos jogadores: só vai para eles com o clique em "Mostrar aos jogadores". O "Desfazer" de um mapa
     apagado (esconder = false) devolve o mapa como ele era. */
  function adicionarMapa(m, esconder = true) {
    salvarJa();
    if (modo === 'mesa' && esconder) m.oculto = true;
    let gravou = true;
    if (modo === 'local') {
      const est = lerLocal();
      est.mapas[m.id] = m; est.atual = m.id;
      gravou = gravarEstado(est);
      if (!gravou) pendentes.set(m.id, m);                                      // fica na tela; o aviso de espaço já saiu
    } else {
      gravarDocMesa(PRE_MAPA + m.id, { dados: N.copia(m), vis: 'mestre' });
      sombraDoc.set(m.id, j(m));
      tirarOferta();
    }
    abrir(m);
    if (modo === 'mesa') { sincronizarPub(m.id); sincronizarIndice(); }
    if (gravou) marcarSalvo('ok', modo === 'local' ? 'Salvo neste navegador' : 'Salvo na mesa');
    return m;
  }
  const avisoEscondido = () => (modo === 'mesa' ? ' Está escondido dos jogadores até você mostrar.' : '');
  function criarMapa(nome, o) {
    if (App.papel !== 'mestre') return null;
    o = o || {};
    return adicionarMapa(N.mapaNovo(nome, { larg: o.larg, alt: o.alt }));
  }
  function duplicarMapa(id) {
    if (App.papel !== 'mestre') return null;
    salvarJa();
    const m = carregarMapa(id || (App.mapa && App.mapa.id));
    if (!m) return null;
    const c = N.normalizarMapa(Object.assign(N.copia(m), { id: N.novoId('mp'), nome: m.nome + ' (cópia)' }));
    adicionarMapa(c);
    App.toast('Mapa duplicado: ' + c.nome + '.' + avisoEscondido());
    return c;
  }
  function renomearMapa(nome) {
    const n = String(nome == null ? '' : nome).trim();
    if (!n) return false;
    return App.mudar('renomear o mapa', m => { m.nome = n; });
  }
  // A confirmação é do painel; aqui o mapa sai e o aviso oferece desfazer (traz de volta igual).
  function apagarMapa(id) {
    if (App.papel !== 'mestre') return false;
    id = id || (App.mapa && App.mapa.id);
    if (!id) return false;
    salvarJa();
    const m = carregarMapa(id);
    if (!m) return false;
    if (modo === 'local') {
      const est = lerLocal();
      delete est.mapas[id]; pendentes.delete(id);
      if (est.atual === id) est.atual = null;
      gravarEstado(est);
    } else {
      apagarDocMesa(PRE_MAPA + id);
      sombraDoc.delete(id);
      if (App.mostrado === id) App.mostrado = null;
    }
    if (App.mapa && App.mapa.id === id) {
      App.mapa = null; jAtual = null;
      atualizarLista();
      const prox = App.mapas[0] ? carregarMapa(App.mapas[0].id) : null;
      abrir(prox);
    } else if (atualizarLista()) App.emit('mapas', App.mapas);
    if (modo === 'mesa') { sincronizarPub(id); sincronizarIndice(); soltarImagemDepois(m); }
    App.toast('Mapa apagado: ' + m.nome, 'Desfazer', () => restaurarMapa(m), 10000);
    return true;
  }
  function restaurarMapa(m) {
    if (carregarMapa(m.id)) { trocarMapa(m.id); return; }
    restaurados.add(m.id);
    adicionarMapa(N.copia(m), false);
    App.toast('Mapa de volta: ' + m.nome);
  }

  /* ---------------- gravação ---------------- */
  let tLocal = 0, sombraLocal = null, avisouEspaco = false;
  const pendentes = new Map();                       // sem mesa: mapas que não couberam no navegador (id → Mapa)
  function marcarSalvo(estado, texto) {
    App.salvo = { estado, texto };
    const el = $('salvo');
    if (el) {
      el.textContent = texto;
      el.classList.toggle('ruim', estado === 'erro');
      el.title = estado === 'erro' ? 'O que está na tela continua aqui. Exporte uma cópia (.json) para não perder nada.' : '';
    }
    App.emit('salvo', App.salvo);
  }
  /* Sem mesa, grava no navegador um pouco depois (várias mudanças seguidas viram uma gravação só). Na mesa, o mapa e
     a projeção vão para a casca na hora: ela mesma junta as escritas de cada documento e esvazia a fila quando a
     página sai. Esperar aqui perderia a última mudança ao recarregar ou fechar a aba (a casca sai junto com esta
     moldura e não recebe mais nada) — inclusive um "Esconder dos jogadores" recém-marcado. */
  function agendarGravacao() {
    if (App.papel !== 'mestre' || !App.mapa) return;
    marcarSalvo('salvando', 'Salvando…');
    if (modo === 'local') { clearTimeout(tLocal); tLocal = setTimeout(gravarLocal, ESPERA.local); return; }
    gravarDoc();
    publicar();
  }
  // Manda agora o que estava esperando (antes de trocar de mapa, ao sair da página…). Sem espaço no navegador,
  // tenta de novo: pode ter sobrado espaço.
  function salvarJa() {
    if (tLocal || (modo === 'local' && pendentes.size)) { clearTimeout(tLocal); gravarLocal(); }
  }

  /* ---- sem mesa: no navegador ---- */
  function lerLocal() {
    let v = null;
    try { v = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { v = null; }
    const mapas = v && v.mapas && typeof v.mapas === 'object' && !Array.isArray(v.mapas) ? v.mapas : {};
    let atual = v && typeof v.atual === 'string' ? v.atual : null;
    for (const k of Object.keys(mapas)) {
      if (!mapas[k] || typeof mapas[k] !== 'object') { delete mapas[k]; continue; }
      if (idValido(k)) continue;
      // chave que não serve de id (dado antigo, lixo): ganha um id derivado dela, sempre o mesmo — assim o mapa não
      // aparece em dobro nem ganha uma cópia nova a cada gravação, e "Apagar" o encontra (a próxima gravação conserta)
      let h = 0;
      for (const c of k) h = (h * 31 + c.codePointAt(0)) >>> 0;
      let nk = 'mp_' + h.toString(36);
      while (mapas[nk] || !idValido(nk)) nk += '_';
      mapas[nk] = mapas[k]; delete mapas[k];
      if (atual === k) atual = nk;
    }
    return { atual, mapas };
  }
  function gravarEstado(est) {
    for (const [id, m] of pendentes) est.mapas[id] = m;                         // o que não coube antes tenta junto
    try {
      localStorage.setItem(CHAVE, j(est));
      avisouEspaco = false;
      pendentes.clear();
      return true;
    } catch (e) {
      marcarSalvo('erro', 'Sem espaço no navegador');
      if (!avisouEspaco) {
        avisouEspaco = true;
        App.toast('O navegador ficou sem espaço para guardar o mapa. O que está na tela continua aqui; exporte uma cópia (.json) para não perder nada.', 'Exportar', () => App.exportar(), 12000);
      }
      return false;
    }
  }
  // Relê o que está guardado e troca só o mapa aberto: outra aba pode ter mexido em outro mapa nesse meio-tempo.
  // E se mexeu neste (ou o apagou), não grava por cima às cegas: junta as duas mudanças (ou deixa apagado).
  function gravarLocal() {
    tLocal = 0;
    if (!App.mapa || App.papel !== 'mestre') return;
    const est = lerLocal(), id = App.mapa.id, cru = est.mapas[id];
    if (!cru && sombraLocal != null && !pendentes.has(id)) { sumiuOAtual('Este mapa foi apagado em outra aba. A última mudança daqui não foi gravada.'); return; }
    if (cru && sombraLocal != null) {
      const deles = N.normalizarMapa(Object.assign({}, cru, { id })), jd = j(deles);
      if (jd !== sombraLocal && jd !== jAtual) juntarDeFora(sombraLocal, deles, 'O mapa mudou em outra aba enquanto você mexia aqui. As duas mudanças foram juntadas; o desfazer recomeça daqui.');
      sombraLocal = jd;
    }
    pendentes.set(id, App.mapa); est.atual = id;                               // sem espaço, fica aqui na memória até caber
    if (gravarEstado(est)) { sombraLocal = jAtual; marcarSalvo('ok', 'Salvo neste navegador'); }
  }

  /* ---- na mesa ---- */
  const sombraDoc = new Map(), sombraPub = new Map(), restaurados = new Set();
  let sombraIndice = null;
  // O jogador nunca grava nada na mesa: as duas portas de escrita conferem o papel.
  function gravarDocMesa(id, campos) { if (modo === 'mesa' && App.papel === 'mestre' && D) D.gravar(id, campos); }
  function apagarDocMesa(id) { if (modo === 'mesa' && App.papel === 'mestre' && D && D.pegar(id)) D.apagar(id); }
  const dadosDoc = l => (l && !l.apagado && l.dados && typeof l.dados === 'object' && !Array.isArray(l.dados) ? l.dados : null);
  function docsMapas() { return D ? D.todas().filter(l => typeof l.id === 'string' && l.id.startsWith(PRE_MAPA) && idValido(l.id.slice(PRE_MAPA.length)) && dadosDoc(l)) : []; }
  function docMapa(id) { const d = D ? dadosDoc(D.pegar(PRE_MAPA + id)) : null; return d ? N.normalizarMapa(Object.assign({}, d, { id })) : null; }
  function docPub(id) { const d = D ? dadosDoc(D.pegar(PRE_PUB + id)) : null; return d ? N.normalizarMapa(Object.assign({}, d, { id })) : null; }
  function normIndice(d) {
    const ok = typeof d === 'object' && d && Array.isArray(d.mapas) ? d.mapas : [];
    const mapas = ok.filter(m => m && idValido(m.id)).map(m => ({ id: m.id, nome: typeof m.nome === 'string' && m.nome.trim() ? m.nome : 'Mapa sem nome' }));
    const mostrado = d && typeof d.mostrado === 'string' && mapas.some(m => m.id === d.mostrado) ? d.mostrado : null;
    return { mapas, mostrado };
  }
  function lerIndice() { return normIndice(D ? dadosDoc(D.pegar(INDICE)) : null); }

  /* Antes de gravar, confere se outro aparelho mexeu neste mapa desde a última vez (a mudança de fora fica esperando
     enquanto alguém digita ou arrasta aqui). Gravar por cima às cegas desfaria o que foi feito lá — um "Esconder dos
     jogadores" voltaria atrás, um mapa apagado voltaria à mesa. Então junta as duas mudanças, ou deixa apagado. */
  function gravarDoc() {
    const m = App.mapa;
    if (!m || App.papel !== 'mestre' || modo !== 'mesa') return;
    const id = m.id, base = sombraDoc.get(id), cru = dadosDoc(D.pegar(PRE_MAPA + id));
    if (!cru && base !== undefined) { sombraDoc.delete(id); sumiuOAtual('Este mapa foi apagado em outro aparelho. A última mudança daqui não foi gravada.'); return; }
    if (cru && j(cru) !== base) {
      const deles = docMapa(id), jd = j(deles);
      if (jd !== base && jd !== jAtual) juntarDeFora(base, deles, 'O mapa mudou em outro aparelho enquanto você mexia aqui. As duas mudanças foram juntadas; o desfazer recomeça daqui.');
      sombraDoc.set(id, jd);
    }
    if (sombraDoc.get(id) !== jAtual) {
      gravarDocMesa(PRE_MAPA + id, { dados: JSON.parse(jAtual), vis: 'mestre' });
      sombraDoc.set(id, jAtual);
    }
    marcarSalvo('ok', 'Salvo na mesa');
  }
  function publicar() {
    if (App.papel !== 'mestre') return;
    if (App.mapa) sincronizarPub(App.mapa.id);
    sincronizarIndice();
  }
  // Escondido no que está gravado na mesa (outro aparelho pode ter escondido agora há pouco): esconder vence.
  function escondidoNaMesa(id) { const d = D ? dadosDoc(D.pegar(PRE_MAPA + id)) : null; return !!d && resumo(d, id).oculto; }
  // A projeção de um mapa: só quando mudou desde a última vez; mapa escondido não tem projeção nenhuma.
  function sincronizarPub(id) {
    if (modo !== 'mesa' || App.papel !== 'mestre') return;
    const m = App.mapa && App.mapa.id === id ? App.mapa : docMapa(id);
    const tem = !!dadosDoc(D.pegar(PRE_PUB + id));
    if (!m || m.oculto || escondidoNaMesa(id)) { if (tem) apagarDocMesa(PRE_PUB + id); sombraPub.delete(id); return; }
    const p = N.projetar(m);
    // atalhos que os jogadores recebem: para mapa escondido, nenhum (nem o nome dele); para cena, sem o nome dela
    const abertos = new Set(App.mapas.filter(x => !x.oculto).map(x => x.id));
    for (const o of p.objs) {
      if (!o.liga) continue;
      if (o.liga.t === 'mapa' && !abertos.has(o.liga.id)) o.liga = null;
      else if (o.liga.t === 'cena') o.liga = { t: 'cena', id: o.liga.id, nome: '' };
    }
    const jp = j(p);
    if (tem && sombraPub.get(id) === jp) return;
    gravarDocMesa(PRE_PUB + id, { dados: p, vis: 'mesa' });
    sombraPub.set(id, jp);
  }
  function indiceAgora() {
    atualizarLista();
    const mapas = App.mapas.filter(m => !m.oculto).map(m => ({ id: m.id, nome: m.nome }));
    return { mapas, mostrado: mapas.some(m => m.id === App.mostrado) ? App.mostrado : null };
  }
  // O índice que está na mesa mudou em outro aparelho desde a última vez (o mapa mostrado, por exemplo): vale o de lá.
  function adotarIndice() {
    const d = D ? dadosDoc(D.pegar(INDICE)) : null;
    if (!d) return;
    const idx = normIndice(d), ji = j(idx);
    if (ji === sombraIndice) return;
    sombraIndice = ji;
    if (idx.mostrado !== App.mostrado) { App.mostrado = idx.mostrado; App.emit('mapas', App.mapas); }
  }
  // Compara com o índice que está na mesa, não só com o que este aparelho gravou por último.
  function sincronizarIndice() {
    if (modo !== 'mesa' || App.papel !== 'mestre') return;
    adotarIndice();
    const idx = indiceAgora(), ji = j(idx), d = dadosDoc(D.pegar(INDICE));
    if (d && j(normIndice(d)) === ji) { sombraIndice = ji; return; }
    if (!d && !idx.mapas.length) return;                                 // mesa sem mapas públicos e sem índice: nada a dizer
    gravarDocMesa(INDICE, { dados: idx, vis: 'mesa' });
    sombraIndice = ji;
  }
  // Imagem de um mapa apagado: sai da pasta da mesa depois que o "Desfazer" passou e se nenhum outro mapa a usa.
  function soltarImagemDepois(m) {
    const url = m.img && m.img.url;
    if (!url || !/^https?:/.test(url) || !window.TC || !TC.arquivos) return;
    restaurados.delete(m.id);
    setTimeout(() => {
      if (restaurados.has(m.id) || docMapa(m.id)) return;
      if (docsMapas().some(l => l.dados.img && l.dados.img.url === url)) return;
      try { TC.arquivos.apagar(url); } catch (e) { /* fica ocupando espaço; tudo bem */ }
    }, 20000);
  }

  /* ---------------- mostrar e esconder (mesa) ---------------- */
  function esconderMapa(id, oculto = true) {
    if (App.papel !== 'mestre') return false;
    id = id || (App.mapa && App.mapa.id);
    oculto = !!oculto;
    if (!id) return false;
    if (App.mapa && App.mapa.id === id) {
      if (App.mapa.oculto !== oculto) mudarMapa(oculto ? 'esconder o mapa dos jogadores' : 'mostrar o mapa aos jogadores', m => { m.oculto = oculto; });
    } else {
      const m = carregarMapa(id);
      if (!m) return false;
      if (m.oculto !== oculto) {
        m.oculto = oculto;
        if (modo === 'local') { if (pendentes.has(id)) pendentes.set(id, m); const est = lerLocal(); est.mapas[id] = m; gravarEstado(est); }
        else { gravarDocMesa(PRE_MAPA + id, { dados: m, vis: 'mestre' }); sombraDoc.set(id, j(m)); }
      }
    }
    if (oculto && App.mostrado === id) App.mostrado = null;
    atualizarLista();
    // esconder vale na hora, sem esperar. Os outros mapas também conferem a projeção: um atalho para este mapa
    // aparece ou some para os jogadores junto com ele.
    if (modo === 'mesa') { salvarJa(); for (const x of App.mapas) sincronizarPub(x.id); sincronizarIndice(); }
    atualizarLista();
    App.emit('mapas', App.mapas);
    return true;
  }
  // id null = parar de mostrar. Mostrar um mapa escondido também o tira do esconderijo (é o clique explícito do mestre).
  function mostrarAosJogadores(id) {
    if (App.papel !== 'mestre' || modo !== 'mesa') return false;
    if (id === undefined) id = App.mapa && App.mapa.id;
    if (id) {
      const item = App.mapas.find(m => m.id === id);
      if (!item) return false;
      if (item.oculto) esconderMapa(id, false);
    }
    adotarIndice();                                                       // o que outro aparelho mostrou fica para trás
    const antes = App.mostrado;
    App.mostrado = id || null;
    if (id) sincronizarPub(id);
    sincronizarIndice();
    App.emit('mapas', App.mapas);
    const item = id && App.mapas.find(m => m.id === id);
    if (item) App.toast('Os jogadores agora veem: ' + item.nome);
    else {
      // parar de mostrar não esconde: quem já está com o mapa aberto continua vendo (e recebendo o que mudar nele)
      const aberto = antes && App.mapas.find(m => m.id === antes && !m.oculto);
      if (aberto) App.toast('Nenhum mapa está sendo mostrado. "' + aberto.nome + '" continua aberto para os jogadores; para tirar da vista deles, esconda.', 'Esconder', () => esconderMapa(aberto.id, true), 12000);
      else App.toast('Nenhum mapa está sendo mostrado aos jogadores.');
    }
    return true;
  }
  function publicarNaMesa(titulo, resumo, secreta) {
    if (!App.naMesa || !window.TC || !TC.ponte) return false;
    TC.ponte.publicar('mundo', { titulo: String(titulo || 'Mapa-múndi').slice(0, 120), resumo: String(resumo || '').slice(0, 600), secreta: !!secreta });
    return true;
  }

  /* ---------------- juntar duas mudanças no mesmo mapa ---------------- */
  /* Três vias: base = o que este aparelho viu guardado por último; meu = o mapa daqui; deles = o que está guardado
     agora. Campo que só um lado mudou fica com a mudança desse lado; os dois mudaram: fica o daqui, mas "esconder"
     de qualquer lado vence. Objeto ou facção apagado de um lado sai; os novos dos dois lados ficam. Pinceladas de
     névoa dos dois lados ficam todas (as de lá por último). */
  const igual = (a, b) => j(a) === j(b);
  function tresVias(b, m, d, k) {
    if (igual(m, d)) return m;
    if (b !== undefined && igual(m, b)) return d;
    if (b !== undefined && igual(d, b)) return m;
    return k === 'oculto' || k === 'oculta' ? !!(m || d) : m;
  }
  function juntarCampos(b, m, d) {
    const r = {};
    for (const k of new Set(Object.keys(m).concat(Object.keys(d)))) r[k] = tresVias(b ? b[k] : undefined, m[k], d[k], k);
    return r;
  }
  function juntarLista(lb, lm, ld) {
    const B = new Map((lb || []).map(x => [x.id, x])), Dl = new Map(ld.map(x => [x.id, x])), M = new Set(lm.map(x => x.id)), r = [];
    for (const x of lm) {
      const b = B.get(x.id), d = Dl.get(x.id);
      if (b && !d) continue;                                              // apagado lá
      r.push(d ? juntarCampos(b, x, d) : x);
    }
    for (const d of ld) if (!M.has(d.id) && !B.has(d.id)) r.push(d);     // novo de lá (o que saiu daqui fica fora)
    return r;
  }
  function juntarOps(b, m, d) {
    if (igual(m, d)) return m;
    b = b || [];
    const resto = x => (x.length >= b.length && igual(x.slice(0, b.length), b) ? x.slice(b.length) : null);
    const rm = resto(m), rd = resto(d);
    if (rm && rd) return b.concat(rm, rd);
    if (rd) return m.concat(rd);
    if (rm) return d.concat(rm);
    return m;
  }
  function juntar(base, meu, deles) {
    const r = juntarCampos(base, meu, deles);
    r.objs = juntarLista(base && base.objs, meu.objs, deles.objs);
    r.faccoes = juntarLista(base && base.faccoes, meu.faccoes, deles.faccoes);
    const nb = base && base.nevoa;
    r.nevoa = { on: tresVias(nb ? nb.on : undefined, meu.nevoa.on, deles.nevoa.on, 'on'), ops: juntarOps(nb && nb.ops, meu.nevoa.ops, deles.nevoa.ops) };
    return N.normalizarMapa(r);
  }

  /* ---------------- mudança de fora ---------------- */
  /* Outra aba, outro aparelho do mestre ou (para o jogador) o mestre. Nunca no meio de um gesto nem com um campo de
     texto em foco: adia e tenta de novo. Ao aplicar, relê o estado mais novo (não o que chegou primeiro). */
  let adiado = 0;
  function ocupado() {
    if (App.gesto) return true;
    const a = document.activeElement;
    if (!a || a === document.body) return false;
    if (a.isContentEditable || a.tagName === 'TEXTAREA') return true;
    return a.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|file|range)$/i.test(a.type || '');
  }
  function deFora(ms = 60) { clearTimeout(adiado); adiado = setTimeout(verDeFora, ms); }
  function verDeFora() {
    adiado = 0;
    if (ocupado()) { adiado = setTimeout(verDeFora, ESPERA.fora); return; }
    if (modo === 'local') conferirLocal();
    else if (App.papel === 'mestre') conferirMestre();
    else conferirJogador();
  }
  function aplicarDeFora(novo, jn, aviso) {
    const perdeu = pilhaDesfazer.length > 0;
    pilhaDesfazer = []; pilhaRefazer = [];
    trocarConteudo(novo, jn, { origem: 'fora' });
    if (aviso && perdeu) App.toast(aviso + ' O desfazer recomeça daqui.');
  }
  // Mudança de fora com mudança daqui ainda por gravar: junta as duas no mapa aberto (o desfazer recomeça).
  function juntarDeFora(base, deles, aviso) {
    const junto = juntar(base ? JSON.parse(base) : null, App.mapa, deles);
    junto.id = App.mapa.id;
    pilhaDesfazer = []; pilhaRefazer = [];
    trocarConteudo(junto, j(junto), { origem: 'fora' });
    App.toast(aviso);
  }
  function sumiuOAtual(aviso) {
    clearTimeout(tLocal); tLocal = 0;                                     // o que esperava para subir era do mapa que sumiu
    if (App.mapa) pendentes.delete(App.mapa.id);
    App.mapa = null; jAtual = null;
    atualizarLista();
    abrir(App.mapas[0] ? carregarMapa(App.mapas[0].id) : null);
    App.toast(aviso);
  }
  function conferirLocal() {
    const mudouLista = atualizarLista();
    if (!App.mapa) {
      if (App.mapas.length) abrir(carregarMapa(App.mapas[0].id));
      else if (mudouLista) App.emit('mapas', App.mapas);
      return;
    }
    const est = lerLocal(), cru = est.mapas[App.mapa.id];
    if (!cru) { if (sombraLocal != null) sumiuOAtual('Este mapa foi apagado em outra aba.'); return; }   // sem sombra: ainda não coube aqui
    if (mudouLista) App.emit('mapas', App.mapas);
    const m = N.normalizarMapa(Object.assign({}, cru, { id: App.mapa.id })), jm = j(m);
    if (jm === sombraLocal || jm === jAtual) { sombraLocal = jm; return; }
    if (tLocal || pendentes.has(App.mapa.id)) { clearTimeout(tLocal); gravarLocal(); return; }   // há mudança daqui por gravar: junta
    sombraLocal = jm;
    aplicarDeFora(m, jm, 'O mapa mudou em outra aba.');
    marcarSalvo('ok', 'Salvo neste navegador');
  }
  function conferirMestre() {
    adotarIndice();
    if (docsMapas().length) tirarOferta();
    const mudouLista = atualizarLista();
    if (!App.mapa) {
      if (App.mapas.length) abrir(carregarMapa(App.mapas[0].id));
      else if (mudouLista) App.emit('mapas', App.mapas);
      return;
    }
    const id = App.mapa.id, m = docMapa(id);
    if (!m) {
      if (sombraDoc.has(id)) { sombraDoc.delete(id); sumiuOAtual('Este mapa foi apagado em outro aparelho.'); }
      return;                                                             // ainda não subiu: é novo daqui
    }
    if (mudouLista) App.emit('mapas', App.mapas);
    const jm = j(m);
    if (jm === sombraDoc.get(id) || jm === jAtual) { sombraDoc.set(id, jm); return; }
    sombraDoc.set(id, jm);                                                // o daqui já foi gravado na hora: o de lá é o mais novo
    aplicarDeFora(m, jm, 'O mapa mudou em outro aparelho.');
    marcarSalvo('ok', 'Salvo na mesa');
  }
  // O jogador segue o índice: se o mestre mostra outro mapa, troca e avisa; o conteúdo chega pela projeção.
  function conferirJogador() {
    const idx = lerIndice();
    const lista = idx.mapas.map(m => ({ id: m.id, nome: m.nome, oculto: false }));
    let alvo = App.mapa ? App.mapa.id : null, aviso = null;
    if (idx.mostrado && idx.mostrado !== App.mostrado) {
      alvo = idx.mostrado;
      if (!App.mapa || App.mapa.id !== alvo) aviso = 'O mestre mostrou: ' + (lista.find(m => m.id === alvo) || {}).nome;
    }
    if (!alvo || !lista.some(m => m.id === alvo)) alvo = idx.mostrado || (lista[0] && lista[0].id) || null;
    const pub = alvo ? docPub(alvo) : null;
    if (alvo && !pub) {
      // o índice chegou antes da projeção: espera por ela sem fechar o que está aberto (a troca e o aviso vêm junto com ela)
      if (j(lista) !== j(App.mapas)) { App.mapas = lista; App.emit('mapas', App.mapas); }
      if (App.mapa && !lista.some(m => m.id === App.mapa.id)) abrir(null);
      return;
    }
    const mudouLista = j(lista) !== j(App.mapas) || idx.mostrado !== App.mostrado;
    App.mapas = lista; App.mostrado = idx.mostrado;
    if (mudouLista) App.emit('mapas', App.mapas);
    if (!pub) { if (App.mapa) abrir(null); return; }
    const jp = j(pub);
    if (App.mapa && App.mapa.id === alvo) { if (jp !== jAtual) aplicarDeFora(pub, jp, null); return; }
    abrir(pub);
    if (aviso) App.toast(aviso);
  }

  /* ---------------- mesa sem mapas: trazer os deste navegador ---------------- */
  let oferta = null;
  function tirarOferta() { if (oferta) { oferta.remove(); oferta = null; } }
  function oferecerLocais() {
    const est = lerLocal(), ids = Object.keys(est.mapas), n = ids.length, chave = 'tinycats:mundo:oferta:' + App.mesa.id;
    if (!n || guarda.ler(chave)) return;
    const recusar = () => { tirarOferta(); guarda.gravar(chave, '1'); };
    const sim = h('button', { type: 'button', class: 'btn pri sm', text: n === 1 ? 'Trazer o mapa deste navegador para a mesa' : 'Trazer os ' + n + ' mapas deste navegador para a mesa' });
    const nao = h('button', { type: 'button', class: 'btn sm', text: 'Começar do zero', onclick: recusar });
    const txt = h('span', { text: 'Esta mesa ainda não tem mapas. Neste navegador há ' + (n === 1 ? '1 mapa guardado.' : n + ' mapas guardados.') + ' Na mesa, chegam escondidos dos jogadores.' });
    sim.addEventListener('click', async () => {
      sim.disabled = nao.disabled = true;
      try {
        await trazerLocais(est, (i, total) => { sim.textContent = 'Trazendo… (' + i + ' de ' + total + ')'; });
        tirarOferta();
        App.toast(n === 1 ? 'O mapa deste navegador agora é da mesa, escondido dos jogadores até você mostrar.' : 'Os ' + n + ' mapas deste navegador agora são da mesa, escondidos dos jogadores até você mostrar.');
      } catch (e) {
        console.warn(e);
        sim.disabled = nao.disabled = false;
        sim.textContent = n === 1 ? 'Tentar de novo' : 'Tentar trazer de novo';
        App.toast((e && e.message) || 'Não deu para trazer os mapas agora. Nada foi mudado na mesa.');
      }
    });
    oferta = h('div', { class: 'oferta', role: 'region', 'aria-label': 'Mapas deste navegador',
      style: 'flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:8px 12px;background:var(--lamp-soft);border-bottom:1px solid var(--line);color:var(--fg);font-size:13.5px' }, txt, sim, nao);
    const work = document.querySelector('.work');
    if (work && work.parentNode) work.parentNode.insertBefore(oferta, work); else document.body.prepend(oferta);
  }
  // Sobe as imagens guardadas no navegador primeiro; só se todas subirem os mapas entram na mesa (tudo ou nada).
  async function trazerLocais(est, progresso) {
    const ids = Object.keys(est.mapas), prontos = [];
    for (let i = 0; i < ids.length; i++) {
      progresso(i + 1, ids.length);
      const m = N.normalizarMapa(Object.assign({}, est.mapas[ids[i]], { id: ids[i] }));
      if (m.img && m.img.url.startsWith('idb:')) {
        const blob = await idb.ler(m.img.url.slice(4)).catch(() => null);
        if (blob) m.img.url = await TC.arquivos.subir(blob).catch(e => { throw new Error('Não deu para enviar a imagem de "' + m.nome + '": ' + e.message + ' Nada foi trazido.'); });
        else m.img = null;                                                // a imagem já não estava neste navegador
      }
      m.oculto = true;                                                    // na mesa, nada vai para os jogadores sem "Mostrar"
      prontos.push(N.normalizarMapa(m));
    }
    if (docsMapas().length) throw new Error('A mesa ganhou mapas enquanto isso. Nada foi trazido.');
    for (const m of prontos) { gravarDocMesa(PRE_MAPA + m.id, { dados: m, vis: 'mestre' }); sombraDoc.set(m.id, j(m)); }
    const primeiro = prontos.find(m => m.id === est.atual) || prontos[0];
    abrir(primeiro);
    for (const m of prontos) sincronizarPub(m.id);
    sincronizarIndice();
    marcarSalvo('ok', 'Salvo na mesa');
  }

  /* ---------------- imagens ---------------- */
  // Sem mesa, as imagens ficam no IndexedDB (o localStorage não comporta); o mapa guarda só "idb:<id>".
  const idb = (() => {
    let db = null;
    function abrirBanco() {
      if (!db) {
        db = new Promise((ok, falha) => {
          if (!window.indexedDB) { falha(new Error('Este navegador não deixa guardar imagens aqui.')); return; }
          const r = indexedDB.open('tinycats-mundo', 1);
          r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('imagens')) r.result.createObjectStore('imagens'); };
          r.onsuccess = () => ok(r.result);
          r.onerror = () => falha(r.error || new Error('Este navegador não deixa guardar imagens aqui.'));
        });
        db.catch(() => { db = null; });                                   // falhou: a próxima vez tenta de novo
      }
      return db;
    }
    async function op(modoTx, fn) {
      const d = await abrirBanco();
      return new Promise((ok, falha) => {
        const tx = d.transaction('imagens', modoTx), r = fn(tx.objectStore('imagens'));
        tx.oncomplete = () => ok(r ? r.result : undefined);
        tx.onerror = tx.onabort = () => falha(tx.error || new Error('Não deu para guardar a imagem neste navegador.'));
      });
    }
    return {
      gravar: (id, blob) => op('readwrite', s => s.put(blob, id)),
      ler: id => op('readonly', s => s.get(id)),
      apagar: id => op('readwrite', s => s.delete(id)),
      chaves: () => op('readonly', s => s.getAllKeys()),
    };
  })();
  const urls = new Map();                                                 // 'idb:…' → Promise<object URL>
  function urlImagem(img) {
    const u = img && typeof img === 'object' ? img.url : typeof img === 'string' ? img : '';
    if (!u) return Promise.resolve('');
    if (!u.startsWith('idb:')) return Promise.resolve(u);
    if (!urls.has(u)) {
      const p = idb.ler(u.slice(4)).then(b => (b ? URL.createObjectURL(b) : ''), () => '');
      urls.set(u, p);
      p.then(x => { if (!x) urls.delete(u); });                           // não achou: pode aparecer depois (outra aba)
    }
    return urls.get(u);
  }
  async function guardarImagem(blob) {
    if (modo === 'mesa') return TC.arquivos.subir(blob);
    const id = N.novoId('img');
    try { await idb.gravar(id, blob); }
    catch (e) { throw new Error(/quota/i.test(String(e && (e.name + e.message))) ? 'O navegador ficou sem espaço para guardar a imagem.' : 'Não deu para guardar a imagem neste navegador.'); }
    urls.set('idb:' + id, Promise.resolve(URL.createObjectURL(blob)));
    return 'idb:' + id;
  }
  async function dimensoes(blob) {
    if (typeof createImageBitmap === 'function') {
      try { const b = await createImageBitmap(blob); return { w: b.width, h: b.height, fonte: b, fechar: () => b.close && b.close() }; }
      catch (e) { /* alguns navegadores não leem certos formatos assim: tenta pela <img> */ }
    }
    return new Promise((ok, falha) => {
      const u = URL.createObjectURL(blob), im = new Image();
      im.onload = () => ok({ w: im.naturalWidth, h: im.naturalHeight, fonte: im, fechar: () => URL.revokeObjectURL(u) });
      im.onerror = () => { URL.revokeObjectURL(u); falha(new Error('Não deu para ler esta imagem.')); };
      im.src = u;
    });
  }
  // Lado até 8192 px e arquivo até 15 MB; passou disso, redesenha menor em JPEG (90%).
  async function prepararImagem(arq) {
    const LADO = 8192, TAM = 15 * 1024 * 1024, d = await dimensoes(arq);
    try {
      if (!d.w || !d.h) throw new Error('Não deu para ler esta imagem.');
      if (Math.max(d.w, d.h) <= LADO && arq.size <= TAM) return { blob: arq, w: d.w, h: d.h };
      let k = Math.min(1, LADO / Math.max(d.w, d.h));
      for (let tent = 0; tent < 6; tent++, k *= 0.75) {
        const w = Math.max(1, Math.round(d.w * k)), hh = Math.max(1, Math.round(d.h * k));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = hh;
        const cx = cv.getContext('2d');
        if (!cx) continue;
        cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, w, hh);                 // o que era transparente não fica preto no JPEG
        cx.drawImage(d.fonte, 0, 0, w, hh);
        const b = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.9));
        cv.width = cv.height = 0;
        if (b && b.size <= TAM) return { blob: b, w, h: hh };
      }
      throw new Error('Não deu para diminuir esta imagem. Tente uma menor.');
    } finally { try { d.fechar(); } catch (e) { /* já fechada */ } }
  }
  async function definirImagem(arquivo) {
    if (!App.podeEditar()) return false;
    if (!arquivo || !/^image\/(png|jpeg|webp)$/.test(arquivo.type || '')) { App.toast('Escolha uma imagem PNG, JPG ou WebP.'); return false; }
    const idMapa = App.mapa.id, salvoAntes = App.salvo;
    marcarSalvo('salvando', modo === 'mesa' ? 'Enviando a imagem…' : 'Preparando a imagem…');
    try {
      const pr = await prepararImagem(arquivo);
      const url = await guardarImagem(pr.blob);
      if (!App.mapa || App.mapa.id !== idMapa) { marcarSalvo(salvoAntes.estado, salvoAntes.texto); return false; }    // trocou de mapa no meio
      const ant = App.mapa, sx = pr.w / ant.larg, sy = pr.h / ant.alt;
      // o que já estava desenhado acompanha a imagem nova (fica no mesmo lugar relativo; as distâncias em km também)
      const mudou = mudarMapa(ant.img ? 'trocar a imagem' : 'pôr a imagem', m => {
        Object.assign(m, N.escalarMapa(m, sx, sy), { img: { url, w: pr.w, h: pr.h }, larg: pr.w, alt: pr.h });
      });
      if (!mudou) marcarSalvo(salvoAntes.estado, salvoAntes.texto);
      return true;
    } catch (e) {
      console.warn(e);
      marcarSalvo(salvoAntes.estado, salvoAntes.texto);
      App.toast((e && e.message) || 'Não deu para usar esta imagem.');
      return false;
    }
  }
  // Sem mesa: apaga do IndexedDB as imagens que nenhum mapa usa mais (com folga de 10 min para outra aba que acabou de pôr uma).
  async function limparImagensSoltas() {
    if (modo !== 'local') return;
    try {
      const usadas = new Set(), anotar = s => { for (const m of String(s).matchAll(/"url":"idb:([^"]+)"/g)) usadas.add(m[1]); };
      anotar(j(lerLocal()));
      anotar(jAtual || '');
      for (const p of pilhaDesfazer.concat(pilhaRefazer)) anotar(p.json);
      const agora = Date.now();
      for (const k of await idb.chaves()) {
        if (typeof k !== 'string' || usadas.has(k)) continue;
        const t = parseInt((/^img_([a-z0-9]{8})/.exec(k) || [])[1], 36);
        if (Number.isFinite(t) && agora - t > 10 * 60 * 1000) await idb.apagar(k);
      }
    } catch (e) { /* sem IndexedDB: nada a limpar */ }
  }

  /* ---------------- exportar e importar ---------------- */
  const blobParaDataUrl = blob => new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => falha(r.error); r.readAsDataURL(blob); });
  function baixar(blob, nome) {
    const u = URL.createObjectURL(blob), a = h('a', { href: u, download: nome, style: 'display:none' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }
  // O mapa inteiro num .json (a imagem do navegador vai embutida, para abrir em outro lugar).
  async function exportar() {
    if (!App.mapa) return false;
    salvarJa();
    const m = N.copia(App.mapa);
    if (m.img && m.img.url.startsWith('idb:')) {
      const b = await idb.ler(m.img.url.slice(4)).catch(() => null);
      if (b) m.img.url = await blobParaDataUrl(b); else m.img = null;
    }
    const nome = (m.nome.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim() || 'mapa').slice(0, 80);
    baixar(new Blob([JSON.stringify({ formato: 'tinycats-mundo', v: 1, mapa: m })], { type: 'application/json' }), nome + '.json');
    return true;
  }
  async function importar(arquivo) {
    if (App.papel !== 'mestre' || !arquivo) return null;
    let dados = null;
    try { dados = JSON.parse(await arquivo.text()); } catch (e) { dados = null; }
    const cru = dados && typeof dados === 'object' && dados.formato === 'tinycats-mundo' && dados.mapa ? dados.mapa : dados;
    if (!cru || typeof cru !== 'object' || Array.isArray(cru) || !(Array.isArray(cru.objs) || (cru.cal && typeof cru.cal === 'object') || (cru.nevoa && typeof cru.nevoa === 'object'))) {
      App.toast('Este arquivo não é um mapa do Mapa-múndi.');
      return null;
    }
    let img = null, ci = null;
    try {
      ci = cru.img && typeof cru.img === 'object' && typeof cru.img.url === 'string' ? cru.img : null;
      if (ci && /^data:image\/(png|jpeg|webp);/.test(ci.url)) {
        const pr = await prepararImagem(await (await fetch(ci.url)).blob());
        img = { url: await guardarImagem(pr.blob), w: pr.w, h: pr.h };
      } else if (ci && /^https?:\/\//.test(ci.url)) img = ci;
      else if (ci && ci.url.startsWith('idb:') && await idb.ler(ci.url.slice(4)).catch(() => null)) {
        img = modo === 'mesa' ? Object.assign({}, ci, { url: await TC.arquivos.subir(await idb.ler(ci.url.slice(4))) }) : ci;
      }
    } catch (e) {
      console.warn(e);
      App.toast('A imagem do mapa não veio junto: ' + ((e && e.message) || 'não deu para guardá-la.'));
      img = null;
    }
    let m = N.normalizarMapa(Object.assign({}, cru, { id: N.novoId('mp'), img }));
    // imagem que precisou diminuir: o desenhado acompanha
    const w0 = Number(ci && ci.w), h0 = Number(ci && ci.h);
    if (img && w0 > 0 && h0 > 0 && (w0 !== img.w || h0 !== img.h)) m = N.escalarMapa(m, img.w / w0, img.h / h0);
    if (App.mapas.some(x => x.nome === m.nome)) m.nome = m.nome + ' (importado)';
    adicionarMapa(m);
    App.toast('Mapa importado: ' + m.nome + '.' + avisoEscondido());
    return m;
  }

  /* ---------------- partida ---------------- */
  async function lerPapel() {
    const TC = window.TC;
    if (!TC || !TC.ponte) return;                                          // página sem a ponte: sem mesa
    const st = await TC.ponte.pronta;
    if (TC.ponte.naCasca) document.documentElement.classList.add('na-casca');
    if (!TC.dados || !TC.dados.disponivel()) return;
    modo = 'mesa';
    App.naMesa = true;
    App.mesa = { id: st.mesa.id, nome: st.mesa.nome };
    App.eu = st.eu || null;
    App.papel = st.papel === 'mestre' ? 'mestre' : 'jogador';
    if (App.papel === 'jogador') document.documentElement.classList.add('jogador');
    D = TC.dados.col('documentos');
    await D.pronta;
  }
  function carregar() {
    if (modo === 'local') {
      const est = lerLocal();
      atualizarLista();
      const id = est.atual && est.mapas[est.atual] ? est.atual : App.mapas[0] && App.mapas[0].id;
      if (id) abrir(carregarMapa(id), false);
      sombraLocal = jAtual;
      marcarSalvo('ok', 'Salvo neste navegador');
      window.addEventListener('storage', ev => { if (ev.key === CHAVE || ev.key === null) deFora(); });
      setTimeout(limparImagensSoltas, 5000);
      return;
    }
    if (App.papel === 'mestre') {
      for (const l of docsMapas()) {
        const id = l.id.slice(PRE_MAPA.length), pub = docPub(id);
        sombraDoc.set(id, j(docMapa(id)));
        if (pub) sombraPub.set(id, j(pub));
      }
      const idxDoc = dadosDoc(D.pegar(INDICE));
      if (idxDoc) { const idx = normIndice(idxDoc); sombraIndice = j(idx); App.mostrado = idx.mostrado; }
      atualizarLista();
      const pref = guarda.ler('tinycats:mundo:atual:' + App.mesa.id);
      const id = [pref, App.mostrado, App.mapas[0] && App.mapas[0].id].find(x => x && App.mapas.some(m => m.id === x));
      if (id) abrir(carregarMapa(id), false);
      // a projeção que está na mesa acompanha os mapas como estão (e some a de mapa que já não existe)
      for (const m of App.mapas) sincronizarPub(m.id);
      for (const l of D.todas()) if (typeof l.id === 'string' && l.id.startsWith(PRE_PUB) && dadosDoc(l) && !docMapa(l.id.slice(PRE_PUB.length))) apagarDocMesa(l.id);
      sincronizarIndice();
      marcarSalvo('ok', 'Salvo na mesa');
      if (!App.mapas.length) oferecerLocais();
    } else {
      const idx = lerIndice();
      App.mapas = idx.mapas.map(m => ({ id: m.id, nome: m.nome, oculto: false }));
      App.mostrado = idx.mostrado;
      const id = idx.mostrado || (idx.mapas[0] && idx.mapas[0].id);
      const pub = id ? docPub(id) : null;
      if (pub) { App.mapa = pub; jAtual = j(pub); }
      marcarSalvo('ok', '');
    }
    D.aoMudar(l => {
      if (!l || typeof l.id !== 'string' || !l.id.startsWith('mundo:')) return;
      if (App.papel === 'mestre' && l.id.startsWith(PRE_PUB)) {           // outro aparelho do mestre publicou
        const id = l.id.slice(PRE_PUB.length), d = dadosDoc(l);
        if (d) sombraPub.set(id, j(N.normalizarMapa(Object.assign({}, d, { id })))); else sombraPub.delete(id);
        return;
      }
      deFora();
    });
  }
  function falhou(e) {
    console.error(e);
    const v = $('vazio');
    if (!v) return;
    v.replaceChildren(h('div', null,
      h('h2', { text: 'Não deu para abrir os mapas da mesa' }),
      h('p', { text: ((e && e.message) || 'A conexão falhou.') + ' Nada foi perdido.' }),
      h('button', { type: 'button', class: 'btn pri', text: 'Tentar de novo', onclick: () => location.reload() })));
    v.hidden = false;
  }
  function iniciarModulos() {
    for (const [nome, mod] of [['MundoTela', window.MundoTela], ['MundoPainel', window.MundoPainel]]) {
      if (mod && typeof mod.iniciar === 'function') { try { mod.iniciar(App); } catch (e) { console.error(nome + '.iniciar falhou', e); } }
      else console.error(nome + ' não carregou.');
    }
    App.pronto = true;
    App.emit('papel', App.papel);
    App.emit('mapas', App.mapas);
    App.emit('salvo', App.salvo);
    App.emit('muda', { origem: 'inicio' });
    try { if (window.MundoTela && typeof MundoTela.caber === 'function') MundoTela.caber(); } catch (e) { console.error(e); }
  }
  async function partida() {
    try { await lerPapel(); carregar(); }
    catch (e) { falhou(e); return; }
    iniciarModulos();
  }

  /* ---------------- atalhos e saída ---------------- */
  const campoDeTexto = el => !!el && (el.isContentEditable || el.tagName === 'TEXTAREA' ||
    (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|file|range|color)$/i.test(el.type || '')));
  document.addEventListener('keydown', ev => {
    if (!(ev.ctrlKey || ev.metaKey) || ev.altKey || campoDeTexto(ev.target)) return;
    const k = (ev.key || '').toLowerCase();
    if (k === 'z' && !ev.shiftKey) { if (App.podeEditar()) { ev.preventDefault(); App.desfazer(); } }
    else if ((k === 'z' && ev.shiftKey) || k === 'y') { if (App.podeEditar()) { ev.preventDefault(); App.refazer(); } }
  });
  window.addEventListener('pagehide', salvarJa);
  document.addEventListener('visibilitychange', () => { if (document.hidden) salvarJa(); });

  partida();
})();
