/* Tiny Cats · Jornal: a página.
   Quem mestra o Jornal (o mestre, ou o auxiliar com a aba liberada) escreve no rascunho — o nome, a data do mundo
   (do mapa escolhido no Mapa-múndi), o clima, as matérias, os boatos e anúncios e as cartas — vendo ao lado a folha
   como os jogadores vão ver, e publica. Quem joga lê o que saiu e manda cartas (assinadas por um personagem dele ou
   anônimas); vê se cada uma saiu, não saiu ou ainda espera o mestre.
   Fora de uma mesa (a página sozinha), o jornal fica neste navegador: dá para escrever e ver como sai. */
(() => {
  'use strict';
  const N = window.JornalNucleo, MN = window.MundoNucleo || null;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const $ = id => document.getElementById(id);
  const j = JSON.stringify;
  const copia = x => JSON.parse(JSON.stringify(x));
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    let valor;
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on') || k.startsWith('_')) el[k] = v;
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') valor = v;
      else if (k === 'checked') el.checked = true;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    if (valor !== undefined) el.value = valor;
    return el;
  }
  const NS = 'http://www.w3.org/2000/svg';
  function icone(svg, tam) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('width', tam || 18); s.setAttribute('height', tam || 18); s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.7');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = svg;                                                  // desenho fixo do núcleo
    return s;
  }
  const guarda = {
    ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    gravar(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  };
  const lerLocal = k => { try { return JSON.parse(guarda.ler(k) || 'null'); } catch (e) { return null; } };

  /* ---------------- o estado ---------------- */
  const RAS = 'jornal:rascunho', PUB = 'jornal:pub', PRE_C = 'jornal:cartas:', PRE_R = 'jornal:resp:';
  const L_RAS = 'tinycats:jornal:rascunho', L_PUB = 'tinycats:jornal:pub';
  let st = null, D = null, P = null, naMesa = false, mestre = true, eu = null, pronto = false;
  let ras = N.normJornal(null), pub = N.normPub(null);
  let pilha = [];                          // o desfazer de quem mestra: { rotulo, ras, pub?, resps? }
  let modo = ['escrever', 'ver', 'noar'].includes(guarda.ler('tinycats:jornal:modo')) ? guarda.ler('tinycats:jornal:modo') : 'escrever';
  let tSalvar = 0, sujo = false;
  const cartaNova = { txt: '', ass: '' };   // a carta que o jogador está escrevendo (fica entre uma pintura e outra)
  let tPrevia = 0;
  let pintando = false, pendente = false;  // (uma pintura pedida no meio de outra fica para logo depois)
  let dobraAberta = false;                 // "Não saíram" aberto (continua aberto entre uma pintura e outra)

  const docDados = id => { const d = D && D.pegar(id); return d && !d.apagado ? d.dados : null; };
  function lerTudo() {
    if (naMesa) {
      pub = N.normPub(docDados(PUB));
      if (mestre && !sujo) { const r = docDados(RAS); ras = N.normJornal(r || (N.vazioPub(pub) ? null : pub)); }
    } else {
      pub = N.normPub(lerLocal(L_PUB));
      if (!sujo) { const r = lerLocal(L_RAS); ras = N.normJornal(r || (N.vazioPub(pub) ? null : pub)); }
    }
  }
  function salvarDepois() {
    sujo = true;
    clearTimeout(tSalvar);
    tSalvar = setTimeout(salvarJa, 450);
    marcarSalvo();
  }
  function salvarJa() {
    clearTimeout(tSalvar);
    if (!sujo) return;
    sujo = false;
    if (naMesa) D.gravar(RAS, { dados: copia(ras), vis: 'mestre' });
    else if (!guarda.gravar(L_RAS, j(ras))) toast('Não deu para guardar o rascunho neste navegador.');
    marcarSalvo();
  }
  function marcarSalvo() {
    const el = $('salvo');
    if (!mestre) { el.textContent = ''; return; }
    const novidade = N.mudouDesde(ras, pub);
    el.className = 'salvo' + (novidade ? ' novo' : '');
    el.textContent = sujo ? 'Salvando…' : N.vazioPub(pub) ? (naMesa ? 'Rascunho salvo · ainda não publicado' : 'Rascunho neste navegador') : novidade ? 'Rascunho com mudanças que ainda não saíram' : 'Igual ao publicado';
  }

  /* ---------------- mudar o rascunho (com desfazer) ---------------- */
  function mudar(rotulo, fn) {
    if (!mestre) return false;
    const novo = copia(ras);
    if (fn(novo) === false) return false;
    const n = N.normJornal(novo);
    if (j(n) === j(ras)) return false;
    pilha.push({ rotulo, ras: copia(ras) });
    if (pilha.length > 120) pilha.shift();
    ras = n;
    salvarDepois();
    pintar();
    return true;
  }
  function desfazer() {
    const p = pilha.pop();
    if (!p) return;
    ras = N.normJornal(p.ras);
    salvarDepois();
    if (p.pub !== undefined) {
      // desfazer a publicação: o publicado de antes e o que cada jogador sabia das cartas dele
      gravarPub(p.pub);
      for (const de of Object.keys(p.resps || {})) gravarResp(de, p.resps[de]);
    }
    if (p.resp) gravarResp(p.resp.de, p.resp.antes);
    pintar();
    toast('Desfeito: ' + p.rotulo + '.');
  }
  function gravarPub(p) {
    pub = N.normPub(p);
    if (naMesa) { if (N.vazioPub(pub)) D.apagar(PUB); else D.gravar(PUB, { dados: copia(pub), vis: 'mesa' }); }
    else guarda.gravar(L_PUB, j(pub));
  }
  // o que aconteceu com as cartas de um jogador (o documento é dele: só ele e quem mestra veem)
  const respDe = de => N.normResp(docDados(PRE_R + de));
  function gravarResp(de, r) { if (naMesa && de) D.gravar(PRE_R + de, { dados: N.normResp(r), vis: 'mestre', dono_id: de }); }

  /* ---------------- a data do mundo: o mapa escolhido ---------------- */
  function mapas() {
    if (!naMesa || !D) return [];
    const out = [];
    for (const l of D.todas()) {
      if (l.apagado || typeof l.id !== 'string' || !l.id.startsWith('mundo:mapa:') || !l.dados || typeof l.dados !== 'object') continue;
      const d = l.dados, id = typeof d.id === 'string' ? d.id : '';
      if (id && !out.some(x => x.id === id)) out.push({ id, nome: String(d.nome || 'Mapa sem nome'), cal: d.cal });
    }
    return out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  function dataDoMundo(jx) {
    const m = jx.mapa ? mapas().find(x => x.id === jx.mapa) : null;
    if (!m || !MN || !m.cal || typeof m.cal !== 'object') return '';
    try { return MN.textoData(m.cal, m.cal.dia); } catch (e) { return ''; }
  }

  /* ---------------- a folha ---------------- */
  function paragrafos(txt, max) {
    const out = [];
    for (const p of N.marcacao(txt).slice(0, max || 400)) {
      const el = h('p');
      for (const x of p) {
        if (x.br) { el.append(h('br')); continue; }
        let n = document.createTextNode(x.t);
        if (x.i) { const i = h('i'); i.append(n); n = i; }
        if (x.b) { const b = h('b'); b.append(n); n = b; }
        el.append(n);
      }
      out.push(el);
    }
    return out;
  }
  function folha(jx, data) {
    const clima = jx.clima.t ? N.CLIMAS[jx.clima.t] : null;
    const climaTxt = [clima && clima.nome, jx.clima.frase].filter(Boolean).join(' · ');
    const art = h('article', { class: 'folha', 'aria-label': jx.nome },
      h('header', { class: 'cabeca' },
        h('h1', { class: 'nome', text: jx.nome }),
        h('div', { class: 'faixa' },
          h('span', { class: 'data', text: data || 'Notícias do mundo' }),
          climaTxt ? h('span', { class: 'clima' }, clima ? icone(clima.svg, 18) : null, h('span', { text: climaTxt })) : null)));
    const [man, ...resto] = jx.materias;
    if (man) art.append(h('section', { class: 'manchete' + (man.dest ? ' dest' : '') },
      man.tit ? h('h2', { text: man.tit }) : null, h('div', { class: 'texto' + (man.txt.length >= 600 ? ' colunas' : '') }, paragrafos(man.txt)), man.ass ? h('p', { class: 'ass', text: man.ass }) : null));
    if (resto.length) art.append(h('section', { class: 'materias' }, resto.map(m => h('section', { class: 'materia' + (m.dest ? ' dest' : '') },
      m.tit ? h('h3', { text: m.tit }) : null, paragrafos(m.txt), m.ass ? h('p', { class: 'ass', text: m.ass }) : null))));
    const notas = jx.notas.filter(n => n.txt.trim());
    if (notas.length) art.append(h('h2', { class: 'secao', text: 'Boatos e anúncios' }), h('div', { class: 'notas' }, notas.map(n => h('div', { class: 'nota' }, paragrafos(n.txt)))));
    const cartas = jx.cartas.filter(c => c.txt.trim());
    if (cartas.length) art.append(h('h2', { class: 'secao', text: 'Cartas dos leitores' }), h('div', { class: 'cartas' }, cartas.map(c => h('div', { class: 'carta' }, paragrafos(c.txt), h('p', { class: 'ass', text: c.ass || 'Anônima' })))));
    if (!man && !notas.length && !cartas.length) art.append(h('p', { class: 'vazio-folha', text: 'Nada para contar ainda.' }));
    else art.append(h('div', { class: 'fim', 'aria-hidden': 'true', text: '❦' }));
    return art;
  }

  /* ---------------- o editor (quem mestra) ---------------- */
  // Campos: gravam um passo de desfazer quando a pessoa termina de editar; enquanto escreve, só a folha acompanha.
  function campoTexto(k, rotulo, valor, aplicar, o = {}) {
    const el = h(o.area ? 'textarea' : 'input', { class: 'in', type: o.area ? null : 'text', 'data-k': k, value: valor || '', maxlength: o.max || 200, placeholder: o.ph || null,
      rows: o.area ? o.linhas || 4 : null, autocomplete: 'off', 'aria-label': rotulo ? null : o.rotulo || null,
      oninput: function () { previa(r => aplicar(r, this.value)); },
      onchange: function () { mudar(o.desfazer || 'mudar o texto', r => aplicar(r, this.value)); } });
    return rotulo ? h('label', { class: 'field' }, h('span', { text: rotulo }), el, o.dica ? h('small', { class: 'ajuda', text: o.dica }) : null) : el;
  }
  // a folha acompanha o que está sendo escrito (sem gravar ainda)
  function previa(fn) {
    clearTimeout(tPrevia);
    tPrevia = setTimeout(() => {
      if (modo === 'noar') return;
      const tmp = copia(ras);
      fn(tmp);
      pintarLeitura(N.normJornal(tmp));
    }, 220);
  }
  function marcas(alvoK) {
    const envolver = marca => () => {
      const ta = document.querySelector(`[data-k="${alvoK}"]`);
      if (!ta) return;
      const r = N.envolver(ta.value, ta.selectionStart, ta.selectionEnd, marca);
      ta.value = r.txt;
      ta.focus(); ta.setSelectionRange(r.ini, r.fim);
      ta.dispatchEvent(new Event('change'));
    };
    return h('span', { class: 'marcas' },
      h('button', { type: 'button', class: 'ib', 'data-k': alvoK + ':b', title: 'Negrito: **assim**', 'aria-label': 'Negrito', onclick: envolver('**') }, h('b', { text: 'N' })),
      h('button', { type: 'button', class: 'ib', 'data-k': alvoK + ':i', title: 'Itálico: _assim_', 'aria-label': 'Itálico', onclick: envolver('_') }, h('i', { text: 'I' })));
  }
  const btnIcone = (k, rot, txt, fn, off) => h('button', { type: 'button', class: 'ib', 'data-k': k, title: rot, 'aria-label': rot, disabled: !!off, onclick: fn, text: txt });
  const mover = (lista, i, d) => { const k = i + d; if (k < 0 || k >= lista.length) return false; const [x] = lista.splice(i, 1); lista.splice(k, 0, x); };

  function editor() {
    const out = [];
    // o alto do jornal
    const ms = mapas(), data = dataDoMundo(ras);
    out.push(h('section', { class: 'sec' }, h('h2', { text: 'O jornal' }),
      campoTexto('j:nome', 'Nome', ras.nome, (r, v) => { r.nome = v; }, { max: 80, ph: 'O Arauto do Vale', desfazer: 'mudar o nome do jornal' }),
      h('label', { class: 'field' }, h('span', { text: 'Data do mundo' }),
        h('select', { class: 'in', 'data-k': 'j:mapa', value: ras.mapa || '', onchange: function () { mudar('mudar a data do mundo', r => { r.mapa = this.value || null; }); } },
          h('option', { value: '', text: ms.length ? 'Sem data' : 'Sem data (a mesa ainda não tem mapa)' }),
          ms.map(m => h('option', { value: m.id, text: 'Do mapa ' + m.nome }))),
        h('small', { class: 'ajuda', text: data ? 'Hoje no mundo: ' + data + '. Ao publicar, o jornal sai com esta data.' : naMesa ? 'A data vem do calendário de um mapa do Mapa-múndi.' : 'Numa mesa, a data vem do calendário de um mapa do Mapa-múndi.' })),
      h('div', { class: 'row dois' },
        h('label', { class: 'field' }, h('span', { text: 'Clima' }),
          h('select', { class: 'in', 'data-k': 'j:clima', value: ras.clima.t, onchange: function () { mudar('mudar o clima', r => { r.clima.t = this.value; }); } },
            h('option', { value: '', text: 'Sem clima' }), Object.keys(N.CLIMAS).map(k => h('option', { value: k, text: N.CLIMAS[k].nome })))),
        campoTexto('j:frase', 'Frase do clima', ras.clima.frase, (r, v) => { r.clima.frase = v; }, { max: 120, ph: 'Chuva fina na costa', desfazer: 'mudar a frase do clima' }))));
    // as matérias
    const mats = ras.materias.map((m, i) => h('div', { class: 'cartao' + (i === 0 ? ' manchete' : ''), 'data-mat': m.id },
      h('div', { class: 'cab' }, h('b', { text: i === 0 ? 'Manchete' : 'Matéria ' + (i + 1) }), h('span', { class: 'grow' }),
        btnIcone('m:' + m.id + ':cima', 'Subir', '↑', () => mudar('mudar a ordem das matérias', r => mover(r.materias, i, -1)), i === 0),
        btnIcone('m:' + m.id + ':baixo', 'Descer', '↓', () => mudar('mudar a ordem das matérias', r => mover(r.materias, i, 1)), i === ras.materias.length - 1),
        btnIcone('m:' + m.id + ':x', 'Tirar a matéria', '×', () => { if (mudar('tirar a matéria', r => { r.materias.splice(i, 1); })) avisoDesfazer('Matéria tirada.'); })),
      campoTexto('m:' + m.id + ':tit', null, m.tit, (r, v) => { r.materias[i].tit = v; }, { max: 160, ph: i === 0 ? 'A manchete do dia' : 'Título', rotulo: 'Título', desfazer: 'mudar o título' }),
      h('div', { class: 'row' }, h('small', { class: 'ajuda grow', text: 'Texto: **negrito**, _itálico_; linha em branco: outro parágrafo.' }), marcas('m:' + m.id + ':txt')),
      campoTexto('m:' + m.id + ':txt', null, m.txt, (r, v) => { r.materias[i].txt = v; }, { area: true, linhas: i === 0 ? 7 : 5, max: N.MAX.materia, ph: 'O que aconteceu…', rotulo: 'Texto', desfazer: 'mudar o texto da matéria' }),
      h('div', { class: 'row' },
        h('div', { class: 'grow' }, campoTexto('m:' + m.id + ':ass', null, m.ass, (r, v) => { r.materias[i].ass = v; }, { max: 80, ph: 'Assinatura (ex.: Por Aldo, o escriba)', rotulo: 'Assinatura', desfazer: 'mudar a assinatura' })),
        h('label', { class: 'chk' }, h('input', { type: 'checkbox', 'data-k': 'm:' + m.id + ':dest', checked: m.dest, onchange: function () { mudar(this.checked ? 'pôr a matéria em destaque' : 'tirar o destaque', r => { r.materias[i].dest = this.checked; }); } }), h('span', { text: 'Destaque' })))));
    out.push(h('section', { class: 'sec' }, h('h2', null, 'Matérias ', h('span', { class: 'n', text: String(ras.materias.length) })),
      mats.length ? mats : h('p', { class: 'vazio-ed', text: 'Nenhuma ainda. A primeira é a manchete.' }),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'm:nova', disabled: ras.materias.length >= N.MAX.materias, onclick: () => novaMateria() }, '+ Matéria'))));
    // boatos e anúncios
    const notas = ras.notas.map((n, i) => h('div', { class: 'cartao', 'data-nota': n.id },
      h('div', { class: 'cab' }, h('b', { text: 'Nota ' + (i + 1) }), h('span', { class: 'grow' }),
        btnIcone('n:' + n.id + ':cima', 'Subir', '↑', () => mudar('mudar a ordem das notas', r => mover(r.notas, i, -1)), i === 0),
        btnIcone('n:' + n.id + ':baixo', 'Descer', '↓', () => mudar('mudar a ordem das notas', r => mover(r.notas, i, 1)), i === ras.notas.length - 1),
        btnIcone('n:' + n.id + ':x', 'Tirar a nota', '×', () => { if (mudar('tirar a nota', r => { r.notas.splice(i, 1); })) avisoDesfazer('Nota tirada.'); })),
      campoTexto('n:' + n.id + ':txt', null, n.txt, (r, v) => { r.notas[i].txt = v; }, { area: true, linhas: 2, max: N.MAX.nota, ph: 'Dizem que… / Vende-se…', rotulo: 'Texto da nota', desfazer: 'mudar a nota' })));
    out.push(h('section', { class: 'sec' }, h('h2', null, 'Boatos e anúncios ', h('span', { class: 'n', text: String(ras.notas.length) })),
      notas.length ? notas : h('p', { class: 'vazio-ed', text: 'Notas curtas, no pé da página.' }),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'n:nova', disabled: ras.notas.length >= N.MAX.notas, onclick: () => novaNota() }, '+ Nota'))));
    out.push(secaoCartas());
    return out;
  }
  function novaMateria() {
    let id = null;
    if (mudar('pôr uma matéria', r => { id = N.novoId('mt'); r.materias.push({ id, tit: '', txt: '', ass: '', dest: false }); })) focarDepois('m:' + id + ':tit');
  }
  function novaNota() {
    let id = null;
    if (mudar('pôr uma nota', r => { id = N.novoId('nt'); r.notas.push({ id, txt: '' }); })) focarDepois('n:' + id + ':txt');
  }
  function focarDepois(k) { setTimeout(() => { const el = document.querySelector(`[data-k="${k}"]`); if (el) { el.focus(); el.scrollIntoView({ block: 'nearest' }); } }, 0); }

  // as cartas: as que estão no jornal (o texto pode ser corrigido), as que chegaram e as que não saíram
  function nomeDe(uid) { const m = st && Array.isArray(st.membros) ? st.membros.find(x => x.id === uid) : null; return m ? m.nome : 'um jogador'; }
  const quando = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  function caixa() {
    if (!naMesa || !D) return [];
    const docs = [];
    for (const l of D.todas()) {
      if (l.apagado || typeof l.id !== 'string' || !l.id.startsWith(PRE_C)) continue;
      const de = l.id.slice(PRE_C.length);
      docs.push({ de, cartas: l.dados, resp: docDados(PRE_R + de) });
    }
    return N.caixaDeCartas(docs, ras);
  }
  function secaoCartas() {
    const no = ras.cartas.map((c, i) => h('div', { class: 'cartao', 'data-carta': c.id },
      h('div', { class: 'cab' }, h('b', { text: c.de ? 'Carta de ' + nomeDe(c.de) : 'Carta' }), h('span', { class: 'grow' }),
        btnIcone('c:' + c.id + ':cima', 'Subir', '↑', () => mudar('mudar a ordem das cartas', r => mover(r.cartas, i, -1)), i === 0),
        btnIcone('c:' + c.id + ':baixo', 'Descer', '↓', () => mudar('mudar a ordem das cartas', r => mover(r.cartas, i, 1)), i === ras.cartas.length - 1),
        btnIcone('c:' + c.id + ':x', 'Tirar do jornal', '×', () => { if (mudar('tirar a carta do jornal', r => { r.cartas.splice(i, 1); })) avisoDesfazer('Carta tirada do jornal.'); })),
      campoTexto('c:' + c.id + ':ass', null, c.ass, (r, v) => { r.cartas[i].ass = v; }, { max: 80, ph: 'Assinatura (vazio: Anônima)', rotulo: 'Assinatura da carta', desfazer: 'mudar a assinatura da carta' }),
      campoTexto('c:' + c.id + ':txt', null, c.txt, (r, v) => { r.cartas[i].txt = v; }, { area: true, linhas: 3, max: N.MAX.carta, rotulo: 'Texto da carta', desfazer: 'corrigir a carta' })));
    const cx = caixa(), chegaram = cx.filter(c => c.st === 'esperando' && !c.noRascunho), recusadas = cx.filter(c => c.st === 'nao' && !c.noRascunho);
    const cartaCh = (c, acoes) => h('div', { class: 'carta-ch', 'data-ch': c.de + '/' + c.id },
      h('div', { class: 'de' }, h('span', null, h('b', { text: N.assTxt(c.ass) }), ' · mandada por ' + nomeDe(c.de)), c.em ? h('span', { text: quando(c.em) }) : null),
      h('div', { class: 'txt', text: c.txt }), h('div', { class: 'row' }, acoes));
    const out = h('section', { class: 'sec', id: 'sec-cartas' }, h('h2', null, 'Cartas dos leitores ', h('span', { class: 'n', text: String(ras.cartas.length) })),
      no.length ? no : h('p', { class: 'vazio-ed', text: naMesa ? 'As cartas que você puser no jornal aparecem aqui (dá para corrigir o texto).' : 'Cartas no jornal (os jogadores mandam numa mesa).' }),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'c:nova', disabled: ras.cartas.length >= N.MAX.cartasNoJornal, onclick: () => novaCarta() }, '+ Carta')));
    if (naMesa) {
      out.append(h('h2', null, 'Chegaram ', h('span', { class: 'n', text: String(chegaram.length) })),
        chegaram.length ? h('div', { class: 'lista' }, chegaram.map(c => cartaCh(c, [
          h('button', { type: 'button', class: 'btn sm pri', 'data-k': 'ch:' + c.de + '/' + c.id + ':por', onclick: () => porNoJornal(c) }, 'Pôr no jornal'),
          h('button', { type: 'button', class: 'btn sm', 'data-k': 'ch:' + c.de + '/' + c.id + ':nao', onclick: () => naoPublicar(c) }, 'Não publicar')])))
          : h('p', { class: 'vazio-ed', text: 'Nenhuma carta nova dos jogadores.' }));
      if (recusadas.length) out.append(h('details', { class: 'dobra', open: dobraAberta, ontoggle: function () { dobraAberta = this.open; } }, h('summary', { text: 'Não saíram (' + recusadas.length + ')' }),
        h('div', { class: 'lista' }, recusadas.map(c => cartaCh(c, [h('button', { type: 'button', class: 'btn sm', 'data-k': 'ch:' + c.de + '/' + c.id + ':por', onclick: () => porNoJornal(c) }, 'Pôr no jornal')])))));
    }
    return out;
  }
  function novaCarta() {
    let id = null;
    if (mudar('pôr uma carta', r => { id = N.novoId('cj'); r.cartas.push({ id, de: null, ref: null, ass: '', txt: '' }); })) focarDepois('c:' + id + ':txt');
  }
  function porNoJornal(c) {
    const antes = respDe(c.de);
    if (!mudar('pôr a carta no jornal', r => { const n = N.porNoJornal(r, c.de, c); r.cartas = n.cartas; })) return;
    // a que não tinha saído volta a esperar (sai quando o jornal for publicado)
    if (antes.st[c.id] === 'nao') {
      const novo = copia(antes); delete novo.st[c.id];
      gravarResp(c.de, novo);
      pilha[pilha.length - 1].resp = { de: c.de, antes };
    }
    toast('A carta está no jornal. Ela sai quando você publicar.');
  }
  function naoPublicar(c) {
    const antes = respDe(c.de), novo = copia(antes);
    novo.st[c.id] = 'nao';
    gravarResp(c.de, novo);
    pilha.push({ rotulo: 'não publicar a carta', ras: copia(ras), resp: { de: c.de, antes } });
    pintar();
    avisoDesfazer('A carta não vai sair. ' + nomeDe(c.de) + ' vê que ela não saiu; ela fica guardada em “Não saíram”.');
  }

  /* ---------------- publicar ---------------- */
  async function publicar() {
    if (!mestre) return;
    salvarJa();
    const data = dataDoMundo(ras);
    const vazio = !ras.materias.length && !ras.notas.some(n => n.txt.trim()) && !ras.cartas.some(c => c.txt.trim());
    const sim = await confirmar('Publicar o jornal?',
      (naMesa ? 'Os jogadores vão ler esta versão, e o Jornal abre para eles.' : 'Fora de uma mesa, o jornal publicado fica neste navegador.') + (data ? ' Ele sai com a data ' + data + '.' : '') + (vazio ? ' (O jornal está vazio.)' : ''), 'Publicar');
    if (!sim) return;
    const antes = copia(pub), novo = N.publicar(ras, pub, data, new Date().toISOString());
    // as cartas que estão no jornal saíram: cada jogador fica sabendo das dele
    const saidas = N.saidasAoPublicar(novo), resps = {};
    for (const de of Object.keys(saidas)) {
      const r = respDe(de);
      resps[de] = copia(r);
      gravarResp(de, { st: Object.assign({}, r.st, saidas[de]) });
    }
    pilha.push({ rotulo: 'publicar o jornal', ras: copia(ras), pub: antes, resps });
    gravarPub(novo);
    if (naMesa && st && st.mesa) guarda.gravar('tinycats:jornal:visto:' + st.mesa.id, novo.em);     // (quem publica já viu)
    pintar();
    avisoDesfazer(naMesa ? 'Publicado: os jogadores já veem o jornal.' : 'Publicado (neste navegador).');
  }

  /* ---------------- as cartas de quem joga ---------------- */
  const minhas = () => N.normCartas(docDados(PRE_C + eu));
  function meusPersonagens() {
    if (!P) return [];
    return P.todas().filter(l => !l.apagado && l.dono_id === eu && String(l.nome || '').trim()).map(l => ({ id: l.id, nome: String(l.nome).trim() })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  function cartasDoJogador() {
    const pcs = meusPersonagens(), resp = N.normResp(docDados(PRE_R + eu)), ms = minhas().cartas.slice().reverse();
    if (cartaNova.ass && cartaNova.ass !== 'anon' && !pcs.some(p => p.id === cartaNova.ass)) cartaNova.ass = '';
    const ass = h('select', { class: 'in', 'data-k': 'cj:ass', 'aria-label': 'Quem assina', value: cartaNova.ass || (pcs[0] ? pcs[0].id : 'anon'), onchange: function () { cartaNova.ass = this.value; } },
      pcs.map(p => h('option', { value: p.id, text: 'Assinada por ' + p.nome })), h('option', { value: 'anon', text: 'Anônima' }));
    const txt = h('textarea', { class: 'in', 'data-k': 'cj:txt', rows: 5, maxlength: N.MAX.carta, placeholder: 'Caro editor…', value: cartaNova.txt, oninput: function () { cartaNova.txt = this.value; } });
    const rotulo = { esperando: 'Esperando o mestre', saiu: 'Saiu no jornal', nao: 'Não saiu' };
    return h('section', { class: 'cartas-jog', id: 'cartas-jog', 'aria-label': 'Cartas ao jornal' },
      h('h2', { text: 'Cartas ao jornal' }),
      h('p', { class: 'ajuda', text: 'Mande uma carta: o mestre decide se ela sai no jornal. Só você e o mestre veem as suas cartas.' }),
      h('label', { class: 'field' }, h('span', { text: 'Sua carta' }), txt),
      h('div', { class: 'row' }, h('div', { class: 'grow' }, ass), h('button', { type: 'button', class: 'btn pri', 'data-k': 'cj:mandar', onclick: () => mandar() }, 'Mandar a carta')),
      ms.length ? h('div', { class: 'lista' }, h('b', { text: 'Suas cartas' }), ms.map(c => {
        const s = N.situacao(resp, c.id);
        return h('div', { class: 'minha', 'data-minha': c.id },
          h('div', { class: 'de' }, h('span', { class: 'tag ' + s, text: rotulo[s] }), h('span', { text: N.assTxt(c.ass) + (c.em ? ' · ' + quando(c.em) : '') }), h('span', { class: 'grow' }),
            s === 'esperando' ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'cj:' + c.id + ':retirar', onclick: () => retirar(c.id) }, 'Retirar') : null),
          h('div', { class: 'txt', text: c.txt }));
      })) : null);
  }
  function mandar() {
    if (!naMesa || !eu) return;
    const pcs = meusPersonagens(), escolha = cartaNova.ass || (pcs[0] ? pcs[0].id : 'anon'), pc = pcs.find(p => p.id === escolha);
    const r = N.mandarCarta(docDados(PRE_C + eu), cartaNova.txt, pc ? { pc: pc.id, nome: pc.nome } : null, new Date().toISOString());
    if (!r.ok) { toast(r.msg); return; }
    D.gravar(PRE_C + eu, { dados: r.cartas, vis: 'mestre', dono_id: eu });
    cartaNova.txt = '';
    pintar();
    toast('Carta mandada ao jornal. O mestre decide se ela sai.');
  }
  async function retirar(id) {
    const d = minhas(), c = d.cartas.find(x => x.id === id);
    if (!c || !(await confirmar('Retirar a carta?', 'Ela sai da caixa do mestre e não vai para o jornal.', 'Retirar'))) return;
    d.cartas = d.cartas.filter(x => x.id !== id);
    D.gravar(PRE_C + eu, { dados: d, vis: 'mestre', dono_id: eu });
    pintar();
  }

  /* ---------------- pintar ---------------- */
  /* Pintar por cima (morph): o que não mudou fica onde está — o campo em que a pessoa escreve não sai do lugar, não
     perde o cursor nem o que foi escrito e ainda não gravado (grava ao sair do campo), e o campo em que ela clicou
     continua sendo o mesmo. (O mesmo jeito do painel do Mapa-múndi.) */
  const PROPS = ['onclick', 'onchange', 'oninput', 'onkeydown', 'ontoggle'];
  const textual = el => el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|file|range)$/i.test(el.type || ''));
  const seletor = k => '[data-k="' + (window.CSS && CSS.escape ? CSS.escape(k) : String(k).replace(/["\\]/g, '\\$&')) + '"]';
  function mesmo(a, b) {
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) return false;
    if (a.nodeType !== 1) return true;
    if ((a.getAttribute('data-k') || '') !== (b.getAttribute('data-k') || '')) return false;
    return a.tagName !== 'INPUT' || a.type === b.type;
  }
  function morph(v, n, foco) {
    if (!mesmo(v, n)) { v.replaceWith(n); return; }
    if (v.nodeType !== 1) { if (v.nodeValue !== n.nodeValue) v.nodeValue = n.nodeValue; return; }
    if (v.namespaceURI === NS) { if (!v.isEqualNode(n)) v.replaceWith(n); return; }      // ícone: troca inteiro
    for (const a of [...v.attributes]) if (!n.hasAttribute(a.name)) v.removeAttribute(a.name);
    for (const a of n.attributes) if (v.getAttribute(a.name) !== a.value) v.setAttribute(a.name, a.value);
    for (const p of PROPS) if (v[p] !== n[p]) v[p] = n[p];
    if (v.tagName !== 'TEXTAREA') morphFilhos(v, n, foco);                              // textarea: o texto é o value
    if (v.tagName === 'INPUT' || v.tagName === 'TEXTAREA' || v.tagName === 'SELECT') {
      if (!(v === foco && textual(v)) && v.value !== n.value) v.value = n.value;
      if (v.tagName === 'INPUT' && v.checked !== n.checked) v.checked = n.checked;
    }
  }
  // Os filhos, por posição. Se o foco está aqui dentro, o filho que o contém é a âncora: os outros entram e saem em
  // volta dele, e ele nunca sai do lugar (mover um elemento com foco tira o foco).
  function morphFilhos(v, n, foco) {
    const vc = [...v.childNodes], nc = [...n.childNodes];
    const k = foco && foco.getAttribute && foco.getAttribute('data-k');
    let iv = -1, inn = -1;
    if (k && v.contains(foco)) {
      const sel = seletor(k);
      iv = vc.findIndex(c => c === foco || (c.nodeType === 1 && c.contains(foco)));
      inn = nc.findIndex(c => c.nodeType === 1 && (c.matches(sel) || !!c.querySelector(sel)));
    }
    if (iv < 0 || inn < 0) { parear(v, vc, nc, null, foco); return; }
    parear(v, vc.slice(0, iv), nc.slice(0, inn), vc[iv], foco);
    morph(vc[iv], nc[inn], foco);
    parear(v, vc.slice(iv + 1), nc.slice(inn + 1), null, foco);
  }
  function parear(pai, vc, nc, antes, foco) {
    const n = Math.min(vc.length, nc.length);
    for (let i = 0; i < n; i++) morph(vc[i], nc[i], foco);
    for (let i = n; i < nc.length; i++) pai.insertBefore(nc[i], antes);
    for (let i = n; i < vc.length; i++) vc[i].remove();
  }
  function morphEm(alvo, filhos) {
    const a = document.activeElement, foco = a && a !== alvo && alvo.contains(a) ? a : null;
    morphFilhos(alvo, h('div', null, filhos), foco);
  }
  function pintarLeitura(previaDe) {
    const L = $('leitura'), out = [];
    if (mestre && modo !== 'noar') {
      const jx = previaDe || ras;
      out.push(h('p', { class: 'aviso-folha', text: 'Como os jogadores vão ver quando você publicar.' }), folha(jx, dataDoMundo(jx)));
    } else if (N.vazioPub(pub)) {
      out.push(h('p', { class: 'aviso-folha', text: mestre ? 'O jornal ainda não foi publicado.' : 'O jornal ainda não saiu. Quando o mestre publicar, ele aparece aqui.' }));
    } else {
      if (mestre) out.push(h('p', { class: 'aviso-folha', text: 'O que os jogadores estão lendo agora.' }));
      out.push(folha(pub, pub.data));
    }
    if (!mestre && naMesa) out.push(cartasDoJogador());
    morphEm(L, out);
  }
  function pintar() {
    if (!pronto) return;
    if (pintando) { pendente = true; return; }
    pintando = true; pendente = false;
    try { pintarJa(); } finally { pintando = false; }
    if (pendente) setTimeout(pintar, 0);
    // o campo com o foco tem texto ainda não gravado: a folha ao lado continua mostrando esse texto
    const a = document.activeElement;
    if (a && $('ed').contains(a) && textual(a) && typeof a.oninput === 'function') a.oninput();
  }
  function pintarJa() {
    const w = $('work'), ed = $('ed');
    $('modos').hidden = !mestre;
    $('btPublicar').hidden = !mestre;
    $('btDesfazer').hidden = !mestre;
    $('btDesfazer').disabled = !pilha.length;
    $('btDesfazer').title = pilha.length ? 'Desfazer: ' + pilha[pilha.length - 1].rotulo + ' (Ctrl+Z)' : 'Nada para desfazer';
    for (const b of $('modos').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.modo === modo));
    const comEditor = mestre && modo === 'escrever';
    ed.hidden = !comEditor;
    w.className = 'work' + (comEditor ? ' modo-escrever' : ' so-folha');
    if (comEditor) morphEm(ed, editor());
    pintarLeitura();
    marcarSalvo();
  }

  /* ---------------- avisos e janelas ---------------- */
  function toast(texto, acao, fn, ms) {
    const caixa = $('toasts');
    while (caixa.children.length >= 3) caixa.firstElementChild.remove();       // (no máximo três avisos de uma vez)
    const t = h('div', { class: 'toast' }, h('span', { text: texto }));
    if (acao) t.append(h('button', { type: 'button', text: acao, onclick: () => { t.remove(); fn(); } }));
    caixa.append(t);
    setTimeout(() => t.remove(), ms || (acao ? 8000 : 4500));
  }
  // "Desfazer" do aviso: só desfaz se o passo de cima ainda é o deste aviso
  function avisoDesfazer(texto) {
    const passo = pilha[pilha.length - 1];
    toast(texto, 'Desfazer', () => { if (pilha[pilha.length - 1] !== passo) { toast('Já houve outra mudança depois. Use o botão Desfazer, lá em cima.'); return; } desfazer(); });
  }
  function confirmar(titulo, texto, ok) {
    return new Promise(resolve => {
      const dlg = $('dlg');
      const fim = v => { if (dlg.open) dlg.close(); resolve(v); };
      dlg.replaceChildren(h('h2', { text: titulo }), h('p', { text: texto }),
        h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', 'data-k': 'dl:nao', onclick: () => fim(false) }, 'Cancelar'),
          h('button', { type: 'button', class: 'btn pri', 'data-k': 'dl:sim', onclick: () => fim(true) }, ok || 'OK')));
      dlg.onclose = () => resolve(false);
      dlg.showModal();
      dlg.querySelector('[data-k="dl:sim"]').focus();
    });
  }

  /* ---------------- teclas e botões ---------------- */
  $('btDesfazer').addEventListener('click', () => desfazer());
  $('btPublicar').addEventListener('click', () => publicar());
  for (const b of $('modos').querySelectorAll('button')) b.addEventListener('click', () => { modo = b.dataset.modo; guarda.gravar('tinycats:jornal:modo', modo); pintar(); });
  const escrevendo = () => { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); };
  document.addEventListener('keydown', ev => {
    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.key.toLowerCase() === 'z' && mestre && !escrevendo() && !$('dlg').open) { ev.preventDefault(); desfazer(); }
  });
  window.addEventListener('beforeunload', () => salvarJa());
  window.addEventListener('pagehide', () => salvarJa());

  /* ---------------- partida ---------------- */
  async function partida() {
    const TCx = window.TC;
    if (TCx && TCx.ponte) {
      st = await TCx.ponte.pronta;
      if (TCx.ponte.naCasca) document.documentElement.classList.add('na-casca');
      if (TCx.dados && TCx.dados.disponivel()) {
        naMesa = true;
        eu = st.eu || null;
        mestre = st.papel === 'mestre';
        D = TCx.dados.col('documentos'); P = TCx.dados.col('personagens');
        await Promise.all([D.pronta, P.pronta]);
      }
      TCx.ponte.aoFechar(() => salvarJa());
      TCx.ponte.aoMudar(e => { const antes = j((st && st.membros) || []); st = e; if (pronto && antes !== j(e.membros || [])) pintar(); });
    }
    lerTudo();
    if (naMesa) {
      D.aoMudar(l => {
        if (!l || typeof l.id !== 'string') return;
        if (l.id === PUB) { pub = N.normPub(l.apagado ? null : l.dados); pintar(); }
        else if (l.id === RAS) { if (mestre && !sujo && !escrevendo()) { ras = N.normJornal(l.apagado ? null : l.dados); pintar(); } }
        else if (l.id.startsWith(PRE_C) || l.id.startsWith(PRE_R) || l.id.startsWith('mundo:mapa:')) pintar();
      });
      P.aoMudar(() => { if (!mestre) pintar(); });
    }
    pronto = true;
    pintar();
  }
  if (DEBUG) window.__jornal = { N, get ras() { return ras; }, get pub() { return pub; }, get pilha() { return pilha; }, get mestre() { return mestre; }, get naMesa() { return naMesa; }, get pronto() { return pronto; },
    mudar, desfazer, publicar, salvarJa, caixa };
  partida().catch(e => {
    console.error(e);
    $('leitura').replaceChildren(h('div', { class: 'vazio' }, h('strong', { text: 'Não deu para abrir o jornal da mesa. ' }), (e && e.message) || '', ' ',
      h('button', { type: 'button', class: 'btn sm', text: 'Tentar de novo', onclick: () => location.reload() })));
  });
})();
