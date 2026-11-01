/* Tiny Cats · o bloco de notas do mestre (lote 22).
   Só O mestre da mesa vê e escreve (nem o mestre auxiliar): cada capítulo (ou assunto) é um documento da mesa
   "notas:<id>", com vis 'mestre' — e o id fora dos prefixos das abas faz o banco entregá-lo só ao mestre (a regra
   privado.mestra(m, null): sem aba, só o mestre). Os capítulos têm título, tags e a campanha (ou "do mundo"); a lista
   filtra pela busca, pela tag e pela campanha, e mostra primeiro os da campanha em vista. O texto tem o básico
   (negrito, itálico, listas e títulos) e salva sozinho. Apagar um capítulo pergunta antes e tem o Desfazer.
   Usa TC.dados (a coleção documentos) e TC.mesas; a casca liga o botão e o painel.
   (lote 27) @ e #: digitar @ abre a lista das fichas e dos NPCs; # abre a de lugares e coisas (as cenas, o que tem nome
   no Mapa-múndi, as habilidades, as tags, os outros capítulos…) — o índice da busca rápida (tc/busca.js). Escolher
   põe no texto um link (<a data-aba data-alvo data-k>) que guarda para onde ir, não o nome: ao abrir o capítulo, o
   nome é o de agora (se mudou, acompanha); o que não existe mais fica cinza, com o nome antigo. Clicar leva até lá, e
   o bloco de notas continua aberto do lado.
   (lote 52) Os cadernos. O bloco agora tem três: "Meu caderno" — o do mestre continua "notas:<id>" (só ele vê); o de
   quem joga é "notasj:<uid>:<id>", com ele como dono (ele e o mestre da mesa leem: o banco entrega ao mestre, não ao
   auxiliar) —, "Do grupo" — "notasg:<id>[@campanha]", vis 'mesa': todos da campanha (ou da mesa, sem campanha) leem e
   escrevem, e o mestre também — e, só para o mestre, "Dos jogadores": o caderno de cada jogador, para ler. Cada
   capítulo pode ter um personagem (o filtro "Personagem"). Quem joga não apaga a linha no banco (só quem mestra apaga):
   o capítulo apagado por ele fica marcado (dados.apagada) e some da lista; o Desfazer o traz de volta.
   O SQL 0032 deixa o jogador criar esses documentos e escrever no caderno do grupo. */
