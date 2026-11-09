/* Tiny Cats · Mapa-múndi · as luas (lote 126).
   · O canto das luas (em cima do zoom, no mapa): um desenho pequeno de cada lua, com a fase de hoje (crescendo e
     minguando). Todos veem. Um clique abre o cartão: o nome, a fase, quanto está iluminada e se está no céu esta noite.
     Quem mestra vê também a chance e quando ela volta, e tem "Fazer subir esta noite" e "Editar as luas".
   · A janela "As luas": uma lua por cartão, com campos grandes e poucos — o nome, a cor, se tem fases (o ciclo em dias,
     em que fase está hoje e o nome das quatro fases), a chance de estar no céu numa noite e se ela traz horda.
   · A horda: quando o dia passa e uma lua que traz horda sobe, quem mestra é avisado e o mapa ganha um evento "Horda de
     monstros" escondido dos jogadores, no meio do mapa (o mestre arrasta, aumenta ou mostra). Um passo de desfazer, junto
     com a passagem do dia.
   A conta das luas é do núcleo (MundoNucleo.luasDoDia, faseDaLua, luaNoCeu, hordasEntre); o mapa muda só por App.mudar. */
(() => {
  'use strict';
  const N = () => window.MundoNucleo;
  const kit = () => window.MundoPainel && window.MundoPainel.kit;
  const app = () => (kit() ? kit().app() : null);
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  let aberto = false, caixa = null, cartao = null, ultimo = '';

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el[k] = v;
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);

  /* O desenho de uma lua: o disco escuro e a parte acesa pela fase (a curva do terminador é uma elipse). A lua sem
     fases é o disco inteiro; a lua do olho (horda) ganha o olho. Fora do céu: só o contorno tracejado. */
  function desenho(l, tam) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '-12 -12 24 24'); s.setAttribute('width', tam); s.setAttribute('height', tam); s.setAttribute('aria-hidden', 'true');
    s.classList.add('lua-svg');
    const r = 10, cor = l.cor || '#ddd';
    if (!l.ceu) {
      s.innerHTML = '<circle r="' + r + '" fill="none" stroke="' + cor + '" stroke-opacity=".45" stroke-width="1.2" stroke-dasharray="2.2 2.2"/>';
      return s;
    }
    let corpo = '<circle r="' + r + '" fill="#141821" stroke="' + cor + '" stroke-opacity=".55" stroke-width=".8"/>';
    if (!l.fase) corpo += '<circle r="' + r + '" fill="' + cor + '"/>';
    else {
      const p = l.fase.pos, k = Math.cos(2 * Math.PI * p);           // 1 na nova, -1 na cheia
      const rx = Math.abs(k) * r, dir = p < 0.5;                      // crescendo: acesa à direita
      if (l.fase.luz >= 99) corpo += '<circle r="' + r + '" fill="' + cor + '"/>';
      else if (l.fase.luz > 1) {
        // a borda acesa (meia-volta do lado aceso) e o terminador (meia-elipse)
        const lado = dir ? 1 : 0, gib = k < 0;                       // gibosa: o terminador vai para o lado escuro
        const d = 'M0 ' + -r + ' A' + r + ' ' + r + ' 0 0 ' + lado + ' 0 ' + r + ' A' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + (gib ? lado : 1 - lado) + ' 0 ' + -r + 'Z';
        corpo += '<path d="' + d + '" fill="' + cor + '"/>';
      }
    }
    if (l.horda) corpo += '<ellipse rx="6.2" ry="3.4" fill="#2a0c0c" fill-opacity=".85"/><circle r="2.3" fill="#ffcf5a"/><circle r=".9" fill="#2a0c0c"/>';
    s.innerHTML = corpo;
    return s;
  }

  function mestre() { const A = app(); return !!(A && A.papel === 'mestre' && A.podeEditar && A.podeEditar() && !A.comoJogador); }
  function vista() { const A = app(); try { return A && A.vista ? A.vista() : null; } catch (e) { return null; } }

  /* ---------------- o canto das luas ---------------- */
  function pintar() {
    const palco = $('palco');
    if (!palco || !N() || !N().luasDoDia) return;
    if (!caixa) {
      caixa = h('div', { class: 'luas', id: 'luas' });
      palco.append(caixa);
      document.addEventListener('pointerdown', ev => { if (aberto && caixa && !caixa.contains(ev.target)) fechar(); });
      document.addEventListener('keydown', ev => { if (aberto && ev.key === 'Escape') fechar(); });
    }
    const v = vista(), cal = v && v.cal, ls = cal ? N().luasDoDia(cal, cal.dia) : [];
    const chave = JSON.stringify([ls, mestre(), cal ? cal.dia : null, aberto]);
    if (chave === ultimo) return;
    ultimo = chave;
    caixa.replaceChildren();
    caixa.hidden = !v || (!ls.length && !mestre());
    if (caixa.hidden) { aberto = false; return; }
    if (!ls.length) {
      caixa.append(h('button', { type: 'button', class: 'luas-bt luas-novo', title: 'Pôr as luas no céu deste mapa: a Lua Kitsune, a Lua secundária e a Lua do olho (você muda tudo depois)',
        onclick: porLuas }, desenho({ ceu: true, cor: '#d9d4ff', fase: { pos: 0.3, luz: 70 } }, 18), h('span', { text: 'Luas' })));
      return;
    }
    const bt = h('button', { type: 'button', class: 'luas-bt', 'aria-expanded': String(aberto), 'aria-label': 'As luas de hoje: ' + ls.map(texto).join('; '),
      title: ls.map(texto).join('\n'), onclick: () => { aberto = !aberto; ultimo = ''; pintar(); } }, ls.map(l => desenho(l, 22)));
    caixa.append(bt);
    if (aberto) caixa.append(montarCartao(v, ls));
  }
  function fechar() { aberto = false; ultimo = ''; pintar(); }
  function texto(l) {
    if (!l.ceu) return l.nome + ': não está no céu esta noite';
    return l.nome + (l.fase ? ': ' + l.fase.nome + ' (' + l.fase.luz + '% iluminada)' : ': no céu esta noite');
  }

  function montarCartao(v, ls) {
    const M = mestre(), A = app(), cal = v.cal, luasCal = (cal.luas || []);
    const linhas = ls.map(l => {
      const bruta = luasCal.find(x => x.id === l.id);
      const sub = [];
      if (l.ceu) sub.push(l.fase ? l.fase.nome + ' · ' + l.fase.luz + '% iluminada' + (l.fase.luz < 100 && l.fase.luz > 0 ? (l.fase.cresce ? ', crescendo' : ', diminuindo') : '') : 'No céu esta noite');
      else sub.push('Não está no céu esta noite');
      if (M && bruta) {
        if (l.chance < 100) sub.push('chance de ' + l.chance + '% por noite');
        const prox = l.chance < 100 ? N().proximaLua(bruta, cal.dia) : l.fase && l.fase.i !== 2 ? N().proximaLua(bruta, cal.dia, 2) : null;
        if (prox) sub.push((l.chance < 100 ? 'volta ao céu em ' : 'cheia em ') + plural(prox, 'dia', 'dias'));
        if (l.forcada) sub.push('(você escolheu esta noite)');
      }
      const acoes = [];
      if (M && bruta && l.chance < 100) {
        acoes.push(h('button', { type: 'button', class: 'btn sm', text: l.ceu ? 'Tirar do céu esta noite' : 'Fazer subir esta noite',
          title: l.horda && !l.ceu ? 'A lua sobe hoje (e o mapa ganha a horda, escondida)' : '', onclick: () => forcar(l.id, !l.ceu) }));
        if (l.forcada) acoes.push(h('button', { type: 'button', class: 'btn sm', text: 'Deixar no sorteio', onclick: () => forcar(l.id, null) }));
      }
      return h('div', { class: 'lua-lin' + (l.ceu ? '' : ' fora') }, desenho(l, 40),
        h('div', { class: 'lua-tx' }, h('b', { text: l.nome }), h('small', { text: sub.join(' · ') }), acoes.length ? h('div', { class: 'lua-acoes' }, acoes) : null));
    });
    return h('div', { class: 'luas-cartao', role: 'dialog', 'aria-label': 'As luas' },
      h('div', { class: 'luas-cab' }, h('b', { text: 'As luas de hoje' }), h('small', { text: N().textoData(cal, cal.dia) })),
      linhas,
      M ? h('div', { class: 'luas-pe' }, h('button', { type: 'button', class: 'btn pri sm', text: 'Editar as luas', onclick: () => { fechar(); editar(); } })) : null);
  }

  function porLuas() {
    const A = app();
    if (!A || !mestre()) return;
    const ok = A.mudar('pôr as luas', m => { if (Array.isArray(m.cal.luas) && m.cal.luas.length) return false; m.cal.luas = JSON.parse(JSON.stringify(N().LUAS_PADRAO)); });
    if (ok !== false) { aberto = true; ultimo = ''; pintar(); A.toast('As três luas estão no céu. Em "Editar as luas" você troca os nomes, as fases e as chances.'); }
  }
  function forcar(id, v) {
    const A = app();
    if (!A || !mestre()) return;
    let horda = null;
    const ok = A.mudar(v == null ? 'deixar a lua no sorteio' : v ? 'fazer a lua subir' : 'tirar a lua do céu', m => {
      const l = (m.cal.luas || []).find(x => x.id === id);
      if (!l) return false;
      if (v == null) delete l.forca; else l.forca = { d: Math.floor(m.cal.dia), v: !!v };
      if (v && l.horda && !temHorda(m, l, m.cal.dia)) horda = porHorda(m, l, m.cal.dia);
    });
    if (ok === false) return;
    ultimo = ''; pintar();
    if (horda) A.toast(horda + ' subiu: o mapa ganhou uma Horda de monstros, escondida dos jogadores. Arraste-a para onde ela começa.');
  }

  /* ---------------- a horda ---------------- */
  const novoId = () => 'e_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const temHorda = (m, l, dia) => (m.objs || []).some(o => o && o.k === 'e' && o.tipo === 'horda' && o.lua === l.id && o.ini === dia);
  function porHorda(m, l, dia) {
    const W = Number(m.larg) || 1000, H = Number(m.alt) || 1000;
    m.objs.push({ id: novoId(), k: 'e', tipo: 'horda', nome: 'Horda da ' + l.nome, lua: l.id, txt: 'A ' + l.nome + ' subiu aos céus: as hordas de monstros saem esta noite.',
      x: Math.round(W / 2), y: Math.round(H / 2), r: Math.round(Math.min(W, H) * 0.12), ini: dia, fim: dia, oculto: true, peso: { custo: 0, enc: 40, fecha: false } });
    return l.nome;
  }
  // chamado dentro do App.mudar que passa o dia: as luas de horda que sobem nos dias novos (de, ate]
  function hordasAoPassar(m, de, ate) {
    if (!N() || !N().hordasEntre || !m || !m.cal) return [];
    const subiram = [];
    for (const x of N().hordasEntre(m.cal, de, ate)) if (!temHorda(m, x.lua, x.dia)) { porHorda(m, x.lua, x.dia); subiram.push(x); }
    return subiram;
  }
  function avisarHordas(lista) {
    const A = app();
    if (!A || !lista || !lista.length) return;
    const nomes = [...new Set(lista.map(x => x.lua.nome))].join(' e ');
    A.toast(nomes + ' subiu aos céus! As hordas de monstros começam. O mapa ganhou ' + (lista.length === 1 ? 'uma Horda' : lista.length + ' Hordas') + ', escondida dos jogadores: arraste para onde ela começa.', null, null, 12000);
  }

  /* ---------------- a janela "As luas" ---------------- */
  const FASE_POS = [0, 0.25, 0.5, 0.75];
  function editar() {
    const A = app();
    if (!A || !mestre() || !A.mapa) return;
    const idMapa = A.mapa.id, dia = Math.floor(A.mapa.cal.dia);
    const lista = JSON.parse(JSON.stringify(A.mapa.cal.luas || []));
    const dl = h('dialog', { class: 'mundo-dl luas-dl', 'aria-label': 'As luas' });
    const corpo = h('div', { class: 'luas-cards' });
    const err = h('p', { class: 'err', role: 'alert' });
    const campo = (rot, el, dica) => h('label', { class: 'lua-campo' }, h('span', { text: rot }), el, dica ? h('small', { text: dica }) : null);
    function card(l, i) {
      const f = N().faseDaLua(l, dia);
      const nome = h('input', { type: 'text', maxlength: 40, value: l.nome, autocomplete: 'off' });
      nome.oninput = () => { l.nome = nome.value; };
      const cor = h('input', { type: 'color', value: l.cor || '#dddddd' });
      cor.oninput = () => { l.cor = cor.value; prev(); };
      const temF = h('input', { type: 'checkbox' }); temF.checked = l.fases !== false;
      const ciclo = h('input', { type: 'number', min: 2, max: 1000, value: l.ciclo || 30 });
      const hoje = h('select', null, (l.nomes || N().FASES_LUA).map((n, k) => h('option', { value: String(k), text: n })));
      hoje.value = String(f.i);
      const nomesF = (l.nomes || N().FASES_LUA.slice()).map((n, k) => { const e = h('input', { type: 'text', maxlength: 30, value: n, 'aria-label': 'Nome da fase ' + (k + 1) }); e.oninput = () => { l.nomes[k] = e.value; hoje.options[k].textContent = e.value || N().FASES_LUA[k]; }; return e; });
      l.nomes = nomesF.map(e => e.value);
      const acerta = () => { const c = Math.max(2, Math.min(1000, Math.round(Number(ciclo.value) || 30))); l.ciclo = c; const alvo = Math.round(FASE_POS[Number(hoje.value)] * c); l.desloc = (((alvo - dia) % c) + c) % c; prev(); };
      ciclo.oninput = acerta; hoje.onchange = acerta;
      const caixaF = h('div', { class: 'lua-fases' },
        h('div', { class: 'lin' }, campo('Ciclo (dias)', ciclo, 'De uma lua nova até a outra.'), campo('Hoje ela está', hoje)),
        h('div', { class: 'lua-nomes' }, h('span', { text: 'Nome das fases' }), h('div', { class: 'lin' }, nomesF)));
      caixaF.hidden = !temF.checked;
      temF.onchange = () => { l.fases = temF.checked; caixaF.hidden = !temF.checked; prev(); };
      const chance = h('input', { type: 'number', min: 0, max: 100, value: l.chance == null ? 100 : l.chance });
      chance.oninput = () => { l.chance = Math.max(0, Math.min(100, Math.round(Number(chance.value) || 0))); };
      const horda = h('input', { type: 'checkbox' }); horda.checked = !!l.horda;
      horda.onchange = () => { l.horda = horda.checked; prev(); };
      const pv = h('span', { class: 'lua-prev' });
      function prev() { pv.replaceChildren(desenho({ ceu: true, cor: l.cor, horda: l.horda, fase: l.fases !== false ? N().faseDaLua(l, dia) : null }, 46)); }
      prev();
      return h('section', { class: 'lua-card' },
        h('div', { class: 'lua-card-cab' }, pv, h('div', { class: 'lin' }, campo('Nome', nome), campo('Cor', cor)),
          h('button', { type: 'button', class: 'ib', title: 'Tirar esta lua', 'aria-label': 'Tirar esta lua', text: '✕', onclick: () => { lista.splice(i, 1); montar(); } })),
        h('label', { class: 'op' }, temF, h('span', { text: 'Ela tem fases (nova, crescente, cheia, minguante)' })),
        caixaF,
        campo('Chance de estar no céu numa noite (%)', chance, '100 = toda noite. A Lua do olho começa com 5.'),
        h('label', { class: 'op' }, horda, h('span', { text: 'Quando ela sobe, começam as hordas (você é avisado e o mapa ganha uma Horda)' })));
    }
    function montar() {
      corpo.replaceChildren(...lista.map(card));
      if (lista.length < 6) corpo.append(h('button', { type: 'button', class: 'btn sm', text: '+ Nova lua', onclick: () => {
        lista.push({ id: 'lua_' + Math.random().toString(36).slice(2, 7), nome: 'Lua nova', cor: '#dddddd', fases: true, ciclo: 30, desloc: 0, nomes: N().FASES_LUA.slice(), chance: 100, horda: false }); montar(); } }));
    }
    montar();
    const fim = () => { try { if (dl.open) dl.close(); } catch (e) { /* */ } dl.remove(); };
    const salvar = h('button', { type: 'submit', class: 'btn pri', text: 'Salvar as luas' });
    const form = h('form', { class: 'dl', novalidate: true },
      h('h2', { text: 'As luas' }),
      h('p', { text: 'Os jogadores veem as luas e a fase delas, no canto do mapa. A chance e quando ela volta, só você.' }),
      corpo, err,
      h('div', { class: 'pe' }, h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fim }), salvar));
    form.onsubmit = ev => {
      ev.preventDefault();
      if (!app() || !app().mapa || app().mapa.id !== idMapa) { fim(); return; }
      for (const l of lista) if (!String(l.nome || '').trim()) { err.textContent = 'Toda lua precisa de um nome.'; return; }
      app().mudar('mudar as luas', m => { m.cal.luas = JSON.parse(JSON.stringify(lista)); });
      fim(); ultimo = ''; pintar();
    };
    dl.addEventListener('close', fim);
    dl.addEventListener('keydown', ev => ev.stopPropagation());
    dl.append(form);
    document.body.append(dl);
    dl.showModal();
  }

  window.MundoLuas = { pintar, editar, desenho, hordasAoPassar, avisarHordas };
})();
