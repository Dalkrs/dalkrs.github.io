/* Tiny Cats · Mapa-múndi · a corte no painel (lote 11, parte 1).
   A aba Corte: os personagens do mundo por casa (os sem casa no fim; os mortos recolhidos), com o filtro de facção; para
   quem mestra, "+ Personagem", "+ Casa" e "Cargos da corte…", e cada personagem abre o cartão (uma janela: o nome, o
   gênero, a casa, a facção, o cargo na corte da facção, o nascimento e a morte pela data do mundo, os pais e os cônjuges,
   onde está, a ficha das Fichas, se os jogadores conhecem, o que eles sabem e a nota do mestre); a casa abre a janela
   dela (o nome, o lema, o chefe e o brasão, com o editor do Clã). Para quem joga, os que o mestre marcou como
   conhecidos, só para ler (com os laços entre conhecidos). Na cidade e no grupo, "Quem está aqui". (parte 1b) Na casa,
   "Árvore da família…": a árvore desenhada numa janela grande (clicar numa pessoa abre o cartão).
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
    const K = kit(), { h, nota, botao, linha, campoEscolha } = K, ed = app().podeEditar(), c = C().corteDe(v), out = [h('h3', { text: 'Corte' })];
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
        h('span', { class: 'tx' }, h('b', { text: p.nome }), h('small', { text: rotulo(v, p, !filtroFac) || 'sem data, cargo nem lugar' })),
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
      h('b', { text: p.nome }), r ? h('small', { text: r }) : null, l ? h('small', { class: 'corte-lacos', text: l }) : null,
      p.txt ? h('p', { class: 'publico', text: p.txt }) : null);
  }

  /* ---------------- quem está aqui (na cidade, no grupo) ---------------- */
  function secQuemEsta(o, v) {
    const ps = o && (o.k === 'm' || o.k === 'g') ? C().quemEsta(v, o.id) : [];
    if (!ps.length) return null;
    const K = kit(), { h } = K, ed = app().podeEditar();
    return K.secao('Quem está aqui', h('div', { class: 'corte-aqui', 'data-k': 'o:' + o.id + ':aqui' }, ps.map(p => (ed
      ? h('button', { type: 'button', class: 'li clic corte-p', 'data-k': 'aqui:' + p.id, onclick: () => janelaPessoa(p.id) }, h('span', { class: 'tx' }, h('b', { text: p.nome }), h('small', { text: rotulo(v, p, true) })))
      : cartaoPub(v, p)))));
  }

  /* ---------------- mudar a corte ---------------- */
  function mudarCorte(rotulo0, fn) {
    return app().mudar(rotulo0, mm => { if (!mm.corte) mm.corte = { pessoas: [], casas: [], cargos: {} }; return fn(mm.corte, mm); });
  }

  /* ---------------- o cartão do personagem ---------------- */
  async function janelaPessoa(id) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m) return;
    const p = id ? C().pessoaDe(m, id) : null;
    if (id && !p) return;
    const v = await dialogoPessoa(m, p);
    if (!v || !K.mesmoMapa(m.id)) return;
    if (v.tirar) {
      const ok = await K.confirmar({ titulo: 'Tirar ' + p.nome + ' da corte?', ok: 'Tirar', perigo: true,
        texto: 'Sai da lista e dos laços dos outros (pais, cônjuges, filhos' + (m.corte.casas.some(c => c.chefe === p.id) ? ', chefe da casa' : '') + '). Dá para desfazer.' });
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
  }
  /* A janela do cartão (p null: um personagem novo). → os campos (sem o id), { tirar: true } ou null (cancelou). */
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
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('div', { class: 'lin' }, lbl('Nome', nome), lbl('Gênero', gen)),
        h('div', { class: 'lin' }, lbl('Casa', casa), lbl('Facção', fac), lbl('Cargo na corte', cargo)),
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

  window.MundoCortePainel = { abaCorte, secQuemEsta, janelaPessoa, janelaCasa, janelaCargos, brasaoEl, janelaArvore };
})();
