/* ---------------------------------------------------------------
   10j. O CONTROLE DO MESTRE (lote 47) — a vez, as rodadas e os momentos da cena, nas mãos de quem mestra.
     · a vez: "Atrasar a vez…" (joga depois de quem o mestre escolher, e fica nesse lugar), "Pular a vez" (com o motivo
       na mesa ao vivo; na vez de quem está Atordoado, Paralisado… o aviso oferece pular) e "Entrar no combate" (o token
       rola e entra no lugar que a iniciativa dá, sem bagunçar a ordem);
     · a rodada de surpresa: quem foi surpreendido não joga na 1ª rodada (07-app: turnStep pula a vez dele);
     · os lembretes por rodada (sc.lembretes, só do mestre): "Rodada 3: reforços chegam". Quando a rodada chega, uma
       janela mostra o lembrete; "Fazer" revela os tokens escolhidos (que entram na ordem) e manda o texto à mesa, se ele
       pediu. Podem repetir a cada N rodadas;
     · os momentos preparados (sc.momentos, só do mestre): tokens que aparecem, a hora do dia, luzes que acendem ou
       apagam, a névoa, um som para todos (sc.momSom: cada aparelho toca o seu), zonas escondidas que aparecem e a
       narração à mesa. "Soltar" faz tudo num passo, com Desfazer.
   Nada acontece sozinho: tudo passa por um clique do mestre.
   --------------------------------------------------------------- */
