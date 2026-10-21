/* Tiny Cats · Mapa-múndi · a corte no painel (lote 11, parte 1).
   A aba Corte: os personagens do mundo por casa (os sem casa no fim; os mortos recolhidos), com o filtro de facção; para
   quem mestra, "+ Personagem", "+ Casa" e "Cargos da corte…", e cada personagem abre o cartão (uma janela: o nome, o
   gênero, a casa, a facção, o cargo na corte da facção, o nascimento e a morte pela data do mundo, os pais e os cônjuges,
   onde está, a ficha das Fichas, se os jogadores conhecem, o que eles sabem e a nota do mestre); a casa abre a janela
   dela (o nome, o lema, o chefe e o brasão, com o editor do Clã). Para quem joga, os que o mestre marcou como
   conhecidos, só para ler (com os laços entre conhecidos). Na cidade e no grupo, "Quem está aqui". (parte 1b) Na casa,
   "Árvore da família…": a árvore desenhada numa janela grande (clicar numa pessoa abre o cartão). (parte 2a) Os títulos:
   "Casas | Títulos" no alto da aba; a lista dos títulos por reino, o cartão do título, os graus e a maioridade, os
   títulos na região, na cidade e na facção (o governante), o maior título junto do nome.
   Nada muda até "Salvar" (ou "Criar"); tudo vale num passo de Desfazer. Usa as ferramentas do painel (MundoPainel.kit). */
