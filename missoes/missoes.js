/* Tiny Cats · Missões: a página (lote 123).
   O quadro da campanha, no estilo que o mestre escolheu (mural de cartazes, dossiês, pergaminhos de ordem ou diário),
   as missões de cada personagem e as do grupo.
     · quem joga: pega no quadro (com um dos personagens dele), acompanha e desiste — a do quadro volta para o quadro,
       a da história conta como falha;
     · quem mestra (as Fichas): cria, guarda oculta, revela no quadro (uma ou várias de uma vez) ou entrega direto a um personagem, volta a ocultar, marca
       os objetivos e o estado, devolve ao quadro, recolhe e apaga; escolhe o estilo do quadro da campanha.
   As missões que moravam na ficha vêm para cá na primeira vez que quem mestra abre a aba (a cópia; nada é apagado).
   Fora de uma mesa (a página sozinha), tudo fica neste navegador, no modo de quem mestra (?jogador: no de quem joga). */
(() => {
  'use strict';
  const M = window.TC.missoes;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const $ = id => document.getElementById(id);
  const repTxt = r => (r.v > 0 ? '+' : '−') + Math.abs(r.v) + ' com ' + r.n;            // (lote 126)
  const copia = x => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el[k] = v;
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = true;
      else if (k === 'style') el.setAttribute('style', v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    return el;
  }
  function toast(msg, acao, fn, ms) {
    const t = h('div', { class: 'toast', role: 'status' }, h('span', { text: msg }),
      acao ? h('button', { type: 'button', text: acao, onclick: () => { t.remove(); fn(); } }) : null);
    $('toasts').append(t);
    setTimeout(() => t.remove(), ms || (acao ? 7000 : 4200));
  }

  /* ---------------- os dados: os documentos da mesa, ou este navegador ---------------- */
  let ultimoQuadro = null;
  let st = null, D = null, PC = null, naMesa = false, mestre = true, eu = 'local', pronto = false;
  const LOCAL = 'tinycats:missoes:local', FICHAS_LOCAL = 'urgm_calc_atributos_v1';
  const local = (() => { try { return JSON.parse(localStorage.getItem(LOCAL) || '{}') || {}; } catch (e) { return {}; } })();
  const lerJson = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  function docDados(id) {
    if (naMesa) { const d = D.pegar(id); return d && !d.apagado ? d.dados : null; }
    return local[id] || null;
  }
  function gravarDoc(id, dados, vis, dono) {
    if (naMesa) {
      const c = { dados: copia(dados) };
      if (vis) c.vis = vis;
      if (dono !== undefined && mestre) c.dono_id = dono;
      D.gravar(id, c, null, { cas: true });
      return;
    }
    local[id] = copia(dados);
    try { localStorage.setItem(LOCAL, JSON.stringify(local)); } catch (e) { toast('Não deu para guardar neste navegador.'); }
  }
  const camp = () => (naMesa && st && st.campanha ? st.campanha.id : '');
  const fechada = () => !!(naMesa && st && st.campanha && st.campanha.encerrada);
  const idQuadro = () => M.comCamp(M.QUADRO, camp()), idRasc = () => M.comCamp(M.RASC, camp());
  const idPc = pc => M.PRE_PC + pc;
  const quadro = () => M.doc(docDados(idQuadro()));
  const rasc = () => M.doc(docDados(idRasc()));
  const docPc = pc => M.doc(docDados(idPc(pc)));
  const membros = () => (naMesa && st && Array.isArray(st.membros) ? st.membros : []);
  const jogadorDaMesa = m => !!m && (m.cargo ? m.cargo !== 'mestre' : m.papel === 'jogador');
  const nomeDe = u => { const m = membros().find(x => x.id === u); return m ? (m.nome || 'Sem nome') : 'Alguém'; };
  /* Os personagens (de quem joga) desta campanha: os dela e os do mundo. Sem mesa: os das Fichas deste navegador. */
  function personagens() {
    if (!naMesa) {
      const s = lerJson(FICHAS_LOCAL), l = s && Array.isArray(s.personagens) ? s.personagens : [];
      return l.filter(p => p && p.id && !p.petDe).map(p => ({ id: String(p.id), nome: p.nome || 'Sem nome', dono: 'local', estado: p.estado || {}, camp: null }));
    }
    const c = camp(), ms = membros();
    // (de jogador: o dono não é quem mestra; quem ainda não chegou na lista de participantes conta como jogador)
    return PC.todas().filter(l => !l.apagado && l.dono_id && !(l.ficha && l.ficha.petDe) && (() => { const m = ms.find(x => x.id === l.dono_id); return !m || jogadorDaMesa(m); })()
      && (!c || !l.campanha || l.campanha === c))
      .sort((a, b) => (a.ordem - b.ordem) || (a.id < b.id ? -1 : 1))
      .map(l => ({ id: l.id, nome: l.nome || 'Sem nome', dono: l.dono_id, estado: l.estado || {}, camp: l.campanha || null }));
  }
  const meus = () => personagens().filter(p => mestre ? true : p.dono === eu);
  const nomePc = id => { const p = personagens().find(x => x.id === id); return p ? p.nome : 'um personagem que saiu'; };
  const donoPc = id => { const p = personagens().find(x => x.id === id); return p ? p.dono : null; };

  /* ---------------- gravar: o quadro, os rascunhos e o documento de um personagem ---------------- */
  const salvarQuadro = Q => { gravarDoc(idQuadro(), Q, mestre ? 'mesa' : null); ultimoQuadro = M.doc(Q); };
  const salvarRasc = R => gravarDoc(idRasc(), R, 'mestre');
  const salvarPc = (pc, P) => { gravarDoc(idPc(pc), P, mestre ? 'mestre' : null, mestre ? (donoPc(pc) || null) : undefined); lembrarPc({ id: idPc(pc), dados: P }); };

  /* As missões de antes (as que moravam na ficha) vêm para cá: a cópia, feita uma vez por quem mestra. */
  function migrarSeFalta() {
    if (!mestre || fechada()) return;
    const Q0 = docDados(idQuadro()), c = camp();
    let seg = null, grupo = null;
    if (naMesa) { const g = docDados('fichas:missoes' + (c ? '@' + c : '')), s = docDados('fichas:segredos'); grupo = g && g.v; seg = s && s.v; }
    else { const s = lerJson(FICHAS_LOCAL) || {}; grupo = s.missoes; seg = s.segredos; }
    const smis = seg && seg.mis ? seg.mis : {};
    // o quadro: uma vez (as do grupo); os personagens: cada um que ainda não veio (os que chegam depois também)
    const velho = Q0 && Q0.mig ? { pcs: [] } : { grupo, grupoOcultas: c ? (smis.gc && smis.gc[c]) : smis.g, pcs: [] };
    const pcsDocs = {};
    for (const p of personagens()) {
      const d = docDados(idPc(p.id));
      if (d && d.mig) continue;
      const mis = p.estado && p.estado.mis, oc = smis.p && smis.p[p.id];
      if (!(mis && Object.keys(mis).length) && !(oc && Object.keys(oc).length)) continue;
      pcsDocs[p.id] = d;
      velho.pcs.push({ id: p.id, mis, ocultas: oc });
    }
    if (Q0 && Q0.mig && !velho.pcs.length) return;
    const r = M.migrar(velho, Q0, docDados(idRasc()), pcsDocs);
    if (!r.quadro.estilo) r.quadro.estilo = 'mural';
    if (!(Q0 && Q0.mig)) salvarQuadro(r.quadro);
    if (JSON.stringify(r.rasc) !== JSON.stringify(M.doc(docDados(idRasc()))) && Object.keys(r.rasc.ms).length) salvarRasc(r.rasc);
    for (const id of Object.keys(r.pcs)) { const P = r.pcs[id]; P.mig = true; salvarPc(id, P); }
    if (r.n) toast(r.n === 1 ? 'Uma missão que estava na ficha veio para cá.' : r.n + ' missões que estavam nas fichas vieram para cá.');
  }

  /* ---------------- a tela ---------------- */
  let aba = null, pcSel = null;
  const marcadas = new Set();          // (as ocultas marcadas para revelar de uma vez)
  const ABAS_J = [{ k: 'quadro', n: 'Quadro' }, { k: 'minhas', n: 'Minhas missões' }, { k: 'grupo', n: 'Do grupo' }];
  const ABAS_M = [{ k: 'quadro', n: 'Quadro' }, { k: 'andamento', n: 'Em andamento' }, { k: 'rascunhos', n: 'Ocultas' }, { k: 'encerradas', n: 'Encerradas' }];
  const abas = () => (mestre ? ABAS_M : ABAS_J);
  const estilo = () => M.estiloDe(quadro().estilo).k;
  const caveiras = (pe, k) => {
    const s = estilo();
    if (s === 'dossie') return 'AMEAÇA ' + '■'.repeat(pe) + '□'.repeat(5 - pe);
    if (s === 'ordem') return 'Risco: ' + (pe ? '✠'.repeat(pe) : 'nenhum');
    return pe ? '☠'.repeat(pe) : '';
  };
  const hash = s => { let x = 0; for (const ch of String(s)) x = (x * 31 + ch.charCodeAt(0)) | 0; return Math.abs(x); };
  const numArquivo = id => String(hash(id) % 900 + 100);

  function pintarTopo() {
    const sel = $('abas');
    if (!abas().some(a => a.k === aba)) aba = mestre ? 'quadro' : (meus().length ? 'quadro' : 'quadro');
    sel.replaceChildren(...abas().map(a => h('button', { type: 'button', role: 'tab', 'aria-selected': String(a.k === aba), 'data-aba': a.k, text: a.n + contaAba(a.k),
      onclick: () => { aba = a.k; pintar(); } })));
    $('btNova').hidden = !mestre || fechada();
    const es = $('estilo');
    es.hidden = !mestre || fechada();
    if (mestre) { es.replaceChildren(...M.ESTILOS.map(x => h('option', { value: x.k, title: x.dica }, x.n))); es.value = estilo(); }
    $('conta').textContent = naMesa ? (st.campanha ? st.campanha.nome + (fechada() ? ' · encerrada (só consulta)' : '') : (st.mesa && st.mesa.nome) || '') : 'Neste navegador';
    // quem joga com mais de um personagem: de quem é a vez
    const ps = $('pcs'), lst = mestre ? [] : meus();
    if (!pcSel || !lst.some(p => p.id === pcSel)) pcSel = lst[0] ? lst[0].id : null;
    ps.hidden = lst.length < 2;
    ps.replaceChildren(...lst.map(p => h('button', { type: 'button', 'aria-pressed': String(p.id === pcSel), 'data-pc': p.id, text: p.nome, onclick: () => { pcSel = p.id; pintar(); } })));
  }
  function contaAba(k) {
    if (k === 'quadro') { const n = M.noQuadro(quadro()).length; return n ? ' (' + n + ')' : ''; }
    if (k === 'minhas') { const n = pcSel ? M.doPersonagem(quadro(), docPc(pcSel), pcSel).filter(m => m.e === 'ativa' && m.quem !== 'grupo').length : 0; return n ? ' (' + n + ')' : ''; }
    if (k === 'rascunhos') { const n = Object.keys(rasc().ms).length; return n ? ' (' + n + ')' : ''; }
    return '';
  }
  function pintar() {
    if (!pronto) return;
    document.body.dataset.estilo = estilo();
    pintarTopo();
    const corpo = $('corpo');
    const partes = aba === 'quadro' ? telaQuadro() : aba === 'minhas' ? telaMinhas() : aba === 'grupo' ? telaGrupo()
      : aba === 'andamento' ? telaAndamento() : aba === 'rascunhos' ? telaRascunhos() : telaEncerradas();
    corpo.replaceChildren(h('div', { class: 'mesa-fundo' }, partes));
  }
  const vazio = txt => h('p', { class: 'vazio', text: txt });
  const secao = (titulo, ajuda, cartoes, semNada) => h('section', { class: 'secao' },
    titulo ? h('h2', { text: titulo }) : null, ajuda ? h('p', { class: 'ajuda', text: ajuda }) : null,
    cartoes.length ? h('div', { class: 'grade' }, cartoes) : vazio(semNada || 'Nada aqui.'));

  /* o cartão (o cartaz, a pasta, o pergaminho, a linha do diário) */
  function cartao(m, ctx) {
    const s = estilo(), pc = ctx.pc || null, and = m.objs ? m : Object.assign({}, m, M.andamento(m, pc));
    const e = ctx.e || and.e;
    const giro = s === 'mural' ? ((hash(m.id) % 7) - 3) * 0.6 : s === 'dossie' ? ((hash(m.id) % 5) - 2) * 0.5 : 0;
    const titulo = m.t || 'Missão sem título';
    const el = h('article', { class: 'mc e-' + e + (m.quem === 'pc' ? ' hist' : ''), tabindex: '0', role: 'button', 'data-mis': m.id,
      'aria-label': titulo + (e !== 'oferta' ? ', ' + M.estadoDe(e).n : ''), style: '--giro:' + giro + 'deg',
      onclick: () => abrir(m.id, ctx), onkeydown: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(m.id, ctx); } } },
      ctx.marca ? h('label', { class: 'marcar', title: 'Marcar para revelar', onclick: ev => ev.stopPropagation(), onkeydown: ev => ev.stopPropagation() },
        h('input', { type: 'checkbox', 'data-marca': m.id, checked: marcadas.has(m.id), 'aria-label': 'Marcar “' + titulo + '” para revelar',
          onchange: ev => { if (ev.target.checked) marcadas.add(m.id); else marcadas.delete(m.id); pintar(); } })) : null,
      s === 'mural' ? h('span', { class: 'pino', 'aria-hidden': 'true' }) : null,
      s === 'dossie' ? h('span', { class: 'aba-pasta', text: 'ARQUIVO Nº ' + numArquivo(m.id) }) : null,
      s === 'ordem' ? h('span', { class: 'selo', 'aria-hidden': 'true', style: m.cti ? 'background-image:url("' + m.cti.replace(/"/g, '%22') + '")' : null }, m.cti ? '' : (m.ct || '?').trim().charAt(0).toUpperCase()) : null,
      h('div', { class: 'mc-topo' },
        s === 'mural' ? h('span', { class: 'cabeca', text: m.quem === 'pc' ? 'Assunto pessoal' : m.quem === 'grupo' ? 'Precisa-se de um grupo' : 'Procura-se ajuda' }) : null,
        s === 'dossie' ? h('span', { class: 'cabeca', text: m.quem === 'pc' ? 'SÓ PARA SEUS OLHOS' : 'CONTRATO' }) : null,
        s === 'ordem' ? h('span', { class: 'cabeca', text: m.quem === 'pc' ? 'Carta selada' : 'Por ordem de' }) : null,
        m.ct ? h('span', { class: 'quem-pede', text: (s === 'ordem' ? '' : s === 'dossie' ? 'CLIENTE: ' : 'Pedido por ') + m.ct }) : null),
      m.img ? h('div', { class: 'foto' }, h('img', { src: m.img, alt: '', loading: 'lazy' }), s === 'dossie' ? h('span', { class: 'clipe', 'aria-hidden': 'true' }) : null) : null,
      h('h3', { class: 'mc-tit', text: titulo }),
      m.d ? h('p', { class: 'mc-desc', text: m.d }) : null,
      h('div', { class: 'mc-pe' },
        m.pe ? h('span', { class: 'perigo', title: M.PERIGO[m.pe], text: caveiras(m.pe) }) : null,
        m.r ? h('span', { class: 'recomp', text: (s === 'dossie' ? 'PAGAMENTO: ' : 'Recompensa: ') + m.r }) : null,
        m.rep && m.rep.length ? h('span', { class: 'recomp rep', text: 'Reputação: ' + m.rep.map(repTxt).join(', ') }) : null,
        m.pz ? h('span', { class: 'prazo', text: 'Prazo: ' + m.pz }) : null,
        m.lug ? h('span', { class: 'lugar', text: '⌖ ' + (m.lug.nome || 'No mapa') }) : null,
        and.total ? h('span', { class: 'prog', text: e === 'oferta' ? and.total + (and.total === 1 ? ' objetivo' : ' objetivos') : and.feitos + '/' + and.total + ' objetivos' }) : null,
        ctx.rodape || null),
      e === 'feita' ? h('span', { class: 'carimbo ok', text: s === 'dossie' ? 'CONCLUÍDO' : 'Cumprida' }) : null,
      e === 'falhou' ? h('span', { class: 'carimbo falha', text: s === 'dossie' ? 'ARQUIVADO' : 'Falhou' }) : null,
      s === 'dossie' && e === 'oferta' ? h('span', { class: 'carimbo sigilo', text: 'CONFIDENCIAL' }) : null);
    return el;
  }
  const rodapeQuem = m => {
    const pegaram = Object.keys(m.pegas || {});
    if (m.quem === 'todos') return h('span', { class: 'tag' }, 'Cada um pega a sua' + (pegaram.length ? ' · ' + pegaram.length + ' já pegaram' : ''));
    if (m.quem === 'grupo') return h('span', { class: 'tag' }, 'Para o grupo');
    return h('span', { class: 'tag' }, 'Só um pega');
  };

  function telaQuadro() {
    const lst = M.noQuadro(quadro());
    const ajuda = mestre ? 'O que os jogadores veem para pegar. Crie em “Nova missão”: ela fica oculta (só você vê) até você revelar.'
      : meus().length ? 'Escolha uma missão e pegue. As de “Só um pega” saem do quadro; as do grupo valem para todos.' : 'Você ainda não tem personagem nesta campanha: dá para olhar, mas não para pegar.';
    const sem = !naMesa || docDados(idQuadro()) ? 'O quadro está vazio.' : (mestre ? 'O quadro está vazio.' : 'O mestre ainda não abriu o quadro de missões desta campanha.');
    return [secao(null, ajuda, lst.map(m => cartao(m, { e: 'oferta', rodape: rodapeQuem(m), onde: 'quadro', pc: pcSel })), sem)];
  }
  function telaMinhas() {
    const pc = pcSel;
    if (!pc) return [vazio(naMesa ? 'Você ainda não tem personagem nesta campanha.' : 'Crie um personagem nas Fichas primeiro.')];
    const todas = M.doPersonagem(quadro(), docPc(pc), pc).filter(m => m.quem !== 'grupo');
    const at = todas.filter(m => m.e === 'ativa'), fim = todas.filter(m => m.e !== 'ativa');
    return [secao('Em andamento', null, at.map(m => cartao(m, { pc, onde: m.onde })), 'Nenhuma missão em andamento. Veja o quadro.'),
      fim.length ? secao('Encerradas', null, fim.map(m => cartao(m, { pc, onde: m.onde }))) : null];
  }
  function telaGrupo() {
    const g = M.doGrupo(quadro());
    return [secao(null, 'As missões que alguém pegou para o grupo inteiro.', g.map(m => cartao(m, { onde: 'quadro' })), 'O grupo não tem missões ainda.')];
  }
  /* Quem mestra: o que está em andamento, por personagem (e o grupo) */
  function telaAndamento() {
    const Q = quadro(), partes = [];
    const g = M.doGrupo(Q).filter(m => m.e === 'ativa');
    partes.push(secao('Do grupo', null, g.map(m => cartao(m, { onde: 'quadro' })), 'Nenhuma missão do grupo em andamento.'));
    for (const p of personagens()) {
      const l = M.doPersonagem(Q, docPc(p.id), p.id).filter(m => m.quem !== 'grupo' && m.e === 'ativa');
      partes.push(secao(p.nome, naMesa ? 'Jogador: ' + nomeDe(p.dono) : null, l.map(m => cartao(m, { pc: p.id, onde: m.onde })), 'Nenhuma missão em andamento.'));
    }
    if (!personagens().length) partes.push(vazio('Ainda não há personagens de jogador nesta campanha.'));
    return partes;
  }
  function telaRascunhos() {
    const R = rasc(), l = Object.keys(R.ms).map(id => Object.assign({ id }, R.ms[id])).sort((a, b) => b.c - a.c);
    for (const id of [...marcadas]) if (!R.ms[id]) marcadas.delete(id);
    const barra = l.length && !fechada() ? h('div', { class: 'barra-marcar' },
      h('button', { type: 'button', class: 'btn sm', id: 'mMarcarTodas', text: marcadas.size === l.length ? 'Desmarcar todas' : 'Marcar todas', onclick: () => { if (marcadas.size === l.length) marcadas.clear(); else l.forEach(m => marcadas.add(m.id)); pintar(); } }),
      h('button', { type: 'button', class: 'btn pri sm', id: 'mRevelarMarcadas', disabled: !marcadas.size, text: marcadas.size ? 'Revelar as marcadas (' + marcadas.size + ')' : 'Revelar as marcadas', onclick: revelarMarcadas })) : null;
    return [barra, secao(null, 'Só você vê. Revele no quadro (marque várias para revelar de uma vez) ou entregue direto a um personagem (as da história).',
      l.map(m => cartao(m, { e: 'oferta', onde: 'rasc', marca: !fechada(), rodape: h('span', { class: 'tag' }, m.quem === 'pc' ? 'Da história' + (m.alvo ? ' · para ' + nomePc(m.alvo) : ' · escolha o personagem') : M.quemDe(m.quem).curto) })), 'Nenhuma missão oculta.')];
  }
  function telaEncerradas() {
    const Q = quadro(), partes = [];
    const g = M.doGrupo(Q).filter(m => m.e !== 'ativa');
    if (g.length) partes.push(secao('Do grupo', null, g.map(m => cartao(m, { onde: 'quadro' }))));
    for (const p of personagens()) {
      const l = M.doPersonagem(Q, docPc(p.id), p.id).filter(m => m.quem !== 'grupo' && m.e !== 'ativa');
      if (l.length) partes.push(secao(p.nome, null, l.map(m => cartao(m, { pc: p.id, onde: m.onde }))));
    }
    return partes.length ? partes : [vazio('Nenhuma missão encerrada ainda.')];
  }

  /* ---------------- a missão aberta (a folha inteira) ---------------- */
  const dlg = $('dlg');
  function janela(...kids) { dlg.replaceChildren(...kids.filter(k => k != null && k !== false)); dlg.className = 'dl est-' + estilo(); if (!dlg.open) dlg.showModal(); }
  const fechar = () => dlg.close();
  let aberto = null;                // { id, ctx }: a missão que está aberta (redesenhada quando muda)
  function achar(id, ctx) {
    if (ctx.onde === 'rasc') { const m = rasc().ms[id]; return m ? { m: Object.assign({ id }, m), onde: 'rasc' } : null; }
    if (ctx.onde === 'pc' && ctx.pc) { const m = docPc(ctx.pc).ms[id]; return m ? { m: Object.assign({ id }, m), onde: 'pc' } : null; }
    const q = quadro().ms[id];
    if (q) return { m: Object.assign({ id }, q), onde: 'quadro' };
    if (ctx.pc) { const m = docPc(ctx.pc).ms[id]; if (m) return { m: Object.assign({ id }, m), onde: 'pc' }; }
    return null;
  }
  function abrir(id, ctx) {
    const a = achar(id, ctx);
    if (!a) { if (dlg.open) fechar(); return; }
    aberto = { id, ctx: Object.assign({}, ctx, { onde: a.onde }) };
    const m = a.m, s = estilo(), fim = fechada();
    // em "Cada um pega a sua": de quem é o andamento que aparece (quem mestra escolhe entre os que pegaram)
    let pc = ctx.pc || null;
    if (m.quem === 'todos' && mestre && !pc) pc = Object.keys(m.pegas)[0] || null;
    const and = M.andamento(m, pc), e = a.onde === 'rasc' ? 'oculta' : and.e;
    const podeMarcar = mestre && !fim && a.onde !== 'rasc' && (m.quem !== 'todos' || (pc && m.pegas[pc])) && and.e !== 'oferta';
    const objs = and.objs.length ? h('div', { class: 'objs' }, h('h4', { text: s === 'dossie' ? 'OBJETIVOS' : 'Objetivos' }),
      h('ul', null, and.objs.map(o => h('li', { class: o.ok ? 'ok' : '' },
        podeMarcar ? h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: o.ok, 'data-obj': o.id, onchange: ev => marcarObj(a, o.id, ev.target.checked, pc) }), h('span', { text: o.t || 'Objetivo' }))
          : [h('span', { class: 'marca', 'aria-hidden': 'true', text: o.ok ? '✓' : '○' }), h('span', { text: o.t || 'Objetivo' }), h('span', { class: 'sr', text: o.ok ? ' (feito)' : ' (por fazer)' })])))) : null;
    const pegaram = Object.keys(m.pegas || {});
    const info = h('dl', { class: 'info' },
      m.ct ? [h('dt', { text: 'Quem pede' }), h('dd', { text: m.ct })] : null,
      m.r ? [h('dt', { text: 'Recompensa' }), h('dd', { text: m.r })] : null,
      m.rep && m.rep.length ? [h('dt', { text: 'Reputação' }), h('dd', { text: m.rep.map(repTxt).join(', ') + (m.repDada ? ' (já dada)' : '') })] : null,
      m.pe ? [h('dt', { text: 'Perigo' }), h('dd', { text: caveiras(m.pe) + ' ' + M.PERIGO[m.pe] })] : null,
      m.pz ? [h('dt', { text: 'Prazo' }), h('dd', { text: m.pz })] : null,
      m.lug ? [h('dt', { text: 'Onde' }), h('dd', null, h('button', { type: 'button', class: 'lk', id: 'mLugar', text: (m.lug.nome || 'Ver no Mapa-múndi') + ' →', onclick: () => irMapa(m.lug) }))] : null,
      [h('dt', { text: 'Tipo' }), h('dd', { text: m.quem === 'pc' ? 'Da história' : M.quemDe(m.quem).curto })],
      pegaram.length && m.quem !== 'pc' ? [h('dt', { text: m.quem === 'todos' ? 'Pegaram' : 'Pegou' }), h('dd', { text: pegaram.map(p => nomePc(p)).join(', ') })] : null);
    // a escolha de quem pegou (quem mestra, em "Cada um pega a sua")
    const deQuem = mestre && m.quem === 'todos' && pegaram.length > 1 ? h('label', { class: 'campo' }, h('span', { text: 'Andamento de' }),
      h('select', { class: 'in', id: 'mDeQuem', onchange: ev => abrir(id, Object.assign({}, ctx, { pc: ev.target.value })) }, pegaram.map(p => h('option', { value: p, selected: p === pc }, nomePc(p))))) : null;
    janela(
      h('div', { class: 'folha e-' + e },
        h('button', { type: 'button', class: 'x', 'aria-label': 'Fechar', text: '×', onclick: fechar }),
        s === 'dossie' ? h('span', { class: 'aba-pasta', text: 'ARQUIVO Nº ' + numArquivo(m.id) }) : null,
        s === 'ordem' ? h('span', { class: 'selo', 'aria-hidden': 'true', style: m.cti ? 'background-image:url("' + m.cti.replace(/"/g, '%22') + '")' : null }, m.cti ? '' : (m.ct || '?').trim().charAt(0).toUpperCase()) : null,
        m.img ? h('div', { class: 'foto' }, h('img', { src: m.img, alt: '' })) : null,
        h('h2', { text: m.t || 'Missão sem título' }),
        h('p', { class: 'estado', text: e === 'oculta' ? 'Oculta (só você vê)' : M.estadoDe(and.e).n }),
        m.d ? h('p', { class: 'desc', text: m.d }) : null,
        objs, info, deQuem,
        h('div', { class: 'acoes', id: 'mAcoes' }, acoes(a, pc, and))));
  }
  function acoes(a, pc, and) {
    const m = a.m, fim = fechada(), bt = (txt, fn, cls, id) => h('button', { type: 'button', class: 'btn ' + (cls || ''), text: txt, id, onclick: fn });
    if (fim) return [bt('Fechar', fechar)];
    if (!mestre) {
      const out = [];
      if (a.onde === 'quadro' && (m.quem === 'todos' ? !m.fechada && meus().some(p => !m.pegas[p.id]) : m.e === 'oferta') && meus().length) {
        const livres = meus().filter(p => !m.pegas[p.id]);
        const sel = livres.length > 1 ? h('select', { class: 'in', id: 'mPegarCom', 'aria-label': 'Pegar com' }, livres.map(p => h('option', { value: p.id, selected: p.id === pcSel }, p.nome))) : null;
        out.push(sel, bt(livres.length > 1 ? 'Pegar' : 'Pegar com ' + (livres[0] ? livres[0].nome : ''), () => pegarMissao(m.id, sel ? sel.value : livres[0].id), 'pri', 'mPegar'));
      }
      const meu = pc && meus().some(p => p.id === pc) ? pc : (m.quem === 'grupo' ? null : null);
      const minha = a.onde === 'pc' ? meus().some(p => p.id === aberto.ctx.pc) : (m.quem === 'todos' ? meu && m.pegas[meu] : (m.quem === 'um' && Object.keys(m.pegas).some(p => meus().some(q => q.id === p))) || (m.quem === 'grupo' && Object.keys(m.pegas).some(p => meus().some(q => q.id === p))));
      if (minha && and.e === 'ativa') out.push(bt('Desistir', () => confirmarDesistir(a, pc || Object.keys(m.pegas).find(p => meus().some(q => q.id === p)) || aberto.ctx.pc), 'per', 'mDesistir'));
      out.push(h('span', { class: 'grow' }), bt('Fechar', fechar));
      return out;
    }
    const out = [];
    if (a.onde === 'rasc') {
      if (m.quem === 'pc') {
        const sel = h('select', { class: 'in', id: 'mEntregarA', 'aria-label': 'Entregar a' }, personagens().map(p => h('option', { value: p.id, selected: p.id === m.alvo }, p.nome)));
        out.push(sel, bt('Entregar', () => entregarA(m.id, sel.value), 'pri', 'mEntregar'));
      } else out.push(bt('Revelar aos jogadores', () => publicarRasc(m.id), 'pri', 'mPublicar'));
    } else if (m.quem !== 'pc' || a.onde === 'pc') {
      if (and.e !== 'oferta' && (m.quem !== 'todos' || pc)) {
        const sel = h('select', { class: 'in', id: 'mEstado', 'aria-label': 'Situação' }, M.ESTADOS.filter(x => x.k !== 'oferta').map(x => h('option', { value: x.k, selected: x.k === and.e }, x.n)));
        sel.onchange = () => mudarEstadoDe(a, sel.value, pc);
        out.push(sel);
        if (a.onde === 'quadro') out.push(bt(m.quem === 'todos' ? 'Tirar de ' + nomePc(pc) : 'Devolver ao quadro', () => devolver(a, pc), '', 'mDevolver'));
      }
      if (a.onde === 'quadro' && m.quem === 'todos') out.push(bt(m.fechada ? 'Pôr de novo no quadro' : 'Tirar do quadro', () => fecharTodos(m.id), '', 'mFecharTodos'));
    }
    out.push(h('span', { class: 'grow' }),
      bt('Editar', () => editar(a), '', 'mEditar'),
      a.onde !== 'rasc' ? bt('Ocultar de novo', () => recolherMissao(a), '', 'mRecolher') : null,
      bt('Apagar', () => apagar(a), 'per', 'mApagar'));
    return out;
  }
  function irMapa(l) {
    if (window.TC && TC.ponte && TC.ponte.ir && TC.ponte.ir('mundo', l.obj ? { mapa: l.mapa, obj: l.obj } : { mapa: l.mapa })) { fechar(); return; }
    toast('Abra o Mapa-múndi pelo site para ver o lugar.');
  }

  /* ---------------- as ações ---------------- */
  function pegarMissao(id, pc) {
    const r = M.pegar(docDados(idQuadro()), id, pc, naMesa ? eu : null, Date.now());
    if (r.erro) { toast(r.erro); pintar(); return; }
    salvarQuadro(r.quadro);
    fechar();
    toast('Missão aceita: ' + (r.m.t || 'sem título') + (r.m.quem === 'grupo' ? ' (para o grupo)' : ' — ' + nomePc(pc)) + '.');
    if (!mestre) { pcSel = pc; }
  }
  function confirmarDesistir(a, pc) {
    const hist = a.onde === 'pc';
    janela(h('div', { class: 'conf' }, h('h2', { text: 'Desistir de “' + (a.m.t || 'missão') + '”?' }),
      h('p', { text: hist ? 'Esta missão é da história: desistir conta como falha, e ela vai para as encerradas.' : 'Ela volta para o quadro, e o andamento se perde. O mestre fica sabendo.' }),
      h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: () => abrir(a.m.id, aberto.ctx) }),
        h('button', { type: 'button', class: 'btn per', id: 'mDesistirSim', text: hist ? 'Desistir (falhou)' : 'Desistir', onclick: () => {
          const r = M.desistir(docDados(idQuadro()), hist ? docDados(idPc(pc)) : null, a.m.id, pc);
          if (r.erro) { toast(r.erro); fechar(); return; }
          if (r.pc) salvarPc(pc, r.pc); else salvarQuadro(r.quadro);
          fechar();
          toast(r.falhou ? 'Missão marcada como falha.' : 'A missão voltou para o quadro.');
        } }))));
  }
  function salvarOnde(a, Dn) { if (a.onde === 'quadro') salvarQuadro(Dn); else if (a.onde === 'pc') salvarPc(aberto.ctx.pc, Dn); else salvarRasc(Dn); }
  const docDe = a => (a.onde === 'quadro' ? docDados(idQuadro()) : a.onde === 'pc' ? docDados(idPc(aberto.ctx.pc)) : docDados(idRasc()));
  function marcarObj(a, oid, feito, pc) {
    const Dn = M.marcarObjetivo(docDe(a), a.m.id, oid, feito, pc); if (!Dn) return;
    salvarOnde(a, Dn);
  }
  function mudarEstadoDe(a, e, pc) {
    const Dn = M.mudarEstado(docDe(a), a.m.id, e, pc); if (!Dn) return;
    // (lote 126) cumprida pela primeira vez: a reputação vai para a ficha de quem cumpriu
    const mm = Dn.ms[a.m.id], ja = mm && (mm.quem === 'todos' ? mm.pegas[pc] && mm.pegas[pc].repDada : mm.repDada);
    if (e === 'feita' && mm && mm.rep && mm.rep.length && !ja) {
      const quem = a.onde === 'pc' ? [aberto.ctx.pc] : mm.quem === 'todos' ? [pc] : mm.quem === 'grupo' ? personagens().map(p => p.id) : Object.keys(mm.pegas || {});
      if (darReputacao(mm, quem.filter(Boolean))) { if (mm.quem === 'todos') mm.pegas[pc].repDada = true; else mm.repDada = true; }
    }
    salvarOnde(a, Dn);
    toast('“' + (a.m.t || 'Missão') + '”: ' + M.estadoDe(e).n + '.');
    abrir(a.m.id, Object.assign({}, aberto.ctx, { pc }));
  }
  function devolver(a, pc) {
    const Q = M.doc(docDados(idQuadro())), m = Q.ms[a.m.id]; if (!m) return;
    const antes = copia(Q);
    if (m.quem === 'todos') delete m.pegas[pc]; else { m.e = 'oferta'; m.pegas = {}; m.ok = {}; }
    salvarQuadro(Q); fechar();
    toast(m.quem === 'todos' ? 'Tirada de ' + nomePc(pc) + '.' : 'Voltou para o quadro.', 'Desfazer', () => salvarQuadro(antes));
  }
  function fecharTodos(id) {
    const Q = M.doc(docDados(idQuadro())), m = Q.ms[id]; if (!m) return;
    if (m.fechada) delete m.fechada; else m.fechada = true;
    salvarQuadro(Q); abrir(id, aberto.ctx);
    toast(m.fechada ? 'Fora do quadro: quem já pegou continua com ela.' : 'De volta ao quadro.');
  }
  function publicarRasc(id) {
    const r = M.publicar(docDados(idRasc()), docDados(idQuadro()), id); if (!r) return;
    salvarQuadro(r.quadro); salvarRasc(r.rasc); fechar();
    toast('Revelada: já está no quadro.');
  }
  /* Revelar várias de uma vez: um documento gravado por vez (o quadro, as ocultas, o de cada personagem). As da história
     vão para o personagem escolhido nelas; as sem personagem ficam ocultas. */
  function revelarMarcadas() {
    let R = docDados(idRasc()), Q = docDados(idQuadro());
    const pcs = {}, sem = [];
    let n = 0;
    for (const id of [...marcadas]) {
      const m = M.doc(R).ms[id]; if (!m) continue;
      if (m.quem === 'pc') {
        if (!m.alvo || !personagens().some(p => p.id === m.alvo)) { sem.push(m.t || 'sem título'); continue; }
        const r = M.entregar(R, pcs[m.alvo] || docDados(idPc(m.alvo)), id); if (!r) continue;
        R = r.rasc; pcs[m.alvo] = r.pc; n++;
      } else { const r = M.publicar(R, Q, id); if (!r) continue; R = r.rasc; Q = r.quadro; n++; }
      marcadas.delete(id);
    }
    if (!n) { toast(sem.length ? 'Escolha o personagem das missões da história antes de revelar.' : 'Nada para revelar.'); pintar(); return; }
    salvarQuadro(M.doc(Q)); salvarRasc(M.doc(R));
    for (const pc of Object.keys(pcs)) salvarPc(pc, pcs[pc]);
    toast((n === 1 ? 'Uma missão revelada.' : n + ' missões reveladas.') + (sem.length ? ' Ficaram ocultas (falta escolher o personagem): ' + sem.join(', ') + '.' : ''));
    pintar();
  }
  function entregarA(id, pc) {
    if (!pc) { toast('Escolha o personagem.'); return; }
    const r = M.entregar(docDados(idRasc()), docDados(idPc(pc)), id); if (!r) return;
    salvarPc(pc, r.pc); salvarRasc(r.rasc); fechar();
    toast('Entregue a ' + nomePc(pc) + '.');
  }
  function recolherMissao(a, certo) {
    const pegaram = Object.keys(a.m.pegas || {});
    if (!certo && (pegaram.length || a.onde === 'pc')) {
      const quem = a.onde === 'pc' ? nomePc(aberto.ctx.pc) : pegaram.map(nomePc).join(', ');
      const ctx = Object.assign({}, aberto.ctx);
      janela(h('div', { class: 'conf' }, h('h2', { text: 'Ocultar “' + (a.m.t || 'missão') + '” de novo?' }),
        h('p', { text: quem + (a.onde === 'pc' || pegaram.length === 1 ? ' está' : ' estão') + ' com esta missão. Ela some para os jogadores e volta para “Ocultas”' + (a.onde === 'pc' ? '.' : ', sem ninguém com ela e sem o andamento.') }),
        h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: () => abrir(a.m.id, ctx) }),
          h('button', { type: 'button', class: 'btn pri', id: 'mOcultarSim', text: 'Ocultar', onclick: () => { aberto = { id: a.m.id, ctx }; recolherMissao(a, true); } }))));
      return;
    }
    const r = M.recolher(docDe(a), docDados(idRasc()), a.m.id, a.onde === 'pc' ? aberto.ctx.pc : null); if (!r) return;
    salvarOnde(a, r.de); salvarRasc(r.rasc); fechar();
    toast('Oculta de novo: os jogadores não a veem mais (está em “Ocultas”).');
  }
  function apagar(a) {
    const Dn = M.doc(docDe(a)), m = Dn.ms[a.m.id]; if (!m) return;
    const ctx = Object.assign({}, aberto.ctx);
    delete Dn.ms[a.m.id];
    salvarOnde(a, Dn); fechar();
    toast('Missão “' + (m.t || 'sem título') + '” apagada.', 'Desfazer', () => {
      const D2 = M.doc(a.onde === 'quadro' ? docDados(idQuadro()) : a.onde === 'pc' ? docDados(idPc(ctx.pc)) : docDados(idRasc()));
      D2.ms[a.m.id] = m;
      if (a.onde === 'quadro') salvarQuadro(D2); else if (a.onde === 'pc') salvarPc(ctx.pc, D2); else salvarRasc(D2);
    });
  }

  /* ---------------- criar e editar (quem mestra) ---------------- */
  const LADO_IMG = 900;
  async function reduzir(arq) {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(arq.type || '')) throw new Error('Escolha uma imagem PNG, JPG ou WebP.');
    const url = URL.createObjectURL(arq);
    try {
      const img = await new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('Não deu para ler esta imagem.')); i.src = url; });
      const k = Math.min(1, LADO_IMG / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.86));
      if (!blob) throw new Error('Não deu para preparar esta imagem.');
      if (naMesa && TC.arquivos && TC.arquivos.subir) return TC.arquivos.subir(blob);
      if (!naMesa) return cv.toDataURL('image/webp', 0.8);
      throw new Error('Sem a mesa, a imagem não sobe.');
    } finally { URL.revokeObjectURL(url); }
  }
  /* os lugares do Mapa-múndi (os mapas de quem mestra; os objetos com nome) */
  // (lote 126) as facções dos mapas do Mapa-múndi, para a reputação: [{ id, nome, oculta }]
  function faccoes() {
    if (!naMesa) return [];
    const out = [];
    for (const l of D.todas()) {
      if (l.apagado || typeof l.id !== 'string' || !l.id.startsWith('mundo:mapa:') || !l.dados || !Array.isArray(l.dados.faccoes)) continue;
      for (const f of l.dados.faccoes) if (f && typeof f.id === 'string' && /^[A-Za-z0-9_:.-]{1,60}$/.test(f.id) && !out.some(x => x.id === f.id)) out.push({ id: f.id, nome: String(f.nome || '').trim().slice(0, 60) || 'Facção', oculta: !!f.oculta });
    }
    return out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  }
  /* (lote 126) Cumprida: a reputação da missão vai para a ficha de quem cumpriu (uma vez). Quem: a da história, o dono
     dela; 'todos', o personagem daquela pega; 'um', quem pegou; 'grupo', os personagens de jogador da campanha. Os
     valores escondidos do jogador vão para os segredos do mestre (fichas:segredos). Devolve o desfazer, ou null. */
  function darReputacao(m, pcs) {
    const RP = window.TC && TC.reputacao;
    if (!naMesa || !mestre || !RP || !Array.isArray(m.rep) || !m.rep.length || !pcs.length) return null;
    const facs = faccoes(), sgDoc = D.pegar('fichas:segredos'), sg0 = sgDoc && !sgDoc.apagado && sgDoc.dados && sgDoc.dados.v && typeof sgDoc.dados.v === 'object' ? copia(sgDoc.dados.v) : {};
    const sg = copia(sg0), antes = [], nomes = [];
    for (const id of pcs) {
      const l = PC.pegar(id); if (!l || l.apagado) continue;
      let est = l.estado || {}, seg = (sg.rep && sg.rep[id]) || {};
      for (const r of m.rep) { const x = RP.mudar(est, seg, { t: 'mais', f: r.f, n: r.n, d: r.v }, facs.find(y => y.id === r.f) || null); est = x.estado; seg = x.seg; }
      antes.push({ id, estado: copia(l.estado || {}) });
      PC.gravar(id, { estado: est });
      if (Object.keys(seg).length) { sg.rep = sg.rep || {}; sg.rep[id] = seg; } else if (sg.rep) delete sg.rep[id];
      nomes.push(l.nome || 'Sem nome');
    }
    if (!antes.length) return null;
    if (JSON.stringify(sg) !== JSON.stringify(sg0)) D.gravar('fichas:segredos', { dados: { v: sg }, vis: 'mestre' }, null, { cas: true });
    toast('Reputação: ' + m.rep.map(RP.texto).join(', ') + ' — ' + nomes.join(', ') + '.', 'Desfazer', () => {
      for (const a of antes) PC.gravar(a.id, { estado: a.estado });
      if (JSON.stringify(sg) !== JSON.stringify(sg0)) D.gravar('fichas:segredos', { dados: { v: sg0 }, vis: 'mestre' }, null, { cas: true });
    }, 9000);
    return true;
  }
  function lugares() {
    if (!naMesa) return [];
    const out = [];
    for (const l of D.todas()) {
      if (l.apagado || typeof l.id !== 'string' || !l.id.startsWith('mundo:mapa:')) continue;
      const mid = l.id.slice('mundo:mapa:'.length), m = l.dados;
      if (!m || typeof m !== 'object') continue;
      const nm = m.nome || 'Mapa';
      out.push({ mapa: mid, obj: '', nome: nm, rot: nm + ' (o mapa inteiro)' });
      for (const o of Array.isArray(m.objs) ? m.objs : []) if (o && typeof o.id === 'string' && o.nome && ['m', 'r', 'z', 'x', 'c', 'e'].includes(o.k)) out.push({ mapa: mid, obj: o.id, nome: o.nome, rot: o.nome + ' · ' + nm });
    }
    return out.sort((a, b) => a.rot.localeCompare(b.rot, 'pt'));
  }
  function editar(a) {
    const novo = !a;
    const f = novo ? M.missao({ quem: 'um', e: 'oferta', c: Date.now() }) : M.missao(a.m);
    const id = novo ? M.novoId() : a.m.id, onde = novo ? 'rasc' : a.onde;
    const objs = M.objs(f).map(o => ({ id: o.id, t: o.t }));
    const campo = (rot, el, dica) => h('label', { class: 'campo' }, h('span', { text: rot }), el, dica ? h('small', { text: dica }) : null);
    const tit = h('input', { class: 'in', id: 'fTit', maxlength: '120', value: f.t, placeholder: 'Ex.: O ferreiro desaparecido' });
    const ct = h('input', { class: 'in', id: 'fCt', maxlength: '80', value: f.ct, placeholder: 'Ex.: Mestre Orvin, o ferreiro' });
    const desc = h('textarea', { class: 'in', id: 'fDesc', rows: '4', maxlength: '3000', placeholder: 'O que se sabe, onde começar…' }); desc.value = f.d;
    const rec = h('input', { class: 'in', id: 'fRec', maxlength: '300', value: f.r, placeholder: 'Ex.: 200 lapros e um favor da guilda' });
    const pz = h('input', { class: 'in', id: 'fPz', maxlength: '80', value: f.pz, placeholder: 'Ex.: até a lua cheia' });
    let pe = f.pe;
    const pes = h('div', { class: 'seg', id: 'fPe', role: 'group', 'aria-label': 'Perigo' });
    const pintarPe = () => pes.replaceChildren(...M.PERIGO.map((n, i) => h('button', { type: 'button', 'aria-pressed': String(i === pe), title: n, text: i ? '☠'.repeat(i) : '—', onclick: () => { pe = i; pintarPe(); } })));
    pintarPe();
    const quem = h('select', { class: 'in', id: 'fQuem' }, M.QUEM.map(x => h('option', { value: x.k, selected: x.k === f.quem }, x.n)));
    const alvo = h('select', { class: 'in', id: 'fAlvo' }, personagens().map(p => h('option', { value: p.id, selected: p.id === (a && (a.m.alvo || (a.onde === 'pc' ? aberto.ctx.pc : null))) }, p.nome)));
    const campoAlvo = campo('Para quem', alvo);
    const trocaQuem = () => { campoAlvo.hidden = quem.value !== 'pc'; };
    quem.onchange = trocaQuem;
    if (!novo && onde !== 'rasc') quem.disabled = true;           // (publicada: o tipo não muda — recolha antes)
    const ls = lugares(), lug = h('select', { class: 'in', id: 'fLug' }, h('option', { value: '' }, ls.length ? 'Nenhum' : 'Sem mapas nesta mesa'),
      ls.map((l, i) => h('option', { value: String(i), selected: f.lug && f.lug.mapa === l.mapa && (f.lug.obj || '') === l.obj }, l.rot)));
    // as imagens
    let img = f.img, cti = f.cti;
    const arq = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', hidden: true });
    let paraImg = null;
    const pintarImg = (alvoEl, url, rot, limpa) => alvoEl.replaceChildren(...[url ? h('img', { src: url, alt: '' }) : h('span', { text: 'Sem imagem' }),
      h('button', { type: 'button', class: 'btn sm', text: url ? 'Trocar' : rot, onclick: () => { paraImg = alvoEl; arq.value = ''; arq.click(); } }),
      url ? h('button', { type: 'button', class: 'btn sm', text: 'Tirar', onclick: limpa }) : null].filter(Boolean));
    const boxImg = h('div', { class: 'imgbox', id: 'fImg' }), boxCti = h('div', { class: 'imgbox', id: 'fCti' });
    const pImg = () => pintarImg(boxImg, img, 'Pôr imagem', () => { img = ''; pImg(); });
    const pCti = () => pintarImg(boxCti, cti, 'Pôr retrato', () => { cti = ''; pCti(); });
    arq.onchange = async () => {
      const a0 = arq.files && arq.files[0], el = paraImg; paraImg = null;
      if (!a0 || !el) return;
      el.classList.add('subindo');
      try { const url = await reduzir(a0); if (el === boxImg) { img = url; pImg(); } else { cti = url; pCti(); } }
      catch (e) { toast((e && e.message) || 'Não deu para usar esta imagem.'); }
      finally { el.classList.remove('subindo'); }
    };
    pImg(); pCti();
    // os objetivos
    const listaObj = h('div', { class: 'fobjs', id: 'fObjs' });
    const pintarObjs = () => listaObj.replaceChildren(...objs.map((o, i) => h('div', { class: 'fobj' },
      h('input', { class: 'in', maxlength: '200', value: o.t, placeholder: 'Um passo da missão', 'aria-label': 'Objetivo ' + (i + 1), oninput: ev => { o.t = ev.target.value; } }),
      h('button', { type: 'button', class: 'btn sm', 'aria-label': 'Tirar o objetivo ' + (i + 1), text: '×', onclick: () => { objs.splice(i, 1); pintarObjs(); } }))),
      h('button', { type: 'button', class: 'btn sm', id: 'fObjMais', text: '+ Objetivo', onclick: () => { objs.push({ id: 'o' + Date.now().toString(36) + objs.length, t: '' }); pintarObjs(); const ins = listaObj.querySelectorAll('input'); if (ins.length) ins[ins.length - 1].focus(); } }));
    pintarObjs();
    // (lote 126) a reputação que a missão dá quando é cumprida (as facções do Mapa-múndi)
    const facsRep = faccoes(), reps = (f.rep || []).map(x => Object.assign({}, x));
    const listaRep = h('div', { class: 'fobjs', id: 'fReps' });
    const pintarReps = () => listaRep.replaceChildren(...reps.map((r, i) => h('div', { class: 'fobj frep' },
      h('select', { class: 'in', 'aria-label': 'Facção ' + (i + 1), onchange: ev => { const fc = facsRep.find(x => x.id === ev.target.value); r.f = ev.target.value; r.n = fc ? fc.nome : r.n; } },
        (facsRep.some(x => x.id === r.f) ? [] : [h('option', { value: r.f, selected: true }, r.n || 'Facção')]).concat(facsRep.map(x => h('option', { value: x.id, selected: x.id === r.f }, x.nome + (x.oculta ? ' (escondida)' : ''))))),
      h('input', { class: 'in', type: 'number', min: '-100', max: '100', step: '1', value: String(r.v), 'aria-label': 'Quanto (de −100 a +100)', oninput: ev => { r.v = Number(ev.target.value) || 0; } }),
      h('button', { type: 'button', class: 'btn sm', 'aria-label': 'Tirar a reputação ' + (i + 1), text: '×', onclick: () => { reps.splice(i, 1); pintarReps(); } }))),
      facsRep.length ? (reps.length < 6 ? h('button', { type: 'button', class: 'btn sm', id: 'fRepMais', text: '+ Reputação', onclick: () => { const livre = facsRep.find(x => !reps.some(y => y.f === x.id)) || facsRep[0]; reps.push({ f: livre.id, n: livre.nome, v: 10 }); pintarReps(); } }) : null)
        : h('small', { class: 'hint', text: naMesa ? 'As facções vêm do Mapa-múndi: crie uma lá para dar reputação.' : 'A reputação vem das facções do Mapa-múndi, numa mesa.' }));
    pintarReps();
    const montar = () => {
      const o = {}; objs.forEach((x, i) => { if (x.t.trim()) o[x.id] = { t: x.t.trim(), n: i }; });
      const l = lug.value === '' ? null : ls[+lug.value];
      const base = novo ? {} : copia(a.m);
      const m = Object.assign(base, { t: tit.value.trim(), ct: ct.value.trim(), d: desc.value, r: rec.value.trim(), pz: pz.value.trim(), pe, img, cti, o,
        lug: l ? { mapa: l.mapa, obj: l.obj, nome: l.nome } : null, quem: quem.value, c: f.c || Date.now() });
      delete m.id; delete m.objs; delete m.feitos; delete m.total; delete m.onde;
      // os objetivos que saíram não ficam marcados
      const ok = {}; for (const k of Object.keys(m.ok || {})) if (o[k]) ok[k] = 1; m.ok = ok;
      for (const p of Object.keys(m.pegas || {})) { const pk = {}; for (const k of Object.keys(m.pegas[p].ok || {})) if (o[k]) pk[k] = 1; m.pegas[p].ok = pk; }
      if (quem.value === 'pc' && onde === 'rasc') m.alvo = alvo.value || null; else delete m.alvo;
      m.rep = reps.filter(r => r.f && Number(r.v));
      return M.missao(m);
    };
    const salvar = destino => {
      if (!tit.value.trim()) { toast('Dê um título à missão.'); tit.focus(); return; }
      const m = montar();
      if (destino === 'rasc' || onde === 'rasc') {
        const R = M.doc(docDados(idRasc())); R.ms[id] = m; salvarRasc(R);
        if (destino === 'publicar') { publicarRasc(id); return; }
        if (destino === 'entregar') { entregarA(id, alvo.value); return; }
        fechar(); toast(novo ? 'Guardada oculta: só você vê.' : 'Missão oculta salva.');
        if (novo) { aba = 'rascunhos'; pintar(); }
        return;
      }
      if (onde === 'quadro') { const Q = M.doc(docDados(idQuadro())); Q.ms[id] = m; salvarQuadro(Q); }
      else { const pc = aberto.ctx.pc, P = M.doc(docDados(idPc(pc))); P.ms[id] = m; salvarPc(pc, P); }
      fechar(); toast('Missão salva.');
    };
    const pe0 = h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: () => (novo ? fechar() : abrir(id, aberto.ctx)) }));
    if (onde === 'rasc') {
      pe0.append(h('button', { type: 'button', class: 'btn', id: 'fSalvar', text: 'Guardar oculta', onclick: () => salvar('rasc') }));
      const pub = h('button', { type: 'button', class: 'btn pri', id: 'fPublicar', onclick: () => salvar(quem.value === 'pc' ? 'entregar' : 'publicar') });
      const rot = () => { pub.textContent = quem.value === 'pc' ? 'Entregar ao personagem' : 'Revelar no quadro'; };
      quem.addEventListener('change', rot); rot();
      pe0.append(pub);
    } else pe0.append(h('button', { type: 'button', class: 'btn pri', id: 'fSalvar', text: 'Salvar', onclick: () => salvar() }));
    janela(h('div', { class: 'form' },
      h('h2', { text: novo ? 'Nova missão' : 'Editar missão' }),
      campo('Título', tit),
      h('div', { class: 'linha' }, campo('Quem pede', ct), h('div', { class: 'campo' }, h('span', { text: 'Retrato de quem pede' }), boxCti)),
      campo('Descrição', desc),
      h('div', { class: 'campo' }, h('span', { text: 'Objetivos' }), listaObj),
      h('div', { class: 'linha' }, campo('Recompensa', rec), campo('Prazo', pz)),
      h('div', { class: 'campo' }, h('span', { text: 'Reputação quando for cumprida' }), listaRep, h('small', { text: 'Vai sozinha para a ficha de quem cumpriu, quando você marcar “Cumprida”.' })),
      h('div', { class: 'campo' }, h('span', { text: 'Perigo' }), pes),
      h('div', { class: 'campo' }, h('span', { text: 'Imagem (o cartaz, a foto do alvo)' }), boxImg),
      campo('Lugar no Mapa-múndi', lug),
      h('div', { class: 'linha' }, campo('Quem pode pegar', quem, !novo && onde !== 'rasc' ? 'Para mudar o tipo, oculte a missão de novo.' : null), campoAlvo),
      arq, pe0));
    trocaQuem();
    tit.focus();
  }

  /* ---------------- o que mudou de fora ---------------- */
  function avisarQuadro(antes, agora) {
    if (!antes || !mestre) return;
    for (const id of Object.keys(agora.ms)) {
      const a = antes.ms[id], b = agora.ms[id]; if (!a) continue;
      const pa = Object.keys(a.pegas || {}), pb = Object.keys(b.pegas || {});
      for (const p of pb) if (!pa.includes(p)) toast(nomePc(p) + ' pegou “' + (b.t || 'uma missão') + '”.');
      for (const p of pa) if (!pb.includes(p) && (a.pegas[p].e === 'ativa')) toast(nomePc(p) + ' desistiu de “' + (b.t || 'uma missão') + '”: voltou para o quadro.');
    }
  }
  function aoMudarDoc(l, tipo) {
    if (!l || typeof l.id !== 'string' || !l.id.startsWith('fichas:mis:')) return;
    if (l.id === idQuadro()) { const q = quadro(); if (tipo === 'remota') avisarQuadro(ultimoQuadro, q); ultimoQuadro = q; }
    if (tipo === 'remota' && mestre && l.id.startsWith(M.PRE_PC) && !l.apagado) {
      const pc = l.id.slice(M.PRE_PC.length), P = M.doc(l.dados);
      for (const id of Object.keys(P.ms)) if (P.ms[id].e === 'falhou' && antesPc[l.id] && antesPc[l.id][id] === 'ativa') toast(nomePc(pc) + ' desistiu de “' + (P.ms[id].t || 'uma missão') + '” (falhou).');
    }
    lembrarPc(l);
    if (dlg.open) { if (aberto && document.querySelector('.folha')) abrir(aberto.id, aberto.ctx); }
    else pintar();
  }
  const antesPc = {};
  function lembrarPc(l) { if (l && typeof l.id === 'string' && l.id.startsWith(M.PRE_PC)) { const P = M.doc(l.dados), o = {}; for (const id of Object.keys(P.ms)) o[id] = P.ms[id].e; antesPc[l.id] = o; } }

  $('btNova').addEventListener('click', () => editar(null));
  $('estilo').addEventListener('change', ev => { const Q = M.doc(docDados(idQuadro())); Q.estilo = M.estiloDe(ev.target.value).k; salvarQuadro(Q); pintar(); toast('Estilo do quadro: ' + M.estiloDe(Q.estilo).n + '.'); });
  dlg.addEventListener('close', () => { aberto = null; pintar(); });

  /* ---------------- partida ---------------- */
  async function partida() {
    const TCx = window.TC;
    if (TCx && TCx.ponte) {
      st = await TCx.ponte.pronta;
      if (TCx.ponte.naCasca) document.documentElement.classList.add('na-casca');
      if (TCx.dados && TCx.dados.disponivel()) {
        naMesa = true;
        eu = st.eu || null;
        mestre = TCx.ponte.mestra ? TCx.ponte.mestra('fichas') : st.papel === 'mestre';
        D = TCx.dados.col('documentos'); PC = TCx.dados.col('personagens');
        await Promise.all([D.pronta, PC.pronta]);
        for (const l of D.todas()) lembrarPc(l);
        D.aoMudar(l => aoMudarDoc(l, 'remota'));
        PC.aoMudar(() => { if (!pronto) return; migrarSeFalta(); if (!dlg.open) pintar(); });
      }
      TCx.ponte.aoMudar(e => { const c0 = camp(); st = e; if (naMesa) mestre = TCx.ponte.mestra ? TCx.ponte.mestra('fichas') : st.papel === 'mestre'; if (camp() !== c0) { ultimoQuadro = null; migrarSeFalta(); } if (pronto && !dlg.open) pintar(); });
      if (TCx.ponte.aoIr) TCx.ponte.aoIr(alvo => {
        if (!alvo) return;
        if (alvo.pc && !mestre && meus().some(p => p.id === alvo.pc)) { pcSel = alvo.pc; aba = 'minhas'; }
        else if (alvo.pc && mestre) aba = 'andamento';
        if (pronto) pintar();
        if (alvo.missao) abrir(alvo.missao, { pc: alvo.pc || null });
      });
    }
    if (!naMesa && /[?&]jogador\b/.test(location.search)) { mestre = false; eu = 'local'; }
    pronto = true;
    migrarSeFalta();
    ultimoQuadro = quadro();
    if (!mestre && meus().length) aba = M.doPersonagem(quadro(), docPc(meus()[0].id), meus()[0].id).some(m => m.e === 'ativa') ? 'minhas' : 'quadro';
    pintar();
  }
  if (DEBUG) window.__mis = { M, quadro, rasc, docPc, personagens, meus, pegarMissao, abrir, editar, get mestre() { return mestre; }, set mestre(v) { mestre = v; }, get aba() { return aba; }, pintar };
  partida().catch(e => {
    console.error(e);
    $('corpo').replaceChildren(h('div', { class: 'vazio' }, h('strong', { text: 'Não deu para abrir as missões. ' }), (e && e.message) || ''));
  });
})();