const Mestre = (() => {
  const K = UI.kit;
  const toast = (t, o) => UI.toast(t, o);
  const PERDE_VEZ = ['atordoado', 'paralisia', 'inconsciente', 'petrificado', 'adormecido'];

  /* ---------------- a mesa ao vivo ---------------- */
  // uma linha do mestre na mesa ao vivo (o aviso das Cenas); fora de uma mesa, só o aviso na tela
  function mesa(titulo, resumo) {
    const T = window.TC && window.TC.ponte;
    if (T && T.estado && T.estado.mesa && typeof T.publicar === 'function') {
      try { T.publicar('cena', { kind: 'aviso', titulo: String(titulo).slice(0, 120), resumo: String(resumo || '').slice(0, 600) }); return true; } catch (e) { /* sem a casca */ }
    }
    return false;
  }
  // a entrada é escondida dos jogadores? (a linha invisível, ou só tokens ocultos)
  const escondida = e => !!e.inv || (e.token ? !!((Store.get('tokens', e.token) || {}).hidden) : false);

  /* ---------------- a vez ---------------- */
  const vezDe = tn => (tn.on ? tn.list.find(e => e.id === tn.cur) : null) || null;
  // as condições que fazem perder a vez, nos tokens da entrada: [{ t, c }]
  function travados(e) {
    const out = [];
    for (const t of turnToks(e)) for (const id of t.conds) if (PERDE_VEZ.includes(id) && COND_BY_ID[id]) out.push({ t, c: COND_BY_ID[id] });
    return out;
  }
  const motivoDe = e => { const tr = travados(e); return tr.length ? [...new Set(tr.map(x => x.c.n))].join(', ') : ''; };

  function pular(motivo) {
    const tn = Store.scene().turn, e = vezDe(tn);
    if (!e) return false;
    const nome = turnName(e), m = motivo == null ? motivoDe(e) : motivo;
    UI.passarTurno(1);
    const txt = `${nome} perdeu a vez${m ? ' (' + m + ')' : ''}.`;
    if (!escondida(e)) mesa(txt, '');
    toast(txt, { key: 'pular-vez', action: 'Desfazer', run: Tools.undo });
    return true;
  }
  function atrasarBox() {
    const tn = Store.scene().turn, e = vezDe(tn);
    if (!e) return;
    const i = tn.list.indexOf(e), depois = tn.list.slice(i + 1);
    const nome = turnName(e);
    if (!depois.length) { toast(`${nome} é o último da rodada: não há depois de quem jogar.`); return; }
    const escolher = alvo => {
      const r = Act.turnAtrasar(alvo.id);
      if (!r) return;
      UI.closeModal();
      const txt = `${r.quem} atrasou a vez: joga depois de ${r.depois}.`;
      if (!escondida(e)) mesa(txt, '');
      toast(txt, { key: 'atrasar-vez', action: 'Desfazer', run: Tools.undo });
    };
    UI.modal({ title: `Atrasar a vez de ${nome}`, body: h('div', { id: 'atrasar-tela' },
      K.note('Escolha depois de quem ele joga. Ele fica nesse lugar nas próximas rodadas também.'),
      h('ul', { class: 'mt-lista' }, depois.map(x => h('li', null, h('button', { type: 'button', class: 'mt-op', id: 'atr-' + x.id, onclick: () => escolher(x) },
        h('span', { text: 'Depois de ' + turnName(x) }), x.init != null ? h('span', { class: 'mt-op-n', text: fmt(x.init) }) : null))))),
      actions: [{ label: 'Cancelar' }] });
  }
  function surpresaBox() {
    const tn = Store.scene().turn;
    if (!tn.list.length) return;
    const marc = new Set(tn.list.filter(e => e.sur).map(e => e.id));
    const lista = h('ul', { class: 'mt-lista' }, tn.list.map(e => h('li', null, h('label', { class: 'mt-ck' },
      h('input', { type: 'checkbox', id: 'sur-' + e.id, checked: marc.has(e.id), onchange: ev => { if (ev.target.checked) marc.add(e.id); else marc.delete(e.id); } }),
      h('span', { text: turnName(e) })))));
    UI.modal({ title: 'Rodada de surpresa', body: h('div', { id: 'surpresa-tela' },
      K.note('Marque quem foi surpreendido: na 1ª rodada a vez passa por cima deles. Da 2ª em diante, todos jogam.'), lista),
      actions: [{ label: 'Cancelar' }, { label: 'Confirmar', kind: 'primary', run: () => {
        Act.turnSurpresa([...marc]);
        toast(marc.size ? `${marc.size === 1 ? '1 surpreendido' : marc.size + ' surpreendidos'}: não jogam na 1ª rodada.` : 'Ninguém surpreendido.', { action: 'Desfazer', run: Tools.undo });
      } }] });
  }
  function entrar(toks) {
    const r = Act.turnEntrar(toks);
    if (!r.length) { toast(toks.length === 1 ? 'Ele já está na ordem.' : 'Já estão todos na ordem.'); return; }
    const ja = r.filter(x => x.jaNesta), prox = r.filter(x => !x.jaNesta);
    const parte = (l, s) => l.map(x => `${x.nome} (${x.total})`).join(', ') + s;
    toast('Entrou no combate: ' + [ja.length ? parte(ja, ja.length === 1 ? ', joga nesta rodada' : ', jogam nesta rodada') : '', prox.length ? parte(prox, ', a partir da rodada que vem') : ''].filter(Boolean).join('; ') + '.',
      { long: true, action: 'Desfazer', run: Tools.undo });
  }
  // os botões da vez, no alto da aba Turnos (só o mestre, com o combate rodando)
  function botoesDaVez() {
    const tn = Store.scene().turn, e = vezDe(tn);
    if (!isGM() || !e) return null;
    const m = motivoDe(e);
    return h('div', { class: 'row tight mt-vez', id: 'mt-vez' },
      K.btn('Atrasar a vez…', atrasarBox, { icon: 'clock', kind: 'small', id: 'turnAtrasar', title: 'Quem está jogando passa a jogar depois de outro, e fica nesse lugar' }),
      K.btn('Pular a vez', () => pular(), { icon: 'next', kind: 'small', id: 'turnPular', title: m ? `Pula a vez (${m}); a mesa ao vivo fica sabendo` : 'Pula a vez de quem está jogando; a mesa ao vivo fica sabendo' }));
  }
  // os botões de baixo: entrar no combate (os selecionados) e a rodada de surpresa
  function botoesDoCombate(selToks) {
    const tn = Store.scene().turn;
    if (!isGM() || !tn.list.length) return null;
    const fora = selToks.filter(t => !inTurn(tn, t.id));
    return h('div', { class: 'row' },
      tn.on ? K.btn(fora.length ? `Entrar no combate (${fora.length})` : 'Entrar no combate', () => entrar(fora), { icon: 'plus', id: 'turnEntrar', disabled: !fora.length, title: 'Os tokens selecionados rolam a iniciativa e entram no lugar que ela dá, sem reordenar quem já está' }) : null,
      !tn.on || (tn.round || 1) === 1 ? K.btn('Rodada de surpresa…', surpresaBox, { icon: 'eyeOff', id: 'turnSurpresa', title: 'Quem foi surpreendido não joga na 1ª rodada' }) : null);
  }
  // depois de a vez passar (no aparelho do mestre): na vez de quem está travado, o aviso oferece pular
  function depoisDaVez() {
    const e = vezDe(Store.scene().turn);
    if (!e) return;
    const m = motivoDe(e);
    // (o aviso só vale enquanto a vez for dele: depois, o "Pular" não pula outra pessoa)
    if (m) toast(`Pular a vez de ${turnName(e)} (${m})?`, { key: 'pular-vez', long: true, action: 'Pular', run: () => {
      const agora = vezDe(Store.scene().turn);
      if (!agora || agora.id !== e.id) { toast(`A vez de ${turnName(e)} já passou.`, { key: 'pular-vez' }); return; }
      pular(m);
    } });
  }

  /* ---------------- os lembretes por rodada ---------------- */
  const lembretes = () => Store.scene().lembretes || [];
  const vale = (l, r) => r === l.r || (l.cada > 0 && r > l.r && (r - l.r) % l.cada === 0);
  const ocultos = () => Store.scene().tokens.filter(t => t.hidden && !t.prop);
  const textoQuando = l => `Rodada ${l.r}${l.cada > 0 ? `, depois a cada ${l.cada === 1 ? 'rodada' : l.cada + ' rodadas'}` : ''}`;
  function gravarLembretes(lista, rot) { Store.tx(rot, () => Store.scn({ lembretes: lista.length ? lista : undefined })); }
  function lembreteBox(l0) {
    const sc = Store.scene(), novo = !l0;
    const l = Object.assign({ txt: '', r: Math.max(1, (sc.turn.round || 1) + (sc.turn.on ? 1 : 0)), cada: 0, mesa: false, toks: [] }, l0 ? JSON.parse(JSON.stringify(l0)) : {});
    const marc = new Set(l.toks || []);
    const txt = h('textarea', { class: 'in', id: 'lb-txt', rows: 2, maxlength: 200, placeholder: 'Reforços chegam pela porta norte', text: l.txt });
    const r = h('input', { type: 'number', class: 'in num', id: 'lb-r', min: 1, max: 999, value: l.r, 'aria-label': 'Rodada' });
    const cada = h('input', { type: 'number', class: 'in num', id: 'lb-cada', min: 0, max: 99, value: l.cada || '', placeholder: '–', 'aria-label': 'Repetir a cada N rodadas' });
    let naMesa = !!l.mesa;
    const toks = ocultos();
    UI.modal({ title: novo ? 'Novo lembrete' : 'Mudar o lembrete', body: h('div', { class: 'stack', id: 'lembrete-tela' },
      K.field('O que lembrar', txt, 'stack'),
      h('div', { class: 'row mt-row' }, K.field('Na rodada', r, 'stack'), K.field('Repetir a cada', cada, 'stack'), h('span', { class: 'note', text: 'rodadas (vazio: uma vez só)' })),
      K.toggle('lb-mesa', naMesa, v => { naMesa = v; }, 'Mostrar o texto à mesa'),
      toks.length ? K.field('Tokens que aparecem (ocultos agora)', h('ul', { class: 'mt-lista' }, toks.map(t => h('li', null, h('label', { class: 'mt-ck' },
        h('input', { type: 'checkbox', id: 'lb-t-' + t.id, checked: marc.has(t.id), onchange: ev => { if (ev.target.checked) marc.add(t.id); else marc.delete(t.id); } }),
        K.tokenAvatar(t, 20), h('span', { text: t.name }))))), 'stack')
        : K.note('Para um lembrete trazer tokens à vista, deixe-os ocultos no mapa antes.'),
      K.note('Na rodada certa, uma janela mostra o lembrete só para você; nada acontece sem o seu clique.')),
      actions: [{ label: 'Cancelar' }, { label: novo ? 'Criar' : 'Salvar', kind: 'primary', run: () => {
        const c = cleanLembrete({ id: l.id, txt: txt.value, r: r.value, cada: cada.value, mesa: naMesa, toks: [...marc] });
        if (!c) { toast('Escreva o que lembrar.'); return false; }
        const lista = lembretes().slice(), k = lista.findIndex(x => x.id === c.id);
        if (k >= 0) lista[k] = c; else lista.push(c);
        gravarLembretes(lista, novo ? 'Novo lembrete' : 'Mudar o lembrete');
        toast(novo ? `Lembrete criado: ${textoQuando(c).toLowerCase()}.` : 'Lembrete salvo.', { action: 'Desfazer', run: Tools.undo });
      } }] });
  }
  function revelar(ids) {
    const sc = Store.scene(), toks = ids.map(id => Store.get('tokens', id)).filter(t => t && t.hidden);
    if (!toks.length) return [];
    Store.tx('Revelar tokens', () => {
      for (const t of toks) Store.upd('tokens', t.id, { hidden: false });
      if (sc.turn.on) Act.turnEntrar(toks.map(t => Store.get('tokens', t.id)));      // (no mesmo passo de desfazer)
    });
    return toks;
  }
  function fazerLembrete(l) {
    const vistos = l.toks ? revelar(l.toks) : [];
    if (l.mesa) mesa(l.txt, '');
    return vistos.length;
  }
  // a rodada chegou (no aparelho do mestre, depois de passar a vez): os lembretes dela
  function naRodada(r) {
    const devidos = lembretes().filter(l => vale(l, r));
    if (!devidos.length) return;
    if (typeof Som !== 'undefined' && Som.aviso) Som.aviso('zona');
    // (outra janela aberta, como a tela das barrinhas: o aviso espera um clique, sem fechá-la)
    if (UI.modalOpen()) { toast(`Rodada ${r}: ${devidos.length === 1 ? '1 lembrete' : devidos.length + ' lembretes'}.`, { key: 'lembretes', long: true, action: 'Ver', run: () => naRodada(r) }); return; }
    const acao = l => !!((l.toks && l.toks.length) || l.mesa);
    UI.modal({ title: `Rodada ${r}: ${devidos.length === 1 ? 'lembrete' : devidos.length + ' lembretes'}`, body: h('div', { id: 'lembrete-aviso' },
      h('ul', { class: 'mt-lista' }, devidos.map(l => h('li', { class: 'mt-lb' }, h('b', { text: l.txt }),
        h('span', { class: 'note', text: [l.toks && l.toks.length ? `${l.toks.length === 1 ? '1 token aparece' : l.toks.length + ' tokens aparecem'}` : '', l.mesa ? 'o texto vai à mesa' : ''].filter(Boolean).join(' e ') || 'só um lembrete' }))))),
      actions: [{ label: devidos.some(acao) ? 'Agora não' : 'Ok', kind: devidos.some(acao) ? 'ghost' : 'primary' },
        devidos.some(acao) ? { label: 'Fazer', kind: 'primary', run: () => {
          let n = 0;
          for (const l of devidos) n += fazerLembrete(l);
          toast(n ? `${n === 1 ? '1 token apareceu' : n + ' tokens apareceram'}${Store.scene().turn.on ? ' e entraram no combate' : ''}.` : 'Feito.', { action: n ? 'Desfazer' : null, run: n ? Tools.undo : null });
        } } : null] });
  }
  function secaoLembretes() {
    if (!isGM()) return null;
    const lista = lembretes(), r = Store.scene().turn.round || 1;
    return K.sec('t-lembretes', 'Lembretes por rodada', lista.length > 0,
      lista.length ? h('ul', { class: 'mt-lista', id: 'lb-lista' }, lista.map(l => h('li', { class: 'mt-lb-li', id: 'lb-' + l.id },
        h('div', { class: 'mt-lb-t' }, h('b', { text: l.txt }), h('span', { class: 'note', text: textoQuando(l) + (l.toks && l.toks.length ? ` · ${l.toks.length} aparece${l.toks.length > 1 ? 'm' : ''}` : '') + (l.mesa ? ' · vai à mesa' : '') })),
        K.iconBtn('edit', 'Mudar o lembrete', () => lembreteBox(l), { size: 14, id: 'lb-ed-' + l.id }),
        K.iconBtn('trash', 'Apagar o lembrete', () => { gravarLembretes(lembretes().filter(x => x.id !== l.id), 'Apagar lembrete'); toast('Lembrete apagado.', { action: 'Desfazer', run: Tools.undo }); }, { size: 14, id: 'lb-x-' + l.id }))))
        : K.note('Nenhum lembrete. Ex.: “Rodada 3: reforços chegam”, “a cada 2 rodadas: o vulcão cospe fogo”.'),
      h('div', { class: 'row' }, K.btn('Novo lembrete…', () => lembreteBox(null), { icon: 'plus', id: 'lb-novo' }),
        lista.some(l => vale(l, r)) ? K.btn('Ver os desta rodada', () => naRodada(r), { id: 'lb-agora' }) : null));
  }

  /* ---------------- os momentos preparados ---------------- */
  const momentos = () => Store.scene().momentos || [];
  function gravarMomentos(lista, rot) { Store.tx(rot, () => Store.scn({ momentos: lista.length ? lista : undefined })); }
  function resumoMomento(m) {
    const p = [];
    if (m.toks) p.push(`${m.toks.length} ${m.toks.length === 1 ? 'token aparece' : 'tokens aparecem'}`);
    if (m.tone) p.push((TONES.find(x => x.id === m.tone) || {}).n.toLowerCase());
    if (m.luzes) { const on = Object.values(m.luzes).filter(Boolean).length, off = Object.keys(m.luzes).length - on; if (on) p.push(`acende ${on} luz${on > 1 ? 'es' : ''}`); if (off) p.push(`apaga ${off} luz${off > 1 ? 'es' : ''}`); }
    if (m.nevoa) p.push(m.nevoa === 'revelar' ? 'revela a névoa' : 'cobre com névoa');
    if (m.som) p.push('som: ' + (SONS_MOMENTO.find(x => x.id === m.som) || {}).n.toLowerCase());
    if (m.zonas) p.push(`${m.zonas.length} zona${m.zonas.length > 1 ? 's' : ''}`);
    if (m.txt) p.push('narração');
    return p.join(' · ') || 'nada ainda';
  }
  function momentoBox(m0) {
    const sc = Store.scene(), novo = !m0;
    const m = Object.assign({ nome: '', toks: [], luzes: {}, zonas: [] }, m0 ? JSON.parse(JSON.stringify(m0)) : {});
    const toks = new Set(m.toks || []), zonas = new Set(m.zonas || []), luzes = Object.assign({}, m.luzes || {});
    let tone = m.tone || '', nevoa = m.nevoa || '', som = m.som || '';
    const nome = h('input', { type: 'text', class: 'in', id: 'mo-nome', maxlength: 60, value: m.nome, placeholder: 'A emboscada', autocomplete: 'off' });
    const txt = h('textarea', { class: 'in', id: 'mo-txt', rows: 2, maxlength: 300, placeholder: 'O chão treme e as tochas se apagam…', text: m.txt || '' });
    const ck = (id, on, fn, kids) => h('li', null, h('label', { class: 'mt-ck' }, h('input', { type: 'checkbox', id, checked: on, onchange: ev => fn(ev.target.checked) }), ...kids));
    const ocs = sc.tokens.filter(t => (t.hidden || toks.has(t.id)) && !t.prop);
    const zs = sc.effects.filter(e => e.gm || zonas.has(e.id));
    const sel = (id, v, ops, fn) => K.inSelect(id, v, ops, fn);
    UI.modal({ title: novo ? 'Novo momento' : 'Mudar o momento', wide: true, body: h('div', { class: 'stack', id: 'momento-tela' },
      K.field('Nome', nome, 'stack'),
      K.field('Tokens que aparecem', ocs.length ? h('ul', { class: 'mt-lista mt-cols' }, ocs.map(t => ck('mo-t-' + t.id, toks.has(t.id), v => { if (v) toks.add(t.id); else toks.delete(t.id); }, [K.tokenAvatar(t, 20), h('span', { text: t.name })])))
        : K.note('Deixe os tokens ocultos no mapa para que eles apareçam no momento.'), 'stack'),
      h('div', { class: 'row' },
        K.field('Hora do dia', sel('mo-tone', tone, [['', 'Como estiver']].concat(TONES.map(x => [x.id, x.n])), v => { tone = v; }), 'stack'),
        K.field('Névoa', sel('mo-nevoa', nevoa, [['', 'Como estiver'], ['revelar', 'Revelar tudo'], ['esconder', 'Cobrir tudo']], v => { nevoa = v; }), 'stack'),
        K.field('Som para todos', sel('mo-som', som, [['', 'Nenhum']].concat(SONS_MOMENTO.map(x => [x.id, x.n])), v => { som = v; }), 'stack')),
      sc.lights.length ? K.field('Luzes', h('ul', { class: 'mt-lista mt-cols' }, sc.lights.map(l => h('li', { class: 'mt-luz' }, h('span', { text: l.name || 'Luz' }),
        sel('mo-l-' + l.id, luzes[l.id] === true ? 'on' : luzes[l.id] === false ? 'off' : '', [['', 'Como estiver'], ['on', 'Acender'], ['off', 'Apagar']], v => { if (v === 'on') luzes[l.id] = true; else if (v === 'off') luzes[l.id] = false; else delete luzes[l.id]; })))), 'stack') : null,
      zs.length ? K.field('Zonas que aparecem (escondidas agora)', h('ul', { class: 'mt-lista mt-cols' }, zs.map(e => ck('mo-z-' + e.id, zonas.has(e.id), v => { if (v) zonas.add(e.id); else zonas.delete(e.id); }, [h('span', { text: (FX.P[e.fx] || FX.P.fogo).n })]))), 'stack') : null,
      K.field('Narração à mesa', txt, 'stack'),
      K.note('“Soltar” faz tudo de uma vez, com Desfazer. O som toca em quem estiver com o som da mesa ligado.')),
      actions: [{ label: 'Cancelar' }, { label: novo ? 'Criar' : 'Salvar', kind: 'primary', run: () => {
        const c = cleanMomento({ id: m.id, nome: nome.value, toks: [...toks], tone, luzes, nevoa, som, zonas: [...zonas], txt: txt.value });
        const lista = momentos().slice(), k = lista.findIndex(x => x.id === c.id);
        if (k >= 0) lista[k] = c; else lista.push(c);
        gravarMomentos(lista, novo ? 'Novo momento' : 'Mudar o momento');
        toast(novo ? `Momento “${c.nome}” pronto: ${resumoMomento(c)}.` : 'Momento salvo.', { action: 'Desfazer', run: Tools.undo });
      } }] });
  }
  function soltar(m) {
    const sc = Store.scene();
    const toks = (m.toks || []).map(id => Store.get('tokens', id)).filter(t => t && t.hidden);
    Store.tx('Soltar: ' + m.nome, () => {
      for (const t of toks) Store.upd('tokens', t.id, { hidden: false });
      const p = {};
      if (m.tone && m.tone !== sc.tone) { p.tone = m.tone; p.light = TONES.find(x => x.id === m.tone).light; }
      if (m.som) p.momSom = { k: m.som, n: ((sc.momSom && sc.momSom.n) || 0) + 1 };
      if (Object.keys(p).length) Store.scn(p);
      for (const l of sc.lights.slice()) if (m.luzes && typeof m.luzes[l.id] === 'boolean' && !!l.on !== m.luzes[l.id]) Store.upd('lights', l.id, { on: m.luzes[l.id] });
      for (const e of sc.effects.slice()) if (m.zonas && m.zonas.includes(e.id) && e.gm) Store.upd('effects', e.id, { gm: false });
      if (m.nevoa) { for (const op of sc.fogOps.slice()) Store.del('fogOps', op.id); Store.add('fogOps', { id: uid('fg'), m: m.nevoa === 'revelar' ? 'r' : 'h', k: 'all' }); }
      if (toks.length && Store.scene().turn.on) Act.turnEntrar(toks.map(t => Store.get('tokens', t.id)));      // (no mesmo passo de desfazer)
    });
    if (m.som) tocarMomento(m.som);
    if (m.txt) mesa(m.txt, '');
    toast(`Momento “${m.nome}”: ${resumoMomento(m)}.`, { key: 'momento', long: true, action: 'Desfazer', run: Tools.undo });
  }
  function secaoMomentos() {
    if (!isGM()) return null;
    const lista = momentos();
    return K.secR('c-momentos', 'Momentos preparados', lista.length > 0, lista.length ? `${lista.length} pronto${lista.length > 1 ? 's' : ''}` : '',
      lista.length ? h('ul', { class: 'mt-lista', id: 'mo-lista' }, lista.map(m => h('li', { class: 'mt-mo', id: 'mo-' + m.id },
        h('div', { class: 'mt-lb-t' }, h('b', { text: m.nome }), h('span', { class: 'note', text: resumoMomento(m) })),
        K.btn('Soltar', () => soltar(m), { kind: 'primary small', icon: 'play', id: 'mo-soltar-' + m.id }),
        K.iconBtn('edit', 'Mudar o momento', () => momentoBox(m), { size: 14, id: 'mo-ed-' + m.id }),
        K.iconBtn('trash', 'Apagar o momento', () => { gravarMomentos(momentos().filter(x => x.id !== m.id), 'Apagar momento'); toast('Momento apagado.', { action: 'Desfazer', run: Tools.undo }); }, { size: 14, id: 'mo-x-' + m.id }))))
        : K.note('Prepare antes da sessão o que vai acontecer de uma vez: tokens que aparecem, a luz, a névoa, um som e a narração.'),
      h('div', { class: 'row' }, K.btn('Novo momento…', () => momentoBox(null), { icon: 'plus', id: 'mo-novo' })));
  }

  /* ---------------- o som do momento, em todos os aparelhos ---------------- */
  let somVisto = null;                                       // "cena:n" do último som já tocado (ou visto ao chegar)
  function tocarMomento(k) { if (typeof Som !== 'undefined' && Som.momento) Som.momento(k); }
  function vigiar() {
    const sc = Store.scene();
    if (!sc) return;
    const chave = sc.momSom ? sc.id + ':' + sc.momSom.n : sc.id + ':0';
    if (somVisto === null || somVisto.split(':')[0] !== sc.id) { somVisto = chave; return; }      // (ao chegar na cena, não toca o que já passou)
    if (chave === somVisto) return;
    somVisto = chave;
    if (sc.momSom && !isGM()) tocarMomento(sc.momSom.k);     // (o mestre já tocou ao soltar)
  }
  function marcarSomVisto() { const sc = Store.scene(); if (sc) somVisto = sc.momSom ? sc.id + ':' + sc.momSom.n : sc.id + ':0'; }

  /* ---------------- o grupo Mestre na barra da esquerda ----------------
     Quatro botões (só o mestre): a vez, os momentos, os lembretes e a cura. Cada um abre um painel pequeno ao lado da
     barra, sem trocar de aba; um clique fora ou o Esc fecha. */
  let aberto = null;
  const GRUPO = [['vez', 'turns', 'Controle da vez'], ['momentos', 'play', 'Momentos preparados'], ['lembretes', 'clock', 'Lembretes por rodada'], ['cura', 'heart', 'Cura e energias']];
  const fecharPainel = () => { if (!aberto) return; aberto = null; UI.refresh(); };
  // um botão do painel: fecha o painel e faz
  const acao = (rot, fn, o) => K.btn(rot, () => { aberto = null; UI.refresh(); fn(); }, Object.assign({ kind: 'small' }, o || {}));
  const linha = (...kids) => h('div', { class: 'mt-pop-l' }, ...kids);
  const selTokens = () => selOf('tokens').filter(t => !t.prop);
  function painelVez() {
    const tn = Store.scene().turn, e = vezDe(tn), sel = selTokens(), fora = sel.filter(t => !inTurn(tn, t.id));
    if (!tn.list.length) return [K.note('Ninguém na ordem ainda.'), linha(acao('Abrir a aba Turnos', () => UI.openTab('turn'), { icon: 'turns', id: 'mtp-aba' }))];
    return [
      h('p', { class: 'mt-pop-s', id: 'mtp-vez-txt', text: tn.on ? `Rodada ${tn.round || 1}${e ? ' · vez de ' + turnName(e) : ''}` : 'Combate parado' }),
      linha(K.btn(tn.on ? 'Próximo turno' : 'Iniciar o combate', () => UI.passarTurno(1), { kind: 'primary small', icon: 'next', id: 'mtp-prox' })),
      e ? linha(acao('Atrasar a vez…', atrasarBox, { icon: 'clock', id: 'mtp-atrasar' }), K.btn('Pular a vez', () => pular(), { kind: 'small', id: 'mtp-pular' })) : null,
      tn.on ? linha(acao(fora.length ? `Entrar no combate (${fora.length})` : 'Entrar no combate', () => entrar(fora), { icon: 'plus', id: 'mtp-entrar', disabled: !fora.length, title: 'Os tokens selecionados rolam e entram no lugar que a iniciativa dá' })) : null,
      !tn.on || (tn.round || 1) === 1 ? linha(acao('Rodada de surpresa…', surpresaBox, { icon: 'eyeOff', id: 'mtp-surpresa' })) : null,
      linha(acao('Abrir a aba Turnos', () => UI.openTab('turn'), { kind: 'small ghost', id: 'mtp-aba' })),
    ];
  }
  function painelMomentos() {
    const lista = momentos();
    return [
      lista.length ? h('ul', { class: 'mt-lista' }, lista.map(m => h('li', { class: 'mt-mo' }, h('div', { class: 'mt-lb-t' }, h('b', { text: m.nome }), h('span', { class: 'note', text: resumoMomento(m) })),
        acao('Soltar', () => soltar(m), { kind: 'primary small', icon: 'play', id: 'mtp-soltar-' + m.id }))))
        : K.note('Nenhum momento preparado nesta cena.'),
      linha(acao('Novo momento…', () => momentoBox(null), { icon: 'plus', id: 'mtp-mo-novo' })),
    ];
  }
  function painelLembretes() {
    const lista = lembretes(), r = Store.scene().turn.round || 1;
    return [
      lista.length ? h('ul', { class: 'mt-lista' }, lista.map(l => h('li', { class: 'mt-lb-li' }, h('div', { class: 'mt-lb-t' }, h('b', { text: l.txt }), h('span', { class: 'note', text: textoQuando(l) })),
        K.iconBtn('edit', 'Mudar o lembrete', () => { aberto = null; UI.refresh(); lembreteBox(l); }, { size: 14, id: 'mtp-lb-' + l.id }))))
        : K.note('Nenhum lembrete nesta cena.'),
      linha(acao('Novo lembrete…', () => lembreteBox(null), { icon: 'plus', id: 'mtp-lb-novo' }),
        lista.some(l => vale(l, r)) ? acao('Ver os desta rodada', () => naRodada(r), { id: 'mtp-lb-agora' }) : null),
    ];
  }
  function painelCura() {
    const X = UI.mestreKit, sel = selTokens(), sc = Store.scene();
    return [
      linha(acao(sel.length ? `Cura total (${sel.length})` : 'Cura total', () => X.healToast(sel), { icon: 'heart', id: 'mtp-cura', disabled: !sel.length, title: sel.length ? 'Enche as barras dos selecionados (as trancadas ficam)' : 'Selecione os tokens no mapa' })),
      linha(acao('Restaurar energias…', X.janelaRestaurar, { icon: 'rest', id: 'mtp-restaurar', title: 'Com tokens selecionados, só eles; sem seleção, todos da cena. Mostra antes o que muda.' })),
      sc.turn.list.length ? linha(acao('Tela das barrinhas', () => X.telaBarrinhas('Barrinhas', X.tokensDoCombate(sc)), { icon: 'sliders', id: 'mtp-barrinhas' })) : null,
      K.note(sel.length ? '' : 'A cura vale para os tokens selecionados no mapa.'),
    ];
  }
  const PAINEIS = { vez: painelVez, momentos: painelMomentos, lembretes: painelLembretes, cura: painelCura };
  function grupoDaBarra() {
    if (!isGM()) return [];
    const out = [h('span', { class: 'rail-sep' }), h('span', { class: 'rail-g', text: 'Mestre', 'aria-hidden': 'true' })];
    for (const [id, ic, nome] of GRUPO) {
      const on = aberto === id;
      out.push(h('div', { class: 'rail-junto mt-rail' },
        h('button', { type: 'button', class: 'tool' + (on ? ' on' : ''), id: 'mt-rail-' + id, title: nome, 'aria-label': nome, 'aria-expanded': String(on), onclick: () => { aberto = on ? null : id; UI.refresh(); } }, icon(ic, 20)),
        on ? h('div', { class: 'rail-lista mt-pop', role: 'dialog', 'aria-label': nome, id: 'mt-pop-' + id }, h('span', { class: 'rail-lista-t', text: nome }), ...PAINEIS[id]().filter(Boolean)) : null));
    }
    return out;
  }
  // um clique fora do painel (ou o Esc) fecha
  document.addEventListener('pointerdown', ev => { if (aberto && !ev.target.closest('.mt-rail') && !ev.target.closest('.modal, .scrim, .toast')) fecharPainel(); }, true);
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && aberto && !UI.modalOpen()) fecharPainel(); });

  return { grupoDaBarra, fecharPainel, painelAberto: () => aberto, botoesDaVez, botoesDoCombate, depoisDaVez, pular, atrasarBox, surpresaBox, entrar, naRodada, secaoLembretes, lembreteBox, secaoMomentos, momentoBox, soltar, vigiar, marcarSomVisto, mesa, PERDE_VEZ };
})();
