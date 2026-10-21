/* Tiny Cats · Mapa-múndi · as intrigas e os segredos no painel (lote 11, parte 4a).
   A aba Intrigas: o filtro de facção e os segredos (o texto, sobre quem, quem sabe; "boato", "falso" e "revelado"), com
   "+ Segredo". O cartão do segredo: o texto, de quem é (o tipo e qual; ou um segredo do mundo), quem sabe (personagens e
   facções), "É boato" e "É falso", a nota; "Revelar aos jogadores…" (por cima do cartão: o que eles vão ler e a notícia,
   desmarcada, para o rascunho do Jornal) e "Esconder dos jogadores". Quem joga vê os segredos revelados (sobre quem, se
   eles o veem; "boato").
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

  const mudarIntr = (rotulo, fn) => app().mudar(rotulo, mm => { if (!mm.intr) mm.intr = { segredos: [] }; return fn(mm.intr, mm); });
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
    if (ed) out.push(linha(botao('+ Segredo', () => janelaSegredo(null), { c: 'pri sm', k: 'in:segredo-novo', off: I().intrDe(v).segredos.length >= (LIM('segredos') || 300) })));
    if (filtroFac && !K.facDe(v, filtroFac)) filtroFac = '';
    if (v.faccoes.length) out.push(campoEscolha('in:fac', 'Facção', filtroFac, [['', 'Todas as facções']].concat(v.faccoes.map(f => [f.id, K.nomeFac(f)])), x => { filtroFac = x; return false; }));
    out.push(secSegredos(v, ed));
    out.push(nota(ed ? 'Os segredos são seus até você revelar (no cartão de cada um). As intrigas chegam na próxima parte.' : 'Só o que vocês descobriram.'));
    return out;
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
      const ok = await K.confirmar({ titulo: 'Tirar o segredo?', ok: 'Tirar', perigo: true, texto: '“' + curto(s.txt) + '” sai da lista. Dá para desfazer.' });
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
  function escolhas(K, k, rot, opcoes, ini) {
    const { h } = K, max = LIM('sabem') || 24, nomes = new Map(opcoes), ordem = ini.filter(id => nomes.has(id));
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

  window.MundoIntrigasPainel = { abaIntrigas, janelaSegredo };
})();
