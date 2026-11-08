/* Tiny Cats · Conquistas: a página (lote 117).
   Quem joga vê as conquistas dele (inteiras, também as ocultas que já ganhou), as que estão à mostra e ainda faltam
   (apagadas) e as ocultas como "???" — passando o mouse, só quem já ganhou (sem nome nem descrição).
   Quem mestra vê o catálogo inteiro: libera para um jogador (o site inteiro ouve e vê o anúncio — ver a casca),
   tira, cria e edita (com os ícones prontos).
   Fora de uma mesa (a página sozinha), tudo fica neste navegador, no modo de quem mestra. */
(() => {
  'use strict';
  const C = window.TC.conquistas;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const $ = id => document.getElementById(id);
  const copia = x => JSON.parse(JSON.stringify(x));
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el[k] = v;
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;                          // (só os desenhos fixos do núcleo)
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = true;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    return el;
  }
  function toast(msg, ms) {
    const t = h('div', { class: 'toast', role: 'status' }, h('span', { text: msg }));
    $('toasts').append(t);
    setTimeout(() => t.remove(), ms || 4200);
  }

  /* ---------------- os dados: os documentos da mesa, ou este navegador ---------------- */
  let st = null, D = null, naMesa = false, mestre = true, eu = 'local', pronto = false;
  const LOCAL = 'tinycats:conquistas:local';
  const local = (() => { try { return JSON.parse(localStorage.getItem(LOCAL) || '{}') || {}; } catch (e) { return {}; } })();
  function docDados(id) {
    if (naMesa) { const d = D.pegar(id); return d && !d.apagado ? d.dados : null; }
    return local[id] || null;
  }
  function gravarDoc(id, dados, vis, dono) {
    if (naMesa) { const c = { dados: copia(dados), vis }; if (dono) c.dono_id = dono; D.gravar(id, c); return; }
    local[id] = copia(dados);
    try { localStorage.setItem(LOCAL, JSON.stringify(local)); } catch (e) { toast('Não deu para guardar neste navegador.'); }
  }
  const membros = () => (naMesa && st && Array.isArray(st.membros) ? st.membros : [{ id: 'local', nome: 'Você', papel: 'jogador' }]);
  const nomeDe = u => { const m = membros().find(x => x.id === u); return m ? (m.nome || 'Sem nome') : 'Alguém que saiu da mesa'; };
  const jogadores = () => membros().filter(m => !naMesa || (m.cargo || m.papel) !== 'mestre');
  const lista = () => C.lista(docDados(C.LISTA));
  const pub = () => C.pub(docDados(C.PUB));
  const jogDe = u => C.doJogador(docDados(C.PRE_J + u));
  const quando = em => (em ? new Date(em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

  // a primeira vez de quem mestra: as conquistas de começo entram no catálogo (e a parte de todos sai junto)
  function garantir() {
    if (!mestre || docDados(C.LISTA)) return;
    const L = C.lista(null);
    gravarDoc(C.LISTA, L, 'mestre');
    gravarDoc(C.PUB, C.projetar(L, docDados(C.PUB)), 'mesa');
  }
  /* O catálogo mudou (criar, editar, apagar): a parte de todos é refeita (quem ganhou continua), e quem já ganhou uma
     conquista editada recebe a versão nova dela. */
  function salvarCatalogo(L, editada) {
    const P = C.projetar(L, docDados(C.PUB));
    gravarDoc(C.LISTA, L, 'mestre');
    if (editada) {
      const x = L.itens.find(y => y.id === editada), it = P.itens.find(y => y.id === editada);
      for (const q of (it && it.quem) || []) {
        const J = jogDe(q.u), k = J.itens.findIndex(y => y.id === editada);
        if (x && k >= 0) { J.itens[k] = Object.assign({}, x, { em: J.itens[k].em }); gravarDoc(C.PRE_J + q.u, J, 'mestre', naMesa ? q.u : null); }
      }
    }
    gravarDoc(C.PUB, P, 'mesa');
    pintar();
  }
  function liberar(id, u) {
    const r = C.conceder(lista(), docDados(C.PUB), docDados(C.PRE_J + u), id, u, Date.now());
    if (r.erro) { toast(r.erro); return false; }
    gravarDoc(C.PRE_J + u, r.jog, 'mestre', naMesa ? u : null);           // (a dele primeiro: o anúncio, na tela dele, já a encontra)
    gravarDoc(C.PUB, r.pub, 'mesa');
    toast('Liberada para ' + nomeDe(u) + '.');
    pintar();
    return true;
  }
  function tirar(id, u) {
    const r = C.tirar(lista(), docDados(C.PUB), docDados(C.PRE_J + u), id, u);
    gravarDoc(C.PRE_J + u, r.jog, 'mestre', naMesa ? u : null);
    gravarDoc(C.PUB, r.pub, 'mesa');
    toast('Tirada de ' + nomeDe(u) + '.');
    pintar();
  }

  /* ---------------- a tela ---------------- */
  let filtro = '';            // '' (todas) ou a raridade
  function pintarFiltro() {
    const f = $('filtro');
    f.replaceChildren(...[{ k: '', n: 'Todas' }].concat(C.RARIDADES).map(r => h('button', { type: 'button', 'aria-pressed': String(filtro === r.k), text: r.n,
      onclick: () => { filtro = r.k; pintar(); } })));
  }
  const passa = rar => !filtro || filtro === rar;
  const dicaQuem = quem => {
    const q = (quem || []).map(x => nomeDe(x.u));
    return h('div', { class: 'dica', 'aria-hidden': 'true' }, q.length ? [h('b', { text: 'Quem já ganhou: ' }), q.join(', ')] : 'Ninguém ganhou ainda.');
  };
  const rotQuem = quem => { const q = (quem || []).map(x => nomeDe(x.u)); return q.length ? 'Quem já ganhou: ' + q.join(', ') : 'Ninguém ganhou ainda.'; };
  function cartao(x, modo, quem, extra) {
    const R = C.rarDe(x.rar), oc = modo === 'oculta';
    const el = h('article', { class: 'cq ' + modo, style: '--cor:' + R.cor, tabindex: '0', 'data-cq': x.id,
      'aria-label': oc ? 'Conquista ' + R.n + ' oculta. ' + rotQuem(quem) : x.nome + '. ' + rotQuem(quem) },
      h('div', { class: 'ic', html: oc ? C.svgOculta(26) : C.svgDe(x.ic, 28) }),
      h('div', { class: 'tx' },
        h('span', { class: 'rar', text: R.n + (modo === 'mestre' && x.oculta ? ' · oculta' : '') }),
        h('span', { class: 'nome', text: oc ? '???' : x.nome }),
        !oc && x.desc ? h('span', { class: 'desc', text: x.desc }) : null,
        !oc && x.premio ? h('span', { class: 'premio', text: 'Prêmio: ' + x.premio }) : null,
        x.em ? h('span', { class: 'quando', text: 'Conquistada em ' + quando(x.em) }) : null,
        extra || null),
      modo === 'mestre' ? null : dicaQuem(quem));
    return el;
  }
  function secao(titulo, conta, ajuda, itens) {
    if (!itens.length) return null;
    return h('section', { class: 'secao' }, h('h2', null, titulo, conta ? h('small', { text: conta }) : null), ajuda ? h('p', { class: 'ajuda', text: ajuda }) : null, h('div', { class: 'grade' }, itens));
  }
  function pintarJogador() {
    const P = pub(), J = jogDe(eu), meus = new Set(J.itens.map(x => x.id));
    const quemDe = id => { const it = P.itens.find(y => y.id === id); return it ? it.quem : []; };
    const minhas = J.itens.slice().sort((a, b) => b.em - a.em).filter(x => passa(x.rar)).map(x => cartao(x, 'ganha', quemDe(x.id)));
    const faltam = P.itens.filter(x => !x.oculta && !meus.has(x.id) && passa(x.rar)).map(x => cartao(x, 'falta', x.quem));
    const ocultas = P.itens.filter(x => x.oculta && !meus.has(x.id) && passa(x.rar)).map(x => cartao(x, 'oculta', x.quem));
    const total = P.itens.length;
    const partes = [
      secao('Minhas conquistas', J.itens.length + ' de ' + total, null, minhas),
      secao('Para conquistar', null, 'Estas estão à mostra: é só cumprir. O mestre libera quando você chegar lá.', faltam),
      secao('Ocultas', null, 'Ninguém sabe o que são até ganhar. Passe o mouse para ver quem já ganhou.', ocultas),
    ].filter(Boolean);
    $('corpo').replaceChildren(...(partes.length ? partes : [h('p', { class: 'vazio', text: total ? 'Nenhuma conquista com essa raridade.' : 'O mestre ainda não abriu as conquistas desta mesa.' })]));
  }
  function pintarMestre() {
    const L = lista(), P = pub();
    const porRar = {};
    for (const x of L.itens) if (passa(x.rar)) (porRar[x.rar] = porRar[x.rar] || []).push(x);
    const partes = C.RARIDADES.filter(r => porRar[r.k]).map(r => secao(r.n === 'Comum' ? 'Comuns' : r.n === 'Rara' ? 'Raras' : r.n === 'Épica' ? 'Épicas' : 'Lendárias', porRar[r.k].length + '', null,
      porRar[r.k].map(x => {
        const it = P.itens.find(y => y.id === x.id), quem = it ? it.quem : [];
        const chips = h('div', { class: 'quem' }, quem.map(q => h('span', { class: 'pess' }, nomeDe(q.u),
          h('button', { type: 'button', title: 'Tirar de ' + nomeDe(q.u), 'aria-label': 'Tirar de ' + nomeDe(q.u), text: '×', onclick: ev => { ev.stopPropagation(); confirmarTirar(x, q.u); } }))));
        const acoes = h('div', { class: 'acoes' },
          h('button', { type: 'button', class: 'btn sm pri', text: 'Liberar…', onclick: () => abrirLiberar(x) }),
          h('button', { type: 'button', class: 'btn sm', text: 'Editar', onclick: () => abrirForm(x) }),
          h('button', { type: 'button', class: 'btn sm per', text: 'Apagar', onclick: () => confirmarApagar(x) }));
        return cartao(x, 'mestre', quem, [quem.length ? chips : null, acoes]);
      })));
    $('corpo').replaceChildren(...(partes.length ? partes : [h('p', { class: 'vazio', text: 'Nenhuma conquista com essa raridade.' })]));
  }
  function pintar() {
    if (!pronto) return;
    pintarFiltro();
    $('btNova').hidden = !mestre;
    $('conta').textContent = mestre ? 'Você mestra: todas à vista' : '';
    (mestre ? pintarMestre : pintarJogador)();
  }

  /* ---------------- as janelas ---------------- */
  const dlg = $('dlg');
  function janela(...kids) { dlg.replaceChildren(...kids.filter(k => k != null && k !== false)); if (!dlg.open) dlg.showModal(); }
  const fechar = () => dlg.close();
  function confirmar(titulo, texto, rot, fn) {
    janela(h('h2', { text: titulo }), h('p', { text: texto }),
      h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fechar }),
        h('button', { type: 'button', class: 'btn per', text: rot, onclick: () => { fechar(); fn(); } })));
  }
  const confirmarTirar = (x, u) => confirmar('Tirar a conquista?', '“' + x.nome + '” sai das conquistas de ' + nomeDe(u) + '. O anúncio dela some do registro.', 'Tirar', () => tirar(x.id, u));
  function confirmarApagar(x) {
    const it = pub().itens.find(y => y.id === x.id), n = it ? it.quem.length : 0;
    confirmar('Apagar a conquista?', '“' + x.nome + '” sai do catálogo e da tela de todos.' + (n ? ' Quem já ganhou (' + n + ') continua com ela na própria lista.' : ''), 'Apagar', () => {
      const L = lista(); L.itens = L.itens.filter(y => y.id !== x.id); salvarCatalogo(L);
    });
  }
  function abrirLiberar(x) {
    const jaTem = new Set(((pub().itens.find(y => y.id === x.id) || {}).quem || []).map(q => q.u));
    const js = jogadores();
    if (!js.length) { toast('Ainda não há jogadores nesta mesa.'); return; }
    const sel = h('select', { class: 'in', id: 'cqQuem' }, js.map(m => h('option', { value: m.id, disabled: jaTem.has(m.id) }, (m.nome || 'Sem nome') + (jaTem.has(m.id) ? ' (já tem)' : ''))));
    const livre = js.find(m => !jaTem.has(m.id));
    if (livre) sel.value = livre.id;
    const R = C.rarDe(x.rar);
    janela(h('h2', { text: 'Liberar “' + x.nome + '”' }),
      h('p', { text: R.k === 'comum' ? 'Todos que estiverem no site ouvem o som e veem o nome e a descrição.' : 'Todos ouvem o som e veem que saiu uma conquista ' + R.n + ' — o nome, só quem ganhou.' }),
      h('label', { class: 'campo' }, h('span', { text: 'Para quem' }), sel),
      x.premio ? h('p', { text: 'Lembrete do prêmio (você aplica na ficha): ' + x.premio }) : null,
      h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fechar }),
        h('button', { type: 'button', class: 'btn pri', text: 'Liberar', disabled: !livre, onclick: () => { if (liberar(x.id, sel.value)) fechar(); } })));
  }
  function abrirForm(x) {
    const novo = !x, f = Object.assign({ nome: '', desc: '', rar: 'comum', oculta: false, premio: '', ic: 'estrela' }, x ? copia(x) : {});
    const nome = h('input', { class: 'in', maxlength: '60', value: f.nome, placeholder: 'Ex.: Matador de Goblins' });
    const desc = h('textarea', { class: 'in', rows: '2', maxlength: '300', placeholder: 'O que a pessoa precisa fazer' }); desc.value = f.desc;
    const premio = h('input', { class: 'in', maxlength: '120', value: f.premio, placeholder: 'Ex.: +1 ponto de árvore (opcional)' });
    const rar = h('select', { class: 'in' }, C.RARIDADES.map(r => h('option', { value: r.k }, r.n))); rar.value = f.rar;
    const oculta = h('input', { type: 'checkbox', checked: f.oculta });
    let ocultaMexida = !novo;
    oculta.onchange = () => { ocultaMexida = true; previa(); };
    rar.onchange = () => { if (!ocultaMexida) oculta.checked = rar.value !== 'comum'; previa(); };
    const prev = h('div', { class: 'previa' });
    const icones = h('div', { class: 'icones', role: 'group', 'aria-label': 'Ícone' });
    const pintarIcones = () => icones.replaceChildren(...Object.keys(C.ICONES).map(k => h('button', { type: 'button', title: C.NOMES_ICONES[k] || k, 'aria-label': C.NOMES_ICONES[k] || k,
      'aria-pressed': String(f.ic === k), html: C.svgDe(k, 22), onclick: () => { f.ic = k; pintarIcones(); previa(); } })));
    function previa() {
      const y = C.conquista({ id: 'previa', nome: nome.value || 'Conquista', desc: desc.value, premio: premio.value, rar: rar.value, ic: f.ic, oculta: oculta.checked });
      prev.replaceChildren(cartao(y, 'ganha', []));
    }
    for (const el of [nome, desc, premio]) el.oninput = previa;
    pintarIcones(); previa();
    janela(h('h2', { text: novo ? 'Nova conquista' : 'Editar conquista' }), prev,
      h('label', { class: 'campo' }, h('span', { text: 'Nome' }), nome),
      h('label', { class: 'campo' }, h('span', { text: 'Descrição' }), desc),
      h('div', { class: 'linha' }, h('label', { class: 'campo' }, h('span', { text: 'Raridade' }), rar),
        h('label', { class: 'chk' }, oculta, 'Oculta (ninguém vê até ganhar)')),
      h('label', { class: 'campo' }, h('span', { text: 'Prêmio' }), premio),
      h('div', { class: 'campo' }, h('span', { text: 'Ícone' }), icones),
      h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fechar }),
        h('button', { type: 'button', class: 'btn pri', text: novo ? 'Criar' : 'Salvar', onclick: () => {
          if (!nome.value.trim()) { toast('Dê um nome à conquista.'); nome.focus(); return; }
          const L = lista(), y = C.conquista({ id: novo ? null : x.id, nome: nome.value, desc: desc.value, premio: premio.value, rar: rar.value, ic: f.ic, oculta: oculta.checked });
          if (novo) { y.de = 'mestre'; L.itens.push(y); } else { const k = L.itens.findIndex(z => z.id === x.id); if (k >= 0) L.itens[k] = y; else L.itens.push(y); }
          salvarCatalogo(L, novo ? null : y.id);
          fechar();
          toast(novo ? 'Conquista criada.' : 'Conquista salva.');
        } })));
    nome.focus();
  }
  $('btNova').addEventListener('click', () => abrirForm(null));

  /* ---------------- partida ---------------- */
  async function partida() {
    const TCx = window.TC;
    if (TCx && TCx.ponte) {
      st = await TCx.ponte.pronta;
      if (TCx.ponte.naCasca) document.documentElement.classList.add('na-casca');
      if (TCx.dados && TCx.dados.disponivel()) {
        naMesa = true;
        eu = st.eu || null;
        // (o catálogo é um documento do mestre principal: o auxiliar joga, aqui)
        mestre = st.papel === 'mestre' && (st.cargo == null || st.cargo === 'mestre');
        D = TCx.dados.col('documentos');
        await D.pronta;
        D.aoMudar(l => { if (l && typeof l.id === 'string' && l.id.startsWith('conq:') && !dlg.open) pintar(); });
      }
      TCx.ponte.aoMudar(e => { st = e; if (pronto && !dlg.open) pintar(); });
    }
    if (!naMesa && /[?&]jogador\b/.test(location.search)) mestre = false;     // (a página sozinha, vista como quem joga)
    pronto = true;
    garantir();
    pintar();
  }
  dlg.addEventListener('close', () => pintar());
  if (DEBUG) window.__conq = { C, liberar, tirar, lista, pub, jogDe, get mestre() { return mestre; }, get eu() { return eu; } };
  partida().catch(e => {
    console.error(e);
    $('corpo').replaceChildren(h('div', { class: 'vazio' }, h('strong', { text: 'Não deu para abrir as conquistas da mesa. ' }), (e && e.message) || ''));
  });
})();