(() => {
  'use strict';
  const kit = () => window.MundoPainel.kit;
  const C = () => window.MundoCorte;
  const N = () => window.MundoNucleo;
  const RP = () => window.MundoReinoPainel || null;
  const app = () => kit().app();
  const LIM = k => (N().LIMITES || {})[k];
  let filtroFac = '';                        // a facção da lista ('' = todas; só nesta página)
  const mortosAbertos = new Set();           // as casas com os mortos à mostra (só nesta página)
  let seqBr = 0;

  // o brasão de uma casa (o desenho do núcleo do Clã, ou a imagem); null sem ele
  function brasaoEl(br, tam) {
    const Cl = window.ClaNucleo;
    if (!br) return null;
    const el = kit().h('span', { class: 'fac-band corte-br', style: { width: tam + 'px', height: Math.round(tam * 1.2) + 'px' }, 'aria-hidden': 'true' });
    if (br.img) { el.append(kit().h('img', { src: br.img, alt: '' })); return el; }
    if (!Cl || typeof Cl.brasaoSvg !== 'function') return null;
    try { el.innerHTML = Cl.brasaoSvg(br, 'cb' + (++seqBr)); } catch (e) { return null; }      // só números e cores conferidos
    return el;
  }
  // a linha de baixo de um personagem: a idade (ou a morte), o cargo e a facção, onde está
  function rotulo(m, p, comFac) {
    const K = kit(), id = C().idadeDe(m, p), f = p.fac ? K.facDe(m, p.fac) : null, cg = C().cargoDe(m, p), lugar = p.onde ? K.achar(m, p.onde.id) : null;
    const anos = id == null ? '' : id < 0 ? 'ainda não nasceu' : K.plural(id, 'ano', 'anos');
    const vida = p.morte ? '† ' + C().dataTxt(m, p.morte) + (anos ? ' (aos ' + anos + ')' : '') : anos;
    const papel = cg ? cg.nome + (f ? ' de ' + K.nomeFac(f) : '') : f && comFac ? K.nomeFac(f) : '';
    return [vida, papel, lugar && !p.morte ? 'em ' + K.nomeDe(lugar, m) : ''].filter(Boolean).join(' · ');
  }
  // os laços em texto: "filha de Ana e Bento · esposa de Caio · mãe de Duda e Eva"
  function lacos(m, p) {
    const nomes = l => { const ns = l.map(q => q.nome); return ns.length <= 1 ? ns.join('') : ns.slice(0, -1).join(', ') + ' e ' + ns[ns.length - 1]; };
    const ps = C().paisDe(m, p), cs = C().conjugesDe(m, p), fs = C().filhosDe(m, p), out = [];
    if (ps.length) out.push(C().laco('filho', p) + ' de ' + nomes(ps));
    if (cs.length) out.push(C().laco('conj', p) + ' de ' + nomes(cs));
    if (fs.length) out.push(C().laco('pai', p) + ' de ' + nomes(fs));
    return out.join(' · ');
  }

  /* ---------------- a aba Corte ---------------- */
  function abaCorte(v) {
    const K = kit(), { h, nota, botao, linha, campoEscolha } = K, ed = app().podeEditar(), c = C().corteDe(v), out = [topoCorte()];
    if (vistaCorte === 'titulos') return out.concat(abaTitulos(v));      // (parte 2a) os títulos
    if (ed) out.push(linha(botao('+ Personagem', () => janelaPessoa(null), { c: 'pri sm', k: 'corte:nova', off: c.pessoas.length >= (LIM('personagens') || 400) }),
      botao('+ Casa', () => janelaCasa(null), { c: 'sm', k: 'corte:casa-nova', off: c.casas.length >= (LIM('casas') || 80) }),
      botao('Cargos da corte…', () => janelaCargos(), { c: 'sm', k: 'corte:cargos', off: !v.faccoes.length, title: v.faccoes.length ? null : 'Crie uma facção primeiro (aba Reinos)' })));
    if (!c.pessoas.length && !c.casas.length) {
      out.push(nota(ed ? 'Ninguém ainda. Os personagens do mundo — os nobres, os governantes, a corte de cada facção — e as casas (as famílias, com o brasão e o lema). Os jogadores só veem os que você marcar como conhecidos.'
        : 'Ninguém conhecido ainda.'));
      return out;
    }
    if (filtroFac && !K.facDe(v, filtroFac)) filtroFac = '';
    if (v.faccoes.length) out.push(campoEscolha('corte:fac', 'Facção', filtroFac, [['', 'Todas as facções']].concat(v.faccoes.map(f => [f.id, K.nomeFac(f)])), x => { filtroFac = x; return false; }));
    const passa = p => !filtroFac || p.fac === filtroFac;
    const lista = h('div', { class: 'corte-lista', 'data-k': 'corte:lista' });
    for (const casa of c.casas) {
      const membros = C().membrosDe(v, casa.id).filter(passa);
      if (!filtroFac || membros.length) lista.append(blocoCasa(v, casa, membros, ed));
    }
    const sem = C().membrosDe(v, null).filter(passa);
    if (sem.length) lista.append(blocoCasa(v, null, sem, ed));
    if (!lista.children.length) lista.append(nota('Ninguém desta facção.'));
    out.push(lista);
    if (!ed) out.push(nota('Só quem vocês conhecem.'));
    return out;
  }
  function blocoCasa(v, casa, membros, ed) {
    const K = kit(), { h, nota } = K, chave = casa ? casa.id : '-', chefe = casa && casa.chefe ? C().pessoaDe(v, casa.chefe) : null;
    const vivos = membros.filter(C().vivo), mortos = membros.filter(p => !C().vivo(p));
    const cab = h('div', { class: 'corte-casa-cab', 'data-k': 'casa:' + chave },
      casa ? brasaoEl(casa.br, 22) || h('i', { class: 'corte-sem-br', 'aria-hidden': 'true' }) : null,
      h('span', { class: 'tx' }, h('b', { text: casa ? casa.nome : 'Sem casa' }),
        h('small', { text: [casa && casa.lema ? '“' + casa.lema + '”' : '', chefe ? 'chefe: ' + chefe.nome : '', K.plural(membros.length, 'pessoa', 'pessoas')].filter(Boolean).join(' · ') })));
    // (parte 1b) a árvore da família (todos a abrem; quem joga vê só os conhecidos) e, para quem mestra, editar a casa
    const acoes = casa ? h('div', { class: 'row corte-casa-acoes' }, K.botao('Árvore da família…', () => janelaArvore(casa.id), { c: 'sm', k: 'casa:' + casa.id + ':arvore', off: !membros.length && !C().membrosDe(v, casa.id).length }),
      ed ? K.botao('Editar…', () => janelaCasa(casa.id), { c: 'sm', k: 'casa:' + casa.id + ':editar' }) : null) : null;
    const item = p => (ed
      ? h('button', { type: 'button', class: 'li clic corte-p' + (C().vivo(p) ? '' : ' morto'), 'data-k': 'p:' + p.id, onclick: () => janelaPessoa(p.id) },
        h('span', { class: 'tx' }, h('b', { text: C().nomeComTitulo(v, p) }), h('small', { text: rotulo(v, p, !filtroFac) || 'sem data, cargo nem lugar' })),
        p.ver ? h('span', { class: 'tag', title: 'Os jogadores conhecem', text: 'conhecido' }) : null)
      : cartaoPub(v, p));
    const corpo = vivos.map(item);
    if (mortos.length) {
      corpo.push(h('details', { class: 'corte-mortos', 'data-k': 'casa:' + chave + ':mortos', open: mortosAbertos.has(chave) || null },
        h('summary', { text: 'Mortos (' + mortos.length + ')', onclick: function (ev) { ev.preventDefault(); const d = this.parentNode, abrir = !d.open; if (abrir) mortosAbertos.add(chave); else mortosAbertos.delete(chave); d.open = abrir; } }),
        mortos.map(item)));
    }
    if (!membros.length) corpo.push(nota('Ninguém nesta casa ainda.'));
    return h('div', { class: 'corte-casa', 'data-casa': chave }, cab, acoes, corpo);
  }
  // para quem joga: o personagem conhecido, só para ler
  function cartaoPub(v, p) {
    const { h } = kit(), l = lacos(v, p), r = rotulo(v, p, true);
    return h('div', { class: 'corte-pub' + (C().vivo(p) ? '' : ' morto'), 'data-k': 'p:' + p.id },
      h('b', { text: C().nomeComTitulo(v, p) }), r ? h('small', { text: r }) : null, l ? h('small', { class: 'corte-lacos', text: l }) : null,
      p.txt ? h('p', { class: 'publico', text: p.txt }) : null);
  }

  /* ---------------- quem está aqui (na cidade, no grupo) ---------------- */
  function secQuemEsta(o, v) {
    const ps = o && (o.k === 'm' || o.k === 'g') ? C().quemEsta(v, o.id) : [];
    if (!ps.length) return null;
    const K = kit(), { h } = K, ed = app().podeEditar();
    return K.secao('Quem está aqui', h('div', { class: 'corte-aqui', 'data-k': 'o:' + o.id + ':aqui' }, ps.map(p => (ed
      ? h('button', { type: 'button', class: 'li clic corte-p', 'data-k': 'aqui:' + p.id, onclick: () => janelaPessoa(p.id) }, h('span', { class: 'tx' }, h('b', { text: C().nomeComTitulo(v, p) }), h('small', { text: rotulo(v, p, true) })))
      : cartaoPub(v, p)))));
  }

  /* ---------------- mudar a corte ---------------- */
  function mudarCorte(rotulo0, fn) {
    return app().mudar(rotulo0, mm => { if (!mm.corte) mm.corte = { pessoas: [], casas: [], cargos: {}, titulos: [] }; if (!mm.corte.titulos) mm.corte.titulos = []; return fn(mm.corte, mm); });
  }

  /* ---------------- o cartão do personagem ---------------- */
  async function janelaPessoa(id) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m) return;
    const p = id ? C().pessoaDe(m, id) : null;
    if (id && !p) return;
    const v = await dialogoPessoa(m, p);
    if (!v || !K.mesmoMapa(m.id)) return;
    if (v.sucessao) { await janelaSucessao(p.id); return; }        // (parte 2b) a sucessão de quem já morreu
    if (v.tirar) {
      const ok = await K.confirmar({ titulo: 'Tirar ' + p.nome + ' da corte?', ok: 'Tirar', perigo: true,
        texto: 'Sai da lista e dos laços dos outros (pais, cônjuges, filhos' + (m.corte.casas.some(c => c.chefe === p.id) ? ', chefe da casa' : '') + ').' +
          (C().titulosDe(m, p.id).length ? ' Os títulos que tem ficam vagos.' : '') + ' Dá para desfazer.' });
      if (!ok || !K.mesmoMapa(m.id)) return;
      if (mudarCorte('tirar ' + p.nome + ' da corte', c => { const n = c.pessoas.length; c.pessoas = c.pessoas.filter(x => x.id !== p.id); if (c.pessoas.length === n) return false; }) !== false) K.avisoDesfazer(p.nome + ' saiu da corte.');
      return;
    }
    const ok = mudarCorte(p ? 'mudar ' + p.nome : 'criar ' + v.nome, c => {
      if (!p) { if (c.pessoas.length >= (LIM('personagens') || 400)) return false; c.pessoas.push(Object.assign({ id: N().novoId('ps') }, v)); return; }
      const x = c.pessoas.find(y => y.id === p.id);
      if (!x) return false;
      const ant = JSON.stringify(x);
      Object.assign(x, v);
      // o cônjuge tirado sai dos dois lados (o núcleo põe o que foi posto nos dois)
      for (const q of c.pessoas) if (q.id !== x.id && q.conj.includes(x.id) && !x.conj.includes(q.id)) q.conj = q.conj.filter(z => z !== x.id);
      if (JSON.stringify(x) === ant && !c.pessoas.some(q => q.id !== x.id && q.conj.includes(x.id) !== x.conj.includes(q.id))) return false;
    });
    if (ok !== false) K.avisoDesfazer(p ? v.nome + ': salvo.' : v.nome + ' entrou na corte.');
    // (parte 2b) a morte marcada agora, de quem tem títulos ou é chefe de uma casa: a prévia da sucessão (com "Agora não")
    if (ok !== false && p && !p.morte && v.morte && K.mesmoMapa(m.id) && precisaSucessao(A.mapa, p.id)) await janelaSucessao(p.id);
  }
  /* A janela do cartão (p null: um personagem novo). → os campos (sem o id), { tirar: true }, { sucessao: true } ou null
     (cancelou). */
  function dialogoPessoa(m, p) {
    const K = kit(), { h } = K, Cx = C(), Nx = N();
    return new Promise(resolve => {
      const pessoas = Cx.corteDe(m).pessoas, casas = Cx.corteDe(m).casas, meses = (m.cal && m.cal.meses && m.cal.meses.length ? m.cal.meses : Nx.CAL_PADRAO.meses);
      const opcoes = (k, lista, valor) => { const s = h('select', { 'data-k': k }, lista.map(([v0, t]) => h('option', { value: v0, text: t }))); s.value = valor == null ? '' : valor; if (s.value !== (valor == null ? '' : valor)) s.value = ''; return s; };
      const inp = (k, v0, o2) => h('input', Object.assign({ type: 'text', 'data-k': k, value: v0 == null ? '' : String(v0), autocomplete: 'off' }, o2 || {}));
      const txt = (k, v0, ph) => { const t = h('textarea', { 'data-k': k, rows: 3, maxlength: LIM('textoCorte') || 600, placeholder: ph }); t.value = v0 || ''; return t; };
      const nome = inp('ps:nome', p ? p.nome : '', { maxlength: 80, placeholder: 'Ex.: Ana do Vale' });
      const gen = opcoes('ps:gen', [['', '—'], ['h', 'Homem'], ['m', 'Mulher'], ['o', 'Outro']], p ? p.gen : '');
      const casa = opcoes('ps:casa', [['', 'Sem casa']].concat(casas.map(c => [c.id, c.nome])), p ? p.casa : '');
      const fac = opcoes('ps:fac', [['', 'Sem facção']].concat(m.faccoes.map(f => [f.id, K.nomeFac(f)])), p ? p.fac : (filtroFac || ''));
      const cargo = h('select', { 'data-k': 'ps:cargo' });
      const pintarCargos = () => { const atual = cargo.value || (p ? p.cargo : ''), l = Cx.cargosDe(m, fac.value); cargo.replaceChildren(h('option', { value: '', text: fac.value ? 'Nenhum' : 'Escolha a facção' }), ...l.map(c => h('option', { value: c.id, text: c.nome }))); cargo.value = l.some(c => c.id === atual) ? atual : ''; cargo.disabled = !fac.value; };
      fac.addEventListener('change', pintarCargos);
      pintarCargos();
      // as datas: o ano (pode ser negativo) e, se souber, o mês e o dia
      const data = (k, dt) => {
        const a = inp(k + ':ano', dt ? dt.a : '', { inputmode: 'numeric', placeholder: 'Ano', 'aria-label': 'Ano', class: 'ano' });
        const ms = opcoes(k + ':mes', [['', 'Mês —']].concat(meses.map((x, i) => [String(i), String(x.nome || 'Mês ' + (i + 1))])), dt && dt.m != null ? String(dt.m) : '');
        const d = inp(k + ':dia', dt && dt.d ? dt.d : '', { inputmode: 'numeric', placeholder: 'Dia', 'aria-label': 'Dia', class: 'dia' });
        return { a, ms, d, el: h('div', { class: 'ps-data' }, a, ms, d) };
      };
      const nasc = data('ps:nasc', p && p.nasc), morte = data('ps:morte', p && p.morte);
      const morreu = h('input', { type: 'checkbox', 'data-k': 'ps:morreu', checked: p && p.morte ? true : null });
      const pintarMorte = () => { morte.el.hidden = !morreu.checked; };
      morreu.addEventListener('change', pintarMorte);
      pintarMorte();
      // os pais: ninguém é antepassado de si mesmo (os descendentes não aparecem)
      const fora = p ? Cx.descendentesDe(m, p.id) : new Set();
      if (p) fora.add(p.id);
      const candidatos = pessoas.filter(q => !fora.has(q.id)).map(q => [q.id, q.nome + (q.casa ? ' (' + ((casas.find(c => c.id === q.casa) || {}).nome || '') + ')' : '')]);
      const pais = [0, 1].map(i => { const s = opcoes('ps:pai' + i, [['', '—']].concat(candidatos), p && p.pais[i] ? p.pais[i] : ''); s.setAttribute('aria-label', 'Pai ou mãe ' + (i + 1)); return s; });
      // os cônjuges (até quatro): uma linha cada, com o ×
      const outros = pessoas.filter(q => !p || q.id !== p.id).map(q => [q.id, q.nome]);
      const caixaConj = h('div', { class: 'ps-conjs', 'data-k': 'ps:conjs' });
      const bConj = h('button', { type: 'button', class: 'btn sm', 'data-k': 'ps:conj-novo', text: '+ Cônjuge' });
      const linhaConj = valor => {
        const s = opcoes('ps:conj', [['', '—']].concat(outros), valor), x = h('button', { type: 'button', class: 'ib', 'data-k': 'ps:conj-x', title: 'Tirar', 'aria-label': 'Tirar o cônjuge' }, K.glifo(K.X_SVG, 13));
        const l = h('div', { class: 'ps-conj' }, s, x);
        x.addEventListener('click', () => { l.remove(); bConj.disabled = caixaConj.children.length >= (LIM('conjuges') || 4); });
        return l;
      };
      for (const id of p ? p.conj : []) caixaConj.append(linhaConj(id));
      bConj.disabled = !outros.length || caixaConj.children.length >= (LIM('conjuges') || 4);
      bConj.addEventListener('click', () => { if (caixaConj.children.length < (LIM('conjuges') || 4)) caixaConj.append(linhaConj('')); bConj.disabled = caixaConj.children.length >= (LIM('conjuges') || 4); });
      // onde está: uma cidade (ou outro marcador) ou um grupo
      const nomeO = o => K.nomeDe(o, m);
      const lugares = [['', 'Nenhum lugar (só na lista)']].concat(m.objs.filter(o => o.k === 'm').map(o => ['m:' + o.id, nomeO(o)]).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')),
        m.objs.filter(o => o.k === 'g').map(o => ['g:' + o.id, nomeO(o) + ' (grupo)']).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')));
      const onde = opcoes('ps:onde', lugares, p && p.onde ? p.onde.t + ':' + p.onde.id : '');
      // a ficha das Fichas (numa mesa)
      const fichas = RP() && RP().fichasDaMesa ? RP().fichasDaMesa() : null;
      const ficha = fichas ? opcoes('ps:ficha', [['', 'Nenhuma']].concat(fichas.map(f => [f.id, f.nome || 'Sem nome'])), p ? p.ficha : '') : null;
      const bFicha = ficha && p && p.ficha && window.TC && window.TC.ponte && window.TC.ponte.naCasca ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'ps:ficha-abrir', text: 'Abrir a ficha', onclick: () => RP().abrirFicha(p.ficha) }) : null;
      const ver = h('input', { type: 'checkbox', 'data-k': 'ps:ver', checked: p && p.ver ? true : null });
      const pub = txt('ps:txt', p ? p.txt : '', 'O que se conta por aí…'), nota = txt('ps:nota', p ? p.nota : '', 'Segredos, planos, o que ainda não foi revelado…');
      const titulo = h('h2', { text: p ? p.nome : 'Um personagem novo' });
      titulo.id = 'dl-ps-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bTirar = p ? h('button', { type: 'button', class: 'btn per', 'data-k': 'ps:tirar', text: 'Tirar da corte…' }) : null;
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'ps:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'ps:ok', text: p ? 'Salvar' : 'Criar' });
      const lbl = (t, ...el) => h('label', null, t, ...el);
      // (parte 2a) os títulos em que ele aparece (só para ler: mudam no cartão de cada título)
      const pt = p ? Cx.papeisNosTitulos(m, p.id) : null, herdeiro = p && p.gen === 'm' ? 'herdeira escolhida: ' : 'herdeiro escolhido: ';
      const linhasT = pt ? pt.tem.map(t0 => Cx.tituloDoTitular(m, t0, p) + (t0.desde ? ' (desde ' + Cx.dataTxt(m, t0.desde) + ')' : ''))
        .concat(pt.herdeiro.map(t0 => herdeiro + Cx.nomeDoTitulo(m, t0)), pt.regente.map(t0 => 'regente: ' + Cx.nomeDoTitulo(m, t0)),
          pt.pretende.map(x => 'pretende: ' + Cx.nomeDoTitulo(m, x.titulo) + (x.mot ? ' (' + x.mot + ')' : ''))) : [];
      // (parte 2b) morto, ainda com títulos (ou chefe de uma casa): "Fazer a sucessão…"
      const bSuc = p && p.morte && precisaSucessao(m, p.id) ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'ps:sucessao', text: 'Fazer a sucessão…' }) : null;
      const secT = linhasT.length || bSuc ? h('div', { class: 'ps-titulos', 'data-k': 'ps:titulos' }, h('span', { class: 'ps-rot', text: 'Títulos' }), linhasT.length ? h('ul', null, linhasT.map(l => h('li', { text: l }))) : null,
        h('small', { class: 'ajuda', text: 'Mudam no cartão de cada título (aba Corte, em Títulos).' + (bSuc ? ' Morto: a sucessão passa os títulos (e a chefia da casa) para os herdeiros, com prévia.' : '') }), bSuc ? h('div', { class: 'row' }, bSuc) : null) : null;
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('div', { class: 'lin' }, lbl('Nome', nome), lbl('Gênero', gen)),
        h('div', { class: 'lin' }, lbl('Casa', casa), lbl('Facção', fac), lbl('Cargo na corte', cargo)),
        secT,
        h('div', { class: 'ps-datas' }, h('div', null, h('span', { class: 'ps-rot', text: 'Nascimento' }), nasc.el),
          h('div', null, h('label', { class: 'op' }, morreu, h('span', { text: 'Morreu' })), morte.el)),
        h('small', { class: 'ajuda', text: 'A data do mundo (o calendário do mapa): o ano basta; o mês e o dia, se souber. A idade sai sozinha.' }),
        h('div', { class: 'ps-pais' }, h('span', { class: 'ps-rot', text: 'Pais (até dois)' }), h('div', { class: 'lin' }, pais[0], pais[1])),
        h('div', { class: 'ps-conj-caixa' }, h('span', { class: 'ps-rot', text: 'Cônjuges' }), caixaConj, bConj),
        h('div', { class: 'lin' }, lbl('Onde está', onde), ficha ? lbl('Ficha das Fichas', ficha) : null, bFicha),
        h('label', { class: 'op' }, ver, h('span', { text: 'Os jogadores conhecem (aparece para eles na aba Corte)' })),
        lbl('O que os jogadores sabem', pub), lbl('Nota do mestre (só você vê)', nota),
        err, h('div', { class: 'pe' }, bTirar, h('span', { class: 'esp' }), bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl ps-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      // lê uma data: null sem o ano; erro com o mês ou o dia sem o ano, o dia sem o mês ou fora do mês
      const lerData = (d, rot) => {
        const a0 = String(d.a.value).trim(), mi = d.ms.value, d0 = String(d.d.value).trim();
        if (!a0) { if (mi || d0) throw new Error(rot + ': escreva o ano.'); return null; }
        const a = K.lerNum(a0);
        if (!Number.isInteger(a) || Math.abs(a) > 1e6) throw new Error(rot + ': o ano é um número inteiro (pode ser negativo).');
        const out = { a };
        if (mi !== '') out.m = Number(mi);
        if (d0) {
          if (mi === '') throw new Error(rot + ': o dia precisa do mês.');
          const dd = K.lerNum(d0), max = Math.max(1, Math.round(Number(meses[out.m].dias) || 30));
          if (!Number.isInteger(dd) || dd < 1 || dd > max) throw new Error(rot + ': o dia vai de 1 a ' + max + '.');
          out.d = dd;
        }
        return out;
      };
      const antes = (x, y) => x.a !== y.a ? x.a < y.a : x.m == null || y.m == null || x.m !== y.m ? (x.m == null || y.m == null ? false : x.m < y.m) : (x.d == null || y.d == null ? false : x.d < y.d);
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        try {
          const n0 = nome.value.trim();
          if (!n0) throw new Error('Escreva o nome.');
          const dn = lerData(nasc, 'O nascimento'), dm = morreu.checked ? lerData(morte, 'A morte') : null;
          if (morreu.checked && !dm) throw new Error('A morte: escreva ao menos o ano.');
          if (dn && dm && antes(dm, dn)) throw new Error('A morte vem antes do nascimento.');
          const ps0 = [...new Set(pais.map(s => s.value).filter(Boolean))];
          const cj = [...new Set([...caixaConj.querySelectorAll('select')].map(s => s.value).filter(Boolean))];
          const on = onde.value ? { t: onde.value.slice(0, 1), id: onde.value.slice(2) } : null;
          fim({ nome: n0, gen: gen.value, casa: casa.value || null, fac: fac.value || null, cargo: fac.value && cargo.value ? cargo.value : null, nasc: dn, morte: dm,
            pais: ps0, conj: cj, onde: on, ficha: ficha ? ficha.value || null : p ? p.ficha : null, txt: pub.value.trim(), nota: nota.value.trim(), ver: ver.checked });
        } catch (e) { err.textContent = (e && e.message) || 'Confira o que foi escrito.'; }
      });
      if (bTirar) bTirar.addEventListener('click', () => fim({ tirar: true }));
      if (bSuc) bSuc.addEventListener('click', () => fim({ sucessao: true }));
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      nome.focus(); if (!p) nome.select();
    });
  }

  /* ---------------- a casa ---------------- */
  async function janelaCasa(id) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m) return;
    const casa = id ? C().casaDe(m, id) : null;
    if (id && !casa) return;
    const v = await dialogoCasa(m, casa);
    if (!v || !K.mesmoMapa(m.id)) return;
    if (v.tirar) {
      const n = C().membrosDe(m, casa.id).length;
      const ok = await K.confirmar({ titulo: 'Tirar a casa ' + casa.nome + '?', ok: 'Tirar', perigo: true,
        texto: (n ? (n === 1 ? 'A pessoa dela fica sem casa' : 'As ' + n + ' pessoas dela ficam sem casa') + ' (continuam na corte). ' : '') + 'Dá para desfazer.' });
      if (!ok || !K.mesmoMapa(m.id)) return;
      if (mudarCorte('tirar a casa ' + casa.nome, c => { const n0 = c.casas.length; c.casas = c.casas.filter(x => x.id !== casa.id); if (c.casas.length === n0) return false; }) !== false) K.avisoDesfazer('A casa ' + casa.nome + ' saiu.');
      return;
    }
    const ok = mudarCorte(casa ? 'mudar a casa ' + casa.nome : 'criar a casa ' + v.nome, c => {
      if (!casa) { if (c.casas.length >= (LIM('casas') || 80)) return false; c.casas.push(Object.assign({ id: N().novoId('cs') }, v)); return; }
      const x = c.casas.find(y => y.id === casa.id);
      if (!x) return false;
      const ant = JSON.stringify(x);
      Object.assign(x, v);
      if (JSON.stringify(x) === ant) return false;
    });
    if (ok !== false) K.avisoDesfazer(casa ? v.nome + ': salva.' : 'A casa ' + v.nome + ' entrou na corte.');
  }
  // a janela da casa (casa null: uma nova) → { nome, lema, chefe, br }, { tirar: true } ou null
  function dialogoCasa(m, casa) {
    const K = kit(), { h } = K, Cl = window.ClaNucleo;
    return new Promise(resolve => {
      let br = casa && casa.br ? JSON.parse(JSON.stringify(casa.br)) : null, aberta = false;
      const inp = (k, v0, o2) => h('input', Object.assign({ type: 'text', 'data-k': k, value: v0 || '', autocomplete: 'off' }, o2 || {}));
      const nome = inp('cs:nome', casa ? casa.nome : '', { maxlength: 60, placeholder: 'Ex.: Casa do Vale' }), lema = inp('cs:lema', casa ? casa.lema : '', { maxlength: 120, placeholder: 'Ex.: Firmes como a pedra' });
      const membros = casa ? C().membrosDe(m, casa.id) : [];
      const chefe = h('select', { 'data-k': 'cs:chefe', disabled: !membros.length || null }, [h('option', { value: '', text: membros.length ? 'Ninguém' : 'Ninguém na casa ainda' })].concat(membros.map(p => h('option', { value: p.id, text: p.nome + (p.morte ? ' (†)' : '') }))));
      chefe.value = casa && casa.chefe ? casa.chefe : '';
      const previa = h('div', { class: 'cs-br', 'data-k': 'cs:br' });
      const bBr = h('button', { type: 'button', class: 'btn sm', 'data-k': 'cs:br-editar' }), bSemBr = h('button', { type: 'button', class: 'btn sm', 'data-k': 'cs:br-tirar', text: 'Tirar o brasão' });
      const pintarBr = () => { previa.replaceChildren(brasaoEl(br, 40) || h('span', { class: 'note', text: 'Sem brasão.' })); bBr.textContent = br ? 'Editar o brasão…' : 'Criar o brasão…'; bSemBr.hidden = !br; };
      bBr.addEventListener('click', async () => {
        if (aberta || !RP() || !RP().dialogoBandeira || !Cl) return;
        aberta = true;
        const cor = Cl.CORES && Cl.CORES[0] ? Cl.CORES[0] : '#8a2a2a', n0 = nome.value.trim() || 'a casa nova';
        try { const v0 = await RP().dialogoBandeira({ nome: n0, cor, band: br }, false, { titulo: 'O brasão de ' + n0, criar: 'Criar o brasão' }); if (v0) br = v0; }
        finally { aberta = false; pintarBr(); if (dl.open) nome.focus(); }
      });
      bSemBr.addEventListener('click', () => { br = null; pintarBr(); });
      pintarBr();
      const titulo = h('h2', { text: casa ? casa.nome : 'Uma casa nova' });
      titulo.id = 'dl-cs-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bTirar = casa ? h('button', { type: 'button', class: 'btn per', 'data-k': 'cs:tirar', text: 'Tirar a casa…' }) : null;
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'cs:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'cs:ok', text: casa ? 'Salvar' : 'Criar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('div', { class: 'lin' }, h('label', null, 'Nome', nome), h('label', null, 'Chefe', chefe)),
        h('label', null, 'Lema', lema),
        h('div', { class: 'cs-br-caixa' }, previa, h('div', { class: 'row' }, bBr, bSemBr)),
        h('small', { class: 'ajuda', text: casa ? 'Os membros: quem tem esta casa no cartão.' : 'Depois de criar, ponha a casa no cartão de cada personagem; o chefe é um deles.' }),
        err, h('div', { class: 'pe' }, bTirar, h('span', { class: 'esp' }), bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl cs-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        if (aberta) return;
        const n0 = nome.value.trim();
        if (!n0) { err.textContent = 'Escreva o nome da casa.'; return; }
        fim({ nome: n0, lema: lema.value.trim(), chefe: chefe.value || null, br });
      });
      if (bTirar) bTirar.addEventListener('click', () => fim({ tirar: true }));
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => { if (!aberta) fim(null); });
      dl.addEventListener('cancel', ev => { if (aberta) ev.preventDefault(); });
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      nome.focus();
    });
  }

  /* ---------------- os cargos da corte de uma facção ---------------- */
  async function janelaCargos() {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m || !m.faccoes.length) return;
    const v = await dialogoCargos(m);
    if (!v || !K.mesmoMapa(m.id)) return;
    const f = K.facDe(m, v.fac);
    if (mudarCorte('mudar os cargos da corte de ' + (f ? K.nomeFac(f) : 'a facção'), c => {
      const ant = JSON.stringify(c.cargos[v.fac] || null);
      // (igual aos de começo: volta a eles, sem guardar a lista)
      if (v.comeco || JSON.stringify(v.lista) === JSON.stringify(N().CARGOS_INICIAIS)) delete c.cargos[v.fac]; else c.cargos[v.fac] = v.lista;
      if (JSON.stringify(c.cargos[v.fac] || null) === ant) return false;
    }) !== false) K.avisoDesfazer('Os cargos da corte de ' + (f ? K.nomeFac(f) : 'a facção') + ' estão salvos.');
  }
  // → { fac, lista: [{ id, nome }] } ou { fac, comeco: true } (voltar aos de começo) ou null
  function dialogoCargos(m) {
    const K = kit(), { h } = K;
    return new Promise(resolve => {
      const fac = h('select', { 'data-k': 'cg:fac' }, m.faccoes.map(f => h('option', { value: f.id, text: K.nomeFac(f) })));
      fac.value = filtroFac && m.faccoes.some(f => f.id === filtroFac) ? filtroFac : m.faccoes[0].id;
      const caixa = h('div', { class: 'cg-lista', 'data-k': 'cg:lista' }), bNovo = h('button', { type: 'button', class: 'btn sm', 'data-k': 'cg:novo', text: '+ Cargo' });
      const bComeco = h('button', { type: 'button', class: 'btn sm', 'data-k': 'cg:comeco', text: 'Voltar aos de começo' });
      let comeco = false;
      const max = LIM('cargos') || 16;
      const linhaC = c => {
        const i = h('input', { type: 'text', 'data-k': 'cg:nome', value: c.nome, maxlength: 40, autocomplete: 'off', 'aria-label': 'Nome do cargo' });
        i.dataset.id = c.id;
        i.addEventListener('input', () => { comeco = false; });
        const x = h('button', { type: 'button', class: 'ib', 'data-k': 'cg:x', title: 'Tirar', 'aria-label': 'Tirar o cargo' }, K.glifo(K.X_SVG, 13));
        const l = h('div', { class: 'cg-linha' }, i, x);
        x.addEventListener('click', () => { l.remove(); comeco = false; pintarBotoes(); });
        return l;
      };
      const pintarBotoes = () => { bNovo.disabled = caixa.children.length >= max; };
      const encher = () => { comeco = false; caixa.replaceChildren(...C().cargosDe(m, fac.value).map(linhaC)); pintarBotoes(); };
      fac.addEventListener('change', encher);
      bNovo.addEventListener('click', () => { if (caixa.children.length >= max) return; const l = linhaC({ id: N().novoId('cg'), nome: '' }); caixa.append(l); comeco = false; pintarBotoes(); l.querySelector('input').focus(); });
      bComeco.addEventListener('click', () => { caixa.replaceChildren(...N().CARGOS_INICIAIS.map(linhaC)); comeco = true; pintarBotoes(); });
      encher();
      const titulo = h('h2', { text: 'Cargos da corte' });
      titulo.id = 'dl-cg-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'cg:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'cg:ok', text: 'Salvar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('label', null, 'Facção', fac), caixa, h('div', { class: 'row' }, bNovo, bComeco),
        h('small', { class: 'ajuda', text: 'Cada facção tem os seus cargos (o conselheiro, o marechal…). Quem tinha um cargo que sair fica sem cargo.' }),
        err, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl cg-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        const lista = [...caixa.querySelectorAll('input')].map(i => ({ id: i.dataset.id, nome: i.value.trim() }));
        if (lista.some(c => !c.nome)) { err.textContent = 'Dê um nome a cada cargo (ou tire o que está vazio).'; return; }
        fim(comeco ? { fac: fac.value, comeco: true } : { fac: fac.value, lista });
      });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      fac.focus();
    });
  }

  /* ---------------- (parte 1b) a árvore da família ----------------
     Uma janela grande com a árvore desenhada da casa (MundoCorte.arvoreDaCasa): cada pessoa numa caixa (o nome e os
     anos; o morto com a cruz e mais apagado; quem casou com alguém da casa, com a borda tracejada), os casais ligados por
     uma linha e os filhos pendurados no meio dos pais. Rola nas duas direções; "−", "+" e "Ajustar" mudam o tamanho.
     Para quem mestra, clicar numa pessoa abre o cartão dela (e a árvore se refaz ao salvar); para quem joga, só os
     conhecidos (é a projeção que chega a eles). */
  const SVG = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => { const e = document.createElementNS(SVG, tag); for (const k of Object.keys(attrs || {})) e.setAttribute(k, attrs[k]); return e; };
  let arvoreAberta = false;
  function anosTxt(m, p) {
    const n = p.nasc ? p.nasc.a : null, mo = p.morte ? p.morte.a : null;
    if (n != null && mo != null) return n + ' – ' + mo;
    if (n != null) return 'n. ' + n;
    return mo != null ? '† ' + mo : '';
  }
  function desenharArvore(m, casaId, aoClicar) {
    const t = C().arvoreDaCasa(m, casaId), { LAR, ALT } = C().ARVORE, M = 16;
    const svg = el('svg', { viewBox: (-M) + ' ' + (-M) + ' ' + (t.larg + 2 * M) + ' ' + (t.alt + 2 * M), class: 'arv-svg', role: 'img', 'aria-label': 'A árvore da família' });
    const pos = new Map(t.nos.map(n => [n.id, n])), linhas = el('g', { class: 'arv-linhas' }), caixas = el('g', { class: 'arv-caixas' });
    // os casais: lado a lado, uma linha entre as caixas; longe um do outro, um arco por cima
    for (const [a, b] of t.casais) {
      const pa = pos.get(a), pb = pos.get(b), y = pa.y + ALT / 2;
      if (pa.y === pb.y && pb.x - pa.x <= LAR + C().ARVORE.VAO + 1) linhas.append(el('line', { x1: pa.x + LAR, y1: y, x2: pb.x, y2: y, class: 'arv-casal' }));
      else linhas.append(el('path', { d: 'M' + (pa.x + LAR / 2) + ' ' + pa.y + ' C' + (pa.x + LAR / 2) + ' ' + (pa.y - 34) + ' ' + (pb.x + LAR / 2) + ' ' + (pb.y - 34) + ' ' + (pb.x + LAR / 2) + ' ' + pb.y, class: 'arv-casal longe' }));
    }
    // os filhos: do meio dos pais (ou de baixo do pai que está na árvore) até o alto da caixa do filho
    for (const f of t.filhos) {
      const pf = pos.get(f.id), pp = f.pais.map(id => pos.get(id));
      const juntos = pp.length === 2 && pp[0].y === pp[1].y && t.casais.some(([a, b]) => (a === f.pais[0] && b === f.pais[1]) || (a === f.pais[1] && b === f.pais[0]));
      const x0 = juntos ? (pp[0].x + LAR + pp[1].x) / 2 : pp[0].x + LAR / 2, y0 = juntos ? pp[0].y + ALT / 2 : pp[0].y + ALT;
      const meio = pf.y - C().ARVORE.VAO_G / 2, x1 = pf.x + LAR / 2;
      linhas.append(el('path', { d: 'M' + x0 + ' ' + y0 + ' V' + meio + ' H' + x1 + ' V' + pf.y, class: 'arv-filho' }));
    }
    for (const n of t.nos) {
      const p = C().pessoaDe(m, n.id), morto = !!p.morte, fora = p.casa !== casaId;
      const g = el('g', { class: 'arv-p' + (morto ? ' morto' : '') + (fora ? ' fora' : ''), transform: 'translate(' + n.x + ' ' + n.y + ')', 'data-p': p.id, tabindex: aoClicar ? '0' : '-1' });
      if (aoClicar) g.setAttribute('role', 'button');
      g.append(el('rect', { width: LAR, height: ALT, rx: 9 }));
      const nome = el('text', { x: 10, y: 20, class: 'arv-nome' }), anos = el('text', { x: 10, y: 37, class: 'arv-anos' });
      nome.textContent = (morto ? '† ' : '') + (p.nome.length > 20 ? p.nome.slice(0, 19) + '…' : p.nome);
      anos.textContent = anosTxt(m, p) || (fora ? 'de fora da casa' : '');
      const tit = el('title'); tit.textContent = p.nome + (anosTxt(m, p) ? ' (' + anosTxt(m, p) + ')' : '');
      g.append(tit, nome, anos);
      if (aoClicar) {
        g.addEventListener('click', () => aoClicar(p.id));
        g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); aoClicar(p.id); } });
      }
      caixas.append(g);
    }
    svg.append(linhas, caixas);
    return { svg, t };
  }
  async function janelaArvore(casaId) {
    const A = app(), K = kit(), { h } = K;
    if (arvoreAberta) return;
    const v0 = A.vista(), casa = v0 ? C().casaDe(v0, casaId) : null;
    if (!casa) return;
    arvoreAberta = true;
    const ed = A.podeEditar(), idMapa = A.mapa && A.mapa.id;
    let zoom = 1, ajustado = true;
    const caixa = h('div', { class: 'arv-caixa', 'data-k': 'arv:caixa' });
    const bMenos = h('button', { type: 'button', class: 'btn sm', 'data-k': 'arv:menos', 'aria-label': 'Diminuir', text: '−' }), bMais = h('button', { type: 'button', class: 'btn sm', 'data-k': 'arv:mais', 'aria-label': 'Aumentar', text: '+' });
    const bAjustar = h('button', { type: 'button', class: 'btn sm', 'data-k': 'arv:ajustar', text: 'Ajustar' }), rotZoom = h('span', { class: 'arv-zoom', 'data-k': 'arv:zoom' });
    const titulo = h('h2', { text: 'Árvore da família: ' + casa.nome });
    titulo.id = 'dl-arv-' + Date.now().toString(36);
    const bFechar = h('button', { type: 'button', class: 'btn pri', 'data-k': 'arv:fechar', text: 'Fechar' });
    const legenda = h('small', { class: 'ajuda', 'data-k': 'arv:legenda', text: (ed ? 'Clique numa pessoa para abrir o cartão dela. ' : '') + '† morto · borda tracejada: casou com alguém da casa.' + (ed ? '' : ' Só quem vocês conhecem.') });
    let atual = null;
    const tamanho = () => { if (!atual) return; const { t } = atual, w = (t.larg + 32) * zoom, hh = (t.alt + 32) * zoom; atual.svg.setAttribute('width', String(Math.round(w))); atual.svg.setAttribute('height', String(Math.round(hh))); rotZoom.textContent = Math.round(zoom * 100) + '%'; };
    const ajustar = () => { if (!atual) return; const larg = Math.max(200, caixa.clientWidth - 8), alt = Math.max(160, Math.min(window.innerHeight * 0.62, 620) - 8), { t } = atual; zoom = Math.max(0.3, Math.min(1.4, larg / (t.larg + 32), alt / (t.alt + 32))); ajustado = true; tamanho(); };
    async function abrirCartao(id) {
      await janelaPessoa(id);
      if (dl.open) pintar();
    }
    function pintar() {
      const m = A.vista();
      if (!m || (idMapa && A.mapa && A.mapa.id !== idMapa) || !C().casaDe(m, casaId)) { fim(); return; }
      atual = desenharArvore(m, casaId, ed ? abrirCartao : null);
      caixa.replaceChildren(atual.t.nos.length ? atual.svg : h('p', { class: 'note', text: 'Ninguém nesta casa ainda.' }));
      if (ajustado) ajustar(); else tamanho();
    }
    const form = h('form', { class: 'dl', novalidate: true }, titulo, h('div', { class: 'row arv-ctl' }, bMenos, rotZoom, bMais, bAjustar), caixa, legenda, h('div', { class: 'pe' }, bFechar));
    const dl = h('dialog', { class: 'mundo-dl arv-dl', 'aria-labelledby': titulo.id }, form);
    let feito = false;
    const fim = () => { if (feito) return; feito = true; arvoreAberta = false; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); };
    bMenos.addEventListener('click', () => { zoom = Math.max(0.3, Math.round((zoom - 0.1) * 10) / 10); ajustado = false; tamanho(); });
    bMais.addEventListener('click', () => { zoom = Math.min(2, Math.round((zoom + 0.1) * 10) / 10); ajustado = false; tamanho(); });
    bAjustar.addEventListener('click', ajustar);
    bFechar.addEventListener('click', fim);
    form.addEventListener('submit', ev => { ev.preventDefault(); fim(); });
    dl.addEventListener('close', fim);
    dl.addEventListener('keydown', ev => ev.stopPropagation());
    document.body.append(dl);
    dl.showModal();
    pintar();
    bFechar.focus();
  }

  /* ---------------- (parte 2a) os títulos ----------------
     Na aba Corte, "Títulos": a lista por reino (o governante no alto de cada um), com "+ Título" e "Graus e
     maioridade…"; cada título abre o cartão dele (o grau, a terra, o "de quê" ou o nome livre, o reino, o titular e
     desde quando, o herdeiro escolhido, o regente, os pretendentes com o motivo, os titulares de antes, o que os
     jogadores sabem e a nota). Na região, na cidade (e nos lugares que podem ter senhor) e na facção, os títulos de
     lá e "+ Título desta região…". Trocar o titular no cartão põe o de antes nos titulares de antes (uma caixa, que
     já vem marcada). Nada muda até "Salvar"; tudo vale num passo de Desfazer. */
  const LUGAR_TITULO = new Set(['cidade', 'vila', 'castelo', 'porto', 'templo', 'torre']);
  // o grau de começo de um título novo, pela terra: a facção, Reino; a região de fora, Ducado; a de dentro, Condado; o lugar, Baronia
  function grauPadrao(m, preso) {
    const gs = C().grausDe(m), tem = id => (gs.some(g => g.id === id) ? id : '');
    if (!preso) return '';
    if (preso.t === 'f') return tem('reino') || (gs[0] ? gs[0].id : '');
    if (preso.t === 'm') return tem('baronia') || (gs.length ? gs[gs.length - 1].id : '');
    const r = m.objs.find(o => o.id === preso.id);
    return (r && r.pai ? tem('condado') : tem('ducado')) || (gs[0] ? gs[0].id : '');
  }
  // a facção da terra (a região: a dela ou a de fora; o lugar: a da região onde ele está)
  function facDaTerra(m, preso) {
    if (!preso) return '';
    if (preso.t === 'f') return preso.id;
    const o = m.objs.find(x => x.id === preso.id);
    if (!o) return '';
    const r = o.k === 'r' ? o : N().regiaoEm(m, o.x, o.y);
    return (r && N().facDaRegiao(m, r)) || '';
  }
  // a linha do titular: "Ana do Vale · desde 290 · regente: Caio" (vago; para quem joga, sem titular conhecido)
  function titularTxt(v, t, ed) {
    const p = C().pessoaDe(v, t.tit), r = C().pessoaDe(v, t.reg);
    if (!p) return ed ? 'vago' : 'sem titular conhecido';
    return [p.nome + (p.morte ? ' († o titular morreu)' : ''), t.desde ? 'desde ' + C().dataTxt(v, t.desde) : '', r ? 'regente: ' + r.nome : ''].filter(Boolean).join(' · ');
  }
  const listaNomes = ns => (ns.length <= 1 ? ns.join('') : ns.slice(0, -1).join(', ') + ' e ' + ns[ns.length - 1]);
  const anosDe = (x, y) => (x || y ? ' (' + (x ? x.a : '?') + ' – ' + (y ? y.a : '?') + ')' : '');
  function itemTitulo(v, t, ed) {
    const K = kit(), { h } = K, p = C().pessoaDe(v, t.tit);
    if (ed) {
      return h('button', { type: 'button', class: 'li clic corte-t', 'data-k': 't:' + t.id, onclick: () => janelaTitulo(t.id) },
        h('span', { class: 'tx' }, h('b', { text: C().nomeDoTitulo(v, t) }), h('small', { text: titularTxt(v, t, true) })),
        p && C().menorDeIdade(v, p) ? h('span', { class: 'tag', title: 'O titular é menor de idade', text: 'menor' }) : null);
    }
    // para quem joga: o que vai na projeção (as pessoas, só as conhecidas)
    const herd = C().pessoaDe(v, t.herd), pret = t.pret.map(x => { const q = C().pessoaDe(v, x.p); return q ? q.nome + (x.mot ? ' (' + x.mot + ')' : '') : ''; }).filter(Boolean);
    const antes = t.hist.map(x => x.nome + anosDe(x.de, x.ate));
    return h('div', { class: 'corte-pub corte-t', 'data-k': 't:' + t.id },
      h('b', { text: C().nomeDoTitulo(v, t) }), h('small', { text: titularTxt(v, t, false) + (p && C().menorDeIdade(v, p) ? ' (menor de idade)' : '') }),
      h('small', { class: 'corte-suc', text: 'sucessão: ' + C().textoRegra(C().regraDe(v, t)) }),     // (parte 4a) a regra, em texto curto
      herd ? h('small', { text: (herd.gen === 'm' ? 'herdeira escolhida: ' : 'herdeiro escolhido: ') + herd.nome }) : null,
      pret.length ? h('small', { text: (pret.length === 1 ? 'pretendente: ' : 'pretendentes: ') + listaNomes(pret) }) : null,
      antes.length ? h('small', { class: 'corte-lacos', text: 'antes: ' + antes.join(', ') }) : null,
      t.txt ? h('p', { class: 'publico', text: t.txt }) : null);
  }
  // o topo da aba: "Corte" e a escolha entre as casas e os títulos (só nesta página)
  let vistaCorte = 'casas';
  function topoCorte() {
    const { h } = kit();
    const bt = (k, tx) => h('button', { type: 'button', 'data-k': 'corte:vista:' + k, 'aria-pressed': String(vistaCorte === k),
      onclick: () => { if (vistaCorte === k) return; vistaCorte = k; kit().pintar(); const pane = document.getElementById('pane'); if (pane) pane.scrollTop = 0; } }, tx);
    return h('div', { class: 'corte-topo' }, h('h3', { text: 'Corte' }), h('div', { class: 'seg', role: 'group', 'aria-label': 'Mostrar as casas ou os títulos' }, bt('casas', 'Casas'), bt('titulos', 'Títulos')));
  }
  function abaTitulos(v) {
    const K = kit(), { h, nota, botao, linha, campoEscolha } = K, ed = app().podeEditar(), ts = C().corteDe(v).titulos || [], out = [];
    if (ed) out.push(linha(botao('+ Título', () => janelaTitulo(null), { c: 'pri sm', k: 'tt:novo', off: ts.length >= (LIM('titulos') || 200) }),
      botao('Graus e maioridade…', () => janelaGraus(), { c: 'sm', k: 'tt:graus' })));
    if (!ts.length) {
      out.push(nota(ed ? 'Nenhum título ainda. Os títulos de nobreza (Ducado de Valmor, Reino de Arvel…) ficam presos a uma região, a uma cidade ou a uma facção — ou sem terra (Grão-Mestre da Ordem). Crie aqui ou no cartão da região, da cidade e da facção.'
        : 'Nenhum título conhecido ainda.'));
      return out;
    }
    if (filtroFac && !K.facDe(v, filtroFac)) filtroFac = '';
    if (v.faccoes.length) out.push(campoEscolha('corte:fac', 'Facção', filtroFac, [['', 'Todas as facções']].concat(v.faccoes.map(f => [f.id, K.nomeFac(f)])), x => { filtroFac = x; return false; }));
    const lista = h('div', { class: 'corte-lista', 'data-k': 'tt:lista' });
    const grupos = v.faccoes.filter(f => !filtroFac || f.id === filtroFac).map(f => [f, ts.filter(t => t.fac === f.id)]);
    if (!filtroFac) grupos.push([null, ts.filter(t => !t.fac || !K.facDe(v, t.fac))]);
    for (const [f, l] of grupos) if (l.length) lista.append(blocoReino(v, f, C().porGrau(v, l), ed));
    if (!lista.children.length) lista.append(nota('Nenhum título desta facção.'));
    out.push(lista);
    if (!ed) out.push(nota('Só os que vocês conhecem.'));
    return out;
  }
  // o governante de uma facção, em texto: "Governante: Ana do Vale, Rainha de Arvel" ('' sem ele)
  function governanteTxt(v, fid) {
    const g = C().governanteDe(v, fid);
    return g ? 'Governante: ' + g.pessoa.nome + ', ' + C().tituloDoTitular(v, g.titulo, g.pessoa) + (g.pessoa.morte ? ' (†)' : '') : '';
  }
  function blocoReino(v, f, l, ed) {
    const K = kit(), { h } = K, gov = f ? governanteTxt(v, f.id) : '';
    const cab = h('div', { class: 'corte-casa-cab', 'data-k': 'reino:' + (f ? f.id : '-') },
      f ? K.bandeiraFac(f.id, 18) || h('i', { class: 'corte-bola', style: { background: f.cor }, 'aria-hidden': 'true' }) : null,
      h('span', { class: 'tx' }, h('b', { text: f ? K.nomeFac(f) : 'Sem reino' }), h('small', { text: [gov ? gov.replace(/^Governante/, 'governante') : '', K.plural(l.length, 'título', 'títulos')].filter(Boolean).join(' · ') })));
    return h('div', { class: 'corte-casa corte-reino', 'data-reino': f ? f.id : '-' }, cab, l.map(t => itemTitulo(v, t, ed)));
  }
  // na região e na cidade (e nos lugares que podem ter senhor): os títulos de lá
  function secTitulos(o, v) {
    if (!o || (o.k !== 'r' && o.k !== 'm')) return null;
    const K = kit(), { h } = K, ed = app().podeEditar(), ts = C().titulosDaTerra(v, o.k, o.id);
    if (!ts.length && !(ed && (o.k === 'r' || LUGAR_TITULO.has(o.ic) || o.ass))) return null;
    return K.secao(ts.length > 1 ? 'Títulos' : 'Título', ts.length ? h('div', { class: 'corte-aqui', 'data-k': 'o:' + o.id + ':titulos' }, ts.map(t => itemTitulo(v, t, ed))) : null,
      ed ? K.linha(K.botao(o.k === 'r' ? '+ Título desta região…' : '+ Título deste lugar…', () => janelaTitulo(null, { preso: { t: o.k, id: o.id } }), { c: 'sm', k: 'o:' + o.id + ':titulo-novo' })) : null);
  }
  // na facção (aba Reinos, para quem mestra): os títulos presos a ela
  function secTitulosFac(f, v) {
    const K = kit(), { h } = K, ts = C().titulosDaTerra(v, 'f', f.id);
    return K.secao('Títulos do reino', ts.length ? h('div', { class: 'corte-aqui', 'data-k': 'f:' + f.id + ':titulos' }, ts.map(t => itemTitulo(v, t, true)))
      : K.nota('Nenhum título preso a esta facção. Quem tem o maior deles é o governante.'),
    K.linha(K.botao('+ Título deste reino…', () => janelaTitulo(null, { preso: { t: 'f', id: f.id } }), { c: 'sm', k: 'f:' + f.id + ':titulo-novo' })));
  }

  /* o cartão do título (id null: um novo; padrao: { preso } para começar preso a uma terra) */
  async function janelaTitulo(id, padrao) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m) return;
    const t = id ? C().tituloDe(m, id) : null;
    if (id && !t) return;
    const v = await dialogoTitulo(m, t, padrao || null);
    if (!v || !K.mesmoMapa(m.id)) return;
    if (v.sucessao) { await janelaSucessao(t.tit); return; }      // (parte 2b) o titular morreu: a sucessão
    const nome0 = t ? C().nomeDoTitulo(m, t) : '';
    if (v.tirar) {
      const ok = await K.confirmar({ titulo: 'Tirar o título ' + nome0 + '?', ok: 'Tirar', perigo: true, texto: 'Sai da corte, com os titulares de antes e os pretendentes. Dá para desfazer.' });
      if (!ok || !K.mesmoMapa(m.id)) return;
      if (mudarCorte('tirar o título ' + nome0, c => { const n = c.titulos.length; c.titulos = c.titulos.filter(x => x.id !== t.id); if (c.titulos.length === n) return false; }) !== false) K.avisoDesfazer('O título ' + nome0 + ' saiu.');
      return;
    }
    const nome1 = C().nomeDoTitulo(m, Object.assign({ id: '' }, v));
    const ok = mudarCorte(t ? 'mudar o título ' + nome0 : 'criar o título ' + nome1, c => {
      if (!t) { if (c.titulos.length >= (LIM('titulos') || 200)) return false; c.titulos.push(Object.assign({ id: N().novoId('tt') }, v)); return; }
      const x = c.titulos.find(y => y.id === t.id);
      if (!x) return false;
      const ant = JSON.stringify(x);
      Object.assign(x, v);
      if (JSON.stringify(x) === ant) return false;
    });
    if (ok !== false) K.avisoDesfazer(t ? nome1 + ': salvo.' : 'O título ' + nome1 + ' entrou na corte.');
  }
  // os campos de uma data do mundo (o ano, o mês e o dia) e a leitura deles (null sem o ano)
  function campoDataMundo(k, dt, meses) {
    const { h } = kit();
    const a = h('input', { type: 'text', 'data-k': k + ':ano', value: dt ? String(dt.a) : '', inputmode: 'numeric', placeholder: 'Ano', 'aria-label': 'Ano', autocomplete: 'off', class: 'ano' });
    const ms = h('select', { 'data-k': k + ':mes', 'aria-label': 'Mês' }, [h('option', { value: '', text: 'Mês —' })].concat(meses.map((x, i) => h('option', { value: String(i), text: String(x.nome || 'Mês ' + (i + 1)) }))));
    ms.value = dt && dt.m != null ? String(dt.m) : '';
    const d = h('input', { type: 'text', 'data-k': k + ':dia', value: dt && dt.d ? String(dt.d) : '', inputmode: 'numeric', placeholder: 'Dia', 'aria-label': 'Dia', autocomplete: 'off', class: 'dia' });
    const por = x => { a.value = x ? String(x.a) : ''; ms.value = x && x.m != null ? String(x.m) : ''; d.value = x && x.d ? String(x.d) : ''; };
    return { a, ms, d, por, el: h('div', { class: 'ps-data' }, a, ms, d) };
  }
  function lerDataMundo(d, rot, meses) {
    const K = kit(), a0 = String(d.a.value).trim(), mi = d.ms.value, d0 = String(d.d.value).trim();
    if (!a0) { if (mi || d0) throw new Error(rot + ': escreva o ano.'); return null; }
    const a = K.lerNum(a0);
    if (!Number.isInteger(a) || Math.abs(a) > 1e6) throw new Error(rot + ': o ano é um número inteiro (pode ser negativo).');
    const out = { a };
    if (mi !== '') out.m = Number(mi);
    if (d0) {
      if (mi === '') throw new Error(rot + ': o dia precisa do mês.');
      const dd = K.lerNum(d0), max = Math.max(1, Math.round(Number(meses[out.m].dias) || 30));
      if (!Number.isInteger(dd) || dd < 1 || dd > max) throw new Error(rot + ': o dia vai de 1 a ' + max + '.');
      out.d = dd;
    }
    return out;
  }
  /* A janela do cartão do título. → os campos (sem o id), { tirar: true } ou null (cancelou). */
  function dialogoTitulo(m, t, padrao) {
    const K = kit(), { h } = K, Cx = C();
    return new Promise(resolve => {
      const pessoas = Cx.corteDe(m).pessoas, graus = Cx.grausDe(m), meses = m.cal && m.cal.meses && m.cal.meses.length ? m.cal.meses : N().CAL_PADRAO.meses;
      const LP = LIM('pretendentes') || 8, LH = LIM('titularesAntes') || 40;
      const escolha = (k, lista, valor, rot) => {
        const s = h('select', { 'data-k': k, 'aria-label': rot || null }, lista.map(([v0, tx]) => h('option', { value: v0, text: tx })));
        s.value = valor == null ? '' : valor;
        if (s.value !== (valor == null ? '' : String(valor))) s.value = '';
        return s;
      };
      const inp = (k, v0, o2) => h('input', Object.assign({ type: 'text', 'data-k': k, value: v0 == null ? '' : String(v0), autocomplete: 'off' }, o2 || {}));
      const area = (k, v0, ph) => { const x = h('textarea', { 'data-k': k, rows: 3, maxlength: LIM('textoCorte') || 600, placeholder: ph }); x.value = v0 || ''; return x; };
      const nomeP = p => p.nome + (p.morte ? ' (†)' : '');
      const opPessoas = vazio => [['', vazio]].concat(pessoas.map(p => [p.id, nomeP(p)]));
      const pessoa = id => (id ? pessoas.find(p => p.id === id) || null : null);
      // a terra: as regiões, os lugares que podem ter senhor e as facções
      const preso0 = t ? t.preso : padrao && padrao.preso ? padrao.preso : null;
      const porNome = (a, b) => a[1].localeCompare(b[1], 'pt-BR');
      const I = N().ICONES;
      const regs = m.objs.filter(o => o.k === 'r').map(o => ['r:' + o.id, K.nomeDe(o, m)]).sort(porNome);
      const lugs = m.objs.filter(o => o.k === 'm' && (LUGAR_TITULO.has(o.ic) || o.ass || (preso0 && preso0.id === o.id))).map(o => ['m:' + o.id, K.nomeDe(o, m) + ' (' + String((I[o.ic] || I.cidade).nome).toLowerCase() + ')']).sort(porNome);
      const facs = m.faccoes.map(f => ['f:' + f.id, K.nomeFac(f)]);
      const grupoOp = (rot, l) => (l.length ? h('optgroup', { label: rot }, l.map(([v0, tx]) => h('option', { value: v0, text: tx }))) : null);
      const presoSel = h('select', { 'data-k': 'tt:preso' }, h('option', { value: '', text: 'Nada (um título sem terra)' }), grupoOp('Regiões', regs), grupoOp('Cidades e lugares', lugs), grupoOp('Facções', facs));
      presoSel.value = preso0 ? preso0.t + ':' + preso0.id : '';
      if (preso0 && presoSel.value !== preso0.t + ':' + preso0.id) presoSel.value = '';
      const lerPreso = () => (presoSel.value ? { t: presoSel.value.slice(0, 1), id: presoSel.value.slice(2) } : null);
      const grau = escolha('tt:grau', [['', 'Sem grau (um nome livre)']].concat(graus.map(g => [g.id, g.nome])), t ? t.grau : grauPadrao(m, preso0));
      const de = inp('tt:de', t ? t.de : '', { maxlength: 80 }), nomeL = inp('tt:nome', t ? t.nome : '', { maxlength: 80, placeholder: 'Ex.: Grão-Mestre da Ordem do Sol' });
      const rotDe = h('label', null, 'De quê', de), rotNome = h('label', null, 'Nome do título', nomeL);
      const fac = escolha('tt:fac', [['', 'Sem reino']].concat(m.faccoes.map(f => [f.id, K.nomeFac(f)])), t ? t.fac : facDaTerra(m, preso0));
      const tit = escolha('tt:tit', opPessoas('Ninguém (vago)'), t ? t.tit : '');
      const desde = campoDataMundo('tt:desde', t ? t.desde : null, meses);
      const pAntes = t ? pessoa(t.tit) : null;
      const antes = h('input', { type: 'checkbox', 'data-k': 'tt:antes', checked: true });
      const rotAntes = h('label', { class: 'op', hidden: true }, antes, h('span', { text: pAntes ? 'Pôr ' + pAntes.nome + ' nos titulares de antes (até hoje)' : '' }));
      const herd = escolha('tt:herd', opPessoas('Nenhum (a regra decide)'), t ? t.herd : ''), reg = escolha('tt:reg', opPessoas('Nenhum'), t ? t.reg : '');
      // (parte 2b) a regra de sucessão (a do reino, ou a do título) e a linha de sucessão (os próximos, só para ler)
      const F = N().FORMAS_SUC, G = N().GENEROS_SUC;
      const regra = escolha('tt:regra', [['', 'A do reino']].concat(Object.keys(F).map(k => [k, F[k]])), t && t.regra ? t.regra.forma : '');
      const regraGen = escolha('tt:regra-gen', Object.keys(G).map(k => [k, G[k]]), t && t.regra ? t.regra.gen : 'igual');
      const lerRegra = () => (regra.value ? { forma: regra.value, gen: regraGen.value } : null);
      const linhaSuc = h('ol', { class: 'tt-linha-suc', 'data-k': 'tt:linha' });
      const pMorto = t ? pessoa(t.tit) : null;
      const bSucT = pMorto && pMorto.morte ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'tt:sucessao', text: 'Fazer a sucessão…' }) : null;
      const previa = h('p', { class: 'tt-previa', 'data-k': 'tt:previa' });
      // novo: o grau e o reino seguem a terra até a pessoa mexer neles
      let grauMexido = !!t, facMexido = !!t, desdeMexido = false;
      const pintar = () => {
        rotDe.hidden = !grau.value; rotNome.hidden = !!grau.value;
        const pr = lerPreso(), x = { grau: grau.value || null, de: de.value.trim(), nome: nomeL.value.trim(), preso: pr }, n = Cx.nomeDaTerra(m, x);
        de.placeholder = n ? 'de ' + n : 'Ex.: das Ilhas';
        const g = Cx.grauDe(m, x), q = pessoa(tit.value), dq = Cx.deQue(m, x);
        const formas = g ? [...new Set([g.h, g.m, g.o].filter(Boolean))].map(f0 => f0 + (dq ? ' ' + dq : '')) : [];
        const ou = formas.length <= 1 ? formas.join('') : formas.slice(0, -1).join(', ') + ' ou ' + formas[formas.length - 1];
        previa.textContent = Cx.nomeDoTitulo(m, x) + (q ? ' · ' + q.nome + (g ? ': ' + Cx.tituloDoTitular(m, x, q) : '') : ou ? ' · quem tem: ' + ou : '');
        // (parte 2b) a regra (a do reino, com o nome dela) e a linha de sucessão de agora
        const rr = Cx.regraDoReino(m, fac.value || null);
        regra.options[0].textContent = 'A do reino: ' + Cx.textoRegra(rr);
        if (!regra.value) regraGen.value = rr.gen;
        regraGen.disabled = !regra.value || regra.value === 'eletiva';
        const tx = { id: t ? t.id : '', fac: fac.value || null, tit: tit.value || null, herd: herd.value || null, regra: lerRegra(), hist: t ? t.hist : [], pret: [] };
        const ls = Cx.linhaDeSucessao(m, tx, 5);
        linhaSuc.replaceChildren(...(ls.length ? ls.map(y => { const z = pessoa(y.id), i0 = Cx.idadeDe(m, z); return h('li', { text: z.nome + ' (' + y.por + (i0 != null && i0 >= 0 ? ', ' + K.plural(i0, 'ano', 'anos') : '') + ')' }); })
          : [h('li', { class: 'vazia', text: Cx.regraDe(m, tx).forma === 'eletiva' && !tx.herd ? 'O mestre escolhe na hora.' : 'Ninguém na linha (sem titular, ou sem parentes vivos na corte).' })]));
        // trocar o titular: o de antes vai para os titulares de antes (a caixa) e o "desde" vira hoje
        const trocou = !!pAntes && tit.value !== pAntes.id;
        rotAntes.hidden = !trocou;
        if (!desdeMexido) desde.por(trocou && tit.value ? Cx.hoje(m) : t ? t.desde : null);
      };
      presoSel.addEventListener('change', () => { const pr = lerPreso(); if (!grauMexido) grau.value = grauPadrao(m, pr); if (!facMexido) fac.value = facDaTerra(m, pr); pintar(); });
      grau.addEventListener('change', () => { grauMexido = true; pintar(); });
      fac.addEventListener('change', () => { facMexido = true; pintar(); });
      for (const el of [herd, regra, regraGen]) el.addEventListener('change', pintar);
      for (const el of [de, nomeL]) el.addEventListener('input', pintar);
      tit.addEventListener('change', pintar);
      for (const el of [desde.a, desde.ms, desde.d]) { el.addEventListener('input', () => { desdeMexido = true; }); el.addEventListener('change', () => { desdeMexido = true; }); }
      // os pretendentes (com o motivo) e os titulares de antes: uma linha cada, com o ×
      const caixaPret = h('div', { class: 'tt-lista', 'data-k': 'tt:prets' }), bPret = h('button', { type: 'button', class: 'btn sm', 'data-k': 'tt:pret-novo', text: '+ Pretendente' });
      const travarPret = () => { bPret.disabled = !pessoas.length || caixaPret.children.length >= LP; };
      const linhaPret = x => {
        const s = escolha('tt:pret', opPessoas('—'), x ? x.p : '', 'Pretendente'), mo = inp('tt:pret-mot', x ? x.mot : '', { maxlength: 120, placeholder: 'Motivo (ex.: filho do rei deposto)', 'aria-label': 'Motivo' });
        const bx = h('button', { type: 'button', class: 'ib', 'data-k': 'tt:pret-x', title: 'Tirar', 'aria-label': 'Tirar o pretendente' }, K.glifo(K.X_SVG, 13));
        const l = h('div', { class: 'tt-linha tt-pret' }, s, mo, bx);
        bx.addEventListener('click', () => { l.remove(); travarPret(); });
        return l;
      };
      for (const x of t ? t.pret : []) caixaPret.append(linhaPret(x));
      bPret.addEventListener('click', () => { if (caixaPret.children.length >= LP) return; const l = linhaPret(null); caixaPret.append(l); travarPret(); l.querySelector('select').focus(); });
      travarPret();
      const caixaHist = h('div', { class: 'tt-lista', 'data-k': 'tt:hists' }), bHist = h('button', { type: 'button', class: 'btn sm', 'data-k': 'tt:hist-novo', text: '+ Titular de antes' });
      const travarHist = () => { bHist.disabled = caixaHist.children.length >= LH; };
      const linhaHist = x => {
        const s = escolha('tt:hist-p', [['', 'Escrever o nome…']].concat(pessoas.map(p => [p.id, nomeP(p)])), x ? x.p : '', 'Quem');
        const nm = inp('tt:hist-nome', x && !x.p ? x.nome : '', { maxlength: 80, placeholder: 'Ex.: Aldric I', 'aria-label': 'Nome' });
        const a = inp('tt:hist-de', x && x.de ? x.de.a : '', { inputmode: 'numeric', placeholder: 'De (ano)', 'aria-label': 'De (ano)', class: 'ano' });
        const b = inp('tt:hist-ate', x && x.ate ? x.ate.a : '', { inputmode: 'numeric', placeholder: 'Até (ano)', 'aria-label': 'Até (ano)', class: 'ano' });
        const bx = h('button', { type: 'button', class: 'ib', 'data-k': 'tt:hist-x', title: 'Tirar', 'aria-label': 'Tirar da lista' }, K.glifo(K.X_SVG, 13));
        const l = h('div', { class: 'tt-linha tt-hist' }, s, nm, a, b, bx);
        l._orig = x || null;
        const ver = () => { nm.hidden = !!s.value; };
        s.addEventListener('change', ver);
        ver();
        bx.addEventListener('click', () => { l.remove(); travarHist(); });
        return l;
      };
      for (const x of t ? t.hist : []) caixaHist.append(linhaHist(x));
      bHist.addEventListener('click', () => { if (caixaHist.children.length >= LH) return; const l = linhaHist(null); caixaHist.append(l); travarHist(); l.querySelector('select').focus(); });
      travarHist();
      const pub = area('tt:txt', t ? t.txt : '', 'O que se conta por aí…'), nota = area('tt:nota', t ? t.nota : '', 'Planos, segredos, quem cobiça o título…');
      const titulo = h('h2', { text: t ? Cx.nomeDoTitulo(m, t) : 'Um título novo' });
      titulo.id = 'dl-tt-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bTirar = t ? h('button', { type: 'button', class: 'btn per', 'data-k': 'tt:tirar', text: 'Tirar o título…' }) : null;
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'tt:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'tt:ok', text: t ? 'Salvar' : 'Criar' });
      const lbl = (tx, ...el) => h('label', null, tx, ...el);
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('div', { class: 'lin' }, lbl('Grau', grau), lbl('Preso a', presoSel)),
        h('div', { class: 'lin' }, rotDe, rotNome, lbl('Reino', fac)),
        previa,
        h('div', { class: 'tt-tit' }, h('div', { class: 'lin' }, lbl('Titular', tit)), h('div', null, h('span', { class: 'ps-rot', text: 'Desde' }), desde.el)),
        rotAntes,
        h('div', { class: 'lin' }, lbl('Herdeiro escolhido', herd), lbl('Regente', reg)),
        h('small', { class: 'ajuda', text: 'O herdeiro escolhido passa na frente da regra de sucessão. O regente governa pelo titular menor de idade (maioridade: ' + Cx.maioridadeDe(m) + ' anos).' }),
        h('div', { class: 'tt-suc' }, h('div', { class: 'lin' }, lbl('Regra de sucessão', regra), lbl('Gênero', regraGen)),
          h('span', { class: 'ps-rot', text: 'A linha de sucessão (os próximos)' }), linhaSuc, bSucT ? h('div', { class: 'row' }, bSucT) : null),
        h('div', { class: 'tt-caixa' }, h('span', { class: 'ps-rot', text: 'Pretendentes (quem reclama o título)' }), caixaPret, bPret),
        h('div', { class: 'tt-caixa' }, h('span', { class: 'ps-rot', text: 'Titulares de antes' }), caixaHist, bHist),
        lbl('O que os jogadores sabem', pub), lbl('Nota do mestre (só você vê)', nota),
        err, h('div', { class: 'pe' }, bTirar, h('span', { class: 'esp' }), bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl tt-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      const lerAno = (el, rot) => { const s = String(el.value).trim(); if (!s) return null; const a = K.lerNum(s); if (!Number.isInteger(a) || Math.abs(a) > 1e6) throw new Error(rot + ': o ano é um número inteiro (pode ser negativo).'); return a; };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        try {
          const g = grau.value || null, pr = lerPreso(), de0 = g ? de.value.trim() : '', nome0 = g ? '' : nomeL.value.trim();
          if (g && !pr && !de0) throw new Error('Diga de quê é o título (ex.: “das Ilhas”) ou prenda-o a uma terra.');
          if (!g && !nome0) throw new Error('Escreva o nome do título.');
          const ti = tit.value || null, he = herd.value || null, re = reg.value || null;
          if (he && he === ti) throw new Error('O herdeiro escolhido não pode ser o próprio titular.');
          if (re && re === ti) throw new Error('O regente não pode ser o próprio titular.');
          const ds = ti ? lerDataMundo(desde, 'Desde', meses) : null;
          const pret = [], vistos = new Set();
          for (const l of caixaPret.children) {
            const p0 = l.querySelector('select').value, mot = l.querySelector('input').value.trim();
            if (!p0) { if (mot) throw new Error('Escolha quem é cada pretendente (ou tire a linha).'); continue; }
            if (p0 === ti) throw new Error('O titular não pode ser pretendente do próprio título.');
            if (!vistos.has(p0)) { vistos.add(p0); pret.push({ p: p0, mot }); }
          }
          const hist = [];
          for (const l of caixaHist.children) {
            const [s, nm, a, b] = l.querySelectorAll('select, input'), o0 = l._orig, p0 = s.value || null, n0 = p0 ? (pessoa(p0) || {}).nome || '' : nm.value.trim();
            const ya = lerAno(a, 'Os titulares de antes'), yb = lerAno(b, 'Os titulares de antes');
            if (!p0 && !n0) { if (ya != null || yb != null) throw new Error('Cada titular de antes precisa de um nome (ou tire a linha).'); continue; }
            // (o ano que não mudou guarda o mês e o dia de antes)
            const dataDe = (y, ant) => (y == null ? null : ant && ant.a === y ? ant : { a: y });
            hist.push({ p: p0, nome: n0, de: dataDe(ya, o0 && o0.de), ate: dataDe(yb, o0 && o0.ate) });
          }
          if (pAntes && ti !== pAntes.id && antes.checked && hist.length < LH) hist.push({ p: pAntes.id, nome: pAntes.nome, de: t.desde, ate: Cx.hoje(m) });
          fim({ grau: g, de: de0, nome: nome0, preso: pr, fac: fac.value || null, tit: ti, desde: ds, herd: he, reg: re, regra: lerRegra(), pret, hist, txt: pub.value.trim(), nota: nota.value.trim() });
        } catch (e) { err.textContent = (e && e.message) || 'Confira o que foi escrito.'; }
      });
      if (bTirar) bTirar.addEventListener('click', () => fim({ tirar: true }));
      if (bSucT) bSucT.addEventListener('click', () => fim({ sucessao: true }));
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      pintar();
      (t ? tit : grau).focus();
    });
  }

  /* os graus dos títulos (do maior para o menor) e a maioridade */
  async function janelaGraus() {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m) return;
    const v = await dialogoGraus(m);
    if (!v || !K.mesmoMapa(m.id)) return;
    let semGrau = 0;
    const ok = mudarCorte('mudar os graus dos títulos', (c, mm) => {
      semGrau = 0;
      const ant = JSON.stringify([c.graus || null, c.maior == null ? null : c.maior]), ids = new Set((v.graus || N().GRAUS_INICIAIS).map(g => g.id));
      // o título de um grau que sai fica sem grau, com o nome de agora (como nome livre)
      for (const t of c.titulos) if (t.grau && !ids.has(t.grau)) { t.nome = C().nomeDoTitulo(mm, t); t.grau = null; t.de = ''; semGrau++; }
      if (v.graus) c.graus = v.graus; else delete c.graus;
      if (v.maior === N().MAIORIDADE) delete c.maior; else c.maior = v.maior;
      if (JSON.stringify([c.graus || null, c.maior == null ? null : c.maior]) === ant && !semGrau) return false;
    });
    if (ok !== false) K.avisoDesfazer('Os graus estão salvos.' + (semGrau ? ' ' + (semGrau === 1 ? 'Um título ficou' : semGrau + ' títulos ficaram') + ' sem grau, com o nome de antes.' : ''));
  }
  // → { graus: [...] | null (os de começo), maior } ou null
  function dialogoGraus(m) {
    const K = kit(), { h } = K;
    return new Promise(resolve => {
      const max = LIM('graus') || 12, caixa = h('div', { class: 'gr-lista', 'data-k': 'gr:lista' });
      const bNovo = h('button', { type: 'button', class: 'btn sm', 'data-k': 'gr:novo', text: '+ Grau' }), bComeco = h('button', { type: 'button', class: 'btn sm', 'data-k': 'gr:comeco', text: 'Voltar aos de começo' });
      let comeco = false;
      const inp = (k, v0, ph, rot) => { const i = h('input', { type: 'text', 'data-k': k, value: v0 || '', maxlength: 40, autocomplete: 'off', placeholder: ph, 'aria-label': rot }); i.addEventListener('input', () => { comeco = false; }); return i; };
      const ib = (k, rot, conteudo) => h('button', { type: 'button', class: 'ib', 'data-k': k, title: rot, 'aria-label': rot }, conteudo);
      const linhaG = g => {
        const sobe = ib('gr:sobe', 'Subir', '↑'), desce = ib('gr:desce', 'Descer', '↓'), x = ib('gr:x', 'Tirar', K.glifo(K.X_SVG, 13));
        const l = h('div', { class: 'gr-linha' }, inp('gr:nome', g.nome, 'Ducado', 'Nome do grau'), inp('gr:h', g.h, 'Duque', 'Homem'), inp('gr:m', g.m, 'Duquesa', 'Mulher'), inp('gr:o', g.o, '(o de homem)', 'Outro'), sobe, desce, x);
        l.dataset.id = g.id;
        sobe.addEventListener('click', () => { if (l.previousElementSibling) { caixa.insertBefore(l, l.previousElementSibling); comeco = false; } });
        desce.addEventListener('click', () => { if (l.nextElementSibling) { caixa.insertBefore(l.nextElementSibling, l); comeco = false; } });
        x.addEventListener('click', () => { l.remove(); comeco = false; travar(); });
        return l;
      };
      const travar = () => { bNovo.disabled = caixa.children.length >= max; };
      caixa.append(...C().grausDe(m).map(linhaG));
      travar();
      bNovo.addEventListener('click', () => { if (caixa.children.length >= max) return; const l = linhaG({ id: N().novoId('gr'), nome: '', h: '', m: '', o: '' }); caixa.append(l); comeco = false; travar(); l.querySelector('input').focus(); });
      bComeco.addEventListener('click', () => { caixa.replaceChildren(...N().GRAUS_INICIAIS.map(linhaG)); comeco = true; travar(); });
      const maior = h('input', { type: 'text', 'data-k': 'gr:maior', value: String(C().maioridadeDe(m)), inputmode: 'numeric', autocomplete: 'off', class: 'gr-maior' });
      const titulo = h('h2', { text: 'Graus e maioridade' });
      titulo.id = 'dl-gr-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'gr:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'gr:ok', text: 'Salvar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('small', { class: 'ajuda', text: 'Do maior para o menor. Cada grau: o nome (Ducado) e o de quem tem — homem, mulher e outro (vazio: o de homem). Quem usava um grau que sair fica sem grau, com o nome de agora.' }),
        h('div', { class: 'gr-linha gr-cab', 'aria-hidden': 'true' }, h('span', { text: 'Grau' }), h('span', { text: 'Homem' }), h('span', { text: 'Mulher' }), h('span', { text: 'Outro' })),
        caixa, h('div', { class: 'row' }, bNovo, bComeco),
        h('label', { class: 'gr-maior-rot' }, 'Maioridade (anos)', maior),
        h('small', { class: 'ajuda', text: 'Abaixo dela, o titular é menor de idade (aparece “menor” e ele pode ter um regente).' }),
        err, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl gr-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        const lista = [...caixa.children].map(l => { const [a, b, c, d] = l.querySelectorAll('input'); return { id: l.dataset.id, nome: a.value.trim(), h: b.value.trim(), m: c.value.trim(), o: d.value.trim() }; });
        if (lista.some(g => !g.nome)) { err.textContent = 'Dê um nome a cada grau (ou tire o que está vazio).'; return; }
        const n = K.lerNum(String(maior.value).trim());
        if (!Number.isInteger(n) || n < 0 || n > (LIM('maioridade') || 100)) { err.textContent = 'A maioridade vai de 0 a ' + (LIM('maioridade') || 100) + ' anos.'; return; }
        fim({ graus: comeco || JSON.stringify(lista) === JSON.stringify(N().GRAUS_INICIAIS) ? null : lista, maior: n });
      });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      caixa.querySelector('input') ? caixa.querySelector('input').focus() : bNovo.focus();
    });
  }

  /* ---------------- (parte 2b) a sucessão ----------------
     Na facção (aba Reinos), a regra de sucessão do reino (a forma e o gênero; de começo, primogenitura, homens e mulheres
     por igual). Quando o mestre marca a morte de quem tem títulos (ou é chefe de uma casa), abre a prévia: cada título
     com o herdeiro da regra (e a linha dele), o regente quando o herdeiro é menor de idade, o novo chefe da casa e a
     caixa (desmarcada) para a notícia no rascunho do Jornal. Nada muda até "Aplicar" (tudo num passo de Desfazer, o
     Jornal junto); "Agora não" deixa os títulos com o morto — "Fazer a sucessão…" no cartão do título e no dele. */
  const precisaSucessao = (m, pid) => !!pid && (C().titulosDe(m, pid).length > 0 || C().corteDe(m).casas.some(c => c.chefe === pid));
  function secSucessaoFac(f, v) {
    const K = kit(), N_ = N(), r = C().regraDoReino(v, f.id), F = N_.FORMAS_SUC, G = N_.GENEROS_SUC, nomeF = K.nomeFac(f);
    const grava = mexe => x => mudarCorte('mudar a sucessão de ' + nomeF, c => {
      const ant = JSON.stringify((c.regras || {})[f.id] || null), nova = mexe(Object.assign({}, (c.regras || {})[f.id] || N_.REGRA_PADRAO), x);
      if (!c.regras) c.regras = {};
      if (nova.forma === N_.REGRA_PADRAO.forma && nova.gen === N_.REGRA_PADRAO.gen) delete c.regras[f.id]; else c.regras[f.id] = nova;
      if (JSON.stringify(c.regras[f.id] || null) === ant) return false;
    });
    return K.secao('Sucessão',
      K.campoEscolha('f:' + f.id + ':suc-forma', 'Forma', r.forma, Object.keys(F).map(k => [k, F[k]]), grava((rr, x) => Object.assign(rr, { forma: x }))),
      K.campoEscolha('f:' + f.id + ':suc-gen', 'Gênero', r.gen, Object.keys(G).map(k => [k, G[k]]), grava((rr, x) => Object.assign(rr, { gen: x })), { off: r.forma === 'eletiva' }),
      K.nota('A regra dos títulos deste reino (cada título pode ter a sua, no cartão dele). O herdeiro escolhido de um título passa na frente.'));
  }
  // a prévia da sucessão de alguém; aplicar faz tudo num passo de Desfazer (o rascunho do Jornal junto)
  let sucessaoAberta = false;
  async function janelaSucessao(pid) {
    const A = app(), K = kit(), m = A.mapa;
    if (sucessaoAberta || !A.podeEditar() || !m || !precisaSucessao(m, pid)) return;
    const plano = C().sucessaoDe(m, pid);
    if (!plano) return;
    const jornal = !!(A.temJornal && A.temJornal());
    sucessaoAberta = true;
    let v = null;
    try { v = await dialogoSucessao(m, plano, jornal); } finally { sucessaoAberta = false; }
    if (!v || !K.mesmoMapa(m.id)) return;
    const p = plano.pessoa, data = p.morte || C().hoje(m), antes = C().nomeComTitulo(m, p);
    let feitos = 0;
    const ok = mudarCorte('a sucessão de ' + p.nome, c => { feitos = C().aplicarSucessao(c, p.id, v.escolhas, plano.casa ? v.chefe : undefined, data); if (!feitos && !plano.casa) return false; });
    if (ok === false) return;
    // a notícia no rascunho do Jornal (o Desfazer da sucessão tira, o Refazer põe de novo)
    let jtxt = '';
    if (jornal && v.jornal) {
      const mm = A.mapa, linhas = v.escolhas.map(e => { const t = C().tituloDe(mm, e.titulo), q = C().pessoaDe(mm, e.herdeiro), rg = C().pessoaDe(mm, e.regente); return '**' + (t ? C().nomeDoTitulo(mm, t) : 'Título') + ':** ' + (q ? q.nome + (t ? ', ' + C().tituloDoTitular(mm, t, q) : '') + (rg && t && t.reg === rg.id ? ' (regente: ' + rg.nome + ')' : '') : 'fica vago'); });
      if (plano.casa) { const q = C().pessoaDe(mm, v.chefe); linhas.push('**Chefe (' + plano.casa.casa.nome + '):** ' + (q ? q.nome : 'ninguém por enquanto')); }
      const mat = { id: 'mt_suc_' + p.id + '_' + Date.now().toString(36), tit: 'Morreu ' + antes, txt: antes + ' morreu (' + C().dataTxt(mm, data) + ').\n\n' + linhas.join('\n'), ass: '', dest: false };
      const MAXM = ((window.JornalNucleo && window.JornalNucleo.MAX) || {}).materias || 30;
      let cheio = false;
      const por = () => A.mudarRascunhoJornal(jx => { if (jx.materias.some(x => x.id === mat.id)) return false; if (jx.materias.length >= MAXM) { cheio = true; return false; } jx.materias.push(Object.assign({}, mat)); });
      const tirar = () => A.mudarRascunhoJornal(jx => { const n0 = jx.materias.length; jx.materias = jx.materias.filter(x => x.id !== mat.id); if (jx.materias.length === n0) return false; });
      if (por()) { A.foraDoPasso({ desfazer: tirar, refazer: por }); jtxt = ' A notícia foi para o rascunho do Jornal.'; }
      else jtxt = ' A notícia não foi para o Jornal' + (cheio ? ': o rascunho já tem ' + MAXM + ' matérias.' : '.');
    }
    K.avisoDesfazer('A sucessão de ' + p.nome + ' está feita.' + jtxt);
  }
  // → { escolhas: [{ titulo, herdeiro, regente }], chefe, jornal } ou null ("Agora não")
  function dialogoSucessao(m, plano, jornal) {
    const K = kit(), { h } = K, Cx = C(), p = plano.pessoa;
    return new Promise(resolve => {
      const vivos = Cx.corteDe(m).pessoas.filter(q => Cx.vivo(q) && q.id !== p.id).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      const pessoa = id => Cx.pessoaDe(m, id);
      const linhas = plano.itens.map(it => {
        const t = it.titulo, naLinha = it.linha.map(x => x.id);
        const s = h('select', { 'data-k': 'suc:' + t.id, 'aria-label': 'Quem herda ' + Cx.nomeDoTitulo(m, t) },
          it.linha.length ? h('optgroup', { label: 'A linha de sucessão' }, it.linha.map((x, i) => h('option', { value: x.id, text: (i + 1) + '. ' + pessoa(x.id).nome + ' (' + x.por + ')' }))) : null,
          h('option', { value: '', text: 'Ninguém (o título fica vago)' }),
          h('optgroup', { label: 'Outra pessoa' }, vivos.filter(q => !naLinha.includes(q.id)).map(q => h('option', { value: q.id, text: q.nome }))));
        s.value = it.herdeiro || '';
        const rg = h('select', { 'data-k': 'suc:' + t.id + ':reg', 'aria-label': 'Regente' }, h('option', { value: '', text: 'Sem regente' }), vivos.map(q => h('option', { value: q.id, text: q.nome })));
        rg.value = it.regente || '';
        const caixaReg = h('label', { class: 'suc-reg' }, 'Regente (o herdeiro é menor de idade)', rg);
        // o herdeiro menor de idade: a caixa do regente (sem regente escolhido, um dos pais dele, vivo)
        const ver = () => {
          const q = pessoa(s.value), menor = !!(q && Cx.menorDeIdade(m, q));
          caixaReg.hidden = !menor;
          if (menor && !rg.value) { const pp = Cx.paisDe(m, q).find(z => Cx.vivo(z) && z.id !== p.id); if (pp) rg.value = pp.id; }
        };
        s.addEventListener('change', ver);
        ver();
        const el = h('div', { class: 'suc-item', 'data-t': t.id }, h('b', { text: Cx.nomeDoTitulo(m, t) }), h('small', { text: Cx.textoRegra(it.regra) + (it.linha.length ? '' : ' · ninguém na linha: escolha') }), s, caixaReg);
        return { t, s, rg, caixaReg, el };
      });
      let chefe = null;
      if (plano.casa) {
        const membros = vivos.filter(q => q.casa === plano.casa.casa.id);
        chefe = h('select', { 'data-k': 'suc:chefe' }, h('option', { value: '', text: 'Ninguém por enquanto' }), membros.map(q => h('option', { value: q.id, text: q.nome })));
        chefe.value = plano.casa.chefe || '';
      }
      const cxJ = jornal ? h('input', { type: 'checkbox', 'data-k': 'suc:jornal' }) : null;
      const titulo = h('h2', { text: 'A sucessão de ' + p.nome });
      titulo.id = 'dl-suc-' + Date.now().toString(36);
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'suc:nao', text: 'Agora não' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'suc:ok', text: 'Aplicar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('p', { class: 'note', text: (p.morte ? Cx.nomeComTitulo(m, p) + ' morreu (' + Cx.dataTxt(m, p.morte) + '). ' : '') + 'Cada título vai para quem a regra diz; troque se quiser. Nada muda até “Aplicar”.' }),
        linhas.map(x => x.el),
        chefe ? h('label', { class: 'suc-chefe' }, 'Chefe (' + plano.casa.casa.nome + ')', chefe) : null,
        cxJ ? h('label', { class: 'op' }, cxJ, h('span', { text: 'Escrever a notícia no rascunho do Jornal' })) : null,
        h('small', { class: 'ajuda', text: '“Agora não”: os títulos ficam com ' + p.nome + ' (dá para fazer depois, em “Fazer a sucessão…”, no cartão do título ou no dele).' }),
        h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl suc-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        fim({ escolhas: linhas.map(x => ({ titulo: x.t.id, herdeiro: x.s.value || null, regente: x.caixaReg.hidden ? null : x.rg.value || null })), chefe: chefe ? chefe.value || null : null, jornal: !!(cxJ && cxJ.checked) });
      });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      bOk.focus();
    });
  }

  window.MundoCortePainel = { abaCorte, secQuemEsta, janelaPessoa, janelaCasa, janelaCargos, brasaoEl, janelaArvore,
    secTitulos, secTitulosFac, governanteTxt, janelaTitulo, janelaGraus, secSucessaoFac, janelaSucessao };
})();
