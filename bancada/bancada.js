/* Tiny Cats · Bancada: a página (lote 142).
   Os minigames de ofício — alquimia, ferreiro e invenção, dois jeitos cada, seis níveis (tc/bancada-jogos.js).
     · quem joga: abre um minigame sozinho (se o mestre deixar, até o nível que ele deixar) ou joga o que o mestre
       mandou (a aba Pedidos). O fim vai para a mesa ao vivo (sucesso ou falha e a nota de 0 a 100); a falha pode
       machucar (o dano que o mestre escreveu, tirado do HP da ficha).
     · quem mestra (as Fichas): manda um minigame a um personagem (o ofício, o jeito, o nível, o dano e um recado),
       vê ao vivo quem está jogando e os resultados, e as regras: abrir sozinho, o nível máximo e o dano de cada nível.
   Os documentos: fichas:banc:cfg (as regras, a mesa toda lê) e fichas:banc:pc:<personagem> (os pedidos daquele
   personagem: o dono é quem joga, que marca o resultado). O ao vivo vai pelo canal leve fechv:<mesa> (o mesmo da
   fechadura), sem gravar nada. Fora de uma mesa, tudo fica neste navegador (?jogador: no modo de quem joga). */
(() => {
  'use strict';
  const BJ = window.TC.bancadaJogos;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const $ = id => document.getElementById(id);
  const copia = x => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
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
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    return el;
  }
  const add = (el, ...kids) => { for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k); return el; };
  function toast(msg, ms) {
    const t = h('div', { class: 'toast', role: 'status' }, h('span', { text: msg }));
    $('toasts').append(t);
    setTimeout(() => t.remove(), ms || 4500);
  }
  const ICONE = { alquimia: '⚗️', ferreiro: '⚒️', invencao: '⚙️' };
  const DESC = { alquimia: 'Caldeirão ou destilar: o fogo na medida e os ingredientes na ordem.', ferreiro: 'Forja ou têmpera: o metal na cor certa e o martelo no ponto.', invencao: 'Engrenagens ou fiação: travar no eixo e ligar os fios.' };
  const NOMEN = k => (BJ.NIVEIS.find(n => n[0] === k) || ['', k])[1];

  /* ---------------- os dados ---------------- */
  let st = null, D = null, PC = null, naMesa = false, mestre = true, eu = 'local', pronto = false;
  const LOCAL = 'tinycats:bancada:local', FICHAS_LOCAL = 'urgm_calc_atributos_v1', CFG = 'fichas:banc:cfg', PRE = 'fichas:banc:pc:';
  const local = (() => { try { return JSON.parse(localStorage.getItem(LOCAL) || '{}') || {}; } catch (e) { return {}; } })();
  const lerJson = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  function docDados(id) {
    if (naMesa) { const d = D.pegar(id); return d && !d.apagado ? d.dados : null; }
    return local[id] || null;
  }
  function gravarDoc(id, dados, vis, dono) {
    if (naMesa) {
      const c = { dados: copia(dados) };
      if (vis && mestre) c.vis = vis;
      if (dono !== undefined && mestre) c.dono_id = dono;
      D.gravar(id, c, null, { cas: true });
      return;
    }
    local[id] = copia(dados);
    try { localStorage.setItem(LOCAL, JSON.stringify(local)); } catch (e) { toast('Não deu para guardar neste navegador.'); }
  }
  // as regras: abrir sozinho, o nível máximo (0–5) e o dano de cada nível (a expressão: "2d6", "5"; vazio = não machuca)
  function cfg() {
    const c = docDados(CFG) || {};
    const dano = Array.isArray(c.dano) ? c.dano.slice(0, 6).map(x => String(x || '').slice(0, 30)) : [];
    while (dano.length < 6) dano.push('');
    return { solto: c.solto !== false, max: Number.isInteger(c.max) ? Math.max(0, Math.min(5, c.max)) : 5, dano };
  }
  const salvarCfg = c => gravarDoc(CFG, c, 'mesa');
  const membros = () => (naMesa && st && Array.isArray(st.membros) ? st.membros : []);
  const jogadorDaMesa = m => !!m && (m.cargo ? m.cargo !== 'mestre' : m.papel === 'jogador');
  const camp = () => (naMesa && st && st.campanha ? st.campanha.id : '');
  /* Os personagens de quem joga (desta campanha). Sem mesa: os das Fichas deste navegador. */
  function personagens() {
    if (!naMesa) {
      const s = lerJson(FICHAS_LOCAL), l = s && Array.isArray(s.personagens) ? s.personagens : [];
      return l.filter(p => p && p.id && !p.petDe).map(p => ({ id: String(p.id), nome: p.nome || 'Sem nome', dono: 'local' }));
    }
    const c = camp(), ms = membros();
    return PC.todas().filter(l => !l.apagado && l.dono_id && !(l.ficha && l.ficha.petDe) && (() => { const m = ms.find(x => x.id === l.dono_id); return !m || jogadorDaMesa(m); })()
      && (!c || !l.campanha || l.campanha === c))
      .sort((a, b) => (a.ordem - b.ordem) || (a.id < b.id ? -1 : 1))
      .map(l => ({ id: l.id, nome: l.nome || 'Sem nome', dono: l.dono_id }));
  }
  const meus = () => personagens().filter(p => mestre || p.dono === eu);
  const nomePc = id => { const p = personagens().find(x => x.id === id); return p ? p.nome : 'um personagem'; };
  const donoPc = id => { const p = personagens().find(x => x.id === id); return p ? p.dono : null; };
  // os pedidos de um personagem: { ps: { id: { of, jeito, nivel, dano, nota, t, e: 'novo' | 'jogando' | 'feito', res } } }
  function pedidos(pc) { const d = docDados(PRE + pc); return d && ehObj(d.ps) ? d.ps : {}; }
  function salvarPedidos(pc, ps) { gravarDoc(PRE + pc, { ps }, 'mestre', mestre ? (donoPc(pc) || null) : undefined); }
  const pendentes = pc => Object.entries(pedidos(pc)).filter(([, p]) => p && p.e !== 'feito').sort((a, b) => (a[1].t || 0) - (b[1].t || 0));

  /* ---------------- ao vivo: o canal leve da mesa (o mesmo da fechadura) ---------------- */
  function vivoApi() {
    try {
      const t = (window.parent && window.parent !== window && window.parent.TC) || window.TC;
      const mesa = t && t.mesas && t.mesas.atual && t.mesas.atual.id;
      return t && t.aoVivo && t.aoVivo.leve && mesa ? { leve: t.aoVivo.leve, topico: 'fechv:' + mesa, eu: t.conta && t.conta.usuario ? t.conta.usuario.id : null } : null;
    } catch (e) { return null; }
  }
  let canal = null;
  const aoVivoAgora = new Map();                // quem → { msg, em }
  const resultados = [];                        // os últimos que terminaram (para quem mestra)
  function ligarCanal() {
    const v = vivoApi();
    if (!v) return null;
    if (!canal || canal.topico !== v.topico) {
      if (canal) canal.sair();
      const sair = v.leve.assinar(v.topico, msg => {
        if (!msg || msg.k !== 'banc' || !mestre) return;
        const chave = (msg.u || '') + ':' + (msg.pc || '');
        if (msg.fim) {
          aoVivoAgora.delete(chave);
          resultados.unshift({ em: Date.now(), msg }); resultados.splice(20);
          toast((msg.nome || 'Alguém') + ' · ' + BJ.nomeJeito(msg.jeito) + ' (' + NOMEN(msg.niv) + '): ' + (msg.ok ? 'deu certo' : 'não deu') + ', nota ' + msg.nota + '/100.');
        } else {
          if (!aoVivoAgora.has(chave)) toast((msg.nome || 'Alguém') + ' começou ' + BJ.nomeJeito(msg.jeito) + ' (' + NOMEN(msg.niv) + ').');
          aoVivoAgora.set(chave, { msg, em: Date.now() });
        }
        if (aba === 'vivo' && !jogo) pintar();
      });
      canal = { topico: v.topico, sair, v };
    }
    return canal.v;
  }
  function transmitir(ctx, est, fim) {
    if (mestre && !ctx.pc) return;
    const v = ligarCanal();
    if (!v) return;
    const msg = { k: 'banc', u: v.eu, pc: ctx.pc, nome: nomePc(ctx.pc), jeito: ctx.jeito, of: ctx.of, niv: ctx.nivel, f: est.feitos, p: est.passos, e: est.erros, me: est.maxErros, s: est.seg, tl: est.tempo };
    if (fim) Object.assign(msg, { fim: 1, ok: fim.ok ? 1 : 0, nota: fim.nota });
    try { v.leve.enviar(v.topico, msg); } catch (e) { /* o ao vivo é opcional */ }
  }

  /* ---------------- o dano da falha: tira do HP da ficha (como uma poção ao contrário) ---------------- */
  const R = () => window.TC && window.TC.rules, IT = () => window.TC && window.TC.itens;
  function cfgFichas() { const d = naMesa ? D.pegar('fichas:cfg') : null; return (d && d.dados && d.dados.v) || (R() && R().cfgPadrao()); }
  function bib() {
    if (!naMesa) return null;
    const T = window.TC && window.TC.ponte, ehM = T && T.mestra ? T.mestra('arvore') : mestre;
    const d = D.pegar(ehM ? 'arvore:biblioteca' : 'arvore:pacote'); return d && d.dados && Array.isArray(d.dados.arvores) ? d.dados : null;
  }
  function danoNaFicha(pcId, expr) {
    const e = String(expr || '').trim();
    if (!e) return '';
    let rolado = null;
    try { const r = window.TC.dice.rollExpr(e); if (r && r.ok) rolado = r.total; } catch (x) { rolado = null; }
    if (rolado == null) { const n = Number(e.replace(/[^\d.]/g, '')); rolado = Number.isFinite(n) ? n : 0; }
    rolado = Math.max(0, Math.round(rolado));
    const txt = 'dano ' + e + (String(rolado) !== e ? ' = ' + rolado : '');
    if (!naMesa || !rolado) return txt;
    try {
      const l = PC.pegar(pcId);
      if (!l || !l.ficha || !R() || !IT()) return txt;
      const est0 = l.estado || {}, pc = Object.assign({}, l.ficha, { id: l.id, nome: l.nome });
      const calc = R().calcular(pc, cfgFichas(), { arvore: R().bonusDaArvore(l.skills, bib()), temp: est0.tmp, fer: est0.fer });
      const id = '__bancada', fx = [{ k: 'barra', rec: IT().recDaFicha(l.ficha, 'HP'), val: '-' + rolado }];
      const pc2 = Object.assign({}, pc, { bolsa: (Array.isArray(pc.bolsa) ? pc.bolsa : []).concat([{ id, t: 'pocao', nome: 'A falha', fx }]) });
      const r = R().usarItem(pc2, calc, Object.assign({}, est0, { qtd: Object.assign({}, est0.qtd || {}, { [id]: 1 }) }), id, [null], Date.now());
      if (!r.ok) return txt;
      const est = Object.assign({}, r.estado, { qtd: Object.assign({}, r.estado.qtd || {}) }); delete est.qtd[id];
      PC.gravar(l.id, { estado: est });
      const b = r.efeitos.find(x => x.k === 'barra');
      return txt + (b ? ' (' + b.nome + ' ' + b.de + ' → ' + b.para + ')' : '');
    } catch (x) { console.error(x); return txt; }
  }

  /* ---------------- a tela ---------------- */
  let aba = 'jogar', jogo = null, ultimoRes = null;
  const esc = { pc: null, of: 'alquimia', jeito: 'sorteio', nivel: 'facil' };
  const mand = { pc: null, of: 'alquimia', jeito: 'sorteio', nivel: 'medio', dano: '', nota: '' };
  function abas() {
    const nPed = mestre ? 0 : meus().reduce((s, p) => s + pendentes(p.id).length, 0);
    const lst = mestre ? [['jogar', 'Jogar'], ['mandar', 'Mandar'], ['vivo', 'Ao vivo'], ['regras', 'Regras']] : [['jogar', 'Jogar'], ['pedidos', 'Pedidos']];
    if (!lst.some(a => a[0] === aba)) aba = lst[0][0];
    $('abas').replaceChildren(...lst.map(([k, n]) => h('button', { type: 'button', role: 'tab', id: 'aba-' + k, 'aria-selected': String(aba === k), onclick: () => { if (jogo) return; aba = k; pintar(); } }, n, k === 'pedidos' && nPed ? h('span', { class: 'n', text: String(nPed) }) : null)));
  }
  const seg = (id, valor, ops, mudar, travado) => h('div', { class: 'seg', role: 'group', id }, ops.map(([v, n]) => h('button', { type: 'button', 'aria-pressed': String(v === valor), disabled: travado && travado(v), 'data-v': v, title: travado && travado(v) ? 'O mestre não liberou este nível' : null, onclick: () => mudar(v) }, n)));
  function escolherOficio(o, mudar) {
    return h('div', { class: 'oficios', role: 'group', 'aria-label': 'O ofício' }, BJ.OFICIOS.map(([k, n, js]) => h('button', { type: 'button', class: 'oficio', id: 'of-' + k, 'aria-pressed': String(o.of === k), onclick: () => mudar(k) },
      h('span', { class: 'ic', text: ICONE[k] }), h('b', { text: n }), h('span', { text: DESC[k] }), h('span', { text: js.map(j => j[1]).join(' · ') }))));
  }
  function pintar() {
    abas();
    if (jogo) return;
    const corpo = $('corpo');
    const s = { jogar: abaJogar, pedidos: abaPedidos, mandar: abaMandar, vivo: abaVivo, regras: abaRegras }[aba]();
    corpo.replaceChildren(...[].concat(s));
  }
  function abaJogar() {
    const c = cfg(), ps = meus();
    const out = [h('section', { class: 'secao' }, h('h2', { text: 'Jogar' }), h('p', { class: 'ajuda', text: 'Escolha o ofício, o jeito e o nível. O resultado (deu certo ou não, e a nota de 0 a 100) vai para a mesa ao vivo; o mestre decide o que saiu.' }))];
    if (!mestre && !c.solto) { add(out[0], h('p', { class: 'vazio', id: 'solto-off', text: 'O mestre deixou a Bancada só para os pedidos dele: veja a aba Pedidos.' })); return out; }
    if (!ps.length && naMesa) { add(out[0], h('p', { class: 'vazio', text: mestre ? 'Nenhum personagem de jogador nesta mesa ainda.' : 'Você ainda não tem personagem nesta mesa.' })); return out; }
    if (!ps.some(p => p.id === esc.pc)) esc.pc = ps[0] ? ps[0].id : null;
    const max = mestre ? 5 : c.max;
    if (BJ.nivDe(esc.nivel) > max) esc.nivel = BJ.NIVEIS[max][0];
    const sec = out[0];
    if (ps.length) add(sec, h('div', { class: 'campo' }, h('span', { text: 'Quem faz' }), h('select', { class: 'in', id: 'jog-pc', onchange: e => { esc.pc = e.target.value; } }, ps.map(p => h('option', { value: p.id, text: p.nome, selected: p.id === esc.pc })))));
    add(sec, h('div', { class: 'campo' }, h('span', { text: 'Ofício' }), escolherOficio(esc, k => { esc.of = k; esc.jeito = 'sorteio'; pintar(); })),
      h('div', { class: 'campo' }, h('span', { text: 'Jeito' }), seg('jog-jeito', esc.jeito, [['sorteio', 'Sorteio']].concat(BJ.jeitosDe(esc.of)), v => { esc.jeito = v; pintar(); })),
      h('div', { class: 'campo' }, h('span', { text: 'Nível' }), seg('jog-nivel', esc.nivel, BJ.NIVEIS, v => { esc.nivel = v; pintar(); }, v => BJ.nivDe(v) > max)),
      !mestre && max < 5 ? h('p', { class: 'note', text: 'O mestre liberou até o ' + BJ.NIVEIS[max][1] + '.' }) : null,
      c.dano[BJ.nivDe(esc.nivel)] ? h('p', { class: 'note ruim', id: 'jog-dano', text: 'Neste nível, a falha machuca: ' + c.dano[BJ.nivDe(esc.nivel)] + ' no HP.' }) : null,
      h('div', { class: 'lin' }, h('button', { type: 'button', class: 'btn pri', id: 'jog-comecar', text: 'Começar', onclick: () => comecar({ pc: esc.pc, of: esc.of, jeito: esc.jeito, nivel: esc.nivel, dano: c.dano[BJ.nivDe(esc.nivel)] || '' }) })));
    return out;
  }
  function abaPedidos() {
    const out = h('section', { class: 'secao' }, h('h2', { text: 'Pedidos do mestre' }), h('p', { class: 'ajuda', text: 'Os minigames que o mestre mandou para os seus personagens.' }));
    let n = 0;
    for (const p of meus()) for (const [id, pd] of pendentes(p.id)) {
      n++;
      add(out, h('div', { class: 'cartao', 'data-ped': id }, h('div', { class: 'lin' }, h('b', { text: ICONE[pd.of] + ' ' + BJ.nomeOficio(pd.of) + (pd.jeito && pd.jeito !== 'sorteio' ? ' · ' + BJ.nomeJeito(pd.jeito) : '') }), h('span', { class: 'tag novo', text: NOMEN(pd.nivel) }), h('span', { class: 'note', text: 'para ' + p.nome }), pd.e === 'jogando' ? h('span', { class: 'tag', text: 'começou e não terminou' }) : null),
        pd.nota ? h('p', { text: pd.nota }) : null,
        pd.dano ? h('p', { class: 'note ruim', text: 'Se falhar: ' + pd.dano + ' no HP.' }) : null,
        h('button', { type: 'button', class: 'btn pri', id: 'ped-jogar-' + id, text: 'Jogar', onclick: () => comecar({ pc: p.id, of: pd.of, jeito: pd.jeito || 'sorteio', nivel: pd.nivel, dano: pd.dano || '', ped: id }) })));
    }
    if (!n) add(out, h('p', { class: 'vazio', id: 'ped-vazio', text: 'Nenhum pedido agora.' }));
    return out;
  }
  function abaMandar() {
    const ps = personagens();
    const out = h('section', { class: 'secao' }, h('h2', { text: 'Mandar um minigame' }), h('p', { class: 'ajuda', text: 'Escolha o personagem, o ofício e o nível. Aparece na aba Pedidos de quem joga; o resultado volta aqui e vai para a mesa ao vivo.' }));
    if (!ps.length) { add(out, h('p', { class: 'vazio', text: 'Nenhum personagem de jogador ainda.' })); return out; }
    if (!ps.some(p => p.id === mand.pc)) mand.pc = ps[0].id;
    const dano = h('input', { class: 'in', id: 'mand-dano', value: mand.dano, placeholder: 'Ex.: 2d6 (vazio: não machuca)', maxlength: 30, oninput: e => { mand.dano = e.target.value; } });
    const nota = h('input', { class: 'in', id: 'mand-nota', value: mand.nota, placeholder: 'O recado (opcional): o que ele está tentando fazer', maxlength: 200, style: 'width:100%', oninput: e => { mand.nota = e.target.value; } });
    add(out, h('div', { class: 'campo' }, h('span', { text: 'Para' }), h('select', { class: 'in', id: 'mand-pc', onchange: e => { mand.pc = e.target.value; } }, ps.map(p => h('option', { value: p.id, text: p.nome, selected: p.id === mand.pc })))),
      h('div', { class: 'campo' }, h('span', { text: 'Ofício' }), escolherOficio(mand, k => { mand.of = k; mand.jeito = 'sorteio'; pintar(); })),
      h('div', { class: 'campo' }, h('span', { text: 'Jeito' }), seg('mand-jeito', mand.jeito, [['sorteio', 'Sorteio']].concat(BJ.jeitosDe(mand.of)), v => { mand.jeito = v; pintar(); })),
      h('div', { class: 'campo' }, h('span', { text: 'Nível' }), seg('mand-nivel', mand.nivel, BJ.NIVEIS, v => { mand.nivel = v; pintar(); })),
      h('div', { class: 'campo' }, h('span', { text: 'Dano se falhar (no HP)' }), dano),
      h('div', { class: 'campo' }, h('span', { text: 'Recado' }), nota),
      h('button', { type: 'button', class: 'btn pri', id: 'mand-ok', text: 'Mandar', onclick: () => {
        const pc = mand.pc, P = Object.assign({}, pedidos(pc)), id = 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
        P[id] = { of: mand.of, jeito: mand.jeito, nivel: mand.nivel, dano: mand.dano.trim().slice(0, 30), nota: mand.nota.trim().slice(0, 200), t: Date.now(), e: 'novo' };
        salvarPedidos(pc, P); mand.nota = '';
        toast('Mandado para ' + nomePc(pc) + ': ' + BJ.nomeOficio(mand.of) + ' (' + NOMEN(mand.nivel) + ').');
        pintar();
      } }));
    // os pedidos mandados
    const lista = [];
    for (const p of ps) for (const [id, pd] of Object.entries(pedidos(p.id))) lista.push({ p, id, pd });
    lista.sort((a, b) => (b.pd.t || 0) - (a.pd.t || 0));
    if (lista.length) {
      add(out, h('h2', { text: 'Mandados', style: 'margin-top:20px' }));
      for (const { p, id, pd } of lista.slice(0, 40)) {
        const r = pd.res;
        add(out, h('div', { class: 'cartao', 'data-mandado': id }, h('div', { class: 'lin' }, h('b', { text: p.nome }), h('span', { text: '· ' + BJ.nomeOficio(pd.of) + (pd.jeito && pd.jeito !== 'sorteio' ? ' (' + BJ.nomeJeito(pd.jeito) + ')' : '') }), h('span', { class: 'tag', text: NOMEN(pd.nivel) }),
          pd.e === 'feito' && r ? h('span', { class: r.ok ? 'ok' : 'ruim', text: (r.ok ? 'deu certo' : 'não deu') + ' · nota ' + r.nota + '/100' + (r.dano ? ' · ' + r.dano : '') }) : h('span', { class: 'tag ' + (pd.e === 'jogando' ? 'vivo' : 'novo'), text: pd.e === 'jogando' ? 'jogando' : 'esperando' }),
          h('span', { class: 'grow' }),
          h('button', { type: 'button', class: 'btn sm', text: pd.e === 'feito' ? 'Tirar da lista' : 'Cancelar', onclick: () => { const P = Object.assign({}, pedidos(p.id)); delete P[id]; salvarPedidos(p.id, P); pintar(); } }))));
      }
    }
    return out;
  }
  function abaVivo() {
    const out = h('section', { class: 'secao' }, h('h2', { text: 'Ao vivo' }), h('p', { class: 'ajuda', text: 'Quem está jogando agora e os últimos resultados (com esta aba aberta).' }));
    if (!vivoApi()) add(out, h('p', { class: 'note', text: 'O ao vivo funciona numa mesa.' }));
    const agora = Date.now();
    for (const [k, v] of aoVivoAgora) if (agora - v.em > 15000) aoVivoAgora.delete(k);
    if (!aoVivoAgora.size) add(out, h('p', { class: 'vazio', id: 'vivo-ninguem', text: 'Ninguém jogando agora.' }));
    for (const [, v] of aoVivoAgora) {
      const m = v.msg;
      add(out, h('div', { class: 'cartao', 'data-vivo': m.pc }, h('div', { class: 'lin' }, h('span', { class: 'tag vivo', text: 'jogando' }), h('b', { text: m.nome }), h('span', { text: '· ' + BJ.nomeOficio(m.of) + ' · ' + BJ.nomeJeito(m.jeito) }), h('span', { class: 'tag', text: NOMEN(m.niv) })),
        h('p', { class: 'note', text: 'Passos ' + m.f + '/' + m.p + ' · erros ' + m.e + '/' + m.me + ' · ' + m.s + 's' + (m.tl ? ' de ' + m.tl + 's' : '') })));
    }
    if (resultados.length) {
      add(out, h('h2', { text: 'Terminaram', style: 'margin-top:18px' }));
      for (const { msg: m } of resultados) add(out, h('div', { class: 'cartao' }, h('div', { class: 'lin' }, h('b', { text: m.nome }), h('span', { text: '· ' + BJ.nomeJeito(m.jeito) + ' (' + NOMEN(m.niv) + ')' }), h('span', { class: m.ok ? 'ok' : 'ruim', text: (m.ok ? 'deu certo' : 'não deu') + ' · nota ' + m.nota + '/100' }))));
    }
    return out;
  }
  function abaRegras() {
    const c = cfg();
    const muda = fn => { const n = cfg(); fn(n); salvarCfg(n); pintar(); };
    return h('section', { class: 'secao' }, h('h2', { text: 'Regras da Bancada' }),
      h('div', { class: 'cartao' },
        h('label', { class: 'sw' }, h('input', { type: 'checkbox', id: 'reg-solto', checked: c.solto, onchange: e => muda(n => { n.solto = e.target.checked; }) }), 'Os jogadores podem abrir um minigame sozinhos'),
        h('p', { class: 'note', text: 'Desligado: eles só jogam o que você mandar (a aba Mandar).' })),
      h('div', { class: 'cartao' }, h('div', { class: 'campo' }, h('span', { text: 'Sozinhos, até o nível' }), seg('reg-max', BJ.NIVEIS[c.max][0], BJ.NIVEIS, v => muda(n => { n.max = BJ.nivDe(v); })))),
      h('div', { class: 'cartao' }, h('div', { class: 'campo' }, h('span', { text: 'O dano da falha, em cada nível (quando o jogador abre sozinho)' }),
        h('div', { class: 'regras-dano' }, BJ.NIVEIS.map(([k, n], i) => h('label', null, n, h('input', { class: 'in', id: 'reg-dano-' + k, value: c.dano[i], placeholder: 'vazio: não machuca', maxlength: 30, onchange: e => muda(x => { x.dano[i] = e.target.value.trim().slice(0, 30); }) }))))),
        h('p', { class: 'note', text: 'Uma expressão de dados, como 1d6 ou 2d10+3. Sai do HP da ficha de quem falhou. Quando você manda um pedido, vale o dano que você escreve nele.' })));
  }

  /* ---------------- jogar ---------------- */
  function comecar(ctx) {
    if (!ctx.pc && naMesa) { toast('Escolha quem faz.'); return; }
    const c = cfg();
    if (!mestre && !ctx.ped && (!c.solto || BJ.nivDe(ctx.nivel) > c.max)) { toast('O mestre não liberou este nível.'); return; }
    const jeitos = BJ.jeitosDe(ctx.of);
    ctx.jeito = BJ.jeitoValido(ctx.of, ctx.jeito) ? ctx.jeito : jeitos[Math.floor(Math.random() * jeitos.length)][0];
    if (ctx.ped) { const P = Object.assign({}, pedidos(ctx.pc)); if (P[ctx.ped]) { P[ctx.ped] = Object.assign({}, P[ctx.ped], { e: 'jogando', jeito: P[ctx.ped].jeito === 'sorteio' ? ctx.jeito : P[ctx.ped].jeito }); salvarPedidos(ctx.pc, P); } }
    const corpo = $('corpo'), area = h('div');
    const topo = h('div', { class: 'jogando-topo' }, h('b', { text: nomePc(ctx.pc) }), h('span', { class: 'note', text: ctx.ped ? 'pedido do mestre' : 'por conta própria' }), ctx.dano ? h('span', { class: 'note ruim', text: '· falhar machuca: ' + ctx.dano }) : null);
    const resEl = h('div', { class: 'resultado' });
    corpo.replaceChildren(topo, area, resEl);
    jogo = { ctx, ctrl: null };
    abas();
    const ctrl = BJ.iniciar(area, {
      oficio: ctx.of, jeito: ctx.jeito, nivel: ctx.nivel, seed: 1 + Math.floor(Math.random() * 2147483000), vel: DEBUG && window.__bancVel ? window.__bancVel : 1,
      aoPasso: est => transmitir(ctx, est),
      aoFim: res => terminar(ctx, res, resEl),
    });
    jogo.ctrl = ctrl;
    transmitir(ctx, ctrl.estado());
  }
  function terminar(ctx, res, resEl) {
    const dano = !res.ok && ctx.dano ? danoNaFicha(ctx.pc, ctx.dano) : '';
    const quem = nomePc(ctx.pc);
    const texto = quem + ' · ' + BJ.nomeOficio(ctx.of) + ', ' + BJ.nomeJeito(ctx.jeito) + ' (' + NOMEN(ctx.nivel) + '): ' + (res.ok ? 'deu certo' : res.desistiu ? 'desistiu' : 'não deu') + ', nota ' + res.nota + '/100'
      + ' · ' + res.erros + (res.erros === 1 ? ' erro' : ' erros') + ', ' + res.seg + 's' + (dano ? ' · ' + dano : '') + (ctx.ped ? ' (pedido do mestre)' : '') + '.';
    ultimoRes = { ctx, res, texto, dano };
    try { if (window.TC.ponte && naMesa) window.TC.ponte.publicar('acampamento', { titulo: 'Bancada · ' + quem, resumo: texto, pc: ctx.pc }); } catch (e) { /* a mesa ao vivo é opcional */ }
    if (ctx.ped) { const P = Object.assign({}, pedidos(ctx.pc)); if (P[ctx.ped]) { P[ctx.ped] = Object.assign({}, P[ctx.ped], { e: 'feito', res: { ok: res.ok, nota: res.nota, erros: res.erros, seg: res.seg, dano, t: Date.now() } }); salvarPedidos(ctx.pc, P); } }
    try { transmitir(ctx, jogo && jogo.ctrl ? jogo.ctrl.estado() : { feitos: 0, passos: 0, erros: res.erros, maxErros: 0, seg: res.seg, tempo: 0 }, res); } catch (e) { /* opcional */ }
    resEl.replaceChildren(h('div', { class: 'cartao', id: 'res' }, h('p', { class: res.ok ? 'ok' : 'ruim', text: texto }),
      h('div', { class: 'lin' }, h('button', { type: 'button', class: 'btn pri', id: 'res-voltar', text: 'Voltar', onclick: () => { jogo = null; pintar(); } }),
        !ctx.ped ? h('button', { type: 'button', class: 'btn', id: 'res-outra', text: 'Jogar de novo', onclick: () => { jogo = null; comecar(Object.assign({}, ctx, { jeito: esc.jeito })); } }) : null)));
  }

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
        D.aoMudar(l => {
          if (!l || typeof l.id !== 'string' || !l.id.startsWith('fichas:banc:')) return;
          if (!mestre && l.id.startsWith(PRE) && !jogo) { const n = meus().reduce((s, p) => s + pendentes(p.id).length, 0); if (n > (partida.nAntes || 0)) toast('O mestre mandou um minigame: veja a aba Pedidos.'); partida.nAntes = n; }
          if (!jogo) pintar(); else abas();
        });
        PC.aoMudar(() => { if (pronto && !jogo) pintar(); });
      }
      TCx.ponte.aoMudar(e => { st = e; if (naMesa) mestre = TCx.ponte.mestra ? TCx.ponte.mestra('fichas') : st.papel === 'mestre'; if (pronto && !jogo) pintar(); });
    }
    if (!naMesa && /[?&]jogador\b/.test(location.search)) { mestre = false; eu = 'local'; }
    pronto = true;
    if (naMesa) { ligarCanal(); partida.nAntes = mestre ? 0 : meus().reduce((s, p) => s + pendentes(p.id).length, 0); }
    if (!mestre && partida.nAntes) aba = 'pedidos';
    pintar();
    setInterval(() => { if (aba === 'vivo' && !jogo && mestre) pintar(); }, 3000);
  }
  if (DEBUG) window.__banc = { cfg, pedidos, salvarPedidos, personagens, meus, comecar, get jogo() { return jogo; }, get ultimoRes() { return ultimoRes; }, get mestre() { return mestre; }, set mestre(v) { mestre = v; }, pintar, aoVivoAgora, resultados, danoNaFicha };
  partida().catch(e => {
    console.error(e);
    $('corpo').replaceChildren(h('div', { class: 'vazio' }, h('strong', { text: 'Não deu para abrir a Bancada. ' }), (e && e.message) || ''));
  });
})();
