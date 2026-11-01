/* Tiny Cats · Pistas (lote 31): a página de quem joga.
   O que o mestre entregou — à mesa toda ou só a esta pessoa —, a mais nova primeiro: as imagens (abrem grandes), as
   cartas (com os trechos que o mestre ainda não revelou como manchas) e os puzzles, que todo mundo que recebeu resolve
   junto: cada lance vai ao banco (que junta os de todos e confere a resposta) e aparece para os outros. Ao resolver, a
   Mesa ao vivo avisa. As pistas são os documentos pista:<id> (e pista:jogo:<id>, o puzzle) que o banco entrega a quem
   recebeu (ver tc/escudo.js). Fora de uma mesa não há pistas. */
(() => {
  'use strict';
  const E = window.TC.escudo, U = window.TC.dom, PUI = window.TC.pistasUI;
  const { h, icone, morphEm, guarda } = U;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const $ = id => document.getElementById(id);
  const j = JSON.stringify;
  const toast = U.avisos($('toasts'));
  const J = U.janelas($('dlg'));
  const ICO = {
    imagem: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4 2.5-2.5L20 17M15.5 9.5a1.5 1.5 0 1 0 0-.01',
    carta: 'M5 3.5h10l4 4V20.5H5zM15 3.5v4h4M8 11h8M8 14.5h8M8 18h5',
    puzzle: 'M9 3.5h3a2 2 0 1 1 4 0h3v5a2 2 0 1 0 0 4v5h-5a2 2 0 1 1-4 0H5v-5a2 2 0 1 0 0-4v-5z',
  };
  let st = null, D = null, naMesa = false, pronto = false;
  let sel = null, filtro = 'todas', busca = '', selPeca = null;
  let vista = null, PC = null;                        // (lote 53) 'pistas' ou 'casos' (os mistérios abertos à mesa)
  const pend = {};                                    // os lances que ainda não voltaram do banco: id do jogo → { mudas, n }
  const chaveVistas = () => 'tinycats:pistas:vistas:' + (st && st.mesa ? st.mesa.id : 'local');
  let vistas = {};
  const lerVistas = () => { try { const v = JSON.parse(guarda.ler(chaveVistas()) || '{}'); vistas = v && typeof v === 'object' ? v : {}; } catch (e) { vistas = {}; } };
  const marcarVista = x => { if ((vistas[x.id] || 0) >= x.rev) return; vistas[x.id] = x.rev; guarda.gravar(chaveVistas(), j(vistas)); };
  const nomeDe = uid => { const m = st && (st.membros || []).find(x => (x.id || x.usuario_id) === uid); return m ? (uid === st.eu ? m.nome + ' (você)' : m.nome) : ''; };

  function pistas() {
    if (!D) return [];
    return D.todas().filter(l => !l.apagado && E.hidDaPista(l.id)).map(l => ({ id: l.id, p: E.normPista(l.dados), rev: l.rev || 1 }))
      .sort((a, b) => String(b.p.em || '').localeCompare(String(a.p.em || '')));
  }
  const jogoIdDe = id => E.PRE.jogo + id.slice(E.PRE.pista.length);
  function jogoDe(id) {
    const l = D.pegar(jogoIdDe(id));
    if (!l || l.apagado) return null;
    const jg = E.normJogo(l.dados);
    if (!jg) return null;
    const p = pend[l.id];
    if (p && !jg.resolvido) {
      const est = Object.assign({}, jg.estado);
      for (const k of Object.keys(p.mudas)) { if (p.mudas[k] === null) delete est[k]; else est[k] = p.mudas[k]; }
      return Object.assign({}, jg, { estado: est });
    }
    return jg;
  }
  const nova = x => (vistas[x.id] || 0) < x.rev;
  const ERRO = { charada: 'Não é isso.', cadeado: 'O cadeado não abriu.', placas: 'As placas afundaram e voltaram: a ordem não era essa.' };
  function jogar(x, op, mudas, prova) {
    const jid = jogoIdDe(x.id);
    const p = pend[jid] || (pend[jid] = { mudas: {}, n: 0 });
    for (const k of Object.keys(mudas)) if (k !== '_txt') p.mudas[k] = mudas[k];
    p.n++;
    pintar();
    const fim = () => { const q = pend[jid]; if (q && --q.n <= 0) delete pend[jid]; };
    return TC.ponte.escudo('jogar', { id: jid, op, mudas, prova }).then(r => {
      fim(); pintar();
      if (op === 'acertar') {
        toast('Resolvido!');
        TC.ponte.publicar('pistas', { titulo: 'Puzzle resolvido', resumo: '“' + x.p.nome + '” foi resolvido.' });
      } else if (op === 'errar') { const jg = jogoDe(x.id); toast(ERRO[jg && jg.tipo] || 'Não deu.'); }
      return r;
    }, e => { delete pend[jid]; pintar(); throw e; });
  }
  function ampliar(url) {
    J.abrir('', [h('img', { src: url, alt: '' }), J.pe(h('button', { type: 'button', class: 'btn', 'data-k': 'zoom:fechar', onclick: () => J.fechar() }, 'Fechar'))]);
  }

  /* ---------------- pintar ---------------- */
  function pintar() {
    if (!pronto) return;
    // (lote 53) as pistas soltas e os casos: com um caso aberto à mesa, o seletor no alto
    const nCasos = PC && naMesa ? PC.casos().length : 0, nPistas = naMesa ? pistas().length : 0;
    if (!nCasos) vista = 'pistas'; else if (!vista) vista = nPistas ? 'pistas' : 'casos';
    $('vista').hidden = !nCasos;
    for (const b of document.querySelectorAll('#vista button')) b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === vista));
    $('filtro').hidden = vista === 'casos'; $('busca').hidden = vista === 'casos';
    if (vista === 'casos') { const n = PC.pintar(); if (n) U.trocar($('meio'), n); return; }
    for (const b of document.querySelectorAll('#filtro button')) b.setAttribute('aria-pressed', String(b.getAttribute('data-f') === filtro));
    if (!naMesa) { morphEm($('meio'), [h('div', { class: 'vazio' }, h('p', { class: 'tit', text: 'Pistas' }), h('p', { text: 'Numa mesa, aqui ficam as imagens, as cartas e os puzzles que o mestre entregar.' }))]); return; }
    const todas = pistas();
    if (sel && !todas.some(x => x.id === sel)) sel = null;
    const vis = todas.filter(x => (filtro === 'todas' || (filtro === 'novas' ? nova(x) : x.p.tipo === 'puzzle'))
      && (!busca || E.sem(x.p.nome + ' ' + x.p.partes.filter(p => typeof p === 'string').join(' ') + ' ' + x.p.legenda).includes(E.sem(busca))));
    if (!todas.length) {
      morphEm($('meio'), [h('div', { class: 'vazio' }, h('p', { class: 'tit', text: 'Nenhuma pista ainda' }),
        h('p', { text: 'Quando o mestre entregar uma imagem, uma carta ou um puzzle, aparece aqui (e numa janela, na hora).' }))]);
      return;
    }
    if (!sel && vis.length && window.matchMedia && !matchMedia('(max-width: 860px)').matches) sel = vis[0].id;
    const status = x => {
      if (x.p.tipo !== 'puzzle') return 'Recebida às ' + U.hora(x.p.em) + ' de ' + U.dataHora(x.p.em).split(' ')[0];
      const jg = jogoDe(x.id);
      return x.p.puzzle ? x.p.puzzle.nome + (jg && jg.resolvido ? ' · resolvido' : ' · por resolver') : 'Puzzle';
    };
    const lista = h('nav', { class: 'lista', 'aria-label': 'As pistas' },
      vis.length ? vis.map(x => h('button', { type: 'button', class: 'item', 'data-k': 'pi:' + x.id, 'aria-current': String(x.id === sel), onclick: () => { sel = x.id; selPeca = null; pintar(); const d = document.querySelector('.det'); if (d && window.matchMedia && matchMedia('(max-width: 860px)').matches) d.scrollIntoView(); } },
        h('span', { class: 'ico' }, icone(ICO[x.p.tipo], 20)), h('span', { class: 'nm' }, h('b', { text: x.p.nome }), h('small', { text: status(x) })),
        nova(x) && x.id !== sel ? h('span', { class: 'badge nova', text: 'Nova' }) : null))
        : h('p', { class: 'ajuda', text: 'Nada com este filtro.' }));
    const x = sel ? todas.find(y => y.id === sel) : null;
    let det = null;
    if (x) {
      marcarVista(x);
      const jg = x.p.tipo === 'puzzle' ? jogoDe(x.id) : null;
      const temConteudo = x.p.img || x.p.partes.some(p => typeof p === 'number' || String(p).trim());
      det = h('section', { class: 'det', 'aria-label': x.p.nome },
        x.p.tipo !== 'puzzle' || temConteudo ? PUI.handout(x.p, { grande: true, aoAmpliar: ampliar }) : h('h2', { class: 'ho-tit', style: { textAlign: 'center' }, text: x.p.nome }),
        x.p.tipo === 'puzzle' ? (jg ? PUI.puzzle(jg, { chave: 'pz:', eu: st && st.eu, quem: nomeDe, sel: selPeca, escolher: i => { selPeca = i; pintar(); }, aviso: toast, jogar: (op, mudas, prova) => jogar(x, op, mudas, prova) })
          : h('p', { class: 'ajuda', text: 'O puzzle está chegando…' })) : null);
    }
    morphEm($('meio'), [h('div', { class: 'cols' }, lista, det || h('div', { class: 'vazio', style: { margin: '30px auto' } }, h('p', { text: 'Escolha uma pista na lista.' })))]);
  }
  let tP = 0;
  const depois = () => { clearTimeout(tP); tP = setTimeout(pintar, 80); };
  $('busca').oninput = ev => { busca = ev.target.value; pintar(); };
  for (const b of document.querySelectorAll('#filtro button')) b.onclick = () => { filtro = b.getAttribute('data-f'); pintar(); };

  /* ---------------- partida ---------------- */
  async function partida() {
    const TCx = window.TC;
    if (TCx && TCx.ponte) {
      st = await TCx.ponte.pronta;
      if (TCx.ponte.naCasca) document.documentElement.classList.add('na-casca');
      if (TCx.dados && TCx.dados.disponivel()) {
        naMesa = true;
        D = TCx.dados.col('documentos');
        await D.pronta;
        D.aoMudar(l => { if (l && typeof l.id === 'string' && (l.id.startsWith(E.PRE.pista) || l.id.startsWith('escudo:mpub:') || l.id.startsWith('mural:'))) depois(); });
      }
      TCx.ponte.aoMudar(e => { st = e; if (pronto) depois(); });
      if (TCx.ponte.aoIr) TCx.ponte.aoIr(alvo => {
        if (alvo && typeof alvo.caso === 'string') { vista = 'casos'; if (PC) PC.escolher(alvo.caso); if (pronto) pintar(); return; }
        if (!alvo || typeof alvo.pista !== 'string') return;
        const id = alvo.pista.startsWith(E.PRE.pista) ? alvo.pista : E.PRE.pista + alvo.pista;
        sel = id; filtro = 'todas'; busca = ''; $('busca').value = ''; selPeca = null;
        if (pronto) pintar();
      });
    }
    lerVistas();
    if (window.PistasCasos && window.TC.misterio) PC = window.PistasCasos({ D: () => D, st: () => st, toast, J, pintar: () => depois() });
    for (const b of document.querySelectorAll('#vista button')) b.onclick = () => { vista = b.getAttribute('data-v'); pintar(); };
    pronto = true;
    pintar();
  }
  if (DEBUG) window.__pistas = { get PC() { return PC; }, get vista() { return vista; }, E, get naMesa() { return naMesa; }, get pronto() { return pronto; }, get sel() { return sel; }, pistas: () => pistas().map(x => ({ id: x.id, p: x.p })), jogo: id => jogoDe(id), pintar, escolher: id => { sel = id; pintar(); } };
  partida().catch(e => {
    console.error(e);
    U.trocar($('meio'), h('div', { class: 'vazio' }, h('strong', { text: 'Não deu para abrir as Pistas. ' }), (e && e.message) || '', ' ',
      h('button', { type: 'button', class: 'btn sm', text: 'Tentar de novo', onclick: () => location.reload() })));
  });
})();
