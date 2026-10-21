/* Tiny Cats · Mapa-múndi · as intrigas e os segredos no painel (lote 11, parte 4).
   A aba Intrigas: o filtro de facção e os segredos (o texto, sobre quem, quem sabe; "boato", "falso" e "revelado"), com
   "+ Segredo". O cartão do segredo: o texto, de quem é (o tipo e qual; ou um segredo do mundo), quem sabe (personagens e
   facções), "É boato" e "É falso", a nota; "Revelar aos jogadores…" (por cima do cartão: o que eles vão ler e a notícia,
   desmarcada, para o rascunho do Jornal) e "Esconder dos jogadores". Quem joga vê os segredos revelados (sobre quem, se
   eles o veem; "boato").
   (parte 4b) As intrigas, acima dos segredos: as abertas (em andamento primeiro; as encerradas recolhidas), com "+ Intriga".
   O cartão da intriga: o nome, o estado, quem trama (personagens e a facção por trás), os alvos, o objetivo, os passos
   (com a caixinha de feito), os segredos que ela usa, quem já sabe, o texto para os jogadores, "Os jogadores veem" e a
   nota. O cartão do segredo mostra as intrigas que o usam. Na prévia da semana, as intrigas em andamento (só o mestre
   vê), cada uma com a caixa, desmarcada, que a mostra aos jogadores. Quem joga vê as mostradas: o texto e o estado.
   Nada muda até "Salvar" (ou "Criar"); tudo vale num passo de Desfazer. Usa as ferramentas do painel (MundoPainel.kit). */
