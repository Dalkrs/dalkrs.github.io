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
  const CHAVE = 'tinycats:acampamento:v1', FICHAS_LOCAL = 'urgm_calc_atributos_v1';
  /* O documento do acampamento na mesa. Numa mesa com campanhas, cada campanha tem o acampamento dela
     ("acampamento@<campanha>"): esta página mostra o da campanha em vista (a casca a abre de novo quando ela muda). */
  let DOC = 'acampamento', campId = null;
  const DEBUG = /[?&]debug(?:[=&]|$)/.test(location.search);
  const NS = 'http://www.w3.org/2000/svg';
  const HORA_NOME = { entardecer: 'Entardecer', noite: 'Noite', amanhecer: 'Amanhecer' };
  const ABAS = [['grupo', 'Grupo'], ['provisoes', 'Provisões'], ['estrutura', 'Estrutura'], ['caravana', 'Caravana'], ['diario', 'Diário']];

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
  let encerrada = false;                             // a campanha em vista está encerrada: o acampamento é só para consulta
  let camp = N.normalizar(null), jCamp = j(camp);
  let pilha = [];                                    // desfazer: [{ rotulo, json, fichas? }]
  let sel = null, aba = guarda.ler('tinycats:acampamento:aba') || 'grupo';
  let pronto = false;
  const mestre = () => papel === 'mestre';
  // quem usa mestra a aba tal? (o mestre auxiliar pode mestrar o Acampamento sem mestrar as Fichas ou a Árvore)
  const mestraAba = aba => { const T = window.TC && window.TC.ponte; return naMesa() && T && typeof T.mestra === 'function' ? T.mestra(aba) : mestre(); };
  const naMesa = () => modo === 'mesa';
  const naCasca = () => !!(window.TC && TC.ponte && TC.ponte.naCasca);
  // (dono de ficha: qualquer participante menos o mestre — o mestre auxiliar conta, mestrando ou jogando)
  const ehJogador = id => !!id && (st.membros || []).some(m => m.id === id && (m.cargo ? m.cargo !== 'mestre' : m.papel === 'jogador'));

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
    if (naMesa()) { const d = D.pegar(mestraAba('arvore') ? 'arvore:biblioteca' : 'arvore:pacote'); return d && d.dados && Array.isArray(d.dados.arvores) ? d.dados : null; }
    const s = estadoLocalFichas(); return (s && s.bib) || null;
  }
  const dentro = (v, padrao) => (v != null && v !== '' && Number.isFinite(+v) ? N.limitar(Math.round(+v), 0, 100) : padrao);
  /* Uma pessoa do acampamento, com o que der para saber dela. Quem não tem a ficha à vista (o jogador olhando o
     personagem de outro) aparece só com nome e imagem. */
  /* A emoção de alguém (a aura em volta do retrato). Numa mesa ela fica na ficha (estado.emo: o dono e o mestre
     mudam); quem não vê a ficha dele a recebe pela roda, que o mestre mantém. Sem mesa, fica no acampamento. */
  function emoDe(id, l) {
    if (!naMesa()) return camp.emo[id] || null;
    if (l) return N.emoOk(l.estado && l.estado.emo);
    const r = camp.roda.find(x => x.id === id);
    return r && r.emo ? r.emo : null;
  }
  function pessoa(id) {
    const l = linha(id), r0 = camp.roda.find(x => x.id === id);
    if (!l) return r0 ? { id, nome: r0.nome || 'Sem nome', img: imagemOk(r0.img), dono: r0.dono, semFicha: true, recursos: [], san: null, conf: null, poderes: [], grupo: '', emo: emoDe(id, null) } : null;
    const est = l.estado || {}, ficha = l.ficha || {};
    let recursos = [];
    try {
      const pc = Object.assign({}, ficha, { id: l.id, nome: l.nome });
      recursos = R().resumo(pc, cfgAtual(), { arvore: R().bonusDaArvore(l.skills, bibAtual()) }, est).recursos.filter(x => x.max != null && Number.isFinite(x.max) && x.max > 0);
    } catch (e) { recursos = []; }
    const usa = est.san != null || est.conf != null || R().temRelacoes(est) || (mestre() && Object.keys(segDe(l.id)).length > 0) || ehJogador(l.dono_id);
    return {
      id, nome: l.nome || 'Sem nome', img: imagemOk(ficha.img), dono: l.dono_id || null, semFicha: false, recursos,
      san: usa ? dentro(est.san, 100) : null, conf: usa ? dentro(est.conf, 50) : null,
      poderes: (Array.isArray(ficha.poderes) ? ficha.poderes : []).filter(x => x && x.id).map(x => ({ id: x.id, nome: x.nome || 'Poder', atual: Math.max(0, +x.atual || 0), max: Math.max(0, +x.max || 0) })),
      grupo: String(ficha.grupo || '').trim(), emo: emoDe(id, l),
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
  /* O que o mestre guarda fora das fichas (documento que só ele recebe): o valor dos relacionamentos escondidos e
     os relacionamentos dos NPCs. As contas são as de TC.rules (as mesmas da aba Fichas). */
  const SEG = 'fichas:segredos';
  /* Esse documento é das Fichas: só quem mestra a aba Fichas o recebe. O mestre auxiliar pode mestrar o Acampamento
     sem ela — aí os segredos não chegam a ele, e ele NÃO os grava (gravaria por cima, sem ter lido). */
  const comSegredos = () => mestre() && mestraAba('fichas');
  const segredos = () => { const d = D && naMesa() && comSegredos() ? D.pegar(SEG) : null; return d && !d.apagado && d.dados && d.dados.v && typeof d.dados.v === 'object' ? d.dados.v : {}; };
  const segDe = id => { const s = segredos(); return (s.rel && s.rel[id]) || {}; };
  function porSeg(id, seg) {
    if (!naMesa() || !comSegredos()) return;
    const s = N.copia(segredos()), rel = s.rel && typeof s.rel === 'object' ? s.rel : (s.rel = {});
    if (seg && Object.keys(seg).length) rel[id] = seg; else delete rel[id];
    D.gravar(SEG, { dados: { v: s }, vis: 'mestre' });
  }
  function desfazer() {
    if (!mestre() || !pilha.length) return false;
    const p = pilha.pop();
    camp = N.normalizar(JSON.parse(p.json));
    if (p.fichas && naMesa()) for (const f of p.fichas) { const campos = { estado: f.estado }; if (f.ficha) campos.ficha = f.ficha; P.gravar(f.id, campos); if (f.seg !== undefined) porSeg(f.id, f.seg); }
    gravar();
    if (p.fichas) manterRoda();                        // (a roda acompanha as fichas que voltaram: a emoção, por exemplo)
    pintar();
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
      // (numa mesa com campanhas, entram sozinhos os personagens de jogador DESTA campanha; os do mundo e os das outras, só chamados)
      for (const l of todas) if (ehJogador(l.dono_id) && (!campId || l.campanha === campId) && !c.autoVistos.includes(l.id)) { c.autoVistos.push(l.id); if (!c.presentes.includes(l.id)) c.presentes.push(l.id); }
      // (a roda leva também a emoção de cada um: assim quem não vê a ficha de alguém vê a aura dele)
      c.roda = c.presentes.filter(id => ids.has(id)).map(id => { const l = todas.find(x => x.id === id), img = l.ficha && l.ficha.img, emo = N.emoOk(l.estado && l.estado.emo); return Object.assign({ id, nome: l.nome || 'Sem nome', img: typeof img === 'string' && /^https:\/\//.test(img) ? img : null, dono: l.dono_id || null }, emo ? { emo } : {}); });
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
      const lugar = lugares[i], emo = N.emocao(p.emo);
      // a aura da emoção é um brilho na cor dela, atrás do retrato (o nome dela vai na dica e no que o leitor de tela lê)
      const el = h('button', { type: 'button', class: 'pers' + (sel === p.id ? ' sel' : '') + (emo ? ' com-emo' : ''), 'data-id': p.id, 'data-pode': mestre() ? '' : null, 'data-emo': emo ? emo.k : null,
        style: `left:${lugar.x}%;top:${lugar.y}%` + (emo ? `;--emo:${emo.cor}` : ''), title: emo ? p.nome + ' · ' + emo.nome : null,
        'aria-label': p.nome + (emo ? ', ' + emo.nome.toLowerCase() : '') + (p.san != null ? `, Sanidade ${p.san}, Conforto ${p.conf}` : ''), 'aria-pressed': String(sel === p.id) },
        emo ? h('span', { class: 'aura', 'aria-hidden': 'true' }) : null,
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
    const ef = N.efeitos(camp), txt = N.textoEfeitos(ef), alguns = N.temParaAlguns(camp);
    // (sem melhorias em uso não há o que dizer da estrutura: o null sai no filtro — o navegador o escreveria na cena)
    $('avisosCena').replaceChildren(...[
      ...camp.bonus.map(b => h('span', { class: 'chip', title: b.desc || null }, h('b', { text: b.nome || 'Bônus' }), b.ateDescanso ? ' até o descanso' : null)),
      txt || alguns ? h('span', { class: 'chip', title: 'O que as melhorias e os equipamentos em uso somam ao descanso longo' }, 'Estrutura: ', h('b', { text: txt || 'só para alguns' }), txt && alguns ? ' · e mais, só para alguns' : null) : null].filter(Boolean));
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
    pane.replaceChildren(...({ grupo: abaGrupo, provisoes: abaProvisoes, estrutura: abaEstrutura, caravana: abaCaravana, diario: abaDiario }[aba])().flat(Infinity).filter(Boolean));
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
  /* ---- a emoção (a aura) ----
     Numa mesa: o dono do personagem muda a dele; quem mestra as Fichas, a de qualquer um (a emoção fica na ficha).
     Sem mesa: o mestre (fica no acampamento). Numa campanha encerrada, ninguém. */
  const podeEmo = p => !p.semFicha && (naMesa() ? !encerrada && ((!!p.dono && p.dono === st.eu) || (mestre() && mestraAba('fichas'))) : mestre());
  function porEmo(p, k) {
    const e = N.emocao(k);
    focoDepois = 'emo-' + p.id + '-' + (e ? e.k : 'nada');
    if (!naMesa()) { mudar('emoção de ' + p.nome, c => { if (e) c.emo[p.id] = e.k; else delete c.emo[p.id]; }); return; }
    const l = P.pegar(p.id); if (!l) return;
    const antes = l.estado || {}, est = Object.assign({}, antes);
    if ((antes.emo || null) === (e ? e.k : null)) { pintar(); return; }
    if (e) est.emo = e.k; else delete est.emo;
    if (mestre()) { pilha.push({ rotulo: 'a emoção de ' + p.nome, json: jCamp, junta: null, fichas: [{ id: l.id, estado: antes, ficha: null }] }); if (pilha.length > 60) pilha.shift(); }
    P.gravar(l.id, { estado: est });
    // (o que este aparelho grava não volta como mudança de fora: o mestre põe a emoção na roda aqui mesmo)
    manterRoda();
    pintar();
  }
  function seletorEmo(p) {
    return h('div', { class: 'emos', role: 'group', 'aria-label': 'Emoção de ' + p.nome },
      h('button', { type: 'button', id: 'emo-' + p.id + '-nada', 'aria-pressed': String(!p.emo), onclick: () => porEmo(p, null) }, 'Nenhuma'),
      N.EMOCOES.map(e => h('button', { type: 'button', id: 'emo-' + p.id + '-' + e.k, 'aria-pressed': String(p.emo === e.k), style: '--emo:' + e.cor, onclick: () => porEmo(p, e.k) }, h('span', { class: 'emo-dot', style: '--emo:' + e.cor }), e.nome)));
  }
  function abaGrupo() {
    const gente = presentes(), fora = mestre() ? linhas().filter(l => !camp.presentes.includes(l.id)).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR')) : [];
    const cartoes = gente.map(p => {
      const aberto = sel === p.id, emo = N.emocao(p.emo);
      const cab = h('button', { type: 'button', class: 'pcard' + (aberto ? ' sel' : ''), id: 'pc-' + p.id, 'aria-expanded': String(aberto), onclick: () => { focoDepois = 'pc-' + p.id; selecionar(aberto ? null : p.id); } },
        h('span', { class: 'av' }, p.img ? h('img', { src: p.img, alt: '' }) : iniciais(p.nome)),
        h('span', { class: 'tit' }, p.nome, emo ? h('span', { class: 'emo-dot', style: '--emo:' + emo.cor + ';margin-left:7px;vertical-align:1px', title: emo.nome, 'aria-label': emo.nome }) : null, nomeDoDono(p.dono) ? h('small', { text: ' · de ' + nomeDoDono(p.dono) }) : null),
        h('span', { class: 'note', text: p.semFicha ? '' : (p.recursos[0] ? p.recursos[0].nome + ' ' + p.recursos[0].atual + '/' + p.recursos[0].max : '') }),
        aberto && !p.semFicha ? h('span', { class: 'med' },
          ...p.recursos.map((r, k) => medidor(r.nome, r.atual, r.max, k === 0 ? 'var(--hp)' : k === 1 ? 'var(--sp)' : 'var(--outro)')),
          p.san != null ? medidor('Sanidade', p.san, 100, 'var(--san)') : null,
          p.conf != null ? medidor('Conforto', p.conf, 100, 'var(--conf)') : null,
          ...p.poderes.filter(x => x.max > 0).map(x => medidor(x.nome, x.atual, x.max, 'var(--outro)'))) : null,
        aberto && p.semFicha ? h('span', { class: 'med note', text: 'A ficha deste personagem não está à vista para você.' }) : null);
      const acoes = aberto ? h('div', { class: 'cartao' },
        podeEmo(p) ? [h('span', { class: 'note', text: 'Emoção — a aura em volta do retrato, que todos veem' }), seletorEmo(p)]
          : emo ? h('span', { class: 'note' }, 'Emoção: ', h('b', { text: emo.nome })) : null,
        h('div', { class: 'lin' },
        naCasca() && !p.semFicha ? h('button', { type: 'button', class: 'btn sm', text: 'Abrir a ficha', onclick: () => TC.ponte.ir('fichas', { pc: p.id }) }) : null,
        mestre() && camp.lugares[p.id] ? h('button', { type: 'button', class: 'btn sm', text: 'Voltar ao lugar padrão', onclick: () => mudar('lugar de ' + p.nome, c => { delete c.lugares[p.id]; }) }) : null,
        mestre() ? h('button', { type: 'button', class: 'btn sm per', text: 'Tirar do acampamento', onclick: () => { const nome = p.nome; sel = null; if (mudar('tirar ' + nome + ' do acampamento', c => { c.presentes = c.presentes.filter(x => x !== p.id); delete c.lugares[p.id]; })) { manterRoda(); toast(nome + ' saiu do acampamento.', 'Desfazer', desfazer); } } }) : null)) : null;
      return [cab, acoes];
    });
    // (com campanhas, a lista vem em grupos: os personagens da campanha em vista primeiro, depois os do mundo e os das outras)
    const opcao = l => h('option', { value: l.id, text: l.nome || 'Sem nome' });
    const grupos = naMesa() && TC.ponte.porCampanha ? TC.ponte.porCampanha(fora, l => l.campanha) : [{ nome: '', itens: fora }];
    const chamar = mestre() && fora.length ? h('select', { class: 'in', id: 'chamar', 'aria-label': 'Chamar para o acampamento', onchange: e => { const id = e.target.value; if (!id) return; const l = linha(id); mudar('chamar ' + (l ? l.nome : 'personagem'), c => { c.presentes.push(id); if (!c.autoVistos.includes(id)) c.autoVistos.push(id); }); manterRoda(); } },
      h('option', { value: '', text: '+ Chamar para o acampamento…' }), ...(grupos.length === 1 && !grupos[0].nome ? grupos[0].itens.map(opcao) : grupos.map(g => h('optgroup', { label: g.nome }, g.itens.map(opcao))))) : null;
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
  /* ---- o que uma ração ou a estrutura faz (no descanso e na ficha) ---- */
  // os painéis "Ao comer" e "Na ficha" que estão abertos (o painel é redesenhado a cada mudança)
  const abertos = new Set();
  const dobra = (id, resumo, ...corpo) => h('details', { class: 'efeito', id, open: abertos.has(id), ontoggle: e => { if (e.target.open) abertos.add(id); else abertos.delete(id); } }, h('summary', {}, resumo), corpo);
  // as barras das fichas (pelo nome), para escolher onde o efeito cai
  function nomesDeBarras(atual) {
    const nomes = new Set();
    for (const l of linhas()) for (const r of (l.ficha && Array.isArray(l.ficha.recursos) ? l.ficha.recursos : [])) if (r && r.nome) nomes.add(String(r.nome).trim());
    if (atual) nomes.add(atual);
    const lista = Array.from(nomes).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return lista.length ? lista : ['Vida'];
  }
  // as chaves de um bônus, em grupos (as mesmas da ficha)
  function opcoesDeChave(atual) {
    const RR = R(); if (!RR) return [h('option', { value: atual, text: atual, selected: true })];
    const nomes = RR.NOMES_BONUS, grupo = (rot, ks) => h('optgroup', { label: rot }, ks.map(k => h('option', { value: k, text: nomes[k] || k, selected: k === atual })));
    return [grupo('Atributos', RR.ATRIBS.map(a => a.k).concat(RR.CHAVE_TODOS)), grupo('Derivados', RR.DERIV.map(d => d.k)), grupo('Defesas', RR.DEFESAS.map(d => d.k)), grupo('Defesas específicas', RR.CHAVES_ESP)];
  }
  const textoFx = f => N.textoFx(f, R() ? R().NOMES_BONUS : null);
  function resumoEfeito(item, comEf) {
    const p = [];
    if (comEf) { const e = item.ef; if (e.conf) p.push('Conforto ' + N.comSinal(e.conf)); if (e.san) p.push('Sanidade ' + N.comSinal(e.san)); if (e.rec) p.push('recuperação ' + N.comSinal(e.rec) + '%'); }
    for (const f of item.fx) p.push(textoFx(f));
    return p.join(' · ');
  }
  /* Os efeitos na ficha (fx) de uma ração ou de um item da estrutura. set(rotulo, fn): mexe no item, no rascunho;
     pre: o começo dos ids dos campos. */
  // "a", "a e b", "a, b e c"
  const juntarE = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
  function editorFx(pre, item, set) {
    const linhaFx = f => {
      const muda = (rot, fn) => set(rot, x => { const g = x.fx.find(y => y.id === f.id); if (!g) return false; return fn(g); });
      const tipo = h('select', { class: 'in', id: `${pre}-fxt-${f.id}`, 'aria-label': 'O que o efeito faz', disabled: !mestre(),
        onchange: e => { focoDepois = `${pre}-fxt-${f.id}`; const t = e.target.value, b = nomesDeBarras()[0]; muda('efeito na ficha', g => { for (const k of Object.keys(g)) if (k !== 'id') delete g[k]; Object.assign(g, t === 'bonus' ? { t, k: 'FOR', v: 1, dur: 'descanso' } : t === 'barra' ? { t, b, val: '10' } : { t, b, v: 10 }); }); } },
        h('option', { value: 'bonus', text: 'Bônus', selected: f.t === 'bonus' }), h('option', { value: 'barra', text: 'Recupera', selected: f.t === 'barra' }), h('option', { value: 'sob', text: 'Sobrevida', selected: f.t === 'sob' }));
      let campos;
      if (f.t === 'bonus') campos = [
        h('select', { class: 'in chave', id: `${pre}-fxk-${f.id}`, 'aria-label': 'Onde o bônus soma', disabled: !mestre(), onchange: e => { focoDepois = `${pre}-fxk-${f.id}`; muda('bônus na ficha', g => { g.k = e.target.value; }); } }, opcoesDeChave(f.k)),
        h('input', { class: 'in val', id: `${pre}-fxv-${f.id}`, type: 'number', step: 1, value: f.v, 'aria-label': 'Quanto o bônus soma', disabled: !mestre(), onchange: e => muda('bônus na ficha', g => { g.v = Math.round((+e.target.value || 0) * 10) / 10; }) }),
        // (a duração vai numa linha só dela, embaixo — ver "dur" logo abaixo)
      ];
      else campos = [
        h('select', { class: 'in chave', id: `${pre}-fxb-${f.id}`, 'aria-label': f.t === 'barra' ? 'A barra que recupera' : 'A barra que ganha a sobrevida', disabled: !mestre(), onchange: e => { focoDepois = `${pre}-fxb-${f.id}`; muda('barra do efeito', g => { g.b = e.target.value; }); } }, nomesDeBarras(f.b).map(b => h('option', { value: b, text: b, selected: b === f.b }))),
        f.t === 'barra' ? h('input', { class: 'in val', id: `${pre}-fxv-${f.id}`, value: f.val, maxlength: 24, placeholder: '10', 'aria-label': 'Quanto a barra recupera', title: 'Um número (20), dados (2d6+3, rolados no descanso) ou, com sinal de menos, o que tira (−5)', disabled: !mestre(),
          onchange: e => { const v = e.target.value.replace(/\s+/g, '').slice(0, 24), lido = R() ? R().lerEfeito(v) : null; if (!v || (lido && lido.erro)) { toast((lido && lido.erro) || 'Escreva um valor (20) ou dados (2d6+3).'); e.target.value = f.val; return; } muda('o que a barra recupera', g => { g.val = v; }); } })
          : h('input', { class: 'in val', id: `${pre}-fxv-${f.id}`, type: 'number', min: 0, step: 1, value: f.v, 'aria-label': 'Quanta sobrevida', title: 'Pontos por cima da barra: o dano gasta a sobrevida antes. Não soma com a que o personagem já tem: fica a maior.', disabled: !mestre(), onchange: e => muda('sobrevida', g => { g.v = Math.max(0, Math.round((+e.target.value || 0) * 10) / 10); }) })];
      const tira = mestre() ? botaoIcone(`${pre}-fxx-${f.id}`, X, 'Tirar este efeito', () => set('tirar o efeito na ficha', x => { x.fx = x.fx.filter(y => y.id !== f.id); })) : null;
      // quanto o bônus dura: até o próximo descanso (de qualquer tipo), ou algumas rodadas (o mestre desconta na ficha)
      const dur = f.t === 'bonus' ? h('span', { class: 'dur' },
        h('select', { class: 'in', id: `${pre}-fxd-${f.id}`, 'aria-label': 'Quanto o bônus dura', disabled: !mestre(), onchange: e => { focoDepois = `${pre}-fxd-${f.id}`; muda('duração do bônus', g => { g.dur = e.target.value; if (g.dur === 'rodadas' && !g.r) g.r = 3; }); } },
          h('option', { value: 'descanso', text: 'até o próximo descanso', selected: f.dur !== 'rodadas' }), h('option', { value: 'rodadas', text: 'por rodadas', selected: f.dur === 'rodadas' })),
        f.dur === 'rodadas' ? h('input', { class: 'in rod', id: `${pre}-fxr-${f.id}`, type: 'number', min: 1, max: 99, step: 1, value: f.r, 'aria-label': 'Quantas rodadas o bônus dura', disabled: !mestre(), onchange: e => muda('rodadas do bônus', g => { g.r = N.limitar(Math.round(+e.target.value) || 1, 1, 99); }) }) : null,
        f.dur === 'rodadas' ? h('span', { class: 'ro', text: f.r === 1 ? 'rodada' : 'rodadas' }) : null) : null;
      return h('div', { class: 'fx', 'data-fx': f.id }, tipo, campos, tira, dur);
    };
    return h('div', { class: 'fxs' }, item.fx.map(linhaFx),
      mestre() && item.fx.length < 8 ? h('button', { type: 'button', class: 'btn sm', id: `${pre}-fxnovo`, style: 'justify-self:start', text: '+ Efeito na ficha', onclick: () => { const it = N.item('fx'); focoDepois = `${pre}-fxt-${it.id}`; abertos.add(`${pre}-ef`); set('efeito na ficha', x => { x.fx.push(it); }); } }) : null);
  }

  function abaProvisoes() {
    const rac = N.racoes(camp), n = presentes().length, porP = camp.regras.longo.prov, ef = N.efeitos(camp), custo = Math.max(0, porP * n + ef.prov);
    const sobe = (id, d) => mudar('reordenar as provisões', c => { const i = c.provisoes.findIndex(x => x.id === id), k = i + d; if (i < 0 || k < 0 || k >= c.provisoes.length) return false; c.provisoes.splice(k, 0, c.provisoes.splice(i, 1)[0]); });
    const lista = camp.provisoes.map((p, i) => {
      const setP = (rotulo, fn) => mudar(rotulo, c => fn(acha(c.provisoes, p.id)));
      const efR = (k, rotulo) => h('label', {}, rotulo, campoNum(`pv-${k}-${p.id}`, p.ef[k], rotulo + ' de quem come ' + (p.nome || 'esta provisão'), v => setP('efeito de ' + (p.nome || 'provisão'), x => { x.ef[k] = v; }), -100, 100));
      const resumo = resumoEfeito(p, true);
      const nome = campoTexto('pv-n-' + p.id, p.nome, 'Nome da provisão', v => mudar('renomear a provisão', c => { acha(c.provisoes, p.id).nome = v; }), { placeholder: 'Ex.: carne seca' });
      const passo = h('span', { class: 'passo' },
        mestre() ? botaoIcone('pv-m-' + p.id, MENOS, 'Tirar uma ração de ' + (p.nome || 'provisão'), () => { focoDepois = 'pv-m-' + p.id; mudar('rações de ' + (p.nome || 'provisão'), c => { const x = acha(c.provisoes, p.id); x.qtd = Math.max(0, x.qtd - 1); }, { junta: 'qtd:' + p.id }); }, { disabled: p.qtd <= 0 }) : null,
        mestre() ? campoNum('pv-q-' + p.id, p.qtd, 'Rações de ' + (p.nome || 'provisão'), v => mudar('rações de ' + (p.nome || 'provisão'), c => { acha(c.provisoes, p.id).qtd = v; }), 0, 9999) : h('b', { text: String(p.qtd) }),
        mestre() ? botaoIcone('pv-p-' + p.id, MAIS, 'Pôr uma ração em ' + (p.nome || 'provisão'), () => { focoDepois = 'pv-p-' + p.id; mudar('rações de ' + (p.nome || 'provisão'), c => { acha(c.provisoes, p.id).qtd += 1; }, { junta: 'qtd:' + p.id }); }) : null);
      // (o mestre vê duas linhas: o nome inteiro em cima — "Ensopado de javali" não cabe ao lado dos botões — e a
      //  ordem e as rações embaixo; quem só consulta vê tudo numa linha)
      return h('div', { class: 'cartao' + (p.qtd ? '' : ' off'), 'data-pv': p.id },
        mestre() ? [h('div', { class: 'lin' }, nome,
          botaoIcone('pv-x-' + p.id, X, 'Tirar ' + (p.nome || 'a provisão') + ' da lista', () => { if (mudar('tirar ' + (p.nome || 'a provisão'), c => { c.provisoes = c.provisoes.filter(x => x.id !== p.id); })) toast((p.nome || 'Provisão') + ' saiu da lista.', 'Desfazer', desfazer); })),
        h('div', { class: 'lin pv2' },
          botaoIcone('pv-up-' + p.id, CIMA, 'Gastar antes', () => { focoDepois = 'pv-up-' + p.id; sobe(p.id, -1); }, { disabled: i === 0 }),
          botaoIcone('pv-dn-' + p.id, BAIXO, 'Gastar depois', () => { focoDepois = 'pv-dn-' + p.id; sobe(p.id, 1); }, { disabled: i === camp.provisoes.length - 1 }),
          h('span', { class: 'qtd-rot', text: 'Rações' }), passo)]
        : h('div', { class: 'lin' }, nome, passo),
        // o que esta ração faz em quem a come: no descanso (Conforto, Sanidade, recuperação) e na ficha
        mestre() ? dobra('pv-' + p.id + '-ef', ['Ao comer: ', h('b', { text: resumo || 'só mata a fome' })],
          h('div', { class: 'efs tres' }, efR('conf', 'Conforto'), efR('san', 'Sanidade'), efR('rec', 'Recup. %')),
          editorFx('pv-' + p.id, p, setP))
          : resumo ? h('p', { class: 'note' }, 'Ao comer: ', h('b', { text: resumo })) : null);
    });
    const nomeDe = id => { const pv = camp.provisoes.find(x => x.id === id); return pv ? pv.nome || 'Sem nome' : 'a ordem da lista'; };
    const servirLinha = tipo => {
      const rot = tipo === 'longo' ? 'Descanso longo' : 'Descanso curto';
      return [h('span', { text: tipo === 'longo' ? 'Longo' : 'Curto', title: rot }),
        h('select', { class: 'in', id: 'sv-' + tipo, 'aria-label': rot + ': a provisão que serve primeiro', disabled: !mestre(), onchange: e => { focoDepois = 'sv-' + tipo; mudar('o que o ' + rot.toLowerCase() + ' serve', c => { c.servir[tipo] = e.target.value || null; }); } },
          h('option', { value: '', text: 'a ordem da lista', selected: !camp.servir[tipo] }), camp.provisoes.map(pv => h('option', { value: pv.id, text: pv.nome || 'Sem nome', selected: camp.servir[tipo] === pv.id }))),
        h('span', { class: 'sw', title: 'Quantas rações cada personagem come neste descanso' }, campoNum('sv-' + tipo + '-prov', camp.regras[tipo].prov, rot + ': rações por personagem', v => mudar('regras do descanso', c => { c.regras[tipo].prov = v; }), 0, 99), 'cada')];
    };
    return [
      h('h3', { text: 'Provisões' }),
      h('p', { class: 'sub', id: 'provResumo', text: (rac === 1 ? '1 ração guardada' : rac + ' rações guardadas') + (n ? ' · o descanso longo gasta ' + custo + ' (' + porP + ' por personagem' + (ef.prov ? ', ' + N.comSinal(ef.prov) + ' da estrutura' : '') + ')' : '') }),
      mestre() ? h('div', { class: 'sec' }, h('div', { class: 'rot', text: 'O que cada descanso serve' }),
        h('div', { class: 'servir' }, servirLinha('longo'), servirLinha('curto')),
        h('p', { class: 'note', text: 'A provisão servida sai primeiro, depois a lista de cima para baixo. Quem come uma ração com efeito ganha o efeito dela. Na hora do descanso dá para servir outra.' }))
        : h('p', { class: 'note', text: 'O descanso longo serve ' + nomeDe(camp.servir.longo) + '; o curto, ' + nomeDe(camp.servir.curto) + '.' }),
      lista.length ? lista : h('p', { class: 'note', text: 'Nenhuma provisão guardada. Cada unidade vale uma ração.' }),
      mestre() ? h('button', { type: 'button', class: 'btn', id: 'pv-novo', text: '+ Provisão', onclick: () => { const it = N.item('provisoes'); focoDepois = 'pv-n-' + it.id; mudar('nova provisão', c => { c.provisoes.push(it); }); } }) : null,
      lista.length > 1 ? h('p', { class: 'note', text: 'No descanso, as rações saem primeiro da provisão servida e depois de cima para baixo.' }) : null,
    ];
  }
  // os personagens que a estrutura pode alcançar: os desta campanha (e os do mundo), em ordem de nome
  const candidatos = () => linhas().filter(l => !campId || !l.campanha || l.campanha === campId).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const slug = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 40);
  function cartaoEstrutura(tipo, m) {
    const pre = tipo === 'melhorias' ? 'ml' : 'eq', nomeTipo = tipo === 'melhorias' ? 'melhoria' : 'equipamento';
    const set = (rotulo, fn) => mudar(rotulo, c => fn(acha(c[tipo], m.id)));
    const ef = (k, rotulo, min, max, dica) => h('label', { title: dica || null }, rotulo, campoNum(`${pre}-${k}-${m.id}`, m.ef[k], rotulo + ' de ' + (m.nome || nomeTipo), v => set('efeito de ' + (m.nome || nomeTipo), x => { x.ef[k] = v; }), min, max));
    // para quem vale: todos que descansam, ou só os personagens e grupos escolhidos (as rações valem para o acampamento)
    const cand = candidatos(), grupos = Array.from(new Set(cand.map(l => String((l.ficha && l.ficha.grupo) || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const marca = (id, rotulo, on, fn) => h('label', {}, h('input', { type: 'checkbox', id, checked: on, disabled: !mestre(), onchange: e => { focoDepois = id; fn(e.target.checked); } }), rotulo);
    const nomeAlvo = () => [...m.alvo.grupos.map(g => 'grupo ' + g), ...m.alvo.pers.map(id => { const l = linha(id); return l ? l.nome : null; }).filter(Boolean)].join(', ');
    const alvo = h('div', { class: 'alvo' },
      h('div', { class: 'lin' }, h('span', { class: 'note', style: 'flex:none', text: 'Vale para' }),
        mestre() ? h('select', { class: 'in', id: `${pre}-alvo-${m.id}`, 'aria-label': 'Para quem ' + (m.nome || 'est' + (tipo === 'melhorias' ? 'a melhoria' : 'e equipamento')) + ' vale', onchange: e => { focoDepois = `${pre}-alvo-${m.id}`; set('para quem vale ' + (m.nome || nomeTipo), x => { x.alvo.todos = e.target.value === 'todos'; }); } },
          h('option', { value: 'todos', text: 'todos que descansam', selected: m.alvo.todos }), h('option', { value: 'alguns', text: 'só os escolhidos', selected: !m.alvo.todos }))
          : h('span', { text: m.alvo.todos ? 'todos que descansam' : (nomeAlvo() || 'ninguém, por enquanto') })),
      mestre() && !m.alvo.todos ? h('div', { class: 'marcas' },
        grupos.length ? [h('span', { class: 'tit', text: 'Grupos' }), grupos.map(g => marca(`${pre}-g-${m.id}-${slug(g)}`, g, m.alvo.grupos.includes(g), on => set('para quem vale ' + (m.nome || nomeTipo), x => { x.alvo.grupos = on ? x.alvo.grupos.concat(g) : x.alvo.grupos.filter(y => y !== g); })))] : null,
        h('span', { class: 'tit', text: 'Personagens' }),
        cand.length ? cand.map(l => marca(`${pre}-p-${m.id}-${l.id}`, l.nome || 'Sem nome', m.alvo.pers.includes(l.id), on => set('para quem vale ' + (m.nome || nomeTipo), x => { x.alvo.pers = on ? x.alvo.pers.concat(l.id) : x.alvo.pers.filter(y => y !== l.id); }))) : h('span', { class: 'note', text: 'Nenhuma ficha ainda.' }),
        !m.alvo.pers.length && !m.alvo.grupos.length ? h('span', { class: 'note', style: 'width:100%', text: 'Ninguém escolhido: por enquanto, não vale para ninguém (as rações a mais ou a menos continuam valendo).' }) : null) : null);
    const resumoFx = resumoEfeito(m, false);
    return h('div', { class: 'cartao' + (m.on ? '' : ' off'), 'data-est': m.id },
      h('div', { class: 'lin' },
        h('input', { type: 'checkbox', id: `${pre}-on-${m.id}`, checked: m.on, disabled: !mestre(), title: 'Em uso', 'aria-label': (m.nome || nomeTipo) + ' em uso', onchange: e => set((e.target.checked ? 'usar ' : 'deixar de usar ') + (m.nome || nomeTipo), x => { x.on = e.target.checked; }) }),
        campoTexto(`${pre}-n-${m.id}`, m.nome, 'Nome', v => set('renomear ' + nomeTipo, x => { x.nome = v; }), { placeholder: tipo === 'melhorias' ? 'Ex.: fogão de pedra' : 'Ex.: sacos de dormir' }),
        tipo === 'equipamentos' ? campoNum(`eq-q-${m.id}`, m.qtd, 'Quantidade', v => set('quantidade de ' + (m.nome || nomeTipo), x => { x.qtd = v; }), 0, 999) : null,
        mestre() ? botaoIcone(`${pre}-x-${m.id}`, X, 'Tirar ' + (m.nome || nomeTipo), () => { if (mudar('tirar ' + (m.nome || nomeTipo), c => { c[tipo] = c[tipo].filter(x => x.id !== m.id); })) toast((m.nome || 'Item') + ' saiu da lista.', 'Desfazer', desfazer); }) : null),
      mestre() || m.desc ? campoArea(`${pre}-d-${m.id}`, m.desc, 'Descrição', v => set('descrever ' + nomeTipo, x => { x.desc = v; }), 'O que é, como foi conseguido, o que faz…') : null,
      h('div', { class: 'efs' }, ef('conf', 'Conforto', -100, 100), ef('san', 'Sanidade', -100, 100), ef('rec', 'Recup. %', -100, 100), ef('prov', 'Rações', -99, 99, 'Rações a mais (ou, com sinal de menos, a menos) por descanso longo — vale para o acampamento inteiro')),
      alvo,
      mestre() ? dobra(`${pre}-${m.id}-ef`, ['Na ficha: ', h('b', { text: resumoFx || 'nada' })], editorFx(`${pre}-${m.id}`, m, set))
        : resumoFx ? h('p', { class: 'note' }, 'Na ficha: ', h('b', { text: resumoFx })) : null);
  }
  function abaEstrutura() {
    const txt = N.textoEfeitos(N.efeitos(camp)), alguns = N.temParaAlguns(camp);
    const secao = (tipo, titulo, botao, vazio) => h('div', { class: 'sec' },
      h('div', { class: 'rot' }, titulo, mestre() ? h('button', { type: 'button', class: 'btn sm', id: (tipo === 'melhorias' ? 'ml' : 'eq') + '-novo', text: botao, onclick: () => { const it = N.item(tipo); focoDepois = (tipo === 'melhorias' ? 'ml' : 'eq') + '-n-' + it.id; mudar(tipo === 'melhorias' ? 'nova melhoria' : 'novo equipamento', c => { c[tipo].push(it); }); } }) : null),
      camp[tipo].length ? camp[tipo].map(m => cartaoEstrutura(tipo, m)) : h('p', { class: 'note', text: vazio }));
    return [
      h('h3', { text: 'Estrutura' }),
      h('p', { class: 'sub', id: 'estResumo', text: (txt ? 'No descanso longo, o que está em uso soma para todos: ' + txt + '.' : 'O que está em uso soma seus efeitos ao descanso longo.') + (alguns ? ' Há também o que vale só para alguns.' : '') }),
      secao('melhorias', 'Melhorias', '+ Melhoria', 'Nenhuma melhoria. Ex.: fogão de pedra, paliçada, poço.'),
      secao('equipamentos', 'Equipamentos', '+ Equipamento', 'Nenhum equipamento. Ex.: barracas, sacos de dormir, panela de ferro.'),
      h('p', { class: 'note', text: 'Efeitos: Conforto e Sanidade em pontos por descanso longo; recuperação em % a mais das barras; rações a mais (ou, com sinal de menos, a menos) por descanso. "Na ficha": um bônus temporário, uma barra que recupera ou sobrevida, para quem a melhoria alcança, no descanso longo.' }),
    ];
  }

  /* ---- a caravana: veículos e animais, a carga (com peso) e quem viaja ---- */
  const kg = n => String(Math.round(n * 100) / 100).replace('.', ',') + ' kg';
  function barraDePeso(usado, cap, id) {
    const demais = cap > 0 && usado > cap;
    return h('div', { class: 'peso' + (demais ? ' demais' : ''), id: id || null },
      h('span', { text: cap > 0 ? (demais ? 'Carga demais' : 'Carga') : 'Carga (sem capacidade anotada)' }), h('b', { text: cap > 0 ? kg(usado) + ' de ' + kg(cap) : kg(usado) }),
      cap > 0 ? h('div', { class: 'tr' }, h('i', { style: `width:${N.limitar(usado / cap * 100, 0, 100)}%` })) : null);
  }
  function abaCaravana() {
    const cv = camp.caravana, peso = N.cargaDe(camp);
    const setC = (rotulo, fn, opt) => mudar(rotulo, c => fn(c.caravana), opt);
    const opcoesVeic = atual => [h('option', { value: '', text: 'sem lugar', selected: !atual }), ...cv.veiculos.map(v => h('option', { value: v.id, text: v.nome || 'Sem nome', selected: v.id === atual }))];
    const veiculos = cv.veiculos.map(v => h('div', { class: 'cartao', 'data-vc': v.id },
      h('div', { class: 'lin' },
        campoTexto('vc-n-' + v.id, v.nome, 'Nome do veículo ou animal', x => setC('renomear ' + (v.nome || 'o veículo'), c => { acha(c.veiculos, v.id).nome = x; }), { placeholder: 'Ex.: carroça grande, Tordilho' }),
        h('select', { class: 'in', id: 'vc-t-' + v.id, style: 'width:auto;flex:none', 'aria-label': 'Tipo de ' + (v.nome || 'veículo'), disabled: !mestre(), onchange: e => { focoDepois = 'vc-t-' + v.id; setC('tipo de ' + (v.nome || 'veículo'), c => { acha(c.veiculos, v.id).tipo = e.target.value; }); } }, N.TIPOS_VEICULO.map(([k, nome]) => h('option', { value: k, text: nome, selected: v.tipo === k }))),
        mestre() ? botaoIcone('vc-x-' + v.id, X, 'Tirar ' + (v.nome || 'o veículo'), () => { if (setC('tirar ' + (v.nome || 'o veículo'), c => { c.veiculos = c.veiculos.filter(x => x.id !== v.id); })) toast((v.nome || 'Veículo') + ' saiu da caravana. A carga e a gente dele ficaram sem lugar.', 'Desfazer', desfazer); }) : null),
      h('div', { class: 'lin' },
        h('label', { class: 'sw', title: 'Quanto peso leva' }, 'Leva', h('input', { class: 'in num', id: 'vc-c-' + v.id, type: 'number', min: 0, step: 1, value: v.cap, 'aria-label': 'Capacidade de ' + (v.nome || 'veículo') + ' (kg)', disabled: !mestre(), onchange: e => setC('capacidade de ' + (v.nome || 'veículo'), c => { acha(c.veiculos, v.id).cap = Math.max(0, Math.round((+e.target.value || 0) * 10) / 10); }) }), 'kg'),
        campoTexto('vc-e-' + v.id, v.estado, 'Estado de ' + (v.nome || 'veículo'), x => setC('estado de ' + (v.nome || 'veículo'), c => { acha(c.veiculos, v.id).estado = x; }), { placeholder: 'Estado — ex.: roda bamba', maxlength: 120 })),
      barraDePeso(peso.por[v.id] || 0, v.cap, 'vc-peso-' + v.id)));
    const carga = cv.carga.map(k => h('div', { class: 'cartao', 'data-cg': k.id },
      h('div', { class: 'cg' },
        campoTexto('cg-n-' + k.id, k.nome, 'O que é', x => setC('renomear a carga', c => { acha(c.carga, k.id).nome = x; }), { placeholder: 'Ex.: barris de vinho' }),
        h('input', { class: 'in num', id: 'cg-q-' + k.id, type: 'number', min: 0, step: 1, value: k.qtd, title: 'Quantos', 'aria-label': 'Quantos ' + (k.nome || 'itens'), disabled: !mestre(), onchange: e => setC('quantidade de ' + (k.nome || 'carga'), c => { acha(c.carga, k.id).qtd = N.limitar(Math.round(+e.target.value) || 0, 0, 99999); }) }),
        h('input', { class: 'in num', id: 'cg-p-' + k.id, type: 'number', min: 0, step: 0.1, value: k.peso, title: 'Peso de cada um (kg)', 'aria-label': 'Peso de cada ' + (k.nome || 'item') + ' (kg)', disabled: !mestre(), onchange: e => setC('peso de ' + (k.nome || 'carga'), c => { acha(c.carga, k.id).peso = Math.max(0, Math.round((+e.target.value || 0) * 100) / 100); }) })),
      h('div', { class: 'cg-sub' }, 'vai em',
        h('select', { class: 'in', id: 'cg-v-' + k.id, 'aria-label': 'Onde vai ' + (k.nome || 'a carga'), disabled: !mestre(), onchange: e => { focoDepois = 'cg-v-' + k.id; setC('onde vai ' + (k.nome || 'a carga'), c => { acha(c.carga, k.id).veiculo = e.target.value || null; }); } }, opcoesVeic(k.veiculo)),
        h('b', { style: 'font-family:var(--mono);color:var(--fg)', text: kg(k.qtd * k.peso) }),
        mestre() ? botaoIcone('cg-x-' + k.id, X, 'Tirar ' + (k.nome || 'a carga'), () => { if (setC('tirar ' + (k.nome || 'a carga'), c => { c.carga = c.carga.filter(x => x.id !== k.id); })) toast((k.nome || 'Carga') + ' saiu da caravana.', 'Desfazer', desfazer); }) : null)));
    const doAcamp = presentes().map(p => h('div', { class: 'cg-sub', 'data-vai': p.id }, h('span', { style: 'flex:1;color:var(--fg);font-weight:600', text: p.nome }), 'vai em',
      h('select', { class: 'in', id: 'vai-' + p.id, 'aria-label': 'Onde vai ' + p.nome, disabled: !mestre(), onchange: e => { focoDepois = 'vai-' + p.id; setC('onde vai ' + p.nome, c => { if (e.target.value) c.vai[p.id] = e.target.value; else delete c.vai[p.id]; }); } }, opcoesVeic(cv.vai[p.id] || null))));
    const gente = cv.gente.map(g => h('div', { class: 'cartao', 'data-gt': g.id },
      h('div', { class: 'lin' },
        campoTexto('gt-n-' + g.id, g.nome, 'Nome', x => setC('renomear quem viaja', c => { acha(c.gente, g.id).nome = x; }), { placeholder: 'Nome' }),
        campoTexto('gt-p-' + g.id, g.papel, 'O que faz', x => setC('o que ' + (g.nome || 'a pessoa') + ' faz', c => { acha(c.gente, g.id).papel = x; }), { placeholder: 'Ex.: cocheiro', maxlength: 40 }),
        mestre() ? botaoIcone('gt-x-' + g.id, X, 'Tirar ' + (g.nome || 'esta pessoa'), () => { if (setC('tirar ' + (g.nome || 'quem viajava'), c => { c.gente = c.gente.filter(x => x.id !== g.id); })) toast((g.nome || 'A pessoa') + ' saiu da caravana.', 'Desfazer', desfazer); }) : null),
      h('div', { class: 'cg-sub' }, 'vai em', h('select', { class: 'in', id: 'gt-v-' + g.id, 'aria-label': 'Onde vai ' + (g.nome || 'a pessoa'), disabled: !mestre(), onchange: e => { focoDepois = 'gt-v-' + g.id; setC('onde vai ' + (g.nome || 'a pessoa'), c => { acha(c.gente, g.id).veiculo = e.target.value || null; }); } }, opcoesVeic(g.veiculo)))));
    const novo = (tipo, id, texto, foco, rotulo) => mestre() ? h('button', { type: 'button', class: 'btn sm', id, text: texto, onclick: () => { const it = N.item(tipo); focoDepois = foco + it.id; setC(rotulo, c => { c[tipo].push(it); }); } }) : null;
    return [
      h('h3', { text: 'Caravana' }),
      h('p', { class: 'sub', text: cv.veiculos.length || cv.carga.length || cv.gente.length ? (cv.veiculos.length === 1 ? '1 veículo ou animal' : cv.veiculos.length + ' veículos e animais') + ' · ' + kg(peso.total) + ' de carga' + (peso.cap ? ' · leva até ' + kg(peso.cap) : '') : 'Os veículos, os animais, a carga e quem viaja com o grupo.' }),
      cv.carga.length ? barraDePeso(peso.total, peso.cap, 'cv-peso') : null,
      h('div', { class: 'sec' }, h('div', { class: 'rot' }, 'Veículos e animais', novo('veiculos', 'vc-novo', '+ Veículo ou animal', 'vc-n-', 'novo veículo ou animal')),
        veiculos.length ? veiculos : h('p', { class: 'note', text: mestre() ? 'Nenhum ainda. Ex.: carroça, barco, cavalo, mula de carga.' : 'Nenhum veículo ou animal.' })),
      h('div', { class: 'sec' }, h('div', { class: 'rot' }, 'Carga', novo('carga', 'cg-novo', '+ Carga', 'cg-n-', 'nova carga')),
        carga.length ? [h('div', { class: 'cg', style: 'font-size:11px;color:var(--fg-3);padding:0 10px' }, h('span', { text: 'O quê' }), h('span', { text: 'Quantos' }), h('span', { text: 'Peso de cada' })), carga] : h('p', { class: 'note', text: mestre() ? 'Nenhuma carga. Cada linha tem quantos e o peso de cada um; o total aparece contra o que os veículos levam.' : 'Nenhuma carga.' }),
        peso.semLugar > 0 && cv.veiculos.length ? h('p', { class: 'note', id: 'cv-semlugar', text: kg(peso.semLugar) + ' de carga sem lugar.' }) : null),
      h('div', { class: 'sec' }, h('div', { class: 'rot' }, 'Quem viaja', novo('gente', 'gt-novo', '+ Pessoa', 'gt-n-', 'nova pessoa na caravana')),
        doAcamp.length && cv.veiculos.length ? doAcamp : null,
        gente.length ? gente : h('p', { class: 'note', text: mestre() ? 'Quem viaja junto sem ficha: cocheiros, guardas, mercadores. Os personagens do acampamento aparecem aqui quando há veículos.' : 'Ninguém além do grupo.' })),
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
    // o que se serve neste descanso: a provisão do descanso, ou outra escolhida na hora; e quantas cada um come
    const escolha = { servir: camp.servir[longo ? 'longo' : 'curto'], prov: camp.regras[longo ? 'longo' : 'curto'].prov };
    const corpo = h('div', { style: 'display:grid;gap:10px' });
    const confirmar = h('button', { type: 'button', class: 'btn pri', id: 'ds-ok', text: 'Descansar' });
    let plano = null;
    const refazer = foco => {
      plano = N.planejar(camp, tipo, todos.filter(p => marcados.has(p.id)), { servir: escolha.servir, prov: escolha.prov });
      const sobra = plano.disponivel - plano.gasto;
      const avisos = [];
      // o que servir (a provisão que sai primeiro, e cujo efeito vale para quem a come) e quantas cada um come
      avisos.push(h('div', { class: 'servir', id: 'ds-servir' }, h('span', { text: 'Servir' }),
        h('select', { class: 'in', id: 'ds-sv', 'aria-label': 'O que servir neste descanso', onchange: e => { escolha.servir = e.target.value || null; refazer('ds-sv'); } },
          h('option', { value: '', text: 'a ordem da lista', selected: !escolha.servir }), camp.provisoes.map(pv => h('option', { value: pv.id, text: (pv.nome || 'Sem nome') + ' (' + pv.qtd + ')', selected: escolha.servir === pv.id }))),
        h('span', { class: 'sw' }, h('input', { class: 'in num', id: 'ds-qtd', type: 'number', min: 0, max: 99, step: 1, value: escolha.prov, 'aria-label': 'Rações por personagem neste descanso', onchange: e => { escolha.prov = N.limitar(Math.round(+e.target.value) || 0, 0, 99); refazer('ds-qtd'); } }), 'cada')));
      if (plano.servida && plano.prov > 0 && plano.n && plano.comem < plano.n) avisos.push(h('div', { class: 'aviso', id: 'ds-da' }, (plano.servida.nome || 'A provisão servida') + (plano.comem ? ' dá para ' + plano.comem + ' de ' + plano.n + ' (abaixo, quem come); ' + (plano.n - plano.comem === 1 ? 'o outro come' : 'os outros comem') + ' do resto da lista' + (plano.servida.efeito ? ', sem o efeito.' : '.') : ' acabou: todos comem do resto da lista' + (plano.servida.efeito ? ', sem o efeito.' : '.'))));
      if (plano.custo > 0) avisos.push(h('div', { class: 'aviso' + (plano.falta ? ' ruim' : ''), id: 'ds-prov' },
        plano.falta ? `Faltam ${plano.falta} ${plano.falta === 1 ? 'ração' : 'rações'}: há ${plano.disponivel}, o descanso pede ${plano.custo}. A recuperação cai para ${camp.regras.semProv.rec}% do normal` + (camp.regras.semProv.conf ? ` e o Conforto leva ${N.comSinal(camp.regras.semProv.conf)}.` : '.')
          : `Provisões: gasta ${plano.gasto} de ${plano.disponivel} ${plano.disponivel === 1 ? 'ração' : 'rações'}` + (plano.consumo.length ? ' (' + plano.consumo.map(g => (g.nome || 'provisão') + ' −' + g.qtd).join(', ') + ')' : '') + `. Sobram ${sobra}.`));
      else if (longo) avisos.push(h('div', { class: 'aviso', id: 'ds-prov', text: 'Este descanso não gasta provisões.' }));
      const txt = N.textoEfeitos(plano.efeitos);
      if (longo && (txt || N.temParaAlguns(camp))) avisos.push(h('div', { class: 'aviso', text: (txt ? 'A estrutura em uso soma para todos: ' + txt + '.' : '') + (N.temParaAlguns(camp) ? (txt ? ' ' : '') + 'E há estrutura que vale só para alguns (já está na conta de cada um, abaixo).' : '') }));
      if (naMesa() && plano.linhas.some(l => l.fx.length)) avisos.push(h('div', { class: 'aviso', text: 'O que vai para a ficha: os bônus "até o próximo descanso" de antes acabam, e os novos entram. Os dados são rolados quando o descanso acontece.' }));
      if (!naMesa()) avisos.push(h('div', { class: 'aviso', text: 'Sem mesa aberta, as fichas não são alteradas: os valores abaixo' + (plano.linhas.some(l => l.fx.length) ? ' (e o que vai para a ficha)' : '') + ' são para você aplicar. As provisões e o diário, sim, são atualizados.' }));
      const linhasT = todos.map(p => {
        const ln = plano.linhas.find(x => x.id === p.id), dentroD = !!ln;
        return h('tr', { class: dentroD ? '' : 'fora' },
          h('td', {}, h('label', { class: 'sw', style: 'color:var(--fg);font-weight:600' }, h('input', { type: 'checkbox', id: 'ds-' + p.id, checked: dentroD, onchange: e => { if (e.target.checked) marcados.add(p.id); else marcados.delete(p.id); refazer('ds-' + p.id); } }), p.nome)),
          h('td', {}, dentroD ? h('div', { class: 'mud' }, ...ln.recursos.map(r => h('span', r.inicio != null ? { title: longo ? 'Esta barra começa em ' + r.inicio + ': o descanso longo a leva de volta para lá' : 'Esta barra tem um começo próprio: o descanso curto não mexe nela' } : {}, r.nome + ' ', seta(r.de, r.para, '/' + r.max), r.inicio != null && longo && r.para !== r.de ? ' (volta ao começo)' : '')), ...ln.poderes.map(x => h('span', {}, x.nome + ' ', seta(x.de, x.para)))) : h('span', { class: 'note', text: 'fica de fora' })),
          h('td', {}, dentroD && ln.san ? h('div', { class: 'mud' }, seta(ln.san.de, ln.san.para)) : '—'),
          h('td', {}, dentroD && ln.conf ? h('div', { class: 'mud' }, seta(ln.conf.de, ln.conf.para)) : '—'),
          // (as rações sem efeito não aparecem aqui: "come carne seca" em todo mundo seria só barulho)
          h('td', { 'data-fx': p.id }, dentroD && (ln.come.some(x => x.efeito) || ln.fx.length) ? h('div', { class: 'mud', style: 'font-family:var(--ui)' },
            ln.come.some(x => x.efeito) ? h('span', {}, 'come ', h('b', { style: 'color:var(--fg)', text: juntarE(ln.come.filter(x => x.efeito).map(x => x.nome || 'ração sem nome')) })) : null,
            ...ln.fx.map(f => h('span', { title: 'De: ' + f.de }, textoFx(f) + (f.t === 'barra' && R() && (R().lerEfeito(f.val) || {}).dados ? ' (rolado no descanso)' : '')))) : '—'));
      });
      corpo.replaceChildren(...avisos, h('table', { class: 'plano' }, h('thead', {}, h('tr', {}, h('th', { text: 'Quem descansa' }), h('th', { text: 'Barras' }), h('th', { text: 'Sanidade' }), h('th', { text: 'Conforto' }), h('th', { text: 'Come · na ficha' }))), h('tbody', {}, linhasT)));
      confirmar.disabled = !plano.n;
      if (foco) { const c0 = document.getElementById(foco); if (c0) c0.focus(); }
    };
    confirmar.addEventListener('click', () => { const p = plano; fecharJanela(); descansar(p); });
    refazer();
    abrirJanela(longo ? 'Descanso longo' : 'Descanso curto', corpo, [h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fecharJanela }), confirmar]);
    confirmar.focus();
  }
  /* O que vai para a ficha de uma pessoa no descanso (o efeito da ração e o da estrutura que a alcança), no estado
     novo dela. recursos: as barras dela (com o piso e o começo), depois do descanso. Os dados são rolados aqui. */
  function aplicarFx(est, ln, recursos, quando) {
    const feito = [];
    for (const f of ln.fx) {
      if (f.t === 'bonus') {
        const tmp = Object.assign({}, est.tmp && typeof est.tmp === 'object' ? est.tmp : {});
        tmp['t' + N.novoId('cp').slice(3)] = N.tmpDoFx(f, quando);
        est.tmp = tmp; feito.push(textoFx(f));
        continue;
      }
      const r = N.barraPeloNome(recursos, f.b);
      if (!r || r.max == null) { feito.push('sem a barra ' + (f.b || '?')); continue; }
      if (f.t === 'sob') {
        const sob = Object.assign({}, est.sob && typeof est.sob === 'object' ? est.sob : {}), antes = Math.max(0, +sob[r.id] || 0);
        if (f.v > antes) sob[r.id] = f.v;
        est.sob = sob; feito.push('Sobrevida ' + Math.max(antes, f.v) + ' em ' + r.nome);
        continue;
      }
      // 'barra': um número ou dados (rolados agora), a partir do valor da barra depois do descanso
      const lido = R() ? R().lerEfeito(f.val) : null;
      if (!lido || lido.erro) continue;
      let delta = lido.fixo;
      if (delta == null) { const rr = window.TC && TC.dice ? TC.dice.rollExpr(lido.dados) : null; if (!rr || !rr.ok) continue; delta = lido.sinal * rr.total; }
      const rec = Object.assign({}, est.rec && typeof est.rec === 'object' ? est.rec : {});
      // (de onde parte: o que um efeito anterior deste mesmo descanso deixou, ou o valor da barra depois do descanso)
      const min = Number.isFinite(r.min) && r.min < 0 ? r.min : 0, de = Object.prototype.hasOwnProperty.call(rec, r.id) && Number.isFinite(+rec[r.id]) ? +rec[r.id] : (r.atual != null ? r.atual : r.max);
      const para = N.limitar(Math.round((de + delta) * 10) / 10, min, r.max);
      rec[r.id] = para; est.rec = rec;
      feito.push(r.nome + ' ' + (delta < 0 ? '−' : '+') + Math.abs(delta) + (lido.dados ? ' (' + lido.dados + ')' : ''));
    }
    return feito;
  }
  function descansar(plano) {
    const fichas = [], agora = Date.now(), naFicha = [];
    if (naMesa()) {
      for (const ln of plano.linhas) {
        const l = P.pegar(ln.id); if (!l) continue;
        const est = N.copia(l.estado || {}), rec = est.rec && typeof est.rec === 'object' ? est.rec : (est.rec = {});
        // (a barra que voltou ao começo dela fica sem valor anotado: é o mesmo que o "voltar ao começo" da ficha)
        for (const r of ln.recursos) if (r.para !== r.de) { if (r.inicio != null && r.para === r.inicio) delete rec[r.id]; else rec[r.id] = r.para; }
        if (ln.san) est.san = ln.san.para;
        if (ln.conf) est.conf = ln.conf.para;
        // os bônus "até o próximo descanso" acabam aqui (os de qualquer origem); depois entra o que este descanso dá
        if (est.tmp && typeof est.tmp === 'object') { const t2 = {}; for (const k of Object.keys(est.tmp)) if (!(est.tmp[k] && est.tmp[k].ate === 'descanso')) t2[k] = est.tmp[k]; est.tmp = t2; }
        if (ln.fx.length) {
          // as barras dela como ficam depois do descanso (o efeito da comida parte daí)
          const p = pessoa(ln.id), recursos = (p ? p.recursos : []).map(r => { const x = ln.recursos.find(y => y.id === r.id); return Object.assign({}, r, { atual: x ? x.para : r.atual }); });
          const feito = aplicarFx(est, ln, recursos, agora);
          if (feito.length) naFicha.push(ln.nome + ': ' + feito.join(', '));
        }
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
    camp = N.aposDescanso(camp, plano, agora);
    // (o que foi para a ficha de cada um entra no diário, logo abaixo da linha do descanso)
    if (naFicha.length) camp = N.normalizar(Object.assign(N.copia(camp), { diario: [camp.diario[0], { id: N.novoId('di'), t: agora, texto: 'Na ficha — ' + naFicha.join(' · ') }].concat(camp.diario.slice(1)) }));
    gravar(); pintar();
    publicar(camp.nome, resumo + (naFicha.length ? '. Na ficha — ' + naFicha.join(' · ') : ''));
    toast(resumo + '.', 'Desfazer', desfazer, 15000);
  }

  /* ---- um momento entre dois personagens ---- */
  function abrirMomento() {
    if (!mestre() || !naMesa()) return;
    // (o momento mexe nos relacionamentos, e parte deles — os escondidos, os dos NPCs — fica guardada com as Fichas)
    if (!comSegredos()) { toast('O momento mexe nos relacionamentos, que são das Fichas. Para registrar um, peça ao mestre a aba Fichas.'); return; }
    const gente = presentes().filter(p => !p.semFicha);
    if (gente.length < 2) { toast('Um momento precisa de dois personagens com ficha em volta da fogueira.'); return; }
    const estado = { a: sel && gente.some(p => p.id === sel) ? sel : gente[0].id, b: null, da: 5, db: 5, texto: '' };
    estado.b = (gente.find(p => p.id !== estado.a) || gente[1]).id;
    const corpo = h('div', { style: 'display:grid;gap:12px' });
    const ok = h('button', { type: 'button', class: 'btn pri', id: 'mo-ok', text: 'Registrar o momento' });
    const nome = id => (gente.find(p => p.id === id) || {}).nome || '?';
    const relAtual = (de, para) => { const l = P.pegar(de), e = l ? R().relacaoCom(l.estado, segDe(de), para, !l.dono_id) : null; return e ? e.v : 0; };
    const desenhar = () => {
      // (as duas listas têm todo mundo: escolher num lado quem está no outro troca os dois de lugar)
      const opcoes = atual => gente.map(p => h('option', { value: p.id, selected: p.id === atual ? '' : null, text: p.nome }));
      const escolher = (lado, v) => { const outro = lado === 'a' ? 'b' : 'a'; if (v === estado[outro]) estado[outro] = estado[lado]; estado[lado] = v; desenhar(); const c0 = document.getElementById('mo-' + lado); if (c0) c0.focus(); };
      const linhaRel = (de, para, chave, id) => { const v0 = relAtual(de, para), v1 = N.limitar(v0 + estado[chave], -100, 100); return h('div', { class: 'lin', style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' },
        h('span', { style: 'flex:1;min-width:200px', text: 'O que ' + nome(de) + ' sente por ' + nome(para) }),
        h('input', { class: 'in num', id, type: 'number', min: -50, max: 50, step: 1, value: estado[chave], 'aria-label': 'Quanto muda o que ' + nome(de) + ' sente por ' + nome(para), onchange: e => { estado[chave] = N.limitar(Math.round(+e.target.value) || 0, -50, 50); desenhar(); const c0 = document.getElementById(id); if (c0) c0.focus(); } }),
        h('span', { class: 'mud', style: 'font-family:var(--mono);min-width:96px' }, seta(N.comSinal(v0).replace('+0', '0').replace('−0', '0'), v1 === 0 ? '0' : N.comSinal(v1)))); };
      corpo.replaceChildren(
        h('div', { class: 'lin', style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' },
          h('select', { class: 'in', id: 'mo-a', style: 'flex:1;min-width:150px', 'aria-label': 'Primeiro personagem', onchange: e => escolher('a', e.target.value) }, opcoes(estado.a)), h('span', { text: 'e' }),
          h('select', { class: 'in', id: 'mo-b', style: 'flex:1;min-width:150px', 'aria-label': 'Segundo personagem', onchange: e => escolher('b', e.target.value) }, opcoes(estado.b))),
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
      // (o valor pode estar na ficha ou guardado com o mestre — escondido do jogador, ou de um NPC: muda onde estiver)
      const npc = !l.dono_id, seg0 = segDe(de), antes = R().relacaoCom(l.estado, seg0, para, npc);
      let r = { estado: l.estado || {}, seg: seg0 };
      if (!antes) r = R().mexerRelacao(r.estado, r.seg, { t: 'nova', id: N.novoId('rel'), alvo: para, nome: nomePara, comMestre: npc, npc });
      const e = R().relacaoCom(r.estado, r.seg, para, npc); if (!e) return;
      const depois = R().mexerRelacao(r.estado, r.seg, { t: 'valor', id: e.id, v: e.v + delta, npc });
      if (depois.mudou) r = depois;
      let est = r.estado;
      if (est.san == null) est = Object.assign({}, est, { san: dentro(est.san, 100) });      // a ficha passa a usar o painel de Sanidade e Conforto
      fichas.push({ id: l.id, estado: l.estado || {}, ficha: null, seg: seg0 });
      if (est !== l.estado) P.gravar(de, { estado: est });
      if (r.seg !== seg0) porSeg(de, r.seg);
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
        // (com campanhas: as cenas da campanha em vista e as do mundo)
        const cs = Array.isArray(l.campanhas) ? l.campanhas : [];
        if (m && !l.apagado && l.dados && m[1] !== 'pub' && m[1] !== 'pedido' && (!campId || !cs.length || cs.includes(campId))) cenas.push({ id: m[1], nome: String(l.dados.name || 'Cena') });
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
        // a campanha em vista: o acampamento é o dela; numa campanha encerrada, é só para consulta (para todos)
        const cv = st.campanha || null;
        campId = cv ? cv.id : null;
        if (campId) DOC = 'acampamento@' + campId;
        encerrada = !!(cv && cv.encerrada);
        papel = st.papel === 'mestre' && !encerrada ? 'mestre' : 'jogador';
        P = TCx.dados.col('personagens'); D = TCx.dados.col('documentos');
        await Promise.all([P.pronta, D.pronta]);
      }
      TCx.ponte.aoMudar(e => { const antes = j(st.membros); st = e; if (pronto && antes !== j(e.membros)) { manterRoda(); pintar(); } });
    }
    if (naMesa()) {
      const d = D.pegar(DOC);
      camp = N.normalizar(d && !d.apagado ? d.dados : null);
      jCamp = j(camp);
      marcarSalvo(encerrada ? 'Campanha encerrada: só consulta' : st.temCampanhas && !campId ? 'Você ainda não está numa campanha' : 'Salvo na mesa');
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
