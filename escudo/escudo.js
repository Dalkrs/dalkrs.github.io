/* Tiny Cats · Escudo do mestre (lote 31): a página.
   Três partes: o Roteiro (as sessões, cada uma com os passos — que podem se ligar a uma cena, a um lugar do Mapa-múndi,
   a um encontro do Bestiário, a um handout ou a um relógio, e o clique faz a ação —; abrir a sessão, fechar com o resumo
   e levar os passos que sobraram para a próxima; o resumo vai para o rascunho do Jornal), os Relógios de ameaça (os
   gomos, a consequência, os que a mesa vê, a sugestão quando passa um dia no Mapa-múndi) e os Handouts e puzzles
   (escudo/handouts.js). Na mesa, cada coisa é um documento só de quem mestra o Escudo (ver tc/escudo.js); fora de uma
   mesa, tudo fica neste navegador (e não há a quem entregar). Nada muda sozinho: cada mudança tem Desfazer. */
(() => {
  'use strict';
  const E = window.TC.escudo, U = window.TC.dom, PUI = window.TC.pistasUI;
  const { h, svg, icone, morphEm, guarda } = U;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const $ = id => document.getElementById(id);
  const j = JSON.stringify;
  const copia = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const toast = U.avisos($('toasts'));
  const J = U.janelas($('dlg'));
  const ICO = {
    sessao: 'M6 3.5h9l3 3V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20zM9 9h6M9 12.5h6M9 16h4',
    cena: 'M3 5h18v14H3zM3 9h18M8 5v4',
    lugar: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
    encontro: 'M14.5 3.5H20.5v6L10 20l-6-6zM3.5 20.5l3-3M7.5 13.5l3 3',
    handout: 'M6 3.5h12v17H6zM9 8h6M9 11.5h6M9 15h3',
    relogio: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v9l6 4',
    imagem: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4 2.5-2.5L20 17M15.5 9.5a1.5 1.5 0 1 0 0-.01',
    carta: 'M4 6h16v12H4zM4 6l8 6.5L20 6',
    puzzle: 'M9 3.5h3a2 2 0 1 1 4 0h3v5a2 2 0 1 0 0 4v5h-5a2 2 0 1 1-4 0H5v-5a2 2 0 1 0 0-4v-5z',
  };

  /* ---------------- os documentos ---------------- */
  let st = null, D = null, A = null, naMesa = false, pronto = false, bancoOk = null, souMestreDaMesa = true;
  let aba = ['roteiro', 'relogios', 'handouts'].includes(guarda.ler('tinycats:escudo:aba')) ? guarda.ler('tinycats:escudo:aba') : 'roteiro';
  let selS = guarda.ler('tinycats:escudo:sessao') || null;
  const notas = new Set();                                           // os passos com a nota aberta
  let pilha = [], tSalvo = 0, ultimoTexto = null;
  // fora de uma mesa: uma coleção neste navegador, com o mesmo jeito da da mesa
  function colLocal(chave) {
    let linhas;
    try { const d = JSON.parse(guarda.ler(chave) || '{}'); linhas = new Map(Object.entries(d && typeof d === 'object' ? d : {})); } catch (e) { linhas = new Map(); }
    const ouvintes = [];
    const salvar = () => { if (!guarda.gravar(chave, j(Object.fromEntries(linhas)))) toast('Não deu para guardar neste navegador (a imagem pode ser grande demais).'); };
    return {
      pronta: Promise.resolve(), todas: () => [...linhas.values()], pegar: id => linhas.get(id) || null,
      gravar(id, campos) { const l = Object.assign({}, linhas.get(id) || { id, vis: 'mestre' }, copia(campos), { id, apagado: false }); linhas.set(id, l); salvar(); for (const f of ouvintes) f(l); return l; },
      apagar(id) { linhas.delete(id); salvar(); for (const f of ouvintes) f({ id, apagado: true }); },
      aoMudar(fn) { ouvintes.push(fn); },
    };
  }
  const naCasca = () => !!(window.TC && TC.ponte && TC.ponte.naCasca && TC.ponte.ir);
  const campVista = () => (st && st.campanha ? st.campanha.id : null);
  // (os participantes, como a ponte os dá: id é o do usuário)
  const membros = () => (st && Array.isArray(st.membros) ? st.membros : []).map(m => ({ usuario_id: m.id || m.usuario_id, nome: m.nome, papel: m.papel, cargo: m.cargo, campanhas: m.campanhas }));
  const jogadores = () => membros().filter(m => m.papel === 'jogador' || m.cargo === 'jogador');
  const nomeDe = uid => { const m = membros().find(x => x.usuario_id === uid); return m ? m.nome : ''; };
  const porCampanha = (itens, campDe) => (naMesa && TC.ponte && TC.ponte.porCampanha ? TC.ponte.porCampanha(itens, campDe) : (itens.length ? [{ id: '', nome: '', vista: true, itens }] : []));
  const nomeCamp = id => { if (!id) return 'Do mundo'; const c = st && (st.campanhas || []).find(x => x.id === id); return c ? c.nome : 'Outra campanha'; };

  function marcarSalvo() {
    const el = $('salvo');
    el.textContent = naMesa ? 'Salvando…' : 'Neste navegador';
    clearTimeout(tSalvo);
    if (naMesa) tSalvo = setTimeout(() => { el.textContent = 'Salvo na mesa'; }, 700);
  }
  function empilhar(rotulo, f) {
    if (!f) return;
    pilha.push({ rotulo, f });
    if (pilha.length > 60) pilha.shift();
    $('btDesfazer').disabled = false;
    marcarSalvo();
  }
  // mudar: a foto do antes, a mudança, o Desfazer
  function mudar(rotulo, ids, fn) {
    const f = A.foto(ids);
    const r = fn();
    empilhar(rotulo, f);
    pintar();
    return r;
  }
  // um campo de texto: as letras seguidas de um mesmo campo são um passo só do Desfazer
  function mudarTexto(chave, rotulo, ids, fn) {
    const agora = Date.now();
    if (ultimoTexto && ultimoTexto.chave === chave && agora - ultimoTexto.t < 2500 && pilha[pilha.length - 1] === ultimoTexto.passo) { fn(); ultimoTexto.t = agora; marcarSalvo(); return; }
    const f = A.foto(ids);
    fn();
    empilhar(rotulo, f);
    ultimoTexto = { chave, t: agora, passo: pilha[pilha.length - 1] };
  }
  function desfazer(passo) {
    const i = passo ? pilha.indexOf(passo) : pilha.length - 1;
    if (i < 0) return;
    const p = pilha.splice(i, 1)[0];
    $('btDesfazer').disabled = !pilha.length;
    ultimoTexto = null;
    try { A.voltar(p.f); toast('Desfeito: ' + p.rotulo + '.'); } catch (e) { toast((e && e.message) || 'Não deu para desfazer.'); }
    pintar();
  }
  function avisoDesfazer(texto, ms) { const p = pilha[pilha.length - 1]; toast(texto, 'Desfazer', () => desfazer(p), ms); }
  $('btDesfazer').onclick = () => desfazer();

  /* ---------------- o relógio (o desenho) ---------------- */
  function relogioSvg(id, r, tam, clicavel) {
    const s = document.createElementNS(U.NS, 'svg');
    s.setAttribute('width', tam); s.setAttribute('height', tam); s.setAttribute('viewBox', '-52 -52 104 104'); s.setAttribute('class', 'relogio-svg');
    s.setAttribute('role', 'img'); s.setAttribute('aria-label', r.nome + ': ' + r.cheio + ' de ' + r.gomos);
    const cor = E.CORES[r.cor][1], n = r.gomos;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
      const p = document.createElementNS(U.NS, 'path');
      const R = 46;
      p.setAttribute('d', 'M0 0L' + (R * Math.cos(a0)).toFixed(2) + ' ' + (R * Math.sin(a0)).toFixed(2) + 'A' + R + ' ' + R + ' 0 0 1 ' + (R * Math.cos(a1)).toFixed(2) + ' ' + (R * Math.sin(a1)).toFixed(2) + 'Z');
      p.setAttribute('fill', i < r.cheio ? cor : 'rgba(127,135,155,.16)');
      p.setAttribute('stroke', 'var(--surface)'); p.setAttribute('stroke-width', '2.5');
      if (clicavel) {
        p.setAttribute('class', 'gomo'); p.setAttribute('data-gomo', String(i));
        const t = document.createElementNS(U.NS, 'title'); t.textContent = i < r.cheio && i === r.cheio - 1 ? 'Esvaziar este gomo' : 'Encher até aqui'; p.append(t);
      }
      s.append(p);
    }
    const c = document.createElementNS(U.NS, 'circle');
    c.setAttribute('r', '46'); c.setAttribute('fill', 'none'); c.setAttribute('stroke', cor); c.setAttribute('stroke-width', '2.5');
    s.append(c);
    if (clicavel) s.onclick = ev => { const g = ev.target.closest('[data-gomo]'); if (!g) return; const i = Number(g.getAttribute('data-gomo')); const r2 = A.relogio(id); if (!r2) return; definirGomos(id, i < r2.cheio && i === r2.cheio - 1 ? i : i + 1); };
    return s;
  }
  function definirGomos(id, alvo) {
    const r = A.relogio(id);
    if (!r) return;
    andarRelogio(id, alvo - r.cheio);
  }
  function andarRelogio(id, n) {
    const f = A.foto([E.PRE.relogio + id]);
    const res = A.avancarRelogio(id, n);
    if (!res || res.antes === res.r.cheio) return;
    empilhar((n > 0 ? 'avançar ' : 'voltar ') + res.r.nome, f);
    pintar();
    if (res.encheu) avisoDesfazer(res.r.nome + ' encheu!' + (res.r.consequencia ? ' ' + res.r.consequencia : ''), 14000);
  }

  /* ---------------- o roteiro ---------------- */
  const ROT_LIGA = { cena: 'Abrir a cena', lugar: 'Ver no mapa', encontro: 'Puxar para a cena', relogio: '+1 gomo' };
  function nomeDaLiga(l) {
    if (!l) return null;
    if (l.k === 'cena') { const d = A.dadosDe('cena:' + l.id + ':m'); return d ? (String(d.name || '') || 'Cena') : null; }
    if (l.k === 'lugar') { const m = A.dadosDe('mundo:mapa:' + l.mapa); const o = m && Array.isArray(m.objs) ? m.objs.find(x => x && x.id === l.obj) : null; return o ? (String(o.nome || '') || 'Lugar') + ' · ' + (String(m.nome || '') || 'Mapa') : null; }
    if (l.k === 'encontro') { const d = A.dadosDe('best:enc:' + l.id); return d ? String(d.nome || 'Encontro') : null; }
    if (l.k === 'handout') { const x = A.handout(l.id); return x ? x.nome : null; }
    if (l.k === 'relogio') { const x = A.relogio(l.id); return x ? x.nome + ' (' + x.cheio + '/' + x.gomos + ')' : null; }
    return null;
  }
  async function irPasso(sid, p) {
    const l = p.liga;
    if (!l) return;
    if (l.k === 'relogio') {
      const r = A.relogio(l.id);
      if (!r) { toast('Este relógio não existe mais.'); return; }
      const f = A.foto([E.PRE.relogio + l.id]);
      const res = A.avancarRelogio(l.id, l.n);
      empilhar('avançar ' + r.nome, f);
      pintar();
      avisoDesfazer(res.r.nome + ': ' + res.antes + ' → ' + res.r.cheio + ' de ' + res.r.gomos + (res.encheu ? ' — encheu!' + (res.r.consequencia ? ' ' + res.r.consequencia : '') : '.'), res.encheu ? 14000 : null);
      return;
    }
    if (l.k === 'handout') {
      const x = A.handout(l.id);
      if (!x) { toast('Este handout não existe mais.'); return; }
      if (!x.entregue) { HO.entregarDlg(l.id); return; }
      aba = 'handouts'; HO.selecionar(l.id); guarda.gravar('tinycats:escudo:aba', aba); pintar();
      return;
    }
    if (!naCasca()) { toast('Para ir até lá, abra o Escudo pelo site (a aba Escudo do mestre).'); return; }
    if (l.k === 'cena') { if (!A.dadosDe('cena:' + l.id + ':m')) { toast('Esta cena não existe mais.'); return; } TC.ponte.ir('cenas', { cena: l.id }); }
    else if (l.k === 'lugar') TC.ponte.ir('mundo', { mapa: l.mapa, obj: l.obj });
    else if (l.k === 'encontro') {
      const d = A.dadosDe('best:enc:' + l.id);
      const itens = d && Array.isArray(d.itens) ? d.itens.filter(x => x && typeof x.id === 'string' && x.n > 0).map(x => ({ id: x.id, n: Math.min(30, Math.round(x.n)) })) : [];
      if (!itens.length) { toast('Este encontro não existe mais no Bestiário.'); return; }
      TC.ponte.ir('cenas', { bestiario: { itens, ocultos: false } });
      const s = A.sessao(sid);
      if (s && s.estado === 'aberta') A.logar('encontro', String(d.nome || 'Encontro') + ' foi para a cena', s.camp);
    }
  }
  // as coisas a que um passo pode se ligar
  function opcoesDeLiga() {
    const out = { cena: [], lugar: [], encontro: [], handout: [], relogio: [] };
    if (naMesa) {
      const idx = A.dadosDe('cenas:indice'), ordem = idx && Array.isArray(idx.ordem) ? idx.ordem : [];
      for (const l of D.todas()) {
        if (l.apagado || typeof l.id !== 'string') continue;
        let m = /^cena:([A-Za-z0-9_-]{1,60}):m$/.exec(l.id);
        if (m && m[1] !== 'pub' && l.dados) { out.cena.push({ liga: { k: 'cena', id: m[1] }, nome: String(l.dados.name || 'Cena'), sub: 'Cena', ord: ordem.indexOf(m[1]) < 0 ? 1e9 : ordem.indexOf(m[1]) }); continue; }
        m = /^mundo:mapa:([A-Za-z0-9_-]{1,40})$/.exec(l.id);
        if (m && l.dados && Array.isArray(l.dados.objs)) {
          for (const o of l.dados.objs) if (o && (o.k === 'm' || o.k === 'r') && typeof o.id === 'string' && o.nome) out.lugar.push({ liga: { k: 'lugar', mapa: m[1], obj: o.id }, nome: String(o.nome), sub: (o.k === 'r' ? 'Região' : 'Lugar') + ' · ' + String(l.dados.nome || 'Mapa') });
          continue;
        }
        m = /^best:enc:([A-Za-z0-9_-]{1,40})$/.exec(l.id);
        if (m && l.dados) out.encontro.push({ liga: { k: 'encontro', id: m[1] }, nome: String(l.dados.nome || 'Encontro'), sub: 'Encontro guardado no Bestiário' });
      }
      out.cena.sort((a, b) => a.ord - b.ord);
    }
    for (const x of A.handouts()) out.handout.push({ liga: { k: 'handout', id: x.id }, nome: x.h.nome, sub: E.TIPOS_HANDOUT[x.h.tipo] + (x.h.entregue ? ' · já entregue' : '') });
    for (const x of A.relogios()) out.relogio.push({ liga: { k: 'relogio', id: x.id, n: 1 }, nome: x.r.nome, sub: 'Relógio · avança 1 gomo' });
    return out;
  }
  // escolher a que ligar (→ promessa: a ligação, null para tirar, undefined se cancelou)
  function escolherLiga(atual) {
    return new Promise(resolve => {
      const ops = opcoesDeLiga();
      let tipo = atual && ops[atual.k] ? atual.k : 'cena', busca = '';
      let feito = false;
      const fim = v => { if (feito) return; feito = true; J.fechar(); resolve(v); };
      const corpo = h('div', { class: 'escolha' });
      const pintarEsc = () => {
        const l = ops[tipo].filter(x => !busca || E.sem(x.nome + ' ' + x.sub).includes(E.sem(busca))).slice(0, 200);
        U.trocar(corpo,
          h('div', { class: 'seg', role: 'group', 'aria-label': 'Ligar a' }, Object.keys(E.LIGAS).map(k => h('button', { type: 'button', 'data-k': 'lg:' + k, 'aria-pressed': String(k === tipo), onclick: () => { tipo = k; pintarEsc(); } }, E.LIGAS[k], ops[k].length ? ' (' + ops[k].length + ')' : ''))),
          h('input', { class: 'in', 'data-k': 'lg:busca', placeholder: 'Buscar…', value: busca, oninput: ev => { busca = ev.target.value; pintarEsc(); const i = corpo.querySelector('[data-k="lg:busca"]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }),
          l.length ? h('div', { class: 'opcoes' }, l.map((x, i) => h('button', { type: 'button', 'data-k': 'lg:op' + i, onclick: () => fim(x.liga) }, h('b', { text: x.nome }), h('small', { text: x.sub }))))
            : h('p', { class: 'ajuda', text: !naMesa && ['cena', 'lugar', 'encontro'].includes(tipo) ? 'Numa mesa, aparecem aqui as cenas, os lugares do Mapa-múndi e os encontros guardados no Bestiário.' : 'Nada aqui ainda.' }));
      };
      pintarEsc();
      J.abrir('largo', [h('h2', { text: 'Ligar o passo a…' }), h('p', { text: 'O clique no passo faz a ação: abre a cena, leva ao lugar no mapa, puxa o encontro para a cena, entrega o handout ou avança o relógio.' }), corpo,
        J.pe(atual ? h('button', { type: 'button', class: 'btn per', 'data-k': 'lg:tirar', onclick: () => fim(null) }, 'Tirar a ligação') : null, h('span', { class: 'grow' }), h('button', { type: 'button', class: 'btn', 'data-k': 'lg:cancelar', onclick: () => fim(undefined) }, 'Cancelar'))], () => fim(undefined));
    });
  }
  function mudarSessao(sid, rotulo, fn, chaveTexto) {
    const id = E.PRE.sessao + sid;
    const faz = () => { const s = A.sessao(sid); if (!s) return; fn(s); A.gravarSessao(sid, s); };
    if (chaveTexto) { mudarTexto(chaveTexto, rotulo, [id], faz); return; }
    mudar(rotulo, [id], faz);
  }
  function novaSessao() {
    const camp = campVista();
    let id;
    mudar('criar uma sessão', [], () => { id = A.sessaoNova(camp); });
    pilha[pilha.length - 1].f.push({ id: E.PRE.sessao + id, l: null });
    selS = id; guarda.gravar('tinycats:escudo:sessao', id);
    pintar();
    setTimeout(() => { const el = document.querySelector('[data-k="s:novo"]'); if (el) el.focus(); }, 30);
  }
  function fecharDlg(sid) {
    const s = A.sessao(sid);
    if (!s) return;
    const sob = E.sobras(s), prox = E.proximaPlanejada(A.sessoes(), s.camp, sid);
    const caixas = sob.map(p => h('input', { type: 'checkbox', checked: true, 'data-k': 'fc:' + p.id, 'data-p': p.id }));
    const ok = () => {
      const levar = caixas.filter(c => c.checked).map(c => c.getAttribute('data-p'));
      const ids = [E.PRE.sessao + sid].concat(prox ? [E.PRE.sessao + prox.id] : []);
      const f = A.foto(ids);
      const destino = A.fecharSessao(sid, levar);
      if (destino && !ids.includes(E.PRE.sessao + destino)) f.push({ id: E.PRE.sessao + destino, l: null });
      empilhar('fechar ' + s.nome, f);
      J.fechar(); pintar();
      avisoDesfazer(s.nome + ' fechada. O resumo está pronto' + (destino ? '; os passos que sobraram foram para ' + A.sessao(destino).nome : '') + '.');
    };
    J.abrir('', [h('h2', { text: 'Fechar ' + s.nome }),
      h('p', { text: sob.length ? 'Estes passos não aconteceram. Os marcados passam para ' + (prox ? prox.s.nome : 'uma sessão nova') + ':' : 'Todos os passos aconteceram.' }),
      sob.length ? h('div', { class: 'jogadores', style: { paddingLeft: '0' } }, sob.map((p, i) => h('label', { class: 'chk' }, caixas[i], h('span', { text: p.txt || 'Passo sem nome' })))) : null,
      h('p', { class: 'ajuda', style: { marginTop: '10px' }, text: 'Ao fechar, sai o resumo da sessão: o que aconteceu, as pistas, os puzzles e os relógios que andaram. Ele pode ir para o rascunho do Jornal.' }),
      J.pe(h('button', { type: 'button', class: 'btn', 'data-k': 'fc:cancelar', onclick: () => J.fechar() }, 'Cancelar'), h('button', { type: 'button', class: 'btn pri', 'data-k': 'fc:ok', onclick: ok }, 'Fechar a sessão'))]);
  }
  function levarAoJornal(sid) {
    const s = A.sessao(sid);
    if (!s || !s.resumo.trim()) { toast('O resumo está vazio.'); return; }
    if (!naMesa) { toast('Numa mesa, o resumo vai para o rascunho do Jornal.'); return; }
    const ras = A.dadosDe('jornal:rascunho') || { v: 1, nome: 'O Arauto', materias: [], notas: [], cartas: [] };
    const mats = Array.isArray(ras.materias) ? ras.materias.slice() : [];
    if (mats.length >= 30) { toast('O rascunho do Jornal já tem 30 matérias: publique ou tire alguma antes.'); return; }
    const mid = E.novoId('mt');
    mats.push({ id: mid, tit: s.nome + (s.quando ? ' — ' + s.quando : ''), txt: s.resumo, ass: '', dest: false });
    mudar('levar o resumo ao Jornal', ['jornal:rascunho'], () => { D.gravar('jornal:rascunho', Object.assign({ dados: Object.assign({}, ras, { materias: mats }) }, A.linhaViva('jornal:rascunho') ? {} : { vis: 'mestre' })); });
    toast('O resumo foi para o rascunho do Jornal.', naCasca() ? 'Abrir o Jornal' : null, () => TC.ponte.ir('jornal', { materia: mid, rascunho: true }));
  }
  function moverPasso(sid, pid, d) {
    mudarSessao(sid, 'mover um passo', s => { const i = s.passos.findIndex(p => p.id === pid), k = i + d; if (i < 0 || k < 0 || k >= s.passos.length) return; const [p] = s.passos.splice(i, 1); s.passos.splice(k, 0, p); });
  }
  function pintarRoteiro() {
    const ss = A.sessoes();
    if (selS && !ss.some(x => x.id === selS)) selS = null;
    if (!selS) { const ab = A.sessaoAberta(campVista()); const pr = E.proximaPlanejada(ss, campVista()); selS = (ab || pr || ss[ss.length - 1] || {}).id || null; }
    const grupos = porCampanha(ss.slice().sort((a, b) => b.s.n - a.s.n), x => x.s.camp);
    const BAD = { plano: ['Planejada', ''], aberta: ['Em jogo', 'ouro'], fechada: ['Jogada', 'ok'] };
    const lista = h('nav', { class: 'lista', 'aria-label': 'As sessões' },
      h('button', { type: 'button', class: 'btn pri', 'data-k': 'sessao:nova', onclick: novaSessao }, '+ Sessão'),
      grupos.map(g => [g.nome ? h('div', { class: 'grupo', text: g.nome }) : null, g.itens.map(x => h('button', { type: 'button', class: 'item', 'data-k': 'ss:' + x.id, 'aria-current': String(x.id === selS), onclick: () => { selS = x.id; guarda.gravar('tinycats:escudo:sessao', x.id); pintar(); } },
        h('span', { class: 'ico' }, icone(ICO.sessao, 18)), h('span', { class: 'nm' }, h('b', { text: x.s.nome }), h('small', { text: (x.s.quando ? x.s.quando + ' · ' : '') + x.s.passos.length + (x.s.passos.length === 1 ? ' passo' : ' passos') })),
        h('span', { class: 'badge ' + BAD[x.s.estado][1], text: BAD[x.s.estado][0] })))]),
      !ss.length ? h('p', { class: 'ajuda', text: 'Cada sessão é uma lista de passos: o que você pretende que aconteça.' }) : null);
    const s = selS ? A.sessao(selS) : null;
    if (!s) return h('div', { class: 'cols' }, lista, h('div', { class: 'vazio' }, h('p', { class: 'tit', text: 'O roteiro' }), h('p', { text: 'Crie uma sessão e escreva os passos: a cena de abertura, o encontro, a carta que os jogadores vão achar…' })));
    const sid = selS;
    const passo = (p, i) => {
      const nome = nomeDaLiga(p.liga);
      const acao = p.liga ? (p.liga.k === 'handout' ? (A.handout(p.liga.id) && A.handout(p.liga.id).entregue ? 'Ver o handout' : 'Entregar…') : p.liga.k === 'relogio' ? (p.liga.n > 0 ? '+' : '') + p.liga.n + (Math.abs(p.liga.n) === 1 ? ' gomo' : ' gomos') : ROT_LIGA[p.liga.k]) : null;
      return h('div', { class: 'passo' + (p.feito ? ' feito' : ''), 'data-k': 'p:' + p.id },
        h('input', { type: 'checkbox', 'data-k': 'p:' + p.id + ':feito', checked: p.feito, 'aria-label': 'Aconteceu: ' + (p.txt || 'passo'), style: { width: '18px', height: '18px', accentColor: 'var(--lamp)' },
          onchange: ev => mudarSessao(sid, ev.target.checked ? 'marcar um passo' : 'desmarcar um passo', x => { const q = x.passos.find(y => y.id === p.id); if (q) q.feito = ev.target.checked; if (ev.target.checked && x.estado === 'aberta') x.log.push({ em: new Date().toISOString(), t: 'passo', txt: q ? q.txt : '' }); }) }),
        h('input', { class: 'in txt', 'data-k': 'p:' + p.id + ':txt', value: p.txt, placeholder: 'O que acontece…', maxlength: E.LIM.passo, 'aria-label': 'O passo',
          oninput: ev => mudarSessao(sid, 'escrever um passo', x => { const q = x.passos.find(y => y.id === p.id); if (q) q.txt = ev.target.value; }, 'p:' + p.id + ':txt') }),
        h('span', { class: 'lado' },
          p.liga ? h('button', { type: 'button', class: 'chip-liga' + (nome ? '' : ' morto'), 'data-k': 'p:' + p.id + ':liga', title: 'Trocar a ligação', onclick: async () => { const l = await escolherLiga(p.liga); if (l !== undefined) mudarSessao(sid, 'ligar um passo', x => { const q = x.passos.find(y => y.id === p.id); if (q) q.liga = l; }); } },
            icone(ICO[p.liga.k], 13), h('span', { text: nome || 'não existe mais' })) : h('button', { type: 'button', class: 'btn xs tracejado', 'data-k': 'p:' + p.id + ':ligar', onclick: async () => { const l = await escolherLiga(null); if (l) mudarSessao(sid, 'ligar um passo', x => { const q = x.passos.find(y => y.id === p.id); if (q) q.liga = l; }); } }, 'Ligar…'),
          acao && nome ? h('button', { type: 'button', class: 'btn xs' + (p.liga.k === 'relogio' || p.liga.k === 'encontro' ? ' pri' : ''), 'data-k': 'p:' + p.id + ':ir', onclick: () => irPasso(sid, p) }, acao) : null,
          h('button', { type: 'button', class: 'ib leve', 'data-k': 'p:' + p.id + ':nota', 'aria-expanded': String(notas.has(p.id)), title: p.nota ? 'A nota (tem texto)' : 'Uma nota', onclick: () => { if (notas.has(p.id)) notas.delete(p.id); else notas.add(p.id); pintar(); } }, p.nota ? '✎' : '…'),
          h('button', { type: 'button', class: 'ib leve', 'data-k': 'p:' + p.id + ':sobe', disabled: i === 0, title: 'Subir', onclick: () => moverPasso(sid, p.id, -1) }, '↑'),
          h('button', { type: 'button', class: 'ib leve', 'data-k': 'p:' + p.id + ':desce', disabled: i === s.passos.length - 1, title: 'Descer', onclick: () => moverPasso(sid, p.id, 1) }, '↓'),
          h('button', { type: 'button', class: 'ib leve', 'data-k': 'p:' + p.id + ':tirar', title: 'Tirar o passo', onclick: () => { mudarSessao(sid, 'tirar um passo', x => { x.passos = x.passos.filter(y => y.id !== p.id); }); avisoDesfazer('Passo tirado.'); } }, '×')),
        notas.has(p.id) ? h('textarea', { class: 'in nota', rows: 3, 'data-k': 'p:' + p.id + ':nota-txt', value: p.nota, placeholder: 'Notas do passo (só você vê)…', maxlength: E.LIM.nota,
          oninput: ev => mudarSessao(sid, 'escrever uma nota', x => { const q = x.passos.find(y => y.id === p.id); if (q) q.nota = ev.target.value; }, 'p:' + p.id + ':nota') }) : null);
    };
    const novoPasso = ev => {
      ev.preventDefault();
      const el = document.querySelector('[data-k="s:novo"]'), v = el ? el.value.trim() : '';
      if (!v) return;
      el.value = '';
      mudarSessao(sid, 'pôr um passo', x => { x.passos.push(E.normPasso({ txt: v })); });
      setTimeout(() => { const i = document.querySelector('[data-k="s:novo"]'); if (i) i.focus(); }, 20);
    };
    const botoes = [];
    if (s.estado === 'plano') botoes.push(h('button', { type: 'button', class: 'btn pri', 'data-k': 's:abrir', onclick: () => {
      const outra = A.sessaoAberta(s.camp);
      if (outra && outra.id !== sid) { toast(outra.s.nome + ' ainda está em jogo: feche-a antes.'); return; }
      mudar('abrir ' + s.nome, [E.PRE.sessao + sid], () => A.abrirSessao(sid));
      toast(s.nome + ' em jogo. O painel do roteiro (o botão na barra de cima) mostra os passos em qualquer aba.');
    } }, 'Abrir a sessão'));
    if (s.estado === 'aberta') botoes.push(h('button', { type: 'button', class: 'btn pri', 'data-k': 's:fechar', onclick: () => fecharDlg(sid) }, 'Fechar a sessão'));
    if (s.estado === 'fechada') botoes.push(h('button', { type: 'button', class: 'btn', 'data-k': 's:reabrir', onclick: () => mudarSessao(sid, 'reabrir ' + s.nome, x => { x.estado = 'aberta'; x.fim = null; }) }, 'Reabrir'));
    botoes.push(h('button', { type: 'button', class: 'btn per sm', 'data-k': 's:apagar', onclick: async () => {
      if (!(await J.confirmar('Apagar ' + s.nome + '?', 'Os passos, o que aconteceu e o resumo saem junto (tem Desfazer).', 'Apagar', true))) return;
      mudar('apagar ' + s.nome, [E.PRE.sessao + sid], () => D.apagar(E.PRE.sessao + sid));
      avisoDesfazer(s.nome + ' apagada.');
    } }, 'Apagar'));
    const det = h('section', { class: 'det', 'aria-label': s.nome },
      h('div', { class: 'cab' },
        h('input', { class: 'in nome', 'data-k': 's:nome', value: s.nome, maxlength: 60, 'aria-label': 'O nome da sessão', oninput: ev => mudarSessao(sid, 'renomear a sessão', x => { x.nome = ev.target.value || 'Sessão'; }, 's:nome') }),
        h('input', { class: 'in', 'data-k': 's:quando', value: s.quando, maxlength: 40, placeholder: 'Quando (ex.: sábado, 02/11)', style: { flex: '0 1 220px' }, 'aria-label': 'Quando', oninput: ev => mudarSessao(sid, 'mudar a data', x => { x.quando = ev.target.value; }, 's:quando') })),
      h('div', { class: 'row' }, botoes, naMesa && st && st.temCampanhas ? h('span', { class: 'ajuda', text: nomeCamp(s.camp) }) : null),
      s.estado === 'aberta' ? h('div', { class: 'aviso', text: 'Em jogo desde ' + U.dataHora(s.inicio && s.inicio.em) + '. Marque os passos conforme acontecem; o painel do roteiro, na barra de cima do site, mostra esta lista em qualquer aba.' }) : null,
      h('div', { class: 'passos' }, s.passos.map(passo)),
      s.passos.length < E.LIM.passos ? h('form', { class: 'novo-passo', onsubmit: novoPasso },
        h('input', { class: 'in', 'data-k': 's:novo', placeholder: s.passos.length ? 'Mais um passo…' : 'O primeiro passo (ex.: “A caravana chega a Vashka”)…', maxlength: E.LIM.passo, 'aria-label': 'Um passo novo' }),
        h('button', { type: 'submit', class: 'btn', 'data-k': 's:por' }, 'Pôr')) : null,
      s.log.length ? h('details', { class: 'cartao', open: s.estado !== 'plano' ? true : null }, h('summary', { class: 'sub', text: 'O que aconteceu (' + s.log.length + ')' }),
        h('div', { class: 'log' }, s.log.slice().reverse().map(e => h('div', null, h('time', { text: U.hora(e.em) }), h('span', { text: e.txt }))))) : null,
      s.estado === 'fechada' ? h('div', { class: 'cartao' }, h('div', { class: 'cab' }, h('span', { class: 'sub', style: { flex: '1' }, text: 'O resumo' }),
        h('button', { type: 'button', class: 'btn sm pri', 'data-k': 's:jornal', onclick: () => levarAoJornal(sid) }, 'Levar ao Jornal')),
        h('textarea', { class: 'in', rows: 12, 'data-k': 's:resumo', value: s.resumo, maxlength: E.LIM.resumo, 'aria-label': 'O resumo da sessão', oninput: ev => mudarSessao(sid, 'escrever o resumo', x => { x.resumo = ev.target.value; }, 's:resumo') }),
        h('p', { class: 'ajuda', text: 'No Jornal, **assim** fica em negrito; uma linha em branco separa os parágrafos.' })) : null);
    return h('div', { class: 'cols' }, lista, det);
  }

  /* ---------------- os relógios ---------------- */
  function editarRelogio(id) {
    const r0 = A.relogio(id);
    if (!r0) return;
    const r = copia(r0);
    const f = A.foto([E.PRE.relogio + id]);
    const corpo = h('div', { class: 'corpo' });
    const pintarEd = () => U.trocar(corpo,
      h('label', { class: 'field' }, h('span', { text: 'Nome' }), h('input', { class: 'in', 'data-k': 're:nome', value: r.nome, maxlength: 60, oninput: ev => { r.nome = ev.target.value; } })),
      h('div', { class: 'field' }, h('span', { text: 'Gomos' }), h('div', { class: 'seg', role: 'group' }, E.GOMOS.map(g => h('button', { type: 'button', 'data-k': 're:g' + g, 'aria-pressed': String(r.gomos === g), onclick: () => { r.gomos = g; r.cheio = Math.min(r.cheio, g); pintarEd(); } }, String(g))))),
      h('div', { class: 'field' }, h('span', { text: 'Tipo' }), h('div', { class: 'seg', role: 'group' }, Object.keys(E.TIPOS_RELOGIO).map(t => h('button', { type: 'button', 'data-k': 're:t' + t, 'aria-pressed': String(r.tipo === t), onclick: () => { r.tipo = t; if (t === 'progresso' && r.cor === 'vermelho') r.cor = 'verde'; pintarEd(); } }, E.TIPOS_RELOGIO[t])))),
      h('div', { class: 'field' }, h('span', { text: 'Cor' }), h('div', { class: 'cores' }, Object.keys(E.CORES).map(c => h('button', { type: 'button', 'data-k': 're:c' + c, 'aria-pressed': String(r.cor === c), title: E.CORES[c][0], 'aria-label': E.CORES[c][0], style: { background: E.CORES[c][1] }, onclick: () => { r.cor = c; pintarEd(); } })))),
      h('label', { class: 'field' }, h('span', { text: 'Quando encher (só você vê)' }), h('textarea', { class: 'in', rows: 3, 'data-k': 're:cons', value: r.consequencia, maxlength: E.LIM.consequencia, placeholder: 'Ex.: o culto invoca o Devorador e a cidade fecha os portões.', oninput: ev => { r.consequencia = ev.target.value; } })),
      h('label', { class: 'chk' }, h('input', { type: 'checkbox', 'data-k': 're:vista', checked: r.vista, onchange: ev => { r.vista = ev.target.checked; } }), h('span', { text: 'Os jogadores veem este relógio (num cantinho das Cenas)' })),
      h('div', { class: 'field' }, h('span', { text: 'Quando passa um dia no Mapa-múndi' }),
        h('div', { class: 'row' }, h('select', { class: 'in', 'data-k': 're:dia', style: { width: 'auto' }, onchange: ev => { r.porDia = Number(ev.target.value); } },
          [0, 1, 2, 3].map(n => h('option', { value: String(n), selected: r.porDia === n ? true : null, text: n === 0 ? 'Não sugerir nada' : 'Sugerir avançar ' + n + (n === 1 ? ' gomo' : ' gomos') })))),
        h('p', { class: 'ajuda', text: 'A sugestão aparece no Mapa-múndi, ao passar o dia; você confirma.' })),
      naMesa && st && st.temCampanhas ? h('label', { class: 'field' }, h('span', { text: 'Campanha' }), h('select', { class: 'in', 'data-k': 're:camp', onchange: ev => { r.camp = ev.target.value || null; } },
        h('option', { value: '', text: 'Do mundo (todas)', selected: !r.camp ? true : null }), (st.campanhas || []).map(c => h('option', { value: c.id, text: c.nome, selected: r.camp === c.id ? true : null })))) : null);
    pintarEd();
    J.abrir('', [h('h2', { text: 'O relógio' }), corpo, J.pe(
      h('button', { type: 'button', class: 'btn per', 'data-k': 're:apagar', onclick: async () => { J.fechar(); if (!(await J.confirmar('Apagar ' + r0.nome + '?', 'Os passos ligados a ele ficam sem a ligação (tem Desfazer).', 'Apagar', true))) return; const f2 = A.foto([E.PRE.relogio + id, E.idVista(r0.camp)]); A.apagarRelogio(id); empilhar('apagar ' + r0.nome, f2); pintar(); avisoDesfazer(r0.nome + ' apagado.'); } }, 'Apagar'),
      h('span', { class: 'grow' }),
      h('button', { type: 'button', class: 'btn', 'data-k': 're:cancelar', onclick: () => J.fechar() }, 'Cancelar'),
      h('button', { type: 'button', class: 'btn pri', 'data-k': 're:ok', onclick: () => { r.nome = r.nome.trim() || 'Relógio'; f.push(...A.foto([E.idVista(r0.camp), E.idVista(r.camp)])); A.gravarRelogio(id, r); empilhar('mudar ' + r.nome, f); J.fechar(); pintar(); } }, 'Salvar'))]);
    setTimeout(() => { const i = corpo.querySelector('[data-k="re:nome"]'); if (i) { i.focus(); i.select(); } }, 20);
  }
  function novoRelogio() {
    let id;
    const camp = campVista();
    mudar('criar um relógio', [], () => { id = A.relogioNovo({ camp }); });
    pilha[pilha.length - 1].f.push({ id: E.PRE.relogio + id, l: null });
    editarRelogio(id);
  }
  function pintarRelogios() {
    const rs = A.relogios();
    const grupos = porCampanha(rs, x => x.r.camp);
    const cartao = x => {
      const r = x.r, cheio = r.cheio >= r.gomos;
      return h('div', { class: 'rel ' + r.tipo + (cheio ? ' cheio' : ''), 'data-k': 'r:' + x.id },
        h('b', { text: r.nome }),
        relogioSvg(x.id, r, 128, true),
        h('div', { class: 'row', style: { justifyContent: 'center' } },
          h('button', { type: 'button', class: 'ib', 'data-k': 'r:' + x.id + ':menos', disabled: r.cheio <= 0, title: 'Voltar um gomo', 'aria-label': 'Voltar um gomo de ' + r.nome, onclick: () => andarRelogio(x.id, -1) }, '−'),
          h('span', { class: 'conta', text: r.cheio + ' de ' + r.gomos }),
          h('button', { type: 'button', class: 'ib', 'data-k': 'r:' + x.id + ':mais', disabled: cheio, title: 'Avançar um gomo', 'aria-label': 'Avançar um gomo de ' + r.nome, onclick: () => andarRelogio(x.id, 1) }, '+')),
        h('div', { class: 'marcas' },
          h('span', { class: 'badge' + (r.tipo === 'progresso' ? ' ok' : ' ruim'), text: E.TIPOS_RELOGIO[r.tipo] }),
          r.vista ? h('span', { class: 'badge ouro', text: 'Os jogadores veem' }) : h('span', { class: 'badge', text: 'Só você vê' }),
          r.porDia ? h('span', { class: 'badge', text: '+' + r.porDia + ' por dia' }) : null),
        cheio && r.consequencia ? h('div', { class: 'cons', text: r.consequencia }) : null,
        h('div', { class: 'row', style: { justifyContent: 'center' } },
          h('button', { type: 'button', class: 'btn xs', 'data-k': 'r:' + x.id + ':vista', onclick: () => { const f = A.foto([E.PRE.relogio + x.id, E.idVista(r.camp)]); A.gravarRelogio(x.id, Object.assign({}, r, { vista: !r.vista })); empilhar(r.vista ? 'esconder ' + r.nome : 'mostrar ' + r.nome, f); pintar(); } }, r.vista ? 'Esconder dos jogadores' : 'Mostrar aos jogadores'),
          h('button', { type: 'button', class: 'btn xs', 'data-k': 'r:' + x.id + ':editar', onclick: () => editarRelogio(x.id) }, 'Editar')));
    };
    return h('div', null,
      h('div', { class: 'row', style: { padding: '16px 16px 0' } }, h('button', { type: 'button', class: 'btn pri', 'data-k': 'relogio:novo', onclick: novoRelogio }, '+ Relógio'),
        h('p', { class: 'ajuda', text: 'Clique num gomo para encher até ali (ou no último cheio para esvaziá-lo). Os que você mostrar aparecem num cantinho das Cenas para os jogadores.' })),
      rs.length ? grupos.map(g => [g.nome ? h('h3', { class: 'sub', style: { margin: '14px 16px 0' }, text: g.nome }) : null, h('div', { class: 'relogios' }, g.itens.map(cartao))])
        : h('div', { class: 'vazio' }, h('p', { class: 'tit', text: 'Relógios de ameaça' }), h('p', { text: 'Um círculo com gomos que enchem conforme a ameaça avança: o culto que desperta, o exército que marcha, a vela que acaba. Quando enche, acontece o que você escreveu.' })));
  }

  /* ---------------- os handouts (escudo/handouts.js) ---------------- */
  let HO = null;
  async function subirImagem(arq) {
    const img = await new Promise((ok, falha) => { const u = URL.createObjectURL(arq); const i = new Image(); i.onload = () => { URL.revokeObjectURL(u); ok(i); }; i.onerror = () => { URL.revokeObjectURL(u); falha(new Error('Este arquivo não é uma imagem que dê para abrir.')); }; i.src = u; });
    const max = naMesa ? 1600 : 900, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const ar = cv.width / cv.height;
    if (!naMesa) return { url: cv.toDataURL('image/jpeg', 0.82), ar };
    const blob = await new Promise((ok, falha) => cv.toBlob(b => (b ? ok(b) : falha(new Error('Não deu para preparar a imagem.'))), 'image/jpeg', 0.88));
    return { url: await window.TC.arquivos.subir(blob), ar };
  }

  /* ---------------- pintar ---------------- */
  let tPintar = 0, pintando = false;
  function pintar() {
    if (!pronto) return;
    pintando = true;
    try {
      for (const b of document.querySelectorAll('#partes button')) b.setAttribute('aria-pressed', String(b.getAttribute('data-aba') === aba));
      const ban = $('banco');
      ban.hidden = !(naMesa && bancoOk === false);
      if (!ban.hidden && !ban.childNodes.length) ban.append(h('div', { class: 'aviso', style: { margin: '12px 16px 0' } }, 'Falta aplicar a atualização do banco desta versão (o SQL 0025): sem ela, os handouts vão só para a mesa toda, e os puzzles ainda não podem ser entregues. O roteiro e os relógios funcionam.'));
      const conteudo = aba === 'roteiro' ? pintarRoteiro() : aba === 'relogios' ? pintarRelogios() : HO.pintar();
      morphEm($('meio'), [conteudo]);
    } finally { pintando = false; }
  }
  const depois = () => { clearTimeout(tPintar); tPintar = setTimeout(() => { if (!J.aberta()) pintar(); }, 120); };
  for (const b of document.querySelectorAll('#partes button')) b.onclick = () => { aba = b.getAttribute('data-aba'); guarda.gravar('tinycats:escudo:aba', aba); pintar(); };
  document.addEventListener('keydown', ev => {
    const a = document.activeElement, escrevendo = !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable);
    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey && ev.key.toLowerCase() === 'z' && !escrevendo && !J.aberta()) { ev.preventDefault(); desfazer(); }
  });

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
      }
      TCx.ponte.aoMudar(e => { st = e; if (pronto) depois(); });
      if (TCx.ponte.aoIr) TCx.ponte.aoIr(alvo => {
        if (!alvo || !pronto) return;
        if (typeof alvo.sessao === 'string') { aba = 'roteiro'; selS = alvo.sessao; pintar(); }
        else if (typeof alvo.handout === 'string') { aba = 'handouts'; HO.selecionar(alvo.handout); pintar(); }
        else if (alvo.relogios) { aba = 'relogios'; pintar(); }
      });
    }
    if (!naMesa) { D = colLocal('tinycats:escudo:local'); bancoOk = true; $('salvo').textContent = 'Neste navegador'; }
    souMestreDaMesa = !naMesa || !st || st.cargo === 'mestre';
    A = TCx.escudoAcoes({
      D, membros, bancoOk: () => bancoOk === true,
      subir: blob => (naMesa ? TCx.arquivos.subir(blob) : new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => falha(r.error); r.readAsDataURL(blob); })),
      jogar: (id, op, mudas, prova) => (naMesa ? TCx.ponte.escudo('jogar', { id, op, mudas, prova }) : Promise.reject(new Error('Só numa mesa.'))),
    });
    HO = window.EscudoHandouts({ E, U, PUI, A, D, J, toast, mudar, mudarTexto, empilhar, avisoDesfazer, desfazer, pintar, subirImagem, relogioSvg, ultimoPasso: () => pilha[pilha.length - 1] || null,
      naMesa: () => naMesa, bancoOk: () => bancoOk, jogadores, nomeDe, campVista, nomeCamp, porCampanha, st: () => st, temCampanhas: () => !!(st && st.temCampanhas), campanhas: () => (st && st.campanhas) || [] });
    if (!naMesa) D.aoMudar(() => depois());
    if (naMesa) {
      D.aoMudar(l => { if (l && typeof l.id === 'string' && (l.id.startsWith('escudo:') || l.id.startsWith('pista:') || l.id.startsWith('cena:') || l.id === 'cenas:indice' || l.id.startsWith('mundo:mapa:') || l.id.startsWith('best:enc:'))) depois(); });
      TCx.ponte.escudo('versao').then(() => { bancoOk = true; pintar(); }, () => { bancoOk = false; pintar(); });
    }
    pronto = true;
    pintar();
  }
  if (DEBUG) window.__escudo = { E, get A() { return A; }, get HO() { return HO; }, get naMesa() { return naMesa; }, get pronto() { return pronto; }, get bancoOk() { return bancoOk; }, get aba() { return aba; }, get selS() { return selS; },
    pilha: () => pilha.map(p => p.rotulo), pintar, desfazer, irAba: a => { aba = a; pintar(); }, escolher: id => { selS = id; pintar(); } };
  partida().catch(e => {
    console.error(e);
    U.trocar($('meio'), h('div', { class: 'vazio' }, h('strong', { text: 'Não deu para abrir o Escudo do mestre. ' }), (e && e.message) || '', ' ',
      h('button', { type: 'button', class: 'btn sm', text: 'Tentar de novo', onclick: () => location.reload() })));
  });
})();
