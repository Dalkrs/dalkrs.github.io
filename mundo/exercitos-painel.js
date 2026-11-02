/* Tiny Cats · Mapa-múndi · os exércitos e os modelos de unidade (lote 63).
   · A aba Exércitos (modo Guerra): todos os exércitos do mapa, por facção, com o desenho do tipo, as tropas, a moral e a
     veterania; um clique escolhe e leva até ele.
   · "Novo exército aqui" (o botão direito do mapa e a ferramenta Novo exército, do modo Guerra): a janela com a facção,
     o tipo e o tamanho; o exército nasce com as unidades montadas pelos modelos da mesa (tc/modelos.js), escondido dos
     jogadores (dá para mostrar na hora). Um passo de desfazer.
   · Os modelos de unidade (modo Guerra, aba Regras): o nome, o ATQ, a DEF, o HP de cada soldado, a cura e os magos de
     cada um; criar, mudar, apagar e voltar aos de começo. Valem para o mapa e para as tropas do clã.
   Usa as ferramentas do painel (MundoPainel.kit); o mapa muda só por App.mudar, e os modelos por App.gravarModelos. */
(() => {
  'use strict';
  const kit = () => window.MundoPainel.kit;
  const app = () => kit().app();
  const N = () => window.MundoNucleo;
  const TM = () => (window.TC && TC.modelos) || null;
  const novoId = p => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const NS = 'http://www.w3.org/2000/svg';
  const LEMBRAR = 'tinycats:mundo:novoExe';
  const lerUlt = () => { try { const v = JSON.parse(localStorage.getItem(LEMBRAR) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } };
  const gravarUlt = v => { try { localStorage.setItem(LEMBRAR, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };

  // o token do tipo de exército, pequeno, para a lista e a janela (o desenho fixo de tc/modelos.js)
  function token(arma, cor, tam) {
    const T = TM(), A = T && T.ARMAS[arma];
    const el = document.createElement('span');
    el.className = 'tok-arma';
    el.style.setProperty('--fc', cor || '#9aa3b5');
    if (tam) { el.style.width = el.style.height = tam + 'px'; }
    const sv = document.createElementNS(NS, 'svg');
    sv.setAttribute('viewBox', '0 0 24 24'); sv.setAttribute('aria-hidden', 'true');
    sv.innerHTML = A ? A.svg : '<path d="M5 22V2M5 3h13l-3.5 4.5L18 12H5"/>';        // (desenho fixo do código, sem texto de ninguém)
    el.append(sv);
    return el;
  }
  const corDaFac = (m, id) => { const f = id && m && Array.isArray(m.faccoes) ? m.faccoes.find(x => x.id === id) : null; return f ? f.cor : ''; };

  /* ---------------- a aba Exércitos ---------------- */
  function abaExercitos(v) {
    const A = app(), m = A.mapa, { h, secao, botao, nota, fmt, plural } = kit();
    const exs = (m && m.objs ? m.objs : []).filter(o => o.k === 'g' && o.tipo === 'exercito');
    const topo = h('div', { class: 'sec ex-topo' },
      h('div', { class: 'row' }, botao('Novo exército', () => A.usarFerramenta('x'), { c: 'pri sm', k: 'ex:novo', title: 'Clique no mapa onde ele vai ficar' })),
      nota('Clique no mapa onde ele vai ficar. Ou use o botão direito no mapa: Novo exército aqui.'));
    if (!exs.length) return [topo, nota('Nenhum exército neste mapa ainda.')];
    const facs = (m.faccoes || []).map(f => ({ id: f.id, nome: f.nome, cor: f.cor })).concat([{ id: null, nome: 'Sem facção', cor: '' }]);
    const blocos = [];
    for (const f of facs) {
      const lista = exs.filter(o => (o.fac || null) === f.id);
      if (!lista.length) continue;
      blocos.push(secao(f.nome + ' (' + lista.length + ')', h('div', { class: 'ex-lista' }, lista.map(o => {
        const e = o.exe && !o.exe.pub ? o.exe : null, tr = e ? N().tropasDe(e) : 0, vm = N().vetMediaDe ? N().vetMediaDe(e) : null;
        const T = TM(), nomeTipo = o.arma && T && T.ARMAS[o.arma] ? T.ARMAS[o.arma].nome : 'Exército';
        const sub = [nomeTipo, e ? plural(tr, 'soldado', 'soldados') : 'sem unidades', e ? 'moral ' + e.moral : '', vm != null ? 'veterania ' + String(vm).replace('.', ',') : '', o.oculto ? 'escondido' : '', e && e.tropa ? 'tropa de uma ficha' : ''].filter(Boolean).join(' · ');
        return h('button', { type: 'button', class: 'ex-linha' + ((A.sel || []).includes(o.id) ? ' on' : ''), 'data-k': 'ex:' + o.id, title: 'Escolher e ir até ele',
          onclick: () => { A.selecionar([o.id]); if (window.MundoTela && MundoTela.centrar) MundoTela.centrar(o.id); kit().abrirAba('selecao'); } },
          token(o.arma, f.cor || o.cor, 30), h('span', { class: 'ex-tx' }, h('b', { text: o.nome || nomeTipo }), h('small', { text: sub })));
      }))));
    }
    return [topo].concat(blocos);
  }

  /* ---------------- "Novo exército aqui" ---------------- */
  function janelaNovoExercito(p) {
    const A = app(), m = A.mapa, T = TM(), { h } = kit();
    if (!m || !A.podeEditar() || !T || !p) return;
    const ult = lerUlt(), facs = (m.faccoes || []).map(f => ({ id: f.id, nome: f.nome, cor: f.cor }));
    const est = { fac: facs.some(f => f.id === ult.fac) ? ult.fac : (facs[0] ? facs[0].id : null), arma: T.ehArma(ult.arma) ? ult.arma : 'patrulha', tam: T.TAMANHOS[ult.tam] ? ult.tam : 'm', oculto: ult.oculto !== false };
    const titulo = h('h2', { text: 'Novo exército' });
    titulo.id = 'dl-ne-' + Date.now().toString(36);
    const cxFac = h('div', { class: 'chips ne-facs', role: 'group', 'aria-label': 'Facção' }), cxTipos = h('div', { class: 'ne-tipos', role: 'group', 'aria-label': 'Tipo' }),
      cxTam = h('div', { class: 'chips ne-tams', role: 'group', 'aria-label': 'Tamanho' }), conta = h('p', { class: 'note ne-conta', 'aria-live': 'polite' });
    const esc = h('input', { type: 'checkbox', 'data-k': 'ne:oculto', checked: est.oculto });
    const pintar = () => {
      const modelos = A.modelos(), cor = corDaFac(m, est.fac) || '#9aa3b5';
      cxFac.replaceChildren(...facs.concat([{ id: null, nome: 'Sem facção', cor: '' }]).map(f => h('button', { type: 'button', class: 'chip', 'data-k': 'ne:fac:' + (f.id || '-'), 'aria-pressed': String(f.id === est.fac), onclick: () => { est.fac = f.id; pintar(); } },
        h('i', { class: 'pinta', style: 'background:' + (f.cor || 'transparent') }), f.nome)));
      cxTipos.replaceChildren(...T.ORDEM_ARMAS.map(k => { const a = T.ARMAS[k]; return h('button', { type: 'button', class: 'ne-tipo', 'data-k': 'ne:tipo:' + k, 'aria-pressed': String(k === est.arma), title: a.txt, onclick: () => { est.arma = k; pintar(); } },
        token(k, cor, 34), h('b', { text: a.nome }), h('small', { text: a.min + ' a ' + a.max + (k === 'frota' ? ' pessoas' : '') })); }));
      cxTam.replaceChildren(...Object.keys(T.TAMANHOS).map(k => h('button', { type: 'button', class: 'chip', 'data-k': 'ne:tam:' + k, 'aria-pressed': String(k === est.tam), onclick: () => { est.tam = k; pintar(); } }, T.TAMANHOS[k].nome)));
      const r = T.resumo(est.arma, est.tam, modelos);
      conta.textContent = r.n + (r.n === 1 ? ' soldado' : ' soldados') + (r.barcos ? ' em ' + r.barcos + (r.barcos === 1 ? ' barco' : ' barcos') : '') + ': ' + r.partes.map(x => x.n + ' ' + x.nome.toLowerCase()).join(', ') + '. ' + T.ARMAS[est.arma].txt[0].toUpperCase() + T.ARMAS[est.arma].txt.slice(1) + '.';
    };
    const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'ne:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'ne:ok', text: 'Criar exército' });
    const form = h('form', { class: 'dl ne-dl', novalidate: true }, titulo,
      h('div', { class: 'ne-passo' }, h('span', { class: 'ps-rot', text: 'Facção' }), cxFac),
      h('div', { class: 'ne-passo' }, h('span', { class: 'ps-rot', text: 'Tipo' }), cxTipos),
      h('div', { class: 'ne-passo' }, h('span', { class: 'ps-rot', text: 'Tamanho' }), cxTam),
      conta,
      h('label', { class: 'chk' }, esc, h('span', null, 'Escondido dos jogadores', h('small', { text: 'Dá para mostrar depois, no painel do exército.' }))),
      h('div', { class: 'pe' }, bNao, bOk));
    const dl = h('dialog', { class: 'mundo-dl ne-janela', 'aria-labelledby': titulo.id }, form);
    let feito = false;
    const fim = () => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); };
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      est.oculto = !!esc.checked;
      gravarUlt(est);
      fim();
      criarExercito(p, est);
    });
    bNao.addEventListener('click', fim);
    dl.addEventListener('close', fim);
    dl.addEventListener('keydown', ev => ev.stopPropagation());
    document.body.append(dl);
    pintar();
    dl.showModal();
    const at = cxTipos.querySelector('[aria-pressed="true"]'); if (at) at.focus();
  }
  // o exército, num passo de desfazer: o grupo do tipo exército, com o desenho do tipo e as unidades pelos modelos
  function criarExercito(p, est) {
    const A = app(), m = A.mapa, T = TM();
    if (!m || !A.podeEditar() || !T) return null;
    const fac = (m.faccoes || []).find(f => f.id === est.fac) || null;
    const tipos = m.guerra && Array.isArray(m.guerra.tipos) ? m.guerra.tipos : [];
    const unid = T.unidadesDoMapa(est.arma, est.tam, A.modelos(), tipos).map(u => ({ id: novoId('un'), nome: u.nome, tipo: u.tipo || null, tropas: u.tropas, hpT: u.hpT, fer: 0, atq: u.atq, def: u.def, magos: u.magos, cura: u.cura, maq: u.maq || {}, equip: [] }));
    const campos = Object.assign({}, N().camposDoTipo('exercito'), {
      x: p.x, y: p.y, nome: T.nomeDoExercito(est.arma, est.tam, fac ? fac.nome : ''), arma: est.arma, fac: fac ? fac.id : null, oculto: !!est.oculto,
      cor: fac && fac.cor ? fac.cor : '#c0503a',
      exe: { cmd: { nome: '', b: 0, ficha: null }, moral: 5, mant: 10, cons: null, fome: 0, unid } });
    let id = null;
    A.mudar('novo exército', d => {
      const o = N().objNovo('g', campos);
      if (!o) return false;
      if (!Array.isArray(d.objs)) d.objs = [];
      d.objs.push(o); id = o.id;
    });
    if (!id) return null;
    if (A.ferramenta !== 'sel') A.usarFerramenta('sel');
    A.selecionar([id]);
    kit().abrirAba('selecao');
    kit().avisoDesfazer(campos.nome + ' está no mapa' + (campos.oculto ? ', escondido dos jogadores.' : '.'));
    return id;
  }

  /* ---------------- os modelos de unidade (aba Regras) ---------------- */
  function secModelos() {
    const A = app(), T = TM(), { h, secao, botao, nota, campoTexto, campoNumero, caixa } = kit();
    if (!T || !A.podeModelos || !A.podeModelos()) return null;
    const lista = A.modelos();
    const muda = (rot, fn) => { const l = JSON.parse(JSON.stringify(A.modelos())); if (fn(l) === false) return false; return A.gravarModelos(l, rot) !== false; };
    const porId = (l, id) => l.find(x => x.id === id);
    const cartas = lista.map(md => h('div', { class: 'md-carta', 'data-md': md.id },
      h('div', { class: 'md-topo' },
        campoTexto('md:' + md.id + ':nome', null, md.nome, v => muda('O modelo agora se chama ' + (String(v).trim() || md.nome) + '.', l => { const x = porId(l, md.id); if (!x) return false; x.nome = String(v); }), { max: T.MAX.nome, rotulo: 'Nome do modelo' }),
        botao('Apagar', () => muda(md.nome + ' saiu dos modelos.', l => { const i = l.findIndex(x => x.id === md.id); if (i < 0 || l.length <= 1) return false; l.splice(i, 1); }), { c: 'sm per', k: 'md:' + md.id + ':x', off: lista.length <= 1, title: lista.length <= 1 ? 'Fica pelo menos um modelo' : 'Apagar este modelo' })),
      h('div', { class: 'md-nums' },
        campoNumero('md:' + md.id + ':atq', 'ATQ', md.atq, v => muda(null, l => { const x = porId(l, md.id); if (!x) return false; x.atq = v; }), { min: -T.MAX.atr, max: T.MAX.atr }),
        campoNumero('md:' + md.id + ':def', 'DEF', md.def, v => muda(null, l => { const x = porId(l, md.id); if (!x) return false; x.def = v; }), { min: -T.MAX.atr, max: T.MAX.atr }),
        campoNumero('md:' + md.id + ':hp', 'HP de cada', md.hpT, v => muda(null, l => { const x = porId(l, md.id); if (!x) return false; x.hpT = v; }), { min: 1, max: T.MAX.hpT }),
        campoNumero('md:' + md.id + ':cura', 'Cura (%)', md.cura, v => muda(null, l => { const x = porId(l, md.id); if (!x) return false; x.cura = v; }), { min: 0, max: 100 })),
      caixa('md:' + md.id + ':magos', 'Cada soldado é um mago', md.magos, v => muda(null, l => { const x = porId(l, md.id); if (!x) return false; x.magos = !!v; })),
      campoTexto('md:' + md.id + ':desc', null, md.desc, v => muda(null, l => { const x = porId(l, md.id); if (!x) return false; x.desc = String(v); }), { max: T.MAX.desc, rotulo: 'O que ele faz', ph: 'O que ele faz (aparece na hora de escolher)' })));
    return secao('Modelos de unidade', { resumo: lista.length + (lista.length === 1 ? ' modelo' : ' modelos') },
      nota('Os exércitos novos e as tropas do clã nascem com estes números. Mudar um modelo não muda as unidades que já existem.'),
      h('div', { class: 'md-lista' }, cartas),
      h('div', { class: 'row' },
        botao('+ Modelo', () => muda('Modelo novo criado.', l => { if (l.length >= T.MAX.lista) return false; l.push(T.novoModelo(l)); }), { c: 'sm', k: 'md:novo', off: lista.length >= T.MAX.lista }),
        botao('Voltar aos de começo', () => muda('Os modelos voltaram aos de começo.', l => { l.splice(0, l.length, ...JSON.parse(JSON.stringify(T.PADRAO))); }), { c: 'sm', k: 'md:comeco' })));
  }

  window.MundoExercitosPainel = { abaExercitos, janelaNovoExercito, criarExercito, secModelos, token };
})();
