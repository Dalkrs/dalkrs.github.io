/* Tiny Cats · Acampamento: o aplicativo.
   A cena da fogueira com os personagens em volta, as provisões, a estrutura (melhorias e equipamentos), os bônus,
   o diário e o descanso — que recupera as barras das fichas, gasta provisões e mexe em Conforto e Sanidade, sempre
   com prévia antes e Desfazer depois.

   Onde os dados moram:
     · na mesa (dentro do site, com uma mesa aberta): o documento "acampamento" (todos leem; só o mestre escreve) e as
       fichas dos personagens (TC.dados). Os jogadores veem a roda inteira (nomes e imagens) e os detalhes só do que
       podem ver.
     · sem mesa: neste navegador. As fichas daqui aparecem para consulta; o descanso mostra o que cada um recupera,
       mas não escreve nelas (a página das Fichas é quem cuida delas). */
(() => {
  'use strict';
  const N = window.AcampNucleo;
  const R = () => (window.TC && TC.rules) || null;
  const j = JSON.stringify;
  const $ = id => document.getElementById(id);
  const CHAVE = 'tinycats:acampamento:v1', DOC = 'acampamento', FICHAS_LOCAL = 'urgm_calc_atributos_v1';
  const DEBUG = /[?&]debug(?:[=&]|$)/.test(location.search);
  const NS = 'http://www.w3.org/2000/svg';
  const HORA_NOME = { entardecer: 'Entardecer', noite: 'Noite', amanhecer: 'Amanhecer' };
  const ABAS = [['grupo', 'Grupo'], ['provisoes', 'Provisões'], ['estrutura', 'Estrutura'], ['diario', 'Diário']];

  /* Monta um elemento: h('button', { class: 'btn', onclick }, 'texto', outro). Texto sempre entra como texto. */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'readOnly') el[k] = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c);
    return el;
  }
  const svg = (d, t = 15) => { const s = document.createElement('span'); s.style.display = 'inline-grid'; s.innerHTML = `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`; return s; };
  const X = '<path d="M6 6l12 12M18 6 6 18"/>', MAIS = '<path d="M5 12h14M12 5v14"/>', MENOS = '<path d="M5 12h14"/>', CIMA = '<path d="M6 15l6-6 6 6"/>', BAIXO = '<path d="M6 9l6 6 6-6"/>';
  const iniciais = nome => { const p = String(nome || '').trim().split(/\s+/).filter(Boolean); return ((p[0] ? Array.from(p[0])[0] : '?') + (p[1] ? Array.from(p[1])[0] : '')).toUpperCase(); };
  const imagemOk = u => (typeof u === 'string' && (/^https:\/\//.test(u) || /^data:image\/(png|jpeg|webp);base64,/.test(u)) ? u : null);
  const guarda = {
    ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    gravar(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  };

  /* ---------------- estado ---------------- */
  let modo = 'local', papel = 'mestre', st = { mesa: null, papel: null, eu: null, membros: [] }, P = null, D = null;
  let camp = N.normalizar(null), jCamp = j(camp);
  let pilha = [];                                    // desfazer: [{ rotulo, json, fichas? }]
  let sel = null, aba = guarda.ler('tinycats:acampamento:aba') || 'grupo';
  let pronto = false;
  const mestre = () => papel === 'mestre';
  const naMesa = () => modo === 'mesa';
  const naCasca = () => !!(window.TC && TC.ponte && TC.ponte.naCasca);
  const ehJogador = id => !!id && (st.membros || []).some(m => m.id === id && m.papel === 'jogador');

  /* ---------------- avisos ---------------- */
  function toast(texto, acao, fn, ms) {
    const t = h('div', { class: 'toast' }, h('span', { text: texto }));
    if (acao) t.append(h('button', { type: 'button', text: acao, onclick: () => { t.remove(); fn(); } }));
    $('toasts').replaceChildren(t);
    setTimeout(() => t.remove(), ms || (acao ? 10000 : 4200));
  }
  function marcarSalvo(texto, ruim) { const el = $('salvo'); el.textContent = texto; el.classList.toggle('ruim', !!ruim); }

  /* ---------------- as fichas ---------------- */
  // Sem mesa: as fichas deste navegador, só para consulta.
  let cacheLocal = { cru: null, v: null };
  function estadoLocalFichas() {
    const cru = guarda.ler(FICHAS_LOCAL);
    if (cru === cacheLocal.cru) return cacheLocal.v;
    let v = null;
    try { v = JSON.parse(cru || 'null'); } catch (e) { v = null; }
    cacheLocal = { cru, v: v && Array.isArray(v.personagens) ? v : null };
    return cacheLocal.v;
  }
  function linhas() {
    if (naMesa()) return P.todas();
    const s = estadoLocalFichas();
    return s ? s.personagens.filter(p => p && p.id).map(p => ({ id: p.id, nome: p.nome || 'Sem nome', dono_id: null, ficha: p, skills: p.skills || {}, estado: p.estado || {}, ordem: 0 })) : [];
  }
  const linha = id => linhas().find(l => l.id === id) || null;
  function cfgAtual() {
    if (naMesa()) { const d = D.pegar('fichas:cfg'); return (d && d.dados && d.dados.v) || R().cfgPadrao(); }
    const s = estadoLocalFichas(); return (s && s.cfg) || R().cfgPadrao();
  }
  function bibAtual() {
    if (naMesa()) { const d = D.pegar(mestre() ? 'arvore:biblioteca' : 'arvore:pacote'); return d && d.dados && Array.isArray(d.dados.arvores) ? d.dados : null; }
    const s = estadoLocalFichas(); return (s && s.bib) || null;
  }
  const dentro = (v, padrao) => (v != null && v !== '' && Number.isFinite(+v) ? N.limitar(Math.round(+v), 0, 100) : padrao);
  /* Uma pessoa do acampamento, com o que der para saber dela. Quem não tem a ficha à vista (o jogador olhando o
     personagem de outro) aparece só com nome e imagem. */
  function pessoa(id) {
    const l = linha(id), r0 = camp.roda.find(x => x.id === id);
    if (!l) return r0 ? { id, nome: r0.nome || 'Sem nome', img: imagemOk(r0.img), dono: r0.dono, semFicha: true, recursos: [], san: null, conf: null, poderes: [] } : null;
    const est = l.estado || {}, ficha = l.ficha || {};
    let recursos = [];
    try {
      const pc = Object.assign({}, ficha, { id: l.id, nome: l.nome });
      recursos = R().resumo(pc, cfgAtual(), { arvore: R().bonusDaArvore(l.skills, bibAtual()) }, est).recursos.filter(x => x.max != null && Number.isFinite(x.max) && x.max > 0);
    } catch (e) { recursos = []; }
    const usa = est.san != null || est.conf != null || (Array.isArray(est.rel) && est.rel.length > 0) || ehJogador(l.dono_id);
    return {
      id, nome: l.nome || 'Sem nome', img: imagemOk(ficha.img), dono: l.dono_id || null, semFicha: false, recursos,
      san: usa ? dentro(est.san, 100) : null, conf: usa ? dentro(est.conf, 50) : null,
      poderes: (Array.isArray(ficha.poderes) ? ficha.poderes : []).filter(x => x && x.id).map(x => ({ id: x.id, nome: x.nome || 'Poder', atual: Math.max(0, +x.atual || 0), max: Math.max(0, +x.max || 0) })),
    };
  }
  // quem está no acampamento, na ordem da lista (só os que ainda existem para quem está olhando)
  const presentes = () => camp.presentes.map(pessoa).filter(Boolean);
  const nomeDoDono = id => { const m = (st.membros || []).find(x => x.id === id); return m ? m.nome : ''; };

  /* ---------------- gravar, desfazer, o que vem de fora ---------------- */
  function gravar() {
    jCamp = j(camp);
    if (naMesa()) { if (mestre()) D.gravar(DOC, { dados: JSON.parse(jCamp), vis: 'mesa' }); marcarSalvo('Salvo na mesa'); }
    else if (guarda.gravar(CHAVE, jCamp)) marcarSalvo('Salvo neste navegador');
    else marcarSalvo('Sem espaço no navegador', true);
  }
  /* Toda mudança no acampamento passa por aqui: fn mexe num rascunho (ou devolve false para desistir). */
  function mudar(rotulo, fn, opt) {
    if (!mestre()) return false;
    const rasc = N.copia(camp);
    if (fn(rasc) === false) return false;
    const novo = N.normalizar(rasc), jn = j(novo);
    if (jn === jCamp) return false;
    if (!(opt && opt.silencioso)) {
      const topo = pilha[pilha.length - 1];
      if (!(opt && opt.junta && topo && topo.junta === opt.junta)) pilha.push({ rotulo, json: jCamp, junta: (opt && opt.junta) || null, fichas: (opt && opt.fichas) || null });
      if (pilha.length > 60) pilha.shift();
    }
    camp = novo;
    gravar();
    pintar();
    return true;
  }
  function desfazer() {
    if (!mestre() || !pilha.length) return false;
    const p = pilha.pop();
    camp = N.normalizar(JSON.parse(p.json));
    if (p.fichas && naMesa()) for (const f of p.fichas) { const campos = { estado: f.estado }; if (f.ficha) campos.ficha = f.ficha; P.gravar(f.id, campos); }
    gravar(); pintar();
    toast('Desfeito: ' + p.rotulo + '.');
    if (p.fichas && naMesa() && p.publicar) publicar(camp.nome, 'Desfeito: ' + p.rotulo + '.');
    return true;
  }
  const digitando = () => { const a = document.activeElement; return !!a && a !== document.body && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !/^(checkbox|radio|button|file)$/i.test(a.type || ''))) && $('app').contains(a); };
  let adiado = 0;
  function deFora() {
    clearTimeout(adiado);
    if (digitando() || $('dlg').open || arrasto) { adiado = setTimeout(deFora, 900); return; }
    const d = D.pegar(DOC), novo = N.normalizar(d && !d.apagado ? d.dados : null), jn = j(novo);
    if (jn === jCamp) return;
    camp = novo; jCamp = jn;
    if (mestre()) pilha = [];                          // mudou em outro aparelho: o desfazer recomeça daqui
    pintar();
  }
  function publicar(titulo, resumo) { try { if (naMesa() && TC.ponte) TC.ponte.publicar('acampamento', { titulo, resumo }); } catch (e) { /* a mesa ao vivo é opcional */ } }

  /* O mestre mantém a roda em dia: quem é personagem de jogador entra sozinho (uma vez; se for tirado, não volta),
     e a lista pública (nome, imagem, dono) acompanha as fichas. Nada disso é passo de desfazer. */
  function manterRoda() {
    if (!naMesa() || !mestre()) return;
    const todas = linhas(), ids = new Set(todas.map(l => l.id));
    mudar('roda', c => {
      for (const l of todas) if (ehJogador(l.dono_id) && !c.autoVistos.includes(l.id)) { c.autoVistos.push(l.id); if (!c.presentes.includes(l.id)) c.presentes.push(l.id); }
      c.roda = c.presentes.filter(id => ids.has(id)).map(id => { const l = todas.find(x => x.id === id), img = l.ficha && l.ficha.img; return { id, nome: l.nome || 'Sem nome', img: typeof img === 'string' && /^https:\/\//.test(img) ? img : null, dono: l.dono_id || null }; });
    }, { silencioso: true });
  }

  /* ---------------- o cenário ---------------- */
  function sorte(semente) { let a = semente >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function desenharCenario() {
    const r = sorte(20261003), p = [];
    p.push('<defs><linearGradient id="gCeu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--ceu1)"/><stop offset=".6" style="stop-color:var(--ceu2)"/><stop offset="1" style="stop-color:var(--ceu3)"/></linearGradient>'
      + '<radialGradient id="gFogo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb04a" stop-opacity=".85"/><stop offset=".45" stop-color="#ff7a2a" stop-opacity=".28"/><stop offset="1" stop-color="#ff7a2a" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="gChao" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c8763a" stop-opacity=".42"/><stop offset="1" stop-color="#c8763a" stop-opacity="0"/></radialGradient></defs>');
    // o céu continua para cima da cena: em tela estreita é ele que aparece no alto do palco
    p.push('<rect x="0" y="-1100" width="1600" height="1101" style="fill:var(--ceu1)"/><rect x="0" y="0" width="1600" height="570" fill="url(#gCeu)"/>');
    for (let i = 0; i < 70; i++) p.push(`<circle class="estrela" cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 400).toFixed(0)}" r="${(0.7 + r() * 1.4).toFixed(1)}" style="animation-delay:-${(r() * 4).toFixed(1)}s"/>`);
    for (let i = 0; i < 150; i++) p.push(`<circle class="estrela" cx="${(r() * 1600).toFixed(0)}" cy="${(-r() * 1050).toFixed(0)}" r="${(0.7 + r() * 1.4).toFixed(1)}" style="animation-delay:-${(r() * 4).toFixed(1)}s"/>`);
    p.push('<circle cx="1240" cy="150" r="96" style="fill:var(--astro)" opacity=".1"/><circle cx="1240" cy="150" r="44" style="fill:var(--astro)"/>');
    p.push('<path d="M0 470C200 400 400 440 620 420S1000 380 1200 430s300-30 400 10V570H0Z" style="fill:var(--mata)" opacity=".55"/>');
    // a linha das árvores: pinheiros de tamanhos variados
    for (let x = -30; x < 1640; x += 30 + r() * 34) {
      const a = 90 + r() * 120, l = 26 + r() * 22, y = 548 + r() * 14;
      p.push(`<path d="M${x.toFixed(0)} ${(y - a).toFixed(0)}l${l.toFixed(0)} ${(a * 0.42).toFixed(0)}h-${(l * 0.45).toFixed(0)}l${(l * 0.75).toFixed(0)} ${(a * 0.32).toFixed(0)}h-${(l * 0.5).toFixed(0)}l${(l * 0.8).toFixed(0)} ${(a * 0.26).toFixed(0)}h-${(l * 3.2).toFixed(0)}l${(l * 0.8).toFixed(0)} -${(a * 0.26).toFixed(0)}h-${(l * 0.5).toFixed(0)}l${(l * 0.75).toFixed(0)} -${(a * 0.32).toFixed(0)}h-${(l * 0.45).toFixed(0)}Z" style="fill:var(--mata)"/>`);
    }
    p.push('<rect x="0" y="545" width="1600" height="1155" style="fill:var(--chao)"/>');           // o chão continua para baixo da cena
    p.push('<ellipse cx="800" cy="690" rx="640" ry="190" style="fill:var(--chao2)"/><ellipse cx="800" cy="660" rx="520" ry="150" fill="url(#gChao)"/>');
    // as barracas
    const barraca = (cx, base, larg, alt, vira) => {
      const e = cx - larg / 2, d = cx + larg / 2, t = base - alt, porta = larg * 0.16;
      return `<path d="M${e} ${base}L${cx} ${t}L${d} ${base}Z" fill="#3d352b"/><path d="M${cx} ${t}L${vira ? e : d} ${base}H${cx}Z" fill="#6a5a41"/>`
        + `<path d="M${cx} ${t + alt * 0.3}L${cx + porta} ${base}H${cx - porta}Z" fill="#15110d"/><path d="M${cx} ${t - 14}V${t + 6}" stroke="#2a221a" stroke-width="5" stroke-linecap="round"/>`;
    };
    p.push(barraca(300, 610, 320, 190, false), barraca(1310, 600, 280, 165, true));
    // os troncos de sentar
    p.push('<rect x="520" y="668" width="170" height="30" rx="15" fill="#3a2a1d"/><circle cx="535" cy="683" r="15" fill="#6b5138"/><circle cx="535" cy="683" r="8" fill="#55402c"/>');
    p.push('<rect x="910" y="668" width="170" height="30" rx="15" fill="#3a2a1d"/><circle cx="1065" cy="683" r="15" fill="#6b5138"/><circle cx="1065" cy="683" r="8" fill="#55402c"/>');
    // a fogueira
    p.push('<circle class="brilho" cx="800" cy="600" r="430" fill="url(#gFogo)"/>');
    p.push('<g transform="rotate(16 800 628)"><rect x="716" y="619" width="168" height="18" rx="9" fill="#2a1c13"/></g><g transform="rotate(-16 800 628)"><rect x="716" y="619" width="168" height="18" rx="9" fill="#36241a"/></g>');
    p.push('<ellipse cx="800" cy="626" rx="62" ry="12" fill="#c24a1e" opacity=".85"/>');
    p.push('<path class="chama" d="M800 470C850 540 882 570 860 614C845 640 755 640 740 614C720 570 770 548 800 470Z" fill="#f08a2b"/>');
    p.push('<path class="chama b" d="M800 520C832 565 850 586 838 614C826 632 774 632 762 614C750 586 782 570 800 520Z" fill="#ffc04d"/>');
    p.push('<path class="chama c" d="M800 566C815 588 824 600 817 616C810 626 790 626 783 616C776 600 790 590 800 566Z" fill="#fff1b8"/>');
    for (let i = 0; i < 8; i++) p.push(`<circle class="fagulha" cx="${(778 + r() * 44).toFixed(0)}" cy="${(548 + r() * 20).toFixed(0)}" r="${(1.6 + r() * 1.6).toFixed(1)}" style="--dx:${(-40 + r() * 80).toFixed(0)}px;animation-delay:-${(r() * 3.6).toFixed(1)}s"/>`);
    $('cenario').innerHTML = p.join('');
  }
  /* A cena tem sempre a proporção 16:9 e fica presa embaixo: cobre o palco cortando só o céu (em cima) e os lados —
     nunca o chão, onde as pessoas estão. O corte dos lados para na área em que as pessoas podem ficar (N.AREA): em
     tela estreita, em vez de cortar mais, a cena deixa de chegar ao alto do palco e o céu continua por cima.
     Os retratos não encolhem junto com a cena além do ponto em que o nome deixa de dar para ler; crescem de volta
     até onde a folga entre as pessoas deixa — e, se com isso passarem do pé do palco, a cena inteira sobe o que
     faltar (o chão continua por baixo). */
  const CORTE_MAX = 100 / (N.AREA.x1 - N.AREA.x0);
  let folgaDaRoda = Infinity;
  function ajustarPalco() {
    const pa = $('palco'), W = pa.clientWidth, H = pa.clientHeight;
    if (!W || !H) return;
    let k = Math.max(W / 1600, H / 900);
    if (1600 * k > W * CORTE_MAX) k = W * CORTE_MAX / 1600;
    const c16 = $('cena16');
    c16.style.bottom = '0px';
    c16.style.transform = `translateX(-50%) scale(${k.toFixed(4)})`;
    c16.style.setProperty('--pk', N.limitar(0.86 / k, 1, Math.max(1, Math.min(2.4, folgaDaRoda / 124))).toFixed(3));
    const pe = pa.getBoundingClientRect().bottom;
    let sobe = 0;
    for (const el of $('roda').children) sobe = Math.max(sobe, el.getBoundingClientRect().bottom + 8 - pe);
    sobe = Math.round(Math.min(sobe, H / 3));
    c16.style.bottom = sobe + 'px';
    const faixa = (H - sobe) / k - 900;
    c16.style.setProperty('--faixa', Math.max(0, faixa).toFixed(1) + 'px');
    c16.style.setProperty('--vao', (sobe / k).toFixed(1) + 'px');
    pa.classList.toggle('com-faixa', faixa > 1);
    pa.classList.toggle('com-vao', sobe > 0);
  }

  /* ---------------- pintar ---------------- */
  let focoDepois = null;
  function pintar() {
    if (!pronto) return;
    pintarTopo(); pintarCena(); pintarPainel();
  }
  function pintarTopo() {
    document.documentElement.classList.toggle('jogador', !mestre());
    const nome = $('nome');
    if (document.activeElement !== nome) nome.value = camp.nome;
    nome.readOnly = !mestre();
    const rac = N.racoes(camp), n = presentes().length, custo = Math.max(0, camp.regras.longo.prov * n + N.efeitos(camp).prov);
    const chip = $('chipRacoes');
    chip.replaceChildren('Rações ', h('b', { text: String(rac) }));
    chip.classList.toggle('pouco', n > 0 && rac < custo);
    chip.title = n ? 'O próximo descanso longo gasta ' + custo + (custo === 1 ? ' ração' : ' rações') + ' (' + n + (n === 1 ? ' personagem' : ' personagens') + ').' : 'Rações: a soma das provisões guardadas.';
    $('hora').replaceChildren(...N.HORAS.map(x => h('button', { type: 'button', 'aria-pressed': String(camp.hora === x), text: HORA_NOME[x], onclick: () => mudar('mudar a hora', c => { c.hora = x; }) })));
    $('btDesfazer').disabled = !pilha.length;
    $('btDesfazer').title = pilha.length ? 'Desfazer: ' + pilha[pilha.length - 1].rotulo + ' (Ctrl+Z)' : 'Nada para desfazer';
    $('btCena').hidden = !(naCasca() && mestre());
    $('btMundo').hidden = !naCasca();
    $('btMomento').hidden = !naMesa();
  }
  function barrinha(v, max, cor) { return h('div', { class: 'b' }, h('i', { style: `width:${N.limitar(max > 0 ? v / max * 100 : 0, 0, 100)}%;--c:${cor}` })); }
  function pintarCena() {
    const pa = $('palco');
    pa.className = 'palco hora-' + camp.hora + (camp.fundo ? ' com-fundo' : '');
    const c16 = $('cena16');
    let im = c16.querySelector('img.fundo');
    if (camp.fundo) {
      if (!im) {
        im = h('img', { class: 'fundo', alt: '' });
        c16.insertBefore(im, $('roda'));
        for (const lado of ['cima', 'baixo']) c16.insertBefore(h('div', { class: 'longe ' + lado, 'aria-hidden': 'true' }, h('img', { alt: '' })), im);
      }
      if (im.getAttribute('src') !== camp.fundo.url) for (const x of c16.querySelectorAll('img.fundo, .longe img')) x.src = camp.fundo.url;
    } else if (im) { im.remove(); for (const x of c16.querySelectorAll('.longe')) x.remove(); }
    const gente = presentes(), n = gente.length;
    const lugares = gente.map((p, i) => camp.lugares[p.id] || N.lugarPadrao(i, n));
    folgaDaRoda = N.folga(lugares);
    $('roda').replaceChildren(...gente.map((p, i) => {
      const lugar = lugares[i];
      const el = h('button', { type: 'button', class: 'pers' + (sel === p.id ? ' sel' : ''), 'data-id': p.id, 'data-pode': mestre() ? '' : null, style: `left:${lugar.x}%;top:${lugar.y}%`,
        'aria-label': p.nome + (p.san != null ? `, Sanidade ${p.san}, Conforto ${p.conf}` : ''), 'aria-pressed': String(sel === p.id) },
        h('span', { class: 'rt' }, p.img ? h('img', { src: p.img, alt: '' }) : iniciais(p.nome)),
        h('span', { class: 'nm', text: p.nome }));
      if (!p.semFicha) {
        const bs = h('span', { class: 'bs' });
        p.recursos.slice(0, 2).forEach((r, k) => bs.append(barrinha(r.atual, r.max, k === 0 ? 'var(--hp)' : 'var(--sp)')));
        if (p.san != null) bs.append(barrinha(p.san, 100, 'var(--san)'), barrinha(p.conf, 100, 'var(--conf)'));
        if (bs.childNodes.length) el.append(bs);
      }
      return el;
    }));
    const vz = $('vazio');
    vz.hidden = n > 0;
    if (!n) vz.textContent = mestre() ? (linhas().length ? 'Ninguém em volta da fogueira ainda. Chame os personagens pela aba Grupo.' : (naMesa() ? 'A mesa ainda não tem fichas. Crie os personagens na aba Fichas e chame-os para cá.' : 'Sem fichas neste navegador. Crie os personagens na aba Fichas e chame-os para cá.')) : 'O mestre ainda não chamou ninguém para o acampamento.';
    const ef = N.efeitos(camp), txt = N.textoEfeitos(ef);
    $('avisosCena').replaceChildren(
      ...camp.bonus.map(b => h('span', { class: 'chip', title: b.desc || null }, h('b', { text: b.nome || 'Bônus' }), b.ateDescanso ? ' até o descanso' : null)),
      txt ? h('span', { class: 'chip', title: 'O que as melhorias e os equipamentos em uso somam ao descanso longo' }, 'Estrutura: ', h('b', { text: txt })) : null);
    ajustarPalco();
  }

  /* ---- arrastar quem está na roda (só o mestre) ---- */
  let arrasto = null;
  $('roda').addEventListener('pointerdown', ev => {
    const el = ev.target.closest('.pers'); if (!el || ev.button !== 0) return;
    arrasto = { id: el.dataset.id, el, x0: ev.clientX, y0: ev.clientY, moveu: false, pid: ev.pointerId, esq: parseFloat(el.style.left), topo: parseFloat(el.style.top) };
  });
  window.addEventListener('pointermove', ev => {
    if (!arrasto || ev.pointerId !== arrasto.pid || !mestre()) return;
    const dx = ev.clientX - arrasto.x0, dy = ev.clientY - arrasto.y0;
    if (!arrasto.moveu && Math.hypot(dx, dy) < 5) return;
    arrasto.moveu = true; arrasto.el.classList.add('arrastando');
    const r = $('cena16').getBoundingClientRect();
    arrasto.x = N.limitar(arrasto.esq + dx / r.width * 100, N.AREA.x0, N.AREA.x1); arrasto.y = N.limitar(arrasto.topo + dy / r.height * 100, N.AREA.y0, N.AREA.y1);
    arrasto.el.style.left = arrasto.x + '%'; arrasto.el.style.top = arrasto.y + '%';
  });
  window.addEventListener('pointerup', ev => {
    if (!arrasto || ev.pointerId !== arrasto.pid) return;
    const a = arrasto; arrasto = null;
    a.el.classList.remove('arrastando');
    if (a.moveu) { const p = pessoa(a.id); mudar('mover ' + (p ? p.nome : 'personagem'), c => { c.lugares[a.id] = { x: a.x, y: a.y }; }); }
    else selecionar(sel === a.id ? null : a.id);
  });
  window.addEventListener('pointercancel', () => { if (arrasto) { arrasto.el.classList.remove('arrastando'); arrasto = null; pintarCena(); } });
  $('roda').addEventListener('keydown', ev => {
    const el = ev.target.closest('.pers'); if (!el) return;
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selecionar(sel === el.dataset.id ? null : el.dataset.id); focarPers(el.dataset.id); return; }
    const d = { ArrowLeft: [-1.5, 0], ArrowRight: [1.5, 0], ArrowUp: [0, -1.5], ArrowDown: [0, 1.5] }[ev.key];
    if (!d || !mestre()) return;
    ev.preventDefault();
    const id = el.dataset.id, x = N.limitar(parseFloat(el.style.left) + d[0], N.AREA.x0, N.AREA.x1), y = N.limitar(parseFloat(el.style.top) + d[1], N.AREA.y0, N.AREA.y1);
    mudar('mover ' + ((pessoa(id) || {}).nome || 'personagem'), c => { c.lugares[id] = { x, y }; }, { junta: 'mover:' + id });
    focarPers(id);
  });
  function focarPers(id) { const el = $('roda').querySelector('.pers[data-id="' + CSS.escape(id) + '"]'); if (el) el.focus(); }
  function selecionar(id) { sel = id; if (id) trocarAba('grupo', true); pintarCena(); pintarPainel(); }

  /* ---------------- o painel ---------------- */
  function trocarAba(a, semPintar) { aba = a; guarda.gravar('tinycats:acampamento:aba', a); if (!semPintar) pintarPainel(); }
  function pintarPainel() {
    if (!ABAS.some(a => a[0] === aba)) aba = 'grupo';
    $('tabs').replaceChildren(...ABAS.map(([id, nome]) => h('button', { type: 'button', class: 'tab', role: 'tab', id: 'tab-' + id, 'aria-selected': String(aba === id), text: nome, onclick: () => trocarAba(id) })));
    const pane = $('pane'), rolagem = pane.scrollTop, ativo = document.activeElement && pane.contains(document.activeElement) ? document.activeElement.id : null;
    pane.replaceChildren(...({ grupo: abaGrupo, provisoes: abaProvisoes, estrutura: abaEstrutura, diario: abaDiario }[aba])().flat(Infinity).filter(Boolean));
    pane.scrollTop = rolagem;
    const alvo = focoDepois || ativo; focoDepois = null;
    if (alvo) { const el = document.getElementById(alvo); if (el && !el.disabled) el.focus({ preventScroll: true }); }
  }
  // campos: o texto vira mudança quando a pessoa termina (Enter ou ao sair do campo)
  const campoTexto = (id, valor, rotulo, aoMudar, o) => h('input', Object.assign({ id, class: 'in', type: 'text', value: valor, 'aria-label': rotulo, autocomplete: 'off', maxlength: 80, readOnly: !mestre(), onchange: e => aoMudar(e.target.value) }, o || {}));
  const campoArea = (id, valor, rotulo, aoMudar, dica) => h('textarea', { id, class: 'in', rows: 2, 'aria-label': rotulo, placeholder: dica || null, maxlength: 600, readOnly: !mestre(), onchange: e => aoMudar(e.target.value) }, valor);
  const campoNum = (id, valor, rotulo, aoMudar, min, max) => h('input', { id, class: 'in num', type: 'number', value: valor, min, max, step: 1, 'aria-label': rotulo, title: rotulo, disabled: !mestre(), onchange: e => { const v = Math.round(+e.target.value); aoMudar(Number.isFinite(v) ? N.limitar(v, min, max) : 0); } });
  const botaoIcone = (id, d, rotulo, fn, o) => { const b = h('button', Object.assign({ type: 'button', class: 'ib sm', id, title: rotulo, 'aria-label': rotulo, onclick: fn }, o || {})); b.append(svg(d, 14)); return b; };
  const acha = (lista, id) => lista.find(x => x.id === id);

  function medidor(nome, v, max, cor, texto) {
    return h('div', { class: 'medidor' }, h('span', { text: nome }), h('span', { class: 'tr' }, h('i', { style: `width:${N.limitar(max > 0 ? v / max * 100 : 0, 0, 100)}%;--c:${cor}` })), h('span', { text: texto || (v + '/' + max) }));
  }
  function abaGrupo() {
    const gente = presentes(), fora = mestre() ? linhas().filter(l => !camp.presentes.includes(l.id)).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR')) : [];
    const cartoes = gente.map(p => {
      const aberto = sel === p.id;
      const cab = h('button', { type: 'button', class: 'pcard' + (aberto ? ' sel' : ''), id: 'pc-' + p.id, 'aria-expanded': String(aberto), onclick: () => { focoDepois = 'pc-' + p.id; selecionar(aberto ? null : p.id); } },
        h('span', { class: 'av' }, p.img ? h('img', { src: p.img, alt: '' }) : iniciais(p.nome)),
        h('span', { class: 'tit' }, p.nome, nomeDoDono(p.dono) ? h('small', { text: ' · de ' + nomeDoDono(p.dono) }) : null),
        h('span', { class: 'note', text: p.semFicha ? '' : (p.recursos[0] ? p.recursos[0].nome + ' ' + p.recursos[0].atual + '/' + p.recursos[0].max : '') }),
        aberto && !p.semFicha ? h('span', { class: 'med' },
          ...p.recursos.map((r, k) => medidor(r.nome, r.atual, r.max, k === 0 ? 'var(--hp)' : k === 1 ? 'var(--sp)' : 'var(--outro)')),
          p.san != null ? medidor('Sanidade', p.san, 100, 'var(--san)') : null,
          p.conf != null ? medidor('Conforto', p.conf, 100, 'var(--conf)') : null,
          ...p.poderes.filter(x => x.max > 0).map(x => medidor(x.nome, x.atual, x.max, 'var(--outro)'))) : null,
        aberto && p.semFicha ? h('span', { class: 'med note', text: 'A ficha deste personagem não está à vista para você.' }) : null);
      const acoes = aberto ? h('div', { class: 'cartao' }, h('div', { class: 'lin' },
        naCasca() && !p.semFicha ? h('button', { type: 'button', class: 'btn sm', text: 'Abrir a ficha', onclick: () => TC.ponte.ir('fichas', { pc: p.id }) }) : null,
        mestre() && camp.lugares[p.id] ? h('button', { type: 'button', class: 'btn sm', text: 'Voltar ao lugar padrão', onclick: () => mudar('lugar de ' + p.nome, c => { delete c.lugares[p.id]; }) }) : null,
        mestre() ? h('button', { type: 'button', class: 'btn sm per', text: 'Tirar do acampamento', onclick: () => { const nome = p.nome; sel = null; if (mudar('tirar ' + nome + ' do acampamento', c => { c.presentes = c.presentes.filter(x => x !== p.id); delete c.lugares[p.id]; })) { manterRoda(); toast(nome + ' saiu do acampamento.', 'Desfazer', desfazer); } } }) : null)) : null;
      return [cab, acoes];
    });
    const chamar = mestre() && fora.length ? h('select', { class: 'in', id: 'chamar', 'aria-label': 'Chamar para o acampamento', onchange: e => { const id = e.target.value; if (!id) return; const l = linha(id); mudar('chamar ' + (l ? l.nome : 'personagem'), c => { c.presentes.push(id); if (!c.autoVistos.includes(id)) c.autoVistos.push(id); }); manterRoda(); } },
      h('option', { value: '', text: '+ Chamar para o acampamento…' }), ...fora.map(l => h('option', { value: l.id, text: l.nome || 'Sem nome' }))) : null;
    const bonus = camp.bonus.map(b => h('div', { class: 'cartao' },
      h('div', { class: 'lin' }, campoTexto('bn-n-' + b.id, b.nome, 'Nome do bônus', v => mudar('renomear o bônus', c => { acha(c.bonus, b.id).nome = v; }), { placeholder: 'Nome do bônus' }),
        mestre() ? botaoIcone('bn-x-' + b.id, X, 'Tirar o bônus ' + (b.nome || ''), () => { if (mudar('tirar o bônus ' + (b.nome || ''), c => { c.bonus = c.bonus.filter(x => x.id !== b.id); })) toast('Bônus tirado.', 'Desfazer', desfazer); }) : null),
      mestre() || b.desc ? campoArea('bn-d-' + b.id, b.desc, 'O que o bônus faz', v => mudar('descrever o bônus', c => { acha(c.bonus, b.id).desc = v; }), 'O que ele faz — ex.: +1 nas rolagens de quem dormiu bem') : null,
      h('label', { class: 'sw' }, h('input', { type: 'checkbox', id: 'bn-a-' + b.id, checked: b.ateDescanso, disabled: !mestre(), onchange: e => mudar('duração do bônus', c => { acha(c.bonus, b.id).ateDescanso = e.target.checked; }) }), 'Acaba no próximo descanso')));
    return [
      h('h3', { text: 'Em volta da fogueira' }),
      h('p', { class: 'sub', text: gente.length ? (gente.length === 1 ? '1 personagem' : gente.length + ' personagens') + (mestre() ? ' · arraste cada um na cena para mudar de lugar' : '') : 'Ninguém ainda.' }),
      !naMesa() ? h('p', { class: 'note', text: 'Sem mesa aberta: aqui aparecem as fichas deste navegador, para consulta. O descanso mostra o que cada um recupera, mas só muda as fichas quando há uma mesa.' }) : null,
      h('div', { class: 'gente' }, cartoes),
      chamar,
      h('div', { class: 'sec' }, h('div', { class: 'rot' }, 'Bônus do acampamento', mestre() ? h('button', { type: 'button', class: 'btn sm', id: 'bn-novo', text: '+ Bônus', onclick: () => { const it = N.item('bonus'); focoDepois = 'bn-n-' + it.id; mudar('novo bônus', c => { c.bonus.push(it); }); } }) : null),
        bonus.length ? bonus : h('p', { class: 'note', text: mestre() ? 'Nenhum bônus. Use para o que a mesa combinar: "Moral alta", "Bênção do templo"…' : 'Nenhum bônus por enquanto.' })),
      mestre() ? h('div', { class: 'sec' }, h('div', { class: 'rot' }, 'A cena'),
        h('div', { class: 'lin', style: 'display:flex;gap:8px;flex-wrap:wrap' },
          h('button', { type: 'button', class: 'btn sm', id: 'fundoTrocar', text: camp.fundo ? 'Trocar a imagem de fundo' : 'Usar uma imagem de fundo', onclick: () => $('arq').click() }),
          camp.fundo ? h('button', { type: 'button', class: 'btn sm', id: 'fundoTirar', text: 'Voltar à ilustração', onclick: () => { if (mudar('voltar à ilustração', c => { c.fundo = null; })) toast('A ilustração voltou.', 'Desfazer', desfazer); } }) : null,
          Object.keys(camp.lugares).length ? h('button', { type: 'button', class: 'btn sm', id: 'arrumar', text: 'Arrumar todos em volta do fogo', onclick: () => { if (mudar('arrumar a roda', c => { c.lugares = {}; })) toast('Todos de volta aos lugares em volta do fogo.', 'Desfazer', desfazer); } }) : null)) : null,
    ];
  }
  function abaProvisoes() {
    const rac = N.racoes(camp), n = presentes().length, porP = camp.regras.longo.prov, ef = N.efeitos(camp), custo = Math.max(0, porP * n + ef.prov);
    const sobe = (id, d) => mudar('reordenar as provisões', c => { const i = c.provisoes.findIndex(x => x.id === id), k = i + d; if (i < 0 || k < 0 || k >= c.provisoes.length) return false; c.provisoes.splice(k, 0, c.provisoes.splice(i, 1)[0]); });
    const lista = camp.provisoes.map((p, i) => h('div', { class: 'cartao' + (p.qtd ? '' : ' off') }, h('div', { class: 'lin' },
      mestre() ? botaoIcone('pv-up-' + p.id, CIMA, 'Gastar antes', () => { focoDepois = 'pv-up-' + p.id; sobe(p.id, -1); }, { disabled: i === 0 }) : null,
      mestre() ? botaoIcone('pv-dn-' + p.id, BAIXO, 'Gastar depois', () => { focoDepois = 'pv-dn-' + p.id; sobe(p.id, 1); }, { disabled: i === camp.provisoes.length - 1 }) : null,
      campoTexto('pv-n-' + p.id, p.nome, 'Nome da provisão', v => mudar('renomear a provisão', c => { acha(c.provisoes, p.id).nome = v; }), { placeholder: 'Ex.: carne seca' }),
      h('span', { class: 'passo' },
        mestre() ? botaoIcone('pv-m-' + p.id, MENOS, 'Tirar uma ração de ' + (p.nome || 'provisão'), () => { focoDepois = 'pv-m-' + p.id; mudar('rações de ' + (p.nome || 'provisão'), c => { const x = acha(c.provisoes, p.id); x.qtd = Math.max(0, x.qtd - 1); }, { junta: 'qtd:' + p.id }); }, { disabled: p.qtd <= 0 }) : null,
        mestre() ? campoNum('pv-q-' + p.id, p.qtd, 'Rações de ' + (p.nome || 'provisão'), v => mudar('rações de ' + (p.nome || 'provisão'), c => { acha(c.provisoes, p.id).qtd = v; }), 0, 9999) : h('b', { text: String(p.qtd) }),
        mestre() ? botaoIcone('pv-p-' + p.id, MAIS, 'Pôr uma ração em ' + (p.nome || 'provisão'), () => { focoDepois = 'pv-p-' + p.id; mudar('rações de ' + (p.nome || 'provisão'), c => { acha(c.provisoes, p.id).qtd += 1; }, { junta: 'qtd:' + p.id }); }) : null),
      mestre() ? botaoIcone('pv-x-' + p.id, X, 'Tirar ' + (p.nome || 'a provisão') + ' da lista', () => { if (mudar('tirar ' + (p.nome || 'a provisão'), c => { c.provisoes = c.provisoes.filter(x => x.id !== p.id); })) toast((p.nome || 'Provisão') + ' saiu da lista.', 'Desfazer', desfazer); }) : null)));
    return [
      h('h3', { text: 'Provisões' }),
      h('p', { class: 'sub', id: 'provResumo', text: (rac === 1 ? '1 ração guardada' : rac + ' rações guardadas') + (n ? ' · o descanso longo gasta ' + custo + ' (' + porP + ' por personagem' + (ef.prov ? ', ' + N.comSinal(ef.prov) + ' da estrutura' : '') + ')' : '') }),
      lista.length ? lista : h('p', { class: 'note', text: 'Nenhuma provisão guardada. Cada unidade vale uma ração.' }),
      mestre() ? h('button', { type: 'button', class: 'btn', id: 'pv-novo', text: '+ Provisão', onclick: () => { const it = N.item('provisoes'); focoDepois = 'pv-n-' + it.id; mudar('nova provisão', c => { c.provisoes.push(it); }); } }) : null,
      lista.length > 1 ? h('p', { class: 'note', text: 'No descanso, as rações saem de cima para baixo.' }) : null,
    ];
  }
  function cartaoEstrutura(tipo, m) {
    const pre = tipo === 'melhorias' ? 'ml' : 'eq', nomeTipo = tipo === 'melhorias' ? 'melhoria' : 'equipamento';
    const set = (rotulo, fn) => mudar(rotulo, c => { fn(acha(c[tipo], m.id)); });
    const ef = (k, rotulo, min, max) => h('label', {}, rotulo, campoNum(`${pre}-${k}-${m.id}`, m.ef[k], rotulo + ' de ' + (m.nome || nomeTipo), v => set('efeito de ' + (m.nome || nomeTipo), x => { x.ef[k] = v; }), min, max));
    return h('div', { class: 'cartao' + (m.on ? '' : ' off') },
      h('div', { class: 'lin' },
        h('input', { type: 'checkbox', id: `${pre}-on-${m.id}`, checked: m.on, disabled: !mestre(), title: 'Em uso', 'aria-label': (m.nome || nomeTipo) + ' em uso', onchange: e => set((e.target.checked ? 'usar ' : 'deixar de usar ') + (m.nome || nomeTipo), x => { x.on = e.target.checked; }) }),
        campoTexto(`${pre}-n-${m.id}`, m.nome, 'Nome', v => set('renomear ' + nomeTipo, x => { x.nome = v; }), { placeholder: tipo === 'melhorias' ? 'Ex.: fogão de pedra' : 'Ex.: sacos de dormir' }),
        tipo === 'equipamentos' ? campoNum(`eq-q-${m.id}`, m.qtd, 'Quantidade', v => set('quantidade de ' + (m.nome || nomeTipo), x => { x.qtd = v; }), 0, 999) : null,
        mestre() ? botaoIcone(`${pre}-x-${m.id}`, X, 'Tirar ' + (m.nome || nomeTipo), () => { if (mudar('tirar ' + (m.nome || nomeTipo), c => { c[tipo] = c[tipo].filter(x => x.id !== m.id); })) toast((m.nome || 'Item') + ' saiu da lista.', 'Desfazer', desfazer); }) : null),
      mestre() || m.desc ? campoArea(`${pre}-d-${m.id}`, m.desc, 'Descrição', v => set('descrever ' + nomeTipo, x => { x.desc = v; }), 'O que é, como foi conseguido, o que faz…') : null,
      h('div', { class: 'efs' }, ef('conf', 'Conforto', -100, 100), ef('san', 'Sanidade', -100, 100), ef('rec', 'Recup. %', -100, 100), ef('prov', 'Rações', -99, 99)));
  }
  function abaEstrutura() {
    const txt = N.textoEfeitos(N.efeitos(camp));
    const secao = (tipo, titulo, botao, vazio) => h('div', { class: 'sec' },
      h('div', { class: 'rot' }, titulo, mestre() ? h('button', { type: 'button', class: 'btn sm', id: (tipo === 'melhorias' ? 'ml' : 'eq') + '-novo', text: botao, onclick: () => { const it = N.item(tipo); focoDepois = (tipo === 'melhorias' ? 'ml' : 'eq') + '-n-' + it.id; mudar(tipo === 'melhorias' ? 'nova melhoria' : 'novo equipamento', c => { c[tipo].push(it); }); } }) : null),
      camp[tipo].length ? camp[tipo].map(m => cartaoEstrutura(tipo, m)) : h('p', { class: 'note', text: vazio }));
    return [
      h('h3', { text: 'Estrutura' }),
      h('p', { class: 'sub', id: 'estResumo', text: txt ? 'No descanso longo, o que está em uso soma: ' + txt + '.' : 'O que está em uso soma seus efeitos ao descanso longo.' }),
      secao('melhorias', 'Melhorias', '+ Melhoria', 'Nenhuma melhoria. Ex.: fogão de pedra, paliçada, poço.'),
      secao('equipamentos', 'Equipamentos', '+ Equipamento', 'Nenhum equipamento. Ex.: barracas, sacos de dormir, panela de ferro.'),
      h('p', { class: 'note', text: 'Efeitos: Conforto e Sanidade em pontos por descanso longo; recuperação em % a mais das barras; rações a mais (ou, com sinal de menos, a menos) por descanso.' }),
    ];
  }
  const dataCurta = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  function abaDiario() {
    const rg = camp.regras;
    const regra = (tipo, k, rotulo, min, max) => campoNum(`rg-${tipo}-${k}`, rg[tipo][k], rotulo, v => mudar('regras do descanso', c => { c.regras[tipo][k] = v; }), min, max);
    // O mestre recomeça o diário (um grupo novo, uma campanha nova): confirma antes, e dá para desfazer depois.
    const limparDiario = () => {
      const n = camp.diario.length;
      abrirJanela('Limpar o Diário?', h('p', { text: (n === 1 ? 'A anotação do Diário sai' : 'As ' + n + ' anotações do Diário saem') + ' para todos. As provisões, a estrutura e as fichas não mudam. Dá para desfazer logo em seguida.' }),
        [h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fecharJanela }),
          h('button', { type: 'button', class: 'btn per', id: 'di-limpar-ok', text: 'Limpar o Diário', onclick: () => { fecharJanela(); if (mudar('limpar o Diário', c => { c.diario = []; })) toast(n === 1 ? 'Diário limpo: 1 anotação saiu.' : 'Diário limpo: ' + n + ' anotações saíram.', 'Desfazer', desfazer, 15000); } })]);
    };
    return [
      h('div', { class: 'lin', style: 'display:flex;gap:8px;align-items:baseline' }, h('h3', { style: 'flex:1', text: 'Diário' }),
        mestre() && camp.diario.length ? h('button', { type: 'button', class: 'btn sm', id: 'di-limpar', text: 'Limpar o Diário…', onclick: limparDiario }) : null),
      h('p', { class: 'sub', text: 'Os descansos e os momentos do acampamento.' }),
      mestre() ? h('form', { class: 'lin', style: 'display:flex;gap:8px', onsubmit: e => { e.preventDefault(); const c0 = $('di-txt'), v = c0.value.trim(); if (!v) return; focoDepois = 'di-txt'; mudar('anotar no diário', c => { c.diario.unshift({ id: N.novoId('di'), t: Date.now(), texto: v }); }); } },
        h('input', { class: 'in', id: 'di-txt', maxlength: 600, placeholder: 'Anotar algo que aconteceu…', 'aria-label': 'Anotação para o diário', autocomplete: 'off' }), h('button', { type: 'submit', class: 'btn', text: 'Anotar' })) : null,
      h('div', { class: 'diario', id: 'diario' }, camp.diario.length ? camp.diario.map(d => h('div', { class: 'dl' }, h('time', { text: dataCurta(d.t) }),
        h('div', { class: 'lin', style: 'display:flex;gap:8px;align-items:flex-start' }, h('span', { style: 'flex:1;white-space:pre-wrap', text: d.texto }),
          mestre() ? botaoIcone('di-x-' + d.id, X, 'Apagar esta linha do diário', () => { if (mudar('apagar linha do diário', c => { c.diario = c.diario.filter(x => x.id !== d.id); })) toast('Linha apagada.', 'Desfazer', desfazer); }) : null))) : h('p', { class: 'note', text: 'Nada anotado ainda.' })),
      mestre() ? h('details', { class: 'dobra sec', id: 'regras', open: guarda.ler('tinycats:acampamento:regras') === '1', ontoggle: e => guarda.gravar('tinycats:acampamento:regras', e.target.open ? '1' : '0') }, h('summary', { text: 'Regras do descanso' }),
        h('div', { class: 'regras' },
          h('span', { class: 'cab', text: '' }), h('span', { class: 'cab', text: 'Longo' }), h('span', { class: 'cab', text: 'Curto' }),
          h('span', { text: 'Recupera (% de cada barra)' }), regra('longo', 'rec', 'Descanso longo: recupera % de cada barra', 0, 100), regra('curto', 'rec', 'Descanso curto: recupera % de cada barra', 0, 100),
          h('span', { text: 'Rações por personagem' }), regra('longo', 'prov', 'Descanso longo: rações por personagem', 0, 99), regra('curto', 'prov', 'Descanso curto: rações por personagem', 0, 99),
          h('span', { text: 'Conforto' }), regra('longo', 'conf', 'Descanso longo: Conforto', -100, 100), regra('curto', 'conf', 'Descanso curto: Conforto', -100, 100),
          h('span', { text: 'Sanidade' }), regra('longo', 'san', 'Descanso longo: Sanidade', -100, 100), regra('curto', 'san', 'Descanso curto: Sanidade', -100, 100),
          h('span', { text: 'Devolve os poderes gastos' }),
          h('input', { type: 'checkbox', id: 'rg-longo-poderes', checked: rg.longo.poderes, 'aria-label': 'Descanso longo devolve os poderes gastos', onchange: e => mudar('regras do descanso', c => { c.regras.longo.poderes = e.target.checked; }) }),
          h('input', { type: 'checkbox', id: 'rg-curto-poderes', checked: rg.curto.poderes, 'aria-label': 'Descanso curto devolve os poderes gastos', onchange: e => mudar('regras do descanso', c => { c.regras.curto.poderes = e.target.checked; }) })),
        h('p', { class: 'note', id: 'rg-comeco', text: 'A barra que “começa em” um valor próprio (na ficha, em Opções da barra) não recupera por porcentagem: o descanso longo a leva de volta ao começo dela, e o curto não mexe nela. Recuperar 100% enche também a barra que estava abaixo de zero.' }),
        h('p', { class: 'note', text: 'Quando faltam rações para o descanso longo:' }),
        h('div', { class: 'regras' },
          h('span', { text: 'A recuperação fica em (% do normal)' }), campoNum('rg-sem-rec', rg.semProv.rec, 'Sem rações: a recuperação fica em % do normal', v => mudar('regras do descanso', c => { c.regras.semProv.rec = v; }), 0, 100), h('span'),
          h('span', { text: 'Conforto' }), campoNum('rg-sem-conf', rg.semProv.conf, 'Sem rações: Conforto', v => mudar('regras do descanso', c => { c.regras.semProv.conf = v; }), -100, 100), h('span')),
        h('button', { type: 'button', class: 'btn sm', id: 'rg-padrao', text: 'Voltar às regras padrão', onclick: () => { if (mudar('voltar às regras padrão', c => { c.regras = N.copia(N.REGRAS_PADRAO); })) toast('Regras de volta ao padrão.', 'Desfazer', desfazer); } })) : null,
    ];
  }

  /* ---------------- janelas ---------------- */
  const dlg = $('dlg');
  function abrirJanela(titulo, corpo, botoes) {
    dlg.replaceChildren(h('div', { class: 'dl-h' }, h('h2', { text: titulo })), h('div', { class: 'dl-b' }, corpo), h('div', { class: 'dl-f' }, botoes));
    if (!dlg.open) dlg.showModal();
  }
  function fecharJanela() { if (dlg.open) dlg.close(); dlg.replaceChildren(); }
  dlg.addEventListener('click', ev => { if (ev.target === dlg) fecharJanela(); });
  dlg.addEventListener('close', () => { if (!dlg.open) dlg.replaceChildren(); });

  /* ---- o descanso ---- */
  const seta = (de, para, sufixo) => (para === de ? h('span', { class: 'igual', text: de + (sufixo || '') }) : h('span', {}, de + ' → ', h('b', { text: para + (sufixo || '') })));
  function abrirDescanso(tipo) {
    if (!mestre()) return;
    const todos = presentes().filter(p => !p.semFicha);
    if (!todos.length) { toast('Não há ninguém com ficha em volta da fogueira. Chame os personagens pela aba Grupo.'); return; }
    const marcados = new Set(todos.map(p => p.id)), longo = tipo !== 'curto';
    const corpo = h('div', { style: 'display:grid;gap:10px' });
    const confirmar = h('button', { type: 'button', class: 'btn pri', id: 'ds-ok', text: 'Descansar' });
    let plano = null;
    const refazer = () => {
      plano = N.planejar(camp, tipo, todos.filter(p => marcados.has(p.id)));
      const sobra = plano.disponivel - plano.gasto;
      const avisos = [];
      if (plano.custo > 0) avisos.push(h('div', { class: 'aviso' + (plano.falta ? ' ruim' : ''), id: 'ds-prov' },
        plano.falta ? `Faltam ${plano.falta} ${plano.falta === 1 ? 'ração' : 'rações'}: há ${plano.disponivel}, o descanso pede ${plano.custo}. A recuperação cai para ${camp.regras.semProv.rec}% do normal` + (camp.regras.semProv.conf ? ` e o Conforto leva ${N.comSinal(camp.regras.semProv.conf)}.` : '.')
          : `Provisões: gasta ${plano.gasto} de ${plano.disponivel} ${plano.disponivel === 1 ? 'ração' : 'rações'}` + (plano.consumo.length ? ' (' + plano.consumo.map(g => (g.nome || 'provisão') + ' −' + g.qtd).join(', ') + ')' : '') + `. Sobram ${sobra}.`));
      else if (longo) avisos.push(h('div', { class: 'aviso', id: 'ds-prov', text: 'Este descanso não gasta provisões.' }));
      const txt = N.textoEfeitos(plano.efeitos);
      if (longo && txt) avisos.push(h('div', { class: 'aviso', text: 'A estrutura em uso soma: ' + txt + '.' }));
      if (!naMesa()) avisos.push(h('div', { class: 'aviso', text: 'Sem mesa aberta, as fichas não são alteradas: os valores abaixo são para você aplicar. As provisões e o diário, sim, são atualizados.' }));
      const linhasT = todos.map(p => {
        const ln = plano.linhas.find(x => x.id === p.id), dentroD = !!ln;
        return h('tr', { class: dentroD ? '' : 'fora' },
          h('td', {}, h('label', { class: 'sw', style: 'color:var(--fg);font-weight:600' }, h('input', { type: 'checkbox', id: 'ds-' + p.id, checked: dentroD, onchange: e => { if (e.target.checked) marcados.add(p.id); else marcados.delete(p.id); refazer(); const c0 = document.getElementById('ds-' + p.id); if (c0) c0.focus(); } }), p.nome)),
          h('td', {}, dentroD ? h('div', { class: 'mud' }, ...ln.recursos.map(r => h('span', r.inicio != null ? { title: longo ? 'Esta barra começa em ' + r.inicio + ': o descanso longo a leva de volta para lá' : 'Esta barra tem um começo próprio: o descanso curto não mexe nela' } : {}, r.nome + ' ', seta(r.de, r.para, '/' + r.max), r.inicio != null && longo && r.para !== r.de ? ' (volta ao começo)' : '')), ...ln.poderes.map(x => h('span', {}, x.nome + ' ', seta(x.de, x.para)))) : h('span', { class: 'note', text: 'fica de fora' })),
          h('td', {}, dentroD && ln.san ? h('div', { class: 'mud' }, seta(ln.san.de, ln.san.para)) : '—'),
          h('td', {}, dentroD && ln.conf ? h('div', { class: 'mud' }, seta(ln.conf.de, ln.conf.para)) : '—'));
      });
      corpo.replaceChildren(...avisos, h('table', { class: 'plano' }, h('thead', {}, h('tr', {}, h('th', { text: 'Quem descansa' }), h('th', { text: 'Barras' }), h('th', { text: 'Sanidade' }), h('th', { text: 'Conforto' }))), h('tbody', {}, linhasT)));
      confirmar.disabled = !plano.n;
    };
    confirmar.addEventListener('click', () => { const p = plano; fecharJanela(); descansar(p); });
    refazer();
    abrirJanela(longo ? 'Descanso longo' : 'Descanso curto', corpo, [h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fecharJanela }), confirmar]);
    confirmar.focus();
  }
  function descansar(plano) {
    const fichas = [];
    if (naMesa()) {
      for (const ln of plano.linhas) {
        const l = P.pegar(ln.id); if (!l) continue;
        const est = N.copia(l.estado || {}), rec = est.rec && typeof est.rec === 'object' ? est.rec : (est.rec = {});
        // (a barra que voltou ao começo dela fica sem valor anotado: é o mesmo que o "voltar ao começo" da ficha)
        for (const r of ln.recursos) if (r.para !== r.de) { if (r.inicio != null && r.para === r.inicio) delete rec[r.id]; else rec[r.id] = r.para; }
        if (ln.san) est.san = ln.san.para;
        if (ln.conf) est.conf = ln.conf.para;
        const campos = { estado: est }, antes = { id: l.id, estado: l.estado || {}, ficha: null };
        if (ln.poderes.length) {
          const f = N.copia(l.ficha || {});
          for (const pw of (Array.isArray(f.poderes) ? f.poderes : [])) { const x = ln.poderes.find(y => y.id === pw.id); if (x) pw.atual = x.para; }
          campos.ficha = f; antes.ficha = l.ficha || {};
        }
        fichas.push(antes);
        P.gravar(l.id, campos);
      }
    }
    const rotulo = plano.tipo === 'longo' ? 'o descanso longo' : 'o descanso curto', resumo = N.resumoDescanso(plano);
    pilha.push({ rotulo, json: jCamp, junta: null, fichas, publicar: true });
    if (pilha.length > 60) pilha.shift();
    camp = N.aposDescanso(camp, plano, Date.now());
    gravar(); pintar();
    publicar(camp.nome, resumo);
    toast(resumo + '.', 'Desfazer', desfazer, 15000);
  }

  /* ---- um momento entre dois personagens ---- */
  function abrirMomento() {
    if (!mestre() || !naMesa()) return;
    const gente = presentes().filter(p => !p.semFicha);
    if (gente.length < 2) { toast('Um momento precisa de dois personagens com ficha em volta da fogueira.'); return; }
    const estado = { a: sel && gente.some(p => p.id === sel) ? sel : gente[0].id, b: null, da: 5, db: 5, texto: '' };
    estado.b = (gente.find(p => p.id !== estado.a) || gente[1]).id;
    const corpo = h('div', { style: 'display:grid;gap:12px' });
    const ok = h('button', { type: 'button', class: 'btn pri', id: 'mo-ok', text: 'Registrar o momento' });
    const nome = id => (gente.find(p => p.id === id) || {}).nome || '?';
    const relAtual = (de, para) => { const l = P.pegar(de), e = l && l.estado && Array.isArray(l.estado.rel) ? l.estado.rel.find(x => x && x.alvo === para) : null; return e ? N.limitar(Math.round(+e.v || 0), -100, 100) : 0; };
    const desenhar = () => {
      const opcoes = (atual, outro) => gente.filter(p => p.id !== outro).map(p => h('option', { value: p.id, selected: p.id === atual ? '' : null, text: p.nome }));
      const linhaRel = (de, para, chave, id) => { const v0 = relAtual(de, para), v1 = N.limitar(v0 + estado[chave], -100, 100); return h('div', { class: 'lin', style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' },
        h('span', { style: 'flex:1;min-width:200px', text: 'O que ' + nome(de) + ' sente por ' + nome(para) }),
        h('input', { class: 'in num', id, type: 'number', min: -50, max: 50, step: 1, value: estado[chave], 'aria-label': 'Quanto muda o que ' + nome(de) + ' sente por ' + nome(para), onchange: e => { estado[chave] = N.limitar(Math.round(+e.target.value) || 0, -50, 50); desenhar(); const c0 = document.getElementById(id); if (c0) c0.focus(); } }),
        h('span', { class: 'mud', style: 'font-family:var(--mono);min-width:96px' }, seta(N.comSinal(v0).replace('+0', '0').replace('−0', '0'), v1 === 0 ? '0' : N.comSinal(v1)))); };
      corpo.replaceChildren(
        h('div', { class: 'lin', style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' },
          h('select', { class: 'in', id: 'mo-a', style: 'flex:1;min-width:150px', 'aria-label': 'Primeiro personagem', onchange: e => { estado.a = e.target.value; desenhar(); } }, opcoes(estado.a, estado.b)), h('span', { text: 'e' }),
          h('select', { class: 'in', id: 'mo-b', style: 'flex:1;min-width:150px', 'aria-label': 'Segundo personagem', onchange: e => { estado.b = e.target.value; desenhar(); } }, opcoes(estado.b, estado.a))),
        linhaRel(estado.a, estado.b, 'da', 'mo-da'), linhaRel(estado.b, estado.a, 'db', 'mo-db'),
        h('textarea', { class: 'in', id: 'mo-txt', rows: 2, maxlength: 400, placeholder: 'O que aconteceu? (vai para o diário e para a mesa ao vivo)', 'aria-label': 'O que aconteceu', oninput: e => { estado.texto = e.target.value; } }, estado.texto),
        h('p', { class: 'note', text: 'Cada um tem a própria barra de Relacionamento pelo outro (de −100 a +100), na ficha. Se ainda não existe, é criada.' }));
      ok.disabled = !estado.da && !estado.db && !estado.texto.trim();
    };
    ok.addEventListener('click', () => { fecharJanela(); registrarMomento(estado, nome(estado.a), nome(estado.b)); });
    desenhar();
    abrirJanela('Um momento em volta da fogueira', corpo, [h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fecharJanela }), ok]);
  }
  function registrarMomento(m, nomeA, nomeB) {
    const fichas = [];
    const mexer = (de, para, nomePara, delta) => {
      if (!delta) return;
      const l = P.pegar(de); if (!l) return;
      const est = N.copia(l.estado || {}), rel = Array.isArray(est.rel) ? est.rel : [];
      let e = rel.find(x => x && x.alvo === para);
      if (!e) { e = { id: N.novoId('rel'), alvo: para, nome: nomePara, v: 0 }; rel.push(e); }
      e.v = N.limitar(Math.round(+e.v || 0) + delta, -100, 100);
      est.rel = rel;
      if (est.san == null) est.san = dentro(est.san, 100);           // a ficha passa a usar o painel de Sanidade e Conforto
      fichas.push({ id: l.id, estado: l.estado || {}, ficha: null });
      P.gravar(de, { estado: est });
    };
    mexer(m.a, m.b, nomeB, m.da); mexer(m.b, m.a, nomeA, m.db);
    const partes = [];
    if (m.da) partes.push(nomeA + ' → ' + nomeB + ' ' + N.comSinal(m.da));
    if (m.db) partes.push(nomeB + ' → ' + nomeA + ' ' + N.comSinal(m.db));
    const resumo = (m.texto.trim() ? m.texto.trim() + ' ' : '') + (partes.length ? '(' + partes.join(' · ') + ')' : '');
    const linhaD = 'Momento entre ' + nomeA + ' e ' + nomeB + (resumo ? ': ' + resumo : '');
    pilha.push({ rotulo: 'o momento entre ' + nomeA + ' e ' + nomeB, json: jCamp, junta: null, fichas, publicar: true });
    camp = N.normalizar(Object.assign(N.copia(camp), { diario: [{ id: N.novoId('di'), t: Date.now(), texto: linhaD }].concat(camp.diario) }));
    gravar(); pintar();
    publicar(camp.nome + ' · ' + nomeA + ' e ' + nomeB, resumo || 'Um momento em volta da fogueira.');
    toast('Momento registrado.', 'Desfazer', desfazer, 12000);
  }

  /* ---- a imagem de fundo ---- */
  async function reduzir(arq, lado, tipo) {
    let fonte, w, hh, fechar = () => {};
    try { const b = await createImageBitmap(arq); fonte = b; w = b.width; hh = b.height; fechar = () => { try { b.close(); } catch (e) { /* já fechada */ } }; }
    catch (e) { const u = URL.createObjectURL(arq); fonte = await new Promise((ok, falha) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => falha(new Error('Não deu para ler esta imagem.')); im.src = u; }); w = fonte.naturalWidth; hh = fonte.naturalHeight; fechar = () => URL.revokeObjectURL(u); }
    try {
      if (!w || !hh) throw new Error('Não deu para ler esta imagem.');
      const k = Math.min(1, lado / Math.max(w, hh)), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(hh * k));
      const cx = cv.getContext('2d'); cx.fillStyle = '#0d1017'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(fonte, 0, 0, cv.width, cv.height);
      const blob = await new Promise(r => cv.toBlob(r, tipo, 0.84));
      if (!blob) throw new Error('Não deu para preparar esta imagem.');
      return blob;
    } finally { fechar(); }
  }
  async function trocarFundo(arq) {
    if (!arq || !mestre()) return;
    if (!/^image\/(png|jpeg|webp)$/.test(arq.type || '')) { toast('Escolha uma imagem PNG, JPG ou WebP.'); return; }
    marcarSalvo(naMesa() ? 'Enviando a imagem…' : 'Preparando a imagem…');
    try {
      let url;
      if (naMesa()) url = await TC.arquivos.subir(await reduzir(arq, 2400, 'image/jpeg'));
      else { const b = await reduzir(arq, 1280, 'image/jpeg'); url = await new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => falha(r.error); r.readAsDataURL(b); }); }
      if (!mudar('trocar a imagem de fundo', c => { c.fundo = { url }; })) marcarSalvo('');
      else toast('Imagem de fundo trocada.', 'Desfazer', desfazer);
    } catch (e) { marcarSalvo(''); toast((e && e.message) || 'Não deu para usar esta imagem.'); }
  }

  /* ---- a cena tática (na aba Cenas) ---- */
  // As cenas para onde o "Mapa tático" pode ir: numa mesa, as da mesa (os documentos que a aba Cenas guarda);
  // fora dela, as que este navegador guarda (a aba Cenas deixa a lista para os outros sistemas).
  function listaCenas() {
    if (naMesa() && D) {
      const idx = D.pegar('cenas:indice'), ordem = idx && !idx.apagado && idx.dados && Array.isArray(idx.dados.ordem) ? idx.dados.ordem : [], cenas = [];
      for (const l of D.todas()) {
        const m = /^cena:([A-Za-z0-9_-]{1,60}):m$/.exec(l.id || '');
        if (m && !l.apagado && l.dados && m[1] !== 'pub' && m[1] !== 'pedido') cenas.push({ id: m[1], nome: String(l.dados.name || 'Cena') });
      }
      return cenas.sort((a, b) => (ordem.indexOf(a.id) + 1 || 1e9) - (ordem.indexOf(b.id) + 1 || 1e9));
    }
    try { const v = JSON.parse(guarda.ler('tinycats:cenas:lista') || 'null'); if (Array.isArray(v)) return v.filter(x => x && typeof x.id === 'string').map(x => ({ id: x.id, nome: String(x.nome || 'Cena') })); } catch (e) { /* lista estragada: como se não houvesse */ }
    return [];
  }
  let menu = null;
  function fecharMenu() { if (menu) { menu.remove(); menu = null; } }
  document.addEventListener('pointerdown', ev => { if (menu && !menu.contains(ev.target) && !ev.target.closest('#btCena')) fecharMenu(); });
  function abrirCena() {
    if (!naCasca()) return;
    if (menu) { fecharMenu(); return; }
    const cenas = listaCenas();
    if (camp.cena && cenas.some(c => c.id === camp.cena)) { TC.ponte.ir('cenas', { cena: camp.cena }); return; }
    const r = $('btCena').getBoundingClientRect();
    menu = h('div', { class: 'menu', id: 'menuCena', role: 'menu', style: `top:${r.bottom + 6}px;right:${Math.max(8, window.innerWidth - r.right)}px` },
      h('div', { class: 'rot', text: 'Qual é o mapa do acampamento?' }),
      ...cenas.map(c => h('button', { type: 'button', role: 'menuitem', text: c.nome, onclick: () => { fecharMenu(); mudar('ligar a cena do acampamento', x => { x.cena = c.id; }); TC.ponte.ir('cenas', { cena: c.id }); } })),
      h('button', { type: 'button', role: 'menuitem', id: 'cenaNova', text: '+ Criar uma cena nova para o acampamento', onclick: () => { fecharMenu(); const id = 'cena_acamp_' + Math.random().toString(36).slice(2, 9); mudar('criar a cena do acampamento', x => { x.cena = id; }); TC.ponte.ir('cenas', { criar: { id, nome: camp.nome } }); } }));
    document.body.append(menu);
  }

  /* ---------------- ligações fixas da página ---------------- */
  $('nome').addEventListener('change', e => { const v = e.target.value.trim(); if (!v) { e.target.value = camp.nome; return; } mudar('renomear o acampamento', c => { c.nome = v; }); });
  $('btDesfazer').addEventListener('click', desfazer);
  $('btPainel').addEventListener('click', () => { $('side').classList.toggle('fechado'); ajustarPalco(); });
  if (window.matchMedia('(max-width: 720px)').matches) $('side').classList.add('fechado');      // em tela estreita o painel é uma gaveta, que começa fechada
  $('btCurto').addEventListener('click', () => abrirDescanso('curto'));
  $('btLongo').addEventListener('click', () => abrirDescanso('longo'));
  $('btMomento').addEventListener('click', abrirMomento);
  $('btCena').addEventListener('click', abrirCena);
  $('btMundo').addEventListener('click', () => TC.ponte.ir('mundo'));
  $('arq').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; trocarFundo(f); });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && menu) { fecharMenu(); return; }
    if (!(ev.ctrlKey || ev.metaKey) || ev.altKey || (ev.key || '').toLowerCase() !== 'z' || ev.shiftKey || digitando() || dlg.open) return;
    if (mestre() && pilha.length) { ev.preventDefault(); desfazer(); }
  });
  window.addEventListener('resize', ajustarPalco);
  if (window.ResizeObserver) new ResizeObserver(ajustarPalco).observe($('palco'));
  window.addEventListener('storage', ev => {
    if (naMesa()) return;
    if (ev.key === FICHAS_LOCAL) pintar();
    else if (ev.key === CHAVE) { const novo = N.normalizar(lerLocal()), jn = j(novo); if (jn !== jCamp && !digitando()) { camp = novo; jCamp = jn; pilha = []; pintar(); } }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !naMesa()) pintar(); });   // as fichas podem ter mudado na outra aba

  /* ---------------- partida ---------------- */
  function lerLocal() { try { return JSON.parse(guarda.ler(CHAVE) || 'null'); } catch (e) { return null; } }
  async function partida() {
    desenharCenario();
    const TCx = window.TC;
    if (TCx && TCx.ponte) {
      st = await TCx.ponte.pronta;
      if (TCx.ponte.naCasca) document.documentElement.classList.add('na-casca');
      if (TCx.dados && TCx.dados.disponivel()) {
        modo = 'mesa';
        papel = st.papel === 'mestre' ? 'mestre' : 'jogador';
        P = TCx.dados.col('personagens'); D = TCx.dados.col('documentos');
        await Promise.all([P.pronta, D.pronta]);
      }
      TCx.ponte.aoMudar(e => { const antes = j(st.membros); st = e; if (pronto && antes !== j(e.membros)) { manterRoda(); pintar(); } });
    }
    if (naMesa()) {
      const d = D.pegar(DOC);
      camp = N.normalizar(d && !d.apagado ? d.dados : null);
      jCamp = j(camp);
      marcarSalvo('Salvo na mesa');
      D.aoMudar(l => { if (!l) return; if (l.id === DOC) deFora(); else if (l.id === 'fichas:cfg' || l.id === 'arvore:biblioteca' || l.id === 'arvore:pacote') pintar(); });
      P.aoMudar(() => { if (arrasto) return; manterRoda(); if (!digitando() && !dlg.open) pintar(); else pintarCena(); });
    } else {
      camp = N.normalizar(lerLocal());
      jCamp = j(camp);
      marcarSalvo('Salvo neste navegador');
    }
    pronto = true;
    manterRoda();
    pintar();
  }
  if (DEBUG) window.__acamp = { N, get camp() { return camp; }, get pilha() { return pilha; }, mudar, desfazer, presentes, pessoa, abrirDescanso, descansar, get modo() { return modo; }, get papel() { return papel; }, get pronto() { return pronto; } };
  partida().catch(e => {
    console.error(e);
    $('vazio').hidden = false;
    $('vazio').replaceChildren(h('strong', { text: 'Não deu para abrir o acampamento da mesa. ' }), (e && e.message) || '', ' ', h('button', { type: 'button', class: 'btn sm', text: 'Tentar de novo', onclick: () => location.reload() }));
  });
})();