(() => {
  'use strict';
  const PRE = 'notas:', PRE_J = 'notasj:', PRE_G = 'notasg:';
  const PERMITIDAS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'H3', 'H4', 'P', 'BR', 'DIV']);
  const MAX_HTML = 60000, MAX_TIT = 80, MAX_TAGS = 8;
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c);
    return el;
  }
  // o HTML do texto só com as marcas permitidas, sem atributo nenhum (o que vem de fora — colar de outro lugar — também)
  function limpar(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html || '').slice(0, MAX_HTML * 2);
    const passar = (de, para) => {
      for (const n of [...de.childNodes]) {
        if (n.nodeType === 3) para.append(document.createTextNode(n.textContent));
        else if (n.nodeType === 1) {
          if (n.tagName === 'A' && refValida(n)) para.append(refDe(n.getAttribute('data-k'), n.getAttribute('data-aba'), JSON.parse(n.getAttribute('data-alvo')), n.textContent));
          else if (PERMITIDAS.has(n.tagName)) { const e = document.createElement(n.tagName === 'DIV' ? 'p' : n.tagName.toLowerCase()); passar(n, e); para.append(e); }
          else passar(n, para);
        }
      }
    };
    const out = document.createElement('div');
    passar(t.content, out);
    return out.innerHTML.slice(0, MAX_HTML);
  }
  // (lote 27) os links do @ e do #: para onde vão (a aba e o alvo, como na busca rápida)
  function refValida(n) {
    const aba = n.getAttribute('data-aba') || '', k = n.getAttribute('data-k') || '';
    if (!/^[a-z]{3,20}$/.test(aba) || (k !== '@' && k !== '#')) return false;
    try { const a = JSON.parse(n.getAttribute('data-alvo') || ''); return !!a && typeof a === 'object' && !Array.isArray(a) && Object.keys(a).length <= 4 && Object.values(a).every(v => (typeof v === 'string' && v.length <= 120) || typeof v === 'boolean'); } catch (e) { return false; }
  }
  const chaveAlvo = (aba, alvo) => aba + '|' + JSON.stringify(Object.keys(alvo).sort().map(k => [k, alvo[k]]));
  function refDe(k, aba, alvo, nome) {
    const a = document.createElement('a');
    a.className = 'nt-ref'; a.setAttribute('contenteditable', 'false');
    a.setAttribute('data-k', k); a.setAttribute('data-aba', aba); a.setAttribute('data-alvo', JSON.stringify(alvo));
    a.textContent = String(nome || '').slice(0, 90);
    return a;
  }
  const textoDe = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const lerTags = t => [...new Set(String(t || '').split(/[,;]+/).map(x => x.trim().replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean))].slice(0, MAX_TAGS);
  const novoId = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function iniciar(o) {
    const { mesas, dados, toast, confirmar, botao, painel, guarda } = o;
    const ir = typeof o.ir === 'function' ? o.ir : () => {};
    const eu = typeof o.eu === 'function' ? o.eu : () => null;
    let atual = null, filtro = { q: '', tag: '', camp: '*', pc: '' }, tSalvar = 0, pendente = null;
    let cad = 'meu', jogSel = null, ultimaTecla = 0;          // (lote 52) o caderno aberto: 'meu', 'grupo' ou 'jog' (o mestre lendo o de um jogador)
    const D = () => { try { return mesas.atual ? dados.col('documentos') : null; } catch (e) { return null; } };
    const eMestre = () => !!(mesas.atual && mesas.atual.cargo === 'mestre');
    const chaveUi = () => 'tinycats:notas:' + (mesas.atual ? mesas.atual.id : '');
    const lerUi = () => { try { return JSON.parse(guarda.ler(chaveUi()) || '{}') || {}; } catch (e) { return {}; } };
    const gravarUi = () => guarda.gravar(chaveUi(), JSON.stringify({ atual, filtro, cad, jogSel }));
    const dadosDe = l => (l && !l.apagado && l.dados && typeof l.dados === 'object' && !l.dados.apagada ? l.dados : null);
    const preMeu = () => (eMestre() ? PRE : PRE_J + eu() + ':');
    const preDe = () => (cad === 'grupo' ? PRE_G : cad === 'jog' ? PRE_J + jogSel + ':' : preMeu());
    const soLer = () => cad === 'jog';
    // os jogadores da mesa (para o mestre ler o caderno de cada um)
    const jogadores = () => (mesas.atual && Array.isArray(mesas.atual.membros) ? mesas.atual.membros : []).filter(x => x.cargo !== 'mestre' && x.usuario_id !== eu());
    // os personagens que um capítulo pode ter: os seus (quem joga), os dos jogadores (o mestre e o caderno do grupo)
    function personagens() {
      let P = null; try { P = dados.col('personagens').todas(); } catch (e) { return []; }
      const quem = cad === 'jog' ? jogSel : cad === 'meu' && !eMestre() ? eu() : null;
      return P.filter(l => l && !l.apagado && l.dono_id && (!quem || l.dono_id === quem) && !(l.ficha && l.ficha.petDe))
        .map(l => ({ id: l.id, nome: String(l.nome || (l.ficha && l.ficha.nome) || 'Personagem') })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
    function capitulos() {
      const d = D();
      if (!d) return [];
      const pre = preDe();
      return d.todas().filter(l => typeof l.id === 'string' && l.id.startsWith(pre) && dadosDe(l)).map(l => {
        const x = l.dados, campId = l.id.includes('@') ? l.id.split('@')[1] : null;
        return { id: l.id, dono: l.dono_id || null, pc: typeof x.pc === 'string' && x.pc ? x.pc : null, t: String(x.t || 'Sem título').slice(0, MAX_TIT), tags: Array.isArray(x.tags) ? x.tags.map(String).slice(0, MAX_TAGS) : [],
          camp: cad === 'grupo' ? campId : typeof x.camp === 'string' && x.camp ? x.camp : null, html: String(x.html || ''), ord: Number(x.ord) || 0, em: Number(x.em) || 0 };
      });
    }
    const campDaVista = () => { const c = mesas.campanha ? mesas.campanha() : null; return c ? c.id : null; };
    const campanhas = () => (mesas.atual && Array.isArray(mesas.atual.campanhas) ? mesas.atual.campanhas : []);
    const nomeCamp = id => { const c = campanhas().find(x => x.id === id); return c ? c.nome : 'outra campanha'; };
    function visiveis() {
      const q = norm(filtro.q), cv = campDaVista();
      return capitulos().filter(c => {
        if (filtro.tag && !c.tags.includes(filtro.tag)) return false;
        if (filtro.pc && c.pc !== filtro.pc) return false;
        if (filtro.camp === 'mundo' && c.camp) return false;
        if (filtro.camp !== '*' && filtro.camp !== 'mundo' && c.camp !== filtro.camp) return false;
        return !q || norm(c.t + ' ' + c.tags.join(' ') + ' ' + textoDe(c.html)).includes(q);
      }).sort((a, b) => ((b.camp && b.camp === cv) - (a.camp && a.camp === cv)) || (a.ord - b.ord) || a.t.localeCompare(b.t, 'pt-BR'));
    }
    function gravar(id, x, novo) {
      const d = D();
      if (!d || soLer()) return;
      const dd = { v: 1, t: x.t, tags: x.tags, camp: id.startsWith(PRE_G) ? null : x.camp || null, html: x.html, ord: x.ord || 0, pc: x.pc || null, em: Date.now() };
      if (id.startsWith(PRE)) { if (eMestre()) d.gravar(id, { dados: dd, vis: 'mestre' }); }
      else if (id.startsWith(PRE_J)) { if (id.startsWith(PRE_J + eu() + ':')) d.gravar(id, { dados: dd, vis: 'mestre', dono_id: eu() }); }
      else if (id.startsWith(PRE_G)) {
        const l = d.pegar(id);
        // (o capítulo do grupo nasce com quem o criou como dono; depois, cada um muda só o texto — o dono e a visibilidade ficam)
        if (novo || !l || l.apagado) d.gravar(id, eMestre() ? { dados: dd, vis: 'mesa' } : { dados: dd, vis: 'mesa', dono_id: eu() });
        else d.gravar(id, { dados: dd });
      }
    }
    // o que está escrito no editor e ainda não subiu: sobe já
    function salvarJa() {
      clearTimeout(tSalvar);
      if (!pendente) return;
      const p = pendente; pendente = null;
      const c = capitulos().find(x => x.id === p.id);
      if (c) gravar(p.id, Object.assign(c, p.campos));
    }
    function agendar(id, campos) {
      pendente = { id, campos: Object.assign(pendente && pendente.id === id ? pendente.campos : {}, campos) };
      clearTimeout(tSalvar); tSalvar = setTimeout(salvarJa, 700);
    }
    function novo() {
      salvarJa();
      if (soLer()) return;
      const cs = capitulos();
      const camp = filtro.camp !== '*' && filtro.camp !== 'mundo' ? filtro.camp : filtro.camp === 'mundo' ? null : campDaVista();
      const id = cad === 'grupo' ? PRE_G + novoId() + (camp ? '@' + camp : '') : preMeu() + novoId();
      const pcs = personagens();
      gravar(id, { t: 'Capítulo ' + (cs.length + 1), tags: filtro.tag ? [filtro.tag] : [], camp, html: '', pc: filtro.pc || (cad === 'meu' && !eMestre() && pcs.length === 1 ? pcs[0].id : null), ord: cs.reduce((m, c) => Math.max(m, c.ord), 0) + 1 }, true);
      atual = id; gravarUi(); pintar();
      const t = painel.querySelector('#nt-tit'); if (t) { t.focus(); t.select(); }
    }
    function apagar(c) {
      salvarJa();
      confirmar('Apagar o capítulo “' + c.t + '”?', 'O texto dele sai do bloco de notas. Dá para desfazer logo depois.', 'Apagar', () => apagarJa(c));
    }
    function apagarJa(c) {
      const copia = Object.assign({}, c), d = D();
      if (!d) return;
      // (quem joga não apaga a linha no banco: o capítulo fica marcado como apagado, sem o texto, e some da lista)
      if (eMestre()) d.apagar(c.id); else d.gravar(c.id, { dados: { v: 1, apagada: true, em: Date.now() } });
      if (atual === c.id) atual = null;
      gravarUi(); pintar();
      toast('O capítulo “' + c.t + '” saiu do bloco de notas.', 'Desfazer', () => { gravar(copia.id, copia); atual = copia.id; gravarUi(); pintar(); });
    }
    function cmd(nome, arg) {
      const ed = painel.querySelector('#nt-texto');
      if (!ed) return;
      ed.focus();
      try { document.execCommand(nome, false, arg || null); } catch (e) { /* o navegador sem o comando */ }
      ed.dispatchEvent(new Event('input'));
    }
    function pintar() {
      if (painel.hidden) return;
      const ed0 = painel.querySelector('#nt-texto'), focoNoTexto = ed0 && document.activeElement === ed0;
      const vistos = visiveis(), todas = capitulos();       // (não "lista": esse nome é o da lista do @ e do #, que o blur do texto confere)
      if (atual && !todas.some(c => c.id === atual)) atual = null;
      if (!atual && vistos.length) atual = vistos[0].id;
      const c = todas.find(x => x.id === atual) || null;
      const tags = [...new Set(todas.flatMap(x => x.tags))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const camps = campanhas(), pcs = personagens(), ler = soLer(), jogs = jogadores();
      assPcs = JSON.stringify(pcs);
      if (filtro.pc && !pcs.some(x => x.id === filtro.pc)) filtro.pc = '';
      const nomePc = id => { const x = pcs.find(y => y.id === id); return x ? x.nome : null; };
      // (lote 52) os cadernos
      const abaCad = (k, txt) => h('button', { type: 'button', class: 'nt-cad' + (cad === k ? ' on' : ''), 'data-cad': k, 'aria-pressed': String(cad === k), text: txt, onclick: () => trocarCad(k) });
      const cads = h('div', { class: 'nt-cads', role: 'group', 'aria-label': 'Cadernos' }, abaCad('meu', 'Meu caderno'), abaCad('grupo', 'Do grupo'), eMestre() ? abaCad('jog', 'Dos jogadores') : null);
      const so = painel.querySelector('#nt-so');
      if (so) so.textContent = cad === 'grupo' ? 'o grupo todo vê e escreve' : cad === 'jog' ? 'só para ler' : eMestre() ? 'só você vê' : 'você e o mestre veem';
      // a lista e os filtros (o editor só é refeito quando o capítulo troca ou quando ninguém está escrevendo nele)
      const topo = h('div', { class: 'nt-topo' }, cads,
        cad === 'jog' ? h('div', { class: 'nt-l' }, jogs.length ? h('select', { id: 'nt-jog', 'aria-label': 'O caderno de qual jogador', onchange: e => { jogSel = e.target.value; atual = null; filtro.pc = ''; gravarUi(); pintar(); } },
          jogs.map(x => h('option', { value: x.usuario_id, text: x.nome || 'Jogador' }))) : h('span', { class: 'nt-so', text: 'Ainda não há jogadores nesta mesa.' })) : null,
        h('div', { class: 'nt-l' },
          h('input', { type: 'search', class: 'nt-busca', id: 'nt-busca', placeholder: 'Buscar nas notas…', value: filtro.q, 'aria-label': 'Buscar nas notas', oninput: e => { filtro.q = e.target.value; gravarUi(); pintarLista(); } }),
          camps.length ? h('select', { id: 'nt-camp', 'aria-label': 'Filtrar por campanha', onchange: e => { filtro.camp = e.target.value; gravarUi(); pintar(); } },
            h('option', { value: '*', text: 'Todas' }), h('option', { value: 'mundo', text: 'Do mundo' }), camps.map(x => h('option', { value: x.id, text: x.nome }))) : null,
          pcs.length ? h('select', { id: 'nt-pc', 'aria-label': 'Filtrar por personagem', onchange: e => { filtro.pc = e.target.value; gravarUi(); pintar(); } },
            h('option', { value: '', text: 'Todos os personagens' }), pcs.map(x => h('option', { value: x.id, text: x.nome }))) : null,
          ler ? null : h('button', { type: 'button', class: 'btn pri sm', id: 'nt-novo', text: '+ Capítulo', onclick: novo })),
        tags.length ? h('div', { class: 'nt-tags', role: 'group', 'aria-label': 'Filtrar por tag' }, tags.map(t => h('button', { type: 'button', class: 'nt-tag' + (filtro.tag === t ? ' on' : ''), 'aria-pressed': String(filtro.tag === t), text: t, onclick: () => { filtro.tag = filtro.tag === t ? '' : t; gravarUi(); pintar(); } }))) : null,
        h('ul', { class: 'nt-lista', id: 'nt-lista' }));
      const corpo = c ? h('div', { class: 'nt-ed', 'data-cap': c.id },
        h('input', { class: 'nt-tit', id: 'nt-tit', value: c.t, maxlength: String(MAX_TIT), readonly: ler, 'aria-label': 'Título do capítulo', oninput: e => { agendar(c.id, { t: e.target.value.trim() || 'Sem título' }); pintarLista(); } }),
        h('div', { class: 'nt-l' },
          h('input', { class: 'nt-tagsin', id: 'nt-tagsin', value: c.tags.join(', '), readonly: ler, placeholder: 'tags, separadas por vírgula', 'aria-label': 'Tags do capítulo', onchange: e => { agendar(c.id, { tags: lerTags(e.target.value) }); salvarJa(); pintar(); } }),
          camps.length && cad !== 'grupo' ? h('select', { id: 'nt-capcamp', disabled: ler, 'aria-label': 'Campanha do capítulo', onchange: e => { agendar(c.id, { camp: e.target.value || null }); salvarJa(); pintar(); } },
            h('option', { value: '', text: 'Do mundo' }), camps.map(x => h('option', { value: x.id, text: x.nome }))) : null,
          camps.length && cad === 'grupo' ? h('span', { class: 'nt-so', id: 'nt-capcampg', title: 'O caderno do grupo fica na campanha em que nasceu', text: c.camp ? nomeCamp(c.camp) : 'do mundo' }) : null,
          pcs.length ? h('select', { id: 'nt-cappc', disabled: ler, 'aria-label': 'Personagem do capítulo', onchange: e => { agendar(c.id, { pc: e.target.value || null }); salvarJa(); pintar(); } },
            h('option', { value: '', text: 'Sem personagem' }), pcs.map(x => h('option', { value: x.id, text: x.nome }))) : null),
        ler ? null : h('div', { class: 'nt-bar', role: 'toolbar', 'aria-label': 'Formatação' },
          [['bold', null, 'N', 'Negrito'], ['italic', null, 'I', 'Itálico'], ['formatBlock', 'h3', 'T', 'Título'], ['formatBlock', 'p', '¶', 'Texto'], ['insertUnorderedList', null, '•', 'Lista'], ['insertOrderedList', null, '1.', 'Lista numerada']]
            .map(([k, a, txt, nome]) => h('button', { type: 'button', class: 'nt-b nt-b-' + k + (a ? '-' + a : ''), title: nome, 'aria-label': nome, text: txt, onmousedown: e => e.preventDefault(), onclick: () => cmd(k, a) })),
          h('span', { class: 'nt-salvo', id: 'nt-salvo', text: 'salva sozinho' }),
          h('button', { type: 'button', class: 'nt-b nt-x', id: 'nt-apagar', title: 'Apagar este capítulo', 'aria-label': 'Apagar este capítulo', text: 'Apagar', onclick: () => apagar(c) })),
        h('div', { class: 'nt-texto', id: 'nt-texto', contenteditable: ler ? 'false' : 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Texto do capítulo',
          oninput: e => { ultimaTecla = Date.now(); agendar(c.id, { html: limpar(e.target.innerHTML) }); conferirGatilho(e.target); },
          onkeydown: teclaLista, onclick: e => { const a = e.target.closest && e.target.closest('a.nt-ref'); if (a) { e.preventDefault(); seguir(a); } else fecharLista(); },
          onpaste: e => { const t = e.clipboardData && e.clipboardData.getData('text/html'); if (t) { e.preventDefault(); document.execCommand('insertHTML', false, limpar(t)); } },
          onblur: () => { salvarJa(); setTimeout(() => { if (!lista || !lista.contains(document.activeElement)) fecharLista(); }, 150); } }))
        : h('div', { class: 'nt-vazio' }, h('p', { text: todas.length ? 'Nenhum capítulo com este filtro.'
          : cad === 'grupo' ? 'O caderno do grupo está vazio. O que for escrito aqui, todos do grupo leem e mudam: as pistas, os nomes dos NPCs, o que falta fazer…'
          : cad === 'jog' ? (jogSel ? 'Este jogador ainda não escreveu nada no caderno dele.' : 'Escolha um jogador.')
          : eMestre() ? 'O bloco de notas está vazio. Crie o primeiro capítulo (ou assunto): os planos da sessão, os segredos, os NPCs…'
          : 'O seu caderno está vazio. Anote o que o seu personagem descobriu, as suspeitas, os nomes e os planos. Você e o mestre leem.' }));
      const mesmo = ed0 && painel.querySelector('.nt-ed') && painel.querySelector('.nt-ed').dataset.cap === (c && c.id);
      const corpoVelho = painel.querySelector('#nt-corpo');
      painel.querySelector('#nt-filtros').replaceChildren(topo);
      // (lote 52) no caderno do grupo, o que outro escreveu entra mesmo com o cursor no texto, se você parou de digitar
      const trocarFocado = mesmo && focoNoTexto && cad === 'grupo' && !pendente && Date.now() - ultimaTecla > 2500 && c && limpar(ed0.innerHTML) !== limpar(c.html);
      if (!(mesmo && focoNoTexto) || trocarFocado) {
        corpoVelho.replaceChildren(corpo);
        const ed = corpoVelho.querySelector('#nt-texto');
        if (ed && c) ed.innerHTML = limpar(c.html);
        const sc = corpoVelho.querySelector('#nt-capcamp'); if (sc && c) sc.value = c.camp || '';
        const sp = corpoVelho.querySelector('#nt-cappc'); if (sp && c) sp.value = c.pc || '';
        if (trocarFocado && ed) { ed.focus(); const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); const sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(r); }
      }
      const fc = painel.querySelector('#nt-camp'); if (fc) fc.value = filtro.camp;
      const fp = painel.querySelector('#nt-pc'); if (fp) fp.value = filtro.pc;
      const fj = painel.querySelector('#nt-jog'); if (fj && jogSel) fj.value = jogSel;
      const edAgora = painel.querySelector('#nt-texto'); if (edAgora) renomearRefs(edAgora);      // (lote 27) os nomes de agora nos links
      pintarLista();
    }
    function pintarLista() {
      const ul = painel.querySelector('#nt-lista');
      if (!ul) return;
      const pcs = personagens(), nomePc = id => { const x = pcs.find(y => y.id === id); return x ? x.nome : null; };
      const autor = id => { if (!id) return 'por quem mestra'; if (id === eu()) return 'por você'; const m = (mesas.atual && mesas.atual.membros || []).find(x => x.usuario_id === id); return m ? 'por ' + m.nome : null; };
      const cv = campDaVista(), lista = visiveis();
      ul.replaceChildren(...lista.map(c => {
        const t = pendente && pendente.id === c.id && pendente.campos.t ? pendente.campos.t : c.t;
        return h('li', null, h('button', { type: 'button', class: 'nt-cap' + (c.id === atual ? ' on' : ''), 'data-cap': c.id, 'aria-current': c.id === atual ? 'true' : null, onclick: () => { salvarJa(); atual = c.id; gravarUi(); pintar(); } },
          h('b', { text: t }), h('small', { text: [c.camp ? (c.camp === cv ? nomeCamp(c.camp) + ' (em vista)' : nomeCamp(c.camp)) : 'do mundo', c.pc ? nomePc(c.pc) : null, cad === 'grupo' ? autor(c.dono) : null, c.tags.join(' · ')].filter(Boolean).join(' · ') })));
      }));
    }
    /* ---- (lote 27) o @ e o # ---- */
    let ind = null, pedidoInd = null, lista = null, gat = null;      // gat: { no, ini, fim, k, q, res, sel }
    function obterIndice() {
      if (ind) return Promise.resolve(ind);
      if (!pedidoInd) pedidoInd = Promise.resolve(typeof o.indice === 'function' ? o.indice() : []).then(l => { ind = Array.isArray(l) ? l : []; pedidoInd = null; return ind; }, () => { pedidoInd = null; return []; });
      return pedidoInd;
    }
    let tInd = 0;
    dados.on('muda', () => { clearTimeout(tInd); tInd = setTimeout(() => { ind = null; }, 300); });
    // o nome de agora em cada link do texto (o que não existe mais fica cinza, com o nome antigo)
    function renomearRefs(ed) {
      if (!ed.querySelector('a.nt-ref')) return;
      obterIndice().then(l => {
        const por = new Map(l.map(it => [chaveAlvo(it.aba, it.alvo), it]));
        for (const a of ed.querySelectorAll('a.nt-ref')) {
          let alvo = null; try { alvo = JSON.parse(a.getAttribute('data-alvo')); } catch (e) { /* inválido */ }
          const it = alvo && por.get(chaveAlvo(a.getAttribute('data-aba'), alvo)), k = a.getAttribute('data-k');
          a.classList.toggle('morta', !it);
          a.title = it ? 'Ir para ' + it.nome + ' (' + it.sub + ')' : 'Não existe mais (ou não dá para abrir daqui)';
          if (it && a.textContent !== k + it.nome) a.textContent = k + it.nome;
        }
      });
    }
    function seguir(a) {
      if (a.classList.contains('morta')) { toast('Isso não existe mais (ou não dá para abrir daqui).'); return; }
      let alvo = null; try { alvo = JSON.parse(a.getAttribute('data-alvo')); } catch (e) { return; }
      salvarJa();
      ir(a.getAttribute('data-aba'), alvo);
    }
    // o @ ou o # logo antes do cursor (no começo ou depois de um espaço), com o que veio depois dele
    function conferirGatilho(ed) {
      const s = window.getSelection();
      if (!s || !s.rangeCount || !s.isCollapsed) { fecharLista(); return; }
      const no = s.anchorNode, off = s.anchorOffset;
      if (!no || no.nodeType !== 3 || !ed.contains(no)) { fecharLista(); return; }
      const antes = no.nodeValue.slice(0, off), m = /(^|[\s(\u00a0])([@#])([^@#\n]{0,40})$/u.exec(antes);
      if (!m || /\s{2}|^\s/.test(m[3])) { fecharLista(); return; }
      const ini = m.index + m[1].length;
      gat = { no, ini, fim: off, k: m[2], q: m[3], res: [], sel: 0 };
      obterIndice().then(l => {
        if (!gat || gat.no !== no) return;
        const doTipo = it => (gat.k === '@' ? it.tipo === 'ficha' : it.tipo !== 'ficha' && it.tipo !== 'item' && !(it.tipo === 'nota' && it.alvo.cap === atual));
        const base = l.filter(doTipo);
        gat.res = gat.q.trim() ? (typeof o.buscar === 'function' ? o.buscar(base, gat.q, 8) : []) : base.slice(0, 8);
        if (!gat.res.length && /\s$/.test(gat.q)) { fecharLista(); return; }
        gat.sel = 0; pintarListaRef();
      });
    }
    function pintarListaRef() {
      if (!gat) return;
      if (!lista) { lista = h('div', { class: 'nt-sug', role: 'listbox', 'aria-label': 'Ligar a…' }); document.body.append(lista); }
      lista.replaceChildren(...(gat.res.length ? gat.res.map((it, i) => h('button', { type: 'button', class: 'nt-sug-i' + (i === gat.sel ? ' on' : ''), role: 'option', 'aria-selected': String(i === gat.sel),
        onmousedown: e => e.preventDefault(), onclick: () => escolher(i) }, h('b', { text: it.nome }), h('small', { text: it.sub })))
        : [h('p', { class: 'nt-sug-v', text: gat.k === '@' ? 'Nenhuma ficha com esse nome.' : 'Nada com esse nome.' })]),
        h('p', { class: 'nt-sug-p', text: gat.k === '@' ? '@ fichas e NPCs · ↑↓ e Enter' : '# cenas, lugares, habilidades, tags, capítulos · ↑↓ e Enter' }));
      const r = document.createRange(); r.setStart(gat.no, gat.ini); r.setEnd(gat.no, gat.fim);
      const q = r.getBoundingClientRect(), alt = lista.offsetHeight;
      lista.style.left = Math.max(8, Math.min(innerWidth - lista.offsetWidth - 8, q.left)) + 'px';
      lista.style.top = (q.bottom + 6 + alt > innerHeight ? Math.max(8, q.top - alt - 6) : q.bottom + 6) + 'px';
    }
    function fecharLista() { gat = null; if (lista) { lista.remove(); lista = null; } }
    function teclaLista(e) {
      if (!gat || !lista) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (gat.res.length) { gat.sel = (gat.sel + (e.key === 'ArrowDown' ? 1 : gat.res.length - 1)) % gat.res.length; pintarListaRef(); } }
      else if ((e.key === 'Enter' || e.key === 'Tab') && gat.res.length) { e.preventDefault(); escolher(gat.sel); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharLista(); }
    }
    function escolher(i) {
      const g = gat, it = g && g.res[i], ed = painel.querySelector('#nt-texto');
      if (!it || !ed || !g.no.isConnected) { fecharLista(); return; }
      const r = document.createRange(); r.setStart(g.no, g.ini); r.setEnd(g.no, Math.min(g.fim, g.no.nodeValue.length));
      r.deleteContents();
      const a = refDe(g.k, it.aba, it.alvo, g.k + it.nome), esp = document.createTextNode('\u00a0');
      a.title = 'Ir para ' + it.nome + ' (' + it.sub + ')';
      r.insertNode(esp); r.insertNode(a);
      const s = window.getSelection(), c = document.createRange(); c.setStart(esp, 1); c.collapse(true); s.removeAllRanges(); s.addRange(c);
      fecharLista();
      ed.focus();
      ed.dispatchEvent(new Event('input'));
    }
    // (lote 52) trocar de caderno
    function trocarCad(k) {
      salvarJa();
      if (k === 'jog' && !eMestre()) k = 'meu';
      cad = k; atual = null; filtro = { q: '', tag: '', camp: '*', pc: '' };
      if (k === 'jog' && !jogadores().some(x => x.usuario_id === jogSel)) jogSel = jogadores().length ? jogadores()[0].usuario_id : null;
      gravarUi(); pintar();
    }
    const cadDe = id => (id.startsWith(PRE_G) ? ['grupo', null] : id.startsWith(PRE) || id.startsWith(PRE_J + eu() + ':') ? ['meu', null] : id.startsWith(PRE_J) ? ['jog', id.slice(PRE_J.length).split(':')[0]] : ['meu', null]);
    // (lote 27) a busca rápida e os links levam a um capítulo
    function abrirCap(id) {
      if (!mesas.atual) return;
      salvarJa();
      const [k, j] = cadDe(id);
      if (k === 'jog' && !eMestre()) return;
      cad = k; if (j) jogSel = j;
      if (!capitulos().some(c => c.id === id)) { toast('Esse capítulo não existe mais.'); return; }
      atual = id;
      if (!visiveis().some(c => c.id === id)) filtro = { q: '', tag: '', camp: '*', pc: '' };
      gravarUi();
      if (painel.hidden) abrir(true); else pintar();
      const ed = painel.querySelector('#nt-texto'); if (ed) ed.focus();
    }
    function abrir(v) {
      if (v && !mesas.atual) return;
      if (!v) salvarJa();
      painel.hidden = !v;
      botao.setAttribute('aria-pressed', String(!painel.hidden));
      guarda.gravar('tinycats:notas-aberto', v ? '1' : '0');
      if (v) { const u = lerUi(); atual = u.atual || null; filtro = Object.assign({ q: '', tag: '', camp: '*', pc: '' }, u.filtro || {}); cad = u.cad === 'grupo' || (u.cad === 'jog' && eMestre()) ? u.cad : 'meu'; jogSel = u.jogSel || null; if (cad === 'jog' && !jogadores().some(x => x.usuario_id === jogSel)) jogSel = jogadores().length ? jogadores()[0].usuario_id : null; pintar(); }
    }
    function mesaMudou() {
      salvarJa();
      botao.hidden = !mesas.atual;                 // (lote 52) numa mesa, todos têm o bloco (quem joga, o caderno dele e o do grupo)
      if (!mesas.atual) { painel.hidden = true; botao.setAttribute('aria-pressed', 'false'); return; }
      if (cad === 'jog' && !eMestre()) cad = 'meu';
      const d = D();
      if (d) d.pronta.then(() => { if (!painel.hidden) pintar(); }, () => {});
      if (guarda.ler('tinycats:notas-aberto') === '1') abrir(true);
    }
    painel.append(h('div', { class: 'nt-h' }, h('strong', { text: 'Bloco de notas' }), h('span', { class: 'nt-so', id: 'nt-so', text: 'só você vê' }),
      h('button', { type: 'button', class: 'ib nt-fechar', id: 'nt-fechar', title: 'Fechar o bloco de notas', 'aria-label': 'Fechar o bloco de notas', text: '×', onclick: () => { abrir(false); botao.focus(); } })),
      h('div', { id: 'nt-filtros' }), h('div', { class: 'nt-corpo', id: 'nt-corpo' }));
    botao.addEventListener('click', () => abrir(painel.hidden));
    mesas.on('muda', mesaMudou);
    let tPcs = 0, assPcs = '';
    dados.on('muda', (col, l, origem) => {
      // (lote 52) os personagens do filtro: só redesenha quando a lista de nomes muda (o HP do combate não mexe no bloco)
      if (col === 'personagens') { if (!painel.hidden) { clearTimeout(tPcs); tPcs = setTimeout(() => { const ass = JSON.stringify(personagens()); if (ass !== assPcs) { assPcs = ass; pintar(); } }, 400); } return; }
      if (col !== 'documentos' || !l || typeof l.id !== 'string' || !l.id.startsWith('notas') || painel.hidden) return;
      if (origem === 'local') { const s = painel.querySelector('#nt-salvo'); if (s) s.textContent = 'salvando…'; return; }
      pintar();                                                // (outro aparelho, ou alguém do grupo, mexeu)
    });
    dados.on('pendentes', n => { const s = painel.querySelector('#nt-salvo'); if (s && !n) s.textContent = 'salvo'; });
    window.addEventListener('pagehide', salvarJa);
    document.addEventListener('visibilitychange', () => { if (document.hidden) salvarJa(); });
    mesaMudou();
    return { abrir, salvarJa, limpar, abrirCap };
  }
  (window.TC || (window.TC = {})).notas = { iniciar, limpar };
})();
