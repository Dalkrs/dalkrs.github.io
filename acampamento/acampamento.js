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
  /* O jogador a quem o mestre deu o acampamento (no menu da mesa, em Permissões) mexe em quase tudo: as provisões, a
     estrutura, a caravana, os lugares e as áreas, o diário. O descanso, as regras, os momentos, quem está no
     acampamento, o nome, a hora, os bônus, o lugar e o clima ficam com quem mestra (N.SO_MESTRE; o banco confere).
     O documento precisa existir: quem cria o acampamento da mesa (ou da campanha) é quem mestra. */
  const meuMembro = () => (st.membros || []).find(m => m.id === st.eu) || null;
  const docExiste = () => { const d = D && naMesa() ? D.pegar(DOC) : null; return !!d && !d.apagado; };
  const ajudante = () => naMesa() && !mestre() && !encerrada && !!(meuMembro() && meuMembro().acamp) && docExiste();
  const edita = () => mestre() || ajudante();
  // o painel em vista pode ser mudado por quem está olhando? (no Grupo: quem mestra; nas outras abas: quem edita)
  let podeAqui = false;
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
    if (!l) return r0 ? { id, nome: r0.nome || 'Sem nome', img: imagemOk(r0.img), dono: r0.dono, semFicha: true, recursos: [], san: null, conf: null, poderes: [], fad: null, tmp: [], grupo: '', raca: '', emo: emoDe(id, null) } : null;
    const est = l.estado || {}, ficha = l.ficha || {};
    let recursos = [], atr = {}, fixa = 0;
    try {
      const pc = Object.assign({}, ficha, { id: l.id, nome: l.nome });
      const rs = R().resumo(pc, cfgAtual(), { arvore: R().bonusDaArvore(l.skills, bibAtual()) }, est);
      recursos = rs.recursos.filter(x => x.max != null && Number.isFinite(x.max) && x.max > 0);
      // (lote 18) os atributos e a fixa da ficha: o teste da caça
      atr = Object.assign({}, rs.attrs, rs.der, rs.def); fixa = Math.max(0, Math.round(+rs.fixa || 0));
    } catch (e) { recursos = []; }
    // (o pet de um personagem — ficha.petDe — é como a ficha de um NPC: não liga sozinho o que a de jogador liga)
    const deJog = ehJogador(l.dono_id) && !ficha.petDe;
    const usa = est.san != null || est.conf != null || R().temRelacoes(est) || (mestre() && Object.keys(segDe(l.id)).length > 0) || deJog;
    return {
      id, nome: l.nome || 'Sem nome', img: imagemOk(ficha.img), dono: l.dono_id || null, semFicha: false, recursos,
      san: usa ? dentro(est.san, 100) : null, conf: usa ? dentro(est.conf, 50) : null,
      // as barras especiais (os antigos "poderes divinos"): a lista é da ficha, o valor de agora mora no estado (estado.pd)
      poderes: typeof R().especiais === 'function' ? R().especiais(ficha, est)
        : (Array.isArray(ficha.poderes) ? ficha.poderes : []).filter(x => x && x.id).map(x => ({ id: x.id, nome: x.nome || 'Barra especial', atual: Math.max(0, +x.atual || 0), max: Math.max(0, +x.max || 0), rec: x.rec, qc: x.qc, ql: x.ql })),
      // a fadiga (a pilha de 5 a 0), quando a ficha usa: a de um jogador da mesa, ou a que já tem a fadiga anotada
      fad: typeof R().usaFadiga === 'function' && R().usaFadiga(est, deJog) ? R().fadiga(est) : null,
      // os bônus "até o próximo descanso" que a ficha tem agora (o descanso tira, se o mestre deixar)
      tmp: est.tmp && typeof est.tmp === 'object' ? Object.keys(est.tmp).filter(k => est.tmp[k] && est.tmp[k].ate === 'descanso').map(k => ({ id: k, n: est.tmp[k].n, k: est.tmp[k].k, v: est.tmp[k].v })) : [],
      grupo: String(ficha.grupo || '').trim(), raca: String(ficha.raca || '').trim().slice(0, 40), emo: emoDe(id, l), atr, fixa,
    };
  }
  // quem está no acampamento, na ordem da lista (só os que ainda existem para quem está olhando)
  const presentes = () => camp.presentes.map(pessoa).filter(Boolean);
  const nomeDoDono = id => { const m = (st.membros || []).find(x => x.id === id); return m ? m.nome : ''; };

  /* ---------------- gravar, desfazer, o que vem de fora ---------------- */
  /* Na mesa, o acampamento é gravado conferindo a versão: com o mestre e um jogador (ou o mestre em dois aparelhos)
     mexendo ao mesmo tempo, a casca junta as duas mudanças em vez de pôr uma por cima da outra. O jogador grava só as
     partes dele: as do mestre vão exatamente como estão no banco (N.paraJogador). */
  function gravar() {
    jCamp = j(camp);
    if (naMesa()) {
      if (mestre()) D.gravar(DOC, { dados: JSON.parse(jCamp), vis: 'mesa' }, undefined, { cas: true });
      else if (ajudante()) { const cru = D.pegar(DOC); D.gravar(DOC, { dados: N.paraJogador(cru && cru.dados, camp) }, undefined, { cas: true }); }
      marcarSalvo('Salvo na mesa');
    }
    else if (guarda.gravar(CHAVE, jCamp)) marcarSalvo('Salvo neste navegador');
    else marcarSalvo('Sem espaço no navegador', true);
  }
  /* Toda mudança no acampamento passa por aqui: fn mexe num rascunho (ou devolve false para desistir). */
  function mudar(rotulo, fn, opt) {
    if (!edita()) return false;
    const rasc = N.copia(camp);
    if (fn(rasc) === false) return false;
    const novo = N.normalizar(rasc), jn = j(novo);
    if (jn === jCamp) return false;
    // (quem não mestra não muda as partes do mestre: o site não oferece, e o banco recusaria)
    if (!mestre() && N.mexeNoMestre(camp, novo)) { toast('Só o mestre muda isso no acampamento.'); pintar(); return false; }
    if (!(opt && opt.silencioso)) {
      const topo = pilha[pilha.length - 1];
      if (opt && opt.junta && topo && topo.junta === opt.junta) topo.depois = jn;
      else pilha.push({ rotulo, json: jCamp, depois: jn, junta: (opt && opt.junta) || null, fichas: (opt && opt.fichas) || null });
      if (pilha.length > 60) pilha.shift();
    }
    camp = novo;
    gravar();
    pintar();
    return true;
  }
  /* A junta em três vias da casca (a mesma das cenas): desfazer volta só o que aquele passo mudou, por cima do que está
     aqui agora — o que outra pessoa mexeu nesse meio-tempo fica. Fora da casca, null (o desfazer volta o acampamento). */
  const juntar3 = () => { try { const d = window.parent !== window && window.parent.TC && window.parent.TC.dados; return d && d.remendo && typeof d.remendo.juntar3 === 'function' ? d.remendo.juntar3 : null; } catch (e) { return null; } };
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
    if (!edita() || !pilha.length) return false;
    const p = pilha.pop(), antes = JSON.parse(p.json), j3 = juntar3();
    // (o que mudou depois deste passo — por outra pessoa, ou num passo seguinte já desfeito — fica)
    let volta = j3 && p.depois && p.depois !== jCamp ? N.normalizar(j3(JSON.parse(p.depois), antes, N.copia(camp))) : N.normalizar(antes);
    if (!mestre()) { const v = N.copia(volta); for (const k of N.SO_MESTRE) v[k] = N.copia(camp[k]); volta = N.normalizar(v); }      // (as partes do mestre ficam como estão)
    camp = volta;
    if (p.fichas && naMesa()) for (const f of p.fichas) {
      // f.so: só estas chaves do estado voltam (a Sanidade, o Conforto); sem f.so, o estado inteiro
      if (Array.isArray(f.so)) { const l = P.pegar(f.id); if (!l) continue; const est = Object.assign({}, l.estado || {}); for (const k of f.so) { if (f.estado[k] === undefined) delete est[k]; else est[k] = f.estado[k]; } P.gravar(f.id, { estado: est }); continue; }
      const campos = { estado: f.estado }; if (f.ficha) campos.ficha = f.ficha; P.gravar(f.id, campos); if (f.seg !== undefined) porSeg(f.id, f.seg);
    }
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
    // mudou em outro aparelho (ou outra pessoa mexeu): com a junta em três vias, o desfazer continua valendo — cada passo
    // volta só o que ele mudou; sem ela (fora da casca), recomeça daqui
    if (!juntar3()) pilha = [];
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

  /* ---------------- o cenário ----------------
     O desenho vem de AcampDesenhos (desenhos.js): o lugar, a área em vista, as construções de pé nela (cada uma no nível
     dela) e, na fogueira, a caravana. Só é refeito quando alguma dessas coisas muda. */
  let chaveCenario = '';
  function desenharCenario() {
    const AD = window.AcampDesenhos; if (!AD) return;
    const cs = N.construcoes(camp, areaVista).map(m => ({ tipo: m.tipo, nivel: m.nivel }));
    // (lote 18) o estado de cada veículo no desenho: a roda quebrada (escrita no Estado) e a carga demais
    const peso = N.cargaDe(camp), quebrou = t => /quebrad|partid|sem roda/.test(String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
    const car = areaVista === 'fogueira' && camp.verCaravana ? camp.caravana.veiculos.map(v => ({ tipo: v.tipo, quebrado: quebrou(v.estado), cheio: v.cap > 0 && (peso.por[v.id] || 0) > v.cap })) : [];
    // os abrigos: quantos estão na fogueira e o que o grupo tem em uso no Equipamento (tenda, toldo, rede, barracas)
    const ab = areaVista === 'fogueira' ? { n: camp.presentes.filter(id => N.areaDe(camp, id) === 'fogueira').length, tipos: [...AD.tiposDeAbrigo(camp.equipamentos.filter(e => e.on).map(e => e.nome))] } : null;
    const chave = j([camp.lugar, areaVista, cs, car, ab]);
    if (chave === chaveCenario) return;
    chaveCenario = chave;
    $('cenario').innerHTML = AD.cena({ lugar: camp.lugar, area: areaVista, construcoes: cs, caravana: car, abrigos: ab });
  }
  /* ---- a área em vista (cada um escolhe a sua; fica neste aparelho) ---- */
  let areaVista = (() => { const a = guarda.ler('tinycats:acampamento:area'); return N.AREAS.some(x => x[0] === a) ? a : 'fogueira'; })();
  function verArea(a) {
    if (!N.AREAS.some(x => x[0] === a) || a === areaVista) return;
    areaVista = a; guarda.gravar('tinycats:acampamento:area', a);
    if (sel && N.areaDe(camp, sel) !== a) sel = null;
    pintarCena(); pintarPainel();
  }
  /* ---- o clima: as gotas, os flocos, a névoa e as folhas (montados uma vez para cada clima) ---- */
  let climaFeito = null;
  function pintarClima() {
    const c = camp.clima, el = $('clima');
    if (c === climaFeito) return;
    climaFeito = c;
    el.className = 'clima clima-' + c;
    let a = 9301;
    const r = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
    const n = { chuva: 90, tempestade: 130, neve: 70, neblina: 3, vento: 26 }[c] || 0, out = [];
    for (let i = 0; i < n; i++) {
      if (c === 'neblina') out.push(`<i style="--b:${4 + i * 14}%;--t:${38 + i * 14}s;animation-delay:-${(r() * 40).toFixed(1)}s"></i>`);
      else if (c === 'neve') out.push(`<i style="left:${(r() * 104 - 2).toFixed(1)}%;--d:${(3 + r() * 5).toFixed(1)}px;--t:${(7 + r() * 7).toFixed(1)}s;animation-delay:-${(r() * 14).toFixed(1)}s"></i>`);
      else if (c === 'vento') out.push(`<i style="--y:${(15 + r() * 75).toFixed(1)}%;--c:${['#b8873e', '#8f9a4a', '#a3542e', '#c9a35a'][i % 4]};--t:${(4 + r() * 4).toFixed(1)}s;animation-delay:-${(r() * 8).toFixed(1)}s"></i>`);
      else out.push(`<i style="left:${(r() * 120 - 5).toFixed(1)}%;--t:${((c === 'tempestade' ? 0.45 : 0.7) + r() * 0.35).toFixed(2)}s;animation-delay:-${(r() * 2).toFixed(2)}s"></i>`);
    }
    el.innerHTML = out.join('');
  }
  /* ---- as linhas de relação (clicando num personagem) ----
     Do escolhido até cada um da mesma área com quem há relação: a metade de perto de cada um é o que ele sente pelo
     outro — verde gosta, vermelho não gosta, rosa é romance. Quem mestra vê tudo (até o que está escondido dos
     jogadores); os jogadores, só o que está aberto, nas fichas que veem. */
  function relacaoVista(de, para) {
    const l = linha(de); if (!l || !R()) return null;
    if (mestre() && comSegredos()) { const e = R().relacaoCom(l.estado, segDe(de), para, !l.dono_id); return e ? { v: e.v, rom: e.rom } : null; }
    const e = R().relacaoCom(l.estado, null, para);
    return e && !e.oc ? { v: e.v, rom: e.rom } : null;
  }
  let rodaAtual = { gente: [], lugares: [] };
  function desenharLinhas() {
    const svgL = $('linhas'), { gente, lugares } = rodaAtual, i = sel ? gente.findIndex(p => p.id === sel) : -1;
    if (i < 0) { svgL.replaceChildren(); return 0; }
    const pk = parseFloat($('cena16').style.getPropertyValue('--pk')) || 1;
    const centro = l => [l.x * 16, l.y * 9 - 11 * pk];
    const c1 = v => v.toFixed(1);
    /* Cada linha é uma curva que sobe um pouco (mais, quanto mais longe a pessoa): assim a linha até quem está atrás de
       outra não passa por cima dela. A curva é partida no meio; cada metade sai de uma das pessoas. */
    const meia = (p0, p1, p2, rel) => {
      if (!rel) return '';
      const cl = rel.rom > 0 ? 'rom' : rel.v > 0 ? 'pos' : rel.v < 0 ? 'neg' : 'zero', d = `M${c1(p0[0])} ${c1(p0[1])}Q${c1(p1[0])} ${c1(p1[1])} ${c1(p2[0])} ${c1(p2[1])}`;
      // o número fica no meio da metade, um pouco acima da linha
      const tx = 0.25 * p0[0] + 0.5 * p1[0] + 0.25 * p2[0], ty = 0.25 * p0[1] + 0.5 * p1[1] + 0.25 * p2[1] - 14;
      const rot = (rel.v > 0 ? '+' : rel.v < 0 ? '−' : '') + Math.abs(rel.v) + (rel.rom ? ' ♥' + rel.rom : '');
      return `<path class="fundo-l" d="${d}"/><path class="meia ${cl}" d="${d}"/><text x="${c1(tx)}" y="${c1(ty)}" text-anchor="middle">${rot}</text>`;
    };
    const a = gente[i], partes = [];
    let n = 0;
    gente.forEach((b, k) => {
      if (k === i) return;
      const ab = relacaoVista(a.id, b.id), ba = relacaoVista(b.id, a.id);
      if (!ab && !ba) return;
      const A = centro(lugares[i]), B = centro(lugares[k]), dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1;
      let nx = -dy / len, ny = dx / len;
      if (ny > 0) { nx = -nx; ny = -ny; }                    // (a curva sobe)
      const curva = Math.min(170, 0.22 * len), C = [(A[0] + B[0]) / 2 + nx * curva, (A[1] + B[1]) / 2 + ny * curva];
      const Q0 = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2], Q1 = [(C[0] + B[0]) / 2, (C[1] + B[1]) / 2], M = [(Q0[0] + Q1[0]) / 2, (Q0[1] + Q1[1]) / 2];
      partes.push(`<g data-de="${a.id}" data-para="${b.id}">` + meia(A, Q0, M, ab) + meia(B, Q1, M, ba) + '</g>');
      n++;
    });
    svgL.innerHTML = partes.join('');
    return n;
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
    desenharLinhas();
  }

  /* ---------------- pintar ---------------- */
  let focoDepois = null;
  function pintar() {
    if (!pronto) return;
    pintarTopo(); pintarCena(); pintarPainel();
  }
  function pintarTopo() {
    document.documentElement.classList.toggle('jogador', !mestre());
    document.documentElement.classList.toggle('so-leitura', !edita());
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
    $('btTodos').hidden = !naMesa();
  }
  function barrinha(v, max, cor) { return h('div', { class: 'b' }, h('i', { style: `width:${N.limitar(max > 0 ? v / max * 100 : 0, 0, 100)}%;--c:${cor}` })); }
  function pintarCena() {
    const pa = $('palco');
    // (a imagem de fundo do mestre é a da fogueira; as outras áreas são desenhadas)
    const fundo = camp.fundo && areaVista === 'fogueira' ? camp.fundo : null;
    pa.className = 'palco hora-' + camp.hora + ' lugar-' + camp.lugar + (fundo ? ' com-fundo' : '');
    desenharCenario(); pintarClima();
    const c16 = $('cena16');
    let im = c16.querySelector('img.fundo');
    if (fundo) {
      if (!im) {
        im = h('img', { class: 'fundo', alt: '' });
        c16.insertBefore(im, $('roda'));
        for (const lado of ['cima', 'baixo']) c16.insertBefore(h('div', { class: 'longe ' + lado, 'aria-hidden': 'true' }, h('img', { alt: '' })), im);
      }
      if (im.getAttribute('src') !== fundo.url) for (const x of c16.querySelectorAll('img.fundo, .longe img')) x.src = fundo.url;
    } else if (im) { im.remove(); for (const x of c16.querySelectorAll('.longe')) x.remove(); }
    // quem está na área em vista (e as abas das áreas, com quantos há em cada uma)
    const todos = presentes(), gente = todos.filter(p => N.areaDe(camp, p.id) === areaVista), n = gente.length;
    $('areas').replaceChildren(...N.AREAS.map(([k, nome]) => { const q = todos.filter(p => N.areaDe(camp, p.id) === k).length, cs = N.construcoes(camp, k).length;
      return h('button', { type: 'button', id: 'area-tab-' + k, 'aria-pressed': String(areaVista === k), title: nome + ': ' + (q === 1 ? '1 personagem' : q + ' personagens') + (cs ? ' · ' + (cs === 1 ? '1 construção' : cs + ' construções') : ''), onclick: () => verArea(k) },
        nome, h('span', { class: 'n', text: String(q) })); }),
      // (lote 18) o quadro de distribuir: todos de uma vez, arrastando entre as áreas
      ...(edita() && todos.length ? [h('button', { type: 'button', id: 'btDistribuir', class: 'distribuir', title: 'Distribuir os personagens pelas áreas', onclick: abrirDistribuir }, 'Distribuir…')] : []));
    const lugares = gente.map((p, i) => camp.lugares[p.id] || N.lugarPadrao(i, n));
    folgaDaRoda = N.folga(lugares);
    rodaAtual = { gente, lugares };
    $('roda').replaceChildren(...gente.map((p, i) => {
      const lugar = lugares[i], emo = N.emocao(p.emo);
      // a aura da emoção é um brilho na cor dela, atrás do retrato (o nome dela vai na dica e no que o leitor de tela lê)
      const el = h('button', { type: 'button', class: 'pers' + (sel === p.id ? ' sel' : '') + (emo ? ' com-emo' : ''), 'data-id': p.id, 'data-pode': edita() ? '' : null, 'data-emo': emo ? emo.k : null,
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
    vz.hidden = n > 0 || (areaVista !== 'fogueira' && N.construcoes(camp, areaVista).length > 0);
    if (vz.hidden) vz.textContent = '';
    else if (areaVista !== 'fogueira') vz.textContent = 'Ninguém aqui e nada construído ainda.' + (edita() ? ' As construções desta área ficam na aba Estrutura; quem vem para cá, no cartão de cada um, na aba Grupo.' : '');
    else vz.textContent = mestre() ? (linhas().length ? 'Ninguém em volta da fogueira ainda. Chame os personagens pela aba Grupo.' : (naMesa() ? 'A mesa ainda não tem fichas. Crie os personagens na aba Fichas e chame-os para cá.' : 'Sem fichas neste navegador. Crie os personagens na aba Fichas e chame-os para cá.')) : todos.length ? 'Ninguém na fogueira agora: veja as outras áreas, acima.' : 'O mestre ainda não chamou ninguém para o acampamento.';
    const ef = N.efeitos(camp), txt = N.textoEfeitos(ef), alguns = N.temParaAlguns(camp);
    // (sem melhorias em uso não há o que dizer da estrutura: o null sai no filtro — o navegador o escreveria na cena)
    const comLinhas = sel && gente.some(p => p.id === sel) ? (gente.find(p => p.id === sel) || {}).nome : null;
    $('avisosCena').replaceChildren(...[
      ...camp.bonus.map(b => h('span', { class: 'chip', title: b.desc || null }, h('b', { text: b.nome || 'Bônus' }), b.ateDescanso ? ' até o descanso' : null)),
      txt || alguns ? h('span', { class: 'chip', title: 'O que as melhorias e os equipamentos em uso somam ao descanso longo' }, 'Estrutura: ', h('b', { text: txt || 'só para alguns' }), txt && alguns ? ' · e mais, só para alguns' : null) : null,
      // (as linhas tracejadas: a legenda, enquanto alguém está escolhido)
      comLinhas ? h('span', { class: 'chip', id: 'legendaRel', title: 'Cada metade da linha é o que um sente pelo outro' }, 'Relações de ', h('b', { text: comLinhas }), ': verde gosta · vermelho não gosta · rosa, romance') : null].filter(Boolean));
    ajustarPalco();
  }

  /* ---- arrastar quem está na roda (só o mestre) ---- */
  let arrasto = null;
  $('roda').addEventListener('pointerdown', ev => {
    const el = ev.target.closest('.pers'); if (!el || ev.button !== 0) return;
    arrasto = { id: el.dataset.id, el, x0: ev.clientX, y0: ev.clientY, moveu: false, pid: ev.pointerId, esq: parseFloat(el.style.left), topo: parseFloat(el.style.top) };
  });
  window.addEventListener('pointermove', ev => {
    if (!arrasto || ev.pointerId !== arrasto.pid || !edita()) return;
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
    if (!d || !edita()) return;
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
    podeAqui = aba === 'grupo' ? mestre() : edita();
    const esperando = naMesa() && !mestre() && !encerrada && !!(meuMembro() && meuMembro().acamp) && !docExiste();
    pane.replaceChildren(...[esperando ? h('p', { class: 'aviso', id: 'acamp-espera', text: 'O mestre deixou você mexer no acampamento, mas ele ainda não foi aberto nesta mesa. Quando o mestre abrir o Acampamento uma vez, você poderá mexer aqui.' }) : null,
      ...({ grupo: abaGrupo, provisoes: abaProvisoes, estrutura: abaEstrutura, caravana: abaCaravana, diario: abaDiario }[aba])()].flat(Infinity).filter(Boolean));
    pane.scrollTop = rolagem;
    const alvo = focoDepois || ativo; focoDepois = null;
    if (alvo) { const el = document.getElementById(alvo); if (el && !el.disabled) el.focus({ preventScroll: true }); }
  }
  // campos: o texto vira mudança quando a pessoa termina (Enter ou ao sair do campo)
  const campoTexto = (id, valor, rotulo, aoMudar, o) => h('input', Object.assign({ id, class: 'in', type: 'text', value: valor, 'aria-label': rotulo, autocomplete: 'off', maxlength: 80, readOnly: !podeAqui, onchange: e => aoMudar(e.target.value) }, o || {}));
  const campoArea = (id, valor, rotulo, aoMudar, dica) => h('textarea', { id, class: 'in', rows: 2, 'aria-label': rotulo, placeholder: dica || null, maxlength: 600, readOnly: !podeAqui, onchange: e => aoMudar(e.target.value) }, valor);
  const campoNum = (id, valor, rotulo, aoMudar, min, max) => h('input', { id, class: 'in num', type: 'number', value: valor, min, max, step: 1, 'aria-label': rotulo, title: rotulo, disabled: !podeAqui, onchange: e => { const v = Math.round(+e.target.value); aoMudar(Number.isFinite(v) ? N.limitar(v, min, max) : 0); } });
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
    if (mestre()) { pilha.push({ rotulo: 'a emoção de ' + p.nome, json: jCamp, depois: jCamp, junta: null, fichas: [{ id: l.id, estado: antes, ficha: null, so: ['emo'] }] }); if (pilha.length > 60) pilha.shift(); }
    P.gravar(l.id, { estado: est });
    // (o que este aparelho grava não volta como mudança de fora: o mestre põe a emoção na roda aqui mesmo)
    manterRoda();
    pintar();
  }
  /* ---- a Sanidade e o Conforto, pelo mestre (ficam na ficha: estado.san / estado.conf) ----
     Cliques seguidos na mesma barra viram um passo só de desfazer; o desfazer volta só aquela barra. */
  const podeMente = p => naMesa() && mestre() && !p.semFicha && !!P.pegar(p.id);
  function mudarMente(p, k, v) {
    const l = P.pegar(p.id); if (!l || !Number.isFinite(+v)) { pintar(); return; }
    const antes = l.estado || {}, atual = dentro(antes[k], k === 'san' ? 100 : 50), novo = N.limitar(Math.round(+v), 0, 100);
    if (novo === atual && antes[k] != null) { pintar(); return; }
    const chave = 'mente:' + p.id + ':' + k, topo = pilha[pilha.length - 1], agora = Date.now();
    if (topo && topo.junta === chave && agora - topo.t < 8000) topo.t = agora;
    else { pilha.push({ rotulo: (k === 'san' ? 'a Sanidade' : 'o Conforto') + ' de ' + p.nome, json: jCamp, depois: jCamp, junta: chave, t: agora, fichas: [{ id: l.id, estado: antes, ficha: null, so: [k] }] }); if (pilha.length > 60) pilha.shift(); }
    P.gravar(l.id, { estado: Object.assign({}, antes, { [k]: novo }) });
    pintar();
  }
  function linhaMente(p, k) {
    const nome = k === 'san' ? 'Sanidade' : 'Conforto', v = p[k] != null ? p[k] : (k === 'san' ? 100 : 50), id = 'mt-' + k + '-' + p.id;
    return h('div', { class: 'medidor mente' }, h('span', { text: nome }), h('span', { class: 'tr' }, h('i', { style: `width:${N.limitar(v, 0, 100)}%;--c:var(--${k})` })),
      h('span', { class: 'passo' },
        botaoIcone(id + '-m', MENOS, nome + ' de ' + p.nome + ': menos 1', () => { focoDepois = id + '-m'; mudarMente(p, k, v - 1); }, { disabled: v <= 0 }),
        h('input', { class: 'in num', id, type: 'number', min: 0, max: 100, step: 1, value: v, 'aria-label': nome + ' de ' + p.nome + ' (0 a 100)', onchange: e => { focoDepois = id; mudarMente(p, k, e.target.value); } }),
        botaoIcone(id + '-p', MAIS, nome + ' de ' + p.nome + ': mais 1', () => { focoDepois = id + '-p'; mudarMente(p, k, v + 1); }, { disabled: v >= 100 })));
  }
  /* ---- as áreas do acampamento (a fogueira, as oficinas, o convívio, a guarda e o cuidado) ---- */
  const nomeDaArea = k => (N.AREAS.find(a => a[0] === k) || N.AREAS[0])[1];
  const COM_ARTIGO = { fogueira: 'a fogueira', oficinas: 'as oficinas', convivio: 'o convívio', guarda: 'a guarda e o cuidado', caca: 'a caça' };
  const paraAArea = k => COM_ARTIGO[k] || nomeDaArea(k).toLowerCase();
  function moverDeArea(p, area) {
    const de = N.areaDe(camp, p.id);
    if (area === de) return;
    if (mudar(p.nome + ' para ' + nomeDaArea(area), c => { if (area === 'fogueira') delete c.area[p.id]; else c.area[p.id] = area; delete c.lugares[p.id]; }) && area !== areaVista)
      toast(p.nome + ' foi para ' + paraAArea(area) + '.', 'Ver', () => verArea(area));
  }
  /* (lote 18) O quadro de distribuir: uma coluna por área, com os retratos de quem está em cada uma. Arrastar um retrato
     para outra coluna (ou ←/→ com ele em foco) muda a área — cada mudança é um passo de desfazer, e a janela tem o
     Desfazer dela. */
  function abrirDistribuir() {
    if (!edita()) return;
    let feitos = 0, arrastado = null, focoDepois2 = null;
    const corpo = h('div', { class: 'quadro', id: 'quadro' });
    const desf = h('button', { type: 'button', class: 'btn', id: 'qd-desfazer', text: 'Desfazer', disabled: true });
    const mover = (p, area) => {
      if (N.areaDe(camp, p.id) === area) return;
      if (mudar(p.nome + ' para ' + nomeDaArea(area), c => { if (area === 'fogueira') delete c.area[p.id]; else c.area[p.id] = area; delete c.lugares[p.id]; })) { feitos++; focoDepois2 = 'qd-p-' + p.id; }
      desenhar();
    };
    const desenhar = () => {
      const gente = presentes();
      corpo.replaceChildren(...N.AREAS.map(([k, nome], i) => {
        const aqui = gente.filter(p => N.areaDe(camp, p.id) === k);
        const col = h('section', { class: 'qd-col', 'data-area': k, 'aria-label': nome + ': ' + aqui.length,
          ondragover: e => { if (arrastado) { e.preventDefault(); col.classList.add('alvo'); } }, ondragleave: () => col.classList.remove('alvo'),
          ondrop: e => { e.preventDefault(); col.classList.remove('alvo'); const p = arrastado && gente.find(x => x.id === arrastado); arrastado = null; if (p) mover(p, k); } },
          h('h3', {}, nome, h('span', { class: 'n', text: String(aqui.length) })),
          ...(aqui.length ? [] : [h('p', { class: 'note', text: 'Ninguém.' })]),
          ...aqui.map(p => h('div', { class: 'qd-p', id: 'qd-p-' + p.id, 'data-id': p.id, draggable: 'true', tabindex: '0', role: 'button',
            'aria-label': p.nome + ', em ' + nome + '. Arraste para outra área, ou use as setas para os lados.', title: 'Arraste para outra área (ou ← →)',
            ondragstart: e => { arrastado = p.id; try { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move'; } catch (x) { /* sem dados */ } },
            ondragend: () => { arrastado = null; },
            onkeydown: e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); const j0 = i + (e.key === 'ArrowLeft' ? -1 : 1); if (j0 >= 0 && j0 < N.AREAS.length) mover(p, N.AREAS[j0][0]); } },
            h('span', { class: 'rt' }, p.img ? h('img', { src: p.img, alt: '' }) : iniciais(p.nome)), h('span', { class: 'nm', text: p.nome }))));
        return col;
      }));
      desf.disabled = !feitos;
      if (focoDepois2) { const c0 = document.getElementById(focoDepois2); focoDepois2 = null; if (c0) c0.focus(); }
    };
    desf.addEventListener('click', () => { if (!feitos) return; desfazer(); feitos--; desenhar(); });
    desenhar();
    abrirJanela('Distribuir pelas áreas', h('div', {}, h('p', { class: 'note', text: 'Arraste cada retrato para a área onde o personagem fica. Quem está na Caça caça no descanso longo.' }), corpo),
      [desf, h('button', { type: 'button', class: 'btn pri', id: 'qd-ok', text: 'Pronto', onclick: fecharJanela })]);
    dlg.classList.add('largo');
    dlg.addEventListener('close', () => dlg.classList.remove('largo'), { once: true });
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
          p.fad != null ? medidor('Fadiga', p.fad, N.FAD_MAX, 'var(--outro)') : null,
          ...p.poderes.filter(x => x.max > 0).map(x => medidor(x.nome, x.atual, x.max, 'var(--outro)'))) : null,
        aberto && p.semFicha ? h('span', { class: 'med note', text: 'A ficha deste personagem não está à vista para você.' }) : null);
      const acoes = aberto ? h('div', { class: 'cartao' },
        podeEmo(p) ? [h('span', { class: 'note', text: 'Emoção — a aura em volta do retrato, que todos veem' }), seletorEmo(p)]
          : emo ? h('span', { class: 'note' }, 'Emoção: ', h('b', { text: emo.nome })) : null,
        // a Sanidade e o Conforto (moram na ficha): quem mestra muda aqui mesmo, de 1 em 1 ou digitando
        podeMente(p) ? h('div', { class: 'mente-ed', role: 'group', 'aria-label': 'Sanidade e Conforto de ' + p.nome }, linhaMente(p, 'san'), linhaMente(p, 'conf')) : null,
        // em que área do acampamento está (os suportes podem ficar nas oficinas, na guarda…)
        edita() ? h('label', { class: 'sw area-de' }, 'Está em',
          h('select', { class: 'in', id: 'area-' + p.id, 'aria-label': 'Em que área do acampamento ' + p.nome + ' está', onchange: e => { focoDepois = 'area-' + p.id; moverDeArea(p, e.target.value); } },
            N.AREAS.map(([k, nome]) => h('option', { value: k, text: nome, selected: N.areaDe(camp, p.id) === k }))))
          : N.areaDe(camp, p.id) !== 'fogueira' ? h('span', { class: 'note' }, 'Está em: ', h('b', { text: nomeDaArea(N.areaDe(camp, p.id)) })) : null,
        h('div', { class: 'lin' },
        naCasca() && !p.semFicha ? h('button', { type: 'button', class: 'btn sm', text: 'Abrir a ficha', onclick: () => TC.ponte.ir('fichas', { pc: p.id }) }) : null,
        edita() && camp.lugares[p.id] ? h('button', { type: 'button', class: 'btn sm', text: 'Voltar ao lugar padrão', onclick: () => mudar('lugar de ' + p.nome, c => { delete c.lugares[p.id]; }) }) : null,
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
      h('p', { class: 'sub', text: gente.length ? (gente.length === 1 ? '1 personagem' : gente.length + ' personagens') + (edita() ? ' · arraste cada um na cena para mudar de lugar' : '') : 'Ninguém ainda.' }),
      !naMesa() ? h('p', { class: 'note', text: 'Sem mesa aberta: aqui aparecem as fichas deste navegador, para consulta. O descanso mostra o que cada um recupera, mas só muda as fichas quando há uma mesa.' }) : null,
      h('div', { class: 'gente' }, cartoes),
      chamar,
      h('div', { class: 'sec' }, h('div', { class: 'rot' }, 'Bônus do acampamento', mestre() ? h('button', { type: 'button', class: 'btn sm', id: 'bn-novo', text: '+ Bônus', onclick: () => { const it = N.item('bonus'); focoDepois = 'bn-n-' + it.id; mudar('novo bônus', c => { c.bonus.push(it); }); } }) : null),
        bonus.length ? bonus : h('p', { class: 'note', text: mestre() ? 'Nenhum bônus. Use para o que a mesa combinar: "Moral alta", "Bênção do templo"…' : 'Nenhum bônus por enquanto.' })),
      mestre() ? h('div', { class: 'sec' }, h('div', { class: 'rot' }, 'A cena'),
        // onde o acampamento está (muda o desenho) e o tempo (animado, por cima da cena)
        h('div', { class: 'servir' },
          h('span', { text: 'Lugar' }),
          h('select', { class: 'in', id: 'lugar', 'aria-label': 'Onde o acampamento está', onchange: e => { focoDepois = 'lugar'; mudar('mudar o lugar', c => { c.lugar = e.target.value; }); } },
            N.LUGARES.map(([k, nome]) => h('option', { value: k, text: nome, selected: camp.lugar === k }))), h('span'),
          h('span', { text: 'Clima' }),
          h('select', { class: 'in', id: 'clima-sel', 'aria-label': 'O tempo no acampamento', onchange: e => { focoDepois = 'clima-sel'; mudar('mudar o clima', c => { c.clima = e.target.value; }); } },
            N.CLIMAS.map(([k, nome]) => h('option', { value: k, text: nome, selected: camp.clima === k }))), h('span')),
        // (lote 7, parte 5c) o clima de hoje no Mapa-múndi: aparece aqui, e o mestre usa na cena se quiser
        ...(cm => (cm ? [h('div', { class: 'lin clima-mundo', id: 'clima-mundo' }, h('span', { class: 'note', text: 'Hoje no Mapa-múndi: ' + cm.nome + (cm.conf ? ' — a noite mexe no Conforto (' + N.comSinal(cm.conf) + '), proposto no descanso longo.' : '.') }),
          camp.clima !== cm.acamp ? h('button', { type: 'button', class: 'btn sm', id: 'clima-usar', text: 'Usar na cena', onclick: () => { focoDepois = 'clima-sel'; mudar('usar o clima do Mapa-múndi', c => { c.clima = cm.acamp; }); } }) : null)] : []))(climaDoMundo()),
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
      const tipo = h('select', { class: 'in', id: `${pre}-fxt-${f.id}`, 'aria-label': 'O que o efeito faz', disabled: !podeAqui,
        onchange: e => { focoDepois = `${pre}-fxt-${f.id}`; const t = e.target.value, b = nomesDeBarras()[0]; muda('efeito na ficha', g => { for (const k of Object.keys(g)) if (k !== 'id') delete g[k]; Object.assign(g, t === 'bonus' ? { t, k: 'FOR', v: 1, dur: 'descanso' } : t === 'barra' ? { t, b, val: '10' } : { t, b, v: 10 }); }); } },
        h('option', { value: 'bonus', text: 'Bônus', selected: f.t === 'bonus' }), h('option', { value: 'barra', text: 'Recupera', selected: f.t === 'barra' }), h('option', { value: 'sob', text: 'Sobrevida', selected: f.t === 'sob' }));
      let campos;
      if (f.t === 'bonus') campos = [
        h('select', { class: 'in chave', id: `${pre}-fxk-${f.id}`, 'aria-label': 'Onde o bônus soma', disabled: !podeAqui, onchange: e => { focoDepois = `${pre}-fxk-${f.id}`; muda('bônus na ficha', g => { g.k = e.target.value; }); } }, opcoesDeChave(f.k)),
        h('input', { class: 'in val', id: `${pre}-fxv-${f.id}`, type: 'number', step: 1, value: f.v, 'aria-label': 'Quanto o bônus soma', disabled: !podeAqui, onchange: e => muda('bônus na ficha', g => { g.v = Math.round((+e.target.value || 0) * 10) / 10; }) }),
        // (a duração vai numa linha só dela, embaixo — ver "dur" logo abaixo)
      ];
      else campos = [
        h('select', { class: 'in chave', id: `${pre}-fxb-${f.id}`, 'aria-label': f.t === 'barra' ? 'A barra que recupera' : 'A barra que ganha a sobrevida', disabled: !podeAqui, onchange: e => { focoDepois = `${pre}-fxb-${f.id}`; muda('barra do efeito', g => { g.b = e.target.value; }); } }, nomesDeBarras(f.b).map(b => h('option', { value: b, text: b, selected: b === f.b }))),
        f.t === 'barra' ? h('input', { class: 'in val', id: `${pre}-fxv-${f.id}`, value: f.val, maxlength: 24, placeholder: '10', 'aria-label': 'Quanto a barra recupera', title: 'Um número (20), dados (2d6+3, rolados no descanso) ou, com sinal de menos, o que tira (−5)', disabled: !podeAqui,
          onchange: e => { const v = e.target.value.replace(/\s+/g, '').slice(0, 24), lido = R() ? R().lerEfeito(v) : null; if (!v || (lido && lido.erro)) { toast((lido && lido.erro) || 'Escreva um valor (20) ou dados (2d6+3).'); e.target.value = f.val; return; } muda('o que a barra recupera', g => { g.val = v; }); } })
          : h('input', { class: 'in val', id: `${pre}-fxv-${f.id}`, type: 'number', min: 0, step: 1, value: f.v, 'aria-label': 'Quanta sobrevida', title: 'Pontos por cima da barra: o dano gasta a sobrevida antes. Não soma com a que o personagem já tem: fica a maior.', disabled: !podeAqui, onchange: e => muda('sobrevida', g => { g.v = Math.max(0, Math.round((+e.target.value || 0) * 10) / 10); }) })];
      const tira = podeAqui ? botaoIcone(`${pre}-fxx-${f.id}`, X, 'Tirar este efeito', () => set('tirar o efeito na ficha', x => { x.fx = x.fx.filter(y => y.id !== f.id); })) : null;
      // quanto o bônus dura: até o próximo descanso (de qualquer tipo), ou algumas rodadas (o mestre desconta na ficha)
      const dur = f.t === 'bonus' ? h('span', { class: 'dur' },
        h('select', { class: 'in', id: `${pre}-fxd-${f.id}`, 'aria-label': 'Quanto o bônus dura', disabled: !podeAqui, onchange: e => { focoDepois = `${pre}-fxd-${f.id}`; muda('duração do bônus', g => { g.dur = e.target.value; if (g.dur === 'rodadas' && !g.r) g.r = 3; }); } },
          h('option', { value: 'descanso', text: 'até o próximo descanso', selected: f.dur !== 'rodadas' }), h('option', { value: 'rodadas', text: 'por rodadas', selected: f.dur === 'rodadas' })),
        f.dur === 'rodadas' ? h('input', { class: 'in rod', id: `${pre}-fxr-${f.id}`, type: 'number', min: 1, max: 99, step: 1, value: f.r, 'aria-label': 'Quantas rodadas o bônus dura', disabled: !podeAqui, onchange: e => muda('rodadas do bônus', g => { g.r = N.limitar(Math.round(+e.target.value) || 1, 1, 99); }) }) : null,
        f.dur === 'rodadas' ? h('span', { class: 'ro', text: f.r === 1 ? 'rodada' : 'rodadas' }) : null) : null;
      return h('div', { class: 'fx', 'data-fx': f.id }, tipo, campos, tira, dur);
    };
    return h('div', { class: 'fxs' }, item.fx.map(linhaFx),
      podeAqui && item.fx.length < 8 ? h('button', { type: 'button', class: 'btn sm', id: `${pre}-fxnovo`, style: 'justify-self:start', text: '+ Efeito na ficha', onclick: () => { const it = N.item('fx'); focoDepois = `${pre}-fxt-${it.id}`; abertos.add(`${pre}-ef`); set('efeito na ficha', x => { x.fx.push(it); }); } }) : null);
  }

  function abaProvisoes() {
    const rac = N.racoes(camp), n = presentes().length, porP = camp.regras.longo.prov, ef = N.efeitos(camp), custo = Math.max(0, porP * n + ef.prov);
    const sobe = (id, d) => mudar('reordenar as provisões', c => { const i = c.provisoes.findIndex(x => x.id === id), k = i + d; if (i < 0 || k < 0 || k >= c.provisoes.length) return false; c.provisoes.splice(k, 0, c.provisoes.splice(i, 1)[0]); });
    const lista = camp.provisoes.map((p, i) => {
      const setP = (rotulo, fn) => mudar(rotulo, c => fn(acha(c.provisoes, p.id)));
      const efR = (k, rotulo) => h('label', {}, rotulo, campoNum(`pv-${k}-${p.id}`, p.ef[k], rotulo + ' de quem come ' + (p.nome || 'esta provisão'), v => setP('efeito de ' + (p.nome || 'provisão'), x => { x.ef[k] = v; }), -100, 100));
      const resumo = resumoEfeito(p, true) + (p.todos && resumoEfeito(p, true) ? ' · banquete: para todos' : '');
      const nome = campoTexto('pv-n-' + p.id, p.nome, 'Nome da provisão', v => mudar('renomear a provisão', c => { acha(c.provisoes, p.id).nome = v; }), { placeholder: 'Ex.: carne seca' });
      // para quem vale o efeito: quem come esta ração, ou todos que descansam (banquete: basta uma ração dela comida)
      const paraQuem = h('label', { class: 'sw para-quem' }, 'O efeito vale para',
        h('select', { class: 'in', id: 'pv-todos-' + p.id, 'aria-label': 'Para quem vale o efeito de ' + (p.nome || 'esta provisão'), onchange: e => { focoDepois = 'pv-todos-' + p.id; setP((e.target.value === 'todos' ? 'banquete: ' : 'efeito de quem come: ') + (p.nome || 'provisão'), x => { x.todos = e.target.value === 'todos'; }); } },
          h('option', { value: 'quem', text: 'quem come', selected: !p.todos }), h('option', { value: 'todos', text: 'todos que descansam (banquete)', selected: p.todos })));
      const passo = h('span', { class: 'passo' },
        podeAqui ? botaoIcone('pv-m-' + p.id, MENOS, 'Tirar uma ração de ' + (p.nome || 'provisão'), () => { focoDepois = 'pv-m-' + p.id; mudar('rações de ' + (p.nome || 'provisão'), c => { const x = acha(c.provisoes, p.id); x.qtd = Math.max(0, x.qtd - 1); }, { junta: 'qtd:' + p.id }); }, { disabled: p.qtd <= 0 }) : null,
        podeAqui ? campoNum('pv-q-' + p.id, p.qtd, 'Rações de ' + (p.nome || 'provisão'), v => mudar('rações de ' + (p.nome || 'provisão'), c => { acha(c.provisoes, p.id).qtd = v; }), 0, 9999) : h('b', { text: String(p.qtd) }),
        podeAqui ? botaoIcone('pv-p-' + p.id, MAIS, 'Pôr uma ração em ' + (p.nome || 'provisão'), () => { focoDepois = 'pv-p-' + p.id; mudar('rações de ' + (p.nome || 'provisão'), c => { acha(c.provisoes, p.id).qtd += 1; }, { junta: 'qtd:' + p.id }); }) : null);
      // (o mestre vê duas linhas: o nome inteiro em cima — "Ensopado de javali" não cabe ao lado dos botões — e a
      //  ordem e as rações embaixo; quem só consulta vê tudo numa linha)
      return h('div', { class: 'cartao' + (p.qtd ? '' : ' off'), 'data-pv': p.id },
        podeAqui ? [h('div', { class: 'lin' }, nome,
          botaoIcone('pv-x-' + p.id, X, 'Tirar ' + (p.nome || 'a provisão') + ' da lista', () => { if (mudar('tirar ' + (p.nome || 'a provisão'), c => { c.provisoes = c.provisoes.filter(x => x.id !== p.id); })) toast((p.nome || 'Provisão') + ' saiu da lista.', 'Desfazer', desfazer); })),
        h('div', { class: 'lin pv2' },
          botaoIcone('pv-up-' + p.id, CIMA, 'Gastar antes', () => { focoDepois = 'pv-up-' + p.id; sobe(p.id, -1); }, { disabled: i === 0 }),
          botaoIcone('pv-dn-' + p.id, BAIXO, 'Gastar depois', () => { focoDepois = 'pv-dn-' + p.id; sobe(p.id, 1); }, { disabled: i === camp.provisoes.length - 1 }),
          h('span', { class: 'qtd-rot', text: 'Rações' }), passo)]
        : h('div', { class: 'lin' }, nome, passo),
        // o que esta ração faz em quem a come: no descanso (Conforto, Sanidade, recuperação) e na ficha
        podeAqui ? dobra('pv-' + p.id + '-ef', ['Ao comer: ', h('b', { text: resumo || 'só mata a fome' })],
          h('div', { class: 'efs tres' }, efR('conf', 'Conforto'), efR('san', 'Sanidade'), efR('rec', 'Recup. %')),
          editorFx('pv-' + p.id, p, setP), paraQuem,
          h('p', { class: 'note', text: p.todos ? 'Banquete: comida uma ração dela no descanso, todos que descansam ganham o efeito.' : 'Só quem come uma ração dela ganha o efeito (as rações saem em rodízio: uma para cada, depois mais uma…).' }))
          : resumo ? h('p', { class: 'note' }, 'Ao comer: ', h('b', { text: resumo })) : null);
    });
    const nomeDe = id => { const pv = camp.provisoes.find(x => x.id === id); return pv ? pv.nome || 'Sem nome' : 'a ordem da lista'; };
    const servirLinha = tipo => {
      const rot = tipo === 'longo' ? 'Descanso longo' : 'Descanso curto';
      return [h('span', { text: tipo === 'longo' ? 'Longo' : 'Curto', title: rot }),
        h('select', { class: 'in', id: 'sv-' + tipo, 'aria-label': rot + ': a provisão que serve primeiro', disabled: !podeAqui, onchange: e => { focoDepois = 'sv-' + tipo; mudar('o que o ' + rot.toLowerCase() + ' serve', c => { c.servir[tipo] = e.target.value || null; }); } },
          h('option', { value: '', text: 'a ordem da lista', selected: !camp.servir[tipo] }), camp.provisoes.map(pv => h('option', { value: pv.id, text: pv.nome || 'Sem nome', selected: camp.servir[tipo] === pv.id }))),
        h('span', { class: 'sw', title: 'Quantas rações cada personagem come neste descanso' }, campoNum('sv-' + tipo + '-prov', camp.regras[tipo].prov, rot + ': rações por personagem', v => mudar('regras do descanso', c => { c.regras[tipo].prov = v; }), 0, 99), 'cada')];
    };
    return [
      h('h3', { text: 'Provisões' }),
      h('p', { class: 'sub', id: 'provResumo', text: (rac === 1 ? '1 ração guardada' : rac + ' rações guardadas') + (n ? ' · o descanso longo gasta ' + custo + ' (' + porP + ' por personagem' + (ef.prov ? ', ' + N.comSinal(ef.prov) + ' da estrutura' : '') + ')' : '') }),
      podeAqui ? h('div', { class: 'sec' }, h('div', { class: 'rot', text: 'O que cada descanso serve' }),
        h('div', { class: 'servir' }, servirLinha('longo'), servirLinha('curto')),
        h('p', { class: 'note', text: 'A provisão servida sai primeiro, depois a lista de cima para baixo, em rodízio: uma ração para cada, depois mais uma para cada… Quem come uma ração com efeito ganha o efeito dela; numa de banquete, todos ganham. Na hora do descanso dá para servir outra.' }))
        : h('p', { class: 'note', text: 'O descanso longo serve ' + nomeDe(camp.servir.longo) + '; o curto, ' + nomeDe(camp.servir.curto) + '.' }),
      quantoComem(),
      lista.length ? lista : h('p', { class: 'note', text: 'Nenhuma provisão guardada. Cada unidade vale uma ração.' }),
      podeAqui ? h('button', { type: 'button', class: 'btn', id: 'pv-novo', text: '+ Provisão', onclick: () => { const it = N.item('provisoes'); focoDepois = 'pv-n-' + it.id; mudar('nova provisão', c => { c.provisoes.push(it); }); } }) : null,
      lista.length > 1 ? h('p', { class: 'note', text: 'No descanso, as rações saem primeiro da provisão servida e depois de cima para baixo.' }) : null,
    ];
  }
  /* Quanto cada um come no descanso longo: por raça (o campo "Raça / classe" da ficha) e por personagem (vale mais que
     a raça). Campo vazio: segue a regra. Na hora do descanso dá para mudar de novo, pessoa por pessoa. */
  function quantoComem() {
    const gente = presentes(), padrao = camp.regras.longo.prov, racas = new Map();
    for (const p of gente) { const k = N.chaveRaca(p.raca); if (k && !racas.has(k)) racas.set(k, p.raca); }
    for (const k of Object.keys(camp.comer.racas)) if (!racas.has(k)) racas.set(k, k);
    if (!gente.length && !racas.size) return null;
    const anotados = Object.keys(camp.comer.racas).length + Object.keys(camp.comer.pers).filter(id => gente.some(p => p.id === id)).length;
    const campo = (id, valor, ph, rotulo, set) => h('input', { class: 'in num', id, type: 'number', min: 0, max: 99, step: 1, value: valor == null ? '' : valor, placeholder: String(ph), 'aria-label': rotulo, title: rotulo + ' — vazio: ' + ph, disabled: !podeAqui,
      onchange: e => { focoDepois = id; const t = String(e.target.value).trim(), v = t === '' ? null : N.limitar(Math.round(+t) || 0, 0, 99); set(v); } });
    const porRaca = [...racas].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')).map(([k, nome]) => h('div', { class: 'come-lin', 'data-raca': k },
      h('span', { class: 'come-n', text: nome }),
      campo('come-r-' + slug(k), camp.comer.racas[k], padrao, 'Rações por descanso longo de quem é ' + nome, v => mudar('quanto come ' + nome, c => { if (v == null) delete c.comer.racas[k]; else c.comer.racas[k] = v; })),
      h('span', { class: 'note', text: 'cada' })));
    const porPers = gente.map(p => {
      const efetivo = N.quantoCome(N.normalizar(Object.assign(N.copia(camp), { comer: { racas: camp.comer.racas, pers: {} } })), 'longo', p);
      return h('div', { class: 'come-lin', 'data-come': p.id },
        h('span', { class: 'come-n' }, p.nome, p.raca ? h('small', { text: ' · ' + p.raca }) : null),
        campo('come-p-' + p.id, camp.comer.pers[p.id], efetivo, 'Rações por descanso longo de ' + p.nome, v => mudar('quanto ' + p.nome + ' come', c => { if (v == null) delete c.comer.pers[p.id]; else c.comer.pers[p.id] = v; })),
        h('span', { class: 'note', text: 'por descanso' }));
    });
    return dobra('come', ['Quanto cada um come: ', h('b', { text: anotados ? (anotados === 1 ? '1 regra própria' : anotados + ' regras próprias') : padrao + (padrao === 1 ? ' ração' : ' rações') + ' por personagem' })],
      porRaca.length ? [h('div', { class: 'come-tit', text: 'Por raça' }), porRaca] : null,
      porPers.length ? [h('div', { class: 'come-tit', text: 'Por personagem (vale mais que a raça)' }), porPers] : null,
      h('p', { class: 'note', text: 'Vale para o descanso longo. Vazio: segue a regra (' + padrao + (padrao === 1 ? ' ração' : ' rações') + ' por personagem). Na hora do descanso dá para mudar de novo, só para aquele descanso.' }));
  }
  // os personagens que a estrutura pode alcançar: os desta campanha (e os do mundo), em ordem de nome
  const candidatos = () => linhas().filter(l => !campId || !l.campanha || l.campanha === campId).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const slug = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 40);
  function cartaoEstrutura(tipo, m) {
    const cat = m.tipo ? N.estrutura(m.tipo) : null;
    const pre = tipo === 'melhorias' ? 'ml' : 'eq', nomeTipo = cat ? 'construção' : tipo === 'melhorias' ? 'melhoria' : 'equipamento';
    // (numa construção, o que se muda nos efeitos é o do nível em que ela está: vai junto para a lista dos níveis)
    const set = (rotulo, fn) => mudar(rotulo, c => { const x = acha(c[tipo], m.id); if (fn(x) === false) return false; if (x.tipo && Array.isArray(x.nv)) x.nv[x.nivel - 1] = { ef: x.ef, fx: x.fx }; });
    const ef = (k, rotulo, min, max, dica) => h('label', { title: dica || null }, rotulo, campoNum(`${pre}-${k}-${m.id}`, m.ef[k], rotulo + ' de ' + (m.nome || nomeTipo), v => set('efeito de ' + (m.nome || nomeTipo), x => { x.ef[k] = v; }), min, max));
    // para quem vale: todos que descansam, ou só os personagens e grupos escolhidos (as rações valem para o acampamento)
    const cand = candidatos(), grupos = Array.from(new Set(cand.map(l => String((l.ficha && l.ficha.grupo) || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const marca = (id, rotulo, on, fn) => h('label', {}, h('input', { type: 'checkbox', id, checked: on, disabled: !podeAqui, onchange: e => { focoDepois = id; fn(e.target.checked); } }), rotulo);
    const nomeAlvo = () => [...m.alvo.grupos.map(g => 'grupo ' + g), ...m.alvo.pers.map(id => { const l = linha(id); return l ? l.nome : null; }).filter(Boolean)].join(', ');
    const alvo = h('div', { class: 'alvo' },
      h('div', { class: 'lin' }, h('span', { class: 'note', style: 'flex:none', text: 'Vale para' }),
        podeAqui ? h('select', { class: 'in', id: `${pre}-alvo-${m.id}`, 'aria-label': 'Para quem ' + (m.nome || 'est' + (tipo === 'melhorias' ? 'a melhoria' : 'e equipamento')) + ' vale', onchange: e => { focoDepois = `${pre}-alvo-${m.id}`; set('para quem vale ' + (m.nome || nomeTipo), x => { x.alvo.todos = e.target.value === 'todos'; }); } },
          h('option', { value: 'todos', text: 'todos que descansam', selected: m.alvo.todos }), h('option', { value: 'alguns', text: 'só os escolhidos', selected: !m.alvo.todos }))
          : h('span', { text: m.alvo.todos ? 'todos que descansam' : (nomeAlvo() || 'ninguém, por enquanto') })),
      podeAqui && !m.alvo.todos ? h('div', { class: 'marcas' },
        grupos.length ? [h('span', { class: 'tit', text: 'Grupos' }), grupos.map(g => marca(`${pre}-g-${m.id}-${slug(g)}`, g, m.alvo.grupos.includes(g), on => set('para quem vale ' + (m.nome || nomeTipo), x => { x.alvo.grupos = on ? x.alvo.grupos.concat(g) : x.alvo.grupos.filter(y => y !== g); })))] : null,
        h('span', { class: 'tit', text: 'Personagens' }),
        cand.length ? cand.map(l => marca(`${pre}-p-${m.id}-${l.id}`, l.nome || 'Sem nome', m.alvo.pers.includes(l.id), on => set('para quem vale ' + (m.nome || nomeTipo), x => { x.alvo.pers = on ? x.alvo.pers.concat(l.id) : x.alvo.pers.filter(y => y !== l.id); }))) : h('span', { class: 'note', text: 'Nenhuma ficha ainda.' }),
        !m.alvo.pers.length && !m.alvo.grupos.length ? h('span', { class: 'note', style: 'width:100%', text: 'Ninguém escolhido: por enquanto, não vale para ninguém (as rações a mais ou a menos continuam valendo).' }) : null) : null);
    const resumoFx = resumoEfeito(m, false);
    return h('div', { class: 'cartao' + (m.on ? '' : ' off'), 'data-est': m.id },
      h('div', { class: 'lin' },
        h('input', { type: 'checkbox', id: `${pre}-on-${m.id}`, checked: m.on, disabled: !podeAqui, title: 'Em uso', 'aria-label': (m.nome || nomeTipo) + ' em uso', onchange: e => set((e.target.checked ? 'usar ' : 'deixar de usar ') + (m.nome || nomeTipo), x => { x.on = e.target.checked; }) }),
        campoTexto(`${pre}-n-${m.id}`, m.nome, 'Nome', v => set('renomear ' + nomeTipo, x => { x.nome = v; }), { placeholder: tipo === 'melhorias' ? 'Ex.: fogão de pedra' : 'Ex.: sacos de dormir' }),
        tipo === 'equipamentos' ? campoNum(`eq-q-${m.id}`, m.qtd, 'Quantidade', v => set('quantidade de ' + (m.nome || nomeTipo), x => { x.qtd = v; }), 0, 999) : null,
        podeAqui ? botaoIcone(`${pre}-x-${m.id}`, X, 'Tirar ' + (m.nome || nomeTipo), () => { if (mudar('tirar ' + (m.nome || nomeTipo), c => { c[tipo] = c[tipo].filter(x => x.id !== m.id); })) toast((m.nome || 'Item') + ' saiu da lista.', 'Desfazer', desfazer); }) : null),
      cat ? cabecaConstrucao(m, cat) : null,
      podeAqui || m.desc ? campoArea(`${pre}-d-${m.id}`, m.desc, 'Descrição', v => set('descrever ' + nomeTipo, x => { x.desc = v; }), 'O que é, como foi conseguido, o que faz…') : null,
      h('div', { class: 'efs' }, ef('conf', 'Conforto', -100, 100), ef('san', 'Sanidade', -100, 100), ef('rec', 'Recup. %', -100, 100), ef('prov', 'Rações', -99, 99, 'Rações a mais (ou, com sinal de menos, a menos) por descanso longo — vale para o acampamento inteiro')),
      alvo,
      podeAqui ? dobra(`${pre}-${m.id}-ef`, ['Na ficha: ', h('b', { text: resumoFx || 'nada' })], editorFx(`${pre}-${m.id}`, m, set))
        : resumoFx ? h('p', { class: 'note' }, 'Na ficha: ', h('b', { text: resumoFx })) : null);
  }
  /* ---- as construções do catálogo (a forja, o canto do bardo, a enfermaria…) ----
     Cada uma aparece desenhada na área dela e melhora em três níveis; o que cada nível faz começa no padrão do catálogo
     e pode ser mudado no cartão (vale para aquele nível). */
  const nomeCat = k => (N.CATEGORIAS.find(c => c[0] === k) || [k, k])[1];
  const padroes = {};
  const padraoDe = k => padroes[k] || (padroes[k] = N.normalizar({ melhorias: [N.item('construcao', k)] }).melhorias[0].nv);
  const semIds = fx => fx.map(f => { const o = Object.assign({}, f); delete o.id; return o; });
  function miniatura(tipo, nivel) { const d = h('div', { class: 'miniatura', 'aria-hidden': 'true' }); if (window.AcampDesenhos) d.innerHTML = window.AcampDesenhos.miniatura(tipo, nivel); return d; }
  function cabecaConstrucao(m, cat) {
    const nome = m.nome || cat.nome;
    const niveis = h('div', { class: 'niveis', role: 'group', 'aria-label': 'Nível de ' + nome },
      N.NIVEIS.map((rot, i) => h('button', { type: 'button', id: `ml-nv-${m.id}-${i + 1}`, 'aria-pressed': String(m.nivel === i + 1), disabled: !podeAqui,
        title: rot + ': ' + (resumoEfeito(m.nv[i], true) || 'nada no descanso'),
        onclick: () => { if (m.nivel === i + 1) return; focoDepois = `ml-nv-${m.id}-${i + 1}`; if (mudar((i + 1 > m.nivel ? 'melhorar ' : 'mudar o nível de ') + nome, c => { acha(c.melhorias, m.id).nivel = i + 1; })) toast(nome + ': ' + rot.toLowerCase() + (i + 1 > m.nivel ? '. O desenho e o que ela faz cresceram.' : '.'), 'Desfazer', desfazer); } }, rot)));
    const pd = padraoDe(cat.k)[m.nivel - 1], noPadrao = j(pd.ef) === j(m.ef) && j(semIds(pd.fx)) === j(semIds(m.fx));
    return h('div', { class: 'construcao-cab' }, miniatura(m.tipo, m.nivel),
      h('div', { class: 'lin', style: 'flex-wrap:wrap' }, h('span', { class: 'cat', text: nomeCat(cat.cat) + ' · na área ' + nomeDaArea(cat.area) }), h('span', { class: 'grow' }), niveis),
      !noPadrao && podeAqui ? h('button', { type: 'button', class: 'btn sm', id: `ml-pd-${m.id}`, style: 'justify-self:start', text: 'Voltar ao padrão deste nível',
        onclick: () => { if (mudar('voltar ao padrão de ' + nome, c => { const x = acha(c.melhorias, m.id); x.nv[x.nivel - 1] = N.copia(pd); })) toast('O nível ' + N.NIVEIS[m.nivel - 1].toLowerCase() + ' de ' + nome + ' voltou ao padrão.', 'Desfazer', desfazer); } }) : null);
  }
  function abrirConstruir() {
    if (!edita()) return;
    const feitos = new Set(camp.melhorias.filter(m => m.tipo).map(m => m.tipo));
    const corpo = N.CATEGORIAS.map(([ck, cnome]) => h('div', { class: 'sec' }, h('div', { class: 'rot', text: cnome }),
      h('div', { class: 'construir' }, N.ESTRUTURAS.filter(e => e.cat === ck).map(e => {
        const ja = feitos.has(e.k), r0 = resumoEfeito(padraoDe(e.k)[0], true);
        return h('button', { type: 'button', class: 'opc', id: 'ct-' + e.k, disabled: ja, title: e.desc, onclick: () => construir(e.k) },
          miniatura(e.k, 1), h('b', { text: e.nome }), h('small', { text: ja ? 'já construída' : 'na área ' + nomeDaArea(e.area) + (r0 ? ' · simples: ' + r0 : '') }));
      }))));
    abrirJanela('Construir no acampamento', [h('p', { class: 'note', text: 'Cada construção começa simples e melhora em três níveis — simples, boa, excelente: o desenho muda e o que ela faz no descanso longo cresce. O que cada nível faz pode ser mudado depois, no cartão dela.' }), ...corpo],
      [h('button', { type: 'button', class: 'btn', text: 'Fechar', onclick: fecharJanela })]);
  }
  function construir(k) {
    const e = N.estrutura(k), it = N.item('construcao', k); if (!e || !it) return;
    fecharJanela();
    focoDepois = 'ml-n-' + it.id;
    if (mudar('construir ' + e.nome, c => { if (c.melhorias.some(m => m.tipo === k)) return false; c.melhorias.push(it); })) toast(e.nome + ' construída (simples), na área ' + nomeDaArea(e.area) + '.', 'Desfazer', desfazer);
  }
  function abaEstrutura() {
    const txt = N.textoEfeitos(N.efeitos(camp)), alguns = N.temParaAlguns(camp);
    const secao = (tipo, titulo, botao, vazio) => { const lista = camp[tipo].filter(m => !m.tipo); return h('div', { class: 'sec' },
      h('div', { class: 'rot' }, titulo, podeAqui ? h('button', { type: 'button', class: 'btn sm', id: (tipo === 'melhorias' ? 'ml' : 'eq') + '-novo', text: botao, onclick: () => { const it = N.item(tipo); focoDepois = (tipo === 'melhorias' ? 'ml' : 'eq') + '-n-' + it.id; mudar(tipo === 'melhorias' ? 'nova melhoria' : 'novo equipamento', c => { c[tipo].push(it); }); } }) : null),
      lista.length ? lista.map(m => cartaoEstrutura(tipo, m)) : h('p', { class: 'note', text: vazio })); };
    const feitas = camp.melhorias.filter(m => m.tipo);
    return [
      h('h3', { text: 'Estrutura' }),
      h('p', { class: 'sub', id: 'estResumo', text: (txt ? 'No descanso longo, o que está em uso soma para todos: ' + txt + '.' : 'O que está em uso soma seus efeitos ao descanso longo.') + (alguns ? ' Há também o que vale só para alguns.' : '') }),
      h('div', { class: 'sec' }, h('div', { class: 'rot' }, 'Construções', podeAqui ? h('button', { type: 'button', class: 'btn sm', id: 'ct-novo', text: '+ Construir…', onclick: abrirConstruir }) : null),
        feitas.length ? feitas.map(m => cartaoEstrutura('melhorias', m)) : h('p', { class: 'note', text: podeAqui ? 'Nenhuma construção. Uma forja, um canto do bardo, uma enfermaria… cada uma aparece desenhada na área dela, e melhora em três níveis.' : 'Nenhuma construção.' })),
      secao('melhorias', 'Outras melhorias', '+ Melhoria', 'Nenhuma. Para o que não está entre as construções: um poço, um estábulo…'),
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
        h('select', { class: 'in', id: 'vc-t-' + v.id, style: 'width:auto;flex:none', 'aria-label': 'Tipo de ' + (v.nome || 'veículo'), disabled: !podeAqui, onchange: e => { focoDepois = 'vc-t-' + v.id; setC('tipo de ' + (v.nome || 'veículo'), c => { acha(c.veiculos, v.id).tipo = e.target.value; }); } }, N.TIPOS_VEICULO.map(([k, nome]) => h('option', { value: k, text: nome, selected: v.tipo === k }))),
        podeAqui ? botaoIcone('vc-x-' + v.id, X, 'Tirar ' + (v.nome || 'o veículo'), () => { if (setC('tirar ' + (v.nome || 'o veículo'), c => { c.veiculos = c.veiculos.filter(x => x.id !== v.id); })) toast((v.nome || 'Veículo') + ' saiu da caravana. A carga e a gente dele ficaram sem lugar.', 'Desfazer', desfazer); }) : null),
      h('div', { class: 'lin' },
        h('label', { class: 'sw', title: 'Quanto peso leva' }, 'Leva', h('input', { class: 'in num', id: 'vc-c-' + v.id, type: 'number', min: 0, step: 1, value: v.cap, 'aria-label': 'Capacidade de ' + (v.nome || 'veículo') + ' (kg)', disabled: !podeAqui, onchange: e => setC('capacidade de ' + (v.nome || 'veículo'), c => { acha(c.veiculos, v.id).cap = Math.max(0, Math.round((+e.target.value || 0) * 10) / 10); }) }), 'kg'),
        campoTexto('vc-e-' + v.id, v.estado, 'Estado de ' + (v.nome || 'veículo'), x => setC('estado de ' + (v.nome || 'veículo'), c => { acha(c.veiculos, v.id).estado = x; }), { placeholder: 'Estado — ex.: roda bamba', maxlength: 120 })),
      barraDePeso(peso.por[v.id] || 0, v.cap, 'vc-peso-' + v.id)));
    const carga = cv.carga.map(k => h('div', { class: 'cartao', 'data-cg': k.id },
      h('div', { class: 'cg' },
        campoTexto('cg-n-' + k.id, k.nome, 'O que é', x => setC('renomear a carga', c => { acha(c.carga, k.id).nome = x; }), { placeholder: 'Ex.: barris de vinho' }),
        h('input', { class: 'in num', id: 'cg-q-' + k.id, type: 'number', min: 0, step: 1, value: k.qtd, title: 'Quantos', 'aria-label': 'Quantos ' + (k.nome || 'itens'), disabled: !podeAqui, onchange: e => setC('quantidade de ' + (k.nome || 'carga'), c => { acha(c.carga, k.id).qtd = N.limitar(Math.round(+e.target.value) || 0, 0, 99999); }) }),
        h('input', { class: 'in num', id: 'cg-p-' + k.id, type: 'number', min: 0, step: 0.1, value: k.peso, title: 'Peso de cada um (kg)', 'aria-label': 'Peso de cada ' + (k.nome || 'item') + ' (kg)', disabled: !podeAqui, onchange: e => setC('peso de ' + (k.nome || 'carga'), c => { acha(c.carga, k.id).peso = Math.max(0, Math.round((+e.target.value || 0) * 100) / 100); }) })),
      h('div', { class: 'cg-sub' }, 'vai em',
        h('select', { class: 'in', id: 'cg-v-' + k.id, 'aria-label': 'Onde vai ' + (k.nome || 'a carga'), disabled: !podeAqui, onchange: e => { focoDepois = 'cg-v-' + k.id; setC('onde vai ' + (k.nome || 'a carga'), c => { acha(c.carga, k.id).veiculo = e.target.value || null; }); } }, opcoesVeic(k.veiculo)),
        h('b', { style: 'font-family:var(--mono);color:var(--fg)', text: kg(k.qtd * k.peso) }),
        podeAqui ? botaoIcone('cg-x-' + k.id, X, 'Tirar ' + (k.nome || 'a carga'), () => { if (setC('tirar ' + (k.nome || 'a carga'), c => { c.carga = c.carga.filter(x => x.id !== k.id); })) toast((k.nome || 'Carga') + ' saiu da caravana.', 'Desfazer', desfazer); }) : null)));
    const doAcamp = presentes().map(p => h('div', { class: 'cg-sub', 'data-vai': p.id }, h('span', { style: 'flex:1;color:var(--fg);font-weight:600', text: p.nome }), 'vai em',
      h('select', { class: 'in', id: 'vai-' + p.id, 'aria-label': 'Onde vai ' + p.nome, disabled: !podeAqui, onchange: e => { focoDepois = 'vai-' + p.id; setC('onde vai ' + p.nome, c => { if (e.target.value) c.vai[p.id] = e.target.value; else delete c.vai[p.id]; }); } }, opcoesVeic(cv.vai[p.id] || null))));
    const gente = cv.gente.map(g => h('div', { class: 'cartao', 'data-gt': g.id },
      h('div', { class: 'lin' },
        campoTexto('gt-n-' + g.id, g.nome, 'Nome', x => setC('renomear quem viaja', c => { acha(c.gente, g.id).nome = x; }), { placeholder: 'Nome' }),
        campoTexto('gt-p-' + g.id, g.papel, 'O que faz', x => setC('o que ' + (g.nome || 'a pessoa') + ' faz', c => { acha(c.gente, g.id).papel = x; }), { placeholder: 'Ex.: cocheiro', maxlength: 40 }),
        podeAqui ? botaoIcone('gt-x-' + g.id, X, 'Tirar ' + (g.nome || 'esta pessoa'), () => { if (setC('tirar ' + (g.nome || 'quem viajava'), c => { c.gente = c.gente.filter(x => x.id !== g.id); })) toast((g.nome || 'A pessoa') + ' saiu da caravana.', 'Desfazer', desfazer); }) : null),
      h('div', { class: 'cg-sub' }, 'vai em', h('select', { class: 'in', id: 'gt-v-' + g.id, 'aria-label': 'Onde vai ' + (g.nome || 'a pessoa'), disabled: !podeAqui, onchange: e => { focoDepois = 'gt-v-' + g.id; setC('onde vai ' + (g.nome || 'a pessoa'), c => { acha(c.gente, g.id).veiculo = e.target.value || null; }); } }, opcoesVeic(g.veiculo)))));
    const novo = (tipo, id, texto, foco, rotulo) => podeAqui ? h('button', { type: 'button', class: 'btn sm', id, text: texto, onclick: () => { const it = N.item(tipo); focoDepois = foco + it.id; setC(rotulo, c => { c[tipo].push(it); }); } }) : null;
    return [
      h('h3', { text: 'Caravana' }),
      h('p', { class: 'sub', text: cv.veiculos.length || cv.carga.length || cv.gente.length ? (cv.veiculos.length === 1 ? '1 veículo ou animal' : cv.veiculos.length + ' veículos e animais') + ' · ' + kg(peso.total) + ' de carga' + (peso.cap ? ' · leva até ' + kg(peso.cap) : '') : 'Os veículos, os animais, a carga e quem viaja com o grupo.' }),
      cv.carga.length ? barraDePeso(peso.total, peso.cap, 'cv-peso') : null,
      // os veículos e animais aparecem desenhados na fogueira (dá para esconder)
      cv.veiculos.length ? h('label', { class: 'sw' }, h('input', { type: 'checkbox', id: 'cv-ver', checked: camp.verCaravana, disabled: !podeAqui, onchange: e => mudar(e.target.checked ? 'mostrar a caravana na cena' : 'esconder a caravana da cena', c => { c.verCaravana = e.target.checked; }) }), 'Mostrar a caravana na cena (na fogueira)') : null,
      h('div', { class: 'sec' }, h('div', { class: 'rot' }, 'Veículos e animais', novo('veiculos', 'vc-novo', '+ Veículo ou animal', 'vc-n-', 'novo veículo ou animal')),
        veiculos.length ? veiculos : h('p', { class: 'note', text: podeAqui ? 'Nenhum ainda. Ex.: carroça, barco, cavalo, mula de carga.' : 'Nenhum veículo ou animal.' })),
      h('div', { class: 'sec' }, h('div', { class: 'rot' }, 'Carga', novo('carga', 'cg-novo', '+ Carga', 'cg-n-', 'nova carga')),
        carga.length ? [h('div', { class: 'cg', style: 'font-size:11px;color:var(--fg-3);padding:0 10px' }, h('span', { text: 'O quê' }), h('span', { text: 'Quantos' }), h('span', { text: 'Peso de cada' })), carga] : h('p', { class: 'note', text: podeAqui ? 'Nenhuma carga. Cada linha tem quantos e o peso de cada um; o total aparece contra o que os veículos levam.' : 'Nenhuma carga.' }),
        peso.semLugar > 0 && cv.veiculos.length ? h('p', { class: 'note', id: 'cv-semlugar', text: kg(peso.semLugar) + ' de carga sem lugar.' }) : null),
      h('div', { class: 'sec' }, h('div', { class: 'rot' }, 'Quem viaja', novo('gente', 'gt-novo', '+ Pessoa', 'gt-n-', 'nova pessoa na caravana')),
        doAcamp.length && cv.veiculos.length ? doAcamp : null,
        gente.length ? gente : h('p', { class: 'note', text: podeAqui ? 'Quem viaja junto sem ficha: cocheiros, guardas, mercadores. Os personagens do acampamento aparecem aqui quando há veículos.' : 'Ninguém além do grupo.' })),
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
        podeAqui && camp.diario.length ? h('button', { type: 'button', class: 'btn sm', id: 'di-limpar', text: 'Limpar o Diário…', onclick: limparDiario }) : null),
      h('p', { class: 'sub', text: 'Os descansos e os momentos do acampamento.' }),
      podeAqui ? h('form', { class: 'lin', style: 'display:flex;gap:8px', onsubmit: e => { e.preventDefault(); const c0 = $('di-txt'), v = c0.value.trim(); if (!v) return; focoDepois = 'di-txt'; mudar('anotar no diário', c => { c.diario.unshift({ id: N.novoId('di'), t: Date.now(), texto: v }); }); } },
        h('input', { class: 'in', id: 'di-txt', maxlength: 600, placeholder: 'Anotar algo que aconteceu…', 'aria-label': 'Anotação para o diário', autocomplete: 'off' }), h('button', { type: 'submit', class: 'btn', text: 'Anotar' })) : null,
      h('div', { class: 'diario', id: 'diario' }, camp.diario.length ? camp.diario.map(d => h('div', { class: 'dl' }, h('time', { text: dataCurta(d.t) }),
        h('div', { class: 'lin', style: 'display:flex;gap:8px;align-items:flex-start' }, h('span', { style: 'flex:1;white-space:pre-wrap', text: d.texto }),
          podeAqui ? botaoIcone('di-x-' + d.id, X, 'Apagar esta linha do diário', () => { if (mudar('apagar linha do diário', c => { c.diario = c.diario.filter(x => x.id !== d.id); })) toast('Linha apagada.', 'Desfazer', desfazer); }) : null))) : h('p', { class: 'note', text: 'Nada anotado ainda.' })),
      mestre() ? h('details', { class: 'dobra sec', id: 'regras', open: guarda.ler('tinycats:acampamento:regras') === '1', ontoggle: e => guarda.gravar('tinycats:acampamento:regras', e.target.open ? '1' : '0') }, h('summary', { text: 'Regras do descanso' }),
        h('div', { class: 'regras' },
          h('span', { class: 'cab', text: '' }), h('span', { class: 'cab', text: 'Longo' }), h('span', { class: 'cab', text: 'Curto' }),
          h('span', { text: 'Recupera (% de cada barra)' }), regra('longo', 'rec', 'Descanso longo: recupera % de cada barra', 0, 100), regra('curto', 'rec', 'Descanso curto: recupera % de cada barra', 0, 100),
          h('span', { text: 'Rações por personagem' }), regra('longo', 'prov', 'Descanso longo: rações por personagem', 0, 99), regra('curto', 'prov', 'Descanso curto: rações por personagem', 0, 99),
          h('span', { text: 'Conforto' }), regra('longo', 'conf', 'Descanso longo: Conforto', -100, 100), regra('curto', 'conf', 'Descanso curto: Conforto', -100, 100),
          h('span', { text: 'Sanidade' }), regra('longo', 'san', 'Descanso longo: Sanidade', -100, 100), regra('curto', 'san', 'Descanso curto: Sanidade', -100, 100),
          h('span', { text: 'Tira os bônus “até o próximo descanso”' }),
          h('input', { type: 'checkbox', id: 'rg-longo-tira', checked: rg.longo.tiraBonus, 'aria-label': 'Descanso longo tira os bônus “até o próximo descanso”', onchange: e => mudar('regras do descanso', c => { c.regras.longo.tiraBonus = e.target.checked; }) }),
          h('input', { type: 'checkbox', id: 'rg-curto-tira', checked: rg.curto.tiraBonus, 'aria-label': 'Descanso curto tira os bônus “até o próximo descanso”', onchange: e => mudar('regras do descanso', c => { c.regras.curto.tiraBonus = e.target.checked; }) })),
        h('p', { class: 'note', id: 'rg-comeco', text: 'A barra que “começa em” um valor próprio (na ficha, em Opções da barra) não recupera por porcentagem: o descanso longo a leva de volta ao começo dela, e o curto não mexe nela. Recuperar 100% enche também a barra que estava abaixo de zero.' }),
        h('p', { class: 'note', id: 'rg-especiais', text: 'As barras especiais seguem a regra de cada uma, escolhida na ficha (Barras especiais → Recupera): enche no descanso longo, em qualquer descanso, uma quantia ou só à mão. A fadiga enche no descanso longo e volta um no curto. Tirar os bônus dá para mudar também na hora, na janela do descanso.' }),
        h('p', { class: 'note', text: 'Quando faltam rações para o descanso longo:' }),
        h('div', { class: 'regras' },
          h('span', { text: 'A recuperação fica em (% do normal)' }), campoNum('rg-sem-rec', rg.semProv.rec, 'Sem rações: a recuperação fica em % do normal', v => mudar('regras do descanso', c => { c.regras.semProv.rec = v; }), 0, 100), h('span'),
          h('span', { text: 'Conforto' }), campoNum('rg-sem-conf', rg.semProv.conf, 'Sem rações: Conforto', v => mudar('regras do descanso', c => { c.regras.semProv.conf = v; }), -100, 100), h('span')),
        // (lote 18) a caça: o que rolam, a dificuldade de cada lugar e quanto rende
        h('p', { class: 'note', id: 'rg-caca-nota', text: 'A caça (quem está na área Caça, no descanso longo): rola contra a dificuldade do lugar; passou, traz uma ração, e mais uma a cada tantos pontos acima.' }),
        h('div', { class: 'regras', id: 'rg-caca' },
          h('span', { text: 'Rola' }), h('select', { class: 'in', id: 'rg-caca-atr', 'aria-label': 'A caça rola', onchange: e => mudar('regras da caça', c => { c.regras.caca.atr = e.target.value; }) },
            N.ATR_CACA.map(k => h('option', { value: k, text: (R() && R().NOMES && R().NOMES[k]) || k, selected: k === rg.caca.atr }))), h('span'),
          h('span', { text: 'Mais uma ração a cada (pontos acima)' }), campoNum('rg-caca-passo', rg.caca.passo, 'A caça: mais uma ração a cada tantos pontos acima da dificuldade', v => mudar('regras da caça', c => { c.regras.caca.passo = v; }), 1, 9999), h('span'),
          h('span', { text: 'Até (rações por caçador)' }), campoNum('rg-caca-max', rg.caca.max, 'A caça: no máximo, rações por caçador', v => mudar('regras da caça', c => { c.regras.caca.max = v; }), 1, 99), h('span'),
          ...[].concat(...N.LUGARES.map(([k, nome]) => [h('span', { text: 'Dificuldade: ' + nome + (k === camp.lugar ? ' (aqui)' : '') }),
            campoNum('rg-caca-dif-' + k, rg.caca.dif[k], 'A caça: dificuldade em ' + nome, v => mudar('regras da caça', c => { c.regras.caca.dif[k] = v; }), 0, 99999), h('span')]))),
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
  // a regra de uma barra especial, por extenso (o título dela na prévia do descanso)
  const regraDaEspecial = (p, id) => { const b = (p.poderes || []).find(x => x.id === id); return b && R() && R().textoRecEspecial ? R().textoRecEspecial(b) : ''; };
  /* (lote 15) O descanso curto é de quem está jogando — normalmente, o grupo que está em cena —, esteja ou não em volta
     da fogueira: além de quem está no acampamento, a janela traz a equipe ativa (os personagens de jogador desta
     campanha, e os do mundo, que o mestre deixou ativos na ficha) e, vindo das Cenas, quem está na cena. Vêm marcados
     os ativos — ou, vindo das Cenas, só quem está na cena. Quem descansa longe da fogueira gasta as rações do
     acampamento do mesmo jeito. */
  const ativoNaFicha = l => !(l && l.estado && l.estado.ativo === false);
  const equipeAtiva = () => (naMesa() ? linhas().filter(l => ehJogador(l.dono_id) && !(l.ficha && l.ficha.petDe) && (!campId || !l.campanha || l.campanha === campId) && ativoNaFicha(l)).map(l => l.id) : []);
  function abrirDescanso(tipo, o) {
    if (!mestre()) return;
    const longo = tipo !== 'curto', aqui = presentes().filter(p => !p.semFicha);
    const daCena = !longo && o && Array.isArray(o.marcar) ? o.marcar.filter(id => typeof id === 'string') : null;
    const naFogueira = new Set(aqui.map(p => p.id));
    const longe = longo ? [] : (daCena || []).concat(equipeAtiva()).filter((id, i, a) => a.indexOf(id) === i && !naFogueira.has(id)).map(pessoa).filter(p => p && !p.semFicha);
    const todos = aqui.concat(longe);
    if (!todos.length) { toast(longo ? 'Não há ninguém com ficha em volta da fogueira. Chame os personagens pela aba Grupo.' : 'Não há ninguém com ficha em volta da fogueira nem na equipe ativa. Chame os personagens pela aba Grupo.'); return; }
    const marcados = new Set(longo ? todos.map(p => p.id) : daCena ? todos.filter(p => daCena.includes(p.id)).map(p => p.id) : todos.filter(p => ativoNaFicha(linha(p.id))).map(p => p.id));
    // o que se serve neste descanso: a provisão do descanso, ou outra escolhida na hora; e quantas cada um come
    // (porPessoa: o que o mestre mudou na hora, pessoa por pessoa — só para este descanso)
    const escolha = { servir: camp.servir[longo ? 'longo' : 'curto'], prov: camp.regras[longo ? 'longo' : 'curto'].prov, porPessoa: {}, tiraBonus: camp.regras[longo ? 'longo' : 'curto'].tiraBonus !== false };
    // (lote 7, parte 5c) a noite no clima de hoje do Mapa-múndi: vem marcada (o mestre desmarca)
    const climaM = longo ? climaDoMundo() : null;
    escolha.clima = !!(climaM && climaM.conf);
    const txtTmp = b => (b.k || '?') + ' ' + N.comSinal(Math.round(b.v * 10) / 10) + (b.n ? ' (' + b.n + ')' : '');
    /* (lote 18) A caça: quem está na área Caça rola (o mestre aperta, um por um ou todos); o resultado só sugere rações
       — as marcadas entram na Carne de caça depois do descanso. A rolagem vai para a mesa ao vivo. */
    const cacam = longo ? N.cacadores(camp, aqui) : [];
    escolha.caca = { atr: camp.regras.caca.atr, dif: N.difDaCaca(camp), rolagens: [] };
    const valorDaCaca = p => Math.max(0, Math.round(+((p.atr || {})[escolha.caca.atr]) || 0));
    const rolarCaca = p => {
      const v = valorDaCaca(p), D0 = window.TC && TC.dice;
      if (!D0 || !D0.rollFixa) { toast('Sem o rolador de dados aqui.'); return false; }
      const r = D0.rollFixa(v, Math.min(p.fixa || 0, v));
      if (!r.ok) { toast(p.nome + ': ' + r.error); return false; }
      const det = r.die ? r.dieValue + ' no d' + r.die + (r.fixa ? ' + ' + r.fixa : '') : 'fixa total';
      escolha.caca.rolagens = escolha.caca.rolagens.filter(x => x.id !== p.id).concat([{ id: p.id, nome: p.nome, total: r.total, det, on: true }]);
      const z = N.racoesDaCaca(camp, r.total, escolha.caca.dif);
      publicar('A caça · ' + p.nome, (R() && R().NOMES && R().NOMES[escolha.caca.atr] || escolha.caca.atr) + ' ' + r.total + ' (' + det + ') contra ' + escolha.caca.dif + ': '
        + (z.passou ? 'passou' + (z.margem ? ' por ' + z.margem : '') + ' — ' + z.racoes + (z.racoes === 1 ? ' ração' : ' rações') : 'não passou'));
      return true;
    };
    const nomeAtr = k => (R() && R().NOMES && R().NOMES[k]) || k;
    const blocoDaCaca = () => {
      const pc = plano.caca || { linhas: [], racoes: 0 }, feito = new Map(pc.linhas.map(x => [x.id, x]));
      const faltam = cacam.filter(p => !feito.has(p.id));
      return h('div', { class: 'caca sec', id: 'ds-caca' },
        h('div', { class: 'lin caca-cab' }, h('b', { text: 'A caça' }),
          h('select', { class: 'in', id: 'ds-caca-atr', 'aria-label': 'O que os caçadores rolam', disabled: pc.linhas.length > 0, title: pc.linhas.length ? 'Já há rolagens: o atributo fica o mesmo para todos' : null,
            onchange: e => { escolha.caca.atr = e.target.value; refazer('ds-caca-atr'); } }, N.ATR_CACA.map(k => h('option', { value: k, text: nomeAtr(k), selected: k === escolha.caca.atr }))),
          h('span', { text: 'contra' }),
          h('input', { class: 'in num', id: 'ds-caca-dif', type: 'number', min: 0, max: 99999, step: 1, value: escolha.caca.dif, 'aria-label': 'Dificuldade da caça neste descanso',
            onchange: e => { escolha.caca.dif = N.limitar(Math.round(+e.target.value) || 0, 0, 99999); refazer('ds-caca-dif'); } }),
          h('span', { class: 'grow' }),
          faltam.length > 1 ? h('button', { type: 'button', class: 'btn sm', id: 'ds-caca-todos', text: 'Rolar todos (' + faltam.length + ')', onclick: () => { for (const p of faltam) rolarCaca(p); refazer('ds-caca-todos'); } }) : null),
        h('ul', { class: 'caca-lista' }, cacam.map(p => {
          const x = feito.get(p.id), v = valorDaCaca(p);
          return h('li', { 'data-cacador': p.id }, h('span', { class: 'caca-nome', text: p.nome }),
            x ? h('span', { class: 'caca-res' + (x.passou ? ' ok' : ''), id: 'ds-caca-r-' + p.id }, h('b', { text: String(x.total) }), ' (' + x.det + ') — ',
              x.passou ? 'passou' + (x.margem ? ' por ' + x.margem : '') + ': ' : 'não passou')
              : h('span', { class: 'note', text: nomeAtr(escolha.caca.atr) + ' ' + v + (p.fixa ? ', fixa ' + Math.min(p.fixa, v) : '') }),
            x && x.racoes ? h('label', { class: 'sw' }, h('input', { type: 'checkbox', id: 'ds-caca-on-' + p.id, checked: x.on,
              onchange: e => { const r0 = escolha.caca.rolagens.find(y => y.id === p.id); if (r0) r0.on = e.target.checked; refazer('ds-caca-on-' + p.id); } }),
              '+' + x.racoes + (x.racoes === 1 ? ' ração' : ' rações')) : null,
            x ? null : h('button', { type: 'button', class: 'btn sm', id: 'ds-caca-rolar-' + p.id, text: 'Rolar', disabled: !v, title: v ? null : 'O valor está em 0: não há o que rolar',
              onclick: () => { if (rolarCaca(p)) refazer('ds-caca-r-' + p.id); } }));
        })),
        h('p', { class: 'note', id: 'ds-caca-nota', text: pc.racoes ? 'Só uma sugestão: ' + pc.racoes + (pc.racoes === 1 ? ' ração marcada entra' : ' rações marcadas entram') + ' na Carne de caça, depois do descanso (para os próximos).'
          : 'Quem está na área Caça rola o atributo contra a dificuldade do lugar. Passou: uma ração, e mais uma a cada ' + camp.regras.caca.passo + ' pontos acima (até ' + camp.regras.caca.max + '). A rolagem vai para a mesa ao vivo.' }));
    };
    const corpo = h('div', { style: 'display:grid;gap:10px' });
    const confirmar = h('button', { type: 'button', class: 'btn pri', id: 'ds-ok', text: 'Descansar' });
    let plano = null, refazendo = false;
    /* (lote 18) Refazer a prévia troca os campos da janela; o campo que sai com um valor mudado ainda avisa a mudança
       (ao perder o foco) no meio da troca: essa volta é ignorada (o valor já está na escolha). */
    const refazer = foco => { if (refazendo) return; refazendo = true; try { refazer0(foco); } finally { refazendo = false; } };
    const refazer0 = foco => {
      plano = N.planejar(camp, tipo, todos.filter(p => marcados.has(p.id)), { servir: escolha.servir, prov: escolha.prov, porPessoa: escolha.porPessoa, tiraBonus: escolha.tiraBonus, clima: escolha.clima && climaM ? { k: climaM.k, conf: climaM.conf } : null,
        caca: cacam.length ? escolha.caca : null });
      const sobra = plano.disponivel - plano.gasto;
      const avisos = [];
      // (lote 15) quem veio da cena, e quem descansa longe da fogueira
      if (daCena) avisos.push(h('div', { class: 'aviso', id: 'ds-cena', text: daCena.length ? 'Vindo da cena: ' + (daCena.length === 1 ? 'marcado quem está nela.' : 'marcados os ' + daCena.length + ' que estão nela.') + ' Confira quem descansa e as rações.' : 'Ninguém da cena tem ficha aqui: marque quem descansa.' }));
      if (longe.length) avisos.push(h('div', { class: 'aviso', id: 'ds-longe', text: 'Longe da fogueira: ' + juntarE(longe.map(p => p.nome)) + '. Quem descansa gasta as rações do acampamento do mesmo jeito.' }));
      // o que servir (a provisão que sai primeiro, e cujo efeito vale para quem a come) e quantas cada um come
      avisos.push(h('div', { class: 'servir', id: 'ds-servir' }, h('span', { text: 'Servir' }),
        h('select', { class: 'in', id: 'ds-sv', 'aria-label': 'O que servir neste descanso', onchange: e => { escolha.servir = e.target.value || null; refazer('ds-sv'); } },
          h('option', { value: '', text: 'a ordem da lista', selected: !escolha.servir }), camp.provisoes.map(pv => h('option', { value: pv.id, text: (pv.nome || 'Sem nome') + ' (' + pv.qtd + ')', selected: escolha.servir === pv.id }))),
        h('span', { class: 'sw', title: 'Rações por personagem neste descanso, para quem não tem uma quantidade própria (por personagem ou por raça, na aba Provisões)' }, h('input', { class: 'in num', id: 'ds-qtd', type: 'number', min: 0, max: 99, step: 1, value: escolha.prov, 'aria-label': 'Rações por personagem neste descanso (o padrão)', onchange: e => { escolha.prov = N.limitar(Math.round(+e.target.value) || 0, 0, 99); refazer('ds-qtd'); } }), 'cada (padrão)')));
      // tirar ou não os bônus "até o próximo descanso": vem da regra; mudando aqui, vale só para este descanso
      const daRegra = camp.regras[longo ? 'longo' : 'curto'].tiraBonus !== false;
      avisos.push(h('label', { class: 'sw tira', id: 'ds-tira-l', title: 'O padrão está nas Regras do descanso (aba Diário). Mudando aqui, vale só para este descanso.' },
        h('input', { type: 'checkbox', id: 'ds-tira', checked: escolha.tiraBonus, onchange: e => { escolha.tiraBonus = e.target.checked; refazer('ds-tira'); } }),
        'Tirar os bônus “até o próximo descanso”', escolha.tiraBonus !== daRegra ? h('span', { class: 'note', text: ' — só neste descanso' }) : null));
      if (climaM && climaM.conf) avisos.push(h('label', { class: 'sw tira', id: 'ds-clima-l', title: 'O clima de hoje no Mapa-múndi (o do mapa mostrado aos jogadores, onde o grupo está)' },
        h('input', { type: 'checkbox', id: 'ds-clima', checked: escolha.clima, onchange: e => { escolha.clima = e.target.checked; refazer('ds-clima'); } }),
        'A noite de ' + climaM.nome.toLocaleLowerCase('pt-BR') + ' no Mapa-múndi: Conforto ' + N.comSinal(climaM.conf)));
      if (plano.servida && plano.servida.todos && plano.servida.efeito && plano.comem) avisos.push(h('div', { class: 'aviso', id: 'ds-banquete', text: (plano.servida.nome || 'A provisão servida') + ' é um banquete: o efeito dela vale para todos que descansam.' }));
      else if (plano.servida && plano.prov > 0 && plano.n && plano.comem < plano.n) avisos.push(h('div', { class: 'aviso', id: 'ds-da' }, (plano.servida.nome || 'A provisão servida') + (plano.comem ? ' dá para ' + plano.comem + ' de ' + plano.n + ' (abaixo, quem come); ' + (plano.n - plano.comem === 1 ? 'o outro come' : 'os outros comem') + ' do resto da lista' + (plano.servida.efeito ? ', sem o efeito.' : '.') : ' acabou: todos comem do resto da lista' + (plano.servida.efeito ? ', sem o efeito.' : '.'))));
      if (plano.custo > 0) avisos.push(h('div', { class: 'aviso' + (plano.falta ? ' ruim' : ''), id: 'ds-prov' },
        plano.falta ? `Faltam ${plano.falta} ${plano.falta === 1 ? 'ração' : 'rações'}: há ${plano.disponivel}, o descanso pede ${plano.custo}. A recuperação cai para ${camp.regras.semProv.rec}% do normal` + (camp.regras.semProv.conf ? ` e o Conforto leva ${N.comSinal(camp.regras.semProv.conf)}.` : '.')
          : `Provisões: gasta ${plano.gasto} de ${plano.disponivel} ${plano.disponivel === 1 ? 'ração' : 'rações'}` + (plano.consumo.length ? ' (' + plano.consumo.map(g => (g.nome || 'provisão') + ' −' + g.qtd).join(', ') + ')' : '') + `. Sobram ${sobra}.`));
      else if (longo) avisos.push(h('div', { class: 'aviso', id: 'ds-prov', text: 'Este descanso não gasta provisões.' }));
      const txt = N.textoEfeitos(plano.efeitos);
      if (longo && (txt || N.temParaAlguns(camp))) avisos.push(h('div', { class: 'aviso', text: (txt ? 'A estrutura em uso soma para todos: ' + txt + '.' : '') + (N.temParaAlguns(camp) ? (txt ? ' ' : '') + 'E há estrutura que vale só para alguns (já está na conta de cada um, abaixo).' : '') }));
      if (naMesa() && plano.linhas.some(l => l.fx.length)) avisos.push(h('div', { class: 'aviso', text: 'O que vai para a ficha: ' + (plano.tiraBonus ? 'os bônus "até o próximo descanso" de antes acabam, e os novos entram.' : 'os bônus novos entram junto com os de antes (este descanso não tira os bônus).') + ' Os dados são rolados quando o descanso acontece.' }));
      if (!naMesa()) avisos.push(h('div', { class: 'aviso', text: 'Sem mesa aberta, as fichas não são alteradas: os valores abaixo' + (plano.linhas.some(l => l.fx.length) ? ' (e o que vai para a ficha)' : '') + ' são para você aplicar. As provisões e o diário, sim, são atualizados.' }));
      const linhasT = todos.map(p => {
        const ln = plano.linhas.find(x => x.id === p.id), dentroD = !!ln;
        return h('tr', { class: dentroD ? '' : 'fora' },
          h('td', {}, h('label', { class: 'sw', style: 'color:var(--fg);font-weight:600' }, h('input', { type: 'checkbox', id: 'ds-' + p.id, checked: dentroD, onchange: e => { if (e.target.checked) marcados.add(p.id); else marcados.delete(p.id); refazer('ds-' + p.id); } }), p.nome),
            naFogueira.has(p.id) ? null : h('span', { class: 'note', 'data-longe': p.id, text: ' longe da fogueira' })),
          // quantas rações esta pessoa come (a dela, a da raça ou o padrão; mudando aqui, vale só para este descanso)
          h('td', {}, h('input', { class: 'in num', id: 'ds-c-' + p.id, type: 'number', min: 0, max: 99, step: 1, disabled: !dentroD,
            value: dentroD ? ln.quer : (Object.prototype.hasOwnProperty.call(escolha.porPessoa, p.id) ? escolha.porPessoa[p.id] : N.quantoCome(camp, tipo, p, escolha.prov)),
            'aria-label': 'Rações que ' + p.nome + ' come neste descanso', title: 'Rações que ' + p.nome + ' come neste descanso',
            onchange: e => { escolha.porPessoa[p.id] = N.limitar(Math.round(+e.target.value) || 0, 0, 99); refazer('ds-c-' + p.id); } })),
          h('td', {}, dentroD ? h('div', { class: 'mud' }, ...ln.recursos.map(r => h('span', r.inicio != null ? { title: longo ? 'Esta barra começa em ' + r.inicio + ': o descanso longo a leva de volta para lá' : 'Esta barra tem um começo próprio: o descanso curto não mexe nela' } : {}, r.nome + ' ', seta(r.de, r.para, '/' + r.max), r.inicio != null && longo && r.para !== r.de ? ' (volta ao começo)' : '', r.podre ? h('span', { class: 'podre-nota', title: 'Ferida permanente: a cura não passa de ' + (r.max - r.podre) + ' até o mestre tirar a ferida' }, ' (' + r.podre + ' apodrecidos)') : '')),
            ...ln.poderes.map(x => h('span', { title: 'Barra especial: ' + regraDaEspecial(p, x.id) }, x.nome + ' ', seta(x.de, x.para))),
            ln.fad && ln.fad.para !== ln.fad.de ? h('span', { class: 'fad', title: 'A fadiga: o descanso longo enche a pilha; o curto devolve um' }, 'Fadiga ', seta(ln.fad.de, ln.fad.para, '/' + N.FAD_MAX)) : null) : h('span', { class: 'note', text: 'fica de fora' })),
          h('td', {}, dentroD && ln.san ? h('div', { class: 'mud' }, seta(ln.san.de, ln.san.para)) : '—'),
          h('td', {}, dentroD && ln.conf ? h('div', { class: 'mud' }, seta(ln.conf.de, ln.conf.para)) : '—'),
          // (as rações sem efeito não aparecem aqui: "come carne seca" em todo mundo seria só barulho)
          h('td', { 'data-fx': p.id }, dentroD && (ln.come.some(x => x.efeito) || ln.fx.length || ln.saem.length || ln.ficam.length) ? h('div', { class: 'mud', style: 'font-family:var(--ui)' },
            ln.come.some(x => x.efeito) ? h('span', {}, 'come ', h('b', { style: 'color:var(--fg)', text: juntarE(ln.come.filter(x => x.efeito).map(x => x.nome || 'ração sem nome')) })) : null,
            ...ln.fx.map(f => h('span', { title: 'De: ' + f.de }, textoFx(f) + (f.t === 'barra' && R() && (R().lerEfeito(f.val) || {}).dados ? ' (rolado no descanso)' : ''))),
            // os bônus "até o próximo descanso" que a ficha tem agora: acabam (riscados) ou continuam
            ln.saem.length ? h('span', { class: 'saem', 'data-saem': p.id }, 'acaba: ', h('s', { text: ln.saem.map(txtTmp).join(', ') })) : null,
            ln.ficam.length ? h('span', { class: 'ficam', 'data-ficam': p.id }, 'continua: ' + ln.ficam.map(txtTmp).join(', ')) : null) : '—'));
      });
      corpo.replaceChildren(...avisos, h('table', { class: 'plano' }, h('thead', {}, h('tr', {}, h('th', { text: 'Quem descansa' }), h('th', { text: 'Come', title: 'Rações de cada um neste descanso' }), h('th', { text: 'Barras' }), h('th', { text: 'Sanidade' }), h('th', { text: 'Conforto' }), h('th', { text: 'Come · na ficha' }))), h('tbody', {}, linhasT)),
        ...(cacam.length ? [blocoDaCaca()] : []));
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
      const teto = Number.isFinite(r.podre) && r.podre > 0 ? Math.max(min, r.max - r.podre) : r.max;     // (lote 8: a ferida permanente)
      const para = N.limitar(Math.round((de + delta) * 10) / 10, min, teto);
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
        // os bônus "até o próximo descanso" acabam aqui (os de qualquer origem) — se o descanso tira os bônus (a regra, ou o
        // que o mestre escolheu na janela); depois entra o que este descanso dá
        if (plano.tiraBonus !== false && est.tmp && typeof est.tmp === 'object') { const t2 = {}; for (const k of Object.keys(est.tmp)) if (!(est.tmp[k] && est.tmp[k].ate === 'descanso')) t2[k] = est.tmp[k]; est.tmp = t2; }
        // a fadiga: a pilha volta a encher (o longo, toda; o curto, um)
        if (ln.fad && ln.fad.para !== ln.fad.de) est.fad = ln.fad.para;
        if (ln.fx.length) {
          // as barras dela como ficam depois do descanso (o efeito da comida parte daí)
          const p = pessoa(ln.id), recursos = (p ? p.recursos : []).map(r => { const x = ln.recursos.find(y => y.id === r.id); return Object.assign({}, r, { atual: x ? x.para : r.atual }); });
          const feito = aplicarFx(est, ln, recursos, agora);
          if (feito.length) naFicha.push(ln.nome + ': ' + feito.join(', '));
        }
        const campos = { estado: est }, antes = { id: l.id, estado: l.estado || {}, ficha: null };
        // as barras especiais que este descanso devolve: o valor de agora delas mora no estado (estado.pd)
        if (ln.poderes.length) { const pd = est.pd && typeof est.pd === 'object' ? est.pd : (est.pd = {}); for (const x of ln.poderes) pd[x.id] = x.para; }
        fichas.push(antes);
        P.gravar(l.id, campos);
      }
    }
    const rotulo = plano.tipo === 'longo' ? 'o descanso longo' : 'o descanso curto', resumo = N.resumoDescanso(plano);
    const passo = { rotulo, json: jCamp, junta: null, fichas, publicar: true };
    pilha.push(passo);
    if (pilha.length > 60) pilha.shift();
    camp = N.aposDescanso(camp, plano, agora);
    // (o que foi para a ficha de cada um entra no diário, logo abaixo da linha do descanso)
    if (naFicha.length) camp = N.normalizar(Object.assign(N.copia(camp), { diario: [camp.diario[0], { id: N.novoId('di'), t: agora, texto: 'Na ficha — ' + naFicha.join(' · ') }].concat(camp.diario.slice(1)) }));
    gravar(); passo.depois = jCamp; pintar();
    publicar(camp.nome, resumo + (naFicha.length ? '. Na ficha — ' + naFicha.join(' · ') : ''));
    toast(resumo + '.', 'Desfazer', desfazer, 15000);
  }

  /* ---- um momento entre dois personagens ----
     O que cada um passa a sentir pelo outro (o Relacionamento e os corações do romance), a Sanidade e o Conforto de
     cada um e a emoção (a aura) com que cada um sai da conversa. Tudo com prévia; depois, um passo só de desfazer. */
  const ROM_MAX = 10;
  function abrirMomento() {
    if (!mestre() || !naMesa()) return;
    // (o momento mexe nos relacionamentos, e parte deles — os escondidos, os dos NPCs — fica guardada com as Fichas)
    if (!comSegredos()) { toast('O momento mexe nos relacionamentos, que são das Fichas. Para registrar um, peça ao mestre a aba Fichas.'); return; }
    const gente = presentes().filter(p => !p.semFicha);
    if (gente.length < 2) { toast('Um momento precisa de dois personagens com ficha em volta da fogueira.'); return; }
    const m = { a: sel && gente.some(p => p.id === sel) ? sel : gente[0].id, b: null, da: 5, db: 5, ha: 0, hb: 0, sa: 0, sb: 0, ca: 0, cb: 0, ea: '', eb: '', texto: '' };
    m.b = (gente.find(p => p.id !== m.a) || gente[1]).id;
    const corpo = h('div', { style: 'display:grid;gap:12px' });
    const ok = h('button', { type: 'button', class: 'btn pri', id: 'mo-ok', text: 'Registrar o momento' });
    const quem = id => gente.find(p => p.id === id) || {};
    const nome = id => quem(id).nome || '?';
    const relAtual = (de, para) => { const l = P.pegar(de), e = l ? R().relacaoCom(l.estado, segDe(de), para, !l.dono_id) : null; return e ? { v: e.v, rom: e.rom } : { v: 0, rom: null }; };
    const num0 = v => (v === 0 ? '0' : N.comSinal(v));
    const desenhar = foco => {
      // (as duas listas têm todo mundo: escolher num lado quem está no outro troca os dois de lugar)
      const opcoes = atual => gente.map(p => h('option', { value: p.id, selected: p.id === atual ? '' : null, text: p.nome }));
      const escolher = (lado, v) => { const outro = lado === 'a' ? 'b' : 'a'; if (v === m[outro]) m[outro] = m[lado]; m[lado] = v; desenhar('mo-' + lado); };
      const campo = (chave, min, max, rotulo) => h('input', { class: 'in num', id: 'mo-' + chave, type: 'number', min, max, step: 1, value: m[chave], 'aria-label': rotulo,
        onchange: e => { m[chave] = N.limitar(Math.round(+e.target.value) || 0, min, max); desenhar('mo-' + chave); } });
      const celula = (entrada, de, para) => h('td', {}, h('span', { class: 'mo-c' }, entrada, h('span', { class: 'mud', style: 'font-family:var(--mono)' }, seta(de, para))));
      const ra = relAtual(m.a, m.b), rb = relAtual(m.b, m.a), pa = quem(m.a), pb = quem(m.b);
      const coracoes = (r, d) => { const de = r.rom == null ? '—' : '♥ ' + r.rom; return d ? [de, '♥ ' + N.limitar((r.rom == null ? 0 : r.rom) + d, -ROM_MAX, ROM_MAX)] : [de, de]; };
      const sanDe = p => (p.san != null ? p.san : 100), confDe = p => (p.conf != null ? p.conf : 50);
      const [ha0, ha1] = coracoes(ra, m.ha), [hb0, hb1] = coracoes(rb, m.hb);
      const emoSel = (chave, p) => h('select', { class: 'in', id: 'mo-' + chave, 'aria-label': 'Com que emoção ' + p.nome + ' sai do momento', onchange: e => { m[chave] = e.target.value; desenhar('mo-' + chave); } },
        h('option', { value: '', text: 'não muda' + (N.emocao(p.emo) ? ' (' + N.emocao(p.emo).nome.toLowerCase() + ')' : ''), selected: !m[chave] }),
        h('option', { value: '-', text: 'Nenhuma', selected: m[chave] === '-' }),
        N.EMOCOES.map(e => h('option', { value: e.k, text: e.nome, selected: m[chave] === e.k })));
      corpo.replaceChildren(
        h('div', { class: 'lin', style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' },
          h('select', { class: 'in', id: 'mo-a', style: 'flex:1;min-width:150px', 'aria-label': 'Primeiro personagem', onchange: e => escolher('a', e.target.value) }, opcoes(m.a)), h('span', { text: 'e' }),
          h('select', { class: 'in', id: 'mo-b', style: 'flex:1;min-width:150px', 'aria-label': 'Segundo personagem', onchange: e => escolher('b', e.target.value) }, opcoes(m.b))),
        h('table', { class: 'plano momento' },
          h('thead', {}, h('tr', {}, h('th', { text: '' }), h('th', { text: nome(m.a) }), h('th', { text: nome(m.b) }))),
          h('tbody', {},
            h('tr', {}, h('td', { text: 'Sente pelo outro' }),
              celula(campo('da', -50, 50, 'Quanto muda o que ' + nome(m.a) + ' sente por ' + nome(m.b)), num0(ra.v), num0(N.limitar(ra.v + m.da, -100, 100))),
              celula(campo('db', -50, 50, 'Quanto muda o que ' + nome(m.b) + ' sente por ' + nome(m.a)), num0(rb.v), num0(N.limitar(rb.v + m.db, -100, 100)))),
            h('tr', {}, h('td', { text: 'Corações' }),
              celula(campo('ha', -5, 5, 'Corações de romance de ' + nome(m.a) + ' por ' + nome(m.b)), ha0, ha1),
              celula(campo('hb', -5, 5, 'Corações de romance de ' + nome(m.b) + ' por ' + nome(m.a)), hb0, hb1)),
            h('tr', {}, h('td', { text: 'Sanidade' }),
              celula(campo('sa', -50, 50, 'Quanto muda a Sanidade de ' + nome(m.a)), sanDe(pa), N.limitar(sanDe(pa) + m.sa, 0, 100)),
              celula(campo('sb', -50, 50, 'Quanto muda a Sanidade de ' + nome(m.b)), sanDe(pb), N.limitar(sanDe(pb) + m.sb, 0, 100))),
            h('tr', {}, h('td', { text: 'Conforto' }),
              celula(campo('ca', -50, 50, 'Quanto muda o Conforto de ' + nome(m.a)), confDe(pa), N.limitar(confDe(pa) + m.ca, 0, 100)),
              celula(campo('cb', -50, 50, 'Quanto muda o Conforto de ' + nome(m.b)), confDe(pb), N.limitar(confDe(pb) + m.cb, 0, 100))),
            h('tr', {}, h('td', { text: 'Emoção' }), h('td', {}, emoSel('ea', pa)), h('td', {}, emoSel('eb', pb))))),
        h('textarea', { class: 'in', id: 'mo-txt', rows: 2, maxlength: 400, placeholder: 'O que aconteceu? (vai para o diário e para a mesa ao vivo)', 'aria-label': 'O que aconteceu', oninput: e => { m.texto = e.target.value; pintarOk(); } }, m.texto),
        h('p', { class: 'note', text: 'Cada um tem a própria barra de Relacionamento pelo outro (de −100 a +100) e, se quiser, a trilha de corações do romance (de −10 a +10), na ficha. Se ainda não existem, são criadas. A emoção é a aura em volta do retrato.' }));
      pintarOk();
      if (foco) { const c0 = document.getElementById(foco); if (c0) c0.focus(); }
    };
    const pintarOk = () => { ok.disabled = !m.da && !m.db && !m.ha && !m.hb && !m.sa && !m.sb && !m.ca && !m.cb && !m.ea && !m.eb && !m.texto.trim(); };
    ok.addEventListener('click', () => { fecharJanela(); registrarMomento(m, nome(m.a), nome(m.b)); });
    desenhar();
    abrirJanela('Um momento em volta da fogueira', corpo, [h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fecharJanela }), ok]);
  }
  /* ---- (lote 7) Mexer em todos: a Fadiga, o Conforto e a Sanidade de quem está no acampamento, de uma vez ----
     Para menos ou para mais; vêm marcados os personagens dos jogadores (dá para desmarcar e marcar os outros); a lista
     mostra o antes e o depois de cada um; o motivo vai para a mesa ao vivo. Um passo de desfazer, que volta só o que
     mudou em cada ficha. As contas são as de TC.rules.mexerNaMente (as mesmas das Cenas). */
  const usoDaMente = p => ({ mente: p.san != null, fadiga: p.fad != null });
  /* (lote 7, parte 5c) O clima de hoje no Mapa-múndi: o do mapa mostrado aos jogadores, onde o grupo está (senão, o do
     mundo). null fora de uma mesa ou sem mapa mostrado. */
  function climaDoMundo() {
    if (!naMesa() || !D) return null;
    const dados = id => { const l = D.pegar(id); return l && !l.apagado && l.dados && typeof l.dados === 'object' ? l.dados : null; };
    const idx = dados('mundo:indice'), mostrado = idx && typeof idx.mostrado === 'string' ? idx.mostrado : null, m = mostrado ? dados('mundo:pub:' + mostrado) : null;
    if (!m) return null;
    const g = (Array.isArray(m.objs) ? m.objs : []).find(o => o && o.k === 'g' && !o.tipo && N.CLIMA_MUNDO[o.ch]);
    const k = g ? g.ch : m.clima && m.clima.hoje;
    return N.CLIMA_MUNDO[k] ? Object.assign({ k }, N.CLIMA_MUNDO[k]) : null;
  }
  function abrirMexerEmTodos() {
    if (!mestre() || !naMesa()) return;
    const gente = presentes().filter(p => !p.semFicha && P.pegar(p.id) && (p.san != null || p.fad != null));
    if (!gente.length) { toast('Não há ninguém no acampamento com ficha que use Sanidade, Conforto ou Fadiga.'); return; }
    const d = { fad: 0, conf: 0, san: 0 }, marcados = new Set(gente.filter(p => ehJogador(p.dono)).map(p => p.id));
    let motivo = '';
    const corpo = h('div', { style: 'display:grid;gap:12px' });
    const ok = h('button', { type: 'button', class: 'btn pri', id: 'mt-ok', text: 'Aplicar' });
    const nomeFad = n => (R().FADIGA || [])[n] || String(n);
    const desenhar = foco => {
      const passo = (k, rotulo, lim, dica) => h('div', { class: 'mt-campo' },
        h('span', { class: 'mt-rot', text: rotulo }),
        h('span', { class: 'passo' },
          botaoIcone('mt-' + k + '-m', MENOS, rotulo + ': menos 1', () => { d[k] = N.limitar(d[k] - 1, -lim, lim); desenhar('mt-' + k + '-m'); }, { disabled: d[k] <= -lim }),
          h('input', { class: 'in num', id: 'mt-' + k, type: 'number', min: -lim, max: lim, step: 1, value: d[k], 'aria-label': rotulo + ' (para menos, com sinal de menos)',
            onchange: e => { d[k] = N.limitar(Math.round(+e.target.value) || 0, -lim, lim); desenhar('mt-' + k); } }),
          botaoIcone('mt-' + k + '-p', MAIS, rotulo + ': mais 1', () => { d[k] = N.limitar(d[k] + 1, -lim, lim); desenhar('mt-' + k + '-p'); }, { disabled: d[k] >= lim })),
        h('small', { class: 'note', text: dica }));
      const linhaDe = p => {
        const l = P.pegar(p.id), r = R().mexerNaMente((l && l.estado) || {}, d, usoDaMente(p)), on = marcados.has(p.id);
        const cel = (k, txt) => h('td', {}, !on ? h('span', { class: 'igual', text: '—' }) : txt);
        return h('tr', { class: on ? '' : 'fora' },
          h('td', {}, h('label', { class: 'chk' }, h('input', { type: 'checkbox', id: 'mt-on-' + p.id, checked: on, 'aria-label': 'Incluir ' + p.nome,
            onchange: e => { if (e.target.checked) marcados.add(p.id); else marcados.delete(p.id); desenhar('mt-on-' + p.id); } }), h('span', { text: p.nome }))),
          cel('fad', r.antes.fad == null ? h('span', { class: 'igual', text: 'não usa' }) : seta(nomeFad(r.antes.fad), nomeFad(r.depois.fad))),
          cel('conf', r.antes.conf == null ? h('span', { class: 'igual', text: 'não usa' }) : seta(r.antes.conf, r.depois.conf)),
          cel('san', r.antes.san == null ? h('span', { class: 'igual', text: 'não usa' }) : seta(r.antes.san, r.depois.san)));
      };
      corpo.replaceChildren(
        h('div', { class: 'mt-campos' },
          passo('fad', 'Fadiga', N.FAD_MAX || 5, 'Em passos da pilha: −1 deixa um passo mais cansado.'),
          passo('conf', 'Conforto', 100, 'De 0 a 100.'),
          passo('san', 'Sanidade', 100, 'De 0 a 100.')),
        h('table', { class: 'plano mt-lista' },
          h('thead', {}, h('tr', {}, h('th', { text: 'Quem' }), h('th', { text: 'Fadiga' }), h('th', { text: 'Conforto' }), h('th', { text: 'Sanidade' }))),
          h('tbody', {}, gente.map(linhaDe))),
        h('input', { class: 'in', id: 'mt-motivo', type: 'text', maxlength: 200, value: motivo, placeholder: 'Por quê? (vai para a mesa ao vivo)', 'aria-label': 'O motivo', oninput: e => { motivo = e.target.value; } }),
        h('p', { class: 'note', text: 'Vêm marcados os personagens dos jogadores. O que a ficha de alguém não usa fica como está; os valores param nos limites.' }));
      ok.disabled = !(d.fad || d.conf || d.san) || !marcados.size;
      if (foco) { const c0 = document.getElementById(foco); if (c0) c0.focus(); }
    };
    ok.addEventListener('click', () => { const lista = gente.filter(p => marcados.has(p.id)); fecharJanela(); aplicarEmTodos(lista, d, motivo.trim()); });
    desenhar();
    abrirJanela('Mexer em todos', corpo, [h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: fecharJanela }), ok]);
  }
  function aplicarEmTodos(lista, d, motivo) {
    const fichas = [], nomes = [];
    for (const p of lista) {
      const l = P.pegar(p.id); if (!l) continue;
      const r = R().mexerNaMente(l.estado || {}, d, usoDaMente(p));
      if (!r.so.length) continue;
      fichas.push({ id: l.id, estado: l.estado || {}, ficha: null, so: r.so });
      P.gravar(l.id, { estado: r.estado });
      nomes.push(p.nome);
    }
    if (!fichas.length) { toast('Nada mudou: os valores já estavam no limite (ou as fichas não usam).'); return; }
    const oQue = [d.fad ? 'Fadiga ' + N.comSinal(d.fad) : '', d.conf ? 'Conforto ' + N.comSinal(d.conf) : '', d.san ? 'Sanidade ' + N.comSinal(d.san) : ''].filter(Boolean).join(', ');
    const resumo = oQue + ' para ' + juntarE(nomes) + (motivo ? ' — ' + motivo : '') + '.';
    pilha.push({ rotulo: 'mexer em todos (' + oQue + ')', json: jCamp, depois: jCamp, junta: null, fichas, publicar: true });
    if (pilha.length > 60) pilha.shift();
    pintar();
    publicar(camp.nome, resumo);
    toast('Feito: ' + resumo, 'Desfazer', desfazer, 12000);
  }
  function registrarMomento(m, nomeA, nomeB) {
    const fichas = [], partes = [];
    // tudo o que muda num personagem vai numa gravação só (o estado da ficha, e o que o mestre guarda dele)
    const aplicar = (de, para, nomeDe, nomePara, dv, dh, ds, dc, emo) => {
      const l = P.pegar(de); if (!l) return;
      // (o valor pode estar na ficha ou guardado com o mestre — escondido do jogador, ou de um NPC: muda onde estiver)
      const npc = !l.dono_id, seg0 = segDe(de);
      let r = { estado: l.estado || {}, seg: seg0 };
      if (dv || dh) {
        if (!R().relacaoCom(r.estado, r.seg, para, npc)) r = R().mexerRelacao(r.estado, r.seg, { t: 'nova', id: N.novoId('rel'), alvo: para, nome: nomePara, comMestre: npc, npc });
        let e = R().relacaoCom(r.estado, r.seg, para, npc);
        if (e && dv) { const d = R().mexerRelacao(r.estado, r.seg, { t: 'valor', id: e.id, v: e.v + dv, npc }); if (d.mudou) r = d; }
        e = R().relacaoCom(r.estado, r.seg, para, npc);
        if (e && dh) { const d = R().mexerRelacao(r.estado, r.seg, { t: 'rom', id: e.id, rom: N.limitar((e.rom == null ? 0 : e.rom) + dh, -ROM_MAX, ROM_MAX), npc }); if (d.mudou) r = d; }
      }
      let est = r.estado;
      // (a ficha passa a usar o painel de Sanidade e Conforto)
      if (ds || dc || ((dv || dh) && est.san == null)) est = Object.assign({}, est, { san: N.limitar(dentro(est.san, 100) + ds, 0, 100), conf: N.limitar(dentro(est.conf, 50) + dc, 0, 100) });
      if (emo === '-' && est.emo) { est = Object.assign({}, est); delete est.emo; }
      else if (emo && emo !== '-' && N.emoOk(emo) && est.emo !== emo) est = Object.assign({}, est, { emo });
      if (est === l.estado && r.seg === seg0) return;
      fichas.push({ id: l.id, estado: l.estado || {}, ficha: null, seg: seg0 });
      if (est !== l.estado) P.gravar(de, { estado: est });
      if (r.seg !== seg0) porSeg(de, r.seg);
      if (dv) partes.push(nomeDe + ' → ' + nomePara + ' ' + N.comSinal(dv));
      if (dh) partes.push('♥ ' + nomeDe + ' → ' + nomePara + ' ' + N.comSinal(dh));
      if (ds) partes.push('Sanidade de ' + nomeDe + ' ' + N.comSinal(ds));
      if (dc) partes.push('Conforto de ' + nomeDe + ' ' + N.comSinal(dc));
      if (emo === '-') partes.push(nomeDe + ' sem emoção');
      else if (emo && N.emocao(emo)) partes.push(nomeDe + ': ' + N.emocao(emo).nome.toLowerCase());
    };
    aplicar(m.a, m.b, nomeA, nomeB, m.da, m.ha, m.sa, m.ca, m.ea);
    aplicar(m.b, m.a, nomeB, nomeA, m.db, m.hb, m.sb, m.cb, m.eb);
    const resumo = (m.texto.trim() ? m.texto.trim() + ' ' : '') + (partes.length ? '(' + partes.join(' · ') + ')' : '');
    const linhaD = 'Momento entre ' + nomeA + ' e ' + nomeB + (resumo ? ': ' + resumo : '');
    const passo = { rotulo: 'o momento entre ' + nomeA + ' e ' + nomeB, json: jCamp, junta: null, fichas, publicar: true };
    pilha.push(passo);
    if (pilha.length > 60) pilha.shift();
    camp = N.normalizar(Object.assign(N.copia(camp), { diario: [{ id: N.novoId('di'), t: Date.now(), texto: linhaD }].concat(camp.diario) }));
    gravar(); passo.depois = jCamp;
    manterRoda();                                         // (a aura nova vai para a roda: quem não vê a ficha a vê pela roda)
    pintar();
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
  $('btTodos').addEventListener('click', abrirMexerEmTodos);
  $('btCena').addEventListener('click', abrirCena);
  $('btMundo').addEventListener('click', () => TC.ponte.ir('mundo'));
  $('arq').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; trocarFundo(f); });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && menu) { fecharMenu(); return; }
    if (!(ev.ctrlKey || ev.metaKey) || ev.altKey || (ev.key || '').toLowerCase() !== 'z' || ev.shiftKey || digitando() || dlg.open) return;
    if (edita() && pilha.length) { ev.preventDefault(); desfazer(); }
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
      TCx.ponte.aoMudar(e => {
        const antes = j(st.membros), podia = pronto && ajudante();
        st = e;
        if (!pronto || antes === j(e.membros)) return;
        manterRoda(); pintar();
        // o mestre deu (ou tirou) o acampamento a quem está olhando: um aviso, e o desfazer recomeça
        const pode = ajudante();
        if (!mestre() && pode !== podia) { pilha = []; pintar(); toast(pode ? 'O mestre deixou você mexer no acampamento: provisões, estrutura, caravana, lugares e diário.' : 'O mestre tirou de você a permissão de mexer no acampamento.'); }
      });
    }
    if (naMesa()) {
      const d = D.pegar(DOC);
      camp = N.normalizar(d && !d.apagado ? d.dados : null);
      jCamp = j(camp);
      marcarSalvo(encerrada ? 'Campanha encerrada: só consulta' : st.temCampanhas && !campId ? 'Você ainda não está numa campanha' : 'Salvo na mesa');
      D.aoMudar(l => { if (!l) return; if (l.id === DOC) deFora(); else if (l.id === 'fichas:cfg' || l.id === 'arvore:biblioteca' || l.id === 'arvore:pacote' || l.id === 'mundo:indice' || String(l.id).startsWith('mundo:pub:')) pintar(); });
      P.aoMudar(() => { if (arrasto) return; manterRoda(); if (!digitando() && !dlg.open) pintar(); else pintarCena(); });
    } else {
      camp = N.normalizar(lerLocal());
      jCamp = j(camp);
      marcarSalvo('Salvo neste navegador');
    }
    pronto = true;
    manterRoda();
    pintar();
    // (lote 15) as Cenas pedem o Descanso curto do grupo: a janela abre já com quem está na cena marcado
    if (TCx && TCx.ponte && TCx.ponte.aoIr) TCx.ponte.aoIr(alvo => {
      if (!alvo || alvo.descanso !== 'curto') return;
      if (!mestre()) { toast(encerrada ? 'Campanha encerrada: o acampamento é só para consulta.' : 'Quem faz o descanso é o mestre.'); return; }
      abrirDescanso('curto', { marcar: Array.isArray(alvo.marcar) ? alvo.marcar : [] });
    });
  }
  if (DEBUG) window.__acamp = { N, get camp() { return camp; }, get pilha() { return pilha; }, mudar, desfazer, presentes, pessoa, abrirDescanso, descansar, get modo() { return modo; }, get papel() { return papel; }, get pronto() { return pronto; },
    verArea, get areaVista() { return areaVista; }, selecionar, edita, ajudante, get sel() { return sel; } };
  partida().catch(e => {
    console.error(e);
    $('vazio').hidden = false;
    $('vazio').replaceChildren(h('strong', { text: 'Não deu para abrir o acampamento da mesa. ' }), (e && e.message) || '', ' ', h('button', { type: 'button', class: 'btn sm', text: 'Tentar de novo', onclick: () => location.reload() }));
  });
})();