(() => {
  'use strict';
  const kit = () => window.MundoPainel.kit;
  const I = () => window.MundoIntrigas;
  const N = () => window.MundoNucleo;
  const DP = () => window.MundoDiplomaciaPainel;
  const app = () => kit().app();
  const LIM = k => (N().LIMITES || {})[k];
  let filtroFac = '';                        // a facção da aba ('' = todas; só nesta página)
  let encerradasAbertas = false;             // (parte 4b) as intrigas encerradas à mostra (só nesta página)

  const mudarIntr = (rotulo, fn) => app().mudar(rotulo, mm => { if (!mm.intr) mm.intr = { segredos: [], intrigas: [] }; return fn(mm.intr, mm); });
  const curto = (t, n) => (t.length > (n || 60) ? t.slice(0, (n || 60) - 1).trimEnd() + '…' : t);
  // quem sabe, em texto: "Ana, Bento e Aldar" (mais de quatro: "Ana, Bento, Caio e mais 3")
  function quemSabeTxt(v, s) {
    const K = kit(), ns = s.sabem.p.map(id => I().nomeDoDono(v, { t: 'p', id })).concat(s.sabem.f.map(id => { const f = K.facDe(v, id); return f ? K.nomeFac(f) : ''; })).filter(Boolean);
    const l = ns.length > 4 ? ns.slice(0, 3).concat(['mais ' + (ns.length - 3)]) : ns;
    return l.length <= 1 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1];
  }

  /* ---------------- a aba ---------------- */
  function abaIntrigas(v) {
    const K = kit(), { h, nota, botao, linha, campoEscolha } = K, ed = app().podeEditar(), out = [h('h3', { text: 'Intrigas' })];
    if (ed) out.push(linha(botao('+ Intriga', () => janelaIntriga(null), { c: 'pri sm', k: 'in:intriga-nova', off: I().intrDe(v).intrigas.length >= (LIM('intrigas') || 200) }),
      botao('+ Segredo', () => janelaSegredo(null), { c: 'sm', k: 'in:segredo-novo', off: I().intrDe(v).segredos.length >= (LIM('segredos') || 300) })));
    if (filtroFac && !K.facDe(v, filtroFac)) filtroFac = '';
    if (v.faccoes.length) out.push(campoEscolha('in:fac', 'Facção', filtroFac, [['', 'Todas as facções']].concat(v.faccoes.map(f => [f.id, K.nomeFac(f)])), x => { filtroFac = x; return false; }));
    out.push(secIntrigas(v, ed), secSegredos(v, ed));
    out.push(nota(ed ? 'As intrigas e os segredos são seus até você mostrar (no cartão de cada um; as intrigas em andamento, também na prévia da semana).' : 'Só o que vocês descobriram.'));
    return out;
  }
  /* (parte 4b) as intrigas (com o filtro): as abertas (em andamento, planejando, descobertas) e as encerradas recolhidas;
     para quem joga, só as mostradas (o texto para eles e o estado; sem as facções, o filtro não vale para elas) */
  const ABERTAS = ['andamento', 'plano', 'descoberta'];
  const estadoTag = (h, x) => h('span', { class: 'tag' + (x.estado === 'andamento' ? ' tensao' : ''), text: I().ESTADOS[x.estado].toLowerCase() });
  function secIntrigas(v, ed) {
    const K = kit(), { h, secao, nota } = K;
    if (!ed) {
      const vs = I().intrDe(v).intrigas;
      return secao('Intrigas', vs.length ? h('div', { class: 'dp-tratados', 'data-k': 'in:intrigas' }, vs.map(x => h('div', { class: 'corte-pub in-i', 'data-k': 'ig:' + x.id },
        h('div', { class: 'in-s-cab' }, h('p', { class: 'publico', text: x.txtJ }), estadoTag(h, x))))) : nota('Nenhuma intriga à vista ainda.'),
        vs.length && filtroFac ? nota('O filtro de facção vale só para os segredos.') : null);
    }
    const todas = I().intrDe(v).intrigas.filter(x => !filtroFac || I().facsDaIntriga(v, x).has(filtroFac));
    const abertas = todas.filter(x => ABERTAS.includes(x.estado)).sort((a, b) => ABERTAS.indexOf(a.estado) - ABERTAS.indexOf(b.estado)), fechadas = todas.filter(x => !ABERTAS.includes(x.estado));
    const corpo = abertas.map(x => itemIntriga(v, x));
    if (fechadas.length) {
      corpo.push(h('details', { class: 'corte-mortos', 'data-k': 'ig:encerradas', open: encerradasAbertas || null },
        h('summary', { text: 'Encerradas (' + fechadas.length + ')', onclick: function (ev) { ev.preventDefault(); encerradasAbertas = !this.parentNode.open; this.parentNode.open = encerradasAbertas; } }),
        fechadas.map(x => itemIntriga(v, x))));
    }
    return secao('Intrigas', corpo.length ? h('div', { class: 'dp-tratados', 'data-k': 'in:intrigas' }, corpo) : nota(filtroFac ? 'Nenhuma intriga desta facção.' : 'Nenhuma intriga ainda.'));
  }
  function itemIntriga(v, x) {
    const K = kit(), { h } = K, quem = I().quemTramaTxt(v, x), alvos = I().alvosTxt(v, x), sub = [quem ? 'por ' + quem : '', alvos ? 'contra ' + alvos : '', I().passosTxt(x)].filter(Boolean).join(' · ');
    return h('button', { type: 'button', class: 'li clic dp-t in-i', 'data-k': 'ig:' + x.id, onclick: () => janelaIntriga(x.id) },
      h('span', { class: 'tx' }, h('b', { text: I().nomeDaIntriga(x) }), sub ? h('small', { text: sub }) : null,
        h('span', { class: 'in-tags' }, estadoTag(h, x), x.ver ? h('span', { class: 'tag jog', title: 'Os jogadores veem', text: 'mostrada' }) : null)));
  }
  // os segredos (com o filtro): para quem joga, só os revelados (vêm assim na projeção)
  function secSegredos(v, ed) {
    const K = kit(), { h, secao, nota } = K;
    const ss = I().intrDe(v).segredos.filter(s => !filtroFac || I().facsDoSegredo(v, s).has(filtroFac));
    const itens = ss.map(s => {
      const dono = I().nomeDoDono(v, s.de), sub = [dono ? 'sobre ' + dono : '', ed && s.sabem.p.length + s.sabem.f.length ? 'sabem: ' + quemSabeTxt(v, s) : ''].filter(Boolean).join(' · ');
      const tags = [s.boato ? h('span', { class: 'tag', text: 'boato' }) : null, ed && s.falso ? h('span', { class: 'tag tensao', text: 'falso' }) : null,
        ed && s.jog ? h('span', { class: 'tag jog', title: 'Os jogadores sabem', text: 'revelado' }) : null];
      if (!ed) return h('div', { class: 'corte-pub in-s', 'data-k': 'sg:' + s.id }, h('div', { class: 'in-s-cab' }, h('p', { class: 'publico', text: s.txt }), ...tags), sub ? h('small', { text: sub }) : null);
      return h('button', { type: 'button', class: 'li clic dp-t in-s', 'data-k': 'sg:' + s.id, onclick: () => janelaSegredo(s.id) },
        h('span', { class: 'tx' }, h('b', { text: s.txt }), sub ? h('small', { text: sub }) : null), ...tags);
    });
    return secao('Segredos', itens.length ? h('div', { class: 'dp-tratados', 'data-k': 'in:segredos' }, itens) : nota(ed ? (filtroFac ? 'Nenhum segredo desta facção.' : 'Nenhum segredo ainda.') : 'Nenhum segredo descoberto ainda.'));
  }

  /* ---------------- o cartão do segredo ---------------- */
  async function janelaSegredo(id) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m) return;
    const s = id ? I().segredoDe(m, id) : null;
    if (id && !s) return;
    const v = await dialogoSegredo(m, s, !!(A.temJornal && A.temJornal()));
    if (!v || !K.mesmoMapa(m.id)) return;
    if (v.tirar) {
      const usam = I().intrigasQueUsam(m, s.id).length;      // (parte 4b) sai também das intrigas que o usam
      const ok = await K.confirmar({ titulo: 'Tirar o segredo?', ok: 'Tirar', perigo: true, texto: '“' + curto(s.txt) + '” sai da lista' + (usam ? (usam === 1 ? ' e da intriga que o usa' : ' e das ' + usam + ' intrigas que o usam') : '') + '. Dá para desfazer.' });
      if (!ok || !K.mesmoMapa(m.id)) return;
      if (mudarIntr('tirar o segredo', d => { const n = d.segredos.length; d.segredos = d.segredos.filter(x => x.id !== s.id); if (d.segredos.length === n) return false; }) !== false) K.avisoDesfazer('O segredo saiu.');
      return;
    }
    const jog = v.revelar ? true : v.esconder ? false : !!(s && s.jog);
    const ok = mudarIntr(!s ? 'criar o segredo' : v.revelar ? 'revelar o segredo' : v.esconder ? 'esconder o segredo' : 'mudar o segredo', d => {
      if (!s) { if (d.segredos.length >= (LIM('segredos') || 300)) return false; d.segredos.push(Object.assign({ id: N().novoId('sg') }, v.campos, { jog })); return; }
      const x = d.segredos.find(y => y.id === s.id);
      if (!x) return false;
      const ant = JSON.stringify(x);
      Object.assign(x, v.campos, { jog });
      if (JSON.stringify(x) === ant) return false;
    });
    if (ok === false) return;
    const jtxt = v.revelar && v.jornal ? DP().porNoJornal('mt_sg_', v.noticia) : '';
    K.avisoDesfazer(v.revelar ? 'O segredo foi revelado aos jogadores.' + jtxt : v.esconder ? 'O segredo voltou a ser só seu.' : s ? 'O segredo está salvo.' : 'O segredo entrou na lista.');
  }
  /* uma lista de escolhas (os personagens, as facções): as escolhidas como etiquetas com ×, na ordem em que entraram, e o
     seletor "+ …" com as outras → { el, ler() } */
  const VAZIO = { '+ Personagem…': 'Nenhum personagem na Corte ainda.', '+ Facção…': 'Nenhuma facção no mundo ainda.', '+ Segredo…': 'Nenhum segredo ainda (crie na lista dos segredos).' };
  function escolhas(K, k, rot, opcoes, ini, limite) {
    const { h } = K, max = limite || LIM('sabem') || 24, nomes = new Map(opcoes), ordem = ini.filter(id => nomes.has(id));
    // (parte 4b) sem nenhuma escolha no mundo, só o aviso (no lugar do seletor escondido)
    if (!opcoes.length) return { el: h('small', { class: 'ajuda', 'data-k': k, text: VAZIO[rot] || 'Nada para escolher ainda.' }), ler: () => [] };
    const add = h('select', { 'data-k': k + ':add', 'aria-label': rot }), caixa = h('div', { class: 'in-esc', 'data-k': k });
    const pintar = () => {
      caixa.replaceChildren(...ordem.map(id => h('span', { class: 'in-chip', 'data-id': id }, h('span', { text: nomes.get(id) }),
        h('button', { type: 'button', class: 'ib', 'data-k': k + ':x:' + id, title: 'Tirar', 'aria-label': 'Tirar ' + nomes.get(id), onclick: () => { ordem.splice(ordem.indexOf(id), 1); pintar(); } }, K.glifo(K.X_SVG, 11)))), add);
      add.replaceChildren(h('option', { value: '', text: rot }), ...opcoes.filter(o => !ordem.includes(o[0])).map(([id, n]) => h('option', { value: id, text: n })));
      add.value = '';
      add.hidden = ordem.length >= max || ordem.length >= opcoes.length;
    };
    add.addEventListener('change', () => { if (add.value && !ordem.includes(add.value)) { ordem.push(add.value); pintar(); } });
    pintar();
    return { el: caixa, ler: () => ordem.slice() };
  }
  /* → { campos: { txt, de, sabem, boato, falso, nota } } (e revelar: true com jornal e noticia, ou esconder: true), { tirar }
     ou null */
  function dialogoSegredo(m, s, jornal) {
    const K = kit(), { h } = K;
    return new Promise(resolve => {
      const area = (k, v0, ph, rows) => { const x = h('textarea', { 'data-k': k, rows, maxlength: LIM('textoIntriga') || 600, placeholder: ph }); x.value = v0 || ''; return x; };
      const txt = area('sg:txt', s ? s.txt : '', 'O segredo (ex.: o herdeiro é filho do capitão da guarda)…', 3);
      // de quem é: o tipo e qual (sem tipo: um segredo do mundo)
      const TD = I().TIPOS_DONO;
      const tipo = h('select', { 'data-k': 'sg:tipo', 'aria-label': 'De quem é' }, [h('option', { value: '', text: 'Ninguém: um segredo do mundo' })].concat(Object.keys(TD).map(k => h('option', { value: k, text: TD[k] }))));
      const qual = h('select', { 'data-k': 'sg:dono', 'aria-label': 'Qual' });
      const opcoesQual = val => {
        const l = tipo.value ? I().opcoesDeDono(m, tipo.value) : [];
        qual.replaceChildren(h('option', { value: '', text: l.length ? 'Escolha…' : 'Nenhum no mundo' }), ...l.map(([id, n]) => h('option', { value: id, text: n })));
        qual.value = l.some(x => x[0] === val) ? val : '';
        qual.hidden = !tipo.value;
      };
      tipo.value = s && s.de ? s.de.t : '';
      opcoesQual(s && s.de ? s.de.id : '');
      tipo.addEventListener('change', () => opcoesQual(''));
      // quem sabe
      const sabeP = escolhas(K, 'sg:sabe-p', '+ Personagem…', I().opcoesDeDono(m, 'p'), s ? s.sabem.p : []);
      const sabeF = escolhas(K, 'sg:sabe-f', '+ Facção…', I().opcoesDeDono(m, 'f'), s ? s.sabem.f : []);
      const boato = h('input', { type: 'checkbox', 'data-k': 'sg:boato', checked: s && s.boato ? true : null }), falso = h('input', { type: 'checkbox', 'data-k': 'sg:falso', checked: s && s.falso ? true : null });
      const caixaFalso = h('label', { class: 'op sg-falso' }, falso, h('span', { text: 'É falso (só você sabe)' }));
      const verFalso = () => { caixaFalso.hidden = !boato.checked; };
      boato.addEventListener('change', verFalso);
      verFalso();
      const nota = area('sg:nota', s ? s.nota : '', 'O que só você sabe: como isso pode vir à tona…', 2);
      // (parte 4b) as intrigas que usam este segredo (só para saber; muda no cartão da intriga)
      const usam = s ? I().intrigasQueUsam(m, s.id).map(I().nomeDaIntriga) : [];
      const titulo = h('h2', { text: s ? 'O segredo' : 'Um segredo novo' });
      titulo.id = 'dl-sg-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bTirar = s ? h('button', { type: 'button', class: 'btn per', 'data-k': 'sg:tirar', text: 'Tirar…' }) : null;
      const bRevelar = s && !s.jog ? h('button', { type: 'button', class: 'btn', 'data-k': 'sg:revelar', text: 'Revelar aos jogadores…' }) : null;
      const bEsconder = s && s.jog ? h('button', { type: 'button', class: 'btn', 'data-k': 'sg:esconder', text: 'Esconder dos jogadores' }) : null;
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'sg:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'sg:ok', text: s ? 'Salvar' : 'Criar' });
      const lbl = (tx, ...el) => h('label', null, tx, ...el);
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        s && s.jog ? h('p', { class: 'note', 'data-k': 'sg:estado', text: 'Os jogadores sabem deste segredo.' }) : null,
        lbl('O segredo', txt),
        h('div', { class: 'sg-dono' }, h('span', { class: 'ps-rot', text: 'De quem é' }), h('div', { class: 'lin sg-lin' }, tipo, qual)),
        h('div', { class: 'sg-sabem' }, h('span', { class: 'ps-rot', text: 'Quem sabe' }), sabeP.el, sabeF.el),
        h('label', { class: 'op' }, boato, h('span', { text: 'É boato (talvez seja verdade, talvez não)' })), caixaFalso,
        lbl('Nota do mestre (só você vê)', nota),
        usam.length ? h('small', { class: 'ajuda', 'data-k': 'sg:intrigas', text: 'Usado nas intrigas: ' + usam.join(', ') + '.' }) : null,
        err, h('div', { class: 'pe' }, bTirar, bRevelar, bEsconder, h('span', { class: 'esp' }), bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl sg-dl', 'aria-labelledby': titulo.id }, form);
      form.addEventListener('input', () => { err.textContent = ''; });
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      const ler = () => {
        if (!txt.value.trim()) throw new Error('Escreva o segredo.');
        if (tipo.value && !qual.value) throw new Error('Escolha de quem é o segredo (ou “Ninguém”).');
        return { txt: txt.value.trim(), de: tipo.value ? { t: tipo.value, id: qual.value } : null, sabem: { p: sabeP.ler(), f: sabeF.ler() }, boato: boato.checked, falso: boato.checked && falso.checked, nota: nota.value.trim() };
      };
      const tentar = fn => { try { fn(ler()); } catch (e) { err.textContent = (e && e.message) || 'Confira o que foi escrito.'; } };
      form.addEventListener('submit', ev => { ev.preventDefault(); tentar(campos => fim({ campos })); });
      if (bTirar) bTirar.addEventListener('click', () => fim({ tirar: true }));
      if (bEsconder) bEsconder.addEventListener('click', () => tentar(campos => fim({ campos, esconder: true })));
      // revelar: a confirmação por cima do cartão (cancelar volta para ele, como estava)
      if (bRevelar) bRevelar.addEventListener('click', () => tentar(async campos => {
        const r = await dialogoRevelar(m, Object.assign({}, s, campos), jornal);
        if (r) fim({ campos, revelar: true, jornal: r.jornal, noticia: r.noticia });
      }));
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      txt.focus();
    });
  }
  /* Revelar um segredo (por cima do cartão): o que os jogadores vão ler — o texto, "boato" e sobre quem (só se eles veem o
     dono, pela projeção do mapa com o segredo revelado) — e a caixa (desmarcada) da notícia para o rascunho do Jornal (a
     notícia sem o dono que eles não veem). → { jornal, noticia } ou null */
  function dialogoRevelar(m, s, jornal) {
    const K = kit(), { h } = K;
    return new Promise(resolve => {
      const tmp = JSON.parse(JSON.stringify(m)), x = Object.assign({}, s, { jog: true });
      tmp.intr = { segredos: I().intrDe(m).segredos.filter(y => y.id !== s.id).concat([x]) };
      const pj = N().projetar(tmp), sp = I().segredoDe(pj, s.id), donoVai = !!(sp && sp.de);
      const sobre = donoVai ? 'sobre ' + I().nomeDoDono(pj, sp.de) : s.de ? 'sem dizer de quem é (eles não veem ' + I().nomeDoDono(m, s.de) + ')' : '';
      const noticia = I().noticiaSegredo(m, donoVai ? x : Object.assign({}, x, { de: null }));
      const cj = jornal ? DP().caixaJornal(K, 'rv:jornal') : null;
      if (cj) cj.pintar(noticia);
      const titulo = h('h2', { text: 'Revelar o segredo aos jogadores?' });
      titulo.id = 'dl-rv-' + Date.now().toString(36);
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'rv:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'rv:ok', text: 'Revelar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('p', { class: 'note', text: 'Eles passam a ler, na aba Intrigas:' }),
        h('div', { class: 'sem-jornal-txt rv-ler', 'data-k': 'rv:ler' }, h('p', { text: s.txt }), s.boato ? h('small', { text: 'boato' }) : null, sobre ? h('small', { 'data-k': 'rv:sobre', text: sobre }) : null),
        h('small', { class: 'ajuda', text: 'Quem sabe, o “é falso” e a nota continuam seus. Dá para desfazer (ou esconder de novo, no cartão).' }),
        cj ? cj.el : null,
        h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl rv-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => { ev.preventDefault(); fim({ jornal: !!(cj && cj.cx.checked), noticia }); });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      bOk.focus();
    });
  }

  /* ---------------- (parte 4b) o cartão da intriga ---------------- */
  async function janelaIntriga(id) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m) return;
    const x = id ? I().intrigaDe(m, id) : null;
    if (id && !x) return;
    const v = await dialogoIntriga(m, x);
    if (!v || !K.mesmoMapa(m.id)) return;
    if (v.tirar) {
      const ok = await K.confirmar({ titulo: 'Tirar a intriga?', ok: 'Tirar', perigo: true, texto: I().nomeDaIntriga(x) + ' sai da lista (os segredos que ela usa ficam). Dá para desfazer.' });
      if (!ok || !K.mesmoMapa(m.id)) return;
      if (mudarIntr('tirar a intriga', d => { const n = d.intrigas.length; d.intrigas = d.intrigas.filter(y => y.id !== x.id); if (d.intrigas.length === n) return false; }) !== false) K.avisoDesfazer('A intriga saiu.');
      return;
    }
    const ok = mudarIntr(x ? 'mudar a intriga' : 'criar a intriga', d => {
      if (!x) { if (d.intrigas.length >= (LIM('intrigas') || 200)) return false; d.intrigas.push(Object.assign({ id: N().novoId('ig') }, v)); return; }
      const y = d.intrigas.find(z => z.id === x.id);
      if (!y) return false;
      const ant = JSON.stringify(y);
      Object.assign(y, v);
      if (JSON.stringify(y) === ant) return false;
    });
    if (ok !== false) K.avisoDesfazer(x ? 'A intriga está salva.' : 'A intriga “' + v.nome + '” entrou na lista.');
  }
  // as linhas de uma lista no cartão (os alvos, os passos), com "+ …" e o × de cada uma → { el, linhas }
  function listaLinhas(K, k, rot, max, nova) {
    const { h } = K, caixa = h('div', { class: 'ig-lista', 'data-k': k }), linhas = [];
    const bNova = h('button', { type: 'button', class: 'btn sm', 'data-k': k + '-novo', text: rot });
    const travar = () => { bNova.disabled = linhas.length >= max; };
    const por = y => {
      const l = nova(y), bx = h('button', { type: 'button', class: 'ib', 'data-k': k + ':x', title: 'Tirar', 'aria-label': 'Tirar' }, K.glifo(K.X_SVG, 13));
      l.el.append(bx);
      bx.addEventListener('click', () => { l.el.remove(); linhas.splice(linhas.indexOf(l), 1); travar(); });
      linhas.push(l); caixa.append(l.el); travar();
      return l;
    };
    bNova.addEventListener('click', () => { if (linhas.length < max) por(null).foco.focus(); });
    travar();
    return { el: h('div', { class: 'ig-bloco' }, caixa, h('div', { class: 'row' }, bNova)), linhas, por };
  }
  /* → { nome, estado, quem, alvos, obj, passos, segredos, sabem, txtJ, ver, nota }, { tirar } ou null */
  function dialogoIntriga(m, x) {
    const K = kit(), { h } = K;
    return new Promise(resolve => {
      const area = (k, v0, ph, rows) => { const t = h('textarea', { 'data-k': k, rows, maxlength: LIM('textoIntriga') || 600, placeholder: ph }); t.value = v0 || ''; return t; };
      const nome = h('input', { type: 'text', 'data-k': 'ig:nome', maxlength: 80, autocomplete: 'off', placeholder: 'O nome (ex.: o veneno do copeiro)', value: x ? x.nome : '' });
      const E = I().ESTADOS, est = h('select', { 'data-k': 'ig:estado' }, Object.keys(E).map(k => h('option', { value: k, text: E[k] })));
      est.value = x ? x.estado : 'plano';
      // quem trama: os personagens e a facção por trás
      const quemP = escolhas(K, 'ig:quem-p', '+ Personagem…', I().opcoesDeDono(m, 'p'), x ? x.quem.p : [], LIM('quemTrama') || 12);
      const quemF = h('select', { 'data-k': 'ig:quem-f' }, [h('option', { value: '', text: 'Nenhuma' })].concat(m.faccoes.map(f => h('option', { value: f.id, text: K.nomeFac(f) }))));
      quemF.value = x && x.quem.f ? x.quem.f : '';
      // os alvos: o tipo e qual
      const TA = I().TIPOS_ALVO;
      const alvos = listaLinhas(K, 'ig:alvos', '+ Alvo', LIM('alvos') || 8, a => {
        const tipo = h('select', { 'data-k': 'ig:alvo:tipo', 'aria-label': 'O tipo do alvo' }, Object.keys(TA).map(k => h('option', { value: k, text: TA[k] })));
        const qual = h('select', { 'data-k': 'ig:alvo:qual', 'aria-label': 'O alvo' });
        const opc = val => { const l = I().opcoesDeDono(m, tipo.value); qual.replaceChildren(h('option', { value: '', text: l.length ? 'Escolha…' : 'Nenhum no mundo' }), ...l.map(([id, n]) => h('option', { value: id, text: n }))); qual.value = l.some(y => y[0] === val) ? val : ''; };
        tipo.value = a ? a.t : 'p';
        opc(a ? a.id : '');
        tipo.addEventListener('change', () => opc(''));
        return { tipo, qual, foco: tipo, el: h('div', { class: 'ig-linha ig-alvo' }, tipo, qual) };
      });
      for (const a of x ? x.alvos : []) alvos.por(a);
      const obj = area('ig:obj', x ? x.obj : '', 'O que quem trama quer (só você vê)…', 2);
      // os passos, com a caixinha de feito
      const passos = listaLinhas(K, 'ig:passos', '+ Passo', LIM('passos') || 20, y => {
        const cb = h('input', { type: 'checkbox', 'data-k': 'ig:passo:feito', checked: y && y.feito ? true : null, 'aria-label': 'Feito' });
        const t = h('input', { type: 'text', 'data-k': 'ig:passo:txt', maxlength: 160, autocomplete: 'off', placeholder: 'O passo (ex.: subornar o copeiro)', value: y ? y.txt : '', 'aria-label': 'O passo' });
        return { id: y ? y.id : N().novoId('ps'), cb, t, foco: t, el: h('div', { class: 'ig-linha ig-passo' }, cb, t) };
      });
      for (const y of x ? x.passos : []) passos.por(y);
      // os segredos que ela usa e quem já sabe
      const segs = escolhas(K, 'ig:segredos', '+ Segredo…', I().intrDe(m).segredos.map(s => [s.id, curto(s.txt, 50)]), x ? x.segredos : [], LIM('segredosDaIntriga') || 12);
      const sabeP = escolhas(K, 'ig:sabe-p', '+ Personagem…', I().opcoesDeDono(m, 'p'), x ? x.sabem.p : []);
      const sabeF = escolhas(K, 'ig:sabe-f', '+ Facção…', I().opcoesDeDono(m, 'f'), x ? x.sabem.f : []);
      const txtJ = area('ig:txtj', x ? x.txtJ : '', 'O que os jogadores leem quando você mostrar (ex.: o copeiro anda com moedas demais)…', 2);
      const ver = h('input', { type: 'checkbox', 'data-k': 'ig:ver', checked: x && x.ver ? true : null });
      const nota = area('ig:nota', x ? x.nota : '', 'O que só você sabe…', 2);
      const titulo = h('h2', { text: x ? 'A intriga' : 'Uma intriga nova' });
      titulo.id = 'dl-ig-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bTirar = x ? h('button', { type: 'button', class: 'btn per', 'data-k': 'ig:tirar', text: 'Tirar…' }) : null;
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'ig:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'ig:ok', text: x ? 'Salvar' : 'Criar' });
      const lbl = (tx, ...el) => h('label', null, tx, ...el), bloco = (k, tx, ...el) => h('div', { class: 'ig-sec', 'data-k': k }, h('span', { class: 'ps-rot', text: tx }), ...el);
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('div', { class: 'lin ig-cab' }, lbl('Nome', nome), lbl('Estado', est)),
        bloco('ig:quem', 'Quem trama', quemP.el, h('label', { class: 'ig-fac' }, h('span', { text: 'A facção por trás' }), quemF)),
        bloco('ig:alvos-caixa', 'Contra quem ou o quê', alvos.el),
        lbl('O objetivo', obj),
        bloco('ig:passos-caixa', 'Os passos', passos.el),
        bloco('ig:segredos-caixa', 'Os segredos que ela usa', segs.el),
        bloco('ig:sabem', 'Quem já sabe', sabeP.el, sabeF.el),
        lbl('O texto para os jogadores', txtJ),
        h('label', { class: 'op' }, ver, h('span', { text: 'Os jogadores veem (o texto para eles e o estado)' })),
        lbl('Nota do mestre (só você vê)', nota),
        err, h('div', { class: 'pe' }, bTirar, h('span', { class: 'esp' }), bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl ig-dl', 'aria-labelledby': titulo.id }, form);
      form.addEventListener('input', () => { err.textContent = ''; });
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        try {
          if (!nome.value.trim()) throw new Error('Dê um nome à intriga.');
          if (alvos.linhas.some(l => !l.qual.value)) throw new Error('Escolha cada alvo (ou tire a linha).');
          if (passos.linhas.some(l => !l.t.value.trim())) throw new Error('Escreva cada passo (ou tire a linha).');
          if (ver.checked && !txtJ.value.trim()) throw new Error('Para os jogadores verem, escreva o texto para eles.');
          fim({ nome: nome.value.trim(), estado: est.value, quem: { p: quemP.ler(), f: quemF.value || null }, alvos: alvos.linhas.map(l => ({ t: l.tipo.value, id: l.qual.value })), obj: obj.value.trim(),
            passos: passos.linhas.map(l => ({ id: l.id, txt: l.t.value.trim(), feito: l.cb.checked })), segredos: segs.ler(), sabem: { p: sabeP.ler(), f: sabeF.ler() },
            txtJ: txtJ.value.trim(), ver: ver.checked, nota: nota.value.trim() });
        } catch (e) { err.textContent = (e && e.message) || 'Confira o que foi escrito.'; }
      });
      if (bTirar) bTirar.addEventListener('click', () => fim({ tirar: true }));
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      nome.focus();
    });
  }

  /* (parte 4b) a parte das intrigas na prévia da semana (mundo/reino-painel.js): as em andamento (só o mestre vê), cada uma
     com a caixa, desmarcada, que a mostra aos jogadores (sem o texto para eles, a caixa fica travada; a já mostrada só
     diz). prev: a prévia (MundoReino.semanaPrevia). → { el (null sem nenhuma), ler() (os ids marcados) } */
  function secSemana(m, prev) {
    const K = kit(), { h } = K, cxs = [], l = (prev.intrigas || []).map(id => I().intrigaDe(m, id)).filter(Boolean);
    if (!l.length) return { el: null, ler: () => [] };
    const itens = l.map(x => {
      const base = I().nomeDaIntriga(x) + (I().passosTxt(x) ? ' (' + I().passosTxt(x) + ')' : '');
      if (x.ver) return h('div', { class: 'sem-in', 'data-k': 'sem:in:' + x.id }, h('span', { text: base }), h('span', { class: 'tag jog', text: 'os jogadores já veem' }));
      const cb = h('input', { type: 'checkbox', 'data-k': 'sem:in:ver:' + x.id, disabled: x.txtJ ? null : true });
      cxs.push({ id: x.id, cb });
      return h('label', { class: 'op sem-in', 'data-k': 'sem:in:' + x.id }, cb, h('span', { text: base + (x.txtJ ? ': mostrar aos jogadores' : ': sem o texto para os jogadores (escreva no cartão para poder mostrar)') }));
    });
    return { el: h('fieldset', { class: 'sem-ins', 'data-k': 'sem:intrigas' }, h('legend', { text: 'Intrigas em andamento (só você vê; marque as que os jogadores passam a ver)' }), itens), ler: () => cxs.filter(c => c.cb.checked).map(c => c.id) };
  }

  window.MundoIntrigasPainel = { abaIntrigas, janelaSegredo, janelaIntriga, secSemana };
})();
