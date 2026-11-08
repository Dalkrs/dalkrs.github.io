/* Tiny Cats · Baralho (lote 105): a página.
   Quem joga vê o baralho dos seus personagens (a mão é secreta: só ele e o mestre a veem) e joga as cartas — a carta
   jogada vai para a mesa ao vivo, para todos. Quem mestra vê todos, dá e tira cartas, e escreve o que cada carta faz
   (o documento baralho:cartas). A lógica fica em tc/baralho.js. */
(() => {
  'use strict';
  const B = window.TC.baralho, U = window.TC.dom;
  const { h, svg, trocar } = U;
  const $ = id => document.getElementById(id);
  const toast = U.avisos($('toasts'));
  const J = U.janelas($('dlg'));
  const copia = x => JSON.parse(JSON.stringify(x == null ? null : x));
  let st = null, D = null, P = null, naMesa = false, mestre = false, eu = null;
  let vista = 'jogo', pcSel = null;
  const local = { docs: {} };            // fora de uma mesa: tudo neste navegador

  /* ---------------- os documentos ---------------- */
  function doc(id) {
    if (!naMesa) return local.docs[id] || null;
    const l = D.pegar(id);
    return l && !l.apagado ? l.dados : null;
  }
  function gravar(id, dados, dono, vis) {
    if (!naMesa) { local.docs[id] = copia(dados); try { localStorage.setItem('tinycats:baralho', JSON.stringify(local.docs)); } catch (e) { /* sem espaço */ } return; }
    const campos = { dados: copia(dados) };
    if (!D.pegar(id)) { campos.vis = vis || 'mestre'; if (dono) campos.dono_id = dono; }
    D.gravar(id, campos, null, { cas: true });
    $('salvo').textContent = 'Salvando…';
    clearTimeout(gravar.t); gravar.t = setTimeout(() => { $('salvo').textContent = 'Salvo na mesa'; }, 800);
  }
  const cs = () => B.cartas(doc(B.CARTAS_DOC));
  const est = pc => B.estado(doc(B.PRE_PC + pc));
  function mudar(pc, fn) {
    const e = est(pc);
    const r = fn(e);
    if (r === false) return r;
    const p = pcDe(pc);
    gravar(B.PRE_PC + pc, e, p && p.dono ? p.dono : (mestre ? null : eu), 'mestre');
    pintar();
    return r;
  }

  /* ---------------- quem é quem ---------------- */
  function personagens() {
    if (!naMesa) return [{ id: 'teste', nome: 'Personagem de teste', dono: 'local' }];
    return P.todas().filter(l => !l.apagado && typeof l.id === 'string' && String(l.nome || '').trim())
      .map(l => ({ id: l.id, nome: String(l.nome).trim(), dono: l.dono_id || null }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  const pcDe = id => personagens().find(p => p.id === id) || null;
  const visiveis = () => (mestre || !naMesa ? personagens() : personagens().filter(p => p.dono === eu));

  /* ---------------- a carta na tela ---------------- */
  function arte(c, tam) { return svg(tam || 64, c && c.desenho ? '<path d="' + c.desenho + '"/>' : '<path d="M12 4v16M4 12h16"/>', 1.6); }
  function cartaEl(c, opt) {
    opt = opt || {};
    if (!c) return h('div', { class: 'carta' }, h('div', { class: 'nome', text: 'Carta sumida' }));
    const rar = opt.rar && opt.rar !== 'comum' ? B.RARIDADES.find(x => x[0] === opt.rar) : null;
    const ef = opt.inv && c.invertida ? c.invertida : c.efeito;
    return h('div', { class: 'carta' + (opt.inv ? ' inv' : '') + (rar ? ' ' + rar[0] : ''), 'data-k': opt.k || null },
      rar ? h('span', { class: 'rar', text: rar[1] }) : null,
      h('div', { class: 'num', text: B.romano(c.num) }),
      h('div', { class: 'arte' }, arte(c, opt.mini ? 44 : 72)),
      h('div', null, h('div', { class: 'nome', text: c.nome }), h('div', { class: 'tipo', text: B.nomeTipo(c.tipo) + (opt.inv ? ' · invertida' : '') })),
      h('div', { class: 'ef' }, opt.inv ? h('span', { class: 'inv-t', text: 'Invertida' }) : null, ef || ''),
      opt.acoes && opt.acoes.length ? h('div', { class: 'acoes' }, opt.acoes) : null);
  }

  /* ---------------- pintar ---------------- */
  function pintarPcs() {
    const sel = $('pc'), l = visiveis();
    if (!pcSel || !l.some(p => p.id === pcSel)) pcSel = l.length ? l[0].id : null;
    trocar(sel, l.map(p => h('option', { value: p.id, text: p.nome + (mestre && naMesa && p.dono ? '' : '') })));
    sel.value = pcSel || '';
    sel.hidden = vista !== 'jogo' || !l.length;
  }
  function pintar() {
    for (const b of document.querySelectorAll('#vista button')) b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === vista));
    pintarPcs();
    trocar($('meio'), vista === 'cartas' ? telaCartas() : telaJogo());
  }
  function anunciar(r) {
    const p = pcDe(pcSel), a = B.anuncio(p ? p.nome : 'Alguém', r);
    if (!a) return;
    if (window.TC.ponte && naMesa) window.TC.ponte.publicar('baralho', { titulo: a.titulo, resumo: a.resumo, pc: pcSel });
    toast(a.titulo);
  }
  function telaJogo() {
    if (!pcSel) return h('div', { class: 'vazio' }, h('p', { class: 'tit', text: 'Nenhum personagem' }), h('p', { text: naMesa ? 'Quando você tiver um personagem na mesa, o baralho dele aparece aqui.' : '' }));
    const C = cs(), e = est(pcSel);
    const cd = u => B.cartaDe(e, C, u);
    if (!e.colecao.length) {
      return h('div', { class: 'vazio' }, h('p', { class: 'tit', text: 'Ainda sem cartas' }),
        h('p', { text: 'A Cartomante começa com algumas cartas e ganha o resto por feitos, lojas e ruínas. Quem dá as cartas é o mestre.' }),
        mestre ? h('div', { class: 'linha' }, h('button', { type: 'button', class: 'btn pri', text: 'Dar o baralho inicial (6 cartas)', onclick: () => mudar(pcSel, x => { for (const c of B.INICIAL) B.dar(x, c, 'comum'); }) }),
          h('button', { type: 'button', class: 'btn', text: 'Dar uma carta…', onclick: darCarta })) : null);
    }
    const mesa = h('section', { class: 'painel' },
      h('h2', { text: e.luta ? 'Na luta' : 'Fora da luta' }),
      h('div', { class: 'linha' },
        h('span', { class: 'cont' }, 'Mão ', h('b', { text: e.mao.length + '/' + B.MAO_MAX })),
        h('span', { class: 'cont' }, 'Monte ', h('b', { text: String(e.monte.length) })),
        h('span', { class: 'cont' }, 'Descarte ', h('b', { text: String(e.descarte.length) })),
        h('span', { class: 'cont' }, 'Coleção ', h('b', { text: String(e.colecao.length) }))),
      h('div', { class: 'linha' },
        e.luta ? null : h('button', { type: 'button', class: 'btn pri', 'data-k': 'luta', text: 'Começar a luta (puxa ' + B.MAO_INICIO + ')', onclick: () => mudar(pcSel, x => { B.comecarLuta(x, C); }) }),
        e.luta ? h('button', { type: 'button', class: 'btn pri', 'data-k': 'puxar', text: 'Puxar 1 (novo turno)', disabled: e.mao.length >= B.MAO_MAX, onclick: () => mudar(pcSel, x => { if (!B.puxar(x, C, 1)) { toast('Não há carta para puxar.'); return false; } }) }) : null,
        e.luta ? h('button', { type: 'button', class: 'btn', 'data-k': 'fim', text: 'Fim da luta', onclick: () => mudar(pcSel, x => { B.fimDaLuta(x); }) }) : null,
        e.luta ? null : h('button', { type: 'button', class: 'btn', text: 'Leitura de 1 carta', onclick: () => leitura(1) }),
        e.luta ? null : h('button', { type: 'button', class: 'btn', text: 'Leitura de 3 cartas', onclick: () => leitura(3) })),
      h('p', { class: 'ajuda', text: 'A mão é secreta: só você e o mestre a veem. A carta jogada vai para a mesa ao vivo. Quando o monte acaba, o descarte volta embaralhado. Na árvore da Cartomante, a habilidade com o nome da carta muda o que ela faz.' }));
    const mao = h('section', { class: 'painel' }, h('h2', { text: 'Mão' }),
      e.mao.length ? h('div', { class: 'mao' }, e.mao.map(m => {
        const x = cd(m.u), c = x && x.c;
        const acoes = [h('button', { type: 'button', class: 'btn sm pri', text: 'Jogar', onclick: () => { const r = mudar(pcSel, y => B.jogar(y, C, m.u)); if (r) anunciar(r); } })];
        if (c && c.tipo === 'armadilha') acoes.push(h('button', { type: 'button', class: 'btn sm', text: 'Armar', onclick: () => armar(m.u) }));
        if (c && c.inverte && x.x.rar === 'lendaria') acoes.push(h('button', { type: 'button', class: 'btn sm', text: 'Virar', onclick: () => mudar(pcSel, y => B.virar(y, C, m.u)) }));
        acoes.push(h('button', { type: 'button', class: 'btn sm', text: 'Descartar', onclick: () => mudar(pcSel, y => B.descartar(y, C, m.u)) }));
        return cartaEl(c, { inv: m.inv, rar: x && x.x.rar, acoes, k: 'mao:' + m.u });
      })) : h('p', { class: 'ajuda', text: e.luta ? 'A mão está vazia. Puxe no começo do turno.' : 'Fora da luta, a mão fica vazia. Comece a luta para puxar.' }));
    const armadas = e.armadas.length ? h('section', { class: 'painel' }, h('h2', { text: 'Armadilhas armadas' }),
      h('div', { class: 'mao' }, e.armadas.map(a => { const x = cd(a.u); return h('div', { class: 'verso' }, h('span', { text: (x && x.c ? x.c.nome : 'Armadilha') + (a.onde ? ' · ' + a.onde : '') }),
        h('button', { type: 'button', class: 'btn sm pri', text: 'Disparar', onclick: () => { const r = mudar(pcSel, y => B.disparar(y, C, a.u)); if (r) anunciar(r); } })); })),
      h('p', { class: 'ajuda', text: 'Só você e o mestre sabem o que está armado. Uma armadilha num quadrado das Cenas: escreva o quadrado ao armar (ex.: B4).' })) : null;
    const leit = e.leitura.length ? h('section', { class: 'painel' }, h('h2', { text: 'Última leitura' }),
      h('div', { class: 'mao' }, e.leitura.map((l, i) => { const c = C.cartas.find(y => y.id === l.c); return h('div', null,
        e.leitura.length === 3 ? h('p', { class: 'ajuda', text: ['Passado', 'Presente', 'Futuro'][i] }) : null,
        cartaEl(c ? Object.assign({}, c, { efeito: c.leitura, invertida: c.leitura ? 'Ao contrário: ' + c.leitura : '' }) : null, { inv: l.inv })); })),
      h('p', { class: 'ajuda', text: 'O mestre interpreta a leitura e dá a pista. Karvevas às vezes mente.' })) : null;
    const col = h('section', { class: 'painel' }, h('h2', { text: 'Coleção' }),
      h('div', { class: 'mini' }, e.colecao.map(x => { const c = C.cartas.find(y => y.id === x.c);
        return cartaEl(c, { mini: true, rar: x.rar, acoes: mestre ? [h('button', { type: 'button', class: 'btn sm per', text: 'Tirar', onclick: () => mudar(pcSel, y => B.tirar(y, x.u)) })] : null }); })),
      mestre ? h('div', { class: 'linha' }, h('button', { type: 'button', class: 'btn', text: 'Dar uma carta…', onclick: darCarta })) : null);
    const log = e.log.length ? h('section', { class: 'painel' }, h('h2', { text: 'O que aconteceu' }), h('ol', { class: 'log' }, e.log.slice().reverse().map(t => h('li', { text: t })))) : null;
    return [mesa, mao, armadas, leit, col, log];
  }
  async function armar(u) {
    const onde = await J.pedirTexto('Armar a armadilha', 'Onde? (um quadrado das Cenas, ou deixe "na mão")', 'na mão', 'Armar', 40);
    if (onde == null) return;
    mudar(pcSel, y => { B.jogar(y, cs(), u, true, onde === 'na mão' ? '' : onde); });
    toast('Armada. Ninguém mais sabe.');
  }
  function leitura(n) {
    const C = cs();
    const r = mudar(pcSel, y => B.ler(y, C, n));
    if (r && window.TC.ponte && naMesa) {
      const p = pcDe(pcSel);
      window.TC.ponte.publicar('baralho', { titulo: (p ? p.nome : 'Alguém') + ' fez uma leitura de ' + n + (n === 1 ? ' carta' : ' cartas'), resumo: r.cartas.map(x => { const c = C.cartas.find(y => y.id === x.c); return (c ? c.nome : '?') + (x.inv ? ' (ao contrário)' : ''); }).join(', ') + '. O mestre interpreta.', pc: pcSel });
    }
  }
  function darCarta() {
    const C = cs();
    const sc = h('select', { class: 'in', 'aria-label': 'Carta' }, C.cartas.map(c => h('option', { value: c.id, text: B.romano(c.num) + ' · ' + c.nome })));
    const sr = h('select', { class: 'in', 'aria-label': 'Raridade' }, B.RARIDADES.map(r => h('option', { value: r[0], text: r[1] })));
    J.abrir('', [h('h2', { text: 'Dar uma carta' }), h('label', { class: 'field' }, h('span', { text: 'Carta' }), sc), h('label', { class: 'field' }, h('span', { text: 'Raridade' }), sr),
      J.pe(h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: () => J.fechar() }),
        h('button', { type: 'button', class: 'btn pri', text: 'Dar', onclick: () => { mudar(pcSel, y => { B.dar(y, sc.value, sr.value); }); J.fechar(); toast('Carta dada.'); } }))]);
  }

  /* ---------------- as 22 cartas (o mestre escreve) ---------------- */
  function telaCartas() {
    const C = cs();
    return h('section', { class: 'painel' }, h('h2', { text: 'As cartas do baralho' }),
      h('p', { class: 'ajuda', text: 'Todos usam o mesmo baralho; a árvore da Cartomante muda o que cada carta faz. Só algumas cartas saem invertidas, e invertida é um efeito diferente, não sempre ruim.' + (mestre ? ' Clique em Editar para mudar o texto de uma carta.' : '') }),
      h('div', { class: 'lista-cartas' }, C.cartas.map(c => h('div', { class: 'lc' }, h('span', { class: 'ic' }, arte(c, 34)),
        h('div', null, h('b', { text: B.romano(c.num) + ' · ' + c.nome }), h('p', { text: B.nomeTipo(c.tipo) + (c.inverte ? ' · pode sair invertida (' + c.chance + '%)' : '') }),
          h('p', { text: c.efeito }), c.inverte && c.invertida ? h('p', { text: 'Invertida: ' + c.invertida }) : null, c.leitura ? h('p', { text: 'Na leitura: ' + c.leitura }) : null),
        mestre ? h('button', { type: 'button', class: 'btn sm', text: 'Editar', onclick: () => editar(c) }) : null))),
      mestre ? h('div', { class: 'linha' }, h('button', { type: 'button', class: 'btn', text: 'Carta nova', onclick: () => editar(null) })) : null);
  }
  function editar(c) {
    const novo = !c;
    c = c || B.carta({ num: 22, nome: 'Carta nova' });
    const f = {
      nome: h('input', { class: 'in', value: c.nome, maxlength: 60 }), num: h('input', { class: 'in', type: 'number', value: c.num }),
      tipo: h('select', { class: 'in' }, h('option', { value: '', text: 'Sem tipo' }), B.TIPOS.map(t => h('option', { value: t[0], text: t[1] }))),
      inverte: h('input', { type: 'checkbox', checked: c.inverte }), chance: h('input', { class: 'in', type: 'number', min: 0, max: 100, value: c.chance }),
      efeito: h('textarea', { class: 'in', value: c.efeito }), invertida: h('textarea', { class: 'in', value: c.invertida }), leitura: h('textarea', { class: 'in', value: c.leitura }),
    };
    f.tipo.value = c.tipo || '';
    const campo = (r, el) => h('label', { class: 'field' }, h('span', { text: r }), el);
    J.abrir('', [h('h2', { text: novo ? 'Carta nova' : 'Editar ' + c.nome }), campo('Nome', f.nome), campo('Número', f.num), campo('Tipo', f.tipo),
      h('label', { class: 'field' }, h('span', null, f.inverte, ' Pode sair invertida')), campo('Chance de sair invertida (%)', f.chance),
      campo('O que faz', f.efeito), campo('Invertida', f.invertida), campo('Na leitura (o significado)', f.leitura),
      J.pe(h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: () => J.fechar() }), h('button', { type: 'button', class: 'btn pri', text: 'Salvar', onclick: () => {
        const C = cs(), n = B.carta(Object.assign({}, c, { nome: f.nome.value, num: f.num.value, tipo: f.tipo.value || null, inverte: f.inverte.checked, chance: f.chance.value, efeito: f.efeito.value, invertida: f.invertida.value, leitura: f.leitura.value }));
        const l = C.cartas.filter(x => x.id !== n.id).concat(n);
        gravar(B.CARTAS_DOC, { v: 1, cartas: l }, null, 'mesa');
        J.fechar(); pintar(); toast('Carta salva.');
      } }))]);
  }

  /* ---------------- partida ---------------- */
  $('pc').onchange = ev => { pcSel = ev.target.value; pintar(); };
  for (const b of document.querySelectorAll('#vista button')) b.onclick = () => { vista = b.getAttribute('data-v'); pintar(); };
  let tP = 0;
  const depois = () => { clearTimeout(tP); tP = setTimeout(pintar, 80); };
  async function partida() {
    const TCx = window.TC;
    if (TCx && TCx.ponte) {
      st = await TCx.ponte.pronta;
      if (TCx.ponte.naCasca) document.documentElement.classList.add('na-casca');
      if (TCx.dados && TCx.dados.disponivel()) {
        naMesa = true;
        D = TCx.dados.col('documentos'); P = TCx.dados.col('personagens');
        await Promise.all([D.pronta, P.pronta]);
        D.aoMudar(l => { if (l && typeof l.id === 'string' && l.id.startsWith('baralho:')) depois(); });
        P.aoMudar(() => depois());
      }
      const ler = s => { st = s; eu = s && s.eu; mestre = !s || !s.mesa ? true : (s.papel === 'mestre' || !!(TCx.ponte.mestra && TCx.ponte.mestra('baralho'))); };
      ler(st);
      TCx.ponte.aoMudar(s => { ler(s); depois(); });
    } else mestre = true;
    if (!naMesa) { try { local.docs = JSON.parse(localStorage.getItem('tinycats:baralho') || '{}') || {}; } catch (e) { local.docs = {}; } $('salvo').textContent = 'Neste navegador'; }
    pintar();
  }
  partida().catch(e => { console.error(e); trocar($('meio'), h('div', { class: 'vazio' }, h('strong', { text: 'Não deu para abrir o Baralho. ' }), (e && e.message) || '')); });
})();
